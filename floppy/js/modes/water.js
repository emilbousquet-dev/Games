// ============================================================
//  FLOPPY PARTY — WATER BALLOON WARS
//  Red team vs Blue team in a sunny backyard.
//    PUNCH: lob a water balloon. It SPLASHES everyone near
//    where it lands (it aims for the closest enemy).
//    Out of balloons? Run to your team's water tap to refill.
//  Getting wet makes you slippery! So do the kiddie pools.
//  Every enemy you splash is a point for your team.
//  Most splashes after 90 seconds wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.water = (function () {
  const W = 22, D = 15, TIME = 90, POOL = 14, BR = 0.24, MAX = 3, SPLASH = 1.7;
  const TEAM_COLORS = [0xff5a5f, 0x4aa8ff];
  let balls = [], taps = [], pools = [], ammo = new Map(), wet = new Map(), refill = new Map(), time = 0, sprinkler = null, rings = [], self = null;
  const pos = (c) => c.parts.torso.position;
  const sideOf = (team) => (team === 0 ? -1 : 1);

  function build() {
    balls = []; taps = []; pools = []; ammo = new Map(); wet = new Map(); refill = new Map(); time = 0; rings = [];
    const S = FP.Stage;
    S.island(0, -1, 0, W + 2, 2, D + 2, { grass: 0x8fd35f });
    // a wooden fence around the yard
    for (const s of [-1, 1]) { S.block(0, 0.5, s * (D / 2 + 0.15), W, 1, 0.3, 0xe8c28a); S.block(s * (W / 2 + 0.15), 0.5, 0, 0.3, 1, D, 0xe8c28a); }
    // each team's water tap (with a little water barrel)
    [0, 1].forEach((team) => {
      const x = sideOf(team) * (W / 2 - 1.3);
      const tap = new THREE.Group();
      const barrel = FP.Look.mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14), FP.Look.toon(TEAM_COLORS[team]), 0.03); barrel.position.y = 0.55;
      const water = new THREE.Mesh(new THREE.CircleGeometry(0.5, 14), FP.Look.toon(0x5ab8ff)); water.rotation.x = -Math.PI / 2; water.position.y = 1.11;
      const spout = FP.Look.mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), FP.Look.toon(0x8a8fa0), 0.01); spout.rotation.z = Math.PI / 2; spout.position.set(-sideOf(team) * 0.6, 0.8, 0);
      tap.add(barrel, water, spout); tap.position.set(x, 0, 0); S.add(tap);
      S.bodies.push(FP.Physics.staticBox(x, 0.55, 0, 1.1, 1.1, 1.1));
      taps.push({ team, x, z: 0 });
    });
    // kiddie pools (slippery!) and a sprinkler in the middle
    for (const [x, z] of [[0, -4.5], [0, 4.5]]) {
      const ring = FP.Look.mesh(new THREE.TorusGeometry(1.4, 0.25, 10, 24), FP.Look.toon(0xff7eb6), 0.03); ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.25, z); S.add(ring);
      const w = new THREE.Mesh(new THREE.CircleGeometry(1.35, 24), FP.Look.toon(0x7ac8ff)); w.rotation.x = -Math.PI / 2; w.position.set(x, 0.12, z); S.add(w);
      pools.push({ x, z, r: 1.4 });
    }
    sprinkler = new THREE.Group();
    const head = FP.Look.mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.4, 10), FP.Look.toon(0x5cc44a), 0.02); head.position.y = 0.2; sprinkler.add(head);
    const arm = FP.Look.boxMesh(1.6, 0.08, 0.08, FP.Look.toon(0x8a8fa0), 0.01); arm.position.y = 0.42; sprinkler.add(arm);
    S.add(sprinkler);
    // balloon pool (parked until thrown)
    for (let i = 0; i < POOL; i++) {
      const body = new CANNON.Body({ mass: 0.3, type: CANNON.Body.KINEMATIC, collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.GROUP.WORLD });
      body.addShape(new CANNON.Sphere(BR)); body.position.set(i, -100, 0);
      const m = FP.Look.mesh(new THREE.SphereGeometry(BR, 12, 10), FP.Look.toon([0xff7eb6, 0xffcf33, 0x5ab8ff, 0x5cc44a][i % 4]), 0.02);
      m.scale.y = 1.15;
      balls.push({ ...FP.Stage.prop(m, body), on: false, by: null, t: 0 });
    }
    S.onClear(() => { for (const c of FP.Ragdoll.all) c.onIce = false; });
    FP.Camera.setAngle(0.95, 0.75);
  }

  function spawn(i, n, p) {
    const team = p && p.team !== undefined ? p.team : i % 2, row = p && p.teamRank !== undefined ? p.teamRank : Math.floor(i / 2); // (place in the team)
    return { x: sideOf(team) * 6, y: 0.2, z: [-2.5, 2.5, 0, 5][row] || 0, yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  function lob(c) {
    const have = ammo.has(c) ? ammo.get(c) : MAX;
    if (have <= 0) { FP.FX.word(c.parts.head.position, 'Empty! Go to your tap', '#8a8fa0', 0.8); return; }
    const b = balls.find((x) => !x.on);
    if (!b) return;
    ammo.set(c, have - 1);
    const p = pos(c), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    // aim: the closest enemy in front, or 7 steps ahead
    let tx = p.x + fx * 7, tz = p.z + fz * 7, best = 0.3;
    for (const o of FP.Game.chars) {
      if (o.team === c.team) continue;
      const q = pos(o), dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
      if (d < 1.5 || d > 13) continue;
      const dot = (dx * fx + dz * fz) / d;
      if (dot > best) { best = dot; tx = q.x + o.parts.torso.velocity.x * 0.6; tz = q.z + o.parts.torso.velocity.z * 0.6; }
    }
    const T = 0.9, g = 9.82, sy = p.y + 0.6;
    b.on = true; b.by = c; b.t = 0;
    b.body.type = CANNON.Body.DYNAMIC;
    b.body.position.set(p.x + fx * 0.4, sy, p.z + fz * 0.4);
    b.body.velocity.set((tx - p.x) / T, (0.2 - sy) / T + 0.5 * g * T, (tz - p.z) / T);
    c.punchT = 0; c.punchHit = true;
    FP.Audio.play('whoosh');
  }

  function splash(b, game) {
    const p = b.body.position, by = b.by;
    let n = 0;
    for (const c of game.chars) {
      if (!by || c.team === by.team) continue;
      if (pos(c).distanceTo(p) < SPLASH + 0.3) {
        n++;
        wet.set(c, 4);
        for (const bd of c.bodies) { bd.velocity.x += (pos(c).x - p.x) * 1.5; bd.velocity.z += (pos(c).z - p.z) * 1.5; bd.velocity.y += 1.5; }
        c.expression = 'oh'; c.exprTimer = 1;
        FP.FX.word(c.parts.head.position, 'SPLASH!', '#4aa8ff', 1.1);
      }
    }
    if (n && by) game.scores['team' + by.team] += n;
    FP.FX.puffs(new THREE.Vector3(p.x, 0.3, p.z), 18, 0x5ab8ff, 4, 1.2);
    FP.Audio.play('splash');
    b.on = false; b.by = null; b.body.type = CANNON.Body.KINEMATIC; b.body.velocity.set(0, 0, 0); b.body.position.set(balls.indexOf(b), -100, 0);
  }

  function control(c, input, dt, playing) {
    const inp = input || {};
    let punch = inp.punchPressed;
    if (playing && inp.punchPressed) { lob(c); punch = false; }
    const p = pos(c);
    c.onIce = (wet.get(c) || 0) > 0 || pools.some((pl) => Math.hypot(p.x - pl.x, p.z - pl.z) < pl.r);
    FP.Ragdoll.control(c, { x: inp.x || 0, z: inp.z || 0, jump: inp.jump, jumpPressed: inp.jumpPressed, punchPressed: punch, grab: false, emote: inp.emote }, dt);
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const [c, t] of wet) wet.set(c, t - dt);
      // refilling at your tap
      for (const c of chars) {
        const tap = taps[c.team], p = pos(c);
        if (tap && Math.hypot(p.x - tap.x, p.z - tap.z) < 1.6 && (ammo.has(c) ? ammo.get(c) : MAX) < MAX) {
          const r = (refill.get(c) || 0) + dt;
          if (r > 0.35) { ammo.set(c, (ammo.get(c) || 0) + 1); refill.set(c, 0); FP.Audio.play('plop'); } else refill.set(c, r);
        }
        if (p.y < -5) { const s = spawn(chars.indexOf(c), chars.length, c.player); FP.Ragdoll.teleport(c, s.x, 0.3, s.z, s.yaw); }
      }
      for (const b of balls) {
        if (!b.on) continue;
        b.t += dt;
        const p = b.body.position;
        // hit a person directly, or the ground: SPLASH
        const direct = chars.some((c) => c !== b.by && c.team !== (b.by && b.by.team) && pos(c).distanceTo(p) < 0.6);
        if (direct || p.y < BR + 0.1 || b.t > 3) splash(b, game);
      }
    }
    visual(dt);
    if (roundOver || dt === 0) return null;
    if (time >= TIME) {
      const sc = game.scores;
      if (sc.team0 === sc.team1) return { text: "It's a tie! Everybody is soaked!" };
      const t = sc.team0 > sc.team1 ? 0 : 1;
      return { team: t, points: 0, text: `${t ? 'Blue' : 'Red'} team wins the water fight!` };
    }
    return null;
  }

  function visual(dt) {
    if (sprinkler) { sprinkler.rotation.y += (dt || 0.016) * 4; if (Math.random() < 0.4) { const a = sprinkler.rotation.y; FP.FX.puffs(new THREE.Vector3(Math.cos(a) * 0.8, 0.6, -Math.sin(a) * 0.8), 1, 0x9ad0ff, 2.5, 0.5); } }
    if (!rings.length && FP.Game.chars.length) for (const c of FP.Game.chars) { const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 24), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[c.team], transparent: true, opacity: 0.9 })); ring.rotation.x = -Math.PI / 2; FP.Stage.add(ring); rings.push([ring, c]); }
    for (const [ring, c] of rings) ring.position.set(pos(c).x, 0.04, pos(c).z);
    for (const [c, t] of wet) if (t > 0 && Math.random() < 0.2) FP.FX.puffs(c.parts.head.position, 1, 0x5ab8ff, 0.5, 0.4); // dripping
  }

  // bots: throw at enemies, refill at the tap when empty
  function botThink(c, chars, dt, input, tools) {
    const p = pos(c), have = ammo.has(c) ? ammo.get(c) : MAX;
    if (have === 0 || (tools.brain.refilling && have < MAX)) {
      tools.brain.refilling = true;
      const tap = taps[c.team];
      tools.steer(c, tap.x - sideOf(c.team) * 1, tap.z + (c.index % 2 ? 0.8 : -0.8), input);
      return true;
    }
    tools.brain.refilling = false;
    const foes = chars.filter((o) => o.team !== c.team);
    const tgt = foes.reduce((a, o) => (!a || pos(o).distanceTo(p) < pos(a).distanceTo(p) ? o : a), null);
    if (tgt) {
      const q = pos(tgt), d = q.distanceTo(p);
      if (d > 9) tools.steer(c, q.x, q.z, input);
      else if (d < 4) { input.x = (p.x - q.x) / d; input.z = (p.z - q.z) / d; }
      else { input.x = (q.x - p.x) / d * 0.3; input.z = (q.z - p.z) / d * 0.3; }
      const face = Math.atan2(q.x - p.x, q.z - p.z) - c.yaw;
      if (d < 11 && Math.abs(Math.atan2(Math.sin(face), Math.cos(face))) < 0.6 && Math.random() < dt * 2) { input.x = (q.x - p.x) / d * 0.3; input.z = (q.z - p.z) / d * 0.3; input.punchPressed = true; }
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const me = FP.Game.chars.find((c) => c.player && ['keys', 'pad', 'touch'].includes(c.player.source.kind));
    const n = me ? (ammo.has(me) ? ammo.get(me) : MAX) : 0;
    return `<span>${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}${me ? ` &nbsp; Balloons: <b>${'O'.repeat(n)}${'-'.repeat(MAX - n)}</b>` : ''}</span><span class="hud-tip">PUNCH: throw a water balloon &nbsp; Empty? Run to your team's tap &nbsp; Wet = slippery!</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><rect x="0" y="50" width="120" height="30" fill="#8fd35f"/><ellipse cx="60" cy="64" rx="18" ry="6" fill="#7ac8ff" stroke="#ff7eb6" stroke-width="3"/><ellipse cx="62" cy="24" rx="7" ry="8" fill="#ff7eb6" stroke="#2a2140" stroke-width="2"/><path d="M62 32l-2 3" stroke="#2a2140" stroke-width="2"/><path d="M40 30q10-14 20-8" stroke="#2a2140" stroke-width="1.5" fill="none" stroke-dasharray="3 3"/><ellipse cx="32" cy="46" rx="6" ry="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="32" cy="34" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><ellipse cx="92" cy="50" rx="6" ry="8" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="92" cy="38" r="5" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><path d="M86 30l-4-4M92 28v-5M98 30l4-4" stroke="#5ab8ff" stroke-width="2.5" stroke-linecap="round"/></svg>';

  self = {
    id: 'water', name: 'Water Balloon Wars', roundsToWin: 1, single: true, teams: true, minTotal: 2, song: 'party', minZoom: 15, art: ART,
    desc: 'Red vs Blue! PUNCH to lob water balloons, refill at your tap. Every splash is a point. Wet = slippery!',
    build, spawn, control, update, botThink, hud, visual,
    netState: () => ({ t: Math.round(time), w: FP.Game.chars.map((c) => ((wet.get(c) || 0) > 0 ? 1 : 0)).join('') }),
    applyNetState: (s) => { time = s.t; (s.w || '').split('').forEach((v, i) => { const c = FP.Game.chars[i]; if (c) wet.set(c, v === '1' ? 1 : 0); }); },
  };
  return self;
})();
