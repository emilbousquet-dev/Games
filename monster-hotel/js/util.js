// ============================================================
//  MONSTER HOTEL — small helper functions used everywhere
// ============================================================
window.MH = window.MH || {};

MH.CELL = 1.5;       // size of one map square in meters

// graphics quality (LOW = faster on old computers)
MH.lowGfx = (() => { try { return localStorage.getItem('mh.gfx') === 'low' || location.search.includes('low'); } catch (e) { return false; } })();

MH.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist: (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz),
  smooth: (t) => t * t * (3 - 2 * t),

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

  // map square <-> world position
  cellToWorld: (c) => c * MH.CELL + MH.CELL / 2,
  worldToCell: (w) => Math.floor(w / MH.CELL),

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

  // "8:30 PM" from hours after 8 PM
  clockText(h) {
    const total = 20 + h;
    let hh = Math.floor(total) % 24;
    const mm = Math.floor((total % 1) * 60 / 10) * 10;
    const pm = hh >= 12;
    let h12 = hh % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + (mm < 10 ? '0' : '') + mm + (pm ? ' PM' : ' AM');
  },
};
