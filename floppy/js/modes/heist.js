// ============================================================
//  FLOPPY PARTY — THE HEIST (everyone on one team)
//  Sneak into the museum, grab the treasure and carry it back
//  to the getaway van. Big treasure is HEAVY: carry it together!
//  Guards with flashlights chase you. Lasers zap you.
//  (You can punch the guards... if you dare.)
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.heist = (function () {
  const TIME = 150;
  let loot = [], guards = [], lasers = [], money = 0, time = 0, game = null, lastGrab = new Map(), alarm = 0, van = null;
  const ZONE = { x1: 16.2, x2: 20.2, z1: -2.2, z2: 2.2 };

  const TREASURE = {
    gold: { value: 100, mass: 0.8, make: () => FP.Look.boxMesh(0.6, 0.26, 0.32, FP.Look.toon(0xffc933, { emissive: 0x332200 })), shape: () => new CANNON.Box(new CANNON.Vec3(0.3, 0.13, 0.16)) },
    trophy: { value: 200, mass: 1, make: trophy, shape: () => new CANNON.Cylinder(0.22, 0.3, 0.8, 10) },
    vase: { value: 300, mass: 1.4, make: vase, shape: () => new CANNON.Cylinder(0.3, 0.3, 0.9, 10) },
    painting: { value: 400, mass: 1.2, make: painting, shape: () => new CANNON.Box(new CANNON.Vec3(0.6, 0.45, 0.06)) },
    diamond: { value: 1000, mass: 5, make: diamond, shape: () => new CANNON.Sphere(0.62) },
  };

  function trophy() {
    const g = new THREE.Group();
    const gold = FP.Look.toon(0xffc933);
    const cup = FP.Look.mesh(new THREE.CylinderGeometry(0.28, 0.12, 0.45, 14), gold, 0.03);
    cup.position.y = 0.15;
    const stem = FP.Look.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8), gold, 0.02);
    stem.position.y = -0.15;
    const base = FP.Look.mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 12), FP.Look.toon(0x8a5a2b), 0.02);
    base.position.y = -0.32;
    for (const s of [-1, 1]) { const h = FP.Look.mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 12), gold, 0.01); h.position.set(s * 0.3, 0.2, 0); g.add(h); }
    g.add(cup, stem, base);
    return g;
  }
  function vase() {
    const pts = [[0, -0.45], [0.2, -0.45], [0.3, -0.2], [0.32, 0.05], [0.18, 0.3], [0.14, 0.38], [0.2, 0.45]].map(([x, y]) => new THREE.Vector2(x, y));
    const m = FP.Look.mesh(new THREE.LatheGeometry(pts, 16), FP.Look.toon(0x4aa8ff, { side: THREE.DoubleSide }), 0.03);
    const band = FP.Look.mesh(new THREE.TorusGeometry(0.31, 0.03, 6, 20), FP.Look.toon(0xffffff), 0);
    band.rotation.x = Math.PI / 2;
    m.add(band);
    return m;
  }
  function painting() {
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 72;
    const g = cv.getContext('2d');
    g.fillStyle = '#9fd8ff'; g.fillRect(0, 0, 96, 72);
    g.fillStyle = '#ffcf33'; g.beginPath(); g.arc(72, 18, 10, 0, 7); g.fill();
    g.fillStyle = '#6fd35a'; g.fillRect(0, 50, 96, 22);
    g.fillStyle = '#ff5a8a'; g.beginPath(); g.arc(34, 42, 14, 0, 7); g.fill(); // a floppy friend!
    g.fillStyle = '#fff'; g.beginPath(); g.arc(30, 38, 4, 0, 7); g.arc(39, 38, 4, 0, 7); g.fill();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const frame = FP.Look.boxMesh(1.2, 0.9, 0.12, FP.Look.toon(0xc58a3a), 0.03);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.72), new THREE.MeshBasicMaterial({ map: tex }));
    pic.position.z = 0.065;
    frame.add(pic);
    return frame;
  }
  function diamond() {
    const m = FP.Look.mesh(new THREE.OctahedronGeometry(0.72, 0), FP.Look.toon(0x8ff5ff, { emissive: 0x114455 }), 0.04);
    m.scale.y = 1.2;
    return m;
  }

  function addLoot(kind, x, y, z, rotY = 0) {
    const t = TREASURE[kind];
    const body = new CANNON.Body({ mass: t.mass, material: FP.Physics.mats.prop, linearDamping: 0.1, angularDamping: 0.2,
      collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.ALL });
    body.addShape(t.shape());
    body.position.set(x, y, z);
    body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotY);
    const p = FP.Stage.prop(t.make(), body);
    loot.push({ ...p, kind, value: t.value, got: false });
  }

  // ------------------------------------------------------------
  function build() {
    loot = []; guards = []; lasers = []; money = 0; time = 0; alarm = 0; lastGrab = new Map();
    const S = FP.Stage;
    const floorC = 0xf0e2c8, wallC = 0xe9d4f5, lowC = 0xd9c2e8;
    // street and grass outside
    S.block(20, -0.5, 0, 12, 1, 22, 0x9aa0ad);
    S.block(4, -0.6, 0, 60, 1, 50, 0x7ad35e);
    // museum floor with a checker carpet
    S.block(0, -0.45, 0, 29, 1, 19, floorC);
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), FP.Look.toon(0xc93a55));
    carpet.rotation.x = -Math.PI / 2; carpet.position.set(-7, 0.06, 0); S.add(carpet);
    // walls: tall at the back, low at the front so the camera can see in
    const H = 3.2;
    S.block(0, H / 2, -9.5, 29, H, 0.6, wallC);                   // back
    const glass = S.block(0, H / 2, 9.5, 29, H, 0.3, 0xbfe6ff, { unique: true }); // front: glass, so the camera can see in
    glass.mesh.material.transparent = true; glass.mesh.material.opacity = 0.25; glass.mesh.castShadow = false;
    glass.mesh.children.forEach((o) => { o.visible = false; });
    S.block(0, 0.15, 9.5, 29, 0.3, 0.5, lowC);
    S.block(-14.5, H / 2, 0, 0.6, H, 19.6, wallC);                // left
    S.block(14.5, H / 2, -5.8, 0.6, H, 7.4, wallC);               // right, with the front door in the middle
    S.block(14.5, H / 2, 5.8, 0.6, H, 7.4, wallC);
    S.block(14.5, H + 0.4, 0, 0.6, 0.8, 4.2, 0xffcf33);            // "sign" over the door
    // inside wall between the two rooms, with a laser doorway
    S.block(0, H / 2, -6, 0.6, H, 7, wallC);
    S.block(0, H / 2, 6, 0.6, H, 7, wallC);
    // pillars
    for (const [x, z] of [[-10, -6], [-10, 6], [-4, -6], [-4, 6], [7, -6.5], [7, 6.5]]) {
      S.block(x, H / 2, z, 0.9, H, 0.9, 0xffffff);
    }
    // pedestals with treasure on top
    const ped = (x, z, h = 0.9) => S.block(x, h / 2, z, 1.1, h, 1.1, 0xf8f4ee);
    ped(-7, 0, 1.0); addLoot('diamond', -7, 1.9, 0);
    ped(-11, -3); addLoot('vase', -11, 1.5, -3);
    ped(-11, 3); addLoot('trophy', -11, 1.4, 3);
    ped(-3, -3); addLoot('gold', -3, 1.1, -3);
    ped(-3, 3); addLoot('gold', -3, 1.1, 3);
    ped(4, -3); addLoot('trophy', 4, 1.4, -3);
    ped(10, 3); addLoot('gold', 10, 1.1, 3);
    addLoot('painting', -12, 0.6, -8.8); addLoot('painting', -5, 0.6, -8.8);
    addLoot('painting', 5, 0.6, -8.8);
    addLoot('vase', 10, 0.55, -7);
    addLoot('gold', -13, 0.2, 7.5); addLoot('gold', 12.5, 0.2, 7.5);
    // lasers across the middle doorway and around the diamond
    addLaser(0.1, -2.5, 0.1, 2.5, 0.9, 0, 3);
    addLaser(0.1, -2.5, 0.1, 2.5, 1.7, 1.5, 3);
    addLaser(-9, -1.8, -5, -1.8, 0.8, 0.7, 2.6);
    addLaser(-9, 1.8, -5, 1.8, 0.8, 2.0, 2.6);
    // the getaway van
    van = makeVan();
    van.position.set(20.8, 0, 0);
    S.add(van);
    S.block(22.3, 1.2, 0, 3.2, 2.4, 3.8, 0xff5a5f, { invisible: true }).mesh.visible = false; // van cab you can't walk through
    const zone = new THREE.Mesh(new THREE.PlaneGeometry(ZONE.x2 - ZONE.x1, ZONE.z2 - ZONE.z1), new THREE.MeshBasicMaterial({ color: 0x6fd35a, transparent: true, opacity: 0.45 }));
    zone.rotation.x = -Math.PI / 2; zone.position.set((ZONE.x1 + ZONE.x2) / 2, 0.03, 0); S.add(zone);
    // guards
    addGuard(5, [[3, -2], [11, -2], [11, 5], [3, 5]]);
    addGuard(6, [[-2, -7], [-12, -7], [-12, -1.5]]);
    addGuard(7, [[-2, 7], [-12, 7], [-12, 1.5], [-2, 1.5]]);
    FP.Stage.onClear(() => { guards.forEach((g) => FP.Ragdoll.remove(g.c)); guards = []; });
    FP.Camera.setAngle(0.9, 0.8);
  }

  // remember who grabbed each treasure last (they get the money)
  FP.bus.on('grab', (e) => { if (e.body && !e.victim) lastGrab.set(e.body, e.by); });

  function makeVan() {
    const g = new THREE.Group();
    const body = FP.Look.boxMesh(5, 2.2, 3.4, FP.Look.toon(0xff5a5f));
    body.position.set(0, 1.4, 0);
    const cab = FP.Look.boxMesh(1.6, 1.6, 3.2, FP.Look.toon(0xff7a7f));
    cab.position.set(2.9, 1.1, 0);
    const win = FP.Look.boxMesh(0.1, 0.8, 2.6, FP.Look.toon(0x9fd8ff), 0.02);
    win.position.set(3.72, 1.5, 0);
    g.add(body, cab, win);
    for (const [x, z] of [[-1.6, 1.7], [1.8, 1.7], [-1.6, -1.7], [1.8, -1.7]]) {
      const w = FP.Look.mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16), FP.Look.toon(0x2a2140), 0.03);
      w.rotation.x = Math.PI / 2; w.position.set(x, 0.5, z); g.add(w);
    }
    // the van's back is open (facing the museum)
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), new THREE.MeshBasicMaterial({ color: 0x3a2f55 }));
    inside.rotation.y = -Math.PI / 2; inside.position.set(-2.52, 1.4, 0);
    g.add(inside);
    return g;
  }

  // a laser beam between two points that turns on and off
  function addLaser(x1, z1, x2, z2, y, offset, period) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 8), new THREE.MeshBasicMaterial({ color: 0xff2244 }));
    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, len, 8), new THREE.MeshBasicMaterial({ color: 0xff5577, transparent: true, opacity: 0.35 }));
    beam.add(glow);
    beam.position.set((x1 + x2) / 2, y, (z1 + z2) / 2);
    beam.rotation.z = Math.PI / 2;
    beam.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    // turn the cylinder (which points up) to lie along the beam
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x2 - x1, 0, z2 - z1).normalize());
    FP.Stage.add(beam);
    for (const [x, z] of [[x1, z1], [x2, z2]]) {
      const post = FP.Look.mesh(new THREE.CylinderGeometry(0.08, 0.1, y + 0.3, 8), FP.Look.toon(0x444a55), 0.02);
      post.position.set(x, (y + 0.3) / 2, z);
      FP.Stage.add(post);
    }
    lasers.push({ beam, a: new THREE.Vector3(x1, y, z1), b: new THREE.Vector3(x2, y, z2), offset, period, on: true });
  }

  function addGuard(index, route) {
    const c = FP.Ragdoll.create(FP.Stage.scene, { index, colorIndex: 1, hat: 'police', name: 'Guard', x: route[0][0], y: 0, z: route[0][1] });
    c.isGuard = true;
    c.punchPower = 1.5;
    // make the guard dark blue
    c.meshList.forEach((m) => m.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === FP.Look.COLORS[1].body) o.material = FP.Look.toon(0x3a4a8f); }));
    const light = new THREE.Mesh(new THREE.ConeGeometry(1.9, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    FP.Stage.add(light);
    const bang = new THREE.Sprite(new THREE.SpriteMaterial({ map: bangTexture(), depthTest: false }));
    bang.scale.set(0.8, 0.8, 1);
    bang.visible = false;
    FP.Stage.add(bang);
    guards.push({ c, route, wp: 1, state: 'patrol', target: null, light, bang, lost: 0 });
  }
  let bangTex = null;
  function bangTexture() {
    if (bangTex) return bangTex;
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = '#ffcf33'; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill();
    g.lineWidth = 5; g.strokeStyle = '#2a2140'; g.stroke();
    g.fillStyle = '#2a2140'; g.font = '900 44px Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 32, 34);
    bangTex = new THREE.CanvasTexture(cv);
    return bangTex;
  }

  function spawn(i) {
    return { x: 17 + (i % 2) * 1.5, y: 0, z: -3 + i * 2, yaw: -Math.PI / 2 };
  }

  // can the guard see this character? (in front, close, nothing in the way)
  function sees(g, c) {
    const gp = g.c.parts.torso.position, p = c.parts.torso.position;
    const dx = p.x - gp.x, dz = p.z - gp.z, d = Math.hypot(dx, dz);
    if (d > 6.5 || c.ko > 0 || !c.alive) return false;
    const f = FP.Ragdoll.forward(g.c);
    if ((dx * f.x + dz * f.z) / d < Math.cos(0.6) && d > 1.4) return false;
    const r = new CANNON.RaycastResult();
    FP.Physics.world.raycastClosest(new CANNON.Vec3(gp.x, gp.y + 0.4, gp.z), new CANNON.Vec3(p.x, p.y + 0.4, p.z), { collisionFilterMask: FP.Physics.GROUP.WORLD, skipBackfaces: true }, r);
    return !r.hasHit;
  }

  // guards think and move every physics step
  function beforeStep(dt, chars) {
    for (const g of guards) {
      const c = g.c;
      const input = { x: 0, z: 0, punchPressed: false, jumpPressed: false, grab: false };
      if (c.ko <= 0) {
        const gp = c.parts.torso.position;
        if (g.state === 'patrol') {
          const [tx, tz] = g.route[g.wp];
          const d = FP.Bots.steer(c, tx, tz, input);
          input.x *= 0.45; input.z *= 0.45;
          if (d < 0.6) g.wp = (g.wp + 1) % g.route.length;
          const seen = chars.find((ch) => sees(g, ch));
          if (seen) { g.state = 'chase'; g.target = seen; g.lost = 0; FP.Audio.play('alarm'); alarm = 1.5; FP.FX.word(gp, 'HEY!', '#ffcf33', 1.2); }
        } else {
          const t = g.target;
          const tp = t.parts.torso.position;
          const d = FP.Bots.steer(c, tp.x, tp.z, input);
          input.x *= 0.88; input.z *= 0.88;
          if (d < 1.3 && Math.random() < dt * 4) input.punchPressed = true;
          g.lost = sees(g, t) ? 0 : g.lost + dt;
          if (g.lost > 2.5 || t.ko > 0 || d > 11) { g.state = 'patrol'; g.target = null; }
        }
      }
      FP.Ragdoll.control(c, input, dt);
    }
  }

  // guard flashlights and "!" signs (also used by online friends)
  function visual(dt) {
    for (const gd of guards) {
      const t = gd.c.parts.torso.position, f = FP.Ragdoll.forward(gd.c);
      gd.light.position.set(t.x + f.x * 3.2, t.y + 0.2, t.z + f.z * 3.2);
      gd.light.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(f.x, -0.08, f.z).normalize());
      gd.light.visible = gd.c.ko <= 0;
      gd.light.material.color.setHex(gd.state === 'chase' ? 0xff6b6b : 0xfff2a0);
      gd.bang.visible = gd.state === 'chase';
      gd.bang.position.set(t.x, t.y + 1.6, t.z);
    }
    for (const l of lasers) l.beam.visible = l.on;
  }

  function update(dt, chars, g, roundOver) {
    game = g;
    time += dt;
    alarm = Math.max(0, alarm - dt);
    for (const gd of guards) {
      FP.Ragdoll.sync(gd.c, dt);
      if (gd.c.parts.torso.position.y < -8) FP.Ragdoll.teleport(gd.c, gd.route[0][0], 0, gd.route[0][1]);
    }
    visual(dt);
    // lasers blink on and off
    for (const l of lasers) {
      l.on = ((time + l.offset) % l.period) < l.period * 0.62;
      l.beam.visible = l.on;
      if (!l.on || roundOver) continue;
      for (const c of chars) {
        if (c.ko > 0) continue;
        for (const part of [c.parts.torso, c.parts.head]) {
          const p = new THREE.Vector3(part.position.x, part.position.y, part.position.z);
          const ab = l.b.clone().sub(l.a), k = Math.max(0, Math.min(1, p.clone().sub(l.a).dot(ab) / ab.lengthSq()));
          if (l.a.clone().addScaledVector(ab, k).distanceTo(p) < 0.42) {
            FP.Ragdoll.knockOut(c, 2.2);
            const push = new CANNON.Vec3(-ab.z, 2, ab.x); push.normalize();
            const side = Math.sign((p.x - l.a.x) * -ab.z + (p.z - l.a.z) * ab.x) || 1;
            c.parts.torso.applyImpulse(new CANNON.Vec3(push.x * 14 * side, 8, push.z * 14 * side));
            FP.FX.word(p, 'ZAP!', '#ff2244', 1.3); FP.FX.stars(p, 8);
            FP.Audio.play('alarm'); alarm = 1.5;
            break;
          }
        }
      }
    }
    // treasure in the van?
    for (const l of loot) {
      if (l.got) continue;
      const p = l.body.position;
      if (p.x > ZONE.x1 && p.x < ZONE.x2 && p.z > ZONE.z1 && p.z < ZONE.z2 && p.y < 3) {
        l.got = true;
        money += l.value;
        const who = lastGrab.get(l.body);
        if (who && who.player) g.scores[who.player.id] = (g.scores[who.player.id] || 0) + l.value;
        FP.FX.word(p, `+$${l.value}`, '#6fd35a', 1.4);
        FP.FX.confetti(new CANNON.Vec3(p.x, 0, p.z), 40, 3);
        FP.Audio.play('coin');
        l.body.position.set(0, -100, 0); l.body.type = CANNON.Body.STATIC; l.mesh.visible = false;
        FP.Physics.world.removeBody(l.body);
      }
      if (p.y < -10) { p.set(0, 2, 0); l.body.velocity.set(0, 0, 0); }
    }
    for (const c of chars) if (c.parts.torso.position.y < -8) FP.Ragdoll.teleport(c, 18, 1, 0);
    if (roundOver) return null;
    const allGone = loot.every((l) => l.got);
    if (time >= TIME || allGone) {
      return { winners: [], text: allGone ? `You stole EVERYTHING! 💰` : `Time's up! You stole $${money}`, sub: stars() };
    }
    return null;
  }

  function stars() {
    const n = money >= 4000 ? 3 : money >= 2200 ? 2 : money >= 800 ? 1 : 0;
    return n ? '⭐'.repeat(n) + '☆'.repeat(3 - n) : 'No stars... try again!';
  }

  // which room is a spot in? (outside, the east room, or the west room)
  const room = (x) => (x > 14.5 ? 2 : x > 0 ? 1 : 0);
  const DOORS = { '2-1': [[15.8, 0], [13, 0]], '1-2': [[13, 0], [15.8, 0]], '1-0': [[1.4, 0], [-1.4, 0]], '0-1': [[-1.4, 0], [1.4, 0]] };
  // walk through the doors instead of into walls
  function goTo(c, tx, tz, input, tools) {
    const p = c.parts.torso.position;
    const a = room(p.x), b = room(tx);
    if (a !== b) {
      const next = a > b ? a - 1 : a + 1;
      const [d1, d2] = DOORS[a + '-' + next];
      // head to the near side of the door, then through it
      const nearDoor = Math.hypot(p.x - d1[0], p.z - d1[1]) < 1.2 || (Math.abs(p.z - d1[1]) < 1.2 && Math.abs(p.x - d1[0]) < 2);
      return tools.steer(c, nearDoor ? d2[0] : d1[0], nearDoor ? d2[1] : d1[1], input) + 5;
    }
    return tools.steer(c, tx, tz, input);
  }

  // bots grab the closest treasure and carry it to the van
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain;
    const holding = c.grab.find((gr) => gr && loot.some((l) => l.body === gr.body));
    const p = c.parts.torso.position;
    if (holding) {
      input.grab = true;
      goTo(c, 18.2, 0, input, tools);
      const hp = holding.body.position;
      if (hp.x > ZONE.x1 + 0.5) input.grab = false;
    } else {
      b.lootTime = (b.lootTime || 0) + dt;
      if (!b.loot || b.loot.got || b.lootTime > 7) {
        b.skip = b.lootTime > 7 ? b.loot : null; // gave up on that one
        b.lootTime = 0;
        let best = null, bd = Infinity;
        for (const l of loot) {
          if (l.got || l === b.skip) continue;
          const lp = l.body.position;
          const d = Math.hypot(lp.x - p.x, lp.z - p.z) + (l.kind === 'diamond' ? 4 : 0) + Math.random() * 3;
          if (d < bd) { bd = d; best = l; }
        }
        b.loot = best;
      }
      if (b.loot) {
        const lp = b.loot.body.position;
        const d = goTo(c, lp.x, lp.z, input, tools);
        if (d < 1.4) { input.grab = true; input.x *= 0.5; input.z *= 0.5; }
      }
    }
    // punch guards that get too close
    for (const g of guards) {
      if (g.c.ko > 0) continue;
      if (g.c.parts.torso.position.distanceTo(p) < 1.3 && Math.random() < dt * 3) input.punchPressed = true;
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const left = Math.max(0, TIME - time);
    return `💰 $${money} &nbsp; ⏱ ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}${alarm > 0 ? ' &nbsp; 🚨 ALARM!' : ''}`;
  }

  return {
    id: 'heist', name: 'The Heist', icon: '💎', roundsToWin: 1, single: true, minPlayers: 1, song: 'tense', minZoom: 15,
    desc: 'Team up! Carry treasure from the museum to the van. The diamond is HEAVY. Watch out for guards and lasers!',
    build, spawn, update, beforeStep, botThink, hud, visual, scoreLabel: (s) => `$${s}`,
    netState: () => ({ l: lasers.map((l) => (l.on ? 1 : 0)), g: guards.map((gd) => (gd.state === 'chase' ? 1 : 0)) }),
    applyNetState: (s) => { s.l.forEach((on, i) => { if (lasers[i]) lasers[i].on = !!on; }); s.g.forEach((ch, i) => { if (guards[i]) guards[i].state = ch ? 'chase' : 'patrol'; }); },
    resultText: () => `You stole $${money}! ${stars()}`,
  };
})();
