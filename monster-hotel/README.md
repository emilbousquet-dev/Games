# MONSTER HOTEL 🧛🏨

A **3D first-person hotel game** that runs in your web browser.
You are the **boss** of Hotel Monstrania, the spookiest hotel in the world.
Keep every monster happy... or the hotel gets **closed down**!

## How to play

1. Open **`monster-hotel/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Press **PLAY** and **choose your boss**.
3. Click the game so the mouse controls the camera.

## Controls

| | Keyboard / mouse | 🎮 Controller |
|---|---|---|
| Walk | `W` `A` `S` `D` (or arrows, or `Z` `Q` `S` `D`) | Left stick |
| Look around | Mouse | Right stick |
| Run | `Shift` | RT |
| Use / give / check in / talk | `E` or left click | A |
| Clean a mess | **hold** `E` | hold A |
| Boss power | `Space` | X or RB |
| Drop what you carry | `G` | B |
| Pause | `Esc` | Start |
| Sound on/off | `M` | |

## Your job

- 🛎️ **Check in** guests at the front desk: look at them and press `E`.
- 🍹 Guests ask for things. Food is in the **Kitchen**, and towels, bandages and lightning jars are in the **Supplies** room (both at the end of the hallway).
- 🧹 When a guest leaves, their room gets **dirty** (orange lamp above the door). Hold `E` on the mess to clean it.
- 🌧️ **Storms** blow windows open. Close them before the guest freezes!
- 😱 **Humans** sneak in and scare the guests. Walk up to them and press `E` to go **BOO!**
- ⭐ Happy guests leave **5-star reviews** when they leave. Grumpy ones leave 1 star.
  If your **Hotel Rating** drops below **1.5 stars**, the hotel is closed!
- 🌙 Survive until **6 AM** (sunrise). Storms start on Night 2, humans on Night 4, and new monsters keep arriving, but slowly. Take your time!

Room lamps: 🟢 free and clean · 🔴 a guest is staying · 🟠 dirty, clean it!

## The bosses

| Boss | Power |
|---|---|
| 🧛 **Count Fangsworth** (Vampire) | **BAT FORM**: zoom through the hotel super fast |
| 🐺 **Wolfina Moonhowl** (Werewolf) | Runs faster. **SCARY HOWL** scares every human out |
| 🧻 **King Tuttlewrap** (Mummy) | **SAND OF TIME**: nobody gets grumpy for 8 seconds |
| ⚡ **Dr. Bolts** (Monster) | Carries **2 things** at once. **THUNDER ZAP** cleans a whole room |

## The guests

| Monster | Loves | First night |
|---|---|---|
| Vampires | Blood Smoothies, towels | 1 |
| Werewolves | Giant Bones, towels, **belly rubs** | 1 |
| Mummies | Fresh Bandages, Bug Soup | 3 |
| Ghosts | Ecto-Jelly, towels | 4 |
| Big Monsters | Lightning Jars, Bug Soup | 5 |
| Blobs | Bug Soup, Ecto-Jelly | 6 |

## Change the game!

Open **`js/map.js`**. You can change:
- the **hotel map** (every letter is one square: `#` wall, `L` lobby, `1`-`8` rooms, `k` kitchen station...),
- the **monster names** and what they like,
- how **hard** each night is,
- the **reviews** the guests write,
- the **boss names** and powers.

Save the file and reload the page to see your changes.

Want to see all the 3D models? Open **`tools/models.html`**.
If the game is slow, choose **GRAPHICS: FAST** on the title screen.

## Files

| File | What's inside |
|---|---|
| `index.html` | the page, menus and HUD look |
| `js/map.js` | the map and all the settings (edit me!) |
| `js/models.js` | every 3D model: monsters, hands, food, furniture |
| `js/textures.js` | walls, floors, carpets, portraits and icons, all painted with code |
| `js/world.js` | builds the hotel, lights, doors, windows and storms |
| `js/guests.js` | how guests think: arriving, asking, happiness, reviews, humans |
| `js/player.js` | you, the boss, in first person |
| `js/hud.js` | stars, clock, task list, minimap, reviews |
| `js/audio.js` | music and sounds (made with math, no sound files!) |
| `js/game.js` | the nights, rules, powers and menus |
