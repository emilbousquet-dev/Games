// ============================================================
//  FLOPPY PARTY — BOWLING (the real thing!)
//  Everyone has their own lane and the camera is right behind
//  you. Your ball is already in your hands.
//    Left / right: step sideways to line up.
//    Hold GRAB (or punch): aim with left / right, the power
//      arrow grows and shrinks.
//    Let go: BOWL!  While it rolls, left / right curves it.
//  10 frames with real scoring: a strike is 10 + your next 2
//  balls, a spare is 10 + your next ball. Highest score wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.bowling = (function () {
  const LANE_W = 2.2, GUTTER = 0.4, PITCH = LANE_W + GUTTER * 2 + 0.7;
  const FOUL_Z = 0, STAND_Z = 1.3, PIN_Z = -17, R = 0.3, FRAMES = 10;
  const PHASES = ['aim', 'roll', 'settle', 'done'];
  let lanes = [], cams = [], endT = 0, self = null;

  const laneX = (i, n) => (i - (n - 1) / 2) * PITCH;

  // bowling has its own slippery surfaces: the ball glides, and it never climbs up the pins
  const BALL_MAT = new CANNON.Material('bowlBall'), PIN_MAT = new CANNON.Material('bowlPin');
  {
    const W = FP.Physics.world, F = FP.Physics.mats.floor;
    W.addContactMaterial(new CANNON.ContactMaterial(BALL_MAT, F, { friction: 0.02, restitution: 0 }));
    W.addContactMaterial(new CANNON.ContactMaterial(BALL_MAT, PIN_MAT, { friction: 0, restitution: 0.25 }));
    W.addContactMaterial(new CANNON.ContactMaterial(PIN_MAT, F, { friction: 0.25, restitution: 0.15 }));
    W.addContactMaterial(new CANNON.ContactMaterial(PIN_MAT, PIN_MAT, { friction: 0.05, restitution: 0.45 }));
  }
  // the 10 pins in a triangle (the head pin is closest to you)
  const SPOTS = [];
  for (let row = 0; row < 4; row++) for (let k = 0; k <= row; k++) SPOTS.push([(k - row / 2) * 0.6, -row * 0.52]);

  // ---------------- models ----------------
  const PIN_PROFILE = [[0, 0], [0.09, 0], [0.13, 0.08], [0.16, 0.22], [0.15, 0.36], [0.09, 0.5], [0.07, 0.56], [0.09, 0.64], [0.08, 0.72], [0.04, 0.76], [0, 0.765]];
  function pinMesh() {
    const g = new THREE.Group();
    const pts = PIN_PROFILE.map(([r, y]) => new THREE.Vector2(r, y));
    const body = FP.Look.mesh(new THREE.LatheGeometry(pts, 18), FP.Look.toon(0xffffff), 0.015);
    for (const y of [0.53, 0.6]) {
      const band = FP.Look.mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 16), FP.Look.toon(0xff5a5f), 0);
      band.position.y = y; g.add(band);
    }
    g.add(body);
    return g;
  }
  function pinBody(x, z) {
    // standing pins stay perfectly still (kinematic) until something hits them, then they turn floppy
    const b = new CANNON.Body({ mass: 0.4, type: CANNON.Body.KINEMATIC, material: PIN_MAT, linearDamping: 0.05, angularDamping: 0.15, collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.ALL });
    b.addShape(new CANNON.Cylinder(0.11, 0.15, 0.5, 10), new CANNON.Vec3(0, 0.25, 0));
    b.addShape(new CANNON.Sphere(0.09), new CANNON.Vec3(0, 0.65, 0));
    b.position.set(x, 0.005, z);
    return b;
  }
  function ballMesh(colors) {
    const k = FP.Kit.ball(R, colors, 3.5);
    const ink = new THREE.MeshBasicMaterial({ color: 0x1d1a2f });
    for (const [x, y] of [[-0.07, 0.12], [0.07, 0.12], [0, 0.02]]) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.035, 10), ink);
      hole.position.set(x, y, R + 0.002); k.mesh.add(hole);
    }
    return k;
  }
  // the aim arrow on the lane (it grows with power)
  function arrowMesh() {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 1), mat);
    shaft.rotation.x = -Math.PI / 2; shaft.position.z = -0.5;
    const head = new THREE.Mesh(new THREE.CircleGeometry(0.32, 3), mat);
    head.rotation.x = -Math.PI / 2; head.rotation.z = Math.PI / 2; head.position.z = -1.05;
    const inner = new THREE.Group(); inner.add(shaft, head);
    g.add(inner);
    g.userData = { inner, mat, head, shaft };
    return g;
  }

  // ---------------- building the bowling alley ----------------
  function build(list) {
    lanes = []; cams = []; endT = 0;
    const S = FP.Stage;
    const n = Math.max(1, list.length);
    const width = n * PITCH + 3;
    // the approach (where you stand), a floor under everything, the back wall
    S.island(0, -1, 3.5, width, 2, 7, { grass: 0xd9b27a, dirt: 0x8a6a55 });
    S.block(0, -1.2, -9, width, 0.4, 26, 0x3a3450);
    S.block(0, 1.5, PIN_Z - 4.2, width, 4, 0.4, 0x2a2140);
    const neon = FP.Props.arch('FLOPPY LANES', Math.min(12, width - 1), '#ff7eb6');
    neon.position.set(0, 2.3, PIN_Z - 3.8); S.add(neon);
    for (let i = 0; i < n; i++) {
      const x = laneX(i, n);
      // the shiny wooden lane with the gutters on both sides
      S.block(x, -0.1, -9.4, LANE_W, 0.2, 19.6, 0xf0c98a);
      for (const s of [-1, 1]) {
        S.block(x + s * (LANE_W / 2 + GUTTER / 2), -0.45, -9.4, GUTTER, 0.2, 19.6, 0x8a8fa0); // gutter
        S.block(x + s * (LANE_W / 2 + GUTTER + 0.175), 0.1, -9.6, 0.35, 0.6, 20, 0x6a4c93); // divider
      }
      // the pit behind the pins, with a curtain
      S.block(x, -0.8, PIN_Z - 2.6, LANE_W + GUTTER * 2, 0.2, 2.6, 0x2a2140);
      S.block(x, 1.2, PIN_Z - 4, LANE_W + GUTTER * 2, 2.8, 0.3, 0x1d1a2f);
      // the pinsetter hood above the pins
      const hood = FP.Look.boxMesh(LANE_W + GUTTER * 2 + 0.3, 0.9, 1.6, FP.Look.toon(0xa77bff));
      hood.position.set(x, 2.2, PIN_Z - 1.1); S.add(hood);
      // arrows and dots on the lane (real lanes have them to help you aim)
      for (let k = -2; k <= 2; k++) {
        const ar = new THREE.Mesh(new THREE.CircleGeometry(0.1, 3), new THREE.MeshBasicMaterial({ color: 0xa8683a }));
        ar.rotation.x = -Math.PI / 2; ar.rotation.z = Math.PI / 2; ar.position.set(x + k * 0.38, 0.005, -4.5 - Math.abs(k) * 0.35); S.add(ar);
      }
      const foul = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W + GUTTER * 2, 0.08), new THREE.MeshBasicMaterial({ color: 0xff5a5f }));
      foul.rotation.x = -Math.PI / 2; foul.position.set(x, 0.01, FOUL_Z); S.add(foul);
      // pins
      const pins = SPOTS.map(([dx, dz]) => {
        const px = x + dx, pz = PIN_Z + dz;
        const pr = FP.Stage.prop(pinMesh(), pinBody(px, pz));
        return { ...pr, x: px, z: pz, up: true };
      });
      // the ball
      const p = list[i] || null;
      const col = p ? FP.Look.COLORS[p.colorIndex].body : 0x4aa8ff;
      const k = ballMesh([col, 0x2a2140]);
      k.body.material = BALL_MAT; k.body.angularDamping = 0.05; k.body.linearDamping = 0.02;
      k.body.collisionFilterMask = FP.Physics.GROUP.WORLD; // people don't bump it, and pin hits are worked out by hand (see pinHits)
      k.body.position.set(x, 0.5, STAND_Z);
      const ball = FP.Stage.prop(k.mesh, k.body);
      // a TV over each lane with the score
      const tv = FP.Props.billboard(2.2, 0.8);
      tv.position.set(x, 4.3, PIN_Z - 2); S.add(tv);
      const arrow = arrowMesh(); S.add(arrow);
      lanes.push({ i, x, player: p, pins, ball, arrow, tv: tv.userData.panel, tvText: '', rolls: [], frame: 0, tenth: -1, phase: 'aim', t: 0, standX: 0, aim: 0, power: 0, charging: false, chargeT: 0, curveT: 0, stepT: 0, total: 0, msg: '', bot: {} });
      // a wall only people bump into, so nobody walks down the lane
      const w = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: FP.Physics.GROUP.NPC, collisionFilterMask: FP.Physics.ALL & ~(FP.Physics.GROUP.WORLD | FP.Physics.GROUP.PROP | FP.Physics.GROUP.NPC) });
      w.addShape(new CANNON.Box(new CANNON.Vec3(PITCH / 2, 2, 0.2)));
      w.position.set(x, 2, FOUL_Z + 0.2);
      FP.Physics.world.addBody(w); S.bodies.push(w);
    }
    // the ball-return machines and some fans
    for (let i = 0; i <= n; i++) {
      const bx = (i - n / 2) * PITCH;
      const ret = FP.Look.boxMesh(0.5, 0.6, 1.2, FP.Look.toon(0x5ab0ff));
      ret.position.set(bx, 0.3, 3.2); S.add(ret);
    }
    const fans = FP.Props.crowd(1, Math.max(4, n * 3), 1.2); fans.position.set(0, 0, 6.6); fans.rotation.y = Math.PI; S.add(fans);
    FP.Camera.setAngle(0.55, 0.9);
  }

  function spawn(i, n) { return { x: laneX(i, n), y: 0.1, z: STAND_Z, yaw: Math.PI }; }

  const laneOf = (c) => lanes.find((l) => l.player && c && c.player && l.player.id === c.player.id);

  // ---------------- scoring (the real bowling rules) ----------------
  function frameMarks(rolls) {
    // returns [{ a, b, c, total }] for 10 frames: a/b/c are the marks ('X', '/', '-', number or '')
    const out = [];
    let i = 0, running = 0;
    for (let f = 0; f < FRAMES; f++) {
      const r1 = rolls[i], r2 = rolls[i + 1], r3 = rolls[i + 2];
      const fr = { a: '', b: '', c: '', total: null };
      if (r1 === undefined) { out.push(fr); continue; }
      const mark = (v) => (v === 10 ? 'X' : v === 0 ? '-' : String(v));
      if (f < FRAMES - 1) {
        if (r1 === 10) {
          fr.b = 'X';
          if (r2 !== undefined && r3 !== undefined) { running += 10 + r2 + r3; fr.total = running; }
          i += 1;
        } else {
          fr.a = mark(r1);
          if (r2 !== undefined) {
            fr.b = r1 + r2 === 10 ? '/' : mark(r2);
            if (r1 + r2 === 10) { if (r3 !== undefined) { running += 10 + r3; fr.total = running; } }
            else { running += r1 + r2; fr.total = running; }
          }
          i += 2;
        }
      } else {
        // the 10th frame: up to 3 balls
        fr.a = mark(r1);
        if (r2 !== undefined) fr.b = r1 !== 10 && r1 + r2 === 10 ? '/' : mark(r2);
        if (r3 !== undefined) fr.c = (r1 === 10 && r2 !== 10 && r2 + r3 === 10) ? '/' : mark(r3);
        const needed = r1 === 10 || (r2 !== undefined && r1 + r2 === 10) ? 3 : 2;
        const got = [r1, r2, r3].slice(0, needed);
        if (got.every((v) => v !== undefined)) { running += got.reduce((s, v) => s + v, 0); fr.total = running; }
      }
      out.push(fr);
    }
    return out;
  }
  // the total so far (counting strikes and spares that still wait for bonus balls as what they have)
  function totalOf(rolls) { let t = 0; for (const f of frameMarks(rolls)) if (f.total !== null) t = f.total; return t; }

  // ---------------- pins ----------------
  function upPins(lane) { return lane.pins.filter((p) => p.up); }
  function isDown(p) {
    const b = p.body;
    const v = b.quaternion.vmult(new CANNON.Vec3(0, 1, 0));
    return v.y < 0.7 || Math.hypot(b.position.x - p.x, b.position.z - p.z) > 0.35 || b.position.y < -0.2;
  }
  function park(p, lane) {
    p.up = false; p.mesh.visible = false;
    p.body.type = CANNON.Body.KINEMATIC; p.body.velocity.set(0, 0, 0); p.body.angularVelocity.set(0, 0, 0);
    p.body.position.set(p.x, -40 - lane.i, p.z);
  }
  function respot(p) {
    p.up = true; p.mesh.visible = true; p.kicked = false; p.struck = false;
    p.body.type = CANNON.Body.KINEMATIC;
    p.body.position.set(p.x, 0.005, p.z); p.body.quaternion.set(0, 0, 0, 1);
    p.body.velocity.set(0, 0, 0); p.body.angularVelocity.set(0, 0, 0);
  }
  // the pinsetter: sweeps the fallen pins away, stands the others back up neatly (or sets all 10)
  function setPins(lane, all) { for (const p of lane.pins) { if (all || p.up) respot(p); else park(p, lane); } }

  // ---------------- throwing ----------------
  // where the ball leaves your hand (never over the gutter)
  const ballX = (lane) => lane.x + Math.max(-LANE_W / 2 + R + 0.03, Math.min(LANE_W / 2 - R - 0.03, lane.standX + 0.3));

  function throwBall(lane, c) {
    const b = lane.ball.body;
    const wild = lane.power > 0.96 ? (Math.random() - 0.5) * 0.08 : 0; // too hard: a bit wild!
    const ang = lane.aim + wild;
    const speed = 8 + lane.power * 9.5;
    const sx = ballX(lane);
    b.position.set(sx, R + 0.01, FOUL_Z - 0.5);
    b.velocity.set(Math.sin(ang) * speed, 0, -Math.cos(ang) * speed);
    b.angularVelocity.set(-speed / R, 0, 0);
    lane.phase = 'roll'; lane.t = 0; lane.curveT = 1.4; lane.charging = false; lane.stepT = 0.35;
    lane.startUp = upPins(lane).length;
    if (c) { c.punchT = 0; c.punchArm = 0; c.punchHit = true; } // swing the arm (the "true" means it can't hit anyone)
    FP.Audio.play('whoosh');
  }

  function afterRoll(lane, game) {
    // which pins fell?
    let down = 0;
    for (const p of lane.pins) if (p.up && isDown(p)) { p.up = false; down++; }
    lane.rolls.push(down);
    const r = lane.rolls, pos = new THREE.Vector3(lane.x, 1.8, PIN_Z + 1);
    // what happens next (the rules for frames 1 to 9, and the special 10th frame)
    let resetAll = false, done = false, word = '';
    if (lane.frame < FRAMES - 1) {
      const firstBall = lane.rollInFrame === 0 || lane.rollInFrame === undefined;
      if (firstBall && down === 10) { word = 'STRIKE!'; lane.frame++; lane.rollInFrame = 0; resetAll = true; }
      else if (firstBall) { lane.rollInFrame = 1; word = down === 0 ? 'Gutter ball!' : `${down}`; }
      else {
        const first = r[r.length - 2];
        word = first + down === 10 ? 'SPARE!' : down === 0 ? 'Missed!' : `${down}`;
        lane.frame++; lane.rollInFrame = 0; resetAll = true;
      }
      if (lane.frame === FRAMES - 1) lane.tenth = r.length;
    } else {
      const t = r.slice(lane.tenth);
      if (t.length === 1) { word = t[0] === 10 ? 'STRIKE!' : t[0] === 0 ? 'Gutter ball!' : `${t[0]}`; resetAll = t[0] === 10; }
      else if (t.length === 2) {
        if (t[0] === 10) { word = t[1] === 10 ? 'STRIKE!' : `${t[1]}`; resetAll = t[1] === 10; }
        else if (t[0] + t[1] === 10) { word = 'SPARE!'; resetAll = true; }
        else { word = `${t[1]}`; done = true; }
      } else { word = t[2] === 10 ? 'STRIKE!' : `${t[2]}`; done = true; }
    }
    lane.total = totalOf(r);
    if (lane.player) game.scores[lane.player.id] = lane.total;
    const big = word === 'STRIKE!' || word === 'SPARE!';
    FP.FX.word(pos, word, big ? '#ffcf33' : '#ffffff', big ? 2 : 1.3);
    if (big) { FP.FX.confetti(new THREE.Vector3(lane.x, 1, PIN_Z)); FP.Audio.play('cheer'); FP.Props.hype(); }
    else if (down === 0) FP.Audio.play('beep');
    lane.msg = word;
    if (done) { lane.phase = 'done'; setPins(lane, true); FP.UI.toast(`${lane.player ? lane.player.name : 'Lane ' + (lane.i + 1)} finished with ${lane.total}!`, 2.5); }
    else { lane.phase = 'aim'; setPins(lane, resetAll); }
    lane.t = 0; lane.power = 0; lane.aim = 0; lane.charging = false; lane.bot = {};
  }

  // ---------------- your character: sport controls ----------------
  // (the normal walking is swapped for bowling moves, but the character stays floppy)
  function control(c, input, dt, playing) {
    const lane = laneOf(c);
    if (!lane) { FP.Ragdoll.control(c, input, dt); return; }
    const inp = c.isBot ? botInput(lane, c, dt) : (input || {});
    const t = c.parts.torso.position;
    const fake = { x: 0, z: 0, jump: false, jumpPressed: false, punchPressed: false, grab: false };
    if (playing && lane.phase === 'aim') {
      const holding = !!(inp.grab || inp.punch);
      if (holding) {
        if (!lane.charging) { lane.charging = true; lane.chargeT = 0; }
        lane.chargeT += dt;
        const ph = (lane.chargeT / 1.5) % 2; // the power goes up and down
        lane.power = ph < 1 ? ph : 2 - ph;
        lane.aim = Math.max(-0.1, Math.min(0.1, lane.aim + (inp.x || 0) * dt * 0.12)); // right aims right
      } else {
        if (lane.charging && lane.chargeT > 0.12) throwBall(lane, c);
        lane.charging = false;
        lane.standX = Math.max(-LANE_W / 2 + 0.35, Math.min(LANE_W / 2 - 0.35, lane.standX + (inp.x || 0) * dt * 1.6));
        lane.t += dt;
        if (!c.isBot && lane.t > 15) { lane.power = 0.6; throwBall(lane, c); FP.UI.toast('Too slow! Auto throw', 1.5); } // don't keep everyone waiting
      }
    } else if (playing && lane.phase === 'roll' && lane.curveT > 0) {
      // curve the ball while it rolls
      lane.curveT -= dt;
      const b = lane.ball.body;
      if (b.position.y > -0.05) b.velocity.x += (inp.x || 0) * dt * 2.4;
    }
    // walk to your spot (a little step forward when you bowl), always facing the pins
    lane.stepT = Math.max(0, lane.stepT - dt);
    const wantX = lane.x + lane.standX, wantZ = lane.stepT > 0 ? STAND_Z - 0.7 : STAND_Z;
    fake.x = Math.max(-1, Math.min(1, (wantX - t.x) * 3));
    fake.z = Math.max(-1, Math.min(1, (wantZ - t.z) * 3));
    if (Math.hypot(fake.x, fake.z) < 0.12) { fake.x = 0; fake.z = 0; }
    FP.Ragdoll.control(c, fake, dt);
    c.yaw = Math.PI;
  }

  // knock a pin: send it flying (and tumbling) away from what hit it
  function strike(p, nx, nz, speed, carryX, carryZ) {
    p.body.type = CANNON.Body.DYNAMIC;
    p.body.position.y += 0.05; // off the floor, so it can fly (a pin touching the floor stops dead)
    const v = p.body.velocity;
    v.x = nx * speed + carryX; v.z = nz * speed + carryZ; v.y = 1.2 + Math.random() * 1.2;
    p.body.angularVelocity.set(nz * 14 + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8, -nx * 14 + (Math.random() - 0.5) * 6);
    p.struck = true; p.kicked = true;
    FP.Audio.play('bonk');
  }
  function pinHits(lane) {
    const b = lane.ball.body, dt = FP.Physics.STEP;
    const ups = lane.pins.filter((p) => p.up && !p.struck);
    // the ball against the pins (4 spots along this step's path)
    if (lane.phase === 'roll' && b.position.y > -0.1 && b.position.y < 1) {
      const V = b.velocity;
      for (let s = 0; s <= 4; s++) {
        const px = b.position.x + V.x * dt * s / 4, pz = b.position.z + V.z * dt * s / 4;
        for (const p of ups) {
          if (p.struck) continue;
          const dx = p.body.position.x - px, dz = p.body.position.z - pz, d = Math.hypot(dx, dz);
          if (d > R + 0.15 || d < 0.001) continue;
          const nx = dx / d, nz = dz / d, vn = V.x * nx + V.z * nz;
          if (vn <= 0.5) continue;
          strike(p, nx, nz, vn * (1.15 + Math.random() * 0.3), V.x * 0.2, V.z * 0.2);
          // the heavy ball only turns a little and slows a little
          V.x -= nx * vn * 0.1; V.z -= nz * vn * 0.1;
        }
      }
    }
    // flying pins knock down the pins they touch
    for (const a of lane.pins) {
      if (!a.struck) continue;
      const av = a.body.velocity, sp = Math.hypot(av.x, av.z);
      if (sp < 1.2) continue;
      for (const p of ups) {
        if (p.struck || p === a) continue;
        for (let s = 0; s <= 2; s++) {
          const ax = a.body.position.x + av.x * dt * s / 2, az = a.body.position.z + av.z * dt * s / 2;
          const dx = p.body.position.x - ax, dz = p.body.position.z - az, d = Math.hypot(dx, dz);
          if (d > 0.32 || d < 0.001 || a.body.position.y > 1.2) continue;
          const nx = dx / d, nz = dz / d, vn = av.x * nx + av.z * nz;
          if (vn < 1.2) continue; // just a nudge
          strike(p, nx, nz, vn * 0.8, av.x * 0.1, av.z * 0.1);
          av.x *= 0.75; av.z *= 0.75;
          break;
        }
      }
    }
  }

  // the ball sits in your hand while you aim
  function beforeStep() {
    for (const lane of lanes) {
      // the ball stays down on the lane (it never hops over the pins)
      if (lane.phase === 'roll') {
        const b = lane.ball.body;
        if (b.position.z > PIN_Z - 2.2 && b.position.y > R + 0.01 && b.position.y < 1.5) b.velocity.y = Math.min(b.velocity.y, 0);
      }
      // hits are worked out here (checking in-between spots too), so a fast ball never slips past a pin
      if (lane.phase === 'roll' || lane.phase === 'settle') pinHits(lane);
      if (lane.phase !== 'aim' && lane.phase !== 'done') continue;
      const b = lane.ball.body;
      const c = lane.player && FP.Game.chars.find((ch) => ch.player === lane.player);
      const t = c ? c.parts.torso.position : { x: lane.x, y: 1, z: STAND_Z };
      const swing = lane.charging ? Math.sin(lane.chargeT * 4) * 0.15 : 0;
      b.position.set(t.x + 0.35, Math.max(R, t.y - 0.45), t.z - 0.35 + swing);
      b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      for (const lane of lanes) {
        if (lane.phase === 'roll') {
          lane.t += dt;
          const b = lane.ball.body, sp = Math.hypot(b.velocity.x, b.velocity.z);
          if (b.position.y < -0.2 && b.position.z > PIN_Z + 1 && !lane.gutterSaid) { lane.gutterSaid = true; FP.FX.word(new THREE.Vector3(b.position.x, 1, b.position.z), 'Gutter!', '#8a8fa0', 1); }
          if (lane.t > 6 || b.position.z < PIN_Z - 1.6 || (lane.t > 1 && sp < 0.3)) { lane.phase = 'settle'; lane.t = 0; }
        } else if (lane.phase === 'settle') {
          lane.t += dt;
          if (lane.t > 1.6) { lane.gutterSaid = false; afterRoll(lane, game); }
        }
      }
    }
    visual(dt);
    if (roundOver || dt === 0) return null;
    const playing = lanes.filter((l) => l.player);
    if (playing.length && playing.every((l) => l.phase === 'done')) {
      endT += dt;
      if (endT > 1.5) {
        const w = FP.Kit.mostPoints(chars, game.scores);
        return { winners: w, text: w.length === 1 ? `${w[0].name} is the bowling champ!` : "It's a tie!" };
      }
    }
    return null;
  }

  // arrows, TV screens (also runs for online friends)
  function visual() {
    for (const lane of lanes) {
      const a = lane.arrow, u = a.userData;
      a.visible = lane.phase === 'aim';
      a.position.set(ballX(lane), 0.02, FOUL_Z - 0.2);
      a.rotation.y = -lane.aim; // the arrow points where the ball will go
      const len = lane.charging ? 1.2 + lane.power * 3.5 : 1.6;
      u.shaft.scale.y = len; u.shaft.position.z = -len / 2;
      u.head.position.z = -len - 0.2;
      u.mat.color.setHex(!lane.charging ? 0xffffff : lane.power > 0.96 ? 0xff5a5f : lane.power > 0.7 ? 0x5cc44a : 0xffcf33);
      const text = lane.phase === 'done' ? `Final ${lane.total}` : `Frame ${Math.min(FRAMES, lane.frame + 1)}   ${lane.total}`;
      if (text !== lane.tvText && lane.tv) {
        lane.tvText = text;
        if (lane.tv.material.map) lane.tv.material.map.dispose();
        lane.tv.material.map = FP.Props.textTexture(text, '#2a2140', '#ffcf33', 512, 160);
        lane.tv.material.color.setHex(0xffffff);
        lane.tv.material.needsUpdate = true;
      }
    }
  }

  // ---------------- bots ----------------
  function botInput(lane, c, dt) {
    const b = lane.bot, inp = { x: 0, grab: false };
    if (!FP.Game || FP.Game.state !== 'play') return inp;
    if (lane.phase !== 'aim') {
      // bots curve the ball a little toward the pins they want
      if (lane.phase === 'roll' && b.curve) inp.x = b.curve;
      return inp;
    }
    const sk = c.botSkill || 'normal';
    if (!b.plan) {
      const ups = upPins(lane);
      const cx = ups.length ? ups.reduce((s, p) => s + p.x, 0) / ups.length - lane.x : 0;
      const miss = { easy: 0.45, normal: 0.22, hard: 0.08 }[sk] || 0.22;
      const pocket = ups.length === 10 ? 0.12 : 0;
      b.plan = { x: Math.max(-0.75, Math.min(0.75, cx + pocket + (Math.random() - 0.5) * miss * 2 - 0.3)), wait: 0.8 + Math.random() * 1.2,
        power: { easy: 0.35 + Math.random() * 0.6, normal: 0.6 + Math.random() * 0.35, hard: 0.78 + Math.random() * 0.16 }[sk] || 0.7 };
      b.curve = Math.random() < 0.3 ? (Math.random() - 0.5) * 0.6 : 0;
    }
    const p = b.plan;
    if (Math.abs(lane.standX - p.x) > 0.05) { inp.x = Math.sign(p.x - lane.standX); return inp; }
    p.wait -= dt;
    if (p.wait > 0) return inp;
    // hold the button until the power is right, then let go
    if (!lane.charging) { inp.grab = true; return inp; }
    const rising = ((lane.chargeT / 1.5) % 2) < 1;
    inp.grab = !(rising && lane.power >= p.power) && lane.chargeT < 4;
    return inp;
  }
  function botThink() { return true; } // bowling bots are driven in control()

  // ---------------- cameras: right behind the bowler ----------------
  function viewers() {
    if (FP.Net && FP.Net.isClient()) { const me = lanes.find((l) => l.player && l.player.id === FP.Net.myId); return me ? [me] : []; }
    return lanes.filter((l) => l.player && ['keys', 'pad', 'touch'].includes(l.player.source.kind)).slice(0, 4);
  }
  function render(renderer, scene, dt) {
    const vs = viewers();
    const W = window.innerWidth, H = window.innerHeight;
    if (!vs.length) { renderer.render(scene, FP.Camera.camera); return; }
    const rects = vs.length === 1 ? [[0, 0, W, H]] : vs.length === 2 ? [[0, 0, W / 2, H], [W / 2, 0, W / 2, H]] : [[0, H / 2, W / 2, H / 2], [W / 2, H / 2, W / 2, H / 2], [0, 0, W / 2, H / 2], [W / 2, 0, W / 2, H / 2]];
    renderer.setScissorTest(vs.length > 1);
    const sun = FP.Stage.sun;
    sun.position.set(vs[0].x + 8, 22, -4); sun.target.position.set(vs[0].x, 0, -8); sun.target.updateMatrixWorld();
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
    vs.forEach((lane, i) => {
      if (!cams[i]) { cams[i] = new THREE.PerspectiveCamera(55, 1, 0.1, 200); cams[i].userData.pos = new THREE.Vector3(lane.x, 2.4, STAND_Z + 4); cams[i].userData.look = new THREE.Vector3(lane.x, 0.4, PIN_Z); }
      const cam = cams[i], u = cam.userData;
      const b = lane.ball.body.position;
      let pos, look;
      if (lane.phase === 'roll' && b.z < FOUL_Z) {
        // follow the ball down the lane
        // starts high (over the bowler's head), swoops low as the ball nears the pins
        const z = Math.min(STAND_Z + 4, Math.max(PIN_Z + 4.5, b.z + 5));
        const y = 1.5 + 1.1 * Math.max(0, Math.min(1, (b.z + 8) / 8));
        pos = new THREE.Vector3(lane.x + (b.x - lane.x) * 0.5, y, z); look = new THREE.Vector3(lane.x, 0.3, PIN_Z - 1);
      } else if (lane.phase === 'settle') {
        pos = new THREE.Vector3(lane.x, 1.4, PIN_Z + 4.2); look = new THREE.Vector3(lane.x, 0.2, PIN_Z - 0.6);
      } else {
        pos = new THREE.Vector3(lane.x + lane.standX * 0.6 + 0.3, 2.6, STAND_Z + 4.3); look = new THREE.Vector3(lane.x + lane.standX * 0.3 + 0.15, 0.3, PIN_Z + 2);
      }
      const k = Math.min(1, (dt || 0.016) * 4);
      if (u.phase !== lane.phase && lane.phase === 'aim') { u.pos.copy(pos); u.look.copy(look); } // a TV cut
      u.phase = lane.phase;
      u.pos.lerp(pos, k); u.look.lerp(look, k);
      cam.position.copy(u.pos); cam.lookAt(u.look);
      const [x, y, w, h] = rects[i];
      cam.aspect = w / h; cam.updateProjectionMatrix();
      renderer.setViewport(x, y, w, h); renderer.setScissor(x, y, w, h);
      renderer.render(scene, cam);
    });
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    renderer.shadowMap.autoUpdate = true;
  }

  // ---------------- the scorecard ----------------
  function hud() {
    const rows = lanes.filter((l) => l.player).map((l) => {
      const fm = frameMarks(l.rolls);
      const cells = fm.map((f, i) => `<td class="${i === l.frame && l.phase !== 'done' ? 'now' : ''}"><span class="mk">${f.a}</span><span class="mk">${f.b}</span>${i === 9 ? `<span class="mk">${f.c}</span>` : ''}<b>${f.total !== null ? f.total : ''}</b></td>`).join('');
      return `<tr><th>${FP.UI.playerPill(l.player)}</th>${cells}<td class="tot">${l.total}</td></tr>`;
    }).join('');
    const me = viewers()[0];
    const tip = !me ? '' : me.phase === 'aim' ? (me.charging ? 'Left / right to aim. Let go to BOWL!' : 'Left / right to move. Hold GRAB to aim and power up') : me.phase === 'roll' ? 'Left / right to curve it!' : me.phase === 'done' ? 'You finished! Waiting for the others' : '';
    return `<table class="bowl-card">${rows}</table>${tip ? `<div class="bowl-tip">${tip}</div>` : ''}`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#3a3450"/><path d="M40 80l14-64h12l14 64z" fill="#f0c98a" stroke="#2a2140" stroke-width="2"/><g fill="#fff" stroke="#2a2140" stroke-width="1.5"><ellipse cx="57" cy="22" rx="2.5" ry="5"/><ellipse cx="63" cy="22" rx="2.5" ry="5"/><ellipse cx="60" cy="18" rx="2.5" ry="5"/><ellipse cx="54" cy="18" rx="2.5" ry="5"/><ellipse cx="66" cy="18" rx="2.5" ry="5"/></g><circle cx="60" cy="60" r="10" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="57" cy="57" r="1.6" fill="#2a2140"/><circle cx="62" cy="56" r="1.6" fill="#2a2140"/><circle cx="60" cy="61" r="1.6" fill="#2a2140"/><path d="M60 46v-10" stroke="#ffcf33" stroke-width="3" stroke-linecap="round"/><path d="M55 40l5-6 5 6" fill="none" stroke="#ffcf33" stroke-width="3" stroke-linecap="round"/><text x="60" y="12" font-size="9" font-weight="900" text-anchor="middle" fill="#ff7eb6">STRIKE!</text></svg>';

  self = {
    id: 'bowling', name: 'Bowling', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 3, song: 'chill', minZoom: 17, art: ART, noTags: true,
    desc: 'Real bowling! Step left or right, hold GRAB to aim and power up, let go to bowl. 10 frames, strikes and spares.',
    build, spawn, control, beforeStep, update, botThink, hud, render, visual,
    scoreLabel: (s) => `${s}`,
    focus: () => lanes.map((l) => new THREE.Vector3(l.x, 0, -6)),
    debugLanes: () => lanes, // used by the automatic tests
    netState: () => lanes.map((l) => [PHASES.indexOf(l.phase), Math.round(l.aim * 1000), Math.round(l.power * 100), l.charging ? 1 : 0, Math.round(l.standX * 100), l.frame, l.total, l.pins.map((p) => (p.up ? 1 : 0)).join('')]),
    applyNetState: (s) => {
      s.forEach((v, i) => {
        const l = lanes[i];
        if (!l) return;
        l.phase = PHASES[v[0]] || 'aim'; l.aim = v[1] / 1000; l.power = v[2] / 100; l.charging = !!v[3]; l.standX = v[4] / 100; l.frame = v[5]; l.total = v[6];
        l.pins.forEach((p, k) => { p.mesh.visible = v[7][k] === '1' || l.phase === 'roll' || l.phase === 'settle'; });
      });
    },
  };
  return self;
})();
