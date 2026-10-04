// ============================================================
//  SIGMA HOVER GP — BATTLE ARENAS + BALLOON BATTLE
//  An arena is a flat open place. It works like a track for the
//  racers' physics, but you can drive anywhere.
//  (s = forward/back position, d = left/right position)
// ============================================================
window.HG = window.HG || {};

HG.Arena = class {
  constructor(def) {
    this.def = def; this.isArena = true;
    this.size = def.size; this.round = !!def.round;
    this.length = 1e9; this.n = 1; this.ds = 1;
    this.K = [0]; this.W = [1e4]; this.flags = [0]; this.offL = [0]; this.offR = [0];
    this.F = HG.Track.F;
    this.boosts = []; this.hazards = []; this.itemRows = []; this.signs = [];
    this.minY = 0; this.maxY = 0;
    this.box = new THREE.Box3(new THREE.Vector3(-this.size, 0, -this.size), new THREE.Vector3(this.size, 0, this.size));
    this.pillars = (def.pillars || []).map(([x, z, r]) => ({ x, z, r }));
    // ramps: [x, z, angle] (a ramp you drive up in the direction of angle)
    this.rampList = (def.ramps || []).map(([x, z, a]) => ({ x, z, a, len: 10, width: 9, height: 2.4, s0: 0, s1: 10, gap: 0, trick: true }));
    this.ramps = [];
    // item boxes: a ring + some in the middle
    this.boxes = [];
    const ringR = this.size * 0.55;
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3; this.boxes.push({ s: Math.sin(a) * ringR, d: -Math.cos(a) * ringR }); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.boxes.push({ s: Math.sin(a) * this.size * 0.82, d: -Math.cos(a) * this.size * 0.82 }); }
    this.boxes = this.boxes.filter((b) => !this.inPillar(-b.d, b.s, 3));
    this.coins = [];
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const r = this.size * 0.32; if (!this.inPillar(Math.cos(a) * r, Math.sin(a) * r, 2)) this.coins.push({ s: Math.sin(a) * r, d: -Math.cos(a) * r }); }
  }
  inPillar(x, z, m) { return this.pillars.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < (p.r + m) ** 2); }
  // the "track" functions the racers use
  frame(s, out) { out.p.set(0, 0, s); out.t.set(0, 0, 1); out.n.set(0, 1, 0); out.r.set(-1, 0, 0); out.w = 1e4; out.k = 0; out.offL = 0; out.offR = 0; out.flags = 0; out.i = 0; return out; }
  point(s, d, h, out) { return out.set(-d, h, s); }
  wrap(s) { return s; }
  diff(a, b) { return b - a; }
  idx() { return 0; }
  hasGround() { return true; }
  nearest() { return 0; }
  rampAt(s, d) {
    const x = -d, z = s;
    for (const r of this.rampList) {
      const dx = x - r.x, dz = z - r.z;
      // along the ramp and across it
      const along = dx * Math.sin(r.a) + dz * Math.cos(r.a) + r.len / 2;
      const across = dx * Math.cos(r.a) - dz * Math.sin(r.a);
      if (along >= 0 && along <= r.len && Math.abs(across) < r.width / 2) return { h: r.height * along / r.len, slope: r.height / r.len, ramp: r };
    }
    return null;
  }
  // starting spots in a circle, facing the middle
  spawn(i, n) {
    const a = (i / n) * Math.PI * 2;
    const r = this.size * 0.75;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    return { x: z, z: -x, yaw: Math.atan2(x, -z) };
  }
  // keep a body inside the arena and out of the pillars. Returns the push direction (in s,d) or null.
  pushOut(o, rad) {
    let x = -o.d, z = o.s, n = null;
    const lim = this.size - rad;
    if (this.round) {
      const r = Math.hypot(x, z);
      if (r > lim) { x *= lim / r; z *= lim / r; n = { s: -z / lim, d: x / lim }; }
    } else {
      if (Math.abs(x) > lim) { x = Math.sign(x) * lim; n = { s: 0, d: Math.sign(x) }; }
      if (Math.abs(z) > lim) { z = Math.sign(z) * lim; n = { s: -Math.sign(z), d: 0 }; }
    }
    for (const p of this.pillars) {
      const dx = x - p.x, dz = z - p.z, dist = Math.hypot(dx, dz), min = p.r + rad;
      if (dist < min && dist > 1e-4) { x = p.x + dx / dist * min; z = p.z + dz / dist * min; n = { s: dz / dist, d: -dx / dist }; }
    }
    o.s = z; o.d = -x;
    return n;
  }
  collide(k) {
    const n = this.pushOut(k, 1.2);
    if (!n) return;
    // bounce off the wall
    let vs = k.spd * Math.cos(k.yaw) - k.lat * Math.sin(k.yaw), vd = k.spd * Math.sin(k.yaw) + k.lat * Math.cos(k.yaw);
    const into = vs * n.s + vd * n.d;
    if (into < 0) {
      vs -= 1.5 * into * n.s; vd -= 1.5 * into * n.d;
      const keep = 0.75;
      k.spd = (vs * Math.cos(k.yaw) + vd * Math.sin(k.yaw)) * keep; k.lat = (-vs * Math.sin(k.yaw) + vd * Math.cos(k.yaw)) * keep;
      if (-into > 4 && k.wallT <= 0) { k.events.push({ type: 'wall', hard: -into }); k.wallT = 0.3; }
      if (k.drift.dir) k.cancelDrift();
    }
  }
  collidePoint(t, rad) { return this.pushOut(t, rad); }
  reflect(yaw, n) {
    let vs = Math.cos(yaw), vd = Math.sin(yaw);
    const dot = vs * n.s + vd * n.d;
    vs -= 2 * dot * n.s; vd -= 2 * dot * n.d;
    return Math.atan2(vd, vs);
  }
};

