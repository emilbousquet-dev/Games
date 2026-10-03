// =====================================================================
//  KIDS vs VIDEO GAMES: the rules, the screens and the main loop
// =====================================================================
(() => {
'use strict';

const W = 1280, H = 720;
const PX = MAP_W;                 // the shop panel starts here
const KID_SIZE = 0.68;            // how big the kids are on the map
const SAVE_KEY = 'kids-vs-video-games-best';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const view = { s: 1, ox: 0, oy: 0, px: 1 };
const mouse = { x: -999, y: -999 };
let buttons = [];
let screen = 'title';            // title, play, win, lose
let G = null;
let T = 0;
let menuFx = [];
let best = 0;
try { best = +localStorage.getItem(SAVE_KEY) || 0; } catch (e) { /* no storage */ }

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// =====================================================================
//  NEW GAME
// =====================================================================
function newGame() {
  G = {
    coins: START_COINS, bill: BILL_HEALTH, wave: 0, running: false, hpMul: 1,
    enemies: [], towers: [], shots: [], lobs: [], fx: [], queue: [],
    placing: null, sel: null, speed: 1, auto: false, autoT: 0, paused: false,
    banner: null, tip: null, nextId: 1, time: 0, shake: 0, billHurt: 0,
    freeplay: false, done: false, kills: 0,
  };
  screen = 'play';
}

// =====================================================================
//  WAVES
// =====================================================================
function parseList(str) {
  return str.trim().split(/\s+/).map(tok => {
    const [type, n] = tok.split('*');
    return { type, n: +n || 1 };
  }).filter(g => ENEMIES[g.type]);
}

function freeplayWave(idx) {
  const n = idx - WAVES.length + 1;
  const pool = ['puffy', 'plumbo', 'spiky', 'zappy', 'boomer', 'ghost', 'wrench'];
  const parts = [];
  for (let i = 0; i < 3; i++) parts.push(pick(pool) + '*' + (14 + n * 4));
  if (n % 5 === 0) parts.unshift(n % 10 === 0 ? 'king' : 'ape*' + Math.ceil(n / 5));
  return { list: parts.join(' '), tip: n % 5 === 0 ? 'FREEPLAY BOSS WAVE!' : null };
}

function startWave() {
  const g = G;
  if (g.running || g.done) return;
  const idx = g.wave;
  const def = idx < WAVES.length ? WAVES[idx] : freeplayWave(idx);
  g.wave++;
  g.running = true;
  g.hpMul = (1 + 0.08 * Math.max(0, idx - 2)) * (idx >= WAVES.length ? Math.pow(1.06, idx - WAVES.length + 1) : 1);
  const groups = parseList(def.list);
  groups.forEach((grp, gi) => {
    const gap = ENEMIES[grp.type].gap;
    for (let i = 0; i < grp.n; i++) g.queue.push({ type: grp.type, at: gi * 1.8 + i * gap + (ENEMIES[grp.type].boss ? 2 : 0) });
  });
  const boss = groups.find(grp => ENEMIES[grp.type].boss);
  g.banner = { text: 'WAVE ' + g.wave, sub: def.tip || '', t: 3, boss: !!boss };
  if (boss) { Sound.sfx('boss'); Sound.say(ENEMIES[boss.type].name.toLowerCase() + ' is coming!', 0.8); }
  else Sound.sfx('wave');
}

function waveDone() {
  const g = G;
  g.running = false;
  const bonus = 100 + g.wave * 15;
  g.coins += bonus;
  floatText(MAP_W / 2, 400, '+' + bonus + ' WAVE BONUS', '#ffd23f', 26);
  Sound.sfx('coin');
  if (g.wave > best) { best = g.wave; try { localStorage.setItem(SAVE_KEY, String(best)); } catch (e) { /* no storage */ } }
  if (!g.freeplay && g.wave >= WAVES.length) { win(); return; }
  if (g.auto) g.autoT = 1.5;
}

// =====================================================================
//  ENEMIES
// =====================================================================
function spawn(type, d) {
  const E = ENEMIES[type], g = G;
  const bossMul = E.boss ? 1 + Math.max(0, g.wave - WAVES.length) * 0.25 : g.hpMul;
  const scale = E.scale || 1;
  const e = {
    id: g.nextId++, type, d: d || 0, hp: Math.round(E.hp * bossMul), max: Math.round(E.hp * bossMul),
    speed: E.speed, speedNow: E.speed, x: -50, y: PATH[0][1], face: 1, walk: rand(0, 6),
    flies: !!E.flies, boss: !!E.boss, scale, height: E.height * scale, shadow: E.boss ? 30 : 13,
    sleep: 0, freeze: 0, flash: 0, hiss: 0, dead: false,
    dashT: rand(2, 4), dash: 0, jumpCD: rand(1, 3), jumping: false, jumpT: 0,
    throwCD: 4, throwT: 0, fireCD: 5, fireT: 0, split: false,
  };
  const p = pathPoint(e.d); e.x = p.x; e.y = p.y;
  g.enemies.push(e);
  return e;
}

function updateEnemies(dt) {
  const g = G;
  for (const e of g.enemies) {
    if (e.dead) continue;
    e.flash = Math.max(0, e.flash - dt);
    e.throwT = Math.max(0, e.throwT - dt);
    e.fireT = Math.max(0, e.fireT - dt);
    if (e.freeze > 0) { e.freeze -= dt; continue; }
    if (e.sleep > 0) { e.sleep -= dt; continue; }
    let mult = 1;
    switch (e.type) {
      case 'zappy':
        e.dashT -= dt; e.dash -= dt;
        if (e.dashT <= 0) { e.dash = 0.7; e.dashT = rand(3, 5); Sound.sfx('zap'); }
        if (e.dash > 0) mult = 2.6;
        break;
      case 'plumbo':
        if (e.jumping) { e.jumpT += dt / 0.6; mult = 1.5; if (e.jumpT >= 1) { e.jumping = false; e.jumpCD = rand(2, 4); } }
        else { e.jumpCD -= dt; if (e.jumpCD <= 0) { e.jumping = true; e.jumpT = 0; } }
        break;
      case 'boomer':
        if (e.hiss > 0) {
          e.hiss -= dt;
          if (e.hiss <= 0) boomerExplode(e);
          continue;
        }
        if (g.towers.some(t => !t.flier && dist(t.x, t.y, e.x, e.y) < 58)) { e.hiss = 1; Sound.sfx('hiss'); }
        break;
      case 'ape':
        e.throwCD -= dt;
        if (e.throwCD <= 0) {
          const near = g.towers.filter(t => !t.flier && dist(t.x, t.y, e.x, e.y) < 330);
          if (near.length) {
            const t = pick(near);
            g.lobs.push({ kind: 'barrel', x0: e.x + 20 * e.face, y0: e.y - 120, x1: t.x, y1: t.y - 20, t: 0, dur: 1, tower: t });
            e.throwT = 0.6; Sound.sfx('throw');
          }
          e.throwCD = 5;
        }
        break;
      case 'king':
        e.fireCD -= dt;
        if (e.fireCD <= 0) {
          let target = null, bd = 240;
          for (const t of g.towers) if (!t.flier) { const dd = dist(t.x, t.y, e.x, e.y); if (dd < bd) { bd = dd; target = t; } }
          if (target) {
            e.fireT = 0.8;
            e.face = target.x >= e.x ? 1 : -1;
            for (const t of g.towers) if (!t.flier && dist(t.x, t.y, target.x, target.y) < 80) t.stun = Math.max(t.stun, 3);
            g.fx.push({ kind: 'fire', x0: e.x + 35 * e.face, y0: e.y - 110, x1: target.x, y1: target.y - 30, life: 0.8, max: 0.8 });
            Sound.sfx('fire');
          }
          e.fireCD = 6;
        }
        if (!e.split && e.hp < e.max / 2) {
          e.split = true;
          for (let i = 0; i < 6; i++) spawn(['plumbo', 'ghost', 'spiky'][i % 3], Math.max(0, e.d - 20 - i * 18));
          floatText(e.x, e.y - 150, 'MINIONS, ATTACK!', '#ff5a3a', 22);
        }
        break;
    }
    if (e.fireT > 0) continue;   // the king stands still while breathing fire
    e.speedNow = e.speed * mult;
    e.d += e.speedNow * dt;
    e.walk += e.speedNow * dt * 0.12;
    const p = pathPoint(e.d);
    e.x = p.x; e.y = p.y;
    if (p.dx) e.face = p.dx;
    if (e.d >= PATH_LEN) reachBill(e);
  }
  g.enemies = g.enemies.filter(e => !e.dead);
}

function reachBill(e) {
  const g = G;
  e.dead = true;
  const hurt = ENEMIES[e.type].hurt;
  g.bill = Math.max(0, g.bill - hurt);
  g.billHurt = 0.6;
  floatText(BILL_SPOT.x, BILL_SPOT.y - 90, '-' + Math.min(hurt, 100), '#ff4a5a', 24);
  Sound.sfx('hurt');
  if (g.bill <= 0) lose();
}

function damage(e, dmg) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 0.08;
  if (e.hp <= 0) kill(e);
}

const BITS = {
  puffy: ['#ff9ec4', '#ffd0e2', '#d6203c'], plumbo: ['#d42a2a', '#2a55c8', '#ffd23f'], spiky: ['#2a5ef0', '#f2c99a'],
  zappy: ['#ffd93b', '#ff3b3b'], boomer: ['#5ec24a', '#3d9a32'], ghost: GHOST_COLORS, wrench: ['#e6a84c', '#9aa4b2'],
  bolt: ['#c8d0dc', '#5cff8a'], ape: ['#5a3418', '#c9925a', '#d4202a'], king: ['#2f9a3a', '#e8b830', '#e8402a', '#fff'],
};

function kill(e, silent) {
  if (e.dead) return;
  const g = G, E = ENEMIES[e.type];
  e.dead = true;
  g.kills++;
  g.coins += E.coins;
  if (!silent) floatText(e.x, e.y - e.height - 6, '+' + E.coins, '#ffd23f', e.boss ? 30 : 14);
  burst(g.fx, e.x, e.y - e.height / 2, e.boss ? 60 : 10, BITS[e.type], { kind: 'pixel', speed: e.boss ? 360 : 160 });
  Sound.sfx('pop');
  if (e.type === 'wrench') {
    const b = spawn('bolt', e.d);
    b.hp = b.max = Math.round(ENEMIES.bolt.hp * g.hpMul);
  }
  if (e.boss) {
    g.shake = 14;
    floatText(e.x, e.y - e.height - 30, 'BOSS DEFEATED!', '#ffd23f', 34);
    Sound.sfx('boom');
  }
}

function boomerExplode(e) {
  const g = G;
  for (const t of g.towers) if (!t.flier && dist(t.x, t.y, e.x, e.y) < 90) t.stun = Math.max(t.stun, 3);
  g.fx.push({ kind: 'ring', x: e.x, y: e.y - 25, life: 0.45, max: 0.45, r0: 10, r1: 90, color: '#7dff6a' });
  burst(g.fx, e.x, e.y - 25, 26, ['#5ec24a', '#3d9a32', '#fff', '#333'], { kind: 'pixel', speed: 260 });
  floatText(e.x, e.y - 70, 'BOOM!', '#7dff6a', 26);
  g.shake = 6;
  Sound.sfx('boom');
  kill(e, true);
}

// =====================================================================
//  TOWERS (the kids)
// =====================================================================
function lvl(t) { return TOWERS[t.type].levels[t.level]; }

function placeTower(type, x, y) {
  const g = G, TT = TOWERS[type];
  const t = {
    id: g.nextId++, type, x, y, level: 0, cd: 0.3, act: 0, phase: rand(0, 6), stun: 0,
    spent: TT.cost, mode: 'first', shots: 0, aim: -0.8, out: { tipX: 0, tipY: -100 },
    flier: !!TT.flier, fx: x, fy: y - 60, fface: 1, freezeCD: 3, catchCD: 4, banCD: 6, look: 0,
  };
  g.coins -= TT.cost;
  g.towers.push(t);
  burst(g.fx, x, y, 10, ['#fff', '#d8f0c8'], { kind: 'dot', speed: 90, g: 0 });
  Sound.sfx('place');
  return t;
}

function findTargets(t, range, n, air) {
  const g = G;
  const sx = t.flier ? t.fx : t.x, sy = t.flier ? t.fy : t.y;
  const list = g.enemies.filter(e => !e.dead && e.x > 0 && (air || !e.flies) && dist(sx, sy, e.x, e.y) <= range);
  if (t.mode === 'strong') list.sort((a, b) => b.hp - a.hp);
  else if (t.mode === 'close') list.sort((a, b) => dist(sx, sy, a.x, a.y) - dist(sx, sy, b.x, b.y));
  else list.sort((a, b) => b.d - a.d);
  return list.slice(0, n);
}

function updateTowers(dt) {
  const g = G;
  for (const t of g.towers) {
    t.act = Math.max(0, t.act - dt * 2.2);
    if (t.flier) moveEmile(t, dt);
    if (t.stun > 0) { t.stun -= dt; continue; }
    const L = lvl(t);
    t.cd -= dt;
    const headY = t.y - 80 * KID_SIZE;
    switch (t.type) {
      case 'nafti': {
        if (L.freezeEvery) {
          t.freezeCD -= dt;
          if (t.freezeCD <= 0) {
            const hit = g.enemies.filter(e => !e.dead && dist(t.x, t.y, e.x, e.y) <= L.range);
            if (hit.length) {
              for (const e of hit) e.freeze = Math.max(e.freeze, e.boss ? L.freezeTime * 0.35 : L.freezeTime);
              g.fx.push({ kind: 'ring', x: t.x, y: t.y - 20, life: 0.6, max: 0.6, r0: 10, r1: L.range, color: '#9fd8ff' });
              floatText(t.x, t.y - 90, 'TIME FREEZE!', '#9fd8ff', 18);
              Sound.sfx('freeze');
              t.freezeCD = L.freezeEvery;
            }
          }
        }
        if (t.cd <= 0) {
          const targets = findTargets(t, L.range, L.balls, false);
          if (targets.length) {
            t.cd = L.rate; t.act = 1;
            targets.forEach((e, i) => g.shots.push({ kind: 'ball', x: t.x + 10 + i * 4, y: headY - 20, target: e, speed: 560, dmg: L.dmg, vx: 0, vy: 0, life: 1 }));
            t.look = Math.sign(targets[0].x - t.x);
            Sound.sfx('throw');
          }
        }
        break;
      }
      case 'mio':
        if (t.cd <= 0) {
          const [e] = findTargets(t, L.range, 1, true);
          if (e) {
            t.cd = L.rate; t.act = 1; t.shots++;
            const ox = t.x + t.out.tipX * KID_SIZE, oy = t.y + t.out.tipY * KID_SIZE;
            t.aim = Math.atan2(e.y - e.height / 2 - oy, e.x - ox);
            g.shots.push({ kind: 'bolt', x: ox, y: oy, target: e, speed: 640, dmg: L.dmg, sleep: t.shots % L.sleepEvery === 0 ? L.sleep : 0,
                           sleepArea: L.sleepArea || 0, blast: L.blast || 0, vx: 0, vy: 0, life: 1 });
            t.look = Math.sign(e.x - t.x);
            Sound.sfx('magic');
          }
        }
        break;
      case 'felix': {
        if (L.catchEvery) {
          t.catchCD -= dt;
          if (t.catchCD <= 0) {
            const list = g.enemies.filter(e => !e.dead && !e.boss && e.x > 0 && dist(t.x, t.y, e.x, e.y) <= L.range).sort((a, b) => b.hp - a.hp);
            if (list.length) {
              const e = list[0];
              hookFx(t, e, '#ffd23f');
              floatText(e.x, e.y - e.height - 10, 'CAUGHT!', '#ffd23f', 20);
              kill(e);
              t.catchCD = L.catchEvery; t.act = 1;
            }
          }
        }
        if (t.cd <= 0) {
          const targets = findTargets(t, L.range, L.hooks, true);
          if (targets.length) {
            t.cd = L.rate; t.act = 1;
            for (const e of targets) {
              hookFx(t, e, '#2f8ee8');
              if (!e.boss) e.d = Math.max(0, e.d - L.pull);
              damage(e, L.dmg);
            }
            const e = targets[0];
            t.aim = Math.atan2(e.y - e.height / 2 - headY, e.x - t.x);
            t.look = Math.sign(e.x - t.x);
            Sound.sfx('hook');
          }
        }
        break;
      }
      case 'emile': {
        if (t.cd <= 0) {
          const targets = findTargets(t, 99999, L.lasers, true);
          if (targets.length) {
            t.cd = L.rate;
            for (const e of targets) {
              g.fx.push({ kind: 'beam', x0: t.fx + 30 * t.fface, y0: t.fy - 10, x1: e.x, y1: e.y - e.height / 2, life: 0.09, max: 0.09, color: '#7dfff0' });
              damage(e, L.dmg);
            }
            Sound.sfx('laser');
          }
        }
        t.banCD -= dt;
        if (t.banCD <= 0 && g.enemies.some(e => !e.dead && e.x > 0)) {
          t.banCD = L.banEvery;
          banHammer(t, L);
        }
        break;
      }
    }
  }
}

function hookFx(t, e, color) {
  const ox = t.x + t.out.tipX * KID_SIZE, oy = t.y + t.out.tipY * KID_SIZE;
  G.fx.push({ kind: 'hook', x0: ox, y0: oy, x1: e.x, y1: e.y - e.height / 2, life: 0.3, max: 0.3, color });
}

function moveEmile(t, dt) {
  const k = G.time * 0.55 + t.phase;
  const nx = clamp(t.x + Math.cos(k) * 190, 60, MAP_W - 60);
  const ny = clamp(t.y - 40 + Math.sin(k * 2) * 90, 170, MAP_H - 60);
  if (Math.abs(nx - t.fx) > 0.3) t.fface = nx > t.fx ? 1 : -1;
  t.fx = nx; t.fy = ny;
}

function banHammer(t, L) {
  const g = G;
  let n = 0;
  for (const e of g.enemies) {
    if (e.dead || e.x <= 0) continue;
    if (e.boss) damage(e, L.banBoss);
    else { kill(e, true); n++; }
  }
  g.fx.push({ kind: 'hammer', x: MAP_W / 2, y: 400, life: 1.2, max: 1.2 });
  floatText(MAP_W / 2, 330, n ? 'BANNED! x' + n : 'BANNED!', '#ff4a6a', 48);
  g.shake = 12;
  Sound.sfx('ban');
}

// =====================================================================
//  SHOTS, BARRELS AND EFFECTS
// =====================================================================
function updateShots(dt) {
  const g = G;
  for (let i = g.shots.length - 1; i >= 0; i--) {
    const s = g.shots[i];
    const e = s.target;
    if (e && !e.dead) {
      const tx = e.x, ty = e.y - e.height / 2;
      const dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy);
      s.vx = dx / d * s.speed; s.vy = dy / d * s.speed;
      if (d < 12) { hitShot(s, e); g.shots.splice(i, 1); continue; }
    } else {
      s.life -= dt * 2;
      if (s.life <= 0) { g.shots.splice(i, 1); continue; }
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.kind === 'bolt' && Math.random() < 0.6) g.fx.push({ kind: 'pixel', x: s.x, y: s.y, vx: rand(-20, 20), vy: rand(-20, 20), g: 0, life: 0.25, max: 0.25, color: '#7dff6a', size: 3 });
  }
}

