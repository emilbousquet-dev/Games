// ============================================================
//  DRAGON LIFE — small helper functions used everywhere
// ============================================================
window.DL = window.DL || {};

// saving things in the browser. Never crashes if saving is blocked.
DL.store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('dl.' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('dl.' + key, JSON.stringify(value)); } catch (e) { /* saving blocked, that's ok */ }
  },
  del(key) { try { localStorage.removeItem('dl.' + key); } catch (e) { /* ok */ } },
};

// settings you can change on the title screen
DL.settings = Object.assign({
  gfx: 'high',      // 'low' or 'high'
  sens: 1,          // mouse speed
  music: 0.7,
  sfx: 0.9,
  tips: true,       // show the story tip at the top of the screen
  invertY: false,
}, DL.store.get('settings', {}));
if (location.search.includes('low')) DL.settings.gfx = 'low';
DL.saveSettings = () => DL.store.set('settings', DL.settings);
DL.debug = location.search.includes('debug');
// how smooth round things are (more pieces = rounder, but slower)
DL.Q = DL.settings.gfx === 'low' ? 1.3 : 2.2;

DL.U = {
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
  dampAngle(a, b, speed, dt) { return a + DL.U.angleDiff(a, b) * (1 - Math.exp(-speed * dt)); },
  dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; },

  // make a canvas and let a function draw on it
  canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (draw) draw(g, w, h);
    return c;
  },
  // turn a canvas into a 3D texture
  tex(canvas, repeat, srgb = true) {
    const t = new THREE.CanvasTexture(canvas);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (repeat) t.repeat.set(repeat, repeat);
    return t;
  },
  // a random number maker that always gives the same numbers for the same seed
  // (so the trees are in the same place every time you play)
  rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
};

// ------------------------------------------------------------
//  NOISE: smooth random hills. Used for the islands' shapes.
// ------------------------------------------------------------
DL.N = (function () {
  function hash(x, y, s) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function noise(x, y, s = 0) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct = 4, s = 0) {
    let t = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { t += amp * noise(x * f, y * f, s + i * 17); n += amp; amp *= 0.5; f *= 2.03; }
    return t / n;
  }
  return { noise, fbm, hash };
})();

// ------------------------------------------------------------
//  GEOMETRY HELPERS
//  merge lots of little shapes (each with its own color) into
//  ONE shape. One shape = faster game.
// ------------------------------------------------------------
DL.Geo = {
  // parts: [{ geo, color, matrix? , pos?, rot?, scale? }]
  merge(parts) {
    const pos = [], nor = [], col = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const c = new THREE.Color();
    for (const part of parts) {
      let g = part.geo.index ? part.geo.toNonIndexed() : part.geo.clone();
      if (part.matrix) m.copy(part.matrix);
      else {
        p.set(...(part.pos || [0, 0, 0]));
        e.set(...(part.rot || [0, 0, 0]));
        q.setFromEuler(e);
        const sc = part.scale === undefined ? [1, 1, 1] : (typeof part.scale === 'number' ? [part.scale, part.scale, part.scale] : part.scale);
        s.set(...sc);
        m.compose(p, q, s);
      }
      g.applyMatrix4(m);
      if (!g.attributes.normal) g.computeVertexNormals();
      c.set(part.color === undefined ? 0xffffff : part.color);
      const P = g.attributes.position.array, Nn = g.attributes.normal.array;
      const jitter = part.jitter || 0;
      const seedOff = Math.random() * 100;
      for (let i = 0; i < P.length; i += 3) {
        // a soft, smooth change of color over the shape: looks more natural than one flat color
        const j = jitter ? 1 + (DL.N.noise(P[i] * 1.7 + seedOff, P[i + 2] * 1.7 + P[i + 1] * 0.9, 3) - 0.5) * jitter * 1.6 : 1;
        pos.push(P[i], P[i + 1], P[i + 2]);
        nor.push(Nn[i], Nn[i + 1], Nn[i + 2]);
        col.push(c.r * j, c.g * j, c.b * j);
      }
      g.dispose();
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    out.computeBoundingSphere();
    return out;
  },
  // bumpy rock shape
  rock(radius, detail, seed, squash = 0.7, bumpy = 0.22) {
    // a smooth sphere, pushed in and out with noise
    const q = DL.Q * (detail + 1) / 2;
    const g = new THREE.SphereGeometry(radius, Math.round(12 * q), Math.round(9 * q));
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = v.clone().normalize();
      const k = 1 + (DL.N.fbm(n.x * 1.6 + seed * 3.1, n.z * 1.6 + n.y * 1.3 + seed, 3, seed) - 0.5) * bumpy * 2.2;
      v.multiplyScalar(k);
      v.y *= squash;
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  },
  // a soft lumpy ball (for leaves and clouds)
  blob(radius, seed, squash = 0.85) { return DL.Geo.rock(radius, 1, seed, squash, 0.3); },
};
