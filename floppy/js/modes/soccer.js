// ============================================================
//  FLOPPY PARTY — RAGDOLL SOCCER
//  Red team vs Blue team, one giant bouncy ball.
//  Push it, punch it, or throw the goalie into the net!
//  First team to 3 goals wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.soccer = (function () {
  const L = 26, W = 16;           // field size
  const GOAL_W = 5.4, GOAL_H = 2.6;
  const TEAM_COLORS = [0xff5a5f, 0x4aa8ff];
  let ball = null, rings = [], goalPause = 0, time = 0, lastTouch = null, game = null, golden = false;

  function build() {
    rings = []; goalPause = 0; time = 0; lastTouch = null; fans.length = 0; golden = false;
    const P = FP.Physics;
    // grass with stripes
    FP.Stage.block(0, -0.5, 0, L + 8, 1, W + 8, 0x6ccf5a);
    for (let i = 0; i < 8; i++) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(L / 8, W), FP.Look.toon(i % 2 ? 0x7ad866 : 0x66c455));
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(-L / 2 + L / 16 + i * L / 8, 0.005, 0);
      stripe.receiveShadow = true;
      FP.Stage.add(stripe);
    }
    // white lines
    const line = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z); FP.Stage.add(m); };
    line(0, 0, 0.15, W); line(0, -W / 2, L, 0.15); line(0, W / 2, L, 0.15); line(-L / 2, 0, 0.15, W); line(L / 2, 0, 0.15, W);
    const circle = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.55, 40), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    circle.rotation.x = -Math.PI / 2; circle.position.y = 0.01; FP.Stage.add(circle);
    // walls all around (with gaps for the goals)
    const wallH = 1.4, wallC = 0xfff1d6;
    FP.Stage.block(0, wallH / 2, -W / 2 - 0.5, L + 2, wallH, 1, wallC);
    FP.Stage.block(0, wallH / 2, W / 2 + 0.5, L + 2, wallH, 1, wallC);
    const sideLen = (W - GOAL_W) / 2;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) FP.Stage.block(sx * (L / 2 + 0.5), wallH / 2, sz * (GOAL_W / 2 + sideLen / 2), 1, wallH, sideLen, wallC);
      goal(sx);
    }
    // invisible tall walls on top of the low walls, so the ball can't fly out of the field
    const ballWall = (x, y, z, w, h, d) => {
      const b = P.staticBox(x, y, z, w, h, d);
      b.collisionFilterMask = P.GROUP.PROP; // only stops the ball
      FP.Stage.bodies.push(b);
    };
    ballWall(0, 4, -W / 2 - 0.5, L + 2, 8, 1);
    ballWall(0, 4, W / 2 + 0.5, L + 2, 8, 1);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) ballWall(sx * (L / 2 + 0.5), 4, sz * (GOAL_W / 2 + sideLen / 2), 1, 8, sideLen);
      ballWall(sx * (L / 2 + 0.5), GOAL_H + 2.8, 0, 1, 5, GOAL_W); // above the goal
    }
    // crowd stands
    for (const sz of [-1, 1]) {
      const stand = FP.Look.boxMesh(L + 4, 2.5, 3, FP.Look.toon(0xb8a6e0));
      stand.position.set(0, 0.5, sz * (W / 2 + 3));
      FP.Stage.add(stand);
      for (let i = 0; i < 26; i++) {
        const fan = FP.Look.mesh(new THREE.SphereGeometry(0.35, 10, 8), FP.Look.toon(FP.Look.COLORS[i % 8].body), 0.03);
        fan.position.set(-L / 2 + i * (L / 25), 2.1, sz * (W / 2 + 2.7));
        fan.userData.fan = i;
        FP.Stage.add(fan);
        fans.push(fan);
      }
    }
    // the ball
    ball = makeBall();
    ball.body.addEventListener('collide', (e) => {
      const ch = e.body && e.body.userData && e.body.userData.char;
      if (ch) lastTouch = ch;
    });
    kickoff();
    FP.Camera.setAngle(0.95, 0.75);
  }
  const fans = [];

  function goal(side) {
    const x = side * (L / 2 + 1.2);
    const frameC = 0xffffff;
    const posts = [[x, GOAL_H / 2, -GOAL_W / 2, 0.25, GOAL_H, 0.25], [x, GOAL_H / 2, GOAL_W / 2, 0.25, GOAL_H, 0.25], [x, GOAL_H, 0, 0.25, 0.25, GOAL_W + 0.25]];
    posts.forEach(([px, py, pz, w, h, d]) => FP.Stage.block(px, py, pz, w, h, d, frameC));
    // net: back and sides
    const netMat = new THREE.MeshBasicMaterial({ color: side < 0 ? 0xffc2c4 : 0xc2e0ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_W, GOAL_H), netMat);
    back.rotation.y = Math.PI / 2; back.position.set(x + side * 1.8, GOAL_H / 2, 0);
    FP.Stage.add(back);
    FP.Stage.bodies.push(FP.Physics.staticBox(x + side * 1.9, GOAL_H / 2, 0, 0.2, GOAL_H, GOAL_W));
    for (const sz of [-1, 1]) {
      FP.Stage.bodies.push(FP.Physics.staticBox(x + side * 0.95, GOAL_H / 2, sz * GOAL_W / 2, 1.9, GOAL_H, 0.2));
      const s = new THREE.Mesh(new THREE.PlaneGeometry(1.9, GOAL_H), netMat);
      s.position.set(x + side * 0.95, GOAL_H / 2, sz * GOAL_W / 2);
      FP.Stage.add(s);
    }
    FP.Stage.bodies.push(FP.Physics.staticBox(x + side * 0.95, GOAL_H + 0.1, 0, 1.9, 0.2, GOAL_W));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(1.9, GOAL_W), new THREE.MeshBasicMaterial({ color: side < 0 ? 0xff5a5f : 0x4aa8ff, transparent: true, opacity: 0.35 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(x + side * 0.95, 0.02, 0);
    FP.Stage.add(floor);
  }

  function makeBall() {
    const r = 0.95;
    const g = new THREE.Group();
    g.add(FP.Look.mesh(new THREE.SphereGeometry(r, 24, 18), FP.Look.toon(0xffffff), 0.05));
    // black patches
    const patch = FP.Look.toon(0x2a2140);
    const ico = new THREE.IcosahedronGeometry(1, 0);
    const pos = ico.attributes.position;
    const seen = new Set();
    for (let i = 0; i < pos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
      const key = v.toArray().map((n) => n.toFixed(2)).join();
      if (seen.has(key)) continue;
      seen.add(key);
      const p = new THREE.Mesh(new THREE.CircleGeometry(r * 0.3, 5), patch);
      p.position.copy(v).multiplyScalar(r * 1.005);
      p.lookAt(v.clone().multiplyScalar(3));
      g.add(p);
    }
    const body = new CANNON.Body({ mass: 1.3, material: FP.Physics.mats.ball, linearDamping: 0.25, angularDamping: 0.25,
      collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.ALL });
    body.addShape(new CANNON.Sphere(r));
    return FP.Stage.prop(g, body);
  }

  function kickoff() {
    ball.body.position.set(0, 3, 0);
    ball.body.velocity.set(0, 0, 0);
    ball.body.angularVelocity.set(0, 0, 0);
  }

  function spawn(i, n, p) {
    const team = p.team, k = Math.floor(i / 2);
    const x = (team === 0 ? -1 : 1) * (4 + k * 3.5);
    const z = (k % 2 ? -1 : 1) * 2.5 * (k ? 1 : 0.2);
    return { x, y: 0, z, yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  function resetPlayers(chars) {
    chars.forEach((c, i) => { const s = spawn(i, chars.length, c.player); FP.Ragdoll.teleport(c, s.x, 0, s.z, s.yaw); });
  }

  // team rings under everyone's feet and cheering fans (also used by online friends)
  function visual(dt, chars) {
    if (!rings.length) {
      for (const c of chars) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 24), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[c.team], transparent: true, opacity: 0.9 }));
        ring.rotation.x = -Math.PI / 2;
        FP.Stage.add(ring);
        rings.push([ring, c]);
      }
    }
    for (const [ring, c] of rings) ring.position.set(c.parts.torso.position.x, 0.03, c.parts.torso.position.z);
    // fans jump up and down
    for (const f of fans) f.position.y = 2.1 + Math.abs(Math.sin(performance.now() / 180 + f.userData.fan)) * (goalPause > 0 ? 0.8 : 0.15);
  }

  function update(dt, chars, g, roundOver) {
    game = g;
    visual(dt, chars);
    if (roundOver) return null;

    time += dt;
    // anyone who falls off the field pops back in
    for (const c of chars) if (c.parts.torso.position.y < -6) { FP.Ragdoll.teleport(c, 0, 1, (Math.random() - 0.5) * 6); }
    if (ball.body.position.y < -6) kickoff();

    if (goalPause > 0) {
      goalPause -= dt;
      if (goalPause <= 0) {
        const sc = g.scores;
        if (sc.team0 >= 3) return { team: 0, points: 0, text: 'Red team wins!' };
        if (sc.team1 >= 3) return { team: 1, points: 0, text: 'Blue team wins!' };
        resetPlayers(chars); kickoff();
        FP.UI.big('Kick off!', 1);
      }
      return null;
    }
    // GOAL?
    const b = ball.body.position;
    if (Math.abs(b.x) > L / 2 + 1.1 && Math.abs(b.z) < GOAL_W / 2 && b.y < GOAL_H) {
      const scoringTeam = b.x > 0 ? 0 : 1;
      g.scores['team' + scoringTeam]++;
      goalPause = 2.6;
      const who = lastTouch && lastTouch.team === scoringTeam ? `${lastTouch.name} scores!` : lastTouch ? `Oops! ${lastTouch.name} scored for the other team!` : '';
      FP.UI.big('GOAL!', 2.4, who);
      FP.Audio.play('goal');
      FP.Props.hype();
      FP.FX.confetti(new THREE.Vector3(b.x, 0, 0), 150, 6);
      FP.Camera.shake(0.6);
      if (FP.Net) FP.Net.banner('GOAL!', who);
    }
    // 3 minutes: the team with more goals wins. A tie? Golden goal: the next goal wins (for up to 1 more minute)
    if (time > 180) {
      const sc = g.scores;
      if (sc.team0 !== sc.team1) { const t = sc.team0 > sc.team1 ? 0 : 1; return { team: t, points: 0, text: `Time! ${t ? 'Blue' : 'Red'} team wins!` }; }
      if (!golden) { golden = true; FP.UI.big('Golden goal!', 2.2, 'The next goal wins'); if (FP.Net) FP.Net.banner('Golden goal!', 'The next goal wins'); }
      if (time > 240) return { text: 'It\'s a draw!', sub: 'Nobody scored the golden goal' };
    }
    return null;
  }

  // bot brain: one bot in each team guards the goal, the others chase the ball
  function botThink(c, chars, dt, input, tools) {
    const bp = ball.body.position, p = c.parts.torso.position;
    const attackX = c.team === 0 ? L / 2 + 1.5 : -(L / 2 + 1.5);
    const team = chars.filter((o) => o.team === c.team);
    const mates = team.filter((o) => o.player.source.kind === 'bot');
    const goalie = team.length >= 3 && mates.length > 1 && mates[0] === c; // only big teams have a goalie
    if (goalie) {
      const homeX = -attackX * 0.85;
      const tz = Math.max(-GOAL_W / 2, Math.min(GOAL_W / 2, bp.z * 0.6));
      const near = Math.hypot(bp.x - homeX, bp.z) < 5;
      tools.steer(c, near ? bp.x : homeX, near ? bp.z : tz, input);
      if (Math.hypot(bp.x - p.x, bp.z - p.z) < 1.8 && Math.random() < dt * 4) input.punchPressed = true;
      if (!near && Math.hypot(homeX - p.x, tz - p.z) < 0.6) { input.x = 0; input.z = 0; }
    } else {
      // get behind the ball (on the side away from the goal we attack), then run through it.
      // If the ball is stuck on a wall, push it back toward the middle instead.
      let gx = attackX - bp.x, gz = -bp.z;
      let gl = Math.hypot(gx, gz) || 1;
      gx /= gl; gz /= gl;
      if (Math.abs(bp.z) > W / 2 - 2.2) { gz = -Math.sign(bp.z) * 1.3; gl = Math.hypot(gx, gz); gx /= gl; gz /= gl; }
      if (Math.abs(bp.x) > L / 2 - 1.8 && Math.abs(bp.z) > GOAL_W / 2) { gx = -Math.sign(bp.x) * 0.3; gz = -Math.sign(bp.z); gl = Math.hypot(gx, gz); gx /= gl; gz /= gl; }
      const behindX = Math.max(-L / 2 + 0.6, Math.min(L / 2 - 0.6, bp.x - gx * 1.5));
      const behindZ = Math.max(-W / 2 + 0.6, Math.min(W / 2 - 0.6, bp.z - gz * 1.5));
      const dBehind = Math.hypot(behindX - p.x, behindZ - p.z);
      const dBall = Math.hypot(bp.x - p.x, bp.z - p.z);
      const wrongSide = (attackX - p.x) * (attackX - bp.x) < 0 || Math.abs(attackX - p.x) < Math.abs(attackX - bp.x) - 0.5;
      if (wrongSide && dBehind > 1) tools.steer(c, behindX + (p.z > bp.z ? 1 : -1) * 0.8, behindZ + (p.z > bp.z ? 1 : -1) * 1.2, input);
      else tools.steer(c, bp.x, bp.z, input);
      if (dBall < 1.9 && Math.random() < dt * 5) input.punchPressed = true;
      if (bp.y > 1.8 && dBall < 2.5 && Math.random() < dt * 3) input.jumpPressed = true;
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    if (golden) return 'Golden goal: the next goal wins!';
    const left = Math.max(0, 180 - time);
    return `${FP.UI.ICON.clock} ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} &nbsp; first to 3 goals`;
  }

  return {
    id: 'soccer', name: 'Ragdoll Soccer', roundsToWin: 3, single: true, teams: true, minTotal: 2, song: 'party', minZoom: 17,
    art: '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#7ad866"/><rect x="0" y="0" width="30" height="80" fill="#66c455"/><rect x="60" y="0" width="30" height="80" fill="#66c455"/><path d="M60 0v80" stroke="#fff" stroke-width="2.5"/><circle cx="60" cy="40" r="14" fill="none" stroke="#fff" stroke-width="2.5"/><path d="M104 26h12v28h-12" fill="#c2e0ff" stroke="#fff" stroke-width="3"/><circle cx="72" cy="46" r="11" fill="#fff" stroke="#2a2140" stroke-width="2.5"/><path d="M72 40l5 4-2 6h-6l-2-6z" fill="#2a2140"/><ellipse cx="40" cy="44" rx="7" ry="9" fill="#ff5a5f" stroke="#2a2140" stroke-width="2.5"/><circle cx="40" cy="31" r="6" fill="#ff5a5f" stroke="#2a2140" stroke-width="2.5"/></svg>',
    desc: 'Red vs Blue! Push, punch and headbutt the giant ball into the other goal. First to 3!',
    build, spawn, update, botThink, hud, visual,
    netState: () => ({ gp: goalPause > 0 ? 1 : 0 }),
    applyNetState: (s) => { goalPause = s.gp ? 1 : 0; },
  };
})();