function hitShot(s, e) {
  const g = G;
  if (s.kind === 'ball') {
    damage(e, s.dmg);
    burst(g.fx, s.x, s.y, 3, ['#e8343a', '#fff'], { kind: 'dot', speed: 80, min: 2, max: 3 });
    Sound.sfx('bonk');
    return;
  }
  // Mio's magic bolt
  if (s.blast) {
    for (const o of g.enemies) if (!o.dead && dist(o.x, o.y - o.height / 2, s.x, s.y) < s.blast) damage(o, s.dmg);
    g.fx.push({ kind: 'ring', x: s.x, y: s.y, life: 0.3, max: 0.3, r0: 5, r1: s.blast, color: '#7dff6a' });
    burst(g.fx, s.x, s.y, 10, ['#5ec24a', '#3d9a32', '#111'], { kind: 'pixel', speed: 140 });
  } else damage(e, s.dmg);
  if (s.sleep) {
    const sleepers = s.sleepArea ? g.enemies.filter(o => !o.dead && dist(o.x, o.y, e.x, e.y) < s.sleepArea) : [e];
    for (const o of sleepers) o.sleep = Math.max(o.sleep, o.boss ? s.sleep * 0.25 : s.sleep);
    floatText(e.x, e.y - e.height - 12, 'Shhh!', '#c8ffc0', 16);
    Sound.sfx('sleep');
  }
}

