// =====================================================================
//  DRESS TO IMPRESS BILL: the screens, the wardrobe, the scores and the runway
// =====================================================================
(() => {
'use strict';

const W = 1280, H = 720;
const SAVE_KEY = 'dress-to-impress-bill-best';
const TIMER_KEY = 'dress-to-impress-bill-timer';
// the wardrobe panel on the right
const PX = 712, PW = 556;
const GRID = { x: PX, y: 82, w: PW, h: 468, cols: 5, rows: 4, gap: 8 };
const MODEL_X = 400, MODEL_Y = 688, MODEL_S = 4.2;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const view = { s: 1, ox: 0, oy: 0, px: 1 };
const mouse = { x: -999, y: -999 };
let buttons = [];
let screen = 'title';   // title, pick, intro, dress, runway, end
let G = null;
let T = 0;
let fx = [];
let best = 0, timerOn = true, pickOnline = false;
try { best = +localStorage.getItem(SAVE_KEY) || 0; timerOn = localStorage.getItem(TIMER_KEY) !== 'off'; } catch (e) { /* no storage */ }

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const inside = (p, x, y, w, h) => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const PIECES = ['hat', 'face', 'top', 'bottom', 'shoes', 'extra'];
const colorName = k => k === 'bill' ? 'BILL GREEN' : k.toUpperCase();
function withArticle(name) {
  const n = name.toLowerCase();
  if (/s$/.test(n) && !/ss$/.test(n)) return n;
  return (/^[aeiou]/.test(n) ? 'an ' : 'a ') + n;
}

// =====================================================================
//  OUTFITS
// =====================================================================
function defaultOutfit(model) {
  const M = MODELS[model];
  const o = { hair: { id: M.hair, color: M.hairColor }, hat: { id: 'none', color: null }, face: { id: 'none', color: null }, extra: { id: 'none', color: null } };
  for (const cat of ['top', 'bottom', 'shoes']) o[cat] = { id: M.outfit[cat][0], color: M.outfit[cat][1] };
  return o;
}
function randomOutfit() {
  const o = {};
  for (const C of CATEGORIES) {
    const id = pick(Object.keys(ITEMS[C.key]));
    if (C.key === 'hair') o.hair = { id, color: pick(Object.keys(HAIR_COLORS)) };
    else o[C.key] = { id, color: ITEMS[C.key][id].color === null || ITEMS[C.key][id].color === undefined ? null : pick(Object.keys(COLORS)) };
  }
  return o;
}
const copyOutfit = o => JSON.parse(JSON.stringify(o));

function lookOf(model, o) {
  const hex = cat => (o[cat].color && COLORS[o[cat].color]) || '#9a9a9a';
  return Object.assign({}, KIDS[model], {
    hair: o.hair.id, hairColor: HAIR_COLORS[o.hair.color] || '#6b4428',
    hat: { id: o.hat.id, c: hex('hat') }, acc: { id: o.face.id, c: hex('face') },
    top: { id: o.top.id, c: hex('top') }, bottom: { id: o.bottom.id, c: hex('bottom') },
    shoes: { id: o.shoes.id, c: hex('shoes') }, extra: { id: o.extra.id, c: hex('extra') },
  });
}

// =====================================================================
//  SCORING: how much does Bill like it?
// =====================================================================
function makeHint(theme) {
  if (Math.random() < 0.4) {
    const key = pick(Object.keys(COLORS).filter(k => k !== 'tan'));
    return { type: 'color', key, text: 'something ' + colorName(key), short: colorName(key) };
  }
  const cat = pick(PIECES);
  const ids = Object.keys(ITEMS[cat]).filter(id => id !== 'none');
  const id = pick(ids);
  const name = ITEMS[cat][id].name;
  return { type: 'item', cat, id, text: withArticle(name), short: name.toUpperCase() };
}

function hintMet(o, hint) {
  if (hint.type === 'item') return o[hint.cat].id === hint.id;
  return PIECES.some(cat => o[cat].id !== 'none' && o[cat].color === hint.key);
}

function judge(o, theme, hint, model) {
  model = model || (G && G.model);
  const TH = THEMES[theme];
  const matched = [];
  for (const cat of PIECES) {
    const it = ITEMS[cat][o[cat].id];
    if (it.tags.includes(theme)) matched.push(it.name);
  }
  const hairMatch = ITEMS.hair[o.hair.id].tags.includes(theme);
  const colored = ['hat', 'top', 'bottom', 'shoes'].filter(cat => o[cat].color && o[cat].id !== 'none');
  const keys = colored.map(cat => o[cat].color);
  const colorMatch = Math.min(2, keys.filter(k => TH.colors.includes(k)).length);
  const themeScore = Math.round(10 * Math.min(1, (matched.length + (hairMatch ? 0.5 : 0) + colorMatch * 0.5) / 4));

  const distinct = new Set(keys).size;
  let style = 2;
  if (distinct <= 3) style += 2;
  if (distinct >= 4) style -= 1;
  if (keys.length >= 3 && distinct === 1) style += 1;
  if (o.hat.id !== 'none') style += 1;
  if (o.face.id !== 'none') style += 1;
  if (o.extra.id !== 'none') style += 1;
  if (MODELS[model]) {
    const d = defaultOutfit(model);
    if (CATEGORIES.filter(C => JSON.stringify(d[C.key]) !== JSON.stringify(o[C.key])).length >= 3) style += 2;
  }
  style = clamp(style, 0, 10);

  const met = hintMet(o, hint);
  let bill = 4;
  if (met) bill += 5;
  const greens = PIECES.filter(cat => o[cat].id !== 'none' && GREENS.includes(o[cat].color)).length;
  bill += Math.min(2, greens);
  if (o.face.id === 'glasses') bill += 1;
  if (o.top.id === 'puffer') bill += 1;
  bill = clamp(bill, 0, 10);

  const total = themeScore + style + bill;
  const stars = total >= 27 ? 5 : total >= 22 ? 4 : total >= 16 ? 3 : total >= 10 ? 2 : total >= 5 ? 1 : 0;
  return { theme: themeScore, style, bill, total, stars, matched, hintMet: met, greens, distinct };
}

function billSays(res, theme, hint) {
  theme = theme || G.theme; hint = hint || G.hint;
  const th = THEMES[theme];
  const first = {
    5: ['AAAAAH! THAT IS AMAZING!', 'BEST. OUTFIT. EVER!', 'AAAH! I am SO impressed!'],
    4: ['Wow, really cool!', 'Ooh, I like it a lot!', 'Very nice! Almost perfect!'],
    3: ['Not bad... not bad at all.', 'Pretty good!', 'Hmm, I kind of like it.'],
    2: ['Hmm... that is a choice.', 'Meh. I have seen better.', 'Okay... I guess?'],
    1: ['Bill is NOT impressed.', 'What... is THAT?!', 'Oh no. Oh no no no.'],
    0: ['Bill is NOT impressed.', 'What... is THAT?!', 'Did you even try?!'],
  }[res.stars];
  const lines = [pick(first)];
  if (res.matched.length >= 2) lines.push('I love the ' + pick(res.matched).toLowerCase() + '!');
  else if (res.matched.length === 1) lines.push('Nice ' + res.matched[0].toLowerCase() + ', but I wanted MORE ' + th.name.toLowerCase() + '!');
  else lines.push('Where is the ' + th.name.toLowerCase() + ' stuff?!');
  if (res.hintMet) lines.push('And you remembered my wish!');
  else lines.push('You forgot my wish: ' + hint.text + '...');
  if (res.greens > 0 && res.stars >= 3) lines.push('GREEN! My favorite color!');
  return lines;
}

// =====================================================================
//  THE SHOW
// =====================================================================
function newShow(model) {
  G = { model, round: 0, themes: shuffle(Object.keys(THEMES)).slice(0, ROUNDS), results: [], cat: 'top' };
  startRound();
}

function startRound() {
  beginRound(G.themes[G.round], makeHint(G.themes[G.round]));
}

function beginRound(theme, hint) {
  G.theme = theme;
  G.outfit = defaultOutfit(G.model);
  G.hint = hint;
  G.colorPicked = {};
  G.time = ROUND_TIME;
  G.lastTick = ROUND_TIME;
  G.flash = 0;
  G.introT = 0;
  screen = 'intro';
  Sound.sfx('whistle');
}

function startDressing() {
  screen = 'dress';
  Sound.sfx('go');
}

function selectItem(cat, id) {
  const it = ITEMS[cat][id];
  const cur = G.outfit[cat];
  if (cat === 'hair') { cur.id = id; }
  else {
    let color = null;
    if (it.color !== null && it.color !== undefined) color = G.colorPicked[cat] && cur.color ? cur.color : it.color;
    G.outfit[cat] = { id, color };
  }
  G.flash = 0.7;
  Sound.sfx('swish');
  for (let i = 0; i < 10; i++) sparkleFx(MODEL_X + rand(-90, 90), MODEL_Y - rand(60, 440));
}

function selectColor(key) {
  const cat = G.cat, cur = G.outfit[cat];
  if (cat === 'hair') { cur.color = key; Sound.sfx('color'); G.flash = 0.4; return; }
  const it = ITEMS[cat][cur.id];
  if (cur.id === 'none' || it.color === null || it.color === undefined) { Sound.sfx('click'); return; }
  cur.color = key;
  G.colorPicked[cat] = true;
  Sound.sfx('color');
  G.flash = 0.4;
}

function randomize() {
  G.outfit = randomOutfit();
  for (const C of CATEGORIES) G.colorPicked[C.key] = true;
  G.flash = 0.7;
  Sound.sfx('swish');
  for (let i = 0; i < 24; i++) sparkleFx(MODEL_X + rand(-100, 100), MODEL_Y - rand(40, 460));
}

function goRunway() {
  if (G.online) { onlineDone(); return; }
  const res = judge(G.outfit, G.theme, G.hint);
  G.res = res;
  G.lines = billSays(res);
  G.rw = { t: 0, said: false, cards: 0 };
  G.results.push({ theme: G.theme, outfit: copyOutfit(G.outfit), res });
  screen = 'runway';
}

function nextRound() {
  G.round++;
  if (G.round >= ROUNDS) endShow();
  else startRound();
}

function endShow() {
  G.totalStars = G.results.reduce((a, r) => a + r.res.stars, 0);
  G.newBest = G.totalStars > best;
  if (G.newBest) { best = G.totalStars; try { localStorage.setItem(SAVE_KEY, String(best)); } catch (e) { /* no storage */ } }
  screen = 'end';
  G.endT = 0;
  Sound.sfx(G.totalStars >= 13 ? 'win' : 'sad');
}

function rankOf(stars) {
  if (stars >= 22) return { name: "BILL'S FAVORITE", emoji: '👑' };
  if (stars >= 18) return { name: 'FASHION STAR', emoji: '⭐' };
  if (stars >= 13) return { name: 'COOL KID', emoji: '😎' };
  if (stars >= 8) return { name: 'NOT BAD', emoji: '👍' };
  return { name: 'FASHION DISASTER', emoji: '😬' };
}

// =====================================================================
//  EFFECTS
// =====================================================================
function sparkleFx(x, y) {
  fx.push({ kind: 'spark', x, y, vx: rand(-30, 30), vy: rand(-60, -10), life: rand(0.4, 0.8), max: 0.8, r: rand(3, 7) });
}
function confetti(n) {
  const cols = ['#ff4a8a', '#ffd23f', '#3fc8d6', '#36b04f', '#8a4fd8', '#f08a24', '#fff'];
  for (let i = 0; i < n; i++) fx.push({ kind: 'conf', x: rand(0, W), y: rand(-200, -10), vx: rand(-40, 40), vy: rand(120, 260), rot: rand(0, 6), vr: rand(-8, 8), c: pick(cols), life: 5, max: 5, w: rand(6, 12), h: rand(4, 8) });
}
function updateFx(dt) {
  for (const f of fx) {
    f.life -= dt; f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.kind === 'conf') { f.rot += f.vr * dt; f.vx += Math.sin(T * 3 + f.y * 0.02) * 20 * dt; }
  }
  fx = fx.filter(f => f.life > 0 && f.y < H + 40);
}
function drawFx() {
  for (const f of fx) {
    if (f.kind === 'spark') {
      ctx.fillStyle = `rgba(255,255,255,${clamp(f.life / f.max, 0, 1)})`;
      sparkle(ctx, f.x, f.y, f.r * (0.5 + f.life));
    } else {
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
      ctx.fillStyle = f.c; ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
      ctx.restore();
    }
  }
}

// =====================================================================
//  INPUT
// =====================================================================
function click(x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.fn(); return; }
  }
}
function toGame(e) { return { x: (e.clientX - view.ox) / view.s, y: (e.clientY - view.oy) / view.s }; }
canvas.addEventListener('pointerdown', e => {
  Sound.init();
  const p = toGame(e);
  mouse.x = p.x; mouse.y = p.y;
  click(p.x, p.y);
});
window.addEventListener('pointermove', e => { const p = toGame(e); mouse.x = p.x; mouse.y = p.y; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  Sound.init();
  const k = e.key.toLowerCase();
  if (k === 'm') { Sound.toggleMute(); return; }
  const go = k === 'enter' || k === ' ';
  if (go) e.preventDefault();
  if (screen === 'title' && go) { Sound.sfx('click'); pickOnline = false; screen = 'pick'; }
  else if (screen === 'intro' && go) startDressing();
  else if (screen === 'dress') {
    if (go) goRunway();
    else if (k === 'r') randomize();
    else if (/^[1-7]$/.test(k)) { G.cat = CATEGORIES[+k - 1].key; Sound.sfx('click'); }
  }
  else if (screen === 'runway' && go && G.rw.t > 7) nextRound();
  else if (screen === 'end' && go) newShow(G.model);
});

