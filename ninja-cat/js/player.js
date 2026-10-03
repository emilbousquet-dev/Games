// ============================================================
//  NINJA CAT — THE CATS
//  Running, jumping, double jumps, wall climbing, katana,
//  shuriken, smoke bombs, ground pounds... and the camera.
//  Want a cat that jumps higher? Change the numbers in MOVE!
// ============================================================
window.NC = window.NC || {};

(function () {
  const U = NC.U;

  const MOVE = {
    run: 7.5,          // running speed (meters per second)
    accel: 60,         // how fast you speed up on the ground
    airAccel: 24,      // ... and in the air
    gravity: 28,
    jump: 10.5,        // jump power
    doubleJump: 9.6,   // double jump power
    climb: 5.6,        // climbing speed
    climbTime: 1.5,    // how long you can climb before you slide down
    wallJumpOut: 7.5,
    wallJumpUp: 10.5,
    pound: -26,        // ground pound speed
    drum: 21,          // taiko drum bounce
    superJump: 17,     // jump off your friend's head
    radius: 0.32,
    height: 1.0,
    step: 0.45,        // small steps you walk up without jumping
  };
  NC.MOVE = MOVE;

  class Player {
    constructor(game, index, kind) {
      this.game = game;
      this.index = index;
      this.kind = kind;
      this.name = NC.Models.CATS[kind].name;
      this.mesh = NC.Models.cat(kind);
      this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: NC.Tex.blob(), transparent: true, depthWrite: false }));
      this.shadow.rotation.x = -Math.PI / 2;
      this.cam = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
      this.pos = new THREE.Vector3();
      this.vel = new THREE.Vector3();
      this.camPos = new THREE.Vector3();
      this.camLook = new THREE.Vector3();
      this.reset();
    }

    // fresh cat at the start of a level
    reset() {
      const sv = this.game.save;
      const up = sv.upgrades;
      this.maxHearts = 3 + (up.heart ? 1 : 0);
      this.hearts = this.maxHearts;
      this.starMax = 15 + up.bag * 10;
      this.stars = 8;
      this.smokes = 2;
      this.smokeTime = 4 + up.smoke * 2;
      this.yaw = Math.PI / 2;
      this.camYaw = Math.PI / 2;
      this.camPitch = 0.38;
      this.camIdle = 0;
      this.onGround = false; this.groundBox = null; this.onCat = null;
      this.jumpsLeft = 1; this.coyote = 0; this.jumpBuffer = 0;
      this.climbing = null; this.climbStamina = MOVE.climbTime; this.climbSound = 0;
      this.flipT = 0; this.slashT = 0; this.combo = 0; this.comboWindow = 0; this.spinT = 0; this.pounding = 0; this.throwT = 0; this.starCD = 0;
      this.invisT = 0; this.invulnT = 0; this.hurtT = 0; this.tauntT = 0; this.bufferedSlash = false;
      this.dead = false; this.respawnT = 0;
      this.safe = []; this.safeT = 0;
      this.animT = Math.random() * 10; this.phase = 0;
      this.vel.set(0, 0, 0);
      const eq = sv.equip[this.kind] || {};
      NC.Models.setHat(this.mesh, eq.hat || 'none');
      NC.Models.setSword(this.mesh, eq.sword || 'silver');
      NC.Models.setCatLook(this.mesh, 1, 0);
      this.mesh.visible = true;
    }

    placeAt(p, offset = 0) {
      this.pos.set(p.x + offset * 0.4, p.y + 0.05, p.z + offset * 1.2);
      this.vel.set(0, 0, 0);
      this.snapCamera();
    }

    get world() { return this.game.world; }
    get alive() { return !this.dead; }
    get visibleToEnemies() { return !this.dead && this.invisT <= 0; }
    get chest() { return { x: this.pos.x, y: this.pos.y + 0.6, z: this.pos.z }; }

    // ---------------------------------------------------------------
    update(dt, inp) {
      this.animT += dt;
      if (this.dead) {
        this.respawnT -= dt;
        if (this.respawnT <= 0) this.game.respawn(this);
        this.updateCamera(dt, inp);
        return;
      }
      const W = this.world, M = MOVE;
      // timers
      this.invisT = Math.max(0, this.invisT - dt);
      this.invulnT = Math.max(0, this.invulnT - dt);
      this.hurtT = Math.max(0, this.hurtT - dt);
      this.flipT = Math.max(0, this.flipT - dt);
      this.throwT = Math.max(0, this.throwT - dt);
      this.starCD = Math.max(0, this.starCD - dt);
      this.coyote = Math.max(0, this.coyote - dt);
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      if (this.slashT > 0) {
        this.slashT -= dt;
        if (this.slashT <= 0) {
          this.comboWindow = 0.5;
          // you pressed the katana again during the swing: do the next hit right away
          if (this.bufferedSlash) { this.bufferedSlash = false; this.attack(); }
        }
      }
      else this.comboWindow = Math.max(0, this.comboWindow - dt);
      if (this.spinT > 0) this.spinT -= dt;

      // ----- camera turning -----
      this.camYaw -= inp.camDX + inp.camX * 2.4 * dt;
      this.camPitch = U.clamp(this.camPitch + inp.camDY, -0.15, 1.15);
      if (Math.abs(inp.camDX) + Math.abs(inp.camX) + Math.abs(inp.camDY) > 0.001) this.camIdle = 0; else this.camIdle += dt;

      // ----- which way do I want to go? (relative to the camera) -----
      const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
      let wx = fx * inp.y - fz * inp.x, wz = fz * inp.y + fx * inp.x;
      const mag = Math.min(1, Math.hypot(wx, wz));
      const n2 = Math.hypot(wx, wz) || 1; wx /= n2; wz /= n2;

      if (inp.jumpPressed) { this.jumpBuffer = 0.14; this.tauntT = 0; }
      if (mag > 0.1) this.tauntT = 0;
      if (inp.tauntPressed && this.onGround && mag < 0.1) { this.tauntT = 2.2; NC.Audio.play('mrrp', this.sfxAt()); }
      if (this.tauntT > 0) this.tauntT -= dt;

      // ----- climbing a wall -----
      if (this.climbing) {
        const c = this.climbing;
        const toward = mag > 0.1 ? -(wx * c.nx + wz * c.nz) : 0;
        if (this.jumpBuffer > 0) {
          // WALL JUMP!
          this.jumpBuffer = 0;
          this.climbing = null;
          this.vel.set(c.nx * M.wallJumpOut, M.wallJumpUp, c.nz * M.wallJumpOut);
          this.yaw = Math.atan2(c.nx, c.nz);
          this.jumpsLeft = 1;
          this.climbStamina = M.climbTime;
          NC.Audio.play('wallJump', this.sfxAt());
          NC.FX.burst(this.pos.x - c.nx * 0.3, this.pos.y + 0.5, this.pos.z - c.nz * 0.3, { n: 10, color: 0xffffff, speed: 3, size: 0.2 });
        } else {
          if (toward > 0.2 && this.climbStamina > 0) {
            this.vel.y = M.climb;
            this.climbStamina -= dt;
            this.climbSound -= dt;
            if (this.climbSound <= 0) { this.climbSound = 0.14; NC.Audio.play('climb', this.sfxAt(0.5)); }
          } else {
            this.vel.y = Math.max(this.vel.y - M.gravity * dt, -2.5); // slide down slowly
          }
          this.vel.x = -c.nx * 1.5; this.vel.z = -c.nz * 1.5;
          this.yaw = Math.atan2(-c.nx, -c.nz);
          if (toward < -0.5) this.climbing = null;
        }
      } else if (this.pounding > 0) {
        // ----- ground pound -----
        this.pounding -= dt;
        if (this.pounding > 0.9) { this.vel.set(0, 1.5, 0); } // hang in the air for a moment
        else this.vel.set(0, M.pound, 0);
      } else {
        // ----- running and jumping -----
        const sp = M.run * mag * (this.slashT > 0 && this.onGround ? 0.35 : 1) * (this.tauntT > 0 ? 0 : 1);
        const acc = this.onGround ? M.accel : M.airAccel;
        const tx = wx * sp, tz = wz * sp;
        const dvx = tx - this.vel.x, dvz = tz - this.vel.z, dl = Math.hypot(dvx, dvz), maxd = acc * dt;
        if (dl > maxd) { this.vel.x += (dvx / dl) * maxd; this.vel.z += (dvz / dl) * maxd; } else { this.vel.x = tx; this.vel.z = tz; }
        if (mag > 0.1 && this.slashT <= 0 && this.spinT <= 0) this.yaw = U.dampAngle(this.yaw, Math.atan2(wx, wz), 14, dt);
        this.vel.y -= M.gravity * dt;
        if (this.vel.y < -32) this.vel.y = -32;
        if (this.jumpBuffer > 0) {
          if (this.onCat && this.onGround) {
            this.vel.y = M.superJump; this.jumpBuffer = 0; this.jumpsLeft = 1;
            NC.Audio.play('superJump', this.sfxAt());
            NC.FX.burst(this.pos.x, this.pos.y, this.pos.z, { n: 24, color: [0xffe060, 0xffffff], speed: 5 });
            this.game.message(this, 'SUPER JUMP!');
            this.game.stats.superJumps++;
          } else if (this.onGround || this.coyote > 0) {
            this.vel.y = M.jump; this.jumpBuffer = 0; this.coyote = 0;
            NC.Audio.play('jump', this.sfxAt(0.6));
          } else if (this.jumpsLeft > 0) {
            this.vel.y = M.doubleJump; this.jumpBuffer = 0; this.jumpsLeft--;
            this.flipT = 0.42;
            NC.Audio.play('djump', this.sfxAt(0.6));
            NC.FX.burst(this.pos.x, this.pos.y + 0.2, this.pos.z, { n: 12, color: 0xffffff, speed: 3, size: 0.18, gravity: 0, flat: true });
          }
        }
      }

      // ----- attacks -----
      if (inp.katanaPressed && this.tauntT <= 0) this.attack();
      if (inp.starPressed) this.throwStar();
      if (inp.smokePressed) this.smoke();

      // ----- move and bump into things -----
      const wasGround = this.onGround, fallSpeed = this.vel.y;
      this.moveAndCollide(dt);
      if (this.onGround) {
        this.jumpsLeft = 1;
        this.climbStamina = M.climbTime;
        this.climbing = null;
        if (!wasGround) this.landed(fallSpeed);
      } else if (wasGround && this.vel.y <= 0) {
        this.coyote = 0.12;
      }

      // ----- start climbing when you jump into a wall -----
      const hw = this.hitWall;
      if (!this.climbing && !this.onGround && hw && hw.box.climb && this.pounding <= 0 && mag > 0.2 && this.climbStamina > 0 && this.vel.y < 9) {
        if (-(wx * hw.nx + wz * hw.nz) > 0.3) {
          this.climbing = { nx: hw.nx, nz: hw.nz };
          this.flipT = 0;
        }
      }
      // ----- climbing: reached the top? -----
      if (this.climbing) {
        const c = this.climbing, R = M.radius + 0.12;
        const chest = W.solidAt(this.pos.x - c.nx * R, this.pos.y + 0.55, this.pos.z - c.nz * R);
        const feet = W.solidAt(this.pos.x - c.nx * R, this.pos.y + 0.05, this.pos.z - c.nz * R);
        if (!chest) {
          if (feet && this.vel.y > 0) {
            // pull yourself up onto the roof
            this.vel.set(-c.nx * 4.5, 6.5, -c.nz * 4.5);
            NC.Audio.play('jump', this.sfxAt(0.4));
          }
          this.climbing = null;
        }
      }

      // ----- fell in the water / off the pagoda -----
      const fallY = W.theme.clouds ? -8 : -1.1;
      if (this.pos.y < fallY) this.fellOff();

      // ----- remember safe places (to come back after falling) -----
      this.safeT -= dt;
      if (this.onGround && this.safeT <= 0 && this.groundBox && (this.groundBox.kind === 'tile' || this.groundBox.kind === 'crate') && !this.game.onSpikes(this)) {
        this.safeT = 0.25;
        this.safe.push({ x: this.pos.x, y: this.pos.y, z: this.pos.z });
        if (this.safe.length > 8) this.safe.shift();
      }

      this.updateLook(dt, mag);
      this.updateCamera(dt, inp);
    }

    // hits the ground
    landed(fallSpeed) {
      const b = this.groundBox;
      if (b && b.kind === 'drum') {
        this.vel.y = MOVE.drum;
        this.onGround = false;
        this.jumpsLeft = 1;
        NC.Audio.play('drum', this.sfxAt());
        NC.FX.ring(this.pos.x, b.maxY + 0.05, this.pos.z, 2.5, 0xffd060, 0.4);
        if (this.pounding > 0) { this.pounding = 0; this.poundHit(); }
        return;
      }
      if (this.pounding > 0) { this.pounding = 0; this.poundHit(); return; }
      if (fallSpeed < -9) {
        NC.Audio.play('land', this.sfxAt(0.6));
        NC.FX.puff(this.pos.x, this.pos.y, this.pos.z, { n: 6, size: 0.6, life: 0.5, speed: 2, up: 0.3, color: 0xb0a8a0, alpha: 0.5 });
      }
    }

    poundHit() {
      const p = this.pos;
      NC.Audio.play('stomp', this.sfxAt());
      NC.FX.ring(p.x, p.y + 0.05, p.z, 3.4, 0xffffff, 0.35);
      NC.FX.puff(p.x, p.y, p.z, { n: 14, size: 1, life: 0.6, speed: 5, up: 0.5, color: 0xc8c0b8, alpha: 0.6 });
      this.game.shake(this, 0.35);
      NC.Input.rumble(this.index, 0.7, 150);
      this.game.hitArea({ x: p.x, y: p.y + 0.4, z: p.z, r: 3.2, arc: Math.PI * 2, yaw: 0, dmg: 2, by: this, kind: 'pound' });
    }

    // ----- KATANA -----
    attack() {
      if (this.climbing) return;
      const W = this.world;
      const floor = W.floorAt(this.pos.x, this.pos.z, this.pos.y);
      if (!this.onGround && this.pos.y - floor > 1.6 && this.pounding <= 0) {
        this.pounding = 1.05; // ground pound!
        this.flipT = 0;
        NC.Audio.play('djump', this.sfxAt(0.5));
        return;
      }
      if (this.slashT > 0 || this.spinT > 0) { this.bufferedSlash = true; return; }
      this.combo = this.comboWindow > 0 ? this.combo + 1 : 1;
      const p = this.pos;
      const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
      const swordColor = (NC.Models.SWORDS[(this.game.save.equip[this.kind] || {}).sword] || NC.Models.SWORDS.silver).color;
      if (this.combo >= 3) {
        // SPIN ATTACK!
        this.spinT = 0.42; this.combo = 0; this.comboWindow = 0;
        NC.Audio.play('slash', Object.assign(this.sfxAt(), { n: 3 }));
        NC.FX.slash(p.x, p.y + 0.55, p.z, this.yaw, swordColor, 'spin');
        this.game.hitArea({ x: p.x, y: p.y + 0.5, z: p.z, r: 2.6, arc: Math.PI * 2, yaw: this.yaw, dmg: 2, by: this, kind: 'spin' });
      } else {
        this.slashT = 0.26;
        if (this.onGround) { this.vel.x += fx * 3; this.vel.z += fz * 3; }
        NC.Audio.play('slash', Object.assign(this.sfxAt(), { n: this.combo }));
        NC.FX.slash(p.x + fx * 0.5, p.y + 0.55, p.z + fz * 0.5, this.yaw, swordColor, 'slash', this.combo === 1 ? 1 : -1);
        this.game.hitArea({ x: p.x, y: p.y + 0.5, z: p.z, r: 2.2, arc: 2.2, yaw: this.yaw, dmg: 1, by: this, kind: 'slash' });
      }
    }

    // ----- SHURIKEN -----
    throwStar() {
      if (this.stars <= 0) { if (this.starCD <= 0) { NC.Audio.play('nope', { vol: 0.4 }); this.game.message(this, 'NO SHURIKEN! FIND A SCROLL'); this.starCD = 0.8; } return; }
      if (this.starCD > 0) return;
      this.starCD = 0.2;
      this.stars--;
      this.throwT = 0.25;
      const from = { x: this.pos.x, y: this.pos.y + 0.65, z: this.pos.z };
      // aim at the closest enemy in front of you (a little help!)
      let dir = { x: Math.sin(this.yaw), y: 0, z: Math.cos(this.yaw) };
      if (this.climbing) dir = { x: this.climbing.nx, y: 0, z: this.climbing.nz };
      const target = this.game.findTarget(from, dir, 24, 0.55);
      if (target) {
        const tx = target.x - from.x, ty = target.y - from.y, tz = target.z - from.z, d = Math.hypot(tx, ty, tz) || 1;
        dir = { x: tx / d, y: ty / d, z: tz / d };
        this.yaw = Math.atan2(dir.x, dir.z);
      }
      NC.Shots.add({ type: 'star', owner: this, x: from.x + dir.x * 0.4, y: from.y, z: from.z + dir.z * 0.4, vx: dir.x * 30, vy: dir.y * 30, vz: dir.z * 30, life: 0.9, dmg: 1 });
      NC.Audio.play('star', this.sfxAt());
      this.game.stats.stars++;
    }

    // ----- SMOKE BOMB -----
    smoke() {
      if (this.invisT > 0) return;
      if (this.smokes <= 0) { NC.Audio.play('nope', { vol: 0.4 }); this.game.message(this, 'NO SMOKE BOMBS!'); return; }
      this.smokes--;
      this.invisT = this.smokeTime;
      NC.FX.smokeBomb(this.pos.x, this.pos.y, this.pos.z);
      NC.Audio.play('smoke', this.sfxAt());
      this.game.message(this, 'INVISIBLE!');
      this.game.loseTarget(this);
    }

    // ----- ouch! -----
    hurt(dmg, from) {
      if (this.dead || this.invulnT > 0 || this.game.state !== 'play' || this.game.god) return false;
      this.hearts -= dmg;
      this.invulnT = 1.4;
      this.hurtT = 0.35;
      this.climbing = null;
      this.pounding = 0;
      this.tauntT = 0;
      if (from) {
        let dx = this.pos.x - from.x, dz = this.pos.z - from.z;
        const d = Math.hypot(dx, dz) || 1;
        this.vel.set((dx / d) * 8, 6, (dz / d) * 8);
      }
      NC.Audio.play('meow', this.sfxAt());
      NC.Input.rumble(this.index, 0.8, 220);
      this.game.shake(this, 0.4);
      this.game.flash(this, 'hurt');
      NC.FX.burst(this.pos.x, this.pos.y + 0.6, this.pos.z, { n: 10, color: [0xff4040, 0xffffff], speed: 4 });
      this.game.stats.hits++;
      if (this.hearts <= 0) this.die();
      return true;
    }

    heal(n) {
      if (this.hearts >= this.maxHearts) return false;
      this.hearts = Math.min(this.maxHearts, this.hearts + n);
      return true;
    }

    fellOff() {
      const water = !this.world.theme.clouds;
      if (water) { NC.Audio.play('splash', this.sfxAt()); NC.FX.burst(this.pos.x, -0.9, this.pos.z, { n: 30, color: [0xa0d0ff, 0xffffff], speed: 6, up: 5 }); }
      else NC.Audio.play('meow', this.sfxAt());
      this.hearts -= 1;
      this.game.stats.falls++;
      if (this.hearts <= 0) { this.die(); return; }
      // come back at a safe place you stood on a moment ago
      const s = this.safe[0] || this.game.checkpoint;
      this.pos.set(s.x, s.y + 0.1, s.z);
      this.vel.set(0, 0, 0);
      this.invulnT = 1.5;
      this.climbing = null; this.pounding = 0;
      this.safe.length = 0;
      this.game.message(this, water ? 'SPLASH! -1 ❤' : 'WHOOPS! -1 ❤');
    }

    die() {
      this.dead = true;
      this.respawnT = 1.6;
      this.mesh.visible = false;
      this.shadow.visible = false;
      this.climbing = null; this.pounding = 0; this.invisT = 0;
      NC.FX.puff(this.pos.x, this.pos.y + 0.5, this.pos.z, { n: 20, color: 0xffffff, size: 1.2, life: 1, speed: 3 });
      NC.FX.burst(this.pos.x, this.pos.y + 0.5, this.pos.z, { n: 16, color: [0xffd040, 0xffffff], speed: 5 });
      NC.Audio.play('poof', this.sfxAt());
      this.game.loseLife(this);
    }

    // come back to life
    revive(p) {
      this.dead = false;
      this.hearts = this.maxHearts;
      this.pos.set(p.x, p.y + 0.1, p.z);
      this.vel.set(0, 0, 0);
      this.invulnT = 2;
      this.mesh.visible = true;
      this.shadow.visible = true;
      this.safe.length = 0;
      NC.FX.burst(p.x, p.y + 0.5, p.z, { n: 20, color: [0xffe080, 0xffffff], speed: 4 });
    }

    // ---------------------------------------------------------------
    //  bumping into walls, roofs, crates... and your friend's head
    // ---------------------------------------------------------------
    moveAndCollide(dt) {
      const steps = Math.ceil((Math.abs(this.vel.y) * dt) / 0.3) || 1;
      const h = dt / Math.min(steps, 4);
      this.hitWall = null;
      const wasGround = this.onGround;
      this.onGround = false; this.onCat = null;
      for (let i = 0; i < Math.min(steps, 4); i++) {
        this.pos.x += this.vel.x * h; this.collideXZ('x', wasGround);
        this.pos.z += this.vel.z * h; this.collideXZ('z', wasGround);
        this.pos.y += this.vel.y * h; this.collideY();
      }
    }
    overlaps(b, shrink = 0) {
      const R = MOVE.radius - shrink, p = this.pos;
      return p.x + R > b.minX && p.x - R < b.maxX && p.z + R > b.minZ && p.z - R < b.maxZ && p.y + MOVE.height > b.minY && p.y < b.maxY - 0.001;
    }
    collideXZ(axis, wasGround) {
      const R = MOVE.radius, p = this.pos, W = this.world;
      const list = W.query(p.x - R - 0.2, p.z - R - 0.2, p.x + R + 0.2, p.z + R + 0.2);
      for (let k = 0; k < list.length; k++) {
        const b = list[k];
        if (b.off || !this.overlaps(b)) continue;
        // small step? walk right up it
        if (b.kind !== 'edge' && b.maxY - p.y <= MOVE.step && (wasGround || this.vel.y <= 0) && !W.solidAt(p.x, b.maxY + 0.5, p.z)) {
          p.y = b.maxY; if (this.vel.y < 0) this.vel.y = 0;
          continue;
        }
        const v = axis === 'x' ? this.vel.x : this.vel.z;
        const mid = axis === 'x' ? (b.minX + b.maxX) / 2 : (b.minZ + b.maxZ) / 2;
        const goPlus = v !== 0 ? v < 0 : p[axis] > mid;
        if (axis === 'x') { p.x = goPlus ? b.maxX + R + 0.0005 : b.minX - R - 0.0005; this.vel.x = 0; this.hitWall = { nx: goPlus ? 1 : -1, nz: 0, box: b }; }
        else { p.z = goPlus ? b.maxZ + R + 0.0005 : b.minZ - R - 0.0005; this.vel.z = 0; this.hitWall = { nx: 0, nz: goPlus ? 1 : -1, box: b }; }
      }
    }
    collideY() {
      const R = MOVE.radius, p = this.pos, W = this.world;
      const list = W.query(p.x - R, p.z - R, p.x + R, p.z + R);
      for (let k = 0; k < list.length; k++) {
        const b = list[k];
        if (b.off || !this.overlaps(b, 0.02)) continue;
        if (this.vel.y <= 0 || p.y > b.maxY - 0.6) {
          p.y = b.maxY; this.vel.y = 0; this.onGround = true; this.groundBox = b;
        } else {
          p.y = b.minY - MOVE.height; this.vel.y = 0;
        }
      }
      // standing on your friend's head!
      if (this.vel.y <= 0) {
        for (const o of this.game.players) {
          if (o === this || o.dead) continue;
          const top = o.pos.y + MOVE.height * 0.95;
          if (Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < 0.55 && p.y < top && p.y > top - 0.45) {
            p.y = top; this.vel.y = 0; this.onGround = true; this.onCat = o; this.groundBox = null;
          }
        }
      }
    }

    // ---------------------------------------------------------------
    //  how the cat looks
    // ---------------------------------------------------------------
    updateLook(dt, mag) {
      const m = this.mesh, W = this.world;
      m.position.copy(this.pos);
      m.rotation.y = this.yaw;
      const hs = Math.hypot(this.vel.x, this.vel.z);
      this.phase += hs * dt * 2.3;
      let mode = 'ground';
      if (this.climbing) mode = 'climb';
      else if (this.pounding > 0) mode = 'pound';
      else if (!this.onGround) mode = 'air';
      else if (this.tauntT > 0) mode = 'taunt';
      NC.Models.animCat(m, {
        t: this.animT, run: this.onGround ? U.clamp(hs / MOVE.run, 0, 1) : 0, phase: this.phase, mode, vy: this.vel.y,
        flip: this.flipT / 0.42, slash: Math.max(0, this.slashT / 0.26), combo: this.combo, spin: Math.max(0, this.spinT / 0.42),
        throwT: this.throwT / 0.25, hurt: this.hurtT,
      }, dt);
      // see-through when invisible, blinking after getting hurt
      const op = this.invisT > 0 ? (this.invisT < 1 && Math.floor(this.invisT * 10) % 2 ? 0.6 : 0.22) : 1;
      NC.Models.setCatLook(m, op, this.hurtT > 0 ? 0x802020 : 0);
      m.visible = this.invulnT <= 0 || this.hurtT > 0 || Math.floor(this.invulnT * 14) % 2 === 0;
      // blob shadow on the floor under the cat
      const f = W.floorAt(this.pos.x, this.pos.z, this.pos.y + 0.1);
      if (f > -100) {
        const h = this.pos.y - f;
        this.shadow.visible = true;
        this.shadow.position.set(this.pos.x, f + 0.04, this.pos.z);
        const s = U.clamp(1.1 - h * 0.06, 0.4, 1.1);
        this.shadow.scale.set(s, s, 1);
        this.shadow.material.opacity = U.clamp(1 - h * 0.05, 0.3, 1) * (this.invisT > 0 ? 0.3 : 1);
      } else this.shadow.visible = false;
      // sparkles on a rainbow / gold sword
      if (this.slashT > 0 && this.mesh.userData.rainbow) NC.FX.burst(this.pos.x, this.pos.y + 0.6, this.pos.z, { n: 2, color: [0xff4080, 0x40c0ff, 0xffe040], speed: 2, size: 0.15, life: 0.3 });
    }

    snapCamera() {
      this.camYaw = this.yaw;
      this.updateCamera(1, null, true);
    }

    updateCamera(dt, inp, snap) {
      const p = this.pos, W = this.world;
      // the camera slowly turns to look where you're running
      if (!snap && !this.dead && this.camIdle > 0.8) {
        const hs = Math.hypot(this.vel.x, this.vel.z);
        const d = U.angleDiff(this.camYaw, this.yaw);
        if (hs > 2 && Math.abs(d) < 2.0 && !this.climbing) this.camYaw += d * Math.min(1, dt * 0.9 * (hs / MOVE.run));
      }
      const split = this.game.players.length > 1;
      const dist = (split ? 6.2 : 6.8) + Math.max(0, this.camPitch - 0.4) * 2;
      const tx = p.x, ty = p.y + 1.2, tz = p.z;
      const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
      const cp = Math.cos(this.camPitch), spch = Math.sin(this.camPitch);
      const cx = tx - fx * cp * dist, cy = ty + spch * dist + 0.3, cz = tz - fz * cp * dist;
      // don't go through walls
      const free = W.rayFree(tx, ty, tz, cx, cy, cz);
      const k = Math.max(0.12, free);
      const gx = tx + (cx - tx) * k, gy = ty + (cy - ty) * k, gz = tz + (cz - tz) * k;
      if (snap) { this.camPos.set(gx, gy, gz); this.camLook.set(tx, ty, tz); }
      else {
        const s = free < 1 ? 25 : 10;
        this.camPos.x = U.damp(this.camPos.x, gx, s, dt);
        this.camPos.y = U.damp(this.camPos.y, gy, s, dt);
        this.camPos.z = U.damp(this.camPos.z, gz, s, dt);
        this.camLook.x = U.damp(this.camLook.x, tx + fx * 1.5, 12, dt);
        this.camLook.y = U.damp(this.camLook.y, ty, 8, dt);
        this.camLook.z = U.damp(this.camLook.z, tz + fz * 1.5, 12, dt);
      }
      this.cam.position.copy(this.camPos);
      const sh = this.game.shakeOf ? this.game.shakeOf(this) : 0;
      if (sh > 0) this.cam.position.add(new THREE.Vector3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
      this.cam.lookAt(this.camLook);
    }

    // where my sounds come from
    sfxAt(vol = 1) { return { x: this.pos.x, z: this.pos.z, vol }; }
  }

  NC.Player = Player;
})();
