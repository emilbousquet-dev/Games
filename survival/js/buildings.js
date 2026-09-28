// ============================================================
//  DEAD ACRES — BUILDINGS
//  Houses, the store, the police station, the gas station,
//  the barn, the cabin, the radio tower, cars and street stuff.
//  All the walls that never move are glued into a few big
//  meshes so the game stays fast.
// ============================================================
window.DA = window.DA || {};

DA.Buildings = (function () {
  const U = DA.U, Mo = DA.Models, T = DA.Tex, C = DA.Collide, MAP = DA.MAP;
  const PI2 = Math.PI / 2;
  let W, batch;

  // ---------- materials ----------
  const cache = {};
  const mat = (key, make) => cache[key] || (cache[key] = make());
  const MAT = {
    siding: (color) => mat('siding' + color, () => new THREE.MeshStandardMaterial({ map: T.siding(), color, roughness: 0.85 })),
    brick: () => mat('brick', () => new THREE.MeshStandardMaterial({ map: T.brick(), roughness: 0.9 })),
    roof: () => mat('roof', () => new THREE.MeshStandardMaterial({ map: T.roof(), roughness: 0.9 })),
    metalRoof: () => mat('metalRoof', () => new THREE.MeshStandardMaterial({ map: T.metalRoof(), roughness: 0.5, metalness: 0.5 })),
    wallpaper: (color = 0xffffff) => mat('wallpaper' + color, () => new THREE.MeshStandardMaterial({ map: T.wallpaper(), color, roughness: 0.9 })),
    woodFloor: () => mat('woodFloor', () => new THREE.MeshStandardMaterial({ map: T.woodFloor(), roughness: 0.8 })),
    tiles: () => mat('tiles', () => new THREE.MeshStandardMaterial({ map: T.tiles(), roughness: 0.6 })),
    concrete: () => mat('concrete', () => new THREE.MeshStandardMaterial({ map: T.concrete(), roughness: 0.95 })),
    barn: () => mat('barn', () => new THREE.MeshStandardMaterial({ map: T.planks('barnPlanks', [150, 44, 32], true), roughness: 0.9 })),
    cabin: () => mat('cabin', () => new THREE.MeshStandardMaterial({ map: T.planks('cabinPlanks', [110, 76, 48], false), roughness: 0.9 })),
    ceiling: () => mat('ceiling', () => new THREE.MeshStandardMaterial({ color: 0xc8c4b8, roughness: 1 })),
    trim: () => mat('trim', () => new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.7 })),
    darkTrim: () => mat('darkTrim', () => new THREE.MeshStandardMaterial({ color: 0x3a342c, roughness: 0.8 })),
    glass: () => Mo.M.glass(),
  };
  const SIDING_COLORS = [0xe8e4d8, 0xa8c0d0, 0xe0d090, 0xa8c098, 0xc89080, 0xd8b8b8];

  // ---------- batching: glue geometry together by material ----------
  function put(material, geo) {
    let b = batch.get(material);
    if (!b) { b = []; batch.set(material, b); }
    b.push(geo.index ? geo.toNonIndexed() : geo);
  }
  function flush(scene) {
    for (const [material, geos] of batch) {
      // big towns = many pieces: split into chunks so far away parts can be skipped
      const chunks = new Map();
      for (const g of geos) {
        g.computeBoundingBox();
        const cx = Math.floor((g.boundingBox.min.x + g.boundingBox.max.x) / 2 / 60), cz = Math.floor((g.boundingBox.min.z + g.boundingBox.max.z) / 2 / 60);
        const k = cx + ',' + cz;
        if (!chunks.has(k)) chunks.set(k, []);
        chunks.get(k).push(g);
      }
      for (const list of chunks.values()) {
        const m = new THREE.Mesh(U.mergeGeometries(list), material);
        m.castShadow = true; m.receiveShadow = true;
        m.matrixAutoUpdate = false;
        scene.add(m);
      }
    }
    batch.clear();
  }

  // ============================================================
  //  A building: turns "local" spots (inside the building) into
  //  world spots, and adds walls, props and colliders.
  // ============================================================
  class Bld {
    constructor(def) {
      this.def = def;
      this.x = def.x; this.z = def.z;
      this.a = (def.rot || 0) * PI2;
      this.c = Math.cos(this.a); this.s = Math.sin(this.a);
      this.y = W.heightAt(def.x, def.z);
      this.hash = U.hash(Math.round(def.x), Math.round(def.z), 5);
    }
    wx(lx, lz) { return this.x + lx * this.c + lz * this.s; }
    wz(lx, lz) { return this.z - lx * this.s + lz * this.c; }
    // a textured box, textures repeat every "s" meters
    box(material, w, h, d, lx, ly, lz, ry = 0, s = 2.5, rx = 0) {
      const g = Mo.tbox(w, h, d, s);
      if (rx) g.rotateX(rx);
      g.rotateY(this.a + ry);
      g.translate(this.wx(lx, lz), this.y + ly, this.wz(lx, lz));
      put(material, g);
    }
    // a solid thing you bump into
    col(lx, lz, hw, hd, y0, y1, o = {}) {
      return C.add(Object.assign({ shape: 'box', x: this.wx(lx, lz), z: this.wz(lx, lz), hw, hd, rot: this.a + (o.ry || 0), y0: this.y + y0, y1: this.y + y1, kind: 'wall' }, o));
    }
    // a model (furniture...) glued into the world
    prop(group, lx, lz, ry = 0, o = {}) {
      group.position.set(this.wx(lx, lz), this.y + (o.y || 0), this.wz(lx, lz));
      group.rotation.y = this.a + ry;
      group.updateMatrixWorld(true);
      const box = new THREE.Box3();
      group.traverse((m) => {
        if (!m.isMesh) return;
        const g = m.geometry.clone();
        g.applyMatrix4(m.matrixWorld);
        put(m.material, g);
      });
      // measure it (without turning) for the collider
      group.rotation.y = 0; group.position.set(0, 0, 0); group.updateMatrixWorld(true);
      box.setFromObject(group);
      let col = null;
      if (o.solid !== false) {
        const hw = (box.max.x - box.min.x) / 2, hd = (box.max.z - box.min.z) / 2;
        const cx = (box.max.x + box.min.x) / 2, cz = (box.max.z + box.min.z) / 2;
        const rx = cx * Math.cos(ry) + cz * Math.sin(ry), rz = -cx * Math.sin(ry) + cz * Math.cos(ry);
        col = this.col(lx + rx, lz + rz, hw, hd, (o.y || 0) - 0.5, (o.y || 0) + box.max.y, { ry, kind: o.kind || 'prop', walk: !!o.walk });
      }
      if (o.loot) {
        const cont = {
          id: W.containers.length, loot: o.loot, name: o.name || 'Cupboard', radio: !!o.radio,
          x: this.wx(lx, lz), y: this.y + (o.y || 0) + box.max.y * 0.6, z: this.wz(lx, lz), slots: o.slots || 8,
        };
        W.containers.push(cont);
        if (col) { col.kind = 'container'; col.ref = cont; }
        else C.add({ shape: 'circle', x: cont.x, z: cont.z, r: 0.5, y0: this.y, y1: this.y + box.max.y, kind: 'container', ref: cont, solid: false });
      }
      return col;
    }
    pad(kind, lx, lz, w, d, lines) {
      const a = this.a;
      W.pads.push({ kind, x: this.wx(lx, lz), z: this.wz(lx, lz), hw: w / 2, hd: d / 2, c: Math.cos(a), s: Math.sin(a), lines });
    }

    // a straight wall from (x1,z1) to (x2,z2) with holes for doors and windows
    // out = +1/-1: which side is the outside (gets the outside material)
    wall(x1, z1, x2, z2, h, o = {}) {
      const alongX = Math.abs(z2 - z1) < 1e-6;
      const start = alongX ? Math.min(x1, x2) : Math.min(z1, z2);
      const L = alongX ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
      const holes = (o.holes || []).map((hh) => ({ t0: hh.at - hh.w / 2 - start, t1: hh.at + hh.w / 2 - start, y0: hh.door ? 0 : (hh.y0 ?? 0.95), y1: hh.y1 ?? (hh.door ? 2.2 : 2.0), door: !!hh.door })).sort((a, b) => a.t0 - b.t0);
      const pieces = [];
      let t = 0;
      for (const hh of holes) {
        if (hh.t0 > t) pieces.push([t, hh.t0, 0, h]);
        if (hh.y0 > 0) pieces.push([hh.t0, hh.t1, 0, hh.y0]);
        if (hh.y1 < h) pieces.push([hh.t0, hh.t1, hh.y1, h]);
        t = hh.t1;
      }
      if (t < L) pieces.push([t, L, 0, h]);
      const TH = 0.2;
      const place = (material, t0, t1, y0, y1, off, thick) => {
        const w = t1 - t0, mid = start + (t0 + t1) / 2;
        if (w <= 0.001 || y1 - y0 <= 0.001) return;
        if (alongX) this.box(material, w, y1 - y0, thick, mid, (y0 + y1) / 2, z1 + off);
        else this.box(material, thick, y1 - y0, w, x1 + off, (y0 + y1) / 2, mid);
      };
      for (const [t0, t1, y0, y1] of pieces) {
        if (o.out) {
          place(o.ext, t0, t1, y0, y1, o.out * TH / 4, TH / 2);
          place(o.int, t0, t1, y0, y1, -o.out * TH / 4, TH / 2);
        } else place(o.int, t0, t1, y0, y1, 0, TH);
      }
      // glass in the windows, frames around them
      for (const hh of holes) {
        if (hh.door) {
          if (o.trim !== false) { place(MAT.trim(), hh.t0 - 0.06, hh.t0, 0, hh.y1 + 0.06, 0, TH + 0.06); place(MAT.trim(), hh.t1, hh.t1 + 0.06, 0, hh.y1 + 0.06, 0, TH + 0.06); place(MAT.trim(), hh.t0, hh.t1, hh.y1, hh.y1 + 0.06, 0, TH + 0.06); }
          continue;
        }
        if (!o.broken || U.hash(Math.round(hh.t0 * 10), Math.round(this.x), 3) > 0.4) place(MAT.glass(), hh.t0, hh.t1, hh.y0, hh.y1, 0, 0.03);
        place(MAT.trim(), hh.t0 - 0.05, hh.t1 + 0.05, hh.y0 - 0.06, hh.y0, 0, TH + 0.08);
        place(MAT.trim(), hh.t0 - 0.05, hh.t1 + 0.05, hh.y1, hh.y1 + 0.05, 0, TH + 0.04);
      }
      // colliders: everything except the doors
      let c0 = 0;
      const addCol = (a, b) => {
        if (b - a < 0.01) return;
        const mid = start + (a + b) / 2;
        if (alongX) this.col(mid, z1, (b - a) / 2, TH / 2, -0.5, h);
        else this.col(x1, mid, TH / 2, (b - a) / 2, -0.5, h);
      };
      for (const hh of holes) {
        if (!hh.door) continue;
        addCol(c0, hh.t0);
        this.col(alongX ? start + (hh.t0 + hh.t1) / 2 : x1, alongX ? z1 : start + (hh.t0 + hh.t1) / 2, alongX ? (hh.t1 - hh.t0) / 2 : TH / 2, alongX ? TH / 2 : (hh.t1 - hh.t0) / 2, hh.y1, h);
        c0 = hh.t1;
      }
      addCol(c0, L);
    }

    // the 4 outside walls + floor + ceiling. holes = { front, back, left, right }
    shell(w, d, h, o) {
      const hw = w / 2, hd = d / 2;
      const opt = (holes) => ({ holes, out: 0, ext: o.ext, int: o.int, broken: true });
      this.wall(-hw, -hd, hw, -hd, h, Object.assign(opt(o.front), { out: -1 }));
      this.wall(-hw, hd, hw, hd, h, Object.assign(opt(o.back), { out: 1 }));
      this.wall(-hw, -hd + 0.1, -hw, hd - 0.1, h, Object.assign(opt(o.left), { out: -1 }));
      this.wall(hw, -hd + 0.1, hw, hd - 0.1, h, Object.assign(opt(o.right), { out: 1 }));
      if (o.floor !== false) {
        this.box(o.floor || MAT.woodFloor(), w - 0.1, 0.15, d - 0.1, 0, 0.075, 0, 0, 2);
        this.col(0, 0, hw, hd, -1, 0.15, { walk: true, kind: 'floor', hit: false, solid: true });
      }
      if (o.ceiling !== false) this.box(MAT.ceiling(), w - 0.2, 0.08, d - 0.2, 0, h - 0.04, 0);
    }

    // pointy roof, the top line goes along x
    gable(w, d, h, rise, over, roofMat, gableMat) {
      const half = d / 2 + over;
      const a = Math.atan2(rise, d / 2);
      const L = half / Math.cos(a);
      for (const sg of [-1, 1]) {
        const u = half / 2;
        this.box(roofMat, w + over * 2, 0.14, L, 0, h + rise - Math.tan(a) * u + 0.07, sg * u, 0, 2.5, sg * a);
      }
      // the triangles at both ends
      for (const sx of [-1, 1]) {
        const x = sx * (w / 2 - 0.02);
        const p = [[x, h, -d / 2], [x, h, d / 2], [x, h + rise, 0]];
        const pos = [], uv = [];
        const tri = sx > 0 ? [0, 2, 1] : [0, 1, 2];
        const tri2 = sx > 0 ? [0, 1, 2] : [0, 2, 1];
        for (const idx of [...tri, ...tri2]) {
          const [lx, ly, lz] = p[idx];
          pos.push(this.wx(lx, lz), this.y + ly, this.wz(lx, lz));
          uv.push(lz / 2.5, ly / 2.5);
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.computeVertexNormals();
        put(gableMat, g);
      }
    }

    // a flat roof with a little wall around it
    flatRoof(w, d, h, material) {
      this.box(material, w + 0.4, 0.3, d + 0.4, 0, h + 0.15, 0);
      this.box(material, w + 0.4, 0.5, 0.2, 0, h + 0.4, -d / 2 - 0.1);
      this.box(material, w + 0.4, 0.5, 0.2, 0, h + 0.4, d / 2 + 0.1);
      this.box(material, 0.2, 0.5, d + 0.4, -w / 2 - 0.1, h + 0.4, 0);
      this.box(material, 0.2, 0.5, d + 0.4, w / 2 + 0.1, h + 0.4, 0);
    }

    sign(text, bg, fg, lx, ly, lz, w, h, ry = 0) {
      const g = new THREE.PlaneGeometry(w, h);
      g.rotateY(this.a + ry + Math.PI);
      g.translate(this.wx(lx, lz), this.y + ly, this.wz(lx, lz));
      put(mat('signMat' + text, () => new THREE.MeshStandardMaterial({ map: T.sign(text, bg, fg), roughness: 0.7 })), g);
    }
    graffiti(text, lx, ly, lz, ry = 0, color) {
      const g = new THREE.PlaneGeometry(3, 0.75);
      g.rotateY(this.a + ry + Math.PI);
      g.translate(this.wx(lx, lz), this.y + ly, this.wz(lx, lz));
      put(mat('graf' + text, () => new THREE.MeshStandardMaterial({ map: T.graffiti(text, color), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 0.9 })), g);
    }
  }

  // ============================================================
  //  BUILDING TYPES
  //  (0,0) is the middle. The front door is on the -z side.
  // ============================================================
  const P = Mo.Props;
  const TYPES = {
    house(b) {
      const w = 8, d = 9, h = 2.8;
      const color = SIDING_COLORS[Math.floor(b.hash * SIDING_COLORS.length)];
      const ext = MAT.siding(color), int = MAT.wallpaper(b.hash > 0.5 ? 0xffffff : 0xd8e0e8);
      b.shell(w, d, h, {
        ext, int,
        front: [{ at: 0, w: 1.1, door: true }, { at: -2.4, w: 1.3 }, { at: 2.4, w: 1.3 }],
        back: [{ at: -2, w: 1.1 }, { at: 2.2, w: 1.1 }],
        left: [{ at: -2, w: 1.2 }, { at: 2.4, w: 1 }],
        right: [{ at: -2, w: 1.2 }, { at: 2.4, w: 1 }],
      });
      // inside walls: living room in front, bedroom (left) and kitchen (right) behind
      b.wall(-3.9, 1, 3.9, 1, h, { int, holes: [{ at: -2, w: 1, door: true }, { at: 2, w: 1, door: true }], trim: false });
      b.wall(0, 1.1, 0, 4.4, h, { int, trim: false });
      b.gable(w, d, h, 1.8, 0.5, MAT.roof(), ext);
      b.pad('concrete', 0, -d / 2 - 1.2, 1.6, 2.4);
      b.pad('concrete', 0, 0, w + 0.4, d + 0.4);
      // living room
      b.prop(P.sofa([0x6a3a3a, 0x3a4a6a, 0x5a5a3a][Math.floor(b.hash * 3)]), -2.2, -1.4, 0, { walk: true });
      b.prop(P.tv(), 2.8, -1.2, -PI2, { loot: 'closet', name: 'TV cabinet', slots: 6 });
      if (b.hash > 0.4) b.prop(P.chair(true), 1, -2.5, 0.8);
      // kitchen
      b.prop(P.counter(2.5), 2.2, 4.1, Math.PI, { loot: 'kitchen', name: 'Kitchen cupboard' });
      b.prop(P.fridge(), 3.4, 2.0, -PI2, { loot: 'fridge', name: 'Fridge' });
      b.prop(P.table(), 1.8, 2.4, 0, { walk: true });
      // bedroom
      b.prop(P.bed([0x6a7a9a, 0x9a6a6a, 0x6a9a7a][Math.floor(b.hash * 7) % 3]), -2.3, 3.2, Math.PI, { walk: true });
      b.prop(P.wardrobe(), -3.55, 1.9, PI2, { loot: 'closet', name: 'Wardrobe' });
      b.prop(P.cabinet(), -0.45, 3.5, -PI2, { loot: 'bathroom', name: 'Medicine cabinet', slots: 6 });
      if (b.hash < 0.3) b.graffiti('HELP US', 0, 1.6, -d / 2 - 0.12, 0);
    },

    bighouse(b) {
      const w = 11, d = 10, h = 2.8;
      const color = SIDING_COLORS[Math.floor(b.hash * SIDING_COLORS.length)];
      const ext = MAT.siding(color), int = MAT.wallpaper(0xf0e8d8);
      b.shell(w, d, h, {
        ext, int,
        front: [{ at: 0.5, w: 1.1, door: true }, { at: -3, w: 1.6 }, { at: 3.5, w: 1.6 }],
        back: [{ at: -3.5, w: 1.2 }, { at: 3.5, w: 1.2 }],
        left: [{ at: -2.5, w: 1.2 }, { at: 2.5, w: 1.1 }],
        right: [{ at: -2.5, w: 1.2 }, { at: 2.5, w: 1.1 }],
      });
      b.wall(-5.4, 0.5, 5.4, 0.5, h, { int, holes: [{ at: -3.5, w: 1, door: true }, { at: 0, w: 0.9, door: true }, { at: 3.5, w: 1, door: true }], trim: false });
      b.wall(-1.5, 0.6, -1.5, 4.9, h, { int, trim: false });
      b.wall(1.5, 0.6, 1.5, 4.9, h, { int, trim: false });
      b.gable(w, d, h, 2, 0.5, MAT.roof(), ext);
      b.pad('concrete', 0.5, -d / 2 - 1.2, 1.6, 2.4);
      b.pad('concrete', 0, 0, w + 0.4, d + 0.4);
      // living room + garage corner
      b.prop(P.sofa(0x4a5a3a), -1.5, -2.8, 0, { walk: true });
      b.prop(P.tv(), -1.5, -0.3, Math.PI, { loot: 'closet', name: 'TV cabinet', slots: 6 });
      b.prop(P.workbench(), 4.2, -1.5, -PI2, { loot: 'garage', name: 'Workbench' });
      b.prop(P.chair(false), 2.3, -2.9, 2);
      // bedroom (left)
      b.prop(P.bed(0x8a6a9a), -3.5, 3.6, Math.PI, { walk: true });
      b.prop(P.wardrobe(), -5.05, 1.6, PI2, { loot: 'closet', name: 'Wardrobe' });
      // bathroom (middle)
      b.prop(P.toilet(), 0.6, 4.4, Math.PI);
      b.prop(P.cabinet(), -0.6, 4.5, Math.PI, { loot: 'bathroom', name: 'Medicine cabinet', slots: 6 });
      // kitchen (right)
      b.prop(P.counter(3), 3.6, 4.6, Math.PI, { loot: 'kitchen', name: 'Kitchen cupboard' });
      b.prop(P.fridge(), 5.0, 1.6, -PI2, { loot: 'fridge', name: 'Fridge' });
      b.prop(P.table(), 3.4, 2.4, 0, { walk: true });
      if (b.hash > 0.6) b.graffiti('STAY INSIDE', -3, 1.6, -d / 2 - 0.12, 0, '#1a1a1a');
    },

    store(b) {
      const w = 14, d = 12, h = 3.6;
      const ext = MAT.brick(), int = MAT.wallpaper(0xe8e8e0);
      b.shell(w, d, h, {
        ext, int, floor: MAT.tiles(),
        front: [{ at: 0, w: 1.8, door: true, y1: 2.5 }, { at: -4, w: 4.2, y0: 0.5, y1: 2.8 }, { at: 4, w: 4.2, y0: 0.5, y1: 2.8 }],
        back: [{ at: 5, w: 1.2, door: true }],
        left: [], right: [{ at: -2, w: 1.5 }],
      });
      b.wall(-6.9, 3.5, 6.9, 3.5, h, { int, holes: [{ at: -4.5, w: 1.2, door: true }], trim: false });
      b.flatRoof(w, d, h, MAT.concrete());
      b.sign('GROCERY', '#e8e0c8', '#b02020', 0, h + 0.6, -d / 2 - 0.25, 7, 1.4);
      b.pad('asphalt', 0, -d / 2 - 6, w + 6, 11, true);
      b.pad('concrete', 0, 0, w + 0.6, d + 0.6);
      for (let i = 0; i < 3; i++) b.prop(P.shelf(), -3.5 + i * 3.5, -0.5, PI2, { loot: 'shelf', name: 'Store shelf', slots: 10 });
      b.prop(P.shelf(), 5.8, -3, 0, { loot: 'shelf', name: 'Store shelf', slots: 10 });
      b.prop(P.counter(2.5), -4.8, -4, PI2, { loot: 'kitchen', name: 'Checkout counter' });
      b.prop(P.fridge(), 6.3, 1.5, -PI2, { loot: 'fridge', name: 'Drinks fridge' });
      b.prop(P.fridge(), 6.3, 0.6, -PI2, { loot: 'fridge', name: 'Drinks fridge' });
      b.prop(P.crate(), -5, 4.8, 0.3, { loot: 'garage', name: 'Storage crate', walk: true });
      b.prop(P.crate(), -3.8, 5.1, 0.1, { walk: true });
      b.prop(P.shelf(false), 2, 5.3, 0, { loot: 'garage', name: 'Back room shelf' });
      b.graffiti('NO FOOD LEFT', 0, 1.2, -d / 2 - 0.13, 0);
    },

    police(b) {
      const w = 12, d = 10, h = 3.2;
      const ext = MAT.brick(), int = MAT.wallpaper(0xc8d0d8);
      b.shell(w, d, h, {
        ext, int, floor: MAT.tiles(),
        front: [{ at: 0, w: 1.4, door: true }, { at: -3.5, w: 2 }, { at: 3.5, w: 2 }],
        back: [{ at: -3, w: 1.2 }], left: [{ at: 0, w: 1.2 }], right: [{ at: 0, w: 1.2 }],
      });
      b.wall(-5.9, 1.5, 5.9, 1.5, h, { int, holes: [{ at: 0, w: 1.1, door: true }], trim: false });
      b.flatRoof(w, d, h, MAT.concrete());
      b.sign('POLICE', '#1a2a5a', '#f0f0f0', 0, h + 0.55, -d / 2 - 0.25, 5, 1.1);
      b.pad('asphalt', 0, -d / 2 - 4, w + 2, 7, true);
      b.pad('concrete', 0, 0, w + 0.6, d + 0.6);
      b.prop(P.desk(), -3, -1.5, 0, { loot: 'police', name: 'Desk drawers', slots: 6 });
      b.prop(P.desk(), 3, -1.5, 0);
      b.prop(P.chair(true), 2, -3, 1.2);
      b.prop(P.locker(), 3.5, 4.4, Math.PI, { loot: 'police', name: 'Evidence locker', radio: b.def.radio });
      b.prop(P.locker(), -4, 4.4, Math.PI, { loot: 'police', name: 'Locker' });
      b.prop(P.table(), -1, 3, 0, { walk: true });
    },

    gas(b) {
      const w = 9, d = 8, h = 3.2;
      const ext = MAT.siding(0xe8e4d8), int = MAT.wallpaper(0xe8e8e0);
      b.shell(w, d, h, {
        ext, int, floor: MAT.tiles(),
        front: [{ at: 2, w: 1.4, door: true }, { at: -2, w: 3.2, y0: 0.7, y1: 2.5 }],
        back: [], left: [{ at: 0, w: 1.2 }], right: [],
      });
      b.flatRoof(w, d, h, MAT.concrete());
      b.sign('GAS  FOOD', '#c02020', '#f0f0f0', 0, h + 0.55, -d / 2 - 0.25, 6, 1.1);
      // the roof over the pumps
      const cz = -d / 2 - 6.5;
      b.box(MAT.concrete(), 12, 0.5, 8, 0, 4.6, cz);
      b.box(MAT.trim(), 12.1, 0.3, 8.1, 0, 4.25, cz);
      for (const [x, z] of [[-5, cz - 3], [5, cz - 3], [-5, cz + 3], [5, cz + 3]]) { b.box(MAT.trim(), 0.35, 4.4, 0.35, x, 2.2, z); b.col(x, z, 0.2, 0.2, -0.5, 4.4); }
      b.prop(P.pump(), -2, cz, 0); b.prop(P.pump(), 2, cz, 0);
      b.pad('asphalt', 0, cz, 16, 12, false);
      b.pad('concrete', 0, 0, w + 0.6, d + 0.6);
      b.prop(P.shelf(), -1.5, 0.5, 0, { loot: 'shelf', name: 'Snack shelf', slots: 10 });
      b.prop(P.shelf(), -1.5, 2.8, Math.PI, { loot: 'shelf', name: 'Snack shelf', slots: 10 });
      b.prop(P.counter(2), 2.6, -1.5, 0, { loot: 'kitchen', name: 'Cash register', radio: b.def.radio });
      b.prop(P.fridge(), 3.9, 2.5, -PI2, { loot: 'fridge', name: 'Drinks fridge' });
      b.prop(P.barrel(0x8a2a1a), 5.3, 2, 0);
      b.prop(P.barrel(0x2a4a8a), 5.4, 2.8, 0);
    },

    barn(b) {
      const w = 12, d = 16, h = 4.5;
      const ext = MAT.barn(), int = MAT.barn();
      b.shell(w, d, h, {
        ext, int, floor: false, ceiling: false,
        front: [{ at: 0, w: 3.6, door: true, y1: 3.6 }], back: [{ at: 0, w: 2, door: true }],
        left: [{ at: -3, w: 1, y0: 2.5, y1: 3.4 }, { at: 3, w: 1, y0: 2.5, y1: 3.4 }], right: [{ at: -3, w: 1, y0: 2.5, y1: 3.4 }, { at: 3, w: 1, y0: 2.5, y1: 3.4 }],
      });
      // turn the roof so the top line goes front to back
      const b2 = new Bld(Object.assign({}, b.def, { rot: (b.def.rot || 0) + 1 }));
      b2.gable(d, w, h, 3.2, 0.4, MAT.metalRoof(), ext);
      b.pad('dirt', 0, 0, w + 6, d + 8);
      b.prop(P.hay(), -4, 5, 0.2, { walk: true }); b.prop(P.hay(), -4, 5.6, 0.1, { walk: true, y: 0.5 });
      b.prop(P.hay(), -3.8, 3.8, 1.5, { walk: true }); b.prop(P.hay(), 4.5, 6.5, 0, { walk: true });
      b.prop(P.workbench(), 4.9, 0, -PI2, { loot: 'barn', name: 'Tool bench' });
      b.prop(P.crate(), 4.8, -5, 0.2, { loot: 'barn', name: 'Old crate', walk: true });
      b.prop(P.crate(), -4.8, -4.5, -0.3, { loot: 'barn', name: 'Old crate', walk: true });
      b.prop(P.barrel(), -5, 0, 0);
      b.graffiti('THEY HATE FIRE?', 0, 2.3, d / 2 - 0.12, Math.PI, '#e0e0e0');
    },

    cabin(b) {
      const w = 6, d = 7, h = 2.6;
      const ext = MAT.cabin(), int = MAT.cabin();
      b.shell(w, d, h, { ext, int, front: [{ at: 0, w: 1, door: true }], back: [{ at: 0, w: 1 }], left: [{ at: 0, w: 1 }], right: [{ at: 1, w: 1 }] });
      b.gable(w, d, h, 1.6, 0.5, MAT.roof(), ext);
      b.pad('dirt', 0, 0, w + 3, d + 3);
      b.prop(P.bed(0x8a3a2a), -1.8, 2.3, Math.PI, { walk: true });
      b.prop(P.table(), 1.5, 1.8, PI2, { loot: 'cabin', name: 'Hunter\'s table', walk: true, radio: b.def.radio });
      b.prop(P.wardrobe(), 2.5, -2, -PI2, { loot: 'cabin', name: 'Gun cabinet (no guns...)' });
      b.prop(P.crate(), -2.3, -2.6, 0, { loot: 'cabin', name: 'Supply crate', walk: true });
    },

    shed(b) {
      const w = 4, d = 4, h = 2.5;
      b.shell(w, d, h, { ext: MAT.cabin(), int: MAT.cabin(), front: [{ at: 0, w: 1, door: true }], back: [], left: [], right: [] });
      b.gable(w, d, h, 1, 0.3, MAT.metalRoof(), MAT.cabin());
      b.prop(P.workbench(), 0, 1.4, Math.PI, { loot: 'garage', name: 'Tool bench' });
      b.pad('concrete', 0, 0, w + 1, d + 1);
    },

    tower(b) {
      const t = Mo.tower();
      t.position.set(b.x, b.y, b.z);
      W.scene.add(t);
      W.towerLight = t.userData.blink;
      for (const [x, z] of [[-1.05, -1.05], [1.05, -1.05], [1.05, 1.05], [-1.05, 1.05]]) b.col(x, z, 0.12, 0.12, -1, 26);
      const box = b.col(0.9, -0.9, 0.6, 0.3, -0.5, 1.4, { kind: 'radio' });
      W.radioSpot = { x: b.wx(0.9, -1.4), y: b.y + 1, z: b.wz(0.9, -1.4), col: box };
      b.pad('concrete', 0, 0, 6, 6);
      // fence around the tower
      for (const [x, z, r] of [[0, -5, 0], [0, 5, 0], [-5, 0, PI2], [5, 0, PI2]]) {
        for (const o of [-2, 2]) {
          if (z === -5 && o === 2) continue; // gate
          const lx = r ? x : x + o, lz = r ? z + o : z;
          b.prop(P.fence(4), lx, lz, r);
        }
      }
    },

    helipad(b) {
      const g = new THREE.CylinderGeometry(7, 7, 0.2, 24);
      g.translate(b.x, b.y + 0.1, b.z);
      put(MAT.concrete(), g);
      const hg = new THREE.PlaneGeometry(5, 5); hg.rotateX(-Math.PI / 2); hg.translate(b.x, b.y + 0.21, b.z);
      put(mat('helipadH', () => new THREE.MeshStandardMaterial({ map: T.sign('H', '#8a8884', '#e8e0a0'), roughness: 0.9 })), hg);
      C.add({ shape: 'circle', x: b.x, z: b.z, r: 7, y0: b.y - 1, y1: b.y + 0.2, walk: true, hit: false, kind: 'floor' });
      W.helipad = { x: b.x, y: b.y + 0.2, z: b.z };
    },
  };

  // ============================================================
  //  STREET STUFF: cars, lamps, fences
  // ============================================================
  function addCar(def) {
    const a = def.rot * Math.PI / 180;
    const car = P.car(def.color);
    const y = W.heightAt(def.x, def.z);
    const b = new Bld({ x: def.x, z: def.z, rot: 0 });
    b.a = a; b.c = Math.cos(a); b.s = Math.sin(a); b.y = y;
    // tilt a bit if the ground isn't flat, no one parks nicely in an apocalypse
    b.prop(car, 0, 0, 0, { loot: 'car', name: 'Car trunk', slots: 6, walk: true, kind: 'car' });
  }

  function streetLamp(x, z, a) {
    const b = new Bld({ x, z, rot: 0 });
    b.a = a; b.c = Math.cos(a); b.s = Math.sin(a);
    const k = Mo.kit();
    k.cyl(0.07, 0.1, 5, 0x3a3a3a, 0, 2.5, 0, 0, 0, 0, 6);
    k.box(0.08, 0.08, 1.4, 0x3a3a3a, 0, 5, -0.65);
    k.box(0.3, 0.12, 0.5, 0x2a2a2a, 0, 4.95, -1.3);
    b.prop(Mo.group(k.mesh()), 0, 0, 0, { solid: false });
    b.col(0, 0, 0.1, 0.1, -0.5, 5);
  }

  function farmFences() {
    for (const f of MAP.fields) {
      const a = (f.rot || 0) * Math.PI / 180;
      const b = new Bld({ x: f.x, z: f.z, rot: 0 });
      b.a = a; b.c = Math.cos(a); b.s = Math.sin(a);
      const hw = f.w / 2 + 1, hd = f.d / 2 + 1;
      for (let x = -hw + 1.5; x < hw; x += 3) { b.prop(P.fence(3), x, -hd, 0); if (Math.abs(x) > 3) b.prop(P.fence(3), x, hd, 0); }
      for (let z = -hd + 1.5; z < hd; z += 3) { b.prop(P.fence(3), -hw, z, PI2); b.prop(P.fence(3), hw, z, PI2); }
    }
  }

  function build(scene, world) {
    W = world;
    batch = new Map();
    for (const def of MAP.buildings) {
      const f = TYPES[def.type];
      if (!f) { console.warn('Unknown building type', def.type); continue; }
      f(new Bld(def));
    }
    for (const c of MAP.cars) addCar(c);
    // lamps along the main street
    for (let x = -8; x <= 124; x += 22) { streetLamp(x, 17.5, 0); streetLamp(x + 11, 30.5, Math.PI); }
    farmFences();
    // a few dead bodies in the town, under sheets
    for (const [x, z, r] of [[22, 22, 0.4], [60, 28, 1.8], [-58, 11, 1], [132, 16, 2.4]]) {
      const b = new Bld({ x, z, rot: 0 }); b.a = r; b.c = Math.cos(r); b.s = Math.sin(r);
      b.prop(P.corpse(), 0, 0, 0, { solid: false });
    }
    flush(scene);
  }

  return { build, TYPES };
})();
