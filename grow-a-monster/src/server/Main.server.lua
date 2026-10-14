-- Grow a Monster: the main game script (runs on the server).

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Debris = game:GetService("Debris")

local GameData = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("GameData"))
local MapBuilder = require(script.Parent.MapBuilder)
local MonsterBuilder = require(script.Parent.MonsterBuilder)
local Data = require(script.Parent.Data)

local random = Random.new()

-- Messages the server sends to players' screens
local remotes = Instance.new("Folder")
remotes.Name = "Remotes"
remotes.Parent = ReplicatedStorage
local notifyEvent = Instance.new("RemoteEvent")
notifyEvent.Name = "Notify" -- (text, color)
notifyEvent.Parent = remotes
local revealEvent = Instance.new("RemoteEvent")
revealEvent.Name = "Reveal" -- (monsterId) when your monster pops out
revealEvent.Parent = remotes

local function notify(player: Player, text: string, color: Color3?)
	notifyEvent:FireClient(player, text, color or Color3.new(1, 1, 1))
end

local gardens, pedestals = MapBuilder.build()

-- A giant Chompzilla statue in the middle of the Seed Shop
local statue = MonsterBuilder.build("Chompzilla", CFrame.new(0, 0.4, 0) * CFrame.Angles(0, math.rad(90), 0), 16)
statue.Name = "Chompzilla Statue"
statue.Parent = workspace

-- profiles[player] = { data = ..., canSave = bool, garden = ..., money = IntValue }
local profiles = {}

---------------------------------------------------------------------
-- Seeds (they are Tools in your backpack)
---------------------------------------------------------------------

local function findSeedTool(player: Player, seedId: string): Tool?
	for _, holder in { player:FindFirstChildOfClass("Backpack"), player.Character } do
		if holder then
			for _, tool in holder:GetChildren() do
				if tool:IsA("Tool") and tool:GetAttribute("SeedId") == seedId then
					return tool
				end
			end
		end
	end
	return nil
end

local function makeSeedTool(seedId: string): Tool
	local seed = GameData.Seeds[seedId]
	local tool = Instance.new("Tool")
	tool:SetAttribute("SeedId", seedId)
	tool.CanBeDropped = false
	tool.ToolTip = "Walk to your soil and press the button to plant!"
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Shape = Enum.PartType.Ball
	handle.Size = Vector3.one * 1.2
	handle.Color = seed.color
	handle.Material = seedId == "Golden" and Enum.Material.Neon or Enum.Material.SmoothPlastic
	handle.CanCollide = false
	handle.Massless = true
	handle.Parent = tool
	return tool
end

-- Makes the seed tools in the backpack match how many seeds the player has
local function refreshSeedTools(player: Player)
	local profile = profiles[player]
	local backpack = player:FindFirstChildOfClass("Backpack")
	if not profile or not backpack then
		return
	end
	for seedId, seed in GameData.Seeds do
		local count = profile.data.seeds[seedId] or 0
		local tool = findSeedTool(player, seedId)
		if count <= 0 then
			if tool then
				tool:Destroy()
			end
		else
			if not tool then
				tool = makeSeedTool(seedId)
				tool.Parent = backpack
			end
			tool.Name = count > 1 and ("%s x%d"):format(seed.name, count) or seed.name
		end
	end
end

local function addSeeds(player: Player, seedId: string, amount: number)
	local profile = profiles[player]
	profile.data.seeds[seedId] = (profile.data.seeds[seedId] or 0) + amount
	refreshSeedTools(player)
end

