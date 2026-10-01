# JETPACK CITY 🦊🤖🪐

A **3D endless runner for phones** (it works on computers too!).
Run as **Ratchet** with **Clank** on your back, across **5 planets**, in a bright cartoon style.
**MEGA-BOT**, a 13 meter tall robot, is stomping after you. Don't let it catch you!

> This is a **private fan game**, made just for fun.
> Ratchet, Clank and their planets belong to Sony and Insomniac Games. Please don't sell it or post it publicly.

## How to play

- **On a phone:** open the game link and tap **PLAY**.
  Tip: tap **Share → Add to Home Screen** (iPhone) or **⋮ → Add to Home screen** (Android)
  so the game gets its own icon, like a real app!
- **On a computer:** open **`jetpack-city/index.html`** in Chrome, Edge or Firefox (just double-click it).

## Controls

| | 📱 Phone | ⌨️ Keyboard |
|---|---|---|
| Change lanes | Swipe ⬅ ➡ | `←` `→` or `A` `D` |
| Heli-Pack hop | Swipe ⬆ (or tap) | `↑`, `W` or `Space` |
| Slide | Swipe ⬇ | `↓` or `S` |
| Pause | ❚❚ button | `Esc` or `P` |

Swipe down while you're in the air to drop down fast!

## Ratchet & Clank

- **Swipe up** and Clank's **Heli-Pack** propellers pop out, so Ratchet hops over things.
- Grab a 🚀 and Clank's **Thruster-Pack** fires up, so you fly high above everything!
- Ratchet always carries his **OmniWrench**. 🔧

## The planets

Every 720 meters you run through a glowing **warp gate** to the next planet:

| Planet | What it looks like |
|---|---|
| **Veldin** | Ratchet's home: orange desert canyons, cacti and rock arches |
| **Metropolis** | a city in the sky with tall towers, flying cars and floating gardens |
| **Pokitaru** | a wooden boardwalk over turquoise water, with palm trees and beach huts |
| **Grelbin** | a frozen moon with ice crystals, snow domes and a starry sky |
| **Gaspar** | a volcano planet with rivers of lava |

After Gaspar you warp back to Veldin, and it keeps getting faster!

## What's on the road

- 🔩 **Bolts**: grab them! Spend them in the **Garage**.
- 🚧 **Barriers**: hop over them.
- 🔴 **Laser gates**: slide under them.
- 🕳️ **Holes**: hop over them (if you fall in, Clank pops you out, but it counts as a bump).
- 🚆 **Parked trains**: go around them, or run up a **ramp** and run on top of them!
- 🚨 **Moving trains** (red, with flashing lights): they drive straight at you. GET OUT OF THE WAY!

## MEGA-BOT

You only hear MEGA-BOT stomping far behind you... until you **bump into something**.
Then it catches up and reaches for you with its giant hand! 😱
The 🤖 meter at the top shows how close it is.
If you bump into something again while it's close, **it grabs you** and the run is over.
Crash straight into the front of a train and it's over too.

## Power-ups

| | What it does |
|---|---|
| 🛡️ **Shield** | Saves you from one crash, even a train! |
| 🧲 **Magnet** | Pulls in all the bolts around you for 10 seconds |
| 🚀 **Thruster-Pack** | Fly high above everything and grab a trail of bolts for 6 seconds |

## The Garage

Spend your bolts on **Clank paint** (Golden Clank, Red Alert, Stealth Clank, Rainbow Clank...)
and **Ratchet outfits** (Hoverboard Racer, Space Explorer, Snow Lombax, Holo Armor...).

## Change the game!

Open **`js/map.js`**. You can change:
- how **fast** the game is, how high you hop, and how long power-ups last,
- the **level pieces**: the road is built from little maps made of letters,
  like `B` for barrier, `L` for laser, `T` for train and `o` for a bolt. **Draw your own!**
- the **planets**: their names, sky colors, roads and how long each one is,
- the **garage items** and their colors and prices,
- what **MEGA-BOT shouts** and the words on the **neon signs**.

Save the file and reload the page to see your changes.
If the game is slow on your phone, tap **✨ PRETTY** on the title screen to switch to **⚡ FAST**.

## Files

| File | What's inside |
|---|---|
| `index.html` | the page, menus, buttons and HUD |
| `js/map.js` | all the settings and level pieces (edit me!) |
| `js/input.js` | swipes, taps and the keyboard |
| `js/models.js` | every 3D model: Ratchet, Clank, MEGA-BOT, trains, bolts, and each planet's scenery |
| `js/textures.js` | windows, neon signs, the road and the sky, all painted with code |
| `js/world.js` | builds the endless road, the planets and the warp gates |
| `js/player.js` | running, hopping, sliding, flying and bumping into things |
| `js/chaser.js` | MEGA-BOT's brain: stomping, reaching and grabbing |
| `js/hud.js` | score, bolts, the MEGA-BOT meter and the menus |
| `js/audio.js` | music and sounds (made with math, no sound files!) |
| `js/game.js` | the main loop, the camera, the garage and game over |
