-- MonsterBuilder: builds each monster out of balls and blocks.
-- Every monster has its own build function below. "s" is the monster's size (height in studs).
-- "base" is the spot on the ground under the monster. Its front faces base.LookVector.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")

local GameData = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("GameData"))

local MonsterBuilder = {}

local BLACK = Color3.fromRGB(25, 25, 30)
local WHITE = Color3.fromRGB(250, 250, 250)

---------------------------------------------------------------------
-- Little helpers to make parts
---------------------------------------------------------------------

local function newPart(model: Model, shape: Enum.PartType, size: Vector3, color: Color3, cf: CFrame): Part
	local p = Instance.new("Part")
	p.Anchored = true
	p.CanCollide = false
	p.CanTouch = false
	p.Material = Enum.Material.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	p.Shape = shape
	p.Size = size
	p.Color = color
	p.CFrame = cf
	p.Parent = model
	return p
end

local function ball(model, diameter: number, color: Color3, cf: CFrame): Part
	return newPart(model, Enum.PartType.Ball, Vector3.one * diameter, color, cf)
end

local function block(model, size: Vector3, color: Color3, cf: CFrame): Part
	return newPart(model, Enum.PartType.Block, size, color, cf)
end

-- A squashed ball (an "ellipsoid") of any size
local function blob(model, size: Vector3, color: Color3, cf: CFrame): Part
	local p = block(model, size, color, cf)
	local mesh = Instance.new("SpecialMesh")
	mesh.MeshType = Enum.MeshType.Sphere
	mesh.Parent = p
	return p
end

-- A standing-up cylinder
local function pillar(model, height: number, diameter: number, color: Color3, cf: CFrame): Part
	return newPart(
		model,
		Enum.PartType.Cylinder,
		Vector3.new(height, diameter, diameter),
		color,
		cf * CFrame.Angles(0, 0, math.rad(90))
	)
end

-- How far forward the front of a ball (radius r) is, at side-offset x and height y
local function surface(r: number, x: number, y: number): number
	return math.sqrt(math.max(r * r - x * x - y * y, 0))
end

-- One eye: white ball + black pupil. "look" moves the pupil (Vector2, -1..1)
local function eye(model, center: CFrame, x: number, y: number, z: number, d: number, look: Vector2?)
	ball(model, d, WHITE, center * CFrame.new(x, y, z))
	local lx = look and look.X or 0
	local ly = look and look.Y or 0
	ball(model, d * 0.48, BLACK, center * CFrame.new(x + lx * d * 0.15, y + ly * d * 0.15, z - d * 0.32))
end

-- Two eyes stuck on the front of a ball body
local function ballEyes(model, center: CFrame, r: number, spread: number, height: number, d: number, look: Vector2?)
	for _, side in { -1, 1 } do
		local x, y = side * spread * r, height * r
		eye(model, center, x, y, -surface(r, x, y) + d * 0.25, d, look)
	end
end

-- A mouth on the front of a ball body, with optional teeth
local function ballMouth(model, center: CFrame, r: number, height: number, width: number, tall: number, teeth: number?)
	local y = height * r
	local z = -surface(r, 0, y)
	blob(model, Vector3.new(width * r, tall * r, 0.3 * r), BLACK, center * CFrame.new(0, y, z + 0.08 * r))
	if teeth and teeth > 0 then
		local toothW = width * r / (teeth + 1)
		for i = 1, teeth do
			local x = (i / (teeth + 1) - 0.5) * width * r * 0.9
			local ty = y + tall * r * 0.3
			block(
				model,
				Vector3.new(toothW * 0.7, tall * r * 0.35, 0.1 * r),
				WHITE,
				center * CFrame.new(x, ty, -surface(r, x, ty) - 0.02 * r)
			)
		end
	end
end

local function feet(model, center: CFrame, r: number, color: Color3)
	for _, side in { -1, 1 } do
		blob(
			model,
			Vector3.new(0.5 * r, 0.3 * r, 0.6 * r),
			color,
			center * CFrame.new(side * 0.5 * r, -0.88 * r, -0.25 * r)
		)
	end
end

local function darker(c: Color3, amount: number?): Color3
	local k = 1 - (amount or 0.3)
	return Color3.new(c.R * k, c.G * k, c.B * k)
end

---------------------------------------------------------------------
-- The monsters!
---------------------------------------------------------------------

local builders = {}

