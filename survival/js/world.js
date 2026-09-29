// ============================================================
//  DEAD ACRES — THE WORLD
//  Hills, lake, river, roads, forests, rocks, bushes, grass,
//  the sky, the sun and the moon.
// ============================================================
window.DA = window.DA || {};

DA.World = (function () {
  const U = DA.U, MAP = DA.MAP, Mo = DA.Models, T = DA.Tex, C = DA.Collide;
  const SEED = MAP.seed;
  const SIZE = MAP.size, HALF = SIZE / 2;
  const N = 256;                  // the ground is a grid of N x N squares
  const STEP = SIZE / N;
  const WATER = MAP.water;

  const W = {
    SIZE, HALF, WATER,
    heights: null,
    res: { tree: [], rock: [], bush: [] },   // things you can chop / mine / pick
    containers: [],                           // cupboards, fridges, car trunks...
    pads: [],                                 // concrete, parking lots, floors (no trees here)
    doors: [],
    lights: [],                               // lamps that glow at night
    scene: null,
  };

  // ============================================================
  //  HEIGHT OF THE GROUND
  // ============================================================
  const hill = MAP.flats.find((f) => f.h > 20) || { x: 9999, z: 9999 };
  function mountains(x, z) {
    const e = Math.max(Math.abs(x), Math.abs(z));
    if (e < 200) return 0;
    const t = (e - 200) / 100;
    return t * t * 42 + U.noise(x * 0.04, z * 0.04, SEED + 5) * 6 * Math.min(1, t);
  }
  const hillBump = (x, z) => 17 * U.smooth(80, 12, Math.hypot(x - hill.x, z - hill.z));
  // smooth version of the ground, roads follow this
  const lowH = (x, z) => 9 + U.fbm(x * 0.0045, z * 0.0045, 2, SEED) * 11 + hillBump(x, z) + mountains(x, z);

  function roadDist(x, z) {
    let best = 1e9, road = null;
    for (const r of MAP.roads) {
      const d = U.distToPath(x, z, r.pts) - r.w / 2;
      if (d < best) { best = d; road = r; }
    }
    return { d: best, road };
  }
  W.roadDist = roadDist;

  function flatDist(f, x, z) {
    const dx = Math.abs(x - f.x) - f.w / 2, dz = Math.abs(z - f.z) - f.d / 2;
    return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0);
  }

  function lakeRadius(x, z) {
    const a = Math.atan2(z - MAP.lake.z, x - MAP.lake.x);
    return MAP.lake.r * (1 + 0.18 * U.noise(Math.cos(a) * 2 + 10, Math.sin(a) * 2 + 10, SEED + 9));
  }

  function rawHeight(x, z) {
    let h = 9 + U.fbm(x * 0.0045, z * 0.0045, 4, SEED) * 11 + hillBump(x, z) + mountains(x, z);
    const rd = roadDist(x, z);
    if (rd.d < 7) h = U.lerp(h, Math.max(lowH(x, z), 2.5), U.smooth(7, 0, rd.d));
    for (const f of MAP.flats) {
      const d = flatDist(f, x, z);
      if (d < 26) h = U.lerp(h, f.h, U.smooth(26, 0, d));
    }
    const dl = Math.hypot(x - MAP.lake.x, z - MAP.lake.z), R = lakeRadius(x, z);
    if (dl < R + 24) h = U.lerp(h, -5, U.smooth(R + 24, R - 8, dl));
    const dr = U.distToPath(x, z, MAP.river);
    if (dr < 12) h = U.lerp(h, -2.2, U.smooth(12, 3.5, dr));
    return h;
  }

  function buildHeights() {
    W.heights = new Float32Array((N + 1) * (N + 1));
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      W.heights[j * (N + 1) + i] = rawHeight(-HALF + i * STEP, -HALF + j * STEP);
    }
  }

  // exact height on the ground triangles (matches what you see)
  W.heightAt = function (x, z) {
    const gx = U.clamp((x + HALF) / STEP, 0, N - 0.0001), gz = U.clamp((z + HALF) / STEP, 0, N - 0.0001);
    const i = Math.floor(gx), j = Math.floor(gz);
    const fx = gx - i, fz = gz - j;
    const H = W.heights, r = N + 1;
    const a = H[j * r + i], b = H[j * r + i + 1], c = H[(j + 1) * r + i], d = H[(j + 1) * r + i + 1];
    // each square is two triangles: (a, c, b) and (c, d, b)
    if (fx + fz <= 1) return a + (b - a) * fx + (c - a) * fz;
    return d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
  };
  W.slopeAt = (x, z) => {
    const h = W.heightAt(x, z);
    return Math.max(Math.abs(W.heightAt(x + 1, z) - h), Math.abs(W.heightAt(x, z + 1) - h));
  };
  W.inWater = (x, z) => W.heightAt(x, z) < WATER - 0.25;
  W.inside = (x, z) => Math.abs(x) < MAP.border && Math.abs(z) < MAP.border;

  // ============================================================
  //  WHAT KIND OF GROUND IS HERE? (for trees, sounds...)
  //  0 grass, 1 road, 2 dirt road, 3 sand, 4 water, 5 pad, 6 field, 7 rock
  // ============================================================
  const TG = 2, TN = SIZE / TG;
  let typeGrid = null;
  function inField(x, z) {
    for (const f of MAP.fields) {
      const a = (f.rot || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      const dx = x - f.x, dz = z - f.z;
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if (Math.abs(lx) < f.w / 2 && Math.abs(lz) < f.d / 2) return { f, lx, lz };
    }
    return null;
  }
  function inPad(x, z, grow = 0) {
    for (const p of W.pads) {
      const dx = x - p.x, dz = z - p.z;
      const lx = dx * p.c - dz * p.s, lz = dx * p.s + dz * p.c;
      if (Math.abs(lx) < p.hw + grow && Math.abs(lz) < p.hd + grow) return p;
    }
    return null;
  }
  W.inPad = inPad;
  function groundTypeSlow(x, z) {
    const h = W.heightAt(x, z);
    if (h < WATER - 0.2) return 4;
    if (inPad(x, z)) return 5;
    const rd = roadDist(x, z);
    if (rd.d < 0) return rd.road.dirt ? 2 : 1;
    if (inField(x, z)) return 6;
    if (h < WATER + 1.3) return 3;
    if (W.slopeAt(x, z) > 1.4 || h > 34) return 7;
    return 0;
  }
  function buildTypeGrid() {
    typeGrid = new Uint8Array(TN * TN);
    for (let j = 0; j < TN; j++) for (let i = 0; i < TN; i++) typeGrid[j * TN + i] = groundTypeSlow(-HALF + i * TG + 1, -HALF + j * TG + 1);
  }
  W.groundType = (x, z) => {
    const i = Math.floor((x + HALF) / TG), j = Math.floor((z + HALF) / TG);
    if (i < 0 || j < 0 || i >= TN || j >= TN) return 7;
    return typeGrid[j * TN + i];
  };

  // ============================================================
  //  THE GROUND MESH + its painted colors
  // ============================================================
  // painting the ground asks "how far to a road?" a million times.
  // So we work it out once every 2 m, and blend between those.
  let roadGrid = null, dirtGrid = null, padGrid = null;
  function buildPaintGrids() {
    const n = TN + 1;
    roadGrid = new Float32Array(n * n); dirtGrid = new Uint8Array(n * n); padGrid = new Int16Array(n * n).fill(-1);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -HALF + i * TG, z = -HALF + j * TG, k = j * n + i;
      const rd = roadDist(x, z);
      roadGrid[k] = rd.d; dirtGrid[k] = rd.road && rd.road.dirt ? 1 : 0;
      const p = inPad(x, z, 2.5);
      if (p) padGrid[k] = W.pads.indexOf(p);
    }
  }
  function roadAt(x, z) {
    const n = TN + 1;
    const gx = U.clamp((x + HALF) / TG, 0, TN - 0.001), gz = U.clamp((z + HALF) / TG, 0, TN - 0.001);
    const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, k = j * n + i;
    const d = (roadGrid[k] * (1 - fx) + roadGrid[k + 1] * fx) * (1 - fz) + (roadGrid[k + n] * (1 - fx) + roadGrid[k + n + 1] * fx) * fz;
    return { d, dirt: dirtGrid[Math.round(gz) * n + Math.round(gx)] === 1 };
  }
  function padAt(x, z) {
    const n = TN + 1;
    const i = Math.round((x + HALF) / TG), j = Math.round((z + HALF) / TG);
    if (i < 0 || j < 0 || i > TN || j > TN) return null;
    const idx = padGrid[j * n + i];
    if (idx < 0) return null;
    const p = W.pads[idx];
    const dx = x - p.x, dz = z - p.z;
    const lx = dx * p.c - dz * p.s, lz = dx * p.s + dz * p.c;
    if (Math.abs(lx) < p.hw && Math.abs(lz) < p.hd) return p;
    return inPad(x, z); // pads next to each other: check them all (rare)
  }

  function paintGround(res) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = res;
    const g = cv.getContext('2d');
    const img = g.createImageData(res, res);
    const d = img.data;
    const px = SIZE / res;
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const x = -HALF + (i + 0.5) * px, z = -HALF + (j + 0.5) * px;
      const h = W.heightAt(x, z);
      const n1 = U.noise(x * 0.05, z * 0.05, SEED + 21), n2 = U.noise(x * 0.3, z * 0.3, SEED + 22);
      const forest = U.fbm(x * 0.012, z * 0.012, 2, SEED + 30);
      // grass
      let r = 78 + n1 * 14 + n2 * 6, gg = 104 + n1 * 16 + n2 * 8, b = 46 + n1 * 6;
      if (forest > 0.1) { const t = U.smooth(0.1, 0.4, forest); r = U.lerp(r, 70, t); gg = U.lerp(gg, 78, t); b = U.lerp(b, 42, t); }
      const dry = U.smooth(0.3, 0.75, n1); r += dry * 16; gg += dry * 8; // dry yellow patches
      // rock on steep slopes and mountains
      const slope = W.slopeAt(x, z);
      const rockT = Math.max(U.smooth(0.9, 1.8, slope), U.smooth(30, 42, h));
      if (rockT > 0) { const v = 100 + n2 * 14; r = U.lerp(r, v, rockT); gg = U.lerp(gg, v - 4, rockT); b = U.lerp(b, v - 10, rockT); }
      // sand and mud near water
      if (h < WATER + 1.6) {
        const t = U.smooth(WATER + 1.6, WATER + 0.6, h);
        r = U.lerp(r, 170 + n2 * 10, t); gg = U.lerp(gg, 156 + n2 * 10, t); b = U.lerp(b, 116, t);
        if (h < WATER - 0.3) { const t2 = U.smooth(WATER - 0.3, WATER - 3, h); r = U.lerp(r, 70, t2); gg = U.lerp(gg, 70, t2); b = U.lerp(b, 52, t2); }
      }
      // farm fields: rows of dirt and plants
      const fi = inField(x, z);
      if (fi) {
        const row = Math.sin(fi.lx * 2.2) > 0;
        if (row) { r = 92 + n2 * 10; gg = 70; b = 44; } else { r = 96; gg = 120 + n2 * 10; b = 40; }
      }
      // roads
      const rd = roadAt(x, z);
      if (rd.d < 1.5) {
        const edge = U.smooth(1.5, -0.4, rd.d);
        let rr, rg, rb;
        if (rd.dirt) { rr = 118 + n2 * 10; rg = 96 + n2 * 8; rb = 66; }
        else { const v = 76 + n2 * 8 + (U.hash(i, j, 3) < 0.02 ? -20 : 0); rr = v; rg = v; rb = v + 3; }
        r = U.lerp(r, rr, edge); gg = U.lerp(gg, rg, edge); b = U.lerp(b, rb, edge);
      }
      // concrete pads, parking lots, dirt yards
      const p = padAt(x, z);
      if (p) {
        let v;
        if (p.kind === 'asphalt') { v = 78 + n2 * 8; r = v; gg = v; b = v + 2; if (p.lines && Math.abs(((x - p.x) * p.c - (z - p.z) * p.s) % 3) < 0.12) { r = gg = b = 200; } }
        else if (p.kind === 'dirt') { r = 110 + n2 * 10; gg = 90 + n2 * 8; b = 62; }
        else { v = 128 + n2 * 10; r = v; gg = v - 2; b = v - 6; }
      }
      const k = (j * res + i) * 4;
      d[k] = U.clamp(r, 0, 255); d[k + 1] = U.clamp(gg, 0, 255); d[k + 2] = U.clamp(b, 0, 255); d[k + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return cv;
  }

  function buildGroundMesh() {
    const geo = new THREE.BufferGeometry();
    const r = N + 1;
    const pos = new Float32Array(r * r * 3), uv = new Float32Array(r * r * 2);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const k = j * r + i;
      pos[k * 3] = -HALF + i * STEP; pos[k * 3 + 1] = W.heights[k]; pos[k * 3 + 2] = -HALF + j * STEP;
      uv[k * 2] = i / N; uv[k * 2 + 1] = 1 - j / N;
    }
    const idx = new Uint32Array(N * N * 6);
    let o = 0;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const a = j * r + i, b = a + 1, c = a + r, d = c + 1;
      idx[o++] = a; idx[o++] = c; idx[o++] = b;
      idx[o++] = c; idx[o++] = d; idx[o++] = b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    W.groundCanvas = paintGround(DA.lowGfx ? 512 : 1024);
    const map = U.tex(W.groundCanvas);
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    map.flipY = true;
    const detail = T.groundDetail();
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.95 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.detailMap = { value: detail };
      sh.fragmentShader = 'uniform sampler2D detailMap;\n' + sh.fragmentShader.replace(
        '#include <map_fragment>',
        '#include <map_fragment>\n  diffuseColor.rgb *= texture2D(detailMap, vMapUv * 160.0).rgb * 1.6 + 0.2;',
      );
    };
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    m.name = 'ground';
    return m;
  }

  function buildWater() {
    const geo = new THREE.PlaneGeometry(SIZE + 200, SIZE + 200, 1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0x2a4a50, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.82 });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = WATER;
    m.receiveShadow = true;
    W.waterMesh = m;
    return m;
  }

  // ============================================================
  //  TREES, ROCKS, BUSHES (many copies drawn at once = fast)
  // ============================================================
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpE = new THREE.Euler();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  W.kinds = {}; // instanced meshes, by type

  function placeVegetation(scene) {
    const rnd = U.seeded(SEED + 100);
    const trees = [], rocks = [], bushes = [];
    const okSpot = (x, z, roadGap) => {
      if (!W.inside(x, z)) return false;
      const t = W.groundType(x, z);
      if (t !== 0 && t !== 7) return false;
      if (roadDist(x, z).d < roadGap) return false;
      if (inPad(x, z, 3)) return false;
      if (W.heightAt(x, z) < WATER + 1.2) return false;
      return true;
    };
    const town = MAP.flats[0];
    // trees on a wobbly grid
    const TS = 5.5;
    for (let gz = -HALF; gz < HALF; gz += TS) for (let gx = -HALF; gx < HALF; gx += TS) {
      const x = gx + rnd() * TS, z = gz + rnd() * TS;
      const forest = U.fbm(x * 0.012, z * 0.012, 2, SEED + 30);
      let p = U.smooth(-0.05, 0.35, forest) * 0.85 + 0.03;
      if (flatDist(town, x, z) < 0) p *= 0.08;
      const r = rnd();
      if (r > p || !okSpot(x, z, 3)) continue;
      const h = W.heightAt(x, z);
      const pineN = U.noise(x * 0.01, z * 0.01, SEED + 40);
      const type = rnd() < 0.04 ? 'dead' : (pineN > 0 || h > 26 ? 'pine' : 'oak');
      trees.push({ x, z, type, v: Math.floor(rnd() * 3), s: 0.8 + rnd() * 0.45, ry: rnd() * 6.28 });
    }
    // rocks
    for (let gz = -HALF; gz < HALF; gz += 13) for (let gx = -HALF; gx < HALF; gx += 13) {
      const x = gx + rnd() * 13, z = gz + rnd() * 13;
      const p = W.groundType(x, z) === 7 ? 0.5 : 0.11;
      if (rnd() > p || !okSpot(x, z, 2)) continue;
      rocks.push({ x, z, v: Math.floor(rnd() * 3), s: 0.6 + rnd() * 0.9, ry: rnd() * 6.28 });
    }
    // bushes (some have berries)
    for (let gz = -HALF; gz < HALF; gz += 9) for (let gx = -HALF; gx < HALF; gx += 9) {
      const x = gx + rnd() * 9, z = gz + rnd() * 9;
      const forest = U.fbm(x * 0.012, z * 0.012, 2, SEED + 30);
      const p = 0.1 + U.smooth(-0.2, 0.2, forest) * 0.2;
      if (rnd() > p || !okSpot(x, z, 1.5)) continue;
      bushes.push({ x, z, v: Math.floor(rnd() * 3), s: 0.8 + rnd() * 0.5, ry: rnd() * 6.28, berries: rnd() < 0.45 });
    }
    // make sure trees and rocks aren't inside each other
    const taken = [];
    const free = (o, r) => { for (const t of taken) if (Math.abs(t.x - o.x) < r + t.r && Math.hypot(t.x - o.x, t.z - o.z) < r + t.r) return false; return true; };
    const keep = (list, r) => list.filter((o) => { const rr = r * o.s; if (!free(o, rr)) return false; taken.push({ x: o.x, z: o.z, r: rr }); return true; });
    W.res.tree = keep(trees, 1.2);
    W.res.rock = keep(rocks, 1.2);
    W.res.bush = keep(bushes, 0.7);
    W.res.tree.forEach((t, i) => { t.id = i; t.kind = 'tree'; });
    W.res.rock.forEach((t, i) => { t.id = i; t.kind = 'rock'; });
    W.res.bush.forEach((t, i) => { t.id = i; t.kind = 'bush'; });

    // --- build the instanced meshes
    // one group of copies per 128 m square, so far away squares can be skipped
    const makeSet = (name, list, geoFor, variants, material) => {
      const sets = [];
      const c = new THREE.Color();
      for (let v = 0; v < variants; v++) {
        const mine = list.filter((o) => o.v === v || variants === 1);
        if (!mine.length) continue;
        const geo = geoFor(v);
        const chunks = new Map();
        for (const o of mine) {
          const k = Math.floor(o.x / 128) + ',' + Math.floor(o.z / 128);
          if (!chunks.has(k)) chunks.set(k, []);
          chunks.get(k).push(o);
        }
        for (const part of chunks.values()) {
          const im = new THREE.InstancedMesh(geo, material || Mo.M.vc(), part.length);
          im.castShadow = !['berries', 'bush', 'stump'].includes(name); im.receiveShadow = true;
          part.forEach((o, i) => {
            o.inst = o.inst || {};
            o.inst[name] = { im, i };
            matrixFor(o, tmpM);
            im.setMatrixAt(i, tmpM);
            const k = 0.88 + U.hash(o.id, v, 77) * 0.24;
            c.setRGB(k, k, k); im.setColorAt(i, c);
          });
          im.instanceMatrix.needsUpdate = true;
          im.computeBoundingSphere();
          scene.add(im);
          sets.push(im);
        }
      }
      W.kinds[name] = sets;
    };
    const matrixFor = (o, m) => {
      tmpP.set(o.x, W.heightAt(o.x, o.z) - 0.05, o.z);
      tmpE.set(0, o.ry, 0); tmpQ.setFromEuler(tmpE); tmpS.setScalar(o.s);
      return m.compose(tmpP, tmpQ, tmpS);
    };
    W._matrixFor = matrixFor;
    const oaks = W.res.tree.filter((t) => t.type === 'oak'), pines = W.res.tree.filter((t) => t.type === 'pine'), dead = W.res.tree.filter((t) => t.type === 'dead');
    makeSet('oak', oaks, (v) => Mo.Nature.oak(v + 1), 3);
    makeSet('pine', pines, (v) => Mo.Nature.pine(v + 11), 3);
    makeSet('dead', dead, (v) => Mo.Nature.deadTree(v + 21), 3);
    makeSet('stump', W.res.tree, () => Mo.Nature.stump(), 1);
    W.res.tree.forEach((t) => setInst(t, 'stump', false));
    makeSet('rock', W.res.rock, (v) => Mo.Nature.rock(v), 3);
    makeSet('bush', W.res.bush, (v) => Mo.Nature.bush(v + 5), 3);
    const berryBushes = W.res.bush.filter((b) => b.berries);
    makeSet('berries', berryBushes, () => Mo.Nature.berries(), 1);

    // colliders (trees and rocks block you, bushes don't)
    for (const t of W.res.tree) {
      const r = (t.type === 'pine' ? 0.3 : 0.32) * t.s;
      t.col = C.add({ shape: 'circle', x: t.x, z: t.z, r, y0: W.heightAt(t.x, t.z) - 1, y1: W.heightAt(t.x, t.z) + 6, kind: 'tree', ref: t });
    }
    for (const r of W.res.rock) {
      const h = W.heightAt(r.x, r.z);
      r.col = C.add({ shape: 'circle', x: r.x, z: r.z, r: 0.95 * r.s, y0: h - 1, y1: h + 0.75 * r.s, kind: 'rock', ref: r, walk: true });
    }
    for (const b of W.res.bush) {
      const h = W.heightAt(b.x, b.z);
      b.col = C.add({ shape: 'circle', x: b.x, z: b.z, r: 0.7 * b.s, y0: h, y1: h + 1.1 * b.s, kind: 'bush', ref: b, solid: false });
    }
  }

  function setInst(o, name, visible) {
    const it = o.inst && o.inst[name];
    if (!it) return;
    if (visible) W._matrixFor(o, tmpM); else tmpM.copy(ZERO);
    it.im.setMatrixAt(it.i, tmpM);
    it.im.instanceMatrix.needsUpdate = true;
  }

  // a tree / rock / bush was used up (gone = true) or grew back (gone = false)
  W.setResGone = function (kind, id, gone) {
    const o = W.res[kind] && W.res[kind][id];
    if (!o || !!o.gone === !!gone) return o;
    o.gone = !!gone;
    if (kind === 'tree') {
      setInst(o, o.type, !gone);
      setInst(o, 'stump', gone);
      if (o.col) { o.col.y1 = W.heightAt(o.x, o.z) + (gone ? 0.45 * o.s : 6); o.col.kind = gone ? 'stump' : 'tree'; o.col.hit = !gone; o.col.walk = gone; }
    } else if (kind === 'rock') {
      setInst(o, 'rock', !gone);
      if (o.col) { o.col.solid = !gone; o.col.hit = !gone; }
    } else if (kind === 'bush') {
      setInst(o, 'berries', !gone);
    }
    return o;
  };

  // ============================================================
  //  GRASS (only drawn close to you, it moves with you)
  // ============================================================
  let grass = null, grassAt = null;
  const GRASS_R = 34, GRASS_S = 1.25;
  function buildGrass(scene) {
    if (DA.lowGfx) return;
    const n = Math.ceil((GRASS_R * 2) / GRASS_S) ** 2;
    const mat = new THREE.MeshStandardMaterial({ map: T.grassBlades(), alphaTest: 0.45, roughness: 1, color: 0x9aa878 });
    grass = new THREE.InstancedMesh(Mo.Nature.grassClump(), mat, n);
    grass.frustumCulled = false;
    grass.receiveShadow = true;
    scene.add(grass);
  }
  function updateGrass(px, pz) {
    if (!grass) return;
    const cx = Math.round(px / 4) * 4, cz = Math.round(pz / 4) * 4;
    if (grassAt && grassAt[0] === cx && grassAt[1] === cz) return;
    grassAt = [cx, cz];
    let n = 0;
    const x0 = Math.floor((cx - GRASS_R) / GRASS_S), z0 = Math.floor((cz - GRASS_R) / GRASS_S);
    const cnt = Math.ceil((GRASS_R * 2) / GRASS_S);
    for (let j = 0; j < cnt; j++) for (let i = 0; i < cnt; i++) {
      const ix = x0 + i, iz = z0 + j;
      const hsh = U.hash(ix, iz, 55);
      if (hsh < 0.35) continue;
      const x = (ix + U.hash(ix, iz, 56)) * GRASS_S, z = (iz + U.hash(ix, iz, 57)) * GRASS_S;
      if (Math.hypot(x - cx, z - cz) > GRASS_R) continue;
      if (W.groundType(x, z) !== 0) continue;
      tmpP.set(x, W.heightAt(x, z) - 0.05, z);
      tmpE.set(0, hsh * 20, 0); tmpQ.setFromEuler(tmpE);
      tmpS.set(0.8 + hsh * 0.6, 0.6 + U.hash(ix, iz, 58) * 0.8, 0.8 + hsh * 0.6);
      grass.setMatrixAt(n++, tmpM.compose(tmpP, tmpQ, tmpS));
    }
    grass.count = n;
    grass.instanceMatrix.needsUpdate = true;
  }

  // ============================================================
  //  SKY, SUN, MOON, FOG
  // ============================================================
  let sky, hemi, sun, fog;
  const SKY_KEYS = [
    // hour, sky top, horizon, sun color, sun strength, ambient, fog far
    [0, 0x02040c, 0x0a0e1c, 0x7088c8, 0.3, 0.24, 70],
    [4.8, 0x02040c, 0x0c101e, 0x7088c8, 0.28, 0.24, 70],
    [6, 0x283a6a, 0xd88058, 0xffa060, 0.8, 0.6, 150],
    [7.5, 0x3a78c8, 0xb8d0e0, 0xfff0d8, 2.4, 0.95, 330],
    [17, 0x3a78c8, 0xb8d0e0, 0xfff0d8, 2.4, 0.95, 330],
    [18.8, 0x3a4a8a, 0xe89058, 0xff9050, 1.2, 0.8, 170],
    [20, 0x0e1430, 0x2a2038, 0x8a6080, 0.3, 0.4, 90],
    [21, 0x02040c, 0x0a0e1c, 0x7088c8, 0.3, 0.24, 70],
    [24, 0x02040c, 0x0a0e1c, 0x7088c8, 0.3, 0.24, 70],
  ];
  const cA = new THREE.Color(), cB = new THREE.Color();
  function skyAt(hour) {
    let i = 0;
    while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= hour) i++;
    const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
    const t = U.clamp((hour - a[0]) / (b[0] - a[0]), 0, 1);
    const lc = (x, y) => cA.set(x).lerp(cB.set(y), t).clone();
    return { top: lc(a[1], b[1]), hor: lc(a[2], b[2]), sunCol: lc(a[3], b[3]), sunI: U.lerp(a[4], b[4], t), amb: U.lerp(a[5], b[5], t), far: U.lerp(a[6], b[6], t) };
  }
  W.skyAt = skyAt;

  function buildSky(scene) {
    const geo = new THREE.SphereGeometry(450, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, moonDir: { value: new THREE.Vector3(0, -1, 0) }, night: { value: 0 } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
      fragmentShader: `
        uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 moonDir; uniform float night;
        varying vec3 vDir;
        float h(vec3 p){ p = fract(p*0.3183099+0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        void main(){
          vec3 d = normalize(vDir);
          float y = max(d.y, 0.0);
          vec3 c = mix(hor, top, pow(y, 0.55));
          if (d.y < 0.0) c = hor * 0.8;
          float s = max(dot(d, sunDir), 0.0);
          c += vec3(1.0,0.85,0.6) * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.25) * step(0.0, sunDir.y + 0.1);
          float m = max(dot(d, moonDir), 0.0);
          c += vec3(0.8,0.85,1.0) * (smoothstep(0.9993, 0.9996, m) * 0.9 + pow(m, 30.0) * 0.08) * step(0.0, moonDir.y);
          if (night > 0.0 && d.y > 0.0) {
            vec3 q = floor(d * 400.0);
            float st = h(q);
            c += vec3(0.9,0.95,1.0) * step(0.9975, st) * night * (0.4 + 0.6 * h(q + 3.0)) * smoothstep(0.0, 0.2, d.y);
          }
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    sky = new THREE.Mesh(geo, mat);
    sky.frustumCulled = false;
    sky.renderOrder = -1;
    scene.add(sky);
    hemi = new THREE.HemisphereLight(0xffffff, 0x404030, 1);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.castShadow = !DA.lowGfx;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 260;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.04;
    scene.add(sun); scene.add(sun.target);
    fog = new THREE.Fog(0x000000, 10, 200);
    scene.fog = fog;
    W.sun = sun; W.hemi = hemi;
  }

  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3();
  // hour 0..24 -> where the sun is
  W.sunDirection = function (hour, out) {
    // sun up at 6, highest at 13, down at 20
    const a = ((hour - 6) / 14) * Math.PI;
    return out.set(Math.cos(a) * 0.8, Math.sin(a), 0.35).normalize();
  };
  W.isNight = (hour) => hour >= 20.2 || hour < 5.6;
  W.darkness = (hour) => { // 0 = bright day, 1 = darkest night
    const s = skyAt(hour);
    return U.clamp(1 - (s.sunI - 0.3) / 2.1, 0, 1);
  };

  W.updateSky = function (hour, cam, extraFog = 0) {
    const s = skyAt(hour);
    W.sunDirection(hour, sunDir);
    const nightHour = hour < 12 ? hour + 24 : hour;
    const ma = ((nightHour - 19.5) / 11) * Math.PI;
    moonDir.set(-Math.cos(ma) * 0.7, Math.sin(ma), -0.4).normalize();
    const u = sky.material.uniforms;
    u.top.value.copy(s.top); u.hor.value.copy(s.hor);
    u.sunDir.value.copy(sunDir); u.moonDir.value.copy(moonDir);
    u.night.value = U.clamp(1 - s.sunI / 0.9, 0, 1);
    sky.position.copy(cam.position);
    // the light comes from the sun in the day and from the moon at night
    const useSun = sunDir.y > 0.05;
    const dir = useSun ? sunDir : moonDir;
    sun.color.copy(s.sunCol);
    sun.intensity = useSun ? s.sunI * U.smooth(0.05, 0.2, sunDir.y) + (sunDir.y < 0.2 ? 0.2 * (1 - U.smooth(0.05, 0.2, sunDir.y)) : 0) : 0.3 * U.smooth(0, 0.2, moonDir.y);
    const tx = Math.round(cam.position.x / 2) * 2, tz = Math.round(cam.position.z / 2) * 2;
    sun.target.position.set(tx, W.heightAt(tx, tz), tz);
    sun.position.copy(sun.target.position).addScaledVector(dir, 120);
    hemi.intensity = s.amb;
    hemi.color.copy(s.top).lerp(cA.set(0xffffff), 0.5);
    hemi.groundColor.set(0x4a4a38).multiplyScalar(Math.min(1, s.amb * 1.3));
    fog.color.copy(s.hor);
    fog.far = s.far * (1 - extraFog * 0.5);
    fog.near = fog.far * 0.12;
    W.fogColor = fog.color;
  };

  // ============================================================
  //  BUILD EVERYTHING
  // ============================================================
  // the world is built in steps, so the loading screen can show what's happening
  W.buildSteps = function (scene) {
    return [
      ['Raising the hills', () => { W.scene = scene; C.clear(); buildHeights(); }],
      ['Building the town', () => DA.Buildings.build(scene, W)],
      ['Mapping roads and fields', () => { buildTypeGrid(); buildPaintGrids(); }],
      ['Painting the ground', () => { scene.add(buildGroundMesh()); scene.add(buildWater()); }],
      ['Planting the forests', () => placeVegetation(scene)],
      ['Growing grass, lighting the sky', () => {
        buildGrass(scene);
        buildSky(scene);
        // invisible fence around the world
        const B = MAP.border;
        for (const [x, z, hw, hd] of [[0, -B - 1, B + 2, 1], [0, B + 1, B + 2, 1], [-B - 1, 0, 1, B + 2], [B + 1, 0, 1, B + 2]]) {
          C.add({ shape: 'box', x, z, hw, hd, rot: 0, y0: -50, y1: 200, kind: 'fence', hit: false });
        }
      }],
    ];
  };
  W.build = function (scene) { for (const [, f] of W.buildSteps(scene)) f(); };

  W.update = function (dt, cam) {
    updateGrass(cam.position.x, cam.position.z);
    if (W.waterMesh) W.waterMesh.position.y = WATER + Math.sin(performance.now() / 1600) * 0.03;
  };

  W.placeAt = function (x, z) {
    for (const p of MAP.places) if (Math.hypot(x - p.x, z - p.z) < p.r) return p;
    return null;
  };

  return W;
})();
