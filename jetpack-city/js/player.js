// ============================================================
//  JETPACK CITY — THE HERO
//  Running, changing lanes, hopping, sliding, the jet boost,
//  and bumping into things.
// ============================================================
window.JC = window.JC || {};

JC.Player = (function () {
  const U = JC.U, S = JC.SETTINGS, W = JC.World;
  const JET_Y = 7;                 // how high you fly with the jet boost
  const STAND = 1.7, CROUCH = 0.8; // how tall you are standing and sliding

  const p = {
    lane: 0, laneFrom: 0, x: 0, y: 0, vy: 0, d: 0, speed: 0, slow: 1,
    onGround: true, slideT: 0, slideAfterLand: false, gravity: 30,
    jetT: 0, magnetT: 0, shieldT: 0, invulT: 0, wobbleT: 0,
    phase: 0, bolts: 0, alive: true, mode: 'idle',
  };
  let hero, bubble, magnetRing, ev = {};

  function init(scene, events) {
    ev = events;
    hero = JC.Models.hero();
    scene.add(hero.root);
    scene.add(hero.shadow);
    bubble = JC.Models.shieldBubble();
    bubble.visible = false;
    scene.add(bubble);
    magnetRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.05, 6, 32), JC.Models.glowy(0xff3a5a, 0.7));
    magnetRing.rotation.x = Math.PI / 2;
    magnetRing.visible = false;
    scene.add(magnetRing);
  }

  function reset() {
    Object.assign(p, {
      lane: 0, laneFrom: 0, x: 0, y: 0, vy: 0, d: 0, speed: S.startSpeed, slow: 1,
      onGround: true, slideT: 0, slideAfterLand: false, jetT: 0, magnetT: 0, shieldT: 0, invulT: 0, wobbleT: 0,
      phase: 0, bolts: 0, alive: true, mode: 'run',
    });
    rampX = null;
    hero.root.visible = true;
    hero.root.rotation.set(0, 0, 0);
  }

  // how high the ground is under you (the road, a ramp, or a train roof)
  let rampX = null;   // the lane of the ramp you were just running up (so you always make it onto the train)
  function groundAt(x, z, feet, remember) {
    let g = 0, fromRamp = null;
    for (const o of W.obstacles) {
      if (o.hit || (o.type !== 'train' && o.type !== 'ramp')) continue;
      if (Math.abs(x - o.x) > 1.05) continue;
      if (z > o.z0 || z < o.z0 - o.len) continue;
      const h = o.type === 'ramp' ? o.top * (o.z0 - z) / o.len : o.top;
      const reach = o.type === 'train' && rampX !== null && Math.abs(rampX - o.x) < 0.1 ? 1.6 : 0.5;
      if (feet >= h - reach && h > g) { g = h; fromRamp = o.type === 'ramp' ? o.x : null; }
    }
    if (remember) rampX = fromRamp;
    return g;
  }

  // ---------------- controls ----------------
  function doMove(m) {
    if (m === 'left' || m === 'right') {
      const nl = U.clamp(p.lane + (m === 'left' ? -1 : 1), -1, 1);
      if (nl !== p.lane) { p.laneFrom = p.lane; p.lane = nl; ev.lane && ev.lane(); }
    } else if (m === 'up') {
      if (p.jetT > 0) return;
      if (p.onGround) {
        const t = S.hopTime * U.clamp(S.startSpeed / p.speed, 0.72, 1);
        p.gravity = 8 * S.hopHeight / (t * t);
        p.vy = 4 * S.hopHeight / t;
        p.onGround = false; p.slideT = 0;
        ev.hop && ev.hop();
      }
    } else if (m === 'down') {
      if (p.jetT > 0) return;
      if (!p.onGround) { p.vy = Math.min(p.vy, -22); p.slideAfterLand = true; }
      else { p.slideT = S.slideTime; ev.slide && ev.slide(); }
    }
  }

  // ---------------- bumping into things ----------------
  // small bump: you stumble and MEGA-BOT gets closer (or catches you)
  function stumble(o, why) {
    if (p.invulT > 0 || !p.alive) return;
    if (o) smash(o);
    if (p.shieldT > 0) { breakShield(); return; }
    p.invulT = 1.1; p.wobbleT = 0.5; p.slow = 0.55;
    ev.stumble && ev.stumble(why);
  }
  // big crash into the front of a train
  function crash(o) {
    if (!p.alive) return;
    if (p.invulT > 0) return;
    if (p.shieldT > 0) { smash(o, true); breakShield(); return; }
    p.alive = false;
    p.speed = 0;
    ev.crash && ev.crash();
  }
  function smash(o, big) {
    o.hit = true;
    o.mesh.visible = false;
    W.burst(o.x, big ? 1.5 : 0.8, o.z0, big ? 0xffa040 : 0xffe060, big ? 26 : 12, big ? 8 : 5, big ? 1.2 : 0.7);
  }
  function breakShield() {
    p.shieldT = 0; p.invulT = 1.3;
    W.burst(p.x, p.y + 1, -p.d, 0x3ac8ff, 22, 6, 0.9);
    ev.shieldBreak && ev.shieldBreak();
  }

  function checkHits(prevZ, z) {
    const head = p.y + (p.slideT > 0 ? CROUCH : STAND);
    for (const o of W.obstacles) {
      if (o.hit) continue;
      const side = Math.abs(p.x - o.x);
      if (o.type === 'barrier' || o.type === 'laser') {
        const zc = o.z0 - o.len / 2;
        if (side < 1.0 && prevZ >= zc && z < zc) {
          if (o.type === 'barrier' && p.y < 0.55) stumble(o, 'barrier');   // a little bit forgiving
          if (o.type === 'laser' && head > 1.0 && p.y < 2.7) stumble(o, 'laser');
        }
      } else if (o.type === 'hole') {
        if (side < 0.8 && p.y < 0.02 && z < o.z0 - 0.4 && z > o.z0 - o.len + 0.4 && p.jetT <= 0) {
          // you fall in, but your jetpack pops you right back out!
          p.vy = 11; p.gravity = 30; p.onGround = false;
          W.burst(p.x, 0.2, z, 0xff8a2a, 10, 4, 0.7);
          stumble(null, 'hole');
        }
      } else if (o.type === 'train') {
        const z0p = o.z0Prev === undefined ? o.z0 : o.z0Prev;
        const low = p.y < o.top - 0.5 && !(rampX !== null && Math.abs(rampX - o.x) < 0.1);
        if (side < 1.1 && low && prevZ - z0p > 0 && z - o.z0 <= 0) crash(o);
        else if (side < 1.2 && low && z < o.z0 - 0.3 && z > o.z0 - o.len && p.lane === Math.round(o.x / W.LANE) && p.invulT <= 0) {
          // you swerved into the side of a train: bounce back to your old lane
          p.lane = p.laneFrom === p.lane ? U.clamp(p.lane + (p.x > o.x ? 1 : -1), -1, 1) : p.laneFrom;
          stumble(null, 'side');
        }
      }
    }
  }

  // ---------------- every frame ----------------
  function update(dt, t) {
    if (!p.alive) return;
    let m;
    while ((m = JC.Input.next())) { if (m === 'pause') ev.pause && ev.pause(); else doMove(m); }

    // speed
    p.speed = Math.min(S.maxSpeed, p.speed + S.speedUp * dt);
    p.slow = Math.min(1, p.slow + dt * 0.5);
    const v = p.speed * p.slow;
    const prevZ = -p.d;
    p.d += v * dt;
    const z = -p.d;

    // sideways
    const tx = p.lane * W.LANE;
    const lanespeed = 13 + p.speed * 0.4;
    p.x += U.clamp(tx - p.x, -lanespeed * dt, lanespeed * dt);

    // up and down
    if (p.jetT > 0) {
      p.jetT -= dt;
      p.y = U.damp(p.y, JET_Y, 2.5, dt);
      p.vy = 0; p.onGround = false; p.slideT = 0;
      if (p.jetT <= 0) { p.invulT = Math.max(p.invulT, 1.6); p.gravity = 22; ev.jetEnd && ev.jetEnd(); }
    } else {
      const g = groundAt(p.x, z, p.y);
      groundAt(p.x, z + 0.01, p.y, true);
      if (p.onGround && p.y > g + 0.05) { p.onGround = false; p.vy = 0; p.gravity = 30; } // ran off a train roof
      if (!p.onGround) {
        p.vy -= p.gravity * dt;
        p.y += p.vy * dt;
        if (p.y <= g) {
          p.y = g; p.vy = 0; p.onGround = true;
          ev.land && ev.land();
          if (p.slideAfterLand) { p.slideT = S.slideTime; p.slideAfterLand = false; ev.slide && ev.slide(); }
        }
      } else p.y = g;
    }
    if (p.slideT > 0) p.slideT -= dt;
    if (p.invulT > 0) p.invulT -= dt;
    if (p.wobbleT > 0) p.wobbleT -= dt;
    if (p.magnetT > 0) p.magnetT -= dt;
    if (p.shieldT > 0) { p.shieldT -= dt; if (p.shieldT <= 0) ev.shieldBreak && ev.shieldBreak(true); }

    checkHits(prevZ, z);
    collect(prevZ, z, dt);

    // animation
    p.phase += dt * (6 + v * 0.35);
    p.mode = p.jetT > 0 ? 'jet' : p.slideT > 0 ? 'slide' : !p.onGround ? 'air' : 'run';
    place(t);
  }

  // bolts and power-ups
  function collect(prevZ, z, dt) {
    const cy = p.y + 0.9;
    const reach = p.jetT > 0 ? 1.5 : 1.15;
    for (const b of W.bolts) {
      if (b.taken) continue;
      if (p.magnetT > 0 && !b.pulled) {
        const dz = z - b.z;
        if (dz < 16 && dz > -2 && Math.abs(b.x - p.x) < 9) b.pulled = true;
      }
      if (b.pulled) {
        // fly toward you
        const k = Math.min(1, dt * 14);
        b.x += (p.x - b.x) * k; b.y += (cy - b.y) * k; b.z += (z - 0.5 - b.z) * k;
        b.mesh.position.set(b.x, b.y, b.z);
      }
      const dx = b.x - p.x, dy = b.y - cy;
      const passed = b.z <= prevZ + 0.6 && b.z >= z - 0.6;
      if (passed && dx * dx + dy * dy < reach * reach) {
        b.taken = true; p.bolts++;
        W.burst(b.x, b.y, b.z, 0xffe23a, 4, 3, 0.45, 0.35);
        ev.bolt && ev.bolt(p.bolts);
      }
    }
    for (const u of W.powerUps) {
      if (u.taken) continue;
      const pos = u.mesh.position;
      const dx = pos.x - p.x, dy = pos.y - cy;
      if (pos.z <= prevZ + 0.8 && pos.z >= z - 0.8 && dx * dx + dy * dy < 1.6 * 1.6) {
        u.taken = true;
        W.burst(pos.x, pos.y, pos.z, JC.Models.PU_COLORS[u.kind], 16, 5, 0.8);
        givePower(u.kind);
      }
    }
  }

  function givePower(kind) {
    if (kind === 'shield') p.shieldT = S.shieldTime;
    if (kind === 'magnet') p.magnetT = S.magnetTime;
    if (kind === 'jet') {
      p.jetT = S.jetTime;
      const flyD = p.speed * S.jetTime;
      W.addSkyBolts(p.d + 12, p.d + flyD - 8, JET_Y + 0.9);
      W.clearNear(p.d + flyD - 10, p.d + flyD + 30);
    }
    ev.power && ev.power(kind);
  }

  // put the 3D hero where they are and make them move
  function place(t) {
    const z = -p.d;
    hero.root.position.set(p.x, p.y, z);
    const lean = (p.lane * W.LANE - p.x) * -0.12;
    const flame = p.mode === 'jet' ? 2.3 : p.mode === 'air' ? (p.vy > 0 ? 1.7 : 1.0) : p.mode === 'slide' ? 0.25 : 0.45;
    hero.pose(p.mode, p.phase, t, flame);
    hero.root.rotation.z = lean + (p.wobbleT > 0 ? Math.sin(p.wobbleT * 40) * 0.25 : 0);
    hero.root.rotation.y = 0;
    hero.root.visible = !(p.invulT > 0 && p.shieldT <= 0 && Math.floor(t * 16) % 2 === 0);
    const g = p.jetT > 0 ? 0 : groundAt(p.x, z, p.y);
    hero.shadow.position.set(p.x, g + 0.03, z);
    hero.shadow.scale.setScalar(U.clamp(1.2 - (p.y - g) * 0.12, 0.3, 1.2));
    bubble.visible = p.shieldT > 0;
    if (bubble.visible) {
      bubble.position.set(p.x, p.y + 0.9, z);
      bubble.material.opacity = p.shieldT < 3 ? (Math.floor(t * 8) % 2 ? 0.3 : 0.08) : 0.22 + Math.sin(t * 5) * 0.05;
    }
    magnetRing.visible = p.magnetT > 0;
    if (magnetRing.visible) { magnetRing.position.set(p.x, p.y + 0.9 + Math.sin(t * 6) * 0.5, z); magnetRing.scale.setScalar(1 + Math.sin(t * 9) * 0.1); }
  }

  // for menus: stand still at the start line
  function showIdle(t, mode = 'idle') {
    hero.root.visible = true;
    hero.root.position.set(p.x, p.y, -p.d);
    hero.root.rotation.set(0, 0, 0);
    hero.pose(mode, t * 8, t, mode === 'idle' ? 0.3 : 0.45);
    hero.shadow.position.set(p.x, 0.03, -p.d);
    hero.shadow.scale.setScalar(1.2);
    bubble.visible = false; magnetRing.visible = false;
  }

  function setLook(jp, of) { hero.setLook(jp, of); }

  // used by the test robot that checks the game works
  const test = { givePower: (k) => givePower(k), bump: () => stumble(null, 'test') };

  return { init, reset, update, place, showIdle, setLook, groundAt, test, state: p, get hero() { return hero; }, JET_Y };
})();
