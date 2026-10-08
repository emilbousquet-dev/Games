// ============================================================
//  FLOPPY PARTY — ROBOT BOSS (the last level of the World Tour)
//  A giant robot stomps around a metal island. Everyone plays
//  on the SAME team against it:
//    - Jump over its shockwave rings and its spinning laser.
//    - Get out of the red circles when it fires missiles.
//    - Don't stand right in front of it: it swats!
//  After a few attacks it gets tired and sits down with its
//  chest open: PUNCH the glowing core! Break it 3 times to win.
//  Falling off costs one of your team's hearts.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.boss = (function () {
  const R = 9, EDGE = 7.4, TIME = 240, HEARTS = 10, BLAST = 1.9, WARN = 1.6;
  const STATES = ['intro', 'walk', 'stomp', 'laser', 'missiles', 'swat', 'tired', 'angry', 'dead'];
  let rob = null, rings = [], missiles = [], hearts = HEARTS, maxHearts = HEARTS, time = 0, lastAttack = '', respawn = null, self = null, ringId = 0;
  let M = null, collider = null, beamMeshes = [], missilePool = [];

  // ---------------- the robot model ----------------
  function makeRobot() {
    const L = FP.Look, steel = 0xb8c2cc, dark = 0x5a6270, orange = 0xff9a3c;
    const g = new THREE.Group();
    const box = (w, h, d, col, outline = 0.04) => L.mesh(new THREE.BoxGeometry(w, h, d), L.toon(col), outline);
    const legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 0.8, 2.2, 0);
      const leg = box(0.8, 2.0, 0.8, dark); leg.position.y = -1.0; hip.add(leg);
      const knee = box(0.95, 0.35, 0.95, orange); knee.position.y = -1.0; hip.add(knee);
      const foot = box(1.2, 0.4, 1.6, steel); foot.position.set(0, -2.0, 0.2); hip.add(foot);
      g.add(hip); legs.push(hip);
    }
    const upper = new THREE.Group(); upper.position.y = 2.2; g.add(upper);
    const torso = box(2.8, 2.4, 1.8, steel); torso.position.y = 1.2; upper.add(torso);
    const belt = box(2.9, 0.35, 1.9, orange); belt.position.y = 0.15; upper.add(belt);
    for (const s of [-1, 1]) { const bolt = L.mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), L.toon(dark), 0.02); bolt.rotation.x = Math.PI / 2; bolt.position.set(s * 1.05, 2.05, 0.92); upper.add(bolt); }
    // the core hides behind a hatch on the chest
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 14), new THREE.MeshBasicMaterial({ color: 0x4ae0ff }));
    core.position.set(0, 1.15, 0.72); upper.add(core);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), new THREE.MeshBasicMaterial({ color: 0x9af0ff, transparent: true, opacity: 0.35, depthWrite: false }));
    core.add(glow);
    const hatch = new THREE.Group(); hatch.position.set(0, 0.5, 0.93); upper.add(hatch); // hinged at the bottom
    const door = box(1.3, 1.3, 0.14, orange, 0.03); door.position.y = 0.65; hatch.add(door);
    const stripe = box(1.0, 0.16, 0.16, dark, 0); stripe.position.set(0, 0.65, 0.04); hatch.add(stripe);
    // head
    const head = new THREE.Group(); head.position.y = 2.4; upper.add(head);
    const skull = box(1.8, 1.2, 1.4, steel); skull.position.y = 0.6; head.add(skull);
    const visor = box(1.5, 0.45, 0.1, 0x2a2140, 0); visor.position.set(0, 0.68, 0.72); head.add(visor);
    const eyes = [];
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.06), new THREE.MeshBasicMaterial({ color: 0xff3a3a })); e.position.set(s * 0.38, 0.7, 0.78); head.add(e); eyes.push(e); }
    const brow = box(1.6, 0.16, 0.16, dark, 0); brow.position.set(0, 1.02, 0.72); brow.rotation.z = 0; head.add(brow);
    const ant = L.mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6), L.toon(dark), 0.02); ant.position.y = 1.55; head.add(ant);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3a3a })); bulb.position.y = 1.95; head.add(bulb);
    // arms
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 1.75, 2.1, 0);
      const ball = L.mesh(new THREE.SphereGeometry(0.42, 14, 10), L.toon(orange), 0.03); sh.add(ball);
      const arm = box(0.55, 1.9, 0.55, dark); arm.position.y = -1.0; sh.add(arm);
      const fist = box(0.95, 0.9, 0.95, steel); fist.position.y = -2.2; sh.add(fist);
      upper.add(sh); arms.push(sh);
    }
    return { g, legs, upper, core, glow, hatch, head, eyes, bulb, brow, arms };
  }

  function build(list) {
    const S = FP.Stage;
    const lv = { easy: 0, normal: 1, hard: 2 }[self.level] ?? 1; // World Tour difficulty
    maxHearts = [13, HEARTS, 7][lv];
    rings = []; missiles = []; hearts = maxHearts; time = 0; lastAttack = ''; ringId = 0;
    self.beaten = false;
    const metal = { grass: 0x9aa3ad, dirt: 0x5a5f6a };
    S.island(0, -1, 0, R * 2, 2, R * 1.2, metal);
    S.island(0, -1, 0, R * 1.2, 2, R * 2, metal);
    S.island(0, -1, 0, R * 1.7, 2, R * 1.7, metal);
    // yellow and black warning stripes near the edge
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.35), new THREE.MeshBasicMaterial({ color: k % 2 ? 0x2a2140 : 0xffcf33 }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = -a; m.position.set(Math.sin(a) * EDGE, 0.02, Math.cos(a) * EDGE); S.add(m);
    }
    // a low safety fence around the edge (you can still get knocked over it!)
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2, fr = 8.3;
      const w = 2 * Math.PI * fr / 36 - 0.25;
      const b = FP.Physics.staticBox(Math.sin(a) * fr, 0.25, Math.cos(a) * fr, w, 0.5, 0.3);
      b.quaternion.setFromEuler(0, a, 0); b.aabbNeedsUpdate = true;
      S.bodies.push(b);
      const m = FP.Look.boxMesh(w, 0.5, 0.3, FP.Look.toon(k % 2 ? 0x2a2140 : 0xffcf33));
      m.position.copy(b.position); m.rotation.y = a; S.add(m);
    }
    M = makeRobot();
    S.add(M.g);
    collider = FP.Physics.kinematicBox(0, 2.3, 0, 2.8, 4.6, 1.8);
    S.bodies.push(collider);
    // spinning laser beams (2, the second one is for the angry last part)
    beamMeshes = [0, 1].map(() => {
      const geo = new THREE.BoxGeometry(0.22, 0.22, R + 1); geo.translate(0, 0, (R + 1) / 2 + 0.8);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.9 }));
      const glow = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff9a9a, transparent: true, opacity: 0.3, depthWrite: false }));
      glow.scale.set(2.4, 2.4, 1); m.add(glow);
      m.visible = false; S.add(m); return m;
    });
    // shockwave rings
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.16, 8, 48), new THREE.MeshBasicMaterial({ color: 0x4ae0ff }));
      m.rotation.x = Math.PI / 2; m.visible = false; S.add(m);
      rings.push({ on: false, x: 0, z: 0, r: 0, speed: 0, id: 0, mesh: m });
    }
    // missiles and their red warning circles
    missilePool = [];
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      const body = FP.Look.mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.1, 10), FP.Look.toon(0xdfe4ea), 0.03);
      const tip = FP.Look.mesh(new THREE.ConeGeometry(0.22, 0.45, 10), FP.Look.toon(0xff3a4a), 0.03); tip.position.y = -0.78; tip.rotation.x = Math.PI;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.8, 8), new THREE.MeshBasicMaterial({ color: 0xffcf33, transparent: true, opacity: 0.7 })); flame.position.y = 0.95;
      g.add(body, tip, flame); g.visible = false; S.add(g);
      const ring = new THREE.Mesh(new THREE.RingGeometry(BLAST - 0.22, BLAST, 32), new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.visible = false;
      const fill = new THREE.Mesh(new THREE.CircleGeometry(BLAST, 32), new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      fill.rotation.x = -Math.PI / 2; fill.visible = false;
      S.add(ring, fill);
      missilePool.push({ on: false, x: 0, z: 0, t: 0, mesh: g, ring, fill });
    }
    missiles = missilePool;
    const n = Math.max(1, list ? list.length : 1);
    const hpMax = Math.round((9 + 6 * n) * [0.75, 1, 1.35][lv]); // more friends = a tougher robot
    rob = { x: 0, z: -3, yaw: 0, st: 'intro', t: 0, hp: hpMax, hpMax, attacks: 0, a0: 0, target: null, walkT: 0, step: 0 };
    S.hemi.color.setHex(0xe8eeff); S.sun.color.setHex(0xfff0e0);
    S.onClear(() => { S.hemi.color.setHex(0xffffff); S.sun.color.setHex(0xfff4e0); });
    // the camera shows the whole arena (and the whole tall robot)
    FP.Camera.setAngle(0.6, 0.85);
    FP.Camera.fix(new THREE.Vector3(0, 1.6, 0.6), 16.5);
    // fallen players drop back in on the side away from the robot
    respawn = FP.Kit.respawner((c) => { const a = Math.atan2(-rob.x, -rob.z) + (c.index - 1.5) * 0.5; return { x: Math.sin(a) * 5, y: 1.5, z: Math.cos(a) * 5, yaw: a + Math.PI }; });
  }

  // everyone starts in a row in front of the robot
  function spawn(i, n) { return { x: (i - (n - 1) / 2) * 1.8, y: 0.2, z: 3.5, yaw: Math.PI }; }

  const phase = () => (rob.hp > (rob.hpMax * 2) / 3 ? 0 : rob.hp > rob.hpMax / 3 ? 1 : 2);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

  function setState(st) { rob.st = st; rob.t = 0; }

  function knock(c, dx, dz, power, up, ko = 1.3) {
    const l = Math.hypot(dx, dz) || 1;
    c.bossLastHit = rob.st + '@' + time.toFixed(1);
    FP.Ragdoll.knockOut(c, ko);
    for (const b of c.bodies) { b.velocity.x += (dx / l) * power; b.velocity.z += (dz / l) * power; b.velocity.y += up; }
  }

  function nearestChar(chars) {
    let best = null, bd = Infinity;
    for (const c of chars) {
      if (!c.alive || respawn.waiting(c)) continue;
      const p = c.parts.torso.position;
      if (p.y < -1) continue;
      const d = Math.hypot(p.x - rob.x, p.z - rob.z);
      if (d < bd) { bd = d; best = c; }
    }
    return best ? { c: best, d: bd } : null;
  }

  function fireMissiles(chars) {
    const n = 3 + phase() * 2;
    const alive = chars.filter((c) => c.alive && !respawn.waiting(c));
    for (let k = 0; k < n; k++) {
      const m = missiles.find((q) => !q.on);
      if (!m) break;
      let x, z;
      if (alive.length && k < alive.length * 2) { const c = alive[k % alive.length]; x = c.parts.torso.position.x + (Math.random() - 0.5) * 1.6; z = c.parts.torso.position.z + (Math.random() - 0.5) * 1.6; }
      else { const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * (EDGE - 2.5); x = Math.sin(a) * r; z = Math.cos(a) * r; }
      Object.assign(m, { on: true, t: -k * 0.18, x, z });
    }
    FP.Audio.play('whoosh');
  }

  function boom(m, chars) {
    m.on = false;
    const pos = new THREE.Vector3(m.x, 0.3, m.z);
    FP.FX.puffs(pos, 18, 0xff9a3c, 5, 1.8);
    FP.FX.word(pos, 'BOOM!', '#ff5a5f', 1.3);
    FP.Camera.shake(0.4); FP.Audio.play('bonk');
    for (const c of chars) {
      if (!c.alive) continue;
      const p = c.parts.torso.position, dx = p.x - m.x, dz = p.z - m.z, d = Math.hypot(dx, dz);
      if (d < BLAST + 0.3) knock(c, dx, dz, 4.5 * (1 - d / (BLAST + 0.4)) + 1.5, 7, 1.3);
    }
  }

  function startRing(delay) {
    const r = rings.find((q) => !q.on);
    if (!r) return;
    Object.assign(r, { on: true, x: rob.x, z: rob.z, r: 1.6 - delay * (6 + phase()), speed: 6 + phase() * 1.2, id: ++ringId });
  }

  // the robot's brain (runs only on the host)
  function think(dt, chars) {
    rob.t += dt;
    const ph = phase();
    const fx = Math.sin(rob.yaw), fz = Math.cos(rob.yaw);
    if (rob.st === 'intro') {
      if (rob.t > 1.2 && rob.t - dt <= 1.2) { FP.Camera.shake(0.9); FP.Audio.play('bonk'); FP.FX.puffs(new THREE.Vector3(rob.x, 0.3, rob.z), 30, 0xd8d8e0, 6, 2.2); FP.FX.word(new THREE.Vector3(rob.x, 6, rob.z), 'ROBOT BOSS!', '#ff5a5f', 2.2); }
      if (rob.t > 2.4) setState('walk');
      return;
    }
    if (rob.st === 'dead') return;
    if (rob.st === 'walk') {
      const tg = nearestChar(chars);
      if (tg) {
        const p = tg.c.parts.torso.position;
        const want = Math.atan2(p.x - rob.x, p.z - rob.z);
        rob.yaw += wrap(want - rob.yaw) * Math.min(1, dt * 2.5);
        if (tg.d > 3) { const sp = 1.5 + ph * 0.45; rob.x += fx * sp * dt; rob.z += fz * sp * dt; rob.step += dt * sp * 2.2; }
        // swat anyone standing right in front
        const infront = (p.x - rob.x) * fx + (p.z - rob.z) * fz;
        if (tg.d < 3.4 && infront > 0.8 && rob.t > 1.2 && !rob.swatted) { rob.swatted = true; setState('swat'); return; }
      }
      const r = Math.hypot(rob.x, rob.z);
      if (r > 3.5) { rob.x *= 3.5 / r; rob.z *= 3.5 / r; }
      if (rob.t > 2.6 - ph * 0.6) {
        if (rob.attacks >= 2 + (ph === 2 ? 1 : 0)) { setState('tired'); FP.Audio.play('beep'); return; }
        const opts = ['stomp', 'laser', 'missiles'].filter((a) => a !== lastAttack);
        const a = opts[Math.floor(Math.random() * opts.length)];
        lastAttack = a; rob.attacks++; rob.swatted = false;
        if (a === 'laser') rob.a0 = rob.yaw;
        setState(a);
      }
      return;
    }
    if (rob.st === 'stomp') {
      const land = 1.3;
      if (rob.t > land && rob.t - dt <= land) {
        FP.Camera.shake(0.8); FP.Audio.play('bonk');
        FP.FX.puffs(new THREE.Vector3(rob.x, 0.3, rob.z), 24, 0xd8d8e0, 6, 2);
        for (let k = 0; k <= ph; k++) startRing(k * 0.55);
      }
      if (rob.t > 2.6) setState('walk');
      return;
    }
    if (rob.st === 'laser') {
      const w = 1.5 + ph * 0.35, total = 1 + (Math.PI * 2) / w;
      if (rob.t > 1) {
        const beams = ph === 2 ? [0, Math.PI] : [0];
        const ang = rob.a0 + w * (rob.t - 1);
        rob.yaw = ang;
        for (const c of chars) {
          if (!c.alive || c.ko > 0 || (c.lzCool || 0) > time) continue;
          const p = c.parts.torso.position, d = Math.hypot(p.x - rob.x, p.z - rob.z);
          if (d < 1.2 || d > R + 1.5) continue;
          const feet = Math.min(c.parts.legs[0].position.y, c.parts.legs[1].position.y);
          if (feet > 0.75) continue; // jumped over it!
          const phi = Math.atan2(p.x - rob.x, p.z - rob.z);
          for (const b of beams) {
            if (Math.abs(wrap(phi - (ang + b))) < 0.3 / d + 0.06) {
              c.lzCool = time + 1;
              const tx = Math.cos(ang + b), tz = -Math.sin(ang + b);
              knock(c, tx - (p.x - rob.x) / d * 0.3, tz - (p.z - rob.z) / d * 0.3, 3.5, 6, 1.2);
              FP.FX.word(c.parts.head.position, 'ZAP!', '#ff3a3a', 1.3); FP.Audio.play('bonk');
              break;
            }
          }
        }
      }
      if (rob.t > total) setState('walk');
      return;
    }
    if (rob.st === 'missiles') {
      if (rob.t > 0.8 && rob.t - dt <= 0.8) fireMissiles(chars);
      if (rob.t > 2.6) setState('walk');
      return;
    }
    if (rob.st === 'swat') {
      if (rob.t > 0.75 && rob.t - dt <= 0.75) {
        FP.Audio.play('whoosh');
        for (const c of chars) {
          if (!c.alive) continue;
          const p = c.parts.torso.position, dx = p.x - rob.x, dz = p.z - rob.z, d = Math.hypot(dx, dz);
          if (d < 4 && (dx * fx + dz * fz) / (d || 1) > 0.15 && p.y < 3) { knock(c, dx, dz, 4.5, 7, 1.2); FP.FX.word(c.parts.head.position, 'SWAT!', '#ffcf33', 1.4); }
        }
        FP.Camera.shake(0.4);
      }
      if (rob.t > 1.5) setState('walk');
      return;
    }
    if (rob.st === 'tired') {
      // it sits down facing the camera, so everyone can see the glowing core
      rob.yaw += wrap(0 - rob.yaw) * Math.min(1, dt * 6);
      // punch the core while it's open!
      if (rob.t > 0.6) {
        const cp = coreWorld();
        for (const c of chars) {
          c.bossCool = Math.max(0, (c.bossCool || 0) - dt);
          if (c.punchT > 0.25 || c.ko > 0 || c.bossCool > 0) continue;
          const fist = c.parts.arms[c.punchArm || 0].position;
          if (fist.distanceTo(cp) < 1.15) {
            c.bossCool = 0.35;
            const before = phase();
            rob.hp = Math.max(0, rob.hp - 1);
            const id = c.player.id;
            self.game.scores[id] = (self.game.scores[id] || 0) + 1;
            FP.FX.puffs(cp, 8, 0x9af0ff, 3, 1); FP.FX.word(cp.clone().add(new THREE.Vector3(0, 0.8, 0)), 'CLANG!', '#4ae0ff', 1.3);
            FP.Audio.play('bonk'); FP.Camera.shake(0.25);
            if (rob.hp <= 0) { setState('dead'); FP.Audio.play('cheer'); return; }
            if (phase() !== before) { setState('angry'); return; }
          }
        }
      }
      if (rob.t > 6 - ph * 0.5) { setState('walk'); rob.attacks = 0; }
      return;
    }
    if (rob.st === 'angry') {
      if (rob.t > 0.4 && rob.t - dt <= 0.4) {
        FP.Camera.shake(1); FP.Audio.play('bonk');
        FP.FX.word(new THREE.Vector3(rob.x, 6.5, rob.z), phase() === 2 ? 'SUPER ANGRY!' : 'ANGRY!', '#ff5a5f', 2);
        for (const c of chars) {
          if (!c.alive) continue;
          const p = c.parts.torso.position, dx = p.x - rob.x, dz = p.z - rob.z, d = Math.hypot(dx, dz);
          if (d < 4.5) knock(c, dx, dz, 5.5, 4, 0.8);
        }
      }
      if (rob.t > 1.6) { setState('walk'); rob.attacks = 0; }
    }
  }

  // how low the robot sits (0 standing, 1 sitting down tired)
  function sitAmount() {
    if (!rob) return 0;
    if (rob.st === 'tired') { const end = 6 - phase() * 0.5; return Math.min(1, rob.t / 0.5, Math.max(0, (end - rob.t) / 0.5)); }
    if (rob.st === 'dead') return 1;
    return 0;
  }
  function coreWorld() {
    M.core.updateWorldMatrix(true, false);
    return new THREE.Vector3().setFromMatrixPosition(M.core.matrixWorld);
  }

  // make the robot and all the effects look right (host and friends online)
  function visual(dt) {
    if (!M || !rob) return;
    // friends online only hear from the host a few times a second: keep the animation moving in between
    if (dt > 0 && FP.Net && FP.Net.isClient()) { rob.t += dt; if (rob.st === 'walk') rob.step += dt * 3.5; }
    const t = performance.now() / 1000, st = rob.st, k = sitAmount();
    let y = 0, lean = 0;
    if (st === 'intro') y = Math.max(0, 16 * (1 - rob.t / 1.2));
    if (st === 'stomp') y = rob.t < 0.6 ? -0.4 * (rob.t / 0.6) : rob.t < 1.3 ? Math.sin(((rob.t - 0.6) / 0.7) * Math.PI) * 3 : 0;
    y -= k * 2.1;
    if (st === 'dead') lean = Math.min(1.2, rob.t * 0.8);
    M.g.position.set(rob.x, y, rob.z);
    M.g.rotation.set(0, rob.yaw, 0);
    M.upper.rotation.x = lean * 0.3 - k * 0.35; // leans back when tired, so the core shows
    M.g.rotation.x = 0;
    // legs: walking swings, sitting folds them forward
    const swing = st === 'walk' ? Math.sin(rob.step * 2) * 0.5 : 0;
    M.legs[0].rotation.set(swing - k * 1.45, 0, -k * 0.55); M.legs[1].rotation.set(-swing - k * 1.45, 0, k * 0.55);
    // arms
    let a0 = -swing * 0.6, a1 = swing * 0.6, s0 = 0, s1 = 0;
    if (st === 'swat') { const w = rob.t < 0.75 ? -2.6 * (rob.t / 0.75) : -2.6 + Math.min(1, (rob.t - 0.75) / 0.2) * 3.6; a1 = w; }
    if (st === 'missiles') { a0 = a1 = rob.t < 0.8 ? -2.8 * (rob.t / 0.8) : -2.8; }
    if (st === 'laser') { s0 = -1.2; s1 = 1.2; }
    if (st === 'tired') { a0 = a1 = 0.3; s0 = -0.4; s1 = 0.4; }
    if (st === 'angry') { a0 = a1 = -2.9 + Math.sin(t * 30) * 0.2; }
    if (st === 'intro' && rob.t > 1.2) { a0 = a1 = -2.6; }
    M.arms[0].rotation.set(a0, 0, s0); M.arms[1].rotation.set(a1, 0, s1);
    // head and face
    M.head.rotation.x = k * 0.5 + (st === 'dead' ? 0.6 : 0);
    M.head.rotation.z = st === 'tired' ? Math.sin(t * 2) * 0.12 : 0;
    const angry = phase() === 2 || st === 'angry';
    M.brow.rotation.z = 0; M.brow.position.y = angry ? 0.96 : 1.02;
    const eyeCol = st === 'tired' || st === 'dead' ? 0x6a6f7a : angry ? 0xff1a1a : 0xff5a3a;
    for (const e of M.eyes) { e.material.color.setHex(eyeCol); e.scale.y = st === 'tired' ? 0.3 : 1; }
    M.bulb.material.color.setHex(Math.sin(t * (angry ? 16 : 6)) > 0 ? 0xff3a3a : 0x7a1a1a);
    // the chest opens when it's tired
    M.hatch.rotation.x = 1.7 * k;
    const pulse = 0.5 + 0.5 * Math.sin(t * 8);
    M.core.material.color.setHex(k > 0.5 ? (pulse > 0.5 ? 0x9af0ff : 0x4ae0ff) : 0x2a7a90);
    M.glow.visible = k > 0.5;
    M.glow.scale.setScalar(1 + pulse * 0.25);
    const hurt = 1 - rob.hp / rob.hpMax;
    M.core.scale.setScalar((1 - hurt * 0.35) * (1 + k * 0.3));
    // collider follows the robot (the core stays reachable when it sits)
    if (collider) {
      collider.position.set(rob.x - Math.sin(rob.yaw) * 0.35 * k, 2.3 - k * 2.3 + (st === 'intro' ? y : 0), rob.z - Math.cos(rob.yaw) * 0.35 * k);
      collider.quaternion.setFromEuler(0, rob.yaw, 0);
      if (st === 'dead') collider.position.y = -50;
    }
    // laser beams
    const w = 1.5 + phase() * 0.35;
    beamMeshes.forEach((b, i) => {
      const on = st === 'laser' && (i === 0 || phase() === 2);
      b.visible = on;
      if (!on) return;
      const warn = rob.t < 1;
      b.position.set(rob.x, 0.45, rob.z);
      b.rotation.set(0, (warn ? rob.a0 : rob.a0 + w * (rob.t - 1)) + i * Math.PI, 0);
      b.scale.set(warn ? 0.3 : 1, warn ? 0.3 : 1, 1);
      b.material.opacity = warn ? 0.4 + 0.3 * Math.sin(t * 25) : 0.9;
    });
    // rings
    for (const r of rings) {
      r.mesh.visible = r.on && r.r > 0.5;
      if (!r.mesh.visible) continue;
      r.mesh.position.set(r.x, 0.3, r.z);
      r.mesh.scale.set(r.r, r.r, 1);
    }
    // missiles
    for (const m of missiles) {
      const show = m.on && m.t > 0;
      m.ring.visible = m.fill.visible = m.mesh.visible = show;
      if (!show) continue;
      const q = Math.min(1, m.t / WARN);
      m.ring.position.set(m.x, 0.06, m.z); m.fill.position.set(m.x, 0.05, m.z);
      m.fill.scale.setScalar(q);
      m.ring.material.opacity = 0.5 + 0.4 * Math.sin(t * 20);
      m.mesh.position.set(m.x, 0.6 + (1 - q) * 22, m.z);
    }
  }

  function update(dt, chars, game, roundOver) {
    self.game = game;
    if (!rob) return null;
    if (dt > 0 && rob.st === 'dead') {
      // the robot falls apart with lots of little explosions
      rob.t += dt;
      if (Math.random() < dt * 10) { const p = new THREE.Vector3(rob.x + (Math.random() - 0.5) * 3, 1 + Math.random() * 3, rob.z + (Math.random() - 0.5) * 3); FP.FX.puffs(p, 8, Math.random() < 0.5 ? 0xff9a3c : 0xd8d8e0, 4, 1.4); }
      if (rob.t > 0.5 && rob.t - dt <= 0.5) { FP.Camera.shake(1); FP.Audio.play('win'); }
    }
    if (dt > 0 && !roundOver) {
      time += dt;
      think(dt, chars);
      for (const r of rings) {
        if (!r.on) continue;
        r.r += r.speed * dt;
        if (r.r > R + 2) { r.on = false; continue; }
        if (r.r < 0.5) continue;
        for (const c of chars) {
          if (!c.alive || c.ringHit === r.id) continue;
          const p = c.parts.torso.position, dx = p.x - r.x, dz = p.z - r.z, d = Math.hypot(dx, dz);
          const feet = Math.min(c.parts.legs[0].position.y, c.parts.legs[1].position.y);
          if (Math.abs(d - r.r) < 0.45 && feet < 0.7) { c.ringHit = r.id; knock(c, dx, dz, 4, 6, 1.1); }
        }
      }
      for (const m of missiles) if (m.on) { m.t += dt; if (m.t >= WARN) boom(m, chars); }
      // falling off costs a heart
      respawn.update(chars, dt, -6);
      for (const c of chars) {
        if (c.parts.torso.position.y < -6 && !c.fellCounted) { c.fellCounted = true; hearts = Math.max(0, hearts - 1); self.log.push(c.name + ' ' + time.toFixed(1) + ' last=' + c.bossLastHit); FP.UI.toast(`Oh no! ${hearts} heart${hearts === 1 ? '' : 's'} left`); }
        if (c.parts.torso.position.y > -2) c.fellCounted = false;
      }
    }
    visual();
    if (roundOver || dt === 0) return null;
    if (rob.st === 'dead' && rob.t > 2.2) {
      self.beaten = true;
      return { winners: chars.slice(), text: 'You beat the ROBOT!', sub: 'The World Tour champions!' };
    }
    if (rob.st !== 'dead' && (hearts <= 0 || time >= TIME)) return { winners: [], text: 'The robot wins!', sub: hearts <= 0 ? 'Out of hearts. Try again!' : 'Out of time. Try again!' };
    return null;
  }

  // friendly bots: dodge the attacks, punch the core when it's open
  function botThink(c, chars, dt, input, tools) {
    if (!rob) return false;
    const p = c.parts.torso.position;
    const dx = p.x - rob.x, dz = p.z - rob.z, d = Math.hypot(dx, dz) || 1;
    // jump over rings and the laser
    for (const r of rings) if (r.on && r.r > 0.5) { const dd = Math.hypot(p.x - r.x, p.z - r.z); if (dd - r.r > 0 && dd - r.r < 0.9 && c.grounded) input.jumpPressed = true; }
    if (rob.st === 'laser' && rob.t > 1) {
      const w = 1.5 + phase() * 0.35, ang = rob.a0 + w * (rob.t - 1), phi = Math.atan2(dx, dz);
      for (const b of phase() === 2 ? [0, Math.PI] : [0]) { const ahead = wrap(phi - (ang + b)); if (ahead > 0 && ahead < 0.55 / d * 3 + 0.08 && c.grounded) input.jumpPressed = true; }
    }
    // get out of missile circles
    for (const m of missiles) {
      if (!m.on || m.t < 0) continue;
      const mx = p.x - m.x, mz = p.z - m.z, md = Math.hypot(mx, mz);
      if (md < BLAST + 0.6) { input.x = mx / (md || 1); input.z = mz / (md || 1); if (Math.hypot(p.x + input.x * 2, p.z + input.z * 2) > EDGE - 0.5) { const t = input.x; input.x = -input.z; input.z = t; } tools.unstick(input); return true; }
    }
    if (rob.st === 'tired' && rob.t > 0.4) {
      // run to the front of the robot and punch the core
      const fx = Math.sin(rob.yaw), fz = Math.cos(rob.yaw);
      const side = ((c.index % 3) - 1) * 0.7;
      tools.steer(c, rob.x + fx * 1.7 + fz * side, rob.z + fz * 1.7 - fx * side, input);
      const cp = coreWorld();
      if (Math.hypot(p.x - cp.x, p.z - cp.z) < 1.8) { c.yaw = Math.atan2(cp.x - p.x, cp.z - p.z); input.x *= 0.2; input.z *= 0.2; if (Math.random() < dt * 5) input.punchPressed = true; }
    } else {
      // keep away from the robot, but not near the edge
      const b = tools.brain;
      b.wander = (b.wander || c.index * 1.7) + dt * 0.35;
      const want = 5.2, a = Math.atan2(dx, dz) + Math.sin(b.wander) * 0.8;
      tools.steer(c, rob.x + Math.sin(a) * want, rob.z + Math.cos(a) * want, input);
      const tx = rob.x + Math.sin(a) * want, tz = rob.z + Math.cos(a) * want;
      if (Math.hypot(tx, tz) > EDGE - 1) tools.steer(c, tx * 0.6, tz * 0.6, input);
    }
    tools.unstick(input);
    return true;
  }

  const HEART = '<svg viewBox="0 0 24 24" class="ico"><path d="M12 21l-8.5-8.6A5 5 0 0 1 12 5.6a5 5 0 0 1 8.5 6.8z" fill="#ff5a7a" stroke="#2a2140" stroke-width="1.6"/></svg>';
  const HEART_EMPTY = '<svg viewBox="0 0 24 24" class="ico"><path d="M12 21l-8.5-8.6A5 5 0 0 1 12 5.6a5 5 0 0 1 8.5 6.8z" fill="none" stroke="#2a2140" stroke-width="1.6" opacity=".35"/></svg>';
  function hud() {
    if (!rob) return '';
    const pct = Math.round((rob.hp / rob.hpMax) * 100);
    const tip = rob.st === 'tired' ? '<b>The core is open! PUNCH IT!</b>' : rob.st === 'laser' ? 'JUMP over the laser!' : rob.st === 'stomp' ? 'JUMP over the rings!' : rob.st === 'missiles' ? 'Get out of the red circles!' : 'Dodge its attacks. When it sits down, punch the glowing core!';
    return `<span class="boss-bar"><b>ROBOT</b><span class="bar"><i style="width:${pct}%"></i><em style="left:33.3%"></em><em style="left:66.6%"></em></span></span>` +
      `<span>${HEART.repeat(hearts)}${HEART_EMPTY.repeat(Math.max(0, maxHearts - hearts))} &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}</span><span class="hud-tip">${tip}</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#ffd0b0"/><ellipse cx="60" cy="66" rx="52" ry="11" fill="#9aa3ad" stroke="#2a2140" stroke-width="2"/><rect x="48" y="44" width="8" height="20" fill="#5a6270" stroke="#2a2140" stroke-width="2"/><rect x="64" y="44" width="8" height="20" fill="#5a6270" stroke="#2a2140" stroke-width="2"/><rect x="42" y="22" width="36" height="26" rx="3" fill="#b8c2cc" stroke="#2a2140" stroke-width="2"/><circle cx="60" cy="35" r="6" fill="#4ae0ff" stroke="#2a2140" stroke-width="2"/><rect x="48" y="8" width="24" height="15" rx="2" fill="#b8c2cc" stroke="#2a2140" stroke-width="2"/><rect x="52" y="13" width="6" height="3" fill="#ff3a3a"/><rect x="62" y="13" width="6" height="3" fill="#ff3a3a"/><rect x="32" y="24" width="8" height="22" fill="#5a6270" stroke="#2a2140" stroke-width="2"/><rect x="80" y="24" width="8" height="22" fill="#5a6270" stroke="#2a2140" stroke-width="2"/><ellipse cx="22" cy="60" rx="5" ry="7" fill="#5cc44a" stroke="#2a2140" stroke-width="2"/><circle cx="22" cy="50" r="4.5" fill="#5cc44a" stroke="#2a2140" stroke-width="2"/></svg>';

  const sIndex = (s) => Math.max(0, STATES.indexOf(s));
  const r2 = (v) => Math.round(v * 100) / 100;
  self = {
    id: 'boss', name: 'Robot Boss', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 1, song: 'tense', minZoom: 17, art: ART,
    desc: 'Everyone on one team against a GIANT robot! Jump over its attacks and punch its glowing core when it gets tired.',
    beaten: false, game: null, log: [], level: null,
    build, spawn, update, botThink, hud, visual,
    scoreLabel: (v) => `${v} hit${v === 1 ? '' : 's'}`,
    resultText: () => (self.beaten ? 'You beat the Robot Boss!' : 'The Robot Boss won this time.'),
    netState: () => rob && [r2(rob.x), r2(rob.z), r2(rob.yaw), sIndex(rob.st), r2(rob.t), rob.hp, rob.hpMax, hearts, Math.round(time), maxHearts, r2(rob.a0), r2(rob.step),
      rings.map((r) => (r.on ? [r2(r.x), r2(r.z), r2(r.r)] : 0)), missiles.map((m) => (m.on ? [r2(m.x), r2(m.z), r2(m.t)] : 0))],
    applyNetState: (s) => {
      if (!s || !rob) return;
      [rob.x, rob.z, rob.yaw] = s; rob.st = STATES[s[3]] || 'walk'; rob.t = s[4]; rob.hp = s[5]; rob.hpMax = s[6]; hearts = s[7]; time = s[8]; maxHearts = s[9]; rob.a0 = s[10]; rob.step = s[11];
      (s[12] || []).forEach((v, i) => { const r = rings[i]; if (!r) return; r.on = !!v; if (v) [r.x, r.z, r.r] = v; });
      (s[13] || []).forEach((v, i) => { const m = missiles[i]; if (!m) return; m.on = !!v; if (v) [m.x, m.z, m.t] = v; });
    },
  };
  return self;
})();
