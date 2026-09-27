// ============================================================
//  FLOPPY PARTY — KART RACING
//  Floppy drivers in go-karts! 3 laps around the track.
//  Drive through the ? boxes to get an item:
//   - Boost: a burst of speed
//   - Banana: drop it behind you, karts that hit it spin out
//   - Bouncy ball: flies ahead and spins out the kart in front
//   - Star: super fast, and you knock others away
//  Hold JUMP while turning to DRIFT (sparks = a mini boost).
//  The camera is behind your kart. Two or more players on one
//  computer get a split screen.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.kart = (function () {
  const LAPS = 3, HALF_W = 4.8, WALL = HALF_W + 6, N = 600, AFTER_FIRST = 25, SCALE = 1.3;
  const MAX_SPEED = 17, ACCEL = 9;
  const ITEMS = ['boost', 'banana', 'ball', 'star', 'triple'];
  const POINTS = [5, 3, 2, 1];
  // the track: a closed loop through these points (smoothed into a curve)
  const CONTROL = [[0, -34], [24, -34], [40, -22], [40, -2], [26, 8], [30, 24], [16, 36], [-6, 32], [-18, 18], [-34, 22], [-44, 4], [-36, -18], [-18, -30]];
  let path = [], karts = [], boxes = [], bananas = [], balls = [], time = 0, firstT = -1, finished = [], cams = [], hudBox = null, mini = null, self = null;

  // ---------------- the track shape ----------------
  function buildPath() {
    const P = CONTROL.map(([x, z]) => new THREE.Vector3(x * SCALE, 0, z * SCALE));
    const curve = new THREE.CatmullRomCurve3(P, true, 'catmullrom', 0.5);
    const pts = curve.getSpacedPoints(N);
    pts.pop(); // the last point is the same as the first
    path = pts.map((p, i) => {
      const n = pts[(i + 1) % N], b = pts[(i - 1 + N) % N];
      const tx = n.x - b.x, tz = n.z - b.z, l = Math.hypot(tx, tz) || 1;
      return { x: p.x, z: p.z, tx: tx / l, tz: tz / l, h: Math.atan2(tx / l, tz / l) };
    });
  }

  // closest point on the track, searching near where we were last time
  function nearest(x, z, from = -1) {
    let best = 0, bd = Infinity;
    const scan = from < 0 ? N : 40;
    for (let k = -scan; k <= scan; k++) {
      const i = from < 0 ? (k + N) % N : (from + k + N) % N;
      if (from < 0 && k < 0) continue;
      const p = path[i], d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    const p = path[best];
    const side = (x - p.x) * p.tz - (z - p.z) * p.tx; // + is right of the track
    return { i: best, d: Math.sqrt(bd), side };
  }

  // a road made of a long ribbon of triangles
  function ribbon(w0, w1, y, color, opts = {}) {
    const pos = [], col = [], idx = [];
    const c1 = new THREE.Color(color), c2 = new THREE.Color(opts.color2 || color);
    for (let i = 0; i <= N; i++) {
      const p = path[i % N];
      const nx = p.tz, nz = -p.tx; // pointing right
      pos.push(p.x + nx * w0, y, p.z + nz * w0, p.x + nx * w1, y, p.z + nz * w1);
      const cc = opts.stripes && Math.floor(i / opts.stripes) % 2 ? c2 : c1;
      col.push(cc.r, cc.g, cc.b, cc.r, cc.g, cc.b);
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: FP.Look.toon(0xffffff).gradientMap, side: THREE.DoubleSide }));
    m.receiveShadow = true;
    return m;
  }

  function dashes() {
    // white dashes down the middle of the road
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = 0; i < N; i += 8) {
      const p = path[i];
      const d = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 2.2), mat);
      d.rotation.set(-Math.PI / 2, 0, -p.h);
      d.position.set(p.x, 0.085, p.z);
      g.add(d);
    }
    return g;
  }

  // ---------------- models ----------------
  function kartMesh(color) {
    const g = new THREE.Group();
    const body = FP.Look.mesh(new THREE.BoxGeometry(1.5, 0.45, 2.3), FP.Look.toon(color), 0.04);
    body.position.y = 0.45;
    const nose = FP.Look.mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.44, 16, 1, false, -Math.PI / 2, Math.PI), FP.Look.toon(color), 0.04);
    nose.rotation.set(0, 0, 0); nose.position.set(0, 0.45, 1.15);
    const bumper = FP.Look.boxMesh(1.7, 0.22, 0.3, FP.Look.toon(0x3a3450), 0.03);
    bumper.position.set(0, 0.3, 1.75);
    const seat = FP.Look.boxMesh(0.9, 0.7, 0.25, FP.Look.toon(0x2a2140), 0.03);
    seat.position.set(0, 0.85, -0.75);
    const spoilerL = FP.Look.boxMesh(0.1, 0.5, 0.1, FP.Look.toon(0x3a3450), 0), spoilerR = spoilerL.clone();
    spoilerL.position.set(-0.55, 0.9, -1.1); spoilerR.position.set(0.55, 0.9, -1.1);
    const wing = FP.Look.boxMesh(1.7, 0.1, 0.5, FP.Look.toon(color), 0.03);
    wing.position.set(0, 1.18, -1.15);
    const wheelCol = FP.Look.toon(0x2a2438), hub = FP.Look.toon(0xdddddd);
    const wheels = [];
    for (const [x, z] of [[-0.85, 0.85], [0.85, 0.85], [-0.85, -0.85], [0.85, -0.85]]) {
      const w = FP.Look.mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 14), wheelCol, 0.03);
      w.rotation.z = Math.PI / 2; w.position.set(x, 0.34, z);
      const h = FP.Look.mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.32, 10), hub, 0);
      w.add(h);
      g.add(w); wheels.push(w);
    }
    const wheel = FP.Look.mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 14), FP.Look.toon(0x2a2140), 0);
    wheel.position.set(0, 0.95, 0.35); wheel.rotation.x = -0.9;
    // boost flames and drift sparks
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 10), new THREE.MeshBasicMaterial({ color: 0xffa23a, transparent: true, opacity: 0.9 }));
    flame.rotation.x = -Math.PI / 2; flame.position.set(0, 0.5, -1.55); flame.visible = false;
    const sparks = [];
    for (const x of [-0.85, 0.85]) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), new THREE.MeshBasicMaterial({ color: 0x5ab8ff })); sp.position.set(x, 0.15, -1.1); sp.visible = false; g.add(sp); sparks.push(sp); }
    g.add(body, nose, bumper, seat, spoilerL, spoilerR, wing, wheel, flame);
    g.userData = { wheels, flame, sparks, body, wheel };
    return g;
  }

  function boxMesh() {
    const g = new THREE.Group();
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const x = cv.getContext('2d');
    x.fillStyle = '#ffcf33'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#ff7eb6'; x.fillRect(4, 4, 56, 56);
    x.fillStyle = '#ffffff'; x.font = '900 48px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.strokeStyle = '#2a2140'; x.lineWidth = 6;
    x.strokeText('?', 32, 35); x.fillText('?', 32, 35);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshBasicMaterial({ map: tex }));
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.22, 1.22, 1.22)), new THREE.LineBasicMaterial({ color: 0x2a2140 }));
    const glow = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff3a0, transparent: true, opacity: 0.25, depthWrite: false }));
    g.add(cube, edge, glow);
    return g;
  }

  function itemMesh(kind) {
    if (kind === 'banana') {
      const m = FP.Look.mesh(new THREE.TorusGeometry(0.32, 0.12, 8, 16, Math.PI * 1.1), FP.Look.toon(0xffe14a), 0.03);
      m.rotation.set(Math.PI / 2, 0, 0.6);
      const g = new THREE.Group(); g.add(m); return g;
    }
    const b = FP.Look.mesh(new THREE.SphereGeometry(0.45, 16, 12), FP.Look.toon(0xff4d5e), 0.04);
    const stripe = FP.Look.mesh(new THREE.TorusGeometry(0.45, 0.07, 6, 20), FP.Look.toon(0xffffff), 0);
    stripe.rotation.x = Math.PI / 2;
    const g = new THREE.Group(); g.add(b, stripe); return g;
  }

  // ---------------- building the level ----------------
  function build() {
    time = 0; firstT = -1; finished = []; karts = []; boxes = []; bananas = []; balls = []; cams = [];
    buildPath();
    const S = FP.Stage;
    S.island(0, -1.02, 0, 112 * SCALE + 6, 2, 96 * SCALE + 6, { grass: 0x86d15f });
    S.add(ribbon(-WALL + 1.5, WALL - 1.5, 0.03, 0x9fdc72)); // lighter grass near the road
    S.add(ribbon(-HALF_W - 0.6, HALF_W + 0.6, 0.05, 0xff5a5f, { color2: 0xffffff, stripes: 3 })); // curbs
    S.add(ribbon(-HALF_W, HALF_W, 0.07, 0x6b6f80));
    S.add(dashes());
    // checkered start line and the start arch
    const p0 = path[0];
    const cv = document.createElement('canvas'); cv.width = 160; cv.height = 32;
    const c2 = cv.getContext('2d');
    for (let i = 0; i < 20; i++) for (let j = 0; j < 4; j++) { c2.fillStyle = (i + j) % 2 ? '#2a2140' : '#ffffff'; c2.fillRect(i * 8, j * 8, 8, 8); }
    const lineTex = new THREE.CanvasTexture(cv); lineTex.colorSpace = THREE.SRGBColorSpace;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, 1.4), new THREE.MeshBasicMaterial({ map: lineTex }));
    line.rotation.set(-Math.PI / 2, 0, -p0.h); line.position.set(p0.x, 0.09, p0.z);
    S.add(line);
    const arch = FP.Props.arch('FLOPPY GP', HALF_W * 2 + 1.2, '#ffcf33');
    arch.position.set(p0.x, 0, p0.z); arch.rotation.y = p0.h;
    S.add(arch);
    // fans near the start, trees and flowers around
    const fans = FP.Props.crowd(2, 12, 1.2);
    fans.position.set(p0.x + p0.tz * -(WALL + 1.5), 0, p0.z - p0.tx * -(WALL + 1.5));
    fans.rotation.y = p0.h - Math.PI / 2;
    S.add(fans);
    for (let k = 0; k < 30; k++) {
      const i = (k * 37) % N, p = path[i], side = k % 2 ? 1 : -1, dist = WALL + 2 + (k % 5) * 1.6;
      const x = p.x + p.tz * side * dist, z = p.z - p.tx * side * dist;
      if (Math.abs(x) > 53 * SCALE || Math.abs(z) > 45 * SCALE) continue;
      if (nearest(x, z).d < WALL + 1) continue;
      const t = k % 4 === 0 ? FP.Props.rock(0.9) : FP.Look.tree(0.9 + (k % 3) * 0.2);
      t.position.set(x, 0, z);
      S.add(t);
    }
    // ? item boxes: 3 rows across the road
    for (const at of [Math.floor(N * 0.18), Math.floor(N * 0.52), Math.floor(N * 0.8)]) {
      const p = path[at];
      for (let k = -1.5; k <= 1.5; k++) {
        const x = p.x + p.tz * k * 2.4, z = p.z - p.tx * k * 2.4;
        const m = boxMesh(); m.position.set(x, 1, z); S.add(m);
        boxes.push({ x, z, mesh: m, wait: 0 });
      }
    }
    // the per-player lap, place and item display, and the mini map
    hudBox = document.createElement('div');
    hudBox.className = 'kart-hud';
    document.body.append(hudBox);
    mini = makeMiniMap();
    document.body.append(mini.el);
    S.onClear(() => {
      if (hudBox) hudBox.remove(); if (mini) mini.el.remove(); hudBox = null; mini = null;
      FP.Audio.engine(0);
      // drivers get their normal bodies back (so they can stand on the podium)
      for (const k of karts) for (const b of k.c.bodies) b.collisionFilterMask = FP.Physics.ALL & ~k.c.group;
    });
    FP.Camera.setAngle(0.8, 0.6);
  }

  function spawn(i, n) {
    // a starting grid behind the line: 2 karts side by side per row
    const row = Math.floor(i / 2), col = i % 2 ? 1 : -1;
    const idx = (N - 6 - row * 5) % N, p = path[idx];
    return { x: p.x + p.tz * col * 2.2, y: 0.2, z: p.z - p.tx * col * 2.2, yaw: p.h };
  }

  // each character gets a kart the first time we see them
  function kartOf(c) {
    let k = karts.find((q) => q.c === c);
    if (k) return k;
    const p = c.parts.torso.position;
    const nr = nearest(p.x, p.z);
    k = {
      c, x: p.x, z: p.z, h: path[nr.i].h, v: 0, steer: 0, idx: nr.i, lap: nr.i > N / 2 ? -1 : 0, prog: 0, spin: 0, boost: 0, star: 0, drift: 0, driftDir: 0, hop: 0,
      item: null, uses: 0, done: false, place: 0, mesh: kartMesh(c.color.body), hitCool: 0,
    };
    // the driver's arms and legs don't bump into the ground (they sit inside the kart)
    for (const b of c.bodies) b.collisionFilterMask &= ~(FP.Physics.GROUP.WORLD | FP.Physics.GROUP.PROP);
    FP.Stage.add(k.mesh);
    karts.push(k);
    return k;
  }

  // ---------------- driving ----------------
  // the game hands us each player's buttons here (instead of walking)
  function control(c, input, dt, playing) {
    const k = kartOf(c);
    if (playing && !k.done) drive(k, input || {}, dt);
    else { k.v *= Math.max(0, 1 - dt * 2); k.x += Math.sin(k.h) * k.v * dt; k.z += Math.cos(k.h) * k.v * dt; }
    seat(k, dt);
  }

  function drive(k, input, dt) {
    k.hitCool -= dt;
    const nr = nearest(k.x, k.z, k.idx);
    // laps: crossing the line forwards (from the end of the track to the start)
    if (nr.i < N * 0.15 && k.idx > N * 0.85) k.lap++;
    else if (nr.i > N * 0.85 && k.idx < N * 0.15) k.lap--;
    k.idx = nr.i;
    k.prog = k.lap * N + k.idx;
    const offroad = nr.d > HALF_W + 0.6 && k.star <= 0;
    if (k.spin > 0) {
      k.spin -= dt;
      k.h += dt * 11;
      k.v *= Math.max(0, 1 - dt * 2.5);
    } else {
      const steer = Math.max(-1, Math.min(1, input.x || 0));
      k.steer += (steer - k.steer) * Math.min(1, dt * 10);
      const brake = (input.z || 0) > 0.5;
      const top = (brake ? -5 : MAX_SPEED) * (offroad ? 0.45 : 1) * (k.boost > 0 ? 1.4 : 1) * (k.star > 0 ? 1.25 : 1);
      k.v += Math.max(-ACCEL * 2.2 * dt, Math.min(ACCEL * dt * (k.boost > 0 ? 2.5 : 1), top - k.v));
      // drifting: hold jump while turning. Keep it up for a mini boost!
      if (input.jump && Math.abs(k.steer) > 0.35 && k.v > 8) {
        if (!k.driftDir) { k.driftDir = Math.sign(k.steer); k.drift = 0; }
        k.drift += dt;
      } else if (k.driftDir) {
        if (k.drift > 1.8) { k.boost = Math.max(k.boost, 1.2); FP.Audio.play('whoosh'); }
        else if (k.drift > 0.8) { k.boost = Math.max(k.boost, 0.6); FP.Audio.play('whoosh'); }
        k.driftDir = 0; k.drift = 0;
      }
      if (input.jumpPressed && k.hop <= 0) k.hop = 0.28;
      const grip = Math.min(1, Math.abs(k.v) / 6) * Math.sign(k.v || 1);
      const turn = k.driftDir ? (k.driftDir * 0.75 + k.steer * 0.55) * 2.3 : k.steer * 2.1;
      k.h -= turn * grip * dt; // steering right turns the kart to the driver's right
      // use the item
      if (input.punchPressed && k.item) useItem(k);
    }
    k.boost = Math.max(0, k.boost - dt);
    k.star = Math.max(0, k.star - dt);
    k.hop = Math.max(0, k.hop - dt);
    k.x += Math.sin(k.h) * k.v * dt;
    k.z += Math.cos(k.h) * k.v * dt;
    // the edge of the track area: bump back
    const nr2 = nearest(k.x, k.z, k.idx);
    if (nr2.d > WALL) {
      const p = path[nr2.i];
      const over = nr2.d - WALL, s = Math.sign(nr2.side);
      k.x -= p.tz * s * over; k.z += p.tx * s * over;
      k.v *= 0.6;
      if (k.hitCool <= 0) { k.hitCool = 0.4; FP.Audio.play('bonk'); }
    }
    // item boxes
    for (const b of boxes) {
      if (b.wait > 0 || Math.hypot(b.x - k.x, b.z - k.z) > 1.4) continue;
      b.wait = 3;
      if (!k.item) { k.item = pickItem(k); k.uses = k.item === 'triple' ? 3 : 1; }
      FP.Audio.play('coin');
    }
    // finished?
    if (k.lap >= LAPS && !k.done) finish(k);
  }

  // better items for karts at the back
  function pickItem(k) {
    const back = (Math.max(1, k.place) - 1) / Math.max(1, karts.length - 1); // 0 = first, 1 = last
    const r = Math.random();
    if (back > 0.66) return r < 0.3 ? 'star' : r < 0.6 ? 'triple' : r < 0.85 ? 'ball' : 'boost';
    if (back > 0.33) return r < 0.1 ? 'star' : r < 0.35 ? 'ball' : r < 0.6 ? 'boost' : r < 0.8 ? 'triple' : 'banana';
    return r < 0.55 ? 'banana' : r < 0.8 ? 'boost' : 'ball';
  }

  function useItem(k) {
    const it = k.item;
    const fx = Math.sin(k.h), fz = Math.cos(k.h);
    if (it === 'boost' || it === 'triple') { k.boost = 1.3; FP.Audio.play('whoosh'); }
    else if (it === 'star') { k.star = 5; FP.Audio.play('win'); }
    else if (it === 'banana') {
      const m = itemMesh('banana'); m.position.set(k.x - fx * 2, 0.15, k.z - fz * 2); FP.Stage.add(m);
      bananas.push({ x: k.x - fx * 2, z: k.z - fz * 2, mesh: m, owner: k, age: 0 });
      if (bananas.length > 14) { const old = bananas.shift(); FP.Stage.scene.remove(old.mesh); old.mesh.visible = false; }
    } else if (it === 'ball') {
      const m = itemMesh('ball'); FP.Stage.add(m);
      const ahead = karts.filter((o) => o !== k && !o.done && o.prog > k.prog).sort((a, b) => a.prog - b.prog)[0] || null;
      balls.push({ x: k.x + fx * 2.2, z: k.z + fz * 2.2, idx: k.idx, owner: k, target: ahead, life: 5, mesh: m, side: nearest(k.x, k.z, k.idx).side });
      FP.Audio.play('whoosh');
    }
    k.uses--;
    if (k.uses <= 0) k.item = null;
  }

  function spinOut(k, by) {
    if (k.star > 0 || k.spin > 0) return;
    k.spin = 1.1; k.driftDir = 0;
    k.c.expression = 'oh'; k.c.exprTimer = 1.2;
    if (by && by.c) { k.c.lastHitBy = by.c; k.c.lastHitTime = performance.now(); }
    FP.FX.word(k.c.parts.head.position, 'SPIN!', '#ff5a5f', 1);
    FP.Audio.play('bonk');
  }

  function finish(k) {
    k.done = true;
    finished.push(k);
    k.place = finished.length;
    const g = FP.Game;
    if (k.c.player) g.scores[k.c.player.id] = POINTS[k.place - 1] || 0;
    k.c.cheer = 4; k.c.expression = 'happy'; k.c.exprTimer = 4;
    FP.FX.word(k.c.parts.head.position, ['1st!', '2nd!', '3rd!', '4th!'][k.place - 1] || 'Done!', '#ffcf33', 1.6);
    FP.FX.confetti(new THREE.Vector3(k.x, 2, k.z));
    FP.Props.hype();
    FP.Audio.play(k.place === 1 ? 'win' : 'coin');
    if (k.place === 1) { firstT = time; FP.UI.big(`${k.c.name} wins!`, 1.4, `${AFTER_FIRST} seconds left for everyone else!`); if (FP.Net) FP.Net.banner(`${k.c.name} wins!`, `${AFTER_FIRST} seconds left for everyone else!`); }
  }

  // put the floppy driver in the seat (the arms reach for the steering wheel)
  function seat(k, dt) {
    const c = k.c, t = c.parts.torso;
    const fx = Math.sin(k.h), fz = Math.cos(k.h);
    const hopY = k.hop > 0 ? Math.sin((k.hop / 0.28) * Math.PI) * 0.35 : 0;
    t.position.set(k.x - fx * 0.55, 1.05 + hopY, k.z - fz * 0.55);
    t.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), k.h);
    t.velocity.set(fx * k.v, 0, fz * k.v);
    t.angularVelocity.set(0, 0, 0);
    c.yaw = k.h;
    // soft springs pull the hands to the wheel and the feet to the pedals
    const pullTo = (b, x, y, z, kk = 60) => {
      b.velocity.x += ((x - b.position.x) * kk - (b.velocity.x - t.velocity.x) * 6) * dt;
      b.velocity.y += ((y - b.position.y) * kk - b.velocity.y * 6) * dt;
      b.velocity.z += ((z - b.position.z) * kk - (b.velocity.z - t.velocity.z) * 6) * dt;
    };
    const rx = Math.cos(k.h), rz = -Math.sin(k.h); // pointing right
    c.parts.arms.forEach((a, i) => { const s = i ? 1 : -1; pullTo(a, k.x + fx * 0.25 + rx * s * 0.28, 1.05, k.z + fz * 0.25 + rz * s * 0.28); });
    c.parts.legs.forEach((l, i) => { const s = i ? 1 : -1; pullTo(l, k.x + fx * 0.55 + rx * s * 0.22, 0.6, k.z + fz * 0.55 + rz * s * 0.22); });
    c.parts.head.velocity.y += (1.75 + hopY - c.parts.head.position.y) * 40 * dt; // keep the head up (mostly)
  }

  // ---------------- the world moving ----------------
  function update(dt, chars, game, roundOver) {
    for (const c of chars) kartOf(c);
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const b of boxes) b.wait -= dt;
      // bananas
      for (const b of bananas) {
        b.age += dt;
        for (const k of karts) {
          if (k.done || (k === b.owner && b.age < 0.6)) continue;
          if (Math.hypot(k.x - b.x, k.z - b.z) < 1.2) { spinOut(k, b.owner); b.hit = true; break; }
        }
      }
      bananas = bananas.filter((b) => { if (b.hit) { FP.Stage.scene.remove(b.mesh); b.mesh.visible = false; } return !b.hit; });
      // bouncy balls: chase the kart ahead (or follow the road)
      for (const bl of balls) {
        bl.life -= dt;
        let tx, tz;
        if (bl.target && !bl.target.done && Math.hypot(bl.target.x - bl.x, bl.target.z - bl.z) < 28) { tx = bl.target.x; tz = bl.target.z; }
        else { const nr = nearest(bl.x, bl.z, bl.idx); bl.idx = nr.i; const p = path[(nr.i + 10) % N]; tx = p.x; tz = p.z; }
        const dx = tx - bl.x, dz = tz - bl.z, d = Math.hypot(dx, dz) || 1;
        bl.x += (dx / d) * 30 * dt; bl.z += (dz / d) * 30 * dt;
        for (const k of karts) {
          if (k.done || (k === bl.owner && bl.life > 4.6)) continue;
          if (Math.hypot(k.x - bl.x, k.z - bl.z) < 1.4) { spinOut(k, bl.owner); bl.life = 0; break; }
        }
      }
      balls = balls.filter((bl) => { if (bl.life <= 0) { FP.Stage.scene.remove(bl.mesh); bl.mesh.visible = false; FP.FX.puffs(new THREE.Vector3(bl.x, 0.5, bl.z), 8, 0xff4d5e, 3, 1); } return bl.life > 0; });
      // karts bump into each other (a star kart knocks others spinning)
      for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i], b = karts[j];
        const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
        if (d > 1.8 || d < 0.001) continue;
        const push = (1.8 - d) / 2, nx = dx / d, nz = dz / d;
        a.x -= nx * push; a.z -= nz * push; b.x += nx * push; b.z += nz * push;
        if (a.star > 0 && b.star <= 0) spinOut(b, a); else if (b.star > 0 && a.star <= 0) spinOut(a, b);
        else if (a.hitCool <= 0) { a.hitCool = 0.3; FP.Audio.play('bonk'); }
      }
      // places
      const order = karts.slice().sort((a, b) => (a.done && b.done ? a.place - b.place : a.done ? -1 : b.done ? 1 : b.prog - a.prog));
      order.forEach((k, i) => { if (!k.done) k.place = i + 1; });
    }
    visual(dt);
    if (roundOver || dt === 0) return null;
    const racing = karts.filter((k) => !k.done);
    if ((karts.length > 1 && racing.length <= 1 && finished.length) || (karts.length && !racing.length) || (firstT >= 0 && time - firstT > AFTER_FIRST) || time > 300) {
      const w = finished.length ? [finished[0].c] : [];
      return { winners: w, text: w.length ? `${w[0].name} wins the Floppy GP!` : 'Time is up!' };
    }
    return null;
  }

  // move the models to where the karts are (on everyone's computer)
  function visual(dt) {
    const t = performance.now() / 1000;
    for (const k of karts) {
      const m = k.mesh;
      const hopY = k.hop > 0 ? Math.sin((k.hop / 0.28) * Math.PI) * 0.35 : 0;
      m.position.set(k.x, hopY, k.z);
      m.rotation.set(0, k.h - (k.driftDir ? k.driftDir * 0.35 : 0), k.steer * 0.04);
      const u = m.userData;
      u.wheels.forEach((w) => { w.rotation.x += k.v * dt * 3; });
      u.wheel.rotation.z = k.steer * 0.8;
      u.flame.visible = k.boost > 0;
      if (u.flame.visible) u.flame.scale.set(1, 0.8 + Math.random() * 0.6, 1);
      const sparkCol = k.drift > 1.8 ? 0xff9a3c : k.drift > 0.8 ? 0x5ab8ff : 0xffffff;
      u.sparks.forEach((s) => { s.visible = !!k.driftDir && k.drift > 0.3; s.material.color.setHex(sparkCol); s.scale.setScalar(0.7 + Math.random() * 0.6); });
      u.body.material = FP.Look.toon(k.star > 0 ? [0xff5a5f, 0xffcf33, 0x5cc44a, 0x4aa8ff, 0x9b6bff][Math.floor(t * 12) % 5] : k.c.color.body);
    }
    for (const b of boxes) { b.mesh.visible = b.wait <= 0; b.mesh.rotation.set(0.5, t * 1.2, 0.3); b.mesh.position.y = 1.2 + Math.sin(t * 3 + b.x) * 0.12; }
    for (const b of bananas) { b.mesh.position.set(b.x, 0.15, b.z); }
    for (const bl of balls) { bl.mesh.position.set(bl.x, 0.5 + Math.abs(Math.sin(t * 10)) * 0.4, bl.z); }
    drawHud();
  }

  // ---------------- cameras and split screen ----------------
  function viewers() {
    const g = FP.Game;
    if (FP.Net && FP.Net.isClient()) {
      const me = karts.find((k) => k.c.player && k.c.player.id === FP.Net.myId);
      return me ? [me] : karts.slice(0, 1);
    }
    const local = karts.filter((k) => k.c.player && ['keys', 'pad', 'touch'].includes(k.c.player.source.kind));
    if (local.length) return local.slice(0, 4);
    // no people on this computer (only bots): follow the leader
    const lead = karts.slice().sort((a, b) => a.place - b.place)[0];
    void g;
    return lead ? [lead] : [];
  }

  function render(renderer, scene, dt) {
    const vs = viewers();
    const W = window.innerWidth, H = window.innerHeight;
    if (!vs.length) { renderer.render(scene, FP.Camera.camera); return; }
    const rects = vs.length === 1 ? [[0, 0, W, H]] : vs.length === 2 ? [[0, H / 2, W, H / 2], [0, 0, W, H / 2]] : [[0, H / 2, W / 2, H / 2], [W / 2, H / 2, W / 2, H / 2], [0, 0, W / 2, H / 2], [W / 2, 0, W / 2, H / 2]];
    renderer.setScissorTest(vs.length > 1);
    // the sunlight (and its shadows) follows the first player's kart; shadows are drawn once, not once per screen
    const sun = FP.Stage.sun, k0 = vs[0];
    sun.position.set(k0.x + 12, 25, k0.z + 14); sun.target.position.set(k0.x, 0, k0.z); sun.target.updateMatrixWorld();
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    vs.forEach((k, i) => {
      if (!cams[i]) { cams[i] = new THREE.PerspectiveCamera(68, 1, 0.1, 400); cams[i].userData.pos = new THREE.Vector3(k.x, 4, k.z); }
      const cam = cams[i];
      const [x, y, w, h] = rects[i];
      const fx = Math.sin(k.h), fz = Math.cos(k.h);
      const back = k.spin > 0 ? 7 : 6.5;
      const want = new THREE.Vector3(k.x - fx * back, 3.3, k.z - fz * back);
      const kk = Math.min(1, (dt || 0.016) * 6);
      cam.userData.pos.lerp(want, kk);
      if (cam.userData.pos.distanceTo(want) > 20) cam.userData.pos.copy(want);
      cam.position.copy(cam.userData.pos);
      cam.lookAt(k.x + fx * 4, 1, k.z + fz * 4);
      const fov = 68 + (k.boost > 0 || k.star > 0 ? 10 : 0);
      cam.fov += (fov - cam.fov) * kk;
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
      renderer.setViewport(x, y, w, h);
      renderer.setScissor(x, y, w, h);
      renderer.render(scene, cam);
    });
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    renderer.shadowMap.autoUpdate = true;
    // engine sound for the first player's kart
    const playing = (FP.Game.state === 'play' || FP.Game.state === 'client' || FP.Game.state === 'countdown') && !FP.UI.open();
    FP.Audio.engine(playing ? Math.max(3, Math.abs(k0.v)) : 0);
  }

  // ---------------- on-screen info ----------------
  const ICONS = {
    boost: '<svg viewBox="0 0 40 40"><path d="M22 3L8 23h10l-3 14 17-22H21z" fill="#ffcf33" stroke="#2a2140" stroke-width="3" stroke-linejoin="round"/></svg>',
    triple: '<svg viewBox="0 0 40 40"><path d="M16 4L6 20h8l-2 12 12-16h-8z" fill="#ffcf33" stroke="#2a2140" stroke-width="2.5" stroke-linejoin="round"/><path d="M30 8l-8 12h6l-2 10 10-13h-6z" fill="#ff9a3c" stroke="#2a2140" stroke-width="2.5" stroke-linejoin="round"/><text x="30" y="38" font-size="11" font-weight="900" fill="#2a2140">x3</text></svg>',
    banana: '<svg viewBox="0 0 40 40"><path d="M8 10q4 22 26 20-6 6-16 2T6 12z" fill="#ffe14a" stroke="#2a2140" stroke-width="3" stroke-linejoin="round"/><path d="M8 10l-1-4" stroke="#2a2140" stroke-width="3"/></svg>',
    ball: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#ff4d5e" stroke="#2a2140" stroke-width="3"/><path d="M6 20h28" stroke="#fff" stroke-width="4"/><circle cx="15" cy="13" r="3" fill="#fff" opacity=".7"/></svg>',
    star: '<svg viewBox="0 0 40 40"><path d="M20 3l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#ffcf33" stroke="#2a2140" stroke-width="3" stroke-linejoin="round"/></svg>',
  };
  const ORD = ['1st', '2nd', '3rd', '4th'];
  function drawHud() {
    if (!hudBox) return;
    const vs = viewers();
    const W = window.innerWidth, H = window.innerHeight;
    const split = vs.length;
    let html = '';
    vs.forEach((k, i) => {
      const left = split >= 3 ? (i % 2) * W / 2 : 0;
      const top = split === 1 ? 0 : split === 2 ? i * H / 2 : Math.floor(i / 2) * H / 2;
      const lap = Math.min(LAPS, Math.max(1, k.lap + 1));
      html += `<div class="kh" style="left:${left + 12}px;top:${top + (i < (split >= 3 ? 2 : 1) ? 64 : 10)}px">
        <div class="kh-place p${Math.min(3, k.place - 1)}">${ORD[k.place - 1] || k.place + 'th'}</div>
        <div class="kh-lap">${k.done ? 'Finished!' : `Lap ${lap}/${LAPS}`}</div>
        <div class="kh-item">${k.item ? ICONS[k.item] : ''}</div>
        ${split > 1 ? `<div class="kh-name">${FP.UI.escapeHtml(k.c.name)}</div>` : ''}
      </div>`;
    });
    if (hudBox.innerHTML !== html) hudBox.innerHTML = html;
    if (mini) mini.update();
  }

  function makeMiniMap() {
    const el = document.createElement('div');
    el.className = 'kart-mini';
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of path) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    const sx = (x) => ((x - minX) / (maxX - minX)) * 120 + 10, sz = (z) => ((z - minZ) / (maxZ - minZ)) * 100 + 10;
    const d = path.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sz(p.z).toFixed(1)}`).join(' ') + 'Z';
    el.innerHTML = `<svg viewBox="0 0 140 120"><path d="${d}" fill="none" stroke="#2a2140" stroke-width="9" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#9aa0b5" stroke-width="5" stroke-linejoin="round"/><g class="dots"></g></svg>`;
    const dots = el.querySelector('.dots');
    return {
      el,
      update() {
        dots.innerHTML = karts.map((k) => `<circle cx="${sx(k.x).toFixed(1)}" cy="${sz(k.z).toFixed(1)}" r="5" fill="${FP.UI.hex(k.c.color.body)}" stroke="#2a2140" stroke-width="1.5"/>`).join('');
      },
    };
  }

  function hud() {
    const left = firstT >= 0 ? AFTER_FIRST - (time - firstT) : null;
    return `${FP.UI.ICON.flag} ${LAPS} laps &nbsp; Hold JUMP to drift, PUNCH to use items${left !== null ? ` &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(left)}` : ''}`;
  }

  // ---------------- bots ----------------
  function botThink(c, chars, dt, input, tools) {
    const k = kartOf(c);
    const b = tools.brain;
    if (b.lane === undefined) b.lane = (Math.random() - 0.5) * 3;
    if (Math.random() < dt * 0.2) b.lane = (Math.random() - 0.5) * 3.5;
    const look = 10 + Math.floor(k.v * 0.6);
    const p = path[(k.idx + look) % N];
    let tx = p.x + p.tz * b.lane, tz = p.z - p.tx * b.lane;
    // steer around bananas on the road ahead
    for (const bn of bananas) {
      const d = Math.hypot(bn.x - k.x, bn.z - k.z);
      if (d < 9 && d > 1) { const side = (bn.x - k.x) * Math.cos(k.h) - (bn.z - k.z) * Math.sin(k.h); if (Math.abs(side) < 1.6) { tx -= Math.cos(k.h) * Math.sign(side || 1) * 2.5; tz += Math.sin(k.h) * Math.sign(side || 1) * 2.5; } } // move to the other side of it
    }
    const want = Math.atan2(tx - k.x, tz - k.z);
    let diff = want - k.h;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    input.x = Math.max(-1, Math.min(1, -diff * 2.2));
    input.z = 0;
    // drift through big turns (better bots do this more)
    const sharp = Math.abs(diff) > 0.45 && k.v > 10;
    input.jump = sharp && tools.skill.think < 1.2;
    // items
    if (k.item) {
      const behind = karts.some((o) => o !== k && o.prog < k.prog && k.prog - o.prog < 30);
      const ahead = karts.some((o) => o !== k && o.prog > k.prog && o.prog - k.prog < 60);
      if (k.item === 'star' || ((k.item === 'boost' || k.item === 'triple') && Math.abs(diff) < 0.25) || (k.item === 'banana' && (behind || Math.random() < dt * 0.3)) || (k.item === 'ball' && ahead)) input.punchPressed = true;
    }
    return true;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><path d="M0 58q30-18 60-6t60-8v36H0z" fill="#86d15f"/><path d="M-4 70q34-22 64-10t64-8" fill="none" stroke="#6b6f80" stroke-width="14"/><path d="M-4 70q34-22 64-10t64-8" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="5 6"/><rect x="42" y="44" width="30" height="12" rx="4" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="47" cy="57" r="4" fill="#2a2140"/><circle cx="67" cy="57" r="4" fill="#2a2140"/><ellipse cx="55" cy="38" rx="6" ry="7" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="56" cy="28" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><path d="M30 46h-10M32 52h-12" stroke="#2a2140" stroke-width="2" stroke-linecap="round" opacity=".5"/><g transform="translate(88 20)"><rect width="16" height="16" rx="3" fill="#ffcf33" stroke="#2a2140" stroke-width="2" transform="rotate(12)"/><text x="5" y="13" font-size="12" font-weight="900" fill="#fff" stroke="#2a2140" stroke-width=".8" transform="rotate(12)">?</text></g></svg>';

  self = {
    id: 'kart', name: 'Kart Racing', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 3, song: 'race', minZoom: 20, art: ART, noTags: true,
    desc: 'Floppy drivers in go-karts! Grab items from the ? boxes, drift through turns, win the race!',
    build, spawn, update, control, render, botThink, hud, visual,
    scoreLabel: (s) => `${s} pts`,
    netState: () => ({
      k: karts.filter((k) => k.c.player).map((k) => [k.c.player.id, Math.round(k.x * 100) / 100, Math.round(k.z * 100) / 100, Math.round(k.h * 1000) / 1000, Math.round(k.v * 10) / 10,
        k.spin > 0 ? 1 : 0, k.boost > 0 ? 1 : 0, k.star > 0 ? 1 : 0, k.item ? ITEMS.indexOf(k.item) : -1, k.lap, k.place, k.done ? 1 : 0, k.driftDir, Math.round(k.drift * 10) / 10, Math.round(k.steer * 100) / 100, Math.round(k.hop * 100) / 100]),
      b: bananas.map((b) => [Math.round(b.x * 10) / 10, Math.round(b.z * 10) / 10]),
      l: balls.map((b) => [Math.round(b.x * 10) / 10, Math.round(b.z * 10) / 10]),
      x: boxes.map((b) => (b.wait > 0 ? 0 : 1)).join(''),
      t: Math.round(time), f: Math.round(firstT),
    }),
    applyNetState: (s) => {
      for (const c of FP.Ragdoll.all) kartOf(c);
      for (const a of s.k) {
        const k = karts.find((q) => q.c.player && q.c.player.id === a[0]);
        if (!k) continue;
        k.x += (a[1] - k.x) * 0.6; k.z += (a[2] - k.z) * 0.6; k.h = a[3]; k.v = a[4];
        k.spin = a[5] ? 1 : 0; k.boost = a[6] ? 1 : 0; k.star = a[7] ? 1 : 0; k.item = a[8] >= 0 ? ITEMS[a[8]] : null;
        k.lap = a[9]; k.place = a[10]; k.done = !!a[11]; k.driftDir = a[12]; k.drift = a[13]; k.steer = a[14]; k.hop = a[15];
      }
      const sync = (list, data, kind) => {
        while (list.length < data.length) { const m = itemMesh(kind); FP.Stage.add(m); list.push({ x: 0, z: 0, mesh: m }); }
        while (list.length > data.length) { const o = list.pop(); FP.Stage.scene.remove(o.mesh); }
        data.forEach(([x, z], i) => { list[i].x = x; list[i].z = z; });
      };
      sync(bananas, s.b, 'banana');
      sync(balls, s.l, 'ball');
      boxes.forEach((b, i) => { b.wait = s.x[i] === '1' ? 0 : 1; });
      time = s.t; firstT = s.f;
    },
  };
  return self;
})();
