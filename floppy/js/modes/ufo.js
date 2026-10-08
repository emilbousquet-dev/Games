// ============================================================
//  FLOPPY PARTY — UFO MOTHERSHIP (the boss of Outer Space,
//  World 6 of the World Tour). Everyone plays on the SAME team.
//  A giant flying saucer floats over a space station:
//    - TRACTOR BEAM: a green beam chases someone. Get caught
//      and you float up... and get dropped! Keep running.
//    - LITTLE ALIENS: it drops aliens that hop around and bump
//      you. PUNCH them to pop them.
//    - LASER RAIN: red stripes appear on the floor, then ZAP!
//      Step out of the stripes.
//  After a few attacks it gets tired and LANDS: punch the
//  glowing lights around its edge! Falling off costs a heart.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.ufo = (function () {
  const R = 9, EDGE = 7.4, TIME = 240, HEARTS = 10, FLY_Y = 5.6, LAND_Y = 1.1, LIGHTS = 8, RIM = 3.05, BEAM_R = 1.35;
  const STATES = ['intro', 'fly', 'beam', 'aliens', 'rain', 'landed', 'angry', 'dead'];
  let U = null, M = null, collider = null, hearts = HEARTS, maxHearts = HEARTS, time = 0, lastAttack = '', respawn = null, self = null;
  let minions = [], stripes = [], beam = null, shadow = null, curtains = [];

  // ---------------- the saucer ----------------
  function makeUfo() {
    const L = FP.Look, g = new THREE.Group();
    const hull = L.mesh(new THREE.SphereGeometry(3, 32, 16), L.toon(0xc9d3dc), 0.05);
    hull.scale.y = 0.28;
    const rim = L.mesh(new THREE.TorusGeometry(RIM, 0.26, 10, 48), L.toon(0x8a94a3), 0.03);
    rim.rotation.x = Math.PI / 2;
    const belly = L.mesh(new THREE.CylinderGeometry(1.2, 1.6, 0.5, 24), L.toon(0x6a7282), 0.03);
    belly.position.y = -0.7;
    const bellyLight = new THREE.Mesh(new THREE.CircleGeometry(1.0, 24), new THREE.MeshBasicMaterial({ color: 0x9dff6a, side: THREE.DoubleSide }));
    bellyLight.rotation.x = Math.PI / 2; bellyLight.position.y = -0.96;
    // the glass dome with a little alien pilot inside
    const pilot = new THREE.Group(); pilot.position.y = 0.55;
    const head = L.mesh(new THREE.SphereGeometry(0.62, 18, 14), L.toon(0x7ddc5a), 0.03);
    head.scale.set(1, 1.1, 1); pilot.add(head);
    const eyes = [];
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshBasicMaterial({ color: 0x1a1030 }));
      e.scale.set(0.8, 1.2, 0.5); e.position.set(s * 0.25, 0.08, 0.52); pilot.add(e); eyes.push(e);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine.position.set(s * 0.25 + 0.05, 0.16, 0.62); pilot.add(shine);
    }
    for (const s of [-1, 1]) {
      const stalk = L.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), L.toon(0x7ddc5a), 0.01);
      stalk.position.set(s * 0.22, 0.78, 0); stalk.rotation.z = -s * 0.3; pilot.add(stalk);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
      ball.position.set(s * 0.3, 1.02, 0); pilot.add(ball);
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xbfefff, transparent: true, opacity: 0.35, depthWrite: false }));
    dome.position.y = 0.45;
    // the lights around the edge (punch them when it lands!)
    const lights = [];
    for (let i = 0; i < LIGHTS; i++) {
      const a = (i / LIGHTS) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
      b.position.set(Math.sin(a) * RIM, 0, Math.cos(a) * RIM);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.3, depthWrite: false }));
      b.add(halo);
      g.add(b); lights.push({ m: b, halo, flash: 0 });
    }
    g.add(hull, rim, belly, bellyLight, pilot, dome);
    return { g, hull, pilot, eyes, lights, bellyLight };
  }
  function makeMinion() {
    const L = FP.Look, g = new THREE.Group();
    const body = L.mesh(new THREE.SphereGeometry(0.38, 16, 12), L.toon(0x7ddc5a), 0.03);
    g.add(body);
    for (const s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      w.position.set(s * 0.14, 0.08, 0.3); g.add(w);
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a1030 }));
      p.position.set(s * 0.14, 0.08, 0.41); g.add(p);
    }
    const stalk = L.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), L.toon(0x7ddc5a), 0.01); stalk.position.y = 0.48; g.add(stalk);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff7eb6 })); ball.position.y = 0.66; g.add(ball);
    const b = new CANNON.Body({ mass: 0.5, material: FP.Physics.mats.prop, linearDamping: 0.15, fixedRotation: true, collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.ALL });
    b.addShape(new CANNON.Sphere(0.38));
    b.position.set(0, -60, 0);
    FP.Stage.prop(g, b);
    return { g, b, on: false, t: 0, hop: 0 };
  }
  // a dark space sky full of stars
  let starSky = null;
  function spaceSky() {
    if (starSky) return starSky;
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512;
    const x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#0b0930'); gr.addColorStop(0.6, '#2a1a5e'); gr.addColorStop(1, '#4a2a7a');
    x.fillStyle = gr; x.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 420; i++) { x.fillStyle = `rgba(255,255,255,${0.35 + Math.random() * 0.65})`; const s = Math.random() < 0.08 ? 2.4 : 1.2; x.fillRect(Math.random() * 1024, Math.random() * 512, s, s); }
    starSky = new THREE.CanvasTexture(cv);
    return starSky;
  }

  function build(list) {
    const S = FP.Stage;
    const lv = { easy: 0, normal: 1, hard: 2 }[self.level] ?? 1; // World Tour difficulty
    maxHearts = [13, HEARTS, 7][lv];
    hearts = maxHearts; time = 0; lastAttack = ''; self.beaten = false;
    // space! (the sky, fog and clouds come back when the level is cleared)
    const oldBg = S.scene.background, oldFog = S.scene.fog;
    S.scene.background = spaceSky(); S.scene.fog = null;
    if (S.sky) S.sky.visible = false;
    S.hemi.color.setHex(0xd8d0ff); S.hemi.groundColor.setHex(0x6a5aa8); S.sun.color.setHex(0xf0f0ff);
    S.onClear(() => { S.scene.background = oldBg; S.scene.fog = oldFog; if (S.sky) S.sky.visible = true; S.hemi.color.setHex(0xffffff); S.hemi.groundColor.setHex(0x9fc4ff); S.sun.color.setHex(0xfff4e0); });
    const metal = { grass: 0x9aa6c4, dirt: 0x4a4f6a };
    S.island(0, -1, 0, R * 2, 2, R * 1.2, metal);
    S.island(0, -1, 0, R * 1.2, 2, R * 2, metal);
    S.island(0, -1, 0, R * 1.7, 2, R * 1.7, metal);
    // glowing edge lines and a fence
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshBasicMaterial({ color: k % 2 ? 0x4ae0ff : 0xb07bff }));
      m.rotation.x = -Math.PI / 2; m.rotation.z = -a; m.position.set(Math.sin(a) * EDGE, 0.02, Math.cos(a) * EDGE); S.add(m);
    }
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * Math.PI * 2, fr = 8.3, w = 2 * Math.PI * fr / 36 - 0.25;
      const b = FP.Physics.staticBox(Math.sin(a) * fr, 0.25, Math.cos(a) * fr, w, 0.5, 0.3);
      b.quaternion.setFromEuler(0, a, 0); b.aabbNeedsUpdate = true;
      S.bodies.push(b);
      const m = FP.Look.boxMesh(w, 0.5, 0.3, FP.Look.toon(k % 2 ? 0x3a3f5a : 0x6a7292));
      m.position.copy(b.position); m.rotation.y = a; S.add(m);
    }
    // a big ringed planet far away
    const planet = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 20), FP.Look.toon(0xff9a6a));
    planet.position.set(-46, -6, -70); S.add(planet);
    const pring = new THREE.Mesh(new THREE.RingGeometry(20, 27, 48), new THREE.MeshBasicMaterial({ color: 0xffd0a0, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
    pring.position.copy(planet.position); pring.rotation.set(1.2, 0.3, 0); S.add(pring);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(4, 20, 14), FP.Look.toon(0xd8d8f0)); moon.position.set(40, 14, -60); S.add(moon);
    // the UFO, its shadow, the tractor beam, laser stripes
    M = makeUfo(); S.add(M.g);
    shadow = new THREE.Mesh(new THREE.CircleGeometry(3, 32), new THREE.MeshBasicMaterial({ color: 0x1a1030, transparent: true, opacity: 0.25, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.03; S.add(shadow);
    const bgeo = new THREE.CylinderGeometry(0.5, BEAM_R, 1, 24, 1, true); bgeo.translate(0, -0.5, 0);
    beam = new THREE.Mesh(bgeo, new THREE.MeshBasicMaterial({ color: 0x9dff6a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    beam.visible = false; S.add(beam);
    stripes = []; curtains = [];
    for (let i = 0; i < 6; i++) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 16), new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide }));
      st.rotation.x = -Math.PI / 2; st.position.y = 0.05; st.visible = false; S.add(st);
      const cu = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), new THREE.MeshBasicMaterial({ color: 0x9dff6a, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }));
      cu.visible = false; S.add(cu);
      stripes.push({ on: false, off: 0, mesh: st }); curtains.push(cu);
    }
    collider = FP.Physics.kinematicBox(0, -50, 0, 4, 1.3, 4);
    S.bodies.push(collider);
    minions = [];
    for (let i = 0; i < 6; i++) minions.push(makeMinion());
    const n = Math.max(1, list ? list.length : 1);
    const hpMax = Math.round((12 + 7 * n) * [0.75, 1, 1.35][lv]); // (the last boss: tougher than the robot)
    U = { x: 0, z: -2, st: 'intro', t: 0, hp: hpMax, hpMax, attacks: 0, a0: 0, wave: 0, bx: 0, bz: 0, target: -1, spin: 0 };
    FP.Camera.setAngle(0.6, 0.85);
    FP.Camera.fix(new THREE.Vector3(0, 2.8, 0.2), 17.5);
    respawn = FP.Kit.respawner((c) => { const a = Math.atan2(-U.x, -U.z) + (c.index - 1.5) * 0.5; return { x: Math.sin(a) * 5, y: 1.5, z: Math.cos(a) * 5, yaw: a + Math.PI }; });
  }

  function spawn(i, n) { return { x: (i - (n - 1) / 2) * 1.8, y: 0.2, z: 3.5, yaw: Math.PI }; }

  const phase = () => (U.hp > (U.hpMax * 2) / 3 ? 0 : U.hp > U.hpMax / 3 ? 1 : 2);
  function setState(st) { U.st = st; U.t = 0; }
  function knock(c, dx, dz, power, up, ko = 1.2) {
    const l = Math.hypot(dx, dz) || 1;
    FP.Ragdoll.knockOut(c, ko);
    for (const b of c.bodies) { b.velocity.x += (dx / l) * power; b.velocity.z += (dz / l) * power; b.velocity.y += up; }
  }
  const alive = (chars) => chars.filter((c) => c.alive && !respawn.waiting(c) && c.parts.torso.position.y > -1);
  // fly toward a spot, but stay over the station
  function flyTo(x, z, speed, dt) {
    const dx = x - U.x, dz = z - U.z, d = Math.hypot(dx, dz);
    if (d > 0.05) { const s = Math.min(d, speed * dt); U.x += (dx / d) * s; U.z += (dz / d) * s; }
    const r = Math.hypot(U.x, U.z), max = 4.2;
    if (r > max) { U.x *= max / r; U.z *= max / r; }
  }
  function dropMinions() {
    const n = 2 + phase();
    let k = 0;
    for (const m of minions) {
      if (m.on || k >= n) continue;
      k++;
      m.on = true; m.t = 0; m.hop = 0.6 + k * 0.2;
      m.b.position.set(U.x + (Math.random() - 0.5) * 1.5, FLY_Y - 1.2, U.z + (Math.random() - 0.5) * 1.5);
      m.b.velocity.set((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3);
    }
    FP.Audio.play('boing');
  }
  function popMinion(m, word = true) {
    if (!m.on) return;
    m.on = false;
    const p = m.b.position.clone();
    if (word) { FP.FX.puffs(new THREE.Vector3(p.x, p.y, p.z), 10, 0x9dff6a, 3.5, 1.1); FP.FX.word(new THREE.Vector3(p.x, p.y + 0.5, p.z), 'POP!', '#7ddc5a', 1.1); FP.Audio.play('plop'); }
    m.b.position.set(0, -60, 0); m.b.velocity.set(0, 0, 0);
  }
  function newStripes() {
    U.a0 = Math.random() * Math.PI;
    const spots = [-6, -3.6, -1.2, 1.2, 3.6, 6].sort(() => Math.random() - 0.5).slice(0, 3 + phase());
    stripes.forEach((s, i) => { s.on = i < spots.length; s.off = spots[i] || 0; });
  }
  function zapStripes(chars) {
    const nx = Math.cos(U.a0), nz = -Math.sin(U.a0);
    FP.Audio.play('bonk'); FP.Camera.shake(0.35);
    for (const c of chars) {
      if (!c.alive || c.ko > 0) continue;
      const p = c.parts.torso.position, side = p.x * nx + p.z * nz;
      for (const s of stripes) {
        if (!s.on || Math.abs(side - s.off) > 0.7) continue;
        const dir = side - s.off >= 0 ? 1 : -1;
        knock(c, nx * dir, nz * dir, 4.5, 5.5, 1.1);
        FP.FX.word(c.parts.head.position, 'ZAP!', '#9dff6a', 1.3);
        break;
      }
    }
  }
  function lightWorld(i) { const l = M.lights[i].m; l.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(l.matrixWorld); }

  // the saucer's brain (runs only on the host)
  function think(dt, chars) {
    U.t += dt;
    const ph = phase();
    if (U.st === 'intro') {
      if (U.t > 1.5 && U.t - dt <= 1.5) { FP.Camera.shake(0.6); FP.Audio.play('alarm'); FP.FX.word(new THREE.Vector3(U.x, 8, U.z), 'UFO BOSS!', '#9dff6a', 2.2); }
      if (U.t > 2.8) setState('fly');
      return;
    }
    if (U.st === 'dead') return;
    if (U.st === 'fly') {
      const a = alive(chars);
      if (a.length) {
        // hover near the players (not right on top of them)
        const c = a[Math.floor(time / 4) % a.length], p = c.parts.torso.position;
        flyTo(p.x * 0.6, p.z * 0.6, 1.6 + ph * 0.4, dt);
      }
      if (U.t > 2.4 - ph * 0.5) {
        if (U.attacks >= 2 + (ph === 2 ? 1 : 0)) { setState('landed'); FP.Audio.play('whoosh'); return; }
        const opts = ['beam', 'aliens', 'rain'].filter((x) => x !== lastAttack);
        const next = opts[Math.floor(Math.random() * opts.length)];
        lastAttack = next; U.attacks++;
        if (next === 'beam') { const a2 = alive(chars); U.target = a2.length ? a2[Math.floor(Math.random() * a2.length)].index : -1; }
        if (next === 'rain') { newStripes(); U.wave = 0; }
        setState(next);
      }
      return;
    }
    if (U.st === 'beam') {
      // chase someone with the tractor beam
      const tc = chars.find((c) => c.index === U.target && c.alive) || alive(chars)[0];
      if (tc) { const p = tc.parts.torso.position; flyTo(p.x, p.z, U.t < 1 ? 4 : 2.1 + ph * 0.6, dt); }
      U.bx = U.x; U.bz = U.z;
      if (U.t > 1) {
        for (const c of chars) {
          if (!c.alive || c.ko > 0 || c.lifted > 0) continue;
          const p = c.parts.torso.position;
          if (Math.hypot(p.x - U.bx, p.z - U.bz) < BEAM_R && p.y < 3) {
            c.beamT = (c.beamT || 0) + dt;
            if (c.beamT > 0.55) { c.lifted = 0.9; c.beamT = 0; FP.FX.word(c.parts.head.position, 'BEAM ME UP!', '#9dff6a', 1.2); FP.Audio.play('boing'); }
          } else c.beamT = Math.max(0, (c.beamT || 0) - dt * 2);
        }
      }
      if (U.t > 4.6 + ph * 0.5) setState('fly');
      return;
    }
    if (U.st === 'aliens') {
      flyTo(0, -1, 2, dt);
      if (U.t > 0.9 && U.t - dt <= 0.9) dropMinions();
      if (U.t > 2.2) setState('fly');
      return;
    }
    if (U.st === 'rain') {
      flyTo(0, -1, 2, dt);
      const zapAt = 1.6, second = ph === 2;
      if (U.t > zapAt && U.t - dt <= zapAt) zapStripes(chars);
      if (second && U.t > zapAt + 0.9 && U.t - dt <= zapAt + 0.9) { newStripes(); U.wave = 1; }
      if (second && U.t > zapAt * 2 + 0.9 && U.t - dt <= zapAt * 2 + 0.9) zapStripes(chars);
      if (U.t > (second ? zapAt * 2 + 1.5 : zapAt + 0.8)) { stripes.forEach((s) => { s.on = false; }); setState('fly'); }
      return;
    }
    if (U.st === 'landed') {
      // coming down: a puff of air pushes everyone out from under it (so nobody gets squished)
      if (U.t > 0.25 && U.t - dt <= 0.25) {
        for (const c of chars) {
          if (!c.alive) continue;
          const p = c.parts.torso.position, dx = p.x - U.x, dz = p.z - U.z, d = Math.hypot(dx, dz);
          if (d < RIM + 0.4) knock(c, dx || 1, dz, 3.2, 3, 0.5);
        }
        FP.FX.puffs(new THREE.Vector3(U.x, 0.3, U.z), 24, 0xd8d8f0, 6, 2);
      }
      // punch the lights around the edge!
      if (U.t > 0.7) {
        for (const c of chars) {
          c.ufoCool = Math.max(0, (c.ufoCool || 0) - dt);
          if (c.punchT > 0.25 || c.ko > 0 || c.ufoCool > 0) continue;
          const fist = c.parts.arms[c.punchArm || 0].position;
          for (let i = 0; i < LIGHTS; i++) {
            const lp = lightWorld(i);
            if (fist.distanceTo(lp) > 1.05) continue;
            c.ufoCool = 0.35;
            M.lights[i].flash = 0.3;
            const before = phase();
            U.hp = Math.max(0, U.hp - 1);
            const id = c.player.id;
            self.game.scores[id] = (self.game.scores[id] || 0) + 1;
            FP.FX.puffs(lp, 8, 0xfff3a0, 3, 1); FP.FX.word(lp.clone().add(new THREE.Vector3(0, 0.8, 0)), 'BZZT!', '#ffe066', 1.2);
            FP.Audio.play('bonk'); FP.Camera.shake(0.2);
            if (U.hp <= 0) { setState('dead'); FP.Audio.play('cheer'); return; }
            if (phase() !== before) { setState('angry'); return; }
            break;
          }
        }
      }
      if (U.t > 5.5 - ph * 0.5) { setState('fly'); U.attacks = 0; }
      return;
    }
    if (U.st === 'angry') {
      if (U.t > 0.3 && U.t - dt <= 0.3) {
        FP.Camera.shake(0.9); FP.Audio.play('alarm');
        FP.FX.word(new THREE.Vector3(U.x, 5, U.z), phase() === 2 ? 'SUPER ANGRY!' : 'ANGRY!', '#ff5a5f', 2);
        for (const c of chars) {
          if (!c.alive) continue;
          const p = c.parts.torso.position, dx = p.x - U.x, dz = p.z - U.z, d = Math.hypot(dx, dz);
          if (d < 4.8) knock(c, dx, dz, 6, 4, 0.8);
        }
      }
      if (U.t > 1.6) { setState('fly'); U.attacks = 0; }
    }
  }

  // how high the saucer floats right now
  function heightNow() {
    if (!U) return FLY_Y;
    const t = performance.now() / 1000, bob = Math.sin(t * 2) * 0.25;
    if (U.st === 'intro') return FLY_Y + Math.max(0, 22 * (1 - U.t / 1.5)) + bob;
    if (U.st === 'landed') { const end = 5.5 - phase() * 0.5; const k = Math.min(1, U.t / 0.6, Math.max(0, (end - U.t) / 0.6)); return FLY_Y + (LAND_Y - FLY_Y) * k; }
    if (U.st === 'dead') return LAND_Y + Math.max(0, U.t - 1) * 6;
    return FLY_Y + bob;
  }

  function visual(dt) {
    if (!M || !U) return;
    if (dt > 0 && FP.Net && FP.Net.isClient()) U.t += dt; // keep moving between the host's messages
    const t = performance.now() / 1000, st = U.st, y = heightNow(), landed = st === 'landed';
    U.spin += (dt || 0.016) * (landed ? 0.3 : st === 'dead' ? 8 : 1.4);
    M.g.position.set(U.x + (st === 'dead' ? (U.t - 1 > 0 ? (U.t - 1) * 4 : 0) : 0), y, U.z);
    M.g.rotation.set(landed ? Math.sin(t * 3) * 0.06 : 0, U.spin, landed ? Math.cos(t * 3) * 0.06 : st === 'dead' ? Math.min(0.6, U.t * 0.4) : 0);
    // the pilot: dizzy when landed, angry when hurt
    M.pilot.rotation.y = -U.spin + (landed ? Math.sin(t * 6) * 0.5 : 0);
    const angry = phase() === 2 || st === 'angry';
    for (const e of M.eyes) e.scale.set(landed ? 1 : 0.8, landed ? 0.35 : angry ? 0.8 : 1.2, 0.5);
    // edge lights: blinking while flying, big and glowing when it lands (punch them!)
    M.lights.forEach((l, i) => {
      l.flash = Math.max(0, l.flash - (dt || 0.016));
      const blink = (Math.floor(t * 6) + i) % 3 === 0;
      l.m.material.color.setHex(l.flash > 0 ? 0xffffff : landed ? (Math.sin(t * 8 + i) > 0 ? 0xffe066 : 0xffb030) : blink ? 0xff7eb6 : 0xffe066);
      l.halo.visible = landed || l.flash > 0;
      l.m.scale.setScalar(landed ? 1.35 : 1);
    });
    M.bellyLight.material.color.setHex(st === 'beam' ? 0x9dff6a : 0x5a8a4a);
    // shadow on the floor
    shadow.position.set(U.x, 0.03, U.z);
    shadow.scale.setScalar(0.7 + Math.max(0, 1 - (y - LAND_Y) / 10) * 0.5);
    shadow.visible = st !== 'dead';
    // tractor beam
    const bOn = st === 'beam';
    beam.visible = bOn;
    if (bOn) {
      const warn = U.t < 1;
      beam.position.set(U.x, y - 0.9, U.z);
      beam.scale.set(warn ? 0.35 : 1, y - 0.9, warn ? 0.35 : 1);
      beam.material.opacity = warn ? 0.2 + 0.15 * Math.sin(t * 20) : 0.35 + 0.08 * Math.sin(t * 10);
    }
    // laser stripes: red warning, then a green ZAP curtain
    const nx = Math.cos(U.a0), nz = -Math.sin(U.a0);
    const zapAt = 1.6, rt = st === 'rain' ? (U.wave ? U.t - zapAt - 0.9 : U.t) : -1;
    const zapping = rt > zapAt && rt < zapAt + 0.35;
    stripes.forEach((s, i) => {
      const on = st === 'rain' && s.on && rt >= 0 && rt < zapAt + 0.35;
      s.mesh.visible = on;
      curtains[i].visible = on && zapping;
      if (!on) return;
      s.mesh.position.set(nx * s.off, 0.05, nz * s.off);
      s.mesh.rotation.set(-Math.PI / 2, 0, U.a0);
      s.mesh.material.color.setHex(zapping ? 0x9dff6a : 0xff3a3a);
      s.mesh.material.opacity = zapping ? 0.8 : 0.3 + 0.25 * Math.sin(t * (8 + rt * 10));
      curtains[i].position.set(nx * s.off, 4.5, nz * s.off);
      curtains[i].rotation.set(0, U.a0 + Math.PI / 2, 0);
    });
    // the saucer is solid when it lands
    if (collider) collider.position.set(U.x, landed && y < 2.2 ? y : -50, U.z);
  }

  function update(dt, chars, game, roundOver) {
    self.game = game;
    if (!U) return null;
    if (dt > 0 && U.st === 'dead') {
      U.t += dt;
      if (Math.random() < dt * 12) { const p = M.g.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, (Math.random() - 0.3) * 1.5, (Math.random() - 0.5) * 4)); FP.FX.puffs(p, 8, Math.random() < 0.5 ? 0x9dff6a : 0xd8d8e0, 4, 1.4); }
      if (U.t > 0.5 && U.t - dt <= 0.5) { FP.Camera.shake(1); FP.Audio.play('win'); for (const m of minions) popMinion(m); }
    }
    if (dt > 0 && !roundOver) {
      time += dt;
      think(dt, chars);
      // people caught by the tractor beam float up... and get dropped
      for (const c of chars) {
        if (!(c.lifted > 0)) continue;
        c.lifted -= dt;
        const p = c.parts.torso.position;
        for (const b of c.bodies) { b.velocity.y = 3.6; b.velocity.x += ((U.bx - p.x) * 2 - b.velocity.x) * Math.min(1, dt * 4); b.velocity.z += ((U.bz - p.z) * 2 - b.velocity.z) * Math.min(1, dt * 4); }
        // dropped! (flung away from the middle, so watch out for the edge)
        if (c.lifted <= 0) { const a = Math.atan2(p.x, p.z) + (Math.random() - 0.5) * 1.2; knock(c, Math.sin(a), Math.cos(a), 4.2, 2, 1.5); FP.FX.word(c.parts.head.position, 'DROPPED!', '#9dff6a', 1.2); }
      }
      // little aliens hop at the nearest player
      for (const m of minions) {
        if (!m.on) continue;
        m.t += dt; m.hop -= dt;
        const p = m.b.position;
        if (p.y < -5 || m.t > 14) { popMinion(m, p.y > -5); continue; }
        let best = null, bd = Infinity;
        for (const c of chars) { if (!c.alive) continue; const q = c.parts.torso.position, d = Math.hypot(q.x - p.x, q.z - p.z); if (d < bd) { bd = d; best = c; } }
        if (best && m.hop <= 0 && p.y < 0.7) {
          m.hop = 0.9 + Math.random() * 0.4;
          const q = best.parts.torso.position, d = bd || 1;
          m.b.velocity.set(((q.x - p.x) / d) * 3.4, 4.6, ((q.z - p.z) / d) * 3.4);
        }
        if (best && bd < 0.85 && Math.abs(best.parts.torso.position.y - p.y) < 1.2 && (best.minCool || 0) < time && best.ko <= 0) {
          best.minCool = time + 1.2;
          const q = best.parts.torso.position;
          knock(best, q.x - p.x, q.z - p.z, 3.8, 4, 0.9);
          FP.FX.word(q, 'BONK!', '#7ddc5a', 1.1);
          m.b.velocity.set((p.x - q.x) * 3, 3, (p.z - q.z) * 3);
        }
        // punch them to pop them
        for (const c of chars) {
          if (!c.alive || c.punchT > 0.25) continue;
          if (c.parts.arms[c.punchArm || 0].position.distanceTo(p) < 0.75) { popMinion(m); break; }
        }
      }
      // falling off costs a heart
      respawn.update(chars, dt, -6);
      for (const c of chars) {
        if (c.parts.torso.position.y < -6 && !c.fellCounted) { c.fellCounted = true; c.lifted = 0; hearts = Math.max(0, hearts - 1); FP.UI.toast(`Oh no! ${hearts} heart${hearts === 1 ? '' : 's'} left`); }
        if (c.parts.torso.position.y > -2) c.fellCounted = false;
      }
    }
    // the little aliens always face the way they hop
    for (const m of minions) if (m.on) m.g.rotation.y = Math.atan2(m.b.velocity.x, m.b.velocity.z);
    visual();
    if (roundOver || dt === 0) return null;
    if (U.st === 'dead' && U.t > 2.6) {
      self.beaten = true;
      return { winners: chars.slice(), text: 'You beat the UFO!', sub: 'The aliens fly home!' };
    }
    if (U.st !== 'dead' && (hearts <= 0 || time >= TIME)) return { winners: [], text: 'The UFO wins!', sub: hearts <= 0 ? 'Out of hearts. Try again!' : 'Out of time. Try again!' };
    return null;
  }

  // friendly bots: run from the beam, step out of the stripes, pop aliens, punch the lights
  function botThink(c, chars, dt, input, tools) {
    if (!U) return false;
    const p = c.parts.torso.position;
    if (U.st === 'beam') {
      const dx = p.x - U.bx, dz = p.z - U.bz, d = Math.hypot(dx, dz);
      if (d < BEAM_R + 2.2) {
        let ax = dx / (d || 1), az = dz / (d || 1);
        if (Math.hypot(p.x + ax * 2, p.z + az * 2) > EDGE - 0.8) { const t = ax; ax = -az; az = t; }
        input.x = ax; input.z = az; tools.unstick(input); return true;
      }
    }
    if (U.st === 'rain') {
      const nx = Math.cos(U.a0), nz = -Math.sin(U.a0), side = p.x * nx + p.z * nz;
      for (const s of stripes) {
        if (!s.on || Math.abs(side - s.off) > 1.1) continue;
        const dir = side - s.off >= 0 ? 1 : -1;
        // step out on the side that isn't another stripe (and isn't the edge)
        let tx = p.x + nx * dir * 1.6, tz = p.z + nz * dir * 1.6;
        if (Math.hypot(tx, tz) > EDGE - 0.6 || stripes.some((o) => o !== s && o.on && Math.abs(tx * nx + tz * nz - o.off) < 0.9)) { tx = p.x - nx * dir * 1.6; tz = p.z - nz * dir * 1.6; }
        tools.steer(c, tx, tz, input); tools.unstick(input); return true;
      }
    }
    if (U.st === 'landed' && U.t > 0.5) {
      // go to the nearest light and punch it
      let bi = 0, bd = Infinity;
      for (let i = 0; i < LIGHTS; i++) { const lp = lightWorld(i), d = Math.hypot(lp.x - p.x, lp.z - p.z) + (i === (c.index * 2) % LIGHTS ? -1 : 0); if (d < bd) { bd = d; bi = i; } }
      const lp = lightWorld(bi), ox = lp.x - U.x, oz = lp.z - U.z, ol = Math.hypot(ox, oz) || 1;
      tools.steer(c, lp.x + (ox / ol) * 0.9, lp.z + (oz / ol) * 0.9, input);
      if (Math.hypot(lp.x - p.x, lp.z - p.z) < 1.5) { c.yaw = Math.atan2(lp.x - p.x, lp.z - p.z); input.x *= 0.2; input.z *= 0.2; if (Math.random() < dt * 5) input.punchPressed = true; }
      tools.unstick(input); return true;
    }
    // pop little aliens nearby
    let near = null, nd = 3;
    for (const m of minions) { if (!m.on) continue; const d = Math.hypot(m.b.position.x - p.x, m.b.position.z - p.z); if (d < nd) { nd = d; near = m; } }
    if (near) {
      tools.steer(c, near.b.position.x, near.b.position.z, input);
      if (nd < 1.2) { c.yaw = Math.atan2(near.b.position.x - p.x, near.b.position.z - p.z); if (Math.random() < dt * 6) input.punchPressed = true; }
      tools.unstick(input); return true;
    }
    // otherwise wander around the station (not too close to the edge)
    const b = tools.brain;
    b.wander = (b.wander || c.index * 1.7) + dt * 0.4;
    tools.steer(c, Math.sin(b.wander) * 4, Math.cos(b.wander * 1.3) * 3.5, input);
    tools.unstick(input);
    return true;
  }

  const HEART = '<svg viewBox="0 0 24 24" class="ico"><path d="M12 21l-8.5-8.6A5 5 0 0 1 12 5.6a5 5 0 0 1 8.5 6.8z" fill="#ff5a7a" stroke="#2a2140" stroke-width="1.6"/></svg>';
  const HEART_EMPTY = '<svg viewBox="0 0 24 24" class="ico"><path d="M12 21l-8.5-8.6A5 5 0 0 1 12 5.6a5 5 0 0 1 8.5 6.8z" fill="none" stroke="#2a2140" stroke-width="1.6" opacity=".35"/></svg>';
  function hud() {
    if (!U) return '';
    const pct = Math.round((U.hp / U.hpMax) * 100);
    const tip = U.st === 'landed' ? '<b>It landed! PUNCH the lights on its edge!</b>' : U.st === 'beam' ? 'Run from the green beam!' : U.st === 'rain' ? 'Get off the red stripes!' : U.st === 'aliens' ? 'PUNCH the little aliens!' : 'Dodge its attacks. When it lands, punch the lights!';
    return `<span class="boss-bar"><b>UFO</b><span class="bar"><i style="width:${pct}%"></i><em style="left:33.3%"></em><em style="left:66.6%"></em></span></span>` +
      `<span>${HEART.repeat(hearts)}${HEART_EMPTY.repeat(Math.max(0, maxHearts - hearts))} &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}</span><span class="hud-tip">${tip}</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#231a55"/><g fill="#fff"><circle cx="14" cy="12" r="1.2"/><circle cx="100" cy="10" r="1.5"/><circle cx="84" cy="24" r="1"/><circle cx="30" cy="30" r="1"/><circle cx="108" cy="40" r="1.2"/></g><path d="M44 50L36 74h48l-8-24z" fill="#9dff6a" opacity=".45"/><ellipse cx="60" cy="68" rx="30" ry="6" fill="#9aa6c4" stroke="#2a2140" stroke-width="2"/><ellipse cx="60" cy="40" rx="36" ry="11" fill="#c9d3dc" stroke="#2a2140" stroke-width="2.4"/><path d="M42 36a18 16 0 0 1 36 0z" fill="#bfefff" stroke="#2a2140" stroke-width="2"/><ellipse cx="60" cy="30" rx="6" ry="7" fill="#7ddc5a" stroke="#2a2140" stroke-width="1.6"/><ellipse cx="57.6" cy="30" rx="1.6" ry="2.4" fill="#1a1030"/><ellipse cx="62.4" cy="30" rx="1.6" ry="2.4" fill="#1a1030"/><g fill="#ffe066" stroke="#2a2140" stroke-width="1.2"><circle cx="30" cy="42" r="3"/><circle cx="46" cy="47" r="3"/><circle cx="60" cy="49" r="3"/><circle cx="74" cy="47" r="3"/><circle cx="90" cy="42" r="3"/></g></svg>';

  const sIndex = (s) => Math.max(0, STATES.indexOf(s));
  const r2 = (v) => Math.round(v * 100) / 100;
  self = {
    id: 'ufo', name: 'UFO Mothership', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 1, song: 'tense', minZoom: 17, noTags: false, art: ART,
    desc: 'Everyone on one team against a giant UFO! Run from its beam, pop its little aliens, and punch its lights when it lands.',
    beaten: false, game: null, level: null,
    build, spawn, update, botThink, hud, visual,
    scoreLabel: (v) => `${v} hit${v === 1 ? '' : 's'}`,
    resultText: () => (self.beaten ? 'You beat the UFO Mothership!' : 'The UFO won this time.'),
    netState: () => U && [r2(U.x), r2(U.z), sIndex(U.st), r2(U.t), U.hp, U.hpMax, hearts, Math.round(time), maxHearts, r2(U.a0), U.wave, r2(U.bx), r2(U.bz), stripes.map((s) => (s.on ? r2(s.off) : null))],
    applyNetState: (s) => {
      if (!s || !U) return;
      [U.x, U.z] = s; U.st = STATES[s[2]] || 'fly'; U.t = s[3]; U.hp = s[4]; U.hpMax = s[5]; hearts = s[6]; time = s[7]; maxHearts = s[8]; U.a0 = s[9]; U.wave = s[10]; U.bx = s[11]; U.bz = s[12];
      (s[13] || []).forEach((v, i) => { if (stripes[i]) { stripes[i].on = v !== null; stripes[i].off = v || 0; } });
    },
  };
  return self;
})();