function updateLobs(dt) {
  const g = G;
  for (let i = g.lobs.length - 1; i >= 0; i--) {
    const l = g.lobs[i];
    l.t += dt;
    if (l.t < l.dur) continue;
    g.lobs.splice(i, 1);
    if (g.towers.includes(l.tower)) {
      l.tower.stun = Math.max(l.tower.stun, 2.5);
      floatText(l.x1, l.y1 - 50, 'BONK!', '#ffb02a', 20);
    }
    burst(g.fx, l.x1, l.y1, 14, ['#b5702c', '#3a2a1a', '#d9a060'], { speed: 180 });
    Sound.sfx('barrel');
  }
}

function burst(list, x, y, n, colors, o) {
  o = o || {};
  for (let i = 0; i < n; i++) {
    const life = rand(0.4, 0.8), sp = o.speed || 150;
    list.push({ kind: o.kind || 'pixel', x, y, vx: rand(-1, 1) * sp, vy: rand(-1.2, 0.3) * sp, g: o.g != null ? o.g : 420,
                life, max: life, color: pick(colors), size: rand(o.min || 3, o.max || 6), rot: rand(0, 6), vr: rand(-8, 8) });
  }
}
function floatText(x, y, str, color, size) {
  (G ? G.fx : menuFx).push({ kind: 'text', x, y, vx: 0, vy: -36, g: 0, life: 1.3, max: 1.3, text: str, color, size: size || 18 });
}
function updateFx(dt, list) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i];
    p.life -= dt;
    if (p.life <= 0) { list.splice(i, 1); continue; }
    if (p.vx != null) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt; }
    if (p.vr) p.rot += p.vr * dt;
  }
}

