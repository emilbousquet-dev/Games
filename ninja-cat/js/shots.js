// ============================================================
//  NINJA CAT — THINGS THAT FLY
//  Shuriken (yours), fish bones (rats) and fireworks rockets (the boss).
// ============================================================
window.NC = window.NC || {};

NC.Shots = (function () {
  const U = NC.U;
  let game = null, scene = null;
  const list = [];

  function init(g, sc) { game = g; scene = sc; clear(); }

  function add(o) {
    const s = Object.assign({ t: 0, dead: false }, o);
    if (s.type === 'star') s.mesh = NC.Models.shuriken();
    else if (s.type === 'bone') s.mesh = NC.Models.boneModel();
    else if (s.type === 'rocket') {
      s.mesh = NC.Models.rocket();
      s.warn = NC.FX.warn(s.tx, s.ty, s.tz, 2.3, s.flight + 0.1);
      s.sx = s.x; s.sy = s.y; s.sz = s.z;
    }
    s.mesh.position.set(s.x, s.y, s.z);
    scene.add(s.mesh);
    list.push(s);
    return s;
  }

  function kill(s) {
    if (s.dead) return;
    s.dead = true;
    scene.remove(s.mesh);
    if (s.warn) s.warn.dead = true;
  }

  function update(dt) {
    const W = game.world;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
      if (s.dead) { list.splice(i, 1); continue; }
      s.t += dt;
      if (s.type === 'rocket') {
        // flies in a big arc and lands on the red circle
        const k = Math.min(1, s.t / s.flight);
        const nx = U.lerp(s.sx, s.tx, k), nz = U.lerp(s.sz, s.tz, k), ny = U.lerp(s.sy, s.ty, k) + Math.sin(k * Math.PI) * s.arc;
        s.mesh.lookAt(nx, ny, nz);
        s.mesh.position.set(nx, ny, nz);
        if (Math.random() < 0.7) NC.FX.puff(nx, ny, nz, { n: 1, size: 0.6, life: 0.6, speed: 0.3, up: 0.2, color: 0x908080, alpha: 0.6 });
        if (k >= 1) {
          NC.FX.boom(s.tx, s.ty + 0.3, s.tz, 2.2);
          NC.Audio.play('boom', { x: s.tx, z: s.tz, vol: 0.8 });
          for (const p of game.players) {
            if (p.alive && Math.hypot(p.pos.x - s.tx, p.pos.z - s.tz) < 2.4 && Math.abs(p.pos.y - s.ty) < 2) p.hurt(1, { x: s.tx, z: s.tz });
          }
          for (const p of game.players) if (p.alive && U.dist(p.pos.x, p.pos.z, s.tx, s.tz) < 12) game.shake(p, 0.25);
          kill(s);
        }
        continue;
      }
      if (s.t > s.life) { kill(s); continue; }
      if (s.type === 'bone') s.vy -= 6 * dt;
      // move in small steps so it can't fly through thin things
      const n = 3;
      let hit = false;
      for (let k = 0; k < n && !hit; k++) {
        s.x += (s.vx * dt) / n; s.y += (s.vy * dt) / n; s.z += (s.vz * dt) / n;
        const b = W.solidAt(s.x, s.y, s.z);
        if (b && b.kind !== 'edge') {
          hit = true;
          NC.FX.burst(s.x, s.y, s.z, { n: 6, color: 0xffe0a0, speed: 3, size: 0.15 });
          NC.Audio.play(s.type === 'star' ? 'starHit' : 'land', { x: s.x, z: s.z, vol: 0.5 });
        }
        if (s.type === 'star') {
          const e = game.enemyAt(s.x, s.y, s.z, 0.45);
          if (e) { e.damage(s.dmg, s.owner, 'star', { x: s.x - s.vx, z: s.z - s.vz }); hit = true; NC.Audio.play('starHit', { x: s.x, z: s.z }); }
          if (game.items.hitPotsAt(s.x, s.y, s.z, 0.6, s.owner)) hit = true;
        } else {
          for (const p of game.players) {
            if (!p.alive) continue;
            if (Math.hypot(p.pos.x - s.x, p.pos.y + 0.55 - s.y, p.pos.z - s.z) < 0.6) { p.hurt(1, { x: s.x - s.vx, z: s.z - s.vz }); hit = true; break; }
          }
        }
      }
      s.mesh.position.set(s.x, s.y, s.z);
      if (s.type === 'star') { s.mesh.rotation.y += dt * 30; s.mesh.rotation.x = Math.PI / 2; }
      else { s.mesh.rotation.z += dt * 12; s.mesh.rotation.y += dt * 5; }
      if (hit) kill(s);
    }
  }

  // a sword slash can knock bones out of the air
  function cutArea(x, y, z, r) {
    let n = 0;
    for (const s of list) {
      if (s.dead || s.type !== 'bone') continue;
      if (Math.hypot(s.x - x, s.y - y, s.z - z) < r) { NC.FX.burst(s.x, s.y, s.z, { n: 8, color: 0xffffff, speed: 4 }); kill(s); n++; }
    }
    return n;
  }

  function clear() {
    for (const s of list) { if (scene) scene.remove(s.mesh); if (s.warn) s.warn.dead = true; }
    list.length = 0;
  }

  return { init, add, update, cutArea, clear, list };
})();
