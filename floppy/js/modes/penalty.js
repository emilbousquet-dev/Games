// ============================================================
//  FLOPPY PARTY — PENALTY SHOOTOUT
//  Everyone takes turns: shoot at the goal, then be the goalie.
//    Shooter: left / right / up / down move your aim,
//             PUNCH to shoot!
//    Goalie:  left / right to move, JUMP to dive!
//  3 shots each. A goal = 1 point for the shooter,
//  a save = 1 point for the goalie. Most points wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.penalty = (function () {
  const GOAL_Z = -11, GOAL_W = 6, GOAL_H = 2.4, SPOT_Z = -1, R = 0.35, SHOTS = 3;
  let ball = null, marker = null, order = [], shot = 0, phase = 'setup', t = 0, aim = { x: 0, y: 0.8 }, shooter = null, keeper = null, dive = 0, result = '', self = null;

  function build() {
    order = []; shot = 0; phase = 'setup'; t = 0; aim = { x: 0, y: 0.8 }; shooter = null; keeper = null; result = '';
    const S = FP.Stage;
    S.block(0, -0.5, -4, 22, 1, 20, 0x6ccf5a);
    for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.PlaneGeometry(22, 20 / 6), FP.Look.toon(i % 2 ? 0x7ad866 : 0x66c455)); st.rotation.x = -Math.PI / 2; st.position.set(0, 0.005, -4 - 10 + 10 / 6 + i * 20 / 6); S.add(st); }
    const line = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0xffffff })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.01, z); S.add(m); };
    line(0, GOAL_Z, 20, 0.15); line(0, GOAL_Z + 5, 12, 0.15); line(-6, GOAL_Z + 2.5, 0.15, 5); line(6, GOAL_Z + 2.5, 0.15, 5);
    const spot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 12), new THREE.MeshBasicMaterial({ color: 0xffffff })); spot.rotation.x = -Math.PI / 2; spot.position.set(0, 0.012, SPOT_Z); S.add(spot);
    // the goal: posts, crossbar and a net
    for (const x of [-GOAL_W / 2, GOAL_W / 2]) S.block(x, GOAL_H / 2, GOAL_Z, 0.22, GOAL_H, 0.22, 0xffffff);
    S.block(0, GOAL_H, GOAL_Z, GOAL_W + 0.22, 0.22, 0.22, 0xffffff);
    const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, side: THREE.DoubleSide, wireframe: true });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(GOAL_W, GOAL_H, 12, 5), netMat); back.position.set(0, GOAL_H / 2, GOAL_Z - 1.6); S.add(back);
    S.bodies.push(FP.Physics.staticBox(0, GOAL_H / 2, GOAL_Z - 1.7, GOAL_W, GOAL_H, 0.2));
    for (const x of [-GOAL_W / 2, GOAL_W / 2]) { const sd = new THREE.Mesh(new THREE.PlaneGeometry(1.6, GOAL_H, 4, 5), netMat); sd.rotation.y = Math.PI / 2; sd.position.set(x, GOAL_H / 2, GOAL_Z - 0.8); S.add(sd); S.bodies.push(FP.Physics.staticBox(x, GOAL_H / 2, GOAL_Z - 0.8, 0.2, GOAL_H, 1.6)); }
    S.bodies.push(FP.Physics.staticBox(0, GOAL_H + 0.1, GOAL_Z - 0.8, GOAL_W, 0.2, 1.6));
    // the ball and the aim marker
    const k = FP.Kit.ball(R, [0xffffff, 0x2a2140, 0xffffff, 0x2a2140], 0.45);
    k.body.collisionFilterMask = FP.Physics.GROUP.WORLD;
    k.body.material = FP.Physics.mats.ball;
    k.body.linearDamping = 0.1;
    ball = FP.Stage.prop(k.mesh, k.body);
    marker = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.4, 20), new THREE.MeshBasicMaterial({ color: 0xffcf33, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }));
    S.add(marker);
    const fans = FP.Props.crowd(3, 16, 1.4); fans.position.set(0, 0, GOAL_Z - 4.5); S.add(fans);
    FP.Camera.setAngle(0.55, 0.9);
  }

  // people waiting their turn stand on the side
  function sideSpot(i) { return { x: 7 + (i % 2) * 1.2, y: 0.2, z: -2 - Math.floor(i / 2) * 1.4, yaw: -Math.PI / 2 }; }
  function spawn(i) { return sideSpot(i); }

  function nextShot(chars) {
    if (!order.length) order = chars.slice();
    const n = order.length;
    if (shot >= SHOTS * n || n < 2) { phase = 'done'; return; }
    shooter = order[shot % n];
    keeper = order[(shot + 1) % n];
    phase = 'setup'; t = 0; dive = 0; aim = { x: 0, y: 0.8 };
    shooter.shotAim = null;
    // everyone to their places
    FP.Ragdoll.teleport(shooter, 0.3, 0.3, SPOT_Z + 1.3, Math.PI);
    FP.Ragdoll.teleport(keeper, 0, 0.3, GOAL_Z + 0.6, 0);
    order.filter((c) => c !== shooter && c !== keeper).forEach((c, i) => FP.Ragdoll.teleport(c, sideSpot(i).x, 0.3, sideSpot(i).z, -Math.PI / 2));
    ball.body.position.set(0, R + 0.02, SPOT_Z); ball.body.velocity.set(0, 0, 0); ball.body.angularVelocity.set(0, 0, 0);
    const r = Math.floor(shot / n) + 1;
    FP.UI.big(`${shooter.name} shoots!`, 1.2, `${keeper.name} is the goalie. Shot ${r} of ${SHOTS}`);
    if (FP.Net) FP.Net.banner(`${shooter.name} shoots!`, `${keeper.name} is the goalie`);
  }

  function kick() {
    const b = ball.body;
    const wob = shooter.isBot ? 0.35 : 0.22;
    const tx = aim.x + (Math.random() - 0.5) * wob, ty = Math.max(0.2, aim.y + (Math.random() - 0.5) * wob);
    const T = 0.62, g = -FP.Physics.world.gravity.y;
    const tz = GOAL_Z - 0.4;
    b.velocity.set((tx - b.position.x) / T, (ty - b.position.y) / T + 0.5 * g * T, (tz - b.position.z) / T);
    b.angularVelocity.set(-20, 0, 0);
    phase = 'fly'; t = 0;
    shooter.punchT = 0; shooter.punchHit = true;
    for (const bd of shooter.bodies) bd.velocity.z -= 3;
    FP.Audio.play('hit'); FP.Audio.play('whoosh');
  }

  function finish(what, game) {
    phase = 'result'; t = 0; result = what;
    const pos = new THREE.Vector3(0, 2.6, GOAL_Z + 1);
    if (what === 'goal') {
      game.scores[shooter.player.id] = (game.scores[shooter.player.id] || 0) + 1;
      FP.UI.big('GOAL!', 1.3, `${shooter.name} scores!`); if (FP.Net) FP.Net.banner('GOAL!', shooter.name);
      FP.FX.confetti(pos, 120, 5); FP.Audio.play('goal'); FP.Props.hype();
      shooter.cheer = 1.5; shooter.expression = 'happy'; shooter.exprTimer = 1.5;
    } else if (what === 'save') {
      game.scores[keeper.player.id] = (game.scores[keeper.player.id] || 0) + 1;
      FP.UI.big('SAVED!', 1.3, `What a save by ${keeper.name}!`); if (FP.Net) FP.Net.banner('SAVED!', keeper.name);
      FP.Audio.play('cheer'); FP.Props.hype();
      keeper.cheer = 1.5; keeper.expression = 'happy'; keeper.exprTimer = 1.5;
    } else {
      const b = ball.body.position;
      const why = Math.abs(b.x) >= GOAL_W / 2 - 0.1 ? 'Wide!' : 'Over the bar!';
      FP.UI.big('MISSED!', 1.2, why); if (FP.Net) FP.Net.banner('MISSED!', why);
      FP.Audio.play('beep');
    }
  }

  // penalty controls
  function control(c, input, dt, playing) {
    const inp = input || {};
    const p = c.parts.torso.position;
    const fake = { x: 0, z: 0, jumpPressed: false, grab: false, emote: inp.emote };
    if (playing && c === shooter && phase === 'aim') {
      const ix = c.isBot ? 0 : inp.x || 0, iz = c.isBot ? 0 : inp.z || 0;
      aim.x = Math.max(-GOAL_W / 2 - 0.3, Math.min(GOAL_W / 2 + 0.3, aim.x + ix * dt * 4));
      aim.y = Math.max(0.25, Math.min(GOAL_H + 0.3, aim.y - iz * dt * 3));
      if (!c.isBot && inp.punchPressed) kick();
      fake.x = (0.3 - p.x) * 3; fake.z = (SPOT_Z + 1.3 - p.z) * 3;
    } else if (c === keeper && (phase === 'aim' || phase === 'fly' || phase === 'setup')) {
      // the goalie moves along the goal line and dives with JUMP
      const ix = c.isBot ? c.keepX || 0 : inp.x || 0;
      fake.x = ix; fake.z = (GOAL_Z + 0.6 - p.z) * 3;
      if (Math.abs(p.x) > GOAL_W / 2 - 0.3 && Math.sign(fake.x) === Math.sign(p.x)) fake.x = 0;
      const wantDive = c.isBot ? c.keepDive : inp.jumpPressed;
      if (playing && wantDive && dive <= 0 && c.grounded) {
        const dir = Math.sign(ix) || (Math.random() < 0.5 ? -1 : 1);
        for (const bd of c.bodies) { bd.velocity.x += dir * 7.5; bd.velocity.y += 3.5; }
        dive = 1.2; c.keepDive = false;
        FP.Audio.play('whoosh');
      }
    } else {
      fake.x = 0; fake.z = 0;
    }
    if (Math.hypot(fake.x, fake.z) < 0.12) { fake.x = 0; fake.z = 0; }
    fake.x = Math.max(-1, Math.min(1, fake.x)); fake.z = Math.max(-1, Math.min(1, fake.z));
    FP.Ragdoll.control(c, fake, dt);
    if (c === shooter) c.yaw = Math.PI;
    else if (c === keeper) c.yaw = 0;
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      t += dt; dive -= dt;
      const b = ball.body.position, v = ball.body.velocity;
      if (!shooter && phase !== 'done') nextShot(chars);
      else if (phase === 'setup') { if (t > 1.2) { phase = 'aim'; t = 0; botPlan(); } }
      else if (phase === 'aim') {
        if (shooter.isBot && t > shooter.botShootAt) kick();
        else if (t > 7) kick(); // too slow: it shoots by itself
      } else if (phase === 'fly') {
        // bots in goal: guess a side and dive
        if (keeper.isBot && keeper.botGuess && t > keeper.botGuess.at && !keeper.botGuess.done) { keeper.botGuess.done = true; keeper.keepX = keeper.botGuess.dir; keeper.keepDive = true; }
        // the goalie gets a hand (or a face) on it
        const parts = [keeper.parts.torso, keeper.parts.head, ...keeper.parts.arms, ...keeper.parts.legs];
        if (parts.some((q) => q.position.distanceTo(b) < R + 0.33) && b.z > GOAL_Z - 0.3) {
          ball.body.velocity.set((Math.random() - 0.5) * 6, 3, Math.abs(v.z) * 0.35);
          finish('save', game);
        } else if (b.z < GOAL_Z - 0.3) {
          if (Math.abs(b.x) < GOAL_W / 2 - 0.1 && b.y < GOAL_H - 0.1) finish('goal', game);
          else finish('miss', game);
        } else if (t > 2.5) finish(Math.abs(b.x) < GOAL_W / 2 ? 'save' : 'miss', game);
      } else if (phase === 'result') {
        if (t > 1.8) { shot++; shooter = null; if (shot >= SHOTS * order.length) phase = 'done'; }
      }
      // the aim marker (hidden when the goalie is a person on this computer, so it's fair)
      const keeperLocal = keeper && keeper.player && ['keys', 'pad', 'touch'].includes(keeper.player.source.kind);
      marker.visible = phase === 'aim' && !(keeperLocal && shooter && !shooter.isBot);
      marker.position.set(aim.x, aim.y, GOAL_Z + 0.05);
      marker.scale.setScalar(1 + Math.sin(performance.now() / 150) * 0.1);
    }
    if (roundOver || dt === 0) return null;
    if (phase === 'done') {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `${w[0].name} wins the shootout!` : "It's a tie!" };
    }
    return null;
  }

  // bots: pick a corner to shoot at, or a side to dive to
  function botPlan() {
    if (shooter.isBot) {
      shooter.botShootAt = 1 + Math.random() * 1.5;
      const corners = [[-2.3, 0.5], [2.3, 0.5], [-2.2, 1.9], [2.2, 1.9], [0, 0.6], [-1.2, 1.2], [1.2, 1.2]];
      const [x, y] = corners[Math.floor(Math.random() * corners.length)];
      aim = { x, y };
    }
    if (keeper.isBot) {
      const smart = { easy: 0.3, normal: 0.45, hard: 0.6 }[keeper.botSkill] || 0.45;
      const right = Math.random() < smart; // guessed the right side?
      const dir = Math.abs(aim.x) < 0.8 ? 0 : right ? Math.sign(aim.x) : -Math.sign(aim.x);
      keeper.botGuess = { at: 0.12 + Math.random() * 0.15, dir, done: false };
      keeper.keepX = 0; keeper.keepDive = false;
      if (dir === 0) keeper.botGuess.at = 99; // stays in the middle
    }
  }
  function botThink() { return true; } // penalty bots are driven by the game itself

  function hud() {
    if (!shooter) return 'Penalty shootout!';
    const tip = phase === 'aim' ? 'Shooter: move your aim, PUNCH to shoot &nbsp; Goalie: left / right, JUMP to dive' : '';
    return `<span>${FP.UI.escapeHtml(shooter.name)} vs ${FP.UI.escapeHtml(keeper.name)} &nbsp; Shot ${Math.floor(shot / Math.max(1, order.length)) + 1} of ${SHOTS}</span>${tip ? `<span class="hud-tip">${tip}</span>` : ''}`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#7ad866"/><rect x="24" y="14" width="72" height="34" fill="#c2e0ff" opacity=".6" stroke="#fff" stroke-width="4"/><ellipse cx="44" cy="36" rx="6" ry="8" fill="#ffcf33" stroke="#2a2140" stroke-width="2" transform="rotate(-60 44 36)"/><circle cx="36" cy="32" r="4" fill="#ffcf33" stroke="#2a2140" stroke-width="2"/><circle cx="74" cy="26" r="5" fill="#fff" stroke="#2a2140" stroke-width="2"/><circle cx="74" cy="26" r="8" fill="none" stroke="#ffcf33" stroke-width="2"/><ellipse cx="62" cy="66" rx="6" ry="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="62" cy="55" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'penalty', name: 'Penalty Shootout', roundsToWin: 1, single: true, minTotal: 2, defaultBots: 3, song: 'tense', minZoom: 12, art: ART,
    desc: 'Take turns shooting and being the goalie! Aim, PUNCH to shoot. In goal: move and JUMP to dive.',
    build, spawn, control, update, botThink, hud,
    scoreLabel: (s) => `${s} pts`,
    focus: () => [new THREE.Vector3(0, 1, GOAL_Z), new THREE.Vector3(0, 0, SPOT_Z + 2)],
    netState: () => ({ p: phase, ax: Math.round(aim.x * 100) / 100, ay: Math.round(aim.y * 100) / 100 }),
    applyNetState: (s) => { phase = s.p; aim.x = s.ax; aim.y = s.ay; if (marker) { marker.visible = phase === 'aim'; marker.position.set(aim.x, aim.y, GOAL_Z + 0.05); } },
  };
  return self;
})();
