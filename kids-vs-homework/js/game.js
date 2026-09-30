// =====================================================================
//  KIDS vs HOMEWORK: the rules, the screens and the main loop
// =====================================================================
(() => {
'use strict';

const W = 1280, H = 720;
const B = { x: 250, y: 140, cw: 100, rh: 110, cols: 9, rows: 5 };  // the rug grid
const DOOR = { x: 22, y: 168, w: 110, h: 470 };
const VAC_X = 196;
const ORDER = ['snack', 'natti', 'bill', 'gamer', 'mio', 'splash', 'eraser'];
const START_KIDS = ['snack', 'natti'];
const SAVE_KEY = 'kids-vs-homework-v1';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const view = { s: 1, ox: 0, oy: 0, px: 1 };
const mouse = { x: -99, y: -99 };
let buttons = [];
let screen = 'title';     // title, days, play, won, lost, final
let G = null;             // everything about the day you're playing
let T = 0;                // clock for animations
let result = null;        // what to show on the win / lose screens
let menuFx = [];          // confetti on menus
let save = loadSave();

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cellX = c => B.x + (c + 0.5) * B.cw;
const rowY = r => B.y + (r + 1) * B.rh - 14;

function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (d && typeof d.day === 'number') return { day: d.day, beaten: d.beaten || [] };
  } catch (e) { /* no storage */ }
  return { day: 0, beaten: [] };
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* no storage */ }
}

// Which kids you have on a day
function kidsForDay(i) {
  const list = START_KIDS.slice();
  for (let j = 0; j < i && j < LEVELS.length; j++) list.push(...LEVELS[j].unlock);
  return ORDER.filter(k => list.includes(k));
}

// Turns "BIG sheet*3 math" into a list of homework
function parseWaves(waves) {
  return waves.map(w => {
    const out = { list: [], big: false, boss: false };
    for (const tok of w.trim().split(/\s+/)) {
      if (tok === 'BIG') out.big = true;
      else if (tok === 'BOSS') { out.big = true; out.boss = true; }
      else {
        const [name, n] = tok.split('*');
        if (!HOMEWORK[name]) { console.warn('Unknown homework:', name); continue; }
        for (let i = 0; i < (+n || 1); i++) out.list.push(name);
      }
    }
    return out;
  });
}

// =====================================================================
//  STARTING A DAY
// =====================================================================
function startDay(i) {
  const L = LEVELS[i];
  G = {
    day: i, L, lanes: L.lanes, waves: parseWaves(L.waves),
    snacks: L.snacks,
    grid: Array.from({ length: B.rows }, () => Array(B.cols).fill(null)),
    enemies: [], shots: [], lobs: [], cookies: [], fx: [],
    vac: [0, 1, 2, 3, 4].map(r => L.lanes.includes(r) ? { state: 'ready', x: VAC_X } : null),
    cards: kidsForDay(i).map(type => ({ type, cool: 0, bad: 0 })),
    sel: null, removing: false,
    waveIdx: 0, waveTimer: L.firstWave || 20, sinceWave: 0, queue: [],
    sky: 4, time: 0, paused: false, speed: 1, shake: 0,
    banner: { text: L.day, sub: 'Keep the homework out of your room!', t: 3.5 },
    trophy: null, done: false, lastDeath: null,
    placed: 0, collected: 0, snackKids: 0, bar: 0,
  };
  screen = 'play';
  Sound.sfx('click');
}

// =====================================================================
//  UPDATE (runs many times per second)
// =====================================================================
function update(dt) {
  const g = G;
  g.time += dt;
  g.shake = Math.max(0, g.shake - dt * 20);
  for (const c of g.cards) { c.cool = Math.max(0, c.cool - dt); c.bad = Math.max(0, c.bad - dt); }
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  g.bar += (g.waveIdx / g.waves.length - g.bar) * Math.min(1, dt * 2);

  // cookies falling from the sky
  if (!g.trophy) {
    g.sky -= dt;
    if (g.sky <= 0) {
      g.sky = rand(8, 11);
      const r = pick(g.lanes);
      dropCookie(rand(B.x + 30, B.x + B.cw * B.cols - 30), -20, rowY(r) - rand(10, 60), true);
    }
  }
  updateWaves(dt);
  updateKids(dt);
  updateEnemies(dt);
  if (g.done) return;
  updateShots(dt);
  updateLobs(dt);
  updateCookies(dt);
  updateVacuums(dt);
  updateFx(dt, g.fx);
  checkWin();
}

// ---------------- waves of homework ----------------
function updateWaves(dt) {
  const g = G;
  for (let i = g.queue.length - 1; i >= 0; i--) {
    const q = g.queue[i];
    q.at -= dt;
    if (q.at <= 0) { spawn(q.type, q.row); g.queue.splice(i, 1); }
  }
  if (g.waveIdx >= g.waves.length) return;
  g.waveTimer -= dt; g.sinceWave += dt;
  // if you beat a wave quickly, the next one comes sooner
  const quiet = g.enemies.length === 0 && g.queue.length === 0 && g.waveIdx > 0 && g.sinceWave > 6;
  if (g.waveTimer <= 0 || quiet) startWave();
}

function startWave() {
  const g = G, w = g.waves[g.waveIdx++];
  g.sinceWave = 0;
  g.waveTimer = (g.L.gap || 17) + w.list.length * 1.2;
  let delay = 0;
  if (w.boss) {
    delay = 3.5;
    g.banner = { text: 'THE SCIENCE PROJECT', sub: 'is coming for you!!!', t: 3.5, red: true };
    Sound.sfx('roar'); Sound.say('Oh no. The science project is here!', 1.1);
  } else if (w.big) {
    delay = 3.5;
    g.banner = { text: 'A HUGE PILE OF HOMEWORK', sub: 'is coming!', t: 3.5, red: true };
    Sound.sfx('horn'); Sound.say('A huge pile of homework is coming!', 1.1);
  }
  const middle = g.lanes[Math.floor(g.lanes.length / 2)];
  w.list.forEach((type, i) => {
    const row = type === 'boss' ? middle : pick(g.lanes);
    g.queue.push({ type, row, at: delay + i * rand(0.7, 1.3) * (w.big ? 0.9 : 1.8) });
  });
}

const LABELS = {
  sheet: ['SPELLING', 'NAME: ____', 'READING', 'Q1: ______', 'SUMMARY'],
  math: ['7×8=?', '12÷4=?', '9+6=?', '3×7=?', '15-8=?'],
  mini: ['1+1', '2+2', '5-3', '3+1'],
  book: ['MATH', 'SCIENCE', 'HISTORY', 'GRAMMAR'],
};

function spawn(type, row, x) {
  const HW = HOMEWORK[type];
  const e = {
    type, row, x: x != null ? x : W + rand(25, 60), y: rowY(row),
    hp: HW.hp, max: HW.hp, speed: HW.speed, walk: rand(0, 6),
    flash: 0, slow: 0, eating: null, biteT: 0, jump: 0, jumpV: 0, jumped: false,
    label: LABELS[type] ? pick(LABELS[type]) : '', dead: false,
    erupt: type === 'boss' ? 7 : 0, blast: 0,
  };
  G.enemies.push(e);
  if (type === 'plane') Sound.sfx('whoosh');
  return e;
}

