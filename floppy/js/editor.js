// ============================================================
//  FLOPPY PARTY — LEVEL EDITOR
//  Build your own arena on a 14 x 14 grid, square by square:
//  floor, blocks, walls, jump pads, ice, lava, hill and start
//  spots. Pick the rule: Knockout, Coin Grab or King of the Hill.
//  You get 3 save slots, and a gallery of ready-made arenas.
//  Then play "My Arena" on it (online too!)
//
//  Mouse / touch: click or drag to paint, right-click to erase.
//  Keyboard: arrows move, SPACE paints, BACKSPACE erases,
//            1-9 or Q / E pick a tool, ENTER plays, ESC goes back.
//  Controller: stick / d-pad moves, A paints, X erases,
//              LB / RB pick a tool, START plays, B goes back.
// ============================================================
window.FP = window.FP || {};

FP.Editor = (function () {
  const N = 14, KEY = 'floppy-arenas', SLOT_KEY = 'floppy-arena-slot', CELL = 30;
  const TOOLS = [
    { id: 'f', name: 'Floor', color: '#8fd46a' },
    { id: 'b', name: 'Block', color: '#ffb35a' },
    { id: 'w', name: 'Wall', color: '#9a7bff' },
    { id: 'j', name: 'Jump pad', color: '#ff7eb6' },
    { id: 'i', name: 'Ice', color: '#d6f1ff' },
    { id: 'l', name: 'Lava', color: '#ff6a2a' },
    { id: 'k', name: 'Hill', color: '#ffd23f' },
    { id: 's', name: 'Start spot', color: '#fffaf3' },
    { id: '.', name: 'Eraser', color: '#3a3350' },
  ];
  const VALID = new Set(TOOLS.map((t) => t.id));
  const RULES = ['ko', 'coins', 'hill'];
  const RULE_NAMES = { ko: 'Knockout', coins: 'Coin Grab', hill: 'King of the Hill' };
  const RULE_TIPS = { ko: 'Fall off or touch lava and you are out. Last one standing wins!', coins: 'Coins pop up on your floor. Most coins after 60 seconds wins!', hill: 'Get on the gold Hill squares and stay there to score. First to 30 wins!' };

  // ---------------- saved arenas ----------------
  function blank(name) { return { name, cells: '.'.repeat(N * N), rule: 'ko' }; }
  function sample() {
    // a ready-made arena, so "My Arena" works right away
    const a = [];
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const d = Math.hypot(r - 6.5, c - 6.5);
      let ch = d < 6.6 ? 'f' : '.';
      if (d < 1.2) ch = 'l';
      if ((r === 3 || r === 10) && (c === 3 || c === 10)) ch = 'b';
      if ((r === 6 || r === 7) && (c === 1 || c === 12)) ch = 'j';
      if (r === 2 && c >= 6 && c <= 7) ch = 'w';
      if (r === 11 && c >= 6 && c <= 7) ch = 'i';
      a.push(ch);
    }
    for (const [r, c] of [[4, 6], [9, 7], [6, 4], [7, 9]]) a[r * N + c] = 's';
    return { name: 'Arena 1', cells: a.join(''), rule: 'ko' };
  }

  // ---------------- the gallery: ready-made arenas to load and change ----------------
  function paint(fn) { const a = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) a.push(fn(r, c, Math.hypot(r - 6.5, c - 6.5)) || '.'); return a.join(''); }
  function spots(cells, list) { const a = cells.split(''); for (const [r, c] of list) a[r * N + c] = 's'; return a.join(''); }
  const CORNERS = [[3, 3], [3, 10], [10, 3], [10, 10]];
  const GALLERY = [
    { name: 'Donut', rule: 'ko', desc: 'A ring of grass around a lava lake.', cells: spots(paint((r, c, d) => (d < 2.2 ? 'l' : d < 6.6 ? 'f' : '.')), [[1, 6], [12, 7], [6, 1], [7, 12]]) },
    { name: 'Ice Rink', rule: 'ko', desc: 'Slippery ice with bouncy corners.', cells: spots(paint((r, c) => (r >= 1 && r <= 12 && c >= 1 && c <= 12 ? ((r === 1 || r === 12) && (c === 1 || c === 12) ? 'j' : 'i') : '.')), CORNERS) },
    { name: 'Sky Islands', rule: 'ko', desc: 'Four little islands. Jump pads fly you between them.', cells: spots(paint((r, c) => { const isl = (r <= 4 || r >= 9) && (c <= 4 || c >= 9); if (isl) return (r === 2 || r === 11) && (c === 2 || c === 11) ? '.' : ((r === 4 || r === 9) && (c === 4 || c === 9) ? 'j' : 'f'); return (r === 6 || r === 7) && (c === 6 || c === 7) ? 'f' : '.'; }), [[1, 1], [1, 12], [12, 1], [12, 12]]) },
    { name: 'Lava Maze', rule: 'ko', desc: 'Stripes of lava. Watch your step!', cells: spots(paint((r, c) => (r >= 1 && r <= 12 && c >= 1 && c <= 12 ? ((r === 4 || r === 9) && c > 2 && c < 11 ? 'l' : (c === 4 || c === 9) && r > 5 && r < 8 ? 'l' : 'f') : '.')), [[2, 2], [2, 11], [11, 2], [11, 11]]) },
    { name: 'Gold Rush', rule: 'coins', desc: 'Blocks to climb and coins everywhere.', cells: spots(paint((r, c, d) => (d < 6.8 ? ((r % 4 === 1) && (c % 4 === 1) ? 'b' : d < 1.5 ? 'j' : 'f') : '.')), [[3, 6], [10, 7], [6, 3], [7, 10]]) },
    { name: 'Bouncy Castle', rule: 'coins', desc: 'Jump pads all over. Boing boing!', cells: spots(paint((r, c) => (r >= 1 && r <= 12 && c >= 1 && c <= 12 ? ((r + c) % 4 === 0 && r > 1 && r < 12 && c > 1 && c < 12 ? 'j' : (r === 1 || r === 12 || c === 1 || c === 12) && (r + c) % 3 === 0 ? 'w' : 'f') : '.')), CORNERS) },
    { name: 'Hill Top', rule: 'hill', desc: 'A gold hill in the middle. Push everyone off it!', cells: spots(paint((r, c, d) => (d < 6.6 ? (d < 1.6 ? 'k' : d > 5.4 && (r + c) % 5 === 0 ? 'b' : 'f') : '.')), [[2, 6], [11, 7], [6, 2], [7, 11]]) },
    { name: 'Two Hills', rule: 'hill', desc: 'Two hills on icy ground, far apart.', cells: spots(paint((r, c) => (r >= 2 && r <= 11 && c >= 0 && c <= 13 ? ((c <= 1 || c >= 12) && r >= 5 && r <= 8 ? 'k' : r >= 5 && r <= 8 ? 'i' : 'f') : '.')), [[2, 6], [11, 7], [3, 3], [10, 10]]) },
  ];
  function clean(a, i) {
    const name = (a && typeof a.name === 'string' && a.name.trim().slice(0, 16)) || `Arena ${i + 1}`;
    let cells = (a && typeof a.cells === 'string' ? a.cells : '').slice(0, N * N);
    cells = cells.split('').map((ch) => (VALID.has(ch) ? ch : '.')).join('').padEnd(N * N, '.');
    return { name, cells, rule: a && RULES.includes(a.rule) ? a.rule : 'ko' };
  }
  function load() {
    try {
      const a = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(a) && a.length === 3) return a.map(clean);
    } catch (e) { /* nothing saved yet */ }
    return [sample(), blank('Arena 2'), blank('Arena 3')];
  }
  let arenas = load();
  let slot = 0;
  try { slot = Math.min(2, Math.max(0, +localStorage.getItem(SLOT_KEY) || 0)); } catch (e) { /* no saving */ }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(arenas)); localStorage.setItem(SLOT_KEY, String(slot)); } catch (e) { /* no saving */ }
  }

  // ---------------- share codes (give your arena to a friend) ----------------
  // FP1.<runs>.<name>(.<rule>): every run is a letter (the kind of square) and how many in a row, like X31F6
  const LETTER = { f: 'F', b: 'B', w: 'W', j: 'J', i: 'I', l: 'L', k: 'K', s: 'S', '.': 'X' };
  const RULE_LETTER = { coins: 'C', hill: 'H' };
  const FROM = Object.fromEntries(Object.entries(LETTER).map(([k, v]) => [v, k]));
  function toCode(a) {
    let out = '', i = 0;
    const c = a.cells;
    while (i < c.length) { let j = i; while (j < c.length && c[j] === c[i]) j++; out += LETTER[c[i]] + (j - i > 1 ? j - i : ''); i = j; }
    const name = a.name.replace(/[^A-Za-z0-9 ]/g, '').trim().replace(/ /g, '_').slice(0, 16) || 'Arena';
    return `FP1.${out}.${name}${RULE_LETTER[a.rule] ? '.' + RULE_LETTER[a.rule] : ''}`;
  }
  function fromCode(code) {
    const parts = String(code || '').trim().split('.');
    if ((parts.length !== 3 && parts.length !== 4) || parts[0].toUpperCase() !== 'FP1') return null;
    const runs = parts[1].toUpperCase();
    if (!/^([FBWJILKSX]\d*)+$/.test(runs)) return null;
    let cells = '';
    for (const m of runs.matchAll(/([FBWJILKSX])(\d*)/g)) { const n = m[2] ? +m[2] : 1; if (n < 1 || cells.length + n > N * N) return null; cells += FROM[m[1]].repeat(n); }
    if (cells.length !== N * N) return null;
    if (cells.split('').filter((x) => x === 's').length > 4) return null;
    const rl = (parts[3] || '').toUpperCase();
    return { name: parts[2].replace(/_/g, ' ').replace(/[^A-Za-z0-9 ]/g, '').slice(0, 16) || 'Shared arena', cells, rule: rl === 'C' ? 'coins' : rl === 'H' ? 'hill' : 'ko' };
  }
  function shareBox(mode) {
    const box = panel.querySelector('.ed-share');
    if (mode === 'share') {
      const code = toCode(arena());
      box.innerHTML = `<b>Your arena's code</b><input readonly value="${code}"><div><button class="btn small" data-copy>Copy</button> <button class="btn small" data-close>Done</button></div><p class="small">Send this code to a friend. They click <b>Load a code</b> in their Level Editor.</p>`;
      const input = box.querySelector('input');
      input.addEventListener('focus', () => input.select());
      box.querySelector('[data-copy]').addEventListener('click', () => {
        input.select();
        const ok = () => { FP.UI.toast('Code copied!'); FP.Audio.play('select'); };
        try { if (navigator.clipboard) navigator.clipboard.writeText(code).then(ok, () => { document.execCommand('copy'); ok(); }); else { document.execCommand('copy'); ok(); } } catch (e) { FP.UI.toast('Select the code and copy it'); }
      });
    } else {
      box.innerHTML = `<b>Load a friend's arena</b><input placeholder="Paste the code here (FP1...)" spellcheck="false"><div><button class="btn small go" data-load>Load into ${FP.UI.escapeHtml(arena().name)}</button> <button class="btn small" data-close>Cancel</button></div><p class="small">This replaces the arena in this slot.</p>`;
      const input = box.querySelector('input');
      input.focus();
      const load = () => {
        const a = fromCode(input.value);
        if (!a) { FP.UI.toast('That code does not work. Check it and try again!'); FP.Audio.play('beep'); return; }
        arenas[slot] = a; save(); FP.Audio.play('coin'); FP.UI.toast(`Loaded "${a.name}"!`);
        render(); preview();
      };
      box.querySelector('[data-load]').addEventListener('click', load);
      input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') load(); if (e.key === 'Escape') { box.hidden = true; } });
    }
    box.querySelector('[data-close]').addEventListener('click', () => { box.hidden = true; });
    box.hidden = false;
  }

  // ---------------- the editor screen ----------------
  let panel = null, canvas = null, ctx = null, tool = 0, cur = { r: 7, c: 7 }, painting = null, dirty = 0, hooks = null;
  let padPrev = {}, padRepeat = 0, padSkip = false;
  const arena = () => arenas[slot];
  const get = (r, c) => arena().cells[r * N + c];
  function set(r, c, ch) {
    if (r < 0 || c < 0 || r >= N || c >= N || get(r, c) === ch) return;
    if (ch === 's' && arena().cells.split('').filter((x) => x === 's').length >= 4) { FP.UI.toast('Only 4 start spots (one for each player)'); return; }
    const a = arena().cells.split(''); a[r * N + c] = ch; arena().cells = a.join('');
    dirty = 0.15; // rebuild the 3D arena a moment later
    draw();
  }

  function open(h) {
    hooks = h;
    if (!panel) {
      panel = FP.UI.el('div', 'editor');
      FP.UI.root.append(panel);
    }
    panel.hidden = false;
    padPrev = {}; padSkip = true; // (ignore buttons that are still held from the menu)
    render();
    preview();
    window.addEventListener('keydown', onKey, true);
  }
  function close() {
    if (panel) panel.hidden = true;
    window.removeEventListener('keydown', onKey, true);
    painting = null;
    save();
  }
  const isOpen = () => !!(panel && !panel.hidden);

  function render() {
    const ICON = FP.UI.ICON;
    panel.innerHTML = `
      <div class="ed-card">
        <h2>Level Editor</h2>
        <div class="ed-slots">${arenas.map((a, i) => `<button class="chip${i === slot ? ' on' : ''}" data-slot="${i}">${FP.UI.escapeHtml(a.name)}</button>`).join('')}</div>
        <canvas width="${N * CELL}" height="${N * CELL}"></canvas>
        <div class="ed-tools">${TOOLS.map((t, i) => `<button class="ed-tool${i === tool ? ' on' : ''}" data-tool="${i}" title="${t.name} (${i + 1})"><i style="background:${t.color}"></i>${t.name}</button>`).join('')}</div>
        <div class="ed-name"><label>Name <input maxlength="16" value="${FP.UI.escapeHtml(arena().name)}"></label></div>
        <div class="ed-rules"><span class="lbl">Rule</span>${RULES.map((r) => `<button class="chip${(arena().rule || 'ko') === r ? ' on' : ''}" data-rule="${r}">${RULE_NAMES[r]}</button>`).join('')}<p class="small">${RULE_TIPS[arena().rule || 'ko']}${arena().rule === 'hill' ? ' Paint gold <b>Hill</b> squares (or the middle is the hill).' : ''}</p></div>
        <div class="ed-buttons">
          <button class="btn go" data-act="play">${ICON.play} Play it! <kbd>Enter</kbd></button>
          <button class="btn small" data-act="gallery">Gallery</button>
          <button class="btn small" data-act="fill">Fill with floor</button>
          <button class="btn small" data-act="clear">Clear all</button>
          <button class="btn small" data-act="share">Share code</button>
          <button class="btn small" data-act="loadcode">Load a code</button>
          <button class="btn small" data-act="back">${ICON.back} Back <kbd>Esc</kbd></button>
        </div>
        <div class="ed-share" hidden></div>
        <div class="ed-gallery" hidden></div>
        <p class="small ed-help">Click or drag to paint. Right-click erases. Keys: arrows + SPACE, 1-9 pick a tool. Controller: A paints, X erases, LB / RB tools.</p>
      </div>`;
    canvas = panel.querySelector('canvas');
    ctx = canvas.getContext('2d');
    panel.querySelectorAll('[data-slot]').forEach((b) => b.addEventListener('click', () => { slot = +b.dataset.slot; save(); FP.Audio.play('menu'); render(); preview(); }));
    panel.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => pickTool(+b.dataset.tool)));
    panel.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act)));
    panel.querySelectorAll('[data-rule]').forEach((b) => b.addEventListener('click', () => { arena().rule = b.dataset.rule; save(); FP.Audio.play('menu'); render(); }));
    const input = panel.querySelector('input');
    input.addEventListener('input', () => { arena().name = input.value.slice(0, 16) || `Arena ${slot + 1}`; panel.querySelectorAll('[data-slot]')[slot].textContent = arena().name; save(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === 'Escape') input.blur(); e.stopPropagation(); });
    // painting with the mouse or a finger
    const cellOf = (e) => { const b = canvas.getBoundingClientRect(); return { c: Math.floor(((e.clientX - b.left) / b.width) * N), r: Math.floor(((e.clientY - b.top) / b.height) * N) }; };
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      painting = e.button === 2 ? '.' : TOOLS[tool].id;
      const p = cellOf(e); cur = p; set(p.r, p.c, painting); draw();
      FP.Audio.play('select');
    });
    canvas.addEventListener('pointermove', (e) => { if (!painting) return; const p = cellOf(e); cur = p; set(p.r, p.c, painting); });
    const stop = () => { painting = null; save(); };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    draw();
  }

  function pickTool(i) {
    tool = (i + TOOLS.length) % TOOLS.length;
    FP.Audio.play('menu');
    if (!panel) return;
    panel.querySelectorAll('[data-tool]').forEach((b, k) => b.classList.toggle('on', k === tool));
  }

  function act(a) {
    if (a === 'play') {
      const floor = arena().cells.split('').filter((ch) => 'fsijbk'.includes(ch)).length;
      if (floor < 6) { FP.UI.toast('Put down some floor first!'); FP.Audio.play('beep'); return; }
      save(); close();
      if (hooks && hooks.play) hooks.play();
    } else if (a === 'back') { close(); if (hooks && hooks.back) hooks.back(); }
    else if (a === 'clear') { arena().cells = '.'.repeat(N * N); save(); draw(); preview(); FP.Audio.play('whoosh'); }
    else if (a === 'share') shareBox('share');
    else if (a === 'gallery') gallery();
    else if (a === 'loadcode') shareBox('load');
    else if (a === 'fill') { arena().cells = arena().cells.split('').map((ch) => (ch === '.' ? 'f' : ch)).join(''); save(); draw(); preview(); FP.Audio.play('select'); }
  }

  // a tiny picture of an arena (for the gallery)
  function mini(cv, cellsIn) {
    const g = cv.getContext('2d'), k = cv.width / N;
    g.fillStyle = '#bfe3ff'; g.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < N * N; i++) {
      const ch = cellsIn[i];
      if (ch === '.') continue;
      const t = TOOLS.find((q) => q.id === ch);
      g.fillStyle = ch === 's' ? '#fffaf3' : t.color;
      g.fillRect((i % N) * k, Math.floor(i / N) * k, k + 0.5, k + 0.5);
    }
  }
  function gallery() {
    const box = panel.querySelector('.ed-gallery');
    box.innerHTML = `<b>Gallery: ready-made arenas</b><p class="small">Load one into <b>${FP.UI.escapeHtml(arena().name)}</b>, then change it any way you like!</p>
      <div class="gal-list">${GALLERY.map((g, i) => `<button class="gal-item" data-gal="${i}"><canvas width="84" height="84"></canvas><b>${g.name}</b><small>${RULE_NAMES[g.rule]}</small><small>${g.desc}</small></button>`).join('')}</div>
      <button class="btn small" data-close>Close</button>`;
    box.querySelectorAll('.gal-item').forEach((b) => {
      const g = GALLERY[+b.dataset.gal];
      mini(b.querySelector('canvas'), g.cells);
      b.addEventListener('click', () => {
        arenas[slot] = { name: g.name, cells: g.cells, rule: g.rule };
        save(); FP.Audio.play('coin'); FP.UI.toast(`Loaded "${g.name}"!`);
        render(); preview();
      });
    });
    box.querySelector('[data-close]').addEventListener('click', () => { box.hidden = true; });
    box.hidden = false;
    panel.querySelector('.ed-card').scrollTop = 0;
  }

  // the little map
  function draw() {
    if (!ctx) return;
    ctx.fillStyle = '#bfe3ff'; ctx.fillRect(0, 0, N * CELL, N * CELL);
    let spot = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const ch = get(r, c), x = c * CELL, y = r * CELL;
      if (ch === '.') { ctx.strokeStyle = 'rgba(42,33,64,.12)'; ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1); continue; }
      const t = TOOLS.find((q) => q.id === ch);
      ctx.fillStyle = ch === 's' || ch === 'j' ? '#8fd46a' : t.color;
      ctx.fillRect(x, y, CELL, CELL);
      ctx.strokeStyle = 'rgba(42,33,64,.35)'; ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      ctx.fillStyle = '#2a2140';
      if (ch === 'b') { ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fillRect(x, y + CELL - 6, CELL, 6); }
      else if (ch === 'w') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + CELL - 9, CELL, 9); }
      else if (ch === 'j') { ctx.fillStyle = '#ff7eb6'; ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, CELL * 0.36, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(x + CELL / 2, y + 7); ctx.lineTo(x + CELL - 9, y + CELL - 10); ctx.lineTo(x + 9, y + CELL - 10); ctx.fill(); }
      else if (ch === 'l') { ctx.strokeStyle = '#ffcf33'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 4, y + CELL / 2); ctx.quadraticCurveTo(x + CELL / 4, y + CELL / 2 - 6, x + CELL / 2, y + CELL / 2); ctx.quadraticCurveTo(x + CELL * 0.75, y + CELL / 2 + 6, x + CELL - 4, y + CELL / 2); ctx.stroke(); ctx.lineWidth = 1; }
      else if (ch === 'k') { ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.moveTo(x + 7, y + CELL - 9); ctx.lineTo(x + 7, y + 11); ctx.lineTo(x + 11, y + 15); ctx.lineTo(x + CELL / 2, y + 8); ctx.lineTo(x + CELL - 11, y + 15); ctx.lineTo(x + CELL - 7, y + 11); ctx.lineTo(x + CELL - 7, y + CELL - 9); ctx.fill(); }
      else if (ch === 'i') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 7, y + CELL - 7); ctx.lineTo(x + CELL - 7, y + 7); ctx.stroke(); ctx.lineWidth = 1; }
      else if (ch === 's') { spot++; ctx.fillStyle = '#fffaf3'; ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, CELL * 0.36, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#2a2140'; ctx.stroke(); ctx.fillStyle = '#2a2140'; ctx.font = `900 ${CELL * 0.5}px Nunito, Arial, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(spot), x + CELL / 2, y + CELL / 2 + 1); }
    }
    // the cursor (for keyboard and controller)
    ctx.strokeStyle = '#ff3a6a'; ctx.lineWidth = 3;
    ctx.strokeRect(cur.c * CELL + 1.5, cur.r * CELL + 1.5, CELL - 3, CELL - 3);
    ctx.lineWidth = 1;
  }

  // show the arena in 3D behind the editor
  function preview() {
    FP.Stage.clear();
    FP.FX.clear();
    FP.Modes.custom.buildMap(arena(), true);
    FP.Camera.setAngle(0.95, 0.6);
    FP.Camera.fix(new THREE.Vector3(innerWidth > 900 ? 6 : 0, 0, innerWidth > 900 ? 1 : 5), 15);
  }

  function moveCursor(dr, dc) {
    cur = { r: Math.min(N - 1, Math.max(0, cur.r + dr)), c: Math.min(N - 1, Math.max(0, cur.c + dc)) };
    if (painting) set(cur.r, cur.c, painting);
    draw();
  }

  function onKey(e) {
    if (!isOpen() || FP.UI.open()) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    const k = e.code;
    const moves = { ArrowUp: [-1, 0], KeyW: [-1, 0], ArrowDown: [1, 0], KeyS: [1, 0], ArrowLeft: [0, -1], KeyA: [0, -1], ArrowRight: [0, 1], KeyD: [0, 1] };
    let used = true;
    if (moves[k]) moveCursor(...moves[k]);
    else if (k === 'Space') { set(cur.r, cur.c, TOOLS[tool].id); FP.Audio.play('select'); }
    else if (k === 'Backspace' || k === 'Delete' || k === 'KeyX') set(cur.r, cur.c, '.');
    else if (/^Digit[1-9]$/.test(k)) pickTool(+k.slice(5) - 1);
    else if (k === 'KeyQ') pickTool(tool - 1);
    else if (k === 'KeyE') pickTool(tool + 1);
    else if (k === 'Enter' || k === 'NumpadEnter') act('play');
    else if (k === 'Escape') { const g = panel.querySelector('.ed-gallery'); if (g && !g.hidden) g.hidden = true; else act('back'); }
    else used = false;
    if (used) { e.preventDefault(); e.stopPropagation(); }
  }

  // runs every frame while the editor is open
  function update(dt) {
    if (!isOpen()) return;
    if (dirty > 0 && !painting) { dirty -= dt; if (dirty <= 0) preview(); }
    // controllers
    padRepeat -= dt;
    for (const gp of FP.Input.getPads()) {
      if (!gp || FP.UI.open()) continue;
      const b = (n) => !!(gp.buttons[n] && gp.buttons[n].pressed);
      const was = padPrev[gp.index] || {};
      const now = { up: b(12) || gp.axes[1] < -0.6, down: b(13) || gp.axes[1] > 0.6, left: b(14) || gp.axes[0] < -0.6, right: b(15) || gp.axes[0] > 0.6, a: b(0), x: b(2), lb: b(4), rb: b(5), start: b(9), back: b(1) };
      if (padSkip) { padPrev[gp.index] = now; continue; }
      const dir = now.up ? [-1, 0] : now.down ? [1, 0] : now.left ? [0, -1] : now.right ? [0, 1] : null;
      const fresh = dir && !(was.up || was.down || was.left || was.right);
      if (dir && (fresh || padRepeat <= 0)) { moveCursor(...dir); padRepeat = fresh ? 0.35 : 0.09; }
      if (now.a && !was.a) { painting = TOOLS[tool].id; set(cur.r, cur.c, painting); FP.Audio.play('select'); }
      if (now.x && !was.x) { painting = '.'; set(cur.r, cur.c, '.'); }
      if (!now.a && !now.x && (was.a || was.x)) { painting = null; save(); }
      if (now.lb && !was.lb) pickTool(tool - 1);
      if (now.rb && !was.rb) pickTool(tool + 1);
      if (now.start && !was.start) act('play');
      if (now.back && !was.back) act('back');
      padPrev[gp.index] = now;
    }
    padSkip = false;
  }

  return {
    N, TOOLS, GALLERY, RULES, open, close, update, isOpen, codes: { toCode, fromCode },
    arenas: () => arenas, slot: () => slot,
    setSlot: (i) => { slot = Math.min(2, Math.max(0, i | 0)); save(); },
    playing: () => arenas[slot],
    sample,
    reload: () => { arenas = load(); },
  };
})();
