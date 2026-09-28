// ============================================================
//  DEAD ACRES — ZOMBIES and ANIMALS
//  The host's computer decides what every zombie does.
//  Everyone else just sees where they are (from "snapshots").
// ============================================================
window.DA = window.DA || {};

DA.Zombies = (function () {
  const U = DA.U, C = DA.Collide, Mo = DA.Models;
  let W, scene, A;

  // ---------- zombie types (change the numbers!) ----------
  // hp = health, walk / chase = speed, dmg = damage to you, smash = damage to walls
  const KINDS = {
    walker: { hp: 60, walk: 0.9, chase: 2.3, nightChase: 3.1, dmg: 12, reach: 1.5, r: 0.35, smash: 14, sight: 26 },
    runner: { hp: 45, walk: 1.4, chase: 5.0, nightChase: 5.6, dmg: 9, reach: 1.4, r: 0.32, smash: 9, sight: 32 },
    brute: { hp: 240, walk: 0.8, chase: 2.1, nightChase: 2.6, dmg: 30, reach: 2.0, r: 0.55, smash: 50, sight: 22 },
  };
  const KIND_NAMES = ['walker', 'runner', 'brute'];
  const ANIMALS = {
    deer: { hp: 40, walk: 1.2, run: 7.5, scare: 18, r: 0.45, drops: [['rawmeat', 3], ['hide', 2]] },
    rabbit: { hp: 10, walk: 0.6, run: 5.5, scare: 9, r: 0.2, drops: [['rawmeat', 1]] },
  };
  const ANIMAL_NAMES = ['deer', 'rabbit'];
  const MAXZ = DA.lowGfx ? 28 : 42;

  const Z = {
    KINDS, ANIMALS,
    zombies: new Map(),     // id -> zombie (host: brain + avatar, client: avatar only)
    animals: new Map(),
    nextId: 1,
    kills: 0,
  };

  // ============================================================
  //  WHAT YOU SEE: a zombie / animal body that moves its arms
  //  and legs. Works the same on every computer.
  // ============================================================
  const templates = {};
  function bodyFor(kind, v) {
    const key = kind + v;
    if (!templates[key]) {
      if (kind === 'deer') templates[key] = Mo.People.deer().root;
      else if (kind === 'rabbit') templates[key] = Mo.People.rabbit().root;
      else templates[key] = Mo.People.zombie(kind, v).root;
    }
    const root = templates[key].clone(true);
    const get = (n) => root.getObjectByName(n);
    return { root, body: get('body'), hips: get('hips'), torso: get('torso'), head: get('head'), armL: get('armL'), armR: get('armR'), legL: get('legL'), legR: get('legR'), legs: [1, 2, 3, 4].map((i) => get('leg' + i)).filter(Boolean) };
  }

  class Avatar {
    constructor(kind, v, isAnimal) {
      this.kind = kind; this.isAnimal = isAnimal;
      this.p = bodyFor(kind, v);
      this.root = this.p.root;
      this.phase = Math.random() * 6;
      this.anim = 0; this.prevAnim = 0;
      this.animT = 0; this.hitT = 0; this.deadT = 0;
      this.groanT = U.rand(2, 10);
      this.tx = 0; this.ty = 0; this.tz = 0; this.try = 0;
      this.lean = U.rand(-0.15, 0.15);
      this.speed = 0;
      scene.add(this.root);
    }
    place(x, y, z, ry) { this.root.position.set(x, y, z); this.root.rotation.y = ry; this.tx = x; this.ty = y; this.tz = z; this.try = ry; }
    remove() { scene.remove(this.root); }
    hit() { this.hitT = 0.3; }

    update(dt, smooth) {
      const r = this.root;
      if (smooth) { // clients: glide to where the host says it is
        const k = Math.min(1, dt * 10);
        const ox = r.position.x, oz = r.position.z;
        r.position.x += (this.tx - r.position.x) * k; r.position.y += (this.ty - r.position.y) * k; r.position.z += (this.tz - r.position.z) * k;
        r.rotation.y += U.angleDiff(r.rotation.y, this.try) * k;
        this.speed = Math.hypot(r.position.x - ox, r.position.z - oz) / Math.max(dt, 1e-3);
      }
      if (this.anim !== this.prevAnim) {
        if (this.anim === 3 && !this.isAnimal) A.zombieAttack(r.position.x, r.position.z, this.kind);
        if (this.anim === 4) { if (!this.isAnimal) A.zombieDie(r.position.x, r.position.z); else A.animal(r.position.x, r.position.z); }
        this.prevAnim = this.anim; this.animT = 0;
      }
      this.animT += dt;
      if (this.isAnimal) return this.updateAnimal(dt);
      const p = this.p, a = this.anim;
      // groans
      this.groanT -= dt;
      if (this.groanT <= 0 && a !== 4) {
        this.groanT = a === 2 ? U.rand(2, 4) : U.rand(5, 14);
        A.zombie(r.position.x, r.position.z, this.kind, a === 2);
      }
      const runner = this.kind === 'runner', brute = this.kind === 'brute';
      let legA = 0, armBase = 1.35, armSwing = 0.12, lean = 0.12 + this.lean * 0.3, freq = 5;
      if (a === 1) { legA = 0.42; freq = brute ? 3.6 : 4.6; }
      if (a === 2) { legA = runner ? 0.95 : 0.6; freq = runner ? 11 : 6.5; lean = runner ? 0.45 : 0.25; armSwing = runner ? 0.5 : 0.2; armBase = runner ? 1.0 : 1.4; }
      if (a === 0) { legA = 0; armBase = 0.35; armSwing = 0.05; freq = 1.5; }
      this.phase += dt * freq;
      const sw = Math.sin(this.phase);
      p.legL.rotation.x = sw * legA; p.legR.rotation.x = -sw * legA;
      p.armL.rotation.x = armBase + Math.sin(this.phase + 1) * armSwing;
      p.armR.rotation.x = armBase + Math.sin(this.phase + 2.5) * armSwing;
      p.armL.rotation.z = -0.1; p.armR.rotation.z = 0.1;
      if (a === 3) { // attack: arms swing down
        const t = Math.min(1, this.animT / 0.45);
        const sweep = t < 0.6 ? 1.3 + 1.1 * (t / 0.6) : 2.4 - (t - 0.6) / 0.4 * 1.9;
        p.armL.rotation.x = sweep; p.armR.rotation.x = sweep + 0.2;
        lean = 0.35;
      }
      p.body.rotation.x = 0;
      p.torso.rotation.x = -lean; p.torso.rotation.y = Math.sin(this.phase * 0.5) * 0.08;
      p.head.rotation.z = this.lean + Math.sin(this.phase * 0.3) * 0.1;
      p.body.position.y = Math.abs(Math.cos(this.phase)) * (a === 2 ? 0.06 : 0.02);
      if (this.hitT > 0) { this.hitT -= dt; p.torso.rotation.x = 0.4; p.head.rotation.x = 0.4; } else p.head.rotation.x = 0;
      if (a === 4) { // dead: fall over backwards
        const t = Math.min(1, this.animT / 0.7);
        p.body.rotation.x = t * t * 1.5;
        p.body.position.y = 0.1 * t;
        p.armL.rotation.x = 2.8 * t; p.armR.rotation.x = 2.6 * t;
        p.legL.rotation.x = 0.1; p.legR.rotation.x = -0.1;
        if (this.animT > 5) r.position.y -= dt * 0.3;
      }
    }

    updateAnimal(dt) {
      const p = this.p, a = this.anim;
      const freq = a === 2 ? 14 : 5;
      this.phase += dt * freq;
      if (this.kind === 'rabbit') {
        p.body.position.y = a ? Math.abs(Math.sin(this.phase)) * (a === 2 ? 0.25 : 0.08) : 0;
        p.body.rotation.x = a ? Math.sin(this.phase) * 0.2 : 0;
      } else {
        const L = a === 2 ? 0.7 : a === 1 ? 0.35 : 0;
        p.legs.forEach((g, i) => (g.rotation.x = Math.sin(this.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.5 : 0)) * L));
        if (p.head) p.head.rotation.x = a === 0 ? 0.6 + Math.sin(this.animT) * 0.1 : 0; // eating grass
        p.body.position.y = a === 2 ? Math.abs(Math.sin(this.phase)) * 0.12 : 0;
      }
      if (a === 4) { const t = Math.min(1, this.animT / 0.5); p.body.rotation.z = t * 1.5; p.body.position.y = 0; }
      else p.body.rotation.z = 0;
    }
  }
  Z.Avatar = Avatar;

  // ============================================================
  //  HOST ONLY: the zombie brains
  // ============================================================
  const players = () => DA.Game.players;

  // is there a straight line from a to b? (walls, trees, cars block it)
  function canSee(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const d = Math.hypot(dx, dy, dz);
    if (d < 0.5) return true;
    const h = C.ray(ax, ay, az, dx / d, dy / d, dz / d, d - 0.4, (o) => o.solid && o.kind !== 'bush' && o.kind !== 'floor');
    return !h;
  }

  function groundY(x, z, r, y) {
    const g = Math.max(W.heightAt(x, z), C.groundAt(x, z, r, y));
    return g;
  }

  // is this spot free for a body with radius r?
  function freeSpot(x, z, r, y) {
    if (!W.inside(x, z)) return false;
    if (W.heightAt(x, z) < W.WATER - 0.7) return false;
    let ok = true;
    C.near(x, z, r + 0.05, (o) => {
      if (!o.solid || o.y1 <= y + 0.45 || o.y0 >= y + 1.7) return;
      if (C.pushOut(o, x, z, r)) { ok = false; return false; }
    });
    return ok;
  }

  function spawnZombie(kind, x, z, horde) {
    if (Z.zombies.size >= MAXZ + (horde ? 25 : 0)) return null;
    const k = KINDS[kind];
    const v = U.randInt(0, 7);
    const y = groundY(x, z, k.r, W.heightAt(x, z) + 1);
    const zb = {
      id: Z.nextId++, kind, v, x, y, z, ry: Math.random() * 6.28, hp: k.hp, k,
      state: 'wander', target: null, tx: x, tz: z, lastX: x, lastZ: z, aware: 0, senseT: Math.random() * 0.3,
      wanderT: U.rand(1, 5), atkT: 0, cool: 0, stuckT: 0, smash: null, smashT: 0, deadT: 0, kvx: 0, kvz: 0, stagger: 0,
      horde: !!horde, anim: 0, farT: 0, hitFlag: 0,
    };
    zb.avatar = new Avatar(kind, v, false);
    zb.avatar.place(x, y, z, zb.ry);
    Z.zombies.set(zb.id, zb);
    return zb;
  }
  Z.spawnZombie = spawnZombie;

  function removeZombie(id) {
    const zb = Z.zombies.get(id);
    if (!zb) return;
    zb.avatar.remove();
    Z.zombies.delete(id);
  }

  // find the closest player this zombie can notice
  function sense(zb, night) {
    let best = null, bestD = 1e9;
    for (const p of players().values()) {
      if (!p.alive || p.inHeli) continue;
      const d = U.dist(zb.x, zb.z, p.x, p.z);
      if (d > 60) continue;
      let range = zb.k.sight * (night ? 0.6 : 1);
      if (p.flags & 4) range = Math.max(range, night ? 38 : range);          // holding a light
      if (p.flags & 1) range = Math.max(range, 16);                          // running = noisy
      if (p.flags & 2) range = Math.max(range, 20);                          // chopping, hitting = noisy
      if (p.flags & 16) range *= 0.6;                                        // crouching... sneaky
      if (zb.horde) range = 200;
      if (d > range) continue;
      // close + noisy = heard through walls. Otherwise it must see you
      const heard = d < 4 || (d < 12 && (p.flags & 3));
      if (!heard && !zb.horde && !canSee(zb.x, zb.y + 1.6, zb.z, p.x, p.y + 1.4, p.z)) continue;
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  // try a few directions to walk around things
  const probeAngles = [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6];
  function steer(zb, dx, dz) {
    const base = Math.atan2(dx, dz);
    for (const a of probeAngles) {
      const ang = base + a;
      const px = zb.x + Math.sin(ang) * 1.1, pz = zb.z + Math.cos(ang) * 1.1;
      if (freeSpot(px, pz, zb.k.r, zb.y)) return [Math.sin(ang), Math.cos(ang)];
    }
    return [dx, dz];
  }

  // a player-built wall / door right in front of the zombie?
  function buildInFront(zb, dirx, dirz) {
    let found = null;
    const px = zb.x + dirx * 0.9, pz = zb.z + dirz * 0.9;
    C.near(px, pz, zb.k.r + 0.6, (o) => {
      if (o.kind !== 'build' || !o.solid) return;
      if (C.pushOut(o, px, pz, zb.k.r + 0.5)) { found = o.ref; return false; }
    });
    return found;
  }

  function updateZombie(zb, dt, night) {
    const k = zb.k;
    zb.hitFlag = 0;
    if (zb.state === 'dead') {
      zb.deadT += dt;
      if (zb.deadT > 7) removeZombie(zb.id);
      return;
    }
    zb.cool -= dt; zb.stagger -= dt;
    // --- senses (a few times a second)
    zb.senseT -= dt;
    if (zb.senseT <= 0) {
      zb.senseT = 0.3 + Math.random() * 0.2;
      const p = sense(zb, night);
      if (p) {
        if (!zb.target) zb.avatar.groanT = Math.min(zb.avatar.groanT, 0.3);
        zb.target = p.pid; zb.lastX = p.x; zb.lastZ = p.z; zb.aware = 8;
      }
    }
    zb.aware -= dt;
    let tp = zb.target ? players().get(zb.target) : null;
    if (tp && (!tp.alive || tp.inHeli)) { tp = null; zb.target = null; }
    if (tp && zb.aware > 0) { zb.lastX = tp.x; zb.lastZ = tp.z; zb.state = 'chase'; }
    else if (zb.aware > -6 && zb.target) { zb.state = 'search'; tp = null; }
    else { zb.state = 'wander'; zb.target = null; tp = null; }

    // --- where do I want to go?
    let gx = zb.x, gz = zb.z, speed = 0;
    if (zb.state === 'chase') { gx = zb.lastX; gz = zb.lastZ; speed = night ? (k.nightChase || k.chase) : k.chase; }
    else if (zb.state === 'search') { gx = zb.lastX; gz = zb.lastZ; speed = k.walk * 1.4; if (U.dist(zb.x, zb.z, gx, gz) < 1.5) zb.aware = -7; }
    else {
      zb.wanderT -= dt;
      if (zb.wanderT <= 0) {
        zb.wanderT = U.rand(4, 12);
        if (Math.random() < 0.35) { zb.tx = zb.x; zb.tz = zb.z; }
        else { const a = Math.random() * 6.28, d = U.rand(4, 14); zb.tx = zb.x + Math.sin(a) * d; zb.tz = zb.z + Math.cos(a) * d; }
      }
      gx = zb.tx; gz = zb.tz; speed = k.walk;
    }
    let dx = gx - zb.x, dz = gz - zb.z;
    const dist = Math.hypot(dx, dz);
    // --- attack the player
    if (tp) {
      const pd = U.dist(zb.x, zb.z, tp.x, tp.z);
      if (zb.atkT > 0) {
        zb.atkT -= dt;
        speed = 0;
        if (zb.atkT <= 0) {
          if (pd < k.reach + 0.6 && Math.abs(tp.y - zb.y) < 1.6) DA.Game.hurtPlayer(tp.pid, k.dmg, zb.x, zb.z, zb.kind);
          zb.cool = zb.kind === 'runner' ? 0.8 : 1.3;
        }
      } else if (pd < k.reach && zb.cool <= 0 && Math.abs(tp.y - zb.y) < 1.6) {
        zb.atkT = 0.45; speed = 0;
      }
      if (pd < k.reach * 0.8) speed = 0;
    }
    let moving = dist > 0.6 && speed > 0;
    if (zb.stagger > 0) moving = false;
    // --- smash a wall that's in the way
    if (zb.smash) {
      const b = DA.Game.state.builds[zb.smash];
      if (!b || !tp && zb.state !== 'search') zb.smash = null;
      else {
        moving = false;
        zb.ry += U.angleDiff(zb.ry, Math.atan2(-(b.x - zb.x), -(b.z - zb.z))) * Math.min(1, dt * 6);
        zb.smashT -= dt;
        if (zb.smashT <= 0) { zb.smashT = 1.3; zb.atkT = 0.01; zb.anim = 3; DA.Game.damageBuild(b.id, k.smash, zb.x, zb.z); }
        if (zb.smashT < 0.9) zb.anim = 1;
      }
    }
    if (moving) {
      dx /= dist; dz /= dist;
      const [sx, sz] = steer(zb, dx, dz);
      // don't bunch up
      let ax = 0, az = 0;
      for (const o of Z.zombies.values()) {
        if (o === zb || o.state === 'dead') continue;
        const ox = zb.x - o.x, oz = zb.z - o.z, od = Math.hypot(ox, oz);
        const m = k.r + o.k.r + 0.1;
        if (od < m && od > 1e-4) { ax += ox / od * (m - od); az += oz / od * (m - od); }
      }
      let sp = speed;
      if (W.heightAt(zb.x, zb.z) < W.WATER - 0.3) sp *= 0.5;
      if (zb.onSpikes) sp *= 0.5;
      const ox = zb.x, oz = zb.z;
      let nx = zb.x + sx * sp * dt + ax * 0.5 + zb.kvx * dt, nz = zb.z + sz * sp * dt + az * 0.5 + zb.kvz * dt;
      [nx, nz] = C.resolve(nx, nz, k.r, zb.y, zb.y + 1.8 * (zb.kind === 'brute' ? 1.3 : 1));
      if (!W.inside(nx, nz)) { nx = ox; nz = oz; }
      zb.x = nx; zb.z = nz;
      const moved = Math.hypot(nx - ox, nz - oz);
      zb.ry += U.angleDiff(zb.ry, Math.atan2(-sx, -sz)) * Math.min(1, dt * 6);
      // stuck? maybe a wall we can smash
      if (moved < sp * dt * 0.3) {
        zb.stuckT += dt;
        if (zb.stuckT > 0.8 && tp) {
          const b = buildInFront(zb, dx, dz) || buildInFront(zb, sx, sz);
          if (b) { zb.smash = b.id; zb.smashT = 0.5; }
          zb.stuckT = 0;
        }
        if (zb.stuckT > 3 && zb.state === 'wander') { zb.wanderT = 0; zb.stuckT = 0; }
      } else zb.stuckT = 0;
      zb.anim = zb.state === 'chase' ? 2 : 1;
    } else if (!zb.smash) zb.anim = 0;
    if (zb.atkT > 0) zb.anim = 3;
    zb.kvx *= Math.max(0, 1 - dt * 6); zb.kvz *= Math.max(0, 1 - dt * 6);
    if (tp && !moving && !zb.smash) zb.ry += U.angleDiff(zb.ry, Math.atan2(-(tp.x - zb.x), -(tp.z - zb.z))) * Math.min(1, dt * 8);
    zb.y = groundY(zb.x, zb.z, k.r, zb.y);
    // spikes!
    zb.onSpikes = false;
    C.near(zb.x, zb.z, k.r, (o) => {
      if (o.kind === 'spikes' && o.ref && Math.abs(o.x - zb.x) < 1.2 && Math.abs(o.z - zb.z) < 1.2) {
        zb.onSpikes = true;
        DA.Game.spikeHit(o.ref, zb, dt);
        return false;
      }
    });
    zb.avatar.anim = zb.anim;
    const r = zb.avatar.root;
    r.position.set(zb.x, zb.y, zb.z); r.rotation.y = zb.ry;
  }

  // someone hit a zombie (host)
  Z.hit = function (id, dmg, kx, kz, byPid) {
    const zb = Z.zombies.get(id);
    if (!zb || zb.state === 'dead') return false;
    zb.hp -= dmg;
    zb.kvx += (kx || 0) * 4; zb.kvz += (kz || 0) * 4;
    zb.stagger = zb.kind === 'brute' ? 0.1 : 0.35;
    zb.hitFlag = 1;
    zb.avatar.hit();
    if (byPid && DA.Game.players.get(byPid)) { zb.target = byPid; zb.aware = 10; const p = DA.Game.players.get(byPid); zb.lastX = p.x; zb.lastZ = p.z; }
    if (zb.hp <= 0) {
      zb.state = 'dead'; zb.anim = 4; zb.avatar.anim = 4; zb.deadT = 0;
      DA.Game.zombieKilled(zb, byPid);
      return true;
    }
    return false;
  };

  // ---------- animals (host) ----------
  function spawnAnimal(kind, x, z) {
    const k = ANIMALS[kind];
    const y = W.heightAt(x, z);
    const an = { id: Z.nextId++, kind, x, y, z, ry: Math.random() * 6.28, hp: k.hp, k, state: 'graze', t: U.rand(1, 5), tx: x, tz: z, anim: 0, deadT: 0, fleeT: 0 };
    an.avatar = new Avatar(kind, 0, true);
    an.avatar.place(x, y, z, an.ry);
    Z.animals.set(an.id, an);
    return an;
  }
  function removeAnimal(id) { const a = Z.animals.get(id); if (a) { a.avatar.remove(); Z.animals.delete(id); } }
  function updateAnimal(an, dt) {
    const k = an.k;
    if (an.state === 'dead') { an.deadT += dt; if (an.deadT > 4) removeAnimal(an.id); return; }
    // run from people and zombies
    let fx = 0, fz = 0, scared = false;
    for (const p of players().values()) {
      if (!p.alive) continue;
      const d = U.dist(an.x, an.z, p.x, p.z);
      const range = k.scare * ((p.flags & 16) ? 0.4 : 1) * ((p.flags & 1) ? 1.5 : 1);
      if (d < range) { fx += (an.x - p.x) / d; fz += (an.z - p.z) / d; scared = true; }
    }
    if (scared) { an.fleeT = 4; an.fx = fx; an.fz = fz; }
    an.fleeT -= dt;
    let speed = 0, dx = 0, dz = 0;
    if (an.fleeT > 0) { speed = k.run; dx = an.fx; dz = an.fz; an.anim = 2; }
    else {
      an.t -= dt;
      if (an.t <= 0) {
        an.t = U.rand(3, 9);
        if (Math.random() < 0.5) { an.state = 'graze'; }
        else { an.state = 'walk'; const a = Math.random() * 6.28; an.tx = an.x + Math.sin(a) * 8; an.tz = an.z + Math.cos(a) * 8; }
      }
      if (an.state === 'walk') { dx = an.tx - an.x; dz = an.tz - an.z; if (Math.hypot(dx, dz) < 0.5) an.state = 'graze'; else speed = k.walk; }
      an.anim = speed ? 1 : 0;
    }
    if (speed) {
      const L = Math.hypot(dx, dz) || 1;
      dx /= L; dz /= L;
      const [sx, sz] = steer(an, dx, dz);
      let nx = an.x + sx * speed * dt, nz = an.z + sz * speed * dt;
      [nx, nz] = C.resolve(nx, nz, k.r, an.y, an.y + 1.2);
      if (!W.inside(nx, nz) || W.heightAt(nx, nz) < W.WATER) { an.fleeT = 0; an.state = 'graze'; }
      else { an.x = nx; an.z = nz; }
      an.ry += U.angleDiff(an.ry, Math.atan2(-sx, -sz)) * Math.min(1, dt * 8);
    }
    an.y = W.heightAt(an.x, an.z);
    an.avatar.anim = an.anim;
    an.avatar.root.position.set(an.x, an.y, an.z); an.avatar.root.rotation.y = an.ry;
  }
  Z.hitAnimal = function (id, dmg, byPid) {
    const an = Z.animals.get(id);
    if (!an || an.state === 'dead') return;
    an.hp -= dmg;
    an.fleeT = 5; an.fx = Math.random() - 0.5; an.fz = Math.random() - 0.5;
    if (an.hp <= 0) {
      an.state = 'dead'; an.anim = 4; an.avatar.anim = 4;
      DA.Game.animalKilled(an, byPid);
    }
  };

  // ---------- spawning (host) ----------
  let spawnT = 0, hordeLeft = 0, hordeT = 0;
  function randomSpot(p, dMin, dMax) {
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * 6.28, d = U.rand(dMin, dMax);
      const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
      if (!W.inside(x, z) || W.heightAt(x, z) < W.WATER + 0.3) continue;
      if (!freeSpot(x, z, 0.6, W.heightAt(x, z))) continue;
      let tooClose = false;
      for (const q of players().values()) if (U.dist(x, z, q.x, q.z) < dMin * 0.8) tooClose = true;
      if (tooClose) continue;
      return [x, z];
    }
    return null;
  }
  function pickKind(night) {
    const r = Math.random();
    if (night) return r < 0.58 ? 'walker' : r < 0.9 ? 'runner' : 'brute';
    return r < 0.88 ? 'walker' : r < 0.95 ? 'runner' : 'brute';
  }
  Z.startHorde = function (n) { hordeLeft = n; hordeT = 0; };

  Z.hostUpdate = function (dt, hour) {
    const night = W.isNight(hour);
    const alive = [...players().values()].filter((p) => p.alive && !p.inHeli);
    for (const zb of Z.zombies.values()) updateZombie(zb, dt, night);
    for (const an of Z.animals.values()) updateAnimal(an, dt);
    // far away zombies go away
    for (const zb of Z.zombies.values()) {
      let near = false;
      for (const p of alive) if (U.dist(zb.x, zb.z, p.x, p.z) < 115) near = true;
      if (!near && zb.state !== 'dead') { zb.farT += dt; if (zb.farT > 8 || !alive.length) removeZombie(zb.id); } else zb.farT = 0;
    }
    for (const an of Z.animals.values()) {
      let near = false;
      for (const p of alive) if (U.dist(an.x, an.z, p.x, p.z) < 130) near = true;
      if (!near) removeAnimal(an.id);
    }
    spawnT -= dt;
    if (spawnT > 0 || !alive.length) return;
    spawnT = 1;
    // horde: comes in waves
    if (hordeLeft > 0) {
      hordeT -= 1;
      if (hordeT <= 0) {
        hordeT = 4;
        for (let i = 0; i < 5 && hordeLeft > 0; i++) {
          const p = U.pick(alive);
          const s = randomSpot(p, 35, 50);
          if (s) { spawnZombie(pickKind(true), s[0], s[1], true); hordeLeft--; }
        }
      }
    }
    // normal zombies
    // more zombies at night, and a few more every day you survive
    const day = Math.min(DA.Game.day, 10);
    let want = Math.round((night ? 9 + day * 0.8 : 2 + day * 0.4) * alive.length);
    for (const p of alive) if (Math.abs(p.x - 60) < 90 && Math.abs(p.z - 25) < 50) want += night ? 4 : 6; // the town is full of them
    want = Math.min(want, MAXZ);
    let count = 0;
    for (const zb of Z.zombies.values()) if (!zb.horde && zb.state !== 'dead') count++;
    if (count < want) {
      const p = U.pick(alive);
      const s = night ? randomSpot(p, 32, 60) : randomSpot(p, 45, 80);
      if (s) spawnZombie(pickKind(night), s[0], s[1], false);
    }
    // animals, in the daytime, away from town
    if (Z.animals.size < 5 * alive.length && !night && Math.random() < 0.3) {
      const p = U.pick(alive);
      const s = randomSpot(p, 50, 90);
      if (s && W.groundType(s[0], s[1]) === 0 && !(Math.abs(s[0] - 60) < 110 && Math.abs(s[1] - 25) < 70)) {
        const kind = Math.random() < 0.45 ? 'deer' : 'rabbit';
        const n = kind === 'deer' ? U.randInt(1, 3) : U.randInt(1, 2);
        for (let i = 0; i < n; i++) spawnAnimal(kind, s[0] + U.rand(-3, 3), s[1] + U.rand(-3, 3));
      }
    }
  };

  // ---------- network pictures ----------
  Z.snapshot = function () {
    const zs = [], as = [];
    const R = U.round;
    for (const zb of Z.zombies.values()) zs.push([zb.id, KIND_NAMES.indexOf(zb.kind), zb.v, R(zb.x), R(zb.y), R(zb.z), R(zb.ry), zb.anim, zb.hitFlag]);
    for (const an of Z.animals.values()) as.push([an.id, ANIMAL_NAMES.indexOf(an.kind), R(an.x), R(an.y), R(an.z), R(an.ry), an.anim]);
    return { z: zs, a: as };
  };
  // clients: update the bodies from the host's picture
  Z.applySnapshot = function (zs, as) {
    const seen = new Set();
    for (const [id, ki, v, x, y, z, ry, anim, hit] of zs) {
      seen.add(id);
      let zb = Z.zombies.get(id);
      if (!zb) {
        zb = { id, kind: KIND_NAMES[ki], avatar: new Avatar(KIND_NAMES[ki], v, false) };
        zb.avatar.place(x, y, z, ry);
        Z.zombies.set(id, zb);
      }
      zb.x = x; zb.y = y; zb.z = z; zb.dead = anim === 4;
      const a = zb.avatar; a.tx = x; a.ty = y; a.tz = z; a.try = ry; a.anim = anim;
      if (hit) a.hit();
    }
    for (const id of [...Z.zombies.keys()]) if (!seen.has(id)) removeZombie(id);
    const seenA = new Set();
    for (const [id, ki, x, y, z, ry, anim] of as) {
      seenA.add(id);
      let an = Z.animals.get(id);
      if (!an) {
        an = { id, kind: ANIMAL_NAMES[ki], avatar: new Avatar(ANIMAL_NAMES[ki], 0, true) };
        an.avatar.place(x, y, z, ry);
        Z.animals.set(id, an);
      }
      an.x = x; an.y = y; an.z = z; an.dead = anim === 4;
      const a = an.avatar; a.tx = x; a.ty = y; a.tz = z; a.try = ry; a.anim = anim;
    }
    for (const id of [...Z.animals.keys()]) if (!seenA.has(id)) removeAnimal(id);
  };

  // every frame on every computer: animate the bodies
  Z.update = function (dt, isHost) {
    for (const zb of Z.zombies.values()) zb.avatar.update(dt, !isHost);
    for (const an of Z.animals.values()) an.avatar.update(dt, !isHost);
  };

  // which zombie / animal does a ray hit? (for hitting and arrows)
  Z.rayTarget = function (ox, oy, oz, dx, dy, dz, maxD) {
    let best = null, bestD = maxD;
    const test = (list, isAnimal) => {
      for (const e of list.values()) {
        if (e.dead || e.state === 'dead') continue;
        const pos = e.avatar.root.position;
        const kind = isAnimal ? ANIMALS[e.kind] : KINDS[e.kind];
        const r = (kind ? kind.r : 0.4) + 0.15;
        const h = isAnimal ? (e.kind === 'deer' ? 1.5 : 0.45) : (e.kind === 'brute' ? 2.3 : 1.8);
        const d = C.rayHit({ shape: 'circle', x: pos.x, z: pos.z, r, y0: pos.y, y1: pos.y + h }, ox, oy, oz, dx, dy, dz, bestD);
        if (d >= 0 && d < bestD) { bestD = d; best = { e, isAnimal, d }; }
      }
    };
    test(Z.zombies, false);
    test(Z.animals, true);
    return best;
  };

  Z.clear = function () {
    for (const id of [...Z.zombies.keys()]) removeZombie(id);
    for (const id of [...Z.animals.keys()]) removeAnimal(id);
    hordeLeft = 0;
  };
  Z.init = function (world, sc) { W = world; scene = sc; A = DA.Audio; };
  Z.nearestZombie = function (x, z) {
    let best = 1e9;
    for (const zb of Z.zombies.values()) if (!zb.dead && zb.state !== 'dead') best = Math.min(best, U.dist(x, z, zb.avatar.root.position.x, zb.avatar.root.position.z));
    return best;
  };
  return Z;
})();
