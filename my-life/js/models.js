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
  //  PEOPLE
  // ============================================================
  // body sizes for each age
  const BODY = {
    baby: { leg: 0.17, legR: 0.05, torso: 0.21, tw: 0.25, td: 0.2, arm: 0.17, armR: 0.038, head: 0.155, neck: 0.0, foot: 0.6 },
    kid: { leg: 0.44, legR: 0.052, torso: 0.33, tw: 0.27, td: 0.17, arm: 0.34, armR: 0.04, head: 0.165, neck: 0.04, foot: 0.75 },
    teen: { leg: 0.68, legR: 0.06, torso: 0.44, tw: 0.32, td: 0.19, arm: 0.47, armR: 0.045, head: 0.172, neck: 0.06, foot: 0.92 },
    adult: { leg: 0.78, legR: 0.065, torso: 0.5, tw: 0.37, td: 0.22, arm: 0.53, armR: 0.05, head: 0.178, neck: 0.07, foot: 1 },
    old: { leg: 0.74, legR: 0.062, torso: 0.48, tw: 0.37, td: 0.23, arm: 0.5, armR: 0.048, head: 0.176, neck: 0.06, foot: 1 },
  };
  const LONG_SLEEVES = { hoodie: 1, suit: 1, coat: 1, uniform: 1, chef: 1, sweater: 1 };

  function hand(parent, pos, s, mat) {
    const h = grp(parent, pos);
    P(h, G.sphere(), mat, [0, 0, 0], [s, s * 1.1, s * 0.75]);
    P(h, G.cap(s * 0.3, s * 0.45), mat, [s * 0.7, s * 0.1, s * 0.3], 1, [0, 0, 0.9]);
    return h;
  }

  // look = { skin, hair, hairStyle, eyes, top, shirt, pants, shoes, extra, bag }
  function person(look, stage = 'adult') {
    const L = Object.assign({ skin: 0xf0c09a, hair: 0x3a2414, hairStyle: 'short', eyes: 0x4a7ac8, top: 'tshirt', shirt: 0x3a8ae8, pants: 0x2a3a5a, shoes: 0xf4f4f4, extra: 'none' }, look);
    const b = BODY[stage] || BODY.adult;
    const baby = stage === 'baby', old = stage === 'old';
    const skin = C(L.skin, 0.6);
    const hairColor = old ? (L.hairStyle === 'bald' ? L.hair : 0xdcdcdc) : L.hair;
    const hairM = C(hairColor, 0.7);
    const shirtM = C(L.shirt, 0.75);
    const pantsM = C(L.pants, 0.8);
    const shoeM = C(L.shoes, 0.55);
    const top = baby ? 'onesie' : L.top;
    const footH = 0.06 * b.foot;
    const hipY = b.leg + footH;

    const root = new THREE.Group();
    const hips = grp(root, [0, hipY, 0]);
    const torso = grp(hips);
    const head = grp(torso, [0, b.torso + b.neck, 0]);
    const armL = grp(torso, [b.tw / 2 + b.armR * 0.9, b.torso * 0.88, 0]);
    const armR = grp(torso, [-(b.tw / 2 + b.armR * 0.9), b.torso * 0.88, 0]);
    const legL = grp(hips, [b.tw * 0.26, 0, 0]);
    const legR = grp(hips, [-b.tw * 0.26, 0, 0]);
    const R = { hips, torso, head, armL, armR, legL, legR, hipY, b };
    root.userData = { rig: R, face: { eyes: [], brows: [], mouth: null }, blinkOff: Math.random() * 5, kind: 'person', stage, look: L };

    // ---- legs (thigh + knee + shin + shoe) ----
    const legMat = (top === 'dress') ? skin : (top === 'onesie' ? shirtM : pantsM);
    const half = b.leg / 2;
    for (const [leg, side] of [[legL, 'L'], [legR, 'R']]) {
      P(leg, G.cap(b.legR * 1.05, half - b.legR), legMat, [0, -half / 2, 0]);
      const knee = grp(leg, [0, -half, 0]);
      P(knee, G.cap(b.legR, half - b.legR), legMat, [0, -half / 2, 0]);
      if (baby) P(knee, G.sphere(), shirtM, [0, -half - footH * 0.2, 0.03], [b.legR * 1.2, footH * 0.9, b.legR * 1.7]);
      else P(knee, G.rbox(b.legR * 2.3, footH * 1.4, b.legR * 4.2, footH * 0.6), shoeM, [0, -half - footH * 0.25, b.legR * 0.9]);
      R['knee' + side] = knee;
    }
    // ---- body ----
    const tr = Math.min(b.tw, b.td) * 0.35;
    if (top === 'onesie') {
      P(torso, G.rbox(b.tw, b.torso * 1.15, b.td, tr * 1.3), shirtM, [0, b.torso * 0.48, 0]);
      P(hips, G.sphere(), M.white(), [0, 0.0, 0], [b.tw * 0.55, b.torso * 0.32, b.td * 0.58]); // diaper
      P(torso, G.sphere(), C(0xffe070, 0.6), [0, b.torso * 0.62, b.td * 0.5], [0.025, 0.025, 0.01]); // button
    } else {
      const bodyM = (top === 'coat' || top === 'chef') ? M.white() : shirtM;
      P(torso, G.rbox(b.tw, b.torso * 1.08, b.td, tr), bodyM, [0, b.torso * 0.5, 0]);
      // belt / waist
      if (top !== 'dress') P(hips, G.rbox(b.tw * 0.98, b.torso * 0.22, b.td * 0.98, tr * 0.8), pantsM, [0, 0, 0]);
      if (top === 'dress') P(hips, G.skirt(), shirtM, [0, -b.leg * 0.2, 0], [b.tw * 0.62, b.leg * 0.5, b.td * 0.75]);
      if (top === 'hoodie') {
        P(torso, G.torus(), shirtM, [0, b.torso * 1.0, -b.td * 0.2], [b.tw * 0.32, b.tw * 0.32, b.tw * 0.5], [Math.PI / 2 - 0.3, 0, 0]);
        P(torso, G.rbox(b.tw * 0.6, b.torso * 0.25, 0.03, 0.012), C(T.shade(L.shirt, -0.2), 0.8), [0, b.torso * 0.25, b.td * 0.5]);
      }
      if (top === 'suit') {
        P(torso, G.box(), M.white(), [0, b.torso * 0.68, b.td * 0.5], [b.tw * 0.3, b.torso * 0.62, 0.01]);
        P(torso, G.box(), C(0xc8202a, 0.6), [0, b.torso * 0.62, b.td * 0.52], [b.tw * 0.1, b.torso * 0.5, 0.012]);
      }
      if (top === 'coat') {
        P(torso, G.box(), shirtM, [0, b.torso * 0.7, b.td * 0.5], [b.tw * 0.28, b.torso * 0.55, 0.01]);
        P(hips, G.skirt(), M.white(), [0, -b.leg * 0.22, 0], [b.tw * 0.62, b.leg * 0.45, b.td * 0.72]);
        P(torso, G.cap(0.008, 0.12), M.metal(), [-b.tw * 0.22, b.torso * 0.75, b.td * 0.5], 1, [0, 0, 0.3]); // pen
      }
      if (top === 'uniform') {
        P(torso, G.cylLo(), M.gold(), [b.tw * 0.22, b.torso * 0.75, b.td * 0.5], [0.03, 0.01, 0.03], [Math.PI / 2, 0, 0]); // badge
        P(hips, G.rbox(b.tw * 1.02, 0.05, b.td * 1.02, 0.02), M.black(), [0, 0.03, 0]);
      }
      if (top === 'chef') for (let i = 0; i < 3; i++) P(torso, G.sphereLo(), M.black(), [b.tw * 0.15, b.torso * (0.4 + i * 0.2), b.td * 0.5], 0.014);
      if (top === 'sweater') P(torso, G.box(), C(T.shade(L.shirt, 0.3), 0.8), [0, b.torso * 0.5, b.td * 0.5], [b.tw * 0.9, 0.04, 0.01]);
      if (top === 'tshirt' && stage !== 'old') P(torso, G.sphereLo(), C(T.shade(L.shirt, 0.45), 0.7), [0, b.torso * 0.62, b.td * 0.5], [b.tw * 0.16, b.tw * 0.16, 0.01]); // logo
    }
    // ---- arms ----
    const longSl = LONG_SLEEVES[top];
    const sleeveM = (top === 'coat' || top === 'chef') ? M.white() : shirtM;
    for (const [arm, side] of [[armL, 'L'], [armR, 'R']]) {
      P(arm, G.cap(b.armR * 1.15, b.arm * (longSl ? 0.82 : 0.32)), sleeveM, [0, -b.arm * (longSl ? 0.44 : 0.18), 0]);
      if (!longSl) P(arm, G.cap(b.armR, b.arm * 0.72), skin, [0, -b.arm * 0.52, 0]);
      const h = hand(arm, [0, -b.arm - b.armR * 0.4, 0], b.armR * 1.15, skin);
      R['hand' + side] = h;
    }
    // ---- head ----
    const hr = b.head;
    P(head, G.cylLo(), skin, [0, b.neck * 0.3, 0], [b.armR * 1.3, b.neck + 0.04, b.armR * 1.3]);
    const H = grp(head, [0, hr * 0.95, 0]);
    R.H = H; R.hr = hr;
    P(H, G.sphere(), skin, [0, 0, 0], [hr, hr * (baby ? 0.98 : 1.05), hr * 0.98]);
    for (const sx of [-1, 1]) P(H, G.sphere(), skin, [sx * hr * 0.98, -hr * 0.05, 0], [hr * 0.17, hr * 0.26, hr * 0.14]);
    P(H, G.sphere(), C(T.shade(L.skin, -0.06), 0.6), [0, -hr * 0.1, hr * 0.96], [hr * 0.14, hr * 0.13, hr * 0.13]);
    if (baby || stage === 'kid') for (const sx of [-1, 1]) P(H, G.sphereLo(), C(0xff8a8a, 0.8, 0, { transparent: true, opacity: 0.45 }), [sx * hr * 0.55, -hr * 0.22, hr * 0.78], [hr * 0.16, hr * 0.1, 0.01]);
    const f = root.userData.face;
    const er = hr * (baby ? 0.27 : stage === 'kid' ? 0.25 : 0.22);
    f.eyes.push(makeEye(H, [hr * 0.37, hr * 0.12, hr * 0.8], er, L.eyes, skin));
    f.eyes.push(makeEye(H, [-hr * 0.37, hr * 0.12, hr * 0.8], er, L.eyes, skin));
    for (const sx of [1, -1]) f.brows.push(makeBrow(H, [sx * hr * 0.37, hr * 0.42, hr * 0.88], hr * 0.24, hr * 0.055, C(old ? 0xe8e8e8 : T.shade(hairColor, -0.1), 0.7), sx));
    f.mouth = makeMouth(H, [0, -hr * 0.4, hr * 0.88], hr * 0.27);
    if (old) for (const sx of [-1, 1]) P(H, G.cap(0.004, hr * 0.12), C(T.shade(L.skin, -0.18), 0.7), [sx * hr * 0.62, hr * 0.12, hr * 0.74], 1, [0, 0, 0.4 * sx]); // wrinkles

    // ---- hair ----
    if (baby) {
      P(H, G.sphereLo(), hairM, [0, hr * 0.98, hr * 0.15], [hr * 0.12, hr * 0.1, hr * 0.12]);
      P(H, G.torus(), hairM, [0, hr * 1.05, hr * 0.22], hr * 0.1, [0, Math.PI / 2, 0]);
    } else hair(H, hr, L.hairStyle, hairM, old);
    // ---- extras ----
    const ex = L.extra;
    if (ex === 'glasses' || ex === 'sunglasses' || (old && ex === 'none' && L.hairStyle !== 'long')) {
      const frame = ex === 'sunglasses' ? M.black() : C(0x2a2a30, 0.4);
      for (const sx of [-1, 1]) {
        P(H, G.ring(), frame, [sx * hr * 0.37, hr * 0.12, hr * 0.98], [er * 1.35, er * 1.35, er * 1.35]);
        if (ex === 'sunglasses') P(H, G.cylLo(), C(0x101018, 0.1, 0.5), [sx * hr * 0.37, hr * 0.12, hr * 0.98], [er * 1.3, 0.005, er * 1.3], [Math.PI / 2, 0, 0]);
      }
      P(H, G.box(), frame, [0, hr * 0.14, hr * 1.0], [hr * 0.22, 0.008, 0.008]);
    }
    if (ex === 'cap') {
      P(H, G.hemi(), shirtM, [0, hr * 0.15, 0], [hr * 1.06, hr * 0.8, hr * 1.06], [-0.1, 0, 0]);
      P(H, G.cylLo(), shirtM, [0, hr * 0.2, hr * 0.9], [hr * 0.7, 0.012, hr * 0.55]);
    }
    if (ex === 'bow') {
      for (const sx of [-1, 1]) P(H, G.cone(), C(0xff4a8a, 0.6), [sx * hr * 0.2 + hr * 0.5, hr * 0.85, 0], [hr * 0.18, hr * 0.32, hr * 0.12], [0, 0, sx * Math.PI / 2]);
      P(H, G.sphereLo(), C(0xff4a8a, 0.6), [hr * 0.5, hr * 0.85, 0], hr * 0.08);
    }
    if (ex === 'headband') P(H, G.torus(), C(0xff3a3a, 0.6), [0, hr * 0.45, 0], [hr * 0.92, hr * 0.92, hr * 0.6], [Math.PI / 2 + 0.2, 0, 0]);
    if (ex === 'mustache' || ex === 'beard') {
      for (const sx of [-1, 1]) P(H, G.cap(hr * 0.06, hr * 0.2), C(hairColor, 0.8), [sx * hr * 0.14, -hr * 0.26, hr * 0.96], 1, [0, 0, sx * 1.2]);
      if (ex === 'beard') P(H, G.sphere(), C(hairColor, 0.8), [0, -hr * 0.62, hr * 0.55], [hr * 0.55, hr * 0.42, hr * 0.42]);
    }
    if (ex === 'copHat') {
      P(H, G.cyl(), C(0x1a2a5a, 0.6), [0, hr * 0.85, 0], [hr * 1.02, hr * 0.35, hr * 1.02]);
      P(H, G.cylLo(), M.black(), [0, hr * 0.68, hr * 0.5], [hr * 0.7, 0.012, hr * 0.6]);
      P(H, G.cylLo(), M.gold(), [0, hr * 0.85, hr * 1.0], [hr * 0.14, 0.01, hr * 0.14], [Math.PI / 2, 0, 0]);
    }
    if (ex === 'chefHat') {
      P(H, G.cyl(), M.white(), [0, hr * 1.1, 0], [hr * 0.85, hr * 0.6, hr * 0.85]);
      P(H, G.sphere(), M.white(), [0, hr * 1.55, 0], [hr * 1.05, hr * 0.5, hr * 1.05]);
    }
    if (ex === 'crown') {
      P(H, G.cyl(), M.gold(), [0, hr * 1.0, 0], [hr * 0.75, hr * 0.25, hr * 0.75]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P(H, G.cone(), M.gold(), [Math.cos(a) * hr * 0.7, hr * 1.25, Math.sin(a) * hr * 0.7], [hr * 0.12, hr * 0.25, hr * 0.12]); }
    }
    if (L.bag) {
      P(armL, G.rbox(0.2, 0.16, 0.08, 0.03), C(L.bag, 0.6), [0.04, -b.arm * 0.95, 0]);
      P(armL, G.torus(), C(L.bag, 0.6), [0.04, -b.arm * 0.82, 0], [0.06, 0.06, 0.06]);
    }
    if (old && L.cane) {
      R.cane = P(armR, G.cap(0.012, b.leg * 1.05), M.darkWood(), [0, -b.arm - b.leg * 0.5, 0.05]);
    }
    const height = hipY + b.torso + b.neck + hr * 2;
    bake(root);
    blobShadow(root, b.tw * 0.85);
    root.userData.height = height;
    return root;
  }

  function hair(H, hr, style, m, old) {
    const cover = () => P(H, G.hemi(), m, [0, hr * 0.02, -hr * 0.03], [hr * 1.07, hr * 1.02, hr * 1.08], [-0.32, 0, 0]);
    if (style === 'bald') {
      if (old) for (const sx of [-1, 1]) P(H, G.sphere(), m, [sx * hr * 0.85, hr * 0.05, -hr * 0.25], [hr * 0.25, hr * 0.35, hr * 0.55]);
      return;
    }
    if (style === 'short') {
      cover();
      P(H, G.rbox(hr * 1.2, hr * 0.28, hr * 0.4, hr * 0.12), m, [0, hr * 0.7, hr * 0.55], 1, [0.45, 0, 0]);
    } else if (style === 'spiky') {
      cover();
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        P(H, G.cone(), m, [Math.cos(a) * hr * 0.45, hr * 0.85, Math.sin(a) * hr * 0.45 - hr * 0.05], [hr * 0.22, hr * 0.5, hr * 0.22], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]);
      }
      P(H, G.cone(), m, [0, hr * 1.1, 0], [hr * 0.22, hr * 0.5, hr * 0.22]);
    } else if (style === 'long') {
      cover();
      P(H, G.rbox(hr * 2.0, hr * 2.0, hr * 0.5, hr * 0.24), m, [0, -hr * 0.55, -hr * 0.62]);
      for (const sx of [-1, 1]) P(H, G.cap(hr * 0.24, hr * 1.1), m, [sx * hr * 0.9, -hr * 0.5, -hr * 0.05]);
      P(H, G.rbox(hr * 1.3, hr * 0.3, hr * 0.4, hr * 0.14), m, [0, hr * 0.72, hr * 0.5], 1, [0.5, 0, 0]);
    } else if (style === 'ponytail') {
      cover();
      P(H, G.sphere(), m, [0, hr * 0.35, -hr * 1.05], hr * 0.25);
      P(H, G.cap(hr * 0.2, hr * 0.8), m, [0, -hr * 0.2, -hr * 1.15], 1, [0.2, 0, 0]);
    } else if (style === 'curly') {
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2, ring = i % 2;
        P(H, G.sphereLo(), m, [Math.cos(a) * hr * (0.85 - ring * 0.25), hr * (0.35 + ring * 0.45), Math.sin(a) * hr * (0.85 - ring * 0.25) - hr * 0.1], hr * 0.34);
      }
      P(H, G.sphere(), m, [0, hr * 0.85, -hr * 0.1], hr * 0.5);
    } else if (style === 'bun') {
      cover();
      P(H, G.sphere(), m, [0, hr * 1.1, -hr * 0.2], hr * 0.38);
    } else if (style === 'mohawk') {
      for (let i = 0; i < 6; i++) P(H, G.cone(), m, [0, hr * (0.95 - Math.abs(i - 2.5) * 0.05), hr * (0.6 - i * 0.28)], [hr * 0.1, hr * 0.5, hr * 0.26]);
    } else if (style === 'afro') {
      P(H, G.sphere(), m, [0, hr * 0.45, -hr * 0.15], [hr * 1.45, hr * 1.25, hr * 1.35]);
    } else cover();
  }

  // ---------- personality decorations: halo + sparkles, storm cloud, propeller hat ----------
  function setPersona(ch, persona) {
    const R = ch.userData.rig;
    if (!R) return;
    if (R.personaFx) { R.H.remove(R.personaFx); R.personaFx = null; }
    const f = ch.userData.face;
    f.browBias = 0; f.moodBias = 0;
    ch.userData.persona = persona;
    if (!persona) return;
    const hr = R.hr;
    const fx = grp(R.H, [0, hr * 1.55, 0]);
    R.personaFx = fx;
    if (persona === 'good') {
      f.moodBias = 0.25;
      const halo = P(fx, G.ring(), E(0xffd84a, 1.2), [0, 0.03, 0], [hr * 0.7, hr * 0.7, hr * 1.4], [Math.PI / 2, 0, 0]);
      halo.castShadow = false;
      fx.userData.sparkles = [0, 1, 2].map(() => sprite(fx, 0xfff0a0, hr * 0.5, [0, 0, 0]));
    } else if (persona === 'evil') {
      f.browBias = 1;
      const cloud = grp(fx, [0, hr * 0.6, 0]);
      for (let i = 0; i < 6; i++) { const m = P(cloud, G.sphereLo(), C(0x3a3448, 0.9), [(i - 2.5) * hr * 0.28, Math.sin(i * 2) * hr * 0.12, Math.cos(i * 3) * hr * 0.15], hr * (0.3 + (i % 2) * 0.1)); m.castShadow = false; }
      fx.userData.cloud = cloud;
      fx.userData.bolt = P(cloud, G.cone(), B(0xc89aff), [0, -hr * 0.4, 0], [hr * 0.08, hr * 0.45, hr * 0.08], [Math.PI, 0, 0.3]);
      fx.userData.bolt.visible = false;
    } else if (persona === 'funny') {
      f.moodBias = 0.45;
      P(fx, G.hemi(), C(0xff4a4a, 0.6), [0, -hr * 0.5, 0], [hr * 0.55, hr * 0.4, hr * 0.55]);
      P(fx, G.cylLo(), M.metal(), [0, -hr * 0.1, 0], [0.008, hr * 0.25, 0.008]);
      const prop = grp(fx, [0, 0.02, 0]);
      P(prop, G.rbox(hr * 1.1, 0.008, hr * 0.18, 0.004), C(0x3ac8ff, 0.5), [0, 0, 0]);
      P(prop, G.rbox(hr * 0.18, 0.008, hr * 1.1, 0.004), C(0xffd84a, 0.5), [0, 0.002, 0]);
      fx.userData.prop = prop;
    }
  }
  function animatePersona(ch, t) {
    const R = ch.userData.rig;
    const fx = R && R.personaFx;
    if (!fx) return;
    const u = fx.userData;
    if (u.sparkles) u.sparkles.forEach((s, i) => { const a = t * 1.6 + i * 2.1; s.position.set(Math.cos(a) * R.hr * 1.1, Math.sin(t * 3 + i) * R.hr * 0.3 - R.hr * 0.4, Math.sin(a) * R.hr * 1.1); s.scale.setScalar(R.hr * (0.35 + Math.sin(t * 5 + i) * 0.15)); });
    if (u.cloud) { u.cloud.position.x = Math.sin(t * 0.8) * R.hr * 0.2; u.bolt.visible = (t % 2.7) < 0.12; }
    if (u.prop) u.prop.rotation.y = t * 14;
  }

  // ============================================================
  //  PERSON ANIMATION
  //  s = { speed, pose, pt (time in pose), mood, talk, sleepy }
  // ============================================================
  const tmp = {};
  function approach(obj, prop, target, k) { obj[prop] += (target - obj[prop]) * k; }
  function animatePerson(ch, dt, s) {
    const R = ch.userData.rig, b = R.b;
    const ud = ch.userData;
    ud.t = (ud.t || 0) + dt;
    const t = ud.t;
    const moving = s.speed > 0.05;
    ud.phase = (ud.phase || 0) + dt * (moving ? 3 + s.speed * 5 / Math.max(0.5, b.leg * 1.6) : 0);
    const ph = ud.phase;
    const pose = s.pose || 'stand', pt = s.pt || 0;
    const old = ud.stage === 'old';
    // targets
    const o = tmp;
    o.hipY = R.hipY; o.hipRX = 0; o.hipRZ = 0; o.torRX = old ? 0.16 : 0; o.torRZ = 0; o.headRX = old ? -0.12 : 0; o.headRZ = Math.sin(t * 1.3) * 0.04; o.headRY = 0;
    o.aLX = 0; o.aLZ = 0.1; o.aRX = 0; o.aRZ = -0.1; o.lLX = 0; o.lRX = 0; o.kL = 0; o.kR = 0; o.lLZ = 0; o.lRZ = 0;
    let mood = s.mood || 0, open = s.talk ? 0.35 + Math.sin(t * 18) * 0.35 : 0, sleepy = s.sleepy || 0;
    const breathe = Math.sin(t * 2) * 0.006;
    const sitHip = b.leg * 0.52 + 0.02;

    switch (pose) {
      case 'sit': case 'type': case 'drive': case 'swing': case 'read': case 'eat': case 'babysit': case 'phone': case 'sitTalk': {
        if (pose === 'babysit' || (ud.stage === 'baby' && pose !== 'drive')) {
          o.hipY = b.legR * 1.6; o.lLX = o.lRX = -1.45; o.lLZ = 0.25; o.lRZ = -0.25;
          o.aLX = -0.6 + Math.sin(t * 4) * 0.25; o.aRX = -0.6 - Math.sin(t * 4) * 0.25;
        } else { o.hipY = sitHip; o.lLX = o.lRX = -1.5; o.kL = o.kR = 1.5; o.aLX = o.aRX = -0.5; }
        if (pose === 'type') { o.aLX = -1.25 + Math.sin(t * 20) * 0.05; o.aRX = -1.25 + Math.cos(t * 19) * 0.05; o.aLZ = -0.2; o.aRZ = 0.2; o.headRX = 0.1; }
        if (pose === 'drive') { o.aLX = o.aRX = -1.3; o.aLZ = -0.25; o.aRZ = 0.25; o.headRZ = Math.sin(t * 2) * 0.06; }
        if (pose === 'swing') { o.torRX = Math.sin(t * 3) * 0.25; o.aLX = o.aRX = -2.6; }
        if (pose === 'read') { o.aLX = o.aRX = -1.15; o.aLZ = -0.35; o.aRZ = 0.35; o.headRX = 0.35; }
        if (pose === 'eat') { o.aRX = -2.05 + Math.sin(t * 9) * 0.25; o.aRZ = 0.45; open = 0.2 + Math.max(0, Math.sin(t * 9)) * 0.6; mood = Math.max(mood, 0.6); }
        if (pose === 'phone') { o.aRX = -1.5; o.aRZ = 0.35; o.headRX = 0.35; }
        if (pose === 'sitTalk') { o.aRX = -0.9 + Math.sin(t * 3) * 0.3; open = 0.35 + Math.sin(t * 18) * 0.35; }
        break;
      }
      case 'eatStand': o.aRX = -2.05 + Math.sin(t * 9) * 0.25; o.aRZ = 0.45; open = 0.2 + Math.max(0, Math.sin(t * 9)) * 0.6; mood = Math.max(mood, 0.6); break;
      case 'crawl': {
        o.hipY = b.leg * 0.55; o.hipRX = 1.35; o.headRX = -1.1;
        const c = moving ? Math.sin(ph) * 0.35 : 0;
        o.aLX = -1.35 + c; o.aRX = -1.35 - c; o.lLX = -1.4 - c; o.lRX = -1.4 + c; o.kL = o.kR = 1.55;
        break;
      }
      case 'lie': case 'sleep': case 'fall': case 'dead':
        o.hipY = b.td * 0.55; o.hipRX = -1.5; o.headRX = 0.1; o.aLZ = 0.25; o.aRZ = -0.25;
        if (pose === 'sleep' || pose === 'dead') sleepy = 1;
        if (pose === 'fall') { mood = -0.5; open = 0.6; o.aLZ = 1.0; o.aRZ = -1.0; o.lLZ = 0.3; o.lRZ = -0.3; }
        break;
      case 'dance': {
        const k = Math.sin(t * 7);
        o.hipY = R.hipY - Math.abs(k) * b.leg * 0.08; o.hipRZ = k * 0.12; o.torRZ = -k * 0.15;
        o.aLX = -2.6 + Math.sin(t * 7) * 0.4; o.aRX = -2.6 - Math.sin(t * 7) * 0.4; o.aLZ = 0.4; o.aRZ = -0.4;
        o.lLX = Math.max(0, k) * -0.5; o.lRX = Math.max(0, -k) * -0.5; o.kL = Math.max(0, k) * 0.8; o.kR = Math.max(0, -k) * 0.8;
        o.headRZ = k * 0.2; mood = 1; open = 0.4;
        break;
      }
      case 'silly': { // funny wiggle dance
        const k = Math.sin(t * 12);
        o.hipRZ = k * 0.2; o.torRZ = -k * 0.3; o.headRZ = k * 0.35; o.aLZ = 1.4 + k * 0.4; o.aRZ = -1.4 + k * 0.4; o.lLZ = 0.2; o.lRZ = -0.2;
        mood = 1; open = 0.7;
        break;
      }
      case 'wave': o.aRX = -2.8; o.aRZ = -0.35 + Math.sin(t * 10) * 0.45; mood = Math.max(mood, 0.7); break;
      case 'cry': o.aLX = o.aRX = -2.35; o.aLZ = -0.5; o.aRZ = 0.5; o.headRX = 0.4; o.torRX += Math.abs(Math.sin(t * 8)) * 0.05; mood = -1; open = 0.4 + Math.sin(t * 9) * 0.2; break;
      case 'sad': o.headRX = 0.45; o.torRX += 0.12; o.aLZ = 0.03; o.aRZ = -0.03; mood = -0.8; break;
      case 'cheer': {
        const j = Math.abs(Math.sin(t * 7));
        o.hipY = R.hipY + j * b.leg * 0.18; o.aLX = o.aRX = -2.9; o.aLZ = 0.45 + j * 0.2; o.aRZ = -0.45 - j * 0.2; mood = 1; open = 0.8;
        break;
      }
      case 'hug': o.aLX = o.aRX = -1.5; o.aLZ = -0.55; o.aRZ = 0.55; o.torRX += 0.12; mood = 1; break;
      case 'laugh': o.torRX = -0.25 + Math.sin(t * 16) * 0.06; o.headRX = -0.3; o.aLX = o.aRX = -0.7; o.aLZ = -0.45; o.aRZ = 0.45; mood = 1; open = 0.6 + Math.sin(t * 16) * 0.3; break;
      case 'angry': o.aLX = -2.3 + Math.sin(t * 16) * 0.2; o.aRX = -2.3 + Math.cos(t * 16) * 0.2; o.aLZ = 0.3; o.aRZ = -0.3; mood = -1; open = 0.35; break;
      case 'evilLaugh': o.torRX = -0.2; o.headRX = -0.35; o.aLX = o.aRX = -1.2; o.aLZ = -0.25; o.aRZ = 0.25; o.aLX += Math.sin(t * 20) * 0.08; mood = 0.8; open = 0.6 + Math.sin(t * 14) * 0.3; break;
      case 'scared': o.aLX = -2.6 + Math.sin(t * 22) * 0.2; o.aRX = -2.6 + Math.cos(t * 24) * 0.2; o.aLZ = 0.5; o.aRZ = -0.5; o.torRX = -0.15; mood = -0.6; open = 0.9; break;
      case 'point': o.aRX = -1.6; o.aRZ = 0.1; break;
      case 'think': o.aRX = -2.25; o.aRZ = 0.55; o.headRZ = 0.15; o.headRX = -0.1; break;
      case 'flex': { const k = Math.sin(t * 5) * 0.15; o.aLZ = 1.5 + k; o.aRZ = -1.5 - k; o.aLX = o.aRX = -0.2; mood = 1; break; }
      case 'facepalm': o.aRX = -2.55; o.aRZ = 0.5; o.headRX = 0.3; mood = -0.4; break;
      case 'clap': o.aLX = o.aRX = -1.35; o.aLZ = -0.3 - Math.max(0, Math.sin(t * 16)) * 0.2; o.aRZ = 0.3 + Math.max(0, Math.sin(t * 16)) * 0.2; mood = 1; open = 0.3; break;
      case 'sneak': o.hipY = R.hipY * 0.85; o.lLX = o.lRX = -0.4; o.kL = o.kR = 0.8; o.torRX = 0.45; o.aLX = o.aRX = -0.7; o.headRX = -0.3; break;
      case 'shrug': o.aLZ = 0.55; o.aRZ = -0.55; o.aLX = o.aRX = -0.5; o.headRZ = 0.2; mood = 0; break;
      case 'kneel': o.hipY = b.leg * 0.55 + 0.04; o.lLX = -1.5; o.kL = 1.5; o.lRX = 0; o.kR = 1.57; o.aLX = o.aRX = -0.6; break;
      case 'bow': o.torRX = 0.7; o.headRX = 0.2; break;
      case 'kick': o.lRX = pt < 0.25 ? 0.6 : pt < 0.55 ? -1.4 : -0.2; o.aLZ = 0.6; o.aRZ = -0.6; break;
      case 'throw': o.aRX = pt < 0.3 ? 1.1 : pt < 0.6 ? -2.0 : -0.6; o.torRX = pt < 0.3 ? -0.15 : 0.15; break;
      case 'give': o.aRX = -1.4; o.aRZ = 0.1; mood = Math.max(mood, 0.6); break;
      case 'hold': o.aRX = -0.9; o.aLX = -0.9; o.aLZ = -0.3; o.aRZ = 0.3; break;
      case 'sing': o.aLX = o.aRX = -1.0; o.aLZ = 0.7; o.aRZ = -0.7; o.headRX = -0.2; mood = 1; open = 0.4 + Math.abs(Math.sin(t * 5)) * 0.5; break;
      case 'yell': o.aLX = o.aRX = -0.4; o.aLZ = 0.4; o.aRZ = -0.4; o.torRX = -0.1; mood = -0.7; open = 1; break;
      case 'cook': o.aRX = -1.2 + Math.sin(t * 8) * 0.12; o.aRZ = 0.3 + Math.cos(t * 8) * 0.15; o.aLX = -1.0; o.headRX = 0.25; break;
      case 'sweep': o.aLX = o.aRX = -0.9 + Math.sin(t * 6) * 0.3; o.aLZ = -0.4; o.aRZ = 0.4; o.torRX = 0.2; break;
      case 'stretch': o.aLX = o.aRX = -3.0; o.aLZ = 0.2; o.aRZ = -0.2; o.torRX = -0.1; open = 0.7; sleepy = 0.5; break;
      case 'surprised': o.aLX = o.aRX = -0.6; o.aLZ = 0.7; o.aRZ = -0.7; o.torRX = -0.1; mood = 0.3; open = 0.95; break;
      case 'smug': o.aLX = o.aRX = 0.2; o.aLZ = -0.3; o.aRZ = 0.3; o.headRX = -0.15; mood = 0.5; break;
      case 'film': o.aRX = -1.6; o.aRZ = 0.15; o.aLX = -1.0; open = 0.35 + Math.sin(t * 18) * 0.3; mood = 1; break;
      case 'shake': o.aRX = -1.3; o.aRZ = 0.25 + Math.sin(t * 14) * 0.06; mood = Math.max(mood, 0.5); break;
      default: break; // stand
    }
    // walking overrides the legs & arms
    if (moving && pose !== 'crawl' && pose !== 'drive') {
      const k = U.clamp(s.speed / 1.3, 0, 1.6);
      const sw = Math.sin(ph) * 0.65 * Math.min(1.1, k);
      o.lLX = sw; o.lRX = -sw; o.kL = Math.max(0, -Math.sin(ph)) * 0.8 * k; o.kR = Math.max(0, Math.sin(ph)) * 0.8 * k;
      if (pose === 'stand' || pose === 'sad' || pose === 'sneak') { o.aLX = -sw * 0.9; o.aRX = sw * 0.9; }
      o.hipY = (pose === 'sneak' ? R.hipY * 0.85 : R.hipY) + Math.abs(Math.cos(ph)) * 0.035 * k;
      o.torRX += 0.04 * k;
      o.hipRX = 0;
    }
    const k = Math.min(1, dt * 12);
    approach(R.hips.position, 'y', o.hipY + breathe, k);
    approach(R.hips.rotation, 'x', o.hipRX, k); approach(R.hips.rotation, 'z', o.hipRZ, k);
    approach(R.torso.rotation, 'x', o.torRX, k); approach(R.torso.rotation, 'z', o.torRZ, k);
    approach(R.head.rotation, 'x', o.headRX, k); approach(R.head.rotation, 'z', o.headRZ, k); approach(R.head.rotation, 'y', o.headRY, k);
    approach(R.armL.rotation, 'x', o.aLX, k); approach(R.armL.rotation, 'z', o.aLZ, k);
    approach(R.armR.rotation, 'x', o.aRX, k); approach(R.armR.rotation, 'z', o.aRZ, k);
    approach(R.legL.rotation, 'x', o.lLX, k); approach(R.legR.rotation, 'x', o.lRX, k);
    approach(R.legL.rotation, 'z', o.lLZ, k); approach(R.legR.rotation, 'z', o.lRZ, k);
    approach(R.kneeL.rotation, 'x', o.kL, k); approach(R.kneeR.rotation, 'x', o.kR, k);
    setMood(ch, mood, open);
    animateFace(ch, t, dt, sleepy);
    animatePersona(ch, t);
  }

  // ============================================================
  //  PETS 🐶 🐱 🦜
  // ============================================================
  function pet(kind, color = 0xc8904a) {
    const root = new THREE.Group();
    const fur = C(color, 0.85);
    const fur2 = C(T.shade(color, 0.35), 0.85);
    const R = { legs: [], kind };
    root.userData = { rig: R, kind: 'pet', petKind: kind, face: { eyes: [], brows: [], mouth: null }, blinkOff: Math.random() * 4 };
    if (kind === 'parrot') {
      const body = grp(root, [0, 0.22, 0]);
      R.body = body;
      P(body, G.sphere(), fur, [0, 0, 0], [0.09, 0.13, 0.09], [0.3, 0, 0]);
      P(body, G.sphere(), fur2, [0, -0.02, 0.05], [0.06, 0.09, 0.05]);
      const head = grp(body, [0, 0.13, 0.03]); R.head = head;
      P(head, G.sphere(), fur, [0, 0, 0], 0.075);
      P(head, G.cone(), C(0xf2c84a, 0.4), [0, -0.01, 0.08], [0.025, 0.06, 0.025], [Math.PI / 2 + 0.4, 0, 0]);
      for (const sx of [-1, 1]) {
        P(head, G.sphereLo(), M.white(), [sx * 0.045, 0.02, 0.04], 0.02);
        P(head, G.sphereLo(), M.pupil(), [sx * 0.05, 0.02, 0.055], 0.01);
      }
      R.wings = [-1, 1].map((sx) => { const w = grp(body, [sx * 0.08, 0.04, -0.01]); P(w, G.sphere(), C(T.shade(color, -0.25), 0.8), [sx * 0.01, -0.05, 0], [0.025, 0.1, 0.07]); return w; });
      P(body, G.box(), C(0x3a6ae8, 0.8), [0, -0.14, -0.08], [0.05, 0.18, 0.015], [0.5, 0, 0]);
      for (const sx of [-1, 1]) P(root, G.cap(0.008, 0.08), C(0x8a6a4a, 0.6), [sx * 0.03, 0.05, 0]);
      root.userData.height = 0.4;
      blobShadow(root, 0.1);
      return root;
    }
    const cat = kind === 'cat';
    const s = cat ? 0.75 : 1;
    const legH = 0.25 * s;
    const body = grp(root, [0, legH + 0.07 * s, 0]);
    R.body = body;
    P(body, G.cap(0.12 * s, 0.3 * s), fur, [0, 0, 0], 1, [Math.PI / 2, 0, 0]);
    P(body, G.sphere(), fur2, [0, -0.04 * s, 0.1 * s], [0.09 * s, 0.08 * s, 0.12 * s]);
    const head = grp(body, [0, 0.13 * s, 0.25 * s]); R.head = head;
    P(head, G.sphere(), fur, [0, 0, 0], [0.13 * s, 0.12 * s, 0.12 * s]);
    if (cat) {
      P(head, G.sphere(), fur2, [0, -0.04 * s, 0.09 * s], [0.06 * s, 0.045 * s, 0.04 * s]);
      P(head, G.sphereLo(), C(0xff8aa0, 0.5), [0, -0.015 * s, 0.125 * s], 0.014);
      for (const sx of [-1, 1]) {
        P(head, G.cone(), fur, [sx * 0.07 * s, 0.11 * s, 0], [0.04 * s, 0.08 * s, 0.03 * s], [0, 0, -sx * 0.25]);
        for (const dy of [-0.01, 0.01]) P(head, G.box(), M.white(), [sx * 0.1 * s, -0.035 * s + dy, 0.1 * s], [0.08 * s, 0.002, 0.002], [0, sx * 0.3, 0]);
      }
    } else {
      P(head, G.rbox(0.1 * s, 0.08 * s, 0.12 * s, 0.035), fur2, [0, -0.04 * s, 0.11 * s]);
      P(head, G.sphere(), M.black(), [0, -0.01 * s, 0.17 * s], [0.03, 0.025, 0.025]);
      R.ears = [-1, 1].map((sx) => { const e = grp(head, [sx * 0.11 * s, 0.06 * s, -0.01]); P(e, G.sphere(), C(T.shade(color, -0.25), 0.85), [sx * 0.01, -0.06, 0], [0.035, 0.08, 0.06]); return e; });
      R.tongue = P(head, G.sphere(), M.tongue(), [0, -0.09 * s, 0.13 * s], [0.03, 0.01, 0.04]);
      R.tongue.userData.anim = true;
    }
    const f = root.userData.face;
    for (const sx of [-1, 1]) f.eyes.push(makeEye(head, [sx * 0.055 * s, 0.03 * s, 0.1 * s], 0.026 * s, cat ? 0x8ad04a : 0x4a2a1a, fur));
    for (const [x, z] of [[0.07, 0.13], [-0.07, 0.13], [0.07, -0.13], [-0.07, -0.13]]) {
      const l = grp(body, [x * s, -0.03 * s, z * s]);
      P(l, G.cap(0.035 * s, legH * 0.8), fur, [0, -legH / 2, 0]);
      P(l, G.sphere(), fur2, [0, -legH + 0.02, 0.015], [0.04 * s, 0.025 * s, 0.05 * s]);
      R.legs.push(l);
    }
    const tail = grp(body, [0, 0.04 * s, -0.2 * s], [cat ? -0.3 : -0.9, 0, 0]);
    P(tail, G.cap(cat ? 0.022 : 0.03, cat ? 0.32 : 0.18), fur, [0, cat ? 0.18 : 0.1, 0]);
    R.tail = tail;
    root.userData.height = legH + 0.35 * s;
    blobShadow(root, 0.22 * s, 0.32 * s);
    return root;
  }
  function animatePet(p, dt, s) {
    const R = p.userData.rig;
    const ud = p.userData;
    ud.t = (ud.t || 0) + dt;
    const t = ud.t;
    const moving = s.speed > 0.05;
    ud.phase = (ud.phase || 0) + dt * (moving ? 6 + s.speed * 6 : 0);
    if (R.kind === 'parrot') {
      const flap = s.pose === 'fly' || moving;
      R.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (flap ? 0.4 + Math.sin(t * 30) * 0.6 : 0.05); });
      R.body.position.y = (flap ? 0.3 + Math.sin(t * 8) * 0.03 : 0.22) + (s.pose === 'happy' ? Math.abs(Math.sin(t * 8)) * 0.05 : 0);
      R.head.rotation.z = Math.sin(t * 2.3) * 0.25;
      R.head.rotation.x = s.talk ? Math.sin(t * 20) * 0.2 : 0;
      return;
    }
    const sw = moving ? Math.sin(ud.phase) * 0.6 : 0;
    R.legs[0].rotation.x = sw; R.legs[3].rotation.x = sw; R.legs[1].rotation.x = -sw; R.legs[2].rotation.x = -sw;
    const happy = s.pose === 'happy' || s.mood > 0.5;
    R.tail.rotation.z = Math.sin(t * (happy ? 18 : 3)) * (happy ? 0.6 : 0.2);
    if (s.pose === 'sit') { R.body.rotation.x = -0.45; R.legs[2].rotation.x = R.legs[3].rotation.x = -1.2; }
    else if (s.pose === 'lie' || s.pose === 'sleep') { R.body.rotation.x = 0; R.body.position.y = 0.12; R.legs.forEach((l) => { l.rotation.x = -1.4; }); }
    else { R.body.rotation.x = 0; R.body.position.y = (R.kind === 'cat' ? 0.25 * 0.75 + 0.07 * 0.75 : 0.32) + (happy ? Math.abs(Math.sin(t * 9)) * 0.04 : 0); }
    R.head.rotation.x = s.talk ? -0.25 + Math.sin(t * 22) * 0.12 : Math.sin(t * 1.4) * 0.06;
    if (R.tongue) R.tongue.visible = happy || moving;
    if (R.ears) R.ears.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * (0.1 + Math.sin(t * 3 + i) * 0.08); });
    animateFace(p, t, dt, s.pose === 'sleep' ? 1 : 0);
  }

  // ============================================================
  //  VEHICLES 🚲 🚗 🏎️
  // ============================================================
  function vehicle(kind, color = 0xe83a3a) {
    const root = new THREE.Group();
    const paint = C(color, 0.3, 0.4);
    const wheels = [];
    const wheel = (x, y, z, r, w) => {
      const wg = grp(root, [x, y, z]);
      P(wg, G.cyl(), M.tire(), [0, 0, 0], [r, w, r], [0, 0, Math.PI / 2]);
      P(wg, G.cyl(), M.metal(), [0, 0, 0], [r * 0.55, w * 1.05, r * 0.55], [0, 0, Math.PI / 2]);
      wheels.push(wg);
    };
    if (kind === 'bike') {
      for (const z of [-0.5, 0.5]) {
        const wg = grp(root, [0, 0.33, z]);
        P(wg, G.torus(), M.tire(), [0, 0, 0], [0.31, 0.31, 0.31], [0, Math.PI / 2, 0]);
        for (let i = 0; i < 4; i++) P(wg, G.box(), M.metal(), [0, 0, 0], [0.008, 0.6, 0.008], [i * Math.PI / 4, 0, 0]);
        wheels.push(wg);
      }
      P(root, G.cap(0.025, 0.85), paint, [0, 0.62, 0], 1, [Math.PI / 2 - 0.15, 0, 0]);
      P(root, G.cap(0.025, 0.4), paint, [0, 0.5, -0.32], 1, [-0.5, 0, 0]);
      P(root, G.cap(0.025, 0.42), paint, [0, 0.55, 0.45], 1, [0.3, 0, 0]);
      P(root, G.cap(0.02, 0.45), M.black(), [0, 0.8, 0.5], 1, [0, 0, Math.PI / 2]);
      P(root, G.rbox(0.14, 0.05, 0.25, 0.02), M.black(), [0, 0.78, -0.35]);
      root.userData = { kind: 'vehicle', vkind: kind, wheels, seat: [0, 0.35, -0.3], height: 1, wheelR: 0.33 };
      blobShadow(root, 0.3, 0.8);
      return root;
    }
    const sports = kind === 'sports', taxi = kind === 'taxi', bus = kind === 'bus';
    const L = bus ? 8 : 3.9, W = bus ? 2.3 : 1.75, bodyH = sports ? 0.45 : 0.55;
    const y0 = 0.3;
    P(root, G.rbox(W, bodyH, L, 0.18), paint, [0, y0 + bodyH / 2, 0]);
    if (bus) {
      P(root, G.rbox(W, 1.5, L, 0.2), paint, [0, y0 + bodyH + 0.7, 0]);
      for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) P(root, G.box(), M.glass(), [sx * W * 0.501, y0 + bodyH + 0.85, -L / 2 + 1 + i * 1.15], [0.01, 0.6, 0.95]);
    } else {
      const cabW = W * 0.86, cabL = sports ? 1.6 : 2.0, cabH = sports ? 0.38 : 0.5;
      P(root, G.rbox(cabW, cabH, cabL, 0.14), M.glass(), [0, y0 + bodyH + cabH / 2 - 0.03, sports ? -0.2 : -0.15]);
      P(root, G.rbox(cabW * 0.98, 0.06, cabL * 0.9, 0.03), paint, [0, y0 + bodyH + cabH - 0.04, sports ? -0.2 : -0.15]);
      for (const sx of [-1, 1]) P(root, G.box(), paint, [sx * cabW * 0.47, y0 + bodyH + cabH * 0.45, sports ? -0.2 : -0.15], [0.05, cabH * 0.9, 0.06]);
    }
    for (const sx of [-1, 1]) {
      P(root, G.sphereLo(), E(0xfff4c0, 0.8), [sx * W * 0.34, y0 + bodyH * 0.6, L / 2 - 0.02], [0.13, 0.08, 0.05]);
      P(root, G.sphereLo(), E(0xff2a2a, 0.7), [sx * W * 0.36, y0 + bodyH * 0.6, -L / 2 + 0.02], [0.13, 0.06, 0.04]);
    }
    P(root, G.box(), M.black(), [0, y0 + 0.15, L / 2 - 0.02], [W * 0.5, 0.12, 0.04]);
    if (sports) {
      P(root, G.box(), M.black(), [0, y0 + bodyH + 0.25, -L / 2 + 0.2], [W * 0.9, 0.04, 0.3]);
      for (const sx of [-1, 1]) P(root, G.box(), M.black(), [sx * W * 0.35, y0 + bodyH + 0.12, -L / 2 + 0.2], [0.04, 0.22, 0.12]);
      P(root, G.box(), C(0xffffff, 0.4), [0, y0 + bodyH + 0.002, 0.9], [0.18, 0.005, 1.6]);
    }
    if (taxi) {
      P(root, G.rbox(0.6, 0.2, 0.3, 0.05), E(0xffe070, 0.5), [0, y0 + bodyH + 0.6, -0.15]);
      for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) P(root, G.box(), M.black(), [sx * W * 0.502, y0 + bodyH * 0.55, -1 + i * 0.35], [0.01, 0.1, 0.17]);
    }
    const r = sports ? 0.34 : 0.36;
    for (const sx of [-1, 1]) for (const z of (bus ? [-L / 2 + 1.3, L / 2 - 1.5] : [-L / 2 + 0.75, L / 2 - 0.8])) wheel(sx * (W / 2 - 0.08), r, z, r, 0.24);
    root.userData = { kind: 'vehicle', vkind: kind, wheels, seat: [W * 0.22, y0 + 0.15, -0.2], height: 1.4, wheelR: r };
    blobShadow(root, W * 0.62, L * 0.55);
    return root;
  }

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
        P(g, G.cyl(), C(0x7a5232, 0.9), [0, 0.9 * s, 0], [0.13 * s, 1.8 * s, 0.13 * s]);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; P(g, G.sphere(), i % 2 ? M.leaf() : M.leaf2(), [Math.cos(a) * 0.6 * s, (2.2 + (i % 3) * 0.25) * s, Math.sin(a) * 0.6 * s], 0.65 * s); }
        P(g, G.sphere(), M.leaf(), [0, 2.9 * s, 0], 0.75 * s);
        shadow(1.2 * s);
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
    const t = T.facade(color, style);
    const tt = t.clone(); tt.needsUpdate = true; tt.repeat.set(Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 12)));
    const m = new THREE.MeshStandardMaterial({ map: tt, roughness: 0.7 });
    P(g, G.box(), m, [0, h / 2, 0], [w, h, d]);
    P(g, G.box(), C(T.shade(color, -0.3), 0.7), [0, h + 0.15, 0], [w + 0.2, 0.3, d + 0.2]);
    if (style === 2) P(g, G.cyl(), C(0x8a8a94, 0.4, 0.6), [w * 0.2, h + 1.2, 0], [0.05, 2, 0.05]);
    return g;
  }

  return { person, setPersona, animatePerson, pet, animatePet, vehicle, item, animateItem, building, dispose, P, G, C, E, M, grp, std, sprite, blobShadow, BODY };
})();
