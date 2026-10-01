// ============================================================
//  DINO RAMPAGE — THE ARMY (and the FBI radio!)
//  Jeeps, tanks and helicopters drive along the roads, chase
//  the dino and shoot paintballs, shells and rockets.
//  Smash them for BIG points!
// ============================================================
window.DR = window.DR || {};

DR.Army = (function () {
  const U = DR.U, Mo = DR.Models, City = DR.City, FX = DR.FX, A = DR.Audio, H = DR.HUD;
  const PI = Math.PI;
  const TYPES = {
    jeep: { tier: 2, speed: 11, range: 18, rate: 1.6, rad: 1.8, h: 2.2, pts: 800, grow: 6, name: 'Army jeep', shot: 'ball', make: () => Mo.unitJeep() },
    tank: { tier: 3, speed: 6.5, range: 32, rate: 3.6, rad: 3.4, h: 3.3, pts: 2500, grow: 22, name: 'Tank', shot: 'shell', make: () => Mo.unitTank() },
    heli: { tier: 4, speed: 16, range: 50, rate: 2.8, rad: 4, h: 3, pts: 5000, grow: 60, name: 'Helicopter', shot: 'rocket', make: () => Mo.unitHeli() },
  };
  const SHOT = {
    ball: { r: 0.28, dmg: 0.05, speed: 34, g: 6, color: 0xff7a1a },
    shell: { r: 0.4, dmg: 0.13, speed: 30, g: 18, color: 0x2a2a30 },
    rocket: { r: 0.25, dmg: 0.09, speed: 32, g: 0, color: 0xff3a2a },
  };

  // ---------- funny radio messages ----------
  const RADIO = {
    fbi: [
      'FBI HQ: All agents, a giant lizard is loose. Bring snacks. LOTS of snacks.',
      'FBI HQ: Agent Smith, please stop taking selfies with the dinosaur.',
      'FBI HQ: Good news, we found the dinosaur. Bad news: it found us.',
      'FBI HQ: Who parked the secret van right in front of the dinosaur?!',
      'FBI HQ: Agent Jenkins, your report is just a drawing of a dinosaur. AGAIN.',
      'FBI HQ: Does anyone know what dinosaurs eat? ...Oh. EVERYTHING.',
      'FBI HQ: Reminder: our secret base is a TOTALLY NORMAL BAKERY. Act normal.',
      'FBI HQ: Should we call the CIA? ...They said "not our problem, good luck!"',
      'FBI HQ: Agent Lopez, that is NOT a lizard. Please update your glasses.',
      'FBI HQ: Is the dinosaur wearing a hat? Write that down. It is VERY important.',
    ],
    army: [
      'ARMY: Send in the tanks! ...General, it is EATING the tanks.',
      'ARMY: Fire everything! ...Sir, we only have paintballs left.',
      'ARMY: General, should we retreat? — YES. RUN AWAY.',
      'ARMY: Helicopter 1, stay away from its mouth! Helicopter 1? ...Helicopter 1??',
      'ARMY: Operation Big Lizard is going GREAT! (It is not going great.)',
      'ARMY: Who forgot to put "giant dinosaur" in the training manual?!',
      'ARMY: New plan: we hide behind the pudding cups.',
    ],
    baby: 'FBI HQ: Reports of a baby dinosaur in town. Probably just a big lizard. Ignore it.',
    arrive: 'ARMY: Attention, dinosaur! You are surrounded! ...Well, kind of.',
    jeep: 'ARMY: Jeeps, go go go! Use the paintballs! Aim for the... uh... everything!',
    tank: 'ARMY: Here come the TANKS! Nothing can stop a tank! ...Right? RIGHT?',
    heli: 'ARMY: Helicopters in the air! Stay high, it can JUMP! ...It can jump?!',
    dizzy: 'ARMY: We got it! It is dizzy! ...Oh no. It is getting up. It looks ANGRY.',
    secret: 'FBI HQ: Uh oh. It found our TOTALLY NORMAL BAKERY. Everybody act natural!',
    destroyed: { jeep: 'ARMY: We lost a jeep! It was crunchy, apparently.', tank: 'ARMY: The tank is... squished. Like a pancake.', heli: 'ARMY: Helicopter down! The pilot is fine. Just embarrassed.' },
  };

  let scene, units = [], shots = [], cfg = null, active = false, spawnT = 0, radioT = 0;
  let seen = {}, babyMsg = false, levelId = 0;
  const shotGeo = new THREE.SphereGeometry(1, 10, 8);
  const shotMat = {};

  function init(sc) { scene = sc; }
  function setup(level) {
    clear();
    cfg = level.army || null;
    levelId = level.id;
    active = false; spawnT = 2; radioT = 20; seen = {}; babyMsg = false;
  }
  function clear() {
    units.forEach((u) => scene.remove(u.m));
    shots.forEach((s) => scene.remove(s.m));
    units = []; shots = [];
  }
  function radio(text) { H.radio(text); A.radio(); }

  // how many of each vehicle can be chasing you right now?
  function maxOf(type, D) {
    if (!cfg || D.tier < cfg.from) return 0;
    const T = TYPES[type];
    if (D.tier < T.tier - cfg.extra) return 0;
    if (type === 'jeep') return 2 + cfg.extra;
    if (type === 'tank') return 1 + (D.tier >= 4 ? 1 : 0) + (cfg.extra && D.tier >= 3 ? 1 : 0);
    return 1 + (D.tier >= 5 ? 1 : 0) + (cfg.extra && D.tier >= 4 ? 1 : 0);
  }

  // ---------- a new vehicle drives in from the edge of the map ----------
  function spawn(type, D) {
    const T = TYPES[type], info = City.info, s = D.scale;
    const far = 55 + 9 * s;
    const vis = T.make();
    const u = { type, T, tier: T.tier, name: T.name, h: T.h, rad: T.rad, m: vis.root, turret: vis.turret, rotor: vis.rotor, tail: vis.tail, cols: vis.cols, cool: 2 + Math.random() * 2, stun: 0, wobble: 0, yaw: 0, y: 0 };
    if (type === 'heli') {
      u.ang = Math.random() * PI * 2;
      u.x = D.x + Math.cos(u.ang) * far * 1.4; u.z = D.z + Math.sin(u.ang) * far * 1.4; u.y = 30 + s * 3;
    } else {
      // drive in on a road, not too close and not too far from the dino
      const maxZ = Math.min(info.d, info.shore - 8);
      let c = null;
      for (let tries = 0; tries < 30 && !c; tries++) {
        const axis = Math.random() < 0.5 ? 'x' : 'z';
        const at = U.pick(axis === 'z' ? info.roadsX : info.roadsZ.filter((z) => z < maxZ));
        const along = U.rand(-10, (axis === 'x' ? info.w : maxZ) + 10);
        const x = axis === 'z' ? at : along, z = axis === 'z' ? along : at;
        const d = U.dist(x, z, D.x, D.z);
        if (d > far && d < far * 1.7) c = { x, z, axis, at, dir: (axis === 'x' ? D.x - x : D.z - z) >= 0 ? 1 : -1 };
      }
      if (!c) { scene.remove(u.m); return; }
      Object.assign(u, { x: c.x, z: c.z, axis: c.axis, dir: c.dir, at: c.at });
      u.yaw = c.axis === 'x' ? (c.dir > 0 ? PI / 2 : -PI / 2) : (c.dir > 0 ? 0 : PI);
    }
    u.m.position.set(u.x, u.y, u.z);
    u.m.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(u.m);
    units.push(u);
    if (!seen[type]) { seen[type] = true; radio(RADIO[type]); }
  }

  // ---------- SHOOTING ----------
  function fire(u, D) {
    const S = SHOT[u.T.shot], s = D.scale;
    const tx = D.x + D.vx * 0.3, ty = D.y + 1.0 * s, tz = D.z + D.vz * 0.3;
    const aim = Math.atan2(tx - u.x, tz - u.z);
    const mx = u.x + Math.sin(aim) * (u.type === 'tank' ? 4.8 : 2), my = u.y + (u.type === 'heli' ? -0.5 : u.h * 0.75), mz = u.z + Math.cos(aim) * (u.type === 'tank' ? 4.8 : 2);
    const dx = tx - mx, dy = ty - my, dz = tz - mz, dh = Math.hypot(dx, dz), d3 = Math.hypot(dh, dy);
    const spread = u.type === 'jeep' ? 0.05 : 0.02;
    let vx, vy, vz;
    if (S.g > 0) {
      const t = dh / S.speed;
      vx = dx / t; vz = dz / t; vy = (dy + 0.5 * S.g * t * t) / t;
    } else { vx = dx / d3 * S.speed; vy = dy / d3 * S.speed; vz = dz / d3 * S.speed; }
    vx += (Math.random() - 0.5) * spread * S.speed; vz += (Math.random() - 0.5) * spread * S.speed;
    const mat = shotMat[u.T.shot] || (shotMat[u.T.shot] = new THREE.MeshBasicMaterial({ color: S.color }));
    const m = new THREE.Mesh(shotGeo, mat);
    m.scale.set(S.r, S.r, u.T.shot === 'rocket' ? S.r * 3 : S.r);
    m.position.set(mx, my, mz);
    scene.add(m);
    shots.push({ m, x: mx, y: my, z: mz, vx, vy, vz, g: S.g, dmg: S.dmg, life: 4, type: u.T.shot, trail: 0 });
    FX.dust(mx, my, mz, u.type === 'tank' ? 1.5 : 0.7, 2, 0xf0f0f0);
    A.shot(u.T.shot);
    if (u.type === 'tank') u.recoil = 0.3;
  }

  // ---------- SMASHED! ----------
  function destroy(u) {
    if (!u.alive && u.alive !== undefined) return;
    u.alive = false;
    const i = units.indexOf(u);
    if (i >= 0) units.splice(i, 1);
    scene.remove(u.m);
    const k = u.type === 'tank' ? 1.4 : u.type === 'heli' ? 1.6 : 1;
    FX.burst(u.x, u.y, u.z, 1.5 * k, 1 * k, 2.4 * k, u.cols, 16 + u.tier * 6, 0.9 + u.tier * 0.2);
    FX.dust(u.x, u.y + 1, u.z, 3 * k, 8, 0xffb060);
    FX.sparkle(u.x, u.y + 2, u.z, 1.2 * k, 10, 0xffd060);
    A.boom(1); A.crash(u.tier, 0, true);
    const D = DR.Dino.D;
    DR.Dino.reward(u.x, u.y + 3 + D.scale, u.z, u.T.pts, u.T.grow, u.tier, false);
    D.stats.army++; D.stats.smashed++;
    FX.fx.shake = Math.min(1.6, FX.fx.shake + 0.4);
    if (Math.random() < 0.6) radio(RADIO.destroyed[u.type]);
    // after smashing something, the next one waits a little longer
    spawnT = Math.max(spawnT, 6);
  }
  // can the dino reach it? (helicopters fly up high: jump or bite them!)
  function reachable(u, D, extra) { return u.y - 1 < D.y + 2.4 * D.scale + extra; }
  function hit(x, z, r, how) {
    const D = DR.Dino.D, st = DR.Dino.smashTier();
    let n = 0;
    const extra = how === 'bite' ? 1.6 * D.scale : how === 'flop' ? 1 * D.scale : 0.5 * D.scale;
    for (const u of units.slice()) {
      if (U.dist(u.x, u.z, x, z) > r + u.rad * 0.6) continue;
      if (!reachable(u, D, extra)) continue;
      if (u.tier <= st) { destroy(u); n++; } else u.wobble = 0.6;
    }
    return n;
  }
  // the SUPER ROAR smashes small vehicles and scares the big ones
  function roar(x, z, R) {
    const st = DR.Dino.smashTier();
    for (const u of units.slice()) {
      if (U.dist(u.x, u.z, x, z) > R) continue;
      if (u.tier <= st) destroy(u); else { u.stun = 5; u.wobble = 1.5; }
    }
  }

  // ------------------------------------------------------------
  //  EVERY FRAME
  // ------------------------------------------------------------
  function update(dt, t, D) {
    const s = D.scale, info = City.info;
    // --- radio jokes ---
    radioT -= dt;
    if (!cfg && D.tier >= 2 && !babyMsg) { babyMsg = true; radioT = 30; radio(RADIO.baby); }
    if (radioT <= 0 && D.tier >= 2) {
      radioT = active ? U.rand(22, 32) : U.rand(35, 50);
      radio(active && Math.random() < 0.5 ? U.pick(RADIO.army) : U.pick(RADIO.fbi));
    }
    // --- the army arrives! ---
    if (cfg && !active && D.tier >= cfg.from) {
      active = true;
      spawnT = 3;
      H.center('🚨 THE ARMY IS HERE! 🚨<small>Dodge the shots, then SMASH them for big points!</small>', 3.2);
      H.tip('The army shoots at you! If your <b>❤️ health</b> runs out you get <b>DIZZY</b> and shrink a little. Eat snacks to heal. You can only smash army stuff that is your size or smaller!', 7);
      radio(RADIO.arrive);
      A.alarm();
    }
    if (active && !D.won) {
      spawnT -= dt;
      if (spawnT <= 0) {
        spawnT = 4;
        for (const type of ['heli', 'tank', 'jeep']) {
          if (units.filter((u) => u.type === type).length < maxOf(type, D)) { spawn(type, D); break; }
        }
      }
    }
    const st = DR.Dino.smashTier();
    let nearestHeli = 1e9;
    for (const u of units.slice()) {
      u.cool -= dt; u.stun -= dt;
      const dx = D.x - u.x, dz = D.z - u.z, dist = Math.hypot(dx, dz);
      const rng = u.T.range + s * 4;
      if (u.type === 'heli') {
        // fly in circles around the dino's head
        const R = 24 + 5 * s;
        u.ang += dt * u.T.speed / R;
        const tx = D.x + Math.cos(u.ang) * R, tz = D.z + Math.sin(u.ang) * R, ty = D.y * 0.5 + 2.6 * s + 5;
        u.x = U.damp(u.x, tx, 0.8, dt); u.z = U.damp(u.z, tz, 0.8, dt); u.y = U.damp(u.y, ty, 0.6, dt) + Math.sin(t * 2 + u.ang) * 0.02;
        u.yaw = Math.atan2(dx, dz);
        u.rotor.rotation.y += dt * 28; u.tail.rotation.x += dt * 40;
        u.m.rotation.set(0.15 + (u.stun > 0 ? Math.sin(t * 9) * 0.3 : 0), u.yaw, Math.sin(t * 1.3) * 0.08);
        nearestHeli = Math.min(nearestHeli, Math.hypot(dist, u.y - D.y));
      } else {
        // drive along the roads towards the dino
        const moving = dist > rng * 0.7 && u.stun <= 0;
        if (moving) {
          const old = u.axis === 'x' ? u.x : u.z;
          let nw = old + u.dir * u.T.speed * (1 + 0.15 * s) * dt;
          const along = u.axis === 'x' ? D.x - old : D.z - old;
          if (along * u.dir < -12) u.dir = -u.dir;   // the dino is behind: turn around
          const cross = u.axis === 'x' ? info.roadsX : info.roadsZ;
          for (const c of cross) {
            if ((old - c) * (nw - c) <= 0 && old !== c) {
              const perp = u.axis === 'x' ? D.z - u.z : D.x - u.x;
              const par = u.axis === 'x' ? D.x - c : D.z - c;
              const okZ = u.axis === 'x' ? (c >= -1 && c <= info.w + 1) : true;
              if (okZ && Math.abs(perp) > Math.abs(par) + 4) {
                const other = u.axis === 'x' ? u.z : u.x;
                u.axis = u.axis === 'x' ? 'z' : 'x'; u.at = c; u.dir = perp >= 0 ? 1 : -1;
                if (u.axis === 'x') { u.z = c; u.x = other; } else { u.x = c; u.z = other; }
                nw = other;
                break;
              }
            }
          }
          const max = u.axis === 'x' ? info.w + 14 : Math.min(info.d + 14, info.shore - 8);
          if (nw > max) { nw = max; u.dir = -1; }
          if (nw < -14) { nw = -14; u.dir = 1; }
          if (u.axis === 'x') { u.x = nw; u.z = u.at; } else { u.z = nw; u.x = u.at; }
          const want = u.axis === 'x' ? (u.dir > 0 ? PI / 2 : -PI / 2) : (u.dir > 0 ? 0 : PI);
          u.yaw += U.angleDiff(u.yaw, want) * Math.min(1, dt * 6);
        }
        u.m.rotation.set(0, u.yaw, u.wobble > 0 ? Math.sin(t * 30) * 0.05 : 0);
        if (u.turret) u.turret.rotation.y = U.damp(u.turret.rotation.y, U.angleDiff(0, Math.atan2(dx, dz) - u.yaw), 5, dt);
      }
      u.wobble = Math.max(0, u.wobble - dt);
      if (u.recoil > 0) { u.recoil -= dt; if (u.turret) u.turret.position.z = -0.2 - u.recoil; }
      u.m.position.set(u.x, u.y, u.z);
      // the dino walks into it
      if (dist < D.r + u.rad * 0.8 && reachable(u, D, 0)) {
        if (u.tier <= st) { destroy(u); continue; }
        DR.Dino.tooBig(u);
      }
      // fire!
      const inRange = Math.hypot(dist, u.y - D.y) < rng;
      if (inRange && u.cool <= 0 && u.stun <= 0 && D.dizzy <= 0 && !D.won) {
        u.cool = u.T.rate * (0.8 + Math.random() * 0.4);
        fire(u, D);
      }
      // far away vehicles drive back towards the action
      if (dist > 170 + s * 16) { scene.remove(u.m); units.splice(units.indexOf(u), 1); }
    }
    if (nearestHeli < 120) A.chop(1 - nearestHeli / 120);
    // --- flying shots ---
    for (let i = shots.length - 1; i >= 0; i--) {
      const p = shots[i];
      p.life -= dt;
      p.vy -= p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.m.position.set(p.x, p.y, p.z);
      if (p.type === 'rocket') {
        p.m.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
        p.trail -= dt;
        if (p.trail < 0) { p.trail = 0.05; FX.dust(p.x, p.y, p.z, 0.8, 1, 0xd8d8d8); }
      }
      const cy = D.y + 0.95 * s;
      if (Math.hypot(p.x - D.x, p.y - cy, p.z - D.z) < 0.85 * s + 0.4) {
        DR.Dino.hurt(p.dmg, p.x, p.y, p.z);
        scene.remove(p.m); shots.splice(i, 1);
        continue;
      }
      if (p.y < 0.1 || p.life <= 0) {
        if (p.y < 0.5) { FX.dust(p.x, 0.2, p.z, p.type === 'ball' ? 0.8 : 2, 3, p.type === 'ball' ? 0xff9a3a : 0xc8b8a0); if (p.type !== 'ball') A.boom(0.25); }
        scene.remove(p.m); shots.splice(i, 1);
      }
    }
  }

  return {
    init, setup, clear, update, hit, roar, radio, RADIO,
    get active() { return active; }, get units() { return units; },
  };
})();
