// ============================================================
//  LIL' PLUT ODYSSEY — THE GAME 🎮
//  The main loop, the camera, what happens when things touch,
//  checkpoints, finishing a level and saving your progress.
// ============================================================
window.LP = window.LP || {};

// ---------- saving your progress ----------
LP.Save = {
  data: Object.assign({ levels: {}, seen: {} }, LP.store.get('save', {})),
  lvl(id) {
    if (!this.data.levels[id]) this.data.levels[id] = { done: false, milk: 0, ducks: [false, false, false], medal: 0 };
    return this.data.levels[id];
  },
  write() { LP.store.set('save', this.data); },
  levelDucks(i) { return this.lvl(LP.LEVELS[i].id).ducks; },
  totalDucks() { let n = 0; for (const L of LP.LEVELS) n += this.lvl(L.id).ducks.filter(Boolean).length; return n; },
  worldOpen(w) {
    const W = LP.WORLDS[w];
    if (W.after && !this.lvl(W.after).done) return false;
    return this.totalDucks() >= W.ducks;
  },
  totalCages() { return LP.LEVELS.filter((L) => L.type === 'normal').length * 3; },
  goldBottles() { return LP.LEVELS.filter((L) => this.lvl(L.id).medal === 3).length; },
  unlocked(i) {
    if (i === 0) return true;
    const L = LP.LEVELS[i], prev = LP.LEVELS[i - 1];
    if (!this.lvl(prev.id).done) return false;
    return this.worldOpen(L.world);
  },
  reset() { this.data = { levels: {}, seen: {} }; this.write(); },
};

