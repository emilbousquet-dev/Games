// ============================================================
//  DINO RAMPAGE — 3D MODELS
//  Everything is built from simple shapes glued together:
//  boxes, spheres, cylinders and cones.
//  Things that never move on their own (houses, cars, trees...)
//  are glued into ONE shape with painted corners (vertex colors),
//  so the computer can draw hundreds of them quickly.
// ============================================================
window.DR = window.DR || {};

DR.Models = (function () {
  const U = DR.U, T = DR.Tex;
  const PI = Math.PI;

  // ---------- materials ----------
  const mats = {};
  function std(key, o) { return mats[key] || (mats[key] = new THREE.MeshStandardMaterial(o)); }
  const C = (color, rough = 0.6, metal = 0, extra = {}) => std('c' + color + '_' + rough + '_' + metal + JSON.stringify(extra), Object.assign({ color, roughness: rough, metalness: metal }, extra));
  // the ONE material that all the city things share
  const propMat = () => mats.prop || (mats.prop = new THREE.MeshStandardMaterial({ vertexColors: true, map: T.windowTile(), roughness: 0.72 }));
  const M = {
    eyeWhite: () => C(0xfbfbff, 0.12),
    pupil: () => C(0x07060a, 0.05),
    glint: () => mats.glint || (mats.glint = new THREE.MeshBasicMaterial({ color: 0xffffff })),
    mouth: () => C(0x5a1020, 0.5),
    tongue: () => C(0xe0607a, 0.4),
    teeth: () => C(0xfffaf0, 0.25),
  };
  const glowMat = (color) => mats['glow' + color] || (mats['glow' + color] = new THREE.SpriteMaterial({ map: T.glow(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));

  // ---------- shapes (made once, then reused) ----------
  const geos = {};
  const geo = (key, make) => geos[key] || (geos[key] = make());
  const G = {
    box: () => geo('box', () => new THREE.BoxGeometry(1, 1, 1)),
    sphere: (lo) => geo('sph' + (lo ? 'lo' : ''), () => (lo ? new THREE.SphereGeometry(1, 10, 7) : new THREE.SphereGeometry(1, 20, 14))),
    hemi: () => geo('hemi', () => new THREE.SphereGeometry(1, 20, 10, 0, PI * 2, 0, PI / 2)),
    cyl: (seg = 12) => geo('cyl' + seg, () => new THREE.CylinderGeometry(1, 1, 1, seg)),
    cylT: (ratio, seg = 12) => geo('cylT' + ratio.toFixed(2) + '_' + seg, () => new THREE.CylinderGeometry(ratio, 1, 1, seg)),
    cone: (seg = 12) => geo('cone' + seg, () => new THREE.ConeGeometry(1, 1, seg)),
    torus: (tube) => geo('tor' + tube.toFixed(3), () => new THREE.TorusGeometry(1, tube, 8, 24)),
    cap: (r, len) => geo('cap' + r + '_' + len, () => new THREE.CapsuleGeometry(r, len, 5, 12)),
    rbox: (w, h, d, r) => geo('rbox' + [w, h, d, r].join('_'), () => roundedBox(w, h, d, r)),
    mouthArc: () => geo('mouthArc', () => new THREE.TorusGeometry(1, 0.16, 8, 20, PI)),
    // one slice of a round umbrella (i out of n)
    wedge: (i, n) => geo('wedge' + i + '_' + n, () => new THREE.ConeGeometry(1, 1, 4, 1, true, (i / n) * PI * 2, (PI * 2) / n)),
    // one slice of a beach ball
    ballSlice: (i, n) => geo('ball' + i + '_' + n, () => new THREE.SphereGeometry(1, 4, 12, (i / n) * PI * 2, (PI * 2) / n)),
    // a roof: triangle shape pushed along x (bottom at -0.5, top ridge at +0.5)
    prism: () => geo('prism', () => {
      const g = new THREE.BufferGeometry();
      const a = [-0.5, -0.5, -0.5], b = [-0.5, -0.5, 0.5], c = [-0.5, 0.5, 0];
      const d = [0.5, -0.5, -0.5], e = [0.5, -0.5, 0.5], f = [0.5, 0.5, 0];
      const tris = [a, b, c, d, f, e, b, e, f, b, f, c, a, c, f, a, f, d, a, e, b, a, d, e];
      g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(tris.length * 2).fill(0.02), 2));
      g.computeVertexNormals();
      return g;
    }),
    // a box whose sides are covered in windows
    win: (cx, cy, cz) => geo('win' + cx + '_' + cy + '_' + cz, () => {
      const g = new THREE.BoxGeometry(1, 1, 1);
      const uv = g.attributes.uv;
      for (let f = 0; f < 6; f++) {
        for (let k = 0; k < 4; k++) {
          const i = f * 4 + k;
          if (f === 2 || f === 3) { uv.setXY(i, 0.02, 0.02); continue; }
          const cu = f < 2 ? cz : cx;
          uv.setXY(i, uv.getX(i) * cu, uv.getY(i) * cy);
        }
      }
      return g;
    }),
  };

  // a box with nice round edges
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
    m.castShadow = true;
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
  // soft round shadow on the ground
  function blobShadow(parent, r) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mats.shadow || (mats.shadow = new THREE.MeshBasicMaterial({ map: T.shadow(), transparent: true, depthWrite: false })));
    m.rotation.x = -PI / 2; m.position.y = 0.03; m.scale.set(r * 2, r * 2, 1);
    m.renderOrder = 1;
    parent.add(m);
    return m;
  }

  // ============================================================
  //  THE BUILDER — collects colored shapes and glues them into one
  // ============================================================
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
  class Builder {
    constructor() { this.parts = []; this.cols = new Set(); }
    add(g, color, pos, scl, rot, keepUV) {
      _e.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
      _q.setFromEuler(_e);
      _p.set(pos[0], pos[1], pos[2]);
      if (Array.isArray(scl)) _s.set(scl[0], scl[1], scl[2]); else _s.setScalar(scl == null ? 1 : scl);
      this.parts.push({ g, mtx: new THREE.Matrix4().compose(_p, _q, _s), color, keepUV });
      this.cols.add(color);
      return this;
    }
    box(w, h, d, c, pos, rot) { return this.add(G.box(), c, pos, [w, h, d], rot); }
    rbox(w, h, d, r, c, pos, rot) { return this.add(G.rbox(w, h, d, r), c, pos, 1, rot); }
    cyl(r, h, c, pos, rot, seg = 12) { return this.add(G.cyl(seg), c, pos, [r, h, r], rot); }
    cylT(rt, rb, h, c, pos, rot, seg = 12) { return this.add(G.cylT(rt / rb, seg), c, pos, [rb, h, rb], rot); }
    cone(r, h, c, pos, rot, seg = 12) { return this.add(G.cone(seg), c, pos, [r, h, r], rot); }
    sph(rx, ry, rz, c, pos, rot, lo) { return this.add(G.sphere(lo), c, pos, [rx, ry, rz], rot); }
    torus(R, tube, c, pos, rot) { return this.add(G.torus(tube / R), c, pos, R, rot); }
    prism(w, h, d, c, pos, rot) { return this.add(G.prism(), c, pos, [w, h, d], rot); }
    // a box covered in windows (fw, fh = size of one window square)
    win(w, h, d, c, pos, fw = 2.6, fh = 3.2, rot) {
      const cx = Math.max(1, Math.round(w / fw)), cy = Math.max(1, Math.round(h / fh)), cz = Math.max(1, Math.round(d / fw));
      return this.add(G.win(cx, cy, cz), c, pos, [w, h, d], rot, true);
    }
    // an umbrella / tent roof made of colored slices
    umbrella(r, h, c1, c2, pos, n = 8) {
      for (let i = 0; i < n; i++) this.add(G.wedge(i, n), i % 2 ? c2 : c1, pos, [r, h, r]);
      return this;
    }
    geometry() { return mergeParts(this.parts); }
    mesh() {
      const m = new THREE.Mesh(this.geometry(), propMat());
      m.castShadow = true; m.receiveShadow = true;
      return m;
    }
  }
  const _v = new THREE.Vector3(), _nm = new THREE.Matrix3(), _c = new THREE.Color();
  function mergeParts(parts) {
    let vc = 0, ic = 0;
    for (const { g } of parts) { vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), uv = new Float32Array(vc * 2), col = new Float32Array(vc * 3);
    const idx = vc > 65535 ? new Uint32Array(ic) : new Uint16Array(ic);
    let vo = 0, io = 0;
    for (const { g, mtx, color, keepUV } of parts) {
      const p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv;
      _nm.getNormalMatrix(mtx);
      _c.set(color);
      for (let i = 0; i < p.count; i++) {
        const j = vo + i;
        _v.fromBufferAttribute(p, i).applyMatrix4(mtx); pos[j * 3] = _v.x; pos[j * 3 + 1] = _v.y; pos[j * 3 + 2] = _v.z;
        _v.fromBufferAttribute(n, i).applyMatrix3(_nm).normalize(); nor[j * 3] = _v.x; nor[j * 3 + 1] = _v.y; nor[j * 3 + 2] = _v.z;
        if (keepUV && t) { uv[j * 2] = t.getX(i); uv[j * 2 + 1] = t.getY(i); } else { uv[j * 2] = 0.02; uv[j * 2 + 1] = 0.02; }
        col[j * 3] = _c.r; col[j * 3 + 1] = _c.g; col[j * 3 + 2] = _c.b;
      }
      if (g.index) { for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo; io += g.index.count; }
      else { for (let i = 0; i < p.count; i++) idx[io + i] = vo + i; io += p.count; }
      vo += p.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }

  // ============================================================
  //  COLORS
  // ============================================================
  const COL = {
    white: 0xf6f4ee, wood: 0x9a6a3a, darkWood: 0x6a4424, black: 0x26262c, grey: 0x8a8a92, darkGrey: 0x4a4a52, silver: 0xc8ccd4,
    glass: 0x2a4a6a, leaf: 0x3aa83a, leaf2: 0x5ac84a, trunk: 0x7a5230, red: 0xe83a3a, yellow: 0xffd23a, orange: 0xff8a2a,
    blue: 0x3a7ae8, pink: 0xff7ab8, green: 0x3ac86a, skinA: 0xf2c6a0, gold: 0xffc830, sandy: 0xf0d79a,
  };
  const HOUSE_COLS = [0xf8e0a0, 0xa8d8f0, 0xf4b8c8, 0xc8e8a8, 0xf0f0e8, 0xe8c8f0, 0xf8c890];
  const ROOF_COLS = [0xc8483a, 0x6a4a3a, 0x3a5a8a, 0x5a5a62, 0x8a3a5a];
  const CAR_COLS = [0xe83a3a, 0x3a7ae8, 0xffd23a, 0x3ac86a, 0xf6f4ee, 0xff8a2a, 0x8a5ae8, 0x2a2a30, 0x3ad8d8];
  const BRIGHT = [0xff4a6a, 0x3aa8ff, 0xffd23a, 0x4ad86a, 0xff8a2a, 0xb05aff, 0xff7ab8];
  function pickR(r, arr) { return arr[Math.floor(r() * arr.length)]; }

  // ============================================================
  //  CITY THINGS ("props")
  //  Each one returns { mesh, w, d, h }  (w = size along x, d = along z)
  //  The front of everything faces +z.
  // ============================================================
  const PROPS = {
    // ------------------ TIER 1: small stuff ------------------
    fence(r) {
      const b = new Builder(), c = r() < 0.6 ? COL.white : COL.wood;
      b.box(5, 0.12, 0.08, c, [0, 0.35, 0]).box(5, 0.12, 0.08, c, [0, 0.8, 0]);
      for (let i = 0; i < 9; i++) {
        const x = -2.25 + i * 0.5625;
        b.box(0.2, 0.95, 0.06, c, [x, 0.5, 0.07]).cone(0.14, 0.18, c, [x, 1.06, 0.07], [0, PI / 4, 0], 4);
      }
      return { b, w: 5, d: 0.35, h: 1.15 };
    },
    mailbox(r) {
      const b = new Builder();
      b.box(0.12, 1, 0.12, COL.darkWood, [0, 0.5, 0]);
      b.rbox(0.34, 0.34, 0.6, 0.12, pickR(r, [COL.red, COL.blue, COL.black, COL.white]), [0, 1.12, 0]);
      b.box(0.03, 0.24, 0.08, COL.red, [0.19, 1.3, -0.12]);
      return { b, w: 0.5, d: 0.7, h: 1.35 };
    },
    trashcan(r) {
      const b = new Builder(), c = pickR(r, [0x3a8a4a, COL.grey, 0x3a6ab8]);
      b.cylT(0.36, 0.3, 0.9, c, [0, 0.45, 0]).cyl(0.39, 0.08, c, [0, 0.93, 0]).sph(0.09, 0.05, 0.09, COL.darkGrey, [0, 0.99, 0]);
      if (r() < 0.5) b.sph(0.12, 0.1, 0.12, 0xf0e8d0, [0.15, 1.02, 0.08]);   // a paper bag sticking out
      return { b, w: 0.8, d: 0.8, h: 1.05 };
    },
    hydrant() {
      const b = new Builder();
      b.cyl(0.22, 0.08, COL.red, [0, 0.04, 0]).cyl(0.16, 0.6, COL.red, [0, 0.34, 0]).sph(0.17, 0.15, 0.17, COL.red, [0, 0.64, 0]);
      b.cyl(0.06, 0.45, COL.red, [0, 0.42, 0], [0, 0, PI / 2]).cyl(0.07, 0.06, COL.yellow, [0, 0.79, 0]);
      return { b, w: 0.5, d: 0.5, h: 0.85 };
    },
    bench() {
      const b = new Builder();
      b.box(2, 0.08, 0.5, COL.wood, [0, 0.45, 0]).box(2, 0.42, 0.06, COL.wood, [0, 0.76, -0.24], [-0.15, 0, 0]);
      for (const x of [-0.85, 0.85]) b.box(0.08, 0.45, 0.5, COL.black, [x, 0.22, 0]).box(0.08, 0.5, 0.06, COL.black, [x, 0.7, -0.26], [-0.15, 0, 0]);
      return { b, w: 2, d: 0.6, h: 1 };
    },
    bush(r) {
      const b = new Builder();
      b.sph(0.8, 0.65, 0.7, COL.leaf, [0, 0.6, 0], null, true).sph(0.6, 0.55, 0.55, COL.leaf2, [0.55, 0.5, 0.1], null, true).sph(0.55, 0.5, 0.5, COL.leaf, [-0.55, 0.45, -0.05], null, true);
      if (r() < 0.5) for (let i = 0; i < 5; i++) b.sph(0.08, 0.08, 0.08, pickR(r, [COL.pink, COL.red, COL.yellow, COL.white]), [(r() - 0.5) * 1.4, 0.6 + r() * 0.5, 0.45], null, true);
      return { b, w: 1.8, d: 1.4, h: 1.3 };
    },
    flowers(r) {
      const b = new Builder();
      b.rbox(1.6, 0.4, 0.6, 0.06, 0xb86a3a, [0, 0.2, 0]);
      for (let i = 0; i < 6; i++) {
        const x = -0.6 + i * 0.24;
        b.cyl(0.02, 0.4, COL.leaf, [x, 0.55, 0]).sph(0.11, 0.09, 0.11, pickR(r, [COL.pink, COL.red, COL.yellow, COL.white, 0xb05aff]), [x, 0.78, 0], null, true);
      }
      return { b, w: 1.6, d: 0.6, h: 0.9 };
    },
    gnome() {
      const b = new Builder();
      b.cone(0.3, 0.55, COL.blue, [0, 0.28, 0]).sph(0.18, 0.18, 0.18, COL.skinA, [0, 0.68, 0]);
      b.cone(0.16, 0.35, COL.white, [0, 0.5, 0.1], [PI + 0.3, 0, 0]).sph(0.06, 0.06, 0.06, 0xff9a8a, [0, 0.68, 0.17]);
      b.cone(0.19, 0.5, COL.red, [0, 1.0, -0.02], [-0.15, 0, 0]);
      return { b, w: 0.6, d: 0.6, h: 1.2 };
    },
    trafficcone() {
      const b = new Builder();
      b.box(0.55, 0.06, 0.55, COL.orange, [0, 0.03, 0]).cone(0.24, 0.75, COL.orange, [0, 0.42, 0]).cylT(0.13, 0.17, 0.12, COL.white, [0, 0.45, 0]);
      return { b, w: 0.6, d: 0.6, h: 0.8 };
    },
    newsbox(r) {
      const b = new Builder(), c = pickR(r, [COL.blue, COL.red, COL.yellow]);
      b.rbox(0.55, 1, 0.45, 0.05, c, [0, 0.5, 0]).box(0.4, 0.3, 0.02, 0xd8e8f0, [0, 0.72, 0.23]).box(0.08, 0.3, 0.3, COL.darkGrey, [0.2, 0.15, 0]).box(0.08, 0.3, 0.3, COL.darkGrey, [-0.2, 0.15, 0]);
      return { b, w: 0.6, d: 0.5, h: 1.05 };
    },
    beachumbrella(r) {
      const b = new Builder(), c = pickR(r, [COL.red, COL.blue, COL.orange, COL.pink, COL.green]);
      b.cyl(0.04, 2.2, COL.white, [0, 1.1, 0]).umbrella(1.3, 0.5, c, COL.white, [0, 2.2, 0]);
      b.box(1.8, 0.03, 0.9, pickR(r, [COL.yellow, COL.pink, 0x3ad8d8]), [0.4, 0.02, 1.2]);   // towel
      return { b, w: 1.2, d: 1.2, h: 2.5 };
    },
    sandcastle() {
      const b = new Builder(), s = 0xe8c880;
      b.box(1.2, 0.4, 1.2, s, [0, 0.2, 0]);
      for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) b.cyl(0.2, 0.7, s, [x, 0.35, z], null, 8).cone(0.22, 0.25, s, [x, 0.82, z], null, 8);
      b.cyl(0.3, 0.9, s, [0, 0.45, 0], null, 8).cone(0.32, 0.3, s, [0, 1.05, 0], null, 8).cyl(0.015, 0.4, COL.white, [0, 1.35, 0]).box(0.2, 0.12, 0.01, COL.red, [0.1, 1.48, 0]);
      return { b, w: 1.4, d: 1.4, h: 1.5 };
    },
    beachball(r) {
      const b = new Builder(), cols = [COL.red, COL.white, COL.blue, COL.white, COL.yellow, COL.white];
      for (let i = 0; i < 6; i++) b.add(G.ballSlice(i, 6), cols[i], [0, 0.45, 0], 0.45, [r(), 0, 0.4]);
      return { b, w: 0.9, d: 0.9, h: 0.9 };
    },
    picnictable() {
      const b = new Builder();
      b.box(1.8, 0.08, 0.8, COL.wood, [0, 0.75, 0]).box(1.8, 0.06, 0.3, COL.wood, [0, 0.45, 0.62]).box(1.8, 0.06, 0.3, COL.wood, [0, 0.45, -0.62]);
      for (const x of [-0.75, 0.75]) b.box(0.08, 0.08, 1.6, COL.darkWood, [x, 0.4, 0]).box(0.08, 0.75, 0.08, COL.darkWood, [x, 0.38, 0]);
      b.box(1.2, 0.01, 0.6, COL.red, [0, 0.8, 0]);
      return { b, w: 1.8, d: 1.6, h: 0.85 };
    },
    doghouse(r) {
      const b = new Builder(), c = pickR(r, [COL.red, 0x3a7ae8, 0xf0c060]);
      b.box(1.1, 0.8, 1.2, c, [0, 0.4, 0]).prism(1.3, 0.5, 1.3, 0x6a4a3a, [0, 1.05, 0], [0, PI / 2, 0]).box(0.45, 0.55, 0.02, COL.black, [0, 0.3, 0.61]);
      b.box(0.5, 0.12, 0.02, COL.white, [0, 0.72, 0.62]);
      return { b, w: 1.3, d: 1.3, h: 1.3 };
    },
    // -------- tier 1 FOOD (giant snacks!) --------
    watermelon() {
      const b = new Builder();
      b.sph(0.65, 0.5, 0.5, 0x2a8a2a, [0, 0.5, 0]);
      for (const x of [-0.35, 0, 0.35]) b.torus(0.5 - Math.abs(x) * 0.5, 0.03, 0x6ac84a, [x, 0.5, 0], [0, PI / 2, 0]);
      // a slice next to it
      b.cylT(0.02, 0.4, 0.3, 0xff4a5a, [0.9, 0.15, 0.3], [0, 0, 0], 3).cyl(0.42, 0.06, 0x2a8a2a, [0.9, 0.0, 0.3], null, 3);
      return { b, w: 1.8, d: 1.2, h: 1 };
    },
    donut(r) {
      const b = new Builder();
      b.torus(0.4, 0.2, 0xd89a4a, [0, 0.2, 0], [PI / 2, 0, 0]).torus(0.4, 0.17, pickR(r, [0xff8ac8, 0x8a4a2a, 0xf6f4ee]), [0, 0.28, 0], [PI / 2, 0, 0]);
      for (let i = 0; i < 14; i++) { const a = i / 14 * PI * 2; b.box(0.08, 0.02, 0.02, pickR(r, BRIGHT), [Math.cos(a) * 0.4, 0.44, Math.sin(a) * 0.4], [0, a * 3, 0]); }
      return { b, w: 1.2, d: 1.2, h: 0.5 };
    },
    cake() {
      const b = new Builder();
      b.cyl(0.6, 0.45, 0xffe8f0, [0, 0.225, 0]).cyl(0.62, 0.06, 0xff7ab8, [0, 0.45, 0]).cyl(0.42, 0.35, 0xffe8f0, [0, 0.62, 0]).cyl(0.44, 0.05, 0xff7ab8, [0, 0.8, 0]);
      for (let i = 0; i < 5; i++) { const a = i / 5 * PI * 2; b.cyl(0.03, 0.25, pickR(Math.random, BRIGHT), [Math.cos(a) * 0.25, 0.95, Math.sin(a) * 0.25]).sph(0.035, 0.06, 0.035, COL.yellow, [Math.cos(a) * 0.25, 1.11, Math.sin(a) * 0.25]); }
      b.sph(0.1, 0.1, 0.1, COL.red, [0, 0.86, 0]);
      return { b, w: 1.25, d: 1.25, h: 1.15 };
    },
    hotdog() {
      const b = new Builder();
      b.sph(0.65, 0.2, 0.28, 0xe8a85a, [0, 0.2, 0]).sph(0.8, 0.14, 0.14, 0xb8483a, [0, 0.36, 0]);
      for (let i = 0; i < 6; i++) b.box(0.22, 0.03, 0.05, COL.yellow, [-0.55 + i * 0.22, 0.5, 0], [0, i % 2 ? 0.6 : -0.6, 0]);
      return { b, w: 1.6, d: 0.6, h: 0.55 };
    },
    pizza() {
      const b = new Builder();
      b.box(1.3, 0.1, 1.3, 0xd8b888, [0, 0.05, 0]).box(1.3, 0.04, 1.3, 0xd8b888, [0, 0.7, -0.65], [-1.45, 0, 0]);
      b.cyl(0.6, 0.05, 0xe8a85a, [0, 0.12, 0], null, 20).cyl(0.54, 0.03, 0xff5a3a, [0, 0.15, 0], null, 20).cyl(0.52, 0.02, 0xfff0a0, [0, 0.17, 0], null, 20);
      for (let i = 0; i < 7; i++) { const a = i / 7 * PI * 2, rr = i ? 0.33 : 0; b.cyl(0.09, 0.02, 0xc83a3a, [Math.cos(a) * rr, 0.19, Math.sin(a) * rr], null, 10); }
      return { b, w: 1.4, d: 1.4, h: 1.3 };
    },
    icecream(r) {
      const b = new Builder();
      b.cone(0.3, 0.8, 0xd8a050, [0, 0.4, 0], [PI, 0, 0]).sph(0.33, 0.3, 0.33, pickR(r, [0xff9ac8, 0xa8f0c8, 0xfff0d0]), [0, 0.9, 0]).sph(0.28, 0.26, 0.28, pickR(r, [0x8a5a3a, 0xff9ac8, 0xfff0a0]), [0, 1.2, 0]).sph(0.08, 0.08, 0.08, COL.red, [0, 1.47, 0]);
      b.cyl(0.35, 0.05, 0xd8a050, [0, 0.03, 0]);
      return { b, w: 0.7, d: 0.7, h: 1.55 };
    },
    burger() {
      const b = new Builder();
      b.sph(0.55, 0.14, 0.55, 0xd8904a, [0, 0.14, 0]).cyl(0.58, 0.14, 0x6a3a1a, [0, 0.33, 0]).box(0.95, 0.04, 0.95, 0xffc830, [0, 0.42, 0], [0, 0.4, 0]).cyl(0.6, 0.05, 0x5ac84a, [0, 0.47, 0]).sph(0.56, 0.35, 0.56, 0xe8a050, [0, 0.5, 0]);
      for (let i = 0; i < 8; i++) b.sph(0.04, 0.02, 0.06, 0xfff6d0, [Math.cos(i * 2.4) * 0.3, 0.8 + (i % 2) * 0.02, Math.sin(i * 2.4) * 0.3], null, true);
      return { b, w: 1.2, d: 1.2, h: 0.9 };
    },

    // ------------------ TIER 2: cars, trees, lamps ------------------
    car(r, variant) {
      const b = new Builder();
      const fbi = variant === 'fbi';
      const type = fbi ? 'van' : variant || pickR(r, ['sedan', 'sedan', 'sedan', 'van', 'taxi']);
      const c = fbi ? 0x16161c : type === 'taxi' ? COL.yellow : pickR(r, CAR_COLS);
      if (fbi) { b.cyl(0.04, 1.6, COL.silver, [0.6, 2.8, -1.4], null, 5).cyl(0.04, 1.1, COL.silver, [-0.6, 2.6, -1.6], null, 5).add(G.hemi(), 0xd8d8e0, [0, 2.2, 0.4], [0.5, 0.25, 0.5]); }
      const tall = type === 'van' ? 0.45 : 0;
      b.rbox(2, 0.72, 4.2, 0.25, c, [0, 0.72, 0]);
      b.rbox(1.76, 0.62 + tall, type === 'van' ? 3.4 : 2.2, 0.2, COL.glass, [0, 1.3 + tall / 2, type === 'van' ? -0.3 : -0.15]);
      b.rbox(1.8, 0.14, type === 'van' ? 3.3 : 2.0, 0.06, c, [0, 1.62 + tall, type === 'van' ? -0.3 : -0.15]);
      for (const x of [-0.95, 0.95]) for (const z of [-1.35, 1.35]) b.cyl(0.38, 0.3, COL.black, [x, 0.38, z], [0, 0, PI / 2], 14).cyl(0.2, 0.32, COL.silver, [x, 0.38, z], [0, 0, PI / 2], 10);
      for (const x of [-0.65, 0.65]) { b.sph(0.16, 0.12, 0.06, 0xfff8d0, [x, 0.82, 2.1]); b.box(0.3, 0.12, 0.05, COL.red, [x, 0.82, -2.1]); }
      b.box(1.9, 0.18, 0.1, COL.silver, [0, 0.45, 2.12]).box(1.9, 0.18, 0.1, COL.silver, [0, 0.45, -2.12]);
      if (type === 'taxi') b.box(0.7, 0.25, 0.3, COL.white, [0, 1.85, -0.15]).box(0.72, 0.08, 0.32, COL.black, [0, 1.85, -0.15]);
      return { b, w: 2.1, d: 4.3, h: 1.8 + tall };
    },
    tree(r, variant) {
      const b = new Builder();
      const type = variant || pickR(r, ['round', 'round', 'pine']);
      const s = 0.85 + r() * 0.4;
      if (type === 'pine') {
        b.cylT(0.18 * s, 0.3 * s, 1.6 * s, COL.trunk, [0, 0.8 * s, 0]);
        for (let i = 0; i < 3; i++) b.cone((1.9 - i * 0.45) * s, (2.2 - i * 0.3) * s, i % 2 ? 0x2a8a4a : 0x3aa05a, [0, (2.1 + i * 1.2) * s, 0], [0, i, 0], 9);
        return { b, w: 3.6 * s, d: 3.6 * s, h: 5.6 * s, cw: 0.9, cd: 0.9 };
      }
      if (type === 'palm') {
        let x = 0, y = 0;
        for (let i = 0; i < 7; i++) { b.cylT(0.2 - i * 0.012, 0.24 - i * 0.012, 0.9, i % 2 ? 0x9a7a4a : 0x8a6a3a, [x, y + 0.45, 0], [0, 0, -0.08 * i]); x += 0.07 * i; y += 0.88; }
        for (let i = 0; i < 7; i++) {
          const a = i / 7 * PI * 2;
          b.sph(1.5, 0.08, 0.38, i % 2 ? 0x3aa83a : 0x4ac84a, [x + Math.cos(a) * 1.2, y - 0.25, Math.sin(a) * 1.2], [0, -a, -0.45]);
        }
        for (let i = 0; i < 3; i++) b.sph(0.16, 0.16, 0.16, 0x6a4a2a, [x + Math.cos(i * 2) * 0.25, y - 0.2, Math.sin(i * 2) * 0.25]);
        return { b, w: 3, d: 3, h: y + 0.3, cw: 0.9, cd: 0.9 };
      }
      b.cylT(0.22 * s, 0.34 * s, 2.6 * s, COL.trunk, [0, 1.3 * s, 0]);
      const leaf = pickR(r, [COL.leaf, 0x4ab84a, 0x6ac84a, 0x3a9a3a]);
      b.sph(1.6 * s, 1.4 * s, 1.6 * s, leaf, [0, 3.5 * s, 0], null, true).sph(1.1 * s, 1 * s, 1.1 * s, COL.leaf2, [0.8 * s, 3.1 * s, 0.4 * s], null, true).sph(1.1 * s, 1 * s, 1.1 * s, leaf, [-0.7 * s, 3.3 * s, -0.5 * s], null, true).sph(0.9 * s, 0.9 * s, 0.9 * s, COL.leaf2, [0, 4.5 * s, 0], null, true);
      if (r() < 0.3) for (let i = 0; i < 6; i++) b.sph(0.13, 0.13, 0.13, COL.red, [Math.cos(i) * 1.4 * s, (3 + (i % 3) * 0.5) * s, Math.sin(i) * 1.4 * s], null, true);   // apples!
      return { b, w: 3.4 * s, d: 3.4 * s, h: 5.5 * s, cw: 0.9, cd: 0.9 };
    },
    lamppost() {
      const b = new Builder(), c = 0x2a4a3a;
      b.cyl(0.22, 0.3, c, [0, 0.15, 0]).cyl(0.09, 5, c, [0, 2.6, 0], null, 8).box(0.08, 0.08, 1.2, c, [0, 5.05, 0.5]).cylT(0.12, 0.35, 0.3, c, [0, 4.95, 1.05]).sph(0.2, 0.12, 0.2, 0xfff8d0, [0, 4.8, 1.05]);
      return { b, w: 0.7, d: 0.7, h: 5.3, cw: 0.5, cd: 0.5 };
    },
    phonebooth() {
      const b = new Builder();
      b.box(1.1, 2.3, 1.1, COL.red, [0, 1.15, 0]).box(0.9, 1.5, 0.02, COL.glass, [0, 1.3, 0.56]).box(0.02, 1.5, 0.9, COL.glass, [0.56, 1.3, 0]).box(0.02, 1.5, 0.9, COL.glass, [-0.56, 1.3, 0]);
      b.rbox(1.2, 0.3, 1.2, 0.1, COL.red, [0, 2.4, 0]).box(0.8, 0.14, 0.02, COL.white, [0, 2.15, 0.57]);
      return { b, w: 1.2, d: 1.2, h: 2.6 };
    },
    busstop() {
      const b = new Builder();
      b.box(3.4, 0.1, 1.4, 0x3a8ae8, [0, 2.4, 0]).box(3.2, 1.8, 0.05, COL.glass, [0, 1.3, -0.6]);
      for (const x of [-1.6, 1.6]) b.box(0.1, 2.4, 0.1, COL.grey, [x, 1.2, -0.6]).box(0.1, 2.4, 0.1, COL.grey, [x, 1.2, 0.6]);
      b.box(2.4, 0.08, 0.4, COL.wood, [0, 0.5, -0.35]).box(0.5, 0.7, 0.05, COL.yellow, [1.2, 1.8, -0.55]);
      return { b, w: 3.5, d: 1.5, h: 2.5 };
    },
    slide() {
      const b = new Builder();
      for (const x of [-0.5, 0.5]) { b.box(0.08, 2.4, 0.08, COL.red, [x, 1.2, -1.2]).box(0.08, 2.4, 0.08, COL.red, [x, 1.2, -1.9]); }
      for (let i = 0; i < 5; i++) b.box(1, 0.06, 0.06, COL.yellow, [0, 0.4 + i * 0.45, -1.95]);
      b.box(1.1, 0.1, 0.9, COL.blue, [0, 2.2, -1.55]).box(0.9, 0.08, 3, COL.yellow, [0, 1.15, 0.1], [0.62, 0, 0]);
      b.box(0.06, 0.3, 3, COL.yellow, [0.45, 1.3, 0.1], [0.62, 0, 0]).box(0.06, 0.3, 3, COL.yellow, [-0.45, 1.3, 0.1], [0.62, 0, 0]);
      b.cone(0.8, 0.8, COL.red, [0, 2.9, -1.55], [0, PI / 4, 0], 4);
      return { b, w: 1.4, d: 4, h: 3.3 };
    },
    trampoline() {
      const b = new Builder();
      for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; b.cyl(0.05, 0.8, COL.grey, [Math.cos(a) * 1.3, 0.4, Math.sin(a) * 1.3], null, 6); }
      b.torus(1.4, 0.1, COL.blue, [0, 0.82, 0], [PI / 2, 0, 0]).cyl(1.3, 0.04, COL.black, [0, 0.8, 0], null, 20);
      return { b, w: 3, d: 3, h: 0.95 };
    },
    lifeguard() {
      const b = new Builder();
      for (const x of [-0.8, 0.8]) for (const z of [-0.8, 0.8]) b.box(0.15, 2.4, 0.15, COL.white, [x, 1.2, z]);
      b.box(2, 0.15, 2, COL.white, [0, 2.4, 0]).box(1.8, 1.4, 1.6, COL.red, [0, 3.2, -0.1]).box(0.8, 0.8, 0.05, COL.glass, [0, 3.3, 0.72]);
      b.prism(2.2, 0.5, 2.2, COL.white, [0, 4.15, 0], [0, PI / 2, 0]).box(0.5, 0.12, 0.03, COL.white, [0.5, 3.5, 0.73]).box(0.12, 0.5, 0.03, COL.white, [0.5, 3.5, 0.73]);
      for (let i = 0; i < 6; i++) b.box(0.9, 0.06, 0.1, COL.wood, [0, 0.3 + i * 0.38, 1.3 - i * 0.05], [0.2, 0, 0]);
      return { b, w: 2.2, d: 2.6, h: 4.4 };
    },
    hotdogcart() {
      const b = new Builder();
      b.rbox(2.2, 0.9, 1.1, 0.1, COL.silver, [0, 0.95, 0]).box(2.25, 0.2, 1.15, COL.red, [0, 1.3, 0]);
      for (const x of [-0.7, 0.7]) b.cyl(0.35, 0.12, COL.black, [x, 0.35, 0.58], [PI / 2, 0, 0]);
      b.cyl(0.04, 1.6, COL.grey, [0, 2.1, 0]).umbrella(1.5, 0.6, COL.red, COL.yellow, [0, 2.95, 0]);
      b.sph(0.7, 0.2, 0.26, 0xe8a85a, [0, 1.6, 0]).sph(0.85, 0.13, 0.13, 0xb8483a, [0, 1.75, 0]);
      return { b, w: 3, d: 3, h: 3.3, cw: 2.3, cd: 1.3 };
    },
    booth(r, variant) {
      const b = new Builder(), c = pickR(r, [COL.red, COL.blue, 0xb05aff, COL.pink]);
      b.box(3, 1.1, 1.6, COL.white, [0, 0.55, 0]).box(3.1, 0.12, 1.7, c, [0, 1.15, 0]);
      for (const x of [-1.4, 1.4]) b.box(0.1, 1.6, 0.1, COL.white, [x, 1.9, 0.7]).box(0.1, 1.6, 0.1, COL.white, [x, 1.9, -0.7]);
      for (let i = 0; i < 6; i++) b.box(0.5, 0.1, 2, i % 2 ? COL.white : c, [-1.25 + i * 0.5, 2.75, 0], [0.1, 0, 0]);
      if (variant === 'cotton') { b.cyl(0.05, 1.2, COL.white, [0, 3.2, 0]).sph(0.8, 0.75, 0.8, 0xff9ad8, [0, 4.2, 0], null, true).sph(0.5, 0.5, 0.5, 0xffb8e8, [0.5, 4.4, 0.2], null, true); }
      else if (variant === 'popcorn') { b.cylT(0.8, 0.55, 1.2, COL.red, [0, 3.4, 0]); for (let i = 0; i < 9; i++) b.sph(0.3, 0.28, 0.3, 0xfff4b0, [Math.cos(i) * 0.5, 4.1 + (i % 3) * 0.12, Math.sin(i) * 0.5], null, true); }
      else { for (let i = 0; i < 5; i++) b.sph(0.2, 0.2, 0.2, pickR(r, BRIGHT), [-1 + i * 0.5, 1.45, 0.3]); }
      return { b, w: 3.2, d: 2, h: variant ? 4.8 : 2.9 };
    },
    icecreamstand() {
      const b = new Builder();
      b.box(2.4, 2.2, 2, 0xfff0f8, [0, 1.1, 0]).box(1.8, 0.9, 0.05, COL.glass, [0, 1.5, 1.01]).box(2.6, 0.15, 0.4, COL.pink, [0, 1.05, 1.1]);
      for (let i = 0; i < 5; i++) b.box(0.52, 0.08, 1, i % 2 ? COL.white : COL.pink, [-1 + i * 0.5, 2.4, 1.3], [0.35, 0, 0]);
      b.cone(0.55, 1.4, 0xd8a050, [0, 3.0, 0], [PI, 0, 0]).sph(0.62, 0.55, 0.62, 0xff9ac8, [0, 3.9, 0]).sph(0.5, 0.48, 0.5, 0xa8f0c8, [0, 4.45, 0]).sph(0.12, 0.12, 0.12, COL.red, [0, 4.95, 0]);
      return { b, w: 2.6, d: 2.4, h: 5.1 };
    },

    // ------------------ TIER 3: houses, buses ------------------
    house(r) {
      const b = new Builder();
      const c = pickR(r, HOUSE_COLS), rc = pickR(r, ROOF_COLS);
      const w = 8 + Math.round(r() * 2), d = 7, h = 5.4;
      b.win(w, h, d, c, [0, h / 2, 0], 2.4, 2.7);
      b.prism(w + 0.8, 2.8, d + 0.8, rc, [0, h + 1.4, 0], [0, 0, 0]);
      b.box(0.8, 2, 0.8, 0xa84a3a, [w * 0.25, h + 2, -1]);
      b.box(1.3, 2.3, 0.1, pickR(r, [0x8a3a2a, 0x3a5a8a, 0x2a6a4a, 0xc83a3a]), [0, 1.15, d / 2 + 0.03]).sph(0.07, 0.07, 0.07, COL.gold, [0.45, 1.15, d / 2 + 0.1]);
      b.box(2.4, 0.15, 1.4, COL.white, [0, 2.65, d / 2 + 0.7]).box(0.12, 2.6, 0.12, COL.white, [-1.1, 1.3, d / 2 + 1.3]).box(0.12, 2.6, 0.12, COL.white, [1.1, 1.3, d / 2 + 1.3]);
      b.box(2.4, 0.25, 1.4, 0xb8b0a8, [0, 0.12, d / 2 + 0.7]);
      return { b, w: w + 0.8, d: d + 2, h: h + 2.8 };
    },
    bus(r) {
      const b = new Builder(), school = r() < 0.5;
      const c = school ? 0xffc020 : COL.red;
      b.rbox(2.6, 2.6, 10, 0.3, c, [0, 1.75, 0]).box(2.64, 0.9, 8.4, COL.glass, [0, 2.3, -0.4]).box(2.3, 1, 0.05, COL.glass, [0, 2.3, 5.01]);
      b.box(2.65, 0.15, 10.02, school ? COL.black : COL.white, [0, 1.3, 0]);
      for (const x of [-1.2, 1.2]) for (const z of [-3.3, 3.3]) b.cyl(0.55, 0.4, COL.black, [x, 0.55, z], [0, 0, PI / 2], 14).cyl(0.28, 0.42, COL.silver, [x, 0.55, z], [0, 0, PI / 2], 10);
      for (const x of [-0.8, 0.8]) b.sph(0.2, 0.16, 0.06, 0xfff8d0, [x, 1.1, 5.02]);
      if (school) b.box(1.4, 0.3, 0.05, COL.black, [0, 3.2, 5.0]);
      return { b, w: 2.8, d: 10.2, h: 3.1 };
    },
    truck(r) {
      const b = new Builder(), c = pickR(r, [COL.red, COL.blue, COL.white, COL.green]);
      b.rbox(2.5, 2.3, 2.4, 0.25, c, [0, 1.6, 3.2]).box(2.3, 0.9, 0.05, COL.glass, [0, 2.2, 4.42]);
      b.rbox(2.6, 3.2, 6.6, 0.12, COL.white, [0, 2.15, -1.3]).box(2.62, 1, 5, pickR(r, [COL.orange, COL.blue, 0x3ac86a]), [0, 2.2, -1.3]);
      for (const x of [-1.2, 1.2]) for (const z of [-3.6, -2.2, 3.2]) b.cyl(0.5, 0.4, COL.black, [x, 0.5, z], [0, 0, PI / 2], 14);
      return { b, w: 2.8, d: 9, h: 3.8 };
    },
    icecreamtruck() {
      const b = new Builder();
      b.rbox(2.4, 2.8, 6, 0.3, COL.white, [0, 1.9, 0]).box(2.44, 0.5, 6.02, COL.pink, [0, 1.1, 0]).box(2.3, 0.9, 0.05, COL.glass, [0, 2.4, 3.0]);
      b.box(0.05, 1, 2.2, COL.glass, [1.22, 2.3, -0.6]).box(0.4, 0.1, 2.4, COL.pink, [1.35, 1.75, -0.6]);
      for (const x of [-1.15, 1.15]) for (const z of [-2, 2]) b.cyl(0.5, 0.35, COL.black, [x, 0.5, z], [0, 0, PI / 2], 14);
      b.cone(0.6, 1.5, 0xd8a050, [0, 4.0, 0], [PI, 0, 0]).sph(0.68, 0.6, 0.68, 0xff9ac8, [0, 4.9, 0]).sph(0.55, 0.52, 0.55, 0xa8f0c8, [0, 5.5, 0]).sph(0.14, 0.14, 0.14, COL.red, [0, 6.05, 0]);
      return { b, w: 2.8, d: 6.2, h: 6.2 };
    },
    fountain() {
      const b = new Builder();
      b.cyl(3.4, 0.7, 0xc8c0b8, [0, 0.35, 0], null, 20).cyl(3.1, 0.2, 0x5ab8e8, [0, 0.62, 0], null, 20);
      b.cylT(0.35, 0.5, 2, 0xc8c0b8, [0, 1.5, 0]).cylT(1.6, 0.4, 0.5, 0xc8c0b8, [0, 2.6, 0], null, 16).cyl(1.4, 0.1, 0x5ab8e8, [0, 2.84, 0], null, 16);
      b.cylT(0.1, 0.3, 1.4, 0xa8e0ff, [0, 3.5, 0]).sph(0.4, 0.3, 0.4, 0xd0f0ff, [0, 4.2, 0]);
      return { b, w: 6.8, d: 6.8, h: 4.4 };
    },
    gasstation() {
      const b = new Builder();
      b.box(11, 0.6, 7, COL.white, [0, 4.8, 0]).box(11.05, 0.3, 7.05, COL.red, [0, 4.45, 0]);
      for (const x of [-4, 4]) b.box(0.4, 4.5, 0.4, COL.white, [x, 2.25, 0]);
      for (const x of [-1.8, 1.8]) { b.rbox(0.9, 1.7, 0.6, 0.1, COL.red, [x, 0.85, 0]).box(0.6, 0.4, 0.02, 0x2a2a30, [x, 1.3, 0.31]); b.box(0.3, 0.12, 0.8, 0x2a2a30, [x, 0.9, 0.5]); }
      b.box(1.8, 1.4, 0.3, COL.red, [4.5, 5.8, 0]).box(1.4, 0.9, 0.32, COL.yellow, [4.5, 5.8, 0]);
      return { b, w: 11, d: 7, h: 6.5 };
    },
    carousel(r) {
      const b = new Builder();
      b.cyl(4.2, 0.6, 0xf0e0c0, [0, 0.3, 0], null, 20).cyl(0.4, 5, COL.gold, [0, 3, 0]);
      b.umbrella(4.6, 1.8, COL.red, COL.white, [0, 6.2, 0], 12).cyl(4.6, 0.4, COL.gold, [0, 5.1, 0], null, 20).sph(0.4, 0.4, 0.4, COL.gold, [0, 7.3, 0]);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * PI * 2, x = Math.cos(a) * 3, z = Math.sin(a) * 3, c = pickR(r, [COL.white, COL.pink, 0x8a5aff, COL.yellow]);
        b.cyl(0.05, 4.4, COL.gold, [x, 3, z], null, 6).rbox(0.4, 0.55, 1.2, 0.18, c, [x, 1.8 + (i % 2) * 0.4, z], [0, -a, 0]);
        b.rbox(0.28, 0.5, 0.35, 0.12, c, [x + Math.cos(a + PI / 2) * 0.5, 2.3 + (i % 2) * 0.4, z + Math.sin(a + PI / 2) * 0.5], [0, -a, 0]);
      }
      return { b, w: 9.2, d: 9.2, h: 7.7 };
    },

    // ------------------ TIER 4: shops & big things ------------------
    shop(r, variant) {
      const b = new Builder();
      const c = pickR(r, [0xe8c8a0, 0xc86a5a, 0xa8c8e8, 0xf0e0c0, 0xb8d8a8, 0xe0a8c8, 0xd0d0d0]);
      const w = 14, d = 10, h = variant ? 7 : 8.5 + Math.round(r() * 2) * 1.3;
      b.win(w, 3.6, d, c, [0, 1.8, 0], 3.5, 3.6);
      b.win(w, h - 3.6, d, c, [0, 3.6 + (h - 3.6) / 2, 0], 2.8, 2.9);
      b.box(w + 0.3, 0.5, d + 0.3, 0xe8e8e0, [0, h + 0.25, 0]);
      const aw = pickR(r, [COL.red, COL.green, COL.blue, 0xff8a2a, 0xb05aff]);
      for (let i = 0; i < 9; i++) b.box(w / 9 + 0.01, 0.1, 1.6, i % 2 ? COL.white : aw, [-w / 2 + (i + 0.5) * w / 9, 3.3, d / 2 + 0.7], [0.35, 0, 0]);
      b.box(2, 2.8, 0.1, 0x3a2a2a, [0, 1.4, d / 2 + 0.05]);
      if (!variant) {
        b.box(w * 0.6, 1.6, 0.3, pickR(r, BRIGHT), [0, h + 1.2, d / 2 - 0.3]).sph(0.55, 0.55, 0.2, COL.white, [-w * 0.2, h + 1.2, d / 2 - 0.1]);
        b.box(2, 1.2, 2, COL.silver, [-3, h + 1.1, -2]).box(1.5, 1, 1.5, COL.silver, [3, h + 1, -1]);
      }
      if (variant === 'burger') {
        const y = h + 0.5;
        b.cyl(0.3, 1.2, COL.grey, [0, y + 0.6, 0]);
        b.sph(3.2, 0.8, 3.2, 0xd8904a, [0, y + 1.8, 0]).cyl(3.3, 0.8, 0x6a3a1a, [0, y + 2.7, 0]).box(5.2, 0.2, 5.2, 0xffc830, [0, y + 3.15, 0], [0, 0.4, 0]).cyl(3.4, 0.25, 0x5ac84a, [0, y + 3.35, 0]).sph(3.25, 2, 3.25, 0xe8a050, [0, y + 3.5, 0]);
        for (let i = 0; i < 12; i++) b.sph(0.2, 0.1, 0.3, 0xfff6d0, [Math.cos(i * 2.4) * 1.8, y + 5.1 + (i % 3) * 0.1, Math.sin(i * 2.4) * 1.8], null, true);
        return { b, w, d: d + 1.5, h: y + 5.6 };
      }
      if (variant === 'pudding') {
        const y = h + 0.5;
        b.cylT(3.2, 2.5, 4.5, 0xf6f4ee, [0, y + 2.25, 0], null, 18).cyl(3.1, 0.3, 0x8a5a2a, [0, y + 4.4, 0], null, 18).sph(2.4, 0.9, 2.4, 0x8a5a2a, [0, y + 4.5, 0]);
        b.box(0.35, 0.2, 6, COL.silver, [1, y + 6, 0], [0.6, 0, 0.3]);
        b.box(4.5, 1.2, 0.1, 0x5a6a3a, [0, y + 2, 2.8]);
        return { b, w, d: d + 1.5, h: y + 7 };
      }
      if (variant === 'donut') {
        const y = h + 0.5;
        b.box(1, 1.2, 1, COL.grey, [0, y + 0.6, 0]);
        b.torus(2.6, 1.3, 0xd89a4a, [0, y + 4, 0]).torus(2.6, 1.1, 0xff8ac8, [0, y + 4, 0.3]);
        for (let i = 0; i < 18; i++) { const a = i / 18 * PI * 2; b.box(0.5, 0.12, 0.12, pickR(r, BRIGHT), [Math.cos(a) * 2.6, y + 4 + Math.sin(a) * 2.6, 1.5], [0, 0, a * 3]); }
        return { b, w, d: d + 1.5, h: y + 8 };
      }
      return { b, w, d: d + 1.5, h: h + 2 };
    },
    apartment(r) {
      const b = new Builder();
      const c = pickR(r, [0xe8d8c0, 0xd8a890, 0xc8d8e8, 0xf0e8d8]);
      const w = 16, d = 12, h = 16 + Math.round(r() * 2) * 3;
      b.win(w, h, d, c, [0, h / 2, 0], 2.7, 3);
      for (let f = 1; f < h / 3; f++) b.box(w + 0.6, 0.2, 0.9, 0xe8e8e0, [0, f * 3, d / 2 + 0.4]).box(w + 0.6, 0.7, 0.05, COL.grey, [0, f * 3 + 0.45, d / 2 + 0.85]);
      b.box(w + 0.4, 0.5, d + 0.4, 0xb8b0a8, [0, h + 0.25, 0]).cyl(1.3, 2.4, 0x8a6a4a, [4, h + 1.9, -2]).cone(1.4, 1, 0x6a4a3a, [4, h + 3.6, -2]);
      return { b, w: w + 0.6, d: d + 2, h: h + 4 };
    },
    watertower() {
      const b = new Builder(), c = 0x8ac8e8;
      for (const [x, z] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) b.cyl(0.25, 12, COL.grey, [x, 6, z], null, 8);
      b.box(4.6, 0.25, 0.25, COL.grey, [0, 5, 2.2]).box(4.6, 0.25, 0.25, COL.grey, [0, 5, -2.2]).box(0.25, 0.25, 4.6, COL.grey, [2.2, 5, 0]).box(0.25, 0.25, 4.6, COL.grey, [-2.2, 5, 0]);
      b.cyl(3.6, 5, c, [0, 14.5, 0], null, 20).cyl(3.7, 0.4, COL.white, [0, 12.2, 0], null, 20).cone(3.8, 2, c, [0, 18, 0], null, 20).cyl(3.62, 1.2, COL.white, [0, 14.5, 0], null, 20);
      return { b, w: 7.4, d: 7.4, h: 19 };
    },

    // ------------------ TIER 5: skyscrapers! ------------------
    tower(r, variant) {
      const b = new Builder();
      const style = variant || pickR(r, ['glass', 'glass', 'deco', 'tall']);
      const c = style === 'glass' ? pickR(r, [0x9ac8f0, 0x8ae0d8, 0xa8b8e8]) : pickR(r, [0xe8dcc8, 0xd8c8b0, 0xc8c8d0, 0xe0c0a0]);
      let w = 13 + Math.round(r() * 3), h = style === 'tall' ? 44 + r() * 8 : 30 + r() * 10;
      h = Math.round(h / 3.2) * 3.2;
      b.box(w + 1, 1, w + 1, COL.darkGrey, [0, 0.5, 0]);
      b.win(w, h, w, c, [0, h / 2, 0], 2.6, 3.2);
      let top = h;
      if (style === 'deco' || style === 'tall') {
        const h2 = Math.round(h * 0.25 / 3.2) * 3.2, w2 = w * 0.7;
        b.win(w2, h2, w2, c, [0, h + h2 / 2, 0], 2.6, 3.2);
        top += h2;
        b.box(w2 * 0.5, 3, w2 * 0.5, c, [0, top + 1.5, 0]).cone(w2 * 0.3, 7, c, [0, top + 6.5, 0], [0, PI / 4, 0], 4);
        top += 10;
      } else {
        b.box(w + 0.4, 0.6, w + 0.4, 0xe8e8e8, [0, h + 0.3, 0]).box(4, 2, 4, COL.silver, [2, h + 1.6, 2]);
        b.cyl(0.15, 8, COL.silver, [-w / 4, h + 4, -w / 4], null, 6).sph(0.35, 0.35, 0.35, COL.red, [-w / 4, h + 8, -w / 4]);
        top += 8;
      }
      return { b, w: w + 1, d: w + 1, h: top };
    },
    hotel(r) {
      const b = new Builder();
      const c = pickR(r, [0xffc8d8, 0xfff0c8, 0xc8f0e8]);
      const w = 18, d = 12, h = 38.4;
      b.win(w, h, d, c, [0, h / 2, 0], 2.8, 3.2);
      for (let f = 1; f < 12; f++) b.box(w + 0.8, 0.25, 1.2, COL.white, [0, f * 3.2, d / 2 + 0.5]);
      b.box(w + 1, 0.8, d + 1, COL.white, [0, h + 0.4, 0]).box(8, 3, 0.5, COL.pink, [0, h + 2.3, d / 2 - 0.5]).sph(1.2, 1.2, 0.3, COL.yellow, [-2.5, h + 2.3, d / 2 - 0.2]);
      return { b, w: w + 1, d: d + 2, h: h + 4 };
    },
    lighthouse() {
      const b = new Builder();
      for (let i = 0; i < 6; i++) b.cylT(3 - (i + 1) * 0.25, 3 - i * 0.25, 4, i % 2 ? COL.white : COL.red, [0, 2 + i * 4, 0], null, 16);
      b.cyl(1.9, 0.5, COL.darkGrey, [0, 24.25, 0], null, 16).cyl(1.3, 2.6, 0xfff4a0, [0, 25.8, 0], null, 12).cone(1.7, 2, COL.red, [0, 28.1, 0], null, 12).sph(0.3, 0.3, 0.3, COL.gold, [0, 29.3, 0]);
      b.torus(1.95, 0.08, COL.black, [0, 25, 0], [PI / 2, 0, 0]);
      return { b, w: 6.4, d: 6.4, h: 29.6 };
    },

    // ------------------ THE SECRET FBI BASE (shhh!) ------------------
    fbibase() {
      const b = new Builder();
      b.win(12, 7, 10, 0xf0dcc0, [0, 3.5, 0], 2.6, 3.4);
      b.box(12.4, 0.4, 10.4, 0xf8f0e0, [0, 7.2, 0]);
      for (let i = 0; i < 8; i++) b.box(1.51, 0.1, 1.6, i % 2 ? COL.white : COL.pink, [-6 + (i + 0.5) * 1.5, 3.2, 5.7], [0.35, 0, 0]);
      b.box(1.8, 2.6, 0.1, 0x3a2a2a, [0, 1.3, 5.05]);
      b.box(9.6, 2.2, 0.2, 0xc84a7a, [0, 5.4, 5.05]);
      // ...but why does a bakery have a GIANT satellite dish and so many antennas?
      b.cyl(0.35, 2, COL.grey, [2.5, 8.4, -2]).sph(2.6, 0.55, 2.6, 0xe8e8f0, [2.5, 10.2, -2], [-0.9, 0.6, 0]);
      b.cyl(0.08, 1.8, COL.silver, [2.5, 10.3, -1.2], [0.5, 0, 0]);
      for (const [x, z, h] of [[-4, -3, 5], [-2.5, -3.5, 3.5], [-5, 1, 4], [5, 3, 3]]) b.cyl(0.07, h, COL.silver, [x, 7.4 + h / 2, z], null, 6).sph(0.18, 0.18, 0.18, COL.red, [x, 7.4 + h, z]);
      b.box(2, 1.2, 2, 0x3a3a44, [-3, 8, 2]);
      // a giant croissant on the roof (to look like a REAL bakery)
      for (let i = 0; i < 5; i++) { const a = (i / 4 - 0.5) * 2.2; b.sph(0.9 - Math.abs(i - 2) * 0.18, 0.7 - Math.abs(i - 2) * 0.12, 0.8, 0xe8a850, [Math.sin(a) * 2.2, 8.2, 3 - Math.cos(a) * 1.4 + 1.4], [0, a, 0]); }
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 1.9), new THREE.MeshStandardMaterial({ map: T.tex(U.canvas(512, 106, (g) => {
        g.fillStyle = '#fff0f6'; g.fillRect(0, 0, 512, 106);
        g.fillStyle = '#c83a6a'; g.font = 'bold 44px Arial, sans-serif'; g.textAlign = 'center'; g.fillText('TOTALLY NORMAL BAKERY', 256, 52);
        g.fillStyle = '#6a5a6a'; g.font = 'italic 26px Arial, sans-serif'; g.fillText('(definitely NOT the FBI)', 256, 90);
      }), false), roughness: 0.6 }));
      sign.position.set(0, 5.4, 5.17);
      return { b, w: 12.4, d: 12, h: 11, extra: sign };
    },

    // ------------------ ARMY BASE STUFF ------------------
    sandbags() {
      const b = new Builder();
      for (let row = 0; row < 3; row++) for (let i = 0; i < 5 - row; i++) b.rbox(0.75, 0.32, 0.45, 0.14, row % 2 ? 0xc8b088 : 0xb8a078, [-1.2 + row * 0.3 + i * 0.6, 0.17 + row * 0.3, 0], [0, (i % 2) * 0.1, 0]);
      return { b, w: 3.1, d: 0.6, h: 1 };
    },
    crates() {
      const b = new Builder();
      for (const [x, y, z, s] of [[-0.6, 0.5, 0, 1], [0.6, 0.45, 0.1, 0.9], [0, 1.4, 0, 0.85]]) {
        b.box(s, s, s, 0x9a7a4a, [x, y, z]).box(s * 1.02, 0.1, s * 1.02, 0x6a5030, [x, y + s * 0.3, z]).box(s * 1.02, 0.1, s * 1.02, 0x6a5030, [x, y - s * 0.3, z]);
      }
      return { b, w: 2.3, d: 1.2, h: 1.9 };
    },
    pudding() {
      const b = new Builder();
      b.cylT(0.55, 0.42, 0.8, 0xf6f4ee, [0, 0.4, 0]).cyl(0.53, 0.08, 0x8a5a2a, [0, 0.79, 0]).sph(0.4, 0.15, 0.4, 0x8a5a2a, [0, 0.82, 0]);
      b.box(0.08, 0.04, 1, COL.silver, [0.2, 1.05, 0], [0.5, 0, 0.3]).sph(0.12, 0.04, 0.15, COL.silver, [0.25, 0.86, -0.4]);
      b.box(0.9, 0.25, 0.02, 0x5a6a3a, [0, 0.4, 0.5]);
      return { b, w: 1.2, d: 1.2, h: 1.2 };
    },
    jeep(r) {
      const b = new Builder(), c = 0x5a6a3a;
      b.rbox(2.1, 0.9, 4, 0.2, c, [0, 0.95, 0]).box(1.9, 0.08, 0.6, COL.glass, [0, 1.75, 0.6], [-0.3, 0, 0]);
      for (const x of [-0.95, 0.95]) b.box(0.06, 0.6, 0.06, c, [x, 1.6, 0.5]);
      for (const x of [-1, 1]) for (const z of [-1.3, 1.3]) b.cyl(0.48, 0.38, COL.black, [x, 0.48, z], [0, 0, PI / 2], 12);
      b.cyl(0.42, 0.3, COL.black, [0, 1.15, -2.1], [PI / 2, 0, 0], 12);
      b.cone(0.35, 0.02, COL.white, [0, 1.41, 1.5], null, 5);
      b.box(0.5, 0.5, 0.5, 0x4a5a2a, [0.5, 1.6, -1.2]);
      return { b, w: 2.2, d: 4.4, h: 1.9 };
    },
    fueltank() {
      const b = new Builder();
      b.cyl(1.3, 6, 0x6a7a4a, [0, 1.9, 0], [0, 0, PI / 2], 16).sph(1.3, 1.3, 0.5, 0x6a7a4a, [3, 1.9, 0], [0, PI / 2, 0]).sph(1.3, 1.3, 0.5, 0x6a7a4a, [-3, 1.9, 0], [0, PI / 2, 0]);
      for (const x of [-2, 2]) b.box(0.4, 0.8, 2, 0x4a4a52, [x, 0.4, 0]);
      b.box(3, 0.5, 0.05, COL.yellow, [0, 2, 1.3]);
      return { b, w: 6.6, d: 2.8, h: 3.3 };
    },
    flagpole() {
      const b = new Builder();
      b.cyl(0.4, 0.4, 0x8a8a92, [0, 0.2, 0]).cyl(0.07, 8, COL.silver, [0, 4.2, 0], null, 8).sph(0.15, 0.15, 0.15, COL.gold, [0, 8.2, 0]);
      b.box(2.6, 1.6, 0.05, 0x4a6a3a, [1.35, 7.2, 0]).cone(0.45, 0.04, COL.white, [1.35, 7.2, 0.04], [PI / 2, 0, 0], 5);
      return { b, w: 0.8, d: 0.8, h: 8.4, cw: 0.6, cd: 0.6 };
    },
    armytank() {
      const t = tankParts(new Builder(), new Builder());
      for (const p of t.turret.parts) t.body.parts.push({ g: p.g, mtx: new THREE.Matrix4().makeTranslation(0, 1.9, -0.2).multiply(p.mtx), color: p.color, keepUV: p.keepUV });
      t.turret.cols.forEach((c) => t.body.cols.add(c));
      return { b: t.body, w: 3.8, d: 7.4, h: 3.2 };
    },
    barracks(r) {
      const b = new Builder(), c = pickR(r, [0x8a9a6a, 0x9aa07a, 0x7a8a5a]);
      b.win(16, 4, 8, c, [0, 2, 0], 2.6, 4);
      b.prism(16.6, 2, 8.8, 0x4a5a3a, [0, 5, 0]);
      b.box(1.6, 2.6, 0.1, 0x3a3a2a, [0, 1.3, 4.05]).box(3, 0.8, 0.1, COL.white, [0, 3.4, 4.06]);
      return { b, w: 16.6, d: 8.8, h: 6 };
    },
    hangar() {
      const b = new Builder(), c = 0x7a8a6a;
      b.add(G.cyl(20), c, [0, 0, 0], [9, 18, 8.5], [PI / 2, 0, 0]);
      b.box(18, 0.5, 18.2, 0x5a5a62, [0, 0.25, 0]);
      b.box(12, 6.5, 0.2, 0x5a6a4a, [0, 3.3, 9.05]);
      for (let i = 0; i < 6; i++) b.box(0.1, 6.5, 0.22, 0x4a5a3a, [-5 + i * 2, 3.3, 9.07]);
      b.cone(1.2, 0.05, COL.white, [0, 6.5, 9.2], [PI / 2, 0, 0], 5);
      return { b, w: 18.2, d: 18.4, h: 9 };
    },
    radar() {
      const b = new Builder();
      for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) b.cyl(0.18, 12, COL.grey, [x * 0.8, 6, z * 0.8], [z * 0.03, 0, -x * 0.03], 6);
      for (let i = 1; i < 4; i++) b.box(2.8, 0.15, 0.15, COL.grey, [0, i * 3, 1.25]).box(2.8, 0.15, 0.15, COL.grey, [0, i * 3, -1.25]);
      b.box(3.4, 0.4, 3.4, 0x4a4a52, [0, 12.2, 0]).cyl(0.3, 1.4, COL.grey, [0, 13, 0]).sph(3, 0.6, 3, 0xf0f0f8, [0, 14.6, 0], [-1.1, 0, 0]).cyl(0.1, 2, COL.silver, [0, 13.6, 0.9], [1.2, 0, 0]);
      return { b, w: 6, d: 6, h: 16 };
    },
    controltower() {
      const b = new Builder();
      b.cylT(2.6, 3.4, 24, 0xe8e0d0, [0, 12, 0], null, 12);
      for (let i = 1; i < 6; i++) b.cyl(3.45 - i * 0.16, 0.25, 0xc8c0b0, [0, i * 4, 0], null, 12);
      b.cylT(5, 3.6, 1.5, 0xd8d0c0, [0, 24.7, 0], null, 12).cyl(5, 3.4, 0x3a6a9a, [0, 27.2, 0], null, 12).cyl(5.4, 0.6, 0xe8e0d0, [0, 29.2, 0], null, 12);
      b.cyl(0.12, 5, COL.silver, [0, 32, 0], null, 6).sph(0.4, 0.4, 0.4, COL.red, [0, 34.5, 0]);
      return { b, w: 10.8, d: 10.8, h: 35, cw: 7, cd: 7 };
    },
    // the Ferris wheel is special: the wheel is its own piece so it can spin (and roll away!)
    ferris(r) {
      const b = new Builder();
      const R = 13, cy = 15.5;
      for (const z of [-2.5, 2.5]) for (const s of [-1, 1]) b.cyl(0.45, 17, COL.white, [s * 4.2, cy / 2, z], [0, 0, s * 0.28], 10);
      b.box(12, 0.8, 7, COL.grey, [0, 0.4, 0]).cyl(0.8, 6, COL.silver, [0, cy, 0], [PI / 2, 0, 0]);
      const wb = new Builder();
      for (const z of [-2, 2]) wb.torus(R, 0.3, COL.white, [0, 0, z]);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * PI * 2;
        for (const z of [-2, 2]) wb.box(0.2, R, 0.2, COL.white, [Math.cos(a) * R / 2, Math.sin(a) * R / 2, z], [0, 0, a + PI / 2]);
        wb.rbox(2, 2, 2.6, 0.4, BRIGHT[i % BRIGHT.length], [Math.cos(a) * R, Math.sin(a) * R - 1.4, 0]);
        wb.sph(0.35, 0.35, 0.35, COL.yellow, [Math.cos(a) * R, Math.sin(a) * R, 0], null, true);
      }
      const wheel = wb.mesh();
      wheel.position.y = cy;
      return { b, w: 28, d: 7, h: cy + R + 2, cw: 12, extra: wheel, spin: wheel };
    },
  };


  // build a prop and give back the mesh + info
  function prop(kind, r = Math.random, variant) {
    const out = PROPS[kind](r, variant);
    let mesh = out.b.mesh();
    if (out.extra) { const g = new THREE.Group(); g.add(mesh); g.add(out.extra); mesh = g; }
    return { mesh, w: out.w, d: out.d, h: out.h, cw: out.cw || out.w, cd: out.cd || out.d, cols: [...out.b.cols], spin: out.spin || null };
  }


  // ============================================================
  //  ARMY VEHICLES THAT MOVE (tank, jeep, helicopter)
  // ============================================================
  function tankParts(body, turret) {
    const c = 0x5a6a3a, d = 0x3a4a2a;
    body.rbox(3.4, 1.2, 6.6, 0.25, c, [0, 1.25, 0]);
    for (const x of [-1.6, 1.6]) {
      body.rbox(0.8, 1.1, 7.2, 0.4, 0x2a2a2a, [x, 0.6, 0]);
      for (let i = 0; i < 5; i++) body.cyl(0.42, 0.85, 0x4a4a4a, [x, 0.55, -2.6 + i * 1.3], [0, 0, PI / 2], 10);
    }
    body.cone(0.5, 0.03, COL.white, [0, 1.87, -1.8], null, 5);
    turret.rbox(2.4, 1, 2.8, 0.35, d, [0, 0.4, 0]).cyl(0.22, 4, d, [0, 0.45, 2.9], [PI / 2, 0, 0], 10).cyl(0.3, 0.5, d, [0, 0.45, 4.8], [PI / 2, 0, 0], 10);
    turret.cyl(0.4, 0.3, c, [0.6, 1, -0.6], null, 10);
    return { body, turret };
  }
  function unitTank() {
    const t = tankParts(new Builder(), new Builder());
    const root = new THREE.Group();
    root.add(t.body.mesh());
    const turret = t.turret.mesh(); turret.position.set(0, 1.9, -0.2); root.add(turret);
    return { root, turret, cols: [0x5a6a3a, 0x3a4a2a, 0x2a2a2a, 0x4a4a4a] };
  }
  function unitJeep() {
    const p = PROPS.jeep(Math.random);
    const root = new THREE.Group(); root.add(p.b.mesh());
    const gun = new Builder();
    gun.box(0.3, 0.3, 1.2, 0x2a2a2a, [0, 0, 0.4]).box(0.6, 0.5, 0.4, 0x3a4a2a, [0, -0.1, 0]);
    const turret = gun.mesh(); turret.position.set(0, 2.1, -0.6); root.add(turret);
    return { root, turret, cols: [...p.b.cols] };
  }
  function unitHeli() {
    const b = new Builder(), c = 0x4a5a3a;
    b.sph(1.5, 1.4, 2.6, c, [0, 0, 0]).sph(1.2, 0.95, 1.3, COL.glass, [0, 0.2, 1.6]);
    b.cylT(0.25, 0.7, 5, c, [0, 0.35, -4], [PI / 2 + 0.1, 0, 0], 10).box(0.15, 1.4, 0.9, c, [0, 1, -6.4]);
    for (const x of [-1, 1]) { b.box(0.15, 1, 0.15, COL.black, [x * 0.9, -1.4, 0.8]).box(0.15, 1, 0.15, COL.black, [x * 0.9, -1.4, -0.8]).box(0.18, 0.15, 3.6, COL.black, [x * 1.05, -1.9, 0]); }
    for (const x of [-1, 1]) b.cyl(0.25, 1.6, 0x3a3a3a, [x * 1.6, -0.3, 0.3], [PI / 2, 0, 0], 8);
    b.cone(0.45, 0.03, COL.white, [1.45, 0.1, -0.5], [0, 0, PI / 2], 5).cone(0.45, 0.03, COL.white, [-1.45, 0.1, -0.5], [0, 0, -PI / 2], 5);
    b.cyl(0.25, 0.6, COL.black, [0, 1.6, 0], null, 8);
    const root = new THREE.Group(); root.add(b.mesh());
    const rb = new Builder();
    rb.box(11, 0.06, 0.45, 0x222226, [0, 0, 0]).box(0.45, 0.06, 11, 0x222226, [0, 0, 0]);
    const rotor = rb.mesh(); rotor.position.y = 1.95; root.add(rotor);
    const tb = new Builder(); tb.box(0.05, 2.2, 0.3, 0x222226, [0, 0, 0]);
    const tail = tb.mesh(); tail.position.set(0.15, 1, -6.4); root.add(tail);
    return { root, rotor, tail, cols: [c, 0x2a4a6a, 0x222226] };
  }

  // ============================================================
  //  FACES — eyes and eyebrows (for the dino)
  // ============================================================
  function makeEye(parent, pos, r, irisColor, lidMat) {
    const e = grp(parent, pos);
    P(e, G.sphere(), M.eyeWhite(), [0, 0, 0], [r, r, r * 0.85]);
    const look = grp(e);
    P(look, G.sphere(), C(irisColor, 0.2), [0, 0, r * 0.58], [r * 0.6, r * 0.6, r * 0.34]);
    P(look, G.sphere(), M.pupil(), [0, 0, r * 0.72], [r * 0.32, r * 0.32, r * 0.22]);
    P(look, G.sphere(true), M.glint(), [r * 0.2, r * 0.24, r * 0.84], r * 0.13);
    const lid = P(e, G.hemi(), lidMat, [0, 0, 0], [r * 1.1, r * 1.1, r * 1.0]);
    lid.rotation.x = -0.9;
    e.userData = { lid, look, r };
    return e;
  }
  function makeBrow(parent, pos, len, thick, mat, side) {
    const b = grp(parent, pos);
    P(b, G.cap(thick, len), mat, [0, 0, 0], 1, [0, 0, PI / 2]);
    b.userData = { side, y0: pos[1] };
    return b;
  }

  // ============================================================
  //  THE T-REX!
  //  About 1.6 m tall when it's a baby (the game makes it bigger).
  //  It looks towards +z.
  // ============================================================
  const SKINS = [
    { id: 'green', name: 'Classic Green', base: '#5cc15a', dark: '#3a8a3a', belly: '#f0e8a8', eye: 0xe8a818, stars: 0 },
    { id: 'pink', name: 'Bubblegum Pink', base: '#ff8ac8', dark: '#e05aa0', belly: '#ffe8f4', eye: 0x4a8ae8, pattern: 'spots', stars: 0 },
    { id: 'blue', name: 'Tiger Blue', base: '#4a9aff', dark: '#1a4ab0', belly: '#d8ecff', eye: 0xffc020, pattern: 'stripes', stars: 1 },
    { id: 'zombie', name: 'Zombie Dino', base: '#8aa870', dark: '#5a7a4a', belly: '#c8c8a0', eye: 0xff3a3a, pattern: 'zombie', stars: 3 },
    { id: 'gold', name: 'Golden King', base: '#ffc830', dark: '#c89018', belly: '#fff0b0', eye: 0x3a2a8a, pattern: 'sparkle', stars: 5, metal: true },
    { id: 'rainbow', name: 'Rainbow Rex', base: '#ffffff', dark: '#888888', belly: '#ffffff', eye: 0x8a3ae8, stars: 7 },
    { id: 'robo', name: 'Robo Rex', base: '#b8c4d4', dark: '#2a5ad8', belly: '#e8eef8', eye: 0xff2a2a, pattern: 'circuit', metal: true, stars: 0, secret: 'robo' },
  ];
  const HATS = [
    { id: 'none', name: 'No Hat', stars: 0 },
    { id: 'party', name: 'Party Hat', stars: 0 },
    { id: 'shades', name: 'Cool Shades', stars: 1 },
    { id: 'cowboy', name: 'Cowboy Hat', stars: 2 },
    { id: 'propeller', name: 'Propeller Cap', stars: 3 },
    { id: 'chef', name: 'Chef Hat', stars: 4 },
    { id: 'flowers', name: 'Flower Crown', stars: 5 },
    { id: 'crown', name: 'Royal Crown', stars: 6 },
    { id: 'agent', name: 'FBI Agent Hat', stars: 0, secret: 'agent' },
  ];

  function dino(skinId = 'green', hatId = 'none') {
    const skin = SKINS.find((s) => s.id === skinId) || SKINS[0];
    const skinMat = std('dskin' + skin.id, { map: T.dinoSkin(skin), roughness: skin.metal ? 0.3 : 0.55, metalness: skin.metal ? 0.65 : 0 });
    const bellyMat = C(new THREE.Color(skin.belly).getHex(), 0.6);
    const darkMat = C(new THREE.Color(skin.dark).getHex(), 0.5, skin.metal ? 0.6 : 0);
    const clawMat = C(0xf8f0e0, 0.35);
    const root = new THREE.Group();
    const R = {};
    const body = R.body = grp(root, [0, 0.9, 0]);
    // body
    P(body, G.sphere(), skinMat, [0, 0.12, 0.05], [0.44, 0.46, 0.74], [-0.2, 0, 0]);
    P(body, G.sphere(), bellyMat, [0, 0.0, 0.25], [0.33, 0.34, 0.5], [-0.2, 0, 0]);
    // spikes along the back
    for (let i = 0; i < 5; i++) P(body, G.cone(6), darkMat, [0, 0.55 - i * 0.02 - Math.abs(i - 1.5) * 0.03, 0.45 - i * 0.22], [0.07, 0.16, 0.1], [-0.2, 0, 0]);
    // neck + head
    const neck = R.neck = grp(body, [0, 0.35, 0.55]);
    P(neck, G.sphere(), skinMat, [0, 0.08, 0.08], [0.27, 0.34, 0.3], [0.4, 0, 0]);
    const head = R.head = grp(neck, [0, 0.32, 0.2]);
    P(head, G.sphere(), skinMat, [0, 0.14, 0.1], [0.34, 0.31, 0.4]);
    P(head, G.sphere(), skinMat, [0, 0.07, 0.42], [0.27, 0.2, 0.32]);
    for (const sx of [-1, 1]) P(head, G.sphere(true), M.pupil(), [sx * 0.08, 0.16, 0.7], [0.035, 0.025, 0.02]);
    // upper teeth
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) P(head, G.cone(5), M.teeth(), [sx * (0.21 - i * 0.02), -0.09, 0.28 + i * 0.09], [0.028, 0.07, 0.028], [PI, 0, 0]);
    P(head, G.cone(5), M.teeth(), [0.05, -0.08, 0.7], [0.03, 0.07, 0.03], [PI, 0, 0]);
    P(head, G.cone(5), M.teeth(), [-0.05, -0.08, 0.7], [0.03, 0.07, 0.03], [PI, 0, 0]);
    // eyes
    R.eyes = [];
    for (const sx of [-1, 1]) {
      const e = makeEye(head, [sx * 0.2, 0.28, 0.3], 0.115, skin.eye, skinMat);
      e.rotation.y = sx * 0.35;
      R.eyes.push(e);
    }
    R.brows = [];
    for (const sx of [-1, 1]) { const b = makeBrow(head, [sx * 0.2, 0.42, 0.33], 0.1, 0.03, darkMat, sx); b.rotation.y = sx * 0.35; R.brows.push(b); }
    // jaw (opens to bite & roar)
    const jaw = R.jaw = grp(head, [0, -0.02, 0.05]);
    P(jaw, G.sphere(), skinMat, [0, -0.1, 0.32], [0.25, 0.1, 0.38]);
    P(jaw, G.sphere(), M.mouth(), [0, -0.04, 0.32], [0.22, 0.05, 0.34]);
    P(jaw, G.sphere(), M.tongue(), [0, -0.02, 0.28], [0.13, 0.04, 0.22]);
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) P(jaw, G.cone(5), M.teeth(), [sx * (0.19 - i * 0.02), 0, 0.3 + i * 0.09], [0.025, 0.06, 0.025]);
    R.hat = grp(head, [0, 0.42, 0.12]);
    // tiny arms (so funny!)
    R.arms = [];
    for (const sx of [-1, 1]) {
      const a = grp(body, [sx * 0.27, 0.12, 0.6], [0.5, 0, sx * -0.2]);
      P(a, G.cap(0.055, 0.14), skinMat, [0, -0.08, 0]);
      const lower = grp(a, [0, -0.17, 0], [-0.9, 0, 0]);
      P(lower, G.cap(0.045, 0.12), skinMat, [0, -0.07, 0]);
      for (const cx of [-0.025, 0.025]) P(lower, G.cone(5), clawMat, [cx, -0.17, 0.02], [0.018, 0.06, 0.018], [PI, 0, 0]);
      R.arms.push(a);
    }
    // tail (a chain of pieces that wiggle)
    R.tail = [];
    let parent = body, pos = [0, 0.12, -0.58];
    const tr = [0.33, 0.26, 0.19, 0.13, 0.08], tl = [0.46, 0.42, 0.38, 0.34, 0.3];
    for (let i = 0; i < 5; i++) {
      const seg = grp(parent, pos, [i === 0 ? 0.12 : 0.04, 0, 0]);
      P(seg, G.sphere(), skinMat, [0, 0, -tl[i] / 2], [tr[i], tr[i] * 0.95, tl[i] * 0.65]);
      if (i < 4) P(seg, G.cone(6), darkMat, [0, tr[i] * 0.9, -tl[i] / 2], [0.05, 0.12 - i * 0.015, 0.08]);
      R.tail.push(seg);
      parent = seg; pos = [0, 0, -tl[i]];
    }
    // legs
    R.legs = [];
    for (const sx of [-1, 1]) {
      const leg = grp(body, [sx * 0.27, -0.02, -0.08]);
      P(leg, G.sphere(), skinMat, [sx * 0.03, -0.12, 0.03], [0.2, 0.3, 0.26]);
      const shin = grp(leg, [0, -0.35, -0.04]);
      P(shin, G.cap(0.09, 0.26), skinMat, [0, -0.17, 0]);
      const foot = grp(shin, [0, -0.44, 0.02]);
      P(foot, G.sphere(), skinMat, [0, 0.02, 0.1], [0.15, 0.08, 0.23]);
      for (const cx of [-0.08, 0, 0.08]) P(foot, G.cone(5), clawMat, [cx, 0.0, 0.32], [0.03, 0.08, 0.03], [PI / 2, 0, 0]);
      R.legs.push({ leg, shin, foot });
    }
    root.userData.R = R;
    root.userData.skin = skin;
    setHat(root, hatId);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    return root;
  }

  // put a hat (or glasses) on the dino
  function setHat(dinoRoot, hatId) {
    const R = dinoRoot.userData.R;
    while (R.hat.children.length) R.hat.remove(R.hat.children[0]);
    R.propeller = null;
    const b = new Builder();
    if (hatId === 'party') {
      for (let i = 0; i < 4; i++) b.cylT(0.2 - (i + 1) * 0.045, 0.2 - i * 0.045, 0.14, i % 2 ? 0xffd23a : 0xff4a8a, [0, 0.07 + i * 0.14, 0]);
      b.sph(0.06, 0.06, 0.06, 0x3ad8ff, [0, 0.6, 0]);
      for (let i = 0; i < 6; i++) b.sph(0.02, 0.02, 0.02, BRIGHT[i], [Math.cos(i) * 0.14, 0.12 + (i % 3) * 0.12, Math.sin(i) * 0.14], null, true);
    } else if (hatId === 'shades') {
      for (const sx of [-1, 1]) b.cyl(0.1, 0.03, 0x121216, [sx * 0.2, -0.13, 0.25], [PI / 2, sx * 0.35, 0]).cyl(0.08, 0.01, 0x3a3a50, [sx * 0.205, -0.13, 0.268], [PI / 2, sx * 0.35, 0]);
      b.box(0.2, 0.025, 0.025, 0x121216, [0, -0.1, 0.33]);
      for (const sx of [-1, 1]) b.box(0.02, 0.025, 0.3, 0x121216, [sx * 0.3, -0.1, 0.1]);
    } else if (hatId === 'cowboy') {
      b.cyl(0.46, 0.03, 0x8a5a2a, [0, 0.02, 0], [0.1, 0, 0], 20).cylT(0.19, 0.24, 0.26, 0x8a5a2a, [0, 0.15, 0], null, 16).cyl(0.245, 0.06, 0x3a2410, [0, 0.07, 0], null, 16);
      b.torus(0.4, 0.035, 0x8a5a2a, [0, 0.05, 0], [PI / 2, 0, 0]);
    } else if (hatId === 'propeller') {
      const cols = [0xff4a4a, 0xffd23a, 0x3aa8ff, 0x4ad86a];
      for (let i = 0; i < 4; i++) b.add(G.ballSlice(i, 4), cols[i], [0, 0, 0], [0.26, 0.18, 0.26]);
      b.cyl(0.25, 0.02, 0x3aa8ff, [0, 0.0, 0.2], [0.2, 0, 0], 12);
      b.cyl(0.015, 0.14, 0x888888, [0, 0.24, 0]);
      const pb = new Builder();
      pb.box(0.5, 0.015, 0.07, 0xff4a4a, [0, 0, 0], [0.3, 0, 0]).sph(0.035, 0.03, 0.035, 0xffd23a, [0, 0, 0]);
      const prop = pb.mesh();
      prop.position.y = 0.31;
      R.hat.add(prop);
      R.propeller = prop;
    } else if (hatId === 'chef') {
      b.cyl(0.2, 0.22, 0xffffff, [0, 0.11, 0], null, 16);
      for (let i = 0; i < 5; i++) b.sph(0.13, 0.12, 0.13, 0xffffff, [Math.cos(i * 1.26) * 0.11, 0.3, Math.sin(i * 1.26) * 0.11]);
      b.sph(0.14, 0.14, 0.14, 0xffffff, [0, 0.36, 0]);
    } else if (hatId === 'flowers') {
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * PI * 2, x = Math.cos(a) * 0.25, z = Math.sin(a) * 0.28;
        b.sph(0.03, 0.02, 0.03, 0x3a9a3a, [x, 0, z]);
        const c = [0xff7ab8, 0xffffff, 0xffd23a][i % 3];
        for (let k = 0; k < 5; k++) b.sph(0.035, 0.015, 0.035, c, [x + Math.cos(k * 1.26) * 0.04, 0.03, z + Math.sin(k * 1.26) * 0.04], null, true);
        b.sph(0.022, 0.02, 0.022, 0xffa81a, [x, 0.045, z], null, true);
      }
    } else if (hatId === 'agent') {
      // a black hat AND secret-agent sunglasses
      b.cyl(0.36, 0.025, 0x16161c, [0, 0.02, 0], [0.12, 0, 0], 20).cylT(0.2, 0.22, 0.2, 0x16161c, [0, 0.13, 0], null, 16).cyl(0.225, 0.05, 0x3a3a44, [0, 0.06, 0], null, 16);
      for (const sx of [-1, 1]) b.cyl(0.1, 0.03, 0x08080a, [sx * 0.2, -0.13, 0.25], [PI / 2, sx * 0.35, 0]);
      b.box(0.2, 0.025, 0.025, 0x08080a, [0, -0.1, 0.33]);
    } else if (hatId === 'crown') {
      b.cyl(0.22, 0.12, 0xffc830, [0, 0.06, 0], null, 16);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * PI * 2;
        b.cone(0.05, 0.14, 0xffc830, [Math.cos(a) * 0.19, 0.19, Math.sin(a) * 0.19], null, 5).sph(0.025, 0.025, 0.025, 0xffe890, [Math.cos(a) * 0.19, 0.27, Math.sin(a) * 0.19], null, true);
        b.sph(0.03, 0.035, 0.015, [0xff3a5a, 0x3a8aff, 0x3ae86a][i % 3], [Math.cos(a) * 0.222, 0.06, Math.sin(a) * 0.222], [0, -a + PI / 2, 0], true);
      }
    }
    if (b.parts.length) { const m = b.mesh(); m.castShadow = true; R.hat.add(m); }
    // the crown needs to shine!
    if (hatId === 'crown' || dinoRoot.userData.skin.metal) R.hat.children.forEach((m) => { if (m.material === propMat()) m.material = std('propShiny', { vertexColors: true, map: T.windowTile(), roughness: 0.3, metalness: 0.7 }); });
  }

  // ============================================================
  //  DINO ANIMATION
  //  s = { walk (0..2), air, bite (0..1), roar (0..1), whip (0..1), flop, eat (0..1), look }
  // ============================================================
  function animateDino(d, dt, s) {
    const R = d.userData.R;
    const ud = d.userData;
    ud.t = (ud.t || 0) + dt;
    ud.phase = (ud.phase || 0) + dt * (s.walk > 0.05 ? 3 + s.walk * 5 : 0) * (s.rate || 1);
    const t = ud.t, ph = ud.phase, w = U.clamp(s.walk, 0, 1.6);
    const k = Math.min(1, dt * 12);
    // legs
    let lt = [0, 0], st = [0, 0], ft = [0, 0];
    if (s.air || s.flop) {
      lt = [-0.7, -0.5]; st = [1.1, 0.9]; ft = [-0.4, -0.3];
      if (s.flop) { lt = [0.9, 0.9]; st = [0.3, 0.3]; ft = [0.3, 0.3]; }
    } else if (w > 0.05) {
      for (let i = 0; i < 2; i++) {
        const p = ph + i * PI;
        lt[i] = Math.sin(p) * 0.65 * Math.min(1, w);
        st[i] = Math.max(0, -Math.cos(p)) * 0.9 * Math.min(1, w);
        ft[i] = -lt[i] * 0.6;
      }
    }
    R.legs.forEach((L, i) => {
      L.leg.rotation.x += (-lt[i] - L.leg.rotation.x) * k;
      L.shin.rotation.x += (st[i] - L.shin.rotation.x) * k;
      L.foot.rotation.x += (ft[i] + lt[i] * 0.4 - L.foot.rotation.x) * k;
    });
    // body bob & lean
    const bob = w > 0.05 && !s.air ? Math.abs(Math.cos(ph)) * 0.06 * Math.min(1, w) : Math.sin(t * 2) * 0.012;
    R.body.position.y = 0.9 + bob - (s.flop ? 0.1 : 0);
    let pitch = w * 0.12 + (s.air ? -0.15 : 0) + (s.flop ? 1.0 : 0);
    if (s.roar > 0) pitch -= Math.sin(Math.min(1, s.roar * 3) * PI / 2) * 0.25 * (s.roar < 0.85 ? 1 : (1 - s.roar) / 0.15);
    R.body.rotation.x += (pitch - R.body.rotation.x) * k;
    R.body.rotation.z = w > 0.05 ? Math.sin(ph) * 0.05 * w : 0;
    // neck & head
    let neckX = -Math.sin(ph * 2) * 0.04 * w - w * 0.1, jaw = 0.04 + Math.max(0, Math.sin(t * 0.9)) * 0.03;
    let headShake = 0;
    if (s.bite > 0) {
      const b = s.bite;
      neckX = b < 0.35 ? -0.35 * (b / 0.35) : b < 0.55 ? 0.45 : 0.45 * (1 - (b - 0.55) / 0.45);
      jaw = b < 0.35 ? 0.8 * (b / 0.35) : b < 0.45 ? 0.8 * (1 - (b - 0.35) / 0.1) : 0;
    }
    if (s.eat > 0) { jaw = Math.abs(Math.sin(s.eat * PI * 6)) * 0.45; neckX = 0.15; }
    if (s.roar > 0) {
      const r = s.roar;
      const open = r < 0.15 ? r / 0.15 : r < 0.85 ? 1 : (1 - r) / 0.15;
      neckX = -0.7 * open; jaw = 1.0 * open;
      headShake = Math.sin(t * 40) * 0.08 * open;
    }
    if (s.air) neckX += 0.15;
    if (s.flop) neckX = -0.6;
    if (s.dizzy) { neckX = 0.2 + Math.sin(t * 5) * 0.15; headShake = Math.sin(t * 7) * 0.35; jaw = 0.35; }
    R.neck.rotation.x += (neckX - R.neck.rotation.x) * k;
    R.head.rotation.z = headShake;
    R.head.rotation.y = s.look || 0;
    R.jaw.rotation.x += (jaw - R.jaw.rotation.x) * Math.min(1, dt * 25);
    // tail wags, and follows when turning
    R.tail.forEach((seg, i) => {
      let yaw = Math.sin(t * (w > 0.05 ? 5 : 1.6) - i * 0.7) * (0.08 + i * 0.03) * (w > 0.05 ? 1.4 : 1) + (s.turn || 0) * 0.12 * (i + 1) * 0.3;
      let px = (i === 0 ? 0.12 : 0.04) + (s.air ? -0.08 : 0) + (s.flop ? -0.2 : 0) - (s.roar > 0 ? 0.06 : 0);
      if (s.whip > 0) { yaw = 0; px = i === 0 ? 0.25 : -0.02; }
      seg.rotation.y += (yaw - seg.rotation.y) * k;
      seg.rotation.x += (px - seg.rotation.x) * k;
    });
    // tiny arms wiggle
    R.arms.forEach((a, i) => {
      const wig = s.roar > 0 || s.flop ? Math.sin(t * 30 + i * 2) * 0.5 : Math.sin(t * 3 + i) * 0.1 + (w > 0.05 ? Math.sin(ph + i * PI) * 0.3 : 0);
      a.rotation.x = 0.5 + wig + (s.eat > 0 ? -0.8 : 0);
    });
    // eyes blink, brows get angry when roaring
    const blinkT = (t + 1.3) % 3.4;
    const blink = blinkT < 0.13 ? Math.sin(blinkT / 0.13 * PI) : 0;
    const squint = s.roar > 0 ? 0.35 : s.eat > 0 ? 0.5 : 0;
    R.eyes.forEach((e) => { e.userData.lid.rotation.x = U.lerp(-0.9 + squint, 1.5, blink); });
    R.brows.forEach((b) => {
      const angry = s.roar > 0 || s.bite > 0 || s.whip > 0;
      b.rotation.z += ((angry ? -0.45 * b.userData.side : s.eat > 0 ? 0.25 * b.userData.side : 0) - b.rotation.z) * k;
      b.position.y = b.userData.y0 + (angry ? -0.03 : 0);
    });
    if (R.propeller) R.propeller.rotation.y += dt * (8 + w * 20);
  }

  // ============================================================
  //  PEOPLE (little, colorful and very scared)
  // ============================================================
  const PEOPLE = [];
  function makePeopleStyles() {
    const r = U.seeded(99);
    const skins = [0xf8d0b0, 0xe8b890, 0xc88a60, 0x9a6a48, 0x6a4a30];
    const hairs = [0x2a1a10, 0x6a3a1a, 0xe8c060, 0xc84a2a, 0x1a1a1a, 0xd8d8d8];
    for (let i = 0; i < 18; i++) {
      const sk = pickR(r, skins), shirt = pickR(r, [...BRIGHT, 0xf6f4ee, 0x3a5a8a]), pants = pickR(r, [0x3a4a8a, 0x2a2a30, 0x8a6a4a, 0x5a5a62, 0xd8c8a0]);
      const hair = pickR(r, hairs), hairType = Math.floor(r() * 4), dress = r() < 0.25;
      const body = new Builder();
      body.rbox(0.42, 0.55, 0.26, 0.1, shirt, [0, 1.15, 0]);
      if (dress) body.cylT(0.2, 0.34, 0.45, shirt, [0, 0.82, 0]);
      else body.rbox(0.38, 0.22, 0.24, 0.06, pants, [0, 0.9, 0]);
      body.sph(0.17, 0.18, 0.17, sk, [0, 1.6, 0]);
      body.sph(0.02, 0.028, 0.02, 0x121216, [0.06, 1.63, 0.155]).sph(0.02, 0.028, 0.02, 0x121216, [-0.06, 1.63, 0.155]);
      body.sph(0.03, 0.03, 0.03, sk, [0, 1.58, 0.17]);
      if (hairType === 0) body.sph(0.18, 0.12, 0.18, hair, [0, 1.68, -0.02]);
      else if (hairType === 1) body.sph(0.19, 0.2, 0.19, hair, [0, 1.62, -0.05]).sph(0.18, 0.08, 0.18, hair, [0, 1.71, 0]);
      else if (hairType === 2) body.cyl(0.18, 0.1, pickR(r, [COL.red, COL.blue, COL.green]), [0, 1.72, 0]).box(0.2, 0.03, 0.18, pickR(r, [COL.red, COL.blue]), [0, 1.69, 0.14]);
      else body.cyl(0.3, 0.02, 0xf0e0a0, [0, 1.72, 0]).cylT(0.13, 0.17, 0.14, 0xf0e0a0, [0, 1.78, 0]);
      const arm = new Builder();
      arm.rbox(0.13, 0.25, 0.13, 0.05, shirt, [0, -0.1, 0]).cyl(0.045, 0.35, sk, [0, -0.35, 0]).sph(0.06, 0.06, 0.06, sk, [0, -0.55, 0]);
      const leg = new Builder();
      if (dress) leg.cyl(0.05, 0.75, sk, [0, -0.4, 0]); else leg.rbox(0.14, 0.75, 0.14, 0.05, pants, [0, -0.4, 0]);
      leg.rbox(0.13, 0.08, 0.24, 0.03, pickR(r, [0x2a2a2a, COL.white, COL.red, 0x8a5a2a]), [0, -0.8, 0.04]);
      PEOPLE.push({ body: body.geometry(), arm: arm.geometry(), leg: leg.geometry(), kid: r() < 0.25 });
    }
  }
  // an FBI agent: black suit, black tie, sunglasses
  let AGENT = null;
  function makeAgent() {
    const sk = 0xe8b890, suit = 0x18181e;
    const body = new Builder();
    body.rbox(0.44, 0.56, 0.27, 0.1, suit, [0, 1.15, 0]).box(0.12, 0.4, 0.02, COL.white, [0, 1.22, 0.135]).box(0.05, 0.34, 0.02, 0x101014, [0, 1.2, 0.147]);
    body.rbox(0.38, 0.22, 0.24, 0.06, suit, [0, 0.9, 0]);
    body.sph(0.17, 0.18, 0.17, sk, [0, 1.6, 0]).sph(0.18, 0.1, 0.18, 0x1a1a1a, [0, 1.69, -0.02]);
    body.box(0.24, 0.06, 0.04, 0x050508, [0, 1.63, 0.16]).cyl(0.012, 0.15, 0xd8d8d8, [0.17, 1.52, 0], [0.4, 0, 0]);
    body.sph(0.03, 0.03, 0.03, sk, [0, 1.56, 0.17]);
    const arm = new Builder();
    arm.rbox(0.13, 0.3, 0.13, 0.05, suit, [0, -0.12, 0]).cyl(0.05, 0.3, suit, [0, -0.38, 0]).sph(0.06, 0.06, 0.06, sk, [0, -0.56, 0]);
    const leg = new Builder();
    leg.rbox(0.14, 0.75, 0.14, 0.05, suit, [0, -0.4, 0]).rbox(0.13, 0.08, 0.26, 0.03, 0x050508, [0, -0.8, 0.05]);
    AGENT = { body: body.geometry(), arm: arm.geometry(), leg: leg.geometry(), kid: false };
  }
  function person(style) {
    if (!PEOPLE.length) makePeopleStyles();
    if (style === 'agent' && !AGENT) makeAgent();
    const st = style === 'agent' ? AGENT : PEOPLE[style % PEOPLE.length];
    const mat = propMat();
    const root = new THREE.Group();
    const body = new THREE.Mesh(st.body, mat); root.add(body);
    const mouth = new THREE.Mesh(G.sphere(true), C(0x3a0a14, 0.5)); mouth.position.set(0, 1.52, 0.16); mouth.scale.set(0.05, 0.02, 0.03); root.add(mouth);
    const arms = [], legs = [];
    for (const sx of [-1, 1]) {
      const a = new THREE.Mesh(st.arm, mat); a.position.set(sx * 0.27, 1.38, 0); root.add(a); arms.push(a);
      const l = new THREE.Mesh(st.leg, mat); l.position.set(sx * 0.1, 0.84, 0); root.add(l); legs.push(l);
    }
    root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    blobShadow(root, 0.35);
    root.userData = { arms, legs, mouth, kid: st.kid, t: Math.random() * 10 };
    if (st.kid) root.scale.setScalar(0.65);
    return root;
  }
  // s = { speed, panic, wave, happy }
  function animatePerson(p, dt, s) {
    const ud = p.userData;
    ud.t += dt;
    ud.ph = (ud.ph || 0) + dt * (2 + s.speed * 3.2);
    const sw = Math.sin(ud.ph) * Math.min(1, s.speed / 1.5) * 0.8;
    ud.legs[0].rotation.x = sw; ud.legs[1].rotation.x = -sw;
    if (s.panic) {
      ud.arms[0].rotation.x = -2.8 + Math.sin(ud.t * 22) * 0.35; ud.arms[1].rotation.x = -2.8 + Math.cos(ud.t * 25) * 0.35;
      ud.arms[0].rotation.z = -0.4; ud.arms[1].rotation.z = 0.4;
      ud.mouth.scale.set(0.05, 0.07, 0.03);
    } else if (s.wave) {
      ud.arms[0].rotation.x = -sw * 0.8; ud.arms[1].rotation.x = -2.7; ud.arms[1].rotation.z = 0.3 + Math.sin(ud.t * 10) * 0.35; ud.arms[0].rotation.z = 0;
      ud.mouth.scale.set(0.065, 0.03, 0.03);
    } else {
      ud.arms[0].rotation.x = -sw * 0.8; ud.arms[1].rotation.x = sw * 0.8; ud.arms[0].rotation.z = ud.arms[1].rotation.z = 0;
      ud.mouth.scale.set(0.05, 0.02, 0.03);
    }
  }

  return {
    C, M, G, P, grp, std, glowMat, propMat, blobShadow, Builder, COL, BRIGHT,
    PROPS, prop, dino, setHat, animateDino, SKINS, HATS, person, animatePerson, unitTank, unitJeep, unitHeli,
  };
})();
