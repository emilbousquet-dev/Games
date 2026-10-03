// =====================================================================
//  DRESS TO IMPRESS BILL: the kids and ALL the clothes, drawn with code
//  (the kids come from KIDS vs VIDEO GAMES)
//  A person is 100 units tall: feet at y = 0, top of the head at y = -100.
//  The head is drawn 35% bigger, so its own numbers go from -101 (top) to -84 (chin).
// =====================================================================

const KIDS = {
  mio:   { skin: '#f1cfb6', skinDark: '#d6a98b', lip: '#c9837a', eyes: '#4a6a7c', face: 'smirk' },
  nafti: { skin: '#a06a46', skinDark: '#7e4f32', lip: '#7a3f32', eyes: '#2a1810', face: 'calm' },
  felix: { skin: '#ddae8a', skinDark: '#bd8a66', lip: '#a8564c', eyes: '#3b2414', face: 'grin' },
  emile: { skin: '#efc9a8', skinDark: '#d3a281', lip: '#b8665c', eyes: '#3d6a8a', face: 'grin' },
  bill:  { skin: '#f6d6c0', skinDark: '#dcae95', lip: '#cf7d78', eyes: '#3b5a70', face: 'open' },
};

// Bill always wears his own clothes (he's the judge!)
const BILL_LOOK = Object.assign({}, KIDS.bill, {
  hair: 'bangs', hairColor: '#d6ae5c',
  hat: { id: 'none' }, acc: { id: 'glasses', c: '#c4a06a' },
  top: { id: 'puffer', c: '#1f4a36' }, bottom: { id: 'joggers', c: '#e4e4e6' },
  shoes: { id: 'sneakers', c: '#b9d8c8' }, extra: { id: 'backpack', c: '#2b4fa8' },
});

const HEAD_SCALE = 1.35, HEAD_PIVOT = -82;
const SILVER = '#c3c9d1';

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
  if (ey2 + out * ex2 * 0.3 > ey + out * ex * 0.3) { ex = ex2; ey = ey2; }
  return [ex, ey, hx, hy];
}

// Where the hands go. st.pose = rest, hips, wave, phone, wow, angry, card, clap
function poseFor(L, t, st) {
  const sway = Math.sin(t * 2.1 + (st.phase || 0)) * 0.5;
  let lh = [-15, -50 + sway], rh = [15, -50 - sway];
  const pose = st.pose || 'rest';
  const free = pose === 'rest' || pose === 'hips';
  switch (pose) {
    case 'hips': lh = [-13.5, -51]; rh = [13.5, -51]; break;
    case 'wave': lh = [-13.5, -51]; rh = [21 + Math.sin(t * 9) * 4, -97]; break;
    case 'phone': lh = [-3.5, -63]; rh = [3.5, -63]; break;
    case 'wow': lh = [-16, -103 + Math.sin(t * 20) * 2]; rh = [16, -103 - Math.sin(t * 20) * 2]; break;
    case 'angry': lh = [8, -63]; rh = [-8, -61]; break;
    case 'card': rh = [17, -100]; break;
    case 'clap': { const c = Math.abs(Math.sin(t * 10)); lh = [-1.5 - 4 * c, -68]; rh = [1.5 + 4 * c, -68]; break; }
  }
  const ex = L.extra.id;
  if (free) {
    if (ex === 'controller') { lh = [-5, -60]; rh = [5, -60]; }
    else if (ex === 'guitar') { lh = [-13, -71]; rh = [4, -57 + Math.sin(t * 9) * 1.5]; }
    else if (ex === 'surfboard') lh = [-19, -56];
    else if (ex === 'shield') lh = [-14, -57];
    if (['sword', 'wand', 'spatula', 'scepter', 'lasso', 'balloons', 'ball'].includes(ex)) rh = [15.5, -53];
  }
  return { lh, rh };
}

// Draws a whole person. L = the look (body + clothes)
// st = { pose, mood, walk, phase, noShadow, zoom, phone, out }
function drawPerson(ctx, L, x, y, s, t, st) {
  st = st || {};
  const px = s * (st.zoom || 1);  // screen pixels per unit (to skip tiny details)
  const breathe = Math.sin(t * 2.1 + (st.phase || 0)) * 0.35;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (!st.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ell(ctx, 0, 0, 16, 3.8); ctx.fill(); }
  if (st.walk != null) ctx.translate(0, -Math.abs(Math.sin(st.walk)) * 1.6);
  const pose = poseFor(L, t, st);

  drawBackExtra(ctx, L, t, st);
  drawShoesAndLegs(ctx, L, px, st);
  ctx.translate(0, breathe);
  drawTorso(ctx, L, px, t);
  if (L.extra.id === 'backpack') { ctx.strokeStyle = shade(L.extra.c, -0.1); ctx.lineWidth = 2.2; line(ctx, -8.5, -81, -9.5, -47); line(ctx, 8.5, -81, 9.5, -47); }
  if (L.extra.id === 'guitar') drawGuitar(ctx, L.extra.c);

  // the head is 35% bigger than a grown-up's
  ctx.save();
  ctx.translate(0, HEAD_PIVOT); ctx.scale(HEAD_SCALE, HEAD_SCALE); ctx.translate(0, -HEAD_PIVOT);
  drawHairBack(ctx, L);
  drawHead(ctx, L, t, st, px * HEAD_SCALE);
  drawHairFront(ctx, L, px * HEAD_SCALE);
  drawFaceItem(ctx, L, t);
  drawHat(ctx, L, t);
  ctx.restore();

  if (L.extra.id === 'scarf') drawScarf(ctx, L.extra.c, t);
  if (L.extra.id === 'chain') drawChain(ctx);
  if (L.extra.id === 'cape') { // the cape's collar and gold clasps
    ctx.fillStyle = shade(L.extra.c, -0.15);
    poly(ctx, [[-12.5, -81], [-6, -83], [-5.5, -79]]); ctx.fill();
    poly(ctx, [[12.5, -81], [6, -83], [5.5, -79]]); ctx.fill();
    ctx.fillStyle = '#f2c94c'; circ(ctx, -6, -80, 1.3); ctx.fill(); circ(ctx, 6, -80, 1.3); ctx.fill();
  }
  drawHeldProp(ctx, L, pose.rh, t);
  const lh = drawArm(ctx, L, -1, pose.lh, px);
  const rh = drawArm(ctx, L, 1, pose.rh, px);
  drawFrontProp(ctx, L, lh, rh, t);
  if (st.phone) {
    ctx.fillStyle = '#1c2440'; rr(ctx, -3.2, -70, 6.4, 9.5, 1); ctx.fill();
    ctx.fillStyle = '#6ad0ff'; rr(ctx, -2.4, -69.2, 4.8, 7.8, 0.6); ctx.fill();
  }
  if (st.out) { st.out.lh = lh; st.out.rh = rh; }
  ctx.restore();
}

// =====================================================================
//  LEGS, PANTS AND SHOES
// =====================================================================
const LEG = {
  normal: { oTop: 13.6, oKnee: 11.2, oAnk: 9.8, iKnee: 2.4, iAnk: 4.4, ankleY: -4.4 },
  wide:   { oTop: 13.8, oKnee: 12.8, oAnk: 12.6, iKnee: 1.4, iAnk: 2, ankleY: -2.4 },
  slim:   { oTop: 13.4, oKnee: 10.6, oAnk: 9.2, iKnee: 3, iAnk: 4.8, ankleY: -4.4 },
  bare:   { oTop: 12, oKnee: 9.6, oAnk: 8.4, iKnee: 3.4, iAnk: 5.2, ankleY: -4.6 },
};
const BOTTOM_SHAPE = {
  joggers: 'normal', jeans: 'slim', ripped: 'slim', cargo: 'normal', shorts: 'bare', suitpants: 'slim',
  skirt: 'bare', tutu: 'bare', spacepants: 'wide', armorlegs: 'slim', pirate: 'normal', tights: 'slim',
  snowpants: 'wide', checkered: 'normal', bones: 'normal',
};

function legPath(ctx, side, g) {
  ctx.beginPath();
  ctx.moveTo(side * 0.3, -48);
  ctx.lineTo(side * g.oTop, -50);
  ctx.quadraticCurveTo(side * (g.oKnee + 1), -37, side * g.oKnee, -24);
  ctx.lineTo(side * g.oAnk, g.ankleY);
  ctx.quadraticCurveTo(side * (g.oAnk + g.iAnk) / 2, g.ankleY + 0.6, side * g.iAnk, g.ankleY);
  ctx.lineTo(side * g.iKnee, -24);
  ctx.quadraticCurveTo(side * 0.8, -37, side * 0.3, -43);
  ctx.closePath();
}
function fillGrad(ctx, color, x0, x1) {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, shade(color, 0.12)); g.addColorStop(0.5, color); g.addColorStop(1, shade(color, -0.25));
  return g;
}

function walkOffset(st, side) {
  if (st.walk == null) return [0, 0];
  const k = Math.sin(st.walk + (side > 0 ? Math.PI : 0));
  return [k * 1.5, Math.max(0, k) * 4];
}

function drawShoesAndLegs(ctx, L, px, st) {
  for (const side of [-1, 1]) {
    const [dx, lift] = walkOffset(st, side);
    ctx.save(); ctx.translate(dx, -lift);
    drawLeg(ctx, L, side, px);
    drawShoe(ctx, L, side, px);
    ctx.restore();
  }
  drawBottomOver(ctx, L, px);
}

