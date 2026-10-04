// ============================================================
//  NINJA CAT — ENEMIES
//  Guard dogs, rat ninjas, crows, frogs, the BIG BULLDOG
//  and LORD WOOFMOTO himself!
// ============================================================
window.NC = window.NC || {};

NC.Enemies = (function () {
  const U = NC.U;
  let game = null, scene = null;
  const list = [];
  const waves = []; // shockwave rings you have to jump over

  // ---------- the "!" "?" "zZ" bubbles ----------
  const BUBBLES = { '!': ['!', '#e02020'], '?': ['?', '#2060e0'], z: ['zZ', '#6060a0'], '*': ['✦', '#e0a020'] };
  function bubble(e, kind, time = 1.2) {
    if (!e.bubble) {
      e.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
      e.bubble.renderOrder = 10;
      e.bubble.scale.set(0.8, 0.8, 1);
      scene.add(e.bubble);
    }
    const b = BUBBLES[kind];
    e.bubble.material.map = NC.Tex.bubble(b[0], b[1]);
    e.bubble.material.needsUpdate = true;
    e.bubbleT = time;
    e.bubble.visible = true;
  }

  // ============================================================
  //  everything every enemy can do
  // ============================================================
  class Enemy {
    constructor(type, x, y, z, o) {
      Object.assign(this, { type, alive: true, t: Math.random() * 10, phase: 0, state: 'patrol', stateT: 0, target: null, flashT: 0, stun: 0, bubbleT: 0, attackT: 0, cool: 0 });
      this.pos = new THREE.Vector3(x, y, z);
      this.home = new THREE.Vector3(x, y, z);
      this.vel = new THREE.Vector3();
      this.yaw = o.yaw != null ? o.yaw : Math.random() * Math.PI * 2;
      Object.assign(this, o);
      this.maxHp = this.hp;
      this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: NC.Tex.blob(), transparent: true, depthWrite: false }));
      this.shadow.rotation.x = -Math.PI / 2;
      this.shadow.scale.setScalar(this.radius * 2.6);
      scene.add(this.mesh); scene.add(this.shadow);
    }
    get W() { return game.world; }
    get chest() { return { x: this.pos.x, y: this.pos.y + this.height * 0.55, z: this.pos.z }; }
    aware() { return this.state !== 'patrol' && this.state !== 'sleep' && this.state !== 'idle'; }

    // can I see this cat?
    sees(p, range = this.sight, fov = this.fov) {
      if (!p.visibleToEnemies) return false;
      const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > range || Math.abs(p.pos.y - this.pos.y) > 4.5) return false;
      if (d > 2.2) {
        const a = U.angleDiff(this.yaw, Math.atan2(dx, dz));
        if (Math.abs(a) > fov / 2) return false;
      }
      return this.W.lineClear(this.pos.x, this.pos.y + this.height * 0.8, this.pos.z, p.pos.x, p.pos.y + 0.6, p.pos.z);
    }
    nearestVisible(range, fov) {
      let best = null, bd = Infinity;
      for (const p of game.players) {
        if (!this.sees(p, range, fov)) continue;
        const d = U.dist(p.pos.x, p.pos.z, this.pos.x, this.pos.z);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }
    nearestAlive() {
      let best = null, bd = Infinity;
      for (const p of game.players) {
        if (!p.alive) continue;
        const d = U.dist(p.pos.x, p.pos.z, this.pos.x, this.pos.z);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }
    distTo(p) { return U.dist(p.pos.x, p.pos.z, this.pos.x, this.pos.z); }
    face(x, z, dt, speed = 10) { this.yaw = U.dampAngle(this.yaw, Math.atan2(x - this.pos.x, z - this.pos.z), speed, dt); }

    // walk without falling off roofs or walking through walls. false = blocked
    walk(dx, dz, speed, dt, o = {}) {
      const d = Math.hypot(dx, dz);
      if (d < 0.001) return true;
      const ux = dx / d, uz = dz / d;
      const step = Math.min(speed * dt, d);
      const nx = this.pos.x + ux * step, nz = this.pos.z + uz * step;
      const W = this.W, r = this.radius;
      const maxUp = o.up || 0.45, maxDown = o.down || 0.45;
      // look a little ahead too, so we stop BEFORE the edge
      const ax = nx + ux * r, az = nz + uz * r;
      const f = W.floorAt(nx, nz, this.pos.y + maxUp), fa = W.floorAt(ax, az, this.pos.y + maxUp);
      if (f < this.pos.y - maxDown || fa < this.pos.y - maxDown || f === -Infinity) return false;
      if (W.solidAt(ax, this.pos.y + Math.min(1.2, this.height * 0.5), az)) return false;
      if (!o.hazards && game.items.spikeAt(nx, nz, f)) return false;
      this.pos.x = nx; this.pos.z = nz;
      this.pos.y = f;
      this.phase += step * 2.2;
      return true;
    }

    // ---------- getting hit ----------
    damage(dmg, by, kind, from) {
      if (!this.alive || this.invincible) return false;
      let sneak = false;
      if (this.canSneak && !this.aware() && kind !== 'star') { dmg = this.hp; sneak = true; }
      if (this.armor && kind !== 'pound') dmg *= this.armor();
      this.hp -= dmg;
      this.flashT = 0.15;
      game.stats.hitsGiven++;
      const src = from || (by ? by.pos : this.pos);
      const kx = this.pos.x - src.x, kz = this.pos.z - src.z, kd = Math.hypot(kx, kz) || 1;
      this.knock = { x: (kx / kd) * (this.heavy ? 1.5 : 6), z: (kz / kd) * (this.heavy ? 1.5 : 6), t: 0.18 };
      NC.FX.burst(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z, { n: 12, color: [0xffffff, 0xffe080], speed: 5 });
      NC.Audio.play(this.armor && this.armor() < 1 ? 'clang' : 'hit', { x: this.pos.x, z: this.pos.z });
      if (by && by.index != null) NC.Input.rumble(by.index, 0.4, 80);
      if (sneak) {
        game.message(by, 'SNEAK ATTACK!');
        game.stats.sneaks++;
        game.items.drop(this.pos.x, this.pos.y + 0.5, this.pos.z, 'f', 3);
      }
      if (this.hp <= 0) { this.die(by); return true; }
      this.onHurt(by, kind);
      return true;
    }
    onHurt(by) {
      if (!this.heavy) this.stun = 0.4;
      if (by && by.alive) this.alert(by, true);
      if (this.hurtSound) NC.Audio.play(this.hurtSound, { x: this.pos.x, z: this.pos.z });
    }
    alert(p, quiet) {
      if (!this.alive || this.boss) return;
      const was = this.aware();
      this.target = p;
      if (!was) {
        this.state = 'alert'; this.stateT = 0.55;
        bubble(this, '!', 1.2);
        if (!quiet) NC.Audio.play('alert', { x: this.pos.x, z: this.pos.z, vol: 0.8 });
      }
    }
    lose() {
      if (this.boss) return;
      if (this.aware()) { this.state = 'lost'; this.stateT = 2; this.target = null; bubble(this, '?', 2); NC.Audio.play('lost', { x: this.pos.x, z: this.pos.z, vol: 0.6 }); }
    }
    die(by) {
      this.alive = false;
      game.stats.kills++;
      NC.FX.puff(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z, { n: 16, color: 0xffffff, size: 1.2, life: 0.9, speed: 3 });
      NC.FX.burst(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z, { n: 18, color: [0xffd040, 0xffffff], speed: 6 });
      NC.Audio.play('poof', { x: this.pos.x, z: this.pos.z });
      if (this.drops) game.items.drop(this.pos.x, this.pos.y + 0.5, this.pos.z, 'f', this.drops);
      this.remove();
    }
    remove() {
      scene.remove(this.mesh); scene.remove(this.shadow);
      if (this.bubble) scene.remove(this.bubble);
    }

    // things every enemy does every frame
    common(dt) {
      this.t += dt;
      this.stateT -= dt;
      this.cool -= dt;
      if (this.flashT > 0) { this.flashT -= dt; NC.Models.flash(this.mesh, this.flashT > 0 ? 0.9 : 0); }
      if (this.knock && this.knock.t > 0) {
        this.knock.t -= dt;
        if (this.fly) { this.pos.x += this.knock.x * dt; this.pos.z += this.knock.z * dt; }
        else this.walk(this.knock.x, this.knock.z, Math.hypot(this.knock.x, this.knock.z), dt);
      }
      if (this.bubbleT > 0) {
        this.bubbleT -= dt;
        this.bubble.position.set(this.pos.x, this.pos.y + this.height * (this.mesh.scale.y || 1) + 0.7 + Math.sin(this.t * 6) * 0.05, this.pos.z);
        if (this.bubbleT <= 0) this.bubble.visible = false;
      }
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.y = this.yaw;
      const f = this.fly ? this.W.floorAt(this.pos.x, this.pos.z, this.pos.y) : this.pos.y;
      this.shadow.visible = f > -100;
      this.shadow.position.set(this.pos.x, f + 0.05, this.pos.z);
    }
  }

  // ============================================================
  //  GUARD DOG: walks around with a lantern. Sees you? Barks and chases!
  // ============================================================
  class Dog extends Enemy {
    constructor(x, y, z) {
      super('D', x, y, z, { hp: 3, radius: 0.45, height: 1.6, sight: 10, fov: 1.4, speed: 2, chaseSpeed: 4.8, canSneak: true, drops: 2, hurtSound: 'yelp', mesh: NC.Models.dog() });
      this.pickDir();
    }
    pickDir() {
      // walk along the longest open direction
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      let best = dirs[0], bl = -1;
      for (const d of dirs) {
        let l = 0;
        while (l < 12) {
          const x = this.home.x + d[0] * (l + 1), z = this.home.z + d[1] * (l + 1);
          if (Math.abs(this.W.floorAt(x, z, this.home.y + 0.4) - this.home.y) > 0.3) break;
          l++;
        }
        l += Math.random();
        if (l > bl) { bl = l; best = d; }
      }
      this.dir = best;
      this.walked = 0;
      this.yaw = Math.atan2(best[0], best[1]);
    }
    update(dt) {
      this.common(dt);
      let run = 0, attackPose = 0;
      if (this.stun > 0) { this.stun -= dt; }
      else if (this.state === 'patrol') {
        // walk back and forth
        if (this.stateT > 0) { run = 0; }
        else {
          const ok = this.walk(this.dir[0], this.dir[1], this.speed, dt);
          this.walked += this.speed * dt;
          run = 0.5;
          this.yaw = U.dampAngle(this.yaw, Math.atan2(this.dir[0], this.dir[1]), 6, dt);
          if (!ok || this.walked > 9) { this.dir = [-this.dir[0], -this.dir[1]]; this.walked = 0; this.stateT = 1.2; }
        }
        if (this.cool <= 0) {
          this.cool = 0.15;
          const p = this.nearestVisible();
          if (p) { this.alert(p); NC.Audio.play('bark', { x: this.pos.x, z: this.pos.z }); game.alertNear(this.pos.x, this.pos.z, 14, p, this); }
        }
      } else if (this.state === 'alert') {
        if (this.target) this.face(this.target.pos.x, this.target.pos.z, dt, 12);
        if (this.stateT <= 0) this.state = 'chase';
      } else if (this.state === 'chase') {
        const p = this.target;
        if (!p || !p.visibleToEnemies) { this.lose(); }
        else {
          const d = this.distTo(p);
          this.face(p.pos.x, p.pos.z, dt, 10);
          if (d < 1.7 && Math.abs(p.pos.y - this.pos.y) < 1.5) { this.state = 'windup'; this.stateT = 0.5; }
          else {
            const ok = this.walk(p.pos.x - this.pos.x, p.pos.z - this.pos.z, this.chaseSpeed, dt);
            run = ok ? 1 : 0;
            if (!ok) { this.stuckT = (this.stuckT || 0) + dt; if (this.stuckT > 0.8) { this.stuckT = 0; NC.Audio.play('bark', { x: this.pos.x, z: this.pos.z, vol: 0.7 }); } }
          }
          if (d > 18 || Math.abs(p.pos.y - this.pos.y) > 6) this.lose();
        }
      } else if (this.state === 'windup') {
        attackPose = U.clamp(1 - this.stateT / 0.5, 0, 1) * 0.6;
        if (this.target) this.face(this.target.pos.x, this.target.pos.z, dt, 6);
        if (this.stateT <= 0) {
          // thrust the spear!
          const p = this.target;
          if (p && p.alive && this.distTo(p) < 2.3 && Math.abs(p.pos.y - this.pos.y) < 1.6) {
            const a = U.angleDiff(this.yaw, Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z));
            if (Math.abs(a) < 1.0) p.hurt(1, this.pos);
          }
          NC.Audio.play('slash', { x: this.pos.x, z: this.pos.z, vol: 0.6 });
          this.state = 'recover'; this.stateT = 0.6;
        }
      } else if (this.state === 'recover') {
        attackPose = 1;
        if (this.stateT <= 0) this.state = 'chase';
      } else if (this.state === 'lost') {
        this.yaw += Math.sin(this.t * 3) * dt * 2;
        if (this.cool <= 0) {
          this.cool = 0.2;
          const p = this.nearestVisible();
          if (p) { this.alert(p); this.state = 'chase'; }
        }
        if (this.stateT <= 0) { this.state = 'patrol'; this.stateT = 0.5; }
      }
      NC.Models.animWalker(this.mesh, { t: this.t, phase: this.phase, run, attack: attackPose, alert: this.aware() }, dt);
    }
  }

  // ============================================================
  //  RAT NINJA: fast, keeps away from you and throws fish bones
  // ============================================================
  class Rat extends Enemy {
    constructor(x, y, z) {
      super('R', x, y, z, { hp: 2, radius: 0.35, height: 1.1, sight: 13, fov: 2.2, speed: 2.6, chaseSpeed: 5.5, canSneak: true, drops: 2, hurtSound: 'squeak', mesh: NC.Models.rat() });
      this.dirA = Math.random() * Math.PI * 2;
    }
    update(dt) {
      this.common(dt);
      let run = 0, throwPose = 0;
      if (this.jump) {
        // jumping up or down a roof
        const j = this.jump;
        j.t += dt;
        const k = Math.min(1, j.t / j.time);
        this.pos.set(U.lerp(j.x0, j.x1, k), U.lerp(j.y0, j.y1, k) + Math.sin(k * Math.PI) * 1.6, U.lerp(j.z0, j.z1, k));
        if (k >= 1) this.jump = null;
      } else if (this.stun > 0) { this.stun -= dt; }
      else if (this.state === 'patrol') {
        if (this.stateT <= 0) {
          const ok = this.walk(Math.sin(this.dirA), Math.cos(this.dirA), this.speed, dt);
          run = 0.6;
          this.yaw = U.dampAngle(this.yaw, this.dirA, 8, dt);
          if (!ok || Math.random() < dt * 0.3) { this.dirA += Math.PI * (0.5 + Math.random()); this.stateT = 0.6; }
          if (U.dist(this.pos.x, this.pos.z, this.home.x, this.home.z) > 7) this.dirA = Math.atan2(this.home.x - this.pos.x, this.home.z - this.pos.z);
        }
        if (this.cool <= 0) {
          this.cool = 0.15;
          const p = this.nearestVisible();
          if (p) { this.alert(p); NC.Audio.play('squeak', { x: this.pos.x, z: this.pos.z }); }
        }
      } else if (this.state === 'alert') {
        if (this.target) this.face(this.target.pos.x, this.target.pos.z, dt, 12);
        if (this.stateT <= 0) { this.state = 'chase'; this.throwT = 0.6; }
      } else if (this.state === 'chase') {
        const p = this.target;
        if (!p || !p.visibleToEnemies) this.lose();
        else {
          const d = this.distTo(p), dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
          this.face(p.pos.x, p.pos.z, dt, 12);
          // stay 5 to 9 meters away
          if (d > 9) run = this.walk(dx, dz, this.chaseSpeed, dt, { up: 0.45 }) ? 1 : 0;
          else if (d < 4.5) run = this.walk(-dx, -dz, this.chaseSpeed * 0.9, dt) ? 1 : 0;
          else run = this.walk(-dz, dx, 2, dt) ? 0.4 : 0; // sidestep
          // hop up or down a roof to follow
          if (!run && d > 4 && Math.abs(p.pos.y - this.pos.y) > 1 && Math.abs(p.pos.y - this.pos.y) < 3.2 && this.cool <= 0) this.tryJump(dx, dz);
          this.throwT -= dt;
          if (this.throwT <= 0 && d < 14) {
            this.throwT = 1.7 + Math.random() * 0.6;
            this.throwBone(p);
          }
          if (d > 20) this.lose();
        }
        throwPose = this.throwT > 1.5 ? 1 : 0;
      } else if (this.state === 'lost') {
        if (this.cool <= 0) { this.cool = 0.2; const p = this.nearestVisible(); if (p) { this.alert(p); this.state = 'chase'; } }
        if (this.stateT <= 0) this.state = 'patrol';
      }
      NC.Models.animWalker(this.mesh, { t: this.t, phase: this.phase, run, attack: throwPose, alert: this.aware() }, dt);
      if (this.mesh.userData.parts.tail) this.mesh.userData.parts.tail.rotation.y = Math.sin(this.t * 7) * 0.5;
    }
    tryJump(dx, dz) {
      this.cool = 1.2;
      const d = Math.hypot(dx, dz) || 1;
      const x1 = this.pos.x + (dx / d) * 2.8, z1 = this.pos.z + (dz / d) * 2.8;
      const f = this.W.floorAt(x1, z1, this.pos.y + 3.3);
      if (f > -100 && Math.abs(f - this.pos.y) < 3.3 && !this.W.solidAt(x1, f + 0.5, z1)) {
        this.jump = { x0: this.pos.x, y0: this.pos.y, z0: this.pos.z, x1, y1: f, z1, t: 0, time: 0.55 };
      }
    }
    throwBone(p) {
      const from = { x: this.pos.x, y: this.pos.y + 0.9, z: this.pos.z };
      const tx = p.pos.x + p.vel.x * 0.35, ty = p.pos.y + 0.6, tz = p.pos.z + p.vel.z * 0.35;
      const d = Math.hypot(tx - from.x, tz - from.z) || 1, sp = 13, time = d / sp;
      NC.Shots.add({ type: 'bone', owner: this, x: from.x, y: from.y, z: from.z, vx: ((tx - from.x) / d) * sp, vz: ((tz - from.z) / d) * sp, vy: (ty - from.y) / time + 3 * time, life: 2.5 });
      NC.Audio.play('star', { x: this.pos.x, z: this.pos.z, vol: 0.5 });
    }
  }

  // ============================================================
  //  CROW: flies in circles, then swoops down at you
  // ============================================================
  class Crow extends Enemy {
    constructor(x, y, z) {
      super('C', x, y, z, { hp: 1, radius: 0.4, height: 0.4, sight: 13, fov: Math.PI * 2, canSneak: false, drops: 1, fly: true, hurtSound: 'caw', mesh: NC.Models.crow() });
      this.home.y += 5;
      this.pos.copy(this.home);
      this.ang = Math.random() * 6;
    }
    update(dt) {
      this.common(dt);
      const P = this.mesh.userData.parts;
      let flap = 8;
      if (this.stun > 0) this.stun -= dt;
      if (this.state === 'patrol' || this.state === 'lost' || this.state === 'back') {
        // circle around home
        this.ang += dt * 0.9;
        const tx = this.home.x + Math.cos(this.ang) * 3, tz = this.home.z + Math.sin(this.ang) * 3, ty = this.home.y + Math.sin(this.t) * 0.4;
        this.pos.x = U.damp(this.pos.x, tx, 2, dt); this.pos.z = U.damp(this.pos.z, tz, 2, dt); this.pos.y = U.damp(this.pos.y, ty, 2, dt);
        this.yaw = this.ang + Math.PI;
        if (this.cool <= 0 && this.stateT <= 0) {
          this.cool = 0.25;
          const p = this.nearestVisible(13);
          if (p && Math.abs(p.pos.y - this.home.y) < 9) {
            this.target = p; this.state = 'aim'; this.stateT = 0.6;
            bubble(this, '!', 0.8); NC.Audio.play('caw', { x: this.pos.x, z: this.pos.z });
          }
        }
      } else if (this.state === 'aim') {
        flap = 16;
        const p = this.target;
        if (p) this.face(p.pos.x, p.pos.z, dt, 8);
        this.pos.y += dt * 1.5;
        if (this.stateT <= 0) {
          if (!p || !p.visibleToEnemies) { this.state = 'back'; this.stateT = 1; }
          else { this.state = 'dive'; this.stateT = 1.6; this.diveTo = { x: p.pos.x, y: p.pos.y + 0.5, z: p.pos.z }; }
        }
      } else if (this.state === 'dive') {
        flap = 0;
        const t = this.diveTo, dx = t.x - this.pos.x, dy = t.y - this.pos.y, dz = t.z - this.pos.z, d = Math.hypot(dx, dy, dz);
        const sp = 13;
        if (d > 0.3) { this.pos.x += (dx / d) * sp * dt; this.pos.y += (dy / d) * sp * dt; this.pos.z += (dz / d) * sp * dt; }
        this.yaw = Math.atan2(dx, dz);
        for (const p of game.players) if (p.alive && Math.hypot(p.pos.x - this.pos.x, p.pos.y + 0.5 - this.pos.y, p.pos.z - this.pos.z) < 0.85) { p.hurt(1, this.pos); this.stateT = 0; }
        if (d < 0.4 || this.stateT <= 0) { this.state = 'back'; this.stateT = 2.2; }
      }
      if (this.state === 'back' && this.stateT <= 0) this.state = 'patrol';
      // flap the wings
      const w = Math.sin(this.t * flap) * (flap ? 0.7 : 0.1) + (flap ? 0 : -0.3);
      P.wingL.rotation.z = w; P.wingR.rotation.z = -w;
      P.body.rotation.x = this.state === 'dive' ? 0.6 : 0;
    }
  }

  // ============================================================
  //  FROG: sits still, then jumps at you!
  // ============================================================
  class Frog extends Enemy {
    constructor(x, y, z) {
      super('F', x, y, z, { hp: 2, radius: 0.45, height: 0.6, sight: 10, fov: Math.PI * 2, canSneak: true, drops: 2, hurtSound: 'ribbit', mesh: NC.Models.frog() });
      this.cool = 1 + Math.random();
    }
    update(dt) {
      this.common(dt);
      const P = this.mesh.userData.parts;
      if (this.hop) {
        const h = this.hop;
        h.t += dt;
        const k = Math.min(1, h.t / h.time);
        this.pos.set(U.lerp(h.x0, h.x1, k), U.lerp(h.y0, h.y1, k) + Math.sin(k * Math.PI) * h.h, U.lerp(h.z0, h.z1, k));
        P.body.scale.set(0.9, 1.25, 0.9);
        if (k >= 1) {
          this.hop = null;
          P.body.scale.set(1.25, 0.75, 1.25);
          NC.Audio.play('land', { x: this.pos.x, z: this.pos.z, vol: 0.6 });
          NC.FX.puff(this.pos.x, this.pos.y, this.pos.z, { n: 5, size: 0.6, life: 0.4, speed: 2, up: 0.2, alpha: 0.4 });
          for (const p of game.players) if (p.alive && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 1.25 && Math.abs(p.pos.y - this.pos.y) < 1.2) p.hurt(1, this.pos);
          this.cool = 1.1 + Math.random() * 0.6;
        }
        return;
      }
      P.body.scale.x = U.damp(P.body.scale.x, 1, 8, dt); P.body.scale.y = U.damp(P.body.scale.y, 1 + Math.sin(this.t * 4) * 0.04, 8, dt); P.body.scale.z = P.body.scale.x;
      if (this.stun > 0) { this.stun -= dt; return; }
      const p = this.nearestVisible(10);
      if (p) {
        this.face(p.pos.x, p.pos.z, dt, 8);
        if (!this.aware()) { this.state = 'chase'; bubble(this, '!', 0.8); NC.Audio.play('ribbit', { x: this.pos.x, z: this.pos.z }); }
        if (this.cool <= 0) this.jumpAt(p.pos.x, p.pos.z, 4.2);
      } else {
        if (this.aware()) this.state = 'patrol';
        if (this.cool <= 0) {
          // a little hop around home
          this.cool = 2 + Math.random() * 2;
          const a = Math.random() * 6;
          this.jumpAt(this.home.x + Math.cos(a) * 2, this.home.z + Math.sin(a) * 2, 2);
        }
      }
    }
    jumpAt(x, z, maxD) {
      let dx = x - this.pos.x, dz = z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.2) return;
      const l = Math.min(maxD, d);
      dx = (dx / d) * l; dz = (dz / d) * l;
      const x1 = this.pos.x + dx, z1 = this.pos.z + dz;
      const f = this.W.floorAt(x1, z1, this.pos.y + 3.2);
      this.cool = 0.4;
      if (f < -100 || game.items.spikeAt(x1, z1, f) || this.W.solidAt(x1, f + 0.4, z1)) return;
      this.hop = { x0: this.pos.x, y0: this.pos.y, z0: this.pos.z, x1, y1: f, z1, t: 0, time: 0.6, h: 2.2 };
      this.yaw = Math.atan2(dx, dz);
      NC.Audio.play('ribbit', { x: this.pos.x, z: this.pos.z, vol: 0.5 });
    }
  }

  // ============================================================
  //  shockwaves: jump over them!
  // ============================================================
  function wave(x, y, z, maxR, speed = 11) {
    waves.push({ x, y, z, r: 0.5, maxR, speed, hit: new Set() });
    NC.FX.ring(x, y + 0.05, z, maxR, 0xffa040, maxR / speed);
  }
  function updateWaves(dt) {
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.r += w.speed * dt;
      for (const p of game.players) {
        if (!p.alive || w.hit.has(p)) continue;
        const d = Math.hypot(p.pos.x - w.x, p.pos.z - w.z);
        if (Math.abs(d - w.r) < 0.7 && p.pos.y - w.y < 0.5 && p.pos.y - w.y > -0.5) { w.hit.add(p); p.hurt(1, w); }
      }
      if (w.r > w.maxR) waves.splice(i, 1);
    }
  }

  // ============================================================
  //  BOSS 1: THE BIG BULLDOG
  // ============================================================
  class Bulldog extends Enemy {
    constructor(x, y, z) {
      super('K', x, y, z, {
        hp: 18, radius: 1.0, height: 3.2, sight: 16, fov: Math.PI * 2, canSneak: false, boss: true, heavy: true, name: 'BIG BULLDOG', drops: 15,
        mesh: NC.Models.dog({ fur: 0xa86a3a, muzzle: 0xf0e0d0, armor: 0x5a2a20, trim: 0x888888, ears: 'floppy', jaw: true, lantern: false, spear: false, collar: true, size: 1.9 }),
      });
      this.state = 'sleep';
      this.yaw = -Math.PI / 2;
      this.specials = 0;
      bubble(this, 'z', 9999);
    }
    armor() { return this.state === 'dizzy' ? 2 : 1; }
    update(dt) {
      this.common(dt);
      let run = 0, att = 0, lean = 0;
      const p = this.target && this.target.alive ? this.target : this.nearestAlive();
      this.target = p;
      switch (this.state) {
        case 'sleep':
          if (p && this.distTo(p) < 15 && Math.abs(p.pos.y - this.pos.y) < 2.5) {
            this.state = 'intro'; this.stateT = 1.6;
            this.bubbleT = 0; this.bubble.visible = false;
            NC.Audio.play('roar', { vol: 1 });
            game.startBoss(this);
          }
          break;
        case 'intro':
          if (p) this.face(p.pos.x, p.pos.z, dt, 4);
          att = 0.5 + Math.sin(this.t * 20) * 0.2;
          if (this.stateT <= 0) { this.state = 'chase'; this.attackT = 3; }
          break;
        case 'chase':
          if (!p) break;
          this.face(p.pos.x, p.pos.z, dt, 5);
          this.attackT -= dt;
          if (this.distTo(p) < 2.8) { this.state = 'swipe'; this.stateT = 0.6; }
          else run = this.walk(p.pos.x - this.pos.x, p.pos.z - this.pos.z, 3.2, dt) ? 0.8 : 0;
          if (this.attackT <= 0) {
            this.specials++;
            if (this.specials % 3 === 0) this.startSlam(p);
            else { this.state = 'scrape'; this.stateT = 1.0; bubble(this, '!', 1); NC.Audio.play('bark', { x: this.pos.x, z: this.pos.z, p: 0.6 }); }
          }
          break;
        case 'swipe':
          att = U.clamp(1 - this.stateT / 0.6, 0, 1) * 0.6;
          if (this.stateT <= 0) {
            for (const q of game.players) {
              if (!q.alive) continue;
              const a = U.angleDiff(this.yaw, Math.atan2(q.pos.x - this.pos.x, q.pos.z - this.pos.z));
              if (this.distTo(q) < 3.4 && Math.abs(a) < 1.2 && Math.abs(q.pos.y - this.pos.y) < 2) q.hurt(1, this.pos);
            }
            NC.Audio.play('slash', { x: this.pos.x, z: this.pos.z, n: 3 });
            NC.FX.slash(this.pos.x, this.pos.y + 1.2, this.pos.z, this.yaw, 0xffc080, 'slash');
            this.state = 'chase';
            this.attackT = Math.max(this.attackT, 1);
          }
          break;
        case 'scrape':
          // paws at the ground... he's going to CHARGE!
          if (p) this.face(p.pos.x, p.pos.z, dt, 6);
          run = Math.sin(this.t * 25) * 0.4;
          if (Math.random() < 0.3) NC.FX.puff(this.pos.x, this.pos.y, this.pos.z, { n: 1, size: 0.8, life: 0.5, speed: 2, alpha: 0.4 });
          if (this.stateT <= 0) { this.state = 'charge'; this.stateT = 1.8; this.chargeDir = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; NC.Audio.play('roar', { vol: 0.6 }); }
          break;
        case 'charge': {
          run = 1; lean = 0.5;
          const ok = this.walk(this.chargeDir.x, this.chargeDir.z, 12, dt);
          if (Math.random() < 0.5) NC.FX.puff(this.pos.x, this.pos.y, this.pos.z, { n: 1, size: 1, life: 0.6, speed: 1, alpha: 0.4 });
          for (const q of game.players) if (q.alive && this.distTo(q) < 1.6 && Math.abs(q.pos.y - this.pos.y) < 2) q.hurt(1, this.pos);
          if (!ok) {
            // CRASH! dizzy...
            this.state = 'dizzy'; this.stateT = 3.2;
            bubble(this, '*', 3.2);
            NC.Audio.play('boom', { x: this.pos.x, z: this.pos.z, vol: 0.7 });
            NC.FX.burst(this.pos.x + this.chargeDir.x, this.pos.y + 1.5, this.pos.z + this.chargeDir.z, { n: 25, color: [0xffe060, 0xffffff], speed: 6 });
            for (const q of game.players) game.shake(q, 0.5);
            game.message(null, 'HE\'S DIZZY! ATTACK!');
          } else if (this.stateT <= 0) { this.state = 'chase'; this.attackT = 3; }
          break;
        }
        case 'dizzy':
          this.yaw += dt * 3;
          if (this.stateT <= 0) { this.state = 'chase'; this.attackT = 3.5; }
          break;
        case 'slamUp': {
          const j = this.jump;
          j.t += dt;
          const k = Math.min(1, j.t / j.time);
          this.pos.set(U.lerp(j.x0, j.x1, k), U.lerp(j.y0, j.y1, k) + Math.sin(k * Math.PI) * 7, U.lerp(j.z0, j.z1, k));
          if (k >= 1) {
            NC.Audio.play('stomp', { vol: 1 });
            NC.FX.puff(this.pos.x, this.pos.y, this.pos.z, { n: 20, size: 1.6, life: 0.9, speed: 6, alpha: 0.5 });
            wave(this.pos.x, this.pos.y, this.pos.z, 11);
            for (const q of game.players) { game.shake(q, 0.6); if (q.alive && this.distTo(q) < 1.8) q.hurt(1, this.pos); }
            this.state = 'chase'; this.attackT = 3.2;
          }
          break;
        }
      }
      NC.Models.animWalker(this.mesh, { t: this.t, phase: this.phase, run: Math.abs(run), attack: att, alert: true, lean }, dt);
    }
    startSlam(p) {
      // jump high and land where the cat is
      const tx = p.pos.x, tz = p.pos.z;
      const f = this.W.floorAt(tx, tz, this.pos.y + 0.5);
      if (Math.abs(f - this.pos.y) > 0.5) { this.state = 'scrape'; this.stateT = 1; return; }
      this.jump = { x0: this.pos.x, y0: this.pos.y, z0: this.pos.z, x1: tx, y1: f, z1: tz, t: 0, time: 1.1 };
      NC.FX.warn(tx, f, tz, 2, 1.1);
      this.state = 'slamUp';
      NC.Audio.play('jump', { vol: 1 });
    }
    die(by) {
      super.die(by);
      game.items.drop(this.pos.x, this.pos.y + 1, this.pos.z, 'o', 1);
      game.bossDefeated(this);
    }
  }

  // ============================================================
  //  FINAL BOSS: LORD WOOFMOTO (3 phases!)
  //  1: sword   2: fireworks cannon   3: GIANT ROBO-DOG
  // ============================================================
  class Woofmoto extends Enemy {
    constructor(x, y, z) {
      super('W', x, y, z, {
        hp: 36, radius: 0.7, height: 2.6, sight: 16, fov: Math.PI * 2, canSneak: false, boss: true, heavy: true, name: 'LORD WOOFMOTO', drops: 0,
        mesh: NC.Models.dog({ fur: 0xd8a050, muzzle: 0xfff0e0, armor: 0xa01818, trim: 0xffd030, ears: 'pointy', lantern: false, spear: false, sword: true, cape: true, helmet: true, cannon: true, size: 1.5 }),
      });
      this.center = { x, y, z };
      this.state = 'sleep';
      this.phaseN = 1;
      this.yaw = -Math.PI / 2;
      this.volleys = 0;
      this.robo = null;
      this.robotAttacks = 0;
    }
    armor() {
      if (this.phaseN === 3) return this.state === 'overheat' ? 2 : 0.5;
      return 1;
    }
    damage(dmg, by, kind, from) {
      if (this.state === 'transform' || this.state === 'leap' || this.state === 'sleep' || this.state === 'intro') return false;
      const r = super.damage(dmg, by, kind, from);
      if (!this.alive) return r;
      if (this.phaseN === 1 && this.hp <= 24) this.toPhase2();
      else if (this.phaseN === 2 && this.hp <= 12) this.toPhase3();
      return r;
    }
    leapTo(x, y, z, time, next) {
      this.jump = { x0: this.pos.x, y0: this.pos.y, z0: this.pos.z, x1: x, y1: y, z1: z, t: 0, time, next };
      this.state = 'leap';
    }
    // arena floor: a spot near the center, but on the low part
    floorSpot() {
      const a = Math.random() * Math.PI * 2;
      for (let i = 0; i < 12; i++) {
        const x = this.center.x + Math.cos(a + i) * 9, z = this.center.z + Math.sin(a + i) * 6;
        const f = this.W.floorAt(x, z, 200);
        if (f > -100 && f < this.center.y - 1) return { x, y: f, z };
      }
      return { x: this.center.x - 9, y: this.center.y - 3, z: this.center.z };
    }
    toPhase2() {
      this.phaseN = 2;
      game.message(null, 'WOOFMOTO: TASTE MY FIREWORKS!');
      NC.Audio.play('roar', { vol: 1 });
      this.mesh.userData.parts.cannon.visible = true;
      this.leapTo(this.center.x, this.center.y, this.center.z, 1.0, 'cannon');
      // call two rat ninjas to help
      for (const s of [-1, 1]) {
        const f = this.floorSpot();
        const r = spawnOne('R', f.x, f.y, f.z + s * 2);
        if (r) { r.summoned = true; r.state = 'alert'; r.stateT = 0.6; r.target = this.nearestAlive(); }
      }
    }
    toPhase3() {
      this.phaseN = 3;
      this.state = 'transform'; this.stateT = 2.4;
      game.message(null, 'WOOFMOTO: ROBO-DOG, ACTIVATE!!');
      NC.Audio.play('robot', { vol: 1 });
      for (const q of game.players) game.shake(q, 0.5);
    }
    becomeRobot() {
      scene.remove(this.mesh);
      this.mesh = NC.Models.roboDog();
      scene.add(this.mesh);
      this.radius = 1.4; this.height = 4.6;
      this.shadow.scale.setScalar(4);
      NC.FX.boom(this.pos.x, this.pos.y + 2, this.pos.z, 3);
      NC.FX.firework(this.pos.x, this.pos.y + 3, this.pos.z, true);
      NC.Audio.play('boom', { vol: 1 });
      const f = this.floorSpot();
      this.leapTo(f.x, f.y, f.z, 1.2, 'robo');
    }
    update(dt) {
      this.common(dt);
      const p = this.target && this.target.alive ? this.target : this.nearestAlive();
      this.target = p;
      let run = 0, att = 0, lean = 0;
      const P = this.mesh.userData.parts;
      switch (this.state) {
        case 'sleep':
          if (p && this.distTo(p) < 13 && p.pos.y > this.center.y - 4) {
            this.state = 'intro'; this.stateT = 2.2;
            game.startBoss(this);
            game.message(null, 'WOOFMOTO: THE GOLDEN FISH IS MINE!');
            NC.Audio.play('roar', { vol: 1 });
          }
          break;
        case 'intro':
          if (p) this.face(p.pos.x, p.pos.z, dt, 4);
          att = 0.3 + Math.sin(this.t * 4) * 0.3;
          if (this.stateT <= 0) { const f = this.floorSpot(); this.leapTo(f.x, f.y, f.z, 0.9, 'sword'); }
          break;
        case 'leap': {
          const j = this.jump;
          j.t += dt;
          const k = Math.min(1, j.t / j.time);
          this.pos.set(U.lerp(j.x0, j.x1, k), U.lerp(j.y0, j.y1, k) + Math.sin(k * Math.PI) * 5, U.lerp(j.z0, j.z1, k));
          this.yaw = Math.atan2(j.x1 - j.x0, j.z1 - j.z0) || this.yaw;
          if (k >= 1) {
            NC.Audio.play('stomp', { vol: 0.8 });
            NC.FX.puff(this.pos.x, this.pos.y, this.pos.z, { n: 12, size: 1.2, life: 0.7, speed: 4, alpha: 0.5 });
            if (j.next === 'robo') { wave(this.pos.x, this.pos.y, this.pos.z, 10); this.state = 'robo'; this.attackT = 2.5; }
            else if (j.next === 'cannon') { this.state = 'cannon'; this.attackT = 1.2; this.volleys = 0; }
            else { this.state = 'sword'; this.attackT = 2.5; }
          }
          break;
        }
        // ---------- PHASE 1: sword fighting ----------
        case 'sword':
          if (!p) break;
          this.face(p.pos.x, p.pos.z, dt, 7);
          this.attackT -= dt;
          if (this.distTo(p) < 2.8 && Math.abs(p.pos.y - this.pos.y) < 2) { this.state = 'slashWind'; this.stateT = 0.45; }
          else run = this.walk(p.pos.x - this.pos.x, p.pos.z - this.pos.z, 4.2, dt) ? 1 : 0;
          if (this.attackT <= 0) { this.state = 'dashWind'; this.stateT = 0.7; bubble(this, '!', 0.7); NC.Audio.play('alert', { vol: 0.8 }); }
          break;
        case 'slashWind':
          att = U.clamp(1 - this.stateT / 0.45, 0, 1) * 0.6;
          if (this.stateT <= 0) {
            this.swordHit(3.2, 1.3);
            this.state = 'sword';
            this.attackT = Math.max(this.attackT, 0.8);
          }
          break;
        case 'dashWind':
          if (p) this.face(p.pos.x, p.pos.z, dt, 10);
          att = 0.8;
          if (this.stateT <= 0) { this.state = 'dash'; this.stateT = 0.55; this.dashDir = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; NC.Audio.play('slash', { n: 3 }); }
          break;
        case 'dash':
          att = 1; lean = 0.4; run = 1;
          if (!this.walk(this.dashDir.x, this.dashDir.z, 16, dt)) this.stateT = 0;
          NC.FX.burst(this.pos.x, this.pos.y + 1.2, this.pos.z, { n: 2, color: 0xffd0a0, speed: 1, size: 0.3, life: 0.3, gravity: 0 });
          for (const q of game.players) if (q.alive && this.distTo(q) < 1.8 && Math.abs(q.pos.y - this.pos.y) < 2) q.hurt(1, this.pos);
          if (this.stateT <= 0) { this.state = 'tired'; this.stateT = 1.1; }
          break;
        case 'tired':
          att = 0; lean = 0.3;
          if (this.stateT <= 0) { this.state = this.phaseN === 2 ? 'cannon' : 'sword'; this.attackT = this.phaseN === 2 ? 1 : 3; }
          break;
        // ---------- PHASE 2: fireworks cannon ----------
        case 'cannon': {
          if (p) this.face(p.pos.x, p.pos.z, dt, 5);
          this.attackT -= dt;
          // too close? spin attack!
          for (const q of game.players) {
            if (q.alive && this.distTo(q) < 2.6 && Math.abs(q.pos.y - this.pos.y) < 1.5 && this.cool <= 0) { this.state = 'spinWind'; this.stateT = 0.6; bubble(this, '!', 0.6); }
          }
          if (this.attackT <= 0 && this.state === 'cannon') {
            this.attackT = 2.6;
            this.volley();
            if (++this.volleys >= 4) { this.state = 'tiredCannon'; this.stateT = 3.5; bubble(this, 'z', 3.5); game.message(null, 'HE\'S OUT OF BREATH! ATTACK!'); }
          }
          break;
        }
        case 'spinWind':
          att = 0.6;
          if (this.stateT <= 0) {
            NC.FX.slash(this.pos.x, this.pos.y + 1, this.pos.z, this.yaw, 0xffd060, 'spin');
            NC.Audio.play('slash', { n: 3 });
            for (const q of game.players) if (q.alive && this.distTo(q) < 3.4 && Math.abs(q.pos.y - this.pos.y) < 2) { q.hurt(1, this.pos); q.vel.x *= 1.6; q.vel.z *= 1.6; }
            this.state = 'cannon'; this.cool = 2;
          }
          break;
        case 'tiredCannon':
          lean = 0.5;
          if (this.stateT <= 0) { this.state = 'cannon'; this.volleys = 0; this.attackT = 1; }
          break;
        // ---------- PHASE 3: ROBO-DOG ----------
        case 'transform':
          this.yaw += dt * 12;
          if (Math.random() < 0.4) NC.FX.burst(this.pos.x, this.pos.y + 1.5, this.pos.z, { n: 3, color: [0xffffff, 0x80c0ff], speed: 5 });
          if (this.stateT <= 0) this.becomeRobot();
          break;
        case 'robo':
          if (!p) break;
          this.face(p.pos.x, p.pos.z, dt, 3);
          this.attackT -= dt;
          run = this.walk(p.pos.x - this.pos.x, p.pos.z - this.pos.z, 2.4, dt) ? 0.7 : 0;
          if (this.attackT <= 0) {
            if (this.robotAttacks % 2 === 0) { this.state = 'stompWind'; this.stateT = 0.9; NC.Audio.play('robot'); }
            else { this.state = 'roboScrape'; this.stateT = 1.0; bubble(this, '!', 1); NC.Audio.play('robot'); }
          }
          break;
        case 'stompWind':
          P.legR.rotation.x = U.damp(P.legR.rotation.x, -1.2, 10, dt);
          if (this.stateT <= 0) {
            P.legR.rotation.x = 0;
            NC.Audio.play('stomp', { vol: 1 });
            wave(this.pos.x, this.pos.y, this.pos.z, 13, 10);
            for (const q of game.players) game.shake(q, 0.5);
            this.afterRoboAttack();
          }
          break;
        case 'roboScrape':
          if (p) this.face(p.pos.x, p.pos.z, dt, 5);
          if (this.stateT <= 0) { this.state = 'roboCharge'; this.stateT = 1.6; this.dashDir = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) }; }
          break;
        case 'roboCharge':
          run = 1; lean = 0.3;
          if (!this.walk(this.dashDir.x, this.dashDir.z, 10, dt)) this.stateT = 0;
          for (const q of game.players) if (q.alive && this.distTo(q) < 2.2 && Math.abs(q.pos.y - this.pos.y) < 3) q.hurt(1, this.pos);
          if (this.stateT <= 0) this.afterRoboAttack();
          break;
        case 'overheat':
          if (Math.random() < 0.5) NC.FX.puff(this.pos.x, this.pos.y + 3.8, this.pos.z, { n: 1, color: 0xffffff, size: 1.2, life: 1, speed: 1, up: 3, alpha: 0.7 });
          if (this.stateT <= 0) { this.state = 'robo'; this.attackT = 2; }
          break;
      }
      if (this.phaseN === 3 && this.state !== 'transform' && P.pilot) {
        // walk the big robot
        const sw = Math.sin(this.phase) * run;
        if (this.state !== 'stompWind') { P.legL.rotation.x = sw * 0.6; P.legR.rotation.x = -sw * 0.6; }
        P.armL.rotation.x = -sw * 0.4; P.armR.rotation.x = sw * 0.4;
        P.body.rotation.x = U.damp(P.body.rotation.x, lean, 6, dt);
        P.root.position.y = Math.abs(Math.cos(this.phase)) * run * 0.15;
        P.tail.rotation.y = Math.sin(this.t * 3) * 0.3;
        const ep = P.head.children;
        for (const c of ep) if (c.material && c.material.isMeshBasicMaterial) c.material.color.setHex(this.state === 'overheat' ? 0x404040 : (this.state === 'roboScrape' || this.state === 'stompWind') && Math.floor(this.t * 10) % 2 ? 0xffffff : 0xff2020);
        NC.Models.animWalker(P.pilot, { t: this.t, phase: 0, run: 0, attack: this.state === 'overheat' ? 0 : 0.3 + Math.sin(this.t * 3) * 0.2, alert: true }, dt);
      } else if (this.state !== 'transform') {
        NC.Models.animWalker(this.mesh, { t: this.t, phase: this.phase, run, attack: att, alert: true, lean }, dt);
        if (P.cannon) P.cannon.rotation.x = this.state === 'cannon' ? -0.3 + Math.sin(this.t * 2) * 0.1 : 0;
      }
    }
    afterRoboAttack() {
      this.robotAttacks++;
      if (this.robotAttacks % 2 === 0) {
        this.state = 'overheat'; this.stateT = 3.8;
        bubble(this, '*', 3.8);
        NC.Audio.play('steam', { vol: 1 });
        game.message(null, 'IT\'S OVERHEATING! ATTACK NOW!');
      } else { this.state = 'robo'; this.attackT = 2.2; }
    }
    swordHit(range, arc) {
      for (const q of game.players) {
        if (!q.alive) continue;
        const a = U.angleDiff(this.yaw, Math.atan2(q.pos.x - this.pos.x, q.pos.z - this.pos.z));
        if (this.distTo(q) < range && Math.abs(a) < arc && Math.abs(q.pos.y - this.pos.y) < 2) q.hurt(1, this.pos);
      }
      NC.Audio.play('slash', { x: this.pos.x, z: this.pos.z, n: 2 });
      NC.FX.slash(this.pos.x, this.pos.y + 1.2, this.pos.z, this.yaw, 0xff8060, 'slash');
    }
    volley() {
      NC.Audio.play('rocket', { vol: 0.9 });
      const alive = game.players.filter((q) => q.alive);
      const from = { x: this.pos.x, y: this.pos.y + 2.4, z: this.pos.z };
      const n = alive.length > 1 ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const q = alive[i % Math.max(1, alive.length)];
        if (!q) break;
        let tx = q.pos.x + (i < alive.length ? q.vel.x * 0.6 : (Math.random() - 0.5) * 7);
        let tz = q.pos.z + (i < alive.length ? q.vel.z * 0.6 : (Math.random() - 0.5) * 7);
        const ty = this.W.floorAt(tx, tz, q.pos.y + 3);
        if (ty < -100) continue;
        NC.Shots.add({ type: 'rocket', owner: this, x: from.x, y: from.y, z: from.z, tx, ty, tz, flight: 1.3 + i * 0.12, arc: 7 });
      }
    }
    die(by) {
      this.alive = false;
      game.stats.kills++;
      for (let i = 0; i < 6; i++) setTimeout(() => NC.FX.firework(this.pos.x + (Math.random() - 0.5) * 6, this.pos.y + 3 + Math.random() * 4, this.pos.z + (Math.random() - 0.5) * 6, true), i * 220);
      NC.FX.boom(this.pos.x, this.pos.y + 2, this.pos.z, 4);
      NC.Audio.play('boom', { vol: 1 });
      NC.Audio.play('roar', { vol: 0.8, delay: 0.3 });
      this.remove();
      game.bossDefeated(this);
    }
  }

  // ============================================================
  const TYPES = { D: Dog, R: Rat, C: Crow, F: Frog, K: Bulldog, W: Woofmoto };

  function init(g, sc) { game = g; scene = sc; clear(); }
  function spawnOne(type, x, y, z) {
    const C = TYPES[type];
    if (!C) return null;
    const e = new C(x, y, z);
    list.push(e);
    return e;
  }
  function spawn(spawns) { for (const s of spawns) spawnOne(s.type, s.x, s.y, s.z); }
  function update(dt) {
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      if (!e.alive) { list.splice(i, 1); continue; }
      // far away enemies sleep a bit (faster!)
      let near = Infinity;
      for (const p of game.players) near = Math.min(near, U.dist(p.pos.x, p.pos.z, e.pos.x, e.pos.z));
      if (near > 60 && !e.boss) continue;
      e.update(dt);
    }
    updateWaves(dt);
  }

  // the cats hit something: who gets hurt?
  function hitArea(a) {
    let n = 0;
    for (const e of list) {
      if (!e.alive) continue;
      const dx = e.pos.x - a.x, dz = e.pos.z - a.z, d = Math.hypot(dx, dz);
      if (d > a.r + e.radius) continue;
      const ey = e.pos.y + e.height * 0.5;
      if (Math.abs(ey - a.y) > e.height * 0.5 + 1.2) continue;
      if (a.arc < Math.PI * 2 && d > e.radius + 0.3) {
        const ang = U.angleDiff(a.yaw, Math.atan2(dx, dz));
        if (Math.abs(ang) > a.arc / 2) continue;
      }
      if (e.damage(a.dmg, a.by, a.kind, a)) n++;
    }
    return n;
  }
  function at(x, y, z, r) {
    for (const e of list) {
      if (!e.alive) continue;
      const c = e.chest;
      if (Math.hypot(c.x - x, (c.y - y) * 0.6, c.z - z) < e.radius + r + e.height * 0.15) return e;
    }
    return null;
  }
  // the best enemy to throw a shuriken at
  function findTarget(from, dir, range, minDot) {
    let best = null, bs = -Infinity;
    for (const e of list) {
      if (!e.alive) continue;
      const c = e.chest;
      const dx = c.x - from.x, dy = c.y - from.y, dz = c.z - from.z, d = Math.hypot(dx, dy, dz);
      if (d > range || d < 0.5) continue;
      const dot = (dx * dir.x + dz * dir.z) / (Math.hypot(dx, dz) || 1);
      if (dot < minDot) continue;
      if (!game.world.lineClear(from.x, from.y, from.z, c.x, c.y, c.z)) continue;
      const score = dot * 2 - d / range;
      if (score > bs) { bs = score; best = c; }
    }
    return best;
  }
  function alertNear(x, z, r, p, except) {
    for (const e of list) if (e !== except && e.alive && !e.boss && U.dist(e.pos.x, e.pos.z, x, z) < r && (e.type === 'D' || e.type === 'R')) e.alert(p, true);
  }
  function loseTarget(p) { for (const e of list) if (e.alive && e.target === p) e.lose(); }
  // you lost a boss fight: put every boss back where it started, asleep and at full health
  function resetBosses() {
    const back = [];
    for (const e of list) {
      if (!e.alive || !(e.boss || e.summoned)) continue;
      if (e.boss) back.push({ type: e.type, x: e.home.x, y: e.home.y, z: e.home.z });
      e.alive = false;
      e.remove();
    }
    waves.length = 0;
    for (const b of back) spawnOne(b.type, b.x, b.y, b.z);
    return back.length > 0;
  }
  function clear() {
    for (const e of list) e.remove();
    list.length = 0;
    waves.length = 0;
  }

  return { init, spawn, spawnOne, update, hitArea, at, findTarget, alertNear, loseTarget, resetBosses, clear, list, wave };
})();
