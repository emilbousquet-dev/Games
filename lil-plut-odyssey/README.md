# LIL' PLUT ODYSSEY 👶🍼

A **2D story platformer** that runs in your web browser, inspired by **Rayman Legends**.
You play **PLUT**, the most annoying baby in the whole world.

> One night, the grumpy cat **MR. WHISKERS** steals Plut's teddy bear **BOBO** and jumps out of the window.
> Plut climbs out of the crib and goes on an **ODYSSEY** to get him back:
> through the House, the Garden, the Park & Pond, and over the City Rooftops to the big Clock Tower!

## How to play

1. Open **`lil-plut-odyssey/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Click **PLAY** (or press **Enter**), then pick a level on the world map.
3. Turn the sound on: every world has its own song, all made with math! 🎵

## Controls

| | ⌨️ Keyboard | 🎮 Controller |
|---|---|---|
| Run | `←` `→` or `A` `D` | Left stick / D-pad |
| Run faster | hold `Shift` | LT / RT |
| Jump (hold = higher) | `Space`, `↑`, `W` or `Z` | A |
| **Glide** | keep holding jump in the air: Plut spins his blanket like a helicopter! | hold A |
| **Wall jump** | jump at a wall, then jump again to kick off it | A |
| **Slap** (3 in a row = SUPER SLAP) | `X`, `J` or `F` | X or B |
| **Ground pound** | `↓` in the air | down |
| Crawl through small holes | hold `↓` on the ground | down |
| **WAAAH! scream** | `C`, `K` or `E` | Y or RB |
| Pause | `Esc` or `P` | Start |
| Sound on / off | `M` | |

## Plut's moves (like Rayman!)

- **Slap**: slap enemies, slap cages, slap boxes. Slap **cannonballs and peas back** at the one who shot them!
- **Jump on heads**: bounce off enemies' heads. Hold jump to bounce higher.
- **Glide**: hold jump in the air to fall slowly and fly over big gaps.
- **Fans**: glide over a fan and the wind blows you up high!
- **Ground pound**: press down in the air to smash boxes under you.
- **WAAAH!**: the annoying-baby super move. A giant scream that knocks out every enemy around you,
  breaks boxes and makes bosses **DIZZY**. It needs milk power: every milk drop fills the meter (one scream = half the meter).

## Things to find

| | |
|---|---|
| 🥛 **Milk drops** | like Lums in Rayman. Get lots of them for a **bronze, silver or GOLD bottle** at the end. Big bottles are worth 5! |
| 🌟 **Golden bottle** | CHOCOLATE MILK for 10 seconds: every drop counts **x2** |
| 🦆 **Rubber ducks in cages** | 3 hidden in every normal level. Slap the cage to free them! You need ducks to open the next worlds |
| ❤️ **Hearts** | get a heart back. Checkpoints also give you all your hearts back |
| 🍼 **Giant pacifiers** | checkpoints. If you pop, you come back here |

If you lose all your hearts (or fall in water or a hole), Plut floats away in a **bubble** and comes back at the last checkpoint.

## The worlds

1. **The House**: the nursery and the kitchen. Toy soldiers, bouncy balls, toy cannons, LEGO bricks (OUCH!).
   Then RUN from the **SUCKINATOR 3000**, a giant angry vacuum cleaner!
2. **The Garden**: sunflowers, snails, bees, sprinklers and the pond. Boss: **the Garden Gnome**.
3. **The Park & Pond**: sunset, lily pads, crabs, frogs, the playground. Then RUN from the **ANGRY SWAN**!
4. **The City Rooftops**: night, rats, bats, fire hydrants, laundry lines. Final boss: **MR. WHISKERS** on the Clock Tower!

**Boss tip:** bosses can't be hurt normally. Make them **DIZZY** first (scream at them, or wait until they get stuck or tired),
then **SLAP** them!

## Make your own level!

Open **`js/levels.js`**. Every level is drawn with letters:
`#` is ground, `o` is milk, `D` is a duck cage, `e` is an enemy, `S` is a spring, and so on.
The list of all the letters is at the top of the file. Change them, save, and reload the page.

You can also change:
- the **story** in `js/story.js`
- the **songs** in `js/audio.js` (they're written with numbers!)
- how Plut **moves** (jump height, speed, glide...) in `LP.MOVE` at the top of `js/player.js`
- the **colors** of each world in `LP.THEMES` at the top of `js/backgrounds.js`
- the **name of the game** in `LP.TITLE` in `js/util.js`

Tip: add `?level=2-1` to the end of the address to jump straight into a level.

## Files

| File | What's inside |
|---|---|
| `index.html` | the page |
| `js/levels.js` | all 12 levels, drawn with letters (edit me!) |
| `js/story.js` | the story and its comic pictures (edit me!) |
| `js/player.js` | Plut and all his moves |
| `js/enemies.js` | enemies, things to pick up, chasers and bosses |
| `js/art.js` | drawing Plut, the enemies, bosses and items |
| `js/backgrounds.js` | the 4 worlds: colors, skies and background layers |
| `js/terrain.js` | painting the ground, platforms, boxes and spikes |
| `js/fx.js` | sparkles, dust, confetti, the scream waves |
| `js/hud.js` | hearts, milk counter, scream meter, signs |
| `js/screens.js` | title screen, world map, story, pause and level complete |
| `js/audio.js` | all the sounds and songs (made with math, no sound files!) |
| `js/input.js` | keyboard and controllers |
| `js/level.js` | turns the letter maps into levels and makes things bump into walls |
| `js/game.js` | the main loop, the camera and saving your progress |
