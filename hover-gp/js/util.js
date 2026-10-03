// ============================================================
//  SIGMA HOVER GP — small helper functions used everywhere
// ============================================================
window.HG = window.HG || {};

// saving things in the browser (coins, unlocks, records, settings). Never crashes if saving is blocked.
HG.store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('hg.' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('hg.' + key, JSON.stringify(value)); } catch (e) { /* saving blocked, that's ok */ }
  },
};

// settings you can change in SETTINGS
HG.settings = Object.assign({
  gfx: 'high',          // 'low', 'medium' or 'high'
  music: 0.7,
  sfx: 0.9,
  autoGas: [true, true],     // drive forward by yourself (player 1, player 2)
  smartSteer: [true, true],  // the game helps you stay on the road
  camDist: 1,           // camera distance
  showFps: false,
  name: 'PLAYER',
}, HG.store.get('settings', {}));
if (location.search.includes('low')) HG.settings.gfx = 'low';
HG.saveSettings = () => HG.store.set('settings', HG.settings);

HG.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  smooth: (t) => t * t * (3 - 2 * t),
  sign: (v) => (v > 0 ? 1 : v < 0 ? -1 : 0),
  // move "a" toward "b" smoothly, the same speed on fast and slow computers
  damp: (a, b, speed, dt) => b + (a - b) * Math.exp(-speed * dt),
  // move toward a value by at most "step"
  approach: (a, b, step) => (a < b ? Math.min(b, a + step) : Math.max(b, a - step)),
  // shortest turn between two angles
  angleDiff(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; },
  wrapAngle(a) { a = a % (Math.PI * 2); if (a > Math.PI) a -= Math.PI * 2; if (a < -Math.PI) a += Math.PI * 2; return a; },
  shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
  // the same "random" numbers every time for the same seed
  rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  },
  hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
  // race time like 1:23.456
  time(t) {
    if (!isFinite(t) || t < 0) return '-:--.---';
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(3);
  },
  ordinal(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); },

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
  tex(canvas, repeatX, repeatY, srgb = true) {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (repeatX) t.repeat.set(repeatX, repeatY || repeatX);
    return t;
  },
  fmt(n) { return Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); },
  color(c) { return c instanceof THREE.Color ? c : new THREE.Color(c); },
};

// ------------------------------------------------------------
//  MERGER: glues lots of small shapes that use the same material
//  into ONE mesh. Fewer meshes = faster game.
// ------------------------------------------------------------
HG.Merger = class {
  constructor() { this.buckets = new Map(); }
  bucket(mat) {
    let b = this.buckets.get(mat);
    if (!b) { b = { pos: [], nor: [], uv: [], col: null }; this.buckets.set(mat, b); }
    return b;
  }
  // add a three.js geometry (moved by a matrix) into a bucket
  add(mat, geometry, matrix) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    if (matrix) g.applyMatrix4(matrix);
    const B = this.bucket(mat);
    const p = g.attributes.position.array, n = g.attributes.normal.array, uv = g.attributes.uv ? g.attributes.uv.array : null;
    for (let i = 0; i < p.length; i++) B.pos.push(p[i]);
    for (let i = 0; i < n.length; i++) B.nor.push(n[i]);
    for (let i = 0; i < p.length / 3; i++) B.uv.push(uv ? uv[i * 2] : 0, uv ? uv[i * 2 + 1] : 0);
    g.dispose();
  }
  // add a mesh (and its children) using their current positions relative to "root"
  addObject(obj, root) {
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    obj.traverse((o) => {
      if (!o.isMesh) return;
      const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      this.add(o.material, o.geometry, m);
    });
  }
  build(castShadow = true, receiveShadow = true) {
    const group = new THREE.Group();
    for (const [mat, B] of this.buckets) {
      if (!B.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = castShadow && !mat.transparent;
      mesh.receiveShadow = receiveShadow;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
};

// shared little vectors so we don't make garbage every frame
HG.V = {
  a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(),
  e: new THREE.Vector3(), f: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4(),
};