-- COMMON: a little orange ball with two big buck teeth
function builders.Munchie(m, base, s)
	local r = s / 2
	local color = Color3.fromRGB(255, 150, 50)
	local c = base * CFrame.new(0, r, 0)
	local body = ball(m, s, color, c)
	feet(m, c, r, darker(color))
	ballEyes(m, c, r, 0.32, 0.28, 0.42 * r)
	ballMouth(m, c, r, -0.25, 0.7, 0.25)
	for _, side in { -1, 1 } do
		local x, y = side * 0.09 * r, -0.4 * r
		block(m, Vector3.new(0.16 * r, 0.24 * r, 0.08 * r), WHITE, c * CFrame.new(x, y, -surface(r, x, y) - 0.03 * r))
	end
	return body
end

-- COMMON: green ball, one big eye and one small eye, leaves on its head
function builders.LeafyLoony(m, base, s)
	local r = s / 2
	local color = Color3.fromRGB(150, 220, 100)
	local c = base * CFrame.new(0, r, 0)
	local body = ball(m, s, color, c)
	feet(m, c, r, darker(color))
	eye(m, c, -0.33 * r, 0.25 * r, -surface(r, 0.33 * r, 0.25 * r) + 0.15 * r, 0.6 * r, Vector2.new(0.8, 0.6))
	eye(m, c, 0.36 * r, 0.3 * r, -surface(r, 0.36 * r, 0.3 * r) + 0.08 * r, 0.32 * r, Vector2.new(-0.8, -0.5))
	ballMouth(m, c, r, -0.35, 0.8, 0.3, 3)
	local leaf = Color3.fromRGB(50, 140, 50)
	for _, tilt in { -0.6, 0, 0.6 } do
		blob(
			m,
			Vector3.new(0.25 * r, 1.0 * r, 0.5 * r),
			leaf,
			c * CFrame.Angles(0, 0, tilt) * CFrame.new(0, 1.2 * r, 0)
		)
	end
	return body
end

-- UNCOMMON: a pickle with a unicorn horn
function builders.PickletHorn(m, base, s)
	local w = s * 0.42 -- how wide
	local h = s * 0.6 -- the straight middle part
	local color = Color3.fromRGB(95, 145, 50)
	local c = base * CFrame.new(0, w / 2 + h / 2, 0)
	local body = pillar(m, h, w, color, c)
	ball(m, w, color, c * CFrame.new(0, h / 2, 0))
	ball(m, w, color, c * CFrame.new(0, -h / 2, 0))
	-- pickle bumps
	local bump = darker(color, 0.2)
	for i = 0, 9 do
		local angle = i * 2.4
		local y = ((i % 5) / 4 - 0.5) * h
		ball(m, 0.07 * s, bump, c * CFrame.new(math.cos(angle) * w / 2, y, math.sin(angle) * w / 2))
	end
	-- eyes and smile on the front of the pickle
	local d = 0.32 * w
	for _, side in { -1, 1 } do
		local x = side * 0.22 * w
		eye(m, c, x, 0.3 * h, -surface(w / 2, x, 0) + d * 0.2, d, Vector2.new(0, 0.5))
	end
	blob(m, Vector3.new(0.4 * w, 0.12 * w, 0.15 * w), BLACK, c * CFrame.new(0, 0.05 * h, -w / 2))
	-- the horn: a stack of shrinking balls
	local top = h / 2 + w / 2
	local hornColor = Color3.fromRGB(255, 240, 180)
	ball(m, 0.16 * s, hornColor, c * CFrame.new(0, top + 0.02 * s, 0))
	ball(m, 0.11 * s, hornColor, c * CFrame.new(0, top + 0.12 * s, -0.01 * s))
	ball(m, 0.07 * s, hornColor, c * CFrame.new(0, top + 0.2 * s, -0.02 * s))
	ball(m, 0.04 * s, hornColor, c * CFrame.new(0, top + 0.26 * s, -0.03 * s))
	return body
end

