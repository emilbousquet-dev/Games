// ============================================================
//  FLOPPY PARTY — BUMPER BASH
//  A round pinball table in the sky, full of big springy
//  bumpers. Touch one and BOING, you go flying! Push the
//  others into the bumpers or off the edge. Two bumpers move
//  around, and after a while all bumpers get SUPER bouncy.
//  Last one standing wins the round. First to 2.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.bumpers = (function () {
  const RADIUS = 8.5, BR = 0.75, SUPER_AT = 25;
  const COLORS = [0xff5a5f, 0x4aa8ff, 0xffcf33, 0x5cc44a, 0xa77bff, 0xff9a3c];
  let bumpers = [], time = 0, cool = new Map(), wave = 0, waveRing = null, self = null;

  function bumperMesh(color) {
    const g = new THREE.Group();
    const base = FP.Look.mesh(new THREE.CylinderGeometry(BR + 0.1, BR + 0.15, 0.3, 24), FP.Look.toon(0x3a3450), 0.03);
    base.position.y = 0.15;
    const ring = FP.Look.mesh(new THREE.TorusGeometry(BR * 0.9, 0.16, 10, 28), FP.Look.toon(0xffffff), 0.02);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.55;
    const cap = FP.Look.mesh(new THREE.CylinderGeometry(BR * 0.85, BR * 0.9, 0.7, 24), FP.Look.toon(color, { unique: true, emissive: 0x000000 }), 0.03);
    cap.position.y = 0.6;
    const top = FP.Look.mesh(new THREE.SphereGeometry(BR * 0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), FP.Look.toon(0xffffff), 0.02);
    top.position.y = 0.95;
    g.add(base, ring, cap, top);
    g.userData = { cap, ring };
    return g;
  }

  function build() {
    bumpers = []; time = 0; cool = new Map(); wave = 0;
    const S = FP.Stage;
    // the round table
    const table = FP.Look.mesh(new THREE.CylinderGeometry(RADIUS, RADIUS - 0.4, 1.2, 48), FP.Look.toon(0x2f7fd6), 0.05);
    table.position.y = -0.6; S.add(table);
    const top = new THREE.Mesh(new THREE.CircleGeometry(RADIUS - 0.25, 48), FP.Look.toon(0x5ab0ff));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.01; S.add(top);
    for (let r = 2.5; r < RADIUS - 0.5; r += 2.5) {
      const line = new THREE.Mesh(new THREE.RingGeometry(r - 0.06, r + 0.06, 48), new THREE.MeshBasicMaterial({ color: 0xbfe0ff }));
      line.rotation.x = -Math.PI / 2; line.position.y = 0.02; S.add(line);
    }
    const floor = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: FP.Physics.mats.floor, collisionFilterGroup: FP.Physics.GROUP.WORLD, collisionFilterMask: FP.Physics.ALL });
    floor.addShape(new CANNON.Cylinder(RADIUS, RADIUS, 1.2, 32));
    floor.position.set(0, -0.6, 0);
    FP.Physics.world.addBody(floor); S.bodies.push(floor);
    // lights around the edge
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: COLORS[i % COLORS.length] }));
      bulb.position.set(Math.cos(a) * (RADIUS - 0.05), -0.2, Math.sin(a) * (RADIUS - 0.05));
      S.add(bulb);
      FP.Props.wiggle(bulb, (t) => { bulb.visible = Math.floor(t * 4 + i) % 3 !== 0; });
    }
    // the bumpers: one in the middle, 5 around it, 2 that orbit
    const spots = [[0, 0, 0]];
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; spots.push([Math.cos(a) * 4, Math.sin(a) * 4, 0]); }
    spots.push([6.2, 0, 1], [-6.2, 0, -1]);
    spots.forEach(([x, z, orbit], i) => {
      const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, material: FP.Physics.mats.floor, collisionFilterGroup: FP.Physics.GROUP.WORLD, collisionFilterMask: FP.Physics.ALL });
      body.addShape(new CANNON.Cylinder(BR, BR, 1.2, 16));
      body.position.set(x, 0.6, z);
      FP.Physics.world.addBody(body); S.bodies.push(body);
      // the body's middle is 0.6 up, so the model sits 0.6 lower inside a holder
      const holder = new THREE.Group();
      const m = bumperMesh(COLORS[i % COLORS.length]);
      m.position.y = -0.6; holder.add(m);
      holder.position.set(x, 0.6, z);
      S.add(holder); S.movers.push([holder, body]);
      bumpers.push({ x, z, body, mesh: m, orbit, a: Math.atan2(z, x), flash: 0 });
    });
    // the shockwave ring (hidden until it goes off)
    waveRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    waveRing.rotation.x = -Math.PI / 2; waveRing.position.y = 0.3; S.add(waveRing);
    FP.Camera.setAngle(0.85, 0.9);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 6.3, 6.3, Math.PI / 4 + 0.35); }

  // the moving bumpers glide around the table
  function beforeStep(dt) {
    const on = FP.Game.state === 'play';
    for (const b of bumpers) {
      if (b.orbit) {
        if (on) b.a += dt * 0.45 * b.orbit;
        b.x = Math.cos(b.a) * 6.2; b.z = Math.sin(b.a) * 6.2;
      }
      b.body.position.set(b.x, 0.6, b.z);
      b.body.velocity.set(0, 0, 0);
    }
  }

  function visual(dt) {
    if (waveRing) {
      const age = wave > 0 ? time - wave : 99;
      waveRing.material.opacity = age < 0.8 ? 0.8 * (1 - age / 0.8) : 0;
      waveRing.scale.setScalar(1 + Math.min(age, 0.8) * 9);
    }
    for (const b of bumpers) {
      b.flash = Math.max(0, b.flash - (dt || 0.016) * 3);
      const s = 1 + b.flash * 0.35;
      b.mesh.userData.cap.scale.set(s, 1 + b.flash * 0.2, s);
      b.mesh.userData.cap.material.emissive.setHex(b.flash > 0.3 ? 0x666666 : time > SUPER_AT ? 0x331100 : 0x000000);
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      const power = time > SUPER_AT ? 1.4 : 1;
      // after the super bumpers, a shockwave from the middle every 6 seconds pushes everyone outward
      if (time > SUPER_AT + 6 && time - wave >= 6) {
        wave = time;
        FP.Audio.play('boing'); FP.Audio.play('whoosh'); FP.Camera.shake(0.3);
        bumpers[0].flash = 1;
        for (const c of chars) {
          if (!c.alive || c.parts.torso.position.y < -0.5) continue;
          const p = c.parts.torso.position, r = Math.hypot(p.x, p.z) || 0.01;
          const push = 6.5 + (time - SUPER_AT) * 0.08;
          for (const body of c.bodies) { body.velocity.x += (p.x / r) * push; body.velocity.z += (p.z / r) * push; body.velocity.y = Math.max(body.velocity.y, 2.5); }
        }
      }
      if (time > SUPER_AT && time - dt <= SUPER_AT) { FP.UI.big('SUPER BUMPERS!', 1.4); if (FP.Net) FP.Net.banner('SUPER BUMPERS!', ''); FP.Audio.play('alarm'); }
      for (const c of chars) {
        if (!c.alive) continue;
        const cd = (cool.get(c) || 0) - dt;
        cool.set(c, cd);
        if (cd > 0) continue;
        const p = c.parts.torso.position;
        if (p.y > 2.2 || p.y < -0.5) continue;
        for (const b of bumpers) {
          const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
          if (d > BR + 0.5) continue;
          const nx = d > 0.01 ? dx / d : 1, nz = d > 0.01 ? dz / d : 0;
          const push = 11 * power * ((FP.Fun && FP.Fun.punch) || 1);
          for (const body of c.bodies) { body.velocity.x = nx * push; body.velocity.z = nz * push; body.velocity.y = Math.max(body.velocity.y, 3.5); }
          c.thrownT = 0; // bumpers never knock out, they just BOING
          cool.set(c, 0.35);
          b.flash = 1;
          c.expression = 'oh'; c.exprTimer = 0.8;
          FP.FX.word(new THREE.Vector3(b.x, 1.8, b.z), 'BOING!', '#ffcf33', 1.1);
          FP.FX.stars(new THREE.Vector3(p.x, p.y, p.z), 3);
          FP.Audio.play('boing');
          FP.Camera.shake(0.12);
          break;
        }
      }
    }
    visual(dt);
    if (roundOver || dt === 0) return null;
    FP.Kit.fallOut(chars, game, -4, 'got bumped off!');
    return FP.Kit.lastStanding(chars);
  }

  // bot brain: stay away from bumpers and the edge, punch people toward them
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position;
    const target = FP.Kit.nearest(c, chars.filter((o) => o !== c && o.alive).map((o) => ({ x: o.parts.torso.position.x, z: o.parts.torso.position.z, c: o })));
    let mx = 0, mz = 0;
    if (target) {
      const t = target.item;
      mx = t.x - p.x; mz = t.z - p.z;
      const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l;
      if (target.d < 1.4 && Math.random() < dt * 3.5) input.punchPressed = true;
    }
    // steer away from bumpers
    for (const b of bumpers) {
      const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz);
      if (d < BR + 1.6) { mx += (dx / d) * (BR + 1.6 - d) * 1.6; mz += (dz / d) * (BR + 1.6 - d) * 1.6; }
    }
    // and away from the edge
    const r = Math.hypot(p.x, p.z);
    if (r > RADIUS - 2.2) { mx -= (p.x / r) * 1.8; mz -= (p.z / r) * 1.8; }
    const l = Math.hypot(mx, mz);
    if (l > 0.01) { input.x = mx / Math.max(1, l); input.z = mz / Math.max(1, l); }
    tools.unstick(input);
    return true;
  }

  function hud() { return time > SUPER_AT ? 'SUPER BUMPERS! Watch out for the shockwaves!' : `Push everyone into the bumpers! Super bumpers in ${Math.ceil(SUPER_AT - time)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><ellipse cx="60" cy="58" rx="54" ry="18" fill="#5ab0ff" stroke="#2a2140" stroke-width="2"/><g stroke="#2a2140" stroke-width="2"><ellipse cx="34" cy="54" rx="10" ry="4" fill="#3a3450"/><rect x="26" y="40" width="16" height="14" fill="#ff5a5f"/><ellipse cx="34" cy="40" rx="8" ry="3" fill="#fff"/><ellipse cx="84" cy="60" rx="10" ry="4" fill="#3a3450"/><rect x="76" y="46" width="16" height="14" fill="#ffcf33"/><ellipse cx="84" cy="46" rx="8" ry="3" fill="#fff"/></g><ellipse cx="60" cy="30" rx="6" ry="8" fill="#5cc44a" stroke="#2a2140" stroke-width="2" transform="rotate(30 60 30)"/><circle cx="66" cy="20" r="5" fill="#5cc44a" stroke="#2a2140" stroke-width="2"/><path d="M44 36l6-6M46 42l8-2" stroke="#ffcf33" stroke-width="3" stroke-linecap="round"/></svg>';

  self = {
    id: 'bumpers', name: 'Bumper Bash', roundsToWin: 2, minTotal: 2, removeOut: 1.5, song: 'party', minZoom: 16, art: ART,
    desc: 'Touch a bumper and BOING, you fly! Push the others into bumpers and off the table.',
    build, spawn, beforeStep, update, botThink, hud, visual,
    netState: () => ({ t: Math.round(time * 10) / 10, w: Math.round(wave * 10) / 10, f: bumpers.map((b) => (b.flash > 0.5 ? 1 : 0)).join('') }),
    applyNetState: (st) => { time = st.t; wave = st.w || 0; if (st.f) bumpers.forEach((b, i) => { if (st.f[i] === '1' && b.flash < 0.5) b.flash = 1; }); },
  };
  return self;
})();
