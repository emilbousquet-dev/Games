# SPARE PARTS 🤖🦾🦵

A **funny 3D co-op game** for 2 players that runs in your web browser.
Two silly robots, **Bolt** (orange) and **Nutty** (blue), must **escape the Toy Factory**.
The twist: they can **throw, swap and borrow each other's arms and legs!**

## How to play

1. Open **`index.html`** in Chrome, Edge or Firefox.
2. Click **Play**.
3. Share the keyboard with a friend, or plug in controllers.

## Controls

| | Bolt | Nutty | 🎮 Controller |
|---|---|---|---|
| Move | `W` `A` `S` `D` | Arrows | Left stick |
| Jump | `Space` | `Enter` | A |
| Throw arm | `Q` | `,` | RB / X |
| Throw leg | `E` | `.` | RT / Y |
| Call your limbs back | `R` | `/` | LB / B |
| Silly dance | `G` | `'` | Back |

`H` shows the controls · `Esc` or `P` pauses · `M` turns the music on or off

## The rules of spare parts

- **Tap** a throw button to **drop** the limb at your feet. **Hold** it to **aim**: a power meter goes up and down,
  an arrow shows the direction and dots show where it will land. **Let go** to throw! (Your move keys turn you while aiming.)
- **Walk over any arm or leg** lying around to stick it on (up to 4 arms and 4 legs).
- **Your limbs always listen to YOU**, even when your friend is wearing them!
  - Your **legs** on your friend walk where *you* push. If you push different ways, you get pulled around.
  - To use legs for a jump, their owner has to press jump. So with 4 legs, **both players press jump at the same time** for a **SUPER JUMP**.
  - Your **arm** on your friend: **tap** your arm button to **slap** (you might slap your friend in the face!), **hold** it to **grab** (your friend is stuck), and **hold call back** to **pull** your friend to you.
  - Your **leg** on your friend: the throw-leg button makes it **kick**.
- **No legs?** You scoot around on your bottom. **One leg?** You hop like a pogo stick.
- Arms and legs can **hold buttons down** for you.
- Fall into the ball pit or get squished? You pop back at the last 🚩 checkpoint.

## Levels: Escape the Toy Factory

1. **Wake Up**: jump on your friend's head to reach high places
2. **Handy**: throw your arms onto buttons
3. **Leg Day**: swap legs and super jump together
4. **Conveyor Chaos**: squishers, conveyor belts and moving platforms
5. **The Big Escape**: everything together!

Plus the **Playground**, where you can mess around with trampolines, a lift and a squisher.
Every level has 5 hidden **🔩 golden bolts**. Can you find them all?

## Made with

Plain HTML and JavaScript with [three.js](https://threejs.org/) (in `../lib`). All the sounds and music are made with code.

| File | What it does |
|---|---|
| `js/game.js` | Main loop, menus flow, level loading |
| `js/robot.js` | Bolt and Nutty: looks, walking, jumping, dancing, flying hats |
| `js/parts.js` | Arms and legs: throwing, dropping, sticking on, slapping, grabbing, pulling |
| `js/aim.js` | The power meter, arrow and landing dots when you aim a throw |
| `js/level.js` | Buttons, doors, bridges, platforms, conveyors, squishers, trampolines, golden bolts |
| `js/levels.js` | The level designs |
| `js/physics.js` | Box collisions and gravity |
| `js/audio.js` | Sound effects and music |
| `js/effects.js` | Dust, poofs, sparkles, confetti |
| `js/ui.js` | Menus, hints, controls panel |
| `js/camera.js` | The camera that follows both robots |
| `js/input.js` | Keyboard and controllers |
