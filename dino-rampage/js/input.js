// ============================================================
//  DINO RAMPAGE — CONTROLS (keyboard, mouse and a controller)
// ============================================================
window.DR = window.DR || {};

DR.Input = (function () {
  const keys = new Set();
  const pressed = new Set();   // keys pressed since last frame
  const mouse = { dx: 0, dy: 0, locked: false, left: false, right: false, clickL: false, clickR: false, noLock: false };
  const KEY = {
    fwd: ['KeyW', 'ArrowUp', 'KeyZ'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    run: ['ShiftLeft', 'ShiftRight'], jump: ['Space'], bite: ['KeyE', 'Enter'], tail: ['KeyQ', 'KeyF'], roar: ['KeyR'],
    pause: ['Escape', 'KeyP'], camL: ['KeyJ'], camR: ['KeyL'],
  };
  let padPrev = {};
  let listeners = [];
  // touch controls: a joystick for the left thumb, swiping to look, and big buttons
  const touch = { move: 0, strafe: 0, run: false, used: false, bite: false, tail: false, jump: false, roar: false, pause: false };
  let stickId = null, lookId = null, stickX = 0, stickY = 0, lookX = 0, lookY = 0;
  const STICK = 55;   // how far (in pixels) you push the joystick for full speed

  function initTouch() {
    const zone = document.getElementById('stick-zone'), look = document.getElementById('look-zone');
    const base = document.getElementById('stick-base'), knob = document.getElementById('stick-knob');
    if (!zone) return;
    const opts = { passive: false };
    const showStick = (x, y) => { base.style.display = 'block'; base.style.left = x + 'px'; base.style.top = y + 'px'; knob.style.transform = 'translate(-50%, -50%)'; };
    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (stickId !== null) return;
      stickId = t.identifier; stickX = t.clientX; stickY = t.clientY;
      showStick(stickX, stickY);
      touch.used = true;
      const hint = document.getElementById('stick-hint'); if (hint) hint.style.display = 'none';
    }, opts);
    look.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      if (lookId !== null) return;
      lookId = t.identifier; lookX = t.clientX; lookY = t.clientY;
      touch.used = true;
    }, opts);
    window.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          e.preventDefault();
          let dx = t.clientX - stickX, dy = t.clientY - stickY;
          const d = Math.hypot(dx, dy);
          if (d > STICK) { dx = dx / d * STICK; dy = dy / d * STICK; }
          touch.strafe = dx / STICK; touch.move = -dy / STICK;
          touch.run = d > STICK * 0.92;
          knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        } else if (t.identifier === lookId) {
          e.preventDefault();
          mouse.dx += (t.clientX - lookX) * 1.7; mouse.dy += (t.clientY - lookY) * 1.4;
          lookX = t.clientX; lookY = t.clientY;
        }
      }
    }, opts);
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; touch.move = 0; touch.strafe = 0; touch.run = false; base.style.display = 'none'; }
        if (t.identifier === lookId) lookId = null;
      }
    };
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
    // the action buttons
    for (const [id, key] of [['tb-bite', 'bite'], ['tb-tail', 'tail'], ['tb-jump', 'jump'], ['tb-roar', 'roar'], ['tb-pause', 'pause']]) {
      const b = document.getElementById(id);
      b.addEventListener('touchstart', (e) => { e.preventDefault(); touch[key] = true; touch.used = true; b.classList.add('down'); listeners.forEach((f) => f('Touch')); }, opts);
      b.addEventListener('touchend', (e) => { e.preventDefault(); b.classList.remove('down'); }, opts);
      b.addEventListener('mousedown', (e) => { e.preventDefault(); touch[key] = true; });
    }
  }

  function init() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      if (!keys.has(e.code)) { pressed.add(e.code); listeners.forEach((f) => f(e.code)); }
      keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());
    // mouse look: with the mouse locked, or by dragging (when locking isn't allowed)
    document.addEventListener('mousemove', (e) => {
      if (mouse.locked || (e.buttons && e.target && e.target.id === 'game')) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
    });
    document.addEventListener('mousedown', (e) => {
      if (!mouse.locked && !mouse.noLock) return;
      if (!mouse.locked && e.target && e.target.id !== 'game') return;
      if (e.button === 0) { mouse.left = true; mouse.clickL = true; }
      if (e.button === 2) { mouse.right = true; mouse.clickR = true; }
    });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.left = false; if (e.button === 2) mouse.right = false; });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => { mouse.locked = !!document.pointerLockElement; });
    document.addEventListener('pointerlockerror', () => { mouse.noLock = true; });
    initTouch();
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
      camTurn: (down(KEY.camR) ? 1 : 0) - (down(KEY.camL) ? 1 : 0),
      camTilt: 0,
      run: down(KEY.run),
      jump: hit(KEY.jump),
      bite: hit(KEY.bite) || mouse.clickL,
      tail: hit(KEY.tail) || mouse.clickR,
      roar: hit(KEY.roar),
      pause: hit(KEY.pause),
      mx: mouse.dx, my: mouse.dy,
      pad: false,
    };
    mouse.dx = 0; mouse.dy = 0; mouse.clickL = false; mouse.clickR = false;
    if (touch.used) {
      s.move = s.move || touch.move; s.strafe = s.strafe || touch.strafe; s.run = s.run || touch.run;
      s.bite = s.bite || touch.bite; s.tail = s.tail || touch.tail; s.jump = s.jump || touch.jump;
      s.roar = s.roar || touch.roar; s.pause = s.pause || touch.pause;
      touch.bite = touch.tail = touch.jump = touch.roar = touch.pause = false;
    }
    const gp = pad();
    if (gp) {
      const ax = gp.axes, b = gp.buttons;
      const bp = (i) => b[i] && b[i].pressed;
      const edge = (i) => bp(i) && !padPrev[i];
      const lx = dz(ax[0] || 0), ly = dz(ax[1] || 0), rx = dz(ax[2] || 0), ry = dz(ax[3] || 0);
      if (lx || ly || rx || ry || b.some((q) => q.pressed)) s.pad = true;
      s.move = s.move || -ly; s.strafe = s.strafe || lx;
      s.camTurn = s.camTurn || rx; s.camTilt = ry;
      s.run = s.run || bp(7) || bp(10);
      s.jump = s.jump || edge(0);
      s.bite = s.bite || edge(2) || edge(5);
      s.tail = s.tail || edge(1) || edge(4);
      s.roar = s.roar || edge(3) || edge(6);
      s.pause = s.pause || edge(9);
      padPrev = {}; b.forEach((q, i) => { padPrev[i] = q.pressed; });
    }
    pressed.clear();
    return s;
  }
  function onKey(f) { listeners.push(f); }
  function lock(el) { if (DR.touch) return; try { const p = el.requestPointerLock(); if (p && p.catch) p.catch(() => { mouse.noLock = true; }); } catch (e) { mouse.noLock = true; } }
  function unlock() { try { document.exitPointerLock(); } catch (e) { /* ignore */ } }

  return { init, read, onKey, lock, unlock, mouse, isDown: (c) => keys.has(c) };
})();
