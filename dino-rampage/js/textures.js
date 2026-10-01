// ============================================================
//  DINO RAMPAGE — TEXTURES
//  Every picture in the game is painted with code on a canvas.
// ============================================================
window.DR = window.DR || {};

DR.Tex = (function () {
  const U = DR.U;
  const cache = {};
  const once = (key, make) => cache[key] || (cache[key] = make());
  const rnd = U.seeded(4242);
  const R = (a, b) => a + rnd() * (b - a);

  function tex(canvas, repeat = true, color = true) {
    const t = new THREE.CanvasTexture(canvas);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = DR.maxAniso || 4;
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

  // ---------- GROUND ----------
  function grass() {
    return once('grass', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#6cc04a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(${rnd() < 0.5 ? '90,170,50' : '130,210,80'},${R(0.2, 0.5)})`;
        g.beginPath(); g.arc(R(0, w), R(0, h), R(10, 30), 0, 7); g.fill();
      }
      for (let i = 0; i < 1400; i++) {
        g.strokeStyle = rnd() < 0.5 ? 'rgba(60,140,40,0.5)' : 'rgba(170,230,110,0.45)';
        const x = R(0, w), y = R(0, h);
        g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + R(-2, 2), y - R(3, 6)); g.stroke();
      }
    })));
  }
  function concrete() {
    return once('concrete', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#c9c6c0'; g.fillRect(0, 0, w, h);
      grain(g, w, h, 2500, 0.08, true);
      g.strokeStyle = 'rgba(90,85,80,0.45)'; g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); }
    })));
  }
  function sand() {
    return once('sand', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#f0d79a'; g.fillRect(0, 0, w, h);
      grain(g, w, h, 5000, 0.12, true);
      g.strokeStyle = 'rgba(200,160,90,0.3)'; g.lineWidth = 3;
      for (let i = 0; i < 8; i++) { g.beginPath(); const y = R(0, h); g.moveTo(0, y); g.bezierCurveTo(80, y + 10, 170, y - 10, 256, y); g.stroke(); }
    })));
  }
  // a road that runs along the "v" direction: grey asphalt, white edges and a yellow dashed middle line
  function road() {
    return once('road', () => tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#4a4a52'; g.fillRect(0, 0, w, h);
      grain(g, w, h, 4000, 0.15, true);
      g.fillStyle = '#f4f4f0'; g.fillRect(10, 0, 6, h); g.fillRect(w - 16, 0, 6, h);
      g.fillStyle = '#ffd23a'; g.fillRect(w / 2 - 4, 20, 8, 90); g.fillRect(w / 2 - 4, 148, 8, 90);
    })));
  }
  function water() {
    return once('water', () => tex(U.canvas(256, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#2a9ad8'); grd.addColorStop(1, '#1a7ac0');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
      for (let i = 0; i < 30; i++) {
        const x = R(0, w), y = R(0, h), l = R(12, 30);
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 5, x + l, y); g.stroke();
      }
    })));
  }

  // one window, with wall all around it. The corner is plain white so
  // shapes that are "just color" can use that spot of the picture.
  function windowTile() {
    return once('window', () => tex(U.canvas(64, 64, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#d8d8d8'; g.fillRect(12, 46, 40, 5);            // sill
      const grd = g.createLinearGradient(14, 12, 50, 46);
      grd.addColorStop(0, '#7ab8e8'); grd.addColorStop(0.5, '#3a6aa8'); grd.addColorStop(1, '#23467a');
      g.fillStyle = '#e8e8e8'; g.fillRect(12, 10, 40, 36);           // frame
      g.fillStyle = grd; g.fillRect(15, 13, 34, 30);                  // glass
      g.fillStyle = 'rgba(255,255,255,0.45)';                          // shiny reflection
      g.beginPath(); g.moveTo(18, 40); g.lineTo(30, 16); g.lineTo(36, 16); g.lineTo(24, 40); g.fill();
      g.fillStyle = '#e8e8e8'; g.fillRect(31, 13, 2, 30);
    })));
  }

  // ---------- DINO SKINS ----------
  function dinoSkin(skin) {
    return once('skin' + skin.id, () => tex(U.canvas(512, 256, (g, w, h) => {
      const r2 = U.seeded(7);
      if (skin.id === 'rainbow') {
        const cols = ['#ff4a4a', '#ff9a2a', '#ffe23a', '#4ad84a', '#3aa8ff', '#8a5aff'];
        for (let i = 0; i < 12; i++) { g.fillStyle = cols[i % 6]; g.fillRect(i * w / 12, 0, w / 12 + 1, h); }
      } else {
        g.fillStyle = skin.base; g.fillRect(0, 0, w, h);
      }
      // stripes or spots or patches
      if (skin.pattern === 'stripes') {
        g.fillStyle = skin.dark;
        for (let i = 0; i < 10; i++) {
          const x = i * w / 10 + 10;
          g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 18, h * 0.3, x + 4, h * 0.55); g.lineTo(x - 8, h * 0.55); g.quadraticCurveTo(x + 2, h * 0.3, x - 14, 0); g.fill();
        }
      } else if (skin.pattern === 'spots') {
        g.fillStyle = skin.dark;
        for (let i = 0; i < 50; i++) { g.beginPath(); g.arc(r2() * w, r2() * h * 0.7, 5 + r2() * 12, 0, 7); g.fill(); }
      } else if (skin.pattern === 'zombie') {
        for (let i = 0; i < 16; i++) {
          g.fillStyle = r2() < 0.5 ? '#6a8a5a' : '#a8b890';
          g.beginPath(); g.ellipse(r2() * w, r2() * h, 14 + r2() * 24, 10 + r2() * 16, r2() * 3, 0, 7); g.fill();
        }
        g.strokeStyle = '#3a2a2a'; g.lineWidth = 3;
        for (let i = 0; i < 7; i++) {
          const x = r2() * w, y = r2() * h, l = 30 + r2() * 30;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + r2() * 10); g.stroke();
          for (let k = 0; k < l; k += 8) { g.beginPath(); g.moveTo(x + k, y - 5); g.lineTo(x + k + 2, y + 6); g.stroke(); }
        }
      } else if (skin.pattern === 'circuit') {
        // robot panels with glowing blue lines
        g.strokeStyle = 'rgba(40,50,70,0.5)'; g.lineWidth = 2;
        for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        for (let y = 0; y < h; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.strokeStyle = skin.dark; g.lineWidth = 4;
        for (let i = 0; i < 26; i++) {
          let x = r2() * w, y = r2() * h * 0.7;
          g.beginPath(); g.moveTo(x, y);
          for (let k = 0; k < 3; k++) { if (k % 2) x += (r2() - 0.5) * 80; else y += (r2() - 0.5) * 60; g.lineTo(x, y); }
          g.stroke();
          g.fillStyle = '#8ad8ff'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
        }
        for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(60,70,90,0.7)'; g.beginPath(); g.arc(r2() * w, r2() * h, 2.5, 0, 7); g.fill(); }
      } else if (skin.pattern === 'sparkle') {
        for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,220,${0.3 + r2() * 0.6})`; const s = 1 + r2() * 3; g.fillRect(r2() * w, r2() * h, s, s); }
      }
      // little bumpy scales everywhere
      for (let y = 0; y < h; y += 10) {
        for (let x = (y / 10) % 2 ? 5 : 0; x < w; x += 10) {
          g.fillStyle = r2() < 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
          g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill();
        }
      }
      // lighter belly along the bottom of the picture
      const grd = g.createLinearGradient(0, h * 0.62, 0, h);
      grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.35, skin.belly); grd.addColorStop(1, skin.belly);
      g.fillStyle = grd; g.fillRect(0, h * 0.62, w, h * 0.38);
    })));
  }

  // ---------- LITTLE ROUND THINGS ----------
  function glow() {
    return once('glow', () => tex(U.canvas(128, 128, (g, w, h) => {
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }), false));
  }
  function shadow() {
    return once('shadow', () => tex(U.canvas(128, 128, (g, w, h) => {
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(0.6, 'rgba(0,0,0,0.28)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    }), false));
  }
  function puff() {
    return once('puff', () => tex(U.canvas(128, 128, (g) => {
      for (let i = 0; i < 7; i++) {
        const x = 64 + R(-22, 22), y = 64 + R(-22, 22), r = R(22, 36);
        const grd = g.createRadialGradient(x, y, 0, x, y, r);
        grd.addColorStop(0, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
    }), false));
  }
  function star() {
    return once('star', () => tex(U.canvas(64, 64, (g) => {
      g.fillStyle = '#fff';
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 11 : 30; g.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); }
      g.fill();
    }), false));
  }
  // a messy brown patch where something got smashed
  function rubble() {
    return once('rubble', () => tex(U.canvas(128, 128, (g) => {
      for (let i = 0; i < 26; i++) {
        const x = 64 + R(-34, 34), y = 64 + R(-34, 34), r = R(8, 22);
        g.fillStyle = `rgba(${R(80, 120) | 0},${R(65, 95) | 0},${R(50, 70) | 0},${R(0.3, 0.6)})`;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(60,55,50,${R(0.3, 0.8)})`; g.fillRect(64 + R(-40, 40), 64 + R(-40, 40), R(2, 6), R(2, 6)); }
    }), false));
  }

  return { tex, grass, concrete, sand, road, water, windowTile, dinoSkin, glow, shadow, puff, star, rubble };
})();
