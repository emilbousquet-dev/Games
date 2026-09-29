// ============================================================
//  MONSTER HOTEL — CONTROLS (keyboard, mouse and a controller)
// ============================================================
window.MH = window.MH || {};

MH.Input = (function () {
  const keys = new Set();
  const pressed = new Set();   // keys pressed since last frame
  const mouse = { dx: 0, dy: 0, locked: false, down: false, clicked: false };
  const KEY = {
    fwd: ['KeyW', 'ArrowUp', 'KeyZ'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft', 'KeyQ'], right: ['KeyD', 'ArrowRight'],
    run: ['ShiftLeft', 'ShiftRight'], use: ['KeyE', 'KeyF', 'Enter'], power: ['Space'], drop: ['KeyG', 'KeyX', 'Backspace'],
    pause: ['Escape', 'KeyP'], turnL: ['KeyJ'], turnR: ['KeyL'],
  };
  let padPrev = {};
  let listeners = [];

  function init() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (!keys.has(e.code)) { pressed.add(e.code); listeners.forEach((f) => f(e.code)); }
      keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());
    document.addEventListener('mousemove', (e) => { if (mouse.locked) { mouse.dx += e.movementX; mouse.dy += e.movementY; } });
    document.addEventListener('mousedown', (e) => { if (mouse.locked && e.button === 0) { mouse.down = true; mouse.clicked = true; } });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.down = false; });
    document.addEventListener('pointerlockchange', () => { mouse.locked = !!document.pointerLockElement; });
  }
  const down = (list) => list.some((k) => keys.has(k));
  const hit = (list) => list.some((k) => pressed.has(k));
  const dz = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);

  function pad() {
    try { const l = navigator.getGamepads ? navigator.getGamepads() : []; for (const g of l) if (g) return g; } catch (e) { /* no gamepads */ }
    return null;
  }

  // everything the player is pressing this frame
  function read() {
    const s = {
      move: (down(KEY.fwd) ? 1 : 0) - (down(KEY.back) ? 1 : 0),
      strafe: (down(KEY.right) ? 1 : 0) - (down(KEY.left) ? 1 : 0),
      turn: (down(KEY.turnR) ? 1 : 0) - (down(KEY.turnL) ? 1 : 0),
      look: 0,
      run: down(KEY.run),
      use: hit(KEY.use) || mouse.clicked,
      useHeld: down(KEY.use) || mouse.down,
      power: hit(KEY.power),
      drop: hit(KEY.drop),
      pause: hit(KEY.pause),
      mx: mouse.dx, my: mouse.dy,
      pad: false,
    };
    mouse.dx = 0; mouse.dy = 0; mouse.clicked = false;
    const gp = pad();
    if (gp) {
      const ax = gp.axes, b = gp.buttons;
      const bp = (i) => b[i] && b[i].pressed;
      const edge = (i) => bp(i) && !padPrev[i];
      const lx = dz(ax[0] || 0), ly = dz(ax[1] || 0), rx = dz(ax[2] || 0), ry = dz(ax[3] || 0);
      if (lx || ly || rx || ry || b.some((q) => q.pressed)) s.pad = true;
      s.move = s.move || -ly; s.strafe = s.strafe || lx;
      s.turn = s.turn || rx; s.look = ry;
      s.run = s.run || bp(7) || bp(10);
      s.use = s.use || edge(0); s.useHeld = s.useHeld || bp(0);
      s.power = s.power || edge(2) || edge(5);
      s.drop = s.drop || edge(1);
      s.pause = s.pause || edge(9);
      padPrev = {}; b.forEach((q, i) => { padPrev[i] = q.pressed; });
    }
    pressed.clear();
    return s;
  }
  function onKey(f) { listeners.push(f); }
  function lock(el) { try { const p = el.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* not allowed */ } }
  function unlock() { try { document.exitPointerLock(); } catch (e) { /* ignore */ } }

  return { init, read, onKey, lock, unlock, mouse, isDown: (c) => keys.has(c) };
})();