// ---------------- the kids do their thing ----------------
function enemyAhead(r, kx) {
  return G.enemies.some(e => e.row === r && !e.dead && e.x > kx - 10 && e.x < W - 10);
}
function firstAhead(r, kx) {
  let best = null;
  for (const e of G.enemies) {
    if (e.row === r && !e.dead && e.x > kx - 10 && e.x < W - 10 && (!best || e.x < best.x)) best = e;
  }
  return best;
}

function updateKids(dt) {
  const g = G;
  for (let r = 0; r < B.rows; r++) for (let c = 0; c < B.cols; c++) {
    const k = g.grid[r][c];
    if (!k) continue;
    const K = KIDS[k.type], kx = cellX(c), ky = rowY(r);
    k.act = Math.max(0, k.act - dt * 2.5);
    k.hurt = Math.max(0, k.hurt - dt);
    switch (k.type) {
      case 'snack':
        k.t -= dt;
        if (k.t <= 0) { k.t = K.makeEvery; k.act = 1; dropCookie(kx + 10, ky - 70, ky - 12, false); }
        break;
      case 'natti':
      case 'mio':
        k.t -= dt;
        if (k.t <= 0 && enemyAhead(r, kx)) {
          k.t = K.shootEvery; k.act = 1;
          const star = k.type === 'mio';
          g.shots.push({ kind: star ? 'star' : 'pencil', row: r, x: kx + 20, y: ky - 72,
                         vx: star ? 380 : 470, dmg: K.damage, pierce: star, hit: new Set(), rot: 0 });
          Sound.sfx(star ? 'star' : 'throw');
        }
        break;
      case 'bill': {
        k.t -= dt;
        const reach = K.range * B.cw + 30;
        if (k.t <= 0 && g.enemies.some(e => e.row === r && !e.dead && e.x > kx - 30 && e.x - kx < reach)) {
          k.t = K.screamEvery; k.act = 1;
          scream(k, kx, ky, reach, K.damage);
        }
        break;
      }
      case 'splash':
        k.t -= dt;
        if (k.t <= 0) {
          const e = firstAhead(r, kx);
          if (e) {
            k.t = K.shootEvery; k.act = 1;
            const dur = 0.8;
            const tx = Math.max(kx + 40, e.eating ? e.x : e.x - e.speed * dur);
            g.lobs.push({ kind: 'balloon', row: r, x0: kx + 12, y0: ky - 80, x1: tx, y1: ky - 30, t: 0, dur, dmg: K.damage, slow: K.slowFor });
            Sound.sfx('throw');
          }
        }
        break;
      case 'eraser':
        k.fuse -= dt;
        if (k.fuse <= 0) { g.grid[r][c] = null; eraseBoom(r, c, K.damage); }
        break;
    }
  }
}

function scream(k, kx, ky, reach, dmg) {
  for (const e of G.enemies) {
    if (e.row !== k.r || e.dead || e.x <= kx - 30 || e.x - kx >= reach) continue;
    hurt(e, dmg);
    if (e.type !== 'boss') { e.x += e.type === 'book' ? 10 : 26; e.eating = null; }  // blown backwards!
  }
  G.fx.push({ kind: 'wave', x: kx + 12, y: ky - 70, life: 0.5, max: 0.5, reach });
  floatText(kx + 30, ky - 110, pick(['AAAAH!', 'AAAAAAH!', 'EEEEEK!', 'NOOOO!']), '#ffec5c', 24);
  Sound.sfx('scream');
}

function eraseBoom(r, c, dmg) {
  const x = cellX(c), y = rowY(r) - 30;
  for (const e of G.enemies) {
    if (!e.dead && Math.abs(e.row - r) <= 1 && Math.abs(e.x - x) < B.cw * 1.5) hurt(e, dmg);
  }
  G.shake = 10;
  G.fx.push({ kind: 'ring', x, y, life: 0.5, max: 0.5, r0: 20, r1: 170, color: '#ff9bba' });
  burst(G.fx, x, y, 30, ['#ff9bba', '#e46e93', '#fff', '#2e6fd8'], { speed: 320, g: 300 });
  floatText(x, y - 60, 'ERASED!', '#ff9bba', 40);
  Sound.sfx('boom');
}

// ---------------- the homework walks and bites ----------------
function kidAt(e) {
  const front = e.x - HOMEWORK[e.type].size;
  let found = null;
  for (let c = 0; c < B.cols; c++) {
    const k = G.grid[e.row][c];
    if (!k) continue;
    const kx = cellX(c);
    if (front <= kx + 26 && e.x > kx - 20) found = k;
  }
  return found;
}

function updateEnemies(dt) {
  const g = G;
  for (const e of g.enemies) {
    if (e.dead) continue;
    const HW = HOMEWORK[e.type];
    e.flash = Math.max(0, e.flash - dt);
    e.slow = Math.max(0, e.slow - dt);
    const slowF = e.slow > 0 ? 0.5 : 1;
    if (e.type === 'boss') updateBoss(e, dt);
    // "Due Tomorrow" jumping over a kid
    if (e.jump > 0) {
      e.jump -= dt;
      e.x -= e.jumpV * dt;
      if (e.jump <= 0) { e.jump = 0; e.speed = HW.slowSpeed; }
      continue;
    }
    const target = HW.flies ? null : kidAt(e);
    if (target) {
      if (e.type === 'due' && !e.jumped) {
        e.jumped = true; e.jump = 0.6;
        e.jumpV = (e.x - (cellX(target.c) - 55)) / 0.6;
        floatText(e.x, e.y - 90, 'HURRY!', '#ff5a5a', 20);
        Sound.sfx('boing');
        continue;
      }
      e.eating = target;
      target.hp -= HW.bite * dt;
      target.hurt = 0.15;
      e.biteT -= dt;
      if (e.biteT <= 0) { e.biteT = 0.45; Sound.sfx('chomp'); }
      if (target.hp <= 0) kidGone(target);
    } else {
      e.eating = null;
      e.x -= e.speed * slowF * dt;
      e.walk += e.speed * slowF * dt * 0.28;
    }
    // reached the robot vacuum or the door?
    const v = g.vac[e.row];
    if (v && v.state === 'ready' && e.x < VAC_X + 45) {
      v.state = 'go';
      floatText(VAC_X, rowY(e.row) - 50, 'VROOOM!', '#fff', 24);
      Sound.sfx('vacuum');
    }
    if (e.x < DOOR.x + DOOR.w - 8) { lose(); return; }
  }
  g.enemies = g.enemies.filter(e => !e.dead);
}

