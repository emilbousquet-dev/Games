# SIGMA RUN Σ🏃‍♂️🚁

A **3D first-person parkour runner** that runs in your web browser.
Run across the rooftops of a giant city at sunset, **run on walls**, slide, vault, ride ziplines,
and get away from the **FBI**: agents, a helicopter that fires missiles, and attack drones!
Grab a **rocket launcher** and shoot the helicopter down. 🚀💥

## How to play

1. Open **`sigma-run/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Click **PLAY** (or press **Enter**).
3. Put the sound on: the music gets crazier when the FBI is after you. 🔊

The first run has a **tutorial**: messages at the bottom of the screen show you every move.

## AUTO PARKOUR (the normal way to play)

Like **Rooftop Run**: your runner runs, jumps, climbs, wall runs, slides under things, slide-tackles FBI agents
and grabs ziplines **all by himself**. You just:

- **Steer**: move the mouse left and right (or slide your finger anywhere on the screen, or `A` `D` / `←` `→`).
  Grab coins and get away from the missiles!
- Press the big **🚀 ROCKET** button (or click, or `F`) to shoot the helicopter.
- Press the big **Σ SIGMA** button (or `E`) when the Σ bar is full.

Want to do every move yourself? Pick **MANUAL** controls in **SETTINGS**. The table below is for MANUAL controls.

## Music

Pick the song in **SETTINGS** (or with the **♪ MUSIC** button in the pause menu):
**SKYLINE** (upbeat electronic), **SIGMA PHONK** (cowbells and 808 bass), or **OFF**.

## Manual controls

| | ⌨️🖱️ Computer | 🎮 Controller | 📱 Phone |
|---|---|---|---|
| Run | automatic! (hold `S` to stop) | automatic | automatic |
| Steer | **mouse**, `A` `D`, or `←` `→` | sticks | left thumb moves, right thumb looks |
| Jump | `Space` | A | JUMP button |
| Slide | `Shift` or `C` | B | SLIDE button |
| Fire a rocket | `Left click` or `F` | RT | 🚀 button |
| SIGMA MODE | `E` or `Right click` | Y | SIGMA button |
| Pause | `Esc` or `P` | Start | ❚❚ button |
| Sound on/off | `M` | | |

## Parkour moves

- **Wall run**: jump next to a wall (like the giant billboards) and you run along it!
  Press **jump** again to kick off the wall. Some gaps have **two walls**: wall run, jump to the other wall, wall run again!
- **Vault**: run at small things (air conditioners, low walls) and you hop over them by yourself.
- **Ledge grab**: jump at an edge that's too high and you climb up by yourself.
- **Slide**: slide under pipes and signs. If you forget, you duck under them by yourself.
- **Roll**: land from a big fall and you do a roll, so you keep your speed.
- **Zipline**: run under the cable and you grab it.
- **Launch pad**: step on the glowing pad and it throws you across a giant gap!
- **Crane beam**: balance across a narrow yellow beam. Don't fall!
- **Glass**: run through glass walls to SMASH them. 💥

## AURA and SIGMA MODE

Your score is **AURA**. You get aura for running, and **lots** of aura for tricks
(wall runs, wall jumps, vaults, rolls, smashing glass, near misses, stomping agents...).
Do tricks quickly one after another to get a **combo** (x2, x3, x4, x5)!

Tricks also fill the **Σ bar** on the left. When it's full, press **E**:
**SIGMA MODE** makes the world go black and white and gold, everything slows down,
you can't be hurt, the FBI bounces off you, and you get **double aura**. 🗿

## Power-ups

| | |
|---|---|
| ⚡ **Speed boost** | run super fast and knock agents over |
| 🧲 **Coin magnet** | coins fly to you |
| 🛡️ **Shield** | blocks one hit |
| 🚀 **Rocket launcher** | 3 rockets that fly to the helicopter by themselves. 3 hits = **HELICOPTER DOWN!** |
| 👟 **Super jump** | jump higher and jump again in the air |
| **x2** | every coin counts twice |
| ❤️ **Heart** | get back a heart you lost |

## The FBI (wanted stars ★)

The further you run, the more the FBI wants you:

| | |
|---|---|
| ★ | **FBI agents** jump out on the roofs. Slide into them, or jump on their heads to **STOMP** them! |
| ★★ | a **helicopter** with a searchlight follows you |
| ★★★ | the helicopter fires **missiles**. Get away from the **red rings**! |
| ★★★★ | **attack drones** dive at you. Move out of the way! |
| ★★★★★ | everything, faster! |

You have **3 hearts** ❤️. Getting hit or falling off a roof costs one heart.
When you lose them all: **BUSTED!**

The sun sets while you run: the further you get, the darker it gets, until it's a **neon night**. 🌃

## The shop

Coins are saved. Spend them in the **SHOP** on upgrades (longer power-ups, extra hearts,
start with rockets or a shield) and on cool **gloves** (Fire, Neon, Agent, Gold Sigma, Diamond).

## Graphics

If the game is slow, open **SETTINGS** and pick **LOW** or **MEDIUM**.
On a strong computer, try **ULTRA**! The game also lowers the picture sharpness by itself if it gets slow.

## Make it your own!

- **`js/level.js`**: change `WEIGHTS` at the top to get more wall runs, ziplines or launch pads.
- **`js/textures.js`**: change the funny billboard ads (look for `ADS`).
- **`js/fbi.js`**: change what the agents shout (look for `SAY`).
- **`js/game.js`**: change when the wanted stars come (`WANTED_AT`), and the shop prices.

## Files

| File | What's inside |
|---|---|
| `index.html` | the page, menus, HUD and the shop |
| `js/game.js` | the main loop, aura, sigma mode, hearts, wanted stars, shop, menus |
| `js/player.js` | running, jumping, wall runs, slides, vaults, ziplines, and your arms |
| `js/auto.js` | AUTO PARKOUR: does all the moves for you while you steer |
| `js/level.js` | builds the city course forever: roofs, gaps, walls, ziplines, pads, cranes |
| `js/city.js` | the skyline, traffic far below, and the FBI cars |
| `js/fbi.js` | agents, the helicopter, missiles, drones and your rockets |
| `js/pickups.js` | coins and power-ups |
| `js/env.js` | the sky, the sun, clouds, stars and the sunset-to-night change |
| `js/post.js` | screen effects: glow, speed blur, sigma mode colors |
| `js/fx.js` | explosions, smoke, sparks and glass |
| `js/textures.js` | every picture, painted with code |
| `js/mats.js` | what everything is made of (glass, metal, concrete...) |
| `js/audio.js` | the two songs and all the sounds (made with math, no sound files!) |
| `js/input.js` | keyboard, mouse, controller and touch |
| `js/hud.js` | the numbers and icons on the screen |
