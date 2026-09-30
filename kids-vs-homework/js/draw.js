// =====================================================================
//  KIDS vs HOMEWORK: every picture in the game is drawn here with code
// =====================================================================

const FONT = (size, weight) =>
  `${weight || 'bold'} ${size}px "Comic Sans MS", "Chalkboard SE", "Comic Neue", "Trebuchet MS", sans-serif`;

// ---------------- little drawing helpers ----------------
function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
function ell(ctx, x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, Math.PI * 2); }
function line(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function text(ctx, str, x, y, size, fill, opts) {
  opts = opts || {};
  ctx.font = FONT(size, opts.weight);
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = opts.base || 'middle';
  if (opts.stroke !== false) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = opts.lw || Math.max(3, size / 6);
    ctx.strokeStyle = opts.stroke || '#2b1740';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
}
// Writes text on several lines so it fits in maxW
function wrapText(ctx, str, x, y, maxW, size, fill, opts) {
  ctx.font = FONT(size, (opts && opts.weight) || 'bold');
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  lines.forEach((l, i) => text(ctx, l, x, y + i * size * 1.25, size, fill, opts));
  return lines.length;
}
function starPath(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (rot || 0) + i * Math.PI / 5 - Math.PI / 2;
    const rad = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
  }
  ctx.closePath();
}
function drawCookie(ctx, x, y, r) {
  ctx.fillStyle = '#b87333'; circ(ctx, x, y, r); ctx.fill();
  ctx.fillStyle = '#e3a95e'; circ(ctx, x - r * 0.06, y - r * 0.06, r * 0.88); ctx.fill();
  ctx.fillStyle = '#4a2a14';
  for (const [cx, cy] of [[-0.4, -0.3], [0.3, -0.45], [0.1, 0.1], [-0.35, 0.35], [0.45, 0.3], [-0.05, -0.62]]) {
    circ(ctx, x + cx * r, y + cy * r, r * 0.13); ctx.fill();
  }
}
function drawStar(ctx, x, y, r, rot, fill, stroke) {
  starPath(ctx, x, y, r, rot);
  ctx.fillStyle = fill || '#ffd93b'; ctx.fill();
  ctx.strokeStyle = stroke || '#e09a00'; ctx.lineWidth = Math.max(1, r / 6); ctx.stroke();
}
function drawPencil(ctx, x, y, rot, s) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s || 1, s || 1);
  ctx.fillStyle = '#ffcf33'; ctx.fillRect(-12, -3, 20, 6);
  ctx.fillStyle = '#f0b400'; ctx.fillRect(-12, 1, 20, 2);
  ctx.fillStyle = '#e7a2b0'; ctx.fillRect(-17, -3, 5, 6);
  ctx.fillStyle = '#b8b8b8'; ctx.fillRect(-13, -3, 3, 6);
  ctx.fillStyle = '#f2d2a0';
  ctx.beginPath(); ctx.moveTo(8, -3); ctx.lineTo(16, 0); ctx.lineTo(8, 3); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.moveTo(13, -1.2); ctx.lineTo(16, 0); ctx.lineTo(13, 1.2); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function drawBalloon(ctx, x, y, r) {
  ctx.fillStyle = '#3b8cff'; circ(ctx, x, y, r); ctx.fill();
  ctx.fillStyle = '#2a6ad0'; ctx.beginPath(); ctx.moveTo(x - 2, y + r - 1); ctx.lineTo(x + 2, y + r - 1); ctx.lineTo(x, y + r + 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ell(ctx, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.2, -0.6); ctx.fill();
}

// A space picture, like Mio's hoodie
function drawSpacePattern(ctx, cx, cy, w, h) {
  const sw = [['#3fb3a6', -0.3, -0.3, 0.4, 0.14, 0.4], ['#e8dcc4', 0.25, 0.25, 0.35, 0.1, -0.3],
              ['#2f8f9c', 0.2, -0.35, 0.3, 0.1, 0.2], ['#3fb3a6', -0.2, 0.35, 0.35, 0.1, -0.2],
              ['#9fe3d4', 0.35, -0.05, 0.2, 0.06, 0.5]];
  ctx.globalAlpha = 0.85;
  for (const [c, sx, sy, rx, ry, rot] of sw) {
    ctx.fillStyle = c; ell(ctx, cx + sx * w, cy + sy * h, rx * w, ry * h * 1.6, rot); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#efe6cf'; circ(ctx, cx - 0.15 * w, cy + 0.02 * h, Math.min(w, h) * 0.13); ctx.fill();
  ctx.fillStyle = '#fff';
  for (const [sx, sy] of [[-0.38, -0.4], [0.32, -0.1], [-0.05, -0.3], [0.38, 0.4], [-0.4, 0.15], [0.1, 0.42]]) {
    circ(ctx, cx + sx * w, cy + sy * h, 0.9); ctx.fill();
  }
}

// =====================================================================
//  THE KIDS
//  (cartoon versions of Natti, Mio and Bill, plus a few helpers)
// =====================================================================
const LOOKS = {
  natti: {
    skin: '#b27a50', hair: 'curly', hairColor: '#3b2616',
    top: '#1f7c72', topDark: '#155a53', pattern: 'zip',
    pants: '#a9a9a4', shoes: '#2f6fe0', shoeAccent: '#c8f04a',
    face: 'grumpy', hold: 'pencil', watch: true,
  },
  mio: {
    skin: '#f1cdb0', hair: 'hood', hairColor: '#e6c46f',
    top: '#23325e', topDark: '#172246', pattern: 'space',
    pants: '#8c8f92', shorts: true, socks: '#6cd66c', shoes: '#1d1d22',
    face: 'smile', hold: 'star',
  },
  bill: {
    skin: '#f6d6c0', hair: 'bangs', hairColor: '#d6ae5c',
    top: '#1f4a36', topDark: '#163627', pattern: 'quilt',
    pants: '#e6e6e8', shoes: '#b9d8c8',
    face: 'scream', glasses: true, backpack: '#2b4fa8', hold: 'phone',
  },
  snack: {
    skin: '#e2ad80', hair: 'cap', hairColor: '#5a3a22', capColor: '#e0413a',
    top: '#f2a33a', topDark: '#c97f1e', pattern: 'plain',
    pants: '#3d5a99', shoes: '#e8e8e8', face: 'happy', hold: 'cookie',
  },
  gamer: {
    skin: '#8a5a3a', hair: 'phones', hairColor: '#1e1410',
    top: '#8a3fc4', topDark: '#6a2b9a', pattern: 'plain',
    pants: '#333a48', shoes: '#e84a5f', face: 'focus', hold: 'controller', seat: true,
  },
  splash: {
    skin: '#f5d4bb', hair: 'messy', hairColor: '#d9652b',
    top: '#f4d03f', topDark: '#caa72a', pattern: 'raincoat',
    pants: '#4a78c2', shoes: '#2e8b57', face: 'happy', hold: 'balloon', freckles: true,
  },
};

// x, y = where the feet touch the floor. s = size.
// st = { phase, act (attack animation 0..1), shake, alpha, fuse }
function drawKid(ctx, type, x, y, s, t, st) {
  st = st || {};
  if (type === 'eraser') { drawEraser(ctx, x, y, s, t, st); return; }
  const L = LOOKS[type];
  const ph = st.phase || 0, act = st.act || 0;
  const bob = Math.sin(t * 3 + ph) * 1.3;
  ctx.save();
  ctx.translate(x + (st.shake ? Math.sin(t * 60) * 1.5 : 0), y);
  ctx.scale(s, s);
  if (st.alpha != null) ctx.globalAlpha = st.alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, 0, 0, 28, 7); ctx.fill();

  const sit = !!L.seat;
  const hip = sit ? -26 : -36;
  if (sit) { // beanbag chair
    ctx.fillStyle = '#d6407e'; ell(ctx, 0, -14, 38, 18); ctx.fill();
    ctx.fillStyle = '#ee6aa0'; ell(ctx, -8, -20, 22, 8); ctx.fill();
  }

  // ---- legs and shoes ----
  const feet = sit ? [[-17, -8], [17, -8]] : [[-8, -8], [8, -8]];
  for (let i = 0; i < 2; i++) {
    const sx = i ? 7 : -7, [ex, ey] = feet[i];
    if (L.shorts) {
      ctx.strokeStyle = L.skin; ctx.lineWidth = 8; line(ctx, sx, hip, ex, ey);
      ctx.strokeStyle = L.socks; ctx.lineWidth = 8.5;
      line(ctx, ex + (sx - ex) * 0.2, ey + (hip - ey) * 0.2, ex, ey);
      ctx.strokeStyle = L.pants; ctx.lineWidth = 13;
      line(ctx, sx, hip, sx + (ex - sx) * 0.45, hip + (ey - hip) * 0.45);
    } else {
      ctx.strokeStyle = L.pants; ctx.lineWidth = 11; line(ctx, sx, hip, ex, ey);
    }
    const fx = ex + (i ? 2 : -2);
    ctx.fillStyle = L.shoes; ell(ctx, fx, -4, 10, 5.5); ctx.fill();
    if (L.shoeAccent) { ctx.strokeStyle = L.shoeAccent; ctx.lineWidth = 1.8; line(ctx, fx - 4, -7, fx + 3, -3); }
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(fx - 9, -1.6, 18, 1.8);
  }

  // ---- body ----
  const top = hip - 30 + bob;
  const headY = top - 20;
  if (L.backpack) { ctx.fillStyle = L.backpack; rr(ctx, -23, top + 2, 46, 30, 8); ctx.fill(); }
  ctx.fillStyle = L.topDark; rr(ctx, -12, top - 4, 24, 10, 5); ctx.fill();
  ctx.save();
  rr(ctx, -19, top, 38, hip - top + 4, 10);
  ctx.fillStyle = L.top; ctx.fill();
  ctx.clip();
  drawOutfit(ctx, L, top, hip - top + 4);
  ctx.restore();

  // ---- arms ----
  const shY = top + 6;
  let la = 1.85, ra = 1.3 - act * 2.4; // arm angles: 0 = pointing right, 1.57 = pointing down
  if (type === 'bill') { la = 1.75 + act * (4.1 - 1.75); ra = 1.3 + act * (-0.9 - 1.3); } // arms up!
  if (L.hold === 'controller') { la = 0.97; ra = 2.17; }
  if (type === 'snack') ra = 1.3 - act * 1.6;
  const arm = (sx, a, len) => {
    const hx = sx + Math.cos(a) * len, hy = shY + Math.sin(a) * len;
    ctx.strokeStyle = L.top; ctx.lineWidth = 9; line(ctx, sx, shY, hx, hy);
    return [hx, hy];
  };
  const lh = arm(-17, la, 22), rh = arm(17, ra, 22);
  if (L.watch) { ctx.fillStyle = '#111'; circ(ctx, lh[0] + 1, lh[1] - 4, 3.2); ctx.fill(); ctx.fillStyle = '#ccd'; circ(ctx, lh[0] + 1, lh[1] - 4, 1.8); ctx.fill(); }
  ctx.fillStyle = L.skin;
  circ(ctx, lh[0], lh[1], 4.8); ctx.fill();
  circ(ctx, rh[0], rh[1], 4.8); ctx.fill();

  // ---- things they hold ----
  if (L.hold === 'pencil' && act < 0.5) drawPencil(ctx, rh[0] + 2, rh[1] - 6, -1.2, 0.8);
  if (L.hold === 'star') {
    ctx.fillStyle = 'rgba(255,240,120,0.35)'; circ(ctx, rh[0] + 2, rh[1] - 4, 11 + Math.sin(t * 6) * 2); ctx.fill();
    drawStar(ctx, rh[0] + 2, rh[1] - 4, 7, t * 2);
  }
  if (L.hold === 'cookie') drawCookie(ctx, rh[0] + 3, rh[1] - 3, 7);
  if (L.hold === 'balloon' && act < 0.5) drawBalloon(ctx, rh[0] + 2, rh[1] - 9, 8);
  if (L.hold === 'phone' && act < 0.3) {
    ctx.fillStyle = '#1c2440'; rr(ctx, lh[0] - 4, lh[1] - 8, 9, 14, 2); ctx.fill();
    ctx.fillStyle = '#6ad0ff'; rr(ctx, lh[0] - 2.5, lh[1] - 6.5, 6, 10, 1); ctx.fill();
  }
  if (L.hold === 'controller') {
    ctx.fillStyle = '#2d2d35'; rr(ctx, -12, top + 17, 24, 11, 5); ctx.fill();
    ctx.fillStyle = '#ff5a5a'; circ(ctx, 6, top + 21, 1.8); ctx.fill();
    ctx.fillStyle = '#5affa0'; circ(ctx, 9, top + 24, 1.8); ctx.fill();
    ctx.fillStyle = '#aaa'; ctx.fillRect(-8, top + 21.5, 6, 2); ctx.fillRect(-6, top + 19.5, 2, 6);
  }

  // ---- head ----
  drawHead(ctx, L, headY, t, ph, act);
  ctx.restore();
}

function drawOutfit(ctx, L, top, h) {
  if (L.pattern === 'zip') {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2; line(ctx, -1, top + 2, 1, top + h);
    ctx.lineWidth = 2.4; line(ctx, 7, top + 9, 9, top + 21);
    ctx.fillStyle = L.topDark; ctx.fillRect(-19, top + h - 5, 38, 5);
  } else if (L.pattern === 'space') {
    drawSpacePattern(ctx, 0, top + h / 2, 38, h);
    ctx.fillStyle = '#4cc27a'; ctx.fillRect(-19, top + h - 4, 38, 4);
  } else if (L.pattern === 'quilt') {
    ctx.strokeStyle = 'rgba(255,255,255,0.13)'; ctx.lineWidth = 1.5;
    for (let yy = top + 7; yy < top + h; yy += 7) {
      ctx.beginPath();
      for (let xx = -19; xx <= 19; xx += 2) ctx.lineTo(xx, yy + Math.sin(xx * 0.5) * 1.5);
      ctx.stroke();
    }
    ctx.strokeStyle = '#0d2219'; ctx.lineWidth = 1.6; line(ctx, 0, top + 2, 0, top + h);
    ctx.strokeStyle = L.backpack; ctx.lineWidth = 4.5;
    line(ctx, -12, top, -13, top + h); line(ctx, 12, top, 13, top + h);
  } else if (L.pattern === 'raincoat') {
    ctx.strokeStyle = L.topDark; ctx.lineWidth = 1.5; line(ctx, 3, top + 2, 3, top + h);
    ctx.fillStyle = '#fff';
    for (const yy of [8, 16, 24]) { circ(ctx, -1, top + yy, 1.8); ctx.fill(); }
  } else {
    ctx.fillStyle = L.topDark; ctx.fillRect(-19, top + 12, 38, 5);
  }
}

function drawHead(ctx, L, headY, t, ph, act) {
  const dark = '#2a1a14';
  // ---- things behind the head ----
  if (L.hair === 'hood') {
    ctx.save();
    circ(ctx, 0, headY, 27); ctx.fillStyle = L.top; ctx.fill(); ctx.clip();
    drawSpacePattern(ctx, 0, headY, 54, 54);
    ctx.restore();
    ctx.fillStyle = L.topDark; circ(ctx, 0, headY + 1, 23); ctx.fill();
  }
  if (L.hair === 'bangs') { ctx.fillStyle = L.hairColor; rr(ctx, -25, headY - 16, 50, 44, 14); ctx.fill(); }
  ctx.fillStyle = L.skin;
  ctx.fillRect(-5, headY + 14, 10, 8);
  if (L.hair !== 'hood') { circ(ctx, -20.5, headY + 2, 4.5); ctx.fill(); circ(ctx, 20.5, headY + 2, 4.5); ctx.fill(); }
  circ(ctx, 0, headY, 21); ctx.fill();

  // ---- hair ----
  ctx.fillStyle = L.hairColor;
  if (L.hair === 'curly') {
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * (1.02 + i * 0.096);
      circ(ctx, Math.cos(a) * 18, headY + Math.sin(a) * 17 - 1, 7); ctx.fill();
    }
    circ(ctx, -7, headY - 17, 8); ctx.fill();
    circ(ctx, 6, headY - 18, 8); ctx.fill();
    circ(ctx, 0, headY - 15, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (const [hx, hy] of [[-10, -18], [4, -22], [12, -14], [-15, -9]]) { circ(ctx, hx, headY + hy, 2.5); ctx.fill(); }
  } else if (L.hair === 'bangs') {
    ctx.beginPath();
    ctx.moveTo(-22, headY + 4);
    ctx.arc(0, headY, 22.5, Math.PI * 1.03, Math.PI * 1.97);
    ctx.lineTo(22, headY + 4);
    ctx.lineTo(17, headY - 6);
    for (let xx = 17; xx >= -17; xx -= 5) ctx.lineTo(xx, headY - 6 + (xx % 2 ? 1.5 : 0));
    ctx.closePath(); ctx.fill();
  } else if (L.hair === 'hood') {
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 15, headY - 16);
      ctx.quadraticCurveTo(s * 26, headY + 4, s * 20, headY + 28);
      ctx.lineTo(s * 13, headY + 26);
      ctx.quadraticCurveTo(s * 17, headY + 2, s * 9, headY - 12);
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-17, headY - 13);
    ctx.quadraticCurveTo(0, headY - 25, 18, headY - 11);
    ctx.quadraticCurveTo(6, headY - 12, -3, headY - 6);
    ctx.quadraticCurveTo(-10, headY - 9, -17, headY - 5);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = L.top; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(0, headY + 2, 24, Math.PI * 0.92, Math.PI * 2.08); ctx.stroke();
  } else if (L.hair === 'cap') {
    circ(ctx, -16, headY - 2, 6); ctx.fill(); circ(ctx, 16, headY - 2, 6); ctx.fill();
    ctx.fillStyle = L.capColor;
    ctx.beginPath(); ctx.arc(0, headY - 5, 22, Math.PI, 0); ctx.closePath(); ctx.fill();
    ell(ctx, 16, headY - 6, 17, 5); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ctx, 0, headY - 18, 5); ctx.fill();
  } else if (L.hair === 'phones') {
    ctx.beginPath(); ctx.arc(0, headY, 21.5, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(18, headY - 8); ctx.lineTo(-18, headY - 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, headY - 1, 25, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
    ctx.fillStyle = '#e84a5f'; rr(ctx, -27, headY - 8, 9, 16, 4); ctx.fill(); rr(ctx, 18, headY - 8, 9, 16, 4); ctx.fill();
  } else if (L.hair === 'messy') {
    ctx.beginPath();
    ctx.moveTo(-22, headY + 2);
    const spikes = [[-24, -12], [-17, -16], [-18, -26], [-8, -20], [-4, -30], [3, -21], [10, -28], [13, -18], [22, -20], [20, -10], [23, 2]];
    for (const [sx, sy] of spikes) ctx.lineTo(sx, headY + sy);
    ctx.lineTo(18, headY - 8); ctx.lineTo(-18, headY - 8);
    ctx.closePath(); ctx.fill();
  }

  // ---- face ----
  const ey = headY + 2;
  const blink = ((t * 0.9 + ph * 7) % 4) < 0.12;
  ctx.fillStyle = 'rgba(255,110,110,0.25)';
  circ(ctx, -12, ey + 6, 4); ctx.fill(); circ(ctx, 12, ey + 6, 4); ctx.fill();
  if (L.freckles) {
    ctx.fillStyle = 'rgba(170,80,30,0.6)';
    for (const [fx, fy] of [[-13, 4], [-10, 6], [-14, 7], [13, 4], [10, 6], [14, 7]]) { circ(ctx, fx, ey + fy, 0.9); ctx.fill(); }
  }
  const eyes = (dx, dy) => {
    if (blink) {
      ctx.strokeStyle = dark; ctx.lineWidth = 2;
      line(ctx, -10, ey, -5, ey); line(ctx, 5, ey, 10, ey);
      return;
    }
    ctx.fillStyle = dark;
    circ(ctx, -7.5 + dx, ey + dy, 2.7); ctx.fill(); circ(ctx, 7.5 + dx, ey + dy, 2.7); ctx.fill();
    ctx.fillStyle = '#fff';
    circ(ctx, -6.7 + dx, ey + dy - 1, 0.9); ctx.fill(); circ(ctx, 8.3 + dx, ey + dy - 1, 0.9); ctx.fill();
  };
  ctx.strokeStyle = dark; ctx.lineCap = 'round';
  switch (L.face) {
    case 'grumpy': // Natti's "GRRR homework" face
      eyes(0, 0);
      ctx.lineWidth = 3;
      line(ctx, -13, ey - 8, -3, ey - 4); line(ctx, 13, ey - 8, 3, ey - 4);
      ctx.lineWidth = 1.2; line(ctx, -2, ey + 3, 0, ey + 1); line(ctx, 2, ey + 3, 0, ey + 1);
      rr(ctx, -8, ey + 8, 16, 7, 2.5);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.lineWidth = 1; line(ctx, -8, ey + 11.5, 8, ey + 11.5);
      for (const tx of [-4, 0, 4]) line(ctx, tx, ey + 8, tx, ey + 15);
      break;
    case 'smile': // Mio's cheeky smile
      eyes(0.5, 0);
      ctx.lineWidth = 2;
      line(ctx, -11, ey - 7, -4, ey - 8); line(ctx, 4, ey - 10, 11, ey - 8);
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(-6, ey + 9); ctx.quadraticCurveTo(1, ey + 13, 8, ey + 7); ctx.stroke();
      break;
    case 'scream': { // Bill's big excited "AAAH!"
      eyes(0, -1.5);
      ctx.fillStyle = '#7a1f2b';
      ell(ctx, 0, ey + 11 + act * 2, 5.5 + act * 3, 6 + act * 4); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-3.5 - act * 2, ey + 5.5, 7 + act * 4, 2.2);
      ctx.fillStyle = '#ff8a9a'; ell(ctx, 0, ey + 15 + act * 4, 3.5 + act * 1.5, 2.3); ctx.fill();
      break;
    }
    case 'focus':
      eyes(1.5, 1.5);
      ctx.lineWidth = 2; line(ctx, -3, ey + 10, 4, ey + 10);
      ctx.fillStyle = '#ff8a9a'; circ(ctx, 5, ey + 11.5, 2.4); ctx.fill();
      break;
    default:
      eyes(0, 0);
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, ey + 6, 6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  }
  if (L.glasses) {
    ctx.strokeStyle = '#c9a26a'; ctx.lineWidth = 1.6;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    circ(ctx, -7.5, ey, 7); ctx.fill(); ctx.stroke();
    circ(ctx, 7.5, ey, 7); ctx.fill(); ctx.stroke();
    line(ctx, -0.5, ey - 1, 0.5, ey - 1);
  }
}