-- UNCOMMON: a slimy green booger ball with a pink flower on top
function builders.BoogerBloom(m, base, s)
	local r = s / 2
	local color = Color3.fromRGB(160, 205, 60)
	local c = base * CFrame.new(0, r, 0)
	local body = ball(m, s, color, c)
	body.Reflectance = 0.15
	body.Transparency = 0.08
	-- slime drips
	for i, x in { -0.7, -0.2, 0.45, 0.8 } do
		local y = -0.3 - i * 0.08
		ball(m, 0.22 * r, color, c * CFrame.new(x * r, y * r, -surface(r, x * r, y * r) + 0.05 * r))
	end
	ballEyes(m, c, r, 0.3, 0.25, 0.4 * r, Vector2.new(0, -0.6))
	ballMouth(m, c, r, -0.15, 0.5, 0.35)
	ball(m, 0.18 * r, Color3.fromRGB(255, 120, 160), c * CFrame.new(0, -0.22 * r, -surface(r, 0, -0.22 * r) - 0.05 * r)) -- tongue
	-- flower
	local petal = Color3.fromRGB(255, 120, 190)
	local flowerY = 1.02 * r
	ball(m, 0.35 * r, Color3.fromRGB(255, 220, 60), c * CFrame.new(0, flowerY + 0.05 * r, 0))
	for i = 0, 5 do
		local a = i * math.pi / 3
		ball(m, 0.32 * r, petal, c * CFrame.new(math.cos(a) * 0.3 * r, flowerY, math.sin(a) * 0.3 * r))
	end
	return body
end

-- RARE: tall seaweed guy with a blue cap and seaweed hair
function builders.SinkweedSteve(m, base, s)
	local w = s * 0.42
	local h = s * 0.55
	local color = Color3.fromRGB(40, 120, 90)
	local c = base * CFrame.new(0, w / 2 + h / 2, 0)
	local body = pillar(m, h, w, color, c)
	ball(m, w, color, c * CFrame.new(0, h / 2, 0))
	ball(m, w, color, c * CFrame.new(0, -h / 2, 0))
	-- sleepy eyes
	local d = 0.3 * w
	for _, side in { -1, 1 } do
		local x = side * 0.22 * w
		eye(m, c, x, 0.35 * h, -surface(w / 2, x, 0) + d * 0.2, d, Vector2.new(0, -0.8))
		block(
			m,
			Vector3.new(d * 1.1, d * 0.4, d * 0.5),
			color,
			c * CFrame.new(x, 0.35 * h + d * 0.3, -surface(w / 2, x, 0) - 0.02 * w)
		)
	end
	blob(m, Vector3.new(0.35 * w, 0.08 * w, 0.12 * w), BLACK, c * CFrame.new(0.05 * w, 0.05 * h, -w / 2))
	-- cap
	local capColor = Color3.fromRGB(40, 90, 220)
	local headY = h / 2
	ball(m, w * 1.05, capColor, c * CFrame.new(0, headY + 0.08 * w, 0))
	block(m, Vector3.new(w * 0.7, 0.04 * s, w * 0.5), capColor, c * CFrame.new(0, headY + 0.08 * w, -w * 0.55))
	-- seaweed hair
	local kelp = Color3.fromRGB(70, 170, 70)
	for i, x in { -0.45, -0.15, 0.15, 0.45 } do
		local tilt = x * 1.2
		blob(
			m,
			Vector3.new(0.1 * w, 0.75 * w, 0.06 * w),
			kelp,
			c
				* CFrame.new(x * w, headY + 0.1 * w, 0.25 * w)
				* CFrame.Angles(0.4 + i * 0.05, 0, -tilt)
				* CFrame.new(0, 0.35 * w, 0)
		)
	end
	return body
end

-- RARE: a viking leaf with a horned helmet and a big orange beard
function builders.LeafErickson(m, base, s)
	local r = s / 2
	local color = Color3.fromRGB(70, 165, 70)
	local c = base * CFrame.new(0, r, 0)
	local body = ball(m, s, color, c)
	feet(m, c, r, Color3.fromRGB(110, 70, 40))
	ballEyes(m, c, r, 0.3, 0.2, 0.36 * r)
	-- angry eyebrows
	for _, side in { -1, 1 } do
		local x, y = side * 0.3 * r, 0.45 * r
		block(
			m,
			Vector3.new(0.4 * r, 0.1 * r, 0.1 * r),
			BLACK,
			c * CFrame.new(x, y, -surface(r, x, y) - 0.02 * r) * CFrame.Angles(0, 0, side * -0.35)
		)
	end
	ballMouth(m, c, r, -0.18, 0.4, 0.15)
	-- beard
	blob(
		m,
		Vector3.new(1.0 * r, 0.75 * r, 0.4 * r),
		Color3.fromRGB(230, 120, 40),
		c * CFrame.new(0, -0.55 * r, -0.78 * r)
	)
	-- helmet
	local metal = Color3.fromRGB(165, 165, 175)
	local helmet = ball(m, 1.6 * r, metal, c * CFrame.new(0, 0.55 * r, 0))
	helmet.Material = Enum.Material.Metal
	-- horns curving up and out
	local horn = Color3.fromRGB(245, 240, 220)
	for _, side in { -1, 1 } do
		ball(m, 0.4 * r, horn, c * CFrame.new(side * 0.8 * r, 0.85 * r, 0))
		ball(m, 0.3 * r, horn, c * CFrame.new(side * 1.05 * r, 1.1 * r, 0))
		ball(m, 0.2 * r, horn, c * CFrame.new(side * 1.15 * r, 1.38 * r, 0))
	end
	return body