function updateBoss(e, dt) {
  e.blast = Math.max(0, e.blast - dt);
  e.erupt -= dt;
  if (e.erupt > 0) return;
  e.erupt = e.hp < e.max / 2 ? 6 : 9;
  e.blast = 0.8;
  G.shake = 8;
  Sound.sfx('roar');
  burst(G.fx, e.x, e.y - 175, 26, ['#ff7a1a', '#ffb02a', '#ff3a1a', '#555'], { speed: 260, g: 500, min: 6, max: 14, kind: 'dot' });
  // throw lava at 2 kids
  const kids = allKids();
  for (let i = 0; i < 2 && kids.length; i++) {
    const k = kids.splice(Math.floor(Math.random() * kids.length), 1)[0];
    G.lobs.push({ kind: 'lava', r: k.r, c: k.c, x0: e.x, y0: e.y - 175, x1: cellX(k.c), y1: rowY(k.r) - 30, t: 0, dur: 1.1, dmg: 150 });
  }
  // more homework pops out of the volcano!
  for (let i = 0; i < 2; i++) spawn(pick(['sheet', 'math', 'due']), pick(G.lanes), Math.min(W + 20, e.x + 50));
}

function allKids() {
  const list = [];
  for (const row of G.grid) for (const k of row) if (k && k.type !== 'eraser') list.push(k);
  return list;
}

function kidGone(k) {
  G.grid[k.r][k.c] = null;
  const x = cellX(k.c), y = rowY(k.r);
  burst(G.fx, x, y - 50, 12, ['#fff', '#eee', '#ddd'], { kind: 'dot', speed: 90, g: -40, min: 8, max: 16 });
  const say = k.type === 'gamer' ? 'GAME OVER!' : pick(['Nooo!', 'I give up!', 'Too much homework!', 'So boring...']);
  floatText(x, y - 110, say, '#fff', 20);
  Sound.sfx('poof');
}

function hurt(e, dmg) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 0.12;
  if (e.hp <= 0) kill(e);
  else Sound.sfx('hit');
}

function kill(e) {
  e.dead = true;
  const y = e.y - (e.type === 'plane' ? 70 : 40);
  if (e.type === 'boss') {
    G.shake = 16;
    burst(G.fx, e.x, e.y - 100, 60, ['#8a5a34', '#ff7a1a', '#ffb02a', '#fff'], { speed: 420, g: 400, min: 6, max: 16 });
    floatText(e.x, e.y - 200, 'KABOOM!', '#ffb02a', 56);
    Sound.sfx('boom');
  } else {
    const colors = e.type === 'book' ? [BOOK_COLORS[e.label] || '#c8372d', '#f4efdc', '#fff'] : ['#fff', '#f4f4ec', '#a9c9ee'];
    burst(G.fx, e.x, y, e.type === 'mini' ? 7 : 12, colors, { speed: 180 });
  }
  Sound.sfx('crumple');
  const HW = HOMEWORK[e.type];
  if (HW.splitsInto) {
    spawn(HW.splitsInto, e.row, e.x - 14);
    spawn(HW.splitsInto, e.row, e.x + 18);
    floatText(e.x, y - 40, 'SPLIT!', '#b27aff', 20);
  }
  G.lastDeath = { x: e.x, y: e.y - 40 };
}

// ---------------- pencils, stars, balloons, lava ----------------
function updateShots(dt) {
  const g = G;
  for (let i = g.shots.length - 1; i >= 0; i--) {
    const s = g.shots[i];
    s.x += s.vx * dt;
    s.rot += dt * (s.kind === 'pencil' ? 16 : 8);
    if (s.kind === 'star' && Math.random() < 0.5) g.fx.push({ kind: 'star', x: s.x - 8, y: s.y + rand(-4, 4), vx: -30, vy: rand(-10, 10), life: 0.35, max: 0.35, size: 4, color: '#fff3a0', rot: 0 });
    let gone = s.x > W + 40;
    for (const e of g.enemies) {
      if (gone) break;
      if (e.row !== s.row || e.dead || s.hit.has(e)) continue;
      if (Math.abs(e.x - s.x) < HOMEWORK[e.type].size + 6) {
        hurt(e, s.dmg);
        burst(g.fx, s.x, s.y, 4, s.kind === 'star' ? ['#ffd93b', '#fff'] : ['#ffcf33', '#fff'], { speed: 100, min: 3, max: 6 });
        if (s.pierce) s.hit.add(e); else gone = true;
      }
    }
    if (gone) g.shots.splice(i, 1);
  }
}

function updateLobs(dt) {
  const g = G;
  for (let i = g.lobs.length - 1; i >= 0; i--) {
    const l = g.lobs[i];
    l.t += dt;
    if (l.t < l.dur) continue;
    g.lobs.splice(i, 1);
    if (l.kind === 'balloon') {
      for (const e of g.enemies) {
        if (e.row === l.row && !e.dead && Math.abs(e.x - l.x1) < 60) { hurt(e, l.dmg); e.slow = l.slow; }
      }
      burst(g.fx, l.x1, l.y1, 16, ['#3b8cff', '#8ec5ff', '#fff'], { kind: 'dot', speed: 200, min: 3, max: 7 });
      Sound.sfx('splash');
    } else {
      const k = g.grid[l.r][l.c];
      if (k) { k.hp -= l.dmg; k.hurt = 0.4; if (k.hp <= 0) kidGone(k); }
      burst(g.fx, l.x1, l.y1, 16, ['#ff7a1a', '#ffb02a', '#ff3a1a'], { kind: 'dot', speed: 180, min: 4, max: 9 });
      Sound.sfx('lava');
    }
  }
}

// ---------------- cookies (snacks) ----------------
function dropCookie(x, y, ty, sky) {
  G.cookies.push({ x, y, ty, sky, vy: sky ? 55 : -190, vx: sky ? 0 : rand(-45, 45), landed: false, life: 10, grab: 0, sx: 0, sy: 0 });
}
function updateCookies(dt) {
  const g = G;
  for (let i = g.cookies.length - 1; i >= 0; i--) {
    const c = g.cookies[i];
    if (c.grab > 0) {
      c.grab += dt * 2.6;
      const k = Math.min(1, c.grab), e = 1 - (1 - k) * (1 - k);
      c.x = c.sx + (62 - c.sx) * e; c.y = c.sy + (44 - c.sy) * e;
      if (c.grab >= 1) g.cookies.splice(i, 1);
      continue;
    }
    if (!c.landed) {
      if (c.sky) { c.y += c.vy * dt; if (c.y >= c.ty) { c.y = c.ty; c.landed = true; } }
      else {
        c.vy += 520 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
        if (c.vy > 0 && c.y >= c.ty) { c.y = c.ty; c.landed = true; }
      }
    } else {
      c.life -= dt;
      if (c.life <= 0) g.cookies.splice(i, 1);
    }
  }
}
function tryGrabCookie(x, y) {
  for (let i = G.cookies.length - 1; i >= 0; i--) {
    const c = G.cookies[i];
    if (c.grab > 0) continue;
    if ((c.x - x) ** 2 + (c.y - y) ** 2 < 38 * 38) {
      c.grab = 0.001; c.sx = c.x; c.sy = c.y;
      G.snacks += 25; G.collected++;
      floatText(c.x, c.y - 30, '+25', '#fff', 22);
      Sound.sfx('pop');
      return true;
    }
  }
  return false;
}

