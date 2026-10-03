// ============================================================
//  NINJA CAT — CONTROLS (keyboard, mouse and 2 gamepads)
//  Want different keys? Change the KEYMAP below!
// ============================================================
window.NC = window.NC || {};

NC.Input = (function () {
  const U = NC.U;
  const keys = new Set();
  const tapped = new Set(); // keys pressed since the last frame (so a super quick tap is never missed)
  const KEYMAP = [
    { // PLAYER 1: MOCHI (left side of the keyboard)
      up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
      camL: ['KeyQ'], camR: ['KeyE'],
      jump: ['Space'], katana: ['KeyF'], star: ['KeyR'], smoke: ['KeyG'], taunt: ['KeyT'],
    },
    { // PLAYER 2: SHADOW (arrows + right side)
      up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      camL: ['Comma'], camR: ['Period'],
      jump: ['Enter', 'NumpadEnter', 'Numpad0'], katana: ['KeyL', 'Numpad1'], star: ['KeyK', 'Numpad2'], smoke: ['KeyJ', 'Numpad3'], taunt: ['KeyH', 'Numpad4'],
    },
  ];
  // the names shown in the hints, for each player
  const KEYNAMES = [
    { move: 'W A S D', jump: 'SPACE', katana: 'F or CLICK', star: 'R or RIGHT CLICK', smoke: 'G', cam: 'MOUSE or Q E', taunt: 'T' },
    { move: 'ARROWS', jump: 'ENTER', katana: 'L', star: 'K', smoke: 'J', cam: ', .', taunt: 'H' },
  ];
  const PADNAMES = { move: 'LEFT STICK', jump: 'A', katana: 'X', star: 'Y', smoke: 'B', cam: 'RIGHT STICK', taunt: 'BACK' };

  const pads = [null, null];          // which gamepad belongs to each player
  const prev = [{}, {}];              // last frame's buttons (to find NEW presses)
  const mouse = { dx: 0, dy: 0, locked: false, left: false, right: false, drag: false };
  let solo = true;                    // 1 player: player 1 can use both sides of the keyboard

  function init() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.code)) e.preventDefault();
      keys.add(e.code);
      tapped.add(e.code);
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => { keys.clear(); mouse.left = mouse.right = mouse.drag = false; });
    document.addEventListener('mousemove', (e) => {
      if (mouse.locked || mouse.drag) { mouse.dx += e.movementX || 0; mouse.dy += e.movementY || 0; }
    });
    document.addEventListener('mousedown', (e) => {
      if (e.target && e.target.closest && e.target.closest('button, .menu')) return;
      if (e.button === 0) { if (mouse.locked) mouse.left = true; else mouse.drag = true; }
      if (e.button === 2) mouse.right = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) { mouse.left = false; mouse.drag = false; }
      if (e.button === 2) mouse.right = false;
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { mouse.locked = !!document.pointerLockElement; });
    window.addEventListener('gamepaddisconnected', (e) => { for (let i = 0; i < 2; i++) if (pads[i] === e.gamepad.index) pads[i] = null; });
  }

  function lockMouse(el) {
    try { if (el.requestPointerLock && !mouse.locked) { const r = el.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } } catch (e) { /* not allowed, drag works too */ }
  }
  function unlockMouse() { try { if (document.exitPointerLock) document.exitPointerLock(); } catch (e) { /* fine */ } }

  const down = (list) => list.some((k) => keys.has(k) || tapped.has(k));
  const dz = (v) => (Math.abs(v) < 0.2 ? 0 : (v - Math.sign(v) * 0.2) / 0.8);
  function getPads() { try { return navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return []; } }

  // a gamepad nobody is using joins when you press any button on it
  const padPrev = {};
  function pollJoin() {
    for (const gp of getPads()) {
      if (!gp) continue;
      const pressed = gp.buttons.some((b) => b.pressed);
      const was = padPrev[gp.index];
      padPrev[gp.index] = pressed;
      if (pressed && !was && pads[0] !== gp.index && pads[1] !== gp.index) {
        const slot = pads[0] === null ? 0 : pads[1] === null ? 1 : -1;
        if (slot >= 0) pads[slot] = gp.index;
      }
    }
  }

  // everything player i is pressing this frame
  function read(i) {
    const maps = solo && i === 0 ? KEYMAP : [KEYMAP[i]];
    const any = (name) => maps.some((k) => down(k[name]));
    const s = {
      x: (any('right') ? 1 : 0) - (any('left') ? 1 : 0),   // left / right
      y: (any('up') ? 1 : 0) - (any('down') ? 1 : 0),      // forward / back
      camX: (any('camR') ? 1 : 0) - (any('camL') ? 1 : 0), // turn the camera with keys
      camDX: 0, camDY: 0,                                   // mouse / stick camera
      jump: any('jump'), katana: any('katana'), star: any('star'), smoke: any('smoke'), taunt: any('taunt'),
      pause: i === 0 && (down(['Escape', 'KeyP'])), pad: false,
    };
    if (i === 0 && solo && (mouse.locked || mouse.drag)) {
      s.camDX = mouse.dx * 0.0032; s.camDY = mouse.dy * 0.0025;
      mouse.dx = 0; mouse.dy = 0;
      s.katana = s.katana || mouse.left;
      s.star = s.star || mouse.right;
    } else if (i === 0) { mouse.dx = 0; mouse.dy = 0; }
    const idx = pads[i];
    if (idx !== null) {
      const gp = getPads()[idx];
      if (gp) {
        s.pad = true;
        const ax = gp.axes;
        s.x += dz(ax[0] || 0);
        s.y -= dz(ax[1] || 0);
        s.camDX += dz(ax[2] || 0) * 0.055;
        s.camDY += dz(ax[3] || 0) * 0.04;
        const b = (n) => gp.buttons[n] && (gp.buttons[n].pressed || gp.buttons[n].value > 0.4);
        s.jump = s.jump || b(0);
        s.katana = s.katana || b(2) || b(7);
        s.star = s.star || b(3) || b(5);
        s.smoke = s.smoke || b(1) || b(4);
        s.taunt = s.taunt || b(8);
        s.pause = s.pause || b(9);
        if (b(12)) s.y += 1; if (b(13)) s.y -= 1;
        if (b(14)) s.x -= 1; if (b(15)) s.x += 1;
      }
    }
    s.x = U.clamp(s.x, -1, 1);
    s.y = U.clamp(s.y, -1, 1);
    for (const k of maps) for (const n in k) for (const code of k[n]) tapped.delete(code);
    tapped.delete('Escape'); tapped.delete('KeyP');
    // NEW presses: true only on the first frame you press
    const p = prev[i];
    for (const n of ['jump', 'katana', 'star', 'smoke', 'taunt', 'pause']) s[n + 'Pressed'] = s[n] && !p[n];
    prev[i] = { jump: s.jump, katana: s.katana, star: s.star, smoke: s.smoke, taunt: s.taunt, pause: s.pause };
    return s;
  }

  // ---------- menus: arrows / WASD / sticks to move, ENTER / SPACE / A to pick ----------
  const menuPrev = {};
  function menuRead() {
    const k = (...codes) => codes.some((c) => keys.has(c) || tapped.has(c));
    const now = {
      up: k('ArrowUp', 'KeyW'),
      down: k('ArrowDown', 'KeyS'),
      left: k('ArrowLeft', 'KeyA'),
      right: k('ArrowRight', 'KeyD'),
      ok: k('Enter', 'Space', 'NumpadEnter'),
      back: k('Escape', 'Backspace'),
    };
    tapped.clear();
    for (const gp of getPads()) {
      if (!gp) continue;
      const b = (n) => gp.buttons[n] && gp.buttons[n].pressed;
      const ax = gp.axes;
      now.up = now.up || b(12) || (ax[1] || 0) < -0.6;
      now.down = now.down || b(13) || (ax[1] || 0) > 0.6;
      now.left = now.left || b(14) || (ax[0] || 0) < -0.6;
      now.right = now.right || b(15) || (ax[0] || 0) > 0.6;
      now.ok = now.ok || b(0) || b(9);
      now.back = now.back || b(1);
    }
    const out = {};
    for (const k in now) { out[k] = now[k] && !menuPrev[k]; menuPrev[k] = now[k]; }
    return out;
  }

  function rumble(i, strength = 0.6, ms = 180) {
    const idx = pads[i];
    if (idx === null) return;
    const gp = getPads()[idx];
    try { if (gp && gp.vibrationActuator) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength }); } catch (e) { /* not supported */ }
  }

  // the name of a button for the hints ("SPACE", "A"...)
  function keyName(i, action) {
    if (pads[i] !== null) return PADNAMES[action];
    return KEYNAMES[i][action];
  }

  return {
    init, read, menuRead, pollJoin, rumble, keyName, lockMouse, unlockMouse, pads, keys, mouse,
    setSolo(v) { solo = v; },
  };
})();
