# SNAKE 🐍🍎

The classic snake game. It runs in your web browser.

## How to play

1. Open **`snake/index.html`** in Chrome, Edge or Firefox (just double-click it).
2. Pick a speed: **SLOW**, **NORMAL** or **FAST**.
3. Click **PLAY** (or press **Enter**), then press an arrow key to start moving.

Eat the **apples** 🍎. Every apple = **1 point**, and your snake gets **1 square longer**.
Don't hit the **walls** or **your own body**!
Fill the **whole board** with your snake and you **win**. 🏆

## Controls

| | Keyboard | Phone / tablet |
|---|---|---|
| Move | `←` `↑` `↓` `→` or `W` `A` `S` `D` (`Z` `Q` `S` `D` on a French keyboard) | Swipe, or tap the arrow buttons |
| Pause | `Space`, `P` or `Esc` | ⏸ button |
| Sound on / off | `M` | 🔊 button |
| Play again | `Enter` | PLAY AGAIN button |

The game pauses by itself if you switch to another tab or window.
Your **best score** is saved for each speed.

## Change the game

Everything is in **`index.html`**. At the top of the code (under `SETTINGS`) you can change:

- `COLS` and `ROWS`: the size of the board (it is 20 × 20)
- `SPEEDS`: how fast each speed is (smaller number = faster)
- `COLORS`: the colors of the board, the snake and the apple
