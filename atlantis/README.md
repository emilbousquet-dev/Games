# ATLANTIS DIVER 🔱🤿

A **2D treasure-diving game** that runs in your web browser.
Dive from your boat into the lost city of **Atlantis**, grab treasure before your air runs out,
sell it, buy better gear, and go deeper, all the way to the **Trident of Poseidon**.

## How to play

1. Open **`atlantis/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Press **New Game**.
3. Swim down, grab treasure, and come back up to the boat before your **air** runs out!

## Controls

| | Keyboard | 🎮 Controller |
|---|---|---|
| Swim | `W` `A` `S` `D` or arrows | Left stick |
| Boost (uses more air!) | `Shift` | LT / LB |
| Stun harpoon | `Space` | RT / X |
| Open the shop (at the boat) | `E` | A |
| Map | `M` or `Tab` | Back |
| Journal | `Q` | Y |
| Pause | `Esc` or `P` | Start |

### 📱 On a phone or tablet

It works on phones too, held upright or sideways!

- **Swim:** touch the left side of the screen and slide your thumb. A joystick appears under it.
- **🔱 Harpoon** and **⚡ Boost** are the big buttons on the right.
- **✋ Shop** appears when you're next to the boat.
- The small buttons open the **🗺️ map**, the **📖 journal**, **⏸ pause** and **⛶ full screen**.
- Phones start on **Graphics: LOW** so the game runs smoothly. You can switch to HIGH on the title screen.

## The five zones

| Depth | Zone | What's there |
|---|---|---|
| 0–60 m | **Sunlit Shallows** | coral, turtles, clownfish, the first broken columns |
| 60–160 m | **Outer Ruins** | white marble temples, statues, kelp, jellyfish, crabs |
| 160–300 m | **Golden Streets** | golden houses, a palace, eels and pufferfish |
| 300–450 m | **Temple of Poseidon** | a giant statue, glowing runes, sharks and anglerfish |
| 450–600 m | **Heart of Atlantis** | glowing crystals and the **Guardian Sea Serpent** |

Your **diving suit** only keeps you safe down to a certain depth. Go deeper and your air drains super fast!
Upgrade the suit at the shop to reach the next zone.

## Tips

- Treasure is worth **more** the deeper you find it.
- Coins and pearls **grow back** after every dive.
- If you run out of air, a **friendly dolphin** brings you back to the boat, but you lose what's in your bag.
- Some walls have **cracks**. Shoot them with the harpoon to find **secret rooms**!
- Find all **12 stone tablets** to learn the whole story of Atlantis.
- Swim close to creatures to add them to your **journal**.
- The **Guardian Serpent** is too strong to fight. Stun it with the harpoon, then swim past quickly!
- The game **saves by itself**. Press **Continue** next time.

## Make your own Atlantis!

Open **`atlantis/js/map.js`**. The whole city is drawn with letters:
`#` is rock, `B` is marble, `$` is gold coins, `j` is a jellyfish, `!` is a story tablet, and so on.
The list of all the letters is at the top of the file. Every line must have exactly 48 letters.
You can also change the **story on the tablets** and how much each **treasure** is worth.

The shop prices and upgrades are at the top of **`atlantis/js/shop.js`**.

## Files

| File | What's inside |
|---|---|
| `index.html` | the page, the menus, the shop and the journal |
| `js/map.js` | the city, the story tablets, the treasure values (edit me!) |
| `js/art.js` | stone textures, columns, statues, coral, crystals, treasure, all painted with code |
| `js/world.js` | builds the city from the map, walls and collisions |
| `js/render.js` | sky, waves, light rays, the far-away city, darkness and lights, bubbles |
| `js/diver.js` | you! swimming, air and the harpoon |
| `js/creatures.js` | all the sea creatures and the Guardian Serpent |
| `js/shop.js` | upgrades, prices and saving |
| `js/hud.js` | air gauge, depth, gold, bag, map |
| `js/audio.js` | all the sounds and music (made with math, no sound files!) |
| `js/main.js` | the main game: camera, treasure, boat, rescue and the ending |

For testing: `index.html?play` starts right away, `?depth=300` starts at 300 m, `?max` gives every upgrade,
`?gold=5000` gives you gold, and `?low` uses low graphics.