// ------------------------------------------------------------
//  ARENA LOOKS
// ------------------------------------------------------------
HG.ArenaMesh = {
  build(ar, theme) {
    const M = HG.M, g = new THREE.Group();
    const S = ar.size;
    const floorTex = HG.Tex.road(theme.road).clone(); floorTex.needsUpdate = true;
    floorTex.repeat.set(S / 12, S / 12);
    const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, roughness: theme.roadRough !== undefined ? theme.roadRough : 0.7, metalness: theme.roadMetal || 0.05 });
    if (theme.roadGlow) { floorMat.emissive = new THREE.Color(0xffffff); floorMat.emissiveMap = floorTex; floorMat.emissiveIntensity = theme.roadGlow; }
    const floor = new THREE.Mesh(ar.round ? new THREE.CircleGeometry(S + 1, 64) : new THREE.PlaneGeometry(S * 2 + 2, S * 2 + 2), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; g.add(floor);
    // a big Σ painted in the middle
    const logo = new THREE.Mesh(new THREE.CircleGeometry(S * 0.25, 48), new THREE.MeshBasicMaterial({ map: HG.Tex.sign('Σ', '#00000000', '#ffcc1a', 256, 256), transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }));
    logo.rotation.x = -Math.PI / 2; logo.position.y = 0.05; g.add(logo);
    // walls
    const wallTex = HG.Tex.wall(theme.wall).clone(); wallTex.needsUpdate = true; wallTex.repeat.set(ar.round ? S / 2 : S / 4, 1);
    const wm = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.6, side: THREE.DoubleSide });
    if (theme.wall === 'neon' || theme.wall === 'rainbow') { wm.emissive = new THREE.Color(0xffffff); wm.emissiveMap = wallTex; wm.emissiveIntensity = 0.9; }
    if (ar.round) { const w = new THREE.Mesh(new THREE.CylinderGeometry(S, S, 3, 64, 1, true), wm); w.position.y = 1.5; g.add(w); }
    else for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(S * 2, 3), wm); const a = (i / 4) * Math.PI * 2; w.position.set(Math.sin(a) * S, 1.5, Math.cos(a) * S); w.rotation.y = a + Math.PI; g.add(w); }
    // pillars
    const pm = M.mat(theme.pillar ? '#' + new THREE.Color(theme.pillar).getHexString() : '#8a8c92', { rough: 0.6 });
    const cap = M.glowMat(theme.edgeGlow || 0x3ad8ff, 1.8);
    for (const p of ar.pillars) {
      const c = new THREE.Mesh(M.cyl(p.r, p.r * 1.1, 8, 24), pm); c.position.set(p.x, 4, p.z); c.castShadow = true; c.receiveShadow = true; g.add(c);
      const r = new THREE.Mesh(M.torus(p.r * 1.05, 0.25, Math.PI * 2, 6, 32), cap); r.rotation.x = Math.PI / 2; r.position.set(p.x, 8, p.z); g.add(r);
    }
    // ramps
    const rt = HG.Tex.ramp();
    const rm = new THREE.MeshStandardMaterial({ map: rt, emissive: 0xffffff, emissiveMap: rt, emissiveIntensity: 0.45, roughness: 0.4 });
    for (const r of ar.rampList) {
      const geo = new THREE.BufferGeometry();
      const L = r.len, W = r.width / 2, H = r.height;
      const v = [-W, 0, -L / 2, W, 0, -L / 2, W, H, L / 2, -W, H, L / 2, -W, 0, L / 2, W, 0, L / 2];
      geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1], 2));
      geo.setIndex([0, 2, 1, 0, 3, 2, 4, 3, 5, 3, 2, 5, 0, 4, 3, 1, 2, 5]);
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, rm); m.position.set(r.x, 0.02, r.z); m.rotation.y = r.a; m.castShadow = true; g.add(m);
    }
    return g;
  },
};

