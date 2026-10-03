// ============================================================
//  NINJA CAT — THINGS IN THE LEVEL
//  Golden fish, bells, rice balls, scrolls, smoke bombs, pots,
//  checkpoint lanterns, hint signs, spike traps, searchlights
//  and the red gate at the end.
// ============================================================
window.NC = window.NC || {};

NC.Items = (function () {
  const U = NC.U;
  let game = null, scene = null, W = null;
  const pickups = [], pots = [];
  let spikes = [], lights = [], signs = [], lanterns = [], goal = null, golden = null;
  const counts = { fishTotal: 0, bells: 0 };

  const MAKERS = { f: () => NC.Models.fishCoin(), o: () => NC.Models.onigiri(), s: () => NC.Models.scroll(), m: () => NC.Models.smokePouch(), q: () => NC.Models.bell() };

  function init(g, sc) { game = g; scene = sc; clear(); }

  function spawn(world) {
    W = world;
    const S = world.spawns;
    counts.fishTotal = 0; counts.bells = 0;
    for (const it of S.items) {
      addPickup(it.type, it.x, it.y + 0.9, it.z);
      if (it.type === 'f') counts.fishTotal++;
      if (it.type === 'q') counts.bells++;
    }
    for (const p of S.pots) {
      const m = NC.Models.pot();
      m.position.set(p.x, p.y, p.z);
      scene.add(m);
      pots.push({ x: p.x, y: p.y, z: p.z, mesh: m, broken: false });
      counts.fishTotal += 3;
    }
    spikes = S.spikes.map((s) => Object.assign({ up: false, hit: new Set() }, s));
    lanterns = S.lanterns;
    signs = S.signs;
    goal = S.goal;
    lights = S.searchlights.map((s) => {
      const beam = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      const spot = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      spot.rotation.x = -Math.PI / 2;
      scene.add(beam); scene.add(spot);
      return Object.assign({ beam, spot, alarmT: 0, sx: s.x, sy: s.y, sz: s.z }, s);
    });
    // a magic wall in the gate while the boss is still around
    if (goal && world.spawns.enemies.some((e) => e.type === 'K')) {
      goal.locked = true;
      goal.barrier = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.6), new THREE.MeshBasicMaterial({ color: 0xa040ff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      goal.barrier.position.set(goal.x, goal.y + 1.8, goal.z);
      goal.barrier.rotation.y = Math.PI / 2;
      scene.add(goal.barrier);
    }
  }

  function addPickup(type, x, y, z, vel) {
    const m = MAKERS[type] ? MAKERS[type]() : NC.Models.goldenFish();
    m.position.set(x, y, z);
    scene.add(m);
    const p = { type, mesh: m, x, y, z, baseY: y, t: Math.random() * 6, taken: false, vel: vel || null, wait: vel ? 0.4 : 0 };
    pickups.push(p);
    return p;
  }

  // fish that pop out of enemies and pots
  function drop(x, y, z, type, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 2;
      addPickup(type, x, y, z, { x: Math.cos(a) * s, y: 6 + Math.random() * 3, z: Math.sin(a) * s });
    }
  }

  function breakPot(pot, by) {
    pot.broken = true;
    scene.remove(pot.mesh);
    NC.Audio.play('potBreak', { x: pot.x, z: pot.z });
    NC.FX.burst(pot.x, pot.y + 0.4, pot.z, { n: 18, color: [0x3a60c0, 0xffffff], speed: 5, size: 0.22 });
    drop(pot.x, pot.y + 0.5, pot.z, 'f', 3);
    if (Math.random() < 0.25) drop(pot.x, pot.y + 0.5, pot.z, U.pick(['s', 'o', 'm']), 1);
  }
  function hitPots(a) {
    let n = 0;
    for (const p of pots) {
      if (p.broken) continue;
      const dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz);
      if (d > a.r + 0.4 || Math.abs(p.y + 0.4 - a.y) > 1.6) continue;
      if (a.arc < Math.PI * 2 && d > 0.7 && Math.abs(U.angleDiff(a.yaw, Math.atan2(dx, dz))) > a.arc / 2) continue;
      breakPot(p, a.by); n++;
    }
    return n;
  }
  function hitPotsAt(x, y, z, r, by) {
    for (const p of pots) if (!p.broken && Math.hypot(p.x - x, p.y + 0.4 - y, p.z - z) < r + 0.4) { breakPot(p, by); return true; }
    return false;
  }

  // is there a spike trap here? (enemies stay away from them)
  function spikeAt(x, z, y) {
    for (const s of spikes) if (Math.abs(x - s.x) < 1.5 && Math.abs(z - s.z) < 1.5 && Math.abs(y - s.y) < 0.5) return s;
    return null;
  }

  function collect(p, pl) {
    const g = game;
    switch (p.type) {
      case 'f': g.addFish(pl, 1); NC.Audio.play('coin', { vol: 0.7 }); break;
      case 'o': if (!pl.heal(1)) return false; NC.Audio.play('heal'); g.message(pl, '+1 ❤'); break;
      case 's': if (pl.stars >= pl.starMax) return false; pl.stars = Math.min(pl.starMax, pl.stars + 5); NC.Audio.play('pickup'); g.message(pl, '+5 SHURIKEN'); break;
      case 'm': if (pl.smokes >= 5) return false; pl.smokes++; NC.Audio.play('pickup'); g.message(pl, '+1 SMOKE BOMB'); break;
      case 'q': g.bellFound(pl); NC.Audio.play('bell'); break;
      case 'G': g.win(pl); break;
    }
    p.taken = true;
    scene.remove(p.mesh);
    NC.FX.burst(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z, { n: p.type === 'q' ? 30 : 8, color: p.type === 'q' ? [0xffe060, 0xffffff] : [0xffd040, 0xffffff], speed: 3, size: 0.2, gravity: 0 });
    return true;
  }

  function update(dt, t) {
    const players = game.players;
    // ----- pickups -----
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      if (p.taken) { pickups.splice(i, 1); continue; }
      p.t += dt;
      const m = p.mesh;
      if (p.vel) {
        // flying out and bouncing
        p.vel.y -= 22 * dt;
        p.x += p.vel.x * dt; p.z += p.vel.z * dt; p.y += p.vel.y * dt;
        if (W.solidAt(p.x, p.y, p.z)) { p.x -= p.vel.x * dt; p.z -= p.vel.z * dt; p.vel.x = p.vel.z = 0; }
        const f = W.floorAt(p.x, p.z, p.y + 0.5);
        if (p.vel.y < 0 && p.y < f + 0.5) { p.y = f + 0.5; p.vel = null; p.baseY = p.y; }
        if (p.y < -20) { p.taken = true; scene.remove(m); continue; }
        p.wait -= dt;
      } else {
        p.y = p.baseY + Math.sin(p.t * 3) * 0.12;
      }
      m.position.set(p.x, p.y, p.z);
      m.rotation.y = p.type === 'G' ? p.t : p.t * 2.5;
      if (p.wait > 0) continue;
      for (const pl of players) {
        if (!pl.alive) continue;
        const dx = pl.pos.x - p.x, dy = pl.pos.y + 0.5 - p.y, dz = pl.pos.z - p.z, d = Math.hypot(dx, dy, dz);
        // fish fly to you when you're close
        if (p.type === 'f' && d < 2.6 && d > 0.3 && !p.vel) {
          const k = Math.min(1, dt * 10);
          p.x += dx * k; p.baseY += dy * k; p.z += dz * k;
        }
        if (d < (p.type === 'G' ? 2.2 : 1.0)) { if (collect(p, pl)) break; }
      }
    }
    // ----- checkpoint lanterns -----
    for (const l of lanterns) {
      if (l.lit) continue;
      for (const pl of players) {
        if (pl.alive && U.dist(pl.pos.x, pl.pos.z, l.x, l.z) < 2 && Math.abs(pl.pos.y - l.y) < 2) {
          l.lit = true;
          NC.Models.setLanternLit(l.mesh, true);
          game.setCheckpoint({ x: l.x + 1, y: l.y, z: l.z });
          NC.Audio.play('checkpoint');
          NC.FX.burst(l.x, l.y + 1.1, l.z, { n: 25, color: [0xffd060, 0xffffff], speed: 4 });
          game.message(null, 'CHECKPOINT!');
          for (const q of players) if (q.alive) q.heal(1);
          break;
        }
      }
    }
    // ----- hint signs -----
    for (const pl of players) {
      let best = null, bd = 3.4;
      for (const s of signs) {
        const d = U.dist(pl.pos.x, pl.pos.z, s.x, s.z);
        if (d < bd && Math.abs(pl.pos.y - s.y) < 3) { bd = d; best = s; }
      }
      game.hud.setHint(pl.index, best ? best.text : null);
    }
    // ----- spike traps: up for a bit, then down -----
    for (const s of spikes) {
      const c = (t + s.phase) % 3;
      const up = c > 1.8;
      const warn = c > 1.5 && !up;
      if (up && !s.up) NC.Audio.play('spike', { x: s.x, z: s.z, vol: 0.6 });
      s.up = up;
      const sp = s.mesh.userData.spikes;
      sp.position.y = U.damp(sp.position.y, up ? 0 : warn ? -0.3 + Math.sin(t * 60) * 0.03 : -0.48, up ? 30 : 10, dt);
      if (up) {
        for (const pl of players) {
          if (!pl.alive) continue;
          if (Math.abs(pl.pos.x - s.x) < 1.35 && Math.abs(pl.pos.z - s.z) < 1.35 && pl.pos.y - s.y < 0.45 && pl.pos.y - s.y > -0.3) pl.hurt(1, { x: pl.pos.x - pl.vel.x, z: pl.pos.z - pl.vel.z });
        }
      }
    }
    // ----- searchlights -----
    for (const L of lights) {
      L.a += dt * 0.55;
      L.alarmT -= dt;
      const r = 6.5;
      const tx = L.x + Math.cos(L.a) * r, tz = L.z + Math.sin(L.a) * r;
      let fy = W.floorAt(tx, tz, L.y + 4);
      if (fy < -100) fy = L.y;
      L.sx = tx; L.sy = fy; L.sz = tz;
      const hx = L.x, hy = L.y + 4.1, hz = L.z;
      const len = Math.hypot(tx - hx, fy - hy, tz - hz);
      L.beam.scale.set(1, len, 1);
      L.beam.position.set((hx + tx) / 2, (hy + fy) / 2, (hz + tz) / 2);
      L.beam.lookAt(tx, fy, tz);
      L.beam.rotateX(-Math.PI / 2);
      L.spot.position.set(tx, fy + 0.05, tz);
      L.mesh.userData.head.lookAt(tx, fy, tz);
      const alarm = L.alarmT > 0;
      const col = alarm && Math.floor(t * 8) % 2 ? 0xff3020 : 0xfff0a0;
      L.beam.material.color.setHex(col); L.spot.material.color.setHex(col);
      for (const pl of players) {
        if (!pl.visibleToEnemies) continue;
        if (U.dist(pl.pos.x, pl.pos.z, tx, tz) < 2.4 && pl.pos.y - fy < 3 && pl.pos.y - fy > -1) {
          if (L.alarmT <= 0) {
            L.alarmT = 4;
            NC.Audio.play('alarm');
            game.message(pl, 'SPOTTED! RUN!');
            game.alertNear(tx, tz, 30, pl);
            game.stats.spotted++;
          }
        }
      }
    }
    // ----- the goal gate -----
    if (goal) {
      if (goal.barrier) {
        goal.barrier.material.opacity = 0.25 + Math.sin(t * 4) * 0.1;
        if (!goal.locked) { scene.remove(goal.barrier); goal.barrier = null; }
      }
      for (const pl of players) {
        if (!pl.alive) continue;
        if (U.dist(pl.pos.x, pl.pos.z, goal.x, goal.z) < 2.2 && Math.abs(pl.pos.y - goal.y) < 3) {
          if (goal.locked) { if (!goal.toldLocked || t - goal.toldLocked > 3) { goal.toldLocked = t; game.message(pl, 'BEAT THE BIG BULLDOG FIRST!'); NC.Audio.play('nope'); } }
          else { game.levelComplete(pl); break; }
        }
      }
    }
  }

  function unlockGoal() { if (goal) goal.locked = false; }
  function spawnGolden(x, y, z) {
    golden = addPickup('G', x, y + 1.5, z);
    NC.FX.firework(x, y + 3, z, true);
  }

  function clear() {
    for (const p of pickups) scene && scene.remove(p.mesh);
    for (const p of pots) scene && scene.remove(p.mesh);
    for (const L of lights) { scene && scene.remove(L.beam); scene && scene.remove(L.spot); }
    if (goal && goal.barrier && scene) scene.remove(goal.barrier);
    pickups.length = 0; pots.length = 0;
    spikes = []; lights = []; signs = []; lanterns = []; goal = null; golden = null;
  }

  return { init, spawn, update, drop, hitPots, hitPotsAt, spikeAt, unlockGoal, spawnGolden, clear, counts };
})();
