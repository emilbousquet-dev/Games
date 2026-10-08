// ============================================================
//  FLOPPY PARTY — ICE HOCKEY
//  Red team vs Blue team on slippery ice, with a goalie in
//  each goal. Everyone has a hockey stick!
//    Skate into the puck to take it (it sticks to your stick).
//    PUNCH: shoot!   GRAB: pass to a teammate.
//    No puck? PUNCH the puck carrier to poke it away.
//  3 periods. Most goals wins. A tie? Next goal wins!
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.hockey = (function () {
  const L = 26, W = 13, GOAL_W = 3.2, GOAL_H = 1.3, PERIOD = 45, PERIODS = 3, PR = 0.3;
  const TEAM_COLORS = [0xff5a5f, 0x4aa8ff];
  let puck = null, owner = null, rings = [], pause = 0, clock = PERIOD, period = 1, sudden = false, lastTouch = null, keepers = [], pickCool = new Map(), sticks = [], self = null;
  const goalX = (team) => (team === 0 ? 1 : -1) * (L / 2 - 1.5); // the goal line each team shoots at
  const ICE = new CANNON.Material('ice-puck');
  FP.Physics.world.addContactMaterial(new CANNON.ContactMaterial(ICE, FP.Physics.mats.floor, { friction: 0.01, restitution: 0.6 }));

  function stickMesh(color) {
    const g = new THREE.Group();
    const shaft = FP.Look.mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), FP.Look.toon(0x8a5a36), 0.01);
    shaft.position.set(0, -0.6, 0.15); shaft.rotation.x = 0.5;
    const blade = FP.Look.boxMesh(0.08, 0.1, 0.4, FP.Look.toon(color), 0.01);
    blade.position.set(0, -1.08, 0.5);
    g.add(shaft, blade);
    return g;
  }

  function build() {
    rings = []; owner = null; pause = 0; clock = PERIOD; period = 1; sudden = false; lastTouch = null; keepers = []; pickCool = new Map(); sticks = [];
    const S = FP.Stage, P = FP.Physics;
    S.block(0, -0.5, 0, L + 8, 1, W + 8, 0xd9ecff);
    const ice = new THREE.Mesh(new THREE.PlaneGeometry(L, W), FP.Look.toon(0xf2fbff));
    ice.rotation.x = -Math.PI / 2; ice.position.y = 0.01; ice.receiveShadow = true; S.add(ice);
    const line = (x, z, w, d, c = 0xff5a5f) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: c })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); S.add(m); };
    line(0, 0, 0.3, W); line(-L / 4, 0, 0.2, W, 0x4aa8ff); line(L / 4, 0, 0.2, W, 0x4aa8ff);
    for (const s of [-1, 1]) line(s * (L / 2 - 1.5), 0, 0.1, W);
    const circle = new THREE.Mesh(new THREE.RingGeometry(1.8, 1.95, 40), new THREE.MeshBasicMaterial({ color: 0x4aa8ff })); circle.rotation.x = -Math.PI / 2; circle.position.y = 0.02; S.add(circle);
    // the boards all around the rink (the puck bounces off them)
    const bh = 0.9;
    S.block(0, bh / 2, -W / 2 - 0.2, L + 0.8, bh, 0.4, 0xffffff);
    S.block(0, bh / 2, W / 2 + 0.2, L + 0.8, bh, 0.4, 0xffffff);
    S.block(-L / 2 - 0.2, bh / 2, 0, 0.4, bh, W + 0.8, 0xffffff);
    S.block(L / 2 + 0.2, bh / 2, 0, 0.4, bh, W + 0.8, 0xffffff);
    for (const [x, z, w, d] of [[0, -W / 2 - 0.2, L, 0.4], [0, W / 2 + 0.2, L, 0.4], [-L / 2 - 0.2, 0, 0.4, W], [L / 2 + 0.2, 0, 0.4, W]]) {
      const b = P.staticBox(x, 2, z, w, 4, d); b.collisionFilterMask = P.GROUP.PROP; S.bodies.push(b);
      const stripe = FP.Look.boxMesh(w + (d > 1 ? 0 : 0.02), 0.12, d + 0.02, FP.Look.toon(0xffcf33), 0); stripe.position.set(x, bh - 0.1, z); S.add(stripe);
    }
    // the goals (small nets on the ice)
    for (const team of [0, 1]) {
      const gx = goalX(team), s = Math.sign(gx);
      for (const z of [-GOAL_W / 2, GOAL_W / 2]) S.block(gx + s * 0.1, GOAL_H / 2, z, 0.12, GOAL_H, 0.12, 0xff5a5f);
      S.block(gx + s * 0.1, GOAL_H, 0, 0.12, 0.12, GOAL_W + 0.12, 0xff5a5f);
      const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide, wireframe: true });
      const back = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_W, GOAL_H, 6, 3), netMat); back.rotation.y = Math.PI / 2; back.position.set(gx + s * 0.9, GOAL_H / 2, 0); S.add(back);
      S.bodies.push(P.staticBox(gx + s * 0.95, GOAL_H / 2, 0, 0.1, GOAL_H, GOAL_W));
      for (const z of [-GOAL_W / 2, GOAL_W / 2]) S.bodies.push(P.staticBox(gx + s * 0.5, GOAL_H / 2, z, 0.9, GOAL_H, 0.1));
      const crease = new THREE.Mesh(new THREE.CircleGeometry(1.4, 24, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI), new THREE.MeshBasicMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.6 }));
      crease.rotation.x = -Math.PI / 2; crease.position.set(gx, 0.015, 0); S.add(crease);
    }
    const crowd = FP.Props.crowd(3, 16, 1.5); crowd.position.set(0, 0, -(W / 2 + 2)); S.add(crowd);
    // the puck: flat, slides a long way on the ice
    const pm = FP.Look.mesh(new THREE.CylinderGeometry(PR, PR, 0.14, 18), FP.Look.toon(0x2a2140), 0.02);
    const body = new CANNON.Body({ mass: 0.3, material: ICE, linearDamping: 0.12, angularDamping: 0.9, collisionFilterGroup: P.GROUP.PROP, collisionFilterMask: P.GROUP.WORLD });
    body.addShape(new CANNON.Cylinder(PR, PR, 0.14, 12));
    body.position.set(0, 0.2, 0);
    puck = FP.Stage.prop(pm, body);
    // goalies
    [0, 1].forEach((team) => {
      const x = goalX(1 - team) - Math.sign(goalX(1 - team)) * 0.7;
      const c = FP.Ragdoll.create(S.scene, { index: 6 + team, colorIndex: team === 0 ? 0 : 1, hat: 'beanie', name: 'Goalie', x, y: 0, z: 0, yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2 });
      c.isKeeper = true; c.team = team;
      const pad = FP.Look.boxMesh(0.7, 0.5, 0.35, FP.Look.toon(0xffffff), 0.02); pad.position.set(0, -0.35, 0.15); c.meshes.torso.add(pad);
      keepers.push({ c, team, x });
    });
    S.onClear(() => { keepers.forEach((k) => FP.Ragdoll.remove(k.c)); keepers = []; sticks.forEach(([arm, st]) => arm.remove(st)); sticks = []; for (const c of FP.Ragdoll.all) c.onIce = false; });
    FP.Camera.setAngle(0.95, 0.75);
  }

  function spawn(i, n, p) {
    const team = p.team, k = p && p.teamRank !== undefined ? p.teamRank : Math.floor(i / 2); // (k = place in the team)
    return { x: (team === 0 ? -1 : 1) * (3 + k * 3), y: 0, z: (k % 2 ? -1 : 1) * 2 * (k ? 1 : 0.2), yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2 };
  }
  function resetPlayers(chars) { chars.forEach((c, i) => { const s = spawn(i, chars.length, c.player); FP.Ragdoll.teleport(c, s.x, 0, s.z, s.yaw); }); }
  function faceoff() { owner = null; puck.body.position.set(0, 0.3, 0); puck.body.velocity.set(0, 0, 0); puck.body.angularVelocity.set(0, 0, 0); puck.body.quaternion.set(0, 0, 0, 1); }

  const pos = (c) => c.parts.torso.position;
  const dist2 = (a, x, z) => Math.hypot(a.x - x, a.z - z);
  function givesticks(chars) {
    if (sticks.length) return;
    for (const c of [...chars, ...keepers.map((k) => k.c)]) {
      const arm = c.meshes.arms[0];
      const st = stickMesh(TEAM_COLORS[c.team] || 0xffffff);
      arm.add(st); sticks.push([arm, st]);
    }
  }

  function shootPuck(c, vx, vz, lift) {
    const b = puck.body;
    owner = null; pickCool.set(c, 0.4); lastTouch = c;
    b.position.y = 0.2;
    b.velocity.set(vx, lift, vz);
    c.punchT = 0; c.punchHit = true;
    FP.Audio.play('hit');
  }
  function shoot(c) {
    let fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const p = pos(c), gx = goalX(c.team), dx = gx - p.x, dz = -p.z, d = Math.hypot(dx, dz);
    if ((dx * fx + dz * fz) / d > 0.4) {
      // facing the net: aim for a corner
      const tz = (Math.random() < 0.5 ? -1 : 1) * GOAL_W * (0.2 + Math.random() * 0.2);
      const ax = gx - p.x, az = tz - p.z, al = Math.hypot(ax, az); fx = ax / al; fz = az / al;
    }
    shootPuck(c, fx * 20, fz * 20, Math.random() < 0.4 ? 2.5 : 0.3);
  }
  function pass(c) {
    const p = pos(c), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const mates = FP.Game.chars.filter((o) => o !== c && o.team === c.team);
    if (!mates.length) { shootPuck(c, fx * 10, fz * 10, 0); return; }
    let best = null, bs = -Infinity;
    for (const m of mates) { const q = pos(m), dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1; const s2 = (dx * fx + dz * fz) / d * 2 - d * 0.05; if (s2 > bs) { bs = s2; best = m; } }
    const q = pos(best), ax = q.x - p.x, az = q.z - p.z, al = Math.hypot(ax, az) || 1;
    const sp = Math.min(15, 5 + al * 0.9);
    shootPuck(c, (ax / al) * sp, (az / al) * sp, 0);
  }
  function poke(c) {
    if (!owner || owner.team === c.team || owner.isKeeper) return;
    if (dist2(pos(owner), pos(c).x, pos(c).z) > 1.7) return;
    const odds = c.isBot ? ({ easy: 0.2, normal: 0.3, hard: 0.4 }[c.botSkill] || 0.3) : 0.5;
    if (Math.random() < odds) {
      FP.FX.word(owner.parts.head.position, 'POKE CHECK!', '#ffcf33', 1.1);
      pickCool.set(owner, 0.8);
      owner = c; lastTouch = c;
      FP.Audio.play('grab');
    }
  }

  function control(c, input, dt, playing) {
    c.onIce = true;
    const inp = input || {};
    const grabEdge = !!inp.grab && !c.hkGrab;
    c.hkGrab = !!inp.grab;
    let punch = inp.punchPressed;
    if (playing && pause <= 0) {
      if (owner === c) { if (inp.punchPressed) { shoot(c); punch = false; } else if (grabEdge) pass(c); }
      else if (inp.punchPressed) poke(c);
    }
    FP.Ragdoll.control(c, { x: inp.x || 0, z: inp.z || 0, jump: inp.jump, jumpPressed: inp.jumpPressed, punchPressed: owner === c ? false : punch, grab: false, emote: inp.emote }, dt);
  }

  // goalies: slide across the crease with the puck, catch it, pass it out
  function keeperThink(k, dt, playing) {
    const c = k.c, p = pos(c), b = puck.body.position;
    const sgn = Math.sign(k.x);
    const input = { x: 0, z: 0 };
    if (playing) {
      if (owner === c) {
        k.hold = (k.hold || 0) - dt;
        if (k.hold <= 0) {
          const mates = FP.Game.chars.filter((o) => o.team === k.team);
          const m = mates[Math.floor(Math.random() * mates.length)];
          const tx = m ? pos(m).x : 0, tz = m ? pos(m).z : 0, ax = tx - p.x, az = tz - p.z, al = Math.hypot(ax, az) || 1;
          owner = null; pickCool.set(c, 1);
          puck.body.position.set(p.x - sgn * 0.8, 0.2, p.z);
          puck.body.velocity.set((ax / al) * 12, 0, (az / al) * 12);
        }
      } else {
        const tz = Math.max(-GOAL_W / 2 + 0.3, Math.min(GOAL_W / 2 - 0.3, b.z * 0.6));
        input.x = Math.max(-1, Math.min(1, (k.x - p.x) * 3)); input.z = Math.max(-1, Math.min(1, (tz - p.z) * 3));
        if (Math.hypot(input.x, input.z) < 0.12) { input.x = 0; input.z = 0; }
      }
    }
    c.onIce = false; // goalies have good grip
    FP.Ragdoll.control(c, input, dt);
    c.yaw = sgn > 0 ? -Math.PI / 2 : Math.PI / 2;
  }

  function beforeStep(dt) {
    const playing = FP.Game.state === 'play';
    for (const k of keepers) keeperThink(k, dt, playing);
    const b = puck.body;
    if (owner) {
      const p = pos(owner), fx = Math.sin(owner.yaw), fz = Math.cos(owner.yaw);
      b.position.set(p.x + fx * 0.8 - fz * 0.2, 0.08, p.z + fz * 0.8 + fx * 0.2);
      b.velocity.set(0, 0, 0); b.quaternion.set(0, 0, 0, 1); b.angularVelocity.set(0, 0, 0);
    } else if (b.position.y > 0.5 && b.velocity.y > 0) b.velocity.y *= 0.9; // pucks stay low
  }

  function scored(team) {
    FP.Game.scores['team' + team]++;
    pause = 2.4;
    const who = lastTouch && !lastTouch.isKeeper && lastTouch.team === team ? `${lastTouch.name} scores!` : '';
    FP.UI.big('GOAL!', 2, who); FP.Audio.play('goal'); FP.Props.hype(); FP.Camera.shake(0.5);
    FP.FX.confetti(new THREE.Vector3(puck.body.position.x, 0, 0), 120, 5);
    if (FP.Net) FP.Net.banner('GOAL!', who);
    self.lastGoal = team;
  }

  function visual(dt, chars) {
    if (!rings.length && chars.length) for (const c of chars) { const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 24), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[c.team], transparent: true, opacity: 0.9 })); ring.rotation.x = -Math.PI / 2; FP.Stage.add(ring); rings.push([ring, c]); }
    for (const [ring, c] of rings) ring.position.set(pos(c).x, 0.03, pos(c).z);
    givesticks(chars);
  }

  function update(dt, chars, g, roundOver) {
    for (const k of keepers) { FP.Ragdoll.sync(k.c, dt); if (pos(k.c).y < -6) FP.Ragdoll.teleport(k.c, k.x, 0, 0); }
    visual(dt, chars);
    if (roundOver || dt === 0) return null;
    for (const [c, t] of pickCool) pickCool.set(c, t - dt);
    for (const c of chars) if (pos(c).y < -6) FP.Ragdoll.teleport(c, 0, 1, 0);
    const b = puck.body.position;
    if (b.y < -4 || Math.abs(b.x) > L / 2 + 3 || Math.abs(b.z) > W / 2 + 3) faceoff();
    if (pause > 0) {
      pause -= dt;
      if (pause <= 0) {
        if (sudden && self.lastGoal !== undefined) { const t = self.lastGoal; return { team: t, points: 0, text: `${t ? 'Blue' : 'Red'} wins in overtime!` }; }
        resetPlayers(chars); faceoff(); FP.UI.big('Face off!', 1);
      }
      return null;
    }
    clock -= dt;
    // goal? (the puck crosses the goal line between the posts)
    for (const team of [0, 1]) {
      const gx = goalX(team);
      if (!owner && Math.sign(b.x - gx) === Math.sign(gx) && Math.abs(b.x) - Math.abs(gx) > 0.15 && Math.abs(b.x) - Math.abs(gx) < 1 && Math.abs(b.z) < GOAL_W / 2 && b.y < GOAL_H) { scored(team); return null; }
    }
    // goalies catch pucks that come close
    if (!owner) for (const k of keepers) {
      if ((pickCool.get(k.c) || 0) > 0) continue;
      const kp = pos(k.c);
      if (dist2(kp, b.x, b.z) < 0.7) {
        const fast = Math.hypot(puck.body.velocity.x, puck.body.velocity.z) > 12;
        pickCool.set(k.c, 0.5);
        if (fast) {
          // a hard shot: the goalie stops it about half the time, otherwise it squeezes past
          if (Math.random() < 0.45) { puck.body.velocity.x *= -0.5; puck.body.velocity.z += (Math.random() - 0.5) * 8; FP.FX.word(k.c.parts.head.position, 'SAVE!', '#ffffff', 1.1); FP.Audio.play('bonk'); }
        } else { owner = k.c; k.hold = 1; FP.FX.word(k.c.parts.head.position, 'SAVE!', '#ffffff', 1.1); FP.Audio.play('grab'); }
        break;
      }
    }
    if (!owner) for (const c of chars) {
      if (c.ko > 0 || (pickCool.get(c) || 0) > 0) continue;
      if (dist2(pos(c), b.x, b.z) < 1.0 && b.y < 0.8) { owner = c; lastTouch = c; FP.Audio.play('grab'); break; }
    }
    if (owner && owner.ko > 0) owner = null;
    if (clock <= 0 && !sudden) {
      if (period < PERIODS) {
        period++; clock = PERIOD; pause = 2;
        FP.UI.big(`End of period ${period - 1}`, 1.6, `Period ${period} next`); if (FP.Net) FP.Net.banner(`End of period ${period - 1}`, '');
        FP.Audio.play('alarm');
      } else {
        const sc = g.scores;
        if (sc.team0 !== sc.team1) { const t = sc.team0 > sc.team1 ? 0 : 1; return { team: t, points: 0, text: `${t ? 'Blue' : 'Red'} team wins ${Math.max(sc.team0, sc.team1)} to ${Math.min(sc.team0, sc.team1)}!` }; }
        sudden = true; clock = 60; pause = 2; self.lastGoal = undefined;
        FP.UI.big('OVERTIME!', 2, 'Next goal wins'); if (FP.Net) FP.Net.banner('OVERTIME!', 'Next goal wins');
      }
    }
    if (sudden && clock <= 0) return { text: "It's a tie!" };
    return null;
  }

  // bots: like soccer, but on ice
  function botThink(c, chars, dt, input, tools) {
    const p = pos(c), b = puck.body.position, br = tools.brain;
    const gx = goalX(c.team), myGoal = goalX(1 - c.team);
    const mates = chars.filter((o) => o.team === c.team);
    const closestTo = (list, x, z) => list.reduce((a, o) => (o.ko > 0 ? a : !a || dist2(pos(o), x, z) < dist2(pos(a), x, z) ? o : a), null);
    if (owner === c) {
      br.holdT = (br.holdT || 0) + dt;
      if (br.lane === undefined) { br.lane = (Math.random() - 0.5) * 5; br.shootAt = 5 + Math.random() * 5; }
      const d = dist2(p, gx, 0);
      tools.steer(c, gx - Math.sign(gx) * 2, d > 6 ? br.lane : 0, input);
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw), facing = ((gx - p.x) * fx + -p.z * fz) / d;
      const blocked = chars.some((o) => o.team !== c.team && dist2(pos(o), p.x + fx * 1.2, p.z + fz * 1.2) < 1.3);
      const mate = mates.find((m) => m !== c && Math.abs(gx - pos(m).x) < Math.abs(gx - p.x) - 1);
      if (d < br.shootAt && facing > 0.5 && br.holdT > 0.4) input.punchPressed = true;
      else if (blocked && mate && br.holdT > 0.5 && Math.random() < dt * 2) input.grab = true;
      else if (br.holdT > 6) input.punchPressed = true;
      return true;
    }
    br.holdT = 0; br.lane = undefined;
    if (!owner || owner.isKeeper) {
      if (closestTo(mates, b.x, b.z) === c) tools.steer(c, b.x, b.z, input);
      else { tools.steer(c, (b.x + gx) * 0.4, c.index % 2 ? 2.5 : -2.5, input); input.x *= 0.7; input.z *= 0.7; }
    } else if (owner.team === c.team) {
      tools.steer(c, Math.max(-L / 2 + 2, Math.min(L / 2 - 2, pos(owner).x + Math.sign(gx) * 5)), pos(owner).z > 0 ? -3 : 3, input);
    } else {
      const q = pos(owner);
      if (closestTo(mates, q.x, q.z) === c) { const d = tools.steer(c, q.x + Math.sign(myGoal - q.x) * 0.8, q.z, input); if (d < 1.4 && Math.random() < dt * 2.5) input.punchPressed = true; }
      else { tools.steer(c, myGoal - Math.sign(myGoal) * 5, q.z * 0.5, input); input.x *= 0.8; input.z *= 0.8; }
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const label = sudden ? 'Overtime: next goal wins!' : `Period ${period} &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(clock)}`;
    return `<span>${label}</span><span class="hud-tip">Skate into the puck &nbsp; PUNCH: shoot &nbsp; GRAB: pass &nbsp; No puck? PUNCH to poke it away</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#d9ecff"/><rect x="8" y="30" width="104" height="44" rx="14" fill="#f2fbff" stroke="#2a2140" stroke-width="2"/><path d="M60 30v44" stroke="#ff5a5f" stroke-width="3"/><circle cx="60" cy="52" r="8" fill="none" stroke="#4aa8ff" stroke-width="2"/><rect x="100" y="44" width="8" height="16" fill="none" stroke="#ff5a5f" stroke-width="2.5"/><ellipse cx="80" cy="60" rx="5" ry="2" fill="#2a2140"/><ellipse cx="40" cy="44" rx="6" ry="8" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="40" cy="32" r="5" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><path d="M44 48l18 12h8" stroke="#8a5a36" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';

  self = {
    id: 'hockey', name: 'Ice Hockey', roundsToWin: 1, single: true, teams: true, minTotal: 2, song: 'race', minZoom: 14, art: ART,
    desc: 'Red vs Blue on slippery ice! Skate into the puck, PUNCH to shoot, GRAB to pass, PUNCH to poke it away. 3 periods.',
    build, spawn, control, beforeStep, update, botThink, hud, visual,
    focus: (chars) => {
      const b = puck ? puck.body.position : new THREE.Vector3();
      const pts = [new THREE.Vector3(b.x, 0, b.z)];
      chars.map((c) => ({ c, d: dist2(pos(c), b.x, b.z) })).sort((a, z) => a.d - z.d).slice(0, 2).forEach((o) => pts.push(FP.Ragdoll.center(o.c)));
      return pts;
    },
    netState: () => ({ p: pause > 0 ? 1 : 0, n: period, c: Math.round(clock), s: sudden ? 1 : 0 }),
    applyNetState: (s) => { pause = s.p ? 1 : 0; period = s.n; clock = s.c; sudden = !!s.s; },
  };
  return self;
})();
