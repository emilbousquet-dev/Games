-- Data: saves and loads each player's money, seeds and garden.
-- Saving only works in a published game, or in Studio with
-- "Game Settings > Security > Enable Studio Access to API Services" turned on.

local DataStoreService = game:GetService("DataStoreService")

local Data = {}

local STORE_NAME = "GrowAMonster_v1"

local store = nil
do
	local ok, result = pcall(function()
		return DataStoreService:GetDataStore(STORE_NAME)
	end)
	if ok then
		store = result
	else
		warn("[Data] Saving is off: " .. tostring(result))
	end
end

local function newData()
	return {
		money = 0,
		seeds = {}, -- seedId -> how many
		spots = {}, -- "1".."6" -> { seed = seedId, monster = monsterId, readyAt = os.time() number }
		gotStarter = false,
	}
end

local function keyFor(player: Player): string
	return "player_" .. player.UserId
end

-- Returns (data, canSave). If loading fails we play with fresh data
-- but never save it, so we don't wipe the player's real save.
function Data.load(player: Player)
	if not store then
		return newData(), false
	end

	for attempt = 1, 3 do
		local ok, result = pcall(function()
			return store:GetAsync(keyFor(player))
		end)
		if ok then
			local data = newData()
			if type(result) == "table" then
				for k, v in result do
					data[k] = v
				end
			end
			return data, true
		end
		warn(("[Data] Load failed for %s (try %d): %s"):format(player.Name, attempt, tostring(result)))
		local message = tostring(result)
		if message:find("API") or message:find("publish") then
			break -- Studio without API access: retrying won't help
		end
		task.wait(1)
	end
	return newData(), false
end

function Data.save(player: Player, data)
	if not store then
		return
	end
	local ok, err = pcall(function()
		store:SetAsync(keyFor(player), data, { player.UserId })
	end)
	if not ok then
		warn(("[Data] Save failed for %s: %s"):format(player.Name, tostring(err)))
	end
end

return Data
