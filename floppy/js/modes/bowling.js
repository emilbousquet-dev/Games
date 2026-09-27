// ============================================================
//  FLOPPY PARTY — BOWLING
//  Everyone has their own lane. Grab your bowling ball (hold
//  grab), run toward the pins and let go to bowl it! 3 throws
//  each. Knock down all 10 pins for a STRIKE (+5 bonus, and the
//  pins come back). Most pins wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.bowling = (function () {
  const LANE_W = 3.6, FOUL_Z = -3.2, PIN_Z = -17, THROWS = 3, TIME = 100;
  let lanes = [], time = 0, self = null;

  const laneX = (i, n) => (i - (n - 1) / 2) * (LANE_W + 0.6);
  // the 10 pins in a triangle
  const PIN_SPOTS = [];
  for (let row = 0; row < 4; row++) for (let k = 0; k <= row; k++) PIN_SPOTS.push([(k - row / 2) * 0.62, -row * 0.62]);

  function pinMesh() {
    const g = new THREE.Group();
    const body = FP.Look.mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.62, 14), FP.Look.toon(0xffffff), 0.02);
    const neck = FP.Look.mesh(new THREE.SphereGeometry(0.1, 12, 10), FP.Look.toon(0xffffff), 0.02);
    neck.position.y = 0.38;
    const band = FP.Look.mesh(new THREE.CylinderGeometry(0.105, 0.11, 0.06, 14), FP.Look.toon(0xff5a5f), 0);
    band.position.y = 0.2;
    g.add(body, neck, band);
    return g;
  }

  function makePins(lane) {
    lane.pins = PIN_SPOTS.map(([dx, dz]) => {
      const body = new CANNON.Body({ mass: 0.35, material: FP.Physics.mats.prop, linearDamping: 0.1, angularDamping: 0.2, collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.ALL });
      body.addShape(new CANNON.Cylinder(0.12, 0.16, 0.62, 10));
      body.addShape(new CANNON.Sphere(0.1), new CANNON.Vec3(0, 0.38, 0));
      const x = lane.x + dx, z = PIN_Z + dz;
      body.position.set(x, 0.32, z);
      const pin = { ...FP.Stage.prop(pinMesh(), body), x, z, down: false };
      return pin;
    });
  }
  function resetPins(lane) {
    lane.pins.forEach((p) => {
      p.down = false; p.mesh.visible = true;
      p.body.position.set(p.x, 0.32, p.z); p.body.velocity.set(0, 0, 0); p.body.angularVelocity.set(0, 0, 0); p.body.quaternion.set(0, 0, 0, 1);
    });
  }

  function build(list) {
    lanes = []; time = 0;
    const S = FP.Stage;
    const n = Math.max(1, list.length);
    const width = n * (LANE_W + 0.6) + 4;
    S.island(0, -1, -8, width, 2, 26, { grass: 0x9bd46e });
    for (let i = 0; i < n; i++) {
      const x = laneX(i, n);
      S.block(x, 0.02, -10, LANE_W, 0.04, 17, 0xf0c98a); // the shiny wooden lane
      const arrows = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.9), new THREE.MeshBasicMaterial({ color: 0xc98b58 }));
      arrows.rotation.x = -Math.PI / 2; arrows.position.set(x, 0.05, -6); S.add(arrows);
      const foul = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W, 0.12), new THREE.MeshBasicMaterial({ color: 0xff5a5f }));
      foul.rotation.x = -Math.PI / 2; foul.position.set(x, 0.05, FOUL_Z); S.add(foul);
      // low bumpers between lanes, a back wall behind the pins
      for (const s of [-1, 1]) S.block(x + s * (LANE_W / 2 + 0.2), 0.2, -10, 0.3, 0.4, 17, 0x8a6a55);
      S.block(x, 0.8, PIN_Z - 3, LANE_W + 0.6, 1.6, 0.4, 0x3a3450);
      // a wall only people bump into, so nobody walks down the lane to kick the pins
      const w = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: FP.Physics.GROUP.NPC, collisionFilterMask: FP.Physics.ALL & ~(FP.Physics.GROUP.WORLD | FP.Physics.GROUP.PROP | FP.Physics.GROUP.NPC) });
      w.addShape(new CANNON.Box(new CANNON.Vec3(LANE_W / 2, 2, 0.2)));
      w.position.set(x, 2, FOUL_Z - 0.3);
      FP.Physics.world.addBody(w); S.bodies.push(w);
      // the ball
      const k = FP.Kit.ball(0.34, [[0x4aa8ff, 0x9b6bff], [0xff5a5f, 0xff9a3c], [0x5cc44a, 0x3dd6c4], [0xffcf33, 0xff7eb6]][i % 4], 3);
      k.body.material = FP.Physics.mats.prop; k.body.angularDamping = 0.05;
      const home = { x: x + 1, y: 0.5, z: 1.5 };
      k.body.position.set(home.x, home.y, home.z);
      const ball = { ...FP.Stage.prop(k.mesh, k.body), home, rolling: false, rollT: 0 };
      const lane = { i, x, ball, throws: 0, score: 0, pins: [], player: list[i] || null, msg: 0 };
      makePins(lane);
      lanes.push(lane);
      // a scoreboard sign over each lane
      const sign = FP.Props.billboard(2.2, 0.8);
      sign.position.set(x, 4.6, PIN_Z - 3.4);
      S.add(sign);
      lane.sign = sign.userData.panel;
    }
    const fans = FP.Props.crowd(1, Math.max(4, n * 3), 1.3); fans.position.set(0, 0, 4.6); fans.rotation.y = Math.PI; S.add(fans);
    FP.Camera.setAngle(0.75, 0.9);
  }

  function spawn(i, n) { return { x: laneX(i, n), y: 0.1, z: 0.5, yaw: Math.PI }; }

  const laneOf = (c) => lanes.find((l) => l.player && c.player && l.player.id === c.player.id);

  // a ball was thrown: send it rolling down the lane (a little help aiming)
  FP.bus.on('throw', (d) => {
    if (!FP.Kit.live(self) || !d || !d.who) return;
    const lane = lanes.find((l) => l.ball.body === d.who);
    if (!lane || lane.rolling) return;
    const own = laneOf(d.by) === lane;
    if (!own || lane.throws >= THROWS) return;
    const b = d.who, fx = Math.sin(d.by.yaw), fz = Math.cos(d.by.yaw);
    // the ball starts rolling from the line, in your lane. Where you stand and face aims it a little
    const px = d.by.parts.torso.position.x;
    const startX = lane.x + Math.max(-1.1, Math.min(1.1, (px - lane.x) * 0.6));
    b.position.set(startX, 0.4, FOUL_Z - 0.7);
    const side = Math.max(-0.12, Math.min(0.12, fx * 0.35 + (lane.x - startX) * 0.06));
    b.velocity.set(side * 15, 0, -15 * (fz < 0.2 ? 1 : 0.8));
    b.angularVelocity.set(-40, 0, 0);
    lane.rolling = true; lane.rollT = 0; lane.throws++;
    FP.Audio.play('whoosh');
  });

  function countPins(lane, game) {
    let now = 0;
    for (const p of lane.pins) {
      if (p.down) continue;
      const up = new CANNON.Vec3(0, 1, 0), v = p.body.quaternion.vmult(up);
      const moved = Math.hypot(p.body.position.x - p.x, p.body.position.z - p.z);
      if (v.y < 0.75 || moved > 0.5 || p.body.position.y < -1) { p.down = true; now++; }
    }
    // knocked pins are swept away
    for (const p of lane.pins) if (p.down) { p.mesh.visible = false; p.body.position.set(p.x, -50 - lane.i * 3, p.z); p.body.velocity.set(0, 0, 0); }
    lane.score += now;
    const all = lane.pins.every((p) => p.down);
    const who = lane.player ? lane.player.name : '';
    if (all) {
      lane.score += 5;
      FP.UI.toast(`${who}: ${now === 10 ? 'STRIKE!' : 'SPARE!'} +5 bonus`, 2.2);
      FP.FX.confetti(new THREE.Vector3(lane.x, 1, PIN_Z));
      FP.Audio.play('cheer'); FP.Props.hype();
      resetPins(lane);
    } else if (now) FP.FX.word(new THREE.Vector3(lane.x, 2, PIN_Z), `${now} pin${now > 1 ? 's' : ''}!`, '#ffcf33', 1.4);
    else FP.FX.word(new THREE.Vector3(lane.x, 2, PIN_Z), 'Gutter!', '#8a8fa0', 1.2);
    if (lane.player) game.scores[lane.player.id] = lane.score;
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const lane of lanes) {
        const b = lane.ball.body;
        if (lane.rolling) {
          lane.rollT += dt;
          const sp = Math.hypot(b.velocity.x, b.velocity.z);
          // the throw is over when the ball stops or goes past the pins (give the pins a moment to fall)
          if (lane.rollT > 5 || b.position.z < PIN_Z - 2.5 || b.position.y < -3 || (lane.rollT > 1.2 && sp < 0.4)) {
            lane.settle = (lane.settle || 0) + dt;
            if (lane.settle > 1.2) {
              lane.settle = 0; lane.rolling = false;
              countPins(lane, game);
              b.position.set(lane.ball.home.x, 0.5, lane.ball.home.z); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0);
            }
          }
        } else if (b.position.y < -3 || b.position.z < FOUL_Z - 1.5) {
          // a ball that got loose without a proper throw comes back
          b.position.set(lane.ball.home.x, 0.5, lane.ball.home.z); b.velocity.set(0, 0, 0);
        }
        lane.sign.material.color.setHex(lane.player ? FP.Look.COLORS[lane.player.colorIndex].body : 0xffffff);
      }
      for (const c of chars) if (c.parts.torso.position.y < -5) FP.Ragdoll.teleport(c, laneOf(c) ? laneOf(c).x : 0, 0.3, 0.5, Math.PI);
    }
    if (roundOver || dt === 0) return null;
    const done = lanes.every((l) => !l.player || (l.throws >= THROWS && !l.rolling));
    if (done || time > TIME) {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `${w[0].name} is the bowling champ!` : 'It\'s a tie!' };
    }
    return null;
  }

  // bot brain: get the ball, walk to the line, bowl it
  function botThink(c, chars, dt, input, tools) {
    const lane = laneOf(c);
    const p = c.parts.torso.position;
    if (!lane || lane.throws >= THROWS || lane.rolling) { tools.steer(c, lane ? lane.x : 0, 1.5, input); input.x *= 0.3; input.z *= 0.3; return true; }
    const b = lane.ball.body;
    const holding = (c.grab[0] && c.grab[0].body === b) || (c.grab[1] && c.grab[1].body === b);
    if (!holding) {
      const d = tools.steer(c, b.position.x, b.position.z, input);
      if (d < 1.3) { input.grab = true; input.x *= 0.4; input.z *= 0.4; }
    } else {
      input.grab = true;
      // walk toward the foul line in the middle of the lane, then let go
      const aim = lane.x + (Math.random() - 0.5) * 0.3;
      input.x = Math.max(-1, Math.min(1, (aim - p.x) * 1.5)); input.z = -1;
      if (p.z < FOUL_Z + 1.4 && Math.abs(p.x - lane.x) < 0.6) input.grab = false;
    }
    return true;
  }

  function hud() {
    const left = lanes.filter((l) => l.player).map((l) => `${FP.UI.escapeHtml(l.player.name)}: ${Math.max(0, THROWS - l.throws)} left`).join(' &nbsp; ');
    return `Grab your ball and bowl! &nbsp; ${left}`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><path d="M34 76l12-60h28l12 60z" fill="#f0c98a" stroke="#2a2140" stroke-width="2"/><g fill="#fff" stroke="#2a2140" stroke-width="1.5"><ellipse cx="54" cy="22" rx="3" ry="6"/><ellipse cx="66" cy="22" rx="3" ry="6"/><ellipse cx="60" cy="18" rx="3" ry="6"/><ellipse cx="48" cy="18" rx="3" ry="6"/><ellipse cx="72" cy="18" rx="3" ry="6"/></g><circle cx="58" cy="58" r="9" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="55" cy="55" r="1.5" fill="#2a2140"/><circle cx="60" cy="54" r="1.5" fill="#2a2140"/><path d="M58 44v-8M52 46l-3-6M64 46l3-6" stroke="#2a2140" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>';

  self = {
    id: 'bowling', name: 'Bowling', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 3, song: 'chill', minZoom: 17, art: ART,
    desc: 'Everyone has a lane. Grab your ball, run and let go to bowl! Knock down the most pins in 3 throws.',
    build, spawn, update, botThink, hud,
    scoreLabel: (s) => `${s}`,
    focus: (chars) => chars.map(FP.Ragdoll.center).concat(lanes.map((l) => new THREE.Vector3(l.x, 0, PIN_Z + 4))),
    netState: () => lanes.map((l) => [l.throws, l.score, l.pins.map((p) => (p.down ? 1 : 0)).join('')]),
    applyNetState: (s) => { s.forEach(([t, sc, pins], i) => { const l = lanes[i]; if (!l) return; l.throws = t; l.score = sc; l.pins.forEach((p, k) => { p.down = pins[k] === '1'; p.mesh.visible = !p.down; }); }); },
  };
  return self;
})();