function drawFx(list, front) {
  for (const p of list) {
    const isText = p.kind === 'text' || p.kind === 'hammer';
    if (!!front !== isText) continue;
    const a = clamp(p.life / p.max, 0, 1);
    ctx.save();
    switch (p.kind) {
      case 'pixel':
        ctx.globalAlpha = a; ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        break;
      case 'dot':
        ctx.globalAlpha = a; ctx.fillStyle = p.color; circ(ctx, p.x, p.y, p.size * a); ctx.fill();
        break;
      case 'text':
        ctx.globalAlpha = Math.min(1, a * 2);
        text(ctx, p.text, p.x, p.y, p.size, p.color, { fam: FONT_TITLE, weight: '400' });
        break;
      case 'ring':
        ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = 3 + a * 6;
        circ(ctx, p.x, p.y, p.r0 + (p.r1 - p.r0) * (1 - a)); ctx.stroke();
        break;
      case 'beam':
        ctx.globalAlpha = a; ctx.strokeStyle = p.color; ctx.lineWidth = 5; ctx.lineCap = 'round';
        line(ctx, p.x0, p.y0, p.x1, p.y1);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; line(ctx, p.x0, p.y0, p.x1, p.y1);
        break;
      case 'hook': {
        ctx.globalAlpha = Math.min(1, a * 2); ctx.strokeStyle = p.color; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(p.x0, p.y0);
        ctx.quadraticCurveTo((p.x0 + p.x1) / 2, Math.max(p.y0, p.y1) + 20 * a, p.x1, p.y1); ctx.stroke();
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x1, p.y1 + 3, 3, 0, Math.PI); ctx.stroke();
        break;
      }
      case 'fire': {
        ctx.globalAlpha = a;
        for (let i = 0; i < 10; i++) {
          const k = i / 10, j = (1 - a + k) % 1;
          const x = p.x0 + (p.x1 - p.x0) * j, y = p.y0 + (p.y1 - p.y0) * j;
          ctx.fillStyle = ['#ffec5c', '#ffb02a', '#ff5a1a'][i % 3];
          circ(ctx, x + Math.sin(i * 7 + T * 20) * 6, y + Math.cos(i * 5 + T * 18) * 6, 6 + j * 14); ctx.fill();
        }
        break;
      }
      case 'hammer': {
        const k = 1 - a;
        const ang = k < 0.3 ? -1.4 + (k / 0.3) * 1.6 : 0.2;
        ctx.globalAlpha = Math.min(1, a * 3);
        ctx.translate(p.x + 60, p.y + 40); ctx.rotate(ang);
        ctx.fillStyle = '#8a5a2b'; rr(ctx, -8, -170, 16, 170, 6); ctx.fill();
        ctx.fillStyle = '#d0d4dc'; rr(ctx, -70, -220, 140, 70, 12); ctx.fill();
        ctx.strokeStyle = '#7a808c'; ctx.lineWidth = 5; ctx.stroke();
        text(ctx, 'BAN', 0, -185, 40, '#ff3b5c', { fam: FONT_TITLE, weight: '400' });
        break;
      }
    }
    ctx.restore();
  }
}

// =====================================================================
//  WIN / LOSE
// =====================================================================
function win() {
  G.done = true; G.shake = 0;
  screen = 'win';
  menuFx = [];
  Sound.sfx('win');
  Sound.say('You win! Bill is safe!', 1.2);
}
function lose() {
  G.done = true; G.shake = 0;
  screen = 'lose';
  menuFx = [];
  Sound.sfx('lose');
  Sound.say('Game over!', 0.8);
}

// =====================================================================
//  UPDATE
// =====================================================================
function update(dt) {
  const g = G;
  g.time += dt;
  g.shake = Math.max(0, g.shake - dt * 25);
  g.billHurt = Math.max(0, g.billHurt - dt);
  if (g.banner) { g.banner.t -= dt; if (g.banner.t <= 0) g.banner = null; }
  if (!g.running && g.auto && g.autoT > 0) { g.autoT -= dt; if (g.autoT <= 0) startWave(); }
  for (let i = g.queue.length - 1; i >= 0; i--) {
    const q = g.queue[i];
    q.at -= dt;
    if (q.at <= 0) { spawn(q.type, 0); g.queue.splice(i, 1); }
  }
  updateEnemies(dt);
  if (g.done) return;
  updateTowers(dt);
  updateShots(dt);
  updateLobs(dt);
  updateFx(dt, g.fx);
  if (g.running && g.queue.length === 0 && g.enemies.length === 0) waveDone();
}

// =====================================================================
//  INPUT
// =====================================================================
function towerAt(x, y) {
  const g = G;
  for (let i = g.towers.length - 1; i >= 0; i--) {
    const t = g.towers[i];
    if (t.flier) { if (dist(x, y, t.fx, t.fy) < 40) return t; }
    else if (Math.abs(x - t.x) < 16 && y > t.y - 78 && y < t.y + 6) return t;
  }
  return null;
}

function pickTower(type) {
  const g = G;
  if (g.placing === type) { g.placing = null; return; }
  if (g.coins < TOWERS[type].cost) { Sound.sfx('nope'); floatText(PX - 120, 200, 'Not enough coins!', '#ff8a8a', 18); return; }
  g.placing = type; g.sel = null;
  Sound.sfx('click');
}

function mapClick(x, y) {
  const g = G;
  if (g.placing) {
    const TT = TOWERS[g.placing];
    if (g.coins < TT.cost) { Sound.sfx('nope'); g.placing = null; return; }
    if (!TT.flier && !canPlace(x, y, g.towers)) { Sound.sfx('nope'); floatText(x, y - 20, 'Can\'t stand here!', '#ff8a8a', 16); return; }
    if (TT.flier && (x < 20 || x > MAP_W - 20 || y < 140)) { Sound.sfx('nope'); return; }
    g.sel = placeTower(g.placing, x, y);
    g.placing = null;
    return;
  }
  const t = towerAt(x, y);
  g.sel = t;
  if (t) Sound.sfx('click');
}

