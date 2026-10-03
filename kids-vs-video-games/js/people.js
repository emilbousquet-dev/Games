// =====================================================================
//  KIDS vs VIDEO GAMES: the kids (Mio, Nafti, Felix, Bill) and ADMIN/EMILE
//  Everyone is drawn with code, copying their real clothes and poses.
//  A person is 100 units tall: feet at y = 0, top of the head at y = -100.
// =====================================================================

const PEOPLE = {
  mio: {
    skin: '#f1cfb6', skinDark: '#d6a98b', lip: '#c9837a', eyes: '#4a6a7c',
    hair: 'wavy', hairColor: '#d9b56d', hairDark: '#9c7a45', hairLight: '#f0d9a2',
    top: { kind: 'hoodie', color: '#202226', trim: '#17181b', zip: '#3a3c40', logo: true, fleece: true },
    pants: { color: '#6f7f6a', style: 'wide' },
    shoes: { color: '#4d5054', sole: '#e9e9e6' },
    face: 'smirk',
  },
  nafti: {
    skin: '#a06a46', skinDark: '#7e4f32', lip: '#7a3f32', eyes: '#2a1810',
    hair: 'curly', hairColor: '#24170f', hairDark: '#140c07', hairLight: '#3d2a1c',
    top: { kind: 'hoodie', color: '#2f8279', trim: '#141619', zip: '#121315', pocket: true, hoodTrim: true },
    pants: { color: '#1c1d21', style: 'jogger' },
    shoes: { color: '#2f6fe0', sole: '#f3f3f3', accent: '#d2ef4c' },
    watch: -1, face: 'calm',
  },
  felix: {
    skin: '#ddae8a', skinDark: '#bd8a66', lip: '#a8564c', eyes: '#3b2414',
    hair: 'short', hairColor: '#3b2719', hairDark: '#24170e', hairLight: '#5a3d28',
    top: { kind: 'quarterzip', color: '#dddcd8', trim: '#cbcac5', tee: '#1c2230', cuff: '#f7f7f5', print: '#26314f' },
    pants: { color: '#3b4032', style: 'cargo' },
    shoes: { color: '#2b2b2d', sole: '#d8d8d4' },
    face: 'grin',
  },
  bill: {
    skin: '#f6d6c0', skinDark: '#dcae95', lip: '#cf7d78', eyes: '#3b5a70',
    hair: 'bangs', hairColor: '#d6ae5c', hairDark: '#a37c35', hairLight: '#ecd18e', glasses: true,
    top: { kind: 'jacket', color: '#1f4a36', trim: '#173a2a', zip: '#0d2219', backpack: '#2b4fa8' },
    pants: { color: '#e4e4e6', style: 'jogger' },
    shoes: { color: '#b9d8c8', sole: '#ffffff' },
    face: 'open',
  },
  emile: {
    skin: '#efc9a8', skinDark: '#d3a281', lip: '#b8665c', eyes: '#3d6a8a',
    hair: 'short', hairColor: '#7a5432', hairDark: '#4e3420', hairLight: '#a87c4e',
    top: { kind: 'hoodie', color: '#f6f2e6', trim: '#d9a92c', zip: '#c9961e', badge: true, hoodTrim: true },
    pants: { color: '#2a2f48', style: 'jogger' },
    shoes: { color: '#f4f4f0', sole: '#d9a92c', accent: '#d9a92c' },
    face: 'grin',
  },
};

const HEAD_SCALE = 1.35, HEAD_PIVOT = -82;

// Finds where the elbow goes when the hand must reach (hx, hy)
function armIK(sx, sy, hx, hy, l1, l2, out) {
  let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy);
  const max = l1 + l2 - 0.01;
  if (d > max) { hx = sx + dx / d * max; hy = sy + dy / d * max; dx = hx - sx; dy = hy - sy; d = max; }
  d = Math.max(d, 0.01);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const px = sx + dx * a / d, py = sy + dy * a / d;
  const nx = -dy / d, ny = dx / d;
  let ex = px + nx * h, ey = py + ny * h;
  const ex2 = px - nx * h, ey2 = py - ny * h;
  // the elbow goes down and a little outward, like a real arm
  if (ey2 + out * ex2 * 0.3 > ey + out * ex * 0.3) { ex = ex2; ey = ey2; }
  return [ex, ey, hx, hy];
}

// Where the hands go for each kid. act = attack animation (1 = just attacked, 0 = resting)
function poseFor(who, t, act, st) {
  const sway = Math.sin(t * 2.1 + (st.phase || 0)) * 0.5;
  const restL = [-15, -50 + sway], restR = [15, -50 - sway];
  switch (who) {
    case 'nafti':
      return { lh: restL, rh: act > 0 ? [15 + 7 * act, -50 - 54 * act] : restR };
    case 'mio': // finger on the lips: "shhh!"
      return { lh: [-1.6, -84.2], rh: act > 0 ? [10 + 10 * act, -64 - 18 * act] : [5.5, -63.5] };
    case 'felix': // holding the stick fishing rod up by the shoulder
      return { lh: [-9 - 2 * act, -83 - 5 * act], rh: restR };
    case 'emile': {
      const f = Math.sin(t * 7) * 2;
      return { lh: [-38, -88 + f], rh: [38, -88 - f] };
    }
    case 'bill':
      if (st.mood === 'scared') return { lh: [-13, -96 + Math.sin(t * 20) * 2], rh: [13, -96 - Math.sin(t * 20) * 2] };
      return { lh: [-3.5, -63], rh: [3.5, -63] };
  }
  return { lh: restL, rh: restR };
}

