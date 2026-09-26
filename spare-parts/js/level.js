// ============================================================
//  SPARE PARTS — LEVEL BUILDER AND PUZZLE OBJECTS
//  Blocks, buttons, doors, bridges, moving platforms, conveyor
//  belts, squishers, checkpoints and the goal.
//  The level designs themselves are in levels.js.
// ============================================================
window.SP = window.SP || {};

SP.Level = (function () {
  const COLORS = {
    floor: 0xf2e6c9, wall: 0xffffff, red: 0xff5a5f, yellow: 0xffc933, green: 0x5cc96b,
    purple: 0x9b6bff, blue: 0x4aa8ff, pink: 0xff8fc8, grey: 0xb9c2cc, wood: 0xd9a066, dark: 0x5a6270,
  };
  const box = SP.Physics.box;
  const sfx = (n, a) => SP.Audio && SP.Audio.play(n, a);

  function mat(color, extra = {}) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.7 }, extra));
  }

  function mesh(geo, material, shadows = true) {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = shadows; m.receiveShadow = true;
    return m;
  }

  // a stripy texture made with code (for conveyor belts and warning stripes)
  function stripes(c1, c2, n = 8) {
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = c1; g.fillRect(0, 0, 64, 64);
    g.fillStyle = c2;
    for (let i = -n; i < n * 2; i++) {
      g.beginPath();
      g.moveTo(i * 64 / n, 0); g.lineTo(i * 64 / n + 32 / n, 0);
      g.lineTo(i * 64 / n + 32 / n + 64, 64); g.lineTo(i * 64 / n + 64, 64);
      g.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  // a checkered texture for the goal
  function checker() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const g = cv.getContext('2d');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? '#222' : '#fff';
      g.fillRect(x * 16, y * 16, 16, 16);
    }
    return new THREE.CanvasTexture(cv);
  }

  // the factory wall texture: bricks with round windows
  function wallTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = '#e9d8c4'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#dcc8b0';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) g.fillRect(x * 32 + (y % 2) * 16 + 1, y * 16 + 1, 30, 14);
    g.fillStyle = '#9fd8ff'; g.strokeStyle = '#8a6f55'; g.lineWidth = 5;
    g.beginPath(); g.arc(64, 64, 22, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(64, 42); g.lineTo(64, 86); g.moveTo(42, 64); g.lineTo(86, 64); g.stroke();
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  // a big gear for the background
  function gear(radius, color) {
    const g = new THREE.Group();
    const m = mat(color, { metalness: 0.3 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.5, 32), m);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);
    const teeth = Math.round(radius * 6);
    for (let i = 0; i < teeth; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), m);
      const a = (i / teeth) * Math.PI * 2;
      tooth.position.set(Math.cos(a) * (radius + 0.2), Math.sin(a) * (radius + 0.2), 0);
      tooth.rotation.z = a;
      g.add(tooth);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, 0.7, 16), mat(0x555a66));
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    return g;
  }

  // the factory behind the level: a wall with windows, gears and pipes
  function decorate(L, group) {
    let minX = Infinity, maxX = -Infinity;
    for (const b of L.statics) { minX = Math.min(minX, b.min.x); maxX = Math.max(maxX, b.max.x); }
    const width = maxX - minX + 40, cx = (minX + maxX) / 2;
    const tex = wallTexture();
    tex.repeat.set(width / 8, 30 / 8);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, 30), mat(0xffffff, { map: tex }));
    wall.position.set(cx, 0, -20);
    wall.receiveShadow = true;
    group.add(wall);
    const colors = [0xff5a5f, 0xffc933, 0x5cc96b, 0x4aa8ff, 0x9b6bff];
    L.gears = [];
    let i = 0;
    for (let x = minX - 6; x < maxX + 10; x += 9 + (i % 3) * 3) {
      const r = 1.5 + (i % 3) * 0.8;
      const gr = gear(r, colors[i % colors.length]);
      gr.position.set(x, 3 + (i % 2) * 5, -19.5);
      gr.userData.speed = (i % 2 ? 1 : -1) * (0.6 / r);
      group.add(gr);
      L.gears.push(gr);
      // a pipe going up
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 30, 12), mat(0x9aa3ad, { metalness: 0.5 }));
      pipe.position.set(x + 4.5, 0, -19.3);
      group.add(pipe);
      i++;
    }
  }

  // is a robot standing on top of this box?
  function feetOn(r, b) {
    return Math.abs(r.pos.y - b.max.y) < 0.12 &&
      r.pos.x > b.min.x - r.halfW * 0.6 && r.pos.x < b.max.x + r.halfW * 0.6 &&
      r.pos.z > b.min.z - r.halfW * 0.6 && r.pos.z < b.max.z + r.halfW * 0.6;
  }
  const inside = (p, b, pad = 0) =>
    p.x > b.min.x - pad && p.x < b.max.x + pad && p.z > b.min.z - pad && p.z < b.max.z + pad &&
    p.y > b.min.y - 0.5 && p.y < b.max.y + 0.6;

  // ------------------------------------------------------------
  function build(scene, data) {
    const group = new THREE.Group();
    const L = {
      data, group, time: 0, statics: [], solids: [],
      buttons: {}, doors: [], platforms: [], conveyors: [], squishers: [], checkpoints: [],
      goal: null, hints: data.hints || [], spawns: data.spawns, won: false,
      coins: [], coinsGot: 0, bouncers: [],
    };

    for (const [x, y, z, w, h, d, c] of data.blocks) {
      const m = mesh(new THREE.BoxGeometry(w, h, d), mat(COLORS[c] || c));
      m.position.set(x, y, z);
      group.add(m);
      L.statics.push(box(x, y, z, w, h, d));
    }

    // BUTTONS: stand on them, or put an arm or leg on them
    for (const b of data.buttons || []) {
      const size = b.size || 1.8;
      const base = mesh(new THREE.CylinderGeometry(size * 0.6, size * 0.65, 0.12, 24), mat(0x444a55));
      base.position.set(b.x, b.y + 0.06, b.z);
      const cap = mesh(new THREE.CylinderGeometry(size * 0.48, size * 0.48, 0.14, 24), mat(0xff4455, { emissive: 0x551111 }));
      cap.position.set(b.x, b.y + 0.18, b.z);
      group.add(base, cap);
      L.buttons[b.id] = { ...b, size, cap, pressed: false, area: box(b.x, b.y + 0.3, b.z, size, 0.8, size) };
    }

    // DOORS disappear into the floor when their buttons are pressed.
    // BRIDGES (and stairs) do the opposite: they appear when pressed.
    for (const d of data.doors || []) {
      const [x, y, z, w, h, dd] = d.box;
      const kind = d.kind || 'door';
      const material = kind === 'door'
        ? mat(0xffffff, { map: stripes('#ffcc22', '#222222', 4) })
        : mat(COLORS[d.color] || 0x7fd8ff, { transparent: true, opacity: 0.9 });
      const m = mesh(new THREE.BoxGeometry(w, h, dd), material);
      m.position.set(x, y, z);
      group.add(m);
      L.doors.push({ ...d, kind, need: [].concat(d.open), mesh: m, t: 0, solidBox: box(x, y, z, w, h, dd), base: new THREE.Vector3(x, y, z), h });
    }

    // MOVING PLATFORMS go back and forth (some only move while a button is pressed)
    for (const p of data.platforms || []) {
      const [x, y, z, w, h, d] = p.box;
      const m = mesh(new THREE.BoxGeometry(w, h, d), mat(COLORS[p.color || 'blue']));
      group.add(m);
      const stripe = mesh(new THREE.BoxGeometry(w * 1.01, 0.08, d * 1.01), mat(0xffffff, { map: stripes('#ffcc22', '#333', 6) }), false);
      stripe.position.y = h / 2 - 0.03;
      m.add(stripe);
      L.platforms.push({
        ...p, mesh: m, w, h, d, start: new THREE.Vector3(x, y, z), move: new THREE.Vector3(...p.to),
        phase: p.offset || 0, pos: new THREE.Vector3(x, y, z), delta: new THREE.Vector3(), solidBox: box(x, y, z, w, h, d),
      });
    }

    // CONVEYOR BELTS carry you along
    for (const c of data.conveyors || []) {
      const [x, y, z, w, h, d] = c.box;
      const tex = stripes('#3b4250', '#8a93a3', 6);
      tex.repeat.set(w / 2, d / 2);
      tex.rotation = Math.atan2(c.dir[1], c.dir[0]);
      const m = mesh(new THREE.BoxGeometry(w, h, d), [mat(0x3b4250), mat(0x3b4250), mat(0xffffff, { map: tex }), mat(0x3b4250), mat(0x3b4250), mat(0x3b4250)]);
      m.position.set(x, y, z);
      group.add(m);
      const b = box(x, y, z, w, h, d);
      L.statics.push(b);
      L.conveyors.push({ ...c, tex, solidBox: b });
    }

    // SQUISHERS slam down... don't be underneath!
    for (const s of data.squishers || []) {
      const g = new THREE.Group();
      const head = mesh(new THREE.BoxGeometry(s.w, 0.8, s.d), mat(0xffffff, { map: stripes('#ff4455', '#222', 5) }));
      const rod = mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 10), mat(0x9aa3ad, { metalness: 0.6 }));
      rod.position.y = 3.4;
      g.add(head, rod);
      group.add(g);
      L.squishers.push({ ...s, mesh: g, y: s.top, hurtBox: box(s.x, s.top, s.z, s.w, 0.8, s.d) });
    }

    // GOLDEN BOLTS to collect
    for (const [x, y, z] of data.coins || []) {
      const g = new THREE.Group();
      const gold = mat(0xffcc33, { metalness: 0.8, roughness: 0.25, emissive: 0x553300 });
      const nut = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.16, 6), gold);
      nut.rotation.x = Math.PI / 2;
      const hole = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.18, 12), mat(0x7a5a10));
      hole.rotation.x = Math.PI / 2;
      g.add(nut, hole);
      g.position.set(x, y, z);
      group.add(g);
      L.coins.push({ mesh: g, pos: new THREE.Vector3(x, y, z), got: false });
    }

    // TRAMPOLINES: land on them to bounce super high
    for (const b of data.bouncers || []) {
      const size = b.size || 1.6;
      const g = new THREE.Group();
      const frame = mesh(new THREE.CylinderGeometry(size * 0.55, size * 0.6, 0.3, 20), mat(0x3d9cff));
      frame.position.y = 0.15;
      const top = mesh(new THREE.CylinderGeometry(size * 0.48, size * 0.48, 0.06, 20), mat(0xff5a5f));
      top.position.y = 0.3;
      g.add(frame, top);
      g.position.set(b.x, b.y, b.z);
      group.add(g);
      const bb = box(b.x, b.y + 0.15, b.z, size, 0.3, size);
      L.statics.push(bb);
      L.bouncers.push({ ...b, box: bb, top, squish: 0 });
    }

    // CHECKPOINT flags: if you fall, you come back here
    for (const [x, y, z] of data.checkpoints || []) {
      const g = new THREE.Group();
      const pole = mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 8), mat(0xdddddd, { metalness: 0.5 }));
      pole.position.y = 1.1;
      const flag = mesh(new THREE.BoxGeometry(0.7, 0.45, 0.04), mat(0xaaaaaa));
      flag.position.set(0.36, 1.9, 0);
      g.add(pole, flag);
      g.position.set(x, y, z);
      group.add(g);
      L.checkpoints.push({ pos: new THREE.Vector3(x, y, z), flag, reached: false });
    }

    // GOAL: both robots stand here to finish the level
    if (data.goal) {
      const [x, y, z] = data.goal;
      const g = new THREE.Group();
      const pad = mesh(new THREE.BoxGeometry(3, 0.1, 3), mat(0xffffff, { map: checker() }));
      pad.position.y = 0.05;
      g.add(pad);
      // a rainbow arch
      const colors = [0xff5a5f, 0xffc933, 0x5cc96b, 0x4aa8ff, 0x9b6bff];
      colors.forEach((c, i) => {
        const arch = mesh(new THREE.TorusGeometry(1.9 - i * 0.12, 0.06, 8, 32, Math.PI), mat(c));
        arch.position.y = 0.1;
        g.add(arch);
      });
      // balloons
      const balloons = [];
      for (let i = 0; i < 4; i++) {
        const b = mesh(new THREE.SphereGeometry(0.28, 14, 10), mat(colors[i], { roughness: 0.3 }));
        b.scale.y = 1.2;
        b.position.set(i < 2 ? -1.6 : 1.6, 2.4 + (i % 2) * 0.5, (i % 2 ? 0.3 : -0.3));
        g.add(b);
        balloons.push(b);
      }
      g.position.set(x, y, z);
      group.add(g);
      L.goal = { box: box(x, y + 0.5, z, 3, 1.2, 3), balloons, group: g };
    }

    decorate(L, group);
    scene.add(group);
    refreshSolids(L);
    return L;
  }

  function refreshSolids(L) {
    L.solids = L.statics.slice();
    for (const d of L.doors) {
      const solid = d.kind === 'door' ? d.t < 0.6 : d.t > 0.4;
      if (solid) L.solids.push(d.solidBox);
    }
    for (const p of L.platforms) L.solids.push(p.solidBox);
  }

  const pressedAll = (L, ids) => ids.every((id) => L.buttons[id] && L.buttons[id].pressed);
  const pressedAny = (L, ids) => ids.some((id) => L.buttons[id] && L.buttons[id].pressed);

  // ------------------------------------------------------------
  //  update everything; `events` tells the game what happened
  function update(L, dt, robots, limbs) {
    L.time += dt;
    for (const g of L.gears) g.rotation.z += g.userData.speed * dt;
    const events = { hint: null, win: false, squished: [], checkpoint: null, coin: false };
    const loose = limbs.filter((l) => l.state === 'loose' || l.state === 'flying');

    // buttons
    for (const id in L.buttons) {
      const b = L.buttons[id];
      const now = robots.some((r) => inside(r.pos, b.area, 0.2)) || loose.some((l) => inside(l.pos, b.area, 0.1));
      if (now !== b.pressed) sfx(now ? 'button' : 'buttonUp');
      b.pressed = now;
      b.cap.position.y = b.y + (now ? 0.09 : 0.18);
      b.cap.material.color.setHex(now ? 0x44dd66 : 0xff4455);
      b.cap.material.emissive.setHex(now ? 0x115522 : 0x551111);
    }

    // doors and bridges
    for (const d of L.doors) {
      const want = pressedAll(L, d.need) ? 1 : 0;
      if (want !== d.lastWant && d.lastWant !== undefined) sfx('door');
      d.lastWant = want;
      d.t += Math.sign(want - d.t) * Math.min(Math.abs(want - d.t), dt * 3);
      if (d.kind === 'door') {
        d.mesh.position.y = d.base.y - d.h * d.t * 0.98;
      } else {
        d.mesh.scale.set(1, Math.max(0.01, d.t), 1);
        d.mesh.visible = d.t > 0.01;
      }
    }

    // moving platforms (and carrying whatever stands on them)
    for (const p of L.platforms) {
      const running = !p.needs || pressedAll(L, [].concat(p.needs));
      if (running) p.phase += dt * (p.speed || 0.5);
      const k = 0.5 - 0.5 * Math.cos(p.phase * Math.PI);
      const next = p.start.clone().addScaledVector(p.move, k);
      p.delta.subVectors(next, p.pos);
      const oldBox = p.solidBox;
      for (const r of robots) if (feetOn(r, oldBox)) r.pos.add(p.delta);
      for (const l of loose) if (l.onGround && feetOn({ pos: l.pos, halfW: 0.2 }, oldBox)) l.pos.add(p.delta);
      p.pos.copy(next);
      p.mesh.position.copy(next);
      p.solidBox = box(next.x, next.y, next.z, p.w, p.h, p.d);
    }

    // conveyor belts
    for (const c of L.conveyors) {
      const len = Math.hypot(c.dir[0], c.dir[1]);
      const mx = c.dir[0] / len * c.speed * dt, mz = c.dir[1] / len * c.speed * dt;
      for (const r of robots) if (feetOn(r, c.solidBox)) { r.pos.x += mx; r.pos.z += mz; }
      for (const l of loose) if (feetOn({ pos: l.pos, halfW: 0.2 }, c.solidBox)) { l.pos.x += mx; l.pos.z += mz; }
      c.tex.offset.x -= c.speed * dt * 0.5;
    }

    // squishers
    for (const s of L.squishers) {
      const stopped = s.stop && pressedAny(L, [].concat(s.stop));
      let target;
      if (stopped) target = s.top;
      else {
        const ph = ((L.time / (s.period || 2.4)) + (s.offset || 0)) % 1;
        // wait at the top, SLAM down, wait at the bottom, slowly go back up
        if (ph < 0.45) target = s.top;
        else if (ph < 0.52) target = s.top - (s.top - s.bottom) * ((ph - 0.45) / 0.07);
        else if (ph < 0.7) target = s.bottom;
        else target = s.bottom + (s.top - s.bottom) * ((ph - 0.7) / 0.3);
      }
      const wasHigh = s.y > s.bottom + 0.3;
      s.y = stopped ? s.y + (target - s.y) * Math.min(1, dt * 4) : target;
      if (wasHigh && s.y <= s.bottom + 0.01) sfx('kick');
      s.mesh.position.set(s.x, s.y, s.z);
      s.hurtBox = box(s.x, s.y, s.z, s.w, 0.8, s.d);
      const falling = !stopped && s.y < s.top - 0.2;
      for (const r of robots) {
        if (!r.squished && falling && SP.Physics.overlap(SP.Physics.bodyBox(r), s.hurtBox)) events.squished.push(r);
      }
    }

    // golden bolts spin; touch one to collect it
    for (const c of L.coins) {
      if (c.got) continue;
      c.mesh.rotation.y += dt * 3;
      c.mesh.position.y = c.pos.y + Math.sin(L.time * 3 + c.pos.x) * 0.12;
      if (robots.some((r) => Math.hypot(r.pos.x - c.pos.x, r.pos.y + 0.9 - c.pos.y, r.pos.z - c.pos.z) < 1.1)) {
        c.got = true; c.mesh.visible = false; L.coinsGot++; events.coin = c.pos;
      }
    }

    // trampolines
    for (const b of L.bouncers) {
      for (const r of robots) {
        if (r.vel.y <= 0.1 && feetOn(r, b.box)) {
          r.vel.y = b.power || 17; r.onGround = false; b.squish = 1;
          sfx('superJump'); r.squashVel += 10;
        }
      }
      b.squish = Math.max(0, b.squish - dt * 4);
      b.top.position.y = 0.3 - b.squish * 0.15;
    }

    // checkpoints
    for (const c of L.checkpoints) {
      if (c.reached) continue;
      if (robots.some((r) => r.pos.distanceTo(c.pos) < 1.6)) {
        c.reached = true;
        c.flag.material.color.setHex(0x44dd66);
        events.checkpoint = c.pos;
      }
    }

    // goal
    if (L.goal) {
      L.goal.balloons.forEach((b, i) => { b.position.y = 2.4 + (i % 2) * 0.5 + Math.sin(L.time * 2 + i) * 0.15; });
      if (!L.won && robots.every((r) => inside(r.pos, L.goal.box, 0.2))) { L.won = true; events.win = true; }
    }

    // hints: show the text of any hint spot a robot is standing near
    for (const h of L.hints) {
      if (robots.some((r) => Math.hypot(r.pos.x - h.x, r.pos.z - h.z) < (h.r || 3))) { events.hint = h.text; break; }
    }

    refreshSolids(L);
    return events;
  }

  function destroy(scene, L) {
    scene.remove(L.group);
    L.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
  }

  return { build, update, destroy, COLORS };
})();
