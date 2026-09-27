// ============================================================
//  FLOPPY PARTY — FRUIT FRENZY
//  Fruit falls from the giant tree! Watch the shadows on the
//  ground and stand under the fruit to catch it with your head.
//  Apples, oranges and grapes: +1. Golden apple: +3. But dodge
//  the ROTTEN fruit: -1 and you get knocked out!
//  Most points after 60 seconds wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.fruit = (function () {
  const TIME = 60, SIZE = 13, POOL = 14, START_Y = 10, FALL = 5;
  const KINDS = {
    apple: { color: 0xff4a4a, pts: 1 },
    orange: { color: 0xff9a3c, pts: 1 },
    grape: { color: 0x9b5bff, pts: 1 },
    gold: { color: 0xffcf33, pts: 3 },
    rotten: { color: 0x7a8a3a, pts: -1 },
  };
  const KIND_LIST = Object.keys(KINDS);
  let respawn = null, fruits = [], time = 0, next = 0, self = null;

  function fruitMesh(kind) {
    const g = new THREE.Group();
    const k = KINDS[kind];
    if (kind === 'grape') {
      for (const [x, y, z] of [[0, 0, 0], [0.16, 0.05, 0.05], [-0.16, 0.05, 0.05], [0, 0.08, -0.15], [0.08, -0.14, 0.05], [-0.08, -0.14, 0.05], [0, -0.26, 0]]) {
        const b = FP.Look.mesh(new THREE.SphereGeometry(0.13, 10, 8), FP.Look.toon(k.color), 0.02);
        b.position.set(x, y + 0.1, z); g.add(b);
      }
    } else {
      const body = FP.Look.mesh(new THREE.SphereGeometry(0.3, 16, 12), FP.Look.toon(k.color), 0.03);
      if (kind === 'apple' || kind === 'gold') body.scale.set(1, 0.9, 1);
      g.add(body);
      if (kind === 'rotten') {
        for (const [x, y, z] of [[0.15, 0.1, 0.22], [-0.18, -0.05, 0.2], [0.05, -0.2, 0.22]]) {
          const spot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0x4a3a20 }));
          spot.position.set(x, y, z); g.add(spot);
        }
        // little flies buzzing around
        const flies = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0x1d1a2f }));
          f.position.set(Math.cos(i * 2.1) * 0.45, 0.35, Math.sin(i * 2.1) * 0.45);
          flies.add(f);
        }
        g.add(flies);
        g.userData.flies = flies;
      }
    }
    if (kind !== 'grape') {
      const stem = FP.Look.mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 6), FP.Look.toon(0x6a4a2a), 0);
      stem.position.y = 0.32; g.add(stem);
    }
    const leaf = FP.Look.mesh(new THREE.SphereGeometry(0.09, 8, 6), FP.Look.toon(kind === 'rotten' ? 0x6a6a3a : 0x5cc44a), 0.01);
    leaf.scale.set(1.4, 0.3, 0.7); leaf.position.set(0.1, kind === 'grape' ? 0.26 : 0.36, 0); g.add(leaf);
    return g;
  }

  function build() {
    respawn = FP.Kit.respawner((c) => spawn(Math.max(0, FP.Game.chars.indexOf(c)), FP.Game.chars.length));
    fruits = []; time = 0; next = 1.2;
    const S = FP.Stage;
    S.island(0, -1, 0, SIZE, 2, SIZE, { grass: 0x86d15f });
    // a giant tree overhead (just the leafy top, high up, so the camera sees under it)
    const crown = new THREE.Group();
    for (const [x, y, z, r] of [[0, 0, 0, 4], [-3.5, -0.5, 1, 3], [3.5, -0.3, -1, 3.2], [0, 0.4, -3.5, 3], [1, -0.6, 3.5, 2.6]]) {
      const puff = FP.Look.mesh(new THREE.SphereGeometry(r, 18, 14), FP.Look.toon(0x4fae45), 0.06);
      puff.position.set(x, y, z); crown.add(puff);
    }
    crown.position.set(0, 20, -4);
    S.add(crown);
    const trunk = FP.Look.mesh(new THREE.CylinderGeometry(0.9, 1.3, 20, 14), FP.Look.toon(0x8a5a3a), 0.05);
    trunk.position.set(0, 9, -SIZE / 2 - 1.5); S.add(trunk);
    const tb = FP.Physics.staticBox(0, 9, -SIZE / 2 - 1.5, 1.8, 20, 1.8); S.bodies.push(tb);
    // baskets in the corners (just for looks)
    for (const [x, z] of [[-SIZE / 2 + 0.8, SIZE / 2 - 0.8], [SIZE / 2 - 0.8, SIZE / 2 - 0.8]]) {
      const basket = FP.Look.mesh(new THREE.CylinderGeometry(0.6, 0.45, 0.6, 14, 1, true), FP.Look.toon(0xc98b58, { side: THREE.DoubleSide }), 0.03);
      basket.position.set(x, 0.3, z); S.add(basket);
      for (let i = 0; i < 4; i++) { const f = fruitMesh(KIND_LIST[i % 3]); f.scale.setScalar(0.8); f.position.set(x + Math.cos(i * 1.7) * 0.25, 0.55 + (i % 2) * 0.1, z + Math.sin(i * 1.7) * 0.25); S.add(f); }
    }
    // the fruit pool: every kind of fruit, made now and parked out of sight until it falls
    for (let i = 0; i < POOL; i++) {
      const kind = i < 2 ? 'gold' : i < 6 ? 'rotten' : KIND_LIST[i % 3];
      const m = fruitMesh(kind);
      m.position.set(0, -100, 0);
      const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: kind === 'rotten' ? 0x5a2a1a : 0x1d1a2f, transparent: true, opacity: 0 }));
      shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, 0.05, 0); shadow.visible = false;
      S.add(m, shadow);
      fruits.push({ kind, mesh: m, shadow, on: false, x: 0, z: 0, y: -100, spin: Math.random() * 6 });
    }
    FP.Camera.setAngle(0.95, 0.75);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 2.5, 2.5, Math.PI / 4); }

  function drop() {
    // rotten fruit gets more common as time goes on
    const r = Math.random();
    const want = r < 0.08 ? 'gold' : r < 0.22 + Math.min(0.12, time * 0.003) ? 'rotten' : 'normal';
    const free = fruits.filter((f) => !f.on && (want === 'normal' ? !['gold', 'rotten'].includes(f.kind) : f.kind === want));
    if (!free.length) return;
    const f = free[Math.floor(Math.random() * free.length)];
    f.on = true; f.y = START_Y;
    f.x = (Math.random() - 0.5) * (SIZE - 2); f.z = (Math.random() - 0.5) * (SIZE - 2);
  }

  function visual(dt) {
    const t = performance.now() / 1000;
    for (const f of fruits) {
      if (!f.on) { f.mesh.position.y = -100; f.shadow.visible = false; continue; }
      f.mesh.position.set(f.x, f.y, f.z);
      f.mesh.rotation.y = t * 2 + f.spin;
      f.shadow.visible = true;
      f.shadow.position.set(f.x, 0.05, f.z);
      const near = 1 - Math.max(0, Math.min(1, f.y / START_Y));
      f.shadow.scale.setScalar(0.4 + near * 0.8);
      f.shadow.material.opacity = 0.15 + near * 0.4;
      if (f.mesh.userData.flies) f.mesh.userData.flies.rotation.y = t * 9;
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      next -= dt;
      if (next <= 0) { drop(); if (time > 25 && Math.random() < 0.45) drop(); next = Math.max(0.3, 0.8 - time * 0.006); }
      for (const f of fruits) {
        if (!f.on) continue;
        f.y -= FALL * dt * (f.kind === 'gold' ? 1.25 : 1);
        // caught by someone's head?
        if (f.y < 2.4 && f.y > 0.9) {
          const c = chars.find((ch) => ch.ko <= 0 && Math.hypot(ch.parts.head.position.x - f.x, ch.parts.head.position.z - f.z) < 0.75 && Math.abs(ch.parts.head.position.y - f.y) < 0.9);
          if (c) {
            const k = KINDS[f.kind], id = c.player.id;
            game.scores[id] = (game.scores[id] || 0) + k.pts;
            const pos = new THREE.Vector3(f.x, f.y + 0.5, f.z);
            if (f.kind === 'rotten') {
              FP.FX.word(pos, 'YUCK! -1', '#8a9a3a', 1.3);
              FP.FX.puffs(pos, 12, 0x7a8a3a, 3, 1.2);
              FP.Ragdoll.knockOut(c, 1.5);
              FP.Audio.play('splat');
            } else {
              FP.FX.word(pos, f.kind === 'gold' ? 'GOLDEN! +3' : ['Yum!', 'Tasty!', 'Nom!'][Math.floor(Math.random() * 3)], '#ffcf33', f.kind === 'gold' ? 1.4 : 1);
              FP.FX.stars(pos, f.kind === 'gold' ? 8 : 4);
              FP.Audio.play(f.kind === 'gold' ? 'coin' : 'plop');
              c.expression = 'happy'; c.exprTimer = 0.8;
            }
            f.on = false;
            continue;
          }
        }
        if (f.y < 0.3) {
          FP.FX.puffs(new THREE.Vector3(f.x, 0.2, f.z), 8, KINDS[f.kind].color, 2.5, 1);
          FP.Audio.play('splat');
          f.on = false;
        }
      }
    }
    if (dt > 0 && !roundOver) respawn.update(chars, dt, -5);
    visual(dt);
    if (roundOver || dt === 0) return null;
    if (time >= TIME) {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `${w[0].name} ate the most fruit!` : "It's a tie!" };
    }
    return null;
  }

  // bot brain: run under the best fruit it can reach in time, and stay away from rotten fruit
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.head.position;
    let best = null, bs = -Infinity;
    for (const f of fruits) {
      if (!f.on || f.kind === 'rotten' || f.y < 1) continue;
      const d = Math.hypot(f.x - p.x, f.z - p.z);
      const tLeft = (f.y - 1.6) / FALL;
      if (d / 4.5 > tLeft + 0.2) continue; // can't get there in time
      const s = KINDS[f.kind].pts * 2 - d * 0.4 - tLeft * 0.5;
      if (s > bs) { bs = s; best = f; }
    }
    let mx = 0, mz = 0;
    if (best) {
      mx = best.x - p.x; mz = best.z - p.z;
      const d = Math.hypot(mx, mz);
      if (d < 0.15) { mx = 0; mz = 0; } else { const sp = Math.min(1, d * 1.5); mx = (mx / d) * sp; mz = (mz / d) * sp; }
    } else {
      mx = -p.x * 0.1; mz = -p.z * 0.1;
    }
    // dodge rotten fruit coming down nearby
    for (const f of fruits) {
      if (!f.on || f.kind !== 'rotten' || f.y > 6) continue;
      const dx = p.x - f.x, dz = p.z - f.z, d = Math.hypot(dx, dz);
      if (d < 1.4) { mx += (dx / (d || 1)) * 1.5; mz += (dz / (d || 1)) * 1.5; }
    }
    input.x = Math.max(-1, Math.min(1, mx)); input.z = Math.max(-1, Math.min(1, mz));
    return true;
  }

  function hud() { return `Catch fruit with your head! Gold = 3, rotten = -1 &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><ellipse cx="60" cy="12" rx="60" ry="16" fill="#4fae45" stroke="#2a2140" stroke-width="2"/><ellipse cx="60" cy="70" rx="52" ry="8" fill="#86d15f"/><circle cx="36" cy="34" r="7" fill="#ff4a4a" stroke="#2a2140" stroke-width="2"/><circle cx="84" cy="40" r="7" fill="#ffcf33" stroke="#2a2140" stroke-width="2"/><circle cx="62" cy="30" r="6" fill="#7a8a3a" stroke="#2a2140" stroke-width="2"/><ellipse cx="36" cy="68" rx="6" ry="2" fill="#1d1a2f" opacity=".3"/><ellipse cx="60" cy="56" rx="6" ry="8" fill="#ff7eb6" stroke="#2a2140" stroke-width="2"/><circle cx="60" cy="44" r="5" fill="#ff7eb6" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'fruit', name: 'Fruit Frenzy', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 3, song: 'party', minZoom: 14, art: ART,
    desc: 'Watch the shadows and catch falling fruit with your head. Golden = 3. Dodge the rotten fruit!',
    build, spawn, update, botThink, hud, visual,
    scoreLabel: (s) => `${s}`,
    // online: which fruit is falling, where, and how high (small numbers)
    netState: () => ({ t: Math.round(time), f: fruits.map((f) => (f.on ? [Math.round(f.x * 10), Math.round(f.y * 10), Math.round(f.z * 10)] : 0)) }),
    applyNetState: (st) => {
      time = st.t;
      (st.f || []).forEach((v, i) => {
        const f = fruits[i];
        if (!f) return;
        if (!v) { f.on = false; return; }
        const y = v[1] / 10;
        // smooth: only jump when it's far off (the fruit keeps falling between messages)
        if (!f.on || Math.abs(f.y - y) > 1) f.y = y;
        f.on = true; f.x = v[0] / 10; f.z = v[2] / 10;
      });
    },
  };
  // online friends see the fruit keep falling between messages
  const baseVisual = visual;
  self.visual = (dt, chars) => {
    if (FP.Net && FP.Net.isClient && FP.Net.isClient()) for (const f of fruits) if (f.on) f.y = Math.max(0.3, f.y - FALL * (dt || 0) * (f.kind === 'gold' ? 1.25 : 1));
    baseVisual(dt, chars);
  };
  return self;
})();
