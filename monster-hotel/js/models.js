// ============================================================
//  MONSTER HOTEL — 3D MODELS
//  Every model is built from simple rounded shapes glued
//  together: spheres, capsules, rounded boxes and "lathes"
//  (a shape spun around like on a pottery wheel).
// ============================================================
window.MH = window.MH || {};

MH.Models = (function () {
  const U = MH.U, T = MH.Tex;

  // ---------- materials (shared so the game stays fast) ----------
  const mats = {};
  function std(key, o) { return mats[key] || (mats[key] = new THREE.MeshStandardMaterial(o)); }
  const C = (color, rough = 0.6, metal = 0, extra = {}) => std('c' + color + '_' + rough + '_' + metal + JSON.stringify(extra), Object.assign({ color, roughness: rough, metalness: metal }, extra));
  const M = {
    gold: () => C(0xd4a445, 0.28, 1),
    brass: () => C(0xb8893a, 0.35, 0.9),
    silver: () => C(0xc8ccd4, 0.25, 1),
    iron: () => C(0x3a3a44, 0.45, 0.8),
    eyeWhite: () => C(0xfbfbff, 0.12),
    pupil: () => C(0x07060a, 0.05),
    glint: () => mats.glint || (mats.glint = new THREE.MeshBasicMaterial({ color: 0xffffff })),
    mouth: () => C(0x2a0612, 0.4),
    tongue: () => C(0xd0506a, 0.4),
    teeth: () => C(0xfff8ee, 0.25),
    black: () => C(0x121016, 0.5),
    blackShiny: () => C(0x0c0b10, 0.18, 0.2),
    flame: () => mats.flame || (mats.flame = new THREE.MeshBasicMaterial({ color: 0xffc050 })),
    flameCore: () => mats.flameCore || (mats.flameCore = new THREE.MeshBasicMaterial({ color: 0xfff4c0 })),
    wax: () => C(0xf2e8d0, 0.5, 0, { emissive: 0x302010 }),
    darkWood: () => std('darkWoodT', { map: T.darkWood(), color: 0xffffff, roughness: 0.55 }),
    lightWood: () => std('lightWoodT', { map: T.lightWood(), color: 0xffffff, roughness: 0.5 }),
    panel: () => std('panelT', { map: T.woodPanel().map, bumpMap: T.woodPanel().bump, bumpScale: 2, roughness: 0.5 }),
    bandage: () => std('bandageT', { map: T.bandage().map, bumpMap: T.bandage().bump, bumpScale: 3, roughness: 0.9 }),
    glass: () => std('glass', { color: 0xcfe8ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false }),
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
    torus: () => geo('torus', () => new THREE.TorusGeometry(1, 0.2, 10, 28)),
    mouthArc: () => geo('mouthArc', () => new THREE.TorusGeometry(1, 0.16, 8, 20, Math.PI)),
    octa: () => geo('octa', () => new THREE.OctahedronGeometry(1, 0)),
    plane: () => geo('plane', () => new THREE.PlaneGeometry(1, 1)),
    cap: (r, len) => geo('cap' + r + '_' + len, () => new THREE.CapsuleGeometry(r, len, 6, 16)),
    rbox: (w, h, d, r) => geo('rbox' + [w, h, d, r].join('_'), () => roundedBox(w, h, d, r)),
  };

  // a box with nice round edges
  function roundedBox(w, h, d, r, seg = 3) {
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
  function grp(parent, pos = [0, 0, 0], rot = null) {
    const g = new THREE.Group();
    g.position.set(pos[0], pos[1], pos[2]);
    if (rot) g.rotation.set(rot[0], rot[1], rot[2]);
    if (parent) parent.add(g);
    return g;
  }
  function lathe(points, seg = 28) {
    return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  }
  // soft round shadow on the floor
  function blobShadow(parent, r) {
    const m = new THREE.Mesh(G.plane(), mats.shadow || (mats.shadow = new THREE.MeshBasicMaterial({ map: T.shadow(), transparent: true, depthWrite: false })));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.015; m.scale.set(r * 2, r * 2, 1);
    m.renderOrder = 1;
    parent.add(m);
    return m;
  }

  // ============================================================
  //  FACES — eyes, eyelids, eyebrows, mouths
  // ============================================================
  function makeEye(parent, pos, r, irisColor, lidMat, opt = {}) {
    const e = grp(parent, pos);
    P(e, G.sphere(), M.eyeWhite(), [0, 0, 0], [r, r, r * 0.85]);
    const look = grp(e);
    const irisMat = opt.glow ? C(irisColor, 0.2, 0, { emissive: irisColor, emissiveIntensity: 0.6 }) : C(irisColor, 0.2);
    P(look, G.sphere(), irisMat, [0, 0, r * 0.58], [r * 0.58, r * 0.58, r * 0.34]);
    P(look, G.sphere(), M.pupil(), [0, 0, r * 0.72], [r * 0.3, r * 0.3, r * 0.22]);
    P(look, G.sphereLo(), M.glint(), [r * 0.2, r * 0.24, r * 0.84], r * 0.11);
    const lid = P(e, G.hemi(), lidMat, [0, 0, 0], [r * 1.1, r * 1.1, r * 1.0]);
    lid.rotation.x = -0.6; lid.userData.anim = true;
    let low = null;
    if (opt.lowLid) { low = P(e, G.hemi(), lidMat, [0, 0, 0], [r * 1.08, r * 1.08, r * 0.98]); low.rotation.x = Math.PI + 0.9; low.userData.anim = true; }
    e.userData = { lid, look, r, low, baseOpen: opt.open !== undefined ? opt.open : -0.6 };
    return e;
  }
  function makeBrow(parent, pos, len, thick, mat, side) {
    const b = grp(parent, pos);
    P(b, G.cap(thick, len), mat, [0, 0, 0], 1, [0, 0, Math.PI / 2]);
    b.userData = { side, baseZ: 0 };
    return b;
  }
  function makeMouth(parent, pos, w, opt = {}) {
    const m = grp(parent, pos);
    const arc = P(m, G.mouthArc(), opt.mat || M.mouth(), [0, 0, 0], [w, w, w]);
    const open = P(m, G.sphere(), M.mouth(), [0, -w * 0.2, -w * 0.05], [w * 0.8, 0.001, w * 0.3]);
    arc.userData.anim = open.userData.anim = true;
    const tongue = P(open, G.sphere(), M.tongue(), [0, -0.3, 0.3], [0.6, 0.5, 0.6]);
    const fangs = [];
    if (opt.fangs) {
      for (const sx of [-1, 1]) {
        const f = P(m, G.cone(), M.teeth(), [sx * w * 0.55, -w * 0.18, w * 0.12], [w * 0.13, w * 0.42, w * 0.13], [Math.PI, 0, 0]);
        fangs.push(f);
      }
    }
    m.userData = { arc, open, w, fangs, fangMode: opt.fangs };
    return m;
  }

  // set a character's face from a mood (-1 = furious, 0 = meh, 1 = super happy)
  function setMood(ch, mood, open = 0) {
    const f = ch.userData.face;
    if (!f) return;
    const m = U.clamp(mood, -1, 1);
    if (f.mouth) {
      const md = f.mouth.userData;
      const bend = 0.18 + Math.abs(m) * 0.75;
      if (m >= 0) { md.arc.rotation.z = Math.PI; md.arc.scale.set(md.w, md.w * bend, md.w); md.arc.position.y = md.w * 0.25 * bend; }
      else { md.arc.rotation.z = 0; md.arc.scale.set(md.w * 0.9, md.w * bend, md.w); md.arc.position.y = -md.w * 0.45 * bend; }
      md.open.scale.y = Math.max(0.001, open * md.w * 0.55);
      md.open.visible = open > 0.02;
    }
    for (const b of f.brows) {
      const s = b.userData.side;
      b.rotation.z = s * (m < 0 ? m * 0.45 : m * 0.12);
      b.position.y = b.userData.y0 + (m > 0.4 ? 0.01 : 0) + (m < -0.3 ? -0.008 : 0);
    }
    f.lidOffset = m < -0.35 ? 0.45 : m > 0.6 ? 0.08 : 0;
  }
  // blinking & looking around (call every frame)
  function animateFace(ch, t, dt, sleepy = 0) {
    const f = ch.userData.face;
    if (!f) return;
    const blinkT = (t + (ch.userData.blinkOff || 0)) % 3.7;
    const blink = blinkT < 0.13 ? Math.sin(blinkT / 0.13 * Math.PI) : 0;
    for (const e of f.eyes) {
      const d = e.userData;
      const open = U.lerp(d.baseOpen + (f.lidOffset || 0), 0.9, sleepy);
      d.lid.rotation.x = U.lerp(open, 1.45, blink);
      if (d.low) d.low.rotation.x = Math.PI + 0.9;
    }
    const lt = Math.floor((t + (ch.userData.blinkOff || 0)) / 2.3);
    const lx = Math.sin(lt * 12.9898) * 0.25, ly = Math.cos(lt * 78.233) * 0.12;
    for (const e of f.eyes) { e.userData.look.rotation.y += (lx - e.userData.look.rotation.y) * Math.min(1, dt * 10); e.userData.look.rotation.x += (ly - e.userData.look.rotation.x) * Math.min(1, dt * 10); }
  }

  // ============================================================
  //  THE SKELETON EVERY CHARACTER USES (a "rig")
  // ============================================================
  function rig(hipY) {
    const root = new THREE.Group();
    const hips = grp(root, [0, hipY, 0]);
    const torso = grp(hips);
    const head = grp(torso);
    const armL = grp(torso), armR = grp(torso);
    const legL = grp(hips), legR = grp(hips);
    root.userData = { rig: { hips, torso, head, armL, armR, legL, legR, hipY }, face: { eyes: [], brows: [], mouth: null }, blinkOff: Math.random() * 5 };
    return root;
  }
  function limb(parent, r, len, mat, down = true) {
    return P(parent, G.cap(r, len), mat, [0, down ? -len / 2 - r * 0.3 : 0, 0]);
  }
  // simple hand: a palm and a few fat fingers
  function hand(parent, pos, s, mat, claws) {
    const h = grp(parent, pos);
    P(h, G.sphere(), mat, [0, 0, 0], [s, s * 1.1, s * 0.7]);
    for (let i = 0; i < 3; i++) {
      const f = P(h, G.cap(s * 0.24, s * 0.5), mat, [(i - 1) * s * 0.42, -s * 0.95, s * 0.1], 1, [0.2, 0, 0]);
      if (claws) P(f, G.cone(), M.teeth(), [0, -s * 0.5, 0.02], [s * 0.12, s * 0.35, s * 0.12], [Math.PI, 0, 0]);
    }
    P(h, G.cap(s * 0.24, s * 0.45), mat, [s * 0.75, -s * 0.2, s * 0.25], 1, [0, 0, 0.9]);
    return h;
  }
  function shoe(parent, pos, s, mat) {
    return P(parent, G.rbox(0.13 * s, 0.09 * s, 0.26 * s, 0.04 * s), mat, pos);
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
      if (c.isMesh && !c.userData.anim && c.children.length === 0) {
        if (!buckets.has(c.material)) buckets.set(c.material, []);
        buckets.get(c.material).push(c);
      }
    }
    for (const [mat, list] of buckets) {
      if (list.length < 2) continue;
      const geo = mergeGeos(list.map((m) => { m.updateMatrix(); return [m.geometry, m.matrix]; }));
      list.forEach((m) => g.remove(m));
      g.add(new THREE.Mesh(geo, mat));
    }
    for (const c of g.children) if (!c.isMesh || c.children.length) bake(c);
  }
  function finish(root, height, radius) {
    bake(root);
    blobShadow(root, radius);
    root.userData.height = height;
    root.traverse((o) => { if (o.isMesh) o.frustumCulled = true; });
    return root;
  }

  // ============================================================
  //  VAMPIRE
  // ============================================================
  const VAMP_STYLES = [
    { vest: 0x8a1428, lining: 0xb01830, lady: false },
    { vest: 0x4a2a7a, lining: 0x7a2ab0, lady: false },
    { vest: 0x1e5a4a, lining: 0x1a8a6a, lady: true },
    { vest: 0x8a1428, lining: 0xc01a3a, lady: true },
    { vest: 0x222230, lining: 0xa01830, lady: false },
  ];
  function vampire(style = 0, isBoss = false) {
    const st = VAMP_STYLES[style % VAMP_STYLES.length];
    const hipY = 0.95;
    const ch = rig(hipY);
    const R = ch.userData.rig;
    const skin = C(0xd9d2e6, 0.55);
    const suit = C(0x16141c, 0.55);
    const lining = C(st.lining, 0.35, 0.1, { side: THREE.BackSide });
    const capeOut = C(0x121016, 0.45, 0.05, { side: THREE.FrontSide });
    // legs
    for (const [leg, sx] of [[R.legL, 1], [R.legR, -1]]) {
      leg.position.x = sx * 0.1;
      if (st.lady) limb(leg, 0.05, 0.72, skin);
      else limb(leg, 0.068, 0.72, suit);
      shoe(leg, [0, -hipY + 0.05, 0.05], 1, M.blackShiny());
    }
    // body
    if (st.lady) {
      P(R.torso, lathe([[0.001, -0.45], [0.36, -0.45], [0.3, -0.1], [0.17, 0.22], [0.2, 0.46], [0.13, 0.6], [0.001, 0.62]]), C(st.vest, 0.45), [0, 0, 0]);
    } else {
      P(R.torso, lathe([[0.001, -0.08], [0.16, -0.08], [0.15, 0.1], [0.25, 0.42], [0.24, 0.55], [0.12, 0.63], [0.001, 0.64]]), suit, [0, 0, 0], [1, 1, 0.72]);
      P(R.torso, G.rbox(0.24, 0.34, 0.08, 0.03), C(st.vest, 0.45), [0, 0.26, 0.11]);
      P(R.torso, G.rbox(0.12, 0.24, 0.05, 0.02), C(0xf4f2f8, 0.6), [0, 0.46, 0.16]);
      P(R.torso, G.sphere(), M.gold(), [0, 0.18, 0.155], 0.016);
      P(R.torso, G.sphere(), M.gold(), [0, 0.26, 0.155], 0.016);
      P(R.torso, G.sphere(), M.gold(), [0, 0.34, 0.155], 0.016);
      // gold medallion
      P(R.torso, G.torus(), M.gold(), [0, 0.47, 0.1], [0.11, 0.13, 0.1], [0.5, 0, 0]);
      P(R.torso, G.cyl(), M.gold(), [0, 0.35, 0.19], [0.04, 0.012, 0.04], [Math.PI / 2 - 0.2, 0, 0]);
      P(R.torso, G.sphere(), C(0xc01830, 0.1, 0.2, { emissive: 0x300008 }), [0, 0.35, 0.2], [0.022, 0.022, 0.012]);
    }
    // bow tie / brooch
    if (!st.lady) {
      P(R.torso, G.cone(), C(st.lining, 0.4), [0.045, 0.56, 0.16], [0.04, 0.07, 0.03], [0, 0, Math.PI / 2]);
      P(R.torso, G.cone(), C(st.lining, 0.4), [-0.045, 0.56, 0.16], [0.04, 0.07, 0.03], [0, 0, -Math.PI / 2]);
      P(R.torso, G.sphere(), C(st.lining, 0.4), [0, 0.56, 0.17], 0.022);
    } else {
      P(R.torso, G.octa(), C(0xff2040, 0.1, 0.3, { emissive: 0x400010 }), [0, 0.52, 0.16], 0.035);
    }
    // cape (black outside, colored inside)
    const cape = grp(R.torso, [0, 0.58, -0.02]);
    const capeGeo = geo('cape', () => {
      const g = new THREE.CylinderGeometry(0.2, 0.48, 1.35, 28, 6, true, Math.PI * 0.2, Math.PI * 1.6);
      g.translate(0, -0.675, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i), a = Math.atan2(p.getX(i), p.getZ(i)); p.setZ(i, p.getZ(i) + Math.sin(a * 7) * 0.02 * (-y)); }
      g.computeVertexNormals();
      return g;
    });
    P(cape, capeGeo, capeOut);
    P(cape, capeGeo, lining);
    // the famous tall collar
    const collarGeo = geo('collar', () => { const g = new THREE.CylinderGeometry(0.3, 0.13, 0.32, 20, 1, true, Math.PI * 0.3, Math.PI * 1.4); g.translate(0, 0.16, 0); return g; });
    P(cape, collarGeo, capeOut, [0, 0, 0]);
    P(cape, collarGeo, lining, [0, 0, 0]);
    R.cape = cape;
    // arms
    for (const [arm, sx] of [[R.armL, 1], [R.armR, -1]]) {
      arm.position.set(sx * 0.22, 0.52, 0);
      limb(arm, 0.055, 0.46, st.lady ? skin : suit);
      if (!st.lady) P(arm, G.cyl(), C(0xf4f2f8, 0.6), [0, -0.54, 0], [0.06, 0.05, 0.06]);
      hand(arm, [0, -0.6, 0], 0.058, skin);
    }
    // head
    R.head.position.set(0, 0.62, 0.01);
    const H = grp(R.head, [0, 0.24, 0]);
    P(R.head, G.cyl(), skin, [0, 0.05, 0], [0.06, 0.12, 0.06]);
    const hr = 0.235;
    P(H, G.sphere(), skin, [0, 0, 0], [hr * 0.92, hr * 1.12, hr * 0.95]);
    P(H, G.sphere(), skin, [0, -0.11, 0.05], [hr * 0.6, hr * 0.45, hr * 0.62]); // chin
    // ears
    for (const sx of [-1, 1]) P(H, G.cone(), skin, [sx * hr * 0.92, 0.02, -0.01], [0.04, 0.16, 0.025], [0, 0, -sx * 1.2]);
    // nose
    P(H, G.sphere(), skin, [0, -0.025, hr * 0.93], [0.026, 0.04, 0.03]);
    // hair
    const hair = C(0x0a0910, 0.35, 0.1);
    if (st.lady) {
      P(H, G.sphere(), hair, [0, 0.04, -0.03], [hr * 1.02, hr * 1.12, hr * 1.02]).scale.z = hr * 0.98;
      P(H, G.sphere(), hair, [0, 0.13, 0.02], [hr * 0.96, hr * 0.62, hr * 0.98]);
      P(H, G.sphere(), hair, [0, -0.02, -0.2], [0.2, 0.26, 0.12]);
      P(H, G.sphere(), C(0xffffff, 0.4), [0.1, 0.14, 0.14], [0.03, 0.12, 0.03], [0, 0, -0.4]); // white streak
      P(H, G.sphere(), hair, [0, 0.22, -0.1], 0.1); // bun
    } else {
      const cap = P(H, G.hemi(), hair, [0, 0.035, -0.015], [hr * 0.99, hr * 1.14, hr * 1.02]);
      cap.rotation.x = -0.12;
      P(H, G.cone(), hair, [0, 0.19, hr * 0.78], [0.05, 0.12, 0.03], [Math.PI + 0.55, 0, 0]); // widow's peak
      P(H, G.sphere(), hair, [0, -0.02, -0.12], [hr * 0.85, hr * 0.8, hr * 0.7]);
    }
    // face
    const ey = 0.05, ex = 0.085, ez = hr * 0.8;
    const f = ch.userData.face;
    f.eyes.push(makeEye(H, [ex, ey, ez], 0.055, 0x9a1020, skin));
    f.eyes.push(makeEye(H, [-ex, ey, ez], 0.055, 0x9a1020, skin));
    for (const sx of [1, -1]) {
      const b = makeBrow(H, [sx * ex, ey + 0.075, ez + 0.03], 0.07, 0.013, hair, sx);
      b.userData.y0 = b.position.y; f.brows.push(b);
      P(H, G.sphere(), C(0x9a88b0, 0.6), [sx * ex, ey - 0.055, ez + 0.005], [0.04, 0.012, 0.02]); // eye bags
    }
    f.mouth = makeMouth(H, [0, -0.085, hr * 0.9], 0.055, { fangs: true });
    if (st.lady) P(H, G.sphere(), C(0x9a1030, 0.3), [0, -0.085, hr * 0.91], [0.035, 0.012, 0.01]).visible = false;
    ch.userData.kind = 'vampire';
    setMood(ch, 0.5);
    return finish(ch, 1.9, 0.4);
  }

  // ============================================================
  //  WEREWOLF
  // ============================================================
  const WOLF_FUR = ['#6a4a32', '#5a5a64', '#8a6a44', '#3a2e2a', '#a88a6a'];
  function werewolf(style = 0) {
    const furCol = WOLF_FUR[style % WOLF_FUR.length];
    const fur = std('wolfFur' + furCol, { map: T.fur(furCol), roughness: 0.95 });
    const belly = C(new THREE.Color(furCol).offsetHSL(0, -0.05, 0.18).getHex(), 0.95);
    const hipY = 0.82;
    const ch = rig(hipY);
    const R = ch.userData.rig;
    const pants = C([0x3a2a6a, 0x5a2020, 0x2a4a3a, 0x4a3a2a, 0x2a3a5a][style % 5], 0.8);
    for (const [leg, sx] of [[R.legL, 1], [R.legR, -1]]) {
      leg.position.x = sx * 0.13;
      limb(leg, 0.085, 0.58, fur);
      P(leg, G.cyl(), pants, [0, -0.12, 0], [0.11, 0.3, 0.11]);
      const foot = P(leg, G.sphere(), fur, [0, -hipY + 0.06, 0.08], [0.09, 0.06, 0.15]);
      for (let i = -1; i <= 1; i++) P(leg, G.cone(), M.teeth(), [i * 0.04, -hipY + 0.05, 0.22], [0.015, 0.05, 0.015], [Math.PI / 2, 0, 0]);
    }
    // shorts
    P(R.torso, G.cyl(), pants, [0, 0.02, 0], [0.2, 0.18, 0.16]);
    // big hunched chest
    R.torso.rotation.x = 0.28;
    P(R.torso, G.sphere(), fur, [0, 0.35, 0], [0.27, 0.36, 0.22]);
    P(R.torso, G.sphere(), belly, [0, 0.3, 0.1], [0.2, 0.28, 0.14]);
    // torn shirt collar tuft
    P(R.torso, G.cone(), fur, [0, 0.6, 0.05], [0.18, 0.14, 0.12]);
    // tail
    const tail = grp(R.hips, [0, 0.05, -0.18], [-0.9, 0, 0]);
    P(tail, G.cap(0.07, 0.34), fur, [0, 0.2, 0]);
    P(tail, G.sphere(), belly, [0, 0.42, 0], [0.06, 0.08, 0.06]);
    R.tail = tail;
    for (const [arm, sx] of [[R.armL, 1], [R.armR, -1]]) {
      arm.position.set(sx * 0.3, 0.52, 0.02);
      limb(arm, 0.07, 0.5, fur);
      hand(arm, [0, -0.66, 0.02], 0.075, fur, true);
    }
    // head
    R.head.position.set(0, 0.62, 0.08);
    R.head.rotation.x = -0.25;
    const H = grp(R.head, [0, 0.18, 0]);
    const hr = 0.22;
    P(H, G.sphere(), fur, [0, 0, 0], [hr, hr * 0.95, hr * 0.95]);
    // snout
    P(H, G.sphere(), belly, [0, -0.06, 0.16], [0.11, 0.08, 0.14]);
    P(H, G.sphere(), M.blackShiny(), [0, -0.02, 0.29], [0.045, 0.034, 0.03]);
    // cheek fluff
    for (const sx of [-1, 1]) {
      P(H, G.cone(), fur, [sx * 0.2, -0.06, 0.02], [0.07, 0.14, 0.05], [0, 0, sx * 2.0]);
      // ears
      const ear = P(H, G.cone(), fur, [sx * 0.12, 0.22, -0.02], [0.07, 0.2, 0.04], [0, 0, -sx * 0.35]);
      P(ear, G.cone(), C(0xd08090, 0.7), [0, -0.05, 0.5], [0.55, 0.7, 0.5]);
    }
    // top tuft
    P(H, G.cone(), fur, [0.03, 0.22, 0.08], [0.06, 0.14, 0.04], [0.5, 0, -0.2]);
    const f = ch.userData.face;
    const ez = hr * 0.78;
    f.eyes.push(makeEye(H, [0.085, 0.05, ez], 0.05, 0xf2b81a, fur, { glow: true }));
    f.eyes.push(makeEye(H, [-0.085, 0.05, ez], 0.05, 0xf2b81a, fur, { glow: true }));
    for (const sx of [1, -1]) { const b = makeBrow(H, [sx * 0.085, 0.12, ez + 0.02], 0.075, 0.022, C(new THREE.Color(furCol).offsetHSL(0, 0, -0.1).getHex(), 0.9), sx); b.userData.y0 = b.position.y; f.brows.push(b); }
    f.mouth = makeMouth(H, [0, -0.13, 0.2], 0.06, { fangs: true });
    ch.userData.kind = 'werewolf';
    setMood(ch, 0.5);
    return finish(ch, 1.8, 0.45);
  }

  // ============================================================
  //  MUMMY
  // ============================================================
  function mummy(style = 0) {
    const bd = M.bandage();
    const hipY = 0.78;
    const ch = rig(hipY);
    const R = ch.userData.rig;
    const pharaoh = style % 3 === 1;
    for (const [leg, sx] of [[R.legL, 1], [R.legR, -1]]) {
      leg.position.x = sx * 0.12;
      limb(leg, 0.08, 0.55, bd);
      P(leg, G.sphere(), bd, [0, -hipY + 0.06, 0.04], [0.09, 0.07, 0.13]);
    }
    // round tummy
    P(R.torso, G.sphere(), bd, [0, 0.28, 0], [0.3, 0.38, 0.27]);
    if (pharaoh) {
      P(R.torso, G.cyl(), M.gold(), [0, 0.03, 0], [0.26, 0.08, 0.23]);
      const coll = P(R.torso, lathe([[0.12, 0.62], [0.3, 0.5], [0.33, 0.45], [0.12, 0.6]]), C(0x2a50a8, 0.3, 0.3), [0, -0.02, 0]);
      coll.scale.z = 0.85;
      P(R.torso, G.torus(), M.gold(), [0, 0.52, 0], [0.26, 0.22, 0.4], [Math.PI / 2, 0, 0]);
    } else {
      // scarab amulet
      P(R.torso, G.sphere(), M.gold(), [0, 0.42, 0.24], [0.05, 0.06, 0.03]);
      P(R.torso, G.sphere(), C(0x1a8ab0, 0.1, 0.2, { emissive: 0x0a3a50 }), [0, 0.42, 0.265], [0.03, 0.035, 0.015]);
    }
    for (const [arm, sx] of [[R.armL, 1], [R.armR, -1]]) {
      arm.position.set(sx * 0.3, 0.46, 0);
      limb(arm, 0.065, 0.42, bd);
      hand(arm, [0, -0.56, 0], 0.065, bd);
    }
    // loose bandage strips (they wave around)
    const strips = [];
    const stripGeo = geo('strip', () => { const g = new THREE.PlaneGeometry(0.06, 0.4, 1, 6); g.translate(0, -0.2, 0); return g; });
    const stripMat = std('stripMat', { map: T.bandage().map, roughness: 0.9, side: THREE.DoubleSide });
    for (const [par, pos] of [[R.armL, [0.05, -0.3, 0.03]], [R.torso, [-0.18, 0.1, 0.2]], [R.armR, [-0.04, -0.15, -0.05]]]) {
      const s = P(par, stripGeo, stripMat, pos);
      s.userData.anim = true;
      strips.push(s);
    }
    R.strips = strips;
    R.head.position.set(0, 0.62, 0);
    const H = grp(R.head, [0, 0.2, 0]);
    const hr = 0.24;
    P(H, G.sphere(), bd, [0, 0, 0], [hr, hr * 1.02, hr * 0.95]);
    const f = ch.userData.face;
    const dark = C(0x1a120a, 0.9);
    // dark eye holes with glowing eyes
    for (const sx of [1, -1]) P(H, G.sphere(), dark, [sx * 0.09, 0.03, hr * 0.78], [0.07, 0.06, 0.04]);
    f.eyes.push(makeEye(H, [0.09, 0.03, hr * 0.8], 0.05, 0xffc830, bd, { glow: true }));
    f.eyes.push(makeEye(H, [-0.09, 0.03, hr * 0.8], 0.042, 0xffc830, bd, { glow: true }));
    for (const sx of [1, -1]) { const b = makeBrow(H, [sx * 0.09, 0.1, hr * 0.86], 0.07, 0.02, bd, sx); b.userData.y0 = b.position.y; f.brows.push(b); }
    f.mouth = makeMouth(H, [0, -0.1, hr * 0.88], 0.05);
    if (pharaoh) {
      // striped royal headdress
      const nem = std('nemes', { map: T.tex(U.canvas(64, 64, (g) => { for (let y = 0; y < 64; y += 16) { g.fillStyle = '#2a50a8'; g.fillRect(0, y, 64, 8); g.fillStyle = '#d4a445'; g.fillRect(0, y + 8, 64, 8); } })), roughness: 0.4, metalness: 0.4 });
      P(H, G.hemi(), nem, [0, 0.02, -0.02], [hr * 1.08, hr * 1.15, hr * 1.08]).rotation.x = -0.2;
      for (const sx of [-1, 1]) P(H, G.rbox(0.1, 0.34, 0.06, 0.03), nem, [sx * 0.22, -0.16, -0.02], 1, [0, 0, sx * 0.15]);
      P(H, G.cone(), M.gold(), [0, 0.23, 0.2], [0.03, 0.08, 0.03], [0.4, 0, 0]);
    }
    ch.userData.kind = 'mummy';
    setMood(ch, 0.5);
    return finish(ch, 1.65, 0.42);
  }

  // ============================================================
  //  GHOST
  // ============================================================
  const GHOST_COL = [0xd8fff8, 0xe6e0ff, 0xd8f4ff, 0xfff0f8];
  function ghost(style = 0) {
    const col = GHOST_COL[style % GHOST_COL.length];
    const mat = C(col, 0.3, 0, { emissive: 0x2a8a8a, emissiveIntensity: 0.55, transparent: true, opacity: 0.86, side: THREE.DoubleSide });
    const ch = rig(0.9);
    const R = ch.userData.rig;
    const bodyGeo = geo('ghostBody', () => {
      const pts = [];
      for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI / 2; pts.push([Math.sin(a) * 0.36, 0.7 + Math.cos(a) * 0.36]); }
      pts.push([0.38, 0.5], [0.42, 0.2], [0.48, -0.1], [0.52, -0.42]);
      const g = lathe(pts.reverse(), 36);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -0.2) { const a = Math.atan2(p.getX(i), p.getZ(i)); p.setY(i, y + Math.sin(a * 7) * 0.07 * (-(y + 0.2) / 0.22)); } }
      g.computeVertexNormals();
      return g;
    });
    P(R.torso, bodyGeo, mat, [0, -0.3, 0]);
    for (const [arm, sx] of [[R.armL, 1], [R.armR, -1]]) {
      arm.position.set(sx * 0.38, 0.1, 0);
      P(arm, G.cap(0.07, 0.2), mat, [0, -0.12, 0.03]);
    }
    R.legL.visible = R.legR.visible = false;
    R.head.position.set(0, 0.1, 0);
    const H = grp(R.head, [0, 0.25, 0.3]);
    const f = ch.userData.face;
    // big cartoon ghost eyes
    for (const sx of [1, -1]) {
      const e = grp(H, [sx * 0.12, 0.05, 0]);
      P(e, G.sphere(), M.pupil(), [0, 0, 0], [0.065, 0.1, 0.04]);
      P(e, G.sphereLo(), M.glint(), [0.02, 0.04, 0.03], 0.018);
      const lid = P(e, G.hemi(), mat, [0, 0, -0.01], [0.075, 0.11, 0.06]);
      lid.rotation.x = -1.2; lid.userData.anim = true;
      e.userData = { lid, look: grp(e), r: 0.07, baseOpen: -1.2 };
      f.eyes.push(e);
      const b = makeBrow(H, [sx * 0.12, 0.2, 0.0], 0.06, 0.015, M.pupil(), sx); b.userData.y0 = b.position.y; f.brows.push(b);
    }
    f.mouth = makeMouth(H, [0, -0.14, 0.01], 0.06);
    if (style % 4 === 1) { // a bow
      for (const sx of [-1, 1]) P(H, G.cone(), C(0xff5aa0, 0.4), [0.2 + sx * 0.06, 0.34, -0.1], [0.05, 0.09, 0.04], [0, 0, sx * Math.PI / 2]);
    } else if (style % 4 === 2) { // top hat
      P(H, G.cyl(), M.black(), [0, 0.42, -0.2], [0.26, 0.02, 0.26]);
      P(H, G.cyl(), M.black(), [0, 0.56, -0.2], [0.16, 0.26, 0.16]);
      P(H, G.cyl(), C(0x8a1428, 0.5), [0, 0.46, -0.2], [0.165, 0.05, 0.165]);
    }
    const glow = new THREE.Sprite(glowMat(0x60fff0)); glow.scale.set(2.2, 2.2, 1); glow.position.y = 1; glow.material.opacity = 0.18;
    ch.add(glow);
    ch.userData.kind = 'ghost';
    setMood(ch, 0.5);
    return finish(ch, 1.7, 0.4);
  }

  // ============================================================
  //  BIG MONSTER (made of spare parts + lightning)
  // ============================================================
  function frankie(style = 0) {
    const skin = C([0x86b070, 0x7aa0a0, 0x9ab078][style % 3], 0.6);
    const jacket = C([0x2a2a24, 0x3a2418, 0x2a2440][style % 3], 0.75);
    const lady = style % 3 === 2;
    const hipY = 1.02;
    const ch = rig(hipY);
    const R = ch.userData.rig;
    for (const [leg, sx] of [[R.legL, 1], [R.legR, -1]]) {
      leg.position.x = sx * 0.15;
      limb(leg, 0.1, 0.72, C(0x22222a, 0.8));
      P(leg, G.rbox(0.22, 0.2, 0.34, 0.06), M.blackShiny(), [0, -hipY + 0.1, 0.05]);
    }
    // big blocky body
    P(R.torso, G.rbox(0.62, 0.72, 0.38, 0.12), jacket, [0, 0.36, 0]);
    P(R.torso, G.rbox(0.22, 0.6, 0.05, 0.02), C(0xd8d4c0, 0.8), [0, 0.4, 0.18]);
    P(R.torso, G.rbox(0.16, 0.14, 0.02, 0.01), C(0x6a4a2a, 0.8), [0.2, 0.2, 0.2]); // patch
    for (const sx of [-1, 1]) P(R.torso, G.sphere(), M.silver(), [sx * 0.34, 0.66, 0], [0.06, 0.04, 0.06]);
    for (const [arm, sx] of [[R.armL, 1], [R.armR, -1]]) {
      arm.position.set(sx * 0.38, 0.64, 0);
      limb(arm, 0.09, 0.56, jacket);
      P(arm, G.cyl(), skin, [0, -0.72, 0], [0.08, 0.08, 0.08]);
      hand(arm, [0, -0.82, 0], 0.1, skin);
    }
    R.head.position.set(0, 0.72, 0);
    P(R.head, G.cyl(), skin, [0, 0.06, 0], [0.12, 0.14, 0.12]);
    // neck bolts
    for (const sx of [-1, 1]) {
      P(R.head, G.cyl(), M.silver(), [sx * 0.16, 0.06, 0], [0.03, 0.12, 0.03], [0, 0, Math.PI / 2]);
      P(R.head, G.cyl(), M.silver(), [sx * 0.22, 0.06, 0], [0.045, 0.03, 0.045], [0, 0, Math.PI / 2]);
    }
    const H = grp(R.head, [0, 0.33, 0]);
    P(H, G.rbox(0.44, 0.44, 0.4, 0.12), skin, [0, 0, 0]);
    // flat-top hair
    const hair = C(0x101014, 0.6);
    if (lady) {
      P(H, G.cyl(), hair, [0, 0.35, -0.04], [0.19, 0.5, 0.19]);
      P(H, G.cyl(), C(0xf0f0f0, 0.6), [0.1, 0.35, 0.05], [0.04, 0.5, 0.03]);
      P(H, G.cyl(), C(0xf0f0f0, 0.6), [-0.1, 0.35, 0.05], [0.04, 0.5, 0.03]);
    } else {
      P(H, G.rbox(0.47, 0.12, 0.43, 0.04), hair, [0, 0.2, -0.01]);
      for (let i = -3; i <= 3; i++) P(H, G.box(), hair, [i * 0.06, 0.13, 0.2], [0.05, 0.07 + (i % 2 ? 0.03 : 0), 0.03]);
    }
    // stitches on the forehead
    P(H, G.box(), C(0x2a3a20, 0.8), [-0.05, 0.1, 0.205], [0.22, 0.012, 0.01]);
    for (let i = 0; i < 5; i++) P(H, G.box(), C(0x2a3a20, 0.8), [-0.14 + i * 0.045, 0.1, 0.207], [0.008, 0.05, 0.01]);
    // brow ridge
    P(H, G.rbox(0.4, 0.06, 0.06, 0.025), skin, [0, 0.04, 0.2]);
    const f = ch.userData.face;
    f.eyes.push(makeEye(H, [0.09, -0.02, 0.19], 0.045, 0x3a2a1a, skin, { open: -0.3 }));
    f.eyes.push(makeEye(H, [-0.09, -0.02, 0.19], 0.045, 0x3a2a1a, skin, { open: -0.3 }));
    for (const sx of [1, -1]) { const b = makeBrow(H, [sx * 0.09, 0.06, 0.225], 0.07, 0.016, hair, sx); b.userData.y0 = b.position.y; f.brows.push(b); }
    P(H, G.sphere(), skin, [0, -0.07, 0.22], [0.04, 0.05, 0.04]);
    f.mouth = makeMouth(H, [0, -0.14, 0.2], 0.075);
    if (lady) P(H, G.sphere(), C(0x302030, 0.3), [0, -0.14, 0.205], [0.05, 0.008, 0.01]);
    ch.userData.kind = 'frankie';
    setMood(ch, 0.5);
    return finish(ch, 2.25, 0.5);
  }

  // ============================================================
  //  BLOB
  // ============================================================
  const BLOB_COL = [0x7ad83a, 0x3ad8a0, 0xd85aa8, 0x5a9aff];
  function blob(style = 0) {
    const col = BLOB_COL[style % BLOB_COL.length];
    const mat = C(col, 0.15, 0, { emissive: col, emissiveIntensity: 0.18, transparent: true, opacity: 0.8 });
    const ch = rig(0.45);
    const R = ch.userData.rig;
    R.legL.visible = R.legR.visible = false;
    const body = P(R.torso, G.sphere(), mat, [0, 0.05, 0], [0.55, 0.5, 0.52]);
    body.userData.anim = true;
    R.blobBody = body;
    // things floating inside
    P(R.torso, G.sphereLo(), C(0xffffff, 0.2, 0, { transparent: true, opacity: 0.5 }), [0.2, -0.1, 0.1], 0.05);
    P(R.torso, G.sphereLo(), C(0xffffff, 0.2, 0, { transparent: true, opacity: 0.5 }), [-0.25, 0.1, -0.05], 0.035);
    P(R.torso, G.cap(0.015, 0.18), C(0xf1e3c0, 0.5), [-0.1, -0.2, -0.1], 1, [0.4, 0.3, 1.2]);
    R.armL.position.set(0.5, 0.05, 0); R.armR.position.set(-0.5, 0.05, 0);
    P(R.armL, G.sphere(), mat, [0, -0.05, 0], [0.12, 0.1, 0.1]);
    P(R.armR, G.sphere(), mat, [0, -0.05, 0], [0.12, 0.1, 0.1]);
    R.head.position.set(0, 0.12, 0.3);
    const H = grp(R.head, [0, 0, 0]);
    const f = ch.userData.face;
    f.eyes.push(makeEye(H, [0, 0.08, 0.02], 0.13, 0x2a6ac8, mat, { open: -1.0 }));
    const b = makeBrow(H, [0, 0.25, 0.04], 0.12, 0.022, C(new THREE.Color(col).multiplyScalar(0.5).getHex(), 0.4), 1); b.userData.y0 = b.position.y; f.brows.push(b);
    f.mouth = makeMouth(H, [0, -0.12, 0.08], 0.09);
    if (style % 2 === 0) { // tiny top hat
      P(R.torso, G.cyl(), M.black(), [0.05, 0.55, 0], [0.16, 0.015, 0.16]);
      P(R.torso, G.cyl(), M.black(), [0.05, 0.64, 0], [0.1, 0.18, 0.1]);
    }
    ch.userData.kind = 'blob';
    setMood(ch, 0.5);
    return finish(ch, 1.1, 0.55);
  }

  // ============================================================
  //  HUMAN TOURIST (uh oh!)
  // ============================================================
  function human(style = 0) {
    const skin = C([0xf0c09a, 0xc88a60, 0x8a5a3a][style % 3], 0.6);
    const hipY = 0.88;
    const ch = rig(hipY);
    const R = ch.userData.rig;
    const shirtTex = std('hawaii' + style, {
      map: T.tex(U.canvas(128, 128, (g) => {
        g.fillStyle = ['#ff8a2a', '#2ab0d8', '#ff4a7a'][style % 3]; g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 10; i++) {
          const x = Math.random() * 128, y = Math.random() * 128;
          g.fillStyle = '#fff6a0'; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 7, 5, 0, 7); g.fill(); }
          g.fillStyle = '#ff4a3a'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill();
        }
      })), roughness: 0.8,
    });
    for (const [leg, sx] of [[R.legL, 1], [R.legR, -1]]) {
      leg.position.x = sx * 0.1;
      limb(leg, 0.055, 0.7, skin);
      P(leg, G.cyl(), C(0xc8b080, 0.8), [0, -0.15, 0], [0.085, 0.3, 0.085]);
      P(leg, G.rbox(0.12, 0.1, 0.25, 0.045), C(0xf4f4f4, 0.6), [0, -hipY + 0.05, 0.05]);
      P(leg, G.box(), C(0xff3a3a, 0.6), [0, -hipY + 0.07, 0.05], [0.125, 0.025, 0.2]);
    }
    P(R.torso, G.rbox(0.36, 0.52, 0.24, 0.1), shirtTex, [0, 0.28, 0]);
    // backpack
    P(R.torso, G.rbox(0.3, 0.4, 0.16, 0.07), C(0x3a8a3a, 0.7), [0, 0.32, -0.19]);
    P(R.torso, G.rbox(0.2, 0.14, 0.06, 0.03), C(0x2a6a2a, 0.7), [0, 0.22, -0.28]);
    // camera
    P(R.torso, G.rbox(0.12, 0.08, 0.06, 0.015), M.black(), [0, 0.28, 0.16]);
    P(R.torso, G.cyl(), C(0x333338, 0.2, 0.6), [0, 0.28, 0.2], [0.03, 0.04, 0.03], [Math.PI / 2, 0, 0]);
    R.flash = P(R.torso, G.sphereLo(), M.glint(), [0.04, 0.3, 0.2], 0.012);
    R.flash.userData.anim = true;
    for (const [arm, sx] of [[R.armL, 1], [R.armR, -1]]) {
      arm.position.set(sx * 0.22, 0.48, 0);
      P(arm, G.cap(0.06, 0.12), shirtTex, [0, -0.1, 0]);
      limb(arm, 0.045, 0.44, skin);
      hand(arm, [0, -0.56, 0], 0.052, skin);
    }
    R.head.position.set(0, 0.56, 0);
    const H = grp(R.head, [0, 0.2, 0]);
    const hr = 0.2;
    P(H, G.sphere(), skin, [0, 0, 0], [hr, hr * 1.05, hr]);
    for (const sx of [-1, 1]) P(H, G.sphere(), skin, [sx * hr, 0, 0], [0.03, 0.05, 0.03]);
    P(H, G.sphere(), skin, [0, -0.01, hr * 0.98], [0.035, 0.035, 0.04]);
    // spiky hair + backwards cap
    const hairC = C([0xd8602a, 0x2a1a10, 0xf0d070][style % 3], 0.6);
    for (let i = 0; i < 7; i++) P(H, G.cone(), hairC, [Math.cos(i) * 0.1, 0.15, Math.sin(i) * 0.1], [0.05, 0.12, 0.05], [Math.sin(i) * 0.5, 0, Math.cos(i) * 0.5]);
    P(H, G.hemi(), C(0x2a5ac8, 0.6), [0, 0.04, 0], [hr * 1.04, hr * 0.9, hr * 1.04]);
    P(H, G.cyl(), C(0x2a5ac8, 0.6), [0, 0.06, -0.22], [0.12, 0.012, 0.1]);
    const f = ch.userData.face;
    f.eyes.push(makeEye(H, [0.07, 0.03, hr * 0.84], 0.045, 0x3a7ac8, skin));
    f.eyes.push(makeEye(H, [-0.07, 0.03, hr * 0.84], 0.045, 0x3a7ac8, skin));
    for (const sx of [1, -1]) { const b = makeBrow(H, [sx * 0.07, 0.095, hr * 0.92], 0.05, 0.012, hairC, sx); b.userData.y0 = b.position.y; f.brows.push(b); }
    f.mouth = makeMouth(H, [0, -0.08, hr * 0.92], 0.05);
    P(H, G.box(), M.teeth(), [0, -0.075, hr * 0.97], [0.05, 0.02, 0.01]);
    ch.userData.kind = 'human';
    setMood(ch, 0.9);
    return finish(ch, 1.75, 0.35);
  }

  const MAKERS = { vampire, werewolf, mummy, ghost, frankie, blob, human };
  function monster(kind, style) { return MAKERS[kind](style); }

  // ============================================================
  //  ANIMATION for every character
  //  s = { speed (m/s), mood (-1..1), talk (0..1), panic, wave, t }
  // ============================================================
  function animate(ch, dt, s) {
    const R = ch.userData.rig;
    const ud = ch.userData;
    ud.phase = (ud.phase || 0) + dt * (2 + s.speed * 4.2);
    ud.t = (ud.t || 0) + dt;
    const t = ud.t, ph = ud.phase;
    const walk = U.clamp(s.speed / 1.4, 0, 1.5);
    const kind = ud.kind;
    // legs & arms swing
    const sw = Math.sin(ph) * 0.6 * walk;
    R.legL.rotation.x = sw; R.legR.rotation.x = -sw;
    const angry = s.mood < -0.4 && walk < 0.2;
    const happy = s.mood > 0.75 && walk < 0.2;
    let aL = -sw * 0.8, aR = sw * 0.8, azL = 0.08, azR = -0.08;
    if (angry) { // shaking fists
      aL = -2.3 + Math.sin(t * 16) * 0.2; aR = -2.3 + Math.cos(t * 16) * 0.2; azL = 0.3; azR = -0.3;
    } else if (s.panic) { aL = -2.8 + Math.sin(t * 20) * 0.3; aR = -2.8 + Math.cos(t * 22) * 0.3; azL = 0.5; azR = -0.5; }
    else if (s.wave) { aR = -2.6; azR = -0.4 + Math.sin(t * 10) * 0.35; }
    else if (happy) { aL = -0.4 + Math.sin(t * 3) * 0.1; }
    R.armL.rotation.x += (aL - R.armL.rotation.x) * Math.min(1, dt * 10);
    R.armR.rotation.x += (aR - R.armR.rotation.x) * Math.min(1, dt * 10);
    R.armL.rotation.z += (azL - R.armL.rotation.z) * Math.min(1, dt * 10);
    R.armR.rotation.z += (azR - R.armR.rotation.z) * Math.min(1, dt * 10);
    // body bob / breathing
    let bob = Math.abs(Math.sin(ph)) * 0.05 * walk + Math.sin(t * 2) * 0.008;
    if (happy) bob += Math.abs(Math.sin(t * 6)) * 0.05;
    if (kind === 'ghost') bob = 0.15 + Math.sin(t * 1.8) * 0.08;
    R.hips.position.y = R.hipY + bob;
    R.head.rotation.z = Math.sin(t * 1.3) * 0.04 + (s.talk ? Math.sin(t * 9) * 0.05 : 0);
    if (kind === 'vampire' && R.cape) R.cape.rotation.x = -walk * 0.25 - Math.sin(ph * 2) * 0.03 * walk;
    if (kind === 'werewolf' && R.tail) { R.tail.rotation.z = Math.sin(t * (s.mood > 0.3 ? 14 : 3)) * (s.mood > 0.3 ? 0.5 : 0.15); }
    if (kind === 'mummy' && R.strips) R.strips.forEach((st, i) => { st.rotation.x = Math.sin(t * 3 + i * 2) * 0.3 + walk * 0.5; st.rotation.z = Math.cos(t * 2.3 + i) * 0.2; });
    if (kind === 'ghost') { R.torso.rotation.x = walk * 0.25; R.torso.rotation.z = Math.sin(t * 1.4) * 0.06; }
    if (kind === 'blob' && R.blobBody) {
      const w = Math.sin(t * 5 + ph) * 0.05 + walk * Math.sin(ph * 2) * 0.08;
      R.blobBody.scale.set(0.55 * (1 + w), 0.5 * (1 - w), 0.52 * (1 + w));
      R.hips.position.y = 0.45 + Math.abs(Math.sin(ph)) * 0.08 * walk;
    }
    const talkOpen = s.talk ? (0.35 + Math.sin(t * 18) * 0.35) : (s.panic ? 0.9 : angry ? 0.35 : 0);
    setMood(ch, s.mood, talkOpen);
    animateFace(ch, t, dt, s.sleepy || 0);
  }

  // ============================================================
  //  THINGS YOU CARRY
  // ============================================================
  function item(kind) {
    const g = new THREE.Group();
    if (kind === 'blood') {
      P(g, lathe([[0.001, 0], [0.05, 0], [0.058, 0.005], [0.068, 0.17], [0.064, 0.17], [0.054, 0.012], [0.001, 0.012]]), M.glass());
      P(g, lathe([[0.001, 0.012], [0.053, 0.012], [0.062, 0.14], [0.001, 0.14]]), C(0xb0101e, 0.15, 0, { emissive: 0x300008 }));
      P(g, G.cyl(), C(0xffffff, 0.4), [0.02, 0.18, 0], [0.006, 0.14, 0.006], [0, 0, -0.25]);
      P(g, G.cyl(), C(0xd4203a, 0.4), [0.022, 0.19, 0], [0.0065, 0.03, 0.0065], [0, 0, -0.25]);
      // tiny bat umbrella
      P(g, G.cone(), C(0x3a1a4a, 0.6), [-0.03, 0.2, 0], [0.05, 0.025, 0.05], [0, 0, 0.3]);
      P(g, G.cyl(), C(0x8a6a3a, 0.6), [-0.02, 0.16, 0], [0.003, 0.08, 0.003], [0, 0, 0.3]);
      P(g, G.sphereLo(), C(0xd4203a, 0.2), [0.06, 0.155, 0], 0.012);
    } else if (kind === 'bone') {
      const b = C(0xf1e3c0, 0.5);
      P(g, G.cap(0.03, 0.26), b, [0, 0.05, 0], 1, [0, 0, Math.PI / 2]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(g, G.sphere(), b, [sx * 0.17, 0.05, sz * 0.03], 0.045);
    } else if (kind === 'soup') {
      P(g, lathe([[0.001, 0], [0.05, 0], [0.1, 0.05], [0.11, 0.09], [0.1, 0.09], [0.09, 0.055], [0.001, 0.04]]), C(0x5a3a7a, 0.4));
      P(g, G.cyl(), C(0x7cc22e, 0.2, 0, { emissive: 0x1a4000 }), [0, 0.075, 0], [0.098, 0.005, 0.098]);
      const bug = grp(g, [0.02, 0.085, 0.01]);
      P(bug, G.sphere(), M.blackShiny(), [0, 0, 0], [0.025, 0.015, 0.035]);
      for (let i = -1; i <= 1; i++) for (const sx of [-1, 1]) P(bug, G.cyl(), M.black(), [sx * 0.03, 0.005, i * 0.018], [0.003, 0.03, 0.003], [0, 0, sx * 1.2]);
      P(g, G.sphere(), M.eyeWhite(), [-0.04, 0.085, -0.03], 0.015);
      P(g, G.sphere(), M.pupil(), [-0.04, 0.095, -0.028], 0.007);
    } else if (kind === 'jelly') {
      P(g, G.cyl(), C(0xe6e0f0, 0.3), [0, 0.005, 0], [0.12, 0.01, 0.12]);
      const j = P(g, lathe([[0.001, 0.01], [0.09, 0.01], [0.085, 0.07], [0.06, 0.12], [0.001, 0.13]]), C(0x39e0c8, 0.1, 0, { emissive: 0x0a6a5a, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 }));
      j.userData.wobble = true;
      P(g, G.sphereLo(), M.pupil(), [0.025, 0.08, 0.075], 0.01); P(g, G.sphereLo(), M.pupil(), [-0.025, 0.08, 0.075], 0.01);
    } else if (kind === 'towel') {
      const cols = [0x7a3cb8, 0x9a5cd6, 0xb784ea];
      for (let i = 0; i < 3; i++) {
        P(g, G.rbox(0.24, 0.05, 0.16, 0.022), C(cols[i], 0.95), [0, 0.03 + i * 0.05, 0]);
        P(g, G.box(), C(0xd4a445, 0.5), [0, 0.03 + i * 0.05, 0.081], [0.2, 0.012, 0.002]);
      }
    } else if (kind === 'bandage') {
      const bd = M.bandage();
      for (let i = 0; i < 2; i++) P(g, G.cyl(), bd, [i * 0.1 - 0.05, 0.05, 0], [0.05, 0.1, 0.05], [0, 0, Math.PI / 2]).rotation.y = i * 0.5;
      P(g, G.box(), std('stripMat2', { map: T.bandage().map, roughness: 0.9, side: THREE.DoubleSide }), [0.1, 0.005, 0.06], [0.08, 0.004, 0.14], [0, 0.4, 0]);
    } else if (kind === 'jar') {
      P(g, G.cyl(), M.glass(), [0, 0.1, 0], [0.07, 0.18, 0.07]);
      P(g, G.cyl(), M.iron(), [0, 0.2, 0], [0.075, 0.03, 0.075]);
      P(g, G.torus(), M.iron(), [0, 0.225, 0], [0.03, 0.03, 0.03], [Math.PI / 2, 0, 0]);
      const bolt = new THREE.Shape();
      bolt.moveTo(0.02, 0.08); bolt.lineTo(-0.025, 0.005); bolt.lineTo(0.005, 0.005); bolt.lineTo(-0.02, -0.075); bolt.lineTo(0.03, 0.015); bolt.lineTo(0.0, 0.015); bolt.lineTo(0.03, 0.08);
      const bm = P(g, geo('boltGeo', () => new THREE.ExtrudeGeometry(bolt, { depth: 0.015, bevelEnabled: false })), mats.bolt || (mats.bolt = new THREE.MeshBasicMaterial({ color: 0xfff080 })), [0, 0.1, -0.007]);
      bm.userData.flicker = true;
      const gl = new THREE.Sprite(glowMat(0xffd23a)); gl.scale.set(0.35, 0.35, 1); gl.position.y = 0.1; g.add(gl);
    }
    g.userData.kind = kind;
    return g;
  }

  // ============================================================
  //  YOUR HANDS (first person)
  // ============================================================
  const BOSS_ARMS = {
    vampire: { sleeve: () => C(0x0c0a12, 0.85, 0, { envMapIntensity: 0.3 }), cuff: () => C(0xf4f2f8, 0.6), skin: () => C(0xd9d2e6, 0.5), nails: () => C(0x2a1a30, 0.3) },
    werewolf: { sleeve: () => std('wolfFurArm', { map: T.fur('#6a4a32'), roughness: 0.95 }), cuff: () => C(0x3a2a6a, 0.8), skin: () => std('wolfFurArm', { map: T.fur('#6a4a32'), roughness: 0.95 }), nails: () => M.teeth(), claws: true },
    mummy: { sleeve: () => M.bandage(), cuff: () => M.bandage(), skin: () => M.bandage(), nails: () => M.bandage() },
    frankie: { sleeve: () => C(0x24241e, 0.9, 0, { envMapIntensity: 0.35 }), cuff: () => C(0xd8d4c0, 0.8), skin: () => C(0x86b070, 0.6), nails: () => C(0x2a3a20, 0.6), big: true },
  };
  function fpHand(boss, side) {
    const A = BOSS_ARMS[boss];
    const s = A.big ? 1.2 : 1;
    const arm = new THREE.Group();
    // forearm pointing forward (-z is forward for the camera)
    P(arm, G.cap(0.036 * s, 0.2), A.sleeve(), [0, 0, 0.1], 1, [Math.PI / 2, 0, 0]);
    P(arm, G.cyl(), A.cuff(), [0, 0, -0.02], [0.042 * s, 0.035, 0.042 * s], [Math.PI / 2, 0, 0]);
    if (boss === 'vampire') P(arm, G.torus(), A.cuff(), [0, 0, -0.04], [0.04, 0.04, 0.12]); // frilly cuff
    if (boss === 'werewolf') for (let i = 0; i < 5; i++) P(arm, G.cone(), A.sleeve(), [Math.cos(i * 1.3) * 0.03, Math.sin(i * 1.3) * 0.03 + 0.01, -0.03], [0.012, 0.04, 0.012], [-Math.PI / 2, 0, 0]);
    const hnd = grp(arm, [0, 0, -0.08 * s]);
    P(hnd, G.rbox(0.068 * s, 0.026 * s, 0.072 * s, 0.011 * s), A.skin(), [0, 0, 0]);
    const fingers = [];
    for (let i = 0; i < 4; i++) {
      const fg = grp(hnd, [(i - 1.5) * 0.0165 * s, 0, -0.032 * s]);
      const len = (i === 0 || i === 3 ? 0.03 : 0.037) * s * (boss === 'vampire' ? 1.2 : 1);
      P(fg, G.cap(0.0075 * s, len), A.skin(), [0, 0, -len / 2], 1, [Math.PI / 2, 0, 0]);
      if (A.claws || boss === 'vampire') P(fg, G.cone(), A.nails(), [0, 0.001, -len - 0.009], [0.0055, A.claws ? 0.022 : 0.01, 0.0055], [-Math.PI / 2, 0, 0]);
      fingers.push(fg);
    }
    const thumb = grp(hnd, [side * 0.034 * s, 0, 0.0]);
    P(thumb, G.cap(0.0085 * s, 0.026 * s), A.skin(), [side * 0.01, 0, -0.018], 1, [Math.PI / 2, 0, side * 0.5]);
    if (boss === 'frankie') P(hnd, G.box(), C(0x2a3a20, 0.8), [0, 0.014 * s, 0], [0.05, 0.003, 0.005]);
    arm.userData = { hand: hnd, fingers, thumb };
    return arm;
  }
  function viewModel(boss) {
    const g = new THREE.Group();
    const R = fpHand(boss, -1), L = fpHand(boss, 1);
    R.position.set(0.24, -0.26, -0.3); L.position.set(-0.24, -0.26, -0.3);
    g.add(R, L);
    // bat wings (only for the vampire's BAT FORM)
    const wings = grp(g, [0, -0.1, -0.35]);
    wings.visible = false;
    if (boss === 'vampire') {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0); sh.quadraticCurveTo(0.2, 0.15, 0.55, 0.08); sh.quadraticCurveTo(0.45, 0.02, 0.48, -0.08);
      sh.quadraticCurveTo(0.38, -0.02, 0.32, -0.1); sh.quadraticCurveTo(0.24, -0.02, 0.16, -0.1); sh.quadraticCurveTo(0.1, -0.02, 0, -0.06);
      const wg = new THREE.ShapeGeometry(sh, 12);
      const wm = C(0x2a1a34, 0.6, 0, { side: THREE.DoubleSide });
      for (const sx of [-1, 1]) {
        const w = grp(wings, [sx * 0.08, 0, 0]);
        const m = P(w, wg, wm, [0, 0, 0], [sx, 1, 1]);
        m.rotation.x = -1.2;
        wings.userData[sx < 0 ? 'l' : 'r'] = w;
      }
    }
    g.userData = { R, L, wings, boss };
    return g;
  }

  // ============================================================
  //  LIGHTS & SMALL DECOR
  // ============================================================
  function candle(parent, pos, h = 0.14, r = 0.018) {
    const c = grp(parent, pos);
    P(c, G.cylLo(), M.wax(), [0, h / 2, 0], [r, h, r]);
    P(c, G.sphereLo(), M.wax(), [0.008, h * 0.7, r * 0.8], [0.006, 0.02, 0.006]); // drip
    const fl = grp(c, [0, h + 0.03, 0]);
    P(fl, G.sphereLo(), M.flame(), [0, 0, 0], [0.012, 0.03, 0.012]);
    P(fl, G.sphereLo(), M.flameCore(), [0, -0.008, 0], [0.006, 0.014, 0.006]);
    // a marker: the world turns all of these into ONE batch of glowing dots (fast!)
    const glow = grp(c, [0, h + 0.03, 0]);
    glow.userData.glow = true;
    return c;
  }
  function sconce() {
    const g = new THREE.Group();
    P(g, G.rbox(0.1, 0.22, 0.04, 0.015), M.brass(), [0, 0, 0.02]);
    P(g, G.cyl(), M.brass(), [0, -0.03, 0.12], [0.012, 0.2, 0.012], [Math.PI / 2, 0, 0]);
    P(g, G.cyl(), M.brass(), [0, -0.03, 0.22], [0.05, 0.02, 0.05]);
    candle(g, [0, -0.02, 0.22], 0.12, 0.02);
    return g;
  }
  function candelabra(parent, pos, s = 1) {
    const g = grp(parent, pos);
    g.scale.setScalar(s);
    P(g, lathe([[0.001, 0], [0.07, 0], [0.06, 0.02], [0.015, 0.04], [0.012, 0.2], [0.02, 0.22], [0.001, 0.23]]), M.gold());
    P(g, G.torus(), M.gold(), [0, 0.2, 0], [0.09, 0.09, 0.15], [Math.PI / 2, 0, 0]);
    candle(g, [0, 0.22, 0], 0.13);
    candle(g, [0.09, 0.2, 0], 0.11); candle(g, [-0.09, 0.2, 0], 0.11);
    return g;
  }
  function chandelier(size = 1) {
    const g = new THREE.Group();
    const s = size;
    P(g, G.cyl(), M.iron(), [0, 1.5, 0], [0.012, 3, 0.012]);
    P(g, lathe([[0.001, -0.25], [0.08, -0.2], [0.05, 0], [0.09, 0.15], [0.02, 0.3], [0.001, 0.32]]), M.gold(), [0, 0, 0], s);
    const n = 10;
    for (const [rad, y, cnt] of [[0.75, 0, n], [0.45, 0.35, 6]]) {
      P(g, G.torus(), M.gold(), [0, y * s, 0], [rad * s, rad * s, 0.2 * s], [Math.PI / 2, 0, 0]);
      for (let i = 0; i < cnt; i++) {
        const a = i / cnt * Math.PI * 2;
        const x = Math.cos(a) * rad * s, z = Math.sin(a) * rad * s;
        P(g, G.cyl(), M.gold(), [x, (y + 0.02) * s, z], [0.035 * s, 0.03 * s, 0.035 * s]);
        candle(g, [x, (y + 0.04) * s, z], 0.14 * s, 0.02 * s);
        // hanging crystals
        P(g, G.octa(), C(0xe8f0ff, 0.02, 0.2, { transparent: true, opacity: 0.75, emissive: 0x302840 }), [x * 0.95, (y - 0.12) * s, z * 0.95], [0.025 * s, 0.05 * s, 0.025 * s]);
      }
      for (let i = 0; i < cnt; i += 2) {
        const a = i / cnt * Math.PI * 2;
        P(g, G.cyl(), M.gold(), [Math.cos(a) * rad * s * 0.5, (y + 0.05) * s, Math.sin(a) * rad * s * 0.5], [0.01 * s, rad * s, 0.01 * s], [0, -a, Math.PI / 2]);
      }
    }
    return g;
  }

  // ============================================================
  //  FURNITURE
  // ============================================================
  function frontDesk(len) {
    const g = new THREE.Group();
    const w = len, d = 0.8, h = 1.1;
    P(g, G.rbox(w, h - 0.06, d, 0.05), M.darkWood(), [0, (h - 0.06) / 2, 0]);
    // wood panels on the front
    const panels = Math.round(w / 0.9);
    for (let i = 0; i < panels; i++) {
      const px = -w / 2 + (i + 0.5) * w / panels;
      P(g, G.rbox(w / panels - 0.12, h - 0.35, 0.03, 0.01), M.panel(), [px, h / 2 - 0.05, d / 2 + 0.005]);
      P(g, G.sphere(), M.gold(), [px, h / 2 - 0.05, d / 2 + 0.03], [0.05, 0.05, 0.02]);
    }
    P(g, G.rbox(w + 0.12, 0.07, d + 0.14, 0.03), C(0x3a1a12, 0.25, 0.1), [0, h, 0]);
    P(g, G.box(), M.gold(), [0, h - 0.045, d / 2 + 0.07], [w + 0.1, 0.02, 0.01]);
    P(g, G.box(), M.gold(), [0, 0.06, d / 2 + 0.01], [w, 0.03, 0.02]);
    // the bell!
    const bell = grp(g, [w * 0.25, h + 0.035, 0.1]);
    P(bell, G.cyl(), C(0x2a2a2a, 0.5), [0, 0.01, 0], [0.07, 0.02, 0.07]);
    P(bell, G.hemi(), M.gold(), [0, 0.02, 0], [0.06, 0.05, 0.06]);
    P(bell, G.sphere(), M.gold(), [0, 0.08, 0], 0.012);
    g.userData.bell = bell;
    // guest book
    const book = grp(g, [-w * 0.2, h + 0.04, 0.05], [0, 0.3, 0]);
    P(book, G.box(), C(0x5a1020, 0.6), [0, 0, 0], [0.34, 0.02, 0.24]);
    P(book, G.box(), C(0xf0e6cc, 0.8), [-0.08, 0.015, 0], [0.15, 0.012, 0.22], [0, 0, 0.06]);
    P(book, G.box(), C(0xf0e6cc, 0.8), [0.08, 0.015, 0], [0.15, 0.012, 0.22], [0, 0, -0.06]);
    P(book, G.cyl(), C(0xffffff, 0.5), [0.2, 0.06, 0.02], [0.004, 0.14, 0.004], [0.3, 0, -0.5]);
    candelabra(g, [-w * 0.42, h + 0.035, 0.05], 1.2);
    candelabra(g, [w * 0.42, h + 0.035, 0.05], 1.2);
    return g;
  }
  // wall of little key boxes behind the desk
  function keyRack(w) {
    const g = new THREE.Group();
    P(g, G.rbox(w, 1.6, 0.2, 0.03), M.darkWood(), [0, 0.8, 0.1]);
    const cols = 8, rows = 4;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = -w / 2 + 0.15 + c * (w - 0.3) / (cols - 1), y = 0.25 + r * 0.36;
      P(g, G.box(), C(0x1a0c08, 0.9), [x, y, 0.19], [0.22, 0.26, 0.04]);
      if ((r * 3 + c) % 3 !== 0) {
        P(g, G.torus(), M.gold(), [x, y + 0.06, 0.215], [0.025, 0.025, 0.02]);
        P(g, G.box(), M.gold(), [x, y - 0.02, 0.215], [0.012, 0.1, 0.008]);
      }
    }
    P(g, G.box(), M.gold(), [0, 1.62, 0.2], [w, 0.04, 0.03]);
    return g;
  }
  function fireplace(len) {
    const g = new THREE.Group();
    const w = len, st = C(0x5a5060, 0.85);
    // (the fireplace faces +z)
    P(g, G.rbox(w, 1.5, 0.7, 0.06), st, [0, 0.75, -0.1]);
    P(g, G.rbox(w * 0.62, 0.95, 0.5, 0.05), C(0x0c0808, 1), [0, 0.5, 0.06]);
    P(g, G.rbox(w + 0.3, 0.12, 0.85, 0.04), C(0x3a3040, 0.6), [0, 1.52, -0.05]);
    for (const sx of [-1, 1]) P(g, G.rbox(0.22, 1.45, 0.3, 0.05), st, [sx * (w / 2 - 0.05), 0.72, 0.25]);
    // logs
    for (let i = 0; i < 3; i++) P(g, G.cyl(), C(0x3a2214, 0.9), [(i - 1) * 0.2, 0.12 + (i === 1 ? 0.1 : 0), 0.1], [0.07, 0.6, 0.07], [0, 0.3 * (i - 1), Math.PI / 2]);
    // flames (they dance)
    const fire = grp(g, [0, 0.15, 0.12]);
    fire.userData.dynamic = true;
    const fmat = [mats.f1 || (mats.f1 = new THREE.MeshBasicMaterial({ color: 0xff6a1a })), mats.f2 || (mats.f2 = new THREE.MeshBasicMaterial({ color: 0xffb030 })), M.flameCore()];
    const flames = [];
    for (let i = 0; i < 7; i++) {
      const fl = P(fire, G.cone(), fmat[i % 3], [(Math.random() - 0.5) * 0.5, 0.2, (Math.random() - 0.5) * 0.15], [0.08 + Math.random() * 0.05, 0.3 + Math.random() * 0.2, 0.08]);
      fl.userData.base = fl.scale.y; fl.userData.off = Math.random() * 10;
      flames.push(fl);
    }
    const gl = new THREE.Sprite(glowMat(0xff8a2a)); gl.scale.set(2.2, 1.6, 1); gl.position.set(0, 0.35, 0.2); gl.material.opacity = 0.6;
    fire.add(gl);
    fire.userData.flames = flames;
    g.userData.fire = fire;
    // mantel decorations
    candelabra(g, [-w * 0.35, 1.58, 0], 1);
    candelabra(g, [w * 0.35, 1.58, 0], 1);
    const skull = grp(g, [0, 1.58, 0.05]);
    P(skull, G.sphere(), C(0xe8e0c8, 0.5), [0, 0.1, 0], [0.1, 0.1, 0.11]);
    P(skull, G.rbox(0.12, 0.06, 0.1, 0.02), C(0xe8e0c8, 0.5), [0, 0.02, 0.03]);
    for (const sx of [-1, 1]) P(skull, G.sphere(), C(0x1a1010, 0.8), [sx * 0.035, 0.1, 0.09], 0.025);
    return g;
  }
  function sofa(len, color = 0x5a2a7a) {
    const g = new THREE.Group();
    const vel = std('velvetT' + color, { map: T.velvet('#' + new THREE.Color(color).getHexString()), roughness: 0.75 });
    const w = len;
    P(g, G.rbox(w, 0.42, 0.85, 0.1), vel, [0, 0.35, 0]);
    P(g, G.rbox(w, 0.75, 0.22, 0.1), vel, [0, 0.72, -0.34]);
    for (const sx of [-1, 1]) {
      P(g, G.rbox(0.2, 0.3, 0.88, 0.1), vel, [sx * (w / 2 - 0.04), 0.66, 0]);
      P(g, G.cyl(), vel, [sx * (w / 2 - 0.04), 0.8, 0], [0.12, 0.88, 0.12], [Math.PI / 2, 0, 0]);
    }
    // cushions
    const n = Math.max(2, Math.round(w / 0.8));
    for (let i = 0; i < n; i++) P(g, G.rbox((w - 0.4) / n - 0.03, 0.16, 0.66, 0.07), vel, [-w / 2 + 0.2 + (i + 0.5) * (w - 0.4) / n, 0.6, 0.06]);
    // gold claw feet
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(g, G.sphere(), M.gold(), [sx * (w / 2 - 0.12), 0.07, sz * 0.32], [0.06, 0.07, 0.06]);
    return g;
  }
  function roundTable() {
    const g = new THREE.Group();
    P(g, lathe([[0.001, 0], [0.28, 0], [0.26, 0.04], [0.06, 0.1], [0.05, 0.6], [0.08, 0.66], [0.001, 0.68]]), M.darkWood());
    P(g, G.cyl(), C(0x3a1a12, 0.25, 0.1), [0, 0.7, 0], [0.45, 0.04, 0.45]);
    P(g, G.cyl(), C(0x6a1a3a, 0.8), [0, 0.725, 0], [0.3, 0.01, 0.3]);
    candelabra(g, [0, 0.73, 0], 1);
    return g;
  }
  function armchair(color) {
    const g = new THREE.Group();
    const vel = std('velvetT' + color, { map: T.velvet('#' + new THREE.Color(color).getHexString()), roughness: 0.75 });
    P(g, G.rbox(0.7, 0.4, 0.7, 0.1), vel, [0, 0.33, 0]);
    P(g, G.rbox(0.7, 0.9, 0.18, 0.08), vel, [0, 0.75, -0.3]);
    for (const sx of [-1, 1]) P(g, G.rbox(0.14, 0.3, 0.7, 0.07), vel, [sx * 0.33, 0.6, 0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) P(g, G.sphere(), M.gold(), [sx * 0.28, 0.06, sz * 0.26], 0.05);
    return g;
  }
  // a hungry little plant in a pot
  function plant() {
    const g = new THREE.Group();
    P(g, lathe([[0.001, 0], [0.16, 0], [0.22, 0.4], [0.25, 0.42], [0.25, 0.46], [0.001, 0.46]]), C(0x4a2a3a, 0.5));
    P(g, G.cyl(), C(0x2a1a10, 1), [0, 0.45, 0], [0.22, 0.02, 0.22]);
    const green = C(0x3a7a2a, 0.6), inner = C(0xc83a4a, 0.6);
    const heads = [];
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      const stem = grp(g, [0, 0.45, 0], [Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35]);
      P(stem, G.cyl(), green, [0, 0.3, 0], [0.02, 0.6, 0.02]);
      const head = grp(stem, [0, 0.62, 0]);
      for (const up of [1, -1]) {
        const jaw = grp(head, [0, 0, 0]);
        const m = P(jaw, G.hemi(), green, [0, 0, 0], [0.11, 0.06, 0.1], [up > 0 ? 0 : Math.PI, 0, 0]);
        P(jaw, G.hemi(), inner, [0, up * 0.003, 0], [0.1, 0.05, 0.09], [up > 0 ? 0 : Math.PI, 0, 0]);
        for (let t = 0; t < 6; t++) {
          const ta = (t / 5 - 0.5) * 2.4;
          P(jaw, G.cone(), M.teeth(), [Math.sin(ta) * 0.1, -up * 0.012, Math.cos(ta) * 0.09], [0.008, 0.03, 0.008], [up > 0 ? Math.PI : 0, 0, 0]);
        }
        jaw.userData.up = up;
        head.userData[up > 0 ? 'top' : 'bot'] = jaw;
      }
      head.rotation.z = -Math.PI / 2;
      head.userData.dynamic = true;
      heads.push(head);
    }
    g.userData.heads = heads;
    return g;
  }
  function armor() {
    const g = new THREE.Group();
    const met = M.silver();
    P(g, G.rbox(0.6, 0.2, 0.5, 0.04), C(0x3a3040, 0.8), [0, 0.1, 0]);
    for (const sx of [-1, 1]) {
      P(g, G.cap(0.07, 0.62), met, [sx * 0.1, 0.62, 0]);
      P(g, G.rbox(0.13, 0.08, 0.24, 0.03), met, [sx * 0.1, 0.24, 0.04]);
      P(g, G.sphere(), met, [sx * 0.1, 0.6, 0.05], [0.08, 0.07, 0.06]);
    }
    P(g, lathe([[0.001, 0.95], [0.2, 0.95], [0.18, 1.1], [0.24, 1.45], [0.14, 1.55], [0.001, 1.56]]), met);
    for (const sx of [-1, 1]) {
      P(g, G.sphere(), met, [sx * 0.27, 1.45, 0], [0.11, 0.09, 0.11]);
      P(g, G.cap(0.055, 0.45), met, [sx * 0.29, 1.15, 0.02]);
    }
    const hd = grp(g, [0, 1.72, 0]);
    P(hd, G.sphere(), met, [0, 0, 0], [0.14, 0.17, 0.15]);
    P(hd, G.box(), C(0x0a0a0a, 0.5), [0, 0.01, 0.13], [0.16, 0.02, 0.05]);
    P(hd, G.cone(), C(0x8a1428, 0.6), [0, 0.2, -0.05], [0.03, 0.16, 0.03], [-0.5, 0, 0]);
    // big axe
    const ax = grp(g, [0.3, 0.95, 0.15]);
    P(ax, G.cyl(), M.darkWood(), [0, 0.3, 0], [0.02, 1.7, 0.02]);
    P(ax, G.cyl(), met, [0.1, 1.05, 0], [0.18, 0.02, 0.18], [Math.PI / 2, 0, 0]).scale.set(0.18, 0.02, 0.14);
    return g;
  }
  function grandClock() {
    const g = new THREE.Group();
    P(g, G.rbox(0.6, 2.3, 0.4, 0.04), M.darkWood(), [0, 1.15, 0]);
    P(g, G.rbox(0.7, 0.14, 0.46, 0.04), M.darkWood(), [0, 2.35, 0]);
    P(g, G.cone(), M.darkWood(), [0, 2.55, 0], [0.3, 0.3, 0.2]);
    const face = T.tex(U.canvas(128, 128, (c) => {
      c.fillStyle = '#f0e6c8'; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill();
      c.strokeStyle = '#3a2a10'; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#3a2a10'; c.font = 'bold 16px Georgia'; c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; c.fillText(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][i - 1], 64 + Math.sin(a) * 46, 64 - Math.cos(a) * 46); }
    }), false);
    P(g, G.cyl(), std('clockFace', { map: face, roughness: 0.5 }), [0, 1.95, 0.2], [0.22, 0.02, 0.22], [Math.PI / 2, Math.PI, 0]).rotation.set(Math.PI / 2, 0, 0);
    P(g, G.torus(), M.gold(), [0, 1.95, 0.21], [0.22, 0.22, 0.1]);
    const hands = grp(g, [0, 1.95, 0.225]);
    hands.userData.dynamic = true;
    const hh = P(hands, G.box(), M.black(), [0, 0.05, 0], [0.015, 0.1, 0.005]);
    const mh = P(hands, G.box(), M.black(), [0, 0.07, 0], [0.01, 0.15, 0.005]);
    // glass window with a swinging pendulum
    P(g, G.box(), C(0x0a0608, 1), [0, 1.0, 0.19], [0.36, 1.2, 0.02]);
    const pend = grp(g, [0, 1.55, 0.2]);
    pend.userData.dynamic = true;
    P(pend, G.box(), M.gold(), [0, -0.4, 0], [0.012, 0.8, 0.01]);
    P(pend, G.cyl(), M.gold(), [0, -0.82, 0], [0.08, 0.02, 0.08], [Math.PI / 2, 0, 0]);
    P(g, G.box(), M.glass(), [0, 1.0, 0.215], [0.38, 1.22, 0.01]);
    g.userData = { pend, hh, mh, hands };
    return g;
  }
  function portraitFrame(kind, w = 0.9, h = 1.15) {
    const g = new THREE.Group();
    P(g, G.rbox(w + 0.16, h + 0.16, 0.06, 0.03), M.gold(), [0, 0, 0.03]);
    P(g, G.plane(), std('portrait' + kind, { map: T.portrait(kind), roughness: 0.55 }), [0, 0, 0.065], [w, h, 1]);
    return g;
  }

  // ---------- guest room furniture ----------
  function coffinBed(color = 0x6a2a8a) {
    const g = new THREE.Group();
    const sh = new THREE.Shape();
    sh.moveTo(-0.32, -1.05); sh.lineTo(0.32, -1.05); sh.lineTo(0.5, 0.45); sh.lineTo(0.36, 1.05); sh.lineTo(-0.36, 1.05); sh.lineTo(-0.5, 0.45); sh.closePath();
    const body = geo('coffin', () => { const e = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 }); e.rotateX(-Math.PI / 2); return e; });
    P(g, body, M.darkWood(), [0, 0.08, 0]);
    const inner = geo('coffinIn', () => { const s2 = new THREE.Shape(sh.getPoints().map((p) => p.clone().multiplyScalar(0.86))); const e = new THREE.ExtrudeGeometry(s2, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3 }); e.rotateX(-Math.PI / 2); return e; });
    const vel = std('velvetT' + color, { map: T.velvet('#' + new THREE.Color(color).getHexString()), roughness: 0.75 });
    P(g, inner, vel, [0, 0.5, 0]);
    // pillow
    P(g, G.rbox(0.5, 0.12, 0.3, 0.06), C(0xe8dff0, 0.8), [0, 0.66, -0.66]);
    // blanket
    P(g, G.rbox(0.62, 0.08, 1.2, 0.04), C(0x2a1040, 0.8), [0, 0.64, 0.3]);
    P(g, G.box(), M.gold(), [0, 0.685, -0.26], [0.62, 0.012, 0.06]);
    // gold handles
    for (const sx of [-1, 1]) for (const z of [-0.2, 0.45]) P(g, G.torus(), M.gold(), [sx * (0.47 - z * 0.12), 0.3, z], [0.07, 0.05, 0.07], [0, Math.PI / 2, 0]);
    // the lid stands up behind the head
    const lid = P(g, body, M.darkWood(), [0, 1.12, -1.3], [0.95, 0.12, 1]);
    lid.rotation.x = Math.PI / 2 - 0.1;
    P(g, G.box(), M.gold(), [0, 1.25, -1.22], [0.06, 0.6, 0.02], [-0.1, 0, 0]);
    P(g, G.box(), M.gold(), [0, 1.4, -1.22], [0.34, 0.06, 0.02], [-0.1, 0, 0]);
    return g;
  }
  function nightstand() {
    const g = new THREE.Group();
    P(g, G.rbox(0.5, 0.6, 0.45, 0.03), M.darkWood(), [0, 0.3, 0]);
    P(g, G.box(), M.panel(), [0, 0.3, 0.226], [0.4, 0.2, 0.01]);
    P(g, G.sphere(), M.gold(), [0, 0.3, 0.24], 0.022);
    // lantern
    const lan = grp(g, [0, 0.6, 0]);
    P(lan, G.box(), M.iron(), [0, 0.01, 0], [0.16, 0.02, 0.16]);
    P(lan, G.cone(), M.iron(), [0, 0.27, 0], [0.13, 0.1, 0.13], [0, Math.PI / 4, 0]);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P(lan, G.box(), M.iron(), [x * 0.07, 0.12, z * 0.07], [0.015, 0.22, 0.015]);
    P(lan, G.box(), C(0xffd89a, 0.3, 0, { transparent: true, opacity: 0.35, emissive: 0xffa040, emissiveIntensity: 0.6, depthWrite: false }), [0, 0.12, 0], [0.14, 0.2, 0.14]);
    candle(lan, [0, 0.02, 0], 0.08, 0.025);
    return g;
  }
  function wardrobe() {
    const g = new THREE.Group();
    P(g, G.rbox(1.1, 2.1, 0.55, 0.04), M.darkWood(), [0, 1.05, 0]);
    for (const sx of [-1, 1]) {
      P(g, G.box(), M.panel(), [sx * 0.27, 1.1, 0.28], [0.46, 1.7, 0.02]);
      P(g, G.sphere(), M.gold(), [sx * 0.06, 1.1, 0.3], 0.028);
    }
    P(g, G.rbox(1.2, 0.12, 0.62, 0.03), M.darkWood(), [0, 2.12, 0]);
    // a bat on top
    P(g, G.sphere(), M.black(), [0.3, 2.23, 0.1], [0.05, 0.05, 0.045]);
    return g;
  }
  function rug(w, d, hue) {
    const m = new THREE.Mesh(G.plane(), std('rug' + hue, { map: T.rectRug(hue), roughness: 0.95 }));
    m.rotation.x = -Math.PI / 2; m.scale.set(w, d, 1);
    return m;
  }

  // ---------- doors ----------
  function roomDoor(num) {
    const g = new THREE.Group();
    const leaf = grp(g, [-0.55, 0, 0]);  // hinge on the left
    leaf.userData.dynamic = true;
    const doorMat = std('doorMat', { map: T.doorWood(), roughness: 0.6, color: 0xffffff });
    P(leaf, G.rbox(1.1, 2.55, 0.08, 0.02), doorMat, [0.55, 1.28, 0]);
    for (const y of [0.5, 2.1]) P(leaf, G.box(), M.iron(), [0.55, y, 0.045], [1.08, 0.07, 0.015]);
    P(leaf, G.sphere(), M.gold(), [0.95, 1.2, 0.07], 0.035);
    P(leaf, G.sphere(), M.gold(), [0.95, 1.2, -0.07], 0.035);
    P(leaf, G.cyl(), std('plate' + num, { map: T.roomPlate(num), roughness: 0.3, metalness: 0.6 }), [0.55, 1.75, 0.05], [0.14, 0.012, 0.14], [Math.PI / 2, 0, 0]).rotation.set(Math.PI / 2, 0, 0);
    g.userData.leaf = leaf;
    return g;
  }
  function frontDoors() {
    const g = new THREE.Group();
    const doorMat = std('doorMat', { map: T.doorWood(), roughness: 0.6, color: 0xffffff });
    const leaves = [];
    for (const sx of [-1, 1]) {
      const hinge = grp(g, [sx * 2.2, 0, 0]);
      hinge.userData.dynamic = true;
      P(hinge, G.rbox(2.2, 4.2, 0.14, 0.03), doorMat, [-sx * 1.1, 2.1, 0]);
      for (const y of [0.6, 2.1, 3.6]) P(hinge, G.box(), M.iron(), [-sx * 1.1, y, 0.08], [2.15, 0.1, 0.02]);
      for (let i = 0; i < 3; i++) for (const y of [0.6, 2.1, 3.6]) P(hinge, G.sphere(), M.iron(), [-sx * (0.3 + i * 0.7), y, 0.1], 0.03);
      P(hinge, G.torus(), M.gold(), [-sx * 1.95, 2.0, 0.14], [0.14, 0.14, 0.2]);
      P(hinge, G.sphere(), M.gold(), [-sx * 1.95, 2.18, 0.12], 0.05);
      leaves.push(hinge);
    }
    g.userData.leaves = leaves;
    return g;
  }

  // ---------- windows ----------
  function curtains(w, h, color) {
    const g = new THREE.Group();
    const cm = std('curtain' + color, { color, roughness: 0.8, side: THREE.DoubleSide, map: T.velvet('#' + new THREE.Color(color).getHexString()) });
    const cg = geo('curtainGeo' + w + '_' + h, () => {
      const pg = new THREE.PlaneGeometry(w * 0.32, h, 16, 4);
      const p = pg.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / (w * 0.32) + 0.5) * Math.PI * 6) * 0.04);
      pg.computeVertexNormals();
      return pg;
    });
    for (const sx of [-1, 1]) {
      const c = P(g, cg, cm, [sx * (w / 2 - w * 0.12), -h / 2, 0.06]);
      c.userData.side = sx;
      P(g, G.cyl(), M.gold(), [sx * (w / 2 - w * 0.12), -h * 0.55, 0.1], [0.03, 0.06, 0.03], [0, 0, Math.PI / 2]);
    }
    P(g, G.cyl(), M.gold(), [0, 0.02, 0.1], [0.025, w + 0.3, 0.025], [0, 0, Math.PI / 2]);
    for (const sx of [-1, 1]) P(g, G.sphere(), M.gold(), [sx * (w / 2 + 0.16), 0.02, 0.1], 0.05);
    // valance
    P(g, G.rbox(w + 0.2, 0.28, 0.1, 0.04), cm, [0, -0.1, 0.13]);
    return g;
  }
  // window glass with gothic bars; the two panes can swing open
  function windowPanes(w, h) {
    const g = new THREE.Group();
    const frame = C(0x2a1a14, 0.6);
    const panes = [];
    for (const sx of [-1, 1]) {
      const hinge = grp(g, [sx * w / 2, 0, 0]);
      hinge.userData.dynamic = true;
      const pw = w / 2;
      const px = -sx * pw / 2;
      P(hinge, G.box(), M.glass(), [px, h / 2, 0], [pw, h, 0.01]);
      for (const y of [0.02, h / 3, 2 * h / 3, h - 0.02]) P(hinge, G.box(), frame, [px, y, 0], [pw, 0.04, 0.04]);
      P(hinge, G.box(), frame, [-sx * 0.02, h / 2, 0], [0.04, h, 0.04]);
      P(hinge, G.box(), frame, [-sx * (pw - 0.02), h / 2, 0], [0.04, h, 0.04]);
      panes.push(hinge);
    }
    g.userData.panes = panes;
    return g;
  }

  // ---------- kitchen & supplies ----------
  function counter() {
    const g = new THREE.Group();
    P(g, G.rbox(1.4, 0.88, 0.7, 0.03), C(0x2a4a3a, 0.6), [0, 0.44, 0]);
    for (const sx of [-1, 1]) {
      P(g, G.box(), C(0x3a5a4a, 0.55), [sx * 0.34, 0.45, 0.355], [0.6, 0.66, 0.02]);
      P(g, G.box(), M.brass(), [sx * 0.1, 0.62, 0.37], [0.1, 0.02, 0.02]);
    }
    P(g, G.rbox(1.46, 0.07, 0.76, 0.02), C(0x2a2430, 0.25, 0.2), [0, 0.92, 0]);
    return g;
  }
  function cauldron() {
    const g = counter();
    const pot = grp(g, [0, 0.95, 0]);
    P(pot, lathe([[0.001, 0.02], [0.2, 0.05], [0.33, 0.25], [0.3, 0.45], [0.33, 0.48], [0.3, 0.5], [0.28, 0.46], [0.001, 0.4]]), C(0x1a1a20, 0.35, 0.7));
    const brew = P(pot, G.cyl(), C(0x6aff3a, 0.2, 0, { emissive: 0x3aa01a, emissiveIntensity: 1 }), [0, 0.43, 0], [0.28, 0.01, 0.28]);
    const bubbles = grp(pot, [0, 0.44, 0]);
    bubbles.userData.dynamic = true;
    for (let i = 0; i < 6; i++) { const b = P(bubbles, G.sphereLo(), C(0x9aff6a, 0.2, 0, { emissive: 0x4ac02a }), [(Math.random() - 0.5) * 0.35, 0, (Math.random() - 0.5) * 0.35], 0.03); b.userData.off = Math.random() * 5; }
    const gl = new THREE.Sprite(glowMat(0x7aff4a)); gl.scale.set(1.2, 1.2, 1); gl.position.y = 0.6; gl.material.opacity = 0.35;
    pot.add(gl);
    g.userData.bubbles = bubbles;
    return g;
  }
  function sink() {
    const g = counter();
    P(g, G.box(), C(0xc8ccd4, 0.3, 0.8), [0, 0.93, 0], [0.7, 0.03, 0.45]);
    P(g, G.box(), C(0x3a3a44, 0.3, 0.6), [0, 0.935, 0], [0.62, 0.03, 0.38]);
    P(g, G.cyl(), M.silver(), [0, 1.1, -0.28], [0.02, 0.35, 0.02]);
    P(g, G.cyl(), M.silver(), [0, 1.27, -0.18], [0.018, 0.2, 0.018], [Math.PI / 2, 0, 0]);
    // dirty plates
    for (let i = 0; i < 4; i++) P(g, G.cyl(), C(0xe8e0f0, 0.4), [0.45, 0.97 + i * 0.02, 0.05], [0.13, 0.01, 0.13]);
    return g;
  }
  function shelf() {
    const g = new THREE.Group();
    const wood = M.darkWood();
    for (const sx of [-1, 1]) P(g, G.box(), wood, [sx * 0.62, 1.0, 0], [0.05, 2.0, 0.5]);
    for (const y of [0.1, 0.65, 1.2, 1.75]) P(g, G.box(), wood, [0, y, 0], [1.28, 0.04, 0.5]);
    P(g, G.box(), wood, [0, 1.0, -0.24], [1.28, 2.0, 0.02]);
    return g;
  }
  // a station: the thing on a counter/shelf you pick food or supplies from
  function station(kind, isShelf) {
    const g = isShelf ? shelf() : counter();
    const disp = grp(g, [0, isShelf ? 1.22 : 0.955, 0]);
    const n = isShelf ? 3 : 2;
    for (const y of isShelf ? [0, 0.55, -0.55] : [0]) {
      for (let i = 0; i < n; i++) {
        const it = item(kind);
        it.position.set((i - (n - 1) / 2) * 0.36, y + 0.005, 0.02);
        it.scale.setScalar(1.3);
        disp.add(it);
      }
    }
    // a little glowing plate so it's easy to see
    if (!isShelf) P(g, G.cyl(), C(0xc8a24a, 0.3, 0.8), [0, 0.955, 0.02], [0.6, 0.004, 0.25]);
    return g;
  }

  // ---------- messes ----------
  function mess(kind) {
    const g = new THREE.Group();
    const pm = mats.puddle || (mats.puddle = new THREE.MeshStandardMaterial({ map: T.puddle(), transparent: true, roughness: 0.1, depthWrite: false, emissive: 0x1a3a00 }));
    const pd = P(g, G.plane(), pm, [0, 0.02, 0], [1.0, 1.0, 1], [-Math.PI / 2, 0, Math.random() * 3]);
    pd.renderOrder = 2;
    if (kind === 0) { // old bones
      for (let i = 0; i < 3; i++) { const b = item('bone'); b.position.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6); b.rotation.y = Math.random() * 3; g.add(b); }
    } else if (kind === 1) { // smelly socks
      for (let i = 0; i < 2; i++) {
        const s = grp(g, [(Math.random() - 0.5) * 0.5, 0.03, (Math.random() - 0.5) * 0.5], [0, Math.random() * 3, 0]);
        P(s, G.cap(0.04, 0.2), C(0x8a2a8a, 0.9), [0, 0, 0], 1, [Math.PI / 2, 0, 0]);
        P(s, G.cap(0.04, 0.1), C(0x8a2a8a, 0.9), [0, 0, 0.13], 1, [0, 0, 0]).position.y = 0.04;
      }
    } else { // fur balls & trash
      for (let i = 0; i < 4; i++) P(g, G.sphereLo(), std('furball', { map: T.fur('#6a5a4a'), roughness: 1 }), [(Math.random() - 0.5) * 0.7, 0.05, (Math.random() - 0.5) * 0.7], 0.06 + Math.random() * 0.04);
      P(g, G.cyl(), C(0x7a7a80, 0.4, 0.6), [0.2, 0.05, -0.1], [0.04, 0.12, 0.04], [Math.PI / 2, 0, 0.5]);
    }
    // stinky green fumes
    const fumes = grp(g);
    fumes.userData.dynamic = true;
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Sprite(glowMat(0x8aff3a)); s.material.opacity = 0.25; s.scale.set(0.4, 0.4, 1);
      s.position.set((Math.random() - 0.5) * 0.4, 0.3 + i * 0.3, (Math.random() - 0.5) * 0.4); s.userData.off = i;
      fumes.add(s);
    }
    g.userData.fumes = fumes;
    return g;
  }

  // ---------- grand staircase ----------
  function staircase(w, d, topY) {
    const g = new THREE.Group();
    // steps go UP toward -z (the back wall)
    const steps = 14;
    const marble = C(0x3a2a4a, 0.3, 0.1);
    const carpetM = std('carpetM', { map: T.carpet(), roughness: 0.9 });
    for (let i = 0; i < steps; i++) {
      const y = (i + 1) * topY / steps, z = d / 2 - (i + 0.5) * d / steps;
      P(g, G.box(), marble, [0, y / 2, z], [w, y, d / steps + 0.002]);
      P(g, G.box(), carpetM, [0, y + 0.006, z], [w * 0.55, 0.012, d / steps + 0.004]);
      P(g, G.box(), M.gold(), [0, y + 0.01, z + d / steps / 2 - 0.02], [w * 0.55, 0.012, 0.02]);
    }
    // banisters
    const railM = M.darkWood();
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 0.08);
      const len = Math.hypot(d, topY);
      const ang = Math.atan2(topY, d);
      P(g, G.box(), railM, [x, topY / 2 + 0.95, 0], [0.1, 0.08, len], [ang, 0, 0]);
      for (let i = 0; i < steps; i += 1) {
        const y = (i + 1) * topY / steps, z = d / 2 - (i + 0.5) * d / steps;
        P(g, G.cylLo(), M.gold(), [x, y + 0.45, z], [0.022, 0.9, 0.022]);
      }
      // big post at the bottom with a glowing orb
      P(g, G.rbox(0.24, 1.3, 0.24, 0.04), railM, [x, 0.65, d / 2 - 0.05]);
      P(g, G.sphere(), M.gold(), [x, 1.36, d / 2 - 0.05], 0.1);
      const orb = P(g, G.sphere(), C(0x9aff9a, 0.1, 0, { emissive: 0x3aff6a, emissiveIntensity: 1.2 }), [x, 1.52, d / 2 - 0.05], 0.1);
      const gl = new THREE.Sprite(glowMat(0x6aff8a)); gl.scale.set(0.9, 0.9, 1); gl.position.copy(orb.position); gl.material.opacity = 0.5; g.add(gl);
      // side wall of the stairs
      P(g, G.box(), marble, [x + sx * 0.06, topY / 2, 0], [0.04, topY, d]);
    }
    return g;
  }
  function balcony(w, depth, y) {
    const g = new THREE.Group();
    const wood = M.darkWood();
    P(g, G.box(), C(0x3a2a4a, 0.4), [0, y - 0.15, 0], [w, 0.3, depth]);
    P(g, G.box(), M.gold(), [0, y - 0.3, depth / 2], [w, 0.04, 0.03]);
    // railing
    P(g, G.box(), wood, [0, y + 0.95, depth / 2 - 0.05], [w, 0.08, 0.1]);
    for (let x = -w / 2 + 0.1; x <= w / 2; x += 0.22) P(g, G.cylLo(), M.gold(), [x, y + 0.47, depth / 2 - 0.05], [0.02, 0.9, 0.02]);
    // curly supports
    for (let x = -w / 2 + 0.6; x < w / 2; x += 2.2) P(g, G.cone(), C(0x3a2a4a, 0.4), [x, y - 0.6, depth / 2 - 0.3], [0.2, 0.7, 0.2], [Math.PI, 0, 0]);
    return g;
  }

  return {
    M, C, G, P, grp, lathe, std, glowMat, roundedBox,
    vampire, werewolf, mummy, ghost, frankie, blob, human, monster, animate, setMood, animateFace,
    item, viewModel, candle, sconce, candelabra, chandelier,
    frontDesk, keyRack, fireplace, sofa, roundTable, armchair, plant, armor, grandClock, portraitFrame,
    coffinBed, nightstand, wardrobe, rug, roomDoor, frontDoors, curtains, windowPanes,
    counter, cauldron, sink, shelf, station, mess, staircase, balcony, blobShadow,
  };
})();