// The Mega Eraser: a giant angry eraser that goes BOOM
function drawEraser(ctx, x, y, s, t, st) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  if (st.alpha != null) ctx.globalAlpha = st.alpha;
  const fuse = st.fuse;
  if (fuse != null) {
    const k = 1 - Math.max(0, fuse);
    ctx.translate(Math.sin(t * 55) * k * 3, 0);
    ctx.scale(1 + k * 0.25, 1 + k * 0.25);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, 0, 0, 34, 7); ctx.fill();
  ctx.fillStyle = '#e46e93'; rr(ctx, -32, -40, 64, 38, 8); ctx.fill();
  ctx.fillStyle = '#ff9bba'; rr(ctx, -32, -46, 64, 14, 7); ctx.fill();
  ctx.fillStyle = '#2e6fd8'; ctx.fillRect(6, -46, 26, 44);
  ctx.fillStyle = '#1f55b0'; ctx.fillRect(6, -46, 26, 5);
  text(ctx, 'MEGA', 19, -22, 8, '#fff', { stroke: false });
  // angry face
  ctx.fillStyle = '#fff'; circ(ctx, -20, -24, 5); ctx.fill(); circ(ctx, -6, -24, 5); ctx.fill();
  ctx.fillStyle = '#222'; circ(ctx, -19, -23, 2.4); ctx.fill(); circ(ctx, -5, -23, 2.4); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  line(ctx, -26, -32, -16, -28); line(ctx, 0, -32, -10, -28);
  ctx.beginPath(); ctx.arc(-13, -8, 6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  if (fuse != null && fuse > 0) {
    ctx.fillStyle = '#ffec5c';
    starPath(ctx, 0, -56, 6 + Math.sin(t * 40) * 2, t * 10); ctx.fill();
  }
  ctx.restore();
}

