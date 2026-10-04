// ============================================================
//  SIGMA HOVER GP — HOVER PHYSICS
//  How a hover vehicle drives: speed, steering, DRIFTING with
//  blue/orange/purple sparks, hops, tricks on ramps, boosts,
//  walls, falling off and getting hit by items.
// ============================================================
window.HG = window.HG || {};

HG.Kart = (function () {
  const U = HG.U;
  const G = 30;                       // gravity (into the road: it's a magnet road!)
  const CC = { 50: 23, 100: 28, 150: 33, 200: 41 };   // top speeds in m/s
  const DRIFT_LEVELS = [0, 0.75, 1.55, 2.5];            // seconds of drifting for blue / orange / purple
  const DRIFT_BOOST = [0, 0.55, 1.05, 1.6];             // boost time you get
  let nextId = 1;

  class Kart {
    constructor(o) {
      this.id = o.id !== undefined ? o.id : nextId++;
      this.netId = o.netId;
      this.name = o.name || 'RACER';
      this.charId = o.charId || 'sigma';
      this.parts = o.parts || { body: 'kart', engine: 'twin', fins: 'standard' };
      this.color = o.color || '#ffcc00';
      this.ctrl = o.ctrl || 'cpu';          // 'local', 'cpu' or 'remote'
      this.player = o.player === undefined ? -1 : o.player;   // local player number (0 or 1)
      this.stats = o.stats || { speed: 5, accel: 5, weight: 5, handling: 5, grip: 5, turbo: 5 };
      this.cc = o.cc || 150;
      this.mirror = false;
      this.reset(0, 0);
      this.input = { steer: 0, gas: 0, brake: 0, drift: false, item: false, back: false, lookBack: false };
      this.prevIn = { drift: false, item: false };
      this.events = [];                     // sounds and effects to play this frame
    }

    reset(dist, d) {
      this.dist = dist;                     // total distance driven along the track (laps * length + s)
      this.s = 0; this.d = d; this.h = 0; this.vh = 0;
      this.yaw = 0; this.spd = 0; this.lat = 0; this.yawRate = 0; this.steerSm = 0;
      this.grounded = true; this.airT = 0; this.onRamp = null; this.launchRamp = null; this.trickWindow = 0;
      this.trick = 0; this.trickType = 0; this.trickDone = false; this.gliding = false; this.hopT = 0;
      this.drift = { dir: 0, charge: 0, level: 0, pending: false, pendDir: 0, held: false };
      this.boostT = 0; this.boostKind = ''; this.miniT = 0;
      this.coins = 0;
      this.item = null; this.itemCount = 0; this.holding = false; this.roulette = 0; this.rouletteItem = null; this.dragged = null;
      this.hitT = 0; this.hitKind = ''; this.hitSpin = 0; this.invT = 0; this.shrinkT = 0; this.sigmaT = 0; this.ghostT = 0;
      this.shieldT = 0; this.missileT = 0; this.smokeT = 0; this.goldT = 0; this.squashT = 0;
      this.falling = 0; this.respawnT = 0; this.lastSafe = { dist, d: 0 };
      this.wallT = 0; this.offroad = false; this.surface = 'road';
      this.slip = 0; this.slipOn = 0;
      this.lap = 0; this.lapStart = 0; this.lapTimes = []; this.finished = false; this.finishTime = 0; this.place = 1;
      this.wrongT = 0; this.wrongWay = false;
      this.balloons = 3; this.out = false; this.score = 0;
      this.startCharge = -1; this.startBoost = 0;
      this.lookBack = false;
      this.anim = { lean: 0, pitch: 0, roll: 0, bob: 0, squash: 0, celebrate: 0, sad: 0, throwT: 0, throwDir: 1, wave: 0, lookT: 0, hurtFace: 0 };
      this.speedFrac = 0;
    }

    get topSpeed() {
      let top = CC[this.cc] || 33;
      top *= 1 + (this.stats.speed - 5) * 0.022;
      top *= 1 + Math.min(10, this.coins) * 0.007;
      return top;
    }
    get boosting() { return this.boostT > 0 || this.sigmaT > 0 || this.missileT > 0 || this.goldT > 0; }
    get disabled() { return this.hitT > 0 || this.falling > 0 || this.respawnT > 0; }
    get lapNum() { return Math.max(1, this.lap); }

    boost(t, kind) {
      if (t > this.boostT) this.boostT = t;
      this.boostKind = kind || 'turbo';
      if (this.spd < this.topSpeed * 0.8) this.spd = Math.max(this.spd, this.topSpeed * 0.8);
      this.events.push({ type: 'boost', kind });
    }
    cancelDrift() { this.drift.dir = 0; this.drift.charge = 0; this.drift.level = 0; this.drift.pending = false; }

    // something hit us! kind: 'spin' (slime), 'tumble' (rocket/explosion), 'squash', 'bump'
    hit(kind, by) {
      if (this.ctrl === 'remote') return false;   // their own computer decides
      if (this.sigmaT > 0 || this.missileT > 0 || this.invT > 0 || this.falling > 0) return false;
      if (this.ghostT > 0 && kind !== 'fbi') return false;
      if (this.shieldT > 0 && kind !== 'fbi') { this.shieldT = 0; this.invT = 0.6; this.events.push({ type: 'shieldpop' }); return false; }
      this.cancelDrift();
      this.hitKind = kind; this.boostT = 0; this.goldT = 0;
      this.anim.hurtFace = 1.6;
      if (kind === 'spin') { this.hitT = 1.0; this.hitSpin = 0; }
      else if (kind === 'tumble' || kind === 'fbi') { this.hitT = kind === 'fbi' ? 1.9 : 1.45; this.hitSpin = 0; this.vh = kind === 'fbi' ? 11 : 8; this.grounded = false; this.spd *= 0.25; }
      else if (kind === 'squash') { this.hitT = 0.9; this.squashT = 2.2; this.spd *= 0.3; }
      this.invT = this.hitT + 0.7;
      if (kind !== 'squash') this.events.push({ type: 'hurt', kind });
      // drop some coins
      const lost = Math.min(this.coins, kind === 'spin' ? 2 : 3);
      this.coins -= lost;
      if (lost) this.events.push({ type: 'losecoins', n: lost });
      if (this.balloons > 0 && HG.Race && HG.Race.battle) HG.Race.popBalloon(this, by);
      return true;
    }

    // ------------------------------------------------------------
    //  ONE PHYSICS STEP
    // ------------------------------------------------------------
    step(dt, track, race) {
      const inp = this.input, a = this.anim, dr = this.drift;
      const fr = track.frame(this.s, Kart.fr);
      const halfW = fr.w / 2;
      // ---------- timers ----------
      const tick = (k) => { if (this[k] > 0) this[k] = Math.max(0, this[k] - dt); };
      ['boostT', 'invT', 'shrinkT', 'sigmaT', 'ghostT', 'shieldT', 'missileT', 'smokeT', 'goldT', 'squashT', 'wallT', 'miniT', 'hopT'].forEach(tick);
      if (a.hurtFace > 0) a.hurtFace -= dt;
      if (a.throwT > 0) a.throwT -= dt;

      // ---------- falling off the track ----------
      if (this.falling > 0) {
        this.falling += dt;
        this.fallV += G * 0.9 * dt;
        this.fallY -= this.fallV * dt;
        this.fallX += this.fallVx * dt;
        if (this.falling > 1.5) this.respawn(track);
        return;
      }
      if (this.respawnT > 0) {
        this.respawnT -= dt;
        this.h = Math.max(0, this.h - dt * 5);
        this.spd = 0; this.lat = 0;
        this.yaw = U.damp(this.yaw, 0, 8, dt);
        if (this.respawnT <= 0) { this.h = 0; this.grounded = true; this.invT = 1.2; }
        return;
      }

      const locked = (race && !race.go) || this.finished && this.ctrl !== 'cpu' && false;
      const canDrive = !locked && this.hitT <= 0;
      let steer = canDrive ? inp.steer : 0;
      if (this.mirror) steer = -steer;
      this.steerSm = U.damp(this.steerSm, steer, 14, dt);

      // ---------- speed ----------
      const surfFlags = fr.flags;
      this.offroad = Math.abs(this.d) > halfW + 0.3 && this.grounded;
      this.surface = this.offroad ? 'off' : (surfFlags & track.F.ICE) ? 'ice' : (surfFlags & track.F.WATER) ? 'water' : (surfFlags & track.F.DIRT) ? 'dirt' : 'road';
      let top = this.topSpeed;
      let accelK = 1;
      if (this.offroad && !this.boosting && this.trick === 0) { top *= 0.5 + this.stats.grip * 0.02; accelK = 0.6; }
      if (this.shrinkT > 0) top *= 0.72;
      if (this.squashT > 0) top *= 0.6;
      if (this.boostT > 0) top *= this.boostKind === 'pad' ? 1.3 : 1.36;
      if (this.sigmaT > 0) top *= 1.22;
      if (this.goldT > 0) top *= 1.33;
      if (this.missileT > 0) top *= 1.6;
      if (race && race.rubber) top *= race.rubber(this);
      const gas = canDrive ? (this.missileT > 0 ? 1 : inp.gas) : 0;
      const brake = canDrive ? inp.brake : 0;
      const A = (14 + this.stats.accel * 2.0) * accelK;
      if (this.boosting && this.spd < top) this.spd = Math.min(top, this.spd + 45 * dt);
      else if (brake > 0.1 && gas < 0.5) {
        if (this.spd > 0) this.spd = Math.max(-10, this.spd - 34 * brake * dt);
        else this.spd = Math.max(-10, this.spd - 14 * brake * dt);
      } else if (gas > 0.05 && this.spd < top * gas) {
        const k = U.clamp(1.15 - this.spd / top, 0.12, 1);
        this.spd = Math.min(top * gas, this.spd + A * k * gas * dt);
      } else if (this.spd > top) {
        this.spd = Math.max(top, this.spd - 16 * dt);
      } else {
        // let go of the gas: slow down gently
        this.spd = U.approach(this.spd, 0, (this.grounded ? 7 : 1) * dt);
      }
      if (brake > 0.1 && gas >= 0.5) this.spd = U.approach(this.spd, top * 0.55, 20 * dt);
      if (this.hitT > 0) {
        this.hitT -= dt;
        this.spd = U.approach(this.spd, 0, (this.hitKind === 'spin' ? 30 : 20) * dt);
        this.hitSpin += dt * (this.hitKind === 'spin' ? 13 : 8);
        if (this.hitT <= 0) { this.hitT = 0; this.hitSpin = 0; }
      }
      this.speedFrac = U.clamp(this.spd / (CC[this.cc] || 33), -1, 2);

      // ---------- steering ----------
      const handling = 1.55 + this.stats.handling * 0.075;
      const spdAbs = Math.abs(this.spd);
      const lowSpeedK = U.clamp(spdAbs / 9, 0, 1);
      const highSpeedK = 1 - 0.22 * U.clamp((spdAbs - 20) / 20, 0, 1);
      let yawRate;
      if (dr.dir !== 0) {
        // drifting: you always turn, steering makes it tighter or wider
        const into = this.steerSm * dr.dir;            // 1 = steering into the drift
        const r = U.lerp(0.42, 1.22, (into + 1) / 2);
        yawRate = dr.dir * handling * r * (0.85 + this.stats.grip * 0.012);
      } else {
        yawRate = this.steerSm * handling * lowSpeedK * highSpeedK;
      }
      if (this.spd < -0.5) yawRate = -yawRate * 0.7;
      if (!this.grounded) yawRate *= this.gliding ? 0.7 : 0.45;
      if (this.hitT > 0) yawRate = 0;
      if (this.missileT > 0) yawRate = 0;
      // smart steering: keep the racer on the road
      if (this.smart && this.grounded && canDrive && this.missileT <= 0) {
        const side = this.spd * Math.sin(this.yaw) + this.lat * Math.cos(this.yaw);
        const future = this.d + side * 0.45;
        const openL = surfFlags & track.F.FALL_L, openR = surfFlags & track.F.FALL_R;
        const limL = openL ? -(halfW - 1.6) : -(halfW + fr.offL - 1.5), limR = openR ? halfW - 1.6 : halfW + fr.offR - 1.5;
        if (future > limR) yawRate -= (future - limR) * 0.5;
        if (future < limL) yawRate += (limL - future) * 0.5;
        // don't point too far away from the road direction near open edges
        if ((openL || openR) && Math.abs(this.yaw) > 0.9 && dr.dir === 0) yawRate -= Math.sign(this.yaw) * 1.2;
      }
      this.yawRate = U.damp(this.yawRate, yawRate, dr.dir ? 7 : 16, dt);
      const dYaw = this.yawRate * dt;
      this.yaw += dYaw;
      // the velocity mostly follows where the kart points; the rest slides
      const follow = dr.dir ? 0.55 : this.surface === 'ice' ? 0.35 : this.surface === 'water' ? 0.75 : 0.92;
      const rot = dYaw * follow;
      const sp = this.spd, la = this.lat;
      const extra = dYaw - rot;
      // the part that doesn't follow becomes sideways slide
      this.spd = sp * Math.cos(extra) + la * Math.sin(extra);
      this.lat = -sp * Math.sin(extra) + la * Math.cos(extra);
      const grip = dr.dir ? 4 : this.surface === 'ice' ? 1.6 : 9 + this.stats.grip * 0.4;
      const latBefore = this.lat;
      this.lat = U.damp(this.lat, 0, grip, dt);
      // don't lose all the slide speed: give a bit back as forward speed
      if (this.spd > 0 && this.spd < top) this.spd = Math.min(top, this.spd + Math.abs(latBefore - this.lat) * 0.35);

      // ---------- drifting & hopping ----------
      const driftPress = canDrive && inp.drift && !this.prevIn.drift;
      if (driftPress && this.grounded && this.hopT <= 0 && this.trickWindow <= 0) {
        this.vh = 4.2; this.grounded = false; this.hopT = 0.32; dr.pending = true; dr.pendDir = 0;
        this.events.push({ type: 'hop' });
      }
      if (dr.pending && Math.abs(steer) > 0.25) dr.pendDir = Math.sign(steer);
      if (dr.dir !== 0) {
        const into = this.steerSm * dr.dir;
        dr.charge += dt * (0.75 + 0.55 * Math.max(0, into)) * (0.85 + this.stats.turbo * 0.03);
        const lvl = dr.charge > DRIFT_LEVELS[3] ? 3 : dr.charge > DRIFT_LEVELS[2] ? 2 : dr.charge > DRIFT_LEVELS[1] ? 1 : 0;
        if (lvl > dr.level) this.events.push({ type: 'sparklevel', level: lvl });
        dr.level = lvl;
        if (!inp.drift || spdAbs < 7 || !canDrive) {
          if (dr.level > 0 && canDrive) { this.boost(DRIFT_BOOST[dr.level], 'mini' + dr.level); this.miniT = DRIFT_BOOST[dr.level]; }
          this.cancelDrift();
        }
      }

      // ---------- tricks ----------
      if (this.trickWindow > 0) {
        this.trickWindow -= dt;
        if (canDrive && driftPress && !this.trickDone) {
          this.trickDone = true; this.trick = 0.0001; this.trickType = Math.floor(Math.random() * 5);
          this.events.push({ type: 'trick' });
        }
      }
      if (this.trick > 0) this.trick += dt;

      // ---------- up and down ----------
      const openEdge = (this.d < -halfW - 0.4 && (surfFlags & track.F.FALL_L)) || (this.d > halfW + 0.4 && (surfFlags & track.F.FALL_R));
      const ground = track.hasGround(this.s) && !openEdge;
      const ramp = track.rampAt(this.s, this.d);
      const gh = ramp ? ramp.h : 0;
      if (this.grounded) {
        if (!ground && !(this.onRamp && this.h > 0.2)) { this.grounded = false; this.vh = Math.min(this.vh, 0); this.onRamp = null; }
        else if (ramp) { this.h = gh; this.vh = Math.max(0, this.spd) * ramp.slope; this.onRamp = ramp.ramp; }
        else if (this.onRamp && this.h > 0.2) {
          // flying off the end of a ramp!
          const r = this.onRamp; this.onRamp = null;
          this.grounded = false; this.launchRamp = r;
          const spd = Math.max(8, this.spd);
          let vh = spd * (r.height / (r.s1 - r.s0)) * 1.2 + 2;
          if (r.gap) {
            const need = (G * ((race && race.grav) || 1) * (r.glide ? 0.35 : 1)) * (r.gap + 10) / Math.max(18, spd) / 2;
            vh = Math.max(vh, need * (spd > 14 ? 1.1 : 0.7));
          }
          this.vh = vh; this.gliding = r.glide;
          this.trickWindow = 0.4; this.trickDone = false;
          if (r.glide) this.events.push({ type: 'glide' });
        } else { this.h = 0; this.vh = 0; this.onRamp = null; }
        this.airT = 0;
      }
      if (!this.grounded) {
        this.airT += dt;
        const g = (this.gliding ? G * 0.32 : G) * ((race && race.grav) || 1);
        this.vh -= g * dt;
        if (this.gliding) this.vh = Math.max(this.vh, -6);
        this.h += this.vh * dt;
        if (this.h <= gh && ground && this.vh <= 0) {
          // landing
          const hard = -this.vh;
          this.h = gh; this.grounded = true; this.gliding = false; this.launchRamp = null;
          a.squash = Math.min(1, hard / 14);
          this.events.push({ type: 'land', hard });
          if (this.trick > 0) { this.boost(0.75 + this.stats.turbo * 0.03, 'trick'); this.trick = 0; }
          // drift starts when you land from a hop while steering
          if (dr.pending) {
            dr.pending = false;
            const dir = dr.pendDir || (Math.abs(steer) > 0.25 ? Math.sign(steer) : 0);
            if (inp.drift && dir && spdAbs > 9 && canDrive) { dr.dir = dir; dr.charge = 0; dr.level = 0; this.events.push({ type: 'driftstart' }); }
          }
          this.vh = 0;
        } else if (!ground && this.h < -7) {
          this.startFall(track);
          return;
        }
      } else if (dr.pending && this.hopT <= 0) dr.pending = false;

      // ---------- move ----------
      const fwd = this.spd * Math.cos(this.yaw) - this.lat * Math.sin(this.yaw);
      const side = this.spd * Math.sin(this.yaw) + this.lat * Math.cos(this.yaw);
      const kd = U.clamp(1 - fr.k * this.d, 0.35, 2.5);
      const ds = fwd * dt / kd;
      const oldP = HG.V.e.copy(fr.p);
      this.dist += ds;
      this.s = track.wrap(this.dist);
      this.d += side * dt;
      this.yaw -= fr.k * ds;
      this.yaw = U.wrapAngle(this.yaw);
      // while flying, the road moving up or down under us changes our height
      if (!this.grounded) {
        const nf = track.frame(this.s, Kart.fr2);
        if (nf.n.y > 0.6) this.h += oldP.sub(nf.p).dot(nf.n);
      }

      // ---------- walls ----------
      const fr2 = track.frame(this.s, Kart.fr2);
      const hw = fr2.w / 2, rad = 1.1 * (this.shrinkT > 0 ? 0.6 : 1);
      const openL = fr2.flags & track.F.FALL_L, openR = fr2.flags & track.F.FALL_R;
      let limL = -(hw + fr2.offL) + rad, limR = hw + fr2.offR - rad;
      // smart steering (and the CPUs) get invisible rails at open edges
      if (this.smart || this.ctrl === 'cpu' || this.missileT > 0) { if (openL) limL = -hw + 0.6; if (openR) limR = hw - 0.6; }
      // flying over a gap: no walls
      const inGap = !track.hasGround(this.s);
      // flying over a gap: invisible side walls so you land on the road
      if (inGap && !this.falling) { const lim = hw + 1; if (Math.abs(this.d) > lim) { this.d = Math.sign(this.d) * lim; this.lat = 0; this.yaw *= 0.9; } }
      if (!inGap && this.h < 3) {
        if (this.d > limR && !(openR && !(this.smart || this.ctrl === 'cpu' || this.missileT > 0))) this.wallHit(limR, 1);
        else if (this.d < limL && !(openL && !(this.smart || this.ctrl === 'cpu' || this.missileT > 0))) this.wallHit(limL, -1);
      }
      // too far off an open edge = fall
      if (this.d > hw + 6 || this.d < -hw - 6) { if (this.h < 1) this.startFall(track); }

      // ---------- boost pads ----------
      if (this.grounded && track.boosts.length) {
        for (const b of track.boosts) {
          const a2 = track.diff(b.s, this.s);
          if (a2 >= 0 && a2 <= b.len) {
            const c = b.lane * hw, half = b.wide ? hw * 0.55 : hw * 0.32;
            if (Math.abs(this.d - c) < half) { if (this.boostT < 0.9 || this.boostKind !== 'pad') { this.boost(1.1, 'pad'); } }
          }
        }
      }

      // ---------- remember a safe place to come back to ----------
      if (this.grounded && !this.offroad && ground && Math.abs(this.d) < hw - 1 && !ramp && this.hitT <= 0) {
        this.lastSafe.dist = this.dist; this.lastSafe.d = this.d;
      }
      // ---------- wrong way ----------
      if (Math.abs(this.yaw) > 1.9 && this.spd > 4) this.wrongT += dt; else this.wrongT = Math.max(0, this.wrongT - dt * 2);
      this.wrongWay = this.wrongT > 1.2;

      // ---------- animation numbers ----------
      a.lean = U.damp(a.lean, -this.steerSm * 0.5 - dr.dir * 0.25, 8, dt);
      const pitchT = !this.grounded ? U.clamp(-this.vh * 0.02, -0.35, 0.35) : ramp ? -ramp.slope : 0;
      a.pitch = U.damp(a.pitch, pitchT, 6, dt);
      a.squash = U.damp(a.squash, 0, 7, dt);
      this.prevIn.drift = inp.drift; this.prevIn.item = inp.item;
    }

    wallHit(lim, side) {
      // how fast we hit the wall
      const into = (this.spd * Math.sin(this.yaw) + this.lat * Math.cos(this.yaw)) * side;
      this.d = lim;
      if (into <= 0) return;
      const vT = this.spd * Math.cos(this.yaw) - this.lat * Math.sin(this.yaw);
      let vR = (this.spd * Math.sin(this.yaw) + this.lat * Math.cos(this.yaw));
      vR = -vR * 0.3;
      const hard = into > 6;
      const vT2 = vT * (hard ? 0.86 : 0.97);
      // turn the kart to slide along the wall
      if (Math.abs(this.yaw) < Math.PI / 2) this.yaw *= hard ? 0.55 : 0.8;
      this.spd = vT2 * Math.cos(this.yaw) + vR * Math.sin(this.yaw);
      this.lat = -vT2 * Math.sin(this.yaw) + vR * Math.cos(this.yaw);
      if (hard && this.drift.dir) this.cancelDrift();
      if (this.wallT <= 0) { this.events.push({ type: 'wall', hard: into }); this.wallT = 0.25; }
    }

    startFall(track) {
      if (this.falling > 0) return;
      const P = track.point(this.s, this.d, this.h, new THREE.Vector3());
      this.fallPos = P; this.fallY = 0; this.fallX = 0; this.fallV = Math.max(0, -this.vh); this.fallVx = 0;
      this.falling = 0.001; this.cancelDrift(); this.boostT = 0;
      this.events.push({ type: 'fall' });
      this.fallCount = (this.fallCount || 0) + 1; this.lastFall = Math.round(this.s) + '/' + this.d.toFixed(1);
    }

    respawn(track) {
      this.falling = 0;
      let dist = this.lastSafe.dist - 4;
      // make sure we land on real road
      for (let k = 0; k < 40 && !track.hasGround(track.wrap(dist)); k++) dist -= 4;
      this.dist = dist; this.s = track.wrap(dist);
      const fr = track.frame(this.s, Kart.fr);
      this.d = U.clamp(this.lastSafe.d, -fr.w / 4, fr.w / 4);
      this.h = 6; this.vh = 0; this.grounded = false; this.respawnT = 1.4;
      this.yaw = 0; this.spd = 0; this.lat = 0; this.hitT = 0; this.trick = 0; this.gliding = false;
      this.onRamp = null; this.launchRamp = null;
      this.events.push({ type: 'respawn' });
    }

    // where we are in the world, and which way we face
    worldPose(track, pos, quat, hoverBob) {
      if (this.falling > 0) {
        pos.copy(this.fallPos);
        const fr = track.frame(this.s, Kart.fr3);
        pos.addScaledVector(fr.n, this.fallY).addScaledVector(fr.r, this.fallX);
        this._basis(fr, quat);
        return;
      }
      const fr = track.frame(this.s, Kart.fr3);
      pos.copy(fr.p).addScaledVector(fr.r, this.d).addScaledVector(fr.n, this.h + 0.55 + (hoverBob || 0));
      this._basis(fr, quat);
    }
    _basis(fr, quat) {
      const f = HG.V.a.copy(fr.t).multiplyScalar(Math.cos(this.yaw)).addScaledVector(fr.r, Math.sin(this.yaw)).normalize();
      const up = HG.V.b.copy(fr.n);
      const right = HG.V.c.crossVectors(f, up).normalize();
      // three.js objects face +z; build a matrix with x = -right (left), y = up, z = forward
      HG.V.m.makeBasis(right.negate(), up, f);
      quat.setFromRotationMatrix(HG.V.m);
    }
  }
  Kart.fr = HG.Track.makeFrame(); Kart.fr2 = HG.Track.makeFrame(); Kart.fr3 = HG.Track.makeFrame();
  Kart.CC = CC;
  Kart.DRIFT_LEVELS = DRIFT_LEVELS;
  return Kart;
})();
