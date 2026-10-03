// =====================================================================
//  KIDS vs VIDEO GAMES: little drawing helpers used everywhere
// =====================================================================

const FONT_TITLE = '"Luckiest Guy", "Arial Black", Impact, sans-serif';
const FONT_UI = '"Fredoka", "Trebuchet MS", "Comic Sans MS", sans-serif';
const font = (size, fam, weight) => `${weight || '600'} ${size}px ${fam || FONT_UI}`;

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
function poly(ctx, pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }

// Writes text with an outline. opts: { fam, weight, stroke, lw, align, base }
function text(ctx, str, x, y, size, fill, opts) {
  opts = opts || {};
  ctx.font = font(size, opts.fam, opts.weight);
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = opts.base || 'middle';
  if (opts.stroke !== false) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = opts.lw || Math.max(2, size / 6);
    ctx.strokeStyle = opts.stroke || '#141026';
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
}
function wrapText(ctx, str, x, y, maxW, size, fill, opts) {
  opts = opts || {};
  ctx.font = font(size, opts.fam, opts.weight);
  const lines = [];
  let cur = '';
  for (const w of str.split(' ')) {
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
function drawStar(ctx, x, y, r, rot, fill, stroke) {
  starPath(ctx, x, y, r, rot);
  ctx.fillStyle = fill || '#ffd93b'; ctx.fill();
  ctx.strokeStyle = stroke || '#e09a00'; ctx.lineWidth = Math.max(0.5, r / 6); ctx.stroke();
}
function drawCoin(ctx, x, y, r) {
  ctx.fillStyle = '#c98a10'; circ(ctx, x, y, r); ctx.fill();
  ctx.fillStyle = '#ffd23f'; circ(ctx, x - r * 0.08, y - r * 0.08, r * 0.82); ctx.fill();
  ctx.strokeStyle = '#c98a10'; ctx.lineWidth = r * 0.16; circ(ctx, x - r * 0.08, y - r * 0.08, r * 0.5); ctx.stroke();
}
function drawHeart(ctx, x, y, r, color) {
  ctx.fillStyle = color || '#ff3b5c';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  ctx.fill();
}

// Makes a color lighter (amt > 0) or darker (amt < 0)
const _shadeCache = {};
function shade(hex, amt) {
  const key = hex + amt;
  if (_shadeCache[key]) return _shadeCache[key];
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const to = amt > 0 ? 255 : 0, k = Math.abs(amt);
  r = Math.round(r + (to - r) * k); g = Math.round(g + (to - g) * k); b = Math.round(b + (to - b) * k);
  return (_shadeCache[key] = '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1));
}

// A random generator that always gives the same numbers (for grass, leaves...)
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
