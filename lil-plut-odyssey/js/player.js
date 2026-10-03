// ============================================================
//  LIL' PLUT ODYSSEY — PLUT, the most annoying baby ever 👶
//  Run, jump, wall jump, glide with the blanket, slap,
//  ground pound, crawl, and the WAAAH! scream.
//  Try changing the numbers in MOVE to change how Plut feels!
// ============================================================
window.LP = window.LP || {};

LP.MOVE = {
  run: 300,          // walking speed
  sprint: 440,       // speed when holding Shift
  crawl: 150,        // crawling speed (through small holes)
  accel: 2600,       // how fast you speed up on the ground
  decel: 3200,       // how fast you stop
  airAccel: 1900,    // how well you can steer in the air
  gravity: 2500,
  jump: 930,         // jump power
  maxFall: 1000,
  glideFall: 95,     // how slowly you fall when gliding with the blanket
  wallSlide: 150,    // how slowly you slide down walls
  wallJumpX: 380, wallJumpY: 860,
  spring: 1450,      // bounce power of springs
  pound: 1300,       // ground pound speed
  stompBounce: 760,
  hearts: 3,
};

LP.Player = class {
  constructor(x, bottom) {
    this.w = 30; this.h = 52;
    this.reset(x, bottom);
    this.scream = 50;          // the WAAAH! meter (0 to 100). One scream costs 50.
    this.hearts = LP.MOVE.hearts;
  }

  reset(x, bottom) {
    this.x = x - this.w / 2; this.y = bottom - 52; this.h = 52;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = false; this.platform = null;
    this.coyote = 0; this.jumpBuf = 0; this.lockT = 0; this.lockDir = 0;
    this.gliding = false; this.wallSliding = false; this.wallSide = 0;
    this.pounding = false; this.poundHover = 0;
    this.crawling = false;
    this.atkT = 0; this.atkCd = 0; this.atkComboT = 0; this.combo = 0; this.attackId = 0; this.airSlaps = 0;
    this.screamT = 0;
    this.invuln = 0;
    this.state = 'play';       // 'play', 'bubble' (popped!), 'win' (dancing at the finish), 'still' (story)
    this.stateT = 0;
    this.springT = 0;
    this.sx = 1; this.sy = 1; this.svx = 0; this.svy = 0;   // squash and stretch
    this.anim = 'idle'; this.animT = 0; this.runPhase = 0; this.idleT = 0;
    this.stepT = 0; this.cornerNudge = 12;
    this.dropThrough = false;
  }

  get cx() { return this.x + this.w / 2; }
  get bottom() { return this.y + this.h; }

  squash(sx, sy) { this.sx = sx; this.sy = sy; this.svx = 0; this.svy = 0; }

  // where the slap hits right now (or null)
  attackBox() {
    if (this.atkT <= 0.11 || this.state !== 'play') return null;
    const big = this.combo === 2;
    const reach = big ? 70 : 58;
    const x = this.facing > 0 ? this.cx + 4 : this.cx - 4 - reach;
    return { x, y: this.y + (this.crawling ? -6 : 4), w: reach, h: this.crawling ? 40 : 44, big, id: this.attackId };
  }

  update(dt, g) {
    const M = LP.MOVE, I = LP.Input, U = LP.U;
    this.animT += dt; this.stateT += dt;
    this.invuln = Math.max(0, this.invuln - dt);

    // squash & stretch springs back to normal
    this.svx += ((1 - this.sx) * 400 - this.svx * 16) * dt; this.sx += this.svx * dt;
    this.svy += ((1 - this.sy) * 400 - this.svy * 16) * dt; this.sy += this.svy * dt;

    if (this.state === 'bubble') {
      // popped! float up in a bubble, then come back at the checkpoint
      this.y -= 70 * dt;
      this.anim = 'bubble';
      if (this.stateT > 1.5) g.respawn();
      return;
    }
    if (this.state === 'win' || this.state === 'still') {
      this.vx = U.approach(this.vx, 0, M.decel * dt);
      this.vy = Math.min(this.vy + M.gravity * dt, M.maxFall);
      LP.Level.move(this, g.level, dt, g.platforms);
      this.anim = this.state === 'win' ? 'win' : (this.onGround ? 'idle' : 'fall');
      return;
    }

    // ---------- buttons ----------
    let dir = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
    const jumpHeld = I.down('jump');
    if (I.take('jump')) this.jumpBuf = 0.13;
    else this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.lockT = Math.max(0, this.lockT - dt);
    if (this.lockT > 0) dir = this.lockDir;
    this.coyote = this.onGround ? 0.1 : Math.max(0, this.coyote - dt);
    this.atkT = Math.max(0, this.atkT - dt); this.atkCd = Math.max(0, this.atkCd - dt);
    this.atkComboT = Math.max(0, this.atkComboT - dt);
    this.screamT = Math.max(0, this.screamT - dt);
    this.springT = Math.max(0, this.springT - dt);

    // ---------- crawl (hold DOWN on the ground) ----------
    const wantCrawl = this.onGround && I.down('down') && !this.pounding;
    if (wantCrawl && !this.crawling) {
      this.crawling = true; this.y += this.h - 34; this.h = 34;
    } else if (!wantCrawl && this.crawling) {
      // only stand up if there's room above your head
      if (LP.Level.fits(this.x, this.y + this.h - 52, this.w, 52, g.level)) {
        this.crawling = false; this.y += this.h - 52; this.h = 52; this.squash(0.85, 1.15);
      }
    }
    // standing on a thin platform + DOWN + JUMP = drop through it
    this.dropThrough = I.down('down') && this.jumpBuf > 0 && this.onGround && this.onThin(g.level);

    // ---------- ground pound (DOWN in the air) ----------
    if (!this.onGround && I.take('down') && !this.pounding && this.screamT <= 0) {
      this.pounding = true; this.poundHover = 0.12; this.vx = 0; this.vy = 0; this.gliding = false;
      this.squash(1.2, 0.85);
      LP.Audio.play('poundStart');
    }
    if (this.onGround) I.take('down');

    // ---------- slap ----------
    if (I.take('attack') && this.atkCd <= 0) {
      this.combo = this.atkComboT > 0 ? (this.combo + 1) % 3 : 0;
      this.atkT = 0.26; this.atkCd = 0.15; this.atkComboT = 0.5; this.attackId++;
      if (dir) this.facing = dir;
      if (!this.onGround) {
        this.airSlaps++;
        if (this.airSlaps <= 3 && this.vy > 0) this.vy = Math.min(this.vy, 40);   // float a little while slapping in the air
      }
      if (this.onGround && !this.crawling) this.vx += this.facing * (this.combo === 2 ? 220 : 90);
      LP.Audio.play(this.combo === 2 ? 'bigSlap' : 'slap');
      this.squash(1.12, 0.92);
    }

    // ---------- WAAAH! scream ----------
    if (I.take('scream')) {
      if (this.scream >= 50 && this.screamT <= 0) {
        this.scream -= 50; this.screamT = 0.7;
        this.pounding = false;
        g.onScream(this);
        this.squash(1.3, 0.8);
      } else if (this.screamT <= 0) {
        LP.Audio.play('noScream');
        g.hudFlash('scream');
      }
    }
    const screaming = this.screamT > 0.3;

    // ---------- run left / right ----------
    let max = I.down('run') ? M.sprint : M.run;
    if (this.crawling) max = M.crawl;
    if (this.atkT > 0 && this.onGround) max *= 0.55;
    if (screaming || this.pounding) max = 0;
    const target = dir * max;
    let acc;
    if (this.onGround) acc = dir !== 0 && Math.sign(dir) === Math.sign(this.vx || dir) ? M.accel : M.decel;
    else acc = M.airAccel;
    if (this.lockT <= 0 || this.onGround) this.vx = U.approach(this.vx, target, acc * dt);
    if (dir && this.atkT <= 0 && this.lockT <= 0) this.facing = dir;

    // ---------- jumping ----------
    if (this.jumpBuf > 0 && !this.dropThrough && !this.pounding && !screaming) {
      if (this.coyote > 0 && !this.crawlingStuck(g.level)) {
        this.doJump(M.jump);
      } else if (!this.onGround && (this.wallL || this.wallR)) {
        // WALL JUMP: kick off the wall
        const side = this.wallL ? -1 : 1;
        this.vx = -side * M.wallJumpX; this.vy = -M.wallJumpY;
        this.lockT = 0.15; this.lockDir = -side; this.facing = -side;
        this.jumpBuf = 0; this.airSlaps = 0;
        this.squash(0.8, 1.25);
        LP.Audio.play('wallJump');
        g.fx.dust(side < 0 ? this.x : this.x + this.w, this.y + this.h * 0.6, 6, side * -1);
      }
    }

    // ---------- falling, gliding, wall sliding ----------
    this.wallSliding = false; this.gliding = false;
    if (this.pounding) {
      if (this.poundHover > 0) { this.poundHover -= dt; this.vy = 0; }
      else this.vy = M.pound;
    } else if (screaming && !this.onGround) {
      this.vy = Math.min(this.vy, 30);   // hover while screaming
      this.vx *= 0.9;
    } else {
      let grav = M.gravity;
      if (this.vy < 0 && !jumpHeld && this.springT <= 0) grav *= 2.3;     // let go of jump = small jump
      else if (Math.abs(this.vy) < 140 && jumpHeld) grav *= 0.55;         // floaty at the top of the jump
      this.vy = Math.min(this.vy + grav * dt, M.maxFall);

      const touchingWall = (this.wallL && dir < 0) || (this.wallR && dir > 0);
      if (!this.onGround && this.vy > 0 && touchingWall) {
        this.wallSliding = true; this.wallSide = this.wallL ? -1 : 1;
        this.vy = Math.min(this.vy, M.wallSlide);
        this.airSlaps = 0;
        if (Math.random() < dt * 20) g.fx.dust(this.wallSide < 0 ? this.x : this.x + this.w, this.y + 10, 1, -this.wallSide);
      } else if (!this.onGround && jumpHeld && this.vy > 0) {
        // GLIDE: spin the blanket like a helicopter!
        this.gliding = true;
        if (this.vy > M.glideFall) this.vy = U.approach(this.vy, M.glideFall, 5000 * dt);
      }
      // fans blow you up into the air (much more when you glide!)
      const wind = g.windAt(this.cx, this.y + this.h / 2);
      if (wind > 0 && !this.onGround) {
        if (this.gliding) this.vy = U.approach(this.vy, -420 * wind, 3200 * dt);
        else this.vy -= 1500 * wind * dt;
      }
    }

    // ---------- move! ----------
    const wasPounding = this.pounding;
    LP.Level.move(this, g.level, dt, g.platforms);

    if (this.justLanded) {
      const hard = this.landVy || 0;
      this.airSlaps = 0;
      if (wasPounding) {
        this.pounding = false;
        this.squash(1.45, 0.6);
        g.onPoundLand(this);
      } else if (hard > 300) {
        this.squash(1 + Math.min(hard, 1000) / 2500, 1 - Math.min(hard, 1000) / 3000);
        g.fx.dust(this.cx, this.bottom, hard > 700 ? 8 : 4, 0);
        LP.Audio.play('land', Math.min(1, hard / 1000));
      }
    }
    if (this.onGround) this.pounding = false;

    // ---------- dangerous stuff ----------
    if (LP.Level.touches(this, g.level, LP.TILE.WATER, 4)) { this.die(g, 'splash'); return; }
    if (this.y > g.level.ph + 60) { this.die(g, 'fall'); return; }
    const spike = LP.Level.touches(this, g.level, LP.TILE.SPIKE, 5);
    if (spike) { this.hurt(g, spike.tx * LP.T + LP.T / 2, true); }

    // ---------- footsteps ----------
    if (this.onGround && Math.abs(this.vx) > 120 && !this.crawling) {
      this.stepT -= dt * Math.abs(this.vx) / 300;
      if (this.stepT <= 0) {
        this.stepT = 0.26;
        LP.Audio.play('step');
        if (Math.abs(this.vx) > 360) g.fx.dust(this.cx - this.facing * 8, this.bottom, 1, -this.facing);
      }
    }

    // ---------- pick the animation ----------
    this.runPhase += Math.abs(this.vx) * dt * 0.045;
    let a;
    if (this.screamT > 0) a = 'scream';
    else if (this.pounding) a = 'pound';
    else if (this.atkT > 0) a = 'slap';
    else if (this.crawling) a = 'crawl';
    else if (!this.onGround) a = this.wallSliding ? 'wall' : this.gliding ? 'glide' : this.vy < 0 ? 'jump' : 'fall';
    else a = Math.abs(this.vx) > 20 ? 'run' : 'idle';
    if (a !== this.anim) { this.anim = a; this.animT = 0; }
    if (a === 'idle') this.idleT += dt; else this.idleT = 0;
    if (this.idleT > 4 && this.idleT - dt <= 4) LP.Audio.play('raspberry');   // pfffbt! (annoying)
  }

  onThin(level) {
    const r = Math.floor((this.y + this.h + 2) / LP.T);
    const c0 = Math.floor((this.x + 1) / LP.T), c1 = Math.floor((this.x + this.w - 1) / LP.T);
    let thin = false;
    for (let c = c0; c <= c1; c++) {
      const t = level.get(c, r);
      if (t === LP.TILE.SOLID || t === LP.TILE.BREAK) return false;
      if (t === LP.TILE.ONEWAY) thin = true;
    }
    return thin;
  }

  crawlingStuck(level) {
    // can't jump in a tiny tunnel
    return this.crawling && !LP.Level.fits(this.x, this.y + this.h - 52, this.w, 52, level);
  }

  doJump(power, fromSpring) {
    if (this.crawling) { this.crawling = false; this.y += this.h - 52; this.h = 52; }
    this.vy = -power;
    this.onGround = false; this.coyote = 0; this.jumpBuf = 0; this.platform = null;
    this.squash(0.75, 1.3);
    if (fromSpring) { this.springT = 0.35; this.pounding = false; }
    else {
      LP.Audio.play('jump');
      if (LP.game) LP.game.fx.dust(this.cx, this.bottom, 3, 0);
    }
  }

  bounce(power) {
    // bounced off an enemy's head
    this.vy = -(LP.Input.down('jump') ? power * 1.2 : power);
    this.springT = 0.2; this.pounding = false; this.airSlaps = 0;
    this.squash(0.8, 1.2);
  }

  hurt(g, fromX, spikes) {
    if (this.invuln > 0 || this.state !== 'play') return;
    this.hearts--;
    this.invuln = 1.6;
    const away = this.cx < fromX ? -1 : 1;
    this.vx = away * 320; this.vy = spikes ? -720 : -540;
    this.lockT = 0.25; this.lockDir = away;
    this.pounding = false;
    this.squash(1.3, 0.75);
    LP.Audio.play('cry');
    g.shake(10);
    g.fx.stars(this.cx, this.y + 10, 6);
    if (this.hearts <= 0) this.die(g, 'hurt');
  }

  die(g, why) {
    if (this.state !== 'play') return;
    this.state = 'bubble'; this.stateT = 0;
    this.vx = this.vy = 0; this.crawling = false; this.h = 52;
    if (why === 'fall' || why === 'splash') {
      // you fell! the bubble comes from where you fell in
      this.y = Math.min(this.y, g.level.ph - 140);
    }
    if (why === 'splash') g.fx.splash(this.cx, this.y + 40);
    LP.Audio.play('bubble');
    g.onDie(this, why);
  }
};
