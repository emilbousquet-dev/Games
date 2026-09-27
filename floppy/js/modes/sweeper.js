// ============================================================
//  FLOPPY PARTY — SPIN SWEEPER
//  A giant bar spins around the round platform. JUMP over it!
//  It gets faster, and later a second bar joins in, spinning
//  the other way. Last one standing wins. First to 3.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.sweeper = (function () {
  const R = 7, BAR_H = 0.34, BAR_Y = 0.32;
  let bars = [], time = 0, hitCool = new Map();

  function makeBar(color, len) {
    // the bar is a kinematic box pivoting around the middle (the physics body spins by itself)
    const b = FP.Stage.block(0, BAR_Y, 0, len, BAR_H, BAR_H, color, { kinematic: true, unique: true });
    // stripes to make the spinning easy to see
    for (let i = -3; i <= 3; i++) {
      if (!i) continue;
      const s = FP.Look.boxMesh(0.25, BAR_H + 0.02, BAR_H + 0.02, FP.Look.toon(0xffffff), 0);
      s.position.x = i * len / 8;
      b.mesh.add(s);
    }
    return { body: b.body, mesh: b.mesh, angle: 0, speed: 0, len, on: false };
  }

  function build() {
    time = 0; hitCool = new Map();
    const S = FP.Stage;
    // a round platform made of a few overlapping islands
    S.island(0, -1, 0, R * 2, 2, R * 1.1);
    S.island(0, -1, 0, R * 1.1, 2, R * 2);
    S.island(0, -1, 0, R * 1.6, 2, R * 1.6);
    // the middle pole
    const pole = S.block(0, 0.9, 0, 0.9, 1.8, 0.9, 0xff5a5f);
    void pole;
    const cap = FP.Look.mesh(new THREE.SphereGeometry(0.6, 16, 12), FP.Look.toon(0xffcf33), 0.03);
    cap.position.y = 2;
    S.add(cap);
    bars = [makeBar(0xff9a3c, R * 2 - 0.4), makeBar(0x9b6bff, R * 1.4)];
    bars[1].mesh.position.y = -40;
    bars[0].on = true; bars[0].speed = 1.1;
    bars[1].body.position.y = -40; // hidden until it joins in
    bars[1].angle = Math.PI / 2;
    FP.Camera.setAngle(0.85, 0.7);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 4.3, 4.3, 0.9); }

  // keep the bars turning (called every physics step, so they push people smoothly)
  function beforeStep(dt) {
    for (const bar of bars) {
      if (!bar.on) { bar.body.angularVelocity.set(0, 0, 0); continue; }
      bar.angle += bar.speed * dt;
      bar.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), bar.angle);
      bar.body.angularVelocity.set(0, bar.speed, 0);
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      // faster and faster
      bars[0].speed = Math.min(3.2, 1.1 + time * 0.035);
      if (time > 22 && !bars[1].on) {
        bars[1].on = true; bars[1].body.position.y = BAR_Y + 0.02; bars[1].speed = -0.9;
        FP.UI.big('BAR 2!', 1, 'A second bar, spinning the other way!');
        if (FP.Net) FP.Net.banner('BAR 2!', 'A second bar, spinning the other way!');
      }
      if (bars[1].on) bars[1].speed = -Math.min(2.4, 0.9 + (time - 22) * 0.03);
      // get whacked by a bar: fly off with a BONK (the bar also pushes you by itself)
      for (const c of chars) {
        if (!c.alive) continue;
        const cool = (hitCool.get(c) || 0) - dt;
        hitCool.set(c, cool);
        if (cool > 0) continue;
        const p = c.parts.torso.position;
        const r = Math.hypot(p.x, p.z);
        for (const bar of bars) {
          if (!bar.on || r > bar.len / 2 + 0.3 || r < 0.6) continue;
          const barY = bar.body.position.y;
          const lowest = Math.min(c.parts.legs[0].position.y, c.parts.legs[1].position.y) - 0.1;
          const highest = c.parts.head.position.y + 0.3;
          if (barY + BAR_H / 2 < lowest || barY - BAR_H / 2 > highest) continue;
          // how far is the player from the bar's line? (the bar lies along the world angle -bar.angle)
          const da = Math.atan2(p.z, p.x) + bar.angle;
          const along = Math.abs(Math.sin(da)) * r;
          if (along < 0.45) {
            hitCool.set(c, 0.9);
            // the bar pushes you the way it's moving, and a bit outward
            const w = Math.sign(bar.speed);
            const side = { x: (p.z / (r || 1)) * w, z: (-p.x / (r || 1)) * w };
            const out = { x: p.x / (r || 1), z: p.z / (r || 1) };
            for (const bd of c.bodies) { bd.velocity.x += side.x * 9 + out.x * 5; bd.velocity.z += side.z * 9 + out.z * 5; bd.velocity.y += 6; }
            FP.Ragdoll.knockOut(c, 1.4);
            FP.FX.word(p, 'BONK!', '#ff9a3c', 1.2);
            FP.Camera.shake(0.4);
            FP.Audio.play('bonk');
            break;
          }
        }
      }
    }
    if (roundOver || dt === 0) return null;
    FP.Kit.fallOut(chars, game, -5);
    return FP.Kit.lastStanding(chars);
  }

  // how long until this bar reaches me? (seconds). The bar has 2 ends, so it comes by every half turn
  function arrival(bar, p) {
    if (!bar.on || !bar.speed) return Infinity;
    const a = Math.atan2(p.z, p.x), beta = -bar.angle; // the bar's world angle goes DOWN when speed is positive
    let diff = bar.speed > 0 ? beta - a : a - beta;
    diff = ((diff % Math.PI) + Math.PI) % Math.PI;
    const r = Math.max(0.5, Math.hypot(p.x, p.z));
    return Math.max(0, diff - 0.45 / r) / Math.abs(bar.speed);
  }

  // bot brain: stay a safe distance from the middle, jump over the low bar, and push others into it
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain, p = c.parts.torso.position;
    const r = Math.hypot(p.x, p.z);
    b.wander += dt * 0.3;
    const wantR = 3.8 + Math.sin(b.wander + c.index) * 1.2;
    const a = Math.atan2(p.z, p.x) + 0.25;
    tools.steer(c, Math.cos(a) * wantR, Math.sin(a) * wantR, input);
    if (Math.abs(r - wantR) < 0.8) { input.x *= 0.4; input.z *= 0.4; }
    FP.Kit.punchNearby(c, chars, dt, input, tools, 1.3, 2);
    // the low bar: jump just in time (bots with slow reactions jump a bit earlier to make up for it)
    const lead = 0.22 + tools.skill.reaction * 0.9;
    const t0 = Math.min(arrival(bars[0], p), r < bars[1].len / 2 + 0.3 ? arrival(bars[1], p) : Infinity);
    if (t0 < lead && c.grounded) input.jumpPressed = true;
    if (c.grabbedBy && Math.random() < dt * 6) input.jumpPressed = true;
    return true;
  }

  function hud() { return `Jump over the bar! Speed ${Math.round((bars[0] ? bars[0].speed : 1) * 10)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><ellipse cx="60" cy="52" rx="48" ry="20" fill="#7ad35e" stroke="#2a2140" stroke-width="2.5"/><path d="M18 58l84-14" stroke="#ff9a3c" stroke-width="7" stroke-linecap="round"/><path d="M18 58l84-14" stroke="#2a2140" stroke-width="1.5" stroke-dasharray="5 7" opacity=".5"/><rect x="55" y="34" width="10" height="18" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="60" cy="32" r="6" fill="#ffcf33" stroke="#2a2140" stroke-width="2"/><ellipse cx="34" cy="38" rx="5" ry="6" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="34" cy="29" r="4" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><path d="M28 46q6 4 12 0" stroke="#2a2140" stroke-width="1.5" fill="none" opacity=".5"/></svg>';

  return {
    id: 'sweeper', name: 'Spin Sweeper', roundsToWin: 3, minTotal: 2, removeOut: 1.5, song: 'tense', minZoom: 16, art: ART,
    desc: 'A giant bar spins around the platform. Jump over it, and push others into it!',
    build, spawn, update, beforeStep, botThink, hud,
    netState: () => bars.map((b) => [Math.round(b.angle * 100) / 100, b.on ? 1 : 0]),
    applyNetState: (s) => { s.forEach(([a, on], i) => { if (bars[i]) { bars[i].angle = a; bars[i].on = !!on; } }); },
  };
})();
