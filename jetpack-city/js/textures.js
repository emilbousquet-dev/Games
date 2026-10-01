// ============================================================
//  JETPACK CITY — TEXTURES
//  Every picture in the game is painted with code on a canvas:
//  the road, the windows, the neon signs, the sky...
// ============================================================
window.JC = window.JC || {};

JC.Tex = (function () {
  const U = JC.U;
  const cache = {};
  const once = (key, make) => cache[key] || (cache[key] = make());

  function tex(canvas, repeat) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = JC.maxAniso || 1;
    return t;
  }

  // soft round light, used for glows and sparkles
  const glow = () => once('glow', () => tex(U.canvas(64, 64, (g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,0.7)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  })));

  // the 3 steps of cartoon shading (dark, middle, light), like in cartoon games
  const toonRamp = () => once('toonRamp', () => {
    const d = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
    const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  });

  // a planet's sky: a gradient from the top to the horizon (and stars on some planets)
  function sky(w) {
    return once('sky' + w.id, () => tex(U.canvas(64, 512, (g, cw, h) => {
      const l = g.createLinearGradient(0, 0, 0, h);
      w.sky.forEach((c, i) => l.addColorStop(i / (w.sky.length - 1), c));
      g.fillStyle = l; g.fillRect(0, 0, cw, h);
      if (w.stars) {
        for (let i = 0; i < 90; i++) {
          g.fillStyle = `rgba(255,255,255,${U.rand(0.3, 1)})`;
          g.fillRect(Math.random() * cw, Math.random() * h * 0.55, 1, 1);
        }
      }
    })));
  }

  // far away shapes on the horizon: mesas, city towers, islands, mountains or volcanoes
  function skyline(style, color, light) {
    return once('skyline' + style + color, () => tex(U.canvas(1024, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const shade = (layer) => { g.globalAlpha = layer ? 0.75 : 1; };
      for (let layer = 1; layer >= 0; layer--) {
        shade(layer);
        g.fillStyle = color;
        let x = -30;
        while (x < w + 30) {
          if (style === 'city') {
            const bw = U.rand(22, 60), bh = U.rand(60, 220) * (layer ? 0.7 : 1);
            U.rrect(g, x, h - bh, bw, bh + 20, 8); g.fill();
            if (Math.random() < 0.4) g.fillRect(x + bw / 2 - 2, h - bh - 28, 4, 28);
            g.fillStyle = light; g.globalAlpha = 0.7;
            for (let i = 0; i < bh / 7; i++) if (Math.random() < 0.5) g.fillRect(x + U.rand(3, bw - 5), h - U.rand(5, bh - 5), 2, 2);
            shade(layer); g.fillStyle = color;
            x += bw + U.rand(-4, 8);
          } else if (style === 'mesas') {
            const bw = U.rand(60, 160), bh = U.rand(50, 150) * (layer ? 0.7 : 1);
            g.beginPath(); g.moveTo(x, h); g.lineTo(x + 18, h - bh); g.lineTo(x + bw - 18, h - bh); g.lineTo(x + bw, h); g.fill();
            x += bw + U.rand(10, 80);
          } else if (style === 'islands') {
            const bw = U.rand(90, 220), bh = U.rand(20, 70) * (layer ? 0.7 : 1);
            g.beginPath(); g.ellipse(x + bw / 2, h, bw / 2, bh, 0, Math.PI, 0); g.fill();
            x += bw + U.rand(40, 160);
          } else { // mountains or volcanoes: pointy
            const bw = U.rand(90, 200), bh = U.rand(70, 200) * (layer ? 0.7 : 1);
            g.beginPath(); g.moveTo(x, h);
            if (style === 'volcanoes') { g.lineTo(x + bw * 0.42, h - bh); g.lineTo(x + bw * 0.58, h - bh); } else g.lineTo(x + bw / 2, h - bh);
            g.lineTo(x + bw, h); g.fill();
            if (style === 'volcanoes') { g.fillStyle = light; g.fillRect(x + bw * 0.42, h - bh, bw * 0.16, 6); g.fillStyle = color; }
            if (style === 'mountains') { g.fillStyle = light; g.beginPath(); g.moveTo(x + bw / 2, h - bh); g.lineTo(x + bw / 2 - bh * 0.18, h - bh * 0.7); g.lineTo(x + bw / 2 + bh * 0.18, h - bh * 0.7); g.fill(); g.fillStyle = color; }
            x += bw * 0.7 + U.rand(0, 60);
          }
        }
      }
      g.globalAlpha = 1;
    })));
  }

  // the road of each planet. 3 lanes of 2.4 m, plus 0.6 m of edge on each side
  function road(style) {
    return once('road' + style, () => tex(U.canvas(256, 512, (g, w, h) => {
      const px = w / 8.4; // pixels per meter
      const speck = (n, colors, size = 3) => { for (let i = 0; i < n; i++) { g.fillStyle = U.pick(colors); g.fillRect(Math.random() * w, Math.random() * h, size * U.rand(0.5, 1.5), size * U.rand(0.5, 1.2)); } };
      const lanes = (color, glow, dash = true) => {
        g.fillStyle = color; g.shadowColor = color; g.shadowBlur = glow;
        for (const lx of [0.6 + 2.4, 0.6 + 4.8]) {
          if (dash) for (let y = 0; y < h; y += 128) g.fillRect(lx * px - 3, y + 20, 6, 80);
          else g.fillRect(lx * px - 2, 0, 4, h);
        }
        g.shadowBlur = 0;
      };
      if (style === 'dirt') {            // Veldin: a sandy track
        g.fillStyle = '#d99a52'; g.fillRect(0, 0, w, h);
        speck(900, ['#c4843e', '#e8b070', '#b87838', '#f0c088']);
        g.fillStyle = 'rgba(120,60,20,0.25)';
        for (const lx of [1.8, 4.2, 6.6]) { g.fillRect(lx * px - 14, 0, 6, h); g.fillRect(lx * px + 8, 0, 6, h); }
        g.fillStyle = '#8a5a30'; g.fillRect(0, 0, 0.5 * px, h); g.fillRect(w - 0.5 * px, 0, 0.5 * px, h);
        lanes('rgba(255,240,210,0.8)', 0);
      } else if (style === 'metal') {    // Metropolis: a shiny skyway
        g.fillStyle = '#3a4260'; g.fillRect(0, 0, w, h);
        speck(600, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.1)'], 5);
        g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3;
        for (let y = 0; y < h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.fillStyle = '#ffcc2a'; g.shadowColor = '#ffcc2a'; g.shadowBlur = 10;
        g.fillRect(0.45 * px, 0, 5, h); g.fillRect(w - 0.45 * px - 5, 0, 5, h); g.shadowBlur = 0;
        lanes('#4af0ff', 12);
      } else if (style === 'planks') {   // Pokitaru: a wooden boardwalk
        for (let y = 0; y < h; y += 32) {
          g.fillStyle = U.pick(['#b8804a', '#c48c54', '#a87040', '#c8945c']); g.fillRect(0, y, w, 30);
          g.fillStyle = 'rgba(80,40,10,0.35)'; g.fillRect(0, y + 30, w, 2);
          g.fillStyle = 'rgba(80,40,10,0.5)'; g.fillRect(U.rand(10, w - 10), y + 12, 4, 4);
        }
        g.fillStyle = '#6a4020'; g.fillRect(0, 0, 0.45 * px, h); g.fillRect(w - 0.45 * px, 0, 0.45 * px, h);
        lanes('rgba(255,255,255,0.55)', 0);
      } else if (style === 'ice') {      // Grelbin: an ice road
        g.fillStyle = '#a8def0'; g.fillRect(0, 0, w, h);
        speck(300, ['#c8f0ff', '#90cce4', '#ffffff'], 6);
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
        for (let i = 0; i < 14; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += U.rand(-30, 30); y += U.rand(-30, 30); g.lineTo(x, y); } g.stroke(); }
        g.fillStyle = '#ffffff'; g.fillRect(0, 0, 0.45 * px, h); g.fillRect(w - 0.45 * px, 0, 0.45 * px, h);
        lanes('#2a7ad8', 0);
      } else if (style === 'basalt') {   // Gaspar: black rock with glowing cracks
        g.fillStyle = '#2a2226'; g.fillRect(0, 0, w, h);
        speck(500, ['#3a3034', '#1c1618', '#40363a'], 6);
        g.strokeStyle = '#ff7a1a'; g.lineWidth = 3; g.shadowColor = '#ff5a00'; g.shadowBlur = 10;
        for (let i = 0; i < 10; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += U.rand(-25, 25); y += U.rand(-40, 40); g.lineTo(x, y); } g.stroke(); }
        g.shadowBlur = 0;
        g.fillStyle = '#ff5a1a'; g.fillRect(0.45 * px, 0, 4, h); g.fillRect(w - 0.45 * px - 4, 0, 4, h);
        lanes('#ffb03a', 8);
      } else {                           // neon (the old night city)
        g.fillStyle = '#1a1830'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#ff3aa8'; g.fillRect(0.45 * px, 0, 5, h); g.fillRect(w - 0.45 * px - 5, 0, 5, h);
        lanes('#4af0ff', 12);
      }
    }), true));
  }

  // rock layers for Veldin's canyons and Gaspar's cliffs
  function rock(c1, c2) {
    return once('rock' + c1 + c2, () => tex(U.canvas(64, 256, (g, w, h) => {
      let y = 0;
      while (y < h) { const bh = U.rand(10, 34); g.fillStyle = Math.random() < 0.5 ? c1 : c2; g.fillRect(0, y, w, bh); y += bh; }
      for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(Math.random() * w, Math.random() * h, 4, 2); }
    }), true));
  }

  // Ratchet's fur: stripes going around the ears and the tail
  function fur(base, stripe) {
    return once('fur' + base + stripe, () => tex(U.canvas(32, 128, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      g.fillStyle = stripe;
      for (const y of [30, 56, 82, 108]) g.fillRect(0, y, w, 11);
      g.fillRect(0, 0, w, 12); // dark tip
    })));
  }

  // the swirly middle of a warp gate
  function swirl() {
    return once('swirl', () => tex(U.canvas(256, 256, (g, w, h) => {
      const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.3, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0.05)');
      g.fillStyle = r; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 6;
      for (let arm = 0; arm < 5; arm++) {
        g.beginPath();
        for (let i = 0; i < 60; i++) { const a = arm * 1.2566 + i * 0.09, rr = i * 2; g.lineTo(w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr); }
        g.stroke();
      }
    })));
  }

  // building walls with windows. A few different ones so the city looks mixed.
  function windows(variant) {
    return once('win' + variant, () => {
      const cols = [['#ffd27a', '#ffb44a'], ['#6ae8ff', '#3a9aff'], ['#ff6ad8', '#b04aff'], ['#aaffcc', '#ffd27a']][variant % 4];
      const base = ['#141226', '#1a1030', '#101a2a', '#1c1420'][variant % 4];
      const canvas = U.canvas(128, 256, (g, w, h) => {
        g.fillStyle = base; g.fillRect(0, 0, w, h);
        const cw = 16, ch = 16;
        for (let y = 4; y < h - 4; y += ch) {
          for (let x = 4; x < w - 4; x += cw) {
            const lit = Math.random() < 0.42;
            g.fillStyle = lit ? U.pick(cols) : '#0a0914';
            g.globalAlpha = lit ? U.rand(0.6, 1) : 1;
            g.fillRect(x, y, cw - 6, ch - 7);
            g.globalAlpha = 1;
          }
        }
        // a glowing stripe up the side
        g.fillStyle = cols[1]; g.globalAlpha = 0.5; g.fillRect(0, 0, 2, h); g.fillRect(w - 2, 0, 2, h); g.globalAlpha = 1;
      });
      return tex(canvas, true);
    });
  }

  // a neon sign with words on it
  function sign(text, color) {
    return once('sign' + text + color, () => tex(U.canvas(512, 160, (g, w, h) => {
      g.fillStyle = '#0a0612'; U.rrect(g, 4, 4, w - 8, h - 8, 26); g.fill();
      g.strokeStyle = color; g.lineWidth = 8; g.shadowColor = color; g.shadowBlur = 20;
      U.rrect(g, 14, 14, w - 28, h - 28, 20); g.stroke();
      g.font = '900 96px "Russo One", Impact, sans-serif';
      const fit = Math.min(96, 96 * 440 / g.measureText(text).width);   // long words get smaller letters
      g.font = `900 ${Math.floor(fit)}px "Russo One", Impact, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffffff'; g.shadowBlur = 30;
      g.fillText(text, w / 2, h / 2 + 4);
      g.fillStyle = color; g.globalAlpha = 0.55; g.fillText(text, w / 2, h / 2 + 4); g.globalAlpha = 1;
    })));
  }

  // yellow and black warning stripes
  const hazard = () => once('hazard', () => tex(U.canvas(128, 32, (g, w, h) => {
    g.fillStyle = '#ffcc1a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16141c';
    for (let x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  }), true));

  // side of a hover-train: white with a colored stripe and windows
  function trainSide(color) {
    return once('train' + color, () => tex(U.canvas(256, 128, (g, w, h) => {
      g.fillStyle = '#d8dce8'; g.fillRect(0, 0, w, h);
      g.fillStyle = color; g.fillRect(0, h * 0.68, w, h * 0.14);
      g.fillStyle = '#ffffff'; g.fillRect(0, h * 0.64, w, 4);
      for (let x = 12; x < w; x += 42) {
        g.fillStyle = '#1a2a44'; U.rrect(g, x, 22, 30, 42, 6); g.fill();
        g.fillStyle = 'rgba(140,220,255,0.35)'; g.fillRect(x + 4, 26, 8, 30);
      }
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, h - 10, w, 10);
    }), true));
  }

  // front of a train with two big headlights
  function trainFront(color) {
    return once('front' + color, () => tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = '#c8ccd8'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#1a2a44'; U.rrect(g, 14, 14, w - 28, 44, 10); g.fill();
      g.fillStyle = color; g.fillRect(0, 84, w, 16);
      g.fillStyle = '#fff6c0'; g.shadowColor = '#fff6c0'; g.shadowBlur = 14;
      g.beginPath(); g.arc(28, 72, 9, 0, 7); g.fill();
      g.beginPath(); g.arc(w - 28, 72, 9, 0, 7); g.fill();
    })));
  }

  // arrows on the ramps
  const ramp = () => once('ramp', () => tex(U.canvas(128, 128, (g, w, h) => {
    g.fillStyle = '#2a2448'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#4af0ff'; g.lineWidth = 12; g.shadowColor = '#4af0ff'; g.shadowBlur = 10;
    for (const y of [40, 96]) { g.beginPath(); g.moveTo(24, y + 18); g.lineTo(64, y - 18); g.lineTo(104, y + 18); g.stroke(); }
  }), true));

  // a lightning bolt picture for the HUD and the power-ups
  const boltIcon = () => once('boltIcon', () => tex(U.canvas(128, 128, (g) => {
    g.fillStyle = '#ffe23a'; g.strokeStyle = '#ff9a1a'; g.lineWidth = 8; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(74, 8); g.lineTo(28, 72); g.lineTo(60, 72); g.lineTo(48, 120); g.lineTo(100, 50); g.lineTo(66, 50); g.lineTo(80, 8); g.closePath();
    g.stroke(); g.fill();
  })));

  // big letter icon for a power-up bubble
  function icon(emoji) {
    return once('icon' + emoji, () => tex(U.canvas(128, 128, (g) => {
      g.font = '84px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(emoji, 64, 70);
    })));
  }

  return { glow, toonRamp, sky, skyline, road, rock, fur, swirl, windows, sign, hazard, trainSide, trainFront, ramp, boltIcon, icon };
})();
