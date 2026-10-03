// =====================================================================
//  KIDS vs VIDEO GAMES: the video game characters that escaped the TV!
//  Everyone is drawn facing RIGHT, feet at (0, 0). The game flips them.
// =====================================================================

function drawEnemy(ctx, e, t) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const sc = e.scale || 1;
  ctx.scale(sc * (e.face || 1), sc);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const w = e.walk || 0;
  const frozen = e.freeze > 0, asleep = e.sleep > 0;
  if (!e.flies) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, 0, 0, e.shadow || 13, 3.5); ctx.fill(); }
  switch (e.type) {
    case 'puffy': drawPuffy(ctx, w, t, e); break;
    case 'plumbo': drawPlumbo(ctx, w, t, e); break;
    case 'spiky': drawSpiky(ctx, w, t, e); break;
    case 'zappy': drawZappy(ctx, w, t, e); break;
    case 'boomer': drawBoomer(ctx, w, t, e); break;
    case 'ghost': drawGhost(ctx, w, t, e); break;
    case 'wrench': drawWrench(ctx, w, t, e); break;
    case 'bolt': drawBolt(ctx, w, t, e); break;
    case 'ape': drawApe(ctx, w, t, e); break;
    case 'king': drawKing(ctx, w, t, e); break;
  }
  ctx.restore();
  // status effects (not flipped)
  if (frozen) {
    ctx.fillStyle = 'rgba(140,200,255,0.35)'; circ(ctx, e.x, e.y - (e.height || 30) / 2, (e.height || 30) * 0.6); ctx.fill();
    drawClock(ctx, e.x, e.y - (e.height || 30) - 8, 6);
  }
  if (asleep) {
    ctx.font = '700 12px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    const k = (t * 1.5) % 1;
    ctx.globalAlpha = 1 - k; ctx.fillText('z', e.x + 8 + k * 6, e.y - (e.height || 30) - k * 14); ctx.globalAlpha = 1;
    ctx.font = '700 9px sans-serif'; ctx.fillText('z', e.x + 4, e.y - (e.height || 30) - 4);
  }
  if (e.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${e.flash * 4})`;
    circ(ctx, e.x, e.y - (e.height || 30) / 2, (e.height || 30) * 0.45); ctx.fill();
  }
}

function drawClock(ctx, x, y, r) {
  ctx.fillStyle = '#e8f6ff'; circ(ctx, x, y, r); ctx.fill();
  ctx.strokeStyle = '#2a6bd6'; ctx.lineWidth = 1.5; ctx.stroke();
  line(ctx, x, y, x, y - r * 0.7); line(ctx, x, y, x + r * 0.5, y);
}

function eyeOval(ctx, x, y, rx, ry) {
  ctx.fillStyle = '#16102a'; ell(ctx, x, y, rx, ry); ctx.fill();
  ctx.fillStyle = '#2b5fd8'; ell(ctx, x, y + ry * 0.45, rx * 0.8, ry * 0.4); ctx.fill();
  ctx.fillStyle = '#fff'; ell(ctx, x, y - ry * 0.45, rx * 0.6, ry * 0.35); ctx.fill();
}

// A pink puffball hero who loves to eat everything
function drawPuffy(ctx, w, t, e) {
  const hop = Math.abs(Math.sin(w)) * 3;
  const fs = Math.sin(w) * 4;
  ctx.fillStyle = '#d6203c';
  ell(ctx, -6 - fs, -2.5, 6.5, 3.6); ctx.fill();
  ell(ctx, 6 + fs, -2.5, 6.5, 3.6); ctx.fill();
  ctx.translate(0, -hop);
  ctx.fillStyle = '#f27fac'; ell(ctx, -12, -15, 4.5, 3.5, 0.5); ctx.fill();
  const g = ctx.createRadialGradient(-4, -20, 2, 0, -15, 15);
  g.addColorStop(0, '#ffd0e2'); g.addColorStop(0.6, '#ff9ec4'); g.addColorStop(1, '#ee77a6');
  ctx.fillStyle = g; circ(ctx, 0, -15, 13); ctx.fill();
  ctx.strokeStyle = '#d65b8e'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = '#f27fac'; ell(ctx, 12, -13, 4.5, 3.5, -0.6); ctx.fill();
  eyeOval(ctx, 3, -18, 1.7, 3.7);
  eyeOval(ctx, 8, -18, 1.7, 3.7);
  ctx.fillStyle = 'rgba(255,80,130,0.55)'; ell(ctx, -1, -12.5, 2.6, 1.3); ctx.fill(); ell(ctx, 11, -12.5, 2, 1.2); ctx.fill();
  ctx.fillStyle = '#9a1838'; ell(ctx, 5.5, -11, 1.4, 1); ctx.fill();
}

// A jumpy plumber with a big mustache
function drawPlumbo(ctx, w, t, e) {
  const hop = e.jumping ? Math.sin(e.jumpT * Math.PI) * 22 : Math.abs(Math.sin(w)) * 1.5;
  const sw = Math.sin(w) * 5;
  ctx.translate(0, -hop);
  ctx.fillStyle = '#6b3a17';
  ell(ctx, -3 - sw, -2.5, 5, 3); ctx.fill(); ell(ctx, 4 + sw, -2.5, 5, 3); ctx.fill();
  ctx.fillStyle = '#2a55c8';
  rr(ctx, -6 - sw * 0.6, -13, 5, 11, 2); ctx.fill(); rr(ctx, 1 + sw * 0.6, -13, 5, 11, 2); ctx.fill();
  // back arm
  ctx.strokeStyle = '#d42a2a'; ctx.lineWidth = 4.5; line(ctx, -2, -24, -8 - sw * 0.5, -16);
  ctx.fillStyle = '#fff'; circ(ctx, -8 - sw * 0.5, -15, 2.6); ctx.fill();
  // body: red shirt + blue overalls
  ctx.fillStyle = '#d42a2a'; rr(ctx, -7, -28, 14, 10, 4); ctx.fill();
  ctx.fillStyle = '#2a55c8'; rr(ctx, -7.5, -22, 15, 12, 4); ctx.fill();
  ctx.fillRect(-5, -27, 2.5, 6); ctx.fillRect(2.5, -27, 2.5, 6);
  ctx.fillStyle = '#ffd23f'; circ(ctx, -3.7, -21.5, 1.3); ctx.fill(); circ(ctx, 3.7, -21.5, 1.3); ctx.fill();
  // head
  ctx.fillStyle = '#5a3216'; ell(ctx, -3.5, -33, 4.5, 5); ctx.fill();
  ctx.fillStyle = '#f6c69a'; circ(ctx, 0.5, -34, 7.5); ctx.fill();
  ctx.fillStyle = '#f0b282'; circ(ctx, 7.2, -33, 3.2); ctx.fill();
  ctx.fillStyle = '#2a1a0c';
  ctx.beginPath(); ctx.moveTo(1, -30.5); ctx.quadraticCurveTo(6, -32, 10, -29.5); ctx.quadraticCurveTo(7, -27.5, 4.5, -28.8); ctx.quadraticCurveTo(2.5, -27.5, 1, -30.5); ctx.fill();
  ctx.fillStyle = '#16102a'; ell(ctx, 4, -36, 1.1, 2); ctx.fill();
  ctx.fillStyle = '#f0b282'; ell(ctx, -3.5, -33.5, 1.6, 2.2); ctx.fill();
  // cap with a big "P"
  ctx.fillStyle = '#d42a2a';
  ctx.beginPath(); ctx.arc(0, -37.5, 8, Math.PI, 0); ctx.fill();
  ell(ctx, 6, -37.6, 6.5, 1.8); ctx.fill();
  ctx.fillStyle = '#fff'; circ(ctx, 1.5, -41, 2.8); ctx.fill();
  ctx.fillStyle = '#d42a2a'; ctx.font = '900 4.4px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('P', 1.5, -40.8);
  // front arm
  ctx.strokeStyle = '#d42a2a'; ctx.lineWidth = 4.5; line(ctx, 3, -24, 9 + sw * 0.5, -17);
  ctx.fillStyle = '#fff'; circ(ctx, 9.5 + sw * 0.5, -16, 2.7); ctx.fill();
}

// A super-fast blue hedgehog
function drawSpiky(ctx, w, t, e) {
  const run = w * 2.2;
  // legs spinning like a wheel
  ctx.strokeStyle = '#2350d8'; ctx.lineWidth = 3;
  for (let i = 0; i < 2; i++) {
    const a = run + i * Math.PI;
    const fx = Math.cos(a) * 6, fy = -4 + Math.sin(a) * 3;
    line(ctx, 0, -13, fx, fy);
    ctx.fillStyle = '#e02b2b'; ell(ctx, fx + 2, fy + 1, 5, 3); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(fx, fy - 0.5, 2.5, 2.5);
  }
  // spikes
  ctx.fillStyle = '#1f47c8';
  poly(ctx, [[-4, -32], [-22, -34], [-8, -27], [-24, -24], [-8, -21], [-20, -14], [-4, -16]]); ctx.fill();
  // body + head
  ctx.fillStyle = '#2a5ef0'; ell(ctx, -1, -15, 7, 6); ctx.fill();
  ctx.fillStyle = '#f2c99a'; ell(ctx, 1, -14, 4, 4); ctx.fill();
  const g = ctx.createRadialGradient(-2, -30, 2, 0, -26, 12);
  g.addColorStop(0, '#5a8bff'); g.addColorStop(1, '#2350d8');
  ctx.fillStyle = g; circ(ctx, 0, -26, 10.5); ctx.fill();
  poly(ctx, [[-3, -35], [-1, -42], [3, -35]]); ctx.fill();
  ctx.fillStyle = '#f2c99a'; ell(ctx, 6, -22.5, 5.5, 4); ctx.fill();
  ctx.fillStyle = '#111'; circ(ctx, 11.5, -24, 1.6); ctx.fill();
  // big eyes
  ctx.fillStyle = '#fff'; ell(ctx, 4.5, -29, 4.2, 4.8); ctx.fill();
  ctx.fillStyle = '#1aa04a'; ell(ctx, 6.5, -28.5, 1.8, 2.6); ctx.fill();
  ctx.fillStyle = '#111'; ell(ctx, 7, -28.5, 0.9, 1.6); ctx.fill();
  ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(5, -21); ctx.quadraticCurveTo(8, -19, 10, -21); ctx.stroke();
  // arm
  ctx.strokeStyle = '#f2c99a'; ctx.lineWidth = 2.5; line(ctx, 1, -17, 7, -12 + Math.sin(run) * 2);
  ctx.fillStyle = '#fff'; circ(ctx, 7.5, -11.5 + Math.sin(run) * 2, 2.3); ctx.fill();
  if (e.speedNow > 120) {
    ctx.strokeStyle = 'rgba(120,170,255,0.6)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) line(ctx, -28 - i * 4, -30 + i * 8, -42 - i * 6, -30 + i * 8);
  }
}

// A yellow electric mouse
function drawZappy(ctx, w, t, e) {
  const hop = Math.abs(Math.sin(w * 1.2)) * 2.5;
  ctx.fillStyle = '#e8b81f';
  ell(ctx, -4, -2, 4, 2.6); ctx.fill(); ell(ctx, 5, -2, 4, 2.6); ctx.fill();
  ctx.translate(0, -hop);
  // lightning tail
  ctx.fillStyle = '#f7d22b'; ctx.strokeStyle = '#a07a10'; ctx.lineWidth = 0.8;
  poly(ctx, [[-9, -12], [-16, -18], [-12, -20], [-20, -30], [-14, -31], [-22, -42], [-9, -30], [-14, -29], [-7, -19], [-10, -18]]);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#8a5a20'; poly(ctx, [[-9, -12], [-12, -16], [-8, -17]]); ctx.fill();
  // body + head
  ctx.fillStyle = '#ffd93b'; ell(ctx, 0, -12, 10, 10); ctx.fill();
  ctx.fillStyle = '#ffd93b'; circ(ctx, 4, -24, 9); ctx.fill();
  // ears
  for (const [bx, tx2] of [[0, -6], [6, 10]]) {
    ctx.fillStyle = '#ffd93b'; poly(ctx, [[bx - 2.5, -30], [tx2, -46], [bx + 3, -30]]); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; poly(ctx, [[tx2 + (bx - tx2) * 0.3 - 1.6, -41], [tx2, -46], [tx2 + (bx - tx2) * 0.3 + 1.8, -41]]); ctx.fill();
  }
  ctx.fillStyle = '#16102a'; circ(ctx, 8, -26, 1.9); ctx.fill();
  ctx.fillStyle = '#fff'; circ(ctx, 8.6, -26.7, 0.7); ctx.fill();
  ctx.fillStyle = '#ff3b3b'; circ(ctx, 10, -20.5, 2.8); ctx.fill();
  ctx.fillStyle = '#16102a'; circ(ctx, 12.6, -23, 0.7); ctx.fill();
  ctx.strokeStyle = '#16102a'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(10, -21, 2, 0.3, 1.4); ctx.stroke();
  ctx.fillStyle = '#e8b81f'; ell(ctx, 7, -12, 2.5, 2); ctx.fill();
  ctx.fillStyle = '#c89a18'; ctx.fillRect(-7, -8, 5, 1.6); ctx.fillRect(-6, -11, 5, 1.6);
  if (e.speedNow > 120 || Math.sin(t * 7) > 0.8) { // sparks
    ctx.strokeStyle = '#fff59a'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(12, -30); ctx.lineTo(16, -34); ctx.lineTo(14, -35); ctx.lineTo(19, -40); ctx.stroke();
  }
}

// A green pixel block monster that goes BOOM
function drawBoomer(ctx, w, t, e) {
  const hiss = e.hiss > 0;
  const flash = hiss && Math.floor(t * 12) % 2 === 0;
  const sw = Math.sin(w * 1.4) * 3;
  if (hiss) { const k = 1 + (1 - e.hiss) * 0.12; ctx.scale(k, k); }
  const greens = ['#4caf3c', '#5ec24a', '#3d9a32', '#6fd35a', '#378a2c'];
  const r = seeded(11);
  const block = (x, y, bw, bh) => {
    for (let i = 0; i < bw; i += 3) for (let j = 0; j < bh; j += 3) {
      ctx.fillStyle = flash ? '#f4fff0' : greens[Math.floor(r() * greens.length)];
      ctx.fillRect(x + i, y + j, Math.min(3, bw - i) + 0.2, Math.min(3, bh - j) + 0.2);
    }
  };
  block(-8 + sw, -9, 6, 9); block(2 - sw, -9, 6, 9);   // legs
  block(-6, -36, 12, 27);                                // body
  block(-9, -54, 18, 18);                                // head
  ctx.fillStyle = '#121212';                             // the face (looks at you)
  ctx.fillRect(-6, -49, 4.5, 4.5); ctx.fillRect(1.5, -49, 4.5, 4.5);
  ctx.fillRect(-1.5, -44.5, 3, 4.5); ctx.fillRect(-4.5, -42, 3, 4.5); ctx.fillRect(1.5, -42, 3, 4.5);
}

// A floating maze ghost
const GHOST_COLORS = ['#ff3b3b', '#ffb8de', '#3ee0ff', '#ffb347'];
function drawGhost(ctx, w, t, e) {
  const bob = Math.sin(t * 4 + e.id) * 3;
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ell(ctx, 0, 0, 11, 3); ctx.fill();
  ctx.translate(0, -26 + bob);
  ctx.fillStyle = GHOST_COLORS[e.id % 4];
  ctx.beginPath();
  ctx.arc(0, -6, 13, Math.PI, 0);
  ctx.lineTo(13, 10);
  for (let i = 0; i <= 4; i++) {
    const x = 13 - i * 6.5, k = (t * 8 + e.id) % 2 < 1 ? 1 : -1;
    ctx.lineTo(x - 3.25, 10 - 4 * (i % 2 ? k : -k) * 0.5 - 2);
    ctx.lineTo(x - 6.5, 10);
  }
  ctx.closePath(); ctx.fill();
  for (const ex of [-3, 6]) {
    ctx.fillStyle = '#fff'; ell(ctx, ex, -6, 3.6, 4.4); ctx.fill();
    ctx.fillStyle = '#2440d8'; circ(ctx, ex + 1.8, -5.5, 2); ctx.fill();
  }
}

// A furry hero with a giant wrench and a little robot friend on the back
function drawWrench(ctx, w, t, e) {
  const sw = Math.sin(w) * 5;
  // tail
  ctx.strokeStyle = '#d99a3c'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-6, -16); ctx.quadraticCurveTo(-18, -16 + Math.sin(t * 5) * 3, -20, -26); ctx.stroke();
  ctx.strokeStyle = '#6b4520'; ctx.lineWidth = 4.2; ctx.setLineDash([2.5, 3]);
  ctx.beginPath(); ctx.moveTo(-6, -16); ctx.quadraticCurveTo(-18, -16 + Math.sin(t * 5) * 3, -20, -26); ctx.stroke();
  ctx.setLineDash([]);
  // legs + boots
  ctx.strokeStyle = '#e6a84c'; ctx.lineWidth = 4.5;
  line(ctx, -2, -16, -4 - sw, -4); line(ctx, 3, -16, 4 + sw, -4);
  ctx.fillStyle = '#5a5f6a'; rr(ctx, -9 - sw, -6, 9, 5, 2); ctx.fill(); rr(ctx, 1 + sw, -6, 9, 5, 2); ctx.fill();
  // little robot on the back
  ctx.fillStyle = '#b8c0cc'; rr(ctx, -15, -38, 11, 10, 3); ctx.fill();
  ctx.fillStyle = '#8a929e'; rr(ctx, -13, -30, 7, 8, 2); ctx.fill();
  ctx.fillStyle = '#5cff8a'; circ(ctx, -11, -34, 1.5); ctx.fill(); circ(ctx, -7, -34, 1.5); ctx.fill();
  ctx.strokeStyle = '#8a929e'; ctx.lineWidth = 1; line(ctx, -9.5, -38, -9.5, -42);
  ctx.fillStyle = '#ff4a4a'; circ(ctx, -9.5, -42.5, 1.2); ctx.fill();
  // body (with a vest)
  ctx.fillStyle = '#e6a84c'; rr(ctx, -6, -30, 12, 16, 4); ctx.fill();
  ctx.fillStyle = '#4a5a6a'; rr(ctx, -6, -28, 12, 9, 3); ctx.fill();
  ctx.fillStyle = '#c0c8d4'; ctx.fillRect(-6, -21, 12, 2);
  // head with big striped ears
  ctx.fillStyle = '#e6a84c';
  poly(ctx, [[-4, -40], [-14, -56], [-1, -44]]); ctx.fill();
  poly(ctx, [[0, -42], [-4, -60], [5, -43]]); ctx.fill();
  ctx.strokeStyle = '#6b4520'; ctx.lineWidth = 1.2;
  line(ctx, -9, -50, -5, -48); line(ctx, -2, -52, 1, -51);
  circ(ctx, 2, -37, 7.5); ctx.fill();
  ctx.fillStyle = '#f4e0b8'; ell(ctx, 7, -34.5, 4.5, 3.4); ctx.fill();
  ctx.fillStyle = '#222'; circ(ctx, 11, -35.5, 1.1); ctx.fill();
  ctx.fillStyle = '#fff'; ell(ctx, 5, -39, 2.4, 2.2); ctx.fill();
  ctx.fillStyle = '#2aa04a'; circ(ctx, 5.8, -38.8, 1.3); ctx.fill();
  ctx.fillStyle = '#111'; circ(ctx, 6, -38.8, 0.6); ctx.fill();
  ctx.strokeStyle = '#6b4520'; ctx.lineWidth = 1; line(ctx, -1, -43, 1, -40); line(ctx, -4, -38, -1, -37);
  // the big wrench
  const a = -0.9 + Math.sin(w) * 0.25;
  ctx.save(); ctx.translate(6, -24); ctx.rotate(a);
  ctx.fillStyle = '#9aa4b2'; rr(ctx, -1.6, -24, 3.2, 26, 1.4); ctx.fill();
  ctx.fillStyle = '#c4ccd8';
  ctx.beginPath(); ctx.arc(0, -26, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a3140'; rr(ctx, -1.8, -33, 3.6, 7, 1); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#e6a84c'; circ(ctx, 6, -24, 2.6); ctx.fill();
}

// The little robot, now walking on its own
function drawBolt(ctx, w, t, e) {
  const sw = Math.sin(w * 1.5) * 3;
  ctx.fillStyle = '#7a828e'; rr(ctx, -5 - sw, -7, 4, 7, 1.5); ctx.fill(); rr(ctx, 1 + sw, -7, 4, 7, 1.5); ctx.fill();
  ctx.fillStyle = '#b8c0cc'; rr(ctx, -6, -17, 12, 11, 3); ctx.fill();
  ctx.fillStyle = '#c8d0dc'; rr(ctx, -8, -31, 16, 14, 5); ctx.fill();
  ctx.fillStyle = '#2a3140'; rr(ctx, -5, -28, 12, 7, 3); ctx.fill();
  ctx.fillStyle = '#5cff8a'; circ(ctx, -1, -24.5, 1.8); ctx.fill(); circ(ctx, 4, -24.5, 1.8); ctx.fill();
  ctx.strokeStyle = '#8a929e'; ctx.lineWidth = 1.2; line(ctx, 0, -31, 0, -36);
  ctx.fillStyle = Math.floor(t * 3) % 2 ? '#ff4a4a' : '#5cff8a'; circ(ctx, 0, -37, 1.6); ctx.fill();
  ctx.strokeStyle = '#9aa4b2'; ctx.lineWidth = 2.2; line(ctx, 6, -14, 9, -8 + sw); line(ctx, -6, -14, -9, -8 - sw);
}

// BOSS: a giant ape with a red tie who throws barrels
function drawApe(ctx, w, t, e) {
  const sw = Math.sin(w) * 6;
  const throwing = e.throwT > 0;
  ctx.fillStyle = '#5a3418';
  rr(ctx, -16 - sw, -26, 12, 26, 5); ctx.fill(); rr(ctx, 4 + sw, -26, 12, 26, 5); ctx.fill();
  ctx.fillStyle = '#c9925a'; ell(ctx, -10 - sw, -2, 8, 3.5); ctx.fill(); ell(ctx, 10 + sw, -2, 8, 3.5); ctx.fill();
  // back arm
  ctx.strokeStyle = '#4a2a12'; ctx.lineWidth = 11;
  line(ctx, -14, -58, -22 + sw * 0.5, -22);
  ctx.fillStyle = '#c9925a'; circ(ctx, -22 + sw * 0.5, -18, 6.5); ctx.fill();
  // body
  const g = ctx.createRadialGradient(-5, -55, 5, 0, -45, 34);
  g.addColorStop(0, '#7a4a24'); g.addColorStop(1, '#4a2a12');
  ctx.fillStyle = g; ell(ctx, 0, -46, 28, 26); ctx.fill();
  ctx.fillStyle = '#c9925a'; ell(ctx, 6, -40, 15, 16); ctx.fill();
  // red tie
  ctx.fillStyle = '#d4202a';
  poly(ctx, [[2, -62], [12, -62], [10, -56], [13, -34], [7, -28], [2, -34], [4, -56]]); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.font = '900 7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('A', 7.5, -44);
  // head
  ctx.fillStyle = '#5a3418'; circ(ctx, 12, -74, 15); ctx.fill();
  poly(ctx, [[2, -86], [6, -96], [10, -86], [14, -95], [18, -86]]); ctx.fill();
  ctx.fillStyle = '#c9925a'; ell(ctx, 18, -70, 11, 9); ctx.fill(); ell(ctx, 15, -79, 8, 5); ctx.fill();
  ctx.fillStyle = '#fff'; ell(ctx, 13, -79, 3.4, 4); ctx.fill(); ell(ctx, 20, -79, 3.4, 4); ctx.fill();
  ctx.fillStyle = '#2a1608'; circ(ctx, 14.5, -78.5, 1.8); ctx.fill(); circ(ctx, 21.5, -78.5, 1.8); ctx.fill();
  ctx.strokeStyle = '#2a1608'; ctx.lineWidth = 2.2; line(ctx, 9, -85, 17, -83); line(ctx, 25, -85, 18, -83);
  ctx.fillStyle = '#2a1608'; circ(ctx, 22, -72, 1.2); ctx.fill(); circ(ctx, 25, -72, 1.2); ctx.fill();
  ctx.fillStyle = '#7a1a1a'; ell(ctx, 20, -65, 7, throwing ? 4 : 2.2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(15, -67, 10, 1.6);
  // front arm (holding a barrel when throwing)
  ctx.strokeStyle = '#5a3418'; ctx.lineWidth = 12;
  if (throwing) {
    line(ctx, 14, -58, 22, -92);
    drawBarrel(ctx, 22, -102, 1);
  } else {
    line(ctx, 14, -58, 26 - sw * 0.5, -22);
    ctx.fillStyle = '#c9925a'; circ(ctx, 26 - sw * 0.5, -18, 7); ctx.fill();
  }
}

function drawBarrel(ctx, x, y, s) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = '#b5702c'; rr(ctx, -10, -8, 20, 16, 5); ctx.fill();
  ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.6;
  line(ctx, -10, -4, 10, -4); line(ctx, -10, 4, 10, 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; line(ctx, -4, -8, -4, 8); line(ctx, 4, -8, 4, 8);
  ctx.restore();
}

// FINAL BOSS: the spiky turtle king who breathes fire
function drawKing(ctx, w, t, e) {
  const sw = Math.sin(w) * 6;
  const fire = e.fireT > 0;
  // legs
  ctx.fillStyle = '#e8b830';
  rr(ctx, -20 - sw, -24, 14, 24, 6); ctx.fill(); rr(ctx, 6 + sw, -24, 14, 24, 6); ctx.fill();
  ctx.fillStyle = '#fff';
  for (const fx of [-20 - sw, 6 + sw]) for (let i = 0; i < 3; i++) poly(ctx, [[fx + 2 + i * 4.5, -2], [fx + 4 + i * 4.5, 3], [fx + 6 + i * 4.5, -2]]), ctx.fill();
  // spiky green shell
  ctx.fillStyle = '#2f9a3a'; ell(ctx, -14, -58, 30, 34); ctx.fill();
  ctx.strokeStyle = '#f2e6c8'; ctx.lineWidth = 4; ell(ctx, -14, -58, 30, 34); ctx.stroke();
  ctx.fillStyle = '#f7f2e4';
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * (0.6 + i * 0.22);
    const bx = -14 + Math.cos(a) * 24, by = -58 + Math.sin(a) * 26;
    poly(ctx, [[bx - 4, by], [bx + Math.cos(a) * 16, by + Math.sin(a) * 16], [bx + 4, by]]); ctx.fill();
  }
  // belly
  ctx.fillStyle = '#f2d98a'; ell(ctx, 4, -50, 18, 26); ctx.fill();
  ctx.strokeStyle = '#c9a850'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) line(ctx, -10, -66 + i * 10, 18, -66 + i * 10);
  // arms with spiky bracelets
  ctx.strokeStyle = '#e8b830'; ctx.lineWidth = 10; line(ctx, 10, -66, 26 + sw * 0.4, -46);
  ctx.fillStyle = '#222'; circ(ctx, 22, -50, 6); ctx.fill();
  ctx.fillStyle = '#fff'; poly(ctx, [[18, -55], [22, -62], [26, -55]]); ctx.fill();
  ctx.fillStyle = '#f6e6c8'; circ(ctx, 28 + sw * 0.4, -44, 5); ctx.fill();
  // head
  ctx.fillStyle = '#e8b830'; ell(ctx, 18, -92, 17, 15); ctx.fill();
  ctx.fillStyle = '#f2d98a'; ell(ctx, 28, -86, 10, 8); ctx.fill();
  // red hair
  ctx.fillStyle = '#e8402a';
  poly(ctx, [[2, -104], [-10, -112], [0, -98], [-12, -96], [2, -92], [-6, -84], [6, -88]]); ctx.fill();
  // horns
  ctx.fillStyle = '#fff4dc';
  poly(ctx, [[10, -104], [4, -122], [16, -106]]); ctx.fill();
  poly(ctx, [[20, -106], [22, -124], [27, -104]]); ctx.fill();
  // angry eyes
  ctx.fillStyle = '#fff'; ell(ctx, 22, -98, 4.5, 5); ctx.fill();
  ctx.fillStyle = '#c81010'; circ(ctx, 24, -97, 2.4); ctx.fill();
  ctx.fillStyle = '#111'; circ(ctx, 24.5, -97, 1.2); ctx.fill();
  ctx.strokeStyle = '#e8402a'; ctx.lineWidth = 3; line(ctx, 15, -106, 28, -101);
  // mouth with fangs
  ctx.fillStyle = '#7a1010'; ell(ctx, 30, -82, 8, fire ? 6 : 2.5); ctx.fill();
  ctx.fillStyle = '#fff';
  poly(ctx, [[25, -84.5], [27, -79], [29, -84.5]]); ctx.fill();
  poly(ctx, [[31, -84.5], [33, -79], [35, -84.5]]); ctx.fill();
  ctx.fillStyle = '#5a2a0a'; circ(ctx, 34, -90, 1.3); ctx.fill(); circ(ctx, 37, -89, 1.3); ctx.fill();
}
