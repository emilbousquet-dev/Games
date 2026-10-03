// ============================================================
//  FLOPPY PARTY — BEACH VOLLEYBALL
//  Red team vs Blue team, with a net in the middle.
//    The ball is floaty. Stand under it and you BUMP it up
//    by yourself (3 touches per side, the 3rd goes over).
//    PUNCH near the ball: hit it over the net.
//    JUMP and PUNCH up high: SPIKE!
//    Serving? PUNCH to serve.
//  The ball lands on your side: a point for the others.
//  First to 7 points wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.volley = (function () {
  const L = 16, W = 8, NET_H = 2.4, R = 0.42, LIFT = 0.55, GOAL = 7;
  const G = () => -FP.Physics.world.gravity.y * (1 - LIFT); // the floaty ball's gravity
  let ball = null, touches = 0, side = 0, lastBy = null, lastT = 0, pause = 0, server = null, serveT = 0, serveNo = [0, 0], shadow = null, self = null;
  const sideOf = (team) => (team === 0 ? -1 : 1); // Red on the left
  const pos = (c) => c.parts.torso.position;

  function build() {
    touches = 0; side = 0; lastBy = null; lastT = 0; pause = 0; server = null; serveT = 0; serveNo = [0, 0];
    const S = FP.Stage;
    S.island(0, -1, 0, L + 6, 2, W + 6, { grass: 0xf3d9a0, dirt: 0xd9b27a }); // sand
    const court = new THREE.Mesh(new THREE.PlaneGeometry(L, W), FP.Look.toon(0xf7e4b8));
    court.rotation.x = -Math.PI / 2; court.position.y = 0.03; S.add(court);
    const line = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x4aa8ff })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.04, z); S.add(m); };
    line(0, -W / 2, L, 0.12); line(0, W / 2, L, 0.12); line(-L / 2, 0, 0.12, W); line(L / 2, 0, 0.12, W);
    // the net
    for (const z of [-W / 2 - 0.3, W / 2 + 0.3]) S.block(0, NET_H / 2 + 0.2, z, 0.2, NET_H + 0.4, 0.2, 0xffffff);
    const net = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.6, 1.0, 12, 4), new THREE.MeshBasicMaterial({ color: 0x2a2140, wireframe: true }));
    net.rotation.y = Math.PI / 2; net.position.set(0, NET_H - 0.5, 0); S.add(net);
    const tape = FP.Look.boxMesh(0.06, 0.1, W + 0.6, FP.Look.toon(0xffffff), 0.01); tape.position.set(0, NET_H, 0); S.add(tape);
    const netBody = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: FP.Physics.mats.floor, collisionFilterGroup: FP.Physics.GROUP.WORLD, collisionFilterMask: FP.Physics.GROUP.PROP });
    netBody.addShape(new CANNON.Box(new CANNON.Vec3(0.05, 0.5, W / 2 + 0.3))); netBody.position.set(0, NET_H - 0.5, 0);
    FP.Physics.world.addBody(netBody); S.bodies.push(netBody);
    // a wall only people bump into, under the net
    const mid = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: FP.Physics.GROUP.NPC, collisionFilterMask: FP.Physics.ALL & ~(FP.Physics.GROUP.WORLD | FP.Physics.GROUP.PROP | FP.Physics.GROUP.NPC) });
    mid.addShape(new CANNON.Box(new CANNON.Vec3(0.15, 3, W / 2 + 3))); mid.position.set(0, 3, 0);
    FP.Physics.world.addBody(mid); S.bodies.push(mid);
    // beach things: palm trees, umbrellas, the sea
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), FP.Look.toon(0x5ab8ff));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -1.6, -35); S.add(sea);
    for (const [x, z] of [[-11, -5], [11, -5]]) {
      const trunk = FP.Look.mesh(new THREE.CylinderGeometry(0.2, 0.28, 4, 8), FP.Look.toon(0xa8744a), 0.03); trunk.position.set(x, 2, z); S.add(trunk);
      for (let k = 0; k < 5; k++) { const leaf = FP.Look.mesh(new THREE.SphereGeometry(0.9, 10, 6), FP.Look.toon(0x5cc44a), 0.03); leaf.scale.set(1.6, 0.25, 0.6); leaf.position.set(x + Math.cos(k * 1.26) * 0.9, 4.1, z + Math.sin(k * 1.26) * 0.9); leaf.rotation.y = -k * 1.26; S.add(leaf); }
    }
    const fans = FP.Props.crowd(1, 12, 1.4); fans.position.set(0, 0, -W / 2 - 2.2); S.add(fans);
    // the ball (floaty!) and its shadow
    const k = FP.Kit.ball(R, [0xffffff, 0xffcf33, 0x4aa8ff], 0.3);
    k.body.collisionFilterMask = FP.Physics.GROUP.WORLD;
    k.body.linearDamping = 0.05;
    ball = FP.Stage.prop(k.mesh, k.body);
    shadow = new THREE.Mesh(new THREE.CircleGeometry(R, 16), new THREE.MeshBasicMaterial({ color: 0x2a2140, transparent: true, opacity: 0.25, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; S.add(shadow);
    FP.Camera.setAngle(0.8, 0.8);
    self.serveTeam = 0; self.over = null;
  }

  function spawn(i, n, p) {
    const team = p && p.team !== undefined ? p.team : i % 2, row = Math.floor(i / 2);
    return { x: sideOf(team) * (row ? 5.5 : 2.5), y: 0.2, z: row ? 1.5 : -1.5, yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  // send the ball to a spot, going up to a certain height on the way (floaty gravity)
  function lob(tx, tz, apex, landY = 1.2) {
    const b = ball.body, g = G();
    const y = b.position.y, top = Math.max(apex, y + 0.5);
    const vy = Math.sqrt(2 * g * (top - y));
    const T = (vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, y - landY))) / g;
    b.velocity.set((tx - b.position.x) / T, vy, (tz - b.position.z) / T);
    b.angularVelocity.set((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6);
  }
  function touchedBy(c) {
    const team = c.team;
    if (side !== team || !lastBy) { side = team; touches = 0; }
    touches++; lastBy = c; lastT = 0;
    FP.Audio.play('boing');
  }
  const overTarget = (team) => [-sideOf(team) * (2.5 + Math.random() * 4.5), (Math.random() - 0.5) * (W - 2)];

  function bump(c) {
    touchedBy(c);
    const s = sideOf(c.team);
    if (touches >= 3) { const [tx, tz] = overTarget(c.team); lob(tx, tz, 4.5); FP.FX.word(c.parts.head.position, 'OVER!', '#ffffff', 0.9); return; }
    // set it up near the net for a teammate (or yourself)
    lob(s * (1.4 + Math.random() * 0.8), (Math.random() - 0.5) * 3, 4.6 + Math.random() * 0.6);
    FP.FX.word(c.parts.head.position, touches === 1 ? 'BUMP!' : 'SET!', '#ffffff', 0.9);
  }
  function hitOver(c) {
    const b = ball.body.position;
    const high = !c.grounded && b.y > 1.9 && Math.abs(b.x) < 4.5;
    touchedBy(c);
    const [tx, tz] = overTarget(c.team);
    if (high) {
      // SPIKE: straight down into their court
      const T = 0.45, g = G();
      ball.body.velocity.set((tx - b.x) / T, (0.3 - b.y) / T + 0.5 * g * T, (tz - b.z) / T);
      FP.FX.word(c.parts.head.position, 'SPIKE!', '#ff5a5f', 1.4); FP.Camera.shake(0.25); FP.Audio.play('hit');
    } else lob(tx, tz, 4);
    c.punchT = 0; c.punchHit = true;
  }

  function serve(c) {
    const s = sideOf(c.team);
    server = null; side = c.team; touches = 3; lastBy = c; lastT = 0; // a serve has to go straight over
    const [tx, tz] = overTarget(c.team);
    const b = ball.body; b.position.set(pos(c).x - s * 0.3, pos(c).y + 1.2, pos(c).z);
    lob(tx, tz, 4.8);
    c.punchT = 0; c.punchHit = true;
    FP.Audio.play('hit');
  }

  function newServe(team) {
    const mates = FP.Game.chars.filter((c) => c.team === team);
    if (!mates.length) return;
    server = mates[serveNo[team] % mates.length]; serveNo[team]++;
    serveT = 0; touches = 0; lastBy = null; side = team;
    // the server walks to the back line
    FP.Ragdoll.teleport(server, sideOf(team) * (L / 2 - 1), 0.3, 0, team === 0 ? Math.PI / 2 : -Math.PI / 2);
  }

  // volleyball controls: PUNCH hits the ball (or serves). Bumps happen by themselves
  function control(c, input, dt, playing) {
    const inp = input || {};
    let punch = inp.punchPressed;
    if (playing && pause <= 0) {
      if (server === c && inp.punchPressed) { serve(c); punch = false; }
      else if (inp.punchPressed && !server) {
        const b = ball.body.position, h = c.parts.head.position;
        if (Math.hypot(b.x - h.x, b.z - h.z) < 1.6 && b.y > h.y - 1.2 && b.y < h.y + 1.8) { hitOver(c); punch = false; }
      }
    }
    FP.Ragdoll.control(c, { x: inp.x || 0, z: inp.z || 0, jump: inp.jump, jumpPressed: inp.jumpPressed, punchPressed: punch, grab: false, emote: inp.emote }, dt);
  }

  // the floaty ball: gravity is weaker for it. The server holds it over their head
  function beforeStep() {
    const b = ball.body;
    if (server) {
      const p = pos(server);
      b.position.set(p.x - sideOf(server.team) * 0.2, p.y + 1.3 + Math.sin(performance.now() / 200) * 0.1, p.z);
      b.velocity.set(0, 0, 0);
    } else b.applyForce(new CANNON.Vec3(0, -FP.Physics.world.gravity.y * LIFT * b.mass, 0), b.position);
  }

  function point(team, why) {
    FP.Game.scores['team' + team]++;
    pause = 1.8;
    FP.UI.big(why, 1.4, `Point for ${team ? 'Blue' : 'Red'}!`);
    if (FP.Net) FP.Net.banner(why, `Point for ${team ? 'Blue' : 'Red'}!`);
    FP.Audio.play('goal'); FP.Props.hype();
    self.serveTeam = team;
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      lastT += dt;
      const b = ball.body.position, v = ball.body.velocity;
      if (pause > 0) {
        pause -= dt;
        if (pause <= 0) {
          const sc = game.scores;
          if (sc.team0 >= GOAL || sc.team1 >= GOAL) { self.over = sc.team0 >= GOAL ? 0 : 1; }
          else newServe(self.serveTeam);
        }
      } else if (!server && lastBy === null && touches === 0) newServe(self.serveTeam);
      else if (server) {
        serveT += dt;
        if ((server.isBot && serveT > 1.2) || serveT > 6) serve(server);
      } else {
        // automatic bumps: the ball falls onto you
        if (v.y < 0) {
          for (const c of chars) {
            if (c.ko > 0 || (lastBy === c && lastT < 0.6)) continue;
            const h = c.parts.head.position;
            if (h.x * sideOf(c.team) < 0) continue; // only on your own side
            if (Math.hypot(b.x - h.x, b.z - h.z) < 0.95 && b.y > h.y - 0.2 && b.y < h.y + 1.1) { bump(c); break; }
          }
        }
        // the ball hits the sand
        if (b.y < R + 0.1 && pause <= 0) {
          const inside = Math.abs(b.x) <= L / 2 + 0.2 && Math.abs(b.z) <= W / 2 + 0.2;
          if (inside) { const landedOn = b.x < 0 ? 0 : 1; point(1 - landedOn, landedOn === (lastBy && lastBy.team) ? 'Oops!' : 'In!'); }
          else point(lastBy ? 1 - lastBy.team : 0, 'Out!');
          ball.body.velocity.set(0, 0, 0); lastBy = null; touches = 0;
        }
        if (b.y < -5) { point(lastBy ? 1 - lastBy.team : 0, 'Out!'); lastBy = null; touches = 0; }
      }
      for (const c of chars) if (pos(c).y < -5) FP.Ragdoll.teleport(c, sideOf(c.team) * 4, 0.3, 0, c.team === 0 ? Math.PI / 2 : -Math.PI / 2);
    }
    visual();
    if (roundOver || dt === 0) return null;
    if (self.over !== undefined && self.over !== null) { const t = self.over; self.over = null; return { team: t, points: 0, text: `${t ? 'Blue' : 'Red'} team wins the volleyball match!` }; }
    return null;
  }

  function visual() {
    if (ball && shadow) { const b = ball.body.position; shadow.position.set(b.x, 0.05, b.z); shadow.scale.setScalar(Math.max(0.4, 1.4 - b.y * 0.15)); }
  }

  // bots: stand where the ball will come down on our side, spike near the net
  function landing(atY) {
    const b = ball.body.position, v = ball.body.velocity, g = G();
    const disc = v.y * v.y + 2 * g * Math.max(0, b.y - atY);
    const t = (v.y + Math.sqrt(disc)) / g;
    return { x: b.x + v.x * t, z: b.z + v.z * t, t };
  }
  function botThink(c, chars, dt, input, tools) {
    const p = pos(c), s = sideOf(c.team);
    const mates = chars.filter((o) => o.team === c.team);
    const home = { x: s * (mates.indexOf(c) === 0 ? 2.5 : 5.5), z: mates.indexOf(c) === 0 ? -1.2 : 1.2 };
    if (server === c) { input.x = 0; input.z = 0; return true; }
    const land = landing(1.6);
    const coming = !server && pause <= 0 && land.x * s > 0 && ball.body.position.y > 0.6;
    const closest = mates.reduce((a, o) => (!a || Math.hypot(pos(o).x - land.x, pos(o).z - land.z) < Math.hypot(pos(a).x - land.x, pos(a).z - land.z) ? o : a), null);
    if (coming && closest === c) {
      const lx = s * Math.max(0.6, Math.min(L / 2 - 0.5, land.x * s)); // stay on our side
      const d = tools.steer(c, lx, land.z, input);
      if (d < 0.4) { input.x *= 0.2; input.z *= 0.2; }
      // spike when the ball is up high near the net
      const b = ball.body.position;
      if (touches >= 1 && side === c.team && Math.abs(b.x) < 3.5 && Math.hypot(b.x - p.x, b.z - p.z) < 1.8 && b.y > 2.4 && b.y < 4 && c.grounded && Math.random() < dt * 6) input.jumpPressed = true;
      if (!c.grounded && Math.hypot(b.x - p.x, b.z - p.z) < 1.5 && b.y > 1.9) input.punchPressed = true;
    } else {
      tools.steer(c, home.x, home.z, input);
      if (Math.hypot(home.x - p.x, home.z - p.z) < 0.5) { input.x = 0; input.z = 0; }
    }
    return true;
  }

  function hud() {
    const serving = server ? `${FP.UI.escapeHtml(server.name)} serves! (PUNCH)` : `Touches: ${side === 0 ? 'Red' : 'Blue'} ${touches}/3`;
    return `<span>${serving} &nbsp; First to ${GOAL}</span><span class="hud-tip">Stand under the ball to BUMP it &nbsp; PUNCH: hit it over &nbsp; JUMP + PUNCH up high: SPIKE</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><rect x="0" y="52" width="120" height="28" fill="#f3d9a0"/><path d="M60 30v34" stroke="#fff" stroke-width="3"/><path d="M60 32h0" stroke="#2a2140"/><rect x="58" y="30" width="4" height="14" fill="none" stroke="#2a2140" stroke-width="1.5" stroke-dasharray="2 2"/><circle cx="46" cy="16" r="8" fill="#fff" stroke="#2a2140" stroke-width="2"/><path d="M40 12q6 4 12 0M40 20q6-4 12 0" fill="none" stroke="#ffcf33" stroke-width="2"/><ellipse cx="34" cy="50" rx="6" ry="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="34" cy="38" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><path d="M30 32l-4-6M38 32l4-6" stroke="#2a2140" stroke-width="2"/><ellipse cx="86" cy="54" rx="6" ry="8" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="86" cy="42" r="5" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'volley', name: 'Beach Volleyball', roundsToWin: 1, single: true, teams: true, minTotal: 2, song: 'chill', minZoom: 14, art: ART,
    desc: 'Red vs Blue at the beach! Stand under the floaty ball to bump it, PUNCH to hit it over, jump and punch to SPIKE. First to 7.',
    build, spawn, control, beforeStep, update, botThink, hud, visual,
    netState: () => ({ t: touches, s: side, v: server ? FP.Game.chars.indexOf(server) : -1 }),
    applyNetState: (st) => { touches = st.t; side = st.s; server = st.v >= 0 ? FP.Game.chars[st.v] || null : null; },
  };
  return self;
})();