// =====================================================================
//  THE HOMEWORK
// =====================================================================
const BOOK_COLORS = { MATH: '#c8372d', SCIENCE: '#2f8f4e', HISTORY: '#2d5fb0', GRAMMAR: '#7a3fb0' };

function drawHomework(ctx, e, t) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  switch (e.type) {
    case 'sheet': drawPaperGuy(ctx, e, t, 1, 'sheet'); break;
    case 'math': drawPaperGuy(ctx, e, t, 1.05, 'math'); break;
    case 'mini': drawPaperGuy(ctx, e, t, 0.62, 'mini'); break;
    case 'due': drawPaperGuy(ctx, e, t, 1, 'due'); break;
    case 'book': drawBookGuy(ctx, e, t); break;
    case 'plane': drawPlaneGuy(ctx, e, t); break;
    case 'boss': drawVolcano(ctx, e, t); break;
  }
  ctx.restore();
}

function walkingLegs(ctx, w, spread, top, lift, lw) {
  ctx.strokeStyle = '#2a2230'; ctx.lineWidth = lw || 3;
  for (let i = 0; i < 2; i++) {
    const s = i ? 1 : -1;
    const sw = Math.sin(w) * 7 * s;
    const fy = -2 - Math.max(0, Math.cos(w) * s) * lift;
    line(ctx, s * spread, top, s * spread + sw, fy);
    ctx.fillStyle = '#2a2230'; ell(ctx, s * spread + sw - 3, fy, 5.5, 3); ctx.fill();
  }
}

