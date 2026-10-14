-- MapBuilder: builds the world when the game starts.
-- The Seed Shop is in the middle, and the gardens are in a circle around it.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")

local GameData = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("GameData"))

local MapBuilder = {}

local GARDEN_COUNT = 8 -- set "Max Players" in Game Settings to this number
local GARDEN_DISTANCE = 120 -- how far each garden is from the middle
local GARDEN_SIZE = 56
local HUB_RADIUS = 40
local SOIL_TOP = 0.75 -- height of the top of the soil

local function part(parent: Instance, props): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	for key, value in props do
		(p :: any)[key] = value
	end
	p.Parent = parent
	return p
end

local function textLabel(parent: Instance, text: string, color: Color3, props: { [string]: any }?): TextLabel
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Size = UDim2.fromScale(1, 1)
	label.Font = Enum.Font.FredokaOne
	label.TextScaled = true
	label.Text = text
	label.TextColor3 = color
	label.TextStrokeTransparency = 0
	label.TextStrokeColor3 = Color3.fromRGB(30, 30, 30)
	for key, value in props or {} do
		(label :: any)[key] = value
	end
	label.Parent = parent
	return label
end

local function signGui(board: Part, face: Enum.NormalId, text: string): TextLabel
	local gui = Instance.new("SurfaceGui")
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = 40
	gui.Parent = board
	return textLabel(gui, text, Color3.fromRGB(255, 255, 255), {
		Size = UDim2.fromScale(0.9, 0.8),
		Position = UDim2.fromScale(0.05, 0.1),
	})
end

---------------------------------------------------------------------
-- The Seed Shop in the middle
---------------------------------------------------------------------

