# FLOPPY PARTY 🎉🤸

A **wobbly ragdoll party game** for 1 to 4 players, in a cute cartoon style.
Punch, grab and throw your friends around in silly mini-games!
Play on **one computer** (2 players on the keyboard + controllers + bots) or **online** with a room code.

## How to play

1. Open **`index.html`** in Chrome, Edge or Firefox.
2. Click **Play on this computer**, or **Play online with friends**.
3. In the lobby, more players join by pressing their **jump** button. Add bots to fill the empty spots.
4. Press **Enter** (or click) to pick a mini-game!

## Controls

| | Player 1 | Player 2 | 🎮 Controller |
|---|---|---|---|
| Move | `W` `A` `S` `D` | Arrows | Left stick |
| Jump | `Space` | `/` | A |
| Punch | `F` | `.` | X or B |
| Grab (hold) | `G` | `,` | RT / RB |
| Color / hat (lobby) | `Z` / `X` | `K` / `L` | Back / Y |

`H` help · `Esc` pause · `M` music on/off

- **Punch** someone 3 times quickly to **knock them out**. They go completely floppy!
- **Hold grab** to grab someone (or something). Walk, then **let go to throw**. Thrown people fly and flop!
- Grabbed? **Mash jump** to wriggle free.
- You can grab **edges and walls** to hang on.
- Holding grab also makes you lean forward and sweep your arms, so you can pick things up off the floor.

## Mini-games

| | |
|---|---|
| 🥊 **Knockout Arena** | A floating platform made of tiles that start falling. Knock everyone off! Last one standing wins the round. First to 3 wins. |
| ⚽ **Ragdoll Soccer** | Red team vs Blue team with a giant bouncy ball. Push it, punch it, headbutt it. First to 3 goals. Bots fill the teams. |
| 💎 **The Heist** | Everyone on one team: carry treasure from the museum to the getaway van. The diamond is HEAVY, so carry it together! Guards with flashlights chase you, lasers zap you. You can punch the guards... |

## Playing online 🌍

One person clicks **Play online → Host a party** and gets a **4-letter room code**.
Friends open the game, click **Play online**, type their name and the code, and click **Join**.
The host's computer runs the game; friends send their button presses and see everything live.
Up to 4 players in total (the host can also have a friend on the same keyboard, and bots).

Online play needs the game on a real website. The free way is **GitHub Pages**
(the repository owner does this once):

1. On GitHub, open the repository → **Settings** → **Pages**.
2. Under **Build and deployment**, pick **Deploy from a branch**, choose the branch (for example `main`) and the `/ (root)` folder, and click **Save**.
3. After a minute, the game is at `https://<your-user-name>.github.io/<repository-name>/floppy/`.
4. Send that link to your friends!

Online play uses the free [PeerJS](https://peerjs.com/) connection service to find each other.

## Made with

Plain HTML and JavaScript: [three.js](https://threejs.org/) for 3D (in `../lib`),
[cannon-es](https://github.com/pmndrs/cannon-es) for physics and [PeerJS](https://peerjs.com/) for online play (in `lib/`).
All sounds and music are made with code.

| File | What it does |
|---|---|
| `js/game.js` | Title, lobby, picking mini-games, rounds, scores, results |
| `js/ragdoll.js` | The floppy characters: 6 physics pieces + "muscles", punching, grabbing, knockouts |
| `js/look.js` | The cartoon look: toon shading, outlines, characters, hats, trees, clouds |
| `js/modes/*.js` | The mini-games: Knockout Arena, Ragdoll Soccer, The Heist |
| `js/bots.js` | Computer players |
| `js/net.js` | Online play with room codes |
| `js/physics.js` | The physics world |
| `js/stage.js` | Sky, sunshine, clouds, building levels |
| `js/fx.js` | POW! pop-ups, stars, dust, confetti |
| `js/audio.js` | Sounds and music |
| `js/ui.js` | Menus and on-screen text |
| `js/camera.js` | Camera that follows everyone and shakes on big hits |
| `js/input.js` | Keyboard and controllers |