// ---------------- robot vacuums ----------------
function updateVacuums(dt) {
  const g = G;
  g.vac.forEach((v, r) => {
    if (!v || v.state !== 'go') return;
    v.x += 520 * dt;
    for (const e of g.enemies) {
      if (e.row !== r || e.dead || Math.abs(e.x - v.x) > 40) continue;
      if (e.type === 'boss') {
        if (!e.vacHit) {
          e.vacHit = true; hurt(e, 1500); v.state = 'broken';
          burst(g.fx, v.x, rowY(r) - 20, 16, ['#e9edf2', '#4d5560', '#fff'], { speed: 220 });
          floatText(v.x, rowY(r) - 80, 'CRUNCH!', '#fff', 28);
          Sound.sfx('boom');
        }
      } else kill(e);
    }
    if (v.x > W + 60) v.state = 'used';
  });
}

// ---------------- effects ----------------
function burst(list, x, y, n, colors, o) {
  o = o || {};
  for (let i = 0; i < n; i++) {
    const life = rand(0.5, 0.9) * (o.life || 1), sp = o.speed || 150;
    list.push({
      kind: o.kind || 'bit', x, y, vx: rand(-1, 1) * sp, vy: rand(-1.2, 0.2) * sp,
      g: o.g != null ? o.g : 400, life, max: life, color: pick(colors),
      size: rand(o.min || 5, o.max || 10), rot: rand(0, 6), vr: rand(-10, 10),
    });
  }
}
function floatText(x, y, str, color, size) {
  G.fx.push({ kind: 'text', x, y, vx: 0, vy: -40, g: 0, life: 1.3, max: 1.3, text: str, color, size: size || 24 });
}
function updateFx(dt, list) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) { list.splice(i, 1); continue; }
    p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt;
    if (p.g) p.vy += p.g * dt;
    if (p.vr) p.rot += p.vr * dt;
  }
}
function drawFx(list) {
  for (const p of list) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.save();
    ctx.globalAlpha = p.kind === 'text' ? Math.min(1, a * 2) : a;
    switch (p.kind) {
      case 'bit':
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size * 0.35, p.size, p.size * 0.7);
        break;
      case 'dot':
        ctx.fillStyle = p.color; circ(ctx, p.x, p.y, p.size * (0.5 + a * 0.5)); ctx.fill();
        break;
      case 'star':
        drawStar(ctx, p.x, p.y, p.size, p.rot, p.color, p.color);
        break;
      case 'text':
        text(ctx, p.text, p.x, p.y, p.size, p.color);
        break;
      case 'wave': {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const rad = 20 + (1 - a) * p.reach * (0.5 + i * 0.25);
          ctx.beginPath(); ctx.arc(p.x, p.y, rad, -0.5, 0.5); ctx.stroke();
        }
        break;
      }
      case 'ring':
        ctx.strokeStyle = p.color; ctx.lineWidth = 10 * a + 2;
        circ(ctx, p.x, p.y, p.r0 + (p.r1 - p.r0) * (1 - a)); ctx.stroke();
        break;
    }
    ctx.restore();
  }
}

// ---------------- winning and losing ----------------
function checkWin() {
  const g = G;
  if (g.done || g.trophy) return;
  if (g.waveIdx >= g.waves.length && g.queue.length === 0 && g.enemies.length === 0) {
    const p = g.lastDeath || { x: 700, y: 400 };
    g.trophy = { x: clamp(p.x, B.x + 60, W - 90), y: clamp(p.y, 220, 620) };
    g.sel = null; g.removing = false;
    Sound.sfx('unlock');
  }
}

function winDay() {
  const i = G.day;
  G.done = true;
  const first = !save.beaten.includes(i);
  if (first) save.beaten.push(i);
  save.day = Math.max(save.day, Math.min(i + 1, LEVELS.length - 1));
  writeSave();
  result = { day: i, unlock: first ? LEVELS[i].unlock : [], final: i === LEVELS.length - 1 };
  menuFx = [];
  if (result.final) {
    screen = 'final';
    Sound.say('You beat the science project! No more homework!', 1.2);
  } else {
    screen = 'won';
    Sound.say(LEVELS[i].day.toLowerCase() + ' is done!', 1.2);
  }
  Sound.sfx('win');
}

function lose() {
  G.done = true;
  result = { day: G.day };
  screen = 'lost';
  Sound.sfx('lose');
  Sound.say('Do your homework!', 0.8, 0.9);
}

// =====================================================================
//  CLICKING
// =====================================================================
function selectCard(i) {
  const g = G, card = g.cards[i];
  if (!card) return;
  if (g.sel === i) { g.sel = null; return; }
  const K = KIDS[card.type];
  if (card.cool > 0 || g.snacks < K.cost) {
    card.bad = 0.4;
    Sound.sfx('nope');
    if (g.snacks < K.cost) floatText(118 + i * 86 + 40, 130, 'Need more snacks!', '#ffec5c', 18);
    return;
  }
  g.sel = i; g.removing = false;
  Sound.sfx('click');
}

function gameClick(x, y) {
  const g = G;
  if (g.trophy) {
    if ((x - g.trophy.x) ** 2 + (y - g.trophy.y) ** 2 < 70 * 70) winDay();
    return;
  }
  if (tryGrabCookie(x, y)) return;
  const c = Math.floor((x - B.x) / B.cw), r = Math.floor((y - B.y) / B.rh);
  if (c < 0 || c >= B.cols || r < 0 || r >= B.rows) { g.sel = null; g.removing = false; return; }
  if (g.removing) {
    const k = g.grid[r][c];
    if (k) {
      g.grid[r][c] = null;
      burst(g.fx, cellX(c), rowY(r) - 50, 10, ['#fff', '#eee'], { kind: 'dot', speed: 80, g: -40, min: 8, max: 14 });
      floatText(cellX(c), rowY(r) - 110, 'Bye!', '#fff', 20);
      Sound.sfx('poof');
    }
    g.removing = false;
    return;
  }
  if (g.sel == null) return;
  const card = g.cards[g.sel], K = KIDS[card.type];
  if (!g.lanes.includes(r)) { floatText(x, y - 20, 'Too many toys here!', '#fff', 18); Sound.sfx('nope'); return; }
  if (g.grid[r][c]) { Sound.sfx('nope'); return; }
  if (g.snacks < K.cost || card.cool > 0) { g.sel = null; Sound.sfx('nope'); return; }
  g.grid[r][c] = {
    type: card.type, r, c, hp: K.hp, max: K.hp, act: 0, hurt: 0, phase: rand(0, 6),
    t: card.type === 'snack' ? 6 : 0.4, fuse: card.type === 'eraser' ? 1 : null,
  };
  g.snacks -= K.cost;
  card.cool = K.reload;
  g.sel = null;
  g.placed++;
  if (card.type === 'snack') g.snackKids++;
  burst(g.fx, cellX(c), rowY(r), 8, ['#e8d6b0', '#fff'], { kind: 'dot', speed: 80, g: 0, min: 4, max: 8 });
  Sound.sfx('place');
}

function click(x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.fn(); return; }
  }
  if (screen === 'play' && G && !G.paused && !G.done) gameClick(x, y);
}

