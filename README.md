# LAB 13 👽🩸

A **3D co-op survival horror game** that runs in your web browser.
Play **alone** or with a **friend** in split screen, using the keyboard or controllers.

> Kessler Deep Research Facility, Sublevel 13. 900 meters underground. 03:13 AM.
> Two survivors wake up from stasis. Something escaped from Containment.
> Find the keycard. Find the 3 fuses. Power the generator. Reach the surface lift — **together**.

> 🎉 **Also in this folder:**
> - [**Floppy Party**](floppy/README.md): a wobbly ragdoll party game with mini-games, for up to 4 players, also online. Open `floppy/index.html`.
> - [**Spare Parts**](spare-parts/README.md): a funny co-op game where two silly robots throw and swap their arms and legs. Open `spare-parts/index.html`.

## How to play

1. Open **`index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Choose **1 PLAYER** or **2 PLAYERS**.
3. Turn off the lights. Put on headphones. 😱

## Controls

| | Player 1 | Player 2 | 🎮 Controller |
|---|---|---|---|
| Walk | `W` `S` | `↑` `↓` | Left stick |
| Turn | `A` `D` (or click to use the mouse) | `←` `→` | Right stick |
| Side step | `Q` `E` | `,` `.` | Left stick |
| Look up / down | `Z` `X` | `'` `;` | Right stick |
| Run | `Left Shift` | `Right Shift` or `M` | LT |
| Flashlight | `F` | `L` | RB / Y |
| Hit with wrench | `Space` | `Enter` | RT / X |
| Use / Revive | `R` | `/` or `K` | A |
| Throw a flare | `G` | `N` | LB |
| Map | `Tab` or `C` | `\` or `J` | Back / B |
| Pause | `Esc` / `P` | | Start |

In **1 player** mode you can use either side of the keyboard, or a controller.
Press any button on a controller to connect it. On the title screen you can see which player it belongs to.

## The monsters

- **Crawler**: small, fast, and it jumps at you. Three hits with the wrench kill it.
- **Spitter**: a bloated alien with a glowing acid sac. It stays far away and spits acid, so rush it!
  Two hits to kill it.
- **Husk**: an infected scientist with an alien growing out of its head. Slow, but it hits hard.
  Five hits to kill it.
- **Stalker**: 2.7 meters tall and it can't be killed. It has no eyes, but it **hates light**:
  shine your flashlight at it and it **freezes**. Keep it in the light long enough and it runs away.
- **Hanger**: hides on the ceiling with its tongue hanging down. If it grabs you, hit it
  (or get your partner to hit it!).

## Story

Find the **notes** (they are read out loud to you) and listen to **Dr. Okoye** on the radio
to find out what happened in Lab 13... and what is really waiting at the end. 👀

## Lives and checkpoints

On **Normal** you get **2 extra lives** (❤). If you die, you get back up at the last checkpoint
(the keycard, each fuse, and the generator). On **Nightmare** there are no extra lives. ☠
Your fastest escape time is saved as a **record**.

## Co-op tricks

- **2-person locks**: both players must hold the two buttons **at the same time**.
  (In 1 player mode: press one button, then run to the other before the timer runs out!)
- **Revive**: if your partner goes down, hold USE next to them for 3 seconds.
- **Flashlights**: one player holds the Stalker in the light while the other one works.
  Your flashlight drains while it's on and recharges while it's off.
- **Flares**: throw a burning red flare. The Stalker can't come near it for 20 seconds!
  You start with one, and there are more hidden in the lab.
- **Map**: open your map to see the rooms, the doors, where your partner is, and items you've already seen.
  But be careful: the game does NOT pause while you look at it!
- **Graphics**: if the game is slow on your computer, choose **GRAPHICS: LOW** on the title screen.

## Make your own level!

Open **`js/map.js`**. The whole lab is drawn with letters:
`#` is a wall, `.` is floor, `C` is a crawler, `J` is a jump scare, and so on.
Change the letters, save, and reload the page. The list of all letters is at the top of the file.
You can also change the **story notes**, the **words written in blood**, and the order of the **jump scares**.

Want to see all the 3D models? Open **`tools/models.html`**.

## Files

| File | What's inside |
|---|---|
| `index.html` | the page, menus and screen effects |
| `js/map.js` | the level, story notes and scares (edit me!) |
| `js/models.js` | all the 3D models (aliens, people, lab stuff) |
| `js/textures.js` | walls, floors, blood, signs, all painted with code |
| `js/world.js` | builds the 3D lab from the map |
| `js/player.js` | the two players |
| `js/aliens.js` | Crawler, Stalker and Hanger brains |
| `js/scares.js` | the jump scares |
| `js/audio.js` | all the sounds (made with math, no sound files!) |
| `js/game.js` | the main game loop, rules, menus and the ending |
| `lib/three.min.js` | [three.js](https://threejs.org), the 3D library |
