// ============================================================
//  LAB 13 — THE WORLD
//  Turns the text map into a 3D lab: walls, floors, doors,
//  lights, props, blood, items...
// ============================================================
window.LAB = window.LAB || {};

LAB.World = (function () {
  const U = LAB.U, T = LAB.Tex, Mo = LAB.Models;
  const C = LAB.CELL, H = LAB.WALL_H;
  const WALLS = '#VW ';
  const PROP_SIZE = { R: [1.3, 1.3], p: [1.5, 1.5], t: [2.05, 0.95], w: [1.55, 0.8], r: [0.85, 0.95], k: [1.3, 1.3], o: [1.4, 1.4], s: [1.5, 0.55], m: [2.05, 0.85], G: [2.7, 1.9], u: [0.9, 2.1], c: [1.0, 0.8], v: [1.0, 0.85], y: [2.25, 0.8] };
  const AGAINST_WALL = 'wrsmcvy';
  const DOORS = 'ODBHP';

  const W = {};
  let rnd;

  // ---------- map questions ----------
  W.ch = (x, y) => (y < 0 || y >= W.h || x < 0 || x >= W.w) ? '#' : W.map[y][x];
  W.isWall = (x, y) => WALLS.includes(W.ch(x, y));
  W.doorAt = (x, y) => W.doorGrid[y * W.w + x] || null;
  W.zoneAt = (x, y) => LAB.ZONES.find((z) => x >= z.x1 && x <= z.x2 && y >= z.y1 && y <= z.y2) || null;

  // does a square stop sight? (walls + closed doors)
  W.blocksSight = (x, y) => {
    const c = W.ch(x, y);
    if (c === 'W') return false;
    if (WALLS.includes(c)) return true;
    const d = W.doorAt(x, y);
    return d ? d.open < 0.5 : false;
  };
  // can an alien walk through this square?
  W.passable = (x, y) => {
    const c = W.ch(x, y);
    if (WALLS.includes(c)) return false;
    if (W.propBoxes[y * W.w + x]) return false;
    const d = W.doorAt(x, y);
    if (d) return d.type === 'O' || d.open > 0.5;
    return true;
  };

  // clear line of sight between two points?
  W.los = (ax, az, bx, bz) => {
    const dist = Math.hypot(bx - ax, bz - az);
    const steps = Math.ceil(dist / 0.35);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (W.blocksSight(U.worldToCell(ax + (bx - ax) * t), U.worldToCell(az + (bz - az) * t))) return false;
    }
    return true;
  };

  // push a circle out of walls, doors and furniture
  W.collide = (pos, r) => {
    const cx = U.worldToCell(pos.x), cy = U.worldToCell(pos.z);
    for (let pass = 0; pass < 2; pass++) {
      for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
        let boxes = null;
        if (W.isWall(x, y)) boxes = [[x * C, y * C, x * C + C, y * C + C]];
        else {
          const d = W.doorAt(x, y);
          if (d && d.open < 0.85) {
            boxes = d.alongX ? [[x * C, y * C + C / 2 - 0.2, x * C + C, y * C + C / 2 + 0.2]] : [[x * C + C / 2 - 0.2, y * C, x * C + C / 2 + 0.2, y * C + C]];
          } else boxes = W.propBoxes[y * W.w + x];
        }
        if (!boxes) continue;
        for (const b of boxes) {
          const nx = U.clamp(pos.x, b[0], b[2]), nz = U.clamp(pos.z, b[1], b[3]);
          const dx = pos.x - nx, dz = pos.z - nz;
          const d2 = dx * dx + dz * dz;
          if (d2 < r * r) {
            if (d2 > 1e-8) {
              const d = Math.sqrt(d2), push = r - d;
              pos.x += (dx / d) * push; pos.z += (dz / d) * push;
            } else { // center is inside the box: push out the shortest way
              const opts = [[pos.x - b[0] + r, -1, 0], [b[2] - pos.x + r, 1, 0], [pos.z - b[1] + r, 0, -1], [b[3] - pos.z + r, 0, 1]].sort((a, c) => a[0] - c[0]);
              pos.x += opts[0][1] * opts[0][0]; pos.z += opts[0][2] * opts[0][0];
            }
          }
        }
      }
    }
  };

  // ---------- path finding: distance from every square to a target ----------
  W.flowField = (tx, ty) => {
    const f = new Int16Array(W.w * W.h).fill(-1);
    const q = new Int32Array(W.w * W.h);
    let head = 0, tail = 0;
    if (tx < 0 || ty < 0 || tx >= W.w || ty >= W.h) return f;
    f[ty * W.w + tx] = 0; q[tail++] = ty * W.w + tx;
    while (head < tail) {
      const i = q[head++], x = i % W.w, y = (i / W.w) | 0, v = f[i];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of nb) {
        const nx = x + dx, ny = y + dy, ni = ny * W.w + nx;
        if (nx < 0 || ny < 0 || nx >= W.w || ny >= W.h || f[ni] !== -1) continue;
        if (!W.passable(nx, ny)) continue;
        f[ni] = v + 1; q[tail++] = ni;
      }
    }
    return f;
  };
  // best next square to walk to (toward the target of a flow field)
  W.nextStep = (field, x, y) => {
    let best = null, bv = field[y * W.w + x];
    if (bv < 0) bv = 9999;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W.w || ny >= W.h) continue;
      const v = field[ny * W.w + nx];
      if (v < 0 || v >= bv) continue;
      if (dx && dy && (!W.passable(x + dx, y) || !W.passable(x, y + dy))) continue;
      bv = v; best = [nx, ny];
    }
    return best;
  };

  // direction to a neighbouring wall (for putting things against walls)
  function wallSide(x, y) {
    const opts = [[0, -1], [0, 1], [-1, 0], [1, 0]].filter(([dx, dy]) => W.isWall(x + dx, y + dy));
    return opts.length ? opts[Math.floor(rnd() * opts.length)] : null;
  }
  // rotation so the front (+z) of a model faces away from a wall
  function faceAway(dx, dy) {
    if (dy === -1) return 0; if (dy === 1) return Math.PI;
    if (dx === -1) return Math.PI / 2; return -Math.PI / 2;
  }

  // ---------- merging: glue static meshes together (much faster) ----------
  function mergeStatic(root) {
    root.updateMatrixWorld(true);
    const buckets = new Map();
    root.traverse((o) => {
      if (!o.isMesh) return;
      let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      const k = o.material.uuid;
      if (!buckets.has(k)) buckets.set(k, { mat: o.material, geos: [], cast: o.castShadow });
      buckets.get(k).geos.push(g);
    });
    const out = new THREE.Group();
    for (const { mat, geos } of buckets.values()) {
      const bg = U.mergeGeometries(geos);
      const m = new THREE.Mesh(bg, mat);
      m.castShadow = !mat.transparent;
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      out.add(m);
    }
    return out;
  }

  // ---------- decals (blood, goo, writing) ----------
  const decalMats = {};
  function decalMat(key, tex) {
    return decalMats[key] || (decalMats[key] = new THREE.MeshStandardMaterial({
      map: tex, transparent: true, depthWrite: false, roughness: 0.35, metalness: 0.1,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    }));
  }
  function floorDecal(parent, x, z, size, key, tex, rot) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), decalMat(key, tex));
    m.rotation.set(-Math.PI / 2, 0, rot === undefined ? rnd() * 6.28 : rot);
    m.position.set(x, 0.012 + rnd() * 0.004, z);
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  // put a decal flat against the wall on side (dx,dy) of cell (cx,cy)
  function wallDecal(parent, cx, cy, dx, dy, w, h, y, key, tex, along = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), decalMat(key, tex));
    const x = U.cellToWorld(cx) + dx * (C / 2 - 0.015), z = U.cellToWorld(cy) + dy * (C / 2 - 0.015);
    m.position.set(x + (dy ? along : 0), y, z + (dx ? along : 0));
    m.rotation.y = faceAway(dx, dy);
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // ---------- building the level ----------
  W.build = function (scene) {
    rnd = U.seeded(1313);
    const map = LAB.MAP.slice();
    W.w = Math.max(...map.map((r) => r.length));
    W.map = map.map((r) => r.padEnd(W.w, '#'));
    W.h = W.map.length;
    W.doorGrid = new Array(W.w * W.h).fill(null);
    W.propBoxes = new Array(W.w * W.h).fill(null);
    W.doors = []; W.items = []; W.lights = []; W.beacons = []; W.buttons = { B: [], H: [] };
    W.spawns = { C: [], S: [], Q: [] }; W.starts = []; W.scares = []; W.elevatorCells = [];
    W.anim = []; W.floorCells = [];
    const root = new THREE.Group();          // things that never move -> merged
    const dyn = new THREE.Group();            // things that move / blink
    scene.add(dyn);
    W.dyn = dyn;

    let noteI = 0, writeI = 0, scareI = 0, screenI = 0;
    const floorStyle = (x, y) => { const z = W.zoneAt(x, y); return z && z.style === 'tiles' ? 'tiles' : 'metal'; };

    // walls, floor, ceiling with instancing (one draw call each)
    const wallCells = { concrete: [], tiles: [], metal: [] };
    const floorCells = { tiles: [], metal: [] };
    const ceilCells = [];
    for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
      const c = W.ch(x, y);
      if (WALLS.includes(c)) {
        let style = null;
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          if (!W.isWall(x + dx, y + dy) && x + dx >= 0 && y + dy >= 0 && x + dx < W.w && y + dy < W.h) {
            const z = W.zoneAt(x + dx, y + dy); style = z ? z.style : 'concrete'; break;
          }
        }
        if (style && c !== 'W') wallCells[style].push([x, y]);
      } else {
        floorCells[floorStyle(x, y)].push([x, y]);
        ceilCells.push([x, y]);
        W.floorCells.push([x, y]);
      }
    }
    const wallTex = { concrete: T.wallConcrete(), tiles: T.wallTiles(), metal: T.wallMetal() };
    const dummy = new THREE.Object3D();
    for (const style in wallCells) {
      const list = wallCells[style];
      if (!list.length) continue;
      const mat = new THREE.MeshStandardMaterial({ map: wallTex[style], roughness: 0.85, metalness: style === 'metal' ? 0.4 : 0.05 });
      const im = new THREE.InstancedMesh(new THREE.BoxGeometry(C, H, C), mat, list.length);
      list.forEach(([x, y], i) => { dummy.position.set(U.cellToWorld(x), H / 2, U.cellToWorld(y)); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
      im.castShadow = true; im.receiveShadow = true;
      scene.add(im);
    }
    const floorTex = { tiles: T.floorTiles(), metal: T.floorMetal() };
    for (const style in floorCells) {
      const list = floorCells[style];
      if (!list.length) continue;
      const mat = new THREE.MeshStandardMaterial({ map: floorTex[style], roughness: style === 'tiles' ? 0.35 : 0.6, metalness: style === 'tiles' ? 0.1 : 0.5 });
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(C, C), mat, list.length);
      list.forEach(([x, y], i) => { dummy.position.set(U.cellToWorld(x), 0, U.cellToWorld(y)); dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
      im.receiveShadow = true;
      scene.add(im);
    }
    {
      const mat = new THREE.MeshStandardMaterial({ map: T.ceiling(), roughness: 0.9 });
      const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(C, C), mat, ceilCells.length);
      ceilCells.forEach(([x, y], i) => { dummy.position.set(U.cellToWorld(x), H, U.cellToWorld(y)); dummy.rotation.set(Math.PI / 2, 0, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
      im.receiveShadow = true;
      scene.add(im);
    }

    // every square, one by one
    for (let y = 0; y < W.h; y++) for (let x = 0; x < W.w; x++) {
      const c = W.ch(x, y);
      const wx = U.cellToWorld(x), wz = U.cellToWorld(y);

      if (c === '1' || c === '2') W.starts[+c - 1] = { x: wx, z: wz };

      // furniture
      if (PROP_SIZE[c]) {
        let model, rot = 0, off = [0, 0];
        const side = AGAINST_WALL.includes(c) ? wallSide(x, y) : null;
        if (side) {
          rot = faceAway(side[0], side[1]);
          const depth = PROP_SIZE[c][1];
          off = [side[0] * (C / 2 - depth / 2 - 0.1), side[1] * (C / 2 - depth / 2 - 0.1)];
        } else if (c === 't' || c === 'm' || c === 'u') rot = rnd() < 0.5 ? 0 : Math.PI / 2;
        else if (c === 'G') rot = 0;
        else rot = rnd() * Math.PI * 2;
        switch (c) {
          case 'R': model = Mo.cryoPod(rnd() < 0.45, rnd() < 0.6, rnd); rot = y < 3 ? 0 : Math.PI; break;
          case 'p': model = Mo.specimenTank(rnd() < 0.35, rnd); break;
          case 't': model = Mo.labTable(rnd); break;
          case 'w': model = Mo.desk(rnd, screenI++); break;
          case 'r': model = Mo.serverRack(rnd); break;
          case 'k': model = Mo.crates(rnd); break;
          case 'o': model = Mo.barrels(rnd); break;
          case 's': model = Mo.shelf(rnd); break;
          case 'm': model = Mo.morgueBed(rnd); break;
          case 'G': model = Mo.generator(); break;
          case 'u': model = Mo.surgeryTable(rnd); break;
          case 'c': model = Mo.cocoon(rnd); break;
          case 'v': model = Mo.vendingMachine(rnd); break;
          case 'y': model = Mo.monitorWall(rnd); break;
        }
        model.position.set(wx + off[0], 0, wz + off[1]);
        if (c === 'c' && side) model.position.set(wx + side[0] * (C / 2 - 0.02), 0, wz + side[1] * (C / 2 - 0.02)); // stuck on the wall
        model.rotation.y = rot;
        root.add(model);
        // collision box
        let [bw, bd] = PROP_SIZE[c];
        if (Math.abs(Math.sin(rot)) > 0.7) [bw, bd] = [bd, bw];
        if (c === 'R' || c === 'p' || c === 'k' || c === 'o') { bw = bd = Math.min(bw, bd); }
        const cxw = wx + off[0], czw = wz + off[1];
        W.propBoxes[y * W.w + x] = [[cxw - bw / 2, czw - bd / 2, cxw + bw / 2, czw + bd / 2]];
        if (c === 'G') {
          W.generator = { x: wx, z: wz, cx: x, cy: y, fuses: [], model };
          // the 3 fuse slots (hidden until inserted)
          for (let i = 0; i < 3; i++) {
            const f = Mo.item('F');
            f.userData.glow.visible = false;
            f.position.set(wx - 0.35 + i * 0.35, 0.9, wz + 0.93);
            f.rotation.x = Math.PI / 2;
            f.visible = false;
            dyn.add(f);
            W.generator.fuses.push(f);
          }
          const gl = new THREE.PointLight(0xff5020, 0, 6, 1.5);
          gl.position.set(wx, 1.5, wz + 1.5);
          dyn.add(gl);
          W.generator.light = gl;
        }
      }

      // dead bodies
      if (c === 'd') {
        const style = rnd() < 0.25 ? 'deadguard' : rnd() < 0.15 ? 'deadhazmat' : 'deadcoat';
        const body = Mo.corpse(style, rnd);
        body.position.set(wx + U.rand(-0.4, 0.4), 0, wz + U.rand(-0.4, 0.4));
        body.rotation.y = rnd() * 6.28;
        root.add(body);
        floorDecal(root, body.position.x, body.position.z, 2.6, 'blood0', T.blood(0));
        floorDecal(root, body.position.x + U.rand(-0.6, 0.6), body.position.z + U.rand(-0.6, 0.6), 1.6, 'blood1', T.blood(1));
        // drag marks leading away
        const a = rnd() * 6.28;
        const dm = floorDecal(root, body.position.x + Math.cos(a) * 1.6, body.position.z + Math.sin(a) * 1.6, 1, 'drag', T.drag(), 0);
        dm.scale.set(0.8, 3.2, 1);
        dm.rotation.z = -a + Math.PI / 2;
      }

      // glass windows
      if (c === 'W') {
        const m = Mo.windowPane(rnd);
        m.position.set(wx, 0, wz);
        if (!(W.isWall(x - 1, y) || W.isWall(x + 1, y))) m.rotation.y = Math.PI / 2;
        root.add(m);
      }
      // holes torn in the wall
      if (c === 'h') {
        const side = wallSide(x, y);
        if (side) {
          const m = Mo.wallHole(rnd);
          m.position.set(wx + side[0] * (C / 2), 0, wz + side[1] * (C / 2));
          m.rotation.y = faceAway(side[0], side[1]);
          root.add(m);
          floorDecal(root, wx, wz, 2.4, 'goo', T.goo());
        }
      }

      // alien flesh growths
      if (c === 'f') {
        const g = Mo.fleshGrowth(rnd);
        g.position.set(wx, 0, wz);
        root.add(g);
        floorDecal(root, wx, wz, 3, 'goo', T.goo());
      }

      // items
      if ('KFAMN'.includes(c)) {
        const m = Mo.item(c);
        m.position.set(wx, 1.0, wz);
        dyn.add(m);
        const it = { type: c, x: wx, z: wz, model: m, taken: false, phase: rnd() * 6 };
        if (c === 'N') it.note = LAB.NOTES[noteI++ % LAB.NOTES.length];
        W.items.push(it);
      }

      // lights
      if (c === 'L') {
        const broken = rnd() < 0.2;
        const lamp = Mo.ceilingLamp(broken);
        lamp.position.set(wx, 0, wz);
        if (W.isWall(x - 1, y) && W.isWall(x + 1, y)) lamp.rotation.y = Math.PI / 2;
        dyn.add(lamp);
        W.lights.push({
          x: wx, y: H - 0.35, z: wz, color: new THREE.Color(0xffe8c0), base: broken ? 0 : 1,
          mode: broken ? 'dead' : (rnd() < 0.45 ? 'flicker' : 'steady'), lamp, lampMat: lamp.userData.lampMat, level: 1, phase: rnd() * 100,
        });
      }
      if (c === 'E') {
        const b = Mo.beacon();
        const side = wallSide(x, y);
        if (side) b.position.set(wx + side[0] * (C / 2 - 0.2), H - 0.5, wz + side[1] * (C / 2 - 0.2));
        else b.position.set(wx, H - 0.1, wz), b.rotation.x = Math.PI;
        dyn.add(b);
        const L = { x: b.position.x, y: H - 0.6, z: b.position.z, color: new THREE.Color(0xff1a0a), base: 0.6, mode: 'emergency', beacon: b, level: 1, phase: rnd() * 10 };
        W.lights.push(L);
        W.beacons.push(L);
      }

      // doors
      if (DOORS.includes(c)) {
        const alongX = W.isWall(x - 1, y) && W.isWall(x + 1, y);
        const m = Mo.door(c);
        m.position.set(wx, 0, wz);
        if (!alongX) m.rotation.y = Math.PI / 2;
        dyn.add(m);
        const d = { type: c, cx: x, cy: y, x: wx, z: wz, alongX, model: m, open: 0, target: 0, unlocked: c === 'O', stayOpen: false, sfxT: 0 };
        W.doors.push(d);
        W.doorGrid[y * W.w + x] = d;
        // area name signs above the door, on both sides
        for (const s of [-1, 1]) {
          const nx = alongX ? x : x + s, ny = alongX ? y + s : y;
          const zOther = W.zoneAt(alongX ? x : x - s, alongX ? y - s : y);
          if (!zOther) continue;
          const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.35), Mo.signMat(zOther.name, '#20252a', '#d8d8c8'));
          sign.position.set(alongX ? wx : wx + s * 0.27, H - 0.25, alongX ? wz + s * 0.27 : wz);
          sign.rotation.y = alongX ? (s > 0 ? 0 : Math.PI) : (s > 0 ? Math.PI / 2 : -Math.PI / 2);
          root.add(sign);
          void nx; void ny;
        }
      }

      // two-person buttons
      if (c === '*' || c === '+') {
        const side = wallSide(x, y) || [0, -1];
        const btn = Mo.wallButton(c === '*' ? 0xffd020 : 0x20d0ff);
        btn.position.set(wx + side[0] * (C / 2 - 0.05), 0, wz + side[1] * (C / 2 - 0.05));
        btn.rotation.y = faceAway(side[0], side[1]);
        dyn.add(btn);
        W.buttons[c === '*' ? 'B' : 'H'].push({ x: wx + side[0] * 0.9, z: wz + side[1] * 0.9, model: btn, held: false });
      }

      if (c === 'C' || c === 'S' || c === 'Q') W.spawns[c].push({ x: wx, z: wz, cx: x, cy: y });
      if (c === 'J') W.scares.push({ cx: x, cy: y, x: wx, z: wz, type: LAB.SCARES[scareI++ % LAB.SCARES.length], done: false });
      if (c === 'X') W.elevatorCells.push([x, y]);

      // writing in blood
      if (c === '!') {
        const side = wallSide(x, y);
        if (side) {
          const text = LAB.WRITINGS[writeI++ % LAB.WRITINGS.length];
          wallDecal(root, x, y, side[0], side[1], 2.4, 1.2, 1.75, 'write' + text, T.writing(text));
          floorDecal(root, wx + side[0] * 1, wz + side[1] * 1, 1.4, 'blood2', T.blood(2));
        }
      }
    }

    // ---- random clutter (lockers, carts, papers...) ----
    // walkable squares that are not blocked by furniture
    const openCount = () => {
      const start = W.starts[0];
      const sx = U.worldToCell(start.x), sy = U.worldToCell(start.z);
      const seen = new Uint8Array(W.w * W.h);
      const q = [[sx, sy]]; seen[sy * W.w + sx] = 1; let n = 0;
      while (q.length) {
        const [x, y] = q.pop(); n++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, i = ny * W.w + nx;
          if (nx < 0 || ny < 0 || nx >= W.w || ny >= W.h || seen[i] || W.isWall(nx, ny) || W.propBoxes[i]) continue;
          seen[i] = 1; q.push([nx, ny]);
        }
      }
      return n;
    };
    let reachable = openCount();
    const nearSpecial = (x, y) => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((DOORS + '*+XKFAMNJ').includes(W.ch(x + dx, y + dy))) return true;
      return false;
    };
    for (const [x, y] of W.floorCells) {
      if (W.ch(x, y) !== '.') continue;
      const z = W.zoneAt(x, y);
      const corridor = !z || z.name.includes('CORRIDOR');
      if (nearSpecial(x, y) || (z && z.name === 'SURFACE LIFT')) continue;
      const wx = U.cellToWorld(x), wz = U.cellToWorld(y);
      const side = wallSide(x, y);
      // pillars in a grid inside big rooms, and themed furniture in the middle
      const bigRoom = z && !corridor && z.x2 - z.x1 >= 8 && z.y2 - z.y1 >= 5;
      const pillarSpot = bigRoom && !side && (x - z.x1) % 4 === 2 && (y - z.y1) % 4 === 2;
      if (pillarSpot || (!corridor && !side && z && rnd() < 0.12)) {
        let m, bw, bd;
        const theme = z.name;
        if (pillarSpot) { m = Mo.pillar(rnd); bw = bd = 0.8; }
        else if (theme === 'GENERATOR ROOM') { if (rnd() < 0.5) { m = Mo.transformer(rnd); bw = 1.45; bd = 1.05; } else { m = Mo.pipeCluster(rnd); bw = bd = 0.9; } }
        else if (theme === 'MAINTENANCE' || theme === 'STORAGE') { if (rnd() < 0.5) { m = Mo.pipeCluster(rnd); bw = bd = 0.9; } else { m = Mo.crates(rnd); bw = bd = 1.3; } }
        else if (theme === 'BREAK ROOM') { m = Mo.breakTable(rnd); bw = bd = 1.3; }
        else if (theme === 'MEDBAY / MORGUE') { m = Mo.morgueBed(rnd); bw = 2.05; bd = 0.85; }
        else if (theme === 'RESEARCH LAB') { m = Mo.labTable(rnd); bw = 2.05; bd = 0.95; }
        else if (theme === 'CONTAINMENT CELL 13') { m = Mo.cocoon(rnd); bw = 1.0; bd = 0.8; }
        else continue;
        const rot = pillarSpot || theme === 'BREAK ROOM' ? 0 : (rnd() < 0.5 ? 0 : Math.PI / 2);
        if (rot) [bw, bd] = [bd, bw];
        W.propBoxes[y * W.w + x] = [[wx - bw / 2, wz - bd / 2, wx + bw / 2, wz + bd / 2]];
        const n = openCount();
        if (n < reachable - 1) { W.propBoxes[y * W.w + x] = null; continue; }
        reachable = n;
        m.position.set(wx, 0, wz); m.rotation.y = rot;
        root.add(m);
        continue;
      }
      if (!corridor && side && rnd() < 0.22) {
        const isLocker = rnd() < 0.55;
        const [bw, bd] = isLocker ? [1.6, 0.55] : [1.2, 0.5];
        const rot = faceAway(side[0], side[1]);
        const off = [side[0] * (C / 2 - bd / 2 - 0.05), side[1] * (C / 2 - bd / 2 - 0.05)];
        const [ww, dd] = side[0] ? [bd, bw] : [bw, bd];
        W.propBoxes[y * W.w + x] = [[wx + off[0] - ww / 2, wz + off[1] - dd / 2, wx + off[0] + ww / 2, wz + off[1] + dd / 2]];
        const n = openCount();
        if (n < reachable - 1) { W.propBoxes[y * W.w + x] = null; continue; } // would block the way!
        reachable = n;
        const m = isLocker ? Mo.lockers(rnd) : Mo.cabinet(rnd);
        m.position.set(wx + off[0], 0, wz + off[1]);
        m.rotation.y = rot;
        root.add(m);
        continue;
      }
      const r = rnd();
      let m = null;
      const grim = z && ['MEDBAY / MORGUE', 'CONTAINMENT CELL 13'].includes(z.name);
      if (r < 0.12) m = Mo.papers(rnd);
      else if (r < 0.19) m = Mo.debris(rnd);
      else if (r < 0.23) m = Mo.bin(rnd);
      else if (r < 0.27 && !corridor) m = Mo.cart(rnd);
      else if (r < (grim ? 0.4 : 0.29)) { m = Mo.bodyBag(rnd); floorDecal(root, wx, wz, 1.6, 'blood1', T.blood(1)); }
      else if (r < 0.3 && corridor) m = Mo.wetSign();
      if (m) { m.position.set(wx + U.rand(-0.4, 0.4), 0, wz + U.rand(-0.4, 0.4)); m.rotation.y = rnd() * 6.28; root.add(m); }
      if (side && rnd() < 0.07) {
        const e = Mo.extinguisher();
        e.position.set(wx + side[0] * (C / 2), 0, wz + side[1] * (C / 2));
        e.rotation.y = faceAway(side[0], side[1]);
        root.add(e);
      }
    }

    // ---- extra details sprinkled everywhere ----
    const bloodKeys = [0, 1, 2];
    for (const [x, y] of W.floorCells) {
      const c = W.ch(x, y);
      const wx = U.cellToWorld(x), wz = U.cellToWorld(y);
      const z = W.zoneAt(x, y);
      const scary = z && ['MEDBAY / MORGUE', 'CONTAINMENT CELL 13', 'RESEARCH LAB', 'MAINTENANCE'].includes(z.name);
      if (rnd() < (scary ? 0.3 : 0.12)) {
        const k = bloodKeys[Math.floor(rnd() * 3)];
        floorDecal(root, wx + U.rand(-1, 1), wz + U.rand(-1, 1), U.rand(0.8, 2.0), 'blood' + k, T.blood(k));
      }
      if (z && z.name === 'CONTAINMENT CELL 13' && rnd() < 0.5) floorDecal(root, wx + U.rand(-1, 1), wz + U.rand(-1, 1), U.rand(1.5, 3), 'goo', T.goo());
      // wall splats and bloody handprints
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        if (!W.isWall(x + dx, y + dy) || DOORS.includes(c)) continue;
        const r = rnd();
        if (r < (scary ? 0.16 : 0.06)) wallDecal(root, x, y, dx, dy, U.rand(1, 1.8), U.rand(1, 1.8), U.rand(0.8, 1.9), 'bw' + (r < 0.03 ? 0 : 1), T.bloodWall(r < 0.03 ? 0 : 1), U.rand(-0.8, 0.8));
        else if (r < (scary ? 0.22 : 0.08)) wallDecal(root, x, y, dx, dy, 1.2, 1.2, U.rand(1.0, 1.6), 'hands', T.handprints(), U.rand(-0.8, 0.8));
        else if (r < 0.1 && c === '.') { // wall vent
          const v = Mo.vent();
          v.position.set(wx + dx * (C / 2 - 0.03), U.rand(0.5, 2.4), wz + dy * (C / 2 - 0.03));
          v.rotation.y = faceAway(dx, dy);
          root.add(v);
        }
      }
      // pipes running along corridor ceilings
      if (z && z.name.includes('CORRIDOR') && !DOORS.includes(c)) {
        const { helpers: Hh, M } = Mo;
        if (W.isWall(x, y - 1)) {
          Hh.cyl(root, 0.12, 0.12, C, M.rust(), wx, H - 0.3, wz - C / 2 + 0.25, 0, 0, Math.PI / 2);
          Hh.cyl(root, 0.07, 0.07, C, M.metal(), wx, H - 0.55, wz - C / 2 + 0.2, 0, 0, Math.PI / 2);
          if (x % 3 === 0) Hh.box(root, 0.08, 0.6, 0.4, M.darkMetal(), wx, H - 0.35, wz - C / 2 + 0.2);
        } else if (W.isWall(x - 1, y) && !W.isWall(x, y - 1)) {
          Hh.cyl(root, 0.12, 0.12, C, M.rust(), wx - C / 2 + 0.25, H - 0.3, wz, Math.PI / 2, 0, 0);
        }
      }
      // hanging cables
      if (rnd() < 0.06 && !PROP_SIZE[c]) {
        const { helpers: Hh, M } = Mo;
        const px = wx + U.rand(-1, 1), pz = wz + U.rand(-1, 1);
        Hh.tube(root, new THREE.Vector3(px, H, pz), new THREE.Vector3(px + U.rand(-0.4, 0.4), U.rand(1.6, 2.6), pz + U.rand(-0.4, 0.4)), 0.02, M.cable(), 4);
      }
    }

    // elevator car
    if (W.elevatorCells.length) {
      const xs = W.elevatorCells.map((c) => c[0]), ys = W.elevatorCells.map((c) => c[1]);
      const ex = (Math.min(...xs) + Math.max(...xs) + 1) / 2 * C, ez = (Math.min(...ys) + Math.max(...ys) + 1) / 2 * C;
      const el = Mo.elevator();
      el.position.set(ex, 0, ez);
      dyn.add(el);
      const light = new THREE.PointLight(0xffe0a0, 0, 7, 1.5);
      light.position.set(ex, H - 0.4, ez);
      dyn.add(light);
      W.elevator = { x: ex, z: ez, model: el, light, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    }

    const merged = mergeStatic(root);
    scene.add(merged);
    W.static = merged;

    // a pool of real lights that follow the players around (fast!)
    W.pool = [];
    for (let i = 0; i < (LAB.lowGfx ? 4 : 8); i++) {
      const l = new THREE.PointLight(0xffffff, 0, 13, 1.7);
      scene.add(l);
      W.pool.push(l);
    }
    // group two-person doors with their buttons
    for (const d of W.doors) if (d.type === 'B' || d.type === 'H') d.buttons = W.buttons[d.type];

    // room centers for the Stalker to wander between
    W.waypoints = LAB.ZONES.map((z) => {
      let best = null;
      for (let y = z.y1; y <= z.y2; y++) for (let x = z.x1; x <= z.x2; x++) if (W.passable(x, y) && (!best || Math.abs(x - (z.x1 + z.x2) / 2) + Math.abs(y - (z.y1 + z.y2) / 2) < best.d)) best = { x, y, d: Math.abs(x - (z.x1 + z.x2) / 2) + Math.abs(y - (z.y1 + z.y2) / 2) };
      return best && { cx: best.x, cy: best.y };
    }).filter(Boolean);
  };

  // ---------- every frame ----------
  let blackout = 0;
  W.blackout = (t) => { blackout = Math.max(blackout, t); };
  W.isBlackout = () => blackout > 0;

  W.update = function (dt, time, game) {
    const players = game.players;
    if (blackout > 0) blackout -= dt;

    // doors
    for (const d of W.doors) {
      let want = false;
      const near = (r) => players.some((p) => !p.downed && U.dist(p.x, p.z, d.x, d.z) < r);
      if (d.type === 'O') {
        want = near(3.2) || game.aliens.some((a) => a.alive && U.dist(a.x, a.z, d.x, d.z) < 2.6);
        if (game.power === false && blackout > 0) want = false;
        if (d.slamT > 0) { d.slamT -= dt; want = Math.sin(d.slamT * 9) > -0.2; }
      } else if (d.type === 'D') {
        if (game.team.keycard && near(3.2)) { if (!d.unlocked) { d.unlocked = true; LAB.Audio.beep(); } want = true; }
        else if (d.unlocked) want = near(3.2) || game.aliens.some((a) => a.alive && a.type === 'stalker' && U.dist(a.x, a.z, d.x, d.z) < 2.6);
      } else if (d.type === 'B' || d.type === 'H') {
        // both buttons must be held by different players
        const held = d.buttons.map((b) => players.find((p) => !p.downed && p.input && p.input.use && U.dist(p.x, p.z, b.x, b.z) < 1.8));
        if (players.length === 1 && !d.stayOpen) {
          // ONE PLAYER: press one button, then race to the other before time runs out
          const p = players[0];
          held.forEach((h, i) => {
            if (!h || !p.input.usePressed) return;
            if (d.soloArmed !== undefined && d.soloArmed !== i && d.soloT > 0) {
              d.stayOpen = true; d.unlocked = true; d.soloArmed = undefined;
              LAB.Audio.beep(); game.message(0, 'Made it! The lock opens!');
            } else if (d.soloArmed !== i) {
              d.soloArmed = i; d.soloT = 9;
              LAB.Audio.beep(); game.message(0, 'Button pressed! RUN to the other button! 9 seconds!', 3);
            }
          });
          if (d.soloT > 0) {
            const before = Math.ceil(d.soloT);
            d.soloT -= dt;
            if (Math.ceil(d.soloT) !== before && d.soloT > 0) { LAB.Audio.beep(); game.message(0, 'HURRY! ' + Math.ceil(d.soloT) + '...', 1.2); }
            if (d.soloT <= 0) { d.soloArmed = undefined; LAB.Audio.denied(); game.message(0, 'Too slow! The lock reset.'); }
          }
          d.buttons.forEach((b, i) => { if (d.soloArmed === i) held[i] = p; });
        }
        d.buttons.forEach((b, i) => { b.held = !!held[i]; b.model.userData.btnMat.emissiveIntensity = held[i] ? 3 : 0.5 + Math.sin(time * 4) * 0.3; b.model.userData.btn.position.z = held[i] ? 0.04 : 0.08; });
        if (!d.stayOpen && held.length >= 2 && held.every(Boolean) && held[0] !== held[1]) {
          d.stayOpen = true; d.unlocked = true;
          LAB.Audio.beep(); game.message(null, 'The 2-person lock opens!');
        }
        want = d.stayOpen;
      } else if (d.type === 'P') {
        if (game.power) { d.unlocked = true; want = near(4) || d.stayOpen; if (want) d.stayOpen = true; }
      }
      d.target = want ? 1 : 0;
      const before = d.open;
      d.open = U.clamp(d.open + (d.target ? 1 : -1) * dt * 1.6, 0, 1);
      if ((before === 0 && d.open > 0) || (before === 1 && d.open < 1)) {
        const p = game.soundAt(d.x, d.z, 22);
        LAB.Audio.doorHiss(p.vol, p.pan);
      }
      const e = d.open * d.open * (3 - 2 * d.open);
      for (const pn of d.model.userData.panels) pn.p.position.x = pn.base + pn.side * e * (C / 2 - 0.25);
      const lm = d.model.userData.light;
      const green = d.unlocked || d.type === 'O';
      lm.color.setHex(green ? 0x20ff40 : 0xff2020); lm.emissive.setHex(green ? 0x10ff20 : 0xff0000);
    }

    // items spin and bob
    for (const it of W.items) {
      if (it.taken) continue;
      it.model.userData.inner.rotation.y = time * 1.5 + it.phase;
      it.model.position.y = 1.0 + Math.sin(time * 2 + it.phase) * 0.08;
      it.model.userData.glow.material.opacity = 0.4 + Math.sin(time * 3 + it.phase) * 0.15;
    }

    // light levels (flicker, blackout, power)
    for (const L of W.lights) {
      let lv;
      if (L.mode === 'dead') {
        lv = 0;
        if (Math.random() < 0.004) { L.spark = 0.08; const p = game.soundAt(L.x, L.z, 15); LAB.Audio.spark(p.pan); }
        if (L.spark > 0) { L.spark -= dt; lv = 0.8; }
      } else if (L.mode === 'emergency') {
        lv = game.power ? 1.4 : 0.5 + Math.sin(time * 2 + L.phase) * 0.1;
        L.beacon.userData.spin.rotation.y += dt * (game.power ? 8 : 0);
        L.beacon.userData.mat.emissiveIntensity = game.power ? 1.5 + Math.sin(time * 8 + L.phase) * 1.2 : 0.5;
        if (game.power) lv *= 0.6 + 0.4 * Math.abs(Math.sin(time * 4 + L.phase));
      } else {
        lv = game.power ? 1.15 : 0.75;
        if (L.mode === 'flicker' && !game.power) {
          const n = Math.sin(time * 13 + L.phase) + Math.sin(time * 31.7 + L.phase * 2) + Math.sin(time * 7.1);
          if (n > 1.6) lv = 0.05; else if (n > 1.2) lv = 0.4;
        }
      }
      if (blackout > 0) lv = L.mode === 'emergency' ? lv * 0.15 : 0;
      L.level = lv;
      if (L.lampMat) L.lampMat.emissiveIntensity = lv * 1.8;
      if (L.lamp && L.mode === 'dead') L.lamp.userData.hang.rotation.z = 0.6 + Math.sin(time * 1.3 + L.phase) * 0.05;
    }
    // give the real lights to the closest lamps
    const alive = players.filter(Boolean);
    const scored = W.lights.filter((L) => L.level > 0.02).map((L) => {
      let d = Infinity;
      for (const p of alive) d = Math.min(d, U.dist(p.x, p.z, L.x, L.z));
      return { L, d };
    }).sort((a, b) => a.d - b.d);
    W.pool.forEach((pl, i) => {
      const s = scored[i];
      if (!s || s.d > 30) { pl.intensity = 0; return; }
      pl.position.set(s.L.x, s.L.y, s.L.z);
      pl.color.copy(s.L.color);
      const isRed = s.L.mode === 'emergency';
      pl.intensity = s.L.level * (isRed ? 10 : 16) * U.clamp((30 - s.d) / 8, 0, 1);
      pl.distance = isRed ? 10 : 15;
    });

    // generator
    if (W.generator && game.power) {
      W.generator.light.intensity = 3 + Math.sin(time * 30) * 0.5;
      W.generator.model.position.x = W.generator.x + Math.sin(time * 60) * 0.004;
    }
    if (W.elevator) W.elevator.light.intensity = game.power ? 6 : 0;
  };

  // blood splattered on the closest wall (big hits)
  W.addWallBlood = function (x, z, h) {
    const cx = U.worldToCell(x), cy = U.worldToCell(z);
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]].sort(() => Math.random() - 0.5)) {
      if (!W.isWall(cx + dx, cy + dy)) continue;
      const along = dx ? z - U.cellToWorld(cy) : x - U.cellToWorld(cx);
      const m = wallDecal(W.dyn, cx, cy, dx, dy, U.rand(1.4, 2.2), U.rand(1.4, 2.2), h || U.rand(1.2, 1.8), 'bwLive' + (Math.random() < 0.5 ? 0 : 1), T.bloodWall(Math.random() < 0.5 ? 0 : 1), U.clamp(along, -0.8, 0.8));
      m.position.addScaledVector(new THREE.Vector3(-dx, 0, -dy), 0.005);
      liveDecals.push(m);
      return true;
    }
    return false;
  };

  // blood that appears during the game (from fights)
  const liveDecals = [];
  W.addBlood = function (x, z, size, green) {
    const tex = green ? T.goo() : T.blood(U.randInt(0, 2));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), decalMat(green ? 'goo' : 'blood' + tex.uuid, tex));
    m.rotation.set(-Math.PI / 2, 0, Math.random() * 6.28);
    m.position.set(x, 0.015 + Math.random() * 0.005, z);
    m.receiveShadow = true;
    W.dyn.add(m);
    liveDecals.push(m);
    if (liveDecals.length > 120) { const old = liveDecals.shift(); W.dyn.remove(old); old.geometry.dispose(); }
  };

  return W;
})();
