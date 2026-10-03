// =====================================================================
//  KIDS vs VIDEO GAMES: the schoolyard map
// =====================================================================

const MAP_W = 1080, MAP_H = 720;

// The path the video game characters walk on, from the TV to the fort
const PATH = [[-50, 225], [230, 225], [230, 580], [490, 580], [490, 330], [770, 330], [770, 600], [925, 600]];
const PATH_HALF = 30;
const FORT = { x: 925, y: 470, w: 150, h: 210 };   // the climbing fort where Bill hides
const TV = { x: 4, y: 150, w: 92, h: 130 };        // the giant TV they escape from
const BILL_SPOT = { x: 1002, y: 562 };
const TREES = [[52, 470], [138, 690], [636, 700], [376, 154], [1048, 168]];

// Lengths of each piece of the path
const PATH_SEGS = [];
let PATH_LEN = 0;
for (let i = 0; i < PATH.length - 1; i++) {
  const [x1, y1] = PATH[i], [x2, y2] = PATH[i + 1];
  const len = Math.hypot(x2 - x1, y2 - y1);
  PATH_SEGS.push({ x1, y1, x2, y2, len, start: PATH_LEN });
  PATH_LEN += len;
}

// Where you are when you've walked d pixels along the path
function pathPoint(d) {
  d = Math.max(0, Math.min(PATH_LEN, d));
  for (const s of PATH_SEGS) {
    if (d <= s.start + s.len) {
      const k = (d - s.start) / s.len;
      return { x: s.x1 + (s.x2 - s.x1) * k, y: s.y1 + (s.y2 - s.y1) * k, dx: Math.sign(s.x2 - s.x1) };
    }
  }
  const last = PATH[PATH.length - 1];
  return { x: last[0], y: last[1], dx: 1 };
}

function distToPath(x, y) {
  let best = 1e9;
  for (const s of PATH_SEGS) {
    const vx = s.x2 - s.x1, vy = s.y2 - s.y1;
    const k = Math.max(0, Math.min(1, ((x - s.x1) * vx + (y - s.y1) * vy) / (s.len * s.len)));
    best = Math.min(best, Math.hypot(x - (s.x1 + vx * k), y - (s.y1 + vy * k)));
  }
  return best;
}

// Can a kid stand here?
function canPlace(x, y, towers, ignore) {
  if (x < 22 || x > MAP_W - 22 || y < 150 || y > MAP_H - 8) return false;
  if (distToPath(x, y) < PATH_HALF + 18) return false;
  if (x > FORT.x - 18 && y > FORT.y - 30 && y < FORT.y + FORT.h + 10) return false;
  if (x < TV.x + TV.w + 18 && y > TV.y - 10 && y < TV.y + TV.h + 25) return false;
  for (const [tx, ty] of TREES) if (Math.hypot(x - tx, y - ty) < 30) return false;
  for (const t of towers) if (t !== ignore && !t.flier && Math.hypot(x - t.x, y - t.y) < 38) return false;
  return true;
}

