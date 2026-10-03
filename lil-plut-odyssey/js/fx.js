// ============================================================
//  LIL' PLUT ODYSSEY — EFFECTS
//  Dust puffs, sparkles, stars, splashes, confetti, floating
//  "+1" numbers and the WAAAH! shock waves.
// ============================================================
window.LP = window.LP || {};

LP.FX = class {
  constructor() { this.list = []; this.texts = []; this.rings = []; }
  clear() { this.list.length = 0; this.texts.length = 0; this.rings.length = 0; }

  add(p) {
    if (this.list.length > 900) this.list.shift();
    p.t = 0; p.life = p.life || 0.6; p.rot = p.rot || 0; p.vr = p.vr || 0; p.g = p.g || 0; p.drag = p.drag || 0;
    this.list.push(p);
    return p;
  }

  dust(x, y, n, dir) {
    const U = LP.U;
    for (let i = 0; i < n; i++) {
      this.add({ kind: 'dust', x: x + U.rand(-8, 8), y: y - U.rand(0, 6), vx: (dir || U.rand(-1, 1)) * U.rand(30, 130) + U.rand(-30, 30),
        vy: U.rand(-90, -20), r: U.rand(5, 11), life: U.rand(0.35, 0.6), drag: 3, color: LP.game ? LP.game.theme.dust : '#fff' });
    }
  }
  sparkle(x, y, n, color) {
    const U = LP.U;
    for (let i = 0; i < n; i++) {
      const a = U.rand(0, Math.PI * 2), s = U.rand(60, 260);
      this.add({ kind: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: U.rand(2, 5), life: U.rand(0.3, 0.7), drag: 4, color: color || '#fff' });
    }
  }
  stars(x, y, n) {
    const U = LP.U;
    for (let i = 0; i < n; i++) {
      const a = U.rand(-Math.PI, 0), s = U.rand(120, 300);
      this.add({ kind: 'star', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 600, r: U.rand(6, 10), life: 0.8, vr: U.rand(-8, 8), color: '#ffe14a' });
    }
  }
  splash(x, y) {
    const U = LP.U;
    for (let i = 0; i < 26; i++) {
      this.add({ kind: 'drop', x: x + U.rand(-20, 20), y, vx: U.rand(-200, 200), vy: U.rand(-650, -200), g: 1600, r: U.rand(3, 7), life: 1, color: LP.game ? LP.game.theme.water : '#6cf' });
    }
  }
  confetti(x, y, n) {
    const U = LP.U, colors = ['#ff5a6e', '#ffd23f', '#4ad6ff', '#7cf05a', '#c77dff', '#fff'];
    for (let i = 0; i < n; i++) {
      const a = U.rand(-Math.PI * 0.9, -Math.PI * 0.1), s = U.rand(250, 750);
      this.add({ kind: 'confetti', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 700, drag: 1.6, r: U.rand(4, 8), life: U.rand(1.5, 2.6), vr: U.rand(-12, 12), color: U.pick(colors) });
    }
  }
  bits(x, y, n, colors) {
    // pieces of a broken box or cage
    const U = LP.U;
    for (let i = 0; i < n; i++) {
      this.add({ kind: 'bit', x: x + U.rand(-16, 16), y: y + U.rand(-16, 16), vx: U.rand(-260, 260), vy: U.rand(-600, -150), g: 1800, r: U.rand(5, 11), life: 1.1, vr: U.rand(-14, 14), color: U.pick(colors) });
    }
  }
  poof(x, y) {
    // an enemy disappears in a cloud
    const U = LP.U;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      this.add({ kind: 'dust', x, y, vx: Math.cos(a) * U.rand(80, 200), vy: Math.sin(a) * U.rand(80, 200), r: U.rand(10, 18), life: 0.55, drag: 4, color: '#ffffff' });
    }
    this.sparkle(x, y, 8, '#fff6a0');
  }
  text(x, y, str, color, size) {
    this.texts.push({ x, y, str, color: color || '#fff', size: size || 22, t: 0, life: 0.9 });
  }
  ring(x, y, color, maxR, life) {
    this.rings.push({ x, y, color, maxR: maxR || 300, t: 0, life: life || 0.6 });
  }

  update(dt) {
    for (const p of this.list) {
      p.t += dt;
      p.vy += p.g * dt;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    this.list = this.list.filter((p) => p.t < p.life);
    for (const t of this.texts) { t.t += dt; t.y -= 50 * dt; }
    this.texts = this.texts.filter((t) => t.t < t.life);
    for (const r of this.rings) r.t += dt;
    this.rings = this.rings.filter((r) => r.t < r.life);
  }

  draw(ctx) {
    for (const r of this.rings) {
      const k = r.t / r.life;
      ctx.strokeStyle = r.color; ctx.globalAlpha = (1 - k) * 0.9;
      ctx.lineWidth = 14 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.maxR * LP.U.backOut(Math.min(1, k * 1.2)) * 0.95 + 10, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of this.list) {
      const k = p.t / p.life;
      ctx.globalAlpha = p.kind === 'confetti' || p.kind === 'bit' ? Math.min(1, (1 - k) * 3) : 1 - k;
      ctx.fillStyle = p.color;
      if (p.kind === 'dust') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + k * 0.8), 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'spark') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 4);
        const s = p.r * (1 - k * 0.5);
        ctx.fillRect(-s * 2, -s * 0.35, s * 4, s * 0.7); ctx.fillRect(-s * 0.35, -s * 2, s * 0.7, s * 4);
        ctx.restore();
      } else if (p.kind === 'star') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); LP.Art.starShape(ctx, 0, 0, p.r, p.r * 0.45, 5); ctx.fill(); ctx.restore();
      } else if (p.kind === 'drop') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      } else if (p.kind === 'confetti' || p.kind === 'bit') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r * (p.kind === 'bit' ? 1.2 : 0.8));
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of this.texts) {
      const k = t.t / t.life;
      ctx.globalAlpha = Math.min(1, (1 - k) * 2.5);
      const s = t.size * (k < 0.15 ? LP.U.backOut(k / 0.15) : 1);
      ctx.font = `800 ${Math.round(s)}px ${LP.FONT}`;
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(40,20,60,0.85)'; ctx.lineJoin = 'round';
      ctx.strokeText(t.str, t.x, t.y); ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
};