// Draws one kid. st = { act, phase, look, aim, stun, mood, alpha, out, ball, noShadow }
function drawPerson(ctx, who, x, y, s, t, st) {
  st = st || {};
  const P = PEOPLE[who];
  const act = st.act || 0;
  const breathe = Math.sin(t * 2.1 + (st.phase || 0)) * 0.35;
  const px = s * (st.zoom || 1); // how many screen pixels one unit is (to skip tiny details)
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (st.alpha != null) ctx.globalAlpha = st.alpha;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (!st.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ell(ctx, 0, 0, 15, 3.6); ctx.fill(); }

  const pose = poseFor(who, t, act, st);
  drawShoes(ctx, P, px);
  drawLegs(ctx, P, px);
  ctx.translate(0, breathe);
  if (P.top.backpack) { ctx.fillStyle = shade(P.top.backpack, -0.15); rr(ctx, -16, -79, 32, 28, 6); ctx.fill(); }
  drawTorso(ctx, P, px);
  // kids have big heads compared to grown-ups: draw the head 35% bigger
  ctx.save();
  ctx.translate(0, HEAD_PIVOT); ctx.scale(HEAD_SCALE, HEAD_SCALE); ctx.translate(0, -HEAD_PIVOT);
  drawHairBack(ctx, P);
  drawHead(ctx, P, t, st, px * HEAD_SCALE);
  drawHairFront(ctx, P, px * HEAD_SCALE);
  if (P.glasses) drawGlasses(ctx);
  ctx.restore();

  // props held behind the hand
  if (who === 'mio') drawMioStick(ctx, pose, act, st);
  if (who === 'felix') drawFelixRod(ctx, pose, act, st, t);
  const lh = drawArm(ctx, P, -1, pose.lh, px);
  const rh = drawArm(ctx, P, 1, pose.rh, px);
  if (who === 'mio') { // the "shhh" finger
    ctx.strokeStyle = P.skinDark; ctx.lineWidth = 1.5; line(ctx, lh[0] + 0.3, lh[1] - 1, lh[0] + 0.8, lh[1] - 6.2);
    ctx.strokeStyle = P.skin; ctx.lineWidth = 1.1; line(ctx, lh[0] + 0.3, lh[1] - 1, lh[0] + 0.8, lh[1] - 6.1);
  }
  if (who === 'nafti' && st.ball) drawDodgeball(ctx, rh[0], rh[1] - 1.5, 3.4);
  if (who === 'bill' && st.mood !== 'scared') {
    ctx.fillStyle = '#1c2440'; rr(ctx, -3.2, -70, 6.4, 9.5, 1); ctx.fill();
    ctx.fillStyle = '#6ad0ff'; rr(ctx, -2.4, -69.2, 4.8, 7.8, 0.6); ctx.fill();
  }
  if (st.stun > 0) drawDizzy(ctx, t);
  ctx.restore();
}

function drawShoes(ctx, P, px) {
  const S = P.shoes;
  for (const side of [-1, 1]) {
    const cx = side * 7.4;
    ctx.fillStyle = S.color;
    rr(ctx, cx - 5.6 + side * 0.7, -5.4, 11.2, 4.9, 2.3); ctx.fill();
    ctx.strokeStyle = shade(S.color, -0.45); ctx.lineWidth = 0.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ell(ctx, cx + side * 0.7 - 1.5, -4.2, 3, 1); ctx.fill();
    ctx.fillStyle = S.sole; rr(ctx, cx - 6 + side * 0.7, -1.7, 12, 1.9, 0.9); ctx.fill();
    if (S.accent) { ctx.strokeStyle = S.accent; ctx.lineWidth = 0.8; line(ctx, cx - 3.5 + side * 0.7, -4.2, cx + 2.5 + side * 0.7, -2.4); }
    if (px > 1.5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 0.35;
      for (let i = 0; i < 3; i++) line(ctx, cx - 1.6 + side * 0.7, -4.8 + i * 0.9, cx + 1.6 + side * 0.7, -4.8 + i * 0.9);
    }
  }
}

