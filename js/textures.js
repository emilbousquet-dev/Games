// ============================================================
//  LAB 13 — textures, all painted with code (no image files!)
// ============================================================
window.LAB = window.LAB || {};

LAB.Tex = (function () {
  const U = LAB.U;
  const cache = {};
  const once = (key, fn) => cache[key] || (cache[key] = fn());

  // sprinkle random noise dots to make surfaces look dirty
  function noise(g, w, h, amount, alpha, dark = true) {
    for (let i = 0; i < amount; i++) {
      const v = dark ? U.randInt(0, 40) : U.randInt(150, 255);
      g.fillStyle = `rgba(${v},${v},${v},${Math.random() * alpha})`;
      g.fillRect(Math.random() * w, Math.random() * h, U.rand(1, 3), U.rand(1, 3));
    }
  }

  // drips of dirt / rust running down from the top
  function streaks(g, w, h, color, n) {
    for (let i = 0; i < n; i++) {
      const x = Math.random() * w;
      const len = U.rand(h * 0.1, h * 0.7);
      const grad = g.createLinearGradient(0, 0, 0, len);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(x, 0, U.rand(1, 5), len);
    }
  }

  // a blood splat, drawn on any canvas
  function splat(g, cx, cy, r, color, drips) {
    g.fillStyle = color;
    g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = r * U.rand(0.6, 1.9);
      const s = r * U.rand(0.05, 0.35);
      g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 0, Math.PI * 2); g.fill();
    }
    for (let i = 0; i < 12; i++) { // little flecks far away
      const a = Math.random() * Math.PI * 2;
      const d = r * U.rand(1.5, 3);
      g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, U.rand(1, 3), 0, Math.PI * 2); g.fill();
    }
    if (drips) {
      for (let i = 0; i < drips; i++) {
        const x = cx + U.rand(-r, r);
        const len = U.rand(r, r * 4);
        g.fillRect(x, cy, U.rand(2, 5), len);
        g.beginPath(); g.arc(x + 2, cy + len, 4, 0, Math.PI * 2); g.fill();
      }
    }
  }

  const T = {
    splat,

    wallConcrete: () => once('wallConcrete', () => U.tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#4d534f'; g.fillRect(0, 0, w, h);
      noise(g, w, h, 5000, 0.25);
      noise(g, w, h, 1500, 0.08, false);
      // big panels
      g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 3;
      g.strokeRect(2, 2, w - 4, h * 0.62);
      g.strokeRect(2, h * 0.62 + 4, w - 4, h * 0.3);
      // bolts
      g.fillStyle = '#2b2e2c';
      [[10, 10], [w - 12, 10], [10, h * 0.6], [w - 12, h * 0.6]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); });
      // hazard stripe near the floor
      g.fillStyle = '#1c1c1a'; g.fillRect(0, h * 0.93, w, h * 0.07);
      for (let x = -20; x < w; x += 24) {
        g.fillStyle = '#8a7420';
        g.beginPath(); g.moveTo(x, h); g.lineTo(x + 12, h * 0.93); g.lineTo(x + 24, h * 0.93); g.lineTo(x + 12, h); g.fill();
      }
      streaks(g, w, h, 'rgba(60,35,15,0.45)', 14);
      streaks(g, w, h, 'rgba(0,0,0,0.35)', 18);
    }))),

    wallTiles: () => once('wallTiles', () => U.tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#8f9690'; g.fillRect(0, 0, w, h);
      const s = 32;
      for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
        const v = U.randInt(125, 160);
        g.fillStyle = `rgb(${v},${v + 6},${v + 2})`;
        g.fillRect(x + 1, y + 1, s - 2, s - 2);
        if (Math.random() < 0.08) { // cracked tile
          g.strokeStyle = 'rgba(20,20,20,0.6)'; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x + U.rand(0, s), y); g.lineTo(x + U.rand(0, s), y + s); g.stroke();
        }
      }
      g.fillStyle = 'rgba(40,45,40,0.9)';
      for (let i = 0; i <= w; i += s) { g.fillRect(i - 1, 0, 2, h); g.fillRect(0, i - 1, w, 2); }
      noise(g, w, h, 3000, 0.2);
      g.fillStyle = '#2a3a44'; g.fillRect(0, h * 0.45, w, 10); // blue stripe
      streaks(g, w, h, 'rgba(70,50,20,0.35)', 12);
      streaks(g, w, h, 'rgba(0,0,0,0.3)', 12);
      g.fillStyle = 'rgba(30,25,20,0.8)'; g.fillRect(0, h * 0.94, w, h * 0.06);
    }))),

    wallMetal: () => once('wallMetal', () => U.tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#3c4146'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64) {
        const gr = g.createLinearGradient(x, 0, x + 64, 0);
        gr.addColorStop(0, '#2c3034'); gr.addColorStop(0.5, '#4a5056'); gr.addColorStop(1, '#2a2e32');
        g.fillStyle = gr; g.fillRect(x + 2, 0, 60, h);
        g.fillStyle = '#1a1c1e';
        for (let y = 8; y < h; y += 40) { g.beginPath(); g.arc(x + 8, y, 2.5, 0, 7); g.arc(x + 56, y, 2.5, 0, 7); g.fill(); }
      }
      noise(g, w, h, 4000, 0.25);
      streaks(g, w, h, 'rgba(90,50,20,0.5)', 20);
    }))),

    floorMetal: () => once('floorMetal', () => U.tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#2f3232'; g.fillRect(0, 0, w, h);
      // diamond tread plate
      g.fillStyle = '#3d4141';
      for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 * 8; x < w; x += 16) {
        g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-4, -1.2, 8, 2.4); g.restore();
      }
      g.strokeStyle = 'rgba(0,0,0,0.7)'; g.lineWidth = 3; g.strokeRect(1, 1, w - 2, h - 2);
      noise(g, w, h, 6000, 0.35);
      for (let i = 0; i < 6; i++) { // oil / dirt stains
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 40);
        gr.addColorStop(0, 'rgba(10,8,5,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.save(); g.translate(Math.random() * w, Math.random() * h); g.fillStyle = gr; g.fillRect(-40, -40, 80, 80); g.restore();
      }
    }))),

    floorTiles: () => once('floorTiles', () => U.tex(U.canvas(256, 256, (g, w, h) => {
      const s = 64;
      for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) {
        const v = ((x + y) / s) % 2 ? 70 : 88;
        g.fillStyle = `rgb(${v},${v + 3},${v})`; g.fillRect(x, y, s, s);
      }
      g.fillStyle = 'rgba(0,0,0,0.6)';
      for (let i = 0; i <= w; i += s) { g.fillRect(i - 1, 0, 2, h); g.fillRect(0, i - 1, w, 2); }
      noise(g, w, h, 5000, 0.3);
    }))),

    ceiling: () => once('ceiling', () => U.tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#222524'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#111'; g.lineWidth = 4;
      for (let i = 0; i <= w; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
      g.fillStyle = '#151716'; // vent slots
      for (let i = 0; i < 6; i++) g.fillRect(30, 40 + i * 8, 60, 4);
      noise(g, w, h, 4000, 0.4);
      streaks(g, w, h, 'rgba(0,0,0,0.5)', 10);
    }))),

    // ---------- decals ----------
    blood: (i) => once('blood' + i, () => {
      const c = U.canvas(256, 256, (g, w, h) => {
        const dark = ['#5a0000', '#6e0303', '#480000'][i % 3];
        splat(g, w / 2, h / 2, U.rand(25, 45), dark, 0);
        g.globalAlpha = 0.6;
        splat(g, w / 2 + U.rand(-20, 20), h / 2 + U.rand(-20, 20), U.rand(10, 20), '#8a0a0a', 0);
      });
      const t = U.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
    }),

    bloodWall: (i) => once('bloodWall' + i, () => {
      const c = U.canvas(256, 256, (g, w, h) => {
        splat(g, w / 2, h * 0.3, U.rand(18, 34), '#5c0202', 7);
      });
      const t = U.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
    }),

    goo: () => once('goo', () => {
      const c = U.canvas(256, 256, (g, w, h) => {
        splat(g, w / 2, h / 2, 40, 'rgba(90,160,30,0.9)', 0);
        g.globalAlpha = 0.5; splat(g, w / 2, h / 2, 20, '#c8ff50', 0);
      });
      const t = U.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
    }),

    drag: () => once('drag', () => {
      const c = U.canvas(128, 512, (g, w, h) => {
        for (let i = 0; i < 40; i++) {
          g.fillStyle = `rgba(${U.randInt(70, 100)},0,0,${U.rand(0.3, 0.8)})`;
          const x = w / 2 + Math.sin(i / 6) * 10 + U.rand(-20, 20);
          g.fillRect(x, i * 12, U.rand(4, 30), U.rand(10, 30));
        }
      });
      const t = U.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
    }),

    handprints: () => once('handprints', () => {
      const c = U.canvas(256, 256, (g, w, h) => {
        g.fillStyle = '#640404';
        for (let k = 0; k < 4; k++) {
          const cx = U.rand(50, 200), cy = U.rand(50, 180), a = U.rand(-0.5, 0.5);
          g.save(); g.translate(cx, cy); g.rotate(a);
          g.beginPath(); g.ellipse(0, 0, 18, 22, 0, 0, 7); g.fill();
          for (let f = 0; f < 4; f++) { g.beginPath(); g.ellipse(-15 + f * 10, -32, 4.5, 14, (f - 1.5) * 0.12, 0, 7); g.fill(); }
          g.beginPath(); g.ellipse(22, -4, 5, 12, 0.9, 0, 7); g.fill();
          g.fillRect(-8, 10, 5, U.rand(20, 70)); // drip
          g.restore();
        }
      });
      const t = U.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
    }),

    // words painted on the wall in blood
    writing: (text) => once('write' + text, () => {
      const c = U.canvas(512, 256, (g, w, h) => {
        g.font = 'bold 70px "Brush Script MT", "Comic Sans MS", cursive';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        let size = 90;
        do { size -= 6; g.font = `bold ${size}px Impact, "Arial Black", sans-serif`; } while (g.measureText(text).width > w * 0.9);
        g.fillStyle = '#6a0202';
        g.save(); g.translate(w / 2, h / 2); g.rotate(U.rand(-0.08, 0.08));
        g.fillText(text, 0, 0);
        g.restore();
        // drips under the letters
        for (let i = 0; i < 18; i++) {
          const x = U.rand(w * 0.1, w * 0.9);
          g.fillRect(x, h / 2 + 10, U.rand(2, 4), U.rand(15, 80));
        }
      });
      const t = U.tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
    }),

    // printed sign plates
    sign: (text, bg = '#b8a21a', fg = '#111') => once('sign' + text + bg, () => {
      const c = U.canvas(512, 128, (g, w, h) => {
        g.fillStyle = bg; g.fillRect(0, 0, w, h);
        g.fillStyle = fg; g.fillRect(6, 6, w - 12, 4); g.fillRect(6, h - 10, w - 12, 4);
        g.font = 'bold 54px "Arial Black", Arial, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(text, w / 2, h / 2 + 2);
        noise(g, w, h, 2500, 0.35);
      });
      return U.tex(c);
    }),

    // green computer screen text
    screen: (i) => once('screen' + i, () => {
      const lines = [
        ['> CONTAINMENT STATUS', '  CELL 13 ....... BREACHED', '  CELL 12 ....... EMPTY', '> LIFE SIGNS: 2', '> LIFE SIGNS: ??', '> _'],
        ['KESSLER DEEP RESEARCH', 'SUBLEVEL -13', '', 'POWER: 4% (BACKUP)', 'ELEVATOR: OFFLINE', 'FUSES MISSING: 3'],
        ['ERROR ERROR ERROR', 'IT IS IN THE VENTS', 'IT IS IN THE VENTS', 'IT IS IN THE VENTS', 'IT IS IN THE', 'I'],
        ['SPECIMEN 13 GROWTH', '|||||||||||||||||| 97%', 'LIGHT RESPONSE: FREEZE', 'HOST SEARCH: ACTIVE', '', '> DO NOT OPEN'],
      ][i % 4];
      const c = U.canvas(256, 192, (g, w, h) => {
        g.fillStyle = '#021006'; g.fillRect(0, 0, w, h);
        g.fillStyle = i % 4 === 2 ? '#ff3030' : '#38ff78';
        g.font = '16px monospace';
        lines.forEach((l, k) => g.fillText(l, 10, 28 + k * 26));
        g.fillStyle = 'rgba(0,0,0,0.35)';
        for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
      });
      return U.tex(c);
    }),

    // wet, veiny alien skin
    alienSkin: (tint = 'pale') => once('skin' + tint, () => U.tex(U.canvas(256, 256, (g, w, h) => {
      const base = tint === 'pale' ? '#b9a898' : tint === 'dark' ? '#3a3431' : '#7a5448';
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) {
        g.fillStyle = `rgba(${U.randInt(80, 140)},${U.randInt(20, 50)},${U.randInt(30, 60)},${U.rand(0.05, 0.2)})`;
        g.beginPath(); g.arc(Math.random() * w, Math.random() * h, U.rand(2, 14), 0, 7); g.fill();
      }
      // veins
      g.strokeStyle = tint === 'dark' ? 'rgba(120,30,40,0.6)' : 'rgba(90,20,50,0.55)';
      for (let i = 0; i < 26; i++) {
        g.lineWidth = U.rand(0.5, 2.5);
        g.beginPath();
        let x = Math.random() * w, y = Math.random() * h;
        g.moveTo(x, y);
        for (let k = 0; k < 8; k++) { x += U.rand(-25, 25); y += U.rand(-25, 25); g.lineTo(x, y); }
        g.stroke();
      }
      noise(g, w, h, 3000, 0.2);
    }), 2, 2)),

    // flesh growths / infestation
    flesh: () => once('flesh', () => U.tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#3b0d12'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) {
        g.fillStyle = `rgba(${U.randInt(100, 170)},${U.randInt(10, 40)},${U.randInt(20, 50)},${U.rand(0.2, 0.6)})`;
        g.beginPath(); g.arc(Math.random() * w, Math.random() * h, U.rand(3, 20), 0, 7); g.fill();
      }
      g.strokeStyle = 'rgba(200,160,120,0.35)';
      for (let i = 0; i < 40; i++) { g.lineWidth = U.rand(0.5, 2); g.beginPath(); g.moveTo(Math.random() * w, Math.random() * h); g.quadraticCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h); g.stroke(); }
    }))),

    labCoat: () => once('labCoat', () => U.tex(U.canvas(64, 64, (g, w, h) => {
      g.fillStyle = '#c9c8c0'; g.fillRect(0, 0, w, h);
      noise(g, w, h, 300, 0.2);
      splat(g, U.rand(10, 50), U.rand(10, 50), 9, '#5e0404', 3);
    }))),

    crate: () => once('crate', () => U.tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = '#4c4a3a'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2a2920'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
      g.beginPath(); g.moveTo(4, 4); g.lineTo(w - 4, h - 4); g.stroke();
      g.fillStyle = '#c9b12a'; g.font = 'bold 20px Arial'; g.fillText('LAB-13', 30, 70);
      noise(g, w, h, 900, 0.3);
    }))),

    barrel: () => once('barrel', () => U.tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = '#6b5a14'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#3a3208'; g.fillRect(0, 18, w, 6); g.fillRect(0, h - 24, w, 6);
      g.fillStyle = '#111'; g.beginPath(); g.arc(w / 2, h / 2, 16, 0, 7); g.fill();
      g.fillStyle = '#d9c22d';
      for (let k = 0; k < 3; k++) { g.save(); g.translate(w / 2, h / 2); g.rotate(k * 2.094); g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 14, -0.5, 0.5); g.fill(); g.restore(); }
      streaks(g, w, h, 'rgba(40,20,0,0.6)', 10);
      noise(g, w, h, 800, 0.3);
    }))),

    paper: () => once('paper', () => U.tex(U.canvas(64, 80, (g, w, h) => {
      g.fillStyle = '#d8d0b8'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#555';
      for (let y = 10; y < h - 6; y += 6) g.fillRect(6, y, U.rand(20, 50), 1.5);
      splat(g, 50, 60, 5, '#6a0404', 1);
    }))),

    keycard: () => once('keycard', () => U.tex(U.canvas(128, 80, (g, w, h) => {
      g.fillStyle = '#d42020'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.fillRect(8, 8, 36, 44);
      g.fillStyle = '#333'; g.beginPath(); g.arc(26, 26, 12, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.font = 'bold 16px Arial'; g.fillText('SECURITY', 50, 26); g.fillText('LEVEL 4', 50, 46);
      g.fillStyle = '#d4b020'; g.fillRect(8, 60, 60, 10);
    }))),

    serverFront: () => once('serverFront', () => U.tex(U.canvas(64, 256, (g, w, h) => {
      g.fillStyle = '#16181a'; g.fillRect(0, 0, w, h);
      for (let y = 4; y < h; y += 20) {
        g.fillStyle = '#26292c'; g.fillRect(3, y, w - 6, 16);
        g.fillStyle = '#0b0c0d'; for (let x = 8; x < 44; x += 4) g.fillRect(x, y + 4, 2, 8);
      }
    }))),

    grate: () => once('grate', () => {
      const t = U.tex(U.canvas(64, 64, (g, w, h) => {
        g.fillStyle = '#23262a'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#060707'; for (let y = 6; y < h - 4; y += 8) g.fillRect(6, y, w - 12, 4);
      }));
      return t;
    }),
  };
  return T;
})();
