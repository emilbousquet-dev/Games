// ============================================================
//  NINJA CAT — 3D MODELS
//  Everything is built from simple shapes (balls, boxes, tubes).
//  Open tools/models.html to see them all!
// ============================================================
window.NC = window.NC || {};

NC.Models = (function () {
  const U = NC.U;

  // cartoon shading: 3 steps of light
  const toonRamp = (() => {
    const d = new Uint8Array([90, 170, 255]);
    const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  })();

  const matCache = {};
  // a cartoon material. Same color = same material (faster), unless "own" is true.
  function M(color, opts = {}) {
    const key = color + '|' + Object.keys(opts).map((k) => k + ':' + (opts[k] && opts[k].uuid ? opts[k].uuid : opts[k])).join(',');
    if (!opts.own && matCache[key]) return matCache[key];
    const o = Object.assign({ color, gradientMap: toonRamp }, opts);
    delete o.own;
    const m = new THREE.MeshToonMaterial(o);
    if (!opts.own) matCache[key] = m;
    return m;
  }
  const glowM = (color) => new THREE.MeshBasicMaterial({ color });

  const G = {
    sph: new THREE.SphereGeometry(1, 20, 14),
    sphLo: new THREE.SphereGeometry(1, 10, 8),
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
    cone: new THREE.ConeGeometry(1, 1, 14),
  };
  function mesh(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    return m;
  }
  const sph = (mat, x, y, z, sx, sy = sx, sz = sx) => mesh(G.sph, mat, x, y, z, sx, sy, sz);
  const box = (mat, x, y, z, sx, sy, sz) => mesh(G.box, mat, x, y, z, sx, sy, sz);
  const cyl = (mat, x, y, z, r, h, r2 = r) => mesh(G.cyl, mat, x, y, z, r, h, r2);
  const cone = (mat, x, y, z, r, h) => mesh(G.cone, mat, x, y, z, r, h, r);
  function put(parent, o) { parent.add(o); return o; }
  function pivot(parent, x, y, z) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }
  function glowSprite(color, size, opacity = 0.8) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: NC.Tex.glow(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.set(size, size, 1);
    return s;
  }

  // ============================================================
  //  THE NINJA CATS
  // ============================================================
  const CATS = {
    mochi: { name: 'MOCHI', fur: 0xf0902a, stripes: ['furMochi', '#f0902a', '#c0601a'], muzzle: 0xfff4e0, suit: 0x1e2a4a, scarf: 0xe8302a, eye: 0x50d050, belt: 0xe8302a },
    shadow: { name: 'SHADOW', fur: 0x2a2a34, stripes: null, muzzle: 0x55556a, suit: 0x3a1e5a, scarf: 0x30a0ff, eye: 0xffd020, belt: 0x30a0ff },
  };

  function eye(parent, x, color) {
    const e = pivot(parent, x, 0.04, 0.19);
    e.add(sph(M(0xffffff), 0, 0, 0, 0.068, 0.078, 0.04));
    e.add(sph(M(color), 0, -0.004, 0.022, 0.05, 0.062, 0.03));
    e.add(sph(M(0x111111), 0, -0.004, 0.034, 0.016, 0.05, 0.02));
    e.add(sph(glowM(0xffffff), 0.02, 0.024, 0.045, 0.014));
    return e;
  }

  function katana() {
    const k = new THREE.Group();
    k.add(cyl(M(0x2a1a14), 0, -0.04, 0, 0.022, 0.2));               // handle
    k.add(cyl(M(0xe8c040), 0, 0.07, 0, 0.055, 0.02));               // guard
    const blade = box(M(0xd8e0ea, { own: true, emissive: 0x000000 }), 0, 0.42, 0, 0.022, 0.68, 0.05);
    k.add(blade);
    k.add(cone(blade.material, 0, 0.78, 0, 0.03, 0.06));
    k.userData.blade = blade;
    return k;
  }

  // the colors you can buy for your sword
  const SWORDS = {
    silver: { color: 0xd8e0ea, glow: 0x000000 },
    blue: { color: 0x60b0ff, glow: 0x2050c0 },
    pink: { color: 0xff8ad8, glow: 0xa02080 },
    gold: { color: 0xffd040, glow: 0x806000 },
    rainbow: { color: 0xffffff, glow: 0x404040, rainbow: true },
  };
  function setSword(cat, name) {
    const s = SWORDS[name] || SWORDS.silver;
    const m = cat.userData.parts.sword.userData.blade.material;
    m.color.setHex(s.color); m.emissive.setHex(s.glow);
    cat.userData.rainbow = !!s.rainbow;
  }

  // ---------- hats ----------
  function hat(name) {
    const h = new THREE.Group();
    if (name === 'straw') {
      h.add(mesh(new THREE.ConeGeometry(0.42, 0.2, 20), M(0xd8b060), 0, 0.12, 0));
      h.add(cyl(M(0xa02020), 0, 0.04, 0, 0.2, 0.04));
    } else if (name === 'headband') {
      put(h, mesh(new THREE.TorusGeometry(0.235, 0.035, 8, 24), M(0xffffff), 0, -0.02, 0, 1, 1, 1)).rotation.x = Math.PI / 2;
      h.add(sph(M(0xe02020), 0, -0.02, 0.24, 0.05, 0.05, 0.02));
    } else if (name === 'samurai') {
      h.add(mesh(new THREE.SphereGeometry(0.27, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x30303a), 0, -0.04, 0));
      h.add(cyl(M(0x30303a), 0, -0.05, -0.04, 0.33, 0.04));
      const hornL = box(M(0xf0c030), -0.1, 0.2, 0.18, 0.04, 0.32, 0.02); hornL.rotation.z = 0.5; h.add(hornL);
      const hornR = box(M(0xf0c030), 0.1, 0.2, 0.18, 0.04, 0.32, 0.02); hornR.rotation.z = -0.5; h.add(hornR);
      h.add(sph(M(0xe02020), 0, 0.06, 0.24, 0.05));
    } else if (name === 'crown') {
      const c = M(0xffd030, { emissive: 0x403000 });
      h.add(mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.12, 16, 1, true), c, 0, 0.04, 0));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        h.add(cone(c, Math.sin(a) * 0.19, 0.15, Math.cos(a) * 0.19, 0.04, 0.12));
        h.add(sph(M(i % 2 ? 0x30a0ff : 0xe02040), Math.sin(a) * 0.2, 0.05, Math.cos(a) * 0.2, 0.025));
      }
    } else if (name === 'flower') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        h.add(sph(M(0xffa0c8), 0.16 + Math.cos(a) * 0.05, 0.12, 0.08 + Math.sin(a) * 0.05, 0.04, 0.02, 0.04));
      }
      h.add(sph(M(0xffe040), 0.16, 0.13, 0.08, 0.025));
    }
    return h;
  }
  function setHat(cat, name) {
    const slot = cat.userData.parts.hatSlot;
    while (slot.children.length) slot.remove(slot.children[0]);
    if (name && name !== 'none') slot.add(hat(name));
    cat.userData.parts.band.visible = name !== 'headband' && name !== 'samurai';
    cat.userData.hat = name;
  }

  function cat(kind = 'mochi') {
    const c = CATS[kind];
    const g = new THREE.Group();
    const P = {};
    const fur = c.stripes ? M(0xffffff, { map: NC.Tex.furStripes(...c.stripes) }) : M(c.fur);
    const furPlain = M(c.fur), suit = M(c.suit), muzzle = M(c.muzzle), pink = M(0xff9ab0);
    const root = pivot(g, 0, 0, 0); P.root = root; // the whole body (for flips and spins)
    // legs
    P.legL = pivot(root, -0.11, 0.36, 0); P.legR = pivot(root, 0.11, 0.36, 0);
    for (const L of [P.legL, P.legR]) {
      L.add(cyl(suit, 0, -0.14, 0, 0.075, 0.26, 0.065));
      L.add(sph(furPlain, 0, -0.3, 0.04, 0.08, 0.06, 0.11));
    }
    // body
    P.body = pivot(root, 0, 0.36, 0);
    P.body.add(sph(suit, 0, 0.17, 0, 0.21, 0.24, 0.18));
    put(P.body, mesh(new THREE.TorusGeometry(0.19, 0.03, 8, 20), M(c.belt), 0, 0.07, 0)).rotation.x = Math.PI / 2;
    P.body.add(sph(muzzle, 0, 0.24, 0.13, 0.11, 0.12, 0.06)); // chest fur
    // head
    P.head = pivot(P.body, 0, 0.38, 0);
    P.head.add(sph(fur, 0, 0.12, 0, 0.25, 0.22, 0.22));
    P.head.add(sph(muzzle, 0, 0.04, 0.16, 0.12, 0.08, 0.08));
    P.head.add(sph(pink, 0, 0.09, 0.235, 0.028, 0.02, 0.02));
    P.eyeL = eye(P.head, -0.09, c.eye); P.eyeR = eye(P.head, 0.09, c.eye);
    P.eyeL.position.y = P.eyeR.position.y = 0.15;
    // whiskers
    const wm = new THREE.LineBasicMaterial({ color: 0xffffff });
    const wg = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.08, 0.05, 0.2), new THREE.Vector3(0.3, 0.08, 0.16), new THREE.Vector3(0.08, 0.03, 0.2), new THREE.Vector3(0.3, 0.0, 0.16),
      new THREE.Vector3(-0.08, 0.05, 0.2), new THREE.Vector3(-0.3, 0.08, 0.16), new THREE.Vector3(-0.08, 0.03, 0.2), new THREE.Vector3(-0.3, 0.0, 0.16),
    ]);
    P.head.add(new THREE.LineSegments(wg, wm));
    // ears
    for (const s of [-1, 1]) {
      const ear = pivot(P.head, s * 0.14, 0.28, -0.02);
      ear.rotation.z = -s * 0.35;
      ear.add(cone(fur, 0, 0.07, 0, 0.08, 0.16));
      ear.add(cone(pink, 0, 0.06, 0.03, 0.045, 0.1));
      P[s < 0 ? 'earL' : 'earR'] = ear;
    }
    // ninja headband with 2 tails that flap in the wind
    P.band = pivot(P.head, 0, 0, 0);
    put(P.band, mesh(new THREE.TorusGeometry(0.235, 0.03, 8, 24), M(c.scarf), 0, 0.2, 0)).rotation.x = Math.PI / 2 - 0.15;
    P.scarf = [];
    for (const s of [-1, 1]) {
      const t = pivot(P.band, s * 0.05, 0.2, -0.22);
      t.add(box(M(c.scarf), 0, 0, -0.16, 0.05, 0.02, 0.32));
      t.rotation.y = s * 0.25;
      P.scarf.push(t);
    }
    P.hatSlot = pivot(P.head, 0, 0.3, 0);
    // arms
    P.armL = pivot(P.body, -0.22, 0.3, 0); P.armR = pivot(P.body, 0.22, 0.3, 0);
    for (const A of [P.armL, P.armR]) {
      A.add(cyl(suit, 0, -0.12, 0, 0.06, 0.24, 0.055));
      A.add(sph(furPlain, 0, -0.26, 0, 0.065));
    }
    P.sword = katana();
    P.sword.position.set(0, -0.27, 0.03);
    P.sword.rotation.x = Math.PI / 2;
    P.armR.add(P.sword);
    // tail: a chain of pieces that curl up
    P.tail = [];
    let parent = pivot(P.body, 0, 0.08, -0.16);
    for (let i = 0; i < 7; i++) {
      const seg = pivot(parent, 0, 0, i === 0 ? 0 : -0.075);
      seg.add(sph(i === 6 && kind === 'mochi' ? muzzle : furPlain, 0, 0, -0.04, 0.045 - i * 0.002, 0.045 - i * 0.002, 0.06));
      P.tail.push(seg);
      parent = seg;
    }
    // smoke bomb pouch on the belt
    P.body.add(sph(M(0x8a50c0), 0.17, 0.05, 0.08, 0.05, 0.06, 0.05));

    g.userData.parts = P;
    g.userData.kind = kind;
    g.userData.info = c;
    // remember every material, so the cat can go see-through (smoke bomb!)
    const mats = new Set();
    g.traverse((o) => { if (o.material) mats.add(o.material); });
    g.userData.mats = [...mats];
    // own copies of the materials, so one cat going invisible doesn't change the other
    const swap = new Map();
    g.userData.mats = g.userData.mats.map((m) => { const n = m.clone(); n.transparent = true; swap.set(m, n); return n; });
    g.traverse((o) => { if (o.material && swap.has(o.material)) o.material = swap.get(o.material); });
    g.userData.mats.forEach((m) => { m.userData.baseEmissive = m.emissive ? m.emissive.getHex() : 0; });
    return g;
  }

  // move the cat's arms, legs and tail. "s" says what the cat is doing.
  function animCat(cat, s, dt) {
    const P = cat.userData.parts;
    const t = s.t;
    const run = s.run || 0, ph = s.phase || 0;
    // start from a calm pose
    let legL = 0, legR = 0, armLx = 0, armLz = 0.15, armRx = 0, armRz = -0.15, armRy = 0, bodyX = 0, bodyY = 0, headX = 0, headY = 0;
    let rootRX = 0, rootRY = 0, rootY = 0, swordRX = Math.PI / 2 + 0.4, swordRZ = 0;
    const breathe = Math.sin(t * 3) * 0.015;
    if (s.mode === 'climb') {
      const c = Math.sin(t * 12) * 0.6;
      armLx = -2.6 + c; armRx = -2.6 - c; armLz = 0.2; armRz = -0.2;
      legL = -0.6 - c; legR = -0.6 + c; bodyX = -0.2; headX = -0.4;
      swordRX = Math.PI;
    } else if (s.mode === 'air') {
      const up = U.clamp(s.vy / 10, -1, 1);
      legL = -0.5 - up * 0.3; legR = 0.3 - up * 0.3;
      armLx = -0.6 - up * 0.8; armRx = -0.4 - up * 0.8; armLz = 0.8; armRz = -0.8;
      bodyX = 0.15;
    } else if (s.mode === 'pound') {
      legL = legR = -1.2; armLx = armRx = -2.8; armLz = 0.3; armRz = -0.3; bodyX = 0.5; swordRX = Math.PI;
    } else if (s.mode === 'taunt') {
      // sit down and lick a paw
      rootY = -0.16; legL = legR = -1.4; armLx = -2.1; armLz = -0.5; headX = 0.25; headY = 0.3 + Math.sin(t * 9) * 0.15;
      armRx = 0.2;
    } else {
      // standing and running
      const sw = Math.sin(ph) * run;
      legL = sw * 1.0; legR = -sw * 1.0;
      armLx = -sw * 0.9; armRx = sw * 0.6 - run * 0.4;
      bodyX = run * 0.25; rootY = Math.abs(Math.cos(ph)) * run * 0.06 + breathe;
      headX = -run * 0.15;
      if (run > 0.6) { armRx = 0.9; armRz = -0.4; swordRX = Math.PI / 2 + 1.0; } // sword held back like a real ninja
    }
    // flip on the double jump
    if (s.flip > 0) { rootRX = (1 - s.flip) * Math.PI * 2; legL = legR = -1.3; }
    // sword swings
    if (s.slash > 0) {
      const p = 1 - s.slash; // 0 -> 1
      const dir = s.combo === 1 ? -1 : 1;
      armRx = -1.5; armRz = -0.3;
      armRy = dir * U.lerp(1.6, -1.4, U.smooth(Math.min(1, p * 1.6)));
      swordRX = Math.PI / 2 + 0.1; swordRZ = 0;
      bodyY = -armRy * 0.3;
    }
    if (s.spin > 0) { rootRY = (1 - s.spin) * Math.PI * 2; armRx = -1.57; armRz = -1.3; armLz = 1.3; swordRX = Math.PI / 2; }
    if (s.throwT > 0) { armLx = -1.6 - s.throwT * 2; armLz = 0.2; }
    // smooth everything a bit
    const k = 18;
    P.legL.rotation.x = U.damp(P.legL.rotation.x, legL, k, dt);
    P.legR.rotation.x = U.damp(P.legR.rotation.x, legR, k, dt);
    P.armL.rotation.x = U.damp(P.armL.rotation.x, armLx, k, dt);
    P.armL.rotation.z = U.damp(P.armL.rotation.z, armLz, k, dt);
    const fast = s.slash > 0 ? 60 : k;
    P.armR.rotation.x = U.damp(P.armR.rotation.x, armRx, fast, dt);
    P.armR.rotation.z = U.damp(P.armR.rotation.z, armRz, fast, dt);
    P.armR.rotation.y = U.damp(P.armR.rotation.y, armRy, fast, dt);
    P.sword.rotation.x = U.damp(P.sword.rotation.x, swordRX, fast, dt);
    P.sword.rotation.z = U.damp(P.sword.rotation.z, swordRZ, fast, dt);
    P.body.rotation.x = U.damp(P.body.rotation.x, bodyX, k, dt);
    P.body.rotation.y = U.damp(P.body.rotation.y, bodyY, k, dt);
    P.head.rotation.x = U.damp(P.head.rotation.x, headX, k, dt);
    P.head.rotation.y = U.damp(P.head.rotation.y, headY, 10, dt);
    P.root.position.y = U.damp(P.root.position.y, rootY, 20, dt);
    P.root.rotation.x = rootRX;
    P.root.rotation.y = rootRY;
    // tail swish: it curls UP like a happy cat
    const tailUp = s.mode === 'air' ? 0.05 : 0.2;
    P.tail.forEach((seg, i) => {
      seg.rotation.x = (i === 0 ? 0.5 : tailUp) + Math.sin(t * 4 - i * 0.6) * 0.06 - run * 0.08;
      seg.rotation.y = Math.sin(t * 2.5 - i * 0.5) * (0.15 + run * 0.1);
    });
    // headband tails hang down, and fly back when you run
    P.scarf.forEach((sc, i) => {
      sc.rotation.x = -0.9 + run * 0.75 + Math.sin(t * (8 + run * 10) + i) * (0.1 + run * 0.2);
    });
    // ears twitch and eyes blink
    const blink = (t % 3.7) < 0.12 ? 0.1 : 1;
    P.eyeL.scale.y = P.eyeR.scale.y = s.hurt > 0 ? 0.2 : blink;
    P.earL.rotation.x = Math.sin(t * 0.7) > 0.95 ? -0.4 : 0;
    // rainbow sword
    if (cat.userData.rainbow) P.sword.userData.blade.material.color.setHSL((t * 0.5) % 1, 0.9, 0.65);
  }

  // make a cat see-through (smoke bomb) or flash red/white (hurt)
  function setCatLook(cat, opacity, flash) {
    for (const m of cat.userData.mats) {
      m.opacity = opacity;
      m.depthWrite = opacity > 0.9;
      if (m.emissive) m.emissive.setHex(flash ? flash : m.userData.baseEmissive);
    }
  }

  // ============================================================
  //  ENEMIES
  // ============================================================
  // a dog standing up like a samurai. Used for guards, the Bulldog and Lord Woofmoto!
  function dog(o = {}) {
    o = Object.assign({ fur: 0xd88a3a, muzzle: 0xfff0e0, armor: 0x2a3a6a, trim: 0xd8b040, ears: 'pointy', jaw: false, lantern: true, spear: true, sword: false, cape: false, helmet: false, size: 1 }, o);
    const g = new THREE.Group();
    const P = {};
    const fur = M(o.fur), muz = M(o.muzzle), armor = M(o.armor), trim = M(o.trim), dark = M(0x1a1a1a);
    const root = pivot(g, 0, 0, 0); root.scale.setScalar(o.size); P.root = root;
    P.legL = pivot(root, -0.15, 0.45, 0); P.legR = pivot(root, 0.15, 0.45, 0);
    for (const L of [P.legL, P.legR]) {
      L.add(cyl(dark, 0, -0.2, 0, 0.1, 0.36, 0.09));
      L.add(sph(fur, 0, -0.42, 0.05, 0.1, 0.07, 0.14));
    }
    P.body = pivot(root, 0, 0.45, 0);
    P.body.add(sph(armor, 0, 0.25, 0, 0.3, 0.33, 0.24));
    P.body.add(box(trim, 0, 0.1, 0, 0.62, 0.06, 0.5)); // belt
    // shoulder plates
    for (const s of [-1, 1]) { const sp = box(armor, s * 0.3, 0.5, 0, 0.2, 0.08, 0.3); sp.rotation.z = s * -0.4; P.body.add(sp); }
    P.body.add(box(trim, 0, 0.32, 0.22, 0.2, 0.2, 0.04)); // chest symbol
    if (o.collar) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; put(P.body, cone(M(0xcccccc), Math.sin(a) * 0.22, 0.55, Math.cos(a) * 0.2, 0.04, 0.12)).rotation.set(Math.cos(a) * 1.4, 0, -Math.sin(a) * 1.4); }
    P.head = pivot(P.body, 0, 0.6, 0);
    P.head.add(sph(fur, 0, 0.15, 0, 0.26, 0.24, 0.24));
    if (o.jaw) {
      P.head.add(sph(muz, 0, 0.06, 0.18, 0.2, 0.14, 0.14));
      P.head.add(sph(muz, 0, -0.02, 0.2, 0.22, 0.1, 0.12));
      for (const s of [-1, 1]) P.head.add(cone(M(0xffffff), s * 0.1, 0.07, 0.3, 0.025, 0.06));
    } else {
      P.head.add(sph(muz, 0, 0.08, 0.22, 0.12, 0.09, 0.14));
    }
    P.head.add(sph(dark, 0, 0.12, o.jaw ? 0.33 : 0.35, 0.045, 0.035, 0.03)); // nose
    for (const s of [-1, 1]) {
      P.head.add(sph(M(0xffffff), s * 0.1, 0.22, 0.19, 0.05, 0.05, 0.03));
      P.head.add(sph(dark, s * 0.1, 0.22, 0.215, 0.028, 0.032, 0.02));
      // angry eyebrows
      const brow = box(dark, s * 0.1, 0.29, 0.2, 0.1, 0.022, 0.02); brow.rotation.z = s * 0.35; P.head.add(brow);
      const ear = pivot(P.head, s * 0.16, 0.32, 0);
      if (o.ears === 'pointy') { ear.add(cone(fur, 0, 0.08, 0, 0.08, 0.18)); ear.rotation.z = -s * 0.25; }
      else { ear.add(sph(M(0x6a4020), s * 0.06, -0.12, 0, 0.07, 0.15, 0.04)); }
    }
    if (o.helmet) {
      P.head.add(mesh(new THREE.SphereGeometry(0.28, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), M(0xa01818), 0, 0.2, -0.02));
      for (const s of [-1, 1]) { const h = box(M(0xffd030, { emissive: 0x302000 }), s * 0.14, 0.52, 0.12, 0.05, 0.4, 0.02); h.rotation.z = -s * 0.55; P.head.add(h); }
      P.head.add(sph(M(0xffd030), 0, 0.36, 0.22, 0.06));
    }
    P.armL = pivot(P.body, -0.33, 0.46, 0); P.armR = pivot(P.body, 0.33, 0.46, 0);
    for (const A of [P.armL, P.armR]) {
      A.add(cyl(armor, 0, -0.16, 0, 0.08, 0.32, 0.07));
      A.add(sph(fur, 0, -0.34, 0, 0.08));
    }
    if (o.lantern) {
      const l = pivot(P.armL, 0, -0.38, 0.05);
      l.add(cyl(dark, 0, -0.06, 0, 0.005, 0.12));
      const paper = mesh(G.sph, new THREE.MeshBasicMaterial({ map: NC.Tex.lanternPaper(), color: 0xffffff }), 0, -0.22, 0, 0.1, 0.13, 0.1);
      l.add(paper);
      put(l, glowSprite(0xffa040, 0.8, 0.7)).position.y = -0.22;
      P.lantern = l;
      P.armL.rotation.x = -0.6;
    }
    if (o.spear) {
      const sp = pivot(P.armR, 0, -0.34, 0.05);
      sp.add(cyl(M(0x6a4020), 0, 0.3, 0, 0.022, 1.5));
      sp.add(cone(M(0xd0d8e0), 0, 1.13, 0, 0.05, 0.22));
      sp.add(cyl(M(0xd02020), 0, 0.98, 0, 0.04, 0.05));
      P.weapon = sp;
    }
    if (o.sword) {
      const k = katana(); k.scale.setScalar(1.5); k.position.set(0, -0.36, 0.05); k.rotation.x = Math.PI / 2;
      P.armR.add(k); P.weapon = k;
    }
    if (o.cape) {
      const cape = pivot(P.body, 0, 0.55, -0.2);
      cape.add(box(M(0x7a0a10), 0, -0.35, -0.02, 0.55, 0.7, 0.03));
      P.cape = cape;
    }
    if (o.cannon) {
      const c = pivot(P.body, 0.32, 0.62, -0.05);
      put(c, cyl(M(0x303038), 0, 0.15, 0, 0.12, 0.6, 0.1)).rotation.x = 0.4;
      put(c, cyl(M(0xd0a020), 0, 0.42, 0.13, 0.13, 0.06)).rotation.x = 0.4;
      c.visible = false;
      P.cannon = c;
    }
    // curly tail
    const tail = pivot(P.body, 0, 0.1, -0.24);
    put(tail, mesh(new THREE.TorusGeometry(0.08, 0.04, 8, 12, Math.PI * 1.5), fur, 0, 0.06, -0.04)).rotation.y = Math.PI / 2;
    P.tail = tail;
    g.userData.parts = P;
    ownMats(g);
    return g;
  }
  // every enemy gets its own copy of its materials, so it can flash white when hit
  function ownMats(g) {
    const swap = new Map();
    g.traverse((o) => {
      if (!o.material || o.isSprite || o.material.isMeshBasicMaterial || o.material.isLineBasicMaterial) return;
      if (!swap.has(o.material)) swap.set(o.material, o.material.clone());
      o.material = swap.get(o.material);
    });
    g.userData.mats = [...swap.values()];
  }
  function flash(g, amount) {
    const v = Math.floor(U.clamp(amount, 0, 1) * 255);
    for (const m of g.userData.mats || []) if (m.emissive) m.emissive.setRGB(v / 255, v / 255, v / 255);
  }

  function animWalker(g, s, dt) {
    const P = g.userData.parts;
    const sw = Math.sin(s.phase) * s.run;
    P.legL.rotation.x = sw * 0.8; P.legR.rotation.x = -sw * 0.8;
    P.body.rotation.x = U.damp(P.body.rotation.x, s.lean || 0, 10, dt);
    P.root.position.y = Math.abs(Math.cos(s.phase)) * s.run * 0.05;
    let armR = -sw * 0.5 + (s.armR || 0);
    if (P.lantern) P.lantern.rotation.x = Math.sin(s.t * 3) * 0.2 - P.armL.rotation.x;
    if (s.attack > 0) armR = U.lerp(0, -2.4, s.attack);
    P.armR.rotation.x = U.damp(P.armR.rotation.x, armR, 25, dt);
    if (!P.lantern) P.armL.rotation.x = sw * 0.5 + (s.armL || 0);
    P.tail.rotation.y = Math.sin(s.t * (s.alert ? 18 : 6)) * 0.4;
    if (P.cape) P.cape.rotation.x = 0.2 + s.run * 0.5 + Math.sin(s.t * 6) * 0.08;
  }

  function rat() {
    const g = new THREE.Group();
    const P = {};
    const fur = M(0x8a8a96), pink = M(0xffa0b8), suit = M(0x5a2a7a), dark = M(0x111111);
    const root = pivot(g, 0, 0, 0); P.root = root;
    P.legL = pivot(root, -0.09, 0.3, 0); P.legR = pivot(root, 0.09, 0.3, 0);
    for (const L of [P.legL, P.legR]) { L.add(cyl(suit, 0, -0.13, 0, 0.06, 0.24, 0.05)); L.add(sph(pink, 0, -0.27, 0.04, 0.05, 0.03, 0.08)); }
    P.body = pivot(root, 0, 0.3, 0);
    P.body.add(sph(suit, 0, 0.15, 0, 0.17, 0.2, 0.15));
    P.head = pivot(P.body, 0, 0.36, 0);
    P.head.add(sph(fur, 0, 0.06, 0.04, 0.16, 0.14, 0.2));
    put(P.head, cone(fur, 0, 0.03, 0.26, 0.08, 0.16)).rotation.x = Math.PI / 2;
    P.head.add(sph(pink, 0, 0.03, 0.35, 0.03));
    P.head.add(box(suit, 0, 0.12, 0.05, 0.34, 0.08, 0.36)); // ninja hood band
    for (const s of [-1, 1]) {
      P.head.add(sph(M(0xff3030, { emissive: 0x600000 }), s * 0.07, 0.12, 0.2, 0.025));
      const ear = pivot(P.head, s * 0.12, 0.17, -0.02);
      ear.add(sph(fur, 0, 0.06, 0, 0.09, 0.09, 0.02)); ear.add(sph(pink, 0, 0.06, 0.01, 0.06, 0.06, 0.02));
    }
    P.armL = pivot(P.body, -0.18, 0.26, 0); P.armR = pivot(P.body, 0.18, 0.26, 0);
    for (const A of [P.armL, P.armR]) { A.add(cyl(suit, 0, -0.1, 0, 0.045, 0.2)); A.add(sph(pink, 0, -0.21, 0, 0.045)); }
    const bone = boneModel(); bone.scale.setScalar(0.7); bone.position.set(0, -0.24, 0.05); P.armR.add(bone); P.bone = bone;
    const tail = pivot(P.body, 0, 0.05, -0.14);
    let par = tail;
    for (let i = 0; i < 6; i++) { const s = pivot(par, 0, 0, i ? -0.08 : 0); put(s, cyl(pink, 0, 0, -0.04, 0.015, 0.09)).rotation.x = Math.PI / 2; par = s; }
    P.tail = tail;
    g.userData.parts = P;
    ownMats(g);
    return g;
  }

  function crow() {
    const g = new THREE.Group();
    const P = {};
    const black = M(0x1a1a24), beak = M(0xf0b020);
    P.body = pivot(g, 0, 0, 0);
    P.body.add(sph(black, 0, 0, 0, 0.18, 0.16, 0.3));
    P.body.add(sph(black, 0, 0.1, 0.28, 0.13));
    put(P.body, cone(beak, 0, 0.08, 0.46, 0.05, 0.16)).rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) P.body.add(sph(M(0xff2020, { emissive: 0x800000 }), s * 0.07, 0.14, 0.38, 0.025));
    P.body.add(box(black, 0, 0.02, -0.38, 0.22, 0.03, 0.22));
    P.wingL = pivot(P.body, -0.14, 0.05, 0); P.wingR = pivot(P.body, 0.14, 0.05, 0);
    P.wingL.add(box(black, -0.32, 0, 0, 0.64, 0.03, 0.3));
    P.wingR.add(box(black, 0.32, 0, 0, 0.64, 0.03, 0.3));
    g.userData.parts = P;
    ownMats(g);
    return g;
  }

  function frog() {
    const g = new THREE.Group();
    const P = {};
    const green = M(0x40b040), belly = M(0xe8e070), dark = M(0x111111);
    P.body = pivot(g, 0, 0, 0);
    P.body.add(sph(green, 0, 0.28, 0, 0.36, 0.26, 0.38));
    P.body.add(sph(belly, 0, 0.22, 0.1, 0.3, 0.2, 0.3));
    for (const s of [-1, 1]) {
      P.body.add(sph(green, s * 0.18, 0.52, 0.18, 0.12));
      P.body.add(sph(M(0xffffff), s * 0.18, 0.55, 0.26, 0.08));
      P.body.add(sph(dark, s * 0.18, 0.55, 0.32, 0.04, 0.06, 0.03));
      P.body.add(sph(green, s * 0.32, 0.1, -0.1, 0.16, 0.1, 0.24));
      P.body.add(sph(green, s * 0.25, 0.06, 0.25, 0.08, 0.05, 0.1));
    }
    // tiny samurai topknot
    P.body.add(cyl(dark, 0, 0.58, -0.02, 0.04, 0.12));
    put(P.body, mesh(new THREE.TorusGeometry(0.15, 0.02, 6, 16, Math.PI), M(0xd02020), 0, 0.3, 0.3)).rotation.z = Math.PI;
    g.userData.parts = P;
    ownMats(g);
    return g;
  }

  // the big robot dog suit (Lord Woofmoto phase 3)
  function roboDog() {
    const g = new THREE.Group();
    const P = {};
    const metal = M(0x7a808a), dark = M(0x30343a), red = new THREE.MeshBasicMaterial({ color: 0xff2020 }), gold = M(0xd0a020);
    const root = pivot(g, 0, 0, 0); P.root = root;
    P.legL = pivot(root, -0.6, 1.4, 0); P.legR = pivot(root, 0.6, 1.4, 0);
    for (const L of [P.legL, P.legR]) {
      L.add(cyl(dark, 0, -0.6, 0, 0.25, 1.2));
      L.add(box(metal, 0, -1.3, 0.15, 0.7, 0.25, 0.9));
    }
    P.body = pivot(root, 0, 1.4, 0);
    P.body.add(box(metal, 0, 0.8, 0, 1.8, 1.4, 1.3));
    P.body.add(box(gold, 0, 0.8, 0.66, 0.9, 0.5, 0.05));
    // glass bubble with Woofmoto inside
    P.dome = mesh(G.sph, new THREE.MeshPhysicalMaterial({ color: 0x88ccff, transparent: true, opacity: 0.35, roughness: 0.1 }), 0, 1.8, 0.1, 0.6, 0.55, 0.6);
    P.body.add(P.dome);
    P.pilot = dog({ fur: 0xd8a050, armor: 0xa01818, helmet: true, lantern: false, spear: false, ears: 'pointy' });
    P.pilot.position.set(0, 1.0, 0.1); P.pilot.scale.setScalar(0.9);
    P.body.add(P.pilot);
    // robot head with laser eyes
    P.head = pivot(P.body, 0, 1.0, 0.7);
    P.head.add(box(metal, 0, 0, 0.4, 0.9, 0.6, 0.8));
    P.head.add(box(dark, 0, -0.2, 0.85, 0.7, 0.2, 0.2));
    for (const s of [-1, 1]) { P.head.add(box(red, s * 0.25, 0.1, 0.81, 0.2, 0.08, 0.02)); P.head.add(cone(metal, s * 0.35, 0.45, 0.3, 0.15, 0.4)); }
    P.eyes = P.head;
    P.armL = pivot(P.body, -1.05, 1.2, 0); P.armR = pivot(P.body, 1.05, 1.2, 0);
    for (const A of [P.armL, P.armR]) { A.add(cyl(dark, 0, -0.5, 0, 0.18, 1.0)); A.add(box(metal, 0, -1.1, 0, 0.5, 0.4, 0.5)); }
    // steam pipes on its back
    for (const s of [-1, 1]) P.body.add(cyl(dark, s * 0.5, 1.7, -0.5, 0.1, 0.6));
    P.tail = pivot(P.body, 0, 0.4, -0.7);
    put(P.tail, cyl(metal, 0, 0.3, -0.2, 0.08, 0.8)).rotation.x = -0.6;
    g.userData.parts = P;
    ownMats(g);
    return g;
  }

  // ============================================================
  //  THINGS IN THE WORLD
  // ============================================================
  function torii() {
    const g = new THREE.Group();
    const red = M(0xd8281c), black = M(0x1a1414);
    for (const s of [-1, 1]) {
      g.add(cyl(red, s * 1.7, 2.3, 0, 0.18, 4.6, 0.2));
      g.add(cyl(black, s * 1.7, 0.2, 0, 0.24, 0.4));
    }
    g.add(box(red, 0, 3.7, 0, 4.4, 0.25, 0.3));
    g.add(box(black, 0, 4.55, 0, 5.2, 0.3, 0.45));
    g.add(box(red, 0, 4.3, 0, 4.8, 0.22, 0.38));
    for (const s of [-1, 1]) { const tip = box(black, s * 2.7, 4.68, 0, 0.6, 0.25, 0.45); tip.rotation.z = s * 0.25; g.add(tip); }
    g.add(box(M(0x1a1414), 0, 4.0, 0.16, 0.6, 0.5, 0.05));
    return g;
  }
  function stoneLantern() {
    const g = new THREE.Group();
    const st = M(0x8a8a90);
    g.add(cyl(st, 0, 0.1, 0, 0.32, 0.2, 0.36));
    g.add(cyl(st, 0, 0.5, 0, 0.1, 0.6, 0.12));
    g.add(box(st, 0, 0.84, 0, 0.5, 0.08, 0.5));
    const light = box(new THREE.MeshBasicMaterial({ color: 0x333333 }), 0, 1.02, 0, 0.32, 0.28, 0.32);
    g.add(light);
    put(g, mesh(new THREE.ConeGeometry(0.46, 0.3, 4), st, 0, 1.32, 0)).rotation.y = Math.PI / 4;
    g.add(sph(st, 0, 1.5, 0, 0.07));
    const halo = glowSprite(0xffb040, 2.2, 0); halo.position.y = 1.05; g.add(halo);
    g.userData.light = light; g.userData.halo = halo;
    return g;
  }
  function setLanternLit(g, lit) {
    g.userData.light.material.color.setHex(lit ? 0xffd070 : 0x333333);
    g.userData.halo.material.opacity = lit ? 0.9 : 0;
  }
  function paperLantern(color = 0xe8402a) {
    const g = new THREE.Group();
    g.add(cyl(M(0x111111), 0, 0.3, 0, 0.005, 0.3));
    g.add(mesh(G.sph, new THREE.MeshBasicMaterial({ map: NC.Tex.lanternPaper(), color }), 0, 0, 0, 0.2, 0.26, 0.2));
    g.add(cyl(M(0x111111), 0, 0.25, 0, 0.1, 0.04));
    g.add(cyl(M(0x111111), 0, -0.25, 0, 0.1, 0.04));
    if (!NC.lowGfx) g.add(glowSprite(color, 1.6, 0.55));
    return g;
  }
  function cherryTree(rnd = Math.random) {
    const g = new THREE.Group();
    const bark = M(0x4a2e22);
    const trunk = cyl(bark, 0, 1.2, 0, 0.14, 2.4, 0.22); trunk.rotation.z = (rnd() - 0.5) * 0.2; g.add(trunk);
    const pinks = [0xffb0d0, 0xff9ac0, 0xffc8e0];
    for (let i = 0; i < 7; i++) {
      const a = rnd() * Math.PI * 2, r = 0.4 + rnd() * 0.9;
      g.add(sph(M(pinks[i % 3]), Math.cos(a) * r, 2.6 + rnd() * 0.8, Math.sin(a) * r, 0.7 + rnd() * 0.4, 0.55 + rnd() * 0.3, 0.7 + rnd() * 0.4));
    }
    for (const s of [-1, 1]) { const b = cyl(bark, s * 0.4, 2.2, 0, 0.06, 1.0); b.rotation.z = -s * 0.8; g.add(b); }
    return g;
  }
  function bamboo(h = 14, rnd = Math.random) {
    const g = new THREE.Group();
    const green = M(0x6aa040), ring = M(0x3a6a20), leaf = M(0x4a9030, { side: THREE.DoubleSide });
    const n = Math.round(h / 1.2);
    for (let i = 0; i < n; i++) {
      g.add(cyl(green, 0, i * 1.2 + 0.6, 0, 0.2, 1.16));
      g.add(cyl(ring, 0, i * 1.2 + 1.18, 0, 0.22, 0.06));
    }
    for (let i = 0; i < 8; i++) {
      const l = box(leaf, 0, h - rnd() * 3, 0, 0.12, 0.01, 0.9);
      l.position.x = (rnd() - 0.5) * 0.4;
      l.rotation.set(rnd() * 0.6 - 0.3, rnd() * Math.PI * 2, 0.4);
      l.translateZ(0.45);
      g.add(l);
    }
    return g;
  }
  function crate(size = 1.6) {
    const m = new THREE.MeshLambertMaterial({ map: NC.Tex.planks('cratePlanks', '#a07040', '#5a3a20', false) });
    const g = new THREE.Group();
    g.add(box(m, 0, size / 2, 0, size, size, size));
    const dark = M(0x5a3a20);
    for (const s of [-1, 1]) g.add(box(dark, 0, size / 2, s * size / 2, size + 0.02, 0.18, 0.04));
    return g;
  }
  function pot() {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.18 + Math.sin(t * Math.PI) * 0.22 - (t > 0.85 ? 0.08 : 0), t * 0.8)); }
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 16), M(0x3a60c0)));
    put(g, mesh(new THREE.TorusGeometry(0.36, 0.03, 6, 20), M(0xffffff), 0, 0.4, 0)).rotation.x = Math.PI / 2;
    ownMats(g);
    return g;
  }
  function taikoDrum() {
    const g = new THREE.Group();
    g.add(cyl(M(0x8a4a20), 0, 0.45, 0, 0.75, 0.8, 0.75));
    g.add(cyl(M(0xf0e8d8), 0, 0.86, 0, 0.72, 0.04));
    g.add(cyl(M(0xd02020), 0, 0.885, 0, 0.3, 0.02));
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.add(sph(M(0xe8c040), Math.sin(a) * 0.76, 0.8, Math.cos(a) * 0.76, 0.03)); }
    return g;
  }
  function spikeTrap() {
    const g = new THREE.Group();
    g.add(box(M(0x40404a), 0, 0.03, 0, 2.6, 0.06, 2.6));
    const spikes = new THREE.Group();
    const steel = M(0xc8ccd8);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) spikes.add(cone(steel, -0.9 + i * 0.6, 0.25, -0.9 + j * 0.6, 0.1, 0.5));
    g.add(spikes);
    g.userData.spikes = spikes;
    return g;
  }
  function searchlight() {
    const g = new THREE.Group();
    g.add(cyl(M(0x3a3a40), 0, 2.0, 0, 0.12, 4.0));
    g.add(box(M(0x2a2a30), 0, 0.1, 0, 0.8, 0.2, 0.8));
    const head = pivot(g, 0, 4.1, 0);
    put(head, cyl(M(0x50505a), 0, 0, 0, 0.3, 0.4)).rotation.x = Math.PI / 2;
    put(head, cyl(new THREE.MeshBasicMaterial({ color: 0xfff0b0 }), 0, 0, 0.21, 0.26, 0.02)).rotation.x = Math.PI / 2;
    g.userData.head = head;
    return g;
  }
  function fishCoin() {
    const g = new THREE.Group();
    const gold = M(0xffc830, { emissive: 0x6a4000 });
    g.add(sph(gold, 0, 0, 0, 0.26, 0.16, 0.06));
    const tail = cone(gold, -0.3, 0, 0, 0.13, 0.18); tail.rotation.z = Math.PI / 2; g.add(tail);
    g.add(sph(M(0x332200), 0.14, 0.04, 0.05, 0.03));
    return g;
  }
  function bell() {
    const pts = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector2(0.06 + Math.pow(t, 2) * 0.22, 0.45 - t * 0.45)); }
    const g = new THREE.Group();
    const gold = M(0xffd030, { emissive: 0x806000 });
    const b = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), gold); b.material.side = THREE.DoubleSide; g.add(b);
    g.add(sph(gold, 0, 0.45, 0, 0.07));
    g.add(mesh(new THREE.TorusGeometry(0.08, 0.025, 6, 12), M(0xe02030), 0, 0.55, 0));
    g.add(sph(M(0x806000), 0, 0.02, 0, 0.06));
    put(g, glowSprite(0xffe060, 1.6, 0.6)).position.y = 0.25;
    return g;
  }
  function scroll() {
    const g = new THREE.Group();
    const r = cyl(M(0xf0e0b0), 0, 0, 0, 0.1, 0.5); r.rotation.z = Math.PI / 2; g.add(r);
    for (const s of [-1, 1]) { const e = cyl(M(0xb02020), s * 0.27, 0, 0, 0.12, 0.06); e.rotation.z = Math.PI / 2; g.add(e); }
    const st = shuriken(); st.scale.setScalar(0.6); st.position.z = 0.12; g.add(st);
    return g;
  }
  function smokePouch() {
    const g = new THREE.Group();
    g.add(sph(M(0x8a50c0), 0, 0.2, 0, 0.22, 0.2, 0.22));
    g.add(cyl(M(0xf0d040), 0, 0.38, 0, 0.06, 0.05));
    g.add(cone(M(0x8a50c0), 0, 0.46, 0, 0.1, 0.12));
    return g;
  }
  function onigiri() {
    const g = new THREE.Group();
    const s = new THREE.Shape();
    s.moveTo(0, 0.3); s.quadraticCurveTo(0.08, 0.3, 0.26, -0.02); s.quadraticCurveTo(0.3, -0.12, 0.2, -0.14);
    s.lineTo(-0.2, -0.14); s.quadraticCurveTo(-0.3, -0.12, -0.26, -0.02); s.quadraticCurveTo(-0.08, 0.3, 0, 0.3);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
    geo.translate(0, 0, -0.07);
    g.add(new THREE.Mesh(geo, M(0xffffff)));
    g.add(box(M(0x1a2a1a), 0, -0.07, 0, 0.18, 0.16, 0.24));
    return g;
  }
  function shuriken() {
    const s = new THREE.Shape();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, r = i % 2 === 0 ? 0.22 : 0.06;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r); else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const hole = new THREE.Path(); hole.absarc(0, 0, 0.03, 0, Math.PI * 2, true); s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 });
    geo.translate(0, 0, -0.01);
    const m = new THREE.Mesh(geo, M(0xc8d0e0, { emissive: 0x202830 }));
    const g = new THREE.Group(); g.add(m);
    return g;
  }
  function boneModel() {
    const g = new THREE.Group();
    const w = M(0xf8f0e0);
    const c = cyl(w, 0, 0, 0, 0.04, 0.36); c.rotation.z = Math.PI / 2; g.add(c);
    for (const s of [-1, 1]) for (const t of [-1, 1]) g.add(sph(w, s * 0.19, t * 0.04, 0, 0.055));
    return g;
  }
  function rocket() {
    const g = new THREE.Group();
    const body = cyl(M(0xe02030), 0, 0, 0, 0.12, 0.6); body.rotation.x = Math.PI / 2; g.add(body);
    const tip = cone(M(0xffd030), 0, 0, 0.4, 0.12, 0.22); tip.rotation.x = Math.PI / 2; g.add(tip);
    for (let i = 0; i < 4; i++) { const f = box(M(0x3050c0), 0, 0, -0.25, 0.02, 0.3, 0.2); f.rotation.z = i * Math.PI / 2; f.position.x = Math.cos(i * Math.PI / 2) * 0.12; f.position.y = Math.sin(i * Math.PI / 2) * 0.12; g.add(f); }
    put(g, glowSprite(0xffa040, 1.2, 0.9)).position.z = -0.4;
    return g;
  }
  function sign() {
    const g = new THREE.Group();
    g.add(cyl(M(0x5a3a20), 0, 0.6, 0, 0.06, 1.2));
    const face = box(new THREE.MeshLambertMaterial({ map: NC.Tex.signFace() }), 0, 1.25, 0, 0.9, 0.65, 0.08);
    g.add(face);
    return g;
  }
  function goldenFish() {
    const g = new THREE.Group();
    const gold = M(0xffd030, { emissive: 0x806000 });
    g.add(sph(gold, 0, 0, 0, 0.8, 0.5, 0.22));
    const tail = cone(gold, -0.95, 0, 0, 0.4, 0.5); tail.rotation.z = Math.PI / 2; g.add(tail);
    g.add(sph(M(0x111111), 0.45, 0.15, 0.17, 0.08));
    const fin = cone(gold, 0, 0.5, 0, 0.2, 0.4); fin.rotation.z = -0.4; g.add(fin);
    g.add(glowSprite(0xffe080, 5, 0.8));
    return g;
  }
  // a big cushion for the boss arena center
  function pedestal() {
    const g = new THREE.Group();
    g.add(cyl(M(0xa01818), 0, 0.2, 0, 0.6, 0.4));
    g.add(cyl(M(0xe8b830), 0, 0.42, 0, 0.62, 0.05));
    return g;
  }
  // background mountain with snow
  function mountain(r, h, color) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.ConeGeometry(r, h, 24, 1, true), new THREE.MeshBasicMaterial({ color, fog: true }), 0, h / 2, 0));
    g.add(mesh(new THREE.ConeGeometry(r * 0.28, h * 0.28, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xdde4f0, fog: true }), 0, h - h * 0.14 + 0.01, 0));
    return g;
  }
  // a dark pagoda shape far away
  function pagodaSilhouette(floors = 5, color = 0x141428) {
    const g = new THREE.Group();
    const m = new THREE.MeshBasicMaterial({ color, fog: true });
    for (let i = 0; i < floors; i++) {
      const w = 8 - i * 1.2;
      g.add(box(m, 0, i * 3 + 1.2, 0, w * 0.7, 2.4, w * 0.7));
      put(g, mesh(new THREE.ConeGeometry(w * 0.8, 1.2, 4), m, 0, i * 3 + 2.8, 0)).rotation.y = Math.PI / 4;
    }
    g.add(cyl(m, 0, floors * 3 + 2, 0, 0.1, 3));
    return g;
  }

  return {
    M, mesh, sph, box, cyl, cone, glowSprite, CATS, SWORDS,
    cat, animCat, setCatLook, setHat, setSword, hat,
    dog, rat, crow, frog, roboDog, animWalker, flash,
    torii, stoneLantern, setLanternLit, paperLantern, cherryTree, bamboo, crate, pot, taikoDrum, spikeTrap, searchlight,
    fishCoin, bell, scroll, smokePouch, onigiri, shuriken, boneModel, rocket, sign, goldenFish, pedestal, mountain, pagodaSilhouette,
  };
})();
