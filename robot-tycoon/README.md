# ROBOT ARMY TYCOON 🤖⚔️

Build a factory 🏭 → make money 💰 → build robots 🤖 → send your army to war ⚔️

Destroy 10 enemy bases (the last one is the giant boss **MEGA-TRON** 👑),
fight bots in the Arena, or battle **online with up to 4 friends** using a room code.

The whole game is **one file** (`index.html`). The robots, sounds and online play are all made with code,
so you can paste it into **Google Sites** and play at school.

## Put it on your Google Site

1. Open this file on GitHub:
   **https://github.com/emilbousquet-dev/Games/blob/claude/game-suggestions-brainstorm-bkgtil/robot-tycoon/index.html**
   (If GitHub is blocked at school, do this part at home.)
2. Click the **Copy raw file** button (the two little squares, top right of the code). Now the whole game is copied.
3. Go to **sites.google.com** and open your site.
4. On the right, under **Insert**, click **Embed**, then the **Embed code** tab.
5. Paste (**Ctrl+V**), click **Next**, then **Insert**.
6. Drag the corners of the box to make it **big** (at least as big as half your screen).
7. Click **Publish**. Next to "Who can view my site", click **Manage** to pick who can see it.

**Updating the game later:** click the game box on your site, click the ✏️ pencil, delete the old code, and paste the new one.

## Check if online play works at your school

Before you count on playing online, try the small test page. Paste
[`online-test.html`](https://github.com/emilbousquet-dev/Games/blob/claude/game-suggestions-brainstorm-bkgtil/robot-tycoon/online-test.html)
into your site the same way. Then, with a friend on another computer:

1. One person clicks **Create room** and says the 4-letter code.
2. The other types the code and clicks **Join**.
3. If you both get **3 green checks ✅**, online battles will work there.

If step 1 fails, the school network blocks the online server. If step 2 fails, it blocks direct connections.
Campaign and Arena **always** work, even with no internet.

## How to play

| Tab | What you do there |
|---|---|
| 🏭 **Factory** | Click **CRANK** for coins. Buy **Droppers**, upgrade them (Scrap → Bolts → Gears → ...), speed up the conveyor, and buy **Machines** that make everything worth more. |
| 🔧 **Workshop** | Build a robot from 4 parts: **head, body, weapon, legs**. Pick a color and a name. Every part changes the stats. |
| 🤖 **Army** | See your robots. ✅ **Fight** picks who goes to battle (8 max). **🎓 Train** levels a robot up with coins. **🔧 Refit** changes its parts but keeps its level. Repair broken robots here. |
| ⚔️ **Battle** | **Campaign**: attack the 10 enemy bases. Winning gives coins and **new part blueprints**. **Arena**: fight 1–3 bot armies for 🏆 trophies. |
| 🔬 **Research** | Unlock new parts, stronger armor and weapons, more power-ups, and the **Airstrike**. |
| 🌐 **Online** | Make a room or join one with a code. Up to 4 players, everyone against everyone. Empty spots can be bots. |

**In battle** your robots fight by themselves. You help with **power-ups** at the bottom:
🔧 **Repair** heals, 🛡️ **Shield** protects, ⚡ **EMP** freezes enemies (click where), ✈️ **Airstrike** bombs them (click where).
Use them! The boss is really hard without them.

**Robots that get destroyed in the Campaign break** and cost coins to repair. In the Arena and online they never break.

**The 🎯 GOAL bar** at the top always tells you what to do next and gives you a reward.

## Saving

On your own computer the game saves by itself.
**Inside Google Sites saving is usually blocked**, so before you stop playing:

1. Click **💾 Save** and then **📋 Copy code**.
2. Paste the code somewhere safe, like a Google Doc.
3. Next time, click **📂 Load save code** on the title screen and paste it.

The save code works on any computer, so you can take your army anywhere.

## Change the game!

Open `index.html` and look for **GAME DATA**. Everything is there:

- `PARTS`: every robot part (cost, health `hp`, damage `dmg`, speed `spd`...).
- `BASES`: the 10 enemy bases, their armies, and the rewards.
- `TIERS`, `MACHINES`, `BELT`: the factory numbers.
- `RESEARCH` and `GOALS`: research and the goal list.
- `NAME_A` and `NAME_B`: the random robot names.

Save the file, reload the page, and your change is in the game.

## How online works (for grown-ups)

Online play uses the free public [PeerJS](https://peerjs.com) server (`0.peerjs.com`) only to help the computers find each other
with the room code. After that, the players' browsers talk **directly** (WebRTC). The host's computer runs the battle
and sends it to the others. The only things sent are player names, robot designs, and battle moves.
