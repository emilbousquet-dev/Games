// ============================================================
//  FLOPPY PARTY — BALLOON POP
//  Everyone has 3 balloons tied to their back. Sneak behind
//  someone and PUNCH their balloons! Lose all 3 and you're out.
//  Protect your back! Last one with a balloon wins. First to 2.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.balloons = (function () {
  const LIVES = 3, TIME = 70;
  let data = new Map(), time = 0, self = null;

  function build() {
    data = new Map(); time = 0;
    const S = FP.Stage;
    S.island(0, -1, 0, 16, 2, 12, { grass: 0x9bd46e });
    S.island(0, -1, 0, 12, 2, 16, { grass: 0x9bd46e });
    for (const [x, z] of [[-3.5, 0], [3.5, 0], [0, -4], [0, 4]]) {
      const t = FP.Look.tree(0.9); t.position.set(x, 0, z); S.add(t);
      S.bodies.push(FP.Physics.staticBox(x, 0.8, z, 0.5, 1.6, 0.5));
    }
    // a few floating balloons for decoration
    for (let i = 0; i < 6; i++) {
      const b = balloonMesh([0xff5a5f, 0xffcf33, 0x4aa8ff, 0x5cc44a, 0xff7eb6, 0x9b6bff][i]);
      const a = (i / 6) * Math.PI * 2;
      b.position.set(Math.cos(a) * 11, 2 + (i % 3), Math.sin(a) * 10);
      b.scale.setScalar(2.2);
      S.add(b);
    }
    FP.Camera.setAngle(0.82, 0.78);
  }

  function balloonMesh(color) {
    const g = new THREE.Group();
    const ball = FP.Look.mesh(new THREE.SphereGeometry(0.26, 16, 12), FP.Look.toon(color), 0.025);
    ball.scale.set(1, 1.2, 1);
    const knot = FP.Look.mesh(new THREE.ConeGeometry(0.06, 0.08, 8), FP.Look.toon(color), 0);
    knot.position.y = -0.33; knot.rotation.x = Math.PI;
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(-0.1, 0.12, 0.18);
    g.add(ball, knot, shine);
    return g;
  }

  // each player's balloons (made when first needed, so it works for every character)
  function get(c) {
    if (data.has(c)) return data.get(c);
    const d = { left: LIVES, meshes: [], pos: [], cool: 0 };
    for (let i = 0; i < LIVES; i++) {
      const m = balloonMesh(c.color.body);
      FP.Stage.add(m);
      d.meshes.push(m);
      d.pos.push(new THREE.Vector3().copy(c.parts.torso.position));
    }
    // strings
    d.string = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x2a2140 }));
    d.string.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LIVES * 6), 3));
    d.string.frustumCulled = false;
    FP.Stage.add(d.string);
    data.set(c, d);
    return d;
  }

  // where balloon i of character c wants to float: behind their back
  function spot(c, i) {
    const p = c.parts.torso.position;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    const side = (i - 1) * 0.32;
    return new THREE.Vector3(p.x - fx * (0.85 + (i % 2) * 0.1) + fz * side, p.y + 0.3 + (i === 1 ? 0.2 : 0), p.z - fz * (0.85 + (i % 2) * 0.1) - fx * side);
  }

  function visual(dt, chars) {
    const t = performance.now() / 1000;
    for (const c of chars || []) {
      const d = get(c);
      const arr = d.string.geometry.attributes.position.array;
      const p = c.parts.torso.position;
      const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      for (let i = 0; i < LIVES; i++) {
        const m = d.meshes[i];
        const on = i < d.left && c.alive !== false && p.y > -20;
        m.visible = on;
        if (!on) { arr.fill(0, i * 6, i * 6 + 6); continue; }
        const want = spot(c, i);
        want.y += Math.sin(t * 2 + i) * 0.05;
        d.pos[i].lerp(want, Math.min(1, dt * 10));
        if (d.pos[i].distanceTo(want) > 3) d.pos[i].copy(want);
        m.position.copy(d.pos[i]);
        m.rotation.z = Math.sin(t * 1.5 + i) * 0.15;
        arr.set([p.x - fx * 0.35, p.y, p.z - fz * 0.35, d.pos[i].x, d.pos[i].y - 0.33, d.pos[i].z], i * 6);
      }
      d.string.geometry.attributes.position.needsUpdate = true;
    }
  }

  function pop(c, d, by, game) {
    d.left--;
    d.cool = 0.35;
    const m = d.meshes[d.left];
    FP.FX.word(m.position, 'POP!', '#ff5a5f', 1.1);
    FP.FX.puffs(m.position, 10, c.color.body, 3, 1);
    FP.Audio.play('bonk');
    c.expression = 'oh'; c.exprTimer = 0.8;
    c.lastHitBy = by; c.lastHitTime = performance.now();
    if (d.left <= 0) { FP.Ragdoll.knockOut(c, 3); game.eliminate(c, 'lost all the balloons!'); }
  }

  function update(dt, chars, game, roundOver) {
    visual(dt, chars);
    if (roundOver || dt === 0) return null;
    // punches that reach a balloon pop it
    for (const c of chars) {
      const d = get(c);
      d.cool -= dt;
      if (!c.alive || d.cool > 0 || d.left <= 0) continue;
      for (const o of chars) {
        if (o === c || !o.alive || o.ko > 0 || o.punchT > 0.25) continue;
        const fist = o.parts.arms[o.punchArm].position;
        const b = d.pos[d.left - 1];
        if (Math.hypot(fist.x - b.x, fist.y - b.y, fist.z - b.z) < 0.6) { pop(c, d, o, game); break; }
      }
    }
    time += dt;
    FP.Kit.fallOut(chars, game, -5);
    if (time >= TIME) {
      // time is up: whoever has the most balloons left wins
      const alive = chars.filter((c) => c.alive);
      const most = Math.max(0, ...alive.map((c) => get(c).left));
      const w = alive.filter((c) => get(c).left === most);
      return { winners: w, text: w.length === 1 ? `Time! ${w[0].name} has the most balloons!` : 'Time! It\'s a tie!' };
    }
    return FP.Kit.lastStanding(chars);
  }

  // bot brain: sneak behind someone and punch their balloons. If someone is behind ME, turn around!
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain, p = c.parts.torso.position;
    const fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    // danger behind me?
    for (const o of chars) {
      if (o === c || !o.alive || o.ko > 0) continue;
      const op = o.parts.torso.position, dx = op.x - p.x, dz = op.z - p.z, d = Math.hypot(dx, dz);
      if (d < 1.8 && (dx * fx + dz * fz) / (d || 1) < -0.2) {
        b.guard = (b.guard || 0) + dt;
        if (b.guard < 1.2) {
          // turn to face them, and push them away
          input.x = dx / d; input.z = dz / d;
          if (Math.random() < dt * 3) input.punchPressed = true;
          tools.unstick(input);
          return true;
        }
        if (b.guard > 3) b.guard = 0; // then go back to sneaking around them
      }
    }
    b.think = (b.think || 0) - dt;
    if (!b.target || !b.target.alive || b.think <= 0) {
      let best = null, bs = Infinity;
      for (const o of chars) { if (o === c || !o.alive) continue; const s = o.parts.torso.position.distanceTo(p) + get(o).left * 0.8 + Math.random(); if (s < bs) { bs = s; best = o; } }
      b.target = best; b.think = 2;
    }
    if (b.target) {
      const t = b.target, tp = t.parts.torso.position;
      const tfx = Math.sin(t.yaw), tfz = Math.cos(t.yaw);
      // the spot right behind them
      const bx = tp.x - tfx * 1.6, bz = tp.z - tfz * 1.6;
      const dBehind = Math.hypot(bx - p.x, bz - p.z);
      if (dBehind > 0.6) {
        // go around them (not through them)
        const toT = Math.hypot(tp.x - p.x, tp.z - p.z);
        const inFront = ((p.x - tp.x) * tfx + (p.z - tp.z) * tfz) > 0;
        if (inFront && toT < 2.5) { const side = b.circle || 1; tools.steer(c, tp.x + tfz * 1.8 * side, tp.z - tfx * 1.8 * side, input); }
        else tools.steer(c, bx, bz, input);
      } else {
        // aim at the balloons and punch
        const bl = get(t).pos[Math.max(0, get(t).left - 1)];
        tools.steer(c, bl.x, bl.z, input);
        input.x *= 0.4; input.z *= 0.4;
        if (Math.random() < dt * 4) input.punchPressed = true;
      }
    }
    tools.unstick(input);
    return true;
  }

  function hud() { return `Punch the balloons on their backs! Protect yours! &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><ellipse cx="60" cy="66" rx="52" ry="10" fill="#9bd46e" stroke="#2a2140" stroke-width="2"/><ellipse cx="44" cy="52" rx="7" ry="9" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="44" cy="39" r="6" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><g stroke="#2a2140" stroke-width="2"><path d="M44 52l-14-14M44 52l-8-20M44 52l-18-6" fill="none" stroke-width="1"/><ellipse cx="28" cy="32" rx="6" ry="7" fill="#4aa8ff"/><ellipse cx="36" cy="24" rx="6" ry="7" fill="#4aa8ff"/><ellipse cx="22" cy="42" rx="6" ry="7" fill="#4aa8ff"/></g><ellipse cx="80" cy="52" rx="7" ry="9" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="76" cy="40" r="6" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="64" cy="44" r="4" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><path d="M54 34l-4-4M52 40h-6M56 28v-5" stroke="#ff9a3c" stroke-width="2.5" stroke-linecap="round"/></svg>';

  self = {
    id: 'balloons', name: 'Balloon Pop', roundsToWin: 2, minTotal: 2, removeOut: 2, song: 'party', minZoom: 15, art: ART,
    desc: 'Everyone has 3 balloons on their back. Sneak behind people and punch them! Protect yours.',
    build, spawn: (i, n) => FP.Kit.ring(i, n, 4.5, 4, 0.6), update, botThink, hud, visual,
    netState: () => { const o = {}; for (const [c, d] of data) if (c.player) o[c.player.id] = d.left; return o; },
    applyNetState: (s) => { for (const c of FP.Ragdoll.all) if (c.player && s[c.player.id] !== undefined) get(c).left = s[c.player.id]; },
  };
  return self;
})();
