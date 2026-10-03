# NINJA CAT 🐱🥷

A **3D ninja cat rooftop adventure** that runs in your web browser.
Play **alone** or with a **friend** in split screen, using the keyboard or controllers.

> The evil Shogun Dog **LORD WOOFMOTO** stole the **GOLDEN FISH** from the cat village! 🐟
> Ninja cats **MOCHI** (orange) and **SHADOW** (black) sneak across the rooftops at night to get it back.

## How to play

1. Open **`ninja-cat/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Choose **1 PLAYER** or **2 PLAYERS**, then pick a level.
3. Put the sound on: the music is made with a bamboo flute, a koto and big taiko drums! 🥁

The first level teaches you every move. Walk up to the **?** signs to read the hints.

## Controls

| | 🐱 MOCHI (Player 1) | 🐈‍⬛ SHADOW (Player 2) | 🎮 Controller |
|---|---|---|---|
| Move | `W` `A` `S` `D` | arrows | left stick |
| Camera | **mouse** (click the game first) or `Q` `E` | `,` `.` | right stick |
| Jump / double jump / wall jump | `Space` | `Enter` | A |
| Katana (press 3 times for a SPIN!) | `F` or left click | `L` | X / RT |
| Ground pound | `F` in the air | `L` in the air | X in the air |
| Shuriken | `R` or right click | `K` | Y / RB |
| Smoke bomb | `G` | `J` | B / LB |
| Wash your paw 🐾 | `T` | `H` | Back |
| Pause | `Esc` / `P` | | Start |

In **1 player** mode you can use either side of the keyboard, or a controller.

## Ninja moves

- **Double jump**: press jump again in the air (you do a flip!).
- **Wall climb**: jump at a tall wall and keep pushing toward it. Press jump on the wall to **wall-jump**.
  You can climb bamboo too!
- **Katana combo**: slash, slash, **SPIN ATTACK**!
- **Ground pound**: press katana high in the air. Smashes enemies and pots.
- **Shuriken**: they fly to the closest enemy in front of you. Get more from 📜 scrolls.
- **Smoke bomb**: you turn **invisible** for a few seconds. Enemies forget about you!
- **Sneak attack**: hit a dog or rat **from behind before it sees you** (no **!** over its head) and it's knocked out in ONE hit.
- **Super jump** (2 players): jump on your friend's head, then press jump again!

## The enemies

- **Guard dog** 🐕: walks around with a lantern. If it sees you it barks, calls its friends and chases you with a spear. 3 hits.
- **Rat ninja** 🐀: fast! It stays far away and throws fish bones. Your katana can cut the bones. 2 hits.
- **Crow** 🐦‍⬛: flies in circles, then swoops down at you. Use shuriken! 1 hit.
- **Frog** 🐸: jumps at you. Hit it right after it lands. 2 hits.
- **BIG BULLDOG** (boss, level 3): make him **charge into a wall**, then attack while he's dizzy.
- **LORD WOOFMOTO** (final boss, level 5): 3 phases. Sword fighting, then a **fireworks cannon**
  (stay away from the red circles!), and then a giant **ROBO-DOG**. When the robot **overheats**, ATTACK!
  Jump over the shockwave rings.

## The 5 levels

1. **Sakura Village**: cherry trees and lanterns. Learn all the moves.
2. **Fish Market Docks**: hop across posts, boats and docks. Watch out for the water!
3. **Bamboo Forest**: climb the bamboo to reach the cliffs, then beat the **BIG BULLDOG**.
4. **Castle Walls**: stealth! Stay out of the **searchlights** and jump over the **spike traps**.
5. **Shogun's Pagoda**: high above the clouds... the final battle!

Every level has **3 hidden golden bells** 🔔. You get up to **3 stars** ★ per level:
one for finishing, one for collecting 75% of the fish, one for finding all the bells.
Stone lanterns are **checkpoints**. You have **9 lives** (you're a cat!), and **100 fish = 1 extra life**.
Taiko drums 🥁 bounce you super high.

## The Neko Shop 🎩

Spend your fish on **hats** (headband, straw hat, cherry flower, samurai helmet, golden crown),
**katana colors** (ice, sakura, gold, RAINBOW) and **ninja upgrades** (an extra heart, a bigger shuriken bag,
longer smoke bombs). Mochi and Shadow can each wear different things.

## Make your own level!

Open **`ninja-cat/js/levels.js`**. Every level is drawn with letters, seen from above:
one picture says **how tall** the roofs are (`.` street, `1`-`9` roof height, `~` water),
and the other says **what's on them** (`D` dog, `f` fish, `q` bell, `J` drum, `B` bamboo...).
The full list of letters is at the top of the file. Change the letters, save, and reload the page!

You can also change how high the cat jumps, how fast it runs, and more in the `MOVE` list at the top of
**`ninja-cat/js/player.js`**.

Want to see all the 3D models? Open **`ninja-cat/tools/models.html`**.

## Secret test codes

Add these to the end of the address: `?level=3` (start in level 3), `?2p` (2 players), `?god` (nothing can hurt you),
`?all` (unlock every level). For example: `index.html?level=5&god`.

## Files

| File | What's inside |
|---|---|
| `index.html` | the page, the HUD and all the menus |
| `js/levels.js` | the 5 levels, hints and stories (edit me!) |
| `js/world.js` | builds the 3D town from the level pictures, and the walls you bump into |
| `js/player.js` | the cats: running, jumping, climbing, katana, shuriken, smoke bombs and the camera |
| `js/enemies.js` | the dogs, rats, crows, frogs and both bosses |
| `js/items.js` | fish, bells, pots, lanterns, signs, spike traps, searchlights and the gate |
| `js/shots.js` | shuriken, fish bones and fireworks rockets |
| `js/models.js` | all the 3D models (cats, dogs, hats, swords...) |
| `js/textures.js` | roofs, walls, water, the moon... all painted with code |
| `js/fx.js` | sparks, smoke, sword swooshes and fireworks |
| `js/audio.js` | all the music and sounds (made with math, no sound files!) |
| `js/input.js` | keyboard, mouse and controllers |
| `js/hud.js` | hearts, fish, messages and the boss health bar |
| `js/game.js` | the main game loop, levels, shop, saving and menus |

Made by **Emil & Claude** 🐱
