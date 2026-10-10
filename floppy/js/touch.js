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
      const max = stickMax, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / max);
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

  // ---------------- phones: the game is played sideways ----------------
  // (like most phone games). Held upright, a big "turn your phone" screen covers everything.
  const phone = available && Math.min(screen.width, screen.height) < 600;
  // the menus are made for a big screen, so on small touch screens they shrink to fit (--uiz),
  // and the joystick and buttons get a size that fits the screen too (--ts)
  function fit() {
    const w = innerWidth, h = innerHeight;
    const uiz = available ? Math.max(0.6, Math.min(1, h / 520, w / 1000)) : 1;
    const ts = Math.max(0.7, Math.min(1, Math.min(w, h) / 430));
    document.documentElement.style.setProperty('--uiz', uiz.toFixed(3));
    document.documentElement.style.setProperty('--ts', ts.toFixed(3));
    stickMax = 50 * ts;
  }
  let stickMax = 50;
  if (available) {
    document.body.classList.add('touchy');
    if (phone) document.body.classList.add('phone');
    fit();
    window.addEventListener('resize', fit);
  }
  if (phone) {
    const turn = document.createElement('div');
    turn.className = 'rotate';
    turn.innerHTML = `
      <svg viewBox="0 0 120 120" aria-hidden="true"><g class="rot-phone"><rect x="38" y="18" width="44" height="84" rx="9" fill="#fffaf3" stroke="#2a2140" stroke-width="5"/><rect x="45" y="28" width="30" height="58" rx="3" fill="#8fd3ff"/><circle cx="60" cy="94" r="3.5" fill="#2a2140"/><circle cx="60" cy="57" r="9" fill="#ff5a8a" stroke="#2a2140" stroke-width="3"/></g><path class="rot-arrow" d="M96 30a44 44 0 0 1 6 40" fill="none" stroke="#ffcf33" stroke-width="7" stroke-linecap="round"/><path class="rot-arrow" d="M94 62l8 10 7-11" fill="none" stroke="#ffcf33" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <h2>Turn your phone sideways</h2>
      <p>Floppy Party is played sideways, like most phone games.</p>`;
    document.body.append(turn);
    // turning the phone upright in the middle of a game pauses it
    const upright = matchMedia('(orientation: portrait)');
    const onTurn = () => {
      if (upright.matches && FP.Game && FP.Game.state === 'play' && FP.UI && !FP.UI.open()) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
    };
    if (upright.addEventListener) upright.addEventListener('change', onTurn);
    // on the first tap, go full screen and stay sideways (works on Android; iPhones ignore it)
    const goBig = () => {
      window.removeEventListener('touchend', goBig);
      const el = document.documentElement;
      if (document.fullscreenElement || !el.requestFullscreen) return;
      try {
        el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
          if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
        }).catch(() => {});
      } catch (e) { /* not allowed here (for example inside another page) */ }
    };
    window.addEventListener('touchend', goBig);
  }

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

  // a pretend button press (for example the "I'm ready" button online)
  function tap(name) { if (taps[name] !== undefined) taps[name]++; }

  return { available, phone, read, update, tap };
})();
