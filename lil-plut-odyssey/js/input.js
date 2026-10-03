// ============================================================
//  LIL' PLUT ODYSSEY — CONTROLS
//  Keyboard (arrows or W A S D) and game controllers.
//  Change the keys in the KEYS list below!
// ============================================================
window.LP = window.LP || {};

LP.Input = (function () {
  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', KeyZ: 'jump',
    KeyX: 'attack', KeyJ: 'attack', KeyF: 'attack',
    KeyC: 'scream', KeyK: 'scream', KeyE: 'scream',
    ShiftLeft: 'run', ShiftRight: 'run',
    Escape: 'pause', KeyP: 'pause',
    Enter: 'ok', NumpadEnter: 'ok',
    KeyM: 'mute',
  };
  // SPACE and Z also say "OK" in the menus
  const CONFIRM = { Space: true, KeyZ: true };
  // up arrow and W also jump (like in most platformers)
  const ALSO = { up: 'jump' };

  const keyDown = {};          // actions held on the keyboard
  let padDown = {};            // actions held on a controller
  const now = {}, prev = {};   // all actions this frame / last frame
  const pressedQueue = {};     // pressed since the game last looked (so very quick taps are never lost)
  let mouseClick = null;       // {x, y} of the last click, in screen pixels
  let anyKey = false;

  function setKey(action, down) {
    if (!action) return;
    if (down && !keyDown[action]) pressedQueue[action] = true;
    keyDown[action] = down;
    if (ALSO[action]) setKey(ALSO[action], down);
  }

  function init(canvas) {
    window.addEventListener('keydown', (e) => {
      const a = KEYS[e.code];
      if (a) e.preventDefault();
      if (e.repeat) return;
      anyKey = true;
      setKey(a, true);
      if (CONFIRM[e.code]) setKey('ok', true);
    });
    window.addEventListener('keyup', (e) => { setKey(KEYS[e.code], false); if (CONFIRM[e.code]) setKey('ok', false); });
    window.addEventListener('blur', () => { for (const k in keyDown) keyDown[k] = false; });
    canvas.addEventListener('pointerdown', (e) => {
      const r = canvas.getBoundingClientRect();
      mouseClick = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      anyKey = true;
    });
  }

  function readPads() {
    padDown = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads || []) {
      if (!p) continue;
      const b = (i) => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (b(14) || ax < -0.4) padDown.left = true;
      if (b(15) || ax > 0.4) padDown.right = true;
      if (b(12) || ay < -0.6) padDown.up = true;
      if (b(13) || ay > 0.6) padDown.down = true;
      if (b(0)) padDown.jump = padDown.ok = true;           // A
      if (b(2) || b(1)) padDown.attack = true;               // X or B
      if (b(3) || b(5)) padDown.scream = true;               // Y or RB
      if (b(7) || b(6) || b(4)) padDown.run = true;          // triggers / LB
      if (b(9)) padDown.pause = true;                        // Start
    }
  }

  // call once per frame, before the game looks at the buttons
  function poll() {
    readPads();
    for (const a of ['left', 'right', 'up', 'down', 'jump', 'attack', 'scream', 'run', 'pause', 'ok', 'mute']) {
      prev[a] = now[a];
      now[a] = !!(keyDown[a] || padDown[a]);
      if (now[a] && !prev[a]) pressedQueue[a] = true;
    }
  }

  return {
    init, poll,
    down: (a) => !!now[a],
    pressed: (a) => !!pressedQueue[a],
    // "eat" a press so it only counts once
    take(a) { const p = !!pressedQueue[a]; pressedQueue[a] = false; return p; },
    clearPressed() { for (const k in pressedQueue) pressedQueue[k] = false; },
    takeClick() { const c = mouseClick; mouseClick = null; return c; },
    takeAnyKey() { const a = anyKey; anyKey = false; return a; },
    // for the test robot: press and release buttons from code
    fake(action, down) { setKey(action, down); },
  };
})();
