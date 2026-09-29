// ============================================================
//  STARFALL — CONTROLS (keyboard, mouse and controller)
// ============================================================
window.SF = window.SF || {};

SF.Input = (function () {
  const keys = new Set();
  const pressed = new Set();       // keys pressed this frame
  const mouse = { dx: 0, dy: 0, locked: false, left: false, right: false, leftPressed: false };
  let padPrev = [];
  let listeners = [];
  let sensitivity = 1;
  try { sensitivity = parseFloat(localStorage.getItem('starfall.sens')) || 1; } catch (e) {}

  const K = {
    fwd: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    jump: ['Space'], sprint: ['ShiftLeft', 'ShiftRight'], use: ['KeyE', 'KeyF'], map: ['KeyM', 'Tab'],
    aim: ['KeyQ'], pause: ['Escape', 'KeyP'], attack: ['KeyJ'], block: ['KeyK'],
  };

  function init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!keys.has(e.code)) { pressed.add(e.code); listeners.forEach((f) => f('key', e.code)); }
      keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => { keys.clear(); mouse.left = mouse.right = false; });
    document.addEventListener('mousemove', (e) => {
      if (mouse.locked) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!mouse.locked) return;
      if (e.button === 0) { mouse.left = true; mouse.leftPressed = true; }
      if (e.button === 2) mouse.right = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) mouse.left = false;
      if (e.button === 2) mouse.right = false;
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { mouse.locked = document.pointerLockElement === canvas; });
  }

  function lock(canvas) {
    try { const p = canvas.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
  }
  function unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

  const down = (list) => list.some((k) => keys.has(k));
  const hit = (list) => list.some((k) => pressed.has(k));

  function pad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }
  const dz = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);

  // everything the game needs to know this frame
  function read(dt) {
    const s = {
      mx: 0, mz: 0, lookX: 0, lookY: 0,
      jump: down(K.jump), jumpPressed: hit(K.jump),
      attackPressed: mouse.leftPressed || hit(K.attack), attack: mouse.left || down(K.attack),
      block: mouse.right || down(K.block), aim: down(K.aim),
      sprint: down(K.sprint), use: down(K.use), usePressed: hit(K.use), mapPressed: hit(K.map), pausePressed: hit(K.pause),
      up: hit(['KeyW', 'ArrowUp']), down: hit(['KeyS', 'ArrowDown']), ok: hit(['KeyE', 'Enter', 'Space']), back: hit(['Escape', 'Backspace']),
      pad: false,
    };
    if (down(K.fwd)) s.mz -= 1;
    if (down(K.back)) s.mz += 1;
    if (down(K.left)) s.mx -= 1;
    if (down(K.right)) s.mx += 1;
    s.lookX = mouse.dx * 0.0024 * sensitivity;
    s.lookY = mouse.dy * 0.0024 * sensitivity;
    mouse.dx = mouse.dy = 0;

    const p = pad();
    if (p) {
      const b = (i) => !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.5));
      const was = (i) => !!padPrev[i];
      const bp = (i) => b(i) && !was(i);
      const lx = dz(p.axes[0] || 0), ly = dz(p.axes[1] || 0);
      const rx = dz(p.axes[2] || 0), ry = dz(p.axes[3] || 0);
      if (lx || ly) { s.mx = lx; s.mz = ly; s.pad = true; }
      s.lookX += rx * 2.6 * dt * sensitivity;
      s.lookY += ry * 1.8 * dt * sensitivity;
      s.jump = s.jump || b(0); s.jumpPressed = s.jumpPressed || bp(0);
      s.sprint = s.sprint || b(1);
      s.attack = s.attack || b(2) || b(7);
      s.attackPressed = s.attackPressed || bp(2) || bp(7);
      s.usePressed = s.usePressed || bp(3); s.use = s.use || b(3);
      s.aim = s.aim || b(4);
      s.block = s.block || b(6);
      s.mapPressed = s.mapPressed || bp(8);
      s.pausePressed = s.pausePressed || bp(9);
      s.up = s.up || bp(12); s.down = s.down || bp(13);
      s.ok = s.ok || bp(0); s.back = s.back || bp(1);
      if (p.buttons.some((x, i) => x.pressed && !padPrev[i])) listeners.forEach((f) => f('pad', 0));
      padPrev = p.buttons.map((x) => x.pressed || x.value > 0.5);
    }
    const len = Math.hypot(s.mx, s.mz);
    if (len > 1) { s.mx /= len; s.mz /= len; }
    return s;
  }

  function endFrame() { pressed.clear(); mouse.leftPressed = false; }
  function onAny(f) { listeners.push(f); }
  function setSensitivity(v) { sensitivity = v; try { localStorage.setItem('starfall.sens', v); } catch (e) {} }

  return { init, lock, unlock, read, endFrame, onAny, mouse, keys, setSensitivity, get sensitivity() { return sensitivity; } };
})();