// =====================================================================
//  DRAWING HELPERS
// =====================================================================
function button(label, x, y, w, h, fn, color, size, disabled) {
  const hover = !disabled && inside(mouse, x, y, w, h);
  const lift = hover ? -3 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; rr(ctx, x, y + 5, w, h, Math.min(18, h / 3)); ctx.fill();
  ctx.fillStyle = disabled ? '#77707f' : hover ? shade(color, 0.15) : color;
  rr(ctx, x, y + lift, w, h, Math.min(18, h / 3)); ctx.fill();
  ctx.strokeStyle = shade(disabled ? '#77707f' : color, -0.45); ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(ctx, x + 6, y + lift + 4, w - 12, h * 0.35, Math.min(12, h / 5)); ctx.fill();
  text(ctx, label, x + w / 2, y + h / 2 + lift + 2, size || 28, '#fff', { fam: FONT_TITLE, weight: '400', lw: 6 });
  if (!disabled) buttons.push({ x, y, w, h, fn: () => { Sound.sfx('click'); fn(); } });
}

function bubble(x, y, w, h, tailX, tailY) {
  // where the little tail starts: on the bottom, the top or the left side
  let a, b;
  if (tailY > y + h) { const bx = clamp(tailX, x + 30, x + w - 30); a = [bx - 14, y + h]; b = [bx + 14, y + h]; }
  else if (tailY < y) { const bx = clamp(tailX, x + 30, x + w - 30); a = [bx - 14, y]; b = [bx + 14, y]; }
  else { const by = clamp(tailY, y + 30, y + h - 30); a = [x, by - 14]; b = [x, by + 14]; }
  const shape = () => {
    rr(ctx, x, y, w, h, 22);
    ctx.moveTo(a[0], a[1]); ctx.lineTo(tailX, tailY); ctx.lineTo(b[0], b[1]);
  };
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.save(); ctx.translate(4, 6); shape(); ctx.fill(); ctx.restore();
  ctx.strokeStyle = '#2a1840'; ctx.lineWidth = 6; ctx.lineJoin = 'round';
  shape(); ctx.stroke();
  ctx.fillStyle = '#fffdf6'; shape(); ctx.fill();
}

function drawStarsRow(x, y, n, filled, r, popT) {
  for (let i = 0; i < n; i++) {
    const sx = x + (i - (n - 1) / 2) * r * 2.4;
    const on = i < filled;
    let k = 1;
    if (popT != null && on) k = clamp((popT - i * 0.25) * 4, 0, 1);
    if (on && k > 0) drawStar(ctx, sx, y, r * (k < 1 ? 1 + (1 - k) * 0.8 : 1), 0, '#ffd93b', '#c98a10');
    if (!on || k <= 0) drawStar(ctx, sx, y, r, 0, 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.35)');
  }
}

