// ============================================================
//  LIL' PLUT ODYSSEY — THE WORLDS 🎨
//  Every world has its own colors, a sky, 3 background layers
//  that move slower than you (parallax), a foreground layer
//  that moves faster, and its own ground. All painted with code!
// ============================================================
window.LP = window.LP || {};

// ---------- the colors of each world (try changing them!) ----------
LP.THEMES = {
  house: {
    name: 'The House',
    sky: ['#251d4a', '#3d2f68', '#5a4380'],
    body: '#93593a', bodyDark: '#4a2618', edge: '#3a1c12',
    top: '#4fb4c8', top2: '#7fd8e6', topDark: '#2b7f94',
    thin: '#b9824f', thinDark: '#6d4325',
    water: '#5fb8ff', dust: '#e9dcff',
    far: '#4a3a78', mid: '#33285c', near: '#231a44', fg: '#0f0a22',
    ambient: 'motes', glow: '#ffcf7a',
    fog: 'rgba(120,90,190,0.10)',
    music: 'house',
  },
  garden: {
    name: 'The Garden',
    sky: ['#3aa6f0', '#86d4ff', '#d6f6ff'],
    body: '#7b4a2b', bodyDark: '#3d2112', edge: '#2e180c',
    top: '#5ccf48', top2: '#a6f06a', topDark: '#2f8f2c',
    thin: '#c58d55', thinDark: '#7a4d27',
    water: '#46b6e8', dust: '#f3ead2',
    far: '#86cfa0', mid: '#4fa65e', near: '#2f7d3c', fg: '#123d1c',
    ambient: 'pollen', glow: '#fff3b0',
    fog: 'rgba(255,255,255,0.10)',
    music: 'garden',
  },
  park: {
    name: 'The Park & Pond',
    sky: ['#3f347e', '#ff7f6a', '#ffcf73'],
    body: '#6c5a78', bodyDark: '#33263f', edge: '#271c30',
    top: '#97d05a', top2: '#d4f27a', topDark: '#5a8f34',
    thin: '#a8744a', thinDark: '#5e3c24',
    water: '#3b8fc0', dust: '#ffe2c8',
    far: '#9a5f98', mid: '#6a3f78', near: '#41264f', fg: '#1d0f26',
    ambient: 'fireflies', glow: '#ffb46a',
    fog: 'rgba(255,150,120,0.10)',
    music: 'park',
  },
  city: {
    name: 'The City Rooftops',
    sky: ['#050822', '#14164a', '#33246a'],
    body: '#7d3a35', bodyDark: '#341416', edge: '#250d0f',
    top: '#5c6278', top2: '#9aa2bd', topDark: '#33384a',
    thin: '#8a93a8', thinDark: '#40465a',
    water: '#4a6fd0', dust: '#c9c8e8',
    far: '#1d1e4c', mid: '#272862', near: '#14143a', fg: '#06061a',
    ambient: 'snow', glow: '#ffe28a',
    fog: 'rgba(110,90,200,0.12)',
    music: 'city',
  },
};

