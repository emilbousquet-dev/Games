-- Hud: everything on the player's screen, plus little animations.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local GameData = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("GameData"))
local remotes = ReplicatedStorage:WaitForChild("Remotes")

local player = Players.LocalPlayer
local camera = workspace.CurrentCamera

local gui = Instance.new("ScreenGui")
gui.Name = "GrowAMonsterHud"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.Parent = player:WaitForChild("PlayerGui")

local function label(parent: Instance, props): TextLabel
	local l = Instance.new("TextLabel")
	l.BackgroundTransparency = 1
	l.Font = Enum.Font.FredokaOne
	l.TextScaled = true
	l.TextColor3 = Color3.new(1, 1, 1)
	l.TextStrokeTransparency = 0
	l.TextStrokeColor3 = Color3.fromRGB(30, 30, 30)
	for key, value in props do
		(l :: any)[key] = value
	end
	l.Parent = parent
	return l
end

local function round(instance: Instance, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = instance
end

---------------------------------------------------------------------
-- Money box at the top of the screen
---------------------------------------------------------------------

local moneyBox = Instance.new("Frame")
moneyBox.AnchorPoint = Vector2.new(0.5, 0)
moneyBox.Position = UDim2.new(0.5, 0, 0, 8)
moneyBox.Size = UDim2.fromOffset(240, 70)
moneyBox.BackgroundColor3 = Color3.fromRGB(30, 40, 30)
moneyBox.BackgroundTransparency = 0.25
moneyBox.Parent = gui
round(moneyBox, 14)

local moneyLabel = label(moneyBox, {
	Size = UDim2.new(1, -16, 0.62, 0),
	Position = UDim2.fromOffset(8, 4),
	Text = "💰 $0",
	TextColor3 = Color3.fromRGB(255, 230, 90),
})
local incomeLabel = label(moneyBox, {
	Size = UDim2.new(1, -16, 0.32, 0),
	Position = UDim2.new(0, 8, 0.62, 0),
	Text = "+$0/s",
	TextColor3 = Color3.fromRGB(120, 255, 120),
})

local function watchMoney()
	local leaderstats = player:WaitForChild("leaderstats")
	local money = leaderstats:WaitForChild("Money") :: IntValue
	local function update()
		moneyLabel.Text = "💰 $" .. GameData.formatMoney(money.Value)
	end
	money.Changed:Connect(update)
	update()
end
task.spawn(watchMoney)

local function updateIncome()
	incomeLabel.Text = "+$" .. GameData.formatMoney(player:GetAttribute("Income") or 0) .. "/s"
end
player:GetAttributeChangedSignal("Income"):Connect(updateIncome)
updateIncome()

---------------------------------------------------------------------
-- Little messages under the money box
---------------------------------------------------------------------

local messages = Instance.new("Frame")
messages.AnchorPoint = Vector2.new(0.5, 0)
messages.Position = UDim2.new(0.5, 0, 0, 86)
messages.Size = UDim2.fromOffset(520, 200)
messages.BackgroundTransparency = 1
messages.Parent = gui
local layout = Instance.new("UIListLayout")
layout.HorizontalAlignment = Enum.HorizontalAlignment.Center
layout.Padding = UDim.new(0, 4)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = messages

local messageCount = 0
remotes:WaitForChild("Notify").OnClientEvent:Connect(function(text: string, color: Color3)
	messageCount += 1
	local message = label(messages, {
		Size = UDim2.new(1, 0, 0, 30),
		Text = text,
		TextColor3 = color,
		LayoutOrder = messageCount,
	})
	-- only keep the newest 4
	local all = {}
	for _, child in messages:GetChildren() do
		if child:IsA("TextLabel") then
			table.insert(all, child)
		end
	end
	table.sort(all, function(a, b)
		return a.LayoutOrder < b.LayoutOrder
	end)
	for i = 1, #all - 4 do
		all[i]:Destroy()
	end

	task.delay(3.5, function()
		if message.Parent then
			local fade =
				TweenService:Create(message, TweenInfo.new(0.5), { TextTransparency = 1, TextStrokeTransparency = 1 })
			fade:Play()
			fade.Completed:Wait()
			message:Destroy()
		end
	end)
end)

---------------------------------------------------------------------
-- The big "YOU GOT A ..." reveal when your monster pops out
---------------------------------------------------------------------

local reveal = Instance.new("Frame")
reveal.AnchorPoint = Vector2.new(0.5, 0.5)
reveal.Position = UDim2.fromScale(0.5, 0.42)
reveal.Size = UDim2.fromOffset(560, 190)
reveal.BackgroundTransparency = 1
reveal.Visible = false
reveal.Parent = gui
local revealScale = Instance.new("UIScale")
revealScale.Parent = reveal
local revealRarity = label(reveal, { Size = UDim2.fromScale(1, 0.3) })
local revealName = label(reveal, { Size = UDim2.fromScale(1, 0.45), Position = UDim2.fromScale(0, 0.3) })
local revealIncome = label(reveal, {
	Size = UDim2.fromScale(1, 0.22),
	Position = UDim2.fromScale(0, 0.77),
	TextColor3 = Color3.fromRGB(120, 255, 120),
})

local revealId = 0
remotes:WaitForChild("Reveal").OnClientEvent:Connect(function(monsterId: string)
	local monster = GameData.Monsters[monsterId]
	local rarity = GameData.Rarities[monster.rarity]
	revealId += 1
	local myId = revealId

	revealRarity.Text = "✨ " .. rarity.label .. " ✨"
	revealRarity.TextColor3 = rarity.color
	revealName.Text = monster.name
	revealName.TextColor3 = rarity.color
	revealIncome.Text = "+$" .. GameData.formatMoney(monster.income) .. " every second!"
	for _, l in { revealRarity, revealName, revealIncome } do
		l.TextTransparency = 0
		l.TextStrokeTransparency = 0
	end

	reveal.Visible = true
	revealScale.Scale = 0.2
	TweenService
		:Create(revealScale, TweenInfo.new(0.45, Enum.EasingStyle.Back, Enum.EasingDirection.Out), { Scale = 1 })
		:Play()

	task.delay(2.8, function()
		if revealId ~= myId then
			return
		end
		for _, l in { revealRarity, revealName, revealIncome } do
			TweenService:Create(l, TweenInfo.new(0.5), { TextTransparency = 1, TextStrokeTransparency = 1 }):Play()
		end
		task.wait(0.5)
		if revealId == myId then
			reveal.Visible = false
		end
	end)
end)

---------------------------------------------------------------------
-- Only show "Plant Seed" / "Sell" buttons in YOUR garden
---------------------------------------------------------------------

local function setupSpotPrompt(prompt: ProximityPrompt)
	local function update()
		local mine = prompt:GetAttribute("Owner") == player.UserId
		prompt.Enabled = mine and prompt:GetAttribute("State") ~= "growing"
	end
	prompt:GetAttributeChangedSignal("Owner"):Connect(update)
	prompt:GetAttributeChangedSignal("State"):Connect(update)
	update()
end
CollectionService:GetInstanceAddedSignal("SpotPrompt"):Connect(setupSpotPrompt)
for _, prompt in CollectionService:GetTagged("SpotPrompt") do
	setupSpotPrompt(prompt)
end

---------------------------------------------------------------------
-- Make monsters bounce and shop seeds spin
---------------------------------------------------------------------

local spinStart = {}

RunService.RenderStepped:Connect(function()
	local t = os.clock()
	local camPos = camera.CFrame.Position

	for _, model in CollectionService:GetTagged("Monster") do
		local base = model:GetAttribute("BaseCFrame")
		if base and model:IsA("Model") and (base.Position - camPos).Magnitude < 160 then
			local phase = (base.Position.X + base.Position.Z) * 0.37
			local hop = math.abs(math.sin(t * 2.5 + phase)) * 0.35
			local sway = math.sin(t * 1.3 + phase) * 0.12
			model:PivotTo(base * CFrame.new(0, hop, 0) * CFrame.Angles(0, sway, 0))
		end
	end

	for _, seedBall in CollectionService:GetTagged("Spin") do
		if seedBall:IsA("BasePart") then
			spinStart[seedBall] = spinStart[seedBall] or seedBall.CFrame
			local start = spinStart[seedBall]
			seedBall.CFrame = start * CFrame.new(0, math.sin(t * 2) * 0.3, 0) * CFrame.Angles(0, t * 1.5, 0)
		end
	end
end)