function upgrade(t) {
  const g = G, TT = TOWERS[t.type];
  const next = TT.levels[t.level + 1];
  if (!next) return;
  if (g.coins < next.cost) { Sound.sfx('nope'); return; }
  g.coins -= next.cost; t.spent += next.cost; t.level++;
  burst(g.fx, t.flier ? t.fx : t.x, (t.flier ? t.fy : t.y) - 40, 16, ['#ffd23f', '#fff', '#7dff6a'], { kind: 'pixel', speed: 160 });
  floatText(t.flier ? t.fx : t.x, (t.flier ? t.fy : t.y) - 90, next.name.toUpperCase() + '!', '#ffd23f', 18);
  Sound.sfx('upgrade');
}
function sell(t) {
  const g = G;
  const back = Math.floor(t.spent * 0.7);
  g.coins += back;
  g.towers = g.towers.filter(o => o !== t);
  floatText(t.flier ? t.fx : t.x, (t.flier ? t.fy : t.y) - 60, '+' + back, '#ffd23f', 20);
  g.sel = null;
  Sound.sfx('sell');
}

function click(x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const b = buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.fn(); return; }
  }
  if (screen === 'play' && G && !G.paused && !G.done && x < MAP_W) mapClick(x, y);
}

function toGame(e) { return { x: (e.clientX - view.ox) / view.s, y: (e.clientY - view.oy) / view.s }; }
canvas.addEventListener('pointerdown', e => {
  Sound.init();
  const p = toGame(e);
  mouse.x = p.x; mouse.y = p.y;
  if (e.button === 2) { if (G) { G.placing = null; G.sel = null; } return; }
  click(p.x, p.y);
});
window.addEventListener('pointermove', e => { const p = toGame(e); mouse.x = p.x; mouse.y = p.y; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('keydown', e => {
  Sound.init();
  const k = e.key.toLowerCase();
  if (k === 'm') { Sound.toggleMute(); return; }
  if (screen !== 'play' || !G || G.done) return;
  if (k === 'escape') { if (G.placing || G.sel) { G.placing = null; G.sel = null; } else G.paused = !G.paused; }
  else if (k === 'p') G.paused = !G.paused;
  else if (k === ' ') { e.preventDefault(); if (!G.paused) startWave(); }
  else if (k === 'f') G.speed = G.speed >= 3 ? 1 : G.speed + 1;
  else if (k === 'u' && G.sel) upgrade(G.sel);
  else if (/^[1-4]$/.test(k)) pickTower(TOWER_ORDER[+k - 1]);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && G && screen === 'play' && !G.done) G.paused = true; });

// =====================================================================
//  DRAWING
// =====================================================================
let mapCache = null, mapKey = '';
function drawMapCached() {
  const key = String(view.px);
  if (key !== mapKey) {
    mapKey = key;
    mapCache = document.createElement('canvas');
    mapCache.width = Math.max(1, Math.round(MAP_W * view.px));
    mapCache.height = Math.max(1, Math.round(MAP_H * view.px));
    const c = mapCache.getContext('2d');
    c.setTransform(view.px, 0, 0, view.px, 0, 0);
    drawMap(c);
  }
  ctx.drawImage(mapCache, 0, 0, MAP_W, MAP_H);
}

const hover = (x, y, w, h) => mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;

function button(label, x, y, w, h, fn, color, size, disabled) {
  const on = !disabled && hover(x, y, w, h);
  const lift = on ? -2 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; rr(ctx, x, y + 4, w, h, 12); ctx.fill();
  ctx.fillStyle = disabled ? '#555a66' : color; rr(ctx, x, y + lift, w, h, 12); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, x + 3, y + 3 + lift, w - 6, h * 0.42, 9); ctx.fill();
  text(ctx, label, x + w / 2, y + h / 2 + lift + 1, size || h * 0.42, disabled ? '#aaa' : '#fff', { fam: FONT_TITLE, weight: '400' });
  if (!disabled) buttons.push({ x, y, w, h, fn: () => { Sound.sfx('click'); fn(); } });
}

function drawTower(t) {
  const sel = G.sel === t;
  if (t.flier) {
    drawEmile(ctx, t.fx, t.fy, 0.85, T, { face: t.fface });
    text(ctx, 'ADMIN/EMILE', t.fx, t.fy - 48, 11, '#d6bcff', { lw: 3 });
    if (t.level > 0) text(ctx, 'SUPER', t.fx, t.fy - 61, 10, '#ffd23f', { lw: 3 });
    return;
  }
  if (sel) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ell(ctx, t.x, t.y, 20, 6); ctx.stroke(); }
  drawPerson(ctx, t.type, t.x, t.y, KID_SIZE, T, {
    act: t.act, phase: t.phase, stun: t.stun, aim: t.aim, out: t.out, look: t.look,
    ball: t.type === 'nafti' && t.act < 0.3,
  });
  // level badges
  for (let i = 0; i < t.level; i++) drawStar(ctx, t.x - 6 + i * 12, t.y + 9, 4.5, 0, '#ffd23f', '#a07a10');
}

function drawBill() {
  const g = G;
  const scared = g.billHurt > 0 || g.bill < 30 || g.enemies.some(e => e.d > PATH_LEN - 160);
  drawPerson(ctx, 'bill', BILL_SPOT.x, BILL_SPOT.y, 0.6, T, { mood: scared ? 'scared' : '', phase: 2, noShadow: true });
  if (g.billHurt > 0) { ctx.fillStyle = `rgba(255,40,60,${g.billHurt * 0.5})`; circ(ctx, BILL_SPOT.x, BILL_SPOT.y - 35, 40); ctx.fill(); }
  // Bill's health bar
  const bw = 110, bx = FORT.x + FORT.w / 2 - bw / 2, by = FORT.y + FORT.h + 6;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; rr(ctx, bx, by, bw, 14, 7); ctx.fill();
  const k = g.bill / BILL_HEALTH;
  ctx.fillStyle = k > 0.5 ? '#4ade6a' : k > 0.25 ? '#ffc23a' : '#ff4a5a';
  rr(ctx, bx + 2, by + 2, (bw - 4) * k, 10, 5); ctx.fill();
  drawHeart(ctx, bx - 4, by + 7, 8);
}

