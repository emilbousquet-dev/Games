// ============================================================
//  ATLANTIS DIVER — THE DIVER (that's you!)
// ============================================================
AT.Diver = (function () {
  const U = AT.U, M = AT.PX_PER_M;
  const RADIUS = 15;
  const D = {
    x: 0, y: 0, vx: 0, vy: 0, face: 1, faceS: 1, angle: -1.4, look: 0, kick: 0,
    air: 45, hurtT: 0, cool: 0, breathT: 2, bag: [], bolts: [], atSurface: true, overDepth: 0, boosting: false,
  };

  function reset(x, y) {
    Object.assign(D, { x, y, vx: 0, vy: 0, face: -1, faceS: -1, angle: -1.4, look: Math.PI, hurtT: 0, cool: 0, bolts: [] });
    D.air = maxAir();
  }
  const maxAir = () => AT.Shop.val('air');
  const depth = () => Math.max(0, D.y / M);

  function update(dt, t, ctrl) {
    const s = AT.Input.s;
    const mx = ctrl ? s.mx : 0, my = ctrl ? s.my : 0;
    const fins = AT.Shop.val('fins');
    D.boosting = ctrl && s.boost && (mx || my);
    const maxV = 175 * fins * (D.boosting ? 1.55 : 1);
    const acc = 720 * fins * (D.boosting ? 1.4 : 1);
    D.vx += mx * acc * dt; D.vy += my * acc * dt;
    const drag = Math.exp(-dt * (mx || my ? 1.4 : 2.6));
    D.vx *= drag; D.vy *= drag;
    if (!mx && !my) D.vy -= 12 * dt;          // you float up very slowly
    const sp = Math.hypot(D.vx, D.vy);
    if (sp > maxV) { D.vx *= maxV / sp; D.vy *= maxV / sp; }
    D.x += D.vx * dt; D.y += D.vy * dt;
    // the surface: you float on the waves
    const top = 18 + AT.Render.waveY(D.x, t);
    if (D.y < top) { D.y = U.lerp(D.y, top, Math.min(1, dt * 10)); if (D.vy < 0) D.vy *= 0.5; }
    D.atSurface = D.y < top + 14;
    const hit = AT.World.collide(D, RADIUS);
    if (hit) {
      const vn = D.vx * hit.nx + D.vy * hit.ny;
      if (vn < 0) { D.vx -= vn * hit.nx * 1.2; D.vy -= vn * hit.ny * 1.2; }
      if (vn < -120) AT.Render.dust(D.x - hit.nx * RADIUS, D.y - hit.ny * RADIUS, 3);
    }
    D.x = U.clamp(D.x, RADIUS, AT.World.W - RADIUS);

    // turning around, leaning, kicking
    if (Math.abs(D.vx) > 25) D.face = Math.sign(D.vx);
    D.faceS = U.lerp(D.faceS, D.face, Math.min(1, dt * 12));
    const sp2 = Math.hypot(D.vx, D.vy);
    const target = sp2 > 55 ? U.clamp(Math.atan2(D.vy, Math.abs(D.vx)), -1.45, 1.45) : -1.25;
    D.angle += U.angleDiff(D.angle, target) * Math.min(1, dt * (sp2 > 55 ? 7 : 3));
    D.kick += dt * (2.2 + sp2 * 0.035);
    // where the lamp and harpoon point
    let aim = D.face > 0 ? 0 : Math.PI;
    if (mx || my) aim = Math.atan2(my, mx);
    else if (sp2 > 55) aim = Math.atan2(D.vy, D.vx);
    D.look += U.angleDiff(D.look, aim) * Math.min(1, dt * 8);

    // air
    D.overDepth = Math.max(0, depth() - AT.Shop.val('suit'));
    if (D.atSurface) {
      D.air = Math.min(maxAir(), D.air + maxAir() * 0.6 * dt);
    } else {
      let use = D.boosting ? 2.4 : 1;
      if (D.overDepth > 0) use += 4;
      D.air -= use * dt;
    }
    D.hurtT = Math.max(0, D.hurtT - dt);
    D.cool = Math.max(0, D.cool - dt);

    // breathing out bubbles
    D.breathT -= dt * (D.boosting ? 1.8 : 1);
    if (D.breathT <= 0 && !D.atSurface) {
      D.breathT = U.rand(2.2, 3.2);
      const h = head();
      AT.Render.bubbles(h.x, h.y, U.randInt(4, 7), 3);
      AT.Audio.bubbles();
    }
    if (ctrl && s.fireP) fire();
    updateBolts(dt);
  }

  function head() {
    const a = D.angle, f = D.faceS;
    return { x: D.x + Math.cos(a) * 26 * f, y: D.y + Math.sin(a) * 26 };
  }

  // ---------- the harpoon ----------
  function fire() {
    if (D.cool > 0) return;
    D.cool = AT.Shop.val('harpoon').reload;
    const a = D.look, h = head();
    D.bolts.push({ x: h.x, y: h.y, vx: Math.cos(a) * 760, vy: Math.sin(a) * 760, life: 0.62, a });
    D.vx -= Math.cos(a) * 50; D.vy -= Math.sin(a) * 50;
    AT.Audio.harpoon();
    AT.Render.bubbles(h.x, h.y, 3, 2);
  }
  function updateBolts(dt) {
    for (let i = D.bolts.length - 1; i >= 0; i--) {
      const b = D.bolts[i];
      const nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
      b.life -= dt;
      const wall = AT.World.ray(b.x, b.y, nx, ny);
      if (wall) {
        if (wall.ch === '%') {
          AT.World.breakTile(wall.tx, wall.ty);
          AT.Render.shards(wall.tx * 48 + 24, wall.ty * 48 + 24, 22, [220, 210, 190]);
          AT.Render.dust(wall.tx * 48 + 24, wall.ty * 48 + 24, 10, [200, 190, 170]);
          AT.Audio.crumble();
          AT.Game.onBreak(wall.tx, wall.ty);
        } else {
          AT.Render.dust(wall.x, wall.y, 3);
          AT.Render.sparks(wall.x, wall.y, 4, [200, 240, 255], 60);
          AT.Audio.clink();
        }
        D.bolts.splice(i, 1); continue;
      }
      b.x = nx; b.y = ny;
      if (AT.Creatures.hitBolt(b)) { D.bolts.splice(i, 1); continue; }
      if (b.life <= 0) D.bolts.splice(i, 1);
    }
  }

  function hurt(amount, fromX, fromY) {
    if (D.hurtT > 0) return false;
    D.hurtT = 1.2;
    D.air -= amount;
    const dx = D.x - fromX, dy = D.y - fromY, d = Math.hypot(dx, dy) || 1;
    D.vx += (dx / d) * 320; D.vy += (dy / d) * 320;
    AT.Render.bubbles(D.x, D.y, 14, 10);
    AT.Render.text(D.x, D.y - 30, '-' + Math.round(amount) + ' air', '#ff9a9a', 20);
    AT.Audio.ouch();
    AT.Input.rumble(0.7, 220);
    AT.Game.shake(8);
    if (!D.tipHurt) { D.tipHurt = true; AT.Game.toast('Ouch! Stun creatures with your harpoon: Space', '#ffe08a'); }
    return true;
  }

  // ---------- drawing ----------
  function draw(g, t) {
    // harpoon bolts
    for (const b of D.bolts) {
      g.save(); g.translate(b.x, b.y); g.rotate(b.a);
      g.strokeStyle = 'rgba(180,250,255,0.35)'; g.lineWidth = 6; g.beginPath(); g.moveTo(-40, 0); g.lineTo(0, 0); g.stroke();
      g.strokeStyle = '#d8e4ee'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-22, 0); g.lineTo(4, 0); g.stroke();
      g.fillStyle = '#5ef0ff'; g.beginPath(); g.moveTo(2, -5); g.lineTo(12, 0); g.lineTo(2, 5); g.fill();
      g.restore();
    }
    if (D.hurtT > 0 && Math.floor(D.hurtT * 14) % 2 === 0) g.globalAlpha = 0.45;
    drawDiver(g, D.x, D.y, D.faceS, D.angle, D.kick, Math.hypot(D.vx, D.vy));
    g.globalAlpha = 1;
  }

  // the diver, facing right, head at +x. Also used on the title screen.
  function drawDiver(g, x, y, faceS, angle, kick, speed) {
    g.save();
    g.translate(x, y);
    g.scale(faceS >= 0 ? Math.max(0.15, faceS) : Math.min(-0.15, faceS), 1);
    g.rotate(angle);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const suit = '#1d4a63', suitDark = '#123246', stripe = '#ff8a3d', fin = '#ffb03a', finDark = '#d9772a';
    const leg = (a, dark) => {
      g.save(); g.translate(-13, 3); g.rotate(Math.PI + a);
      g.strokeStyle = dark ? suitDark : suit; g.lineWidth = 8.5;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(13, 0); g.lineTo(25, a * 6); g.stroke();
      g.translate(25, a * 6); g.rotate(Math.sin(kick * Math.PI * 2 - 0.9) * 0.35 * (dark ? -1 : 1));
      g.fillStyle = dark ? finDark : fin;
      g.beginPath(); g.moveTo(-2, -4.5); g.lineTo(20, -8); g.quadraticCurveTo(24, 0, 20, 8); g.lineTo(-2, 4.5); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(3, 0); g.lineTo(20, 0); g.stroke();
      g.restore();
    };
    const k = Math.sin(kick * Math.PI * 2) * 0.32;
    // far leg and arm (darker)
    leg(-k, true);
    const paddle = speed < 90;
    const arm = (dark) => {
      g.save(); g.translate(10, dark ? -1 : 3);
      g.strokeStyle = dark ? suitDark : suit; g.lineWidth = 6.5;
      let ex, ey, hx, hy;
      if (!paddle) { ex = 14; ey = 2; hx = 27; hy = 4; }
      else {
        const p = Math.sin(kick * Math.PI + (dark ? 1.5 : 0)) * 0.9;
        ex = Math.cos(0.9 + p) * 11; ey = Math.sin(0.9 + p) * 11;
        hx = ex + Math.cos(0.2 + p) * 11; hy = ey + Math.sin(0.2 + p) * 11;
      }
      g.beginPath(); g.moveTo(0, 0); g.lineTo(ex, ey); g.lineTo(hx, hy); g.stroke();
      g.fillStyle = dark ? '#2a2f36' : '#3a414a'; g.beginPath(); g.arc(hx, hy, 3.8, 0, Math.PI * 2); g.fill();
      g.restore();
    };
    arm(true);
    // air tank
    const tg = g.createLinearGradient(0, -19, 0, -9);
    tg.addColorStop(0, '#ffe07a'); tg.addColorStop(0.5, '#f2b52a'); tg.addColorStop(1, '#b77d12');
    g.fillStyle = tg; U.rr(g, -19, -19, 30, 11, 5.5); g.fill();
    g.fillStyle = '#6b7480'; g.fillRect(10, -17, 5, 6);
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-8, -19, 3, 11);
    // body
    const bg = g.createLinearGradient(0, -10, 0, 11);
    bg.addColorStop(0, '#2c6a8a'); bg.addColorStop(0.5, suit); bg.addColorStop(1, suitDark);
    g.fillStyle = bg; g.beginPath(); g.ellipse(0, 1, 19, 10, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = stripe; g.beginPath(); g.ellipse(1, 1, 16, 2.4, 0, 0, Math.PI * 2); g.fill();
    // belt
    g.fillStyle = '#26262c'; g.fillRect(-11, -8, 4, 18);
    g.fillStyle = '#c9ccd2'; g.fillRect(-11, -1, 4, 4);
    leg(k, false);
    // hose from the tank to the mouth
    g.strokeStyle = '#2b2f36'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(14, -14); g.quadraticCurveTo(32, -18, 30, 5); g.stroke();
    // head
    g.fillStyle = '#163042'; g.beginPath(); g.arc(24, -1, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f0c29a'; g.beginPath(); g.arc(28, 1, 5.5, -1, 1.6); g.fill();
    // mask
    const mg = g.createLinearGradient(26, -7, 34, 3);
    mg.addColorStop(0, '#c8fbff'); mg.addColorStop(0.5, '#4cc6e0'); mg.addColorStop(1, '#1a6d8a');
    g.fillStyle = '#202830'; U.rr(g, 25.5, -8, 10, 10, 3); g.fill();
    g.fillStyle = mg; U.rr(g, 27, -6.8, 7.5, 7.5, 2.5); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(28.5, -5); g.lineTo(31, -5.5); g.stroke();
    g.strokeStyle = '#202830'; g.lineWidth = 2; g.beginPath(); g.moveTo(25, -5); g.lineTo(16, -4); g.stroke();
    // regulator
    g.fillStyle = '#3d444d'; g.beginPath(); g.arc(31, 5, 3.2, 0, Math.PI * 2); g.fill();
    // head lamp
    g.fillStyle = '#4b535e'; U.rr(g, 19, -13.5, 9, 5.5, 2); g.fill();
    g.fillStyle = '#fff6c8'; g.fillRect(27, -12.8, 2.2, 4);
    arm(false);
    g.restore();
  }

  return {
    D, reset, update, draw, drawDiver, hurt, head, depth, maxAir, RADIUS,
  };
})();
