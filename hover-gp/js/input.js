// ============================================================
//  SIGMA HOVER GP — CONTROLS
//  Keyboard for 1 or 2 players, and game controllers.
// ============================================================
window.HG = window.HG || {};

HG.Input = (function () {
  const U = HG.U;
  const down = new Set();          // keys held right now
  const pressed = new Set();       // keys pressed since last frame
  let players = 1;
  const padPrev = {};              // which pad buttons were down last frame
  const padPressed = [];           // [padIndex] = Set of buttons pressed this frame

  // which keys do what
  const KEYS = {
    solo: {
      left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], gas: ['ArrowUp', 'KeyW'], brake: ['ArrowDown', 'KeyS'],
      drift: ['Space', 'ShiftLeft', 'ShiftRight', 'KeyK'], item: ['KeyE', 'KeyQ', 'KeyJ', 'Enter', 'ControlLeft', 'ControlRight'], look: ['KeyC', 'KeyL'],
    },
    p1: { left: ['KeyA'], right: ['KeyD'], gas: ['KeyW'], brake: ['KeyS'], drift: ['Space', 'ShiftLeft'], item: ['KeyE', 'KeyQ'], look: ['KeyC'] },
    p2: {
      left: ['ArrowLeft'], right: ['ArrowRight'], gas: ['ArrowUp'], brake: ['ArrowDown'],
      drift: ['ShiftRight', 'Slash', 'Numpad0'], item: ['Enter', 'Period', 'NumpadEnter', 'ControlRight'], look: ['Comma'],
    },
  };
  const GAME_KEYS = new Set(Object.values(KEYS.solo).flat().concat(Object.values(KEYS.p2).flat(), ['Tab']));

  function init() {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      if (!down.has(e.code) && !e.repeat) pressed.add(e.code);
      down.add(e.code);
    });
    window.addEventListener('keyup', (e) => down.delete(e.code));
    window.addEventListener('blur', () => down.clear());
  }

  const any = (codes) => codes.some((c) => down.has(c));
  const anyPressed = (codes) => codes.some((c) => pressed.has(c));

  function pads() {
    const list = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter((p) => p && p.connected) : [];
    return list;
  }
  // which controller belongs to which player
  function padFor(p) {
    const list = pads();
    if (players === 1) return list[0] || null;
    if (list.length === 1) return p === 1 ? list[0] : null;
    return list[p] || null;
  }
  const btn = (pad, i) => !!(pad && pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
  const btnVal = (pad, i) => (pad && pad.buttons[i] ? pad.buttons[i].value : 0);

  // read the driving controls for local player p (0 or 1)
  function read(p, out) {
    const K = players === 1 ? KEYS.solo : p === 0 ? KEYS.p1 : KEYS.p2;
    let steer = (any(K.right) ? 1 : 0) - (any(K.left) ? 1 : 0);
    let gas = any(K.gas) ? 1 : 0, brake = any(K.brake) ? 1 : 0;
    let drift = any(K.drift), item = any(K.item), look = any(K.look);
    const pad = padFor(p);
    if (pad) {
      const ax = pad.axes[0] || 0;
      if (Math.abs(ax) > 0.15) steer = U.clamp((ax - Math.sign(ax) * 0.15) / 0.85, -1, 1);
      if (btn(pad, 14)) steer = -1; if (btn(pad, 15)) steer = 1;
      if (btn(pad, 0) || btnVal(pad, 7) > 0.3) gas = Math.max(gas, 1);
      if (btn(pad, 1)) brake = 1;
      if (btn(pad, 5)) drift = true;
      if (btn(pad, 4) || btn(pad, 6) || btn(pad, 2)) item = true;
      if (btn(pad, 3)) look = true;
      // stick down = throw backwards
      if ((pad.axes[1] || 0) > 0.6) out.back = true;
    }
    out.gasKey = gas > 0;
    if (HG.settings.autoGas[p] && !brake) gas = 1;
    out.steer = steer; out.gas = gas; out.brake = brake; out.drift = drift; out.item = item; out.lookBack = look;
    out.back = out.back || (brake > 0 && item);
    return out;
  }

  // menu buttons from any keyboard or controller
  const MENU = { up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'], ok: ['Enter', 'Space', 'NumpadEnter'], back: ['Escape', 'Backspace'], pause: ['Escape', 'KeyP'] };
  function menu() {
    const r = {};
    for (const k in MENU) r[k] = anyPressed(MENU[k]);
    pads().forEach((pad, i) => {
      const pp = padPressed[pad.index] || new Set();
      if (pp.has(12)) r.up = true; if (pp.has(13)) r.down = true; if (pp.has(14)) r.left = true; if (pp.has(15)) r.right = true;
      if (pp.has(0)) r.ok = true; if (pp.has(1)) r.back = true; if (pp.has(9)) r.pause = true;
      if (pp.has('su')) r.up = true; if (pp.has('sd')) r.down = true; if (pp.has('sl')) r.left = true; if (pp.has('sr')) r.right = true;
    });
    return r;
  }
  // which player pressed pause (for split screen)
  function padPausePressed() { return pads().some((p) => (padPressed[p.index] || new Set()).has(9)); }

  // pads must be read at the START of a frame so "pressed" is fresh
  function poll() {
    for (const pad of pads()) {
      const prev = padPrev[pad.index] || {};
      const set = new Set();
      pad.buttons.forEach((b, i) => { if ((b.pressed || b.value > 0.5) && !prev[i]) set.add(i); });
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      if (ax < -0.6 && !prev.sl) set.add('sl'); if (ax > 0.6 && !prev.sr) set.add('sr');
      if (ay < -0.6 && !prev.su) set.add('su'); if (ay > 0.6 && !prev.sd) set.add('sd');
      padPressed[pad.index] = set;
    }
  }
  function endFrame() {
    pressed.clear();
    for (const pad of pads()) {
      const now = {};
      pad.buttons.forEach((b, i) => { now[i] = b.pressed || b.value > 0.5; });
      const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
      now.sl = ax < -0.6; now.sr = ax > 0.6; now.su = ay < -0.6; now.sd = ay > 0.6;
      padPrev[pad.index] = now;
    }
  }

  return {
    init, read, menu, poll, endFrame, padPausePressed, pads,
    keyPressed: (c) => pressed.has(c), keyDown: (c) => down.has(c),
    set players(n) { players = n; }, get players() { return players; },
    KEYS,
  };
})();
