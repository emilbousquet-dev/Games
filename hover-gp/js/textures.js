// ============================================================
//  SIGMA HOVER GP — PICTURES PAINTED WITH CODE
//  Roads, curbs, walls, grass, sand, ice, candy, neon...
//  There are no image files: everything is drawn here.
// ============================================================
window.HG = window.HG || {};

HG.Tex = (function () {
  const U = HG.U;
  const cache = {};
  let maxAniso = 8;

  function init(renderer) { maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy()); }

  function speckle(g, w, h, n, colors, rmin, rmax, alpha) {
    for (let i = 0; i < n; i++) {
      g.globalAlpha = alpha === undefined ? Math.random() * 0.5 : alpha;
      g.fillStyle = colors[(Math.random() * colors.length) | 0];
      const r = U.rand(rmin, rmax);
      g.fillRect(Math.random() * w, Math.random() * h, r, r);
    }
    g.globalAlpha = 1;
  }
  function make(key, w, h, draw, rx, ry, srgb) {
    if (cache[key]) return cache[key];
    const t = U.tex(U.canvas(w, h, draw), rx, ry, srgb);
    t.anisotropy = maxAniso;
    cache[key] = t;
    return t;
  }

  // ---------- ROADS (u goes across the road, v along it) ----------
  const roads = {
    asphalt: (g, w, h) => {
      g.fillStyle = '#3c3f46'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 9000, ['#2a2c31', '#55585f', '#474a51', '#30333a'], 1, 3);
      // edge lines
      g.fillStyle = '#f2f2f2'; g.fillRect(14, 0, 8, h); g.fillRect(w - 22, 0, 8, h);
      // dashed middle lines
      g.fillStyle = 'rgba(255,255,255,0.75)';
      for (let y = 0; y < h; y += 128) { g.fillRect(w / 3 - 3, y, 6, 64); g.fillRect(w * 2 / 3 - 3, y, 6, 64); }
    },
    neon: (g, w, h) => {
      g.fillStyle = '#14121e'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 4000, ['#1e1b2c', '#0c0b12', '#262236'], 1, 3);
      g.strokeStyle = 'rgba(80,220,255,0.25)'; g.lineWidth = 2;
      for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = '#ff2fd0'; g.fillRect(8, 0, 10, h); g.fillRect(w - 18, 0, 10, h);
      g.fillStyle = '#ffffff'; g.fillRect(12, 0, 3, h); g.fillRect(w - 14, 0, 3, h);
    },
    sand: (g, w, h) => {
      g.fillStyle = '#c99a5a'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 9000, ['#b5864a', '#d8ad6e', '#a87a40', '#e2bd82'], 1, 3);
      g.fillStyle = 'rgba(120,80,40,0.25)';
      for (let y = 0; y < h; y += 8) g.fillRect(w * 0.25 + Math.sin(y * 0.05) * 6, y, 22, 6), g.fillRect(w * 0.7 + Math.sin(y * 0.04) * 6, y, 22, 6);
      g.fillStyle = '#f0e0b8'; g.fillRect(10, 0, 6, h); g.fillRect(w - 16, 0, 6, h);
    },
    ice: (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#9fd8f0'); gr.addColorStop(0.5, '#cdeefa'); gr.addColorStop(1, '#9fd8f0');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
      for (let i = 0; i < 40; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += U.rand(-40, 40); y += U.rand(-40, 40); g.lineTo(x, y); } g.stroke(); }
      g.fillStyle = '#3a7ad0'; g.fillRect(10, 0, 8, h); g.fillRect(w - 18, 0, 8, h);
    },
    candy: (g, w, h) => {
      g.fillStyle = '#ffd6ec'; g.fillRect(0, 0, w, h);
      const cols = ['#ff6fb5', '#7fe0ff', '#fff07a', '#9cff8a'];
      for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) {
        g.fillStyle = cols[((x + y) / 64) % 4 | 0]; g.globalAlpha = 0.35;
        g.beginPath(); g.arc(x + 32, y + 32, 10, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
      g.fillStyle = '#ffffff'; g.fillRect(10, 0, 12, h); g.fillRect(w - 22, 0, 12, h);
      g.fillStyle = '#ff3d8b'; for (let y = 0; y < h; y += 32) { g.fillRect(10, y, 12, 16); g.fillRect(w - 22, y + 16, 12, 16); }
    },
    metal: (g, w, h) => {
      g.fillStyle = '#5a616c'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) {
        const gr = g.createLinearGradient(x, y, x + 128, y + 128); gr.addColorStop(0, '#6c747f'); gr.addColorStop(1, '#4c525c');
        g.fillStyle = gr; g.fillRect(x + 2, y + 2, 124, 124);
        g.fillStyle = '#868e99'; for (const [a, b] of [[10, 10], [118, 10], [10, 118], [118, 118]]) { g.beginPath(); g.arc(x + a, y + b, 4, 0, 7); g.fill(); }
      }
      speckle(g, w, h, 3000, ['#3e434a', '#7a828c'], 1, 2);
      g.fillStyle = '#ffcc00'; for (let y = 0; y < h; y += 40) { g.fillRect(6, y, 14, 20); g.fillRect(w - 20, y + 20, 14, 20); }
      g.fillStyle = '#222'; for (let y = 20; y < h; y += 40) { g.fillRect(6, y, 14, 20); g.fillRect(w - 20, y - 20, 14, 20); }
    },
    wood: (g, w, h) => {
      for (let x = 0; x < w; x += 64) {
        g.fillStyle = ['#8a5a32', '#7a4e2a', '#946238', '#82552e'][(x / 64) % 4];
        g.fillRect(x, 0, 64, h);
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 3, h);
        for (let k = 0; k < 14; k++) { g.fillStyle = 'rgba(60,30,10,0.25)'; g.fillRect(x + U.rand(6, 58), 0, 1.5, h); }
      }
      g.fillStyle = 'rgba(0,0,0,0.4)'; for (let y = 0; y < h; y += 256) g.fillRect(0, y, w, 4);
    },
    rainbow: (g, w, h) => {
      const cols = ['#ff3b3b', '#ff9a2a', '#ffe83a', '#4dff6a', '#3ad8ff', '#5a6bff', '#c44dff'];
      const bw = w / cols.length;
      cols.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * bw, 0, bw + 1, h); });
      g.fillStyle = 'rgba(255,255,255,0.35)'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 3);
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h);
    },
    stone: (g, w, h) => {
      g.fillStyle = '#7d7468'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 48) for (let x = (y / 48) % 2 ? -32 : 0; x < w; x += 64) {
        g.fillStyle = ['#8a8174', '#776e62', '#93897b', '#6e665b'][(Math.random() * 4) | 0];
        U.rrect(g, x + 3, y + 3, 58, 42, 8); g.fill();
      }
      speckle(g, w, h, 3000, ['#5c554b', '#a39a8c'], 1, 2);
      g.fillStyle = '#e8dcc0'; g.fillRect(8, 0, 8, h); g.fillRect(w - 16, 0, 8, h);
    },
    space: (g, w, h) => {
      g.fillStyle = '#0e1430'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(90,160,255,0.55)'; g.lineWidth = 3;
      for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.strokeStyle = 'rgba(90,160,255,0.2)'; g.lineWidth = 2;
      for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      g.fillStyle = '#3ad8ff'; g.fillRect(6, 0, 10, h); g.fillRect(w - 16, 0, 10, h);
    },
    dirt: (g, w, h) => {
      g.fillStyle = '#7a5434'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 9000, ['#6a462a', '#8c6440', '#5a3a22', '#9a7350'], 1, 4);
      g.fillStyle = 'rgba(40,20,10,0.3)';
      for (let y = 0; y < h; y += 6) { g.fillRect(w * 0.3 + Math.sin(y * 0.03) * 8, y, 18, 4); g.fillRect(w * 0.66 + Math.sin(y * 0.03) * 8, y, 18, 4); }
    },
    moon: (g, w, h) => {
      g.fillStyle = '#8d8f96'; g.fillRect(0, 0, w, h);
      speckle(g, w, h, 8000, ['#7a7c83', '#a0a2a9', '#6d6f75'], 1, 3);
      g.fillStyle = '#ffb020'; for (let y = 0; y < h; y += 64) { g.fillRect(8, y, 8, 32); g.fillRect(w - 16, y + 32, 8, 32); }
    },
  };
  function road(type) { return make('road-' + type, 512, 512, roads[type] || roads.asphalt, 1, 1); }

  // ---------- GROUND / OFFROAD ----------
  const grounds = {
    grass: (g, w, h) => { g.fillStyle = '#4c9a3a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 14000, ['#3e8a2e', '#5aae44', '#6cbc50', '#357a28'], 1, 4); },
    sand: (g, w, h) => { g.fillStyle = '#e2c48a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 12000, ['#d4b478', '#ecd29c', '#c9a76a'], 1, 3); },
    snow: (g, w, h) => { g.fillStyle = '#eef6fb'; g.fillRect(0, 0, w, h); speckle(g, w, h, 6000, ['#d6e6f2', '#ffffff', '#c8dcec'], 1, 4); },
    lava: (g, w, h) => {
      g.fillStyle = '#2a1410'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { g.strokeStyle = U.pick(['#ff5a10', '#ff8a20', '#ffcc40']); g.lineWidth = U.rand(1, 4); g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += U.rand(-30, 30); y += U.rand(-30, 30); g.lineTo(x, y); } g.stroke(); }
    },
    rock: (g, w, h) => { g.fillStyle = '#5a4a40'; g.fillRect(0, 0, w, h); speckle(g, w, h, 10000, ['#4a3c34', '#6e5c50', '#3c302a'], 1, 5); },
    candy: (g, w, h) => {
      g.fillStyle = '#b8f0ff'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) { g.fillStyle = U.pick(['#ff5fa8', '#ffe45a', '#7cff7a', '#ffffff', '#a070ff']); g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * 3); g.fillRect(-6, -2, 12, 4); g.restore(); }
    },
    moon: (g, w, h) => {
      g.fillStyle = '#9a9ca3'; g.fillRect(0, 0, w, h); speckle(g, w, h, 8000, ['#86888f', '#b0b2b8'], 1, 3);
      for (let i = 0; i < 25; i++) { const x = Math.random() * w, y = Math.random() * h, r = U.rand(6, 28); g.fillStyle = 'rgba(60,60,70,0.35)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = 'rgba(200,200,210,0.35)'; g.beginPath(); g.arc(x - r * 0.15, y - r * 0.15, r * 0.8, 0, 7); g.fill(); }
    },
    jungle: (g, w, h) => { g.fillStyle = '#2e6a2a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 14000, ['#245a20', '#3c8034', '#4a9a3c', '#1c4a18'], 1, 5); },
    metal: (g, w, h) => { g.fillStyle = '#3a3e46'; g.fillRect(0, 0, w, h); g.strokeStyle = '#2a2d33'; g.lineWidth = 4; for (let x = 0; x <= w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); } speckle(g, w, h, 3000, ['#4a4f58', '#30343a'], 1, 2); },
    cloud: (g, w, h) => { g.fillStyle = '#f4f8ff'; g.fillRect(0, 0, w, h); for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(200,215,240,0.4)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, U.rand(10, 40), 0, 7); g.fill(); } },
    seabed: (g, w, h) => { g.fillStyle = '#d8c48e'; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ['#c8b07a', '#e8d6a6', '#b49e6a'], 1, 3); for (let y = 0; y < h; y += 20) { g.strokeStyle = 'rgba(150,130,80,0.25)'; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 4); g.stroke(); } },
    neon: (g, w, h) => { g.fillStyle = '#100c1c'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,47,208,0.4)'; g.lineWidth = 2; for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); } },
    dirt: (g, w, h) => { g.fillStyle = '#6a4a30'; g.fillRect(0, 0, w, h); speckle(g, w, h, 12000, ['#5a3c24', '#7c5a3c', '#4a3020'], 1, 4); },
    hotel: (g, w, h) => { g.fillStyle = '#3a2440'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { g.fillStyle = ((x + y) / 64) % 2 ? '#4a2a50' : '#2e1a34'; g.fillRect(x, y, 64, 64); } },
  };
  function ground(type) { return make('ground-' + type, 512, 512, grounds[type] || grounds.grass, 1, 1); }

  // red and white curbs (the bumpy stripes at the edge of the road)
  function curb(a, b) {
    return make('curb-' + a + b, 64, 128, (g, w, h) => { g.fillStyle = a; g.fillRect(0, 0, w, h / 2); g.fillStyle = b; g.fillRect(0, h / 2, w, h / 2); g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(0, 0, 6, h); }, 1, 1);
  }

  // walls next to the road
  const walls = {
    barrier: (g, w, h) => { for (let x = 0; x < w; x += 64) { g.fillStyle = (x / 64) % 2 ? '#e8e8ec' : '#d82828'; g.fillRect(x, 0, 64, h); } g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(0, h - 10, w, 10); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(0, 4, w, 6); },
    neon: (g, w, h) => { g.fillStyle = '#1a1428'; g.fillRect(0, 0, w, h); g.fillStyle = '#2af0ff'; g.fillRect(0, 6, w, 10); g.fillStyle = '#ff2fd0'; g.fillRect(0, h - 22, w, 8); },
    rock: (g, w, h) => { g.fillStyle = '#6a5a4c'; g.fillRect(0, 0, w, h); speckle(g, w, h, 4000, ['#5a4a3e', '#7c6a5a', '#4a3c32'], 2, 8, 0.6); },
    ice: (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#e8faff'); gr.addColorStop(1, '#7cc6e8'); g.fillStyle = gr; g.fillRect(0, 0, w, h); },
    candy: (g, w, h) => { for (let x = -h; x < w + h; x += 32) { g.fillStyle = (x / 32) % 2 ? '#ffffff' : '#ff3d8b'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 32, 0); g.lineTo(x + 32 + h, h); g.lineTo(x + h, h); g.fill(); } },
    metal: (g, w, h) => { g.fillStyle = '#8a929c'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffcc00'; g.fillRect(0, 0, w, 10); for (let x = 0; x < w; x += 32) { g.fillStyle = '#222'; g.fillRect(x, 0, 16, 10); } g.fillStyle = '#6a727c'; for (let x = 0; x < w; x += 128) g.fillRect(x, 10, 4, h); },
    hedge: (g, w, h) => { g.fillStyle = '#2e6e2a'; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, ['#3c8a34', '#245a20', '#4a9a3c', '#6cbc50'], 2, 6, 0.8); },
    wood: (g, w, h) => { g.fillStyle = '#7a4e2a'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, 0, 3, h); } g.fillStyle = '#5a3a1e'; g.fillRect(0, 8, w, 8); g.fillRect(0, h - 16, w, 8); },
    glass: (g, w, h) => { g.fillStyle = 'rgba(160,220,255,0.35)'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(0, 0, w, 6); g.fillStyle = 'rgba(255,255,255,0.25)'; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 3, h); },
    rainbow: (g, w, h) => { const c = ['#ff3b3b', '#ff9a2a', '#ffe83a', '#4dff6a', '#3ad8ff', '#5a6bff', '#c44dff']; c.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, i * h / 7, w, h / 7 + 1); }); },
    bone: (g, w, h) => { g.fillStyle = '#2a1a2e'; g.fillRect(0, 0, w, h); g.fillStyle = '#e8e0cc'; for (let x = 8; x < w; x += 32) { U.rrect(g, x, 6, 14, h - 12, 7); g.fill(); } },
  };
  function wall(type) { return make('wall-' + type, 256, 64, walls[type] || walls.barrier, 1, 1); }

  // boost pad arrows (they scroll!)
  function boost() {
    return make('boost', 128, 128, (g, w, h) => {
      g.fillStyle = '#ff7a00'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffe14a';
      for (let y = -64; y < h; y += 64) { g.beginPath(); g.moveTo(10, y + 60); g.lineTo(w / 2, y + 12); g.lineTo(w - 10, y + 60); g.lineTo(w - 10, y + 84); g.lineTo(w / 2, y + 36); g.lineTo(10, y + 84); g.fill(); }
      g.strokeStyle = '#fff6c0'; g.lineWidth = 6; g.strokeRect(3, -10, w - 6, h + 20);
    }, 1, 1);
  }
  function checker() {
    return make('checker', 128, 128, (g, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 16, y * 16, 16, 16); } }, 1, 1);
  }
  function ramp() {
    return make('ramp', 128, 128, (g, w, h) => {
      g.fillStyle = '#2a7cff'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#9ad8ff'; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(16, y + 28); g.lineTo(w / 2, y + 6); g.lineTo(w - 16, y + 28); g.lineTo(w - 16, y + 34); g.lineTo(w / 2, y + 14); g.lineTo(16, y + 34); g.fill(); }
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h);
    }, 1, 1);
  }
  function glideRamp() {
    return make('glide', 128, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#00c8ff'); gr.addColorStop(0.5, '#a0f0ff'); gr.addColorStop(1, '#00c8ff');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffffff'; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(20, y + 28); g.lineTo(w / 2, y + 4); g.lineTo(w - 20, y + 28); g.lineTo(w / 2, y + 16); g.fill(); }
    }, 1, 1);
  }
  // the soft round dot for particles and shadows
  function dot() {
    return make('dot', 64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, 1, 1, false);
  }
  function shadow() {
    return make('shadow', 64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(0,0,0,0.75)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, 1, 1, false);
  }
  // text on a sign
  function sign(text, bg, fg, w = 512, h = 128) {
    return make('sign-' + text + bg + fg + w + h, w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = fg; g.font = 'bold ' + Math.floor(h * 0.62) + 'px "Arial Black", Arial, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 4);
    }, 1, 1);
  }
  // item box: a glowing cube with a "?" and Σ
  function itemBox() {
    return make('itembox', 128, 128, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, 'rgba(255,90,220,0.55)'); gr.addColorStop(0.5, 'rgba(90,200,255,0.55)'); gr.addColorStop(1, 'rgba(255,230,90,0.55)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#fff'; g.font = 'bold 84px "Arial Black", Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = '#000'; g.shadowBlur = 8; g.fillText('?', w / 2, h / 2 + 6);
    }, 1, 1);
  }
  function coin() {
    return make('coin', 128, 128, (g, w, h) => {
      const gr = g.createRadialGradient(50, 44, 4, 64, 64, 64); gr.addColorStop(0, '#fff6b0'); gr.addColorStop(0.5, '#ffcc1a'); gr.addColorStop(1, '#c88a00');
      g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill();
      g.strokeStyle = '#a86e00'; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 48, 0, 7); g.stroke();
      g.fillStyle = '#a86e00'; g.font = 'bold 70px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Σ', 64, 68);
    }, 1, 1);
  }
  // sky dome gradient
  function sky(top, mid, bottom, stars) {
    return make('sky-' + top + mid + bottom + stars, 32, 512, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, top); gr.addColorStop(0.45, mid); gr.addColorStop(0.5, bottom); gr.addColorStop(1, bottom);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }, 1, 1);
  }
  function stars() {
    return make('stars', 1024, 512, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1500; i++) {
        const y = Math.random() * h * 0.55, b = Math.random();
        g.fillStyle = 'rgba(255,255,255,' + (0.3 + b * 0.7) + ')';
        const r = b > 0.97 ? 2.2 : b > 0.85 ? 1.5 : 1;
        g.fillRect(Math.random() * w, y, r, r);
      }
    }, 1, 1);
  }
  // windows on buildings
  function windows(base, lit, night) {
    return make('win-' + base + lit + night, 128, 256, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let y = 8; y < h; y += 24) for (let x = 8; x < w; x += 24) {
        const on = Math.random() < (night ? 0.55 : 0.2);
        g.fillStyle = on ? lit : 'rgba(0,0,0,0.45)';
        g.fillRect(x, y, 14, 16);
      }
    }, 1, 1);
  }

  return { init, road, ground, curb, wall, boost, checker, ramp, glideRamp, dot, shadow, sign, itemBox, coin, sky, stars, windows, make, speckle };
})();