function stageBackground(spot) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2a0f45'); g.addColorStop(0.65, '#5a1f6e'); g.addColorStop(1, '#1a0a2a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // curtains
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 0 : W;
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i % 2 ? '#8e1238' : '#a8173f';
      const xx = x0 - side * (i * 26);
      ctx.beginPath(); ctx.moveTo(xx, 0); ctx.quadraticCurveTo(xx - side * 18, H * 0.5, xx - side * 4, H); ctx.lineTo(xx - side * 26, H);
      ctx.quadraticCurveTo(xx - side * 44, H * 0.5, xx - side * 26, 0); ctx.closePath(); ctx.fill();
    }
  }
  ctx.fillStyle = '#7a0f30'; ctx.fillRect(0, 0, W, 34);
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.arc(x + 20, 34, 20, 0, Math.PI); ctx.fill(); }
  // spotlights
  for (const sx of spot || []) {
    const sg = ctx.createLinearGradient(0, 0, 0, H);
    sg.addColorStop(0, 'rgba(255,250,220,0.32)'); sg.addColorStop(1, 'rgba(255,250,220,0.05)');
    ctx.fillStyle = sg;
    poly(ctx, [[sx - 30, 0], [sx + 30, 0], [sx + 170, H - 60], [sx - 170, H - 60]]); ctx.fill();
  }
  // the runway floor
  const fg = ctx.createLinearGradient(0, 600, 0, H);
  fg.addColorStop(0, '#f2e8ff'); fg.addColorStop(1, '#b9a3d6');
  ctx.fillStyle = fg; ctx.fillRect(0, 610, W, H - 610);
  ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0, 610, W, 4);
  for (let x = 20; x < W; x += 60) {
    ctx.fillStyle = (Math.floor(T * 4) + x / 60) % 3 < 1 ? '#ffe66b' : '#d6b3ff';
    circ(ctx, x, 624, 5); ctx.fill();
  }
}

function dressRoomBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#ff9ac9'); g.addColorStop(1, '#c46ad8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, PX, H);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let x = 0; x < PX; x += 56) ctx.fillRect(x, 0, 28, H);
  // the mirror with lights
  const mx = MODEL_X - 175, my = 128, mw = 350, mh = 500;
  ctx.fillStyle = '#e2b43a'; rr(ctx, mx - 16, my - 16, mw + 32, mh + 32, 26); ctx.fill();
  ctx.strokeStyle = '#a07810'; ctx.lineWidth = 3; ctx.stroke();
  const mg = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
  mg.addColorStop(0, '#d8f2ff'); mg.addColorStop(0.5, '#a9d6f2'); mg.addColorStop(1, '#86b8e0');
  ctx.fillStyle = mg; rr(ctx, mx, my, mw, mh, 16); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  poly(ctx, [[mx + 30, my], [mx + 110, my], [mx + 20, my + mh], [mx - 60 + 30, my + mh]]); ctx.fill();
  for (let i = 0; i < 8; i++) {
    const yy = my + 10 + i * (mh - 20) / 7;
    for (const xx of [mx - 8, mx + mw + 8]) {
      ctx.fillStyle = 'rgba(255,240,180,0.4)'; circ(ctx, xx, yy, 12); ctx.fill();
      ctx.fillStyle = '#fff6c8'; circ(ctx, xx, yy, 7); ctx.fill();
    }
  }
  // floor and rug
  ctx.fillStyle = '#8a4b8f'; ctx.fillRect(0, 640, PX, H - 640);
  ctx.fillStyle = '#ffd1ea'; ell(ctx, MODEL_X, 690, 150, 26); ctx.fill();
  ctx.strokeStyle = '#ff6fae'; ctx.lineWidth = 4; ell(ctx, MODEL_X, 690, 132, 20); ctx.stroke();
}

function drawBill(x, y, s, st) {
  drawPerson(ctx, BILL_LOOK, x, y, s, T, Object.assign({ phase: 2 }, st));
}

// =====================================================================
//  SCREENS
// =====================================================================
let titleOutfits = null, titleSwap = 0;
function drawTitle() {
  stageBackground([300, 640, 980]);
  if (!titleOutfits || T > titleSwap) {
    titleOutfits = [0, 1, 2].map(() => randomOutfit());
    titleSwap = T + 1.6;
  }
  const kids = ['mio', 'nafti', 'felix'];
  const spots = [190, 400, 1040];
  kids.forEach((k, i) => drawPerson(ctx, lookOf(k, titleOutfits[i]), spots[i], 650, 2.6, T, { phase: i, pose: i % 2 ? 'hips' : 'wave' }));
  drawBill(640, 660, 3.4, { pose: 'wow', mood: 'wow' });

  ctx.save();
  ctx.translate(640, 112); ctx.rotate(Math.sin(T * 1.5) * 0.02);
  text(ctx, 'DRESS TO IMPRESS', 0, 0, 74, '#ffd1ea', { fam: FONT_TITLE, weight: '400', lw: 14, stroke: '#2a0f45' });
  const k = 1 + Math.sin(T * 4) * 0.05;
  ctx.scale(k, k);
  text(ctx, 'BILL', 0, 92, 120, '#4bd06a', { fam: FONT_TITLE, weight: '400', lw: 18, stroke: '#0d2219' });
  ctx.restore();

  button('PLAY', 420, 600, 210, 70, () => { pickOnline = false; screen = 'pick'; }, '#ff4a8a', 40);
  button('ONLINE', 650, 600, 210, 70, () => { pickOnline = true; screen = 'pick'; }, '#2fa86a', 40);
  button(timerOn ? 'TIMER: ON' : 'TIMER: OFF', 40, 640, 190, 50, () => {
    timerOn = !timerOn; try { localStorage.setItem(TIMER_KEY, timerOn ? 'on' : 'off'); } catch (e) { /* no storage */ }
  }, '#8a4fd8', 22);
  button(Sound.muted ? 'SOUND: OFF' : 'SOUND: ON', 1050, 640, 190, 50, () => Sound.toggleMute(), '#3a8fd8', 22);
  if (best > 0) text(ctx, `BEST SHOW: ${best} ★`, 640, 712, 18, '#ffe66b', { lw: 4 });
}