function toGame(e) {
  return { x: (e.clientX - view.ox) / view.s, y: (e.clientY - view.oy) / view.s };
}
canvas.addEventListener('pointerdown', e => {
  Sound.init();
  const p = toGame(e);
  mouse.x = p.x; mouse.y = p.y;
  if (e.button === 2) { if (G) { G.sel = null; G.removing = false; } return; }
  click(p.x, p.y);
});
window.addEventListener('pointermove', e => { const p = toGame(e); mouse.x = p.x; mouse.y = p.y; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  Sound.init();
  if (e.key === 'm' || e.key === 'M') { Sound.toggleMute(); return; }
  if (screen !== 'play' || !G || G.done) return;
  if (e.key === 'Escape') {
    if (G.sel != null || G.removing) { G.sel = null; G.removing = false; } else G.paused = !G.paused;
  } else if (e.key === 'p' || e.key === 'P' || e.key === ' ') {
    G.paused = !G.paused; e.preventDefault();
  } else if (/^[1-9]$/.test(e.key)) {
    selectCard(+e.key - 1);
  } else if (e.key === '0' || e.key === 'r' || e.key === 'R') {
    G.removing = !G.removing; G.sel = null;
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G && screen === 'play' && !G.done) G.paused = true;
});

// =====================================================================
//  DRAWING
// =====================================================================
let bgCache = null, bgKey = '';
function drawBackground(lanes) {
  const key = lanes.join(',') + '|' + view.px;
  if (key !== bgKey) {
    bgKey = key;
    bgCache = document.createElement('canvas');
    bgCache.width = Math.max(1, Math.round(W * view.px));
    bgCache.height = Math.max(1, Math.round(H * view.px));
    const c = bgCache.getContext('2d');
    c.setTransform(view.px, 0, 0, view.px, 0, 0);
    drawRoom(c, B, lanes, W, H);
  }
  ctx.drawImage(bgCache, 0, 0, W, H);
}

function hover(x, y, w, h) { return mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h; }

function button(label, x, y, w, h, fn, color, size) {
  const on = hover(x, y, w, h);
  const lift = on ? -3 : 0;
  ctx.fillStyle = 'rgba(40,20,60,0.5)'; rr(ctx, x, y + 6, w, h, 18); ctx.fill();
  ctx.fillStyle = color || '#ff8c2b'; rr(ctx, x, y + lift, w, h, 18); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 3; rr(ctx, x + 4, y + 4 + lift, w - 8, h - 8, 14); ctx.stroke();
  text(ctx, label, x + w / 2, y + h / 2 + lift + 2, size || h * 0.42, '#fff');
  buttons.push({ x, y, w, h, fn: () => { Sound.sfx('click'); fn(); } });
}

function roundButton(x, y, r, icon, fn, on) {
  const hv = (mouse.x - x) ** 2 + (mouse.y - y) ** 2 < r * r;
  ctx.fillStyle = on ? '#ffcc33' : hv ? '#fff3d6' : '#f7ecd2';
  circ(ctx, x, y, r); ctx.fill();
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = '#5a2d0c'; ctx.strokeStyle = '#5a2d0c';
  icon(x, y);
  buttons.push({ x: x - r, y: y - r, w: r * 2, h: r * 2, fn });
}

function drawCard(card, i) {
  const g = G, K = KIDS[card.type];
  const x = 118 + i * 86, y = 12, w = 80, h = 96;
  const sel = g.sel === i;
  const ok = g.snacks >= K.cost && card.cool <= 0;
  ctx.save();
  if (card.bad > 0) ctx.translate(Math.sin(card.bad * 60) * 4, 0);
  if (sel) ctx.translate(0, -4);
  ctx.fillStyle = sel ? '#fff3a0' : '#f7ecd2'; rr(ctx, x, y, w, h, 10); ctx.fill();
  ctx.save();
  rr(ctx, x + 5, y + 5, w - 10, h - 32, 7); ctx.clip();
  ctx.fillStyle = '#bfe3f7'; ctx.fillRect(x, y, w, h);
  drawKid(ctx, card.type, x + w / 2, y + 88, 0.62, T, { phase: i * 1.7 });
  ctx.restore();
  drawCookie(ctx, x + 20, y + h - 14, 8);
  text(ctx, String(K.cost), x + 50, y + h - 13, 17, '#5a2d0c', { stroke: false });
  text(ctx, String(i + 1), x + 12, y + 14, 12, '#fff', { lw: 3 });
  if (!ok) {
    ctx.fillStyle = 'rgba(30,20,40,0.45)'; rr(ctx, x, y, w, h, 10); ctx.fill();
    if (card.cool > 0) {
      const k = card.cool / K.reload;
      ctx.save(); rr(ctx, x, y, w, h, 10); ctx.clip();
      ctx.fillStyle = 'rgba(30,20,40,0.45)'; ctx.fillRect(x, y, w, h * k);
      ctx.restore();
    }
  }
  ctx.lineWidth = sel ? 5 : 3; ctx.strokeStyle = sel ? '#ffb000' : '#8a5a2b';
  rr(ctx, x, y, w, h, 10); ctx.stroke();
  ctx.restore();
  buttons.push({ x, y, w, h, fn: () => selectCard(i) });
}