// ------------------------------------------------------------
//  BALLOON BATTLE: 3 balloons each. Hit someone = pop a balloon.
//  Lose all your balloons and you're out. Last one wins!
// ------------------------------------------------------------
HG.Battle = (function () {
  const U = HG.U;
  function pop(k, by, race) {
    if (k.balloons <= 0) return;
    k.balloons--;
    k.events.push({ type: 'pop' });
    if (by && by !== k) by.score++;
    if (k.balloons <= 0) {
      k.out = true; k.outT = race.time;
      k.events.push({ type: 'out' });
      race.events.push({ type: 'out', kart: k });
    }
  }
  function update(race, dt) {
    if (!race.go || race.phase === 'done') return;
    const alive = race.karts.filter((k) => !k.out);
    const humansAlive = race.karts.some((k) => k.ctrl !== 'cpu' && !k.out);
    const limit = race.cfg.timeLimit || 150;
    if (alive.length <= 1 || race.time > limit || (!humansAlive && race.karts.some((k) => k.ctrl !== 'cpu'))) {
      race.phase = 'done'; race.doneT = 0;
      // the winner(s)
      const order = race.karts.slice().sort((a, b) => (b.out ? 0 : 1000) + b.balloons * 100 + b.score - ((a.out ? 0 : 1000) + a.balloons * 100 + a.score));
      order.forEach((k, i) => { k.finished = true; k.finishPlace = i + 1; k.place = i + 1; k.events.push({ type: 'finish', place: i + 1 }); });
      race.finishOrder = order;
      race.events.push({ type: 'alldone' });
    }
  }
  // CPU brain for the arena: chase someone, grab boxes, shoot
  function driveAI(k, race, dt) {
    const ai = k.ai, inp = k.input, tr = race.track;
    if (!race.go || k.out) { inp.steer = 0; inp.gas = 0; inp.drift = false; return; }
    ai.retarget = (ai.retarget || 0) - dt;
    if (ai.retarget <= 0 || !ai.target || ai.target.out) {
      ai.retarget = U.rand(2, 4);
      if (!k.item && !(k.roulette > 0) && HG.Items.boxes.length && Math.random() < 0.7) {
        let best = null, bd = 1e9;
        for (const b of HG.Items.boxes) { if (b.t > 0) continue; const d = (b.s - k.s) ** 2 + (b.d - k.d) ** 2; if (d < bd) { bd = d; best = b; } }
        ai.target = best ? { s: best.s, d: best.d, box: true } : null;
      } else {
        const others = race.karts.filter((o) => o !== k && !o.out);
        others.sort((a, b) => ((a.s - k.s) ** 2 + (a.d - k.d) ** 2) - ((b.s - k.s) ** 2 + (b.d - k.d) ** 2));
        ai.target = others[Math.floor(Math.random() * Math.min(2, others.length))] || null;
      }
    }
    let ts = 0, td = 0;
    if (ai.target) { ts = ai.target.s; td = ai.target.d; }
    let want = Math.atan2(td - k.d, ts - k.s);
    // stay away from walls and pillars
    const x = -k.d, z = k.s;
    const rr = Math.hypot(x, z);
    if (rr > tr.size * 0.8) want = Math.atan2(-k.d, -k.s);   // head back to the middle
    for (const p of tr.pillars) {
      const dx = p.x - x, dz = p.z - z, dist = Math.hypot(dx, dz);
      if (dist < p.r + 7) { const away = Math.atan2(dx, -dz); want += U.angleDiff(away, want) > 0 ? 0.6 : -0.6; }
    }
    const err = U.wrapAngle(want - k.yaw);
    inp.steer = U.clamp(err * 2.2, -1, 1);
    inp.gas = Math.abs(err) > 2.2 && k.spd < 6 ? 0 : 1;
    inp.brake = Math.abs(err) > 2.4 ? 1 : 0;
    inp.drift = false;
    if (ai.target && ai.target.box && (ts - k.s) ** 2 + (td - k.d) ** 2 < 9) ai.retarget = 0;
    // stuck
    if (k.spd < 2) ai.stuck += dt; else ai.stuck = 0;
    if (ai.stuck > 1.5) { ai.reverseT = 0.8; ai.stuck = 0; }
    if (ai.reverseT > 0) { ai.reverseT -= dt; inp.gas = 0; inp.brake = 1; inp.steer = 1; }
    if (HG.Items) HG.Items.aiUse(k, race, dt);
  }
  return { pop, update, driveAI };
})();
