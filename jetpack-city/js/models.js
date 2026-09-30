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
  // cartoon materials: the shading comes in 3 flat steps, like in cartoon games
  const toon = (opts = {}) => new THREE.MeshToonMaterial(Object.assign({ gradientMap: T.toonRamp() }, opts));
  const lam = (color, extra = {}) => {
    const key = 'l' + color + JSON.stringify(extra);
    return mats[key] || (mats[key] = toon(Object.assign({ color }, extra)));
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
  //  THE HEROES: Ratchet (fan version) with Clank on his back.
  //  Ratchet looks toward -Z. Clank rides on his back and looks
  //  backward (+Z), so you see Clank's face from behind!
  // ============================================================
  const HIP = 0.74;   // how high Ratchet's hips are
  function hero() {
    const root = new THREE.Group();
    const body = grp(root, [0, HIP, 0]);
    // the heroes get their own materials, so the garage can recolor them
    const m = {
      fur: toon(), ear: toon({ color: 0xffffff }), muzzle: toon(), top: toon(), accent: toon(), pants: toon(),
      cap: toon(), boots: toon(), gloves: toon(), clank: toon(), clankDark: toon(),
      eye: new THREE.MeshBasicMaterial(),
      flame: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }),
      flameGlow: new THREE.SpriteMaterial({ map: T.glow(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    };
    const pink = lam(0xff8aa8), white = basic(0xffffff), black = basic(0x101014), green = lam(0x3acc4a, { emissive: 0x0a3010 });
    const dark = lam(0x2a2a34), wrenchBlue = lam(0x3a8aff), steel = lam(0xc8d0dc);
    const core = basic(0xfff6d0, { transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });

    // ---- Ratchet's body ----
    P(body, G.rbox(0.34, 0.2, 0.24, 0.08), m.pants, [0, 0.02, 0]);
    P(body, G.box(), dark, [0, 0.12, 0], [0.36, 0.06, 0.26]);
    P(body, G.box(), steel, [0, 0.12, -0.132], [0.08, 0.06, 0.01]);
    P(body, G.rbox(0.38, 0.36, 0.26, 0.1), m.top, [0, 0.3, 0]);
    P(body, G.rbox(0.28, 0.14, 0.05, 0.02), m.accent, [0, 0.34, -0.12]);
    for (const s of [-1, 1]) P(body, G.sphere(), m.accent, [s * 0.2, 0.44, 0], [0.1, 0.07, 0.11]);
    P(body, G.cyl(), m.fur, [0, 0.52, 0], [0.07, 0.1, 0.07]);

    // ---- the big head ----
    const head = grp(body, [0, 0.68, 0]);
    P(head, G.sphere(), m.fur, [0, 0, 0], [0.24, 0.22, 0.23]);
    P(head, G.sphere(), m.muzzle, [0, -0.08, -0.16], [0.13, 0.09, 0.11]);
    P(head, G.sphere(), pink, [0, -0.04, -0.26], [0.04, 0.03, 0.03]);
    P(head, G.box(), dark, [0, -0.13, -0.245], [0.07, 0.012, 0.01]);
    for (const s of [-1, 1]) {
      P(head, G.sphere(), white, [s * 0.088, 0.03, -0.185], [0.075, 0.088, 0.05]);
      P(head, G.sphere(), green, [s * 0.085, 0.022, -0.222], [0.046, 0.05, 0.02]);
      P(head, G.sphere(), black, [s * 0.083, 0.02, -0.236], [0.024, 0.028, 0.01]);
      P(head, G.sphere(), white, [s * 0.07, 0.045, -0.244], 0.012);
      P(head, G.box(), dark, [s * 0.09, 0.13, -0.2], [0.09, 0.02, 0.02], [0, 0, s * 0.25]);
      P(head, G.sphere(), m.muzzle, [s * 0.12, -0.07, -0.13], [0.07, 0.06, 0.06]); // cheeks
    }
    // giant pointy ears with stripes
    const ears = [];
    for (const s of [-1, 1]) {
      const e = grp(head, [s * 0.13, 0.1, 0.04]);
      e.rotation.set(0.25, 0, -s * 0.45);
      P(e, G.cone(), m.ear, [0, 0.23, 0], [0.17, 0.48, 0.06]);
      P(e, G.cone(), m.muzzle, [0, 0.19, -0.035], [0.11, 0.36, 0.02]);
      ears.push({ e, side: s });
    }
    // aviator cap with goggles
    P(head, geo('hemi', () => new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2)), m.cap, [0, 0.05, 0.02], [0.245, 0.2, 0.24]);
    for (const s of [-1, 1]) {
      P(head, geo('ring', () => new THREE.TorusGeometry(1, 0.28, 6, 14)), dark, [s * 0.07, 0.19, -0.16], 0.055, [-0.7, 0, 0]);
      P(head, G.cyl(), lam(0x8ae8ff, { emissive: 0x204050 }), [s * 0.07, 0.19, -0.16], [0.045, 0.01, 0.045], [Math.PI / 2 - 0.7, 0, 0]);
    }

    // ---- arms, with gloves ----
    const arms = [];
    for (const s of [-1, 1]) {
      const sh = grp(body, [s * 0.24, 0.42, 0]);
      P(sh, G.cap(0.055, 0.14), m.fur, [0, -0.1, 0]);
      const el = grp(sh, [0, -0.22, 0]);
      P(el, G.cap(0.05, 0.12), m.fur, [0, -0.09, 0]);
      P(el, G.cyl(), m.gloves, [0, -0.17, 0], [0.065, 0.05, 0.065]);
      P(el, G.sphere(), m.gloves, [0, -0.23, 0], [0.085, 0.08, 0.085]);
      arms.push({ sh, el, side: s });
    }
    // the OmniWrench in the right hand
    const wrench = grp(arms[1].el, [0, -0.24, 0]);
    P(wrench, G.cyl(), dark, [0, 0, -0.05], [0.03, 0.14, 0.03], [Math.PI / 2, 0, 0]);
    P(wrench, G.cyl(), steel, [0, 0, -0.34], [0.022, 0.46, 0.022], [Math.PI / 2, 0, 0]);
    P(wrench, geo('jaw', () => new THREE.TorusGeometry(1, 0.32, 6, 14, Math.PI * 1.45)), wrenchBlue, [0, 0, -0.64], 0.11, [Math.PI / 2, 0, 0.8]);

    // ---- legs and boots ----
    const legs = [];
    for (const s of [-1, 1]) {
      const hip = grp(body, [s * 0.1, -0.02, 0]);
      P(hip, G.cap(0.075, 0.18), m.pants, [0, -0.16, 0]);
      const kn = grp(hip, [0, -0.34, 0]);
      P(kn, G.cap(0.065, 0.16), m.fur, [0, -0.15, 0]);
      P(kn, G.rbox(0.15, 0.13, 0.27, 0.05), m.boots, [0, -0.33, -0.05]);
      legs.push({ hip, kn, side: s });
    }
    // ---- the striped tail ----
    const tail = grp(body, [0, 0.02, 0.12]);
    const tailSegs = [];
    let tp = tail;
    for (let i = 0; i < 3; i++) {
      const seg = grp(tp, i ? [0, -0.13, 0] : [0, 0, 0]);
      P(seg, G.cap(0.05 - i * 0.008, 0.1), i === 2 ? m.ear : m.fur, [0, -0.07, 0]);
      tailSegs.push(seg); tp = seg;
    }

    // ---- Clank, riding on the back (he looks backward, toward +Z) ----
    const clank = grp(body, [0, 0.3, 0.22]);
    P(clank, G.rbox(0.2, 0.2, 0.13, 0.05), m.clank, [0, 0, 0.03]);
    P(clank, G.sphere(), m.eye, [0, 0.01, 0.1], [0.03, 0.03, 0.01]);
    const cHead = grp(clank, [0, 0.18, 0.05]);
    P(cHead, G.rbox(0.27, 0.19, 0.2, 0.08), m.clank, [0, 0, 0]);
    P(cHead, G.rbox(0.21, 0.13, 0.03, 0.04), m.clankDark, [0, 0, 0.09]);
    for (const s of [-1, 1]) P(cHead, G.sphere(), m.eye, [s * 0.058, 0.01, 0.105], [0.046, 0.046, 0.02]);
    P(cHead, G.box(), dark, [0, -0.05, 0.106], [0.06, 0.012, 0.01]);
    P(cHead, G.cyl(), m.clankDark, [0, 0.14, 0], [0.008, 0.1, 0.008]);
    const antenna = P(cHead, G.sphere(), basic(0xff3a3a), [0, 0.2, 0], 0.028);
    const cArms = [];
    for (const s of [-1, 1]) {
      const ca = grp(clank, [s * 0.11, 0.06, 0.02]);
      P(ca, G.cap(0.02, 0.1), m.clankDark, [0, -0.07, 0]);
      ca.rotation.z = s * 1.9;
      cArms.push(ca);
      const cl = grp(clank, [s * 0.05, -0.1, 0.05]);
      P(cl, G.cap(0.024, 0.07), m.clankDark, [0, -0.05, 0]);
      cl.rotation.x = -0.6;
    }
    // Heli-Pack: propellers pop out of Clank's head when you hop
    const heli = grp(cHead, [0, 0.12, 0]);
    P(heli, G.cyl(), m.clankDark, [0, 0, 0], [0.03, 0.05, 0.03]);
    P(heli, G.box(), m.clankDark, [0, 0.03, 0], [1.1, 0.03, 0.12]);
    P(heli, G.box(), m.clankDark, [0, 0.03, 0], [0.12, 0.03, 1.1]);
    // Thruster-Pack: rockets for the jet boost
    const thrusters = grp(clank, [0, -0.04, 0.02]);
    const flames = [];
    for (const s of [-1, 1]) {
      P(thrusters, G.cyl(), m.clankDark, [s * 0.14, 0, 0], [0.045, 0.16, 0.045]);
      P(thrusters, G.cone(), dark, [s * 0.14, -0.1, 0], [0.05, 0.07, 0.05], [Math.PI, 0, 0]);
      const f = grp(thrusters, [s * 0.14, -0.14, 0]);
      const outer = P(f, G.cone(), m.flame, [0, -0.2, 0], [0.07, 0.4, 0.07], [Math.PI, 0, 0]);
      P(f, G.cone(), core, [0, -0.1, 0], [0.035, 0.2, 0.035], [Math.PI, 0, 0]);
      const gl = new THREE.Sprite(m.flameGlow); gl.scale.set(0.5, 0.5, 1); gl.position.set(0, -0.12, 0); f.add(gl);
      flames.push({ f, outer, gl });
    }

    // a soft dark shadow on the ground
    const shadow = new THREE.Mesh(G.plane(), texMat('shadow', () => new THREE.MeshBasicMaterial({ map: T.glow(), color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false })));
    shadow.rotation.x = -Math.PI / 2; shadow.scale.set(1.1, 1.1, 1);

    let flameColor = null, heliOut = 0, jetOut = 0;
    function setLook(ck, of) {
      m.fur.color.set(of.fur); m.muzzle.color.set(of.muzzle); m.top.color.set(of.top); m.accent.color.set(of.accent);
      m.pants.color.set(of.pants); m.cap.color.set(of.cap); m.boots.color.set(of.boots); m.gloves.color.set(of.gloves);
      m.ear.map = T.fur(of.fur, of.stripe); m.ear.needsUpdate = true;
      m.clank.color.set(ck.metal); m.clankDark.color.set(ck.dark); m.eye.color.set(ck.eye);
      flameColor = ck.flame;
      if (flameColor !== 'rainbow') { m.flame.color.set(flameColor); m.flameGlow.color.set(flameColor); }
    }

    // move arms, legs, ears, tail and Clank. mode: run, air, slide, jet, idle, grabbed, fall
    function pose(mode, phase, t, flamePower) {
      const sin = Math.sin, cos = Math.cos;
      body.rotation.set(0, 0, 0);
      body.position.set(0, HIP, 0);
      for (const a of arms) { a.sh.rotation.set(0, 0, 0); a.el.rotation.set(0, 0, 0); }
      for (const l of legs) { l.hip.rotation.set(0, 0, 0); l.kn.rotation.set(0, 0, 0); }
      head.rotation.set(0, 0, 0);
      wrench.rotation.set(0, 0, 0);
      let earFlop = 0, tailWag = sin(t * 3) * 0.3, tailUp = -2.0;
      if (mode === 'run') {
        body.position.y = HIP + Math.abs(sin(phase)) * 0.06;
        body.rotation.x = -0.2;
        legs.forEach((l, i) => {
          const k = sin(phase + i * Math.PI);
          l.hip.rotation.x = k * 1.0;
          l.kn.rotation.x = -0.2 - 1.3 * Math.max(0, -cos(phase + i * Math.PI));
        });
        arms.forEach((a, i) => {
          a.sh.rotation.x = -sin(phase + i * Math.PI) * 0.9;
          a.sh.rotation.z = a.side * 0.15;
          a.el.rotation.x = 1.2;
        });
        wrench.rotation.x = -0.9;
        earFlop = sin(phase * 2) * 0.12 - 0.15;
        tailWag = sin(phase) * 0.45; tailUp = -1.6;
      } else if (mode === 'air') {
        body.rotation.x = -0.1;
        legs.forEach((l, i) => { l.hip.rotation.x = 0.7 + i * 0.3; l.kn.rotation.x = -1.3; });
        arms.forEach((a) => { a.sh.rotation.z = a.side * 1.0; a.sh.rotation.x = -0.3; a.el.rotation.x = 0.5; });
        earFlop = 0.25; tailUp = -1.3;
      } else if (mode === 'slide') {
        body.position.y = 0.32;
        body.rotation.x = 1.2;
        head.rotation.x = -0.9;
        legs.forEach((l, i) => { l.hip.rotation.x = 0.35 + i * 0.15; l.kn.rotation.x = -0.25 - i * 0.4; });
        arms.forEach((a) => { a.sh.rotation.x = 0.4; a.sh.rotation.z = a.side * 0.6; a.el.rotation.x = 0.3; });
        earFlop = 0.6; tailUp = -0.3;
      } else if (mode === 'jet') {
        body.position.y = 0.85;
        body.rotation.x = -0.85;
        head.rotation.x = 0.6;
        legs.forEach((l, i) => { l.hip.rotation.x = -0.15 + sin(t * 6 + i) * 0.08; l.kn.rotation.x = -0.3; });
        arms[1].sh.rotation.x = 2.9; arms[1].el.rotation.x = 0.1;
        arms[0].sh.rotation.x = 0.3; arms[0].sh.rotation.z = -0.3;
        wrench.rotation.x = 0.3;
        earFlop = 0.7 + sin(t * 20) * 0.08; tailUp = -0.4; tailWag = sin(t * 12) * 0.2;
      } else if (mode === 'grabbed') {
        legs.forEach((l, i) => { l.hip.rotation.x = sin(t * 12 + i * 3) * 0.7; l.kn.rotation.x = -0.6 - sin(t * 12 + i) * 0.4; });
        arms.forEach((a, i) => { a.sh.rotation.z = a.side * (2.2 + sin(t * 14 + i) * 0.5); a.el.rotation.x = 0.5; });
        earFlop = sin(t * 10) * 0.3; tailWag = sin(t * 15) * 0.8;
      } else if (mode === 'fall') {
        body.rotation.x = 0.5;
        legs.forEach((l, i) => { l.hip.rotation.x = 0.8 - i * 0.6; l.kn.rotation.x = -0.4; });
        arms.forEach((a) => { a.sh.rotation.z = a.side * 1.8; });
        earFlop = 0.5;
      } else { // idle: a proud pose with the wrench on the shoulder
        body.position.y = HIP + sin(t * 2) * 0.01;
        arms[0].sh.rotation.set(0.1, 0, -0.35); arms[0].el.rotation.x = 0.4;
        arms[1].sh.rotation.set(-2.5, 0, 0.3); arms[1].el.rotation.x = 1.6;
        wrench.rotation.x = 0.4;
        head.rotation.y = sin(t * 0.7) * 0.25;
        earFlop = sin(t * 1.3) * 0.05;
      }
      for (const e of ears) e.e.rotation.set(0.25 + earFlop, 0, -e.side * (0.45 + earFlop * 0.3));
      tail.rotation.set(tailUp, 0, tailWag);
      tailSegs[1].rotation.set(0.35, 0, tailWag * 0.6);
      tailSegs[2].rotation.set(0.35, 0, tailWag * 0.8);

      // Clank: Heli-Pack when hopping, Thruster-Pack when flying
      heliOut = U.damp(heliOut, mode === 'air' ? 1 : 0, 14, 1 / 60);
      jetOut = U.damp(jetOut, mode === 'jet' ? 1 : 0, 10, 1 / 60);
      heli.scale.setScalar(Math.max(0.001, heliOut));
      heli.visible = heliOut > 0.02;
      heli.rotation.y = t * 38;
      thrusters.scale.setScalar(Math.max(0.001, jetOut));
      thrusters.visible = jetOut > 0.02;
      antenna.visible = Math.floor(t * 2.5) % 2 === 0;
      cArms.forEach((ca, i) => { ca.rotation.x = mode === 'grabbed' ? sin(t * 16 + i * 2) * 0.8 : sin(t * 3 + i) * 0.1; });
      cHead.rotation.set(sin(t * 1.7) * 0.06, mode === 'idle' ? sin(t * 0.9) * 0.3 : 0, 0);
      if (flameColor === 'rainbow') { m.flame.color.setHSL((t * 0.5) % 1, 1, 0.6); m.flameGlow.color.copy(m.flame.color); }
      for (const f of flames) {
        const k = 1.3 * (0.85 + Math.random() * 0.3);
        f.outer.scale.set(0.07 * (0.7 + k * 0.4), 0.4 * k, 0.07 * (0.7 + k * 0.4));
        f.outer.position.y = -0.2 * k;
        f.gl.scale.setScalar(0.2 + k * 0.18);
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
    const stripes = texMat('botHazard', () => toon({ map: T.hazard() }));
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
    P(head, G.cyl(), darkM, [0, 1.2, -1.2], [0.95, 0.12, 0.95], [Math.PI / 2, 0, 0]);
    const visor = P(head, G.cyl(), red, [0, 1.2, -1.28], [0.72, 0.08, 0.72], [Math.PI / 2, 0, 0]);
    P(head, G.sphere(), basic(0xffd0d0), [0.25, 1.45, -1.33], 0.14);
    for (let i = -2; i <= 2; i++) P(head, G.box(), darkM, [i * 0.4, 0.35, -1.24], [0.15, 0.3, 0.08]);
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
    const stripes = texMat('hazardBar', () => toon({ map: T.hazard(), emissive: 0x221a00 }));
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
  function train(len, moving, colors) {
    const g = new THREE.Group();
    const col = moving ? 0xff2a2a : U.pick(colors || TRAIN_COLORS);
    const colStr = '#' + col.toString(16).padStart(6, '0');
    const side = texMat('trainSide' + col, () => toon({ map: T.trainSide(colStr) }));
    const front = texMat('trainFront' + col, () => toon({ map: T.trainFront(colStr), emissive: 0x222222 }));
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
      return toon({ map: t, emissive: 0x101030 });
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
  // a bolt like in Ratchet & Clank: a silver hex nut with a gold bolt through it (one piece, so it's fast)
  const boltGeo = () => geo('bolt', () => {
    const parts = [
      [new THREE.TorusGeometry(0.2, 0.085, 4, 6), [0.82, 0.85, 0.92]],
      [new THREE.CylinderGeometry(0.06, 0.06, 0.36, 8).rotateX(Math.PI / 2), [1, 0.78, 0.22]],
      [new THREE.CylinderGeometry(0.12, 0.12, 0.07, 6).rotateX(Math.PI / 2).translate(0, 0, 0.18), [1, 0.78, 0.22]],
    ].map(([g, c]) => { const q = g.toNonIndexed(); const col = new Float32Array(q.attributes.position.count * 3); for (let i = 0; i < col.length; i += 3) col.set(c, i); q.setAttribute('color', new THREE.BufferAttribute(col, 3)); return q; });
    const out = mergeGeos(parts);
    let total = 0; for (const q of parts) total += q.attributes.color.array.length;
    const col = new Float32Array(total); let off = 0;
    for (const q of parts) { col.set(q.attributes.color.array, off); off += q.attributes.color.array.length; }
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  });
  function bolt() {
    const m = new THREE.Mesh(boltGeo(), texMat('boltMat', () => toon({ vertexColors: true, emissive: 0x302810 })));
    m.scale.setScalar(1.25);
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

  // ============================================================
  //  PLANET SCENERY
  //  Each piece is built in a little group, then "put" into the
  //  city block so everything can be glued together (fast!).
  // ============================================================
  function place(parent, build, pos, rotY = 0, scale = 1) {
    const g = new THREE.Group();
    build(g);
    g.position.set(pos[0], pos[1], pos[2]);
    g.rotation.y = rotY;
    if (Array.isArray(scale)) g.scale.set(scale[0], scale[1], scale[2]); else g.scale.setScalar(scale);
    parent.add(g);
    parent.updateMatrixWorld(true);
    const list = [];
    g.traverse((o) => { if (o !== g) list.push(o); });
    for (const o of list) if (o.isMesh || o.isSprite) parent.attach(o);
    parent.remove(g);
  }

  // a box whose picture repeats instead of stretching
  function boxUV(w, h, d, tw = 8, th = 16) {
    const gm = new THREE.BoxGeometry(w, h, d);
    const uv = gm.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const face = Math.floor(i / 4);
      uv.setXY(i, uv.getX(i) * (face < 2 ? d : w) / tw, uv.getY(i) * (face === 2 || face === 3 ? d / tw : h / th));
    }
    return gm;
  }
  const rockMat = (c1, c2) => texMat('rock' + c1 + c2, () => toon({ map: T.rock(c1, c2) }));

  // Veldin: a big flat-topped rock
  function mesa(parent, pos, w, h, d, c1 = '#d9823a', c2 = '#c0662a') {
    const m = new THREE.Mesh(boxUV(w, h, d, 10, 14), rockMat(c1, c2));
    m.position.set(pos[0], pos[1] + h / 2, pos[2]);
    parent.add(m);
    P(parent, G.box(), lam(0xe8a060), [pos[0], pos[1] + h + 0.3, pos[2]], [w * 0.96, 0.6, d * 0.96]);
  }
  function rockArch(parent, z) {
    mesa(parent, [-6.5, -0.1, z], 3, 9, 4);
    mesa(parent, [6.5, -0.1, z], 3, 9, 4);
    const top = new THREE.Mesh(boxUV(16, 2.6, 4.4, 10, 14), rockMat('#d9823a', '#c0662a'));
    top.position.set(0, 9.6, z); parent.add(top);
  }
  function rocks(parent, pos, s, color = 0xb86a34) {
    P(parent, geo('dodeca', () => new THREE.DodecahedronGeometry(1, 0)), lam(color), [pos[0], pos[1] + s * 0.5, pos[2]], [s, s * 0.7, s], [0.3, pos[2], 0]);
  }
  function cactus(g) {
    const c = lam(0x5aa84a);
    P(g, G.cap(0.35, 2.4), c, [0, 1.5, 0]);
    P(g, G.cap(0.22, 0.8), c, [0.55, 1.8, 0], 1, [0, 0, -0.2]);
    P(g, G.cap(0.2, 0.7), c, [-0.5, 1.4, 0], 1, [0, 0, 0.2]);
  }

  // Metropolis: round-topped towers and floating platforms
  function tower(parent, pos, w, h, d, variant) {
    const b = building(w, h, d, variant);
    b.position.set(pos[0], h / 2 - 20, pos[2]);
    parent.add(b);
    const top = h - 20;
    P(parent, geo('hemiHi', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), lam(0xc8d4ea), [pos[0], top, pos[2]], [w * 0.55, w * 0.35, d * 0.55]);
    P(parent, G.cyl(), lam(0xe0e8f8), [pos[0], top + w * 0.35 + 2, pos[2]], [0.15, 4, 0.15]);
    P(parent, G.cyl(), glowy(0x6af0ff, 0.9), [pos[0], top - 1, pos[2]], [w * 0.52, 0.4, d * 0.52]);
  }
  function platform(g) {
    P(g, G.cyl(), lam(0xb8c4dc), [0, 0, 0], [5, 0.8, 5]);
    P(g, G.cyl(), lam(0x6ad04a), [0, 0.45, 0], [4.7, 0.12, 4.7]);
    P(g, G.cone(), lam(0x8a94b0), [0, -1.6, 0], [3, 2.4, 3], [Math.PI, 0, 0]);
    P(g, G.cyl(), glowy(0x6af0ff, 0.9), [0, -2.9, 0], [0.8, 0.2, 0.8]);
    for (const [x, z, s] of [[-2, -1, 1], [1.8, 1, 1.3], [0.5, -2.5, 0.8]]) {
      P(g, G.cyl(), lam(0x8a5a30), [x, 1.0 * s, z], [0.15 * s, 1.2 * s, 0.15 * s]);
      P(g, G.sphere(), lam(0x4ab83a), [x, 2.0 * s, z], [0.9 * s, 0.8 * s, 0.9 * s]);
    }
  }

  // Pokitaru: palm trees and beach huts
  function palm(g) {
    const trunk = lam(0xa8743a), leaf = lam(0x3ab84a), leaf2 = lam(0x2a9a3a);
    let x = 0;
    for (let i = 0; i < 5; i++) { P(g, G.cyl(), trunk, [x, 0.9 + i * 1.6, 0], [0.32 - i * 0.03, 1.7, 0.32 - i * 0.03], [0, 0, -0.1 - i * 0.03]); x += 0.18 + i * 0.05; }
    const top = [x, 8.6, 0];
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * Math.PI * 2;
      P(g, G.box(), i % 2 ? leaf : leaf2, [top[0] + Math.cos(a) * 1.4, top[1] - 0.4, Math.sin(a) * 1.4], [3.2, 0.12, 0.8], [0, -a, -0.45]);
    }
    for (let i = 0; i < 3; i++) P(g, G.sphere(), lam(0x6a4220), [top[0] + Math.cos(i * 2) * 0.35, top[1] - 0.5, Math.sin(i * 2) * 0.35], 0.26);
  }
  function hut(g) {
    P(g, G.box(), lam(0xe8c890), [0, 1.3, 0], [3.4, 2.6, 3.4]);
    P(g, G.box(), lam(0x6a4220), [0, 1.0, -1.72], [0.9, 1.8, 0.05]);
    P(g, geo('roof4', () => new THREE.ConeGeometry(1, 1, 4)), lam(0xf0c850), [0, 3.7, 0], [3.4, 2.2, 3.4], [0, Math.PI / 4, 0]);
    for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) P(g, G.cyl(), lam(0x8a5a30), [x, -0.6, z], [0.14, 1.6, 0.14]);
  }

  // Grelbin: ice crystals, snow banks and domes
  function crystal(g) {
    const c = lam(0x9aeaff, { emissive: 0x1a5a7a });
    P(g, geo('octa', () => new THREE.OctahedronGeometry(1, 0)), c, [0, 2.5, 0], [0.9, 2.8, 0.9]);
    P(g, geo('octa', () => new THREE.OctahedronGeometry(1, 0)), c, [1.0, 1.4, 0.3], [0.5, 1.6, 0.5], [0, 0, -0.4]);
    P(g, geo('octa', () => new THREE.OctahedronGeometry(1, 0)), c, [-0.9, 1.2, -0.2], [0.45, 1.3, 0.45], [0, 0, 0.45]);
  }
  function dome(g) {
    P(g, geo('hemiHi', () => new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), lam(0xf0f6ff), [0, 0, 0], [5, 4, 5]);
    P(g, geo('ringT', () => new THREE.TorusGeometry(1, 0.06, 6, 28)), lam(0x3a8aff, { emissive: 0x0a2a60 }), [0, 1.2, 0], [4.7, 4.7, 4.7], [Math.PI / 2, 0, 0]);
    P(g, G.box(), lam(0x2a3a5a), [0, 1.0, -4.6], [1.4, 2.0, 1.2]);
  }

  // Gaspar: volcanoes and lava
  function volcano(g) {
    P(g, geo('volc', () => new THREE.CylinderGeometry(3.5, 16, 22, 14)), lam(0x3a2a2c), [0, 11, 0]);
    P(g, G.cyl(), basic(0xff6a1a), [0, 22.05, 0], [3.2, 0.2, 3.2]);
    for (let i = 0; i < 4; i++) P(g, G.box(), basic(0xff7a1a), [Math.cos(i * 1.7) * 7, 13, Math.sin(i * 1.7) * 7], [0.7, 18, 0.3], [0, -i * 1.7, (i % 2 ? 1 : -1) * 0.12]);
    glowSprite(g, 0xff5a1a, 14, [0, 24, 0], 0.7);
  }
  function spire(g) {
    P(g, G.cone(), lam(0x2a2024), [0, 4, 0], [1.6, 8, 1.6]);
    P(g, G.cone(), lam(0x3a2c30), [1.2, 2.5, 0.5], [1, 5, 1]);
  }

  // the warp gate between planets
  function warpGate() {
    const g = new THREE.Group();
    const frame = lam(0x8a94b0);
    P(g, geo('arch', () => new THREE.TorusGeometry(5.6, 0.55, 10, 32, Math.PI)), frame, [0, 0, 0]);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x6af0ff });
    P(g, geo('arch2', () => new THREE.TorusGeometry(5.0, 0.16, 8, 32, Math.PI)), glowMat, [0, 0, -0.3]);
    for (const s of [-1, 1]) P(g, G.rbox(1.6, 1.2, 1.8, 0.3), frame, [s * 5.6, 0.4, 0]);
    const swirlTex = T.swirl().clone(); swirlTex.center.set(0.5, 0.5); swirlTex.needsUpdate = true;
    const discMat = new THREE.MeshBasicMaterial({ map: swirlTex, color: 0x6af0ff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    P(g, geo('warpDisc', () => new THREE.CircleGeometry(4.95, 40, 0, Math.PI)), discMat, [0, 0, 0]);
    const signMat = new THREE.MeshBasicMaterial({ transparent: true });
    const sign = P(g, G.plane(), signMat, [0, 7.6, 0.2], [7, 2.2, 1]);
    function setPlanet(w) {
      glowMat.color.set(w.gate); discMat.color.set(w.gate);
      signMat.map = T.sign(w.name.toUpperCase(), w.gate); signMat.needsUpdate = true;
    }
    function spin(t) { swirlTex.rotation = -t * 1.5; }
    return { g, setPlanet, spin, sign };
  }

  return { mergeStatic, place, boxUV, mesa, rockArch, rocks, cactus, tower, platform, palm, hut, crystal, dome, volcano, spire, warpGate, toon, hero, megabot, barrier, laserGate, hole, train, ramp, bolt, powerUp, shieldBubble, building, neonSign, flyingCar, glowSprite, lam, basic, glowy, spriteMat, G, P, grp, PU_COLORS };
})();
