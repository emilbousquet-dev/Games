# MY LIFE 👶➡️🧓  (version 0.2)

A **3D life simulator** that runs in your web browser.
Live a whole life, from a **baby** all the way to an **old-timer**, by choosing what to do.
You don't walk around yourself: **every move is a choice**, and you watch your character act it out in 3D!

## How to play

1. Open **`my-life/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Press **NEW LIFE** and **make YOU**: name, skin, hair, eyes, clothes. You can see yourself as a baby and as a grown-up.
3. Press **BE BORN!** 👶
4. Something happens and you get **choice buttons**. Click one (or press `1` `2` `3` `4`) and watch what happens!
5. When the year is done, press **🎂 AGE UP** for your next birthday.
6. Keep going until you're very old. At the end you get your **Life Story** ⭐.

The game **saves by itself**, so you can close it and press **CONTINUE** later.

### 📱 On a phone or tablet

Open the same `my-life/index.html` page in your phone's browser. Everything works with your finger:
tap the choices, tap **🎂 AGE UP** and **📱 LIFE** (the big buttons at the bottom when a year is done).
Hold the phone **upright** (story at the bottom) or **sideways** (story on the right). Both work!

## Controls

| | |
|---|---|
| Pick a choice | Click it, or press `1` `2` `3` `4` ... |
| Next | `Space` or `Enter` |
| Age up | `A` (or the 🎂 AGE UP button) |
| Life menu | `L` (or the 📱 LIFE button) |
| Close a window | `Esc` |
| Sound on/off | `M` (or the 🔊 button) |

## 😇 Good · 😈 Evil · 🤡 Funny

Most choices are **good** 😇, **evil** 😈 or **funny** 🤡. Every choice fills up a meter.
The biggest meter decides **who you are**: *Good Baby*, *Evil Kid*, *Funny Teen*, *Evil Adult*...

- People react to you (strangers smile 😊, get scared 😨 or laugh 😆).
- ⭐ **Secret choices** only show up for your personality (try being an evil kid near the cookie jar...).
- Your character changes: good people get a **halo and sparkles** ✨, evil people get **angry eyebrows and a storm cloud** ⛈️, funny people get a **propeller hat** and do silly dances.
- Old choices fade a little every year, so you can change who you are!
- At the end you get a title for your whole life: **The Hero**, **The Evil Mastermind**, **The Class Clown Forever**, **The Funny Villain**...

## Your stats

❤️ **Health** · 😊 **Happiness** · 🧠 **Smarts** · ✨ **Looks** · 💰 **Money**

Some jobs need high smarts or health. Some choices are lucky (or unlucky!) 🎲.

## The 📱 LIFE menu

Open it after a year is done:

- 👨‍👩‍👧 **People**: hang out with your family and friends (hug, give a present, prank them, tell a joke...).
- ⭐ **Things to do**: exercise, study, makeover (new hair, clothes and glasses), play with your pet, go for a drive.
- 💼 **Job**: find a job, ask for a bonus, quit, retire.
  Jobs: 🍔 Burger Blast, 💼 Mega Corp (Intern → THE BOSS), 👮 City Police, 🩺 Doctor, 🎬 YouTuber, 🍎 Teacher.
- 🛍️ **Shopping**: 🐾 Pet Palace (dog, cat, parrot), 🚗 Super Cars (bike, car, sports car), 🛋️ furniture for your home (you pick where it goes!), 🏢 new home (big apartment or PENTHOUSE).

## Your life

- 👶 **Baby** (0-3): first word, first steps, peas, nap time...
- 🧒 **Kid** (4-12): school, the bully, tests, the cookie jar, sleepovers, your first bike...
- 🧑 **Teen** (13-17): crushes, talent show, first job, driving test, class president...
- 🧑‍💼 **Adult** (18-64): move to the **big city**, the lady on the street, jobs, a UFO 🛸, robbers, lottery tickets...
- 🧓 **Old-timer** (65+): bingo, piano, the dance contest, giving advice to kids...

## Add your own moments!

All the moments are in **`js/events.js`**. Each one is a little list:
where it happens, who is there, the text, and the choices. Copy one, change the words, save, reload!
The top of the file explains everything.

## Ideas for next time 💡

- More moments for every age
- Getting married and having kids (then keep playing as your kid!)
- College and more jobs (chef, astronaut, pro gamer...)
- Crimes and jail 🚔 for the really evil people
- Becoming famous
- More pets (lizard, horse, dragon?)
- Car tuning and races
- Vacations to other places (beach, snow, space?)
- Trophies for doing crazy things

## Files

| File | What's inside |
|---|---|
| `index.html` | the page, the menus and the buttons |
| `js/events.js` | ⭐ **all the life moments and choices** (edit me!) |
| `js/life.js` | stats, money, family, jobs, homes, pets, cars, saving |
| `js/game.js` | the main game: years, choices, birthdays, the end |
| `js/menu.js` | the 📱 LIFE menu |
| `js/creator.js` | the character creator |
| `js/stage.js` | puts people in the 3D places and makes them act |
| `js/scenes.js` | all the 3D places (nursery, school, city street...) |
| `js/people.js` | realistic people of every age (bodies, faces, hair, clothes, moves) |
| `js/animals.js` | realistic dogs, cats and parrots |
| `js/vehicles.js` | realistic cars, sports cars, taxis, buses and bikes |
| `js/models.js` | furniture, buildings, trees and other things |
| `js/textures.js` | walls, floors, windows, signs, all painted with code |
| `js/audio.js` | music and sounds (made with math, no sound files!) |