function drawGame() {
  const g = G;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, MAP_W, MAP_H); ctx.clip();
  if (g.shake) ctx.translate(rand(-g.shake, g.shake), rand(-g.shake, g.shake));
  drawMapCached();

  // range of the selected kid
  const showRange = (x, y, r, ok) => {
    ctx.fillStyle = ok ? 'rgba(255,255,255,0.15)' : 'rgba(255,60,60,0.18)';
    ctx.strokeStyle = ok ? 'rgba(255,255,255,0.7)' : 'rgba(255,80,80,0.8)'; ctx.lineWidth = 2;
    circ(ctx, x, y, r); ctx.fill(); ctx.stroke();
  };
  if (g.sel && !g.sel.flier) showRange(g.sel.x, g.sel.y, lvl(g.sel).range, true);

  // everything that stands on the ground, sorted from back to front
  const items = [];
  for (const t of g.towers) if (!t.flier) items.push({ y: t.y, draw: () => drawTower(t) });
  for (const e of g.enemies) if (!e.flies) items.push({ y: e.y, draw: () => drawEnemy(ctx, e, T) });
  items.push({ y: BILL_SPOT.y, draw: drawBill });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  for (const e of g.enemies) if (e.flies) drawEnemy(ctx, e, T);
  drawTV(ctx, T);

  // health bars
  for (const e of g.enemies) {
    if (e.hp >= e.max || e.boss) continue;
    const bw = 26, by = e.y - e.height - (e.flies ? 10 : 6);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(e.x - bw / 2, by, bw, 4);
    ctx.fillStyle = '#ff4a5a'; ctx.fillRect(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.max), 4);
  }
  for (const s of g.shots) {
    if (s.kind === 'ball') drawDodgeball(ctx, s.x, s.y, 4.5);
    else {
      ctx.fillStyle = 'rgba(125,255,106,0.4)'; circ(ctx, s.x, s.y, 8); ctx.fill();
      ctx.fillStyle = '#7dff6a'; ctx.fillRect(s.x - 3.5, s.y - 3.5, 7, 7);
      ctx.fillStyle = '#e8ffe0'; ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
    }
  }
  for (const l of g.lobs) {
    const k = l.t / l.dur;
    drawBarrel(ctx, l.x0 + (l.x1 - l.x0) * k, l.y0 + (l.y1 - l.y0) * k - Math.sin(k * Math.PI) * 120, 0.9);
  }
  drawFx(g.fx, false);
  for (const t of g.towers) if (t.flier) drawTower(t);
  if (g.sel && g.sel.flier) { ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; circ(ctx, g.sel.fx, g.sel.fy, 46); ctx.stroke(); }

  // boss health bar at the top
  const boss = g.enemies.find(e => e.boss);
  if (boss) {
    const bw = 420, bx = MAP_W / 2 - bw / 2;
    ctx.fillStyle = 'rgba(10,8,20,0.75)'; rr(ctx, bx - 10, 148, bw + 20, 46, 12); ctx.fill();
    text(ctx, ENEMIES[boss.type].name, MAP_W / 2, 162, 16, '#fff', { fam: FONT_TITLE, weight: '400' });
    ctx.fillStyle = '#3a2030'; rr(ctx, bx, 174, bw, 12, 6); ctx.fill();
    ctx.fillStyle = '#ff3b5c'; rr(ctx, bx, 174, bw * Math.max(0, boss.hp / boss.max), 12, 6); ctx.fill();
  }

  // placing a new kid: ghost + range
  if (g.placing && mouse.x < MAP_W && !g.paused) {
    const TT = TOWERS[g.placing];
    if (TT.flier) {
      drawEmile(ctx, mouse.x, mouse.y - 40, 0.85, T, { face: 1 });
    } else {
      const ok = canPlace(mouse.x, mouse.y, g.towers);
      showRange(mouse.x, mouse.y, TT.levels[0].range, ok);
      drawPerson(ctx, g.placing, mouse.x, mouse.y, KID_SIZE, T, { alpha: 0.75, phase: 1 });
    }
  }
  drawFx(g.fx, true);
  ctx.restore();

  // big banner
  if (g.banner) {
    const b = g.banner, a = clamp(Math.min(b.t * 2, (3 - b.t) * 4), 0, 1);
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(MAP_W / 2, 330);
    const s = 1 + Math.max(0, 0.25 - (3 - b.t)) * 2; ctx.scale(s, s);
    text(ctx, b.text, 0, -10, 70, b.boss ? '#ff4a5a' : '#ffd23f', { fam: FONT_TITLE, weight: '400', lw: 12 });
    if (b.sub) wrapText(ctx, b.sub, 0, 50, 700, 26, '#fff', { lw: 6 });
    ctx.restore();
  }
  // tips for new players
  let tip = null;
  if (g.wave === 0 && !g.running) tip = g.towers.length === 0 ? 'Click NAFTI on the right, then click next to the path!' : 'Ready? Press START WAVE!';
  if (tip && !g.placing) {
    ctx.font = font(20);
    const tw = ctx.measureText(tip).width + 40;
    ctx.fillStyle = 'rgba(15,12,30,0.85)'; rr(ctx, MAP_W / 2 - tw / 2, 660, tw, 44, 14); ctx.fill();
    text(ctx, tip, MAP_W / 2, 683, 20, '#fff', { stroke: false });
  }
  if (g.placing) text(ctx, 'Click where the kid should stand (right click to cancel)', MAP_W / 2, 700, 16, '#fff', { lw: 4 });

  drawPanel();

  if (g.paused && !g.done) {
    ctx.fillStyle = 'rgba(10,8,25,0.65)'; ctx.fillRect(0, 0, W, H);
    buttons = [];
    text(ctx, 'PAUSED', W / 2, 230, 90, '#ffd23f', { fam: FONT_TITLE, weight: '400', lw: 14 });
    button('KEEP PLAYING', W / 2 - 160, 320, 320, 68, () => { g.paused = false; }, '#3cb44a', 30);
    button('START OVER', W / 2 - 160, 405, 320, 60, newGame, '#ff8c2b', 26);
    button('MENU', W / 2 - 160, 482, 320, 60, () => { screen = 'title'; }, '#8a5ac8', 26);
  }
}

// ---------------- the shop panel on the right ----------------
function drawPanel() {
  const g = G, x0 = PX;
  const pg = ctx.createLinearGradient(x0, 0, W, H);
  pg.addColorStop(0, '#1f2540'); pg.addColorStop(1, '#141828');
  ctx.fillStyle = pg; ctx.fillRect(x0, 0, W - x0, H);
  ctx.fillStyle = '#0c0f1c'; ctx.fillRect(x0, 0, 3, H);

  // Bill, coins, wave
  drawHeart(ctx, x0 + 26, 28, 11);
  text(ctx, 'BILL', x0 + 44, 22, 13, '#ffb8c4', { stroke: false, align: 'left' });
  const k = g.bill / BILL_HEALTH;
  ctx.fillStyle = '#2a2f48'; rr(ctx, x0 + 44, 31, 140, 10, 5); ctx.fill();
  ctx.fillStyle = k > 0.5 ? '#4ade6a' : k > 0.25 ? '#ffc23a' : '#ff4a5a'; rr(ctx, x0 + 44, 31, 140 * k, 10, 5); ctx.fill();
  text(ctx, String(g.bill), x0 + 186, 22, 13, '#fff', { stroke: false, align: 'right' });
  drawCoin(ctx, x0 + 26, 66, 12);
  text(ctx, String(g.coins), x0 + 46, 67, 26, '#ffd23f', { fam: FONT_TITLE, weight: '400', align: 'left', lw: 4 });
  const wl = g.freeplay || g.wave > WAVES.length ? 'WAVE ' + g.wave : 'WAVE ' + g.wave + ' / ' + WAVES.length;
  text(ctx, wl, x0 + 100, 104, 18, '#cfd6ff', { fam: FONT_TITLE, weight: '400', lw: 4 });

  if (g.sel) drawTowerPanel(g.sel);
  else drawShop();

  // speed, auto, sound
  const by = 586;
  button(g.speed + 'x', x0 + 12, by, 56, 40, () => { g.speed = g.speed >= 3 ? 1 : g.speed + 1; }, g.speed > 1 ? '#e08a20' : '#3a4266', 20);
  button(g.auto ? 'AUTO ON' : 'AUTO', x0 + 74, by, 72, 40, () => { g.auto = !g.auto; if (g.auto && !g.running) g.autoT = 0.5; }, g.auto ? '#e08a20' : '#3a4266', 15);
  button(Sound.muted ? 'MUTE' : 'SND', x0 + 152, by, 40, 40, () => Sound.toggleMute(), '#3a4266', 12);
  button(g.running ? 'WAVE ' + g.wave + '...' : 'START WAVE', x0 + 12, 640, 180, 66, startWave, '#3cb44a', g.running ? 22 : 26, g.running);
}

