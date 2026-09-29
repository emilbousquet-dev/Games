// ============================================================
//  FLOPPY PARTY — KNOCKOUT ARENA
//  A round floating platform made of tiles. After a while the
//  tiles shake and fall. Knock everyone off! Last one standing
//  wins the round. First to 3 round wins takes the crown.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.arena = (function () {
  const TILE = 2, N = 8;
  const TILE_COLORS = [0xffd6e7, 0xfff1b8, 0xd4f5c4, 0xcfe8ff, 0xe6d9ff];
  let tiles = [], time = 0, nextFall = 0, balls = [], crates = [], nextCrate = 0, hazard = null;
  // power-ups: crates drop from the sky. Touch one to get a power for a few seconds
  const POWERS = {
    fists: { name: 'GIANT FISTS!', color: 0xff5a5f, css: '#ff5a5f', t: 8 },
    speed: { name: 'SPEED BOOST!', color: 0x4aa8ff, css: '#4aa8ff', t: 8 },
    bouncy: { name: 'BOUNCY SHOES!', color: 0x6fd35a, css: '#6fd35a', t: 8 },
  };
  const KINDS = Object.keys(POWERS);
  function crateMesh() {
    const g = new THREE.Group();
    const box = FP.Look.boxMesh(0.8, 0.8, 0.8, FP.Look.toon(0xffcf33, { unique: true }));
    const tex = FP.Props.textTexture('?', '#ffcf33', '#2a2140', 128, 128);
    const mark = new THREE.MeshBasicMaterial({ map: tex });
    for (const [x, z, ry] of [[0, 0.41, 0], [0, -0.41, Math.PI], [0.41, 0, Math.PI / 2], [-0.41, 0, -Math.PI / 2]]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), mark);
      p.position.set(x, 0, z); p.rotation.y = ry; g.add(p);
    }
    g.add(box);
    FP.Stage.add(g);
    return g;
  }
  function givePower(c, kind) {
    endPower(c);
    const P = POWERS[kind];
    c.power = { kind, t: P.t };
    if (kind === 'fists') { c.punchPower = 2.2; c.meshes.arms.forEach((m) => m.scale.setScalar(1.7)); }
    if (kind === 'speed') c.speedMul = 1.55;
    if (kind === 'bouncy') c.jumpMul = 1.65;
    FP.FX.word(c.parts.head.position, P.name, P.css, 1.5);
    FP.FX.puffs(c.parts.torso.position, 14, P.color, 4, 1.2);
    FP.Audio.play('coin');
  }
  function endPower(c) {
    if (!c.power) return;
    if (c.power.kind === 'fists') { c.punchPower = 1; c.meshes.arms.forEach((m) => m.scale.setScalar(1)); }
    if (c.power.kind === 'speed') c.speedMul = 1;
    if (c.power.kind === 'bouncy') c.jumpMul = 1;
    c.power = null;
  }

  function build() {
    tiles = []; balls = []; time = 0; nextFall = 12; crates = []; nextCrate = 5;
    // from round 2 on, a surprise hazard joins in: wind, the giant hand or an earthquake
    const round = FP.Game ? FP.Game.round : 1;
    hazard = round >= 2 && !(FP.Net && FP.Net.isClient()) ? ['wind', 'hand', 'quake'][Math.floor(Math.random() * 3)] : null;
    if (FP.Fun) FP.Fun.hazard = hazard;
    const half = (N - 1) / 2;
    for (let ix = 0; ix < N; ix++) {
      for (let iz = 0; iz < N; iz++) {
        const x = (ix - half) * TILE, z = (iz - half) * TILE;
        const dist = Math.hypot(x, z);
        if (dist > N * TILE / 2 - 0.4) continue; // round shape
        const color = TILE_COLORS[(ix + iz * 3) % TILE_COLORS.length];
        const t = FP.Stage.block(x, -0.5, z, TILE - 0.06, 1, TILE - 0.06, color, { kinematic: true, unique: true });
        tiles.push({ ...t, x, z, dist, state: 'solid', timer: 0, baseColor: color, vy: 0 });
      }
    }
    // a big island underneath far away, just for looks
    const under = FP.Look.islandBlock(10, 6, 10);
    under.position.set(0, -26, 0);
    FP.Stage.add(under);
    const t1 = FP.Look.tree(2); t1.position.set(-2, -23, 1); FP.Stage.add(t1);
    // bunting flags floating around the arena
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, r = N * TILE / 2 + 3;
      const b = FP.Look.cloud(0.9);
      b.position.set(Math.cos(a) * r, -1.5 + Math.sin(i * 1.7), Math.sin(a) * r);
      FP.Stage.add(b);
    }
    // two bouncy beach balls to punch around
    for (let i = 0; i < 2; i++) balls.push(beachBall(i ? 3 : -3, 2, -3));
    FP.Camera.setAngle(0.8, 0.8);
  }

  function beachBall(x, y, z) {
    const r = 0.55;
    const g = new THREE.Group();
    const colors = [0xff5a5f, 0xffffff, 0x4aa8ff, 0xffffff, 0xffcf33, 0xffffff];
    colors.forEach((c, i) => {
      const seg = FP.Look.mesh(new THREE.SphereGeometry(r, 12, 10, i * Math.PI / 3, Math.PI / 3), FP.Look.toon(c), 0, true);
      g.add(seg);
    });
    const outline = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 14, 10), FP.Look.outlineMat);
    g.add(outline);
    const body = new CANNON.Body({ mass: 0.6, material: FP.Physics.mats.ball, linearDamping: 0.2, angularDamping: 0.3,
      collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.ALL });
    body.addShape(new CANNON.Sphere(r));
    body.position.set(x, y, z);
    return FP.Stage.prop(g, body);
  }

  function spawn(i, n) {
    const a = (i / n) * Math.PI * 2 + Math.PI / 4;
    return { x: Math.cos(a) * 4, y: 0.2, z: Math.sin(a) * 4, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) };
  }

  function update(dt, chars, game, roundOver) {
    if (dt === 0 || roundOver) { if (roundOver) for (const c of chars) endPower(c); return null; }
    time += dt;
    // power-up crates
    if (time > nextCrate) {
      nextCrate = time + 6 + Math.random() * 3;
      const solid = tiles.filter((t) => t.state === 'solid' && t.dist < 6);
      if (solid.length && crates.length < 2) {
        const t = solid[Math.floor(Math.random() * solid.length)];
        crates.push({ x: t.x, z: t.z, y: 14, vy: 0, kind: KINDS[Math.floor(Math.random() * KINDS.length)], mesh: crateMesh(), tile: t, spin: Math.random() * 6 });
      }
    }
    for (const k of crates.slice()) {
      const ground = k.tile.state === 'solid' || k.tile.state === 'shaking' ? 0.45 : -60;
      if (k.y > ground) { k.vy -= 20 * dt; k.y = Math.max(ground, k.y + k.vy * dt); if (k.y === ground && k.vy < -3) { FP.FX.puffs(new THREE.Vector3(k.x, 0.2, k.z), 8, 0xffffff, 2.5); k.vy = 0; } }
      if (k.y < -30) { FP.Stage.scene.remove(k.mesh); crates.splice(crates.indexOf(k), 1); continue; }
      for (const c of chars) {
        if (!c.alive || c.ko > 0) continue;
        const p = c.parts.torso.position;
        if (Math.hypot(p.x - k.x, p.z - k.z) < 0.95 && Math.abs(p.y - k.y) < 1.4) { givePower(c, k.kind); FP.Stage.scene.remove(k.mesh); crates.splice(crates.indexOf(k), 1); break; }
      }
    }
    for (const c of chars) if (c.power) { c.power.t -= dt; if (c.power.t <= 0 || !c.alive) endPower(c); }
    visual();
    // tiles start falling after a while, faster and faster
    if (time > nextFall) {
      const solid = tiles.filter((t) => t.state === 'solid');
      if (solid.length > 6) {
        // pick one of the outer tiles (with a bit of randomness)
        solid.sort((a, b) => b.dist + Math.random() * 3 - (a.dist + Math.random() * 3));
        const t = solid[0];
        t.state = 'shaking'; t.timer = 1.2;
        t.mesh.material.color.setHex(0xff8f70);
      }
      nextFall = time + Math.max(0.5, 2.6 - time * 0.03);
    }
    for (const t of tiles) {
      if (t.state === 'shaking') {
        t.timer -= dt;
        const s = 0.06;
        t.body.position.set(t.x + (Math.random() - 0.5) * s, -0.5 + (Math.random() - 0.5) * s, t.z + (Math.random() - 0.5) * s);
        if (t.timer <= 0) { t.state = 'falling'; t.vy = 0; FP.Audio.play('whoosh'); }
      } else if (t.state === 'falling') {
        t.vy -= 20 * dt;
        t.body.velocity.set(0, t.vy, 0);
        t.body.position.y += t.vy * dt;
        if (t.body.position.y < -40) { t.state = 'gone'; t.body.velocity.set(0, 0, 0); FP.Physics.world.removeBody(t.body); t.mesh.visible = false; }
      }
    }
    // anyone who fell is OUT
    for (const c of chars) {
      if (c.alive && c.parts.torso.position.y < -5) game.eliminate(c);
    }
    for (const b of balls) if (b.body.position.y < -30) { b.body.position.set(0, 4, 0); b.body.velocity.set(0, 0, 0); }
    // last one standing wins (or the last team, in team games)
    return FP.Kit.lastStanding(chars);
  }

  // crates spin and bob (also for friends online)
  function visual() {
    const t = performance.now() / 1000;
    for (const k of crates) { k.mesh.position.set(k.x, k.y + (k.vy === 0 ? Math.sin(t * 3 + k.spin) * 0.08 : 0), k.z); k.mesh.rotation.y = t * 1.5 + k.spin; }
  }

  // bots grab a crate when one is close and they don't have a power yet
  function botThink(c, chars, dt, input, tools) {
    if (c.power || !crates.length) return false;
    const p = c.parts.torso.position;
    const k = crates.filter((q) => q.vy === 0 && q.y > 0).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (!k || Math.hypot(k.x - p.x, k.z - p.z) > 5) return false;
    tools.steer(c, k.x, k.z, input);
    tools.unstick(input);
    return true;
  }

  function hud() {
    const tip = hazard ? { wind: 'Windy! Watch out for gusts', hand: 'Watch out for the Giant Hand!', quake: 'Earthquakes!' }[hazard] + ' &nbsp; ' : '';
    return tip + (time < nextFall && time < 12 ? `Tiles fall in ${Math.ceil(12 - time)}... Grab the ? crates for powers!` : '');
  }

  return {
    id: 'arena', name: 'Knockout Arena', roundsToWin: 3, song: 'party', minZoom: 15, minTotal: 2,
    art: '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><circle cx="22" cy="18" r="9" fill="#fff"/><circle cx="32" cy="16" r="7" fill="#fff"/><path d="M14 52l20-14h52l20 14-20 12H34z" fill="#fff1b8" stroke="#2a2140" stroke-width="2.5" stroke-linejoin="round"/><path d="M34 38l6 26M60 38v26M86 38l-6 26M24 45h72M22 57h76" stroke="#2a2140" stroke-width="1.5" opacity=".35"/><path d="M34 64v8h52v-8" fill="#ffd6e7" stroke="#2a2140" stroke-width="2.5"/><ellipse cx="50" cy="36" rx="7" ry="9" fill="#ff5a5f" stroke="#2a2140" stroke-width="2.5"/><circle cx="50" cy="24" r="6" fill="#ff5a5f" stroke="#2a2140" stroke-width="2.5"/><ellipse cx="98" cy="66" rx="6" ry="8" fill="#4aa8ff" stroke="#2a2140" stroke-width="2.5" transform="rotate(40 98 66)"/><circle cx="106" cy="60" r="5" fill="#4aa8ff" stroke="#2a2140" stroke-width="2.5"/></svg>',
    desc: 'Punch, grab and throw everyone off the platform. Last one standing wins!',
    build, spawn, update, hud, botThink, visual,
    netState: () => crates.map((k) => [Math.round(k.x * 10) / 10, Math.round(k.z * 10) / 10, Math.round(k.y * 10) / 10]),
    applyNetState: (s) => {
      if (!Array.isArray(s)) return;
      while (crates.length < s.length) crates.push({ x: 0, z: 0, y: 0, vy: 0, mesh: crateMesh(), spin: Math.random() * 6, tile: { state: 'solid' } });
      while (crates.length > s.length) FP.Stage.scene.remove(crates.pop().mesh);
      s.forEach((v, i) => { crates[i].x = v[0]; crates[i].z = v[1]; crates[i].y = v[2]; crates[i].vy = 0; });
    },
  };
})();