function drawPick() {
  stageBackground([640]);
  text(ctx, 'WHO WILL BE YOUR MODEL?', 640, 80, 54, '#fff', { fam: FONT_TITLE, weight: '400', lw: 12, stroke: '#2a0f45' });
  const kids = Object.keys(MODELS);
  const left = (W - (kids.length * 245 + (kids.length - 1) * 40)) / 2;
  kids.forEach((k, i) => {
    const x = left + i * 285, y = 140, w = 245, h = 450;
    const hover = inside(mouse, x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; rr(ctx, x + 5, y + 8, w, h, 26); ctx.fill();
    ctx.fillStyle = hover ? '#ffe4f2' : '#f3e6ff'; rr(ctx, x, y - (hover ? 6 : 0), w, h, 26); ctx.fill();
    ctx.strokeStyle = hover ? '#ff4a8a' : '#2a0f45'; ctx.lineWidth = hover ? 6 : 4; ctx.stroke();
    drawPerson(ctx, lookOf(k, defaultOutfit(k)), x + w / 2, y + h - 70 - (hover ? 6 : 0), 3.1, T, { phase: i, pose: hover ? 'wave' : 'rest' });
    text(ctx, MODELS[k].name, x + w / 2, y + h - 34 - (hover ? 6 : 0), 40, '#ff4a8a', { fam: FONT_TITLE, weight: '400', lw: 8, stroke: '#2a0f45' });
    buttons.push({ x, y, w, h, fn: () => { Sound.sfx('go'); if (pickOnline) { Net.model = k; Net.msg = ''; screen = 'online'; } else newShow(k); } });
  });
  button('BACK', 40, 640, 150, 54, () => { screen = 'title'; }, '#8a4fd8', 26);
  text(ctx, 'Bill can\'t be the model... he\'s the JUDGE!', 640, 660, 24, '#ffe66b', { lw: 5 });
}

function drawIntro() {
  stageBackground([300]);
  drawBill(300, 680, 4.4, { pose: 'wave', mood: 'happy' });
  const th = THEMES[G.theme];
  bubble(520, 90, 700, 430, 420, 330);
  text(ctx, `ROUND ${G.round + 1} OF ${ROUNDS}`, 870, 140, 34, '#8a4fd8', { fam: FONT_TITLE, weight: '400', stroke: false });
  text(ctx, "Today's theme is...", 870, 192, 30, '#2a1840', { stroke: false });
  const k = 1 + Math.sin(T * 5) * 0.04;
  ctx.save(); ctx.translate(870, 275); ctx.scale(k, k);
  text(ctx, th.name + ' ' + th.emoji, 0, 0, th.name.length > 11 ? 56 : 70, '#ff4a8a', { fam: FONT_TITLE, weight: '400', lw: 10, stroke: '#2a0f45' });
  ctx.restore();
  text(ctx, 'Psst... I really want to see', 870, 370, 26, '#2a1840', { stroke: false });
  text(ctx, G.hint.short + '!', 870, 418, 40, G.hint.type === 'color' ? (COLORS[G.hint.key] === COLORS.white ? '#9aa' : COLORS[G.hint.key]) : '#36b04f', { fam: FONT_TITLE, weight: '400', lw: 6, stroke: '#2a1840' });
  text(ctx, timerOn || G.online ? `You have ${ROUND_TIME} seconds!` : 'Take your time!', 870, 480, 22, '#7a6a8a', { stroke: false });
  if (G.online) text(ctx, 'Everyone gets the same theme! Starting in ' + Math.max(1, Math.ceil(5 - G.introT)) + '...', 870, 560, 24, '#ffe66b', { lw: 5 });
  button("LET'S GO!", 760, 600, 260, 80, startDressing, '#ff4a8a', 40);
}

// ---------------------------------------------------------------- DRESS
let cardCache = null;
function cardRect(i) {
  const cw = (GRID.w - (GRID.cols - 1) * GRID.gap) / GRID.cols;
  const ch = (GRID.h - (GRID.rows - 1) * GRID.gap) / GRID.rows;
  const c = i % GRID.cols, r = Math.floor(i / GRID.cols);
  return { x: GRID.x + c * (cw + GRID.gap), y: GRID.y + r * (ch + GRID.gap), w: cw, h: ch };
}
// where the little camera looks for each tab: [center y in person units, zoom]
const CAMERA = { hair: [-96, 2.5], hat: [-106, 1.6], face: [-94, 2.9], top: [-62, 1.2], bottom: [-28, 1.45], shoes: [-7, 3.1], extra: [-58, 0.84] };

function renderCards(target, cat) {
  const ids = Object.keys(ITEMS[cat]);
  const [cy0, z] = CAMERA[cat];
  ids.forEach((id, i) => {
    const r = cardRect(i);
    target.fillStyle = '#fbefff'; rr(target, r.x, r.y, r.w, r.h, 14); target.fill();
    target.save();
    rr(target, r.x, r.y, r.w, r.h, 14); target.clip();
    const bg = target.createLinearGradient(0, r.y, 0, r.y + r.h);
    bg.addColorStop(0, '#fff6fb'); bg.addColorStop(1, '#ead7ff');
    target.fillStyle = bg; target.fillRect(r.x, r.y, r.w, r.h);
    const o = copyOutfit(G.outfit);
    const it = ITEMS[cat][id];
    if (cat === 'hair') o.hair.id = id;
    else {
      let color = null;
      if (it.color !== null && it.color !== undefined) color = G.colorPicked[cat] && G.outfit[cat].color ? G.outfit[cat].color : it.color;
      o[cat] = { id, color };
    }
    const cx = r.x + r.w / 2, cy = r.y + (r.h - 20) / 2;
    drawPerson(target, lookOf(G.model, o), cx, cy - cy0 * z, z, 1, { noShadow: cat !== 'shoes', zoom: view.px });
    target.restore();
    target.fillStyle = 'rgba(42,24,64,0.8)'; target.fillRect(r.x, r.y + r.h - 22, r.w, 22);
    text(target, it.name, r.x + r.w / 2, r.y + r.h - 10.5, it.name.length > 12 ? 12 : 14, '#fff', { stroke: false, weight: '700' });
  });
}

function drawWardrobe() {
  // the panel
  ctx.fillStyle = '#2a1840'; ctx.fillRect(PX - 12, 0, W - PX + 12, H);
  // tabs
  const tw = PW / CATEGORIES.length;
  CATEGORIES.forEach((C, i) => {
    const x = PX + i * tw, y = 14, on = G.cat === C.key;
    const hover = inside(mouse, x, y, tw - 4, 56);
    ctx.fillStyle = on ? '#ff4a8a' : hover ? '#5a3a80' : '#43295f';
    rr(ctx, x, y, tw - 4, 56, 12); ctx.fill();
    text(ctx, C.name, x + (tw - 4) / 2, y + 30, 19, '#fff', { fam: FONT_TITLE, weight: '400', lw: 4, stroke: on ? '#8a1240' : '#1a0c28' });
    buttons.push({ x, y, w: tw - 4, h: 56, fn: () => { if (G.cat !== C.key) { G.cat = C.key; Sound.sfx('click'); } } });
  });
  // the cards (drawn once into a picture, until the outfit changes)
  const key = G.cat + '|' + G.model + '|' + JSON.stringify(G.outfit) + '|' + JSON.stringify(G.colorPicked) + '|' + view.px;
  if (!cardCache || cardCache.key !== key) {
    const c = cardCache ? cardCache.canvas : document.createElement('canvas');
    c.width = Math.ceil(GRID.w * view.px); c.height = Math.ceil(GRID.h * view.px);
    const c2 = c.getContext('2d');
    c2.setTransform(view.px, 0, 0, view.px, -GRID.x * view.px, -GRID.y * view.px);
    c2.clearRect(GRID.x, GRID.y, GRID.w, GRID.h);
    renderCards(c2, G.cat);
    cardCache = { key, canvas: c };
  }
  ctx.drawImage(cardCache.canvas, GRID.x, GRID.y, GRID.w, GRID.h);
  const ids = Object.keys(ITEMS[G.cat]);
  ids.forEach((id, i) => {
    const r = cardRect(i);
    const on = G.outfit[G.cat].id === id;
    const hover = inside(mouse, r.x, r.y, r.w, r.h);
    if (on || hover) {
      ctx.strokeStyle = on ? '#ff4a8a' : '#ffe66b'; ctx.lineWidth = on ? 5 : 3;
      rr(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 14); ctx.stroke();
    }
    if (on) { ctx.fillStyle = '#ff4a8a'; circ(ctx, r.x + r.w - 12, r.y + 12, 10); ctx.fill(); text(ctx, '✔', r.x + r.w - 12, r.y + 13, 13, '#fff', { stroke: false }); }
    buttons.push({ x: r.x, y: r.y, w: r.w, h: r.h, fn: () => { if (G.outfit[G.cat].id !== id || G.cat === 'hair') selectItem(G.cat, id); } });
  });
  // colors
  const isHair = G.cat === 'hair';
  const pal = isHair ? HAIR_COLORS : COLORS;
  const cur = G.outfit[G.cat];
  const it = ITEMS[G.cat][cur.id];
  const canColor = isHair || (cur.id !== 'none' && it.color !== null && it.color !== undefined);
  const keys = Object.keys(pal);
  const sw = (PW - 7 * 6) / 8, sh = 34;
  keys.forEach((k, i) => {
    const x = PX + (i % 8) * (sw + 6), y = 560 + Math.floor(i / 8) * (sh + 6);
    ctx.fillStyle = pal[k]; rr(ctx, x, y, sw, sh, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 2; ctx.stroke();
    if (k === 'bill') text(ctx, 'BILL', x + sw / 2, y + sh / 2 + 1, 13, '#7dff9a', { stroke: false, weight: '700' });
    if (canColor && cur.color === k) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; rr(ctx, x - 2, y - 2, sw + 4, sh + 4, 12); ctx.stroke(); }
    if (canColor && inside(mouse, x, y, sw, sh)) { ctx.strokeStyle = '#ffe66b'; ctx.lineWidth = 3; rr(ctx, x - 1, y - 1, sw + 2, sh + 2, 11); ctx.stroke(); }
    if (canColor) buttons.push({ x, y, w: sw, h: sh, fn: () => selectColor(k) });
  });
  if (!canColor) {
    ctx.fillStyle = 'rgba(42,24,64,0.82)'; ctx.fillRect(PX - 2, 556, PW + 4, 82);
    text(ctx, cur.id === 'none' ? 'Pick something to color it!' : "This one can't change color!", PX + PW / 2, 597, 22, '#e6d6ff', { stroke: false });
  }
  button('🎲 RANDOM', PX, 648, 190, 60, randomize, '#8a4fd8', 24);
  button(G.online ? 'DONE! ✔' : 'DONE! WALK! ▶', PX + 202, 648, PW - 202, 60, goRunway, '#ff4a8a', 32);
}

function drawDress() {
  dressRoomBackground();
  const live = judge(G.outfit, G.theme, G.hint);
  // Bill watches from the corner and reacts to your outfit
  const billPose = live.total >= 24 ? 'clap' : 'phone';
  const billMood = live.total >= 24 ? 'happy' : live.total < 14 ? 'meh' : '';
  drawBill(92, 712, 1.95, { pose: billPose, mood: billMood, phone: billPose === 'phone', look: 1 });
  // the model
  const pose = G.flash > 0 ? 'hips' : 'rest';
  drawPerson(ctx, lookOf(G.model, G.outfit), MODEL_X, MODEL_Y, MODEL_S, T, { pose, zoom: view.px });
  drawFx();
  // theme banner and timer
  const th = THEMES[G.theme];
  ctx.fillStyle = 'rgba(42,24,64,0.88)'; rr(ctx, 20, 12, PX - 52, 98, 20); ctx.fill();
  text(ctx, `ROUND ${G.round + 1}/${ROUNDS}`, 38, 36, 20, '#ffd1ea', { align: 'left', stroke: false, weight: '700' });
  text(ctx, th.name + ' ' + th.emoji, 38, 72, th.name.length > 11 ? 38 : 44, '#ffe66b', { fam: FONT_TITLE, weight: '400', align: 'left', lw: 6 });
  text(ctx, "Bill's wish:", PX - 50, 36, 18, '#ffd1ea', { align: 'right', stroke: false, weight: '700' });
  const met = hintMet(G.outfit, G.hint);
  text(ctx, (met ? '✔ ' : '') + G.hint.short, PX - 50, 66, G.hint.short.length > 12 ? 20 : 26, met ? '#7dff9a' : '#fff', { fam: FONT_TITLE, weight: '400', align: 'right', lw: 5 });
  if (timerOn || G.online) {
    const k = clamp(G.time / ROUND_TIME, 0, 1);
    const hurry = G.time <= 10;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; rr(ctx, 38, 92, PX - 88, 10, 5); ctx.fill();
    ctx.fillStyle = hurry ? (Math.floor(T * 6) % 2 ? '#ff4a5a' : '#ffd23f') : '#7dff9a';
    rr(ctx, 38, 92, (PX - 88) * k, 10, 5); ctx.fill();
    if (hurry) text(ctx, Math.ceil(G.time) + '', MODEL_X, 175, 64, '#ff4a5a', { fam: FONT_TITLE, weight: '400', lw: 10 });
  }
  drawWardrobe();
}

// ---------------------------------------------------------------- RUNWAY
const CARD_NAMES = [['THEME', 'theme'], ['STYLE', 'style'], ['BILL', 'bill']];
const WALK_SLOT = 10;   // seconds for each player on the online runway
function drawRunway(S) {
  const R = S.rw, res = S.res;
  const walkEnd = 3, stop = 790;
  let mx = R.t < walkEnd ? 1420 - (1420 - stop) * Math.min(1, R.t / walkEnd) : stop;
  const leaving = S.online && R.t > WALK_SLOT - 1.3;   // online: walk away so the next player can come
  if (leaving) mx = stop + (R.t - (WALK_SLOT - 1.3)) * 520;
  stageBackground([mx, 280]);
  // sign
  ctx.save(); ctx.translate(800, 92);
  ctx.fillStyle = '#1a0a2a'; rr(ctx, -250, -40, 500, 80, 18); ctx.fill();
  ctx.strokeStyle = '#ff4a8a'; ctx.lineWidth = 4; ctx.shadowColor = '#ff4a8a'; ctx.shadowBlur = 16; ctx.stroke(); ctx.shadowBlur = 0;
  text(ctx, "BILL'S FASHION SHOW", 0, 2, 38, '#ffd1ea', { fam: FONT_TITLE, weight: '400', lw: 6, stroke: '#8a1240' });
  ctx.restore();
  const th = THEMES[S.theme];
  text(ctx, th.name + ' ' + th.emoji, 800, 160, 30, '#ffe66b', { fam: FONT_TITLE, weight: '400', lw: 6 });
  if (S.name) { // online: who is walking now
    ctx.fillStyle = 'rgba(26,10,42,0.8)'; rr(ctx, 960, 380, 290, 96, 20); ctx.fill();
    text(ctx, S.me ? 'YOUR TURN!' : 'NOW WALKING:', 1105, 408, 20, '#ffd1ea', { stroke: false, weight: '700' });
    text(ctx, S.name, 1105, 446, 34, S.me ? '#7dff9a' : '#fff', { fam: FONT_TITLE, weight: '400', lw: 6 });
    text(ctx, S.order, 1105, 498, 18, '#c9b6e6', { lw: 4 });
  }

  // the model walks in
  const walking = R.t < walkEnd || leaving;
  const pose = walking ? 'rest' : R.t < 6.6 ? 'hips' : res.stars >= 3 ? 'wave' : 'rest';
  drawPerson(ctx, lookOf(S.model, S.outfit), mx, 650, 3.4, T, { walk: walking ? R.t * 9 : null, pose, mood: !walking && R.t > 6.6 && res.stars <= 1 ? 'meh' : '', zoom: view.px });

  // Bill at the judge's desk
  const reveal = Math.floor((R.t - 3.4) / 1) + 1;   // how many cards are showing
  const reacting = R.t >= 6.6;
  let bPose = 'rest', bMood = '';
  if (!reacting && reveal >= 1 && reveal <= 3) bPose = 'card';
  if (reacting) {
    if (res.stars >= 5) { bPose = 'wow'; bMood = 'wow'; }
    else if (res.stars === 4) { bPose = 'clap'; bMood = 'happy'; }
    else if (res.stars === 3) { bMood = 'happy'; }
    else if (res.stars === 2) { bMood = 'meh'; }
    else { bPose = 'angry'; bMood = 'angry'; }
  }
  const out = {};
  drawBill(250, 700, 3.1, { pose: bPose, mood: bMood, out, look: 1 });
  // the card Bill is holding up
  if (!reacting && reveal >= 1 && reveal <= 3) {
    const [cardName, key] = CARD_NAMES[reveal - 1];
    const hx = 250 + out.rh[0] * 3.1, hy = 700 + out.rh[1] * 3.1;
    ctx.fillStyle = '#fffdf6'; rr(ctx, hx - 40, hy - 70, 80, 64, 10); ctx.fill();
    ctx.strokeStyle = '#2a1840'; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, res[key] + '', hx, hy - 34, 40, '#ff4a8a', { fam: FONT_TITLE, weight: '400', stroke: false });
    text(ctx, cardName, hx, hy - 60, 12, '#2a1840', { stroke: false, weight: '700' });
  }
  // the desk
  ctx.fillStyle = '#3a1f55'; rr(ctx, 30, 520, 450, 200, 14); ctx.fill();
  ctx.fillStyle = '#ff4a8a'; ctx.fillRect(30, 520, 450, 14);
  text(ctx, 'JUDGE BILL', 255, 568, 30, '#ffd1ea', { fam: FONT_TITLE, weight: '400', lw: 6, stroke: '#1a0a2a' });
  // the score cards on the desk
  CARD_NAMES.forEach(([cardName, key], i) => {
    const x = 60 + i * 140, y = 600;
    const shown = reveal > i;
    ctx.fillStyle = shown ? '#fffdf6' : '#5a3a80'; rr(ctx, x, y, 120, 96, 12); ctx.fill();
    ctx.strokeStyle = '#1a0a2a'; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, cardName, x + 60, y + 18, 18, shown ? '#8a4fd8' : '#c9b6e6', { fam: FONT_TITLE, weight: '400', stroke: false });
    if (shown) {
      const v = res[key];
      text(ctx, v + '', x + 60, y + 58, 50, v >= 8 ? '#36b04f' : v >= 5 ? '#f08a24' : '#e23b3b', { fam: FONT_TITLE, weight: '400', stroke: false });
      text(ctx, '/10', x + 100, y + 82, 14, '#7a6a8a', { stroke: false });
    } else text(ctx, '?', x + 60, y + 58, 44, '#c9b6e6', { fam: FONT_TITLE, weight: '400', stroke: false });
  });
  // the reaction
  if (reacting) {
    ctx.fillStyle = 'rgba(26,10,42,0.75)'; rr(ctx, 960, 230, 290, 120, 20); ctx.fill();
    drawStarsRow(1105, 275, 5, res.stars, 23, R.t - 6.6);
    text(ctx, res.stars + (res.stars === 1 ? ' STAR' : ' STARS') + '!', 1105, 325, 30, '#ffe66b', { fam: FONT_TITLE, weight: '400', lw: 6 });
    bubble(40, 190, 520, 150, 250, 350);
    text(ctx, S.lines[0], 300, 226, S.lines[0].length > 24 ? 26 : 32, '#ff4a8a', { fam: FONT_TITLE, weight: '400', stroke: false });
    S.lines.slice(1, 3).forEach((l, i) => text(ctx, l, 300, 270 + i * 32, l.length > 40 ? 17 : 20, '#2a1840', { stroke: false }));
    if (R.t > 7 && !S.online) button(S.round + 1 >= ROUNDS ? 'SEE RESULTS ▶' : 'NEXT ROUND ▶', 920, 600, 320, 76, nextRound, '#ff4a8a', 32);
  }
  drawFx();
}

