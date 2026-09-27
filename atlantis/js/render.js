// ============================================================
//  ATLANTIS DIVER — DRAWING THE SEA
//  Sky, waves, light rays, the far-away city (parallax),
//  marine snow, darkness + lights, particles and the vignette.
// ============================================================
AT.Render = (function () {
  const U = AT.U, T = AT.TILE, M = AT.PX_PER_M;

  // ---------- colors of the water at each depth (meters) ----------
  const WATER = [
    [0, '#46cfd6'], [25, '#2ea9c9'], [60, '#1c7fb3'], [110, '#155f98'], [160, '#10457e'],
    [230, '#0c3268'], [300, '#0a2552'], [380, '#08193e'], [450, '#0a1236'], [530, '#110c33'], [600, '#170b36'],
  ].map(([d, c]) => [d, U.rgb(c)]);
  function waterAt(m) {
    if (m <= 0) return WATER[0][1];
    for (let i = 1; i < WATER.length; i++) {
      if (m <= WATER[i][0]) {
        const [d0, c0] = WATER[i - 1], [d1, c1] = WATER[i];
        return U.mix(c0, c1, (m - d0) / (d1 - d0));
      }
    }
    return WATER[WATER.length - 1][1];
  }
  // how dark it is at each depth (0 = bright, 1 = pitch black)
  function darkAt(m) {
    const k = [[0, 0], [30, 0], [80, 0.25], [160, 0.56], [300, 0.74], [450, 0.84], [600, 0.9]];
    let v = 0.9;
    for (let i = 1; i < k.length; i++) if (m <= k[i][0]) { v = U.lerp(k[i - 1][1], k[i][1], (m - k[i - 1][0]) / (k[i][0] - k[i - 1][0])); break; }
    if (AT.Game && AT.Game.awake && m > 280) v *= 0.55;   // after the Trident, Atlantis lights up
    return v;
  }

  // the waves on top of the sea
  function waveY(x, t) {
    return Math.sin(x * 0.012 + t * 1.3) * 5 + Math.sin(x * 0.031 - t * 1.9) * 2.5 + Math.sin(x * 0.005 + t * 0.4) * 3;
  }

  // ---------- sprites made once ----------
  let lightSprite, coneSprite, coneGlow, raySprite, caustic, glowCache = {};
  function makeSprites() {
    lightSprite = U.canvas(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.75)');
      gr.addColorStop(0.7, 'rgba(255,255,255,0.25)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
    // the lamp's beam: a soft cone pointing right, starting at the left middle
    coneSprite = U.canvas(256, 256, (g) => {
      const img = g.createImageData(256, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
        const dx = x, dy = y - 128, r = Math.hypot(dx, dy) / 256;
        if (r > 1) continue;
        const a = Math.abs(Math.atan2(dy, dx));
        const edge = 1 - U.clamp((a - 0.28) / 0.26, 0, 1);
        const fall = Math.pow(1 - r, 1.2) * (0.55 + 0.45 * U.smooth(Math.min(1, r * 6)));
        img.data[(y * 256 + x) * 4 + 3] = 255 * U.smooth(edge) * fall;
      }
      g.putImageData(img, 0, 0);
    });
    coneGlow = U.canvas(256, 256, (g) => {
      g.drawImage(coneSprite, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = 'rgb(255,244,205)'; g.fillRect(0, 0, 256, 256);
    });
    raySprite = U.canvas(64, 512, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 512);
      gr.addColorStop(0, 'rgba(255,255,235,0.55)'); gr.addColorStop(0.4, 'rgba(210,255,245,0.22)'); gr.addColorStop(1, 'rgba(200,255,240,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 512);
      // soft sides
      g.globalCompositeOperation = 'destination-in';
      const s = g.createLinearGradient(0, 0, 64, 0);
      s.addColorStop(0, 'rgba(0,0,0,0)'); s.addColorStop(0.5, 'rgba(0,0,0,1)'); s.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = s; g.fillRect(0, 0, 64, 512);
    });
    // shimmering caustic light (the wobbly net of light you see in pools)
    const N = AT.lowGfx ? 128 : 192;
    caustic = U.canvas(N, N, (g) => {
      const img = g.createImageData(N, N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let px = (x / N) * Math.PI * 2 * 2, py = (y / N) * Math.PI * 2 * 2, c = 1;
        let ix = px, iy = py;
        const inten = 0.005;
        for (let n = 0; n < 5; n++) {
          const t = 1.3 * (1 - 3.5 / (n + 1));
          const nx = px + Math.cos(t - ix) + Math.sin(t + iy), ny = py + Math.sin(t - iy) + Math.cos(t + ix);
          ix = nx; iy = ny;
          c += 1 / Math.hypot(px / (Math.sin(ix + t) / inten), py / (Math.cos(iy + t) / inten));
        }
        c /= 5; c = 1.17 - Math.pow(c, 1.4);
        const v = U.clamp(Math.pow(Math.abs(c), 8), 0, 1);
        const i = (y * N + x) * 4;
        img.data[i] = 220; img.data[i + 1] = 255; img.data[i + 2] = 250; img.data[i + 3] = v * 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  function glow(color) {
    const key = color.join(',');
    if (!glowCache[key]) {
      glowCache[key] = U.canvas(128, 128, (g) => {
        const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, U.css(color, 0.9)); gr.addColorStop(0.25, U.css(color, 0.45)); gr.addColorStop(1, U.css(color, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      });
    }
    return glowCache[key];
  }

  // ---------- the far-away city (parallax layers) ----------
  let layers = [];
  const LW = 1400, LRES = 0.5;
  function makeLayers() {
    const H = AT.World.H;
    const defs = AT.lowGfx ? [[0.35, 0.55, 3], [0.6, 0.72, 5]] : [[0.25, 0.42, 1], [0.42, 0.58, 3], [0.6, 0.72, 5]];
    layers = defs.map(([f, dark, seed]) => {
      const h = H * f + AT.VIEW_H * 1.5;
      const c = U.canvas(LW * LRES, h * LRES);
      const g = c.getContext('2d');
      g.scale(LRES, LRES);
      const rnd = U.seeded(seed * 1000 + 7);
      const s = f * 1.5;                   // far things are smaller
      const band = 380 * f;                // a row of buildings every so often
      for (let ly = 160 * f + band * 0.5; ly < h; ly += band * (0.8 + rnd() * 0.5)) {
        const m = ly / f / M;              // the depth this row belongs to
        const col = U.mix(waterAt(m), [2, 6, 20], dark * (0.9 + (m > 300 ? 0.1 : 0)));
        const zone = m < 60 ? 0 : m < 160 ? 1 : m < 300 ? 2 : m < 450 ? 3 : 4;
        g.fillStyle = U.css(col, 1);
        // the ground of this row, a wavy hill that fades out below
        const ground = (x) => ly + Math.sin(x * 0.006 + seed) * 14 * s + Math.sin(x * 0.017 + ly) * 6 * s;
        g.beginPath(); g.moveTo(0, ly + 200 * s);
        for (let x = 0; x <= LW; x += 20) g.lineTo(x, ground(x * (LW / LW)));
        g.lineTo(LW, ly + 200 * s); g.closePath();
        const gr = g.createLinearGradient(0, ly - 20 * s, 0, ly + 200 * s);
        gr.addColorStop(0, U.css(col, 1)); gr.addColorStop(1, U.css(col, 0));
        g.fillStyle = gr; g.fill();
        g.fillStyle = U.css(col, 1);
        let x = rnd() * 120;
        while (x < LW) {
          const w = silhouette(g, x, ground(x) + 4 * s, s, zone, rnd, col);
          x += w + (30 + rnd() * 140) * s;
        }
      }
      return { c, f, h };
    });
  }
  // one building/statue/crystal far away. Returns how wide it was.
  function silhouette(g, x, y, s, zone, rnd, col) {
    const shapes = [['rock', 'kelp', 'column', 'rock'], ['temple', 'column', 'statue', 'arch'], ['dome', 'tower', 'arch', 'tower'],
      ['pillars', 'statue', 'temple', 'tower'], ['spire', 'spire', 'spire', 'dome']][zone];
    const kind = shapes[Math.floor(rnd() * shapes.length)];
    const windows = (x0, y0, w, h) => {
      if (zone < 2) return;
      g.save(); g.fillStyle = zone === 4 ? 'rgba(170,120,255,0.4)' : rnd() > 0.5 ? 'rgba(120,230,255,0.3)' : 'rgba(255,200,110,0.3)';
      for (let yy = y0 + 10 * s; yy < y0 + h - 10 * s; yy += 22 * s) for (let xx = x0 + 6 * s; xx < x0 + w - 8 * s; xx += 13 * s) {
        if (rnd() > 0.72) g.fillRect(xx, yy, 4 * s, 6 * s);
      }
      g.restore();
    };
    const W = (n) => n * s;
    switch (kind) {
      case 'rock': {
        const w = W(60 + rnd() * 90), h = W(30 + rnd() * 60);
        g.beginPath(); g.moveTo(x, y);
        for (let i = 0; i <= 8; i++) g.lineTo(x + (w * i) / 8, y - h * Math.sin((i / 8) * Math.PI) * (0.7 + rnd() * 0.4));
        g.fill(); return w;
      }
      case 'kelp': {
        g.save(); g.strokeStyle = g.fillStyle; g.lineWidth = W(4); g.lineCap = 'round';
        for (let i = 0; i < 4; i++) {
          const kx = x + i * W(9), kh = W(80 + rnd() * 120);
          g.beginPath(); g.moveTo(kx, y); g.bezierCurveTo(kx + W(18), y - kh * 0.3, kx - W(18), y - kh * 0.7, kx + W(6), y - kh); g.stroke();
        }
        g.restore(); return W(40);
      }
      case 'column': {
        const h = W(90 + rnd() * 110), broken = rnd() > 0.5;
        g.fillRect(x, y - h, W(16), h); if (!broken) g.fillRect(x - W(4), y - h - W(6), W(24), W(6));
        else { g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + W(8), y - h - W(10)); g.lineTo(x + W(16), y - h + W(4)); g.fill(); }
        return W(24);
      }
      case 'statue': {
        const h = W(120 + rnd() * 60);
        g.fillRect(x, y - W(20), W(44), W(20));
        g.beginPath(); g.moveTo(x + W(8), y - W(20)); g.lineTo(x + W(14), y - h * 0.8); g.lineTo(x + W(30), y - h * 0.8); g.lineTo(x + W(36), y - W(20)); g.fill();
        g.beginPath(); g.arc(x + W(22), y - h * 0.8 - W(10), W(9), 0, Math.PI * 2); g.fill();
        g.fillRect(x + W(36), y - h * 1.05, W(4), h * 0.9);
        g.fillRect(x + W(30), y - h * 1.05, W(16), W(3));
        for (const dx of [30, 37, 44]) g.fillRect(x + W(dx), y - h * 1.12, W(2.5), W(12));
        return W(50);
      }
      case 'arch': {
        const w = W(80 + rnd() * 50), h = W(90 + rnd() * 60);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - h); g.lineTo(x + w, y - h); g.lineTo(x + w, y);
        g.lineTo(x + w - W(16), y); g.lineTo(x + w - W(16), y - h + w / 2); g.arc(x + w / 2, y - h + w / 2, w / 2 - W(16), 0, Math.PI, true);
        g.lineTo(x + W(16), y); g.closePath(); g.fill();
        return w;
      }
      case 'temple': case 'pillars': {
        const n = 4 + Math.floor(rnd() * 3), gap = W(kind === 'pillars' ? 30 : 22), h = W(kind === 'pillars' ? 200 + rnd() * 80 : 80 + rnd() * 40);
        const w = n * gap;
        g.fillRect(x - W(6), y - W(10), w + W(12), W(10));
        for (let i = 0; i < n; i++) g.fillRect(x + i * gap + W(3), y - h, W(10), h);
        g.fillRect(x - W(4), y - h - W(10), w + W(8), W(10));
        if (kind === 'temple' || rnd() > 0.5) { g.beginPath(); g.moveTo(x - W(8), y - h - W(10)); g.lineTo(x + w / 2, y - h - W(40)); g.lineTo(x + w + W(8), y - h - W(10)); g.fill(); }
        return w;
      }
      case 'dome': {
        const w = W(70 + rnd() * 60), h = W(60 + rnd() * 60);
        g.fillRect(x, y - h, w, h);
        g.beginPath(); g.arc(x + w / 2, y - h, w / 2, Math.PI, 0); g.fill();
        g.fillRect(x + w / 2 - W(2), y - h - w / 2 - W(24), W(4), W(24));
        windows(x, y - h, w, h);
        return w;
      }
      case 'tower': {
        const w = W(30 + rnd() * 26), h = W(160 + rnd() * 160);
        g.fillRect(x, y - h, w, h);
        g.beginPath(); g.moveTo(x - W(4), y - h); g.lineTo(x + w / 2, y - h - W(50)); g.lineTo(x + w + W(4), y - h); g.fill();
        windows(x, y - h, w, h);
        return w;
      }
      case 'spire': {
        const n = 2 + Math.floor(rnd() * 3); let w = 0;
        for (let i = 0; i < n; i++) {
          const sw = W(14 + rnd() * 20), sh = W(100 + rnd() * 240), sx = x + w;
          g.beginPath(); g.moveTo(sx, y); g.lineTo(sx + sw * 0.3, y - sh); g.lineTo(sx + sw * 0.5, y - sh - W(20)); g.lineTo(sx + sw, y); g.fill();
          g.save(); g.fillStyle = 'rgba(160,110,255,0.35)';
          g.beginPath(); g.moveTo(sx + sw * 0.35, y - sh * 0.2); g.lineTo(sx + sw * 0.45, y - sh); g.lineTo(sx + sw * 0.55, y - sh * 0.2); g.fill();
          g.restore();
          w += sw * 0.8;
        }
        return w;
      }
    }
    return W(40);
  }

  // ---------- marine snow ----------
  const snow = [];
  for (let i = 0; i < 160; i++) snow.push({ x: Math.random(), y: Math.random(), z: Math.random(), s: Math.random() });

  // ---------- particles ----------
  const parts = [];
  function spawn(p) {
    if (parts.length > 700) parts.shift();
    parts.push(Object.assign({ vx: 0, vy: 0, life: 1, t: 0, size: 3, color: [255, 255, 255] }, p));
  }
  function bubbles(x, y, n, spread = 6) {
    for (let i = 0; i < n; i++) spawn({ type: 'bubble', x: x + U.rand(-spread, spread), y: y + U.rand(-spread, spread), vx: U.rand(-15, 15), vy: U.rand(-60, -20), size: U.rand(1.5, 4.5), life: U.rand(3, 6), ph: Math.random() * 6 });
  }
  function sparks(x, y, n, color, speed = 120) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = U.rand(0.3, 1) * speed;
      spawn({ type: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: U.rand(2, 4.5), life: U.rand(0.5, 1.1), color });
    }
  }
  function dust(x, y, n, color = [150, 130, 100]) {
    for (let i = 0; i < n; i++) spawn({ type: 'dust', x: x + U.rand(-10, 10), y: y + U.rand(-10, 10), vx: U.rand(-60, 60), vy: U.rand(-60, 20), size: U.rand(5, 12), life: U.rand(0.8, 1.6), color });
  }
  function shards(x, y, n, color) {
    for (let i = 0; i < n; i++) spawn({ type: 'shard', x: x + U.rand(-20, 20), y: y + U.rand(-20, 20), vx: U.rand(-140, 140), vy: U.rand(-160, 40), size: U.rand(4, 9), life: U.rand(1, 2), rot: Math.random() * 6, vr: U.rand(-8, 8), color });
  }
  function ring(x, y, color, maxR = 60, life = 0.6) { spawn({ type: 'ring', x, y, color, maxR, life }); }
  function text(x, y, str, color = '#ffe08a', size = 22) { spawn({ type: 'text', x, y, vy: -40, str, css: color, size, life: 1.4 }); }

  function updateParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      if (p.type === 'bubble') {
        p.vy = Math.max(p.vy - 40 * dt, -110);
        p.x += (p.vx + Math.sin(p.t * 5 + p.ph) * 18) * dt; p.y += p.vy * dt;
        p.vx *= 0.97;
        if (p.y < 2 || AT.World.solidAt(p.x, p.y - p.size)) { parts.splice(i, 1); if (p.y < 4) spawn({ type: 'ring', x: p.x, y: 2, color: [255, 255, 255], maxR: 8, life: 0.3 }); }
      } else if (p.type === 'shard') {
        p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.vx *= 0.98;
        if (AT.World.solidAt(p.x, p.y)) { p.vy *= -0.3; p.vx *= 0.5; p.y -= 2; }
      } else {
        const drag = p.type === 'dust' ? 0.93 : 0.95;
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= drag; p.vy *= drag;
      }
    }
  }

  function drawParticles(g) {
    for (const p of parts) {
      const k = p.t / p.life;
      if (p.type === 'bubble') {
        const a = Math.min(1, (1 - k) * 3) * 0.75;
        g.strokeStyle = `rgba(220,250,255,${a})`; g.lineWidth = 1.1;
        g.beginPath(); g.arc(p.x, p.y, p.size, 0, Math.PI * 2); g.stroke();
        g.fillStyle = `rgba(255,255,255,${a * 0.9})`;
        g.beginPath(); g.arc(p.x - p.size * 0.35, p.y - p.size * 0.35, p.size * 0.3, 0, Math.PI * 2); g.fill();
      } else if (p.type === 'spark') {
        const s = p.size * (1 - k);
        g.fillStyle = U.css(p.color, 1 - k);
        g.save(); g.translate(p.x, p.y); g.rotate(p.t * 4);
        g.beginPath(); g.moveTo(0, -s * 2); g.lineTo(s * 0.5, -s * 0.5); g.lineTo(s * 2, 0); g.lineTo(s * 0.5, s * 0.5); g.lineTo(0, s * 2); g.lineTo(-s * 0.5, s * 0.5); g.lineTo(-s * 2, 0); g.lineTo(-s * 0.5, -s * 0.5); g.fill();
        g.restore();
      } else if (p.type === 'dust') {
        g.fillStyle = U.css(p.color, 0.35 * (1 - k));
        g.beginPath(); g.arc(p.x, p.y, p.size * (0.6 + k), 0, Math.PI * 2); g.fill();
      } else if (p.type === 'shard') {
        g.fillStyle = U.css(p.color, Math.min(1, (1 - k) * 2));
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.beginPath(); g.moveTo(-p.size, -p.size * 0.4); g.lineTo(p.size * 0.6, -p.size * 0.6); g.lineTo(p.size * 0.8, p.size * 0.5); g.lineTo(-p.size * 0.4, p.size * 0.6); g.fill();
        g.restore();
      } else if (p.type === 'ring') {
        g.strokeStyle = U.css(p.color, (1 - k) * 0.8); g.lineWidth = 2.5 * (1 - k) + 0.5;
        g.beginPath(); g.arc(p.x, p.y, p.maxR * U.smooth(k), 0, Math.PI * 2); g.stroke();
      } else if (p.type === 'text') {
        g.globalAlpha = Math.min(1, (1 - k) * 2.5);
        g.font = `800 ${p.size}px Nunito, 'Trebuchet MS', sans-serif`; g.textAlign = 'center';
        g.lineWidth = 4; g.strokeStyle = 'rgba(0,20,40,0.8)'; g.strokeText(p.str, p.x, p.y);
        g.fillStyle = p.css; g.fillText(p.str, p.x, p.y);
        g.globalAlpha = 1;
      }
    }
  }

  // ---------- drawing a frame ----------
  let dark = null, vignette = null;

  function resize(w, h) {
    const r = AT.lowGfx ? 0.33 : 0.5;
    dark = U.canvas(w * r, h * r);
    dark.res = r;
    vignette = U.canvas(w, h, (g) => {
      const gr = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.58);
      gr.addColorStop(0, 'rgba(0,8,20,0)'); gr.addColorStop(1, 'rgba(0,8,20,0.55)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
  }

  // background: water color, sky, sun, clouds
  function background(g, cam, t, W, H, scale) {
    const top = cam.y / M, bot = (cam.y + cam.h) / M, mid = (top + bot) / 2;
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, U.css(waterAt(Math.max(0, top)))); gr.addColorStop(0.5, U.css(waterAt(Math.max(0, mid)))); gr.addColorStop(1, U.css(waterAt(Math.max(0, bot))));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // the glow of the Heart Crystal far below
    const heart = (cam.y + cam.h - 5200) / 1800;
    if (heart > 0) {
      const hy = (AT.World.H - 200 - cam.y) * scale;
      const r = g.createRadialGradient(W / 2, hy, 0, W / 2, hy, H * 1.3);
      const a = Math.min(1, heart) * (AT.Game && AT.Game.awake ? 0.6 : 0.35);
      r.addColorStop(0, `rgba(140,90,255,${a})`); r.addColorStop(0.4, `rgba(60,160,255,${a * 0.4})`); r.addColorStop(1, 'rgba(60,40,160,0)');
      g.fillStyle = r; g.fillRect(0, 0, W, H);
    }
  }

  function sky(g, cam, t, W, H, scale) {
    if (cam.y >= 0) return;
    const sy = (0 - cam.y) * scale;          // where the surface is on the screen
    const gr = g.createLinearGradient(0, 0, 0, sy);
    gr.addColorStop(0, '#223a7c'); gr.addColorStop(0.45, '#7d5ca8'); gr.addColorStop(0.8, '#f08c6c'); gr.addColorStop(1, '#ffd48a');
    g.save();
    // clip to above the waves
    g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0);
    for (let x = W; x >= -20; x -= 20) g.lineTo(x, (waveY(cam.x + x / scale, t) - cam.y) * scale);
    g.closePath(); g.clip();
    g.fillStyle = gr; g.fillRect(0, 0, W, sy + 20);
    // the sun, setting
    const sunX = (1650 - cam.x * 0.15) * scale, sunY = sy - 70 * scale;
    let s = g.createRadialGradient(sunX, sunY, 0, sunX, sunY, 260 * scale);
    s.addColorStop(0, 'rgba(255,245,200,0.95)'); s.addColorStop(0.12, 'rgba(255,220,140,0.9)'); s.addColorStop(0.35, 'rgba(255,170,110,0.35)'); s.addColorStop(1, 'rgba(255,140,100,0)');
    g.fillStyle = s; g.fillRect(0, 0, W, sy + 20);
    g.fillStyle = '#fff4d0'; g.beginPath(); g.arc(sunX, sunY, 34 * scale, 0, Math.PI * 2); g.fill();
    // a far island with palm trees
    const ix = (400 - cam.x * 0.3) * scale, iy = sy;
    g.fillStyle = '#4a3a6e';
    g.beginPath(); g.moveTo(ix - 160 * scale, iy); g.quadraticCurveTo(ix, iy - 60 * scale, ix + 170 * scale, iy); g.fill();
    g.strokeStyle = '#4a3a6e'; g.lineWidth = 4 * scale; g.lineCap = 'round';
    for (const [px, h, lean] of [[-30, 90, 0.3], [20, 70, -0.25], [60, 55, 0.4]]) {
      const bx = ix + px * scale, by = iy - 38 * scale, tx = bx + lean * h * scale, ty = by - h * scale;
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx, by - h * 0.6 * scale, tx, ty); g.stroke();
      g.save(); g.lineWidth = 3 * scale;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.sin(t + k) * 0.05;
        g.beginPath(); g.moveTo(tx, ty); g.quadraticCurveTo(tx + Math.cos(a) * 26 * scale, ty + Math.sin(a) * 10 * scale - 12 * scale, tx + Math.cos(a) * 40 * scale, ty + Math.abs(Math.sin(a)) * 18 * scale); g.stroke();
      }
      g.restore();
    }
    // clouds drifting
    g.fillStyle = 'rgba(255,215,200,0.55)';
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 520 + t * 8 - cam.x * 0.2) % 3000 + 3000) % 3000 - 400;
      const cy = sy - (160 + (i % 3) * 70) * scale;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(cx * scale + k * 34 * scale, cy + Math.sin(k * 2 + i) * 8 * scale, 46 * scale, 16 * scale, 0, 0, Math.PI * 2); g.fill(); }
    }
    // sun sparkles on the sea
    g.restore();
    g.fillStyle = 'rgba(255,240,190,0.9)';
    for (let i = 0; i < 26; i++) {
      const px = sunX + Math.sin(i * 12.9) * 220 * scale * (i / 26);
      const tw = Math.sin(t * 5 + i * 3.3);
      if (tw > 0.4) g.fillRect(px - 5 * scale, (waveY(cam.x + px / scale, t) - cam.y) * scale + 2 * scale, 10 * scale * tw, 1.6 * scale);
    }
  }

  // world-space drawing, called after g.setTransform(world)
  function rays(g, cam, t) {
    const depthK = 1 - U.clamp((cam.y + cam.h * 0.5) / 1500, 0, 1);
    if (depthK <= 0) return;
    const f = 0.85, off = cam.x * (1 - f);
    const start = Math.floor((cam.x - off - 300) / 150), end = Math.ceil((cam.x + cam.w - off + 400) / 150);
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = start; i <= end; i++) {
      const h = U.hash(i, 3);
      const x = i * 150 + h * 90 + off;
      const a = (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * (0.3 + h * 0.4) + i * 1.7))) * depthK * (0.45 + h * 0.4);
      const w = 30 + h * 60, L = 800 + h * 700;
      g.globalAlpha = a * 0.55;
      g.save();
      g.translate(x, 0);
      g.transform(1, 0, -0.3, 1, 0, 0);   // lean the rays: the sun is on the right
      g.drawImage(raySprite, -w / 2, 0, w, L);
      g.restore();
    }
    g.restore();
  }

  function parallax(g, cam, t, scale) {
    const top = cam.y / M, bot = (cam.y + cam.h) / M;
    const haze = (a) => {
      const gr = g.createLinearGradient(0, 0, 0, cam.h * scale);
      gr.addColorStop(0, U.css(waterAt(Math.max(0, top)), a)); gr.addColorStop(1, U.css(waterAt(Math.max(0, bot)), a));
      g.fillStyle = gr; g.fillRect(0, 0, cam.w * scale + 2, cam.h * scale + 2);
    };
    // near the sunny surface the city is hidden in the bright haze
    const shallow = 1 - U.clamp((cam.y + cam.h * 0.5) / 1400, 0, 1);
    for (const L of layers) {
      const lx = cam.x * L.f, ly = cam.y * L.f;
      const y0 = Math.max(0, ly), y1 = Math.min(L.h, ly + cam.h);
      if (y1 <= y0) continue;
      const wob = Math.sin(t * 0.6 + L.f * 10) * 2;
      const x0 = -(((lx % LW) + LW) % LW);
      for (let x = x0; x < cam.w; x += LW) {
        g.drawImage(L.c, 0, y0 * LRES, L.c.width, (y1 - y0) * LRES,
          x * scale, (y0 - ly + wob) * scale, LW * scale + 1, (y1 - y0) * scale);
      }
      haze(0.22 + shallow * 0.35);
    }
  }

  function marineSnow(g, cam, t, W, H, scale) {
    const deep = U.clamp(cam.y / 1200, 0, 1);
    for (const p of snow) {
      const f = 0.4 + p.z * 0.9;
      const x = (((p.x * 1600 - cam.x * f + Math.sin(t * 0.3 + p.s * 9) * 20) % 1600) + 1600) % 1600;
      const y = (((p.y * 900 - cam.y * f + t * (6 + p.z * 10)) % 900) + 900) % 900;
      if (x > cam.w + 20 || y > cam.h + 20) continue;
      const a = (0.12 + p.z * 0.3) * (0.4 + deep * 0.6);
      g.fillStyle = `rgba(220,240,255,${a})`;
      const s = (0.8 + p.z * 1.8) * scale;
      g.fillRect(x * scale, y * scale, s, s);
    }
  }

  // tiny glowing plankton in the deep zones
  const plankton = [];
  for (let i = 0; i < 90; i++) plankton.push({ x: Math.random(), y: Math.random(), z: Math.random(), ph: Math.random() * 6, c: Math.random() > 0.35 ? [120, 255, 240] : [200, 150, 255] });
  function glowPlankton(g, cam, t, W, H, scale) {
    const k = U.clamp((cam.y + cam.h / 2 - 2600) / 1200, 0, 1);
    if (k <= 0) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of plankton) {
      const f = 0.5 + p.z * 0.7;
      const x = (((p.x * 1500 - cam.x * f + Math.sin(t * 0.4 + p.ph) * 30) % 1500) + 1500) % 1500;
      const y = (((p.y * 900 - cam.y * f - t * (4 + p.z * 6)) % 900) + 900) % 900;
      if (x > cam.w + 10 || y > cam.h + 10) continue;
      const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + p.z * 2) + p.ph);
      g.fillStyle = U.css(p.c, k * (0.25 + tw * 0.6));
      const s = (1.2 + p.z * 1.8) * scale;
      g.beginPath(); g.arc(x * scale, y * scale, s, 0, Math.PI * 2); g.fill();
      g.fillStyle = U.css(p.c, k * tw * 0.12);
      g.beginPath(); g.arc(x * scale, y * scale, s * 4, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  // the underside of the waves, seen from under water
  function surface(g, cam, t) {
    if (cam.y > 200) return;
    const x0 = cam.x - 20, x1 = cam.x + cam.w + 20;
    g.save();
    // bright band just under the surface
    const gr = g.createLinearGradient(0, 0, 0, 90);
    gr.addColorStop(0, 'rgba(200,255,250,0.5)'); gr.addColorStop(1, 'rgba(200,255,250,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x0, 90);
    for (let x = x0; x <= x1; x += 16) g.lineTo(x, waveY(x, t));
    g.lineTo(x1, 90); g.closePath(); g.fill();
    // the shiny wave line
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.5;
    g.beginPath();
    for (let x = x0; x <= x1; x += 12) g.lineTo(x, waveY(x, t));
    g.stroke();
    g.strokeStyle = 'rgba(160,240,255,0.5)'; g.lineWidth = 6;
    g.beginPath();
    for (let x = x0; x <= x1; x += 12) g.lineTo(x, waveY(x, t) + 5);
    g.stroke();
    g.restore();
  }

  let causticPat = null;
  function caustics(g, cam, t, W, H, scale) {
    const k = 1 - U.clamp((cam.y + cam.h / 2) / 1100, 0, 1);
    if (k <= 0 || AT.lowGfx) return;
    if (!causticPat) causticPat = g.createPattern(caustic, 'repeat');
    g.save();
    g.globalCompositeOperation = 'lighter';
    const N = caustic.width, sz = 340 * scale;
    for (let layer = 0; layer < 2; layer++) {
      const ox = -cam.x * scale * 0.9 + t * (layer ? 14 : -11) * scale;
      const oy = -cam.y * scale * 0.9 + t * (layer ? -7 : 9) * scale;
      causticPat.setTransform(new DOMMatrix().translate(ox + layer * 97, oy + layer * 53).scale((sz / N) * (layer ? 1.3 : 1)));
      g.fillStyle = causticPat;
      g.globalAlpha = k * (layer ? 0.1 : 0.13);
      g.fillRect(0, 0, W, H);
    }
    g.restore();
  }

  // darkness with holes for every light, then colored glows on top
  function lighting(g, cam, lights, W, H, scale) {
    const top = cam.y / M, bot = (cam.y + cam.h) / M;
    const dTop = darkAt(Math.max(0, top)), dBot = darkAt(Math.max(0, bot));
    if (dTop < 0.01 && dBot < 0.01) return;
    const d = dark.getContext('2d'), r = dark.res;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, dark.width, dark.height);
    const gr = d.createLinearGradient(0, 0, 0, dark.height);
    const c = [1, 6, 22];
    gr.addColorStop(0, U.css(c, dTop)); gr.addColorStop(1, U.css(c, dBot));
    d.fillStyle = gr; d.fillRect(0, 0, dark.width, dark.height);
    d.globalCompositeOperation = 'destination-out';
    d.setTransform(scale * r, 0, 0, scale * r, -cam.x * scale * r, -cam.y * scale * r);
    for (const L of lights) {
      if (L.x + L.r < cam.x || L.x - L.r > cam.x + cam.w || L.y + L.r < cam.y || L.y - L.r > cam.y + cam.h) continue;
      d.globalAlpha = U.clamp(L.i, 0, 1);
      if (L.cone) {
        d.save(); d.translate(L.x, L.y); d.rotate(L.angle);
        d.drawImage(coneSprite, 0, -L.r, L.r * 2, L.r * 2);
        d.restore();
      } else {
        d.drawImage(lightSprite, L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
      }
    }
    d.globalAlpha = 1;
    g.drawImage(dark, 0, 0, W, H);
    // colored glow (makes lights look bright and magical in the dark)
    const dk = (dTop + dBot) / 2;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.setTransform(scale, 0, 0, scale, -cam.x * scale, -cam.y * scale);
    for (const L of lights) {
      if (L.cone) {
        g.globalAlpha = 0.07 + dk * 0.12;
        g.save(); g.translate(L.x, L.y); g.rotate(L.angle);
        g.drawImage(coneGlow, 0, -L.r * 0.8, L.r * 1.6, L.r * 1.6);
        g.restore();
        continue;
      }
      if (!L.color) continue;
      if (L.x + L.r < cam.x || L.x - L.r > cam.x + cam.w || L.y + L.r < cam.y || L.y - L.r > cam.y + cam.h) continue;
      g.globalAlpha = U.clamp(L.i * (0.25 + dk * 0.55) * (L.glow || 1), 0, 1);
      const gr2 = L.r * 0.8;
      g.drawImage(glow(L.color), L.x - gr2, L.y - gr2, gr2 * 2, gr2 * 2);
    }
    g.restore();
  }

  return {
    init() { makeSprites(); makeLayers(); },
    resize, background, sky, rays, parallax, marineSnow, surface, caustics, lighting, glowPlankton,
    waterAt, darkAt, waveY, glow,
    spawn, bubbles, sparks, dust, shards, ring, text, updateParticles, drawParticles,
    get vignette() { return vignette; },
  };
})();
