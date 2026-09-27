// ============================================================
//  FLOPPY PARTY — BOTS (silly computer players)
//  A bot "presses buttons" just like a player would.
//  Modes can give bots their own ideas (like chasing a ball).
// ============================================================
window.FP = window.FP || {};

FP.Bots = (function () {
  const brains = new Map();

  function brain(c) {
    if (!brains.has(c)) brains.set(c, { target: null, think: 0, wander: Math.random() * 6, grabbing: 0, jump: false, punch: false, lastPos: null, stuck: 0, mood: Math.random() });
    return brains.get(c);
  }

  // is there floor a little ahead of this point? (so bots don't walk off edges)
  function floorAt(x, z, fromY) {
    const g = FP.Physics.groundBelow(new CANNON.Vec3(x, fromY + 1, z), 12, 0);
    return !!g && g.y > fromY - 3;
  }

  // steer toward a point, but steer away from edges
  function steer(c, tx, tz, out) {
    const p = c.parts.torso.position;
    let dx = tx - p.x, dz = tz - p.z;
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;
    const y = p.y - FP.Ragdoll.STAND;
    if (!floorAt(p.x + dx * 1.4, p.z + dz * 1.4, y)) {
      // edge ahead! try turning left or right, or go back toward the middle
      const opts = [[-dz, dx], [dz, -dx], [-dx, -dz]];
      const ok = opts.find(([ox, oz]) => floorAt(p.x + ox * 1.4, p.z + oz * 1.4, y));
      if (ok) [dx, dz] = ok; else { dx = -p.x; dz = -p.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    }
    out.x = dx; out.z = dz;
    return d;
  }

  // default brain: find someone, punch them, sometimes grab and throw them off
  function fight(c, chars, dt, input) {
    const b = brain(c);
    b.think -= dt;
    if (b.think <= 0 || !b.target || !b.target.alive) {
      b.think = 0.6 + Math.random() * 0.8;
      let best = null, bestD = Infinity;
      for (const o of chars) {
        if (o === c || !o.alive || (c.team !== undefined && o.team === c.team)) continue;
        const d = o.parts.torso.position.distanceTo(c.parts.torso.position) + (o.ko > 0 ? -2 : 0) + Math.random() * 2;
        if (d < bestD) { bestD = d; best = o; }
      }
      b.target = best;
    }
    if (!b.target) { steer(c, 0, 0, input); if (Math.hypot(c.parts.torso.position.x, c.parts.torso.position.z) < 2) { input.x = 0; input.z = 0; } return; }
    const tp = b.target.parts.torso.position;
    const d = steer(c, tp.x, tp.z, input);
    if (d < 1.4) {
      if (b.grabbing > 0) {
        // carry them away from the middle, then throw!
        b.grabbing -= dt;
        input.grab = true;
        const p = c.parts.torso.position;
        steer(c, p.x * 2 + 0.01, p.z * 2 + 0.01, input);
        if (b.grabbing <= 0) input.grab = false;
      } else if (Math.random() < dt * (b.target.ko > 0 ? 3 : 0.5)) {
        b.grabbing = 1.2 + Math.random();
        input.grab = true;
      } else if (Math.random() < dt * 3.2) {
        input.punchPressed = true;
      }
      if (d < 0.9 && !input.grab) { input.x *= 0.2; input.z *= 0.2; }
    }
    unstick(c, b, dt, input);
  }

  // stuck against something? jump!
  function unstick(c, b, dt, input) {
    const p = c.parts.torso.position;
    if (b.lastPos) {
      const moved = Math.hypot(p.x - b.lastPos.x, p.z - b.lastPos.z);
      b.stuck = moved < dt * 0.8 && Math.hypot(input.x, input.z) > 0.5 ? b.stuck + dt : 0;
    }
    b.lastPos = { x: p.x, z: p.z };
    if (b.stuck > 0.6 && c.grounded) { input.jumpPressed = true; b.stuck = 0; }
    if (c.grabbedBy && Math.random() < dt * 6) input.jumpPressed = true; // wriggle free!
  }

  function think(c, chars, dt, mode) {
    const input = { x: 0, z: 0, jump: false, jumpPressed: false, punchPressed: false, grab: false };
    if (!c.alive || c.ko > 0) return input;
    if (mode && mode.botThink && mode.botThink(c, chars, dt, input, { steer, brain: brain(c), unstick: (i) => unstick(c, brain(c), dt, i) })) return input;
    fight(c, chars, dt, input);
    return input;
  }

  function reset() { brains.clear(); }

  return { think, reset, steer };
})();
