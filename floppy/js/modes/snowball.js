// ============================================================
//  FLOPPY PARTY — SNOWBALL FIGHT
//  A snowy field with snow forts to hide behind.
//    Hold GRAB to scoop up a snowball (you can carry 3).
//    PUNCH to throw one (it aims a little for you).
//  Every hit is a point! Snow forts break after a few hits.
//  Most hits after 90 seconds wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.snowball = (function () {
  const SIZE = 20, TIME = 90, POOL = 16, SR = 0.17, MAX = 3;
  let balls = [], forts = [], ammo = new Map(), scoop = new Map(), time = 0, flakes = null, self = null;

  function fortMesh(w) {
    const g = new THREE.Group();
    const block = FP.Look.boxMesh(w, 1.0, 0.7, FP.Look.toon(0xffffff), 0.04); block.position.y = 0.5; g.add(block);
    for (let i = 0; i < Math.round(w / 0.6); i++) { const lump = FP.Look.mesh(new THREE.SphereGeometry(0.28, 10, 8), FP.Look.toon(0xf2f8ff), 0.02); lump.position.set(-w / 2 + 0.3 + i * 0.6, 1.02, 0); g.add(lump); }
    return g;
  }

  function build() {
    balls = []; forts = []; ammo = new Map(); scoop = new Map(); time = 0;
    const S = FP.Stage;
    S.island(0, -1, 0, SIZE + 2, 2, SIZE + 2, { grass: 0xf4faff, dirt: 0xb8c8dc });
    // snow forts to hide behind
    const spots = [[0, 0, 3, 0], [-5, -4, 2.4, 0.4], [5, 4, 2.4, 0.4], [-5, 4, 2.4, -0.4], [5, -4, 2.4, -0.4], [0, -7, 2.4, 0], [0, 7, 2.4, 0], [-7.5, 0, 2, Math.PI / 2], [7.5, 0, 2, Math.PI / 2]];
    spots.forEach(([x, z, w, rot]) => {
      const m = fortMesh(w); m.position.set(x, 0, z); m.rotation.y = rot; S.add(m);
      const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: FP.Physics.mats.floor, collisionFilterGroup: FP.Physics.GROUP.WORLD, collisionFilterMask: FP.Physics.ALL });
      body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, 0.55, 0.35)));
      body.position.set(x, 0.55, z); body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rot);
      FP.Physics.world.addBody(body); S.bodies.push(body);
      forts.push({ x, z, w, rot, mesh: m, body, hp: 5 });
    });
    // a snowman and pine trees
    const snowman = new THREE.Group();
    [[0.6, 0.6], [0.45, 1.5], [0.32, 2.2]].forEach(([r, y]) => { const b = FP.Look.mesh(new THREE.SphereGeometry(r, 16, 12), FP.Look.toon(0xffffff), 0.03); b.position.y = y; snowman.add(b); });
    const nose = FP.Look.mesh(new THREE.ConeGeometry(0.07, 0.35, 8), FP.Look.toon(0xff9a3c), 0.01); nose.rotation.x = Math.PI / 2; nose.position.set(0, 2.2, 0.4); snowman.add(nose);
    const hat = FP.Look.makeHat('tophat', 0.32); hat.position.y = 2.45; snowman.add(hat);
    snowman.position.set(SIZE / 2 - 1.2, 0, -SIZE / 2 + 1.2); S.add(snowman);
    for (const [x, z] of [[-SIZE / 2 + 1, -SIZE / 2 + 1], [-SIZE / 2 + 1, SIZE / 2 - 1], [SIZE / 2 - 1, SIZE / 2 - 1]]) {
      const tree = new THREE.Group();
      for (let k = 0; k < 3; k++) { const cone = FP.Look.mesh(new THREE.ConeGeometry(1 - k * 0.25, 1.1, 10), FP.Look.toon(0x3a8a5a), 0.03); cone.position.y = 0.9 + k * 0.6; tree.add(cone); const cap = FP.Look.mesh(new THREE.ConeGeometry(0.5 - k * 0.12, 0.3, 10), FP.Look.toon(0xffffff), 0); cap.position.y = 1.3 + k * 0.6; tree.add(cap); }
      tree.position.set(x, 0, z); S.add(tree);
    }
    // the snowball pool (made now, parked out of sight until thrown)
    for (let i = 0; i < POOL; i++) {
      const body = new CANNON.Body({ mass: 0.2, type: CANNON.Body.KINEMATIC, collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.GROUP.WORLD, linearDamping: 0.01 });
      body.addShape(new CANNON.Sphere(SR)); body.position.set(i, -100, 0);
      const m = FP.Look.mesh(new THREE.SphereGeometry(SR, 10, 8), FP.Look.toon(0xffffff), 0.02);
      balls.push({ ...FP.Stage.prop(m, body), on: false, by: null, t: 0 });
    }
    // falling snow
    const geo = new THREE.BufferGeometry(), n = 300, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = (Math.random() - 0.5) * 30; arr[i * 3 + 1] = Math.random() * 14; arr[i * 3 + 2] = (Math.random() - 0.5) * 30; }
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    flakes = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12 }));
    S.add(flakes);
    S.hemi.color.setHex(0xe8f4ff);
    S.onClear(() => S.hemi.color.setHex(0xffffff));
    FP.Camera.setAngle(0.9, 0.78);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 7.5, 7.5, Math.PI / 4); }

  const pos = (c) => c.parts.torso.position;

  function throwSnowball(c) {
    const have = ammo.get(c) || 0;
    if (have <= 0) { FP.FX.word(c.parts.head.position, 'No snow! Hold GRAB', '#8a8fa0', 0.8); return; }
    const b = balls.find((x) => !x.on);
    if (!b) return;
    ammo.set(c, have - 1);
    const p = pos(c);
    let fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    // a little help aiming: the closest person in front of you
    let best = null, bs = 0.9;
    for (const o of FP.Game.chars) {
      if (o === c || o.ko > 0) continue;
      const q = pos(o), dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
      if (d < 1 || d > 14) continue;
      const dot = (dx * fx + dz * fz) / d;
      if (dot > bs) { bs = dot; best = { dx, dz, d }; }
    }
    let speed = 14, lift = 2.2;
    if (best) { fx = best.dx / best.d; fz = best.dz / best.d; const T = best.d / speed; lift = 0.5 * 9.82 * T * 0.9; }
    b.on = true; b.by = c; b.t = 0;
    b.body.type = CANNON.Body.DYNAMIC;
    b.body.position.set(p.x + fx * 0.5, p.y + 0.5, p.z + fz * 0.5);
    b.body.velocity.set(fx * speed, lift, fz * speed);
    c.punchT = 0; c.punchHit = true;
    FP.Audio.play('whoosh');
  }

  function park(b) { b.on = false; b.by = null; b.body.type = CANNON.Body.KINEMATIC; b.body.velocity.set(0, 0, 0); b.body.position.set(balls.indexOf(b), -100, 0); }

  function control(c, input, dt, playing) {
    const inp = input || {};
    let punch = inp.punchPressed, moveMul = 1;
    if (playing) {
      if (inp.punchPressed) { throwSnowball(c); punch = false; }
      // scooping snow: hold grab (you slow down while you scoop)
      if (inp.grab && (ammo.get(c) || 0) < MAX) {
        const sc = (scoop.get(c) || 0) + dt;
        moveMul = 0.25;
        if (sc > 0.45) { ammo.set(c, (ammo.get(c) || 0) + 1); scoop.set(c, 0); FP.Audio.play('squeak'); FP.FX.puffs(new THREE.Vector3(pos(c).x, 0.2, pos(c).z), 5, 0xffffff, 1.5, 0.8); }
        else scoop.set(c, sc);
      } else scoop.set(c, 0);
    }
    FP.Ragdoll.control(c, { x: (inp.x || 0) * moveMul, z: (inp.z || 0) * moveMul, jump: inp.jump, jumpPressed: inp.jumpPressed, punchPressed: punch, grab: false, emote: inp.emote }, dt);
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const b of balls) {
        if (!b.on) continue;
        b.t += dt;
        const p = b.body.position, v = b.body.velocity;
        // hit someone?
        let hit = null;
        for (const c of chars) {
          if (c === b.by || c.ko > 0) continue;
          const q = pos(c), h = c.parts.head.position;
          if (Math.min(q.distanceTo(p), h.distanceTo(p)) < 0.78) { hit = c; break; }
        }
        if (hit) {
          const by = b.by;
          if (by && by.player) game.scores[by.player.id] = (game.scores[by.player.id] || 0) + 1;
          for (const bd of hit.bodies) { bd.velocity.x += v.x * 0.25; bd.velocity.z += v.z * 0.25; bd.velocity.y += 1.5; }
          hit.stagger = 0.5; hit.expression = 'oh'; hit.exprTimer = 1;
          hit.lastHitBy = by; hit.lastHitTime = performance.now();
          FP.FX.puffs(p, 14, 0xffffff, 3, 1.3); FP.FX.word(hit.parts.head.position, 'SPLAT!', '#4aa8ff', 1.1);
          FP.Audio.play('splat');
          park(b);
          continue;
        }
        // hit the ground or a fort: splat
        const slowed = b.t > 0.08 && Math.hypot(v.x, v.z) < 6;
        if (p.y < SR + 0.05 || slowed || b.t > 3) {
          for (const f of forts) {
            if (f.hp <= 0) continue;
            if (Math.hypot(p.x - f.x, p.z - f.z) < f.w / 2 + 0.6 && p.y < 1.4) {
              f.hp--;
              f.mesh.scale.y = 0.4 + f.hp * 0.12;
              if (f.hp <= 0) { f.mesh.visible = false; FP.Physics.world.removeBody(f.body); FP.FX.puffs(new THREE.Vector3(f.x, 0.6, f.z), 24, 0xffffff, 4, 1.8); FP.Audio.play('splash'); }
              break;
            }
          }
          FP.FX.puffs(p, 6, 0xffffff, 2, 0.8);
          park(b);
        }
      }
      for (const c of chars) if (pos(c).y < -5) { const s = spawn(chars.indexOf(c), chars.length); FP.Ragdoll.teleport(c, s.x, 0.3, s.z, s.yaw); }
    }
    visual(dt);
    if (roundOver || dt === 0) return null;
    if (time >= TIME) {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `${w[0].name} is the snowball champion!` : "It's a tie!" };
    }
    return null;
  }

  function visual(dt) {
    if (flakes) {
      const a = flakes.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) { let y = a.getY(i) - (dt || 0.016) * 1.2; if (y < 0) y = 14; a.setY(i, y); }
      a.needsUpdate = true;
    }
    for (const f of forts) if (f.hp <= 0 && f.mesh.visible) f.mesh.visible = false;
  }

  // bots: scoop snow behind a fort, then go throw at the closest person
  function botThink(c, chars, dt, input, tools) {
    const p = pos(c), have = ammo.get(c) || 0, br = tools.brain;
    const enemies = chars.filter((o) => o !== c && o.ko <= 0);
    const near = enemies.reduce((a, o) => (!a || pos(o).distanceTo(p) < pos(a).distanceTo(p) ? o : a), null);
    if (have === 0 || br.reloading) {
      br.reloading = have < MAX;
      // hide behind the fort that's between me and the closest enemy
      const f = forts.filter((x) => x.hp > 0).reduce((a, x) => (!a || Math.hypot(x.x - p.x, x.z - p.z) < Math.hypot(a.x - p.x, a.z - p.z) ? x : a), null);
      if (f && near) {
        const q = pos(near), dx = f.x - q.x, dz = f.z - q.z, dl = Math.hypot(dx, dz) || 1;
        const hx = f.x + (dx / dl) * 1.1, hz = f.z + (dz / dl) * 1.1;
        const d = tools.steer(c, hx, hz, input);
        if (d < 0.7) { input.x = 0; input.z = 0; input.grab = true; }
      } else input.grab = true;
      return true;
    }
    if (near) {
      const q = pos(near), d = q.distanceTo(p);
      br.strafe = br.strafe || (Math.random() < 0.5 ? 1 : -1);
      if (d > 9) tools.steer(c, q.x, q.z, input);
      else {
        // face them, step sideways, throw
        const dx = q.x - p.x, dz = q.z - p.z;
        input.x = dx / d * 0.35 + (-dz / d) * 0.6 * br.strafe; input.z = dz / d * 0.35 + (dx / d) * 0.6 * br.strafe;
        if (Math.random() < dt * 0.5) br.strafe *= -1;
        const face = Math.atan2(dx, dz) - c.yaw;
        if (Math.abs(Math.atan2(Math.sin(face), Math.cos(face))) < 0.6 && Math.random() < dt * 3.5) input.punchPressed = true;
      }
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const me = FP.Game.chars.find((c) => c.player && ['keys', 'pad', 'touch'].includes(c.player.source.kind));
    const n = me ? ammo.get(me) || 0 : 0;
    const dots = me ? ` &nbsp; Snowballs: <b>${'O'.repeat(n)}${'-'.repeat(MAX - n)}</b>` : '';
    return `<span>${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}${dots}</span><span class="hud-tip">Hold GRAB to make a snowball &nbsp; PUNCH to throw &nbsp; Hide behind the snow forts!</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#cfe6ff"/><rect x="0" y="54" width="120" height="26" fill="#f4faff"/><rect x="46" y="44" width="30" height="16" rx="4" fill="#fff" stroke="#2a2140" stroke-width="2"/><circle cx="30" cy="26" r="6" fill="#fff" stroke="#2a2140" stroke-width="2"/><path d="M18 30h6M16 25h6" stroke="#2a2140" stroke-width="2" stroke-linecap="round" opacity=".4"/><ellipse cx="94" cy="50" rx="6" ry="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="94" cy="38" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="20" cy="12" r="1.5" fill="#fff"/><circle cx="70" cy="16" r="1.5" fill="#fff"/><circle cx="104" cy="10" r="1.5" fill="#fff"/></svg>';

  self = {
    id: 'snowball', name: 'Snowball Fight', roundsToWin: 1, single: true, minTotal: 2, defaultBots: 3, song: 'chill', minZoom: 16, art: ART,
    desc: 'Hold GRAB to make snowballs, PUNCH to throw them! Hide behind the snow forts. Every hit is a point.',
    build, spawn, control, update, botThink, hud, visual,
    scoreLabel: (s) => `${s} hits`,
    netState: () => ({ t: Math.round(time), f: forts.map((f) => f.hp).join('') }),
    applyNetState: (s) => { time = s.t; (s.f || '').split('').forEach((h, i) => { const f = forts[i]; if (f) { f.hp = +h; f.mesh.scale.y = f.hp > 0 ? 0.4 + f.hp * 0.12 : 1; } }); },
  };
  return self;
})();
