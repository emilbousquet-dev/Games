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
  let tiles = [], time = 0, nextFall = 0, balls = [];

  function build() {
    tiles = []; balls = []; time = 0; nextFall = 12;
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

  function update(dt, chars, game) {
    time += dt;
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
    // last one standing wins
    const alive = chars.filter((c) => c.alive);
    if (chars.length > 1 && alive.length <= 1) return { winners: alive };
    if (chars.length === 1 && alive.length === 0) return { winners: [] };
    return null;
  }

  function hud() {
    return time < nextFall && time < 12 ? `Tiles fall in ${Math.ceil(12 - time)}...` : '';
  }

  return {
    id: 'arena', name: 'Knockout Arena', icon: '🥊', roundsToWin: 3, song: 'party', minZoom: 15,
    desc: 'Punch, grab and throw everyone off the platform. Last one standing wins!',
    build, spawn, update, hud,
  };
})();
