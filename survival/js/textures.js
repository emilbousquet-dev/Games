// ============================================================
//  DEAD ACRES — textures, all painted with code (no image files!)
// ============================================================
window.DA = window.DA || {};

DA.Tex = (function () {
  const U = DA.U;
  const cache = {};
  const once = (key, fn) => cache[key] || (cache[key] = fn());

  // sprinkle random dots to make surfaces look rough and dirty
  function noise(g, w, h, amount, alpha, dark = true) {
    for (let i = 0; i < amount; i++) {
      const v = dark ? U.randInt(0, 40) : U.randInt(170, 255);
      g.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`;
      g.fillRect(Math.random() * w, Math.random() * h, U.rand(1, 3), U.rand(1, 3));
    }
  }
  // dirt running down from the top
  function streaks(g, w, h, color, n, fromBottom) {
    for (let i = 0; i < n; i++) {
      const x = Math.random() * w;
      const len = U.rand(h * 0.1, h * 0.5);
      const grad = fromBottom ? g.createLinearGradient(0, h, 0, h - len) : g.createLinearGradient(0, 0, 0, len);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      if (fromBottom) g.fillRect(x, h - len, U.rand(2, 8), len);
      else g.fillRect(x, 0, U.rand(1, 5), len);
    }
  }
  const clampTex = (t) => { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };

  const T = {
    // grey bumpy pattern multiplied on top of the ground colors
    groundDetail: () => once('groundDetail', () => {
      const t = U.tex(U.canvas(256, 256, (g, w, h) => {
        g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 9000; i++) {
          const v = U.randInt(90, 170);
          g.fillStyle = `rgba(${v},${v},${v},0.5)`;
          const x = Math.random() * w, y = Math.random() * h;
          g.fillRect(x, y, U.rand(1, 2), U.rand(2, 5)); // little grass blades
        }
        for (let i = 0; i < 40; i++) { // small pebbles
          const v = U.randInt(60, 100);
          g.fillStyle = `rgba(${v},${v},${v},0.4)`;
          g.beginPath(); g.arc(Math.random() * w, Math.random() * h, U.rand(1, 3), 0, 7); g.fill();
        }
      }));
      t.colorSpace = THREE.NoColorSpace;
      return t;
    }),

    bark: () => once('bark', () => U.tex(U.canvas(64, 256, (g, w, h) => {
      g.fillStyle = '#5a4230'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 4) {
        const v = U.randInt(40, 90);
        g.fillStyle = `rgba(${v},${v * 0.75 | 0},${v * 0.55 | 0},0.8)`;
        g.fillRect(x + U.rand(-1, 1), 0, U.rand(1, 3), h);
      }
      noise(g, w, h, 900, 0.4);
    }))),

    // boards nailed side by side (player built walls, barn, cabin)
    planks: (key = 'planks', base = [126, 92, 58], vertical = false) => once(key, () => U.tex(U.canvas(256, 256, (g, w, h) => {
      const n = 5, s = h / n;
      for (let i = 0; i < n; i++) {
        const k = U.rand(0.8, 1.15);
        g.fillStyle = `rgb(${base[0] * k | 0},${base[1] * k | 0},${base[2] * k | 0})`;
        if (vertical) g.fillRect(i * s, 0, s, h); else g.fillRect(0, i * s, w, s);
        // wood grain
        for (let j = 0; j < 14; j++) {
          g.fillStyle = `rgba(40,25,10,${U.rand(0.05, 0.2)})`;
          if (vertical) g.fillRect(i * s + U.rand(0, s), 0, 1, h); else g.fillRect(0, i * s + U.rand(0, s), w, 1);
        }
        g.fillStyle = 'rgba(20,12,5,0.8)';
        if (vertical) g.fillRect(i * s, 0, 2, h); else g.fillRect(0, i * s, w, 2);
        // nails
        g.fillStyle = '#2a2622';
        for (const p of [0.1, 0.9]) {
          if (vertical) { g.fillRect(i * s + 8, p * h, 3, 3); g.fillRect(i * s + s - 10, p * h, 3, 3); }
          else { g.fillRect(p * w, i * s + 8, 3, 3); g.fillRect(p * w, i * s + s - 10, 3, 3); }
        }
      }
      noise(g, w, h, 2500, 0.25);
    }))),

    // painted house boards (tinted with a color by the material)
    siding: () => once('siding', () => U.tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) {
        const gr = g.createLinearGradient(0, y, 0, y + 16);
        gr.addColorStop(0, 'rgba(0,0,0,0.25)'); gr.addColorStop(0.15, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(0,0,0,0.05)');
        g.fillStyle = gr; g.fillRect(0, y, w, 16);
      }
      noise(g, w, h, 900, 0.18);
      streaks(g, w, h, 'rgba(60,50,30,0.25)', 6);
      streaks(g, w, h, 'rgba(60,50,30,0.3)', 8, true);
    }))),

    brick: () => once('brick', () => U.tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#6e6660'; g.fillRect(0, 0, w, h);
      const bh = 16, bw = 48;
      for (let r = 0; r < h / bh; r++) for (let c = -1; c < w / bw + 1; c++) {
        const x = c * bw + (r % 2) * bw / 2, y = r * bh;
        const k = U.rand(0.8, 1.1);
        g.fillStyle = `rgb(${150 * k | 0},${70 * k | 0},${52 * k | 0})`;
        g.fillRect(x + 2, y + 2, bw - 3, bh - 3);
      }
      noise(g, w, h, 3000, 0.25);
      streaks(g, w, h, 'rgba(20,20,20,0.35)', 10, true);
    }))),

    roof: () => once('roof', () => U.tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = '#3a3a3c'; g.fillRect(0, 0, w, h);
      const s = 16;
      for (let r = 0; r < h / s; r++) for (let c = -1; c < w / 20 + 1; c++) {
        const v = U.randInt(55, 90);
        g.fillStyle = `rgb(${v},${v - 4},${v - 8})`;
        g.fillRect(c * 20 + (r % 2) * 10 + 1, r * s + 1, 18, s - 2);
      }
      g.fillStyle = 'rgba(0,0,0,0.4)';
      for (let r = 0; r < h / s; r++) g.fillRect(0, r * s + s - 3, w, 3);
      noise(g, w, h, 1500, 0.25);
      for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(70,90,40,0.3)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, U.rand(5, 14), 0, 7); g.fill(); } // moss
    }))),

    metalRoof: () => once('metalRoof', () => U.tex(U.canvas(128, 128, (g, w, h) => {
      for (let x = 0; x < w; x += 8) {
        const gr = g.createLinearGradient(x, 0, x + 8, 0);
        gr.addColorStop(0, '#8a8d90'); gr.addColorStop(0.5, '#c8cacc'); gr.addColorStop(1, '#7a7d80');
        g.fillStyle = gr; g.fillRect(x, 0, 8, h);
      }
      streaks(g, w, h, 'rgba(110,60,20,0.5)', 14);
      noise(g, w, h, 1200, 0.25);
    }))),

    wallpaper: () => once('wallpaper', () => U.tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = '#d8d0b8'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(150,120,90,0.35)';
      for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 3, h);
      g.fillStyle = 'rgba(120,90,70,0.25)';
      for (let y = 8; y < h; y += 32) for (let x = 8; x < w; x += 16) { g.beginPath(); g.arc(x + ((y / 32) % 2) * 8, y, 3, 0, 7); g.fill(); }
      noise(g, w, h, 1500, 0.15);
      streaks(g, w, h, 'rgba(90,70,40,0.25)', 5);
      streaks(g, w, h, 'rgba(40,30,20,0.35)', 8, true);
    }))),

    woodFloor: () => once('woodFloor', () => U.tex(U.canvas(128, 128, (g, w, h) => {
      const s = 16;
      for (let i = 0; i < w / s; i++) {
        const k = U.rand(0.8, 1.1);
        g.fillStyle = `rgb(${120 * k | 0},${82 * k | 0},${50 * k | 0})`;
        g.fillRect(i * s, 0, s, h);
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(i * s, 0, 1, h);
        g.fillRect(i * s, U.rand(0, h), s, 1);
      }
      noise(g, w, h, 1500, 0.2);
    }))),

    concrete: () => once('concrete', () => U.tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = '#8a8884'; g.fillRect(0, 0, w, h);
      noise(g, w, h, 3000, 0.25);
      noise(g, w, h, 800, 0.12, false);
      g.strokeStyle = 'rgba(30,30,30,0.5)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(U.rand(0, w), 0); g.lineTo(U.rand(0, w), h); g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(0, 0, w, 2); g.fillRect(0, 0, 2, h);
    }))),

    tiles: () => once('tiles', () => U.tex(U.canvas(128, 128, (g, w, h) => {
      const s = 32;
      for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
        const v = ((x + y) / s) % 2 ? 190 : 150;
        g.fillStyle = `rgb(${v},${v - 5},${v - 12})`; g.fillRect(x, y, s, s);
      }
      g.fillStyle = 'rgba(0,0,0,0.3)';
      for (let i = 0; i <= w; i += s) { g.fillRect(i - 1, 0, 2, h); g.fillRect(0, i - 1, w, 2); }
      noise(g, w, h, 2000, 0.25);
    }))),

    stoneWall: () => once('stoneWall', () => U.tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#4a4844'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const v = U.randInt(95, 150);
        g.fillStyle = `rgb(${v},${v - 3},${v - 8})`;
        g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, U.rand(14, 30), U.rand(10, 18), U.rand(-0.3, 0.3), 0, 7); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.stroke();
      }
      noise(g, w, h, 3000, 0.3);
    }))),

    // one blade of grass drawn many times (see-through around it)
    grassBlades: () => once('grassBlades', () => {
      const t = U.tex(U.canvas(64, 64, (g, w, h) => {
        for (let i = 0; i < 22; i++) {
          const x = U.rand(4, w - 4), top = U.rand(4, h * 0.6), lean = U.rand(-8, 8);
          const v = U.randInt(0, 40);
          g.strokeStyle = `rgb(${70 + v},${110 + v},${40 + v / 2})`;
          g.lineWidth = U.rand(1.5, 3);
          g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x, (h + top) / 2, x + lean, top); g.stroke();
        }
      }));
      return clampTex(t);
    }),

    // soft round glow (fire, sparks, light flares)
    glow: () => once('glow', () => clampTex(U.tex(U.canvas(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    })))),

    smoke: () => once('smoke', () => clampTex(U.tex(U.canvas(64, 64, (g, w, h) => {
      for (let i = 0; i < 8; i++) {
        const x = U.rand(20, 44), y = U.rand(20, 44), r = U.rand(10, 20);
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }
    })))),

    // big painted signs on buildings
    sign: (text, bg, fg) => once('sign' + text, () => clampTex(U.tex(U.canvas(512, 128, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
      g.fillStyle = fg; g.font = 'bold 72px Impact, "Arial Black", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2 + 4);
      noise(g, w, h, 2500, 0.35);
      streaks(g, w, h, 'rgba(60,40,20,0.4)', 10);
    })))),

    // words sprayed on walls by survivors
    graffiti: (text, color = '#c01818') => once('graffiti' + text, () => clampTex(U.tex(U.canvas(512, 128, (g, w, h) => {
      g.fillStyle = color; g.font = 'bold 64px "Comic Sans MS", Impact, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.save(); g.translate(w / 2, h / 2); g.rotate(-0.04); g.fillText(text, 0, 0); g.restore();
      for (let i = 0; i < 10; i++) g.fillRect(U.rand(60, w - 60), h / 2 + 20, 2, U.rand(10, 40)); // drips
    })))),

    // the name above other players' heads
    nameTag: (text, color) => clampTex(U.tex(U.canvas(256, 64, (g, w, h) => {
      g.font = 'bold 34px Arial, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.8)'; g.strokeText(text, w / 2, h / 2);
      g.fillStyle = color; g.fillText(text, w / 2, h / 2);
    }))),
  };
  return T;
})();
