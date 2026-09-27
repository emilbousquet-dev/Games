// ============================================================
//  FLOPPY PARTY — SETTINGS
//  Volume, screen shake, graphics quality, name tags and
//  fullscreen. Saved on this computer.
// ============================================================
window.FP = window.FP || {};

FP.Settings = (function () {
  const DEFAULTS = { master: 8, music: 6, sfx: 8, shake: true, quality: 'high', tags: true };
  const s = Object.assign({}, DEFAULTS);
  try { Object.assign(s, JSON.parse(localStorage.getItem('floppy-settings') || '{}')); } catch (e) { /* no saving */ }
  function save() { try { localStorage.setItem('floppy-settings', JSON.stringify(s)); } catch (e) { /* no saving */ } }

  // make the settings actually happen
  function apply() {
    if (FP.Audio.setVolumes) FP.Audio.setVolumes(s.master / 10, s.music / 10, s.sfx / 10);
    const R = FP.Stage.renderer;
    const high = s.quality === 'high';
    R.setPixelRatio(high ? Math.min(window.devicePixelRatio, 2) : 1);
    R.setSize(window.innerWidth, window.innerHeight);
    FP.Stage.sun.castShadow = high;
  }

  const bar = (v) => `<span class="vol">${Array.from({ length: 10 }, (_, i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</span>`;
  const ROWS = [
    { key: 'master', name: 'Volume', kind: 'num' },
    { key: 'music', name: 'Music', kind: 'num' },
    { key: 'sfx', name: 'Sound effects', kind: 'num' },
    { key: 'shake', name: 'Screen shake', kind: 'bool' },
    { key: 'quality', name: 'Graphics', kind: 'pick', options: ['high', 'low'], labels: { high: 'Pretty', low: 'Fast' } },
    { key: 'tags', name: 'Name tags', kind: 'bool' },
  ];
  function change(row, dir) {
    if (row.kind === 'num') s[row.key] = Math.max(0, Math.min(10, s[row.key] + dir));
    else if (row.kind === 'bool') s[row.key] = !s[row.key];
    else { const o = row.options; s[row.key] = o[(o.indexOf(s[row.key]) + (dir > 0 ? 1 : o.length - 1)) % o.length]; }
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

  return { get: (k) => s[k], apply, screen };
})();
