// ============================================================
//  FLOPPY PARTY — BASKETBALL (the real thing!)
//  Red team vs Blue team, 4 quarters.
//    Run into the ball to pick it up (you dribble by yourself).
//    PUNCH: shoot! Jump near the hoop and punch to SLAM DUNK.
//    GRAB: pass to a teammate.
//    No ball? PUNCH the player with the ball to steal it, and
//    JUMP in front of a shot to block it.
//  2 points, 3 from behind the big line. After a basket the
//  other team gets the ball. Tied after 4 quarters? Next basket wins!
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.hoops = (function () {
  const L = 26, W = 15, RIM_Y = 3.1, RIM_R = 0.55, BR = 0.3, THREE_PT = 6.7, QUARTER = 40, QUARTERS = 4;
  let ball = null, owner = null, lastY = 0, shot = null, resetT = 0, clock = QUARTER, quarter = 1, overtime = false, breakT = 0, pickCool = new Map(), self = null;
  // team 0 (Red) shoots at the hoop on the right (+x), team 1 (Blue) at the left
  const hoopX = (team) => (team === 0 ? 1 : -1) * (L / 2 - 1.6);

  function build() {
    owner = null; shot = null; resetT = 0; clock = QUARTER; quarter = 1; overtime = false; breakT = 0; pickCool = new Map();
    self.inbound = 0; self.suddenWin = undefined;
    const S = FP.Stage;
    S.block(0, -0.5, 0, L + 6, 1, W + 6, 0xd9a86c);
    const court = new THREE.Mesh(new THREE.PlaneGeometry(L, W), FP.Look.toon(0xf0c98a));
    court.rotation.x = -Math.PI / 2; court.position.y = 0.01; court.receiveShadow = true; S.add(court);
    const line = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); S.add(m); };
    line(0, 0, 0.15, W); line(0, -W / 2, L, 0.15); line(0, W / 2, L, 0.15); line(-L / 2, 0, 0.15, W); line(L / 2, 0, 0.15, W);
    for (const team of [0, 1]) {
      const hx = hoopX(team), s = Math.sign(hx);
      // the 3-point line and the painted area under the hoop
      const arc = new THREE.Mesh(new THREE.RingGeometry(THREE_PT - 0.07, THREE_PT + 0.07, 48, 1, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      arc.rotation.x = -Math.PI / 2; arc.position.set(hx, 0.02, 0); S.add(arc);
      const paint = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.6), FP.Look.toon(team === 0 ? 0xffb3b0 : 0xb5dcff));
      paint.rotation.x = -Math.PI / 2; paint.position.set(hx - s * 1.2, 0.015, 0); S.add(paint);
    }
    const circle = new THREE.Mesh(new THREE.RingGeometry(2, 2.15, 40), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    circle.rotation.x = -Math.PI / 2; circle.position.y = 0.02; S.add(circle);
    // low walls around the court, and invisible tall ones that only stop the ball
    S.block(0, 0.4, -W / 2 - 0.4, L + 1, 0.8, 0.4, 0xff9a3c);
    S.block(0, 0.4, W / 2 + 0.4, L + 1, 0.8, 0.4, 0xff9a3c);
    S.block(-L / 2 - 0.4, 0.4, 0, 0.4, 0.8, W + 1, 0xff9a3c);
    S.block(L / 2 + 0.4, 0.4, 0, 0.4, 0.8, W + 1, 0xff9a3c);
    for (const [x, z, w, d] of [[0, -W / 2 - 0.4, L + 1, 0.4], [0, W / 2 + 0.4, L + 1, 0.4], [-L / 2 - 0.4, 0, 0.4, W + 1], [L / 2 + 0.4, 0, 0.4, W + 1]]) {
      const b = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: FP.Physics.GROUP.NPC, collisionFilterMask: FP.Physics.GROUP.PROP });
      b.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, 4, d / 2))); b.position.set(x, 4, z);
      FP.Physics.world.addBody(b); S.bodies.push(b);
    }
    // the two hoops: pole, backboard, a real rim the ball can bounce off, and a net
    for (const team of [0, 1]) {
      const hx = hoopX(team), s = Math.sign(hx);
      S.block(hx + s * 1.3, RIM_Y / 2 + 0.4, 0, 0.3, RIM_Y + 0.8, 0.3, 0x8a8fa0);
      S.block(hx + s * 0.75, RIM_Y + 0.7, 0, 0.12, 1.4, 2.2, 0xffffff);
      const sq = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ color: team === 0 ? 0xff5a5f : 0x4aa8ff }));
      sq.rotation.y = -s * Math.PI / 2; sq.position.set(hx + s * 0.68, RIM_Y + 0.5, 0); S.add(sq);
      const rim = FP.Look.mesh(new THREE.TorusGeometry(RIM_R, 0.05, 8, 24), FP.Look.toon(0xff6a1a), 0.015);
      rim.rotation.x = Math.PI / 2; rim.position.set(hx, RIM_Y, 0); S.add(rim);
      const rb = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: FP.Physics.mats.floor, collisionFilterGroup: FP.Physics.GROUP.WORLD, collisionFilterMask: FP.Physics.GROUP.PROP });
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; rb.addShape(new CANNON.Sphere(0.06), new CANNON.Vec3(Math.cos(a) * RIM_R, 0, Math.sin(a) * RIM_R)); }
      rb.position.set(hx, RIM_Y, 0);
      FP.Physics.world.addBody(rb); S.bodies.push(rb);
      const net = new THREE.Mesh(new THREE.CylinderGeometry(RIM_R, RIM_R * 0.6, 0.6, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
      net.position.set(hx, RIM_Y - 0.3, 0); S.add(net);
      net.userData.team = team;
    }
    const k = FP.Kit.ball(BR, [0xff8a2a, 0xe0661a, 0xff8a2a, 0xe0661a], 0.6);
    k.body.collisionFilterMask = FP.Physics.GROUP.WORLD | FP.Physics.GROUP.NPC; // players don't bump the ball around (they catch it)
    k.body.position.set(0, 3, 0);
    ball = FP.Stage.prop(k.mesh, k.body);
    lastY = 3;
    const fans = FP.Props.crowd(2, 14, 1.6); fans.position.set(0, 0, -W / 2 - 1.8); S.add(fans);
    const fans2 = FP.Props.crowd(1, 14, 1.6); fans2.position.set(0, 0, W / 2 + 2); fans2.rotation.y = Math.PI; S.add(fans2);
    FP.Camera.setAngle(0.95, 0.75);
  }

  function spawn(i, n, p) {
    const team = p.team, k = p && p.teamRank !== undefined ? p.teamRank : Math.floor(i / 2); // (k = place in the team)
    return { x: (team === 0 ? -1 : 1) * (3.5 + k * 2.5), y: 0, z: (k % 2 ? -2 : 2) * (k ? 1 : 0.4), yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  const pos = (c) => c.parts.torso.position;
  const dist2 = (a, x, z) => Math.hypot(a.x - x, a.z - z);
  function jumpBall() { owner = null; shot = null; ball.body.position.set(0, 3.2, 0); ball.body.velocity.set(0, 2, 0); ball.body.angularVelocity.set(0, 0, 0); lastY = 3; }

  // ---------------- shooting, dunking, passing, stealing ----------------
  function shoot(c) {
    const p = pos(c), hx = hoopX(c.team);
    const d = dist2(p, hx, 0);
    const b = ball.body;
    owner = null; pickCool.set(c, 0.5);
    // DUNK: in the air, right by the hoop
    if (!c.grounded && d < 2.6) {
      b.position.set(hx, RIM_Y + 0.6, 0); b.velocity.set(0, -5, 0); b.angularVelocity.set(0, 0, 0);
      for (const bd of c.bodies) { bd.velocity.x += (hx - p.x) * 2; bd.velocity.y += 3; bd.velocity.z += -p.z * 2; }
      shot = { by: c, team: c.team, from: 0, dunk: true, t: 0 };
      FP.Camera.shake(0.5); FP.Audio.play('whoosh');
      return;
    }
    // a jump shot: how likely it goes in depends on how far, and if someone is guarding you
    const guarded = FP.Game.chars.some((o) => o.team !== c.team && o.ko <= 0 && dist2(pos(o), p.x, p.z) < 1.5);
    const easy = c.isBot ? 0 : 0.08; // people get a little help
    const chance = Math.max(0.12, Math.min(0.92, 0.9 + easy - d * 0.055 - (guarded ? 0.25 : 0) - (c.grounded ? 0 : -0.05)));
    const make = Math.random() < chance;
    let tx = hx, tz = 0;
    if (!make) { const a = Math.random() * Math.PI * 2, off = RIM_R + 0.1 + Math.random() * 0.25; tx += Math.cos(a) * off; tz += Math.sin(a) * off; }
    const g = -FP.Physics.world.gravity.y;
    const T = 0.75 + d * 0.06;
    const sx = p.x + Math.sign(hx - p.x) * 0.3, sy = p.y + 0.9;
    b.position.set(sx, sy, p.z);
    b.velocity.set((tx - sx) / T, (RIM_Y + 0.12 - sy) / T + 0.5 * g * T, (tz - p.z) / T);
    b.angularVelocity.set(0, 0, -8 * Math.sign(hx - p.x));
    shot = { by: c, team: c.team, from: d, dunk: false, t: 0 };
    c.punchT = 0; c.punchHit = true; // arm up for the shot
    FP.Audio.play('whoosh');
  }

  function pass(c) {
    const p = pos(c), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const mates = FP.Game.chars.filter((o) => o !== c && o.team === c.team && o.ko <= 0);
    if (!mates.length) return;
    // the teammate most in front of you (or just the nearest)
    let best = null, bs = -Infinity;
    for (const m of mates) {
      const q = pos(m), dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz) || 1;
      const s = (dx * fx + dz * fz) / d * 2 - d * 0.08;
      if (s > bs) { bs = s; best = m; }
    }
    const q = pos(best), b = ball.body;
    owner = null; pickCool.set(c, 0.6);
    const d = dist2(p, q.x, q.z), T = 0.35 + d * 0.035, g = -FP.Physics.world.gravity.y;
    const tx = q.x + best.parts.torso.velocity.x * T, tz = q.z + best.parts.torso.velocity.z * T;
    b.position.set(p.x, p.y + 0.5, p.z);
    b.velocity.set((tx - p.x) / T, (q.y + 0.2 - (p.y + 0.5)) / T + 0.5 * g * T, (tz - p.z) / T);
    shot = null;
    FP.Audio.play('whoosh');
  }

  function trySteal(c) {
    if (!owner || owner.team === c.team) return;
    const o = pos(owner), p = pos(c);
    if (dist2(o, p.x, p.z) > 1.6) return;
    const odds = c.isBot ? ({ easy: 0.2, normal: 0.3, hard: 0.4 }[c.botSkill] || 0.3) : 0.5;
    if (Math.random() < odds) {
      FP.FX.word(owner.parts.head.position, 'STOLEN!', '#ffcf33', 1.2);
      pickCool.set(owner, 0.8);
      owner = c;
      FP.Audio.play('grab');
    }
  }

  // sport controls: the ball buttons are swapped for basketball moves, the rest is normal floppy moving
  function control(c, input, dt, playing) {
    const inp = input || {};
    const grabEdge = !!inp.grab && !c.bbGrab;
    c.bbGrab = !!inp.grab;
    let punch = inp.punchPressed;
    if (playing && breakT <= 0 && resetT <= 0) {
      if (owner === c) {
        if (inp.punchPressed) { shoot(c); punch = false; }
        else if (grabEdge) pass(c);
      } else if (inp.punchPressed) trySteal(c);
    }
    FP.Ragdoll.control(c, { x: inp.x || 0, z: inp.z || 0, jump: inp.jump, jumpPressed: inp.jumpPressed, punchPressed: owner === c ? false : punch, grab: false, emote: inp.emote }, dt);
  }

  // the ball: dribbled next to its owner, or flying free
  function beforeStep() {
    const b = ball.body;
    if (owner) {
      const p = pos(owner), fx = Math.sin(owner.yaw), fz = Math.cos(owner.yaw);
      const t = performance.now() / 1000;
      const bounce = Math.abs(Math.sin(t * 7));
      b.position.set(p.x + fx * 0.45 - fz * 0.25, BR + bounce * 0.75, p.z + fz * 0.45 + fx * 0.25);
      b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
    }
  }

  function scored(team, pts, how) {
    const game = FP.Game;
    game.scores['team' + team] += pts;
    const hx = hoopX(team);
    const who = shot && shot.by && shot.by.team === team ? `${shot.by.name}: ${pts} points!` : `${pts} points for ${team ? 'Blue' : 'Red'}!`;
    FP.UI.big(how, 1.6, who);
    if (FP.Net) FP.Net.banner(how, who);
    FP.FX.confetti(new THREE.Vector3(hx, RIM_Y, 0), 100, 4);
    FP.Audio.play('goal'); FP.Props.hype();
    resetT = 1.4; shot = null;
    self.inbound = 1 - team; // the other team gets the ball
    if (overtime) self.suddenWin = team;
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      const b = ball.body.position;
      for (const [c, t] of pickCool) pickCool.set(c, t - dt);
      if (breakT > 0) {
        breakT -= dt;
        if (breakT <= 0) jumpBall();
      } else if (resetT > 0) {
        resetT -= dt;
        if (resetT <= 0) {
          // inbound: the ball goes to the player of the other team closest to their own end
          const team = self.inbound;
          const mates = chars.filter((c) => c.team === team && c.ko <= 0);
          if (mates.length) { const myEnd = hoopX(1 - team); owner = mates.reduce((a, c) => (!a || Math.abs(pos(c).x - myEnd) < Math.abs(pos(a).x - myEnd) ? c : a), null); }
          else jumpBall();
        }
      } else {
        clock -= dt;
        if (shot) {
          shot.t += dt;
          // a defender jumping right in front of a fresh shot blocks it!
          if (!shot.dunk && shot.t < 0.45) {
            for (const o of chars) {
              if (o.team === shot.team || o.grounded || o.ko > 0) continue;
              const h = o.parts.head.position;
              if (Math.hypot(h.x - b.x, h.z - b.z) < 0.9 && Math.abs(h.y + 0.3 - b.y) < 0.9) {
                ball.body.velocity.set((shot.team === 0 ? -1 : 1) * 4, 1, (Math.random() - 0.5) * 4); // swatted back the other way
                FP.FX.word(new THREE.Vector3(b.x, b.y + 0.6, b.z), 'BLOCKED!', '#4aa8ff', 1.4);
                FP.Audio.play('bonk'); shot = null;
                break;
              }
            }
          }
        }
        // did the ball drop through a hoop?
        for (const team of [0, 1]) {
          const hx = hoopX(team);
          if (!owner && lastY >= RIM_Y && b.y < RIM_Y && Math.hypot(b.x - hx, b.z) < RIM_R) {
            const dunk = shot && shot.dunk;
            const pts = shot && shot.team === team && shot.from > THREE_PT ? 3 : 2;
            scored(team, pts, dunk ? 'SLAM DUNK!' : pts === 3 ? 'THREE POINTER!' : 'SWISH!');
          }
        }
        // a loose ball: whoever runs into it picks it up
        if (!owner && resetT <= 0 && b.y < 2.3) {
          for (const c of chars) {
            if (c.ko > 0 || (pickCool.get(c) || 0) > 0) continue;
            const p = pos(c);
            if (Math.hypot(p.x - b.x, p.z - b.z) < 1.0 && Math.abs(p.y - b.y) < 1.6) {
              owner = c;
              if (shot && shot.team !== c.team) FP.FX.word(c.parts.head.position, 'REBOUND!', '#ffffff', 1);
              shot = null;
              FP.Audio.play('grab');
              break;
            }
          }
        }
        if (owner && owner.ko > 0) { owner = null; ball.body.velocity.set(0, 2, 0); } // knocked out? drop it
        // end of a quarter
        if (clock <= 0 && !overtime) {
          if (quarter < QUARTERS) {
            quarter++; clock = QUARTER; breakT = 1.6; owner = null;
            const txt = quarter === 3 ? 'Halftime!' : `End of quarter ${quarter - 1}`;
            FP.UI.big(txt, 1.5, `Quarter ${quarter} next`); if (FP.Net) FP.Net.banner(txt, '');
            FP.Audio.play('alarm');
          } else if (game.scores.team0 === game.scores.team1) {
            overtime = true; breakT = 1.6; owner = null;
            FP.UI.big('OVERTIME!', 1.6, 'Next basket wins!'); if (FP.Net) FP.Net.banner('OVERTIME!', 'Next basket wins!');
            FP.Audio.play('alarm');
          }
        }
      }
      lastY = b.y;
      if (b.y < -4) jumpBall();
      for (const c of chars) if (pos(c).y < -5) FP.Ragdoll.teleport(c, (c.team === 0 ? -5 : 5), 0.3, 0, c.team === 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    if (roundOver || dt === 0) return null;
    const sc = game.scores;
    if (overtime && self.suddenWin !== undefined && resetT <= 0.2) { const t = self.suddenWin; return { team: t, points: 0, text: `${t ? 'Blue' : 'Red'} wins in overtime!` }; }
    if (!overtime && quarter >= QUARTERS && clock <= 0 && sc.team0 !== sc.team1 && resetT <= 0) {
      const t = sc.team0 > sc.team1 ? 0 : 1;
      return { team: t, points: 0, text: `${t ? 'Blue' : 'Red'} team wins ${Math.max(sc.team0, sc.team1)} to ${Math.min(sc.team0, sc.team1)}!` };
    }
    return null;
  }

  // ---------------- bots ----------------
  function botThink(c, chars, dt, input, tools) {
    const p = pos(c), b = ball.body.position;
    const mates = chars.filter((o) => o.team === c.team);
    const closestTo = (list, x, z) => list.reduce((a, o) => (o.ko > 0 ? a : !a || dist2(pos(o), x, z) < dist2(pos(a), x, z) ? o : a), null);
    const myHoop = hoopX(c.team), theirHoop = hoopX(c.team === 0 ? 1 : 0);
    const br = tools.brain;
    if (owner === c) {
      const d = dist2(p, myHoop, 0);
      const guarded = chars.some((o) => o.team !== c.team && dist2(pos(o), p.x, p.z) < 1.6);
      // drive to the hoop
      tools.steer(c, myHoop - Math.sign(myHoop) * (br.dunker ? 0.8 : 2.5), br.lane || 0, input);
      br.holdT = (br.holdT || 0) + dt;
      if (br.lane === undefined) { br.lane = (Math.random() - 0.5) * 5; br.dunker = Math.random() < 0.4; br.shootAt = 3.5 + Math.random() * 4; }
      const mate = mates.find((m) => m !== c);
      if (guarded && mate && br.holdT > 0.8 && Math.random() < dt * 1.2 && dist2(pos(mate), myHoop, 0) < d) input.grab = true; // pass it!
      else if (br.dunker && d < 2.4) { if (c.grounded && !br.jumped) { input.jumpPressed = true; br.jumped = true; } else if (!c.grounded) input.punchPressed = true; }
      else if (!br.dunker && d < br.shootAt && br.holdT > 0.5) input.punchPressed = true;
      else if (br.holdT > 6) input.punchPressed = true; // don't hold it forever
      return true;
    }
    br.holdT = 0; br.lane = undefined; br.jumped = false;
    if (!owner) {
      if (closestTo(mates, b.x, b.z) === c) tools.steer(c, b.x, b.z, input);
      else { tools.steer(c, myHoop - Math.sign(myHoop) * 5, c.index % 2 ? 2.5 : -2.5, input); input.x *= 0.6; input.z *= 0.6; }
      // block a shot flying past
      if (shot && shot.team !== c.team && shot.t < 0.3 && dist2(p, b.x, b.z) < 2 && c.grounded) input.jumpPressed = true;
    } else if (owner.team === c.team) {
      // teammate has it: get open near the hoop
      tools.steer(c, myHoop - Math.sign(myHoop) * 4.5, c.index % 2 ? 3 : -3, input);
      input.x *= 0.7; input.z *= 0.7;
    } else {
      const q = pos(owner);
      if (closestTo(mates, q.x, q.z) === c) {
        // guard the player with the ball: stand between them and our hoop, poke at the ball
        const gx = q.x + Math.sign(theirHoop - q.x) * 0.9, gz = q.z * 0.9;
        const d = tools.steer(c, gx, gz, input);
        if (d < 1.4 && Math.random() < dt * 2) input.punchPressed = true;
      } else {
        tools.steer(c, theirHoop - Math.sign(theirHoop) * 2.5, q.z * 0.4, input);
        input.x *= 0.8; input.z *= 0.8;
      }
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const tip = 'PUNCH: shoot (jump by the hoop to DUNK) &nbsp; GRAB: pass &nbsp; No ball? PUNCH to steal';
    const label = overtime ? 'OVERTIME: next basket wins!' : `Quarter ${quarter} &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(clock)}`;
    return `<span>${label}</span><span class="hud-tip">${tip}</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><rect x="8" y="50" width="104" height="26" rx="4" fill="#f0c98a" stroke="#2a2140" stroke-width="2"/><rect x="92" y="12" width="4" height="40" fill="#8a8fa0"/><rect x="80" y="10" width="16" height="16" fill="#fff" stroke="#2a2140" stroke-width="2"/><ellipse cx="80" cy="26" rx="8" ry="2.5" fill="none" stroke="#ff6a1a" stroke-width="2.5"/><path d="M73 27l2 9h10l2-9" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="80" cy="20" r="6" fill="#ff8a2a" stroke="#2a2140" stroke-width="2"/><ellipse cx="68" cy="30" rx="6" ry="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2" transform="rotate(35 68 30)"/><circle cx="73" cy="22" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><path d="M60 44l-6 8M64 46l2 8" stroke="#2a2140" stroke-width="2"/><text x="30" y="30" font-size="10" font-weight="900" fill="#ff5a5f">SLAM!</text></svg>';

  self = {
    id: 'hoops', name: 'Basketball', roundsToWin: 1, single: true, teams: true, minTotal: 2, song: 'party', minZoom: 14, art: ART,
    desc: 'Real basketball, Red vs Blue! Run into the ball to pick it up. PUNCH to shoot or dunk, GRAB to pass, PUNCH to steal. 4 quarters.',
    build, spawn, control, beforeStep, update, botThink, hud,
    focus: (chars) => {
      // the camera follows the ball (and the players near it), like on TV
      const b = ball ? ball.body.position : new THREE.Vector3();
      const pts = [new THREE.Vector3(b.x, 0, b.z)];
      chars.map((c) => ({ c, d: dist2(pos(c), b.x, b.z) })).sort((a, z) => a.d - z.d).slice(0, 2).forEach((o) => pts.push(FP.Ragdoll.center(o.c)));
      return pts;
    },
    netState: () => ({ q: quarter, c: Math.round(clock), o: overtime ? 1 : 0 }),
    applyNetState: (s) => { quarter = s.q; clock = s.c; overtime = !!s.o; },
  };
  return self;
})();
