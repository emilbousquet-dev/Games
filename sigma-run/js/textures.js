// ============================================================
//  SIGMA RUN — TEXTURES
//  Every picture in the game is painted with code on a canvas:
//  building windows, rooftops, billboards, coins, smoke...
// ============================================================
window.SR = window.SR || {};

SR.Tex = (function () {
  const U = SR.U;
  const T = {};

  // random numbers that are always the same (so the textures look the same every time)
  function seeded(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function noiseFill(g, w, h, rnd, amount, alpha) {
    for (let i = 0; i < amount; i++) {
      const v = Math.floor(rnd() * 255);
      g.fillStyle = `rgba(${v},${v},${v},${alpha * rnd()})`;
      g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
    }
  }
  function stains(g, w, h, rnd, n, color) {
    for (let i = 0; i < n; i++) {
      const x = rnd() * w, y = rnd() * h, r = 10 + rnd() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  // ---------------- BUILDING FACADES ----------------
  // each picture is 16 m wide and 16 m tall: 4 floors, 6 windows per floor.
  // returns { map, emissive, rough } canvases
  function facade(style, seed) {
    const S = 512, rnd = seeded(seed);
    const floors = 4, cols = style === 'glass' ? 8 : 6;
    const fh = S / floors, cw = S / cols;
    const lit = [];
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) lit.push(rnd());
    const warm = ['#ffd27a', '#ffc35a', '#ffe3a8', '#fff1cf'], cool = ['#cfe8ff', '#a8d4ff', '#e8f4ff'];
    const pal = {
      brick: { wall: '#7a3b2a', win: '#1a2230', frame: '#c9b8a0', lights: warm, litP: 0.42 },
      concrete: { wall: '#8b8e93', win: '#1b2533', frame: '#5d6066', lights: warm.concat(cool), litP: 0.4 },
      glass: { wall: '#1a3a4f', win: '#24506b', frame: '#0c1820', lights: cool, litP: 0.35 },
      modern: { wall: '#23252d', win: '#121a26', frame: '#3a3d48', lights: cool.concat(['#ffd6f0']), litP: 0.38 },
      office: { wall: '#cfc6b2', win: '#2c4560', frame: '#e8e1d0', lights: warm, litP: 0.45 },
      tan: { wall: '#b08a62', win: '#1d2735', frame: '#e2d3b8', lights: warm, litP: 0.4 },
    }[style];

    const map = U.canvas(S, S, (g) => {
      g.fillStyle = pal.wall; g.fillRect(0, 0, S, S);
      if (style === 'brick') {
        for (let y = 0; y < S; y += 8) for (let x = (y / 8) % 2 ? -8 : 0; x < S; x += 16) {
          const v = 0.8 + rnd() * 0.35;
          g.fillStyle = `rgb(${122 * v | 0},${59 * v | 0},${42 * v | 0})`; g.fillRect(x + 1, y + 1, 14, 6);
        }
      }
      noiseFill(g, S, S, rnd, 5000, 0.12);
      stains(g, S, S, rnd, 10, 'rgba(0,0,0,0.12)');
      // floor lines
      g.fillStyle = 'rgba(0,0,0,0.25)';
      for (let f = 0; f < floors; f++) g.fillRect(0, f * fh, S, 4);
      for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
        const x = c * cw, y = f * fh;
        if (style === 'glass') {
          const gr = g.createLinearGradient(x, y, x + cw, y + fh);
          gr.addColorStop(0, '#3a7a9a'); gr.addColorStop(0.5, '#1d4660'); gr.addColorStop(1, '#2d6585');
          g.fillStyle = gr; g.fillRect(x + 2, y + 2, cw - 4, fh - 4);
          g.fillStyle = pal.frame; g.fillRect(x, y, 3, fh); g.fillRect(x, y + fh - 10, cw, 10);
        } else if (style === 'modern') {
          g.fillStyle = pal.win; g.fillRect(x + 6, y + 14, cw - 12, fh - 34);
          g.fillStyle = 'rgba(120,160,220,0.25)'; g.fillRect(x + 6, y + 14, cw - 12, 6);
        } else {
          const wx = x + cw * 0.18, wy = y + fh * 0.22, ww = cw * 0.64, wh = fh * 0.56;
          g.fillStyle = pal.frame; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 10);
          const gr = g.createLinearGradient(wx, wy, wx, wy + wh);
          gr.addColorStop(0, '#3d5570'); gr.addColorStop(1, pal.win);
          g.fillStyle = gr; g.fillRect(wx, wy, ww, wh);
          g.fillStyle = pal.frame; g.fillRect(wx + ww / 2 - 2, wy, 4, wh);
          // window sill shadow
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(wx - 4, wy + wh + 6, ww + 8, 4);
        }
      }
      if (style === 'modern') {
        // neon strips on the side of the building
        g.fillStyle = '#ff3aa8'; g.fillRect(S - 10, 0, 5, S);
      }
    });

    const emissive = U.canvas(S, S, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
      let i = 0;
      for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
        const on = lit[i++] < pal.litP;
        const x = c * cw, y = f * fh;
        if (!on) continue;
        const col = U.pick(pal.lights);
        g.fillStyle = col;
        let wx, wy, ww, wh;
        if (style === 'glass') { wx = x + 2; wy = y + 2; ww = cw - 4; wh = fh - 14; }
        else if (style === 'modern') { wx = x + 6; wy = y + 14; ww = cw - 12; wh = fh - 34; }
        else { wx = x + cw * 0.18; wy = y + fh * 0.22; ww = cw * 0.64; wh = fh * 0.56; }
        g.globalAlpha = 0.55 + rnd() * 0.45;
        g.fillRect(wx, wy, ww, wh);
        // curtains / people shapes
        g.fillStyle = 'rgba(0,0,0,0.5)';
        if (rnd() < 0.4) g.fillRect(wx, wy, ww * (0.2 + rnd() * 0.3), wh);
        if (rnd() < 0.3) g.fillRect(wx + ww * 0.6, wy + wh * 0.4, ww * 0.12, wh * 0.6);
        g.globalAlpha = 1;
        if (style !== 'brick' && style !== 'office' && style !== 'tan') { g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(wx + ww / 2 - 1, wy, 2, wh); }
      }
      if (style === 'modern') { g.fillStyle = '#ff3aa8'; g.fillRect(S - 10, 0, 5, S); }
    });

    // roughness: shiny windows, rough walls (green channel is used)
    const rough = U.canvas(S, S, (g) => {
      g.fillStyle = style === 'glass' ? '#333' : '#ddd'; g.fillRect(0, 0, S, S);
      g.fillStyle = '#1a1a1a';
      for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
        const x = c * cw, y = f * fh;
        if (style === 'glass') g.fillRect(x + 2, y + 2, cw - 4, fh - 4);
        else if (style === 'modern') g.fillRect(x + 6, y + 14, cw - 12, fh - 34);
        else g.fillRect(x + cw * 0.18, y + fh * 0.22, cw * 0.64, fh * 0.56);
      }
    });
    return { map, emissive, rough };
  }

  // ---------------- ROOFTOP (tar + gravel), 8 m per tile ----------------
  function roof(seed, base) {
    const S = 512, rnd = seeded(seed);
    const c = U.canvas(S, S, (g) => {
      g.fillStyle = base; g.fillRect(0, 0, S, S);
      noiseFill(g, S, S, rnd, 26000, 0.35);
      stains(g, S, S, rnd, 14, 'rgba(0,0,0,0.18)');
      stains(g, S, S, rnd, 6, 'rgba(255,255,255,0.06)');
      // tar seams
      g.strokeStyle = 'rgba(10,10,10,0.55)'; g.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        g.beginPath(); const y = i * 128 + rnd() * 20; g.moveTo(0, y);
        for (let x = 0; x <= S; x += 32) g.lineTo(x, y + (rnd() - 0.5) * 6);
        g.stroke();
      }
      // painted seam patches
      g.fillStyle = 'rgba(30,30,32,0.5)';
      for (let i = 0; i < 6; i++) g.fillRect(rnd() * S, rnd() * S, 30 + rnd() * 60, 10 + rnd() * 30);
    });
    return c;
  }

  // ---------------- small things ----------------
  function metalPanel() {
    const rnd = seeded(77);
    return U.canvas(256, 256, (g) => {
      g.fillStyle = '#9aa0a6'; g.fillRect(0, 0, 256, 256);
      noiseFill(g, 256, 256, rnd, 3000, 0.15);
      for (let y = 18; y < 240; y += 14) {
        g.fillStyle = '#5c6268'; g.fillRect(14, y, 228, 6);
        g.fillStyle = '#c4c9ce'; g.fillRect(14, y + 6, 228, 2);
      }
      g.strokeStyle = '#6a7076'; g.lineWidth = 4; g.strokeRect(3, 3, 250, 250);
      stains(g, 256, 256, rnd, 5, 'rgba(110,70,30,0.2)');
    });
  }
  function fanTop() {
    return U.canvas(256, 256, (g) => {
      g.fillStyle = '#7d8389'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#1d2024'; g.beginPath(); g.arc(128, 128, 100, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#9aa0a6'; g.lineWidth = 3;
      for (let r = 20; r <= 100; r += 16) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
      for (let a = 0; a < 8; a++) { g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a * 0.785) * 100, 128 + Math.sin(a * 0.785) * 100); g.stroke(); }
      g.fillStyle = '#c4c9ce'; g.beginPath(); g.arc(128, 128, 14, 0, Math.PI * 2); g.fill();
    });
  }
  function door() {
    return U.canvas(256, 256, (g) => {
      g.fillStyle = '#6d7480'; g.fillRect(0, 0, 256, 256);
      noiseFill(g, 256, 256, seeded(5), 2000, 0.12);
      g.fillStyle = '#3f6e8c'; g.fillRect(80, 60, 96, 196);
      g.fillStyle = '#2b4f66'; g.fillRect(88, 70, 80, 60);
      g.fillStyle = '#d8d8d8'; g.fillRect(160, 160, 10, 6);
      g.fillStyle = '#ffcc00'; g.font = 'bold 18px Arial'; g.textAlign = 'center'; g.fillText('ROOF', 128, 50);
    });
  }
  function hazard() {
    return U.canvas(128, 128, (g) => {
      g.fillStyle = '#ffcc00'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#151515';
      for (let i = -128; i < 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 + 128, 128); g.lineTo(i + 128, 128); g.fill(); }
    });
  }
  function road() {
    const rnd = seeded(31);
    return U.canvas(512, 512, (g) => {
      g.fillStyle = '#2a2b2e'; g.fillRect(0, 0, 512, 512);
      noiseFill(g, 512, 512, rnd, 20000, 0.25);
      stains(g, 512, 512, rnd, 10, 'rgba(0,0,0,0.25)');
    });
  }
  function wood() {
    const rnd = seeded(12);
    return U.canvas(256, 256, (g) => {
      g.fillStyle = '#6b4a2f'; g.fillRect(0, 0, 256, 256);
      for (let x = 0; x < 256; x += 21) {
        const v = 0.75 + rnd() * 0.35;
        g.fillStyle = `rgb(${107 * v | 0},${74 * v | 0},${47 * v | 0})`; g.fillRect(x, 0, 19, 256);
        g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x + 19, 0, 2, 256);
      }
      noiseFill(g, 256, 256, rnd, 3000, 0.15);
      g.fillStyle = '#2e2e2e'; g.fillRect(0, 60, 256, 8); g.fillRect(0, 190, 256, 8);
    });
  }

  // ---------------- BILLBOARDS (funny made-up ads) ----------------
  const ADS = [
    { bg: ['#ff3aa8', '#7a1cff'], big: 'AURA COLA', small: '+1000 AURA IN EVERY SIP', icon: 'cola' },
    { bg: ['#101010', '#3a3a3a'], big: 'SIGMA GYM', small: 'NEVER BACK DOWN', icon: 'jaw', fg: '#ffd21a' },
    { bg: ['#ff8a00', '#ff2a3a'], big: 'RIZZ PIZZA', small: 'HOT. FAST. LEGENDARY.', icon: 'pizza' },
    { bg: ['#00c6ff', '#0040ff'], big: 'SKYWAY', small: 'FLY HIGHER THAN EVER', icon: 'plane' },
    { bg: ['#14ff8a', '#007a5a'], big: 'MEGA BURGER', small: 'NOW 300% MORE MEGA', icon: 'burger' },
    { bg: ['#ffd21a', '#ff8a00'], big: 'GOLD RUSH', small: 'COLLECT THEM ALL', icon: 'coin' },
    { bg: ['#1a1a40', '#5a1aff'], big: 'NEON NIGHTS', small: 'THE CITY NEVER SLEEPS', icon: 'moon' },
    { bg: ['#ff2a3a', '#600010'], big: 'WANTED', small: 'HAVE YOU SEEN THIS RUNNER?', icon: 'wanted' },
  ];
  function adCanvas(ad, w = 512, h = 256) {
    return U.canvas(w, h, (g) => {
      const gr = g.createLinearGradient(0, 0, w, h);
      gr.addColorStop(0, ad.bg[0]); gr.addColorStop(1, ad.bg[1]);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      // shiny stripes
      g.fillStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(i * 120 - 40, 0); g.lineTo(i * 120 + 20, 0); g.lineTo(i * 120 - 80, h); g.lineTo(i * 120 - 140, h); g.fill(); }
      const fg = ad.fg || '#ffffff';
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.font = `900 ${h * 0.3}px Impact, Arial Black, sans-serif`;
      g.fillText(ad.big, w * 0.36 + 5, h * 0.42 + 5);
      g.fillStyle = fg; g.fillText(ad.big, w * 0.36, h * 0.42, w * 0.6);
      g.font = `bold ${h * 0.085}px Arial, sans-serif`;
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillText(ad.small, w * 0.36, h * 0.7, w * 0.6);
      // icon on the left
      const cx = w * 0.18, cy = h * 0.5, r = h * 0.32;
      g.save(); g.translate(cx, cy);
      switch (ad.icon) {
        case 'cola':
          g.fillStyle = '#fff'; U.rrect(g, -r * 0.4, -r, r * 0.8, r * 2, r * 0.25); g.fill();
          g.fillStyle = '#e0006a'; g.fillRect(-r * 0.4, -r * 0.3, r * 0.8, r * 0.6);
          g.fillStyle = '#fff'; g.font = `bold ${r * 0.35}px Arial`; g.textAlign = 'center'; g.fillText('AURA', 0, 0); break;
        case 'jaw':
          g.fillStyle = '#ffd21a'; g.beginPath(); g.moveTo(-r * 0.7, -r); g.lineTo(r * 0.7, -r); g.lineTo(r * 0.75, r * 0.2); g.lineTo(r * 0.35, r); g.lineTo(-r * 0.35, r); g.lineTo(-r * 0.75, r * 0.2); g.fill();
          g.fillStyle = '#101010'; g.fillRect(-r * 0.55, -r * 0.35, r * 0.4, r * 0.14); g.fillRect(r * 0.15, -r * 0.35, r * 0.4, r * 0.14);
          g.fillRect(-r * 0.3, r * 0.45, r * 0.6, r * 0.08); break;
        case 'pizza':
          g.fillStyle = '#ffcc55'; g.beginPath(); g.moveTo(0, -r); g.lineTo(r * 0.9, r * 0.8); g.lineTo(-r * 0.9, r * 0.8); g.fill();
          g.fillStyle = '#c0392b'; for (const [x, y] of [[0, -0.2], [-0.35, 0.4], [0.35, 0.45], [0, 0.5]]) { g.beginPath(); g.arc(x * r, y * r, r * 0.15, 0, 7); g.fill(); } break;
        case 'plane':
          g.fillStyle = '#fff'; g.rotate(-0.5); g.fillRect(-r, -r * 0.12, r * 2, r * 0.24);
          g.beginPath(); g.moveTo(-r * 0.2, 0); g.lineTo(r * 0.2, 0); g.lineTo(-r * 0.3, r * 0.9); g.lineTo(-r * 0.5, r * 0.9); g.fill();
          g.beginPath(); g.moveTo(-r * 0.2, 0); g.lineTo(r * 0.2, 0); g.lineTo(-r * 0.3, -r * 0.9); g.lineTo(-r * 0.5, -r * 0.9); g.fill(); break;
        case 'burger':
          g.fillStyle = '#f4a742'; g.beginPath(); g.arc(0, -r * 0.1, r * 0.8, Math.PI, 0); g.fill();
          g.fillStyle = '#5a2d0c'; g.fillRect(-r * 0.85, 0, r * 1.7, r * 0.28);
          g.fillStyle = '#7dd35a'; g.fillRect(-r * 0.9, -r * 0.08, r * 1.8, r * 0.12);
          g.fillStyle = '#f4a742'; U.rrect(g, -r * 0.8, r * 0.3, r * 1.6, r * 0.3, r * 0.12); g.fill(); break;
        case 'coin':
          g.fillStyle = '#ffe066'; g.beginPath(); g.arc(0, 0, r * 0.85, 0, 7); g.fill();
          g.strokeStyle = '#b8860b'; g.lineWidth = r * 0.1; g.stroke();
          g.fillStyle = '#b8860b'; g.font = `900 ${r}px Impact`; g.textAlign = 'center'; g.fillText('$', 0, r * 0.05); break;
        case 'moon':
          g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(0, 0, r * 0.8, 0, 7); g.fill();
          g.fillStyle = ad.bg[0]; g.beginPath(); g.arc(r * 0.35, -r * 0.2, r * 0.7, 0, 7); g.fill(); break;
        case 'wanted':
          g.fillStyle = '#f5deb3'; g.fillRect(-r * 0.75, -r, r * 1.5, r * 2);
          g.fillStyle = '#222'; g.beginPath(); g.arc(0, -r * 0.15, r * 0.4, 0, 7); g.fill();
          g.fillRect(-r * 0.5, r * 0.25, r, r * 0.55);
          g.fillStyle = '#111'; g.fillRect(-r * 0.32, -r * 0.25, r * 0.64, r * 0.14); // sunglasses B)
          break;
      }
      g.restore();
      // frame lights
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    });
  }

  // a sign with glowing neon letters (black background, so it glows in the dark)
  function neonText(text, color, w = 512, h = 128) {
    return U.canvas(w, h, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.font = `900 ${h * 0.62}px Impact, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = color; g.shadowBlur = 18; g.fillStyle = color;
      g.fillText(text, w / 2, h / 2, w * 0.92);
      g.shadowBlur = 0; g.fillStyle = '#fff'; g.globalAlpha = 0.6; g.fillText(text, w / 2, h / 2, w * 0.92);
    });
  }

  // ---------------- particles ----------------
  function glow() {
    return U.canvas(128, 128, (g) => {
      const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)');
      gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
  }
  function smoke() {
    const rnd = seeded(99);
    return U.canvas(128, 128, (g) => {
      for (let i = 0; i < 26; i++) {
        const x = 64 + (rnd() - 0.5) * 50, y = 64 + (rnd() - 0.5) * 50, r = 14 + rnd() * 26;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      }
      // fade the edges so it's round
      g.globalCompositeOperation = 'destination-in';
      const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    });
  }
  function coinFace() {
    return U.canvas(256, 256, (g) => {
      const gr = g.createRadialGradient(100, 90, 10, 128, 128, 128);
      gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#ffcf3a'); gr.addColorStop(1, '#c98a00');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#a86f00'; g.lineWidth = 12; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.stroke();
      g.font = '900 150px Impact, Arial Black'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#a86f00'; g.fillText('Σ', 132, 138);
      g.fillStyle = '#fff1a8'; g.fillText('Σ', 126, 132);
    });
  }
  // letters for the helicopter and the agents' jackets
  function letters(text, color, bg = 'rgba(0,0,0,0)', w = 256, h = 128) {
    return U.canvas(w, h, (g) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.font = `900 ${h * 0.75}px Impact, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = color; g.fillText(text, w / 2, h / 2 + 4, w * 0.9);
    });
  }
  // the ring that shows where a missile will land
  function targetRing() {
    return U.canvas(256, 256, (g) => {
      g.strokeStyle = '#ff2030'; g.lineWidth = 14;
      g.beginPath(); g.arc(128, 128, 110, 0, 7); g.stroke();
      g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 60, 0, 7); g.stroke();
      g.fillStyle = '#ff2030';
      for (let a = 0; a < 4; a++) { g.save(); g.translate(128, 128); g.rotate(a * Math.PI / 2); g.fillRect(-5, -126, 10, 40); g.restore(); }
      g.beginPath(); g.arc(128, 128, 12, 0, 7); g.fill();
    });
  }
  function beam() {
    // soft vertical light beam (for power-ups and spotlights)
    return U.canvas(64, 256, (g) => {
      const gr = g.createLinearGradient(0, 0, 64, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 256);
      g.globalCompositeOperation = 'destination-in';
      const gv = g.createLinearGradient(0, 0, 0, 256);
      gv.addColorStop(0, 'rgba(0,0,0,0)'); gv.addColorStop(0.7, 'rgba(0,0,0,0.6)'); gv.addColorStop(1, 'rgba(0,0,0,1)');
      g.fillStyle = gv; g.fillRect(0, 0, 64, 256);
    });
  }
  function glassPanel() {
    return U.canvas(256, 256, (g) => {
      g.fillStyle = 'rgba(160,220,255,0.25)'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 6;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(30 + i * 40, 10); g.lineTo(10 + i * 40, 90); g.stroke(); }
      g.strokeStyle = 'rgba(40,60,80,0.9)'; g.lineWidth = 10; g.strokeRect(0, 0, 256, 256);
    });
  }

  function init(renderer) {
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const tx = (c, srgb = true) => { const t = U.tex(c, 0, srgb); t.anisotropy = aniso; return t; };
    T.facades = {};
    let seed = 1;
    for (const style of ['brick', 'concrete', 'glass', 'modern', 'office', 'tan']) {
      T.facades[style] = [];
      for (let v = 0; v < 2; v++) {
        const f = facade(style, seed++ * 977);
        T.facades[style].push({ map: tx(f.map), emissive: tx(f.emissive), rough: tx(f.rough, false) });
      }
    }
    T.roofs = [tx(roof(3, '#4a4a4e')), tx(roof(8, '#5b5650')), tx(roof(13, '#3d4148'))];
    T.roofBump = tx(roof(3, '#808080'), false);
    T.metal = tx(metalPanel());
    T.fan = tx(fanTop());
    T.door = tx(door());
    T.hazard = tx(hazard());
    T.road = tx(road());
    T.wood = tx(wood());
    T.ads = ADS.map((ad) => tx(adCanvas(ad)));
    T.adsTall = ADS.map((ad) => tx(adCanvas(ad, 1024, 256)));
    T.glow = tx(glow());
    T.smoke = tx(smoke());
    T.coin = tx(coinFace());
    T.fbi = tx(letters('FBI', '#ffd21a'));
    T.fbiWhite = tx(letters('FBI', '#ffffff'));
    T.target = tx(targetRing());
    T.beam = tx(beam());
    T.glass = tx(glassPanel());
    T.neon = {
      sigma: tx(neonText('SIGMA', '#ffd21a')), rizz: tx(neonText('RIZZ', '#ff3aa8')), open: tx(neonText('OPEN 24/7', '#3af0ff')),
      hotel: tx(neonText('HOTEL', '#ff3a3a')), aura: tx(neonText('AURA', '#a05aff')), ramen: tx(neonText('RAMEN', '#ff8a00')),
      jump: tx(neonText('JUMP!', '#3aff8a')), slide: tx(neonText('SLIDE!', '#3af0ff')), wallrun: tx(neonText('WALL RUN →', '#ffd21a')),
      wallrunL: tx(neonText('← WALL RUN', '#ffd21a')),
    };
    return T;
  }

  return { init, T, adCanvas, ADS };
})();
