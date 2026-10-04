// ============================================================
//  LIL' PLUT ODYSSEY — ART 🖍️
//  Plut, the enemies, the bosses and all the things you pick up.
//  Everything is drawn with circles, curves and colors.
//  (x, y) is always the point between the feet, on the floor.
// ============================================================
window.LP = window.LP || {};

LP.Art = (function () {
  const U = LP.U, PI = Math.PI, TAU = PI * 2;

  const PLUT = {
    skin: '#ffd5b5', skinDark: '#f0a98a', cheek: '#ff8f95',
    hair: '#7a4a2a', onesie: '#ffcf3f', onesieDark: '#e09a1a',
    diaper: '#ffffff', diaperDark: '#d8dcef',
    blanket: '#ff4f6a', blanketDark: '#c22a4a', dots: '#ffffff',
    eye: '#1e1430',
  };

  function starShape(c, x, y, R, r, n) {
    c.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * TAU - PI / 2, rr = i % 2 ? r : R;
      c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TAU); }
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); }
  function limb(c, x1, y1, x2, y2, w, col) {
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
  }
  function eyes(c, x, y, look, mood, size) {
    const s = size || 1;
    // white
    c.fillStyle = '#fff';
    ell(c, x, y, 5.2 * s, 6.6 * s); c.fill();
    ell(c, x + 10 * s, y, 4.6 * s, 6.2 * s); c.fill();
    c.strokeStyle = 'rgba(30,20,48,0.5)'; c.lineWidth = 1.2;
    ell(c, x, y, 5.2 * s, 6.6 * s); c.stroke(); ell(c, x + 10 * s, y, 4.6 * s, 6.2 * s); c.stroke();
    if (mood === 'shut') {
      c.fillStyle = PLUT.skin; c.fillRect(x - 6 * s, y - 7 * s, 22 * s, 8 * s);
      c.strokeStyle = PLUT.eye; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x - 5 * s, y); c.quadraticCurveTo(x, y + 3 * s, x + 5 * s, y); c.moveTo(x + 6 * s, y); c.quadraticCurveTo(x + 10 * s, y + 3 * s, x + 14 * s, y); c.stroke();
      return;
    }
    // pupils
    c.fillStyle = PLUT.eye;
    const lx = (look || 0) * 1.6 * s;
    ell(c, x + 1.4 * s + lx, y + 0.6 * s, 3 * s, 3.8 * s); c.fill();
    ell(c, x + 11 * s + lx, y + 0.6 * s, 2.7 * s, 3.6 * s); c.fill();
    c.fillStyle = '#fff';
    circle(c, x + 2.4 * s + lx, y - 1 * s, 1.2 * s); c.fill(); circle(c, x + 11.8 * s + lx, y - 1 * s, 1.1 * s); c.fill();
  }

  // ======================= PLUT =======================
  // p = { anim, animT, facing, sx, sy, runPhase, combo, time, blink, vx, vy }
  function plut(c, x, y, p) {
    const P = PLUT, t = p.time || 0, a = p.anim, at = p.animT || 0;
    c.save();
    c.translate(x, y);
    c.scale(p.sx || 1, p.sy || 1);
    if (a === 'bubble') {
      const bob = Math.sin(t * 5) * 3;
      c.translate(0, -30 + bob);
      c.save(); c.scale(0.8, 0.8); c.translate(0, 26); plutBody(c, p, 'hurt', 0, t); c.restore();
      const g = c.createRadialGradient(-10, -14, 4, 0, 0, 44);
      g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(0.7, 'rgba(160,220,255,0.18)'); g.addColorStop(1, 'rgba(200,170,255,0.55)');
      c.fillStyle = g; circle(c, 0, 0, 42); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2; circle(c, 0, 0, 42); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.85)'; ell(c, -18, -20, 9, 5, -0.7); c.fill();
      c.restore();
      return;
    }
    c.scale(p.facing || 1, 1);
    plutBody(c, p, a, at, t);
    c.restore();
  }

  function plutBody(c, p, a, at, t) {
    const P = PLUT;
    let bodyY = -24, headX = 3, headY = -45, tilt = 0, bob = 0;
    let legL = 0, legR = 0, armF = 0.4, armB = -0.4;   // angles
    let mouth = 'smirk', eyeMood = 'open', look = 1;
    let capeWave = Math.sin(t * 8) * 0.15, capeLift = 0;
    const blink = (t % 3.3) < 0.12;
    const run = p.runPhase || 0;

    if (a === 'idle') {
      bob = Math.sin(t * 3) * 1.2;
      armF = 0.3 + Math.sin(t * 3) * 0.08; armB = -0.3;
      mouth = (p.idleT || 0) > 4 ? 'tongue' : 'smirk';
      if ((p.idleT || 0) > 4) { tilt = Math.sin(t * 6) * 0.08; }
    } else if (a === 'run') {
      const s = Math.sin(run * 2.2);
      legL = s * 0.9; legR = -s * 0.9;
      armF = -s * 1.1; armB = s * 1.1;
      bob = -Math.abs(Math.cos(run * 2.2)) * 4;
      tilt = 0.12; mouth = 'grin';
      capeWave = 0.5 + Math.sin(t * 14) * 0.15; capeLift = 0.5;
    } else if (a === 'jump') {
      legL = 0.5; legR = -0.7; armF = -2.2; armB = -1.6; mouth = 'open'; capeWave = -0.4; capeLift = -0.2;
    } else if (a === 'fall') {
      legL = 0.3; legR = -0.3; armF = -2.6; armB = -2.4; mouth = 'o'; capeWave = -0.9; capeLift = -0.6;
    } else if (a === 'glide') {
      legL = 0.2 + Math.sin(t * 12) * 0.3; legR = -0.2 - Math.sin(t * 12) * 0.3;
      armF = -2.9; armB = -2.9; mouth = 'whee';
    } else if (a === 'wall') {
      legL = -0.8; legR = 0.4; armF = -2.4; armB = -0.8; mouth = 'grit'; look = 1;
    } else if (a === 'slap') {
      const k = Math.min(1, at / 0.1);
      armF = -1.4 + k * 2.9;   // swing forward
      armB = -0.6;
      legL = 0.5; legR = -0.4; tilt = 0.18; mouth = 'grit';
      if (p.combo === 2) { armB = 1.4; mouth = 'yell'; }
    } else if (a === 'scream') {
      armF = -2.6 + Math.sin(t * 40) * 0.2; armB = -2.2 - Math.sin(t * 40) * 0.2;
      legL = 0.3; legR = -0.3; mouth = 'scream'; eyeMood = 'shut';
      bob = Math.sin(t * 50) * 1.5; tilt = -0.15;
      headY -= 2;
    } else if (a === 'pound') {
      legL = -1.2; legR = 1.0; armF = -2.8; armB = -2.8; mouth = 'grit'; bob = 6;
    } else if (a === 'sleep') {
      armF = 0.6; armB = -0.5; mouth = 'o'; eyeMood = 'shut'; bob = Math.sin(t * 2) * 1.5; capeWave = 0.6;
    } else if (a === 'hurt') {
      armF = -2.6; armB = -2.4; mouth = 'cry'; eyeMood = 'shut';
    } else if (a === 'win') {
      const s = Math.sin(t * 9);
      bob = -Math.abs(s) * 12; armF = -2.8 + s * 0.3; armB = -2.8 - s * 0.3; mouth = 'grin'; legL = 0.4; legR = -0.4;
    } else if (a === 'crawl') {
      crawl(c, p, t); return;
    }

    c.save();
    c.translate(0, bob);
    c.rotate(tilt);

    // ---- blanket cape (behind) ----
    if (a !== 'glide') {
      c.fillStyle = P.blanket;
      c.beginPath();
      c.moveTo(-4, -34);
      const tipX = -24 - capeLift * 10, tipY = -14 + capeWave * 18 + capeLift * -14;
      c.quadraticCurveTo(-22, -36 + capeWave * 6, tipX, tipY);
      c.quadraticCurveTo(-14, tipY + 6, -2, -18);
      c.closePath(); c.fill();
      c.fillStyle = P.dots; circle(c, -14, -28 + capeWave * 6, 2.2); c.fill(); circle(c, tipX + 6, tipY - 2, 2); c.fill();
    }

    // ---- back arm ----
    arm(c, -2, -31, armB, P.onesieDark, P.skinDark);
    // ---- legs ----
    leg(c, -5, -14, legL, P.skinDark);
    leg(c, 5, -14, legR, P.skin);

    // ---- body + diaper ----
    c.fillStyle = P.onesie; ell(c, 0, bodyY, 13, 12.5); c.fill();
    c.fillStyle = P.onesieDark; ell(c, 0, bodyY + 4, 13, 8.5); c.fill();
    c.fillStyle = P.onesie; ell(c, 0, bodyY - 1, 12, 10); c.fill();
    c.fillStyle = P.diaper; c.beginPath(); c.ellipse(0, -15, 13.5, 8, 0, 0, PI); c.lineTo(-13.5, -17); c.lineTo(13.5, -17); c.fill();
    c.fillStyle = P.diaperDark; c.fillRect(-13, -18, 26, 3);
    c.fillStyle = '#7fd4ff'; circle(c, 8, -16, 2); c.fill();   // diaper pin
    // star on the onesie
    c.fillStyle = '#fff'; starShape(c, 3, -26, 4.5, 2, 5); c.fill();

    // ---- head ----
    c.save();
    c.translate(headX, headY);
    if (a === 'scream') c.scale(1.06, 1.06);
    c.fillStyle = P.skin; circle(c, 0, 0, 17.5); c.fill();
    c.fillStyle = P.skinDark; ell(c, -12, 3, 4, 5); c.fill();   // ear
    // hair curl
    c.strokeStyle = P.hair; c.lineWidth = 3.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-2, -16); c.bezierCurveTo(-4, -28, 10, -28, 8, -20); c.bezierCurveTo(7, -16, 1, -18, 3, -22); c.stroke();
    c.lineWidth = 2.4; c.beginPath(); c.moveTo(-8, -14); c.quadraticCurveTo(-12, -20, -8, -22); c.stroke();
    // cheeks
    c.fillStyle = U.alpha(P.cheek, 0.55); ell(c, 13, 6, 4.5, 3); c.fill(); ell(c, -1, 7, 4, 3); c.fill();
    // eyebrows (naughty!)
    c.strokeStyle = P.hair; c.lineWidth = 2.2;
    c.beginPath();
    if (a === 'sleep') { c.moveTo(-1, -10); c.lineTo(6, -10.5); c.moveTo(10, -10.5); c.lineTo(16, -10); }
    else if (mouth === 'cry' || a === 'scream') { c.moveTo(-1, -12); c.lineTo(6, -9); c.moveTo(10, -9); c.lineTo(16, -12); }
    else { c.moveTo(-1, -9.5); c.lineTo(6, -11); c.moveTo(10, -12); c.lineTo(16, -9); }
    c.stroke();
    eyes(c, 2, -3, look, blink && eyeMood === 'open' ? 'shut' : eyeMood, 1);
    // mouth
    face(c, mouth, t);
    c.restore();

    // ---- front arm ----
    arm(c, 3, -31, armF, P.onesie, P.skin, a === 'slap');

    // ---- slap swoosh ----
    if (a === 'slap' && at < 0.16) {
      const k = at / 0.16, big = p.combo === 2;
      c.strokeStyle = `rgba(255,255,255,${0.85 * (1 - k)})`; c.lineWidth = big ? 9 : 6; c.lineCap = 'round';
      c.beginPath(); c.arc(8, -30, big ? 40 : 30, -1.4 + k * 0.4, 0.9 + k * 0.4); c.stroke();
      if (big) { c.strokeStyle = `rgba(255,220,90,${0.8 * (1 - k)})`; c.lineWidth = 4; c.beginPath(); c.arc(8, -30, 50, -1.2, 1.1); c.stroke(); }
    }
    // ---- glide: the blanket spins above the head like a helicopter ----
    if (a === 'glide') {
      const spin = Math.cos(t * 28);
      c.save(); c.translate(2, -76);
      c.fillStyle = 'rgba(255,255,255,0.18)'; ell(c, 0, 0, 40, 9); c.fill();
      c.fillStyle = P.blanket; ell(c, 0, 0, 38 * Math.abs(spin) + 6, 8); c.fill();
      c.fillStyle = P.blanketDark; ell(c, 0, 3, 38 * Math.abs(spin) + 6, 5); c.fill();
      c.fillStyle = P.dots; for (const k of [-0.6, 0, 0.6]) { circle(c, k * 38 * spin, -1, 2.5); c.fill(); }
      c.restore();
      c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
      for (let i = 0; i < 2; i++) { c.beginPath(); c.arc(2, -76, 46 + i * 8, PI * (0.1 + i * 0.5) + t * 9, PI * (0.4 + i * 0.5) + t * 9); c.stroke(); }
    }
    c.restore();
  }

  function face(c, mouth, t) {
    const P = PLUT;
    c.fillStyle = '#7a1e2e'; c.strokeStyle = '#7a1e2e'; c.lineWidth = 2; c.lineCap = 'round';
    if (mouth === 'smirk') {
      c.beginPath(); c.moveTo(4, 9); c.quadraticCurveTo(9, 12, 14, 7); c.stroke();
    } else if (mouth === 'tongue') {
      c.beginPath(); c.moveTo(3, 8); c.quadraticCurveTo(9, 11, 15, 8); c.stroke();
      c.fillStyle = '#ff6a8a'; ell(c, 10, 11 + Math.sin(t * 10) * 1.2, 4, 4.5); c.fill();
      c.strokeStyle = '#d0406a'; c.lineWidth = 1; c.beginPath(); c.moveTo(10, 9); c.lineTo(10, 13); c.stroke();
    } else if (mouth === 'grin') {
      c.beginPath(); c.moveTo(3, 6); c.quadraticCurveTo(10, 16, 16, 5); c.closePath(); c.fill();
      c.fillStyle = '#fff'; c.fillRect(6, 6, 3, 2.5);   // one tooth!
    } else if (mouth === 'open' || mouth === 'whee') {
      ell(c, 10, 9, mouth === 'whee' ? 3.6 : 4, mouth === 'whee' ? 4.5 : 3.5); c.fill();
    } else if (mouth === 'o') {
      ell(c, 10, 10, 3, 3.5); c.fill();
    } else if (mouth === 'grit') {
      c.fillStyle = '#fff'; c.beginPath(); c.roundRect(4, 6, 11, 5, 2); c.fill();
      c.strokeStyle = '#7a1e2e'; c.lineWidth = 1.5; c.stroke();
    } else if (mouth === 'yell') {
      c.beginPath(); c.moveTo(3, 5); c.lineTo(16, 4); c.quadraticCurveTo(12, 17, 4, 12); c.closePath(); c.fill();
    } else if (mouth === 'scream') {
      const w = 1 + Math.sin(t * 45) * 0.08;
      ell(c, 9, 10, 7.5 * w, 9 * w); c.fill();
      c.fillStyle = '#ff6a8a'; ell(c, 9, 15, 5, 3); c.fill();
      c.fillStyle = '#fff'; c.fillRect(6, 1.5, 3, 2.5);
    } else if (mouth === 'cry') {
      c.beginPath(); c.moveTo(3, 12); c.quadraticCurveTo(9, 2, 15, 12); c.quadraticCurveTo(9, 8, 3, 12); c.fill();
      c.fillStyle = 'rgba(120,200,255,0.9)'; ell(c, 0, 2 + (t * 40) % 10, 2, 3); c.fill(); ell(c, 16, 3 + (t * 40 + 5) % 10, 2, 3); c.fill();
    }
  }

  function arm(c, sx, sy, ang, sleeve, skin, slap) {
    const len = 13;
    // angle 0 = arm hanging down, bigger = more to the front, PI = straight up
    const ex = sx + Math.sin(ang) * len, ey = sy + Math.cos(ang) * len;
    limb(c, sx, sy, ex, ey, 7, sleeve);
    c.fillStyle = skin; circle(c, ex, ey, slap ? 6.5 : 4.6); c.fill();
    if (slap) { c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = 1; circle(c, ex, ey, 6.5); c.stroke(); }
  }
  function leg(c, hx, hy, ang, col) {
    const len = 11;
    const fx = hx + Math.sin(ang) * len, fy = hy + Math.cos(ang) * len;
    limb(c, hx, hy, fx, fy, 8, col);
    c.fillStyle = col; ell(c, fx + 3, fy + 1, 6.5, 4); c.fill();
  }

  function crawl(c, p, t) {
    const P = PLUT, run = p.runPhase || 0, s = Math.sin(run * 3);
    // body is sideways when crawling
    limb(c, -10, -12, -16 + s * 4, -2, 8, P.skinDark);
    limb(c, 8, -14, 12 - s * 5, -2, 6.5, P.onesieDark);
    c.fillStyle = P.onesie; ell(c, -4, -16, 15, 10); c.fill();
    c.fillStyle = P.diaper; ell(c, -14, -15, 9, 9); c.fill();
    c.fillStyle = P.blanket; c.beginPath(); c.moveTo(4, -24); c.quadraticCurveTo(-8, -32, -20, -24 + Math.sin(t * 8) * 3); c.quadraticCurveTo(-8, -22, 4, -18); c.fill();
    limb(c, -6, -10, -4 - s * 4, -2, 8, P.skin);
    limb(c, 10, -14, 14 + s * 5, -2, 6.5, P.onesie);
    c.fillStyle = P.skin; circle(c, 14 + s * 5, -2, 4); c.fill();
    c.save(); c.translate(18, -22); c.scale(0.9, 0.9);
    c.fillStyle = P.skin; circle(c, 0, 0, 17); c.fill();
    c.strokeStyle = P.hair; c.lineWidth = 3; c.beginPath(); c.moveTo(-2, -16); c.bezierCurveTo(-4, -28, 10, -28, 8, -20); c.stroke();
    c.fillStyle = U.alpha(P.cheek, 0.55); ell(c, 12, 6, 4, 3); c.fill();
    eyes(c, 2, -3, 1, 'open', 1);
    face(c, 'grin', t);
    c.restore();
  }

  // ======================= THINGS TO PICK UP =======================
  function milk(c, x, y, t, choc) {
    const bob = Math.sin(t * 3 + x * 0.05) * 3;
    c.save(); c.translate(x, y + bob);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 20);
    g.addColorStop(0, choc ? 'rgba(255,190,110,0.55)' : 'rgba(200,240,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; circle(c, 0, 0, 20); c.fill();
    const sq = 1 + Math.sin(t * 6 + x) * 0.06;
    c.scale(sq, 2 - sq);
    c.fillStyle = choc ? '#8a4a24' : '#ffffff';
    c.beginPath(); c.moveTo(0, -11); c.bezierCurveTo(4, -5, 8, -1, 8, 3); c.arc(0, 3, 8, 0, PI); c.bezierCurveTo(-8, -1, -4, -5, 0, -11); c.fill();
    c.strokeStyle = choc ? '#5a2a10' : '#8fd0ff'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = choc ? 'rgba(255,220,180,0.7)' : 'rgba(170,220,255,0.9)'; ell(c, -3, 2, 2.2, 3.2, 0.3); c.fill();
    c.restore();
  }
  function bottle(c, x, y, t, gold) {
    const bob = Math.sin(t * 2.5 + x) * 4;
    c.save(); c.translate(x, y + bob); c.rotate(Math.sin(t * 2) * 0.12);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 40);
    g.addColorStop(0, gold ? 'rgba(255,220,80,0.7)' : 'rgba(210,240,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; circle(c, 0, 0, 40); c.fill();
    if (gold) {
      c.save(); c.rotate(t);
      c.fillStyle = 'rgba(255,230,120,0.35)';
      for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.beginPath(); c.moveTo(0, 0); c.lineTo(-5, -44); c.lineTo(5, -44); c.fill(); }
      c.restore();
    }
    // nipple
    c.fillStyle = gold ? '#ffb43a' : '#ffc4a0'; ell(c, 0, -22, 5, 7); c.fill();
    c.fillStyle = gold ? '#ffd23f' : '#7fd4ff'; c.fillRect(-10, -17, 20, 6);
    // bottle
    c.fillStyle = gold ? '#ffe680' : 'rgba(255,255,255,0.85)';
    c.beginPath(); c.roundRect(-11, -11, 22, 30, 7); c.fill();
    c.fillStyle = gold ? '#ffcf3a' : '#ffffff'; c.beginPath(); c.roundRect(-11, -2, 22, 21, [0, 0, 7, 7]); c.fill();
    c.strokeStyle = gold ? '#b8860b' : '#8fc8ee'; c.lineWidth = 2; c.beginPath(); c.roundRect(-11, -11, 22, 30, 7); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(-7, -8, 3, 22);
    c.restore();
  }
  function heart(c, x, y, t, s) {
    const k = (s || 1) * (1 + Math.sin((t || 0) * 6) * 0.08);
    c.save(); c.translate(x, y); c.scale(k, k);
    c.fillStyle = '#ff3a5c';
    c.beginPath(); c.moveTo(0, 9); c.bezierCurveTo(-16, -2, -10, -16, 0, -7); c.bezierCurveTo(10, -16, 16, -2, 0, 9); c.fill();
    c.strokeStyle = '#a0102a'; c.lineWidth = 2; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.75)'; ell(c, -6, -6, 3, 2, -0.6); c.fill();
    c.restore();
  }
  function duck(c, x, y, s, rot, t) {
    c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(s || 1, s || 1);
    c.fillStyle = '#ffd23f';
    ell(c, 0, 0, 16, 11); c.fill();
    c.beginPath(); c.moveTo(10, -4); c.quadraticCurveTo(20, -6, 18, 4); c.fill();      // tail
    circle(c, -8, -12, 9); c.fill();                                                    // head
    c.fillStyle = '#ff8a1a'; c.beginPath(); c.moveTo(-15, -12); c.quadraticCurveTo(-24, -11, -16, -7); c.fill();
    c.fillStyle = '#1e1430'; circle(c, -10, -14, 1.8); c.fill();
    c.fillStyle = '#f0b020'; c.beginPath(); c.ellipse(2, 0, 8, 5, 0.3 + Math.sin((t || 0) * 12) * 0.4, 0, PI); c.fill();   // wing
    c.fillStyle = 'rgba(255,255,255,0.6)'; ell(c, -10, -16, 3, 1.6, -0.4); c.fill();
    c.restore();
  }
  function cage(c, x, y, t) {
    // a little cage hanging on a rope with a rubber duck inside
    const sw = Math.sin(t * 2) * 0.06;
    c.save(); c.translate(x, y - 56); c.rotate(sw);
    c.strokeStyle = '#8a6a4a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -30); c.lineTo(0, -6); c.stroke();
    c.fillStyle = 'rgba(255,240,180,0.25)'; c.beginPath(); c.roundRect(-24, 0, 48, 52, [18, 18, 4, 4]); c.fill();
    duck(c, 2, 36, 0.95, 0, t * (Math.floor(t) % 3 === 0 ? 1 : 0));
    c.strokeStyle = '#c8962e'; c.lineWidth = 3.5;
    for (let k = -18; k <= 18; k += 9) { c.beginPath(); c.moveTo(k, 4); c.lineTo(k, 50); c.stroke(); }
    c.fillStyle = '#e8b040'; c.beginPath(); c.roundRect(-26, 46, 52, 8, 3); c.fill();
    c.beginPath(); c.moveTo(-24, 8); c.quadraticCurveTo(0, -14, 24, 8); c.lineTo(24, 4); c.quadraticCurveTo(0, -20, -24, 4); c.fill();
    c.fillStyle = '#ffd23f'; circle(c, 0, -6, 5); c.fill();
    c.restore();
    // a "help!" bubble sometimes
    if ((t % 4) < 1.2) {
      c.font = `800 13px ${LP.FONT}`; c.textAlign = 'center';
      c.fillStyle = '#fff'; c.beginPath(); c.roundRect(x + 14, y - 112, 50, 22, 10); c.fill();
      c.fillStyle = '#c0306a'; c.fillText('QUACK!', x + 39, y - 96);
    }
  }
  function checkpoint(c, x, y, on, t) {
    // a giant pacifier on a stick
    c.fillStyle = '#b98a5a'; c.fillRect(x - 3, y - 72, 6, 72);
    c.fillStyle = '#8a5a3a'; ell(c, x, y, 14, 4); c.fill();
    const bob = on ? Math.sin(t * 4) * 3 : 0;
    c.save(); c.translate(x, y - 84 + bob); c.rotate(on ? Math.sin(t * 2) * 0.15 : 0.5);
    if (on) { const g = c.createRadialGradient(0, 0, 0, 0, 0, 44); g.addColorStop(0, 'rgba(255,240,150,0.6)'); g.addColorStop(1, 'rgba(255,240,150,0)'); c.fillStyle = g; circle(c, 0, 0, 44); c.fill(); }
    const col = on ? '#4ac8ff' : '#9a9aa8';
    c.strokeStyle = col; c.lineWidth = 5; circle(c, 0, -20, 9); c.stroke();
    c.fillStyle = on ? '#ff6a9a' : '#b0b0bc'; c.beginPath(); c.ellipse(0, 0, 22, 12, 0, 0, TAU); c.fill();
    c.fillStyle = col; circle(c, 0, 0, 7); c.fill();
    c.fillStyle = on ? '#ffd0a0' : '#c8c8d0'; ell(c, 0, 13, 6, 8); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; ell(c, -10, -4, 6, 3, -0.3); c.fill();
    c.restore();
  }
  function finish(c, x, y, t, done) {
    // a bunch of balloons tied to a sign
    c.fillStyle = '#b98a5a'; c.fillRect(x - 4, y - 90, 8, 90);
    c.fillStyle = '#fff4d8'; c.beginPath(); c.roundRect(x - 52, y - 118, 104, 40, 10); c.fill();
    c.strokeStyle = '#b98a5a'; c.lineWidth = 4; c.stroke();
    c.font = `800 22px ${LP.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#e8345a'; c.fillText('FINISH!', x, y - 97);
    const cols = ['#ff4f6a', '#ffd23f', '#4ac8ff', '#7cf05a', '#c77dff'];
    for (let i = 0; i < 5; i++) {
      const bx = x + (i - 2) * 24 + Math.sin(t * 2 + i) * 4, by = y - 180 - (i % 2) * 26 + Math.cos(t * 1.7 + i) * 4 - (done ? (t % 100) * 0 : 0);
      c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y - 118); c.quadraticCurveTo(bx, by + 40, bx, by + 22); c.stroke();
      c.fillStyle = cols[i]; ell(c, bx, by, 17, 21); c.fill();
      c.beginPath(); c.moveTo(bx - 4, by + 24); c.lineTo(bx + 4, by + 24); c.lineTo(bx, by + 19); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.55)'; ell(c, bx - 6, by - 8, 4, 7, 0.4); c.fill();
    }
  }
  function spring(c, key, x, y, sq) {
    const s = 1 - (sq || 0) * 0.45;
    c.save(); c.translate(x, y);
    if (key === 'garden' || key === 'park' || key === 'dream') {
      // bouncy mushroom
      c.fillStyle = '#f0e2c8'; c.fillRect(-9, -24 * s, 18, 24 * s);
      c.fillStyle = key === 'park' ? '#ff7ab0' : key === 'dream' ? '#b88aff' : '#e8343c';
      c.beginPath(); c.ellipse(0, -24 * s, 30 + (sq || 0) * 8, 22 * s, 0, PI, 0); c.fill();
      c.fillStyle = '#fff'; circle(c, -12, -32 * s, 5); c.fill(); circle(c, 8, -38 * s, 6); c.fill(); circle(c, 18, -28 * s, 4); c.fill();
    } else if (key === 'city') {
      // trampoline
      c.fillStyle = '#40465a'; c.fillRect(-26, -14, 6, 14); c.fillRect(20, -14, 6, 14);
      c.fillStyle = '#ff4f6a'; c.beginPath(); c.roundRect(-30, -20 + (sq || 0) * 8, 60, 9, 4); c.fill();
      c.fillStyle = '#fff'; for (let k = -24; k < 24; k += 12) c.fillRect(k, -20 + (sq || 0) * 8, 6, 9);
    } else {
      // toy drum
      c.fillStyle = '#e8343c'; c.beginPath(); c.roundRect(-24, -30 * s, 48, 30 * s, 4); c.fill();
      c.strokeStyle = '#ffd23f'; c.lineWidth = 3; c.beginPath();
      for (let k = -24; k < 24; k += 12) { c.moveTo(k, -30 * s); c.lineTo(k + 12, 0); c.moveTo(k + 12, -30 * s); c.lineTo(k, 0); } c.stroke();
      c.fillStyle = '#fff4e0'; ell(c, 0, -30 * s, 25, 7); c.fill();
      c.strokeStyle = '#c8b090'; c.lineWidth = 2; ell(c, 0, -30 * s, 25, 7); c.stroke();
    }
    c.restore();
  }
  function fan(c, key, x, y, t) {
    c.save(); c.translate(x, y);
    c.fillStyle = key === 'city' ? '#6a7288' : '#8a90a8';
    c.beginPath(); c.roundRect(-26, -14, 52, 14, 4); c.fill();
    c.fillStyle = key === 'city' ? '#4a5064' : '#d8dce8';
    ell(c, 0, -16, 30, 7); c.fill();
    c.fillStyle = 'rgba(80,90,120,0.8)';
    const s = Math.sin(t * 30);
    for (let k = 0; k < 3; k++) { const a = t * 30 + k * TAU / 3; c.beginPath(); c.ellipse(Math.cos(a) * 14, -16, 12 * Math.abs(Math.cos(a)) + 3, 4, 0, 0, TAU); c.fill(); }
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.5; ell(c, 0, -16, 30, 7); c.stroke();
    c.restore();
  }
  function sign(c, x, y) {
    c.fillStyle = '#9a6a3a'; c.fillRect(x - 4, y - 46, 8, 46);
    c.fillStyle = '#d8a868'; c.beginPath(); c.roundRect(x - 22, y - 66, 44, 34, 6); c.fill();
    c.strokeStyle = '#7a4a2a'; c.lineWidth = 3; c.stroke();
    c.font = `800 26px ${LP.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#e8345a'; c.fillText('!', x, y - 48);
  }
  function platform(c, key, x, y, w, t) {
    if (key === 'dream') {
      // a little cloud
      c.fillStyle = '#ffffff';
      for (let k = 0; k < 5; k++) { circle(c, x + 6 + k * (w - 12) / 4, y + 8 + Math.sin(k * 2) * 3, 13); c.fill(); }
      c.fillStyle = '#ffd0ef'; c.fillRect(x + 2, y + 12, w - 4, 8);
    } else if (key === 'garden') {
      // a big floating leaf
      c.fillStyle = '#3f9a45'; c.beginPath(); c.ellipse(x + w / 2, y + 8, w / 2 + 8, 14, 0, 0, TAU); c.fill();
      c.fillStyle = '#6fd060'; c.beginPath(); c.ellipse(x + w / 2, y + 5, w / 2 + 4, 10, 0, 0, TAU); c.fill();
      c.strokeStyle = '#3f9a45'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 5); c.lineTo(x + w, y + 5); c.stroke();
    } else if (key === 'park') {
      // a floating log
      c.fillStyle = '#7a4a2a'; c.beginPath(); c.roundRect(x - 4, y, w + 8, 22, 11); c.fill();
      c.fillStyle = '#9a6a3a'; c.beginPath(); c.roundRect(x - 4, y, w + 8, 10, [11, 11, 0, 0]); c.fill();
      c.fillStyle = '#c8955a'; ell(c, x + w + 1, y + 11, 6, 10); c.fill();
      c.strokeStyle = '#7a4a2a'; c.lineWidth = 1.5; ell(c, x + w + 1, y + 11, 3, 5); c.stroke();
    } else if (key === 'city') {
      // window cleaner's platform
      c.strokeStyle = '#8a92a8'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 8, y); c.lineTo(x + 8, y - 400); c.moveTo(x + w - 8, y); c.lineTo(x + w - 8, y - 400); c.stroke();
      c.fillStyle = '#5c6278'; c.fillRect(x, y, w, 16); c.fillStyle = '#ffcf3f'; c.fillRect(x, y, w, 5);
      c.strokeStyle = '#5c6278'; c.lineWidth = 3; c.strokeRect(x + 2, y - 22, w - 4, 22);
    } else {
      // a toy skateboard
      c.fillStyle = '#4ac8ff'; c.beginPath(); c.roundRect(x - 4, y, w + 8, 12, 6); c.fill();
      c.fillStyle = '#ff4f6a'; c.fillRect(x + 6, y + 2, w - 12, 3);
      c.fillStyle = '#40304a'; circle(c, x + 14, y + 16, 6); c.fill(); circle(c, x + w - 14, y + 16, 6); c.fill();
    }
  }
  // breakable box
  function box(c, key, x, y, h) {
    const T = LP.T;
    if (key === 'house') {
      const col = ['#ff5a6e', '#4ac8ff', '#ffd23f', '#7cdb5a'][Math.floor(h * 4)];
      c.fillStyle = U.mix(col, '#000000', 0.25); c.beginPath(); c.roundRect(x + 1, y + 1, T - 2, T - 2, 6); c.fill();
      c.fillStyle = col; c.beginPath(); c.roundRect(x + 1, y + 1, T - 2, T - 6, 6); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.roundRect(x + 8, y + 7, T - 16, T - 18, 4); c.fill();
      c.font = `800 26px ${LP.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = col; c.fillText('ABCDPLUT'[Math.floor(h * 8)], x + T / 2, y + T / 2 - 1);
    } else if (key === 'dream') {
      // candy box
      c.fillStyle = '#b88aff'; c.beginPath(); c.roundRect(x + 1, y + 1, T - 2, T - 2, 8); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(x + T / 2 - 4, y + 1, 8, T - 2); c.fillRect(x + 1, y + T / 2 - 4, T - 2, 8);
      c.fillStyle = '#ff7ac8'; circle(c, x + T / 2, y + T / 2, 7); c.fill();
    } else if (key === 'city' && h < 0.5) {
      // cardboard box
      c.fillStyle = '#c8955a'; c.fillRect(x + 1, y + 1, T - 2, T - 2);
      c.fillStyle = '#a87440'; c.fillRect(x + 1, y + 1, T - 2, 8);
      c.fillStyle = '#e8d0a0'; c.fillRect(x + T / 2 - 5, y + 1, 10, T - 2);
      c.strokeStyle = '#7a4a24'; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, T - 2, T - 2);
    } else {
      // wooden crate
      c.fillStyle = '#b7834a'; c.fillRect(x + 1, y + 1, T - 2, T - 2);
      c.strokeStyle = '#7a4a24'; c.lineWidth = 5; c.strokeRect(x + 3.5, y + 3.5, T - 7, T - 7);
      c.lineWidth = 4; c.beginPath(); c.moveTo(x + 6, y + 6); c.lineTo(x + T - 6, y + T - 6); c.moveTo(x + T - 6, y + 6); c.lineTo(x + 6, y + T - 6); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(x + 6, y + 6, T - 12, 3);
    }
  }

  // ======================= ENEMIES =======================
  function angryEyes(c, x, y, s, col) {
    c.fillStyle = '#fff'; ell(c, x - 5 * s, y, 4.5 * s, 5 * s); c.fill(); ell(c, x + 5 * s, y, 4.5 * s, 5 * s); c.fill();
    c.fillStyle = col || '#1e1430'; circle(c, x - 4 * s, y + 1 * s, 2.3 * s); c.fill(); circle(c, x + 6 * s, y + 1 * s, 2.3 * s); c.fill();
    c.strokeStyle = '#1e1430'; c.lineWidth = 2.2 * s; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x - 10 * s, y - 7 * s); c.lineTo(x - 1 * s, y - 4 * s); c.moveTo(x + 10 * s, y - 7 * s); c.lineTo(x + 1 * s, y - 4 * s); c.stroke();
  }
  function stunStars(c, x, y, t) {
    for (let i = 0; i < 3; i++) {
      const a = t * 5 + (i * TAU) / 3;
      c.fillStyle = '#ffe14a'; starShape(c, x + Math.cos(a) * 16, y + Math.sin(a) * 5, 6, 2.6, 5); c.fill();
    }
  }

  function walker(c, key, x, y, f, t, e) {
    c.save(); c.translate(x, y); c.scale(f, 1);
    const step = Math.sin(t * 12);
    if (key === 'house') {
      // wind-up toy soldier
      c.fillStyle = '#f4f0e8'; c.fillRect(-8, -14, 6, 14 + step * 2); c.fillRect(2, -14, 6, 14 - step * 2);
      c.fillStyle = '#1e1430'; c.fillRect(-9, -3 + step * 2, 8, 4); c.fillRect(1, -3 - step * 2, 8, 4);
      c.fillStyle = '#e8343c'; c.beginPath(); c.roundRect(-11, -34, 22, 22, 4); c.fill();
      c.fillStyle = '#ffd23f'; circle(c, 4, -28, 2); c.fill(); circle(c, 4, -20, 2); c.fill();
      c.fillStyle = '#ffd5b5'; circle(c, 0, -42, 9); c.fill();
      c.fillStyle = '#1e1430'; c.beginPath(); c.roundRect(-9, -66, 18, 20, 3); c.fill();
      c.fillStyle = '#ffd23f'; c.fillRect(-9, -50, 18, 3);
      angryEyes(c, 2, -42, 0.7);
      // wind-up key
      c.save(); c.translate(-13, -24); c.scale(Math.cos(t * 8), 1);
      c.fillStyle = '#c8a040'; c.fillRect(-2, -3, 8, 6); ell(c, 8, -5, 4, 6); c.fill(); ell(c, 8, 5, 4, 6); c.fill();
      c.restore();
    } else if (key === 'garden') {
      // snail
      const sq = 1 + step * 0.05;
      c.fillStyle = '#c8d86a'; c.beginPath(); c.moveTo(-22, 0); c.quadraticCurveTo(-24, -10 * sq, -6, -10); c.lineTo(18, -10); c.quadraticCurveTo(26, -10, 26, 0); c.fill();
      c.strokeStyle = '#c8d86a'; c.lineWidth = 3; c.beginPath(); c.moveTo(16, -10); c.lineTo(20, -28); c.moveTo(22, -10); c.lineTo(28, -26); c.stroke();
      c.fillStyle = '#fff'; circle(c, 20, -29, 4); c.fill(); circle(c, 28, -27, 4); c.fill();
      c.fillStyle = '#1e1430'; circle(c, 21, -29, 2); c.fill(); circle(c, 29, -27, 2); c.fill();
      c.fillStyle = '#c86a2a'; circle(c, -4, -24, 18); c.fill();
      c.strokeStyle = '#7a3a1a'; c.lineWidth = 3; c.beginPath();
      for (let a = 0; a < TAU * 2.2; a += 0.2) { const r = 15 - a * 1.9; c.lineTo(-4 + Math.cos(a) * r, -24 + Math.sin(a) * r); } c.stroke();
      c.strokeStyle = '#1e1430'; c.lineWidth = 2; c.beginPath(); c.moveTo(16, -34); c.lineTo(22, -32); c.moveTo(32, -32); c.lineTo(26, -31); c.stroke();
    } else if (key === 'park') {
      // crab
      const claw = Math.sin(t * 9) * 0.3;
      c.strokeStyle = '#d8402a'; c.lineWidth = 3;
      for (let k = -1; k <= 1; k += 2) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(k * 10, -10); c.lineTo(k * (18 + i * 4), -2 + step * (i % 2 ? 2 : -2)); c.stroke(); }
      c.fillStyle = '#ff5a3a'; ell(c, 0, -16, 20, 12); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.25)'; ell(c, -4, -21, 10, 4); c.fill();
      for (let k = -1; k <= 1; k += 2) {
        c.save(); c.translate(k * 22, -24); c.rotate(k * claw);
        c.fillStyle = '#ff5a3a'; ell(c, 0, 0, 8, 6); c.fill();
        c.fillStyle = '#d8402a'; c.beginPath(); c.moveTo(k * 2, 0); c.lineTo(k * 10, -6); c.lineTo(k * 8, 2); c.fill();
        c.restore();
      }
      c.strokeStyle = '#d8402a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-5, -26); c.lineTo(-6, -34); c.moveTo(5, -26); c.lineTo(6, -34); c.stroke();
      angryEyes(c, 0, -36, 0.7);
    } else if (key === 'dream') {
      // gummy bear
      c.globalAlpha *= 0.92;
      c.fillStyle = '#ff4f8a';
      ell(c, -8, -4 - Math.max(0, step) * 3, 6, 5); c.fill(); ell(c, 8, -4 - Math.max(0, -step) * 3, 6, 5); c.fill();
      ell(c, 0, -18, 14, 13); c.fill();
      circle(c, 0, -38, 12); c.fill(); circle(c, -9, -48, 5); c.fill(); circle(c, 9, -48, 5); c.fill();
      ell(c, -14, -22, 4, 7, 0.5); c.fill(); ell(c, 14, -22, 4, 7, -0.5); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.45)'; ell(c, -5, -42, 3, 5, 0.3); c.fill(); ell(c, -6, -22, 3, 6, 0.3); c.fill();
      angryEyes(c, 2, -38, 0.6);
    } else {
      // rat
      c.strokeStyle = '#ff9ab0'; c.lineWidth = 3; c.beginPath(); c.moveTo(-16, -8); c.quadraticCurveTo(-34, -6 + step * 4, -38, -20); c.stroke();
      c.fillStyle = '#7a7890'; ell(c, -2, -13, 18, 12); c.fill();
      c.fillStyle = '#8a88a0'; c.beginPath(); c.moveTo(10, -22); c.quadraticCurveTo(30, -14, 28, -8); c.quadraticCurveTo(18, -4, 6, -6); c.fill();
      c.fillStyle = '#ff9ab0'; circle(c, 28, -9, 3); c.fill(); circle(c, 6, -26, 6); c.fill();
      c.fillStyle = '#7a7890'; c.fillRect(-12, -4, 5, 4 + step * 2); c.fillRect(6, -4, 5, 4 - step * 2);
      c.fillStyle = '#ff3a3a'; circle(c, 18, -16, 2.6); c.fill();
      c.strokeStyle = '#1e1430'; c.lineWidth = 2; c.beginPath(); c.moveTo(13, -21); c.lineTo(21, -18); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(26, -10); c.lineTo(36, -14); c.moveTo(26, -9); c.lineTo(37, -8); c.stroke();
    }
    c.restore();
  }

  function flyer(c, key, x, y, f, t) {
    c.save(); c.translate(x, y); c.scale(f, 1);
    const flap = Math.sin(t * 30);
    if (key === 'city') {
      // bat
      c.fillStyle = '#3a2a5a';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, -4); c.quadraticCurveTo(s * 20, -20 * flap - 10, s * 34, -6 * flap); c.quadraticCurveTo(s * 24, 0, s * 18, 4); c.quadraticCurveTo(s * 10, -2, 0, 4); c.fill(); }
      c.fillStyle = '#4a3a6a'; ell(c, 0, 0, 12, 11); c.fill();
      c.beginPath(); c.moveTo(-8, -8); c.lineTo(-6, -18); c.lineTo(-2, -9); c.moveTo(8, -8); c.lineTo(6, -18); c.lineTo(2, -9); c.fill();
      angryEyes(c, 0, -1, 0.6, '#ff3a3a');
    } else {
      const body = key === 'garden' ? '#ffd23f' : key === 'park' ? '#3ad0c0' : key === 'dream' ? '#7ad8ff' : '#b58ad8';
      c.fillStyle = 'rgba(230,245,255,0.75)';
      ell(c, -6, -14 - flap * 4, 12, 6 + flap * 3, -0.5); c.fill(); ell(c, 6, -14 - flap * 4, 12, 6 + flap * 3, 0.5); c.fill();
      c.fillStyle = body; ell(c, 0, 0, 14, 11); c.fill();
      if (key === 'garden') { c.fillStyle = '#1e1430'; c.fillRect(-6, -10, 4, 20); c.fillRect(2, -10, 4, 20); c.beginPath(); c.moveTo(-14, 0); c.lineTo(-20, 0); c.lineTo(-14, 3); c.fill(); }
      if (key === 'park') { c.fillStyle = '#2aa090'; c.fillRect(-26, -2, 16, 4); }
      angryEyes(c, 7, -2, 0.6);
    }
    c.restore();
  }

  function hopper(c, key, x, y, f, t, crouch) {
    c.save(); c.translate(x, y); c.scale(f, 1);
    const sq = crouch ? 0.8 : 1;
    if (key === 'house') {
      // angry bouncy ball
      c.scale(1 / sq, sq);
      c.fillStyle = '#ff4f6a'; circle(c, 0, -18, 18); c.fill();
      c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(0, -18, 18, -0.5, 0.5); c.lineTo(0, -18); c.fill(); c.beginPath(); c.arc(0, -18, 18, PI - 0.5, PI + 0.5); c.lineTo(0, -18); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; ell(c, -7, -27, 5, 3, -0.5); c.fill();
      angryEyes(c, 3, -20, 0.7);
    } else {
      // frog
      const col = key === 'city' ? '#8a9a7a' : key === 'park' ? '#6ad06a' : key === 'dream' ? '#b88aff' : '#4ac05a';
      c.scale(1 / sq, sq);
      c.fillStyle = U.mix(col, '#000000', 0.2); ell(c, -10, -6, 10, 6); c.fill(); ell(c, 10, -6, 10, 6); c.fill();
      c.fillStyle = col; ell(c, 0, -14, 18, 13); c.fill();
      circle(c, -8, -26, 7); c.fill(); circle(c, 8, -26, 7); c.fill();
      c.fillStyle = '#fff'; circle(c, -8, -27, 5); c.fill(); circle(c, 8, -27, 5); c.fill();
      c.fillStyle = '#1e1430'; circle(c, -7, -27, 2.4); c.fill(); circle(c, 9, -27, 2.4); c.fill();
      c.strokeStyle = '#1e1430'; c.lineWidth = 2; c.beginPath(); c.moveTo(-13, -33); c.lineTo(-4, -30); c.moveTo(13, -33); c.lineTo(4, -30); c.stroke();
      c.strokeStyle = U.mix(col, '#000000', 0.45); c.beginPath(); c.moveTo(-8, -12); c.quadraticCurveTo(0, -8, 8, -12); c.stroke();
      c.fillStyle = '#f0ffd8'; ell(c, 0, -8, 9, 5); c.fill();
    }
    c.restore();
  }

  function spitter(c, key, x, y, f, t, charge) {
    c.save(); c.translate(x, y); c.scale(f, 1);
    const k = 1 + (charge || 0) * 0.15;
    if (key === 'house') {
      // toy cannon with a face
      c.fillStyle = '#7a4a2a'; c.fillRect(-16, -12, 30, 12);
      c.fillStyle = '#40304a'; circle(c, -10, -4, 8); c.fill(); circle(c, 10, -4, 8); c.fill();
      c.save(); c.translate(0, -20); c.scale(k, k);
      c.fillStyle = '#5a5a7a'; c.beginPath(); c.roundRect(-14, -12, 36, 22, 10); c.fill();
      c.fillStyle = '#3a3a52'; ell(c, 22, -1, 4, 10); c.fill();
      angryEyes(c, 0, -2, 0.65);
      c.restore();
    } else if (key === 'city') {
      // grumpy fire hydrant
      c.save(); c.scale(k, k);
      c.fillStyle = '#e8343c'; c.beginPath(); c.roundRect(-12, -40, 24, 40, 6); c.fill();
      c.fillRect(-16, -4, 32, 4); c.fillRect(-16, -42, 32, 6);
      c.beginPath(); c.arc(0, -42, 10, PI, 0); c.fill();
      c.fillStyle = '#c0202a'; c.fillRect(10, -26, 10, 10);
      angryEyes(c, 0, -28, 0.6);
      c.restore();
    } else {
      // pea shooter plant in a pot
      c.fillStyle = '#c86a3a'; c.beginPath(); c.moveTo(-14, -16); c.lineTo(14, -16); c.lineTo(10, 0); c.lineTo(-10, 0); c.fill();
      c.fillStyle = '#a8502a'; c.fillRect(-16, -18, 32, 5);
      c.strokeStyle = '#3f9a45'; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(-6, -30, 0, -40); c.stroke();
      c.fillStyle = '#5ccf48'; ell(c, -10, -24, 8, 4, 0.5); c.fill();
      c.save(); c.translate(0, -46); c.scale(k, k);
      c.fillStyle = key === 'park' ? '#b06ad0' : key === 'dream' ? '#ff7ac8' : '#5ccf48'; circle(c, 0, 0, 14); c.fill();
      c.beginPath(); c.roundRect(8, -7, 14, 14, 4); c.fill();
      c.fillStyle = '#1e1430'; ell(c, 22, 0, 3, 6); c.fill();
      angryEyes(c, -2, -3, 0.6);
      c.restore();
    }
    c.restore();
  }

  function shot(c, key, x, y, t, back) {
    c.fillStyle = back ? '#ffd23f' : key === 'house' ? '#3a3a52' : key === 'city' ? '#6ac0ff' : key === 'dream' ? '#ff7ac8' : '#5ccf48';
    circle(c, x, y, 8); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.5)'; circle(c, x - 2, y - 3, 3); c.fill();
  }

  // ======================= BIG CHARACTERS =======================
  function teddy(c, x, y, s, t) {
    // Bobo the teddy bear! (Plut's best friend)
    c.save(); c.translate(x, y); c.scale(s || 1, s || 1);
    c.fillStyle = '#b07a4a';
    ell(c, -9, -6, 7, 6); c.fill(); ell(c, 9, -6, 7, 6); c.fill();       // feet
    ell(c, 0, -18, 13, 14); c.fill();                                     // body
    ell(c, -14, -22, 5, 8, 0.6); c.fill(); ell(c, 14, -22, 5, 8, -0.6); c.fill();   // arms
    circle(c, -10, -46, 6); c.fill(); circle(c, 10, -46, 6); c.fill();   // ears
    circle(c, 0, -38, 12); c.fill();                                      // head
    c.fillStyle = '#e8c49a'; ell(c, 0, -16, 8, 9); c.fill(); ell(c, 0, -34, 6, 5); c.fill(); circle(c, -10, -46, 3); c.fill(); circle(c, 10, -46, 3); c.fill();
    c.fillStyle = '#1e1430'; circle(c, -5, -40, 2); c.fill(); ell(c, 0, -36, 2.4, 1.6); c.fill();
    c.fillStyle = '#4ac8ff'; circle(c, 5, -40, 2.4); c.fill();          // button eye
    c.strokeStyle = '#7a4a2a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-3, -32); c.quadraticCurveTo(0, -30, 3, -32); c.stroke();
    c.fillStyle = '#ff4f6a'; c.beginPath(); c.moveTo(0, -27); c.lineTo(-7, -31); c.lineTo(-7, -23); c.closePath(); c.moveTo(0, -27); c.lineTo(7, -31); c.lineTo(7, -23); c.fill();
    c.restore();
  }

  function cat(c, x, y, f, t, pose) {
    // MR. WHISKERS, the grumpy cat who stole Bobo
    pose = pose || {};
    const sh = pose.shadow;
    const K = sh ? { a: '#1a1030', b: '#2a1a48', c: '#120a24', d: '#3a2a5e', w: '#4a3a70', eye: '#ff3a6a', pink: '#5a2a6a' } : { a: '#7a7a90', b: '#9a9ab0', c: '#5a5a6e', d: '#6a6a7e', w: '#ffffff', eye: '#c8f060', pink: '#ff9ab0' };
    c.save(); c.translate(x, y); c.scale(f * (pose.s || 1), pose.s || 1);
    const crouch = pose.crouch || 0, run = pose.run ? Math.sin(t * 16) : 0;
    c.translate(0, crouch * 10);
    // tail
    c.strokeStyle = K.d; c.lineWidth = 12; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-40, -40); c.bezierCurveTo(-80, -50, -70, -110 + Math.sin(t * 3) * 10, -50 + Math.sin(t * 2) * 10, -120); c.stroke();
    c.strokeStyle = K.c; c.lineWidth = 12; c.beginPath(); c.moveTo(-54 + Math.sin(t * 2) * 10, -116); c.lineTo(-50 + Math.sin(t * 2) * 10, -120); c.stroke();
    // legs
    c.fillStyle = K.c;
    c.beginPath(); c.roundRect(-34 + run * 8, -30, 18, 30, 8); c.fill(); c.beginPath(); c.roundRect(18 - run * 8, -30, 18, 30, 8); c.fill();
    // body
    c.fillStyle = K.a; ell(c, 0, -52, 50, 38 - crouch * 6); c.fill();
    c.fillStyle = K.b; ell(c, 14, -44, 26, 22); c.fill();
    c.strokeStyle = K.c; c.lineWidth = 4; c.lineCap = 'round';
    for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-30 + k * 14, -86); c.lineTo(-24 + k * 14, -70); c.stroke(); }
    // front legs
    c.fillStyle = K.a; c.beginPath(); c.roundRect(26 - run * 6, -40, 18, 40, 8); c.fill();
    c.fillStyle = K.w; ell(c, 36 - run * 6, -2, 11, 5); c.fill(); ell(c, -25 + run * 8, -2, 11, 5); c.fill();
    // claws when attacking
    if (pose.claw) {
      c.save(); c.translate(58, -60); c.rotate(-0.4 + pose.claw * 1.2);
      c.fillStyle = K.a; c.beginPath(); c.roundRect(-10, -12, 40, 20, 10); c.fill();
      c.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(28, -10 + k * 7); c.lineTo(42, -8 + k * 7); c.lineTo(28, -5 + k * 7); c.fill(); }
      c.restore();
    }
    // head
    c.save(); c.translate(38, -98 + crouch * 6);
    c.fillStyle = K.a;
    c.beginPath(); c.moveTo(-30, -12); c.lineTo(-24, -48); c.lineTo(-6, -26); c.fill();
    c.beginPath(); c.moveTo(30, -12); c.lineTo(24, -48); c.lineTo(6, -26); c.fill();
    c.fillStyle = K.pink; c.beginPath(); c.moveTo(-24, -20); c.lineTo(-21, -38); c.lineTo(-11, -25); c.fill(); c.beginPath(); c.moveTo(24, -20); c.lineTo(21, -38); c.lineTo(11, -25); c.fill();
    c.fillStyle = K.a; ell(c, 0, 0, 36, 30); c.fill();
    c.fillStyle = K.c; c.fillRect(-4, -30, 8, 12); c.fillRect(-14, -28, 6, 10); c.fillRect(8, -28, 6, 10);
    c.fillStyle = K.b; ell(c, 0, 12, 18, 13); c.fill();
    // eyes
    const dizzy = pose.dizzy;
    if (dizzy) {
      c.strokeStyle = '#1e1430'; c.lineWidth = 3;
      for (const ex of [-14, 14]) { c.beginPath(); for (let a = 0; a < TAU * 1.5; a += 0.3) c.lineTo(ex + Math.cos(a + t * 8) * a * 1.6, -4 + Math.sin(a + t * 8) * a * 1.6); c.stroke(); }
    } else {
      if (sh) { c.shadowColor = '#ff3a6a'; c.shadowBlur = 20; }
      c.fillStyle = K.eye; ell(c, -14, -4, 9, 8); c.fill(); ell(c, 14, -4, 9, 8); c.fill();
      c.shadowBlur = 0;
      c.fillStyle = '#1e1430'; ell(c, -13, -3, 2.5, 7); c.fill(); ell(c, 15, -3, 2.5, 7); c.fill();
      c.strokeStyle = '#3a3a4a'; c.lineWidth = 4; c.beginPath(); c.moveTo(-26, -16); c.lineTo(-6, -9); c.moveTo(26, -16); c.lineTo(6, -9); c.stroke();
    }
    c.fillStyle = '#ff7a9a'; c.beginPath(); c.moveTo(-5, 4); c.lineTo(5, 4); c.lineTo(0, 9); c.fill();
    c.strokeStyle = '#3a3a4a'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 9); c.lineTo(0, 13); c.moveTo(-9, 15); c.quadraticCurveTo(0, 19, 9, 15); c.stroke();
    if (pose.hiss) { c.fillStyle = '#7a1e2e'; ell(c, 0, 18, 9, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(-6, 12); c.lineTo(-4, 19); c.lineTo(-2, 12); c.moveTo(6, 12); c.lineTo(4, 19); c.lineTo(2, 12); c.fill(); }
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(-14, 10); c.lineTo(-40, 4); c.moveTo(-14, 14); c.lineTo(-40, 16); c.moveTo(14, 10); c.lineTo(40, 4); c.moveTo(14, 14); c.lineTo(40, 16); c.stroke();
    c.restore();
    // Bobo in a little sack on the cat's back
    if (pose.bobo) {
      c.save(); c.translate(-16, -86); c.rotate(-0.2); teddy(c, 0, 0, 0.8, t); c.restore();
      c.strokeStyle = '#c8a050'; c.lineWidth = 3; c.beginPath(); c.moveTo(-30, -100); c.lineTo(24, -66); c.stroke();
    }
    c.restore();
  }

  function gnome(c, x, y, f, t, pose) {
    // THE GARDEN GNOME (boss of the garden)
    pose = pose || {};
    c.save(); c.translate(x, y); c.scale(f * (pose.s || 1), pose.s || 1);
    const sq = pose.squash || 0;
    c.scale(1 + sq * 0.25, 1 - sq * 0.25);
    const walk = pose.walk ? Math.sin(t * 12) : 0;
    // boots
    c.fillStyle = '#5a3420';
    c.beginPath(); c.roundRect(-30 + walk * 6, -18, 30, 18, 8); c.fill(); c.beginPath(); c.roundRect(4 - walk * 6, -18, 32, 18, 8); c.fill();
    // body
    c.fillStyle = '#3a6ad0'; c.beginPath(); c.roundRect(-34, -84, 68, 70, 24); c.fill();
    c.fillStyle = '#5a3420'; c.fillRect(-34, -40, 68, 9); c.fillStyle = '#ffd23f'; c.fillRect(-7, -42, 14, 13);
    // arms with a shovel
    c.save(); c.translate(26, -64); c.rotate(-0.6 + (pose.swing || 0) * 2.2);
    c.fillStyle = '#3a6ad0'; c.beginPath(); c.roundRect(-6, -6, 30, 14, 7); c.fill();
    c.fillStyle = '#ffd5b5'; circle(c, 26, 1, 8); c.fill();
    c.fillStyle = '#9a6a3a'; c.fillRect(22, -50, 7, 90);
    c.fillStyle = '#aab0c0'; c.beginPath(); c.moveTo(14, 38); c.lineTo(38, 38); c.lineTo(34, 66); c.lineTo(26, 72); c.lineTo(18, 66); c.fill();
    c.restore();
    // face
    c.fillStyle = '#ffd5b5'; ell(c, 0, -104, 26, 24); c.fill();
    // beard
    c.fillStyle = '#f4f4f8';
    c.beginPath(); c.moveTo(-28, -104); c.quadraticCurveTo(-34, -40, 0, -36); c.quadraticCurveTo(34, -40, 28, -104); c.quadraticCurveTo(0, -84, -28, -104); c.fill();
    c.fillStyle = '#ff9a8a'; circle(c, 4, -102, 11); c.fill();   // big nose
    c.fillStyle = 'rgba(255,255,255,0.6)'; circle(c, 1, -106, 3); c.fill();
    if (pose.dizzy) {
      c.strokeStyle = '#1e1430'; c.lineWidth = 2.5;
      for (const ex of [-12, 16]) { c.beginPath(); for (let a = 0; a < TAU * 1.5; a += 0.3) c.lineTo(ex + Math.cos(a + t * 8) * a * 1.2, -116 + Math.sin(a + t * 8) * a * 1.2); c.stroke(); }
    } else angryEyes(c, 2, -116, 1);
    // hat
    c.fillStyle = '#e8343c';
    c.beginPath(); c.moveTo(-30, -118); c.quadraticCurveTo(-10, -150, 10 + Math.sin(t * 2) * 6, -196); c.quadraticCurveTo(20, -150, 30, -118); c.quadraticCurveTo(0, -126, -30, -118); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(-18, -124); c.quadraticCurveTo(-2, -150, 8, -184); c.lineTo(0, -130); c.fill();
    c.restore();
  }

  function vacuum(c, x, y, t, pose) {
    // THE SUCKINATOR 3000 (a giant angry vacuum cleaner)
    pose = pose || {};
    c.save(); c.translate(x, y);
    const shake = Math.sin(t * 40) * 2;
    c.translate(shake * 0.5, 0);
    // wheels
    c.fillStyle = '#2a2a3a'; circle(c, -70, -26, 26); c.fill(); circle(c, 70, -26, 26); c.fill();
    c.fillStyle = '#6a6a7a'; circle(c, -70, -26, 10); c.fill(); circle(c, 70, -26, 10); c.fill();
    // base (sucky mouth)
    c.fillStyle = '#c8303a'; c.beginPath(); c.roundRect(-110, -80, 230, 50, 20); c.fill();
    c.fillStyle = '#1a1020'; c.beginPath(); c.roundRect(60, -70, 64, 34, 12); c.fill();
    // brush spinning
    c.strokeStyle = '#ffd23f'; c.lineWidth = 3;
    for (let k = 0; k < 6; k++) { const a = t * 30 + k; c.beginPath(); c.moveTo(92, -53); c.lineTo(92 + Math.cos(a) * 14, -53 + Math.sin(a) * 14); c.stroke(); }
    // body
    c.fillStyle = '#e8434e'; c.beginPath(); c.roundRect(-80, -260, 130, 190, 30); c.fill();
    c.fillStyle = '#c8303a'; c.beginPath(); c.roundRect(-80, -150, 130, 80, [0, 0, 30, 30]); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-66, -246, 14, 160);
    // dust bag window
    c.fillStyle = 'rgba(80,60,60,0.8)'; c.beginPath(); c.roundRect(-60, -140, 90, 50, 12); c.fill();
    c.fillStyle = '#a89080'; for (let k = 0; k < 7; k++) { circle(c, -50 + ((k * 23 + t * 60) % 80), -110 + Math.sin(t * 9 + k) * 8, 4); c.fill(); }
    // handle
    c.fillStyle = '#3a3a4a'; c.fillRect(-20, -360, 16, 110); c.beginPath(); c.roundRect(-50, -380, 76, 24, 12); c.fill();
    // angry LED eyes
    c.fillStyle = '#1a1020'; c.beginPath(); c.roundRect(-66, -236, 104, 54, 16); c.fill();
    c.shadowColor = '#ff3030'; c.shadowBlur = 16;
    c.fillStyle = '#ff4a3a';
    c.beginPath(); c.moveTo(-54, -222); c.lineTo(-18, -210); c.lineTo(-22, -196); c.lineTo(-54, -204); c.fill();
    c.beginPath(); c.moveTo(26, -222); c.lineTo(-8, -210); c.lineTo(-4, -196); c.lineTo(26, -204); c.fill();
    c.shadowBlur = 0;
    // name plate
    c.fillStyle = '#ffd23f'; c.font = `800 15px ${LP.FONT}`; c.textAlign = 'center'; c.fillText('SUCKINATOR 3000', -15, -160);
    // suction swirls
    c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 3;
    for (let k = 0; k < 4; k++) { const r = ((t * 200 + k * 50) % 200); c.beginPath(); c.arc(124, -53, 220 - r, -0.5, 0.5); c.stroke(); }
    c.restore();
  }

  function swan(c, x, y, t, pose) {
    // THE ANGRY SWAN
    pose = pose || {};
    c.save(); c.translate(x, y);
    const flap = Math.sin(t * 9);
    // back wing
    c.fillStyle = '#d8dce8';
    c.beginPath(); c.moveTo(-30, -90); c.quadraticCurveTo(-90, -200 - flap * 50, -150, -120 - flap * 60); c.quadraticCurveTo(-90, -110, -40, -60); c.fill();
    // body
    c.fillStyle = '#f8f8ff'; ell(c, 0, -70, 90, 52); c.fill();
    c.beginPath(); c.moveTo(-80, -80); c.lineTo(-130, -110); c.lineTo(-90, -50); c.fill();
    // feet
    c.fillStyle = '#ff8a1a';
    c.beginPath(); c.moveTo(-20, -24); c.lineTo(-40 + Math.sin(t * 14) * 10, 0); c.lineTo(0, 0); c.fill();
    c.beginPath(); c.moveTo(20, -24); c.lineTo(10 - Math.sin(t * 14) * 10, 0); c.lineTo(50, 0); c.fill();
    // neck
    c.strokeStyle = '#f8f8ff'; c.lineWidth = 30; c.lineCap = 'round';
    c.beginPath(); c.moveTo(50, -90); c.bezierCurveTo(110, -110, 40, -190, 90, -230 + Math.sin(t * 6) * 6); c.stroke();
    // head
    c.save(); c.translate(100, -236 + Math.sin(t * 6) * 6);
    c.fillStyle = '#f8f8ff'; ell(c, 0, 0, 30, 24); c.fill();
    c.fillStyle = '#1e1430'; c.beginPath(); c.moveTo(14, -8); c.lineTo(30, -4); c.lineTo(30, 10); c.lineTo(14, 8); c.fill();
    const open = (Math.sin(t * 7) > 0.3 || pose.honk) ? 1 : 0;
    c.fillStyle = '#ff8a1a';
    c.beginPath(); c.moveTo(28, -6); c.lineTo(66, -2 - open * 6); c.lineTo(30, 4); c.fill();
    c.beginPath(); c.moveTo(30, 4); c.lineTo(62, 8 + open * 10); c.lineTo(28, 10); c.fill();
    c.fillStyle = '#fff'; circle(c, 4, -6, 7); c.fill(); c.fillStyle = '#e8203a'; circle(c, 7, -6, 3.5); c.fill();
    c.strokeStyle = '#1e1430'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-6, -18); c.lineTo(16, -10); c.stroke();
    c.restore();
    // front wing
    c.fillStyle = '#ffffff';
    c.beginPath(); c.moveTo(-10, -100); c.quadraticCurveTo(-40, -230 - flap * 60, -110, -170 - flap * 70); c.quadraticCurveTo(-70, -120, -20, -60); c.fill();
    c.strokeStyle = '#d8dce8'; c.lineWidth = 3;
    for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(-20 - k * 12, -80 - k * 10); c.quadraticCurveTo(-50 - k * 10, -140 - flap * 30, -80 - k * 6, -150 - flap * 50 + k * 10); c.stroke(); }
    c.restore();
  }

  function crib(c, x, y, s) {
    c.save(); c.translate(x, y); c.scale(s || 1, s || 1);
    c.fillStyle = '#f4e4ff'; c.fillRect(-90, -40, 180, 20);
    c.strokeStyle = '#e0c8f0'; c.lineWidth = 7;
    for (let k = -84; k <= 84; k += 21) { c.beginPath(); c.moveTo(k, -110); c.lineTo(k, 0); c.stroke(); }
    c.fillStyle = '#d8b8f0'; c.beginPath(); c.roundRect(-96, -120, 192, 14, 7); c.fill();
    c.fillRect(-100, -130, 12, 140); c.fillRect(88, -130, 12, 140);
    c.restore();
  }

  function crumbleColors(key) {
    return key === 'dream' ? ['#ff9ad8', '#ffffff', '#9ae8ff'] : key === 'city' ? ['#a0504a', '#7a3a35', '#c8706a'] : key === 'garden' ? ['#d0703a', '#a8502a'] : key === 'park' ? ['#8a8a7a', '#6a7a5a'] : ['#d89a50', '#6a3a1a'];
  }
  // a crumbly block (crack = 0..1, how close it is to breaking)
  function crumble(c, key, x, y, crack) {
    const T = LP.T;
    c.save(); c.translate(x, y);
    if (key === 'garden') {
      // clay flower pot
      c.fillStyle = '#c8653a'; c.beginPath(); c.moveTo(2, 8); c.lineTo(T - 2, 8); c.lineTo(T - 8, T - 2); c.lineTo(8, T - 2); c.fill();
      c.fillStyle = '#e07a48'; c.beginPath(); c.roundRect(0, 2, T, 12, 4); c.fill();
      c.fillStyle = '#4ac05a'; for (let k = 0; k < 3; k++) { ell(c, 12 + k * 12, 1, 4, 7, -0.3 + k * 0.3); c.fill(); }
    } else if (key === 'park') {
      c.fillStyle = '#8a8a7a'; c.beginPath(); c.roundRect(1, 1, T - 2, T - 2, 10); c.fill();
      c.fillStyle = '#9fd06a'; c.beginPath(); c.roundRect(1, 1, T - 2, 10, [10, 10, 0, 0]); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.12)'; circle(c, 16, 26, 6); c.fill(); circle(c, 32, 34, 4); c.fill();
    } else if (key === 'city') {
      c.fillStyle = '#5a2a28'; c.fillRect(0, 0, T, T);
      c.fillStyle = '#a0504a';
      for (let r = 0; r < 4; r++) for (let k = -1; k < 3; k++) c.fillRect(k * 24 + (r % 2) * 12 + 1, r * 12 + 1, 22, 10);
      c.fillStyle = '#7a8296'; c.fillRect(0, 0, T, 5);
    } else if (key === 'dream') {
      c.fillStyle = '#ff9ad8'; c.beginPath(); c.roundRect(1, 1, T - 2, T - 2, 14); c.fill();
      c.fillStyle = '#ffd0ef'; c.beginPath(); c.roundRect(5, 4, T - 10, 14, 7); c.fill();
      const cols = ['#ffffff', '#9ae8ff', '#fff27a', '#b08aff'];
      for (let k = 0; k < 9; k++) { c.fillStyle = cols[k % 4]; c.save(); c.translate(8 + (k * 37) % 32, 20 + (k * 23) % 22); c.rotate(k); c.fillRect(-3, -1, 6, 2.4); c.restore(); }
    } else {
      // a big cookie
      c.fillStyle = '#b8783a'; circle(c, T / 2, T / 2 + 1, T / 2); c.fill();
      c.fillStyle = '#d89a50'; circle(c, T / 2, T / 2 - 1, T / 2 - 2); c.fill();
      c.fillStyle = '#5a2a10';
      for (const [px, py] of [[14, 14], [30, 12], [22, 26], [34, 30], [12, 32]]) { circle(c, px, py, 3.5); c.fill(); }
    }
    if (crack > 0) {
      c.strokeStyle = 'rgba(40,10,0,0.75)'; c.lineWidth = 2.5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(T * 0.5, 2); c.lineTo(T * 0.42, T * 0.35); c.lineTo(T * 0.58, T * 0.55); c.lineTo(T * 0.45, T * 0.9);
      if (crack > 0.5) { c.moveTo(T * 0.42, T * 0.35); c.lineTo(T * 0.15, T * 0.45); c.moveTo(T * 0.58, T * 0.55); c.lineTo(T * 0.9, T * 0.62); }
      c.stroke();
    }
    c.restore();
  }
  function bubble(c, x, y, t, s) {
    const r = 22 * (s || 1);
    const g = c.createRadialGradient(x - 7, y - 8, 2, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(0.6, 'rgba(170,230,255,0.15)'); g.addColorStop(0.9, 'rgba(255,170,240,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0.7)');
    c.fillStyle = g; circle(c, x, y, r); c.fill();
    c.strokeStyle = `hsla(${(t * 80) % 360},90%,80%,0.8)`; c.lineWidth = 2; circle(c, x, y, r); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.9)'; ell(c, x - r * 0.4, y - r * 0.45, r * 0.25, r * 0.13, -0.6); c.fill();
  }
  function clockTower(c, x, bottom, t) {
    // the big clock tower behind the last boss fight
    c.fillStyle = '#2a2a5e'; c.fillRect(x - 260, bottom - 900, 520, 900);
    c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(x + 200, bottom - 900, 60, 900);
    c.fillStyle = '#33336e';
    for (let k = 0; k < 6; k++) { c.fillRect(x - 230 + k * 85, bottom - 330, 30, 110); }
    const cy = bottom - 560;
    const gl = c.createRadialGradient(x, cy, 0, x, cy, 300);
    gl.addColorStop(0, 'rgba(255,230,150,0.35)'); gl.addColorStop(1, 'rgba(255,230,150,0)');
    c.fillStyle = gl; c.fillRect(x - 300, cy - 300, 600, 600);
    c.fillStyle = '#c8a050'; circle(c, x, cy, 190); c.fill();
    c.fillStyle = '#fff4cc'; circle(c, x, cy, 172); c.fill();
    c.fillStyle = '#4a3a2a';
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.save(); c.translate(x + Math.cos(a) * 145, cy + Math.sin(a) * 145); c.rotate(a + PI / 2); c.fillRect(-4, -14, 8, 28); c.restore(); }
    c.strokeStyle = '#2a1e14'; c.lineCap = 'round';
    const m = t * 0.2, hr = t * 0.02;
    c.lineWidth = 14; c.beginPath(); c.moveTo(x, cy); c.lineTo(x + Math.cos(hr - PI / 2) * 90, cy + Math.sin(hr - PI / 2) * 90); c.stroke();
    c.lineWidth = 9; c.beginPath(); c.moveTo(x, cy); c.lineTo(x + Math.cos(m - PI / 2) * 135, cy + Math.sin(m - PI / 2) * 135); c.stroke();
    c.fillStyle = '#c8a050'; circle(c, x, cy, 16); c.fill();
  }

  return {
    clockTower, crumble, crumbleColors, bubble,
    PLUT, starShape, circle, ell, plut, milk, bottle, heart, duck, cage, checkpoint, finish, spring, fan, sign, platform, box,
    walker, flyer, hopper, spitter, shot, stunStars, teddy, cat, gnome, vacuum, swan, crib, angryEyes,
  };
})();
