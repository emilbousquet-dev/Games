// ============================================================
//  DRAGON LIFE — CONTROLS (keyboard and mouse)
// ============================================================
window.DL = window.DL || {};

DL.Input = (function () {
  const keys = {};
  const presses = new Set();     // buttons pressed since the last frame
  const look = { x: 0, y: 0 };   // how far the mouse moved since the last frame
  let locked = false, canvas = null, dragging = false, mouseDown = false;
  let enabled = false;

  const BIND = {
    KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    Space: 'jump', ShiftLeft: 'run', ShiftRight: 'run', KeyC: 'down', ControlLeft: 'down', ControlRight: 'down',
    KeyE: 'use', KeyF: 'dragon', KeyQ: 'cycle', KeyB: 'build', KeyR: 'rotate', KeyX: 'remove',
    KeyI: 'bag', Tab: 'bag', KeyJ: 'journal', KeyM: 'map', Escape: 'pause', KeyP: 'pause', Enter: 'enter',
    Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3', Digit4: 'slot4', Digit5: 'slot5', Digit6: 'slot6',
    Digit7: 'slot7', Digit8: 'slot8', Digit9: 'slot9', Digit0: 'slot10', KeyG: 'whistle', KeyH: 'help',
  };
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA'); };

  function init(c) {
    canvas = c;
    window.addEventListener('keydown', (e) => {
      if (typing()) return;
      const b = BIND[e.code];
      if (!b) return;
      if (b !== 'enter') e.preventDefault();
      if (!keys[b] && !e.repeat) presses.add(b);
      keys[b] = true;
    });
    window.addEventListener('keyup', (e) => { const b = BIND[e.code]; if (b) keys[b] = false; });
    window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; });

    document.addEventListener('pointerlockchange', () => {
      const was = locked;
      locked = document.pointerLockElement === canvas;
      if (was && !locked && enabled) presses.add('unlock');
    });
    document.addEventListener('mousemove', (e) => {
      if (!enabled) return;
      if (locked) {
        // some browsers send giant jumps sometimes, ignore those
        if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
        look.x += e.movementX; look.y += e.movementY;
      } else if (dragging) {
        // the mouse can't be locked: drag to look around
        look.x += e.movementX * 1.5; look.y += e.movementY * 1.5;
      }
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!enabled) return;
      if (!locked) lock();
      dragging = true;
      if (e.button === 0) { presses.add('click'); mouseDown = true; }
      if (e.button === 2) presses.add('rclick');
    });
    window.addEventListener('mouseup', (e) => { dragging = false; if (e.button === 0) mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { if (enabled) presses.add(e.deltaY > 0 ? 'wheelDown' : 'wheelUp'); }, { passive: true });
  }

  function lock() {
    if (!canvas.requestPointerLock) return;
    try {
      const p = canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { canvas.requestPointerLock(); } catch (e) { /* no lock */ } });
    } catch (e) { try { canvas.requestPointerLock(); } catch (e2) { /* no lock */ } }
  }
  function unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

  return {
    init, lock, unlock,
    down: (b) => !!keys[b],
    pressed: (b) => presses.has(b),
    consume: (b) => { const had = presses.has(b); presses.delete(b); return had; },
    mouseHeld: () => mouseDown,
    takeLook() { const l = { x: look.x, y: look.y }; look.x = 0; look.y = 0; return l; },
    endFrame() { presses.clear(); },
    setEnabled(v) { enabled = v; if (!v) { for (const k in keys) keys[k] = false; mouseDown = false; dragging = false; } },
    get locked() { return locked; },
  };
})();
