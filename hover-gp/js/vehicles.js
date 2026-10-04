// ============================================================
//  SIGMA HOVER GP — THE HOVER VEHICLES
//  Build your own: BODY + ENGINE + FINS.
//  Every part changes the stats (speed, acceleration, weight,
//  handling, grip and mini-turbo).
// ============================================================
window.HG = window.HG || {};

HG.Vehicles = (function () {
  const U = HG.U, M = HG.M;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);

  // ---------- the parts list (edit the stats if you want!) ----------
  const BODIES = [
    { id: 'kart', name: 'HOVER KART', pose: 'sit', st: {} },
    { id: 'bike', name: 'HOVER BIKE', pose: 'bike', st: { accel: 1, weight: -1, handling: 1.5, grip: -0.5, turbo: 0.5 } },
    { id: 'board', name: 'SKY BOARD', pose: 'stand', st: { speed: -1, accel: 2, weight: -2, handling: 1, turbo: 1.5 } },
    { id: 'buggy', name: 'BABY BUGGY', pose: 'sit', st: { speed: -1, accel: 1.5, weight: -1, handling: 0.5, grip: 1, turbo: 1 } },
    { id: 'chopper', name: 'SIGMA CHOPPER', pose: 'bike', st: { speed: 1.5, accel: -1, weight: 2, handling: -1, turbo: -1 }, cost: 100 },
    { id: 'jet', name: 'TURBO JET', pose: 'sit', st: { speed: 1.5, accel: -0.5, handling: -0.5, grip: -1, turbo: 0.5 }, cost: 200 },
    { id: 'ufo', name: 'UFO SAUCER', pose: 'sit', st: { speed: -0.5, accel: 1, weight: -0.5, handling: 1, grip: 1.5, turbo: -0.5 }, cost: 60 },
    { id: 'mech', name: 'MEGA MECH', pose: 'sit', st: { speed: 1, accel: -1, weight: 2.5, handling: -0.5, grip: 0.5, turbo: -1 }, cost: 300 },
    { id: 'sled', name: 'SPEED SLED', pose: 'sled', st: { speed: 0.5, weight: -0.5, grip: -1.5, turbo: 2 }, cost: 400 },
    { id: 'gold', name: 'GOLD SIGMA KART', pose: 'sit', st: { speed: 1, weight: 1, turbo: 0.5 }, unlock: 'gold' },
  ];
  const ENGINES = [
    { id: 'twin', name: 'TWIN JETS', st: {} },
    { id: 'ion', name: 'ION RINGS', st: { speed: -1, accel: 1.5, turbo: 1 } },
    { id: 'fan', name: 'FAN TURBINES', st: { speed: -0.5, accel: 0.5, handling: 1, grip: 1 } },
    { id: 'mega', name: 'MEGA THRUSTER', st: { speed: 1.5, accel: -1.5, weight: 0.5 }, cost: 150 },
    { id: 'rocket', name: 'ROCKET PACK', st: { speed: 1, accel: -0.5, handling: -0.5 }, cost: 250 },
    { id: 'reactor', name: 'SIGMA REACTOR', st: { speed: 1, accel: 0.5, weight: 0.5, turbo: 0.5 }, unlock: 'gold' },
  ];
  const FINS = [
    { id: 'standard', name: 'STANDARD FINS', st: {} },
    { id: 'wing', name: 'SPOILER WING', st: { speed: -0.5, handling: 0.5, grip: 1 }, cost: 50 },
    { id: 'glider', name: 'GLIDER WINGS', st: { speed: 0.5, accel: -0.3 } },
    { id: 'para', name: 'PARA-WING', st: { speed: -0.5, accel: 1 }, cost: 350 },
    { id: 'sigma', name: 'SIGMA BLADES', st: { speed: 0.5, turbo: 0.5 }, unlock: 'gold' },
  ];
  const find = (list, id) => list.find((p) => p.id === id) || list[0];

  // ---------- stats = character weight class + parts ----------
  function stats(charId, parts) {
    const C = HG.Chars.byId[charId] || HG.Chars.LIST[0];
    const s = Object.assign({}, HG.Chars.WEIGHT[C.weight]);
    for (const p of [find(BODIES, parts.body), find(ENGINES, parts.engine), find(FINS, parts.fins)]) {
      for (const k in p.st) s[k] += p.st[k];
    }
    for (const k in s) s[k] = U.clamp(s[k], 0, 10);
    return s;
  }

  // ------------------------------------------------------------
  //  BODIES. Each returns where the rider sits and holds on.
  //  The vehicle faces +z. y = 0 is the middle of the hover gap.
  // ------------------------------------------------------------
  function profileGeo(key, pts, width, bevel = 0.06) {
    // a side outline (z, y) pushed out sideways into a body
    return M.cached('prof' + key, () => {
      const g = M.smoothShape(key + 'raw', pts, width - bevel * 2, bevel).clone();
      g.rotateY(-Math.PI / 2);
      g.computeVertexNormals();
      return g;
    });
  }

  function hoverPod(parent, x, y, z, len, paint, glowCol, r = 0.2) {
    const g = M.group(parent, x, y, z);
    M.mesh(M.capsule(r, len), paint, 0, 0, 0, g, { r: [Math.PI / 2, 0, 0] });
    const gl = M.mesh(M.capsule(r * 0.55, len * 0.9), M.glowMat(glowCol, 1.8), 0, -r * 0.55, 0, g, { r: [Math.PI / 2, 0, 0], s: [1, 1, 0.5], shadow: false });
    return { g, glow: gl };
  }

  const builders = {
    kart(b, P) {
      const g = b.group;
      M.mesh(profileGeo('kart', [[1.25, -0.1], [1.0, 0.12], [0.45, 0.32], [0.1, 0.3], [-0.45, 0.22], [-0.75, 0.55], [-1.05, 0.5], [-1.15, 0.0], [-0.9, -0.22], [0.9, -0.22]], 1.15), P.paint, 0, 0, 0, g);
      // dark cockpit tub
      M.mesh(M.rbox(0.8, 0.25, 0.9, 0.1), P.dark, 0, 0.18, -0.2, g);
      // side hover pods
      for (const s of [1, -1]) b.pads.push(hoverPod(g, s * 0.72, -0.08, 0.1, 1.5, P.accent, P.glow, 0.2));
      // front bumper + nose stripe
      M.mesh(M.rbox(1.1, 0.12, 0.2, 0.05), P.accent, 0, -0.08, 1.2, g);

      // steering wheel
      const wheel = M.group(g, 0, 0.5, 0.3);
      wheel.rotation.x = -0.9;
      M.mesh(M.torus(0.17, 0.03, Math.PI * 2, 8, 24), P.black, 0, 0, 0, wheel);
      M.mesh(M.box(0.3, 0.03, 0.03), P.black, 0, 0, 0, wheel);
      M.mesh(M.cyl(0.03, 0.03, 0.35), P.black, 0, -0.18, 0, wheel);
      b.wheel = wheel;
      // seat back
      M.mesh(M.rbox(0.6, 0.5, 0.14, 0.06), P.seat, 0, 0.35, -0.62, g, { r: [-0.25, 0, 0] });
      // Σ emblem on the nose
      emblem(g, P, 0, 0.255, 0.72, 0.15, -Math.PI / 2 + 0.38);
      b.seat = V(0, 0.15, -0.32); b.hands = [V(0.15, 0.48, 0.28), V(-0.15, 0.48, 0.28)]; b.feet = [V(0.16, 0.0, 0.85), V(-0.16, 0.0, 0.85)];
      b.engines = [V(0.5, 0.1, -1.05), V(-0.5, 0.1, -1.05)]; b.center = V(0, 0.25, -1.1); b.fin = V(0, 0.5, -0.95);
      b.spark = [V(0.7, -0.2, -0.8), V(-0.7, -0.2, -0.8)];
    },
    gold(b, P) { builders.kart(b, P); },
    bike(b, P) {
      const g = b.group;
      M.mesh(profileGeo('bike', [[1.2, 0.1], [0.85, 0.42], [0.35, 0.5], [0.05, 0.38], [-0.55, 0.42], [-1.05, 0.5], [-1.15, 0.15], [-0.6, -0.12], [0.6, -0.12], [1.0, -0.05]], 0.42, 0.08), P.paint, 0, 0, 0, g);
      // windshield
      M.mesh(M.extrude('shield', [[0, 0], [0.18, 0.3], [-0.18, 0.3]], 0.02, 0.01), P.glass, 0, 0.5, 0.7, g, { r: [-0.6, 0, 0] });
      // front and back hover rings (instead of wheels)
      for (const z of [0.95, -0.95]) {
        const ring = M.group(g, 0, -0.08, z);
        M.mesh(M.torus(0.33, 0.07, Math.PI * 2, 10, 28), P.accent, 0, 0, 0, ring, { r: [Math.PI / 2, 0, 0] });
        const gl = M.mesh(M.cyl(0.28, 0.28, 0.03, 24), M.glowMat(P.glowHex, 1.6), 0, -0.04, 0, ring, { shadow: false });
        b.pads.push({ g: ring, glow: gl });
      }
      // seat
      M.mesh(M.rbox(0.36, 0.1, 0.6, 0.05), P.seat, 0, 0.45, -0.35, g);
      // handlebars
      const bar = M.group(g, 0, 0.62, 0.42);
      M.mesh(M.cyl(0.025, 0.025, 0.72), P.black, 0, 0, 0, bar, { r: [0, 0, Math.PI / 2] });
      for (const s of [1, -1]) M.mesh(M.cyl(0.035, 0.035, 0.14), P.dark, s * 0.32, 0, 0, bar, { r: [0, 0, Math.PI / 2] });
      b.wheel = bar; b.wheelAxis = 'y';
      emblem(g, P, 0, 0.32, 1.02, 0.12, -0.9);
      b.seat = V(0, 0.52, -0.32); b.hands = [V(0.31, 0.62, 0.42), V(-0.31, 0.62, 0.42)]; b.feet = [V(0.23, 0.12, 0.0), V(-0.23, 0.12, 0.0)];
      b.engines = [V(0.22, 0.2, -1.1), V(-0.22, 0.2, -1.1)]; b.center = V(0, 0.25, -1.15); b.fin = V(0, 0.5, -1.0);
      b.spark = [V(0.25, -0.35, -0.95), V(-0.25, -0.35, -0.95)];
      b.lean = 0.35;
    },
    chopper(b, P) {
      const g = b.group;
      M.mesh(profileGeo('chopper', [[1.55, 0.25], [1.1, 0.35], [0.4, 0.55], [-0.2, 0.3], [-0.7, 0.32], [-1.25, 0.5], [-1.3, 0.1], [-0.7, -0.15], [0.7, -0.15], [1.35, 0.0]], 0.5, 0.1), P.paint, 0, 0, 0, g);
      // big chrome engine block in the middle
      for (const s of [1, -1]) M.mesh(M.cyl(0.13, 0.13, 0.3, 16), P.chrome, s * 0.2, 0.05, 0.1, g, { r: [0, 0, s * 0.6] });
      // the long front fork and big front ring
      M.mesh(M.cyl(0.04, 0.04, 1.0), P.chrome, 0, 0.35, 1.3, g, { r: [0.6, 0, 0] });
      const ring = M.group(g, 0, -0.05, 1.55);
      M.mesh(M.torus(0.38, 0.09, Math.PI * 2, 10, 28), P.accent, 0, 0, 0, ring, { r: [Math.PI / 2, 0, 0] });
      b.pads.push({ g: ring, glow: M.mesh(M.cyl(0.32, 0.32, 0.03, 24), M.glowMat(P.glowHex, 1.6), 0, -0.05, 0, ring, { shadow: false }) });
      const ring2 = M.group(g, 0, -0.05, -1.0);
      M.mesh(M.torus(0.42, 0.1, Math.PI * 2, 10, 28), P.accent, 0, 0, 0, ring2, { r: [Math.PI / 2, 0, 0] });
      b.pads.push({ g: ring2, glow: M.mesh(M.cyl(0.36, 0.36, 0.03, 24), M.glowMat(P.glowHex, 1.6), 0, -0.05, 0, ring2, { shadow: false }) });
      // tall "ape hanger" handlebars
      const bar = M.group(g, 0, 0.9, 0.6);
      M.mesh(M.cyl(0.025, 0.025, 0.8), P.chrome, 0, 0, 0, bar, { r: [0, 0, Math.PI / 2] });
      for (const s of [1, -1]) M.mesh(M.cyl(0.025, 0.025, 0.35), P.chrome, s * 0.36, -0.15, 0, bar);
      b.wheel = bar; b.wheelAxis = 'y';
      M.mesh(M.rbox(0.45, 0.12, 0.55, 0.06), P.seat, 0, 0.32, -0.45, g);
      M.mesh(M.rbox(0.45, 0.5, 0.08, 0.04), P.seat, 0, 0.55, -0.8, g, { r: [-0.2, 0, 0] });
      emblem(g, P, 0, 0.5, 1.12, 0.14, -0.6);
      b.seat = V(0, 0.4, -0.45); b.hands = [V(0.36, 0.92, 0.6), V(-0.36, 0.92, 0.6)]; b.feet = [V(0.25, 0.05, 0.55), V(-0.25, 0.05, 0.55)];
      b.engines = [V(0.28, 0.15, -1.2), V(-0.28, 0.15, -1.2)]; b.center = V(0, 0.2, -1.3); b.fin = V(0, 0.55, -1.1);
      b.spark = [V(0.3, -0.35, -1.0), V(-0.3, -0.35, -1.0)];
      b.lean = 0.05;
    },
    board(b, P) {
      const g = b.group;
      // the board (seen from above it's a surfboard)
      const top = M.cached('boardgeo', () => { const geo = M.smoothShape('boardraw', [[0, 1.25], [0.45, 0.7], [0.5, -0.4], [0.35, -1.1], [-0.35, -1.1], [-0.5, -0.4], [-0.45, 0.7]], 0.08, 0.05).clone(); geo.rotateX(Math.PI / 2); return geo; });
      M.mesh(top, P.paint, 0, -0.05, 0, g);
      M.mesh(M.box(0.12, 0.02, 2.0), P.stripe, 0, 0.02, 0.05, g);
      // glowing hover strips underneath
      for (const s of [1, -1]) b.pads.push({ g, glow: M.mesh(M.capsule(0.08, 1.6), M.glowMat(P.glowHex, 1.8), s * 0.25, -0.12, 0, g, { r: [Math.PI / 2, 0, 0], shadow: false }) });
      // T-bar to hold on to
      M.mesh(M.cyl(0.035, 0.035, 0.95), P.black, 0, 0.45, 0.72, g, { r: [-0.25, 0, 0] });
      const bar = M.group(g, 0, 0.93, 0.6);
      M.mesh(M.cyl(0.03, 0.03, 0.6), P.black, 0, 0, 0, bar, { r: [0, 0, Math.PI / 2] });
      b.wheel = bar; b.wheelAxis = 'y';
      emblem(g, P, 0, 0.04, -0.7, 0.18, -Math.PI / 2);
      b.seat = V(0, 0.62, -0.08); b.hands = [V(0.26, 0.93, 0.6), V(-0.26, 0.93, 0.6)]; b.feet = [V(0.17, 0.02, -0.05), V(-0.17, 0.02, -0.25)];
      b.engines = [V(0.3, 0.05, -1.05), V(-0.3, 0.05, -1.05)]; b.center = V(0, 0.1, -1.1); b.fin = V(0, 0.08, -0.95);
      b.spark = [V(0.4, -0.15, -0.9), V(-0.4, -0.15, -0.9)];
      b.engineScale = 0.75;
    },
    jet(b, P) {
      const g = b.group;
      const fus = M.lathe('fuselage', [[0, -1.3], [0.32, -1.15], [0.42, -0.6], [0.45, 0.1], [0.38, 0.7], [0.2, 1.2], [0.0, 1.45]], 24);
      const f = M.mesh(fus, P.paint, 0, 0.05, 0, g, { r: [Math.PI / 2, 0, 0], s: [1.25, 1, 0.75] });
      // cockpit hole
      M.mesh(M.rbox(0.62, 0.2, 0.9, 0.08), P.dark, 0, 0.3, -0.15, g);
      // delta wings
      for (const s of [1, -1]) M.mesh(M.extrude('jetwing', [[0, 0.4], [1.0, -0.6], [1.0, -0.85], [0, -0.75]], 0.05, 0.02), P.accent, s * 0.25, 0.0, -0.1, g, { r: [Math.PI / 2, 0, 0], s: [s, 1, 1] });
      for (const s of [1, -1]) b.pads.push(hoverPod(g, s * 0.95, -0.08, -0.55, 0.5, P.accent, P.glow, 0.12));
      M.mesh(M.box(0.2, 0.02, 1.0), P.stripe, 0, 0.42, 0.55, g, { r: [-0.18, 0, 0] });
      // control stick
      const stick = M.group(g, 0, 0.25, 0.3);
      M.mesh(M.cyl(0.025, 0.025, 0.3), P.black, 0, 0.12, 0, stick);
      M.mesh(M.box(0.36, 0.04, 0.04), P.black, 0, 0.27, 0, stick);
      b.wheel = stick; b.wheelAxis = 'z';
      emblem(g, P, 0, 0.3, 0.95, 0.12, -0.35);
      b.seat = V(0, 0.15, -0.3); b.hands = [V(0.17, 0.52, 0.3), V(-0.17, 0.52, 0.3)]; b.feet = [V(0.14, 0.02, 0.75), V(-0.14, 0.02, 0.75)];
      b.engines = [V(0.0, 0.08, -1.3)]; b.center = V(0, 0.08, -1.35); b.fin = V(0, 0.4, -1.0);
      b.spark = [V(0.9, -0.2, -0.8), V(-0.9, -0.2, -0.8)];
      b.singleEngine = true;
    },
    ufo(b, P) {
      const g = b.group;
      M.mesh(M.lathe('ufo', [[0, -0.22], [0.7, -0.15], [1.15, 0.0], [1.2, 0.08], [0.75, 0.22], [0.5, 0.25], [0, 0.25]], 32), P.paint, 0, 0, 0, g);
      // lights all around
      const n = 10;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; M.mesh(M.sphere(0.06), M.glowMat(i % 2 ? 0xffe060 : P.glowHex, 2), Math.cos(a) * 1.1, 0.05, Math.sin(a) * 1.1, g, { shadow: false }); }
      // glass dome
      const glass = new THREE.MeshPhysicalMaterial({ color: 0xa0e8ff, transparent: true, opacity: 0.25, roughness: 0.02, clearcoat: 1, depthWrite: false });
      const dome = M.mesh(M.sphere(0.72, 28, 16), glass, 0, 0.2, -0.05, g, { s: [1, 0.95, 1.05], shadow: false });
      dome.renderOrder = 4;
      b.pads.push({ g, glow: M.mesh(M.cyl(0.6, 0.6, 0.03, 28), M.glowMat(P.glowHex, 1.8), 0, -0.24, 0, g, { shadow: false }) });
      const lev = M.group(g, 0, 0.3, 0.32);
      for (const s of [1, -1]) M.mesh(M.cyl(0.02, 0.02, 0.2), P.black, s * 0.2, 0.08, 0, lev);
      b.wheel = lev; b.wheelAxis = 'z';
      b.seat = V(0, 0.25, -0.12); b.hands = [V(0.2, 0.45, 0.32), V(-0.2, 0.45, 0.32)]; b.feet = [V(0.14, 0.15, 0.5), V(-0.14, 0.15, 0.5)];
      b.engines = [V(0.45, 0.0, -1.0), V(-0.45, 0.0, -1.0)]; b.center = V(0, 0.05, -1.1); b.fin = V(0, 0.2, -0.95);
      b.spark = [V(0.9, -0.2, -0.6), V(-0.9, -0.2, -0.6)];
      b.engineScale = 0.7;
    },
    buggy(b, P) {
      const g = b.group;
      // a baby stroller... that hovers!
      M.mesh(M.rbox(1.0, 0.55, 1.5, 0.25), P.paint, 0, 0.05, 0, g);
      M.mesh(M.rbox(0.8, 0.3, 1.2, 0.12), P.seat, 0, 0.25, -0.05, g);
      // the hood
      const hood = M.cached('buggyhood', () => new THREE.SphereGeometry(0.85, 28, 14, 0, Math.PI, 0, Math.PI / 2));
      const hm = M.mesh(hood, P.accent, 0, 0.3, -0.62, g, { r: [-Math.PI / 2, 0, 0], s: [0.9, 1, 1.1] });
      hm.material = hm.material.clone(); hm.material.side = THREE.DoubleSide;
      // frilly edge
      for (let i = 0; i < 14; i++) { const a = (i / 13) * Math.PI; M.mesh(M.sphere(0.065), P.white, Math.cos(a) * 0.78, 0.3 + Math.sin(a) * 0.94, -0.62, g); }
      // the push handle
      M.mesh(M.torus(0.35, 0.03, Math.PI, 8, 16), P.chrome, 0, 0.62, -0.85, g, { r: [0, 0, 0] });
      // little bar for baby hands, with toy balls
      const bar = M.group(g, 0, 0.45, 0.42);
      M.mesh(M.cyl(0.025, 0.025, 0.7), P.chrome, 0, 0, 0, bar, { r: [0, 0, Math.PI / 2] });
      ['#ff5a5a', '#5ad0ff', '#ffe04a'].forEach((c, i) => M.mesh(M.sphere(0.055), M.mat(c, { rough: 0.3 }), (i - 1) * 0.14, -0.06, 0, bar));
      b.wheel = bar; b.wheelAxis = 'z';
      // hover balls (instead of wheels)
      for (const [x, z] of [[0.45, 0.6], [-0.45, 0.6], [0.45, -0.6], [-0.45, -0.6]]) {
        const p = M.group(g, x, -0.22, z);
        M.mesh(M.sphere(0.16), P.white, 0, 0, 0, p);
        b.pads.push({ g: p, glow: M.mesh(M.sphere(0.12), M.glowMat(P.glowHex, 1.8), 0, -0.07, 0, p, { s: [1, 0.5, 1], shadow: false }) });
      }
      emblem(g, P, 0, 0.1, 0.76, 0.14, 0);
      b.seat = V(0, 0.32, -0.12); b.hands = [V(0.16, 0.45, 0.42), V(-0.16, 0.45, 0.42)]; b.feet = [V(0.14, 0.3, 0.55), V(-0.14, 0.3, 0.55)];
      b.engines = [V(0.35, 0.05, -0.85), V(-0.35, 0.05, -0.85)]; b.center = V(0, 0.1, -0.95); b.fin = V(0, 0.4, -0.75);
      b.spark = [V(0.5, -0.3, -0.7), V(-0.5, -0.3, -0.7)];
      b.engineScale = 0.75;
    },
    mech(b, P) {
      const g = b.group;
      M.mesh(M.rbox(1.25, 0.5, 1.9, 0.18), P.paint, 0, 0.0, 0, g);
      M.mesh(M.rbox(0.85, 0.3, 0.9, 0.1), P.dark, 0, 0.25, -0.2, g);
      // big shoulder pods with lights
      for (const s of [1, -1]) {
        M.mesh(M.rbox(0.45, 0.45, 0.9, 0.15), P.accent, s * 0.78, 0.15, 0.2, g);
        M.mesh(M.cyl(0.1, 0.1, 0.05, 16), M.glowMat(0xffe060, 2), s * 0.78, 0.15, 0.67, g, { r: [Math.PI / 2, 0, 0], shadow: false });
        b.pads.push(hoverPod(g, s * 0.78, -0.22, 0.1, 1.2, P.accent, P.glow, 0.17));
      }
      // armor plates
      M.mesh(M.rbox(0.9, 0.1, 0.5, 0.04), P.chrome, 0, 0.2, 0.75, g, { r: [-0.3, 0, 0] });
      const wheel = M.group(g, 0, 0.55, 0.25);
      wheel.rotation.x = -0.8;
      M.mesh(M.rbox(0.5, 0.06, 0.15, 0.03), P.black, 0, 0, 0, wheel);
      for (const s of [1, -1]) M.mesh(M.cyl(0.03, 0.03, 0.15), P.black, s * 0.22, 0.06, 0, wheel);
      b.wheel = wheel;
      emblem(g, P, 0, 0.12, 0.96, 0.16, 0);
      b.seat = V(0, 0.3, -0.25); b.hands = [V(0.22, 0.6, 0.24), V(-0.22, 0.6, 0.24)]; b.feet = [V(0.16, 0.15, 0.65), V(-0.16, 0.15, 0.65)];
      b.engines = [V(0.4, 0.15, -1.0), V(-0.4, 0.15, -1.0)]; b.center = V(0, 0.2, -1.05); b.fin = V(0, 0.5, -0.9);
      b.spark = [V(0.8, -0.3, -0.7), V(-0.8, -0.3, -0.7)];
      b.engineScale = 1.15;
    },
    sled(b, P) {
      const g = b.group;
      M.mesh(M.rbox(0.9, 0.18, 2.1, 0.08), P.paint, 0, -0.05, -0.1, g);
      // curled front runners
      for (const s of [1, -1]) {
        M.mesh(M.torus(0.25, 0.04, Math.PI, 8, 16), P.chrome, s * 0.42, 0.05, 0.95, g, { r: [0, Math.PI / 2, 0] });
        M.mesh(M.cyl(0.04, 0.04, 2.0), P.chrome, s * 0.42, -0.2, -0.1, g, { r: [Math.PI / 2, 0, 0] });
        b.pads.push({ g, glow: M.mesh(M.capsule(0.06, 1.8), M.glowMat(P.glowHex, 1.8), s * 0.42, -0.26, -0.1, g, { r: [Math.PI / 2, 0, 0], shadow: false }) });
        M.mesh(M.cyl(0.03, 0.03, 0.4), P.chrome, s * 0.42, 0.15, 0.0, g, { r: [0, 0, s * 0.3] });
      }
      M.mesh(M.rbox(0.6, 0.35, 0.12, 0.05), P.seat, 0, 0.2, -0.95, g, { r: [-0.4, 0, 0] });
      const bar = M.group(g, 0, 0.3, 0.75);
      M.mesh(M.cyl(0.025, 0.025, 0.9), P.black, 0, 0, 0, bar, { r: [0, 0, Math.PI / 2] });
      b.wheel = bar; b.wheelAxis = 'y';
      emblem(g, P, 0, 0.05, 0.96, 0.14, -0.2);
      b.seat = V(0, 0.15, -0.6); b.hands = [V(0.3, 0.3, 0.72), V(-0.3, 0.3, 0.72)]; b.feet = [V(0.16, 0.05, 0.45), V(-0.16, 0.05, 0.45)];
      b.engines = [V(0.3, 0.05, -1.2), V(-0.3, 0.05, -1.2)]; b.center = V(0, 0.08, -1.25); b.fin = V(0, 0.15, -1.1);
      b.spark = [V(0.45, -0.3, -1.0), V(-0.45, -0.3, -1.0)];
      b.engineScale = 0.85;
    },
  };

  function emblem(g, P, x, y, z, size, tilt) {
    const m = new THREE.MeshBasicMaterial({ map: HG.Tex.sign('Σ', '#111118', '#ffcc1a', 64, 64), toneMapped: false });
    M.mesh(new THREE.CircleGeometry(size, 24), m, x, y, z + 0.02, g, { r: [tilt, 0, 0], shadow: false });
  }

  // ------------------------------------------------------------
  //  ENGINES: put thrusters at the back. Each one has a nozzle
  //  where the flames come out.
  // ------------------------------------------------------------
  function buildEngine(b, id, P) {
    const g = b.group, sc = b.engineScale || 1;
    const add = (pos, s) => {
      const e = M.group(g, pos.x, pos.y, pos.z);
      e.scale.setScalar(s * sc);
      const noz = new THREE.Object3D();
      if (id === 'twin') {
        M.mesh(M.cyl(0.18, 0.2, 0.55, 18), P.accent, 0, 0, 0.1, e, { r: [Math.PI / 2, 0, 0] });
        M.mesh(M.cyl(0.21, 0.16, 0.12, 18), P.chrome, 0, 0, -0.22, e, { r: [Math.PI / 2, 0, 0] });
        M.mesh(M.cyl(0.13, 0.13, 0.02, 18), M.glowMat(P.flameHex, 2), 0, 0, -0.285, e, { r: [Math.PI / 2, 0, 0], shadow: false });
        noz.position.set(0, 0, -0.3);
      } else if (id === 'mega') {
        M.mesh(M.cyl(0.32, 0.38, 0.7, 24), P.accent, 0, 0, 0.1, e, { r: [Math.PI / 2, 0, 0] });
        M.mesh(M.torus(0.33, 0.06, Math.PI * 2, 8, 24), P.chrome, 0, 0, -0.25, e);
        M.mesh(M.cyl(0.26, 0.26, 0.02, 24), M.glowMat(P.flameHex, 2), 0, 0, -0.27, e, { r: [Math.PI / 2, 0, 0], shadow: false });
        noz.position.set(0, 0, -0.3);
      } else if (id === 'ion') {
        M.mesh(M.cyl(0.12, 0.14, 0.45, 16), P.dark, 0, 0, 0.1, e, { r: [Math.PI / 2, 0, 0] });
        for (let k = 0; k < 3; k++) M.mesh(M.torus(0.2 - k * 0.03, 0.025, Math.PI * 2, 6, 20), M.glowMat(0x40c8ff, 1.6), 0, 0, -0.15 - k * 0.1, e, { shadow: false });
        noz.position.set(0, 0, -0.4);
      } else if (id === 'rocket') {
        for (const [x, y] of [[0.1, 0.08], [-0.1, 0.08], [0, -0.1]]) {
          M.mesh(M.cyl(0.08, 0.08, 0.6, 12), P.accent, x, y, 0.05, e, { r: [Math.PI / 2, 0, 0] });
          M.mesh(M.cone(0.08, 0.15, 12), P.stripe, x, y, 0.42, e, { r: [Math.PI / 2, 0, 0] });
        }
        noz.position.set(0, 0, -0.28);
      } else if (id === 'fan') {
        M.mesh(M.torus(0.24, 0.06, Math.PI * 2, 8, 24), P.accent, 0, 0, 0, e);
        const blades = M.group(e, 0, 0, 0);
        for (let k = 0; k < 5; k++) M.mesh(M.box(0.05, 0.22, 0.02), P.chrome, 0, 0.11, 0, M.group(blades, 0, 0, 0), {}).parent.rotation.z = (k / 5) * Math.PI * 2;
        M.mesh(M.sphere(0.06), P.dark, 0, 0, 0, e);
        b.fans.push(blades);
        noz.position.set(0, 0, -0.1);
      } else if (id === 'reactor') {
        M.mesh(M.sphere(0.2), M.glowMat(0xffc020, 2.2), 0, 0, 0, e, { shadow: false });
        for (let k = 0; k < 3; k++) M.mesh(M.torus(0.25, 0.02, Math.PI * 2, 6, 24), P.chrome, 0, 0, 0, e, { r: [k * 1.05, k * 0.7, 0] });
        noz.position.set(0, 0, -0.25);
        b.reactors.push(e);
      }
      e.add(noz);
      b.nozzles.push({ obj: noz, size: id === 'mega' ? 1.6 : id === 'ion' ? 0.9 : 1 });
    };
    if (b.singleEngine || id === 'mega' || id === 'reactor') add(b.center, b.singleEngine ? 1.2 : 1);
    else for (const p of b.engines) add(p, 1);
  }

  // ------------------------------------------------------------
  //  FINS / WINGS. They open up when you glide!
  // ------------------------------------------------------------
  function buildFins(b, id, P) {
    const g = M.group(b.group, b.fin.x, b.fin.y, b.fin.z);
    const wings = [];
    if (id === 'standard') {
      for (const s of [1, -1]) M.mesh(M.extrude('fin1', [[0, 0], [0.12, 0.42], [0.32, 0.42], [0.32, 0]], 0.04, 0.02), P.accent, s * 0.3, 0, -0.1, g, { r: [0, -Math.PI / 2, s * 0.25] });
    } else if (id === 'wing') {
      for (const s of [1, -1]) M.mesh(M.box(0.04, 0.3, 0.12), P.black, s * 0.35, 0.12, 0, g);
      M.mesh(M.rbox(1.2, 0.05, 0.35, 0.02), P.accent, 0, 0.28, -0.05, g, { r: [0.12, 0, 0] });
      for (const s of [1, -1]) M.mesh(M.box(0.04, 0.16, 0.38), P.stripe, s * 0.6, 0.3, -0.05, g);
    } else if (id === 'sigma') {
      for (const s of [1, -1]) M.mesh(M.extrude('sigblade', [[0, 0], [0.7, 0.25], [0.75, 0.1], [0.2, -0.08]], 0.03, 0.015), P.gold, s * 0.12, 0.05, 0, g, { s: [s, 1, 1], r: [0, s * 0.3, 0] });
    } else {
      M.mesh(M.rbox(0.4, 0.12, 0.3, 0.04), P.accent, 0, 0.02, 0, g);
    }
    // the glider: hidden when driving, big when gliding
    const glider = M.group(g, 0, 0.1, 0);
    if (id === 'para') {
      const canopy = M.cached('para', () => new THREE.CylinderGeometry(1.4, 1.4, 1.0, 24, 1, true, -1.1, 2.2));
      M.mesh(canopy, M.mat(P.accentHex, { double: true, rough: 0.6 }), 0, 1.3, 0.4, glider, { r: [0, 0, Math.PI / 2], s: [1, 1, 0.5] });
      for (const s of [1, -1]) M.mesh(M.cyl(0.006, 0.006, 1.6), P.black, s * 0.6, 0.6, 0.2, glider, { r: [0, 0, s * 0.6] });
    } else {
      for (const s of [1, -1]) {
        const w = M.group(glider, s * 0.1, 0, 0);
        M.mesh(M.extrude('gliderwing' + id, [[0, 0.2], [1.5, 0.05], [1.6, -0.15], [0, -0.3]], 0.04, 0.02), id === 'sigma' ? P.gold : P.accent, 0, 0, 0, w, { s: [s, 1, 1], r: [Math.PI / 2, 0, 0] });
        M.mesh(M.box(1.3, 0.05, 0.05), P.stripe, s * 0.7, 0.03, 0.1, w);
        wings.push(w);
      }
    }
    glider.scale.setScalar(0.001);
    b.glider = glider;
    b.wings = wings;
  }

  // ------------------------------------------------------------
  //  BUILD THE WHOLE VEHICLE
  // ------------------------------------------------------------
  function build(parts, color, charDef) {
    const bodyId = find(BODIES, parts.body).id;
    const gold = bodyId === 'gold';
    const col = new THREE.Color(gold ? '#ffcc33' : color);
    const accent = col.clone().offsetHSL(0.0, 0.05, -0.18);
    const glowHex = charDef && charDef.glow !== undefined ? charDef.glow : 0x40d0ff;
    const P = {
      paint: gold ? M.mat('#ffcc33', { rough: 0.15, metal: 1 }) : M.paint(col),
      accent: gold ? M.mat('#d8a020', { rough: 0.25, metal: 1 }) : M.paint(accent, { rough: 0.4 }),
      accentHex: '#' + accent.getHexString(),
      stripe: M.mat('#ffffff', { rough: 0.4 }), white: M.mat('#ffffff', { rough: 0.5 }),
      dark: M.mat('#22232a', { rough: 0.6 }), black: M.mat('#121216', { rough: 0.4 }),
      seat: M.mat('#2a2a34', { rough: 0.8 }), chrome: M.mat('#d8dde4', { rough: 0.12, metal: 1 }),
      gold: M.mat('#ffcc33', { rough: 0.15, metal: 1 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0xb0e0ff, transparent: true, opacity: 0.35, roughness: 0.02, clearcoat: 1 }),
      glow: glowHex, glowHex, flameHex: 0x80e0ff,
    };
    if (gold) P.stripe = M.mat('#fff4c0', { rough: 0.2, metal: 0.5 });
    const b = { id: bodyId, group: new THREE.Group(), pads: [], nozzles: [], fans: [], reactors: [], pose: find(BODIES, bodyId).pose, P };
    builders[bodyId](b, P);
    buildEngine(b, find(ENGINES, parts.engine).id, P);
    buildFins(b, find(FINS, parts.fins).id, P);
    b.group.traverse((o) => { if (o.isMesh && o.castShadow !== false && !o.material.transparent) o.castShadow = true; });
    M.mergeStatic(b.group, new Set());
    return b;
  }

  return { BODIES, ENGINES, FINS, build, stats, find };
})();
