// ============================================================
//  LIL' PLUT ODYSSEY — PAINTING THE GROUND
//  The ground (#), thin platforms (=), boxes (B) and spikes (^)
//  are painted once into big pictures ("chunks") so the game
//  stays fast. Each world paints them in its own style.
// ============================================================
window.LP = window.LP || {};

LP.Terrain = (function () {
  const T = LP.T, TL = LP.TILE, U = LP.U;
  const CW = 24;          // tiles per chunk
  const PADTOP = 40;      // room above the level for grass sticking up
  let level = null, theme = null, key = '', rs = 1, chunks = [], pattern = null;

  // ---------- the inside of the ground (a picture that repeats) ----------
  function makePattern() {
    const S = 192;
    const cv = document.createElement('canvas');
    cv.width = cv.height = Math.round(S * rs);
    const c = cv.getContext('2d'); c.scale(rs, rs);
    const rnd = U.rng(99);
    c.fillStyle = theme.body; c.fillRect(0, 0, S, S);
    if (key === 'house') {
      // wooden planks
      for (let y = 0; y < S; y += 32) {
        c.fillStyle = U.mix(theme.body, (y / 32) % 2 ? '#ffffff' : '#000000', 0.06); c.fillRect(0, y, S, 32);
        c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(0, y + 30, S, 2);
        const off = ((y / 32) % 3) * 64;
        c.fillRect((off + 90) % S, y, 2, 32);
        c.strokeStyle = 'rgba(60,25,10,0.18)'; c.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          c.beginPath(); const gy = y + 8 + k * 8;
          for (let x = 0; x <= S; x += 8) c.lineTo(x, gy + Math.sin(x * 0.05 + y + k) * 2);
          c.stroke();
        }
        c.fillStyle = 'rgba(40,20,10,0.45)'; c.beginPath(); c.arc((off + 80) % S, y + 16, 2, 0, Math.PI * 2); c.arc((off + 100) % S, y + 16, 2, 0, Math.PI * 2); c.fill();
      }
    } else if (key === 'city') {
      // bricks
      for (let y = 0; y < S; y += 24) {
        const off = (y / 24) % 2 ? 24 : 0;
        for (let x = -48; x < S + 48; x += 48) {
          c.fillStyle = U.mix(theme.body, rnd() < 0.5 ? '#000000' : '#ff9070', rnd() * 0.18);
          c.fillRect(x + off + 2, y + 2, 44, 20);
          c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x + off + 2, y + 2, 44, 4);
        }
      }
      c.globalCompositeOperation = 'destination-over'; c.fillStyle = '#4a2220'; c.fillRect(0, 0, S, S); c.globalCompositeOperation = 'source-over';
    } else {
      // dirt (garden) or cobbles (park)
      const n = key === 'park' ? 26 : 40;
      for (let i = 0; i < n; i++) {
        const x = rnd() * S, y = rnd() * S, r = key === 'park' ? 14 + rnd() * 14 : 3 + rnd() * 7;
        for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
          c.fillStyle = U.mix(theme.body, rnd() < 0.5 ? '#000000' : '#ffffff', 0.08 + rnd() * 0.1);
          c.beginPath(); c.ellipse(x + dx, y + dy, r, r * 0.75, rnd(), 0, Math.PI * 2); c.fill();
          if (key === 'park') { c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 2; c.stroke(); }
        }
      }
    }
    const p = c.createPattern(cv, 'repeat');
    return { cv, scale: 1 / rs };
  }

  // ---------- is this tile ground? ----------
  const solidT = (tx, ty) => level.get(tx, ty) === TL.SOLID;
  const isTop = (tx, ty) => solidT(tx, ty) && !level.solid(tx, ty - 1);

  function build(lvl, themeKey, scale) {
    level = lvl; key = themeKey; theme = LP.THEMES[themeKey];
    rs = Math.min(2, scale);
    pattern = makePattern();
    chunks = [];
    const n = Math.ceil(level.w / CW);
    for (let i = 0; i < n; i++) chunks.push({ i, cv: null, dirty: true });
  }

  function markDirty(tx) {
    const i = Math.floor(tx / CW);
    for (const k of [i - 1, i, i + 1]) if (chunks[k]) chunks[k].dirty = true;
  }

  function paintChunk(ch) {
    const x0 = ch.i * CW * T;
    if (!ch.cv) {
      ch.cv = document.createElement('canvas');
      ch.cv.width = Math.ceil(CW * T * rs); ch.cv.height = Math.ceil((level.ph + PADTOP) * rs);
    }
    const c = ch.cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, ch.cv.width, ch.cv.height);
    c.setTransform(rs, 0, 0, rs, -x0 * rs, PADTOP * rs);
    const tx0 = ch.i * CW - 1, tx1 = (ch.i + 1) * CW;

    // ---- 1. the ground shape ----
    const path = new Path2D();
    const R = 14;
    for (let ty = 0; ty < level.h; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (tx < 0 || tx >= level.w || !solidT(tx, ty)) continue;
      const up = !solidT(tx, ty - 1), dn = !solidT(tx, ty + 1) && ty + 1 < level.h, l = !solidT(tx - 1, ty), r = !solidT(tx + 1, ty);
      path.roundRect(tx * T, ty * T, T, T, [up && l ? R : 0, up && r ? R : 0, dn && r ? R : 0, dn && l ? R : 0]);
    }
    const pc = c.createPattern(pattern.cv, 'repeat');
    pc.setTransform(new DOMMatrix().scale(pattern.scale));
    c.fillStyle = pc; c.fill(path);

    // ---- 2. shading inside the ground (darker the deeper you go) ----
    c.save(); c.clip(path);
    for (let ty = 0; ty < level.h; ty++) {
      let run = -1;
      for (let tx = tx0; tx <= tx1 + 1; tx++) {
        const top = tx <= tx1 && tx >= 0 && tx < level.w && isTop(tx, ty);
        if (top && run < 0) run = tx;
        if (!top && run >= 0) {
          const y = ty * T, len = Math.max(T, level.ph - y);
          const k = Math.min(1, (T * 5) / len);
          const g = c.createLinearGradient(0, y, 0, y + len);
          g.addColorStop(0, U.alpha(theme.bodyDark, 0)); g.addColorStop(0.15 * k, U.alpha(theme.bodyDark, 0.05)); g.addColorStop(k, U.alpha(theme.bodyDark, 0.75)); g.addColorStop(1, U.alpha(theme.bodyDark, 0.8));
          c.fillStyle = g; c.fillRect(run * T, y, (tx - run) * T, len);
          run = -1;
        }
      }
    }
    // edges: darker line on the sides and bottom
    c.strokeStyle = theme.edge; c.lineWidth = 8;
    c.beginPath();
    for (let ty = 0; ty < level.h; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (!solidT(tx, ty)) continue;
      const x = tx * T, y = ty * T;
      if (!level.solid(tx - 1, ty)) { c.moveTo(x, y); c.lineTo(x, y + T); }
      if (!level.solid(tx + 1, ty)) { c.moveTo(x + T, y); c.lineTo(x + T, y + T); }
      if (!level.solid(tx, ty + 1) && ty + 1 < level.h) { c.moveTo(x, y + T); c.lineTo(x + T, y + T); }
    }
    c.stroke();
    // stones and roots
    for (let ty = 0; ty < level.h; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (!solidT(tx, ty)) continue;
      const h = U.hash(tx, ty);
      if (key === 'garden' && h < 0.35) {
        c.fillStyle = U.mix('#b8a48a', theme.body, 0.35);
        c.beginPath(); c.ellipse(tx * T + 10 + h * 70, ty * T + 20 + U.hash(ty, tx) * 20, 8, 5, h * 4, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(tx * T + 8 + h * 70, ty * T + 18 + U.hash(ty, tx) * 20, 4, 2, h * 4, 0, Math.PI * 2); c.fill();
      }
      if (key === 'garden' && isTop(tx, ty) && h > 0.6) {
        c.strokeStyle = 'rgba(40,20,10,0.4)'; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(tx * T + h * 40, ty * T + 12); c.quadraticCurveTo(tx * T + 30, ty * T + 30, tx * T + 18 + h * 20, ty * T + 44); c.stroke();
      }
      if (key === 'city' && h < 0.08) {
        // a little window in the wall
        c.fillStyle = U.hash(tx + 3, ty) < 0.5 ? '#ffd77a' : '#1c1830';
        c.fillRect(tx * T + 12, ty * T + 8, 24, 32);
        c.strokeStyle = '#2a1414'; c.lineWidth = 4; c.strokeRect(tx * T + 12, ty * T + 8, 24, 32);
      }
    }
    c.restore();

    // ---- 3. the top of the ground (grass, carpet, moss, roof) ----
    for (let ty = 0; ty < level.h; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (tx < 0 || tx >= level.w || !isTop(tx, ty)) continue;
      const side = (dx) => isTop(tx + dx, ty) ? 'cont' : level.solid(tx + dx, ty) ? 'wall' : 'open';
      drawTop(c, tx, ty, side(-1), side(1));
    }
    // ---- 4. decorations on top ----
    for (let ty = 1; ty < level.h; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (tx < 0 || tx >= level.w || !isTop(tx, ty) || level.get(tx, ty - 1) !== TL.EMPTY) continue;
      drawDeco(c, tx, ty);
    }
    // ---- 5. thin platforms, boxes, spikes ----
    for (let ty = 0; ty < level.h; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const t = level.get(tx, ty);
      if (tx < 0 || tx >= level.w) continue;
      if (t === TL.ONEWAY) drawThin(c, tx, ty, level.get(tx - 1, ty) !== TL.ONEWAY, level.get(tx + 1, ty) !== TL.ONEWAY);
      else if (t === TL.BREAK) LP.Art.box(c, key, tx * T, ty * T, U.hash(tx, ty));
      else if (t === TL.SPIKE) drawSpike(c, tx, ty);
    }
    ch.dirty = false;
  }

  function drawTop(c, tx, ty, L, R) {
    const x = tx * T, y = ty * T;
    const ol = L === 'open' ? 5 : 0, or = R === 'open' ? 5 : 0;
    const rnd = U.rng(tx * 7919 + ty * 104729);
    if (key === 'garden' || key === 'park') {
      const deep = key === 'park' ? 18 : 14;
      // the green band, with a wavy bottom edge
      c.fillStyle = theme.topDark;
      c.beginPath(); c.moveTo(x - ol, y - 3);
      c.lineTo(x + T + or, y - 3);
      for (let k = T + or; k >= -ol; k -= 6) {
        const wx = x + k;
        let wy = y + deep + Math.sin(wx * 0.13) * 4 + Math.sin(wx * 0.31) * 2;
        if (key === 'park') wy += Math.max(0, Math.sin(wx * 0.07)) * 9;
        if ((k < 4 && L === 'open') || (k > T - 4 && R === 'open')) wy = y + deep + 10;
        c.lineTo(wx, wy);
      }
      c.closePath(); c.fill();
      c.fillStyle = theme.top;
      c.beginPath(); c.moveTo(x - ol, y - 4); c.lineTo(x + T + or, y - 4);
      for (let k = T + or; k >= -ol; k -= 6) { const wx = x + k; c.lineTo(wx, y + deep - 5 + Math.sin(wx * 0.13) * 3); }
      c.closePath(); c.fill();
      c.fillStyle = theme.top2; c.fillRect(x - ol, y - 4, T + ol + or, 4);
      // little grass blades
      for (let i = 0; i < 6; i++) {
        const bx = x + rnd() * T, h = 5 + rnd() * 9, lean = (rnd() - 0.5) * 8;
        c.fillStyle = rnd() < 0.5 ? theme.top : theme.top2;
        c.beginPath(); c.moveTo(bx - 3, y - 2); c.lineTo(bx + lean, y - 2 - h); c.lineTo(bx + 3, y - 2); c.fill();
      }
      if (L === 'open') { c.fillStyle = theme.top; c.beginPath(); c.ellipse(x - 2, y + 6, 7, 11, 0, 0, Math.PI * 2); c.fill(); }
      if (R === 'open') { c.fillStyle = theme.top; c.beginPath(); c.ellipse(x + T + 2, y + 6, 7, 11, 0, 0, Math.PI * 2); c.fill(); }
    } else if (key === 'house') {
      // a soft rug on top of the wooden floor
      c.fillStyle = theme.topDark; c.fillRect(x - ol, y - 2, T + ol + or, 14);
      c.fillStyle = theme.top; c.fillRect(x - ol, y - 4, T + ol + or, 12);
      c.fillStyle = theme.top2;
      for (let k = 0; k < T; k += 12) { c.beginPath(); c.moveTo(x + k, y + 1); c.lineTo(x + k + 6, y - 2); c.lineTo(x + k + 12, y + 1); c.lineTo(x + k + 6, y + 4); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x - ol, y - 4, T + ol + or, 2);
      c.strokeStyle = theme.top2; c.lineWidth = 2;
      if (L === 'open') { c.beginPath(); for (let k = 0; k < 14; k += 4) { c.moveTo(x - ol + 1, y + k - 2); c.lineTo(x - ol - 6, y + k + 2); } c.stroke(); }
      if (R === 'open') { c.beginPath(); for (let k = 0; k < 14; k += 4) { c.moveTo(x + T + or - 1, y + k - 2); c.lineTo(x + T + or + 6, y + k + 2); } c.stroke(); }
    } else {
      // a metal roof edge with bolts
      c.fillStyle = theme.topDark; c.fillRect(x - ol, y - 6, T + ol + or, 16);
      c.fillStyle = theme.top; c.fillRect(x - ol, y - 6, T + ol + or, 11);
      c.fillStyle = theme.top2; c.fillRect(x - ol, y - 6, T + ol + or, 3);
      c.fillStyle = 'rgba(0,0,0,0.35)';
      for (let k = 8; k < T; k += 16) { c.beginPath(); c.arc(x + k, y + 1, 2, 0, Math.PI * 2); c.fill(); }
      if (L === 'open') { c.fillStyle = theme.topDark; c.fillRect(x - ol - 2, y - 7, 6, 20); }
      if (R === 'open') { c.fillStyle = theme.topDark; c.fillRect(x + T + or - 4, y - 7, 6, 20); }
    }
  }

  function drawDeco(c, tx, ty) {
    const h = U.hash(tx * 3 + 1, ty * 5 + 2), h2 = U.hash(tx, ty * 7 + 3);
    const x = tx * T + 8 + h2 * 32, y = ty * T - 3;
    if (key === 'garden') {
      if (h < 0.22) grassTuft(c, x, y, theme.top, theme.top2, 1);
      else if (h < 0.34) flower(c, x, y, U.pick(['#ff5f7a', '#ffd23f', '#c77dff', '#ffffff', '#ff8a3c']), h2);
      else if (h < 0.38) { c.fillStyle = '#efe1c8'; c.fillRect(x - 3, y - 12, 6, 12); c.fillStyle = '#e2453a'; c.beginPath(); c.ellipse(x, y - 12, 11, 8, 0, Math.PI, 0); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - 4, y - 15, 2, 0, 7); c.arc(x + 4, y - 16, 2, 0, 7); c.fill(); }
    } else if (key === 'park') {
      if (h < 0.2) grassTuft(c, x, y, theme.top, theme.top2, 1.2);
      else if (h < 0.28) flower(c, x, y, U.pick(['#fff6e0', '#ffd0e8', '#ffe27a']), h2);
      else if (h < 0.34) { c.fillStyle = '#8a7a90'; c.beginPath(); c.ellipse(x, y - 4, 10, 6, 0, Math.PI, 0); c.fill(); }
    } else if (key === 'house') {
      if (h < 0.05) { // a crayon
        c.save(); c.translate(x, y - 4); c.rotate(-0.2 + h2 * 0.4);
        c.fillStyle = U.pick(['#ff4a5a', '#4ab0ff', '#ffd23f', '#5ad65a']); c.fillRect(-16, -4, 26, 8);
        c.beginPath(); c.moveTo(10, -4); c.lineTo(18, 0); c.lineTo(10, 4); c.fill(); c.restore();
      } else if (h < 0.09) { // a little ball
        c.fillStyle = U.pick(['#ff6a8a', '#6ad0ff', '#ffd25a']); c.beginPath(); c.arc(x, y - 9, 9, 0, Math.PI * 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(x - 3, y - 12, 3, 0, 7); c.fill();
      } else if (h < 0.12) { // a sock
        c.fillStyle = '#fff'; c.beginPath(); c.roundRect(x - 6, y - 18, 10, 18, 4); c.fill(); c.beginPath(); c.roundRect(x - 6, y - 8, 18, 8, 4); c.fill();
        c.fillStyle = '#ff6a8a'; c.fillRect(x - 6, y - 16, 10, 3);
      }
    } else if (key === 'city') {
      if (h < 0.06) { // air vent
        c.fillStyle = '#7a8296'; c.fillRect(x - 10, y - 26, 20, 26); c.fillStyle = '#5a6074'; c.fillRect(x - 14, y - 30, 28, 6);
      } else if (h < 0.1) { // little antenna
        c.strokeStyle = '#8a92a8'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - 34); c.moveTo(x - 10, y - 26); c.lineTo(x + 10, y - 26); c.stroke();
        c.fillStyle = '#ff4a4a'; c.beginPath(); c.arc(x, y - 35, 3, 0, 7); c.fill();
      } else if (h < 0.14) { // puddle
        c.fillStyle = 'rgba(140,170,255,0.45)'; c.beginPath(); c.ellipse(x, y + 1, 16, 3, 0, 0, Math.PI * 2); c.fill();
      }
    }
  }

  function grassTuft(c, x, y, a, b, s) {
    for (let i = -3; i <= 3; i++) {
      c.fillStyle = i % 2 ? a : b;
      c.beginPath(); c.moveTo(x + i * 3 - 3, y); c.quadraticCurveTo(x + i * 4, y - 10 * s, x + i * 6, y - (14 + (3 - Math.abs(i)) * 4) * s); c.lineTo(x + i * 3 + 3, y); c.fill();
    }
  }
  function flower(c, x, y, col, h) {
    const st = 12 + h * 12;
    c.strokeStyle = theme.topDark; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - st); c.stroke();
    c.fillStyle = col;
    for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * 5, y - st + Math.sin(a) * 5, 4.5, 0, Math.PI * 2); c.fill(); }
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x, y - st, 3.5, 0, Math.PI * 2); c.fill();
  }

  function drawThin(c, tx, ty, leftEnd, rightEnd) {
    const x = tx * T, y = ty * T;
    if ((key === 'park' || key === 'garden') && level.get(tx, ty + 1) === TL.WATER) {
      // lily pad
      c.fillStyle = '#3f9a45'; c.beginPath(); c.ellipse(x + T / 2, y + 6, T * 0.62, 10, 0, 0.15, Math.PI * 2 - 0.15); c.lineTo(x + T / 2, y + 6); c.fill();
      c.fillStyle = '#6fd060'; c.beginPath(); c.ellipse(x + T / 2, y + 3, T * 0.55, 7, 0, 0.2, Math.PI * 2 - 0.2); c.lineTo(x + T / 2, y + 3); c.fill();
      if (U.hash(tx, ty) < 0.3) { c.fillStyle = '#ffb0d0'; c.beginPath(); c.arc(x + 14, y - 2, 6, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 14, y - 4, 3, 0, 7); c.fill(); }
      return;
    }
    if (key === 'city') {
      // metal girder
      c.fillStyle = theme.thinDark; c.fillRect(x, y, T, 16);
      c.fillStyle = theme.thin; c.fillRect(x, y, T, 5); c.fillRect(x, y + 12, T, 4);
      c.strokeStyle = theme.thin; c.lineWidth = 3;
      c.beginPath(); c.moveTo(x, y + 14); c.lineTo(x + T / 2, y + 3); c.lineTo(x + T, y + 14); c.stroke();
      return;
    }
    // wooden plank / shelf
    const l = leftEnd ? 4 : 0, r = rightEnd ? 4 : 0;
    c.fillStyle = theme.thinDark; c.beginPath(); c.roundRect(x + l - 2, y, T - l - r + 4, 15, [leftEnd ? 6 : 0, rightEnd ? 6 : 0, rightEnd ? 6 : 0, leftEnd ? 6 : 0]); c.fill();
    c.fillStyle = theme.thin; c.beginPath(); c.roundRect(x + l - 2, y, T - l - r + 4, 10, [leftEnd ? 6 : 0, rightEnd ? 6 : 0, 0, 0]); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x + l, y + 1, T - l - r, 2);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    if (leftEnd) { c.beginPath(); c.arc(x + 10, y + 6, 2, 0, 7); c.fill(); }
    if (rightEnd) { c.beginPath(); c.arc(x + T - 10, y + 6, 2, 0, 7); c.fill(); }
    if (key === 'house' && (leftEnd || rightEnd)) {
      // shelf bracket
      const bx = leftEnd ? x + 10 : x + T - 16;
      c.fillStyle = theme.thinDark; c.beginPath(); c.moveTo(bx, y + 14); c.lineTo(bx + 6, y + 14); c.lineTo(bx + 6, y + 34); c.fill();
    }
    if (key === 'garden' && U.hash(tx, ty + 9) < 0.35) {
      // vine hanging down
      c.strokeStyle = '#3f9a45'; c.lineWidth = 2.5;
      const vx = x + 10 + U.hash(ty, tx) * 28, len = 18 + U.hash(tx + 1, ty) * 30;
      c.beginPath(); c.moveTo(vx, y + 12); c.quadraticCurveTo(vx + 6, y + 12 + len / 2, vx, y + 12 + len); c.stroke();
      c.fillStyle = '#5ccf48'; c.beginPath(); c.ellipse(vx + 3, y + 12 + len * 0.6, 5, 3, 0.5, 0, 7); c.ellipse(vx - 2, y + 12 + len, 5, 3, -0.5, 0, 7); c.fill();
    }
  }

  function drawSpike(c, tx, ty) {
    const x = tx * T, y = ty * T, b = y + T;
    if (key === 'house') {
      // OUCH! toy bricks and thumbtacks
      const col = ['#e8343c', '#2f7fe0', '#f2c21a', '#2fb84a'][Math.floor(U.hash(tx, ty) * 4)];
      c.fillStyle = col; c.fillRect(x + 4, b - 16, 26, 16);
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 4, b - 4, 26, 4);
      c.fillStyle = col; for (const k of [10, 22]) c.fillRect(x + k - 3, b - 21, 7, 5);
      for (const k of [30, 42]) {
        c.fillStyle = '#cfd6e0'; c.beginPath(); c.moveTo(k - 2, b - 8); c.lineTo(k, b - 26); c.lineTo(k + 2, b - 8); c.fill();
        c.fillStyle = '#e83a6a'; c.beginPath(); c.ellipse(k, b - 5, 7, 5, 0, 0, Math.PI * 2); c.fill();
      }
    } else if (key === 'city') {
      // pigeon spikes
      c.fillStyle = '#5c6278'; c.fillRect(x, b - 6, T, 6);
      c.strokeStyle = '#d8dce8'; c.lineWidth = 2.5; c.beginPath();
      for (let k = 4; k < T; k += 7) { c.moveTo(x + k, b - 5); c.lineTo(x + k - 5, b - 26); c.moveTo(x + k, b - 5); c.lineTo(x + k + 4, b - 24); }
      c.stroke();
    } else {
      // a thorny bramble
      const col = key === 'park' ? '#5a2f5a' : '#5b3a2a';
      c.fillStyle = col;
      c.beginPath(); c.ellipse(x + T / 2, b - 8, T / 2 + 2, 12, 0, Math.PI, 0); c.fill();
      c.fillStyle = U.mix(col, '#ffffff', 0.15);
      for (let k = 0; k < 7; k++) {
        const a = Math.PI + (k + 0.5) / 7 * Math.PI, px = x + T / 2 + Math.cos(a) * (T / 2 - 2), py = b - 8 + Math.sin(a) * 10;
        c.beginPath(); c.moveTo(px - 4, py + 2); c.lineTo(px + Math.cos(a) * 16, py + Math.sin(a) * 16); c.lineTo(px + 4, py + 2); c.fill();
      }
    }
  }

  // ---------- draw the ground on the screen ----------
  function draw(ctx, cam, viewW, viewH) {
    const first = Math.max(0, Math.floor(cam.x / (CW * T))), last = Math.min(chunks.length - 1, Math.floor((cam.x + viewW) / (CW * T)));
    for (let i = first; i <= last; i++) {
      const ch = chunks[i];
      if (ch.dirty) paintChunk(ch);
      ctx.drawImage(ch.cv, i * CW * T, -PADTOP, CW * T, level.ph + PADTOP);
    }
  }

  // water moves, so it's drawn every frame (on top of Plut, so you look like you're in it)
  function drawWater(ctx, cam, viewW, time) {
    const c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(level.w - 1, Math.floor((cam.x + viewW) / T));
    for (let ty = 0; ty < level.h; ty++) for (let tx = c0; tx <= c1; tx++) {
      if (level.get(tx, ty) !== TL.WATER) continue;
      const x = tx * T, y = ty * T;
      const surface = level.get(tx, ty - 1) !== TL.WATER;
      ctx.fillStyle = U.alpha(theme.water, 0.72);
      if (surface) {
        // the water looks a bit higher than its tile, so it reaches up to the lily pads
        const sy = y - 26;
        ctx.beginPath(); ctx.moveTo(x, y + T);
        for (let k = 0; k <= T; k += 8) ctx.lineTo(x + k, sy + Math.sin((x + k) * 0.06 + time * 3) * 4);
        ctx.lineTo(x + T, y + T); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 3;
        ctx.beginPath();
        for (let k = 0; k <= T; k += 8) ctx.lineTo(x + k, sy + Math.sin((x + k) * 0.06 + time * 3) * 4);
        ctx.stroke();
        if (U.hash(tx, Math.floor(time * 2)) < 0.15) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x + U.hash(tx, 3) * 40, sy + 12, 8, 2); }
      } else {
        ctx.fillRect(x, y, T, T);
      }
    }
  }

  return { build, draw, drawWater, markDirty };
})();
