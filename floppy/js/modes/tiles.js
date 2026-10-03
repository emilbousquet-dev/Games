// ============================================================
//  FLOPPY PARTY — TILE DROP
//  Two floors of tiles. Every tile you step on wobbles and
//  falls a moment later, so keep moving! Fall through both
//  floors and you're out. Last one standing wins. First to 3.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.tiles = (function () {
  const N = 8, SIZE = 1.9, GAP = 0.08, FLOORS = [0, -7];
  const COLORS = [[0xffd6e7, 0xfff1b8, 0xd4f5c4, 0xcfe8ff], [0xc9b8ff, 0xffb8d1, 0xa6e6ff, 0xb8f0c0]];
  const WOBBLE = 0.6;
  let tiles = [], byBody = new Map();

  function build() {
    tiles = []; byBody = new Map();
    const half = (N - 1) / 2;
    FLOORS.forEach((fy, f) => {
      for (let ix = 0; ix < N; ix++) {
        for (let iz = 0; iz < N; iz++) {
          // cut the corners so the floor looks round-ish
          if ((ix === 0 || ix === N - 1) && (iz === 0 || iz === N - 1)) continue;
          const x = (ix - half) * SIZE, z = (iz - half) * SIZE;
          const color = COLORS[f][(ix + iz) % 4];
          const b = FP.Stage.block(x, fy - 0.3, z, SIZE - GAP, 0.6, SIZE - GAP, color, { kinematic: true, unique: true });
          const t = { x, z, y: fy - 0.3, floor: f, body: b.body, mesh: b.mesh, color, state: 0, timer: 0, vy: 0 };
          tiles.push(t);
          byBody.set(b.body, t);
        }
      }
    });
    // pretty clouds under the bottom floor
    for (let i = 0; i < 8; i++) {
      const c = FP.Look.cloud(1.3);
      const a = (i / 8) * Math.PI * 2;
      c.position.set(Math.cos(a) * 11, -12 + Math.sin(i) * 1.5, Math.sin(a) * 11);
      FP.Stage.add(c);
    }
    FP.Camera.setAngle(0.72, 0.8);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 3.6, 3.6, Math.PI / 4); }

  // tile states: 0 solid, 1 wobbling, 2 falling, 3 gone
  function step(t, dt) {
    if (t.state === 1) {
      t.timer -= dt;
      const s = 0.05;
      t.body.position.set(t.x + (Math.random() - 0.5) * s, t.y - (1 - t.timer / WOBBLE) * 0.12, t.z + (Math.random() - 0.5) * s);
      if (t.timer <= 0) { t.state = 2; t.vy = 0; }
    } else if (t.state === 2) {
      t.vy -= 22 * dt;
      t.body.velocity.set(0, t.vy, 0);
      t.body.position.y += t.vy * dt;
      if (t.body.position.y < t.y - 30) {
        t.state = 3;
        t.body.velocity.set(0, 0, 0);
        t.body.position.set(t.x, -200, t.z); // parked far away (it stays in the list, so online play stays in sync)
      }
    }
  }

  function paint() {
    for (const t of tiles) {
      if (t.state === 1) t.mesh.material.color.setHex(0xff8f70);
      else if (t.state === 0) t.mesh.material.color.setHex(t.color);
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      // tiles under standing players start to wobble
      for (const c of chars) {
        if (!c.alive || !c.grounded) continue;
        const t = byBody.get(c.groundBody);
        if (t && t.state === 0) { t.state = 1; t.timer = WOBBLE; FP.Audio.play('whoosh'); }
      }
    }
    for (const t of tiles) step(t, dt);
    paint();
    if (roundOver || dt === 0) return null;
    FP.Kit.fallOut(chars, game, FLOORS[1] - 6, 'fell through!');
    return FP.Kit.lastStanding(chars);
  }

  // bot brain: never stand still. Pick a solid tile nearby (on my floor) and walk there
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain, p = c.parts.torso.position;
    const floor = p.y > FLOORS[1] + 2 ? 0 : 1;
    b.tileT = (b.tileT || 0) - dt;
    const here = byBody.get(c.groundBody);
    if (!b.tile || b.tile.state !== 0 || b.tileT <= 0 || (here === b.tile)) {
      let best = null, bs = -Infinity;
      for (const t of tiles) {
        if (t.state !== 0 || t.floor !== floor) continue;
        const d = Math.hypot(t.x - p.x, t.z - p.z);
        if (d < 1.2 || d > 6) continue;
        // solid neighbors are good (less chance to fall), other players close by are bad
        let s = -Math.abs(d - 2.5) + Math.random() * 1.5;
        for (const o of tiles) if (o.floor === floor && o.state === 0 && Math.abs(o.x - t.x) < SIZE * 1.1 && Math.abs(o.z - t.z) < SIZE * 1.1) s += 0.3;
        for (const o of chars) if (o !== c && o.alive && o.parts.torso.position.distanceTo(new CANNON.Vec3(t.x, p.y, t.z)) < 1.5) s -= 1.5;
        if (s > bs) { bs = s; best = t; }
      }
      b.tile = best;
      b.tileT = 1.5;
    }
    if (b.tile) {
      const dx = b.tile.x - p.x, dz = b.tile.z - p.z, d = Math.hypot(dx, dz) || 1;
      input.x = dx / d; input.z = dz / d;
      // a hole in the way? jump over it
      const y = p.y - FP.Ragdoll.STAND;
      if (c.grounded && !FP.Bots.floorAt(p.x + (dx / d) * 1.1, p.z + (dz / d) * 1.1, y) && d > 1.3) input.jumpPressed = true;
    } else {
      tools.steer(c, 0, 0, input);
    }
    // sometimes bump into someone close (to push them onto a wobbly tile)
    for (const o of chars) if (o !== c && o.alive && o.parts.torso.position.distanceTo(p) < 1.2 && Math.random() < dt * 2) input.punchPressed = true;
    if (c.grabbedBy && Math.random() < dt * 6) input.jumpPressed = true;
    return true;
  }

  function hud() {
    const left = tiles.filter((t) => t.state === 0 && t.floor === 0).length;
    return `Keep moving! Tiles left on top: ${left}`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><g stroke="#2a2140" stroke-width="2"><path d="M20 30l40-14 40 14-40 14z" fill="#fff1b8"/><path d="M40 23l40 14M60 16l0 0M80 23l-40 14M30 26l40 14M90 26l-40 14" opacity=".35"/><path d="M24 58l36-12 36 12-36 12z" fill="#c9b8ff"/></g><rect x="66" y="40" width="12" height="6" fill="#ff8f70" stroke="#2a2140" stroke-width="2" transform="rotate(20 72 43)"/><ellipse cx="52" cy="22" rx="5" ry="6" fill="#5cc44a" stroke="#2a2140" stroke-width="2"/><circle cx="52" cy="13" r="4" fill="#5cc44a" stroke="#2a2140" stroke-width="2"/><path d="M72 50v8M68 54l4 4 4-4" stroke="#2a2140" stroke-width="2" fill="none"/></svg>';

  return {
    id: 'tiles', name: 'Tile Drop', roundsToWin: 3, minTotal: 2, removeOut: 1.5, song: 'tense', minZoom: 16, art: ART,
    desc: 'Every tile you step on falls! Two floors. Keep moving and be the last one up.',
    build, spawn, update, botThink, hud,
    focusMinY: () => FLOORS[1] - 4,
    netState: () => tiles.map((t) => t.state).join(''),
    applyNetState: (s) => { tiles.forEach((t, i) => { t.state = +s[i] || 0; }); paint(); },
  };
})();
