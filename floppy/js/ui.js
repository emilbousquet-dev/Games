// ============================================================
//  FLOPPY PARTY — MENUS, ICONS AND ON-SCREEN TEXT
//  Icons are small drawings (SVG), not emojis.
// ============================================================
window.FP = window.FP || {};

FP.UI = (function () {
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const root = el('div', 'ui');
  document.body.append(root);
  const tags = el('div', 'tags');
  const hud = el('div', 'hud');
  const bigText = el('div', 'big');
  const sub = el('div', 'sub');
  const toastBox = el('div', 'toast');
  const screenBox = el('div', 'screen');
  const help = el('div', 'help');
  const corner = el('div', 'corner', 'H help &nbsp; Esc pause &nbsp; M music');
  const wipeBox = el('div', 'wipe');
  root.append(tags, hud, bigText, sub, toastBox, screenBox, help, corner, wipeBox);
  screenBox.hidden = true; help.hidden = true; bigText.hidden = true; sub.hidden = true;
  let items = [], sel = 0, backFn = null, keyFn = null, bigTimer = 0, toastTimer = 0, grid = 1;

  const hex = (n) => '#' + n.toString(16).padStart(6, '0');

  // ---------------- icons ----------------
  const svg = (inner, vb = '0 0 24 24') => `<svg class="ico" viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
  const ICON = {
    crown: svg('<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="currentColor"/>'),
    clock: svg('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M12 7v5.5l3.5 2" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
    coin: svg('<circle cx="12" cy="12" r="9" fill="#ffcf33" stroke="#2a2140" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="#c99a1a" stroke-width="2"/>'),
    star: svg('<path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="#ffcf33" stroke="#2a2140" stroke-width="1.6" stroke-linejoin="round"/>'),
    starEmpty: svg('<path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="none" stroke="#2a2140" stroke-width="1.6" stroke-linejoin="round" opacity=".4"/>'),
    alarm: svg('<path d="M12 3a6 6 0 0 1 6 6v5l2 3H4l2-3V9a6 6 0 0 1 6-6z" fill="#ff5a5f"/><circle cx="12" cy="20" r="2" fill="#ff5a5f"/>'),
    out: svg('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'),
    bomb: svg('<circle cx="11" cy="14" r="7" fill="#2a2140"/><path d="M15 8l3-3" stroke="#2a2140" stroke-width="2.4"/><circle cx="19" cy="4" r="2" fill="#ff9a3c"/>'),
    flag: svg('<path d="M6 21V3" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M7 4h11l-3 4 3 4H7z" fill="currentColor"/>'),
    back: svg('<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
    play: svg('<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>'),
    again: svg('<path d="M19 12a7 7 0 1 1-2.1-5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M20 3v6h-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>'),
    grid: svg('<rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor"/><rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor"/>'),
    home: svg('<path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" fill="currentColor"/>'),
    online: svg('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" fill="none" stroke="currentColor" stroke-width="2"/>'),
    people: svg('<circle cx="8" cy="8" r="3.5" fill="currentColor"/><circle cx="16.5" cy="9" r="3" fill="currentColor"/><path d="M1.5 20c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5zM13 20c.2-3 1.6-5 4-5 2.8 0 5 2 5 5z" fill="currentColor"/>'),
    help: svg('<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.4" fill="currentColor"/>'),
    minus: svg('<path d="M5 12h14" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>'),
    plus: svg('<path d="M5 12h14M12 5v14" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>'),
    left: svg('<path d="M14.5 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
    trophy: svg('<path d="M7 3h10v5a5 5 0 0 1-10 0z" fill="#ffcf33" stroke="#2a2140" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10M17 5h3v1.5a3.5 3.5 0 0 1-3.5 3.5" fill="none" stroke="#2a2140" stroke-width="1.8"/><path d="M12 13v4M8 21h8l-1-4H9z" fill="#ffcf33" stroke="#2a2140" stroke-width="1.8" stroke-linejoin="round"/>'),
    dice: svg('<rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="#fff" stroke="#2a2140" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.6" fill="#2a2140"/><circle cx="15.5" cy="15.5" r="1.6" fill="#2a2140"/><circle cx="12" cy="12" r="1.6" fill="#2a2140"/><circle cx="15.5" cy="8.5" r="1.6" fill="#2a2140"/><circle cx="8.5" cy="15.5" r="1.6" fill="#2a2140"/>'),
    sparkle: svg('<path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="#ff7eb6" stroke="#2a2140" stroke-width="1.6" stroke-linejoin="round"/><circle cx="19" cy="4" r="1.6" fill="#ffcf33"/><circle cx="5" cy="19" r="1.3" fill="#4aa8ff"/>'),
    check: svg('<path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>'),
    right: svg('<path d="M9.5 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'),
  };

  const HAT_NAMES = { party: 'Party hat', beanie: 'Beanie', crown: 'Crown', cowboy: 'Cowboy hat', tophat: 'Top hat', propeller: 'Propeller', bunny: 'Bunny ears', chef: 'Chef hat', headphones: 'Headphones', flowers: 'Flower crown', wizard: 'Wizard hat', antlers: 'Antlers', pirate: 'Pirate hat', viking: 'Viking helmet', halo: 'Halo', astronaut: 'Space helmet', none: 'No hat' };

  help.innerHTML = `
    <h2>How to play</h2>
    <table>
      <tr><th></th><th>Player 1</th><th>Player 2</th><th>Controller</th></tr>
      <tr><td>Move</td><td>W A S D</td><td>Arrows</td><td>Left stick</td></tr>
      <tr><td>Jump</td><td>Space</td><td>/</td><td>A</td></tr>
      <tr><td>Punch</td><td>F</td><td>.</td><td>X or B</td></tr>
      <tr><td>Grab with both hands (hold)</td><td>G</td><td>,</td><td>LB + RB</td></tr>
      <tr><td>Left hand / right hand</td><td>Q / E</td><td>; / '</td><td>LB or LT / RB or RT</td></tr>
      <tr><td>Emotes: wave / dance / cheer</td><td>1 / 2 / 3</td><td>8 / 9 / 0</td><td>Back / L-stick click / Y</td></tr>
      <tr><td>Color / hat / outfit (lobby)</td><td>Z / X / C</td><td>K / L / J</td><td>Back / Y / R-stick</td></tr>
    </table>
    <ul>
      <li><b>Punch</b> 3 times quickly to knock someone out. They go floppy!</li>
      <li><b>Hold grab</b> to grab someone or something. Walk, then <b>let go to throw</b>.</li>
      <li>Grabbed? <b>Mash jump</b> to wriggle free.</li>
      <li>You can grab edges and walls to hang on.</li>
      <li>Grab with <b>just one hand</b> (Q or E, or one bumper) and keep the other hand free. Let go of one hand and the other keeps holding.</li>
    </ul>
    <p class="small">Player 1 can use a controller: press A on it to start (on the title screen, or in the lobby).</p>
    <p class="small">H: show or hide this &nbsp; Esc or Start: pause &nbsp; M: music on or off</p>
    <button class="btn small" type="button" data-close>Close</button>`;
  help.querySelector('[data-close]').addEventListener('click', () => { help.hidden = true; });

  // buttons never take keyboard focus (so pressing Space to jump can't "click" them)
  document.addEventListener('mousedown', (e) => { if (e.target.closest('button')) e.preventDefault(); });

  // ---------------- screen wipe (a colorful circle covers the screen, things change, and it opens again) ----------------
  let wiping = false;
  function wipe(fn) {
    if ((FP.Game && FP.Game.manual) || wiping) { fn(); return; }
    wiping = true;
    wipeBox.className = 'wipe closing';
    FP.Audio.play('whoosh');
    setTimeout(() => {
      try { fn(); } finally {
        wipeBox.className = 'wipe opening';
        setTimeout(() => { wipeBox.className = 'wipe'; wiping = false; }, 480);
      }
    }, 380);
  }

  // ---------------- menu screens ----------------
  // buttons: [{ label, action, small, cls }]. grid: how many buttons per row (for arrow keys)
  function screen({ title = '', html = '', buttons = [], back = null, cls = '', columns = 1, onKey = null, start = 0 }) {
    screenBox.innerHTML = '';
    screenBox.className = 'screen ' + cls;
    const card = el('div', 'card');
    if (title) card.append(el('h1', '', title));
    if (html) card.append(el('div', 'body', html));
    const row = el('div', 'buttons');
    items = buttons.map((b, i) => {
      const btn = el('button', 'btn' + (b.small ? ' small' : '') + (b.cls ? ' ' + b.cls : ''), b.label);
      btn.type = 'button';
      btn.addEventListener('mouseenter', () => select(i));
      btn.addEventListener('click', () => { select(i); choose(); });
      row.append(btn);
      return { ...b, btn };
    });
    if (items.length) card.append(row);
    screenBox.append(card);
    screenBox.hidden = false;
    backFn = back; keyFn = onKey; grid = columns;
    select(start);
    return card;
  }
  function closeScreen() { screenBox.hidden = true; screenBox.innerHTML = ''; items = []; backFn = null; keyFn = null; }
  const open = () => !screenBox.hidden;
  function select(i) {
    if (!items.length) return;
    sel = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((it, k) => it.btn.classList.toggle('on', k === sel));
    if (items[sel].btn.scrollIntoView && !screenBox.hidden) items[sel].btn.scrollIntoView({ block: 'nearest' });
  }
  function move(d) { if (items.length) { select(sel + d); FP.Audio.play('menu'); } }
  function choose() { const it = items[sel]; if (it) { FP.Audio.play('select'); it.action(); } }

  function menuKey(code) {
    if (keyFn && keyFn(code)) return true;
    if (code === 'up') move(-grid);
    else if (code === 'down') move(grid);
    else if (code === 'left') move(-1);
    else if (code === 'right') move(1);
    else if (code === 'ok') choose();
    else if (code === 'back' && backFn) backFn();
    else return false;
    return true;
  }

  window.addEventListener('keydown', (e) => {
    FP.Audio.start();
    if (e.target && e.target.tagName === 'INPUT') return;
    if (e.code === 'KeyH') { help.hidden = !help.hidden; return; }
    if (e.code === 'KeyM') { toast(FP.Audio.toggleMusic() ? 'Music on' : 'Music off'); return; }
    if (!open()) return;
    const map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', Enter: 'ok', NumpadEnter: 'ok', Space: 'ok', Escape: 'back' };
    const code = map[e.code];
    if (code && menuKey(code)) e.preventDefault();
  });
  window.addEventListener('pointerdown', () => FP.Audio.start());

  // controllers can use menus: stick or d-pad to pick, A or Start to choose, B to go back
  const padPrev = {};
  // which device used the menus last (so "Play on this computer" gives Player 1 that device)
  let lastDevice = { kind: 'keys', map: 0 };
  window.addEventListener('keydown', () => { lastDevice = { kind: 'keys', map: 0 }; });
  window.addEventListener('pointerdown', () => { lastDevice = { kind: 'keys', map: 0 }; });
  function pollPads() {
    for (const gp of FP.Input.getPads()) {
      if (!gp) continue;
      const b = (n) => gp.buttons[n] && gp.buttons[n].pressed;
      const now = { up: b(12) || gp.axes[1] < -0.6, down: b(13) || gp.axes[1] > 0.6, left: b(14) || gp.axes[0] < -0.6, right: b(15) || gp.axes[0] > 0.6, ok: b(0) || b(9), back: b(1) };
      const was = padPrev[gp.index] || {};
      if (open()) for (const k of Object.keys(now)) if (now[k] && !was[k]) { lastDevice = { kind: 'pad', index: gp.index }; menuKey(k); }
      padPrev[gp.index] = now;
    }
  }

  // ---------------- big center text (3, 2, 1, GO!) ----------------
  function big(text, seconds = 1, subText = '') {
    bigText.textContent = text;
    bigText.classList.toggle('long', text.length > 12); // long messages get smaller and can wrap
    bigText.classList.remove('pop'); void bigText.offsetWidth; bigText.classList.add('pop');
    bigText.hidden = false;
    sub.textContent = subText;
    sub.hidden = !subText;
    bigTimer = seconds;
  }
  function toast(text, seconds = 1.8) {
    toastBox.textContent = text;
    toastBox.classList.add('show');
    toastTimer = seconds;
  }
  // only touch the page when the scoreboard really changed (rebuilding it every frame made the game slower)
  let lastHud = null;
  function setHud(html) { if (html === lastHud) return; lastHud = html; hud.innerHTML = html; hud.hidden = !html; }

  // a colored name label for a player (no emojis: a color dot instead)
  function playerPill(p, extra = '') {
    const col = FP.Look.COLORS[p.colorIndex] || FP.Look.COLORS[0];
    return `<span class="pill" style="--c:${hex(col.body)}"><i class="dot"></i>${escapeHtml(p.name)}${extra}</span>`;
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

  // ---------------- name tags that float above everyone's head ----------------
  const tagEls = new Map();
  const tmp = new THREE.Vector3();
  function nameTags(chars, camera, show) {
    if (FP.Settings && !FP.Settings.get('tags')) show = false;
    const seen = new Set();
    if (show) {
      for (const c of chars) {
        if (!c.player || c.alive === false) continue;
        let t = tagEls.get(c);
        if (!t) {
          t = el('div', 'tag');
          t.textContent = c.name;
          t.style.setProperty('--c', hex(c.color.body));
          tags.append(t);
          tagEls.set(c, t);
        }
        seen.add(c);
        const h = c.parts.head.position;
        tmp.set(h.x, h.y + 0.75, h.z).project(camera);
        const onScreen = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1;
        t.hidden = !onScreen;
        if (onScreen) t.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * innerWidth}px, ${(-tmp.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -100%)`;
      }
    }
    for (const [c, t] of tagEls) if (!seen.has(c)) { t.remove(); tagEls.delete(c); }
  }

  function update(dt) {
    pollPads();
    if (bigTimer > 0) { bigTimer -= dt; if (bigTimer <= 0) { bigText.hidden = true; sub.hidden = true; } }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) toastBox.classList.remove('show'); }
  }

  return { screen, closeScreen, open, wipe, selected: () => sel, select, lastDevice: () => lastDevice, big, toast, setHud, playerPill, nameTags, update, ICON, HAT_NAMES, hex, help, el, root, escapeHtml };
})();
