// ============================================================
//  FLOPPY PARTY — CONTROLS (keyboard and gamepads)
//  + a little message system so sounds and effects can react
//    to things like punches ("bus.emit('punch', ...)")
// ============================================================
window.FP = window.FP || {};

FP.bus = (function () {
  const handlers = {};
  return {
    on(name, f) { (handlers[name] = handlers[name] || []).push(f); },
    emit(name, data) { (handlers[name] || []).forEach((f) => f(data)); },
  };
})();

FP.Input = (function () {
  const keys = new Set();
  const tapAt = {}; // when each key was last pressed down (so a quick tap between two frames is never lost)
  const KEYMAP = [
    { // PLAYER 1 (left side)
      up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
      jump: ['Space'], punch: ['KeyF'], grab: ['KeyG', 'ShiftLeft'], grabL: ['KeyQ'], grabR: ['KeyE'], color: ['KeyZ'], hat: ['KeyX'], outfit: ['KeyC'],
      emotes: [['Digit1'], ['Digit2'], ['Digit3'], ['Digit4']],
    },
    { // PLAYER 2 (right side)
      up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      jump: ['Slash', 'Numpad0'], punch: ['Period', 'Numpad1'], grab: ['Comma', 'ShiftRight', 'Numpad2'], grabL: ['Semicolon', 'Numpad3'], grabR: ['Quote', 'NumpadDecimal'], color: ['KeyK', 'Numpad4'], hat: ['KeyL', 'Numpad5'], outfit: ['KeyJ', 'Numpad6'],
      emotes: [['Digit8', 'Numpad7'], ['Digit9', 'Numpad8'], ['Digit0', 'Numpad9'], ['Minus', 'NumpadAdd']],
    },
  ];
  const pads = [null, null, null, null]; // up to 4 controllers
  const prev = {};
  const listeners = [];

  function init() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash', 'Quote', 'Tab'].includes(e.code)) e.preventDefault();
      if (!keys.has(e.code)) { tapAt[e.code] = performance.now(); listeners.forEach((f) => f(e.code)); }
      keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());
  }

  const down = (list) => list.some((k) => keys.has(k));
  const dz = (v) => (Math.abs(v) < 0.2 ? 0 : (v - Math.sign(v) * 0.2) / 0.8);
  function getPads() {
    try { return navigator.getGamepads ? Array.from(navigator.getGamepads()) : []; } catch (e) { return []; }
  }

  // which controllers are plugged in and have had a button pressed
  function activePads() {
    return getPads().filter((gp) => gp && gp.buttons.some((b) => b.pressed));
  }

  // read a "source": { kind: 'keys', map: 0|1 } or { kind: 'pad', index }
  function read(source, id) {
    if (source.kind === 'touch') return FP.Touch ? FP.Touch.read(id) : { x: 0, z: 0 };
    const s = { x: 0, z: 0, jump: false, punch: false, grab: false, start: false, color: false, hat: false, outfit: false };
    if (source.kind === 'keys') {
      const k = KEYMAP[source.map];
      s.x = (down(k.right) ? 1 : 0) - (down(k.left) ? 1 : 0);
      s.z = (down(k.down) ? 1 : 0) - (down(k.up) ? 1 : 0);
      s.jump = down(k.jump); s.punch = down(k.punch);
      // one hand or both (like Gang Beasts): left hand, right hand, or the both-hands button
      s.grabL = down(k.grab) || down(k.grabL); s.grabR = down(k.grab) || down(k.grabR); s.grab = s.grabL || s.grabR; s.color = down(k.color); s.hat = down(k.hat); s.outfit = down(k.outfit);
    } else if (source.kind === 'pad') {
      const gp = getPads()[source.index];
      if (gp) {
        const b = (n) => gp.buttons[n] && (gp.buttons[n].pressed || gp.buttons[n].value > 0.4);
        s.x = dz(gp.axes[0] || 0); s.z = dz(gp.axes[1] || 0);
        if (b(14)) s.x -= 1; if (b(15)) s.x += 1; if (b(12)) s.z -= 1; if (b(13)) s.z += 1;
        s.jump = b(0);
        s.punch = b(2) || b(1);
        s.grabL = b(4) || b(6); s.grabR = b(5) || b(7); // left bumper/trigger = left hand, right = right hand
        s.grab = s.grabL || s.grabR;
        s.start = b(9); s.color = b(8); s.hat = b(3); s.outfit = b(11); s.dance = b(10);
      }
    }
    const len = Math.hypot(s.x, s.z);
    if (len > 1) { s.x /= len; s.z /= len; }
    const p = prev[id] || {};
    const now = performance.now();
    if (source.kind === 'keys') {
      // pressed since the last time we looked (even if already let go again)
      const k = KEYMAP[source.map], since = p.t || now;
      const tapped = (list) => list.some((c) => (tapAt[c] || 0) > since);
      s.jumpPressed = tapped(k.jump); s.punchPressed = tapped(k.punch);
      s.colorPressed = tapped(k.color); s.hatPressed = tapped(k.hat); s.outfitPressed = tapped(k.outfit);
      s.startPressed = false;
      s.emote = k.emotes.findIndex((list) => tapped(list)) + 1; // 1 wave, 2 dance, 3 cheer, 4 touch your nose (0 = none)
    } else {
      s.jumpPressed = s.jump && !p.jump;
      s.punchPressed = s.punch && !p.punch;
      s.startPressed = s.start && !p.start;
      s.colorPressed = s.color && !p.color;
      s.hatPressed = s.hat && !p.hat;
      s.outfitPressed = s.outfit && !p.outfit;
      // emotes on a controller: Back wave, left stick click dance, Y cheer, right stick click touch your nose
      s.emote = s.dance && !p.dance ? 2 : s.colorPressed ? 1 : s.hatPressed ? 3 : s.outfitPressed ? 4 : 0;
    }
    prev[id] = { jump: s.jump, punch: s.punch, start: s.start, color: s.color, hat: s.hat, outfit: s.outfit, dance: s.dance, t: now };
    return s;
  }

  return { init, read, activePads, getPads, keys, onKey: (f) => listeners.push(f), KEYMAP };
})();