function updateRunway(dt) {
  const before = G.rw.t;
  G.rw.t += dt;
  runwaySounds(G.res, before, G.rw.t);
}
function runwaySounds(res, before, now) {
  for (let i = 0; i < 3; i++) if (before < 3.4 + i && now >= 3.4 + i) Sound.sfx('card');
  if (before < 6.6 && now >= 6.6) {
    const s = res.stars;
    if (s >= 5) { Sound.sfx('scream'); Sound.sfx('cheer'); confetti(160); }
    else if (s === 4) { Sound.sfx('clap'); Sound.sfx('cheer'); confetti(70); }
    else if (s === 3) Sound.sfx('clap');
    else if (s === 2) Sound.sfx('sad');
    else Sound.sfx('boo');
    for (let i = 0; i < s; i++) setTimeout(() => Sound.sfx('star'), 250 * i);
  }
}

// ---------------------------------------------------------------- END
function drawEnd() {
  stageBackground([640]);
  text(ctx, 'THE SHOW IS OVER!', 640, 70, 56, '#ffd1ea', { fam: FONT_TITLE, weight: '400', lw: 12, stroke: '#2a0f45' });
  const r = rankOf(G.totalStars);
  text(ctx, `★ ${G.totalStars} / ${ROUNDS * 5}`, 640, 140, 50, '#ffe66b', { fam: FONT_TITLE, weight: '400', lw: 10 });
  text(ctx, r.name + ' ' + r.emoji, 640, 200, 40, '#7dff9a', { fam: FONT_TITLE, weight: '400', lw: 8 });
  if (G.newBest) text(ctx, 'NEW BEST SHOW!', 640, 240, 24, '#ff4a8a', { lw: 5 });
  // the 5 outfits
  G.results.forEach((res, i) => {
    const x = 160 + i * 240, y = 280;
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; rr(ctx, x - 100, y, 200, 330, 18); ctx.fill();
    drawPerson(ctx, lookOf(G.model, res.outfit), x, y + 280, 2.1, T, { phase: i, pose: 'hips', zoom: view.px });
    text(ctx, THEMES[res.theme].name, x, y + 22, 20, '#fff', { fam: FONT_TITLE, weight: '400', lw: 5 });
    drawStarsRow(x, y + 308, 5, res.res.stars, 11);
  });
  button('PLAY AGAIN', 380, 636, 250, 66, () => newShow(G.model), '#ff4a8a', 30);
  button('MENU', 650, 636, 250, 66, () => { screen = 'title'; }, '#8a4fd8', 30);
  drawFx();
}

