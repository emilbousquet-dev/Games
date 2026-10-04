# DRESS TO IMPRESS BILL 👗🕶️

A **dress-up fashion show game** that runs in your web browser.
**Bill** (from Kids vs Video Games) is the judge of the fashion show!
Pick your model (**Mio**, **Nafti** or **Felix**), dress them up for Bill's theme,
then walk the runway and see if Bill is impressed... or NOT impressed. 😬
Play alone, or **ONLINE** against your friends!

## How to play

1. Open **`dress-to-impress-bill/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Press **PLAY** and pick your model.
3. Bill tells you the **theme** (like PIRATE 🏴‍☠️ or SPACE 🚀) and his **secret wish** (like a PARROT or something GREEN).
4. You have **60 seconds** to get dressed. Click a tab (HAIR, HAT, FACE, TOP, PANTS, SHOES, EXTRA),
   then click the clothes. Click a color at the bottom to change the color.
5. Press **DONE! WALK!** and your model walks the runway. Bill holds up his score cards!
6. There are **5 rounds**. Get all **25 stars** to become **BILL'S FAVORITE** 👑

Don't like the timer? Turn it off on the title screen (**TIMER: OFF**).

## Play online with friends 🌍

Online play works when the game is open on **claude.ai** (the game's artifact page),
and your friends need to be able to open that page too (use its **Share** button).

1. Press **ONLINE** and pick your model.
2. One player presses **MAKE A GAME**. Everyone else presses **JOIN** on that game.
3. The host presses **START THE SHOW**. Everyone gets the **same theme and the same Bill's wish**.
4. Everyone gets dressed in 60 seconds, then the results show up: the **WINNER** of the round gets a trophy 🏆
5. After 5 rounds, the player with the most points wins the show! 👑

## How Bill gives points

| Card | How to get a 10 |
|---|---|
| **THEME** | Wear about **4 things** that fit the theme. Theme colors help a little too! |
| **STYLE** | Don't use too many colors (3 or less is great). Wear a hat, a face thing and an extra. Change lots of clothes! |
| **BILL** | Remember **Bill's wish**! Bill also loves **green** (his jacket color: BILL GREEN), **glasses** (like his) and **his own jacket**. |

Then the 3 cards are added up and you get **0 to 5 stars**.

## Tricks

- **Watch Bill** in the corner while you get dressed. If he's on his phone, he's bored.
  If he starts **clapping**, your outfit is great!
- When you have Bill's wish, a **✔** shows next to it at the top.
- Some clothes fit two themes (the **cape** is for superheroes, kings AND spooky vampires).
- **🎲 RANDOM** makes a crazy random outfit. Sometimes it's amazing. Usually it's not. 😂

## Controls

| | |
|---|---|
| Pick clothes and colors | Click (or tap on a phone/tablet) |
| Change tab | `1` to `7` |
| Random outfit | `R` |
| Done / Next / Go | `Enter` or `Space` |
| Sound on/off | `M` |

## Change the game!

Open **`js/clothes.js`**. Everything is there:

- the **themes** (add your own!) and their colors,
- every piece of clothing and which themes it fits (its `tags`),
- the colors you can pick,
- `ROUNDS` (how many rounds) and `ROUND_TIME` (how many seconds).

Save, and reload the page.

## Files

| File | What's inside |
|---|---|
| `index.html` | the page |
| `js/clothes.js` | clothes, colors, themes and models (edit me!) |
| `js/people.js` | the kids, Bill, and ALL the clothes, drawn with code |
| `js/game.js` | the screens, the wardrobe, Bill's scores and the runway |
| `js/audio.js` | sounds, Bill's scream, and the runway music, made with math |
| `js/util.js` | little drawing helpers |
