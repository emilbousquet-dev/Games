// ============================================================
//  FLOPPY PARTY — BASKETBALL
//  Red team vs Blue team. Grab the ball (hold grab), run to the
//  other team's hoop and let go near it to SHOOT (it aims for
//  you). 2 points, or 3 from far away. Punch whoever has the
//  ball to make them drop it. First to 10, or the most points
//  after 2:30.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.hoops = (function () {
  const L = 26, W = 15, RIM_Y = 3.1, RIM_R = 0.55, GOAL = 10, TIME = 150;
  let ball = null, time = 0, lastY = 0, thrower = null, shotFrom = 0, resetT = 0, self = null;
  // team 0 (Red) shoots at the hoop on the right (+x), team 1 (Blue) at the left
  const hoopX = (team) => (team === 0 ? 1 : -1) * (L / 2 - 1.6);

  function build() {
    time = 0; resetT = 0; thrower = null;
    const S = FP.Stage;
    S.block(0, -0.5, 0, L + 6, 1, W + 6, 0xd9a86c);
    const court = new THREE.Mesh(new THREE.PlaneGeometry(L, W), FP.Look.toon(0xf0c98a));
    court.rotation.x = -Math.PI / 2; court.position.y = 0.01; court.receiveShadow = true; S.add(court);
    const line = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); S.add(m); };
    line(0, 0, 0.15, W); line(0, -W / 2, L, 0.15); line(0, W / 2, L, 0.15); line(-L / 2, 0, 0.15, W); line(L / 2, 0, 0.15, W);
    for (const s of [-1, 1]) {
      const arc = new THREE.Mesh(new THREE.RingGeometry(6.6, 6.75, 40, 1, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      arc.rotation.x = -Math.PI / 2; arc.position.set(hoopX(s > 0 ? 0 : 1), 0.02, 0); S.add(arc);
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
    // the two hoops: pole, backboard, orange rim and a net
    for (const team of [0, 1]) {
      const hx = hoopX(team), s = Math.sign(hx);
      S.block(hx + s * 1.3, RIM_Y / 2 + 0.4, 0, 0.3, RIM_Y + 0.8, 0.3, 0x8a8fa0);
      S.block(hx + s * 0.75, RIM_Y + 0.7, 0, 0.12, 1.4, 2.2, 0xffffff);
      const sq = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.6), new THREE.MeshBasicMaterial({ color: team === 0 ? 0xff5a5f : 0x4aa8ff }));
      sq.rotation.y = -s * Math.PI / 2; sq.position.set(hx + s * 0.68, RIM_Y + 0.5, 0); S.add(sq);
      const rim = FP.Look.mesh(new THREE.TorusGeometry(RIM_R, 0.05, 8, 24), FP.Look.toon(0xff6a1a), 0.015);
      rim.rotation.x = Math.PI / 2; rim.position.set(hx, RIM_Y, 0); S.add(rim);
      const net = new THREE.Mesh(new THREE.CylinderGeometry(RIM_R, RIM_R * 0.6, 0.6, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }));
      net.position.set(hx, RIM_Y - 0.3, 0); S.add(net);
    }
    const k = FP.Kit.ball(0.34, [0xff8a2a, 0xe0661a, 0xff8a2a, 0xe0661a], 0.6);
    k.body.position.set(0, 2, 0);
    ball = FP.Stage.prop(k.mesh, k.body);
    lastY = 2;
    const fans = FP.Props.crowd(2, 14, 1.6); fans.position.set(0, 0, -W / 2 - 1.8); S.add(fans);
    FP.Camera.setAngle(0.95, 0.75);
  }

  function spawn(i, n, p) {
    const team = p.team, k = Math.floor(i / 2);
    return { x: (team === 0 ? -1 : 1) * (3.5 + k * 2.5), y: 0, z: (k % 2 ? -2 : 2) * (k ? 1 : 0.4), yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  const holder = () => FP.Ragdoll.all.find((c) => (c.grab[0] && c.grab[0].body === ball.body) || (c.grab[1] && c.grab[1].body === ball.body)) || null;

  // throwing near the other team's hoop is a SHOT: the ball flies in an arc toward the hoop
  FP.bus.on('throw', (d) => {
    if (!FP.Kit.live(self) || !d || d.who !== ball.body || d.by.team === undefined) return;
    const b = ball.body, hx = hoopX(d.by.team);
    const dx = hx - b.position.x, dz = -b.position.z, dist = Math.hypot(dx, dz);
    thrower = d.by;
    if (dist > 11) return; // too far: just a normal throw (a pass)
    const facing = (dx * Math.sin(d.by.yaw) + dz * Math.cos(d.by.yaw)) / (dist || 1);
    if (facing < 0) return;
    const g = -FP.Physics.world.gravity.y;
    const T = 0.55 + dist * 0.05;
    const miss = (Math.random() - 0.5) * (0.15 + dist * 0.05) * (d.by.isBot ? 1.4 : 1);
    const tx = hx + miss, tz = miss * 0.7, ty = RIM_Y + 0.1;
    b.velocity.set((tx - b.position.x) / T, (ty - b.position.y) / T + 0.5 * g * T, (tz - b.position.z) / T);
    b.angularVelocity.set(0, 0, -8 * Math.sign(dx));
    shotFrom = dist;
    FP.Audio.play('whoosh');
  });
  // punch the ball carrier: they drop it
  FP.bus.on('punchHit', (d) => { if (FP.Kit.live(self) && d && d.victim && holder() === d.victim && Math.random() < 0.5) { FP.Ragdoll.releaseGrab(d.victim); FP.FX.word(d.victim.parts.head.position, 'STEAL!', '#ffcf33', 1); } });

  function resetBall() { ball.body.position.set(0, 3, 0); ball.body.velocity.set(0, 0, 0); ball.body.angularVelocity.set(0, 0, 0); lastY = 3; thrower = null; }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      const b = ball.body.position;
      if (resetT > 0) { resetT -= dt; if (resetT <= 0) resetBall(); }
      else {
        // did the ball drop through a hoop?
        for (const team of [0, 1]) {
          const hx = hoopX(team);
          if (lastY >= RIM_Y && b.y < RIM_Y && Math.hypot(b.x - hx, b.z) < RIM_R) {
            const pts = shotFrom > 6.6 ? 3 : 2;
            game.scores['team' + team] += pts;
            const who = thrower && thrower.team === team ? `${thrower.name} scores ${pts}!` : `${pts} points for ${team ? 'Blue' : 'Red'}!`;
            FP.UI.big(pts === 3 ? 'THREE!' : 'SWISH!', 1.6, who);
            if (FP.Net) FP.Net.banner(pts === 3 ? 'THREE!' : 'SWISH!', who);
            FP.FX.confetti(new THREE.Vector3(hx, RIM_Y, 0), 100, 4);
            FP.Audio.play('goal'); FP.Props.hype();
            resetT = 1.6; shotFrom = 0;
          }
        }
      }
      lastY = b.y;
      if (b.y < -4) resetBall();
      for (const c of chars) if (c.parts.torso.position.y < -5) FP.Ragdoll.teleport(c, (c.team === 0 ? -5 : 5), 0.3, 0, c.team === 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    if (roundOver || dt === 0) return null;
    const sc = game.scores;
    if (sc.team0 >= GOAL || sc.team1 >= GOAL) { const t = sc.team0 >= GOAL ? 0 : 1; return { team: t, points: 0, text: `${t ? 'Blue' : 'Red'} team wins!` }; }
    if (time > TIME) {
      if (sc.team0 === sc.team1) return { text: 'It\'s a tie!' };
      const t = sc.team0 > sc.team1 ? 0 : 1;
      return { team: t, points: 0, text: `Time! ${t ? 'Blue' : 'Red'} team wins!` };
    }
    return null;
  }

  // bot brain: one player per team goes for a loose ball, the other gets open near the hoop.
  // With the ball: run to the hoop and shoot. Defense: one chases the carrier, one guards the hoop.
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position, b = ball.body.position;
    const h = holder();
    const mates = chars.filter((o) => o.team === c.team);
    const closestTo = (list, x, z) => list.reduce((a, o) => (!a || Math.hypot(o.parts.torso.position.x - x, o.parts.torso.position.z - z) < Math.hypot(a.parts.torso.position.x - x, a.parts.torso.position.z - z) ? o : a), null);
    const myHoop = hoopX(c.team), theirHoop = hoopX(c.team === 0 ? 1 : 0);
    // grabbed a person by mistake? let go
    if ((c.grab[0] && c.grab[0].victim) || (c.grab[1] && c.grab[1].victim)) { input.grab = false; tools.unstick(input); return true; }
    if (h === c) {
      input.grab = true;
      const dist = Math.hypot(myHoop - p.x, p.z);
      tools.steer(c, myHoop - Math.sign(myHoop) * 3, 0, input);
      const face = Math.atan2(myHoop - p.x, -p.z) - c.yaw;
      if (dist < 7.5 && Math.abs(Math.atan2(Math.sin(face), Math.cos(face))) < 0.45) input.grab = false; // shoot!
    } else if (!h) {
      if (closestTo(mates, b.x, b.z) === c) {
        const d = tools.steer(c, b.x, b.z, input);
        if (d < 1.4) { input.grab = true; input.x *= 0.5; input.z *= 0.5; }
      } else {
        tools.steer(c, myHoop - Math.sign(myHoop) * 5, c.index % 2 ? 2.5 : -2.5, input);
        input.x *= 0.6; input.z *= 0.6;
      }
    } else if (h.team === c.team) {
      // teammate has it: get open near the hoop
      tools.steer(c, myHoop - Math.sign(myHoop) * 4.5, c.index % 2 ? 3 : -3, input);
      input.x *= 0.7; input.z *= 0.7;
    } else {
      const q = h.parts.torso.position;
      if (closestTo(mates, q.x, q.z) === c) {
        const d = tools.steer(c, q.x, q.z, input);
        if (d < 1.5 && Math.random() < dt * 3) input.punchPressed = true;
      } else {
        // guard our own hoop
        tools.steer(c, theirHoop - Math.sign(theirHoop) * 2.5, q.z * 0.4, input);
        input.x *= 0.8; input.z *= 0.8;
      }
    }
    tools.unstick(input);
    return true;
  }

  function hud() { return `Grab the ball, shoot at the other team's hoop! First to ${GOAL} &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><rect x="8" y="50" width="104" height="26" rx="4" fill="#f0c98a" stroke="#2a2140" stroke-width="2"/><rect x="92" y="12" width="4" height="40" fill="#8a8fa0"/><rect x="80" y="10" width="16" height="16" fill="#fff" stroke="#2a2140" stroke-width="2"/><ellipse cx="80" cy="26" rx="8" ry="2.5" fill="none" stroke="#ff6a1a" stroke-width="2.5"/><path d="M73 27l2 9h10l2-9" fill="none" stroke="#fff" stroke-width="1.5"/><circle cx="58" cy="22" r="7" fill="#ff8a2a" stroke="#2a2140" stroke-width="2"/><path d="M51 22h14M58 15v14" stroke="#2a2140" stroke-width="1.2"/><path d="M36 40q10-22 20-18" fill="none" stroke="#2a2140" stroke-width="1.5" stroke-dasharray="3 3"/><ellipse cx="32" cy="46" rx="6" ry="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="32" cy="34" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'hoops', name: 'Basketball', roundsToWin: 1, single: true, teams: true, minTotal: 2, song: 'party', minZoom: 17, art: ART,
    desc: 'Red vs Blue! Grab the ball, run to the other hoop and let go to shoot. First to 10 points.',
    build, spawn, update, botThink, hud,
  };
  return self;
})();
