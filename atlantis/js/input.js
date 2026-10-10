// ============================================================
//  ATLANTIS DIVER — CONTROLS (keyboard, gamepad and touch screen)
// ============================================================
AT.Input = (function () {
  const keys = new Set();
  const KEYS = {
    up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    boost: ['ShiftLeft', 'ShiftRight'], fire: ['Space', 'KeyJ'], use: ['KeyE', 'Enter'],
    map: ['KeyM', 'Tab'], pause: ['Escape', 'KeyP'], journal: ['KeyQ'],
  };
  let state = {}, prev = {};
  let usingPad = false, usingTouch = false;
  const listeners = [];

  // ---------- touch screen ----------
  // left side: a joystick appears where your thumb touches. Right side: buttons.
  const touch = { id: null, ox: 0, oy: 0, x: 0, y: 0, fire: false, boost: false, use: false, tap: {} };
  const STICK = 60;   // how far (in CSS pixels) the thumb moves for full speed

  function setupTouch() {
    const el = document.getElementById('touch'), stick = document.getElementById('stick'), knob = stick && stick.firstElementChild;
    if (!el) return;
    const start = () => { if (!usingTouch) { usingTouch = true; document.body.classList.add('touch'); } };
    window.addEventListener('touchstart', start, { passive: true });
    const showStick = () => {
      stick.style.display = touch.id === null ? 'none' : 'block';
      stick.style.left = touch.ox + 'px'; stick.style.top = touch.oy + 'px';
      let dx = touch.x - touch.ox, dy = touch.y - touch.oy;
      const d = Math.hypot(dx, dy);
      if (d > STICK) { dx *= STICK / d; dy *= STICK / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    // the joystick lives on the game canvas
    const canvas = document.getElementById('game');
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      start();
      for (const t of e.changedTouches) {
        if (AT.Game && AT.Game.state === 'map') { touch.tap.map = true; continue; }
        if (touch.id === null && t.clientX < window.innerWidth * 0.6) {
          touch.id = t.identifier; touch.ox = touch.x = t.clientX; touch.oy = touch.y = t.clientY;
        }
      }
      showStick();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === touch.id) { touch.x = t.clientX; touch.y = t.clientY; }
      showStick();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === touch.id) touch.id = null;
      showStick();
    };
    canvas.addEventListener('touchend', end); canvas.addEventListener('touchcancel', end);
    // buttons you hold down (a quick tap still counts, even if it's shorter than one frame)
    for (const [id, k] of [['t-fire', 'fire'], ['t-boost', 'boost'], ['t-use', 'use']]) {
      const b = document.getElementById(id);
      b.addEventListener('touchstart', (e) => { e.preventDefault(); start(); touch[k] = true; touch.tap[k] = true; b.classList.add('down'); }, { passive: false });
      const up = (e) => { e.preventDefault(); touch[k] = false; b.classList.remove('down'); };
      b.addEventListener('touchend', up); b.addEventListener('touchcancel', up);
    }
    // buttons you tap once
    for (const [id, k] of [['t-map', 'map'], ['t-journal', 'journal'], ['t-pause', 'pause']]) {
      document.getElementById(id).addEventListener('touchstart', (e) => { e.preventDefault(); touch.tap[k] = true; }, { passive: false });
    }
    const full = document.getElementById('t-full');
    const de = document.documentElement;
    if (!de.requestFullscreen && !de.webkitRequestFullscreen) full.remove();
    else full.addEventListener('touchstart', (e) => {
      e.preventDefault();
      try {
        if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        else (de.requestFullscreen || de.webkitRequestFullscreen).call(de);
      } catch (err) { /* not allowed */ }
    }, { passive: false });
  }

  function init() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
      if (!keys.has(e.code)) listeners.forEach((f) => f(e.code));
      keys.add(e.code);
      usingPad = false;
      if (usingTouch) { usingTouch = false; document.body.classList.remove('touch'); }
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => { keys.clear(); touch.id = null; touch.fire = touch.boost = touch.use = false; });
    setupTouch();
    // phones and tablets: show touch controls and touch instructions right away
    try { if (matchMedia('(pointer: coarse)').matches) { usingTouch = true; document.body.classList.add('touch'); } } catch (e) { /* */ }
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
    // touch screen
    if (touch.id !== null) {
      const dx = (touch.x - touch.ox) / STICK, dy = (touch.y - touch.oy) / STICK;
      const d = Math.hypot(dx, dy);
      if (d > 0.18) { const k = Math.min(1, d) / d; s.mx += dx * k; s.my += dy * k; }
    }
    s.fire = s.fire || touch.fire; s.boost = s.boost || touch.boost; s.use = s.use || touch.use;
    for (const k in touch.tap) if (touch.tap[k]) { s[k] = true; touch.tap[k] = false; }
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
      else if (usingTouch && navigator.vibrate) navigator.vibrate(Math.min(ms, 120));
    } catch (e) { /* not supported */ }
  }

  // how to say "press this button" for the controls you are using
  function say(action) {
    const T = { use: ['Tap ✋', 'Press A', 'Press E'], cont: ['Tap', 'Press A', 'Press E'], fire: ['the 🔱 button', 'X', 'Space'], journal: ['📖', 'Y', 'Q'] }[action];
    return usingTouch ? T[0] : usingPad ? T[1] : T[2];
  }

  return {
    init, update, rumble, say,
    get s() { return state; },
    get usingPad() { return usingPad; },
    get usingTouch() { return usingTouch; },
    onKey(f) { listeners.push(f); },
  };
})();
