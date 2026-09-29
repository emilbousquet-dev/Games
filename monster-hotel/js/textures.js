// ============================================================
//  MONSTER HOTEL — TEXTURES
//  Every picture in the game is painted with code on a canvas.
// ============================================================
window.MH = window.MH || {};

MH.Tex = (function () {
  const U = MH.U;
  const cache = {};
  const once = (key, make) => cache[key] || (cache[key] = make());
  const rnd = U.seeded(1313);
  const R = (a, b) => a + rnd() * (b - a);

  function tex(canvas, repeat = true, color = true) {
    const t = new THREE.CanvasTexture(canvas);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = MH.maxAniso || 4;
    t.needsUpdate = true;
    return t;
  }

  // sprinkle soft noise over a canvas
  function grain(g, w, h, n, a, light) {
    for (let i = 0; i < n; i++) {
      const s = R(1, 3);
      g.fillStyle = (light && rnd() < 0.5) ? `rgba(255,255,255,${R(0, a)})` : `rgba(0,0,0,${R(0, a)})`;
      g.fillRect(R(0, w), R(0, h), s, s);
    }
  }
  const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

  // ---------- CASTLE STONE ----------
  function stone() {
    return once('stone', () => {
      const W = 512, H = 512;
      const bump = U.canvas(W, H);
      const bg = bump.getContext('2d');
      bg.fillStyle = '#222'; bg.fillRect(0, 0, W, H);
      const c = U.canvas(W, H, (g) => {
        g.fillStyle = '#2a2330'; g.fillRect(0, 0, W, H);
        const rowH = 64;
        for (let y = 0; y < H; y += rowH) {
          let x = (y / rowH) % 2 ? -R(30, 60) : 0;
          while (x < W) {
            const w = R(80, 150);
            const l = R(30, 42), hue = R(255, 280);
            g.fillStyle = hsl(hue, R(8, 16), l);
            U.rrect(g, x + 3, y + 3, w - 6, rowH - 6, 10); g.fill();
            // a little shading on each stone
            const grd = g.createLinearGradient(0, y, 0, y + rowH);
            grd.addColorStop(0, 'rgba(255,255,255,0.10)'); grd.addColorStop(1, 'rgba(0,0,0,0.22)');
            g.fillStyle = grd; U.rrect(g, x + 3, y + 3, w - 6, rowH - 6, 10); g.fill();
            for (let i = 0; i < 14; i++) {
              g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${R(0.03, 0.08)})`;
              g.beginPath(); g.ellipse(x + R(10, w - 10), y + R(10, rowH - 10), R(4, 16), R(3, 9), 0, 0, Math.PI * 2); g.fill();
            }
            bg.fillStyle = `rgb(${R(150, 200)},${R(150, 200)},${R(150, 200)})`;
            U.rrect(bg, x + 3, y + 3, w - 6, rowH - 6, 10); bg.fill();
            x += w;
          }
        }
        grain(g, W, H, 5000, 0.12, true);
      });
      return { map: tex(c), bump: tex(bump, true, false) };
    });
  }

  // ---------- WALLPAPER (fancy damask pattern) ----------
  const PAPER = {
    room: { base: '#3a2150', dark: '#2a1640', pat: '#59357a', gold: '#b08a3e' },
    hall: { base: '#4a1426', dark: '#360c1a', pat: '#6c2238', gold: '#b08a3e' },
    teal: { base: '#16383c', dark: '#0e282b', pat: '#245459', gold: '#b08a3e' },
  };
  function wallpaper(kind = 'room') {
    return once('paper' + kind, () => {
      const P = PAPER[kind];
      const c = U.canvas(256, 512, (g, w, h) => {
        g.fillStyle = P.base; g.fillRect(0, 0, w, h);
        // soft vertical stripes
        for (let x = 0; x < w; x += 64) { g.fillStyle = P.dark; g.fillRect(x + 28, 0, 8, h); }
        // damask flowers
        const flower = (cx, cy, s) => {
          g.save(); g.translate(cx, cy); g.scale(s, s);
          g.fillStyle = P.pat;
          g.beginPath();
          g.moveTo(0, -60);
          g.bezierCurveTo(30, -40, 34, -10, 12, 0);
          g.bezierCurveTo(40, 10, 36, 44, 0, 62);
          g.bezierCurveTo(-36, 44, -40, 10, -12, 0);
          g.bezierCurveTo(-34, -10, -30, -40, 0, -60);
          g.fill();
          g.fillStyle = P.base;
          g.beginPath(); g.ellipse(0, 0, 8, 20, 0, 0, Math.PI * 2); g.fill();
          g.strokeStyle = P.gold; g.globalAlpha = 0.35; g.lineWidth = 2;
          g.beginPath(); g.arc(0, -30, 8, 0, Math.PI * 2); g.stroke();
          g.beginPath(); g.arc(0, 30, 8, 0, Math.PI * 2); g.stroke();
          // curly bits
          for (const sx of [-1, 1]) {
            g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(sx * 40, -10, sx * 50, 20, sx * 30, 28); g.stroke();
          }
          g.restore();
        };
        flower(64, 128, 0.9); flower(192, 384, 0.9);
        flower(192, 128 - 256 + 256, 0.5); flower(64, 384, 0.5);
        flower(0, 256, 0.6); flower(256, 256, 0.6); flower(128, 0, 0.6); flower(128, 512, 0.6);
        grain(g, w, h, 1800, 0.08, true);
      });
      return tex(c);
    });
  }

  // ---------- WOOD ----------
  function woodGrain(g, x, y, w, h, hue, light) {
    g.fillStyle = hsl(hue, 45, light); g.fillRect(x, y, w, h);
    for (let i = 0; i < w / 3; i++) {
      g.strokeStyle = `rgba(0,0,0,${R(0.04, 0.14)})`; g.lineWidth = R(0.5, 2);
      const gx = x + R(0, w);
      g.beginPath(); g.moveTo(gx, y);
      g.bezierCurveTo(gx + R(-6, 6), y + h * 0.3, gx + R(-6, 6), y + h * 0.7, gx + R(-4, 4), y + h); g.stroke();
    }
    for (let i = 0; i < 2; i++) if (rnd() < 0.4) {
      const kx = x + R(4, w - 4), ky = y + R(10, h - 10);
      g.strokeStyle = 'rgba(40,15,5,0.35)'; g.lineWidth = 1.5;
      g.beginPath(); g.ellipse(kx, ky, R(2, 5), R(6, 12), 0, 0, Math.PI * 2); g.stroke();
    }
  }
  function woodFloor() {
    return once('woodFloor', () => {
      const W = 512, H = 512;
      const bump = U.canvas(W, H, (g) => { g.fillStyle = '#bbb'; g.fillRect(0, 0, W, H); });
      const bg = bump.getContext('2d');
      const c = U.canvas(W, H, (g) => {
        const pw = 64;
        for (let x = 0; x < W; x += pw) {
          let y = -R(0, 300);
          while (y < H) {
            const len = R(200, 340);
            woodGrain(g, x, y, pw, len, R(20, 28), R(20, 28));
            g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(x, y, pw, 3); g.fillRect(x, y, 3, len);
            bg.fillStyle = '#333'; bg.fillRect(x, y, pw, 3); bg.fillRect(x, y, 3, len);
            y += len;
          }
        }
        grain(g, W, H, 3000, 0.08, true);
      });
      return { map: tex(c), bump: tex(bump, true, false) };
    });
  }
  function woodPanel() {
    return once('woodPanel', () => {
      const W = 256, H = 256;
      const bump = U.canvas(W, H, (g) => { g.fillStyle = '#999'; g.fillRect(0, 0, W, H); });
      const bg = bump.getContext('2d');
      const c = U.canvas(W, H, (g) => {
        woodGrain(g, 0, 0, W, H, 18, 16);
        // one raised panel with a frame
        const pad = 22;
        g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(pad - 4, pad - 4, W - pad * 2 + 8, H - pad * 2 + 8);
        woodGrain(g, pad, pad, W - pad * 2, H - pad * 2, 18, 20);
        g.strokeStyle = 'rgba(255,200,120,0.18)'; g.lineWidth = 3;
        g.strokeRect(pad + 8, pad + 8, W - pad * 2 - 16, H - pad * 2 - 16);
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(0, 0, 4, H); g.fillRect(W - 4, 0, 4, H);
        bg.fillStyle = '#555'; bg.fillRect(pad - 4, pad - 4, W - pad * 2 + 8, H - pad * 2 + 8);
        bg.fillStyle = '#ddd'; bg.fillRect(pad + 6, pad + 6, W - pad * 2 - 12, H - pad * 2 - 12);
      });
      return { map: tex(c), bump: tex(bump, true, false) };
    });
  }
  function darkWood() {
    return once('darkWood', () => tex(U.canvas(256, 256, (g, w, h) => { woodGrain(g, 0, 0, w, h, 14, 12); grain(g, w, h, 800, 0.1, true); })));
  }
  function lightWood() {
    return once('lightWood', () => tex(U.canvas(256, 256, (g, w, h) => { woodGrain(g, 0, 0, w, h, 26, 34); grain(g, w, h, 800, 0.1, true); })));
  }
  function doorWood() {
    return once('doorWood', () => tex(U.canvas(256, 512, (g, w, h) => {
      for (let x = 0; x < w; x += 64) {
        woodGrain(g, x, 0, 64, h, 16, R(18, 22));
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x, 0, 3, h);
      }
      grain(g, w, h, 1500, 0.1, true);
    }), false));
  }

  // ---------- MARBLE (lobby floor) ----------
  function marble() {
    return once('marble', () => {
      const W = 512, H = 512;
      const bump = U.canvas(W, H, (g) => { g.fillStyle = '#ccc'; g.fillRect(0, 0, W, H); });
      const bg = bump.getContext('2d');
      const c = U.canvas(W, H, (g) => {
        const t = 256;
        for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
          const dark = (x + y) % 2 === 0;
          g.fillStyle = dark ? '#1d1424' : '#4b3a63';
          g.fillRect(x * t, y * t, t, t);
          // veins
          for (let i = 0; i < 6; i++) {
            g.strokeStyle = dark ? `rgba(160,120,200,${R(0.08, 0.2)})` : `rgba(255,240,255,${R(0.1, 0.25)})`;
            g.lineWidth = R(0.8, 2.5);
            g.beginPath();
            let px = x * t + R(0, t), py = y * t;
            g.moveTo(px, py);
            for (let k = 0; k < 8; k++) { px += R(-30, 30); py += t / 8; g.lineTo(px, py); }
            g.stroke();
          }
          const grd = g.createRadialGradient(x * t + t / 2, y * t + t / 2, 10, x * t + t / 2, y * t + t / 2, t * 0.75);
          grd.addColorStop(0, 'rgba(255,255,255,0.06)'); grd.addColorStop(1, 'rgba(0,0,0,0.12)');
          g.fillStyle = grd; g.fillRect(x * t, y * t, t, t);
          g.fillStyle = '#b08a3e'; g.fillRect(x * t, y * t, t, 3); g.fillRect(x * t, y * t, 3, t);
          bg.fillStyle = '#555'; bg.fillRect(x * t, y * t, t, 3); bg.fillRect(x * t, y * t, 3, t);
        }
      });
      return { map: tex(c), bump: tex(bump, true, false) };
    });
  }

  // ---------- KITCHEN ----------
  function checker() {
    return once('checker', () => tex(U.canvas(256, 256, (g, w, h) => {
      const t = 64;
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        g.fillStyle = (x + y) % 2 ? '#b8ae9c' : '#1c1a22';
        g.fillRect(x * t, y * t, t, t);
      }
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, h); g.stroke(); g.beginPath(); g.moveTo(0, i * t); g.lineTo(w, i * t); g.stroke(); }
      grain(g, w, h, 1500, 0.1, true);
    })));
  }
  function greenTile() {
    return once('greenTile', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#1e3a2a'; g.fillRect(0, 0, w, h);
      const tw = 64, th = 32;
      for (let y = 0; y < h; y += th) {
        const off = (y / th) % 2 ? tw / 2 : 0;
        for (let x = -tw; x < w + tw; x += tw) {
          const l = R(34, 42);
          g.fillStyle = hsl(150, 38, l);
          U.rrect(g, x + off + 2, y + 2, tw - 4, th - 4, 4); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(x + off + 5, y + 4, tw - 12, 4);
        }
      }
    })));
  }

  // ---------- CARPET & RUGS ----------
  function carpet() {
    return once('carpet', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#7a1222'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c8a24a'; g.fillRect(0, 0, 14, h); g.fillRect(w - 14, 0, 14, h);
      g.fillStyle = '#4a0812'; g.fillRect(14, 0, 8, h); g.fillRect(w - 22, 0, 8, h);
      // little diamond pattern
      g.fillStyle = '#951a2e';
      for (let y = 0; y < h; y += 64) {
        g.beginPath(); g.moveTo(w / 2, y + 8); g.lineTo(w / 2 + 40, y + 32); g.lineTo(w / 2, y + 56); g.lineTo(w / 2 - 40, y + 32); g.fill();
      }
      g.fillStyle = '#c8a24a';
      for (let y = 0; y < h; y += 64) { g.beginPath(); g.arc(w / 2, y + 32, 6, 0, Math.PI * 2); g.fill(); }
      grain(g, w, h, 4000, 0.12, true);
    })));
  }
  function roundRug() {
    return once('roundRug', () => tex(U.canvas(512, 512, (g, w, h) => {
      const cx = w / 2, cy = h / 2;
      const ring = (r, col) => { g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill(); };
      ring(254, '#c8a24a'); ring(244, '#5a1030'); ring(210, '#c8a24a'); ring(204, '#3a1a52'); ring(120, '#5a1030'); ring(112, '#c8a24a'); ring(104, '#2a0e3c');
      // bat in the middle
      g.save(); g.translate(cx, cy); g.fillStyle = '#c8a24a';
      bat(g, 0, 0, 1.4); g.restore();
      // star points around
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        g.save(); g.translate(cx + Math.cos(a) * 160, cy + Math.sin(a) * 160); g.rotate(a);
        g.fillStyle = i % 2 ? '#c8a24a' : '#8a2a60';
        g.beginPath(); g.moveTo(-14, 0); g.lineTo(0, -10); g.lineTo(14, 0); g.lineTo(0, 10); g.fill();
        g.restore();
      }
      grain(g, w, h, 6000, 0.12, true);
    }), false));
  }
  function rectRug(hue) {
    return once('rug' + hue, () => tex(U.canvas(256, 384, (g, w, h) => {
      g.fillStyle = hsl(hue, 45, 22); g.fillRect(0, 0, w, h);
      g.strokeStyle = '#c8a24a'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
      g.strokeStyle = hsl(hue, 50, 35); g.lineWidth = 6; g.strokeRect(34, 34, w - 68, h - 68);
      g.fillStyle = hsl(hue, 50, 35);
      g.beginPath(); g.moveTo(w / 2, 70); g.lineTo(w - 70, h / 2); g.lineTo(w / 2, h - 70); g.lineTo(70, h / 2); g.fill();
      g.fillStyle = '#c8a24a'; g.beginPath(); g.arc(w / 2, h / 2, 16, 0, Math.PI * 2); g.fill();
      grain(g, w, h, 3000, 0.14, true);
    }), false));
  }

  // ---------- CEILINGS ----------
  function plaster() {
    return once('plaster', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#4a3e52'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${R(0.02, 0.05)})`;
        g.beginPath(); g.arc(R(0, w), R(0, h), R(10, 40), 0, Math.PI * 2); g.fill();
      }
      grain(g, w, h, 2500, 0.08, true);
    })));
  }
  function coffered() {
    return once('coffered', () => tex(U.canvas(256, 256, (g, w, h) => {
      woodGrain(g, 0, 0, w, h, 16, 10);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(30, 30, w - 60, h - 60);
      woodGrain(g, 40, 40, w - 80, h - 80, 18, 16);
      g.strokeStyle = '#8a6a30'; g.lineWidth = 3; g.strokeRect(46, 46, w - 92, h - 92);
      g.fillStyle = '#b08a3e'; g.beginPath(); g.arc(w / 2, h / 2, 10, 0, Math.PI * 2); g.fill();
    })));
  }

  // ---------- NIGHT SKY (seen through the windows) ----------
  function sky() {
    return once('sky', () => tex(U.canvas(1024, 512, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#0b0a26'); grd.addColorStop(0.45, '#2a1e5a'); grd.addColorStop(0.75, '#5a3a7a'); grd.addColorStop(1, '#1a1030');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(255,255,240,${R(0.3, 1)})`;
        const s = R(0.6, 2.2); g.fillRect(R(0, w), R(0, h * 0.6), s, s);
      }
      // the big moon
      const mx = w * 0.62, my = h * 0.3;
      const glow = g.createRadialGradient(mx, my, 40, mx, my, 220);
      glow.addColorStop(0, 'rgba(255,240,200,0.55)'); glow.addColorStop(1, 'rgba(255,240,200,0)');
      g.fillStyle = glow; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(mx, my, 78, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(200,180,150,0.35)';
      [[-20, -18, 16], [24, 10, 12], [-8, 30, 9], [30, -30, 7]].forEach(([x, y, r]) => { g.beginPath(); g.arc(mx + x, my + y, r, 0, Math.PI * 2); g.fill(); });
      // bats flying past the moon
      g.fillStyle = '#120a1e';
      bat(g, mx - 60, my + 40, 0.35); bat(g, mx + 90, my - 20, 0.28); bat(g, mx + 30, my + 70, 0.22);
      // clouds
      for (let i = 0; i < 9; i++) {
        const cx = R(0, w), cy = R(h * 0.15, h * 0.5);
        g.fillStyle = `rgba(90,70,130,${R(0.3, 0.55)})`;
        for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(cx + k * 30 - 60, cy + R(-8, 8), R(40, 70), R(10, 18), 0, 0, Math.PI * 2); g.fill(); }
      }
      // hills
      g.fillStyle = '#1b1233';
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 32) g.lineTo(x, h * 0.72 + Math.sin(x * 0.006) * 40 + Math.sin(x * 0.021) * 12);
      g.lineTo(w, h); g.fill();
      g.fillStyle = '#0e0920';
      g.beginPath(); g.moveTo(0, h);
      for (let x = 0; x <= w; x += 24) g.lineTo(x, h * 0.84 + Math.sin(x * 0.009 + 2) * 26);
      g.lineTo(w, h); g.fill();
      // dead trees
      const tree = (x, y, s) => {
        g.strokeStyle = '#0e0920'; g.lineCap = 'round';
        const branch = (bx, by, a, len, wd, d) => {
          const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
          g.lineWidth = wd; g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
          if (d > 0) { branch(ex, ey, a - R(0.3, 0.7), len * 0.7, wd * 0.65, d - 1); branch(ex, ey, a + R(0.3, 0.7), len * 0.7, wd * 0.65, d - 1); }
        };
        branch(x, y, -Math.PI / 2, 50 * s, 9 * s, 4);
      };
      tree(w * 0.15, h * 0.86, 1.1); tree(w * 0.4, h * 0.83, 0.8); tree(w * 0.88, h * 0.8, 1.3);
      // a far away village with warm lights
      for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(255,190,90,${R(0.5, 0.9)})`; g.fillRect(w * 0.25 + R(0, 200), h * 0.8 + R(-6, 10), 3, 3); }
    }), false));
  }

  // ---------- PORTRAITS on the walls ----------
  const PORTRAITS = ['vampire', 'wolf', 'moon', 'mummy', 'ghost', 'bat'];
  function portrait(kind) {
    return once('portrait' + kind, () => tex(U.canvas(256, 320, (g, w, h) => {
      const bgc = { vampire: ['#3a1030', '#120616'], wolf: ['#1e2a48', '#0a0e1c'], moon: ['#2a2458', '#0c0a22'], mummy: ['#4a3a18', '#1a1206'], ghost: ['#1c3a3a', '#081414'], bat: ['#3a1a4a', '#12061a'] }[kind];
      const grd = g.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h / 2, h * 0.7);
      grd.addColorStop(0, bgc[0]); grd.addColorStop(1, bgc[1]);
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.lineCap = 'round';
      if (kind === 'vampire') {
        g.fillStyle = '#0a0a10'; g.beginPath(); g.moveTo(40, h); g.lineTo(60, 200); g.lineTo(128, 240); g.lineTo(196, 200); g.lineTo(216, h); g.fill();
        g.fillStyle = '#8a1020'; g.beginPath(); g.moveTo(60, 200); g.lineTo(30, 150); g.lineTo(100, 215); g.fill(); g.beginPath(); g.moveTo(196, 200); g.lineTo(226, 150); g.lineTo(156, 215); g.fill();
        g.fillStyle = '#e6e0f0'; g.beginPath(); g.ellipse(128, 140, 50, 64, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#0a0a10'; g.beginPath(); g.moveTo(74, 130); g.quadraticCurveTo(80, 60, 128, 70); g.quadraticCurveTo(176, 60, 182, 130); g.quadraticCurveTo(160, 90, 128, 110); g.quadraticCurveTo(96, 90, 74, 130); g.fill();
        g.fillStyle = '#c02030'; g.beginPath(); g.arc(108, 140, 6, 0, 7); g.arc(148, 140, 6, 0, 7); g.fill();
        g.strokeStyle = '#300'; g.lineWidth = 3; g.beginPath(); g.arc(128, 168, 18, 0.2, Math.PI - 0.2); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(116, 178); g.lineTo(120, 190); g.lineTo(124, 180); g.fill(); g.beginPath(); g.moveTo(132, 180); g.lineTo(136, 190); g.lineTo(140, 178); g.fill();
      } else if (kind === 'wolf') {
        g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(180, 80, 40, 0, 7); g.fill();
        g.fillStyle = '#05060c'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, 260); g.lineTo(256, 250); g.lineTo(256, h); g.fill();
        g.beginPath(); g.moveTo(70, 260); g.lineTo(80, 180); g.lineTo(60, 150); g.lineTo(90, 160); g.lineTo(100, 120); g.lineTo(110, 150); g.lineTo(150, 110); g.lineTo(140, 160); g.lineTo(170, 200); g.lineTo(160, 260); g.fill();
      } else if (kind === 'moon') {
        g.fillStyle = '#fff4d6'; g.beginPath(); g.arc(128, 130, 70, 0, 7); g.fill();
        g.fillStyle = bgc[1]; g.beginPath(); g.arc(160, 110, 62, 0, 7); g.fill();
        g.fillStyle = '#0a0612'; bat(g, 90, 220, 0.6);
      } else if (kind === 'mummy') {
        g.fillStyle = '#d8c8a0'; g.beginPath(); g.ellipse(128, 150, 60, 80, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#8a7a58'; g.lineWidth = 4;
        for (let y = 80; y < 230; y += 16) { g.beginPath(); g.moveTo(70, y + R(-6, 6)); g.lineTo(186, y + R(-6, 6)); g.stroke(); }
        g.fillStyle = '#fff'; g.beginPath(); g.arc(150, 140, 16, 0, 7); g.fill();
        g.fillStyle = '#111'; g.beginPath(); g.arc(152, 142, 7, 0, 7); g.fill();
        g.fillStyle = '#c8a24a'; g.fillRect(40, 250, 176, 10);
      } else if (kind === 'ghost') {
        g.fillStyle = '#081414'; g.fillRect(0, 220, w, 100);
        g.fillStyle = 'rgba(200,255,250,0.85)'; g.beginPath(); g.moveTo(80, 240); g.quadraticCurveTo(70, 90, 128, 80); g.quadraticCurveTo(186, 90, 176, 240);
        for (let x = 176; x > 80; x -= 16) g.quadraticCurveTo(x - 8, 225, x - 16, 240);
        g.fill();
        g.fillStyle = '#0a1a1a'; g.beginPath(); g.ellipse(110, 140, 10, 16, 0, 0, 7); g.ellipse(146, 140, 10, 16, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(128, 180, 10, 14, 0, 0, 7); g.fill();
      } else {
        g.fillStyle = '#0a0612'; bat(g, 128, 150, 1.6);
        g.fillStyle = '#ffcc40'; g.beginPath(); g.arc(114, 140, 4, 0, 7); g.arc(142, 140, 4, 0, 7); g.fill();
      }
      // old painting cracks and varnish
      const v = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,10,0,0.55)');
      g.fillStyle = v; g.fillRect(0, 0, w, h);
      grain(g, w, h, 2500, 0.1, true);
    }), false));
  }

  // a little bat shape (centered at x,y)
  function bat(g, x, y, s) {
    g.save(); g.translate(x, y); g.scale(s, s);
    g.beginPath();
    g.moveTo(0, -8);
    g.quadraticCurveTo(20, -30, 70, -20);
    g.quadraticCurveTo(58, -8, 60, 6);
    g.quadraticCurveTo(46, -2, 36, 10);
    g.quadraticCurveTo(26, 0, 14, 14);
    g.quadraticCurveTo(6, 8, 0, 18);
    g.quadraticCurveTo(-6, 8, -14, 14);
    g.quadraticCurveTo(-26, 0, -36, 10);
    g.quadraticCurveTo(-46, -2, -60, 6);
    g.quadraticCurveTo(-58, -8, -70, -20);
    g.quadraticCurveTo(-20, -30, 0, -8);
    g.fill();
    g.beginPath(); g.moveTo(-8, -10); g.lineTo(-10, -22); g.lineTo(-3, -12); g.lineTo(3, -12); g.lineTo(10, -22); g.lineTo(8, -10); g.fill();
    g.restore();
  }

  // ---------- FUR / BANDAGES / FABRIC ----------
  function fur(color) {
    return once('fur' + color, () => {
      const c = U.canvas(256, 256, (g, w, h) => {
        g.fillStyle = color; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) {
          const x = R(0, w), y = R(0, h), l = R(6, 16);
          g.strokeStyle = rnd() < 0.5 ? `rgba(0,0,0,${R(0.08, 0.25)})` : `rgba(255,255,255,${R(0.05, 0.16)})`;
          g.lineWidth = R(1, 2);
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(-3, 3), y + l); g.stroke();
        }
      });
      return tex(c);
    });
  }
  function bandage() {
    return once('bandage', () => {
      const bump = U.canvas(256, 256, (g) => { g.fillStyle = '#888'; g.fillRect(0, 0, 256, 256); });
      const bg = bump.getContext('2d');
      const c = U.canvas(256, 256, (g, w, h) => {
        g.fillStyle = '#b8a888'; g.fillRect(0, 0, w, h);
        let y = -10;
        while (y < h) {
          const bh = R(16, 26), tilt = R(-10, 10);
          g.fillStyle = hsl(40, R(20, 35), R(72, 84));
          g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + tilt); g.lineTo(w, y + tilt + bh); g.lineTo(0, y + bh); g.fill();
          g.strokeStyle = 'rgba(90,70,40,0.45)'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(0, y + bh); g.lineTo(w, y + tilt + bh); g.stroke();
          bg.fillStyle = '#ddd'; bg.beginPath(); bg.moveTo(0, y + 3); bg.lineTo(w, y + tilt + 3); bg.lineTo(w, y + tilt + bh - 3); bg.lineTo(0, y + bh - 3); bg.fill();
          for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(110,90,50,${R(0.05, 0.2)})`; g.fillRect(R(0, w), y + R(0, bh), R(2, 8), 1); }
          y += bh - 2;
        }
      });
      return { map: tex(c), bump: tex(bump, true, false) };
    });
  }
  function velvet(color) {
    return once('velvet' + color, () => tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = color; g.fillRect(0, 0, w, h);
      grain(g, w, h, 1500, 0.12, true);
      // tufted buttons
      for (let y = 16; y < h; y += 32) for (let x = (y / 32 % 2 ? 32 : 16); x < w; x += 32) {
        const grd = g.createRadialGradient(x, y, 1, x, y, 12);
        grd.addColorStop(0, 'rgba(0,0,0,0.5)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill();
      }
    })));
  }
  function stitches() {
    return once('stitches', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#7fae6a'; g.fillRect(0, 0, w, h);
      grain(g, w, h, 1500, 0.1, true);
    })));
  }

  // ---------- LITTLE ROUND THINGS ----------
  function glow() {
    return once('glow', () => tex(U.canvas(128, 128, (g, w, h) => {
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }), false));
  }
  function shadow() {
    return once('shadow', () => tex(U.canvas(128, 128, (g, w, h) => {
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(0,0,0,0.6)'); grd.addColorStop(0.6, 'rgba(0,0,0,0.3)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }), false));
  }
  function puddle() {
    return once('puddle', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = 'rgba(120,200,40,0.9)';
      for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(128 + R(-60, 60), 128 + R(-60, 60), R(28, 60), 0, 7); g.fill(); }
      g.fillStyle = 'rgba(210,255,140,0.6)';
      for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(128 + R(-50, 50), 128 + R(-50, 50), R(6, 14), R(3, 6), R(0, 3), 0, 7); g.fill(); }
    }), false));
  }

  // ---------- SIGNS ----------
  function sign(text, opt = {}) {
    const key = 'sign' + text + JSON.stringify(opt);
    return once(key, () => {
      const w = opt.w || 512, h = opt.h || 128;
      const c = U.canvas(w, h, (g) => {
        if (opt.bg !== false) {
          g.fillStyle = opt.bg || '#2a1030';
          U.rrect(g, 6, 6, w - 12, h - 12, 24); g.fill();
          g.strokeStyle = opt.border || '#c8a24a'; g.lineWidth = 8;
          U.rrect(g, 10, 10, w - 20, h - 20, 20); g.stroke();
        }
        g.fillStyle = opt.color || '#ffe6a0';
        g.font = `${opt.weight || 'bold'} ${opt.size || 64}px ${opt.font || 'Fredoka, "Trebuchet MS", sans-serif'}`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 8;
        g.fillText(text, w / 2, h / 2 + 4);
      });
      return tex(c, false);
    });
  }
  function roomPlate(n) {
    return once('plate' + n, () => tex(U.canvas(128, 128, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, '#f2d27a'); grd.addColorStop(0.5, '#a8812e'); grd.addColorStop(1, '#e8c060');
      g.fillStyle = grd; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
      g.strokeStyle = '#5a3e10'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.stroke();
      g.fillStyle = '#3a2408'; g.font = 'bold 70px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n), 64, 68);
    }), false));
  }

  // ---------- ICONS (for speech bubbles, the HUD and the map) ----------
  const OUT = '#1d0f24';
  function outlined(g, fill, lw = 6) { g.fillStyle = fill; g.fill(); g.strokeStyle = OUT; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); }
  const ICONS = {
    blood(g) {
      g.beginPath(); g.moveTo(34, 30); g.lineTo(94, 30); g.lineTo(86, 114); g.lineTo(42, 114); g.closePath(); outlined(g, 'rgba(230,240,255,0.9)');
      g.beginPath(); g.moveTo(37, 54); g.lineTo(91, 54); g.lineTo(86, 110); g.lineTo(42, 110); g.closePath(); g.fillStyle = '#d4203a'; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(44, 58, 6, 44);
      g.save(); g.translate(76, 20); g.rotate(0.35); g.fillStyle = '#fff'; g.fillRect(-4, -16, 8, 60);
      g.fillStyle = '#d4203a'; for (let i = 0; i < 4; i++) g.fillRect(-4, -12 + i * 14, 8, 6); g.strokeStyle = OUT; g.lineWidth = 3; g.strokeRect(-4, -16, 8, 60); g.restore();
    },
    bone(g) {
      g.beginPath();
      g.arc(28, 44, 16, 0, 7); g.arc(40, 30, 16, 0, 7); g.arc(88, 98, 16, 0, 7); g.arc(100, 84, 16, 0, 7);
      g.fillStyle = OUT; g.save(); g.lineWidth = 12; g.strokeStyle = OUT; g.stroke(); g.restore();
      g.save(); g.translate(64, 64); g.rotate(Math.PI / 4); g.fillStyle = OUT; g.fillRect(-44, -17, 88, 34); g.fillStyle = '#f1e3c0'; g.fillRect(-42, -12, 84, 24); g.restore();
      g.fillStyle = '#f1e3c0'; g.beginPath(); g.arc(28, 44, 14, 0, 7); g.arc(40, 30, 14, 0, 7); g.fill(); g.beginPath(); g.arc(88, 98, 14, 0, 7); g.arc(100, 84, 14, 0, 7); g.fill();
      g.save(); g.translate(64, 64); g.rotate(Math.PI / 4); g.fillStyle = '#f1e3c0'; g.fillRect(-40, -12, 80, 24); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(-30, -9, 50, 5); g.restore();
    },
    soup(g) {
      g.strokeStyle = 'rgba(200,255,150,0.8)'; g.lineWidth = 5; g.lineCap = 'round';
      for (const x of [46, 64, 82]) { g.beginPath(); g.moveTo(x, 44); g.bezierCurveTo(x - 10, 34, x + 10, 24, x, 12); g.stroke(); }
      g.beginPath(); g.ellipse(64, 60, 50, 14, 0, 0, 7); g.moveTo(14, 60); g.arc(64, 60, 50, Math.PI, 0, true); outlined(g, '#6a4a8a');
      g.beginPath(); g.ellipse(64, 60, 44, 10, 0, 0, 7); g.fillStyle = '#7cc22e'; g.fill();
      g.fillStyle = '#1d0f24'; g.beginPath(); g.ellipse(54, 60, 8, 5, 0.3, 0, 7); g.fill();
      g.strokeStyle = '#1d0f24'; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(50 + i * 4, 58); g.lineTo(46 + i * 5, 50); g.stroke(); }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(78, 58, 5, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(79, 58, 2.5, 0, 7); g.fill();
    },
    jelly(g) {
      g.beginPath(); g.ellipse(64, 104, 52, 12, 0, 0, 7); outlined(g, '#e6e0f0');
      g.beginPath(); g.moveTo(24, 100); g.bezierCurveTo(20, 60, 36, 26, 64, 26); g.bezierCurveTo(92, 26, 108, 60, 104, 100);
      g.bezierCurveTo(90, 108, 38, 108, 24, 100); outlined(g, '#39e0c8');
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath(); g.ellipse(46, 54, 7, 16, 0.3, 0, 7); g.fill();
      g.fillStyle = '#1d0f24'; g.beginPath(); g.arc(56, 70, 5, 0, 7); g.arc(76, 70, 5, 0, 7); g.fill();
      g.strokeStyle = '#1d0f24'; g.lineWidth = 3; g.beginPath(); g.arc(66, 80, 7, 0.2, Math.PI - 0.2); g.stroke();
    },
    towel(g) {
      for (let i = 0; i < 3; i++) {
        const y = 86 - i * 24;
        g.beginPath(); U.rrect(g, 20 + i * 2, y, 88 - i * 4, 26, 10); outlined(g, ['#7a3cb8', '#9a5cd6', '#b784ea'][i]);
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(28 + i * 2, y + 8, 72 - i * 4, 5);
      }
    },
    bandage(g) {
      g.beginPath(); g.moveTo(64, 82); g.bezierCurveTo(90, 100, 100, 110, 118, 104); g.lineTo(118, 122); g.bezierCurveTo(96, 126, 80, 116, 58, 96); outlined(g, '#efe6cf', 5);
      g.beginPath(); g.arc(56, 60, 40, 0, 7); outlined(g, '#efe6cf');
      g.strokeStyle = '#b8a888'; g.lineWidth = 4;
      for (let r = 10; r < 38; r += 8) { g.beginPath(); g.arc(56, 60, r, 0, 7); g.stroke(); }
      g.beginPath(); g.arc(56, 60, 8, 0, 7); g.fillStyle = '#6a5a3a'; g.fill();
    },
    jar(g) {
      g.beginPath(); U.rrect(g, 28, 32, 72, 84, 16); outlined(g, 'rgba(200,230,255,0.5)');
      g.beginPath(); U.rrect(g, 34, 18, 60, 18, 5); outlined(g, '#8a8a9a');
      g.beginPath(); g.moveTo(70, 42); g.lineTo(46, 78); g.lineTo(62, 78); g.lineTo(54, 108); g.lineTo(84, 66); g.lineTo(66, 66); g.lineTo(76, 42); g.closePath();
      g.shadowColor = '#ffd23a'; g.shadowBlur = 16; outlined(g, '#ffd23a', 4); g.shadowBlur = 0;
    },
    pet(g) {
      g.beginPath(); g.ellipse(64, 80, 28, 24, 0, 0, 7); outlined(g, '#f08aa8');
      [[32, 48], [52, 30], [76, 30], [96, 48]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 11, 14, 0, 0, 7); outlined(g, '#f08aa8', 5); });
    },
    key(g) {
      g.beginPath(); g.arc(40, 50, 26, 0, 7); outlined(g, '#f2c14a');
      g.beginPath(); g.arc(40, 50, 10, 0, 7); g.fillStyle = OUT; g.fill();
      g.beginPath(); g.rect(60, 44, 56, 14); outlined(g, '#f2c14a', 5);
      g.beginPath(); g.rect(96, 56, 10, 18); g.rect(80, 56, 8, 14); outlined(g, '#f2c14a', 4);
    },
    storm(g) {
      g.beginPath(); U.rrect(g, 22, 22, 84, 90, 8); outlined(g, '#3a3a70');
      g.fillStyle = '#9ac0ff'; g.fillRect(30, 30, 30, 36); g.fillRect(68, 30, 30, 36); g.fillRect(30, 72, 30, 32); g.fillRect(68, 72, 30, 32);
      g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(10, 40 + i * 22); g.bezierCurveTo(40, 30 + i * 22, 70, 50 + i * 22, 118, 36 + i * 22); g.stroke(); }
    },
    mess(g) {
      g.beginPath(); g.ellipse(64, 92, 50, 22, 0, 0, 7); outlined(g, '#7cc22e');
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.beginPath(); g.ellipse(48, 86, 10, 5, 0, 0, 7); g.fill();
      g.strokeStyle = '#9a7a40'; g.lineWidth = 5; g.lineCap = 'round';
      for (const x of [40, 64, 88]) { g.beginPath(); g.moveTo(x, 62); g.bezierCurveTo(x - 10, 50, x + 10, 36, x, 20); g.stroke(); }
    },
    human(g) {
      g.beginPath(); g.moveTo(64, 8); g.lineTo(122, 112); g.lineTo(6, 112); g.closePath(); outlined(g, '#ff4a3a');
      g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 52, 12, 0, 7); g.fill();
      g.beginPath(); g.moveTo(44, 100); g.quadraticCurveTo(44, 68, 64, 68); g.quadraticCurveTo(84, 68, 84, 100); g.fill();
    },
    sparkle(g) {
      const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, rr = i % 2 ? r * 0.3 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); outlined(g, '#fff6a0', 4); };
      star(56, 64, 40); star(100, 28, 18); star(98, 100, 14);
    },
    clean(g) { ICONS.sparkle(g); },
    zzz(g) {
      g.fillStyle = '#c8b8ff'; g.strokeStyle = OUT; g.lineWidth = 5; g.font = 'bold 52px Fredoka, sans-serif';
      g.strokeText('Z', 20, 110); g.fillText('Z', 20, 110); g.font = 'bold 40px Fredoka, sans-serif'; g.strokeText('z', 62, 72); g.fillText('z', 62, 72); g.font = 'bold 30px Fredoka, sans-serif'; g.strokeText('z', 92, 40); g.fillText('z', 92, 40);
    },
    bell(g) {
      g.beginPath(); g.ellipse(64, 104, 52, 10, 0, 0, 7); outlined(g, '#8a6a30');
      g.beginPath(); g.moveTo(22, 100); g.bezierCurveTo(22, 40, 106, 40, 106, 100); g.closePath(); outlined(g, '#f2c14a');
      g.beginPath(); g.arc(64, 38, 8, 0, 7); outlined(g, '#f2c14a', 4);
      g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(46, 72, 6, 14, 0.4, 0, 7); g.fill();
    },
    angry(g) {
      g.beginPath(); g.arc(64, 64, 50, 0, 7); outlined(g, '#ff5a3a');
      g.fillStyle = OUT; g.beginPath(); g.arc(46, 64, 7, 0, 7); g.arc(82, 64, 7, 0, 7); g.fill();
      g.strokeStyle = OUT; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.moveTo(32, 44); g.lineTo(56, 54); g.moveTo(96, 44); g.lineTo(72, 54); g.stroke();
      g.beginPath(); g.arc(64, 100, 16, Math.PI + 0.4, -0.4); g.stroke();
    },
  };
  function iconCanvas(name) {
    return once('iconC' + name, () => U.canvas(128, 128, (g) => { (ICONS[name] || ICONS.sparkle)(g); }));
  }
  function iconURL(name) { return once('iconU' + name, () => iconCanvas(name).toDataURL()); }
  function iconTex(name) { return once('iconT' + name, () => tex(iconCanvas(name), false)); }

  // a mood face for any happiness from 0 to 100
  function moodColor(h) {
    if (h > 70) return '#5ad35a';
    if (h > 45) return '#f2d23a';
    if (h > 22) return '#ff9a2a';
    return '#ff3a3a';
  }
  function drawFace(g, cx, cy, r, h) {
    g.beginPath(); g.arc(cx, cy, r, 0, 7); outlined(g, moodColor(h), r * 0.1);
    g.fillStyle = OUT;
    const ey = cy - r * 0.18, ex = r * 0.34, er = r * 0.12;
    g.beginPath(); g.arc(cx - ex, ey, er, 0, 7); g.arc(cx + ex, ey, er, 0, 7); g.fill();
    g.strokeStyle = OUT; g.lineWidth = r * 0.11; g.lineCap = 'round';
    const m = (h - 50) / 50; // -1 .. 1
    g.beginPath();
    g.moveTo(cx - r * 0.4, cy + r * 0.38 - m * r * 0.08);
    g.quadraticCurveTo(cx, cy + r * 0.38 + m * r * 0.35, cx + r * 0.4, cy + r * 0.38 - m * r * 0.08);
    g.stroke();
    if (h < 25) { // angry eyebrows
      g.beginPath(); g.moveTo(cx - r * 0.55, ey - r * 0.32); g.lineTo(cx - r * 0.18, ey - r * 0.16);
      g.moveTo(cx + r * 0.55, ey - r * 0.32); g.lineTo(cx + r * 0.18, ey - r * 0.16); g.stroke();
    }
  }

  return {
    stone, wallpaper, woodFloor, woodPanel, darkWood, lightWood, doorWood, marble, checker, greenTile,
    carpet, roundRug, rectRug, plaster, coffered, sky, portrait, PORTRAITS, fur, bandage, velvet, stitches,
    glow, shadow, puddle, sign, roomPlate, iconCanvas, iconURL, iconTex, ICONS, drawFace, moodColor, bat, tex,
  };
})();
