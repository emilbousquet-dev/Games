# 🌱 Grow a Monster 👹

Our first **Roblox** game! Plant seeds, grow goofy monsters, get rich.
See [PLAN.md](PLAN.md) for the full idea and what comes next.

## How to open it in Roblox Studio

1. Download **`GrowAMonster.rbxlx`** from this folder.
2. Double-click it (or in Roblox Studio: **File → Open from File…**).
3. Press **▶ Play**. The world builds itself when the game starts. In edit mode you'll only see grass.

To make **saving** work while testing in Studio: **Game Settings → Security → Enable Studio Access to API Services**.
When you publish, set **Max Players to 8** (there are 8 gardens).

## How to play

- You start in your own garden holding a free **Starter Seed** (never a Common!).
- Walk to the brown soil and press **E** (or tap the button) to plant it.
- Wait for it to grow… and a monster pops out! It makes money every second.
- Buy more seeds at the **Seed Shop** in the middle.
- Hold **E** on a monster to sell it and free up the soil.
- Your monsters keep growing while you're offline.

## The monsters

| Monster | Rarity | Money / sec |
|---|---|---|
| Munchie | ⚪ Common | $1 |
| Leafy Loony | ⚪ Common | $2 |
| Picklet Horn | 🟢 Uncommon | $5 |
| Booger Bloom | 🟢 Uncommon | $8 |
| Sinkweed Steve | 🔵 Rare | $20 |
| Leaf Erickson | 🔵 Rare | $28 |
| Professor Pootleaf | 🟣 Epic | $90 |
| Sir Bites-a-Lot | 🟣 Epic | $120 |
| Chompy McChompface | 🟡 Legendary | $350 |
| Chompzilla | 🟡 Legendary | $600 |

## Seeds

| Seed | Price | Grow time | Common | Uncommon | Rare | Epic | Legendary |
|---|---|---|---|---|---|---|---|
| Starter Seed | free (once) | 30s | – | 85% | 12% | 2.5% | 0.5% |
| Mystery Seed | $100 | 45s | 70% | 22% | 6% | 1.8% | 0.2% |
| Golden Seed | $2,500 | 90s | – | 40% | 40% | 16% | 4% |

## For coders: how the code is organized

The code lives in `src/` and is turned into `GrowAMonster.rbxlx` with [Rojo](https://rojo.space):
`rojo build default.project.json -o GrowAMonster.rbxlx`

| File | What it does |
|---|---|
| `src/shared/GameData.lua` | All monsters, seeds, rarities and prices. **Edit this to change the game!** |
| `src/server/Main.server.lua` | The main game: planting, growing, selling, buying, joining and leaving |
| `src/server/MonsterBuilder.lua` | Builds each monster out of balls and blocks |
| `src/server/MapBuilder.lua` | Builds the Seed Shop and the 8 gardens |
| `src/server/Data.lua` | Saving and loading |
| `src/client/Hud.client.lua` | Money counter, messages, the big reveal, bouncing monsters |
