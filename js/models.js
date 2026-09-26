// ============================================================
//  LAB 13 — 3D MODELS
//  Every model is built from simple shapes: boxes, cylinders,
//  spheres and cones, glued together into groups.
// ============================================================
window.LAB = window.LAB || {};

LAB.Models = (function () {
  const U = LAB.U, T = LAB.Tex;

  // ---------- materials (shared so the game stays fast) ----------
  const mats = {};
  function mat(key, make) { return mats[key] || (mats[key] = make()); }
  const std = (key, o) => mat(key, () => new THREE.MeshStandardMaterial(o));
  const M = {
    metal: () => std('metal', { color: 0x6d7378, roughness: 0.45, metalness: 0.75 }),
    darkMetal: () => std('darkMetal', { color: 0x2a2d31, roughness: 0.6, metalness: 0.6 }),
    steel: () => std('steel', { color: 0xa9b0b5, roughness: 0.3, metalness: 0.85 }),
    rust: () => std('rust', { color: 0x5b3a22, roughness: 0.95, metalness: 0.3 }),
    rubber: () => std('rubber', { color: 0x151515, roughness: 0.9 }),
    white: () => std('white', { color: 0xc8c8c0, roughness: 0.7 }),
    plastic: () => std('plastic', { color: 0x3a3f44, roughness: 0.5 }),
    yellow: () => std('yellow', { color: 0xb89a18, roughness: 0.6 }),
    glass: () => std('glass', { color: 0x9fd8ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.16, depthWrite: false }),
    glassCrack: () => std('glassCrack', { color: 0xd6f2ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide }),
    greenLiquid: () => std('greenLiquid', { color: 0x3a9a30, emissive: 0x2a8a18, emissiveIntensity: 0.9, transparent: true, opacity: 0.5, roughness: 0.1, depthWrite: false }),
    blueLiquid: () => std('blueLiquid', { color: 0x3aa0b0, emissive: 0x106a80, emissiveIntensity: 0.8, transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false }),
    goo: () => std('goo', { color: 0x6aa020, emissive: 0x3a7a08, emissiveIntensity: 0.7, roughness: 0.15 }),
    blood: () => std('blood', { color: 0x4a0000, roughness: 0.2, metalness: 0.1 }),
    bloodBright: () => std('bloodBright', { color: 0x8a0606, roughness: 0.25, emissive: 0x200000 }),
    flesh: () => std('flesh', { map: T.flesh(), color: 0xffffff, roughness: 0.35 }),
    fleshWet: () => std('fleshWet', { color: 0x7a1822, roughness: 0.15, metalness: 0.1 }),
    skinHuman: () => std('skinHuman', { color: 0xb88c72, roughness: 0.7 }),
    skinDead: () => std('skinDead', { color: 0x8c8a7c, roughness: 0.8 }),
    coat: () => std('coat', { map: T.labCoat(), roughness: 0.85 }),
    coatClean: () => std('coatClean', { color: 0xd8d8d0, roughness: 0.85 }),
    pants: () => std('pants', { color: 0x2c3036, roughness: 0.9 }),
    hazmat: () => std('hazmat', { color: 0xd8641a, roughness: 0.55 }),
    hazmatDark: () => std('hazmatDark', { color: 0x2b2b2b, roughness: 0.5, metalness: 0.3 }),
    guard: () => std('guard', { color: 0x2d4a78, roughness: 0.75 }),
    guardDead: () => std('guardDead', { color: 0x3c4436, roughness: 0.85 }),
    vest: () => std('vest', { color: 0x1c2026, roughness: 0.7 }),
    visor: () => std('visor', { color: 0x10202a, roughness: 0.05, metalness: 0.9, emissive: 0x05202a }),
    alien: () => std('alien', { map: T.alienSkin('pale'), roughness: 0.3, metalness: 0.05 }),
    alienDark: () => std('alienDark', { map: T.alienSkin('dark'), roughness: 0.25, metalness: 0.1 }),
    alienRed: () => std('alienRed', { map: T.alienSkin('red'), roughness: 0.3 }),
    teeth: () => std('teeth', { color: 0xe8dcb0, roughness: 0.3 }),
    mouth: () => std('mouth', { color: 0x2a0306, roughness: 0.2, emissive: 0x100000 }),
    eyeYellow: () => std('eyeYellow', { color: 0xffe066, emissive: 0xffc400, emissiveIntensity: 2.5 }),
    eyeRed: () => std('eyeRed', { color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 3 }),
    eyeBlack: () => std('eyeBlack', { color: 0x020202, roughness: 0.02, metalness: 0.6 }),
    crate: () => std('crate', { map: T.crate(), roughness: 0.85 }),
    barrel: () => std('barrel', { map: T.barrel(), roughness: 0.6, metalness: 0.4 }),
    paper: () => std('paper', { map: T.paper(), roughness: 0.9, side: THREE.DoubleSide }),
    serverFront: () => std('serverFront', { map: T.serverFront(), roughness: 0.6, metalness: 0.4 }),
    ledGreen: () => std('ledGreen', { color: 0x30ff60, emissive: 0x20ff40, emissiveIntensity: 2 }),
    ledRed: () => std('ledRed', { color: 0xff3030, emissive: 0xff1010, emissiveIntensity: 2 }),
    ledBlue: () => std('ledBlue', { color: 0x40a0ff, emissive: 0x2080ff, emissiveIntensity: 2 }),
    ledOrange: () => std('ledOrange', { color: 0xffa020, emissive: 0xff8000, emissiveIntensity: 2 }),
    lampOff: () => std('lampOff', { color: 0x333333, roughness: 0.3 }),
    sheet: () => std('sheet', { color: 0xb8b8b0, roughness: 0.95 }),
    sheetBloody: () => std('sheetBloody', { map: T.labCoat(), roughness: 0.95 }),
    chair: () => std('chair', { color: 0x1d2024, roughness: 0.7 }),
    grate: () => std('grate', { map: T.grate(), roughness: 0.7, metalness: 0.6 }),
    cable: () => std('cable', { color: 0x111111, roughness: 0.8 }),
    hazardStripe: () => std('hazard', { map: T.sign('', '#c8a818'), roughness: 0.6 }),
  };
  const screenMat = (i) => mat('screen' + i, () => new THREE.MeshStandardMaterial({ map: T.screen(i), emissive: 0xffffff, emissiveMap: T.screen(i), emissiveIntensity: 1.1, roughness: 0.2 }));
  const signMat = (text, bg, fg) => mat('sign' + text + bg, () => new THREE.MeshStandardMaterial({ map: T.sign(text, bg, fg), roughness: 0.6, emissive: 0x222222, emissiveMap: T.sign(text, bg, fg), emissiveIntensity: 0.3 }));

  // ---------- shape helpers ----------
  function add(parent, geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const box = (p, w, h, d, m, x, y, z, rx, ry, rz) => add(p, new THREE.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz);
  const cyl = (p, rt, rb, h, m, x, y, z, rx, ry, rz, seg = 14) => add(p, new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, rx, ry, rz);
  const sph = (p, r, m, x, y, z, sx = 1, sy = 1, sz = 1, seg = 14) => { const s = add(p, new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.75 | 0)), m, x, y, z); s.scale.set(sx, sy, sz); return s; };
  const cone = (p, r, h, m, x, y, z, rx, ry, rz, seg = 8) => add(p, new THREE.ConeGeometry(r, h, seg), m, x, y, z, rx, ry, rz);
  const pivot = (p, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };

  // a tube that goes from point a to point b
  function tube(p, a, b, r, m, seg = 8) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mesh = add(p, new THREE.CylinderGeometry(r, r, len, seg), m);
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return mesh;
  }

  // a ring of pointy teeth
  function teethRing(p, r, n, len, m, y = 0, pointDown = false, tilt = 0.3) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const t = cone(p, len * 0.22, len * U.rand(0.7, 1.3), m, Math.cos(a) * r, y, Math.sin(a) * r);
      t.rotation.set(pointDown ? Math.PI : 0, 0, 0);
      t.rotateOnWorldAxis(new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)), (pointDown ? -1 : 1) * tilt);
    }
  }

  // =====================================================
  //  PEOPLE
  // =====================================================
  // style: 'hazmat' (player 1), 'guard' (player 2), 'coat' (scientist), 'deadcoat', 'deadguard'
  function human(style) {
    const g = new THREE.Group();
    const parts = {};
    const dead = style.startsWith('dead');
    const suit = style.includes('hazmat') ? M.hazmat() : style === 'deadguard' ? M.guardDead() : style.includes('guard') ? M.guard() : (dead ? M.coat() : M.coatClean());
    const legsMat = style.includes('hazmat') ? M.hazmat() : M.pants();
    const skin = dead ? M.skinDead() : M.skinHuman();

    const body = pivot(g, 0, 0, 0);
    parts.body = body;
    const cap = (p, r, len, m, x, y, z) => add(p, new THREE.CapsuleGeometry(r, len, 4, 10), m, x, y, z);
    // torso (rounded, wider at the shoulders)
    const torso = pivot(body, 0, 0.95, 0);
    parts.torso = torso;
    const chest = add(torso, new THREE.CylinderGeometry(0.235, 0.19, 0.6, 12), suit, 0, 0.32, 0);
    chest.scale.z = 0.62;
    sph(torso, 0.2, suit, 0, 0.02, 0, 1, 0.6, 0.7); // hips
    add(torso, new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12), M.rubber(), 0, 0.03, 0).scale.z = 0.72; // belt
    for (const x of [-0.24, 0.24]) sph(torso, 0.1, suit, x, 0.56, 0, 1, 0.8, 1); // shoulders
    if (style.includes('hazmat')) {
      box(torso, 0.3, 0.3, 0.05, M.hazmatDark(), 0, 0.38, 0.13); // chest plate
      box(torso, 0.1, 0.1, 0.02, M.ledOrange(), 0, 0.42, 0.16);
      box(torso, 0.32, 0.44, 0.14, M.hazmatDark(), 0, 0.34, -0.18); // air tank pack
      cyl(torso, 0.07, 0.07, 0.42, M.steel(), -0.09, 0.36, -0.27);
      cyl(torso, 0.07, 0.07, 0.42, M.steel(), 0.09, 0.36, -0.27);
      tube(torso, new THREE.Vector3(0.09, 0.58, -0.27), new THREE.Vector3(0.1, 0.66, 0.05), 0.02, M.rubber(), 5);
    } else if (style.includes('guard')) {
      const vest = add(torso, new THREE.CylinderGeometry(0.245, 0.215, 0.44, 12), M.vest(), 0, 0.36, 0);
      vest.scale.z = 0.66;
      box(torso, 0.1, 0.06, 0.02, M.yellow(), 0.1, 0.5, 0.155); // badge
      box(torso, 0.08, 0.14, 0.05, M.rubber(), -0.13, 0.44, 0.15); // radio
      box(torso, 0.14, 0.12, 0.1, M.rubber(), 0.18, 0.02, 0.08); // holster
    } else {
      box(torso, 0.08, 0.12, 0.02, M.white(), 0.12, 0.5, 0.14); // ID card
      const coatB = add(torso, new THREE.CylinderGeometry(0.22, 0.26, 0.4, 12, 1, true), suit, 0, -0.12, 0);
      coatB.scale.z = 0.7;
      coatB.material = suit;
    }
    // head
    const neck = pivot(torso, 0, 0.64, 0);
    parts.head = neck;
    cyl(neck, 0.055, 0.065, 0.1, skin, 0, 0.02, 0);
    sph(neck, 0.125, skin, 0, 0.17, 0.01, 0.95, 1.12, 1.05);
    sph(neck, 0.03, skin, 0, 0.16, 0.13, 0.8, 1, 1, 6); // nose
    if (style.includes('hazmat')) {
      sph(neck, 0.17, M.hazmat(), 0, 0.18, -0.01, 1, 1.05, 1.05); // helmet
      sph(neck, 0.135, M.visor(), 0, 0.18, 0.07, 1, 0.8, 0.85); // visor
      cyl(neck, 0.035, 0.035, 0.12, M.hazmatDark(), 0.1, 0.08, 0.12, 1.2, 0, 0);
    } else if (style.includes('guard')) {
      sph(neck, 0.155, suit, 0, 0.23, -0.01, 1, 0.7, 1.08); // helmet
      box(neck, 0.26, 0.05, 0.08, M.visor(), 0, 0.2, 0.13); // visor strip
      box(neck, 0.02, 0.1, 0.02, M.rubber(), 0.14, 0.1, 0); // strap
    } else {
      sph(neck, 0.13, M.rubber(), 0, 0.23, -0.02, 1, 0.6, 1.05); // hair
      box(neck, 0.18, 0.03, 0.02, M.rubber(), 0, 0.19, 0.125); // glasses
    }
    // arms
    const glove = style.includes('hazmat') ? M.hazmatDark() : skin;
    for (const side of [-1, 1]) {
      const sh = pivot(torso, side * 0.27, 0.55, 0);
      cap(sh, 0.062, 0.2, suit, 0, -0.16, 0);
      const el = pivot(sh, 0, -0.33, 0);
      cap(el, 0.052, 0.2, suit, 0, -0.14, 0);
      sph(el, 0.055, glove, 0, -0.33, 0.01, 0.8, 1.2, 1);
      parts[side < 0 ? 'armL' : 'armR'] = sh;
      parts[side < 0 ? 'elbowL' : 'elbowR'] = el;
      if (side > 0 && !dead) { // flashlight in right hand
        const fl = pivot(el, 0, -0.36, 0.06);
        cyl(fl, 0.03, 0.03, 0.2, M.darkMetal(), 0, 0, 0.06, Math.PI / 2, 0, 0);
        cyl(fl, 0.045, 0.03, 0.05, M.darkMetal(), 0, 0, 0.17, Math.PI / 2, 0, 0);
        const lens = cyl(fl, 0.04, 0.04, 0.01, M.eyeYellow(), 0, 0, 0.2, Math.PI / 2, 0, 0);
        lens.userData.keep = true;
        parts.lens = lens;
      }
    }
    // legs
    for (const side of [-1, 1]) {
      const hip = pivot(body, side * 0.11, 0.92, 0);
      cap(hip, 0.085, 0.3, legsMat, 0, -0.23, 0);
      const knee = pivot(hip, 0, -0.46, 0);
      cap(knee, 0.07, 0.28, legsMat, 0, -0.2, 0);
      box(knee, 0.15, 0.1, 0.28, M.rubber(), 0, -0.41, 0.05); // boot
      parts[side < 0 ? 'legL' : 'legR'] = hip;
      parts[side < 0 ? 'kneeL' : 'kneeR'] = knee;
    }
    g.userData.parts = parts;
    return g;
  }

  // walk / idle animation for a human
  function animateHuman(model, phase, speed, downed) {
    const p = model.userData.parts;
    const s = Math.sin(phase), amp = Math.min(1, speed / 3) * 0.6;
    p.legL.rotation.x = s * amp; p.legR.rotation.x = -s * amp;
    p.kneeL.rotation.x = Math.max(0, -s) * amp * 1.2; p.kneeR.rotation.x = Math.max(0, s) * amp * 1.2;
    p.armL.rotation.x = -s * amp * 0.8;
    p.armR.rotation.x = -1.2; // holding the flashlight forward
    p.elbowR.rotation.x = -0.2;
    p.body.position.y = Math.abs(Math.cos(phase)) * amp * 0.06;
    if (downed) {
      p.body.rotation.x = -1.35; p.body.position.y = 0.22; p.body.position.z = -0.6;
      p.armL.rotation.x = -2.5 + Math.sin(phase * 0.5) * 0.3;
    } else { p.body.rotation.x = 0; p.body.position.z = 0; }
  }

  // a dead scientist lying on the floor (with random pose)
  function corpse(style, rnd = Math.random) {
    const h = human(style);
    const p = h.userData.parts;
    p.body.rotation.x = -Math.PI / 2;
    p.body.position.y = 0.14;
    p.body.position.z = -0.45;
    p.armL.rotation.z = -0.4 - rnd() * 1.4; p.armR.rotation.z = 0.4 + rnd() * 1.4;
    p.armL.rotation.x = rnd() - 0.5; p.elbowL.rotation.x = -rnd();
    p.legL.rotation.z = -rnd() * 0.5; p.legR.rotation.z = rnd() * 0.5;
    p.kneeR.rotation.x = rnd() * 0.8;
    p.head.rotation.y = (rnd() - 0.5) * 1.5;
    p.head.rotation.z = (rnd() - 0.5) * 0.6;
    return h;
  }

  // ---------- FIRST PERSON HANDS ----------
  // A gloved hand wrapped around a stick that points along -z (like holding a flashlight).
  // side = +1 for the right hand (palm on the right), -1 for the left hand.
  function gripHand(parent, glove, suit, side, r) {
    const h = pivot(parent, 0, 0, 0);
    const R = r + 0.011;
    // back of the hand / palm
    sph(h, 0.034, glove, side * (r + 0.02), 0.004, 0.012, 0.75, 1.15, 1.45, 12);
    // four fingers curling around the grip (torus arcs) with finger tips and knuckles
    for (let f = 0; f < 4; f++) {
      const z = -0.03 + f * 0.021;
      const fr = 0.0105 - f * 0.0007;
      const arc = 3.5 - f * 0.08;
      const ring = add(h, new THREE.TorusGeometry(R, fr, 6, 14, arc), glove, 0, 0, z);
      // start at the palm side and wrap under the grip
      const start = side > 0 ? 0.35 - arc : Math.PI - 0.35;
      ring.rotation.z = start;
      const tip = side > 0 ? start : start + arc;
      sph(h, fr * 1.05, glove, Math.cos(tip) * R, Math.sin(tip) * R, z, 1, 1, 1, 8); // finger tip
      sph(h, fr * 1.25, glove, side * (R + 0.004), -0.006, z, 1, 1, 1, 8); // knuckle
    }
    // thumb lying along the top of the grip
    const th = pivot(h, side * 0.012, R + 0.004, 0.004);
    th.rotation.set(0, -side * 0.35, 0);
    add(th, new THREE.CapsuleGeometry(0.0105, 0.036, 4, 8), glove, 0, 0, -0.02).rotation.x = Math.PI / 2;
    sph(th, 0.013, glove, side * 0.004, -0.004, 0.012, 1.1, 1, 1.3, 8);
    // wrist, glove cuff and sleeve going back toward you
    cyl(h, 0.03, 0.028, 0.06, glove, side * 0.02, -0.004, 0.075, Math.PI / 2, 0, 0, 12);
    add(h, new THREE.TorusGeometry(0.032, 0.007, 6, 16), glove, side * 0.02, -0.004, 0.105);
    add(h, new THREE.CapsuleGeometry(0.044, 0.26, 4, 12), suit, side * 0.024, -0.008, 0.27).rotation.x = Math.PI / 2;
    add(h, new THREE.TorusGeometry(0.046, 0.008, 6, 18), suit, side * 0.024, -0.008, 0.13);
    for (let k = 0; k < 3; k++) add(h, new THREE.TorusGeometry(0.045, 0.003, 4, 18), M.darkMetal(), side * 0.024, -0.008, 0.18 + k * 0.05); // fabric folds
    return h;
  }

  // what you see in your own hands (first person)
  function viewModel(style) {
    const g = new THREE.Group();
    const suit = style === 'hazmat' ? M.hazmat() : M.guard();
    const glove = style === 'hazmat'
      ? mat('gloveHaz', () => new THREE.MeshStandardMaterial({ color: 0x2a2c2a, roughness: 0.55, metalness: 0.05 }))
      : mat('gloveGuard', () => new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 }));
    const alu = mat('vmAlu', () => new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.35, metalness: 0.8 }));
    const chrome = mat('vmChrome', () => new THREE.MeshStandardMaterial({ color: 0xc8ccd0, roughness: 0.15, metalness: 1 }));
    const steelW = mat('vmSteel', () => new THREE.MeshStandardMaterial({ color: 0x9aa1a8, roughness: 0.35, metalness: 0.75 }));

    // ---- RIGHT HAND + FLASHLIGHT ----
    const right = pivot(g, 0.16, -0.19, -0.38);
    const fl = pivot(right, 0, 0, 0);
    cyl(fl, 0.021, 0.021, 0.17, alu, 0, 0, -0.025, Math.PI / 2, 0, 0, 16); // body
    for (let k = 0; k < 7; k++) add(fl, new THREE.TorusGeometry(0.0215, 0.0022, 4, 16), M.darkMetal(), 0, 0, 0.035 - k * 0.012); // knurled grip
    cyl(fl, 0.022, 0.022, 0.018, M.rubber(), 0, 0, 0.066, Math.PI / 2, 0, 0, 16); // tail cap
    cyl(fl, 0.01, 0.012, 0.008, M.rubber(), 0, 0, 0.078, Math.PI / 2, 0, 0, 10); // click button
    cyl(fl, 0.031, 0.022, 0.045, alu, 0, 0, -0.13, Math.PI / 2, 0, 0, 18); // flared head
    add(fl, new THREE.TorusGeometry(0.031, 0.004, 6, 20), chrome, 0, 0, -0.153); // bezel
    const refl = add(fl, new THREE.CylinderGeometry(0.027, 0.012, 0.012, 16, 1, true), chrome, 0, 0, -0.148);
    refl.rotation.x = Math.PI / 2;
    const lens = cyl(fl, 0.027, 0.027, 0.003, M.eyeYellow(), 0, 0, -0.154, Math.PI / 2, 0, 0, 18);
    lens.userData.keep = true;
    box(fl, 0.006, 0.006, 0.05, M.rubber(), 0.0, 0.022, 0.0); // pocket clip
    gripHand(right, glove, suit, 1, 0.021);

    // ---- LEFT HAND + WRENCH ----
    const left = pivot(g, -0.18, -0.23, -0.4);
    const hand = pivot(left, 0, 0, 0);
    gripHand(hand, glove, suit, -1, 0.013);
    // the wrench: its handle runs along the hand's grip line
    const wrench = pivot(hand, 0, 0, 0);
    const wr = pivot(wrench, 0, 0, 0);
    wr.rotation.x = -Math.PI / 2; // wrench "up" = forward out of the fist
    const hl = add(wr, new THREE.CapsuleGeometry(0.011, 0.22, 4, 8), steelW, 0, 0.06, 0);
    hl.scale.set(1.25, 1, 0.55);
    box(wr, 0.03, 0.08, 0.018, M.rubber(), 0, -0.02, 0); // rubber grip
    for (let k = 0; k < 4; k++) box(wr, 0.032, 0.004, 0.02, M.darkMetal(), 0, -0.05 + k * 0.02, 0);
    // open jaw at the top
    const jaw = pivot(wr, 0, 0.2, 0);
    box(jaw, 0.06, 0.03, 0.013, steelW, 0, 0, 0);
    box(jaw, 0.016, 0.045, 0.013, steelW, -0.025, 0.03, 0, 0, 0, 0.18);
    box(jaw, 0.016, 0.045, 0.013, steelW, 0.025, 0.03, 0, 0, 0, -0.18);
    box(jaw, 0.012, 0.006, 0.014, M.darkMetal(), 0.012, -0.003, 0); // adjusting screw
    // ring end at the bottom
    const ring = add(wr, new THREE.TorusGeometry(0.019, 0.007, 6, 14), steelW, 0, -0.085, 0);
    ring.scale.z = 0.6;
    // wristwatch on the left wrist (shows the time in the lab)
    const watchTex = new THREE.CanvasTexture(U.canvas(64, 32, () => {}));
    const watchScreen = new THREE.MeshStandardMaterial({ map: watchTex, emissive: 0xffffff, emissiveMap: watchTex, emissiveIntensity: 1.2 });
    const wbase = pivot(hand, -0.02, 0.028, 0.1);
    wbase.rotation.z = 0.35;
    box(wbase, 0.034, 0.012, 0.03, M.rubber(), 0, 0, 0);
    const scr = add(wbase, new THREE.PlaneGeometry(0.026, 0.02), watchScreen, 0, 0.0065, 0);
    scr.rotation.x = -Math.PI / 2; scr.rotation.z = Math.PI / 2;
    scr.userData.keep = true;
    add(wbase, new THREE.TorusGeometry(0.03, 0.004, 4, 16), M.rubber(), 0, -0.012, 0).rotation.x = Math.PI / 2;
    if (style === 'hazmat') { // Reyes has a geiger counter clipped on the sleeve
      box(hand, 0.03, 0.02, 0.05, M.yellow(), -0.045, 0.02, 0.2);
      box(hand, 0.02, 0.003, 0.012, M.ledGreen(), -0.045, 0.031, 0.19);
    } else { // Park's radio cord
      tube(right, new THREE.Vector3(0.03, 0.03, 0.14), new THREE.Vector3(0.05, 0.08, 0.3), 0.004, M.rubber(), 4);
    }
    hand.rotation.set(0.95, 0.3, 0.45); // wrench held up, ready to swing
    g.userData = { right, left, fl, hand, wrench, lens, watchTex };
    return g;
  }

  // update the digital watch (every few seconds is enough)
  function setWatch(vm, text, warn) {
    const t = vm.userData.watchTex;
    if (!t || t.userData.text === text) return;
    t.userData.text = text;
    const g = t.image.getContext('2d');
    g.fillStyle = '#031006'; g.fillRect(0, 0, 64, 32);
    g.fillStyle = warn ? '#ff4030' : '#48ff80'; g.font = 'bold 20px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 32, 17);
    t.needsUpdate = true;
  }

  // =====================================================
  //  ALIENS
  // =====================================================
  // CRAWLER — small, fast, many legs, a big mouth full of teeth
  function crawler() {
    const g = new THREE.Group();
    const body = pivot(g, 0, 0.5, 0);
    // segmented fleshy body
    sph(body, 0.36, M.alien(), 0, 0, 0.05, 1, 0.7, 1.05);
    sph(body, 0.3, M.alien(), 0, 0.02, -0.4, 0.95, 0.68, 1.0);
    sph(body, 0.22, M.alienRed(), 0, 0.04, -0.72, 0.9, 0.65, 1.1);
    sph(body, 0.2, M.alienRed(), 0, 0.2, -0.3, 1.1, 0.55, 1.4); // pulsing back sack
    for (let i = 0; i < 3; i++) add(body, new THREE.TorusGeometry(0.31 - i * 0.04, 0.03, 6, 16), M.fleshWet(), 0, 0.01, -0.2 - i * 0.28, 0, 0, 0).scale.set(1, 0.66, 1);
    for (let i = 0; i < 7; i++) cone(body, 0.04, 0.2 - i * 0.015, M.teeth(), 0, 0.26 - i * 0.012, 0.18 - i * 0.14, -0.5, 0, 0); // spine spikes
    // head with a split jaw
    const head = pivot(body, 0, 0.03, 0.34);
    sph(head, 0.27, M.alien(), 0, 0.07, 0.04, 1.1, 0.72, 1);
    sph(head, 0.2, M.alienRed(), 0, 0.2, -0.08, 0.9, 0.5, 0.9); // brain bump
    const jaw = pivot(head, 0, -0.04, 0.0);
    sph(jaw, 0.24, M.alien(), 0, -0.07, 0.1, 1.05, 0.42, 1);
    sph(head, 0.2, M.mouth(), 0, -0.03, 0.2, 1, 0.55, 0.55);
    for (let i = 0; i < 11; i++) { // upper + lower teeth
      const a = -1.35 + i * 0.27;
      cone(head, 0.022, U.rand(0.1, 0.16), M.teeth(), Math.sin(a) * 0.19, -0.02, 0.2 + Math.cos(a) * 0.12, Math.PI, 0, 0);
      cone(jaw, 0.02, U.rand(0.08, 0.13), M.teeth(), Math.sin(a) * 0.18, -0.03, 0.22 + Math.cos(a) * 0.11, 0, 0, 0);
    }
    // long tongue sticking out
    tube(jaw, new THREE.Vector3(0, -0.06, 0.15), new THREE.Vector3(0.04, -0.12, 0.42), 0.03, M.fleshWet(), 6);
    // cluster of glowing eyes
    [[-0.12, 0.2, 0.2, 0.045], [0.12, 0.2, 0.2, 0.045], [-0.2, 0.14, 0.14, 0.03], [0.2, 0.14, 0.14, 0.03], [-0.06, 0.26, 0.14, 0.025], [0.06, 0.26, 0.14, 0.025]]
      .forEach(([x, y, z, r]) => sph(head, r, M.eyeYellow(), x, y, z, 1, 1, 1, 8));
    // 6 spindly legs that bend down to the floor like a spider
    const legs = [];
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1;
      const z = 0.2 - Math.floor(i / 2) * 0.32;
      const hip = pivot(body, side * 0.25, 0.02, z);
      hip.rotation.z = -side * 0.9;
      hip.rotation.y = side * (Math.floor(i / 2) - 1) * 0.35;
      tube(hip, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.38, 0), 0.04, M.alien());
      sph(hip, 0.05, M.alienRed(), 0, 0.38, 0, 1, 1, 1, 8);
      const knee = pivot(hip, 0, 0.38, 0);
      knee.rotation.z = -side * 1.75;
      tube(knee, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.66, 0), 0.03, M.alienRed());
      cone(knee, 0.03, 0.14, M.teeth(), 0, 0.72, 0);
      legs.push({ hip, side, base: hip.rotation.z, i });
    }
    // two whip tails
    tube(body, new THREE.Vector3(-0.06, 0.02, -0.85), new THREE.Vector3(-0.25, 0.2, -1.4), 0.035, M.alienRed());
    tube(body, new THREE.Vector3(0.06, 0.02, -0.85), new THREE.Vector3(0.25, 0.1, -1.35), 0.035, M.alienRed());
    g.userData = { body, head, jaw, legs };
    return g;
  }
  function animateCrawler(m, t, speed, attacking) {
    const d = m.userData;
    const f = speed > 0.1 ? 14 : 3;
    d.legs.forEach((l) => {
      l.hip.rotation.z = l.base + Math.sin(t * f + l.i * 1.7) * (speed > 0.1 ? 0.35 : 0.05);
      l.hip.rotation.x = Math.cos(t * f + l.i * 1.7) * (speed > 0.1 ? 0.3 : 0.02);
    });
    d.body.position.y = 0.5 + Math.sin(t * f * 2) * 0.03;
    d.jaw.rotation.x = attacking ? 0.9 : 0.15 + Math.sin(t * 5) * 0.12;
    d.head.rotation.y = Math.sin(t * 2.3) * 0.2;
  }

  // SPITTER — bloated alien with a glowing acid sac. Spits from far away!
  function spitter() {
    const g = new THREE.Group();
    const body = pivot(g, 0, 0.55, 0);
    sph(body, 0.35, M.alien(), 0, 0, 0.1, 1.1, 0.75, 1.2);
    const sacMat = mat('acidSac', () => new THREE.MeshStandardMaterial({ color: 0x70d020, emissive: 0x40a010, emissiveIntensity: 1.2, transparent: true, opacity: 0.85, roughness: 0.1 }));
    const sac = pivot(body, 0, 0.25, -0.25);
    sph(sac, 0.38, sacMat, 0, 0, 0, 1, 0.9, 1.1);
    for (let i = 0; i < 8; i++) { // veins over the sac
      const a = i / 8 * Math.PI * 2;
      tube(sac, new THREE.Vector3(0, 0.33, 0), new THREE.Vector3(Math.cos(a) * 0.37, -0.05, Math.sin(a) * 0.4), 0.018, M.fleshWet(), 4);
    }
    // long mouth tube that aims at you
    const neck = pivot(body, 0, 0.05, 0.4);
    tube(neck, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.12, 0.35), 0.1, M.alienRed());
    add(neck, new THREE.TorusGeometry(0.1, 0.035, 6, 12), M.fleshWet(), 0, 0.12, 0.36);
    teethRing(neck, 0.09, 8, 0.06, M.teeth(), 0.12, false, 1.2);
    sph(neck, 0.07, sacMat, 0, 0.12, 0.33, 1, 1, 0.5, 8);
    for (let i = 0; i < 4; i++) sph(body, 0.03, M.eyeYellow(), (i % 2 ? 1 : -1) * (0.12 + (i >> 1) * 0.1), 0.18, 0.38 - (i >> 1) * 0.08, 1, 1, 1, 6);
    // 4 stubby bent legs
    const legs = [];
    for (let i = 0; i < 4; i++) {
      const side = i % 2 ? 1 : -1, z = i < 2 ? 0.25 : -0.2;
      const hip = pivot(body, side * 0.3, -0.05, z);
      hip.rotation.z = -side * 0.8;
      tube(hip, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.3, 0), 0.05, M.alien());
      const knee = pivot(hip, 0, 0.3, 0);
      knee.rotation.z = -side * 2.0;
      tube(knee, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.5, 0), 0.04, M.alienRed());
      cone(knee, 0.04, 0.1, M.teeth(), 0, 0.55, 0);
      legs.push({ hip, side, base: hip.rotation.z, i });
    }
    g.userData = { body, sac, neck, legs };
    return g;
  }
  function animateSpitter(m, t, speed, charge) {
    const d = m.userData;
    d.legs.forEach((l) => { l.hip.rotation.z = l.base + Math.sin(t * (speed > 0.1 ? 10 : 2) + l.i * 1.6) * (speed > 0.1 ? 0.3 : 0.04); });
    const pulse = 1 + Math.sin(t * 3) * 0.05 + charge * 0.3;
    d.sac.scale.set(pulse, pulse, pulse);
    d.neck.rotation.x = -charge * 0.6;
    d.body.position.y = 0.55 + Math.sin(t * 2) * 0.02;
  }
  // a burning flare lying on the floor
  function flare() {
    const g = new THREE.Group();
    const red = mat('flareRed', () => new THREE.MeshStandardMaterial({ color: 0xc01010, emissive: 0x600000, roughness: 0.5 }));
    const hot = mat('flareHot', () => new THREE.MeshBasicMaterial({ color: 0xffe0d0 }));
    const stick = pivot(g, 0, 0.03, 0);
    stick.rotation.z = Math.PI / 2;
    cyl(stick, 0.028, 0.028, 0.28, red, 0, 0, 0);
    cyl(stick, 0.022, 0.028, 0.04, hot, 0, 0.16, 0);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xff3018, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.set(-0.16, 0.05, 0); glow.scale.set(1.2, 1.2, 1);
    g.add(glow);
    g.userData = { glow, stick };
    return g;
  }
  // a blob of acid in the air
  function acidBlob() {
    const g = new THREE.Group();
    const m = mat('acidBlob', () => new THREE.MeshBasicMaterial({ color: 0x9aff40 }));
    sph(g, 0.12, m, 0, 0, 0, 1, 1, 1, 8);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0x80ff30, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(0.9, 0.9, 1); g.add(glow);
    return g;
  }

  // HUSK — an infected scientist. The alien grows out of its head!
  function husk() {
    const g = human('deadcoat');
    const p = g.userData.parts;
    // split open skull with tendrils and a pulsing growth
    const h = p.head;
    sph(h, 0.1, M.alienRed(), 0, 0.3, -0.02, 1.2, 0.9, 1.1);
    sph(h, 0.07, M.fleshWet(), 0.05, 0.36, 0.03, 1, 1, 1, 8);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      const end = new THREE.Vector3(Math.cos(a) * 0.28, 0.45 + Math.random() * 0.25, Math.sin(a) * 0.28);
      tube(h, new THREE.Vector3(Math.cos(a) * 0.05, 0.3, Math.sin(a) * 0.05), end, 0.018, M.alienRed(), 5);
      sph(h, 0.03, M.fleshWet(), end.x, end.y, end.z, 1, 1, 1, 6);
    }
    sph(h, 0.028, M.eyeYellow(), -0.045, 0.19, 0.11, 1, 1, 1, 6);
    sph(h, 0.028, M.eyeYellow(), 0.045, 0.19, 0.11, 1, 1, 1, 6);
    const jaw = pivot(h, 0, 0.1, 0.06);
    box(jaw, 0.12, 0.05, 0.1, M.skinDead(), 0, -0.02, 0.02);
    box(jaw, 0.1, 0.04, 0.02, M.mouth(), 0, 0.01, 0.07);
    p.jaw = jaw;
    // chest torn open, with alien ribs
    sph(p.torso, 0.14, M.fleshWet(), 0, 0.38, 0.1, 1.1, 1.3, 0.5);
    for (let i = 0; i < 4; i++) {
      const r = add(p.torso, new THREE.TorusGeometry(0.12, 0.012, 4, 10, Math.PI), M.teeth(), 0, 0.28 + i * 0.07, 0.14);
      r.rotation.set(0, 0, Math.PI);
    }
    // long claws growing out of the fingers
    for (const e of [p.elbowL, p.elbowR]) for (let f = 0; f < 3; f++) cone(e, 0.012, 0.16, M.teeth(), (f - 1) * 0.03, -0.44, 0.02, Math.PI, 0, 0, 5);
    return g;
  }
  function animateHusk(m, t, speed, attack, dead) {
    const p = m.userData.parts;
    if (dead) return;
    const s = Math.sin(t * 3.2), amp = Math.min(1, speed / 1.5) * 0.45;
    p.legL.rotation.x = s * amp; p.legR.rotation.x = -s * amp;
    p.kneeL.rotation.x = Math.max(0, -s) * amp; p.kneeR.rotation.x = Math.max(0, s) * amp;
    const reach = attack ? -2.2 + Math.sin(t * 20) * 0.2 : -1.35 + Math.sin(t * 1.7) * 0.15;
    p.armL.rotation.x = reach + s * 0.1; p.armR.rotation.x = reach - s * 0.1;
    p.armL.rotation.z = -0.15; p.armR.rotation.z = 0.15;
    p.torso.rotation.x = 0.25 + Math.sin(t * 1.1) * 0.05;
    p.torso.rotation.z = Math.sin(t * 1.6) * 0.12; // limping sway
    p.head.rotation.z = 0.5 + Math.sin(t * 0.9) * 0.2; // head flopped to the side
    p.head.rotation.x = Math.sin(t * 13) * (attack ? 0.15 : 0.02); // twitch
    p.jaw.rotation.x = attack ? 0.6 : 0.25 + Math.sin(t * 2) * 0.1;
    p.body.position.y = Math.abs(Math.cos(t * 3.2)) * amp * 0.05;
  }

  // STALKER — very tall, thin, no eyes, a mouth that opens sideways
  function stalker() {
    const g = new THREE.Group();
    const S = M.alienDark(), R = M.alienRed();
    const root = pivot(g, 0, 0, 0);
    const pelvis = pivot(root, 0, 1.45, 0);
    sph(pelvis, 0.2, S, 0, 0, 0, 1.2, 0.7, 0.9);
    const chest = pivot(pelvis, 0, 0.1, 0);
    chest.rotation.x = 0.35; // hunched forward
    cyl(chest, 0.11, 0.08, 0.5, S, 0, 0.3, 0); // spine/waist
    sph(chest, 0.26, S, 0, 0.72, 0, 1.1, 1.2, 0.75); // rib cage
    for (let i = 0; i < 5; i++) { // ribs sticking out
      const r = add(chest, new THREE.TorusGeometry(0.25 - i * 0.01, 0.018, 5, 14, Math.PI), M.teeth(), 0, 0.55 + i * 0.08, 0.02, 0, 0, 0);
      r.rotation.set(Math.PI / 2, 0, 0);
      r.scale.set(1.12, 0.8, 1);
    }
    for (let i = 0; i < 7; i++) cone(chest, 0.035, 0.18, M.teeth(), 0, 0.5 + i * 0.09, -0.2, -1.4, 0, 0); // back spikes
    // neck + long head
    const neck = pivot(chest, 0, 1.0, 0.05);
    neck.rotation.x = -0.25;
    cyl(neck, 0.06, 0.08, 0.3, S, 0, 0.12, 0);
    const head = pivot(neck, 0, 0.3, 0.05);
    sph(head, 0.2, S, 0, 0.12, 0.05, 0.85, 1.6, 1.1); // tall skull
    sph(head, 0.16, R, 0, 0.35, -0.08, 0.7, 1, 1); // brain bulge
    // vertical mouth split open in the front
    const mouthL = pivot(head, -0.02, 0.05, 0.2);
    const mouthR = pivot(head, 0.02, 0.05, 0.2);
    sph(mouthL, 0.1, S, -0.04, 0, 0, 0.5, 1.9, 0.6);
    sph(mouthR, 0.1, S, 0.04, 0, 0, 0.5, 1.9, 0.6);
    for (let i = 0; i < 7; i++) {
      cone(mouthL, 0.016, 0.09, M.teeth(), -0.01, -0.15 + i * 0.05, 0.03, 0, 0, -Math.PI / 2);
      cone(mouthR, 0.016, 0.09, M.teeth(), 0.01, -0.15 + i * 0.05, 0.03, 0, 0, Math.PI / 2);
    }
    sph(head, 0.09, M.mouth(), 0, 0.05, 0.19, 0.4, 1.9, 0.4);
    // glowing pits instead of eyes
    for (let i = 0; i < 6; i++) sph(head, 0.018, M.eyeRed(), (i % 2 ? 1 : -1) * (0.05 + (i >> 1) * 0.03), 0.3 - (i >> 1) * 0.04, 0.17, 1, 1, 1, 6);
    // arms — very long with claws
    const arms = [];
    for (const side of [-1, 1]) {
      const sh = pivot(chest, side * 0.3, 0.85, 0);
      sph(sh, 0.08, S, 0, 0, 0);
      tube(sh, new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * 0.05, -0.62, 0), 0.05, S);
      const el = pivot(sh, side * 0.05, -0.62, 0);
      tube(el, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.6, 0.05), 0.04, S);
      const hand = pivot(el, 0, -0.62, 0.05);
      sph(hand, 0.06, S, 0, 0, 0, 1, 1.3, 0.8);
      for (let f = 0; f < 4; f++) {
        tube(hand, new THREE.Vector3((f - 1.5) * 0.03, 0, 0), new THREE.Vector3((f - 1.5) * 0.07, -0.28, 0.08), 0.012, S, 5);
        cone(hand, 0.014, 0.12, M.teeth(), (f - 1.5) * 0.07, -0.33, 0.1, Math.PI, 0, 0, 5);
      }
      arms.push({ sh, el, side });
    }
    // legs — bent backward like an animal
    const legs = [];
    for (const side of [-1, 1]) {
      const hip = pivot(pelvis, side * 0.17, 0, 0);
      tube(hip, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.62, 0.25), 0.07, S);
      const knee = pivot(hip, 0, -0.62, 0.25);
      tube(knee, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.55, -0.3), 0.05, S);
      const ankle = pivot(knee, 0, -0.55, -0.3);
      tube(ankle, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.28, 0.08), 0.035, S);
      for (let f = -1; f <= 1; f++) cone(ankle, 0.02, 0.18, M.teeth(), f * 0.05, -0.3, 0.16, Math.PI / 2, 0, 0, 5);
      legs.push({ hip, knee, side });
    }
    g.userData = { root, pelvis, chest, neck, head, mouthL, mouthR, arms, legs };
    return g;
  }
  function animateStalker(m, t, speed, frozen, attack) {
    const d = m.userData;
    if (frozen) { // twitch while stuck in the light
      d.head.rotation.z = Math.sin(t * 40) * 0.08;
      d.head.rotation.y = Math.sin(t * 23) * 0.1;
      d.mouthL.rotation.y = -0.5; d.mouthR.rotation.y = 0.5;
      return;
    }
    const f = speed > 2.5 ? 7 : 4;
    const amp = Math.min(1, speed / 2) * 0.55;
    const s = Math.sin(t * f);
    d.legs[0].hip.rotation.x = s * amp; d.legs[1].hip.rotation.x = -s * amp;
    d.arms[0].sh.rotation.x = -s * amp * 0.8 - (attack ? 1.4 : 0.2);
    d.arms[1].sh.rotation.x = s * amp * 0.8 - (attack ? 1.4 : 0.2);
    d.arms.forEach((a) => { a.sh.rotation.z = a.side * (attack ? 0.5 : 0.15); a.el.rotation.x = attack ? -0.8 : -0.3; });
    d.pelvis.position.y = 1.45 + Math.abs(Math.cos(t * f)) * 0.06;
    d.head.rotation.z = Math.sin(t * 1.3) * 0.25; // creepy head tilt
    d.head.rotation.y = 0;
    const open = attack ? 0.7 : 0.1 + Math.max(0, Math.sin(t * 0.8)) * 0.25;
    d.mouthL.rotation.y = -open; d.mouthR.rotation.y = open;
  }

  // a huge clawed arm that punches through the ceiling (ending)
  function claw() {
    const g = new THREE.Group();
    const S = M.alienDark();
    tube(g, new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(0, 0.25, 0.05), 0.09, S);
    sph(g, 0.13, S, 0, 0.2, 0.05, 1, 1.3, 0.9);
    for (let f = 0; f < 4; f++) {
      const x = (f - 1.5) * 0.07;
      const end = new THREE.Vector3(x * 2.4, -0.35, 0.15 + Math.abs(f - 1.5) * 0.04);
      tube(g, new THREE.Vector3(x, 0.15, 0.05), end, 0.025, S, 6);
      const c = cone(g, 0.028, 0.22, M.teeth(), end.x, end.y - 0.1, end.z, Math.PI, 0, 0, 6);
    }
    // torn metal around the hole
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; box(g, 0.25, 0.02, 0.1, M.metal(), Math.cos(a) * 0.25, 1.1, Math.sin(a) * 0.25, U.rand(-0.8, 0.8), a, U.rand(0.3, 0.9)); }
    return g;
  }

  // HANGER — hangs on the ceiling and drops a sticky tongue down
  function hanger() {
    const g = new THREE.Group();
    const top = pivot(g, 0, LAB.WALL_H, 0);
    sph(top, 0.55, M.flesh(), 0, -0.1, 0, 1, 0.45, 1);
    sph(top, 0.4, M.alienRed(), 0, -0.25, 0, 1, 0.5, 1);
    for (let i = 0; i < 8; i++) { // dangly bits
      const a = (i / 8) * Math.PI * 2;
      tube(top, new THREE.Vector3(Math.cos(a) * 0.4, -0.15, Math.sin(a) * 0.4), new THREE.Vector3(Math.cos(a) * 0.5, -0.5 - U.rand(0, 0.3), Math.sin(a) * 0.5), 0.03, M.fleshWet());
    }
    sph(top, 0.22, M.mouth(), 0, -0.42, 0, 1, 0.3, 1);
    teethRing(top, 0.22, 12, 0.14, M.teeth(), -0.44, true, 0.4);
    const tongue = pivot(top, 0, -0.45, 0);
    const tg = add(tongue, new THREE.CylinderGeometry(0.035, 0.05, 1, 6), M.fleshWet());
    tg.userData.keep = true;
    tg.position.y = -0.5;
    const tip = sph(tongue, 0.09, M.fleshWet(), 0, -1, 0, 1, 1.4, 1);
    tip.userData.keep = true;
    g.userData = { top, tongue, tg, tip, length: LAB.WALL_H - 0.75 };
    setTongue(g, g.userData.length);
    return g;
  }
  function setTongue(m, len) {
    const d = m.userData;
    d.tg.scale.y = len; d.tg.position.y = -len / 2;
    d.tip.position.y = -len;
  }

  // THE FACE — used for jump scares (flies right at your eyes!)
  function scareFace() {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({ map: T.alienSkin('pale'), color: 0xc8b0a0, roughness: 0.25, metalness: 0.05, emissive: 0x3a1010, emissiveIntensity: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ map: T.alienSkin('dark'), roughness: 0.2, emissive: 0x200505, emissiveIntensity: 0.5 });
    const throat = new THREE.MeshStandardMaterial({ color: 0x3a0206, emissive: 0x500008, emissiveIntensity: 0.9, roughness: 0.2 });
    const tooth = new THREE.MeshStandardMaterial({ color: 0xf0e4c0, emissive: 0x302818, roughness: 0.25 });
    const glow = new THREE.MeshStandardMaterial({ color: 0xff2000, emissive: 0xff1000, emissiveIntensity: 4 });
    // long skull that bulges backward
    sph(g, 0.42, skin, 0, 0.42, -0.5, 0.95, 0.85, 1.25);
    sph(g, 0.3, dark, 0, 0.62, -0.85, 1, 0.9, 1.2);
    for (let i = 0; i < 5; i++) cone(g, 0.04, 0.25, tooth, (i - 2) * 0.1, 0.75, -0.5 - Math.abs(i - 2) * 0.05, -1.1, 0, (i - 2) * 0.3); // bone spikes
    // brow ridge over sunken black eye pits
    sph(g, 0.22, skin, -0.18, 0.56, -0.02, 1.1, 0.4, 0.7);
    sph(g, 0.22, skin, 0.18, 0.56, -0.02, 1.1, 0.4, 0.7);
    sph(g, 0.2, skin, 0, 0.32, -0.08, 1.6, 0.5, 0.7); // cheekbones
    for (const x of [-0.18, 0.18]) {
      sph(g, 0.11, M.eyeBlack(), x, 0.46, 0.08, 1.25, 0.85, 0.6);
      sph(g, 0.03, glow, x * 1.05, 0.46, 0.14, 1, 1, 1, 8); // glowing pupil
    }
    for (let i = 0; i < 6; i++) sph(g, 0.022, glow, (i < 3 ? -1 : 1) * (0.34 + (i % 3) * 0.05), 0.62 - (i % 3) * 0.07, -0.08 - (i % 3) * 0.04, 1, 1, 1, 6); // extra eyes
    // GIANT open mouth
    sph(g, 0.34, throat, 0, -0.08, 0.02, 1, 1.25, 0.6);
    sph(g, 0.12, glow, 0, -0.1, -0.12, 1, 1, 0.3); // glowing throat
    // mouth rim
    const rim = add(g, new THREE.TorusGeometry(0.33, 0.07, 8, 24), skin, 0, -0.08, 0.14);
    rim.scale.set(1, 1.3, 1);
    // rows of needle teeth pointing into the mouth
    for (let row = 0; row < 2; row++) {
      const n = 22 - row * 6, r = 0.31 - row * 0.07;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = Math.cos(a) * r, y = -0.08 + Math.sin(a) * r * 1.3;
        const t = cone(g, 0.022, U.rand(0.12, 0.22) + (row ? 0 : 0.05), tooth, x, y, 0.16 - row * 0.06);
        // point toward the middle of the mouth
        t.lookAt(new THREE.Vector3(0, -0.08, 0.2 - row * 0.06));
        t.rotateX(Math.PI / 2);
      }
    }
    // 4 mandibles opening outward around the mouth
    const mand = [];
    for (let k = 0; k < 4; k++) {
      const ax = k % 2 ? 1 : -1, ay = k < 2 ? 1 : -1;
      const pv = pivot(g, ax * 0.28, -0.08 + ay * 0.3, 0.12);
      tube(pv, new THREE.Vector3(0, 0, 0), new THREE.Vector3(ax * 0.2, ay * 0.3, 0.25), 0.045, dark);
      cone(pv, 0.045, 0.22, tooth, ax * 0.25, ay * 0.38, 0.33, 0.6 * (ay > 0 ? 1 : -1) + Math.PI / 2 * 0, 0, -ax * 0.6);
      for (let t = 0; t < 3; t++) cone(pv, 0.015, 0.08, tooth, ax * (0.05 + t * 0.06), ay * (0.08 + t * 0.09), 0.08 + t * 0.07, 0, 0, ax * 1.5);
      mand.push(pv);
    }
    // stretched flesh strings across the mouth
    for (let i = 0; i < 6; i++) {
      const x = U.rand(-0.22, 0.22);
      tube(g, new THREE.Vector3(x, 0.25, 0.1), new THREE.Vector3(x + U.rand(-0.1, 0.1), -0.45, 0.12), 0.007, M.fleshWet(), 4);
    }
    for (let i = 0; i < 5; i++) tube(g, new THREE.Vector3(U.rand(-0.2, 0.2), -0.45, 0.16), new THREE.Vector3(U.rand(-0.25, 0.25), -0.8 - Math.random() * 0.3, 0.2), 0.008, M.fleshWet(), 4); // drool
    // neck
    cyl(g, 0.22, 0.3, 0.6, dark, 0, -0.55, -0.35, 0.4, 0, 0);
    g.userData = { mand };
    return g;
  }

  // =====================================================
  //  LAB PROPS (these become part of the level)
  // =====================================================
  function cryoPod(broken, occupied, rnd) {
    const g = new THREE.Group();
    cyl(g, 0.62, 0.7, 0.3, M.darkMetal(), 0, 0.15, 0);
    cyl(g, 0.58, 0.62, 0.08, M.steel(), 0, 0.34, 0);
    box(g, 0.36, 0.26, 0.12, M.darkMetal(), 0, 0.2, 0.62); // control box
    box(g, 0.06, 0.04, 0.02, rnd() < 0.5 ? M.ledRed() : M.ledBlue(), -0.08, 0.26, 0.69);
    box(g, 0.06, 0.04, 0.02, M.ledGreen(), 0.08, 0.26, 0.69);
    if (broken) {
      add(g, new THREE.CylinderGeometry(0.5, 0.5, 2.1, 18, 1, true, 0, Math.PI * 1.3), M.glassCrack(), 0, 1.4, 0, 0, rnd() * 6, 0);
      for (let i = 0; i < 7; i++) box(g, U.rand(0.05, 0.25), 0.01, U.rand(0.05, 0.2), M.glassCrack(), U.rand(-1, 1), 0.02, U.rand(0.4, 1.2), 0, rnd() * 6, 0);
      add(g, new THREE.CircleGeometry(0.9, 16), M.blueLiquid(), 0.2, 0.02, 0.6, -Math.PI / 2, 0, 0);
    } else {
      add(g, new THREE.CylinderGeometry(0.5, 0.5, 2.1, 18, 1, true), M.glass(), 0, 1.4, 0);
      add(g, new THREE.CylinderGeometry(0.47, 0.47, 1.6, 16), M.blueLiquid(), 0, 1.2, 0);
      if (occupied) {
        const body = human('deadcoat');
        body.position.set(0, 0.45, 0);
        body.scale.setScalar(0.92);
        body.userData.parts.head.rotation.x = 0.5;
        body.userData.parts.armL.rotation.z = -0.3;
        body.userData.parts.armR.rotation.z = 0.3;
        g.add(body);
      }
    }
    cyl(g, 0.58, 0.62, 0.3, M.darkMetal(), 0, 2.55, 0);
    cyl(g, 0.4, 0.5, 0.15, M.steel(), 0, 2.75, 0);
    for (let i = 0; i < 3; i++) { // hoses to the ceiling
      const a = i * 2.1 + 0.4;
      tube(g, new THREE.Vector3(Math.cos(a) * 0.3, 2.8, Math.sin(a) * 0.3), new THREE.Vector3(Math.cos(a) * 0.45, LAB.WALL_H, Math.sin(a) * 0.45), 0.05, M.cable());
    }
    return g;
  }

  function specimenTank(cracked, rnd) {
    const g = new THREE.Group();
    cyl(g, 0.7, 0.75, 0.4, M.darkMetal(), 0, 0.2, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; box(g, 0.08, 0.3, 0.08, M.steel(), Math.cos(a) * 0.7, 0.3, Math.sin(a) * 0.7); }
    add(g, new THREE.CylinderGeometry(0.6, 0.6, 2.0, 20, 1, true), cracked ? M.glassCrack() : M.glass(), 0, 1.4, 0);
    add(g, new THREE.CylinderGeometry(0.57, 0.57, cracked ? 0.6 : 1.85, 18), M.greenLiquid(), 0, cracked ? 0.7 : 1.35, 0);
    // a curled alien baby floating inside
    const baby = crawler();
    baby.scale.setScalar(cracked ? 0.9 : 0.8);
    baby.position.set(0, cracked ? 0.45 : 1.0, 0);
    baby.rotation.set(rnd() * 1.5, rnd() * 6, rnd() * 0.8);
    g.add(baby);
    for (let i = 0; i < 10; i++) sph(g, U.rand(0.015, 0.04), M.glass(), U.rand(-0.4, 0.4), U.rand(0.6, 2.2), U.rand(-0.4, 0.4), 1, 1, 1, 6); // bubbles
    cyl(g, 0.68, 0.7, 0.35, M.darkMetal(), 0, 2.55, 0);
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + 0.3;
      tube(g, new THREE.Vector3(Math.cos(a) * 0.4, 2.7, Math.sin(a) * 0.4), new THREE.Vector3(Math.cos(a) * 0.5, LAB.WALL_H, Math.sin(a) * 0.5), 0.06, M.metal());
    }
    const label = add(g, new THREE.PlaneGeometry(0.5, 0.12), signMat('SPEC-' + U.randInt(1, 12), '#d0d0c8', '#222'), 0, 0.3, 0.77);
    if (cracked) {
      add(g, new THREE.CircleGeometry(1.1, 16), M.goo(), 0.3, 0.015, 0.5, -Math.PI / 2, 0, 0);
      for (let i = 0; i < 6; i++) box(g, U.rand(0.05, 0.3), 0.01, U.rand(0.05, 0.25), M.glassCrack(), U.rand(-1.2, 1.2), 0.02, U.rand(-0.2, 1.3), 0, rnd() * 6, 0);
    }
    return g;
  }

  function labTable(rnd) {
    const g = new THREE.Group();
    box(g, 2.0, 0.06, 0.9, M.white(), 0, 0.92, 0);
    box(g, 1.9, 0.04, 0.8, M.metal(), 0, 0.3, 0);
    for (const x of [-0.95, 0.95]) for (const z of [-0.4, 0.4]) box(g, 0.05, 0.92, 0.05, M.metal(), x, 0.46, z);
    // glass beakers and flasks with glowing liquids
    const liquids = [M.greenLiquid(), M.blueLiquid(), M.bloodBright()];
    for (let i = 0; i < 5; i++) {
      const x = U.rand(-0.85, 0.3), z = U.rand(-0.3, 0.3);
      if (rnd() < 0.3) { // knocked over
        cyl(g, 0.05, 0.05, 0.18, M.glass(), x, 1.0, z, 0, 0, Math.PI / 2);
        add(g, new THREE.CircleGeometry(0.15, 10), liquids[i % 3], x + 0.1, 0.955, z, -Math.PI / 2, 0, 0);
      } else {
        const h = U.rand(0.12, 0.26);
        cyl(g, 0.05, 0.06, h, M.glass(), x, 0.95 + h / 2, z);
        cyl(g, 0.045, 0.055, h * 0.6, liquids[i % 3], x, 0.95 + h * 0.3, z);
      }
    }
    // microscope
    const mx = 0.6;
    box(g, 0.2, 0.04, 0.25, M.darkMetal(), mx, 0.97, 0);
    box(g, 0.05, 0.3, 0.05, M.darkMetal(), mx, 1.12, -0.08);
    cyl(g, 0.03, 0.035, 0.22, M.darkMetal(), mx, 1.2, 0.0, 0.5, 0, 0);
    box(g, 0.14, 0.02, 0.12, M.steel(), mx, 1.05, 0.02);
    // papers
    for (let i = 0; i < 3; i++) add(g, new THREE.PlaneGeometry(0.21, 0.29), M.paper(), U.rand(-0.8, 0.8), 0.952 + i * 0.001, U.rand(-0.3, 0.3), -Math.PI / 2, 0, rnd() * 3);
    // stuff on the lower shelf
    box(g, 0.4, 0.25, 0.3, M.crate(), -0.5, 0.45, 0);
    cyl(g, 0.12, 0.12, 0.3, M.barrel(), 0.4, 0.47, 0.1);
    return g;
  }

  function desk(rnd, screenIndex) {
    const g = new THREE.Group();
    box(g, 1.5, 0.05, 0.75, M.plastic(), 0, 0.76, 0);
    box(g, 0.05, 0.76, 0.7, M.darkMetal(), -0.72, 0.38, 0);
    box(g, 0.4, 0.66, 0.7, M.darkMetal(), 0.53, 0.38, 0); // drawers
    for (let i = 0; i < 3; i++) box(g, 0.2, 0.02, 0.01, M.steel(), 0.53, 0.6 - i * 0.2, 0.36);
    // monitor
    box(g, 0.62, 0.42, 0.05, M.rubber(), 0, 1.08, -0.2);
    add(g, new THREE.PlaneGeometry(0.56, 0.36), screenMat(screenIndex), 0, 1.08, -0.172);
    box(g, 0.05, 0.2, 0.05, M.rubber(), 0, 0.88, -0.22);
    box(g, 0.25, 0.02, 0.18, M.rubber(), 0, 0.79, -0.22);
    box(g, 0.45, 0.02, 0.15, M.rubber(), 0, 0.79, 0.12); // keyboard
    box(g, 0.06, 0.02, 0.09, M.rubber(), 0.32, 0.79, 0.12); // mouse
    cyl(g, 0.04, 0.035, 0.1, M.white(), -0.5, 0.83, 0.1); // coffee mug
    add(g, new THREE.PlaneGeometry(0.21, 0.29), M.paper(), -0.45, 0.787, -0.1, -Math.PI / 2, 0, 0.3);
    // office chair, maybe knocked over
    const chair = pivot(g, U.rand(-0.3, 0.3), 0, 0.75);
    if (rnd() < 0.4) { chair.rotation.z = Math.PI / 2; chair.position.y = 0.3; chair.position.z = 1.0; }
    chair.rotation.y += U.rand(-0.6, 0.6);
    box(chair, 0.48, 0.08, 0.45, M.chair(), 0, 0.48, 0);
    box(chair, 0.46, 0.55, 0.06, M.chair(), 0, 0.8, 0.22);
    cyl(chair, 0.03, 0.03, 0.4, M.steel(), 0, 0.26, 0);
    for (let i = 0; i < 5; i++) { const a = i * 1.256; box(chair, 0.04, 0.03, 0.3, M.steel(), Math.sin(a) * 0.14, 0.05, Math.cos(a) * 0.14, 0, a, 0); }
    return g;
  }

  function serverRack(rnd) {
    const g = new THREE.Group();
    box(g, 0.8, 2.3, 0.9, M.darkMetal(), 0, 1.15, 0);
    add(g, new THREE.PlaneGeometry(0.7, 2.2), M.serverFront(), 0, 1.15, 0.452);
    const leds = [M.ledGreen(), M.ledGreen(), M.ledRed(), M.ledOrange(), M.ledBlue()];
    for (let i = 0; i < 26; i++) box(g, 0.025, 0.025, 0.01, leds[U.randInt(0, 4)], U.rand(-0.3, 0.3), U.rand(0.1, 2.2), 0.46);
    for (let i = 0; i < 4; i++) tube(g, new THREE.Vector3(U.rand(-0.3, 0.3), 2.3, 0.3), new THREE.Vector3(U.rand(-0.4, 0.4), LAB.WALL_H, U.rand(-0.2, 0.4)), 0.02, M.cable(), 5);
    return g;
  }

  function crates(rnd) {
    const g = new THREE.Group();
    const n = U.randInt(1, 3);
    let y = 0;
    for (let i = 0; i < n; i++) {
      const s = U.rand(0.7, 1.0) - i * 0.12;
      box(g, s, s, s, M.crate(), U.rand(-0.15, 0.15), y + s / 2, U.rand(-0.15, 0.15), 0, rnd() * 0.6, 0);
      y += s;
    }
    if (rnd() < 0.6) box(g, 0.6, 0.6, 0.6, M.crate(), 0.8, 0.3, 0.6, 0, rnd(), 0);
    return g;
  }

  function barrels(rnd) {
    const g = new THREE.Group();
    const n = U.randInt(1, 3);
    for (let i = 0; i < n; i++) {
      if (i === 2 || rnd() < 0.2) {
        cyl(g, 0.3, 0.3, 0.9, M.barrel(), U.rand(-0.5, 0.5), 0.3, U.rand(-0.5, 0.5), Math.PI / 2, rnd() * 3, 0);
        add(g, new THREE.CircleGeometry(U.rand(0.5, 0.9), 14), M.goo(), U.rand(-0.4, 0.4), 0.015, U.rand(-0.4, 0.4), -Math.PI / 2, 0, 0);
      } else {
        cyl(g, 0.3, 0.3, 0.9, M.barrel(), (i - 0.5) * 0.65, 0.45, U.rand(-0.2, 0.2));
      }
    }
    return g;
  }

  function shelf(rnd) {
    const g = new THREE.Group();
    for (const x of [-0.7, 0.7]) for (const z of [-0.22, 0.22]) box(g, 0.04, 2.1, 0.04, M.metal(), x, 1.05, z);
    const jarStuff = [M.greenLiquid(), M.bloodBright(), M.blueLiquid(), M.alien(), M.fleshWet()];
    for (let s = 0; s < 4; s++) {
      const y = 0.2 + s * 0.6;
      box(g, 1.44, 0.03, 0.48, M.metal(), 0, y, 0);
      for (let k = 0; k < 4; k++) {
        if (rnd() < 0.25) continue;
        const x = -0.55 + k * 0.37;
        if (rnd() < 0.5) { // specimen jar
          cyl(g, 0.1, 0.1, 0.28, M.glass(), x, y + 0.155, 0);
          cyl(g, 0.105, 0.105, 0.03, M.darkMetal(), x, y + 0.31, 0);
          const stuff = jarStuff[U.randInt(0, 4)];
          if (stuff === M.alien() || stuff === M.fleshWet()) sph(g, 0.07, stuff, x, y + 0.12, 0, 1, 1.3, 1);
          else cyl(g, 0.09, 0.09, 0.2, stuff, x, y + 0.12, 0);
        } else box(g, 0.28, U.rand(0.15, 0.4), 0.35, M.crate(), x, y + 0.15, 0, 0, U.rand(-0.2, 0.2), 0);
      }
    }
    return g;
  }

  function morgueBed(rnd) {
    const g = new THREE.Group();
    box(g, 2.0, 0.06, 0.8, M.steel(), 0, 0.85, 0);
    for (const x of [-0.9, 0.9]) for (const z of [-0.35, 0.35]) box(g, 0.05, 0.85, 0.05, M.steel(), x, 0.42, z);
    box(g, 1.9, 0.03, 0.7, M.steel(), 0, 0.25, 0);
    // a body under a bloody sheet
    if (rnd() < 0.75) {
      const sh = rnd() < 0.6 ? M.sheetBloody() : M.sheet();
      box(g, 1.7, 0.18, 0.5, sh, 0, 0.96, 0);
      sph(g, 0.16, sh, -0.85, 1.0, 0, 1, 0.8, 1);
      sph(g, 0.1, sh, 0.78, 0.98, 0.14, 1, 1, 1);
      sph(g, 0.1, sh, 0.78, 0.98, -0.14, 1, 1, 1);
      if (rnd() < 0.5) { // an arm hanging out
        box(g, 0.08, 0.5, 0.08, M.skinDead(), 0.1, 0.72, 0.42, 0, 0, 0.1);
      }
    }
    // IV stand
    cyl(g, 0.015, 0.015, 1.9, M.steel(), 1.15, 0.95, 0.45);
    box(g, 0.15, 0.2, 0.05, M.bloodBright(), 1.15, 1.75, 0.45);
    tube(g, new THREE.Vector3(1.15, 1.65, 0.45), new THREE.Vector3(0.5, 1.0, 0.3), 0.006, M.cable(), 4);
    return g;
  }

  function generator() {
    const g = new THREE.Group();
    box(g, 2.6, 0.2, 1.8, M.darkMetal(), 0, 0.1, 0);
    box(g, 2.4, 1.6, 1.5, M.metal(), 0, 1.0, 0);
    // cooling fins
    for (let i = 0; i < 9; i++) box(g, 0.04, 1.3, 1.52, M.darkMetal(), -1.0 + i * 0.25, 1.0, 0);
    // big turbine cylinder on top
    cyl(g, 0.55, 0.55, 2.2, M.steel(), 0, 2.05, 0, 0, 0, Math.PI / 2, 20);
    for (let i = 0; i < 5; i++) cyl(g, 0.58, 0.58, 0.08, M.darkMetal(), -0.9 + i * 0.45, 2.05, 0, 0, 0, Math.PI / 2, 20);
    // pipes into ceiling
    tube(g, new THREE.Vector3(-0.8, 2.4, 0), new THREE.Vector3(-0.8, LAB.WALL_H, 0), 0.15, M.rust());
    tube(g, new THREE.Vector3(0.8, 2.4, 0), new THREE.Vector3(0.8, LAB.WALL_H, 0.2), 0.12, M.rust());
    // hazard panel
    add(g, new THREE.PlaneGeometry(1.4, 0.3), signMat('DANGER HIGH VOLTAGE', '#c8a818'), 0, 1.55, 0.76);
    // fuse panel with 3 slots (the dynamic fuses are added by the world)
    box(g, 1.1, 0.6, 0.12, M.darkMetal(), 0, 0.9, 0.8);
    for (let i = 0; i < 3; i++) cyl(g, 0.1, 0.1, 0.06, M.rubber(), -0.35 + i * 0.35, 0.9, 0.87, Math.PI / 2, 0, 0);
    // cables snaking on the floor
    for (let i = 0; i < 4; i++) tube(g, new THREE.Vector3(U.rand(-1, 1), 0.05, 0.9), new THREE.Vector3(U.rand(-1.4, 1.4), 0.05, U.rand(1.2, 1.5)), 0.04, M.cable(), 6);
    return g;
  }

  // a glowing pickup
  function item(type) {
    const g = new THREE.Group();
    const inner = pivot(g, 0, 0, 0);
    if (type === 'K') {
      add(inner, new THREE.BoxGeometry(0.34, 0.22, 0.015), new THREE.MeshStandardMaterial({ map: T.keycard(), emissive: 0x551010, roughness: 0.4 }));
    } else if (type === 'F') {
      cyl(inner, 0.07, 0.07, 0.3, new THREE.MeshStandardMaterial({ color: 0xffa030, emissive: 0xff7000, emissiveIntensity: 1.6, transparent: true, opacity: 0.9 }), 0, 0, 0);
      cyl(inner, 0.08, 0.08, 0.07, M.steel(), 0, 0.17, 0);
      cyl(inner, 0.08, 0.08, 0.07, M.steel(), 0, -0.17, 0);
      cyl(inner, 0.02, 0.02, 0.05, M.steel(), 0, 0.23, 0);
      cyl(inner, 0.02, 0.02, 0.05, M.steel(), 0, -0.23, 0);
    } else if (type === 'A') {
      cyl(inner, 0.07, 0.07, 0.22, new THREE.MeshStandardMaterial({ color: 0xd4c020, emissive: 0x806a00, roughness: 0.4 }), 0, 0, 0);
      cyl(inner, 0.07, 0.07, 0.06, M.rubber(), 0, -0.09, 0);
      cyl(inner, 0.025, 0.025, 0.03, M.steel(), 0, 0.125, 0);
    } else if (type === 'M') {
      box(inner, 0.4, 0.26, 0.14, new THREE.MeshStandardMaterial({ color: 0xe8e8e8, emissive: 0x303030 }), 0, 0, 0);
      const red = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xaa0000 });
      box(inner, 0.2, 0.06, 0.02, red, 0, 0, 0.075);
      box(inner, 0.06, 0.2, 0.02, red, 0, 0, 0.075);
      box(inner, 0.14, 0.04, 0.04, M.rubber(), 0, 0.15, 0);
    } else if (type === 'I') { // road flare
      const red = mat('flareRed', () => new THREE.MeshStandardMaterial({ color: 0xc01010, emissive: 0x600000, roughness: 0.5 }));
      cyl(inner, 0.03, 0.03, 0.3, red, 0, 0, 0);
      cyl(inner, 0.033, 0.033, 0.06, M.rubber(), 0, 0.16, 0);
      box(inner, 0.062, 0.08, 0.001, M.white(), 0, -0.02, 0.03);
    } else if (type === 'N') {
      box(inner, 0.26, 0.34, 0.015, M.darkMetal(), 0, 0, 0); // clipboard
      add(inner, new THREE.PlaneGeometry(0.23, 0.29), new THREE.MeshStandardMaterial({ map: T.paper(), emissive: 0x333322, side: THREE.DoubleSide }), 0, -0.01, 0.01);
      box(inner, 0.1, 0.04, 0.03, M.steel(), 0, 0.16, 0.01);
    }
    const colors = { K: 0xff3030, F: 0xff9020, A: 0xffe040, M: 0xffffff, N: 0xa0ffb0, I: 0xff2010 };
    // soft glow sprite
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: colors[type], transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(1.1, 1.1, 1);
    g.add(glow);
    g.userData = { inner, glow };
    return g;
  }

  let _glow;
  function glowTex() {
    if (_glow) return _glow;
    _glow = new THREE.CanvasTexture(U.canvas(64, 64, (g) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    }));
    return _glow;
  }

  // ceiling light fixture; returns {group, lampMat}
  function ceilingLamp(broken) {
    const g = new THREE.Group();
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff0d0, emissive: 0xfff0d0, emissiveIntensity: 1.5 });
    const y = LAB.WALL_H;
    const hang = pivot(g, 0, y, 0);
    if (broken) { hang.rotation.z = 0.6; hang.rotation.x = 0.2; }
    box(hang, 1.3, 0.1, 0.35, M.darkMetal(), 0, -0.12, 0);
    box(hang, 1.2, 0.03, 0.26, lampMat, 0, -0.18, 0);
    tube(g, new THREE.Vector3(-0.5, y, 0), new THREE.Vector3(-0.5, y - 0.1, 0), 0.01, M.cable(), 4);
    g.userData = { lampMat, hang };
    return g;
  }

  // red spinning emergency beacon on the wall
  function beacon() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xff2010, emissive: 0xff1000, emissiveIntensity: 0.4, transparent: true, opacity: 0.85 });
    box(g, 0.25, 0.08, 0.25, M.darkMetal(), 0, 0, 0);
    const dome = sph(g, 0.13, mat, 0, 0.06, 0, 1, 1.2, 1);
    const spin = pivot(g, 0, 0.08, 0);
    box(spin, 0.18, 0.05, 0.02, M.steel(), 0, 0, 0);
    g.userData = { mat, spin };
    return g;
  }

  function door(type) {
    const g = new THREE.Group();
    const C = LAB.CELL, H = LAB.WALL_H;
    const panelMat = new THREE.MeshStandardMaterial({ map: T.wallMetal(), color: 0x9aa0a6, roughness: 0.4, metalness: 0.7 });
    const stripe = type === 'D' ? signMat('SECURITY', '#b01818', '#fff') : type === 'P' ? signMat('ELEVATOR', '#18408a', '#fff') :
      type === 'B' ? signMat('2 PERSON LOCK', '#c8a818') : type === 'H' ? signMat('2 PERSON LOCK', '#18a8b8') : signMat('LEVEL -13', '#c8a818');
    // frame
    box(g, 0.25, H, 0.5, M.darkMetal(), -C / 2 + 0.12, H / 2, 0);
    box(g, 0.25, H, 0.5, M.darkMetal(), C / 2 - 0.12, H / 2, 0);
    box(g, C, 0.5, 0.5, M.darkMetal(), 0, H - 0.25, 0);
    const panels = [];
    for (const side of [-1, 1]) {
      const p = pivot(g, side * C / 4, 0, 0);
      box(p, C / 2 - 0.1, H - 0.5, 0.18, panelMat, side * 0.05 - side * 0.05, (H - 0.5) / 2, 0);
      add(p, new THREE.PlaneGeometry(C / 2 - 0.2, 0.3), stripe, 0, 1.4, 0.095);
      add(p, new THREE.PlaneGeometry(C / 2 - 0.2, 0.3), stripe, 0, 1.4, -0.095, 0, Math.PI, 0);
      box(p, 0.3, 0.4, 0.2, M.glassCrack(), 0, 2.0, 0);
      panels.push({ p, side, base: side * C / 4 });
    }
    // status light (red = locked, green = open)
    const light = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff0000, emissiveIntensity: 2 });
    box(g, 0.15, 0.15, 0.56, light, C / 2 - 0.12, H - 0.7, 0);
    if (type === 'D') { // card reader
      box(g, 0.18, 0.28, 0.6, M.darkMetal(), -C / 2 + 0.12, 1.3, 0);
      box(g, 0.12, 0.05, 0.62, light, -C / 2 + 0.12, 1.4, 0);
    }
    g.userData = { panels, light };
    return g;
  }

  // wall button for two-person locks
  function wallButton(color) {
    const g = new THREE.Group();
    box(g, 0.5, 0.7, 0.1, M.darkMetal(), 0, 1.3, 0);
    add(g, new THREE.PlaneGeometry(0.46, 0.12), signMat('HOLD', color === 0xffd020 ? '#c8a818' : '#18a8b8'), 0, 1.58, 0.052);
    const btnMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
    const btn = cyl(g, 0.12, 0.12, 0.08, btnMat, 0, 1.25, 0.08, Math.PI / 2, 0, 0, 16);
    btn.userData.keep = true;
    g.userData = { btn, btnMat };
    return g;
  }

  // the freight elevator car (3 cells wide x 2 deep)
  function elevator() {
    const g = new THREE.Group();
    const C = LAB.CELL, W = C * 3, D = C * 2, H = LAB.WALL_H;
    box(g, W, 0.1, D, M.grate(), 0, 0.05, 0);
    // cage bars on 3 sides
    for (let i = 0; i <= 12; i++) {
      const x = -W / 2 + i * W / 12;
      box(g, 0.06, H, 0.06, M.metal(), x, H / 2, D / 2 - 0.1);
    }
    for (let i = 0; i <= 8; i++) {
      const z = -D / 2 + i * D / 8;
      box(g, 0.06, H, 0.06, M.metal(), -W / 2 + 0.1, H / 2, z);
      box(g, 0.06, H, 0.06, M.metal(), W / 2 - 0.1, H / 2, z);
    }
    for (const y of [0.9, 2.2]) {
      box(g, W, 0.08, 0.08, M.yellow(), 0, y, D / 2 - 0.1);
      box(g, 0.08, 0.08, D, M.yellow(), -W / 2 + 0.1, y, 0);
      box(g, 0.08, 0.08, D, M.yellow(), W / 2 - 0.1, y, 0);
    }
    box(g, W, 0.15, D, M.darkMetal(), 0, H - 0.08, 0);
    // control panel
    box(g, 0.4, 0.7, 0.12, M.darkMetal(), W / 2 - 0.4, 1.3, D / 2 - 0.2);
    const btn = new THREE.MeshStandardMaterial({ color: 0xff3020, emissive: 0xff2000, emissiveIntensity: 1 });
    box(g, 0.12, 0.12, 0.05, btn, W / 2 - 0.4, 1.4, D / 2 - 0.28);
    add(g, new THREE.PlaneGeometry(1.8, 0.4), signMat('SURFACE LIFT', '#c8a818'), 0, 2.6, D / 2 - 0.16, 0, Math.PI, 0);
    // front gate that closes at the end (starts open, up in the ceiling)
    const gate = pivot(g, 0, H, -D / 2 + 0.05);
    for (let i = 0; i <= 14; i++) box(gate, 0.05, H, 0.05, M.metal(), -W / 2 + i * W / 14, -H / 2, 0);
    for (const y of [-0.5, -1.6, -2.8]) box(gate, W, 0.07, 0.07, M.yellow(), 0, y, 0);
    gate.position.y = H * 2 - 0.2;
    g.userData = { gate, btn };
    return g;
  }

  // flesh growths on floors and walls (the alien is taking over the lab)
  function fleshGrowth(rnd) {
    const g = new THREE.Group();
    const n = U.randInt(3, 7);
    for (let i = 0; i < n; i++) sph(g, U.rand(0.15, 0.45), rnd() < 0.5 ? M.flesh() : M.fleshWet(), U.rand(-0.8, 0.8), 0, U.rand(-0.8, 0.8), 1, U.rand(0.3, 0.7), 1, 10);
    if (rnd() < 0.5) { // alien egg sacs
      for (let i = 0; i < U.randInt(1, 3); i++) {
        const x = U.rand(-0.6, 0.6), z = U.rand(-0.6, 0.6);
        sph(g, 0.22, M.alienRed(), x, 0.25, z, 1, 1.3, 1);
        sph(g, 0.08, M.goo(), x, 0.5, z, 1, 0.5, 1);
      }
    }
    return g;
  }

  // ---------- small clutter ----------
  const lockerMat = () => mat('locker', () => new THREE.MeshStandardMaterial({ map: T.wallMetal(), color: 0x6a7a70, roughness: 0.5, metalness: 0.6 }));
  function lockers(rnd) { // bank of 3 lockers, one hanging open
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const x = (i - 1) * 0.52;
      box(g, 0.5, 1.9, 0.5, lockerMat(), x, 0.95, 0);
      for (let s = 0; s < 4; s++) box(g, 0.3, 0.02, 0.01, M.darkMetal(), x, 1.6 + s * 0.05, 0.255);
      if (i === 1 && rnd() < 0.6) { // open door with a bloody coat inside
        box(g, 0.02, 1.8, 0.46, lockerMat(), x + 0.25, 0.95, 0.48, 0, -0.9, 0);
        box(g, 0.44, 1.8, 0.02, M.rubber(), x, 0.95, 0.2);
        box(g, 0.3, 0.8, 0.1, M.coat(), x, 1.3, 0.1);
      } else box(g, 0.04, 0.12, 0.03, M.steel(), x + 0.18, 1.0, 0.26);
    }
    return g;
  }
  function cabinet(rnd) { // tall supply cabinet with glass doors
    const g = new THREE.Group();
    box(g, 1.2, 2.0, 0.5, M.white(), 0, 1.0, 0);
    box(g, 1.1, 1.0, 0.02, M.glassCrack(), 0, 1.45, 0.26);
    for (let s = 0; s < 2; s++) {
      box(g, 1.1, 0.02, 0.44, M.metal(), 0, 1.05 + s * 0.45, 0);
      for (let k = 0; k < 4; k++) if (rnd() < 0.7) cyl(g, 0.05, 0.05, U.rand(0.1, 0.25), [M.greenLiquid(), M.bloodBright(), M.blueLiquid(), M.white()][k], -0.4 + k * 0.26, 1.15 + s * 0.45, 0);
    }
    for (let k = 0; k < 2; k++) box(g, 0.5, 0.35, 0.02, M.white(), -0.27 + k * 0.54, 0.5, 0.26);
    return g;
  }
  function cart(rnd) { // steel cart with tools, maybe tipped over
    const g = new THREE.Group();
    const in_ = pivot(g, 0, 0, 0);
    box(in_, 0.9, 0.03, 0.5, M.steel(), 0, 0.85, 0);
    box(in_, 0.9, 0.03, 0.5, M.steel(), 0, 0.35, 0);
    for (const x of [-0.42, 0.42]) for (const z of [-0.22, 0.22]) { box(in_, 0.03, 0.85, 0.03, M.steel(), x, 0.44, z); sph(in_, 0.04, M.rubber(), x, 0.04, z, 1, 1, 1, 6); }
    for (let i = 0; i < 4; i++) box(in_, U.rand(0.05, 0.2), 0.02, 0.03, M.steel(), U.rand(-0.3, 0.3), 0.875, U.rand(-0.15, 0.15), 0, rnd() * 3, 0);
    box(in_, 0.3, 0.05, 0.2, M.bloodBright(), 0.2, 0.88, 0);
    if (rnd() < 0.35) { in_.rotation.z = Math.PI / 2; in_.position.set(0.85, 0.25, 0); }
    return g;
  }
  function papers(rnd) {
    const g = new THREE.Group();
    const n = U.randInt(3, 9);
    for (let i = 0; i < n; i++) add(g, new THREE.PlaneGeometry(0.21, 0.29), M.paper(), U.rand(-0.9, 0.9), 0.006 + i * 0.001, U.rand(-0.9, 0.9), -Math.PI / 2, 0, rnd() * 6);
    return g;
  }
  function debris(rnd) { // fallen ceiling tiles and rubble
    const g = new THREE.Group();
    for (let i = 0; i < U.randInt(2, 4); i++) box(g, U.rand(0.4, 0.7), 0.03, U.rand(0.4, 0.7), M.darkMetal(), U.rand(-0.7, 0.7), 0.05, U.rand(-0.7, 0.7), U.rand(-0.2, 0.2), rnd() * 3, U.rand(-0.2, 0.2));
    for (let i = 0; i < U.randInt(3, 8); i++) box(g, U.rand(0.05, 0.18), U.rand(0.05, 0.12), U.rand(0.05, 0.18), M.plastic(), U.rand(-0.8, 0.8), 0.04, U.rand(-0.8, 0.8), rnd(), rnd(), rnd());
    tube(g, new THREE.Vector3(U.rand(-0.5, 0.5), LAB.WALL_H, U.rand(-0.5, 0.5)), new THREE.Vector3(U.rand(-0.5, 0.5), U.rand(1.8, 2.6), U.rand(-0.5, 0.5)), 0.015, M.cable(), 4);
    return g;
  }
  function bin(rnd) {
    const g = new THREE.Group();
    if (rnd() < 0.5) { cyl(g, 0.2, 0.16, 0.45, M.darkMetal(), 0, 0.23, 0); }
    else { cyl(g, 0.2, 0.16, 0.45, M.darkMetal(), 0, 0.2, 0, Math.PI / 2, rnd() * 3, 0); for (let i = 0; i < 4; i++) sph(g, 0.06, M.white(), U.rand(0.2, 0.6), 0.05, U.rand(-0.3, 0.3), 1, 0.7, 1, 6); }
    return g;
  }
  function extinguisher() { // hangs on a wall
    const g = new THREE.Group();
    const red = mat('extRed', () => new THREE.MeshStandardMaterial({ color: 0xb01010, roughness: 0.35, metalness: 0.3 }));
    box(g, 0.3, 0.06, 0.15, M.darkMetal(), 0, 1.5, 0.05);
    cyl(g, 0.08, 0.08, 0.5, red, 0, 1.25, 0.14);
    cyl(g, 0.03, 0.04, 0.08, M.rubber(), 0, 1.53, 0.14);
    tube(g, new THREE.Vector3(0.02, 1.53, 0.14), new THREE.Vector3(0.1, 1.2, 0.2), 0.012, M.rubber(), 4);
    return g;
  }
  function bodyBag(rnd) {
    const g = new THREE.Group();
    const bag = mat('bag', () => new THREE.MeshStandardMaterial({ color: 0x151a18, roughness: 0.25, metalness: 0.2 }));
    const b = pivot(g, 0, 0, 0);
    sph(b, 0.3, bag, 0, 0.14, 0, 0.9, 0.45, 3);
    sph(b, 0.16, bag, 0, 0.16, 0.85, 1, 0.8, 1);
    box(b, 0.02, 0.02, 1.6, M.steel(), 0.08, 0.28, 0);
    b.rotation.y = rnd() * 6;
    return g;
  }
  function wetSign() {
    const g = new THREE.Group();
    const y = mat('wetSign', () => new THREE.MeshStandardMaterial({ map: T.sign('CAUTION', '#d8c020'), roughness: 0.5 }));
    box(g, 0.3, 0.6, 0.02, y, 0, 0.3, 0.1, -0.25, 0, 0);
    box(g, 0.3, 0.6, 0.02, y, 0, 0.3, -0.1, 0.25, Math.PI, 0);
    return g;
  }

  // ---------- more lab props ----------
  function surgeryTable(rnd) {
    const g = new THREE.Group();
    cyl(g, 0.35, 0.45, 0.1, M.darkMetal(), 0, 0.05, 0);
    cyl(g, 0.1, 0.12, 0.75, M.steel(), 0, 0.45, 0);
    box(g, 0.7, 0.1, 2.0, M.steel(), 0, 0.85, 0);
    box(g, 0.62, 0.06, 1.9, M.sheetBloody(), 0, 0.93, 0);
    // restraint straps
    for (const z of [-0.6, 0, 0.6]) box(g, 0.72, 0.03, 0.08, M.rubber(), 0, 0.97, z);
    // broken straps + blood pool
    box(g, 0.3, 0.02, 0.08, M.rubber(), 0.45, 0.6, 0.6, 0, 0, 1.2);
    add(g, new THREE.CircleGeometry(0.8, 16), M.blood(), 0.2, 0.012, 0.3, -Math.PI / 2, 0, 0);
    // surgical lamp hanging from the ceiling
    const H = LAB.WALL_H;
    cyl(g, 0.03, 0.03, 0.8, M.steel(), 0, H - 0.4, -0.3);
    tube(g, new THREE.Vector3(0, H - 0.8, -0.3), new THREE.Vector3(0.4, H - 1.0, 0.2), 0.025, M.steel());
    const lamp = pivot(g, 0.4, H - 1.05, 0.2);
    lamp.rotation.x = 0.3;
    cyl(lamp, 0.35, 0.2, 0.12, M.white(), 0, 0, 0);
    for (let i = 0; i < 5; i++) { const a = i / 5 * 6.28; sph(lamp, 0.06, M.lampOff(), Math.cos(a) * 0.2, -0.07, Math.sin(a) * 0.2, 1, 0.5, 1, 8); }
    // tool tray on a stand
    cyl(g, 0.02, 0.02, 1.0, M.steel(), 0.8, 0.5, -0.6);
    box(g, 0.5, 0.02, 0.35, M.steel(), 0.8, 1.0, -0.6);
    for (let i = 0; i < 5; i++) box(g, 0.02, 0.01, U.rand(0.1, 0.2), M.steel(), 0.65 + i * 0.07, 1.015, -0.6, 0, U.rand(-0.3, 0.3), 0);
    box(g, 0.08, 0.02, 0.08, M.bloodBright(), 0.95, 1.02, -0.5);
    return g;
  }

  // a person wrapped in alien flesh, stuck to the wall (+z = away from wall)
  function cocoon(rnd) {
    const g = new THREE.Group();
    const body = pivot(g, 0, 0, 0.25);
    sph(body, 0.38, M.flesh(), 0, 1.25, 0, 1, 2.1, 0.85);
    sph(body, 0.3, M.fleshWet(), 0, 0.5, 0.05, 1.2, 1.1, 0.9);
    sph(body, 0.2, M.alienRed(), 0.12, 1.7, 0.1, 1, 1.2, 1);
    // a face pushing through the flesh
    sph(body, 0.12, M.skinDead(), -0.05, 1.72, 0.28, 0.9, 1.1, 0.6);
    sph(body, 0.03, M.eyeBlack(), -0.1, 1.76, 0.36, 1, 1, 1, 6);
    sph(body, 0.03, M.eyeBlack(), 0.0, 1.76, 0.36, 1, 1, 1, 6);
    sph(body, 0.04, M.mouth(), -0.05, 1.65, 0.36, 1.2, 0.8, 0.5, 6);
    // a hand reaching out
    const arm = pivot(body, 0.25, 1.25, 0.2);
    arm.rotation.set(-0.9, 0, -0.5);
    box(arm, 0.08, 0.35, 0.08, M.skinDead(), 0, 0.15, 0);
    for (let f = 0; f < 4; f++) box(arm, 0.015, 0.09, 0.015, M.skinDead(), -0.03 + f * 0.02, 0.37, 0.01);
    // stringy flesh attaching it to wall and floor
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      tube(g, new THREE.Vector3(Math.cos(a) * 0.3, 1.2 + Math.sin(a) * 0.8, 0.2), new THREE.Vector3(Math.cos(a) * 0.9, 1.2 + Math.sin(a) * 1.2, 0), 0.025, M.fleshWet(), 5);
    }
    add(g, new THREE.CircleGeometry(0.9, 14), M.goo(), 0, 0.012, 0.5, -Math.PI / 2, 0, 0);
    return g;
  }

  function vendingMachine(rnd) {
    const g = new THREE.Group();
    const front = mat('vendFront', () => new THREE.MeshStandardMaterial({ map: T.vending(), emissive: 0xffffff, emissiveMap: T.vending(), emissiveIntensity: 0.55, roughness: 0.3 }));
    box(g, 0.95, 1.9, 0.8, M.darkMetal(), 0, 0.95, 0);
    add(g, new THREE.PlaneGeometry(0.85, 1.75), front, 0, 0.97, 0.402);
    add(g, new THREE.PlaneGeometry(0.62, 1.2), M.glassCrack(), -0.08, 1.15, 0.41);
    for (let i = 0; i < 3; i++) box(g, U.rand(0.08, 0.15), 0.04, 0.1, [M.yellow(), M.bloodBright(), M.white()][i], U.rand(-0.6, 0.6), 0.02, U.rand(0.5, 0.9), 0, rnd() * 3, 0); // spilled snacks
    return g;
  }

  function monitorWall(rnd) {
    const g = new THREE.Group();
    box(g, 2.2, 0.8, 0.7, M.darkMetal(), 0, 0.4, 0); // desk console
    box(g, 2.2, 0.05, 0.75, M.plastic(), 0, 0.82, 0.02);
    for (let i = 0; i < 12; i++) box(g, 0.05, 0.03, 0.05, [M.ledGreen(), M.ledRed(), M.ledOrange()][i % 3], -0.9 + i * 0.16, 0.86, 0.25);
    const screens = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
      const idx = r * 3 + c;
      const sm = mat('staticM' + (idx % 6), () => new THREE.MeshStandardMaterial({ map: T.static(idx), emissive: 0xffffff, emissiveMap: T.static(idx), emissiveIntensity: 0.7, roughness: 0.2 }));
      box(g, 0.66, 0.5, 0.35, M.rubber(), -0.7 + c * 0.7, 1.2 + r * 0.54, -0.1);
      add(g, new THREE.PlaneGeometry(0.58, 0.42), sm, -0.7 + c * 0.7, 1.2 + r * 0.54, 0.076);
    }
    return g;
  }

  // a window in the wall; the glass is cracked and bloody
  function windowPane(rnd) {
    const g = new THREE.Group();
    const C = LAB.CELL, H = LAB.WALL_H;
    const wall = mat('winWall', () => new THREE.MeshStandardMaterial({ map: T.wallMetal(), roughness: 0.6, metalness: 0.4 }));
    box(g, C, 1.0, C * 0.9, wall, 0, 0.5, 0);
    box(g, C, H - 2.3, C * 0.9, wall, 0, (H + 2.3) / 2, 0);
    box(g, C, 0.08, 0.2, M.darkMetal(), 0, 1.02, 0);
    box(g, C, 0.08, 0.2, M.darkMetal(), 0, 2.28, 0);
    for (const x of [-C / 2 + 0.05, 0, C / 2 - 0.05]) box(g, 0.08, 1.3, 0.2, M.darkMetal(), x, 1.65, 0);
    add(g, new THREE.PlaneGeometry(C, 1.25), mat('winGlass', () => new THREE.MeshStandardMaterial({ color: 0x7fa8b8, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })), 0, 1.65, 0);
    const hands = mat('winHands', () => new THREE.MeshStandardMaterial({ map: T.handprints(), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    if (rnd() < 0.7) add(g, new THREE.PlaneGeometry(1.1, 1.1), hands, U.rand(-0.6, 0.6), 1.6, 0.01);
    return g;
  }

  // a hole torn through the wall (+z = out of the wall)
  function wallHole(rnd) {
    const g = new THREE.Group();
    const ring = add(g, new THREE.TorusGeometry(0.7, 0.18, 8, 18), M.flesh(), 0, 1.0, 0.02);
    ring.scale.set(1, 1.2, 0.6);
    const dark = mat('holeDark', () => new THREE.MeshBasicMaterial({ color: 0x000000 }));
    add(g, new THREE.CircleGeometry(0.72, 18), dark, 0, 1.0, 0.03).scale.set(1, 1.2, 1);
    for (let i = 0; i < 9; i++) { // broken concrete bits + tendrils
      const a = rnd() * 6.28;
      box(g, U.rand(0.1, 0.3), U.rand(0.08, 0.2), U.rand(0.1, 0.25), M.plastic(), Math.cos(a) * U.rand(0.8, 1.3), 0.06, U.rand(0.2, 0.8), rnd(), rnd(), rnd());
      tube(g, new THREE.Vector3(Math.cos(a) * 0.7, 1.0 + Math.sin(a) * 0.84, 0.05), new THREE.Vector3(Math.cos(a) * 1.1, 1.0 + Math.sin(a) * 1.1, 0.25), 0.03, M.fleshWet(), 5);
    }
    return g;
  }

  // big square support column
  function pillar(rnd) {
    const g = new THREE.Group();
    const conc = mat('pillar', () => new THREE.MeshStandardMaterial({ map: T.wallConcrete(), roughness: 0.9 }));
    box(g, 0.7, LAB.WALL_H, 0.7, conc, 0, LAB.WALL_H / 2, 0);
    box(g, 0.8, 0.25, 0.8, M.yellow(), 0, 0.125, 0);
    box(g, 0.78, 0.2, 0.78, M.darkMetal(), 0, LAB.WALL_H - 0.1, 0);
    if (rnd() < 0.5) { // pipes running up the side
      cyl(g, 0.06, 0.06, LAB.WALL_H, M.rust(), 0.42, LAB.WALL_H / 2, 0.2);
      cyl(g, 0.04, 0.04, LAB.WALL_H, M.metal(), 0.42, LAB.WALL_H / 2, -0.1);
    }
    if (rnd() < 0.5) box(g, 0.3, 0.4, 0.12, M.darkMetal(), 0, 1.4, 0.4); // junction box
    return g;
  }
  // big electrical transformer with warning lights
  function transformer(rnd) {
    const g = new THREE.Group();
    box(g, 1.4, 1.8, 1.0, M.metal(), 0, 0.9, 0);
    for (let i = 0; i < 6; i++) box(g, 1.42, 0.04, 1.02, M.darkMetal(), 0, 0.3 + i * 0.26, 0);
    add(g, new THREE.PlaneGeometry(0.8, 0.25), signMat('DANGER', '#c8a818'), 0, 1.5, 0.51);
    box(g, 0.08, 0.08, 0.02, rnd() < 0.5 ? M.ledRed() : M.ledOrange(), 0.5, 1.7, 0.51);
    for (let i = 0; i < 3; i++) { // insulators on top
      cyl(g, 0.08, 0.1, 0.35, M.white(), -0.45 + i * 0.45, 1.97, 0);
      for (let k = 0; k < 3; k++) cyl(g, 0.12, 0.12, 0.03, M.white(), -0.45 + i * 0.45, 1.85 + k * 0.1, 0);
      tube(g, new THREE.Vector3(-0.45 + i * 0.45, 2.15, 0), new THREE.Vector3(-0.45 + i * 0.45, LAB.WALL_H, 0.3), 0.02, M.cable(), 4);
    }
    return g;
  }
  // bundle of pipes from floor to ceiling with valves
  function pipeCluster(rnd) {
    const g = new THREE.Group();
    const n = U.randInt(2, 4);
    for (let i = 0; i < n; i++) {
      const x = U.rand(-0.35, 0.35), z = U.rand(-0.35, 0.35), r = U.rand(0.07, 0.15);
      const m = rnd() < 0.5 ? M.rust() : M.metal();
      cyl(g, r, r, LAB.WALL_H, m, x, LAB.WALL_H / 2, z);
      cyl(g, r + 0.03, r + 0.03, 0.08, M.darkMetal(), x, U.rand(0.4, 2.6), z);
      if (i === 0) { // valve wheel
        const v = add(g, new THREE.TorusGeometry(0.15, 0.02, 6, 14), M.bloodBright(), x, 1.3, z + r + 0.1);
        box(g, 0.02, 0.28, 0.02, M.bloodBright(), x, 1.3, z + r + 0.1);
      }
    }
    return g;
  }
  // round table with chairs (break room)
  function breakTable(rnd) {
    const g = new THREE.Group();
    cyl(g, 0.6, 0.6, 0.04, M.white(), 0, 0.75, 0, 0, 0, 0, 20);
    cyl(g, 0.05, 0.05, 0.75, M.steel(), 0, 0.37, 0);
    cyl(g, 0.3, 0.3, 0.03, M.steel(), 0, 0.02, 0);
    cyl(g, 0.045, 0.04, 0.1, M.white(), 0.2, 0.82, 0.1); // mug
    add(g, new THREE.PlaneGeometry(0.3, 0.3), M.paper(), -0.2, 0.772, -0.1, -Math.PI / 2, 0, 0.5);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + rnd();
      const ch = pivot(g, Math.cos(a) * 0.85, 0, Math.sin(a) * 0.85);
      ch.rotation.y = -a - Math.PI / 2;
      if (rnd() < 0.3) { ch.rotation.z = Math.PI / 2; ch.position.y = 0.25; }
      box(ch, 0.42, 0.05, 0.42, M.chair(), 0, 0.45, 0);
      box(ch, 0.42, 0.45, 0.05, M.chair(), 0, 0.7, -0.19);
      for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) box(ch, 0.03, 0.45, 0.03, M.steel(), x, 0.22, z);
    }
    return g;
  }

  function vent() {
    const g = new THREE.Group();
    box(g, 0.9, 0.6, 0.06, M.darkMetal(), 0, 0, 0);
    add(g, new THREE.PlaneGeometry(0.8, 0.5), M.grate(), 0, 0, 0.035);
    return g;
  }

  // glue parts together so the game runs fast (animation still works)
  const opt = (f) => (...a) => U.optimize(f(...a));
  return {
    M, mat, human: opt(human), animateHuman, corpse, viewModel: opt(viewModel), setWatch,
    crawler: opt(crawler), animateCrawler, husk: opt(husk), animateHusk, spitter: opt(spitter), animateSpitter, acidBlob, flare, claw: opt(claw), stalker: opt(stalker), animateStalker, hanger: opt(hanger), setTongue, scareFace: opt(scareFace),
    cryoPod, specimenTank, labTable, desk, serverRack, crates, barrels, shelf, morgueBed, generator,
    item: opt(item), ceilingLamp: opt(ceilingLamp), beacon: opt(beacon), door: opt(door), wallButton: opt(wallButton), elevator: opt(elevator), fleshGrowth, vent, signMat, glowTex,
    lockers, cabinet, cart, papers, debris, bin, extinguisher, bodyBag, wetSign,
    surgeryTable, cocoon, vendingMachine, monitorWall, windowPane, wallHole, pillar, transformer, pipeCluster, breakTable,
    helpers: { box, cyl, sph, cone, tube, pivot, add },
  };
})();
