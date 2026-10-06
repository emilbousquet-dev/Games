// ============================================================
//  MY LIFE — TEXTURES
//  Every picture in the game is painted with code on a canvas.
// ============================================================
window.ML = window.ML || {};

ML.Tex = (function () {
  const U = ML.U;
  const cache = {};
  const once = (key, make) => cache[key] || (cache[key] = make());
  const rnd = U.seeded(2026);
  const R = (a, b) => a + rnd() * (b - a);

  function tex(canvas, repeat = true, color = true) {
    const t = new THREE.CanvasTexture(canvas);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  }
  // sprinkle soft noise over a canvas
  function grain(g, w, h, n, a) {
    for (let i = 0; i < n; i++) {
      const s = R(1, 3);
      g.fillStyle = rnd() < 0.5 ? `rgba(255,255,255,${R(0, a)})` : `rgba(0,0,0,${R(0, a)})`;
      g.fillRect(R(0, w), R(0, h), s, s);
    }
  }
  const css = (c) => '#' + c.toString(16).padStart(6, '0');
  function shade(c, k) {
    const r = (c >> 16) & 255, gg = (c >> 8) & 255, b = c & 255;
    const f = (v) => Math.round(U.clamp(k > 0 ? v + (255 - v) * k : v * (1 + k), 0, 255));
    return (f(r) << 16) | (f(gg) << 8) | f(b);
  }

  // ---------- WALLPAPER: plain, stripes, dots, stars, hearts, bricks ----------
  function wall(color, pattern = 'plain', color2) {
    return once('wall' + color + pattern + color2, () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = css(color); g.fillRect(0, 0, w, h);
      const c2 = css(color2 !== undefined ? color2 : shade(color, 0.25));
      g.fillStyle = c2;
      if (pattern === 'stripes') { for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 28, h); }
      if (pattern === 'dots') { for (let y = 16; y < h; y += 42) for (let x = (y / 42) % 2 ? 37 : 16; x < w; x += 42) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); } }
      if (pattern === 'stars') {
        for (let i = 0; i < 9; i++) {
          const x = (i % 3) * 85 + 40, y = Math.floor(i / 3) * 85 + 40 + (i % 2) * 20;
          g.beginPath();
          for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - Math.PI / 2, r = k % 2 ? 6 : 15; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
          g.fill();
        }
      }
      if (pattern === 'bricks') {
        g.fillStyle = css(shade(color, -0.25));
        for (let y = 0; y < h; y += 32) { g.fillRect(0, y, w, 3); for (let x = (y / 32) % 2 ? 32 : 0; x < w; x += 64) g.fillRect(x, y, 3, 32); }
      }
      if (pattern === 'tiles') {
        g.fillStyle = css(shade(color, -0.12));
        for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 2);
        for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 2, h);
      }
      // a little stripe at the bottom (wainscot) is added by the room builder
      grain(g, w, h, 900, 0.035);
    })));
  }

  // ---------- FLOORS ----------
  function wood(color = 0xb07a4a) {
    return once('wood' + color, () => tex(U.canvas(256, 256, (g, w, h) => {
      for (let i = 0; i < 8; i++) {
        const y = i * 32;
        g.fillStyle = css(shade(color, R(-0.12, 0.1))); g.fillRect(0, y, w, 32);
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, w, 2);
        const off = R(0, w); g.fillRect(off, y, 2, 32);
        g.strokeStyle = 'rgba(0,0,0,0.08)';
        for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(0, y + R(4, 28)); g.bezierCurveTo(80, y + R(4, 28), 170, y + R(4, 28), w, y + R(4, 28)); g.stroke(); }
      }
      grain(g, w, h, 600, 0.05);
    })));
  }
  function checker(c1, c2, n = 4) {
    return once('chk' + c1 + c2 + n, () => tex(U.canvas(256, 256, (g, w, h) => {
      const s = w / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = css((x + y) % 2 ? c1 : c2); g.fillRect(x * s, y * s, s, s); }
      g.fillStyle = 'rgba(0,0,0,0.15)';
      for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1, 0, 2, h); g.fillRect(0, i * s - 1, w, 2); }
      grain(g, w, h, 500, 0.04);
    })));
  }
  function carpet(color) {
    return once('carpet' + color, () => tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = css(color); g.fillRect(0, 0, w, h);
      grain(g, w, h, 3000, 0.09);
    })));
  }
  function grass() {
    return once('grass', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#5fae46'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        g.strokeStyle = `hsl(${R(90, 120)},${R(40, 60)}%,${R(30, 50)}%)`;
        const x = R(0, w), y = R(0, h);
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(-2, 2), y - R(3, 7)); g.stroke();
      }
    })));
  }
  function sand() {
    return once('sand', () => tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = '#ead29a'; g.fillRect(0, 0, w, h); grain(g, w, h, 2500, 0.12);
    })));
  }
  function asphalt() {
    return once('asphalt', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#3c3e44'; g.fillRect(0, 0, w, h); grain(g, w, h, 5000, 0.12);
    })));
  }
  // a road going left-right with a dashed yellow middle line
  function road() {
    return once('road', () => tex(U.canvas(512, 256, (g, w, h) => {
      g.fillStyle = '#3c3e44'; g.fillRect(0, 0, w, h); grain(g, w, h, 6000, 0.12);
      g.fillStyle = '#f2c84a'; for (let x = 0; x < w; x += 128) g.fillRect(x + 20, h / 2 - 5, 70, 10);
      g.fillStyle = '#eee'; g.fillRect(0, 10, w, 6); g.fillRect(0, h - 16, w, 6);
    })));
  }
  function sidewalk() {
    return once('sidewalk', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#c8c4bc'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let i = 0; i <= 4; i++) { g.fillRect(i * 64 - 1, 0, 2, h); g.fillRect(0, i * 64 - 1, w, 2); }
      grain(g, w, h, 2500, 0.07);
    })));
  }

  // ---------- CITY BUILDING FRONT ----------
  function facade(color, style = 0) {
    return once('fac' + color + style, () => tex(U.canvas(256, 512, (g, w, h) => {
      g.fillStyle = css(color); g.fillRect(0, 0, w, h);
      grain(g, w, h, 1500, 0.05);
      const cols = style === 2 ? 6 : 4, rows = style === 2 ? 14 : 9;
      const cw = w / cols, rh = h / rows;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const lit = rnd() < 0.25;
          const gx = x * cw + cw * 0.18, gy = y * rh + rh * 0.18, gw = cw * 0.64, gh = rh * 0.62;
          if (style === 1) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(gx - 3, gy - 3, gw + 6, gh + 6); }
          const grd = g.createLinearGradient(gx, gy, gx + gw, gy + gh);
          if (lit) { grd.addColorStop(0, '#fff3c0'); grd.addColorStop(1, '#f2c870'); } else { grd.addColorStop(0, '#9ad0f0'); grd.addColorStop(1, '#4a7ab0'); }
          g.fillStyle = grd; g.fillRect(gx, gy, gw, gh);
          g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(gx + 2, gy + 2, gw * 0.3, 3);
        }
      }
      if (style === 2) { g.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = 0; x < w; x += cw) g.fillRect(x, 0, 3, h); }
    }), true));
  }

  // ---------- SKY (background gradient) ----------
  function sky(top = 0x5ab4f0, bottom = 0xcfeaff) {
    return once('sky' + top + bottom, () => {
      const t = tex(U.canvas(16, 256, (g, w, h) => {
        const grd = g.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, css(top)); grd.addColorStop(1, css(bottom));
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
      }), false);
      return t;
    });
  }
  // a window picture: sky + clouds (+ city if "city")
  function windowView(kind = 'sky') {
    return once('win' + kind, () => tex(U.canvas(256, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#5ab4f0'); grd.addColorStop(1, '#d8f0ff');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      for (let i = 0; i < 4; i++) { const x = R(0, w), y = R(20, 110); for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + k * 16, y + R(-5, 5), R(12, 20), 0, 7); g.fill(); } }
      if (kind === 'city' || kind === 'high') {
        const base = kind === 'high' ? h * 0.92 : h * 0.55;
        for (let x = -10; x < w; x += R(26, 48)) {
          const bh = R(60, 200) * (kind === 'high' ? 0.4 : 1), bw = R(24, 46);
          g.fillStyle = `hsl(${R(200, 230)},${R(10, 25)}%,${R(40, 62)}%)`;
          g.fillRect(x, base - bh, bw, h);
          g.fillStyle = 'rgba(255,240,180,0.6)';
          for (let y = base - bh + 6; y < h; y += 12) for (let xx = x + 4; xx < x + bw - 4; xx += 9) if (rnd() < 0.3) g.fillRect(xx, y, 4, 6);
        }
      } else {
        g.fillStyle = '#6ab84a'; g.fillRect(0, h * 0.78, w, h);
        g.fillStyle = '#3a8a3a';
        for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(R(0, w), h * 0.78, R(18, 36), Math.PI, 0); g.fill(); }
      }
    }), false));
  }

  // ---------- SIGNS & BOARDS ----------
  function sign(text, bg = 0xf2c14a, fg = 0x2a1406, w = 512, h = 128, font = 'Fredoka') {
    return once('sign' + text + bg + fg + w + h, () => tex(U.canvas(w, h, (g) => {
      g.fillStyle = css(bg); U.rrect(g, 0, 0, w, h, h * 0.18); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 6; U.rrect(g, 8, 8, w - 16, h - 16, h * 0.14); g.stroke();
      g.fillStyle = css(fg);
      let size = h * 0.62;
      g.font = `700 ${size}px ${font}, 'Trebuchet MS', sans-serif`;
      while (g.measureText(text).width > w * 0.88 && size > 10) { size -= 2; g.font = `700 ${size}px ${font}, 'Trebuchet MS', sans-serif`; }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 2);
    }), false));
  }
  function chalkboard(lines) {
    return once('chalk' + lines.join('|'), () => tex(U.canvas(512, 256, (g, w, h) => {
      g.fillStyle = '#2a4a38'; g.fillRect(0, 0, w, h);
      grain(g, w, h, 3000, 0.06);
      g.fillStyle = 'rgba(255,255,255,0.88)';
      g.font = "600 34px 'Fredoka', 'Comic Sans MS', sans-serif";
      lines.forEach((l, i) => g.fillText(l, 30, 60 + i * 52));
    }), false));
  }
  // a screen (TV / computer) showing something
  function screen(kind = 'tv') {
    return once('screen' + kind, () => tex(U.canvas(256, 160, (g, w, h) => {
      if (kind === 'tv') {
        const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#6ad0ff'); grd.addColorStop(1, '#2a70c0');
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
        g.fillStyle = '#7ad84a'; g.fillRect(0, h * 0.7, w, h);
        g.fillStyle = '#ffd84a'; g.beginPath(); g.arc(200, 40, 22, 0, 7); g.fill();
        g.fillStyle = '#ff6a4a'; g.beginPath(); g.arc(90, h * 0.62, 26, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(82, h * 0.58, 7, 0, 7); g.arc(100, h * 0.58, 7, 0, 7); g.fill();
      } else if (kind === 'game') {
        g.fillStyle = '#1a1030'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 30; i++) { g.fillStyle = `hsl(${R(0, 360)},90%,60%)`; g.fillRect(R(0, w), R(0, h), 8, 8); }
        g.fillStyle = '#ffd84a'; g.font = "700 30px Fredoka, sans-serif"; g.fillText('LEVEL 99', 50, 90);
      } else {
        g.fillStyle = '#eef4ff'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#2a6ad8'; g.fillRect(0, 0, w, 22);
        g.fillStyle = '#9ab0d0'; for (let y = 34; y < h - 10; y += 16) g.fillRect(14, y, R(80, 220), 7);
      }
    }), false));
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
      grd.addColorStop(0, 'rgba(0,0,0,0.45)'); grd.addColorStop(0.6, 'rgba(0,0,0,0.2)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }), false));
  }
  function splat(color = 0x7ac83a) {
    return once('splat' + color, () => tex(U.canvas(128, 128, (g) => {
      g.fillStyle = css(color);
      for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(64 + R(-30, 30), 64 + R(-30, 30), R(10, 26), 0, 7); g.fill(); }
      for (let i = 0; i < 10; i++) { const a = R(0, 7); g.beginPath(); g.arc(64 + Math.cos(a) * R(40, 56), 64 + Math.sin(a) * R(40, 56), R(3, 7), 0, 7); g.fill(); }
    }), false));
  }
  // a little picture frame painting
  function painting(seed) {
    return once('paint' + seed, () => tex(U.canvas(128, 128, (g, w, h) => {
      const r2 = U.seeded(seed);
      g.fillStyle = `hsl(${r2() * 360},60%,75%)`; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) { g.fillStyle = `hsl(${r2() * 360},70%,55%)`; g.beginPath(); g.arc(r2() * w, r2() * h, 10 + r2() * 30, 0, 7); g.fill(); }
    }), false));
  }


  // ---------- REALISTIC MATERIAL PICTURES (gray, so any color can be used) ----------
  // cloth: a tiny woven pattern
  function fabric(kind = 'cotton') { const t = fabricRaw(kind); t.repeat.set(3, 3); return t; }
  function fabricRaw(kind) {
    return once('fabric' + kind, () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h);
      if (kind === 'denim') {
        for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const v = 200 + ((x + y) % 6 < 3 ? 30 : -10) + R(-14, 14); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 2, 2); }
        g.strokeStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 40; i++) { g.beginPath(); const y = R(0, h); g.moveTo(0, y); g.lineTo(w, y + R(-8, 8)); g.stroke(); }
      } else if (kind === 'knit') {
        for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { g.fillStyle = `rgb(${R(205, 235)},${R(205, 235)},${R(205, 235)})`; g.beginPath(); g.ellipse(x + 4, y + 4, 3, 4.5, 0.4, 0, 7); g.fill(); }
      } else {
        for (let y = 0; y < h; y += 2) { g.fillStyle = `rgba(0,0,0,${R(0, 0.025)})`; g.fillRect(0, y, w, 1); }
        for (let x = 0; x < w; x += 2) { g.fillStyle = `rgba(0,0,0,${R(0, 0.025)})`; g.fillRect(x, 0, 1, h); }
      }
      // little wrinkles and shadows
      for (let i = 0; i < 18; i++) { const cx = R(0, w), cy = R(0, h), rr = R(40, 90); const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rr); grd.addColorStop(0, 'rgba(0,0,0,0.05)'); grd.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = grd; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); }
      grain(g, w, h, 1500, 0.05);
    })));
  }
  // hair: lots of thin strands
  function hairTex() { const t = hairRaw(); t.repeat.set(4, 1); return t; }
  function hairRaw() {
    return once('hairT', () => tex(U.canvas(128, 256, (g, w, h) => {
      g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 700; i++) {
        const x = R(0, w), v = R(120, 255);
        g.strokeStyle = `rgba(${v},${v},${v},${R(0.2, 0.6)})`; g.lineWidth = R(0.5, 1.6);
        g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + R(-6, 6), h * 0.3, x + R(-6, 6), h * 0.7, x + R(-4, 4), h); g.stroke();
      }
    })));
  }
  // skin: very soft blotches so it doesn't look like plastic
  function skinTex() {
    return once('skinT', () => tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${R(200, 255)},${R(160, 210)},${R(160, 200)},0.025)`; g.beginPath(); g.arc(R(0, w), R(0, h), R(8, 24), 0, 7); g.fill(); }
      grain(g, w, h, 900, 0.02);
    })));
  }
  // plaster wall: gentle bumps
  function plaster(color) {
    return once('plaster' + color, () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = css(color); g.fillRect(0, 0, w, h);
      for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '0,0,0' : '255,255,255'},${R(0.01, 0.035)})`; g.beginPath(); g.arc(R(0, w), R(0, h), R(8, 40), 0, 7); g.fill(); }
      grain(g, w, h, 2500, 0.04);
    })));
  }
  // a city street: dark asphalt, cracks, white lane lines, double yellow line in the middle
  function cityRoad() {
    return once('cityRoad', () => tex(U.canvas(1024, 512, (g, w, h) => {
      g.fillStyle = '#34363b'; g.fillRect(0, 0, w, h);
      grain(g, w, h, 30000, 0.14);
      for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '20,20,24' : '80,80,86'},0.25)`; g.fillRect(R(0, w), R(0, h), R(40, 160), R(20, 70)); }
      g.strokeStyle = 'rgba(15,15,18,0.6)'; g.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) { let x = R(0, w), y = R(0, h); g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += R(-30, 30); y += R(-12, 12); g.lineTo(x, y); } g.stroke(); }
      // oil stains in the middle of the lanes
      for (const y of [h * 0.27, h * 0.73]) for (let i = 0; i < 6; i++) { const cx = R(0, w); const grd = g.createRadialGradient(cx, y, 0, cx, y, 50); grd.addColorStop(0, 'rgba(10,10,12,0.25)'); grd.addColorStop(1, 'rgba(10,10,12,0)'); g.fillStyle = grd; g.fillRect(0, y - 60, w, 120); }
      g.fillStyle = '#e8b830'; g.fillRect(0, h / 2 - 9, w, 5); g.fillRect(0, h / 2 + 4, w, 5);
      g.fillStyle = 'rgba(240,240,236,0.9)'; g.fillRect(0, 14, w, 6); g.fillRect(0, h - 20, w, 6);
      grain(g, w, h, 4000, 0.1);
    })));
  }
  function concrete() {
    return once('concrete', () => tex(U.canvas(512, 512, (g, w, h) => {
      g.fillStyle = '#b8b4ac'; g.fillRect(0, 0, w, h);
      const n = 4, s = w / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = R(160, 196); g.fillStyle = `rgba(${v},${v - 3},${v - 9},0.5)`; g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4); }
      g.fillStyle = 'rgba(60,58,54,0.55)';
      for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1.5, 0, 3, h); g.fillRect(0, i * s - 1.5, w, 3); }
      for (let i = 0; i < 25; i++) { const cx = R(0, w), cy = R(0, h), rr = R(10, 40); const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rr); grd.addColorStop(0, 'rgba(40,36,30,0.14)'); grd.addColorStop(1, 'rgba(40,36,30,0)'); g.fillStyle = grd; g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2); }
      grain(g, w, h, 16000, 0.1);
    })));
  }
  // a real-looking city building: window rows with frames, reflections and blinds
  function cityFacade(seed, style) {
    return once('cfac' + seed + '_' + style, () => tex(U.canvas(512, 1024, (g, w, h) => {
      const r2 = U.seeded(seed), Rr = (a, b) => a + r2() * (b - a);
      const base = [[150, 140, 128], [176, 92, 70], [120, 128, 138], [200, 190, 170], [90, 96, 108], [160, 120, 90]][Math.floor(r2() * 6)];
      g.fillStyle = `rgb(${base.join(',')})`; g.fillRect(0, 0, w, h);
      if (style === 'brick') { g.fillStyle = 'rgba(0,0,0,0.12)'; for (let y = 0; y < h; y += 8) { g.fillRect(0, y, w, 1); for (let x = (y / 8) % 2 ? 8 : 0; x < w; x += 16) g.fillRect(x, y, 1, 8); } }
      grain(g, w, h, 8000, 0.06);
      const cols = style === 'glass' ? 8 : style === 'brick' ? 5 : 6, rows = style === 'glass' ? 20 : 12;
      const cw = w / cols, rh = h / rows;
      if (style === 'glass') {
        const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, '#6a8aa8'); grd.addColorStop(0.5, '#a8c4dc'); grd.addColorStop(1, '#4a6a88');
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
      }
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const gx = x * cw + cw * (style === 'glass' ? 0.04 : 0.2), gy = y * rh + rh * (style === 'glass' ? 0.04 : 0.18);
        const gw = cw * (style === 'glass' ? 0.92 : 0.6), gh = rh * (style === 'glass' ? 0.92 : 0.6);
        const lit = r2() < 0.15;
        const grd = g.createLinearGradient(gx, gy, gx + gw * 0.6, gy + gh);
        if (lit) { grd.addColorStop(0, '#f8e0a8'); grd.addColorStop(1, '#c89a58'); }
        else { grd.addColorStop(0, `rgba(${Rr(90, 140)},${Rr(120, 160)},${Rr(150, 190)},${style === 'glass' ? 0.5 : 1})`); grd.addColorStop(1, `rgba(30,40,56,${style === 'glass' ? 0.5 : 1})`); }
        g.fillStyle = grd; g.fillRect(gx, gy, gw, gh);
        if (style !== 'glass') {
          if (r2() < 0.3) { g.fillStyle = `rgba(230,225,210,${Rr(0.6, 0.9)})`; g.fillRect(gx, gy, gw, gh * Rr(0.2, 0.7)); } // blinds
          g.strokeStyle = 'rgba(240,236,228,0.8)'; g.lineWidth = 3; g.strokeRect(gx, gy, gw, gh);
          g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(gx - 4, gy + gh + 2, gw + 8, 5); // sill shadow
          g.fillStyle = 'rgba(230,226,216,0.9)'; g.fillRect(gx - 4, gy + gh, gw + 8, 3);
        } else { g.fillStyle = 'rgba(30,40,50,0.5)'; g.fillRect(gx - 2, gy - 2, 3, gh + 4); }
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + gw * 0.4, gy); g.lineTo(gx, gy + gh * 0.5); g.fill();
      }
    })));
  }
  // a shop window at the bottom of a building
  function storefront(name, color) {
    return once('store' + name + color, () => tex(U.canvas(512, 256, (g, w, h) => {
      g.fillStyle = '#2a2a2e'; g.fillRect(0, 0, w, h);
      g.fillStyle = css(color); g.fillRect(0, 0, w, 56);
      g.fillStyle = '#fff'; g.font = "700 38px 'Arial Black', Arial, sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, 30);
      const grd = g.createLinearGradient(0, 60, 0, h); grd.addColorStop(0, '#8aa8c0'); grd.addColorStop(1, '#2a3a4a');
      g.fillStyle = grd; g.fillRect(14, 66, w * 0.62, h - 76);
      g.fillStyle = '#3a2a1e'; g.fillRect(w * 0.68, 66, w * 0.28, h - 66);
      g.fillStyle = 'rgba(255,255,255,0.2)'; g.beginPath(); g.moveTo(14, 66); g.lineTo(140, 66); g.lineTo(14, 200); g.fill();
      g.fillStyle = '#d8b04a'; g.beginPath(); g.arc(w * 0.72, 170, 5, 0, 7); g.fill();
    }), false));
  }

  return { fabric, hairTex, skinTex, plaster, cityRoad, concrete, cityFacade, storefront, tex, wall, wood, checker, carpet, grass, sand, asphalt, road, sidewalk, facade, sky, windowView, sign, chalkboard, screen, glow, shadow, splat, painting, css, shade };
})();