local function buildShop(map: Folder)
	part(map, {
		Name = "Hub",
		Shape = Enum.PartType.Cylinder,
		Size = Vector3.new(0.4, HUB_RADIUS * 2, HUB_RADIUS * 2),
		CFrame = CFrame.new(0, 0.2, 0) * CFrame.Angles(0, 0, math.rad(90)),
		Color = Color3.fromRGB(200, 180, 140),
		Material = Enum.Material.Cobblestone,
	})

	local pedestals = {}
	local count = #GameData.ShopSeeds * 2
	for k = 0, count - 1 do
		local seedId = GameData.ShopSeeds[(k % #GameData.ShopSeeds) + 1]
		local seed = GameData.Seeds[seedId]
		local angle = k / count * math.pi * 2 + math.pi / 4
		local pos = Vector3.new(math.cos(angle) * 20, 0, math.sin(angle) * 20)
		local facing = CFrame.lookAt(pos, Vector3.new(pos.X * 2, 0, pos.Z * 2)) -- faces outwards

		local stand = part(map, {
			Name = seed.name .. " Stand",
			Shape = Enum.PartType.Cylinder,
			Size = Vector3.new(3, 5, 5),
			CFrame = facing * CFrame.new(0, 1.9, 0) * CFrame.Angles(0, 0, math.rad(90)),
			Color = Color3.fromRGB(240, 240, 240),
			Material = Enum.Material.Marble,
		})
		local seedBall = part(map, {
			Name = seed.name,
			Shape = Enum.PartType.Ball,
			Size = Vector3.one * 2.5,
			CFrame = facing * CFrame.new(0, 5, 0),
			Color = seed.color,
			Material = seedId == "Golden" and Enum.Material.Neon or Enum.Material.SmoothPlastic,
			CanCollide = false,
		})
		CollectionService:AddTag(seedBall, "Spin")

		local board = Instance.new("BillboardGui")
		board.Size = UDim2.fromScale(9, 4)
		board.StudsOffsetWorldSpace = Vector3.new(0, 4, 0)
		board.MaxDistance = 90
		board.LightInfluence = 0
		board.Parent = seedBall
		textLabel(board, seed.name, seed.color, { Size = UDim2.fromScale(1, 0.4) })
		textLabel(board, "$" .. GameData.formatMoney(seed.price), Color3.fromRGB(120, 255, 120), {
			Size = UDim2.fromScale(1, 0.3),
			Position = UDim2.fromScale(0, 0.4),
		})
		local odds = {}
		for rarityId, rarity in GameData.Rarities do
			if seed.odds[rarityId] then
				table.insert(
					odds,
					{ order = rarity.order, text = ("%s %g%%"):format(rarity.label, seed.odds[rarityId]) }
				)
			end
		end
		table.sort(odds, function(a, b)
			return a.order < b.order
		end)
		local oddsText = {}
		for _, o in odds do
			table.insert(oddsText, o.text)
		end
		textLabel(board, table.concat(oddsText, "  "), Color3.fromRGB(255, 255, 255), {
			Size = UDim2.fromScale(1, 0.25),
			Position = UDim2.fromScale(0, 0.72),
		})

		local prompt = Instance.new("ProximityPrompt")
		prompt.ActionText = "Buy"
		prompt.ObjectText = ("%s ($%s)"):format(seed.name, GameData.formatMoney(seed.price))
		prompt.HoldDuration = 0
		prompt.MaxActivationDistance = 10
		prompt.RequiresLineOfSight = false
		prompt.Parent = stand

		table.insert(pedestals, { prompt = prompt, seedId = seedId })
	end

	-- Big sign floating above the middle
	local signAnchor = part(map, {
		Name = "ShopSign",
		Size = Vector3.one,
		CFrame = CFrame.new(0, 22, 0),
		Transparency = 1,
		CanCollide = false,
	})
	local sign = Instance.new("BillboardGui")
	sign.Size = UDim2.fromScale(30, 7)
	sign.LightInfluence = 0
	sign.Parent = signAnchor
	textLabel(sign, "🌱 SEED SHOP 🌱", Color3.fromRGB(140, 255, 120))

	return pedestals
end

---------------------------------------------------------------------
-- The gardens
---------------------------------------------------------------------

local function buildGarden(map: Folder, index: number)
	local angle = (index - 1) / GARDEN_COUNT * math.pi * 2
	local center = Vector3.new(math.cos(angle), 0, math.sin(angle)) * GARDEN_DISTANCE
	-- The garden's front (LookVector) points at the Seed Shop
	local cf = CFrame.lookAt(center, Vector3.zero)
	local half = GARDEN_SIZE / 2

	local model = Instance.new("Model")
	model.Name = "Garden" .. index
	model.Parent = map

	part(model, {
		Name = "Floor",
		Size = Vector3.new(GARDEN_SIZE, 0.4, GARDEN_SIZE),
		CFrame = cf * CFrame.new(0, 0.2, 0),
		Color = Color3.fromRGB(120, 185, 85),
		Material = Enum.Material.Grass,
	})

	-- Fence, with a gap at the front to walk in
	local wood = Color3.fromRGB(235, 225, 205)
	local function fence(x, z, sizeX, sizeZ)
		part(model, {
			Name = "Fence",
			Size = Vector3.new(sizeX, 3, sizeZ),
			CFrame = cf * CFrame.new(x, 1.9, z),
			Color = wood,
			Material = Enum.Material.WoodPlanks,
		})
	end
	fence(0, half, GARDEN_SIZE, 0.6)
	fence(-half, 0, 0.6, GARDEN_SIZE)
	fence(half, 0, 0.6, GARDEN_SIZE)
	fence(-(half + 6) / 2, -half, half - 6, 0.6)
	fence((half + 6) / 2, -half, half - 6, 0.6)

	-- Path from the Seed Shop to the garden
	local pathStart = HUB_RADIUS - 2
	local pathEnd = GARDEN_DISTANCE - half
	local dir = center.Unit
	local mid = dir * (pathStart + pathEnd) / 2
	part(map, {
		Name = "Path",
		Size = Vector3.new(10, 0.2, pathEnd - pathStart),
		CFrame = CFrame.lookAt(mid + Vector3.new(0, 0.1, 0), center + Vector3.new(0, 0.1, 0)),
		Color = Color3.fromRGB(215, 190, 140),
		Material = Enum.Material.Sand,
	})

	-- Name sign over the entrance
	for _, x in { -7.5, 7.5 } do
		part(model, {
			Name = "SignPost",
			Size = Vector3.new(0.8, 10.5, 0.8),
			CFrame = cf * CFrame.new(x, 5.25, -half - 2),
			Color = wood,
			Material = Enum.Material.Wood,
		})
	end
	local board = part(model, {
		Name = "Sign",
		Size = Vector3.new(16, 4, 0.6),
		CFrame = cf * CFrame.new(0, 8.5, -half - 2),
		Color = Color3.fromRGB(120, 80, 45),
		Material = Enum.Material.Wood,
	})
	local signLabels = {
		signGui(board, Enum.NormalId.Front, "Empty Garden"),
		signGui(board, Enum.NormalId.Back, "Empty Garden"),
	}

	-- Soil patches: 2 rows of 3
	local spots = {}
	local columns = { -15, 0, 15 }
	local rows = { 2, 17 }
	for r, z in rows do
		for col, x in columns do
			local spotIndex = (r - 1) * #columns + col
			local soil = part(model, {
				Name = "Soil" .. spotIndex,
				Size = Vector3.new(11, 0.5, 11),
				CFrame = cf * CFrame.new(x, 0.5, z),
				Color = Color3.fromRGB(95, 60, 35),
				Material = Enum.Material.Ground,
			})

			local prompt = Instance.new("ProximityPrompt")
			prompt.ActionText = "Plant Seed"
			prompt.ObjectText = "Empty Soil"
			prompt.HoldDuration = 0
			prompt.MaxActivationDistance = 12
			prompt.RequiresLineOfSight = false
			prompt:SetAttribute("Owner", 0)
			prompt:SetAttribute("State", "empty")
			prompt.Parent = soil
			CollectionService:AddTag(prompt, "SpotPrompt")

			-- Text floating above the soil (timer while growing, name when grown)
			local gui = Instance.new("BillboardGui")
			gui.Size = UDim2.fromOffset(240, 60)
			gui.MaxDistance = 80
			gui.LightInfluence = 0
			gui.Enabled = false
			gui.Parent = soil
			local title = textLabel(gui, "", Color3.new(1, 1, 1), { Size = UDim2.fromScale(1, 0.55) })
			local subtitle = textLabel(gui, "", Color3.fromRGB(120, 255, 120), {
				Size = UDim2.fromScale(1, 0.45),
				Position = UDim2.fromScale(0, 0.55),
			})

			spots[spotIndex] = {
				index = spotIndex,
				soil = soil,
				prompt = prompt,
				top = cf * CFrame.new(x, SOIL_TOP, z),
				gui = gui,
				title = title,
				subtitle = subtitle,
				state = "empty",
			}
		end
	end

	return {
		index = index,
		model = model,
		cframe = cf,
		-- Where the owner spawns: just inside the entrance, looking at the soil
		spawn = cf * CFrame.new(0, 4, -16) * CFrame.Angles(0, math.pi, 0),
		signLabels = signLabels,
		spots = spots,
		owner = nil,
	}
end

-- Builds everything. Returns (gardens, shopPedestals)
function MapBuilder.build()
	local map = Instance.new("Folder")
	map.Name = "Map"
	map.Parent = workspace

	local pedestals = buildShop(map)
	local gardens = {}
	for i = 1, GARDEN_COUNT do
		gardens[i] = buildGarden(map, i)
	end
	return gardens, pedestals
end

function MapBuilder.setSign(garden, text: string)
	for _, label in garden.signLabels do
		label.Text = text
	end
end

return MapBuilder