end

-- EPIC: a smart old leaf with glasses, a graduation cap... and very stinky toots
function builders.ProfessorPootleaf(m, base, s)
	local r = s / 2
	local color = Color3.fromRGB(140, 130, 60)
	local c = base * CFrame.new(0, r, 0)
	local body = ball(m, s, color, c)
	feet(m, c, r, darker(color))
	ballEyes(m, c, r, 0.3, 0.2, 0.32 * r)
	-- round glasses
	for _, side in { -1, 1 } do
		local x, y = side * 0.3 * r, 0.2 * r
		local z = -surface(r, x, y) + 0.06 * r
		pillar(m, 0.04 * r, 0.48 * r, BLACK, c * CFrame.new(x, y, z) * CFrame.Angles(math.rad(90), 0, 0))
	end
	block(
		m,
		Vector3.new(0.2 * r, 0.04 * r, 0.04 * r),
		BLACK,
		c * CFrame.new(0, 0.22 * r, -surface(r, 0, 0.22 * r) - 0.05 * r)
	)
	-- mustache
	for _, side in { -1, 1 } do
		blob(
			m,
			Vector3.new(0.45 * r, 0.16 * r, 0.12 * r),
			Color3.fromRGB(240, 240, 240),
			c
				* CFrame.new(side * 0.2 * r, -0.12 * r, -surface(r, side * 0.2 * r, -0.12 * r) - 0.02 * r)
				* CFrame.Angles(0, 0, side * 0.25)
		)
	end
	ballMouth(m, c, r, -0.35, 0.35, 0.12)
	-- graduation cap
	ball(m, 1.3 * r, BLACK, c * CFrame.new(0, 0.6 * r, 0))
	local board = c * CFrame.new(0, 1.2 * r, 0) * CFrame.Angles(0, math.rad(45), 0)
	block(m, Vector3.new(1.4 * r, 0.08 * r, 1.4 * r), BLACK, board)
	block(
		m,
		Vector3.new(0.05 * r, 0.5 * r, 0.05 * r),
		Color3.fromRGB(255, 210, 40),
		board * CFrame.new(0.65 * r, -0.25 * r, 0.65 * r)
	)
	-- a leaf sticking out the back
	blob(
		m,
		Vector3.new(0.2 * r, 0.9 * r, 0.5 * r),
		Color3.fromRGB(70, 150, 60),
		c * CFrame.new(0, 0.3 * r, 1.0 * r) * CFrame.Angles(-0.7, 0, 0)
	)
	-- stinky green toot clouds
	local stink = Instance.new("Attachment")
	stink.Position = Vector3.new(0, -0.6 * r, 0.8 * r)
	stink.Parent = body
	local cloud = Instance.new("ParticleEmitter")
	cloud.Texture = "rbxasset://textures/particles/smoke_main.dds"
	cloud.Color = ColorSequence.new(Color3.fromRGB(150, 220, 60))
	cloud.Size = NumberSequence.new(0.5 * r, 1.2 * r)
	cloud.Transparency = NumberSequence.new(0.3, 1)
	cloud.Lifetime = NumberRange.new(1.5, 2.5)
	cloud.Rate = 1.5
	cloud.Speed = NumberRange.new(1, 2)
	cloud.SpreadAngle = Vector2.new(30, 30)
	cloud.EmissionDirection = Enum.NormalId.Back
	cloud.Parent = stink
	return body
end

