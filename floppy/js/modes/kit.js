// ============================================================
//  FLOPPY PARTY — MINI-GAME TOOLKIT
//  Little helpers that many mini-games share, so each game
//  file can stay short (and has fewer places for bugs).
// ============================================================
window.FP = window.FP || {};

FP.Kit = (function () {
  // "1:05" style clock
  function clock(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // anyone below this height is out of the round
  function fallOut(chars, game, belowY = -5, how = 'fell off!') {
    for (const c of chars) if (c.alive && c.parts.torso.position.y < belowY) game.eliminate(c, how);
  }

  // last one standing wins (or nobody, if everyone is out)
  function lastStanding(chars) {
    const alive = chars.filter((c) => c.alive);
    if (chars.length > 1 && alive.length <= 1) return { winners: alive };
    if (chars.length === 1 && alive.length === 0) return { winners: [] };
    return null;
  }

  // whoever has the most points (ties: everyone with the top score)
  function mostPoints(chars, scores) {
    let best = -Infinity;
    for (const c of chars) best = Math.max(best, scores[c.player.id] || 0);
    const top = chars.filter((c) => (scores[c.player.id] || 0) === best);
    return top.length === chars.length && chars.length > 1 ? [] : top;
  }

  // players who fall come back after a short wait (for games where falling isn't "out")
  function respawner(where) {
    const waiting = new Map();
    return {
      update(chars, dt, belowY = -6) {
        for (const c of chars) {
          if (c.parts.torso.position.y < belowY && !waiting.has(c)) { waiting.set(c, 1.4); FP.Audio.play('fall'); }
        }
        for (const [c, t] of waiting) {
          if (t - dt > 0) { waiting.set(c, t - dt); continue; }
          waiting.delete(c);
          const s = where(c);
          FP.Ragdoll.teleport(c, s.x, s.y || 0.3, s.z, s.yaw !== undefined ? s.yaw : c.yaw);
          FP.FX.puffs(c.parts.torso.position, 10, 0xffffff, 3);
        }
      },
      waiting: (c) => waiting.has(c),
      clear: () => waiting.clear(),
    };
  }

  // the closest thing in a list to a character (things have x and z)
  function nearest(c, list, filter = () => true) {
    const p = c.parts.torso.position;
    let best = null, bd = Infinity;
    for (const o of list) {
      if (!filter(o)) continue;
      const d = Math.hypot(o.x - p.x, o.z - p.z);
      if (d < bd) { bd = d; best = o; }
    }
    return best ? { item: best, d: bd } : null;
  }

  // punch whoever is close (for bot brains)
  function punchNearby(c, chars, dt, input, tools, range = 1.4, rate = 3) {
    const p = c.parts.torso.position;
    for (const o of chars) {
      if (o === c || !o.alive) continue;
      if (o.parts.torso.position.distanceTo(p) < range) {
        tools.steer(c, o.parts.torso.position.x, o.parts.torso.position.z, input);
        if (Math.random() < dt * rate) input.punchPressed = true;
        return o;
      }
    }
    return null;
  }

  // spots around a circle (for spawning)
  function ring(i, n, r, rz = r, turn = 0) {
    const a = (i / n) * Math.PI * 2 + turn;
    return { x: Math.cos(a) * r, y: 0.2, z: Math.sin(a) * rz, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) };
  }

  // a round coin mesh (a flat golden cylinder with a star)
  function coinMesh(r = 0.32, color = 0xffcf33) {
    const g = new THREE.Group();
    const disc = FP.Look.mesh(new THREE.CylinderGeometry(r, r, 0.1, 20), FP.Look.toon(color), 0.03);
    disc.rotation.x = Math.PI / 2;
    const dot = FP.Look.mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.12, 5), FP.Look.toon(0xffe98a), 0);
    dot.rotation.x = Math.PI / 2;
    g.add(disc, dot);
    return g;
  }

  // a simple ball you can punch, grab and throw
  function ball(r, colors, mass = 0.6) {
    const g = new THREE.Group();
    colors.forEach((c, i) => {
      g.add(FP.Look.mesh(new THREE.SphereGeometry(r, 14, 10, (i * Math.PI * 2) / colors.length, (Math.PI * 2) / colors.length), FP.Look.toon(c), 0, true));
    });
    g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.07, 14, 10), FP.Look.outlineMat));
    const body = new CANNON.Body({ mass, material: FP.Physics.mats.ball, linearDamping: 0.15, angularDamping: 0.3,
      collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.ALL });
    body.addShape(new CANNON.Sphere(r));
    return { mesh: g, body };
  }

  // is this mini-game running right now on this computer (and not just watched online)?
  function live(m) { return !!(FP.Game && FP.Game.mode === m && FP.Game.state === 'play' && !(FP.Net && FP.Net.isClient && FP.Net.isClient())); }

  return { live, clock, fallOut, lastStanding, mostPoints, respawner, nearest, punchNearby, ring, coinMesh, ball };
})();
