// ============================================================
//  LAB 13 — THE ALIENS
//   Crawler : small, fast, jumps at you. 3 wrench hits kill it.
//   Stalker : tall and terrifying. Can't be killed.
//             Shine your flashlight at it to FREEZE it!
//   Hanger  : hides on the ceiling with its tongue hanging down.
// ============================================================
window.LAB = window.LAB || {};

LAB.Aliens = (function () {
  const U = LAB.U, Mo = LAB.Models, W = LAB.World;

  // move toward a point, sliding around walls
  function steer(a, tx, tz, speed, dt, turnRate = 8) {
    const dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
    if (d < 0.05) return d;
    const want = Math.atan2(dx, dz);
    a.yaw += U.clamp(U.angleDiff(a.yaw, want), -turnRate * dt, turnRate * dt);
    const step = Math.min(d, speed * dt);
    const pos = { x: a.x + (dx / d) * step, z: a.z + (dz / d) * step };
    W.collide(pos, a.radius);
    a.x = pos.x; a.z = pos.z;
    return d;
  }

  // walk toward a player: straight if we can see them, else follow the path map
  function chase(a, p, speed, dt, game) {
    if (W.los(a.x, a.z, p.x, p.z) && U.dist(a.x, a.z, p.x, p.z) < 14) return steer(a, p.x, p.z, speed, dt);
    const field = game.fields[p.i];
    if (!field) return steer(a, p.x, p.z, speed, dt);
    return followField(a, field, speed, dt, p.x, p.z);
  }
  function followField(a, field, speed, dt, fx, fz) {
    const cx = U.worldToCell(a.x), cy = U.worldToCell(a.z);
    const n = W.nextStep(field, cx, cy);
    if (!n) return steer(a, fx, fz, speed, dt);
    return steer(a, U.cellToWorld(n[0]), U.cellToWorld(n[1]), speed, dt);
  }

  // keep aliens from standing inside each other
  function separate(list) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (!a.alive || !b.alive || a.type === 'hanger' || b.type === 'hanger') continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.radius + b.radius;
      if (d < min && d > 0.001) {
        const push = (min - d) / 2;
        a.x -= dx / d * push; a.z -= dz / d * push; b.x += dx / d * push; b.z += dz / d * push;
      }
    }
  }

  // which standing player can this alien sense?
  function sense(a, game, sight, hearMul = 1) {
    let best = null, bd = Infinity;
    for (const p of game.players) {
      if (!p.standing || p.grabbedBy) continue;
      const d = U.dist(a.x, a.z, p.x, p.z);
      let ok = d < 3.5;
      if (!ok && d < sight && W.los(a.x, a.z, p.x, p.z)) ok = true;
      if (!ok && p.noise * hearMul > d) ok = true;
      if (ok && d < bd) { bd = d; best = p; }
    }
    return best;
  }

  // =====================================================
  class Crawler {
    constructor(scene, x, z, awake) {
      this.type = 'crawler';
      this.x = x; this.z = z; this.yaw = Math.random() * 6;
      this.hp = 3; this.alive = true; this.radius = 0.4;
      this.state = awake ? 'chase' : 'idle';
      this.target = null; this.lost = 0; this.cd = U.rand(0.5, 1.2); this.t = Math.random() * 10;
      this.homeX = x; this.homeZ = z; this.wanderT = 0;
      this.model = Mo.crawler();
      scene.add(this.model);
      this.vy = 0; this.y = 0;
      this.chitterT = U.rand(1, 4);
    }
    update(dt, time, game) {
      this.t += dt;
      if (!this.alive) { // twitching dead body
        this.deadT += dt;
        if (this.deadT < 2.5) Mo.animateCrawler(this.model, this.t * 3, 1, false);
        return;
      }
      this.cd -= dt;
      let speed = 0;
      if (this.state === 'leap') {
        this.leapT -= dt;
        this.vy -= 14 * dt; this.y = Math.max(0, this.y + this.vy * dt);
        const pos = { x: this.x + this.lx * dt, z: this.z + this.lz * dt };
        W.collide(pos, this.radius); this.x = pos.x; this.z = pos.z;
        const p = this.target;
        if (p && !this.hitDone && p.standing && U.dist(this.x, this.z, p.x, p.z) < 0.9) {
          this.hitDone = true;
          p.damage(game.nightmare ? 18 : 13, this.x, this.z, this);
          LAB.Audio.chitter(0.6, game.soundAt(this.x, this.z, 20).pan);
        }
        if (this.leapT <= 0 && this.y <= 0) { this.state = 'chase'; this.cd = U.rand(1.0, 1.6); }
        speed = 3;
      } else {
        const seen = sense(this, game, 13);
        if (seen) { if (this.state === 'idle') { const s = game.soundAt(this.x, this.z, 25); LAB.Audio.screech(s.vol * 0.6, s.pan); } this.target = seen; this.state = 'chase'; this.lost = 0; }
        else if (this.state === 'chase') { this.lost += dt; if (this.lost > 7 || !this.target || !this.target.standing) { this.state = 'idle'; this.homeX = this.x; this.homeZ = this.z; } }

        if (this.state === 'chase' && this.target && this.target.standing) {
          const p = this.target;
          const d = U.dist(this.x, this.z, p.x, p.z);
          if (d < 2.6 && this.cd <= 0 && W.los(this.x, this.z, p.x, p.z)) {
            // LEAP!
            this.state = 'leap'; this.leapT = 0.45; this.hitDone = false;
            this.lx = (p.x - this.x) / d * 7; this.lz = (p.z - this.z) / d * 7; this.vy = 3.2;
            this.yaw = Math.atan2(p.x - this.x, p.z - this.z);
            const s = game.soundAt(this.x, this.z, 20); LAB.Audio.screech(s.vol * 0.7, s.pan);
          } else if (d > 1.2) { chase(this, p, game.power ? 4.6 : 4.0, dt, game); speed = 4; }
          this.chitterT -= dt;
          if (this.chitterT <= 0) { this.chitterT = U.rand(1.5, 3.5); const s = game.soundAt(this.x, this.z, 18); LAB.Audio.chitter(s.vol * 0.5, s.pan); }
        } else { // wander around slowly
          this.wanderT -= dt;
          if (this.wanderT <= 0) { this.wanderT = U.rand(2, 5); this.wx = this.homeX + U.rand(-3, 3); this.wz = this.homeZ + U.rand(-3, 3); }
          if (this.wx !== undefined && U.dist(this.x, this.z, this.wx, this.wz) > 0.3) { steer(this, this.wx, this.wz, 1.0, dt, 3); speed = 1; }
        }
      }
      this.model.position.set(this.x, this.y, this.z);
      this.model.rotation.y = this.yaw;
      this.model.rotation.x = this.state === 'leap' ? -0.4 : 0;
      Mo.animateCrawler(this.model, this.t, speed, this.state === 'leap' || (this.target && this.state === 'chase' && U.dist(this.x, this.z, this.target.x, this.target.z) < 3));
    }
    hit(player, dmg) {
      this.hp -= dmg;
      const s = LAB.Audio; const p = this.game.soundAt(this.x, this.z, 20);
      s.splat(0.8, p.pan);
      LAB.Effects.blood(this.x, 0.5, this.z, 16, Math.random() < 0.5);
      // knocked back
      const d = U.dist(this.x, this.z, player.x, player.z) || 1;
      const pos = { x: this.x + (this.x - player.x) / d * 1.2, z: this.z + (this.z - player.z) / d * 1.2 };
      W.collide(pos, this.radius); this.x = pos.x; this.z = pos.z;
      this.cd = Math.max(this.cd, 0.7);
      this.target = player; this.state = this.state === 'leap' ? 'chase' : this.state === 'idle' ? 'chase' : this.state;
      if (this.hp <= 0) this.die();
    }
    die() {
      this.alive = false; this.deadT = 0;
      const p = this.game.soundAt(this.x, this.z, 25);
      LAB.Audio.screech(p.vol, p.pan);
      LAB.Audio.splat(1, p.pan);
      LAB.Effects.blood(this.x, 0.5, this.z, 40, true, 1.3);
      LAB.Effects.blood(this.x, 0.5, this.z, 25, false, 1.2);
      LAB.Effects.gibs(this.x, 0.5, this.z, 10);
      W.addBlood(this.x, this.z, 2.2, true);
      W.addBlood(this.x + 0.5, this.z, 1.4, false);
      this.model.rotation.z = Math.PI; this.model.position.y = 0.55;
      this.game.stats.kills++;
    }
  }

  // =====================================================
  class Stalker {
    constructor(scene, x, z) {
      this.type = 'stalker';
      this.x = x; this.z = z; this.yaw = 0;
      this.alive = true; this.radius = 0.45;
      this.state = 'dormant';
      this.model = Mo.stalker();
      this.model.visible = false;
      scene.add(this.model);
      this.t = 0; this.cd = 0; this.lit = 0; this.unlit = 0; this.lost = 0; this.cool = 0;
      this.breathT = 0; this.stepT = 0; this.huntCount = 0;
    }
    wake(game) {
      if (this.state !== 'dormant') return;
      this.state = 'roam'; this.model.visible = true;
      this.pickWaypoint(game, false);
    }
    pickWaypoint(game, far) {
      const wps = W.waypoints;
      let best = null;
      if (far) { // the waypoint farthest from all players
        let bd = -1;
        for (const w of wps) {
          const wx = U.cellToWorld(w.cx), wz = U.cellToWorld(w.cy);
          const d = Math.min(...game.players.map((p) => U.dist(p.x, p.z, wx, wz)));
          if (d > bd) { bd = d; best = w; }
        }
      } else if (Math.random() < (game.power ? 0.85 : 0.6)) {
        // it can SMELL you: go to the room where a player is
        const p = U.pick(game.players.filter((pp) => pp.standing)) || game.players[0];
        let bd = Infinity;
        for (const w of wps) {
          const d = U.dist(p.x, p.z, U.cellToWorld(w.cx), U.cellToWorld(w.cy));
          if (d < bd) { bd = d; best = w; }
        }
      } else best = U.pick(wps);
      this.wp = best;
      this.wpField = W.flowField(best.cx, best.cy);
    }
    update(dt, time, game) {
      if (this.state === 'dormant') return;
      this.t += dt;
      this.cd -= dt; this.cool -= dt;
      let speed = 0;
      const lit = game.players.some((p) => p.lights(this.x, this.z) || p.lights(this.x + Math.sin(this.yaw) * 0.3, this.z + Math.cos(this.yaw) * 0.3));
      game.players.forEach((p) => (p.freezing = p.lights(this.x, this.z)));

      if (this.state === 'apparition') { this.model.visible = false; return; }

      if (lit && this.state !== 'flee') {
        // FROZEN in the light!
        if (this.state !== 'frozen') { this.prevState = this.state; this.state = 'frozen'; const s = game.soundAt(this.x, this.z, 30); LAB.Audio.screech(s.vol * 0.7, s.pan, true); }
        this.lit += dt; this.unlit = 0;
        if (this.lit > (game.nightmare ? 5 : 3.5)) {
          this.state = 'flee'; this.lit = 0; this.fleeT = 8; this.cool = 14;
          const s = game.soundAt(this.x, this.z, 40); LAB.Audio.screech(s.vol, s.pan, true);
          game.message(null, 'The Stalker runs away from the light!');
          this.pickWaypoint(game, true);
        }
      } else if (this.state === 'frozen') {
        this.unlit += dt;
        if (this.unlit > 0.25) { this.state = 'hunt'; this.lit = Math.max(0, this.lit - 1); }
      }

      if (this.state === 'stagger') { this.staggerT -= dt; if (this.staggerT <= 0) this.state = 'hunt'; }
      else if (this.state === 'flee') {
        this.fleeT -= dt;
        followField(this, this.wpField, 6.5, dt, this.x, this.z); speed = 6;
        if (this.fleeT <= 0) { this.state = 'roam'; this.pickWaypoint(game, false); }
      } else if (this.state === 'roam' || this.state === 'hunt') {
        const seen = this.cool <= 0 ? sense(this, game, 20, 1.5) : null;
        if (seen) {
          if (this.state === 'roam') {
            const s = game.soundAt(this.x, this.z, 40); LAB.Audio.screech(s.vol, s.pan, true);
            this.huntCount++;
          }
          this.state = 'hunt'; this.target = seen; this.lost = 0;
        } else if (this.state === 'hunt') {
          this.lost += dt;
          if (this.lost > 9 || !this.target || !this.target.standing) { this.state = 'roam'; this.pickWaypoint(game, false); }
        }
        if (this.state === 'hunt' && this.target && this.target.standing) {
          const p = this.target;
          const d = U.dist(this.x, this.z, p.x, p.z);
          if (d < 1.6 && this.cd <= 0) {
            // GOT YOU
            this.cd = 3;
            p.damage(game.nightmare ? 55 : 40, this.x, this.z, this);
            game.scaresys.face(p, 'stalker');
            this.state = 'flee'; this.fleeT = 6; this.cool = 10;
            this.pickWaypoint(game, true);
          } else {
            const sp = game.power ? 4.1 : 3.4;
            chase(this, p, game.nightmare ? sp + 0.5 : sp, dt, game); speed = sp;
          }
        } else if (this.state === 'roam') {
          if (!this.wp) this.pickWaypoint(game, false);
          const wx = U.cellToWorld(this.wp.cx), wz = U.cellToWorld(this.wp.cy);
          if (U.dist(this.x, this.z, wx, wz) < 1.5) this.pickWaypoint(game, false);
          else followField(this, this.wpField, 2.3, dt, wx, wz);
          speed = 2.3;
        }
      }

      // sounds: heavy footsteps + breathing
      if (speed > 0.5) {
        this.stepT -= dt * speed;
        if (this.stepT <= 0) { this.stepT = 2.2; const s = game.soundAt(this.x, this.z, 26); LAB.Audio.thud(s.vol * 0.5, s.pan); }
      }
      this.breathT -= dt;
      if (this.breathT <= 0) { this.breathT = U.rand(1.6, 2.6); const s = game.soundAt(this.x, this.z, 16); LAB.Audio.breathe(s.vol, s.pan); }

      this.model.position.set(this.x, 0, this.z);
      this.model.rotation.y = this.yaw;
      this.model.visible = true;
      Mo.animateStalker(this.model, this.t, speed, this.state === 'frozen', this.state === 'hunt' && this.target && U.dist(this.x, this.z, this.target.x, this.target.z) < 3);
    }
    hit() {
      if (this.state === 'frozen' || this.state === 'flee') return;
      this.state = 'stagger'; this.staggerT = 0.6;
      const s = this.game.soundAt(this.x, this.z, 20);
      LAB.Audio.clang(s.pan); LAB.Audio.screech(s.vol * 0.6, s.pan, true);
      LAB.Effects.blood(this.x, 1.8, this.z, 10, false);
    }
    // teleport somewhere (used by scares)
    placeAt(x, z, yaw) { this.x = x; this.z = z; this.yaw = yaw; }
  }

  // =====================================================
  class Hanger {
    constructor(scene, x, z) {
      this.type = 'hanger';
      this.x = x + U.rand(-0.5, 0.5); this.z = z + U.rand(-0.5, 0.5);
      this.hp = 3; this.alive = true; this.radius = 0.3;
      this.model = Mo.hanger();
      this.model.position.set(this.x, 0, this.z);
      scene.add(this.model);
      this.victim = null; this.t = Math.random() * 10; this.dmgT = 0; this.len = this.model.userData.length; this.cd = 0;
    }
    update(dt, time, game) {
      this.t += dt;
      const ud = this.model.userData;
      if (!this.alive) {
        this.len = Math.max(0.1, this.len - dt * 2);
        Mo.setTongue(this.model, this.len);
        ud.top.scale.y = Math.max(0.3, ud.top.scale.y - dt);
        return;
      }
      this.cd -= dt;
      ud.tongue.rotation.x = Math.sin(this.t * 0.9) * 0.04;
      ud.tongue.rotation.z = Math.cos(this.t * 0.7) * 0.04;
      if (!this.victim) {
        this.len = U.lerp(this.len, ud.length, dt * 0.5);
        if (this.cd <= 0) for (const p of game.players) {
          if (!p.standing || p.grabbedBy) continue;
          if (U.dist(p.x, p.z, this.x, this.z) < 0.75) {
            this.victim = p; p.grabbedBy = this; this.dmgT = 0.3;
            const s = game.soundAt(this.x, this.z, 20);
            LAB.Audio.slurp(0.8, s.pan); LAB.Audio.screech(0.5, s.pan, true);
            game.message(p.i, 'A HANGER GRABBED YOU! Hit it! (ATTACK)');
            game.message(1 - p.i, 'Your partner is caught by a HANGER! HIT IT!');
            LAB.Input.rumble(p.i, 1, 500);
            break;
          }
        }
      } else {
        const p = this.victim;
        this.len = U.lerp(this.len, 0.6, dt * 0.35);
        this.dmgT -= dt;
        if (this.dmgT <= 0) { this.dmgT = 0.7; p.damage(game.nightmare ? 8 : 6); LAB.Audio.slurp(0.4, game.soundAt(this.x, this.z, 20).pan); }
        if (!p.standing) this.release();
      }
      Mo.setTongue(this.model, this.len);
      ud.top.scale.set(1 + Math.sin(this.t * 3) * 0.05, 1 + Math.sin(this.t * 3 + 1) * 0.05, 1 + Math.sin(this.t * 3) * 0.05);
    }
    release() {
      if (this.victim) { this.victim.grabbedBy = null; this.victim = null; }
      this.cd = 3;
    }
    hit(player, dmg) {
      this.hp -= dmg;
      const s = this.game.soundAt(this.x, this.z, 20);
      LAB.Audio.splat(0.8, s.pan); LAB.Audio.screech(0.5, s.pan, true);
      LAB.Effects.blood(this.x, 1.8, this.z, 20, false);
      if (this.hp <= 0) {
        this.alive = false;
        this.release();
        LAB.Effects.blood(this.x, LAB.WALL_H - 0.3, this.z, 60, false, 1.2);
        LAB.Effects.gibs(this.x, LAB.WALL_H - 0.4, this.z, 8, 0x7a1822);
        W.addBlood(this.x, this.z, 2.5, false);
        this.game.stats.kills++;
        this.game.message(player.i, 'Hanger destroyed!');
      }
    }
  }

  return { Crawler, Stalker, Hanger, separate };
})();
