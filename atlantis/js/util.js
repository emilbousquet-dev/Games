// ============================================================
//  ATLANTIS DIVER — small helper functions used everywhere
// ============================================================
window.AT = window.AT || {};

AT.TILE = 48;             // size of one map square in pixels
AT.PX_PER_M = 12;         // 12 pixels = 1 meter of depth
AT.VIEW_H = 720;          // how many world pixels fit in the screen height

// graphics quality (LOW = faster on old computers)
// phones and tablets start on LOW (you can switch to HIGH on the title screen)
AT.lowGfx = (() => {
  if (location.search.includes('low')) return true;
  try { const saved = localStorage.getItem('atlantis.gfx'); if (saved) return saved === 'low'; } catch (e) { /* */ }
  try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; }
})();

// how big the HUD and text should be (same on big screens, never too tiny on phones)
AT.ui = (W, H) => {
  const cw = Math.max(1, window.innerWidth), ch = Math.max(1, window.innerHeight);
  return (W / cw) * Math.max(0.68, Math.min(1.5, Math.min(cw / 1280, ch / 720) * 1.05));
};

// ?depth=300 starts at that depth, ?gold=5000 gives gold, ?max gives all upgrades (for testing)
AT.params = (() => { try { return new URLSearchParams(location.search); } catch (e) { return new Map(); } })();

AT.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  smooth: (t) => t * t * (3 - 2 * t),
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist: (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by),

  // smallest signed difference between two angles
  angleDiff(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  },

  // always the same "random" number (0..1) for the same x, y and seed
  hash(x, y, s = 0) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
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

  // colors: '#rrggbb' <-> [r, g, b]
  rgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; },
  css(c, a = 1) { return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; },

  // make a canvas and let a function draw on it
  canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext('2d');
    if (draw) draw(g, c.width, c.height);
    return c;
  },

  // a rounded rectangle path
  rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  },

  fmt: (n) => Math.floor(n).toLocaleString('en-US'),
};
