// ============================================================
//  FLOPPY PARTY — SETTINGS
//  Volume, screen shake, graphics quality, name tags and
//  fullscreen. Saved on this computer.
// ============================================================
window.FP = window.FP || {};

FP.Settings = (function () {
  const DEFAULTS = { master: 8, music: 6, sfx: 8, shake: true, quality: FP.Touch && FP.Touch.available ? 'low' : 'high', tags: true, fps: false, replays: true, colorblind: false, commentator: true, chat: true, rumble: true };
  const s = Object.assign({}, DEFAULTS);
  try { Object.assign(s, JSON.parse(localStorage.getItem('floppy-settings') || '{}')); } catch (e) { /* no saving */ }
  function save() { try { localStorage.setItem('floppy-settings', JSON.stringify(s)); } catch (e) { /* no saving */ } }

  // make the settings actually happen
  function apply() {
    if (FP.Audio.setVolumes) FP.Audio.setVolumes(s.master / 10, s.music / 10, s.sfx / 10);
    const R = FP.Stage.renderer;
    const high = s.quality === 'high';
    // Pretty: sharp (but not so sharp that it gets slow). Fast: fewer pixels, no shadows. Super fast: even fewer pixels
    R.setPixelRatio(high ? Math.min(window.devicePixelRatio, 1.5) : superFast ? 0.75 : 1);
    R.setSize(window.innerWidth, window.innerHeight);
    FP.Stage.sun.castShadow = high;
  }

  // the game is running slowly on this computer: switch to Fast graphics once (you can switch back in Settings)
  let autoDone = false, superFast = false;
  function autoFast() {
    if (autoDone) return false;
    if (s.quality === 'high') {
      s.quality = 'low'; save(); apply();
      FP.UI.toast('Switched to Fast graphics so the game reacts quicker (you can change it in Settings)', 4);
      return true;
    }
    if (!superFast) { superFast = true; apply(); autoDone = true; return true; } // still slow: even fewer pixels
    return false;
  }

  const bar = (v) => `<span class="vol">${Array.from({ length: 10 }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</span>`;
  const ROWS = [
    { key: 'master', name: 'Volume', kind: 'num' },
    { key: 'music', name: 'Music', kind: 'num' },
    { key: 'sfx', name: 'Sound effects', kind: 'num' },
    { key: 'shake', name: 'Screen shake', kind: 'bool' },
    { key: 'quality', name: 'Graphics', kind: 'pick', options: ['high', 'low'], labels: { high: 'Pretty', low: 'Fast' } },
    { key: 'tags', name: 'Name tags', kind: 'bool' },
    { key: 'replays', name: 'Knockout replays', kind: 'bool' },
    { key: 'commentator', name: 'Commentator', kind: 'bool' },
    { key: 'chat', name: 'Quick Chat (keys 5, 6, 7)', kind: 'bool' },
    { key: 'rumble', name: 'Controller rumble', kind: 'bool' },
    { key: 'fps', name: 'Show speed (FPS)', kind: 'bool' },
    { key: 'colorblind', name: 'Colorblind shapes', kind: 'bool' },
  ];
  function change(row, dir) {
    if (row.kind === 'num') s[row.key] = Math.max(0, Math.min(10, s[row.key] + dir));
    else if (row.kind === 'bool') s[row.key] = !s[row.key];
    else { const o = row.options; s[row.key] = o[(o.indexOf(s[row.key]) + (dir > 0 ? 1 : o.length - 1)) % o.length]; }
    if (row.key === 'quality') autoDone = true;
    save(); apply(); FP.Audio.play('menu');
  }

  function screen(back, sel = 0) {
    const label = (r) => {
      const v = s[r.key];
      const val = r.kind === 'num' ? bar(v) : r.kind === 'bool' ? `<b>${v ? 'On' : 'Off'}</b>` : `<b>${r.labels[v]}</b>`;
      return `<span class="set-name">${r.name}</span><span class="set-val">${FP.UI.ICON.left}${val}${FP.UI.ICON.right}</span>`;
    };
    FP.UI.screen({
      cls: 'settings',
      title: 'Settings',
      html: '<p class="small">Up and down to pick, left and right to change. Or click.</p>',
      start: sel,
      buttons: [
        ...ROWS.map((r, i) => ({ label: label(r), cls: 'set', action: () => { change(r, 1); screen(back, i); } })),
        { label: `${FP.UI.ICON.people} Controls (change your keys)`, small: true, action: () => controls(() => screen(back, ROWS.length)) },
        { label: `${FP.UI.ICON.grid} Fullscreen`, small: true, action: () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { /* not allowed here */ } } },
        { label: `${FP.UI.ICON.back} Back`, small: true, action: back },
      ],
      back,
      onKey: (code) => {
        const i = FP.UI.selected();
        if ((code === 'left' || code === 'right') && ROWS[i]) { change(ROWS[i], code === 'left' ? -1 : 1); screen(back, i); return true; }
        return false;
      },
    });
  }

  // ---------------- CONTROLS: pick your own keys ----------------
  const ACT_NAMES = { up: 'Up', down: 'Down', left: 'Left', right: 'Right', jump: 'Jump', punch: 'Punch', grab: 'Grab (both hands)', grabL: 'Left hand', grabR: 'Right hand', flop: 'Play dead' };
  let waiting = null;
  function controls(back, sel = 0, msg = '') {
    const I = FP.Input, A = I.BINDABLE;
    const buttons = [];
    A.forEach((a) => [0, 1].forEach((m) => {
      const i = buttons.length, wait = waiting && waiting.m === m && waiting.a === a;
      buttons.push({ label: `<span class="set-name">${ACT_NAMES[a]}</span>${wait ? '<kbd class="wait">press a key...</kbd>' : `<kbd>${FP.UI.escapeHtml(I.label(m, a))}</kbd>`}`, cls: 'set key' + (wait ? ' wait' : ''), action: () => listen(back, m, a, i) });
    }));
    buttons.push({ label: `${FP.UI.ICON.again} Reset Player 1`, small: true, action: () => { I.resetKeys(0); FP.Audio.play('whoosh'); controls(back, A.length * 2); } });
    buttons.push({ label: `${FP.UI.ICON.again} Reset Player 2`, small: true, action: () => { I.resetKeys(1); FP.Audio.play('whoosh'); controls(back, A.length * 2 + 1); } });
    buttons.push({ label: `${FP.UI.ICON.back} Back`, small: true, cls: 'wide', action: () => { waiting = null; back(); } });
    FP.UI.screen({
      cls: 'settings controls',
      title: 'Controls',
      html: `<p class="small">Click a move, then press the key you want for it. Esc to cancel. If another move already has that key, they swap.</p>${msg ? `<p class="warn">${msg}</p>` : ''}<div class="ctl-head"><b>Player 1</b><b>Player 2</b></div>`,
      columns: 2,
      start: sel,
      buttons,
      back: () => { waiting = null; back(); },
    });
  }
  function listen(back, m, a, i) {
    waiting = { m, a };
    const me = waiting;
    controls(back, i);
    const onKey = (e) => {
      window.removeEventListener('keydown', onKey, true);
      // the controls screen was closed (or another key is being picked): don't grab this key press
      if (waiting !== me || !document.querySelector('.screen.controls:not([hidden])')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      waiting = null;
      if (e.code === 'Escape') { controls(back, i); return; }
      const ok = FP.Input.bind(m, a, e.code);
      FP.Audio.play(ok ? 'select' : 'beep');
      controls(back, i, ok ? '' : `The ${FP.UI.escapeHtml(FP.Input.keyName(e.code))} key can't be used for that. Pick another key.`);
    };
    window.addEventListener('keydown', onKey, true);
  }

  return { get: (k) => s[k], apply, screen, autoFast, controls };
})();
