// ============================================================
//  MONSTER HOTEL — BUILDS THE 3D HOTEL FROM THE MAP
// ============================================================
window.MH = window.MH || {};

MH.World = (function () {
  const U = MH.U, T = MH.Tex, Mo = MH.Models, CELL = MH.CELL;
  const W = {};
  let grid = [], ROWS = 0, COLS = 0, blocked = [];
  let scene;

  // ---------- reading the map ----------
  const WALLS = '#WwE';
  const PROPS = 'FXpAfctgks';
  const at = (c, r) => (r >= 0 && r < ROWS && c >= 0 && c < COLS) ? grid[r][c] : '#';
  const isWall = (ch) => WALLS.includes(ch);
  function zone(ch) {
    if ('LFXpAfctgP'.includes(ch)) return 'lobby';
    if (ch === '.') return 'hall';
    if ('Kk'.includes(ch)) return 'kitchen';
    if ('Ss'.includes(ch)) return 'supply';
    if ('12345678'.includes(ch)) return 'room';
    if (ch === 'd') return 'door';
    if (ch === 'D') return 'arch';
    return 'wall';
  }
  const HEIGHT = { lobby: 8.5, hall: 4.0, kitchen: 4.0, supply: 3.4, room: 3.6, door: 2.7, arch: 3.4, wall: 0 };
  function heightAt(c, r) {
    const ch = at(c, r);
    const z = zone(ch);
    if (z === 'arch') {
      // an archway between two tall areas is a bit taller
      let n = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (zone(at(c + dx, r + dz)) === 'lobby') n++;
      return n ? 3.6 : 2.9;
    }
    return HEIGHT[z];
  }
  const cx = (c) => c * CELL + CELL / 2;
  W.cx = cx;
  W.cell = (x) => Math.floor(x / CELL);

  // is this square solid? (guests may walk through the front doors)
  function solidCell(c, r, guest) {
    const ch = at(c, r);
    if (ch === 'E') return !guest;
    if (isWall(ch)) return true;
    if (PROPS.includes(ch)) return true;
    return !!(blocked[r] && blocked[r][c]);
  }
  W.solidCell = solidCell;
  W.at = at;
  W.zoneAt = (x, z) => zone(at(W.cell(x), W.cell(z)));

  // ============================================================
  //  GEOMETRY BATCHES (many quads -> one mesh per material)
  // ============================================================
  function Batch() { return { pos: [], nor: [], uv: [], col: [], idx: [], n: 0 }; }
  const batches = {};
  const batchMats = {};
  function B(key) { return batches[key] || (batches[key] = Batch()); }
  // add a flat 4-corner shape; corners in order, normal given
  function quad(key, p, n, uv, col) {
    const b = B(key);
    // make sure it faces the right way
    const ax = p[1][0] - p[0][0], ay = p[1][1] - p[0][1], az = p[1][2] - p[0][2];
    const bx = p[2][0] - p[0][0], by = p[2][1] - p[0][1], bz = p[2][2] - p[0][2];
    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const flip = nx * n[0] + ny * n[1] + nz * n[2] < 0;
    for (let i = 0; i < 4; i++) {
      b.pos.push(p[i][0], p[i][1], p[i][2]);
      b.nor.push(n[0], n[1], n[2]);
      b.uv.push(uv[i][0], uv[i][1]);
      const c = col ? col[i] : 1;
      b.col.push(c, c, c);
    }
    const o = b.n;
    if (flip) b.idx.push(o, o + 2, o + 1, o, o + 3, o + 2);
    else b.idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
    b.n += 4;
  }
  // a vertical wall piece from (ax,az) to (bx,bz), from height y0 to y1
  function wallRect(key, ax, az, bx, bz, y0, y1, nx, nz, tile, ao = true) {
    if (y1 - y0 < 0.001) return;
    const tx = bx - ax, tz = bz - az;
    const len = Math.hypot(tx, tz);
    const ux = tx / len, uz = tz / len;
    const u0 = (ax * ux + az * uz) / tile, u1 = u0 + len / tile;
    // bands so the corners near the floor and the ceiling get darker (fake shadows)
    const ys = [y0];
    if (ao) { if (y0 < 0.45 && y1 > 0.45) ys.push(0.45); if (y1 - 0.7 > ys[ys.length - 1] + 0.05) ys.push(y1 - 0.7); }
    ys.push(y1);
    const shade = (y) => {
      if (!ao) return 1;
      let s = 1;
      if (y < 0.45) s = 0.5 + 0.5 * (y / 0.45);
      if (y > y1 - 0.7 && y1 > 2.5) s *= 0.72 + 0.28 * ((y1 - y) / 0.7);
      return s;
    };
    for (let i = 0; i < ys.length - 1; i++) {
      const ya = ys[i], yb = ys[i + 1];
      quad(key, [[ax, ya, az], [bx, ya, bz], [bx, yb, bz], [ax, yb, az]], [nx, 0, nz],
        [[u0, ya / tile], [u1, ya / tile], [u1, yb / tile], [u0, yb / tile]],
        [shade(ya), shade(ya), shade(yb), shade(yb)]);
    }
  }
  function horizRect(key, x0, z0, x1, z1, y, up, tile, rot = false) {
    const n = up ? [0, 1, 0] : [0, -1, 0];
    const uv = (x, z) => rot ? [z / tile, x / tile] : [x / tile, z / tile];
    quad(key, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], n, [uv(x0, z0), uv(x1, z0), uv(x1, z1), uv(x0, z1)]);
  }

  // ---------- materials ----------
  function makeMaterials() {
    const st = T.stone(), wf = T.woodFloor(), mb = T.marble(), wp = T.woodPanel();
    const m = (o) => new THREE.MeshStandardMaterial(o);
    batchMats.stone = m({ map: st.map, bumpMap: st.bump, bumpScale: 3, roughness: 0.9, vertexColors: true });
    batchMats.stoneDark = m({ map: st.map, bumpMap: st.bump, bumpScale: 3, roughness: 0.9, color: 0x8a8090, vertexColors: true });
    batchMats.paperHall = m({ map: T.wallpaper('hall'), roughness: 0.8, vertexColors: true });
    batchMats.paperRoom = m({ map: T.wallpaper('room'), roughness: 0.8, vertexColors: true });
    batchMats.paperTeal = m({ map: T.wallpaper('teal'), roughness: 0.8, vertexColors: true });
    batchMats.tileGreen = m({ map: T.greenTile(), roughness: 0.3, vertexColors: true });
    batchMats.panel = m({ map: wp.map, bumpMap: wp.bump, bumpScale: 2, roughness: 0.55, vertexColors: true });
    batchMats.floorWood = m({ map: wf.map, bumpMap: wf.bump, bumpScale: 1.5, roughness: 0.45, vertexColors: true });
    batchMats.floorMarble = m({ map: mb.map, bumpMap: mb.bump, bumpScale: 1, roughness: 0.18, metalness: 0.05, vertexColors: true });
    batchMats.floorChecker = m({ map: T.checker(), roughness: 0.3, vertexColors: true });
    batchMats.floorStone = m({ map: st.map, bumpMap: st.bump, bumpScale: 2, roughness: 0.85, color: 0x9a90a0, vertexColors: true });
    batchMats.ceilPlaster = m({ map: T.plaster(), roughness: 0.95, vertexColors: true });
    batchMats.ceilCoffer = m({ map: T.coffered(), roughness: 0.6, vertexColors: true });
    batchMats.carpet = m({ map: T.carpet(), roughness: 0.95, vertexColors: true });
  }
  const WALL_MAT = { lobby: 'stone', hall: 'paperHall', room: 'paperRoom', kitchen: 'tileGreen', supply: 'stone', door: 'stoneDark', arch: 'stoneDark' };
  const WALL_TILE = { stone: 3, stoneDark: 3, paperHall: 1.4, paperRoom: 1.4, paperTeal: 1.4, tileGreen: 1.5 };
  const FLOOR_MAT = { lobby: ['floorMarble', 3], hall: ['floorWood', 3], room: ['floorWood', 3], kitchen: ['floorChecker', 1.5], supply: ['floorStone', 3], door: ['floorWood', 3], arch: ['floorMarble', 3] };
  const CEIL_MAT = { lobby: ['ceilCoffer', 3], hall: ['ceilPlaster', 3], room: ['ceilPlaster', 3], kitchen: ['ceilPlaster', 3], supply: ['ceilPlaster', 3], door: ['ceilPlaster', 3], arch: ['ceilPlaster', 3] };
  const WAINSCOT = { lobby: 1.3, hall: 1.1, room: 1.0 };

  // ============================================================
  //  STATIC MESH MERGING (so the game runs fast)
  // ============================================================
  function mergeStatic(root) {
    root.updateMatrixWorld(true);
    const buckets = new Map();
    const remove = [];
    (function walk(o, skip) {
      if (o.userData && o.userData.dynamic) skip = true;
      if (o.isMesh && !skip && !o.material.transparent && !o.userData.keep) {
        if (!buckets.has(o.material)) buckets.set(o.material, []);
        buckets.get(o.material).push(o);
        remove.push(o);
      }
      for (const c of o.children) walk(c, skip);
    })(root, false);
    const merged = [];
    for (const [mat, list] of buckets) {
      let vcount = 0, icount = 0;
      const needCol = !!mat.vertexColors;
      for (const m of list) { vcount += m.geometry.attributes.position.count; icount += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count; }
      const pos = new Float32Array(vcount * 3), nor = new Float32Array(vcount * 3), uv = new Float32Array(vcount * 2);
      const col = needCol ? new Float32Array(vcount * 3) : null;
      const idx = vcount > 65535 ? new Uint32Array(icount) : new Uint16Array(icount);
      let vo = 0, io = 0;
      const v = new THREE.Vector3(), nm = new THREE.Matrix3();
      for (const m of list) {
        const g = m.geometry, p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv, c = g.attributes.color;
        nm.getNormalMatrix(m.matrixWorld);
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld);
          pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
          if (n) { v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z; }
          if (t) { uv[(vo + i) * 2] = t.getX(i); uv[(vo + i) * 2 + 1] = t.getY(i); }
          if (col) { const cc = c ? [c.getX(i), c.getY(i), c.getZ(i)] : [1, 1, 1]; col[(vo + i) * 3] = cc[0]; col[(vo + i) * 3 + 1] = cc[1]; col[(vo + i) * 3 + 2] = cc[2]; }
        }
        if (g.index) { for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo; io += g.index.count; }
        else { for (let i = 0; i < p.count; i++) idx[io + i] = vo + i; io += p.count; }
        vo += p.count;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      merged.push(mesh);
    }
    for (const m of remove) m.parent.remove(m);
    return merged;
  }

  // ============================================================
  //  BUILD EVERYTHING
  // ============================================================
  const props = new THREE.Group();      // furniture etc. (merged later)
  const dyn = [];                       // things that move every frame
  const anchors = [];                   // light spots
  const colliders = [];                 // extra boxes you can't walk through
  W.rooms = []; W.stations = []; W.doors = []; W.windows = []; W.decor = { fancy: [], shabby: [], portraits: [] };

  function addLight(x, y, z, color, intensity, dist, flicker = 0, tag = null) {
    const a = { x, y, z, color: new THREE.Color(color), intensity, dist, flicker, off: Math.random() * 10, tag, mult: 1 };
    anchors.push(a);
    return a;
  }
  function place(obj, x, y, z, yaw = 0) {
    obj.position.set(x, y, z); obj.rotation.y = yaw;
    props.add(obj);
    return obj;
  }
  // which way to face so your back is against a wall
  function awayFromWall(c, r) {
    if (isWall(at(c, r - 1))) return 0;              // wall to the north -> face south
    if (isWall(at(c, r + 1))) return Math.PI;        // wall to the south -> face north
    if (isWall(at(c - 1, r))) return Math.PI / 2;    // wall to the west -> face east
    if (isWall(at(c + 1, r))) return -Math.PI / 2;
    return 0;
  }

  function build(sc) {
    scene = sc;
    // --- read the map ---
    grid = MH.MAP.map((row) => row.split(''));
    ROWS = grid.length; COLS = Math.max(...MH.MAP.map((r) => r.length));
    for (let r = 0; r < ROWS; r++) { while (grid[r].length < COLS) grid[r].push('#'); blocked.push(new Array(COLS).fill(false)); }
    W.ROWS = ROWS; W.COLS = COLS; W.grid = grid;
    makeMaterials();

    findRooms();
    buildShell();
    buildWindowsAndDoors();
    buildProps();
    furnishRooms();
    decorateHalls();

    // all candle glows become one cloud of glowing dots
    buildGlows();
    // merge all the still things into a few big meshes
    const merged = mergeStatic(props);
    const shell = [];
    for (const key in batches) {
      const b = batches[key];
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      g.setIndex(b.idx);
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, batchMats[key]);
      mesh.matrixAutoUpdate = false;
      shell.push(mesh);
    }
    shell.forEach((m) => scene.add(m));
    merged.forEach((m) => scene.add(m));
    scene.add(props);
    buildLights();
    buildRain();
    W.anchors = anchors;
  }

  function buildGlows() {
    props.updateMatrixWorld(true);
    const pts = [];
    const v = new THREE.Vector3();
    props.traverse((o) => { if (o.userData.glow) { o.getWorldPosition(v); pts.push(v.x, v.y, v.z); } });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const m = new THREE.PointsMaterial({ map: T.glow(), color: 0xffa040, size: 0.3, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const cloud = new THREE.Points(g, m);
    cloud.frustumCulled = false;
    scene.add(cloud);
    W.glowCloud = cloud;
  }

  // ---------- rooms ----------
  function findRooms() {
    const found = {};
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = at(c, r);
      if ('12345678'.includes(ch)) {
        const f = found[ch] || (found[ch] = { num: +ch, cells: [], c0: 99, c1: -1, r0: 99, r1: -1 });
        f.cells.push([c, r]);
        f.c0 = Math.min(f.c0, c); f.c1 = Math.max(f.c1, c); f.r0 = Math.min(f.r0, r); f.r1 = Math.max(f.r1, r);
      }
    }
    for (const k of Object.keys(found).sort()) {
      const R = found[k];
      // find the door and the window
      for (let c = R.c0; c <= R.c1; c++) {
        for (const [r, side] of [[R.r0 - 1, -1], [R.r1 + 1, 1]]) {
          const ch = at(c, r);
          if (ch === 'd') { R.door = { c, r }; R.doorSide = side; }
          if (ch === 'w') R.win = { c, r, side };
        }
      }
      R.x0 = R.c0 * CELL; R.x1 = (R.c1 + 1) * CELL; R.z0 = R.r0 * CELL; R.z1 = (R.r1 + 1) * CELL;
      R.center = { x: (R.x0 + R.x1) / 2, z: (R.z0 + R.z1) / 2 };
      R.status = 'free';
      R.guest = null;
      R.messes = [];
      W.rooms.push(R);
    }
  }

  // ---------- walls, floors, ceilings ----------
  function holeFor(c, r, dx, dz) {
    // returns a hole (window/door opening) in the wall between (c,r) and its neighbor
    const n = at(c + dx, r + dz);
    const z = zone(at(c, r));
    if (n === 'w') return { y0: 0.9, y1: 2.65, w: 1.15, kind: 'w' };
    if (n === 'W') {
      if (z === 'lobby') return dz === -1 ? { y0: 4.6, y1: 7.8, w: 1.25, kind: 'W' } : { y0: 1.3, y1: 5.2, w: 1.25, kind: 'W' };
      return { y0: 1.5, y1: 3.2, w: 1.3, kind: 'W' };
    }
    if (n === 'E') return { y0: 0, y1: 4.4, w: 99, kind: 'E' };
    return null;
  }
  function buildShell() {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const ch = at(c, r);
      if (isWall(ch)) continue;
      const z = zone(ch);
      const H = heightAt(c, r);
      const x0 = c * CELL, x1 = x0 + CELL, z0 = r * CELL, z1 = z0 + CELL;
      // floor & ceiling
      const [fm, ft] = FLOOR_MAT[z];
      horizRect(fm, x0, z0, x1, z1, 0, true, ft);
      const [cm, ctile] = CEIL_MAT[z];
      horizRect(cm, x0, z0, x1, z1, H, false, ctile);
      // walls on all four sides
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nch = at(c + dx, r + dz);
        let y0 = 0;
        if (!isWall(nch)) {
          const hn = heightAt(c + dx, r + dz);
          if (hn >= H) continue;
          y0 = hn;
        }
        // the edge between the two squares
        let ax, az, bx, bz;
        if (dx === 1) { ax = x1; az = z0; bx = x1; bz = z1; }
        if (dx === -1) { ax = x0; az = z1; bx = x0; bz = z0; }
        if (dz === 1) { ax = x1; az = z1; bx = x0; bz = z1; }
        if (dz === -1) { ax = x0; az = z0; bx = x1; bz = z0; }
        const mk = WALL_MAT[z];
        const tile = WALL_TILE[mk];
        const hole = y0 === 0 ? holeFor(c, r, dx, dz) : null;
        const ws = WAINSCOT[z] && y0 === 0 ? WAINSCOT[z] : 0;
        const piece = (pax, paz, pbx, pbz, py0, py1) => {
          if (ws && py0 < ws) {
            wallRect('panel', pax, paz, pbx, pbz, py0, Math.min(ws, py1), -dx, -dz, ws * 1.2);
            if (py1 > ws) wallRect(mk, pax, paz, pbx, pbz, ws, py1, -dx, -dz, tile);
          } else wallRect(mk, pax, paz, pbx, pbz, py0, py1, -dx, -dz, tile);
        };
        if (!hole) piece(ax, az, bx, bz, y0, H);
        else {
          // cut the hole out of the wall
          const L = CELL, hw = Math.min(hole.w, L) / 2;
          const lerp = (t) => [ax + (bx - ax) * t, az + (bz - az) * t];
          const ta = 0.5 - hw / L, tb = 0.5 + hw / L;
          const [lx, lz] = lerp(ta), [rx, rz] = lerp(tb);
          if (hole.kind === 'E') {
            wallRect(mk, ax, az, bx, bz, hole.y1, H, -dx, -dz, tile);
          } else {
            if (ta > 0.001) { piece(ax, az, lx, lz, 0, H); piece(rx, rz, bx, bz, 0, H); }
            piece(lx, lz, rx, rz, 0, hole.y0);
            wallRect(mk, lx, lz, rx, rz, hole.y1, H, -dx, -dz, tile);
            // the inside of the window hole (reveal)
            const d = 0.35;
            const ox = dx * d, oz = dz * d;
            wallRect('stoneDark', lx, lz, lx + ox, lz + oz, hole.y0, hole.y1, (rx - lx) / (2 * hw), (rz - lz) / (2 * hw), 3, false);
            wallRect('stoneDark', rx + ox, rz + oz, rx, rz, hole.y0, hole.y1, -(rx - lx) / (2 * hw), -(rz - lz) / (2 * hw), 3, false);
            quad('stoneDark', [[lx, hole.y0, lz], [rx, hole.y0, rz], [rx + ox, hole.y0, rz + oz], [lx + ox, hole.y0, lz + oz]], [0, 1, 0], [[0, 0], [1, 0], [1, 0.2], [0, 0.2]]);
            quad('stoneDark', [[lx, hole.y1, lz], [rx, hole.y1, rz], [rx + ox, hole.y1, rz + oz], [lx + ox, hole.y1, lz + oz]], [0, -1, 0], [[0, 0], [1, 0], [1, 0.2], [0, 0.2]]);
            W.windows.push({ c: c + dx, r: r + dz, fc: c, fr: r, dx, dz, hole, mid: { x: (lx + rx) / 2, z: (lz + rz) / 2 }, zone: z, H });
          }
        }
        // baseboard & top molding strips
        if (y0 === 0 && !(hole && hole.kind === 'E')) {
          const mx = (ax + bx) / 2 - dx * 0.02, mz = (az + bz) / 2 - dz * 0.02;
          const len = CELL + 0.001;
          const along = dx !== 0 ? [0.05, 0.16, len] : [len, 0.16, 0.05];
          const strip = new THREE.Mesh(Mo.G.box(), Mo.C(0x1e1014, 0.5));
          strip.position.set(mx, 0.08, mz); strip.scale.set(...along); props.add(strip);
          if (ws) {
            const rail = new THREE.Mesh(Mo.G.box(), Mo.C(0x2a1610, 0.45));
            rail.position.set(mx, ws, mz); rail.scale.set(dx !== 0 ? 0.07 : len, 0.06, dx !== 0 ? len : 0.07); props.add(rail);
          }
          if (H < 5) {
            const crown = new THREE.Mesh(Mo.G.box(), Mo.C(0x2a1a24, 0.6));
            crown.position.set(mx, H - 0.08, mz); crown.scale.set(dx !== 0 ? 0.12 : len, 0.16, dx !== 0 ? len : 0.12); props.add(crown);
          }
        }
      }
    }
  }

  // ---------- windows, doors, the entrance ----------
  function buildWindowsAndDoors() {
    const skyMat = new THREE.MeshBasicMaterial({ map: T.sky(), color: 0xffffff, fog: false });
    W.skyMat = skyMat;
    for (const win of W.windows) {
      const { hole, dx, dz, mid } = win;
      const yaw = Math.atan2(-dx, -dz); // faces into the room
      const g = new THREE.Group();
      g.position.set(mid.x, 0, mid.z); g.rotation.y = yaw;
      props.add(g);
      const h = hole.y1 - hole.y0, w = hole.w;
      // the sky far behind the glass
      const sky = new THREE.Mesh(Mo.G.plane(), skyMat);
      sky.scale.set(w * 3.2, h * 2.4, 1); sky.position.set(0, (hole.y0 + hole.y1) / 2 + h * 0.25, -1.3);
      sky.userData.keep = true;
      const sgeo = new THREE.PlaneGeometry(1, 1);
      const off = Math.random() * 0.6;
      const uva = sgeo.attributes.uv;
      for (let i = 0; i < uva.count; i++) uva.setX(i, off + uva.getX(i) * 0.35);
      sky.geometry = sgeo;
      g.add(sky);
      // window glass that can blow open
      const panes = Mo.windowPanes(w, h);
      panes.position.set(0, hole.y0, -0.3);
      if (hole.kind !== 'w') panes.traverse((o) => { o.userData.dynamic = false; });
      g.add(panes);
      // frame & sill
      const frameM = Mo.C(0x2a1a14, 0.6);
      Mo.P(g, Mo.G.box(), frameM, [0, hole.y0 - 0.04, -0.12], [w + 0.2, 0.08, 0.36]);
      Mo.P(g, Mo.G.box(), frameM, [0, hole.y1 + 0.04, -0.1], [w + 0.2, 0.1, 0.3]);
      // gothic pointed top decoration
      Mo.P(g, Mo.G.cone(), Mo.C(0x3a2a3a, 0.7), [0, hole.y1 + 0.35, 0.02], [w * 0.55, 0.5, 0.06], [0, 0, 0]).scale.z = 0.04;
      if (hole.kind === 'w' || win.zone === 'lobby') {
        const cur = Mo.curtains(w + 0.5, h + 0.35, win.zone === 'lobby' ? 0x7a1428 : [0x5a2a7a, 0x7a1a3a, 0x1a5a5a, 0x3a2a7a][W.windows.indexOf(win) % 4]);
        cur.position.set(0, hole.y1 + 0.32, 0.02);
        cur.traverse((o) => { if (o.isMesh && o.userData.side) o.userData.keep = true; });
        if (hole.kind === 'w') cur.userData.dynamic = true;
        else cur.traverse((o) => { o.userData.keep = false; });
        g.add(cur);
        win.curtains = cur;
      }
      win.panes = panes;
      win.group = g;
      win.open = 0; win.target = 0;
      // cool moonlight coming through
      if (win.zone === 'lobby' || hole.kind === 'W') addLight(mid.x - dx * 1.2, (hole.y0 + hole.y1) / 2, mid.z - dz * 1.2, 0x7a8aff, win.zone === 'lobby' ? 10 : 5, 7, 0, 'moon');
      // match it to a guest room
      if (hole.kind === 'w') {
        const room = W.rooms.find((R) => R.win && R.win.c === win.c && R.win.r === win.r);
        if (room) { room.window = win; win.room = room; }
      }
    }

    // --- guest room doors ---
    for (const R of W.rooms) {
      if (!R.door) continue;
      const { c, r } = R.door;
      const side = R.doorSide; // -1: door is north of room, 1: south of room
      // door sits on the hallway side of the thick wall
      const faceZ = side === 1 ? (r + 1) * CELL : r * CELL;
      const yaw = side === 1 ? 0 : Math.PI;
      const d = Mo.roomDoor(R.num);
      const dg = new THREE.Group();
      dg.position.set(cx(c), 0, faceZ - side * 0.1); dg.rotation.y = yaw;
      dg.add(d);
      props.add(dg);
      // stone door frame with a pointed arch
      const fr = Mo.C(0x4a3e52, 0.8);
      for (const sx of [-1, 1]) Mo.P(dg, Mo.G.box(), fr, [sx * 0.66, 1.3, 0.05], [0.2, 2.6, 0.3]);
      Mo.P(dg, Mo.G.box(), fr, [0, 2.72, 0.05], [1.52, 0.24, 0.3]);
      Mo.P(dg, Mo.G.box(), Mo.C(0x2a1e2a, 0.8), [0, 2.95, 0.08], [0.6, 0.3, 0.12], [0, 0, Math.PI / 4]);
      // room number sign + status lamp
      const sign = new THREE.Mesh(Mo.G.plane(), new THREE.MeshStandardMaterial({ map: T.sign('ROOM ' + R.num, { w: 256, h: 96, size: 44 }), roughness: 0.5, transparent: true }));
      sign.scale.set(0.8, 0.3, 1); sign.position.set(0, 3.3, 0.23);
      dg.add(sign);
      const lampMat = new THREE.MeshStandardMaterial({ color: 0x40ff60, emissive: 0x40ff60, emissiveIntensity: 1.6, roughness: 0.3 });
      const lamp = Mo.P(dg, Mo.G.sphere(), lampMat, [0.62, 3.3, 0.25], 0.07);
      lamp.userData.keep = true;
      const lampGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow(), color: 0x40ff60, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
      lampGlow.scale.set(0.5, 0.5, 1); lampGlow.position.set(0.62, 3.3, 0.3); dg.add(lampGlow);
      R.lamp = { mat: lampMat, glow: lampGlow };
      R.doorObj = { leaf: d.userData.leaf, open: 0, x: cx(c), z: cx(r), side };
      W.doors.push(R.doorObj);
      // door jambs are solid
      const jx = cx(c);
      colliders.push({ x0: c * CELL, x1: jx - 0.56, z0: r * CELL, z1: (r + 1) * CELL });
      colliders.push({ x0: jx + 0.56, x1: (c + 1) * CELL, z0: r * CELL, z1: (r + 1) * CELL });
      const inner = Mo.P(dg, Mo.G.box(), Mo.C(0x3a2e3a, 0.9), [0, 1.3, -0.8], [0.02, 0.02, 0.02]);
      inner.visible = false;
      // spots inside the room
      R.doorIn = { x: cx(c), z: side === 1 ? R.z1 - 0.6 : R.z0 + 0.6 };
      R.doorOut = { x: cx(c), z: side === 1 ? (r + 1) * CELL + 0.7 : r * CELL - 0.7 };
    }

    // --- the big front doors ---
    const E = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (at(c, r) === 'E') E.push([c, r]);
    const ec0 = Math.min(...E.map((e) => e[0])), ec1 = Math.max(...E.map((e) => e[0])), er = E[0][1];
    const ex = (ec0 + ec1 + 1) / 2 * CELL, ez = er * CELL;
    const fd = Mo.frontDoors();
    fd.position.set(ex, 0, ez + 0.05);
    props.add(fd);
    W.frontDoors = { leaves: fd.userData.leaves, open: 0 };
    // grand stone arch around them
    const arch = Mo.C(0x4a3e52, 0.8);
    for (const sx of [-1, 1]) {
      Mo.P(props, Mo.G.rbox(0.8, 5.2, 0.6, 0.06), arch, [ex + sx * 2.6, 2.6, ez - 0.1]);
      Mo.P(props, Mo.G.sphere(), Mo.M.gold(), [ex + sx * 2.6, 5.35, ez - 0.1], 0.2);
    }
    Mo.P(props, Mo.G.rbox(5.8, 0.5, 0.6, 0.06), arch, [ex, 4.75, ez - 0.1]);
    const hsign = new THREE.Mesh(Mo.G.plane(), new THREE.MeshStandardMaterial({ map: T.sign('HOTEL MONSTRANIA', { w: 1024, h: 160, size: 96, font: 'Creepster, Fredoka, sans-serif', color: '#7aff6a' }), transparent: true, emissive: 0x204020, roughness: 0.5 }));
    hsign.scale.set(5.6, 0.9, 1); hsign.position.set(ex, 5.7, ez - 0.42);
    hsign.rotation.y = Math.PI;   // faces into the lobby
    hsign.userData.keep = true;
    props.add(hsign);
    // outside: steps, a sky and a spooky path
    const skyOut = new THREE.Mesh(Mo.G.plane(), skyMat);
    skyOut.scale.set(9, 6, 1); skyOut.position.set(ex, 2.6, (er + 1) * CELL - 0.05); skyOut.rotation.y = Math.PI;
    skyOut.userData.keep = true;
    props.add(skyOut);
    horizRect('floorStone', ec0 * CELL, er * CELL, (ec1 + 1) * CELL, (er + 1) * CELL, 0, true, 3);
    horizRect('stoneDark', ec0 * CELL, er * CELL, (ec1 + 1) * CELL, (er + 1) * CELL, 4.4, false, 3);
    wallRect('stoneDark', ec0 * CELL, (er + 1) * CELL, ec0 * CELL, er * CELL, 0, 4.4, 1, 0, 3);
    wallRect('stoneDark', (ec1 + 1) * CELL, er * CELL, (ec1 + 1) * CELL, (er + 1) * CELL, 0, 4.4, -1, 0, 3);
    W.entrance = { x: ex, z: ez + 1.1, inside: { x: ex, z: ez - 1.2 } };
    addLight(ex, 3.2, ez - 1.5, 0xffa860, 14, 8, 0.1);
  }

  // ---------- furniture from the map letters ----------
  function runs(letter) {
    // groups of the same letter next to each other
    const seen = new Set(), out = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (at(c, r) !== letter || seen.has(c + ',' + r)) continue;
      const cells = [], stack = [[c, r]];
      seen.add(c + ',' + r);
      while (stack.length) {
        const [a, b] = stack.pop(); cells.push([a, b]);
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const k = (a + dx) + ',' + (b + dz);
          if (at(a + dx, b + dz) === letter && !seen.has(k)) { seen.add(k); stack.push([a + dx, b + dz]); }
        }
      }
      const c0 = Math.min(...cells.map((q) => q[0])), c1 = Math.max(...cells.map((q) => q[0]));
      const r0 = Math.min(...cells.map((q) => q[1])), r1 = Math.max(...cells.map((q) => q[1]));
      out.push({ cells, c0, c1, r0, r1, x: (c0 + c1 + 1) / 2 * CELL, z: (r0 + r1 + 1) / 2 * CELL, w: (c1 - c0 + 1) * CELL, d: (r1 - r0 + 1) * CELL });
    }
    return out;
  }
  function buildProps() {
    // lobby bounds
    let lx0 = 99, lx1 = 0, lz0 = 99, lz1 = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (zone(at(c, r)) === 'lobby') { lx0 = Math.min(lx0, c); lx1 = Math.max(lx1, c); lz0 = Math.min(lz0, r); lz1 = Math.max(lz1, r); }
    const L = { x0: lx0 * CELL, x1: (lx1 + 1) * CELL, z0: lz0 * CELL, z1: (lz1 + 1) * CELL };
    L.cx = (L.x0 + L.x1) / 2; L.cz = (L.z0 + L.z1) / 2;
    W.lobby = L;

    // front desk (faces south, toward the guests)
    for (const run of runs('F')) {
      const d = Mo.frontDesk(run.w - 0.3);
      place(d, run.x, 0, run.z);
      W.desk = { x: run.x, z: run.z, w: run.w, bell: d.userData.bell };
      const rack = Mo.keyRack(Math.min(4.2, run.w));
      place(rack, run.x, 0.9, L.z0 + 0.02);
      addLight(run.x, 2.2, run.z + 0.8, 0xffb070, 10, 7, 0.05);
      // a sign over the desk
      const s = new THREE.Mesh(Mo.G.plane(), new THREE.MeshStandardMaterial({ map: T.sign('RECEPTION', { w: 512, h: 110, size: 60 }), transparent: true, roughness: 0.5 }));
      s.scale.set(2.2, 0.47, 1); s.position.set(run.x, 3.0, L.z0 + 0.06); s.userData.keep = true;
      props.add(s);
      // where guests wait in line
      const q = [];
      const qx = run.x, qz = (run.r1 + 1) * CELL + 0.75;
      for (let i = 0; i < 3; i++) q.push({ x: qx, z: qz + i * 1.1 });
      for (let i = 0; i < 8; i++) q.push({ x: qx + 1.3 + i * 1.1, z: qz + 2.2 + (i % 2) * 0.3 });
      W.queue = q;
    }
    // the grand staircase and the balcony
    for (const run of runs('X')) {
      const topY = 3.8;
      place(Mo.staircase(run.w, run.d, topY), run.x, 0, run.z);
      const bal = Mo.balcony(L.x1 - L.x0, 1.4, topY);
      place(bal, L.cx, 0, L.z0 + 0.7);
      // huge portrait of the boss on the balcony wall
      const big = Mo.portraitFrame('vampire', 1.8, 2.3);
      place(big, run.x, topY + 1.9, L.z0 + 0.02);
      big.userData.big = true;
      W.decor.bossPortrait = big;
      Mo.P(props, Mo.G.rbox(1.4, 2.6, 0.12, 0.05), Mo.M.darkWood(), [run.x - 2.3, topY + 1.3, L.z0 + 0.06]);
      Mo.P(props, Mo.G.rbox(1.4, 2.6, 0.12, 0.05), Mo.M.darkWood(), [run.x + 2.3, topY + 1.3, L.z0 + 0.06]);
      for (const sx of [-1, 1]) { const sc = Mo.sconce(); place(sc, run.x + sx * 1.35, topY + 2.1, L.z0 + 0.02); }
      addLight(run.x, topY + 1.8, L.z0 + 1.5, 0xffa060, 16, 9, 0.06);
      addLight(run.x, 1.6, run.z + run.d / 2 + 0.3, 0x6aff8a, 6, 5, 0.05);
    }
    // fireplace
    for (const run of runs('f')) {
      const c = run.c0, r = run.r0;
      const yaw = awayFromWall(c, r);
      const len = Math.max(run.w, run.d) - 0.3;
      const fp = Mo.fireplace(len);
      const back = 0.4;
      const px = run.x - Math.sin(yaw) * (CELL / 2 - back), pz = run.z - Math.cos(yaw) * (CELL / 2 - back);
      place(fp, px, 0, pz, yaw);
      dyn.push({ type: 'fire', obj: fp.userData.fire });
      addLight(px + Math.sin(yaw) * 1.0, 1.0, pz + Math.cos(yaw) * 1.0, 0xff7a2a, 22, 9, 0.35);
      W.fireplace = { x: px, z: pz, yaw };
      const portrait = Mo.portraitFrame('moon', 1.0, 1.2);
      place(portrait, px - Math.sin(yaw) * 0.38, 2.75, pz - Math.cos(yaw) * 0.38, yaw);
      W.decor.portraits.push(portrait);
    }
    // sofas face the fireplace
    for (const run of runs('c')) {
      const len = Math.max(run.w, run.d) - 0.2;
      let yaw = 0;
      if (W.fireplace) yaw = Math.atan2(W.fireplace.x - run.x, W.fireplace.z - run.z);
      place(Mo.sofa(len, 0x5a2a7a), run.x, 0, run.z, Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2));
    }
    const small = { t: () => Mo.roundTable(), p: () => Mo.plant(), A: () => Mo.armor(), g: () => Mo.grandClock() };
    for (const L2 of 'tpAg') {
      for (const run of runs(L2)) {
        const yaw = awayFromWall(run.c0, run.r0);
        const o = small[L2]();
        let x = run.x, z = run.z;
        if (L2 !== 't') { x -= Math.sin(yaw) * 0.3; z -= Math.cos(yaw) * 0.3; }
        place(o, x, 0, z, yaw);
        if (L2 === 'p') dyn.push({ type: 'plant', obj: o });
        if (L2 === 'g') dyn.push({ type: 'clock', obj: o });
        if (L2 === 't') {
          addLight(x, 1.3, z, 0xffa050, 5, 4.5, 0.2);
          // two armchairs next to the table
          for (const s of [-1, 1]) {
            const ch = Mo.armchair(s < 0 ? 0x2a6a5a : 0x7a1a3a);
            place(ch, x + s * 0.95, 0, z, -s * Math.PI / 2);
          }
        }
      }
    }
    // kitchen stations and supply shelves
    let ki = 0, si = 0;
    for (const letter of 'ks') {
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (at(c, r) !== letter) continue;
        const kind = letter === 'k' ? MH.KITCHEN[ki++] : MH.SUPPLIES[si++];
        const yaw = awayFromWall(c, r);
        let obj;
        if (kind === 'cauldron' || kind === 'potion') {
          obj = Mo.cauldron(); dyn.push({ type: 'cauldron', obj });
          if (kind === 'potion') for (const sx of [-1, 1]) { const it = Mo.item('potion'); it.position.set(sx * 0.52, 0.955, 0.05); it.scale.setScalar(1.3); obj.add(it); }
        }
        else if (kind === 'sink') obj = Mo.sink();
        else if (kind === 'shelf' || !kind) {
          obj = Mo.shelf();
          // random boxes and jars on the extra shelves
          for (const y of [0.12, 0.67, 1.22]) for (let i = 0; i < 3; i++) {
            const col = [0x6a4a2a, 0x3a5a7a, 0x7a2a4a, 0x4a6a3a][(i + Math.floor(y * 3)) % 4];
            Mo.P(obj, Mo.G.rbox(0.28, 0.3, 0.3, 0.03), Mo.C(col, 0.8), [(i - 1) * 0.38, y + 0.17, 0]);
          }
        } else obj = Mo.station(kind, letter === 's');
        const back = letter === 'k' ? 0.42 : 0.3;
        const px = cx(c) - Math.sin(yaw) * (CELL / 2 - back), pz = cx(r) - Math.cos(yaw) * (CELL / 2 - back);
        place(obj, px, 0, pz, yaw);
        if (MH.ITEMS[kind]) {
          const st = { kind, x: px, z: pz, y: letter === 'k' ? 1.1 : 1.3, use: { x: cx(c) + Math.sin(yaw) * 1.3, z: cx(r) + Math.cos(yaw) * 1.3 } };
          // floating label
          const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.sign(MH.ITEMS[kind].name.toUpperCase(), { w: 512, h: 100, size: 52, bg: 'rgba(30,10,40,0.85)' }), transparent: true, depthWrite: false }));
          lab.scale.set(1.25, 0.245, 1); lab.position.set(px, letter === 'k' ? 2.0 : 2.35, pz);
          props.add(lab);
          st.label = lab;
          W.stations.push(st);
        }
        if (kind === 'cauldron' || kind === 'potion') addLight(px, 1.8, pz + 0.6, 0x6aff4a, 9, 6, 0.3);
      }
    }
    // kitchen & supply room lights and signs
    for (const zn of ['kitchen', 'supply']) {
      const cells = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (zone(at(c, r)) === zn) cells.push([c, r]);
      if (!cells.length) continue;
      const x = cells.reduce((a, q) => a + cx(q[0]), 0) / cells.length, z = cells.reduce((a, q) => a + cx(q[1]), 0) / cells.length;
      const Hh = HEIGHT[zn];
      const lamp = Mo.chandelier(0.55);
      place(lamp, x, Hh - 0.8, z);
      lamp.children[0].scale.y = 0.8; lamp.children[0].position.y = 0.4;
      addLight(x, Hh - 1.0, z, 0xffc890, 16, 10, 0.05);
      W[zn] = { x, z };
    }
    // lobby chandelier + rug + runner
    const ch = Mo.chandelier(1.6);
    place(ch, L.cx, 5.6, L.cz + 1.5);
    ch.children[0].scale.y = 2.9; ch.children[0].position.y = 1.45;
    addLight(L.cx, 5.0, L.cz + 1.5, 0xffc080, 60, 18, 0.04, 'chandelier');
    const rug = new THREE.Mesh(Mo.G.plane(), new THREE.MeshStandardMaterial({ map: T.roundRug(), roughness: 0.95, transparent: true, alphaTest: 0.5 }));
    rug.rotation.x = -Math.PI / 2; rug.scale.set(6.5, 6.5, 1); rug.position.set(L.cx + 0.75, 0.012, L.cz + 1.5);
    rug.userData.keep = true; rug.renderOrder = 1;
    props.add(rug);
    if (W.entrance) horizRect('carpet', W.entrance.x - 0.9, L.cz + 4.7, W.entrance.x + 0.9, L.z1, 0.01, true, 1.8, true);
    // wall sconces in the lobby
    const lsc = [[L.x0, 3.5, 'x'], [L.x0, 17.5, 'x'], [L.x1, 3.5, 'x'], [L.x1, 13.5, 'x'], [L.x1, 17.5, 'x']];
    for (const [x, z] of lsc) {
      const sc = Mo.sconce();
      const inside = x === L.x0 ? 1 : -1;
      place(sc, x + inside * 0.02, 2.7, z, inside * Math.PI / 2);
      addLight(x + inside * 0.6, 2.9, z, 0xffa860, 7, 5.5, 0.15);
    }
    // portraits in the lobby
    const pk = T.PORTRAITS;
    [[L.x1 - 0.02, 15.5, -1], [L.x0 + 0.02, 5.5, 1]].forEach(([x, z, s], i) => {
      const p = Mo.portraitFrame(pk[(i + 1) % pk.length], 1.0, 1.3);
      place(p, x, 3.2, z, s * Math.PI / 2);
      W.decor.portraits.push(p);
    });
    W.playerStart = { x: 0, z: 0 };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (at(c, r) === 'P') W.playerStart = { x: cx(c), z: cx(r) };
    // places where guests like to hang out
    W.hangouts = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (zone(at(c, r)) !== 'lobby' || solidCell(c, r)) continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if ('ctf'.includes(at(c + dx, r + dz))) { W.hangouts.push({ x: cx(c), z: cx(r), lookX: cx(c + dx), lookZ: cx(r + dz) }); break; }
    }
  }

  // ---------- guest room furniture ----------
  function furnishRooms() {
    const colors = [0x6a2a8a, 0x8a1a3a, 0x1a6a6a, 0x3a2a8a, 0x6a2a4a, 0x2a5a3a, 0x7a3a1a, 0x4a1a6a];
    for (const R of W.rooms) {
      const back = R.doorSide === 1 ? -1 : 1; // direction from door toward window (in z)
      const zBack = back === -1 ? R.z0 : R.z1;
      const rowBack = back === -1 ? R.r0 : R.r1;
      const faceIn = back === -1 ? 0 : Math.PI; // yaw facing away from the back wall
      const mark = (c, r) => { blocked[r][c] = true; };
      // coffin bed along the left wall, head toward the window wall
      const bed = Mo.coffinBed(colors[(R.num - 1) % colors.length]);
      const bx = R.x0 + 0.75, bz = zBack - back * 1.55;
      place(bed, bx, 0, bz, back === -1 ? 0 : Math.PI);
      mark(R.c0, rowBack); mark(R.c0, rowBack - back);
      R.bed = { x: bx, z: bz };
      // nightstand with a lantern
      const ns = Mo.nightstand();
      const nsz = zBack - back * 3.2;
      place(ns, R.x0 + 0.35, 0, nsz, Math.PI / 2);
      colliders.push({ x0: R.x0, x1: R.x0 + 0.62, z0: nsz - 0.3, z1: nsz + 0.3 });
      addLight(R.x0 + 0.8, 1.4, nsz, 0xffa860, 9, 6, 0.12, 'room' + R.num);
      addLight(R.center.x + 0.5, 3.0, R.center.z, 0xd8a0ff, 7, 6.5, 0, 'roomTop' + R.num);
      // wardrobe in the back right corner
      const wd = Mo.wardrobe();
      place(wd, R.x1 - 0.32, 0, zBack - back * 0.75, -Math.PI / 2);
      mark(R.c1, rowBack);
      // armchair
      const ac = Mo.armchair(colors[(R.num + 3) % colors.length]);
      place(ac, R.x1 - 0.6, 0, zBack - back * 2.3, -Math.PI / 2 - back * 0.4 + (back === 1 ? 0 : 0));
      mark(R.c1, rowBack - back);
      // rug
      const rg = Mo.rug(2.8, 3.4, [280, 330, 180, 250, 300, 140, 20, 270][(R.num - 1) % 8]);
      rg.position.set(R.center.x + 0.2, 0.011, R.center.z); rg.userData.keep = true; rg.renderOrder = 1;
      props.add(rg);
      // portrait above the bed
      const p = Mo.portraitFrame(T.PORTRAITS[R.num % T.PORTRAITS.length], 0.7, 0.9);
      place(p, R.x0 + 0.02, 2.1, bz + back * 0.2, Math.PI / 2);
      W.decor.portraits.push(p);
      // sconce next to the window
      const sc = Mo.sconce();
      place(sc, R.x1 - 0.02, 2.3, R.center.z + back * 0.5, -Math.PI / 2);
      // where the guest likes to stand and where messes can appear
      R.spot = { x: R.center.x + 0.3, z: R.center.z - back * 0.2 };
      R.messSpots = [];
      for (const [c, r] of R.cells) {
        if (blocked[r][c]) continue;
        const x = cx(c), z = cx(r);
        if (Math.abs(x - R.doorIn.x) < 0.8 && Math.abs(z - R.doorIn.z) < 0.9) continue;
        R.messSpots.push({ x, z });
      }
    }
  }

  // ---------- hallway decorations ----------
  function decorateHalls() {
    // find the hallway squares
    const hall = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (at(c, r) === '.') hall.push([c, r]);
    if (!hall.length) return;
    const hx0 = Math.min(...hall.map((q) => q[0])) * CELL, hx1 = (Math.max(...hall.map((q) => q[0])) + 1) * CELL;
    const hz0 = Math.min(...hall.map((q) => q[1])) * CELL, hz1 = (Math.max(...hall.map((q) => q[1])) + 1) * CELL;
    const hzc = (hz0 + hz1) / 2;
    W.hall = { x0: hx0, x1: hx1, z0: hz0, z1: hz1 };
    // long red carpet
    horizRect('carpet', hx0 - 1.5, hzc - 0.85, hx1 - 0.6, hzc + 0.85, 0.01, true, 1.7, true);
    // ceiling beams
    for (let x = hx0 + 1.5; x < hx1; x += 3) Mo.P(props, Mo.G.box(), Mo.M.darkWood(), [x, 3.85, hzc], [0.25, 0.3, hz1 - hz0]);
    // sconces & portraits on both walls, between the doors
    let k = 0;
    for (let c = Math.floor(hx0 / CELL); c < Math.ceil(hx1 / CELL); c++) {
      for (const [zWall, s] of [[hz0, 1], [hz1, -1]]) {
        const rWall = s === 1 ? W.cell(hz0) - 1 : W.cell(hz1);
        const ch = at(c, rWall);
        if (ch !== '#') continue;
        const nL = at(c - 1, rWall), nR = at(c + 1, rWall);
        if ('dD'.includes(nL) || 'dD'.includes(nR)) continue;
        const x = cx(c);
        const yaw = s === 1 ? 0 : Math.PI;
        if ((c + (s === 1 ? 0 : 1)) % 3 === 0) {
          const sc = Mo.sconce();
          place(sc, x, 2.5, zWall + s * 0.02, yaw);
          addLight(x, 2.6, zWall + s * 0.6, 0xffa860, 11, 7, 0.14);
        } else if ((c + (s === 1 ? 1 : 0)) % 3 === 1) {
          const p = Mo.portraitFrame(T.PORTRAITS[k++ % T.PORTRAITS.length], 0.75, 0.95);
          place(p, x, 2.2, zWall + s * 0.02, yaw);
          W.decor.portraits.push(p);
        }
      }
    }
    // direction signs
    const signs = [
      ['← LOBBY', hx0 + 2.5, hz0 + 0.03, 0],
      ['KITCHEN ↑', hx1 - 5.5, hz0 + 0.03, 0],
      ['SUPPLIES ↓', hx1 - 5.5, hz1 - 0.03, Math.PI],
    ];
    for (const [text, x, z, yaw] of signs) {
      const s = new THREE.Mesh(Mo.G.plane(), new THREE.MeshStandardMaterial({ map: T.sign(text, { w: 512, h: 110, size: 58 }), transparent: true, roughness: 0.5 }));
      s.scale.set(1.5, 0.32, 1); s.position.set(x, 3.2, z); s.rotation.y = yaw; s.userData.keep = true;
      props.add(s);
    }
    // sign above the archway into the rooms
    const arch = new THREE.Mesh(Mo.G.plane(), new THREE.MeshStandardMaterial({ map: T.sign('ROOMS  1 - 8  →', { w: 512, h: 110, size: 58 }), transparent: true, roughness: 0.5 }));
    arch.scale.set(2.2, 0.47, 1); arch.position.set(hx0 - 1.5 - 0.03, 4.2, hzc); arch.rotation.y = -Math.PI / 2; arch.userData.keep = true;
    props.add(arch);

    // signs that show up when the hotel is doing great / badly
    for (let i = 0; i < 6; i++) {
      const junk = Mo.mess(i % 3);
      junk.userData.fumes.visible = false;
      const spots = [[W.lobby.x0 + 2, W.lobby.z1 - 2.5], [W.lobby.x1 - 2.5, W.lobby.z0 + 5], [hx0 + 6, hzc + 0.9], [hx0 + 20, hzc - 0.9], [hx1 - 12, hzc + 0.9], [W.lobby.cx + 3, W.lobby.z1 - 5]];
      junk.position.set(spots[i][0], 0, spots[i][1]);
      junk.userData.dynamic = true; junk.visible = false;
      props.add(junk);
      W.decor.shabby.push(junk);
    }
    // fancy things: gold statues & black rose vases
    const fancySpots = [[W.lobby.x0 + 0.7, W.lobby.cz + 0.5], [W.lobby.x1 - 0.7, W.lobby.cz - 3], [W.lobby.cx - 4, W.lobby.z1 - 0.8], [W.lobby.cx + 5, W.lobby.z1 - 0.8]];
    fancySpots.forEach(([x, z], i) => {
      const g = new THREE.Group();
      Mo.P(g, Mo.lathe([[0.001, 0], [0.25, 0], [0.22, 0.1], [0.15, 0.9], [0.22, 1.0], [0.001, 1.0]]), Mo.C(0x2a1a2a, 0.3, 0.2));
      if (i % 2 === 0) {
        Mo.P(g, Mo.lathe([[0.001, 0], [0.1, 0.02], [0.16, 0.2], [0.08, 0.4], [0.12, 0.45], [0.001, 0.45]]), Mo.M.gold(), [0, 1.0, 0]);
        for (let k2 = 0; k2 < 7; k2++) {
          const a = k2 / 7 * Math.PI * 2;
          Mo.P(g, Mo.G.cyl(), Mo.C(0x2a5a2a, 0.7), [Math.cos(a) * 0.05, 1.6, Math.sin(a) * 0.05], [0.008, 0.4, 0.008], [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3]);
          Mo.P(g, Mo.G.sphere(), Mo.C(0x1a0a14, 0.5), [Math.cos(a) * 0.13, 1.82, Math.sin(a) * 0.13], [0.05, 0.045, 0.05]);
        }
      } else {
        // golden bat statue
        const bat = Mo.P(g, new THREE.ExtrudeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, -0.08); s.quadraticCurveTo(0.2, -0.3, 0.7, -0.2); s.quadraticCurveTo(0.58, -0.08, 0.6, 0.06); s.quadraticCurveTo(0.36, 0, 0.14, 0.14); s.quadraticCurveTo(0.06, 0.08, 0, 0.18); s.quadraticCurveTo(-0.06, 0.08, -0.14, 0.14); s.quadraticCurveTo(-0.36, 0, -0.6, 0.06); s.quadraticCurveTo(-0.58, -0.08, -0.7, -0.2); s.quadraticCurveTo(-0.2, -0.3, 0, -0.08); return s; })(), { depth: 0.06, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), Mo.M.gold(), [0, 1.35, 0], 0.55, [Math.PI, 0, 0]);
        bat.rotation.set(Math.PI, 0, 0);
      }
      g.position.set(x, 0, z);
      g.userData.dynamic = true; g.visible = false;
      props.add(g);
      W.decor.fancy.push(g);
    });
  }

  // ============================================================
  //  LIGHTS
  //  The hotel has lots of lamps, but a computer can only draw a
  //  few real lights at once, so we move a small "pool" of lights
  //  to the lamps closest to you.
  // ============================================================
  const pool = [];
  function buildLights() {
    const n = MH.lowGfx ? 6 : 12;
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 8, 2);
      l.userData.anchor = null;
      scene.add(l);
      pool.push(l);
    }
    scene.add(new THREE.HemisphereLight(0x7a6ab0, 0x2a1418, 0.75));
    const flash = new THREE.DirectionalLight(0xb8c8ff, 0);
    flash.position.set(-10, 20, -20);
    scene.add(flash);
    W.flashLight = flash;
  }
  let lightTimer = 0;
  function updateLights(dt, t, cam) {
    lightTimer -= dt;
    if (lightTimer <= 0) {
      lightTimer = 0.25;
      // score every lamp: close and in front of you = better
      const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw);
      for (const a of anchors) {
        const dx = a.x - cam.x, dz = a.z - cam.z;
        const d = Math.hypot(dx, dz, a.y - 1.6);
        const front = (dx * fx + dz * fz) / (d + 0.01);
        a.score = d - front * 2.5 - Math.min(a.intensity, 30) * 0.08;
      }
      const best = anchors.slice().sort((p, q) => p.score - q.score).slice(0, pool.length);
      // keep lights that are still wanted where they are (less popping)
      const free = [];
      for (const l of pool) { if (l.userData.anchor && best.includes(l.userData.anchor)) best.splice(best.indexOf(l.userData.anchor), 1); else free.push(l); }
      for (const l of free) { const a = best.shift(); l.userData.anchor = a || null; l.userData.fade = 0; }
    }
    for (const l of pool) {
      const a = l.userData.anchor;
      if (!a) { l.intensity = 0; continue; }
      l.userData.fade = Math.min(1, (l.userData.fade || 0) + dt * 3);
      l.position.set(a.x, a.y, a.z);
      l.color.copy(a.color);
      l.distance = a.dist;
      let fl = 1;
      if (a.flicker) fl = 1 - a.flicker * (0.5 + 0.5 * Math.sin(t * 13 + a.off) * Math.sin(t * 7.3 + a.off * 2));
      l.intensity = a.intensity * fl * l.userData.fade * a.mult * W.lightMult;
    }
  }
  W.lightMult = 1;

  // ============================================================
  //  RAIN (for windows that blow open)
  // ============================================================
  let rain;
  function buildRain() {
    const n = 300;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    rain = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xa0c0ff, size: 0.022, transparent: true, opacity: 0.7, depthWrite: false }));
    rain.frustumCulled = false; rain.visible = false;
    rain.userData.drops = Array.from({ length: n }, () => ({ w: null, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0 }));
    scene.add(rain);
  }
  function updateRain(dt) {
    const open = W.windows.filter((w) => w.open > 0.3);
    rain.visible = open.length > 0;
    if (!rain.visible) return;
    const p = rain.geometry.attributes.position;
    rain.userData.drops.forEach((d, i) => {
      d.life -= dt;
      if (d.life <= 0) {
        const w = open[i % open.length];
        const inx = -w.dx, inz = -w.dz;
        d.x = w.mid.x + (Math.random() - 0.5) * 1.1 * (w.dz !== 0 ? 1 : 0) + w.dx * 0.3;
        d.z = w.mid.z + (Math.random() - 0.5) * 1.1 * (w.dx !== 0 ? 1 : 0) + w.dz * 0.3;
        d.y = w.hole.y0 + Math.random() * (w.hole.y1 - w.hole.y0);
        const sp = 2 + Math.random() * 3;
        d.vx = inx * sp; d.vz = inz * sp; d.vy = -1 - Math.random() * 2;
        d.life = 0.6 + Math.random() * 0.6;
      }
      d.vy -= 9 * dt;
      d.x += d.vx * dt; d.y = Math.max(0.02, d.y + d.vy * dt); d.z += d.vz * dt;
      p.setXYZ(i, d.x, d.y, d.z);
    });
    p.needsUpdate = true;
  }

  // ============================================================
  //  EVERY FRAME
  // ============================================================
  let flashT = 0;
  W.lightning = function () { flashT = 0.6; };
  function update(dt, t, cam, actors) {
    updateLights(dt, t, cam);
    updateRain(dt);
    // lightning flash
    if (flashT > 0) {
      flashT -= dt;
      const f = flashT > 0.45 ? 1 : flashT > 0.3 ? 0.2 : flashT > 0.15 ? 0.8 : Math.max(0, flashT / 0.15) * 0.4;
      W.flashLight.intensity = f * 2.5;
      W.skyMat.color.setScalar(1 + f * 2.5);
    } else { W.flashLight.intensity = 0; W.skyMat.color.setScalar(1); }
    // moving things
    for (const d of dyn) {
      if (d.type === 'fire') {
        d.obj.userData.flames.forEach((f, i) => { f.scale.y = f.userData.base * (0.75 + 0.35 * Math.abs(Math.sin(t * (6 + i) + f.userData.off))); f.rotation.z = Math.sin(t * 4 + i) * 0.12; });
      } else if (d.type === 'plant') {
        d.obj.userData.heads.forEach((h, i) => {
          const snap = Math.max(0, Math.sin(t * 0.9 + i * 2.1)) ** 12;
          const open = 0.55 - snap * 0.55 + Math.sin(t * 3 + i) * 0.05;
          h.userData.top.rotation.z = open * 0.8; h.userData.bot.rotation.z = -open * 0.8;
          h.parent.rotation.y = Math.sin(t * 0.7 + i) * 0.3;
        });
      } else if (d.type === 'clock') {
        const u = d.obj.userData;
        u.pend.rotation.z = Math.sin(t * Math.PI) * 0.25;
        u.hands.children[0].rotation.z = -t * 0.01; u.hands.children[1].rotation.z = -t * 0.12;
      } else if (d.type === 'cauldron') {
        d.obj.userData.bubbles.children.forEach((b) => { const k = (t * 0.8 + b.userData.off) % 1; b.position.y = k * 0.06; b.scale.setScalar(0.02 + k * 0.03); });
      }
    }
    // candle flames flicker (cheap: only scale the shared groups we find once)
    if (W.glowCloud) { W.glowCloud.material.opacity = (0.68 + 0.08 * Math.sin(t * 9) * Math.sin(t * 5.3)) * Math.min(1.2, W.lightMult); W.glowCloud.material.size = 0.3 + 0.02 * Math.sin(t * 7); }
    // doors open when someone is close
    for (const d of W.doors) {
      let near = false;
      for (const a of actors) if (Math.abs(a.x - d.x) < 1.3 && Math.abs(a.z - d.z) < 2.2) { near = true; break; }
      const was = d.open;
      d.open += ((near ? 1 : 0) - d.open) * Math.min(1, dt * 5);
      if (near && was < 0.05 && W.onDoor) W.onDoor(d);
      d.leaf.rotation.y = d.open * 1.65;
    }
    const fd = W.frontDoors;
    let nearE = false;
    for (const a of actors) if (a.guest && U.dist(a.x, a.z, W.entrance.x, W.entrance.z - 1) < 3.2) nearE = true;
    const wasE = fd.open;
    fd.open += ((nearE ? 1 : 0) - fd.open) * Math.min(1, dt * 3);
    if (nearE && wasE < 0.05 && W.onFrontDoor) W.onFrontDoor();
    fd.leaves[0].rotation.y = fd.open * 1.4; fd.leaves[1].rotation.y = -fd.open * 1.4;
    // windows banging in the storm
    for (const w of W.windows) {
      w.open += (w.target - w.open) * Math.min(1, dt * (w.target > w.open ? 6 : 8));
      if (!w.panes) continue;
      const bang = w.target > 0 ? Math.sin(t * 7 + w.c) * 0.25 + Math.sin(t * 2.3) * 0.15 : 0;
      w.panes.userData.panes[0].rotation.y = -(w.open * 1.4 + bang * w.open);
      w.panes.userData.panes[1].rotation.y = (w.open * 1.4 + bang * w.open);
      if (w.curtains) w.curtains.children.forEach((c) => { if (c.userData.side) { c.rotation.x = -w.open * (0.5 + 0.3 * Math.sin(t * 9 + c.userData.side)); c.position.z = 0.06 + w.open * 0.3; } });
    }
  }

  // ============================================================
  //  WALKING & COLLISIONS
  // ============================================================
  function circleBox(p, r, x0, z0, x1, z1) {
    const qx = U.clamp(p.x, x0, x1), qz = U.clamp(p.z, z0, z1);
    let dx = p.x - qx, dz = p.z - qz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return;
    if (d2 < 1e-8) { // center inside the box: push out the short way
      const l = p.x - x0, rr = x1 - p.x, tp = p.z - z0, bt = z1 - p.z;
      const m = Math.min(l, rr, tp, bt);
      if (m === l) p.x = x0 - r; else if (m === rr) p.x = x1 + r; else if (m === tp) p.z = z0 - r; else p.z = z1 + r;
      return;
    }
    const d = Math.sqrt(d2);
    p.x = qx + dx / d * r; p.z = qz + dz / d * r;
  }
  // push a circle out of walls (p = {x, z})
  W.collide = function (p, r, guest) {
    for (let k = 0; k < 2; k++) {
      const c0 = W.cell(p.x - r), c1 = W.cell(p.x + r), r0 = W.cell(p.z - r), r1 = W.cell(p.z + r);
      for (let rr = r0; rr <= r1; rr++) for (let c = c0; c <= c1; c++) {
        if (solidCell(c, rr, guest)) circleBox(p, r, c * CELL, rr * CELL, (c + 1) * CELL, (rr + 1) * CELL);
      }
      for (const b of colliders) circleBox(p, r, b.x0, b.z0, b.x1, b.z1);
    }
  };
  // can you walk in a straight line from A to B?
  W.clearLine = function (x0, z0, x1, z1, guest, rad = 0.3) {
    const d = U.dist(x0, z0, x1, z1);
    const n = Math.ceil(d / 0.25);
    for (let i = 0; i <= n; i++) {
      const x = U.lerp(x0, x1, i / n), z = U.lerp(z0, z1, i / n);
      for (const [ox, oz] of [[rad, 0], [-rad, 0], [0, rad], [0, -rad], [0, 0]]) if (solidCell(W.cell(x + ox), W.cell(z + oz), guest)) return false;
    }
    return true;
  };
  // can you SEE from A to B? (walls block, furniture doesn't)
  W.canSee = function (x0, z0, x1, z1) {
    const d = U.dist(x0, z0, x1, z1);
    const n = Math.ceil(d / 0.3);
    for (let i = 1; i < n; i++) {
      const ch = at(W.cell(U.lerp(x0, x1, i / n)), W.cell(U.lerp(z0, z1, i / n)));
      if (isWall(ch)) return false;
    }
    return true;
  };
  // find a path (a list of points) using a flood fill over the map squares
  W.path = function (x0, z0, x1, z1) {
    const sc = W.cell(x0), sr = W.cell(z0), tc = W.cell(x1), tr = W.cell(z1);
    const key = (c, r) => r * COLS + c;
    const prev = new Map();
    const q = [[tc, tr]];
    prev.set(key(tc, tr), -1);
    let found = false;
    while (q.length) {
      const [c, r] = q.shift();
      if (c === sc && r === sr) { found = true; break; }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dx, nr = r + dz;
        const k = key(nc, nr);
        if (prev.has(k)) continue;
        if (solidCell(nc, nr, true) && !(nc === sc && nr === sr)) continue;
        prev.set(k, key(c, r));
        q.push([nc, nr]);
      }
    }
    if (!found) return [{ x: x1, z: z1 }];
    // walk back from the start to the target
    const pts = [];
    let k = prev.get(key(sc, sr));
    while (k !== -1 && k !== undefined) {
      const c = k % COLS, r = Math.floor(k / COLS);
      pts.push({ x: cx(c), z: cx(r) });
      k = prev.get(k);
    }
    pts.push({ x: x1, z: z1 });
    // skip corners when there's a straight way (smoother walking)
    const out = [];
    let cur = { x: x0, z: z0 };
    let i = 0;
    while (i < pts.length) {
      let j = pts.length - 1;
      while (j > i && !W.clearLine(cur.x, cur.z, pts[j].x, pts[j].z, true, 0.28)) j--;
      out.push(pts[j]);
      cur = pts[j];
      i = j + 1;
    }
    return out;
  };

  // a random free spot in the lobby
  W.randomLobbySpot = function () {
    for (let k = 0; k < 50; k++) {
      const x = U.rand(W.lobby.x0 + 1, W.lobby.x1 - 1), z = U.rand(W.lobby.z0 + 4, W.lobby.z1 - 1.5);
      if (!solidCell(W.cell(x), W.cell(z), false)) return { x, z };
    }
    return { x: W.lobby.cx, z: W.lobby.cz };
  };
  W.randomHallSpot = function () {
    return { x: U.rand(W.hall.x0 + 1, W.hall.x1 - 2), z: U.rand(W.hall.z0 + 0.6, W.hall.z1 - 0.6) };
  };

  // how the hotel looks depends on the rating (0 = awful, 5 = amazing)
  W.setRating = function (rating) {
    const bad = U.clamp((3 - rating) / 2, 0, 1);    // 0 at 3 stars, 1 at 1 star
    const good = U.clamp((rating - 3.8) / 1, 0, 1);  // 0 at 3.8, 1 at 4.8
    W.decor.shabby.forEach((j, i) => { j.visible = bad > (i + 1) / (W.decor.shabby.length + 1); });
    W.decor.fancy.forEach((f, i) => { f.visible = good > (i + 0.5) / (W.decor.fancy.length + 0.5); });
    W.decor.portraits.forEach((p, i) => { p.rotation.z = bad > 0.3 && i % 2 === 0 ? (i % 4 === 0 ? 0.22 : -0.16) * bad : 0; });
    W.lightMult = 1 - bad * 0.35 + good * 0.15;
    for (const a of anchors) a.flicker = a.baseFlicker !== undefined ? a.baseFlicker : (a.baseFlicker = a.flicker);
    if (bad > 0.4) anchors.forEach((a, i) => { if (i % 3 === 0) a.flicker = Math.min(0.9, a.baseFlicker + bad * 0.6); });
  };

  // ---------- light colors for room lamps ----------
  W.setRoomLamp = function (R) {
    const col = R.status === 'free' ? 0x40ff60 : R.status === 'dirty' ? 0xffa020 : 0xff3050;
    R.lamp.mat.color.setHex(col); R.lamp.mat.emissive.setHex(col); R.lamp.glow.material.color.setHex(col);
  };

  W.build = build;
  W.update = update;
  W.colliders = colliders;
  return W;
})();