// =====================================================================
//  ONLINE: compete with friends who have this game open at the same time
//  One player hosts. The host's "game" (theme, Bill's wish, round) is shared
//  with everyone in the game room. Each player shares their outfit and points.
// =====================================================================
const Net = {
  lobby: null, user: null, myId: null, room: null, code: '', host: false, model: 'mio',
  game: { phase: 'lobby', seq: 0 }, seen: -1, names: {}, hostGone: 0,
  pts: 0, stars: 0, done: -1, msg: '', busy: false, themes: [], phaseT: 0, cheered: false,
};

(async () => {
  try {
    if (!window.claude || !window.claude.use) return;
    const [room, user] = await Promise.all([window.claude.use('room'), window.claude.use('user')]);
    if (!room) return;
    Net.user = user;
    if (user) Net.myId = await user.id();
    Net.lobby = room;
    room.onPeers(ch => resolveNames(ch.peers), () => { Net.lobby = null; });
  } catch (e) { /* online play is not available here */ }
})();

function resolveNames(peers) {
  if (!Net.user) return;
  const ids = [...new Set(peers.map(peerId).filter(Boolean))];
  if (!ids.length) return;
  Net.user.profiles(ids).then(ps => { for (const id of ids) if (ps[id] && ps[id].name) Net.names[id] = ps[id].name; }).catch(() => {});
}
function peerId(p) { return p.by || (p.presence && typeof p.presence.uid === 'string' ? p.presence.uid : null); }
function peerName(p) {
  const id = peerId(p);
  const first = ((id && Net.names[id]) || '').split(' ')[0];
  const M = MODELS[peerModel(p)];
  return (first || (M ? M.name : 'PLAYER')).slice(0, 14);
}
function peerModel(p) { return MODELS[p.presence && p.presence.model] ? p.presence.model : 'mio'; }
const num = (v, max) => clamp(Math.round(+v || 0), 0, max);

// Other players' outfits come from the network: only keep real items and colors
function cleanOutfit(o, model) {
  const d = defaultOutfit(model);
  if (!o || typeof o !== 'object') return d;
  for (const C of CATEGORIES) {
    const v = o[C.key];
    if (!v || typeof v !== 'object' || !Object.prototype.hasOwnProperty.call(ITEMS[C.key], v.id)) continue;
    const pal = C.key === 'hair' ? HAIR_COLORS : COLORS;
    const color = Object.prototype.hasOwnProperty.call(pal, v.color) ? v.color : null;
    d[C.key] = { id: v.id, color: C.key === 'hair' ? (color || d.hair.color) : color };
  }
  return d;
}
function cleanHint(h, theme) {
  if (h && h.type === 'color' && Object.prototype.hasOwnProperty.call(COLORS, h.key)) return { type: 'color', key: h.key, text: 'something ' + colorName(h.key), short: colorName(h.key) };
  if (h && h.type === 'item' && PIECES.includes(h.cat) && Object.prototype.hasOwnProperty.call(ITEMS[h.cat], h.id) && h.id !== 'none') {
    const name = ITEMS[h.cat][h.id].name;
    return { type: 'item', cat: h.cat, id: h.id, text: withArticle(name), short: name.toUpperCase() };
  }
  return makeHint(theme);
}

function players() {
  if (!Net.room) return [];
  return Net.room.peers().filter(p => p.presence && (p.presence.role === 'host' || p.presence.role === 'player'));
}
function hostPeer() { return players().find(p => p.presence.role === 'host'); }

function myPresence(extra) {
  if (!Net.room) return;
  const p = { role: Net.host ? 'host' : 'player', model: Net.model, uid: Net.myId, pts: Net.pts, stars: Net.stars, done: Net.done };
  if (Net.host) p.game = Net.game;
  Net.room.presence(Object.assign(p, extra || {})).catch(() => {});
  if (Net.host) lobbyPresence();
}
function lobbyPresence() {
  if (!Net.lobby || !Net.host) return;
  Net.lobby.presence({ hosting: Net.code, open: Net.game.phase === 'lobby', n: Math.max(1, players().length), model: Net.model, uid: Net.myId }).catch(() => {});
}

async function enterRoom(code, asHost) {
  if (Net.busy || !Net.lobby) return;
  Net.busy = true; Net.msg = '';
  try {
    Net.room = await Net.lobby.join(code);
  } catch (e) {
    Net.busy = false; Net.msg = "Couldn't connect to that game. Try again!"; return;
  }
  Net.busy = false;
  Object.assign(Net, { code, host: asHost, seen: -1, hostGone: 0, pts: 0, stars: 0, done: -1, game: { phase: 'lobby', seq: 0 } });
  Net.room.onPeers(ch => { resolveNames(ch.peers); if (Net.host) lobbyPresence(); }, () => leaveGame('You lost the connection to the game.'));
  myPresence({ outfit: null, res: null });
  screen = 'lobby';
  Sound.sfx('go');
}
function createGame() { enterRoom('bill-' + Math.random().toString(36).slice(2, 7), true); }

function leaveGame(msg) {
  const r = Net.room;
  Net.room = null;
  if (r) r.leave().catch(() => {});
  if (Net.lobby && Net.host) Net.lobby.presence({ hosting: null, open: null, n: null, model: null }).catch(() => {});
  Net.host = false;
  Net.msg = msg || '';
  if (G) G.online = false;
  screen = 'online';
}

// ---- the host runs the show
function hostSet(game) {
  Net.game = Object.assign({}, game, { seq: (Net.game.seq || 0) + 1 });
  Net.phaseT = 0;
  myPresence();
}
function hostStart() {
  Net.themes = shuffle(Object.keys(THEMES)).slice(0, ROUNDS);
  hostRound(0);
}
function hostRound(r) {
  const theme = Net.themes[r] || pick(Object.keys(THEMES));
  const h = makeHint(theme);
  hostSet({ phase: 'dress', round: r, theme, hint: h.type === 'color' ? { type: 'color', key: h.key } : { type: 'item', cat: h.cat, id: h.id } });
}
function hostResults() {
  hostSet({ phase: 'results', round: Net.game.round, theme: Net.game.theme, hint: Net.game.hint, dressSeq: Net.game.seq });
}
function hostNext() {
  const r = Net.game.round + 1;
  if (r >= ROUNDS) hostSet({ phase: 'final', round: Net.game.round });
  else hostRound(r);
}

