// ============================================================
//  SIGMA RUN — THE CITY COURSE
//  The city builds itself in front of you, forever!
//  It's made of ROOFS, and LINKS between them:
//    gap      - jump across
//    climb    - the next roof is higher: jump and grab the edge
//    drop     - the next roof is way lower: fall and roll
//    wallrun  - a giant billboard: run along it across the gap
//    zigzag   - two walls: wall run, jump to the other wall, wall run again
//    zipline  - slide down a cable to a lower roof
//    pad      - a launch pad throws you across a huge gap
//    crane    - balance on a narrow steel beam
//  Change the numbers in WEIGHTS to get more of what you like!
// ============================================================
window.SR = window.SR || {};

SR.Level = (function () {
  const U = SR.U;
  let scene, M;
  const segs = [];
  const cur = { z: 0, x: 0, y: 52 };
  let lastLink = '', count = 0, script = [], tutorial = true;

  // how often each kind of link shows up (bigger = more often)
  const WEIGHTS = { gap: 3, climb: 1.2, drop: 1, wallrun: 1.7, zigzag: 1, zipline: 1.1, pad: 0.9, crane: 0.9 };

  // ------------------------------------------------------------
  function newSeg(kind) {
    const s = {
      kind, link: '', zStart: cur.z, zEnd: cur.z, boxes: [], coins: [], pickups: [], triggers: [], spawns: [], respawns: [], hints: [],
      group: new THREE.Group(), blink: [], agentsSpawned: false, id: count++,
    };
    return s;
  }
  function solid(seg, x0, y0, z0, x1, y1, z1, o = {}) {
    const b = {
      x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0: Math.min(z0, z1), z1: Math.max(z0, z1),
      wall: o.wall !== false, surface: o.surface || 'roof', kind: o.kind || 'solid', seg, mesh: o.mesh || null, roof: !!o.roof, noVault: !!o.noVault,
    };
    seg.boxes.push(b);
    return b;
  }
  const facadeFor = (style) => { const list = M.facades[style || U.pick(Object.keys(M.facades))]; return U.pick(list); };

  // a whole building, from the street (y = 0) up to its roof
  function building(B, seg, x0, x1, z0, z1, top, o = {}) {
    const fac = o.facade || facadeFor(o.style);
    const roof = o.roofMat || U.pick(M.roofs);
    B.box(x0, -2, z0, x1, top, z1, { side: fac, top: roof, bottom: null, topTile: 8 }, 16, 16);
    // the concrete edge around the roof
    const c = 0.15, h0 = top - 0.4, h1 = top + 0.06;
    B.box(x0 - c, h0, z0 - c, x0 + 0.35, h1, z1 + c, { side: M.coping, bottom: M.coping }, 2);
    B.box(x1 - 0.35, h0, z0 - c, x1 + c, h1, z1 + c, { side: M.coping, bottom: M.coping }, 2);
    B.box(x0 + 0.35, h0, z1 - 0.35, x1 - 0.35, h1, z1 + c, { side: M.coping, bottom: M.coping }, 2);
    B.box(x0 + 0.35, h0, z0 - c, x1 - 0.35, h1, z0 + 0.35, { side: M.coping, bottom: M.coping }, 2);
    solid(seg, x0, -50, z0, x1, top, z1, { roof: true });
    // low walls along the sides so you don't fall off by accident
    if (o.parapets) {
      const ph = 0.95, t = 0.4;
      for (const [a, b] of [[x0, x0 + t], [x1 - t, x1]]) {
        B.box(a, top, z0, b, top + ph, z1, { side: M.coping }, 2);
        solid(seg, a, top, z0, b, top + ph, z1, { wall: false, noVault: true });
      }
    }
    // glowing signs on the side facing you
    if (o.signs && top > 20 && U.chance(0.55)) {
      const keys = ['sigma', 'rizz', 'open', 'hotel', 'aura', 'ramen'];
      const mat = M.neon[U.pick(keys)];
      const w = U.rand(5, Math.min(10, x1 - x0 - 1)), h = w / 4;
      const sx = U.rand(x0 + w / 2 + 0.5, x1 - w / 2 - 0.5), sy = top - U.rand(3, 10);
      const g = new THREE.PlaneGeometry(w, h);
      B.geo(mat, g, new THREE.Matrix4().makeTranslation(sx, sy, z1 + 0.08));
    }
    if (o.ads && top > 25 && U.chance(0.45)) {
      // a giant ad on the side of the building
      const side = U.chance(0.5) ? -1 : 1, len = Math.min(z1 - z0 - 2, 22);
      if (len > 8) {
        const h = len / 4, zc = (z0 + z1) / 2, yc = top - U.rand(4, 12) - h / 2;
        const g = new THREE.PlaneGeometry(len, h);
        const m = new THREE.Matrix4().makeRotationY(side * Math.PI / 2);
        m.setPosition(side > 0 ? x1 + 0.08 : x0 - 0.08, yc, zc);
        B.geo(U.pick(M.adsTall), g, m);
      }
    }
  }

  // --------------- things on the roofs ---------------
  function acUnit(B, seg, x, z, top, rot = 0) {
    const w = rot ? 1.6 : 2.2, d = rot ? 2.2 : 1.6, h = 1.15;
    B.box(x - w / 2, top, z - d / 2, x + w / 2, top + h, z + d / 2, { side: M.metal, top: M.fan }, 1.6);
    solid(seg, x - w / 2, top, z - d / 2, x + w / 2, top + h, z + d / 2, { surface: 'metal', wall: false });
    return top + h;
  }
  function lowWall(B, seg, x0, x1, z, top) {
    B.box(x0, top, z - 0.3, x1, top + 1.0, z + 0.3, { side: M.concrete }, 2);
    solid(seg, x0, top, z - 0.3, x1, top + 1.0, z + 0.3, { wall: false });
  }
  function pipes(B, seg, x0, x1, z, top) {
    const g = new THREE.CylinderGeometry(0.16, 0.16, x1 - x0, 10);
    for (const dz of [-0.2, 0.2]) {
      const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2); m.setPosition((x0 + x1) / 2, top + 0.3, z + dz);
      B.geo(M.pipe, g, m);
    }
    for (let x = x0 + 1; x < x1; x += 3) B.box(x - 0.1, top, z - 0.4, x + 0.1, top + 0.22, z + 0.4, { side: M.darkMetal }, 1);
    solid(seg, x0, top, z - 0.45, x1, top + 0.46, z + 0.45, { surface: 'metal', wall: false });
  }
  // a big air duct hanging across the roof: slide under it (or climb on top)
  function duct(B, seg, x0, x1, z, top) {
    const y0 = top + 1.25, y1 = top + 2.05;
    B.box(x0, y0, z - 0.6, x1, y1, z + 0.6, { side: M.steel, bottom: M.steel }, 2);
    for (const x of [x0 + 0.2, x1 - 0.2]) {
      B.box(x - 0.15, top, z - 0.15, x + 0.15, y0, z + 0.15, { side: M.darkMetal }, 1);
      solid(seg, x - 0.15, top, z - 0.15, x + 0.15, y0, z + 0.15, { wall: false });
    }
    solid(seg, x0, y0, z - 0.6, x1, y1, z + 0.6, { surface: 'metal', wall: false });
    // yellow-black warning stripes so you know to slide
    B.box(x0 + 0.3, y0 - 0.02, z + 0.6, x1 - 0.3, y0 + 0.3, z + 0.62, { side: null, back: M.hazard, front: null, top: null }, 0.6);
    B.geo(M.neon.slide, new THREE.PlaneGeometry(2, 0.5), new THREE.Matrix4().makeTranslation((x0 + x1) / 2, y1 + 0.4, z + 0.62));
  }
  // a billboard on legs across the whole roof: slide under the bar
  function signBar(B, seg, x0, x1, z, top) {
    const y0 = top + 1.3, y1 = top + 5.3;
    for (const x of [x0 + 0.3, x1 - 0.3]) {
      B.box(x - 0.2, top, z - 0.2, x + 0.2, y1, z + 0.2, { side: M.darkMetal }, 1);
      solid(seg, x - 0.2, top, z - 0.2, x + 0.2, y1, z + 0.2, { wall: false });
    }
    B.box(x0, y0, z - 0.15, x1, y1, z + 0.15, { side: M.darkMetal }, 2);
    const ad = U.randInt(0, M.adsTall.length - 1);
    const g = new THREE.PlaneGeometry(x1 - x0 - 0.2, y1 - y0 - 0.4);
    B.geo(M.adsTall[ad], g, new THREE.Matrix4().makeTranslation((x0 + x1) / 2, (y0 + y1) / 2 + 0.1, z + 0.17));
    const g2 = g.clone(); const m2 = new THREE.Matrix4().makeRotationY(Math.PI); m2.setPosition((x0 + x1) / 2, (y0 + y1) / 2 + 0.1, z - 0.17);
    B.geo(M.adsTall[(ad + 3) % M.adsTall.length], g2, m2);
    B.box(x0 + 0.3, y0 - 0.25, z - 0.18, x1 - 0.3, y0, z + 0.18, { side: M.hazard }, 0.6);
    solid(seg, x0, y0 - 0.25, z - 0.2, x1, y1, z + 0.2, { wall: false });
  }
  // glass you can SMASH through
  function glassWall(seg, x0, x1, z, top) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 2.8, 0.08), M.glass);
    mesh.position.set((x0 + x1) / 2, top + 1.4, z);
    seg.group.add(mesh);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.2, 0.15, 0.15), M.darkMetal);
    frame.position.set((x0 + x1) / 2, top + 2.85, z); frame.castShadow = true;
    seg.group.add(frame);
    for (const x of [x0, x1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.9, 0.15), M.darkMetal); p.position.set(x, top + 1.45, z); p.castShadow = true; seg.group.add(p);
    }
    solid(seg, x0, top, z - 0.1, x1, top + 2.8, z + 0.1, { kind: 'glass', wall: false, mesh });
  }
  function waterTower(B, seg, x, z, top) {
    const legH = 3.6, r = 1.9;
    for (const [dx, dz] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) {
      B.box(x + dx - 0.12, top, z + dz - 0.12, x + dx + 0.12, top + legH, z + dz + 0.12, { side: M.darkMetal }, 1);
      solid(seg, x + dx - 0.12, top, z + dz - 0.12, x + dx + 0.12, top + legH, z + dz + 0.12, { wall: false });
    }
    B.geo(M.wood, new THREE.CylinderGeometry(r, r, 3.6, 18), new THREE.Matrix4().makeTranslation(x, top + legH + 1.8, z));
    B.geo(M.darkMetal, new THREE.ConeGeometry(r + 0.15, 1.4, 18), new THREE.Matrix4().makeTranslation(x, top + legH + 4.3, z));
    solid(seg, x - r, top + legH, z - r, x + r, top + legH + 3.6, z + r, { wall: true });
  }
  function stairHouse(B, seg, x, z, top) {
    const w = 3.6, d = 4, h = 3;
    B.box(x - w / 2, top, z - d / 2, x + w / 2, top + h, z + d / 2, { side: M.concrete, back: M.door, top: M.coping }, 3.6, 3);
    solid(seg, x - w / 2, top, z - d / 2, x + w / 2, top + h, z + d / 2, { wall: true });
    return { x, z, top: top + h };
  }
  function antenna(B, seg, x, z, top) {
    const h = U.rand(5, 11);
    B.geo(M.steel, new THREE.CylinderGeometry(0.06, 0.12, h, 6), new THREE.Matrix4().makeTranslation(x, top + h / 2, z));
    B.geo(M.redLight, new THREE.SphereGeometry(0.18, 8, 6), new THREE.Matrix4().makeTranslation(x, top + h, z));
    for (let y = 1.5; y < h - 1; y += 2) B.geo(M.steel, new THREE.BoxGeometry(1.2, 0.05, 0.05), new THREE.Matrix4().makeTranslation(x, top + y, z));
  }
  function dish(B, seg, x, z, top) {
    B.geo(M.darkMetal, new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6), new THREE.Matrix4().makeTranslation(x, top + 0.6, z));
    const m = new THREE.Matrix4().makeRotationX(-Math.PI / 2 - 0.6); m.setPosition(x, top + 1.4, z);
    B.geo(M.white, new THREE.SphereGeometry(0.9, 14, 8, 0, Math.PI * 2, 0, 0.9), m);
  }
  function solar(B, seg, x0, x1, z, top) {
    const g = new THREE.BoxGeometry(x1 - x0, 0.06, 1.6);
    const m = new THREE.Matrix4().makeRotationX(0.45); m.setPosition((x0 + x1) / 2, top + 0.65, z);
    B.geo(M.solar, g, m);
    B.box(x0, top, z - 0.6, x1, top + 0.5, z + 0.6, { side: M.darkMetal }, 2);
    solid(seg, x0, top, z - 0.75, x1, top + 0.9, z + 0.75, { wall: false });
  }
  function vents(B, seg, x, z, top) {
    for (let i = 0; i < 3; i++) {
      const vx = x + (i - 1) * 0.8;
      B.geo(M.steel, new THREE.CylinderGeometry(0.22, 0.22, 1.1, 10), new THREE.Matrix4().makeTranslation(vx, top + 0.55, z));
      B.geo(M.steel, new THREE.ConeGeometry(0.35, 0.3, 10), new THREE.Matrix4().makeTranslation(vx, top + 1.25, z));
    }
    solid(seg, x - 1.2, top, z - 0.3, x + 1.2, top + 1.3, z + 0.3, { wall: false });
  }
  function planter(B, seg, x0, x1, z, top) {
    B.box(x0, top, z - 0.6, x1, top + 0.7, z + 0.6, { side: M.wood, top: M.dirt }, 1.5);
    for (let x = x0 + 0.6; x < x1 - 0.3; x += U.rand(0.7, 1.2)) {
      B.geo(M.plant, new THREE.IcosahedronGeometry(U.rand(0.35, 0.6), 0), new THREE.Matrix4().makeTranslation(x, top + 0.95, z + U.rand(-0.2, 0.2)));
    }
    solid(seg, x0, top, z - 0.6, x1, top + 0.75, z + 0.6, { wall: false });
  }
  function roofSign(B, seg, x, z, top, side) {
    // a tall glowing letter sign on the edge of the roof, facing the street
    const keys = ['sigma', 'rizz', 'hotel', 'aura', 'ramen', 'open'];
    const mat = M.neon[U.pick(keys)];
    const h = 2.2, w = 8.8;
    B.box(x - 0.1, top, z - 0.1, x + 0.1, top + 1.2, z + 0.1, { side: M.darkMetal }, 1);
    B.box(x - 0.1, top, z - w / 2, x + 0.1, top + 1.2 + h, z - w / 2 + 0.2, { side: M.darkMetal }, 1);
    B.box(x - 0.1, top, z + w / 2 - 0.2, x + 0.1, top + 1.2 + h, z + w / 2, { side: M.darkMetal }, 1);
    // it faces the roof, so you can read it while you run
    const m = new THREE.Matrix4().makeRotationY(-side * Math.PI / 2); m.setPosition(x - side * 0.15, top + 1.2 + h / 2, z);
    B.geo(mat, new THREE.PlaneGeometry(w, h), m);
  }

  // ------------------------------------------------------------
  //  COINS
  // ------------------------------------------------------------
  function coinLine(seg, x, z0, z1, yFn, gap = 2.2) {
    // from z0 toward z1 (z1 is further ahead)
    const n = Math.max(1, Math.floor(Math.abs(z1 - z0) / gap));
    for (let i = 0; i <= n; i++) {
      const z = U.lerp(z0, z1, i / n);
      SR.Pickups.addCoin(seg, x, yFn(z, i / n), z);
    }
  }

  // ------------------------------------------------------------
  //  ROOFS
  // ------------------------------------------------------------
  function buildRoof(B, seg, opts = {}) {
    const top = cur.y, cx = cur.x;
    const len = opts.len || U.randInt(26, 44);
    const W = opts.width || U.randInt(15, 22);
    const x0 = cx - W / 2, x1 = cx + W / 2;
    const zEnter = cur.z, zExit = cur.z - len;
    const style = opts.style || U.pick(['brick', 'concrete', 'glass', 'modern', 'office', 'tan']);
    building(B, seg, x0, x1, zExit, zEnter, top, { style, parapets: opts.parapets !== false, signs: true, ads: true });
    seg.respawns.push({ x: cx, y: top, z: zEnter - 2.5 });
    seg.roof = { x0, x1, z0: zExit, z1: zEnter, top, cx };
    const lane0 = Math.max(x0 + 1.2, cx - 3), lane1 = Math.min(x1 - 1.2, cx + 3);

    // obstacles in the running lane
    const obstacles = []; // {z, kind, top}
    if (!opts.empty) {
      let z = zEnter - (opts.firstGap || U.rand(7, 10));
      const list = opts.obstacles ? opts.obstacles.slice() : null;
      while (z > zExit + 7 + (opts.endClear || 0) * 0.6) {
        const kind = list ? (list.length ? list.shift() : 'none') : pickObstacle();
        const ow = U.rand(3.4, 5.2), ox = cx + U.rand(-1.2, 1.2);
        switch (kind) {
          case 'ac': obstacles.push({ z, kind: 'vault', top: acUnit(B, seg, ox, z, top), x0: ox - 1.1, x1: ox + 1.1 }); break;
          case 'acpair':
            acUnit(B, seg, cx - 1.6, z, top); acUnit(B, seg, cx + 1.6, z, top);
            obstacles.push({ z, kind: 'vault', top: top + 1.15, x0: cx - 2.7, x1: cx + 2.7 }); break;
          case 'wall': lowWall(B, seg, ox - ow / 2, ox + ow / 2, z, top); obstacles.push({ z, kind: 'vault', top: top + 1, x0: ox - ow / 2, x1: ox + ow / 2 }); break;
          case 'pipes': pipes(B, seg, x0 + 0.5, x1 - 0.5, z, top); obstacles.push({ z, kind: 'step', top: top + 0.5, x0, x1 }); break;
          case 'duct': duct(B, seg, x0 + 0.45, x1 - 0.45, z, top); obstacles.push({ z, kind: 'slide', x0, x1 }); break;
          case 'sign': signBar(B, seg, x0 + 0.45, x1 - 0.45, z, top); obstacles.push({ z, kind: 'slide', x0, x1 }); break;
          case 'glass': glassWall(seg, lane0 - 1, lane1 + 1, z, top); obstacles.push({ z, kind: 'glass', x0: lane0, x1: lane1 }); break;
          case 'planter': planter(B, seg, ox - ow / 2, ox + ow / 2, z, top); obstacles.push({ z, kind: 'vault', top: top + 0.75, x0: ox - ow / 2, x1: ox + ow / 2 }); break;
          default: obstacles.push({ z, kind: 'none' });
        }
        z -= opts.spacing || U.rand(8, 13);
      }
    }
    seg.obstacles = obstacles;

    // decorations on both sides of the lane
    for (const side of [-1, 1]) {
      const inner = side < 0 ? lane0 - 0.6 : lane1 + 0.6;
      const outer = side < 0 ? x0 + 0.6 : x1 - 0.6;
      const space = Math.abs(outer - inner);
      if (space < 2.5) continue;
      let z = zEnter - U.rand(3, 6);
      while (z > zExit + 3 + (opts.endClear || 0)) {
        const mid = (inner + outer) / 2;
        const r = Math.random();
        let used = 4;
        if (r < 0.14 && space > 4.4) { waterTower(B, seg, mid, z - 2, top); used = 6; }
        else if (r < 0.28 && space > 3.8) { stairHouse(B, seg, mid, z - 2, top); used = 6; }
        else if (r < 0.42) { acUnit(B, seg, mid, z - 1, top, 1); if (space > 4.5) acUnit(B, seg, mid + side * 1.8, z - 1, top, 1); used = 4; }
        else if (r < 0.5) { antenna(B, seg, mid, z, top); used = 3; }
        else if (r < 0.58) { dish(B, seg, mid, z, top); used = 3; }
        else if (r < 0.68 && space > 3) { solar(B, seg, Math.min(inner, outer) + 0.2, Math.max(inner, outer) - 0.2, z - 1, top); used = 3; }
        else if (r < 0.76) { vents(B, seg, mid, z, top); used = 3; }
        else if (r < 0.84 && space > 3) { planter(B, seg, Math.min(inner, outer) + 0.3, Math.max(inner, outer) - 0.3, z - 1, top); used = 3; }
        else if (r < 0.9) { roofSign(B, seg, outer - side * 0.3, z - 5, top, side); used = 10; }
        z -= used + U.rand(1, 4);
      }
    }

    // coins down the lane (they hop over things and duck under things)
    if (!opts.noCoins) {
      const lanesX = [cx - 1.6, cx, cx + 1.6];
      let z = zEnter - 3;
      while (z > zExit + 3) {
        const runLen = U.rand(10, 20), lx = U.pick(lanesX);
        const zEnd = Math.max(zExit + 2, z - runLen);
        coinLine(seg, lx, z, zEnd, (cz) => coinHeight(obstacles, lx, cz, top));
        z = zEnd - U.rand(6, 12);
      }
    }
    // power-up?
    if (opts.pickup || (opts.pickup !== false && U.chance(0.42))) {
      const free = obstacles.filter((o) => o.kind === 'none');
      const z = free.length ? U.pick(free).z : zEnter - len * U.rand(0.3, 0.7);
      SR.Pickups.addPowerup(seg, opts.pickup || null, cx + U.rand(-1.5, 1.5), top + 1.25, z);
    }
    // places where FBI agents can jump out
    for (const o of obstacles) {
      if (o.kind === 'none' || o.kind === 'vault') seg.spawns.push({ x: cx + U.rand(-2.5, 2.5), y: top, z: o.z - 2.5, roofTop: top, x0: x0 + 1, x1: x1 - 1 });
    }
    if (!seg.spawns.length) seg.spawns.push({ x: cx, y: top, z: (zEnter + zExit) / 2, roofTop: top, x0: x0 + 1, x1: x1 - 1 });
    cur.z = zExit;
    return seg.roof;
  }
  function pickObstacle() {
    const d = difficulty();
    const table = [['ac', 3], ['acpair', 1.4], ['wall', 1.5], ['pipes', 1.2], ['duct', 1.3 + d], ['sign', 0.8 + d], ['glass', 1.1], ['planter', 1], ['none', 2.2 - d]];
    let sum = 0; for (const [, w] of table) sum += w;
    let r = Math.random() * sum;
    for (const [k, w] of table) { r -= w; if (r <= 0) return k; }
    return 'none';
  }
  function coinHeight(obstacles, x, z, top) {
    let y = top + 1.0;
    for (const o of obstacles) {
      const dz = Math.abs(z - o.z);
      if (o.kind === 'vault' && dz < 2.4 && x > o.x0 - 0.5 && x < o.x1 + 0.5) y = Math.max(y, o.top + 0.9 * Math.cos(dz / 2.4 * Math.PI / 2) + 0.5);
      if (o.kind === 'step' && dz < 1.5) y = Math.max(y, top + 1.3);
      if (o.kind === 'slide' && dz < 1.6) y = top + 0.55;
    }
    return y;
  }
  function difficulty() { return U.clamp(-cur.z / 3500, 0, 1); }

  // ------------------------------------------------------------
  //  LINKS (how you get to the next roof)
  // ------------------------------------------------------------
  function chooseLink() {
    if (api.forceLink) return api.forceLink;   // for testing
    const d = difficulty();
    const w = Object.assign({}, WEIGHTS);
    if (d < 0.12) w.zigzag = 0;
    // low roofs: climb back up. high roofs: drop and zipline down
    if (cur.y < 30) { w.drop = 0; w.zipline = 0; w.climb *= 3.5; w.pad *= 1.5; }
    else if (cur.y < 42) { w.drop *= 0.4; w.zipline *= 0.5; w.climb *= 2.2; }
    else if (cur.y > 60) { w.climb *= 0.4; w.drop *= 1.6; w.zipline *= 1.8; }
    if (cur.y > 85) w.climb = 0;
    if (lastLink && lastLink !== 'gap') w[lastLink] *= 0.15;
    let sum = 0; for (const k in w) sum += w[k];
    let r = Math.random() * sum;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'gap';
  }

  // the arc of a jump, for placing coins
  function jumpArc(seg, x, zFrom, zTo, yFrom, yTo, peak) {
    const n = Math.max(3, Math.round(Math.abs(zTo - zFrom) / 1.8));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      SR.Pickups.addCoin(seg, x, U.lerp(yFrom, yTo, t) + Math.sin(t * Math.PI) * peak + 1.0, U.lerp(zFrom, zTo, t));
    }
  }

  // keep the roofs between 18 m and 95 m high
  const fitDy = (dy) => U.clamp(cur.y + dy, 18, 95) - cur.y;
  // roofs slowly drift back toward 50 m high, so there's always room for drops and ziplines
  const drift = () => U.clamp((50 - cur.y) * 0.05, -1.2, 1.5);

  function linkGap(B, seg, o = {}) {
    const d = difficulty();
    let G = o.gap || U.rand(3.5, 5) + d * 2.6;
    const dy = fitDy(o.dy !== undefined ? o.dy : U.rand(-2.6, 0.9) + drift());
    if (dy > 0.4) G = Math.min(G, 5);
    jumpArc(seg, cur.x, cur.z + 1, cur.z - G - 1, cur.y, cur.y + dy, 1.4);
    seg.hints.push({ z: cur.z + 6, text: o.hint });
    cur.z -= G; cur.y += dy;
    cur.x = U.clamp(cur.x + U.rand(-3, 3), -10, 10);
  }
  function linkClimb(B, seg) {
    const G = U.rand(2.4, 3.4), dy = fitDy(U.rand(1.6, 2.3));
    cur.z -= G; cur.y += dy;
    seg.hints.push({ z: cur.z + G + 6, text: 'JUMP and grab the edge!' });
    // a sign on the wall to show it's climbable
    B.geo(M.neon.jump, new THREE.PlaneGeometry(3.2, 0.8), new THREE.Matrix4().makeTranslation(cur.x, cur.y - 1.6, cur.z + 0.05));
  }
  function linkDrop(B, seg) {
    const G = U.rand(3, 5), dy = Math.min(-3, fitDy(-U.rand(5, 8.5)));
    jumpArc(seg, cur.x, cur.z + 1, cur.z - G - 2, cur.y, cur.y + dy * 0.5, 1.2);
    cur.z -= G; cur.y += dy;
  }
  // a giant billboard wall to run along
  function wallPanel(B, seg, side, zA, zB, yMid, ad) {
    // zA > zB, the wall goes from zA to zB, on "side" of the path
    const face = cur.x + side * 3.4, t = 0.5;
    const xa = side > 0 ? face : face - t, xb = side > 0 ? face + t : face;
    const y0 = yMid - 7, y1 = yMid + 6;
    B.box(xa, y0, zB, xb, y1, zA, { side: M.darkMetal, top: M.darkMetal, bottom: M.darkMetal }, 4);
    solid(seg, xa, y0, zB, xb, y1, zA, { wall: true, surface: 'metal' });
    // the ad picture on the side you run on
    const len = zA - zB, h = y1 - y0 - 1;
    const m = new THREE.Matrix4().makeRotationY(-side * Math.PI / 2);
    m.setPosition(face - side * 0.03, (y0 + y1) / 2, (zA + zB) / 2);
    B.geo(M.adsTall[ad % M.adsTall.length], new THREE.PlaneGeometry(len - 0.6, h), m);
    // glowing frame
    for (const y of [y0 + 0.2, y1 - 0.2]) {
      B.box(side > 0 ? face - 0.12 : face, y - 0.08, zB + 0.1, side > 0 ? face : face + 0.12, y + 0.08, zA - 0.1, { side: M.yellowGlow }, 4);
    }
    // legs down to the street
    for (const z of [zA - 0.6, zB + 0.6]) B.box(xa + 0.05, 0, z - 0.3, xb - 0.05, y0, z + 0.3, { side: M.darkMetal, top: null }, 4);
    // diagonal support beams behind
    for (let z = zB + 3; z < zA - 2; z += 4) {
      const g = new THREE.BoxGeometry(0.15, 9, 0.15), mm = new THREE.Matrix4().makeRotationZ(side * 0.5);
      mm.setPosition(face + side * 1.6, y0 + 3, z);
      B.geo(M.darkMetal, g, mm);
    }
  }
  function linkWallrun(B, seg) {
    const d = difficulty();
    const G = U.rand(11, 14) + d * 4, dy = fitDy(U.rand(-2.5, 0) + Math.max(0, drift()) * 0.5);
    const side = U.chance(0.5) ? -1 : 1;
    const zA = cur.z + 3.5, zB = cur.z - G - 5;
    wallPanel(B, seg, side, zA, zB, cur.y + 1, U.randInt(0, 7));
    // arrow sign on the roof edge
    B.geo(side > 0 ? M.neon.wallrun : M.neon.wallrunL, new THREE.PlaneGeometry(3.6, 0.9), new THREE.Matrix4().makeTranslation(cur.x, cur.y + 0.5, cur.z + 0.3));
    // coins along the wall
    const cxw = cur.x + side * 2.6;
    coinLine(seg, cxw, cur.z + 1, cur.z - G - 1, (z, t) => cur.y + 1.6 + Math.sin(t * Math.PI) * 0.8 + dy * t, 1.8);
    seg.hints.push({ z: cur.z + 9, text: 'Jump at the WALL to WALL RUN!' });
    seg.wallrunSide = side;
    cur.z -= G; cur.y += dy;
  }
  function linkZigzag(B, seg) {
    const G = U.rand(20, 23), dy = fitDy(U.rand(-2, 0));
    const side = U.chance(0.5) ? -1 : 1;
    const zA = cur.z + 4;
    wallPanel(B, seg, side, zA, cur.z - 12, cur.y + 1, U.randInt(0, 7));
    wallPanel(B, seg, -side, cur.z - 9, cur.z - G - 4, cur.y + 1, U.randInt(0, 7));
    B.geo(side > 0 ? M.neon.wallrun : M.neon.wallrunL, new THREE.PlaneGeometry(3.6, 0.9), new THREE.Matrix4().makeTranslation(cur.x, cur.y + 0.5, cur.z + 0.3));
    coinLine(seg, cur.x + side * 2.6, cur.z + 1, cur.z - 9, () => cur.y + 1.8, 1.8);
    coinLine(seg, cur.x - side * 2.6, cur.z - 13, cur.z - G + 1, (z, t) => cur.y + 1.6 + dy * t, 1.8);
    seg.hints.push({ z: cur.z + 9, text: 'WALL RUN, then JUMP to the other wall!' });
    seg.wallrunSide = side; seg.zigzag = { w1end: cur.z - 12, w2start: cur.z - 9 };
    cur.z -= G; cur.y += dy;
  }
  function linkZipline(B, seg) {
    const G = U.rand(32, 44), dy = Math.min(-4, fitDy(-U.rand(6, 10)));
    const sx = cur.x + 1, ex = cur.x + 1;
    const a = new THREE.Vector3(sx, cur.y + 2.75, cur.z + 2.5);
    const b = new THREE.Vector3(ex, cur.y + dy + 2.3, cur.z - G - 5);
    // poles
    B.geo(M.yellow, new THREE.CylinderGeometry(0.14, 0.18, 4, 8), new THREE.Matrix4().makeTranslation(sx, cur.y + 2, cur.z + 2.9));
    B.geo(M.yellow, new THREE.CylinderGeometry(0.14, 0.18, 3.6, 8), new THREE.Matrix4().makeTranslation(ex, cur.y + dy + 1.8, b.z - 0.4));
    solid(seg, sx - 0.18, cur.y, cur.z + 2.7, sx + 0.18, cur.y + 4, cur.z + 3.1, { wall: false });
    // the cable
    const len = a.distanceTo(b), mid = a.clone().add(b).multiplyScalar(0.5);
    const cg = new THREE.CylinderGeometry(0.035, 0.035, len, 6);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    B.geo(M.cable, cg, new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
    // glowing handle at the start
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 6, 14), M.cyanGlow);
    handle.position.copy(a).add(new THREE.Vector3(0, -0.25, 0));
    seg.group.add(handle);
    seg.triggers.push({ type: 'zip', a, b, handle });
    // coins down the cable
    for (let t = 0.08; t < 0.95; t += 0.06) {
      const p = a.clone().lerp(b, t);
      SR.Pickups.addCoin(seg, p.x, p.y - 1.1, p.z);
    }
    seg.hints.push({ z: cur.z + 9, text: 'ZIPLINE! Run under the cable to grab it' });
    cur.z -= G; cur.y += dy;
  }
  function linkPad(B, seg) {
    const G = U.rand(24, 31), dy = fitDy(U.rand(-4, 2) + drift() * 2);
    const px = cur.x, pz = cur.z + 3;
    // the launch pad
    B.box(px - 1.6, cur.y, pz - 1.6, px + 1.6, cur.y + 0.2, pz + 1.6, { side: M.hazard, top: M.darkMetal }, 0.8);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.3, 32), M.padGlow);
    ring.rotation.x = -Math.PI / 2; ring.position.set(px, cur.y + 0.22, pz);
    seg.group.add(ring);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 4), M.padGlow);
    arrow.position.set(px, cur.y + 1.2, pz);
    seg.group.add(arrow);
    solid(seg, px - 1.6, cur.y, pz - 1.6, px + 1.6, cur.y + 0.2, pz + 1.6, { wall: false, surface: 'metal' });
    const target = new THREE.Vector3(cur.x, cur.y + dy, cur.z - G - 7);
    seg.triggers.push({ type: 'pad', x0: px - 1.6, x1: px + 1.6, z0: pz - 1.6, z1: pz + 1.6, y: cur.y + 0.2, target, ring, arrow });
    // coins along the flight
    const T = flightTime(dy - 0.2, 15);
    const from = new THREE.Vector3(px, cur.y + 0.2, pz), vh = (from.z - target.z) / T;
    for (let t = 0.1; t < T; t += T / 14) {
      SR.Pickups.addCoin(seg, px, cur.y + 0.2 + 15 * t - 0.5 * 24 * t * t + 0.9, pz - vh * t);
    }
    seg.hints.push({ z: cur.z + 9, text: 'LAUNCH PAD! Step on it!' });
    cur.z -= G; cur.y += dy;
  }
  function flightTime(dy, vy) { const g = 24; return (vy + Math.sqrt(Math.max(0, vy * vy - 2 * g * dy))) / g; }
  function linkCrane(B, seg) {
    const G = U.rand(9, 14);
    const bx = cur.x, w = 1.5;
    const z0 = cur.z - G - 1.5, z1 = cur.z + 1.5;
    // a yellow steel beam
    B.box(bx - w / 2, cur.y - 0.5, z0, bx + w / 2, cur.y, z1, { side: M.yellow, top: M.yellow, bottom: M.yellow }, 2);
    solid(seg, bx - w / 2, cur.y - 0.5, z0, bx + w / 2, cur.y, z1, { surface: 'metal', wall: false });
    // lattice sides under it
    for (let z = z0 + 0.5; z < z1 - 0.5; z += 1.2) {
      for (const sx of [-1, 1]) {
        const g = new THREE.BoxGeometry(0.08, 1.3, 0.08), m = new THREE.Matrix4().makeRotationX(0.75);
        m.setPosition(bx + sx * (w / 2 - 0.04), cur.y - 0.95, z);
        B.geo(M.yellow, g, m);
      }
    }
    B.box(bx - w / 2, cur.y - 1.6, z0, bx - w / 2 + 0.12, cur.y - 1.45, z1, { side: M.yellow }, 2);
    B.box(bx + w / 2 - 0.12, cur.y - 1.6, z0, bx + w / 2, cur.y - 1.45, z1, { side: M.yellow }, 2);
    // a hook hanging from a cable nearby
    const hz = (z0 + z1) / 2;
    B.geo(M.cable, new THREE.CylinderGeometry(0.03, 0.03, 8, 4), new THREE.Matrix4().makeTranslation(bx + 3, cur.y + 2, hz));
    B.geo(M.red, new THREE.BoxGeometry(0.6, 0.8, 0.4), new THREE.Matrix4().makeTranslation(bx + 3, cur.y - 2.3, hz));
    coinLine(seg, bx, cur.z, cur.z - G, () => cur.y + 1.0, 1.6);
    seg.hints.push({ z: cur.z + 8, text: 'Balance on the beam!' });
    cur.z -= G;
  }

  // ------------------------------------------------------------
  //  CITY AROUND THE COURSE: buildings on both sides
  // ------------------------------------------------------------
  function sideBuildings(B, seg, zFrom, zTo, minX, maxX, pathTop) {
    for (const side of [-1, 1]) {
      let z = zFrom;
      while (z > zTo) {
        const len = U.rand(14, 34);
        const zz0 = Math.max(zTo, z - len), zz1 = z - U.rand(0, 1.5);
        const alley = U.rand(3, 8);
        const inner = side < 0 ? minX - alley : maxX + alley;
        const width = U.rand(12, 30);
        const xa = side < 0 ? inner - width : inner, xb = side < 0 ? inner : inner + width;
        const r = Math.random();
        const top = Math.max(10, pathTop + (r < 0.4 ? U.rand(6, 40) : r < 0.75 ? U.rand(-10, 4) : U.rand(-30, -12)));
        building(B, seg, xa, xb, zz0, zz1, top, { signs: true, ads: true });
        if (top > pathTop + 20 && U.chance(0.4)) {
          antenna(B, seg, (xa + xb) / 2, (zz0 + zz1) / 2, top);
        }
        z = zz0 - U.rand(2, 7); // streets between them
      }
    }
  }

  // ------------------------------------------------------------
  //  build one segment = a roof + the link after it
  // ------------------------------------------------------------
  function generate() {
    const B = new SR.Builder();
    const step = script.length ? script.shift() : null;
    const seg = newSeg('roof');
    seg.zStart = cur.z;
    const link = step ? step.link : chooseLink();
    const ropts = Object.assign({}, step ? step.roof : {});
    if (link === 'wallrun' || link === 'zigzag' || link === 'zipline' || link === 'pad') ropts.endClear = 7;
    const roof = buildRoof(B, seg, ropts);
    if (step && step.roofHint) seg.hints.push({ z: roof.z1 - 3, text: step.roofHint });
    if (step && step.roofHint2) seg.hints.push({ z: roof.z1 - 14, text: step.roofHint2 });
    let minX = roof.x0, maxX = roof.x1, pathTop = roof.top;
    seg.link = link; lastLink = link;
    const yBefore = cur.y;
    switch (link) {
      case 'gap': linkGap(B, seg, step ? step.linkOpts || {} : {}); break;
      case 'climb': linkClimb(B, seg); break;
      case 'drop': linkDrop(B, seg); break;
      case 'wallrun': linkWallrun(B, seg); break;
      case 'zigzag': linkZigzag(B, seg); break;
      case 'zipline': linkZipline(B, seg); break;
      case 'pad': linkPad(B, seg); break;
      case 'crane': linkCrane(B, seg); break;
    }
    if (!tutorial) for (const h of seg.hints) h.text = null;
    seg.zEnd = cur.z;
    // the next roof is narrower or wider: keep side buildings clear of both
    minX = Math.min(minX, cur.x - 12); maxX = Math.max(maxX, cur.x + 12);
    if (link === 'wallrun' || link === 'zigzag') { minX = Math.min(minX, cur.x - 6); maxX = Math.max(maxX, cur.x + 6); }
    sideBuildings(B, seg, seg.zStart, seg.zEnd, minX, maxX, Math.max(pathTop, yBefore));
    const g = B.build(SR.settings.gfx !== 'low');
    seg.group.add(g);
    scene.add(seg.group);
    SR.City.addStreet(seg, roof.z0, cur.z);
    segs.push(seg);
    return seg;
  }

  function tutorialScript() {
    return [
      { roof: { len: 64, width: 22, obstacles: ['none', 'none', 'none', 'ac', 'none'], firstGap: 10, pickup: false, style: 'modern' },
        roofHint: 'You run by yourself! Steer with the MOUSE (or A / D)', roofHint2: 'Small things in your way? Just run at them to VAULT over!',
        link: 'gap', linkOpts: { gap: 4.2, dy: -0.5, hint: 'Press SPACE to JUMP across!' } },
      { roof: { len: 40, obstacles: ['duct', 'none', 'glass'], firstGap: 9, pickup: 'speed' }, roofHint: 'Hold SHIFT (or C) to SLIDE under things!', link: 'wallrun' },
      { roof: { len: 34, obstacles: ['ac', 'none'], pickup: 'magnet' }, link: 'climb' },
      { roof: { len: 36, obstacles: ['none', 'sign'], pickup: false }, roofHint: 'Coins = buy cool stuff in the SHOP. Power-ups = super powers!', link: 'pad' },
      { roof: { len: 32, obstacles: ['pipes', 'none'], pickup: 'shield' }, link: 'zipline' },
      { roof: { len: 36 }, link: 'crane' },
    ];
  }

  function reset() {
    for (const s of segs) dispose(s);
    segs.length = 0;
    cur.z = 0; cur.x = 0; cur.y = 52; lastLink = ''; count = 0;
    tutorial = !SR.store.get('tutorialDone', false);
    script = tutorial ? tutorialScript() : [{ roof: { len: 44, width: 20, obstacles: ['none', 'none', 'ac', 'none'], firstGap: 10, pickup: 'speed' }, link: 'gap', linkOpts: { gap: 4.5, dy: -0.4 } }];
    for (let i = 0; i < 4; i++) generate();
  }

  function dispose(s) {
    scene.remove(s.group);
    s.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    SR.Pickups.removeSeg(s);
    SR.City.removeStreet(s);
  }

  function init(sc) { scene = sc; M = SR.Mats.M; }

  // keep building in front of you and clean up behind you
  function update(playerZ, time) {
    let n = 0;
    while (cur.z > playerZ - 420 && n < 2) { generate(); n++; }
    while (segs.length && segs[0].zEnd > playerZ + 70) dispose(segs.shift());
    // blinking red lights on antennas
    const k = Math.sin(time * 3) > 0.3 ? 6 : 0.4;
    M.redLight.color.setRGB(k, k * 0.05, k * 0.03);
    for (const s of segs) for (const t of s.triggers) {
      if (t.type === 'pad') { t.ring.rotation.z = time * 2; t.arrow.position.y = t.y + 1.1 + Math.sin(time * 5) * 0.25; t.arrow.rotation.y = time * 2; }
      if (t.type === 'zip' && t.handle) t.handle.rotation.y = time * 2;
    }
  }

  // ------------------------------------------------------------
  //  questions other parts of the game ask
  // ------------------------------------------------------------
  // all solid boxes near a position
  const near = [];
  function boxesNear(z, range = 30) {
    near.length = 0;
    for (const s of segs) {
      if (s.zEnd > z + range || s.zStart < z - range) continue;
      for (const b of s.boxes) if (b.z0 < z + range && b.z1 > z - range) near.push(b);
    }
    return near;
  }
  // the highest floor under a point (or -Infinity)
  function groundAt(x, z, maxY = 1e9) {
    let best = -Infinity;
    for (const s of segs) {
      if (s.zEnd > z + 5 || s.zStart < z - 5) continue;
      for (const b of s.boxes) {
        if (b.kind === 'glass') continue;
        if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && b.y1 <= maxY && b.y1 > best) best = b.y1;
      }
    }
    return best;
  }
  function segAt(z) { for (const s of segs) if (z <= s.zStart && z >= s.zEnd) return s; return null; }
  function removeBox(b) { const i = b.seg.boxes.indexOf(b); if (i >= 0) b.seg.boxes.splice(i, 1); }

  const api = {
    forceLink: null,
    init, reset, update, boxesNear, WEIGHTS, groundAt, segAt, removeBox,
    get segs() { return segs; },
    get tutorial() { return tutorial; },
    set tutorial(v) { tutorial = v; },
    get front() { return cur; },
  };
  return api;
})();
