// ============================================================
//  FLOPPY PARTY — PAINT PARTY
//  Walk around to paint the floor in your color. Jump and land
//  to make a big SPLAT. Whoever has painted the most floor
//  after 60 seconds wins!
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.paint = (function () {
  const TIME = 60, NX = 15, NZ = 11, T = 1.1, BLANK = 0xf4efe6;
  let owner = [], inst = null, time = 0, air = new Map(), dirty = true, self = null;
  const color = new THREE.Color();

  function build() {
    owner = new Array(NX * NZ).fill(0); time = 0; air = new Map(); dirty = true; respawn.clear();
    const S = FP.Stage;
    S.island(0, -1, 0, NX * T + 1, 2, NZ * T + 1, { grass: 0xe8e0d0, dirt: 0xc98b58 });
    // the paintable floor: one "instanced" mesh with a tile for every square (fast to draw)
    const geo = new THREE.BoxGeometry(T - 0.06, 0.05, T - 0.06);
    inst = new THREE.InstancedMesh(geo, new THREE.MeshToonMaterial({ color: 0xffffff, gradientMap: FP.Look.toon(0xffffff).gradientMap }), NX * NZ);
    inst.receiveShadow = true;
    const m = new THREE.Matrix4();
    for (let i = 0; i < NX * NZ; i++) {
      const { x, z } = center(i);
      m.makeTranslation(x, 0.03, z);
      inst.setMatrixAt(i, m);
      inst.setColorAt(i, color.setHex(BLANK));
    }
    S.add(inst);
    // paint buckets in the corners, for fun
    for (const [x, z, col] of [[-9.2, -6.6, 0xff5a5f], [9.2, -6.6, 0x4aa8ff], [-9.2, 6.6, 0xffcf33], [9.2, 6.6, 0x5cc44a]]) {
      const g = new THREE.Group();
      const can = FP.Look.mesh(new THREE.CylinderGeometry(0.45, 0.38, 0.7, 14), FP.Look.toon(0xdddddd), 0.03);
      const top = FP.Look.mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 14), FP.Look.toon(col), 0);
      top.position.y = 0.34;
      g.add(can, top);
      g.position.set(x, 0.35, z);
      S.add(g);
    }
    FP.Camera.setAngle(0.9, 0.7);
  }

  function center(i) { const ix = i % NX, iz = Math.floor(i / NX); return { x: (ix - (NX - 1) / 2) * T, z: (iz - (NZ - 1) / 2) * T }; }
  function tileAt(x, z) {
    const ix = Math.round(x / T + (NX - 1) / 2), iz = Math.round(z / T + (NZ - 1) / 2);
    return ix >= 0 && ix < NX && iz >= 0 && iz < NZ ? iz * NX + ix : -1;
  }

  function paintTile(i, c) {
    const v = c.colorIndex + 1;
    if (i < 0 || owner[i] === v) return;
    owner[i] = v; dirty = true;
  }

  function redraw() {
    if (!dirty || !inst) return;
    dirty = false;
    for (let i = 0; i < owner.length; i++) inst.setColorAt(i, color.setHex(owner[i] ? FP.Look.COLORS[owner[i] - 1].body : BLANK));
    inst.instanceColor.needsUpdate = true;
  }

  const respawn = FP.Kit.respawner(() => ({ x: (Math.random() - 0.5) * 8, z: (Math.random() - 0.5) * 5 }));

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const c of chars) {
        if (!c.alive || c.ko > 0) continue;
        const p = c.parts.torso.position;
        const was = air.get(c) || 0;
        air.set(c, c.airTime);
        if (!c.grounded) continue;
        paintTile(tileAt(p.x, p.z), c);
        // SPLAT: landing from a jump paints all around you
        if (was > 0.45) {
          for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) paintTile(tileAt(p.x + dx * T, p.z + dz * T), c);
          FP.FX.puffs(new THREE.Vector3(p.x, 0.2, p.z), 10, c.color.body, 3, 1);
          FP.Audio.play('splash');
        }
      }
      // score = how many tiles you own
      const count = {};
      for (const v of owner) if (v) count[v] = (count[v] || 0) + 1;
      for (const c of chars) game.scores[c.player.id] = count[c.colorIndex + 1] || 0;
      respawn.update(chars, dt, -6);
    }
    redraw();
    if (roundOver || dt === 0) return null;
    if (time >= TIME) {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `${w[0].name} painted the most!` : 'It\'s a tie!' };
    }
    return null;
  }

  // bot brain: head for a patch of floor that isn't mine yet. Jump now and then for a big splat
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain, p = c.parts.torso.position, me = c.colorIndex + 1;
    b.tileT = (b.tileT || 0) - dt;
    if (b.tile === undefined || b.tileT <= 0 || owner[b.tile] === me) {
      let best = -1, bs = -Infinity;
      for (let k = 0; k < 24; k++) {
        const i = Math.floor(Math.random() * owner.length);
        const q = center(i);
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        let s = -d * 0.5 + (owner[i] !== me ? 3 : 0) + (owner[i] && owner[i] !== me ? 1 : 0);
        for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const j = tileAt(q.x + ox * T, q.z + oz * T); if (j >= 0 && owner[j] !== me) s += 0.4; }
        if (s > bs) { bs = s; best = i; }
      }
      b.tile = best; b.tileT = 1.2;
    }
    const q = center(b.tile);
    tools.steer(c, q.x, q.z, input);
    if (c.grounded && Math.random() < dt * 0.5) input.jumpPressed = true;
    // push anyone who gets in the way
    for (const o of chars) if (o !== c && o.alive && o.parts.torso.position.distanceTo(p) < 1.2 && Math.random() < dt * 2) input.punchPressed = true;
    tools.unstick(input);
    return true;
  }

  function hud() { return `Paint the floor! Jump for a big splat &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><path d="M12 50l48-16 48 16-48 18z" fill="#f4efe6" stroke="#2a2140" stroke-width="2"/><path d="M24 50l20-7 18 6-20 8z" fill="#ff5a5f"/><path d="M62 49l20-6 14 5-20 7z" fill="#4aa8ff"/><path d="M50 60l16-5 14 5-16 6z" fill="#ffcf33"/><circle cx="46" cy="34" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><ellipse cx="46" cy="43" rx="5" ry="6" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><g fill="#4aa8ff"><circle cx="84" cy="30" r="3"/><circle cx="92" cy="26" r="2"/><circle cx="78" cy="24" r="2"/></g></svg>';

  self = {
    id: 'paint', name: 'Paint Party', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 3, song: 'chill', minZoom: 16, art: ART,
    desc: 'Walk around to paint the floor in your color. Jump for a big splat! Most paint wins.',
    build, spawn: (i, n) => FP.Kit.ring(i, n, 4, 3, 0.8), update, botThink, hud,
    scoreLabel: (s) => `${s}`,
    netState: () => owner.map((v) => v.toString(36)).join(''),
    applyNetState: (s) => { for (let i = 0; i < owner.length; i++) { const v = parseInt(s[i], 36) || 0; if (owner[i] !== v) { owner[i] = v; dirty = true; } } redraw(); },
  };
  return self;
})();
