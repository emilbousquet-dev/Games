// ============================================================
//  NINJA CAT — small helper functions used everywhere
// ============================================================
window.NC = window.NC || {};

// saving things in the browser (fish, hats, best times...). Never crashes if saving is blocked.
NC.store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('nc.' + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('nc.' + key, JSON.stringify(value)); } catch (e) { /* saving blocked, that's ok */ }
  },
};

// graphics quality (LOW = better for slow computers)
NC.lowGfx = NC.store.get('gfxLow', false) || location.search.includes('low');

NC.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  smooth: (t) => t * t * (3 - 2 * t),
  dist: (x1, z1, x2, z2) => Math.hypot(x2 - x1, z2 - z1),
  dist3: (a, b) => Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z),
  // move "a" toward "b" smoothly, the same speed on fast and slow computers
  damp: (a, b, speed, dt) => b + (a - b) * Math.exp(-speed * dt),
  // the shortest way to turn from angle a to angle b
  angleDiff(a, b) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return d;
  },
  dampAngle(a, b, speed, dt) { return a + NC.U.angleDiff(a, b) * (1 - Math.exp(-speed * dt)); },

  // random numbers that are the same every time (for the music and decorations)
  seeded(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
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

  // seconds -> "1:05.3"
  time(t) {
    if (t == null || !isFinite(t)) return '--:--';
    const m = Math.floor(t / 60), s = t - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  },
};
