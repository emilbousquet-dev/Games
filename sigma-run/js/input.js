// ============================================================
//  SIGMA RUN — CONTROLS
//  Keyboard + mouse, a game controller, or a touch screen.
// ============================================================
window.SR = window.SR || {};

SR.Input = (function () {
  const keys = {};
  const presses = new Set();       // buttons pressed since the last frame
  const look = { x: 0, y: 0 };     // how far the mouse/finger moved since the last frame
  let locked = false, canvas = null, enabled = false;
  const touch = { on: false, stick: null, look: null, jumpHeld: false, slideHeld: false, sx: 0, sy: 0 };
  let pad = null, padPrev = {};
  // AUTO PARKOUR steering: -1 = far left, 1 = far right. Mouse, finger and keys all change it.
  let steer = 0;
  const isAuto = () => SR.settings.controls !== 'manual';
  const steerFromX = (x) => { steer = SR.U.clamp((x / window.innerWidth * 2 - 1) * 1.35, -1, 1); };

  const BIND = {
    KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', KeyD: 'right',
    ArrowLeft: 'turnL', ArrowRight: 'turnR',
    Space: 'jump', ShiftLeft: 'slide', ShiftRight: 'slide', KeyC: 'slide', ControlLeft: 'slide', ControlRight: 'slide',
    KeyF: 'fire', KeyE: 'sigma', KeyQ: 'sigma', Escape: 'pause', KeyP: 'pause', KeyM: 'mute', Enter: 'enter',
  };

  function init(c) {
    canvas = c;
    window.addEventListener('keydown', (e) => {
      const b = BIND[e.code];
      if (!b) return;
      if (b !== 'pause' && b !== 'enter') e.preventDefault();
      if (!keys[b] && !e.repeat) presses.add(b);
      keys[b] = true;
    });
    window.addEventListener('keyup', (e) => { const b = BIND[e.code]; if (b) keys[b] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

    // mouse
    document.addEventListener('pointerlockchange', () => {
      const was = locked;
      locked = document.pointerLockElement === canvas;
      if (was && !locked && enabled) presses.add('unlock');
    });
    document.addEventListener('mousemove', (e) => {
      // auto parkour: where the mouse is on the screen is where you run
      if (isAuto()) { if (enabled && !touch.on) steerFromX(e.clientX); return; }
      // if the mouse can't be locked (some browsers and embedded pages), moving it still steers
      if (!locked) { if (enabled && !touch.on && Math.abs(e.movementX) < 200) look.x += e.movementX * 1.2; return; }
      // some browsers send giant jumps sometimes, ignore those
      if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
      look.x += e.movementX; look.y += e.movementY;
    });
    const autoClick = (e) => {
      if (e.button === 0) presses.add('fire');
      if (e.button === 2) presses.add('sigma');
    };
    canvas.addEventListener('mousedown', (e) => {
      if (touch.on) return;
      if (isAuto()) { if (enabled) autoClick(e); return; }
      if (!locked && enabled) { lock(); return; }
      if (e.button === 0) presses.add('fire');
      if (e.button === 2) presses.add('sigma');
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // touch screen
    initTouch();
    window.addEventListener('gamepadconnected', (e) => { pad = e.gamepad.index; });
  }

  function lock() {
    if (touch.on || !canvas.requestPointerLock) return;
    try {
      const p = canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { canvas.requestPointerLock(); } catch (e) { /* no lock */ } });
    } catch (e) { try { canvas.requestPointerLock(); } catch (e2) { /* no lock */ } }
  }
  function unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

  function touchOn() { touch.on = true; document.body.classList.add('touchmode'); }
  function initTouch() {
    const ui = document.getElementById('touch');
    if (!ui) return;
    // phones and tablets: touch buttons right away. Laptops with touch screens: as soon as you touch.
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) touchOn();
    window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') touchOn(); }, true);
    const area = document.getElementById('touchArea');
    const stickEl = document.getElementById('stick'), knob = document.getElementById('knob');
    area.addEventListener('pointerdown', (e) => {
      if (isAuto()) {
        // auto parkour: touch anywhere and slide your finger left and right to steer
        if (e.pointerType === 'mouse') { if (enabled) autoClick(e); return; }
        touchOn(); touch.look = { id: e.pointerId }; steerFromX(e.clientX);
        return;
      }
      if (e.pointerType === 'mouse') return;
      touchOn();
      const left = e.clientX < window.innerWidth * 0.4;
      if (left && !touch.stick) {
        touch.stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY };
        stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px'; stickEl.classList.add('show');
      } else if (!touch.look) {
        touch.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
      }
    });
    area.addEventListener('pointermove', (e) => {
      if (isAuto()) { if (e.pointerType === 'mouse') { if (enabled) steerFromX(e.clientX); } else if (touch.look && touch.look.id === e.pointerId) steerFromX(e.clientX); return; }
      if (touch.stick && touch.stick.id === e.pointerId) {
        let dx = e.clientX - touch.stick.x0, dy = e.clientY - touch.stick.y0;
        const l = Math.hypot(dx, dy), max = 50;
        if (l > max) { dx *= max / l; dy *= max / l; }
        touch.sx = dx / max; touch.sy = dy / max;
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
      } else if (touch.look && touch.look.id === e.pointerId) {
        look.x += (e.clientX - touch.look.x) * 2.2; look.y += (e.clientY - touch.look.y) * 2.2;
        touch.look.x = e.clientX; touch.look.y = e.clientY;
      }
    });
    const end = (e) => {
      if (touch.stick && touch.stick.id === e.pointerId) { touch.stick = null; touch.sx = touch.sy = 0; knob.style.transform = ''; stickEl.classList.remove('show'); }
      if (touch.look && touch.look.id === e.pointerId) touch.look = null;
    };
    area.addEventListener('pointerup', end); area.addEventListener('pointercancel', end);
    const btn = (id, name, holdKey) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); presses.add(name); if (holdKey) touch[holdKey] = true; el.classList.add('down'); });
      const up = () => { if (holdKey) touch[holdKey] = false; el.classList.remove('down'); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    };
    btn('tJump', 'jump', 'jumpHeld'); btn('tSlide', 'slide', 'slideHeld'); btn('tFire', 'fire'); btn('tSigma', 'sigma'); btn('tPause', 'pause');
    document.addEventListener('touchmove', (e) => { if (enabled) e.preventDefault(); }, { passive: false });
  }

  // controllers have to be checked every frame
  function pollPad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = pad !== null ? pads[pad] : null;
    if (!gp) for (const p of pads) if (p) { gp = p; pad = p.index; break; }
    if (!gp) return null;
    const dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const st = {
      jump: b(0), slide: b(1) || b(2) || b(6) || b(10), fire: b(7), sigma: b(3) || b(4) || b(5), pause: b(9),
    };
    for (const k in st) { if (st[k] && !padPrev[k]) presses.add(k); }
    padPrev = st;
    look.x += dz(gp.axes[2] || 0) * 900 * dt;
    look.y += dz(gp.axes[3] || 0) * 600 * dt;
    if (isAuto() && Math.abs(gp.axes[0] || 0) > 0.15) steer = SR.U.clamp(gp.axes[0], -1, 1);
    return { x: dz(gp.axes[0] || 0), y: -dz(gp.axes[1] || 0), jump: st.jump, slide: st.slide };
  }

  // read everything once per frame
  function read(dt) {
    const p = pollPad(dt);
    let mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let my = (keys.fwd ? 1 : 0) - (keys.back ? 1 : 0);
    if (p) { mx += p.x; my += p.y; }
    if (touch.stick) { mx += touch.sx; my -= touch.sy; }
    // auto parkour: keys move you left and right
    if (isAuto()) {
      const dir = (keys.right || keys.turnR ? 1 : 0) - (keys.left || keys.turnL ? 1 : 0);
      if (dir) steer = SR.U.clamp(steer + dir * 2.6 * dt, -1, 1);
    }
    // keyboard turning with the arrow keys
    const turn = (keys.turnR ? 1 : 0) - (keys.turnL ? 1 : 0);
    const out = {
      mx: SR.U.clamp(mx, -1, 1), my: SR.U.clamp(my, -1, 1),
      lookX: look.x + turn * 700 * dt, lookY: look.y,
      jumpHeld: !!keys.jump || touch.jumpHeld || (p && p.jump),
      slideHeld: !!keys.slide || touch.slideHeld || (p && p.slide),
      pressed: new Set(presses),
      steer,
    };
    look.x = look.y = 0;
    presses.clear();
    return out;
  }

  return {
    init, read, lock, unlock,
    setEnabled(v) { enabled = v; if (!v) { presses.clear(); look.x = look.y = 0; } },
    clear() { presses.clear(); look.x = look.y = 0; },
    resetSteer() { steer = 0; },
    isAuto,
    get locked() { return locked; },
    get touch() { return touch.on; },
    keyHeld: (k) => !!keys[k],
  };
})();