function drawLeg(ctx, L, side, px) {
  const B = L.bottom, id = B.id;
  const shape = LEG[BOTTOM_SHAPE[id] || 'normal'];
  let c = B.c;
  if (id === 'armorlegs') c = SILVER;
  if (shape === LEG.bare) { // bare kid legs (shorts, skirts and tutus go over them)
    legPath(ctx, side, shape);
    ctx.fillStyle = fillGrad(ctx, L.skin, -12, 12); ctx.fill();
    ctx.strokeStyle = shade(L.skinDark, -0.2); ctx.lineWidth = 0.45; ctx.stroke();
    if (id === 'shorts') {
      ctx.save(); ctx.beginPath(); ctx.rect(-20, -60, 40, 31); ctx.clip();
      legPath(ctx, side, LEG.wide); ctx.fillStyle = fillGrad(ctx, c, -14, 14); ctx.fill();
      ctx.strokeStyle = shade(c, -0.45); ctx.lineWidth = 0.5; ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = shade(c, -0.35); ctx.lineWidth = 1; line(ctx, side * 1.2, -29.6, side * 13, -29.6);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8; line(ctx, side * 12.4, -48, side * 12.6, -31);
    }
    return;
  }
  legPath(ctx, side, shape);
  ctx.fillStyle = fillGrad(ctx, c, -14, 14); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(side * 4, -26); ctx.quadraticCurveTo(side * 7, -24.5, side * 9.5, -26.5); ctx.stroke();
  switch (id) {
    case 'jeans': case 'ripped':
      ctx.strokeStyle = 'rgba(255,215,120,0.6)'; ctx.lineWidth = 0.35;
      line(ctx, side * 12.2, -48, side * 9.6, -5); line(ctx, side * 3.6, -40, side * 5, -5);
      ctx.beginPath(); ctx.moveTo(side * 12.8, -46); ctx.quadraticCurveTo(side * 9, -45, side * 8, -49); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.12)'; ell(ctx, side * 7, -30, 2.5, 6); ctx.fill();
      if (id === 'ripped') {
        ctx.fillStyle = L.skin; ell(ctx, side * 7, -26, 3, 1.6); ctx.fill(); ell(ctx, side * 6.2, -38, 2, 1); ctx.fill();
        ctx.strokeStyle = '#eee'; ctx.lineWidth = 0.4;
        for (let i = -2; i <= 2; i++) line(ctx, side * (7 + i * 1.1), -27.6, side * (7 + i * 1.1), -24.4);
      }
      break;
    case 'joggers':
      ctx.fillStyle = shade(c, -0.2); ctx.fillRect(-16, -8.6, 32, 4.4);
      ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 0.9; line(ctx, side * 12.8, -48, side * 9.9, -9);
      break;
    case 'cargo': {
      const x0 = side > 0 ? 8.2 : -12.4;
      ctx.fillStyle = shade(c, -0.08); rr(ctx, x0, -38, 4.2, 7.5, 0.7); ctx.fill();
      ctx.strokeStyle = shade(c, -0.4); ctx.lineWidth = 0.45; ctx.stroke();
      ctx.fillStyle = shade(c, 0.06); rr(ctx, x0 - 0.2, -38.6, 4.6, 2.2, 0.6); ctx.fill(); ctx.stroke();
      break;
    }
    case 'suitpants':
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 0.5; line(ctx, side * 7, -44, side * 7, -5);
      break;
    case 'spacepants': case 'snowpants':
      ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 0.6;
      for (let yy = -44; yy < -4; yy += 5) line(ctx, -16, yy, 16, yy + 0.6);
      if (id === 'spacepants') { ctx.fillStyle = '#8a929c'; ctx.fillRect(-16, -27, 32, 3); ctx.fillRect(-16, -6.5, 32, 3); }
      else { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(side > 0 ? 11 : -12, -46, 1, 40); }
      break;
    case 'armorlegs':
      ctx.strokeStyle = '#7d858f'; ctx.lineWidth = 0.6;
      for (const yy of [-42, -36, -16, -10]) line(ctx, -16, yy, 16, yy);
      ctx.fillStyle = '#e3e7ec'; circ(ctx, side * 7, -26, 3.6); ctx.fill(); ctx.strokeStyle = '#6c737c'; ctx.stroke();
      ctx.fillStyle = '#fff'; circ(ctx, side * 6.2, -27, 1); ctx.fill();
      break;
    case 'pirate':
      ctx.fillStyle = '#f4f2ea';
      for (let yy = -48; yy < 0; yy += 5) ctx.fillRect(-16, yy, 32, 2.3);
      break;
    case 'tights':
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ell(ctx, side * 6, -32, 1.6, 10); ctx.fill();
      break;
    case 'checkered':
      ctx.fillStyle = '#f4f2ea'; ctx.fillRect(-16, -52, 32, 52);
      ctx.fillStyle = c;
      for (let yy = -52; yy < 0; yy += 2.6) for (let xx = -16; xx < 16; xx += 2.6) {
        if ((Math.round(xx / 2.6) + Math.round(yy / 2.6)) % 2 === 0) ctx.fillRect(xx, yy, 2.6, 2.6);
      }
      break;
    case 'bones': {
      const bx = side * 7;
      ctx.strokeStyle = '#f2efe6'; ctx.lineWidth = 1.6;
      line(ctx, bx, -44, bx, -28); line(ctx, bx, -24, bx, -8);
      ctx.fillStyle = '#f2efe6';
      for (const yy of [-44, -28, -24, -8]) { circ(ctx, bx - 1.1, yy, 1.2); ctx.fill(); circ(ctx, bx + 1.1, yy, 1.2); ctx.fill(); }
      break;
    }
  }
  ctx.restore();
  legPath(ctx, side, shape);
  ctx.strokeStyle = shade(c, -0.45); ctx.lineWidth = 0.5; ctx.stroke();
}

// Things that go over both legs (skirts, tutus, belts)
function drawBottomOver(ctx, L, px) {
  const B = L.bottom, c = B.c;
  if (B.id === 'skirt') {
    ctx.beginPath();
    ctx.moveTo(-13.4, -50); ctx.lineTo(13.4, -50);
    ctx.lineTo(17.5, -25); ctx.quadraticCurveTo(0, -23, -17.5, -25); ctx.closePath();
    ctx.fillStyle = fillGrad(ctx, c, -17, 17); ctx.fill();
    ctx.strokeStyle = shade(c, -0.45); ctx.lineWidth = 0.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    for (let i = -3; i <= 3; i++) line(ctx, i * 3.6, -49, i * 4.8, -24.5);
  } else if (B.id === 'tutu') {
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = shade(c, -0.15 + i * 0.15);
      ell(ctx, 0, -43 - i * 2, 22 - i * 3, 5 - i * 0.6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let k = -4; k <= 4; k++) { circ(ctx, k * (5 - i), -40.5 - i * 2, 0.6); ctx.fill(); }
    }
    ctx.fillStyle = shade(c, -0.2); ctx.fillRect(-13.6, -50, 27.2, 4);
  } else if (B.id === 'suitpants' || B.id === 'jeans' || B.id === 'ripped') {
    ctx.fillStyle = '#2a1e16'; ctx.fillRect(-13.6, -50, 27.2, 2.6);
    ctx.fillStyle = '#c8ccd2'; rr(ctx, -2, -50.4, 4, 3.4, 0.6); ctx.fill();
  }
}

function drawShoe(ctx, L, side, px) {
  const S = L.shoes, c = S.c, id = S.id;
  const cx = side * 7.4 + side * 0.7;
  const dark = shade(c || '#888', -0.45);
  const outline = () => { ctx.strokeStyle = dark; ctx.lineWidth = 0.5; ctx.stroke(); };
  switch (id) {
    case 'boots': case 'snow': case 'hero': case 'cowboy': {
      const top = id === 'hero' ? -21 : id === 'cowboy' ? -17 : -15;
      ctx.fillStyle = c; rr(ctx, cx - 5.4, top, 10.8, -top - 1, 2); ctx.fill(); outline();
      if (id === 'cowboy') { // pointy toe and heel
        poly(ctx, [[cx + side * 4, -5.5], [cx + side * 8.6, -1.4], [cx + side * 3, -0.6]]); ctx.fill(); outline();
        ctx.strokeStyle = shade(c, 0.35); ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.arc(cx, -10, 2.2, 0, Math.PI * 1.5); ctx.stroke();
        ctx.fillStyle = '#2a1a10'; ctx.fillRect(cx - side * 5.2 - 1.2, -2.2, 2.4, 2.2);
        drawStar(ctx, cx - side * 6.4, -2.6, 1.6, 0, '#d5d9de', '#7d858f');
      }
      if (id === 'snow') { ctx.fillStyle = '#f7f4ee'; rr(ctx, cx - 6.2, top - 1.5, 12.4, 4.5, 2); ctx.fill(); }
      if (id === 'boots') { ctx.fillStyle = shade(c, 0.15); rr(ctx, cx - 5.8, top, 11.6, 3, 1); ctx.fill(); }
      if (id === 'hero') { ctx.fillStyle = shade(c, 0.2); poly(ctx, [[cx - 5.4, top], [cx, top + 4], [cx + 5.4, top]]); ctx.fill(); }
      ctx.fillStyle = '#26201c'; rr(ctx, cx - 6, -1.8, 12, 2, 0.9); ctx.fill();
      return;
    }
    case 'fancy':
      ctx.fillStyle = c; rr(ctx, cx - 5.6, -4.8, 11.2, 4.6, 2.3); ctx.fill(); outline();
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ell(ctx, cx + side * 1.5, -3.6, 2.4, 0.8); ctx.fill();
      ctx.fillStyle = '#1a1414'; rr(ctx, cx - 5.8, -1, 11.6, 1.2, 0.5); ctx.fill();
      return;
    case 'flipflops':
      ctx.fillStyle = c; rr(ctx, cx - 6, -1.4, 12, 1.6, 0.8); ctx.fill(); outline();
      ctx.fillStyle = L.skin; ell(ctx, cx, -2.8, 5, 2); ctx.fill();
      ctx.strokeStyle = shade(L.skinDark, -0.2); ctx.lineWidth = 0.4; ctx.stroke();
      ctx.strokeStyle = shade(c, -0.2); ctx.lineWidth = 0.9;
      line(ctx, cx + side * 1.5, -3.6, cx - 2.5, -1.4); line(ctx, cx + side * 1.5, -3.6, cx + 3, -1.4);
      return;
    case 'moon':
      ctx.fillStyle = c; rr(ctx, cx - 7, -13, 14, 12.5, 4.5); ctx.fill(); outline();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.6;
      line(ctx, cx - 6.5, -9, cx + 6.5, -9); line(ctx, cx - 6.8, -5, cx + 6.8, -5);
      ctx.fillStyle = '#596069'; rr(ctx, cx - 7.4, -1.8, 14.8, 2.2, 1); ctx.fill();
      return;
    case 'skates':
      ctx.fillStyle = c; rr(ctx, cx - 5.6, -10, 11.2, 9, 2.4); ctx.fill(); outline();
      ctx.fillStyle = '#f4f4f0'; ctx.fillRect(cx - 5.6, -10.5, 11.2, 2);
      ctx.fillStyle = '#888'; ctx.fillRect(cx - 5.8, -1.5, 11.6, 1.4);
      ctx.fillStyle = '#ffd23f'; circ(ctx, cx - 3.4, 0.9, 1.7); ctx.fill(); circ(ctx, cx + 3.4, 0.9, 1.7); ctx.fill();
      return;
    case 'iron':
      ctx.fillStyle = SILVER; rr(ctx, cx - 5.8, -8, 11.6, 8, 2.6); ctx.fill();
      ctx.strokeStyle = '#6c737c'; ctx.lineWidth = 0.5; ctx.stroke();
      line(ctx, cx - 5.5, -5.4, cx + 5.5, -5.4); line(ctx, cx - 5.5, -3, cx + 5.5, -3);
      return;
    case 'clogs':
      ctx.fillStyle = c; ell(ctx, cx + side * 0.4, -3.2, 6.4, 3.6); ctx.fill(); outline();
      ctx.fillStyle = shade(c, -0.3);
      for (let i = -1; i <= 1; i++) { circ(ctx, cx + i * 2.2, -4.4, 0.45); ctx.fill(); }
      ctx.fillStyle = '#555'; ctx.fillRect(cx - 6.2, -0.8, 12.4, 1);
      return;
    case 'bunny':
      ctx.fillStyle = c; ell(ctx, cx, -3.4, 6.6, 3.6); ctx.fill(); outline();
      for (const e of [-1.6, 1.6]) { ctx.fillStyle = c; ell(ctx, cx + e, -8, 1.3, 3.4, e * 0.12); ctx.fill(); outline(); ctx.fillStyle = '#f7a8c8'; ell(ctx, cx + e, -8, 0.6, 2.2, e * 0.12); ctx.fill(); }
      ctx.fillStyle = '#222'; circ(ctx, cx - 1.6, -4.4, 0.5); ctx.fill(); circ(ctx, cx + 1.6, -4.4, 0.5); ctx.fill();
      ctx.fillStyle = '#f27cc0'; circ(ctx, cx + side * 0.3, -3, 0.6); ctx.fill();
      return;
    case 'witch':
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(cx - side * 5.4, -5); ctx.lineTo(cx + side * 3, -5);
      ctx.quadraticCurveTo(cx + side * 9, -3, cx + side * 10, -7);
      ctx.quadraticCurveTo(cx + side * 11, -1, cx + side * 4, 0); ctx.lineTo(cx - side * 5.4, 0); ctx.closePath(); ctx.fill(); outline();
      ctx.fillStyle = '#f2c94c'; rr(ctx, cx - 1.4, -4.6, 2.8, 2.2, 0.4); ctx.fill();
      return;
  }
  // sneakers and gold shoes
  const col = id === 'gold' ? '#e2b43a' : c;
  ctx.fillStyle = col; rr(ctx, cx - 5.6, -5.4, 11.2, 4.9, 2.3); ctx.fill();
  ctx.strokeStyle = shade(col, -0.45); ctx.lineWidth = 0.5; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ell(ctx, cx - 1.5, -4.2, 3, 1); ctx.fill();
  ctx.fillStyle = id === 'gold' ? '#fff3c4' : '#f6f6f2'; rr(ctx, cx - 6, -1.7, 12, 1.9, 0.9); ctx.fill();
  ctx.strokeStyle = shade(col, -0.25); ctx.lineWidth = 0.8; line(ctx, cx - 3.5, -4.2, cx + 2.5, -2.4);
  if (px > 1.5) {
    ctx.strokeStyle = 'rgba(255,255,255,0.65)'; ctx.lineWidth = 0.35;
    for (let i = 0; i < 3; i++) line(ctx, cx - 1.6, -4.8 + i * 0.9, cx + 1.6, -4.8 + i * 0.9);
  }
  if (id === 'gold') { ctx.fillStyle = '#fffbe0'; sparkle(ctx, cx + side * 3, -5.5, 0.9); }
}