function drawShop() {
  const g = G, x0 = PX;
  text(ctx, 'KIDS', x0 + 100, 138, 20, '#fff', { fam: FONT_TITLE, weight: '400', lw: 4 });
  let tipFor = null;
  TOWER_ORDER.forEach((type, i) => {
    const TT = TOWERS[type];
    const x = x0 + 10, y = 156 + i * 104, w = 184, h = 96;
    const can = g.coins >= TT.cost, on = hover(x, y, w, h), sel = g.placing === type;
    ctx.fillStyle = sel ? '#4a4020' : on ? '#2e3658' : '#252c48'; rr(ctx, x, y, w, h, 12); ctx.fill();
    ctx.strokeStyle = sel ? '#ffd23f' : type === 'emile' ? '#9a5cff' : '#3c4670'; ctx.lineWidth = sel ? 3 : 2; ctx.stroke();
    // portrait
    ctx.save();
    rr(ctx, x + 5, y + 5, 74, h - 10, 9); ctx.clip();
    const bg = ctx.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, type === 'emile' ? '#3a1a70' : '#5a8a48'); bg.addColorStop(1, type === 'emile' ? '#1a0a40' : '#3d6a32');
    ctx.fillStyle = bg; ctx.fillRect(x, y, 80, h);
    if (type === 'emile') drawEmile(ctx, x + 38, y + 58, 0.82, T, { face: 1 });
    else drawPerson(ctx, type, x + 42, y + 160, 1.45, T, { phase: i, noShadow: true, ball: type === 'nafti' });
    ctx.restore();
    text(ctx, TT.name, x + 132, y + 26, type === 'emile' ? 14 : 20, type === 'emile' ? '#d6bcff' : '#fff', { fam: FONT_TITLE, weight: '400', lw: 4 });
    drawCoin(ctx, x + 100, y + 58, 9);
    text(ctx, String(TT.cost), x + 113, y + 59, 18, can ? '#ffd23f' : '#ff7a7a', { stroke: false, align: 'left', weight: '700' });
    text(ctx, TT.air ? 'hits flyers' : 'ground only', x + 132, y + 82, 11, TT.air ? '#9fe8ff' : '#aab', { stroke: false });
    text(ctx, String(i + 1), x + 172, y + 12, 11, '#8890b8', { stroke: false });
    if (!can) { ctx.fillStyle = 'rgba(10,12,25,0.45)'; rr(ctx, x, y, w, h, 12); ctx.fill(); }
    buttons.push({ x, y, w, h, fn: () => pickTower(type) });
    if (on) tipFor = { type, y };
  });
  if (tipFor) {
    const TT = TOWERS[tipFor.type];
    const tx = PX - 300, ty = clamp(tipFor.y, 10, H - 120);
    ctx.fillStyle = 'rgba(15,12,30,0.94)'; rr(ctx, tx, ty, 290, 104, 12); ctx.fill();
    ctx.strokeStyle = '#3c4670'; ctx.lineWidth = 2; ctx.stroke();
    text(ctx, TT.name, tx + 14, ty + 20, 18, '#ffd23f', { fam: FONT_TITLE, weight: '400', align: 'left', lw: 3 });
    wrapText(ctx, TT.info, tx + 145, ty + 46, 266, 14, '#e8ecff', { stroke: false, weight: '500' });
  }
}

function drawTowerPanel(t) {
  const g = G, x0 = PX, TT = TOWERS[t.type], L = lvl(t), next = TT.levels[t.level + 1];
  ctx.fillStyle = '#252c48'; rr(ctx, x0 + 10, 126, 184, 450, 12); ctx.fill();
  // close
  button('X', x0 + 160, 132, 28, 28, () => { g.sel = null; }, '#5a4266', 14);
  // portrait
  ctx.save(); rr(ctx, x0 + 20, 134, 120, 120, 10); ctx.clip();
  ctx.fillStyle = t.flier ? '#2a1260' : '#4a7a3a'; ctx.fillRect(x0 + 20, 134, 120, 120);
  if (t.flier) drawEmile(ctx, x0 + 80, 200, 1.2, T, { face: 1 });
  else drawPerson(ctx, t.type, x0 + 80, 330, 1.9, T, { phase: 0, noShadow: true, ball: t.type === 'nafti' });
  ctx.restore();
  text(ctx, TT.name, x0 + 102, 274, t.flier ? 17 : 24, t.flier ? '#d6bcff' : '#fff', { fam: FONT_TITLE, weight: '400', lw: 4 });
  for (let i = 0; i < TT.levels.length; i++) drawStar(ctx, x0 + 102 - (TT.levels.length - 1) * 12 + i * 24, 300, 9, 0, i <= t.level ? '#ffd23f' : '#3c4670', i <= t.level ? '#a07a10' : '#2a3050');
  text(ctx, (t.level === 0 ? 'Level 1' : L.name), x0 + 102, 322, 14, '#cfd6ff', { stroke: false });
  // upgrade
  if (next) {
    const can = g.coins >= next.cost;
    ctx.fillStyle = '#1b2036'; rr(ctx, x0 + 18, 338, 168, 120, 10); ctx.fill();
    text(ctx, 'NEXT: ' + next.name, x0 + 102, 354, 14, '#ffd23f', { stroke: false, weight: '700' });
    wrapText(ctx, next.info, x0 + 102, 374, 156, 12, '#e8ecff', { stroke: false, weight: '500' });
    button('UPGRADE ' + next.cost, x0 + 24, 414, 156, 38, () => upgrade(t), '#e08a20', 16, !can);
  } else {
    text(ctx, 'MAX LEVEL!', x0 + 102, 380, 22, '#ffd23f', { fam: FONT_TITLE, weight: '400', lw: 4 });
  }
  // targeting
  if (!t.flier) {
    const modes = { first: 'FIRST', strong: 'STRONGEST', close: 'CLOSEST' };
    text(ctx, 'Attack:', x0 + 24, 478, 13, '#aab', { stroke: false, align: 'left' });
    button(modes[t.mode], x0 + 76, 465, 110, 28, () => {
      const order = ['first', 'strong', 'close'];
      t.mode = order[(order.indexOf(t.mode) + 1) % 3];
    }, '#3a4266', 13);
  }
  button('SELL ' + Math.floor(t.spent * 0.7), x0 + 24, 512, 156, 40, () => sell(t), '#c83a4a', 18);
}