-- EPIC: a red knight with a helmet, a feather and LOTS of teeth
function builders.SirBitesALot(m, base, s)
	local r = s / 2
	local color = Color3.fromRGB(205, 55, 55)
	local c = base * CFrame.new(0, r, 0)
	local body = ball(m, s, color, c)
	feet(m, c, r, darker(color))
	ballEyes(m, c, r, 0.3, 0.25, 0.34 * r, Vector2.new(0, -0.4))
	ballMouth(m, c, r, -0.3, 1.1, 0.4, 6)
	-- knight helmet
	local metal = Color3.fromRGB(170, 170, 185)
	local helmet = ball(m, 1.75 * r, metal, c * CFrame.new(0, 0.5 * r, 0))
	helmet.Material = Enum.Material.Metal
	-- feather plume
	for i, color2 in { Color3.fromRGB(255, 255, 255), Color3.fromRGB(240, 60, 60), Color3.fromRGB(255, 255, 255) } do
		blob(
			m,
			Vector3.new(0.18 * r, 0.9 * r, 0.3 * r),
			color2,
			c * CFrame.new((i - 2) * 0.14 * r, 1.4 * r, 0.1 * r) * CFrame.Angles(0.5, 0, (i - 2) * -0.3)
		)
	end
	-- sword
	local sword = c * CFrame.new(1.25 * r, 0, -0.3 * r) * CFrame.Angles(0, 0, -0.2)
	local blade = block(
		m,
		Vector3.new(0.15 * r, 1.6 * r, 0.05 * r),
		Color3.fromRGB(220, 220, 235),
		sword * CFrame.new(0, 0.6 * r, 0)
	)
	blade.Material = Enum.Material.Metal
	block(m, Vector3.new(0.6 * r, 0.1 * r, 0.12 * r), Color3.fromRGB(230, 180, 40), sword * CFrame.new(0, -0.2 * r, 0))
	block(m, Vector3.new(0.1 * r, 0.4 * r, 0.1 * r), Color3.fromRGB(100, 60, 30), sword * CFrame.new(0, -0.45 * r, 0))
	return body
end

-- LEGENDARY: a purple ball that is basically one giant mouth
function builders.ChompyMcChompface(m, base, s)
	local r = s / 2
	local color = Color3.fromRGB(145, 60, 210)
	local c = base * CFrame.new(0, r, 0)
	local body = ball(m, s, color, c)
	feet(m, c, r, darker(color))
	ballEyes(m, c, r, 0.28, 0.55, 0.38 * r, Vector2.new(0, 0.5))
	-- huge mouth
	blob(m, Vector3.new(1.45 * r, 0.85 * r, 0.3 * r), BLACK, c * CFrame.new(0, -0.15 * r, -0.82 * r))
	ball(m, 0.5 * r, Color3.fromRGB(255, 110, 150), c * CFrame.new(0, -0.38 * r, -0.85 * r)) -- tongue
	-- top and bottom teeth
	for row, y in { 0.15, -0.48 } do
		local count = row == 1 and 7 or 6
		for i = 1, count do
			local x = (i / (count + 1) - 0.5) * 1.2 * r
			local ty = (y + math.abs(x / r) * (row == 1 and -0.15 or 0.15)) * r
			block(
				m,
				Vector3.new(0.13 * r, 0.2 * r, 0.12 * r),
				WHITE,
				c * CFrame.new(x, ty, -surface(r, x, ty) - 0.05 * r) * CFrame.Angles(0, 0, math.rad(45))
			)
		end
	end
	local sparkles = Instance.new("Sparkles")
	sparkles.SparkleColor = Color3.fromRGB(255, 220, 80)
	sparkles.Parent = body
	return body
end

