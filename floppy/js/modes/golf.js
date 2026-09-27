// ============================================================
//  FLOPPY PARTY — FLOPPY GOLF
//  Everyone has a golf ball in their color. Walk behind it,
//  face the hole and PUNCH to hit it! (Your caddy picks how
//  hard.) Sink it first for the most points: 1st +5, 2nd +3,
//  3rd +2, 4th +1. 3 holes, most points wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.golf = (function () {
  const HOLE_TIME = 75, R = 0.2, CUP_R = 0.34, PLACE_PTS = [5, 3, 2, 1];
  // each hole: floor pieces [x, z, w, d], walls [x, z, w, d], round posts [x, z], tee, cup, the path the bots follow
  const HOLES = [
    {
      name: 'Easy Street',
      floors: [[0, -0.5, 8, 20]],
      walls: [[-4.2, -0.5, 0.4, 20.8], [4.2, -0.5, 0.4, 20.8], [0, 9.7, 8.8, 0.4], [0, -10.7, 8.8, 0.4]],
      posts: [[-1.6, 1.5], [1.6, 1.5], [0, -3]],
      tee: [0, 6.5], cup: [0, -7.5], path: [[0, 6.5], [0, -7.5]],
    },
    {
      name: 'Round the Corner',
      floors: [[0, 2.5, 7, 15], [5, -8, 17, 6]],
      walls: [[-3.7, -0.5, 0.4, 21.4], [0, 10.2, 7.8, 0.4], [3.7, 2.6, 0.4, 15.2], [8.6, -4.8, 10.2, 0.4], [13.7, -8, 0.4, 6.8], [5, -11.2, 17.8, 0.4]],
      posts: [[6.5, -6.6], [-1.5, 2]],
      tee: [0, 7.5], cup: [10.5, -8], path: [[0, 7.5], [0, -8], [10.5, -8]],
    },
    {
      name: 'The Spinner',
      floors: [[0, -1, 9, 22]],
      walls: [[-4.7, -1, 0.4, 22.8], [4.7, -1, 0.4, 22.8], [0, 10.2, 9.8, 0.4], [0, -12.2, 9.8, 0.4], [-2.95, -6, 3.5, 0.4], [2.95, -6, 3.5, 0.4]],
      posts: [],
      spinner: [0, -0.5, 6.5],
      tee: [0, 7.5], cup: [0, -9.5], path: [[0, 7.5], [0, -6], [0, -9.5]],
    },
  ];
  let hole = HOLES[0], balls = [], time = 0, finished = 0, doneT = 0, spinner = null, spinA = 0, flag = null, self = null;
  let respawn = null;

  const holeIndex = () => Math.max(0, ((FP.Game.round || 1) - 1) % HOLES.length);

  function build(list) {
    hole = HOLES[holeIndex()];
    balls = []; time = 0; finished = 0; doneT = 0; spinner = null; spinA = 0;
    const S = FP.Stage;
    for (const [x, z, w, d] of hole.floors) S.island(x, -1, z, w, 2, d, { grass: 0x7fd65a });
    for (const [x, z, w, d] of hole.walls) S.block(x, 0.25, z, w, 0.5, d, 0xc98b58);
    for (const [x, z] of hole.posts) {
      const m = FP.Look.mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.8, 16), FP.Look.toon(0xff7eb6), 0.03);
      m.position.set(x, 0.4, z); S.add(m);
      const b = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: FP.Physics.mats.floor, collisionFilterGroup: FP.Physics.GROUP.WORLD, collisionFilterMask: FP.Physics.ALL });
      b.addShape(new CANNON.Cylinder(0.42, 0.42, 0.8, 12));
      b.position.set(x, 0.4, z);
      FP.Physics.world.addBody(b); S.bodies.push(b);
    }
    if (hole.spinner) {
      const [x, z, len] = hole.spinner;
      spinner = S.block(x, 0.3, z, len, 0.5, 0.35, 0xa77bff, { kinematic: true });
      const hub = FP.Look.mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 14), FP.Look.toon(0xffcf33), 0.03);
      hub.position.set(x, 0.4, z); S.add(hub);
    }
    // the tee and the hole with its flag
    const tee = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.6), FP.Look.toon(0xa8e98a));
    tee.rotation.x = -Math.PI / 2; tee.position.set(hole.tee[0], 0.05, hole.tee[1] - 0.4); S.add(tee);
    const green = new THREE.Mesh(new THREE.CircleGeometry(1.6, 28), FP.Look.toon(0xa8e98a));
    green.rotation.x = -Math.PI / 2; green.position.set(hole.cup[0], 0.05, hole.cup[1]); S.add(green);
    const cup = new THREE.Mesh(new THREE.CircleGeometry(CUP_R, 20), new THREE.MeshBasicMaterial({ color: 0x1d1a2f }));
    cup.rotation.x = -Math.PI / 2; cup.position.set(hole.cup[0], 0.06, hole.cup[1]); S.add(cup);
    flag = new THREE.Group();
    const pole = FP.Look.mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 8), FP.Look.toon(0xffffff), 0.015);
    pole.position.y = 1.1;
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), FP.Look.toon(0xff5a5f, { side: THREE.DoubleSide }));
    cloth.position.set(0.4, 1.9, 0);
    flag.add(pole, cloth);
    flag.position.set(hole.cup[0], 0, hole.cup[1]);
    S.add(flag);
    FP.Props.wiggle(cloth, (t) => { cloth.rotation.y = Math.sin(t * 3) * 0.3; });
    // everyone's ball, in a row at the tee
    const n = Math.max(1, list.length);
    list.forEach((p, i) => {
      const col = FP.Look.COLORS[p.colorIndex].body;
      const k = FP.Kit.ball(R, [col, 0xffffff], 0.45);
      k.body.material = FP.Physics.mats.prop;
      k.body.linearDamping = 0.45; k.body.angularDamping = 0.5;
      k.body.collisionFilterMask = FP.Physics.GROUP.WORLD | FP.Physics.GROUP.PROP; // people walk through balls (no dribbling!)
      const x = hole.tee[0] + (i - (n - 1) / 2) * 1.1, z = hole.tee[1] - 1;
      k.body.position.set(x, R + 0.02, z);
      const arrow = aimArrow(col); S.add(arrow);
      const ball = { ...FP.Stage.prop(k.mesh, k.body), player: p, strokes: 0, sunk: false, safe: { x, z }, cool: 0, arrow, aim: { show: false, len: 3, yaw: 0, charging: false, power: 0, t: 0 } };
      balls.push(ball);
    });
    // the rough: lower grass all around the course (balls that land here go back)
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z, w, d] of hole.floors) { x0 = Math.min(x0, x - w / 2); x1 = Math.max(x1, x + w / 2); z0 = Math.min(z0, z - d / 2); z1 = Math.max(z1, z + d / 2); }
    x0 -= 5; x1 += 5; z0 -= 4; z1 += 4;
    S.island((x0 + x1) / 2, -1.6, (z0 + z1) / 2, x1 - x0, 2, z1 - z0, { grass: 0x5cb847 });
    for (const [x, z] of [[x0 + 1.2, z0 + 1.2], [x1 - 1.2, z0 + 1.5], [x0 + 1.4, z1 - 1.4], [x1 - 1.5, (z0 + z1) / 2]]) { const t = FP.Look.tree(1.1); t.position.set(x, -0.6, z); S.add(t); }
    respawn = FP.Kit.respawner((c) => { const b = ballOf(c); return b && !b.sunk ? { x: b.body.position.x, y: 0.4, z: b.body.position.z + 0.8 } : { x: hole.tee[0], y: 0.4, z: hole.tee[1] }; });
    FP.Camera.setAngle(0.8, 0.9);
  }

  function spawn(i, n) { return { x: hole.tee[0] + (i - (n - 1) / 2) * 1.1, y: 0.2, z: hole.tee[1] + 0.2, yaw: Math.PI }; }

  const ballOf = (c) => balls.find((b) => c && c.player && b.player.id === c.player.id);

  // how far to hit: your caddy looks at the hole and at walls in the way
  const ray = new CANNON.RaycastResult();
  function shotLength(from, fx, fz) {
    const cx = hole.cup[0] - from.x, cz = hole.cup[1] - from.z;
    const toCup = Math.hypot(cx, cz);
    const along = cx * fx + cz * fz;
    ray.reset();
    const hit = FP.Physics.world.raycastClosest(new CANNON.Vec3(from.x, R, from.z), new CANNON.Vec3(from.x + fx * 30, R, from.z + fz * 30),
      { collisionFilterMask: FP.Physics.GROUP.WORLD, skipBackfaces: true }, ray);
    const wall = hit ? ray.distance : 30;
    // facing the hole: roll to it (a bit past is fine). Otherwise: stop before the wall
    let d = along > 0 && Math.abs(cx * fz - cz * fx) < 1.2 ? toCup + 0.6 : Math.min(8, wall - 0.4);
    d = Math.min(d, wall + 0.3);
    return Math.max(1.2, Math.min(16, d));
  }

  // an arrow on the grass that shows where (and how far) your shot goes
  function aimArrow(color) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false });
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1), mat);
    shaft.rotation.x = -Math.PI / 2;
    const head = new THREE.Mesh(new THREE.CircleGeometry(0.3, 3), mat);
    head.rotation.x = -Math.PI / 2; head.rotation.z = Math.PI / 2;
    g.add(shaft, head);
    g.userData = { shaft, head, mat, color };
    g.visible = false;
    return g;
  }

  function strike(c, ball, dist) {
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const b = ball.body;
    const d = dist || shotLength(b.position, fx, fz);
    const v = d * 0.62 * (dist ? 1 : 0.93 + Math.random() * 0.14);
    b.velocity.set(fx * v, 0.3, fz * v);
    b.angularVelocity.set(fz * v / R, 0, -fx * v / R);
    ball.safe = { x: b.position.x, z: b.position.z };
    ball.strokes++; ball.cool = 0.5;
    FP.FX.word(new THREE.Vector3(b.position.x, 1.2, b.position.z), `Stroke ${ball.strokes}`, '#ffffff', 0.8);
    FP.Audio.play('hit');
  }

  // can this player hit their ball right now? (standing next to it, and it stopped rolling)
  function canHit(c, ball) {
    if (!ball || ball.sunk || ball.cool > 0 || c.ko > 0) return false;
    const b = ball.body, t = c.parts.torso.position;
    const dx = b.position.x - t.x, dz = b.position.z - t.z, d = Math.hypot(dx, dz);
    if (d > 1.3 || Math.hypot(b.velocity.x, b.velocity.z) > 1.5) return false;
    return !(d > 0.3 && (dx * Math.sin(c.yaw) + dz * Math.cos(c.yaw)) / d < -0.3); // not behind you
  }

  // golf controls: PUNCH = your caddy picks the power. Hold GRAB = the power goes up and down, let go to hit
  function control(c, input, dt, playing) {
    const inp = input || {};
    const ball = ballOf(c);
    if (ball) {
      const a = ball.aim;
      const ready = playing && canHit(c, ball);
      if (ready && inp.grab) {
        if (!a.charging) { a.charging = true; a.t = 0; }
        a.t += dt;
        const ph = (a.t / 1.4) % 2;
        a.power = ph < 1 ? ph : 2 - ph;
      } else {
        if (a.charging && ready && a.t > 0.15) { strike(c, ball, 1.5 + a.power * 15); c.punchT = 0; c.punchHit = true; }
        a.charging = false;
        if (ready && inp.punchPressed) strike(c, ball);
      }
      a.show = ready;
      a.yaw = c.yaw;
      a.len = a.charging ? 1.5 + a.power * 15 : ready ? shotLength(ball.body.position, Math.sin(c.yaw), Math.cos(c.yaw)) : 3;
    }
    FP.Ragdoll.control(c, { x: inp.x || 0, z: inp.z || 0, jump: inp.jump, jumpPressed: inp.jumpPressed, punchPressed: inp.punchPressed, grab: false, emote: inp.emote }, dt);
  }

  // the aim arrows (for online friends too)
  function visual() {
    for (const ball of balls) {
      const a = ball.aim, g = ball.arrow, u = g.userData;
      g.visible = !!a.show && !ball.sunk;
      if (!g.visible) continue;
      const len = Math.max(0.6, a.len - 0.3);
      g.position.set(ball.body.position.x, 0.08, ball.body.position.z);
      g.rotation.y = a.yaw + Math.PI;
      u.shaft.scale.y = len; u.shaft.position.z = -0.3 - len / 2;
      u.head.position.z = -0.3 - len - 0.15;
      u.mat.color.setHex(a.charging ? (a.power > 0.8 ? 0xff5a5f : a.power > 0.45 ? 0xffcf33 : 0x5cc44a) : u.color);
    }
  }

  function beforeStep(dt) {
    if (!spinner) return;
    const on = FP.Game.state === 'play';
    if (on) spinA += dt * 1.3;
    spinner.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), spinA);
    spinner.body.angularVelocity.set(0, on ? 1.3 : 0, 0);
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const ball of balls) {
        if (ball.sunk) continue;
        ball.cool -= dt;
        const b = ball.body;
        if (b.position.y < -0.25) {
          b.position.set(ball.safe.x, R + 0.3, ball.safe.z); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
          FP.FX.word(new THREE.Vector3(ball.safe.x, 1.2, ball.safe.z), 'Out! Try again', '#ff9a3c', 1);
          continue;
        }
        const dc = Math.hypot(b.position.x - hole.cup[0], b.position.z - hole.cup[1]);
        const speed = Math.hypot(b.velocity.x, b.velocity.z);
        if (dc < CUP_R && speed < 5.5 && b.position.y < 0.6) {
          ball.sunk = true;
          const place = finished++;
          const pts = PLACE_PTS[Math.min(place, 3)];
          const id = ball.player.id;
          game.scores[id] = (game.scores[id] || 0) + pts;
          const pos = new THREE.Vector3(hole.cup[0], 1.3, hole.cup[1]);
          FP.FX.word(pos, ball.strokes === 1 ? 'HOLE IN ONE!' : `${['1st', '2nd', '3rd', '4th'][Math.min(place, 3)]}! +${pts}`, '#ffcf33', ball.strokes === 1 ? 1.6 : 1.3);
          FP.FX.stars(pos, 8);
          FP.Audio.play('plop'); FP.Audio.play(place === 0 ? 'cheer' : 'coin');
          if (ball.strokes === 1) { FP.FX.confetti(pos); FP.Props.hype(); }
          const c = chars.find((ch) => ch.player.id === id);
          if (c) { c.cheer = 2; c.expression = 'happy'; c.exprTimer = 2; }
          b.type = CANNON.Body.KINEMATIC; b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
          b.position.set(hole.cup[0], -30, hole.cup[1]);
        }
      }
      if (respawn) respawn.update(chars, dt, -4);
      if (balls.length && balls.every((b) => b.sunk)) doneT += dt;
    }
    visual();
    if (roundOver || dt === 0) return null;
    if (doneT > 1.5 || time >= HOLE_TIME) {
      const last = holeIndex() === HOLES.length - 1;
      return { winners: [], text: last ? 'That was the last hole!' : `Hole ${holeIndex() + 1} done!`, sub: time >= HOLE_TIME && doneT === 0 ? 'Out of time!' : '' };
    }
    return null;
  }

  // bot brain: walk behind the ball, face the next spot on the path (or the hole), punch
  function aimFor(ball) {
    const p = ball.body.position;
    // clear shot at the hole?
    const cx = hole.cup[0] - p.x, cz = hole.cup[1] - p.z, dc = Math.hypot(cx, cz);
    ray.reset();
    const blocked = FP.Physics.world.raycastClosest(new CANNON.Vec3(p.x, R, p.z), new CANNON.Vec3(hole.cup[0], R, hole.cup[1]),
      { collisionFilterMask: FP.Physics.GROUP.WORLD, skipBackfaces: true }, ray);
    if (!blocked || ray.distance > dc) return hole.cup;
    // otherwise: the path point after the closest part of the path
    let best = 0, bd = Infinity;
    for (let i = 0; i < hole.path.length - 1; i++) {
      const [ax, az] = hole.path[i], [bx, bz] = hole.path[i + 1];
      const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz;
      const t = Math.max(0, Math.min(1, ((p.x - ax) * vx + (p.z - az) * vz) / l2));
      const d = Math.hypot(ax + vx * t - p.x, az + vz * t - p.z);
      if (d < bd) { bd = d; best = i; }
    }
    return hole.path[best + 1];
  }

  function botThink(c, chars, dt, input, tools) {
    const ball = ballOf(c);
    const t = c.parts.torso.position;
    if (!ball || ball.sunk) { tools.steer(c, hole.cup[0] + 2, hole.cup[1] + 2, input); input.x *= 0.4; input.z *= 0.4; return true; }
    const b = ball.body.position;
    const [ax, az] = aimFor(ball);
    let dx = ax - b.x, dz = az - b.z;
    const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    const sx = b.x - dx * 0.7, sz = b.z - dz * 0.7;
    const ds = Math.hypot(sx - t.x, sz - t.z);
    const rolling = Math.hypot(ball.body.velocity.x, ball.body.velocity.z) > 0.4;
    if (ds > 0.35) {
      tools.steer(c, sx, sz, input);
      if (ds < 1.5) { input.x *= 0.5; input.z *= 0.5; }
    } else {
      // turn to face the target, then hit
      input.x = dx * 0.25; input.z = dz * 0.25;
      const want = Math.atan2(dx, dz);
      let diff = want - c.yaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.18 && !rolling && ball.cool <= 0 && Math.random() < dt * 4) input.punchPressed = true;
    }
    return true;
  }

  function hud() {
    return `<span>Hole ${holeIndex() + 1}: ${hole.name} &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(HOLE_TIME - time)}</span><span class="hud-tip">Stand by your ball, face the hole. PUNCH: the caddy hits it &nbsp; Hold GRAB: pick the power yourself, let go to hit</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><ellipse cx="60" cy="62" rx="54" ry="14" fill="#7fd65a" stroke="#2a2140" stroke-width="2"/><ellipse cx="86" cy="62" rx="12" ry="4" fill="#a8e98a"/><ellipse cx="86" cy="62" rx="4" ry="1.6" fill="#1d1a2f"/><path d="M86 62V22" stroke="#2a2140" stroke-width="2.5"/><path d="M86 22l18 6-18 6z" fill="#ff5a5f" stroke="#2a2140" stroke-width="2" stroke-linejoin="round"/><circle cx="46" cy="60" r="5" fill="#fff" stroke="#2a2140" stroke-width="2"/><ellipse cx="30" cy="48" rx="7" ry="9" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="30" cy="35" r="6" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><path d="M52 58h10M54 54l8-2" stroke="#2a2140" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>';

  self = {
    id: 'golf', name: 'Floppy Golf', roundsToWin: 1, rounds: HOLES.length, roundName: 'Hole', minTotal: 1, defaultBots: 3, song: 'chill', minZoom: 15, art: ART,
    desc: 'Walk behind your ball, face the hole and PUNCH it! First in the hole gets the most points. 3 holes.',
    build, spawn, control, beforeStep, update, botThink, hud, visual,
    scoreLabel: (s) => `${s} pts`,
    netState: () => ({ t: Math.round(time), a: balls.map((b) => [b.aim.show ? 1 : 0, Math.round(b.aim.len * 10), Math.round(b.aim.yaw * 100), b.aim.charging ? 1 : 0, Math.round(b.aim.power * 100)]) }),
    applyNetState: (st) => { time = st.t; (st.a || []).forEach((v, i) => { const b = balls[i]; if (!b) return; b.aim.show = !!v[0]; b.aim.len = v[1] / 10; b.aim.yaw = v[2] / 100; b.aim.charging = !!v[3]; b.aim.power = v[4] / 100; }); },
  };
  return self;
})();
