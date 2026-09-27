// ============================================================
//  FLOPPY PARTY — DODGEBALL (the real thing!)
//  Red team vs Blue team, each on their own side of the court.
//    Run into a ball to pick it up.
//    PUNCH: throw it (it aims at the closest enemy).
//    GRAB right when a ball flies at you: CATCH it! Then the
//    thrower is out, and one of your teammates comes back in.
//  Hit by a ball? You're out (off to the bench).
//  The team with nobody left loses the round. First to 2 rounds.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.dodge = (function () {
  const W = 18, D = 11, NBALLS = 6, ROUND_TIME = 75, R = 0.34;
  const BALL_COLORS = [[0xff5a5f, 0xffffff], [0x4aa8ff, 0xffffff], [0xffcf33, 0xff9a3c], [0x5cc44a, 0xffffff], [0x9b6bff, 0xffffff], [0xff7eb6, 0xffffff]];
  let balls = [], time = 0, sudden = false, benchT = new Map(), catchT = new Map(), self = null;
  const sideOf = (team) => (team === 0 ? -1 : 1); // Red on the left, Blue on the right
  const pos = (c) => c.parts.torso.position;

  function build() {
    balls = []; time = 0; sudden = false; benchT = new Map(); catchT = new Map();
    const S = FP.Stage;
    S.island(0, -1, 0, W + 2, 2, D + 2, { grass: 0x8fd46e });
    // the court: a red half and a blue half
    for (const t of [0, 1]) {
      const half = new THREE.Mesh(new THREE.PlaneGeometry(W / 2 - 0.1, D - 0.2), FP.Look.toon(t === 0 ? 0xffc2c4 : 0xc2e0ff));
      half.rotation.x = -Math.PI / 2; half.position.set(sideOf(t) * W / 4, 0.04, 0); S.add(half);
    }
    const line = (x, z, w, d, c = 0xffffff) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: c })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); S.add(m); };
    line(0, 0, 0.25, D, 0x2a2140); line(0, -D / 2 + 0.1, W, 0.15); line(0, D / 2 - 0.1, W, 0.15); line(-W / 2 + 0.1, 0, 0.15, D); line(W / 2 - 0.1, 0, 0.15, D);
    // low walls all around, invisible high walls that only stop balls
    S.block(0, 0.6, -D / 2 - 0.5, W + 2, 1.2, 0.6, 0xffb8d1);
    S.block(0, 0.6, D / 2 + 0.5, W + 2, 1.2, 0.6, 0xffb8d1);
    S.block(-W / 2 - 0.5, 0.6, 0, 0.6, 1.2, D + 2, 0xa6e6ff);
    S.block(W / 2 + 0.5, 0.6, 0, 0.6, 1.2, D + 2, 0xa6e6ff);
    for (const [x, z, w, d] of [[0, -D / 2 - 0.5, W + 2, 0.6], [0, D / 2 + 0.5, W + 2, 0.6], [-W / 2 - 0.5, 0, 0.6, D + 2], [W / 2 + 0.5, 0, 0.6, D + 2]]) {
      const b = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: FP.Physics.GROUP.NPC, collisionFilterMask: FP.Physics.GROUP.PROP });
      b.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, 2, d / 2))); b.position.set(x, 3, z);
      FP.Physics.world.addBody(b); S.bodies.push(b);
    }
    // the middle line is a wall only people bump into (balls fly over it)
    const mid = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: FP.Physics.GROUP.NPC, collisionFilterMask: FP.Physics.ALL & ~(FP.Physics.GROUP.WORLD | FP.Physics.GROUP.PROP | FP.Physics.GROUP.NPC) });
    mid.addShape(new CANNON.Box(new CANNON.Vec3(0.1, 3, D / 2))); mid.position.set(0, 3, 0);
    FP.Physics.world.addBody(mid); S.bodies.push(mid);
    // the benches for players who are out (one behind each team)
    S.island(0, -1, D / 2 + 3, W + 2, 2, 3, { grass: 0x8fd46e });
    for (const t of [0, 1]) {
      const bench = FP.Look.boxMesh(W / 2 - 2, 0.4, 0.8, FP.Look.toon(t === 0 ? 0xff5a5f : 0x4aa8ff));
      bench.position.set(sideOf(t) * W / 4, 0.2, D / 2 + 3.6); S.add(bench);
    }
    S.island(0, -1, -D / 2 - 2.3, W + 2, 2, 3.2, { grass: 0x8fd46e });
    const fans = FP.Props.crowd(2, 12, 1.4); fans.position.set(0, 0, -D / 2 - 1.6); S.add(fans);
    // the balls start in a row on the middle line: RUN for them!
    for (let i = 0; i < NBALLS; i++) {
      const k = FP.Kit.ball(R, BALL_COLORS[i].concat(BALL_COLORS[i]), 0.5);
      k.body.collisionFilterMask = FP.Physics.GROUP.WORLD | FP.Physics.GROUP.NPC | FP.Physics.GROUP.PROP; // people don't bump them: hits are worked out below
      const z = (i - (NBALLS - 1) / 2) * 1.7;
      k.body.position.set(0, 0.6, z);
      balls.push({ ...FP.Stage.prop(k.mesh, k.body), i, holder: null, thrower: null, live: 0, cool: new Map() });
    }
    FP.Camera.setAngle(0.85, 0.75);
  }

  function spawn(i, n, p) {
    const team = p && p.team !== undefined ? p.team : i % 2;
    const row = Math.floor(i / 2);
    return { x: sideOf(team) * 6.5, y: 0.2, z: row ? 2.2 : -2.2, yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  const heldBy = (c) => balls.find((b) => b.holder === c);

  // ---------------- throwing and catching ----------------
  function throwBall(c) {
    const b = heldBy(c);
    if (!b) return;
    const p = pos(c);
    // aim at the closest enemy in front of you (or the closest one at all)
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    let tgt = null, bs = -Infinity;
    for (const o of FP.Game.chars) {
      if (o.team === c.team || !o.alive) continue;
      const q = pos(o), dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1;
      const s = (dx * fx + dz * fz) / d * 3 - d * 0.15;
      if (s > bs) { bs = s; tgt = o; }
    }
    let dirX = fx, dirZ = fz;
    if (tgt) {
      const q = pos(tgt), v = tgt.parts.torso.velocity;
      const d = Math.hypot(q.x - p.x, q.z - p.z), T = d / 17;
      const tx = q.x + v.x * T * 0.6, tz = q.z + v.z * T * 0.6;
      const al = Math.hypot(tx - p.x, tz - p.z) || 1;
      dirX = (tx - p.x) / al; dirZ = (tz - p.z) / al;
      // not perfect: a little wobble (bots wobble more)
      const wob = (Math.random() - 0.5) * (c.isBot ? 0.25 : 0.12);
      const cs = Math.cos(wob), sn = Math.sin(wob);
      [dirX, dirZ] = [dirX * cs - dirZ * sn, dirX * sn + dirZ * cs];
    }
    b.holder = null; b.thrower = c; b.live = 1.6;
    b.cool.set(c, 0.5);
    b.body.position.set(p.x + dirX * 0.6, p.y + 0.3, p.z + dirZ * 0.6);
    b.body.velocity.set(dirX * 17, 1.8, dirZ * 17);
    c.punchT = 0; c.punchHit = true;
    FP.Audio.play('whoosh');
  }

  function out(c, how) {
    FP.Game.eliminate(c, how);
    benchT.set(c, 1.3); // a moment to fly, then off to the bench
  }

  function bringBackIn(team) {
    const benched = FP.Game.chars.filter((c) => c.team === team && !c.alive && !benchT.has(c));
    if (!benched.length) return null;
    const c = benched[0];
    c.alive = true; c.ko = 0;
    FP.Ragdoll.teleport(c, sideOf(team) * 6.5, 0.3, 0, team === 0 ? Math.PI / 2 : -Math.PI / 2);
    FP.FX.puffs(pos(c), 12, 0xffffff, 3);
    return c;
  }

  // sport controls: PUNCH throws, GRAB catches. Players who are out just sit on the bench
  function control(c, input, dt, playing) {
    const inp = input || {};
    if (!c.alive && playing) { FP.Ragdoll.control(c, { x: 0, z: 0, emote: inp.emote }, dt); return; }
    let punch = inp.punchPressed;
    if (playing) {
      if (inp.punchPressed && heldBy(c)) { throwBall(c); punch = false; }
      // hold grab to get ready to catch (only a short moment works, so it's a real catch)
      if (inp.grab && !heldBy(c)) catchT.set(c, Math.min((catchT.get(c) || 0) + dt, 9)); else catchT.set(c, 0);
    }
    FP.Ragdoll.control(c, { x: inp.x || 0, z: inp.z || 0, jump: inp.jump, jumpPressed: inp.jumpPressed, punchPressed: heldBy(c) ? false : punch, grab: false, emote: inp.emote }, dt);
    // stay on your own side of the court
    const p = pos(c), s = sideOf(c.team);
    if (c.alive && p.x * s < 0.35) for (const b of c.bodies) b.velocity.x = Math.max(b.velocity.x * s, 1) * s;
  }

  // held balls sit in the thrower's hands
  function beforeStep() {
    for (const b of balls) {
      if (!b.holder) continue;
      const c = b.holder, p = pos(c), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      b.body.position.set(p.x + fx * 0.45 - fz * 0.3, p.y + 0.15, p.z + fz * 0.45 + fx * 0.3);
      b.body.velocity.set(0, 0, 0); b.body.angularVelocity.set(0, 0, 0);
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      // players who are out walk off to the bench
      for (const [c, t] of benchT) {
        if (t - dt > 0) { benchT.set(c, t - dt); continue; }
        benchT.delete(c);
        const bench = chars.filter((o) => o.team === c.team && !o.alive).indexOf(c);
        FP.Ragdoll.teleport(c, sideOf(c.team) * (W / 4 - 2 + bench * 1.2), 0.3, D / 2 + 2.8, 0);
      }
      for (const b of balls) {
        b.live -= dt;
        for (const [c, t] of b.cool) b.cool.set(c, t - dt);
        const bp = b.body.position;
        if (bp.y < -6) { b.body.position.set(0, 2, (b.i - (NBALLS - 1) / 2) * 1.7); b.body.velocity.set(0, 0, 0); b.live = 0; b.holder = null; }
        if (b.holder) { if (!b.holder.alive || b.holder.ko > 0) b.holder = null; continue; }
        const v = b.body.velocity, sp = Math.hypot(v.x, v.y, v.z);
        if (b.live > 0 && bp.y < R + 0.08) b.live = 0; // it bounced on the floor: not dangerous any more
        if (b.live > 0 && sp > 5 && b.thrower) {
          // a live ball near an enemy: caught, or BONK
          for (const c of chars) {
            if (!c.alive || c.team === b.thrower.team || c.ko > 0) continue;
            const t = pos(c), h = c.parts.head.position;
            const near = Math.min(Math.hypot(t.x - bp.x, t.y - bp.y, t.z - bp.z), Math.hypot(h.x - bp.x, h.y - bp.y, h.z - bp.z));
            if (near > 0.75) continue;
            const ct = catchT.get(c) || 0;
            if (ct > 0 && ct < 0.6 && !heldBy(c)) {
              // CAUGHT IT! The thrower is out, a teammate comes back
              b.live = 0; b.holder = c; b.caughtFrom = b.thrower; b.thrower = null;
              FP.FX.word(h, 'CAUGHT IT!', '#5cc44a', 1.4); FP.Audio.play('cheer'); FP.Props.hype();
              break;
            }
            // BONK: out!
            b.live = 0;
            FP.Ragdoll.knockOut(c, 1.2);
            for (const bd of c.bodies) { bd.velocity.x += v.x * 0.4; bd.velocity.z += v.z * 0.4; bd.velocity.y += 3; }
            c.lastHitBy = b.thrower; c.lastHitTime = performance.now();
            b.body.velocity.set(-v.x * 0.25, 3, -v.z * 0.25);
            FP.FX.word(h, 'BONK!', '#ff5a5f', 1.4); FP.FX.stars(h, 6);
            FP.Camera.shake(0.35); FP.Audio.play('bonk');
            out(c, 'got hit! Out!');
            break;
          }
        }
        if (b.holder) continue;
        // a loose ball: pick it up by running into it (not right after you threw it, and only on your side)
        if (b.live <= 0 && bp.y < 1.3) {
          for (const c of chars) {
            if (!c.alive || c.ko > 0 || heldBy(c) || (b.cool.get(c) || 0) > 0) continue;
            const t = pos(c);
            if (Math.hypot(t.x - bp.x, t.z - bp.z) < 1.0) { b.holder = c; FP.Audio.play('grab'); break; }
          }
        }
      }
    }
    if (roundOver || dt === 0) return null;
    const alive = [0, 1].map((t) => chars.filter((c) => c.team === t && c.alive).length);
    if (!alive[0] || !alive[1]) {
      if (!alive[0] && !alive[1]) return { text: 'Everybody is out!' };
      const t = alive[0] ? 0 : 1;
      return { team: t, points: 1, text: `${t ? 'Blue' : 'Red'} team wins the round!` };
    }
    if (time >= ROUND_TIME) {
      if (alive[0] !== alive[1]) { const t = alive[0] > alive[1] ? 0 : 1; return { team: t, points: 1, text: `Time! ${t ? 'Blue' : 'Red'} has more players left!` }; }
      if (!sudden) { sudden = true; FP.UI.big('Sudden death!', 1.6, 'Next hit wins the round'); if (FP.Net) FP.Net.banner('Sudden death!', 'Next hit wins the round'); }
      if (time >= ROUND_TIME + 30) return { text: 'A draw!' };
    }
    return null;
  }

  // catching needs the thrower: remember who threw each ball when it was caught
  const baseUpdate = update;
  function updateWithCatch(dt, chars, game, roundOver) {
    const res = baseUpdate(dt, chars, game, roundOver);
    balls.forEach((b) => {
      const t0 = b.caughtFrom;
      b.caughtFrom = null;
      if (t0 && b.holder && b.holder.team !== t0.team && t0.alive) {
        // this ball was just caught out of the air: the thrower is out!
        const back = bringBackIn(b.holder.team);
        out(t0, 'got caught! Out!');
        FP.UI.toast(back ? `${b.holder.name} caught it! ${t0.name} is out and ${back.name} is back in!` : `${b.holder.name} caught it! ${t0.name} is out!`, 2.5);
      }
    });
    return res;
  }

  // ---------------- bots ----------------
  function botThink(c, chars, dt, input, tools) {
    if (!c.alive) return true;
    const br = tools.brain, p = pos(c), s = sideOf(c.team);
    const mine = heldBy(c);
    // a ball flying at me: try to catch it, or dodge
    for (const b of balls) {
      if (b.live <= 0 || !b.thrower || b.thrower.team === c.team) continue;
      const bp = b.body.position, v = b.body.velocity;
      const dx = p.x - bp.x, dz = p.z - bp.z, d = Math.hypot(dx, dz), sp = Math.hypot(v.x, v.z) || 1;
      if (d < 6 && (dx * v.x + dz * v.z) / (d * sp) > 0.85) {
        if (br.dodgeFor !== b) { br.dodgeFor = b; br.plan = Math.random() < ({ easy: 0.1, normal: 0.25, hard: 0.4 }[c.botSkill] || 0.25) ? 'catch' : Math.random() < 0.5 ? 1 : -1; }
        if (br.plan === 'catch' && !mine) { input.grab = d < 2.6; input.x = 0; input.z = 0; return true; }
        const dir = br.plan === 'catch' ? 1 : br.plan;
        input.x = (-v.z / sp) * dir; input.z = (v.x / sp) * dir;
        if (d < 2.5 && c.grounded && Math.random() < 0.3) input.jumpPressed = true;
        return true;
      }
    }
    if (mine) {
      br.holdT = (br.holdT || 0) + dt;
      // step up toward the middle line, face an enemy, throw
      const enemies = chars.filter((o) => o.alive && o.team !== c.team);
      const tgt = enemies.reduce((a, o) => (!a || Math.abs(pos(o).z - p.z) < Math.abs(pos(a).z - p.z) ? o : a), null);
      if (tgt) {
        const q = pos(tgt);
        tools.steer(c, s * 2.2, q.z * 0.6, input);
        if (Math.abs(p.x) < 4 && br.holdT > 0.6 + Math.random() * 0.4) { input.x = (q.x - p.x) * 0.2; input.z = (q.z - p.z) * 0.2; input.punchPressed = true; br.holdT = 0; }
        if (br.holdT > 3.5) input.punchPressed = true;
      }
    } else {
      br.holdT = 0;
      // go get a ball on my side (or on the middle line)
      const free = balls.filter((b) => !b.holder && b.live <= 0 && b.body.position.x * s > -0.6);
      const near = FP.Kit.nearest(c, free.map((b) => ({ x: b.body.position.x, z: b.body.position.z })));
      if (near) tools.steer(c, near.item.x, near.item.z, input);
      else { tools.steer(c, s * 6, Math.sin(performance.now() / 900 + c.index) * 3, input); input.x *= 0.5; input.z *= 0.5; }
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const left = Math.max(0, ROUND_TIME - time);
    const label = sudden ? 'Sudden death: next hit wins!' : `${FP.UI.ICON.clock} ${FP.Kit.clock(left)}`;
    return `<span>${label}</span><span class="hud-tip">Run into a ball to pick it up &nbsp; PUNCH: throw &nbsp; GRAB just as a ball comes: CATCH</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><rect x="10" y="44" width="50" height="26" fill="#ffc2c4" stroke="#2a2140" stroke-width="2"/><rect x="60" y="44" width="50" height="26" fill="#c2e0ff" stroke="#2a2140" stroke-width="2"/><path d="M60 44v26" stroke="#2a2140" stroke-width="3"/><circle cx="62" cy="30" r="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><path d="M40 34h12M42 29h8M44 39h8" stroke="#2a2140" stroke-width="2" stroke-linecap="round" opacity=".45"/><ellipse cx="30" cy="50" rx="6" ry="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="30" cy="39" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><ellipse cx="88" cy="52" rx="6" ry="8" fill="#4aa8ff" stroke="#2a2140" stroke-width="2" transform="rotate(-25 88 52)"/><circle cx="92" cy="41" r="5" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><path d="M96 34l4-4M100 38l5-1M92 30l1-5" stroke="#ff9a3c" stroke-width="2" stroke-linecap="round"/></svg>';

  self = {
    id: 'dodge', name: 'Dodgeball', roundsToWin: 2, teams: true, minTotal: 2, song: 'party', minZoom: 16, art: ART,
    desc: 'Real dodgeball, Red vs Blue! Grab a ball, PUNCH to throw. Hit = out. GRAB right when a ball comes to CATCH it!',
    build, spawn, control, beforeStep, update: updateWithCatch, botThink, hud,
    netState: () => ({ t: Math.round(time), s: sudden ? 1 : 0 }),
    applyNetState: (st) => { time = st.t; sudden = !!st.s; },
  };
  return self;
})();
