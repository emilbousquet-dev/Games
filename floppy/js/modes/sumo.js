// ============================================================
//  FLOPPY PARTY — SUMO WRESTLING
//  Push everyone out of the ring! Step outside the rope circle
//  (or fall off the platform) and you're out. JUMP does a big
//  BELLY CHARGE, and punches push extra hard here.
//  Last one in the ring wins. First to 3.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.sumo = (function () {
  const RING = 4.2, TOP = 0.6, PLAT = 10, SHRINK_AT = 25;
  let self = null, ringR = RING, time = 0, rope = null, warned = false;

  function build() {
    ringR = RING; time = 0; warned = false;
    const S = FP.Stage;
    // sand floor, and the raised clay platform (the dohyo)
    S.island(0, -1, 0, 22, 2, 22, { grass: 0xe8d5a3, dirt: 0xc9a27e });
    S.block(0, TOP / 2, 0, PLAT, TOP, PLAT, 0xd9a86c);
    // the straw rope circle
    rope = FP.Look.mesh(new THREE.TorusGeometry(RING, 0.12, 8, 64), FP.Look.toon(0xf2e2a0), 0.02);
    rope.rotation.x = Math.PI / 2; rope.position.y = TOP + 0.05;
    S.add(rope);
    // two white start lines in the middle
    for (const x of [-0.9, 0.9]) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      l.rotation.x = -Math.PI / 2; l.position.set(x, TOP + 0.01, 0);
      S.add(l);
    }
    // colorful tassels on poles at the corners, lanterns and a crowd
    const tassel = [0x5cc44a, 0xff5a5f, 0xffffff, 0x2a2140];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([x, z], i) => {
      const pole = FP.Look.mesh(new THREE.CylinderGeometry(0.12, 0.14, 4, 10), FP.Look.toon(0xa0643a), 0.03);
      pole.position.set(x * (PLAT / 2 + 1), 2, z * (PLAT / 2 + 1));
      const t = FP.Look.mesh(new THREE.ConeGeometry(0.35, 0.9, 10), FP.Look.toon(tassel[i]), 0.03);
      t.position.set(x * (PLAT / 2 + 1), 3.6, z * (PLAT / 2 + 1)); t.rotation.x = Math.PI;
      S.add(pole, t);
      const lamp = FP.Props.lamp(0xffd08a); lamp.position.set(x * 9.5, 0, z * 9.5); S.add(lamp);
    });
    const fans = FP.Props.crowd(2, 12, 1.4); fans.position.set(0, 0, -9); S.add(fans);
    FP.Camera.setAngle(0.9, 0.62);
  }

  function spawn(i, n) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 4;
    return { x: Math.cos(a) * 2.2, y: TOP + 0.1, z: Math.sin(a) * 2.2, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) };
  }

  // a sumo belt (mawashi) around each wrestler's waist
  function dress(c) {
    if (c.sumoDressed) return;
    c.sumoDressed = true;
    const belt = FP.Look.mesh(new THREE.TorusGeometry(0.4, 0.09, 8, 24), FP.Look.toon(0x2a2140), 0.02);
    belt.rotation.x = Math.PI / 2; belt.position.y = -0.18;
    const flap = FP.Look.boxMesh(0.22, 0.3, 0.06, FP.Look.toon(0x2a2140), 0.015);
    flap.position.set(0, -0.35, 0.38);
    c.meshes.torso.add(belt, flap);
    c.punchPower = 1.6;
  }

  // JUMP is a belly charge in sumo
  function control(c, input, dt, playing) {
    dress(c);
    c.dashCool = (c.dashCool || 0) - dt;
    c.dashT = (c.dashT || 0) - dt;
    if (playing && input && input.jumpPressed && c.grounded && c.dashCool <= 0 && c.ko <= 0) {
      c.dashCool = 1.3; c.dashT = 0.35;
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      for (const b of c.bodies) { b.velocity.x += fx * 9; b.velocity.z += fz * 9; }
      c.expression = 'angry'; c.exprTimer = 0.6;
      FP.Audio.play('whoosh');
      input = Object.assign({}, input, { jumpPressed: false });
    }
    FP.Ragdoll.control(c, input || { x: 0, z: 0 }, dt);
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      // after a while the ring shrinks, so somebody has to get pushed out
      time += dt;
      if (time > SHRINK_AT) {
        if (!warned) { warned = true; FP.UI.big('SHRINK!', 1, 'The ring is getting smaller!'); if (FP.Net) FP.Net.banner('SHRINK!', 'The ring is getting smaller!'); FP.Audio.play('beep'); }
        ringR = Math.max(1.6, RING - (time - SHRINK_AT) * 0.08);
      }
      // belly charges bump people away
      for (const c of chars) {
        if (!(c.dashT > 0) || !c.alive) continue;
        const p = c.parts.torso.position;
        for (const o of chars) {
          if (o === c || !o.alive || o.bumpedBy === c) continue;
          const q = o.parts.torso.position, dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
          if (d < 1.15 && Math.abs(q.y - p.y) < 1) {
            o.bumpedBy = c; setTimeout(() => { o.bumpedBy = null; }, 400);
            for (const b of o.bodies) { b.velocity.x += (dx / (d || 1)) * 10; b.velocity.z += (dz / (d || 1)) * 10; b.velocity.y += 3; }
            o.stagger = 0.6; o.lastHitBy = c; o.lastHitTime = performance.now();
            FP.FX.word(q, 'OOF!', '#ff9a3c', 1.1);
            FP.Camera.shake(0.35);
            FP.Audio.play('bonk');
          }
        }
      }
    }
    if (rope) rope.scale.setScalar(ringR / RING);
    if (roundOver || dt === 0) return null;
    // outside the rope (or off the platform)? OUT!
    for (const c of chars) {
      if (!c.alive) continue;
      const p = c.parts.torso.position;
      const out = Math.hypot(p.x, p.z) > ringR + 0.2 && (c.grounded || p.y < TOP + 0.4);
      if (out || p.y < -3) { FP.FX.word(p, 'OUT!', '#ff5a5f', 1.3); game.eliminate(c, 'stepped out of the ring!'); }
    }
    return FP.Kit.lastStanding(chars);
  }

  // bot brain: stay in the middle, charge at people, push them out
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position;
    const r = Math.hypot(p.x, p.z);
    let tgt = null, td = Infinity;
    for (const o of chars) { if (o === c || !o.alive) continue; const d = o.parts.torso.position.distanceTo(p); if (d < td) { td = d; tgt = o; } }
    if (r > ringR - 1.1) {
      // too close to the rope: get back to the middle
      input.x = -p.x / (r || 1); input.z = -p.z / (r || 1);
    } else if (tgt) {
      const q = tgt.parts.torso.position;
      // go to the side of them that pushes them outward
      const qr = Math.hypot(q.x, q.z) || 1;
      const tx = q.x - (q.x / qr) * 0.6, tz = q.z - (q.z / qr) * 0.6;
      const d = Math.hypot(tx - p.x, tz - p.z) || 1;
      input.x = (tx - p.x) / d; input.z = (tz - p.z) / d;
      const face = Math.atan2(q.x - p.x, q.z - p.z) - c.yaw;
      const aligned = Math.abs(Math.atan2(Math.sin(face), Math.cos(face))) < 0.5;
      if (td < 3.2 && td > 1.2 && aligned && c.grounded && Math.random() < dt * 2.5) input.jumpPressed = true;
      if (td < 1.4 && Math.random() < dt * 3) input.punchPressed = true;
    }
    if (c.grabbedBy && Math.random() < dt * 6) input.jumpPressed = true;
    return true;
  }

  function hud() { return `Push everyone out of the ring! JUMP = belly charge${ringR < RING ? ' &nbsp; The ring is shrinking!' : ''}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#ffe0c2"/><path d="M10 58l50-16 50 16-50 18z" fill="#d9a86c" stroke="#2a2140" stroke-width="2"/><ellipse cx="60" cy="58" rx="34" ry="11" fill="none" stroke="#f2e2a0" stroke-width="3"/><ellipse cx="44" cy="46" rx="11" ry="12" fill="#ff9a3c" stroke="#2a2140" stroke-width="2"/><circle cx="44" cy="30" r="7" fill="#ff9a3c" stroke="#2a2140" stroke-width="2"/><path d="M34 50h20" stroke="#2a2140" stroke-width="4"/><ellipse cx="76" cy="46" rx="11" ry="12" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="76" cy="30" r="7" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><path d="M66 50h20" stroke="#2a2140" stroke-width="4"/><path d="M56 42h8M55 36l4 2M55 48l4-2" stroke="#2a2140" stroke-width="2" stroke-linecap="round"/></svg>';

  self = {
    id: 'sumo', name: 'Sumo Wrestling', roundsToWin: 3, minTotal: 2, removeOut: 1.5, song: 'tense', minZoom: 13, art: ART,
    desc: 'Push everyone out of the ring! JUMP does a big belly charge. Last one in the ring wins.',
    build, spawn, update, control, botThink, hud,
    visual: (dt, chars) => { for (const c of chars || []) dress(c); if (rope) rope.scale.setScalar(ringR / RING); }, // online friends see the belts too
    netState: () => ({ r: Math.round(ringR * 100) / 100 }),
    applyNetState: (st) => { ringR = st.r; },
  };
  return self;
})();
