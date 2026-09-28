// ============================================================
//  FLOPPY PARTY — BOULDER DODGE
//  Giant boulders roll across the island from every side.
//  A red arrow shows where the next one comes from. DODGE!
//  Get flattened off the edge and you're out. Last one
//  standing wins. First to 2.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.boulder = (function () {
  const W = 18, D = 14, R = 1.05, POOL = 6;
  let rocks = [], warns = [], time = 0, next = 0, self = null;

  function build() {
    rocks = []; warns = []; time = 0; next = 2.5;
    const S = FP.Stage;
    // a desert island: sand, cacti and rocks around the edge
    S.island(0, -1, 0, W, 2, D, { grass: 0xf2d38a, dirt: 0xc98b58 });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const ix = x * (W / 2 + 2.2), iz = z * (D / 2 + 1.6);
      S.island(ix, -1.8, iz, 3, 2, 3, { grass: 0xf2d38a, dirt: 0xc98b58 });
      const c = FP.Props.cactus(1 + (x + z === 0 ? 0.2 : 0)); c.position.set(ix, -0.8, iz); c.rotation.y = x * z; S.add(c);
      const r = FP.Props.rock(0.9, 0xc9a27e); r.position.set(ix + 0.9, -0.8, iz - 0.7); S.add(r);
    }
    for (let i = 0; i < POOL; i++) {
      const mesh = FP.Look.mesh(new THREE.DodecahedronGeometry(R, 1), new THREE.MeshToonMaterial({ color: 0x9a8f86, flatShading: true, gradientMap: FP.Look.toon(0xffffff).gradientMap }), 0.05);
      const body = new CANNON.Body({ mass: 40, material: FP.Physics.mats.prop, linearDamping: 0.05, angularDamping: 0.05, collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.ALL });
      body.addShape(new CANNON.Sphere(R));
      body.position.set(0, -100 - i * 5, 0);
      const r = { ...FP.Stage.prop(mesh, body), parked: true, dir: null };
      body.addEventListener('collide', (e) => onRockHit(r, e));
      rocks.push(r);
    }
    // warning arrows (one per rock)
    for (let i = 0; i < POOL; i++) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.9); shape.lineTo(0.7, 0); shape.lineTo(0.25, 0); shape.lineTo(0.25, -0.8); shape.lineTo(-0.25, -0.8); shape.lineTo(-0.25, 0); shape.lineTo(-0.7, 0); shape.closePath();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2;
      m.visible = false;
      S.add(m);
      warns.push({ mesh: m, t: 0, on: false, x: 0, z: 0, dx: 0, dz: 0, speed: 0 });
    }
    FP.Camera.setAngle(0.85, 0.75);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 3.5, 3, 0.7); }

  function onRockHit(r, e) {
    if (!FP.Kit.live(self) || r.parked) return;
    const c = e.body && e.body.userData && e.body.userData.char;
    if (!c || c.ko > 0) return;
    const v = r.body.velocity;
    if (Math.hypot(v.x, v.z) < 3) return;
    FP.Ragdoll.knockOut(c, 1.6);
    for (const b of c.bodies) { b.velocity.x += v.x * 0.9; b.velocity.z += v.z * 0.9; b.velocity.y += 6; }
    FP.FX.word(c.parts.head.position, 'SQUISH!', '#9a8f86', 1.3);
    FP.Camera.shake(0.5);
    FP.Audio.play('bonk');
  }

  // plan a new boulder: pick a side, show the arrow, launch it a moment later
  function plan() {
    const w = warns.find((x) => !x.on);
    if (!w) return;
    const side = Math.floor(Math.random() * 4);
    const along = (Math.random() - 0.5) * (side < 2 ? W - 4 : D - 4);
    const speed = Math.min(17, 8 + time * 0.13);
    if (side === 0) Object.assign(w, { x: along, z: -D / 2 + 0.8, dx: 0, dz: 1 });
    if (side === 1) Object.assign(w, { x: along, z: D / 2 - 0.8, dx: 0, dz: -1 });
    if (side === 2) Object.assign(w, { x: -W / 2 + 0.8, z: along, dx: 1, dz: 0 });
    if (side === 3) Object.assign(w, { x: W / 2 - 0.8, z: along, dx: -1, dz: 0 });
    w.on = true; w.t = 1.1; w.speed = speed;
    FP.Audio.play('beep');
  }

  function launch(w) {
    const r = rocks.find((x) => x.parked);
    w.on = false;
    if (!r) return;
    r.parked = false;
    r.body.position.set(w.x - w.dx * 1.2, R + 0.1, w.z - w.dz * 1.2);
    r.body.velocity.set(w.dx * w.speed, 0, w.dz * w.speed);
    r.body.angularVelocity.set(w.dz * w.speed / R, 0, -w.dx * w.speed / R);
    r.dir = { x: w.dx, z: w.dz };
    FP.Audio.play('whoosh');
  }

  function visual() {
    const t = performance.now() / 1000;
    for (const w of warns) {
      w.mesh.visible = w.on && Math.sin(t * 20) > -0.3;
      if (!w.on) continue;
      w.mesh.position.set(w.x, 0.05, w.z);
      w.mesh.rotation.z = Math.atan2(w.dx, w.dz) + Math.PI; // point the way it will roll
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      next -= dt;
      if (next <= 0) { plan(); if (time > 12 && Math.random() < 0.6) plan(); if (time > 35) plan(); next = Math.max(0.7, 2.4 - time * 0.045); }
      for (const w of warns) if (w.on) { w.t -= dt; if (w.t <= 0) launch(w); }
      for (const r of rocks) {
        if (r.parked) { r.body.position.set(0, -100 - rocks.indexOf(r) * 5, 0); r.body.velocity.set(0, 0, 0); continue; }
        if (r.body.position.y < -12) r.parked = true;
      }
    }
    visual();
    if (roundOver || dt === 0) return null;
    FP.Kit.fallOut(chars, game, -5);
    return FP.Kit.lastStanding(chars);
  }

  // bot brain: watch the rolling boulders (and the arrows) and step out of their way
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain, p = c.parts.torso.position;
    let danger = null, dd = Infinity;
    const threats = rocks.filter((r) => !r.parked).map((r) => ({ x: r.body.position.x, z: r.body.position.z, dx: r.dir.x, dz: r.dir.z }))
      .concat(warns.filter((w) => w.on).map((w) => ({ x: w.x, z: w.z, dx: w.dx, dz: w.dz })));
    for (const t of threats) {
      const rx = p.x - t.x, rz = p.z - t.z;
      const ahead = rx * t.dx + rz * t.dz; // how far in front of the boulder I am
      const side = rx * t.dz - rz * t.dx;   // how far to the side of its path
      if (ahead > -1 && ahead < 9 && Math.abs(side) < 1.9 && ahead < dd) { dd = ahead; danger = { t, side }; }
    }
    if (danger) {
      // step to the side (whichever side I'm already on, unless that's the edge)
      let s = danger.side >= 0 ? 1 : -1;
      const tx = p.x + danger.t.dz * s * 2.5, tz = p.z - danger.t.dx * s * 2.5;
      if (Math.abs(tx) > W / 2 - 1.5 || Math.abs(tz) > D / 2 - 1.5) s = -s;
      input.x = danger.t.dz * s; input.z = -danger.t.dx * s;
    } else {
      b.wander += dt * 0.35;
      tools.steer(c, Math.cos(b.wander + c.index * 2) * 3, Math.sin(b.wander * 1.2 + c.index) * 2.5, input);
      input.x *= 0.5; input.z *= 0.5;
      FP.Kit.punchNearby(c, chars, dt, input, tools, 1.3, 1.5);
    }
    tools.unstick(input);
    return true;
  }

  function hud() { return 'Watch the red arrows and dodge the boulders!'; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><path d="M10 56l50-14 50 14-50 18z" fill="#a8d86e" stroke="#2a2140" stroke-width="2"/><circle cx="40" cy="42" r="13" fill="#9a8f86" stroke="#2a2140" stroke-width="2.5"/><path d="M33 36l6 4-2 7M44 34l3 6" stroke="#2a2140" stroke-width="1.5" fill="none" opacity=".5"/><path d="M18 44h-8M20 50h-10M20 38h-6" stroke="#2a2140" stroke-width="2" stroke-linecap="round" opacity=".5"/><path d="M86 60l8-6h-4v-6h-8v6h-4z" fill="#ff3a3a"/><ellipse cx="72" cy="50" rx="6" ry="8" fill="#5cc44a" stroke="#2a2140" stroke-width="2" transform="rotate(-15 72 50)"/><circle cx="75" cy="39" r="5" fill="#5cc44a" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'boulder', name: 'Boulder Dodge', roundsToWin: 2, minTotal: 2, removeOut: 1.5, song: 'tense', minZoom: 16, art: ART,
    desc: 'Giant boulders roll across the island. Watch the red arrows and dodge!',
    build, spawn, update, botThink, hud, visual,
    netState: () => warns.map((w) => (w.on ? [Math.round(w.x * 10) / 10, Math.round(w.z * 10) / 10, w.dx, w.dz] : 0)),
    applyNetState: (s) => { s.forEach((v, i) => { const w = warns[i]; if (!w) return; w.on = !!v; if (v) { w.x = v[0]; w.z = v[1]; w.dx = v[2]; w.dz = v[3]; } }); },
  };
  return self;
})();