// ---------------- menu screens ----------------
const PARADE = ['puffy', 'plumbo', 'spiky', 'zappy', 'boomer', 'ghost', 'wrench', 'bolt'];
function drawTitle() {
  // the schoolyard, stretched to fill the whole screen
  drawMapCached();
  ctx.drawImage(mapCache, 0, 0, mapCache.width, mapCache.height, 0, -(MAP_H * W / MAP_W - H) / 2, W, MAP_H * W / MAP_W);
  ctx.fillStyle = 'rgba(15,10,40,0.55)'; ctx.fillRect(0, 0, W, H);
  // ADMIN/EMILE flying around
  drawEmile(ctx, W / 2 + Math.cos(T * 0.7) * 470, 150 + Math.sin(T * 1.4) * 40, 1, T, { face: Math.sin(T * 0.7) < 0 ? 1 : -1 });
  // title
  ctx.save();
  ctx.translate(W / 2, 92); ctx.rotate(Math.sin(T * 1.3) * 0.015);
  const parts = [['KIDS', 92, '#ffd23f', 0], ['vs', 54, '#fff', 10], ['VIDEO GAMES', 92, '#ff4a6a', 0]];
  const widths = parts.map(([str, size]) => { ctx.font = font(size, FONT_TITLE, '400'); return ctx.measureText(str).width; });
  let tx = -(widths[0] + widths[1] + widths[2] + 56) / 2;
  parts.forEach(([str, size, color, dy], i) => {
    text(ctx, str, tx + widths[i] / 2, dy, size, color, { fam: FONT_TITLE, weight: '400', lw: size > 60 ? 14 : 10 });
    tx += widths[i] + 28;
  });
  ctx.restore();
  text(ctx, 'Protect Bill from the video game characters!', W / 2, 160, 24, '#fff', { lw: 5 });
  button('PLAY!', W / 2 - 130, 196, 260, 74, newGame, '#3cb44a', 42);
  if (best) text(ctx, 'Best: wave ' + best, W / 2, 292, 18, '#ffd23f', { lw: 4 });
  // the three heroes
  [['mio', 400], ['nafti', 640], ['felix', 880]].forEach(([k, x], i) => {
    const act = k === 'felix' ? 0 : Math.max(0, Math.sin(T * 1.6 + i * 2) * 1.3 - 0.3);
    drawPerson(ctx, k, x, 628, 2.75, T, { phase: i * 2, act: k === 'nafti' ? act : 0, ball: k === 'nafti' && act < 0.3, look: Math.sin(T * 0.5 + i) });
    text(ctx, TOWERS[k].name.toUpperCase(), x, 652, 30, '#fff', { fam: FONT_TITLE, weight: '400', lw: 7 });
  });
  // the parade of video game characters
  PARADE.forEach((type, i) => {
    const x = W + 80 - ((T * 70 + i * 170) % (W + 200));
    const E = ENEMIES[type];
    drawEnemy(ctx, { type, x, y: 712, face: -1, walk: T * 8 + i, id: i, flies: !!E.flies, height: E.height, scale: 0.9, speedNow: 60 }, T);
  });
}

function confetti() {
  if (Math.random() < 0.6) menuFx.push({ kind: 'pixel', x: rand(0, W), y: -10, vx: rand(-30, 30), vy: rand(80, 160), g: 20, life: 6, max: 6,
    color: pick(['#ffd23f', '#ff4a6a', '#4ab8ff', '#7dff6a', '#d6bcff']), size: rand(6, 10) });
}

function drawWin() {
  drawGame();
  buttons = [];
  ctx.fillStyle = 'rgba(10,8,30,0.72)'; ctx.fillRect(0, 0, W, H);
  confetti(); drawFx(menuFx, false);
  text(ctx, 'YOU WIN!', W / 2, 110, 100, '#ffd23f', { fam: FONT_TITLE, weight: '400', lw: 16 });
  text(ctx, 'Bill is safe! All 20 waves beaten!', W / 2, 185, 28, '#fff', { lw: 6 });
  [['mio', 380], ['nafti', 520], ['bill', 660], ['felix', 800]].forEach(([k, x], i) => {
    const jump = Math.abs(Math.sin(T * 5 + i)) * 25;
    drawPerson(ctx, k, x, 520 - jump, 2, T, { phase: i, act: k === 'nafti' ? Math.max(0, Math.sin(T * 4)) : 0, mood: k === 'bill' ? 'scared' : '' });
  });
  drawEmile(ctx, 960, 330 + Math.sin(T * 2) * 10, 1.3, T, { face: -1 });
  button('KEEP PLAYING (FREEPLAY)', W / 2 - 300, 590, 340, 70, () => { G.done = false; G.freeplay = true; screen = 'play'; }, '#3cb44a', 22);
  button('MENU', W / 2 + 60, 590, 240, 70, () => { screen = 'title'; }, '#8a5ac8', 30);
}

function drawLose() {
  drawGame();
  buttons = [];
  ctx.fillStyle = 'rgba(40,0,10,0.72)'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2 + Math.sin(T * 30) * 3, 200);
  text(ctx, 'GAME OVER', 0, 0, 110, '#ff4a5a', { fam: FONT_TITLE, weight: '400', lw: 16 });
  ctx.restore();
  text(ctx, 'The video game characters got Bill!', W / 2, 290, 30, '#fff', { lw: 6 });
  text(ctx, 'You made it to wave ' + G.wave + '  (best: ' + best + ')', W / 2, 340, 24, '#ffd23f', { lw: 5 });
  ['puffy', 'plumbo', 'spiky', 'zappy', 'ghost'].forEach((type, i) => {
    const E = ENEMIES[type];
    drawEnemy(ctx, { type, x: 400 + i * 120, y: 520, face: 1, walk: T * 6 + i, id: i, flies: !!E.flies, height: E.height, scale: 1.6, speedNow: 50 }, T);
  });
  button('TRY AGAIN', W / 2 - 290, 590, 280, 70, newGame, '#3cb44a', 32);
  button('MENU', W / 2 + 10, 590, 280, 70, () => { screen = 'title'; }, '#8a5ac8', 32);
}

function draw() {
  buttons = [];
  ctx.setTransform(view.px, 0, 0, view.px, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (screen === 'title') drawTitle();
  else if (screen === 'play') drawGame();
  else if (screen === 'win') drawWin();
  else if (screen === 'lose') drawLose();
}

// =====================================================================
//  SCREEN SIZE AND MAIN LOOP
// =====================================================================
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
  if (screen === 'play' && G && !G.paused && !G.done) for (let i = 0; i < G.speed; i++) if (!G.done) update(dt);
  if (screen !== 'play') updateFx(dt, menuFx);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// for testing from the browser console
window.KVG = { newGame, startWave, placeTower, get G() { return G; }, get screen() { return screen; } };
})();
