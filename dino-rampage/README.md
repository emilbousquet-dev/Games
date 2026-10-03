# DINO RAMPAGE 🦖💥

A **3D stomping game** that runs in your web browser.
You are a tiny **baby T-Rex** in a big city. Eat snacks, smash stuff,
and grow bigger and bigger... until you're a **GIANT**!

## How to play

1. Open **`dino-rampage/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Press **PLAY!** and pick a city.
3. Click the game so the mouse controls the camera.

## Controls

| | Keyboard / mouse | 🎮 Controller |
|---|---|---|
| Walk | `W` `A` `S` `D` (or arrows) | Left stick |
| Look around | Mouse (or `J` `L`) | Right stick |
| Run | `Shift` | RT |
| Jump | `Space` | A |
| Bite / eat | Left click or `E` | X or RB |
| Tail whip (spin!) | Right click or `Q` | B or LB |
| **Belly flop** | `Space`, then click while in the air | A, then X |
| **SUPER ROAR** | `R` (when the orange circle is full) | Y |
| Pause | `Esc` | Start |
| Sound on/off | `M` | |

## 📱 On a phone or tablet

Touch controls appear by themselves. Turn your phone sideways for the best view!
Press **⛶ FULL SCREEN** on the title screen to fill the whole screen.

| | Touch |
|---|---|
| Walk | Put your **left thumb** anywhere on the left side: a joystick appears. Push it far to **run** |
| Look around | Swipe with your **right thumb** |
| Bite | 🦷 **BITE** button |
| Tail whip | 🌀 **TAIL** button |
| Jump / belly flop | ⬆️ **JUMP** button (tap it again in the air for a belly flop) |
| Super Roar | 🦖 **ROAR** button (it fills up like the orange circle) |
| Pause | ⏸ button |

Phones start with **GRAPHICS: FAST** so the game runs smoothly.

## Growing up

Walk into things to **smash** them. Eat the **sparkly snacks** 🍉🍩🍕🍦 to grow extra fast
(the pink dots on the mini-map are snacks!). Every time you grow, you can smash bigger things:

| Size | You can smash |
|---|---|
| 🥚 Baby | fences, bushes, mailboxes, garden gnomes, snacks |
| 🦖 Little | cars, trees, lamp posts, hot dog carts |
| 🦖 Big | houses, buses, trucks, ice cream trucks |
| 🦖 Huge | shops, apartments, water towers, burger restaurants |
| 🦖 **GIANT** | **skyscrapers**, hotels, lighthouses, the Ferris wheel! |

Things that are too big go **BOING**! Grow first.
When you're a GIANT, fill the **RAMPAGE** bar to win the level.

- **Combos**: smash lots of things quickly to multiply your points (up to x10).
- **SUPER ROAR**: the orange circle fills up when you smash and eat. When it's full, press `R`:
  everything small enough around you goes FLYING!
- People think the baby dino is cute... but when you get bigger they RUN! (Don't worry,
  nobody gets hurt: they just tumble, say something silly and get back up.)

## The cities

| City | What's there |
|---|---|
| 🏡 **Sleepy Suburbs** | houses, gardens, picnics, a park with a fountain, a little downtown |
| 🏙️ **Downtown** | skyscrapers everywhere, shops, parking lots, busy streets |
| 🎡 **Beach Boardwalk** | the beach, a fair with a Ferris wheel (smash it and it ROLLS away!), hotels, a lighthouse |
| 🚁 **Army Base** | a town next to an army base: hangars, barracks, a control tower, tanks... and army pudding |

Finish a city to unlock the next one. Finish fast to get ⭐⭐⭐!

## 🚁 The army

In **Downtown** and **Beach Boardwalk**, the army shows up once you're a Big dino.
In the **Army Base** city they come even sooner, with more tanks and helicopters!

| Vehicle | Shoots | Smash it when you're |
|---|---|---|
| 🚙 Jeep | orange paintballs | Little |
| 🪖 Tank | shells that fly in an arc (dodge them!) | Big |
| 🚁 Helicopter | rockets. It flies high, so **jump** or **bite** it! | Huge |

When the army hits you, your **❤️ health** goes down. If it runs out, you get **DIZZY** 💫
and shrink a little. Eat snacks to heal! The **SUPER ROAR** smashes small vehicles and stuns big ones.

## 🕵️ The FBI

FBI agents in black suits follow the dino around and say very serious things,
like *"This is the FBI. You have the right to remain... HUGE."*
Listen to the **📻 radio** at the top of the screen for messages from FBI HQ and the army.

## 🥚 The secret (spoilers!)

<details><summary>Click to see the secret</summary>

Every city has a **TOTALLY NORMAL BAKERY**. It's pink, it has a croissant on the roof...
and a giant satellite dish. It's really a secret FBI base!
Smash it (you need to be a Big dino) to find the **GOLDEN EGG**:

- 🌈 **RAINBOW POWER** for 25 seconds: run faster, smash things one size bigger, and nothing can hurt you
- 🤖 The first time: unlock the **Robo Rex** skin
- 🕵️ Find the bakery in **all 4 cities**: unlock the **FBI Agent Hat**

</details>

## The Dino Closet 🎩

Stars unlock new looks for your dino:

- **Skins**: Classic Green, Bubblegum Pink, Tiger Blue ⭐1, Zombie Dino ⭐3, Golden King ⭐5, Rainbow Rex ⭐7
- **Hats**: Party Hat, Cool Shades ⭐1, Cowboy Hat ⭐2, Propeller Cap ⭐3, Chef Hat ⭐4, Flower Crown ⭐5, Royal Crown ⭐6
- **Secret**: two more things you can only get by finding the secret... 🤫

People notice your hat, too!

## For grown-ups / coders

- Plain JavaScript + [three.js](https://threejs.org) (shared in `../lib/`), no build step.
- Every model, texture, sound and song is made with code. There are no image or sound files.
- `js/city.js` builds each city from a little map of letters (H = houses, P = park, S = shops, T = towers...).
- `tools/models.html` shows every model (`?show=dinos` for the dinos, hats and people).
- `js/army.js` has the army vehicles, their shots, and all the funny radio messages.
- `index.html?auto&level=2` lets a robot play by itself (used for testing). `?low` = fast graphics.
