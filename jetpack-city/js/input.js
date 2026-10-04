// ============================================================
//  JETPACK CITY — CONTROLS
//  On a phone: SWIPE with your thumb, TAP to swing the OmniWrench.
//  On a computer: arrow keys or W A S D, Space / E / X to swing.
//  You can also drag the mouse like a swipe.
// ============================================================
window.JC = window.JC || {};

JC.Input = (function () {
  const queue = [];          // moves waiting to be used: 'left', 'right', 'up', 'down', 'pause'
  const SWIPE = 28;          // how far (pixels) your finger must move to count as a swipe
  let touch = null;          // the finger that is on the screen right now
  let enabled = false;

  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', KeyZ: 'up',
    Space: 'swing', KeyE: 'swing', KeyX: 'swing',
    ArrowDown: 'down', KeyS: 'down',
    Escape: 'pause', KeyP: 'pause',
  };

  function push(move) { if (enabled || move === 'pause') { queue.push(move); if (queue.length > 3) queue.shift(); } }

  function init(area) {
    window.addEventListener('keydown', (e) => {
      const move = KEYS[e.code];
      if (!move) return;
      e.preventDefault();
      if (!e.repeat) push(move);
    });
    // pointer events work for fingers AND the mouse
    area.addEventListener('pointerdown', (e) => {
      touch = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), done: false };
    });
    area.addEventListener('pointermove', (e) => {
      if (!touch || touch.id !== e.pointerId || touch.done) return;
      const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
      // fire the swipe as soon as the finger has moved far enough, so it feels fast
      if (Math.hypot(dx, dy) >= SWIPE) {
        if (Math.abs(dx) > Math.abs(dy)) push(dx > 0 ? 'right' : 'left');
        else push(dy > 0 ? 'down' : 'up');
        touch.done = true;
      }
    });
    const end = (e) => {
      if (!touch || touch.id !== e.pointerId) return;
      // a quick tap without moving = swing the OmniWrench
      if (!touch.done && e.type === 'pointerup' && performance.now() - touch.t < 250) push('swing');
      touch = null;
    };
    area.addEventListener('pointerup', end);
    area.addEventListener('pointercancel', end);
    // stop the page from scrolling or zooming while you play
    area.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturestart', (e) => e.preventDefault());
  }

  function next() { return queue.shift(); }
  function clear() { queue.length = 0; }
  function setEnabled(v) { enabled = v; if (!v) clear(); }

  return { init, next, clear, setEnabled };
})();
