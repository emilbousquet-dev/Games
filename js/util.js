// ============================================================
//  LAB 13 — small helper functions used everywhere
// ============================================================
window.LAB = window.LAB || {};

LAB.CELL = 2.5;      // size of one map square in meters
LAB.WALL_H = 3.2;    // height of the walls

// graphics quality (LOW = faster on old computers)
LAB.lowGfx = (() => { try { return localStorage.getItem('lab13.gfx') === 'low' || location.search.includes('low'); } catch (e) { return false; } })();

LAB.U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  rand: (a, b) => a + Math.random() * (b - a),
  randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  dist: (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz),

  // smallest signed difference between two angles
  angleDiff(a, b) {
    let d = b - a;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  },

  // a random generator that always gives the same numbers for the same seed
  seeded(seed) {
    let s = seed >>> 0;
    return function () {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  // map square <-> world position
  cellToWorld: (c) => c * LAB.CELL + LAB.CELL / 2,
  worldToCell: (w) => Math.floor(w / LAB.CELL),

  // make a canvas and let a function draw on it
  canvas(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    draw(g, w, h);
    return c;
  },

  // glue many geometries into one (they must already be moved into place)
  mergeGeometries(geos) {
    let n = 0;
    geos.forEach((g) => (n += g.attributes.position.count));
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o3 = 0, o2 = 0;
    for (const g of geos) {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array, o3);
      nor.set(g.attributes.normal.array, o3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, o2);
      o3 += c * 3; o2 += c * 2;
      g.dispose();
    }
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    bg.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    bg.computeBoundingSphere();
    return bg;
  },

  // inside a model, glue together meshes that share a material and never move
  // on their own (moving parts are groups, so animation still works)
  optimize(root) {
    const visit = (node) => {
      const byMat = new Map();
      for (const m of node.children) {
        if (!m.isMesh || m.children.length || m.userData.keep || m.isInstancedMesh) continue;
        if (!byMat.has(m.material)) byMat.set(m.material, []);
        byMat.get(m.material).push(m);
      }
      for (const [mat, list] of byMat) {
        if (list.length < 2) continue;
        const geos = list.map((m) => {
          const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
          m.updateMatrix();
          g.applyMatrix4(m.matrix);
          return g;
        });
        const mesh = new THREE.Mesh(LAB.U.mergeGeometries(geos), mat);
        mesh.castShadow = list[0].castShadow; mesh.receiveShadow = true;
        mesh.layers.mask = list[0].layers.mask;
        list.forEach((m) => node.remove(m));
        node.add(mesh);
      }
      node.children.slice().forEach((c) => { if (!c.isMesh || c.children.length) visit(c); });
    };
    visit(root);
    return root;
  },

  // turn a canvas drawing into a 3D texture
  tex(canvas, repeatX = 1, repeatY = 1) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = 4;
    return t;
  },
};
