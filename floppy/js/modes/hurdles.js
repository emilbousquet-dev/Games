// ============================================================
//  FLOPPY PARTY — HURDLE DASH
//  A sprint race on the track!
//    MASH PUNCH as fast as you can to run faster.
//    JUMP over the hurdles (hit one and you trip!).
//  3 races. Points for each race: 1st 4, 2nd 3, 3rd 2, 4th 1.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.hurdles = (function () {
  const LANE = 2.2, LENGTH = 70, START_Z = 4, HURDLE_H = 0.62, PLACE_PTS = [4, 3, 2, 1];
  let lanes = [], hurdles = [], finished = [], time = 0, endT = 0, self = null;
  const finishZ = START_Z - LENGTH;
  const laneX = (i, n) => (i - (n - 1) / 2) * LANE;

  function hurdleMesh() {
    const g = new THREE.Group();
    for (const x of [-0.8, 0.8]) { const post = FP.Look.mesh(new THREE.CylinderGeometry(0.05, 0.05, HURDLE_H, 6), FP.Look.toon(0xffffff), 0.015); post.position.set(x, HURDLE_H / 2, 0); g.add(post); }
    const bar = FP.Look.boxMesh(1.8, 0.14, 0.08, FP.Look.toon(0xff5a5f), 0.02); bar.position.y = HURDLE_H; g.add(bar);
    const stripe = FP.Look.boxMesh(0.5, 0.15, 0.09, FP.Look.toon(0xffffff), 0); stripe.position.y = HURDLE_H; g.add(stripe);
    return g;
  }

  function build(list) {
    lanes = []; hurdles = []; finished = []; time = 0; endT = 0;
    const S = FP.Stage;
    const n = Math.max(1, list.length), width = n * LANE + 3;
    S.island(0, -1, START_Z - LENGTH / 2, width, 2, LENGTH + 12, { grass: 0x9bd46e });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(n * LANE + 0.4, LENGTH + 6), FP.Look.toon(0xe0674a));
    track.rotation.x = -Math.PI / 2; track.position.set(0, 0.03, START_Z - LENGTH / 2); S.add(track);
    for (let i = 0; i <= n; i++) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.08, LENGTH + 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      l.rotation.x = -Math.PI / 2; l.position.set((i - n / 2) * LANE, 0.04, START_Z - LENGTH / 2); S.add(l);
    }
    // start line and checkered finish line
    const start = new THREE.Mesh(new THREE.PlaneGeometry(n * LANE, 0.15), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    start.rotation.x = -Math.PI / 2; start.position.set(0, 0.05, START_Z - 0.6); S.add(start);
    for (let k = 0; k < n * 6; k++) for (let r = 0; r < 2; r++) {
      const sq = new THREE.Mesh(new THREE.PlaneGeometry(LANE / 6, 0.37), new THREE.MeshBasicMaterial({ color: (k + r) % 2 ? 0x2a2140 : 0xffffff }));
      sq.rotation.x = -Math.PI / 2; sq.position.set(-n * LANE / 2 + (k + 0.5) * LANE / 6, 0.05, finishZ + r * 0.37); S.add(sq);
    }
    const arch = FP.Props.arch('FINISH', n * LANE + 1.5, '#ffcf33'); arch.position.set(0, 0, finishZ); S.add(arch);
    // hurdles in every lane
    for (let i = 0; i < n; i++) {
      const x = laneX(i, n);
      for (let z = START_Z - 9; z > finishZ + 5; z -= 7) {
        const m = hurdleMesh(); m.position.set(x, 0, z); S.add(m);
        hurdles.push({ lane: i, z, mesh: m, down: false });
      }
      lanes.push({ i, x, player: list[i] || null, next: 0, presses: [], done: false });
    }
    // fans along the side
    const fans = FP.Props.crowd(2, 20, 3.2); fans.position.set(-width / 2 - 1.5, 0, START_Z - LENGTH / 2); fans.rotation.y = Math.PI / 2; S.add(fans);
    FP.Camera.setAngle(0.5, 0.95);
  }

  function spawn(i, n) { return { x: laneX(i, n), y: 0.2, z: START_Z, yaw: Math.PI }; }
  const laneOf = (c) => lanes.find((l) => l.player && c.player && l.player.id === c.player.id);
  const rate = (lane) => { lane.presses = lane.presses.filter((t) => time - t < 1); return lane.presses.length; };

  // sprint controls: mash punch to run, jump over hurdles. You run straight by yourself
  function control(c, input, dt, playing) {
    const lane = laneOf(c);
    if (!lane) { FP.Ragdoll.control(c, input || {}, dt); return; }
    const inp = input || {};
    const t = c.parts.torso.position;
    let jump = false;
    if (playing && !lane.done) {
      if (c.isBot) {
        const r = { easy: 5.5, normal: 7.2, hard: 8.6 }[c.botSkill] || 7.2;
        if (Math.random() < dt * r) lane.presses.push(time);
        // jump when the next hurdle is close (good bots time it better)
        const h = hurdles.filter((x) => x.lane === lane.i && !x.down && x.z < t.z).sort((a, b) => b.z - a.z)[0];
        const early = { easy: 0.35, normal: 0.2, hard: 0.1 }[c.botSkill] || 0.2;
        const dz = h ? t.z - h.z : 99;
        if (h && lane.jumpedFor !== h && dz < 1.7 + (Math.random() - 0.5) * early * 6 && dz > 0.6 && c.grounded) { jump = true; lane.jumpedFor = h; }
      } else {
        if (inp.punchPressed) lane.presses.push(time);
        jump = !!inp.jumpPressed;
      }
    }
    // speed comes from how fast you mash
    const r = rate(lane);
    c.speedMul = playing && !lane.done ? 0.3 + Math.min(1.35, r * 0.15) : 1;
    const fake = { x: Math.max(-1, Math.min(1, (lane.x - t.x) * 3)), z: playing && !lane.done ? -1 : Math.max(-1, Math.min(1, ((lane.done ? finishZ - 3 : START_Z) - t.z) * 2)), jumpPressed: jump, grab: false };
    if (!playing && Math.abs(fake.z) < 0.1) fake.z = 0;
    FP.Ragdoll.control(c, fake, dt);
    c.yaw = Math.PI;
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const lane of lanes) {
        const c = lane.player && chars.find((ch) => ch.player === lane.player);
        if (!c || lane.done) continue;
        const t = c.parts.torso.position;
        // hurdles: jump high enough or trip over them
        for (const h of hurdles) {
          if (h.lane !== lane.i || h.down || h.passed === c) continue;
          if (t.z < h.z && t.z > h.z - 0.8) {
            h.passed = c;
            const feet = Math.min(c.parts.legs[0].position.y, c.parts.legs[1].position.y);
            if (feet < HURDLE_H - 0.05) {
              h.down = true; h.mesh.rotation.x = -1.4;
              FP.Ragdoll.knockOut(c, 0.6);
              for (const b of c.bodies) { b.velocity.z -= 2; b.velocity.y += 2; }
              FP.FX.word(c.parts.head.position, 'TRIP!', '#ff5a5f', 1.1); FP.Audio.play('bonk');
            } else if (!c.isBot) FP.Audio.play('jump');
          }
        }
        if (t.z < finishZ) {
          lane.done = true;
          const place = finished.length;
          finished.push(c);
          const pts = PLACE_PTS[Math.min(place, 3)];
          game.scores[c.player.id] = (game.scores[c.player.id] || 0) + pts;
          FP.FX.word(c.parts.head.position, `${['1st', '2nd', '3rd', '4th'][Math.min(place, 3)]}! +${pts}`, '#ffcf33', 1.4);
          if (place === 0) { FP.FX.confetti(new THREE.Vector3(0, 1, finishZ)); FP.Audio.play('cheer'); FP.Props.hype(); c.cheer = 3; }
          else FP.Audio.play('coin');
        }
        if (t.y < -5) FP.Ragdoll.teleport(c, lane.x, 0.4, t.z, Math.PI);
      }
      if (finished.length) endT += dt;
    }
    if (roundOver || dt === 0) return null;
    const racers = lanes.filter((l) => l.player).length;
    if (finished.length >= racers || endT > 8 || time > 40) {
      for (const c of chars) c.speedMul = 1; // back to normal speed
      return { winners: finished.length ? [finished[0]] : [], text: finished.length ? `${finished[0].name} wins the race!` : 'Nobody finished!' };
    }
    return null;
  }

  function botThink() { return true; } // sprint bots are driven in control()

  function hud() {
    const lane = lanes.find((l) => l.player && ['keys', 'pad', 'touch'].includes(l.player.source.kind));
    const speed = lane ? `<span class="tug-bar speed"><i style="left:${Math.min(100, rate(lane) * 10)}%"></i></span>` : '';
    return `<span>MASH PUNCH to run! JUMP over the hurdles</span>${speed}`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><path d="M0 60l120-10v30H0z" fill="#e0674a"/><path d="M0 70l120-12M0 64l120-10" stroke="#fff" stroke-width="1.5"/><g stroke="#2a2140" stroke-width="2"><path d="M80 46v10M96 44v10" /><rect x="78" y="42" width="20" height="4" fill="#ff5a5f"/></g><ellipse cx="52" cy="38" rx="7" ry="9" fill="#5cc44a" stroke="#2a2140" stroke-width="2" transform="rotate(25 52 38)"/><circle cx="57" cy="26" r="6" fill="#5cc44a" stroke="#2a2140" stroke-width="2"/><path d="M46 46l-8 4M52 47l6 8" stroke="#2a2140" stroke-width="3" stroke-linecap="round"/><path d="M28 34h12M24 40h12" stroke="#2a2140" stroke-width="2" stroke-linecap="round" opacity=".4"/></svg>';

  self = {
    id: 'hurdles', name: 'Hurdle Dash', roundsToWin: 1, rounds: 3, roundName: 'Race', minTotal: 1, defaultBots: 3, song: 'race', minZoom: 12, art: ART,
    desc: 'A sprint race! MASH PUNCH to run faster and JUMP over the hurdles. 3 races, points for every place.',
    build, spawn, control, update, botThink, hud,
    scoreLabel: (s) => `${s} pts`,
    focus: (chars) => chars.map(FP.Ragdoll.center).concat(chars.map((c) => { const p = FP.Ragdoll.center(c); return new THREE.Vector3(p.x, 0, p.z - 6); })),
  };
  return self;
})();
