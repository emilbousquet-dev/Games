# STARFALL 🌠👽

A **3D open world adventure** on an alien planet, a bit like Zelda. It runs in your web browser.

> Your spaceship crashed on **Veyra**, a glowing planet with two moons.
> A little alien called **Zib** finds you and wants to help.
> Your ship is missing **4 parts**. They are hidden in 4 ancient **temples**, guarded by giant **bosses**.
> Every temple also gives you a **new power**, so you can reach places you couldn't reach before!

## How to play

1. Open **`starfall/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Type your name and press **START ADVENTURE**.
3. Follow the ★ star on your map and the little star shards on the ground!

Your game is **saved automatically** (every 20 seconds, at every beacon, and when you quit).
Press **CONTINUE** on the title screen to keep playing.

## Controls

| | Keyboard + mouse | 🎮 Controller |
|---|---|---|
| Move | `W` `A` `S` `D` | Left stick |
| Look around | Mouse (click the game first), or the arrow keys | Right stick |
| Jump / glide / double jump | `Space` | A |
| Sword | Left click | X |
| Shield (block) | Right click (hold) | LT |
| Bow: aim, then shoot | Hold `Q`, then click | Hold LB, press RT |
| Run | `Shift` | B |
| Talk / open / use | `E` | Y |
| Talk to Zib | `E` when nothing is around | Y |
| Map | `M` or `Tab` | Back |
| Pause | `Esc` | Start |

Tip: when you swing your sword, your astronaut turns toward the closest enemy by itself.

## The world

| Region | What's there |
|---|---|
| **Glow Jungle** (south) | Blue trees, giant glowing mushrooms, rivers, your crashed ship and **Zibville** |
| **Violet Plains** (middle) | Purple grass, lollipop trees, fluffy **Floofs** hopping around |
| **Crystal Desert** (west) | Pink sand, huge crystals, and a temple on top of a cliff |
| **Frozen Peaks** (north) | Snowy mountains and ice pines |
| **Lava Rift** (east) | A giant ring of cliffs full of lava. The last temple is on the island in the middle! |

Giant jellyfish float in the sky. At night the plants glow, and more monsters come out...

## The temples and powers

| Temple | How to get in | Boss | You get |
|---|---|---|---|
| **Temple of Roots** (jungle) | Hit the 3 rune stones with your sword, quickly! | **Thornmaw**: after its vines slam 3 times it gets tired. Hit its open mouth! | 🪽 **Glider wings** |
| **Temple of Sands** (desert) | It's on a cliff! Climb the big hill and **glide** over | **Sandwyrm**: make it crash into a pillar, then hit its head | 🏹 **Plasma bow** |
| **Temple of Frost** (mountains) | Shoot the 3 crystals on the ice pillars with your **bow** | **Frost Colossus**: shoot its red eye to knock it down | 🚀 **Jet boots** (double jump) |
| **Temple of Embers** (lava) | **Double jump** up the stone pillars, then glide into the rift | **The Ember King**: shoot its eye, jump over the fire rings | The last ship part! |

Each boss also gives you **+1 heart**. When you have all 4 parts, go back to your ship... 🚀

## Monsters

- **Gloop**: a bouncy slime. Easy!
- **Spinecrab**: armor on its face. Hit it from **behind**, or right after it lunges.
- **Zapwing**: flies and shoots lightning. Block with your shield, or use your bow.
- **Rock Golem**: big and slow. Its weak spot is the glowing crystal on its **back**.

## Things to find

- ✦ **Star shards**: spend them at **Mo's shop** in Zibville (more hearts, more energy, a stronger sword).
- 📦 **Chests**: on towers, cliffs, mountain tops, floating rocks...
- ♥ **Heart pieces**: 4 pieces make a new heart. Find them in chests and by solving **puzzles**:
  rune stones, ring races and crystal targets.
- ▲ **Signal towers**: climb the spiral stairs and activate the top to reveal the map.
- ◆ **Beacons**: they save your game, heal you, and let you **fast travel**.

## Change the world!

Open **`starfall/js/layout.js`**. Everything that is placed on the planet is listed there:
the temples, towers, beacons, rivers, the shop prices, and even the **seed** that shapes the island.
Change a number, save, and reload the page.

Want to change what Zib and the villagers say? Look in **`starfall/js/story.js`**.

If the game is slow on your computer, choose **GRAPHICS: LOW** on the title screen.

## Files

| File | What's inside |
|---|---|
| `index.html` | the page, title screen, menus and screen layout |
| `js/layout.js` | where everything is on the planet (edit me!) |
| `js/terrain.js` | the hills, mountains, rivers, sea and lava |
| `js/nature.js` | thousands of alien plants, rocks and crystals |
| `js/sky.js` | day and night, the sun, two moons, stars and sky jellyfish |
| `js/models.js` | all the 3D models, made from simple shapes |
| `js/player.js` | the astronaut: moving, gliding, fighting, and the camera |
| `js/creatures.js` | monsters, bosses, floofs, arrows and magic balls |
| `js/world.js` | temples, towers, beacons, chests, shards and puzzles |
| `js/story.js` | Zib, the villagers, the shop and the ending |
| `js/hud.js` | hearts, map, messages and menus on the screen |
| `js/audio.js` | music and sounds (made with math, no sound files!) |
| `js/game.js` | the main game loop and saving |
| `../lib/three.min.js` | [three.js](https://threejs.org), the 3D library |
