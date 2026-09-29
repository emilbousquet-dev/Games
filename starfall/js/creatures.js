// ============================================================
//  STARFALL — CREATURES: enemies, bosses, friendly floofs,
//  arrows and flying magic balls.
//  In online games the HOST moves the enemies and tells the friend
//  where they are.
// ============================================================
window.SF = window.SF || {};

SF.Creatures = (function () {
  const U = SF.U, Ph = SF.Phys, T = SF.Terrain, Mo = SF.Models;
  let scene;
  const list = [];            // enemies and bosses
  const byId = new Map();
  const shots = [];           // enemy projectiles
  const arrows = [];
  const floofs = [];
  const camps = [];
  let nightSpawnT = 10, nightCount = 0, uid = 0;
  const isHost = () => !SF.Net.active || SF.Net.isHost;

  // ============================================================
  //  TYPES OF ENEMIES
  // ============================================================
  const TYPES = {};

  // ---------- GLOOP: a bouncy slime ----------
  TYPES.gloop = {
    hp: 2, r: 0.6, h: 1.1, shards: [1, 3],
    make(e) { const m = Mo.gloop(e.night ? 0xd060ff : U.pick([0x60ff90, 0x60e0ff, 0xffe060])); e.m = m; return m.group; },
    think(e, dt, tg) {
      e.t -= dt;
      if (e.onGround && e.t <= 0) {
        let dx, dz;
        if (tg && tg.d < 20) { dx = tg.dx / tg.d; dz = tg.dz / tg.d; e.t = U.rand(0.5, 0.9); e.st = 1; }
        else { const a = Math.random() * 7; dx = Math.cos(a); dz = Math.sin(a); e.t = U.rand(1.5, 3); e.st = 0; }
        if (dist(e.x, e.z, e.hx, e.hz) > 28 && (!tg || tg.d > 12)) { const d = dist(e.x, e.z, e.hx, e.hz); dx = (e.hx - e.x) / d; dz = (e.hz - e.z) / d; }
        e.vx = dx * (e.st ? 4.2 : 2); e.vz = dz * (e.st ? 4.2 : 2); e.vy = e.st ? 6.5 : 4.5;
        e.yaw = Math.atan2(dx, dz); e.onGround = false; e.squash = 0.6;
      }
      if (e.onGround) { e.vx *= 0.8; e.vz *= 0.8; }
      if (tg && tg.d < 1.2 + e.r && Math.abs(tg.p.y - e.y) < 1.5 && e.cd <= 0) { tg.hurt(2, e.x, e.z, 7); e.cd = 1; }
    },
    anim(e, dt, time) {
      e.squash = U.damp(e.squash || 1, 1, 8, dt);
      const s = e.onGround === false ? 1.15 : e.squash;
      e.m.body.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    },
  };

  // ---------- SPINECRAB: armored in front, hit it from behind or after it lunges ----------
  TYPES.spinecrab = {
    hp: 4, r: 0.9, h: 1.2, shards: [3, 5],
    make(e) { const m = Mo.spinecrab(); e.m = m; return m.group; },
    think(e, dt, tg) {
      e.t -= dt;
      if (e.st === 0) { // wander / chase
        if (tg && tg.d < 18) {
          e.yaw = U.dampAngle(e.yaw, Math.atan2(tg.dx, tg.dz), 4, dt);
          if (tg.d > 4.5) walk(e, Math.sin(e.yaw), Math.cos(e.yaw), 2.8, dt);
          else if (e.t <= 0) { e.st = 1; e.t = 0.7; SF.Audio.sfx('clank'); }
        } else wander(e, dt, 1.2);
      } else if (e.st === 1) { // getting ready to lunge
        if (tg) e.yaw = U.dampAngle(e.yaw, Math.atan2(tg.dx, tg.dz), 6, dt);
        if (e.t <= 0) { e.st = 2; e.t = 0.4; }
      } else if (e.st === 2) { // LUNGE!
        walk(e, Math.sin(e.yaw), Math.cos(e.yaw), 12, dt);
        if (tg && tg.d < 1.8 && e.cd <= 0) { tg.hurt(4, e.x, e.z, 10); e.cd = 1; }
        if (e.t <= 0) { e.st = 3; e.t = 1.4; }
      } else if (e.st === 3) { // tired: open for attacks!
        if (e.t <= 0) { e.st = 0; e.t = 1.2; }
      }
    },
    armor(e, fromX, fromZ) {
      if (e.st === 3) return false;
      const a = Math.atan2(fromX - e.x, fromZ - e.z);
      return Math.abs(U.angleDiff(e.yaw, a)) < 1.2;
    },
    anim(e, dt, time) {
      const m = e.m, mv = e.st === 2 ? 3 : e.moving ? 1 : 0;
      m.legs.forEach((l, i) => (l.rotation.x = Math.sin(time * (8 + mv * 6) + i * 1.3) * 0.35 * Math.min(1, mv + 0.1)));
      m.claws.forEach((c, i) => { c.rotation.x = e.st === 1 ? -0.9 : e.st === 3 ? 0.4 : Math.sin(time * 3 + i) * 0.1; });
      m.eyes.forEach((ey) => ey.material = Mo.M.glow(e.st === 1 || e.st === 2 ? 0xff3030 : e.st === 3 ? 0xffff40 : 0x40ff40));
      m.body.rotation.x = e.st === 3 ? 0.25 : 0;
      m.body.position.y = 0.5 + (e.st === 3 ? -0.2 : 0);
    },
  };

  // ---------- ZAPWING: flies and shoots lightning ----------
  TYPES.zapwing = {
    hp: 2, r: 0.8, h: 1, fly: true, shards: [2, 4],
    make(e) { const m = Mo.zapwing(); e.m = m; e.ang = Math.random() * 7; return m.group; },
    think(e, dt, tg) {
      e.t -= dt;
      const g = Ph.groundAt(e.x, e.z, e.y);
      let tx = e.hx + Math.cos(e.ang) * 8, tz = e.hz + Math.sin(e.ang) * 8, ty = Math.max(g, 1) + 6;
      e.ang += dt * 0.5;
      if (tg && tg.d < 26) {
        tx = tg.p.x + Math.cos(e.ang) * 9; tz = tg.p.z + Math.sin(e.ang) * 9; ty = tg.p.y + 5;
        e.yaw = Math.atan2(tg.dx, tg.dz);
        if (e.st === 1) { ty = tg.p.y + 1.2; tx = tg.p.x; tz = tg.p.z; } // swoop
        if (e.t <= 0) {
          if (e.st === 1) { e.st = 0; e.t = 2.4; }
          else if (Math.random() < 0.3 && tg.d < 14) { e.st = 1; e.t = 1.2; }
          else {
            e.t = U.rand(2.2, 3.2);
            const sx = e.x, sy = e.y, sz = e.z;
            const dx = tg.p.x - sx, dy = tg.p.y + 1 - sy, dz = tg.p.z - sz, d = Math.hypot(dx, dy, dz);
            shoot('bolt', sx, sy, sz, dx / d * 15, dy / d * 15, dz / d * 15, 3);
          }
        }
        if (tg.d < 1.6 && Math.abs(tg.p.y + 1 - e.y) < 1.5 && e.cd <= 0) { tg.hurt(2, e.x, e.z, 6); e.cd = 1.2; }
      } else e.yaw = e.ang + Math.PI / 2;
      const sp = e.st === 1 ? 9 : 5;
      const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz) || 1;
      e.x += dx / d * Math.min(d, sp * dt); e.z += dz / d * Math.min(d, sp * dt);
      e.y = U.damp(e.y, Math.max(ty, g + 1), 2, dt);
    },
    anim(e, dt, time) {
      e.m.wings.forEach((w, i) => (w.rotation.z = Math.sin(time * 18) * 0.6 * (i ? -1 : 1)));
      e.m.body.position.y = Math.sin(time * 3) * 0.15;
    },
  };

  // ---------- ROCK GOLEM: big and slow, weak spot on its back ----------
  TYPES.golem = {
    hp: 8, r: 1.4, h: 3.6, shards: [5, 9],
    make(e) { const m = e.lava ? Mo.golem(0x3a2a2a, 0xff6020) : Mo.golem(0x7a8098, 0x60e0ff); e.m = m; return m.group; },
    think(e, dt, tg) {
      e.t -= dt;
      if (e.st === 0) {
        if (tg && tg.d < 20) {
          e.yaw = U.dampAngle(e.yaw, Math.atan2(tg.dx, tg.dz), 2, dt);
          if (tg.d > 3.5) walk(e, Math.sin(e.yaw), Math.cos(e.yaw), 1.9, dt);
          else if (e.t <= 0) { e.st = 1; e.t = 1.0; SF.Audio.sfx('roar'); }
        } else wander(e, dt, 0.8);
      } else if (e.st === 1) { // arms up
        if (e.t <= 0) {
          e.st = 2; e.t = 1.6;
          SF.Audio.sfx('boom'); SF.FX.ring(e.x + Math.sin(e.yaw) * 2, e.y, e.z + Math.cos(e.yaw) * 2, 0xffc080, 5);
          shake(0.4, e);
          for (const p of targets()) {
            const d = dist(p.pos.x, p.pos.z, e.x + Math.sin(e.yaw) * 2, e.z + Math.cos(e.yaw) * 2);
            if (d < 4.5 && p.pos.y - Ph.groundAt(p.pos.x, p.pos.z, p.pos.y) < 0.5) p.hurt(4, e.x, e.z, 11);
          }
        }
      } else if (e.st === 2) { // stuck after the slam
        if (e.t <= 0) { e.st = 0; e.t = 1.5; }
      }
    },
    armor(e, fromX, fromZ) {
      const a = Math.atan2(fromX - e.x, fromZ - e.z);
      return Math.abs(U.angleDiff(e.yaw, a)) < 1.9; // only the back is weak
    },
    anim(e, dt, time) {
      const m = e.m;
      const up = e.st === 1 ? -2.6 : e.st === 2 ? -0.9 : Math.sin(time * 2) * 0.1;
      m.arms.forEach((a, i) => (a.rotation.x = up + (e.moving && e.st === 0 ? Math.sin(time * 4 + i * 3) * 0.4 : 0)));
      m.legs.forEach((l, i) => (l.rotation.x = e.moving ? Math.sin(time * 4 + i * 3) * 0.4 : 0));
      m.body.rotation.x = e.st === 2 ? 0.35 : 0;
      m.weak.rotation.y = time * 2;
    },
  };

  // ============================================================
  //  BOSSES
  // ============================================================
  // ---------- 1. THORNMAW: a giant hungry plant ----------
  TYPES.thornmaw = {
    hp: 12, r: 2.2, h: 8, boss: true, name: 'THORNMAW, THE HUNGRY ROOT',
    make(e) { const m = Mo.thornmaw(); e.m = m; e.d = { vine: 0, tx: 0, tz: 0, slams: 0 }; return m.group; },
    think(e, dt, tg) {
      e.t -= dt;
      const d = e.d;
      if (!tg) return;
      e.yaw = U.dampAngle(e.yaw, Math.atan2(tg.dx, tg.dz), e.st === 3 ? 0 : 1.5, dt);
      if (e.st === 0) { // choose an attack
        if (e.t <= 0) {
          if (d.slams >= 3) { e.st = 3; e.t = 5; d.slams = 0; SF.Audio.sfx('roar'); SF.HUD.toast('Its mouth is open... HIT IT!'); return; }
          if (Math.random() < 0.25 && countType('gloop') < 3) {
            e.st = 4; e.t = 1;
          } else {
            e.st = 1; e.t = 1.1 - Math.min(0.4, (1 - e.hp / e.maxHp) * 0.5);
            d.vine = Math.floor(Math.random() * 4); d.tx = tg.p.x; d.tz = tg.p.z;
            SF.FX.ring(d.tx, e.y, d.tz, 0xff4040, 2.5, e.t);
          }
        }
      } else if (e.st === 1) { // vine goes up...
        if (e.t <= 0) {
          e.st = 2; e.t = 1.0; d.slams++;
          SF.Audio.sfx('boom'); shake(0.35, e); SF.FX.ring(d.tx, e.y, d.tz, 0x80ff80, 4);
          for (const p of targets()) if (dist(p.pos.x, p.pos.z, d.tx, d.tz) < 2.8 && p.pos.y - e.y < 1.2) p.hurt(4, d.tx, d.tz, 10);
        }
      } else if (e.st === 2) { // vine stuck in the ground
        if (e.t <= 0) { e.st = 0; e.t = 0.8; }
      } else if (e.st === 3) { // STUNNED: head down, mouth open
        if (e.t <= 0) { e.st = 0; e.t = 1.5; }
      } else if (e.st === 4) { // spit out gloops
        if (e.t <= 0) {
          for (let i = 0; i < 2; i++) {
            const a = Math.random() * 7;
            const g = spawn('gloop', e.x + Math.cos(a) * 5, e.z + Math.sin(a) * 5, { hx: e.x, hz: e.z });
            g.vy = 8;
          }
          SF.Audio.sfx('pop');
          e.st = 0; e.t = 2;
        }
      }
    },
    armor(e) { return e.st !== 3; },
    hitPos(e) {
      if (e.st !== 3) return { x: e.x, y: e.y + 2, z: e.z };
      const c = new THREE.Vector3(); e.m.head.getWorldPosition(c); return c;
    },
    anim(e, dt, time) {
      const m = e.m, d = e.d;
      const stun = e.st === 3;
      m.stalk.forEach((s, i) => { s.rotation.x = stun ? 0.34 : Math.sin(time * 1.2 + i) * 0.06; s.rotation.z = Math.cos(time * 0.9 + i) * 0.05; });
      m.head.rotation.x = stun ? 0.5 : 0;
      m.core.scale.setScalar(stun ? 1.4 + Math.sin(time * 10) * 0.2 : 0.8);
      m.vines.forEach((v, i) => {
        let lift = Math.sin(time * 1.5 + i) * 0.1, reach = 0;
        if (i === d.vine && (e.st === 1 || e.st === 2)) {
          const wx = d.tx - e.x, wz = d.tz - e.z;
          v.base.rotation.y = Math.atan2(wx, wz) - e.yaw;
          reach = Math.hypot(wx, wz);
          lift = e.st === 1 ? -0.5 : 0.15;
        } else v.base.rotation.y = U.lerp(v.base.rotation.y, i * Math.PI / 2 + Math.PI / 4, 0.05);
        v.segs.forEach((s, k) => (s.rotation.x = k === 0 ? lift : (e.st === 1 && i === d.vine ? -0.15 : 0.08 + Math.sin(time * 2 + k + i) * 0.08)));
        const sc = i === d.vine && reach ? U.clamp(reach / 7.5, 0.6, 1.6) : 1;
        v.base.scale.set(1, 1, sc);
      });
    },
  };

  // ---------- 2. SANDWYRM: a giant worm. Make it crash into a pillar! ----------
  TYPES.sandwyrm = {
    hp: 10, r: 1.4, h: 2.6, boss: true, name: 'SANDWYRM, EATER OF DUNES',
    make(e) { const m = Mo.sandwyrm(); e.m = m; e.d = { trail: [], dirx: 0, dirz: 1, sink: 1 }; return m.group; },
    think(e, dt, tg) {
      e.t -= dt;
      const d = e.d, a = e.arena;
      if (!tg) return;
      if (e.st === 0) { // swimming under the sand, circling you
        d.sink = U.damp(d.sink, 1, 3, dt);
        const ang = Math.atan2(e.z - tg.p.z, e.x - tg.p.x) + dt * 0.9;
        const r = 11;
        let tx = tg.p.x + Math.cos(ang) * r, tz = tg.p.z + Math.sin(ang) * r;
        const ad = dist(tx, tz, a.x, a.z);
        if (ad > a.r - 3) { tx = a.x + (tx - a.x) / ad * (a.r - 3); tz = a.z + (tz - a.z) / ad * (a.r - 3); }
        moveTo(e, tx, tz, 9, dt);
        if (Math.random() < dt * 3) SF.FX.puff(e.x, e.y, e.z, 0xe0a070, 2);
        if (e.t <= 0) { e.st = 1; e.t = 1.3; SF.Audio.sfx('roar'); }
      } else if (e.st === 1) { // coming up, looking at you
        d.sink = U.damp(d.sink, 0, 5, dt);
        e.yaw = U.dampAngle(e.yaw, Math.atan2(tg.dx, tg.dz), 5, dt);
        if (e.t <= 0) { e.st = 2; e.t = 3.5; d.dirx = Math.sin(e.yaw); d.dirz = Math.cos(e.yaw); }
      } else if (e.st === 2) { // CHARGE!
        const sp = 15 + (1 - e.hp / e.maxHp) * 5;
        const nx = e.x + d.dirx * sp * dt, nz = e.z + d.dirz * sp * dt;
        // did it hit a pillar?
        let crash = null;
        for (const pl of a.pillars || []) if (!pl.broken && dist(nx, nz, pl.x, pl.z) < pl.r + 1.3) crash = pl;
        if (dist(nx, nz, a.x, a.z) > a.r - 1.5) crash = crash || 'wall';
        if (crash) {
          SF.Audio.sfx('boom'); shake(0.6, e);
          SF.FX.burst(nx, e.y + 1, nz, 0xe0b080, 30);
          if (crash !== 'wall') { crash.broken = true; SF.World.breakPillar(a, crash); SF.Net.event({ t: 'pillar', a: a.i, p: a.pillars.indexOf(crash) }); }
          e.st = 3; e.t = crash === 'wall' ? 2.6 : 4.5;
          SF.HUD.toast('It\'s dizzy! Hit its head!');
        } else { e.x = nx; e.z = nz; }
        for (const p of targets()) if (dist(p.pos.x, p.pos.z, e.x, e.z) < 2.4 && p.pos.y - e.y < 2) p.hurt(5, e.x - d.dirx * 3, e.z - d.dirz * 3, 12);
        if (e.t <= 0) { e.st = 0; e.t = 3; }
      } else if (e.st === 3) { // DIZZY
        if (e.t <= 0) { e.st = 0; e.t = 2.5; }
      }
      // the body follows the head like a train
      d.trail.unshift({ x: e.x, z: e.z });
      if (d.trail.length > 90) d.trail.pop();
    },
    armor(e) { return e.st !== 3; },
    anim(e, dt, time) {
      const m = e.m, d = e.d;
      m.group.position.set(0, 0, 0); m.group.rotation.set(0, 0, 0);
      let idx = 0;
      m.segs.forEach((s, i) => {
        const tr = d.trail[Math.min(d.trail.length - 1, i * 5)] || { x: e.x, z: e.z };
        const under = e.st === 0 ? d.sink : e.st === 1 ? d.sink * (i > 3 ? 1 : 0.4) : 0;
        let y = e.y + 1.1 - under * 3.5 + (e.st === 1 && i < 4 ? (4 - i) * 0.9 : 0) + Math.sin(time * 6 + i * 0.7) * 0.15;
        if (e.st === 3 && i === 0) y = e.y + 0.9;
        s.position.set(tr.x, y, tr.z);
        const nxt = d.trail[Math.min(d.trail.length - 1, i * 5 + 4)] || tr;
        s.rotation.y = Math.atan2(tr.x - nxt.x, tr.z - nxt.z) || (i === 0 ? e.yaw : 0);
        idx++;
      });
      if (e.st === 1 || e.st === 3) m.segs[0].rotation.y = e.yaw;
      m.segs[0].rotation.z = e.st === 3 ? Math.sin(time * 8) * 0.3 : 0;
      m.jaws.forEach((j, i) => (j.rotation.y = (i ? -1 : 1) * (0.2 + Math.abs(Math.sin(time * (e.st === 2 ? 14 : 4))) * 0.4)));
      m.weak.visible = e.st === 3;
      m.weak.rotation.y = time * 3;
    },
    // where you have to hit it (its head)
    hitPos(e) { const s = e.m.segs[0].position; return { x: s.x, y: s.y, z: s.z }; },
  };

  // ---------- 3. FROST COLOSSUS: shoot its eye with the bow! ----------
  TYPES.colossus = {
    hp: 12, r: 3, h: 12, boss: true, name: 'FROST COLOSSUS',
    make(e) { const m = Mo.colossus(); e.m = m; e.d = { kneel: 0 }; return m.group; },
    think(e, dt, tg) {
      e.t -= dt;
      const d = e.d;
      if (!tg) return;
      d.kneel = U.damp(d.kneel, e.st === 3 ? 1 : 0, 4, dt);
      if (e.st !== 3) e.yaw = U.dampAngle(e.yaw, Math.atan2(tg.dx, tg.dz), 1.2, dt);
      if (e.st === 0) {
        if (tg.d > 7) walk(e, Math.sin(e.yaw), Math.cos(e.yaw), 1.6, dt);
        if (e.t <= 0) {
          if (tg.d < 9) { e.st = 1; e.t = 1.1; SF.Audio.sfx('roar'); }
          else { e.st = 2; e.t = 1.0; }
        }
      } else if (e.st === 1) { // STOMP
        if (e.t <= 0) {
          SF.Audio.sfx('boom'); shake(0.7, e); SF.FX.ring(e.x, e.y, e.z, 0xa0e0ff, 12, 0.9);
          wave(e.x, e.z, 12, 0.9, 3);
          e.st = 0; e.t = 2.2;
        }
      } else if (e.st === 2) { // throw ice
        if (e.t <= 0) {
          const hy = e.y + 9;
          const n = e.hp < e.maxHp / 2 ? 3 : 1;
          for (let k = 0; k < n; k++) {
            const tx = tg.p.x + (k ? U.rand(-4, 4) : 0), tz = tg.p.z + (k ? U.rand(-4, 4) : 0);
            const dx = tx - e.x, dz = tz - e.z, dd = Math.hypot(dx, dz) || 1;
            const time = dd / 14;
            shoot('ice', e.x, hy, e.z, dx / time, (tg.p.y - hy) / time + 0.5 * 18 * time, dz / time, 4, { grav: 18, r: 0.9 });
          }
          e.st = 0; e.t = 2.2;
        }
      } else if (e.st === 3) { // knocked down!
        if (e.t <= 0) { e.st = 0; e.t = 1.5; SF.Audio.sfx('roar'); }
      }
    },
    armor(e) { return e.st !== 3; },
    // arrows in the eye knock it down
    arrowHit(e, p) {
      if (e.st === 3) return false;
      const ew = new THREE.Vector3(); e.m.eye.getWorldPosition(ew);
      if (ew.distanceTo(p) < 1.3) { TYPES.colossus.stun(e); SF.FX.burst(ew.x, ew.y, ew.z, 0xff4060, 20); return true; }
      return false;
    },
    stun(e) { if (e.st === 3) return; e.st = 3; e.t = 6; SF.Audio.sfx('clank'); SF.Audio.sfx('roar'); SF.HUD.toast('It fell down! Hit the blue crystal!'); },
    hitPos(e) { const c = new THREE.Vector3(); e.m.core.getWorldPosition(c); return c; },
    anim(e, dt, time) {
      const m = e.m, k = e.d.kneel;
      m.torso.position.y = 4.5 - k * 3.2;
      m.torso.rotation.x = k * 0.45;
      m.legs.forEach((l, i) => { l.rotation.x = k * -1.1 + (e.moving ? Math.sin(time * 3 + i * 3) * 0.3 : 0); l.position.y = 4.5 - k * 1.5; });
      const up = e.st === 1 ? -2.4 : e.st === 2 ? -2.9 : -0.2 + Math.sin(time) * 0.1;
      m.arms.forEach((a, i) => (a.rotation.x = k > 0.5 ? 0.3 : up * (e.st === 2 && i === 0 ? 1 : e.st === 2 ? 0.2 : 1)));
      m.eye.material = Mo.M.glow(e.st === 3 ? 0x402030 : 0xff4060);
      m.core.scale.setScalar(e.st === 3 ? 1.3 + Math.sin(time * 10) * 0.15 : 1);
      m.core.rotation.y = time * 2;
    },
  };

  // ---------- 4. EMBER KING: the final boss ----------
  TYPES.emberking = {
    hp: 16, r: 3, h: 6, boss: true, fly: true, name: 'THE EMBER KING',
    make(e) { const m = Mo.emberking(); e.m = m; e.d = { fall: 0, ang: 0 }; return m.group; },
    think(e, dt, tg) {
      e.t -= dt;
      const d = e.d, a = e.arena;
      if (!tg) return;
      const angry = e.hp < e.maxHp / 2;
      const floatY = a.y + (e.st === 3 ? 2.6 : 8 + Math.sin(e.t) * 0.5);
      e.y = U.damp(e.y, floatY, e.st === 3 ? 6 : 2, dt);
      e.yaw = U.dampAngle(e.yaw, Math.atan2(tg.dx, tg.dz), e.st === 3 ? 0 : 2, dt);
      if (e.st !== 3) {
        d.ang += dt * (angry ? 0.35 : 0.25);
        moveTo(e, a.x + Math.cos(d.ang) * 7, a.z + Math.sin(d.ang) * 7, 3, dt);
      }
      if (e.st === 0 && e.t <= 0) {
        const r = Math.random();
        if (r < 0.45) { e.st = 1; e.t = 0.6; d.n = angry ? 5 : 3; }
        else if (r < 0.8) { e.st = 2; e.t = 1.0; SF.Audio.sfx('roar'); }
        else { e.st = 4; e.t = 1.2; d.tx = tg.p.x; d.tz = tg.p.z; SF.FX.ring(d.tx, a.y, d.tz, 0xff4020, 3, 1.2); }
      } else if (e.st === 1 && e.t <= 0) { // fireballs
        const dx = tg.p.x - e.x, dy = tg.p.y + 1 - e.y, dz = tg.p.z - e.z, dd = Math.hypot(dx, dy, dz);
        shoot('fire', e.x, e.y, e.z, dx / dd * 13, dy / dd * 13, dz / dd * 13, 4, { home: 1.2, r: 0.6 });
        SF.Audio.sfx('zap');
        d.n--; e.t = 0.45;
        if (d.n <= 0) { e.st = 0; e.t = 1.6; }
      } else if (e.st === 2 && e.t <= 0) { // ring of fire on the floor: jump over it!
        SF.Audio.sfx('boom'); shake(0.4, e);
        wave(e.x, e.z, a.r, 1.8, 4, 0xff6020);
        if (angry) setTimeout(() => { if (e.alive) { wave(e.x, e.z, a.r, 1.8, 4, 0xff6020); SF.Audio.sfx('boom'); } }, 900);
        e.st = 0; e.t = angry ? 2.6 : 2.2;
      } else if (e.st === 3 && e.t <= 0) { // gets back up
        e.st = 0; e.t = 1.4; SF.Audio.sfx('roar');
      } else if (e.st === 4 && e.t <= 0) { // hand smash
        SF.Audio.sfx('boom'); shake(0.5, e); SF.FX.burst(d.tx, a.y + 0.5, d.tz, 0xff6020, 25);
        for (const p of targets()) if (dist(p.pos.x, p.pos.z, d.tx, d.tz) < 3.2 && p.pos.y - a.y < 1.5) p.hurt(5, d.tx, d.tz, 11);
        e.st = 0; e.t = 1.4;
      }
    },
    armor(e) { return e.st !== 3; },
    arrowHit(e, p) {
      if (e.st === 3) return false;
      const ew = new THREE.Vector3(); e.m.eye.getWorldPosition(ew);
      if (ew.distanceTo(p) < 1.6) { TYPES.emberking.stun(e); SF.FX.burst(ew.x, ew.y, ew.z, 0xfff080, 25); return true; }
      return false;
    },
    stun(e) { if (e.st === 3) return; e.st = 3; e.t = 5.5; SF.Audio.sfx('roar'); SF.HUD.toast('It crashed down! Attack!'); },
    anim(e, dt, time) {
      const m = e.m;
      m.body.rotation.y = time * 0.3;
      m.body.rotation.x = e.st === 3 ? 0.5 : 0;
      m.eye.visible = true;
      m.eye.material = Mo.M.glow(e.st === 3 ? 0x604020 : 0xfff080);
      m.crown.rotation.y = -time * 0.8;
      m.hands.forEach((h, i) => {
        const s = i ? 1 : -1;
        if (e.st === 4 && i === 0 && e.d.tx !== undefined) {
          const lx = e.d.tx - e.x, lz = e.d.tz - e.z;
          const c = Math.cos(-e.yaw), sn = Math.sin(-e.yaw);
          h.position.set(lx * c + lz * sn, e.arena.y - e.y + 1 + Math.max(0, e.t) * 5, -lx * sn + lz * c);
        } else h.position.set(s * 5, -1 + Math.sin(time * 2 + i) * 0.6, 1);
      });
    },
  };

  // ============================================================
  //  HELPERS
  // ============================================================
  function dist(ax, az, bx, bz) { return Math.hypot(ax - bx, az - bz); }

  // players that enemies can attack
  function targets() { return SF.Game.targets(); }
  function nearestTarget(e, max = 40) {
    let best = null;
    for (const p of targets()) {
      if (p.down) continue;
      if (e.arena && !Ph.arenaAt(p.pos.x, p.pos.z)) continue;
      const dx = p.pos.x - e.x, dz = p.pos.z - e.z, d = Math.hypot(dx, dz);
      if (d < max && (!best || d < best.d)) best = { p: p.pos, dx, dz, d, hurt: p.hurt, id: p.id };
    }
    return best;
  }

  function walk(e, dx, dz, sp, dt) {
    const nx = e.x + dx * sp * dt, nz = e.z + dz * sp * dt;
    const g = Ph.groundAt(nx, nz, e.y + 1);
    if (!e.arena) {
      if (g < 0.3 || (T.inLava(nx, nz) && g < T.LAVA_Y + 1) || g - e.y > 1.2) return false;
      if (dist(nx, nz, e.hx, e.hz) > 34) return false;
    }
    e.x = nx; e.z = nz; e.moving = true;
    return true;
  }
  function wander(e, dt, sp) {
    e.wt = (e.wt || 0) - dt;
    if (e.wt <= 0) { e.wt = U.rand(2, 5); e.wy = Math.random() < 0.4 ? null : Math.random() * 7; if (dist(e.x, e.z, e.hx, e.hz) > 15) e.wy = Math.atan2(e.hx - e.x, e.hz - e.z); }
    if (e.wy !== null && e.wy !== undefined) { e.yaw = U.dampAngle(e.yaw, e.wy, 3, dt); if (!walk(e, Math.sin(e.yaw), Math.cos(e.yaw), sp, dt)) e.wy += 2; }
  }
  function moveTo(e, tx, tz, sp, dt) {
    const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
    if (d < 0.01) return;
    const s = Math.min(d, sp * dt);
    e.x += dx / d * s; e.z += dz / d * s;
    if (!TYPES[e.type].fly) e.yaw = U.dampAngle(e.yaw, Math.atan2(dx, dz), 5, dt);
    e.moving = true;
  }
  function countType(t) { return list.filter((e) => e.alive && e.type === t).length; }

  // a shockwave on the floor. Jump to avoid it!
  function wave(x, z, maxR, time, dmg, color = 0xa0e0ff) {
    const a = Ph.arenaAt(x, z);
    const y = a ? a.y : Ph.groundAt(x, z);
    SF.FX.ring(x, y, z, color, maxR, time);
    const hitSet = new Set();
    const start = performance.now();
    waves.push({ x, z, y, maxR, time, dmg, t: 0, hitSet, start });
  }
  const waves = [];
  function updateWaves(dt) {
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.t += dt;
      const r = 0.5 + (w.t / w.time) * w.maxR;
      if (isHost()) {
        for (const p of targets()) {
          if (w.hitSet.has(p.id)) continue;
          const d = dist(p.pos.x, p.pos.z, w.x, w.z);
          if (Math.abs(d - r) < 0.9 && p.pos.y - w.y < 0.6) { w.hitSet.add(p.id); p.hurt(w.dmg, w.x, w.z, 9); }
        }
      }
      if (w.t >= w.time) waves.splice(i, 1);
    }
  }

  function shake(a, e) {
    const me = SF.Game.player;
    if (!me) return;
    const d = dist(me.pos.x, me.pos.z, e.x, e.z);
    SF.Game.shake(a * U.clamp(1 - d / 40, 0, 1));
  }

  // ============================================================
  //  SPAWNING
  // ============================================================
  function spawn(type, x, z, opts = {}) {
    const def = TYPES[type];
    const e = {
      id: opts.id || ('e' + (uid++)), type, x, z, y: 0, yaw: Math.random() * 7, vx: 0, vy: 0, vz: 0,
      hp: def.hp, maxHp: def.hp, st: 0, t: 1 + Math.random(), cd: 0, alive: true, onGround: true,
      hx: opts.hx ?? x, hz: opts.hz ?? z, camp: opts.camp || null, arena: opts.arena || null,
      night: opts.night || false, lava: opts.lava || false, remote: !!opts.remote, flash: 0,
    };
    e.group = def.make(e);
    e.group.traverse((o) => { if (o.isMesh) o.castShadow = !SF.lowGfx; });
    if (def.boss && opts.scale) e.group.scale.setScalar(opts.scale);
    const g = Ph.groundAt(x, z, 1e9);
    e.y = opts.y ?? (def.fly ? g + 5 : g);
    if (e.arena) e.y = def.fly ? e.arena.y + 8 : e.arena.y;
    e.group.position.set(e.x, e.y, e.z);
    scene.add(e.group);
    list.push(e); byId.set(e.id, e);
    return e;
  }

  function remove(e) {
    e.alive = false;
    scene.remove(e.group);
    const i = list.indexOf(e); if (i >= 0) list.splice(i, 1);
    byId.delete(e.id);
  }

  // enemy camps all over the island (always the same, thanks to the seed)
  function makeCamps() {
    const rnd = U.seeded(SF.Layout.seed + 5);
    const want = { plains: 9, jungle: 10, desert: 9, frozen: 9, lava: 7 };
    const kinds = {
      plains: [['gloop', 3], ['gloop', 4], ['spinecrab', 1]],
      jungle: [['gloop', 3], ['spinecrab', 2], ['zapwing', 1]],
      desert: [['spinecrab', 2], ['zapwing', 2], ['gloop', 3]],
      frozen: [['golem', 1], ['zapwing', 2], ['spinecrab', 2]],
      lava: [['golem', 1], ['zapwing', 2]],
    };
    const L = SF.Layout;
    for (const reg in want) {
      let n = 0, tries = 0;
      while (n < want[reg] && tries++ < 3000) {
        const x = (rnd() * 2 - 1) * 280, z = (rnd() * 2 - 1) * 280;
        if (T.regionAt(x, z) !== reg) continue;
        const h = T.heightAt(x, z);
        if (h < 1 || T.slopeAt(x, z) > 0.7) continue;
        if (T.inLava(x, z) && h < T.LAVA_Y + 1) continue;
        if (dist(x, z, L.crash.x, L.crash.z) < 55 || dist(x, z, L.village.x, L.village.z) < 45) continue;
        if (camps.some((c) => dist(c.x, c.z, x, z) < 40)) continue;
        if (L.temples.some((t) => dist(t.x, t.z, x, z) < 30)) continue;
        const [type, count] = kinds[reg][Math.floor(rnd() * kinds[reg].length)];
        camps.push({ id: 'c' + camps.length, x, z, type, count, alive: [], cleared: 0, active: false, lava: reg === 'lava' });
        n++;
      }
    }
  }

  function updateCamps(dt) {
    const ps = targets();
    for (const c of camps) {
      const near = ps.some((p) => dist(p.pos.x, p.pos.z, c.x, c.z) < 75);
      if (c.cleared > 0) c.cleared -= dt;
      if (near && !c.active && c.cleared <= 0) {
        c.active = true;
        for (let i = 0; i < c.count; i++) {
          const a = (i / c.count) * Math.PI * 2;
          const e = spawn(c.type, c.x + Math.cos(a) * 3, c.z + Math.sin(a) * 3, { camp: c, id: c.id + '_' + i, lava: c.lava });
          c.alive.push(e);
        }
      } else if (!near && c.active && ps.every((p) => dist(p.pos.x, p.pos.z, c.x, c.z) > 95)) {
        c.active = false;
        c.alive.forEach((e) => { if (e.alive) remove(e); });
        c.alive = [];
      }
    }
    // more gloops come out at night...
    if (SF.Sky.S.night > 0.5 && !SF.Sky.S.indoor) {
      nightSpawnT -= dt;
      if (nightSpawnT <= 0) {
        nightSpawnT = 14;
        const p = ps[Math.floor(Math.random() * ps.length)];
        const nightOnes = list.filter((e) => e.night && e.alive).length;
        if (p && nightOnes < 4 && !Ph.arenaAt(p.pos.x, p.pos.z)) {
          const a = Math.random() * 7;
          const x = p.pos.x + Math.cos(a) * 26, z = p.pos.z + Math.sin(a) * 26;
          const h = T.heightAt(x, z);
          if (h > 1 && !T.inLava(x, z) && dist(x, z, SF.Layout.village.x, SF.Layout.village.z) > 40) spawn('gloop', x, z, { night: true, id: 'n' + (nightCount++) });
        }
      }
    }
    // night creatures go away in the morning
    if (SF.Sky.S.day > 0.8) list.filter((e) => e.night).forEach((e) => { SF.FX.puff(e.x, e.y, e.z, 0xd060ff, 6); remove(e); });
  }

  // ============================================================
  //  GETTING HIT
  // ============================================================
  // the sword: hit everything in front of you
  function meleeHit(attacker, x, y, z, facing, range, dmg, knock) {
    let any = false;
    for (const e of list.slice()) {
      if (!e.alive) continue;
      const def = TYPES[e.type];
      const hp = def.hitPos ? def.hitPos(e) : { x: e.x, y: e.y + def.h * 0.5, z: e.z };
      const dx = hp.x - x, dz = hp.z - z, d = Math.hypot(dx, dz);
      const reach = range + def.r;
      if (d > reach) continue;
      if (d > 1 && Math.abs(U.angleDiff(facing, Math.atan2(dx, dz))) > 1.1) continue;
      const vy = hp.y - y;
      if (vy > def.h * 0.5 + 1.8 || vy < -2.5) continue;
      any = true;
      applyHit(e, dmg, attacker.pos.x, attacker.pos.z, knock, 'sword', hp);
    }
    return any;
  }

  // what happens when an enemy is hit (on the host, or asked by the friend)
  function applyHit(e, dmg, fromX, fromZ, knock, kind, pt, fromNet) {
    const def = TYPES[e.type];
    const fx = pt ? pt.x : e.x, fy = pt ? pt.y : e.y + 1, fz = pt ? pt.z : e.z;
    if (def.armor && def.armor(e, fromX, fromZ)) {
      SF.Audio.sfx('clank');
      SF.FX.sparks(fx, fy, fz, 0xffffff, 8);
      if (!fromNet && SF.Game.player && kind === 'sword') {
        const p = SF.Game.player, d = Math.hypot(p.pos.x - e.x, p.pos.z - e.z) || 1;
        p.knock.set((p.pos.x - e.x) / d * 5, 0, (p.pos.z - e.z) / d * 5);
      }
      return;
    }
    SF.Audio.sfx('hit');
    SF.FX.sparks(fx, fy, fz, 0xfff0a0, 14);
    e.flash = 0.15;
    if (!isHost() && !e.remoteAuthority) {
      // the friend's game asks the host to do the damage
      SF.Net.sendHit(e.id, dmg, fromX, fromZ, knock, kind);
      return;
    }
    e.hp -= dmg;
    if (!def.boss) {
      const d = Math.hypot(e.x - fromX, e.z - fromZ) || 1;
      e.kx = (e.x - fromX) / d * knock; e.kz = (e.z - fromZ) / d * knock;
      if (e.type === 'gloop') { e.vy = 4; e.onGround = false; }
    }
    if (e.hp <= 0) kill(e);
  }

  function kill(e) {
    const def = TYPES[e.type];
    e.alive = false;
    SF.Audio.sfx(def.boss ? 'roar' : 'enemyDie');
    SF.FX.burst(e.x, e.y + def.h * 0.5, e.z, def.boss ? 0xffe060 : 0xc0a0ff, def.boss ? 80 : 24);
    if (e.camp) { e.camp.alive = e.camp.alive.filter((x) => x !== e); if (!e.camp.alive.length) e.camp.cleared = 200; }
    if (!def.boss) SF.World.dropLoot(e.x, e.y + 0.5, e.z, def.shards);
    remove(e);
    if (SF.Net.active && SF.Net.isHost) SF.Net.event({ t: 'kill', id: e.id, x: e.x, y: e.y, z: e.z, type: e.type });
    if (def.boss) SF.World.bossDefeated(e.arena.i);
  }

  // the friend's game hears that an enemy died
  function remoteKill(ev) {
    const e = byId.get(ev.id);
    const def = TYPES[ev.type];
    SF.Audio.sfx(def && def.boss ? 'roar' : 'enemyDie');
    SF.FX.burst(ev.x, ev.y + 1, ev.z, 0xc0a0ff, 24);
    if (def && !def.boss) SF.World.dropLoot(ev.x, ev.y + 0.5, ev.z, def.shards);
    if (e) remove(e);
  }

  // ============================================================
  //  PROJECTILES
  // ============================================================
  function shoot(kind, x, y, z, vx, vy, vz, dmg, o = {}) {
    const color = kind === 'bolt' ? 0xffff60 : kind === 'fire' ? 0xff6020 : 0xc0f0ff;
    const m = kind === 'ice' ? Mo.orbProjectile(0xc0f0ff, 0.8) : Mo.orbProjectile(color, kind === 'fire' ? 0.45 : 0.25);
    m.position.set(x, y, z);
    scene.add(m);
    const s = { kind, x, y, z, vx, vy, vz, dmg, m, life: 5, color, r: o.r || 0.5, grav: o.grav || 0, home: o.home || 0 };
    shots.push(s);
    if (kind === 'bolt') SF.Audio.sfx('zap');
    return s;
  }

  function updateShots(dt) {
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life -= dt;
      if (s.home && isHost()) {
        const tg = nearestTarget({ x: s.x, z: s.z, arena: Ph.arenaAt(s.x, s.z) }, 60);
        if (tg) {
          const dx = tg.p.x - s.x, dy = tg.p.y + 1 - s.y, dz = tg.p.z - s.z, d = Math.hypot(dx, dy, dz) || 1;
          const sp = Math.hypot(s.vx, s.vy, s.vz);
          s.vx += (dx / d * sp - s.vx) * s.home * dt; s.vy += (dy / d * sp - s.vy) * s.home * dt; s.vz += (dz / d * sp - s.vz) * s.home * dt;
        }
      }
      s.vy -= s.grav * dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      s.m.position.set(s.x, s.y, s.z);
      if (Math.random() < 0.6) SF.FX.trailDot(s.x, s.y, s.z, s.color, s.kind === 'ice' ? 2 : 1);
      let dead = s.life <= 0 || Ph.solidAt(s.x, s.y, s.z);
      if (!dead && isHost()) {
        for (const p of targets()) {
          if (p.down) continue;
          if (Math.hypot(p.pos.x - s.x, p.pos.y + 1 - s.y, p.pos.z - s.z) < s.r + 0.6) {
            p.hurt(s.dmg, s.x - s.vx, s.z - s.vz, 7);
            dead = true; break;
          }
        }
      }
      if (dead) {
        SF.FX.burst(s.x, s.y, s.z, s.color, s.kind === 'ice' ? 20 : 10);
        if (s.kind === 'ice') { SF.Audio.sfx('boom'); if (isHost()) for (const p of targets()) if (Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < 2.5 && Math.abs(p.pos.y - s.y) < 2) p.hurt(s.dmg, s.x, s.z, 8); }
        scene.remove(s.m);
        shots.splice(i, 1);
      }
    }
  }

  // ---------- arrows (from YOUR plasma bow) ----------
  function shootArrow(start, dir, owner) {
    const m = Mo.arrow();
    m.position.copy(start);
    scene.add(m);
    arrows.push({ p: start.clone(), v: dir.clone().multiplyScalar(55), m, life: 2.5, owner, stuck: 0 });
  }

  function updateArrows(dt) {
    for (let i = arrows.length - 1; i >= 0; i--) {
      const a = arrows[i];
      if (a.stuck > 0) { a.stuck -= dt; if (a.stuck <= 0) { scene.remove(a.m); arrows.splice(i, 1); } continue; }
      a.life -= dt;
      a.v.y -= 5 * dt;
      // move in small steps so fast arrows don't pass through things
      const steps = 4;
      let hit = false;
      for (let k = 0; k < steps && !hit; k++) {
        a.p.addScaledVector(a.v, dt / steps);
        if (a.owner === 'me') {
          // bosses with special weak points
          for (const e of list) {
            if (!e.alive) continue;
            const def = TYPES[e.type];
            if (def.arrowHit && def.arrowHit(e, a.p)) {
              hit = true;
              if (SF.Net.active && !SF.Net.isHost) SF.Net.sendHit(e.id, 0, a.p.x, a.p.z, 0, 'eye');
              break;
            }
            const hp = def.hitPos ? def.hitPos(e) : { x: e.x, y: e.y + def.h * 0.5, z: e.z };
            const rr = def.r + 0.3;
            if (Math.abs(a.p.x - hp.x) < rr + 1 && Math.abs(a.p.z - hp.z) < rr + 1 && a.p.y > e.y - 0.3 && a.p.y < e.y + def.h + 0.3 && Math.hypot(a.p.x - hp.x, a.p.z - hp.z) < rr) {
              applyHit(e, 2, a.p.x - a.v.x, a.p.z - a.v.z, 3, 'arrow', a.p.clone());
              hit = true; break;
            }
          }
          if (!hit && SF.World.arrowHit(a.p)) hit = true;
        }
        if (!hit && Ph.solidAt(a.p.x, a.p.y, a.p.z)) { a.stuck = 2; SF.FX.sparks(a.p.x, a.p.y, a.p.z, 0xffe080, 5, 3); break; }
      }
      a.m.position.copy(a.p);
      a.m.lookAt(a.p.clone().add(a.v));
      if (hit || a.life <= 0) { scene.remove(a.m); arrows.splice(i, 1); }
    }
  }

  // ============================================================
  //  FRIENDLY FLOOFS (they just hop around and run from you)
  // ============================================================
  function updateFloofs(dt, time) {
    const me = SF.Game.player;
    if (!me || SF.Sky.S.indoor) { floofs.forEach((f) => (f.g.visible = false)); return; }
    const reg = T.regionAt(me.pos.x, me.pos.z);
    const wantN = (reg === 'plains' || reg === 'jungle') ? 6 : 0;
    for (let i = floofs.length - 1; i >= 0; i--) {
      const f = floofs[i];
      if (dist(f.x, f.z, me.pos.x, me.pos.z) > 60 || floofs.length > wantN) { scene.remove(f.g); floofs.splice(i, 1); }
    }
    while (floofs.length < wantN) {
      const a = Math.random() * 7, r = U.rand(25, 45);
      const x = me.pos.x + Math.cos(a) * r, z = me.pos.z + Math.sin(a) * r;
      const h = T.heightAt(x, z);
      if (h < 1) break;
      const m = Mo.floof(U.pick([0xffb0e0, 0xb0e0ff, 0xfff0a0, 0xc0ffc0]));
      scene.add(m.group);
      floofs.push({ g: m.group, b: m.body, x, z, y: h, vy: 0, yaw: 0, t: 0 });
    }
    for (const f of floofs) {
      f.g.visible = true;
      f.t -= dt;
      const d = dist(f.x, f.z, me.pos.x, me.pos.z);
      const g = T.heightAt(f.x, f.z);
      if (f.y <= g + 0.01 && f.t <= 0) {
        let a = Math.random() * 7;
        if (d < 8) a = Math.atan2(f.z - me.pos.z, f.x - me.pos.x);
        f.dx = Math.cos(a); f.dz = Math.sin(a); f.vy = d < 8 ? 5 : 3.5; f.t = d < 8 ? 0.2 : U.rand(0.8, 2.5);
        f.yaw = Math.atan2(f.dx, f.dz);
      }
      if (f.y > g + 0.01 || f.vy > 0) {
        const sp = d < 8 ? 5 : 2;
        const nx = f.x + f.dx * sp * dt, nz = f.z + f.dz * sp * dt;
        if (T.heightAt(nx, nz) > 0.5) { f.x = nx; f.z = nz; }
      }
      f.vy -= 18 * dt; f.y += f.vy * dt;
      if (f.y < T.heightAt(f.x, f.z)) { f.y = T.heightAt(f.x, f.z); f.vy = 0; }
      f.g.position.set(f.x, f.y, f.z);
      f.g.rotation.y = f.yaw;
      const s = f.y > T.heightAt(f.x, f.z) + 0.05 ? 1.15 : 1 + Math.sin(time * 6) * 0.04;
      f.b.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s));
    }
  }

  // ============================================================
  //  EVERY FRAME
  // ============================================================
  function update(dt, time) {
    const host = isHost();
    if (host) updateCamps(dt);
    for (const e of list.slice()) {
      if (!e.alive) continue;
      const def = TYPES[e.type];
      e.moving = false;
      e.cd = Math.max(0, e.cd - dt);
      if (host) {
        const tg = nearestTarget(e, def.boss ? 200 : 40);
        def.think(e, dt, tg);
        // knockback
        if (e.kx || e.kz) {
          walk(e, e.kx, e.kz, 1, dt); e.kx *= Math.exp(-8 * dt); e.kz *= Math.exp(-8 * dt);
          if (Math.abs(e.kx) + Math.abs(e.kz) < 0.1) e.kx = e.kz = 0;
        }
        // gravity for walkers
        if (!def.fly) {
          if (e.type === 'gloop' && !e.onGround) {
            const nx = e.x + e.vx * dt, nz = e.z + e.vz * dt;
            const gg = Ph.groundAt(nx, nz, e.y + 1);
            if (e.arena || (gg > 0.3 && !(T.inLava(nx, nz) && gg < T.LAVA_Y + 1))) { e.x = nx; e.z = nz; }
          }
          const g = e.arena && e.type !== 'gloop' ? e.arena.y : Ph.groundAt(e.x, e.z, e.y + 1);
          e.vy -= 20 * dt; e.y += e.vy * dt;
          if (e.y <= g) { e.y = g; e.vy = 0; if (!e.onGround) { e.onGround = true; e.squash = 0.6; } }
          else if (e.type !== 'gloop' && e.y - g < 0.8) { e.y = g; e.vy = 0; }
        }
        if (e.arena && !def.boss) {
          const a = e.arena, d = dist(e.x, e.z, a.x, a.z);
          if (d > a.r - 1) { e.x = a.x + (e.x - a.x) / d * (a.r - 1); e.z = a.z + (e.z - a.z) / d * (a.r - 1); }
        }
      } else if (e.net) {
        // the friend's game: slide smoothly to where the host says
        const k = 1 - Math.exp(-12 * dt);
        e.x += (e.net.x - e.x) * k; e.y += (e.net.y - e.y) * k; e.z += (e.net.z - e.z) * k;
        e.yaw = U.dampAngle(e.yaw, e.net.yaw, 12, dt);
        e.moving = e.net.mv;
        if (e.type === 'sandwyrm') { e.d.trail.unshift({ x: e.x, z: e.z }); if (e.d.trail.length > 90) e.d.trail.pop(); }
      }
      e.group.position.set(e.x, e.y, e.z);
      if (e.type !== 'sandwyrm') e.group.rotation.y = e.yaw;
      def.anim(e, dt, time);
      // flash white when hit
      if (e.flash > 0) {
        e.flash -= dt;
        e.group.scale.setScalar(1 + e.flash * 1.2);
      } else if (!def.boss) e.group.scale.setScalar(1);
    }
    // you can't walk through enemies
    const me = SF.Game.player;
    if (me && !me.down) {
      for (const e of list) {
        const def = TYPES[e.type];
        if (def.fly || e.type === 'sandwyrm') continue;
        const dx = me.pos.x - e.x, dz = me.pos.z - e.z, d = Math.hypot(dx, dz), min = def.r * (def.boss ? 0.9 : 0.8) + 0.4;
        if (d < min && d > 0.001 && me.pos.y < e.y + def.h && me.pos.y + 1.8 > e.y) { me.pos.x = e.x + dx / d * min; me.pos.z = e.z + dz / d * min; }
      }
    }
    updateWaves(dt);
    updateShots(dt);
    updateArrows(dt);
    updateFloofs(dt, time);
  }

  // ============================================================
  //  ONLINE: the host sends enemies, the friend shows them
  // ============================================================
  function snapshot(near) {
    const out = [];
    for (const e of list) {
      if (!e.alive || e.night === undefined) continue;
      if (near && !near.some((p) => dist(p.x, p.z, e.x, e.z) < 120 || (e.arena && Ph.arenaAt(p.x, p.z) === e.arena))) continue;
      const o = [e.id, e.type, +e.x.toFixed(2), +e.y.toFixed(2), +e.z.toFixed(2), +e.yaw.toFixed(2), +e.hp.toFixed(1), e.st, +e.t.toFixed(2), e.moving ? 1 : 0, e.night ? 1 : 0, e.lava ? 1 : 0, e.arena ? e.arena.i : -1];
      if (e.d) o.push(JSON.parse(JSON.stringify(e.d, (k, v) => (k === 'trail' ? undefined : v))));
      out.push(o);
    }
    const sh = shots.map((s) => [s.kind, +s.x.toFixed(2), +s.y.toFixed(2), +s.z.toFixed(2), +s.vx.toFixed(2), +s.vy.toFixed(2), +s.vz.toFixed(2)]);
    return { e: out, s: sh };
  }

  function applySnapshot(snap) {
    const seen = new Set();
    for (const o of snap.e) {
      const [id, type, x, y, z, yaw, hp, st, t, mv, night, lava, ai, d] = o;
      seen.add(id);
      let e = byId.get(id);
      if (!e) {
        const arena = ai >= 0 ? Ph.arenas[ai] : null;
        e = spawn(type, x, z, { id, remote: true, night: !!night, lava: !!lava, arena, y });
        e.y = y; e.yaw = yaw;
      }
      e.net = { x, y, z, yaw, mv: !!mv };
      if (e.st !== st && TYPES[type].boss) e.t = t;
      e.hp = hp; e.st = st; e.t = t;
      if (d) Object.assign(e.d, d);
    }
    for (const e of list.slice()) if (!seen.has(e.id)) remove(e);
    // enemy shots: just show them
    for (const s of shots) scene.remove(s.m);
    shots.length = 0;
    for (const [kind, x, y, z, vx, vy, vz] of snap.s) {
      const s = shoot(kind, x, y, z, vx, vy, vz, 0);
      s.life = 0.25; s.home = 0;
    }
  }

  // ---------- temple bosses ----------
  function spawnBoss(arena) {
    if (list.some((e) => e.arena === arena && TYPES[e.type].boss)) return null;
    const type = SF.Layout.temples[arena.i].boss;
    const e = spawn(type, arena.x, arena.z - (type === 'sandwyrm' ? 10 : 6), { arena, id: 'boss' + arena.i });
    e.yaw = 0; e.t = 2.5;
    if (type === 'sandwyrm') for (let i = 0; i < 90; i++) e.d.trail.push({ x: e.x, z: e.z - i * 0.2 });
    return e;
  }
  function bossIn(arena) { return list.find((e) => e.arena === arena && TYPES[e.type].boss && e.alive) || null; }
  function clearArena(arena) { list.filter((e) => e.arena === arena).forEach(remove); }
  function clearAll() { list.slice().forEach(remove); camps.forEach((c) => { c.active = false; c.alive = []; }); }

  function build(sc) { scene = sc; makeCamps(); }

  return {
    TYPES, list, camps, build, update, spawn, remove, meleeHit, applyHit, shootArrow, kill, remoteKill,
    snapshot, applySnapshot, spawnBoss, bossIn, clearArena, clearAll, byId, shoot,
  };
})();