// =====================================================================
//  TOPS
// =====================================================================
const SLEEVES = {
  tshirt: 'short', hawaiian: 'short', jersey: 'short', gamer: 'short', dress: 'none',
};

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

function drawTorso(ctx, L, px, t) {
  const T = L.top, id = T.id, c = T.c;
  const w = id === 'puffer' || id === 'spacesuit' ? 14.8 : 14.2;
  if (id === 'robe') { drawRobe(ctx, c); return; }
  if (id === 'hoodie') { ctx.fillStyle = shade(c, -0.28); ell(ctx, 0, -80.6, 8.8, 3.8); ctx.fill(); }
  if (id === 'coat') { // long coat tails over the legs
    for (const s of [-1, 1]) {
      ctx.fillStyle = shade(c, -0.12);
      poly(ctx, [[s * 3.5, -50], [s * 14.4, -50], [s * 17, -24], [s * 6, -22]]); ctx.fill();
      ctx.strokeStyle = shade(c, -0.45); ctx.lineWidth = 0.5; ctx.stroke();
      ctx.strokeStyle = '#e2b43a'; ctx.lineWidth = 0.8; line(ctx, s * 17, -24, s * 6, -22);
    }
  }
  let base = c;
  if (id === 'vest') base = '#efe6d6';
  if (id === 'armor') base = SILVER;
  torsoPath(ctx, w);
  const g = ctx.createLinearGradient(-w, -80, w, -46);
  g.addColorStop(0, shade(base, 0.14)); g.addColorStop(0.5, base); g.addColorStop(1, shade(base, -0.25));
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = shade(base, -0.45); ctx.lineWidth = 0.55; ctx.stroke();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ell(ctx, -w + 1, -64, 2.4, 12); ctx.fill(); ell(ctx, w - 1, -64, 2.4, 12); ctx.fill();
  const hem = () => {
    ctx.fillStyle = shade(c, -0.2); ctx.fillRect(-w - 1, -49.3, w * 2 + 2, 3.4);
    if (px > 1.5) { ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.3; for (let xx = -w; xx < w; xx += 1) line(ctx, xx, -49.2, xx, -46); }
  };
  const neck = (col) => { // round t-shirt neck
    ctx.fillStyle = L.skinDark; ell(ctx, 0, -81.6, 5.2, 2.6); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0, -81.6, 5.2, 2.6, 0, 0, Math.PI); ctx.stroke();
  };
  switch (id) {
    case 'tshirt':
      neck(shade(c, -0.25));
      break;
    case 'gamer': {
      neck(shade(c, -0.25));
      const heart = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
      ctx.fillStyle = '#5ef06a';
      heart.forEach((row, r) => [...row].forEach((v, k) => { if (v === '1') ctx.fillRect(-5.6 + k * 1.6, -73 + r * 1.6, 1.6, 1.6); }));
      ctx.fillStyle = '#fff'; ctx.font = '900 4px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('GG', 0, -59);
      break;
    }
    case 'hoodie':
      hem();
      ctx.strokeStyle = shade(c, -0.35); ctx.lineWidth = 0.75;
      ctx.beginPath(); ctx.moveTo(0, -80.5); ctx.quadraticCurveTo(0.6, -63, 0, -46); ctx.stroke();
      ctx.fillStyle = shade(c, -0.12); rr(ctx, -8, -60, 16, 9, 2); ctx.fill();
      ctx.strokeStyle = shade(c, -0.38); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-5.6, -81.6); ctx.quadraticCurveTo(0, -77.8, 5.6, -81.6); ctx.stroke();
      ctx.strokeStyle = '#f4f4f0'; ctx.lineWidth = 0.6; line(ctx, -2.2, -79.6, -2.6, -72); line(ctx, 2.2, -79.6, 2.6, -72);
      break;
    case 'puffer':
      hem();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 0.6;
      for (let yy = -77; yy < -48; yy += 3.2) {
        ctx.beginPath();
        for (let xx = -w; xx <= w; xx += 1) ctx.lineTo(xx, yy + Math.sin(xx * 0.8) * 0.7);
        ctx.stroke();
      }
      ctx.strokeStyle = shade(c, -0.5); ctx.lineWidth = 0.6; line(ctx, 0, -81, 0, -46);
      break;
    case 'suit':
      ctx.fillStyle = '#f7f7f2'; poly(ctx, [[-5.2, -81.8], [0, -60], [5.2, -81.8]]); ctx.fill();
      ctx.fillStyle = shade(c, -0.25);
      poly(ctx, [[-5.4, -81.6], [-0.6, -61], [-7, -70]]); ctx.fill();
      poly(ctx, [[5.4, -81.6], [0.6, -61], [7, -70]]); ctx.fill();
      ctx.fillStyle = c === COLORS.black ? '#c22a3a' : '#141418';
      poly(ctx, [[0, -79], [-3.4, -80.8], [-3.4, -77.2]]); ctx.fill();
      poly(ctx, [[0, -79], [3.4, -80.8], [3.4, -77.2]]); ctx.fill();
      circ(ctx, 0, -79, 0.8); ctx.fill();
      ctx.fillStyle = '#111'; circ(ctx, 0, -56, 0.7); ctx.fill(); circ(ctx, 0, -51.5, 0.7); ctx.fill();
      ctx.fillStyle = '#f7f7f2'; poly(ctx, [[-10.5, -72], [-7.5, -72], [-8.3, -70]]); ctx.fill();
      break;
    case 'hawaiian': {
      const r = seeded(11);
      for (let i = 0; i < 16; i++) {
        const fx = -w + r() * w * 2, fy = -80 + r() * 33;
        ctx.fillStyle = i % 3 ? '#fff7e8' : '#ffd84a';
        for (let k = 0; k < 5; k++) { const a = k * Math.PI * 0.4; circ(ctx, fx + Math.cos(a) * 1.1, fy + Math.sin(a) * 1.1, 0.9); ctx.fill(); }
        ctx.fillStyle = '#f08a24'; circ(ctx, fx, fy, 0.55); ctx.fill();
      }
      ctx.fillStyle = shade(c, 0.25);
      poly(ctx, [[-5.4, -81.8], [-0.4, -76], [-6.5, -75.5]]); ctx.fill();
      poly(ctx, [[5.4, -81.8], [0.4, -76], [6.5, -75.5]]); ctx.fill();
      ctx.strokeStyle = shade(c, -0.35); ctx.lineWidth = 0.5; line(ctx, 0, -76, 0, -46);
      break;
    }
    case 'coat':
      ctx.fillStyle = '#f7f4ea';
      ctx.beginPath(); ctx.moveTo(-4, -81.6);
      for (let i = 0; i <= 6; i++) ctx.lineTo((i % 2 ? -4.6 : -2.6), -81.6 + i * 2.4);
      for (let i = 6; i >= 0; i--) ctx.lineTo((i % 2 ? 4.6 : 2.6), -81.6 + i * 2.4);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e2b43a';
      for (let yy = -74; yy <= -56; yy += 6) { circ(ctx, -6, yy, 0.9); ctx.fill(); circ(ctx, 6, yy, 0.9); ctx.fill(); }
      ctx.fillStyle = '#3a2416'; ctx.fillRect(-w - 1, -52, w * 2 + 2, 3);
      ctx.fillStyle = '#e2b43a'; rr(ctx, -2.2, -52.6, 4.4, 4.2, 0.8); ctx.fill();
      ctx.fillStyle = '#3a2416'; ctx.fillRect(-1, -51.4, 2, 1.8);
      break;
    case 'hero':
      ctx.fillStyle = '#ffd23f'; circ(ctx, 0, -68, 6); ctx.fill();
      ctx.strokeStyle = shade(c, -0.4); ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = c; poly(ctx, [[1.6, -73], [-2.6, -67.2], [0.2, -67.2], [-1.6, -62.6], [2.8, -68.8], [0.2, -68.8]]); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-w - 1, -50.5, w * 2 + 2, 3.2);
      ctx.fillStyle = '#e09a00'; rr(ctx, -2.2, -51, 4.4, 4.2, 0.8); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ell(ctx, -7, -74, 3, 1.6); ctx.fill();
      break;
    case 'armor':
      ctx.strokeStyle = '#7d858f'; ctx.lineWidth = 0.5;
      for (const yy of [-60, -55, -50]) line(ctx, -w, yy, w, yy);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ell(ctx, -8, -72, 2.4, 5); ctx.fill();
      ctx.fillStyle = c; poly(ctx, [[-6.5, -80], [6.5, -80], [6.5, -48], [0, -44], [-6.5, -48]]); ctx.fill();
      ctx.strokeStyle = shade(c, -0.4); ctx.lineWidth = 0.5; ctx.stroke();
      ctx.fillStyle = '#f2c94c'; ctx.fillRect(-1.2, -76, 2.4, 22); ctx.fillRect(-5, -69, 10, 2.4);
      break;
    case 'dress': {
      ctx.fillStyle = L.skin; ctx.fillRect(-w - 1, -83, w * 2 + 2, 7.4);
      ctx.fillStyle = L.skinDark; ell(ctx, 0, -81.6, 5.2, 1.5); ctx.fill();
      ctx.strokeStyle = shade(c, -0.25); ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(-w, -75.6); ctx.quadraticCurveTo(-5, -77.5, 0, -74.6); ctx.quadraticCurveTo(5, -77.5, w, -75.6); ctx.stroke();
      ctx.strokeStyle = c; ctx.lineWidth = 1.2; line(ctx, -9.5, -76.5, -10.5, -81.4); line(ctx, 9.5, -76.5, 10.5, -81.4);
      ctx.fillStyle = shade(c, 0.35); ctx.fillRect(-w - 1, -53, w * 2 + 2, 2.6);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const r = seeded(5);
      for (let i = 0; i < 10; i++) { sparkle(ctx, -w + r() * w * 2, -74 + r() * 20, 0.35); }
      break;
    }
    case 'spacesuit':
      ctx.fillStyle = '#5d6672'; rr(ctx, -6, -72, 12, 9, 1.4); ctx.fill();
      ctx.fillStyle = '#ff4a4a'; circ(ctx, -3, -69, 1.1); ctx.fill();
      ctx.fillStyle = '#5ef06a'; circ(ctx, 0, -69, 1.1); ctx.fill();
      ctx.fillStyle = '#4ab0ff'; circ(ctx, 3, -69, 1.1); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-4, -66, 8, 1.2);
      ctx.fillStyle = '#2f6fe0'; circ(ctx, 9, -75, 2.4); ctx.fill();
      ctx.fillStyle = '#fff'; circ(ctx, 9, -75, 0.6); ctx.fill();
      ctx.fillStyle = '#8a929c'; ctx.fillRect(-w - 1, -51, w * 2 + 2, 3);
      ctx.fillStyle = '#8a929c'; ell(ctx, 0, -81.6, 7.6, 2.8); ctx.fill();
      break;
    case 'vest':
      ctx.fillStyle = c;
      poly(ctx, [[-w - 1, -81], [-4.6, -81.6], [-1.6, -46], [-w - 1, -46]]); ctx.fill();
      poly(ctx, [[w + 1, -81], [4.6, -81.6], [1.6, -46], [w + 1, -46]]); ctx.fill();
      ctx.strokeStyle = shade(c, -0.4); ctx.lineWidth = 0.5; line(ctx, -4.6, -81.6, -1.6, -46); line(ctx, 4.6, -81.6, 1.6, -46);
      ctx.fillStyle = '#f7f4ea'; poly(ctx, [[-4.6, -81.8], [-0.4, -78], [-3, -76.4]]); ctx.fill(); poly(ctx, [[4.6, -81.8], [0.4, -78], [3, -76.4]]); ctx.fill();
      drawStar(ctx, -8.4, -70, 2.4, 0, '#f2c94c', '#b08a20');
      ctx.fillStyle = '#c2402e'; poly(ctx, [[-2.4, -79], [2.4, -79], [0, -75.5]]); ctx.fill();
      break;
    case 'chefcoat':
      ctx.fillStyle = '#111';
      for (let yy = -74; yy <= -52; yy += 5.5) { circ(ctx, -4.6, yy, 0.7); ctx.fill(); circ(ctx, 4.6, yy, 0.7); ctx.fill(); }
      ctx.strokeStyle = shade(c, -0.3); ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(-6, -81); ctx.quadraticCurveTo(6.5, -72, 7.2, -46); ctx.stroke();
      ctx.fillStyle = '#d63a3a'; poly(ctx, [[-4.4, -81.4], [4.4, -81.4], [0, -76]]); ctx.fill();
      ctx.fillStyle = shade(c, -0.08); ctx.fillRect(-6, -82.4, 12, 2);
      break;
    case 'jersey': {
      ctx.fillStyle = L.skinDark; poly(ctx, [[-4.4, -81.8], [0, -76.4], [4.4, -81.8]]); ctx.fill();
      ctx.strokeStyle = '#f4f4f0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4.4, -81.8); ctx.lineTo(0, -76.4); ctx.lineTo(4.4, -81.8); ctx.stroke();
      const nc = c === COLORS.white ? '#2f6fe0' : '#f4f4f0';
      ctx.fillStyle = nc; ctx.font = '900 13px "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('10', 0, -63);
      ctx.fillRect(-w, -78, 2, 32); ctx.fillRect(w - 2, -78, 2, 32);
      break;
    }
    case 'leather':
      ctx.fillStyle = '#f4f4f0'; ctx.fillRect(-4.4, -82, 8.8, 37);
      ctx.fillStyle = L.skinDark; ell(ctx, 0, -81.6, 4.2, 1.6); ctx.fill();
      ctx.fillStyle = shade(c, 0.12);
      poly(ctx, [[-4.4, -81.8], [-12, -80], [-9, -68], [-4.4, -72]]); ctx.fill();
      poly(ctx, [[4.4, -81.8], [12, -80], [9, -68], [4.4, -72]]); ctx.fill();
      ctx.fillStyle = '#d5d9de';
      for (const [sx, sy] of [[-9.6, -77.5], [-9, -73.5], [9.6, -77.5], [9, -73.5]]) { circ(ctx, sx, sy, 0.55); ctx.fill(); }
      ctx.strokeStyle = '#c8ccd2'; ctx.lineWidth = 0.5; line(ctx, -4.4, -72, -4.4, -46); line(ctx, 4.4, -72, 4.4, -46);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ell(ctx, -9, -60, 1.5, 6); ctx.fill();
      break;
    case 'skeleton':
      ctx.strokeStyle = '#f2efe6'; ctx.lineWidth = 1.3;
      for (let i = 0; i < 5; i++) {
        const yy = -76 + i * 4.6, ww = 9 - i * 0.6;
        ctx.beginPath(); ctx.moveTo(-1, yy); ctx.quadraticCurveTo(-ww, yy - 1, -ww + 1, yy + 2.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(1, yy); ctx.quadraticCurveTo(ww, yy - 1, ww - 1, yy + 2.6); ctx.stroke();
      }
      ctx.fillStyle = '#f2efe6';
      for (let yy = -80; yy < -47; yy += 2.4) { rr(ctx, -1, yy, 2, 1.7, 0.5); ctx.fill(); }
      break;
    case 'sweater':
      hem();
      ctx.fillStyle = shade(c, -0.15); rr(ctx, -6, -84, 12, 3.4, 1.4); ctx.fill();
      ctx.fillStyle = '#f7f4ee'; ctx.fillRect(-w - 1, -74, w * 2 + 2, 1.2); ctx.fillRect(-w - 1, -61.5, w * 2 + 2, 1.2);
      ctx.strokeStyle = '#f7f4ee'; ctx.lineWidth = 0.6;
      for (const fx of [-9, -3, 3, 9]) {
        for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3; line(ctx, fx - Math.cos(a) * 2.6, -67.6 - Math.sin(a) * 2.6, fx + Math.cos(a) * 2.6, -67.6 + Math.sin(a) * 2.6); }
      }
      break;
  }
  ctx.restore();
  if (id === 'dress') { // the skirt
    ctx.beginPath();
    ctx.moveTo(-13.4, -51); ctx.lineTo(13.4, -51);
    ctx.quadraticCurveTo(18, -38, 22, -20); ctx.quadraticCurveTo(0, -16, -22, -20);
    ctx.quadraticCurveTo(-18, -38, -13.4, -51); ctx.closePath();
    ctx.fillStyle = fillGrad(ctx, c, -22, 22); ctx.fill();
    ctx.strokeStyle = shade(c, -0.4); ctx.lineWidth = 0.5; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.16)';
    for (let i = -2; i <= 2; i++) line(ctx, i * 4, -49, i * 7.5, -19);
    ctx.fillStyle = shade(c, 0.35); ctx.fillRect(-13.6, -53, 27.2, 2.6);
    ctx.fillStyle = shade(c, 0.2); ell(ctx, -3, -51.8, 2.6, 1.6); ctx.fill(); ell(ctx, 3, -51.8, 2.6, 1.6); ctx.fill();
  }
}

