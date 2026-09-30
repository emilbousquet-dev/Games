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

  // the night sky: dark blue at the top, glowing purple near the city
  const sky = () => once('sky', () => tex(U.canvas(16, 512, (g, w, h) => {
    const l = g.createLinearGradient(0, 0, 0, h);
    l.addColorStop(0, '#05030f');
    l.addColorStop(0.35, '#120a34');
    l.addColorStop(0.62, '#3a1460');
    l.addColorStop(0.78, '#7a2a7a');
    l.addColorStop(1, '#2a1040');
    g.fillStyle = l; g.fillRect(0, 0, w, h);
  })));

  // far away skyline, drawn as dark shapes with tiny lights
  const skyline = () => once('skyline', () => tex(U.canvas(1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let layer = 0; layer < 2; layer++) {
      let x = -20;
      g.fillStyle = layer ? '#150a2a' : '#26124a';
      while (x < w + 20) {
        const bw = U.rand(24, 70), bh = U.rand(50, 200) * (layer ? 0.75 : 1);
        g.fillRect(x, h - bh, bw, bh);
        if (Math.random() < 0.3) g.fillRect(x + bw / 2 - 2, h - bh - 30, 4, 30); // antenna
        // tiny windows
        for (let i = 0; i < bh / 6; i++) {
          if (Math.random() < 0.5) continue;
          g.fillStyle = U.pick(['#ffd27a', '#6ae8ff', '#ff6ad8', '#9a7aff']);
          g.globalAlpha = layer ? 0.5 : 0.8;
          g.fillRect(x + U.rand(3, bw - 5), h - U.rand(4, bh - 4), 2, 2);
          g.globalAlpha = 1;
          g.fillStyle = layer ? '#150a2a' : '#26124a';
        }
        x += bw + U.rand(-6, 10);
      }
    }
  })));

  // the road: dark metal with glowing lane lines. 3 lanes of 2.4 m, plus 0.6 m of edge each side
  const road = () => once('road', () => {
    const t = tex(U.canvas(256, 512, (g, w, h) => {
      g.fillStyle = '#1a1830'; g.fillRect(0, 0, w, h);
      // metal plates
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`;
        g.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2);
      }
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 3;
      for (let y = 0; y < h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      const px = w / 8.4; // pixels per meter
      // edges
      g.fillStyle = '#ff3aa8';
      g.shadowColor = '#ff3aa8'; g.shadowBlur = 12;
      g.fillRect(0.45 * px, 0, 5, h); g.fillRect(w - 0.45 * px - 5, 0, 5, h);
      // lane lines (dashes)
      g.fillStyle = '#4af0ff'; g.shadowColor = '#4af0ff';
      for (const lx of [0.6 + 2.4, 0.6 + 4.8]) {
        for (let y = 0; y < h; y += 128) g.fillRect(lx * px - 3, y + 20, 6, 80);
      }
      g.shadowBlur = 0;
    }), true);
    return t;
  });

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

  return { glow, sky, skyline, road, windows, sign, hazard, trainSide, trainFront, ramp, boltIcon, icon };
})();