-- Picks which monster comes out of a seed
local function rollMonster(seedId: string): string
	local odds = GameData.Seeds[seedId].odds
	local total = 0
	for _, chance in odds do
		total += chance
	end
	local roll = random:NextNumber(0, total)
	local picked = nil
	-- go from rarest to most common so the order is always the same
	local rarities = {}
	for rarityId, chance in odds do
		table.insert(rarities, { id = rarityId, chance = chance, order = GameData.Rarities[rarityId].order })
	end
	table.sort(rarities, function(a, b)
		return a.order > b.order
	end)
	for _, r in rarities do
		roll -= r.chance
		if roll <= 0 then
			picked = r.id
			break
		end
	end
	picked = picked or rarities[#rarities].id
	local list = GameData.ByRarity[picked]
	return list[random:NextInteger(1, #list)]
end

---------------------------------------------------------------------
-- Soil spots: empty -> growing -> grown
---------------------------------------------------------------------

local function sellPrice(monsterId: string): number
	return GameData.Monsters[monsterId].income * GameData.SELL_SECONDS
end

local function clearSpot(spot)
	if spot.sprout then
		spot.sprout:Destroy()
		spot.sprout = nil
	end
	if spot.monster then
		spot.monster:Destroy()
		spot.monster = nil
	end
	spot.info = nil
	spot.state = "empty"
	spot.gui.Enabled = false
	spot.prompt.ActionText = "Plant Seed"
	spot.prompt.ObjectText = "Empty Soil"
	spot.prompt.HoldDuration = 0
	spot.prompt:SetAttribute("State", "empty")
end

local function setGrowing(spot, info)
	clearSpot(spot)
	spot.info = info
	spot.state = "growing"
	spot.sprout = MonsterBuilder.buildSprout(spot.top)
	spot.sprout.Parent = spot.soil
	spot.prompt:SetAttribute("State", "growing")
	spot.gui.StudsOffsetWorldSpace = Vector3.new(0, 5, 0)
	spot.gui.Enabled = true
	spot.title.Text = "🌱 " .. GameData.Seeds[info.seed].name
	spot.title.TextColor3 = Color3.new(1, 1, 1)
end

local function updateGrowing(spot, now: number)
	local seed = GameData.Seeds[spot.info.seed]
	local left = spot.info.readyAt - now
	local progress = 1 - math.clamp(left / seed.growTime, 0, 1)
	spot.subtitle.Text = "Growing... " .. GameData.formatTime(left)
	spot.subtitle.TextColor3 = Color3.fromRGB(255, 255, 255)
	spot.sprout:ScaleTo(0.3 + progress * 1.2)
end

local function popEffect(part: BasePart, color: Color3)
	local burst = Instance.new("ParticleEmitter")
	burst.Color = ColorSequence.new(color)
	burst.Rate = 0
	burst.Speed = NumberRange.new(12, 20)
	burst.SpreadAngle = Vector2.new(180, 180)
	burst.Lifetime = NumberRange.new(0.6, 1.2)
	burst.Size = NumberSequence.new(0.8, 0)
	burst.LightEmission = 1
	burst.Parent = part
	burst:Emit(50)
	Debris:AddItem(burst, 2)
end

-- isNew = true when it just popped out (not when loading a saved garden)
local function setGrown(spot, info, owner: Player?, isNew: boolean)
	clearSpot(spot)
	local monster = GameData.Monsters[info.monster]
	local rarity = GameData.Rarities[monster.rarity]
	spot.info = info
	spot.state = "grown"
	spot.monster = MonsterBuilder.build(info.monster, spot.top)
	spot.monster.Parent = spot.soil

	spot.gui.StudsOffsetWorldSpace = Vector3.new(0, monster.size + 2.5, 0)
	spot.gui.Enabled = true
	spot.title.Text = monster.name
	spot.title.TextColor3 = rarity.color
	spot.subtitle.Text = ("%s  •  $%s/s"):format(rarity.label, GameData.formatMoney(monster.income))
	spot.subtitle.TextColor3 = Color3.fromRGB(120, 255, 120)

	spot.prompt.ActionText = "Sell"
	spot.prompt.ObjectText = ("%s ($%s)"):format(monster.name, GameData.formatMoney(sellPrice(info.monster)))
	-- rare monsters need a longer hold so you don't sell them by accident
	spot.prompt.HoldDuration = rarity.order >= 3 and 2 or 0.6
	spot.prompt:SetAttribute("State", "grown")

	if isNew and owner then
		popEffect(spot.monster.PrimaryPart, rarity.color)
		revealEvent:FireClient(owner, info.monster)
		if rarity.order >= 4 then
			for _, other in Players:GetPlayers() do
				if other ~= owner then
					notify(
						other,
						("🎉 %s grew a %s %s!"):format(owner.DisplayName, rarity.label, monster.name),
						rarity.color
					)
				end
			end
		end
	end
end

local function plant(player: Player, garden, spot)
	local profile = profiles[player]
	local seeds = profile.data.seeds

	-- Use the seed in your hand. If you only have one kind of seed, use that.
	local seedId = nil
	local held = player.Character and player.Character:FindFirstChildOfClass("Tool")
	if held and held:GetAttribute("SeedId") then
		seedId = held:GetAttribute("SeedId")
	else
		local kinds = {}
		for id, count in seeds do
			if count > 0 then
				table.insert(kinds, id)
			end
		end
		if #kinds == 1 then
			seedId = kinds[1]
		elseif #kinds == 0 then
			notify(player, "You have no seeds! Buy some at the Seed Shop 🌱")
			return
		else
			notify(player, "Hold the seed you want to plant!")
			return
		end
	end
	if (seeds[seedId] or 0) <= 0 then
		return
	end

	seeds[seedId] -= 1
	if seeds[seedId] <= 0 then
		seeds[seedId] = nil
	end
	refreshSeedTools(player)

	local info = {
		seed = seedId,
		monster = rollMonster(seedId), -- picked now, so leaving the game can't re-roll it
		readyAt = os.time() + GameData.Seeds[seedId].growTime,
	}
	profile.data.spots[tostring(spot.index)] = info
	setGrowing(spot, info)
	updateGrowing(spot, os.time())
end

local function sell(player: Player, spot)
	local profile = profiles[player]
	local monsterId = spot.info.monster
	local price = sellPrice(monsterId)
	profile.money.Value += price
	profile.data.spots[tostring(spot.index)] = nil
	clearSpot(spot)
	notify(player, ("Sold %s for $%s! 💰"):format(GameData.Monsters[monsterId].name, GameData.formatMoney(price)))
end

for _, garden in gardens do
	for _, spot in garden.spots do
		spot.prompt.Triggered:Connect(function(player)
			if garden.owner ~= player then
				notify(player, "This is not your garden! 🚫")
				return
			end
			if spot.state == "empty" then
				plant(player, garden, spot)
			elseif spot.state == "grown" then
				sell(player, spot)
			end
		end)
	end
end

---------------------------------------------------------------------
-- Seed Shop
---------------------------------------------------------------------

for _, pedestal in pedestals do
	pedestal.prompt.Triggered:Connect(function(player)
		local profile = profiles[player]
		if not profile then
			return
		end
		local seed = GameData.Seeds[pedestal.seedId]
		if profile.money.Value < seed.price then
			notify(
				player,
				("You need $%s more! 💸"):format(GameData.formatMoney(seed.price - profile.money.Value)),
				Color3.fromRGB(255, 120, 120)
			)
			return
		end
		profile.money.Value -= seed.price
		addSeeds(player, pedestal.seedId, 1)
		notify(player, ("Bought a %s! 🌱 Go plant it in your garden."):format(seed.name), seed.color)
	end)
end

---------------------------------------------------------------------
-- Players joining and leaving
---------------------------------------------------------------------

local function teleportHome(player: Player)
	local profile = profiles[player]
	local character = player.Character
	if profile and character and character:WaitForChild("HumanoidRootPart", 5) then
		character:PivotTo(profile.garden.spawn)
	end
end

local function onCharacterAdded(player: Player, character: Model)
	local profile = profiles[player]
	if not profile then
		return -- not loaded yet; we'll handle this once the garden is ready
	end
	task.wait() -- let the character finish loading
	refreshSeedTools(player)
	teleportHome(player)

	-- First time ever playing: put the Starter Seed straight into their hand
	if profile.firstTime then
		profile.firstTime = false
		local tool = findSeedTool(player, "Starter")
		local humanoid = character:FindFirstChildOfClass("Humanoid")
		if tool and humanoid then
			humanoid:EquipTool(tool)
		end
		notify(
			player,
			"Welcome! Walk to the brown soil and plant your Starter Seed 🌱",
			Color3.fromRGB(140, 255, 120)
		)
	end
end

local function onPlayerAdded(player: Player)
	-- Find a free garden
	local garden = nil
	for _, g in gardens do
		if not g.owner then
			garden = g
			break
		end
	end
	if not garden then
		player:Kick("Sorry, all the gardens are full! Try another server.")
		return
	end
	garden.owner = player

	local data, canSave = Data.load(player)
	if not player.Parent then
		garden.owner = nil -- they left while loading
		return
	end

	local leaderstats = Instance.new("Folder")
	leaderstats.Name = "leaderstats"
	local money = Instance.new("IntValue")
	money.Name = "Money"
	money.Value = data.money
	money.Parent = leaderstats
	leaderstats.Parent = player

	local profile = { data = data, canSave = canSave, garden = garden, money = money, firstTime = false }
	profiles[player] = profile
	if not canSave then
		notify(player, "⚠️ Saving is off right now, so progress won't be kept.", Color3.fromRGB(255, 200, 80))
	end

	MapBuilder.setSign(garden, player.DisplayName .. "'s Garden")
	for _, spot in garden.spots do
		spot.prompt:SetAttribute("Owner", player.UserId)
	end

	-- Bring back their saved garden (monsters keep growing while you're away!)
	local now = os.time()
	for key, info in data.spots do
		local spot = garden.spots[tonumber(key)]
		if spot and GameData.Monsters[info.monster] and GameData.Seeds[info.seed] then
			if now >= info.readyAt then
				setGrown(spot, info, player, false)
			else
				setGrowing(spot, info)
				updateGrowing(spot, now)
			end
		else
			data.spots[key] = nil
		end
	end

	-- The free Starter Seed
	if not data.gotStarter then
		data.gotStarter = true
		data.seeds.Starter = (data.seeds.Starter or 0) + 1
		profile.firstTime = true
	end

	-- Safety net: if you somehow have nothing at all, get a free Mystery Seed
	local hasSeeds = next(data.seeds) ~= nil
	local hasMonsters = next(data.spots) ~= nil
	if not hasSeeds and not hasMonsters and money.Value < GameData.Seeds.Mystery.price then
		data.seeds.Mystery = 1
		notify(player, "Here's a free Mystery Seed to get you going! 🌱")
	end

	player.CharacterAdded:Connect(function(character)
		onCharacterAdded(player, character)
	end)
	if player.Character then
		onCharacterAdded(player, player.Character)
	end
end

local function saveProfile(player: Player)
	local profile = profiles[player]
	if profile and profile.canSave then
		profile.data.money = profile.money.Value
		Data.save(player, profile.data)
	end
end

local function onPlayerRemoving(player: Player)
	local profile = profiles[player]
	if not profile then
		return
	end
	saveProfile(player)
	profiles[player] = nil
	local garden = profile.garden
	for _, spot in garden.spots do
		clearSpot(spot)
		spot.prompt:SetAttribute("Owner", 0)
	end
	MapBuilder.setSign(garden, "Empty Garden")
	garden.owner = nil
end

Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(onPlayerRemoving)
for _, player in Players:GetPlayers() do
	task.spawn(onPlayerAdded, player)
end

-- Save everyone when the server shuts down
game:BindToClose(function()
	for player in profiles do
		task.spawn(saveProfile, player)
	end
	task.wait(3)
end)

-- Save everyone every 2 minutes, just in case
task.spawn(function()
	while true do
		task.wait(120)
		for player in profiles do
			task.spawn(saveProfile, player)
		end
	end
end)

---------------------------------------------------------------------
-- Every second: grow plants and pay money
---------------------------------------------------------------------

while true do
	task.wait(1)
	local now = os.time()
	for player, profile in profiles do
		local income = 0
		for _, spot in profile.garden.spots do
			if spot.state == "growing" then
				if now >= spot.info.readyAt then
					setGrown(spot, spot.info, player, true)
				else
					updateGrowing(spot, now)
				end
			end
			if spot.state == "grown" then
				income += GameData.Monsters[spot.info.monster].income
			end
		end
		profile.money.Value += income
		player:SetAttribute("Income", income)
	end
end
