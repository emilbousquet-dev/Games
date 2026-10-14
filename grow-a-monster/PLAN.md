# 🌱 Grow a Monster 👹 — Game Plan

A **Roblox** game. Plant seeds, grow goofy monsters, make money, steal other players' monsters, protect your own.

> **Note for a future Claude chat:** this plan was made in a cloud chat that could not reach the player's computer.
> The player (11 years old, doesn't write code themselves) decides the ideas; Claude writes all the Luau code
> and puts it into Roblox Studio on their computer. Read this whole file before starting, and keep it up to date
> when decisions change.

## Why this idea

The two biggest Roblox games ever are **Grow a Garden** and **Steal a Brainrot** (each had 20+ million players at the same time).
Grow a Monster mixes both: **grow** stuff + **steal** stuff, with our own twist: the plants are funny **monsters**.

## What players see on the Roblox home page

- **Thumbnail:** a giant goofy monster bursting out of a tiny flowerpot, a player looking shocked next to it.
- **Name:** `🌱 Grow a Monster 👹`

## The first 10 seconds

1. Player spawns in their own garden with a **free seed already in their hand**.
2. They plant it and in **30 seconds** a funny monster pops out.
3. The monster starts making money right away.

## Main game loop

| | What happens |
|---|---|
| 🌱 **Grow** | Buy seeds at the seed shop, plant them in your garden. Rarer seeds → bigger monsters → more money per second. |
| ✨ **Mutations** | Sometimes a monster grows out **Golden**, **Rainbow** or **GIANT**, worth way more money. |
| 😈 **Steal** | Sneak into another player's garden, grab a monster, carry it back to your base. The owner can chase you! |
| 🔒 **Protect** | Lock your garden gate for a short time, or grow guard monsters that bonk thieves. |
| 🌕 **Events** | On a **Blood Moon** every monster has a big chance to mutate, so everyone rushes to plant. |

## Monsters

Names invented by the player. Rarity and income can still change.

| Monster | Rarity | Money / sec | Looks like |
|---|---|---|---|
| Munchie | Common | $1 | little orange ball with buck teeth |
| Leafy Loony | Common | $2 | green ball, one big eye + one tiny eye, leaves on head |
| Picklet Horn | Uncommon | $5 | a pickle with a unicorn horn |
| Booger Bloom | Uncommon | $8 | slimy booger ball with a pink flower |
| Sinkweed Steve | Rare | $20 | tall seaweed guy with a blue cap |
| Leaf Erickson | Rare | $28 | viking with horned helmet and orange beard |
| Professor Pootleaf | Epic | $90 | glasses, graduation cap, green toot clouds |
| Sir Bites-a-Lot | Epic | $120 | red knight with helmet, sword and lots of teeth |
| Chompy McChompface | Legendary | $350 | purple ball that is one giant mouth |
| Chompzilla | Legendary | $600 | giant green dinosaur (also the statue at the Seed Shop) |

More names to use later: the player said "and more"!

## Seeds

- **Starter Seed:** free, once. Never gives a Common.
- **Mystery Seed:** $100, mostly Common.
- **Golden Seed:** $2,500, never Common, 4% Legendary.

## Plan to build it (small steps, finish each one)

1. ✅ *(code written, not yet tested in Studio)* **Version 1 — Grow:** one garden per player, a seed shop, plant → grow → monster makes money. Save progress.
2. **Version 2 — Mutations:** Golden / Rainbow / GIANT chances.
3. **Version 3 — Steal & Protect:** carry monsters, chase thieves, gate lock.
4. **Version 4 — Events:** Blood Moon and other weather.
5. **Later:** more monsters, trading, updates every week or two.

## How we'll make it

- **Code language:** Luau (Roblox's version of Lua).
- **Tool:** Roblox Studio, on the player's computer.
- The game is in `src/` and built into `GrowAMonster.rbxlx` with Rojo (see README.md).
  You can open that file in Roblox Studio by double-clicking it.
- Code can be written ahead of time and saved in this folder; a chat running on the player's computer
  (Claude desktop app, or `claude remote-control`) puts it into Roblox Studio.

## Decisions log

- 2026-10-14: Picked **Grow a Monster** (grow + steal mix) out of 5 ideas.
- 2026-10-14: Player named 10 monsters. Starter seed never gives a Common.
- 2026-10-14: Version 1 code written (grow, sell, seed shop, saving).
