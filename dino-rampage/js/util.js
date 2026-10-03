// ============================================================
//  DINO RAMPAGE — small helper functions used everywhere
// ============================================================
window.DR = window.DR || {};

// is this a phone or a tablet? (a finger instead of a mouse)
DR.touch = (() => { try { return matchMedia('(pointer: coarse)').matches || location.search.includes('touch'); } catch (e) { return false; } })();

// graphics quality (FAST = better for old computers and phones)
DR.lowGfx = (() => {
  try {
    const saved = localStorage.getItem('dr.gfx');
    return saved === 'low' || location.search.includes('low') || (DR.touch && saved !== 'high');
  } catch (e) { return DR.touch; }
})();

DR.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist: (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz),
  smooth: (t) => t * t * (3 - 2 * t),
  // move a value towards a target a little bit each frame (smoothly, whatever the frame rate)
  damp: (a, b, speed, dt) => a + (b - a) * (1 - Math.exp(-speed * dt)),

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

  // make a canvas and let a function draw on it
  canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (draw) draw(g, w, h);
    return c;
  },

  // rounded rectangle path on a canvas
  rrect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  },

  // 83.4 seconds -> "1:23"
  timeText(s) {
    s = Math.max(0, Math.floor(s));
    const m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  },
};
