// ============================================================
//  FLOPPY PARTY — MENUS AND ON-SCREEN TEXT
// ============================================================
window.FP = window.FP || {};

FP.UI = (function () {
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const root = el('div', 'ui');
  document.body.append(root);
  const screenBox = el('div', 'screen'); screenBox.hidden = true;
  const hud = el('div', 'hud');
  const bigText = el('div', 'big');
  const sub = el('div', 'sub');
  const toastBox = el('div', 'toast');
  const help = el('div', 'help');
  const corner = el('div', 'corner', 'H help · Esc pause · M music');
  root.append(hud, bigText, sub, toastBox, screenBox, help, corner);
  help.hidden = true;
  let items = [], sel = 0, backFn = null, bigTimer = 0, toastTimer = 0;

  const HAT_ICONS = { party: '🎉', beanie: '🧶', crown: '👑', cowboy: '🤠', tophat: '🎩', propeller: '🚁', bunny: '🐰', chef: '👨‍🍳', none: '∅' };
  const hex = (n) => '#' + n.toString(16).padStart(6, '0');

  help.innerHTML = `
    <h2>How to play</h2>
    <table>
      <tr><th></th><th>Player 1</th><th>Player 2</th><th>🎮 Controller</th></tr>
      <tr><td>Move</td><td>W A S D</td><td>Arrows</td><td>Left stick</td></tr>
      <tr><td>Jump</td><td>Space</td><td>/</td><td>A</td></tr>
      <tr><td>Punch</td><td>F</td><td>.</td><td>X or B</td></tr>
      <tr><td>Grab (hold)</td><td>G</td><td>,</td><td>RT / RB</td></tr>
      <tr><td>Color / hat (lobby)</td><td>Z / X</td><td>K / L</td><td>Back / Y</td></tr>
    </table>
    <ul>
      <li><b>Punch</b> 3 times quickly to knock someone out. They go floppy!</li>
      <li><b>Hold grab</b> to grab someone (or something). Walk, then <b>let go to throw!</b></li>
      <li>Grabbed? <b>Mash jump</b> to wriggle free.</li>
      <li>You can grab edges and walls too, to hang on!</li>
    </ul>
    <p class="small">H = show/hide · Esc = pause · M = music on/off</p>`;

  // ---------------- generic menu screen ----------------
  function screen({ title = '', html = '', buttons = [], back = null, cls = '' }) {
    screenBox.innerHTML = '';
    screenBox.className = 'screen ' + cls;
    const card = el('div', 'card');
    if (title) card.append(el('h1', '', title));
    if (html) card.append(el('div', 'body', html));
    const row = el('div', 'buttons');
    items = buttons.map((b, i) => {
      const btn = el('button', 'btn' + (b.small ? ' small' : ''), b.label);
      btn.type = 'button';
      btn.addEventListener('mouseenter', () => select(i));
      btn.addEventListener('click', () => { select(i); choose(); });
      row.append(btn);
      return { ...b, btn };
    });
    if (items.length) card.append(row);
    screenBox.append(card);
    screenBox.hidden = false;
    backFn = back;
    select(0);
    return card;
  }
  function closeScreen() { screenBox.hidden = true; items = []; backFn = null; }
  const open = () => !screenBox.hidden;
  function select(i) {
    if (!items.length) return;
    sel = (i + items.length) % items.length;
    items.forEach((it, k) => it.btn.classList.toggle('on', k === sel));
  }
  function move(d) { if (items.length) { select(sel + d); FP.Audio.play('menu'); } }
  function choose() { const it = items[sel]; if (it) { FP.Audio.play('select'); it.action(); } }

  window.addEventListener('keydown', (e) => {
    FP.Audio.start();
    if (e.code === 'KeyH') { help.hidden = !help.hidden; return; }
    if (e.code === 'KeyM') { toast(FP.Audio.toggleMusic() ? 'Music on 🎵' : 'Music off'); return; }
    if (!open()) return;
    if (['ArrowUp', 'ArrowLeft'].includes(e.code)) { move(-1); e.preventDefault(); }
    else if (['ArrowDown', 'ArrowRight'].includes(e.code)) { move(1); e.preventDefault(); }
    else if (['Enter', 'NumpadEnter'].includes(e.code)) { choose(); e.preventDefault(); }
    else if (e.code === 'Escape' && backFn) backFn();
  });
  window.addEventListener('pointerdown', () => FP.Audio.start());

  // controllers can use menus: stick/dpad to pick, A or Start to choose, B to go back
  const padPrev = {};
  function pollPads() {
    if (!open()) return;
    for (const gp of FP.Input.getPads()) {
      if (!gp) continue;
      const b = (n) => gp.buttons[n] && gp.buttons[n].pressed;
      const now = { prev: b(12) || b(14) || gp.axes[1] < -0.6 || gp.axes[0] < -0.6, next: b(13) || b(15) || gp.axes[1] > 0.6 || gp.axes[0] > 0.6, ok: b(0) || b(9), back: b(1) };
      const was = padPrev[gp.index] || {};
      if (now.prev && !was.prev) move(-1);
      if (now.next && !was.next) move(1);
      if (now.ok && !was.ok) choose();
      if (now.back && !was.back && backFn) backFn();
      padPrev[gp.index] = now;
    }
  }

  // ---------------- big center text (3, 2, 1, GO!) ----------------
  function big(text, seconds = 1, subText = '') {
    bigText.textContent = text;
    bigText.classList.remove('pop'); void bigText.offsetWidth; bigText.classList.add('pop');
    bigText.hidden = false;
    sub.textContent = subText;
    sub.hidden = !subText;
    bigTimer = seconds;
  }
  function toast(text, seconds = 1.6) {
    toastBox.textContent = text;
    toastBox.classList.add('show');
    toastTimer = seconds;
  }

  // ---------------- in-game score bar ----------------
  function setHud(html) { hud.innerHTML = html; hud.hidden = !html; }

  function playerPill(p, extra = '') {
    const col = FP.Look.COLORS[p.colorIndex];
    return `<span class="pill" style="--c:${hex(col.body)}"><i>${HAT_ICONS[p.hat] || ''}</i>${p.name}${extra}</span>`;
  }

  function update(dt) {
    pollPads();
    if (bigTimer > 0) { bigTimer -= dt; if (bigTimer <= 0) { bigText.hidden = true; sub.hidden = true; } }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toastBox.classList.remove('show'); }
  }

  bigText.hidden = true; sub.hidden = true;
  return { screen, closeScreen, open, big, toast, setHud, playerPill, update, HAT_ICONS, hex, help, el };
})();