-- LEGENDARY: a giant green dinosaur monster
function builders.Chompzilla(m, base, s)
	local color = Color3.fromRGB(60, 150, 60)
	local belly = Color3.fromRGB(190, 220, 120)
	local bodyD = 0.6 * s
	local c = base * CFrame.new(0, 0.38 * s, 0)
	local body = ball(m, bodyD, color, c)
	blob(m, Vector3.new(0.4 * s, 0.45 * s, 0.1 * s), belly, c * CFrame.new(0, -0.02 * s, -0.27 * s))
	-- legs and feet
	for _, side in { -1, 1 } do
		blob(m, Vector3.new(0.18 * s, 0.25 * s, 0.2 * s), color, c * CFrame.new(side * 0.17 * s, -0.25 * s, 0))
		blob(
			m,
			Vector3.new(0.18 * s, 0.08 * s, 0.26 * s),
			darker(color),
			base * CFrame.new(side * 0.17 * s, 0.04 * s, -0.04 * s)
		)
		-- tiny arms
		blob(
			m,
			Vector3.new(0.06 * s, 0.06 * s, 0.16 * s),
			color,
			c * CFrame.new(side * 0.2 * s, 0.05 * s, -0.25 * s) * CFrame.Angles(0.5, 0, 0)
		)
	end
	-- tail
	for k = 1, 5 do
		ball(m, (0.24 - k * 0.032) * s, color, c * CFrame.new(0, -0.12 * s - k * 0.025 * s, 0.22 * s + k * 0.1 * s))
	end
	-- head and snout
	local head = c * CFrame.new(0, 0.34 * s, -0.16 * s)
	ball(m, 0.4 * s, color, head)
	local snout = head * CFrame.new(0, -0.06 * s, -0.2 * s)
	blob(m, Vector3.new(0.3 * s, 0.18 * s, 0.3 * s), color, snout)
	blob(m, Vector3.new(0.26 * s, 0.04 * s, 0.24 * s), BLACK, snout * CFrame.new(0, -0.03 * s, -0.04 * s))
	for i = 1, 6 do
		local x = (i / 7 - 0.5) * 0.24 * s
		block(m, Vector3.new(0.025 * s, 0.05 * s, 0.025 * s), WHITE, snout * CFrame.new(x, -0.02 * s, -0.14 * s))
	end
	-- nostrils
	for _, side in { -1, 1 } do
		ball(m, 0.03 * s, BLACK, snout * CFrame.new(side * 0.05 * s, 0.07 * s, -0.13 * s))
	end
	-- eyes
	for _, side in { -1, 1 } do
		eye(m, head, side * 0.1 * s, 0.08 * s, -0.17 * s, 0.11 * s, Vector2.new(0, 0.3))
		block(
			m,
			Vector3.new(0.13 * s, 0.03 * s, 0.05 * s),
			darker(color, 0.5),
			head * CFrame.new(side * 0.1 * s, 0.15 * s, -0.16 * s) * CFrame.Angles(0, 0, side * -0.4)
		)
	end
	-- spikes down the back (diamonds poking out of the body and head)
	local spike = Color3.fromRGB(240, 140, 40)
	for i = 0, 6 do
		local a = math.rad(15 + i * 22)
		local pos = Vector3.new(0, math.cos(a) * bodyD / 2, math.sin(a) * bodyD / 2)
		block(
			m,
			Vector3.new(0.04 * s, 0.11 * s, 0.11 * s),
			spike,
			c * CFrame.new(pos) * CFrame.Angles(a + math.rad(45), 0, 0)
		)
	end
	for i = 0, 2 do
		local a = math.rad(-20 + i * 30)
		local pos = Vector3.new(0, math.cos(a) * 0.2 * s, math.sin(a) * 0.2 * s)
		block(
			m,
			Vector3.new(0.03 * s, 0.08 * s, 0.08 * s),
			spike,
			head * CFrame.new(pos) * CFrame.Angles(a + math.rad(45), 0, 0)
		)
	end
	local sparkles = Instance.new("Sparkles")
	sparkles.SparkleColor = Color3.fromRGB(255, 220, 80)
	sparkles.Parent = body
	return body
end

---------------------------------------------------------------------

-- Builds a monster standing on "base". Returns the Model.
-- sizeOverride lets us make giant statues of a monster.
function MonsterBuilder.build(monsterId: string, base: CFrame, sizeOverride: number?): Model
	local info = GameData.Monsters[monsterId]
	assert(info, "Unknown monster: " .. tostring(monsterId))
	local builder = builders[monsterId]
	assert(builder, "No look made yet for monster: " .. tostring(monsterId))

	local model = Instance.new("Model")
	model.Name = info.name
	local body = builder(model, base, sizeOverride or info.size)
	model.PrimaryPart = body
	model.WorldPivot = base
	model:SetAttribute("MonsterId", monsterId)
	model:SetAttribute("BaseCFrame", base)
	CollectionService:AddTag(model, "Monster")
	return model
end

-- A little sprout that grows on the soil until the monster pops out
function MonsterBuilder.buildSprout(base: CFrame): Model
	local model = Instance.new("Model")
	model.Name = "Sprout"
	local green = Color3.fromRGB(80, 180, 60)
	pillar(model, 2.4, 0.35, green, base * CFrame.new(0, 1.2, 0))
	for _, side in { -1, 1 } do
		blob(
			model,
			Vector3.new(1.4, 0.2, 0.8),
			green,
			base * CFrame.new(side * 0.65, 2.1, 0) * CFrame.Angles(0, 0, side * 0.4)
		)
	end
	ball(model, 0.7, Color3.fromRGB(255, 150, 200), base * CFrame.new(0, 2.6, 0))
	model.WorldPivot = base
	return model
end

return MonsterBuilder