// ---------------- drawing the map (drawn once, then reused) ----------------
function drawMap(ctx) {
  const r = seeded(42);
  // artificial grass
  ctx.fillStyle = '#5d8d45'; ctx.fillRect(0, 0, MAP_W, MAP_H);
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,40,0,0.08)';
    ctx.fillRect(r() * MAP_W, 120 + r() * MAP_H, 2, 2);
  }
  // the school building (red bricks)
  ctx.fillStyle = '#a4523c'; ctx.fillRect(0, 0, MAP_W, 112);
  ctx.strokeStyle = 'rgba(70,30,20,0.35)'; ctx.lineWidth = 1;
  for (let y = 4, row = 0; y < 112; y += 6, row++) {
    line(ctx, 0, y, MAP_W, y);
    for (let x = (row % 2) * 9; x < MAP_W; x += 18) line(ctx, x, y - 6, x, y);
  }
  for (let i = 0; i < 400; i++) { ctx.fillStyle = r() < 0.5 ? 'rgba(255,200,170,0.08)' : 'rgba(60,20,10,0.1)'; ctx.fillRect(r() * MAP_W, r() * 108, 17, 5); }
  // windows
  for (let i = 0; i < 9; i++) {
    const x = 40 + i * 118 + (i % 2) * 14, y = 18 + (i % 3 === 1 ? 6 : 0);
    if (i === 5) continue;
    ctx.fillStyle = '#f4f2ec'; ctx.fillRect(x - 3, y - 3, 62, 54);
    const g = ctx.createLinearGradient(x, y, x + 56, y + 48);
    g.addColorStop(0, '#cfe3ef'); g.addColorStop(1, '#7d9fb4');
    ctx.fillStyle = g; ctx.fillRect(x, y, 56, 48);
    ctx.fillStyle = '#f4f2ec'; ctx.fillRect(x + 26, y, 4, 48); ctx.fillRect(x, y + 22, 56, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; poly(ctx, [[x + 4, y + 4], [x + 18, y + 4], [x + 4, y + 18]]); ctx.fill();
  }
  // the school clock
  const cx = 660, cy = 50;
  ctx.fillStyle = '#e9e7e0'; circ(ctx, cx, cy, 26); ctx.fill();
  ctx.strokeStyle = '#555'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; line(ctx, cx + Math.cos(a) * 21, cy + Math.sin(a) * 21, cx + Math.cos(a) * 24, cy + Math.sin(a) * 24); }
  ctx.lineWidth = 3; line(ctx, cx, cy, cx - 4, cy - 15);
  ctx.lineWidth = 2; line(ctx, cx, cy, cx + 14, cy + 9);
  // sidewalk + benches
  ctx.fillStyle = '#b9b6ae'; ctx.fillRect(0, 112, MAP_W, 26);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 24) line(ctx, x, 112, x, 138);
  line(ctx, 0, 125, MAP_W, 125);
  ctx.fillStyle = '#d8d6ce'; ctx.fillRect(0, 136, MAP_W, 4);
  for (const bx of [140, 520, 850]) {
    ctx.fillStyle = '#c42a2a'; ctx.fillRect(bx + 4, 120, 4, 14); ctx.fillRect(bx + 72, 120, 4, 14);
    ctx.fillStyle = '#8a6a48'; ctx.fillRect(bx, 114, 80, 5); ctx.fillRect(bx, 121, 80, 5);
  }
  // fallen autumn leaves
  for (let i = 0; i < 160; i++) {
    const x = r() * MAP_W, y = 145 + r() * (MAP_H - 145);
    ctx.fillStyle = ['#c98a3a', '#a8642a', '#d9a650', '#8a4a20'][Math.floor(r() * 4)];
    ell(ctx, x, y, 3.5, 2, r() * 3); ctx.fill();
  }
  // the asphalt path
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pathStroke = (w, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); PATH.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  };
  pathStroke(PATH_HALF * 2 + 12, '#c8c4ba');
  pathStroke(PATH_HALF * 2 + 6, '#a9a59c');
  pathStroke(PATH_HALF * 2, '#727478');
  ctx.save();
  ctx.beginPath(); ctx.lineWidth = PATH_HALF * 2;
  PATH.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  // texture inside the path
  for (let i = 0; i < 1800; i++) {
    const p = pathPoint(r() * PATH_LEN), ox = (r() - 0.5) * PATH_HALF * 1.8, oy = (r() - 0.5) * PATH_HALF * 1.8;
    ctx.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
    ctx.fillRect(p.x + ox, p.y + oy, 2, 2);
  }
  ctx.restore();
  // puddles (it rained!)
  for (const d of [150, 520, 900, 1300, 1680]) {
    const p = pathPoint(d);
    ctx.fillStyle = 'rgba(150,170,190,0.45)'; ell(ctx, p.x + 6, p.y + 4, 16, 7, 0.2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ell(ctx, p.x + 2, p.y + 2, 6, 2, 0.2); ctx.fill();
  }
  // birch trees
  for (const [tx, ty] of TREES) drawBirch(ctx, tx, ty, r);
  drawFort(ctx);
}

function drawBirch(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ell(ctx, x + 10, y, 30, 9); ctx.fill();
  ctx.fillStyle = '#ecebe4'; rr(ctx, x - 5, y - 58, 10, 60, 3); ctx.fill();
  ctx.fillStyle = '#2a2a2a';
  for (let i = 0; i < 6; i++) ctx.fillRect(x - 5 + r() * 4, y - 54 + i * 9, 3 + r() * 4, 2);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = ['#7aa040', '#94b84a', '#c9b040', '#6a9038'][i % 4];
    circ(ctx, x + (r() - 0.5) * 40, y - 70 - r() * 34, 14 + r() * 8); ctx.fill();
  }
}

