// ============================================================
//  SIGMA RUN — small helper functions used everywhere
// ============================================================
window.SR = window.SR || {};

// saving things in the browser (best score, coins, shop). Never crashes if saving is blocked.
SR.store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('sr.' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('sr.' + key, JSON.stringify(value)); } catch (e) { /* saving blocked, that's ok */ }
  },
};

// settings you can change on the title screen
SR.settings = Object.assign({
  gfx: 'high',        // 'low', 'medium', 'high' or 'ultra'
  sens: 1,            // mouse speed
  fov: 85,            // how wide you can see
  autoRun: true,      // run forward without holding W
  music: 0.8,
  sfx: 0.9,
  invertY: false,
  controls: 'auto',   // 'auto' = AUTO PARKOUR (you only steer), 'manual' = do every move yourself
  track: 'edm',       // music: 'edm', 'phonk' or 'off'
}, SR.store.get('settings', {}));
// phones and tablets start on MEDIUM graphics
if (!SR.store.get('settings', null) && (navigator.maxTouchPoints > 0 && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))) SR.settings.gfx = 'medium';
if (location.search.includes('low')) SR.settings.gfx = 'low';
SR.saveSettings = () => SR.store.set('settings', SR.settings);

SR.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  smooth: (t) => t * t * (3 - 2 * t),
  // move "a" toward "b" smoothly, the same speed on fast and slow computers
  damp: (a, b, speed, dt) => b + (a - b) * Math.exp(-speed * dt),
  // shortest turn between two angles
  angleDiff(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; },

  // make a canvas and let a function draw on it
  canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (draw) draw(g, w, h);
    return c;
  },
  rrect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  },
  // turn a canvas into a 3D texture
  tex(canvas, repeat, srgb = true) {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (repeat) t.repeat.set(repeat, repeat);
    return t;
  },
  fmt(n) { return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
};

// ------------------------------------------------------------
//  BUILDER: collects lots of boxes and glues the ones with the
//  same material into ONE mesh. Fewer meshes = faster game.
//  Textures use world positions, so windows line up nicely.
// ------------------------------------------------------------
SR.Builder = class {
  constructor() { this.buckets = new Map(); }
  bucket(mat) {
    let b = this.buckets.get(mat);
    if (!b) { b = { pos: [], nor: [], uv: [] }; this.buckets.set(mat, b); }
    return b;
  }
  // one flat rectangle: corner p, edge vectors a and b, normal n. tile = meters per texture repeat
  quad(mat, p, a, b, n, tileU, tileV, u0 = 0, v0 = 0) {
    if (!mat) return;
    const B = this.bucket(mat);
    const la = Math.hypot(a[0], a[1], a[2]), lb = Math.hypot(b[0], b[1], b[2]);
    const P = [p, [p[0] + a[0], p[1] + a[1], p[2] + a[2]], [p[0] + a[0] + b[0], p[1] + a[1] + b[1], p[2] + a[2] + b[2]], [p[0] + b[0], p[1] + b[1], p[2] + b[2]]];
    const UV = [[u0, v0], [u0 + la / tileU, v0], [u0 + la / tileU, v0 + lb / tileV], [u0, v0 + lb / tileV]];
    for (const i of [0, 1, 2, 0, 2, 3]) {
      B.pos.push(P[i][0], P[i][1], P[i][2]);
      B.nor.push(n[0], n[1], n[2]);
      B.uv.push(UV[i][0], UV[i][1]);
    }
  }
  // an axis-aligned box from (x0,y0,z0) to (x1,y1,z1).
  // m = { side, top, bottom, front, back } materials (missing faces are skipped)
  box(x0, y0, z0, x1, y1, z1, m, tile = 4, tileV) {
    tileV = tileV || tile;
    const W = x1 - x0, H = y1 - y0, D = z1 - z0;
    const side = m.side, top = m.top === undefined ? side : m.top, bottom = m.bottom;
    const front = m.front === undefined ? side : m.front, back = m.back === undefined ? side : m.back;
    // the texture's v follows the real height, so floors match between buildings
    const vy = y0 / tileV;
    // +x
    this.quad(side, [x1, y0, z1], [0, 0, -D], [0, H, 0], [1, 0, 0], tile, tileV, -z1 / tile, vy);
    // -x
    this.quad(side, [x0, y0, z0], [0, 0, D], [0, H, 0], [-1, 0, 0], tile, tileV, z0 / tile, vy);
    // +z (faces the player coming from behind)
    this.quad(back, [x0, y0, z1], [W, 0, 0], [0, H, 0], [0, 0, 1], tile, tileV, x0 / tile, vy);
    // -z
    this.quad(front, [x1, y0, z0], [-W, 0, 0], [0, H, 0], [0, 0, -1], tile, tileV, -x1 / tile, vy);
    // top
    const tt = m.topTile || tile;
    this.quad(top, [x0, y1, z1], [W, 0, 0], [0, 0, -D], [0, 1, 0], tt, tt, x0 / tt, -z1 / tt);
    // bottom
    this.quad(bottom, [x0, y0, z0], [W, 0, 0], [0, 0, D], [0, -1, 0], tile, tile);
  }
  // add a normal three.js geometry (moved by a matrix) into a bucket
  geo(mat, geometry, matrix) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    const B = this.bucket(mat);
    const p = g.attributes.position.array, n = g.attributes.normal.array, uv = g.attributes.uv ? g.attributes.uv.array : null;
    for (let i = 0; i < p.length; i++) B.pos.push(p[i]);
    for (let i = 0; i < n.length; i++) B.nor.push(n[i]);
    for (let i = 0; i < p.length / 3; i++) { B.uv.push(uv ? uv[i * 2] : 0, uv ? uv[i * 2 + 1] : 0); }
    g.dispose();
  }
  build(shadows = true) {
    const group = new THREE.Group();
    for (const [mat, B] of this.buckets) {
      if (!B.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = shadows && !mat.transparent && !mat.userData.noShadow;
      mesh.receiveShadow = !mat.userData.noReceive;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
};
