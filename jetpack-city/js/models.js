// ============================================================
//  JETPACK CITY — 3D MODELS
//  Everything is built from simple shapes glued together:
//  boxes, balls, capsules, cones and cylinders.
//  The hero and MEGA-BOT look toward -Z (the way you run).
// ============================================================
window.JC = window.JC || {};

JC.Models = (function () {
  const U = JC.U, T = JC.Tex;

  // ---------- materials (shared so the game stays fast on phones) ----------
  const mats = {};
  const lam = (color, extra = {}) => {
    const key = 'l' + color + JSON.stringify(extra);
    return mats[key] || (mats[key] = new THREE.MeshLambertMaterial(Object.assign({ color }, extra)));
  };
  const basic = (color, extra = {}) => {
    const key = 'b' + color + JSON.stringify(extra);
    return mats[key] || (mats[key] = new THREE.MeshBasicMaterial(Object.assign({ color }, extra)));
  };
  const glowy = (color, opacity = 1) => {
    const key = 'g' + color + '_' + opacity;
    return mats[key] || (mats[key] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  };
  const spriteMat = (color, opacity = 1) => {
    const key = 's' + color + '_' + opacity;
    return mats[key] || (mats[key] = new THREE.SpriteMaterial({ map: T.glow(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  };
  const texMat = (key, make) => mats[key] || (mats[key] = make());

  // ---------- geometries (made once, used many times) ----------
  const geos = {};
  const geo = (key, make) => geos[key] || (geos[key] = make());
  const G = {
    box: () => geo('box', () => new THREE.BoxGeometry(1, 1, 1)),
    sphere: () => geo('sphere', () => new THREE.SphereGeometry(1, 16, 12)),
    cyl: () => geo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 16)),
    cyl6: () => geo('cyl6', () => new THREE.CylinderGeometry(1, 1, 1, 6)),
    cone: () => geo('cone', () => new THREE.ConeGeometry(1, 1, 14)),
    torus: () => geo('torus', () => new THREE.TorusGeometry(1, 0.28, 8, 20, Math.PI)),
    plane: () => geo('plane', () => new THREE.PlaneGeometry(1, 1)),
    cap: (r, len) => geo('cap' + r + '_' + len, () => new THREE.CapsuleGeometry(r, len, 4, 10)),
    rbox: (w, h, d, r) => geo('rbox' + [w, h, d, r].join('_'), () => roundedBox(w, h, d, r)),
  };

  // a box with round edges
  function roundedBox(w, h, d, r, seg = 2) {
    const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
    const p = g.attributes.position;
    const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
    const v = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      c.set(U.clamp(v.x, -hx, hx), U.clamp(v.y, -hy, hy), U.clamp(v.z, -hz, hz));
      v.sub(c);
      if (v.lengthSq() > 0) v.normalize().multiplyScalar(r);
      v.add(c);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  }

  // put a mesh into a group: P(group, geometry, material, [x,y,z], scale, [rx,ry,rz])
  function P(parent, g, mat, pos = [0, 0, 0], s = 1, rot = null) {
    const m = new THREE.Mesh(g, mat);
    m.position.set(pos[0], pos[1], pos[2]);
    if (Array.isArray(s)) m.scale.set(s[0], s[1], s[2]); else m.scale.setScalar(s);
    if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(m);
    return m;
  }
  // glue many small pieces that share a material into ONE mesh, so the phone draws them all at once.
  // Pieces marked with userData.keep (things that move or blink) stay separate.
  // With a "key", the glued shapes are remembered and shared by every copy of the same model.
  const merged = {};
  function mergeStatic(group, key) {
    group.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const buckets = new Map();
    for (const m of group.children.slice()) {
      if (!m.isMesh || m.userData.keep || Array.isArray(m.material)) continue;
      if (!buckets.has(m.material)) buckets.set(m.material, []);
      buckets.get(m.material).push(m);
    }
    let i = 0;
    for (const [mat, list] of buckets) {
      const k = key ? key + '|' + (i++) : null;
      if (list.length < 2) continue;
      let g = k && merged[k];
      if (!g) {
        const parts = list.map((m) => {
          const mg = (m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone());
          mg.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
          return mg;
        });
        g = mergeGeos(parts);
        parts.forEach((q) => q.dispose());
        if (k) merged[k] = g;
      }
      for (const m of list) group.remove(m);
      group.add(new THREE.Mesh(g, mat));
    }
    return group;
  }
  function mergeGeos(parts) {
    const out = new THREE.BufferGeometry();
    for (const name of ['position', 'normal', 'uv']) {
      if (!parts.every((q) => q.attributes[name])) continue;
      const size = parts[0].attributes[name].itemSize;
      let total = 0;
      for (const q of parts) total += q.attributes[name].count;
      const arr = new Float32Array(total * size);
      let off = 0;
      for (const q of parts) { arr.set(q.attributes[name].array, off); off += q.attributes[name].array.length; }
      out.setAttribute(name, new THREE.BufferAttribute(arr, size));
    }
    out.computeBoundingSphere();
    return out;
  }

  function grp(parent, pos = [0, 0, 0]) {
    const g = new THREE.Group();
    g.position.set(pos[0], pos[1], pos[2]);
    if (parent) parent.add(g);
    return g;
  }
  function glowSprite(parent, color, size, pos, opacity = 1) {
    const s = new THREE.Sprite(spriteMat(color, opacity));
    s.scale.set(size, size, 1);
    s.position.set(pos[0], pos[1], pos[2]);
    parent.add(s);
    return s;
  }

  // ============================================================
  //  THE HERO: a kid in a helmet with a jetpack
  // ============================================================
  function hero() {
    const root = new THREE.Group();
    const body = grp(root, [0, 0.88, 0]);      // turns around the hips
    // this hero gets their own materials, so the garage can recolor them
    const m = {
      suit: new THREE.MeshLambertMaterial(), pants: new THREE.MeshLambertMaterial(), helmet: new THREE.MeshLambertMaterial(),
      visor: new THREE.MeshLambertMaterial({ emissiveIntensity: 0.9 }), shoes: new THREE.MeshLambertMaterial(),
      tank: new THREE.MeshLambertMaterial(), stripe: new THREE.MeshLambertMaterial({ emissiveIntensity: 0.5 }),
      flame: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }),
      flameGlow: new THREE.SpriteMaterial({ map: T.glow(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    };
    const dark = lam(0x22222c), core = basic(0xfff6d0, { transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });

    // chest and belt
    P(body, G.rbox(0.46, 0.52, 0.28, 0.08), m.suit, [0, 0.3, 0]);
    P(body, G.box(), dark, [0, 0.05, 0], [0.48, 0.08, 0.3]);
    P(body, G.sphere(), m.visor, [0, 0.38, -0.14], [0.07, 0.07, 0.02]);
    P(body, G.cyl(), m.suit, [0, 0.6, 0], [0.07, 0.1, 0.07]);

    // head with a helmet and a glowing visor
    const head = grp(body, [0, 0.74, 0]);
    P(head, G.sphere(), m.helmet, [0, 0, 0], 0.2);
    P(head, G.sphere(), m.visor, [0, 0.0, -0.07], [0.17, 0.1, 0.15]);
    P(head, G.box(), m.stripe, [0, 0.17, 0.02], [0.05, 0.08, 0.3]);
    P(head, G.cyl(), dark, [0.2, 0, 0], [0.05, 0.03, 0.05], [0, 0, Math.PI / 2]);
    P(head, G.cyl(), dark, [-0.2, 0, 0], [0.05, 0.03, 0.05], [0, 0, Math.PI / 2]);

    // arms
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = grp(body, [s * 0.29, 0.5, 0]);
      P(sh, G.sphere(), m.suit, [0, 0, 0], 0.09);
      P(sh, G.cap(0.07, 0.2), m.suit, [0, -0.14, 0]);
      const el = grp(sh, [0, -0.29, 0]);
      P(el, G.cap(0.065, 0.18), m.suit, [0, -0.12, 0]);
      P(el, G.sphere(), m.shoes, [0, -0.27, 0], 0.08);
      arms.push({ sh, el, side: s });
    }
    // legs
    const legs = [];
    for (const s of [-1, 1]) {
      const hip = grp(body, [s * 0.12, 0, 0]);
      P(hip, G.cap(0.09, 0.24), m.pants, [0, -0.2, 0]);
      const kn = grp(hip, [0, -0.42, 0]);
      P(kn, G.cap(0.08, 0.22), m.pants, [0, -0.2, 0]);
      P(kn, G.rbox(0.15, 0.1, 0.27, 0.04), m.shoes, [0, -0.42, -0.04]);
      legs.push({ hip, kn, side: s });
    }

    // the jetpack!
    const jet = grp(body, [0, 0.32, 0.22]);
    const flames = [];
    for (const s of [-1, 1]) {
      P(jet, G.cyl(), m.tank, [s * 0.11, 0, 0], [0.1, 0.44, 0.1]);
      P(jet, G.sphere(), m.tank, [s * 0.11, 0.22, 0], 0.1);
      P(jet, G.cyl(), m.stripe, [s * 0.11, 0.08, 0], [0.104, 0.06, 0.104]);
      P(jet, G.cone(), dark, [s * 0.11, -0.28, 0], [0.08, 0.12, 0.08], [Math.PI, 0, 0]);
      const f = grp(jet, [s * 0.11, -0.34, 0]);
      const outer = P(f, G.cone(), m.flame, [0, -0.2, 0], [0.075, 0.4, 0.075], [Math.PI, 0, 0]);
      P(f, G.cone(), core, [0, -0.1, 0], [0.04, 0.2, 0.04], [Math.PI, 0, 0]);
      const gl = new THREE.Sprite(m.flameGlow); gl.scale.set(0.5, 0.5, 1); gl.position.set(0, -0.12, 0); f.add(gl);
      flames.push({ f, outer, gl });
    }
    P(jet, G.box(), dark, [0, 0.02, -0.06], [0.1, 0.3, 0.06]);

    // a soft dark shadow on the ground
    const shadow = new THREE.Mesh(G.plane(), texMat('shadow', () => new THREE.MeshBasicMaterial({ map: T.glow(), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false })));
    shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1.1, 1.1, 1);

    let flameColor = null;
    function setLook(jp, of) {
      m.suit.color.set(of.suit); m.pants.color.set(of.pants); m.helmet.color.set(of.helmet); m.shoes.color.set(of.shoes);
      m.visor.color.set(of.visor); m.visor.emissive.set(of.visor);
      m.tank.color.set(jp.tank); m.stripe.color.set(jp.stripe); m.stripe.emissive.set(jp.stripe);
      flameColor = jp.flame;
      if (flameColor !== 'rainbow') { m.flame.color.set(flameColor); m.flameGlow.color.set(flameColor); }
    }

    // move the arms and legs. mode: run, air, slide, jet, idle, grabbed, fall
    function pose(mode, phase, t, flamePower) {
      const sin = Math.sin;
      body.rotation.set(0, 0, 0);
      body.position.set(0, 0.88, 0);
      for (const a of arms) { a.sh.rotation.set(0, 0, 0); a.el.rotation.set(0, 0, 0); }
      for (const l of legs) { l.hip.rotation.set(0, 0, 0); l.kn.rotation.set(0, 0, 0); }
      head.rotation.set(0, 0, 0);
      if (mode === 'run') {
        body.position.y = 0.88 + Math.abs(sin(phase)) * 0.06;
        body.rotation.x = -0.18;
        legs.forEach((l, i) => {
          const s = sin(phase + i * Math.PI);
          l.hip.rotation.x = s * 0.95;
          l.kn.rotation.x = -0.2 - 1.3 * Math.max(0, -Math.cos(phase + i * Math.PI));
        });
        arms.forEach((a, i) => {
          a.sh.rotation.x = -sin(phase + i * Math.PI) * 0.9;
          a.sh.rotation.z = a.side * 0.12;
          a.el.rotation.x = 1.3;
        });
      } else if (mode === 'air') {
        body.rotation.x = -0.1;
        legs.forEach((l, i) => { l.hip.rotation.x = 0.9 + i * 0.3; l.kn.rotation.x = -1.6; });
        arms.forEach((a) => { a.sh.rotation.z = a.side * 1.1; a.sh.rotation.x = -0.3; a.el.rotation.x = 0.6; });
      } else if (mode === 'slide') {
        body.position.y = 0.36;
        body.rotation.x = 1.25;
        head.rotation.x = -0.9;
        legs.forEach((l, i) => { l.hip.rotation.x = 0.35 + i * 0.15; l.kn.rotation.x = -0.25 - i * 0.4; });
        arms.forEach((a) => { a.sh.rotation.x = 0.4; a.sh.rotation.z = a.side * 0.6; a.el.rotation.x = 0.3; });
      } else if (mode === 'jet') {
        body.position.y = 0.9;
        body.rotation.x = -0.85;
        head.rotation.x = 0.6;
        legs.forEach((l, i) => { l.hip.rotation.x = -0.15 + sin(t * 6 + i) * 0.08; l.kn.rotation.x = -0.25; });
        arms[1].sh.rotation.x = 3.0; arms[1].el.rotation.x = 0.1;
        arms[0].sh.rotation.x = 0.3; arms[0].sh.rotation.z = -0.3;
      } else if (mode === 'grabbed') {
        legs.forEach((l, i) => { l.hip.rotation.x = sin(t * 12 + i * 3) * 0.7; l.kn.rotation.x = -0.6 - sin(t * 12 + i) * 0.4; });
        arms.forEach((a, i) => { a.sh.rotation.z = a.side * (2.2 + sin(t * 14 + i) * 0.5); a.el.rotation.x = 0.5; });
      } else if (mode === 'fall') {
        body.rotation.x = 0.5;
        legs.forEach((l, i) => { l.hip.rotation.x = 0.8 - i * 0.6; l.kn.rotation.x = -0.4; });
        arms.forEach((a) => { a.sh.rotation.z = a.side * 1.8; });
      } else { // idle
        body.position.y = 0.88 + sin(t * 2) * 0.01;
        arms.forEach((a) => { a.sh.rotation.z = a.side * 0.15; a.sh.rotation.x = 0.1; a.el.rotation.x = 0.25; });
        head.rotation.y = sin(t * 0.7) * 0.25;
      }
      // flames flicker
      if (flameColor === 'rainbow') { m.flame.color.setHSL((t * 0.5) % 1, 1, 0.6); m.flameGlow.color.copy(m.flame.color); }
      for (const f of flames) {
        const k = flamePower * (0.85 + Math.random() * 0.3);
        f.f.visible = flamePower > 0.02;
        f.outer.scale.set(0.075 * (0.7 + k * 0.4), 0.4 * k, 0.075 * (0.7 + k * 0.4));
        f.outer.position.y = -0.2 * k;
        f.gl.scale.setScalar(0.3 + k * 0.4);
      }
    }

    root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
    return { root, body, shadow, setLook, pose, mats: m };
  }

  // ============================================================
  //  MEGA-BOT: a 13 meter tall robot that wants to catch you
  // ============================================================
  function megabot() {
    const root = new THREE.Group();
    const metal = lam(0x4a5264), light = lam(0x9aa4b8), darkM = lam(0x1c1f28);
    const red = basic(0xff2a3a), yellow = lam(0xffcc1a, { emissive: 0x332200 });
    const stripes = texMat('botHazard', () => new THREE.MeshLambertMaterial({ map: T.hazard() }));
    const hips = grp(root, [0, 6.3, 0]);
    // legs
    const legs = [];
    for (const s of [-1, 1]) {
      const hip = grp(hips, [s * 2.0, 0, 0]);
      P(hip, G.sphere(), darkM, [0, 0, 0], 0.9);
      P(hip, G.rbox(1.4, 3.2, 1.6, 0.3), metal, [0, -1.6, 0]);
      const kn = grp(hip, [0, -3.2, 0]);
      P(kn, G.sphere(), darkM, [0, 0, 0], 0.85);
      P(kn, G.rbox(1.7, 2.8, 2.0, 0.35), light, [0, -1.5, 0]);
      P(kn, G.box(), stripes, [0, -1.2, -1.02], [1.5, 0.5, 0.05]);
      P(kn, G.rbox(2.3, 0.8, 3.4, 0.3), metal, [0, -2.8, -0.5]);
      legs.push({ hip, kn });
    }
    P(hips, G.rbox(3.8, 1.4, 2.2, 0.4), darkM, [0, 0.2, 0]);
    // body
    const torso = grp(hips, [0, 0.9, 0]);
    P(torso, G.rbox(5.4, 4.4, 3.2, 0.7), light, [0, 2.6, 0]);
    P(torso, G.box(), stripes, [0, 1.0, -1.45], [5.0, 0.6, 0.3]);
    P(torso, G.cyl(), darkM, [0, 2.9, -1.6], [1.1, 0.2, 1.1], [Math.PI / 2, 0, 0]);
    const chest = P(torso, G.cyl(), red, [0, 2.9, -1.72], [0.75, 0.1, 0.75], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 3; i++) P(torso, G.box(), darkM, [1.8, 2.2 + i * 0.5, -1.62], [0.9, 0.18, 0.1]);
    for (let i = 0; i < 3; i++) P(torso, G.box(), darkM, [-1.8, 2.2 + i * 0.5, -1.62], [0.9, 0.18, 0.1]);
    // head
    const head = grp(torso, [0, 5.0, -0.1]);
    P(head, G.cyl(), darkM, [0, 0.1, 0], [0.8, 0.6, 0.8]);
    P(head, G.rbox(3.0, 2.1, 2.5, 0.5), metal, [0, 1.1, 0]);
    const visor = P(head, G.box(), red, [0, 1.25, -1.24], [2.4, 0.5, 0.08]);
    for (let i = -2; i <= 2; i++) P(head, G.box(), darkM, [i * 0.4, 0.5, -1.24], [0.15, 0.5, 0.08]);
    P(head, G.cyl(), darkM, [0.9, 2.5, 0], [0.08, 1.0, 0.08]);
    const antenna = P(head, G.sphere(), red, [0.9, 3.05, 0], 0.22);
    P(head, G.box(), yellow, [-1.55, 1.1, 0], [0.2, 0.9, 0.9]);
    P(head, G.box(), yellow, [1.55, 1.1, 0], [0.2, 0.9, 0.9]);
    // arms (the right one does the grabbing)
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = grp(torso, [s * 3.3, 4.0, 0]);
      P(sh, G.sphere(), metal, [0, 0, 0], 1.15);
      P(sh, G.rbox(1.3, 3.4, 1.3, 0.3), darkM, [0, -1.8, 0]);
      const el = grp(sh, [0, -3.5, 0]);
      P(el, G.sphere(), metal, [0, 0, 0], 0.8);
      P(el, G.rbox(1.6, 3.2, 1.6, 0.35), light, [0, -1.6, 0]);
      P(el, G.box(), stripes, [0, -2.4, 0], [1.7, 0.4, 1.7]);
      const hand = grp(el, [0, -3.4, 0]);
      P(hand, G.rbox(1.9, 1.0, 1.5, 0.3), metal, [0, -0.3, 0]);
      const fingers = [];
      for (const [fx, fz, rz] of [[-0.6, -0.4, 0], [0.6, -0.4, 0], [0, 0.55, 1]]) {
        const f = grp(hand, [fx, -0.7, fz]);
        P(f, G.rbox(0.36, 1.2, 0.36, 0.12), darkM, [0, -0.55, 0]);
        P(f, G.cone(), light, [0, -1.25, 0], [0.2, 0.4, 0.2], [Math.PI, 0, 0]);
        f.userData.back = rz; // the thumb bends the other way
        fingers.push(f);
      }
      arms.push({ sh, el, hand, fingers, side: s });
    }
    // red search light from the eyes
    const beamGeo = geo('beam', () => { const g = new THREE.ConeGeometry(2.4, 16, 20, 1, true); g.translate(0, -8, 0); g.rotateX(-Math.PI / 2); return g; });
    const beam = new THREE.Mesh(beamGeo, glowy(0xff2030, 0.13));
    beam.frustumCulled = false;
    const eyeGlow = glowSprite(head, 0xff3040, 5, [0, 1.25, -1.5], 0.8);
    eyeGlow.material = eyeGlow.material.clone();
    return { root, hips, legs, torso, head, arms, beam, chest, visor, antenna, eyeGlow };
  }

  // ============================================================
  //  OBSTACLES
  // ============================================================
  // low barrier: 1 m tall, hop over it
  function barrier() {
    const g = new THREE.Group();
    const metal = lam(0x5a6478);
    const stripes = texMat('hazardBar', () => new THREE.MeshLambertMaterial({ map: T.hazard(), emissive: 0x221a00 }));
    P(g, G.box(), metal, [-1.0, 0.45, 0], [0.14, 0.9, 0.14]);
    P(g, G.box(), metal, [1.0, 0.45, 0], [0.14, 0.9, 0.14]);
    P(g, G.box(), stripes, [0, 0.72, 0], [2.14, 0.5, 0.12]);
    P(g, G.box(), metal, [0, 0.28, 0], [2.0, 0.1, 0.1]);
    const l1 = P(g, G.sphere(), basic(0xff3a2a), [-1.0, 1.0, 0], 0.09);
    const l2 = P(g, G.sphere(), basic(0xff3a2a), [1.0, 1.0, 0], 0.09);
    l1.userData.keep = l2.userData.keep = true;
    g.userData.blink = [l1, l2];
    return mergeStatic(g, 'barrier');
  }

  // laser gate: the lasers are at head height, slide under them
  function laserGate() {
    const g = new THREE.Group();
    const metal = lam(0x3a4050), trim = lam(0xff3aa8, { emissive: 0x661040 });
    P(g, G.box(), metal, [-1.12, 1.35, 0], [0.18, 2.7, 0.24]);
    P(g, G.box(), metal, [1.12, 1.35, 0], [0.18, 2.7, 0.24]);
    P(g, G.box(), metal, [0, 2.62, 0], [2.42, 0.18, 0.26]);
    P(g, G.box(), trim, [0, 2.62, -0.14], [2.2, 0.06, 0.02]);
    const beams = [];
    for (const y of [1.08, 1.4, 1.75, 2.1]) {
      beams.push(P(g, G.cyl(), glowy(0xff2a4a, 0.95), [0, y, 0], [0.035, 2.1, 0.035], [0, 0, Math.PI / 2]));
      beams.push(P(g, G.cyl(), glowy(0xff4a6a, 0.3), [0, y, 0], [0.11, 2.1, 0.11], [0, 0, Math.PI / 2]));
    }
    // the beams are glued together too; they flicker by scaling the whole laser group a tiny bit
    g.userData.beams = beams;
    return mergeStatic(g, 'laser');
  }

  // a hole in the road: 2.8 m long, hop over it
  function hole() {
    const g = new THREE.Group();
    P(g, G.box(), basic(0x020104), [0, 0.012, -1.5], [2.3, 0.02, 2.8]);
    P(g, G.box(), glowy(0xff6a1a, 0.9), [0, 0.03, -0.08], [2.3, 0.04, 0.1]);
    P(g, G.box(), glowy(0xff6a1a, 0.9), [0, 0.03, -2.92], [2.3, 0.04, 0.1]);
    P(g, G.box(), glowy(0xff3a1a, 0.25), [0, 0.02, -1.5], [2.2, 0.02, 2.6]);
    return mergeStatic(g, 'hole');
  }

  // a hover-train that is "len" meters long. Its front is at z=0 and it goes back toward -z.
  function trainBoxGeo(len) {
    return geo('trainBox' + len, () => {
      const g = new THREE.BoxGeometry(2.1, 2.5, len);
      const uv = g.attributes.uv;
      // stretch the side picture along the train so the windows don't get squished
      for (const grpI of [0, 1, 2]) {
        const gr = g.groups[grpI];
        for (let i = gr.start; i < gr.start + gr.count; i++) {
          const vi = g.index.getX(i);
          uv.setX(vi, (uv.getX(vi) > 0.5 ? 1 : 0) * (grpI === 2 ? 1 : len / 7));
          if (grpI === 2) uv.setY(vi, (uv.getY(vi) > 0.5 ? 1 : 0) * len / 7);
        }
      }
      return g;
    });
  }
  const TRAIN_COLORS = [0xff3aa8, 0x3ab8ff, 0xffb01a, 0x7a4aff];
  function train(len, moving) {
    const g = new THREE.Group();
    const col = moving ? 0xff2a2a : U.pick(TRAIN_COLORS);
    const colStr = '#' + col.toString(16).padStart(6, '0');
    const side = texMat('trainSide' + col, () => new THREE.MeshLambertMaterial({ map: T.trainSide(colStr) }));
    const front = texMat('trainFront' + col, () => new THREE.MeshLambertMaterial({ map: T.trainFront(colStr), emissive: 0x222222 }));
    const roof = lam(0x8a90a4);
    const body = new THREE.Mesh(trainBoxGeo(len), [side, side, roof, roof, front, front]);
    body.position.set(0, 0.3 + 1.25, -len / 2);
    g.add(body);
    P(g, G.box(), roof, [0, 2.84, -len / 2], [1.6, 0.1, len - 0.8]);
    // hover glow underneath
    P(g, G.box(), glowy(moving ? 0xff3a3a : 0x3af0ff, 0.6), [0, 0.12, -len / 2], [1.7, 0.06, len - 0.6]);
    if (moving) {
      g.userData.lights = [glowSprite(g, 0xfff4c0, 2.2, [-0.6, 1.0, 0.1]), glowSprite(g, 0xfff4c0, 2.2, [0.6, 1.0, 0.1])];
      g.userData.warn = glowSprite(g, 0xff2020, 3.5, [0, 2.9, 0.1], 0.9);
      g.userData.warn.material = g.userData.warn.material.clone();
    }
    return g;
  }

  // a ramp that goes up to the roof of a train (2.8 m high)
  function ramp(len) {
    const g = new THREE.Group();
    const top = texMat('rampTop' + len, () => {
      const t = T.ramp().clone(); t.needsUpdate = true; t.repeat.set(1, len / 2.5);
      return new THREE.MeshLambertMaterial({ map: t, emissive: 0x101030 });
    });
    const ang = Math.atan2(2.8, len), slope = Math.hypot(2.8, len);
    const deck = P(g, G.box(), top, [0, 1.4 - 0.08, -len / 2], [2.1, 0.16, slope]);
    deck.rotation.x = ang;
    const metal = lam(0x3a4050);
    // supports under the ramp
    for (let i = 1; i <= 3; i++) {
      const z = -len * i / 4, h = 2.8 * i / 4;
      P(g, G.box(), metal, [-0.9, h / 2, z], [0.12, h, 0.12]);
      P(g, G.box(), metal, [0.9, h / 2, z], [0.12, h, 0.12]);
    }
    P(g, G.box(), glowy(0x4af0ff, 0.8), [-1.06, 1.4, -len / 2], [0.05, 0.05, slope], [ang, 0, 0]);
    P(g, G.box(), glowy(0x4af0ff, 0.8), [1.06, 1.4, -len / 2], [0.05, 0.05, slope], [ang, 0, 0]);
    return mergeStatic(g, 'ramp' + len);
  }

  // ============================================================
  //  THINGS TO COLLECT
  // ============================================================
  const boltGeo = () => geo('bolt', () => {
    const s = new THREE.Shape();
    const pts = [[0.1, 0.5], [-0.28, -0.05], [-0.02, -0.05], [-0.12, -0.5], [0.3, 0.1], [0.04, 0.1], [0.14, 0.5]];
    s.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) s.lineTo(p[0], p[1]);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
    g.translate(0, 0, -0.05);
    return g;
  });
  function bolt() {
    const m = new THREE.Mesh(boltGeo(), lam(0xffd21a, { emissive: 0xc88a00 }));
    m.scale.setScalar(0.9);
    return m;
  }

  // a power-up floating in a bubble
  const PU_COLORS = { shield: 0x3aa8ff, magnet: 0xff3a5a, jet: 0xffa01a };
  function powerUp(kind) {
    const g = new THREE.Group();
    const inner = grp(g);
    const c = PU_COLORS[kind];
    P(g, G.sphere(), glowy(c, 0.28), [0, 0, 0], 0.62);
    glowSprite(g, c, 2.2, [0, 0, 0], 0.6);
    if (kind === 'shield') {
      P(inner, G.cyl6(), lam(0x3aa8ff, { emissive: 0x103060 }), [0, 0, 0], [0.34, 0.1, 0.34], [Math.PI / 2, 0, 0]);
      P(inner, G.cyl6(), lam(0xffffff, { emissive: 0x404040 }), [0, 0, -0.03], [0.2, 0.12, 0.2], [Math.PI / 2, 0, 0]);
    } else if (kind === 'magnet') {
      P(inner, G.torus(), lam(0xff2a3a, { emissive: 0x400808 }), [0, 0.05, 0], [0.26, 0.26, 0.26], [0, 0, Math.PI]);
      P(inner, G.box(), lam(0xe8e8f0), [-0.26, 0.1, 0], [0.15, 0.14, 0.15]);
      P(inner, G.box(), lam(0xe8e8f0), [0.26, 0.1, 0], [0.15, 0.14, 0.15]);
    } else {
      P(inner, G.cyl(), lam(0xe8e8f0), [0, 0, 0], [0.1, 0.4, 0.1]);
      P(inner, G.cone(), lam(0xff4a2a), [0, 0.3, 0], [0.1, 0.2, 0.1]);
      P(inner, G.cone(), glowy(0xffc040), [0, -0.32, 0], [0.08, 0.25, 0.08], [Math.PI, 0, 0]);
      for (const a of [0, 2.1, 4.2]) P(inner, G.box(), lam(0xff4a2a), [Math.sin(a) * 0.12, -0.15, Math.cos(a) * 0.12], [0.03, 0.14, 0.1], [0, a, 0]);
    }
    g.userData.inner = inner;
    return g;
  }

  // the bubble around you when you have the shield
  function shieldBubble() {
    const m = new THREE.Mesh(G.sphere(), glowy(0x3ac8ff, 0.22));
    m.scale.set(0.9, 1.1, 0.9);
    return m;
  }

  // ============================================================
  //  THE CITY
  // ============================================================
  // one building. It gets its own box so the windows are not stretched.
  function building(w, h, d, variant) {
    const gm = new THREE.BoxGeometry(w, h, d);
    const uv = gm.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      // every face has 4 corners: faces 0-1 are the left/right walls, 2-3 roof and floor, 4-5 front/back
      const face = Math.floor(i / 4);
      const across = face < 2 ? d : w;
      uv.setXY(i, uv.getX(i) * across / 8, uv.getY(i) * (face === 2 || face === 3 ? d / 8 : h / 16));
    }
    const mat = texMat('bld' + variant, () => new THREE.MeshBasicMaterial({ map: T.windows(variant) }));
    const m = new THREE.Mesh(gm, mat);
    m.position.y = h / 2 - 20;
    return m;
  }

  function neonSign(text, color) {
    const mat = texMat('sign' + text + color, () => new THREE.MeshBasicMaterial({ map: T.sign(text, color), transparent: true }));
    const m = new THREE.Mesh(G.plane(), mat);
    m.scale.set(6, 1.9, 1);
    return m;
  }

  // a flying car in the sky
  function flyingCar() {
    const g = new THREE.Group();
    const col = U.pick([0xff3aa8, 0x3ab8ff, 0xffd21a, 0xa04aff, 0xffffff]);
    P(g, G.rbox(1.6, 0.6, 3.2, 0.25), lam(col), [0, 0, 0]);
    P(g, G.rbox(1.2, 0.5, 1.4, 0.2), lam(0x1a2a44), [0, 0.45, 0.2]);
    P(g, G.box(), basic(0xff2a3a), [0, 0, 1.62], [1.3, 0.14, 0.05]);
    P(g, G.box(), basic(0xfff4c0), [0, 0, -1.62], [1.3, 0.14, 0.05]);
    P(g, G.box(), glowy(0x4af0ff, 0.7), [0, -0.33, 0], [1.2, 0.05, 2.6]);
    return g;
  }

  return { mergeStatic, hero, megabot, barrier, laserGate, hole, train, ramp, bolt, powerUp, shieldBubble, building, neonSign, flyingCar, glowSprite, lam, basic, glowy, spriteMat, G, P, grp, PU_COLORS };
})();
