// ============================================================
//  STARFALL — small helper functions used everywhere
// ============================================================
window.SF = window.SF || {};

// graphics quality (LOW = faster on old computers)
SF.lowGfx = (() => {
  try { return localStorage.getItem('starfall.gfx') === 'low' || location.search.includes('low'); } catch (e) { return false; }
})();
SF.debug = location.search.includes('debug');

SF.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist: (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz),
  smooth(a, b, v) { // smoothstep: 0 when v<=a, 1 when v>=b (works when a>b too)
    const t = SF.U.clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  },
  // move a value towards a target smoothly, the same speed at any frame rate
  damp: (a, b, rate, dt) => b + (a - b) * Math.exp(-rate * dt),

  // smallest signed difference between two angles
  angleDiff(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  },
  dampAngle(a, b, rate, dt) {
    return a + SF.U.angleDiff(a, b) * (1 - Math.exp(-rate * dt));
  },

  // a random generator that always gives the same numbers for the same seed
  seeded(seed) {
    let s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  // make a canvas and let a function draw on it
  canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    return c;
  },
  tex(canvas, rx = 1, ry = 1) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    return t;
  },

  // glue many geometries into one. Each can have its own color (vertex colors).
  // items: [{ geo, color, matrix? }]
  merge(items) {
    let n = 0;
    const geos = items.map((it) => {
      let g = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
      if (it.matrix) g.applyMatrix4(it.matrix);
      n += g.attributes.position.count;
      return g;
    });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
    let o = 0;
    const c = new THREE.Color();
    geos.forEach((g, i) => {
      const cnt = g.attributes.position.count;
      pos.set(g.attributes.position.array, o * 3);
      if (!g.attributes.normal) g.computeVertexNormals();
      nor.set(g.attributes.normal.array, o * 3);
      c.set(items[i].color === undefined ? 0xffffff : items[i].color);
      for (let k = 0; k < cnt; k++) { col[(o + k) * 3] = c.r; col[(o + k) * 3 + 1] = c.g; col[(o + k) * 3 + 2] = c.b; }
      o += cnt;
      g.dispose();
    });
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    bg.computeBoundingSphere();
    return bg;
  },

  // quick matrix from position / rotation / scale
  mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    const m = new THREE.Matrix4();
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    return m;
  },

  // time as 03:25
  timeText(sec) {
    const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  },
};

// ------------------------------------------------------------
//  NOISE: smooth random hills. Same seed = same planet.
// ------------------------------------------------------------
SF.Noise = (function () {
  const perm = new Uint8Array(512);
  const grad = new Float32Array(512 * 2);

  function setSeed(seed) {
    const r = SF.U.seeded(seed);
    const p = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) {
      perm[i] = p[i & 255];
      const a = r() * Math.PI * 2;
      grad[i * 2] = Math.cos(a); grad[i * 2 + 1] = Math.sin(a);
    }
  }

  // gradient noise, gives about -1..1
  function n2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
    const v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
    const g = (ix, iy, dx, dy) => {
      const h = perm[(perm[ix & 255] + iy) & 511];
      return grad[h * 2] * dx + grad[h * 2 + 1] * dy;
    };
    const a = g(X, Y, xf, yf), b = g(X + 1, Y, xf - 1, yf);
    const c = g(X, Y + 1, xf, yf - 1), d = g(X + 1, Y + 1, xf - 1, yf - 1);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 1.414;
  }

  // many layers of noise added together = natural looking hills
  function fbm(x, y, oct = 4) {
    let s = 0, amp = 1, f = 1, tot = 0;
    for (let i = 0; i < oct; i++) { s += n2(x * f + i * 17.3, y * f - i * 9.1) * amp; tot += amp; amp *= 0.5; f *= 2.03; }
    return s / tot;
  }
  // sharp mountain ridges
  function ridged(x, y, oct = 5) {
    let s = 0, amp = 1, f = 1, tot = 0;
    for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(n2(x * f + i * 31.7, y * f + i * 5.3)); s += v * v * amp; tot += amp; amp *= 0.5; f *= 2.1; }
    return s / tot;
  }

  setSeed(1313);
  return { setSeed, n2, fbm, ridged };
})();
