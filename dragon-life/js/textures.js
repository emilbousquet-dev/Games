// ============================================================
//  DRAGON LIFE — textures, all painted with code (no image files!)
// ============================================================
window.DL = window.DL || {};

DL.Tex = (function () {
  const U = DL.U;
  const T = {};

  function noiseFill(g, w, h, base, amount, size = 1) {
    for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) {
      const k = (Math.random() - 0.5) * amount;
      g.fillStyle = `rgba(${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${k > 0 ? 255 : 0},${Math.abs(k)})`;
      g.fillRect(x, y, size, size);
    }
  }

  function init() {
    // wooden planks
    T.planks = U.tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#b07a48'; g.fillRect(0, 0, w, h);
      const rows = 4;
      for (let i = 0; i < rows; i++) {
        const y = i * h / rows;
        g.fillStyle = `hsl(28, ${40 + Math.random() * 15}%, ${42 + Math.random() * 10}%)`;
        g.fillRect(0, y, w, h / rows);
        for (let k = 0; k < 30; k++) { // wood lines
          g.strokeStyle = `rgba(70,40,15,${0.1 + Math.random() * 0.15})`;
          g.beginPath(); const yy = y + Math.random() * h / rows;
          g.moveTo(0, yy); g.bezierCurveTo(w * 0.3, yy + (Math.random() - 0.5) * 6, w * 0.6, yy + (Math.random() - 0.5) * 6, w, yy); g.stroke();
        }
        g.fillStyle = 'rgba(40,20,5,0.8)'; g.fillRect(0, y, w, 3);
        const cut = Math.random() * w;
        g.fillRect(cut, y, 3, h / rows);
        g.fillStyle = 'rgba(40,20,5,0.6)';
        g.beginPath(); g.arc(cut - 12, y + 12, 2.5, 0, 7); g.arc(cut + 14, y + 12, 2.5, 0, 7); g.fill();
      }
    }));
    // stone blocks
    T.stone = U.tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#6d6a64'; g.fillRect(0, 0, w, h);
      const rows = 5;
      for (let r = 0; r < rows; r++) {
        let x = r % 2 ? -30 : 0;
        while (x < w) {
          const bw = 50 + Math.random() * 40;
          g.fillStyle = `hsl(${30 + Math.random() * 20}, ${6 + Math.random() * 8}%, ${44 + Math.random() * 16}%)`;
          U.rrectFill(g, x + 3, r * h / rows + 3, bw - 6, h / rows - 6, 6);
          x += bw;
        }
      }
      noiseFill(g, w, h, 0, 0.12, 2);
    }));
    // straw roof
    T.thatch = U.tex(U.canvas(256, 256, (g, w, h) => {
      g.fillStyle = '#c99b4a'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) {
        g.strokeStyle = `hsla(${36 + Math.random() * 12}, 60%, ${35 + Math.random() * 35}%, 0.8)`;
        g.lineWidth = 1 + Math.random() * 1.5;
        const x = Math.random() * w, y = Math.random() * h;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 6, y + 14 + Math.random() * 14); g.stroke();
      }
      for (let r = 0; r < 4; r++) { g.fillStyle = 'rgba(60,35,10,0.35)'; g.fillRect(0, r * 64 + 58, w, 6); }
    }));
    // dragon scales (gray, the color comes from the material so every dragon can have its own color)
    T.scales = U.tex(U.canvas(128, 128, (g, w, h) => {
      g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, w, h);
      const s = 16;
      for (let y = -1; y < h / s * 1.6 + 1; y++) for (let x = -1; x < w / s + 1; x++) {
        const cx = x * s + (y % 2 ? s / 2 : 0), cy = y * s * 0.62;
        const gr = g.createRadialGradient(cx, cy - 4, 1, cx, cy, s * 0.72);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.75, '#cfcfcf'); gr.addColorStop(1, '#7a7a7a');
        g.fillStyle = gr;
        g.beginPath(); g.arc(cx, cy, s * 0.62, 0, Math.PI); g.fill();
      }
    }), 3);
    // the soft round dot used for sparks, fire and fireflies
    T.dot = U.tex(U.canvas(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    }), 0, false);
    // a little heart
    T.heart = U.tex(U.canvas(64, 64, (g) => {
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(32, 54);
      g.bezierCurveTo(4, 36, 6, 8, 22, 10);
      g.bezierCurveTo(28, 10, 32, 16, 32, 20);
      g.bezierCurveTo(32, 16, 36, 10, 42, 10);
      g.bezierCurveTo(58, 8, 60, 36, 32, 54);
      g.fill();
    }), 0, false);
    // a star (for sparkles)
    T.star = U.tex(U.canvas(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#fff';
      g.beginPath(); g.moveTo(32, 2); g.lineTo(36, 28); g.lineTo(62, 32); g.lineTo(36, 36); g.lineTo(32, 62); g.lineTo(28, 36); g.lineTo(2, 32); g.lineTo(28, 28); g.closePath(); g.fill();
    }), 0, false);
    // the ground: tiny grass blades, little pebbles and soft patches (it gets its color from the land)
    T.ground = U.tex(U.canvas(512, 512, (g, w, h) => {
      g.fillStyle = '#d4d4d4'; g.fillRect(0, 0, w, h);
      // soft light and dark patches
      for (let i = 0; i < 60; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = 20 + Math.random() * 60;
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const v = Math.random() < 0.5 ? '255,255,255' : '150,150,150';
        gr.addColorStop(0, `rgba(${v},0.18)`); gr.addColorStop(1, `rgba(${v},0)`);
        g.fillStyle = gr;
        for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) { g.save(); g.translate(ox, oy); g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); }
      }
      // grass blades
      for (let i = 0; i < 9000; i++) {
        const x = Math.random() * w, y = Math.random() * h, len = 3 + Math.random() * 7, a = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
        const v = 165 + Math.random() * 90;
        g.strokeStyle = `rgba(${v},${v},${v},0.55)`;
        g.lineWidth = 1 + Math.random() * 0.8;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
      }
      // little pebbles
      for (let i = 0; i < 400; i++) {
        const v = 120 + Math.random() * 120;
        g.fillStyle = `rgba(${v},${v},${v},0.7)`;
        g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 1.8, 0.6 + Math.random() * 1.2, Math.random() * 3, 0, 7); g.fill();
      }
    }), 0, true);
    T.ground.repeat.set(1, 1);
  }

  return { init, T };
})();

DL.U.rrectFill = function (g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
};
