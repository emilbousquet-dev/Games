// ============================================================
//  LAB 13 — CONTROLS (keyboard, mouse and gamepads)
// ============================================================
window.LAB = window.LAB || {};

LAB.Input = (function () {
  const keys = new Set();
  const KEYMAP = [
    { // PLAYER 1 (left side of the keyboard)
      fwd: ['KeyW'], back: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
      strafeL: ['KeyQ'], strafeR: ['KeyE'], lookUp: ['KeyZ'], lookDown: ['KeyX'],
      sprint: ['ShiftLeft'], flash: ['KeyF'], attack: ['Space'], use: ['KeyR'],
    },
    { // PLAYER 2 (arrows + right side)
      fwd: ['ArrowUp'], back: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      strafeL: ['Comma'], strafeR: ['Period'], lookUp: ['Quote', 'PageUp'], lookDown: ['Semicolon', 'PageDown'],
      sprint: ['ShiftRight', 'KeyM'], flash: ['KeyL'], attack: ['Enter', 'NumpadEnter', 'Numpad0'], use: ['Slash', 'KeyK', 'Numpad1'],
    },
  ];
  const pads = [null, null];          // which gamepad index belongs to each player
  const prev = [{}, {}];              // last frame buttons (to detect a new press)
  const mouse = { dx: 0, dy: 0, locked: false, down: false };
  let anyPressedListeners = [];

  function init() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash', 'Quote', 'Tab'].includes(e.code)) e.preventDefault();
      if (!keys.has(e.code)) anyPressedListeners.forEach((f) => f('key', e.code));
      keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (mouse.locked) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
    });
    document.addEventListener('mousedown', (e) => { if (mouse.locked && e.button === 0) mouse.down = true; });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
    document.addEventListener('pointerlockchange', () => { mouse.locked = !!document.pointerLockElement; });
    window.addEventListener('gamepaddisconnected', (e) => { for (let i = 0; i < 2; i++) if (pads[i] === e.gamepad.index) pads[i] = null; });
  }

  const down = (list) => list.some((k) => keys.has(k));
  const dz = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);

  function getPads() {
    try { return navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return []; }
  }

  // a gamepad that isn't used by anyone joins when any button is pressed
  const padPrev = {};
  function pollJoin() {
    const list = getPads();
    for (const gp of list) {
      if (!gp) continue;
      const pressed = gp.buttons.some((b) => b.pressed);
      const was = padPrev[gp.index];
      padPrev[gp.index] = pressed;
      if (pressed && !was) {
        anyPressedListeners.forEach((f) => f('pad', gp.index));
        if (pads[0] !== gp.index && pads[1] !== gp.index) {
          const slot = pads[0] === null ? 0 : pads[1] === null ? 1 : -1;
          if (slot >= 0) pads[slot] = gp.index;
        }
      }
    }
  }

  // move a gamepad to the other player (on the title screen)
  function swapPad(padIndex, toPlayer) {
    const other = 1 - toPlayer;
    if (pads[other] === padIndex) { pads[other] = pads[toPlayer]; pads[toPlayer] = padIndex; }
  }

  // read everything a player is pressing this frame
  function read(i) {
    const k = KEYMAP[i];
    const s = {
      move: (down(k.fwd) ? 1 : 0) - (down(k.back) ? 1 : 0),
      strafe: (down(k.strafeR) ? 1 : 0) - (down(k.strafeL) ? 1 : 0),
      turn: (down(k.right) ? 1 : 0) - (down(k.left) ? 1 : 0),
      look: (down(k.lookUp) ? 1 : 0) - (down(k.lookDown) ? 1 : 0),
      lookDX: 0, lookDY: 0,
      sprint: down(k.sprint), flash: down(k.flash), attack: down(k.attack), use: down(k.use),
      pause: false, pad: false,
    };
    // player 1 can also use the mouse after clicking on the game
    if (i === 0 && mouse.locked) {
      s.lookDX = mouse.dx * 0.0025; s.lookDY = mouse.dy * 0.0025;
      mouse.dx = 0; mouse.dy = 0;
      s.strafe += s.turn; s.turn = 0; // A/D strafe when using the mouse
      s.attack = s.attack || mouse.down;
    }
    const idx = pads[i];
    if (idx !== null) {
      const gp = getPads()[idx];
      if (gp) {
        s.pad = true;
        const ax = gp.axes;
        s.move -= dz(ax[1] || 0);
        s.strafe += dz(ax[0] || 0);
        s.turn += dz(ax[2] || 0) * 1.1;
        s.look -= dz(ax[3] || 0);
        const b = (n) => gp.buttons[n] && (gp.buttons[n].pressed || gp.buttons[n].value > 0.4);
        s.sprint = s.sprint || b(6) || b(10);
        s.attack = s.attack || b(7) || b(2);
        s.use = s.use || b(0);
        s.flash = s.flash || b(5) || b(3);
        s.pause = b(9);
        if (b(12)) s.move += 1; if (b(13)) s.move -= 1;
        if (b(14)) s.turn -= 1; if (b(15)) s.turn += 1;
      }
    }
    s.move = LAB.U.clamp(s.move, -1, 1);
    s.strafe = LAB.U.clamp(s.strafe, -1, 1);
    // new presses (true only on the first frame)
    const p = prev[i];
    s.attackPressed = s.attack && !p.attack;
    s.usePressed = s.use && !p.use;
    s.flashPressed = s.flash && !p.flash;
    s.pausePressed = s.pause && !p.pause;
    prev[i] = { attack: s.attack, use: s.use, flash: s.flash, pause: s.pause };
    return s;
  }

  function rumble(i, strength = 0.6, ms = 200) {
    const idx = pads[i];
    if (idx === null) return;
    const gp = getPads()[idx];
    try {
      if (gp && gp.vibrationActuator) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength });
    } catch (e) { /* not supported */ }
  }

  return {
    init, read, pollJoin, rumble, swapPad, pads, keys, mouse, getPads,
    onAnyPress(f) { anyPressedListeners.push(f); },
    isDown: (code) => keys.has(code),
  };
})();
