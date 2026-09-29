// ============================================================
//  FLOPPY PARTY — SKY DIVING
//  Everyone jumps out way up in the sky!
//    Steer while you fall and fly through the rings:
//    +1 point (golden rings +3).
//    JUMP opens your parachute. Then land on the target:
//    the middle is +5, the next ring +3, the outside +1.
//    Forget your parachute and you land with a SPLAT (no points).
//  3 jumps. Most points wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.skydive = (function () {
  const TOP = 85, ISLAND = 22, FALL = -10, CHUTE = -3.2, RING_R = 1.5;
  let rings = [], chutes = new Map(), landed = new Map(), time = 0, cloudLayer = [], self = null;
  const pos = (c) => c.parts.torso.position;

  // the same "random" rings on every computer (online friends see the same sky)
  function seeded(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  function build() {
    rings = []; chutes = new Map(); landed = new Map(); time = 0; cloudLayer = [];
    const S = FP.Stage;
    // the landing island with a big target, in the middle of the sea
    S.island(0, -1, 0, ISLAND, 2, ISLAND, { grass: 0x8fd35f });
    const target = [[6, 0xffffff], [4.5, 0x4aa8ff], [3, 0xffffff], [1.5, 0xff5a5f]];
    target.forEach(([r, col], i) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), FP.Look.toon(col)); m.rotation.x = -Math.PI / 2; m.position.y = 0.03 + i * 0.005; S.add(m); });
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), FP.Look.toon(0x5ab8ff)); sea.rotation.x = -Math.PI / 2; sea.position.y = -2.5; S.add(sea);
    for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) { const t = FP.Look.tree(1); t.position.set(x, 0, z); S.add(t); }
    // rings in the sky, from high up down to the island
    const rnd = seeded(4242 + (FP.Game.round || 1) * 777);
    for (let y = TOP - 8; y > 14; y -= 3.4) {
      const gold = rnd() < 0.18;
      const x = (rnd() - 0.5) * 12, z = (rnd() - 0.5) * 12;
      const m = FP.Look.mesh(new THREE.TorusGeometry(RING_R, 0.12, 8, 28), FP.Look.toon(gold ? 0xffcf33 : 0xff7eb6, { emissive: gold ? 0x553300 : 0x220011 }), 0.02);
      m.rotation.x = Math.PI / 2; m.position.set(x, y, z); S.add(m);
      rings.push({ x, y, z, gold, mesh: m, took: new Set() });
    }
    // fluffy clouds to fall through
    for (let i = 0; i < 10; i++) { const cl = FP.Look.cloud(1.2 + rnd()); cl.position.set((rnd() - 0.5) * 30, 20 + rnd() * 36, (rnd() - 0.5) * 30); S.add(cl); cloudLayer.push(cl); }
    FP.Camera.setAngle(1.25, 0.6);
  }

  function spawn(i, n) { const s = FP.Kit.ring(i, n, 2.2, 2.2, Math.PI / 4); s.y = TOP; return s; }

  function chuteMesh(color) {
    const g = new THREE.Group();
    const dome = FP.Look.mesh(new THREE.SphereGeometry(1.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), FP.Look.toon(color, { side: THREE.DoubleSide }), 0.03);
    dome.scale.y = 0.6; dome.position.y = 2.2; g.add(dome);
    const stripe = FP.Look.mesh(new THREE.SphereGeometry(1.42, 16, 8, 0, Math.PI * 2, Math.PI / 3.2, 0.25), FP.Look.toon(0xffffff, { side: THREE.DoubleSide }), 0);
    stripe.scale.y = 0.6; stripe.position.y = 2.2; g.add(stripe);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x2a2140 });
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + 0.78; const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(Math.cos(a) * 1.3, 2.2, Math.sin(a) * 1.3)]); g.add(new THREE.Line(geo, lineMat)); }
    return g;
  }

  function openChute(c) {
    if (chutes.get(c)) return;
    const m = chuteMesh(c.color.body);
    FP.Stage.add(m);
    chutes.set(c, m);
    FP.Audio.play('whoosh');
  }

  // sky controls: steer while you fall, JUMP opens the parachute
  function control(c, input, dt, playing) {
    const inp = input || {};
    const p = pos(c);
    const air = !landed.has(c) && p.y > 1.8;
    if (air) {
      if (playing) {
        if (c.isBot) botSky(c, inp, dt);
        if (inp.jumpPressed || (c.botChute && p.y < c.botChute)) openChute(c);
        // steering in the air (a bit slower with the parachute)
        const sp = chutes.get(c) ? 4.5 : 7;
        for (const b of c.bodies) {
          b.velocity.x += ((inp.x || 0) * sp - b.velocity.x) * Math.min(1, dt * 3);
          b.velocity.z += ((inp.z || 0) * sp - b.velocity.z) * Math.min(1, dt * 3);
        }
      }
      FP.Ragdoll.control(c, { x: 0, z: 0 }, dt);
    } else FP.Ragdoll.control(c, landed.has(c) ? { x: 0, z: 0, emote: inp.emote } : inp, dt);
  }

  // air drag: you fall at a steady speed (slow with a parachute). Before GO, everyone floats at the top
  function beforeStep() {
    const playing = FP.Game.state === 'play';
    for (const c of FP.Game.chars) {
      if (landed.has(c)) continue;
      const cap = !playing ? 0 : chutes.get(c) ? CHUTE : FALL;
      for (const b of c.bodies) {
        if (!playing) { b.velocity.y = 0; continue; }
        if (b.velocity.y < cap) b.velocity.y += (cap - b.velocity.y) * 0.25;
      }
    }
  }

  function land(c, game) {
    const p = pos(c);
    const d = Math.hypot(p.x, p.z);
    const hadChute = !!chutes.get(c);
    let pts = 0, word = 'Missed the target!';
    if (!hadChute) { word = 'SPLAT! Open your parachute!'; FP.Ragdoll.knockOut(c, 1.5); FP.Camera.shake(0.4); FP.Audio.play('bonk'); }
    else if (d < 1.5) { pts = 5; word = 'BULLSEYE! +5'; FP.FX.confetti(new THREE.Vector3(p.x, 0.5, p.z), 120, 3); FP.Audio.play('cheer'); FP.Props.hype(); }
    else if (d < 3) { pts = 3; word = 'Great landing! +3'; FP.Audio.play('coin'); }
    else if (d < 6) { pts = 1; word = 'Landed! +1'; FP.Audio.play('coin'); }
    landed.set(c, pts);
    game.scores[c.player.id] = (game.scores[c.player.id] || 0) + pts;
    FP.FX.word(c.parts.head.position, word, pts >= 3 ? '#ffcf33' : pts ? '#ffffff' : '#ff9a3c', 1.2);
    const m = chutes.get(c); if (m) m.visible = false;
  }

  function update(dt, chars, game, roundOver) {
    // before the jump (the intro and the countdown): everyone floats up at the top
    if (FP.Game.state === 'intro' || FP.Game.state === 'countdown') {
      chars.forEach((c, i) => {
        const s = spawn(i, chars.length);
        if (Math.abs(pos(c).y - TOP) > 1.5) FP.Ragdoll.teleport(c, s.x, s.y, s.z, s.yaw);
        for (const b of c.bodies) b.velocity.set(0, 0, 0);
      });
    }
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const c of chars) {
        const p = pos(c);
        if (landed.has(c)) { if (p.y < -4) FP.Ragdoll.teleport(c, (Math.random() - 0.5) * 6, 0.5, (Math.random() - 0.5) * 6); continue; }
        // rings
        for (const r of rings) {
          if (r.took.has(c)) continue;
          if (Math.abs(p.y - r.y) < 0.9 && Math.hypot(p.x - r.x, p.z - r.z) < RING_R) {
            r.took.add(c);
            const pts = r.gold ? 3 : 1;
            game.scores[c.player.id] = (game.scores[c.player.id] || 0) + pts;
            FP.FX.word(new THREE.Vector3(r.x, r.y + 0.8, r.z), r.gold ? 'GOLDEN! +3' : '+1', '#ffcf33', 1.1);
            FP.FX.stars(new THREE.Vector3(r.x, r.y, r.z), 4);
            FP.Audio.play(r.gold ? 'coin' : 'boing');
          }
        }
        // touching down (on the island, or splashing into the sea)
        const onIsland = Math.abs(p.x) < ISLAND / 2 && Math.abs(p.z) < ISLAND / 2;
        if (onIsland && p.y < 1.6) land(c, game);
        else if (!onIsland && p.y < -1.8) { landed.set(c, 0); FP.FX.word(c.parts.head.position, 'SPLASH! In the sea', '#4aa8ff', 1.1); FP.Audio.play('splash'); const m = chutes.get(c); if (m) m.visible = false; FP.Ragdoll.teleport(c, (Math.random() - 0.5) * 8, 0.5, ISLAND / 2 - 1.5); }
      }
    }
    visual();
    if (roundOver || dt === 0) return null;
    if ((chars.length && chars.every((c) => landed.has(c))) || time > 30) {
      const best = chars.reduce((a, c) => (!a || (landed.get(c) || 0) > (landed.get(a) || 0) ? c : a), null);
      return { winners: [], text: best && landed.get(best) >= 5 ? `${best.name} hit the bullseye!` : 'Everybody is down!' };
    }
    return null;
  }

  function visual() {
    for (const [c, m] of chutes) { if (!m.visible) continue; const h = c.parts.head.position; m.position.set(h.x, h.y - 0.2, h.z); m.rotation.y += 0.004; }
    // rings everyone already fell past would block the camera: hide them
    const top = FP.Game.chars.reduce((m, c) => Math.max(m, c.parts.torso.position.y), -99);
    for (const r of rings) { r.mesh.rotation.z += 0.01; r.mesh.visible = r.y < top + 1; }
    for (const cl of cloudLayer) cl.visible = cl.position.y < top - 2;
  }

  // bots: dive through the next ring below, open the parachute, aim for the bullseye
  function botSky(c, inp, dt) {
    const p = pos(c);
    if (c.botChute === undefined) c.botChute = { easy: 7, normal: 11, hard: 15 }[c.botSkill] + Math.random() * 3 || 12;
    let tx = 0, tz = 0;
    if (!chutes.get(c)) {
      const next = rings.filter((r) => r.y < p.y - 1 && !r.took.has(c) && r.y > p.y - 12).sort((a, b) => b.y - a.y)[0];
      if (next) { tx = next.x; tz = next.z; }
    }
    const miss = { easy: 2.5, normal: 1.2, hard: 0.4 }[c.botSkill] || 1.2;
    if (!c.botAim) c.botAim = { x: (Math.random() - 0.5) * miss * 2, z: (Math.random() - 0.5) * miss * 2 };
    if (chutes.get(c)) { tx = c.botAim.x; tz = c.botAim.z; }
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    inp.x = d > 0.2 ? dx / Math.max(d, 1) : 0; inp.z = d > 0.2 ? dz / Math.max(d, 1) : 0;
    void dt;
  }
  function botThink(c, chars, dt, input) { input.x = 0; input.z = 0; return true; } // steering happens in control()

  function hud() {
    return `<span>Fly through the rings, then open your parachute and land on the target!</span><span class="hud-tip">Move to steer &nbsp; JUMP: open the parachute &nbsp; Middle of the target = +5</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><ellipse cx="60" cy="72" rx="40" ry="6" fill="#8fd35f"/><ellipse cx="60" cy="72" rx="12" ry="2.5" fill="#ff5a5f"/><path d="M40 20a20 12 0 0 1 40 0z" fill="#ff7eb6" stroke="#2a2140" stroke-width="2"/><path d="M42 20l16 22M78 20l-16 22" stroke="#2a2140" stroke-width="1.5"/><ellipse cx="60" cy="46" rx="5" ry="7" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="60" cy="37" r="4" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><ellipse cx="96" cy="44" rx="8" ry="3" fill="none" stroke="#ffcf33" stroke-width="3"/><ellipse cx="22" cy="54" rx="8" ry="3" fill="none" stroke="#ff7eb6" stroke-width="3"/></svg>';

  self = {
    id: 'skydive', name: 'Sky Diving', roundsToWin: 1, rounds: 3, roundName: 'Jump', minTotal: 1, defaultBots: 3, song: 'space', minZoom: 12, art: ART,
    desc: 'Jump out of the sky! Steer through the rings, press JUMP to open your parachute, and land on the bullseye. 3 jumps.',
    build, spawn, control, beforeStep, update, botThink, hud, visual,
    scoreLabel: (s) => `${s} pts`,
    focus: (chars) => chars.map(FP.Ragdoll.center),
    netState: () => ({ c: FP.Game.chars.map((c) => (chutes.get(c) && chutes.get(c).visible ? 1 : 0)).join('') }),
    applyNetState: (s) => { (s.c || '').split('').forEach((v, i) => { const c = FP.Game.chars[i]; if (!c) return; if (v === '1' && !chutes.get(c)) openChute(c); const m = chutes.get(c); if (m) m.visible = v === '1'; }); },
  };
  return self;
})();
