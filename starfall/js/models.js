// ============================================================
//  STARFALL — ALL THE 3D MODELS, made from simple shapes
// ============================================================
window.SF = window.SF || {};

SF.Models = (function () {
  const U = SF.U;
  const V = THREE;

  // ---------- materials (shared, so they are made only once) ----------
  const cache = {};
  const M = {
    lam(c) { return cache['l' + c] || (cache['l' + c] = new V.MeshLambertMaterial({ color: c })); },
    phong(c, s = 40) { return cache['p' + c + s] || (cache['p' + c + s] = new V.MeshPhongMaterial({ color: c, shininess: s, specular: 0x555555 })); },
    glow(c) { return cache['g' + c] || (cache['g' + c] = new V.MeshBasicMaterial({ color: c })); },
    glass(c, o = 0.55) { return cache['t' + c + o] || (cache['t' + c + o] = new V.MeshPhongMaterial({ color: c, transparent: true, opacity: o, shininess: 90, specular: 0xffffff, depthWrite: false })); },
    add(c, o = 0.6) { return cache['a' + c + o] || (cache['a' + c + o] = new V.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: V.AdditiveBlending, depthWrite: false, side: V.DoubleSide })); },
    vc: new V.MeshLambertMaterial({ vertexColors: true }),
    vcGlow: new V.MeshBasicMaterial({ vertexColors: true }),
  };

  // ---------- shapes ----------
  const G = {
    box: (w, h, d) => new V.BoxGeometry(w, h, d),
    sph: (r, ws = 12, hs = 8) => new V.SphereGeometry(r, ws, hs),
    cyl: (rt, rb, h, s = 10) => new V.CylinderGeometry(rt, rb, h, s),
    cone: (r, h, s = 8) => new V.ConeGeometry(r, h, s),
    cap: (r, l, s = 8) => new V.CapsuleGeometry(r, l, 4, s),
    ico: (r, d = 0) => new V.IcosahedronGeometry(r, d),
    oct: (r) => new V.OctahedronGeometry(r, 0),
    tor: (r, t, rs = 6, ts = 16, arc = Math.PI * 2) => new V.TorusGeometry(r, t, rs, ts, arc),
    dod: (r) => new V.DodecahedronGeometry(r, 0),
  };

  // put a mesh into a parent
  function mk(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    const m = new V.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.scale.set(sx, sy, sz);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  function grp(parent, x = 0, y = 0, z = 0) {
    const g = new V.Group();
    g.position.set(x, y, z);
    if (parent) parent.add(g);
    return g;
  }

  // a builder glues many still parts into 2 meshes (normal + glowing): fast to draw
  function builder() {
    const items = [], glows = [];
    return {
      add(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
        items.push({ geo, color, matrix: U.mat(x, y, z, rx, ry, rz, sx, sy, sz) }); return this;
      },
      glow(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
        glows.push({ geo, color, matrix: U.mat(x, y, z, rx, ry, rz, sx, sy, sz) }); return this;
      },
      geos() { return { body: items.length ? U.merge(items) : null, glow: glows.length ? U.merge(glows) : null }; },
      build(shadow = true) {
        const g = new V.Group();
        if (items.length) { const m = new V.Mesh(U.merge(items), M.vc); m.castShadow = shadow; m.receiveShadow = true; g.add(m); }
        if (glows.length) { const m = new V.Mesh(U.merge(glows), M.vcGlow); g.add(m); g.userData.glowMesh = m; }
        return g;
      },
    };
  }

  // an eye that looks cute
  function eye(parent, x, y, z, r = 0.1, iris = 0x222222) {
    const e = grp(parent, x, y, z);
    mk(e, G.sph(r, 12, 10), M.phong(0xffffff, 80));
    mk(e, G.sph(r * 0.55, 10, 8), M.phong(iris, 80), 0, 0, r * 0.62);
    mk(e, G.sph(r * 0.18, 6, 5), M.glow(0xffffff), r * 0.2, r * 0.25, r * 0.95);
    return e;
  }

  // ============================================================
  //  THE ASTRONAUT (you!)
  // ============================================================
  function astronaut(accent = 0xff8a30) {
    const root = new V.Group();
    const white = M.phong(0xf2f0ea, 30), acc = M.phong(accent, 30), dark = M.phong(0x3a3f4a, 20);
    const visor = new V.MeshPhongMaterial({ color: 0x103048, emissive: 0x0a4a6a, shininess: 120, specular: 0xffffff });
    const P = {};
    P.hips = grp(root, 0, 0.92, 0);
    P.torso = grp(P.hips, 0, 0, 0);
    mk(P.torso, G.cap(0.24, 0.32, 10), white, 0, 0.3, 0);
    mk(P.torso, G.box(0.36, 0.22, 0.1), acc, 0, 0.38, 0.19);
    mk(P.torso, G.box(0.1, 0.06, 0.02), M.glow(0x7ff8ff), -0.08, 0.4, 0.245);
    mk(P.torso, G.cyl(0.25, 0.25, 0.1, 12), dark, 0, 0.08, 0);   // belt
    const pack = mk(P.torso, G.box(0.38, 0.46, 0.2), M.phong(0xc8ccd4, 30), 0, 0.36, -0.26);
    mk(P.torso, G.box(0.06, 0.34, 0.02), M.glow(accent), 0, 0.36, -0.37);
    mk(P.torso, G.cyl(0.07, 0.07, 0.34, 8), dark, -0.14, 0.36, -0.36);
    mk(P.torso, G.cyl(0.07, 0.07, 0.34, 8), dark, 0.14, 0.36, -0.36);

    P.head = grp(P.torso, 0, 0.66, 0);
    mk(P.head, G.sph(0.27, 18, 14), white, 0, 0.1, 0);
    mk(P.head, G.sph(0.235, 16, 12, 0), visor, 0, 0.1, 0.07, 0, 0, 0, 1, 0.82, 1);
    mk(P.head, G.tor(0.26, 0.035, 6, 20), acc, 0, 0.1, 0, 0, 0, 0);
    mk(P.head, G.cyl(0.012, 0.012, 0.28, 5), dark, 0.16, 0.38, -0.05, 0, 0, -0.25);
    P.antenna = mk(P.head, G.sph(0.04, 8, 6), M.glow(accent), 0.2, 0.52, -0.05);

    const arm = (side) => {
      const sh = grp(P.torso, side * 0.33, 0.5, 0);
      mk(sh, G.sph(0.12, 10, 8), acc);
      mk(sh, G.cap(0.085, 0.24, 8), white, 0, -0.2, 0);
      const el = grp(sh, 0, -0.38, 0);
      mk(el, G.cap(0.08, 0.2, 8), white, 0, -0.14, 0);
      mk(el, G.cyl(0.09, 0.09, 0.07, 10), acc, 0, -0.24, 0);
      const hand = grp(el, 0, -0.33, 0);
      mk(hand, G.sph(0.085, 10, 8), dark);
      return { sh, el, hand };
    };
    const aL = arm(-1), aR = arm(1);
    P.shL = aL.sh; P.elL = aL.el; P.handL = aL.hand;
    P.shR = aR.sh; P.elR = aR.el; P.handR = aR.hand;

    const leg = (side) => {
      const hp = grp(P.hips, side * 0.13, -0.02, 0);
      mk(hp, G.cap(0.1, 0.26, 8), white, 0, -0.2, 0);
      const kn = grp(hp, 0, -0.42, 0);
      mk(kn, G.cap(0.09, 0.24, 8), white, 0, -0.18, 0);
      const boot = mk(kn, G.box(0.19, 0.16, 0.3), acc, 0, -0.4, 0.04);
      mk(kn, G.box(0.2, 0.05, 0.31), dark, 0, -0.47, 0.04);
      const flame = mk(kn, G.cone(0.08, 0.45, 8), M.add(0xffa040, 0.85), 0, -0.72, 0, Math.PI, 0, 0);
      flame.visible = false; flame.castShadow = false;
      return { hp, kn, boot, flame };
    };
    const lL = leg(-1), lR = leg(1);
    P.hipL = lL.hp; P.knL = lL.kn; P.hipR = lR.hp; P.knR = lR.kn;
    P.flames = [lL.flame, lR.flame];

    // plasma sword in the right hand
    P.sword = grp(P.handR, 0, -0.02, 0.02);
    mk(P.sword, G.cyl(0.03, 0.03, 0.2, 6), dark, 0, 0, 0, Math.PI / 2, 0, 0);
    mk(P.sword, G.box(0.2, 0.05, 0.05), M.phong(0xb0b8c8, 60), 0, 0, 0.1);
    P.blade = mk(P.sword, G.box(0.06, 0.02, 0.95), M.glow(0x8ffcff), 0, 0, 0.6);
    P.bladeGlow = mk(P.sword, G.box(0.14, 0.08, 1.02), M.add(0x30d8ff, 0.35), 0, 0, 0.6);
    P.bladeGlow.castShadow = false;

    // energy shield on the left arm
    P.shieldBase = mk(P.elL, G.cyl(0.1, 0.1, 0.1, 6), M.phong(0x8890a0, 50), 0, -0.2, 0.06, Math.PI / 2, 0, 0);
    P.shield = grp(P.elL, 0, -0.2, 0.2);
    const sh = mk(P.shield, new V.CircleGeometry(0.5, 6), M.add(0x40c0ff, 0.45), 0, 0, 0, 0, 0, Math.PI / 6);
    sh.castShadow = false;
    const shr = mk(P.shield, G.tor(0.5, 0.025, 4, 6), M.glow(0x9ff0ff), 0, 0, 0, 0, 0, Math.PI / 6);
    shr.castShadow = false;
    P.shield.visible = false;

    // plasma bow in the left hand
    P.bow = grp(P.handL, 0, 0, 0.05);
    mk(P.bow, G.tor(0.55, 0.03, 5, 18, Math.PI * 0.8), M.glow(0xffd060), 0, 0, 0, 0, Math.PI / 2, Math.PI * 0.6);
    P.bowString = mk(P.bow, G.cyl(0.006, 0.006, 1.0, 4), M.glow(0xfff4c0), 0, 0, -0.18);
    P.bow.visible = false;

    // glider wings on the back
    P.glider = grp(P.torso, 0, 0.62, -0.3);
    const wingShape = new V.Shape();
    wingShape.moveTo(0, 0); wingShape.lineTo(1.5, 0.2); wingShape.lineTo(1.3, -0.35); wingShape.lineTo(0.7, -0.5); wingShape.lineTo(0, -0.25);
    const wg = new V.ShapeGeometry(wingShape);
    const wmat = new V.MeshLambertMaterial({ color: 0xb070ff, side: V.DoubleSide, transparent: true, opacity: 0.85 });
    const wL = mk(P.glider, wg, wmat, 0.05, 0, 0, 0, 0, 0, 1, 1, 1);
    const wR = mk(P.glider, wg, wmat, -0.05, 0, 0, 0, 0, 0, -1, 1, 1);
    mk(P.glider, G.cyl(0.02, 0.02, 3, 5), M.phong(0x444455), 0, 0.1, 0, 0, 0, Math.PI / 2);
    P.glider.rotation.x = -1.2;
    P.glider.visible = false;
    P.wings = [wL, wR];

    root.traverse((o) => { if (o.isMesh) o.castShadow = o.castShadow && !SF.lowGfx; });
    return { group: root, P };
  }

  // ============================================================
  //  ZIB and the villagers
  // ============================================================
  function zib(body = 0xb89aff, tip = 0x7ffff0) {
    const root = new V.Group();
    const b = grp(root, 0, 0, 0);
    mk(b, G.sph(0.32, 16, 12), M.phong(body, 50), 0, 0, 0, 0, 0, 0, 1, 0.92, 1);
    mk(b, G.sph(0.34, 14, 10, 0), M.phong(0xffffff, 30), 0, -0.14, 0, 0, 0, 0, 1, 0.35, 1);
    const e = eye(b, 0, 0.05, 0.2, 0.17, 0x2a1b6a);
    const antennas = [];
    for (const s of [-1, 1]) {
      const a = grp(b, s * 0.13, 0.25, -0.02);
      a.rotation.z = -s * 0.35;
      mk(a, G.cyl(0.018, 0.018, 0.3, 5), M.phong(body, 20), 0, 0.15, 0);
      mk(a, G.sph(0.06, 8, 6), M.glow(tip), 0, 0.32, 0);
      antennas.push(a);
    }
    const fins = [];
    for (const s of [-1, 1]) fins.push(mk(b, G.cone(0.1, 0.28, 4), M.phong(body, 40), s * 0.33, -0.02, 0, 0, 0, -s * 1.6, 1, 1, 0.4));
    return { group: root, body: b, eye: e, antennas, fins };
  }

  function villager(body, robe) {
    const z = zib(body, 0xffe070);
    mk(z.body, G.cone(0.36, 0.5, 10, 1), M.lam(robe), 0, -0.4, 0);
    return z;
  }

  // ============================================================
  //  FRIENDLY CREATURES
  // ============================================================
  function floof(color = 0xffb0e0) {
    const root = new V.Group();
    const b = grp(root, 0, 0.35, 0);
    mk(b, G.ico(0.35, 1), new V.MeshLambertMaterial({ color, flatShading: true }));
    for (const s of [-1, 1]) {
      mk(b, G.cone(0.1, 0.35, 5), M.lam(color), s * 0.2, 0.33, 0, 0, 0, -s * 0.4);
      eye(b, s * 0.13, 0.08, 0.27, 0.08);
      mk(b, G.sph(0.08, 6, 5), M.lam(0xffffff), s * 0.15, -0.3, 0.1, 0, 0, 0, 1, 0.6, 1.3);
    }
    return { group: root, body: b };
  }

  function jelly(color = 0x9fd8ff) {
    const root = new V.Group();
    const dome = new V.Mesh(new V.SphereGeometry(4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.glass(color, 0.5));
    root.add(dome);
    mk(root, G.sph(1.6, 12, 8), M.add(0xff90ff, 0.5), 0, 1.2, 0);
    const tent = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const t = mk(root, G.cyl(0.08, 0.02, 9, 4), M.add(color, 0.55), Math.cos(a) * 2.6, -4.5, Math.sin(a) * 2.6);
      tent.push(t);
    }
    return { group: root, tent };
  }

  // ============================================================
  //  ENEMIES
  // ============================================================
  function gloop(color = 0x60ff90) {
    const root = new V.Group();
    const b = grp(root, 0, 0, 0);
    mk(b, G.sph(0.55, 16, 12), M.glass(color, 0.7), 0, 0.5, 0);
    mk(b, G.sph(0.22, 10, 8), M.glow(0xffffff), 0, 0.45, 0, 0, 0, 0, 1, 1, 1).material = M.add(color, 0.9);
    eye(b, -0.18, 0.7, 0.42, 0.1, 0x111111);
    eye(b, 0.18, 0.7, 0.42, 0.1, 0x111111);
    mk(b, G.tor(0.12, 0.03, 4, 10, Math.PI), M.lam(0x113311), 0, 0.5, 0.52, 0, 0, Math.PI);
    return { group: root, body: b };
  }

  function spinecrab() {
    const root = new V.Group();
    const b = grp(root, 0, 0.5, 0);
    const shell = M.phong(0xd05030, 40);
    mk(b, G.sph(0.7, 14, 10), shell, 0, 0, 0, 0, 0, 0, 1.1, 0.55, 1);
    mk(b, G.sph(0.55, 12, 8), M.lam(0xf0d0a0), 0, -0.1, 0, 0, 0, 0, 1.1, 0.4, 1);
    for (let i = 0; i < 7; i++) {
      const a = -0.9 + i * 0.3;
      mk(b, G.cone(0.1, 0.55, 5), M.phong(0xffe0a0, 40), Math.sin(a) * 0.45, 0.38, Math.cos(a) * 0.1 - 0.2, -0.4, 0, -a);
    }
    // the armored front plate (hits here don't work!)
    mk(b, G.box(1.1, 0.5, 0.12), M.phong(0x7a8a9a, 80), 0, 0.02, 0.72, -0.2, 0, 0);
    const eyes = [];
    for (const s of [-1, 1]) {
      mk(b, G.cyl(0.03, 0.03, 0.3, 5), M.lam(0xd05030), s * 0.22, 0.35, 0.55);
      eyes.push(mk(b, G.sph(0.08, 8, 6), M.glow(0x40ff40), s * 0.22, 0.52, 0.55));
    }
    const legs = [];
    for (let i = 0; i < 6; i++) {
      const s = i < 3 ? -1 : 1;
      const l = grp(b, s * 0.6, -0.1, -0.35 + (i % 3) * 0.35);
      mk(l, G.cyl(0.05, 0.04, 0.7, 5), shell, s * 0.25, -0.2, 0, 0, 0, s * 1.0);
      legs.push(l);
    }
    const claws = [];
    for (const s of [-1, 1]) {
      const c = grp(b, s * 0.6, 0, 0.6);
      mk(c, G.sph(0.22, 8, 6), shell, 0, 0, 0.15, 0, 0, 0, 0.8, 0.6, 1.4);
      mk(c, G.cone(0.08, 0.3, 5), M.phong(0xffe0a0), s * 0.05, 0.05, 0.45, Math.PI / 2, 0, 0);
      claws.push(c);
    }
    return { group: root, body: b, legs, claws, eyes };
  }

  function zapwing() {
    const root = new V.Group();
    const b = grp(root, 0, 0, 0);
    mk(b, G.sph(0.4, 12, 8), M.phong(0x3a2a6a, 40), 0, 0, 0, 0, 0, 0, 0.9, 0.8, 1.4);
    eye(b, 0, 0.12, 0.45, 0.16, 0xffe000);
    mk(b, G.cone(0.12, 0.9, 6), M.phong(0x3a2a6a), 0, 0, -0.8, -Math.PI / 2, 0, 0);
    mk(b, G.sph(0.14, 8, 6), M.glow(0xffff60), 0, 0, -1.25);
    const wings = [];
    const wmat = new V.MeshLambertMaterial({ color: 0x8a60ff, side: V.DoubleSide, transparent: true, opacity: 0.8 });
    for (const s of [-1, 1]) {
      const w = grp(b, s * 0.3, 0.1, 0);
      const shape = new V.Shape();
      shape.moveTo(0, 0); shape.lineTo(1.3, 0.3); shape.lineTo(1.1, -0.4); shape.lineTo(0.3, -0.5);
      mk(w, new V.ShapeGeometry(shape), wmat, 0, 0, 0, -Math.PI / 2, 0, 0, s, 1, 1);
      wings.push(w);
    }
    return { group: root, body: b, wings };
  }

  function golem(color = 0x6a6a78, crystal = 0x60e0ff) {
    const root = new V.Group();
    const b = grp(root, 0, 0, 0);
    const rock = new V.MeshLambertMaterial({ color, flatShading: true });
    mk(b, G.dod(1.1), rock, 0, 2.1, 0, 0, 0, 0, 1.2, 1, 0.9);
    mk(b, G.dod(0.55), rock, 0, 3.3, 0.2);
    eye(b, -0.2, 3.35, 0.65, 0.1, 0xff3030);
    eye(b, 0.2, 3.35, 0.65, 0.1, 0xff3030);
    // the weak spot on the back
    const weak = mk(b, G.oct(0.45), M.glow(crystal), 0, 2.3, -1.0, 0.4, 0, 0, 1, 1.4, 1);
    const arms = [];
    for (const s of [-1, 1]) {
      const a = grp(b, s * 1.35, 2.6, 0);
      mk(a, G.dod(0.45), rock, 0, -0.5, 0);
      mk(a, G.dod(0.55), rock, 0, -1.3, 0.1);
      arms.push(a);
    }
    const legs = [];
    for (const s of [-1, 1]) {
      const l = grp(b, s * 0.6, 1.2, 0);
      mk(l, G.dod(0.5), rock, 0, -0.6, 0);
      legs.push(l);
    }
    return { group: root, body: b, weak, arms, legs };
  }

  // ============================================================
  //  BOSSES
  // ============================================================
  function thornmaw() {
    const root = new V.Group();
    const stalk = [];
    let parent = root;
    for (let i = 0; i < 5; i++) {
      const s = grp(parent, 0, i === 0 ? 0 : 1.2, 0);
      mk(s, G.cyl(0.55 - i * 0.05, 0.65 - i * 0.05, 1.3, 10), M.lam(0x2a7a40), 0, 0.6, 0);
      for (let k = 0; k < 3; k++) mk(s, G.cone(0.12, 0.5, 5), M.lam(0xc0d060), Math.cos(k * 2.1 + i) * 0.55, 0.5, Math.sin(k * 2.1 + i) * 0.55, 0, 0, Math.cos(k * 2.1 + i) * -1.4);
      stalk.push(s); parent = s;
    }
    const head = grp(parent, 0, 1.6, 0);
    mk(head, G.sph(1.5, 18, 14), M.phong(0xd03070, 30));
    mk(head, G.sph(1.52, 16, 12, 0), M.phong(0x40a050, 20), 0, 0.25, -0.2, 0, 0, 0, 1, 0.8, 1);
    const mouth = mk(head, new V.CircleGeometry(0.9, 16), M.glow(0x300010), 0, -0.2, 1.42);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      mk(head, G.cone(0.1, 0.4, 5), M.phong(0xfff8e0), Math.cos(a) * 0.8, -0.2 + Math.sin(a) * 0.8, 1.45, Math.PI / 2, 0, 0);
    }
    const core = mk(head, G.sph(0.35, 10, 8), M.glow(0xffe060), 0, -0.2, 1.3);
    for (const s of [-1, 1]) eye(head, s * 0.7, 0.9, 1.1, 0.22, 0xff2020);
    const vines = [];
    for (let v = 0; v < 4; v++) {
      const base = grp(root, 0, 0.5, 0);
      base.rotation.y = v * Math.PI / 2 + Math.PI / 4;
      const segs = [];
      let p = base;
      for (let i = 0; i < 6; i++) {
        const s = grp(p, 0, 0, i === 0 ? 0.8 : 1.1);
        mk(s, G.cyl(0.25 - i * 0.03, 0.28 - i * 0.03, 1.2, 7), M.lam(0x3a8a40), 0, 0, 0.55, Math.PI / 2, 0, 0);
        mk(s, G.cone(0.08, 0.3, 4), M.lam(0xc0d060), 0, 0.25, 0.5);
        segs.push(s); p = s;
      }
      vines.push({ base, segs });
    }
    return { group: root, stalk, head, core, vines, mouth };
  }

  function sandwyrm() {
    const root = new V.Group();
    const segs = [];
    for (let i = 0; i < 12; i++) {
      const s = grp(root);
      const r = 1.3 - i * 0.06;
      mk(s, G.sph(r, 14, 10), M.phong(i % 2 ? 0xc07050 : 0xd89060, 20));
      mk(s, G.tor(r * 0.95, 0.12, 4, 14), M.phong(0x6a3020), 0, 0, 0, 0, 0, 0);
      if (i > 0) for (let k = 0; k < 2; k++) mk(s, G.cone(0.14, 0.6, 5), M.phong(0xfff0d0), k ? r * 0.6 : -r * 0.6, r * 0.8, 0, 0, 0, k ? -0.5 : 0.5);
      segs.push(s);
    }
    const head = segs[0];
    const jaws = [];
    for (const s of [-1, 1]) {
      const j = grp(head, s * 0.7, 0, 0.9);
      mk(j, G.cone(0.25, 1.4, 6), M.phong(0xfff0d0), 0, 0, 0.6, Math.PI / 2, 0, s * 0.3);
      jaws.push(j);
    }
    for (const s of [-1, 1]) mk(head, G.sph(0.18, 8, 6), M.glow(0x80ff40), s * 0.55, 0.7, 0.9);
    const weak = mk(head, G.oct(0.4), M.glow(0x40ffd0), 0, 1.2, 0.2);
    return { group: root, segs, jaws, weak };
  }

  function colossus() {
    const root = new V.Group();
    const ice = new V.MeshPhongMaterial({ color: 0xa8d8ff, shininess: 80, specular: 0xffffff, flatShading: true, transparent: true, opacity: 0.92 });
    const dark = new V.MeshLambertMaterial({ color: 0x5a6a8a, flatShading: true });
    const b = grp(root, 0, 0, 0);
    const legs = [];
    for (const s of [-1, 1]) {
      const l = grp(b, s * 1.4, 4.5, 0);
      mk(l, G.box(1.3, 2.4, 1.3), dark, 0, -1.2, 0);
      mk(l, G.box(1.5, 2.2, 1.6), ice, 0, -3.3, 0.1);
      legs.push(l);
    }
    const torso = grp(b, 0, 4.5, 0);
    mk(torso, G.dod(2.6), ice, 0, 2.3, 0, 0, 0, 0, 1.1, 1, 0.8);
    const core = mk(torso, G.oct(0.7), M.glow(0x40a0ff), 0, 2.2, 1.7);
    const head = grp(torso, 0, 5, 0);
    mk(head, G.box(1.8, 1.4, 1.6), dark);
    const eyeC = mk(head, G.oct(0.55), M.glow(0xff4060), 0, 0.2, 0.9, 0, 0, 0, 1, 1, 0.6);
    for (let k = 0; k < 5; k++) mk(head, G.cone(0.3, 1.4, 5), ice, -0.8 + k * 0.4, 1.1, 0, 0, 0, (k - 2) * -0.25);
    const arms = [];
    for (const s of [-1, 1]) {
      const a = grp(torso, s * 3, 3.6, 0);
      mk(a, G.dod(0.9), ice, 0, 0, 0);
      mk(a, G.box(1.1, 2.6, 1.1), dark, 0, -1.8, 0);
      mk(a, G.dod(1.2), ice, 0, -3.6, 0.2);
      arms.push(a);
    }
    return { group: root, torso, head, core, eye: eyeC, arms, legs };
  }

  function emberking() {
    const root = new V.Group();
    const rock = new V.MeshLambertMaterial({ color: 0x2a1a1a, flatShading: true });
    const b = grp(root, 0, 0, 0);
    mk(b, G.sph(2.6, 18, 14), M.glow(0xff5010), 0, 0, 0);
    for (let k = 0; k < 14; k++) {
      const a = k * 2.4, e = Math.sin(k * 1.7) * 1.2;
      mk(b, G.dod(1.1), rock, Math.cos(a) * 2.3 * Math.cos(e), Math.sin(e) * 2.3, Math.sin(a) * 2.3 * Math.cos(e), k, k * 2, 0);
    }
    const eyeC = mk(b, G.sph(0.8, 14, 10), M.glow(0xfff080), 0, 0.5, 2.3);
    mk(b, G.sph(0.35, 10, 8), M.glow(0x200000), 0, 0.5, 3.0);
    const crown = grp(b, 0, 2.3, 0);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      mk(crown, G.cone(0.35, 1.8, 5), M.glow(0xffa020), Math.cos(a) * 1.4, 0.6, Math.sin(a) * 1.4, Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
    }
    const hands = [];
    for (const s of [-1, 1]) {
      const h = grp(root, s * 5, -1, 1);
      mk(h, G.dod(1.2), rock);
      mk(h, G.sph(0.7, 10, 8), M.glow(0xff7020), 0, 0, 0.5);
      hands.push(h);
    }
    const light = new V.PointLight(0xff6020, 3, 40, 1.5);
    root.add(light);
    return { group: root, body: b, eye: eyeC, crown, hands };
  }

  // ============================================================
  //  WORLD THINGS
  // ============================================================
  function ship(broken = true) {
    const b = builder();
    const w = 0xf0f0f4, o = 0xff8a30, d = 0x40444e;
    b.add(G.cap(1.6, 7, 14), w, 0, 0, 0, Math.PI / 2, 0, 0, 1, 1, 0.7);
    b.add(G.cone(1.6, 3.2, 14), w, 0, 0, 5.8, Math.PI / 2, 0, 0, 1, 1, 0.7);
    b.add(G.box(3.3, 0.35, 1.2), o, 0, -0.2, 0, 0, 0, 0);
    b.add(G.box(10, 0.25, 3.2), w, 0, -0.4, -1.2, 0, 0, 0);
    b.add(G.box(1.2, 0.3, 3.0), o, 4.6, -0.4, -1.3, 0, 0, 0);
    b.add(G.box(1.2, 0.3, 3.0), o, -4.6, -0.4, -1.3, 0, 0, 0);
    b.add(G.box(0.25, 2.8, 2.6), w, 0, 1.6, -3.8, -0.3, 0, 0);
    for (const s of [-1, 1]) {
      b.add(G.cyl(0.8, 0.9, 3.2, 12), d, s * 2.2, -0.1, -3.6, Math.PI / 2, 0, 0);
      b.glow(G.cyl(0.6, 0.6, 0.1, 12), broken ? 0x402010 : 0x60f0ff, s * 2.2, -0.1, -5.25, Math.PI / 2, 0, 0);
    }
    b.add(G.cyl(0.2, 0.2, 1.6, 6), d, 0.6, -1.4, 2, 0, 0, 0.2);
    b.add(G.cyl(0.2, 0.2, 1.6, 6), d, -0.6, -1.4, 2, 0, 0, -0.2);
    const g = b.build();
    const glass = new V.Mesh(new V.SphereGeometry(1.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.glass(0x60d0ff, 0.6));
    glass.position.set(0, 0.8, 2.6); glass.scale.set(0.9, 0.8, 1.8);
    g.add(glass);
    const flames = [];
    for (const s of [-1, 1]) {
      const f = mk(g, G.cone(0.65, 3.5, 12), M.add(0x60d0ff, 0.8), s * 2.2, -0.1, -7, -Math.PI / 2, 0, 0);
      f.visible = false; f.castShadow = false;
      flames.push(f);
    }
    g.userData.flames = flames;
    return g;
  }

  const TEMPLE_COLORS = [
    { stone: 0x4a7a6a, trim: 0x2a4a40, glow: 0x60ffb0 },
    { stone: 0xd8a080, trim: 0x9a5a4a, glow: 0xffd040 },
    { stone: 0x9ab0d0, trim: 0x5a6a90, glow: 0x60c0ff },
    { stone: 0x3a2a2a, trim: 0x1a1010, glow: 0xff6020 },
  ];
  function temple(i) {
    const c = TEMPLE_COLORS[i];
    const b = builder();
    // steps
    for (let s = 0; s < 3; s++) b.add(G.box(14 - s * 2, 0.6, 12 - s * 2), s % 2 ? c.trim : c.stone, 0, 0.3 + s * 0.6, -2 + s * 0.4);
    // walls
    b.add(G.box(9, 7, 7), c.stone, 0, 5.3, -3.5);
    b.add(G.box(10, 0.8, 8), c.trim, 0, 9.2, -3.5);
    b.add(G.cone(5.5, 5, 4), c.stone, 0, 12, -3.5, 0, Math.PI / 4, 0);
    b.glow(G.oct(0.9), c.glow, 0, 15.4, -3.5);
    // pillars
    for (const s of [-1, 1]) {
      for (const zz of [1.5, -1]) {
        b.add(G.cyl(0.55, 0.65, 6.5, 8), c.stone, s * 5.2, 4.9, zz);
        b.add(G.box(1.5, 0.5, 1.5), c.trim, s * 5.2, 8.3, zz);
      }
    }
    // door frame + glowing runes
    b.add(G.box(4.2, 5, 0.4), c.trim, 0, 4.3, 0.05);
    for (let k = 0; k < 5; k++) b.glow(G.box(0.25, 0.25, 0.1), c.glow, -1.6 + k * 0.8, 7.2, 0.3);
    for (const s of [-1, 1]) b.glow(G.box(0.12, 3.2, 0.1), c.glow, s * 1.8, 3.6, 0.3);
    const g = b.build();
    // the door (a separate mesh so it can open)
    const door = mk(g, G.box(3.2, 4.2, 0.3), M.phong(c.trim, 20), 0, 3.9, 0.25);
    const seal = mk(g, new V.RingGeometry(0.5, 0.8, 6), M.glow(c.glow), 0, 4.2, 0.42);
    g.userData.door = door; g.userData.seal = seal;
    // the dark doorway behind
    mk(g, G.box(3.2, 4.2, 0.1), M.glow(0x050308), 0, 3.9, 0.08);
    return g;
  }

  function tower(steps) {
    const b = builder();
    b.add(G.cyl(1.4, 2.2, 32, 8), 0x4a4060, 0, 16, 0);
    for (let k = 0; k < 8; k++) b.glow(G.box(0.2, 0.8, 0.1), 0x60fff0, Math.cos(k * 0.785) * 1.5, 4 + k * 3.5, Math.sin(k * 0.785) * 1.5, 0, -k * 0.785 + Math.PI / 2, 0);
    // the round platform on top
    b.add(G.cyl(4.2, 3.4, 0.8, 12), 0x6a5a8a, 0, 32.4, 0);
    b.add(G.tor(4.1, 0.15, 4, 16), 0x2a2040, 0, 33.6, 0, Math.PI / 2, 0, 0);
    for (let k = 0; k < 6; k++) b.add(G.cyl(0.1, 0.1, 1.2, 5), 0x2a2040, Math.cos(k * 1.05) * 4.1, 33.2, Math.sin(k * 1.05) * 4.1);
    b.add(G.cyl(0.3, 0.5, 3, 6), 0x4a4060, 0, 34.3, 0);
    // spiral steps
    for (const s of steps) b.add(G.cyl(1.25, 1.1, 0.35, 8), 0x7a6aa0, s.x, s.top - 0.175, s.z);
    const g = b.build();
    const orb = mk(g, G.ico(0.7, 1), M.glow(0x606070), 0, 36.6, 0);
    g.userData.orb = orb;
    return g;
  }

  function beacon() {
    const b = builder();
    b.add(G.cyl(1.4, 1.8, 0.5, 8), 0x5a5070, 0, 0.25, 0);
    b.add(G.cyl(0.35, 0.5, 2.2, 6), 0x4a4060, 0, 1.6, 0);
    const g = b.build();
    const crystal = mk(g, G.oct(0.5), M.glow(0x707080), 0, 3.3, 0, 0, 0, 0, 1, 1.6, 1);
    const beam = new V.Mesh(new V.CylinderGeometry(0.4, 0.4, 120, 8, 1, true), M.add(0x60f0ff, 0.18));
    beam.position.y = 63; beam.visible = false;
    g.add(beam);
    g.userData.crystal = crystal; g.userData.beam = beam;
    return g;
  }

  function chest() {
    const g = new V.Group();
    const base = M.phong(0x40506a, 40), trim = M.phong(0xd0a040, 70);
    mk(g, G.box(1.2, 0.6, 0.8), base, 0, 0.3, 0);
    mk(g, G.box(1.24, 0.1, 0.84), trim, 0, 0.12, 0);
    const lid = grp(g, 0, 0.6, -0.4);
    mk(lid, new V.CylinderGeometry(0.4, 0.4, 1.2, 12, 1, false, 0, Math.PI), base, 0, 0, 0.4, 0, 0, Math.PI / 2);
    mk(lid, G.box(1.24, 0.08, 0.1), trim, 0, 0.05, 0.8);
    const glowS = mk(g, G.box(1.22, 0.04, 0.82), M.glow(0x70f0ff), 0, 0.6, 0);
    mk(g, G.box(0.2, 0.25, 0.05), trim, 0, 0.5, 0.42);
    return { group: g, lid, glowS };
  }

  function shard() {
    const g = new V.Group();
    mk(g, G.oct(0.28), M.glow(0xffe040), 0, 0, 0, 0, 0, 0, 0.7, 1.3, 0.7).castShadow = false;
    const halo = mk(g, G.oct(0.4), M.add(0xffc020, 0.35), 0, 0, 0, 0, 0, 0, 0.7, 1.3, 0.7);
    halo.castShadow = false;
    return g;
  }

  function heartPiece() {
    const g = new V.Group();
    const m = M.glow(0xff4080);
    mk(g, G.sph(0.24, 10, 8), m, -0.17, 0.1, 0);
    mk(g, G.sph(0.24, 10, 8), m, 0.17, 0.1, 0);
    mk(g, G.cone(0.34, 0.5, 10), m, 0, -0.2, 0, Math.PI, 0, 0);
    mk(g, G.sph(0.6, 10, 8), M.add(0xff80b0, 0.25));
    return g;
  }

  const PART_COL = [0x60ffb0, 0xffd040, 0x60c0ff, 0xff6020];
  function shipPart(i) {
    const g = new V.Group();
    const c = PART_COL[i];
    if (i === 0) { mk(g, G.cyl(0.35, 0.35, 0.8, 10), M.phong(0xc0c0d0, 60)); mk(g, G.sph(0.3, 10, 8), M.glow(c), 0, 0, 0, 0, 0, 0, 1.3, 1.5, 1.3); }
    if (i === 1) { mk(g, G.box(0.8, 0.12, 0.6), M.phong(0x205030, 60)); for (let k = 0; k < 6; k++) mk(g, G.box(0.1, 0.06, 0.1), M.glow(c), -0.3 + k * 0.12, 0.08, (k % 2) * 0.2 - 0.1); }
    if (i === 2) { mk(g, G.cap(0.25, 0.6, 10), M.glass(c, 0.8)); mk(g, G.cyl(0.28, 0.28, 0.1, 10), M.phong(0x606070), 0, 0.5, 0); mk(g, G.cyl(0.28, 0.28, 0.1, 10), M.phong(0x606070), 0, -0.5, 0); }
    if (i === 3) { mk(g, G.oct(0.5), M.glow(c), 0, 0, 0, 0, 0, 0, 0.8, 1.5, 0.8); }
    mk(g, G.sph(0.9, 12, 8), M.add(c, 0.2));
    return g;
  }

  function runeStone(color = 0x60ffb0) {
    const b = builder();
    b.add(G.box(1, 2.2, 0.6), 0x6a6a7a, 0, 1.1, 0, 0, 0, 0.03);
    b.add(G.box(1.2, 0.3, 0.8), 0x4a4a5a, 0, 0.15, 0);
    const g = b.build();
    const rune = mk(g, G.tor(0.28, 0.06, 4, 6), M.glow(0x303040), 0, 1.4, 0.31);
    const rune2 = mk(g, G.tor(0.28, 0.06, 4, 6), M.glow(0x303040), 0, 1.4, -0.31);
    g.userData.runes = [rune, rune2];
    g.userData.onColor = color;
    return g;
  }

  function target() {
    const g = new V.Group();
    const b = builder();
    b.add(G.cyl(0.3, 0.5, 1.2, 6), 0x5a5a6a, 0, 0.6, 0);
    g.add(b.build());
    const orb = mk(g, G.ico(0.5, 1), M.glow(0xff60d0), 0, 1.9, 0);
    const ring = mk(g, G.tor(0.75, 0.05, 4, 20), M.glow(0xffffff), 0, 1.9, 0);
    g.userData.orb = orb; g.userData.ring = ring;
    return g;
  }

  function hut(color = 0xf07aa0) {
    const b = builder();
    b.add(G.cyl(2.2, 2.6, 2.8, 12), 0xf0e0c8, 0, 1.4, 0);
    b.add(new V.SphereGeometry(3.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), color, 0, 2.6, 0, 0, 0, 0, 1, 0.7, 1);
    for (let k = 0; k < 7; k++) { const a = k * 0.9; b.add(G.sph(0.35, 8, 6), 0xffffff, Math.cos(a) * 2.2, 3.8 + Math.sin(k) * 0.3, Math.sin(a) * 2.2); }
    b.add(G.box(1.2, 1.9, 0.2), 0x6a3a2a, 0, 0.95, 2.45);
    b.glow(G.sph(0.35, 8, 6), 0xffe070, 1.6, 1.8, 1.85);
    b.glow(G.sph(0.35, 8, 6), 0xffe070, -1.6, 1.8, 1.85);
    return b.build();
  }

  function stall() {
    const b = builder();
    b.add(G.box(3.4, 1.1, 1.2), 0x8a5a3a, 0, 0.55, 0);
    for (const s of [-1, 1]) b.add(G.cyl(0.08, 0.08, 2.6, 5), 0x5a3a2a, s * 1.6, 1.3, -0.4);
    b.add(G.box(4, 0.1, 2), 0xff70a0, 0, 2.6, 0, 0.15, 0, 0);
    for (let k = 0; k < 5; k++) b.glow(G.oct(0.14), [0xff4080, 0x60f0ff, 0xffe040][k % 3], -1.2 + k * 0.6, 1.3, 0);
    return b.build();
  }

  function pillar(h, color = 0x2a2226) {
    const b = builder();
    b.add(G.cyl(1.5, 1.7, h, 6), color, 0, h / 2, 0);
    b.glow(G.cyl(1.52, 1.52, 0.12, 6), 0xff5020, 0, h - 0.4, 0);
    return b.build();
  }

  function portal(color = 0x80f0ff) {
    const g = new V.Group();
    const ring = mk(g, G.tor(1.6, 0.18, 8, 28), M.glow(color), 0, 2, 0);
    const disc = mk(g, new V.CircleGeometry(1.5, 28), M.add(color, 0.35), 0, 2, 0);
    g.userData.ring = ring; g.userData.disc = disc;
    return g;
  }

  function arrow() {
    const g = new V.Group();
    mk(g, G.box(0.05, 0.05, 0.9), M.glow(0xffe080), 0, 0, 0);
    mk(g, G.box(0.14, 0.14, 1.1), M.add(0xffb030, 0.5), 0, 0, 0).castShadow = false;
    return g;
  }

  function orbProjectile(color = 0xffff60, r = 0.3) {
    const g = new V.Group();
    mk(g, G.sph(r, 10, 8), M.glow(color)).castShadow = false;
    mk(g, G.sph(r * 1.9, 10, 8), M.add(color, 0.35)).castShadow = false;
    return g;
  }

  return {
    M, G, mk, grp, builder,
    astronaut, zib, villager, floof, jelly,
    gloop, spinecrab, zapwing, golem,
    thornmaw, sandwyrm, colossus, emberking,
    ship, temple, tower, beacon, chest, shard, heartPiece, shipPart, runeStone, target, hut, stall, pillar, portal, arrow, orbProjectile,
    TEMPLE_COLORS, PART_COL,
  };
})();