function drawHUD() {
  const g = G;
  const n = g.cards.length;
  const barW = 118 + n * 86 + 92;
  ctx.fillStyle = 'rgba(92,52,24,0.94)'; rr(ctx, 6, 4, barW, 108, 16); ctx.fill();
  ctx.strokeStyle = '#3a1f0c'; ctx.lineWidth = 4; ctx.stroke();
  // snack counter
  ctx.fillStyle = '#fff3d6'; rr(ctx, 14, 12, 96, 92, 12); ctx.fill();
  drawCookie(ctx, 62, 44, 24);
  text(ctx, String(g.snacks), 62, 86, 24, '#5a2d0c', { stroke: false });
  g.cards.forEach((card, i) => drawCard(card, i));
  // "send home" button (removes a kid)
  const rx = 118 + n * 86 + 4, ry = 12;
  ctx.fillStyle = g.removing ? '#ffcc33' : hover(rx, ry, 80, 96) ? '#fff3d6' : '#f7ecd2';
  rr(ctx, rx, ry, 80, 96, 10); ctx.fill();
  ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.stroke();
  ctx.strokeStyle = '#d03030'; ctx.lineWidth = 7; ctx.lineCap = 'round';
  line(ctx, rx + 24, ry + 22, rx + 56, ry + 54); line(ctx, rx + 56, ry + 22, rx + 24, ry + 54);
  text(ctx, 'SEND', rx + 40, ry + 70, 13, '#5a2d0c', { stroke: false });
  text(ctx, 'HOME', rx + 40, ry + 85, 13, '#5a2d0c', { stroke: false });
  buttons.push({ x: rx, y: ry, w: 80, h: 96, fn: () => { g.removing = !g.removing; g.sel = null; Sound.sfx('click'); } });

  // day name and homework progress
  const px = Math.max(barW + 24, 830), pw = 1085 - px;
  text(ctx, g.L.day, px + pw / 2, 30, 24, '#fff');
  ctx.fillStyle = 'rgba(40,20,10,0.7)'; rr(ctx, px, 52, pw, 22, 11); ctx.fill();
  ctx.fillStyle = '#7ddc4a'; rr(ctx, px + 3, 55, Math.max(0, (pw - 6) * g.bar), 16, 8); ctx.fill();
  g.waves.forEach((w, i) => {
    if (!w.big) return;
    const fx = px + pw * ((i + 1) / g.waves.length) - 6;
    ctx.fillStyle = '#fff'; ctx.fillRect(fx, 44, 2, 30);
    ctx.fillStyle = w.boss ? '#ff7a1a' : '#e03030';
    ctx.beginPath(); ctx.moveTo(fx + 2, 44); ctx.lineTo(fx + 16, 49); ctx.lineTo(fx + 2, 54); ctx.fill();
  });
  text(ctx, 'HOMEWORK', px + pw / 2, 90, 13, '#fff', { lw: 3 });

  // pause, speed, sound
  roundButton(1128, 52, 24, (x, y) => {
    if (g.paused) { ctx.beginPath(); ctx.moveTo(x - 6, y - 10); ctx.lineTo(x + 10, y); ctx.lineTo(x - 6, y + 10); ctx.fill(); }
    else { ctx.fillRect(x - 8, y - 10, 6, 20); ctx.fillRect(x + 2, y - 10, 6, 20); }
  }, () => { g.paused = !g.paused; Sound.sfx('click'); }, g.paused);
  roundButton(1185, 52, 24, (x, y) => {
    for (const dx of [-9, 1]) { ctx.beginPath(); ctx.moveTo(x + dx, y - 9); ctx.lineTo(x + dx + 10, y); ctx.lineTo(x + dx, y + 9); ctx.fill(); }
  }, () => { g.speed = g.speed === 1 ? 2 : 1; Sound.sfx('click'); }, g.speed === 2);
  roundButton(1242, 52, 24, (x, y) => {
    ctx.fillRect(x - 11, y - 5, 7, 10);
    ctx.beginPath(); ctx.moveTo(x - 4, y - 5); ctx.lineTo(x + 4, y - 11); ctx.lineTo(x + 4, y + 11); ctx.lineTo(x - 4, y + 5); ctx.fill();
    ctx.lineWidth = 3; ctx.lineCap = 'round';
    if (Sound.muted) { ctx.strokeStyle = '#d03030'; line(ctx, x - 13, y - 13, x + 13, y + 13); }
    else { ctx.beginPath(); ctx.arc(x + 5, y, 8, -0.8, 0.8); ctx.stroke(); }
  }, () => { Sound.toggleMute(); }, false);
  text(ctx, g.speed === 2 ? 'FAST!' : '', 1185, 92, 12, '#ffcc33', { lw: 3 });

  // tooltip when you point at a card
  g.cards.forEach((card, i) => {
    const x = 118 + i * 86;
    if (!hover(x, 12, 80, 96) || g.sel != null) return;
    const K = KIDS[card.type];
    const tx = clamp(x - 60, 10, W - 330);
    ctx.fillStyle = 'rgba(255,250,235,0.97)'; rr(ctx, tx, 120, 320, 78, 12); ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, K.name, tx + 12, 138, 18, '#5a2d0c', { stroke: false, align: 'left' });
    wrapText(ctx, K.info, tx + 160, 164, 296, 14, '#5a2d0c', { stroke: false, weight: 'normal' });
  });
}

function hintText() {
  const g = G;
  if (g.day !== 0 || g.done || g.trophy) return null;
  const natti = g.cards.findIndex(c => c.type === 'natti');
  if (g.placed === 0) {
    return g.sel === natti ? 'Now click on the blue rug to put Natti there!' : 'Click NATTI\'s card at the top to pick him!';
  }
  if (g.collected === 0 && g.cookies.some(c => c.grab === 0)) return 'Click the cookies to collect snacks!';
  if (g.snackKids < 2 && g.time < 70) return 'Snack Kids make extra cookies. Put a few near the door!';
  return null;
}

function drawGame() {
  const g = G;
  ctx.save();
  if (g.shake) ctx.translate(rand(-g.shake, g.shake), rand(-g.shake, g.shake));
  drawBackground(g.lanes);
  drawDoor(ctx, DOOR, screen === 'lost' ? 1 : 0);
  g.vac.forEach((v, r) => { if (v && (v.state === 'ready' || v.state === 'go')) drawVacuum(ctx, v.x, rowY(r) + 4, T, v.state === 'go'); });

  // where your kid will go
  const hc = Math.floor((mouse.x - B.x) / B.cw), hr = Math.floor((mouse.y - B.y) / B.rh);
  const onBoard = hc >= 0 && hc < B.cols && hr >= 0 && hr < B.rows && !g.done && !g.paused;
  if (onBoard && g.sel != null && g.lanes.includes(hr) && !g.grid[hr][hc]) {
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(B.x + hc * B.cw, B.y + hr * B.rh, B.cw, B.rh);
    drawKid(ctx, g.cards[g.sel].type, cellX(hc), rowY(hr), 0.92, T, { alpha: 0.5 });
  }
  if (onBoard && g.removing && g.grid[hr][hc]) {
    ctx.fillStyle = 'rgba(255,60,60,0.3)'; ctx.fillRect(B.x + hc * B.cw, B.y + hr * B.rh, B.cw, B.rh);
  }

  for (let r = 0; r < B.rows; r++) {
    for (let c = 0; c < B.cols; c++) {
      const k = g.grid[r][c];
      if (!k) continue;
      drawKid(ctx, k.type, cellX(c), rowY(r), 0.92, T, { phase: k.phase, act: k.act, shake: k.hurt > 0, fuse: k.fuse });
      if (k.hp < k.max && k.type !== 'eraser') {
        const bx = cellX(c) - 25, by = rowY(r) - 108;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; rr(ctx, bx, by, 50, 7, 3); ctx.fill();
        ctx.fillStyle = k.hp / k.max > 0.4 ? '#6ee04a' : '#ff5a3a'; rr(ctx, bx + 1, by + 1, 48 * Math.max(0, k.hp / k.max), 5, 2); ctx.fill();
      }
    }
    for (const e of g.enemies) if (e.row === r && e.type !== 'plane') drawHomework(ctx, e, T);
    for (const s of g.shots) {
      if (s.row !== r) continue;
      if (s.kind === 'pencil') drawPencil(ctx, s.x, s.y, s.rot, 1.2);
      else {
        ctx.fillStyle = 'rgba(255,240,120,0.4)'; circ(ctx, s.x, s.y, 14); ctx.fill();
        drawStar(ctx, s.x, s.y, 10, s.rot);
      }
    }
  }
  for (const e of g.enemies) if (e.type === 'plane') drawHomework(ctx, e, T);
  for (const l of g.lobs) {
    const k = l.t / l.dur;
    const x = l.x0 + (l.x1 - l.x0) * k, y = l.y0 + (l.y1 - l.y0) * k - Math.sin(k * Math.PI) * 120;
    if (l.kind === 'balloon') drawBalloon(ctx, x, y, 10);
    else { ctx.fillStyle = '#ff7a1a'; circ(ctx, x, y, 11); ctx.fill(); ctx.fillStyle = '#ffd24a'; circ(ctx, x - 3, y - 3, 5); ctx.fill(); }
  }
  drawFx(g.fx);
  for (const c of g.cookies) {
    const blink = c.landed && c.life < 2.5 && Math.floor(c.life * 8) % 2 === 0;
    if (blink) continue;
    const pulse = c.grab > 0 ? 1 - c.grab * 0.4 : 1 + Math.sin(T * 5 + c.x) * 0.06;
    ctx.fillStyle = 'rgba(255,240,180,0.45)'; circ(ctx, c.x, c.y, 30 * pulse); ctx.fill();
    drawCookie(ctx, c.x, c.y, 22 * pulse);
  }
  if (g.trophy) drawTrophy(ctx, g.trophy.x, g.trophy.y, T);
  ctx.restore();

  drawHUD();

  if (g.trophy && !g.done) {
    text(ctx, 'You did it! Click the A+ !', W / 2, 680, 30, '#ffec5c');
  }
  const hint = hintText();
  if (hint && !g.paused) {
    ctx.font = FONT(22);
    const tw = ctx.measureText(hint).width + 40;
    ctx.fillStyle = 'rgba(255,250,235,0.95)'; rr(ctx, W / 2 - tw / 2, 650, tw, 48, 16); ctx.fill();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 3; ctx.stroke();
    text(ctx, hint, W / 2, 675, 22, '#5a2d0c', { stroke: false });
  }
  if (g.banner) {
    const b = g.banner, a = Math.min(1, b.t * 2, (3.5 - b.t) * 4);
    ctx.save(); ctx.globalAlpha = clamp(a, 0, 1);
    ctx.translate(W / 2, 360); ctx.rotate(Math.sin(T * 3) * 0.02);
    const sc = 1 + Math.max(0, 0.3 - (3.5 - b.t)) * 2;
    ctx.scale(sc, sc);
    text(ctx, b.text, 0, -20, 62, b.red ? '#ff4a3a' : '#ffd93b', { lw: 10 });
    text(ctx, b.sub, 0, 40, 30, '#fff', { lw: 7 });
    ctx.restore();
  }
  if (g.removing && !g.paused) text(ctx, 'Click a kid to send them home (right click to cancel)', W / 2, 700, 18, '#fff');
  if (g.paused && !g.done) {
    ctx.fillStyle = 'rgba(20,10,40,0.6)'; ctx.fillRect(0, 0, W, H);
    buttons = [];
    text(ctx, 'PAUSED', W / 2, 240, 80, '#ffd93b', { lw: 12 });
    button('KEEP PLAYING', W / 2 - 160, 320, 320, 70, () => { g.paused = false; }, '#4ab84a');
    button('START OVER', W / 2 - 160, 410, 320, 64, () => startDay(g.day), '#ff8c2b');
    button('MENU', W / 2 - 160, 494, 320, 64, () => { screen = 'days'; }, '#8a5ac8');
  }
}

