// ============================================================
//  LIL' PLUT ODYSSEY — ENEMIES, THINGS AND BOSSES
//  Every letter in a level map (that isn't ground) becomes one
//  of these. Each has update() (its brain) and draw() (its look).
// ============================================================
window.LP = window.LP || {};

LP.Things = (function () {
  const T = LP.T, U = LP.U, A = LP.Art;

  // ---------------- base ----------------
  class Thing {
    constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; this.dead = false; this.t = Math.random() * 10; }
    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }
    get bottom() { return this.y + this.h; }
    update(dt) { this.t += dt; }
    draw() {}
  }

  // ================= THINGS TO PICK UP =================
  class Milk extends Thing {
    constructor(x, y, value, kind) {
      const big = value > 1;
      super(x - 10, y - 12, 20, 24);
      this.value = value; this.kind = kind || (big ? 'bottle' : 'drop');
      if (big) { this.x = x - 14; this.y = y - 20; this.w = 28; this.h = 40; }
      this.pickup = true;
    }
    update(dt, g) {
      this.t += dt;
      const p = g.player;
      if (this.vx !== undefined) {
        // popped out of an enemy: fly around and fall
        this.vy += 1500 * dt;
        LP.Level.move(this, g.level, dt);
        if (this.onGround) { this.vx *= 0.6; this.vy = -Math.abs(this.landVy || 0) * 0.4; if (Math.abs(this.vy) < 60) this.vy = 0; }
        this.life -= dt;
        if (this.life < 0) this.dead = true;
      }
      // magnet: milk near Plut flies to him
      const d = U.dist(this.cx, this.cy, p.cx, p.y + p.h / 2);
      const reach = this.vx !== undefined ? 140 : 56;
      if (p.state === 'play' && d < reach) {
        const k = Math.min(1, dt * 14);
        this.x += (p.cx - this.cx) * k; this.y += (p.y + p.h / 2 - this.cy) * k;
      }
      if (p.state === 'play' && d < 30) { this.dead = true; g.collectMilk(this); }
    }
    draw(c, g) {
      if (this.kind === 'bottle') A.bottle(c, this.cx, this.cy, g.time, false);
      else {
        if (this.life !== undefined && this.life < 1.5 && Math.floor(this.life * 10) % 2) return;
        A.milk(c, this.cx, this.cy, g.time, g.chocT > 0);
      }
    }
  }

  class Golden extends Thing {
    constructor(x, y) { super(x - 16, y - 20, 32, 40); }
    update(dt, g) {
      this.t += dt;
      if (g.player.state === 'play' && U.overlap(this, g.player)) { this.dead = true; g.goldenBottle(this); }
    }
    draw(c, g) { A.bottle(c, this.cx, this.cy, g.time, true); }
  }

  class Heart extends Thing {
    constructor(x, y) { super(x - 14, y - 14, 28, 28); }
    update(dt, g) {
      this.t += dt;
      const p = g.player;
      if (p.state === 'play' && U.overlap(this, p)) {
        this.dead = true;
        p.hearts = Math.min(LP.MOVE.hearts, p.hearts + 1);
        LP.Audio.play('heart'); g.fx.sparkle(this.cx, this.cy, 12, '#ff6a8a'); g.fx.text(this.cx, this.y, '+1 ♥', '#ff8aa0');
      }
    }
    draw(c, g) { A.heart(c, this.cx, this.cy + Math.sin(g.time * 3) * 3, g.time, 1.3); }
  }

  // ================= CAGED DUCKS =================
  class Cage extends Thing {
    constructor(x, y, index) { super(x - 24, y - 60, 48, 60); this.index = index; this.solidHit = true; }
    hit(g) {
      if (this.dead) return;
      this.dead = true;
      g.fx.bits(this.cx, this.cy, 14, ['#c8962e', '#e8b040', '#ffd23f']);
      g.fx.sparkle(this.cx, this.cy, 20, '#fff6a0');
      g.shake(6);
      g.add(new FreeDuck(this.cx, this.cy));
      g.freeDuck(this.index, this.cx, this.y);
    }
    draw(c, g) {
      if (g.save.levelDucks(g.levelIndex)[this.index]) c.globalAlpha = 0.55;   // already saved before: see-through
      A.cage(c, this.cx, this.bottom, g.time + this.index);
      c.globalAlpha = 1;
    }
  }
  class FreeDuck extends Thing {
    constructor(x, y) { super(x, y, 0, 0); this.vy = -500; this.life = 1.6; }
    update(dt) { this.t += dt; this.vy += 500 * dt; this.y += this.vy * dt; this.life -= dt; if (this.life < 0) this.dead = true; }
    draw(c) { c.globalAlpha = Math.min(1, this.life * 2); A.duck(c, this.x, this.y, 1.5, Math.sin(this.t * 12) * 0.3, this.t); c.globalAlpha = 1; }
  }

  // ================= LEVEL STUFF =================
  class Checkpoint extends Thing {
    constructor(x, y) { super(x - 20, y - 100, 40, 100); this.on = false; }
    update(dt, g) {
      this.t += dt;
      const p = g.player;
      if (!this.on && p.state === 'play' && U.overlap(this, p)) {
        this.on = true;
        g.setCheckpoint(this.cx, this.bottom);
        LP.Audio.play('checkpoint');
        g.fx.sparkle(this.cx, this.y + 16, 24, '#9fe8ff');
        g.fx.text(this.cx, this.y - 10, 'CHECKPOINT!', '#9fe8ff', 26);
        if (p.hearts < LP.MOVE.hearts) { p.hearts = LP.MOVE.hearts; g.fx.text(this.cx, this.y + 20, 'hearts filled!', '#ff8aa0', 18); }
      }
    }
    draw(c, g) { A.checkpoint(c, this.cx, this.bottom, this.on, g.time); }
  }

  class Finish extends Thing {
    constructor(x, y) { super(x - 40, y - 140, 80, 140); this.done = false; }
    update(dt, g) {
      this.t += dt;
      const p = g.player;
      if (!this.done && p.state === 'play' && U.overlap(this, p)) { this.done = true; g.finishLevel(this); }
    }
    draw(c, g) { A.finish(c, this.cx, this.bottom, g.time, this.done); }
  }

  class Sign extends Thing {
    constructor(x, y, text) { super(x - 24, y - 70, 48, 70); this.text = text; }
    update(dt, g) {
      this.t += dt;
      const p = g.player;
      if (Math.abs(p.cx - this.cx) < 130 && Math.abs(p.bottom - this.bottom) < 120) g.showSign(this);
    }
    draw(c) { A.sign(c, this.cx, this.bottom); }
  }

  class Spring extends Thing {
    constructor(x, y) { super(x - 26, y - 30, 52, 30); this.sq = 0; }
    update(dt, g) {
      this.t += dt; this.sq = Math.max(0, this.sq - dt * 4);
      const p = g.player;
      if (p.state !== 'play' || p.vy < 0) return;
      if (p.x + p.w > this.x + 4 && p.x < this.x + this.w - 4 && p.bottom >= this.y && p.bottom <= this.y + 22) {
        p.y = this.y - p.h;
        p.doJump(LP.MOVE.spring, true);
        this.sq = 1;
        LP.Audio.play('spring');
        g.fx.sparkle(this.cx, this.y, 8, '#fff');
      }
    }
    draw(c, g) { A.spring(c, g.theme.key, this.cx, this.bottom, this.sq); }
  }

  class Fan extends Thing {
    constructor(x, y, level) {
      super(x - 30, y - 20, 60, 20);
      // the air goes up until it hits the ground, at most 8 tiles
      const tx = Math.floor(x / T); let ty = Math.floor((y - 1) / T) - 1, n = 0;
      while (n < 8 && ty >= 0 && !level.solid(tx, ty)) { ty--; n++; }
      this.top = (ty + 1) * T;
      this.air = { x: x - 34, y: this.top, w: 68, h: y - this.top };
    }
    wind(px, py) {
      if (px < this.air.x || px > this.air.x + this.air.w || py < this.air.y - 30 || py > this.air.y + this.air.h) return 0;
      return py < this.air.y + 40 ? 0.5 : 1;
    }
    draw(c, g) {
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2.5; c.lineCap = 'round';
      const h = this.air.h;
      for (let i = 0; i < 7; i++) {
        const k = ((g.time * 1.4 + i / 7) % 1);
        const yy = this.bottom - 20 - k * h, xx = this.cx - 26 + (i * 9) + Math.sin(g.time * 6 + i) * 5;
        c.globalAlpha = Math.sin(k * Math.PI) * 0.9;
        c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy - 26); c.stroke();
      }
      c.globalAlpha = 1;
      A.fan(c, g.theme.key, this.cx, this.bottom, g.time);
    }
  }

  class Platform extends Thing {
    constructor(x, y, vertical) {
      super(x - T, y, T * 3, 16);
      this.x0 = this.x; this.y0 = this.y; this.vertical = vertical;
      this.dx = 0; this.dy = 0; this.phase = (x / T) * 0.37;
      this.isPlatform = true;
    }
    move(dt, g) {
      const k = Math.sin(g.time * (Math.PI * 2 / 4.5) + this.phase);
      const nx = this.vertical ? this.x0 : this.x0 + k * T * 3;
      const ny = this.vertical ? this.y0 + k * T * 2.5 : this.y0;
      this.dx = nx - this.x; this.dy = ny - this.y; this.x = nx; this.y = ny;
    }
    draw(c, g) { A.platform(c, g.theme.key, this.x, this.y, this.w, g.time); }
  }

  // crumbly block: shakes when you stand on it, falls, and comes back later
  class Crumble extends Thing {
    constructor(x, y) {
      super(x, y, T, T);
      this.x0 = x; this.y0 = y; this.dx = 0; this.dy = 0;
      this.isPlatform = true; this.state = 'idle'; this.timer = 0; this.fall = 0; this.vy = 0;
    }
    move(dt, g) {
      this.dx = 0; this.dy = 0;
      const p = g.player;
      if (this.state === 'idle') {
        if (p.platform === this && p.state === 'play') { this.state = 'shake'; this.timer = 0; LP.Audio.play('crack'); }
      } else if (this.state === 'shake') {
        this.timer += dt;
        if (this.timer > 0.5) {
          this.state = 'fall'; this.timer = 0; this.vy = 0; this.fall = 0; this.y = -99999;
          g.fx.bits(this.x0 + T / 2, this.y0 + T / 2, 6, LP.Art.crumbleColors(g.theme.key));
          LP.Audio.play('break');
        }
      } else {
        this.timer += dt; this.vy += 1800 * dt; this.fall += this.vy * dt;
        if (this.timer > 3.2 && !U.overlap({ x: this.x0, y: this.y0, w: T, h: T }, p)) {
          this.state = 'idle'; this.y = this.y0; this.fall = 0;
          g.fx.sparkle(this.x0 + T / 2, this.y0 + T / 2, 8, '#ffffff');
        }
      }
    }
    draw(c, g) {
      if (this.state === 'fall') {
        if (this.fall < 700) { c.globalAlpha = Math.max(0, 1 - this.fall / 700); A.crumble(c, g.theme.key, this.x0, this.y0 + this.fall, 1); c.globalAlpha = 1; }
        return;
      }
      const shake = this.state === 'shake' ? Math.sin(g.time * 90) * 3 : 0;
      A.crumble(c, g.theme.key, this.x0 + shake, this.y0, this.state === 'shake' ? this.timer / 0.5 : 0);
    }
  }

  // soap bubble: land on it to bounce up, then it pops (and comes back)
  class Bubble extends Thing {
    constructor(x, y) { super(x - 22, y - 22, 44, 44); this.y0 = y - 22; this.popT = 0; }
    update(dt, g) {
      this.t += dt;
      if (this.popT > 0) { this.popT -= dt; return; }
      this.y = this.y0 + Math.sin(this.t * 2) * 6;
      const p = g.player;
      if (p.state !== 'play' || p.vy < 0) return;
      if (p.x + p.w > this.x + 4 && p.x < this.x + this.w - 4 && p.bottom >= this.y && p.bottom <= this.y + 26) {
        p.y = this.y - p.h;
        p.doJump(1100, true);
        this.popT = 2.5;
        LP.Audio.play('bubblePop');
        g.fx.sparkle(this.cx, this.cy, 14, '#d8f4ff');
        g.fx.ring(this.cx, this.cy, 'rgba(220,240,255,0.9)', 40, 0.3);
      }
    }
    draw(c, g) {
      if (this.popT > 0) { if (this.popT < 0.4) { c.globalAlpha = 1 - this.popT / 0.4; A.bubble(c, this.cx, this.y0 + 22, g.time, 1 - this.popT / 0.4); c.globalAlpha = 1; } return; }
      A.bubble(c, this.cx, this.cy, g.time, 1);
    }
  }

  // ================= ENEMIES =================
  class Enemy extends Thing {
    constructor(x, y, w, h) {
      super(x, y, w, h); this.enemy = true; this.vx = 0; this.vy = 0; this.facing = -1; this.stun = 0; this.hp = 1; this.flying = false;
    }
    // hit by a slap, a stomp, a scream or a flying shot
    hurt(g, how, fromX) {
      if (this.dying) return;
      this.hp -= how === 'scream' ? 99 : 1;
      if (this.hp > 0) { this.stun = 0.4; g.fx.stars(this.cx, this.y, 3); return; }
      this.dying = true; this.enemy = false;
      this.vx = (this.cx < fromX ? -1 : 1) * 320; this.vy = -560; this.spin = 0;
      g.fx.poof(this.cx, this.cy);
      g.shake(4);
      LP.Audio.play('pop');
      g.combo(this.cx, this.y);
      for (let i = 0; i < 3; i++) {
        const m = new Milk(this.cx, this.cy, 1);
        m.vx = U.rand(-160, 160); m.vy = U.rand(-520, -300); m.life = 5;
        g.add(m);
      }
    }
    update(dt, g) {
      this.t += dt;
      if (this.dying) {
        this.vy += 1800 * dt; this.x += this.vx * dt; this.y += this.vy * dt; this.spin += dt * 14;
        if (this.y > g.level.ph + 200 || this.t > 30) this.dead = true;
        return true;
      }
      if (this.stun > 0) { this.stun -= dt; return true; }
      return false;
    }
    drawWrap(c, g, fn) {
      c.save();
      if (this.dying) { c.translate(this.cx, this.cy); c.rotate(this.spin); c.scale(1, -1); c.translate(-this.cx, -this.cy); }
      fn();
      c.restore();
      if (this.stun > 0 && !this.dying) A.stunStars(c, this.cx, this.y - 6, g.time);
    }
  }

  class Walker extends Enemy {
    constructor(x, y) { super(x + 6, y + T - 40, 36, 40); this.speed = 70; this.facing = -1; }
    update(dt, g) {
      if (super.update(dt, g)) return;
      this.vx = this.facing * this.speed;
      this.vy = Math.min(this.vy + 2500 * dt, 900);
      LP.Level.move(this, g.level, dt, g.platforms);
      // turn around at walls and at the edge of the ground
      const frontX = this.facing > 0 ? this.x + this.w + 2 : this.x - 2;
      const below = Math.floor((this.bottom + 4) / T);
      const ground = g.level.get(Math.floor(frontX / T), below);
      if (this.hitWallL || this.hitWallR || (this.onGround && ground !== LP.TILE.SOLID && ground !== LP.TILE.ONEWAY && ground !== LP.TILE.BREAK)) this.facing *= -1;
      if (LP.Level.touches(this, g.level, LP.TILE.SPIKE, 4)) this.facing *= -1;
    }
    draw(c, g) { this.drawWrap(c, g, () => A.walker(c, g.theme.key, this.cx, this.bottom, this.facing, this.stun > 0 ? 0 : this.t)); }
  }

  class Flyer extends Enemy {
    constructor(x, y) { super(x + 7, y + 10, 34, 28); this.x0 = this.x; this.y0 = this.y; this.flying = true; }
    update(dt, g) {
      if (super.update(dt, g)) return;
      const nx = this.x0 + Math.sin(this.t * 0.9) * T * 2.5;
      this.facing = nx > this.x ? 1 : -1;
      this.x = nx; this.y = this.y0 + Math.sin(this.t * 2.4) * 18;
    }
    draw(c, g) { this.drawWrap(c, g, () => A.flyer(c, g.theme.key, this.cx, this.cy, this.facing, this.t)); }
  }

  class Hopper extends Enemy {
    constructor(x, y) { super(x + 7, y + T - 34, 34, 34); this.wait = U.rand(0.5, 1.5); this.crouch = 0; }
    update(dt, g) {
      if (super.update(dt, g)) return;
      const p = g.player;
      if (this.onGround) {
        this.vx = 0;
        this.wait -= dt;
        if (this.wait < 0.25) this.crouch = 1;
        if (this.wait <= 0) {
          const near = Math.abs(p.cx - this.cx) < 500;
          this.facing = near ? (p.cx < this.cx ? -1 : 1) : -this.facing;
          this.vy = -780; this.vx = this.facing * 170; this.wait = U.rand(0.9, 1.6); this.crouch = 0;
          this.onGround = false;
          if (U.dist(p.cx, p.cy, this.cx, this.cy) < 700) LP.Audio.play('hop');
        }
      }
      this.vy = Math.min(this.vy + 2200 * dt, 900);
      LP.Level.move(this, g.level, dt, g.platforms);
      if (this.hitWallL || this.hitWallR) this.vx = -this.vx;
    }
    draw(c, g) { this.drawWrap(c, g, () => A.hopper(c, g.theme.key, this.cx, this.bottom, this.facing, this.t, this.crouch && this.onGround)); }
  }

  class Spitter extends Enemy {
    constructor(x, y) { super(x + 7, y + T - 46, 34, 46); this.cool = U.rand(1, 2.5); this.charge = 0; }
    update(dt, g) {
      if (super.update(dt, g)) return;
      const p = g.player;
      this.facing = p.cx < this.cx ? -1 : 1;
      const inRange = Math.abs(p.cx - this.cx) < 620 && Math.abs(p.cy - this.cy) < 220 && p.state === 'play';
      this.cool -= dt;
      if (this.cool < 0.5 && inRange) this.charge = Math.min(1, this.charge + dt * 2);
      if (this.cool <= 0) {
        if (inRange) {
          const s = new Shot(this.cx + this.facing * 24, this.y + (g.theme.key === 'city' ? 18 : g.theme.key === 'house' ? 24 : 4), this.facing * 270, 0);
          g.add(s);
          LP.Audio.play('spit');
        }
        this.cool = 2.4; this.charge = 0;
      }
    }
    draw(c, g) { this.drawWrap(c, g, () => A.spitter(c, g.theme.key, this.cx, this.bottom, this.facing, this.t, this.charge)); }
  }

  class Shot extends Thing {
    constructor(x, y, vx, vy, gravity) { super(x - 9, y - 9, 18, 18); this.vx = vx; this.vy = vy; this.grav = gravity || 0; this.shot = true; this.back = false; this.life = 4; }
    update(dt, g) {
      this.t += dt; this.life -= dt;
      this.vy += this.grav * dt;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (this.life < 0 || g.level.solid(Math.floor(this.cx / T), Math.floor(this.cy / T))) {
        this.dead = true; g.fx.sparkle(this.cx, this.cy, 5, '#ffffff');
      }
      if (this.back) {
        // sent back by a slap: it hits enemies now!
        for (const e of g.things) if (e.enemy && !e.dying && U.overlap(this, e)) { e.hurt(g, 'shot', this.cx); this.dead = true; break; }
        if (g.boss && !this.dead && g.boss.canBeHit && U.overlap(this, g.boss.box())) { g.boss.hurt(g, this.cx); this.dead = true; }
      }
    }
    reflect(g) {
      this.back = true; this.vx = -this.vx * 1.6; this.vy = Math.min(this.vy, 0) - 60; this.grav = 0; this.life = 3;
      LP.Audio.play('reflect'); g.fx.sparkle(this.cx, this.cy, 10, '#ffd23f');
    }
    draw(c, g) { A.shot(c, g.theme.key, this.cx, this.cy, g.time, this.back); }
  }

  // ================= CHASERS (the screen chases you!) =================
  class Chaser extends Thing {
    constructor(kind, x, speed) { super(x, 0, 10, 10); this.kind = kind; this.speed = speed; this.wait = 2.2; }
    update(dt, g) {
      this.t += dt;
      const p = g.player;
      if (p.state !== 'play') return;
      if (this.wait > 0) { this.wait -= dt; return; }
      // gets faster if you're far ahead, so it's always exciting
      const gap = p.cx - this.x;
      const sp = this.speed + (gap > 700 ? (gap - 700) * 0.8 : 0);
      this.x += sp * dt;
      if (Math.random() < dt * 30) g.fx.add({ kind: 'dust', x: this.x + U.rand(0, 200), y: g.cam.y + U.rand(100, LP.VH), vx: -U.rand(200, 500), vy: 0, r: U.rand(3, 7), life: 0.5, color: 'rgba(255,255,255,0.6)' });
      if (gap < 70) { p.die(g, 'caught'); LP.Audio.play(this.kind === 'swan' ? 'honk' : this.kind === 'shadow' ? 'meow' : 'suck'); }
      if (Math.random() < dt * 0.4) LP.Audio.play(this.kind === 'swan' ? 'honk' : this.kind === 'shadow' ? 'growl' : 'vroom');
    }
    reset(x) { this.x = x; this.wait = 1.6; }
    draw(c, g) {
      const bottom = g.cam.y + LP.VH - 10;
      if (this.kind === 'swan') A.swan(c, this.x - 70, g.cam.y + LP.VH * 0.62 + Math.sin(this.t * 2) * 30, this.t);
      else if (this.kind === 'shadow') A.cat(c, this.x - 150, bottom, 1, this.t, { run: true, s: 2.3, shadow: true, hiss: Math.sin(this.t * 2) > 0 });
      else A.vacuum(c, this.x - 124, bottom, this.t);
      // a warning arrow when it's close but you can't see it
      if (this.x < g.cam.x && g.player.cx - this.x < 650) {
        const k = 1 - (g.player.cx - this.x) / 650;
        c.fillStyle = `rgba(255,60,60,${0.4 + 0.5 * k})`;
        c.beginPath(); const ax = g.cam.x + 14, ay = g.cam.y + LP.VH / 2;
        c.moveTo(ax, ay); c.lineTo(ax + 30, ay - 26); c.lineTo(ax + 30, ay + 26); c.fill();
      }
    }
  }

  // ================= BOSSES =================
  class Boss extends Thing {
    constructor(x, y, w, h, hp, name) {
      super(x, y, w, h); this.hp = hp; this.maxHp = hp; this.name = name;
      this.state = 'intro'; this.stateT = 0; this.facing = -1; this.vx = 0; this.vy = 0; this.hitCool = 0; this.flash = 0;
      this.boss = true;
    }
    box() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
    get canBeHit() { return this.state === 'dizzy' && this.hitCool <= 0; }
    go(s) { this.state = s; this.stateT = 0; }
    stunned(g) {
      if (this.state === 'dead' || this.state === 'intro') return;
      this.go('dizzy'); this.dizzyTime = 3; this.hitsThisDizzy = 0;
      g.fx.text(this.cx, this.y - 20, 'DIZZY!', '#ffe14a', 30);
    }
    hurt(g, fromX) {
      if (!this.canBeHit) return;
      this.hp--; this.hitCool = 0.35; this.flash = 0.25; this.hitsThisDizzy++;
      g.shake(10); g.fx.stars(this.cx, this.y + 20, 8); LP.Audio.play('bossHit');
      this.vx = (this.cx < fromX ? -1 : 1) * 200;
      if (this.hp <= 0) { this.die(g); return; }
      if (this.hitsThisDizzy >= 3) { this.go('angry'); g.fx.text(this.cx, this.y - 20, 'GRRR!', '#ff6a6a', 30); }
    }
    die(g) {
      this.go('dead'); this.vy = -700;
      g.shake(20); g.fx.confetti(this.cx, this.cy, 60); g.fx.poof(this.cx, this.cy);
      LP.Audio.play('bossDie');
      g.bossDefeated(this);
    }
    physics(dt, g) {
      this.vy = Math.min(this.vy + 2500 * dt, 1200);
      LP.Level.move(this, g.level, dt);
    }
    common(dt, g) {
      this.t += dt; this.stateT += dt; this.hitCool -= dt; this.flash -= dt;
      const p = g.player;
      if (this.state === 'intro') { this.facing = p.cx < this.cx ? -1 : 1; this.physics(dt, g); if (this.stateT > 2.2) this.next(g); return true; }
      if (this.state === 'dead') { this.vy += 1200 * dt; this.y += this.vy * dt; if (this.y > g.level.ph + 300) this.dead = true; return true; }
      if (this.state === 'dizzy') {
        this.vx *= 0.9; this.physics(dt, g);
        if (this.stateT > this.dizzyTime) this.next(g);
        return true;
      }
      if (this.state === 'angry') {
        // after being hit, jump away from Plut
        if (this.stateT < dt * 1.5) { this.vy = -900; this.vx = (this.cx < g.level.pw / 2 ? 1 : -1) * 420; }
        this.physics(dt, g);
        if (this.onGround && this.stateT > 0.3) { this.vx = 0; this.next(g); }
        return true;
      }
      // touching the boss hurts (unless he's dizzy)
      if (p.state === 'play' && U.overlap(p, this.hurtBox ? this.hurtBox() : this)) p.hurt(g, this.cx);
      return false;
    }
  }

  class Gnome extends Boss {
    constructor(x, y) { super(x - 40, y - 140, 80, 140, 6, 'THE GARDEN GNOME'); this.round = 0; this.swing = 0; }
    hurtBox() { return { x: this.x + 8, y: this.y + 30, w: this.w - 16, h: this.h - 30 }; }
    next(g) {
      this.round++; this.inAir = false;
      const angry = this.hp <= 3;
      if (this.round % 3 === 0) this.go('throw'); else this.go('hop');
      this.jumps = angry ? 2 : 1;
    }
    update(dt, g) {
      if (this.common(dt, g)) return;
      const p = g.player;
      this.facing = p.cx < this.cx ? -1 : 1;
      if (this.state === 'hop') {
        // big jump at Plut... then SLAM!
        if (this.stateT < dt * 1.5) { LP.Audio.play('gnomeJump'); }
        if (this.stateT < 0.5) { this.vx = 0; this.squash = Math.min(1, this.stateT * 2); }
        else if (this.onGround && !this.inAir) {
          this.inAir = true; this.squash = 0;
          this.vy = -1150; this.vx = U.clamp((p.cx - this.cx) * 1.1, -520, 520);
          this.onGround = false;
        }
        this.physics(dt, g);
        if (this.inAir && this.onGround) {
          this.inAir = false; this.vx = 0; this.squash = 1;
          g.shake(16); LP.Audio.play('slam');
          g.fx.dust(this.cx, this.bottom, 16, 0);
          for (const d of [-1, 1]) g.add(new Shockwave(this.cx, this.bottom, d));
          this.jumps--;
          if (this.jumps > 0) this.stateT = 0.2;
          else { this.go('stuck'); }
        }
      } else if (this.state === 'stuck') {
        // his beard got stuck in the ground! SLAP HIM NOW!
        this.squash = Math.max(0, this.squash - dt * 3);
        this.physics(dt, g);
        if (this.stateT > 0.25) { this.go('dizzy'); this.dizzyTime = 2.4; this.hitsThisDizzy = 0; g.fx.text(this.cx, this.y - 20, 'STUCK!', '#ffe14a', 30); }
      } else if (this.state === 'throw') {
        this.physics(dt, g);
        this.swing = Math.max(0, this.swing - dt * 4);
        const n = this.hp <= 3 ? 4 : 3;
        const k = Math.floor(this.stateT / 0.55);
        if (k > (this.thrown || 0) && k <= n) {
          this.thrown = k; this.swing = 1;
          const dx = p.cx - this.cx;
          const s = new Shot(this.cx, this.y + 20, U.clamp(dx * 0.9, -560, 560) + U.rand(-60, 60), -820, 1500);
          s.acorn = true; g.add(s); LP.Audio.play('throw');
        }
        if (this.stateT > n * 0.55 + 0.8) { this.thrown = 0; this.next(g); }
      }
    }
    draw(c, g) {
      if (this.flash > 0 && Math.floor(this.flash * 30) % 2) c.globalAlpha = 0.5;
      A.gnome(c, this.cx, this.bottom, this.facing, this.t, { walk: !this.onGround, squash: this.squash || 0, swing: this.swing, dizzy: this.state === 'dizzy' });
      c.globalAlpha = 1;
      if (this.state === 'dizzy') A.stunStars(c, this.cx + 6, this.y + 10, g.time);
    }
  }

  class Shockwave extends Thing {
    constructor(x, bottom, dir) { super(x - 16, bottom - 30, 32, 30); this.dir = dir; this.life = 1.6; this.shot = true; this.wave = true; }
    update(dt, g) {
      this.t += dt; this.life -= dt;
      this.x += this.dir * 460 * dt;
      if (this.life < 0 || g.level.solid(Math.floor((this.cx + this.dir * 16) / T), Math.floor((this.bottom - 10) / T))) this.dead = true;
      if (Math.random() < dt * 30) g.fx.dust(this.cx, this.bottom, 1, -this.dir);
    }
    draw(c) {
      c.fillStyle = 'rgba(160,110,60,0.9)';
      c.beginPath(); c.moveTo(this.x - 6, this.bottom); c.quadraticCurveTo(this.cx, this.y - 10 + Math.sin(this.t * 30) * 4, this.x + this.w + 6, this.bottom); c.fill();
      c.fillStyle = 'rgba(255,240,200,0.6)';
      c.beginPath(); c.moveTo(this.x + 2, this.bottom); c.quadraticCurveTo(this.cx, this.y + 4, this.x + this.w - 2, this.bottom); c.fill();
    }
  }

  class Whiskers extends Boss {
    constructor(x, y) { super(x - 55, y - 120, 110, 120, 9, 'MR. WHISKERS'); this.round = 0; this.claw = 0; this.crouch = 0; }
    hurtBox() { return { x: this.x + 10, y: this.y + 20, w: this.w - 20, h: this.h - 20 }; }
    next(g) {
      this.round++; this.inAir = false;
      const p = g.player;
      const close = Math.abs(p.cx - this.cx) < 180;
      if (close && this.round % 2 === 0) this.go('swipe');
      else if (this.round % 3 === 0) this.go('hairball');
      else { this.go('pounce'); this.pounces = this.hp <= 3 ? 3 : 2; }
    }
    update(dt, g) {
      if (this.common(dt, g)) return;
      const p = g.player;
      if (this.state !== 'pounce' || this.onGround) this.facing = p.cx < this.cx ? -1 : 1;
      this.claw = Math.max(0, this.claw - dt * 3);
      if (this.state === 'pounce') {
        const wait = this.hp <= 3 ? 0.4 : 0.6;
        if (!this.inAir) {
          this.crouch = Math.min(1, this.stateT / wait);
          if (this.stateT > wait) {
            this.inAir = true; this.crouch = 0;
            this.vy = -1050; this.vx = U.clamp((p.cx - this.cx) * 1.2, -620, 620);
            this.onGround = false; LP.Audio.play('meow');
          }
        }
        this.physics(dt, g);
        if (this.inAir && this.onGround) {
          this.inAir = false; this.vx = 0; g.shake(10); g.fx.dust(this.cx, this.bottom, 10, 0); LP.Audio.play('land', 1);
          this.pounces--;
          if (this.pounces > 0) this.stateT = 0;
          else { this.go('dizzy'); this.dizzyTime = this.hp <= 3 ? 1.8 : 2.4; this.hitsThisDizzy = 0; g.fx.text(this.cx, this.y - 20, 'TIRED!', '#ffe14a', 30); }
        }
      } else if (this.state === 'hairball') {
        this.physics(dt, g);
        const n = this.hp <= 6 ? 5 : 3;
        const k = Math.floor(this.stateT / 0.45);
        if (k > (this.spat || 0) && k <= n) {
          this.spat = k;
          const s = new Shot(this.cx + this.facing * 60, this.y + 10, this.facing * U.rand(260, 520), U.rand(-900, -500), 1600);
          s.hairball = true; g.add(s); LP.Audio.play('hairball');
        }
        if (this.stateT > n * 0.45 + 0.7) { this.spat = 0; this.next(g); }
      } else if (this.state === 'swipe') {
        this.physics(dt, g);
        if (this.stateT > 0.45 && this.stateT < 0.7) {
          this.claw = 1;
          const zone = { x: this.facing > 0 ? this.x + this.w - 10 : this.x - 80, y: this.y + 10, w: 90, h: 80 };
          if (p.state === 'play' && U.overlap(p, zone)) p.hurt(g, this.cx);
          if (this.stateT - dt <= 0.45) LP.Audio.play('swipe');
        }
        if (this.stateT > 1) this.next(g);
      }
    }
    draw(c, g) {
      if (this.flash > 0 && Math.floor(this.flash * 30) % 2) c.globalAlpha = 0.5;
      const sw = this.state === 'swipe' && this.stateT < 0.45;
      A.cat(c, this.cx - this.facing * 10, this.bottom, this.facing, this.t, { crouch: this.crouch, run: !this.onGround, claw: this.claw, hiss: sw || this.state === 'hairball', dizzy: this.state === 'dizzy', bobo: this.state !== 'dead' });
      c.globalAlpha = 1;
      if (this.state === 'dizzy') A.stunStars(c, this.cx + this.facing * 30, this.y - 10, g.time);
    }
  }

  class Bobo extends Thing {
    constructor(x, y) { super(x - 20, y - 60, 40, 60); this.vy = -600; }
    update(dt, g) {
      this.t += dt;
      this.vy = Math.min(this.vy + 1500 * dt, 800); LP.Level.move(this, g.level, dt);
      if (g.player.state === 'play' && U.overlap(this, g.player)) { this.dead = true; g.finishLevel(this); }
    }
    draw(c, g) {
      const gl = c.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, 70);
      gl.addColorStop(0, 'rgba(255,240,170,0.6)'); gl.addColorStop(1, 'rgba(255,240,170,0)');
      c.fillStyle = gl; c.fillRect(this.cx - 70, this.cy - 70, 140, 140);
      A.teddy(c, this.cx, this.bottom, 1.2, g.time);
    }
  }

  // ================= make things from the map letters =================
  function spawn(t, level, cageIndex) {
    const x = t.x, y = t.y;
    switch (t.ch) {
      case 'o': return new Milk(x + T / 2, y + T / 2, 1);
      case 'O': return new Milk(x + T / 2, y + T / 2, 5);
      case 'G': return new Golden(x + T / 2, y + T / 2);
      case 'H': return new Heart(x + T / 2, y + T / 2);
      case 'D': return new Cage(x + T / 2, y + T, cageIndex);
      case 'C': return new Checkpoint(x + T / 2, y + T);
      case 'F': return new Finish(x + T / 2, y + T);
      case '!': return new Sign(x + T / 2, y + T, t.text);
      case 'S': return new Spring(x + T / 2, y + T);
      case 'W': return new Fan(x + T / 2, y + T, level);
      case 'M': return new Platform(x + T / 2, y + T / 2, false);
      case 'V': return new Platform(x + T / 2, y + T / 2, true);
      case 'X': return new Crumble(x, y);
      case 'U': return new Bubble(x + T / 2, y + T / 2);
      case 'e': return new Walker(x, y);
      case 'f': return new Flyer(x, y);
      case 'j': return new Hopper(x, y);
      case 's': return new Spitter(x, y);
    }
    return null;
  }

  return { spawn, Crumble, Bubble, Milk, Golden, Heart, Cage, Checkpoint, Finish, Sign, Spring, Fan, Platform, Walker, Flyer, Hopper, Spitter, Shot, Chaser, Gnome, Whiskers, Bobo, Shockwave };
})();