LP.BG = (function () {
  const U = LP.U, T = LP.T, VH = LP.VH;
  const LW = 2400;            // how wide one background layer is before it repeats
  const LH = 1000;            // how tall a layer is (taller than the screen so it can move up and down)
  const TOPPAD = LH - VH;     // extra room above the screen

  let theme = null, themeKey = '', layers = [], ambient = [], rs = 1;

  // a wavy line that repeats perfectly every LW pixels
  function wave(x, seed, amps) {
    let y = 0;
    amps.forEach((a, i) => { y += Math.sin((x / LW) * Math.PI * 2 * a[0] + seed * (i + 1) * 1.7) * a[1]; });
    return y;
  }
  function hills(c, baseY, amps, seed, color) {
    c.fillStyle = color;
    c.beginPath(); c.moveTo(0, LH);
    for (let x = 0; x <= LW; x += 12) c.lineTo(x, baseY + wave(x, seed, amps));
    c.lineTo(LW, LH); c.closePath(); c.fill();
  }
  // draw something 3 times so it repeats nicely at the edges of the layer
  function wrap(x, w, fn) { fn(x); if (x + w > LW) fn(x - LW); if (x - w < 0) fn(x + LW); }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }

  // =============== the layers of each world ===============
  // y in these functions: 0 = top of the layer, LH = bottom. The screen bottom is at LH.
  const BUILD = {
    house: {
      far(c, rnd) {
        const th = theme;
        // wallpaper with stripes
        c.fillStyle = th.far; c.fillRect(0, 0, LW, LH);
        for (let x = 0; x < LW; x += 60) { c.fillStyle = 'rgba(255,255,255,0.035)'; c.fillRect(x, 0, 30, LH); }
        // little stars on the wallpaper
        c.fillStyle = 'rgba(255,230,180,0.08)';
        for (let i = 0; i < 160; i++) { LP.Art.starShape(c, rnd() * LW, rnd() * (LH - 200), 6, 2.6, 5); c.fill(); }
        // wooden panel at the bottom
        c.fillStyle = '#3a2b5e'; c.fillRect(0, LH - 230, LW, 230);
        c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, LH - 236, LW, 8);
        for (let x = 30; x < LW; x += 150) { c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 4; c.strokeRect(x, LH - 200, 110, 150); }
        // windows with the moon outside
        for (let i = 0; i < 3; i++) {
          const wx = 220 + i * 800, wy = LH - 640;
          c.fillStyle = '#2a1f45'; roundRect(c, wx - 18, wy - 18, 276, 356, 14); c.fill();
          const g = c.createLinearGradient(0, wy, 0, wy + 320);
          g.addColorStop(0, '#0d1240'); g.addColorStop(1, '#3a3f8a');
          c.fillStyle = g; c.fillRect(wx, wy, 240, 320);
          // stars
          c.fillStyle = '#fff';
          for (let s = 0; s < 18; s++) { c.globalAlpha = 0.4 + rnd() * 0.6; c.fillRect(wx + rnd() * 240, wy + rnd() * 300, 2, 2); }
          c.globalAlpha = 1;
          if (i === 1) {
            c.shadowColor = '#fff7c0'; c.shadowBlur = 40;
            c.fillStyle = '#fff4c2'; c.beginPath(); c.arc(wx + 160, wy + 90, 42, 0, Math.PI * 2); c.fill();
            c.shadowBlur = 0;
            c.fillStyle = '#e8dca0'; c.beginPath(); c.arc(wx + 148, wy + 80, 8, 0, Math.PI * 2); c.arc(wx + 172, wy + 104, 6, 0, Math.PI * 2); c.fill();
          }
          // window frame cross
          c.fillStyle = '#e9e1f5'; c.fillRect(wx + 114, wy, 12, 320); c.fillRect(wx, wy + 154, 240, 12);
          c.strokeStyle = '#e9e1f5'; c.lineWidth = 12; c.strokeRect(wx, wy, 240, 320);
          // curtains
          for (const side of [-1, 1]) {
            const cx = side < 0 ? wx - 30 : wx + 270;
            c.fillStyle = '#c45a8a';
            c.beginPath(); c.moveTo(cx - 34, wy - 40);
            c.quadraticCurveTo(cx + side * -10, wy + 160, cx - 20 * side, wy + 360);
            c.lineTo(cx + 34 * side * -1 + (side > 0 ? 40 : -40) * 0, wy + 360);
            c.quadraticCurveTo(cx + 40 * side, wy + 160, cx + 34, wy - 40); c.closePath(); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(cx - 6, wy - 40, 8, 400);
          }
          c.fillStyle = '#7a4a2a'; c.fillRect(wx - 70, wy - 50, 380, 14);
        }
        // picture frames
        for (let i = 0; i < 3; i++) {
          const px = 620 + i * 800, py = LH - 560 + (i % 2) * 40;
          c.fillStyle = '#d9a64a'; c.fillRect(px, py, 120, 100);
          c.fillStyle = ['#7ac0ff', '#ffb0c8', '#b0f0a0'][i]; c.fillRect(px + 10, py + 10, 100, 80);
          c.fillStyle = '#fff'; c.beginPath(); c.arc(px + 60, py + 58, 18, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#ffd2b0'; c.beginPath(); c.arc(px + 60, py + 46, 14, 0, Math.PI * 2); c.fill();
        }
      },
      mid(c, rnd) {
        const col = theme.mid;
        for (let i = 0; i < 4; i++) {
          const x = i * 600 + rnd() * 120;
          const kind = i % 4;
          wrap(x, 420, (x) => {
            c.fillStyle = col;
            if (kind === 0) {
              // giant bookshelf
              roundRect(c, x, LH - 620, 300, 620, 8); c.fill();
              for (let s = 0; s < 4; s++) {
                const sy = LH - 590 + s * 140;
                c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 16, sy, 268, 110);
                let bx = x + 22;
                while (bx < x + 270) {
                  const bw = 14 + rnd() * 18, bh = 60 + rnd() * 46;
                  c.fillStyle = U.mix(col, ['#ff6a8a', '#6ac8ff', '#ffd25a', '#8af07a'][Math.floor(rnd() * 4)], 0.22);
                  c.fillRect(bx, sy + 110 - bh, bw - 3, bh); bx += bw;
                }
              }
            } else if (kind === 1) {
              // armchair
              roundRect(c, x, LH - 300, 340, 220, 50); c.fill();
              roundRect(c, x - 30, LH - 240, 90, 200, 40); c.fill();
              roundRect(c, x + 280, LH - 240, 90, 200, 40); c.fill();
              c.fillRect(x + 10, LH - 60, 24, 60); c.fillRect(x + 306, LH - 60, 24, 60);
            } else if (kind === 2) {
              // table with a lamp
              c.fillRect(x, LH - 330, 300, 26);
              c.fillRect(x + 20, LH - 304, 20, 304); c.fillRect(x + 260, LH - 304, 20, 304);
              c.fillRect(x + 140, LH - 440, 12, 110);
              c.beginPath(); c.moveTo(x + 100, LH - 440); c.lineTo(x + 192, LH - 440); c.lineTo(x + 170, LH - 510); c.lineTo(x + 122, LH - 510); c.fill();
              lampGlow(c, x + 146, LH - 430, 220);
            } else {
              // chest of drawers
              roundRect(c, x, LH - 360, 280, 360, 10); c.fill();
              for (let d = 0; d < 3; d++) {
                c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(x + 16, LH - 340 + d * 110, 248, 92);
                c.fillStyle = 'rgba(255,220,150,0.25)'; c.beginPath(); c.arc(x + 140, LH - 294 + d * 110, 8, 0, Math.PI * 2); c.fill();
              }
            }
          });
        }
      },
      near(c, rnd) {
        const col = theme.near;
        for (let i = 0; i < 7; i++) {
          const x = i * (LW / 7) + rnd() * 140;
          const kind = i % 4;
          wrap(x, 260, (x) => {
            c.fillStyle = col;
            if (kind === 0) {
              // stacked toy blocks
              const n = 2 + Math.floor(rnd() * 3);
              for (let b = 0; b < n; b++) { roundRect(c, x + (b % 2) * 18, LH - 90 - b * 84, 84, 84, 8); c.fill(); }
            } else if (kind === 1) {
              // rocking horse
              c.beginPath(); c.ellipse(x + 90, LH - 150, 80, 38, 0, 0, Math.PI * 2); c.fill();
              c.beginPath(); c.ellipse(x + 170, LH - 210, 30, 50, 0.4, 0, Math.PI * 2); c.fill();
              c.fillRect(x + 30, LH - 130, 16, 80); c.fillRect(x + 134, LH - 130, 16, 80);
              c.lineWidth = 14; c.strokeStyle = col;
              c.beginPath(); c.arc(x + 90, LH - 160, 130, 0.35 * Math.PI, 0.65 * Math.PI); c.stroke();
            } else if (kind === 2) {
              // a big ball
              c.beginPath(); c.arc(x + 70, LH - 70, 70, 0, Math.PI * 2); c.fill();
            } else {
              // teddy bear sitting
              c.beginPath(); c.arc(x + 70, LH - 70, 62, 0, Math.PI * 2); c.fill();
              c.beginPath(); c.arc(x + 70, LH - 170, 48, 0, Math.PI * 2); c.fill();
              c.beginPath(); c.arc(x + 32, LH - 210, 20, 0, Math.PI * 2); c.arc(x + 108, LH - 210, 20, 0, Math.PI * 2); c.fill();
            }
          });
        }
      },
      fg(c, rnd) {
        c.fillStyle = theme.fg;
        for (let i = 0; i < 3; i++) {
          const x = 300 + i * 800 + rnd() * 200;
          // toy mobile hanging from the ceiling
          const t = TOPPAD, mx = x + 300;
          c.fillRect(mx, 0, 5, t + 50);
          c.fillRect(mx - 100, t + 50, 206, 7);
          for (const k of [-100, 0, 100]) { c.fillRect(mx + k, t + 50, 3, 50 + (k + 100) / 5); LP.Art.starShape(c, mx + k + 2, t + 120 + (k + 100) / 5, 24, 10, 5); c.fill(); }
          // block at the bottom
        }
      },
    },

    garden: {
      far(c, rnd) {
        hills(c, LH - 330, [[2, 50], [5, 20], [9, 8]], 1, '#a6dcb8');
        hills(c, LH - 260, [[3, 40], [7, 16]], 2, theme.far);
        // far away trees
        for (let i = 0; i < 26; i++) {
          const x = rnd() * LW, y = LH - 250 + wave(x, 2, [[3, 40], [7, 16]]);
          wrap(x, 40, (x) => {
            c.fillStyle = '#6fbf88';
            c.beginPath(); c.arc(x, y - 30, 26 + rnd() * 12, 0, Math.PI * 2); c.arc(x + 18, y - 16, 20, 0, Math.PI * 2); c.fill();
          });
        }
        // the house far away
        const hx = 1500;
        c.fillStyle = '#b8d8e8'; c.fillRect(hx, LH - 470, 260, 200);
        c.fillStyle = '#a0a8d0'; c.beginPath(); c.moveTo(hx - 30, LH - 470); c.lineTo(hx + 130, LH - 590); c.lineTo(hx + 290, LH - 470); c.fill();
        c.fillStyle = '#ffe9a0'; c.fillRect(hx + 40, LH - 430, 50, 50); c.fillRect(hx + 170, LH - 430, 50, 50);
      },
      mid(c, rnd) {
        // a wooden fence
        const fy = LH - 260;
        c.fillStyle = '#d9b48a'; c.fillRect(0, fy + 40, LW, 18); c.fillRect(0, fy + 120, LW, 18);
        for (let x = 0; x < LW; x += 48) {
          c.fillStyle = '#e8c79c';
          c.beginPath(); c.moveTo(x + 6, LH); c.lineTo(x + 6, fy + 10); c.lineTo(x + 22, fy - 8); c.lineTo(x + 38, fy + 10); c.lineTo(x + 38, LH); c.fill();
          c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(x + 30, fy + 6, 8, LH - fy);
        }
        // bushes
        for (let i = 0; i < 9; i++) {
          const x = rnd() * LW, r = 50 + rnd() * 40;
          wrap(x, 140, (x) => {
            c.fillStyle = theme.mid;
            for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + k * r * 0.45, LH - r * 0.6 - Math.sin(k) * 20, r * (0.7 + 0.3 * Math.sin(k * 2)), 0, Math.PI * 2); c.fill(); }
          });
        }
        // sunflowers
        for (let i = 0; i < 6; i++) {
          const x = 120 + i * 400 + rnd() * 100, top = LH - 420 - rnd() * 120;
          wrap(x, 80, (x) => {
            c.strokeStyle = '#3f9a45'; c.lineWidth = 10;
            c.beginPath(); c.moveTo(x, LH); c.quadraticCurveTo(x + 20, (LH + top) / 2, x, top); c.stroke();
            c.fillStyle = '#3f9a45'; c.beginPath(); c.ellipse(x + 26, (LH + top) / 2, 30, 12, -0.5, 0, Math.PI * 2); c.fill();
            c.fillStyle = '#ffd23a';
            for (let p = 0; p < 14; p++) { const a = (p / 14) * Math.PI * 2; c.beginPath(); c.ellipse(x + Math.cos(a) * 34, top + Math.sin(a) * 34, 20, 9, a, 0, Math.PI * 2); c.fill(); }
            c.fillStyle = '#7a4a1e'; c.beginPath(); c.arc(x, top, 26, 0, Math.PI * 2); c.fill();
          });
        }
      },
      near(c, rnd) {
        // giant grass and flowers
        for (let i = 0; i < 70; i++) {
          const x = rnd() * LW, hgt = 100 + rnd() * 220, lean = (rnd() - 0.5) * 80;
          wrap(x, 60, (x) => {
            c.fillStyle = U.mix(theme.near, '#1e5a28', rnd() * 0.5);
            c.beginPath(); c.moveTo(x - 12, LH); c.quadraticCurveTo(x + lean * 0.3, LH - hgt * 0.6, x + lean, LH - hgt); c.quadraticCurveTo(x + lean * 0.3 + 8, LH - hgt * 0.5, x + 12, LH); c.fill();
          });
        }
        for (let i = 0; i < 10; i++) {
          const x = rnd() * LW, top = LH - 180 - rnd() * 160;
          const col = U.pick(['#ff5f7a', '#ff9a3c', '#c77dff', '#ff6ad5']);
          wrap(x, 50, (x) => {
            c.strokeStyle = theme.near; c.lineWidth = 8; c.beginPath(); c.moveTo(x, LH); c.lineTo(x, top); c.stroke();
            c.fillStyle = U.mix(col, theme.near, 0.35);
            c.beginPath(); c.moveTo(x - 30, top - 10); c.lineTo(x - 30, top - 50); c.lineTo(x - 12, top - 32); c.lineTo(x, top - 56); c.lineTo(x + 12, top - 32); c.lineTo(x + 30, top - 50); c.lineTo(x + 30, top - 10); c.quadraticCurveTo(x, top + 18, x - 30, top - 10); c.fill();
          });
        }
        // mushrooms
        for (let i = 0; i < 5; i++) {
          const x = rnd() * LW;
          wrap(x, 60, (x) => {
            c.fillStyle = '#ead9c0'; c.fillRect(x - 12, LH - 70, 24, 70);
            c.fillStyle = U.mix('#e2453a', theme.near, 0.3); c.beginPath(); c.ellipse(x, LH - 70, 50, 36, 0, Math.PI, 0); c.fill();
            c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(x - 18, LH - 86, 7, 0, Math.PI * 2); c.arc(x + 14, LH - 94, 9, 0, Math.PI * 2); c.fill();
          });
        }
      },
      fg(c, rnd) {
        c.fillStyle = theme.fg;
        for (let i = 0; i < 40; i++) {
          const x = rnd() * LW, hgt = 90 + rnd() * 170, lean = (rnd() - 0.5) * 140;
          if ((x % 1200) > 300) continue;   // leave big gaps so you can see the game
          c.beginPath(); c.moveTo(x - 18, LH + 10); c.quadraticCurveTo(x + lean * 0.3, LH - hgt * 0.6, x + lean, LH - hgt); c.quadraticCurveTo(x + lean * 0.3 + 12, LH - hgt * 0.5, x + 18, LH + 10); c.fill();
        }
        // leaves hanging from the top
        for (let i = 0; i < 3; i++) {
          const x = 500 + i * 800;
          for (let k = 0; k < 6; k++) {
            c.beginPath(); c.ellipse(x + k * 34 - 80, TOPPAD + 20 + Math.sin(k * 1.7) * 40, 60, 22, 0.6 + k * 0.3, 0, Math.PI * 2); c.fill();
          }
        }
      },
    },

    park: {
      far(c, rnd) {
        hills(c, LH - 360, [[2, 40], [6, 18]], 3, '#b67aa8');
        hills(c, LH - 300, [[3, 30], [8, 10]], 4, theme.far);
        // the pond far away, shining in the sunset
        const py = LH - 250;
        const g = c.createLinearGradient(0, py, 0, LH);
        g.addColorStop(0, '#ff9f7a'); g.addColorStop(1, '#7a4f9a');
        c.fillStyle = g; c.fillRect(0, py, LW, LH - py);
        c.fillStyle = 'rgba(255,230,160,0.55)';
        for (let i = 0; i < 90; i++) { const y = py + 6 + rnd() * 220; c.fillRect(rnd() * LW, y, 20 + rnd() * 80, 3); }
        // tree line
        for (let i = 0; i < 30; i++) {
          const x = rnd() * LW;
          wrap(x, 50, (x) => {
            c.fillStyle = '#8a4f88';
            c.beginPath(); c.arc(x, py - 20, 30 + rnd() * 16, Math.PI, 0); c.fill(); c.fillRect(x - 30, py - 20, 60, 20);
          });
        }
      },
      mid(c, rnd) {
        // round park trees
        for (let i = 0; i < 7; i++) {
          const x = rnd() * LW, h = 300 + rnd() * 140, r = 100 + rnd() * 50;
          wrap(x, r + 40, (x) => {
            c.fillStyle = theme.mid;
            c.fillRect(x - 16, LH - h, 32, h);
            for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * r * 0.5, LH - h - 40 + Math.sin(a) * r * 0.4, r * 0.6, 0, Math.PI * 2); c.fill(); }
            c.fillStyle = 'rgba(255,170,110,0.18)'; c.beginPath(); c.arc(x + r * 0.3, LH - h - 70, r * 0.5, 0, Math.PI * 2); c.fill();
          });
        }
        // lamp posts
        for (let i = 0; i < 4; i++) {
          const x = 300 + i * 600;
          c.fillStyle = theme.mid; c.fillRect(x - 6, LH - 380, 12, 380);
          c.beginPath(); c.moveTo(x - 24, LH - 380); c.lineTo(x + 24, LH - 380); c.lineTo(x + 14, LH - 420); c.lineTo(x - 14, LH - 420); c.fill();
          lampGlow(c, x, LH - 390, 160);
        }
        // a swing set
        const sx = 1300;
        c.strokeStyle = theme.mid; c.lineWidth = 14;
        c.beginPath(); c.moveTo(sx, LH); c.lineTo(sx + 80, LH - 330); c.lineTo(sx + 160, LH); c.moveTo(sx + 360, LH); c.lineTo(sx + 440, LH - 330); c.lineTo(sx + 520, LH); c.moveTo(sx + 70, LH - 330); c.lineTo(sx + 450, LH - 330); c.stroke();
        c.lineWidth = 4;
        for (const k of [170, 300]) { c.beginPath(); c.moveTo(sx + k, LH - 330); c.lineTo(sx + k, LH - 110); c.moveTo(sx + k + 60, LH - 330); c.lineTo(sx + k + 60, LH - 110); c.stroke(); c.fillStyle = theme.mid; c.fillRect(sx + k - 8, LH - 112, 76, 12); }
      },
      near(c, rnd) {
        // reeds and cattails
        for (let i = 0; i < 80; i++) {
          const x = rnd() * LW, hgt = 120 + rnd() * 200, lean = (rnd() - 0.5) * 50;
          wrap(x, 40, (x) => {
            c.strokeStyle = theme.near; c.lineWidth = 5;
            c.beginPath(); c.moveTo(x, LH); c.quadraticCurveTo(x, LH - hgt * 0.5, x + lean, LH - hgt); c.stroke();
            if (rnd() < 0.4) { c.fillStyle = '#5a2f3a'; roundRect(c, x + lean - 7, LH - hgt - 10, 14, 44, 7); c.fill(); }
          });
        }
        // benches
        for (let i = 0; i < 2; i++) {
          const x = 600 + i * 1200;
          c.fillStyle = theme.near;
          c.fillRect(x, LH - 120, 220, 16); c.fillRect(x, LH - 180, 220, 14); c.fillRect(x, LH - 150, 220, 14);
          c.fillRect(x + 14, LH - 120, 14, 120); c.fillRect(x + 192, LH - 120, 14, 120);
        }
      },
      fg(c, rnd) {
        c.fillStyle = theme.fg;
        for (let i = 0; i < 50; i++) {
          const x = rnd() * LW;
          if ((x % 1200) > 300) continue;
          const hgt = 110 + rnd() * 180, lean = (rnd() - 0.5) * 100;
          c.beginPath(); c.moveTo(x - 10, LH + 10); c.quadraticCurveTo(x + lean * 0.2, LH - hgt * 0.5, x + lean, LH - hgt); c.quadraticCurveTo(x + lean * 0.2 + 8, LH - hgt * 0.5, x + 10, LH + 10); c.fill();
          if (rnd() < 0.3) { roundRect(c, x + lean - 10, LH - hgt - 20, 20, 60, 10); c.fill(); }
        }
      },
    },

    city: {
      far(c, rnd) {
        // skyline far away with little lit windows
        let x = 0;
        while (x < LW) {
          const w = 60 + rnd() * 120, h = 200 + rnd() * 330;
          c.fillStyle = theme.far; c.fillRect(x, LH - h, w, h);
          if (rnd() < 0.3) { c.fillRect(x + w / 2 - 3, LH - h - 60, 6, 60); }
          c.fillStyle = 'rgba(255,220,130,0.45)';
          for (let wy = LH - h + 14; wy < LH - 20; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 16) if (rnd() < 0.18) c.fillRect(wx, wy, 7, 10);
          x += w + 4;
        }
      },
      mid(c, rnd) {
        let x = 0;
        while (x < LW) {
          const w = 160 + rnd() * 160, h = 260 + rnd() * 240;
          c.fillStyle = theme.mid; c.fillRect(x, LH - h, w, h);
          c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + w - 16, LH - h, 16, h);
          for (let wy = LH - h + 24; wy < LH - 30; wy += 46) for (let wx = x + 18; wx < x + w - 30; wx += 40) {
            const lit = rnd() < 0.3;
            c.fillStyle = lit ? '#ffd77a' : 'rgba(0,0,0,0.25)';
            c.fillRect(wx, wy, 22, 28);
            if (lit) { c.fillStyle = 'rgba(255,215,120,0.15)'; c.fillRect(wx - 6, wy - 6, 34, 40); }
          }
          // water tower on the roof
          if (rnd() < 0.35) {
            const tx = x + w * 0.4;
            c.fillStyle = theme.mid;
            c.fillRect(tx - 30, LH - h - 50, 6, 50); c.fillRect(tx + 24, LH - h - 50, 6, 50);
            roundRect(c, tx - 40, LH - h - 130, 80, 84, 8); c.fill();
            c.beginPath(); c.moveTo(tx - 46, LH - h - 128); c.lineTo(tx, LH - h - 160); c.lineTo(tx + 46, LH - h - 128); c.fill();
          }
          x += w + 30 + rnd() * 60;
        }
        // neon MILK sign
        const nx = 900, ny = LH - 560;
        c.fillStyle = '#1a1840'; roundRect(c, nx - 20, ny - 20, 250, 100, 12); c.fill();
        c.font = `800 64px ${LP.FONT}`; c.textBaseline = 'top';
        c.shadowColor = '#ff4fd8'; c.shadowBlur = 24; c.fillStyle = '#ff8ae8'; c.fillText('MILK', nx + 20, ny);
        c.shadowBlur = 0;
      },
      near(c, rnd) {
        c.fillStyle = theme.near; c.strokeStyle = theme.near;
        for (let i = 0; i < 8; i++) {
          const x = i * 300 + rnd() * 100;
          const kind = i % 3;
          wrap(x, 200, (x) => {
            if (kind === 0) {
              // chimneys
              c.fillRect(x, LH - 220, 70, 220); c.fillRect(x - 8, LH - 230, 86, 20);
              c.fillRect(x + 110, LH - 170, 50, 170); c.fillRect(x + 104, LH - 178, 62, 16);
            } else if (kind === 1) {
              // antenna
              c.lineWidth = 6; c.beginPath(); c.moveTo(x, LH); c.lineTo(x, LH - 360); c.stroke();
              c.lineWidth = 4;
              for (let k = 0; k < 4; k++) { const w = 70 - k * 14; c.beginPath(); c.moveTo(x - w, LH - 300 + k * 30 - 60); c.lineTo(x + w, LH - 300 + k * 30 - 60); c.stroke(); }
            } else {
              // laundry line with clothes
              c.lineWidth = 3; c.beginPath(); c.moveTo(x, LH - 260); c.quadraticCurveTo(x + 150, LH - 200, x + 300, LH - 260); c.stroke();
              c.fillRect(x - 4, LH - 270, 8, 270); c.fillRect(x + 296, LH - 270, 8, 270);
              for (let k = 0; k < 4; k++) {
                const cx = x + 40 + k * 60, cy = LH - 232 + Math.sin((k + 0.5) / 4 * Math.PI) * 30;
                c.fillStyle = U.mix(theme.near, ['#ff6a8a', '#6ac8ff', '#ffd25a', '#ffffff'][k], 0.25);
                if (k % 2) { c.fillRect(cx - 18, cy, 36, 46); c.fillRect(cx - 26, cy, 52, 14); }
                else { c.beginPath(); c.moveTo(cx - 20, cy); c.lineTo(cx + 20, cy); c.lineTo(cx + 16, cy + 50); c.lineTo(cx - 16, cy + 50); c.fill(); }
              }
              c.fillStyle = theme.near;
            }
          });
        }
      },
      fg(c, rnd) {
        c.fillStyle = theme.fg; c.strokeStyle = theme.fg;
        for (let i = 0; i < 3; i++) {
          const x = 400 + i * 800;
          c.lineWidth = 8; c.beginPath(); c.moveTo(x, LH + 10); c.lineTo(x + 10, LH - 420); c.stroke();
          c.lineWidth = 5; c.beginPath(); c.moveTo(x - 60, LH - 380); c.lineTo(x + 80, LH - 380); c.moveTo(x - 40, LH - 340); c.lineTo(x + 60, LH - 340); c.stroke();
          // wires from the top
          c.lineWidth = 4; c.beginPath(); c.moveTo(x + 10, LH - 420); c.quadraticCurveTo(x + 300, LH - 300, x + 620, LH - 560); c.stroke();
        }
      },
    },
  };

  function lampGlow(c, x, y, r) {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,214,140,0.55)'); g.addColorStop(0.4, 'rgba(255,190,110,0.18)'); g.addColorStop(1, 'rgba(255,180,100,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#fff1c8'; c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill();
  }

  // ---------- make the layer pictures for a world ----------
  function build(key, scale) {
    themeKey = key; theme = LP.THEMES[key];
    rs = Math.min(1, scale);   // background layers don't need to be sharp (they look a bit soft, like far away)
    layers = [];
    const spec = [
      { name: 'far', f: 0.1, blur: 2.2 },
      { name: 'mid', f: 0.28, blur: 1.3 },
      { name: 'near', f: 0.52, blur: 0.5 },
      { name: 'fg', f: 1.3, blur: 3, front: true },
    ];
    let seed = 1234;
    for (const s of spec) {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(LW * rs); cv.height = Math.ceil(LH * rs);
      const c = cv.getContext('2d');
      c.scale(rs, rs);
      if (s.blur && c.filter !== undefined) c.filter = `blur(${s.blur}px)`;
      const rnd = U.rng(seed += 77);
      BUILD[key][s.name](c, rnd);
      c.filter = 'none';
      // a soft haze on the far layers (things far away look paler)
      if (!s.front) {
        c.globalCompositeOperation = 'source-atop';
        const k = s.name === 'far' ? 0.28 : s.name === 'mid' ? 0.14 : 0.04;
        c.fillStyle = U.alpha(theme.sky[2], k); c.fillRect(0, 0, LW, LH);
        c.globalCompositeOperation = 'source-over';
      }
      layers.push({ ...s, cv });
    }
    // floating things in the air
    ambient = [];
    for (let i = 0; i < 46; i++) ambient.push({ x: Math.random() * 1600, y: Math.random() * VH, z: U.rand(0.3, 1.2), p: Math.random() * 10 });
  }

  function drawLayer(ctx, L, camX, camY, baseCamY, viewW) {
    const ox = -(((camX * L.f) % LW) + LW) % LW;
    const oy = VH - LH - (camY - baseCamY) * L.f * 0.6;
    for (let x = ox; x < viewW; x += LW) ctx.drawImage(L.cv, x, oy, LW, LH);
    if (!L.front) {
      // fill the space below the layer (when you look down)
      const bottom = oy + LH;
      if (bottom < VH) { ctx.fillStyle = L.name === 'far' ? theme.far : L.name === 'mid' ? theme.mid : theme.near; ctx.fillRect(0, bottom - 1, viewW, VH - bottom + 2); }
    }
  }

  // draws the sky and the background layers (in screen space)
  function drawBack(ctx, cam, viewW, time, level) {
    const th = theme;
    const g = ctx.createLinearGradient(0, 0, 0, VH);
    g.addColorStop(0, th.sky[0]); g.addColorStop(0.55, th.sky[1]); g.addColorStop(1, th.sky[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, viewW, VH);
    const baseCamY = Math.max(0, level.ph - VH);
    const lift = (cam.y - baseCamY) * 0.03;

    if (themeKey === 'garden') {
      // the sun and its glow
      const sx = viewW * 0.78, sy = 120 - lift;
      sunGlow(ctx, sx, sy, 340, 'rgba(255,250,200,0.55)');
      ctx.fillStyle = '#fffbe0'; ctx.beginPath(); ctx.arc(sx, sy, 56, 0, Math.PI * 2); ctx.fill();
      // clouds slowly drifting
      for (let i = 0; i < 6; i++) {
        const cx = ((i * 520 + time * 12 - cam.x * 0.04) % (viewW + 600) + viewW + 600) % (viewW + 600) - 300;
        cloud(ctx, cx, 90 + (i % 3) * 70 - lift, 0.8 + (i % 2) * 0.5);
      }
    } else if (themeKey === 'park') {
      const sx = viewW * 0.62, sy = 470 - lift * 3;
      sunGlow(ctx, sx, sy, 520, 'rgba(255,200,120,0.6)');
      ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.arc(sx, sy, 80, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 5; i++) {
        const cx = ((i * 640 + time * 6 - cam.x * 0.03) % (viewW + 700) + viewW + 700) % (viewW + 700) - 350;
        ctx.globalAlpha = 0.55; cloud(ctx, cx, 120 + (i % 3) * 60 - lift, 1.1, '#ffb0a0'); ctx.globalAlpha = 1;
      }
    } else if (themeKey === 'city') {
      // stars and a big moon
      for (let i = 0; i < 120; i++) {
        const x = (U.hash(i, 1) * 3000 - cam.x * 0.02) % viewW, y = U.hash(i, 2) * 520;
        ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(time * (0.5 + U.hash(i, 3)) + i));
        ctx.fillStyle = '#fff'; ctx.fillRect((x + viewW) % viewW, y - lift, 2, 2);
      }
      ctx.globalAlpha = 1;
      const mx = viewW * 0.22, my = 150 - lift;
      sunGlow(ctx, mx, my, 260, 'rgba(200,210,255,0.35)');
      ctx.fillStyle = '#f4f1ff'; ctx.beginPath(); ctx.arc(mx, my, 64, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d8d4ee'; ctx.beginPath(); ctx.arc(mx - 18, my - 10, 12, 0, Math.PI * 2); ctx.arc(mx + 20, my + 18, 9, 0, Math.PI * 2); ctx.arc(mx + 8, my - 26, 6, 0, Math.PI * 2); ctx.fill();
    }
    for (const L of layers) if (!L.front) drawLayer(ctx, L, cam.x, cam.y, baseCamY, viewW);

    // light rays coming down
    if (themeKey === 'garden' || themeKey === 'park' || themeKey === 'house') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const x = ((i * 380 - cam.x * 0.2) % (viewW + 800) + viewW + 800) % (viewW + 800) - 400;
        const a = (0.035 + 0.025 * Math.sin(time * 0.6 + i * 2)) * (themeKey === 'house' ? 0.8 : 1);
        const gr = ctx.createLinearGradient(0, 0, 0, VH);
        gr.addColorStop(0, U.alpha(th.glow, a * 2)); gr.addColorStop(1, U.alpha(th.glow, 0));
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x + 90, -10); ctx.lineTo(x + 380, VH); ctx.lineTo(x + 180, VH); ctx.fill();
      }
      ctx.restore();
    }
    // a little fog near the bottom
    const fg = ctx.createLinearGradient(0, VH * 0.5, 0, VH);
    fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, th.fog);
    ctx.fillStyle = fg; ctx.fillRect(0, VH * 0.5, viewW, VH * 0.5);
  }

  function sunGlow(ctx, x, y, r, col) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function cloud(ctx, x, y, s, col) {
    ctx.fillStyle = col || 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(x, y, 36 * s, 0, Math.PI * 2); ctx.arc(x + 40 * s, y - 18 * s, 44 * s, 0, Math.PI * 2);
    ctx.arc(x + 88 * s, y, 34 * s, 0, Math.PI * 2); ctx.arc(x + 44 * s, y + 12 * s, 36 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // the foreground layer and floating things (drawn on top of everything)
  function drawFront(ctx, cam, viewW, time, dt, level) {
    const baseCamY = Math.max(0, level.ph - VH);
    const f = layers.find((l) => l.front);
    if (f) { ctx.globalAlpha = 0.92; drawLayer(ctx, f, cam.x, cam.y, baseCamY, viewW); ctx.globalAlpha = 1; }
    const kind = theme.ambient;
    for (const a of ambient) {
      a.p += dt;
      let x, y;
      if (kind === 'snow') {
        a.y += (20 + 30 * a.z) * dt; if (a.y > VH) a.y -= VH + 10;
        x = a.x + Math.sin(a.p * 0.8) * 20 - cam.x * a.z * 0.6; y = a.y - cam.y * a.z * 0.3;
      } else {
        a.y -= (6 + 10 * a.z) * dt; if (a.y < -10) a.y += VH + 20;
        x = a.x + Math.sin(a.p * 0.5) * 30 - cam.x * a.z * 0.6; y = a.y + Math.cos(a.p * 0.7) * 10 - cam.y * a.z * 0.3;
      }
      x = ((x % (viewW + 40)) + viewW + 40) % (viewW + 40) - 20;
      y = ((y % (VH + 40)) + VH + 40) % (VH + 40) - 20;
      if (kind === 'fireflies') {
        const on = 0.5 + 0.5 * Math.sin(a.p * 2 + a.z * 9);
        ctx.fillStyle = `rgba(230,255,120,${0.15 * on})`; ctx.beginPath(); ctx.arc(x, y, 10 * a.z, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(250,255,190,${0.9 * on})`; ctx.beginPath(); ctx.arc(x, y, 2.4 * a.z, 0, Math.PI * 2); ctx.fill();
      } else {
        const col = kind === 'pollen' ? '255,240,150' : kind === 'snow' ? '255,255,255' : '230,220,255';
        ctx.fillStyle = `rgba(${col},${0.35 + 0.3 * a.z})`;
        ctx.beginPath(); ctx.arc(x, y, (kind === 'snow' ? 2.6 : 1.8) * a.z, 0, Math.PI * 2); ctx.fill();
      }
    }
    // dark corners (makes it look like a movie)
    const v = ctx.createRadialGradient(viewW / 2, VH / 2, VH * 0.45, viewW / 2, VH / 2, Math.max(viewW, VH) * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,0,30,0.35)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, viewW, VH);
  }

  return { build, drawBack, drawFront, get theme() { return theme; }, get key() { return themeKey; } };
})();