// The wooden climbing fort from the schoolyard
function drawFort(ctx) {
  const F = FORT;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ell(ctx, F.x + F.w / 2 + 8, F.y + F.h - 6, F.w / 2 + 14, 16); ctx.fill();
  // back wall planks
  ctx.fillStyle = '#8a8478'; ctx.fillRect(F.x + 14, F.y - 34, F.w - 28, 96);
  ctx.strokeStyle = '#6a655a'; ctx.lineWidth = 2;
  for (let x = F.x + 22; x < F.x + F.w - 14; x += 12) line(ctx, x, F.y - 34, x, F.y + 62);
  // roof
  ctx.fillStyle = '#6a4a32'; poly(ctx, [[F.x - 6, F.y - 30], [F.x + F.w / 2, F.y - 74], [F.x + F.w + 6, F.y - 30]]); ctx.fill();
  ctx.fillStyle = '#7d5a3e'; poly(ctx, [[F.x + 4, F.y - 32], [F.x + F.w / 2, F.y - 66], [F.x + F.w - 4, F.y - 32]]); ctx.fill();
  // deck where Bill stands
  ctx.fillStyle = '#a4875e'; ctx.fillRect(F.x + 4, F.y + 86, F.w - 8, 14);
  ctx.fillStyle = '#8a6e48'; ctx.fillRect(F.x + 4, F.y + 98, F.w - 8, 5);
  // the red-brown climbing wall with holds
  ctx.fillStyle = '#7c5450'; ctx.fillRect(F.x + 18, F.y + 103, F.w - 36, 92);
  ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(F.x + F.w / 2 - 1, F.y + 103, 2, 92);
  ctx.fillStyle = '#a0a6ae';
  for (const [hx, hy] of [[40, 120], [92, 140], [58, 165], [104, 180], [36, 186]]) { ell(ctx, F.x + hx, F.y + hy, 5, 4); ctx.fill(); }
  // rope net on the side
  ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) { line(ctx, F.x + F.w - 16, F.y + 104 + i * 18, F.x + F.w + 4, F.y + 112 + i * 18); line(ctx, F.x + F.w - 16 + i * 5, F.y + 104, F.x + F.w - 16 + i * 5, F.y + 194); }
  // big wooden posts
  ctx.fillStyle = '#9a9488';
  for (const px of [F.x + 4, F.x + F.w - 20]) {
    rr(ctx, px, F.y - 40, 16, F.h + 34, 4); ctx.fill();
    ctx.fillStyle = '#7d776c'; ctx.fillRect(px + 10, F.y - 36, 3, F.h + 26); ctx.fillStyle = '#9a9488';
    ctx.fillStyle = '#333'; circ(ctx, px + 8, F.y + 20, 2.5); ctx.fill(); circ(ctx, px + 8, F.y + 140, 2.5); ctx.fill(); ctx.fillStyle = '#9a9488';
  }
  // sign
  ctx.fillStyle = '#f4ead2'; rr(ctx, F.x + 30, F.y - 30, 90, 22, 4); ctx.fill();
  ctx.strokeStyle = '#6a4a32'; ctx.lineWidth = 2; ctx.stroke();
  text(ctx, 'PROTECT BILL!', F.x + 75, F.y - 19, 12, '#b02020', { stroke: false, weight: '700' });
}

// The giant glitchy TV the characters escape from (animated)
function drawTV(ctx, t) {
  const T = TV;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ell(ctx, T.x + T.w / 2 + 6, T.y + T.h + 6, T.w / 2 + 8, 10); ctx.fill();
  ctx.fillStyle = '#2a2a33'; rr(ctx, T.x, T.y, T.w, T.h, 10); ctx.fill();
  ctx.fillStyle = '#3c3c48'; rr(ctx, T.x + 4, T.y + 4, T.w - 8, T.h - 8, 8); ctx.fill();
  const sx = T.x + 10, sy = T.y + 12, sw = T.w - 20, sh = T.h - 40;
  ctx.save();
  rr(ctx, sx, sy, sw, sh, 6); ctx.clip();
  ctx.fillStyle = '#12082a'; ctx.fillRect(sx, sy, sw, sh);
  // glitchy pixels
  const r = seeded(Math.floor(t * 12));
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = ['#ff3bd0', '#3bf0ff', '#7dff6a', '#ffe23b', '#7a5cff'][Math.floor(r() * 5)];
    ctx.globalAlpha = 0.4 + r() * 0.6;
    ctx.fillRect(sx + r() * sw, sy + r() * sh, 3 + r() * 14, 2 + r() * 4);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let y = sy + ((t * 40) % 4); y < sy + sh; y += 4) ctx.fillRect(sx, y, sw, 1);
  ctx.restore();
  // swirl portal glow towards the path
  const g = ctx.createRadialGradient(T.x + T.w, PATH[0][1], 2, T.x + T.w, PATH[0][1], 50);
  g.addColorStop(0, 'rgba(180,90,255,0.55)'); g.addColorStop(1, 'rgba(180,90,255,0)');
  ctx.fillStyle = g; circ(ctx, T.x + T.w, PATH[0][1], 50); ctx.fill();
  ctx.fillStyle = '#1c1c22'; rr(ctx, T.x + 10, T.y + T.h - 24, 34, 14, 4); ctx.fill();
  ctx.fillStyle = '#ff4a4a'; circ(ctx, T.x + T.w - 22, T.y + T.h - 17, 3); ctx.fill();
  ctx.fillStyle = '#4aff6a'; circ(ctx, T.x + T.w - 12, T.y + T.h - 17, 3); ctx.fill();
  text(ctx, 'GAME', T.x + 27, T.y + T.h - 17, 9, '#ddd', { stroke: false, weight: '700' });
}