function drawLegs(ctx, P, px) {
  const p = P.pants;
  const wide = p.style === 'wide', cargo = p.style === 'cargo';
  const ankleY = wide ? -2.4 : -4.4;
  for (const side of [-1, 1]) {
    const oTop = 13.6, oKnee = wide ? 12.8 : 11.2, oAnk = wide ? 12.6 : 9.8;
    const iKnee = wide ? 1.4 : 2.4, iAnk = wide ? 2 : 4.4;
    ctx.beginPath();
    ctx.moveTo(side * 0.3, -48);
    ctx.lineTo(side * oTop, -50);
    ctx.quadraticCurveTo(side * (oKnee + 1), -37, side * oKnee, -24);
    ctx.lineTo(side * oAnk, ankleY);
    ctx.quadraticCurveTo(side * (oAnk + iAnk) / 2, ankleY + 0.6, side * iAnk, ankleY);
    ctx.lineTo(side * iKnee, -24);
    ctx.quadraticCurveTo(side * 0.8, -37, side * 0.3, -43);
    ctx.closePath();
    const g = ctx.createLinearGradient(-14, 0, 14, 0);
    g.addColorStop(0, shade(p.color, 0.12)); g.addColorStop(0.5, p.color); g.addColorStop(1, shade(p.color, -0.25));
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = shade(p.color, -0.45); ctx.lineWidth = 0.5; ctx.stroke();
    // folds
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(side * 4, -26); ctx.quadraticCurveTo(side * 7, -24.5, side * 9.5, -26.5); ctx.stroke();
    if (wide) {
      line(ctx, side * 6.5, -20, side * 7.5, -4); line(ctx, side * 9.8, -14, side * 10.4, -4);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; line(ctx, side * 5, -44, side * 5.5, -28);
    } else {
      ctx.beginPath(); ctx.moveTo(side * 4.5, -14); ctx.quadraticCurveTo(side * 7, -12.5, side * 9, -14.5); ctx.stroke();
    }
    if (p.style === 'jogger') { ctx.fillStyle = shade(p.color, -0.2); rr(ctx, side > 0 ? 4.4 : -9.8, -7.4, 5.4, 3.2, 1); ctx.fill(); }
    if (cargo) { // big side pockets
      const x0 = side > 0 ? 8.2 : -12.4;
      ctx.fillStyle = shade(p.color, -0.08); rr(ctx, x0, -38, 4.2, 7.5, 0.7); ctx.fill();
      ctx.strokeStyle = shade(p.color, -0.4); ctx.lineWidth = 0.45; ctx.stroke();
      ctx.fillStyle = shade(p.color, 0.06); rr(ctx, x0 - 0.2, -38.6, 4.6, 2.2, 0.6); ctx.fill(); ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ell(ctx, 0, -46.5, 2.2, 3); ctx.fill();
}

function torsoPath(ctx, w) {
  ctx.beginPath();
  ctx.moveTo(-5.4, -81.6);
  ctx.quadraticCurveTo(-w + 1, -81.2, -w, -76);
  ctx.quadraticCurveTo(-w - 0.7, -62, -w + 0.2, -50);
  ctx.quadraticCurveTo(-w + 0.4, -46, -w + 3, -46);
  ctx.lineTo(w - 3, -46);
  ctx.quadraticCurveTo(w - 0.4, -46, w - 0.2, -50);
  ctx.quadraticCurveTo(w + 0.7, -62, w, -76);
  ctx.quadraticCurveTo(w - 1, -81.2, 5.4, -81.6);
  ctx.closePath();
}

function drawTorso(ctx, P, px) {
  const T = P.top;
  const w = T.kind === 'quarterzip' ? 15.6 : 14.2;
  if (T.kind === 'hoodie') { // the hood lying behind the neck
    ctx.fillStyle = shade(T.color, -0.28); ell(ctx, 0, -80.6, 8.8, 3.8); ctx.fill();
    if (T.hoodTrim) { ctx.strokeStyle = T.trim; ctx.lineWidth = 0.9; ell(ctx, 0, -80.6, 8.8, 3.8); ctx.stroke(); }
  }
  torsoPath(ctx, w);
  const g = ctx.createLinearGradient(-w, -80, w, -46);
  g.addColorStop(0, shade(T.color, 0.14)); g.addColorStop(0.5, T.color); g.addColorStop(1, shade(T.color, -0.25));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = shade(T.color, -0.45); ctx.lineWidth = 0.55; ctx.stroke();
  ctx.save();
  ctx.clip();
  // shadows under the arms and soft folds
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ell(ctx, -w + 1, -64, 2.4, 12); ctx.fill(); ell(ctx, w - 1, -64, 2.4, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 0.55;
  ctx.beginPath(); ctx.moveTo(-9, -52); ctx.quadraticCurveTo(-5, -50.5, -2, -52.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, -53); ctx.quadraticCurveTo(7, -51, 10, -53.5); ctx.stroke();
  if (T.fleece && px > 1.4) { // fuzzy fleece
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    const r = seeded(7);
    for (let i = 0; i < 60; i++) { circ(ctx, -w + r() * w * 2, -81 + r() * 35, 0.5); ctx.fill(); }
  }
  // ribbed hem
  ctx.fillStyle = T.trim; ctx.fillRect(-w - 1, -49.3, w * 2 + 2, 3.4);
  if (px > 1.5) {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.3;
    for (let xx = -w; xx < w; xx += 1) line(ctx, xx, -49.2, xx, -46);
  }

  if (T.kind === 'hoodie') {
    ctx.strokeStyle = T.zip; ctx.lineWidth = 0.75;
    ctx.beginPath(); ctx.moveTo(0, -80.5); ctx.quadraticCurveTo(0.6, -63, 0, -46); ctx.stroke();
    ctx.fillStyle = shade(T.zip, 0.3); rr(ctx, -0.5, -79.6, 1.2, 2.4, 0.3); ctx.fill();
    // front of the hood around the neck
    ctx.strokeStyle = shade(T.color, -0.38); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-5.6, -81.6); ctx.quadraticCurveTo(0, -77.8, 5.6, -81.6); ctx.stroke();
    if (T.hoodTrim) { ctx.strokeStyle = T.trim; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-5.6, -81.2); ctx.quadraticCurveTo(0, -77.6, 5.6, -81.2); ctx.stroke(); }
    if (T.pocket) { // Nafti's zipped chest pocket
      ctx.fillStyle = '#1b1d20'; rr(ctx, 2.4, -75.5, 1.6, 10, 0.7); ctx.fill();
      ctx.fillStyle = '#555'; rr(ctx, 2.5, -75, 1.4, 1.8, 0.3); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.4; line(ctx, -12, -54, -8, -55); line(ctx, 8, -55, 12, -54);
    }
    if (T.badge) { // Emile's golden ADMIN shield
      ctx.fillStyle = '#e8b830';
      poly(ctx, [[3.6, -75.5], [9.6, -75.5], [9.6, -71.5], [6.6, -68.6], [3.6, -71.5]]); ctx.fill();
      ctx.strokeStyle = '#a07810'; ctx.lineWidth = 0.4; ctx.stroke();
      ctx.fillStyle = '#fff8dc'; ctx.font = '900 3.6px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('A', 6.6, -72.6);
    }
    if (T.logo) { // Mio's little green pixel creeper face
      ctx.fillStyle = '#5ec24a'; ctx.fillRect(4.4, -74.6, 4.6, 4.6);
      ctx.fillStyle = '#3c9a2f'; ctx.fillRect(4.4, -71.2, 4.6, 1.2);
      ctx.fillStyle = '#11140f';
      ctx.fillRect(5.0, -73.8, 1.1, 1.1); ctx.fillRect(7.3, -73.8, 1.1, 1.1);
      ctx.fillRect(6.1, -72.7, 1.2, 1.7); ctx.fillRect(5.5, -71.8, 0.7, 1.3); ctx.fillRect(7.2, -71.8, 0.7, 1.3);
    }
  } else if (T.kind === 'quarterzip') {
    // V of the zip showing the navy t-shirt
    ctx.fillStyle = T.tee;
    poly(ctx, [[-4.2, -81.8], [0, -73.2], [4.2, -81.8]]); ctx.fill();
    ctx.strokeStyle = shade(T.color, -0.3); ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.moveTo(-6.5, -82.4); ctx.lineTo(-4, -81.6); ctx.lineTo(-0.2, -73.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6.5, -82.4); ctx.lineTo(4, -81.6); ctx.lineTo(0.2, -73.4); ctx.stroke();
    ctx.strokeStyle = shade(T.color, 0.05); ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-6.5, -82.4); ctx.lineTo(-4, -81.6); ctx.lineTo(-0.2, -73.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6.5, -82.4); ctx.lineTo(4, -81.6); ctx.lineTo(0.2, -73.4); ctx.stroke();
    ctx.fillStyle = '#9a9a96'; rr(ctx, -0.6, -74.2, 1.2, 2, 0.3); ctx.fill();
    // GAME DAY LEGENDS print
    if (px > 1.6) {
      ctx.fillStyle = T.print; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 3.3px "Georgia", serif`; ctx.fillText('GAME DAY', 0.5, -67.6);
      ctx.font = `700 3.1px "Georgia", serif`; ctx.fillText('LEGENDS', 0.5, -64);
      ctx.font = `700 2.9px "Georgia", serif`; ctx.fillText('EST. 1979', 0.5, -60.6);
      ctx.fillStyle = '#f4f2ea'; ctx.fillRect(-1.6, -58, 4.2, 2);
    } else {
      ctx.fillStyle = T.print;
      ctx.fillRect(-5.5, -68.6, 12, 1.8); ctx.fillRect(-5, -65, 11, 1.6); ctx.fillRect(-4, -61.6, 9, 1.4);
    }
  } else if (T.kind === 'jacket') {
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.6;
    for (let yy = -77; yy < -48; yy += 3.2) {
      ctx.beginPath();
      for (let xx = -w; xx <= w; xx += 1) ctx.lineTo(xx, yy + Math.sin(xx * 0.8) * 0.7);
      ctx.stroke();
    }
    ctx.strokeStyle = T.zip; ctx.lineWidth = 0.6; line(ctx, 0, -81, 0, -46);
    ctx.strokeStyle = T.backpack; ctx.lineWidth = 2.2; line(ctx, -8.5, -81, -9.5, -47); line(ctx, 8.5, -81, 9.5, -47);
  }
  ctx.restore();
}

function drawArm(ctx, P, side, hand, px) {
  const T = P.top;
  const sx = side * 12.5, sy = -77.6;
  const [ex, ey, hx, hy] = armIK(sx, sy, hand[0], hand[1], 14.6, 13.6, side);
  const col = T.color;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy);
  ctx.strokeStyle = shade(col, -0.45); ctx.lineWidth = 7.4; ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 6.4; ctx.stroke();
  ctx.strokeStyle = shade(col, 0.1); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx - side * 1.2, sy + 1); ctx.lineTo(ex - side * 1.4, ey); ctx.stroke();
  const dx = hx - ex, dy = hy - ey, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  // cuff
  ctx.strokeStyle = T.cuff || T.trim; ctx.lineWidth = 5.8;
  line(ctx, hx - ux * 2.6, hy - uy * 2.6, hx - ux * 0.6, hy - uy * 0.6);
  if (P.watch === side) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2.2; line(ctx, hx - ux * 0.2 - uy * 2.4, hy - uy * 0.2 + ux * 2.4, hx - ux * 0.2 + uy * 2.4, hy - uy * 0.2 - ux * 2.4);
    ctx.fillStyle = '#c8ccd2'; circ(ctx, hx - ux * 0.2 - uy * 1.6 * side, hy - uy * 0.2 + ux * 1.6 * side, 1.1); ctx.fill();
  }
  // hand
  const cx = hx + ux * 1.7, cy = hy + uy * 1.7;
  ctx.fillStyle = P.skin; ell(ctx, cx, cy, 2.5, 3, Math.atan2(uy, ux) - Math.PI / 2); ctx.fill();
  ctx.strokeStyle = P.skinDark; ctx.lineWidth = 0.4; ctx.stroke();
  if (px > 1.6) { ctx.strokeStyle = 'rgba(0,0,0,0.15)'; line(ctx, cx - uy * 1.2, cy + ux * 1.2, cx + ux * 1.6 - uy * 1.2, cy + uy * 1.6 + ux * 1.2); }
  return [cx, cy];
}

function facePath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-6.5, -94);
  ctx.bezierCurveTo(-6.7, -89, -5.1, -86, 0, -84.4);
  ctx.bezierCurveTo(5.1, -86, 6.7, -89, 6.5, -94);
  ctx.bezierCurveTo(6.5, -101, -6.5, -101, -6.5, -94);
  ctx.closePath();
}

function drawHead(ctx, P, t, st, px) {
  // neck with the shadow under the chin
  const ng = ctx.createLinearGradient(0, -87, 0, -80);
  ng.addColorStop(0, shade(P.skinDark, -0.15)); ng.addColorStop(1, P.skinDark);
  ctx.fillStyle = ng; rr(ctx, -2.8, -87.5, 5.6, 7.4, 1.6); ctx.fill();
  // ears
  if (P.hair !== 'wavy' && P.hair !== 'bangs') {
    ctx.fillStyle = P.skin;
    for (const s of [-1, 1]) { ell(ctx, s * 6.6, -91.8, 1.35, 2.2); ctx.fill(); ctx.strokeStyle = P.skinDark; ctx.lineWidth = 0.4; ctx.stroke(); }
  }
  facePath(ctx);
  const g = ctx.createRadialGradient(-1.6, -93.5, 1, 0, -92, 9.5);
  g.addColorStop(0, shade(P.skin, 0.1)); g.addColorStop(0.65, P.skin); g.addColorStop(1, P.skinDark);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = shade(P.skinDark, -0.2); ctx.lineWidth = 0.4; ctx.stroke();

  const look = st.look || 0;
  const blink = ((t * 0.8 + (st.phase || 0) * 5) % 4.6) < 0.13;
  const dark = '#20140e';
  const eyeY = -92.2;
  const squint = P.face === 'grin' ? 0.7 : 1;
  // eyes
  for (const s of [-1, 1]) {
    const ex = s * 2.55;
    if (blink || st.stun > 0) {
      ctx.strokeStyle = dark; ctx.lineWidth = 0.45;
      if (st.stun > 0) { line(ctx, ex - 0.9, eyeY - 0.8, ex + 0.9, eyeY + 0.8); line(ctx, ex - 0.9, eyeY + 0.8, ex + 0.9, eyeY - 0.8); }
      else { ctx.beginPath(); ctx.arc(ex, eyeY - 0.4, 1.2, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
      continue;
    }
    ctx.fillStyle = '#fbf7f2'; ell(ctx, ex, eyeY, 1.45, 0.85 * squint); ctx.fill();
    ctx.save(); ell(ctx, ex, eyeY, 1.45, 0.85 * squint); ctx.clip();
    ctx.fillStyle = P.eyes; circ(ctx, ex + look * 0.55, eyeY + 0.05, 0.78); ctx.fill();
    ctx.fillStyle = '#0a0705'; circ(ctx, ex + look * 0.55, eyeY + 0.05, 0.38); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ctx, ex + look * 0.55 + 0.25, eyeY - 0.25, 0.17); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = dark; ctx.lineWidth = 0.42;
    ctx.beginPath(); ctx.ellipse(ex, eyeY + 0.1, 1.5, 0.95 * squint, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  // eyebrows
  ctx.strokeStyle = P.hairDark; ctx.lineWidth = 0.62;
  const browUp = P.face === 'grin' ? -0.5 : 0;
  ctx.beginPath(); ctx.moveTo(-4.1, -94.1 + browUp); ctx.quadraticCurveTo(-2.6, -95.1 + browUp, -1.1, -94.5 + browUp); ctx.stroke();
  const rb = P.face === 'smirk' ? -0.7 : browUp;
  ctx.beginPath(); ctx.moveTo(4.1, -94.1 + rb); ctx.quadraticCurveTo(2.6, -95.1 + rb, 1.1, -94.5 + rb); ctx.stroke();
  // nose
  ctx.strokeStyle = shade(P.skinDark, -0.1); ctx.lineWidth = 0.42;
  ctx.beginPath(); ctx.moveTo(0.2, -91.6); ctx.quadraticCurveTo(0.9, -89.6, 0.6, -89.1); ctx.quadraticCurveTo(0, -88.6, -0.7, -89); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ell(ctx, -0.1, -90.3, 0.35, 1); ctx.fill();
  // cheeks
  ctx.fillStyle = 'rgba(230,110,100,0.16)'; ell(ctx, -3.7, -89.4, 1.6, 1); ctx.fill(); ell(ctx, 3.7, -89.4, 1.6, 1); ctx.fill();
  // mouth
  ctx.strokeStyle = P.lip; ctx.lineWidth = 0.5;
  switch (P.face) {
    case 'calm':
      ctx.beginPath(); ctx.moveTo(-1.8, -87.3); ctx.quadraticCurveTo(0, -86.5, 1.8, -87.3); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; line(ctx, -0.7, -86.2, 0.7, -86.2);
      break;
    case 'smirk':
      ctx.beginPath(); ctx.moveTo(-1.5, -87.1); ctx.quadraticCurveTo(0.4, -86.6, 2, -87.8); ctx.stroke();
      break;
    case 'grin':
      ctx.fillStyle = '#5a2020';
      ctx.beginPath(); ctx.moveTo(-2.6, -87.8); ctx.quadraticCurveTo(0, -84.7, 2.6, -87.8); ctx.quadraticCurveTo(0, -87.2, -2.6, -87.8); ctx.fill();
      ctx.fillStyle = '#fbfaf5';
      ctx.beginPath(); ctx.moveTo(-2.3, -87.7); ctx.quadraticCurveTo(0, -87.1, 2.3, -87.7); ctx.quadraticCurveTo(0, -86.4, -2.3, -87.7); ctx.fill();
      ctx.strokeStyle = P.lip; ctx.lineWidth = 0.35;
      ctx.beginPath(); ctx.moveTo(-2.6, -87.8); ctx.quadraticCurveTo(0, -84.7, 2.6, -87.8); ctx.stroke();
      break;
    case 'open':
      ctx.fillStyle = '#6a1f2b'; ell(ctx, 0, -86.9, st.mood === 'scared' ? 1.8 : 1.3, st.mood === 'scared' ? 1.6 : 0.9); ctx.fill();
      break;
  }
}

function drawHairBack(ctx, P) {
  if (P.hair !== 'wavy' && P.hair !== 'bangs') return;
  const g = ctx.createLinearGradient(0, -101, 0, -79);
  g.addColorStop(0, P.hairDark); g.addColorStop(0.45, P.hairColor); g.addColorStop(1, P.hairLight);
  ctx.fillStyle = g;
  ctx.beginPath();
  if (P.hair === 'wavy') {
    ctx.moveTo(-6, -99.5);
    ctx.bezierCurveTo(-10.2, -98.5, -10.6, -90, -10.2, -86.5);
    ctx.bezierCurveTo(-11, -83.5, -9.2, -81.6, -10.8, -79.6);
    ctx.quadraticCurveTo(-8.2, -79.6, -7.3, -81.6);
    ctx.quadraticCurveTo(-6, -79.8, -4.4, -81.4);
    ctx.lineTo(4.4, -81.4);
    ctx.quadraticCurveTo(6, -79.8, 7.3, -81.6);
    ctx.quadraticCurveTo(8.2, -79.6, 10.8, -79.6);
    ctx.bezierCurveTo(9.2, -81.6, 11, -83.5, 10.2, -86.5);
    ctx.bezierCurveTo(10.6, -90, 10.2, -98.5, 6, -99.5);
  } else {
    ctx.moveTo(-6, -99.5);
    ctx.bezierCurveTo(-9.6, -98.5, -9.4, -88, -9.2, -80.5);
    ctx.lineTo(9.2, -80.5);
    ctx.bezierCurveTo(9.4, -88, 9.6, -98.5, 6, -99.5);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.4;
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 8.2, -94); ctx.quadraticCurveTo(s * 9.6, -88, s * 8.6, -82); ctx.stroke();
  }
}

function drawHairFront(ctx, P, px) {
  const g = ctx.createLinearGradient(0, -102, 0, -86);
  g.addColorStop(0, P.hairDark); g.addColorStop(0.5, P.hairColor); g.addColorStop(1, P.hairLight);
  ctx.fillStyle = P.hair === 'curly' ? P.hairColor : g;
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.35;
  if (P.hair === 'curly') {
    ctx.beginPath();
    ctx.moveTo(-6.8, -92.4);
    ctx.bezierCurveTo(-7.4, -98.6, -4.5, -101.6, 0, -101.4);
    ctx.bezierCurveTo(4.5, -101.6, 7.4, -98.6, 6.8, -92.4);
    ctx.lineTo(6.2, -93.7);
    ctx.quadraticCurveTo(5, -96.7, 2, -96.9);
    ctx.quadraticCurveTo(0, -96.3, -2, -96.9);
    ctx.quadraticCurveTo(-5, -96.7, -6.2, -93.7);
    ctx.closePath(); ctx.fill();
    // tight curls all over
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * (1.02 + i * 0.0686);
      circ(ctx, Math.cos(a) * 6.8, -95.6 + Math.sin(a) * 5.9, 1.3); ctx.fill();
    }
    ctx.fillStyle = P.hairLight;
    const r = seeded(3);
    for (let i = 0; i < 36; i++) {
      const a = Math.PI * (1.05 + r() * 0.9), rad = r() * 5.4;
      circ(ctx, Math.cos(a) * rad * 1.15, -96.5 + Math.sin(a) * rad, 0.45); ctx.fill();
    }
  } else if (P.hair === 'wavy') {
    ctx.beginPath();
    ctx.moveTo(-7.3, -87.6);
    ctx.bezierCurveTo(-7.9, -95, -6, -101.4, -0.6, -101.5);
    ctx.bezierCurveTo(5.6, -101.5, 7.9, -96, 7.4, -87.8);
    ctx.bezierCurveTo(6.4, -90.8, 6.3, -94.4, 3.9, -96.5);
    ctx.quadraticCurveTo(1.4, -97.7, -0.9, -97.9);
    ctx.quadraticCurveTo(-4.6, -96.9, -5.7, -94.4);
    ctx.bezierCurveTo(-6.4, -92.4, -6.2, -89.8, -7.3, -87.6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = shade(P.hairDark, 0.1); ctx.lineWidth = 0.32;
    for (const [x0, x1] of [[-1, -6.5], [0.5, -4], [2, 5.5], [3.5, 7]]) {
      ctx.beginPath(); ctx.moveTo(x0, -101); ctx.quadraticCurveTo((x0 + x1) / 2 + (x1 > 0 ? 1.5 : -1.5), -97, x1, -90); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,240,200,0.5)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-3, -100.5); ctx.quadraticCurveTo(-5.5, -98, -6, -94); ctx.stroke();
  } else if (P.hair === 'short') {
    ctx.beginPath();
    ctx.moveTo(-6.9, -92.6);
    ctx.bezierCurveTo(-7.5, -99.6, -3.6, -102.4, 0.4, -102.2);
    ctx.bezierCurveTo(5, -102, 7.7, -99, 6.9, -92.6);
    ctx.lineTo(6.3, -94.7);
    const fringe = [[4.7, -96.4], [3.8, -95.3], [2.5, -96.8], [1.3, -95.4], [-0.1, -96.7], [-1.6, -95.2], [-3, -96.5], [-4.4, -95.5], [-5.6, -96.1]];
    for (const [fx, fy] of fringe) ctx.lineTo(fx, fy);
    ctx.lineTo(-6.3, -94.7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = P.hairLight; ctx.lineWidth = 0.35;
    for (const xx of [-4, -1.5, 1, 3.5]) { ctx.beginPath(); ctx.moveTo(xx + 1, -101.5); ctx.quadraticCurveTo(xx + 0.2, -99, xx - 0.5, -96.8); ctx.stroke(); }
    // a few spiky bits on top
    ctx.fillStyle = P.hairColor;
    poly(ctx, [[-2.5, -101.9], [-1.6, -103.3], [-0.6, -102]]); ctx.fill();
    poly(ctx, [[1, -102.1], [2.3, -103.2], [2.8, -101.6]]); ctx.fill();
  } else if (P.hair === 'bangs') {
    ctx.beginPath();
    ctx.moveTo(-7.2, -86.5);
    ctx.bezierCurveTo(-7.8, -96, -5.6, -101.4, 0, -101.4);
    ctx.bezierCurveTo(5.6, -101.4, 7.8, -96, 7.2, -86.5);
    ctx.lineTo(5.9, -88);
    ctx.lineTo(5.6, -95.4);
    for (let xx = 4.5; xx >= -4.5; xx -= 1.5) ctx.lineTo(xx, -95.6 + (Math.round(xx * 2) % 2 ? 0.4 : 0));
    ctx.lineTo(-5.6, -95.4);
    ctx.lineTo(-5.9, -88);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function drawGlasses(ctx) {
  ctx.strokeStyle = '#c4a06a'; ctx.lineWidth = 0.45;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (const s of [-1, 1]) { circ(ctx, s * 2.6, -92.2, 2.05); ctx.fill(); ctx.stroke(); }
  line(ctx, -0.6, -92.6, 0.6, -92.6);
}

function drawDodgeball(ctx, x, y, r) {
  ctx.fillStyle = '#e8343a'; circ(ctx, x, y, r); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ell(ctx, x - r * 0.35, y - r * 0.4, r * 0.35, r * 0.22, -0.5); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = r * 0.12;
  ctx.beginPath(); ctx.arc(x, y, r * 0.75, 0.2, 1.4); ctx.stroke();
}

function drawMioStick(ctx, pose, act, st) {
  const [hx, hy] = pose.rh;
  let a = -2.0;                          // pointing up-left
  if (act > 0) a = st.aim != null ? st.aim : -0.8;
  const len = 26, back = 8;
  const tx = hx + Math.cos(a) * len, ty = hy + Math.sin(a) * len;
  ctx.strokeStyle = '#6b5236'; ctx.lineWidth = 1.7;
  line(ctx, hx - Math.cos(a) * back, hy - Math.sin(a) * back, tx, ty);
  ctx.strokeStyle = '#b39468'; ctx.lineWidth = 0.7;
  line(ctx, hx - Math.cos(a) * back, hy - Math.sin(a) * back, tx, ty);
  if (act > 0) {
    ctx.fillStyle = `rgba(110,255,120,${0.5 * act})`; circ(ctx, tx, ty, 4 + act * 3); ctx.fill();
    ctx.fillStyle = '#c8ffc0'; ctx.fillRect(tx - 1.2, ty - 1.2, 2.4, 2.4);
  }
  if (st.out) { st.out.tipX = tx; st.out.tipY = ty; }
}

function drawFelixRod(ctx, pose, act, st, t) {
  const [hx, hy] = pose.lh;
  let a = -2.25;                         // rod points up and to the side
  if (act > 0) a = -2.25 + act * ((st.aim != null ? st.aim : -0.7) + 2.25);
  const len = 30;
  const tx = hx + Math.cos(a) * len, ty = hy + Math.sin(a) * len;
  ctx.strokeStyle = '#5e4630'; ctx.lineWidth = 1.8; line(ctx, hx + Math.cos(a) * -3, hy + Math.sin(a) * -3, tx, ty);
  ctx.strokeStyle = '#a3825a'; ctx.lineWidth = 0.7; line(ctx, hx + Math.cos(a) * -3, hy + Math.sin(a) * -3, tx, ty);
  // the blue string with a hook (only when not casting)
  if (act <= 0) {
    const sw = Math.sin(t * 2 + (st.phase || 0)) * 1.5;
    ctx.strokeStyle = '#2f8ee8'; ctx.lineWidth = 0.55;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx - 1 + sw, ty + 14, tx + sw, ty + 26); ctx.stroke();
    ctx.strokeStyle = '#bbb'; ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.arc(tx + sw + 0.8, ty + 26.8, 0.9, Math.PI, Math.PI * 2.6); ctx.stroke();
  }
  if (st.out) { st.out.tipX = tx; st.out.tipY = ty; }
}

function drawDizzy(ctx, t) {
  for (let i = 0; i < 3; i++) {
    const a = t * 5 + i * Math.PI * 2 / 3;
    drawStar(ctx, Math.cos(a) * 9, -110 + Math.sin(a) * 2, 2, a, '#ffe45c', '#c9a400');
  }
}

// =====================================================================
//  ADMIN/EMILE: a flying human with angel wings and a golden aura
//  (x, y) is the middle of the body. The laser comes out of the right hand.
// =====================================================================
const EMILE_BODY = 0.72;   // body size compared to s
function drawEmile(ctx, x, y, s, t, st) {
  st = st || {};
  const flap = Math.sin(t * 7);
  const face = st.face || 1;
  ctx.save();
  ctx.translate(x, y);
  // golden aura
  const R = 72 * s;
  const glow = ctx.createRadialGradient(0, -6 * s, 4 * s, 0, -6 * s, R);
  glow.addColorStop(0, 'rgba(255,236,140,0.75)');
  glow.addColorStop(0.45, 'rgba(255,205,70,0.35)');
  glow.addColorStop(1, 'rgba(255,190,40,0)');
  ctx.fillStyle = glow; circ(ctx, 0, -6 * s, R); ctx.fill();
  // slowly turning rays of light
  ctx.save();
  ctx.translate(0, -6 * s); ctx.rotate(t * 0.4);
  ctx.fillStyle = 'rgba(255,220,90,0.16)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    poly(ctx, [[0, 0], [-4 * s, -R * 1.15], [4 * s, -R * 1.15]]); ctx.fill();
  }
  ctx.restore();
  // golden sparkles
  for (let i = 0; i < 7; i++) {
    const a = t * 1.1 + i * Math.PI * 2 / 7, r = (40 + Math.sin(t * 2 + i) * 8) * s;
    const k = 0.5 + Math.sin(t * 5 + i * 2) * 0.5;
    ctx.fillStyle = `rgba(255,240,170,${0.4 + k * 0.6})`;
    sparkle(ctx, Math.cos(a) * r, -6 * s + Math.sin(a) * r * 0.75, (1.5 + k * 2.5) * s);
  }
  // the body (in person units, feet at 0)
  const p = s * EMILE_BODY;
  ctx.translate(0, 50 * s);
  ctx.scale(face, 1);
  ctx.rotate(0.08 + Math.sin(t * 1.3) * 0.04);
  ctx.save();
  ctx.scale(p, p);
  drawAngelWing(ctx, -1, flap);
  drawAngelWing(ctx, 1, flap);
  ctx.restore();
  drawPerson(ctx, 'emile', 0, 0, p, t, { noShadow: true, phase: 1.5, zoom: 1 });
  ctx.scale(p, p);
  // golden halo
  ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 2.4;
  ctx.shadowColor = '#ffe680'; ctx.shadowBlur = 8 * p;
  ell(ctx, 0, -118, 11, 3); ctx.stroke();
  ctx.shadowBlur = 0;
  // power glowing in the laser hand
  const pulse = 0.6 + Math.sin(t * 12) * 0.4;
  ctx.fillStyle = `rgba(255,240,150,${0.45 * pulse})`; circ(ctx, 40, -86, 9 + pulse * 3); ctx.fill();
  ctx.fillStyle = '#fffbe0'; circ(ctx, 40, -86, 3.5); ctx.fill();
  ctx.restore();
}

function sparkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2); ctx.quadraticCurveTo(x, y, x + r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y + r * 2); ctx.quadraticCurveTo(x, y, x - r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y - r * 2); ctx.fill();
}

// One big feathered angel wing growing out of the back. side = -1 (left) or 1 (right)
function drawAngelWing(ctx, side, flap) {
  ctx.save();
  ctx.translate(side * 5, -74);
  ctx.scale(side * 1.35, 1.35);
  ctx.rotate(-0.45 - flap * 0.38);
  // long flight feathers
  for (let i = 7; i >= 0; i--) {
    const k = i / 7;
    const bx = k * 52, by = -k * k * 22;
    const len = 20 + k * 26;
    ctx.save();
    ctx.translate(bx, by); ctx.rotate(1.05 - k * 0.75);
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#fff6dc'); g.addColorStop(1, '#f2cf6a');
    ctx.fillStyle = g;
    ell(ctx, 0, len * 0.5, 5, len * 0.55); ctx.fill();
    ctx.strokeStyle = '#d9b45a'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.strokeStyle = 'rgba(200,160,60,0.5)'; ctx.lineWidth = 0.4; line(ctx, 0, 2, 0, len * 0.95);
    ctx.restore();
  }
  // small soft feathers along the top
  for (let i = 0; i < 7; i++) {
    const k = i / 6;
    ctx.save();
    ctx.translate(k * 46, -k * k * 20 + 2); ctx.rotate(1.2 - k * 0.6);
    ctx.fillStyle = '#fffdf6'; ell(ctx, 0, 6, 4.4, 8); ctx.fill();
    ctx.strokeStyle = '#e6c97a'; ctx.lineWidth = 0.5; ctx.stroke();
    ctx.restore();
  }
  // the top edge of the wing
  ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(28, -2, 52, -22); ctx.stroke();
  ctx.strokeStyle = '#e8c766'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
