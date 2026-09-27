// ============================================================
//  FLOPPY PARTY — METEOR SHOWER
//  Meteors fall from the sky! A red circle shows where each one
//  will land. Get out of the circles (and push others in).
//  A meteor hit sends you flying. Fall off the island and you're
//  out. Last one standing wins. First to 3.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.meteor = (function () {
  const R = 7.5, BLAST = 2.0, POOL = 10, WARN = 1.6;
  let rocks = [], time = 0, next = 0, self = null;

  function build() {
    rocks = []; time = 0; next = 2;
    const S = FP.Stage;
    S.island(0, -1, 0, R * 2, 2, R * 1.2, { grass: 0x8fbf6a, dirt: 0x7a5a48 });
    S.island(0, -1, 0, R * 1.2, 2, R * 2, { grass: 0x8fbf6a, dirt: 0x7a5a48 });
    S.island(0, -1, 0, R * 1.7, 2, R * 1.7, { grass: 0x8fbf6a, dirt: 0x7a5a48 });
    for (const [x, z] of [[-4, -3], [4, 3], [3.5, -4], [-3.5, 4]]) { const r = FP.Props.rock(0.8, 0x9a8f86); r.position.set(x, 0, z); S.add(r); S.bodies.push(FP.Physics.staticBox(x, 0.3, z, 1.2, 0.6, 1)); }
    for (let i = 0; i < POOL; i++) {
      const g = new THREE.Group();
      const rock = FP.Look.mesh(new THREE.DodecahedronGeometry(0.55, 0), new THREE.MeshToonMaterial({ color: 0x6a4c3a, flatShading: true, gradientMap: FP.Look.toon(0xffffff).gradientMap }), 0.04);
      const fire = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), new THREE.MeshBasicMaterial({ color: 0xff9a3c, transparent: true, opacity: 0.55, depthWrite: false }));
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.6, 3, 10), new THREE.MeshBasicMaterial({ color: 0xffcf33, transparent: true, opacity: 0.45, depthWrite: false }));
      tail.position.y = 1.8;
      g.add(rock, fire, tail);
      g.visible = false;
      S.add(g);
      const ring = new THREE.Mesh(new THREE.RingGeometry(BLAST - 0.25, BLAST, 32), new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.visible = false;
      const fill = new THREE.Mesh(new THREE.CircleGeometry(BLAST, 32), new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      fill.rotation.x = -Math.PI / 2; fill.visible = false;
      S.add(ring, fill);
      rocks.push({ mesh: g, ring, fill, on: false, t: 0, x: 0, z: 0 });
    }
    // a dark, dramatic sky
    S.hemi.color.setHex(0xffc9a8); S.sun.color.setHex(0xffb080);
    S.onClear(() => { S.hemi.color.setHex(0xffffff); S.sun.color.setHex(0xfff4e0); });
    FP.Camera.setAngle(0.85, 0.72);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 3.8, 3.8, 0.5); }

  function drop(chars) {
    const m = rocks.find((r) => !r.on);
    if (!m) return;
    // half of the meteors aim at someone, the others land anywhere
    const alive = chars.filter((c) => c.alive);
    let x, z;
    if (alive.length && Math.random() < 0.5) { const c = alive[Math.floor(Math.random() * alive.length)]; x = c.parts.torso.position.x + (Math.random() - 0.5) * 1.5; z = c.parts.torso.position.z + (Math.random() - 0.5) * 1.5; }
    else { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * R * 0.85; x = Math.cos(a) * r; z = Math.sin(a) * r; }
    Object.assign(m, { on: true, t: 0, x, z });
    FP.Audio.play('beep');
  }

  function boom(m, chars) {
    m.on = false;
    const pos = new THREE.Vector3(m.x, 0.3, m.z);
    FP.FX.puffs(pos, 22, 0xff9a3c, 6, 2);
    FP.FX.puffs(pos, 12, 0x555566, 4, 1.6);
    FP.FX.word(pos, 'BOOM!', '#ff5a5f', 1.4);
    FP.Camera.shake(0.5);
    FP.Audio.play('bonk'); FP.Audio.play('splash');
    for (const c of chars) {
      if (!c.alive) continue;
      const p = c.parts.torso.position, dx = p.x - m.x, dz = p.z - m.z, d = Math.hypot(dx, dz);
      if (d > BLAST + 0.3) continue;
      const k = 1 - d / (BLAST + 0.3);
      FP.Ragdoll.knockOut(c, 1.4);
      for (const b of c.bodies) { b.velocity.x += (dx / (d || 1)) * 13 * k; b.velocity.z += (dz / (d || 1)) * 13 * k; b.velocity.y += 9 * k + 3; }
    }
  }

  function visual() {
    const t = performance.now() / 1000;
    for (const m of rocks) {
      m.ring.visible = m.fill.visible = m.on;
      m.mesh.visible = m.on;
      if (!m.on) continue;
      const k = Math.min(1, m.t / WARN);
      m.ring.position.set(m.x, 0.06, m.z); m.fill.position.set(m.x, 0.05, m.z);
      m.fill.scale.setScalar(k);
      m.ring.material.opacity = 0.5 + 0.4 * Math.sin(t * 20);
      m.mesh.position.set(m.x + (1 - k) * 6, 0.5 + (1 - k) * 25, m.z - (1 - k) * 3);
      m.mesh.rotation.set(t * 3, t * 2, 0);
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      next -= dt;
      if (next <= 0) { drop(chars); if (time > 20) drop(chars); next = Math.max(0.35, 1.3 - time * 0.02); }
      for (const m of rocks) if (m.on) { m.t += dt; if (m.t >= WARN) boom(m, chars); }
    }
    visual();
    if (roundOver || dt === 0) return null;
    FP.Kit.fallOut(chars, game, -5);
    return FP.Kit.lastStanding(chars);
  }

  // bot brain: step out of any red circle, stay near the middle, shove people
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position;
    let danger = null, dd = Infinity;
    for (const m of rocks) { if (!m.on) continue; const d = Math.hypot(p.x - m.x, p.z - m.z); if (d < BLAST + 0.7 && d < dd) { dd = d; danger = m; } }
    if (danger) {
      let dx = p.x - danger.x, dz = p.z - danger.z;
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      // don't run off the island to escape
      if (Math.hypot(p.x + dx * 2, p.z + dz * 2) > R - 1) { const t = dx; dx = -dz; dz = t; }
      input.x = dx; input.z = dz;
    } else {
      const b = tools.brain;
      b.wander += dt * 0.4;
      tools.steer(c, Math.cos(b.wander + c.index * 2) * 3, Math.sin(b.wander + c.index) * 3, input);
      input.x *= 0.5; input.z *= 0.5;
      FP.Kit.punchNearby(c, chars, dt, input, tools, 1.3, 1.5);
    }
    tools.unstick(input);
    return true;
  }

  function hud() { return 'Meteors! Get out of the red circles!'; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#ffc9a8"/><ellipse cx="60" cy="62" rx="50" ry="13" fill="#8fbf6a" stroke="#2a2140" stroke-width="2"/><ellipse cx="78" cy="62" rx="14" ry="4" fill="#ff3a3a" opacity=".5" stroke="#ff3a3a" stroke-width="2"/><path d="M104 6L82 44" stroke="#ffcf33" stroke-width="9" stroke-linecap="round" opacity=".6"/><circle cx="82" cy="44" r="7" fill="#6a4c3a" stroke="#2a2140" stroke-width="2"/><circle cx="82" cy="44" r="10" fill="#ff9a3c" opacity=".35"/><ellipse cx="40" cy="54" rx="6" ry="8" fill="#5cc44a" stroke="#2a2140" stroke-width="2"/><circle cx="40" cy="43" r="5" fill="#5cc44a" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'meteor', name: 'Meteor Shower', roundsToWin: 3, minTotal: 2, removeOut: 1.5, song: 'tense', minZoom: 16, art: ART,
    desc: 'Meteors fall from the sky! Red circles show where they land. Get out of the way!',
    build, spawn, update, botThink, hud, visual,
    netState: () => rocks.map((m) => (m.on ? [Math.round(m.x * 10) / 10, Math.round(m.z * 10) / 10, Math.round(m.t * 10) / 10] : 0)),
    applyNetState: (s) => { s.forEach((v, i) => { const m = rocks[i]; if (!m) return; m.on = !!v; if (v) { m.x = v[0]; m.z = v[1]; m.t = v[2]; } }); },
  };
  return self;
})();