function drawRobe(ctx, c) {
  ctx.beginPath();
  ctx.moveTo(-5.4, -81.6);
  ctx.quadraticCurveTo(-14, -81.6, -15, -74);
  ctx.lineTo(-20, -5); ctx.quadraticCurveTo(0, -2, 20, -5);
  ctx.lineTo(15, -74);
  ctx.quadraticCurveTo(14, -81.6, 5.4, -81.6);
  ctx.closePath();
  ctx.fillStyle = fillGrad(ctx, c, -20, 20); ctx.fill();
  ctx.strokeStyle = shade(c, -0.45); ctx.lineWidth = 0.55; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.16)'; ctx.lineWidth = 0.6;
  for (const xx of [-12, -8, 8, 12]) line(ctx, xx * 0.9, -60, xx * 1.3, -8);
  // white fur with black spots
  const fur = (pts) => { ctx.fillStyle = '#fbf8f0'; poly(ctx, pts); ctx.fill(); };
  fur([[-3, -82], [3, -82], [3, -5], [-3, -5]]);
  ctx.fillStyle = '#fbf8f0'; ell(ctx, 0, -80.5, 10, 3.6); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-20, -5); ctx.quadraticCurveTo(0, -2, 20, -5); ctx.lineTo(20, -8.5); ctx.quadraticCurveTo(0, -5.5, -20, -8.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  for (const [sx, sy] of [[-6, -80.5], [6, -80.5], [0, -70], [0.6, -60], [-0.6, -50], [0.4, -40], [-0.5, -30], [0.5, -20], [-12, -6.5], [-4, -5], [6, -5], [14, -6.5]]) {
    ctx.fillRect(sx - 0.4, sy - 0.8, 0.8, 1.6);
  }
  ctx.fillStyle = '#e2b43a'; circ(ctx, 0, -76, 1.3); ctx.fill();
}

function drawArm(ctx, L, side, hand, px) {
  const id = L.top.id;
  const sx = side * 12.5, sy = -77.6;
  const [ex, ey, hx, hy] = armIK(sx, sy, hand[0], hand[1], 14.6, 13.6, side);
  const sleeve = SLEEVES[id] || 'long';
  let col = L.top.c, cuff = shade(col, -0.2);
  if (id === 'vest') { col = '#efe6d6'; cuff = '#dcd2bf'; }
  if (id === 'armor') { col = SILVER; cuff = '#8a929c'; }
  if (id === 'suit') cuff = '#f7f7f2';
  if (id === 'coat') cuff = '#e2b43a';
  if (id === 'robe') cuff = '#fbf8f0';
  if (id === 'spacesuit') cuff = '#8a929c';
  const armPath = () => { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(hx, hy); };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (sleeve !== 'long') { // bare arm
    armPath();
    ctx.strokeStyle = shade(L.skinDark, -0.25); ctx.lineWidth = 5.6; ctx.stroke();
    ctx.strokeStyle = L.skin; ctx.lineWidth = 4.7; ctx.stroke();
    if (sleeve === 'short') {
      const mx = sx + (ex - sx) * 0.55, my = sy + (ey - sy) * 0.55;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(mx, my);
      ctx.strokeStyle = shade(col, -0.45); ctx.lineWidth = 7.6; ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 6.6; ctx.stroke();
      if (id === 'jersey') { ctx.strokeStyle = '#f4f4f0'; ctx.lineWidth = 6.8; line(ctx, mx - (ex - sx) * 0.08, my - (ey - sy) * 0.08, mx - (ex - sx) * 0.02, my - (ey - sy) * 0.02); }
    }
  } else {
    armPath();
    const wide = id === 'puffer' || id === 'spacesuit' || id === 'robe';
    ctx.strokeStyle = shade(col, -0.45); ctx.lineWidth = wide ? 8.2 : 7.4; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = wide ? 7.2 : 6.4; ctx.stroke();
    ctx.strokeStyle = shade(col, 0.1); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx - side * 1.2, sy + 1); ctx.lineTo(ex - side * 1.4, ey); ctx.stroke();
    const dx = hx - ex, dy = hy - ey, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
    ctx.strokeStyle = cuff; ctx.lineWidth = wide ? 6.8 : 5.8;
    line(ctx, hx - ux * 2.6, hy - uy * 2.6, hx - ux * 0.6, hy - uy * 0.6);
    if (id === 'skeleton' && px > 1) { ctx.strokeStyle = '#f2efe6'; ctx.lineWidth = 0.9; line(ctx, sx, sy + 1, ex, ey); line(ctx, ex, ey, hx - ux * 3, hy - uy * 3); }
  }
  const dx = hx - ex, dy = hy - ey, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const cx = hx + ux * 1.7, cy = hy + uy * 1.7;
  if (id === 'armor') {
    ctx.fillStyle = '#9aa2ac'; ell(ctx, cx, cy, 2.7, 3.1, Math.atan2(uy, ux) - Math.PI / 2); ctx.fill();
  } else {
    ctx.fillStyle = L.skin; ell(ctx, cx, cy, 2.5, 3, Math.atan2(uy, ux) - Math.PI / 2); ctx.fill();
    ctx.strokeStyle = L.skinDark; ctx.lineWidth = 0.4; ctx.stroke();
  }
  return [cx, cy];
}

