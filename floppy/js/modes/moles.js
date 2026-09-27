// ============================================================
//  FLOPPY PARTY — BOP THE MOLES
//  Moles pop out of the holes. PUNCH them for points! Golden
//  moles are worth 3. But don't punch the moles holding a BOMB:
//  BOOM, you lose 2 points and get knocked out.
//  Most points after 60 seconds wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.moles = (function () {
  const TIME = 60, GRID = 4, GAP = 2.6;
  let respawn = null, holes = [], time = 0, next = 0, self = null;

  function moleMesh() {
    const g = new THREE.Group();
    const body = FP.Look.mesh(new THREE.CapsuleGeometry(0.34, 0.4, 6, 14), FP.Look.toon(0x9a6a44), 0.035);
    body.position.y = 0.45;
    const belly = FP.Look.mesh(new THREE.SphereGeometry(0.26, 12, 10), FP.Look.toon(0xe8c8a0), 0);
    belly.scale.set(1, 1.2, 0.5); belly.position.set(0, 0.45, 0.22);
    const nose = FP.Look.mesh(new THREE.SphereGeometry(0.09, 10, 8), FP.Look.toon(0xff7eb6), 0.01);
    nose.position.set(0, 0.72, 0.33);
    const ink = new THREE.MeshBasicMaterial({ color: 0x1d1a2f });
    for (const x of [-0.12, 0.12]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), ink); e.position.set(x, 0.85, 0.28); g.add(e); }
    const gold = FP.Look.mesh(new THREE.CapsuleGeometry(0.345, 0.4, 6, 14), FP.Look.toon(0xffcf33), 0.035);
    gold.position.y = 0.45; gold.visible = false;
    const bomb = FP.Look.mesh(new THREE.SphereGeometry(0.22, 14, 10), FP.Look.toon(0x2a2140), 0.02);
    bomb.position.set(0.3, 0.5, 0.25); bomb.visible = false;
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffcf33 }));
    spark.position.set(0.4, 0.76, 0.25); spark.visible = false;
    g.add(body, belly, nose, gold, bomb, spark);
    g.userData = { body, gold, bomb, spark };
    return g;
  }

  function build() {
    respawn = FP.Kit.respawner((c) => spawn(Math.max(0, FP.Game.chars.indexOf(c)), FP.Game.chars.length));
    holes = []; time = 0; next = 1;
    const S = FP.Stage;
    const size = GRID * GAP + 3;
    S.island(0, -1, 0, size, 2, size, { grass: 0x86d15f });
    for (let ix = 0; ix < GRID; ix++) for (let iz = 0; iz < GRID; iz++) {
      const x = (ix - (GRID - 1) / 2) * GAP, z = (iz - (GRID - 1) / 2) * GAP;
      const dirt = FP.Look.mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.14, 16), FP.Look.toon(0x8a6a55), 0.02);
      dirt.position.set(x, 0.05, z);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.45, 16), new THREE.MeshBasicMaterial({ color: 0x2a1c14 }));
      hole.rotation.x = -Math.PI / 2; hole.position.set(x, 0.13, z);
      const m = moleMesh(); m.position.set(x, -1, z);
      S.add(dirt, hole, m);
      holes.push({ x, z, mesh: m, up: 0, t: 0, kind: 'mole', y: -1 });
    }
    for (const [x, z] of [[-size / 2 + 0.6, -size / 2 + 0.6], [size / 2 - 0.6, size / 2 - 0.6]]) { const t = FP.Look.tree(0.9); t.position.set(x, 0, z); S.add(t); }
    FP.Camera.setAngle(0.9, 0.7);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 3.4, 3.4, Math.PI / 4); }

  function pop() {
    const free = holes.filter((h) => h.up <= 0);
    if (!free.length) return;
    const h = free[Math.floor(Math.random() * free.length)];
    const r = Math.random();
    h.kind = r < 0.12 ? 'gold' : r < 0.3 ? 'bomb' : 'mole';
    h.up = h.kind === 'gold' ? 1.0 : 1.4 + Math.random() * 0.8;
    FP.Audio.play('squeak');
  }

  function visual(dt) {
    for (const h of holes) {
      const want = h.up > 0 ? 0 : -1.1;
      h.y += (want - h.y) * Math.min(1, (dt || 0.016) * 14);
      h.mesh.position.y = h.y;
      const u = h.mesh.userData;
      u.gold.visible = h.kind === 'gold'; u.body.visible = h.kind !== 'gold';
      u.bomb.visible = u.spark.visible = h.kind === 'bomb';
      if (u.spark.visible) u.spark.scale.setScalar(0.7 + Math.random() * 0.6);
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      next -= dt;
      if (next <= 0) { pop(); if (time > 20 && Math.random() < 0.5) pop(); next = Math.max(0.35, 0.9 - time * 0.008); }
      for (const h of holes) if (h.up > 0) h.up -= dt;
      // punches that reach a mole bop it
      for (const c of chars) {
        if (c.punchT > 0.25 || c.ko > 0 || c.moleHit === c.punchT) continue;
        const fist = c.parts.arms[c.punchArm].position;
        for (const h of holes) {
          if (h.up <= 0 || h.y < -0.4) continue;
          if (Math.hypot(fist.x - h.x, fist.z - h.z) < 0.75 && fist.y < 1.6) {
            c.moleHit = c.punchT;
            h.up = 0;
            const id = c.player.id;
            const pos = new THREE.Vector3(h.x, 1.2, h.z);
            if (h.kind === 'bomb') {
              game.scores[id] = (game.scores[id] || 0) - 2;
              FP.FX.word(pos, 'BOOM! -2', '#ff5a5f', 1.4); FP.FX.puffs(pos, 16, 0xff9a3c, 4, 1.5);
              FP.Ragdoll.knockOut(c, 1.6);
              for (const b of c.bodies) b.velocity.y += 7;
              FP.Audio.play('bonk'); FP.Camera.shake(0.4);
            } else {
              const pts = h.kind === 'gold' ? 3 : 1;
              game.scores[id] = (game.scores[id] || 0) + pts;
              FP.FX.word(pos, h.kind === 'gold' ? 'GOLD! +3' : 'BOP!', '#ffcf33', h.kind === 'gold' ? 1.4 : 1);
              FP.FX.stars(pos, 5);
              FP.Audio.play(h.kind === 'gold' ? 'coin' : 'hit');
            }
            break;
          }
        }
      }
    }
    if (dt > 0 && !roundOver) respawn.update(chars, dt, -5);
    visual(dt);
    if (roundOver || dt === 0) return null;
    if (time >= TIME) {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `${w[0].name} is the mole master!` : "It's a tie!" };
    }
    return null;
  }

  // bot brain: run to the best mole that's up (gold first, never bombs) and punch it
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position;
    let best = null, bs = Infinity;
    for (const h of holes) {
      if (h.up <= 0.15 || h.kind === 'bomb') continue;
      const d = Math.hypot(h.x - p.x, h.z - p.z);
      const s = d - (h.kind === 'gold' ? 3 : 0);
      if (s < bs) { bs = s; best = h; }
    }
    if (best) {
      const d = Math.hypot(best.x - p.x, best.z - p.z);
      // stand just in front of the mole and punch
      const tx = best.x - ((best.x - p.x) / (d || 1)) * 0.75, tz = best.z - ((best.z - p.z) / (d || 1)) * 0.75;
      tools.steer(c, tx, tz, input);
      if (d < 1.15) { input.x = (best.x - p.x) * 0.3; input.z = (best.z - p.z) * 0.3; if (Math.random() < dt * 6) input.punchPressed = true; }
    } else {
      tools.steer(c, 0, 0, input);
      input.x *= 0.3; input.z *= 0.3;
    }
    return true;
  }

  function hud() { return `Punch the moles! Gold = 3, bombs = -2 &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><ellipse cx="60" cy="64" rx="52" ry="12" fill="#86d15f" stroke="#2a2140" stroke-width="2"/><g><ellipse cx="36" cy="60" rx="12" ry="4" fill="#2a1c14"/><path d="M28 60v-14a8 8 0 0 1 16 0v14z" fill="#9a6a44" stroke="#2a2140" stroke-width="2"/><circle cx="36" cy="44" r="2" fill="#ff7eb6"/></g><g><ellipse cx="84" cy="62" rx="12" ry="4" fill="#2a1c14"/><path d="M76 62v-14a8 8 0 0 1 16 0v14z" fill="#ffcf33" stroke="#2a2140" stroke-width="2"/></g><ellipse cx="60" cy="36" rx="6" ry="8" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="60" cy="24" r="5" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><path d="M44 40l-4-2M46 34l-5 0" stroke="#ff9a3c" stroke-width="2.5" stroke-linecap="round"/></svg>';

  self = {
    id: 'moles', name: 'Bop the Moles', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 3, song: 'party', minZoom: 15, art: ART,
    desc: 'Punch the moles popping out of the holes! Golden ones are worth 3. Never punch a bomb!',
    build, spawn, update, botThink, hud, visual,
    scoreLabel: (s) => `${s}`,
    netState: () => holes.map((h) => (h.up > 0 ? (h.kind === 'gold' ? 'g' : h.kind === 'bomb' ? 'b' : 'm') : '.')).join(''),
    applyNetState: (s) => { holes.forEach((h, i) => { const k = s[i]; h.up = k === '.' ? 0 : 1; if (k !== '.') h.kind = k === 'g' ? 'gold' : k === 'b' ? 'bomb' : 'mole'; }); },
  };
  return self;
})();
