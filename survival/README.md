# DEAD ACRES 🧟🌲

A **3D open-world zombie survival game** that runs in your web browser.
Play **alone**, or **online with up to 3 players**.

> You crashed your car near the little town of Maple Creek. Everyone is gone... or worse.
> Chop trees, craft tools, build a base, find food and water, and survive the nights.
> Find the 3 radio parts, fix the radio tower on Radio Hill, and call the rescue helicopter.

## How to play

1. Open **`survival/dead-acres.html`** in Chrome, Edge or Firefox (just double-click it).
   It's the whole game in ONE file, so it works anywhere, and you can send it to friends.
   (`index.html` works too, but only when the `js` and `lib` folders are next to it.)
2. Type your name and click **NEW WORLD**.
3. Click the game to use the mouse. Put on headphones. 🎧

## Controls

| Key | What it does |
|---|---|
| `W` `A` `S` `D` | Walk |
| Mouse | Look around |
| Left click | Hit, chop, mine, eat, place, shoot (hold to pull the bow) |
| `E` | Search cupboards, pick berries, drink, open doors, cook meat |
| `Space` | Jump |
| `Shift` | Run |
| `C` | Crouch (zombies notice you less) |
| `1`-`6` or mouse wheel | Choose what's in your hand |
| `Tab` | Backpack and crafting |
| `R` | Turn a building piece. **Hold** `R` on your builds to pick them up |
| `Q` | Drop what you're holding |
| `M` | Map |
| `T` | Chat (online) |
| `Esc` | Pause |

A game controller works too: sticks to move and look, RT to hit, A to jump, X to use, Y for the backpack.

## Surviving

- 🍖 **Food** and 💧 **water** go down all the time. If one reaches zero, you start losing health.
  Pick berries, search houses, hunt deer and rabbits (cook the meat on a campfire!),
  and drink from the lake or the river. You can fill empty bottles there too.
- 🌳 **Punch trees** to get your first wood. Then craft a **Stone Axe** and a **Pickaxe**.
- ☀️ A day lasts 8 minutes and a night lasts 4 minutes.
- 🌙 At night there are more zombies and they are faster. Light makes you easier to see.
- ☠️ **Every 5th night a HORDE attacks!**
- 🛏 Build a **Bed**: when you die you wake up there. Your backpack stays where you died, so go and get it back!

## The zombies

- **Walker**: slow and clumsy, but they come in groups.
- **Runner**: comes out at night, and it's FAST.
- **Brute**: big and tough. It hits hard and smashes walls quickly.

## Building a base

Craft walls, doors, floors, stone walls, spike traps, storage boxes, a campfire and a bed.
Hold one in your hand to see a see-through preview: **green** means you can build there, **red** means you can't.
Walls snap to a grid, so it's easy to make a closed room. Zombies bash walls when they're in the way:
press `E` on a damaged piece to repair it.

## Winning

Find the **3 radio parts**. One is in the **police station**, one at the **gas station**
and one in the **hunter's cabin** in the woods. Bring them to the radio tower on **Radio Hill**
and press `E`. Then survive one last, very big night... and get on the helicopter! 🚁

## Playing online with friends

1. The **host** ticks **Let friends join (online)** and clicks NEW WORLD or CONTINUE.
   A **ROOM CODE** (5 letters) appears on the screen.
2. Friends open the game, type the room code in **JOIN A FRIEND** and click **JOIN**.
3. Up to 3 players. The world lives on the host's computer, so it's saved there.
   If a friend comes back with the same name, they get their backpack back.

Everyone needs internet for online games. The game uses the free PeerJS service to connect
the computers directly to each other. Solo games work without internet.

**Friends need the game too.** You can just send them `dead-acres.html` (email, USB stick, chat...).
Everyone needs the **same version** of the game to play together. Another way is to put the game on the web with **GitHub Pages**:
on GitHub, open the repository's **Settings → Pages**, choose **Deploy from a branch**, pick the main branch
and the root folder, and click **Save**. After a minute the game is at
`https://<your-github-name>.github.io/<repository-name>/survival/`.
(GitHub Pages needs the repository to be public.)

## Change the game!

After changing anything, run `python3 make-single-file.py` in the `survival` folder
to update `dead-acres.html` (or just ask Claude to do it).

- **`js/map.js`**: move the town, the houses, the cars, the roads and the lake.
- **`js/items.js`**: change what food does, how strong weapons are, the crafting recipes, and what you find in cupboards.
- **`js/zombies.js`**: at the top, change how fast and strong the zombies are.

## Files

| File | What's inside |
|---|---|
| `dead-acres.html` | the whole game packed into one file (made by `make-single-file.py`) |
| `index.html` | the page, menus and screens |
| `js/map.js` | the world map (edit me!) |
| `js/items.js` | items, crafting and loot (edit me!) |
| `js/world.js` | hills, lake, forests, grass, sky, day and night |
| `js/buildings.js` | houses, the store, police, gas station, barn, cabin, radio tower |
| `js/models.js` | all the 3D models, built from boxes and balls |
| `js/textures.js` | all the textures, painted with code |
| `js/collide.js` | bumping into walls and trees |
| `js/player.js` | you: walking, hunger, thirst, hitting, your hands |
| `js/zombies.js` | zombie and animal brains |
| `js/building.js` | building your base |
| `js/inventory.js` | the backpack and crafting screen |
| `js/net.js` | playing online |
| `js/audio.js` | all the sounds (made with math, no sound files!) |
| `js/game.js` | the main loop, rules, saving and menus |
| `lib/peerjs.min.js` | [PeerJS](https://peerjs.com), for online play |
| `../lib/three.min.js` | [three.js](https://threejs.org), the 3D library |