LP.game = (function () {
  const T = LP.T, VH = LP.VH, U = LP.U, TL = LP.TILE, Th = LP.Things;
  const STEP = 1 / 120;

  const g = {
    mode: 'title', time: 0, cam: { x: 0, y: 0, look: 0 },
    fx: new LP.FX(), things: [], platforms: [], fans: [], boss: null, chaser: null,
    save: LP.Save, shakeAmt: 0, hitStop: 0, flash: {}, chocT: 0,
    levelIndex: 0, scale: 1, viewW: 1280,
  };
  let canvas, ctx, acc = 0, last = 0, resizeT = 0;

  // =================== setting up ===================
  function init() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');
    g.canvas = canvas; g.ctx = ctx;
    LP.Input.init(canvas);
    resize();
    window.addEventListener('resize', () => { resizeT = 0.25; });
    // sound can only start after you press something
    const wake = () => { LP.Audio.init(); };
    window.addEventListener('keydown', wake); window.addEventListener('pointerdown', wake);

    const q = new URLSearchParams(location.search);
    const jump = q.get('level');
    if (jump) {
      const i = LP.LEVELS.findIndex((L) => L.id.toLowerCase() === jump.toLowerCase());
      if (i >= 0) { startLevel(i); }
    } else LP.Screens.open('title');
    requestAnimationFrame(frame);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    g.scale = canvas.height / VH;
    g.viewW = canvas.width / g.scale;
    if (g.level) { LP.BG.build(g.theme.key, g.scale); LP.Terrain.build(g.level, g.theme.key, g.scale); }
    LP.Screens.resized && LP.Screens.resized();
  }

  // =================== starting a level ===================
  function startLevel(i) {
    const def = LP.LEVELS[i];
    g.levelIndex = i;
    g.def = def;
    const level = LP.Level.build(def, i);
    g.level = level;
    const key = LP.WORLDS[def.world].theme;
    g.theme = Object.assign({}, LP.THEMES[key], { key });
    // when a box breaks, repaint the ground there
    const set = level.set;
    level.set = (tx, ty, v) => { set(tx, ty, v); LP.Terrain.markDirty(tx); };
    LP.BG.build(key, g.scale);
    LP.Terrain.build(level, key, g.scale);

    g.things = []; g.boss = null; g.chaser = null; g.fx.clear();
    let cages = 0;
    g.totalMilk = 0;
    for (const t of level.things) {
      if (t.ch === 'K') {
        g.boss = def.boss === 'whiskers' ? new Th.Whiskers(t.x + T / 2, t.y + T) : new Th.Gnome(t.x + T / 2, t.y + T);
        continue;
      }
      const th = Th.spawn(t, level, cages);
      if (!th) continue;
      if (t.ch === 'D') cages++;
      if (t.ch === 'o') g.totalMilk += 1;
      if (t.ch === 'O') g.totalMilk += 5;
      g.things.push(th);
    }
    g.platforms = g.things.filter((t) => t.isPlatform);
    g.fans = g.things.filter((t) => t instanceof Th.Fan);
    g.player = new LP.Player(level.start.x, level.start.y);
    g.checkpoint = { x: level.start.x, y: level.start.y };
    if (def.type === 'chase') g.chaser = new Th.Chaser(def.chaser, level.start.x - 700, def.chaseSpeed || 250);
    g.milk = 0; g.ducksFound = [false, false, false]; g.chocT = 0; g.deaths = 0; g.killChain = 0; g.killT = 0;
    g.finished = false; g.finishT = 0; g.levelT = 0; g.sign = null; g.signT = 0; g.bossIntro = 0;
    snapCamera();
    g.mode = 'play';
    acc = 0;
    LP.Input.clearPressed();
    LP.Audio.music(def.type === 'chase' && key !== 'dream' ? 'chase' : def.type === 'chase' ? 'boss' : def.type === 'boss' ? 'boss' : key);
  }

  function snapCamera() {
    const p = g.player;
    g.cam.x = p.cx - g.viewW / 2; g.cam.y = p.y - VH * 0.58; g.cam.look = 0;
    clampCamera();
  }
  function clampCamera() {
    const L = g.level;
    if (L.pw <= g.viewW) g.cam.x = (L.pw - g.viewW) / 2;
    else g.cam.x = U.clamp(g.cam.x, 0, L.pw - g.viewW);
    g.cam.y = U.clamp(g.cam.y, 0, Math.max(0, L.ph - VH));
  }

  // =================== the main loop ===================
  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - (last || ts)) / 1000);
    last = ts;
    if (resizeT > 0) { resizeT -= dt; if (resizeT <= 0) resize(); }
    LP.Input.poll();
    if (LP.Input.take('mute')) LP.Audio.toggleMute();

    if (g.mode === 'play') {
      if (LP.Input.take('pause')) { LP.Screens.open('pause'); LP.Audio.play('menu'); }
      else {
        acc += dt;
        let steps = 0;
        while (acc >= STEP && steps < 12) { update(STEP); acc -= STEP; steps++; }
        if (steps) LP.Input.clearPressed();
      }
      render(dt);
    } else {
      if (g.level && (g.mode === 'pause' || g.mode === 'complete')) render(0);
      LP.Screens.update(dt);
      LP.Screens.draw(ctx);
      LP.Input.clearPressed();
    }
    g.lastDt = dt;
  }

  function update(dt) {
    g.time += dt; g.levelT += dt;
    if (g.hitStop > 0) { g.hitStop -= dt; return; }
    const p = g.player;
    for (const pl of g.platforms) pl.move(dt, g);
    const prevBottom = p.bottom;
    p.update(dt, g);
    touches(prevBottom);
    for (const t of g.things) if (!t.isPlatform) t.update(dt, g);
    if (g.boss) g.boss.update(dt, g);
    if (g.chaser) g.chaser.update(dt, g);
    if (g.boss && g.boss.dead) g.boss = null;
    g.things = g.things.filter((t) => !t.dead);
    g.fx.update(dt);
    g.chocT = Math.max(0, g.chocT - dt);
    g.killT -= dt; if (g.killT <= 0) g.killChain = 0;
    g.signT -= dt; if (g.signT <= 0) g.sign = null;
    for (const k in g.flash) g.flash[k] -= dt;
    g.shakeAmt *= Math.exp(-dt * 9);
    if (g.finished) {
      g.finishT += dt;
      if (g.finishT > 2.6) LP.Screens.open('complete');
    }
    updateCamera(dt);
  }

  function updateCamera(dt) {
    const p = g.player, c = g.cam;
    if (p.state === 'bubble') return;
    const want = Math.abs(p.vx) > 60 ? Math.sign(p.vx) * 110 : c.look;
    c.look = U.lerp(c.look, want, Math.min(1, dt * 2.5));
    let tx = p.cx + c.look - g.viewW / 2;
    // in a boss fight, keep both Plut and the boss on the screen
    if (g.boss && g.boss.state !== 'dead') tx = (p.cx + g.boss.cx) / 2 - g.viewW / 2;
    let ty = p.y + p.h / 2 - VH * 0.56;
    if (g.def.type === 'boss') ty = g.level.ph - VH;
    c.x += (tx - c.x) * Math.min(1, dt * 7);
    const fallFast = p.vy > 600;
    c.y += (ty - c.y) * Math.min(1, dt * (p.onGround || fallFast ? 6 : 2.5));
    clampCamera();
  }

  // =================== things touching things ===================
  function shrink(r, s) { return { x: r.x + s, y: r.y + s, w: r.w - s * 2, h: r.h - s * 2 }; }

  function touches(prevBottom) {
    const p = g.player;
    if (p.state !== 'play') return;
    const box = p.attackBox();
    const pr = shrink(p, 3);
    for (const e of g.things) {
      if (e.dead) continue;
      if (e.enemy && !e.dying) {
        if (box && e.lastHit !== box.id && U.overlap(box, e)) {
          e.lastHit = box.id;
          e.hurt(g, 'slap', p.cx);
          g.hitStop = box.big ? 0.07 : 0.04;
          continue;
        }
        if (U.overlap(pr, shrink(e, 4))) {
          if (p.vy > 0 && prevBottom <= e.y + 18) {
            e.hurt(g, 'stomp', p.cx); p.bounce(LP.MOVE.stompBounce); LP.Audio.play('hop');
          } else if (e.stun <= 0) p.hurt(g, e.cx);
        }
      } else if (e instanceof Th.Cage) {
        if (box && U.overlap(box, e)) e.hit(g);
        else if (p.pounding && U.overlap(p, e)) e.hit(g);
      } else if (e.shot) {
        if (box && !e.wave && !e.back && U.overlap(box, e)) e.reflect(g);
        else if (!e.back && U.overlap(pr, e)) { p.hurt(g, e.cx); if (!e.wave) e.dead = true; }
      }
    }
    // the boss
    const b = g.boss;
    if (b && b.state !== 'dead') {
      const bb = b.box();
      if (box && U.overlap(box, bb) && b.lastHit !== box.id) {
        b.lastHit = box.id;
        if (b.canBeHit) { b.hurt(g, p.cx); g.hitStop = 0.08; }
        else { LP.Audio.play('locked'); g.fx.sparkle(box.x + box.w / 2, box.y + 20, 4, '#fff'); }
      }
      if (p.vy > 0 && prevBottom <= bb.y + 24 && U.overlap(pr, bb)) {
        // jump on his head
        if (b.canBeHit) b.hurt(g, p.cx);
        p.bounce(900); LP.Audio.play('spring');
      }
    }
    // slapping boxes
    if (box) {
      const c0 = Math.floor(box.x / T), c1 = Math.floor((box.x + box.w) / T);
      const r0 = Math.floor(box.y / T), r1 = Math.floor((box.y + box.h) / T);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (g.level.get(c, r) === TL.BREAK) breakTile(c, r);
    }
  }

  function breakTile(tx, ty) {
    g.level.set(tx, ty, TL.EMPTY);
    const k = g.theme.key;
    const cols = k === 'house' ? ['#ff5a6e', '#4ac8ff', '#ffd23f', '#ffffff'] : ['#b7834a', '#7a4a24', '#c8955a'];
    g.fx.bits(tx * T + T / 2, ty * T + T / 2, 10, cols);
    g.fx.dust(tx * T + T / 2, ty * T + T, 4, 0);
    g.shake(5);
    LP.Audio.play('break');
    if (U.hash(tx, ty) < 0.5) {
      for (let i = 0; i < 2; i++) { const m = new Th.Milk(tx * T + T / 2, ty * T + T / 2, 1); m.vx = U.rand(-150, 150); m.vy = U.rand(-500, -250); m.life = 5; g.things.push(m); }
    }
  }

  // =================== things the other parts of the game call ===================
  Object.assign(g, {
    add(t) { g.things.push(t); if (t.isPlatform) g.platforms.push(t); },
    shake(n) { if (LP.settings.shake) g.shakeAmt = Math.max(g.shakeAmt, n); },
    hudFlash(k) { g.flash[k] = 0.6; },
    windAt(x, y) { let w = 0; for (const f of g.fans) w = Math.max(w, f.wind(x, y)); return w; },
    showSign(s) { g.sign = s; g.signT = 0.15; },
    setCheckpoint(x, y) { g.checkpoint = { x, y }; },

    collectMilk(m) {
      const v = m.value * (g.chocT > 0 ? 2 : 1);
      g.milk += v;
      const p = g.player;
      p.scream = Math.min(100, p.scream + (m.value > 1 ? 15 : 3));
      if (m.value > 1) { LP.Audio.play('bottle'); g.fx.text(m.cx, m.y, '+' + v, '#ffffff', 26); g.fx.sparkle(m.cx, m.cy, 14, '#d8f4ff'); }
      else { LP.Audio.play('milk'); g.fx.sparkle(m.cx, m.cy, 4, g.chocT > 0 ? '#ffcf8a' : '#e8f8ff'); }
      g.hudFlash('milk');
    },
    goldenBottle(b) {
      g.chocT = 10;
      LP.Audio.play('golden');
      g.fx.text(b.cx, b.y - 10, 'CHOCOLATE MILK! x2', '#ffcf3a', 30);
      g.fx.sparkle(b.cx, b.cy, 30, '#ffe680');
      g.player.scream = 100;
    },
    freeDuck(i, x, y) {
      g.ducksFound[i] = true;
      const rec = LP.Save.lvl(g.def.id);
      rec.ducks[i] = true; LP.Save.write();
      LP.Audio.play('duck');
      g.fx.text(x, y - 20, 'DUCK SAVED!', '#ffe14a', 30);
    },
    combo(x, y) {
      g.killChain++; g.killT = 1.6;
      if (g.killChain >= 2) g.fx.text(x, y - 30, g.killChain + 'x COMBO!', '#ff9af0', 22 + Math.min(14, g.killChain * 2));
    },

    onScream(p) {
      LP.Audio.play('scream');
      g.shake(14);
      const x = p.cx, y = p.y + 20;
      g.fx.ring(x, y, '#ffe14a', 330, 0.6); g.fx.ring(x, y, '#ff8ad8', 260, 0.75); g.fx.ring(x, y, '#ffffff', 200, 0.5);
      g.fx.text(x, p.y - 30, 'WAAAAH!', '#ffe14a', 40);
      for (const e of g.things) {
        if (e.dead) continue;
        const d = U.dist(x, y, e.cx, e.cy);
        if (e.enemy && !e.dying && d < 340) e.hurt(g, 'scream', x);
        else if (e instanceof Th.Cage && d < 220) e.hit(g);
        else if (e.shot && d < 340) { e.dead = true; g.fx.sparkle(e.cx, e.cy, 6, '#fff'); }
      }
      if (g.boss && U.dist(x, y, g.boss.cx, g.boss.cy) < 560) g.boss.stunned(g);
      const R = 4, c0 = Math.floor(x / T) - R, r0 = Math.floor(y / T) - R;
      for (let r = r0; r <= r0 + R * 2; r++) for (let c = c0; c <= c0 + R * 2; c++) {
        if (g.level.get(c, r) === TL.BREAK && U.dist(x, y, c * T + T / 2, r * T + T / 2) < 210) breakTile(c, r);
      }
    },
    onPoundLand(p) {
      LP.Audio.play('pound');
      g.shake(9);
      g.fx.dust(p.cx, p.bottom, 14, 0);
      g.fx.ring(p.cx, p.bottom, 'rgba(255,255,255,0.8)', 80, 0.3);
      const r = Math.floor((p.bottom + 4) / T);
      const c0 = Math.floor((p.x - 6) / T), c1 = Math.floor((p.x + p.w + 6) / T);
      let broke = false;
      for (let c = c0; c <= c1; c++) if (g.level.get(c, r) === TL.BREAK) { breakTile(c, r); broke = true; }
      if (broke) { p.onGround = false; p.pounding = true; p.poundHover = 0; }   // keep smashing down!
      for (const e of g.things) {
        if (e.enemy && !e.dying && Math.abs(e.cx - p.cx) < 90 && Math.abs(e.bottom - p.bottom) < 50) e.hurt(g, 'pound', p.cx);
        if (e instanceof Th.Cage && Math.abs(e.cx - p.cx) < 60 && Math.abs(e.bottom - p.bottom) < 70) e.hit(g);
      }
    },
    onDie(p, why) {
      g.deaths++;
      g.shake(8);
    },
    respawn() {
      const p = g.player;
      const scream = p.scream;
      p.reset(g.checkpoint.x, g.checkpoint.y);
      p.scream = scream;
      p.hearts = LP.MOVE.hearts; p.invuln = 1.4;
      g.things = g.things.filter((t) => !t.shot);
      if (g.chaser) g.chaser.reset(Math.min(g.chaser.x, g.checkpoint.x - 650));
      g.fx.sparkle(p.cx, p.y + 20, 16, '#bfe8ff');
      LP.Audio.play('pop');
    },
    bossDefeated(b) {
      if (b instanceof Th.Whiskers) {
        g.add(new Th.Bobo(b.cx, b.y + 40));
      } else {
        const fx = Math.round(g.level.pw / 2 / T) * T, floor = 15 * T;
        g.add(new Th.Finish(fx, floor));
        g.add(new Th.Golden(fx - T * 3, floor - T * 2));
      }
      LP.Audio.music('');
    },
    finishLevel() {
      if (g.finished) return;
      g.finished = true; g.finishT = 0;
      const p = g.player;
      p.state = 'win'; p.stateT = 0;
      LP.Audio.play('win');
      LP.Audio.music('');
      g.fx.confetti(p.cx, p.y, 70);
      // save how well you did
      const rec = LP.Save.lvl(g.def.id);
      const firstTime = !rec.done;
      rec.done = true;
      rec.milk = Math.max(rec.milk, g.milk);
      g.ducksFound.forEach((d, i) => { if (d) rec.ducks[i] = true; });
      g.medal = medalFor(g.milk, g.totalMilk);
      rec.medal = Math.max(rec.medal, g.medal);
      LP.Save.write();
      g.firstTime = firstTime;
    },
  });

  function medalFor(milk, total) {
    if (total <= 0) return 3;
    const k = milk / total;
    return k >= 0.9 ? 3 : k >= 0.65 ? 2 : k >= 0.35 ? 1 : 0;
  }

  // =================== drawing ===================
  function render(dt) {
    const s = g.scale, W = g.viewW, c = g.cam;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    const shx = g.shakeAmt > 0.3 ? U.rand(-1, 1) * g.shakeAmt : 0, shy = g.shakeAmt > 0.3 ? U.rand(-1, 1) * g.shakeAmt : 0;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    LP.BG.drawBack(ctx, c, W, g.time, g.level);
    const ox = Math.round((c.x + shx) * s) / s, oy = Math.round((c.y + shy) * s) / s;
    ctx.setTransform(s, 0, 0, s, -ox * s, -oy * s);
    if (g.def.boss === 'whiskers') LP.Art.clockTower(ctx, g.level.pw / 2, 15 * T, g.time);
    LP.Terrain.draw(ctx, { x: ox, y: oy }, W, VH);
    const vis = (t) => t.x + t.w > ox - 200 && t.x < ox + W + 200;
    // scenery first, then things to pick up, then enemies
    for (const t of g.things) if (vis(t) && !t.enemy && !t.shot && !t.pickup && !t.dying && !(t instanceof Th.Golden) && !(t instanceof Th.Heart)) t.draw(ctx, g);
    for (const t of g.things) if (vis(t) && (t.pickup || t instanceof Th.Golden || t instanceof Th.Heart)) t.draw(ctx, g);
    for (const t of g.things) if (vis(t) && (t.enemy || t.dying)) t.draw(ctx, g);
    if (g.boss) g.boss.draw(ctx, g);
    drawPlayer();
    for (const t of g.things) if (vis(t) && t.shot) t.draw(ctx, g);
    LP.Terrain.drawWater(ctx, { x: ox, y: oy }, W, g.time);
    g.fx.draw(ctx);
    if (g.chaser) g.chaser.draw(ctx, g);
    if (g.sign) LP.HUD.signBubble(ctx, g.sign, g);
    ctx.setTransform(s, 0, 0, s, 0, 0);
    LP.BG.drawFront(ctx, c, W, g.time, dt, g.level);
    LP.HUD.draw(ctx, g, W, dt);
  }

  function drawPlayer() {
    const p = g.player;
    if (p.invuln > 0 && p.state === 'play' && Math.floor(p.invuln * 14) % 2) return;
    // a soft shadow under Plut
    if (p.onGround) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.beginPath(); ctx.ellipse(p.cx, p.bottom - 1, 16, 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    LP.Art.plut(ctx, p.cx, p.bottom + (p.crawling ? 0 : 2), {
      anim: p.anim, animT: p.animT, facing: p.facing, sx: p.sx, sy: p.sy, runPhase: p.runPhase,
      combo: p.combo, time: g.time, idleT: p.idleT,
    });
  }

  g.init = init; g.startLevel = startLevel; g.render = render;
  return g;
})();

window.addEventListener('load', () => LP.game.init());
