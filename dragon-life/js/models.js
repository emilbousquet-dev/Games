// ============================================================
//  DRAGON LIFE — all the 3D models
//  Everything is made from simple shapes (boxes, balls, cones)
//  with flat shading, so it looks like a cute low-poly world.
// ============================================================
window.DL = window.DL || {};

DL.Models = (function () {
  const U = DL.U;
  const G = DL.Geo;
  const PI = Math.PI;
  const mats = new Map();
  // one material per color (re-used, so the game stays fast)
  function mat(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    let m = mats.get(key);
    if (!m) {
      m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0, flatShading: false }, opts));
      mats.set(key, m);
    }
    return m;
  }
  const vcMat = () => mat(0xffffff, { vertexColors: true });
  function mesh(geo, m, x = 0, y = 0, z = 0, shadow = true) {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z);
    o.castShadow = shadow; o.receiveShadow = true;
    return o;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const Q = DL.Q;
  const ball = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, Math.round(w * Q), Math.round(h * Q));
  const cyl = (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, Math.max(s, Math.round(s * Q)));
  const cone = (r, h, s = 6) => new THREE.ConeGeometry(r, h, Math.max(s, Math.round(s * Q)));
  // a round arm or leg (a capsule: a tube with round ends)
  const limb = (w, h, d) => { const r = Math.min(w, d) / 2; return new THREE.CapsuleGeometry(r, Math.max(0.01, h - r * 2), 3, Math.round(6 * Q)); };

  // ------------------------------------------------------------
  //  PEOPLE (you and the villagers)
  // ------------------------------------------------------------
  function human(o = {}) {
    o = Object.assign({ skin: 0xf0c08a, shirt: 0x3d7fd6, pants: 0x5b4632, hair: 0x5a3417, boots: 0x3b2a1c, hairStyle: 'short', scale: 1, bag: false, beard: false, dress: false, apron: null }, o);
    const root = new THREE.Group();
    const body = new THREE.Group(); root.add(body);
    const P = { root, body, legs: [], arms: [], shins: [], forearms: [] };
    const mSkin = mat(o.skin), mShirt = mat(o.shirt), mPants = mat(o.pants), mHair = mat(o.hair), mBoot = mat(o.boots);
    // legs
    for (const s of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(s * 0.12, 0.92, 0); body.add(leg);
      leg.add(mesh(limb(0.19, 0.52, 0.19), mPants, 0, -0.24, 0));
      const shin = new THREE.Group(); shin.position.set(0, -0.47, 0); leg.add(shin);
      shin.add(mesh(limb(0.16, 0.4, 0.16), mPants, 0, -0.17, 0));
      shin.add(mesh(limb(0.18, 0.3, 0.18), mBoot, 0, -0.39, 0.05).rotateX(Math.PI / 2));
      P.legs.push(leg); P.shins.push(shin);
    }
    // body
    const torso = new THREE.Group(); torso.position.y = 0.92; body.add(torso); P.torso = torso;
    if (o.dress) torso.add(mesh(cyl(0.2, 0.36, 0.75, 8), mShirt, 0, 0.05, 0));
    torso.add(mesh(cyl(0.2, 0.25, 0.62, 8), mShirt, 0, 0.32, 0));
    torso.add(mesh(cyl(0.255, 0.255, 0.07, 8), mat(0x3a2414), 0, 0.06, 0)); // belt
    torso.add(mesh(box(0.08, 0.06, 0.03), mat(0xd8b040, { metalness: 0.5, roughness: 0.4 }), 0, 0.06, 0.25));
    if (o.apron) torso.add(mesh(box(0.34, 0.5, 0.04), mat(o.apron), 0, 0.2, 0.23));
    if (o.bag) {
      torso.add(mesh(box(0.34, 0.4, 0.18), mat(0x8a5a2c), 0, 0.38, -0.27));
      torso.add(mesh(cyl(0.1, 0.1, 0.36, 6), mat(0x4a6a2c), 0, 0.62, -0.27).rotateZ(PI / 2)); // rolled blanket
    }
    // arms
    for (const s of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(s * 0.29, 0.58, 0); torso.add(arm);
      arm.add(mesh(limb(0.14, 0.36, 0.14), mShirt, 0, -0.14, 0));
      const fore = new THREE.Group(); fore.position.set(0, -0.3, 0); arm.add(fore);
      fore.add(mesh(limb(0.12, 0.32, 0.12), mSkin, 0, -0.13, 0));
      const hand = new THREE.Group(); hand.position.set(0, -0.3, 0.02); fore.add(hand);
      hand.add(mesh(ball(0.07, 6, 5), mSkin));
      P.arms.push(arm); P.forearms.push(fore);
      if (s === 1) P.hand = hand; else P.handL = hand;
    }
    // head
    const head = new THREE.Group(); head.position.set(0, 0.72, 0); torso.add(head); P.head = head;
    head.add(mesh(cyl(0.07, 0.08, 0.1, 6), mSkin, 0, 0.0, 0));
    const skull = mesh(ball(0.17, 10, 8), mSkin, 0, 0.17, 0); skull.scale.set(1, 1.08, 1); head.add(skull);
    for (const s of [-1, 1]) {
      head.add(mesh(box(0.035, 0.05, 0.02), mat(0x1a1410), s * 0.065, 0.19, 0.155, false));
      head.add(mesh(box(0.05, 0.015, 0.02), mHair, s * 0.065, 0.24, 0.15, false)); // eyebrows
    }
    head.add(mesh(box(0.04, 0.05, 0.05), mSkin, 0, 0.15, 0.17, false)); // nose
    head.add(mesh(box(0.07, 0.015, 0.02), mat(0xb05a4a), 0, 0.09, 0.155, false)); // mouth
    // hair
    const hairTop = mesh(new THREE.SphereGeometry(0.185, 10, 8, 0, PI * 2, 0, PI * 0.55), mHair, 0, 0.19, -0.01);
    hairTop.scale.set(1.02, 1.1, 1.05); head.add(hairTop);
    if (o.hairStyle === 'long' || o.hairStyle === 'bun') head.add(mesh(box(0.34, 0.3, 0.12), mHair, 0, 0.1, -0.12));
    if (o.hairStyle === 'bun') head.add(mesh(ball(0.1, 7, 6), mHair, 0, 0.32, -0.14));
    if (o.hairStyle === 'spiky') for (let i = 0; i < 6; i++) head.add(mesh(cone(0.06, 0.16, 4), mHair, Math.cos(i) * 0.1, 0.36, Math.sin(i * 2) * 0.08 - 0.02));
    if (o.hat) {
      head.add(mesh(cyl(0.3, 0.3, 0.03, 10), mat(o.hat), 0, 0.33, 0));
      head.add(mesh(cyl(0.15, 0.18, 0.16, 10), mat(o.hat), 0, 0.42, 0));
    }
    if (o.beard) head.add(mesh(box(0.24, 0.16, 0.08), mHair, 0, 0.06, 0.13));
    root.scale.setScalar(o.scale);

    // tools in the right hand
    P.tools = {};
    const wood = mat(0x8a5a30), metal = mat(0xb8bcc4, { metalness: 0.6, roughness: 0.35 });
    const addTool = (name, parts) => { const g = new THREE.Group(); for (const p of parts) g.add(p); g.visible = false; P.hand.add(g); P.tools[name] = g; return g; };
    addTool('axe', [mesh(cyl(0.025, 0.03, 0.6, 5), wood, 0, 0, 0.15).rotateX(PI / 2), mesh(box(0.03, 0.16, 0.14), metal, 0, -0.06, 0.4)]);
    addTool('pick', [mesh(cyl(0.025, 0.03, 0.6, 5), wood, 0, 0, 0.15).rotateX(PI / 2), mesh(box(0.03, 0.04, 0.42), metal, 0, -0.04, 0.42).rotateX(PI / 2)]);
    addTool('rod', [mesh(cyl(0.01, 0.025, 1.6, 5), wood, 0, 0.55, 0.45).rotateX(PI / 4), mesh(cyl(0.05, 0.05, 0.04, 8), metal, 0, 0.05, 0.06).rotateZ(PI / 2)]);
    addTool('stick', [mesh(cyl(0.03, 0.035, 0.7, 5), wood, 0, 0, 0.2).rotateX(PI / 2.4)]);
    addTool('food', [mesh(ball(0.08, 6, 5), mat(0xe05050), 0, -0.02, 0.06)]);
    P.setTool = (name) => { for (const k in P.tools) P.tools[k].visible = k === name; };
    P.setFoodColor = (c) => P.tools.food.children[0].material = mat(c);

    // animation: s = { speed (m/s), swim, ride, swing (0..1, tool use), wave, sit, t }
    let phase = 0;
    P.animate = (dt, s) => {
      const sp = Math.min(s.speed || 0, 8);
      phase += dt * (2.2 + sp * 1.25);
      const walk = Math.min(1, sp / 3);
      const sw = Math.sin(phase) * 0.75 * walk;
      let bob = Math.abs(Math.cos(phase)) * 0.05 * walk;
      let legA = sw, legB = -sw, armA = -sw * 0.8, armB = sw * 0.8;
      let kneeA = Math.max(0, -Math.sin(phase)) * walk * 1.0, kneeB = Math.max(0, Math.sin(phase)) * walk * 1.0;
      let lean = sp > 5 ? 0.18 : sp * 0.025;
      if (s.swim) {
        const k = Math.sin((s.t || 0) * 3);
        legA = k * 0.4; legB = -k * 0.4; armA = -2.6 + Math.sin((s.t || 0) * 3) * 0.6; armB = -2.6 - Math.sin((s.t || 0) * 3) * 0.6;
        kneeA = kneeB = 0.2; lean = 0.9; bob = 0;
      }
      if (s.ride) { legA = legB = -1.3; kneeA = kneeB = 1.5; armA = armB = -0.9; lean = 0.25; bob = 0; }
      if (s.sit) { legA = legB = -1.5; kneeA = kneeB = 1.5; armA = armB = -0.2; lean = 0; bob = 0; }
      P.legs[0].rotation.x = legA; P.legs[1].rotation.x = legB;
      P.shins[0].rotation.x = kneeA; P.shins[1].rotation.x = kneeB;
      P.arms[0].rotation.x = armA; P.arms[1].rotation.x = armB;
      P.arms[0].rotation.z = -0.08; P.arms[1].rotation.z = 0.08;
      P.forearms[0].rotation.x = -0.25 - walk * 0.3; P.forearms[1].rotation.x = -0.25 - walk * 0.3;
      // using a tool: big swing with the right arm
      if (s.swing > 0) {
        const k = s.swing;
        const up = k < 0.45 ? k / 0.45 : 1 - (k - 0.45) / 0.55;
        P.arms[1].rotation.x = -2.6 * up - 0.4;
        P.forearms[1].rotation.x = -0.6 * up;
      }
      if (s.holdOut) { P.arms[1].rotation.x = -1.2; P.forearms[1].rotation.x = -0.3; }
      if (s.wave > 0) { P.arms[0].rotation.z = -2.6; P.arms[0].rotation.x = 0; P.forearms[0].rotation.z = Math.sin((s.t || 0) * 10) * 0.5; }
      else P.forearms[0].rotation.z = 0;
      if (s.pet > 0) { P.arms[1].rotation.x = -1.5 + Math.sin((s.t || 0) * 8) * 0.2; P.forearms[1].rotation.x = -0.2; }
      P.torso.rotation.x = lean;
      P.body.position.y = bob;
      P.head.rotation.x = -lean * 0.6 + (s.lookDown || 0);
    };
    return P;
  }

  // ------------------------------------------------------------
  //  THE DRAGON
  // ------------------------------------------------------------
  const DRAGON_COLORS = {
    emerald: { main: 0x3aa45a, belly: 0xe8d890, wing: 0x2c7d6a, horn: 0xf0e6c8, eye: 0xffd23a, spike: 0x1f6a3a },
    ruby: { main: 0xc8323a, belly: 0xf2c27a, wing: 0x8a1f3a, horn: 0x2a2020, eye: 0xffe23a, spike: 0x6a1020 },
    ocean: { main: 0x2f74d0, belly: 0xbfe6ff, wing: 0x2aa0b8, horn: 0xe8f4ff, eye: 0x7affff, spike: 0x1a3f8a },
    gold: { main: 0xe0aa2a, belly: 0xfff0b0, wing: 0xc0701a, horn: 0xfff8e8, eye: 0xff4a1a, spike: 0xa05a10 },
    shadow: { main: 0x2a2836, belly: 0x5a5470, wing: 0x46306a, horn: 0xc8c0e0, eye: 0xb04aff, spike: 0x15141c },
    amethyst: { main: 0x8a4ad0, belly: 0xf0c8ff, wing: 0xd060c0, horn: 0xfff0ff, eye: 0x6affb0, spike: 0x5a2a8a },
    snow: { main: 0xe8f0f8, belly: 0xbfd8f0, wing: 0x9ac4e8, horn: 0x6a8ab0, eye: 0x3ac0ff, spike: 0xa8c8e8 },
  };
  const SADDLES = {
    none: null,
    leather: { seat: 0x7a4a24, trim: 0xc89a3a },
    royal: { seat: 0x8a1a2a, trim: 0xffd040 },
    sky: { seat: 0x2a5ab0, trim: 0xe8f4ff },
  };

  function dragon(colorName = 'emerald') {
    const D = { neck: [], tail: [], legs: [], wings: [], parts: {} };
    const root = new THREE.Group(); D.root = root;
    const C = DRAGON_COLORS[colorName] || DRAGON_COLORS.emerald;
    const scaleMap = DL.Tex.T.scales;
    D.mMain = new THREE.MeshStandardMaterial({ color: C.main, roughness: 0.45, metalness: 0.08, map: scaleMap, bumpMap: scaleMap, bumpScale: 1.2 });
    D.mBelly = new THREE.MeshStandardMaterial({ color: C.belly, roughness: 0.6 });
    D.mWing = new THREE.MeshStandardMaterial({ color: C.wing, roughness: 0.65, side: THREE.DoubleSide, transparent: true, opacity: 0.94 });
    D.mHorn = new THREE.MeshStandardMaterial({ color: C.horn, roughness: 0.35 });
    D.mSpike = new THREE.MeshStandardMaterial({ color: C.spike, roughness: 0.45 });
    D.mEye = new THREE.MeshStandardMaterial({ color: C.eye, emissive: C.eye, emissiveIntensity: 0.6, roughness: 0.3 });
    const mPupil = mat(0x101010);

    const body = new THREE.Group(); body.position.y = 2.05; root.add(body); D.body = body;
    const torso = mesh(ball(1, 12, 9), D.mMain); torso.scale.set(1.1, 1.0, 2.25); body.add(torso);
    const chest = mesh(ball(1, 10, 8), D.mMain, 0, 0.12, 1.25); chest.scale.set(1.05, 1.05, 1.15); body.add(chest);
    const belly = mesh(ball(1, 10, 8), D.mBelly, 0, -0.32, 0.25); belly.scale.set(0.9, 0.72, 2.1); body.add(belly);
    // spikes on the back
    for (let i = 0; i < 7; i++) {
      const z = 1.7 - i * 0.55;
      const y = 1.0 * Math.sqrt(Math.max(0, 1 - (z / 2.4) ** 2)) + 0.02;
      const sp = mesh(cone(0.18 - i * 0.012, 0.5 - i * 0.03, 4), D.mSpike, 0, y + 0.18, z);
      sp.rotation.x = -0.4; body.add(sp);
    }
    // neck: a chain of pieces, each one a child of the one before, so it can bend
    let parent = new THREE.Group(); parent.position.set(0, 0.5, 1.95); body.add(parent);
    D.neckBase = parent;
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Group();
      if (i > 0) seg.position.z = 0.62;
      parent.add(seg);
      const r = 0.52 - i * 0.06;
      const m = mesh(cyl(r * 0.9, r, 0.85, 8), D.mMain, 0, 0, 0.3); m.rotation.x = PI / 2; seg.add(m);
      seg.add(mesh(ball(r * 0.98, 10, 8), D.mMain, 0, 0, 0)); // round joint
      const b = mesh(cyl(r * 0.6, r * 0.7, 0.8, 6), D.mBelly, 0, -r * 0.45, 0.3); b.rotation.x = PI / 2; seg.add(b);
      const sp = mesh(cone(0.12, 0.32, 4), D.mSpike, 0, r + 0.08, 0.3); sp.rotation.x = -0.5; seg.add(sp);
      D.neck.push(seg);
      parent = seg;
    }
    // head
    const head = new THREE.Group(); head.position.z = 0.75; parent.add(head); D.head = head;
    const skull = mesh(ball(0.5, 10, 8), D.mMain, 0, 0.05, 0); skull.scale.set(1.05, 0.95, 1.1); head.add(skull);
    const snout = mesh(ball(1, 12, 9), D.mMain, 0, -0.02, 0.6); snout.scale.set(0.32, 0.22, 0.6); head.add(snout);
    head.add(mesh(box(0.5, 0.06, 0.8), D.mBelly, 0, -0.22, 0.66));
    for (const s of [-1, 1]) {
      head.add(mesh(box(0.08, 0.06, 0.06), mat(0x1a1a1a), s * 0.16, 0.12, 1.15, false)); // nostrils
      const eye = mesh(ball(0.12, 8, 6), D.mEye, s * 0.33, 0.18, 0.28, false); head.add(eye);
      const pupil = mesh(box(0.03, 0.15, 0.06), mPupil, s * 0.42, 0.18, 0.33, false); head.add(pupil);
      const brow = mesh(box(0.2, 0.08, 0.3), D.mMain, s * 0.3, 0.32, 0.3); brow.rotation.z = s * 0.3; head.add(brow);
      const horn = mesh(cone(0.11, 0.85, 5), D.mHorn, s * 0.25, 0.45, -0.25); horn.rotation.set(-2.1, 0, s * -0.25); head.add(horn);
      const horn2 = mesh(cone(0.06, 0.4, 4), D.mHorn, s * 0.42, 0.25, -0.3); horn2.rotation.set(-2.0, 0, s * -0.8); head.add(horn2);
      const fin = mesh(cone(0.18, 0.5, 3), D.mWing, s * 0.48, 0.0, -0.1); fin.rotation.set(-1.6, 0, s * -1.2); fin.scale.z = 0.3; head.add(fin);
      // teeth
      for (let k = 0; k < 3; k++) head.add(mesh(cone(0.03, 0.09, 3), D.mHorn, s * 0.24, -0.27, 0.8 + k * 0.14, false).rotateX(PI));
    }
    const jaw = new THREE.Group(); jaw.position.set(0, -0.2, 0.2); head.add(jaw); D.jaw = jaw;
    const jawM = mesh(ball(1, 12, 8), D.mMain, 0, -0.04, 0.42); jawM.scale.set(0.27, 0.1, 0.55); jaw.add(jawM);
    const tongue = mesh(ball(1, 10, 6), mat(0xc04a5a), 0, 0.04, 0.42, false); tongue.scale.set(0.2, 0.04, 0.45); jaw.add(tongue);
    D.mouth = new THREE.Object3D(); D.mouth.position.set(0, -0.1, 1.25); head.add(D.mouth);
    // tail
    parent = new THREE.Group(); parent.position.set(0, 0.1, -2.05); body.add(parent);
    for (let i = 0; i < 9; i++) {
      const seg = new THREE.Group();
      if (i > 0) seg.position.z = -0.62;
      parent.add(seg);
      const r = Math.max(0.07, 0.62 * (1 - i / 9.5));
      const m = mesh(cyl(r, r * 0.85, 0.8, 7), D.mMain, 0, 0, -0.3); m.rotation.x = PI / 2; seg.add(m);
      seg.add(mesh(ball(r, 10, 8), D.mMain, 0, 0, 0)); // round joint
      if (i % 2 === 0) { const sp = mesh(cone(0.1, 0.28, 4), D.mSpike, 0, r + 0.06, -0.3); sp.rotation.x = 0.5; seg.add(sp); }
      D.tail.push(seg);
      parent = seg;
    }
    const spade = mesh(cone(0.38, 0.7, 4), D.mSpike, 0, 0, -0.75); spade.rotation.x = -PI / 2; spade.scale.set(1, 1, 0.25); parent.add(spade);
    // legs
    const legSpots = [[0.78, -0.25, 1.25], [-0.78, -0.25, 1.25], [0.82, -0.15, -1.25], [-0.82, -0.15, -1.25]];
    for (let i = 0; i < 4; i++) {
      const [x, y, z] = legSpots[i];
      const leg = new THREE.Group(); leg.position.set(x, y, z); body.add(leg);
      const thigh = mesh(ball(0.42, 8, 6), D.mMain, 0, -0.1, 0); thigh.scale.set(0.9, 1.3, 1.1); leg.add(thigh);
      leg.add(mesh(cyl(0.26, 0.22, 0.9, 7), D.mMain, 0, -0.55, 0));
      const lower = new THREE.Group(); lower.position.y = -0.95; leg.add(lower);
      lower.add(mesh(cyl(0.2, 0.16, 0.8, 7), D.mMain, 0, -0.35, 0));
      const foot = new THREE.Group(); foot.position.y = -0.78; lower.add(foot);
      const footM = mesh(ball(1, 10, 8), D.mMain, 0, 0, 0.1); footM.scale.set(0.23, 0.12, 0.3); foot.add(footM);
      for (const cx of [-0.13, 0, 0.13]) { const c = mesh(cone(0.06, 0.2, 4), D.mHorn, cx, -0.04, 0.4, false); c.rotation.x = PI / 2; foot.add(c); }
      D.legs.push({ leg, lower, foot, front: i < 2 });
    }
    // wings
    for (const s of [1, -1]) {
      const shoulder = new THREE.Group(); shoulder.position.set(s * 0.8, 0.75, 0.85); shoulder.scale.x = s; body.add(shoulder);
      const arm = new THREE.Group(); arm.rotation.order = 'YZX'; shoulder.add(arm);
      const bone = mesh(cyl(0.08, 0.13, 3.05, 6), D.mMain, 1.5, 0.15, -0.1); bone.rotation.z = PI / 2 - 0.13; arm.add(bone);
      const fore = new THREE.Group(); fore.position.set(3.0, 0.3, -0.2); arm.add(fore);
      const bone2 = mesh(cyl(0.06, 0.12, 3.5, 6), D.mMain, 1.7, -0.05, -0.45); bone2.rotation.set(0, 0.26, PI / 2 + 0.03); fore.add(bone2);
      fore.add(mesh(cone(0.1, 0.4, 4), D.mHorn, 0, 0.12, 0.1)); // claw on the elbow
      // the skin of the wing
      const inner = membrane([[0, 0, 0], [3.0, 0.3, -0.2], [3.0, -0.1, -2.9], [0, 0, 0], [3.0, -0.1, -2.9], [0.2, -0.1, -3.0]]);
      arm.add(new THREE.Mesh(inner, D.mWing));
      const outer = membrane([[0, 0, 0], [3.4, -0.1, -0.9], [2.1, -0.25, -2.3], [0, 0, 0], [2.1, -0.25, -2.3], [0, -0.4, -2.7]]);
      fore.add(new THREE.Mesh(outer, D.mWing));
      // finger bones
      for (const p of [[2.1, -0.25, -2.3], [0.9, -0.3, -2.6]]) {
        const len = Math.hypot(p[0], p[1], p[2]);
        const f = mesh(cyl(0.025, 0.05, len, 4), D.mMain, p[0] / 2, p[1] / 2, p[2] / 2);
        f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...p).normalize());
        fore.add(f);
      }
      for (const o of arm.children.concat(fore.children)) o.castShadow = true;
      D.wings.push({ shoulder, arm, fore });
    }
    // saddle
    D.saddle = new THREE.Group(); D.saddle.position.set(0, 0.95, 0.55); body.add(D.saddle);
    D.seat = new THREE.Object3D(); D.seat.position.set(0, 1.25, 0.45); body.add(D.seat);

    D.setColor = (name) => {
      const c = DRAGON_COLORS[name] || DRAGON_COLORS.emerald;
      D.mMain.color.set(c.main); D.mBelly.color.set(c.belly); D.mWing.color.set(c.wing);
      D.mHorn.color.set(c.horn); D.mSpike.color.set(c.spike); D.mEye.color.set(c.eye); D.mEye.emissive.set(c.eye);
    };
    D.setSaddle = (name) => {
      D.saddle.clear();
      const S = SADDLES[name];
      if (!S) return;
      const seat = mat(S.seat), trim = mat(S.trim, { metalness: 0.4, roughness: 0.4 });
      const base = mesh(box(1.25, 0.18, 1.3), seat, 0, 0, 0); D.saddle.add(base);
      D.saddle.add(mesh(box(1.32, 0.05, 1.36), trim, 0, -0.08, 0));
      D.saddle.add(mesh(box(0.7, 0.35, 0.18), seat, 0, 0.2, 0.62)); // front
      D.saddle.add(mesh(cyl(0.05, 0.05, 0.2, 6), trim, 0, 0.42, 0.65)); // handle
      D.saddle.add(mesh(box(0.8, 0.28, 0.14), seat, 0, 0.14, -0.62)); // back
      for (const s of [-1, 1]) {
        D.saddle.add(mesh(box(0.06, 0.6, 0.2), seat, s * 0.98, -0.25, 0)); // straps
        D.saddle.add(mesh(box(0.14, 0.08, 0.26), trim, s * 1.0, -0.5, 0.2)); // foot rests
      }
      // a little blanket
      D.saddle.add(mesh(box(1.6, 0.04, 1.0), mat(S.trim), 0, -0.05, -0.1));
    };
    D.setStage = (stage) => {
      // babies have big heads, small wings and short legs. Cute!
      const k = stage === 'baby' ? 1 : stage === 'young' ? 0.5 : 0;
      D.head.scale.setScalar(1 + k * 0.4);
      for (const w of D.wings) w.shoulder.scale.set(w.shoulder.scale.x > 0 ? 1 - k * 0.35 : -(1 - k * 0.35), 1 - k * 0.35, 1 - k * 0.35);
      for (const l of D.legs) l.leg.scale.setScalar(1 - k * 0.12);
      for (const s of D.tail) s.scale.setScalar(1 - k * 0.04);
      D.body.position.y = 2.05 * (1 - k * 0.12);
      D.saddle.visible = stage !== 'baby';
    };

    // ------- animation -------
    // s = { walk: 0..1 speed, phase, fly: 0..1, flap: 0..1, glide, headYaw, headPitch, jaw: 0..1, sleep: 0..1, sit: 0..1, t, bank, climb }
    D.animate = (dt, s) => {
      const t = s.t;
      const fly = s.fly || 0, ground = 1 - fly;
      const walk = (s.walk || 0) * ground;
      const ph = s.phase || 0;
      const sleep = (s.sleep || 0) * ground;
      const sit = (s.sit || 0) * ground * (1 - sleep);
      // legs
      for (let i = 0; i < 4; i++) {
        const L = D.legs[i];
        const off = (i === 0 || i === 3) ? 0 : PI;
        const sw = Math.sin(ph + off) * 0.55 * walk;
        let x = sw, kx = Math.max(0, Math.sin(ph + off + 1.2)) * 0.7 * walk;
        // folded up when flying
        x = U.lerp(x, L.front ? -0.9 : 1.1, fly);
        kx = U.lerp(kx, L.front ? 1.7 : -0.4, fly);
        // lying down when sleeping
        x = U.lerp(x, L.front ? -1.25 : 1.4, sleep);
        kx = U.lerp(kx, L.front ? 1.9 : -1.6, sleep);
        if (!L.front) { x = U.lerp(x, 1.1, sit); kx = U.lerp(kx, -1.2, sit); }
        L.leg.rotation.x = x;
        L.lower.rotation.x = kx;
        L.foot.rotation.x = -x - kx;
      }
      D.body.rotation.x = U.lerp(-0.05 * walk, 0, fly) - sit * 0.38 + (s.climb || 0) * 0.35 * fly;
      D.body.rotation.z = (s.bank || 0) * fly;
      const bodyY = (D.stageY || 2.05);
      D.body.position.y = bodyY * (1 - sleep * 0.55 - sit * 0.1) + Math.abs(Math.sin(ph * 2)) * 0.06 * walk + (fly ? Math.sin(t * 2) * 0.1 * fly : 0) + Math.sin(t * 1.6) * 0.02;
      // breathing
      const br = 1 + Math.sin(t * (sleep > 0.5 ? 1.2 : 2.2)) * 0.015;
      D.body.scale.set(br, br, 1);
      // neck and head
      const hy = (s.headYaw || 0), hp = (s.headPitch || 0);
      const neckUp = U.lerp(U.lerp(-0.85, -0.15, fly), 0.35, sleep) + sit * 0.2;
      for (let i = 0; i < D.neck.length; i++) {
        D.neck[i].rotation.y = U.lerp(hy / 4, 0, fly) + (sleep ? Math.sin(i) * 0.35 * sleep : 0);
        D.neck[i].rotation.x = (i === 0 ? neckUp : U.lerp(0.12, 0.04, fly) - sleep * 0.05) + hp / 4;
      }
      D.head.rotation.x = U.lerp(U.lerp(0.75, 0.1, fly), -0.2, sleep) + hp * 0.3 - sit * 0.2;
      D.head.rotation.y = U.lerp(hy * 0.2, 0, fly);
      D.jaw.rotation.x = (s.jaw || 0) * 0.55;
      // tail
      for (let i = 0; i < D.tail.length; i++) {
        D.tail[i].rotation.y = Math.sin(t * (1.6 + walk * 3) - i * 0.6) * (0.1 + walk * 0.06) * (1 - sleep * 0.7) + sleep * 0.32;
        D.tail[i].rotation.x = U.lerp(i === 0 ? 0.25 : 0.04, i === 0 ? 0.05 : -0.01, fly) + (s.wag || 0) * Math.sin(t * 14 - i) * 0.05;
      }
      // wings
      const flapPh = s.flapPh || 0;
      for (const W of D.wings) {
        // open and flapping
        const amp = (s.flap || 0);
        const oz = Math.sin(flapPh) * 0.75 * amp + (s.glide ? 0.08 : 0), oy = -0.1 + Math.cos(flapPh) * 0.12 * amp;
        const ofz = Math.sin(flapPh - 0.9) * 0.55 * amp, ofy = 0.05;
        const open = Math.max(fly, s.stretch || 0);
        // folded: the bones get short and the skin lies along the back
        W.arm.scale.x = U.lerp(0.3, 1, open);
        W.arm.rotation.x = U.lerp(-0.75 - sleep * 0.2, 0, open);
        W.arm.rotation.y = U.lerp(0.3, oy, open);
        W.arm.rotation.z = U.lerp(0.45 - sleep * 0.3, oz, open);
        W.fore.rotation.y = U.lerp(0.1, ofy, open);
        W.fore.rotation.z = U.lerp(-0.2, ofz, open);
      }
    };
    D.setColor(colorName);
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return D;
  }
  function membrane(pts) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
    g.computeVertexNormals();
    return g;
  }

  // the dragon egg
  function egg() {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const a = i / 12 * PI;
      const r = Math.sin(a) * (0.42 + (a > PI / 2 ? 0.06 : -0.02));
      pts.push(new THREE.Vector2(r, -Math.cos(a) * 0.6));
    }
    const g = new THREE.LatheGeometry(pts, 12);
    const tex = U.tex(U.canvas(128, 64, (c, w, h) => {
      c.fillStyle = '#4ab07a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) {
        c.fillStyle = U.pick(['#2a7a50', '#f0d870', '#7ad8a0']);
        c.beginPath(); c.ellipse(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2 + Math.random() * 4, 0, 0, 7); c.fill();
      }
    }));
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, emissive: 0x2a6a30, emissiveIntensity: 0.3 });
    const o = new THREE.Mesh(g, m); o.castShadow = true; o.position.y = 0.6;
    const grp = new THREE.Group(); grp.add(o);
    grp.userData.mat = m;
    return grp;
  }

  // ------------------------------------------------------------
  //  NATURE (made as single shapes, used with "instancing" so we
  //  can have thousands of them)
  // ------------------------------------------------------------
  function natureGeos() {
    const out = {};
    const trunk = 0x7a5232;
    out.oak = G.merge([
      { geo: cyl(0.22, 0.34, 3.2, 6), color: trunk, pos: [0, 1.6, 0] },
      { geo: G.blob(1.9, 1), color: 0x4f9a3a, pos: [0, 4.2, 0], jitter: 0.25 },
      { geo: G.blob(1.4, 2), color: 0x5aa844, pos: [1.0, 3.6, 0.5], jitter: 0.25 },
      { geo: G.blob(1.5, 3), color: 0x468a34, pos: [-0.9, 3.7, -0.5], jitter: 0.25 },
      { geo: G.blob(1.2, 4), color: 0x62b04a, pos: [0.2, 5.4, -0.2], jitter: 0.25 },
    ]);
    out.blossom = G.merge([
      { geo: cyl(0.2, 0.3, 2.8, 6), color: 0x6a4a3a, pos: [0, 1.4, 0] },
      { geo: G.blob(1.7, 5), color: 0xf2a8c8, pos: [0, 3.7, 0], jitter: 0.2 },
      { geo: G.blob(1.2, 6), color: 0xf8c0d8, pos: [0.9, 3.2, 0.4], jitter: 0.2 },
      { geo: G.blob(1.3, 7), color: 0xe890b8, pos: [-0.8, 3.3, -0.4], jitter: 0.2 },
    ]);
    out.pine = G.merge([
      { geo: cyl(0.18, 0.3, 2.4, 6), color: trunk, pos: [0, 1.2, 0] },
      { geo: cone(2.1, 3.0, 7), color: 0x2f6e44, pos: [0, 3.2, 0], jitter: 0.2 },
      { geo: cone(1.65, 2.6, 7), color: 0x367a4a, pos: [0, 4.7, 0], jitter: 0.2 },
      { geo: cone(1.1, 2.1, 7), color: 0x3d8650, pos: [0, 6.1, 0], jitter: 0.2 },
    ]);
    out.snowpine = G.merge([
      { geo: cyl(0.18, 0.3, 2.4, 6), color: trunk, pos: [0, 1.2, 0] },
      { geo: cone(2.1, 3.0, 7), color: 0x2f5e4a, pos: [0, 3.2, 0], jitter: 0.2 },
      { geo: cone(1.65, 2.6, 7), color: 0x366a52, pos: [0, 4.7, 0], jitter: 0.2 },
      { geo: cone(1.1, 2.1, 7), color: 0xf0f6ff, pos: [0, 6.1, 0], jitter: 0.08 },
    ]);
    out.giant = G.merge([
      { geo: cyl(0.8, 1.3, 11, 8), color: 0x5a4030, pos: [0, 5.5, 0] },
      { geo: cyl(0.3, 0.5, 4, 5), color: 0x5a4030, pos: [1.6, 8.5, 0], rot: [0, 0, -0.9] },
      { geo: G.blob(4.2, 8), color: 0x2f7a62, pos: [0, 12.5, 0], jitter: 0.25 },
      { geo: G.blob(3.0, 9), color: 0x3a8a6e, pos: [3.2, 10.6, 1], jitter: 0.25 },
      { geo: G.blob(3.2, 10), color: 0x2a6a58, pos: [-2.8, 11.2, -1.2], jitter: 0.25 },
      { geo: G.blob(2.6, 11), color: 0x46a07a, pos: [0.5, 15.2, 0.5], jitter: 0.25 },
    ]);
    const palmParts = [];
    let px = 0, py = 0;
    for (let i = 0; i < 6; i++) { palmParts.push({ geo: cyl(0.2, 0.26, 1.1, 6), color: i % 2 ? 0x9a7a4a : 0x8a6a3a, pos: [px, py + 0.55, 0], rot: [0, 0, -0.08 * i] }); px += 0.09 * i; py += 1.05; }
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * PI * 2;
      palmParts.push({ geo: box(0.7, 0.06, 2.8), color: 0x4a9a3a, pos: [px + Math.cos(a) * 1.2, py - 0.2, Math.sin(a) * 1.2], rot: [0.45, -a + PI / 2, 0], jitter: 0.2 });
    }
    palmParts.push({ geo: ball(0.25, 5, 4), color: 0x5a3a1a, pos: [px + 0.2, py - 0.3, 0.1] });
    out.palm = G.merge(palmParts);
    out.dead = G.merge([
      { geo: cyl(0.15, 0.3, 4, 5), color: 0x3a3030, pos: [0, 2, 0] },
      { geo: cyl(0.06, 0.12, 1.8, 4), color: 0x3a3030, pos: [0.6, 3.2, 0], rot: [0, 0, -0.9] },
      { geo: cyl(0.05, 0.1, 1.4, 4), color: 0x3a3030, pos: [-0.5, 2.8, 0.2], rot: [0.3, 0, 0.9] },
      { geo: cyl(0.05, 0.08, 1.2, 4), color: 0x3a3030, pos: [0.1, 4.0, -0.4], rot: [-0.6, 0, 0.2] },
    ]);
    out.stump = G.merge([
      { geo: cyl(0.3, 0.38, 0.5, 7), color: 0x7a5232, pos: [0, 0.25, 0] },
      { geo: cyl(0.28, 0.28, 0.02, 7), color: 0xd8b07a, pos: [0, 0.51, 0] },
    ]);
    out.rock = G.merge([{ geo: G.rock(1, 1, 7), color: 0x8a8680, jitter: 0.25 }]);
    out.darkrock = G.merge([{ geo: G.rock(1, 1, 9), color: 0x3a3434, jitter: 0.2 }]);
    out.bush = G.merge([
      { geo: G.blob(0.75, 12), color: 0x3f8a36, pos: [0, 0.6, 0], jitter: 0.3 },
      { geo: G.blob(0.55, 13), color: 0x4a9a3e, pos: [0.5, 0.45, 0.2], jitter: 0.3 },
      { geo: G.blob(0.55, 14), color: 0x37802f, pos: [-0.45, 0.45, -0.25], jitter: 0.3 },
    ]);
    const berryParts = [];
    const br = U.rng(55);
    for (let i = 0; i < 9; i++) {
      const a = br() * PI * 2, y = 0.35 + br() * 0.7;
      berryParts.push({ geo: ball(0.1, 5, 4), color: 0x5a3ad8, pos: [Math.cos(a) * 0.72, y, Math.sin(a) * 0.72] });
    }
    out.berries = G.merge(berryParts);
    out.mushroom = G.merge([
      { geo: cyl(0.12, 0.16, 0.5, 6), color: 0xf0e8d8, pos: [0, 0.25, 0] },
      { geo: new THREE.SphereGeometry(0.4, 8, 5, 0, PI * 2, 0, PI / 2), color: 0xd83a3a, pos: [0, 0.45, 0] },
      { geo: ball(0.06, 4, 3), color: 0xffffff, pos: [0.18, 0.75, 0.1] },
      { geo: ball(0.05, 4, 3), color: 0xffffff, pos: [-0.15, 0.7, 0.15] },
      { geo: ball(0.05, 4, 3), color: 0xffffff, pos: [0, 0.8, -0.18] },
      { geo: cyl(0.08, 0.1, 0.3, 6), color: 0xf0e8d8, pos: [0.4, 0.15, 0.2] },
      { geo: new THREE.SphereGeometry(0.22, 7, 4, 0, PI * 2, 0, PI / 2), color: 0xd8503a, pos: [0.4, 0.28, 0.2] },
    ]);
    out.crystal = G.merge([
      { geo: cone(0.35, 2.0, 5), color: 0x7af0ff, pos: [0, 1.0, 0] },
      { geo: cone(0.25, 1.4, 5), color: 0x9ae8ff, pos: [0.45, 0.6, 0.1], rot: [0, 0, -0.4] },
      { geo: cone(0.25, 1.2, 5), color: 0x6ad8ff, pos: [-0.4, 0.5, -0.2], rot: [0.2, 0, 0.45] },
      { geo: cone(0.2, 0.9, 5), color: 0xb0f6ff, pos: [0.1, 0.4, 0.45], rot: [0.5, 0, 0] },
    ]);
    // grass tuft
    const tri = (h, a) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-0.08, 0, 0, 0.08, 0, 0, Math.sin(a) * 0.1, h, Math.cos(a) * 0.1], 3)); g.computeVertexNormals(); return g; };
    const grassParts = [];
    for (let i = 0; i < 5; i++) grassParts.push({ geo: tri(0.45 + (i % 3) * 0.15, i), color: i % 2 ? 0x5aa83a : 0x6ab844, pos: [Math.cos(i * 1.3) * 0.15, 0, Math.sin(i * 1.3) * 0.15], rot: [0, i * 1.1, 0] });
    out.grass = G.merge(grassParts);
    const gn = out.grass.attributes.normal.array; // grass looks lit from above
    for (let i = 0; i < gn.length; i += 3) { gn[i] = 0; gn[i + 1] = 1; gn[i + 2] = 0; }
    // flowers
    const fl = [];
    const fcols = [0xffe04a, 0xff7ab0, 0xffffff, 0xb07aff];
    for (let i = 0; i < 4; i++) {
      const x = Math.cos(i * 1.7) * 0.25, z = Math.sin(i * 1.7) * 0.25;
      fl.push({ geo: cyl(0.015, 0.015, 0.35, 3), color: 0x3a8a2a, pos: [x, 0.17, z] });
      fl.push({ geo: new THREE.IcosahedronGeometry(0.08, 0), color: fcols[i], pos: [x, 0.36, z] });
    }
    out.flowers = G.merge(fl);
    return out;
  }

  // ------------------------------------------------------------
  //  BUILDINGS AND THINGS IN THE WORLD
  // ------------------------------------------------------------
  let woodMat, stoneMat, thatchMat;
  function materials() {
    if (!woodMat) {
      woodMat = new THREE.MeshStandardMaterial({ map: DL.Tex.T.planks, roughness: 0.9 });
      stoneMat = new THREE.MeshStandardMaterial({ map: DL.Tex.T.stone, roughness: 0.95 });
      thatchMat = new THREE.MeshStandardMaterial({ map: DL.Tex.T.thatch, bumpMap: DL.Tex.T.thatch, bumpScale: 2, roughness: 1 });
    }
    return { woodMat, stoneMat, thatchMat };
  }

  // a cottage. Returns the group and the walls (so you can't walk through them)
  function cottage(o = {}) {
    o = Object.assign({ w: 7, d: 6, h: 3.2, wall: 0xf0e6d0, roof: 'thatch', door: 0x7a4a2a }, o);
    const { woodMat, stoneMat, thatchMat } = materials();
    const g = new THREE.Group();
    const wallMat = mat(o.wall, { flatShading: false });
    g.add(mesh(box(o.w + 0.4, 1.2, o.d + 0.4), stoneMat, 0, -0.3, 0));
    const walls = mesh(box(o.w, o.h, o.d), wallMat, 0, o.h / 2 + 0.3, 0); g.add(walls);
    // wooden beams
    const beam = mat(0x6a4224);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(box(0.3, o.h, 0.3), beam, sx * o.w / 2, o.h / 2 + 0.3, sz * o.d / 2));
    g.add(mesh(box(o.w + 0.1, 0.25, 0.3), beam, 0, o.h + 0.2, o.d / 2));
    g.add(mesh(box(o.w + 0.1, 0.25, 0.3), beam, 0, o.h + 0.2, -o.d / 2));
    // roof: a triangle prism
    const rh = o.w * 0.45;
    const shape = new THREE.Shape();
    shape.moveTo(-o.w / 2 - 0.7, 0); shape.lineTo(0, rh); shape.lineTo(o.w / 2 + 0.7, 0); shape.lineTo(-o.w / 2 - 0.7, 0);
    const rg = new THREE.ExtrudeGeometry(shape, { depth: o.d + 1.2, bevelEnabled: false });
    rg.translate(0, 0, -(o.d + 1.2) / 2);
    const roofMat = o.roof === 'thatch' ? thatchMat : mat(o.roof);
    const roof = mesh(rg, roofMat, 0, o.h + 0.3, 0); g.add(roof);
    // the two triangle ends of the roof
    const gableShape = new THREE.Shape(); gableShape.moveTo(-o.w / 2, 0); gableShape.lineTo(0, rh - 0.5); gableShape.lineTo(o.w / 2, 0);
    for (const s of [-1, 1]) { const gm = mesh(new THREE.ShapeGeometry(gableShape), wallMat, 0, o.h + 0.3, s * (o.d / 2 + 0.01)); if (s < 0) gm.rotation.y = PI; g.add(gm); }
    // door and windows (on the +z side)
    g.add(mesh(box(1.2, 2.1, 0.12), mat(o.door), 0, 1.35, o.d / 2 + 0.02));
    g.add(mesh(ball(0.06, 5, 4), mat(0xd8b040), 0.4, 1.35, o.d / 2 + 0.1));
    const glass = new THREE.MeshStandardMaterial({ color: 0xffd890, emissive: 0xffa040, emissiveIntensity: 0.0, roughness: 0.3 });
    g.userData.glass = glass;
    for (const s of [-1, 1]) {
      g.add(mesh(box(1.0, 1.0, 0.1), glass, s * o.w * 0.3, 2.0, o.d / 2 + 0.02));
      g.add(mesh(box(1.2, 0.12, 0.2), beam, s * o.w * 0.3, 1.45, o.d / 2 + 0.06));
      g.add(mesh(box(0.1, 1.0, 0.04), beam, s * o.w * 0.3, 2.0, o.d / 2 + 0.08));
      g.add(mesh(box(1.0, 1.0, 0.1), glass, s * (o.w / 2 + 0.02), 2.0, 0).rotateY(PI / 2));
      // flower box
      g.add(mesh(box(1.1, 0.25, 0.3), mat(0x8a5a30), s * o.w * 0.3, 1.3, o.d / 2 + 0.2));
      for (let k = 0; k < 4; k++) g.add(mesh(ball(0.1, 4, 3), mat(U.pick([0xff5a7a, 0xffe04a, 0xffffff])), s * o.w * 0.3 - 0.4 + k * 0.27, 1.5, o.d / 2 + 0.2, false));
    }
    // chimney
    g.add(mesh(box(0.8, 2.5, 0.8), stoneMat, o.w * 0.25, o.h + rh * 0.6, -o.d * 0.2));
    g.userData.chimney = new THREE.Vector3(o.w * 0.25, o.h + rh * 0.6 + 1.3, -o.d * 0.2);
    g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    g.userData.size = [o.w, o.d];
    return g;
  }

  function campfire() {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * PI * 2;
      const s = mesh(new THREE.IcosahedronGeometry(0.22, 0), mat(0x8a8680), Math.cos(a) * 0.65, 0.1, Math.sin(a) * 0.65); g.add(s);
    }
    for (let i = 0; i < 4; i++) {
      const log = mesh(cyl(0.08, 0.1, 1.0, 5), mat(0x6a4224), 0, 0.25, 0);
      log.rotation.set(0.9, i * PI / 2, 0); log.position.set(Math.sin(i * PI / 2) * 0.18, 0.25, Math.cos(i * PI / 2) * 0.18); g.add(log);
    }
    const flame = new THREE.Group(); flame.position.y = 0.3; g.add(flame);
    const fm1 = new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.9 });
    const fm2 = new THREE.MeshBasicMaterial({ color: 0xffe060, transparent: true, opacity: 0.95 });
    flame.add(new THREE.Mesh(cone(0.32, 0.9, 6), fm1).translateY(0.4));
    flame.add(new THREE.Mesh(cone(0.18, 0.6, 5), fm2).translateY(0.3));
    g.userData.flame = flame;
    return g;
  }
  function nest() {
    const g = new THREE.Group();
    const ring = mesh(new THREE.TorusGeometry(1.9, 0.55, 6, 14), mat(0x8a6a3a), 0, 0.35, 0); ring.rotation.x = PI / 2; ring.scale.z = 0.9; g.add(ring);
    g.add(mesh(cyl(1.9, 1.7, 0.25, 14), mat(0xd8b860), 0, 0.15, 0));
    const r = U.rng(3);
    for (let i = 0; i < 26; i++) {
      const a = r() * PI * 2;
      const st = mesh(cyl(0.04, 0.05, 1.4, 4), mat(0x6a4a2a), Math.cos(a) * 1.9, 0.45 + r() * 0.3, Math.sin(a) * 1.9);
      st.rotation.set(r() * 3, r() * 3, r() * 3); g.add(st);
    }
    return g;
  }
  function chest(color = 0x8a5a2c) {
    const g = new THREE.Group();
    const wood = mat(color), band = mat(0xd8b040, { metalness: 0.6, roughness: 0.35 });
    g.add(mesh(box(1.0, 0.55, 0.65), wood, 0, 0.28, 0));
    const lid = new THREE.Group(); lid.position.set(0, 0.55, -0.32); g.add(lid);
    const top = mesh(new THREE.CylinderGeometry(0.33, 0.33, 1.0, 8, 1, false, 0, PI), wood, 0, 0, 0.32); top.rotation.z = PI / 2; lid.add(top);
    for (const s of [-0.35, 0.35]) { g.add(mesh(box(0.08, 0.57, 0.67), band, s, 0.28, 0)); const b = mesh(new THREE.CylinderGeometry(0.345, 0.345, 0.08, 8, 1, false, 0, PI), band, s, 0, 0.32); b.rotation.z = PI / 2; lid.add(b); }
    g.add(mesh(box(0.16, 0.2, 0.06), band, 0, 0.5, 0.34));
    g.userData.lid = lid;
    return g;
  }
  function lantern() {
    const g = new THREE.Group();
    g.add(mesh(cyl(0.06, 0.08, 2.2, 5), mat(0x3a2a1a), 0, 1.1, 0));
    g.add(mesh(box(0.5, 0.06, 0.06), mat(0x3a2a1a), 0.2, 2.15, 0));
    const glow = new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffa040, emissiveIntensity: 0.4 });
    const lamp = mesh(box(0.26, 0.34, 0.26), glow, 0.42, 1.88, 0, false); g.add(lamp);
    g.add(mesh(cone(0.22, 0.16, 4), mat(0x2a2a2a), 0.42, 2.12, 0).rotateY(PI / 4));
    g.userData.glow = glow;
    return g;
  }
  function brazier() {
    const g = new THREE.Group();
    const s = materials().stoneMat;
    g.add(mesh(cyl(0.5, 0.7, 1.6, 8), s, 0, 0.8, 0));
    g.add(mesh(cyl(1.0, 0.5, 0.5, 10), s, 0, 1.85, 0));
    g.add(mesh(cyl(0.85, 0.85, 0.1, 10), mat(0x2a2020), 0, 2.08, 0));
    const fire = new THREE.Group(); fire.position.y = 2.1; fire.visible = false; g.add(fire);
    fire.add(new THREE.Mesh(cone(0.7, 1.6, 7), new THREE.MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0.85 })).translateY(0.7));
    fire.add(new THREE.Mesh(cone(0.4, 1.0, 6), new THREE.MeshBasicMaterial({ color: 0xffe060 })).translateY(0.45));
    g.userData.flame = fire;
    return g;
  }
  // a stone with a picture carved in it
  function storyStone(n) {
    const g = new THREE.Group();
    const tex = U.tex(U.canvas(128, 192, (c, w, h) => {
      c.fillStyle = '#8a8478'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; c.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
      c.strokeStyle = '#4a4438'; c.lineWidth = 4; c.lineCap = 'round';
      c.font = 'bold 26px serif'; c.fillStyle = '#4a4438'; c.textAlign = 'center';
      c.fillText(['I', 'II', 'III', 'IV'][n], w / 2, 30);
      // a simple carved dragon
      c.beginPath();
      c.moveTo(20, 120); c.quadraticCurveTo(50, 90, 70, 110); c.quadraticCurveTo(90, 130, 110, 100);
      c.moveTo(60, 105); c.lineTo(40, 60); c.lineTo(75, 95);
      c.moveTo(70, 110); c.lineTo(95, 70); c.lineTo(85, 105);
      c.stroke();
      if (n === 0) { c.beginPath(); c.arc(64, 160, 12, 0, 7); c.stroke(); } // egg
      if (n === 1) { c.beginPath(); c.moveTo(30, 170); c.lineTo(50, 150); c.lineTo(70, 170); c.lineTo(90, 150); c.lineTo(110, 170); c.stroke(); } // storm
      if (n === 2) { c.beginPath(); c.moveTo(40, 175); c.lineTo(64, 140); c.lineTo(88, 175); c.closePath(); c.stroke(); c.beginPath(); c.arc(64, 160, 5, 0, 7); c.stroke(); } // volcano
      if (n === 3) { for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(30 + k * 23, 160, 7, 0, 7); c.stroke(); } } // fires
    }));
    const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
    const side = materials().stoneMat;
    const slab = new THREE.Mesh(box(1.4, 2.4, 0.4), [side, side, side, side, m, side]);
    slab.position.y = 1.2; slab.castShadow = true; g.add(slab);
    return g;
  }
  function column(h, broken) {
    const g = new THREE.Group();
    const s = materials().stoneMat;
    g.add(mesh(box(1.4, 0.4, 1.4), s, 0, 0.2, 0));
    g.add(mesh(cyl(0.5, 0.55, h, 10), s, 0, h / 2 + 0.4, 0));
    if (!broken) g.add(mesh(box(1.3, 0.4, 1.3), s, 0, h + 0.6, 0));
    else g.add(mesh(cone(0.5, 0.6, 6), s, 0, h + 0.6, 0).rotateZ(0.4));
    return g;
  }
  function dock(len) {
    const g = new THREE.Group();
    const { woodMat } = materials();
    g.add(mesh(box(2.6, 0.2, len), woodMat, 0, 0, len / 2));
    for (let z = 0; z <= len; z += 3) for (const s of [-1.2, 1.2]) g.add(mesh(cyl(0.14, 0.14, 4, 6), mat(0x5a3a1e), s, -1.6, z));
    return g;
  }
  function boat() {
    const g = new THREE.Group();
    const hullShape = [];
    for (let i = 0; i <= 8; i++) { const a = i / 8 * PI; hullShape.push(new THREE.Vector2(Math.sin(a) * 0.8, -Math.cos(a) * 2.2)); }
    const hull = mesh(new THREE.LatheGeometry(hullShape, 10, 0, PI), mat(0x8a5a2c, { side: THREE.DoubleSide }), 0, 0.5, 0);
    hull.rotation.set(PI / 2, 0, 0); hull.scale.set(1, 1, 0.55); g.add(hull);
    g.add(mesh(box(1.4, 0.08, 0.3), mat(0x6a4224), 0, 0.42, 0));
    g.add(mesh(cyl(0.05, 0.05, 2.6, 4), mat(0x6a4224), 0.4, 0.55, 0.2).rotateZ(1.2));
    return g;
  }
  function heartGem() {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: 0xff5a2a, emissive: 0xff3a10, emissiveIntensity: 1.2, roughness: 0.2, flatShading: true });
    const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), m); o.scale.y = 1.4; o.position.y = 1.3; g.add(o);
    g.userData.gem = o;
    return g;
  }
  function seagull() {
    const g = new THREE.Group();
    const w = mat(0xf4f4f4), gr = mat(0x8a96a0);
    const bodyM = mesh(ball(0.15, 6, 4), w); bodyM.scale.set(1, 1, 2.2); g.add(bodyM);
    g.add(mesh(cone(0.04, 0.15, 4), mat(0xf0b030), 0, 0, 0.38).rotateX(PI / 2));
    const wings = [];
    for (const s of [-1, 1]) {
      const wg = new THREE.Group(); g.add(wg);
      wg.add(mesh(box(0.7, 0.03, 0.22), gr, s * 0.35, 0, 0, false));
      wg.add(mesh(box(0.25, 0.03, 0.15), mat(0x303030), s * 0.78, 0, -0.02, false));
      wings.push({ g: wg, s });
    }
    g.userData.wings = wings;
    return g;
  }
  function butterfly(color) {
    const g = new THREE.Group();
    const m = mat(color, { side: THREE.DoubleSide, flatShading: false });
    const wings = [];
    for (const s of [-1, 1]) {
      const wg = new THREE.Group(); g.add(wg);
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.14, 6), m); p.rotation.x = -PI / 2; p.position.x = s * 0.13; wg.add(p);
      wings.push({ g: wg, s });
    }
    g.add(mesh(box(0.03, 0.03, 0.2), mat(0x202020), 0, 0, 0, false));
    g.userData.wings = wings;
    return g;
  }

  return { mat, vcMat, mesh, human, dragon, egg, natureGeos, cottage, campfire, nest, chest, lantern, brazier, storyStone, column, dock, boat, heartGem, seagull, butterfly, materials, DRAGON_COLORS, SADDLES, box, ball, cyl, cone };
})();
