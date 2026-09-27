// ============================================================
//  FLOPPY PARTY — DODGEBALL
//  Grab a ball (hold grab), run, and let go to throw it.
//  Hit someone with a thrown ball: BONK, they're knocked out
//  and you score. First to 5 hits (or the most after 1:40).
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.dodge = (function () {
  const GOAL = 5, TIME = 100, W = 18, D = 12, NBALLS = 6;
  const BALL_COLORS = [[0xff5a5f, 0xffffff], [0x4aa8ff, 0xffffff], [0xffcf33, 0xff9a3c], [0x5cc44a, 0xffffff], [0x9b6bff, 0xffffff], [0xff7eb6, 0xffffff]];
  let balls = [], time = 0, self = null;

  function ballHome(i) { return { x: (i - (NBALLS - 1) / 2) * 1.6, y: 0.6, z: 0 }; }

  function build() {
    balls = []; time = 0; respawn.clear();
    const S = FP.Stage;
    S.island(0, -1, 0, W + 2, 2, D + 2, { grass: 0x8fd46e });
    // court lines
    const line = (x, z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z); S.add(m); };
    line(0, 0, 0.15, D); line(0, -D / 2 + 0.1, W, 0.15); line(0, D / 2 - 0.1, W, 0.15); line(-W / 2 + 0.1, 0, 0.15, D); line(W / 2 - 0.1, 0, 0.15, D);
    // low walls all around (you can still be thrown over them!)
    S.block(0, 0.6, -D / 2 - 0.5, W + 2, 1.2, 0.6, 0xffb8d1);
    S.block(0, 0.6, D / 2 + 0.5, W + 2, 1.2, 0.6, 0xffb8d1);
    S.block(-W / 2 - 0.5, 0.6, 0, 0.6, 1.2, D + 2, 0xa6e6ff);
    S.block(W / 2 + 0.5, 0.6, 0, 0.6, 1.2, D + 2, 0xa6e6ff);
    // invisible high walls that only stop balls
    for (const [x, z, w, d] of [[0, -D / 2 - 0.5, W + 2, 0.6], [0, D / 2 + 0.5, W + 2, 0.6], [-W / 2 - 0.5, 0, 0.6, D + 2], [W / 2 + 0.5, 0, 0.6, D + 2]]) {
      const b = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionFilterGroup: FP.Physics.GROUP.NPC, collisionFilterMask: FP.Physics.GROUP.PROP });
      b.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, 2, d / 2)));
      b.position.set(x, 3, z);
      FP.Physics.world.addBody(b);
      S.bodies.push(b);
    }
    for (let i = 0; i < NBALLS; i++) {
      const k = FP.Kit.ball(0.36, BALL_COLORS[i].concat(BALL_COLORS[i]), 0.5);
      const h = ballHome(i);
      k.body.position.set(h.x, h.y, h.z);
      const ball = { ...FP.Stage.prop(k.mesh, k.body), thrower: null, live: 0, i };
      k.body.addEventListener('collide', (e) => onBallHit(ball, e));
      balls.push(ball);
    }
    FP.Camera.setAngle(0.85, 0.75);
  }

  function spawn(i, n) {
    // half the players on each side of the court
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    return { x: side * 6, y: 0.2, z: (row ? 2.5 : -2.5), yaw: side > 0 ? -Math.PI / 2 : Math.PI / 2 };
  }

  function onBallHit(ball, e) {
    if (!FP.Kit.live(self) || ball.live <= 0) return;
    const victim = e.body && e.body.userData && e.body.userData.char;
    if (!victim || victim === ball.thrower || !victim.alive) return;
    const v = ball.body.velocity;
    if (Math.hypot(v.x, v.y, v.z) < 4) return;
    ball.live = 0;
    const by = ball.thrower;
    FP.Ragdoll.knockOut(victim, 2.2);
    for (const b of victim.bodies) { b.velocity.x += v.x * 0.5; b.velocity.z += v.z * 0.5; b.velocity.y += 3; }
    victim.lastHitBy = by; victim.lastHitTime = performance.now();
    if (by && by.player) FP.Game.scores[by.player.id] = (FP.Game.scores[by.player.id] || 0) + 1;
    FP.FX.word(victim.parts.head.position, 'BONK!', '#ff5a5f', 1.4);
    FP.FX.stars(victim.parts.head.position, 6);
    FP.Camera.shake(0.35);
    FP.Audio.play('bonk');
  }

  // a ball was thrown: make it fly fast and flat, and remember who threw it
  FP.bus.on('throw', (d) => {
    if (!FP.Kit.live(self) || !d || !d.who) return;
    const ball = balls.find((b) => b.body === d.who);
    if (!ball) return;
    const f = { x: Math.sin(d.by.yaw), z: Math.cos(d.by.yaw) };
    ball.body.velocity.set(f.x * 15, 3.2, f.z * 15);
    ball.thrower = d.by; ball.live = 1.3;
    FP.Audio.play('whoosh');
  });

  const respawn = FP.Kit.respawner((c) => ({ x: (Math.random() - 0.5) * 10, z: (Math.random() - 0.5) * 6 }));

  function held(ball) { return FP.Ragdoll.all.some((c) => (c.grab[0] && c.grab[0].body === ball.body) || (c.grab[1] && c.grab[1].body === ball.body)); }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const b of balls) {
        b.live -= dt;
        if (b.body.position.y < -6) { const h = ballHome(b.i); b.body.position.set(h.x, 3, h.z); b.body.velocity.set(0, 0, 0); b.live = 0; }
      }
      respawn.update(chars, dt, -6);
    }
    if (roundOver || dt === 0) return null;
    for (const c of chars) if ((game.scores[c.player.id] || 0) >= GOAL) return { winners: [c], text: `${c.name} is the dodgeball champ!` };
    if (time >= TIME) {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `Time! ${w[0].name} wins!` : 'Time! It\'s a tie!' };
    }
    return null;
  }

  // bot brain: grab a ball, aim at someone, throw. Dodge balls flying at you
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain, p = c.parts.torso.position;
    const mine = balls.find((x) => (c.grab[0] && c.grab[0].body === x.body) || (c.grab[1] && c.grab[1].body === x.body));
    // a ball flying at me? jump or step aside!
    for (const x of balls) {
      if (x.live <= 0 || x.thrower === c) continue;
      const bp = x.body.position, v = x.body.velocity;
      const dx = p.x - bp.x, dz = p.z - bp.z, d = Math.hypot(dx, dz);
      const sp = Math.hypot(v.x, v.z) || 1;
      if (d < 5 && (dx * v.x + dz * v.z) / (d * sp) > 0.85) {
        if (b.dodge === undefined || b.dodgeFor !== x) { b.dodgeFor = x; b.dodge = Math.random() < 0.5 ? 1 : -1; b.jumpDodge = Math.random() < 0.4; }
        input.x = (-v.z / sp) * b.dodge; input.z = (v.x / sp) * b.dodge;
        if (b.jumpDodge && d < 2.5 && c.grounded) input.jumpPressed = true;
        input.grab = !!mine;
        return true;
      }
    }
    if (mine) {
      b.holdT = (b.holdT || 0) + dt;
      input.grab = true;
      // aim at the closest other player
      let tgt = null, td = Infinity;
      for (const o of chars) { if (o === c || !o.alive || o.ko > 0) continue; const d = o.parts.torso.position.distanceTo(p); if (d < td) { td = d; tgt = o; } }
      if (tgt) {
        const tp = tgt.parts.torso.position;
        const dx = tp.x - p.x, dz = tp.z - p.z;
        if (td < 3) { input.x = -dx / td; input.z = -dz / td; } // too close: back up first
        else {
          input.x = dx / td; input.z = dz / td;
          const face = Math.atan2(dx, dz) - c.yaw;
          const off = Math.abs(Math.atan2(Math.sin(face), Math.cos(face)));
          if ((off < 0.25 && td < 9) || b.holdT > 4) { input.grab = false; b.holdT = 0; } // THROW!
        }
      }
    } else {
      b.holdT = 0;
      const free = balls.filter((x) => x.live <= 0 && !held(x));
      const near = FP.Kit.nearest(c, free.map((x) => ({ x: x.body.position.x, z: x.body.position.z, ball: x })));
      if (near) {
        tools.steer(c, near.item.x, near.item.z, input);
        if (near.d < 1.4) { input.grab = true; input.x *= 0.5; input.z *= 0.5; }
      } else FP.Kit.punchNearby(c, chars, dt, input, tools, 1.4, 2.5) || tools.steer(c, 0, p.z > 0 ? 3 : -3, input);
    }
    tools.unstick(input);
    return true;
  }

  function hud() { return `Throw balls at people! First to ${GOAL} hits &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><rect x="10" y="44" width="100" height="26" rx="4" fill="#8fd46e" stroke="#2a2140" stroke-width="2"/><path d="M60 44v26" stroke="#fff" stroke-width="2"/><circle cx="62" cy="30" r="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><path d="M40 34h12M42 29h8M44 39h8" stroke="#2a2140" stroke-width="2" stroke-linecap="round" opacity=".45"/><ellipse cx="30" cy="50" rx="6" ry="8" fill="#ffcf33" stroke="#2a2140" stroke-width="2"/><circle cx="30" cy="39" r="5" fill="#ffcf33" stroke="#2a2140" stroke-width="2"/><ellipse cx="88" cy="52" rx="6" ry="8" fill="#4aa8ff" stroke="#2a2140" stroke-width="2" transform="rotate(-25 88 52)"/><circle cx="92" cy="41" r="5" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><path d="M96 34l4-4M100 38l5-1M92 30l1-5" stroke="#ff9a3c" stroke-width="2" stroke-linecap="round"/></svg>';

  self = {
    id: 'dodge', name: 'Dodgeball', roundsToWin: 1, single: true, minTotal: 2, song: 'party', minZoom: 16, art: ART,
    desc: 'Grab a ball, run and let go to throw it. BONK someone to score. First to 5 hits!',
    build, spawn, update, botThink, hud,
    scoreLabel: (s) => `${s}`,
  };
  return self;
})();
