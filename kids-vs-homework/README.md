# KIDS vs HOMEWORK ✏️📚

A **tower defense game** (like Plants vs Zombies) that runs in your web browser.
Homework is marching toward your bedroom door. Put kids in its way to stop it.
If the homework gets in, you know what happens... **"DO YOUR HOMEWORK!!!"** 😱

Starring **Natti**, **Mio** and **Bill**!

## How to play

1. Open **`kids-vs-homework/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Press **PLAY** and pick a day. You start on **Monday**.
3. Click a kid's card at the top, then click the blue rug to put the kid there.
4. Click the **cookies** 🍪 to collect snacks. Snacks pay for more kids!
5. Survive all the homework, then click the golden **A+** to win the day.

Win a day to unlock the next one **and** a new kid. Friday has the final boss... 🌋

## Controls

| | |
|---|---|
| Pick a kid | Click a card, or press `1` to `7` |
| Put the kid down | Click the rug |
| Collect snacks | Click the cookies |
| Send a kid home | Click **SEND HOME** (or press `R`), then click the kid |
| Cancel | Right click or `Esc` |
| Pause | `P`, `Space`, or the pause button |
| Fast forward | The ⏩ button |
| Sound on/off | `M` or the speaker button |

## The kids

| Kid | Snacks | What they do |
|---|---|---|
| 🍪 **Snack Kid** | 50 | Munches cookies and shares them. Makes extra snacks! |
| ✏️ **Natti** | 100 | SUPER grumpy about homework. Throws pencils at it! |
| 😱 **Bill** | 150 | Screams SO loud that homework gets blown backwards! |
| 🎮 **Gamer** | 50 | Will NOT stop playing. A big wall that homework can't get past. |
| 🌌 **Mio** | 200 | Throws shooting stars from the space hoodie. They fly through EVERYTHING! |
| 💦 **Splash** | 175 | Water balloons! Soggy homework is SLOW homework. |
| 💥 **Mega Eraser** | 125 | BOOM! Erases all the homework around it. |

## The homework

- 📄 **Worksheet**: just a normal worksheet. Still annoying.
- ➕ **Math Problem**: beat it and it splits into **two** smaller problems!
- ⏰ **Due Tomorrow**: in a HUGE hurry. It **jumps over** the first kid it meets.
- 📕 **Big Textbook**: slow, heavy and super tough.
- ✈️ **Paper Airplane**: flies right over your kids!
- 🌋 **THE SCIENCE PROJECT**: the final boss. A giant volcano that shoots lava
  at your kids and spits out more homework!

## Tricks

- Put **Snack Kids** near the door early. More snacks = more kids!
- Each row has a **robot vacuum** 🤖. If homework gets too close, it zooms across
  and sucks up everything in the row. But it only works **once**!
- Put a **Gamer** in front of your throwers so the homework gets stuck there.
- **Bill** is great against the Big Textbook: every scream pushes it back.

## Change the game!

Open **`js/data.js`**. All the numbers are there: how much each kid costs,
how strong the homework is, and what comes on each day.
For example, `'BIG sheet*6'` means "a huge wave with 6 worksheets".
Change something, save, and reload the page.

## Files

| File | What's inside |
|---|---|
| `index.html` | the page |
| `js/data.js` | kids, homework and the 5 days (edit me!) |
| `js/draw.js` | every picture, drawn with code (no image files!) |
| `js/audio.js` | the sounds and music, made with math (no sound files!) |
| `js/game.js` | the rules, the menus and the main loop |
