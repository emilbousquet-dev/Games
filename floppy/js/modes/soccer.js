// ============================================================
//  FLOPPY PARTY — SOCCER (the real thing!)
//  Red team vs Blue team, with a goalkeeper in each goal.
//    Run into the ball to dribble it (it sticks to your feet).
//    PUNCH: shoot (it aims for the goal if you face it).
//    GRAB: pass to a teammate.
//    No ball? JUMP to slide tackle, or PUNCH to poke it away.
//  Two halves. Most goals wins. A tie? Golden goal!
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.soccer = (function () {
  const L = 28, W = 17;           // field size
  const GOAL_W = 5.4, GOAL_H = 2.6, R = 0.4, HALF = 75;
  const TEAM_COLORS = [0xff5a5f, 0x4aa8ff];
  let ball = null, rings = [], owner = null, pause = 0, clock = HALF, half = 1, golden = false, lastTouch = null, keepers = [], pickCool = new Map(), roll = 0, self = null;
  // team 0 (Red) attacks the goal on the right (+x)
  const goalX = (team) => (team === 0 ? 1 : -1) * (L / 2 + 1.1);

  function build(list) {
    rings = []; owner = null; pause = 0; clock = HALF; half = 1; golden = false; lastTouch = null; keepers = []; pickCool = new Map();
    const S = FP.Stage, P = FP.Physics;
    // grass with stripes
    S.block(0, -0.5, 0, L + 8, 1, W + 8, 0x6ccf5a);
    for (let i = 0; i < 8; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(L / 8, W), FP.Look.toon(i % 2 ? 0x7ad866 : 0x66c455));
      stripe.rotation.x = -Math.PI / 2; stripe.position.set(-L / 2 + L / 16 + i * L / 8, 0.005, 0); stripe.receiveShadow = true;
      S.add(stripe);
    }
    const line = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z); S.add(m); };
    line(0, 0, 0.15, W); line(0, -W / 2, L, 0.15); line(0, W / 2, L, 0.15); line(-L / 2, 0, 0.15, W); line(L / 2, 0, 0.15, W);
    for (const s of [-1, 1]) { // penalty boxes
      line(s * (L / 2 - 3.5), 0, 0.15, GOAL_W + 4); line(s * (L / 2 - 1.75), -(GOAL_W / 2 + 2), 3.5, 0.15); line(s * (L / 2 - 1.75), GOAL_W / 2 + 2, 3.5, 0.15);
    }
    const circle = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.55, 40), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    circle.rotation.x = -Math.PI / 2; circle.position.y = 0.01; S.add(circle);
    // boards all around (with gaps for the goals), and invisible tall walls that only stop the ball
    const wallH = 1.0, wallC = 0xfff1d6, sideLen = (W - GOAL_W) / 2;
    S.block(0, wallH / 2, -W / 2 - 0.5, L + 2, wallH, 1, wallC);
    S.block(0, wallH / 2, W / 2 + 0.5, L + 2, wallH, 1, wallC);
    for (const sx of [-1, 1]) { for (const sz of [-1, 1]) S.block(sx * (L / 2 + 0.5), wallH / 2, sz * (GOAL_W / 2 + sideLen / 2), 1, wallH, sideLen, wallC); goal(sx); }
    const ballWall = (x, y, z, w, h, d) => { const b = P.staticBox(x, y, z, w, h, d); b.collisionFilterMask = P.GROUP.PROP; S.bodies.push(b); };
    ballWall(0, 4, -W / 2 - 0.5, L + 2, 8, 1); ballWall(0, 4, W / 2 + 0.5, L + 2, 8, 1);
    for (const sx of [-1, 1]) { for (const sz of [-1, 1]) ballWall(sx * (L / 2 + 0.5), 4, sz * (GOAL_W / 2 + sideLen / 2), 1, 8, sideLen); ballWall(sx * (L / 2 + 0.5), GOAL_H + 2.8, 0, 1, 5, GOAL_W); }
    const crowd = FP.Props.crowd(3, 18, 1.5); crowd.position.set(0, 0, -(W / 2 + 2.2)); S.add(crowd);
    const boards = [0xff5a5f, 0xffcf33, 0x4aa8ff, 0x5cc44a];
    for (let i = 0; i < 4; i++) { const b = FP.Look.boxMesh((L + 4) / 4 - 0.2, 0.6, 0.2, FP.Look.toon(boards[i]), 0.03); b.position.set(-L / 2 - 2 + (i + 0.5) * ((L + 4) / 4), 0.3, W / 2 + 1.6); S.add(b); }
    // the ball
    ball = makeBall();
    // a goalkeeper in each goal (they have big gloves!)
    [0, 1].forEach((team) => {
      const x = -goalX(team) * 0.94;
      const c = FP.Ragdoll.create(S.scene, { index: 6 + team, colorIndex: team === 0 ? 0 : 1, hat: 'beanie', name: 'Keeper', x, y: 0, z: 0, yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2 });
      c.isKeeper = true; c.team = team;
      for (const arm of c.meshes.arms || []) { const glove = FP.Look.mesh(new THREE.SphereGeometry(0.17, 12, 10), FP.Look.toon(0xffcf33), 0.02); glove.position.y = -0.25; arm.add(glove); }
      keepers.push({ c, team, x, hold: 0, dive: 0 });
    });
    S.onClear(() => { keepers.forEach((k) => FP.Ragdoll.remove(k.c)); keepers = []; });
    kickoff();
    FP.Camera.setAngle(0.95, 0.75);
    void list;
  }

  function goal(side) {
    const x = side * (L / 2 + 1.2);
    const posts = [[x, GOAL_H / 2, -GOAL_W / 2, 0.25, GOAL_H, 0.25], [x, GOAL_H / 2, GOAL_W / 2, 0.25, GOAL_H, 0.25], [x, GOAL_H, 0, 0.25, 0.25, GOAL_W + 0.25]];
    posts.forEach(([px, py, pz, w, h, d]) => FP.Stage.block(px, py, pz, w, h, d, 0xffffff));
    const netMat = new THREE.MeshBasicMaterial({ color: side < 0 ? 0xffc2c4 : 0xc2e0ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_W, GOAL_H), netMat);
    back.rotation.y = Math.PI / 2; back.position.set(x + side * 1.8, GOAL_H / 2, 0); FP.Stage.add(back);
    FP.Stage.bodies.push(FP.Physics.staticBox(x + side * 1.9, GOAL_H / 2, 0, 0.2, GOAL_H, GOAL_W));
    for (const sz of [-1, 1]) {
      FP.Stage.bodies.push(FP.Physics.staticBox(x + side * 0.95, GOAL_H / 2, sz * GOAL_W / 2, 1.9, GOAL_H, 0.2));
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.9, GOAL_H), netMat); s.position.set(x + side * 0.95, GOAL_H / 2, sz * GOAL_W / 2); FP.Stage.add(s);
    }
    FP.Stage.bodies.push(FP.Physics.staticBox(x + side * 0.95, GOAL_H + 0.1, 0, 1.9, 0.2, GOAL_W));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1.9, GOAL_W), new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff5a5f : 0x4aa8ff, transparent: true, opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(x + side * 0.95, 0.02, 0); FP.Stage.add(floor);
  }

  function makeBall() {
    const g = new THREE.Group();
    g.add(FP.Look.mesh(new THREE.SphereGeometry(R, 20, 14), FP.Look.toon(0xffffff), 0.03));
    const patch = FP.Look.toon(0x2a2140), ico = new THREE.IcosahedronGeometry(1, 0), pos = ico.attributes.position, seen = new Set();
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
      const key = v.toArray().map((n) => n.toFixed(2)).join();
      if (seen.has(key)) continue;
      seen.add(key);
      const p = new THREE.Mesh(new THREE.CircleGeometry(R * 0.3, 5), patch);
      p.position.copy(v).multiplyScalar(R * 1.01); p.lookAt(v.clone().multiplyScalar(3)); g.add(p);
    }
    const body = new CANNON.Body({ mass: 0.45, material: FP.Physics.mats.ball, linearDamping: 0.35, angularDamping: 0.3,
      collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.GROUP.WORLD }); // players don't bump it: they dribble it
    body.addShape(new CANNON.Sphere(R));
    return FP.Stage.prop(g, body);
  }

  function kickoff() { owner = null; ball.body.position.set(0, R + 0.5, 0); ball.body.velocity.set(0, 0, 0); ball.body.angularVelocity.set(0, 0, 0); }

  function spawn(i, n, p) {
    const team = p.team, k = Math.floor(i / 2);
    const x = (team === 0 ? -1 : 1) * (4 + k * 3.5);
    const z = (k % 2 ? -1 : 1) * 2.5 * (k ? 1 : 0.2);
    return { x, y: 0, z, yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2 };
  }
  function resetPlayers(chars) { chars.forEach((c, i) => { const s = spawn(i, chars.length, c.player); FP.Ragdoll.teleport(c, s.x, 0, s.z, s.yaw); }); }

  const pos = (c) => c.parts.torso.position;
  const dist2 = (a, x, z) => Math.hypot(a.x - x, a.z - z);

  // ---------------- kicking, passing, tackling ----------------
  function kick(c, vx, vz, lift) {
    const b = ball.body;
    owner = null; pickCool.set(c, 0.45); lastTouch = c;
    b.velocity.set(vx, lift, vz);
    b.angularVelocity.set(vz * 2, 0, -vx * 2);
    c.punchT = 0; c.punchHit = true;
    FP.Audio.play('hit');
  }
  function shoot(c) {
    let fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const p = pos(c), gx = goalX(c.team);
    // facing the goal? your shot aims for a corner (a little help)
    const dx = gx - p.x, dz = -p.z, d = Math.hypot(dx, dz);
    if ((dx * fx + dz * fz) / d > 0.45) {
      const tz = (Math.random() < 0.5 ? -1 : 1) * GOAL_W * (0.18 + Math.random() * 0.22);
      const ax = gx - p.x, az = tz - p.z, al = Math.hypot(ax, az);
      fx = ax / al; fz = az / al;
    }
    const sp = 17;
    kick(c, fx * sp, fz * sp, 1.5 + Math.random() * 2);
  }
  function pass(c) {
    const p = pos(c), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const mates = FP.Game.chars.filter((o) => o !== c && o.team === c.team && o.ko <= 0);
    if (!mates.length) { kick(c, fx * 9, fz * 9, 0.5); return; }
    let best = null, bs = -Infinity;
    for (const m of mates) { const q = pos(m), dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1; const s = (dx * fx + dz * fz) / d * 2 - d * 0.06; if (s > bs) { bs = s; best = m; } }
    const q = pos(best), v = best.parts.torso.velocity;
    const d = dist2(p, q.x, q.z), T = 0.3 + d / 14;
    const tx = q.x + v.x * T, tz = q.z + v.z * T;
    const ax = tx - p.x, az = tz - p.z, al = Math.hypot(ax, az) || 1;
    const sp = Math.min(16, al / T * 1.15);
    kick(c, (ax / al) * sp, (az / al) * sp, 0.4);
  }
  function tackle(c, slide) {
    if (!owner || owner.team === c.team || owner.isKeeper) return;
    const o = pos(owner), p = pos(c);
    if (dist2(o, p.x, p.z) > (slide ? 2 : 1.5)) return;
    const odds = slide ? 0.75 : c.isBot ? ({ easy: 0.2, normal: 0.3, hard: 0.4 }[c.botSkill] || 0.3) : 0.45;
    if (Math.random() < odds) {
      FP.FX.word(owner.parts.head.position, slide ? 'SLIDE TACKLE!' : 'TACKLED!', '#ffcf33', 1.2);
      const loser = owner;
      pickCool.set(loser, 0.9);
      if (slide) { const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw); kick(c, fx * 6, fz * 6, 1); pickCool.set(c, 0.2); }
      else { owner = c; lastTouch = c; }
      loser.stagger = 0.4;
      FP.Audio.play('grab');
    }
  }

  // sport controls: ball buttons become soccer moves, the rest is normal floppy moving
  function control(c, input, dt, playing) {
    const inp = input || {};
    const grabEdge = !!inp.grab && !c.scGrab;
    c.scGrab = !!inp.grab;
    let punch = inp.punchPressed, jump = inp.jumpPressed;
    if (playing && pause <= 0) {
      if (owner === c) {
        if (inp.punchPressed) { shoot(c); punch = false; }
        else if (grabEdge) pass(c);
      } else {
        if (inp.punchPressed) tackle(c, false);
        if (inp.jumpPressed && c.grounded && owner && owner.team !== c.team && dist2(pos(owner), pos(c).x, pos(c).z) < 4) {
          // slide tackle: dive forward along the grass
          const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
          for (const b of c.bodies) { b.velocity.x += fx * 7; b.velocity.z += fz * 7; b.velocity.y += 1; }
          c.stagger = 0.6; jump = false;
          tackle(c, true);
          FP.Audio.play('whoosh');
        }
      }
    }
    FP.Ragdoll.control(c, { x: inp.x || 0, z: inp.z || 0, jump: inp.jump, jumpPressed: jump, punchPressed: owner === c ? false : punch, grab: false, emote: inp.emote }, dt);
  }

  // the goalkeepers: stay on the goal line, follow the ball, dive for shots, catch and throw it out
  function keeperThink(k, dt, playing) {
    const c = k.c, p = pos(c), b = ball.body.position, v = ball.body.velocity;
    const homeX = k.x, sgn = Math.sign(homeX);
    const input = { x: 0, z: 0 };
    if (!playing) { /* stand still during the countdown */ } else if (owner === c) {
      k.hold -= dt;
      input.x = -sgn * 0.3;
      if (k.hold <= 0) {
        // throw it out to a teammate
        const mates = FP.Game.chars.filter((o) => o.team === k.team && o.ko <= 0);
        const m = mates.length ? mates.reduce((a, o) => (!a || Math.abs(pos(o).x - homeX) < Math.abs(pos(a).x - homeX) ? o : a), null) : null;
        const tx = m ? pos(m).x : homeX - sgn * 8, tz = m ? pos(m).z : (Math.random() - 0.5) * 6;
        const ax = tx - p.x, az = tz - p.z, al = Math.hypot(ax, az) || 1;
        owner = null; pickCool.set(c, 1);
        ball.body.position.set(p.x - sgn * 0.6, 1.2, p.z);
        ball.body.velocity.set((ax / al) * Math.min(13, al * 1.2), 4, (az / al) * Math.min(13, al * 1.2));
      }
    } else {
      const tz = Math.max(-GOAL_W / 2 + 0.4, Math.min(GOAL_W / 2 - 0.4, b.z * 0.7));
      const tx = homeX - sgn * Math.min(2.5, Math.max(0.3, (Math.abs(b.x) < L / 2 - 6 ? 0.8 : 1.6)));
      input.x = Math.max(-1, Math.min(1, (tx - p.x) * 2)); input.z = Math.max(-1, Math.min(1, (tz - p.z) * 2.5));
      if (Math.hypot(input.x, input.z) < 0.15) { input.x = 0; input.z = 0; }
      // a shot coming in: dive!
      const coming = v.x * sgn > 4 && Math.abs(b.x - p.x) < 5 && k.dive <= 0 && c.grounded;
      if (coming) {
        const tHit = Math.abs((p.x - b.x) / v.x);
        const hitZ = b.z + v.z * tHit;
        const off = hitZ - p.z;
        if (Math.abs(off) > 0.5 && Math.abs(off) < 3.2) {
          k.dive = 1.2;
          for (const bd of c.bodies) { bd.velocity.z += Math.sign(off) * Math.min(7, Math.abs(off) * 3.5); bd.velocity.y += 2.5; }
          c.expression = 'oh'; c.exprTimer = 1;
        }
      }
    }
    k.dive -= dt;
    c.yaw = sgn > 0 ? -Math.PI / 2 : Math.PI / 2;
    FP.Ragdoll.control(c, input, dt);
    c.yaw = sgn > 0 ? -Math.PI / 2 : Math.PI / 2; // always faces the field
  }

  // the ball stays at the feet of whoever dribbles it
  function beforeStep(dt) {
    const playing = FP.Game.state === 'play';
    for (const k of keepers) keeperThink(k, dt, playing);
    const b = ball.body;
    if (owner) {
      const p = pos(owner);
      const hands = owner.isKeeper;
      const fx = Math.sin(owner.yaw), fz = Math.cos(owner.yaw);
      const v = owner.parts.torso.velocity, sp = Math.hypot(v.x, v.z);
      roll += sp * dt / R;
      b.position.set(p.x + fx * (hands ? 0.5 : 0.7), hands ? p.y : R, p.z + fz * (hands ? 0.5 : 0.7));
      b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
      b.quaternion.setFromAxisAngle(new CANNON.Vec3(fz, 0, -fx), roll);
    }
  }

  function scoredGoal(team) {
    const g = FP.Game;
    g.scores['team' + team]++;
    pause = 2.6;
    const who = lastTouch && !lastTouch.isKeeper && lastTouch.team === team ? `${lastTouch.name} scores!` : lastTouch && !lastTouch.isKeeper ? `Oops! ${lastTouch.name} scored for the other team!` : '';
    FP.UI.big('GOAL!', 2.4, who);
    FP.Audio.play('goal'); FP.Props.hype();
    FP.FX.confetti(new THREE.Vector3(ball.body.position.x, 0, 0), 150, 6);
    FP.Camera.shake(0.6);
    if (FP.Net) FP.Net.banner('GOAL!', who);
    self.lastGoal = team;
  }

  // team rings under everyone's feet (also used by online friends)
  function visual(dt, chars) {
    if (!rings.length && chars.length) {
      for (const c of chars) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 24), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[c.team], transparent: true, opacity: 0.9 }));
        ring.rotation.x = -Math.PI / 2; FP.Stage.add(ring); rings.push([ring, c]);
      }
    }
    for (const [ring, c] of rings) ring.position.set(c.parts.torso.position.x, 0.03, c.parts.torso.position.z);
  }

  function update(dt, chars, g, roundOver) {
    for (const k of keepers) { FP.Ragdoll.sync(k.c, dt); if (pos(k.c).y < -6) FP.Ragdoll.teleport(k.c, k.x, 0, 0); }
    visual(dt, chars);
    if (roundOver || dt === 0) return null;
    for (const c of chars) if (pos(c).y < -6) FP.Ragdoll.teleport(c, 0, 1, (Math.random() - 0.5) * 6);
    for (const [c, t] of pickCool) pickCool.set(c, t - dt);
    const b = ball.body.position;
    if (b.y < -6) kickoff();

    if (pause > 0) {
      pause -= dt;
      if (pause <= 0) {
        if (golden && self.lastGoal !== undefined) { const t = self.lastGoal; return { team: t, points: 0, text: `Golden goal! ${t ? 'Blue' : 'Red'} team wins!` }; }
        resetPlayers(chars); kickoff();
        FP.UI.big('Kick off!', 1);
      }
      return null;
    }
    clock -= dt;
    // GOAL?
    if (Math.abs(b.x) > L / 2 + 1.1 && Math.abs(b.z) < GOAL_W / 2 && b.y < GOAL_H) { scoredGoal(b.x > 0 ? 0 : 1); return null; }
    // pick up a loose ball: players with their feet, keepers with their hands (in their own box)
    if (!owner) {
      for (const k of keepers) {
        if ((pickCool.get(k.c) || 0) > 0 || k.c.ko > 0) continue;
        const kp = pos(k.c);
        if (Math.hypot(kp.x - b.x, kp.z - b.z) < 1.1 && b.y < 2.3 && Math.abs(b.x) > L / 2 - 4) {
          const fast = Math.hypot(ball.body.velocity.x, ball.body.velocity.z) > 11;
          if (fast && Math.random() < 0.3) { ball.body.velocity.x *= -0.4; ball.body.velocity.z += (Math.random() - 0.5) * 6; FP.FX.word(k.c.parts.head.position, 'SAVE!', '#ffffff', 1.1); pickCool.set(k.c, 0.5); FP.Audio.play('bonk'); break; }
          owner = k.c; k.hold = 1.2; lastTouch = k.c;
          FP.FX.word(k.c.parts.head.position, 'CAUGHT!', '#ffffff', 1.1); FP.Audio.play('grab');
          break;
        }
      }
    }
    if (!owner && b.y < 1.2) {
      for (const c of chars) {
        if (c.ko > 0 || (pickCool.get(c) || 0) > 0) continue;
        const p = pos(c);
        if (Math.hypot(p.x - b.x, p.z - b.z) < 0.95) { owner = c; lastTouch = c; FP.Audio.play('grab'); break; }
      }
    }
    if (owner && owner.ko > 0) { owner = null; ball.body.velocity.set(0, 1.5, 0); }
    // the halves
    if (clock <= 0 && !golden) {
      if (half === 1) {
        half = 2; clock = HALF; pause = 2;
        FP.UI.big('Half time!', 1.8, 'Second half next'); if (FP.Net) FP.Net.banner('Half time!', '');
        FP.Audio.play('alarm');
      } else {
        const sc = g.scores;
        if (sc.team0 !== sc.team1) { const t = sc.team0 > sc.team1 ? 0 : 1; return { team: t, points: 0, text: `Full time! ${t ? 'Blue' : 'Red'} team wins ${Math.max(sc.team0, sc.team1)} to ${Math.min(sc.team0, sc.team1)}!` }; }
        golden = true; clock = 60; pause = 2; self.lastGoal = undefined;
        FP.UI.big('Golden goal!', 2.2, 'The next goal wins'); if (FP.Net) FP.Net.banner('Golden goal!', 'The next goal wins');
      }
    }
    if (golden && clock <= 0) return { text: "It's a draw!", sub: 'Nobody scored the golden goal' };
    return null;
  }

  // ---------------- bots ----------------
  function botThink(c, chars, dt, input, tools) {
    const p = pos(c), b = ball.body.position;
    const gx = goalX(c.team), myGoal = goalX(1 - c.team);
    const mates = chars.filter((o) => o.team === c.team);
    const closestTo = (list, x, z) => list.reduce((a, o) => (o.ko > 0 ? a : !a || dist2(pos(o), x, z) < dist2(pos(a), x, z) ? o : a), null);
    const br = tools.brain;
    if (owner === c) {
      br.holdT = (br.holdT || 0) + dt;
      if (br.lane === undefined) { br.lane = (Math.random() - 0.5) * 6; br.shootAt = 6 + Math.random() * 5; }
      const d = dist2(p, gx, 0);
      tools.steer(c, gx, d > 7 ? br.lane : 0, input);
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      const facing = ((gx - p.x) * fx + -p.z * fz) / d;
      const blocked = chars.some((o) => o.team !== c.team && dist2(pos(o), p.x + fx * 1.2, p.z + fz * 1.2) < 1.2);
      const mate = mates.find((m) => m !== c && Math.abs(gx - pos(m).x) < Math.abs(gx - p.x) - 1);
      if (d < br.shootAt && facing > 0.6 && br.holdT > 0.4) input.punchPressed = true;
      else if (blocked && mate && br.holdT > 0.5 && Math.random() < dt * 2) input.grab = true;
      else if (br.holdT > 7) input.punchPressed = true;
      return true;
    }
    br.holdT = 0; br.lane = undefined;
    if (!owner || owner.isKeeper) {
      if (closestTo(mates, b.x, b.z) === c) tools.steer(c, b.x, b.z, input);
      else { tools.steer(c, (b.x + gx) * 0.5, c.index % 2 ? 3 : -3, input); input.x *= 0.7; input.z *= 0.7; }
    } else if (owner.team === c.team) {
      // support the attack: run ahead into space
      tools.steer(c, Math.max(-L / 2 + 2, Math.min(L / 2 - 2, pos(owner).x + Math.sign(gx) * 5)), pos(owner).z > 0 ? -3.5 : 3.5, input);
      input.x *= 0.85; input.z *= 0.85;
    } else {
      const q = pos(owner);
      if (closestTo(mates, q.x, q.z) === c) {
        // get between them and our goal, then tackle
        const d = tools.steer(c, q.x + Math.sign(myGoal - q.x) * 0.8, q.z, input);
        if (d < 1.3 && Math.random() < dt * 2.5) input.punchPressed = true;
        else if (d < 2.4 && d > 1.2 && c.grounded && Math.random() < dt * 0.8) input.jumpPressed = true;
      } else { tools.steer(c, myGoal - Math.sign(myGoal) * 7, q.z * 0.5, input); input.x *= 0.8; input.z *= 0.8; }
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const label = golden ? 'Golden goal: the next goal wins!' : `${half === 1 ? '1st' : '2nd'} half &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(clock)}`;
    return `<span>${label}</span><span class="hud-tip">PUNCH: shoot &nbsp; GRAB: pass &nbsp; No ball? JUMP: slide tackle, PUNCH: tackle</span>`;
  }

  self = {
    id: 'soccer', name: 'Soccer', roundsToWin: 1, single: true, teams: true, minTotal: 2, song: 'race', minZoom: 18,
    art: '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#7ad866"/><rect x="0" y="0" width="30" height="80" fill="#66c455"/><rect x="60" y="0" width="30" height="80" fill="#66c455"/><path d="M60 0v80" stroke="#fff" stroke-width="2.5"/><circle cx="60" cy="40" r="14" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M104 26h12v28h-12" fill="#c2e0ff" stroke="#fff" stroke-width="3"/><circle cx="84" cy="48" r="6" fill="#fff" stroke="#2a2140" stroke-width="2"/><path d="M84 44l3 2-1 4h-4l-1-4z" fill="#2a2140"/><ellipse cx="70" cy="44" rx="7" ry="9" fill="#ff5a5f" stroke="#2a2140" stroke-width="2.5"/><circle cx="70" cy="31" r="6" fill="#ff5a5f" stroke="#2a2140" stroke-width="2.5"/><ellipse cx="108" cy="40" rx="5" ry="7" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="104" cy="34" r="3" fill="#ffcf33" stroke="#2a2140" stroke-width="1.5"/></svg>',
    desc: 'Real soccer with goalkeepers! Dribble the ball, PUNCH to shoot, GRAB to pass, JUMP to slide tackle. Two halves.',
    build, spawn, control, beforeStep, update, botThink, hud, visual,
    focus: (chars) => {
      const b = ball ? ball.body.position : new THREE.Vector3();
      const pts = [new THREE.Vector3(b.x, 0, b.z)];
      chars.map((c) => ({ c, d: dist2(pos(c), b.x, b.z) })).sort((a, z) => a.d - z.d).slice(0, 2).forEach((o) => pts.push(FP.Ragdoll.center(o.c)));
      // near a goal? keep that goal on the screen too
      if (Math.abs(b.x) > 5) pts.push(new THREE.Vector3(Math.sign(b.x) * (L / 2 + 0.5), 0, 0));
      return pts;
    },
    netState: () => ({ p: pause > 0 ? 1 : 0, h: half, c: Math.round(clock), g: golden ? 1 : 0 }),
    applyNetState: (s) => { pause = s.p ? 1 : 0; half = s.h; clock = s.c; golden = !!s.g; },
  };
  return self;
})();
