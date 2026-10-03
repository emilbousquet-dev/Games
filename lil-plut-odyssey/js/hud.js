// ============================================================
//  LIL' PLUT ODYSSEY — HUD
//  Hearts, the WAAAH! meter, milk, ducks, boss health,
//  the level name and the words on signs.
// ============================================================
window.LP = window.LP || {};

LP.HUD = (function () {
  const A = LP.Art, U = LP.U, VH = LP.VH;

  function text(c, str, x, y, size, color, align, stroke) {
    c.font = `800 ${size}px ${LP.FONT}`;
    c.textAlign = align || 'left'; c.textBaseline = 'middle';
    c.lineJoin = 'round';
    const lw = stroke === undefined ? Math.max(4, size * 0.18) : stroke;
    if (lw > 0) { c.lineWidth = lw; c.strokeStyle = 'rgba(40,16,60,0.9)'; c.strokeText(str, x, y); }
    c.fillStyle = color || '#fff'; c.fillText(str, x, y);
  }

  function wrap(c, str, maxW) {
    const words = str.split(' '), lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (c.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function draw(c, g, W, dt) {
    const p = g.player, t = g.time;
    // ---- hearts ----
    for (let i = 0; i < LP.MOVE.hearts; i++) {
      const full = i < p.hearts;
      c.globalAlpha = full ? 1 : 0.35;
      A.heart(c, 40 + i * 42, 38, full && p.hearts === 1 ? t * 2 : 0, 1.45);
    }
    c.globalAlpha = 1;
    // ---- WAAAH! meter ----
    const mx = 22, my = 66, mw = 170, mh = 18;
    const shakeX = (g.flash.scream > 0) ? Math.sin(t * 80) * 4 : 0;
    c.save(); c.translate(shakeX, 0);
    c.fillStyle = 'rgba(30,14,50,0.7)'; c.beginPath(); c.roundRect(mx, my, mw, mh, 9); c.fill();
    const k = p.scream / 100;
    if (k > 0) {
      const gr = c.createLinearGradient(mx, 0, mx + mw, 0);
      gr.addColorStop(0, '#ffd23f'); gr.addColorStop(1, '#ff5ab0');
      c.fillStyle = gr; c.beginPath(); c.roundRect(mx + 3, my + 3, (mw - 6) * k, mh - 6, 6); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(mx + mw / 2 - 1, my + 2, 2, mh - 4);
    if (p.scream >= 50) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 6);
      c.strokeStyle = `rgba(255,230,120,${0.5 + pulse * 0.5})`; c.lineWidth = 2.5; c.beginPath(); c.roundRect(mx - 1, my - 1, mw + 2, mh + 2, 10); c.stroke();
    }
    text(c, p.scream >= 50 ? 'WAAAH! ready (C)' : 'WAAAH!', mx + 4, my + mh + 14, 15, p.scream >= 50 ? '#ffe14a' : 'rgba(255,255,255,0.75)', 'left', 4);
    if (g.flash.scream > 0) text(c, 'need more milk!', mx + mw + 12, my + 9, 16, '#ff9ab0');
    c.restore();

    // ---- milk ----
    const pop = g.flash.milk > 0 ? 1 + g.flash.milk * 0.4 : 1;
    A.milk(c, W / 2 - 46, 40, 0, g.chocT > 0);
    c.save(); c.translate(W / 2 - 22, 40); c.scale(pop, pop);
    text(c, String(g.milk), 0, 2, 40, g.chocT > 0 ? '#ffcf8a' : '#ffffff');
    c.restore();
    if (g.chocT > 0) {
      text(c, 'CHOCOLATE MILK x2', W / 2, 82, 17, '#ffcf3a', 'center');
      c.fillStyle = 'rgba(30,14,50,0.6)'; c.fillRect(W / 2 - 80, 96, 160, 6);
      c.fillStyle = '#ffcf3a'; c.fillRect(W / 2 - 80, 96, 160 * g.chocT / 10, 6);
    }

    // ---- ducks ----
    if (g.def.type === 'normal') {
      const saved = LP.Save.levelDucks(g.levelIndex);
      for (let i = 0; i < 3; i++) {
        const x = W - 130 + i * 44, y = 40;
        c.fillStyle = 'rgba(30,14,50,0.5)'; A.circle(c, x, y, 20); c.fill();
        if (g.ducksFound[i] || saved[i]) { c.globalAlpha = g.ducksFound[i] ? 1 : 0.5; A.duck(c, x + 2, y + 6, 1, 0, 0); c.globalAlpha = 1; }
        else text(c, '?', x, y + 1, 20, 'rgba(255,255,255,0.4)', 'center', 0);
      }
    }

    // ---- level name at the start ----
    const lt = g.levelT;
    if (lt < 3.6) {
      const a = lt < 0.4 ? lt / 0.4 : lt > 3 ? (3.6 - lt) / 0.6 : 1;
      c.globalAlpha = Math.max(0, a);
      const y = VH * 0.3 - (1 - Math.min(1, lt / 0.4)) * 30;
      text(c, `${g.def.id}  ·  ${LP.WORLDS[g.def.world].name.toUpperCase()}`, W / 2, y - 40, 22, '#ffe7a0', 'center');
      text(c, g.def.name, W / 2, y + 6, 58, '#ffffff', 'center');
      if (g.def.type === 'chase') text(c, 'RUN!!! DON\'T GET CAUGHT!', W / 2, y + 62, 28, '#ff7a8a', 'center');
      c.globalAlpha = 1;
    }

    // ---- boss health ----
    const b = g.boss;
    if (b && b.state !== 'dead') {
      const bw = Math.min(520, W - 80), bx = W / 2 - bw / 2, by = VH - 52;
      text(c, b.name, W / 2, by - 18, 24, '#ffd0d0', 'center');
      c.fillStyle = 'rgba(30,14,50,0.75)'; c.beginPath(); c.roundRect(bx, by, bw, 20, 10); c.fill();
      c.fillStyle = '#ff4f6a'; c.beginPath(); c.roundRect(bx + 3, by + 3, (bw - 6) * Math.max(0, b.hp) / b.maxHp, 14, 7); c.fill();
      if (b.state === 'intro') text(c, 'Make him DIZZY with a SCREAM (C), then SLAP him!', W / 2, VH * 0.5, 24, '#ffe14a', 'center');
    }
    if (g.player.state === 'bubble' && g.player.stateT > 0.2) text(c, 'POP!', W / 2, VH * 0.4, 46, '#bfe8ff', 'center');
  }

  // the words on a sign, in a speech bubble
  function signBubble(c, s, g) {
    c.font = `700 19px ${LP.FONT}`;
    const lines = wrap(c, s.text, 330);
    const w = Math.max(...lines.map((l) => c.measureText(l).width)) + 36, h = lines.length * 25 + 24;
    let x = s.cx - w / 2;
    const y = s.y - h - 30;
    x = U.clamp(x, g.cam.x + 10, g.cam.x + g.viewW - w - 10);
    c.fillStyle = 'rgba(255,250,240,0.97)';
    c.strokeStyle = '#7a4a2a'; c.lineWidth = 3;
    c.beginPath(); c.roundRect(x, y, w, h, 16); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(s.cx - 10, y + h - 1.5); c.lineTo(s.cx, y + h + 16); c.lineTo(s.cx + 10, y + h - 1.5); c.fill();
    c.fillStyle = '#3a2050'; c.textAlign = 'left'; c.textBaseline = 'top';
    lines.forEach((l, i) => c.fillText(l, x + 18, y + 13 + i * 25));
  }

  return { draw, signBubble, text, wrap };
})();
