// ============================================================
//  NINJA CAT — TEXTURES
//  Every picture in the game is painted with code on a canvas.
//  One texture = a 3 m x 3 m square of the world.
// ============================================================
window.NC = window.NC || {};

NC.Tex = (function () {
  const U = NC.U;
  const cache = {};

  function tex(name, w, h, draw) {
    if (cache[name]) return cache[name];
    const c = U.canvas(w, h, draw);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = NC.lowGfx ? 1 : 4;
    cache[name] = t;
    return t;
  }

  // little random speckles so things don't look flat
  function grain(g, w, h, n, alpha, rnd) {
    for (let i = 0; i < n; i++) {
      const v = rnd() < 0.5 ? 0 : 255;
      g.fillStyle = `rgba(${v},${v},${v},${alpha * rnd()})`;
      g.fillRect(rnd() * w, rnd() * h, 2, 2);
    }
  }

  // ---------- WALLS ----------
  // paper walls with wooden frames (Sakura Village). Some windows glow!
  function shoji() {
    return tex('shoji', 256, 256, (g, w, h) => {
      const r = U.seeded(11);
      g.fillStyle = '#3a2416'; g.fillRect(0, 0, w, h);
      // 2 panels per tile
      for (let p = 0; p < 2; p++) {
        const x0 = p * 128 + 10, glow = p === 1;
        const grad = g.createLinearGradient(0, 20, 0, 236);
        grad.addColorStop(0, glow ? '#ffe2a0' : '#efe6d2');
        grad.addColorStop(1, glow ? '#ffb860' : '#d8ccb2');
        g.fillStyle = grad; g.fillRect(x0, 20, 108, 216);
        g.fillStyle = '#4a2e1c';
        for (let i = 1; i < 3; i++) g.fillRect(x0 + i * 36 - 2, 20, 4, 216);
        for (let j = 1; j < 6; j++) g.fillRect(x0, 20 + j * 36 - 2, 108, 4);
      }
      g.fillStyle = '#2a180e'; g.fillRect(0, 0, w, 16); g.fillRect(0, 240, w, 16);
      grain(g, w, h, 900, 0.08, r);
    });
  }
  // wooden planks (Fish Market)
  function planks(name = 'planks', base = '#7a5434', dark = '#4a3020', vertical = true) {
    return tex(name, 256, 256, (g, w, h) => {
      const r = U.seeded(name.length * 7);
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      const n = 6;
      for (let i = 0; i < n; i++) {
        const s = w / n;
        const shade = 0.85 + r() * 0.3;
        g.fillStyle = `rgba(0,0,0,${0.25 - shade * 0.18})`;
        if (vertical) g.fillRect(i * s, 0, s, h); else g.fillRect(0, i * s, w, s);
        g.fillStyle = dark;
        if (vertical) g.fillRect(i * s, 0, 3, h); else g.fillRect(0, i * s, w, 3);
        // wood lines
        g.strokeStyle = 'rgba(40,20,10,0.25)'; g.lineWidth = 1;
        for (let k = 0; k < 5; k++) {
          g.beginPath();
          const o = i * s + 6 + r() * (s - 12);
          if (vertical) { g.moveTo(o, 0); g.bezierCurveTo(o + 4, h * 0.3, o - 4, h * 0.6, o + 2, h); } else { g.moveTo(0, o); g.bezierCurveTo(w * 0.3, o + 4, w * 0.6, o - 4, w, o + 2); }
          g.stroke();
        }
        // nails
        g.fillStyle = '#222';
        if (vertical) { g.fillRect(i * s + s / 2 - 2, 10, 4, 4); g.fillRect(i * s + s / 2 - 2, h - 14, 4, 4); }
      }
      grain(g, w, h, 1200, 0.1, r);
    });
  }
  // big castle stones
  function stoneBlocks() {
    return tex('stoneBlocks', 256, 256, (g, w, h) => {
      const r = U.seeded(5);
      g.fillStyle = '#4a4a50'; g.fillRect(0, 0, w, h);
      const rows = 4;
      for (let j = 0; j < rows; j++) {
        const rh = h / rows, off = (j % 2) * 40;
        for (let x = -off; x < w; x += 80) {
          const c = 70 + r() * 30;
          g.fillStyle = `rgb(${c},${c},${c + 8})`;
          g.fillRect(x + 3, j * rh + 3, 74, rh - 6);
          g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x + 3, j * rh + 3, 74, 4);
        }
      }
      grain(g, w, h, 2000, 0.12, r);
    });
  }
  // stone with moss (Bamboo Forest)
  function mossStone() {
    return tex('mossStone', 256, 256, (g, w, h) => {
      const r = U.seeded(8);
      g.fillStyle = '#56574e'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        const c = 70 + r() * 30;
        g.fillStyle = `rgb(${c},${c + 2},${c - 6})`;
        g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 30, 14 + r() * 20, r() * 3, 0, 7); g.fill();
      }
      for (let i = 0; i < 60; i++) {
        g.fillStyle = `rgba(${60 + r() * 40},${120 + r() * 60},${40 + r() * 20},${0.3 + r() * 0.4})`;
        g.beginPath(); g.ellipse(r() * w, r() * h * 0.5, 10 + r() * 30, 6 + r() * 14, 0, 0, 7); g.fill();
      }
      grain(g, w, h, 1500, 0.12, r);
    });
  }
  // shiny red wood with gold lines (the Pagoda)
  function redLacquer() {
    return tex('redLacquer', 256, 256, (g, w, h) => {
      const r = U.seeded(3);
      g.fillStyle = '#9a1c18'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#b8261e';
      for (let i = 0; i < 4; i++) g.fillRect(i * 64 + 6, 0, 52, h);
      g.fillStyle = '#e8b830'; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8);
      g.fillStyle = '#5a0e0a';
      for (let i = 0; i < 4; i++) g.fillRect(i * 64, 0, 6, h);
      // gold circles
      g.strokeStyle = '#e8b830'; g.lineWidth = 3;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * 64 + 32, h / 2, 14, 0, 7); g.stroke(); }
      grain(g, w, h, 800, 0.08, r);
    });
  }

  // ---------- ROOFS + FLOORS ----------
  function roofTiles(name, col, dark) {
    return tex(name, 256, 256, (g, w, h) => {
      const r = U.seeded(name.length);
      g.fillStyle = dark; g.fillRect(0, 0, w, h);
      const rows = 8, cols = 8, rh = h / rows, cw = w / cols;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const x = i * cw + ((j % 2) * cw) / 2, y = j * rh;
          const grad = g.createLinearGradient(x, 0, x + cw, 0);
          grad.addColorStop(0, dark); grad.addColorStop(0.5, col); grad.addColorStop(1, dark);
          g.fillStyle = grad;
          U.rrect(g, x + 1, y + 1, cw - 2, rh - 1, 8); g.fill();
          if (x + cw > w) { U.rrect(g, x - w + 1, y + 1, cw - 2, rh - 1, 8); g.fill(); }
        }
      }
      grain(g, w, h, 1000, 0.1, r);
    });
  }
  function stonePath() {
    return tex('stonePath', 256, 256, (g, w, h) => {
      const r = U.seeded(21);
      g.fillStyle = '#3c3a40'; g.fillRect(0, 0, w, h);
      for (let j = 0; j < 6; j++) {
        for (let i = 0; i < 6; i++) {
          const c = 95 + r() * 40;
          g.fillStyle = `rgb(${c},${c - 4},${c + 6})`;
          g.beginPath();
          g.ellipse(i * 44 + 22 + (r() - 0.5) * 8, j * 44 + 22 + (r() - 0.5) * 8, 18 + r() * 4, 16 + r() * 4, r() * 3, 0, 7);
          g.fill();
        }
      }
      // fallen pink petals
      for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,${150 + r() * 60},${190 + r() * 40},0.8)`; g.beginPath(); g.ellipse(r() * w, r() * h, 3, 2, r() * 3, 0, 7); g.fill(); }
      grain(g, w, h, 1200, 0.1, r);
    });
  }
  function grass() {
    return tex('grass', 256, 256, (g, w, h) => {
      const r = U.seeded(31);
      g.fillStyle = '#2e5a26'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2500; i++) {
        g.strokeStyle = `rgba(${40 + r() * 50},${100 + r() * 80},${30 + r() * 30},0.8)`;
        const x = r() * w, y = r() * h;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 4 - r() * 6); g.stroke();
      }
    });
  }
  function water() {
    return tex('water', 256, 256, (g, w, h) => {
      const r = U.seeded(41);
      const grad = g.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0c2a4a'); grad.addColorStop(1, '#123a5c');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 80; i++) {
        g.strokeStyle = `rgba(150,200,255,${0.1 + r() * 0.25})`; g.lineWidth = 2;
        const x = r() * w, y = r() * h, l = 10 + r() * 30;
        g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - 4, x + l, y); g.stroke();
      }
    });
  }

  // ---------- CATS ----------
  function furStripes(name, base, stripe) {
    return tex(name, 128, 128, (g, w, h) => {
      g.fillStyle = base; g.fillRect(0, 0, w, h);
      g.fillStyle = stripe;
      for (let i = 0; i < 6; i++) {
        g.beginPath();
        const x = i * 22 + 4;
        g.moveTo(x, 0); g.quadraticCurveTo(x + 10, h / 2, x, h); g.lineTo(x + 7, h); g.quadraticCurveTo(x + 17, h / 2, x + 7, 0);
        g.fill();
      }
    });
  }

  // ---------- SKY ----------
  function sky(name, top, mid, bottom) {
    const t = tex('sky_' + name, 16, 256, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, top); grad.addColorStop(0.55, mid); grad.addColorStop(1, bottom);
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }
  function moon() {
    return tex('moon', 256, 256, (g, w, h) => {
      const grad = g.createRadialGradient(128, 128, 30, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255,250,225,1)'); grad.addColorStop(0.42, 'rgba(255,245,215,1)');
      grad.addColorStop(0.46, 'rgba(255,240,200,0.35)'); grad.addColorStop(1, 'rgba(255,230,190,0)');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(200,190,160,0.35)';
      [[100, 110, 14], [150, 140, 10], [120, 160, 8], [148, 100, 6]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); });
    });
  }
  // a soft round glow (for lanterns)
  function glow() {
    return tex('glow', 128, 128, (g, w, h) => {
      const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.25, 'rgba(255,255,255,0.45)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    });
  }
  // a dark round blob shadow
  function blob() {
    return tex('blob', 64, 64, (g, w, h) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(0,0,0,0.75)'); grad.addColorStop(0.6, 'rgba(0,0,0,0.4)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    });
  }
  // a red warning ring on the floor
  function ring(name = 'ring', color = '255,40,30') {
    return tex(name, 128, 128, (g, w, h) => {
      g.strokeStyle = `rgba(${color},1)`; g.lineWidth = 8;
      g.beginPath(); g.arc(64, 64, 56, 0, 7); g.stroke();
      g.fillStyle = `rgba(${color},0.25)`; g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill();
    });
  }
  // speech bubbles over enemies: "!" "?" "zZ"
  function bubble(text, color) {
    return tex('bubble_' + text, 128, 128, (g, w, h) => {
      g.fillStyle = '#fff'; g.strokeStyle = '#222'; g.lineWidth = 6;
      g.beginPath(); g.arc(64, 56, 44, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(52, 96); g.lineTo(64, 122); g.lineTo(76, 96); g.closePath(); g.fill();
      g.fillStyle = color; g.font = 'bold 64px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, 64, 60);
    });
  }
  // a wooden hint sign with a "?"
  function signFace() {
    return tex('sign', 128, 96, (g, w, h) => {
      g.fillStyle = '#8a5a30'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#4a2a10'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8);
      g.fillStyle = '#ffe080'; g.font = 'bold 64px Arial Black, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('?', w / 2, h / 2 + 4);
    });
  }
  // the paper of a lantern
  function lanternPaper(name = 'lanternRed', col = '#e8402a') {
    return tex(name, 64, 64, (g, w, h) => {
      g.fillStyle = col; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let j = 0; j < 8; j++) g.fillRect(0, j * 8, w, 2);
      g.fillStyle = 'rgba(30,10,0,0.7)'; g.font = 'bold 30px serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('猫', w / 2, h / 2);
    });
  }

  return {
    shoji, planks, stoneBlocks, mossStone, redLacquer, roofTiles, stonePath, grass, water,
    furStripes, sky, moon, glow, blob, ring, bubble, signFace, lanternPaper,
  };
})();
