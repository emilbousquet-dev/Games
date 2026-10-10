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
      jump: ['Space'], punch: ['KeyF'], grab: ['KeyG', 'ShiftLeft'], grabL: ['KeyQ'], grabR: ['KeyE'], color: ['KeyZ'], hat: ['KeyX'], outfit: ['KeyC'], flop: ['KeyR'],
      emotes: [['Digit1'], ['Digit2'], ['Digit3'], ['Digit4']],
    },
    { // PLAYER 2 (right side)
      up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
      jump: ['Slash', 'Numpad0'], punch: ['Period', 'Numpad1'], grab: ['Comma', 'ShiftRight', 'Numpad2'], grabL: ['Semicolon', 'Numpad3'], grabR: ['Quote', 'NumpadDecimal'], color: ['KeyK', 'Numpad4'], hat: ['KeyL', 'Numpad5'], outfit: ['KeyJ', 'Numpad6'], flop: ['KeyO'],
      emotes: [['Digit8', 'Numpad7'], ['Digit9', 'Numpad8'], ['Digit0', 'Numpad9'], ['Minus', 'NumpadSubtract']],
    },
  ];
  // ---------------- your own keys (Settings > Controls) ----------------
  const DEFAULT_KEYS = KEYMAP.map((m) => JSON.parse(JSON.stringify(m)));
  const BINDABLE = ['up', 'down', 'left', 'right', 'jump', 'punch', 'grab', 'grabL', 'grabR', 'flop'];
  const RESERVED = ['Escape', 'KeyH', 'KeyM', 'KeyP', 'Enter', 'NumpadEnter', 'Tab', 'Backspace', 'MetaLeft', 'MetaRight', 'ContextMenu', 'CapsLock'];
  try {
    const saved = JSON.parse(localStorage.getItem('floppy-keys') || 'null');
    if (saved) [0, 1].forEach((m) => { for (const a of BINDABLE) if (saved[m] && Array.isArray(saved[m][a]) && saved[m][a].every((c) => typeof c === 'string')) KEYMAP[m][a] = saved[m][a].slice(0, 3); });
  } catch (e) { /* no saving */ }
  function saveKeys() { try { localStorage.setItem('floppy-keys', JSON.stringify(KEYMAP.map((m) => Object.fromEntries(BINDABLE.map((a) => [a, m[a]]))))); } catch (e) { /* no saving */ } }
  // which action (on which side of the keyboard) uses a key already?
  function whoUses(code) {
    for (let m = 0; m < 2; m++) {
      for (const [a, v] of Object.entries(KEYMAP[m])) {
        const list = a === 'emotes' ? v.flat() : v;
        if (list.includes(code)) return { map: m, action: a };
      }
    }
    return null;
  }
  // set a key. If another move already uses it, the two moves swap keys. Returns false if the key can't be used
  function bind(map, action, code) {
    if (!BINDABLE.includes(action) || RESERVED.includes(code)) return false;
    const other = whoUses(code);
    if (other && !BINDABLE.includes(other.action)) return false; // (emotes and lobby keys stay where they are)
    const old = KEYMAP[map][action].slice();
    if (other && !(other.map === map && other.action === action)) {
      const rest = KEYMAP[other.map][other.action].filter((c) => c !== code);
      KEYMAP[other.map][other.action] = rest.length ? rest : [old[0]];
    }
    KEYMAP[map][action] = [code];
    saveKeys();
    return true;
  }
  function resetKeys(map) { for (const a of BINDABLE) KEYMAP[map][a] = DEFAULT_KEYS[map][a].slice(); saveKeys(); }
  const NAMES = { Space: 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Slash: '/', Period: '.', Comma: ',', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\', Minus: '-', Equal: '=', Backquote: '`', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', ControlLeft: 'Left Ctrl', ControlRight: 'Right Ctrl', AltLeft: 'Left Alt', AltRight: 'Right Alt', NumpadDecimal: 'Num .', NumpadAdd: 'Num +', NumpadSubtract: 'Num -', NumpadMultiply: 'Num *', NumpadDivide: 'Num /', Delete: 'Delete', Insert: 'Insert', Home: 'Home', End: 'End', PageUp: 'Page Up', PageDown: 'Page Down' };
  function keyName(code) {
    if (!code) return '?';
    if (NAMES[code]) return NAMES[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad\d$/.test(code)) return 'Num ' + code.slice(6);
    return code.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  // the key for a move, like "Space", or for walking: "W A S D" / "Arrows"
  function label(map, action) {
    const k = KEYMAP[map] || KEYMAP[0];
    if (action === 'move') {
      const four = ['up', 'left', 'down', 'right'].map((a) => keyName(k[a][0]));
      if (four.join('') === 'UpLeftDownRight') return 'Arrows';
      return four.join(' ');
    }
    return keyName((k[action] || [])[0]);
  }
  const kbd = (map, action) => (action === 'move' && label(map, 'move') !== 'Arrows' ? label(map, 'move').split(' ').map((x) => `<kbd>${x}</kbd>`).join(' ') : `<kbd>${label(map, action)}</kbd>`);

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
      s.grabL = down(k.grab) || down(k.grabL); s.grabR = down(k.grab) || down(k.grabR); s.grab = s.grabL || s.grabR; s.color = down(k.color); s.hat = down(k.hat); s.outfit = down(k.outfit); s.flop = down(k.flop || []);
    } else if (source.kind === 'pad') {
      const gp = getPads()[source.index];
      if (gp) {
        const b = (n) => gp.buttons[n] && (gp.buttons[n].pressed || gp.buttons[n].value > 0.4);
        s.x = dz(gp.axes[0] || 0); s.z = dz(gp.axes[1] || 0);
        if (b(14)) s.x -= 1; if (b(15)) s.x += 1; if (b(12)) s.z -= 1; if (b(13)) s.z += 1;
        s.jump = b(0);
        s.punch = b(2);
        s.flop = b(1); // B: play dead
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
      s.jumpPressed = tapped(k.jump); s.punchPressed = tapped(k.punch); s.flopPressed = tapped(k.flop || []);
      s.colorPressed = tapped(k.color); s.hatPressed = tapped(k.hat); s.outfitPressed = tapped(k.outfit);
      s.startPressed = false;
      s.emote = k.emotes.findIndex((list) => tapped(list)) + 1; // 1 wave, 2 dance, 3 cheer (0 = none)
    } else {
      s.jumpPressed = s.jump && !p.jump;
      s.punchPressed = s.punch && !p.punch;
      s.flopPressed = s.flop && !p.flop;
      s.startPressed = s.start && !p.start;
      s.colorPressed = s.color && !p.color;
      s.hatPressed = s.hat && !p.hat;
      s.outfitPressed = s.outfit && !p.outfit;
      // emotes on a controller: Back, left stick click, Y and right stick click (emote buttons 1 to 4)
      s.emote = s.dance && !p.dance ? 2 : s.colorPressed ? 1 : s.hatPressed ? 3 : s.outfitPressed ? 4 : 0;
    }
    prev[id] = { jump: s.jump, punch: s.punch, start: s.start, color: s.color, hat: s.hat, outfit: s.outfit, dance: s.dance, flop: s.flop, t: now };
    return s;
  }

  return { init, read, activePads, getPads, keys, onKey: (f) => listeners.push(f), KEYMAP, BINDABLE, bind, resetKeys, keyName, label, kbd };
})();