// ---- everyone follows the host
function updateOnline(dt) {
  Net.phaseT += dt;
  const h = hostPeer();
  if (!Net.host) {
    if (!h) { Net.hostGone += dt; if (Net.hostGone > 5) leaveGame('The host left the game.'); return; }
    Net.hostGone = 0;
  }
  const g = Net.host ? Net.game : h.presence.game;
  if (g && typeof g === 'object' && typeof g.seq === 'number' && g.seq !== Net.seen) {
    Net.seen = g.seq;
    if (!Net.host) { Net.game = g; Net.phaseT = 0; }
    followPhase(g);
  }
  // the host moves on when everyone is done (or after the time is up)
  if (Net.host && Net.game.phase === 'dress') {
    const ps = players();
    const allDone = ps.length > 0 && ps.every(p => p.presence.done === Net.game.seq);
    if (allDone || Net.phaseT > ROUND_TIME + 30) hostResults();
  }
  if (screen === 'oshow') {
    const before = Net.showT;
    Net.showT += dt;
    if (Net.showT < 2) Net.showList = buildShow(Net.showList);   // wait a moment for everyone's outfit to arrive
    const list = Net.showList;
    const i0 = Math.floor(before / WALK_SLOT), i1 = Math.floor(Net.showT / WALK_SLOT);
    for (const i of new Set([i0, i1])) if (list[i]) runwaySounds(list[i].res, before - i * WALK_SLOT, Net.showT - i * WALK_SLOT);
    if (Net.showT > Math.max(2, list.length * WALK_SLOT)) { screen = 'oresults'; Net.resT = 0; }
  }
  if (screen === 'oresults') {
    Net.resT += dt;
    const list = roundList();
    if (!Net.cheered && list.length && Net.resT > revealTime(list.length)) {
      Net.cheered = true;
      Sound.sfx('scream'); Sound.sfx('cheer'); confetti(120);
    }
  }
}

function followPhase(g) {
  if (g.phase === 'lobby') {
    Net.pts = 0; Net.stars = 0; Net.done = -1;
    myPresence({ outfit: null, res: null });
    screen = 'lobby';
  } else if (g.phase === 'dress' && THEMES[g.theme]) {
    const round = num(g.round, ROUNDS - 1);
    if (round === 0) { Net.pts = 0; Net.stars = 0; }
    G = { model: Net.model, online: true, round, cat: 'top', results: [], dressSeq: g.seq };
    beginRound(g.theme, cleanHint(g.hint, g.theme));
  } else if (g.phase === 'results') {
    Net.cheered = false;
    Net.showT = 0; Net.resT = 0; Net.showList = buildShow([]);
    screen = 'oshow';
    Sound.sfx('whistle');
  } else if (g.phase === 'final') {
    screen = 'ofinal';
    Sound.sfx('win');
    confetti(150);
  }
}

function onlineDone() {
  const res = judge(G.outfit, G.theme, G.hint);
  Net.pts += res.total; Net.stars += res.stars; Net.done = G.dressSeq;
  myPresence({ outfit: G.outfit, res: { total: res.total, stars: res.stars, theme: res.theme, style: res.style, bill: res.bill } });
  screen = 'owait';
  Sound.sfx('go');
}

// The players who finished this round, worst first (the winner is revealed last)
function roundList() {
  return (Net.showList || []).slice().sort((a, b) => a.total - b.total);
}
const revealTime = n => 0.6 + n * 0.6;

// Everyone who finished, in the same order on every screen. Bill judges each outfit right here.
function buildShow(old) {
  const theme = Net.game.theme;
  if (!THEMES[theme]) return [];
  const hint = Net.showHint && Net.showHint.seq === Net.game.seq ? Net.showHint.h : (Net.showHint = { seq: Net.game.seq, h: cleanHint(Net.game.hint, theme) }).h;
  const seq = Net.game.dressSeq;
  return players().filter(p => p.presence.done === seq && p.presence.outfit)
    .sort((a, b) => (a.peer < b.peer ? -1 : 1))
    .map(p => {
      const prev = old.find(o => o.peer === p.peer);
      if (prev) return prev;
      const model = peerModel(p), outfit = cleanOutfit(p.presence.outfit, model);
      const res = judge(outfit, theme, hint, model);
      return { p, peer: p.peer, name: peerName(p), me: p.sameTab, model, outfit, res, total: res.total, stars: res.stars,
        lines: billSays(res, theme, hint), theme, online: true, rw: { t: 0 }, pts: num(p.presence.pts, 30 * ROUNDS) };
    });
}

function drawShow() {
  const list = Net.showList || [];
  const i = Math.floor(Net.showT / WALK_SLOT);
  const S = list[Math.min(i, list.length - 1)];
  if (!S) {
    stageBackground([640]);
    text(ctx, 'Getting the runway ready...', 640, 340, 36, '#fff', { fam: FONT_TITLE, weight: '400', lw: 8 });
    return;
  }
  S.rw.t = Net.showT - list.indexOf(S) * WALK_SLOT;
  S.order = 'model ' + (list.indexOf(S) + 1) + ' of ' + list.length;
  drawRunway(S);
}

// ---- screens
function drawOnline() {
  stageBackground([640]);
  text(ctx, 'PLAY ONLINE', 640, 76, 56, '#7dff9a', { fam: FONT_TITLE, weight: '400', lw: 12, stroke: '#0d2219' });
  drawPerson(ctx, lookOf(Net.model, defaultOutfit(Net.model)), 1110, 600, 2.4, T, { pose: 'wave' });
  text(ctx, 'YOUR MODEL: ' + MODELS[Net.model].name, 1110, 640, 20, '#fff', { lw: 5 });
  button('BACK', 40, 640, 150, 54, () => { if (Net.room) leaveGame(); screen = 'title'; }, '#8a4fd8', 26);
  if (!Net.lobby) {
    ctx.fillStyle = 'rgba(26,10,42,0.85)'; rr(ctx, 240, 180, 760, 260, 24); ctx.fill();
    text(ctx, 'Online play only works when the game', 620, 260, 28, '#fff', { stroke: false });
    text(ctx, 'is open on claude.ai.', 620, 300, 28, '#fff', { stroke: false });
    text(ctx, 'You can still play alone with PLAY!', 620, 370, 24, '#ffe66b', { stroke: false });
    return;
  }
  button(Net.busy ? 'CONNECTING...' : '➕ MAKE A GAME', 340, 130, 560, 74, createGame, '#ff4a8a', 34, Net.busy);
  text(ctx, 'or join a friend\'s game:', 620, 240, 24, '#ffd1ea', { lw: 5 });
  const games = Net.lobby.peers().filter(p => !p.sameTab && p.presence && typeof p.presence.hosting === 'string' && /^bill-[a-z0-9]{1,8}$/.test(p.presence.hosting) && p.presence.open);
  if (!games.length) {
    text(ctx, 'No games yet. Make one and tell your friends to press ONLINE!', 620, 300, 22, '#c9b6e6', { stroke: false });
  }
  games.slice(0, 4).forEach((p, i) => {
    const y = 270 + i * 84;
    ctx.fillStyle = 'rgba(26,10,42,0.85)'; rr(ctx, 290, y, 660, 72, 18); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(300, y + 4, 70, 64); ctx.clip();
    drawPerson(ctx, lookOf(peerModel(p), defaultOutfit(peerModel(p))), 335, y + 160, 1.5, T, { noShadow: true });
    ctx.restore();
    text(ctx, peerName(p) + "'s game", 390, y + 28, 28, '#fff', { align: 'left', fam: FONT_TITLE, weight: '400', lw: 5 });
    text(ctx, num(p.presence.n, 99) + ' player' + (num(p.presence.n, 99) === 1 ? '' : 's') + ' waiting', 390, y + 54, 18, '#c9b6e6', { align: 'left', stroke: false });
    button('JOIN', 800, y + 10, 130, 52, () => enterRoom(p.presence.hosting, false), '#2fa86a', 26, Net.busy);
  });
  if (Net.msg) text(ctx, Net.msg, 620, 620, 22, '#ff8a9a', { lw: 5 });
}

function drawPlayersRow(list, y, s, opts) {
  const n = list.length;
  const gap = Math.min(220, (W - 120) / Math.max(1, n));
  list.forEach((it, i) => {
    const x = W / 2 + (i - (n - 1) / 2) * gap;
    drawPerson(ctx, lookOf(it.model, it.outfit), x, y, s, T, { phase: i, pose: it.pose || 'rest', mood: it.mood || '', zoom: view.px });
    text(ctx, it.name, x, y + 26, 22, it.me ? '#7dff9a' : '#fff', { fam: FONT_TITLE, weight: '400', lw: 5 });
    if (it.tag) text(ctx, it.tag, x, y + 52, 17, it.tagColor || '#ffe66b', { lw: 4 });
    if (opts && opts.after) opts.after(it, x, i);
  });
}