// ---------------- menu screens ----------------
function fakeHomework(type, x, y, t) {
  return { type, x, y, hp: 1, max: 1, walk: t * 5, flash: 0, slow: 0, eating: null, jump: 0, blast: 0,
           label: (LABELS[type] || [''])[0] };
}

function drawTitle() {
  drawBackground([0, 1, 2, 3, 4]);
  drawDoor(ctx, DOOR, 0);
  ctx.fillStyle = 'rgba(40,20,80,0.35)'; ctx.fillRect(0, 0, W, H);
  // a parade of homework at the bottom
  ['sheet', 'math', 'book', 'due', 'sheet', 'plane'].forEach((type, i) => {
    const x = W + 120 - ((T * 45 + i * 230) % (W + 300));
    drawHomework(ctx, fakeHomework(type, x, 700, T + i), T + i);
  });
  ctx.save();
  ctx.translate(W / 2, 100); ctx.rotate(Math.sin(T * 1.5) * 0.02);
  const parts = [['KIDS', 90, '#ffd93b', 0], ['vs', 54, '#fff', 8], ['HOMEWORK', 90, '#ff5a4a', 0]];
  const widths = parts.map(([s, size]) => { ctx.font = FONT(size); return ctx.measureText(s).width; });
  const gap = 30, total = widths.reduce((a, b) => a + b) + gap * 2;
  let tx = -total / 2;
  parts.forEach(([s, size, color, dy], i) => {
    text(ctx, s, tx + widths[i] / 2, dy, size, color, { lw: size > 60 ? 14 : 10 });
    tx += widths[i] + gap;
  });
  ctx.restore();
  text(ctx, 'starring NATTI, MIO and BILL', W / 2, 170, 26, '#fff', { lw: 6 });
  [['natti', 400], ['mio', 640], ['bill', 880]].forEach(([k, x], i) => {
    const act = k === 'bill' ? Math.max(0, Math.sin(T * 2.2)) : k === 'natti' ? Math.max(0, Math.sin(T * 3 + 1)) : 0;
    drawKid(ctx, k, x, 450, 2.1, T, { phase: i * 2, act });
    text(ctx, KIDS[k].name.toUpperCase(), x, 488, 34, '#fff', { lw: 8 });
  });
  button('PLAY!', W / 2 - 130, 530, 260, 80, () => { screen = 'days'; }, '#4ab84a', 40);
}

function drawDays() {
  drawBackground([0, 1, 2, 3, 4]);
  ctx.fillStyle = 'rgba(40,20,80,0.55)'; ctx.fillRect(0, 0, W, H);
  text(ctx, 'PICK A DAY', W / 2, 70, 60, '#ffd93b', { lw: 10 });
  const preview = ['sheet', 'math', 'book', 'plane', 'boss'];
  LEVELS.forEach((L, i) => {
    const x = 72 + i * 232, y = 130, w = 210, h = 340;
    const locked = i > save.day, beaten = save.beaten.includes(i);
    const on = !locked && hover(x, y, w, h);
    ctx.save();
    if (on) ctx.translate(0, -5);
    ctx.fillStyle = locked ? '#8a8a9a' : '#fff7e6'; rr(ctx, x, y, w, h, 18); ctx.fill();
    ctx.strokeStyle = on ? '#ffb000' : '#8a5a2b'; ctx.lineWidth = on ? 6 : 4; ctx.stroke();
    text(ctx, L.day, x + w / 2, y + 36, 28, locked ? '#ddd' : '#ff8c2b');
    ctx.save(); rr(ctx, x + 12, y + 64, w - 24, 190, 12); ctx.clip();
    ctx.fillStyle = locked ? '#6a6a7a' : '#bfe3f7'; ctx.fillRect(x, y + 64, w, 190);
    const type = preview[i];
    ctx.save();
    ctx.translate(x + w / 2, y + 240);
    if (type === 'boss') ctx.scale(0.8, 0.8); else ctx.scale(1.6, 1.6);
    drawHomework(ctx, fakeHomework(type, 0, 0, T + i), T + i);
    ctx.restore();
    ctx.restore();
    const newHw = HOMEWORK[type].name;
    text(ctx, i === 4 ? 'FINAL BOSS!' : 'New: ' + newHw, x + w / 2, y + 280, 17, locked ? '#ddd' : '#5a2d0c', { stroke: false });
    if (locked) {
      ctx.fillStyle = 'rgba(30,20,50,0.55)'; rr(ctx, x, y, w, h, 18); ctx.fill();
      ctx.fillStyle = '#ffd24a'; rr(ctx, x + w / 2 - 26, y + 150, 52, 42, 8); ctx.fill();
      ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(x + w / 2, y + 150, 17, Math.PI, 0); ctx.stroke();
      text(ctx, 'LOCKED', x + w / 2, y + 316, 22, '#fff');
    } else {
      text(ctx, beaten ? 'DONE!' : 'PLAY', x + w / 2, y + 316, 24, beaten ? '#6ee04a' : '#ffd93b');
      buttons.push({ x, y, w, h, fn: () => startDay(i) });
    }
    ctx.restore();
  });
  // the kids you have
  const kids = kidsForDay(save.day);
  text(ctx, 'YOUR KIDS:', 150, 540, 24, '#fff');
  kids.forEach((k, i) => {
    drawKid(ctx, k, 270 + i * 110, 640, 0.95, T, { phase: i * 1.3 });
    text(ctx, KIDS[k].name, 270 + i * 110, 665, 16, '#fff', { lw: 4 });
  });
  button('BACK', 30, 650, 150, 56, () => { screen = 'title'; }, '#8a5ac8');
}

