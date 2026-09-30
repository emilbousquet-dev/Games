// ============================================================
//  JETPACK CITY — THE WORLD
//  Builds the planets and the endless road.
//  New road pieces appear far ahead of you, and old ones behind
//  you get thrown away, so the road never ends!
//
//  Distances: "d" is how far along the road something is (in meters).
//  In 3D you run toward -Z, so a thing at distance d is at z = -d.
// ============================================================
window.JC = window.JC || {};

JC.World = (function () {
  const U = JC.U, M = JC.Models;
  const LANE = 2.4;               // width of one lane
  const ROW = 3;                  // length of one row in a level piece
  const BLOCK = 60;               // the city is built in blocks this long
  const NBLOCKS = JC.lowGfx ? 4 : 6;
  const AHEAD = 140;              // how far ahead new road pieces appear
  const TRAIN_TOP = 2.8;          // height of a train roof

  let scene;
  const obstacles = [];           // barriers, lasers, holes, trains, ramps
  const bolts = [];
  const powerUps = [];
  const hints = [];               // tutorial messages: { d, text }
  const blocks = [];
  const cars = [];
  const particles = [];
  let genD = 0, lastPowerD = 0, lastPiece = null, tutorialLeft = [], runSpeed = 13;
  let skyline, moon, moonDisc, sun, hemi, gate, gateAt = -1;
  const VARIANTS = JC.lowGfx ? 2 : 3;   // different city blocks per planet
  const templates = {}, free = {};
  let planetIdx = -1, onPlanet = null;
  const PL = () => JC.SETTINGS.planetLength;
  const planetAt = (d) => Math.floor(Math.max(0, d) / PL()) % JC.WORLDS.length;

  const laneX = (lane) => lane * LANE;

  // ---------------- setting up ----------------
  function init(sc) {
    scene = sc;
    scene.fog = new THREE.Fog(0x2a1048, 35, JC.lowGfx ? 140 : 175);
    hemi = new THREE.HemisphereLight(0xb0a0ff, 0x402060, 1.5);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffe0f0, 1.6);
    sun.position.set(-6, 14, 8);
    scene.add(sun); scene.add(sun.target);

    // far away hills or towers, and the planet's sun or moon (they move along with you)
    skyline = new THREE.Mesh(new THREE.PlaneGeometry(700, 175), new THREE.MeshBasicMaterial({ transparent: true, fog: false, depthWrite: false }));
    skyline.renderOrder = -1;
    scene.add(skyline);
    moon = M.glowSprite(scene, 0xffd0f0, 60, [0, 0, 0], 0.9);
    moon.material = moon.material.clone(); moon.material.fog = false;
    moonDisc = new THREE.Mesh(M.G.sphere(), new THREE.MeshBasicMaterial({ color: 0xffe8f8, fog: false }));
    moon.add(moonDisc); moonDisc.scale.set(9 / 60, 9 / 60, 9 / 60);

    // build every planet's city blocks once, at the start (so the game never stops to build)
    for (const w of JC.WORLDS) templates[w.id] = Array.from({ length: VARIANTS }, (_, v) => makeBlock(w, v));
    for (let i = 0; i < NBLOCKS; i++) blocks.push({ index: i, g: null, key: null });
    gate = M.warpGate();
    scene.add(gate.g);
    for (let i = 0; i < (JC.lowGfx ? 2 : 5); i++) { const c = M.flyingCar(); scene.add(c); cars.push({ mesh: c, speed: 0 }); resetCar(cars[i], 0, true); }
    for (let i = 0; i < 70; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: JC.Tex.glow(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.visible = false; scene.add(s);
      particles.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 1 });
    }
    applyPlanet(0);
  }

  // change the sky, the fog and the light to a planet's colors
  function applyPlanet(i) {
    planetIdx = i;
    const w = JC.WORLDS[i];
    scene.background = JC.Tex.sky(w);
    scene.fog.color.set(w.fog);
    hemi.color.set(w.light[0]); hemi.groundColor.set(w.light[1]); hemi.intensity = w.light[2];
    sun.color.set(w.sun[0]); sun.intensity = w.sun[2];
    skyline.material.map = JC.Tex.skyline(w.skyline[0], w.skyline[1], w.skyline[2]);
    skyline.material.needsUpdate = true;
    moonDisc.material.color.set(w.sun[0]);
    moon.material.color.set(w.sun[1]);
    for (const c of cars) c.mesh.visible = !!w.cars;
  }

  // city blocks: take one from the box of spare blocks (or copy the template), and give it back later
  function useBlock(b, index) {
    const w = JC.WORLDS[planetAt(index * BLOCK)];
    const v = ((index % VARIANTS) + VARIANTS) % VARIANTS;
    const key = w.id + v;
    if (b.key !== key) {
      if (b.g) { scene.remove(b.g); (free[b.key] = free[b.key] || []).push(b.g); }
      b.g = (free[key] && free[key].pop()) || templates[w.id][v].clone();
      b.key = key;
      scene.add(b.g);
    }
    b.index = index;
    b.g.position.z = -index * BLOCK;
  }

  // ---------------- one block of a planet ----------------
  const roadMats = {};
  function roadMat(style) {
    if (!roadMats[style]) { const t = JC.Tex.road(style); t.repeat.set(1, BLOCK / 12); roadMats[style] = new THREE.MeshBasicMaterial({ map: t }); }
    return roadMats[style];
  }
  function ground(g, color, y = -0.08) {
    const m = new THREE.Mesh(M.G.plane(), M.lam(color));
    m.rotation.x = -Math.PI / 2; m.scale.set(260, BLOCK, 1); m.position.set(0, y, -BLOCK / 2);
    g.add(m);
  }
  // pick spots along the block for scenery, on both sides of the road
  function alongSides(minX, maxX, step, fn) {
    for (const s of [-1, 1]) {
      let z = -U.rand(0, step * 0.5);
      while (z > -BLOCK) { fn(s, s * U.rand(minX, maxX), z); z -= step * U.rand(0.7, 1.3); }
    }
  }

  function makeBlock(w, variant) {
    const g = new THREE.Group();
    const road = new THREE.Mesh(M.G.plane(), roadMat(w.road));
    road.rotation.x = -Math.PI / 2; road.scale.set(8.4, BLOCK, 1); road.position.set(0, 0, -BLOCK / 2);
    g.add(road);
    const curbs = (color, glow) => {
      for (const s of [-1, 1]) {
        M.P(g, M.G.box(), M.lam(color), [s * 4.35, 0.18, -BLOCK / 2], [0.3, 0.36, BLOCK]);
        if (glow) M.P(g, M.G.box(), M.glowy(glow, 0.9), [s * 4.35, 0.38, -BLOCK / 2], [0.12, 0.05, BLOCK]);
      }
    };

    if (w.scenery === 'city') {
      // Metropolis: a skyway high above the clouds, between tall towers
      const deck = M.lam(0x2a2848);
      M.P(g, M.G.box(), deck, [0, -0.48, -BLOCK / 2], [8.8, 0.9, BLOCK]);
      for (const s of [-1, 1]) {
        M.P(g, M.G.box(), M.lam(0x3a3a60), [s * 4.35, 0.25, -BLOCK / 2], [0.16, 0.5, BLOCK]);
        M.P(g, M.G.box(), M.glowy(0xffcc2a, 0.9), [s * 4.35, 0.52, -BLOCK / 2], [0.1, 0.05, BLOCK]);
        M.P(g, M.G.box(), M.glowy(0x3af0ff, 0.7), [s * 4.45, -0.6, -BLOCK / 2], [0.06, 0.06, BLOCK]);
      }
      for (const z of [-15, -45]) M.P(g, M.G.box(), deck, [0, -16, z], [3, 31, 3]);
      const clouds = new THREE.Mesh(M.G.plane(), M.basic(0x9a8ad0));
      clouds.rotation.x = -Math.PI / 2; clouds.scale.set(260, BLOCK, 1); clouds.position.set(0, -28, -BLOCK / 2);
      g.add(clouds);
      for (const s of [-1, 1]) {
        let z = 0;
        while (z > -BLOCK) {
          const d = U.rand(8, 14), wd = U.rand(8, 13), h = U.rand(35, 85);
          const x = s * (9 + wd / 2 + U.rand(0, 5));
          if (Math.random() < 0.5) M.tower(g, [x, 0, z - d / 2], wd, h, d, U.randInt(0, 3));
          else { const bl = M.building(wd, h, d, U.randInt(0, 3)); bl.position.set(x, h / 2 - 20, z - d / 2); g.add(bl); }
          if (Math.random() < 0.35) {
            const sg = M.neonSign(U.pick(JC.TEXT.signs), U.pick(['#ff3aa8', '#3af0ff', '#ffd21a', '#9a5aff', '#6aff6a']));
            sg.position.set(x - s * wd / 2 - s * 0.06, U.rand(3, 16), z - d / 2);
            sg.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
            g.add(sg);
          }
          z -= d + U.rand(2, 6);
        }
        if (!JC.lowGfx) {
          let z2 = 0;
          while (z2 > -BLOCK) {
            const d = U.rand(12, 20), wd = U.rand(14, 22), h = U.rand(70, 130);
            M.tower(g, [s * (36 + wd / 2 + U.rand(0, 10)), 0, z2 - d / 2], wd, h, d, U.randInt(0, 3));
            z2 -= d + U.rand(4, 12);
          }
        }
      }
      if (variant > 0) M.place(g, M.platform, [variant === 1 ? -14 : 15, U.rand(4, 9), -30], U.rand(0, 6), 0.9);
      if (variant === 0) {
        for (const s of [-1, 1]) {
          M.P(g, M.G.box(), M.lam(0x3a3a60), [s * 5.4, 3.5, -2], [0.8, 9, 0.8]);
          M.P(g, M.G.box(), M.glowy(0x3af0ff, 0.9), [s * 5.0, 3.5, -1.58], [0.08, 9, 0.08]);
        }
        M.P(g, M.G.box(), M.lam(0x3a3a60), [0, 8.3, -2], [11.6, 1, 0.9]);
        const sg = M.neonSign('METROPOLIS', '#3af0ff');
        sg.position.set(0, 9.9, -1.9); sg.scale.set(5.4, 1.7, 1);
        g.add(sg);
      }
    } else if (w.scenery === 'canyon') {
      // Veldin: a desert track through orange canyons
      ground(g, 0xe8a860);
      curbs(0x9a6a3a);
      alongSides(9, 14, 13, (s, x, z) => M.mesa(g, [x + s * 3, -0.1, z], U.rand(6, 11), U.rand(7, 22), U.rand(8, 13)));
      alongSides(5.5, 7.5, 9, (s, x, z) => (Math.random() < 0.5 ? M.rocks(g, [x, 0, z], U.rand(0.5, 1.2)) : M.place(g, M.cactus, [x, 0, z], U.rand(0, 6), U.rand(0.7, 1.2))));
      if (!JC.lowGfx) alongSides(40, 60, 26, (s, x, z) => M.mesa(g, [x, -0.1, z], U.rand(14, 24), U.rand(18, 38), U.rand(14, 22), '#c8702e', '#b05a22'));
      if (variant === 0) M.rockArch(g, -30);
    } else if (w.scenery === 'beach') {
      // Pokitaru: a wooden boardwalk over turquoise water
      const water = new THREE.Mesh(M.G.plane(), M.basic(0x2ac0d8));
      water.rotation.x = -Math.PI / 2; water.scale.set(260, BLOCK, 1); water.position.set(0, -0.6, -BLOCK / 2);
      g.add(water);
      M.P(g, M.G.box(), M.lam(0x7a4a24), [0, -0.2, -BLOCK / 2], [8.6, 0.3, BLOCK]);
      for (let z = -3; z > -BLOCK; z -= 6) {
        for (const s of [-1, 1]) {
          M.P(g, M.G.cyl(), M.lam(0x6a4020), [s * 4.1, -0.9, z], [0.18, 1.6, 0.18]);
          M.P(g, M.G.cyl(), M.lam(0x8a5a30), [s * 4.35, 0.5, z], [0.1, 1.0, 0.1]);
        }
      }
      for (const s of [-1, 1]) M.P(g, M.G.box(), M.lam(0xe8d0a0), [s * 4.35, 0.85, -BLOCK / 2], [0.06, 0.06, BLOCK]);
      const islands = variant === 2 ? [[-1, -18], [1, -44]] : [[1, -14], [-1, -40]];
      for (const [s, z] of islands) {
        const x = s * U.rand(15, 22);
        M.P(g, M.G.cyl(), M.basic(0x7ae8f0), [x, -0.55, z], [12, 0.05, 12]);
        M.P(g, M.G.sphere(), M.lam(0xf4dca0), [x, -0.6, z], [9, 1.4, 9]);
        M.place(g, M.palm, [x - s * 3, 0.4, z + 2], U.rand(0, 6), U.rand(0.9, 1.2));
        M.place(g, M.palm, [x + s * 2, 0.4, z - 3], U.rand(0, 6), U.rand(0.8, 1.1));
        M.place(g, M.hut, [x + s * 1, 1.1, z + 0.5], s < 0 ? Math.PI / 2 : -Math.PI / 2, 0.9);
      }
      alongSides(6, 7, 20, (s, x, z) => M.place(g, M.palm, [x, -0.2, z], U.rand(0, 6), U.rand(0.7, 1)));
    } else if (w.scenery === 'ice') {
      // Grelbin: an ice road across a frozen moon
      ground(g, 0xe8f4ff);
      for (const s of [-1, 1]) M.P(g, M.G.rbox(1.4, 0.7, BLOCK, 0.3), M.lam(0xffffff), [s * 4.9, 0.1, -BLOCK / 2]);
      alongSides(8, 20, 11, (s, x, z) => M.place(g, M.crystal, [x, 0, z], U.rand(0, 6), U.rand(0.8, 2.2)));
      const domes = variant === 1 ? [[-1, -20]] : [[1, -32]];
      for (const [s, z] of domes) M.place(g, M.dome, [s * 20, 0, z], s < 0 ? Math.PI / 2 : -Math.PI / 2, 1);
      if (!JC.lowGfx) alongSides(38, 60, 24, (s, x, z) => M.P(g, M.G.cone(), M.lam(0xf0f6ff), [x, 12, z], [U.rand(10, 16), 26, U.rand(10, 16)]));
    } else {
      // Gaspar: a road of black rock between rivers of lava
      ground(g, 0x2a2024);
      curbs(0x3a2c30, 0xff6a1a);
      for (const s of [-1, 1]) {
        const lava = new THREE.Mesh(M.G.plane(), M.basic(0xff6a1a));
        lava.rotation.x = -Math.PI / 2; lava.scale.set(3.2, BLOCK, 1); lava.position.set(s * 7.2, -0.04, -BLOCK / 2);
        g.add(lava);
        M.P(g, M.G.box(), M.basic(0xffc040), [s * 7.2, -0.03, -BLOCK / 2], [1.0, 0.02, BLOCK]);
      }
      alongSides(10, 22, 10, (s, x, z) => M.place(g, M.spire, [x, 0, z], U.rand(0, 6), U.rand(0.8, 2)));
      alongSides(5.5, 5.8, 14, (s, x, z) => M.rocks(g, [x, 0, z], U.rand(0.4, 0.8), 0x3a2c30));
      if (variant !== 2) M.place(g, M.volcano, [(variant ? 1 : -1) * U.rand(42, 55), 0, -30], 0, U.rand(0.9, 1.3));
    }
    M.mergeStatic(g);
    return g;
  }

  function resetCar(c, playerZ, first) {
    const toward = Math.random() < 0.5;
    c.speed = (toward ? 1 : -1) * U.rand(12, 30);
    c.mesh.position.set(U.pick([-1, 1]) * U.rand(9, 40), U.rand(14, 38), playerZ - (first ? U.rand(20, 200) : toward ? 220 : -10));
    c.mesh.rotation.y = toward ? Math.PI : 0;
  }

  // ---------------- starting a new run ----------------
  function clearAll() {
    for (const o of obstacles) scene.remove(o.mesh);
    for (const b of bolts) scene.remove(b.mesh);
    for (const p of powerUps) scene.remove(p.mesh);
    obstacles.length = 0; bolts.length = 0; powerUps.length = 0; hints.length = 0;
  }
  function reset(withTutorial) {
    clearAll();
    genD = 35; lastPowerD = 0; lastPiece = null;
    tutorialLeft = withTutorial ? JC.TUTORIAL.slice() : [];
    blocks.forEach((b, i) => useBlock(b, i - 1));
    gateAt = -1;
    applyPlanet(0);
    for (const p of particles) { p.life = 0; p.s.visible = false; }
  }

  // ---------------- building the road ahead ----------------
  function levelAt(d) { return U.clamp(1 + Math.floor(d / 400), 1, 5); }

  function choosePiece(d) {
    const lvl = levelAt(d);
    const list = JC.PIECES.filter((p) => p.level <= lvl && p !== lastPiece);
    let total = 0;
    const weights = list.map((p) => { const w = p.level >= lvl - 1 ? 3 : 1; total += w; return w; });
    let r = Math.random() * total;
    for (let i = 0; i < list.length; i++) { r -= weights[i]; if (r <= 0) return list[i]; }
    return list[0];
  }

  function generate(playerD) {
    while (genD < playerD + AHEAD) {
      let piece;
      if (tutorialLeft.length) {
        piece = tutorialLeft.shift();
        hints.push({ d: genD - 38, text: piece.hint });
      } else piece = choosePiece(genD);
      lastPiece = piece;
      placePiece(piece.rows, genD);
      genD += piece.rows.length * ROW;
      // an empty gap between pieces, sometimes with a surprise power-up
      // the faster you run, the bigger the gaps, so you always have time to move
      const gap = Math.max([0, 12, 10, 9, 8, 7][levelAt(genD)], runSpeed * 0.6) + (tutorialLeft.length || piece.hint ? 18 : 0);
      if (genD - lastPowerD > JC.SETTINGS.powerUpEvery && !piece.hint) {
        addPowerUp(randomPower(), U.randInt(-1, 1), genD + gap / 2, 1.2);
        lastPowerD = genD;
      }
      genD += gap;
    }
  }

  function randomPower() { return U.pick(['shield', 'magnet', 'jet', 'magnet', 'shield']); }

  // turn the letters of a piece into 3D things
  function placePiece(rows, startD) {
    const n = rows.length;
    const cell = (r, c) => (rows[n - 1 - r] || '...')[c] || '.'; // r = 0 is the bottom row (the one you meet first)
    for (let c = 0; c < 3; c++) {
      const lane = c - 1;
      for (let r = 0; r < n; r++) {
        const ch = cell(r, c);
        const dNear = startD + r * ROW, dMid = dNear + ROW / 2;
        if (ch === 'o') addBolt(laneX(lane), 1.0, -dMid);
        else if (ch === 'B') addObstacle('barrier', lane, dMid - 0.15, 0.3, 1.0, M.barrier());
        else if (ch === 'L') addObstacle('laser', lane, dMid - 0.15, 0.3, 2.7, M.laserGate());
        else if (ch === 'H') addObstacle('hole', lane, dNear + 0.1, 2.8, 0, M.hole());
        else if (ch === 'S') addPowerUp('shield', lane, dMid, 1.2);
        else if (ch === 'G') addPowerUp('magnet', lane, dMid, 1.2);
        else if (ch === 'J') addPowerUp('jet', lane, dMid, 1.2);
        else if (ch === '?') addPowerUp(randomPower(), lane, dMid, 1.2);
        else if (ch === 'T' || ch === 't' || ch === 'R' || ch === 'M') {
          // join rows with the same letter into one long train or ramp
          const isTrain = ch === 'T' || ch === 't';
          let r2 = r;
          while (r2 + 1 < n) {
            const nx = cell(r2 + 1, c);
            if (isTrain ? (nx === 'T' || nx === 't') : nx === ch) r2++; else break;
          }
          const len = (r2 - r + 1) * ROW;
          if (isTrain) {
            addObstacle('train', lane, dNear, len - 0.3, TRAIN_TOP, M.train(len - 0.3, false, JC.WORLDS[planetAt(dNear)].trains));
            for (let k = r; k <= r2; k++) if (cell(k, c) === 't') addBolt(laneX(lane), TRAIN_TOP + 1.0, -(startD + k * ROW + ROW / 2));
          } else if (ch === 'R') {
            addObstacle('ramp', lane, dNear, len, TRAIN_TOP, M.ramp(len));
          } else {
            const o = addObstacle('train', lane, dNear, len - 0.3, TRAIN_TOP, M.train(len - 0.3, true));
            o.moving = true;
          }
          r = r2;
        }
      }
    }
  }

  // "d0" is where the front of the thing is, "len" how long it is
  function addObstacle(type, lane, d0, len, top, mesh) {
    const o = { type, lane, x: laneX(lane), z0: -d0, len, top, mesh, moving: false, started: false, hit: false };
    mesh.position.set(o.x, 0, o.z0);
    scene.add(mesh);
    obstacles.push(o);
    return o;
  }
  function addBolt(x, y, z) {
    const m = M.bolt();
    m.position.set(x, y, z);
    m.rotation.y = z * 0.3;
    scene.add(m);
    const b = { mesh: m, x, y, z, taken: false, pulled: false };
    bolts.push(b);
    return b;
  }
  function addPowerUp(kind, lane, d, y) {
    const m = M.powerUp(kind);
    m.position.set(laneX(lane), y, -d);
    scene.add(m);
    powerUps.push({ mesh: m, kind, taken: false, y });
  }

  // a line of bolts high in the sky for the jet boost
  function addSkyBolts(fromD, toD, y) {
    let lane = U.randInt(-1, 1);
    for (let d = fromD; d < toD; d += 3) {
      if (Math.random() < 0.08) lane = U.clamp(lane + U.pick([-1, 1]), -1, 1);
      addBolt(laneX(lane), y, -d);
    }
  }

  // take away everything near a place (used when the jet boost lands, so you don't land on something)
  function clearNear(fromD, toD) {
    for (const o of obstacles) {
      const d0 = -o.z0;
      if (d0 > fromD && d0 < toD && !o.moving) { o.hit = true; o.mesh.visible = false; }
    }
  }

  // ---------------- every frame ----------------
  function update(dt, playerD, t, onTrainStart, speed) {
    const pz = -playerD;
    if (speed) runSpeed = speed;
    generate(playerD);

    // throw away things that are far behind you
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      o.z0Prev = o.z0;
      if (o.z0 - o.len > pz + 25) { scene.remove(o.mesh); obstacles.splice(i, 1); continue; }
      if (o.moving) {
        if (!o.started && pz - o.z0 < 60) { o.started = true; if (onTrainStart) onTrainStart(o); }
        if (o.started) { o.z0 += JC.SETTINGS.movingTrainSpeed * dt; o.mesh.position.z = o.z0; }
        const w = o.mesh.userData.warn;
        if (w) w.material.opacity = o.started ? (Math.sin(t * 18) > 0 ? 1 : 0.15) : 0.4;
      }
      if (o.type === 'barrier') { const on = Math.sin(t * 6 + o.x) > 0; for (const l of o.mesh.userData.blink) l.visible = on; }
      if (o.type === 'laser' && !o.hit) o.mesh.scale.z = 0.7 + Math.random() * 0.6;
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i];
      if (b.taken || b.z > pz + 12) { scene.remove(b.mesh); bolts.splice(i, 1); continue; }
      b.mesh.rotation.y += dt * 3.5;
    }
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const p = powerUps[i];
      if (p.taken || p.mesh.position.z > pz + 12) { scene.remove(p.mesh); powerUps.splice(i, 1); continue; }
      p.mesh.position.y = p.y + Math.sin(t * 3 + i) * 0.15;
      p.mesh.userData.inner.rotation.y += dt * 2;
    }

    // move city blocks from behind you to the front
    for (const b of blocks) {
      if ((b.index + 1) * BLOCK < playerD - 20) useBlock(b, b.index + NBLOCKS);
    }
    // the warp gate always waits at the next planet
    const next = (Math.floor(Math.max(0, playerD) / PL()) + 1) * PL();
    if (next !== gateAt) { gateAt = next; gate.g.position.z = -next; gate.setPlanet(JC.WORLDS[planetAt(next)]); }
    gate.spin(t);
    const pi = planetAt(playerD);
    if (pi !== planetIdx) { applyPlanet(pi); if (onPlanet) onPlanet(JC.WORLDS[pi]); }
    skyline.position.set(0, 50, pz - 260);
    moon.position.set(35, 62, pz - 250);
    sun.position.set(-6, 14, pz + 8); sun.target.position.set(0, 0, pz);
    for (const c of cars) {
      c.mesh.position.z += c.speed * dt;
      const rel = c.mesh.position.z - pz;
      if (rel > 40 || rel < -260) resetCar(c, pz, false);
    }
    updateParticles(dt);
  }

  // ---------------- sparkles and explosions ----------------
  function burst(x, y, z, color, count = 10, speed = 4, size = 0.6, life = 0.6) {
    for (let i = 0; i < count; i++) {
      const p = particles.find((q) => q.life <= 0);
      if (!p) return;
      p.life = p.max = life * U.rand(0.6, 1.2);
      p.s.position.set(x, y, z);
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2;
      p.vx = Math.cos(a) * Math.cos(e) * speed; p.vy = Math.sin(e) * speed + speed * 0.3; p.vz = Math.sin(a) * Math.cos(e) * speed;
      p.size = size * U.rand(0.6, 1.3);
      p.s.material.color.set(color);
      p.s.visible = true;
    }
  }
  function updateParticles(dt) {
    for (const p of particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) { p.s.visible = false; continue; }
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      p.vy -= 6 * dt;
      const k = p.life / p.max;
      p.s.scale.setScalar(p.size * (0.4 + k * 0.6));
      p.s.material.opacity = k;
    }
  }

  return {
    init, reset, update, burst, addSkyBolts, clearNear, levelAt, planetAt, obstacles, bolts, powerUps, hints, LANE, TRAIN_TOP,
    set onPlanet(f) { onPlanet = f; }, get planet() { return JC.WORLDS[planetIdx]; },
  };
})();
