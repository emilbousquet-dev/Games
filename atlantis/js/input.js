// ============================================================
//  ATLANTIS DIVER — CONTROLS (keyboard and gamepad)
// ============================================================
AT.Input = (function () {
  const keys = new Set();
  const KEYS = {
    up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    boost: ['ShiftLeft', 'ShiftRight'], fire: ['Space', 'KeyJ'], use: ['KeyE', 'Enter'],
    map: ['KeyM', 'Tab'], pause: ['Escape', 'KeyP'], journal: ['KeyQ'],
  };
  let state = {}, prev = {};
  let usingPad = false;
  const listeners = [];

  function init() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!keys.has(e.code)) listeners.forEach((f) => f(e.code));
      keys.add(e.code);
      usingPad = false;
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());
  }

  const dz = (v) => (Math.abs(v) < 0.2 ? 0 : (v - Math.sign(v) * 0.2) / 0.8);
  const down = (list) => list.some((k) => keys.has(k));

  function pad() {
    try {
      const list = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of list) if (gp && gp.connected) return gp;
    } catch (e) { /* no gamepads */ }
    return null;
  }

  // read everything once per frame
  function update() {
    prev = state;
    const s = {
      mx: (down(KEYS.right) ? 1 : 0) - (down(KEYS.left) ? 1 : 0),
      my: (down(KEYS.down) ? 1 : 0) - (down(KEYS.up) ? 1 : 0),
      boost: down(KEYS.boost), fire: down(KEYS.fire), use: down(KEYS.use),
      map: down(KEYS.map), pause: down(KEYS.pause), journal: down(KEYS.journal), back: keys.has('Escape'),
    };
    const gp = pad();
    if (gp) {
      const b = (n) => gp.buttons[n] && (gp.buttons[n].pressed || gp.buttons[n].value > 0.4);
      const ax = dz(gp.axes[0] || 0), ay = dz(gp.axes[1] || 0);
      if (ax || ay || gp.buttons.some((x) => x.pressed)) usingPad = true;
      s.mx += ax + (b(15) ? 1 : 0) - (b(14) ? 1 : 0);
      s.my += ay + (b(13) ? 1 : 0) - (b(12) ? 1 : 0);
      s.boost = s.boost || b(6) || b(4) || b(10);
      s.fire = s.fire || b(7) || b(2) || b(5);
      s.use = s.use || b(0);
      s.map = s.map || b(8);
      s.pause = s.pause || b(9);
      s.back = s.back || b(1);
      s.journal = s.journal || b(3);
    }
    const len = Math.hypot(s.mx, s.my);
    if (len > 1) { s.mx /= len; s.my /= len; }
    for (const k of ['fire', 'use', 'map', 'pause', 'back', 'journal']) s[k + 'P'] = s[k] && !prev[k];
    // menu navigation (one step per press)
    s.navX = 0; s.navY = 0;
    const nx = Math.abs(s.mx) > 0.5 ? Math.sign(s.mx) : 0, ny = Math.abs(s.my) > 0.5 ? Math.sign(s.my) : 0;
    if (nx !== (prev.nx || 0)) s.navX = nx;
    if (ny !== (prev.ny || 0)) s.navY = ny;
    s.nx = nx; s.ny = ny;
    state = s;
  }

  function rumble(strength = 0.5, ms = 150) {
    const gp = pad();
    try {
      if (gp && gp.vibrationActuator) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength });
    } catch (e) { /* not supported */ }
  }

  return {
    init, update, rumble,
    get s() { return state; },
    get usingPad() { return usingPad; },
    onKey(f) { listeners.push(f); },
  };
})();
