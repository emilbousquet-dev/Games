// ============================================================
//  DEAD ACRES — CONTROLS (keyboard, mouse and a gamepad)
// ============================================================
window.DA = window.DA || {};

DA.Input = (function () {
  const keys = new Set();
  const pressedQ = new Set();        // keys pressed since the last frame
  const mouse = { dx: 0, dy: 0, locked: false, left: false, right: false, leftPressed: false, rightPressed: false, wheel: 0 };
  let padIndex = null;
  const padPrev = [];
  let typing = false;                 // true while writing in the chat box

  // which keys do what
  const BIND = {
    fwd: ['KeyW', 'ArrowUp'], back: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    jump: ['Space'], sprint: ['ShiftLeft', 'ShiftRight'], crouch: ['KeyC', 'ControlLeft'], use: ['KeyE'], rotate: ['KeyR'],
    inv: ['Tab', 'KeyI'], map: ['KeyM'], chat: ['KeyT', 'Enter'], pause: ['Escape', 'KeyP'], drop: ['KeyQ'],
  };

  function init(canvas) {
    window.addEventListener('keydown', (e) => {
      if (typing) return;
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!keys.has(e.code)) pressedQ.add(e.code);
      keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => { keys.clear(); mouse.left = mouse.right = false; });
    document.addEventListener('mousemove', (e) => {
      if (mouse.locked) { mouse.dx += e.movementX; mouse.dy += e.movementY; }
    });
    document.addEventListener('mousedown', (e) => {
      if (!mouse.locked) return;
      if (e.button === 0) { mouse.left = true; mouse.leftPressed = true; }
      if (e.button === 2) { mouse.right = true; mouse.rightPressed = true; }
    });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) mouse.left = false; if (e.button === 2) mouse.right = false; });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('wheel', (e) => { if (mouse.locked) mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => { mouse.locked = document.pointerLockElement === canvas; if (!mouse.locked) { mouse.left = mouse.right = false; } });
    window.addEventListener('gamepadconnected', (e) => { if (padIndex === null) padIndex = e.gamepad.index; });
    window.addEventListener('gamepaddisconnected', (e) => { if (padIndex === e.gamepad.index) padIndex = null; });
  }

  const down = (name) => BIND[name].some((k) => keys.has(k));
  const pressed = (name) => BIND[name].some((k) => pressedQ.has(k));
  const dz = (v) => (Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84);
  function getPad() {
    try {
      const list = navigator.getGamepads ? navigator.getGamepads() : [];
      if (padIndex === null) for (const gp of list) if (gp && gp.buttons.some((b) => b.pressed)) padIndex = gp.index;
      return padIndex !== null ? list[padIndex] : null;
    } catch (e) { return null; }
  }

  // everything the player is doing this frame
  function read() {
    const s = {
      move: (down('fwd') ? 1 : 0) - (down('back') ? 1 : 0),
      strafe: (down('right') ? 1 : 0) - (down('left') ? 1 : 0),
      lookX: 0, lookY: 0,
      jump: down('jump'), sprint: down('sprint'), crouch: down('crouch'),
      attack: mouse.left, attackPressed: mouse.leftPressed,
      aim: mouse.right, aimPressed: mouse.rightPressed,
      usePressed: pressed('use'), rotatePressed: pressed('rotate'), dropPressed: pressed('drop'),
      invPressed: pressed('inv'), mapPressed: pressed('map'), chatPressed: pressed('chat'), pausePressed: pressed('pause'),
      slot: -1, wheel: mouse.wheel, pad: false,
    };
    for (let i = 1; i <= 6; i++) if (pressedQ.has('Digit' + i) || pressedQ.has('Numpad' + i)) s.slot = i - 1;
    const sens = 0.0022 * (api.sensitivity || 1);
    if (mouse.locked) { s.lookX = mouse.dx * sens; s.lookY = mouse.dy * sens; }
    mouse.dx = mouse.dy = 0; mouse.leftPressed = mouse.rightPressed = false; mouse.wheel = 0;
    const gp = getPad();
    if (gp) {
      const b = (n) => gp.buttons[n] && (gp.buttons[n].pressed || gp.buttons[n].value > 0.4);
      const bp = (n) => b(n) && !padPrev[n];
      const ax = gp.axes;
      const mv = -dz(ax[1] || 0), st = dz(ax[0] || 0);
      if (mv || st) s.pad = true;
      s.move = DA.U.clamp(s.move + mv, -1, 1); s.strafe = DA.U.clamp(s.strafe + st, -1, 1);
      s.lookX += dz(ax[2] || 0) * 0.045; s.lookY += dz(ax[3] || 0) * 0.035;
      s.jump = s.jump || b(0);
      s.sprint = s.sprint || b(10) || b(6);
      s.crouch = s.crouch || b(11);
      s.attack = s.attack || b(7); s.attackPressed = s.attackPressed || bp(7);
      s.usePressed = s.usePressed || bp(2);
      s.rotatePressed = s.rotatePressed || bp(1);
      s.invPressed = s.invPressed || bp(3);
      s.mapPressed = s.mapPressed || bp(8);
      s.pausePressed = s.pausePressed || bp(9);
      if (bp(4)) s.wheel -= 1;
      if (bp(5)) s.wheel += 1;
      for (let i = 0; i < gp.buttons.length; i++) padPrev[i] = b(i);
    }
    pressedQ.clear();
    return s;
  }

  function rumble(strength = 0.6, ms = 200) {
    const gp = getPad();
    try { if (gp && gp.vibrationActuator) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength }); } catch (e) { /* not supported */ }
  }

  const api = {
    sensitivity: (() => { try { return +(localStorage.getItem('deadacres.sens') || 1); } catch (e) { return 1; } })(),
    init, read, rumble, mouse, keys,
    clearPressed: () => pressedQ.clear(),
    set typing(v) { typing = v; keys.clear(); },
    get typing() { return typing; },
    isDown: (code) => keys.has(code),
  };
  return api;
})();
