// ============================================================
//  JETPACK CITY — small helper functions used everywhere
// ============================================================
window.JC = window.JC || {};

// saving things in the browser (best score, bolts, garage). Never crashes if saving is blocked.
JC.store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('jc.' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('jc.' + key, JSON.stringify(value)); } catch (e) { /* saving blocked, that's ok */ }
  },
};

// graphics quality (FAST = better for old phones)
JC.lowGfx = JC.store.get('gfxFast', false) || location.search.includes('low');

JC.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  smooth: (t) => t * t * (3 - 2 * t),
  // move "a" toward "b" smoothly, the same speed on fast and slow phones
  damp: (a, b, speed, dt) => b + (a - b) * Math.exp(-speed * dt),

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

  // "#ff00aa" -> 0xff00aa
  hex: (s) => (typeof s === 'number' ? s : parseInt(String(s).replace('#', ''), 16)),
};