// =====================================================================
//  HEAD, FACE AND HAIR
// =====================================================================
function facePath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-6.5, -94);
  ctx.bezierCurveTo(-6.7, -89, -5.1, -86, 0, -84.4);
  ctx.bezierCurveTo(5.1, -86, 6.7, -89, 6.5, -94);
  ctx.bezierCurveTo(6.5, -101, -6.5, -101, -6.5, -94);
  ctx.closePath();
}

const EARS_SHOW = ['short', 'curly', 'spiky', 'bun', 'ponytail', 'bald'];
function drawHead(ctx, L, t, st, px) {
  const ng = ctx.createLinearGradient(0, -87, 0, -80);
  ng.addColorStop(0, shade(L.skinDark, -0.15)); ng.addColorStop(1, L.skinDark);
  ctx.fillStyle = ng; rr(ctx, -2.8, -87.5, 5.6, 7.4, 1.6); ctx.fill();
  if (EARS_SHOW.includes(L.hair)) {
    ctx.fillStyle = L.skin;
    for (const s of [-1, 1]) { ell(ctx, s * 6.6, -91.8, 1.35, 2.2); ctx.fill(); ctx.strokeStyle = L.skinDark; ctx.lineWidth = 0.4; ctx.stroke(); }
  }
  facePath(ctx);
  const g = ctx.createRadialGradient(-1.6, -93.5, 1, 0, -92, 9.5);
  g.addColorStop(0, shade(L.skin, 0.1)); g.addColorStop(0.65, L.skin); g.addColorStop(1, L.skinDark);
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = shade(L.skinDark, -0.2); ctx.lineWidth = 0.4; ctx.stroke();

  const mood = st.mood || '';
  const face = { happy: 'grin', wow: 'wow', meh: 'flat', angry: 'angry', scared: 'scared' }[mood] || L.face;
  const look = st.look || 0;
  const blink = ((t * 0.8 + (st.phase || 0) * 5) % 4.6) < 0.13;
  const dark = '#20140e';
  const eyeY = -92.2;
  const squint = face === 'grin' ? 0.7 : face === 'wow' || face === 'scared' ? 1.25 : 1;
  for (const s of [-1, 1]) {
    const ex = s * 2.55;
    if (blink && face !== 'wow') {
      ctx.strokeStyle = dark; ctx.lineWidth = 0.45;
      ctx.beginPath(); ctx.arc(ex, eyeY - 0.4, 1.2, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#fbf7f2'; ell(ctx, ex, eyeY, 1.45, 0.85 * squint); ctx.fill();
    ctx.save(); ell(ctx, ex, eyeY, 1.45, 0.85 * squint); ctx.clip();
    ctx.fillStyle = L.eyes; circ(ctx, ex + look * 0.55, eyeY + 0.05, 0.78); ctx.fill();
    ctx.fillStyle = '#0a0705'; circ(ctx, ex + look * 0.55, eyeY + 0.05, 0.38); ctx.fill();
    ctx.fillStyle = '#fff'; circ(ctx, ex + look * 0.55 + 0.25, eyeY - 0.25, 0.17); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = dark; ctx.lineWidth = 0.42;
    ctx.beginPath(); ctx.ellipse(ex, eyeY + 0.1, 1.5, 0.95 * squint, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  // eyebrows
  ctx.strokeStyle = shade(L.hairColor, -0.35); ctx.lineWidth = 0.62;
  if (face === 'angry') {
    line(ctx, -4.1, -95.3, -1.1, -93.9); line(ctx, 4.1, -95.3, 1.1, -93.9);
  } else {
    const up = face === 'wow' || face === 'scared' ? -1.2 : face === 'grin' ? -0.5 : 0;
    ctx.beginPath(); ctx.moveTo(-4.1, -94.1 + up); ctx.quadraticCurveTo(-2.6, -95.1 + up, -1.1, -94.5 + up); ctx.stroke();
    const rb = face === 'smirk' ? -0.7 : face === 'flat' ? 0.4 : up;
    ctx.beginPath(); ctx.moveTo(4.1, -94.1 + rb); ctx.quadraticCurveTo(2.6, -95.1 + rb, 1.1, -94.5 + rb); ctx.stroke();
  }
  // nose and cheeks
  ctx.strokeStyle = shade(L.skinDark, -0.1); ctx.lineWidth = 0.42;
  ctx.beginPath(); ctx.moveTo(0.2, -91.6); ctx.quadraticCurveTo(0.9, -89.6, 0.6, -89.1); ctx.quadraticCurveTo(0, -88.6, -0.7, -89); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ell(ctx, -0.1, -90.3, 0.35, 1); ctx.fill();
  ctx.fillStyle = face === 'angry' ? 'rgba(230,60,60,0.3)' : 'rgba(230,110,100,0.16)';
  ell(ctx, -3.7, -89.4, 1.6, 1); ctx.fill(); ell(ctx, 3.7, -89.4, 1.6, 1); ctx.fill();
  // mouth
  ctx.strokeStyle = L.lip; ctx.lineWidth = 0.5;
  switch (face) {
    case 'calm':
      ctx.beginPath(); ctx.moveTo(-1.8, -87.3); ctx.quadraticCurveTo(0, -86.5, 1.8, -87.3); ctx.stroke();
      break;
    case 'smirk':
      ctx.beginPath(); ctx.moveTo(-1.5, -87.1); ctx.quadraticCurveTo(0.4, -86.6, 2, -87.8); ctx.stroke();
      break;
    case 'flat':
      line(ctx, -1.7, -87.1, 1.7, -87.2);
      break;
    case 'angry':
      ctx.beginPath(); ctx.moveTo(-2, -86.4); ctx.quadraticCurveTo(0, -88, 2, -86.4); ctx.stroke();
      break;
    case 'grin':
      ctx.fillStyle = '#5a2020';
      ctx.beginPath(); ctx.moveTo(-2.6, -87.8); ctx.quadraticCurveTo(0, -84.7, 2.6, -87.8); ctx.quadraticCurveTo(0, -87.2, -2.6, -87.8); ctx.fill();
      ctx.fillStyle = '#fbfaf5';
      ctx.beginPath(); ctx.moveTo(-2.3, -87.7); ctx.quadraticCurveTo(0, -87.1, 2.3, -87.7); ctx.quadraticCurveTo(0, -86.4, -2.3, -87.7); ctx.fill();
      break;
    case 'wow':
      ctx.fillStyle = '#6a1f2b'; ell(ctx, 0, -86.6, 2.2, 2); ctx.fill();
      ctx.fillStyle = '#e8737f'; ell(ctx, 0, -85.4, 1.3, 0.7); ctx.fill();
      break;
    case 'scared':
      ctx.fillStyle = '#6a1f2b'; ell(ctx, 0, -86.9, 1.8, 1.6); ctx.fill();
      break;
    default: // open
      ctx.fillStyle = '#6a1f2b'; ell(ctx, 0, -86.9, 1.3, 0.9); ctx.fill();
  }
}

function hairGrad(ctx, L, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, shade(L.hairColor, -0.3)); g.addColorStop(0.5, L.hairColor); g.addColorStop(1, shade(L.hairColor, 0.25));
  return g;
}

function drawHairBack(ctx, L) {
  const h = L.hair;
  if (!['wavy', 'bangs', 'long', 'ponytail'].includes(h)) return;
  ctx.fillStyle = hairGrad(ctx, L, -101, -74);
  ctx.beginPath();
  if (h === 'wavy') {
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
  } else if (h === 'long') {
    ctx.moveTo(-6, -99.8);
    ctx.bezierCurveTo(-10, -99, -10.2, -86, -11, -74);
    ctx.quadraticCurveTo(0, -72, 11, -74);
    ctx.bezierCurveTo(10.2, -86, 10, -99, 6, -99.8);
  } else if (h === 'ponytail') {
    ctx.moveTo(5, -99);
    ctx.bezierCurveTo(13, -99, 12, -88, 11, -80);
    ctx.quadraticCurveTo(9, -78, 8, -82);
    ctx.bezierCurveTo(9, -88, 8, -94, 3, -97);
  } else {
    ctx.moveTo(-6, -99.5);
    ctx.bezierCurveTo(-9.6, -98.5, -9.4, -88, -9.2, -80.5);
    ctx.lineTo(9.2, -80.5);
    ctx.bezierCurveTo(9.4, -88, 9.6, -98.5, 6, -99.5);
  }
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 0.4;
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * 8.2, -94); ctx.quadraticCurveTo(s * 9.6, -88, s * 8.6, -82); ctx.stroke(); }
}

function drawHairFront(ctx, L, px) {
  const h = L.hair;
  ctx.fillStyle = h === 'curly' ? L.hairColor : hairGrad(ctx, L, -102, -86);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.35;
  const light = shade(L.hairColor, 0.3);
  if (h === 'curly') {
    ctx.beginPath();
    ctx.moveTo(-6.8, -92.4);
    ctx.bezierCurveTo(-7.4, -98.6, -4.5, -101.6, 0, -101.4);
    ctx.bezierCurveTo(4.5, -101.6, 7.4, -98.6, 6.8, -92.4);
    ctx.lineTo(6.2, -93.7);
    ctx.quadraticCurveTo(5, -96.7, 2, -96.9);
    ctx.quadraticCurveTo(0, -96.3, -2, -96.9);
    ctx.quadraticCurveTo(-5, -96.7, -6.2, -93.7);
    ctx.closePath(); ctx.fill();
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI * (1.02 + i * 0.0686);
      circ(ctx, Math.cos(a) * 6.8, -95.6 + Math.sin(a) * 5.9, 1.3); ctx.fill();
    }
    ctx.fillStyle = light;
    const r = seeded(3);
    for (let i = 0; i < 36; i++) {
      const a = Math.PI * (1.05 + r() * 0.9), rad = r() * 5.4;
      circ(ctx, Math.cos(a) * rad * 1.15, -96.5 + Math.sin(a) * rad, 0.45); ctx.fill();
    }
  } else if (h === 'wavy') {
    ctx.beginPath();
    ctx.moveTo(-7.3, -87.6);
    ctx.bezierCurveTo(-7.9, -95, -6, -101.4, -0.6, -101.5);
    ctx.bezierCurveTo(5.6, -101.5, 7.9, -96, 7.4, -87.8);
    ctx.bezierCurveTo(6.4, -90.8, 6.3, -94.4, 3.9, -96.5);
    ctx.quadraticCurveTo(1.4, -97.7, -0.9, -97.9);
    ctx.quadraticCurveTo(-4.6, -96.9, -5.7, -94.4);
    ctx.bezierCurveTo(-6.4, -92.4, -6.2, -89.8, -7.3, -87.6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,0.4)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-3, -100.5); ctx.quadraticCurveTo(-5.5, -98, -6, -94); ctx.stroke();
  } else if (h === 'short' || h === 'spiky') {
    ctx.beginPath();
    ctx.moveTo(-6.9, -92.6);
    ctx.bezierCurveTo(-7.5, -99.6, -3.6, -102.4, 0.4, -102.2);
    ctx.bezierCurveTo(5, -102, 7.7, -99, 6.9, -92.6);
    ctx.lineTo(6.3, -94.7);
    const fringe = [[4.7, -96.4], [3.8, -95.3], [2.5, -96.8], [1.3, -95.4], [-0.1, -96.7], [-1.6, -95.2], [-3, -96.5], [-4.4, -95.5], [-5.6, -96.1]];
    for (const [fx, fy] of fringe) ctx.lineTo(fx, fy);
    ctx.lineTo(-6.3, -94.7);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (h === 'spiky') {
      ctx.fillStyle = L.hairColor;
      for (let i = -2; i <= 2; i++) {
        poly(ctx, [[i * 2.6 - 2, -101], [i * 3.4, -108 + Math.abs(i) * 1.2], [i * 2.6 + 2, -101]]); ctx.fill(); ctx.stroke();
      }
    } else {
      ctx.fillStyle = L.hairColor;
      poly(ctx, [[-2.5, -101.9], [-1.6, -103.3], [-0.6, -102]]); ctx.fill();
      poly(ctx, [[1, -102.1], [2.3, -103.2], [2.8, -101.6]]); ctx.fill();
    }
  } else if (h === 'bangs') {
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
  } else if (h === 'long') {
    ctx.beginPath();
    ctx.moveTo(-7.4, -84);
    ctx.bezierCurveTo(-8, -96, -5.6, -101.6, 0, -101.6);
    ctx.bezierCurveTo(5.6, -101.6, 8, -96, 7.4, -84);
    ctx.lineTo(6, -86);
    ctx.bezierCurveTo(6, -93, 4, -96.8, 0.4, -97.6);
    ctx.lineTo(-0.4, -97.6);
    ctx.bezierCurveTo(-4, -96.8, -6, -93, -6, -86);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-3, -100.8); ctx.quadraticCurveTo(-6.5, -97, -6.8, -88); ctx.stroke();
  } else if (h === 'bun' || h === 'ponytail') {
    ctx.beginPath();
    ctx.moveTo(-6.8, -92);
    ctx.bezierCurveTo(-7.4, -99, -4.4, -101.8, 0, -101.8);
    ctx.bezierCurveTo(4.4, -101.8, 7.4, -99, 6.8, -92);
    ctx.quadraticCurveTo(5.6, -97, 0, -97.6);
    ctx.quadraticCurveTo(-5.6, -97, -6.8, -92);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.35;
    for (const xx of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(xx * 1.4, -97.4); ctx.quadraticCurveTo(xx, -100.5, xx * 0.3, -101.6); ctx.stroke(); }
    if (h === 'bun') {
      ctx.fillStyle = hairGrad(ctx, L, -108, -101);
      circ(ctx, 0, -104, 3.6); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke();
      ctx.fillStyle = shade(L.hairColor, -0.35); ctx.fillRect(-2.6, -101.5, 5.2, 1.1);
    } else {
      ctx.fillStyle = '#f27cc0'; circ(ctx, 6.4, -97.8, 1.1); ctx.fill();
    }
  } else if (h === 'bald') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, -2, -99, 2.4, 1); ctx.fill();
  }
}

