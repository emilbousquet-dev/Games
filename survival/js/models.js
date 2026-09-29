// ============================================================
//  DEAD ACRES — 3D MODELS
//  Every model is built from simple shapes (boxes, cylinders,
//  balls, cones) that each get a color, then glued together.
// ============================================================
window.DA = window.DA || {};

DA.Models = (function () {
  const U = DA.U, T = DA.Tex;
  const col = new THREE.Color();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

  // ---------- shared materials ----------
  const mats = {};
  const mat = (key, make) => mats[key] || (mats[key] = make());
  const M = {
    vc: () => mat('vc', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, flatShading: true })),
    vcSmooth: () => mat('vcSmooth', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 })),
    vcShiny: () => mat('vcShiny', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.5 })),
    glass: () => mat('glass', () => new THREE.MeshStandardMaterial({ color: 0x223038, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.55 })),
    eyes: () => mat('eyes', () => new THREE.MeshStandardMaterial({ color: 0xd8d890, emissive: 0xb0b060, emissiveIntensity: 0.8 })),
    bossEyes: () => mat('bossEyes', () => new THREE.MeshStandardMaterial({ color: 0xff4020, emissive: 0xff2000, emissiveIntensity: 2.5 })),
    parachute: () => mat('parachute', () => new THREE.MeshStandardMaterial({ color: 0xe86020, roughness: 0.8, side: THREE.DoubleSide })),
    fire: () => mat('fire', () => new THREE.MeshBasicMaterial({ color: 0xffa030 })),
    redLight: () => mat('redLight', () => new THREE.MeshBasicMaterial({ color: 0xff2020 })),
    planks: () => mat('planks', () => new THREE.MeshStandardMaterial({ map: T.planks(), roughness: 0.9 })),
    stoneWall: () => mat('stoneWall', () => new THREE.MeshStandardMaterial({ map: T.stoneWall(), roughness: 0.95 })),
    bark: () => mat('bark', () => new THREE.MeshStandardMaterial({ map: T.bark(), roughness: 0.95 })),
  };

  // ---------- the "kit": collect colored shapes, then glue them ----------
  class Kit {
    constructor() { this.parts = []; }
    add(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      let g = geo.index ? geo.toNonIndexed() : geo;
      if (g !== geo) geo.dispose();
      _e.set(rx, ry, rz); _q.setFromEuler(_e); _p.set(x, y, z); _s.set(sx, sy, sz);
      _m.compose(_p, _q, _s);
      g.applyMatrix4(_m);
      col.set(color);
      const n = g.attributes.position.count, c = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
      this.parts.push(g);
      return this;
    }
    box(w, h, d, color, x, y, z, rx, ry, rz) { return this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz); }
    cyl(rt, rb, h, color, x, y, z, rx, ry, rz, seg = 8) { return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, x, y, z, rx, ry, rz); }
    ball(r, color, x, y, z, sx = 1, sy = 1, sz = 1, detail = 1) { return this.add(new THREE.IcosahedronGeometry(r, detail), color, x, y, z, 0, 0, 0, sx, sy, sz); }
    cone(r, h, color, x, y, z, rx, ry, rz, seg = 8) { return this.add(new THREE.ConeGeometry(r, h, seg), color, x, y, z, rx, ry, rz); }
    get empty() { return this.parts.length === 0; }
    geo() { const g = U.mergeGeometries(this.parts); this.parts = []; return g; }
    mesh(material) {
      const m = new THREE.Mesh(this.geo(), material || M.vc());
      m.castShadow = true; m.receiveShadow = true;
      return m;
    }
  }
  const kit = () => new Kit();
  const group = (...kids) => { const g = new THREE.Group(); kids.forEach((k) => k && g.add(k)); return g; };
  const at = (obj, x, y, z) => { obj.position.set(x, y, z); return obj; };

  // lumpy rock shape
  function rockGeo(seed, r = 1) {
    const g = new THREE.IcosahedronGeometry(r, 1);
    const p = g.attributes.position;
    const rnd = U.seeded(seed);
    const bumps = [];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`; // same corner = same bump (no cracks)
      if (!bumps[key]) bumps[key] = 0.75 + rnd() * 0.45;
      const k = bumps[key];
      p.setXYZ(i, x * k * 1.15, Math.max(y * k * 0.75, -0.25 * r), z * k);
    }
    return g;
  }

  // ============================================================
  //  NATURE
  // ============================================================
  const Nature = {
    // leafy tree (the trunk goes from 0 up)
    oak(seed) {
      const k = kit(), rnd = U.seeded(seed);
      const h = 3.2 + rnd() * 1.2;
      k.cyl(0.18, 0.3, h, 0x5a4432, 0, h / 2, 0, 0, 0, 0, 6);
      k.cyl(0.07, 0.12, 1.6, 0x5a4432, 0.45, h * 0.75, 0, 0, 0, -0.7, 5);
      k.cyl(0.07, 0.12, 1.4, 0x5a4432, -0.35, h * 0.8, 0.2, 0.3, 0, 0.7, 5);
      const greens = [0x3f6b2a, 0x4a7a30, 0x365e24, 0x557f36];
      for (let i = 0; i < 6; i++) {
        const a = rnd() * 6.28, d = rnd() * 1.1;
        k.ball(1.1 + rnd() * 0.6, greens[i % 4], Math.cos(a) * d, h + 0.4 + rnd() * 1.4, Math.sin(a) * d, 1, 0.85, 1, 0);
      }
      return k.geo();
    },
    // pine tree (a stack of cones)
    pine(seed) {
      const k = kit(), rnd = U.seeded(seed);
      const h = 7 + rnd() * 3;
      k.cyl(0.14, 0.28, h * 0.5, 0x4d3a2a, 0, h * 0.25, 0, 0, 0, 0, 6);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const r = 2.2 * (1 - t * 0.75), ch = h * 0.34;
        k.cone(r, ch, [0x2c4a2a, 0x335436, 0x28442a, 0x30502e][i], 0, h * 0.25 + t * h * 0.62 + ch / 2, 0, 0, rnd() * 3, 0, 7);
      }
      return k.geo();
    },
    // dead grey tree
    deadTree(seed) {
      const k = kit(), rnd = U.seeded(seed);
      const h = 4 + rnd() * 2;
      k.cyl(0.12, 0.26, h, 0x4a4540, 0, h / 2, 0, 0, 0, 0, 5);
      for (let i = 0; i < 5; i++) {
        const a = rnd() * 6.28, y = h * (0.4 + rnd() * 0.5), L = 1 + rnd() * 1.2;
        k.cyl(0.03, 0.08, L, 0x4a4540, Math.cos(a) * L * 0.4, y + L * 0.3, Math.sin(a) * L * 0.4, Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9, 4);
      }
      return k.geo();
    },
    stump() {
      const k = kit();
      k.cyl(0.26, 0.32, 0.45, 0x5a4432, 0, 0.22, 0, 0, 0, 0, 7);
      k.cyl(0.25, 0.25, 0.02, 0xb89a70, 0, 0.455, 0, 0, 0, 0, 7);
      return k.geo();
    },
    rock(seed) {
      const k = kit();
      k.add(rockGeo(seed), [0x7a7874, 0x8a8680, 0x6e6c6a][seed % 3]);
      return k.geo();
    },
    bush(seed) {
      const k = kit(), rnd = U.seeded(seed);
      for (let i = 0; i < 4; i++) k.ball(0.45 + rnd() * 0.25, [0x3c6628, 0x46722e, 0x355a22][i % 3], (rnd() - 0.5) * 0.8, 0.4 + rnd() * 0.3, (rnd() - 0.5) * 0.8, 1, 0.8, 1, 0);
      return k.geo();
    },
    berries() {
      const k = kit(), rnd = U.seeded(7);
      for (let i = 0; i < 16; i++) {
        const a = rnd() * 6.28, y = 0.3 + rnd() * 0.6, r = 0.55 + rnd() * 0.15;
        k.ball(0.06, rnd() < 0.5 ? 0xb01830 : 0x5a1a6a, Math.cos(a) * r, y, Math.sin(a) * r, 1, 1, 1, 0);
      }
      return k.geo();
    },
    // bunches of grass (two crossed see-through cards)
    grassClump() {
      const parts = [];
      for (const a of [0, Math.PI / 3, -Math.PI / 3]) for (const flip of [0, Math.PI]) {
        const g = new THREE.PlaneGeometry(0.7, 0.4); g.translate(0, 0.2, 0);
        g.rotateY(a + flip); // two cards back to back = both sides look the same
        parts.push(g.toNonIndexed());
      }
      const g = U.mergeGeometries(parts);
      const n = g.attributes.normal;
      for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0); // lit like the ground under it
      return g;
    },
    // a falling tree after you chop it
    fallingTree(geo) {
      const m = new THREE.Mesh(geo, M.vc());
      m.castShadow = true;
      return m;
    },
    log() {
      const k = kit();
      k.cyl(0.25, 0.25, 2.4, 0x5a4432, 0, 0, 0, 0, 0, Math.PI / 2, 7);
      return k.mesh();
    },
  };

  // ============================================================
  //  PEOPLE, ZOMBIES and ANIMALS
  //  Each body part is its own group so it can swing (walking!)
  // ============================================================
  function humanoid(o) {
    const s = o.scale || 1, fat = o.fat || 1, thin = o.thin || 1;
    const root = new THREE.Group();
    const body = new THREE.Group(); root.add(body); // leans forward / falls over
    body.name = 'body';
    const hipY = 0.95;
    const hips = at(new THREE.Group(), 0, hipY, 0); body.add(hips); hips.name = 'hips';
    const torso = new THREE.Group(); hips.add(torso); torso.name = 'torso';
    const tk = kit();
    const tw = 0.46 * fat * thin, td = 0.26 * fat;
    tk.box(tw, 0.62, td, o.shirt, 0, 0.33, 0);
    tk.box(tw * 1.04, 0.12, td * 1.04, o.pants, 0, 0.03, 0); // belt line
    if (o.torn) { // ripped holes in the shirt
      tk.box(0.14, 0.12, 0.02, o.skin, -0.08, 0.3, -td / 2 - 0.005);
      tk.box(0.1, 0.16, 0.02, o.stain || 0x3a1212, 0.1, 0.45, -td / 2 - 0.006);
    }
    if (o.backpack) { tk.box(0.36, 0.44, 0.18, o.backpack, 0, 0.36, td / 2 + 0.09); tk.box(0.3, 0.14, 0.06, 0x2a2420, 0, 0.2, td / 2 + 0.19); }
    if (o.vest) tk.box(tw * 1.06, 0.4, td * 1.08, o.vest, 0, 0.36, 0);
    torso.add(tk.mesh());
    // head
    const head = at(new THREE.Group(), 0, 0.7, 0); torso.add(head); head.name = 'head';
    const hk = kit();
    hk.box(0.1, 0.08, 0.1, o.skin, 0, 0.02, 0); // neck
    hk.box(0.25, 0.28, 0.26, o.skin, 0, 0.19, 0);
    if (o.hair) hk.box(0.27, 0.1, 0.28, o.hair, 0, 0.32, 0.01);
    if (o.hair && !o.zombie) hk.box(0.27, 0.16, 0.06, o.hair, 0, 0.22, 0.12);
    if (o.cap) { hk.box(0.28, 0.08, 0.29, o.cap, 0, 0.34, 0); hk.box(0.26, 0.02, 0.14, o.cap, 0, 0.31, -0.2); }
    if (o.zombie) {
      hk.box(0.07, 0.05, 0.02, 0x141008, -0.06, 0.21, -0.131); // dark eye holes
      hk.box(0.07, 0.05, 0.02, 0x141008, 0.06, 0.21, -0.131);
      hk.box(0.12, 0.04, 0.02, 0x2a0a0a, 0, 0.1, -0.131); // mouth
    } else {
      hk.box(0.04, 0.04, 0.02, 0x1a1a1a, -0.06, 0.21, -0.131);
      hk.box(0.04, 0.04, 0.02, 0x1a1a1a, 0.06, 0.21, -0.131);
    }
    head.add(hk.mesh());
    if (o.zombie) { // faint glowing eyes: you can see them in the dark...
      const e = kit();
      e.box(0.03, 0.025, 0.01, 0xffffff, -0.06, 0.21, -0.142);
      e.box(0.03, 0.025, 0.01, 0xffffff, 0.06, 0.21, -0.142);
      const em = new THREE.Mesh(e.geo(), o.boss ? M.bossEyes() : M.eyes()); head.add(em);
    }
    // arms (the group turns at the shoulder)
    const arm = (side) => {
      const g = at(new THREE.Group(), side * (tw / 2 + 0.07), 0.6, 0);
      const ak = kit();
      ak.box(0.12 * fat, 0.34, 0.12 * fat, o.sleeve || o.shirt, 0, -0.16, 0);
      ak.box(0.1 * fat, 0.3, 0.1 * fat, o.armless === side ? o.stain || 0x3a1212 : (o.bareArms ? o.skin : o.sleeve || o.shirt), 0, -0.46, 0);
      ak.box(0.1, 0.1, 0.1, o.skin, 0, -0.64, 0);
      g.add(ak.mesh());
      const hand = at(new THREE.Group(), 0, -0.66, -0.02); g.add(hand);
      g.name = side < 0 ? 'armL' : 'armR'; hand.name = side < 0 ? 'handL' : 'handR';
      torso.add(g);
      return { g, hand };
    };
    const aL = arm(-1), aR = arm(1);
    // legs (the group turns at the hip)
    const leg = (side) => {
      const g = at(new THREE.Group(), side * 0.12 * fat, 0, 0);
      const lk = kit();
      lk.box(0.16 * fat, 0.46, 0.17 * fat, o.pants, 0, -0.23, 0);
      lk.box(0.14 * fat, 0.42, 0.15 * fat, o.pants, 0, -0.66, 0);
      lk.box(0.15, 0.1, 0.26, o.shoes || 0x2a2420, 0, -0.9, -0.04);
      g.add(lk.mesh());
      g.name = side < 0 ? 'legL' : 'legR';
      hips.add(g);
      return g;
    };
    const legL = leg(-1), legR = leg(1);
    root.scale.setScalar(s);
    return { root, body, hips, torso, head, armL: aL.g, armR: aR.g, handR: aR.hand, handL: aL.hand, legL, legR };
  }

  const PLAYER_COLORS = [0xd0702a, 0x2a6ad0, 0x3aa048, 0xb040b0];
  const SKINS = [0xe0b090, 0xb88060, 0x8a5a3a, 0xf0c8a8];

  const People = {
    PLAYER_COLORS,
    survivor(colorIndex = 0, skinIndex = 0) {
      return humanoid({
        shirt: PLAYER_COLORS[colorIndex % 4], sleeve: PLAYER_COLORS[colorIndex % 4], pants: 0x35404e, skin: SKINS[skinIndex % 4],
        hair: [0x3a2a1a, 0x1a1410, 0x8a5a2a, 0xc8a050][(colorIndex + skinIndex) % 4], backpack: 0x5a4a30, shoes: 0x3a2a1a,
        cap: colorIndex === 1 ? 0x2a2a2a : null,
      });
    },

    // kinds: walker, runner, brute
    zombie(kind, variant) {
      const rnd = U.seeded(variant * 97 + kind.length * 13);
      const shirts = [0x5a6a7a, 0x7a5a4a, 0x4a5a3a, 0x8a8a78, 0x3a3a4a, 0x6a2a2a, 0x2a4a6a, 0x9a8a60];
      const pants = [0x2a3040, 0x3a3228, 0x4a4a48, 0x283828, 0x1a1a1e];
      const skins = [0x8a9a78, 0x7a8a70, 0x98a088, 0x8a8a70];
      const o = {
        zombie: true, torn: true,
        shirt: shirts[Math.floor(rnd() * shirts.length)], pants: pants[Math.floor(rnd() * pants.length)],
        skin: skins[Math.floor(rnd() * skins.length)], stain: 0x4a1414,
        hair: rnd() < 0.6 ? [0x2a2420, 0x4a3a28, 0x6a6a60][Math.floor(rnd() * 3)] : null,
        bareArms: rnd() < 0.4, shoes: 0x1e1a18,
      };
      if (kind === 'runner') { o.thin = 0.85; o.bareArms = true; o.shirt = [0x6a2a2a, 0x2a2a2a, 0x7a7a70][Math.floor(rnd() * 3)]; }
      if (kind === 'brute') { o.scale = 1.3; o.fat = 1.45; o.vest = rnd() < 0.5 ? 0xb89020 : null; o.hair = null; }
      if (kind === 'boss') { o.scale = 1.9; o.fat = 1.6; o.boss = true; o.hair = null; o.shirt = 0x3a1a1a; o.pants = 0x1a1a1a; o.skin = 0x7a8a68; o.vest = 0x5a5a5a; o.cap = null; }
      if (rnd() < 0.15) o.cap = 0x7a2a1a;
      return humanoid(o);
    },

    deer() {
      const root = new THREE.Group();
      const body = new THREE.Group(); root.add(body);
      const bk = kit();
      bk.box(0.42, 0.45, 1.15, 0x8a6240, 0, 1.0, 0);
      bk.box(0.3, 0.2, 0.3, 0xe8e0d0, 0, 1.05, 0.56); // white tail
      body.add(bk.mesh());
      const head = at(new THREE.Group(), 0, 1.15, -0.5); body.add(head);
      const hk = kit();
      hk.box(0.2, 0.5, 0.22, 0x8a6240, 0, 0.25, -0.05, -0.4, 0, 0);
      hk.box(0.2, 0.2, 0.36, 0x8a6240, 0, 0.5, -0.2);
      hk.box(0.12, 0.1, 0.14, 0x3a2a20, 0, 0.47, -0.4);
      hk.box(0.06, 0.14, 0.04, 0x8a6240, -0.1, 0.64, -0.12, 0, 0, -0.5);
      hk.box(0.06, 0.14, 0.04, 0x8a6240, 0.1, 0.64, -0.12, 0, 0, 0.5);
      hk.cyl(0.02, 0.02, 0.4, 0xd8c8a0, -0.1, 0.8, -0.1, 0, 0, 0.4, 4);
      hk.cyl(0.02, 0.02, 0.4, 0xd8c8a0, 0.1, 0.8, -0.1, 0, 0, -0.4, 4);
      head.add(hk.mesh());
      body.name = 'body'; head.name = 'head';
      const legs = [];
      for (const [x, z] of [[-0.14, -0.45], [0.14, -0.45], [-0.14, 0.45], [0.14, 0.45]]) {
        const g = at(new THREE.Group(), x, 0.85, z);
        const lk = kit(); lk.box(0.08, 0.85, 0.08, 0x7a5436, 0, -0.42, 0); lk.box(0.09, 0.06, 0.1, 0x2a2018, 0, -0.84, 0);
        g.add(lk.mesh()); body.add(g); legs.push(g); g.name = 'leg' + legs.length;
      }
      return { root, body, head, legs };
    },

    rabbit() {
      const root = new THREE.Group();
      const body = new THREE.Group(); root.add(body);
      const k = kit();
      k.ball(0.15, 0x8a7a68, 0, 0.16, 0.02, 1, 0.9, 1.3, 1);
      k.ball(0.09, 0x8a7a68, 0, 0.27, -0.16, 1, 1, 1.1, 1);
      k.box(0.04, 0.16, 0.02, 0x8a7a68, -0.03, 0.4, -0.14, 0.2, 0, 0);
      k.box(0.04, 0.16, 0.02, 0x8a7a68, 0.03, 0.4, -0.14, 0.2, 0, 0);
      k.ball(0.05, 0xf0f0f0, 0, 0.2, 0.2, 1, 1, 1, 0);
      body.add(k.mesh()); body.name = 'body';
      return { root, body, head: body, legs: [] };
    },

    // your dog buddy
    dog(color = 0x9a6a3a) {
      const root = new THREE.Group();
      const body = new THREE.Group(); root.add(body); body.name = 'body';
      const k = kit();
      k.box(0.3, 0.3, 0.7, color, 0, 0.5, 0);
      k.box(0.26, 0.12, 0.5, 0xe8d8b8, 0, 0.36, -0.02); // light belly
      body.add(k.mesh());
      const head = at(new THREE.Group(), 0, 0.68, -0.38); body.add(head); head.name = 'head';
      const hk = kit();
      hk.box(0.26, 0.24, 0.26, color, 0, 0.04, -0.04);
      hk.box(0.14, 0.12, 0.16, 0xe8d8b8, 0, -0.02, -0.22);
      hk.box(0.07, 0.05, 0.04, 0x1a1a1a, 0, 0.02, -0.31);
      hk.box(0.05, 0.05, 0.02, 0x1a1a1a, -0.07, 0.1, -0.175); hk.box(0.05, 0.05, 0.02, 0x1a1a1a, 0.07, 0.1, -0.175);
      hk.box(0.07, 0.14, 0.05, 0x5a3a1a, -0.13, 0.12, 0.02, 0, 0, 0.5); hk.box(0.07, 0.14, 0.05, 0x5a3a1a, 0.13, 0.12, 0.02, 0, 0, -0.5);
      hk.box(0.2, 0.05, 0.1, 0xd02020, 0, -0.1, 0.06); // red collar
      head.add(hk.mesh());
      const tail = at(new THREE.Group(), 0, 0.6, 0.35); body.add(tail); tail.name = 'tail';
      const tk = kit(); tk.box(0.06, 0.06, 0.3, color, 0, 0.08, 0.12, -0.6, 0, 0); tail.add(tk.mesh());
      const legs = [];
      for (const [x, z] of [[-0.1, -0.25], [0.1, -0.25], [-0.1, 0.25], [0.1, 0.25]]) {
        const g = at(new THREE.Group(), x, 0.38, z);
        const lk = kit(); lk.box(0.08, 0.38, 0.08, color, 0, -0.19, 0); lk.box(0.09, 0.05, 0.11, 0xe8d8b8, 0, -0.37, -0.01);
        g.add(lk.mesh()); body.add(g); legs.push(g); g.name = 'leg' + legs.length;
      }
      return { root, body, head, tail, legs };
    },

    // a dropped backpack (your stuff after you die)
    bag() {
      const k = kit();
      k.box(0.45, 0.5, 0.28, 0x5a4a30, 0, 0.25, 0);
      k.box(0.36, 0.18, 0.1, 0x4a3a24, 0, 0.18, -0.18);
      k.box(0.47, 0.08, 0.3, 0x3a2e1e, 0, 0.5, 0);
      return group(k.mesh());
    },
  };

  // ============================================================
  //  PROPS (furniture, cars, town stuff)
  //  Models sit on the floor at y = 0 and face -z (the front).
  // ============================================================
  const Props = {
    car(color = 0x8a2a20) {
      const k = kit();
      const dark = 0x1a1a1a;
      k.box(1.8, 0.55, 4.2, color, 0, 0.62, 0);
      k.box(1.62, 0.5, 2.1, color, 0, 1.12, 0.25);
      k.box(1.82, 0.12, 0.2, 0x9a9a9a, 0, 0.45, -2.12); // bumpers
      k.box(1.82, 0.12, 0.2, 0x9a9a9a, 0, 0.45, 2.12);
      k.box(0.3, 0.12, 0.04, 0xf0f0c8, -0.6, 0.72, -2.11); // lights
      k.box(0.3, 0.12, 0.04, 0xf0f0c8, 0.6, 0.72, -2.11);
      k.box(0.3, 0.1, 0.04, 0x8a1010, -0.6, 0.72, 2.11);
      k.box(0.3, 0.1, 0.04, 0x8a1010, 0.6, 0.72, 2.11);
      k.box(0.5, 0.3, 0.5, 0x5a3a22, 0.5, 0.9, -1.4); // rust spots
      k.box(0.02, 0.4, 0.9, 0x4a2a1a, 0.91, 0.62, 1.1);
      for (const [x, z] of [[-0.85, -1.35], [0.85, -1.35], [-0.85, 1.35], [0.85, 1.35]]) k.cyl(0.36, 0.36, 0.28, dark, x, 0.36, z, 0, 0, Math.PI / 2, 10);
      const m = k.mesh(M.vcShiny());
      const w = kit();
      w.box(1.5, 0.42, 0.04, 0xffffff, 0, 1.12, -0.82, -0.35, 0, 0);
      w.box(1.5, 0.4, 0.04, 0xffffff, 0, 1.14, 1.33, 0.3, 0, 0);
      w.box(0.04, 0.36, 1.8, 0xffffff, -0.82, 1.14, 0.25);
      w.box(0.04, 0.36, 1.8, 0xffffff, 0.82, 1.14, 0.25);
      const glass = new THREE.Mesh(w.geo(), M.glass());
      return group(m, glass);
    },
    fridge() {
      const k = kit();
      k.box(0.75, 1.8, 0.7, 0xd8d8d0, 0, 0.9, 0);
      k.box(0.72, 0.02, 0.02, 0x707070, 0, 1.2, -0.36);
      k.box(0.04, 0.4, 0.05, 0x9a9a9a, 0.3, 1.45, -0.38);
      k.box(0.04, 0.4, 0.05, 0x9a9a9a, 0.3, 0.8, -0.38);
      return group(k.mesh(M.vcSmooth()));
    },
    counter(w = 2) {
      const k = kit();
      k.box(w, 0.86, 0.6, 0xa89070, 0, 0.43, 0);
      k.box(w + 0.04, 0.05, 0.64, 0x5a5a5a, 0, 0.88, 0);
      for (let i = 0; i < Math.round(w / 0.5); i++) {
        const x = -w / 2 + 0.25 + i * 0.5;
        k.box(0.44, 0.7, 0.02, 0x8a7458, x, 0.45, -0.305);
        k.box(0.1, 0.03, 0.03, 0x404040, x, 0.72, -0.32);
      }
      k.box(0.5, 0.04, 0.4, 0x9a9a9a, -w / 2 + 0.5, 0.9, 0); // sink
      return group(k.mesh());
    },
    cabinet() { // bathroom sink cabinet with mirror
      const k = kit();
      k.box(0.8, 0.8, 0.5, 0xe0e0d8, 0, 0.4, 0);
      k.box(0.5, 0.06, 0.36, 0xf0f0f0, 0, 0.83, 0);
      k.box(0.6, 0.7, 0.04, 0xa8c0c8, 0, 1.55, 0.23);
      k.box(0.36, 0.6, 0.02, 0xd0d0c8, -0.2, 0.42, -0.26);
      k.box(0.36, 0.6, 0.02, 0xd0d0c8, 0.2, 0.42, -0.26);
      return group(k.mesh(M.vcSmooth()));
    },
    toilet() {
      const k = kit();
      k.box(0.4, 0.4, 0.55, 0xf0f0f0, 0, 0.2, 0);
      k.box(0.44, 0.06, 0.5, 0xe8e8e8, 0, 0.43, -0.02);
      k.box(0.42, 0.45, 0.18, 0xf0f0f0, 0, 0.6, 0.22);
      return group(k.mesh(M.vcSmooth()));
    },
    bed(color = 0x6a7a9a) {
      const k = kit();
      k.box(1.4, 0.35, 2.0, 0x6a4a30, 0, 0.18, 0);
      k.box(1.35, 0.2, 1.95, 0xe8e4d8, 0, 0.45, 0);
      k.box(1.37, 0.08, 1.4, color, 0, 0.58, 0.28);
      k.box(0.5, 0.12, 0.35, 0xf0f0f0, -0.32, 0.6, -0.72);
      k.box(0.5, 0.12, 0.35, 0xf0f0f0, 0.32, 0.6, -0.72);
      k.box(1.44, 0.8, 0.08, 0x5a3a24, 0, 0.5, -1.02);
      return group(k.mesh());
    },
    wardrobe() {
      const k = kit();
      k.box(1.1, 2.0, 0.55, 0x6a4a30, 0, 1.0, 0);
      k.box(0.02, 1.9, 0.02, 0x2a1a10, 0, 1.0, -0.28);
      k.box(0.03, 0.2, 0.04, 0xa08040, -0.08, 1.1, -0.3);
      k.box(0.03, 0.2, 0.04, 0xa08040, 0.08, 1.1, -0.3);
      return group(k.mesh());
    },
    table() {
      const k = kit();
      k.box(1.4, 0.06, 0.9, 0x7a5a38, 0, 0.76, 0);
      for (const [x, z] of [[-0.6, -0.35], [0.6, -0.35], [-0.6, 0.35], [0.6, 0.35]]) k.box(0.06, 0.74, 0.06, 0x5a3a24, x, 0.37, z);
      return group(k.mesh());
    },
    chair(fallen) {
      const k = kit();
      k.box(0.44, 0.05, 0.44, 0x7a5a38, 0, 0.45, 0);
      k.box(0.44, 0.5, 0.05, 0x7a5a38, 0, 0.72, 0.2);
      for (const [x, z] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) k.box(0.04, 0.45, 0.04, 0x5a3a24, x, 0.22, z);
      const m = k.mesh();
      if (fallen) { m.rotation.x = Math.PI / 2; m.position.y = 0.22; }
      return group(m);
    },
    sofa(color = 0x6a3a3a) {
      const k = kit();
      k.box(2.0, 0.42, 0.85, color, 0, 0.21, 0);
      k.box(2.0, 0.55, 0.2, color, 0, 0.6, 0.33);
      k.box(0.2, 0.3, 0.85, color, -0.9, 0.55, 0);
      k.box(0.2, 0.3, 0.85, color, 0.9, 0.55, 0);
      k.box(0.8, 0.1, 0.6, 0x5a2a2a, -0.45, 0.46, -0.05);
      return group(k.mesh());
    },
    tv() {
      const k = kit();
      k.box(1.1, 0.5, 0.45, 0x5a3a24, 0, 0.25, 0);
      k.box(0.9, 0.55, 0.08, 0x1a1a1a, 0, 0.8, 0.05);
      k.box(0.8, 0.46, 0.02, 0x0a1418, 0, 0.8, 0.0);
      return group(k.mesh());
    },
    shelf(fill = true) { // store shelf
      const k = kit(), rnd = U.seeded(3);
      k.box(1.8, 1.7, 0.08, 0x9a9a9a, 0, 0.85, 0.26);
      for (let i = 0; i < 4; i++) k.box(1.8, 0.04, 0.55, 0xb0b0b0, 0, 0.12 + i * 0.45, 0);
      k.box(0.04, 1.7, 0.55, 0x8a8a8a, -0.9, 0.85, 0); k.box(0.04, 1.7, 0.55, 0x8a8a8a, 0.9, 0.85, 0);
      if (fill) {
        const cs = [0xc83a2a, 0x2a6ac8, 0xe0c030, 0x3a9a3a, 0xe07020, 0xf0f0f0];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) {
          if (rnd() < 0.45) continue; // looted...
          k.box(0.16, 0.2 + rnd() * 0.1, 0.18, cs[Math.floor(rnd() * cs.length)], -0.75 + j * 0.25, 0.25 + i * 0.45, -0.05 + rnd() * 0.1);
        }
      }
      return group(k.mesh());
    },
    locker() {
      const k = kit();
      for (let i = 0; i < 3; i++) {
        k.box(0.46, 1.9, 0.5, 0x4a5a6a, -0.48 + i * 0.48, 0.95, 0);
        k.box(0.3, 0.04, 0.02, 0x2a2a2a, -0.48 + i * 0.48, 1.6, -0.26);
        k.box(0.3, 0.04, 0.02, 0x2a2a2a, -0.48 + i * 0.48, 1.54, -0.26);
      }
      return group(k.mesh(M.vcShiny()));
    },
    desk() {
      const k = kit();
      k.box(1.6, 0.06, 0.8, 0x6a5a48, 0, 0.76, 0);
      k.box(0.5, 0.72, 0.76, 0x5a4a3a, -0.52, 0.37, 0);
      k.box(0.06, 0.72, 0.76, 0x5a4a3a, 0.76, 0.37, 0);
      k.box(0.5, 0.35, 0.3, 0x2a2a2a, 0.2, 0.97, 0.1); // old computer
      k.box(0.44, 0.28, 0.02, 0x1a3a2a, 0.2, 0.98, -0.06);
      return group(k.mesh());
    },
    workbench() {
      const k = kit();
      k.box(2.0, 0.08, 0.8, 0x8a6a48, 0, 0.9, 0);
      for (const [x, z] of [[-0.9, -0.34], [0.9, -0.34], [-0.9, 0.34], [0.9, 0.34]]) k.box(0.08, 0.9, 0.08, 0x5a4432, x, 0.45, z);
      k.box(1.9, 0.04, 0.7, 0x6a5038, 0, 0.3, 0);
      k.box(0.5, 0.2, 0.25, 0xb02020, -0.5, 1.04, 0); // toolbox
      k.box(2.0, 1.1, 0.05, 0x6a5038, 0, 1.5, 0.38); // pegboard
      k.box(0.05, 0.4, 0.05, 0x3a3a3a, 0.4, 1.5, 0.34); k.box(0.3, 0.05, 0.05, 0x3a3a3a, 0.7, 1.7, 0.34);
      return group(k.mesh());
    },
    crate() {
      const k = kit();
      k.box(0.9, 0.7, 0.7, 0x9a7a50, 0, 0.35, 0);
      k.box(0.92, 0.08, 0.72, 0x6a4a30, 0, 0.66, 0);
      k.box(0.92, 0.08, 0.72, 0x6a4a30, 0, 0.06, 0);
      return group(k.mesh());
    },
    hay() {
      const k = kit();
      k.box(1.1, 0.5, 0.55, 0xc8a850, 0, 0.25, 0);
      k.box(1.12, 0.03, 0.57, 0x8a6a30, 0, 0.25, 0);
      return group(k.mesh());
    },
    pump() { // gas pump
      const k = kit();
      k.box(0.6, 1.5, 0.4, 0xc02020, 0, 0.75, 0);
      k.box(0.5, 0.35, 0.02, 0x1a1a1a, 0, 1.15, -0.21);
      k.box(0.12, 0.25, 0.1, 0x2a2a2a, 0.33, 0.9, 0);
      k.box(0.7, 0.1, 0.5, 0x8a8a8a, 0, 0.05, 0);
      return group(k.mesh(M.vcShiny()));
    },
    barrel(color = 0x3a5a3a) {
      const k = kit();
      k.cyl(0.3, 0.3, 0.9, color, 0, 0.45, 0, 0, 0, 0, 10);
      k.cyl(0.31, 0.31, 0.04, 0x2a2a2a, 0, 0.3, 0, 0, 0, 0, 10);
      k.cyl(0.31, 0.31, 0.04, 0x2a2a2a, 0, 0.62, 0, 0, 0, 0, 10);
      return group(k.mesh(M.vcShiny()));
    },
    fence(len = 3) { // wooden farm fence
      const k = kit();
      for (let x = -len / 2; x <= len / 2 + 0.01; x += len / 2) k.box(0.1, 1.1, 0.1, 0x6a5038, x, 0.55, 0);
      k.box(len, 0.1, 0.05, 0x7a6048, 0, 0.8, 0);
      k.box(len, 0.1, 0.05, 0x7a6048, 0, 0.45, 0);
      return group(k.mesh());
    },
    corpse() { // an old body under a sheet (not gross)
      const k = kit();
      k.box(0.6, 0.25, 1.7, 0xc8c0b0, 0, 0.12, 0);
      k.ball(0.18, 0xc8c0b0, 0, 0.2, -0.75, 1, 0.8, 1, 1);
      k.box(0.3, 0.02, 0.4, 0x5a1a1a, 0.1, 0.25, 0.1);
      return group(k.mesh());
    },
    // the supply plane
    plane() {
      const root = new THREE.Group();
      const k = kit();
      k.cyl(0.9, 0.7, 12, 0x6a7a5a, 0, 0, 0, Math.PI / 2, 0, 0, 10);
      k.cone(0.9, 2, 0x6a7a5a, 0, 0, -7, -Math.PI / 2, 0, 0, 10);
      k.box(22, 0.25, 2.4, 0x5a6a4a, 0, 0.3, -1);
      k.box(7, 0.2, 1.4, 0x5a6a4a, 0, 0.4, 5.5);
      k.box(0.2, 2.4, 1.6, 0x5a6a4a, 0, 1.4, 5.6);
      for (const x of [-6, -3, 3, 6]) { k.cyl(0.5, 0.5, 2, 0x3a3a3a, x, 0, -1.4, Math.PI / 2, 0, 0, 8); }
      k.box(1.2, 0.8, 0.05, 0xf0f0f0, 0.95, 0.2, -2, 0, Math.PI / 2, 0);
      root.add(k.mesh(M.vcShiny()));
      return root;
    },
    // a crate hanging from a parachute (the parachute can be removed)
    supplyCrate() {
      const root = new THREE.Group();
      const k = kit();
      k.box(1.2, 0.9, 1.2, 0x4a5a3a, 0, 0.45, 0);
      k.box(1.24, 0.12, 1.24, 0x2a3222, 0, 0.9, 0);
      k.box(1.24, 0.12, 1.24, 0x2a3222, 0, 0.06, 0);
      k.box(0.5, 0.5, 0.02, 0xf0f0f0, 0, 0.5, -0.611); k.box(0.12, 0.34, 0.03, 0xd02020, 0, 0.5, -0.615); k.box(0.34, 0.12, 0.03, 0xd02020, 0, 0.5, -0.615);
      root.add(k.mesh());
      const chute = new THREE.Group();
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(2.4, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), M.parachute());
      canopy.position.y = 4.2; canopy.scale.y = 0.6;
      chute.add(canopy);
      const lk = kit();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2, x = Math.cos(a) * 1.9, z = Math.sin(a) * 1.9;
        const dir = new THREE.Vector3(x, 3.4, z);
        const g = new THREE.CylinderGeometry(0.012, 0.012, dir.length(), 3);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()));
        lk.add(g, 0xf0f0f0, x / 2, 0.9 + 1.7, z / 2);
      }
      chute.add(lk.mesh());
      root.add(chute);
      root.userData.chute = chute;
      return root;
    },

    // the rescue helicopter
    helicopter() {
      const root = new THREE.Group();
      const k = kit();
      k.ball(1.4, 0x3a4a2a, 0, 1.6, 0, 1, 1, 1.5, 1);
      k.box(0.5, 0.5, 5, 0x3a4a2a, 0, 1.9, 3.6);
      k.box(0.1, 1.2, 0.8, 0x3a4a2a, 0, 2.4, 6);
      k.box(0.12, 0.12, 3.2, 0x2a2a2a, -1, 0.1, 0); k.box(0.12, 0.12, 3.2, 0x2a2a2a, 1, 0.1, 0);
      k.box(0.08, 0.7, 0.08, 0x2a2a2a, -0.9, 0.45, -0.8); k.box(0.08, 0.7, 0.08, 0x2a2a2a, 0.9, 0.45, -0.8);
      k.box(0.08, 0.7, 0.08, 0x2a2a2a, -0.9, 0.45, 0.8); k.box(0.08, 0.7, 0.08, 0x2a2a2a, 0.9, 0.45, 0.8);
      k.box(0.3, 0.3, 0.3, 0x2a2a2a, 0, 3.1, 0);
      k.box(1.6, 0.9, 0.05, 0xf0f0f0, 0, 1.7, 0.7); // white cross
      k.box(0.5, 0.9, 0.06, 0xd02020, 0, 1.7, 0.72);
      root.add(k.mesh(M.vcShiny()));
      const w = kit(); w.ball(1.1, 0xffffff, 0, 1.9, -1.0, 1, 0.7, 0.8, 1);
      root.add(new THREE.Mesh(w.geo(), M.glass()));
      const rotor = at(new THREE.Group(), 0, 3.3, 0);
      const r = kit(); r.box(11, 0.05, 0.3, 0x1a1a1a, 0, 0, 0); r.box(0.3, 0.05, 11, 0x1a1a1a, 0, 0, 0);
      rotor.add(r.mesh()); root.add(rotor);
      const tail = at(new THREE.Group(), 0.3, 2.4, 6.1);
      const t = kit(); t.box(0.05, 1.8, 0.2, 0x1a1a1a, 0, 0, 0); tail.add(t.mesh()); root.add(tail);
      root.userData = { rotor, tail };
      return root;
    },
  };

  // ============================================================
  //  ITEMS (in your hand, and as inventory pictures)
  //  The handle is at the middle (0,0,0), pointing down -y.
  // ============================================================
  const W = 0x7a5a38, STONE = 0x8a8680, METAL = 0xa8acb0;
  const itemMakers = {
    wood: (k) => { k.cyl(0.12, 0.12, 0.7, 0x6a4a30, 0, 0, 0, 0, 0, 1.2, 7); k.cyl(0.115, 0.115, 0.02, 0xc8a878, 0.33, 0.24, 0, 0, 0, 1.2, 7); k.cyl(0.1, 0.1, 0.6, 0x5a4028, 0.05, 0.2, 0.15, 0.3, 0, 1.4, 7); },
    stone: (k) => { k.add(rockGeo(3, 0.25), STONE, 0, 0, 0); k.add(rockGeo(5, 0.16), 0x7a7672, 0.2, -0.05, 0.1); },
    scrap: (k) => { k.box(0.4, 0.04, 0.3, 0x8a8a8a, 0, 0, 0, 0.2, 0.3, 0.1); k.box(0.3, 0.04, 0.2, 0x7a4a2a, 0.1, 0.06, 0.05, -0.3, 0.8, 0); k.cyl(0.04, 0.04, 0.3, 0x6a6a6a, -0.1, 0.1, 0, 0, 0, 1.2, 6); },
    nails: (k) => { for (let i = 0; i < 5; i++) { k.cyl(0.012, 0.012, 0.3, 0xb0b0b0, -0.12 + i * 0.06, 0, 0, 0, 0, 0.2 * (i - 2), 4); k.cyl(0.035, 0.035, 0.015, 0xb0b0b0, -0.12 + i * 0.06 - 0.03 * (i - 2), 0.15, 0, 0, 0, 0.2 * (i - 2), 6); } },
    cloth: (k) => { k.box(0.4, 0.1, 0.35, 0xc8b8a0, 0, 0, 0); k.box(0.38, 0.08, 0.3, 0x7a8aa8, 0.02, 0.08, 0.02, 0, 0.3, 0); },
    rope: (k) => { for (let i = 0; i < 3; i++) k.add(new THREE.TorusGeometry(0.2 - i * 0.02, 0.03, 5, 12), 0xb89a60, 0, i * 0.05, 0, Math.PI / 2, 0, 0); },
    hide: (k) => { k.box(0.5, 0.04, 0.4, 0x8a6240, 0, 0, 0); k.box(0.2, 0.04, 0.15, 0x8a6240, 0.3, 0, 0.1, 0, 0.5, 0); },
    radiopart: (k) => { k.box(0.4, 0.05, 0.3, 0x1a6a2a, 0, 0, 0); k.box(0.1, 0.1, 0.08, 0x2a2a2a, -0.08, 0.07, 0); k.cyl(0.04, 0.04, 0.1, 0x3a3aa0, 0.1, 0.07, 0.06, 0, 0, 0, 8); k.box(0.12, 0.06, 0.06, 0xd0a020, 0.1, 0.05, -0.08); k.cyl(0.01, 0.01, 0.4, 0xc0c0c0, 0.15, 0.25, 0.1, 0, 0, 0, 4); },
    berries: (k) => { const r = U.seeded(2); for (let i = 0; i < 9; i++) k.ball(0.07, i % 3 ? 0xb01830 : 0x5a1a6a, (r() - 0.5) * 0.25, (r() - 0.5) * 0.15, (r() - 0.5) * 0.25, 1, 1, 1, 1); k.box(0.2, 0.02, 0.1, 0x3a6a2a, 0, 0.1, 0, 0, 0.5, 0.3); },
    apple: (k) => { k.ball(0.14, 0xc02020, 0, 0, 0, 1, 0.9, 1, 2); k.cyl(0.01, 0.01, 0.08, 0x4a3020, 0, 0.14, 0, 0, 0, 0, 4); k.box(0.08, 0.01, 0.04, 0x3a8a2a, 0.04, 0.15, 0, 0, 0, 0.4); },
    can: (k) => { k.cyl(0.1, 0.1, 0.24, 0xb0b0b0, 0, 0, 0, 0, 0, 0, 12); k.cyl(0.102, 0.102, 0.15, 0xc84a2a, 0, 0, 0, 0, 0, 0, 12); },
    chips: (k) => { k.box(0.3, 0.38, 0.1, 0xe0b020, 0, 0, 0); k.box(0.2, 0.12, 0.105, 0xc02020, 0, 0.02, 0); },
    rawmeat: (k) => { k.ball(0.17, 0xc03a3a, 0, 0, 0, 1.3, 0.6, 1, 1); k.box(0.2, 0.05, 0.05, 0xf0e0d0, 0.18, 0.02, 0); },
    meat: (k) => { k.ball(0.17, 0x7a3a1a, 0, 0, 0, 1.3, 0.6, 1, 1); k.cyl(0.03, 0.03, 0.25, 0xf0e0d0, 0.2, 0.02, 0, 0, 0, 1.4, 5); },
    water: (k) => { k.cyl(0.08, 0.08, 0.34, 0x70b0e0, 0, 0, 0, 0, 0, 0, 10); k.cyl(0.082, 0.082, 0.1, 0x2a70c0, 0, 0.02, 0, 0, 0, 0, 10); k.cyl(0.04, 0.04, 0.06, 0x2a4ac0, 0, 0.2, 0, 0, 0, 0, 8); },
    bottle: (k) => { k.cyl(0.08, 0.08, 0.34, 0xc8d8e0, 0, 0, 0, 0, 0, 0, 10); k.cyl(0.04, 0.04, 0.06, 0x2a4ac0, 0, 0.2, 0, 0, 0, 0, 8); },
    soda: (k) => { k.cyl(0.07, 0.07, 0.24, 0x2a8a3a, 0, 0, 0, 0, 0, 0, 12); k.cyl(0.072, 0.072, 0.06, 0xf0f0f0, 0, 0.02, 0, 0, 0, 0, 12); },
    bandage: (k) => { k.cyl(0.1, 0.1, 0.12, 0xf0f0f0, 0, 0, 0, Math.PI / 2, 0, 0, 12); k.box(0.1, 0.02, 0.2, 0xf0f0f0, 0.05, -0.09, -0.1); },
    medkit: (k) => { k.box(0.4, 0.28, 0.14, 0xe0e0e0, 0, 0, 0); k.box(0.2, 0.06, 0.145, 0xd02020, 0, 0, 0); k.box(0.06, 0.2, 0.145, 0xd02020, 0, 0, 0); k.box(0.14, 0.04, 0.04, 0x4a4a4a, 0, 0.16, 0); },
    stoneaxe: (k) => { k.cyl(0.03, 0.035, 0.8, W, 0, 0.1, 0, 0, 0, 0, 6); k.add(rockGeo(9, 0.14), STONE, 0.1, 0.42, 0, 0, 0, 0, 1.4, 0.8, 0.5); k.box(0.07, 0.12, 0.07, 0xb89a60, 0, 0.42, 0); },
    pickaxe: (k) => { k.cyl(0.03, 0.035, 0.8, W, 0, 0.1, 0, 0, 0, 0, 6); k.cone(0.06, 0.34, STONE, 0.18, 0.46, 0, 0, 0, -1.7, 5); k.cone(0.06, 0.34, STONE, -0.18, 0.46, 0, 0, 0, 1.7, 5); k.box(0.08, 0.1, 0.08, 0xb89a60, 0, 0.46, 0); },
    metalaxe: (k) => { k.cyl(0.03, 0.035, 0.85, 0x3a3a3a, 0, 0.1, 0, 0, 0, 0, 6); k.box(0.24, 0.2, 0.03, METAL, 0.12, 0.44, 0); k.box(0.04, 0.22, 0.035, 0xd0d4d8, 0.24, 0.44, 0); k.box(0.08, 0.1, 0.06, 0x3a3a3a, 0, 0.44, 0); },
    spear: (k) => { k.cyl(0.025, 0.03, 1.8, W, 0, 0.4, 0, 0, 0, 0, 6); k.cone(0.05, 0.25, STONE, 0, 1.4, 0, 0, 0, 0, 5); k.box(0.07, 0.08, 0.07, 0xb89a60, 0, 1.28, 0); },
    bat: (k) => { k.cyl(0.07, 0.03, 0.85, 0x9a7048, 0, 0.15, 0, 0, 0, 0, 8); for (let i = 0; i < 6; i++) k.cyl(0.006, 0.006, 0.2, 0xc0c0c0, Math.cos(i * 2.1) * 0.06, 0.3 + i * 0.04, Math.sin(i * 2.1) * 0.06, Math.sin(i * 2.1) * 1.5, 0, -Math.cos(i * 2.1) * 1.5, 3); },
    machete: (k) => { k.box(0.05, 0.22, 0.05, 0x1a1a1a, 0, -0.1, 0); k.box(0.1, 0.62, 0.012, METAL, 0.02, 0.32, 0); k.box(0.02, 0.62, 0.014, 0xe0e4e8, 0.07, 0.32, 0); },
    bow: (k) => { k.add(new THREE.TorusGeometry(0.55, 0.025, 5, 16, Math.PI * 0.8), 0x6a4a28, 0.15, 0, 0, 0, 0, Math.PI * 0.6); k.cyl(0.004, 0.004, 1.05, 0xe0e0d0, -0.3, 0, 0, 0, 0, 0, 3); },
    arrow: (k) => { k.cyl(0.012, 0.012, 0.8, 0xb89a60, 0, 0, 0, 0, 0, 0, 4); k.cone(0.03, 0.1, 0x6a6a6a, 0, 0.44, 0, 0, 0, 0, 4); k.box(0.06, 0.12, 0.005, 0xd02020, 0, -0.34, 0); k.box(0.005, 0.12, 0.06, 0xd02020, 0, -0.34, 0); },
    torch: (k) => { k.cyl(0.035, 0.03, 0.6, W, 0, 0, 0, 0, 0, 0, 6); k.cyl(0.06, 0.05, 0.14, 0x5a4a3a, 0, 0.3, 0, 0, 0, 0, 7); },
    flashlight: (k) => { k.cyl(0.04, 0.04, 0.3, 0x2a2a2a, 0, 0, 0, 0, 0, 0, 10); k.cyl(0.065, 0.045, 0.1, 0x3a3a3a, 0, 0.19, 0, 0, 0, 0, 10); k.cyl(0.058, 0.058, 0.01, 0xffffd0, 0, 0.245, 0, 0, 0, 0, 10); k.box(0.03, 0.05, 0.02, 0xc02020, 0, 0.05, -0.04); },
    firecracker: (k) => { k.cyl(0.05, 0.05, 0.3, 0xd02020, 0, 0, 0, 0, 0, 0, 8); k.cyl(0.052, 0.052, 0.05, 0xf0d040, 0, 0.08, 0, 0, 0, 0, 8); k.cyl(0.052, 0.052, 0.05, 0xf0d040, 0, -0.08, 0, 0, 0, 0, 8); k.cyl(0.008, 0.008, 0.12, 0x3a3a3a, 0, 0.2, 0, 0.3, 0, 0, 3); },
    campfire: (k) => { for (let i = 0; i < 7; i++) k.add(rockGeo(i, 0.1), STONE, Math.cos(i * 0.9) * 0.3, 0, Math.sin(i * 0.9) * 0.3); k.cyl(0.04, 0.04, 0.5, W, 0, 0.1, 0, 0.4, 0, 0.4, 5); k.cyl(0.04, 0.04, 0.5, W, 0, 0.1, 0, -0.4, 0, -0.4, 5); k.cone(0.12, 0.3, 0xffa030, 0, 0.2, 0, 0, 0, 0, 6); },
    wall: (k) => { for (let i = 0; i < 4; i++) k.box(0.6, 0.14, 0.06, 0x8a6a48, 0, -0.25 + i * 0.16, 0); k.box(0.06, 0.62, 0.08, 0x5a4432, -0.24, 0, 0.03); k.box(0.06, 0.62, 0.08, 0x5a4432, 0.24, 0, 0.03); },
    doorway: (k) => { k.box(0.6, 0.7, 0.06, 0x8a6a48, 0, 0, 0); k.box(0.3, 0.5, 0.07, 0x6a4a30, 0, -0.1, 0); k.box(0.04, 0.04, 0.08, 0xc0a040, 0.1, -0.1, 0); },
    floor: (k) => { for (let i = 0; i < 4; i++) k.box(0.15, 0.05, 0.6, 0x8a6a48 - i * 0x040404, -0.24 + i * 0.16, 0, 0); k.box(0.62, 0.06, 0.06, 0x5a4432, 0, -0.04, -0.2); k.box(0.62, 0.06, 0.06, 0x5a4432, 0, -0.04, 0.2); },
    stonewall: (k) => { k.box(0.6, 0.6, 0.12, 0x8a8680, 0, 0, 0); k.box(0.2, 0.12, 0.13, 0x6a6660, -0.1, 0.1, 0); k.box(0.24, 0.14, 0.13, 0x9a9690, 0.12, -0.12, 0); },
    bed: (k) => { k.box(0.4, 0.1, 0.6, 0x6a4a30, 0, 0, 0); k.box(0.38, 0.08, 0.58, 0xe8e4d8, 0, 0.08, 0); k.box(0.39, 0.03, 0.4, 0x6a7a9a, 0, 0.12, 0.08); },
    box: (k) => { k.box(0.5, 0.35, 0.35, 0x9a7048, 0, 0, 0); k.box(0.52, 0.06, 0.37, 0x6a4a30, 0, 0.16, 0); k.box(0.06, 0.1, 0.02, 0xc0a040, 0, 0.08, -0.18); },
    spikes: (k) => { k.box(0.6, 0.05, 0.6, 0x5a4432, 0, 0, 0); for (let i = 0; i < 9; i++) k.cone(0.04, 0.3, 0xb89a60, -0.2 + (i % 3) * 0.2, 0.15, -0.2 + Math.floor(i / 3) * 0.2, 0, 0, 0, 4); },
  };
  const itemCache = {};
  const Items = {
    has: (id) => !!itemMakers[id],
    // a fresh mesh of an item (safe to change / move)
    make(id) {
      if (!itemCache[id]) {
        const k = kit();
        (itemMakers[id] || itemMakers.stone)(k);
        itemCache[id] = k.geo();
      }
      const m = new THREE.Mesh(itemCache[id], M.vc());
      m.castShadow = true;
      return m;
    },
  };

  // ============================================================
  //  RADIO TOWER (lattice of metal bars)
  // ============================================================
  function tower() {
    const k = kit();
    const H = 26, levels = 13;
    const red = 0xb02a1a, white = 0xd8d8d0;
    for (let i = 0; i < levels; i++) {
      const y0 = (i / levels) * H, y1 = ((i + 1) / levels) * H;
      const w0 = 2.2 * (1 - i / levels * 0.7), w1 = 2.2 * (1 - (i + 1) / levels * 0.7);
      const c = i % 2 ? red : white;
      for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const ax = sx * w0 / 2, az = sz * w0 / 2, bx = sx * w1 / 2, bz = sz * w1 / 2;
        const L = Math.hypot(bx - ax, y1 - y0, bz - az);
        const g = new THREE.CylinderGeometry(0.06, 0.06, L, 4);
        const dir = new THREE.Vector3(bx - ax, y1 - y0, bz - az).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        g.applyQuaternion(q);
        k.add(g, c, (ax + bx) / 2, (y0 + y1) / 2, (az + bz) / 2);
      }
      // cross bars
      const w = w1;
      k.box(w, 0.06, 0.06, c, 0, y1, -w / 2); k.box(w, 0.06, 0.06, c, 0, y1, w / 2);
      k.box(0.06, 0.06, w, c, -w / 2, y1, 0); k.box(0.06, 0.06, w, c, w / 2, y1, 0);
      k.box(Math.hypot(w, y1 - y0), 0.04, 0.04, c, 0, (y0 + y1) / 2, -w / 2, 0, 0, Math.atan2(y1 - y0, w));
      k.box(Math.hypot(w, y1 - y0), 0.04, 0.04, c, 0, (y0 + y1) / 2, w / 2, 0, 0, -Math.atan2(y1 - y0, w));
    }
    k.cyl(0.04, 0.04, 5, 0x9a9a9a, 0, H + 2.5, 0, 0, 0, 0, 4);
    k.box(0.8, 0.8, 0.1, 0xd8d8d0, 0.4, H - 3, 0.4, 0, 0.7, 0); // dish
    k.box(1.2, 1.4, 0.6, 0x6a6a60, 0.9, 0.7, -0.9); // control box
    k.box(0.9, 0.6, 0.02, 0x2a3a2a, 0.9, 0.9, -1.21);
    const root = group(k.mesh(M.vcShiny()));
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), M.redLight());
    light.position.set(0, H + 5, 0);
    root.add(light);
    root.userData.blink = light;
    return root;
  }

  // ============================================================
  //  PLAYER-BUILT THINGS
  // ============================================================
  // a box with textures that repeat every "s" meters (so boards aren't stretched)
  function tbox(w, h, d, s = 2.5) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    // faces: +x, -x, +y, -y, +z, -z (4 corners each)
    const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0] / s, uv.getY(k) * dims[f][1] / s);
    }
    return g;
  }

  const Build = {
    // wall that goes from y=0 up to height h, 2.5 m wide
    wall(h, stone) {
      const m = new THREE.Mesh(tbox(2.5, h, 0.22), stone ? M.stoneWall() : M.planks());
      m.position.y = h / 2; m.castShadow = true; m.receiveShadow = true;
      const g = group(m);
      if (!stone) { // cross beams
        const k = kit();
        k.box(0.14, h, 0.26, 0x5a4432, -1.18, h / 2, 0);
        k.box(0.14, h, 0.26, 0x5a4432, 1.18, h / 2, 0);
        k.box(2.5, 0.14, 0.26, 0x5a4432, 0, h - 0.1, 0);
        g.add(k.mesh());
      }
      return g;
    },
    // wall with a hole and a door that swings
    door(h, base = 0) {
      const g = new THREE.Group();
      const side = (x) => { const m = new THREE.Mesh(tbox(0.7, h, 0.22), M.planks()); m.position.set(x, h / 2, 0); m.castShadow = m.receiveShadow = true; g.add(m); };
      side(-0.9); side(0.9);
      const topH = h - base - 2.2;
      const top = new THREE.Mesh(tbox(1.1, topH, 0.22), M.planks());
      top.position.set(0, base + 2.2 + topH / 2, 0); top.castShadow = true; g.add(top);
      if (base > 0.05) { const low = new THREE.Mesh(tbox(1.1, base, 0.22), M.planks()); low.position.set(0, base / 2, 0); g.add(low); }
      const k = kit();
      k.box(0.14, h, 0.26, 0x5a4432, -1.18, h / 2, 0); k.box(0.14, h, 0.26, 0x5a4432, 1.18, h / 2, 0);
      k.box(0.12, 2.2, 0.26, 0x4a3422, -0.56, base + 1.1, 0); k.box(0.12, 2.2, 0.26, 0x4a3422, 0.56, base + 1.1, 0);
      g.add(k.mesh());
      const hinge = at(new THREE.Group(), -0.5, base, 0); g.add(hinge);
      const d = kit();
      d.box(1.0, 2.15, 0.08, 0x7a5a38, 0.5, 1.08, 0);
      d.box(1.0, 0.1, 0.1, 0x5a3a24, 0.5, 0.4, 0); d.box(1.0, 0.1, 0.1, 0x5a3a24, 0.5, 1.8, 0);
      d.box(1.1, 0.1, 0.1, 0x5a3a24, 0.5, 1.1, 0, 0, 0, 1.05);
      d.box(0.06, 0.06, 0.16, 0xc0a040, 0.88, 1.05, 0);
      hinge.add(d.mesh());
      g.userData.hinge = hinge;
      return g;
    },
    floor(legs) {
      const m = new THREE.Mesh(tbox(2.5, 0.2, 2.5), M.planks());
      m.position.y = -0.1; m.castShadow = m.receiveShadow = true;
      const g = group(m);
      if (legs > 0.1) {
        const k = kit();
        for (const [x, z] of [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]]) k.box(0.18, legs, 0.18, 0x5a4432, x, -0.2 - legs / 2, z);
        g.add(k.mesh());
      }
      return g;
    },
    campfire() {
      const k = kit();
      for (let i = 0; i < 9; i++) k.add(rockGeo(i + 20, 0.16), STONE, Math.cos(i * 0.7) * 0.5, 0.05, Math.sin(i * 0.7) * 0.5);
      for (let i = 0; i < 4; i++) k.cyl(0.06, 0.07, 0.8, 0x4a3422, Math.cos(i * 1.6) * 0.12, 0.2, Math.sin(i * 1.6) * 0.12, Math.sin(i * 1.6) * 0.9, 0, -Math.cos(i * 1.6) * 0.9, 6);
      k.cyl(0.3, 0.3, 0.04, 0x1a1410, 0, 0.02, 0, 0, 0, 0, 10);
      const g = group(k.mesh());
      const flames = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.16 - i * 0.03, 0.55 - i * 0.1, 6), M.fire());
        f.position.set(Math.cos(i * 2.1) * 0.06, 0.3, Math.sin(i * 2.1) * 0.06);
        flames.add(f);
      }
      g.add(flames);
      g.userData.flames = flames;
      return g;
    },
    bed: () => Props.bed(0x6a8a5a),
    box() {
      const k = kit();
      k.box(1.1, 0.7, 0.7, 0x9a7048, 0, 0.35, 0);
      k.box(1.14, 0.1, 0.74, 0x6a4a30, 0, 0.72, 0);
      k.box(1.14, 0.08, 0.74, 0x6a4a30, 0, 0.1, 0);
      k.box(0.1, 0.16, 0.04, 0xc0a040, 0, 0.55, -0.37);
      return group(k.mesh());
    },
    spikes() {
      const k = kit();
      k.box(2.2, 0.1, 2.2, 0x4a3422, 0, 0.05, 0);
      const r = U.seeded(4);
      for (let i = 0; i < 25; i++) k.cone(0.06, 0.6, 0xb89a60, -0.9 + (i % 5) * 0.45, 0.35, -0.9 + Math.floor(i / 5) * 0.45, (r() - 0.5) * 0.3, 0, (r() - 0.5) * 0.3, 4);
      return group(k.mesh());
    },
  };

  return { M, Kit, kit, group, rockGeo, tbox, Nature, People, Props, Items, Build, tower, humanoid };
})();
