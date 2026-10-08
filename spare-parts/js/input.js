// ============================================================
//  SPARE PARTS — CONTROLS (keyboard and gamepads)
// ============================================================
window.SP = window.SP || {};

// fun numbers we show at the end of each level (slaps, falls...)
SP.stats = {};
SP.stat = (name) => { SP.stats[name] = (SP.stats[name] || 0) + 1; };

SP.Input = (function () {
  const keys = new Set();
  const KEYMAP = [
    { // PLAYER 1: Bolt (left side of the keyboard)
      up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], jump: ['Space'],
      arm: ['KeyQ'], leg: ['KeyE'], recall: ['KeyR'], emote: ['KeyG'],
    },
    { // PLAYER 2: Nutty (arrows + right side)
      up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], jump: ['Enter', 'NumpadEnter', 'Numpad0'],
      arm: ['Comma', 'Numpad1'], leg: ['Period', 'Numpad2'], recall: ['Slash', 'Numpad3'], emote: ['Quote', 'Numpad4'],
    },
  ];
  const pads = [null, null];   // which gamepad belongs to each player
  const prev = [{}, {}];       // buttons last frame (to find new presses)
  const holdTime = [{}, {}];   // how long each button has been held down

  function init() {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Slash', 'Quote'].includes(e.code)) e.preventDefault();
      keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => keys.clear());
    window.addEventListener('gamepaddisconnected', (e) => { for (let i = 0; i < 2; i++) if (pads[i] === e.gamepad.index) pads[i] = null; });
  }

  const down = (list) => list.some((k) => keys.has(k));
  const dz = (v) => (Math.abs(v) < 0.18 ? 0 : (v - Math.sign(v) * 0.18) / 0.82);

  function getPads() {
    try { return navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return []; }
  }

  // a gamepad nobody is using joins when you press any button
  function pollJoin() {
    for (const gp of getPads()) {
      if (!gp || pads[0] === gp.index || pads[1] === gp.index) continue;
      if (gp.buttons.some((b) => b.pressed)) {
        const slot = pads[0] === null ? 0 : pads[1] === null ? 1 : -1;
        if (slot >= 0) pads[slot] = gp.index;
      }
    }
  }

  // everything a player is pressing this frame
  function read(i, dt = 0) {
    const k = KEYMAP[i];
    const s = {
      x: (down(k.right) ? 1 : 0) - (down(k.left) ? 1 : 0),
      z: (down(k.down) ? 1 : 0) - (down(k.up) ? 1 : 0),
      jump: down(k.jump), arm: down(k.arm), leg: down(k.leg), recall: down(k.recall), emote: down(k.emote), pause: false,
    };
    const gp = pads[i] !== null ? getPads()[pads[i]] : null;
    if (gp) {
      const b = (n) => gp.buttons[n] && gp.buttons[n].pressed;
      s.x += dz(gp.axes[0] || 0);
      s.z += dz(gp.axes[1] || 0);
      if (b(14)) s.x -= 1; if (b(15)) s.x += 1;
      if (b(12)) s.z -= 1; if (b(13)) s.z += 1;
      s.jump = s.jump || b(0);
      s.arm = s.arm || b(5) || b(2);     // RB or X: throw an arm
      s.leg = s.leg || b(7) || b(3);     // RT or Y: throw a leg
      s.recall = s.recall || b(4) || b(6) || b(1); // LB, LT or B: call your limbs back
      s.emote = s.emote || b(10) || b(11) || b(8);  // stick click or Back: silly dance
      s.pause = b(9);                               // Start: pause
    }
    // don't move faster on diagonals
    const len = Math.hypot(s.x, s.z);
    if (len > 1) { s.x /= len; s.z /= len; }
    // new presses (true only on the first frame)
    const names = ['jump', 'arm', 'leg', 'recall', 'emote', 'pause'];
    for (const name of names) s[name + 'Pressed'] = s[name] && !prev[i][name];
    prev[i] = {};
    for (const name of names) prev[i][name] = s[name];
    // hold timers: armHold = seconds held so far, armReleased = how long it was held when you let go
    for (const name of ['arm', 'leg', 'recall']) {
      const h = holdTime[i];
      if (s[name]) { h[name] = (h[name] || 0) + dt; s[name + 'Hold'] = h[name]; }
      else { s[name + 'Hold'] = 0; s[name + 'Released'] = h[name] || 0; h[name] = 0; }
    }
    return s;
  }

  return { init, read, pollJoin, pads };
})();