function drawLobby() {
  stageBackground([640]);
  text(ctx, 'GAME ROOM', 640, 70, 54, '#7dff9a', { fam: FONT_TITLE, weight: '400', lw: 12, stroke: '#0d2219' });
  const list = players().map(p => ({ name: peerName(p), model: peerModel(p), outfit: defaultOutfit(peerModel(p)), me: p.sameTab, pose: 'wave', tag: (p.presence.role === 'host' ? '👑 HOST' : '') + (p.sameTab ? ' (you)' : '') }));
  text(ctx, list.length + ' player' + (list.length === 1 ? '' : 's') + ' here', 640, 120, 24, '#ffd1ea', { lw: 5 });
  drawPlayersRow(list, 520, list.length > 5 ? 2 : 2.6);
  if (Net.host) {
    button('START THE SHOW ▶', 440, 616, 400, 76, hostStart, '#ff4a8a', 34);
    text(ctx, 'Friends join by pressing ONLINE on their screen.', 640, 160, 20, '#c9b6e6', { stroke: false });
  } else {
    text(ctx, 'Waiting for the host to start' + '...'.slice(0, 1 + Math.floor(T * 2) % 3), 640, 650, 30, '#ffe66b', { lw: 6 });
  }
  button('LEAVE', 40, 640, 150, 54, () => leaveGame(), '#8a4fd8', 26);
}

function drawWait() {
  stageBackground([640]);
  text(ctx, 'YOU ARE DONE! ✔', 640, 76, 54, '#7dff9a', { fam: FONT_TITLE, weight: '400', lw: 12, stroke: '#0d2219' });
  text(ctx, 'Waiting for everyone to finish getting dressed...', 640, 128, 24, '#ffd1ea', { lw: 5 });
  const seq = Net.game.seq;
  const list = players().map(p => {
    const done = p.presence.done === seq;
    return { name: peerName(p), model: peerModel(p), outfit: done ? cleanOutfit(p.presence.outfit, peerModel(p)) : defaultOutfit(peerModel(p)), me: p.sameTab,
      pose: done ? 'hips' : 'rest', tag: done ? 'READY ✔' : 'getting dressed...', tagColor: done ? '#7dff9a' : '#c9b6e6' };
  });
  drawPlayersRow(list, 560, list.length > 5 ? 2 : 2.6);
  if (Net.host) button('SHOW RESULTS NOW', 900, 640, 340, 60, hostResults, '#8a4fd8', 24);
}

function drawRoundResults() {
  stageBackground([640]);
  const th = THEMES[Net.game.theme] || { name: '', emoji: '' };
  text(ctx, `ROUND ${num(Net.game.round, ROUNDS) + 1} RESULTS`, 640, 64, 48, '#ffd1ea', { fam: FONT_TITLE, weight: '400', lw: 10, stroke: '#2a0f45' });
  text(ctx, th.name + ' ' + th.emoji, 640, 112, 28, '#ffe66b', { fam: FONT_TITLE, weight: '400', lw: 6 });
  const list = roundList();
  const n = list.length;
  const done = Net.resT > revealTime(n);
  const top = n ? list[n - 1].total : 0;
  const shown = list.map((it, i) => {
    const visible = Net.resT > 0.6 + i * 0.6;
    const win = done && it.total === top;
    return Object.assign({}, it, {
      pose: win ? 'wave' : 'hips',
      outfit: visible ? it.outfit : defaultOutfit(it.model),
      tag: visible ? it.total + ' points' : '?', tagColor: win ? '#ffe66b' : '#fff', visible, win,
    });
  });
  if (!n) text(ctx, 'Nobody finished this round!', 640, 360, 30, '#fff', { lw: 6 });
  drawPlayersRow(shown, 540, n > 5 ? 1.9 : 2.4, {
    after: (it, x) => {
      if (!it.visible) return;
      drawStarsRow(x, 618, 5, it.stars, 10);
      if (it.win) { ctx.save(); ctx.translate(x, 540 - 112 * (n > 5 ? 1.9 : 2.4) - 30); text(ctx, '🏆 WINNER!', 0, 0, 26, '#ffe66b', { fam: FONT_TITLE, weight: '400', lw: 6 }); ctx.restore(); }
    },
  });
  drawBill(80, 712, 1.6, { pose: done ? 'wow' : 'card', mood: done ? 'wow' : '' });
  if (Net.host && done) button(Net.game.round + 1 >= ROUNDS ? 'FINAL RESULTS ▶' : 'NEXT ROUND ▶', 900, 640, 340, 64, hostNext, '#ff4a8a', 28);
  else if (done) text(ctx, 'Waiting for the host...', 1070, 672, 22, '#ffe66b', { lw: 5 });
  drawFx();
}

function drawFinal() {
  stageBackground([640]);
  text(ctx, 'THE SHOW IS OVER!', 640, 64, 52, '#ffd1ea', { fam: FONT_TITLE, weight: '400', lw: 12, stroke: '#2a0f45' });
  const list = players().map(p => ({ p, name: peerName(p), model: peerModel(p), outfit: cleanOutfit(p.presence.outfit, peerModel(p)), pts: num(p.presence.pts, 30 * ROUNDS), stars: num(p.presence.stars, 5 * ROUNDS), me: p.sameTab }))
    .sort((a, b) => b.pts - a.pts);
  const medals = ['🥇', '🥈', '🥉'];
  // podium order: 2nd, 1st, 3rd, then the rest
  const order = list.length >= 3 ? [list[1], list[0], list[2]].concat(list.slice(3)) : list.length === 2 ? [list[1], list[0]] : list;
  const shown = order.map(it => {
    const place = list.indexOf(it);
    return Object.assign({}, it, { pose: place === 0 ? 'wave' : 'hips', tag: (medals[place] || '#' + (place + 1)) + ' ' + it.pts + ' pts  ★' + it.stars, tagColor: place === 0 ? '#ffe66b' : '#fff' });
  });
  if (list.length) text(ctx, '👑 ' + list[0].name + ' WINS! 👑', 640, 122, 36, '#7dff9a', { fam: FONT_TITLE, weight: '400', lw: 8 });
  drawPlayersRow(shown, 560, list.length > 5 ? 1.9 : 2.5);
  if (Net.host) button('PLAY AGAIN', 900, 640, 340, 60, () => hostSet({ phase: 'lobby' }), '#ff4a8a', 28);
  button('LEAVE', 40, 640, 150, 54, () => leaveGame(), '#8a4fd8', 26);
  drawFx();
}

// =====================================================================
//  MAIN LOOP
// =====================================================================
function update(dt) {
  updateFx(dt);
  if (Net.room) updateOnline(dt);
  if (screen === 'intro') { G.introT += dt; if (G.online && G.introT > 5) startDressing(); }
  if (screen === 'dress') {
    G.flash = Math.max(0, G.flash - dt);
    if (timerOn || G.online) {
      G.time -= dt;
      if (G.time <= 10 && Math.ceil(G.time) < G.lastTick) { G.lastTick = Math.ceil(G.time); if (G.time > 0) Sound.sfx('tick'); }
      if (G.time <= 0) { Sound.sfx('timeup'); goRunway(); }
    }
  } else if (screen === 'runway') updateRunway(dt);
  else if (screen === 'end') {
    G.endT += dt;
    if (G.totalStars >= 13 && Math.random() < dt * 2) confetti(6);
  }
}

function draw() {
  ctx.setTransform(view.px, 0, 0, view.px, 0, 0);
  buttons = [];
  if (screen === 'title') drawTitle();
  else if (screen === 'pick') drawPick();
  else if (screen === 'intro') drawIntro();
  else if (screen === 'dress') drawDress();
  else if (screen === 'runway') drawRunway(G);
  else if (screen === 'end') drawEnd();
  else if (screen === 'online') drawOnline();
  else if (screen === 'lobby') drawLobby();
  else if (screen === 'owait') drawWait();
  else if (screen === 'oshow') drawShow();
  else if (screen === 'oresults') drawRoundResults();
  else if (screen === 'ofinal') drawFinal();
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const s = Math.min(innerWidth / W, innerHeight / H);
  view.s = s; view.ox = (innerWidth - W * s) / 2; view.oy = (innerHeight - H * s) / 2;
  canvas.style.left = view.ox + 'px'; canvas.style.top = view.oy + 'px';
  canvas.style.width = W * s + 'px'; canvas.style.height = H * s + 'px';
  canvas.width = Math.max(1, Math.round(W * s * dpr)); canvas.height = Math.max(1, Math.round(H * s * dpr));
  view.px = s * dpr;
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now; T += dt;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// for testing from the browser console
window.DTIB = {
  newShow, goRunway, nextRound, randomize, selectItem, selectColor, judge,
  set cat(c) { G.cat = c; }, get G() { return G; }, get screen() { return screen; },
  skip(t) { if (G && G.rw) G.rw.t = t; },
  get net() { return Net; }, hostStart, hostNext, createGame,
};
})();
