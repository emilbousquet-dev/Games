# KIDS vs VIDEO GAMES 🎮🛡️

A **2D tower defense game** that runs in your web browser.
The video game characters escaped from a giant TV in the schoolyard, and they're coming for **Bill**,
who is hiding in the climbing fort. Put **Mio**, **Nafti** and **Felix** next to the path to stop them!

## How to play

1. Open **`kids-vs-video-games/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Press **PLAY**.
3. Click a kid on the right, then click next to the path to put them there.
4. Press **START WAVE**. Beat all **20 waves** to win, then keep going in **FREEPLAY**!
5. Click a kid on the map to **upgrade** it, **sell** it, or choose who it attacks first.

## Controls

| | |
|---|---|
| Buy a kid | Click a card on the right, or press `1` `2` `3` `4` |
| Put the kid down | Click next to the path |
| Upgrade the selected kid | `U` or the UPGRADE button |
| Start the next wave | `Space` or START WAVE |
| Speed (1x, 2x, 3x) | `F` or the speed button |
| Start waves by themselves | AUTO button |
| Cancel | Right click or `Esc` |
| Pause | `P` |
| Sound on/off | `M` |

## The kids

| Kid | Coins | What they do | Level 2 | Level 3 |
|---|---|---|---|---|
| **Nafti** | 250 | Throws dodgeballs super fast. Can't hit flying enemies. | Double Throw | **Time Watch**: freezes time for every enemy nearby! |
| **Felix** | 350 | Stick fishing rod: hooks enemies and yanks them BACK. | Double Hook | **Big Catch**: catches the strongest enemy and takes it out of the game! |
| **Mio** | 400 | "Shhh!" Magic stick bolts from far away. Puts enemies to sleep. | Sleepy Spell | **Creeper Blast**: every bolt explodes! |
| **ADMIN/EMILE** | 5000 | A flying human with angel wings, a halo and a golden aura who zooms around the WHOLE map shooting lasers, and slams the **BAN HAMMER** that deletes every enemy on screen. Totally overpowered. | **SUPER ADMIN** (7500) | |

## The video game characters

- **Puffy**: a pink puffball. Easy.
- **Plumbo**: a jumping plumber with a big mustache.
- **Spiky**: a blue hedgehog. SUPER fast!
- **Zappy**: an electric mouse that suddenly dashes forward.
- **Boomer**: a green block monster. It **explodes** next to your kids and makes them dizzy!
- **Ghosty**: a maze ghost. It **flies**, so Nafti can't hit it.
- **Wrench & Bolt**: a furry hero with a giant wrench. Beat it and the little robot Bolt keeps walking!
- 🦍 **BIG BANANA APE** (boss, waves 10 and 19): throws barrels at your kids.
- 🐢 **KING SPIKESHELL** (final boss, wave 20): breathes fire and calls his minions.

## Tricks

- You get **bonus coins** at the end of every wave.
- Felix pulling enemies back + Nafti throwing at them = a great team.
- Save up for **ADMIN/EMILE** before the final boss... 😈

## Change the game!

Open **`js/data.js`**. Every number is there: the cost of each kid, how strong the upgrades are,
how tough the enemies are, and what comes in each wave (`'puffy*12'` means 12 Puffies).
Save, and reload the page.

## Files

| File | What's inside |
|---|---|
| `index.html` | the page |
| `js/data.js` | kids, enemies and the 20 waves (edit me!) |
| `js/people.js` | Mio, Nafti, Felix, Bill and ADMIN/EMILE, drawn with code |
| `js/enemies.js` | the video game characters, drawn with code |
| `js/world.js` | the schoolyard map and the path |
| `js/audio.js` | 8-bit sounds and music, made with math |
| `js/game.js` | the rules, the shop, the screens and the main loop |
| `js/util.js` | little drawing helpers |
