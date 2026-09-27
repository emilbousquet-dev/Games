// ============================================================
//  FLOPPY PARTY — ZOMBIE TAG
//  One player starts as a zombie. Zombies turn anyone they
//  touch into a zombie too! Survivors get a point every second.
//  The last survivor gets a big bonus. Most points wins!
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.zombie = (function () {
  const TIME = 90, BONUS = 10;
  let zombies = new Set(), marks = new Map(), time = 0, started = false, self = null;

  function build() {
    zombies = new Set(); marks = new Map(); time = 0; started = false; respawn.clear();
    const S = FP.Stage;
    // a spooky-ish graveyard island
    S.island(0, -1, 0, 22, 2, 15, { grass: 0x7fb069, dirt: 0x7a5a48 });
    S.island(0, -1, 0, 15, 2, 20, { grass: 0x7fb069, dirt: 0x7a5a48 });
    const stones = [[-4, -3], [4, 3], [-4, 3.5], [4, -3.5], [0, -5.5], [0, 5.5], [-7, 0], [7, 0]];
    stones.forEach(([x, z], i) => {
      const t = FP.Props.tombstone(i % 3 === 2 ? 1 : 0);
      t.position.set(x, 0, z); t.rotation.y = (i % 2 ? 0.2 : -0.15);
      S.add(t);
      S.bodies.push(FP.Physics.staticBox(x, 0.55, z, 0.85, 1.1, 0.35));
    });
    // spooky stuff around the edge
    for (const [x, z, sc] of [[-9.5, -5.5, 1.1], [9.5, 5.5, 1], [9, -6, 0.9], [-9, 6.5, 0.8]]) { const t = FP.Props.deadTree(sc); t.position.set(x, 0, z); S.add(t); }
    for (const [x, z] of [[-2, -6.8], [2.5, 7.2], [-10, 2], [10, -2], [6, 6.5], [-6, -6.3]]) { const p = FP.Props.pumpkin(); p.position.set(x, 0, z); p.rotation.y = Math.atan2(-x, -z); S.add(p); }
    for (const [x, z, rot] of [[-7.5, -7.3, 0], [7.5, 7.3, 0], [-10.3, -3, Math.PI / 2], [10.3, 3, Math.PI / 2]]) { const f = FP.Props.fence(4); f.position.set(x, 0, z); f.rotation.y = rot; S.add(f); }
    for (const [x, z] of [[-10.3, 6.5], [10.3, -6.5]]) { const l = FP.Props.lamp(0xb6ff8a); l.position.set(x, 0, z); S.add(l); }
    // dusk: purple light
    S.hemi.color.setHex(0xc9b6ff); S.hemi.groundColor.setHex(0x6a5a9a); S.sun.color.setHex(0xffd0a8);
    S.onClear(() => { S.hemi.color.setHex(0xffffff); S.hemi.groundColor.setHex(0x9fc4ff); S.sun.color.setHex(0xfff4e0); });
    FP.Camera.setAngle(0.82, 0.78);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 5, 4, 0.4); }

  function mark(c) {
    if (marks.has(c)) return marks.get(c);
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 24), new THREE.MeshBasicMaterial({ color: 0x7dff5a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    ring.rotation.x = -Math.PI / 2;
    const cloud = FP.Look.mesh(new THREE.SphereGeometry(0.22, 10, 8), FP.Look.toon(0x7dff5a), 0.02);
    cloud.position.y = 2.2;
    g.add(ring, cloud);
    g.userData.cloud = cloud;
    FP.Stage.add(g);
    marks.set(c, g);
    return g;
  }

  function infect(c, by) {
    zombies.add(c);
    c.speedMul = 0.62; // zombies are slower than survivors (they shamble)
    FP.Ragdoll.knockOut(c, by ? 2.6 : 3.5); // flop over... and rise again as a ZOMBIE
    c.expression = 'angry'; c.exprTimer = 1;
    FP.FX.word(c.parts.head.position, by ? 'GOTCHA!' : 'ZOMBIE!', '#5cc44a', 1.3);
    FP.FX.puffs(c.parts.torso.position, 12, 0x7dff5a, 3, 1.2);
    FP.Audio.play('voice');
  }

  function visual(dt, chars) {
    const t = performance.now() / 1000;
    for (const c of chars || []) {
      const z = zombies.has(c);
      const m = zombies.has(c) || marks.has(c) ? mark(c) : null;
      if (!m) continue;
      m.visible = z && c.parts.torso.position.y > -20;
      const p = c.parts.torso.position;
      m.position.set(p.x, p.y - FP.Ragdoll.STAND + 0.03, p.z);
      m.userData.cloud.position.y = 2.1 + Math.sin(t * 4 + c.index) * 0.08;
      m.userData.cloud.scale.setScalar(1 + Math.sin(t * 6 + c.index) * 0.1);
    }
  }

  // punch a zombie and it gets dizzy for a moment (survivors can fight back!)
  FP.bus.on('punchHit', (d) => {
    if (!FP.Kit.live(self) || !d || !d.victim || !zombies.has(d.victim) || d.victim.ko > 0) return;
    FP.Ragdoll.knockOut(d.victim, 1.4);
    FP.FX.word(d.victim.parts.head.position, 'BONK!', '#5cc44a', 1);
  });

  const respawn = FP.Kit.respawner(() => { const a = Math.random() * Math.PI * 2; return { x: Math.cos(a) * 5, z: Math.sin(a) * 4, yaw: a + Math.PI }; });

  function update(dt, chars, game, roundOver) {
    visual(dt, chars);
    if (dt > 0 && !roundOver) {
      time += dt;
      if (!started && time > 1.5 && chars.length) {
        started = true;
        const first = chars[Math.floor(Math.random() * chars.length)];
        infect(first, null);
        FP.UI.big('ZOMBIE!', 1.3, `${first.name} is the first zombie. RUN!`);
        if (FP.Net) FP.Net.banner('ZOMBIE!', `${first.name} is the first zombie. RUN!`);
      }
      for (const c of chars) {
        if (!zombies.has(c)) c.speedMul = 1.08; // survivors run a little faster than normal
        if (zombies.has(c)) { if (c.ko <= 0) { c.expression = 'angry'; c.exprTimer = 0.3; } continue; }
        if (started) game.scores[c.player.id] = (game.scores[c.player.id] || 0) + dt; // survivors score
        // a zombie touch turns you!
        for (const z of zombies) {
          if (z.ko > 0) continue;
          const touch = [z.parts.torso, ...z.parts.arms].some((b) => b.position.distanceTo(c.parts.torso.position) < 0.85);
          if (touch) { infect(c, z); break; }
        }
      }
      respawn.update(chars, dt, -6);
    }
    if (roundOver || dt === 0 || !started) return null;
    const survivors = chars.filter((c) => !zombies.has(c));
    if ((chars.length > 1 && survivors.length <= 1) || time > TIME) {
      if (survivors.length === 1 && chars.length > 1) {
        game.scores[survivors[0].player.id] += BONUS;
        FP.FX.word(survivors[0].parts.head.position, `+${BONUS}!`, '#ffcf33', 1.5);
      }
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: survivors.length ? (survivors.length === 1 ? `${survivors[0].name} survived!` : 'Time! Survivors win!') : 'The zombies win!' };
    }
    return null;
  }

  // bot brain: zombies chase (arms out!), survivors run away and punch zombies that get too close
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain, p = c.parts.torso.position;
    if (zombies.has(c)) {
      let best = null, bd = Infinity;
      for (const o of chars) { if (zombies.has(o)) continue; const d = o.parts.torso.position.distanceTo(p); if (d < bd) { bd = d; best = o; } }
      if (best) {
        const v = best.parts.torso.velocity;
        tools.steer(c, best.parts.torso.position.x + v.x * 0.4, best.parts.torso.position.z + v.z * 0.4, input);
      }
      b.arms = (b.arms || 0) + dt;
      input.grab = Math.sin(b.arms * 1.3) > -0.3 && bd > 1; // arms out, like a zombie
      if (!input.grab && bd < 1.4 && Math.random() < dt * 2) input.punchPressed = true;
    } else {
      let near = null, nd = Infinity;
      for (const z of zombies) { const d = z.parts.torso.position.distanceTo(p); if (d < nd) { nd = d; near = z; } }
      if (near && nd < 7) {
        const zp = near.parts.torso.position;
        const dx = p.x - zp.x, dz = p.z - zp.z, d = Math.hypot(dx, dz) || 1;
        tools.steer(c, p.x + (dx / d) * 4 - p.x * 0.3, p.z + (dz / d) * 4 - p.z * 0.3, input);
        if (nd < 1.5 && Math.random() < dt * 4) { tools.steer(c, zp.x, zp.z, input); input.punchPressed = true; }
      } else {
        b.wander += dt * 0.4;
        tools.steer(c, Math.cos(b.wander + c.index * 2) * 5, Math.sin(b.wander + c.index * 2) * 4, input);
        input.x *= 0.5; input.z *= 0.5;
      }
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const left = FP.Ragdoll.all.filter((c) => c.player && !zombies.has(c)).length;
    return started ? `Survivors left: ${left} &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}` : 'Get ready...';
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#c9c2e8"/><ellipse cx="60" cy="66" rx="52" ry="10" fill="#7fb069" stroke="#2a2140" stroke-width="2"/><path d="M92 62V46a6 6 0 0 1 12 0v16z" fill="#b8b4c8" stroke="#2a2140" stroke-width="2"/><ellipse cx="40" cy="52" rx="7" ry="9" fill="#7dff5a" stroke="#2a2140" stroke-width="2"/><circle cx="40" cy="39" r="6" fill="#7dff5a" stroke="#2a2140" stroke-width="2"/><path d="M46 46h12M46 50h11" stroke="#7dff5a" stroke-width="4" stroke-linecap="round"/><path d="M46 46h12M46 50h11" stroke="#2a2140" stroke-width="1" stroke-linecap="round" opacity=".6"/><ellipse cx="76" cy="52" rx="7" ry="9" fill="#ff9a3c" stroke="#2a2140" stroke-width="2" transform="rotate(15 76 52)"/><circle cx="73" cy="40" r="6" fill="#ff9a3c" stroke="#2a2140" stroke-width="2"/><path d="M86 42h8M86 48h10" stroke="#2a2140" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>';

  self = {
    id: 'zombie', name: 'Zombie Tag', roundsToWin: 1, single: true, minTotal: 2, song: 'tense', minZoom: 16, art: ART,
    desc: 'Zombies turn everyone they touch into zombies! Punch them to stun them. Survive to score.',
    build, spawn, update, botThink, hud, visual,
    scoreLabel: (s) => `${Math.floor(s)}`,
    netState: () => ({ z: [...zombies].filter((c) => c.player).map((c) => c.player.id), s: started ? 1 : 0, t: Math.round(time) }),
    applyNetState: (st) => { zombies = new Set(FP.Ragdoll.all.filter((c) => c.player && st.z.includes(c.player.id))); started = !!st.s; time = st.t; },
  };
  return self;
})();
