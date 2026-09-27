// ============================================================
//  FLOPPY PARTY — CHICKEN ROUND-UP
//  Silly chickens run around the farm. Grab one (hold grab),
//  carry it to YOUR pen (your color) and let go: +1 point.
//  Golden chickens are worth 3! Chickens run away from you,
//  so you can also chase them into your pen.
//  Most points after 90 seconds wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.chickens = (function () {
  const TIME = 90, SIZE = 18, PEN = 4.2, COUNT = 9, INNER = SIZE / 2 - PEN;
  const CORNERS = [[-1, -1], [1, 1], [1, -1], [-1, 1]];
  let chickens = [], pens = [], time = 0, respawn = null, self = null;

  function chickenMesh(gold) {
    const g = new THREE.Group();
    const white = gold ? 0xffcf33 : 0xffffff;
    const body = FP.Look.mesh(new THREE.SphereGeometry(0.32, 16, 12), FP.Look.toon(white), 0.03);
    body.scale.set(1, 0.9, 1.15);
    const head = FP.Look.mesh(new THREE.SphereGeometry(0.19, 14, 10), FP.Look.toon(white), 0.025);
    head.position.set(0, 0.3, 0.26);
    const comb = FP.Look.mesh(new THREE.SphereGeometry(0.08, 10, 8), FP.Look.toon(0xff5a5f), 0.015);
    comb.scale.set(0.6, 1.2, 1.4); comb.position.set(0, 0.5, 0.26);
    const beak = FP.Look.mesh(new THREE.ConeGeometry(0.06, 0.14, 8), FP.Look.toon(0xff9a3c), 0.01);
    beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.28, 0.46);
    const ink = new THREE.MeshBasicMaterial({ color: 0x1d1a2f });
    for (const x of [-0.09, 0.09]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), ink); e.position.set(x, 0.35, 0.41); g.add(e); }
    const wings = [];
    for (const s of [-1, 1]) {
      const w = FP.Look.mesh(new THREE.SphereGeometry(0.16, 10, 8), FP.Look.toon(gold ? 0xffb020 : 0xf1ecf5), 0.015);
      w.scale.set(0.35, 0.7, 1); w.position.set(s * 0.3, 0.02, -0.02);
      g.add(w); wings.push(w);
    }
    const legs = [];
    for (const s of [-1, 1]) {
      const l = FP.Look.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), FP.Look.toon(0xff9a3c), 0);
      l.position.set(s * 0.11, -0.3, 0.02);
      g.add(l); legs.push(l);
    }
    g.add(body, head, comb, beak);
    g.userData = { wings, legs };
    return g;
  }

  function build(list) {
    chickens = []; pens = []; time = 0;
    respawn = FP.Kit.respawner((c) => spawn(Math.max(0, pens.findIndex((pn) => pn.player && c.player && pn.player.id === c.player.id))));
    const S = FP.Stage;
    S.island(0, -1, 0, SIZE, 2, SIZE, { grass: 0x8fd35f });
    // a low wooden fence around the farm (so chickens don't jump off)
    for (const s of [-1, 1]) {
      S.block(0, 0.3, s * (SIZE / 2 - 0.15), SIZE, 0.6, 0.3, 0xc98b58);
      S.block(s * (SIZE / 2 - 0.15), 0.3, 0, 0.3, 0.6, SIZE, 0xc98b58);
    }
    // one pen in each corner, in the player's color
    CORNERS.forEach(([sx, sz], i) => {
      const p = list[i] || null;
      const color = p ? FP.Look.COLORS[p.colorIndex].body : 0xcfc6b8;
      const cx = sx * (SIZE / 2 - PEN / 2), cz = sz * (SIZE / 2 - PEN / 2);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(PEN - 0.3, PEN - 0.3), FP.Look.toon(color));
      floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0.05, cz);
      S.add(floor);
      // little fence posts on the two inside edges (the pen is open, so you can walk in)
      for (let k = 0; k <= 4; k++) {
        const t = k / 4;
        const post = FP.Look.mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.7, 8), FP.Look.toon(0xffffff), 0.015);
        post.position.set(sx * INNER, 0.35, sz * (INNER + t * PEN));
        S.add(post);
        if (k > 0) { const post2 = post.clone(); post2.position.set(sx * (INNER + t * PEN), 0.35, sz * INNER); S.add(post2); }
      }
      const barn = new THREE.Group();
      const wall = FP.Look.boxMesh(1.6, 1.2, 1.2, FP.Look.toon(0xff5a5f));
      wall.position.y = 0.6;
      const roof = FP.Look.mesh(new THREE.ConeGeometry(1.3, 0.8, 4), FP.Look.toon(0xf1ecf5), 0.03);
      roof.rotation.y = Math.PI / 4; roof.position.y = 1.6;
      barn.add(wall, roof);
      barn.position.set(sx * (SIZE / 2 - 1.1), 0, sz * (SIZE / 2 - 1.1));
      barn.rotation.y = Math.atan2(-sx, -sz);
      S.add(barn);
      const bb = FP.Physics.staticBox(barn.position.x, 0.8, barn.position.z, 1.3, 1.6, 1.3);
      S.bodies.push(bb);
      pens.push({ sx, sz, cx, cz, player: p });
    });
    // the chickens
    for (let i = 0; i < COUNT; i++) {
      const gold = i === 0;
      const body = new CANNON.Body({ mass: 0.5, material: FP.Physics.mats.prop, linearDamping: 0.2, fixedRotation: true,
        collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.ALL });
      body.addShape(new CANNON.Sphere(0.32));
      body.updateMassProperties();
      const a = (i / COUNT) * Math.PI * 2;
      body.position.set(Math.cos(a) * 2.5, 0.4, Math.sin(a) * 2.5);
      const ch = { ...FP.Stage.prop(chickenMesh(gold), body), gold, tx: 0, tz: 0, retarget: 0, yaw: a, flap: 0, cool: 0 };
      chickens.push(ch);
    }
    // haystacks
    for (const [x, z] of [[0, -3.5], [0, 3.5]]) {
      const hay = FP.Look.mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.9, 16), FP.Look.toon(0xf3d36b), 0.03);
      hay.rotation.z = Math.PI / 2; hay.position.set(x, 0.7, z);
      S.add(hay);
      const hb = FP.Physics.staticBox(x, 0.7, z, 0.9, 1.4, 1.4);
      S.bodies.push(hb);
    }
    FP.Camera.setAngle(0.9, 0.78);
  }

  function spawn(i) {
    const [sx, sz] = CORNERS[i % 4];
    return { x: sx * (INNER - 1), y: 0.2, z: sz * (INNER - 1), yaw: Math.atan2(-sx, -sz) };
  }

  const heldBy = (ch) => FP.Game.chars.find((c) => c.grab.some((gr) => gr && gr.body === ch.body));
  const penAt = (x, z) => pens.find((p) => p.sx * x > INNER && p.sz * z > INNER);

  function respawnChicken(ch) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 2;
    ch.body.position.set(Math.cos(a) * r, 2.5, Math.sin(a) * r);
    ch.body.velocity.set(0, 0, 0);
    ch.cool = 1;
  }

  // chickens run around on their own (and run away from people)
  function beforeStep(dt, chars) {
    if (FP.Game.state !== 'play') return;
    for (const ch of chickens) {
      const b = ch.body;
      if (heldBy(ch)) { ch.flap = 1; continue; }
      if (b.position.y > 0.6) continue; // in the air: no running
      ch.retarget -= dt;
      if (ch.retarget <= 0) {
        ch.retarget = 1.5 + Math.random() * 2;
        ch.tx = (Math.random() - 0.5) * INNER * 1.8; ch.tz = (Math.random() - 0.5) * INNER * 1.8;
      }
      let dx = ch.tx - b.position.x, dz = ch.tz - b.position.z;
      const dl = Math.hypot(dx, dz) || 1;
      dx /= dl; dz /= dl;
      let speed = 1.3, scared = false;
      for (const c of chars) {
        if (c.ko > 0) continue;
        const p = c.parts.torso.position;
        const ox = b.position.x - p.x, oz = b.position.z - p.z, d = Math.hypot(ox, oz);
        if (d < 2.6 && d > 0.01) { dx += (ox / d) * (2.6 - d) * 1.4; dz += (oz / d) * (2.6 - d) * 1.4; scared = true; }
      }
      if (scared) { speed = 3.3; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
      b.velocity.x += (dx * speed - b.velocity.x) * Math.min(1, dt * 6);
      b.velocity.z += (dz * speed - b.velocity.z) * Math.min(1, dt * 6);
      if (scared && Math.random() < dt * 1.5) { b.velocity.y = 2.6; ch.flap = 0.6; if (Math.random() < 0.4) FP.Audio.play('cluck'); }
    }
  }

  function visual(dt) {
    const t = performance.now() / 1000, step = dt || 0.016;
    const client = FP.Net && FP.Net.isClient && FP.Net.isClient();
    for (const ch of chickens) {
      const mp = ch.mesh.position;
      // speed from how far the chicken moved (works for online friends too)
      const v = ch.last ? Math.hypot(mp.x - ch.last.x, mp.z - ch.last.z) / step : 0;
      ch.last = { x: mp.x, z: mp.z };
      if (!client && !heldBy(ch)) { // never turn a chicken someone is holding (it would yank their arms)
        const b = ch.body;
        if (Math.hypot(b.velocity.x, b.velocity.z) > 0.4) ch.yaw = Math.atan2(b.velocity.x, b.velocity.z);
        b.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), ch.yaw);
      }
      ch.flap = Math.max(0, ch.flap - step * 2);
      const u = ch.mesh.userData;
      const flapA = (ch.flap > 0 || mp.y > 0.6 ? 0.9 : 0.1) * Math.sin(t * 30);
      u.wings[0].rotation.z = 0.2 + flapA; u.wings[1].rotation.z = -0.2 - flapA;
      const swing = Math.sin(t * 18 + ch.yaw) * Math.min(1, v / 2) * 0.5;
      u.legs[0].rotation.x = swing; u.legs[1].rotation.x = -swing;
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const ch of chickens) {
        ch.cool -= dt;
        const b = ch.body;
        if (b.position.y < -4) { respawnChicken(ch); continue; }
        if (ch.cool > 0 || b.position.y > 1.2 || heldBy(ch)) continue;
        const pen = penAt(b.position.x, b.position.z);
        if (!pen) continue;
        const pos = new THREE.Vector3(b.position.x, 1.4, b.position.z);
        const pts = ch.gold ? 3 : 1;
        if (pen.player) {
          const id = pen.player.id;
          game.scores[id] = (game.scores[id] || 0) + pts;
          FP.FX.word(pos, ch.gold ? 'GOLDEN! +3' : '+1', '#ffcf33', ch.gold ? 1.4 : 1.1);
          FP.FX.stars(pos, 5);
          FP.Audio.play('coin');
        } else FP.FX.word(pos, 'Empty pen!', '#8a8fa0', 1);
        FP.Audio.play('cluck');
        FP.FX.puffs(pos, 10, 0xffffff, 3);
        respawnChicken(ch);
      }
      respawn.update(chars, dt, -5);
    }
    visual(dt);
    if (roundOver || dt === 0) return null;
    if (time >= TIME) {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `${w[0].name} is the best farmer!` : "It's a tie!" };
    }
    return null;
  }

  // bot brain: grab a chicken (golden first), carry it home, let go in the pen
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain;
    const p = c.parts.torso.position;
    const mine = pens.find((pn) => pn.player && c.player && pn.player.id === c.player.id);
    const holding = c.grab.find((gr) => gr && chickens.some((ch) => ch.body === gr.body));
    if (holding && mine) {
      input.grab = true;
      tools.steer(c, mine.cx, mine.cz, input);
      const hp = holding.body.position;
      if (mine.sx * hp.x > INNER + 0.4 && mine.sz * hp.z > INNER + 0.4) input.grab = false;
      tools.unstick(input);
      return true;
    }
    b.chickT = (b.chickT || 0) + dt;
    if (!b.chick || heldBy(b.chick) || b.chickT > 6 || b.chick.cool > 0) {
      b.chickT = 0;
      let best = null, bd = Infinity;
      for (const ch of chickens) {
        if (heldBy(ch) || ch.cool > 0) continue;
        const d = Math.hypot(ch.body.position.x - p.x, ch.body.position.z - p.z) - (ch.gold ? 4 : 0) + Math.random() * 2;
        if (d < bd) { bd = d; best = ch; }
      }
      b.chick = best;
    }
    if (b.chick) {
      const cp = b.chick.body.position;
      // run a little ahead of the chicken (they run away!)
      const lx = cp.x + b.chick.body.velocity.x * 0.35, lz = cp.z + b.chick.body.velocity.z * 0.35;
      tools.steer(c, lx, lz, input);
      const d = Math.hypot(cp.x - p.x, cp.z - p.z);
      if (d < 1.5) input.grab = true;
      if (d < 2.2 && cp.y > 0.5 && Math.random() < dt * 2 && c.grounded) input.jumpPressed = true;
    }
    // bump people who are carrying chickens
    for (const o of chars) {
      if (o === c || o.ko > 0) continue;
      if (o.grab.some((gr) => gr && chickens.some((ch) => ch.body === gr.body)) && o.parts.torso.position.distanceTo(p) < 1.3 && Math.random() < dt * 3) input.punchPressed = true;
    }
    tools.unstick(input);
    return true;
  }

  function hud() { return `Carry chickens to your pen! Golden = 3 &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><rect x="0" y="54" width="120" height="26" fill="#8fd35f"/><path d="M6 50h108" stroke="#c98b58" stroke-width="4"/><path d="M14 44v12M34 44v12M86 44v12M106 44v12" stroke="#c98b58" stroke-width="4"/><g stroke="#2a2140" stroke-width="2"><ellipse cx="44" cy="54" rx="13" ry="11" fill="#fff"/><circle cx="54" cy="42" r="7" fill="#fff"/><path d="M52 34c2-4 5-4 6 0" fill="#ff5a5f"/><path d="M60 42l6 2-6 2z" fill="#ff9a3c"/></g><g stroke="#2a2140" stroke-width="2"><ellipse cx="84" cy="60" rx="10" ry="8" fill="#ffcf33"/><circle cx="92" cy="51" r="5" fill="#ffcf33"/><path d="M96 51l5 1-5 2z" fill="#ff9a3c"/></g><circle cx="55" cy="41" r="1.4" fill="#2a2140"/></svg>';

  self = {
    id: 'chickens', name: 'Chicken Round-up', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 3, song: 'chill', minZoom: 14, art: ART,
    desc: 'Grab the running chickens and carry them to your pen! The golden chicken is worth 3.',
    build, spawn, beforeStep, update, botThink, hud, visual,
    scoreLabel: (s) => `${s} chicken${s === 1 ? '' : 's'}`,
  };
  return self;
})();
