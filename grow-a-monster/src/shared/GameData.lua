-- GameData: all the monsters, seeds and rarities live here.
-- Want a new monster or to change a price? This is the file to edit!

local GameData = {}

-- How many soil patches each garden has
GameData.SPOTS_PER_GARDEN = 6

-- Rarities, from most common to most rare
GameData.Rarities = {
	Common = { order = 1, label = "COMMON", color = Color3.fromRGB(210, 210, 210) },
	Uncommon = { order = 2, label = "UNCOMMON", color = Color3.fromRGB(90, 220, 90) },
	Rare = { order = 3, label = "RARE", color = Color3.fromRGB(70, 150, 255) },
	Epic = { order = 4, label = "EPIC", color = Color3.fromRGB(190, 90, 255) },
	Legendary = { order = 5, label = "LEGENDARY", color = Color3.fromRGB(255, 200, 40) },
}

-- Every monster. "income" is money per second, "size" is how tall it is (in studs).
-- The look of each monster is built in ServerScriptService > Server > MonsterBuilder.
GameData.Monsters = {
	Munchie = { name = "Munchie", rarity = "Common", income = 1, size = 3 },
	LeafyLoony = { name = "Leafy Loony", rarity = "Common", income = 2, size = 3.2 },

	PickletHorn = { name = "Picklet Horn", rarity = "Uncommon", income = 5, size = 4.2 },
	BoogerBloom = { name = "Booger Bloom", rarity = "Uncommon", income = 8, size = 4 },

	SinkweedSteve = { name = "Sinkweed Steve", rarity = "Rare", income = 20, size = 5.5 },
	LeafErickson = { name = "Leaf Erickson", rarity = "Rare", income = 28, size = 5 },

	ProfessorPootleaf = { name = "Professor Pootleaf", rarity = "Epic", income = 90, size = 6 },
	SirBitesALot = { name = "Sir Bites-a-Lot", rarity = "Epic", income = 120, size = 6 },

	ChompyMcChompface = { name = "Chompy McChompface", rarity = "Legendary", income = 350, size = 7 },
	Chompzilla = { name = "Chompzilla", rarity = "Legendary", income = 600, size = 9 },
}

-- Selling a monster gives you this many seconds of its income
GameData.SELL_SECONDS = 30

-- Seeds. "odds" = the chance (in %) of each rarity. A seed picks a random monster of that rarity.
-- "price = 0" means you can't buy it in the shop.
GameData.Seeds = {
	Starter = {
		name = "Starter Seed",
		price = 0,
		growTime = 30,
		color = Color3.fromRGB(140, 200, 90),
		-- The starter seed never gives a Common!
		odds = { Uncommon = 85, Rare = 12, Epic = 2.5, Legendary = 0.5 },
	},
	Mystery = {
		name = "Mystery Seed",
		price = 100,
		growTime = 45,
		color = Color3.fromRGB(150, 110, 70),
		odds = { Common = 70, Uncommon = 22, Rare = 6, Epic = 1.8, Legendary = 0.2 },
	},
	Golden = {
		name = "Golden Seed",
		price = 2500,
		growTime = 90,
		color = Color3.fromRGB(255, 200, 40),
		odds = { Uncommon = 40, Rare = 40, Epic = 16, Legendary = 4 },
	},
}

-- The order seeds are shown in the shop
GameData.ShopSeeds = { "Mystery", "Golden" }

-- Turns 1234567 into "1.23M" and 12345 into "12,345"
function GameData.formatMoney(n: number): string
	n = math.floor(n)
	if n >= 1e12 then
		return string.format("%.2fT", n / 1e12)
	elseif n >= 1e9 then
		return string.format("%.2fB", n / 1e9)
	elseif n >= 1e6 then
		return string.format("%.2fM", n / 1e6)
	end
	local s = tostring(n)
	local withCommas = s:reverse():gsub("(%d%d%d)", "%1,"):reverse()
	if withCommas:sub(1, 1) == "," then
		withCommas = withCommas:sub(2)
	end
	return withCommas
end

-- Turns 83 into "1:23"
function GameData.formatTime(seconds: number): string
	seconds = math.max(0, math.floor(seconds))
	return string.format("%d:%02d", seconds // 60, seconds % 60)
end

-- Monster ids grouped by rarity, e.g. GameData.ByRarity.Rare = { "SinkweedSteve", "LeafErickson" }
GameData.ByRarity = {}
for id, monster in GameData.Monsters do
	GameData.ByRarity[monster.rarity] = GameData.ByRarity[monster.rarity] or {}
	table.insert(GameData.ByRarity[monster.rarity], id)
end
for _, list in GameData.ByRarity do
	table.sort(list)
end

return GameData
