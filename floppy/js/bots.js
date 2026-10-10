// ============================================================
//  FLOPPY PARTY — BOTS (silly computer players)
//  A bot "presses buttons" just like a player would.
//  Modes can give bots their own ideas (like chasing a ball).
//  Then a "humanizer" makes the button presses look like a
//  real person: a little late, a little wobbly, with short
//  pauses, and a personality. How good they are depends on
//  the skill level: easy, normal or hard.
// ============================================================
window.FP = window.FP || {};

FP.Bots = (function () {
  const brains = new Map();

  // how good each skill level is
  const SKILLS = {
    easy: { name: 'Easy', reaction: 0.38, aim: 0.5, speed: 0.72, punchGap: 0.6, punchKeep: 0.55, pause: 0.2, wriggle: 2.5, edge: 1.0, backOff: 0, grab: 0.5, silly: 0.1, think: 1.3 },
    normal: { name: 'Normal', reaction: 0.2, aim: 0.26, speed: 0.88, punchGap: 0.38, punchKeep: 0.85, pause: 0.09, wriggle: 4.5, edge: 1.4, backOff: 0.35, grab: 1, silly: 0.04, think: 1 },
    hard: { name: 'Hard', reaction: 0.09, aim: 0.09, speed: 1, punchGap: 0.33, punchKeep: 1, pause: 0.025, wriggle: 7, edge: 1.7, backOff: 0.7, grab: 1.5, silly: 0.012, think: 0.7 },
  };
  const SKILL_ORDER = ['easy', 'normal', 'hard'];
  const PERSONALITIES = ['brave', 'careful', 'goofy'];

  function brain(c) {
    if (!brains.has(c)) {
      brains.set(c, {
        target: null, think: 0, wander: Math.random() * 6, grabbing: 0, lastPos: null, stuck: 0, mood: Math.random(),
        personality: PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)],
        seed: Math.random() * 100, clock: 0, queue: [], held: null, pauseT: 0, punchReady: 0,
        circle: Math.random() < 0.5 ? 1 : -1, backT: 0, hurtBy: null, hurtT: -99, seenHit: 0, throwDir: null,
      });
    }
    return brains.get(c);
  }
  function skillOf(c) { return SKILLS[c.botSkill] || SKILLS.normal; }

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
    const look = c.isBot ? skillOf(c).edge : 1.4;
    if (!floorAt(p.x + dx * look, p.z + dz * look, y)) {
      // edge ahead! try turning left or right, or go back toward the middle
      const opts = [[-dz, dx], [dz, -dx], [-dx, -dz]];
      const ok = opts.find(([ox, oz]) => floorAt(p.x + ox * 1.4, p.z + oz * 1.4, y));
      if (ok) [dx, dz] = ok; else { dx = -p.x; dz = -p.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    }
    out.x = dx; out.z = dz;
    return d;
  }

  // which way is the closest edge? (to throw people off). null if there is no edge nearby
  function nearestEdge(c) {
    const p = c.parts.torso.position, y = p.y - FP.Ragdoll.STAND;
    let best = null, bd = Infinity;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
      for (let r = 1.5; r <= 9; r += 1.5) {
        if (!floorAt(p.x + dx * r, p.z + dz * r, y)) { if (r < bd) { bd = r; best = { x: dx, z: dz }; } break; }
      }
    }
    return best;
  }

  function enemies(c, chars) {
    // (someone playing dead is left alone for a moment)
    return chars.filter((o) => o !== c && o.alive && !(c.team !== undefined && o.team === c.team) && !(o.playDead && o.ko > 0));
  }

  // default brain: pick someone, circle around them, punch, grab and throw them off
  function fight(c, chars, dt, input) {
    const b = brain(c), sk = skillOf(c);
    const p = c.parts.torso.position;
    b.think -= dt;
    const revenge = b.hurtBy && b.hurtBy.alive && b.clock - b.hurtT < 4;
    if (b.think <= 0 || !b.target || !b.target.alive) {
      b.think = (0.6 + Math.random() * 0.8) * sk.think;
      let best = null, bestD = Infinity;
      for (const o of enemies(c, chars)) {
        let d = o.parts.torso.position.distanceTo(p) + Math.random() * 2;
        if (o.ko > 0) d -= b.personality === 'careful' ? 3 : 2; // knocked out people are easy to throw
        if (revenge && o === b.hurtBy) d -= b.personality === 'brave' ? 5 : 3; // "hey, you hit me!"
        if (b.personality === 'goofy') d += Math.random() * 4;
        if (d < bestD) { bestD = d; best = o; }
      }
      b.target = best;
    }
    if (!b.target) {
      steer(c, 0, 0, input);
      if (Math.hypot(p.x, p.z) < 2) { input.x = 0; input.z = 0; }
      unstick(c, b, dt, input);
      return;
    }
    const tp = b.target.parts.torso.position;
    const d = steer(c, tp.x, tp.z, input);

    if (b.grabbing > 0 && (c.grab[0] || c.grab[1] || b.grabbing > 0.8)) {
      // carrying someone: walk to the closest edge and throw them off!
      b.grabbing -= dt;
      input.grab = true;
      if (!(c.grab[0] || c.grab[1])) { unstick(c, b, dt, input); return; } // still reaching for them
      if (!b.throwDir) b.throwDir = nearestEdge(c) || { x: p.x || 0.01, z: p.z || 0.01 };
      const tl = Math.hypot(b.throwDir.x, b.throwDir.z) || 1;
      const tx = b.throwDir.x / tl, tz = b.throwDir.z / tl;
      input.x = tx; input.z = tz;
      const y = p.y - FP.Ragdoll.STAND;
      // let go when we reach the edge (walking lets go = a throw), or when we get tired
      if (!floorAt(p.x + tx * 1.7, p.z + tz * 1.7, y) || b.grabbing <= 0) { input.grab = false; b.grabbing = 0; b.throwDir = null; }
      unstick(c, b, dt, input);
      return;
    }
    b.grabbing = 0; b.throwDir = null;

    if (b.backT > 0) {
      // step back after punching (like a boxer), then come back in
      b.backT -= dt;
      steer(c, p.x - (tp.x - p.x) * 2, p.z - (tp.z - p.z) * 2, input);
      input.x *= 0.7; input.z *= 0.7;
    } else if (d > 1.5 && d < 3.2 && b.personality !== 'brave') {
      // circle around the target a bit before going in
      if (Math.random() < dt * 0.4) b.circle *= -1;
      const ox = -(tp.z - p.z) / d * b.circle, oz = (tp.x - p.x) / d * b.circle;
      const side = { x: 0, z: 0 };
      steer(c, p.x + input.x * 0.8 + ox, p.z + input.z * 0.8 + oz, side);
      input.x = side.x; input.z = side.z;
    }

    if (d < 1.4) {
      const grabRate = (b.target.ko > 0 ? 3 : 0.5) * sk.grab * (b.personality === 'careful' ? 0.5 : 1);
      if (Math.random() < dt * grabRate) {
        b.grabbing = 1.6 + Math.random() * 1.2;
        input.grab = true;
      } else if (Math.random() < dt * (b.personality === 'brave' ? 4 : 3.2)) {
        input.punchPressed = true;
        if (Math.random() < sk.backOff * (b.personality === 'careful' ? 1.4 : 0.8)) b.backT = 0.25 + Math.random() * 0.35;
      }
      if (d < 0.9 && !input.grab && b.backT <= 0) { input.x *= 0.2; input.z *= 0.2; }
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

  // ------------------------------------------------------------
  //  THE HUMANIZER: turns "perfect robot" presses into human ones
  // ------------------------------------------------------------
  function humanize(c, b, raw, dt) {
    const sk = skillOf(c);
    const goofy = b.personality === 'goofy';
    // 1. reaction time: you see something, and a moment later your fingers press the button
    b.queue.push({ t: b.clock, i: raw });
    const out = { x: 0, z: 0, jump: false, jumpPressed: false, punchPressed: false, grab: false };
    let held = b.held || out;
    while (b.queue.length && b.clock - b.queue[0].t >= sk.reaction) {
      const e = b.queue.shift().i;
      held = e;
      if (e.jumpPressed) out.jumpPressed = true;
      if (e.punchPressed) out.punchPressed = true;
      if (e.emote) out.emote = e.emote;
    }
    if (b.queue.length > 60) b.queue.splice(0, b.queue.length - 60);
    b.held = held;
    out.x = held.x; out.z = held.z; out.grab = held.grab; out.jump = held.jump;
    if (held.grabL !== undefined || held.grabR !== undefined) { out.grabL = !!held.grabL; out.grabR = !!held.grabR; out.grab = out.grabL || out.grabR; } // one hand

    // 2. wobbly aim: nobody walks in a perfectly straight line
    const n = Math.sin(b.clock * 0.9 + b.seed) * 0.6 + Math.sin(b.clock * 2.3 + b.seed * 2) * 0.4;
    const ang = sk.aim * n * (c.grounded ? 1 : 0.3) * (goofy ? 1.5 : 1);
    const cs = Math.cos(ang), sn = Math.sin(ang);
    const speed = sk.speed * (0.92 + 0.08 * Math.sin(b.clock * 1.7 + b.seed));
    let x = (out.x * cs - out.z * sn) * speed, z = (out.x * sn + out.z * cs) * speed;

    // don't let the wobble (or being late) walk us off a ledge if the brain wanted to stay safe
    const p = c.parts.torso.position, y = p.y - FP.Ragdoll.STAND;
    if (c.grounded && Math.hypot(x, z) > 0.3 && !raw.grab) {
      const l = Math.hypot(x, z);
      if (!floorAt(p.x + (x / l) * 1.1, p.z + (z / l) * 1.1, y)) {
        const rl = Math.hypot(raw.x, raw.z);
        if (rl > 0.1 && floorAt(p.x + (raw.x / rl) * 1.1, p.z + (raw.z / rl) * 1.1, y)) { x = raw.x * speed; z = raw.z * speed; }
      }
    }
    out.x = x; out.z = z;

    // 3. punches come with a little rest in between, and sometimes you miss the button
    if (out.punchPressed) {
      if (b.clock < b.punchReady || Math.random() > sk.punchKeep) out.punchPressed = false;
      else b.punchReady = b.clock + sk.punchGap * (Math.random() < 0.3 ? 2.5 : 1);
    }

    // 4. little pauses: looking around, thinking, "wait, what?"
    if (b.pauseT > 0) {
      b.pauseT -= dt;
      out.x *= 0.12; out.z *= 0.12; out.punchPressed = false;
    } else if (!c.grabbedBy && !out.grab && c.grounded && Math.random() < dt * sk.pause * (goofy ? 1.6 : 1)) {
      b.pauseT = 0.3 + Math.random() * 0.6;
    }

    // 5. silly extra jumps (goofy bots love jumping)
    if (c.grounded && !out.grab && Math.random() < dt * sk.silly * (goofy ? 4 : 1)) out.jumpPressed = true;

    // 6. show off after knocking someone out
    if (b.tauntT > 0) {
      b.tauntT -= dt;
      if (b.tauntT <= 0 && c.grounded && !c.grabbedBy) { out.emote = 1 + Math.floor(Math.random() * 3); b.pauseT = 1.4; out.x = 0; out.z = 0; out.punchPressed = false; }
    }

    // 7. grabbed? mash jump to get free (better players mash faster)
    if (c.grabbedBy) out.jumpPressed = Math.random() < dt * sk.wriggle;
    return out;
  }

  function think(c, chars, dt, mode) {
    const input = { x: 0, z: 0, jump: false, jumpPressed: false, punchPressed: false, grab: false };
    const b = brain(c);
    b.clock += dt;
    if (!c.alive || c.ko > 0) { b.queue.length = 0; b.held = null; b.grabbing = 0; return input; }
    // remember who hit us (for revenge)
    if (c.lastHitBy && c.lastHitTime !== b.seenHit) { b.seenHit = c.lastHitTime; b.hurtBy = c.lastHitBy; b.hurtT = b.clock; }
    const tools = { steer, brain: b, skill: skillOf(c), unstick: (i) => unstick(c, b, dt, i), fight: (i) => fight(c, chars, dt, i) };
    if (!(mode && mode.botThink && mode.botThink(c, chars, dt, input, tools))) fight(c, chars, dt, input);
    return humanize(c, b, input, dt);
  }

  // a bot that knocks someone out sometimes celebrates with an emote
  FP.bus.on('knockOut', (c) => {
    const by = c && c.lastHitBy;
    if (!by || !by.isBot || by === c || !brains.has(by)) return;
    const b = brains.get(by);
    if (Math.random() < (b.personality === 'goofy' ? 0.8 : 0.35)) b.tauntT = 0.5 + Math.random() * 0.5;
  });

  function reset() { brains.clear(); }

  return { think, reset, steer, floorAt, SKILLS, SKILL_ORDER };
})();
