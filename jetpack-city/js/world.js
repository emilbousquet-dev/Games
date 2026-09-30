// ============================================================
//  JETPACK CITY — THE WORLD
//  Builds the neon city and the endless road.
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
  let skyline, moon, sun, roadMat;

  const laneX = (lane) => lane * LANE;

  // ---------------- setting up ----------------
  function init(sc) {
    scene = sc;
    scene.background = JC.Tex.sky();
    scene.fog = new THREE.Fog(0x2a1048, 35, JC.lowGfx ? 140 : 175);
    scene.add(new THREE.HemisphereLight(0xb0a0ff, 0x402060, 1.5));
    sun = new THREE.DirectionalLight(0xffe0f0, 1.6);
    sun.position.set(-6, 14, 8);
    scene.add(sun); scene.add(sun.target);

    // far away skyline and the moon (they move along with you)
    skyline = new THREE.Mesh(new THREE.PlaneGeometry(700, 175), new THREE.MeshBasicMaterial({ map: JC.Tex.skyline(), transparent: true, fog: false, depthWrite: false }));
    skyline.renderOrder = -1;
    scene.add(skyline);
    moon = M.glowSprite(scene, 0xffd0f0, 60, [0, 0, 0], 0.9);
    moon.material = moon.material.clone(); moon.material.fog = false;
    const disc = new THREE.Mesh(M.G.sphere(), new THREE.MeshBasicMaterial({ color: 0xffe8f8, fog: false }));
    disc.scale.setScalar(9); moon.add(disc); disc.scale.set(9 / 60, 9 / 60, 9 / 60);

    for (let i = 0; i < NBLOCKS; i++) blocks.push(makeBlock(i));
    for (let i = 0; i < (JC.lowGfx ? 2 : 5); i++) { const c = M.flyingCar(); scene.add(c); cars.push({ mesh: c, speed: 0 }); resetCar(cars[i], 0, true); }
    for (let i = 0; i < 70; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: JC.Tex.glow(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.visible = false; scene.add(s);
      particles.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 1 });
    }
  }

  // ---------------- one block of city ----------------
  function makeBlock(index) {
    const g = new THREE.Group();
    const roadTex = JC.Tex.road();
    roadTex.repeat.set(1, BLOCK / 12);
    roadMat = roadMat || new THREE.MeshBasicMaterial({ map: roadTex });
    const road = new THREE.Mesh(M.G.plane(), roadMat);
    road.rotation.x = -Math.PI / 2; road.scale.set(8.4, BLOCK, 1); road.position.set(0, 0, -BLOCK / 2);
    g.add(road);
    const deck = M.lam(0x1a1628);
    M.P(g, M.G.box(), deck, [0, -0.48, -BLOCK / 2], [8.8, 0.9, BLOCK]);
    // low walls with glowing strips at the sides of the road
    for (const s of [-1, 1]) {
      M.P(g, M.G.box(), M.lam(0x2a2640), [s * 4.35, 0.25, -BLOCK / 2], [0.16, 0.5, BLOCK]);
      M.P(g, M.G.box(), M.glowy(0xff3aa8, 0.9), [s * 4.35, 0.52, -BLOCK / 2], [0.1, 0.05, BLOCK]);
      M.P(g, M.G.box(), M.glowy(0x3af0ff, 0.7), [s * 4.45, -0.6, -BLOCK / 2], [0.06, 0.06, BLOCK]);
    }
    // big pillars holding up the road
    for (const z of [-15, -45]) M.P(g, M.G.box(), deck, [0, -16, z], [3, 31, 3]);

    // buildings on both sides
    for (const s of [-1, 1]) {
      let z = 0;
      while (z > -BLOCK) {
        const d = U.rand(8, 16), w = U.rand(8, 15), h = U.rand(30, 85);
        const x = s * (8.5 + w / 2 + U.rand(0, 5));
        const b = M.building(w, h, d, U.randInt(0, 3));
        b.position.x = x; b.position.z = z - d / 2;
        g.add(b);
        const inner = x - s * w / 2;
        if (Math.random() < 0.35) {
          const sg = M.neonSign(U.pick(JC.TEXT.signs), U.pick(['#ff3aa8', '#3af0ff', '#ffd21a', '#9a5aff', '#6aff6a']));
          sg.position.set(inner - s * 0.06, U.rand(3, 16), z - d / 2);
          sg.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2;
          g.add(sg);
        }
        if (Math.random() < 0.3) M.glowSprite(g, 0xff2a3a, 3, [x, h - 20 + 1, z - d / 2], 0.9);
        z -= d + U.rand(1, 5);
      }
      // taller buildings further back
      if (!JC.lowGfx) {
        let z2 = 0;
        while (z2 > -BLOCK) {
          const d = U.rand(12, 22), w = U.rand(14, 24), h = U.rand(70, 130);
          const b = M.building(w, h, d, U.randInt(0, 3));
          b.position.set(s * (34 + w / 2 + U.rand(0, 10)), h / 2 - 20, z2 - d / 2);
          g.add(b);
          z2 -= d + U.rand(4, 12);
        }
      }
    }
    // a neon gate over the road on every other block
    if (index % 2 === 0) {
      const col = U.pick(['#ff3aa8', '#3af0ff', '#ffd21a']);
      const hex = U.hex(col);
      for (const s of [-1, 1]) {
        M.P(g, M.G.box(), M.lam(0x2a2640), [s * 5.4, 3.5, -2], [0.8, 9, 0.8]);
        M.P(g, M.G.box(), M.glowy(hex, 0.9), [s * 5.0, 3.5, -1.58], [0.08, 9, 0.08]);
      }
      M.P(g, M.G.box(), M.lam(0x2a2640), [0, 8.3, -2], [11.6, 1, 0.9]);
      M.P(g, M.G.box(), M.glowy(hex, 0.9), [0, 7.78, -1.54], [11, 0.08, 0.08]);
      const sg = M.neonSign(U.pick(JC.TEXT.signs), col);
      sg.position.set(0, 9.9, -1.9); sg.scale.set(5.4, 1.7, 1);
      g.add(sg);
    }
    M.mergeStatic(g);
    scene.add(g);
    return { g, index };
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
    blocks.forEach((b, i) => { b.index = i - 1; b.g.position.z = -b.index * BLOCK; });
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
            addObstacle('train', lane, dNear, len - 0.3, TRAIN_TOP, M.train(len - 0.3, false));
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
      if ((b.index + 1) * BLOCK < playerD - 20) { b.index += NBLOCKS; b.g.position.z = -b.index * BLOCK; }
    }
    skyline.position.set(0, 50, pz - 260);
    moon.position.set(-60, 95, pz - 250);
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

  return { init, reset, update, burst, addSkyBolts, clearNear, levelAt, obstacles, bolts, powerUps, hints, LANE, TRAIN_TOP };
})();
