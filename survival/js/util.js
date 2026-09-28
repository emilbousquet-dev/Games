// ============================================================
//  DEAD ACRES — small helper functions used everywhere
// ============================================================
window.DA = window.DA || {};

// graphics quality (LOW = faster on old computers)
DA.lowGfx = (() => { try { return localStorage.getItem('deadacres.gfx') === 'low' || location.search.includes('low'); } catch (e) { return false; } })();

DA.U = (function () {
  const U = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
    dist: (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz),
    smooth: (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); },
    round: (v, n = 100) => Math.round(v * n) / n,

    // smallest signed difference between two angles
    angleDiff(a, b) {
      let d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
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

    // a number between 0 and 1 that is always the same for the same (x, y)
    hash(x, y, seed = 0) {
      let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 144269504);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    },

    // smooth random hills (value noise), gives -1..1
    noise(x, y, seed = 0) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
      const uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
      const a = U.hash(ix, iy, seed), b = U.hash(ix + 1, iy, seed);
      const c = U.hash(ix, iy + 1, seed), d = U.hash(ix + 1, iy + 1, seed);
      return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * 2 - 1;
    },

    // several layers of noise stacked together (big hills + small bumps)
    fbm(x, y, octaves = 4, seed = 0) {
      let v = 0, amp = 0.5, f = 1, tot = 0;
      for (let i = 0; i < octaves; i++) {
        v += U.noise(x * f, y * f, seed + i * 17) * amp;
        tot += amp; amp *= 0.5; f *= 2.03;
      }
      return v / tot;
    },

    // distance from a point to a line made of several points
    distToPath(x, z, pts) {
      let best = 1e9, bt = 0, bi = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
        const dx = bx - ax, dz = bz - az;
        const L = dx * dx + dz * dz;
        let t = L ? ((x - ax) * dx + (z - az) * dz) / L : 0;
        t = Math.max(0, Math.min(1, t));
        const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
        if (d < best) { best = d; bt = t; bi = i; }
      }
      return best;
    },

    // make a canvas and let a function draw on it
    canvas(w, h, draw) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      draw(g, w, h);
      return c;
    },

    // turn a canvas drawing into a 3D texture
    tex(canvas, repeatX = 1, repeatY = 1) {
      const t = new THREE.CanvasTexture(canvas);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeatX, repeatY);
      t.anisotropy = 8;
      return t;
    },

    // glue many geometries into one (they must already be moved into place)
    mergeGeometries(geos) {
      let n = 0;
      const hasColor = geos.some((g) => g.attributes.color);
      geos.forEach((g) => (n += g.attributes.position.count));
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      const col = hasColor ? new Float32Array(n * 3) : null;
      let o3 = 0, o2 = 0;
      for (const g of geos) {
        const c = g.attributes.position.count;
        pos.set(g.attributes.position.array, o3);
        nor.set(g.attributes.normal.array, o3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o2);
        if (col) {
          if (g.attributes.color) col.set(g.attributes.color.array, o3);
          else col.fill(1, o3, o3 + c * 3);
        }
        o3 += c * 3; o2 += c * 2;
        g.dispose();
      }
      const bg = new THREE.BufferGeometry();
      bg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      if (col) bg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      bg.computeBoundingSphere();
      bg.computeBoundingBox();
      return bg;
    },

    // "3 minutes ago" style short text for numbers of seconds
    fmtTime(s) {
      s = Math.max(0, Math.floor(s));
      const m = Math.floor(s / 60);
      return m + ':' + String(s % 60).padStart(2, '0');
    },

    // make text safe to put inside HTML
    esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  };
  return U;
})();
