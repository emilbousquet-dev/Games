// ============================================================
//  NINJA CAT — THE WORLD
//  Builds the 3D town from the level pictures in levels.js,
//  and knows where every wall and roof is (so cats don't walk
//  through them!).
// ============================================================
window.NC = window.NC || {};

NC.World = (function () {
  const U = NC.U;
  const T = 3;       // one square = 3 x 3 meters
  const HU = 1.5;    // one height step = 1.5 meters
  const VOID = -999; // water / sky: no floor at all

  // how each place looks
  const THEMES = {
    village: {
      wall: () => NC.Tex.shoji(), roof: () => NC.Tex.roofTiles('roofBlue', '#5a6a8a', '#262c40'), ground: () => NC.Tex.stonePath(),
      edge: () => NC.Tex.stoneBlocks(), trim: 0x2a2018,
      sky: ['#140c38', '#4a2c78', '#e890a8'], fog: 0x5a3a78, fogNear: 45, fogFar: 170,
      hemi: [0xb8a0ff, 0x402848, 1.6], moon: [0xffe8d0, 1.4], ambient: 'petals', water: false, floorPlane: 0x2a2430, moonPos: [0.5, 0.35],
    },
    docks: {
      wall: () => NC.Tex.planks('wallPlanks', '#7a5434', '#3a2414', true), roof: () => NC.Tex.roofTiles('roofRed', '#9a4434', '#3a1a14'),
      ground: () => NC.Tex.planks('dockPlanks', '#6a4a30', '#2e1c10', false), edge: () => NC.Tex.planks('dockEdge', '#4a3020', '#24160c', true), trim: 0x24160c,
      sky: ['#040818', '#0e1c44', '#2a4a80'], fog: 0x16284a, fogNear: 45, fogFar: 170,
      hemi: [0x90b0ff, 0x203048, 1.5], moon: [0xd8e8ff, 1.6], ambient: 'sparkle', water: true, moonPos: [0.35, 0.45],
    },
    forest: {
      wall: () => NC.Tex.mossStone(), roof: () => NC.Tex.grass(), ground: () => NC.Tex.grass(), edge: () => NC.Tex.mossStone(), trim: 0x2a4a20,
      sky: ['#04100a', '#123826', '#4a8a6a'], fog: 0x1e4a38, fogNear: 30, fogFar: 140,
      hemi: [0xa0ffc8, 0x203820, 1.5], moon: [0xe0ffe8, 1.3], ambient: 'fireflies', water: true, floorPlane: 0x1a3a1a, moonPos: [0.6, 0.5],
    },
    castle: {
      wall: () => NC.Tex.stoneBlocks(), roof: () => NC.Tex.roofTiles('roofDark', '#44445a', '#18181e'), ground: () => NC.Tex.stonePath(),
      edge: () => NC.Tex.stoneBlocks(), trim: 0x18181e,
      sky: ['#0c0408', '#3a1424', '#c05a34'], fog: 0x4a1e24, fogNear: 45, fogFar: 170,
      hemi: [0xffb0a0, 0x301818, 1.5], moon: [0xffd0b0, 1.5], ambient: 'embers', water: true, moonPos: [0.45, 0.3],
    },
    pagoda: {
      wall: () => NC.Tex.redLacquer(), roof: () => NC.Tex.roofTiles('roofGreen', '#2a8a74', '#0e3a32'), ground: () => NC.Tex.redLacquer(),
      edge: () => NC.Tex.redLacquer(), trim: 0xd8a830,
      sky: ['#0a0a34', '#4a2a7a', '#f0a070'], fog: 0x8a5a8a, fogNear: 50, fogFar: 190,
      hemi: [0xffd0e0, 0x403060, 1.6], moon: [0xfff0d0, 1.5], ambient: 'petals', water: false, clouds: true, moonPos: [0.55, 0.4],
    },
  };

  function build(scene, level) {
    const theme = THEMES[level.theme] || THEMES.village;
    const rows = level.map.length, cols = level.map[0].length;
    const group = new THREE.Group();
    scene.add(group);
    const rnd = U.seeded(cols * 31 + rows);

    // ---------- heights ----------
    const height = [];
    for (let r = 0; r < rows; r++) {
      height.push([]);
      for (let c = 0; c < cols; c++) {
        const ch = level.map[r][c];
        height[r].push(ch === '~' || ch === ' ' ? VOID : ch === '.' ? 0 : (parseInt(ch, 10) || 0) * HU);
      }
    }
    const hAt = (c, r) => (c < 0 || r < 0 || c >= cols || r >= rows ? VOID : height[r][c]);

    // ---------- collision boxes ----------
    const boxes = [];
    const gcols = cols + 2, grows = rows + 2; // one extra square all around
    const cells = new Array(gcols * grows).fill(null).map(() => []);
    function addBox(b) {
      b.id = boxes.length;
      boxes.push(b);
      const c0 = U.clamp(Math.floor(b.minX / T) + 1, 0, gcols - 1), c1 = U.clamp(Math.floor((b.maxX - 0.001) / T) + 1, 0, gcols - 1);
      const r0 = U.clamp(Math.floor(b.minZ / T) + 1, 0, grows - 1), r1 = U.clamp(Math.floor((b.maxZ - 0.001) / T) + 1, 0, grows - 1);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cells[r * gcols + c].push(b);
      return b;
    }
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const h = height[r][c];
      if (h === VOID) continue;
      addBox({ minX: c * T, maxX: c * T + T, minZ: r * T, maxZ: r * T + T, minY: -30, maxY: h, kind: 'tile', climb: h > 0 });
    }
    // invisible walls around the level, so nobody falls off the edge of the world
    addBox({ minX: -T, maxX: 0, minZ: -T, maxZ: rows * T + T, minY: -50, maxY: 200, kind: 'edge' });
    addBox({ minX: cols * T, maxX: cols * T + T, minZ: -T, maxZ: rows * T + T, minY: -50, maxY: 200, kind: 'edge' });
    addBox({ minX: 0, maxX: cols * T, minZ: -T, maxZ: 0, minY: -50, maxY: 200, kind: 'edge' });
    addBox({ minX: 0, maxX: cols * T, minZ: rows * T, maxZ: rows * T + T, minY: -50, maxY: 200, kind: 'edge' });

    let stamp = 0;
    const found = [];
    // all boxes near an area
    function query(minX, minZ, maxX, maxZ) {
      stamp++;
      found.length = 0;
      const c0 = U.clamp(Math.floor(minX / T) + 1, 0, gcols - 1), c1 = U.clamp(Math.floor(maxX / T) + 1, 0, gcols - 1);
      const r0 = U.clamp(Math.floor(minZ / T) + 1, 0, grows - 1), r1 = U.clamp(Math.floor(maxZ / T) + 1, 0, grows - 1);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        for (const b of cells[r * gcols + c]) { if (b.stamp !== stamp) { b.stamp = stamp; found.push(b); } }
      }
      return found;
    }
    // the highest floor under a point (not higher than y + a little step)
    function floorAt(x, z, y = 1000, step = 0.35) {
      let best = -Infinity;
      for (const b of query(x, z, x, z)) {
        if (b.kind === 'edge' || b.off) continue;
        if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && b.maxY <= y + step && b.maxY > best) best = b.maxY;
      }
      return best;
    }
    function floorBox(x, z, y, step = 0.35) {
      let best = null;
      for (const b of query(x, z, x, z)) {
        if (b.kind === 'edge' || b.off) continue;
        if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && b.maxY <= y + step && (!best || b.maxY > best.maxY)) best = b;
      }
      return best;
    }
    function solidAt(x, y, z) {
      for (const b of query(x, z, x, z)) {
        if (b.off) continue;
        if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ && y > b.minY && y < b.maxY) return b;
      }
      return null;
    }
    // can you see from a to b? (nothing solid in the way)
    function lineClear(ax, ay, az, bx, by, bz) {
      const d = Math.hypot(bx - ax, by - ay, bz - az), n = Math.ceil(d / 0.5);
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const s = solidAt(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t);
        if (s && s.kind !== 'tree' && s.kind !== 'edge') return false;
      }
      return true;
    }
    // how far can the camera go from "a" toward "b" before hitting a wall? (0..1)
    function rayFree(ax, ay, az, bx, by, bz) {
      const d = Math.hypot(bx - ax, by - ay, bz - az), n = Math.ceil(d / 0.25);
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
        for (const b of query(x - 0.3, z - 0.3, x + 0.3, z + 0.3)) {
          if (b.off || b.kind === 'edge' || b.kind === 'bamboo' || b.kind === 'tree') continue;
          if (x > b.minX - 0.3 && x < b.maxX + 0.3 && z > b.minZ - 0.3 && z < b.maxZ + 0.3 && y > b.minY && y < b.maxY + 0.3) return Math.max(0, (i - 1) / n);
        }
      }
      return 1;
    }

    // ---------- the 3D town (all squares merged into one big shape: fast!) ----------
    const parts = [[], [], [], [], []]; // roof, wall, ground, trim, edge
    const ROOF = 0, WALL = 1, GROUND = 2, TRIM = 3, EDGE = 4;
    function quad(m, p0, p1, p2, p3, n, uv, tint) {
      const a = parts[m];
      a.push({ p: [p0, p1, p2, p0, p2, p3], n, uv: [uv[0], uv[1], uv[2], uv[0], uv[2], uv[3]], tint });
    }
    function boxFaces(m, x0, y0, z0, x1, y1, z1, tint) {
      quad(m, [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [0, 1, 0], [[x0 / T, z0 / T], [x0 / T, z1 / T], [x1 / T, z1 / T], [x1 / T, z0 / T]], tint);
      quad(m, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [[0, 0], [1, 0], [1, 0.1], [0, 0.1]], tint);
      quad(m, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [[0, 0], [1, 0], [1, 0.1], [0, 0.1]], tint);
      quad(m, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [[0, 0], [1, 0], [1, 0.1], [0, 0.1]], tint);
      quad(m, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [[0, 0], [1, 0], [1, 0.1], [0, 0.1]], tint);
      quad(m, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], tint);
    }
    const bottom = theme.water ? -1.2 : theme.clouds ? -14 : -2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const h = height[r][c];
      if (h === VOID) continue;
      const x0 = c * T, x1 = x0 + T, z0 = r * T, z1 = z0 + T;
      // each house gets a slightly different color
      const bt = h > 0 ? 0.82 + rnd() * 0.22 : 0.9 + rnd() * 0.12;
      const tint = [bt, bt, bt];
      quad(h > 0 ? ROOF : GROUND, [x0, h, z0], [x0, h, z1], [x1, h, z1], [x1, h, z0], [0, 1, 0],
        [[x0 / T, z0 / T], [x0 / T, z1 / T], [x1 / T, z1 / T], [x1 / T, z0 / T]], tint);
      const sides = [
        { dc: 0, dr: 1, a: [x0, z1], b: [x1, z1], n: [0, 0, 1] },
        { dc: 0, dr: -1, a: [x1, z0], b: [x0, z0], n: [0, 0, -1] },
        { dc: 1, dr: 0, a: [x1, z1], b: [x1, z0], n: [1, 0, 0] },
        { dc: -1, dr: 0, a: [x0, z0], b: [x0, z1], n: [-1, 0, 0] },
      ];
      for (const s of sides) {
        const hn = hAt(c + s.dc, r + s.dr);
        const low = hn === VOID ? bottom : hn;
        if (low >= h) continue;
        const ua = (s.a[0] + s.a[1]) / T, ub = ua + 1;
        // walls: the bottom part is stone, the top part is the house
        quad(h > 0 ? WALL : EDGE, [s.a[0], low, s.a[1]], [s.b[0], low, s.b[1]], [s.b[0], h, s.b[1]], [s.a[0], h, s.a[1]], s.n,
          [[ua, low / T], [ub, low / T], [ub, h / T], [ua, h / T]], tint);
        // a dark roof edge that sticks out a bit
        if (h > 0) {
          const o = 0.28;
          const ex0 = Math.min(s.a[0], s.b[0]) - (s.n[0] ? 0 : 0.02), ex1 = Math.max(s.a[0], s.b[0]) + (s.n[0] ? 0 : 0.02);
          const ez0 = Math.min(s.a[1], s.b[1]), ez1 = Math.max(s.a[1], s.b[1]);
          boxFaces(TRIM, ex0 + Math.min(0, s.n[0] * o) - (s.n[0] ? 0 : 0), h - 0.22, ez0 + Math.min(0, s.n[2] * o),
            ex1 + Math.max(0, s.n[0] * o), h + 0.06, ez1 + Math.max(0, s.n[2] * o), [1, 1, 1]);
        }
      }
    }
    const mats = [
      new THREE.MeshLambertMaterial({ map: theme.roof(), vertexColors: true }),
      new THREE.MeshLambertMaterial({ map: theme.wall(), vertexColors: true }),
      new THREE.MeshLambertMaterial({ map: theme.ground(), vertexColors: true }),
      new THREE.MeshLambertMaterial({ color: theme.trim, vertexColors: true }),
      new THREE.MeshLambertMaterial({ map: theme.edge(), vertexColors: true, color: 0x9a9aa0 }),
    ];
    const pos = [], nor = [], uvs = [], col = [];
    const geo = new THREE.BufferGeometry();
    let start = 0;
    parts.forEach((list, m) => {
      for (const q of list) {
        for (let i = 0; i < 6; i++) { pos.push(...q.p[i]); nor.push(...q.n); uvs.push(...q.uv[i]); col.push(...q.tint); }
      }
      const count = list.length * 6;
      if (count) geo.addGroup(start, count, m);
      start += count;
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeBoundingSphere();
    group.add(new THREE.Mesh(geo, mats));

    const W = { level, theme, rows, cols, T, HU, VOID, group, boxes, height, hAt, query, floorAt, floorBox, solidAt, lineClear, rayFree, addBox };
    const tileCenter = (c, r) => ({ x: c * T + T / 2, z: r * T + T / 2, y: Math.max(0, hAt(c, r)) });
    W.tileCenter = tileCenter;
    W.tileOf = (x, z) => ({ c: Math.floor(x / T), r: Math.floor(z / T) });

    // ---------- water, clouds and the sky ----------
    const big = 900;
    if (theme.water) {
      const wt = NC.Tex.water();
      wt.repeat.set(big / 6, big / 6);
      const water = new THREE.Mesh(new THREE.PlaneGeometry(big, big), new THREE.MeshLambertMaterial({ map: wt, color: 0x88aadd, transparent: true, opacity: 0.92 }));
      water.rotation.x = -Math.PI / 2;
      water.position.set(cols * T / 2, -0.9, rows * T / 2);
      group.add(water);
      W.waterTex = wt;
    }
    if (theme.floorPlane && !theme.water) {
      const fp = new THREE.Mesh(new THREE.PlaneGeometry(big, big), new THREE.MeshLambertMaterial({ color: theme.floorPlane }));
      fp.rotation.x = -Math.PI / 2; fp.position.set(cols * T / 2, -0.05, rows * T / 2);
      group.add(fp);
    }
    if (theme.clouds) {
      // a sea of pink clouds far below the pagoda
      const cg = new THREE.Group();
      const cm = new THREE.MeshLambertMaterial({ color: 0xf0c8d8, emissive: 0x402030 });
      for (let i = 0; i < 70; i++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cm);
        m.scale.set(8 + rnd() * 14, 3 + rnd() * 3, 8 + rnd() * 14);
        m.position.set(-60 + rnd() * (cols * T + 120), -16 - rnd() * 6, -60 + rnd() * (rows * T + 120));
        cg.add(m);
      }
      group.add(cg);
    }
    // sky dome
    const skyTex = NC.Tex.sky(level.theme, ...theme.sky);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 24, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.position.set(cols * T / 2, 0, rows * T / 2);
    sky.renderOrder = -10;
    group.add(sky);
    // the stars
    const sp = [];
    for (let i = 0; i < 700; i++) {
      const a = rnd() * Math.PI * 2, e = 0.15 + rnd() * 1.3;
      sp.push(Math.cos(a) * Math.cos(e) * 420, Math.sin(e) * 420, Math.sin(a) * Math.cos(e) * 420);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8 }));
    stars.position.copy(sky.position);
    group.add(stars);
    // the big moon
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: NC.Tex.moon(), fog: false, transparent: true, depthWrite: false }));
    moon.scale.set(90, 90, 1);
    moon.position.set(cols * T / 2 + 300 * theme.moonPos[0], 140 + 200 * theme.moonPos[1], rows * T / 2 - 320);
    group.add(moon);
    // mountains and pagodas far away
    for (let i = 0; i < 14; i++) {
      const m = NC.Models.mountain(40 + rnd() * 50, 50 + rnd() * 70, new THREE.Color(theme.fog).multiplyScalar(0.55).getHex());
      const a = (i / 14) * Math.PI * 2 + rnd() * 0.2;
      m.position.set(cols * T / 2 + Math.cos(a) * 280, -10, rows * T / 2 + Math.sin(a) * 240);
      group.add(m);
    }
    for (let i = 0; i < 6; i++) {
      const p = NC.Models.pagodaSilhouette(3 + Math.floor(rnd() * 3), new THREE.Color(theme.fog).multiplyScalar(0.4).getHex());
      p.position.set(rnd() * cols * T, -4, (rnd() < 0.5 ? -60 - rnd() * 40 : rows * T + 60 + rnd() * 40));
      p.scale.setScalar(1.5 + rnd());
      group.add(p);
    }

    // ---------- lights ----------
    const hemi = new THREE.HemisphereLight(theme.hemi[0], theme.hemi[1], theme.hemi[2]);
    group.add(hemi);
    const moonLight = new THREE.DirectionalLight(theme.moon[0], theme.moon[1]);
    moonLight.position.set(0.4, 1, -0.6);
    group.add(moonLight);
    scene.fog = new THREE.Fog(theme.fog, theme.fogNear, theme.fogFar);
    scene.background = new THREE.Color(theme.sky[1]);

    // ---------- things on the map ----------
    const S = { start: null, goal: null, lanterns: [], items: [], enemies: [], signs: [], drums: [], spikes: [], searchlights: [], pots: [], decor: [] };
    W.spawns = S;
    const signList = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const ch = level.things[r] ? level.things[r][c] : '.';
      if (!ch || ch === '.') continue;
      const p = tileCenter(c, r);
      const place = (obj, y = p.y) => { obj.position.set(p.x, y, p.z); group.add(obj); return obj; };
      switch (ch) {
        case 'S': S.start = p; break;
        case 'G': {
          const g = place(NC.Models.torii());
          g.rotation.y = Math.PI / 2;
          S.goal = { x: p.x, y: p.y, z: p.z, mesh: g };
          break;
        }
        case 'L': S.lanterns.push({ x: p.x, y: p.y, z: p.z, mesh: place(NC.Models.stoneLantern()), lit: false }); break;
        case 'H': signList.push({ c, r, x: p.x, y: p.y, z: p.z }); break;
        case 'f': case 'o': case 's': case 'm': case 'q': S.items.push({ type: ch, x: p.x, y: p.y, z: p.z }); break;
        case 'D': case 'R': case 'C': case 'F': case 'K': case 'W': S.enemies.push({ type: ch, x: p.x, y: p.y, z: p.z, c, r }); break;
        case 'X': S.spikes.push({ x: p.x, y: p.y, z: p.z, mesh: place(NC.Models.spikeTrap(), p.y + 0.01), phase: (c * 0.7 + r * 0.3) % 3 }); break;
        case 'Y': {
          const m = place(NC.Models.searchlight());
          addBox({ minX: p.x - 0.2, maxX: p.x + 0.2, minZ: p.z - 0.2, maxZ: p.z + 0.2, minY: p.y, maxY: p.y + 4.2, kind: 'tree' });
          S.searchlights.push({ x: p.x, y: p.y, z: p.z, mesh: m, a: (c + r) * 0.9 });
          break;
        }
        case 'J': {
          place(NC.Models.taikoDrum());
          addBox({ minX: p.x - 0.7, maxX: p.x + 0.7, minZ: p.z - 0.7, maxZ: p.z + 0.7, minY: p.y, maxY: p.y + 0.88, kind: 'drum' });
          S.drums.push(p);
          break;
        }
        case 'c': {
          const s = 1.6;
          const m = place(NC.Models.crate(s));
          m.rotation.y = (rnd() - 0.5) * 0.3;
          addBox({ minX: p.x - s / 2, maxX: p.x + s / 2, minZ: p.z - s / 2, maxZ: p.z + s / 2, minY: p.y, maxY: p.y + s, kind: 'crate', climb: true });
          break;
        }
        case 'v': S.pots.push({ x: p.x, y: p.y, z: p.z }); break;
        case 'T': {
          const t = place(NC.Models.cherryTree(rnd));
          t.rotation.y = rnd() * 6;
          addBox({ minX: p.x - 0.25, maxX: p.x + 0.25, minZ: p.z - 0.25, maxZ: p.z + 0.25, minY: p.y, maxY: p.y + 2.2, kind: 'tree' });
          break;
        }
        case 'B': {
          const bh = 14;
          for (let k = 0; k < 3; k++) {
            // the big one you climb in the middle, and two thin ones for decoration
            const b = NC.Models.bamboo(k === 0 ? bh : bh - 3 - rnd() * 3, rnd);
            if (k === 0) { b.position.set(p.x, p.y, p.z); }
            else { b.position.set(p.x + (rnd() - 0.5) * 2.2, p.y, p.z + (rnd() - 0.5) * 2.2); b.scale.set(0.6, 1, 0.6); }
            group.add(b);
          }
          addBox({ minX: p.x - 0.25, maxX: p.x + 0.25, minZ: p.z - 0.25, maxZ: p.z + 0.25, minY: p.y, maxY: p.y + bh, kind: 'bamboo', climb: true });
          break;
        }
        case 'p': {
          const post = new THREE.Group();
          post.add(NC.Models.cyl(NC.Models.M(0x3a2414), 0, 1.4, 0, 0.07, 2.8));
          post.add(NC.Models.box(NC.Models.M(0x3a2414), 0.35, 2.75, 0, 0.8, 0.08, 0.08));
          const l = NC.Models.paperLantern(rnd() < 0.5 ? 0xe8402a : 0xffa030);
          l.position.set(0.7, 2.3, 0);
          post.add(l);
          post.rotation.y = rnd() * 6;
          place(post);
          S.decor.push(l);
          break;
        }
      }
    }
    // hint signs are read from left to right
    signList.sort((a, b) => a.c - b.c || a.r - b.r);
    signList.forEach((s, i) => {
      const m = NC.Models.sign();
      m.position.set(s.x, s.y, s.z);
      m.rotation.y = -Math.PI / 2;
      group.add(m);
      S.signs.push({ x: s.x, y: s.y, z: s.z, text: level.hints[i] || '', mesh: m, read: false });
    });
    if (!S.start) S.start = tileCenter(1, Math.floor(rows / 2));

    // ---------- floating petals / fireflies / embers ----------
    const N = NC.lowGfx ? 120 : 320;
    const amb = new Float32Array(N * 3), seeds = [];
    for (let i = 0; i < N; i++) {
      amb[i * 3] = rnd() * cols * T; amb[i * 3 + 1] = rnd() * 22; amb[i * 3 + 2] = rnd() * rows * T;
      seeds.push(rnd() * 10);
    }
    const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(amb, 3));
    const ambColors = { petals: 0xffa8cc, fireflies: 0xc8ff60, embers: 0xff8030, sparkle: 0xa0d0ff };
    const ambient = new THREE.Points(ag, new THREE.PointsMaterial({
      color: ambColors[theme.ambient] || 0xffffff, size: theme.ambient === 'petals' ? 0.22 : 0.18, map: NC.Tex.glow(), transparent: true,
      depthWrite: false, blending: theme.ambient === 'petals' ? THREE.NormalBlending : THREE.AdditiveBlending,
    }));
    ambient.frustumCulled = false;
    group.add(ambient);

    W.update = function (dt, t) {
      if (W.waterTex) { W.waterTex.offset.x = t * 0.01; W.waterTex.offset.y = Math.sin(t * 0.3) * 0.02; }
      const a = ag.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const s = seeds[i];
        if (theme.ambient === 'petals') {
          a[i * 3] += (1.2 + Math.sin(t + s) * 0.6) * dt;
          a[i * 3 + 1] -= (0.6 + (s % 1) * 0.4) * dt;
          a[i * 3 + 2] += Math.cos(t * 0.7 + s) * 0.5 * dt;
        } else if (theme.ambient === 'embers') {
          a[i * 3 + 1] += (0.8 + (s % 1)) * dt;
          a[i * 3] += Math.sin(t * 2 + s) * 0.6 * dt;
        } else {
          a[i * 3] += Math.sin(t * 0.8 + s) * 0.6 * dt;
          a[i * 3 + 1] += Math.cos(t * 0.6 + s * 2) * 0.4 * dt;
          a[i * 3 + 2] += Math.sin(t * 0.5 + s * 3) * 0.6 * dt;
        }
        if (a[i * 3 + 1] < -1) a[i * 3 + 1] = 22;
        if (a[i * 3 + 1] > 22) a[i * 3 + 1] = 0;
        if (a[i * 3] > cols * T) a[i * 3] = 0;
      }
      ag.attributes.position.needsUpdate = true;
      for (const l of S.decor) l.rotation.z = Math.sin(t * 1.5 + l.id) * 0.08;
    };

    W.dispose = function () {
      scene.remove(group);
      geo.dispose();
    };
    return W;
  }

  return { build, T, HU, VOID, THEMES };
})();