function angryEyes(ctx, ey, r, gap) {
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a2230'; ctx.lineWidth = 1.5;
  circ(ctx, -gap, ey, r); ctx.fill(); ctx.stroke();
  circ(ctx, gap, ey, r); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2a2230';
  circ(ctx, -gap - r * 0.3, ey + 1, r * 0.45); ctx.fill();
  circ(ctx, gap - r * 0.3, ey + 1, r * 0.45); ctx.fill();
  ctx.lineWidth = 2.5;
  line(ctx, -gap - r - 1, ey - r - 3, -gap + r * 0.6, ey - r + 1);
  line(ctx, gap + r + 1, ey - r - 3, gap - r * 0.6, ey - r + 1);
}

function paperPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-22, -58); ctx.lineTo(12, -58); ctx.lineTo(22, -48); ctx.lineTo(22, 0); ctx.lineTo(-22, 0);
  ctx.closePath();
}

// Sheets of paper with legs: worksheets, math problems, "due tomorrow"
function drawPaperGuy(ctx, e, t, sc, kind) {
  const w = e.walk || 0, eat = !!e.eating, dmg = e.hp / e.max;
  ctx.scale(sc, sc);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ell(ctx, 0, 0, 24, 6); ctx.fill();
  if (e.jump > 0) ctx.translate(0, -Math.sin((1 - e.jump / 0.6) * Math.PI) * 60);
  walkingLegs(ctx, w, 8, -26, 4);
  const lean = eat ? -0.12 + Math.sin(t * 16) * 0.06 : Math.sin(w) * 0.05;
  ctx.translate(0, -26); ctx.rotate(lean);
  // arms
  ctx.strokeStyle = '#2a2230'; ctx.lineWidth = 3;
  const swing = Math.sin(w) * 5;
  line(ctx, 18, -26, 30, -12 - swing);
  if (eat) line(ctx, -18, -26, -36, -34 + Math.sin(t * 16) * 5);
  else line(ctx, -18, -26, -30, -12 + swing);
  // the paper
  paperPath(ctx);
  ctx.fillStyle = kind === 'due' ? '#ffe9e4' : kind === 'math' || kind === 'mini' ? '#fffbe3' : '#fdfdf8';
  ctx.fill();
  ctx.strokeStyle = '#b9b3a6'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#a9c9ee'; ctx.lineWidth = 1;
  for (let yy = -48; yy < 0; yy += 7) line(ctx, -22, yy, 22, yy);
  ctx.strokeStyle = '#f08a8a'; line(ctx, -15, -58, -15, 0);
  ctx.restore();
  ctx.fillStyle = '#dcd6c8';
  ctx.beginPath(); ctx.moveTo(12, -58); ctx.lineTo(12, -48); ctx.lineTo(22, -48); ctx.closePath(); ctx.fill();
  // what's written on it
  if (kind === 'math' || kind === 'mini') text(ctx, e.label || '', 1, -49, kind === 'mini' ? 14 : 11, '#6a2bd0', { stroke: false });
  else if (kind === 'sheet') text(ctx, e.label || '', 0, -50, 8, '#3a3a6a', { stroke: false });
  else if (kind === 'due') {
    ctx.save(); ctx.translate(3, -5); ctx.rotate(-0.2);
    ctx.strokeStyle = '#e02020'; ctx.lineWidth = 1.5; rr(ctx, -16, -6, 32, 12, 3); ctx.stroke();
    text(ctx, 'DUE!', 0, 0, 9, '#e02020', { stroke: false });
    ctx.restore();
  }
  // coffee stain and folds when it's hurt
  if (dmg < 0.5) {
    ctx.fillStyle = 'rgba(120,70,20,0.35)'; circ(ctx, 10, -10, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    line(ctx, -22, -20, 6, -44); line(ctx, 6, -44, 22, -30);
  }
  // face
  angryEyes(ctx, -32, 5.5, 7);
  ctx.strokeStyle = '#2a2230'; ctx.fillStyle = '#2a2230';
  if (eat) { ell(ctx, -2, -18, 6, 2 + Math.abs(Math.sin(t * 16)) * 4); ctx.fill(); }
  else { ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -14, 6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  // soggy (hit by a water balloon) / flash when hit
  if (e.slow > 0) {
    paperPath(ctx); ctx.fillStyle = 'rgba(70,140,255,0.3)'; ctx.fill();
    ctx.fillStyle = '#4a90ff';
    for (let i = 0; i < 3; i++) { const dy = ((t * 40 + i * 20) % 30); circ(ctx, -14 + i * 14, dy, 2); ctx.fill(); }
  }
  if (e.flash > 0) { paperPath(ctx); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill(); }
  // alarm clock on its head
  if (kind === 'due') {
    ctx.save();
    ctx.translate(-3, -67); ctx.rotate(Math.sin(t * 40) * 0.12);
    ctx.fillStyle = '#d93a2a'; circ(ctx, -6, -7, 4); ctx.fill(); circ(ctx, 6, -7, 4); ctx.fill();
    circ(ctx, 0, 0, 9); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ctx, 0, 0, 6.5); ctx.fill();
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1.3; line(ctx, 0, 0, 0, -4.5); line(ctx, 0, 0, 3.5, 1);
    ctx.restore();
  }
}

function drawBookGuy(ctx, e, t) {
  const w = e.walk || 0, eat = !!e.eating, dmg = e.hp / e.max;
  const color = BOOK_COLORS[e.label] || '#c8372d';
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, 0, 0, 32, 7); ctx.fill();
  walkingLegs(ctx, w * 0.8, 12, -22, 3, 5);
  ctx.translate(0, -22);
  ctx.rotate(eat ? -0.1 + Math.sin(t * 12) * 0.05 : Math.sin(w) * 0.04);
  ctx.strokeStyle = '#2a2230'; ctx.lineWidth = 4.5;
  line(ctx, 22, -44, 36, -26 - Math.sin(w) * 5);
  if (eat) line(ctx, -26, -44, -44, -52 + Math.sin(t * 12) * 6);
  else line(ctx, -26, -44, -38, -26 + Math.sin(w) * 5);
  // pages on the side and top
  ctx.fillStyle = '#f4efdc'; rr(ctx, 16, -76, 14, 72, 3); ctx.fill();
  ctx.strokeStyle = '#d6cfb6'; ctx.lineWidth = 1;
  for (let yy = -70; yy < -6; yy += 5) line(ctx, 22, yy, 29, yy);
  // cover
  const cover = () => { rr(ctx, -30, -80, 52, 80, 5); };
  cover(); ctx.fillStyle = color; ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-30, -80, 8, 80);
  ctx.strokeStyle = '#e8c547'; ctx.lineWidth = 1.5; rr(ctx, -19, -74, 36, 68, 3); ctx.stroke();
  text(ctx, e.label || 'MATH', -1, -66, 10, '#ffe27a', { stroke: false });
  if (dmg < 0.5) {
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-10, -80); ctx.lineTo(-4, -64); ctx.lineTo(-12, -54); ctx.lineTo(-6, -40); ctx.stroke();
    ctx.save(); ctx.translate(6, -84); ctx.rotate(0.4);
    ctx.fillStyle = '#fff'; ctx.fillRect(-8, -6, 16, 12); ctx.restore();
  }
  // face
  angryEyes(ctx, -44, 7, 9);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a2230'; ctx.lineWidth = 1.5;
  const open = eat ? Math.abs(Math.sin(t * 12)) * 6 : 0;
  rr(ctx, -12, -28, 22, 8 + open, 2); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 1;
  for (let tx = -6; tx < 10; tx += 5) line(ctx, tx, -28, tx, -20 + open);
  if (e.slow > 0) { cover(); ctx.fillStyle = 'rgba(70,140,255,0.3)'; ctx.fill(); }
  if (e.flash > 0) { cover(); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill(); }
}

