// ============================================================
//  MY LIFE — 3D MODELS
//  Every model is built from simple rounded shapes glued
//  together: spheres, capsules, rounded boxes and cylinders.
//  People can be a baby, a kid, a teen, an adult or old!
// ============================================================
window.ML = window.ML || {};

ML.Models = (function () {
  const U = ML.U, T = ML.Tex;

  // ---------- materials (shared so the game stays fast) ----------
  const mats = {};
  function std(key, o) { return mats[key] || (mats[key] = new THREE.MeshStandardMaterial(o)); }
  const C = (color, rough = 0.6, metal = 0, extra = {}) => std('c' + color + '_' + rough + '_' + metal + JSON.stringify(extra), Object.assign({ color, roughness: rough, metalness: metal }, extra));
  const E = (color, k = 1) => C(color, 0.5, 0, { emissive: color, emissiveIntensity: k }); // glowing
  const B = (color) => mats['b' + color] || (mats['b' + color] = new THREE.MeshBasicMaterial({ color }));
  const M = {
    eyeWhite: () => C(0xfbfbff, 0.12),
    pupil: () => C(0x07060a, 0.05),
    glint: () => B(0xffffff),
    mouth: () => C(0x5a1020, 0.4),
    tongue: () => C(0xe0607a, 0.4),
    teeth: () => C(0xfff8ee, 0.25),
    black: () => C(0x1a1a20, 0.5),
    white: () => C(0xf6f6f6, 0.6),
    metal: () => C(0xc8ccd4, 0.3, 0.9),
    gold: () => C(0xf2c14a, 0.3, 1),
    glass: () => std('glass', { color: 0xbfe4ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false }),
    water: () => std('water', { color: 0x4ab0e8, roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }),
    tire: () => C(0x202024, 0.85),
    wood: () => std('woodT', { map: T.wood(0xb07a4a), roughness: 0.6 }),
    darkWood: () => std('dwoodT', { map: T.wood(0x6a4028), roughness: 0.6 }),
    leaf: () => C(0x4aa040, 0.8),
    leaf2: () => C(0x3a8a3a, 0.8),
  };
  const glowMat = (color) => mats['glow' + color] || (mats['glow' + color] = new THREE.SpriteMaterial({ map: T.glow(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));

  // ---------- geometries (cached) ----------
  const geos = {};
  const geo = (key, make) => geos[key] || (geos[key] = make());
  const G = {
    sphere: () => geo('sphere', () => new THREE.SphereGeometry(1, 22, 16)),
    sphereLo: () => geo('sphereLo', () => new THREE.SphereGeometry(1, 12, 8)),
    hemi: () => geo('hemi', () => new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)),
    box: () => geo('box', () => new THREE.BoxGeometry(1, 1, 1)),
    cyl: () => geo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 24)),
    cylLo: () => geo('cylLo', () => new THREE.CylinderGeometry(1, 1, 1, 10)),
    cone: () => geo('cone', () => new THREE.ConeGeometry(1, 1, 20)),
    skirt: () => geo('skirt', () => new THREE.CylinderGeometry(0.55, 1, 1, 22, 1)),
    torus: () => geo('torus', () => new THREE.TorusGeometry(1, 0.2, 10, 28)),
    ring: () => geo('ring', () => new THREE.TorusGeometry(1, 0.08, 8, 28)),
    mouthArc: () => geo('mouthArc', () => new THREE.TorusGeometry(1, 0.16, 8, 20, Math.PI)),
    plane: () => geo('plane', () => new THREE.PlaneGeometry(1, 1)),
    cap: (r, len) => geo('cap' + r.toFixed(3) + '_' + len.toFixed(3), () => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 6, 14)),
    rbox: (w, h, d, r) => geo('rbox' + [w, h, d, r].map((v) => v.toFixed(3)).join('_'), () => roundedBox(w, h, d, r)),
  };

  // a box with nice round edges
  function roundedBox(w, h, d, r, seg = 3) {
    r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
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
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function grp(parent, pos = [0, 0, 0], rot = null) {
    const g = new THREE.Group();
    g.position.set(pos[0], pos[1], pos[2]);
    if (rot) g.rotation.set(rot[0], rot[1], rot[2]);
    if (parent) parent.add(g);
    return g;
  }
  // soft round shadow on the floor
  function blobShadow(parent, r, rz) {
    const m = new THREE.Mesh(G.plane(), mats.shadow || (mats.shadow = new THREE.MeshBasicMaterial({ map: T.shadow(), transparent: true, depthWrite: false })));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.012; m.scale.set(r * 2, (rz || r) * 2, 1);
    m.renderOrder = 1;
    parent.add(m);
    return m;
  }
  function sprite(parent, color, size, pos) {
    const s = new THREE.Sprite(glowMat(color));
    s.scale.setScalar(size);
    s.position.set(pos[0], pos[1], pos[2]);
    parent.add(s);
    return s;
  }

  // ============================================================
  //  FACES — eyes, eyelids, eyebrows, mouths
  // ============================================================
  function makeEye(parent, pos, r, irisColor, lidMat) {
    const e = grp(parent, pos);
    P(e, G.sphere(), M.eyeWhite(), [0, 0, 0], [r, r, r * 0.85]);
    const look = grp(e);
    P(look, G.sphere(), C(irisColor, 0.2), [0, 0, r * 0.58], [r * 0.6, r * 0.6, r * 0.34]);
    P(look, G.sphere(), M.pupil(), [0, 0, r * 0.72], [r * 0.32, r * 0.32, r * 0.22]);
    P(look, G.sphereLo(), M.glint(), [r * 0.2, r * 0.26, r * 0.84], r * 0.13);
    const lid = P(e, G.hemi(), lidMat, [0, 0, 0], [r * 1.1, r * 1.1, r * 1.0]);
    lid.rotation.x = -0.6; lid.userData.anim = true;
    e.userData = { lid, look, r, baseOpen: -0.6 };
    return e;
  }
  function makeBrow(parent, pos, len, thick, mat, side) {
    const b = grp(parent, pos);
    P(b, G.cap(thick, len), mat, [0, 0, 0], 1, [0, 0, Math.PI / 2]);
    b.userData = { side, y0: pos[1] };
    return b;
  }
  function makeMouth(parent, pos, w) {
    const m = grp(parent, pos);
    const arc = P(m, G.mouthArc(), M.mouth(), [0, 0, 0], [w, w, w]);
    const open = P(m, G.sphere(), M.mouth(), [0, -w * 0.2, -w * 0.05], [w * 0.8, 0.001, w * 0.3]);
    arc.userData.anim = open.userData.anim = true;
    P(open, G.sphere(), M.tongue(), [0, -0.3, 0.3], [0.6, 0.5, 0.6]);
    m.userData = { arc, open, w };
    return m;
  }

  // set a face from a mood (-1 = furious/sad, 0 = meh, 1 = super happy)
  function setMood(ch, mood, open = 0) {
    const f = ch.userData.face;
    if (!f || !f.mouth) return;
    const m = U.clamp(mood + (f.moodBias || 0), -1, 1);
    const md = f.mouth.userData;
    const bend = 0.18 + Math.abs(m) * 0.75;
    if (m >= 0) { md.arc.rotation.z = Math.PI; md.arc.scale.set(md.w, md.w * bend, md.w); md.arc.position.y = md.w * 0.25 * bend; }
    else { md.arc.rotation.z = 0; md.arc.scale.set(md.w * 0.9, md.w * bend, md.w); md.arc.position.y = -md.w * 0.45 * bend; }
    md.open.scale.y = Math.max(0.001, open * md.w * 0.55);
    md.open.visible = open > 0.02;
    const bias = f.browBias || 0; // evil people have angry eyebrows all the time
    for (const b of f.brows) {
      const s = b.userData.side;
      b.rotation.z = s * ((m < 0 ? m * 0.45 : m * 0.12) - bias * 0.5);
      b.position.y = b.userData.y0 + (m > 0.4 ? 0.006 : 0) - bias * 0.006;
    }
    f.lidOffset = (m < -0.35 ? 0.45 : m > 0.6 ? 0.08 : 0) + bias * 0.35;
  }
  // blinking & looking around (call every frame)
  function animateFace(ch, t, dt, sleepy = 0) {
    const f = ch.userData.face;
    if (!f) return;
    const blinkT = (t + (ch.userData.blinkOff || 0)) % 3.7;
    const blink = blinkT < 0.13 ? Math.sin(blinkT / 0.13 * Math.PI) : 0;
    for (const e of f.eyes) {
      const d = e.userData;
      const open = U.lerp(d.baseOpen + (f.lidOffset || 0), 1.45, sleepy);
      d.lid.rotation.x = U.lerp(open, 1.45, blink);
    }
    const lt = Math.floor((t + (ch.userData.blinkOff || 0)) / 2.3);
    const lx = Math.sin(lt * 12.9898) * 0.25, ly = Math.cos(lt * 78.233) * 0.12;
    for (const e of f.eyes) { e.userData.look.rotation.y += (lx - e.userData.look.rotation.y) * Math.min(1, dt * 10); e.userData.look.rotation.x += (ly - e.userData.look.rotation.x) * Math.min(1, dt * 10); }
  }

  // glue together the pieces that never move on their own (much faster to draw)
  function mergeGeos(list) {
    let vc = 0, ic = 0;
    for (const [g] of list) { vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2);
    const idx = vc > 65535 ? new Uint32Array(ic) : new Uint16Array(ic);
    const v = new THREE.Vector3(), nm = new THREE.Matrix3();
    let vo = 0, io = 0;
    for (const [g, mtx] of list) {
      const p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv;
      nm.getNormalMatrix(mtx);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i).applyMatrix4(mtx); pos.set([v.x, v.y, v.z], (vo + i) * 3);
        if (n) { v.fromBufferAttribute(n, i).applyMatrix3(nm).normalize(); nor.set([v.x, v.y, v.z], (vo + i) * 3); }
        if (t) uv.set([t.getX(i), t.getY(i)], (vo + i) * 2);
      }
      if (g.index) { for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo; io += g.index.count; }
      else { for (let i = 0; i < p.count; i++) idx[io + i] = vo + i; io += p.count; }
      vo += p.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }
  function bake(g) {
    const buckets = new Map();
    for (const c of g.children) {
      if (c.isMesh && !c.userData.anim && c.children.length === 0 && c.geometry.type !== 'PlaneGeometry') {
        if (!buckets.has(c.material)) buckets.set(c.material, []);
        buckets.get(c.material).push(c);
      }
    }
    for (const [mat, list] of buckets) {
      if (list.length < 2) continue;
      const geo2 = mergeGeos(list.map((m) => { m.updateMatrix(); return [m.geometry, m.matrix]; }));
      list.forEach((m) => g.remove(m));
      geo2.userData.baked = true;
      const mesh = new THREE.Mesh(geo2, mat);
      mesh.castShadow = mesh.receiveShadow = true;
      g.add(mesh);
    }
    for (const c of g.children) if (!c.isMesh || c.children.length) bake(c);
  }
  // free the memory of a model we don't need anymore
  function dispose(root) {
    root.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.userData.baked) o.geometry.dispose(); });
  }

  // ============================================================
  //  LOFT — a smooth shape made of rings stacked on top of each
  //  other (like a pottery tower). Used for bodies, heads, cars...
  //  rings: [[y, width, depth, zShift, xShift], ...] (y going up)
  // ============================================================
  function cr(a, b, c, d, t) { // smooth curve through the rings
    const t2 = t * t, t3 = t2 * t;
    return a.map((_, i) => {
      const p0 = a[i] || 0, p1 = b[i] || 0, p2 = c[i] || 0, p3 = d[i] || 0;
      return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    });
  }
  function loft(rings, opt = {}) {
    const seg = opt.seg || 18, sub = opt.sub || 3, pw = opt.pow || 2;
    rings = rings.map((r) => [r[0], r[1], r[2], r[3] || 0, r[4] || 0]).sort((x, y) => x[0] - y[0]);
    const R = [];
    for (let i = 0; i < rings.length - 1; i++) {
      const p0 = rings[Math.max(0, i - 1)], p1 = rings[i], p2 = rings[i + 1], p3 = rings[Math.min(rings.length - 1, i + 2)];
      for (let s = 0; s < sub; s++) R.push(cr(p0, p1, p2, p3, s / sub));
    }
    R.push(rings[rings.length - 1]);
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < R.length; i++) {
      const [y, w, d, z, x] = R[i];
      for (let j = 0; j <= seg; j++) {
        const a = j / seg * Math.PI * 2, sa = Math.sin(a), ca = Math.cos(a);
        const sx = Math.sign(sa) * Math.pow(Math.abs(sa), 2 / pw), sz = Math.sign(ca) * Math.pow(Math.abs(ca), 2 / pw);
        pos.push(x + sx * Math.max(0.0005, w) / 2, y, z + sz * Math.max(0.0005, d) / 2);
        uv.push(j / seg, i / (R.length - 1));
      }
    }
    const W = seg + 1;
    for (let i = 0; i < R.length - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * W + j, b = a + W;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
    // close the bottom and the top
    if (opt.caps !== false) {
      const bi = pos.length / 3; const r0 = R[0];
      pos.push(r0[4], r0[0], r0[3]); uv.push(0.5, 0);
      for (let j = 0; j < seg; j++) idx.push(bi, j + 1, j);
      const ti = pos.length / 3; const rl = R[R.length - 1], o = (R.length - 1) * W;
      pos.push(rl[4], rl[0], rl[3]); uv.push(0.5, 1);
      for (let j = 0; j < seg; j++) idx.push(ti, o + j, o + j + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  // a cached loft (same shape = same geometry, so the game stays fast)
  const L0 = (key, rings, opt) => geo('loft' + key, () => loft(rings, opt));
  // a tube from point a to point b (for bike frames, poles...)
  function tube(parent, a, b, r, mat) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const m = P(parent, G.cylLo(), mat, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], [r, len, r]);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize());
    return m;
  }
  // car paint: shiny like a real car
  const paint = (color) => mats['paint' + color] || (mats['paint' + color] = new THREE.MeshPhysicalMaterial({ color, metalness: 0.45, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }));

  // ============================================================
  //  THINGS & FURNITURE (everything that isn't alive)
  // ============================================================
  function item(kind, opt = {}) {
    const g = new THREE.Group();
    const col = opt.color;
    const shadow = (r, rz) => blobShadow(g, r, rz);
    switch (kind) {
      // ---- small things you can hold or throw ----
      case 'peas': P(g, G.sphereLo(), C(0x7ac83a, 0.5), [0, 0, 0], 0.05); break;
      case 'bowl':
        P(g, G.sphere(), C(col || 0xff8ac8, 0.4), [0, 0.04, 0], [0.12, 0.06, 0.12]);
        P(g, G.cylLo(), C(0x7ac83a, 0.7), [0, 0.07, 0], [0.1, 0.015, 0.1]);
        break;
      case 'ball': P(g, G.sphere(), C(col || 0xff3a3a, 0.4), [0, 0.12, 0], 0.12); P(g, G.torus(), M.white(), [0, 0.12, 0], [0.121, 0.121, 0.121]); break;
      case 'snowball': P(g, G.sphereLo(), M.white(), [0, 0, 0], 0.07); break;
      case 'cake': {
        P(g, G.cyl(), C(0xfff0e0, 0.7), [0, 0.1, 0], [0.25, 0.2, 0.25]);
        P(g, G.cyl(), C(0xff8ac8, 0.6), [0, 0.21, 0], [0.26, 0.04, 0.26]);
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; P(g, G.sphereLo(), C(0xff8ac8, 0.6), [Math.cos(a) * 0.25, 0.18, Math.sin(a) * 0.25], 0.035); }
        g.userData.flames = [];
        for (let i = 0; i < 5; i++) {
          const a = i / 5 * Math.PI * 2;
          P(g, G.cylLo(), C([0x3ab0ff, 0xffd84a, 0x7ad84a, 0xff6a4a, 0xc87aff][i], 0.5), [Math.cos(a) * 0.13, 0.28, Math.sin(a) * 0.13], [0.012, 0.1, 0.012]);
          const fl = sprite(g, 0xffb040, 0.09, [Math.cos(a) * 0.13, 0.355, Math.sin(a) * 0.13]);
          g.userData.flames.push(fl);
        }
        P(g, G.cylLo(), M.white(), [0, 0.005, 0], [0.34, 0.01, 0.34]);
        shadow(0.36);
        break;
      }
      case 'gift':
        P(g, G.rbox(0.3, 0.25, 0.3, 0.02), C(col || 0x3ab0ff, 0.5), [0, 0.125, 0]);
        P(g, G.box(), C(0xffd84a, 0.4), [0, 0.126, 0], [0.31, 0.255, 0.05]);
        P(g, G.box(), C(0xffd84a, 0.4), [0, 0.126, 0], [0.05, 0.255, 0.31]);
        P(g, G.torus(), C(0xffd84a, 0.4), [0, 0.28, 0], [0.06, 0.06, 0.06], [0, 0, 0]);
        shadow(0.22);
        break;
      case 'burger':
        P(g, G.hemi(), C(0xd8963a, 0.6), [0, 0.05, 0], [0.09, 0.05, 0.09]);
        P(g, G.cylLo(), C(0x6a3a1a, 0.7), [0, 0.04, 0], [0.095, 0.025, 0.095]);
        P(g, G.cylLo(), C(0x6ac83a, 0.7), [0, 0.055, 0], [0.1, 0.006, 0.1]);
        P(g, G.cylLo(), C(0xd8963a, 0.6), [0, 0.015, 0], [0.09, 0.02, 0.09]);
        break;
      case 'icecream':
        P(g, G.cone(), C(0xd8a060, 0.7), [0, 0, 0], [0.04, 0.14, 0.04], [Math.PI, 0, 0]);
        P(g, G.sphereLo(), C(col || 0xff9ac8, 0.6), [0, 0.08, 0], 0.05);
        break;
      case 'phone': P(g, G.rbox(0.07, 0.14, 0.012, 0.01), M.black(), [0, 0, 0]); P(g, G.box(), E(0x6ac8ff, 0.6), [0, 0, 0.007], [0.06, 0.12, 0.001]); break;
      case 'book': P(g, G.rbox(0.16, 0.22, 0.04, 0.01), C(col || 0xc83a3a, 0.7), [0, 0, 0]); P(g, G.box(), M.white(), [0.004, 0, 0], [0.15, 0.21, 0.03]); break;
      case 'wallet': P(g, G.rbox(0.12, 0.09, 0.02, 0.01), C(0x6a3a1a, 0.6), [0, 0, 0]); P(g, G.box(), C(0x7ac85a, 0.6), [0, 0.05, 0], [0.09, 0.02, 0.01]); break;
      case 'money': for (let i = 0; i < 3; i++) P(g, G.box(), C(0x7ac85a, 0.6), [i * 0.01, i * 0.008, 0], [0.15, 0.006, 0.07]); break;
      case 'flower':
        P(g, G.cylLo(), C(0x3a9a3a, 0.7), [0, 0.12, 0], [0.006, 0.24, 0.006]);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P(g, G.sphereLo(), C(col || 0xff6aa0, 0.6), [Math.cos(a) * 0.03, 0.25, Math.sin(a) * 0.03], 0.022); }
        P(g, G.sphereLo(), C(0xffd84a, 0.6), [0, 0.25, 0], 0.018);
        break;
      case 'trophy':
        P(g, G.cylLo(), C(0x3a2a1a, 0.6), [0, 0.03, 0], [0.07, 0.06, 0.07]);
        P(g, G.cylLo(), M.gold(), [0, 0.1, 0], [0.015, 0.1, 0.015]);
        P(g, G.sphere(), M.gold(), [0, 0.2, 0], [0.08, 0.08, 0.08]);
        break;
      case 'mic': P(g, G.cylLo(), M.black(), [0, 0, 0], [0.015, 0.16, 0.015]); P(g, G.sphereLo(), M.metal(), [0, 0.09, 0], 0.03); break;
      case 'teddy':
        P(g, G.sphere(), C(0xb07a4a, 0.9), [0, 0.1, 0], [0.08, 0.1, 0.07]);
        P(g, G.sphere(), C(0xb07a4a, 0.9), [0, 0.22, 0], 0.07);
        for (const sx of [-1, 1]) { P(g, G.sphereLo(), C(0xb07a4a, 0.9), [sx * 0.05, 0.28, 0], 0.025); P(g, G.sphereLo(), M.black(), [sx * 0.025, 0.23, 0.06], 0.01); }
        break;
      case 'cookie': P(g, G.cylLo(), C(0xd8a060, 0.8), [0, 0, 0], [0.05, 0.012, 0.05]); for (let i = 0; i < 4; i++) P(g, G.sphereLo(), C(0x4a2a10, 0.8), [Math.cos(i * 2) * 0.025, 0.008, Math.sin(i * 2) * 0.025], 0.008); break;
      case 'jar':
        P(g, G.cyl(), M.glass(), [0, 0.12, 0], [0.1, 0.24, 0.1]);
        P(g, G.cyl(), C(0xc83a3a, 0.5), [0, 0.25, 0], [0.105, 0.03, 0.105]);
        for (let i = 0; i < 4; i++) P(g, G.cylLo(), C(0xd8a060, 0.8), [0, 0.04 + i * 0.045, 0], [0.07, 0.012, 0.07], [0.2 * i, 0, 0.1]);
        break;
      case 'card': P(g, G.box(), C(col || 0xff6a9a, 0.6), [0, 0, 0], [0.16, 0.12, 0.005]); P(g, G.sphereLo(), C(0xffffff, 0.6), [0, 0, 0.004], [0.03, 0.03, 0.002]); break;
      case 'pizza': P(g, G.cylLo(), C(0xf2c84a, 0.7), [0, 0, 0], [0.18, 0.012, 0.18]); for (let i = 0; i < 6; i++) P(g, G.cylLo(), C(0xc83a3a, 0.7), [Math.cos(i) * 0.1, 0.008, Math.sin(i) * 0.1], [0.025, 0.005, 0.025]); break;
      case 'paper': P(g, G.box(), M.white(), [0, 0, 0], [0.2, 0.28, 0.004]); break;
      case 'cane': P(g, G.cap(0.012, 0.8), M.darkWood(), [0, 0.42, 0]); break;
      case 'balloon': P(g, G.sphere(), C(col || 0xff3a6a, 0.3), [0, 1.2, 0], [0.18, 0.22, 0.18]); P(g, G.cylLo(), M.white(), [0, 0.55, 0], [0.003, 1.1, 0.003]); break;
      case 'diploma': P(g, G.cyl(), C(0xf8f0d8, 0.7), [0, 0, 0], [0.025, 0.25, 0.025], [0, 0, Math.PI / 2]); P(g, G.cyl(), C(0xc83a3a, 0.6), [0, 0, 0], [0.028, 0.03, 0.028], [0, 0, Math.PI / 2]); break;
      case 'ring': P(g, G.torus(), M.gold(), [0, 0, 0], 0.025); P(g, G.sphereLo(), C(0xbfeaff, 0.05, 0.3), [0, 0.03, 0], 0.012); break;
      case 'broom': P(g, G.cap(0.014, 1.1), M.wood(), [0, 0.6, 0]); P(g, G.cone(), C(0xd8b060, 0.9), [0, 0.08, 0], [0.12, 0.2, 0.05]); break;
      case 'camera': P(g, G.rbox(0.14, 0.09, 0.08, 0.015), M.black(), [0, 0, 0]); P(g, G.cylLo(), M.metal(), [0, 0, 0.05], [0.03, 0.05, 0.03], [Math.PI / 2, 0, 0]); break;
      case 'bingo': P(g, G.box(), C(0xffe8a0, 0.7), [0, 0.003, 0], [0.22, 0.005, 0.28]); for (let i = 0; i < 9; i++) P(g, G.cylLo(), C(0xc83a3a, 0.5), [((i % 3) - 1) * 0.06, 0.008, (Math.floor(i / 3) - 1) * 0.07], [0.018, 0.004, 0.018]); break;
      case 'sign': {
        const s = opt.w || 1.6;
        P(g, G.box(), std('sgn' + opt.text, { map: T.sign(opt.text, opt.bg, opt.fg), roughness: 0.5 }), [0, 0, 0], [s, s / 4, 0.05]);
        break;
      }
      // ---- furniture ----
      case 'bed': {
        P(g, G.rbox(1.1, 0.35, 2.0, 0.05), M.wood(), [0, 0.2, 0]);
        P(g, G.rbox(1.0, 0.18, 1.9, 0.08), M.white(), [0, 0.45, 0]);
        P(g, G.rbox(1.04, 0.2, 1.3, 0.08), C(col || 0x4a8ae8, 0.85), [0, 0.5, -0.3]);
        P(g, G.rbox(0.6, 0.12, 0.3, 0.06), M.white(), [0, 0.6, 0.75]);
        P(g, G.rbox(1.1, 0.8, 0.08, 0.03), M.wood(), [0, 0.45, 0.98]);
        shadow(0.7, 1.15);
        break;
      }
      case 'crib': {
        P(g, G.rbox(0.8, 0.08, 1.2, 0.02), M.white(), [0, 0.38, 0]);
        P(g, G.rbox(0.74, 0.08, 1.14, 0.03), C(0xaad8ff, 0.8), [0, 0.43, 0]);
        for (const sx of [-1, 1]) {
          P(g, G.box(), M.white(), [sx * 0.4, 0.82, 0], [0.04, 0.04, 1.22]);
          P(g, G.box(), M.white(), [0, 0.82, sx * 0.6], [0.84, 0.04, 0.04]);
          for (let i = 0; i < 9; i++) P(g, G.cylLo(), M.white(), [sx * 0.4, 0.55, -0.55 + i * 0.137], [0.015, 0.55, 0.015]);
          for (let i = 0; i < 6; i++) P(g, G.cylLo(), M.white(), [-0.35 + i * 0.14, 0.55, sx * 0.6], [0.015, 0.55, 0.015]);
        }
        for (const x of [-0.4, 0.4]) for (const z of [-0.6, 0.6]) P(g, G.box(), M.white(), [x, 0.42, z], [0.06, 0.84, 0.06]);
        // a mobile with stars
        const mob = grp(g, [0, 1.3, 0]);
        P(g, G.cylLo(), M.white(), [0.38, 1.06, 0], [0.012, 0.5, 0.012]);
        P(g, G.cylLo(), M.white(), [0.19, 1.3, 0], [0.012, 0.38, 0.012], [0, 0, Math.PI / 2]);
        for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; P(mob, G.sphereLo(), C([0xffd84a, 0xff8ac8, 0x6ac8ff, 0x8aea6a][i], 0.5), [Math.cos(a) * 0.18, -0.15, Math.sin(a) * 0.18], 0.045); }
        g.userData.spin = mob;
        shadow(0.5, 0.75);
        break;
      }
      case 'sofa': {
        const c = C(col || 0xe8604a, 0.9);
        P(g, G.rbox(1.9, 0.4, 0.85, 0.12), c, [0, 0.3, 0]);
        P(g, G.rbox(1.9, 0.6, 0.25, 0.12), c, [0, 0.6, -0.33]);
        for (const sx of [-1, 1]) P(g, G.rbox(0.22, 0.55, 0.85, 0.1), c, [sx * 0.9, 0.42, 0]);
        for (const sx of [-1, 1]) P(g, G.rbox(0.75, 0.14, 0.6, 0.07), C(T.shade(col || 0xe8604a, 0.15), 0.9), [sx * 0.4, 0.55, 0.05]);
        shadow(1.1, 0.6);
        break;
      }
      case 'armchair': {
        const c = C(col || 0x8a5ac8, 0.9);
        P(g, G.rbox(0.85, 0.4, 0.8, 0.12), c, [0, 0.3, 0]);
        P(g, G.rbox(0.85, 0.65, 0.22, 0.1), c, [0, 0.65, -0.3]);
        for (const sx of [-1, 1]) P(g, G.rbox(0.18, 0.5, 0.8, 0.08), c, [sx * 0.4, 0.45, 0]);
        shadow(0.55);
        break;
      }
      case 'tv': {
        P(g, G.rbox(1.4, 0.45, 0.45, 0.04), M.darkWood(), [0, 0.225, 0]);
        P(g, G.rbox(1.3, 0.75, 0.06, 0.02), M.black(), [0, 0.9, 0]);
        P(g, G.plane(), std('tvscr', { map: T.screen('tv'), emissive: 0xffffff, emissiveMap: T.screen('tv'), emissiveIntensity: 0.7 }), [0, 0.9, 0.032], [1.2, 0.66, 1]);
        P(g, G.cylLo(), M.black(), [0, 0.5, 0], [0.04, 0.1, 0.04]);
        shadow(0.8, 0.35);
        break;
      }
      case 'table': {
        P(g, G.rbox(1.3, 0.06, 0.85, 0.02), M.wood(), [0, 0.74, 0]);
        for (const x of [-0.58, 0.58]) for (const z of [-0.36, 0.36]) P(g, G.cylLo(), M.wood(), [x, 0.37, z], [0.035, 0.74, 0.035]);
        shadow(0.8, 0.55);
        break;
      }
      case 'chair': {
        const c = col ? C(col, 0.6) : M.wood();
        P(g, G.rbox(0.45, 0.05, 0.45, 0.02), c, [0, 0.46, 0]);
        P(g, G.rbox(0.45, 0.5, 0.05, 0.02), c, [0, 0.72, -0.2]);
        for (const x of [-0.19, 0.19]) for (const z of [-0.19, 0.19]) P(g, G.cylLo(), c, [x, 0.23, z], [0.02, 0.46, 0.02]);
        shadow(0.3);
        break;
      }
      case 'stool': P(g, G.cylLo(), C(col || 0xc83a3a, 0.5), [0, 0.7, 0], [0.2, 0.06, 0.2]); P(g, G.cylLo(), M.metal(), [0, 0.35, 0], [0.03, 0.7, 0.03]); P(g, G.cylLo(), M.metal(), [0, 0.02, 0], [0.18, 0.03, 0.18]); shadow(0.22); break;
      case 'lamp': {
        P(g, G.cylLo(), M.black(), [0, 0.02, 0], [0.16, 0.04, 0.16]);
        P(g, G.cylLo(), M.metal(), [0, 0.75, 0], [0.018, 1.5, 0.018]);
        P(g, G.cone(), E(col || 0xfff0c0, 0.6), [0, 1.55, 0], [0.24, 0.3, 0.24]);
        sprite(g, 0xffe0a0, 0.8, [0, 1.45, 0]);
        shadow(0.2);
        break;
      }
      case 'plant': {
        P(g, G.cyl(), C(col || 0xd8704a, 0.7), [0, 0.18, 0], [0.18, 0.36, 0.18]);
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P(g, G.sphere(), i % 2 ? M.leaf() : M.leaf2(), [Math.cos(a) * 0.15, 0.5 + (i % 3) * 0.1, Math.sin(a) * 0.15], [0.12, 0.2, 0.12], [Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5]); }
        P(g, G.sphere(), M.leaf(), [0, 0.75, 0], 0.16);
        shadow(0.25);
        break;
      }
      case 'rug': {
        const m = P(g, G.cylLo(), C(col || 0xe8b84a, 0.95), [0, 0.008, 0], [1.1, 0.012, 0.75]);
        m.castShadow = false;
        P(g, G.ring(), C(T.shade(col || 0xe8b84a, -0.25), 0.95), [0, 0.016, 0], [0.9, 0.6, 0.3], [Math.PI / 2, 0, 0]).castShadow = false;
        break;
      }
      case 'fridge': {
        P(g, G.rbox(0.8, 1.8, 0.7, 0.06), C(col || 0xf0f4f8, 0.3, 0.1), [0, 0.9, 0]);
        P(g, G.box(), C(0xa0a8b0, 0.4), [0, 1.25, 0.351], [0.78, 0.015, 0.01]);
        P(g, G.rbox(0.04, 0.4, 0.04, 0.015), M.metal(), [0.3, 1.5, 0.37]);
        P(g, G.rbox(0.04, 0.5, 0.04, 0.015), M.metal(), [0.3, 0.85, 0.37]);
        for (let i = 0; i < 3; i++) P(g, G.box(), C([0xff6a4a, 0xffd84a, 0x6ac8ff][i], 0.5), [-0.2 + i * 0.12, 1.4 - i * 0.15, 0.36], [0.07, 0.07, 0.01]);
        shadow(0.5);
        break;
      }
      case 'pc': {
        P(g, G.rbox(1.3, 0.05, 0.7, 0.02), M.darkWood(), [0, 0.75, 0]);
        for (const x of [-0.6, 0.6]) P(g, G.box(), M.darkWood(), [x, 0.37, 0], [0.05, 0.74, 0.66]);
        P(g, G.rbox(0.8, 0.48, 0.04, 0.02), M.black(), [0, 1.08, -0.15]);
        P(g, G.plane(), std('pcscr', { map: T.screen('game'), emissive: 0xffffff, emissiveMap: T.screen('game'), emissiveIntensity: 0.8 }), [0, 1.08, -0.128], [0.74, 0.42, 1]);
        P(g, G.box(), M.black(), [0, 0.86, -0.15], [0.05, 0.2, 0.05]);
        P(g, G.rbox(0.5, 0.025, 0.16, 0.01), M.black(), [0, 0.79, 0.12]);
        P(g, G.rbox(0.22, 0.45, 0.45, 0.02), M.black(), [0.48, 1.0, -0.05]);
        P(g, G.box(), E(0xff3aff, 1), [0.48, 1.0, 0.177], [0.02, 0.38, 0.005]);
        P(g, G.box(), E(0x3affff, 1), [0.48, 1.0, 0.176], [0.18, 0.02, 0.005]);
        shadow(0.75, 0.45);
        break;
      }
      case 'desk': {
        P(g, G.rbox(1.3, 0.05, 0.7, 0.02), col ? C(col, 0.5) : M.wood(), [0, 0.75, 0]);
        for (const x of [-0.6, 0.6]) P(g, G.box(), M.metal(), [x, 0.37, 0], [0.04, 0.74, 0.6]);
        if (opt.computer !== false) {
          P(g, G.rbox(0.6, 0.38, 0.04, 0.02), M.black(), [0, 1.03, -0.15]);
          P(g, G.plane(), std('offscr', { map: T.screen('work'), emissive: 0xffffff, emissiveMap: T.screen('work'), emissiveIntensity: 0.6 }), [0, 1.03, -0.128], [0.54, 0.32, 1]);
          P(g, G.box(), M.black(), [0, 0.85, -0.15], [0.05, 0.16, 0.05]);
          P(g, G.rbox(0.45, 0.02, 0.15, 0.01), C(0x3a3a40, 0.5), [0, 0.79, 0.12]);
        }
        shadow(0.75, 0.45);
        break;
      }
      case 'schooldesk': {
        P(g, G.rbox(0.7, 0.04, 0.5, 0.015), C(0xd8b47a, 0.5), [0, 0.62, 0]);
        for (const x of [-0.3, 0.3]) P(g, G.box(), M.metal(), [x, 0.31, 0], [0.03, 0.62, 0.4]);
        shadow(0.45, 0.35);
        break;
      }
      case 'fishtank': {
        P(g, G.rbox(1.0, 0.7, 0.4, 0.02), M.darkWood(), [0, 0.35, 0]);
        P(g, G.box(), M.water(), [0, 0.95, 0], [0.95, 0.5, 0.38]);
        P(g, G.box(), M.glass(), [0, 0.95, 0], [0.98, 0.52, 0.4]);
        P(g, G.box(), C(0xead29a, 0.9), [0, 0.72, 0], [0.94, 0.04, 0.37]);
        const fish = grp(g, [0, 0.95, 0]);
        for (let i = 0; i < 4; i++) { const f = grp(fish, [(i - 1.5) * 0.2, (i % 2) * 0.12 - 0.05, (i % 3 - 1) * 0.08]); P(f, G.sphereLo(), C([0xff8a2a, 0xffd84a, 0x3ab0ff, 0xff4a8a][i], 0.4), [0, 0, 0], [0.05, 0.035, 0.015]); P(f, G.cone(), C([0xff8a2a, 0xffd84a, 0x3ab0ff, 0xff4a8a][i], 0.4), [-0.06, 0, 0], [0.025, 0.04, 0.01], [0, 0, Math.PI / 2]); }
        g.userData.fish = fish;
        for (let i = 0; i < 3; i++) P(g, G.cylLo(), M.leaf(), [0.3 - i * 0.05, 0.85, -0.1], [0.012, 0.25, 0.012], [0, 0, 0.1 * i]);
        shadow(0.6, 0.3);
        break;
      }
      case 'bookshelf': {
        P(g, G.rbox(1.0, 1.8, 0.35, 0.02), M.darkWood(), [0, 0.9, 0]);
        for (let s = 0; s < 4; s++) for (let i = 0; i < 8; i++) {
          if ((s * 8 + i) % 7 === 3) continue;
          P(g, G.box(), C([0xc83a3a, 0x3a6ac8, 0x3a9a5a, 0xe8b84a, 0x8a4ac8][(s * 3 + i) % 5], 0.7), [-0.4 + i * 0.11, 0.33 + s * 0.42, 0.02], [0.08, 0.3 - (i % 3) * 0.03, 0.26]);
        }
        shadow(0.6, 0.25);
        break;
      }
      case 'arcade': {
        P(g, G.rbox(0.7, 1.7, 0.7, 0.03), C(col || 0x6a2ad8, 0.5), [0, 0.85, 0]);
        P(g, G.plane(), std('arcscr', { map: T.screen('game'), emissive: 0xffffff, emissiveMap: T.screen('game'), emissiveIntensity: 0.9 }), [0, 1.25, 0.352], [0.55, 0.42, 1]);
        P(g, G.rbox(0.7, 0.08, 0.35, 0.02), M.black(), [0, 0.95, 0.45]);
        P(g, G.sphereLo(), C(0xff3a3a, 0.4), [-0.15, 1.02, 0.45], 0.035);
        for (let i = 0; i < 3; i++) P(g, G.sphereLo(), C([0xffd84a, 0x3ab0ff, 0x7ae84a][i], 0.4), [0.05 + i * 0.08, 1.0, 0.48], 0.025);
        P(g, G.box(), E(0xffd84a, 0.8), [0, 1.62, 0.352], [0.6, 0.12, 0.01]);
        shadow(0.45);
        break;
      }
      case 'hottub': {
        P(g, G.cyl(), M.wood(), [0, 0.35, 0], [1.0, 0.7, 1.0]);
        P(g, G.cyl(), M.water(), [0, 0.6, 0], [0.92, 0.1, 0.92]);
        g.userData.bubbles = [];
        for (let i = 0; i < 8; i++) { const b = P(g, G.sphereLo(), M.white(), [Math.cos(i) * 0.5, 0.66, Math.sin(i * 1.7) * 0.5], 0.04); g.userData.bubbles.push(b); }
        shadow(1.1);
        break;
      }
      case 'piano': {
        P(g, G.rbox(1.5, 1.1, 0.6, 0.04), M.black(), [0, 0.55, 0]);
        P(g, G.box(), M.white(), [0, 0.75, 0.35], [1.4, 0.04, 0.2]);
        for (let i = 0; i < 10; i++) P(g, G.box(), M.black(), [-0.6 + i * 0.13, 0.78, 0.3], [0.05, 0.03, 0.12]);
        shadow(0.85, 0.4);
        break;
      }
      case 'toybox': {
        P(g, G.rbox(0.7, 0.45, 0.45, 0.04), C(col || 0xff6a4a, 0.5), [0, 0.225, 0]);
        P(g, G.sphere(), C(0x3ab0ff, 0.4), [-0.15, 0.5, 0], 0.1);
        P(g, G.box(), C(0xffd84a, 0.5), [0.12, 0.5, 0], [0.14, 0.14, 0.14], [0.3, 0.5, 0]);
        shadow(0.45);
        break;
      }
      case 'blocks': for (let i = 0; i < 5; i++) P(g, G.rbox(0.1, 0.1, 0.1, 0.015), C([0xff4a4a, 0x3ab0ff, 0xffd84a, 0x6ad84a, 0xc87aff][i], 0.5), [(i % 3) * 0.12 - 0.12, 0.05 + (i > 2 ? 0.1 : 0), (i > 2 ? 0 : (i % 2) * 0.05)], 1, [0, i * 0.4, 0]); break;
      case 'counter': {
        P(g, G.rbox(opt.w || 2.4, 0.95, 0.65, 0.03), C(col || 0xf0f0f0, 0.5), [0, 0.475, 0]);
        P(g, G.rbox((opt.w || 2.4) + 0.06, 0.05, 0.7, 0.02), C(0x8a8a94, 0.3, 0.3), [0, 0.97, 0]);
        shadow((opt.w || 2.4) * 0.55, 0.4);
        break;
      }
      case 'stove': {
        P(g, G.rbox(0.8, 0.95, 0.65, 0.03), C(0xd8dce0, 0.3, 0.3), [0, 0.475, 0]);
        P(g, G.box(), M.black(), [0, 0.96, 0], [0.75, 0.02, 0.6]);
        for (const x of [-0.18, 0.18]) for (const z of [-0.14, 0.14]) P(g, G.torus(), C(0x3a3a40, 0.5), [x, 0.975, z], [0.09, 0.09, 0.09], [Math.PI / 2, 0, 0]);
        P(g, G.box(), M.glass(), [0, 0.5, 0.33], [0.6, 0.4, 0.01]);
        shadow(0.5);
        break;
      }
      case 'chalkboard': {
        P(g, G.box(), M.wood(), [0, 0, 0], [3.1, 1.4, 0.06]);
        P(g, G.plane(), std('chalk' + (opt.lines || []).join(), { map: T.chalkboard(opt.lines || ['2 + 2 = 4']), roughness: 0.9 }), [0, 0, 0.035], [3.0, 1.3, 1]);
        P(g, G.box(), M.wood(), [0, -0.72, 0.06], [3.0, 0.05, 0.12]);
        break;
      }
      case 'hospitalbed': {
        P(g, G.rbox(1.0, 0.1, 2.0, 0.03), M.metal(), [0, 0.55, 0]);
        P(g, G.rbox(0.95, 0.15, 1.95, 0.06), M.white(), [0, 0.67, 0]);
        P(g, G.rbox(0.98, 0.12, 1.2, 0.05), C(0x9ad0e8, 0.8), [0, 0.72, -0.35]);
        P(g, G.rbox(0.5, 0.1, 0.3, 0.05), M.white(), [0, 0.8, 0.78]);
        for (const x of [-0.45, 0.45]) for (const z of [-0.9, 0.9]) P(g, G.cylLo(), M.metal(), [x, 0.27, z], [0.025, 0.55, 0.025]);
        P(g, G.box(), M.metal(), [0, 0.9, 1.0], [1.0, 0.6, 0.04]);
        shadow(0.7, 1.1);
        break;
      }
      case 'monitor': {
        P(g, G.cylLo(), M.metal(), [0, 0.7, 0], [0.02, 1.4, 0.02]);
        P(g, G.rbox(0.4, 0.3, 0.1, 0.02), C(0xe8eef4, 0.4), [0, 1.45, 0]);
        P(g, G.plane(), B(0x0a2a1a), [0, 1.45, 0.052], [0.34, 0.24, 1]);
        g.userData.beep = P(g, G.box(), B(0x3aff6a), [0, 1.45, 0.054], [0.3, 0.015, 0.001]);
        shadow(0.2);
        break;
      }
      // ---- outdoor stuff ----
      case 'tree': {
        const s = opt.s || 1;
        const bark = std('bark', { color: 0x6a5040, map: T.hairTex(), roughness: 0.95 });
        P(g, L0('trunk', [[0, 0.32, 0.32], [0.5, 0.24, 0.24], [2.2, 0.17, 0.17], [2.8, 0.1, 0.1]], { seg: 10 }), bark, [0, 0, 0], s);
        const lf = [std('leafA', { color: 0x4a7a32, map: T.grass(), roughness: 0.9 }), std('leafB', { color: 0x3a6a2a, map: T.grass(), roughness: 0.9 })];
        const rr = U.seeded(Math.round(s * 100) + 3);
        for (let i = 0; i < 16; i++) {
          const a = rr() * Math.PI * 2, rad = 0.3 + rr() * 0.75, y = 2.4 + rr() * 1.4;
          P(g, G.sphereLo(), lf[i % 2], [Math.cos(a) * rad * s, y * s, Math.sin(a) * rad * s], (0.45 + rr() * 0.3) * s, [rr(), rr(), rr()]);
        }
        shadow(1.3 * s);
        break;
      }
      case 'palm': {
        const s = opt.s || 1;
        const bark = std('palmbark', { color: 0x8a7458, map: T.hairTex(), roughness: 0.95 });
        const top = Mo_curve(g, bark, s);
        const frond = std('frond', { color: 0x4a8a3a, roughness: 0.85, side: THREE.DoubleSide });
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * Math.PI * 2;
          const f = grp(g, top, [0, a, 0]);
          const leaf = P(f, G.cone(), frond, [0, 0, 1.1 * s], [0.35 * s, 2.4 * s, 0.03 * s], [Math.PI / 2 + 0.35, 0, 0]);
          leaf.rotation.order = 'YXZ';
        }
        P(g, G.sphereLo(), C(0x5a4a2a, 0.8), top, 0.25 * s);
        shadow(1.6 * s);
        break;
      }
      case 'bush': for (let i = 0; i < 4; i++) P(g, G.sphere(), i % 2 ? M.leaf() : M.leaf2(), [(i - 1.5) * 0.3, 0.3, (i % 2) * 0.15], 0.35); shadow(0.7, 0.4); break;
      case 'bench': {
        for (let i = 0; i < 3; i++) P(g, G.rbox(1.6, 0.05, 0.13, 0.02), M.wood(), [0, 0.45, -0.16 + i * 0.16]);
        for (let i = 0; i < 2; i++) P(g, G.rbox(1.6, 0.13, 0.04, 0.02), M.wood(), [0, 0.65 + i * 0.17, -0.27], 1, [-0.15, 0, 0]);
        for (const x of [-0.7, 0.7]) { P(g, G.box(), M.black(), [x, 0.22, 0], [0.05, 0.45, 0.4]); P(g, G.box(), M.black(), [x, 0.65, -0.27], [0.05, 0.45, 0.05]); }
        shadow(0.9, 0.35);
        break;
      }
      case 'streetlight': {
        P(g, G.cyl(), C(0x2a3a3a, 0.5, 0.5), [0, 2.0, 0], [0.06, 4.0, 0.06]);
        P(g, G.cyl(), C(0x2a3a3a, 0.5, 0.5), [0, 3.95, 0.35], [0.04, 0.7, 0.04], [Math.PI / 2, 0, 0]);
        P(g, G.rbox(0.3, 0.1, 0.5, 0.04), C(0x2a3a3a, 0.5, 0.5), [0, 3.9, 0.7]);
        P(g, G.box(), E(0xfff4c0, 1), [0, 3.84, 0.7], [0.24, 0.02, 0.4]);
        shadow(0.2);
        break;
      }
      case 'hydrant': P(g, G.cyl(), C(0xe83a3a, 0.5), [0, 0.3, 0], [0.12, 0.6, 0.12]); P(g, G.sphere(), C(0xe83a3a, 0.5), [0, 0.6, 0], 0.12); P(g, G.cyl(), C(0xe83a3a, 0.5), [0, 0.38, 0], [0.05, 0.4, 0.05], [0, 0, Math.PI / 2]); shadow(0.2); break;
      case 'trafficlight': {
        P(g, G.cyl(), C(0x2a2a2a, 0.5), [0, 1.6, 0], [0.06, 3.2, 0.06]);
        P(g, G.rbox(0.3, 0.8, 0.25, 0.05), C(0x2a2a2a, 0.5), [0, 3.3, 0]);
        P(g, G.sphereLo(), E(0xff2a2a, 1), [0, 3.55, 0.13], 0.08);
        P(g, G.sphereLo(), C(0x5a5a20, 0.5), [0, 3.3, 0.13], 0.08);
        P(g, G.sphereLo(), C(0x205a20, 0.5), [0, 3.05, 0.13], 0.08);
        shadow(0.2);
        break;
      }
      case 'swings': {
        for (const x of [-1.2, 1.2]) for (const z of [-0.6, 0.6]) P(g, G.cylLo(), C(0xe83a3a, 0.5), [x, 1.2, z * 0.6], [0.05, 2.5, 0.05], [z > 0 ? 0.25 : -0.25, 0, 0]);
        P(g, G.cylLo(), C(0xe83a3a, 0.5), [0, 2.4, 0], [0.05, 2.5, 0.05], [0, 0, Math.PI / 2]);
        g.userData.seats = [];
        for (const x of [-0.5, 0.5]) {
          const s = grp(g, [x, 2.4, 0]);
          for (const sx of [-0.2, 0.2]) P(s, G.cylLo(), M.metal(), [sx, -0.95, 0], [0.01, 1.9, 0.01]);
          P(s, G.rbox(0.5, 0.05, 0.22, 0.02), C(0x3a3a40, 0.6), [0, -1.9, 0]);
          g.userData.seats.push(s);
        }
        shadow(1.4, 0.6);
        break;
      }
      case 'slide': {
        P(g, G.box(), C(0x3ab0ff, 0.5), [0, 1.0, -0.8], [0.8, 0.08, 0.8]);
        for (const x of [-0.35, 0.35]) for (const z of [-1.15, -0.45]) P(g, G.cylLo(), C(0xffd84a, 0.5), [x, 0.5, z], [0.04, 1.0, 0.04]);
        P(g, G.box(), C(0xff6a4a, 0.4), [0, 0.55, 0.35], [0.6, 0.05, 1.9], [0.55, 0, 0]);
        for (let i = 0; i < 5; i++) P(g, G.box(), C(0xffd84a, 0.5), [0, 0.2 + i * 0.2, -1.3 - i * 0.05], [0.6, 0.04, 0.12]);
        shadow(0.8, 1.5);
        break;
      }
      case 'sandbox': {
        for (const [x, z, w, d] of [[0, -0.8, 1.7, 0.1], [0, 0.8, 1.7, 0.1], [-0.8, 0, 0.1, 1.7], [0.8, 0, 0.1, 1.7]]) P(g, G.box(), M.wood(), [x, 0.1, z], [w, 0.2, d]);
        P(g, G.box(), std('sandT', { map: T.sand(), roughness: 1 }), [0, 0.06, 0], [1.5, 0.12, 1.5]);
        P(g, G.cone(), std('sandT', { map: T.sand(), roughness: 1 }), [0.3, 0.2, 0.2], [0.25, 0.2, 0.25]);
        P(g, G.cyl(), C(0xff4a4a, 0.5), [-0.3, 0.2, -0.2], [0.08, 0.15, 0.08]);
        break;
      }
      case 'fence': {
        const w = opt.w || 4;
        for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.25) P(g, G.box(), M.white(), [x, 0.4, 0], [0.08, 0.8, 0.03]);
        for (const y of [0.25, 0.6]) P(g, G.box(), M.white(), [0, y, -0.03], [w, 0.07, 0.03]);
        break;
      }
      case 'fountain': {
        P(g, G.cyl(), C(0xc8c4bc, 0.7), [0, 0.25, 0], [1.6, 0.5, 1.6]);
        P(g, G.cyl(), M.water(), [0, 0.45, 0], [1.5, 0.05, 1.5]);
        P(g, G.cyl(), C(0xc8c4bc, 0.7), [0, 0.9, 0], [0.15, 1.2, 0.15]);
        P(g, G.cyl(), C(0xc8c4bc, 0.7), [0, 1.5, 0], [0.6, 0.12, 0.6]);
        g.userData.spray = P(g, G.sphereLo(), M.water(), [0, 1.8, 0], [0.3, 0.4, 0.3]);
        shadow(1.7);
        break;
      }
      case 'stage': {
        P(g, G.box(), M.darkWood(), [0, 0.3, 0], [6, 0.6, 3]);
        for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) P(g, G.cyl(), C(0xa01828, 0.8), [sx * (2.6 - i * 0.18), 2.4, -1.2 + Math.sin(i) * 0.05], [0.12, 3.6, 0.12]);
        P(g, G.box(), C(0xa01828, 0.8), [0, 4.1, -1.2], [6.2, 0.6, 0.3]);
        break;
      }
      case 'cage': {
        P(g, G.box(), C(0x8a8a94, 0.5), [0, 0.02, 0], [0.9, 0.04, 0.6]);
        for (let i = 0; i < 10; i++) P(g, G.cylLo(), M.metal(), [-0.42 + i * 0.093, 0.3, 0.29], [0.008, 0.6, 0.008]);
        for (let i = 0; i < 10; i++) P(g, G.cylLo(), M.metal(), [-0.42 + i * 0.093, 0.3, -0.29], [0.008, 0.6, 0.008]);
        P(g, G.box(), C(0x8a8a94, 0.5), [0, 0.6, 0], [0.9, 0.03, 0.6]);
        break;
      }
      case 'pedestal': P(g, G.cyl(), C(col || 0xe8e8f0, 0.3, 0.2), [0, 0.1, 0], [2.4, 0.2, 2.4]); P(g, G.ring(), E(0x6ac8ff, 0.8), [0, 0.2, 0], [2.4, 2.4, 2.4], [Math.PI / 2, 0, 0]); break;
      case 'locker': for (let i = 0; i < (opt.n || 4); i++) { P(g, G.box(), C(col || 0x3a7ae8, 0.5, 0.3), [i * 0.42, 0.9, 0], [0.4, 1.8, 0.4]); P(g, G.box(), C(0x1a1a20, 0.5), [i * 0.42 + 0.12, 1.0, 0.205], [0.03, 0.12, 0.01]); for (let k = 0; k < 3; k++) P(g, G.box(), C(0x1a1a20, 0.5), [i * 0.42, 1.6 - k * 0.05, 0.205], [0.25, 0.015, 0.01]); } break;
      case 'trashcan': P(g, G.cyl(), C(0x5a6a5a, 0.6, 0.4), [0, 0.4, 0], [0.25, 0.8, 0.25]); P(g, G.cyl(), C(0x4a5a4a, 0.6, 0.4), [0, 0.82, 0], [0.27, 0.05, 0.27]); shadow(0.3); break;
      default:
        P(g, G.box(), C(0xff00ff, 0.5), [0, 0.2, 0], 0.4);
    }
    g.userData.kind = 'item';
    g.userData.itemKind = kind;
    return g;
  }
  // a little animation for things that move on their own
  // a palm tree trunk that bends a little; returns the top position
  function Mo_curve(g, mat, s) {
    let x = 0, y = 0;
    for (let i = 0; i < 9; i++) {
      const nx = x + 0.06 * s * i * 0.25, ny = y + 0.85 * s;
      tube(g, [x, y, 0], [nx, ny, 0], (0.2 - i * 0.012) * s, mat);
      P(g, G.torus(), mat, [nx, ny, 0], [(0.19 - i * 0.012) * s, (0.19 - i * 0.012) * s, 0.3 * s], [Math.PI / 2, 0, 0]);
      x = nx; y = ny;
    }
    return [x, y, 0];
  }
  function animateItem(o, t) {
    const u = o.userData;
    if (u.spin) u.spin.rotation.y = t * 0.6;
    if (u.flames) u.flames.forEach((f, i) => { f.scale.setScalar(0.08 + Math.sin(t * 20 + i * 2) * 0.015); f.visible = !u.blownOut; });
    if (u.fish) u.fish.children.forEach((f, i) => { f.position.x = Math.sin(t * 0.7 + i * 1.5) * 0.35; f.rotation.y = Math.cos(t * 0.7 + i * 1.5) > 0 ? 0 : Math.PI; });
    if (u.bubbles) u.bubbles.forEach((b, i) => { b.position.y = 0.62 + ((t * 0.3 + i * 0.13) % 0.1); });
    if (u.spray) u.spray.scale.y = 0.4 + Math.sin(t * 6) * 0.06;
    if (u.beep) u.beep.scale.y = 1 + Math.max(0, Math.sin(t * 7)) * 6;
  }

  // ---------- city buildings ----------
  function building(w, h, d, color, style = 0) {
    const g = new THREE.Group();
    const kind = ['office', 'brick', 'glass'][style % 3];
    const seed = (color % 997) + Math.round(w * 13 + h * 7);
    const t = T.cityFacade(seed, kind);
    const tt = t.clone(); tt.needsUpdate = true;
    tt.repeat.set(Math.max(1, Math.round(w / (kind === 'glass' ? 10 : 8))), Math.max(1, Math.round(h / (kind === 'glass' ? 22 : 16))));
    const m = new THREE.MeshStandardMaterial({ map: tt, roughness: kind === 'glass' ? 0.25 : 0.8, metalness: kind === 'glass' ? 0.4 : 0 });
    P(g, G.box(), m, [0, h / 2, 0], [w, h, d]);
    const trim = C(kind === 'brick' ? 0xd8d0c0 : 0x8a8a90, 0.7);
    P(g, G.box(), trim, [0, h + 0.2, 0], [w + 0.3, 0.4, d + 0.3]);          // roof edge
    P(g, G.box(), C(0x3a3a3e, 0.8), [0, 2.0, 0], [w + 0.08, 4.0, d + 0.08]); // dark ground floor
    for (let x = -w / 2 + 2; x < w / 2 - 1; x += 3.4) P(g, G.box(), C(0x6a8aa0, 0.15, 0.5), [x + 0.9, 1.7, d / 2 + 0.05], [2.6, 2.6, 0.05]); // shop windows
    // stuff on the roof
    const r2 = U.seeded(seed);
    if (r2() < 0.6) { P(g, G.cyl(), C(0x6a5a4a, 0.8), [w * 0.25, h + 1.6, -d * 0.2], [1.1, 2.2, 1.1]); P(g, G.cone(), C(0x5a4a3a, 0.8), [w * 0.25, h + 3.0, -d * 0.2], [1.2, 0.6, 1.2]); }
    for (let i = 0; i < 3; i++) if (r2() < 0.7) P(g, G.box(), C(0xa8a8ac, 0.6, 0.3), [(r2() - 0.5) * w * 0.7, h + 0.8, (r2() - 0.5) * d * 0.6], [1.2, 1.0, 1.0]);
    if (kind === 'glass') P(g, G.cylLo(), C(0x8a8a94, 0.4, 0.6), [w * 0.2, h + 3, 0], [0.06, 6, 0.06]);
    return g;
  }

  return { item, animateItem, building, dispose, P, G, C, E, M, B, grp, std, sprite, blobShadow, loft, L0, tube, paint, makeEye, makeBrow, makeMouth, setMood, animateFace, bake, roundedBox, mats, geo };
})();
