// ============================================================
//  LIL' PLUT ODYSSEY — small helper functions used everywhere
// ============================================================
window.LP = window.LP || {};

LP.TITLE = "LIL' PLUT ODYSSEY";   // change the name of the game here!
LP.T = 48;                         // size of one tile (one letter in the level maps), in pixels
LP.VH = 720;                       // how tall the screen is in game pixels (15 tiles)

// saving things in the browser. Never crashes if saving is blocked.
LP.store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('lp.' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('lp.' + key, JSON.stringify(value)); } catch (e) { /* saving blocked, that's ok */ }
  },
};

LP.settings = Object.assign({
  music: 0.7,
  sfx: 0.9,
  shake: true,
}, LP.store.get('settings', {}));
LP.saveSettings = () => LP.store.set('settings', LP.settings);

LP.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  chance: (p) => Math.random() < p,
  smooth: (t) => t * t * (3 - 2 * t),
  // move v towards target by at most step
  approach(v, target, step) { return v < target ? Math.min(v + step, target) : Math.max(v - step, target); },
  // a random number generator that always gives the same numbers for the same seed
  // (so the grass and flowers are always in the same place)
  rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  // a "random" number between 0 and 1 that is always the same for the same x, y
  hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  },
  overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; },
  dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); },
  // ease out with a little bounce at the end
  backOut(t) { const s = 1.7; t -= 1; return t * t * ((s + 1) * t + s) + 1; },
};

// mixes two colors like '#ff0000' and '#0000ff'. t = 0 gives a, t = 1 gives b
LP.U.mix = function (a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = Math.round(LP.U.lerp(pa >> 16, pb >> 16, t));
  const g = Math.round(LP.U.lerp((pa >> 8) & 255, (pb >> 8) & 255, t));
  const bl = Math.round(LP.U.lerp(pa & 255, pb & 255, t));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
};
// the same color but see-through
LP.U.alpha = function (c, a) {
  const p = parseInt(c.slice(1), 16);
  return `rgba(${p >> 16},${(p >> 8) & 255},${p & 255},${a})`;
};

// the font used for all the writing in the game
LP.FONT = "'Baloo 2', 'Trebuchet MS', 'Comic Sans MS', sans-serif";