function drawPlaneGuy(ctx, e, t) {
  const h = 62 + Math.sin(t * 3 + e.walk) * 6;
  ctx.fillStyle = 'rgba(0,0,0,0.13)'; ell(ctx, 0, 0, 26, 5); ctx.fill();
  ctx.translate(0, -h);
  ctx.rotate(Math.sin(t * 2.2 + e.walk) * 0.06);
  ctx.fillStyle = '#d0d0c8';
  ctx.beginPath(); ctx.moveTo(-38, 0); ctx.lineTo(26, 3); ctx.lineTo(20, 14); ctx.closePath(); ctx.fill();
  const wing = () => { ctx.beginPath(); ctx.moveTo(-38, 0); ctx.lineTo(30, -17); ctx.lineTo(24, 3); ctx.closePath(); };
  wing(); ctx.fillStyle = '#fbfbf6'; ctx.fill();
  ctx.strokeStyle = '#b8b2a4'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.strokeStyle = '#a9c9ee'; ctx.lineWidth = 1;
  line(ctx, -16, -4, 27, -13); line(ctx, -2, -2, 26, -7);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a2230'; ctx.lineWidth = 1.4;
  circ(ctx, -14, -4, 4.5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#2a2230'; circ(ctx, -15.5, -3.5, 2); ctx.fill();
  ctx.lineWidth = 2.2; line(ctx, -20, -10, -10, -8);
  ctx.lineWidth = 1.6; line(ctx, -22, 4, -14, 5);
  if (e.slow > 0) { wing(); ctx.fillStyle = 'rgba(70,140,255,0.3)'; ctx.fill(); }
  if (e.flash > 0) { wing(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill(); }
}

// THE BOSS: a giant science-fair volcano with legs
function drawVolcano(ctx, e, t) {
  const w = e.walk || 0, eat = !!e.eating, blast = e.blast || 0;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, 0, 0, 95, 14); ctx.fill();
  for (let i = 0; i < 4; i++) {
    const lx = -66 + i * 44, p = w + i * Math.PI;
    const sw = Math.sin(p) * 9, fy = -4 - Math.max(0, Math.cos(p)) * 6;
    ctx.strokeStyle = '#6b4423'; ctx.lineWidth = 7;
    line(ctx, lx, -40, lx + sw, fy);
    ctx.fillStyle = '#f2f2f2'; ell(ctx, lx + sw - 4, fy, 9, 5); ctx.fill();
  }
  ctx.translate(blast > 0 ? Math.sin(t * 60) * 3 : 0, 0);
  ctx.fillStyle = '#a0692f'; rr(ctx, -92, -54, 184, 18, 4); ctx.fill();
  ctx.fillStyle = '#7d4f22'; ctx.fillRect(-92, -40, 184, 4);
  text(ctx, 'SCIENCE FAIR', 0, -45, 12, '#ffe45c', { stroke: false });
  const cone = () => {
    ctx.beginPath();
    ctx.moveTo(-78, -54); ctx.quadraticCurveTo(-40, -110, -22, -168);
    ctx.lineTo(22, -168); ctx.quadraticCurveTo(40, -110, 78, -54);
    ctx.closePath();
  };
  cone(); ctx.fillStyle = '#8a5a34'; ctx.fill();
  ctx.strokeStyle = '#5e3b1f'; ctx.lineWidth = 3; ctx.stroke();
  ctx.save(); cone(); ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (const [px, py, pr] of [[-40, -70, 16], [30, -95, 12], [-10, -130, 10], [50, -65, 12]]) { circ(ctx, px, py, pr); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = '#ff7a1a'; ell(ctx, 0, -168, 24, 7); ctx.fill();
  ctx.fillStyle = '#ff9a2a';
  for (const [dx, len] of [[-15, 26], [-3, 40], [9, 20], [16, 32]]) {
    rr(ctx, dx - 4, -168, 8, len, 4); ctx.fill();
    circ(ctx, dx, -168 + len, 5); ctx.fill();
  }
  // face
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2.5;
  circ(ctx, -22, -110, 12); ctx.fill(); ctx.stroke();
  circ(ctx, 22, -110, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d01818'; circ(ctx, -27, -108, 5.5); ctx.fill(); circ(ctx, 17, -108, 5.5); ctx.fill();
  ctx.fillStyle = '#111'; circ(ctx, -27, -108, 2.6); ctx.fill(); circ(ctx, 17, -108, 2.6); ctx.fill();
  ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 6;
  line(ctx, -38, -130, -12, -120); line(ctx, 38, -130, 12, -120);
  const open = (eat ? Math.abs(Math.sin(t * 10)) * 10 : 0) + blast * 14;
  ctx.fillStyle = '#3a0a0a';
  ctx.beginPath(); ctx.moveTo(-34, -84); ctx.quadraticCurveTo(0, -94, 34, -84);
  ctx.quadraticCurveTo(0, -66 + open, -34, -84); ctx.fill();
  ctx.fillStyle = '#fff';
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath(); ctx.moveTo(i * 9 - 4, -88); ctx.lineTo(i * 9 + 4, -88); ctx.lineTo(i * 9, -81); ctx.fill();
  }
  if (e.slow > 0) { cone(); ctx.fillStyle = 'rgba(70,140,255,0.25)'; ctx.fill(); }
  if (e.flash > 0) { cone(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill(); }
  // health bar
  const bw = 160, k = Math.max(0, e.hp / e.max);
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(ctx, -bw / 2, -204, bw, 14, 7); ctx.fill();
  ctx.fillStyle = k > 0.5 ? '#ff8a2a' : '#ff3a2a'; rr(ctx, -bw / 2 + 2, -202, (bw - 4) * k, 10, 5); ctx.fill();
  text(ctx, 'THE SCIENCE PROJECT', 0, -220, 15, '#fff');
}

// =====================================================================
//  THE ROOM
// =====================================================================
function drawRoom(ctx, B, lanes, W, H) {
  // wall with star wallpaper
  const g = ctx.createLinearGradient(0, 0, 0, B.y);
  g.addColorStop(0, '#ffe8a8'); g.addColorStop(1, '#ffd67a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, B.y);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 44; i++) { starPath(ctx, (i * 137) % W, 12 + (i * 53) % (B.y - 34), 5, i); ctx.fill(); }
  ctx.fillStyle = '#fff7e6'; ctx.fillRect(0, B.y - 16, W, 12);
  ctx.fillStyle = '#e2cfa6'; ctx.fillRect(0, B.y - 4, W, 4);

  // wooden floor
  ctx.fillStyle = '#c98d55'; ctx.fillRect(0, B.y, W, H - B.y);
  ctx.strokeStyle = '#b07744'; ctx.lineWidth = 2;
  for (let yy = B.y + 22, i = 0; yy < H + 22; yy += 22, i++) {
    line(ctx, 0, yy, W, yy);
    for (let xx = (i * 97) % 170; xx < W; xx += 170) line(ctx, xx, yy - 22, xx, yy);
  }

  // the rug where the kids stand
  const r0 = Math.min(...lanes), r1 = Math.max(...lanes);
  const ry0 = B.y + r0 * B.rh, ry1 = B.y + (r1 + 1) * B.rh;
  const rw = B.cols * B.cw;
  ctx.strokeStyle = '#f3efe2'; ctx.lineWidth = 2;
  for (let yy = ry0; yy <= ry1; yy += 7) { line(ctx, B.x - 12, yy, B.x - 24, yy); line(ctx, B.x + rw + 12, yy, B.x + rw + 24, yy); }
  ctx.fillStyle = '#f3efe2'; rr(ctx, B.x - 14, ry0 - 8, rw + 28, ry1 - ry0 + 16, 10); ctx.fill();
  for (let r = 0; r < B.rows; r++) {
    const y0 = B.y + r * B.rh;
    if (!lanes.includes(r)) continue;
    for (let c = 0; c < B.cols; c++) {
      ctx.fillStyle = (r + c) % 2 ? '#86c9ee' : '#9bd6f5';
      ctx.fillRect(B.x + c * B.cw, y0, B.cw, B.rh);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let d = 0; d < 6; d++) { circ(ctx, B.x + c * B.cw + 15 + (d * 37) % 75, y0 + 15 + (d * 53) % 85, 2); ctx.fill(); }
    }
  }
  ctx.strokeStyle = '#6fb3dc'; ctx.lineWidth = 3;
  ctx.strokeRect(B.x - 4, ry0 - 1, rw + 8, ry1 - ry0 + 2);

  // toys lying around in the rows you can't use
  for (let r = 0; r < B.rows; r++) if (!lanes.includes(r)) drawToys(ctx, B, r);
}

function drawToys(ctx, B, r) {
  const cy = B.y + r * B.rh + B.rh * 0.55;
  const kinds = ['block', 'ball', 'car', 'sock', 'block', 'ball', 'car'];
  for (let i = 0; i < 7; i++) {
    const x = B.x + 40 + i * 128 + ((r * 41 + i * 23) % 40);
    const y = cy + ((r * 17 + i * 31) % 30) - 15;
    const k = kinds[(i + r) % kinds.length];
    ctx.save(); ctx.translate(x, y);
    if (k === 'block') {
      ctx.fillStyle = ['#e03a3a', '#2f7fe0', '#f2c230', '#2fae5a'][(i + r) % 4];
      rr(ctx, -16, -8, 32, 18, 3); ctx.fill();
      for (const sx of [-9, 0, 9]) { rr(ctx, sx - 3.5, -13, 7, 6, 2); ctx.fill(); }
    } else if (k === 'ball') {
      ctx.fillStyle = '#ff5a8a'; circ(ctx, 0, 0, 13); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-13, -3, 26, 6);
    } else if (k === 'car') {
      ctx.fillStyle = '#3aa0ff'; rr(ctx, -18, -8, 36, 12, 4); ctx.fill();
      rr(ctx, -9, -16, 18, 10, 3); ctx.fill();
      ctx.fillStyle = '#222'; circ(ctx, -10, 5, 5); ctx.fill(); circ(ctx, 10, 5, 5); ctx.fill();
    } else {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#e04a4a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(0, -12); ctx.lineTo(0, 2); ctx.lineTo(12, 2); ctx.lineTo(12, 10); ctx.lineTo(-10, 10); ctx.closePath();
      ctx.fill(); line(ctx, -10, -8, 0, -8);
    }
    ctx.restore();
  }
}

// The bedroom door. open = 0 (closed) to 1 (wide open)
function drawDoor(ctx, D, open) {
  ctx.fillStyle = '#f3ead8'; ctx.fillRect(D.x - 10, D.y - 10, D.w + 20, D.h + 10);
  ctx.fillStyle = '#2a1f33'; ctx.fillRect(D.x, D.y, D.w, D.h);
  const dw = D.w * (1 - open * 0.82);
  ctx.fillStyle = '#b5703f'; ctx.fillRect(D.x, D.y, dw, D.h);
  ctx.strokeStyle = '#8c5530'; ctx.lineWidth = 3;
  ctx.strokeRect(D.x + dw * 0.14, D.y + 20, dw * 0.72, D.h * 0.36);
  ctx.strokeRect(D.x + dw * 0.14, D.y + D.h * 0.5, dw * 0.72, D.h * 0.44);
  ctx.fillStyle = '#f2c230'; circ(ctx, D.x + dw - 14, D.y + D.h * 0.46, 6); ctx.fill();
  if (open < 0.3) {
    ctx.save();
    ctx.translate(D.x + dw / 2, D.y + 100); ctx.rotate(-0.05);
    ctx.fillStyle = '#fff'; ctx.fillRect(-46, -40, 92, 84);
    ctx.fillStyle = 'rgba(200,200,200,0.8)'; ctx.fillRect(-12, -46, 24, 10);
    text(ctx, 'KEEP', 0, -24, 15, '#e02020', { stroke: false });
    text(ctx, 'OUT!', 0, -8, 15, '#e02020', { stroke: false });
    text(ctx, 'NO', 0, 12, 12, '#222', { stroke: false });
    text(ctx, 'HOMEWORK', 0, 27, 12, '#222', { stroke: false });
    ctx.restore();
  }
}

// The robot vacuum that saves you once per row
function drawVacuum(ctx, x, y, t, moving) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.2)'; ell(ctx, 0, 0, 30, 8); ctx.fill();
  if (moving) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) line(ctx, -40 - i * 12, -18 + i * 7, -58 - i * 12 - Math.random() * 10, -18 + i * 7);
  }
  ctx.fillStyle = '#4d5560'; ell(ctx, 0, -8, 28, 12); ctx.fill();
  ctx.fillStyle = '#e9edf2'; ell(ctx, 0, -13, 28, 11); ctx.fill();
  ctx.fillStyle = '#c9d0d9'; ell(ctx, 6, -14, 10, 4.5); ctx.fill();
  ctx.fillStyle = '#222'; circ(ctx, -15, -13, 2.4); ctx.fill(); circ(ctx, -6, -13, 2.4); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(-10.5, -11, 3.5, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
  ctx.fillStyle = (moving || (t * 1.5) % 1 < 0.5) ? '#4aff7a' : '#1f8a3f'; circ(ctx, 18, -15, 2.5); ctx.fill();
  ctx.restore();
}

// The golden "A+" that drops when you win a day
function drawTrophy(ctx, x, y, t) {
  const b = Math.sin(t * 3) * 5;
  ctx.save(); ctx.translate(x, y + b);
  ctx.save(); ctx.rotate(t * 0.8);
  ctx.fillStyle = 'rgba(255,230,90,0.35)';
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10, -80); ctx.lineTo(10, -80); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,240,150,0.5)'; circ(ctx, 0, 0, 48 + Math.sin(t * 5) * 4); ctx.fill();
  ctx.rotate(Math.sin(t * 2) * 0.08);
  ctx.fillStyle = '#fff'; rr(ctx, -30, -38, 60, 76, 4); ctx.fill();
  ctx.strokeStyle = '#a9c9ee'; ctx.lineWidth = 1;
  for (let yy = -20; yy < 36; yy += 7) line(ctx, -26, yy, 26, yy);
  text(ctx, 'A+', 0, 2, 34, '#e0302a', { stroke: false });
  drawStar(ctx, 20, -28, 11, 0.2);
  ctx.restore();
}
