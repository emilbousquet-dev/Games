# DRAGON LIFE 🐉🏝️

A **3D game about you and your dragon** that runs in your web browser.

You arrive by boat on the **Ember Isles**. Long ago, people and dragons lived here together...
but all the dragons flew away. Grandma Wren saw something glowing in an old cave.
**Find the dragon egg, hatch it, and raise your very own dragon!**

Then just **live your life**: feed your dragon, play fetch, go fishing, cook, build a house,
and fly to the other islands on your dragon's back. There is a story too, but you don't have
to follow it. 💚

## How to play

1. Open **`dragon-life/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Click **NEW GAME**.
3. Click the game once so the mouse can look around.
4. Turn the sound on! 🔊 The music changes in the day, at night, and when you fly.

## Controls

| Key | What it does |
|---|---|
| `W` `A` `S` `D` | Walk |
| Mouse | Look around (the dragon flies where you look!) |
| `Shift` | Run (or fly fast) |
| `Space` | Jump (or fly up) |
| `C` or `Ctrl` | Fly down |
| `E` | Use: talk to people, **pet your dragon**, pick berries, open chests |
| Mouse click | Use your tool: chop, mine, fish, eat, feed, throw. When you fly: **breathe FIRE!** 🔥 |
| `1` – `6` | Choose a tool: 🪓 axe, ⛏️ pickaxe, 🎣 fishing rod, 🍽️ food, 🦴 fetch stick, 🔨 build |
| `Q` | Choose another food |
| `F` | Ride your dragon / land / call your dragon |
| `G` | Whistle: your dragon comes to you |
| `B` | Build mode |
| `I` | Your bag (and paint your dragon!) |
| `J` | Journal (your goals) |
| `M` | Map |
| Mouse wheel | Zoom the camera in and out |
| `Esc` | Pause |

## Your dragon 🥚 ➜ 🐣 ➜ 🐉 ➜ 🐲

1. **Find the egg** in the glowing cave in the north of Home Island.
2. **Keep it warm**: walk to a campfire with the egg and press `E`. Wait... it wobbles... it hatches!
3. **Pick a color and a name** for your baby dragon.
4. **Take care of it.** Your dragon has 3 bars:
   - 🍖 **Food**: give it fish, berries, or cooked food (choose 🍽️ and click next to it). Dragons LOVE fish!
   - 💗 **Happy**: pet it (`E`), play fetch (🦴, key 5), and stay close.
   - ⭐ **Growing**: fills up when you feed it, pet it and play with it.
5. When it's a **young dragon**, it can carry you for a short flight. When it's **grown-up**, you can fly ANYWHERE!
6. At night your dragon gets sleepy. Build it a **🪺 nest** and it will sleep there.

Nothing bad ever happens. A hungry dragon is just grumpy and won't fly until you feed it.

## Fishing 🎣

Stand on a dock or a beach, choose the fishing rod (key 3), face the water and click.
Wait for the bobber to splash, then **click fast!** Then click when the needle is in the **green part**.
At night you might catch a rare **🐡 Golden Fish**!

## Cooking 🔥

Press `E` at a campfire to cook: grilled fish, berry pie, mushroom soup, and the **Dragon Feast**
(dragons grow up really fast when they eat it!). Wren has a campfire next to her house.

## Building 🔨

Chop trees with the axe 🪓 for wood, and mine rocks with the pickaxe ⛏️ for stone. Then press `B`.

- Start with a **floor**, then put **walls**, **windows** and a **door** on its sides (aim at the side of the square), then a **roof** on top.
- `R` turns things around. `X` (or right click) takes something back down, and you get your wood back.
- Build a **🛏️ bed** to sleep through the night (it saves the game), a **🌱 garden** to grow berries,
  **🏮 lanterns** for the night, and a **🪺 nest** for your dragon.

## The islands 🗺️

| Island | What's there |
|---|---|
| 🏡 **Home Island** | Grandma Wren, the dock, the egg cave, forests and berries |
| 🏘️ **Village Island** (east) | Friendly people: Mila's shop (saddles and dragon paint!), Fisher Finn, Bo the Builder, and Pip |
| 💎 **Crystal Peaks** (north-west) | Huge mountains with glowing crystals at the top |
| 🏛️ **Old Ruins** (west) | An old dragon temple with 4 story stones |
| 🌲 **Misty Forest** (south) | Giant trees, mushrooms, and wild dragons |
| 🌋 **Volcano Isle** (south-east) | Lava, fire dragons, and the Heart of the Volcano |

There are **6 hidden treasure chests**, one on each island. They have coins, saddles and dragon paint!

## The story (if you want it)

Open the journal (`J`) to see your goal. A gold arrow at the top of the screen shows you where to go.
Read the story stones, light the four dragon fires with your dragon's fire breath, and find out
how to bring the dragons home... 🐉🐉🐉

Don't want the goal at the top of the screen? Turn it off in the journal or in **SETTINGS**.

## Saving

The game saves by itself every 30 seconds, and when you sleep in a bed.
Click **CONTINUE** on the title screen to keep playing.

If the game is slow on your computer, choose **Graphics: LOW** in **SETTINGS**.

## Change the game yourself! 🛠️

| Want to... | Open this file | Look for |
|---|---|---|
| Move the islands or make them taller | `js/world.js` | `ISLANDS` |
| Add more trees or rocks | `js/world.js` | `RULES` |
| Add a new food or recipe | `js/items.js` | `ITEMS` and `RECIPES` |
| Add new things to build | `js/build.js` | `PIECES` |
| Change what people say | `js/story.js` | `wrenTalk`, `finnTalk`, `pipTalk`... |
| Change the shop | `js/story.js` | `SHOP` |
| Add a new dragon color | `js/models.js` | `DRAGON_COLORS` |
| Make the day longer | `js/game.js` | `DAY_LENGTH` (in seconds) |

Save the file and reload the page to see your change.

**Secret test mode:** open `index.html?debug` to start with a grown-up dragon and lots of wood and stone. 🤫

## Files

| File | What's inside |
|---|---|
| `index.html` | the page, the menus and how everything looks |
| `js/world.js` | the islands, the sea, the sky, day and night, trees and rocks |
| `js/models.js` | all the 3D models: you, the dragons, people, houses, trees |
| `js/dragon.js` | your dragon's brain: hatching, growing up, following you, flying |
| `js/player.js` | you: walking, swimming, and the camera |
| `js/items.js` | your bag, chopping, mining, fishing and cooking |
| `js/build.js` | building houses |
| `js/story.js` | the story, the people, the shop and the treasure |
| `js/hud.js` | everything on the screen: bars, map, menus |
| `js/audio.js` | music and sounds (made with math, no sound files!) |
| `js/fx.js` | hearts, sparkles, fire and splashes |
| `js/textures.js` | wood, stone, straw and dragon scales, painted with code |
| `js/input.js` | keyboard and mouse |
| `js/game.js` | the main loop, saving, and sleeping |
| `../lib/three.min.js` | [three.js](https://threejs.org), the 3D library |