// =====================================================================
//  FACE THINGS (glasses, mustaches...)
// =====================================================================
function drawFaceItem(ctx, L, t) {
  const A = L.acc, c = A.c;
  switch (A.id) {
    case 'glasses':
      ctx.strokeStyle = c; ctx.lineWidth = 0.45; ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (const s of [-1, 1]) { circ(ctx, s * 2.6, -92.2, 2.05); ctx.fill(); ctx.stroke(); }
      line(ctx, -0.6, -92.6, 0.6, -92.6);
      break;
    case 'sunglasses':
      ctx.fillStyle = '#15151c';
      for (const s of [-1, 1]) { rr(ctx, s * 2.7 - 2.3, -93.8, 4.6, 3, 1.2); ctx.fill(); }
      ctx.strokeStyle = c; ctx.lineWidth = 0.5;
      for (const s of [-1, 1]) { rr(ctx, s * 2.7 - 2.3, -93.8, 4.6, 3, 1.2); ctx.stroke(); }
      line(ctx, -0.5, -93.2, 0.5, -93.2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(-4.2, -93.3, 1.2, 0.5); ctx.fillRect(1.2, -93.3, 1.2, 0.5);
      break;
    case 'starshades':
      for (const s of [-1, 1]) drawStar(ctx, s * 2.8, -92.2, 2.8, 0, c, shade(c, -0.4));
      ctx.fillStyle = 'rgba(20,20,30,0.7)'; circ(ctx, -2.8, -92, 1); ctx.fill(); circ(ctx, 2.8, -92, 1); ctx.fill();
      break;
    case 'eyepatch':
      ctx.strokeStyle = '#111'; ctx.lineWidth = 0.4; line(ctx, -6.6, -96, 6.6, -90.4);
      ctx.fillStyle = '#141414'; ell(ctx, 2.6, -92.2, 2.1, 1.8); ctx.fill();
      break;
    case 'mustache':
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(0, -88.6);
      ctx.bezierCurveTo(-1.5, -89.6, -3.5, -89.4, -4.2, -88.2);
      ctx.bezierCurveTo(-4.6, -87.2, -5.2, -88.4, -4.6, -89);
      ctx.bezierCurveTo(-3.6, -87.3, -1.6, -87.8, 0, -88);
      ctx.bezierCurveTo(1.6, -87.8, 3.6, -87.3, 4.6, -89);
      ctx.bezierCurveTo(5.2, -88.4, 4.6, -87.2, 4.2, -88.2);
      ctx.bezierCurveTo(3.5, -89.4, 1.5, -89.6, 0, -88.6);
      ctx.fill();
      break;
    case 'mask':
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(-6.6, -93.6); ctx.quadraticCurveTo(0, -95.5, 6.6, -93.6); ctx.lineTo(6.4, -90.6); ctx.quadraticCurveTo(0, -91.5, -6.4, -90.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fbf7f2';
      ell(ctx, -2.55, -92.3, 1.3, 0.75); ctx.fill(); ell(ctx, 2.55, -92.3, 1.3, 0.75); ctx.fill();
      ctx.fillStyle = '#111'; circ(ctx, -2.55, -92.3, 0.45); ctx.fill(); circ(ctx, 2.55, -92.3, 0.45); ctx.fill();
      break;
    case 'goggles': {
      ctx.fillStyle = '#222'; ctx.fillRect(-7, -94, 14, 2.8);
      ctx.fillStyle = '#e8e8e8'; rr(ctx, -5.6, -95.2, 11.2, 5, 2.2); ctx.fill();
      const g = ctx.createLinearGradient(-5, -95, 5, -90);
      g.addColorStop(0, shade(c, 0.4)); g.addColorStop(0.5, c); g.addColorStop(1, '#8a4fd8');
      ctx.fillStyle = g; rr(ctx, -5, -94.7, 10, 4, 1.8); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(-4, -94, 2.4, 0.6);
      break;
    }
    case 'fangs':
      ctx.fillStyle = '#6a1f2b'; ell(ctx, 0, -87.1, 2.2, 0.9); ctx.fill();
      ctx.fillStyle = '#fff';
      poly(ctx, [[-1.8, -87.6], [-0.9, -87.6], [-1.35, -85.6]]); ctx.fill();
      poly(ctx, [[1.8, -87.6], [0.9, -87.6], [1.35, -85.6]]); ctx.fill();
      ctx.fillStyle = '#d0142c'; circ(ctx, 1.35, -85.1, 0.35); ctx.fill();
      break;
    case 'clown': {
      const g = ctx.createRadialGradient(-0.5, -90.4, 0.2, 0, -89.8, 1.9);
      g.addColorStop(0, '#ff8a8a'); g.addColorStop(1, '#d0142c');
      ctx.fillStyle = g; circ(ctx, 0.1, -89.8, 1.8); ctx.fill();
      break;
    }
    case 'monocle':
      ctx.strokeStyle = '#e2b43a'; ctx.lineWidth = 0.55; ctx.fillStyle = 'rgba(255,255,255,0.2)';
      circ(ctx, 2.6, -92.2, 2.2); ctx.fill(); ctx.stroke();
      ctx.lineWidth = 0.25;
      ctx.beginPath(); ctx.moveTo(4.6, -91.4); ctx.quadraticCurveTo(6, -86, 5, -82); ctx.stroke();
      break;
    case 'facepaint':
      ctx.fillStyle = c;
      for (const s of [-1, 1]) { ctx.fillRect(s * 3.7 - 1.6, -90.6, 3.2, 0.7); ctx.fillRect(s * 3.7 - 1.6, -89.4, 3.2, 0.7); }
      break;
    case 'beard':
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(-6.5, -92); ctx.bezierCurveTo(-6.6, -86, -4, -82.5, 0, -82);
      ctx.bezierCurveTo(4, -82.5, 6.6, -86, 6.5, -92);
      ctx.lineTo(5.6, -91); ctx.bezierCurveTo(5, -89, 3.4, -88.2, 0, -88.4);
      ctx.bezierCurveTo(-3.4, -88.2, -5, -89, -5.6, -91);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#6a1f2b'; ell(ctx, 0, -86.9, 1.3, 0.6); ctx.fill();
      break;
  }
}

// =====================================================================
//  HATS
// =====================================================================
function drawHat(ctx, L, t) {
  const H = L.hat, c = H.c;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.4;
  switch (H.id) {
    case 'cap':
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(-7.4, -95); ctx.bezierCurveTo(-7.6, -103, 7.6, -103, 7.4, -95); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = shade(c, -0.25); ell(ctx, 0, -95.2, 8.6, 1.9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; circ(ctx, 0, -99, 1.5); ctx.fill();
      ctx.fillStyle = c; ctx.font = '900 2.2px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('B', 0, -98.9);
      break;
    case 'beanie':
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(-7.2, -95); ctx.bezierCurveTo(-7.6, -105, 7.6, -105, 7.2, -95); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = shade(c, -0.2); rr(ctx, -7.6, -97.4, 15.2, 3.4, 1.2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; for (let xx = -7; xx < 7.5; xx += 1.2) line(ctx, xx, -97.2, xx, -94.2);
      ctx.fillStyle = '#f7f4ee'; circ(ctx, 0, -104, 2); ctx.fill();
      break;
    case 'tophat':
      ctx.fillStyle = c; ell(ctx, 0, -99.6, 10, 1.9); ctx.fill(); ctx.stroke();
      rr(ctx, -6.2, -116, 12.4, 16.6, 1); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c === COLORS.red ? '#24242a' : '#c22a3a'; ctx.fillRect(-6.2, -103.6, 12.4, 2.4);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(-4.6, -115, 1.4, 11);
      break;
    case 'crown':
      ctx.fillStyle = '#f2c94c';
      poly(ctx, [[-6.8, -99], [-7.4, -108], [-4, -104], [-2, -110], [0, -104.5], [2, -110], [4, -104], [7.4, -108], [6.8, -99]]); ctx.fill();
      ctx.strokeStyle = '#a07810'; ctx.stroke();
      ctx.fillStyle = '#d0142c'; circ(ctx, 0, -101.6, 1.1); ctx.fill();
      ctx.fillStyle = '#2f6fe0'; circ(ctx, -4, -101.4, 0.8); ctx.fill(); circ(ctx, 4, -101.4, 0.8); ctx.fill();
      ctx.fillStyle = '#fff'; for (const xx of [-7.4, -2, 2, 7.4]) { circ(ctx, xx, xx === -2 || xx === 2 ? -110 : -108, 0.7); ctx.fill(); }
      break;
    case 'pirate':
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(-12.5, -99); ctx.quadraticCurveTo(-9, -112, 0, -110.5); ctx.quadraticCurveTo(9, -112, 12.5, -99);
      ctx.quadraticCurveTo(0, -103, -12.5, -99); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#e2b43a'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(-12.5, -99); ctx.quadraticCurveTo(0, -103, 12.5, -99); ctx.stroke();
      ctx.fillStyle = '#f7f4ee'; circ(ctx, 0, -105.6, 1.8); ctx.fill(); ctx.fillRect(-1.1, -104.4, 2.2, 1.2);
      ctx.fillStyle = '#111'; circ(ctx, -0.7, -105.8, 0.45); ctx.fill(); circ(ctx, 0.7, -105.8, 0.45); ctx.fill();
      ctx.strokeStyle = '#f7f4ee'; ctx.lineWidth = 0.6; line(ctx, -3, -103.2, 3, -101.6); line(ctx, 3, -103.2, -3, -101.6);
      break;
    case 'cowboy':
      ctx.fillStyle = c;
      rr(ctx, -6.2, -108, 12.4, 9, 2.6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = shade(c, -0.15);
      ctx.beginPath(); ctx.moveTo(-14, -102); ctx.quadraticCurveTo(-10, -97, 0, -98.4); ctx.quadraticCurveTo(10, -97, 14, -102);
      ctx.quadraticCurveTo(10, -99.4, 0, -100.4); ctx.quadraticCurveTo(-10, -99.4, -14, -102); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2a1a10'; ctx.fillRect(-6.2, -102.6, 12.4, 1.6);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; line(ctx, 0, -107.6, 0, -104.6);
      break;
    case 'party':
      ctx.fillStyle = c; poly(ctx, [[-5.6, -99.5], [0, -117], [5.6, -99.5]]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffd23f';
      for (const [dx, dy] of [[-2, -102], [1.8, -104.5], [-0.6, -108], [0.6, -112]]) { circ(ctx, dx, dy, 0.8); ctx.fill(); }
      ctx.fillStyle = '#3fc8d6'; circ(ctx, 0, -117.4, 1.8); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.25; line(ctx, -5.6, -99.5, -6.6, -91); line(ctx, 5.6, -99.5, 6.6, -91);
      break;
    case 'chef':
      ctx.fillStyle = c;
      rr(ctx, -6.4, -104.5, 12.8, 5.5, 0.8); ctx.fill(); ctx.stroke();
      for (const [dx, dy, r] of [[-4.6, -108.6, 4.2], [4.6, -108.6, 4.2], [0, -112, 5.2], [-2.4, -110, 4], [2.4, -110, 4]]) { circ(ctx, dx, dy, r); ctx.fill(); }
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; line(ctx, -2.4, -104.4, -2.6, -100); line(ctx, 2.4, -104.4, 2.6, -100);
      break;
    case 'space': {
      ctx.fillStyle = 'rgba(190,230,255,0.22)'; circ(ctx, 0, -93, 11.6); ctx.fill();
      ctx.strokeStyle = 'rgba(220,240,255,0.9)'; ctx.lineWidth = 0.7; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, -93, 9.6, Math.PI * 1.1, Math.PI * 1.4); ctx.stroke();
      ctx.fillStyle = '#d5d9de'; rr(ctx, -8.5, -84.4, 17, 3.4, 1.4); ctx.fill();
      ctx.strokeStyle = '#7d858f'; ctx.lineWidth = 0.4; ctx.stroke();
      break;
    }
    case 'witch':
      ctx.fillStyle = shade(c, -0.15); ell(ctx, 0, -99.4, 13, 2.4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(-6.4, -99.6); ctx.quadraticCurveTo(-3, -112, 4, -121); ctx.quadraticCurveTo(2, -112, 6.4, -99.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#36b04f'; ctx.fillRect(-6, -102.6, 12, 2.2);
      ctx.fillStyle = '#f2c94c'; rr(ctx, -1.4, -103, 2.8, 3, 0.4); ctx.fill();
      break;
    case 'knight':
      ctx.fillStyle = c; // the plume
      ctx.beginPath(); ctx.moveTo(-1, -103); ctx.bezierCurveTo(-3, -112, 6, -114, 9, -108); ctx.bezierCurveTo(5, -110, 2, -106, 1, -103); ctx.closePath(); ctx.fill();
      ctx.fillStyle = SILVER;
      ctx.beginPath(); ctx.moveTo(-7.6, -86); ctx.lineTo(-7.8, -97); ctx.bezierCurveTo(-7.4, -105, 7.4, -105, 7.8, -97); ctx.lineTo(7.6, -86);
      ctx.quadraticCurveTo(0, -83, -7.6, -86); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#6c737c'; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.fillStyle = '#1a1c20'; rr(ctx, -5.6, -93.2, 11.2, 1.8, 0.8); ctx.fill();
      for (let i = -2; i <= 2; i++) { ctx.fillRect(i * 1.5 - 0.35, -89.6, 0.7, 1.8); }
      ctx.strokeStyle = '#8a929c'; line(ctx, 0, -103, 0, -94);
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ell(ctx, -4.6, -98, 1, 3); ctx.fill();
      break;
    case 'headphones':
      ctx.strokeStyle = c; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, -94, 7.8, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.fillStyle = c;
      for (const s of [-1, 1]) { rr(ctx, s * 7.4 - 1.8, -95.4, 3.6, 6, 1.4); ctx.fill(); }
      ctx.fillStyle = '#3fc8d6'; for (const s of [-1, 1]) { circ(ctx, s * 8.9, -92.4, 0.8); ctx.fill(); }
      break;
    case 'straw':
      ctx.fillStyle = '#e9cf7a'; ell(ctx, 0, -98.6, 13.5, 2.8); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-6.6, -98.6); ctx.bezierCurveTo(-6.8, -107, 6.8, -107, 6.6, -98.6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c; ctx.fillRect(-6.7, -101.8, 13.4, 2.2);
      ctx.strokeStyle = 'rgba(150,110,40,0.4)'; ctx.lineWidth = 0.3;
      for (let i = -3; i <= 3; i++) line(ctx, i * 3.8, -99.5, i * 4.2, -97.6);
      break;
    case 'earmuffs':
      ctx.strokeStyle = '#d5d9de'; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.arc(0, -94, 7.6, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      ctx.fillStyle = c;
      for (const s of [-1, 1]) { circ(ctx, s * 7.4, -92, 2.8); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      for (const s of [-1, 1]) { circ(ctx, s * 7.4 - 0.8, -92.8, 0.9); ctx.fill(); }
      break;
    case 'bandana':
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.moveTo(-7.2, -95.4); ctx.bezierCurveTo(-7.6, -103.4, 7.6, -103.4, 7.2, -95.4); ctx.quadraticCurveTo(0, -97.4, -7.2, -95.4); ctx.fill(); ctx.stroke();
      poly(ctx, [[6.6, -96], [10.6, -93], [9.6, -91.2]]); ctx.fill();
      poly(ctx, [[6.8, -96.4], [11.2, -96.6], [10.8, -94.8]]); ctx.fill();
      ctx.fillStyle = '#fff';
      for (const [dx, dy] of [[-4, -98], [0, -100.6], [3.8, -98.6], [-1.6, -97], [2, -96.8]]) { circ(ctx, dx, dy, 0.45); ctx.fill(); }
      break;
    case 'halo': {
      const k = Math.sin(t * 3) * 0.6;
      ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 1.2;
      ctx.shadowColor = '#ffe680'; ctx.shadowBlur = 4;
      ell(ctx, 0, -108 + k, 7, 1.8); ctx.stroke();
      ctx.shadowBlur = 0;
      break;
    }
  }
}

// =====================================================================
//  EXTRAS (capes, wings, guitars, parrots...)
// =====================================================================
function drawBackExtra(ctx, L, t, st) {
  const E = L.extra, c = E.c;
  switch (E.id) {
    case 'cape': {
      const w1 = Math.sin(t * 3) * 1.5, w2 = Math.sin(t * 3 + 1.5) * 1.5;
      ctx.fillStyle = shade(c, -0.25);
      ctx.beginPath(); ctx.moveTo(-12, -81); ctx.lineTo(12, -81);
      ctx.quadraticCurveTo(19, -50, 21 + w1, -12);
      ctx.quadraticCurveTo(10, -9 + w2, 0, -12 + w1); ctx.quadraticCurveTo(-10, -9 + w2, -21 + w2, -12);
      ctx.quadraticCurveTo(-19, -50, -12, -81); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = shade(c, -0.5); ctx.lineWidth = 0.5; ctx.stroke();
      break;
    }
    case 'wings': drawAngelWing(ctx, -1, Math.sin(t * 4), 0.75); drawAngelWing(ctx, 1, Math.sin(t * 4), 0.75); break;
    case 'batwings': {
      const f = Math.sin(t * 5) * 0.15;
      for (const s of [-1, 1]) {
        ctx.save(); ctx.translate(s * 5, -74); ctx.scale(s, 1); ctx.rotate(-0.15 - f);
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, -14); ctx.lineTo(34, -10);
        ctx.quadraticCurveTo(30, -2, 32, 6); ctx.quadraticCurveTo(26, 2, 22, 8); ctx.quadraticCurveTo(17, 3, 12, 9); ctx.quadraticCurveTo(7, 4, 2, 8);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = shade(c, -0.45); ctx.lineWidth = 0.8;
        line(ctx, 0, 0, 16, -14); line(ctx, 16, -14, 34, -10); line(ctx, 16, -14, 22, 8); line(ctx, 16, -14, 12, 9);
        ctx.restore();
      }
      break;
    }
    case 'jetpack':
      for (const s of [-1, 1]) {
        ctx.fillStyle = c; rr(ctx, s > 0 ? 9 : -19, -82, 10, 28, 4); ctx.fill();
        ctx.strokeStyle = shade(c, -0.45); ctx.lineWidth = 0.5; ctx.stroke();
        ctx.fillStyle = '#d0142c'; ctx.fillRect(s > 0 ? 9 : -19, -78, 10, 2);
        ctx.fillStyle = '#5d6672'; rr(ctx, s * 14 - 3, -55, 6, 3, 1); ctx.fill();
        const fl = 8 + Math.sin(t * 30 + s) * 3;
        ctx.fillStyle = 'rgba(255,170,40,0.9)'; poly(ctx, [[s * 14 - 2.6, -52], [s * 14, -52 + fl], [s * 14 + 2.6, -52]]); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,150,0.95)'; poly(ctx, [[s * 14 - 1.2, -52], [s * 14, -52 + fl * 0.6], [s * 14 + 1.2, -52]]); ctx.fill();
      }
      break;
    case 'backpack':
      ctx.fillStyle = shade(c, -0.15); rr(ctx, -16, -79, 32, 28, 6); ctx.fill();
      break;
    case 'surfboard':
      ctx.save(); ctx.translate(-21, -52); ctx.rotate(-0.08);
      ctx.fillStyle = c; ell(ctx, 0, 0, 6.5, 52); ctx.fill();
      ctx.strokeStyle = shade(c, -0.45); ctx.lineWidth = 0.6; ctx.stroke();
      ctx.fillStyle = '#f7f4ee'; ctx.fillRect(-0.8, -50, 1.6, 100);
      ctx.fillStyle = '#ff6a3a'; ell(ctx, 0, -30, 3.4, 6); ctx.fill();
      ctx.restore();
      break;
  }
}

function drawAngelWing(ctx, side, flap, sc) {
  ctx.save();
  ctx.translate(side * 5, -74);
  ctx.scale(side * sc, sc);
  ctx.rotate(-0.45 - flap * 0.3);
  for (let i = 7; i >= 0; i--) {
    const k = i / 7, len = 20 + k * 26;
    ctx.save();
    ctx.translate(k * 52, -k * k * 22); ctx.rotate(1.05 - k * 0.75);
    const g = ctx.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#fff6dc'); g.addColorStop(1, '#f2cf6a');
    ctx.fillStyle = g; ell(ctx, 0, len * 0.5, 5, len * 0.55); ctx.fill();
    ctx.strokeStyle = '#d9b45a'; ctx.lineWidth = 0.6; ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(28, -2, 52, -22); ctx.stroke();
  ctx.strokeStyle = '#e8c766'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

function drawGuitar(ctx, c) {
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.4; line(ctx, -11, -80, 13, -50);
  ctx.save(); ctx.translate(4, -57); ctx.rotate(-0.6);
  ctx.fillStyle = '#6b4428'; ctx.fillRect(-1.3, -30, 2.6, 28);
  ctx.fillStyle = '#3a2416'; rr(ctx, -2, -35, 4, 6, 1); ctx.fill();
  ctx.fillStyle = c;
  circ(ctx, 0, 2, 7.6); ctx.fill(); circ(ctx, 0, -5, 5.6); ctx.fill();
  ctx.strokeStyle = shade(c, -0.45); ctx.lineWidth = 0.5; circ(ctx, 0, 2, 7.6); ctx.stroke();
  ctx.fillStyle = '#1a1a1a'; circ(ctx, 0, -2.6, 2); ctx.fill();
  ctx.fillStyle = '#f4f4f0'; ctx.fillRect(-2.6, 5, 5.2, 1.2);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.15;
  for (let i = -1; i <= 1; i++) line(ctx, i * 0.6, -33, i * 0.6, 5.5);
  ctx.restore();
}

function drawScarf(ctx, c, t) {
  ctx.fillStyle = c; rr(ctx, -7.4, -84, 14.8, 5, 2.4); ctx.fill();
  ctx.strokeStyle = shade(c, -0.4); ctx.lineWidth = 0.5; ctx.stroke();
  const sw = Math.sin(t * 2.5) * 1;
  ctx.fillStyle = c; poly(ctx, [[2, -80], [6.5, -80], [8 + sw, -62], [3.6 + sw, -62]]); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#f7f4ee';
  for (const yy of [-75, -69]) {
    const k = (yy + 80) / 18;
    poly(ctx, [[2 + k * 1.6 + sw * k, yy], [6.5 + k * 1.5 + sw * k, yy], [6.6 + k * 1.5 + sw * k, yy + 2], [2.1 + k * 1.6 + sw * k, yy + 2]]); ctx.fill();
  }
  ctx.fillRect(-6, -82.4, 1.6, 1.8); ctx.fillRect(-2, -82.4, 1.6, 1.8);
}

function drawChain(ctx) {
  ctx.strokeStyle = '#f2c94c'; ctx.lineWidth = 0.8; ctx.setLineDash([1, 0.6]);
  ctx.beginPath(); ctx.moveTo(-5.4, -81.4); ctx.quadraticCurveTo(-4, -68, 0, -67); ctx.quadraticCurveTo(4, -68, 5.4, -81.4); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f2c94c'; circ(ctx, 0, -65, 3); ctx.fill();
  ctx.strokeStyle = '#a07810'; ctx.lineWidth = 0.4; ctx.stroke();
  ctx.fillStyle = '#a07810'; ctx.font = '900 3.6px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('B', 0, -64.8);
}

// Held in the right hand, behind the fingers
function drawHeldProp(ctx, L, rh, t) {
  const E = L.extra, c = E.c;
  const [hx, hy] = rh;
  const stick = (a, len, back, w, col, edge) => {
    const tx = hx + Math.cos(a) * len, ty = hy + Math.sin(a) * len;
    ctx.strokeStyle = edge || shade(col, -0.45); ctx.lineWidth = w + 0.8;
    line(ctx, hx - Math.cos(a) * back, hy - Math.sin(a) * back, tx, ty);
    ctx.strokeStyle = col; ctx.lineWidth = w;
    line(ctx, hx - Math.cos(a) * back, hy - Math.sin(a) * back, tx, ty);
    return [tx, ty];
  };
  switch (E.id) {
    case 'sword': {
      const a = -1.2;
      stick(a, 3, 4, 1.8, c);
      const gx = hx + Math.cos(a) * 3, gy = hy + Math.sin(a) * 3;
      ctx.strokeStyle = '#e2b43a'; ctx.lineWidth = 1.4;
      line(ctx, gx - Math.sin(a) * 4, gy + Math.cos(a) * 4, gx + Math.sin(a) * 4, gy - Math.cos(a) * 4);
      ctx.save(); ctx.translate(gx, gy); ctx.rotate(a);
      ctx.fillStyle = '#e3e7ec'; poly(ctx, [[0, -1.3], [28, -1.3], [32, 0], [28, 1.3], [0, 1.3]]); ctx.fill();
      ctx.strokeStyle = '#7d858f'; ctx.lineWidth = 0.4; ctx.stroke(); line(ctx, 1, 0, 29, 0);
      ctx.restore();
      break;
    }
    case 'wand': {
      const [tx, ty] = stick(-1.0, 17, 3, 1.2, '#2a1e16', '#111');
      ctx.fillStyle = '#fff'; circ(ctx, tx, ty, 1); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const a = t * 2 + i * 1.6, r = 4 + Math.sin(t * 4 + i) * 1.5;
        ctx.fillStyle = `rgba(255,${200 + i * 10},120,${0.5 + 0.5 * Math.sin(t * 6 + i)})`;
        sparkle(ctx, tx + Math.cos(a) * r, ty + Math.sin(a) * r, 0.7);
      }
      break;
    }
    case 'spatula': {
      const a = -1.3;
      const [tx, ty] = stick(a, 12, 2, 1.8, c);
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#c8ccd2'; rr(ctx, -3, -9, 6, 9, 1); ctx.fill();
      ctx.strokeStyle = '#7d858f'; ctx.lineWidth = 0.4; ctx.stroke();
      for (const xx of [-1.2, 0, 1.2]) line(ctx, xx, -8, xx, -2);
      ctx.restore();
      break;
    }
    case 'scepter': {
      const [tx, ty] = stick(-1.45, 26, 5, 1.6, '#e2b43a', '#a07810');
      ctx.fillStyle = '#d0142c'; circ(ctx, tx, ty - 1.5, 2.6); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; circ(ctx, tx - 0.8, ty - 2.4, 0.8); ctx.fill();
      ctx.fillStyle = '#e2b43a'; poly(ctx, [[tx - 2.6, ty + 0.2], [tx + 2.6, ty + 0.2], [tx + 1.8, ty + 1.8], [tx - 1.8, ty + 1.8]]); ctx.fill();
      break;
    }
    case 'lasso':
      ctx.strokeStyle = c; ctx.lineWidth = 0.9;
      ell(ctx, hx + 2.5, hy + 7, 4.6, 7.2, 0.2); ctx.stroke();
      ell(ctx, hx + 2, hy + 6, 3.4, 6, 0.25); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + 10, hy + 18, hx + 4, hy + 26); ctx.stroke();
      ell(ctx, hx + 6, hy + 33, 6, 6.8); ctx.stroke();
      break;
    case 'balloons': {
      const cols = [c, '#ffd23f', '#3fc8d6'];
      cols.forEach((bc, i) => {
        const bx = hx + (i - 1) * 9 + Math.sin(t * 1.5 + i) * 1.5, by = hy - 62 - (i === 1 ? 8 : 0);
        ctx.strokeStyle = 'rgba(80,80,80,0.8)'; ctx.lineWidth = 0.3;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(bx, hy - 30, bx, by + 7); ctx.stroke();
        ctx.fillStyle = bc; ell(ctx, bx, by, 5.4, 6.6); ctx.fill();
        poly(ctx, [[bx - 1, by + 7.2], [bx + 1, by + 7.2], [bx, by + 6]]); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.45)'; ell(ctx, bx - 1.8, by - 2.4, 1.2, 2, -0.4); ctx.fill();
      });
      break;
    }
  }
}

// Held in front of the hands
function drawFrontProp(ctx, L, lh, rh, t) {
  const E = L.extra, c = E.c;
  switch (E.id) {
    case 'ball': {
      const x = rh[0] + 1, y = rh[1] + 4.5;
      ctx.fillStyle = '#fbfbf8'; circ(ctx, x, y, 4.6); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 0.4; ctx.stroke();
      ctx.fillStyle = '#222'; poly(ctx, [0, 1, 2, 3, 4].map(i => [x + Math.cos(i * 1.2566 - 1.57) * 1.6, y + Math.sin(i * 1.2566 - 1.57) * 1.6])); ctx.fill();
      for (let i = 0; i < 5; i++) { const a = i * 1.2566 - 1.57; circ(ctx, x + Math.cos(a) * 3.8, y + Math.sin(a) * 3.8, 0.9); ctx.fill(); }
      break;
    }
    case 'controller': {
      ctx.fillStyle = c; rr(ctx, -8, -63.4, 16, 6.4, 3); ctx.fill();
      ctx.strokeStyle = shade(c, 0.4); ctx.lineWidth = 0.4; ctx.stroke();
      ctx.fillStyle = '#ddd'; ctx.fillRect(-5.6, -60.8, 3, 0.9); ctx.fillRect(-4.55, -61.8, 0.9, 3);
      [['#e23b3b', 4.6, -61.6], ['#36b04f', 3.4, -60.2], ['#2f6fe0', 5.8, -60.2], ['#f7d038', 4.6, -59]].forEach(([bc, bx, by]) => { ctx.fillStyle = bc; circ(ctx, bx, by, 0.55); ctx.fill(); });
      ctx.fillStyle = L.skin; circ(ctx, -4, -62.6, 1.2); ctx.fill(); circ(ctx, 4.6, -62.6, 1.2); ctx.fill();
      break;
    }
    case 'shield': {
      const x = lh[0] + 1, y = lh[1] - 2;
      ctx.beginPath(); ctx.moveTo(x - 7, y - 8); ctx.lineTo(x + 7, y - 8); ctx.lineTo(x + 7, y); ctx.quadraticCurveTo(x + 6, y + 7, x, y + 10); ctx.quadraticCurveTo(x - 6, y + 7, x - 7, y); ctx.closePath();
      ctx.fillStyle = c; ctx.fill();
      ctx.strokeStyle = '#d5d9de'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#f2c94c'; ctx.fillRect(x - 1, y - 7, 2, 15); ctx.fillRect(x - 6, y - 2.5, 12, 2);
      break;
    }
    case 'parrot': {
      const b = Math.sin(t * 3) * 0.6;
      ctx.save(); ctx.translate(13, -84 + b);
      ctx.fillStyle = '#2f6fe0'; poly(ctx, [[-1, 3], [1.5, 3], [2, 12], [0, 12]]); ctx.fill();
      ctx.fillStyle = '#ffd23f'; poly(ctx, [[0.5, 3], [2.5, 3], [3.6, 10], [1.8, 10]]); ctx.fill();
      ctx.fillStyle = c; ell(ctx, 0, -1, 3.2, 4.6, 0.2); ctx.fill();
      ctx.fillStyle = shade(c, -0.25); ell(ctx, 1.2, 0, 1.8, 3.4, 0.3); ctx.fill();
      ctx.fillStyle = c; circ(ctx, -0.6, -5.6, 2.6); ctx.fill();
      ctx.fillStyle = '#fff'; circ(ctx, -1.4, -6, 0.9); ctx.fill();
      ctx.fillStyle = '#111'; circ(ctx, -1.5, -6, 0.45); ctx.fill();
      ctx.fillStyle = '#f2c94c'; poly(ctx, [[-2.6, -5.4], [-5, -4.2], [-2.8, -3.6]]); ctx.fill();
      ctx.fillStyle = '#5a5a5a'; ctx.fillRect(-1.4, 3.2, 0.6, 1.4); ctx.fillRect(0.4, 3.2, 0.6, 1.4);
      ctx.restore();
      break;
    }
  }
}

function sparkle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2); ctx.quadraticCurveTo(x, y, x + r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y + r * 2); ctx.quadraticCurveTo(x, y, x - r * 2, y);
  ctx.quadraticCurveTo(x, y, x, y - r * 2); ctx.fill();
}
