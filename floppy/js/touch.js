// ============================================================
//  FLOPPY PARTY — TOUCH CONTROLS (phones and tablets)
//  A joystick on the left, and Jump, Punch, Grab and Emote
//  buttons on the right. Only shows up on touch screens.
// ============================================================
window.FP = window.FP || {};

FP.Touch = (function () {
  const available = (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) && !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const state = { x: 0, z: 0, jump: false, punch: false, grab: false };
  const taps = { jump: 0, punch: 0, emote: 0, flop: 0 };
  let emoteKind = 0, box = null, knob = null, stickId = null, stickCenter = null;

  function build() {
    box = document.createElement('div');
    box.className = 'touch';
    box.hidden = true;
    box.innerHTML = `
      <div class="stick"><div class="knob"></div></div>
      <div class="tbtns">
        <button class="tbtn emote" data-b="emote">Emote</button>
        <button class="tbtn flop" data-b="flop">Flop</button>
        <button class="tbtn grab" data-b="grab">Grab</button>
        <button class="tbtn punch" data-b="punch">Punch</button>
        <button class="tbtn jump" data-b="jump">Jump</button>
      </div>
      <button class="tpause" data-b="pause">II</button>`;
    document.body.append(box);
    knob = box.querySelector('.knob');
    const stick = box.querySelector('.stick');
    // the joystick: drag your thumb anywhere inside the circle
    const move = (t) => {
      const dx = t.clientX - stickCenter.x, dy = t.clientY - stickCenter.y;
      const max = 50, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / max);
      state.x = (dx / d) * k; state.z = (dy / d) * k;
      knob.style.transform = `translate(${(dx / d) * Math.min(d, max)}px, ${(dy / d) * Math.min(d, max)}px)`;
    };
    stick.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      stickId = t.identifier;
      const r = stick.getBoundingClientRect();
      stickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      move(t);
    }, { passive: false });
    stick.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === stickId) move(t);
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) if (t.identifier === stickId) { stickId = null; state.x = 0; state.z = 0; knob.style.transform = ''; }
    };
    stick.addEventListener('touchend', end);
    stick.addEventListener('touchcancel', end);
    // the buttons
    box.querySelectorAll('[data-b]').forEach((b) => {
      const name = b.dataset.b;
      b.addEventListener('touchstart', (e) => {
        e.preventDefault();
        b.classList.add('down');
        if (name === 'pause') { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' })); return; }
        if (name === 'emote') { emoteKind = (emoteKind % 4) + 1; taps.emote++; return; }
        if (name === 'flop') { taps.flop++; return; }
        state[name] = true;
        if (taps[name] !== undefined) taps[name]++;
      }, { passive: false });
      const up = (e) => { e.preventDefault(); b.classList.remove('down'); if (state[name] !== undefined && name !== 'x' && name !== 'z') state[name] = false; };
      b.addEventListener('touchend', up, { passive: false });
      b.addEventListener('touchcancel', up, { passive: false });
    });
  }
  if (available) build();

  // read the buttons like a controller (presses are counted, so quick taps are never lost)
  const seen = {};
  function read(id) {
    const p = seen[id] || { ...taps };
    const out = {
      x: state.x, z: state.z, jump: state.jump, punch: state.punch, grab: state.grab,
      jumpPressed: taps.jump > p.jump, punchPressed: taps.punch > p.punch, flopPressed: taps.flop > (p.flop || 0), emote: taps.emote > p.emote ? emoteKind : 0,
      colorPressed: false, hatPressed: false, outfitPressed: false, startPressed: false,
    };
    seen[id] = { ...taps };
    return out;
  }

  // show the buttons only while playing (not on menus)
  function update(show) { if (box) box.hidden = !show; }

  return { available, read, update };
})();
