// ============================================================
//  ATLANTIS DIVER — ART
//  Every picture in the game is painted with code:
//  stone textures, columns, statues, coral, crystals and treasure.
// ============================================================
AT.Art = (function () {
  const U = AT.U, T = AT.TILE;
  const TEX = 192;           // textures are 4 x 4 squares big
  const tex = {};

  // ---------- TEXTURES ----------
  function speckle(g, rnd, n, colors, rmin, rmax, alpha) {
    for (let i = 0; i < n; i++) {
      g.globalAlpha = alpha * (0.4 + rnd() * 0.6);
      g.fillStyle = colors[Math.floor(rnd() * colors.length)];
      const r = rmin + rnd() * (rmax - rmin);
      const x = rnd() * TEX, y = rnd() * TEX;
      // draw it 9 times so the texture tiles without seams
      for (const ox of [-TEX, 0, TEX]) for (const oy of [-TEX, 0, TEX]) {
        g.beginPath(); g.arc(x + ox, y + oy, r, 0, Math.PI * 2); g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  function makeRock() {
    return U.canvas(TEX, TEX, (g) => {
      const rnd = U.seeded(11);
      g.fillStyle = '#5d6168'; g.fillRect(0, 0, TEX, TEX);
      speckle(g, rnd, 60, ['#4c5058', '#6d7078', '#565a61', '#737269'], 10, 28, 0.55);
      speckle(g, rnd, 180, ['#43474e', '#7c7e84', '#5b6f6a'], 2, 6, 0.5);
      speckle(g, rnd, 400, ['#2f3238', '#8b8d92'], 0.6, 1.6, 0.6);
      // cracks
      g.strokeStyle = 'rgba(30,32,38,0.55)'; g.lineWidth = 1.3;
      for (let i = 0; i < 9; i++) {
        let x = rnd() * TEX, y = rnd() * TEX;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 5; k++) { x += (rnd() - 0.5) * 26; y += (rnd() - 0.5) * 26; g.lineTo(x, y); }
        g.stroke();
      }
    });
  }

  function blocks(g, rnd, bw, bh, mortar, hi, lo, jitter) {
    for (let row = 0; row * bh < TEX; row++) {
      const off = (row % 2) * (bw / 2);
      for (let col = -1; col * bw < TEX + bw; col++) {
        const x = col * bw + off, y = row * bh;
        const v = (rnd() - 0.5) * jitter;
        g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`;
        g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
        g.fillStyle = hi; g.fillRect(x + 1, y + 1, bw - 2, 2);
        g.fillStyle = lo; g.fillRect(x + 1, y + bh - 3, bw - 2, 2);
        g.fillStyle = mortar; g.fillRect(x, y, bw, 1); g.fillRect(x, y, 1, bh);
      }
    }
  }

  function makeMarble() {
    return U.canvas(TEX, TEX, (g) => {
      const rnd = U.seeded(22);
      g.fillStyle = '#e4ddcf'; g.fillRect(0, 0, TEX, TEX);
      speckle(g, rnd, 50, ['#d6cfc0', '#efe9dd', '#dcd3c2'], 12, 30, 0.6);
      // veins
      for (let i = 0; i < 14; i++) {
        g.strokeStyle = `rgba(120,115,110,${0.15 + rnd() * 0.25})`; g.lineWidth = 0.6 + rnd() * 1.2;
        let x = rnd() * TEX, y = rnd() * TEX;
        g.beginPath(); g.moveTo(x, y);
        for (let k = 0; k < 4; k++) {
          const nx = x + (rnd() - 0.3) * 60, ny = y + (rnd() - 0.5) * 40;
          g.quadraticCurveTo(x + (rnd() - 0.5) * 40, y + (rnd() - 0.5) * 40, nx, ny); x = nx; y = ny;
        }
        g.stroke();
      }
      blocks(g, rnd, 96, 48, 'rgba(90,80,70,0.55)', 'rgba(255,255,255,0.35)', 'rgba(60,50,40,0.18)', 0.08);
      speckle(g, rnd, 200, ['#b5ad9f', '#fffaf0'], 0.5, 1.4, 0.5);
    });
  }

  function makeGold() {
    return U.canvas(TEX, TEX, (g) => {
      const rnd = U.seeded(33);
      const gr = g.createLinearGradient(0, 0, TEX * 0.6, TEX);
      gr.addColorStop(0, '#d9b45c'); gr.addColorStop(0.5, '#ecd08a'); gr.addColorStop(1, '#c79d45');
      g.fillStyle = gr; g.fillRect(0, 0, TEX, TEX);
      speckle(g, rnd, 40, ['#e8c878', '#caa04c', '#f3dc9c'], 12, 26, 0.35);
      blocks(g, rnd, 96, 48, 'rgba(110,75,20,0.6)', 'rgba(255,248,215,0.55)', 'rgba(110,70,15,0.25)', 0.07);
      // a small carved diamond in every block
      for (let row = 0; row < 4; row++) for (let col = -1; col < 3; col++) {
        const x = col * 96 + (row % 2) * 48 + 48, y = row * 48 + 24;
        g.save(); g.translate(x, y);
        g.fillStyle = 'rgba(120,80,20,0.35)';
        g.beginPath(); g.moveTo(0, -9); g.lineTo(12, 0); g.lineTo(0, 9); g.lineTo(-12, 0); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,245,210,0.5)';
        g.beginPath(); g.moveTo(0, -6); g.lineTo(7, 0); g.lineTo(0, 0); g.lineTo(-7, 0); g.closePath(); g.fill();
        g.restore();
      }
      speckle(g, rnd, 120, ['#fff6d0', '#9a7020'], 0.5, 1.3, 0.45);
    });
  }

  // blue and gold tiny tiles, for the walls inside golden houses
  function makeMosaic() {
    return U.canvas(TEX, TEX, (g) => {
      const rnd = U.seeded(66);
      g.fillStyle = '#10313f'; g.fillRect(0, 0, TEX, TEX);
      const S = 8;
      for (let y = 0; y < TEX; y += S) for (let x = 0; x < TEX; x += S) {
        const band = (y % 96) >= 72 && (y % 96) < 88;
        let c;
        if (band) {
          // a golden wave pattern
          const k = ((x / S) + Math.floor((y % 96 - 72) / S) * 2) % 6;
          c = k < 3 ? [214 + rnd() * 30, 170 + rnd() * 30, 80] : [20, 70, 90];
        } else {
          const v = rnd();
          c = v > 0.93 ? [230, 190, 90] : v > 0.6 ? [30, 110, 130] : v > 0.3 ? [24, 90, 115] : [36, 124, 140];
        }
        g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
        g.fillRect(x + 0.5, y + 0.5, S - 1, S - 1);
      }
    });
  }

  function makeTemple() {
    return U.canvas(TEX, TEX, (g) => {
      const rnd = U.seeded(44);
      g.fillStyle = '#34466b'; g.fillRect(0, 0, TEX, TEX);
      speckle(g, rnd, 60, ['#2c3c5e', '#3d5078', '#30405f'], 10, 26, 0.6);
      blocks(g, rnd, 96, 64, 'rgba(10,15,35,0.7)', 'rgba(150,180,230,0.25)', 'rgba(0,0,20,0.3)', 0.1);
      speckle(g, rnd, 260, ['#5d79a8', '#1c2640', '#6fd6e0'], 0.5, 1.4, 0.45);
    });
  }

  function makeCrystalRock() {
    return U.canvas(TEX, TEX, (g) => {
      const rnd = U.seeded(55);
      g.fillStyle = '#2c2148'; g.fillRect(0, 0, TEX, TEX);
      // big facets
      for (let i = 0; i < 70; i++) {
        const x = rnd() * TEX, y = rnd() * TEX, r = 10 + rnd() * 22;
        const l = rnd();
        g.fillStyle = l > 0.5 ? `rgba(90,70,150,${0.25 + rnd() * 0.25})` : `rgba(15,8,35,${0.25 + rnd() * 0.3})`;
        for (const ox of [-TEX, 0, TEX]) for (const oy of [-TEX, 0, TEX]) {
          g.beginPath();
          const n = 5 + Math.floor(rnd() * 3);
          for (let k = 0; k < n; k++) {
            const a = (k / n) * Math.PI * 2 + rnd() * 0.5;
            g.lineTo(x + ox + Math.cos(a) * r, y + oy + Math.sin(a) * r);
          }
          g.fill();
        }
      }
      speckle(g, rnd, 90, ['#7ff0ff', '#d59bff'], 0.6, 1.8, 0.8);
    });
  }

  function init() {
    tex['#'] = makeRock();
    tex.B = makeMarble(); tex['%'] = tex.B;
    tex.G = makeGold();
    tex.T = makeTemple(); tex.R = tex.T;
    tex.X = makeCrystalRock();
    tex.b = tex.B; tex.g = makeMosaic(); tex.t = tex.T; tex.x = tex.X;
  }

  // ---------- COLUMN ----------
  function column(g, x, y, top, bottom, broken, seed, stone = 'marble') {
    const cx = x + T / 2, w = 26;
    const light = stone === 'marble' ? ['#f4efe4', '#d8cfbd', '#9e9483'] : ['#a9bddc', '#7087b0', '#3b4d74'];
    const gr = g.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    gr.addColorStop(0, light[1]); gr.addColorStop(0.35, light[0]); gr.addColorStop(1, light[2]);
    let y0 = y, y1 = y + T;
    if (top) y0 += broken ? 18 : 10;
    if (bottom) y1 -= 8;
    g.fillStyle = gr;
    if (broken) {
      // a jagged broken top
      g.beginPath();
      g.moveTo(cx - w / 2, y1);
      g.lineTo(cx - w / 2, y0 + 6);
      const r = U.seeded(seed);
      for (let i = 1; i <= 5; i++) g.lineTo(cx - w / 2 + (w * i) / 5, y0 + r() * 14);
      g.lineTo(cx + w / 2, y1);
      g.fill();
    } else {
      g.fillRect(cx - w / 2, y0, w, y1 - y0);
    }
    // flutes
    g.strokeStyle = 'rgba(80,70,60,0.28)'; g.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const fx = cx - w / 2 + (w * i) / 5;
      g.beginPath(); g.moveTo(fx, y0 + (broken ? 14 : 0)); g.lineTo(fx, y1); g.stroke();
    }
    if (top && !broken) {
      // capital with little scrolls (ionic)
      g.fillStyle = light[1]; g.fillRect(cx - 21, y + 2, 42, 5);
      g.fillStyle = light[0]; g.fillRect(cx - 17, y + 7, 34, 4);
      for (const s of [-1, 1]) {
        g.beginPath(); g.arc(cx + s * 16, y + 10, 5, 0, Math.PI * 2); g.fillStyle = light[1]; g.fill();
        g.beginPath(); g.arc(cx + s * 16, y + 10, 2.2, 0, Math.PI * 2); g.fillStyle = light[2]; g.fill();
      }
    }
    if (bottom) {
      g.fillStyle = light[1]; g.fillRect(cx - 18, y + T - 9, 36, 4);
      g.fillStyle = light[2]; g.fillRect(cx - 20, y + T - 5, 40, 5);
    }
  }

  // ---------- STATUES ----------
  function statue(g, x, y, seed, scale = 1, stone = 'marble') {
    // (x, y) = bottom middle
    const pal = stone === 'marble' ? ['#f2ecdf', '#cfc5b2', '#968b78', '#6f6556'] : ['#9fc2c0', '#6f9795', '#456866', '#2d4948'];
    const pose = Math.floor(U.hash(seed, 3) * 3);
    g.save(); g.translate(x, y); g.scale(scale, scale);
    // pedestal
    g.fillStyle = pal[2]; g.fillRect(-26, -22, 52, 22);
    g.fillStyle = pal[1]; g.fillRect(-30, -26, 60, 6); g.fillRect(-30, -4, 60, 4);
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(8, -22, 18, 22);
    // robe
    const gr = g.createLinearGradient(-20, 0, 20, 0);
    gr.addColorStop(0, pal[1]); gr.addColorStop(0.4, pal[0]); gr.addColorStop(1, pal[2]);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-18, -26); g.lineTo(-13, -92); g.quadraticCurveTo(0, -100, 13, -92); g.lineTo(18, -26);
    g.closePath(); g.fill();
    // folds
    g.strokeStyle = 'rgba(90,80,65,0.35)'; g.lineWidth = 1.2;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 5, -88); g.quadraticCurveTo(i * 6 + 2, -60, i * 7, -28); g.stroke(); }
    // head
    g.fillStyle = pal[0]; g.beginPath(); g.arc(0, -108, 9.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = pal[2]; g.beginPath(); g.arc(3, -106, 9.5, -0.6, 1.4); g.fill();
    g.fillStyle = pal[1]; g.beginPath(); g.arc(-1, -114, 8, Math.PI, 0); g.fill(); // hair
    g.fillStyle = pal[0]; g.fillRect(-4, -100, 8, 6); // neck
    g.lineCap = 'round'; g.lineWidth = 7; g.strokeStyle = pal[0];
    if (pose === 0) {
      // holding a spear
      g.beginPath(); g.moveTo(10, -88); g.lineTo(22, -70); g.lineTo(20, -84); g.stroke();
      g.lineWidth = 3; g.strokeStyle = pal[2]; g.beginPath(); g.moveTo(21, -140); g.lineTo(21, -28); g.stroke();
      g.fillStyle = pal[2]; g.beginPath(); g.moveTo(21, -152); g.lineTo(26, -138); g.lineTo(16, -138); g.fill();
      g.lineWidth = 7; g.strokeStyle = pal[1]; g.beginPath(); g.moveTo(-10, -88); g.lineTo(-16, -62); g.stroke();
    } else if (pose === 1) {
      // holding a vase on the shoulder
      g.beginPath(); g.moveTo(-10, -88); g.lineTo(-18, -104); g.stroke();
      g.fillStyle = pal[1]; g.beginPath(); g.ellipse(-20, -118, 10, 13, -0.3, 0, Math.PI * 2); g.fill();
      g.fillStyle = pal[2]; g.fillRect(-25, -134, 8, 6);
      g.strokeStyle = pal[1]; g.beginPath(); g.moveTo(10, -88); g.lineTo(14, -62); g.stroke();
    } else {
      // both arms up to the sky
      g.beginPath(); g.moveTo(-10, -90); g.lineTo(-20, -124); g.stroke();
      g.beginPath(); g.moveTo(10, -90); g.lineTo(20, -124); g.stroke();
    }
    // old, broken and covered in sea life
    if (U.hash(seed, 9) > 0.5) {
      g.fillStyle = 'rgba(70,120,90,0.35)';
      g.beginPath(); g.ellipse(-8, -30, 12, 5, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(10, -60, 6, 3, 0.4, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  // the giant statue of Poseidon in the temple
  function poseidon(g, x, y) {
    g.save(); g.translate(x, y);
    const pal = ['#dfe8f2', '#a9b8cc', '#6c7d98', '#3f4d68'];
    // big pedestal with steps
    g.fillStyle = pal[3]; g.fillRect(-110, -26, 220, 26);
    g.fillStyle = pal[2]; g.fillRect(-90, -60, 180, 34);
    g.fillStyle = pal[1]; g.fillRect(-96, -64, 192, 6); g.fillRect(-116, -30, 232, 5);
    g.fillStyle = 'rgba(120,220,255,0.55)'; g.font = 'bold 18px Cinzel, Georgia, serif'; g.textAlign = 'center';
    g.fillText('ΠΟΣΕΙΔΩΝ', 0, -37);
    // legs and robe
    const gr = g.createLinearGradient(-60, 0, 60, 0);
    gr.addColorStop(0, pal[1]); gr.addColorStop(0.4, pal[0]); gr.addColorStop(1, pal[2]);
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-46, -64); g.lineTo(-38, -170); g.lineTo(38, -170); g.lineTo(52, -64); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,50,70,0.3)'; g.lineWidth = 2;
    for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 9, -165); g.quadraticCurveTo(i * 11 + 4, -120, i * 13, -66); g.stroke(); }
    // chest
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(-40, -170); g.lineTo(-50, -250); g.quadraticCurveTo(0, -268, 50, -250); g.lineTo(40, -170); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(40,50,70,0.25)';
    g.beginPath(); g.moveTo(-20, -235); g.quadraticCurveTo(-8, -222, 0, -232); g.quadraticCurveTo(8, -222, 20, -235); g.stroke();
    g.beginPath(); g.moveTo(0, -226); g.lineTo(0, -180); g.stroke();
    // left arm down, right arm up holding the trident
    g.lineCap = 'round'; g.strokeStyle = pal[1]; g.lineWidth = 17;
    g.beginPath(); g.moveTo(-48, -246); g.lineTo(-70, -196); g.lineTo(-64, -150); g.stroke();
    g.strokeStyle = pal[0];
    g.beginPath(); g.moveTo(48, -246); g.lineTo(76, -272); g.lineTo(82, -302); g.stroke();
    // head with a big beard and a crown
    g.fillStyle = pal[0]; g.beginPath(); g.arc(0, -288, 22, 0, Math.PI * 2); g.fill();
    g.fillStyle = pal[1];
    g.beginPath(); g.moveTo(-22, -284); g.quadraticCurveTo(-24, -238, 0, -230); g.quadraticCurveTo(24, -238, 22, -284);
    g.quadraticCurveTo(0, -268, -22, -284); g.fill();
    g.strokeStyle = 'rgba(40,50,70,0.3)'; g.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 6, -272); g.quadraticCurveTo(i * 7, -254, i * 4, -238); g.stroke(); }
    g.fillStyle = pal[2]; g.beginPath(); g.arc(7, -290, 3, 0, Math.PI * 2); g.arc(-7, -290, 3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#d9a93a';
    g.beginPath(); g.moveTo(-20, -304); for (let i = 0; i <= 4; i++) { g.lineTo(-20 + i * 10, -322); g.lineTo(-15 + i * 10, -306); } g.lineTo(20, -304); g.fill();
    // the golden trident
    g.strokeStyle = '#e8b845'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(86, -360); g.lineTo(80, -120); g.stroke();
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(72, -372); g.quadraticCurveTo(70, -350, 86, -350); g.quadraticCurveTo(102, -350, 100, -372); g.stroke();
    g.beginPath(); g.moveTo(86, -350); g.lineTo(86, -384); g.stroke();
    g.fillStyle = '#ffe08a';
    for (const tx of [72, 86, 100]) { g.beginPath(); g.moveTo(tx - 4, -372 - (tx === 86 ? 12 : 0)); g.lineTo(tx, -386 - (tx === 86 ? 12 : 0)); g.lineTo(tx + 4, -372 - (tx === 86 ? 12 : 0)); g.fill(); }
    g.restore();
  }

  // ---------- CORAL ----------
  function coral(g, x, y, seed, zone) {
    const r = U.seeded(seed);
    const bright = [['#ff6f91', '#ff9a5c', '#ffd166', '#c86bfa'], ['#e0668a', '#e98b52', '#d7b35a', '#9a6ad8'], ['#b0587a', '#b87048', '#a88c50', '#7a5ab0']][Math.min(2, zone)];
    const kind = Math.floor(r() * 3);
    const col = bright[Math.floor(r() * bright.length)];
    g.save(); g.translate(x, y);
    if (kind === 0) {
      // branching coral
      const branch = (len, ang, w, depth) => {
        if (depth === 0 || len < 4) return;
        const ex = Math.cos(ang) * len, ey = Math.sin(ang) * len;
        g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(ex, ey); g.stroke();
        g.save(); g.translate(ex, ey);
        branch(len * 0.72, ang - 0.45 - r() * 0.3, w * 0.72, depth - 1);
        branch(len * 0.72, ang + 0.45 + r() * 0.3, w * 0.72, depth - 1);
        g.restore();
        if (depth === 1) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(ex, ey, w * 0.5, 0, Math.PI * 2); g.fill(); }
      };
      branch(14 + r() * 6, -Math.PI / 2 + (r() - 0.5) * 0.3, 6, 4);
    } else if (kind === 1) {
      // fan coral
      g.fillStyle = col; g.globalAlpha = 0.85;
      g.beginPath(); g.moveTo(0, 0);
      for (let a = -2.6; a <= -0.5; a += 0.15) g.lineTo(Math.cos(a) * (26 + r() * 6), Math.sin(a) * (30 + r() * 6));
      g.closePath(); g.fill();
      g.globalAlpha = 1; g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1;
      for (let a = -2.5; a <= -0.6; a += 0.3) { g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 28, Math.sin(a) * 32); g.stroke(); }
    } else {
      // brain coral + little anemones
      const gr = g.createRadialGradient(-4, -12, 2, 0, -6, 20);
      gr.addColorStop(0, '#fff2c6'); gr.addColorStop(1, col);
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, -2, 18, 14, 0, Math.PI, 0); g.fill();
      g.strokeStyle = 'rgba(80,30,40,0.3)'; g.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(0, -2, 4 + i * 3, Math.PI + 0.2, -0.2); g.stroke(); }
      g.fillStyle = bright[(bright.indexOf(col) + 1) % bright.length];
      for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(14 + i * 3, -3 - (i % 2) * 3, 2.5, 0, Math.PI * 2); g.fill(); }
    }
    g.restore();
  }

  // ---------- CRYSTALS ----------
  function crystals(g, x, y, seed) {
    const r = U.seeded(seed);
    g.save(); g.translate(x, y);
    const n = 3 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 1.3, len = 22 + r() * 30, w = 6 + r() * 6;
      const ox = (r() - 0.5) * 22;
      g.save(); g.translate(ox, 2); g.rotate(a + Math.PI / 2);
      const hue = r() > 0.4 ? ['#7ff6ff', '#2fb8e8', '#1a5d9c'] : ['#e4a8ff', '#a45cf0', '#4e2a8e'];
      const gr = g.createLinearGradient(-w, 0, w, 0);
      gr.addColorStop(0, hue[1]); gr.addColorStop(0.45, hue[0]); gr.addColorStop(1, hue[2]);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -len); g.lineTo(0, -len - w); g.lineTo(w / 2, -len); g.lineTo(w / 2, 0); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(-w / 6, -2); g.lineTo(-w / 6, -len); g.lineTo(0, -len - w); g.stroke();
      g.restore();
    }
    g.fillStyle = '#231a3c'; g.beginPath(); g.ellipse(0, 2, 20, 6, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  // brazier with a glowing crystal inside (the flame is drawn every frame)
  function lamp(g, x, y) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#7a5a2a'; g.fillRect(-4, -34, 8, 30);
    g.fillStyle = '#a07a38'; g.fillRect(-12, -6, 24, 6);
    const gr = g.createLinearGradient(-18, 0, 18, 0);
    gr.addColorStop(0, '#8a6528'); gr.addColorStop(0.4, '#e3b458'); gr.addColorStop(1, '#6d4c1c');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(-18, -44); g.quadraticCurveTo(0, -24, 18, -44); g.closePath(); g.fill();
    g.fillRect(-19, -47, 38, 4);
    g.restore();
  }

  // a glowing rune carved in a stone block
  function rune(g, x, y, seed) {
    const r = U.seeded(seed);
    g.save(); g.translate(x + T / 2, y + T / 2);
    g.strokeStyle = 'rgba(120,240,255,0.95)'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.shadowColor = '#5ef0ff'; g.shadowBlur = 10;
    g.beginPath(); g.arc(0, 0, 15, 0, Math.PI * 2); g.stroke();
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = r() * Math.PI * 2, b = a + 1 + r() * 2;
      g.moveTo(Math.cos(a) * 11, Math.sin(a) * 11); g.lineTo(Math.cos(b) * 6, Math.sin(b) * 6);
    }
    g.moveTo(0, -9); g.lineTo(0, 9);
    g.stroke();
    g.restore();
  }

  // ---------- TREASURE ----------
  function gemColor(seed) {
    return [['#ff3b5c', '#ff9aad', '#8a0f28'], ['#2fe07a', '#a6ffc9', '#0b6b35'], ['#3b8bff', '#a8cbff', '#12348a'], ['#b35cff', '#e2bdff', '#4f1a8a']][Math.floor(U.hash(seed, 7) * 4)];
  }
  function gem(g, s, seed) {
    const [c, hi, lo] = gemColor(seed);
    g.fillStyle = lo;
    g.beginPath(); g.moveTo(-12 * s, -4 * s); g.lineTo(-7 * s, -11 * s); g.lineTo(7 * s, -11 * s); g.lineTo(12 * s, -4 * s); g.lineTo(0, 12 * s); g.closePath(); g.fill();
    g.fillStyle = c;
    g.beginPath(); g.moveTo(-12 * s, -4 * s); g.lineTo(12 * s, -4 * s); g.lineTo(0, 12 * s); g.closePath(); g.fill();
    g.fillStyle = hi;
    g.beginPath(); g.moveTo(-7 * s, -11 * s); g.lineTo(0, -4 * s); g.lineTo(7 * s, -11 * s); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath(); g.moveTo(-5 * s, -3 * s); g.lineTo(-1 * s, -3 * s); g.lineTo(-3 * s, 3 * s); g.fill();
  }
  function goldGrad(g, w) {
    const gr = g.createLinearGradient(-w, 0, w, 0);
    gr.addColorStop(0, '#a8741a'); gr.addColorStop(0.35, '#ffe38a'); gr.addColorStop(0.6, '#e8b640'); gr.addColorStop(1, '#8c5c12');
    return gr;
  }

  // draws one treasure centered on (0, 0)
  function treasure(g, ch, seed, open = 0) {
    if (ch === '$') {
      g.fillStyle = '#8c5c12'; g.beginPath(); g.ellipse(0, 8, 16, 5, 0, 0, Math.PI * 2); g.fill();
      const coins = [[-8, 6], [6, 6], [-1, 3], [-4, -1], [5, 0], [0, -5]];
      for (const [cx, cy] of coins) {
        g.fillStyle = '#b5821f'; g.beginPath(); g.ellipse(cx, cy + 1.5, 7, 3.5, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = goldGrad(g, 7); g.beginPath(); g.ellipse(cx, cy, 7, 3.5, 0, 0, Math.PI * 2); g.fill();
      }
      g.save(); g.translate(8, -6); g.rotate(0.3);
      g.fillStyle = goldGrad(g, 7); g.beginPath(); g.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#a8741a'; g.lineWidth = 1; g.stroke(); g.restore();
    } else if (ch === 'o') {
      // clam that opens up when you get close
      const a = 0.15 + open * 0.75;
      g.fillStyle = '#c9a5b8';
      g.beginPath(); g.ellipse(0, 4, 16, 7, 0, 0, Math.PI); g.fill();
      g.fillStyle = '#e8cfd9'; g.beginPath(); g.ellipse(0, 4, 16, 4, 0, Math.PI, 0); g.fill();
      const pr = g.createRadialGradient(-2, -2, 1, 0, 0, 7);
      pr.addColorStop(0, '#ffffff'); pr.addColorStop(0.6, '#f3e8ff'); pr.addColorStop(1, '#c8b3d8');
      g.fillStyle = pr; g.beginPath(); g.arc(0, 1, 6, 0, Math.PI * 2); g.fill();
      g.save(); g.translate(-15, 3); g.rotate(-a);
      g.fillStyle = '#b48aa0'; g.beginPath(); g.ellipse(15, 0, 16, 8, 0, Math.PI, 0); g.fill();
      g.strokeStyle = 'rgba(90,50,70,0.4)'; g.lineWidth = 1;
      for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(15, 0); g.lineTo(15 + i * 4.5, -7 + Math.abs(i) * 0.8); g.stroke(); }
      g.restore();
    } else if (ch === '*') {
      gem(g, 1.1, seed);
    } else if (ch === 'u') {
      g.fillStyle = goldGrad(g, 12);
      g.beginPath(); g.moveTo(-12, -14); g.quadraticCurveTo(-12, 2, 0, 3); g.quadraticCurveTo(12, 2, 12, -14); g.closePath(); g.fill();
      g.fillRect(-2.5, 2, 5, 9); g.beginPath(); g.ellipse(0, 12, 9, 3, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#7a4f0e'; g.beginPath(); g.ellipse(0, -14, 12, 3, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff3b5c'; g.beginPath(); g.arc(0, -6, 2.5, 0, Math.PI * 2); g.fill();
    } else if (ch === 'h') {
      const gr = g.createLinearGradient(-12, 0, 12, 0);
      gr.addColorStop(0, '#d5cbb8'); gr.addColorStop(0.4, '#f7f1e6'); gr.addColorStop(1, '#9b907c');
      g.fillStyle = '#b8ae9a'; g.fillRect(-9, 6, 18, 8);
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, -3, 11, 13, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c4b9a4'; g.beginPath(); g.arc(0, -9, 11, Math.PI, 0); g.fill();
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.arc(i * 4.5, -16, 3.5, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#8b806c'; g.fillRect(-6, -3, 4, 1.5); g.fillRect(2, -3, 4, 1.5); g.fillRect(-1, 0, 2, 4); g.fillRect(-3, 6, 6, 1.2);
    } else if (ch === 'W') {
      g.fillStyle = goldGrad(g, 16);
      g.beginPath(); g.moveTo(-16, 8); g.lineTo(-17, -10); g.lineTo(-8, -1); g.lineTo(0, -15); g.lineTo(8, -1); g.lineTo(17, -10); g.lineTo(16, 8); g.closePath(); g.fill();
      g.fillStyle = '#b5821f'; g.fillRect(-16, 4, 32, 5);
      const jc = ['#ff3b5c', '#3b8bff', '#2fe07a'];
      [[-10, 6], [0, 6], [10, 6]].forEach(([jx, jy], i) => { g.fillStyle = jc[i]; g.beginPath(); g.arc(jx, jy, 2.6, 0, Math.PI * 2); g.fill(); });
      g.fillStyle = '#fff'; for (const [px, py] of [[-17, -10], [0, -15], [17, -10]]) { g.beginPath(); g.arc(px, py, 2.3, 0, Math.PI * 2); g.fill(); }
    } else if (ch === '@') {
      // treasure chest (lid opens a little and glows)
      g.fillStyle = '#6b3f1d'; U.rr(g, -20, -6, 40, 20, 3); g.fill();
      g.fillStyle = '#8a5428'; for (let i = 0; i < 3; i++) g.fillRect(-19, -4 + i * 6, 38, 3);
      g.fillStyle = 'rgba(255,220,120,0.9)'; g.fillRect(-18, -8, 36, 3);
      g.fillStyle = '#7a4a22';
      g.beginPath(); g.moveTo(-20, -6); g.quadraticCurveTo(-20, -20, 0, -21); g.quadraticCurveTo(20, -20, 20, -6); g.closePath(); g.fill();
      g.fillStyle = goldGrad(g, 20);
      g.fillRect(-20, -8, 40, 3); g.fillRect(-15, -20, 4, 34); g.fillRect(11, -20, 4, 34);
      g.fillRect(-4, -10, 8, 8);
      g.fillStyle = '#3a220e'; g.fillRect(-1, -7, 2, 3);
    } else if (ch === '!') {
      // stone tablet with glowing letters
      g.fillStyle = '#5a6478'; U.rr(g, -15, -22, 30, 40, 6); g.fill();
      g.fillStyle = '#6f7a90'; U.rr(g, -13, -20, 26, 36, 5); g.fill();
      g.strokeStyle = 'rgba(140,245,255,0.95)'; g.lineWidth = 1.6;
      const r = U.seeded(seed);
      for (let i = 0; i < 5; i++) {
        g.beginPath(); let x = -9;
        g.moveTo(x, -13 + i * 6.5);
        while (x < 8) { x += 2 + r() * 4; g.lineTo(Math.min(x, 9), -13 + i * 6.5 + (r() - 0.5) * 3); }
        g.stroke();
      }
    } else if (ch === 'Y') {
      trident(g, 1);
    }
  }

  function trident(g, s) {
    g.save(); g.scale(s, s);
    g.shadowColor = '#ffd966'; g.shadowBlur = 18;
    g.strokeStyle = goldGrad(g, 6); g.lineCap = 'round';
    g.lineWidth = 5; g.beginPath(); g.moveTo(0, 40); g.lineTo(0, -30); g.stroke();
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(-18, -44); g.quadraticCurveTo(-20, -22, 0, -22); g.quadraticCurveTo(20, -22, 18, -44); g.stroke();
    g.beginPath(); g.moveTo(0, -22); g.lineTo(0, -52); g.stroke();
    g.fillStyle = '#fff1b8';
    for (const [x, y] of [[-18, -44], [0, -52], [18, -44]]) { g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x, y - 14); g.lineTo(x + 5, y); g.fill(); }
    g.fillStyle = '#3bd7ff'; g.beginPath(); g.arc(0, -22, 4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#e8b640'; g.fillRect(-4, 10, 8, 4); g.fillRect(-4, 38, 8, 5);
    g.restore();
  }

  // ---------- SHOP ICONS ----------
  function icon(name, size = 64) {
    return U.canvas(size, size, (g) => {
      g.translate(size / 2, size / 2); g.scale(size / 64, size / 64);
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (name === 'air') {
        const gr = goldGrad(g, 12);
        g.fillStyle = '#f2c230'; U.rr(g, -12, -22, 24, 46, 11); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.45)'; U.rr(g, -8, -16, 5, 34, 3); g.fill();
        g.fillStyle = '#555c66'; g.fillRect(-5, -30, 10, 9);
        g.fillStyle = gr; g.fillRect(-9, -32, 18, 4);
        g.fillStyle = '#1d3b4f'; g.fillRect(-12, 0, 24, 5);
      } else if (name === 'fins') {
        g.fillStyle = '#ff8a3d';
        g.beginPath(); g.moveTo(-6, -24); g.lineTo(6, -24); g.lineTo(22, 22); g.quadraticCurveTo(0, 28, -22, 22); g.closePath(); g.fill();
        g.fillStyle = '#1d3b4f'; U.rr(g, -8, -28, 16, 16, 5); g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2;
        for (const x of [-8, 0, 8]) { g.beginPath(); g.moveTo(x * 0.3, -10); g.lineTo(x * 1.6, 22); g.stroke(); }
      } else if (name === 'bag') {
        g.fillStyle = '#9a6a3a';
        g.beginPath(); g.moveTo(-18, -8); g.quadraticCurveTo(-26, 26, 0, 26); g.quadraticCurveTo(26, 26, 18, -8); g.closePath(); g.fill();
        g.fillStyle = '#7a4f28'; g.beginPath(); g.ellipse(0, -10, 16, 6, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#e8b640'; g.lineWidth = 3; g.beginPath(); g.moveTo(-14, -6); g.lineTo(14, -6); g.stroke();
        g.fillStyle = goldGrad(g, 6); g.beginPath(); g.arc(-4, -14, 6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(6, -15, 5, 0, Math.PI * 2); g.fill();
      } else if (name === 'suit') {
        const gr = goldGrad(g, 24);
        g.fillStyle = gr; g.beginPath(); g.arc(0, -2, 24, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#1b4a66'; g.beginPath(); g.arc(0, -2, 14, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(160,230,255,0.6)'; g.beginPath(); g.arc(-4, -7, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#b5821f'; for (let a = 0; a < 6; a++) { g.beginPath(); g.arc(Math.cos(a) * 19, -2 + Math.sin(a) * 19, 2.2, 0, Math.PI * 2); g.fill(); }
        g.fillRect(-18, 20, 36, 8);
      } else if (name === 'lamp') {
        g.fillStyle = 'rgba(255,240,150,0.35)'; g.beginPath(); g.moveTo(4, -8); g.lineTo(32, -26); g.lineTo(32, 26); g.lineTo(4, 8); g.fill();
        g.fillStyle = '#555c66'; U.rr(g, -22, -10, 26, 20, 4); g.fill();
        g.fillStyle = '#ffe98a'; g.beginPath(); g.ellipse(4, 0, 4, 10, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#333'; g.fillRect(-18, 10, 6, 10);
      } else if (name === 'harpoon') {
        g.rotate(-0.6);
        g.fillStyle = '#555c66'; U.rr(g, -26, -5, 30, 10, 3); g.fill();
        g.fillStyle = '#3a2a1a'; g.fillRect(-20, 4, 8, 12);
        g.strokeStyle = '#c8d4e0'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(28, 0); g.stroke();
        g.fillStyle = '#5ef0ff'; g.beginPath(); g.moveTo(26, -6); g.lineTo(36, 0); g.lineTo(26, 6); g.fill();
      } else if (name === 'sonar') {
        g.strokeStyle = '#5ef0ff'; g.lineWidth = 3;
        for (let i = 1; i <= 3; i++) { g.globalAlpha = 1 - i * 0.25; g.beginPath(); g.arc(0, 0, i * 8, 0, Math.PI * 2); g.stroke(); }
        g.globalAlpha = 1; g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(12, -10, 4, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#5ef0ff'; g.beginPath(); g.moveTo(0, 0); g.lineTo(22, -14); g.stroke();
      }
    });
  }

  return { init, tex, TEX, column, statue, poseidon, coral, crystals, lamp, rune, treasure, trident, gem, goldGrad, icon };
})();
