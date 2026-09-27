// ============================================================
//  FLOPPY PARTY — RAGDOLL CHARACTERS
//  Each character is 6 physics pieces joined together:
//  body, head, 2 arms, 2 legs. Invisible "muscles" (forces)
//  keep it standing, walking and punching. When it gets
//  knocked out, the muscles turn off and it goes FLOPPY.
// ============================================================
window.FP = window.FP || {};

FP.Ragdoll = (function () {
  const { Vec3, Quaternion, Body, Sphere, PointToPointConstraint, ConeTwistConstraint } = CANNON;
  const P = FP.Physics;

  // sizes (meters)
  const D = { torsoR: 0.38, torsoH: 0.22, headR: 0.34, armR: 0.085, armL: 0.36, legR: 0.11, legL: 0.28 };
  const STAND = 0.94;          // how high the middle of the body floats above the ground
  const SPEED = 5.2;           // walking speed
  const JUMP = 8.8;
  const MASS = { torso: 4, head: 1, arm: 0.35, leg: 0.5 };
  const TOTAL = MASS.torso + MASS.head + MASS.arm * 2 + MASS.leg * 2;
  const SHOULDER = [new Vec3(-0.41, 0.17, 0), new Vec3(0.41, 0.17, 0)];
  const HIP = [new Vec3(-0.17, -0.4, 0), new Vec3(0.17, -0.4, 0)];
  const ARM_TOP = new Vec3(0, 0.23, 0), HAND = new Vec3(0, -0.25, 0);
  const LEG_TOP = new Vec3(0, 0.25, 0), FOOT = new Vec3(0, -0.24, 0);

  const all = [];
  const UP = new Vec3(0, 1, 0);

  // ------------------------------------------------------------
  function makeBody(mass, shapes, group, material) {
    const b = new Body({ mass, material, collisionFilterGroup: group, collisionFilterMask: P.ALL & ~group, linearDamping: 0.05, angularDamping: 0.3 });
    for (const [shape, offset] of shapes) b.addShape(shape, offset);
    P.world.addBody(b);
    return b;
  }

  function create(scene, opts) {
    const index = opts.index;
    const group = P.charGroup(index);
    const color = FP.Look.COLORS[opts.colorIndex % FP.Look.COLORS.length];
    const m = P.mats.char;
    const c = {
      index, name: opts.name || color.name, colorIndex: opts.colorIndex, color, hat: opts.hat, isBot: !!opts.isBot, group,
      yaw: opts.yaw || 0, grounded: false, groundBody: null, ko: 0, strength: 1, dizzy: 0, walkPhase: 0,
      punchT: 9, punchArm: 0, punchHit: false, thrownT: 0, grab: [null, null], grabHeld: 0, grabbedBy: null, struggle: 0,
      jumpCool: 0, airTime: 0, lastVel: new Vec3(), alive: true, score: 0, expression: 'smile', exprTimer: 0,
      lastHitBy: null, lastHitTime: -99, parts: {}, meshes: {}, constraints: [],
    };

    // physics pieces
    const t = c.parts.torso = makeBody(MASS.torso, [[new Sphere(D.torsoR), new Vec3(0, D.torsoH / 2, 0)], [new Sphere(D.torsoR), new Vec3(0, -D.torsoH / 2, 0)]], group, m);
    t.angularDamping = 0.5;
    const h = c.parts.head = makeBody(MASS.head, [[new Sphere(D.headR), new Vec3()]], group, m);
    c.parts.arms = [0, 1].map(() => makeBody(MASS.arm, [[new Sphere(D.armR * 1.1), new Vec3(0, 0.1, 0)], [new Sphere(D.armR * 1.45), new Vec3(0, -0.2, 0)]], group, m));
    c.parts.legs = [0, 1].map(() => makeBody(MASS.leg, [[new Sphere(D.legR), new Vec3(0, 0.1, 0)], [new Sphere(D.legR * 1.2), new Vec3(0, -0.17, 0)]], group, m));
    c.bodies = [t, h, ...c.parts.arms, ...c.parts.legs];
    c.bodies.forEach((b, i) => { b.userData = { char: c, part: ['torso', 'head', 'arm', 'arm', 'leg', 'leg'][i], side: [0, 0, 0, 1, 0, 1][i] }; });

    // joints
    const neck = new ConeTwistConstraint(t, h, { pivotA: new Vec3(0, 0.45, 0), pivotB: new Vec3(0, -0.24, 0), axisA: UP, axisB: UP, angle: 0.45, twistAngle: 0.5 });
    c.constraints.push(neck);
    for (let i = 0; i < 2; i++) {
      c.constraints.push(new PointToPointConstraint(t, SHOULDER[i], c.parts.arms[i], ARM_TOP));
      c.constraints.push(new ConeTwistConstraint(t, c.parts.legs[i], { pivotA: HIP[i], pivotB: LEG_TOP, axisA: new Vec3(0, -1, 0), axisB: new Vec3(0, -1, 0), angle: 1.0, twistAngle: 0.3 }));
    }
    c.constraints.forEach((k) => { k.collideConnected = false; P.world.addConstraint(k); });

    // looks
    c.outfit = opts.outfit || 'none';
    c.meshes.torso = FP.Look.makeTorso(color, D, c.outfit);
    const head = FP.Look.makeHead(color, D, opts.hat);
    c.meshes.head = head.group;
    c.face = head;
    c.meshes.arms = [0, 1].map(() => FP.Look.makeArm(color, D));
    c.meshes.legs = [0, 1].map(() => FP.Look.makeLeg(color, D));
    c.meshList = [c.meshes.torso, c.meshes.head, ...c.meshes.arms, ...c.meshes.legs];
    c.meshList.forEach((mm) => scene.add(mm));
    // the arm/leg meshes are built around their middle, matching the physics bodies
    c.meshes.arms.forEach((g) => { g.children.forEach((ch) => { ch.position.y += -0.02; }); });

    // dizzy stars
    c.stars = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const s = FP.Look.mesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshBasicMaterial({ color: 0xffe14a }), 0.02, false);
      const a = (i / 3) * Math.PI * 2;
      s.position.set(Math.cos(a) * 0.42, 0, Math.sin(a) * 0.42);
      c.stars.add(s);
    }
    c.stars.visible = false;
    scene.add(c.stars);
    c.scene = scene;

    // arms: punch hits and grabbing happen when a hand touches something
    c.parts.arms.forEach((arm, i) => arm.addEventListener('collide', (e) => onHandTouch(c, i, e.body)));
    // big bumps can knock you out
    t.addEventListener('collide', (e) => onBump(c, e));

    teleport(c, opts.x || 0, opts.y || 0, opts.z || 0, c.yaw);
    all.push(c);
    return c;
  }

  // put a character somewhere, standing up
  function teleport(c, x, y, z, yaw = c.yaw) {
    c.yaw = yaw;
    const q = new Quaternion().setFromAxisAngle(UP, yaw);
    const place = (b, local) => {
      const w = q.vmult(local);
      b.position.set(x + w.x, y + STAND + w.y, z + w.z);
      b.quaternion.copy(q);
      b.velocity.setZero(); b.angularVelocity.setZero();
      b.force.setZero(); b.torque.setZero();
    };
    place(c.parts.torso, new Vec3(0, 0, 0));
    place(c.parts.head, new Vec3(0, 0.69, 0));
    c.parts.arms.forEach((a, i) => place(a, SHOULDER[i].vsub(ARM_TOP)));
    c.parts.legs.forEach((l, i) => place(l, HIP[i].vsub(LEG_TOP)));
    c.ko = 0; c.strength = 1; c.dizzy = 0; c.alive = true;
    releaseGrab(c);
    if (c.grabbedBy) freeFrom(c);
  }

  // ------------------------------------------------------------
  //  MUSCLES
  // ------------------------------------------------------------
  const tq = new Quaternion(), tq2 = new Quaternion(), tv = new Vec3(), tv2 = new Vec3();

  // turn a body toward a target rotation, like a spring
  function orient(body, target, omega, zeta, s) {
    body.quaternion.conjugate(tq);
    target.mult(tq, tq2);
    if (tq2.w < 0) { tq2.x = -tq2.x; tq2.y = -tq2.y; tq2.z = -tq2.z; tq2.w = -tq2.w; }
    const sinHalf = Math.sqrt(tq2.x * tq2.x + tq2.y * tq2.y + tq2.z * tq2.z);
    const angle = 2 * Math.atan2(sinHalf, tq2.w);
    const I = (body.inertia.x + body.inertia.y + body.inertia.z) / 3;
    const k = I * omega * omega * s, d = I * 2 * zeta * omega * s;
    if (sinHalf > 1e-6) {
      const f = angle / sinHalf * k;
      body.torque.x += tq2.x * f; body.torque.y += tq2.y * f; body.torque.z += tq2.z * f;
    }
    body.torque.x -= body.angularVelocity.x * d;
    body.torque.y -= body.angularVelocity.y * d;
    body.torque.z -= body.angularVelocity.z * d;
  }

  // pull a point on a body toward a target point, like a spring
  function pull(body, localPoint, target, omega, zeta, s, refVel) {
    const world = body.pointToWorldFrame(localPoint, tv);
    world.vsub(body.position, tv2);
    const rel = tv2;
    const vel = body.velocity.clone();
    const spin = body.angularVelocity.cross(rel, new Vec3());
    vel.vadd(spin, vel);
    if (refVel) vel.vsub(refVel, vel);
    const mass = body.mass, k = mass * omega * omega * s, d = mass * 2 * zeta * omega * s;
    const f = new Vec3((target.x - world.x) * k - vel.x * d, (target.y - world.y) * k - vel.y * d, (target.z - world.z) * k - vel.z * d);
    body.applyForce(f, rel);
  }

  // ------------------------------------------------------------
  //  CONTROL (every physics step, before the world moves)
  //  input = { x, z, jump, jumpPressed, punchPressed, grab }
  // ------------------------------------------------------------
  function control(c, input, dt) {
    const t = c.parts.torso;
    c.jumpCool -= dt;
    c.punchT += dt;
    c.dizzy = Math.max(0, c.dizzy - dt * 0.45);

    // knocked out? count down, then get up slowly
    if (c.ko > 0) {
      c.ko -= dt;
      c.strength = 0;
      if (c.ko <= 0) { c.ko = 0; c.getUp = 0.7; FP.bus.emit('wakeUp', c); }
    } else if (c.getUp > 0) {
      c.getUp -= dt;
      c.strength = 1 - Math.max(0, c.getUp) / 0.7;
    } else c.strength = 1;
    const s = c.strength;

    // being carried: mash jump to wriggle free!
    if (c.grabbedBy && input.jumpPressed) {
      c.struggle++;
      t.velocity.y += 2;
      if (c.struggle >= 5) freeFrom(c);
    }

    // what's under my feet? (check the middle first, then a few spots around it, so edges count too)
    // things I'm holding don't count as floor (or I could stand on them and float up into the sky!)
    const held = [];
    for (const gr of c.grab) if (gr) for (const b of (gr.victim ? gr.victim.bodies : [gr.body])) if (!held.includes(b)) held.push(b);
    const heldGroups = held.map((b) => b.collisionFilterGroup);
    held.forEach((b) => { b.collisionFilterGroup = 0; });
    let g = P.groundBelow(t.position, STAND + 0.6, c.group);
    if (!g) {
      for (const [ox, oz] of [[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) {
        g = P.groundBelow(new Vec3(t.position.x + ox, t.position.y, t.position.z + oz), STAND + 0.6, c.group);
        if (g) break;
      }
    }
    held.forEach((b, i) => { b.collisionFilterGroup = heldGroups[i]; });
    const upright = t.quaternion.vmult(UP, tv).y;
    c.grounded = !!g && g.dist < STAND + 0.2 && upright > 0.5 && g.normal.y > 0.5;
    c.groundBody = c.grounded ? g.body : null;
    c.airTime = c.grounded ? 0 : c.airTime + dt;
    const groundVel = c.groundBody ? c.groundBody.velocity : new Vec3();
    const tall = c.grabbedBy ? 0 : s;
    // just got thrown: flying through the air, can't steer much until landing
    if (c.thrownT > 0) {
      c.thrownT -= dt;
      if (c.grounded && c.thrownT < 0.75) c.thrownT = 0;
      c.stagger = Math.max(c.stagger || 0, 0.05);
    }

    if (tall > 0.01) {
      // float at standing height (this is what "legs" do)
      if (g && g.dist < STAND + 0.45 && upright > 0.3) {
        const err = STAND - g.dist;
        const vy = t.velocity.y - groundVel.y;
        let f = TOTAL * -P.world.gravity.y * 0.92 + err * TOTAL * 160 - vy * TOTAL * 14;
        f = Math.max(0, Math.min(TOTAL * 90, f));
        t.applyForce(new Vec3(0, f * tall, 0), new Vec3(0, 0, 0));
      }
      // turn to face where you walk, and stay upright
      const dir = Math.hypot(input.x, input.z);
      if (dir > 0.15) {
        const want = Math.atan2(input.x, input.z);
        let dy = want - c.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        c.yaw += dy * Math.min(1, 10 * dt);
      }
      // lean a little in the direction you're walking
      const yawQ = new Quaternion().setFromAxisAngle(UP, c.yaw);
      // reaching to grab something (but not holding anything yet)? bend forward to reach low things
      const reaching = input.grab && !c.grab[0] && !c.grab[1];
      const leanQ = new Quaternion().setFromAxisAngle(new Vec3(1, 0, 0), reaching ? 0.45 : 0.12 * Math.min(1, dir));
      const target = yawQ.mult(leanQ);
      orient(t, target, 13, 0.75, tall);
      orient(c.parts.head, yawQ, 9, 0.5, tall * 0.8);

      // walking force
      const speed = SPEED * ((FP.Fun && FP.Fun.speed) || 1) * (c.speedMul || 1) * (c.dizzy > 2 ? 0.6 : 1) * (c.grab[0] || c.grab[1] ? 0.8 : 1);
      const wantX = input.x * speed + groundVel.x, wantZ = input.z * speed + groundVel.z;
      c.stagger = Math.max(0, (c.stagger || 0) - dt);
      const accel = (c.grounded ? (FP.Fun && FP.Fun.slip ? 1.6 : 14) : 3.5) * (c.stagger > 0 ? 0.15 : 1);
      t.applyForce(new Vec3((wantX - t.velocity.x) * TOTAL * accel * tall, 0, (wantZ - t.velocity.z) * TOTAL * accel * tall), new Vec3(0, 0, 0));

      // jump
      if (input.jumpPressed && c.grounded && c.jumpCool <= 0) {
        for (const b of c.bodies) b.velocity.y = Math.max(b.velocity.y, Math.min(groundVel.y, 4)) + JUMP * ((FP.Fun && FP.Fun.jump) || 1);
        c.jumpCool = 0.35;
        FP.bus.emit('jump', c);
      }

      legs(c, dt, s, groundVel);
      arms(c, input, dt, s);
    } else {
      releaseGrab(c);
    }

    // punching
    if (input.punchPressed && s > 0.9 && c.punchT > 0.32) {
      c.punchT = 0; c.punchHit = false; c.punchArm = 1 - c.punchArm;
      const arm = c.parts.arms[c.punchArm];
      const f = forward(c);
      arm.velocity.x += f.x * 7; arm.velocity.z += f.z * 7; arm.velocity.y += 1;
      t.velocity.x += f.x * 1.2; t.velocity.z += f.z * 1.2;
      FP.bus.emit('punch', c);
    }

    // grabbing
    c.grabHeld = input.grab && s > 0.9 ? c.grabHeld + dt : 0;
    if (!input.grab && (c.grab[0] || c.grab[1])) {
      const thrown = releaseGrab(c, true);
      if (thrown) FP.bus.emit('throw', { by: c, who: thrown });
    }
    // let go if the grab got stretched too far (you pulled free)
    for (let i = 0; i < 2; i++) {
      const gr = c.grab[i];
      if (!gr) continue;
      const a = c.parts.arms[i].pointToWorldFrame(HAND, new Vec3());
      const b = gr.body.pointToWorldFrame(gr.pivot, new Vec3());
      if (a.distanceTo(b) > 0.8 || !P.world.bodies.includes(gr.body)) dropHand(c, i);
    }

    c.lastVel.copy(t.velocity);
  }

  function forward(c) { return new Vec3(Math.sin(c.yaw), 0, Math.cos(c.yaw)); }

  // legs take steps while you walk
  function legs(c, dt, s, groundVel) {
    const t = c.parts.torso;
    const vx = t.velocity.x - groundVel.x, vz = t.velocity.z - groundVel.z;
    const sp = Math.hypot(vx, vz);
    const amount = Math.min(1, sp / SPEED);
    c.walkPhase += dt * (4 + sp * 2.2) * (amount > 0.1 ? 1 : 0);
    const f = forward(c);
    for (let i = 0; i < 2; i++) {
      const hip = t.pointToWorldFrame(HIP[i], new Vec3());
      const ph = c.walkPhase + i * Math.PI;
      const swing = Math.sin(ph) * 0.3 * amount;
      const lift = Math.max(0, Math.cos(ph)) * 0.2 * amount;
      const air = c.grounded ? 0 : 0.18;
      const target = new Vec3(hip.x + f.x * swing, hip.y - 0.47 + lift + air, hip.z + f.z * swing);
      pull(c.parts.legs[i], FOOT, target, 16, 0.7, s, t.velocity);
    }
  }

  // arms hang and swing, reach out to grab, and PUNCH
  function arms(c, input, dt, s) {
    const t = c.parts.torso;
    const f = forward(c);
    for (let i = 0; i < 2; i++) {
      const arm = c.parts.arms[i];
      const sh = t.pointToWorldFrame(SHOULDER[i], new Vec3());
      // "out" points from the middle of the body out to this shoulder
      const out = new Vec3(sh.x - t.position.x, 0, sh.z - t.position.z);
      out.normalize();
      if (c.punchT < 0.22 && c.punchArm === i) {
        const target = new Vec3(sh.x + f.x * 0.8 - out.x * 0.2, sh.y + 0.05, sh.z + f.z * 0.8 - out.z * 0.2);
        pull(arm, HAND, target, 34, 0.5, s, t.velocity);
      } else if (input.grab) {
        const holding = c.grab[0] || c.grab[1];
        // hands sweep up and down while reaching, so they can catch things on the floor too
        const sweep = holding ? 0.35 : 0.1 - 0.8 * (0.5 + 0.5 * Math.sin(c.grabHeld * 7));
        const target = new Vec3(sh.x + f.x * 0.62 - out.x * 0.16, sh.y + sweep, sh.z + f.z * 0.62 - out.z * 0.16);
        pull(arm, HAND, target, holding ? 14 : 24, 0.6, s, t.velocity);
      } else {
        const swing = Math.sin(c.walkPhase + (i ? 0 : Math.PI)) * 0.2;
        const air = c.grounded ? 0 : 1; // flail in the air!
        const wob = c.grounded ? 0 : Math.sin(performance.now() / 60 + i * 2) * 0.15;
        const target = new Vec3(
          sh.x + f.x * swing + out.x * (0.12 + air * 0.3),
          sh.y - 0.45 + air * 0.55 + wob,
          sh.z + f.z * swing + out.z * (0.12 + air * 0.3));
        pull(arm, HAND, target, 7, 0.45, s, t.velocity);
      }
    }
  }

  // ------------------------------------------------------------
  //  PUNCHES, GRABS, KNOCKOUTS
  // ------------------------------------------------------------
  function onHandTouch(c, i, other) {
    if (!other || other === c.parts.arms[i]) return;
    const victim = other.userData && other.userData.char;
    // a punch landing
    if (c.punchT < 0.25 && c.punchArm === i && !c.punchHit && victim && victim !== c) {
      c.punchHit = true;
      hit(victim, forward(c), (c.punchPower || 1) * ((FP.Fun && FP.Fun.punch) || 1), c);
      if (c.isGuard && !victim.isGuard) knockOut(victim, 3); // guards knock you out in one hit!
      FP.bus.emit('punchHit', { by: c, victim, pos: c.parts.arms[i].position.clone() });
      return;
    }
    if (c.punchT < 0.25 && c.punchArm === i && !c.punchHit && other.mass > 0 && !victim) {
      c.punchHit = true;
      const f = forward(c);
      other.applyImpulse(new Vec3(f.x * 6, 2.5, f.z * 6));
      FP.bus.emit('punchProp', { by: c, body: other, pos: c.parts.arms[i].position.clone() });
      return;
    }
    // grabbing
    if (c.grabHeld > 0 && !c.grab[i] && c.strength > 0.9) {
      if (victim === c) return;
      if (c.isBot && other.mass === 0) return; // bots don't hang on walls (players can!)
      const handWorld = c.parts.arms[i].pointToWorldFrame(HAND, new Vec3());
      const pivot = other.pointToLocalFrame(handWorld, new Vec3());
      const con = new PointToPointConstraint(c.parts.arms[i], HAND, other, pivot, 400);
      con.collideConnected = false;
      P.world.addConstraint(con);
      c.grab[i] = { body: other, con, pivot, victim, time: 0 };
      if (victim) { victim.grabbedBy = c; victim.struggle = 0; }
      FP.bus.emit('grab', { by: c, victim, body: other });
    }
  }

  function dropHand(c, i) {
    const gr = c.grab[i];
    if (!gr) return null;
    P.world.removeConstraint(gr.con);
    c.grab[i] = null;
    if (gr.victim && !(c.grab[0] && c.grab[0].victim === gr.victim) && !(c.grab[1] && c.grab[1].victim === gr.victim)) {
      if (gr.victim.grabbedBy === c) gr.victim.grabbedBy = null;
    }
    return gr;
  }

  // let go of everything. If `throwIt`, whoever you were holding goes flying
  function releaseGrab(c, throwIt = false) {
    let thrown = null;
    for (let i = 0; i < 2; i++) {
      const gr = dropHand(c, i);
      if (gr && throwIt) thrown = gr.victim || (gr.body.mass > 0 ? gr.body : null); // can't throw a wall!
    }
    if (throwIt && thrown) {
      const f = forward(c);
      const t = c.parts.torso;
      const bodies = thrown.bodies || [thrown];
      for (const b of bodies) {
        b.velocity.x = t.velocity.x + f.x * 10;
        b.velocity.z = t.velocity.z + f.z * 10;
        b.velocity.y = Math.max(b.velocity.y, 7.5);
      }
      if (thrown.bodies) {
        // YEET! No knockout, unless they smack into a wall (see onBump)
        thrown.lastHitBy = c; thrown.lastHitTime = performance.now();
        thrown.thrownT = 1.2;
        thrown.expression = 'oh'; thrown.exprTimer = 1;
      }
    }
    return thrown;
  }

  function freeFrom(c) {
    const holder = c.grabbedBy;
    if (!holder) return;
    for (let i = 0; i < 2; i++) if (holder.grab[i] && holder.grab[i].victim === c) dropHand(holder, i);
    c.grabbedBy = null;
    c.struggle = 0;
    FP.bus.emit('breakFree', c);
  }

  // get hit: fly back, get dizzy, maybe get knocked out
  function hit(victim, dir, power, by) {
    const t = victim.parts.torso;
    t.applyImpulse(new Vec3(dir.x * 22 * power, 5 * power, dir.z * 22 * power));
    victim.stagger = 0.45; // stumble: can't fight back against the push for a moment
    victim.parts.head.applyImpulse(new Vec3(dir.x * 3 * power, 1, dir.z * 3 * power));
    victim.dizzy += 1.25 * power;
    victim.lastHitBy = by;
    victim.lastHitTime = performance.now();
    victim.expression = 'oh'; victim.exprTimer = 0.6;
    if (victim.dizzy >= 3 || victim.ko > 0) knockOut(victim, 2.6);
  }

  function knockOut(c, seconds) {
    if (c.ko <= 0) FP.bus.emit('knockOut', c);
    c.ko = Math.max(c.ko, seconds);
    c.dizzy = 0;
    releaseGrab(c);
  }

  // a hard bump (like hitting a wall after being thrown) knocks you out
  function onBump(c, e) {
    const t = c.parts.torso;
    const dv = t.velocity.vsub(c.lastVel).length();
    const other = e.body && e.body.userData && e.body.userData.char;
    if (c.thrownT > 0) {
      // thrown: only a wall knocks you out. Floors and other people just bounce you
      const n = e.contact && e.contact.ni;
      const wall = e.body && e.body.mass === 0 && n && Math.abs(n.y) < 0.55;
      const speed = Math.hypot(c.lastVel.x, c.lastVel.z);
      if (wall && speed > 5) {
        c.thrownT = 0;
        if (c.ko <= 0) knockOut(c, 1.8);
        FP.bus.emit('bump', { c, pos: t.position.clone(), power: Math.max(dv, 14) });
      }
      return;
    }
    if (dv > 13 && other !== c) {
      if (c.ko <= 0) knockOut(c, 1.6);
      FP.bus.emit('bump', { c, pos: t.position.clone(), power: dv });
    }
  }

  // ------------------------------------------------------------
  //  DRAWING: move the meshes to where the physics pieces are
  // ------------------------------------------------------------
  function sync(c, dt, camera) {
    const copy = (mesh, body) => { mesh.position.copy(body.position); mesh.quaternion.copy(body.quaternion); };
    copy(c.meshes.torso, c.parts.torso);
    copy(c.meshes.head, c.parts.head);
    // fun option: BIG HEADS
    const hs = FP.Fun && FP.Fun.bighead ? 1.75 : 1;
    if (c.meshes.head.scale.x !== hs) c.meshes.head.scale.setScalar(hs);
    if (hs > 1) c.meshes.head.position.y += 0.28;
    c.meshes.arms.forEach((m, i) => copy(m, c.parts.arms[i]));
    c.meshes.legs.forEach((m, i) => copy(m, c.parts.legs[i]));

    // face: angry while punching, scared when flying or grabbed, happy when cheering
    c.exprTimer -= dt;
    let e = 'smile';
    if (c.ko > 0) e = 'ko';
    else if (c.exprTimer > 0) e = c.expression;
    else if (c.punchT < 0.5 || (c.grab[0] || c.grab[1])) e = 'angry';
    else if (c.airTime > 0.6 || c.grabbedBy) e = 'oh';
    else if (c.cheer > 0) e = 'happy';
    c.cheer = Math.max(0, (c.cheer || 0) - dt);
    c.faceExpr = e;
    // blink every few seconds
    c.blink = (c.blink || 2 + Math.random() * 3) - dt;
    const blinking = c.blink < 0.1;
    if (c.blink < 0) c.blink = 2 + Math.random() * 4;
    // eyes look at the closest other character
    c.lookTimer = (c.lookTimer || 0) - dt;
    if (c.lookTimer <= 0) {
      c.lookTimer = 0.25;
      let best = null, bd = 7;
      for (const o of all) {
        if (o === c) continue;
        const d = o.parts.head.position.distanceTo(c.parts.head.position);
        if (d < bd) { bd = d; best = o; }
      }
      c.lookAt = best;
    }
    let lx = 0, ly = 0;
    if (c.lookAt && all.includes(c.lookAt)) {
      const h = c.meshes.head;
      h.updateMatrixWorld();
      const p = c.lookAt.parts.head.position;
      const local = h.worldToLocal(new THREE.Vector3(p.x, p.y, p.z));
      if (local.z > 0) { lx = Math.max(-1, Math.min(1, local.x / (local.z + 0.5))); ly = Math.max(-1, Math.min(1, local.y / (local.z + 0.5))); }
    }
    c.eyeX = (c.eyeX || 0) + (lx - (c.eyeX || 0)) * Math.min(1, dt * 8);
    c.eyeY = (c.eyeY || 0) + (ly - (c.eyeY || 0)) * Math.min(1, dt * 8);
    FP.Look.setFace(c.face, e, c.eyeX, c.eyeY, blinking);
    if (c.face.hat && c.face.hat.userData.spin) c.face.hat.userData.spin.rotation.y += dt * (c.grounded ? 4 : 30);
    if (c.face.hat && c.face.hat.userData.bob) c.face.hat.userData.bob.position.y = 0.3 + Math.sin(performance.now() / 300 + c.index) * 0.03;

    // stars when knocked out
    c.stars.visible = c.ko > 0;
    if (c.ko > 0) {
      c.stars.position.copy(c.parts.head.position);
      c.stars.position.y += 0.5;
      c.stars.rotation.y += dt * 7;
    }
  }

  function remove(c) {
    releaseGrab(c);
    if (c.grabbedBy) freeFrom(c);
    for (const k of c.constraints) P.world.removeConstraint(k);
    for (const b of c.bodies) P.world.removeBody(b);
    for (const mm of c.meshList) c.scene.remove(mm);
    c.scene.remove(c.stars);
    const i = all.indexOf(c);
    if (i >= 0) all.splice(i, 1);
  }

  // where is the character? (the middle of its body)
  const center = (c) => c.parts.torso.position;

  return { create, control, sync, teleport, remove, hit, knockOut, releaseGrab, center, forward, all, D, STAND, SPEED };
})();