function confetti() {
  if (Math.random() < 0.5) {
    menuFx.push({ kind: 'bit', x: rand(0, W), y: -10, vx: rand(-30, 30), vy: rand(60, 140), g: 20,
                  life: 6, max: 6, color: pick(['#ffd93b', '#ff5a4a', '#4ab8ff', '#6ee04a', '#ff8ad8']), size: rand(8, 14), rot: rand(0, 6), vr: rand(-6, 6) });
  }
}

function drawWon() {
  drawGame();
  buttons = [];
  ctx.fillStyle = 'rgba(20,10,50,0.72)'; ctx.fillRect(0, 0, W, H);
  confetti(); drawFx(menuFx);
  text(ctx, 'YOU SURVIVED ' + LEVELS[result.day].day + '!', W / 2, 100, 58, '#6ee04a', { lw: 10 });
  const un = result.unlock;
  if (un.length) {
    text(ctx, un.length > 1 ? 'NEW KIDS!' : 'NEW KID!', W / 2, 175, 42, '#ffd93b', { lw: 8 });
    un.forEach((k, i) => {
      const x = W / 2 + (i - (un.length - 1) / 2) * 420;
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; circ(ctx, x, 330, 110); ctx.fill();
      drawKid(ctx, k, x, 420, 2.2, T, { phase: i, act: k === 'bill' || k === 'natti' ? Math.max(0, Math.sin(T * 2.5)) : 0 });
      text(ctx, KIDS[k].name, x, 460, 36, '#fff', { lw: 7 });
      wrapText(ctx, KIDS[k].info, x, 500, 380, 20, '#ffe9b0', { lw: 5 });
    });
  } else {
    text(ctx, 'Great job! The homework didn\'t get in.', W / 2, 300, 32, '#fff', { lw: 7 });
  }
  button('NEXT DAY', W / 2 - 290, 590, 280, 76, () => startDay(Math.min(result.day + 1, LEVELS.length - 1)), '#4ab84a', 34);
  button('MENU', W / 2 + 10, 590, 280, 76, () => { screen = 'days'; }, '#8a5ac8', 34);
}

function drawFinal() {
  drawBackground([0, 1, 2, 3, 4]);
  ctx.fillStyle = 'rgba(40,20,80,0.45)'; ctx.fillRect(0, 0, W, H);
  confetti(); confetti(); drawFx(menuFx);
  ctx.save(); ctx.translate(W / 2, 90); ctx.rotate(Math.sin(T * 2) * 0.03);
  text(ctx, 'YOU BEAT THE SCIENCE PROJECT!', 0, 0, 54, '#ffd93b', { lw: 10 });
  ctx.restore();
  text(ctx, 'NO MORE HOMEWORK!!!', W / 2, 160, 44, '#6ee04a', { lw: 9 });
  const kids = ['snack', 'natti', 'mio', 'bill', 'gamer', 'splash'];
  kids.forEach((k, i) => {
    const x = 170 + i * 188, jump = Math.abs(Math.sin(T * 5 + i)) * 30;
    drawKid(ctx, k, x, 480 - jump, 1.6, T, { phase: i, act: Math.max(0, Math.sin(T * 4 + i)) });
  });
  drawTrophy(ctx, W / 2, 250, T);
  text(ctx, '...until Monday.', W / 2, 540, 30, '#fff', { lw: 6 });
  button('PLAY AGAIN', W / 2 - 290, 600, 280, 76, () => { screen = 'days'; }, '#4ab84a', 34);
  button('MENU', W / 2 + 10, 600, 280, 76, () => { screen = 'title'; }, '#8a5ac8', 34);
}

function drawLost() {
  drawGame();
  buttons = [];
  ctx.fillStyle = 'rgba(80,0,10,0.6)'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 + Math.sin(T * 40) * 4, 220 + Math.cos(T * 33) * 3);
  const s = 1 + Math.sin(T * 6) * 0.04;
  ctx.scale(s, s);
  text(ctx, 'DO YOUR', 0, -50, 90, '#fff', { lw: 14 });
  text(ctx, 'HOMEWORK!!!', 0, 50, 100, '#ff4a3a', { lw: 16 });
  ctx.restore();
  text(ctx, 'The homework got into your room...', W / 2, 360, 30, '#ffd8d0', { lw: 6 });
  ['sheet', 'math', 'book'].forEach((type, i) => {
    drawHomework(ctx, fakeHomework(type, 330 + i * 310, 540, T + i), T + i);
  });
  button('TRY AGAIN', W / 2 - 290, 590, 280, 76, () => startDay(result.day), '#4ab84a', 34);
  button('MENU', W / 2 + 10, 590, 280, 76, () => { screen = 'days'; }, '#8a5ac8', 34);
}

function draw() {
  buttons = [];
  ctx.setTransform(view.px, 0, 0, view.px, 0, 0);
  ctx.clearRect(0, 0, W, H);
  switch (screen) {
    case 'title': drawTitle(); break;
    case 'days': drawDays(); break;
    case 'play': drawGame(); break;
    case 'won': drawWon(); break;
    case 'final': drawFinal(); break;
    case 'lost': drawLost(); break;
  }
}

// =====================================================================
//  SCREEN SIZE AND MAIN LOOP
// =====================================================================
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const s = Math.min(innerWidth / W, innerHeight / H);
  view.s = s;
  view.ox = (innerWidth - W * s) / 2;
  view.oy = (innerHeight - H * s) / 2;
  canvas.style.left = view.ox + 'px';
  canvas.style.top = view.oy + 'px';
  canvas.style.width = W * s + 'px';
  canvas.style.height = H * s + 'px';
  canvas.width = Math.max(1, Math.round(W * s * dpr));
  canvas.height = Math.max(1, Math.round(H * s * dpr));
  view.px = s * dpr;
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  T += dt;
  if (screen === 'play' && G && !G.paused && !G.done) {
    for (let i = 0; i < G.speed; i++) if (!G.done) update(dt);
  }
  if (screen !== 'play') updateFx(dt, menuFx);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// for testing from the browser console
window.KVH = {
  startDay, get G() { return G; }, get screen() { return screen; },
  unlockAll() { save.day = LEVELS.length - 1; writeSave(); },
};
})();
