// ============================================================
//  SIGMA HOVER GP — SCENERY
//  Everything around the road: buildings, palm trees, candy,
//  cactuses, snowy pines, coral, tombstones, planets...
//  Hundreds of copies are drawn at once ("instancing") so the
//  game stays fast.
// ============================================================
window.HG = window.HG || {};

HG.Scenery = (function () {
  const U = HG.U, M = HG.M;
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
  let ambient = null, animators = [];

  // a piece of a prop: shape + material + where it sits inside the prop
  function part(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy, sz) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz));
    return { geo, mat, m };
  }

  // collects many copies of props and turns them into instanced meshes
  class Placer {
    constructor(shadows) { this.lists = new Map(); this.shadows = shadows; }
    add(parts, x, y, z, rotY = 0, scale = 1, tilt = 0) {
      _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(tilt, rotY, 0)), _s.set(scale, scale, scale));
      for (const p of parts) {
        const key = p.geo.uuid + p.mat.uuid;
        let L = this.lists.get(key);
        if (!L) { L = { geo: p.geo, mat: p.mat, mats: [] }; this.lists.set(key, L); }
        L.mats.push(new THREE.Matrix4().multiplyMatrices(_m, p.m));
      }
    }
    build() {
      const g = new THREE.Group();
      for (const L of this.lists.values()) {
        const im = new THREE.InstancedMesh(L.geo, L.mat, L.mats.length);
        L.mats.forEach((m, i) => im.setMatrixAt(i, m));
        im.instanceMatrix.needsUpdate = true;
        im.castShadow = this.shadows && !L.mat.transparent && !L.mat.userData.noShadow;
        im.receiveShadow = true;
        im.computeBoundingSphere();
        g.add(im);
      }
      return g;
    }
  }

  // ---------- painted textures for props ----------
  const T = {
    windows: (base, lit) => HG.Tex.windows(base, lit, true),
    crowd: () => HG.Tex.make('crowd', 256, 128, (g, w, h) => {
      g.fillStyle = '#2a2a3a'; g.fillRect(0, 0, w, h);
      for (let y = 6; y < h; y += 14) for (let x = 4; x < w; x += 10) {
        g.fillStyle = U.pick(['#ff4a4a', '#4ac0ff', '#ffd84a', '#7aff6a', '#ff8ae0', '#ffffff', '#ffa040']);
        g.beginPath(); g.arc(x + Math.random() * 3, y, 3.5, 0, 7); g.fill();
        g.fillStyle = U.pick(['#f0c49a', '#c08a60', '#8a5a3a']); g.beginPath(); g.arc(x + 1, y - 5, 2.5, 0, 7); g.fill();
      }
    }),
    chevron: (col) => HG.Tex.make('chev' + col, 128, 64, (g, w, h) => {
      g.fillStyle = '#111'; g.fillRect(0, 0, w, h);
      g.fillStyle = col;
      for (let x = 8; x < w; x += 40) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 24, h / 2); g.lineTo(x, h - 8); g.lineTo(x + 12, h - 8); g.lineTo(x + 36, h / 2); g.lineTo(x + 12, 8); g.fill(); }
    }),
    swirl: () => HG.Tex.make('swirl', 128, 128, (g, w, h) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
      for (let a = 0; a < 40; a += 0.05) { g.fillStyle = Math.floor(a / 1.2) % 2 ? '#ff3d8b' : '#ffd84a'; const r = a * 1.6; g.fillRect(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 5, 5); }
    }),
    stripes: (a, b) => HG.Tex.make('stripe' + a + b, 64, 64, (g, w, h) => { for (let y = -64; y < 128; y += 16) { g.fillStyle = (y / 16) % 2 ? a : b; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 32); g.lineTo(w, y + 48); g.lineTo(0, y + 16); g.fill(); } }),
    rainbow: () => HG.Tex.make('rainbowarc', 8, 128, (g, w, h) => { ['#ff3b3b', '#ff9a2a', '#ffe83a', '#4dff6a', '#3ad8ff', '#5a6bff', '#c44dff'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h / 7, w, h / 7 + 1); }); }),
    screen: (text) => HG.Tex.sign(text, '#101830', '#ffcc1a', 512, 256),
    wood: () => HG.Tex.make('crate', 64, 64, (g, w, h) => { g.fillStyle = '#a06a30'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6a4018'; g.lineWidth = 5; g.strokeRect(3, 3, w - 6, h - 6); g.beginPath(); g.moveTo(3, 3); g.lineTo(w - 3, h - 3); g.stroke(); }),
  };

  // ------------------------------------------------------------
  //  PROPS FOR EACH WORLD
  //  each returns { near: [...props next to the road], far: [...], lamps: prop, ... }
  // ------------------------------------------------------------
  function lib(theme) {
    const mat = (c, o) => M.mat(c, o);
    const glow = (c, i = 1.5) => { const m = M.glowMat(c, i); m.userData.noShadow = true; return m; };
    const L = { near: [], far: [], back: [], lamp: null, spacing: 22, farCount: 140, sides: 0.6 };
    const sc = theme.scenery;
    if (sc === 'city') {
      const wm = new THREE.MeshStandardMaterial({ map: T.windows('#20203a', '#ffe0a0'), emissive: 0xffffff, emissiveMap: T.windows('#20203a', '#ffe0a0'), emissiveIntensity: 0.7, roughness: 0.6 });
      const wm2 = new THREE.MeshStandardMaterial({ map: T.windows('#2a1a3a', '#80e0ff'), emissive: 0xffffff, emissiveMap: T.windows('#2a1a3a', '#80e0ff'), emissiveIntensity: 0.7, roughness: 0.5 });
      const neonP = glow(0xff2fd0, 2), neonC = glow(0x2af0ff, 2);
      for (const [w, h, d, m, n] of [[16, 40, 16, wm, neonP], [22, 26, 18, wm2, neonC], [12, 60, 12, wm, neonC], [18, 34, 24, wm2, neonP]]) {
        L.far.push([part(M.box(1, 1, 1), m, 0, h / 2, 0, 0, 0, 0, w, h, d), part(M.box(1, 1, 1), n, 0, h + 0.4, 0, 0, 0, 0, w + 0.6, 0.8, d + 0.6)]);
      }
      L.lamp = [part(M.cyl(0.18, 0.25, 9), mat('#2a2a34', { metal: 0.6, rough: 0.4 }), 0, 4.5, 0), part(M.box(0.3, 0.3, 3), mat('#2a2a34'), 0, 9, -1.4), part(M.box(0.6, 0.2, 1.2), glow(0xffe0a0, 2.5), 0, 8.8, -2.6)];
      L.near.push([part(M.box(0.6, 7, 0.6), mat('#3a3a44'), 0, 3.5, 0), part(M.box(9, 4, 0.5), new THREE.MeshBasicMaterial({ map: HG.Tex.sign('Σ SIGMA', '#ff2fd0', '#ffffff', 256, 128), toneMapped: false }), 0, 8, 0)]);
      L.back = 'skyline';
      L.ambient = 'none';
    } else if (sc === 'beach') {
      const trunk = mat('#9a6a3a', { rough: 0.9 }), leaf = mat('#3aa83a', { rough: 0.7, double: true });
      const palm = [];
      for (let i = 0; i < 6; i++) palm.push(part(M.cyl(0.32 - i * 0.03, 0.36 - i * 0.03, 1.6, 8), trunk, i * 0.28, 0.8 + i * 1.55, 0, 0, 0, -0.17));
      for (let i = 0; i < 7; i++) palm.push(part(M.sphere(1), leaf, 1.7 + Math.cos(i * 0.9) * 2.2, 9.5, Math.sin(i * 0.9) * 2.2, 0, -i * 0.9, -0.5, 2.6, 0.12, 0.7));
      palm.push(part(M.sphere(0.35), mat('#6a4a2a'), 1.6, 9.0, 0.3)); palm.push(part(M.sphere(0.35), mat('#6a4a2a'), 1.9, 9.0, -0.3));
      L.near.push(palm); L.far.push(palm);
      const um = new THREE.MeshStandardMaterial({ map: T.stripes('#ff4a4a', '#ffffff'), roughness: 0.6, side: THREE.DoubleSide });
      L.near.push([part(M.cyl(0.08, 0.08, 3.5), mat('#ffffff'), 0, 1.75, 0), part(M.cone(2.4, 1.0, 12), um, 0, 3.6, 0), part(M.rbox(1.8, 0.2, 0.8, 0.08), mat('#3ac0ff'), 1.5, 0.2, 0)]);
      L.far.push([part(M.box(5, 3, 4), mat('#c89a5a'), 0, 1.5, 0), part(M.cone(4.2, 2.6, 4), mat('#d8b060', { rough: 0.9 }), 0, 4.3, 0, 0, Math.PI / 4)]);
      L.back = 'islands'; L.ambient = 'none';
    } else if (sc === 'candy') {
      const stick = mat('#ffffff', { rough: 0.4 });
      const sw = new THREE.MeshStandardMaterial({ map: T.swirl(), roughness: 0.3 });
      L.near.push([part(M.cyl(0.2, 0.2, 6), stick, 0, 3, 0), part(M.cyl(2.2, 2.2, 0.5, 28), sw, 0, 7.2, 0, Math.PI / 2, 0, 0)]);
      const cane = new THREE.MeshStandardMaterial({ map: T.stripes('#ff2a5a', '#ffffff'), roughness: 0.35 });
      cane.map.repeat.set(1, 6);
      L.near.push([part(M.cyl(0.45, 0.45, 8, 12), cane, 0, 4, 0), part(M.torus(1.4, 0.45, Math.PI, 10, 16), cane, 1.4, 8, 0)]);
      for (const c of ['#ff5fa8', '#7cff7a', '#ffe45a', '#5ad8ff', '#a070ff']) L.far.push([part(M.sphere(3, 20, 12), mat(c, { rough: 0.25 }), 0, 0, 0, 0, 0, 0, 1, 0.9, 1)]);
      L.far.push([part(M.cyl(2.5, 2.0, 2.4, 20), mat('#c87a4a'), 0, 1.2, 0), part(M.sphere(2.6, 20, 12), mat('#ffd0e8', { rough: 0.5 }), 0, 2.5, 0, 0, 0, 0, 1, 0.6, 1), part(M.sphere(0.6), mat('#ff2040', { rough: 0.2 }), 0, 4.2, 0)]);
      L.far.push([part(M.torus(2.4, 1.1, Math.PI * 2, 12, 24), mat('#ff8ac8', { rough: 0.4 }), 0, 3.5, 0, 0, 0, 0)]);
      L.back = 'cakes'; L.ambient = 'sparkle';
    } else if (sc === 'desert') {
      const cg = mat('#3a8a3a', { rough: 0.8 });
      L.near.push([part(M.capsule(0.7, 5), cg, 0, 3.2, 0), part(M.capsule(0.45, 1.6), cg, 1.3, 3.8, 0), part(M.capsule(0.45, 1.4), cg, 0.9, 3.0, 0, 0, 0, Math.PI / 2), part(M.capsule(0.4, 1.2), cg, -1.1, 4.5, 0), part(M.capsule(0.4, 1.0), cg, -0.8, 3.8, 0, 0, 0, Math.PI / 2)]);
      L.far.push(L.near[0]);
      const rock = mat('#a8683a', { rough: 0.95, flat: true });
      L.far.push([part(M.cached('dodeca', () => new THREE.DodecahedronGeometry(3, 0)), rock, 0, 1.5, 0, 0.3, 0.5, 0, 1.4, 0.8, 1)]);
      L.far.push([part(M.cone(14, 12, 4), mat('#e0b878', { rough: 0.9, flat: true }), 0, 6, 0, 0, Math.PI / 4, 0)]);
      L.back = 'mesas'; L.ambient = 'dust';
    } else if (sc === 'ice') {
      const pine = mat('#1e5a3a', { rough: 0.8 }), snow = mat('#ffffff', { rough: 0.6 });
      const tree = [part(M.cyl(0.3, 0.4, 2), mat('#5a3a20'), 0, 1, 0), part(M.cone(2.6, 4, 10), pine, 0, 3.5, 0), part(M.cone(2.0, 3.2, 10), pine, 0, 5.5, 0), part(M.cone(1.3, 2.4, 10), pine, 0, 7.3, 0), part(M.cone(1.32, 1.1, 10), snow, 0, 7.9, 0), part(M.cone(2.02, 0.9, 10), snow, 0, 6.6, 0)];
      L.near.push(tree); L.far.push(tree);
      const crystal = new THREE.MeshStandardMaterial({ color: 0x9af0ff, emissive: 0x3ab0ff, emissiveIntensity: 0.6, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.85 });
      L.near.push([part(M.cached('octa', () => new THREE.OctahedronGeometry(1.6, 0)), crystal, 0, 2.5, 0, 0, 0, 0, 0.8, 2, 0.8), part(M.cached('octa', () => new THREE.OctahedronGeometry(1.6, 0)), crystal, 1.2, 1.5, 0.5, 0, 0, 0.5, 0.5, 1.2, 0.5)]);
      L.far.push([part(M.sphere(1.3), snow, 0, 1.2, 0), part(M.sphere(0.95), snow, 0, 3.0, 0), part(M.sphere(0.65), snow, 0, 4.3, 0), part(M.cone(0.15, 0.7, 8), mat('#ff8a20'), 0, 4.3, 0.75, Math.PI / 2, 0, 0)]);
      L.far.push([part(M.cached('igloo', () => new THREE.SphereGeometry(4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), snow, 0, 0, 0)]);
      L.back = 'snowpeaks'; L.ambient = 'snow';
    } else if (sc === 'jungle') {
      const tr = mat('#6a4a2a', { rough: 0.9 }), lf = mat('#2e8a2a', { rough: 0.8 }), lf2 = mat('#4aa83a', { rough: 0.8 });
      const big = [part(M.cyl(0.8, 1.2, 12, 10), tr, 0, 6, 0), part(M.sphere(4.5, 14, 10), lf, 0, 13, 0), part(M.sphere(3.4, 14, 10), lf2, 2.5, 11.5, 1.5), part(M.sphere(3.4, 14, 10), lf, -2.5, 12, -1)];
      L.near.push(big); L.far.push(big);
      L.near.push([part(M.cone(1.5, 2.5, 6), lf2, 0, 1.2, 0), part(M.cone(1.2, 2.2, 6), lf, 0.8, 1.0, 0.5, 0.3, 0, 0.3), part(M.cone(1.2, 2.2, 6), lf, -0.8, 1.0, -0.5, -0.3, 0, -0.3)]);
      const stone = mat('#8a8a70', { rough: 0.9 });
      L.near.push([part(M.box(2.4, 7, 2.4), stone, 0, 3.5, 0), part(M.box(3, 0.8, 3), stone, 0, 7.3, 0), part(M.sphere(1.2), lf, 0.8, 7.8, 0.5)]);
      L.back = 'temple'; L.ambient = 'leaves';
    } else if (sc === 'underwater') {
      const cols = ['#ff6a8a', '#ffa040', '#c060ff', '#40e0d0'];
      for (const c of cols) { const m = mat(c, { rough: 0.6 }); L.near.push([part(M.cyl(0.4, 0.6, 3, 8), m, 0, 1.5, 0), part(M.cyl(0.3, 0.4, 2.4, 8), m, 0.8, 3.2, 0, 0, 0, -0.6), part(M.cyl(0.3, 0.4, 2.2, 8), m, -0.7, 3.0, 0.3, 0.3, 0, 0.6), part(M.sphere(0.5), m, 1.4, 4.2, 0), part(M.sphere(0.45), m, -1.3, 4.0, 0.4)]); }
      const weed = mat('#2a9a5a', { rough: 0.7 });
      L.near.push([part(M.cone(0.3, 8, 6), weed, 0, 4, 0), part(M.cone(0.25, 6, 6), weed, 0.8, 3, 0.3, 0, 0, 0.1), part(M.cone(0.25, 7, 6), weed, -0.6, 3.5, -0.3, 0, 0, -0.1)]);
      L.far.push([part(M.cached('dodeca', () => new THREE.DodecahedronGeometry(3, 0)), mat('#5a6a7a', { rough: 0.9, flat: true }), 0, 1.5, 0, 0.3, 0.5, 0, 1.6, 1, 1.2)]);
      L.far.push([part(M.sphere(1.6, 16, 10), mat('#f0e0d0', { rough: 0.4 }), 0, 0.6, 0, 0, 0, 0, 1.4, 0.5, 1.2), part(M.sphere(0.4), glow(0xffffff, 1.5), 0, 1.0, 0.4)]);
      L.back = 'reef'; L.ambient = 'bubbles';
    } else if (sc === 'hotel') {
      const bark = mat('#2a2028', { rough: 0.9 });
      L.near.push([part(M.cyl(0.4, 0.7, 7, 8), bark, 0, 3.5, 0), part(M.cyl(0.15, 0.25, 3, 6), bark, 1.2, 6, 0, 0, 0, -0.9), part(M.cyl(0.12, 0.2, 2.6, 6), bark, -1.1, 5.4, 0.3, 0.3, 0, 0.9), part(M.cyl(0.1, 0.15, 2, 6), bark, 0.2, 7.6, -0.6, -0.6, 0, 0.2)]);
      L.near.push([part(M.rbox(1.4, 2.0, 0.4, 0.2), mat('#6a6a78', { rough: 0.9 }), 0, 1.0, 0), part(M.box(1.0, 0.15, 0.42), mat('#4a4a58'), 0, 1.4, 0)]);
      L.near.push([part(M.sphere(0.9, 14, 10), mat('#ff7a10', { rough: 0.6 }), 0, 0.7, 0, 0, 0, 0, 1.2, 0.85, 1.2), part(M.box(0.6, 0.25, 0.1), glow(0xffd040, 2.5), 0, 0.7, 0.98), part(M.cyl(0.08, 0.1, 0.4), mat('#3a6a2a'), 0, 1.6, 0)]);
      L.lamp = [part(M.cyl(0.15, 0.2, 6), mat('#1a1420'), 0, 3, 0), part(M.sphere(0.5), glow(0xa060ff, 2.5), 0, 6.3, 0)];
      L.back = 'hotel'; L.ambient = 'bats';
    } else if (sc === 'lab') {
      const metal = mat('#4a524c', { rough: 0.4, metal: 0.7 }), green = glow(0x30ff80, 2);
      L.near.push([part(M.box(2, 9, 2), metal, 0, 4.5, 0), part(M.box(2.05, 0.3, 2.05), green, 0, 3, 0), part(M.box(2.05, 0.3, 2.05), green, 0, 6, 0)]);
      const goo = new THREE.MeshStandardMaterial({ color: 0x40ff90, emissive: 0x20c060, emissiveIntensity: 1.2, transparent: true, opacity: 0.75, roughness: 0.1 });
      L.near.push([part(M.cyl(1.4, 1.4, 0.6, 16), metal, 0, 0.3, 0), part(M.cyl(1.2, 1.2, 4.5, 16), goo, 0, 2.85, 0), part(M.cyl(1.4, 1.4, 0.6, 16), metal, 0, 5.4, 0)]);
      L.near.push([part(M.cyl(0.8, 0.8, 1.8, 14), mat('#e8c020', { rough: 0.5 }), 0, 0.9, 0), part(M.torus(0.8, 0.06, Math.PI * 2, 6, 16), mat('#222'), 0, 1.2, 0, Math.PI / 2, 0, 0)]);
      L.lamp = [part(M.cyl(0.2, 0.2, 10), metal, 0, 5, 0), part(M.sphere(0.45), glow(0xff3030, 2.5), 0, 10.3, 0)];
      L.back = 'labwalls'; L.ambient = 'none'; L.spacing = 16;
    } else if (sc === 'space') {
      const rock = mat('#6a6a78', { rough: 0.9, flat: true });
      L.far.push([part(M.cached('dodeca', () => new THREE.DodecahedronGeometry(3, 0)), rock, 0, 0, 0, 0.5, 0.7, 0.2, 2, 1.5, 1.7)]);
      L.far.push([part(M.cached('dodeca', () => new THREE.DodecahedronGeometry(3, 0)), mat('#8a7a6a', { rough: 0.9, flat: true }), 0, 0, 0, 0.2, 0.3, 0.9, 1, 0.8, 1.2)]);
      L.near.push([part(M.box(2, 2, 3), mat('#c0c8d8', { metal: 0.7, rough: 0.3 }), 0, 0, 0), part(M.box(7, 0.1, 2), mat('#2a4aa0', { metal: 0.6, rough: 0.3 }), 0, 0, 0), part(M.sphere(0.3), glow(0xff3030, 3), 0, 1.2, 0)]);
      L.floating = true; L.back = 'planets'; L.ambient = 'stars'; L.farCount = 120;
    } else if (sc === 'sky') {
      const cloud = mat('#ffffff', { rough: 0.95 });
      L.far.push([part(M.sphere(5, 16, 10), cloud, 0, 0, 0, 0, 0, 0, 1.4, 0.8, 1), part(M.sphere(4, 16, 10), cloud, 5, -0.5, 1, 0, 0, 0, 1.2, 0.7, 1), part(M.sphere(4, 16, 10), cloud, -5, -0.5, -1, 0, 0, 0, 1.2, 0.7, 1), part(M.sphere(3.5, 16, 10), cloud, 1, 2.5, 0)]);
      const stoneM = mat('#e8dcc8', { rough: 0.8 }), roofM = mat('#3a6ae0', { rough: 0.5 });
      L.near.push([part(M.cyl(2.2, 2.4, 12, 14), stoneM, 0, -2, 0), part(M.cone(2.8, 4, 14), roofM, 0, 6, 0), part(M.box(0.1, 1.8, 1.2), mat('#ffd040'), 0, 9.2, 0.5)]);
      L.far.push([part(M.cone(9, 14, 8), mat('#8a7a6a', { rough: 0.9, flat: true }), 0, -7, 0, Math.PI, 0, 0), part(M.cyl(9, 9, 1.2, 16), mat('#5ab84a', { rough: 0.9 }), 0, 0, 0), part(M.cyl(0.5, 0.7, 4, 8), mat('#6a4a2a'), 3, 2.5, 0), part(M.sphere(2.5, 12, 8), mat('#3a9a3a'), 3, 5.5, 0)]);
      L.floating = true; L.back = 'castle'; L.ambient = 'none';
    } else if (sc === 'stadium') {
      const crowd = new THREE.MeshStandardMaterial({ map: T.crowd(), roughness: 0.8 });
      crowd.map.repeat.set(4, 2);
      L.near.push([part(M.box(30, 1, 6), mat('#606878'), 0, 0.5, 0), part(M.box(30, 1, 6), mat('#606878'), 0, 2, -3), part(M.box(30, 1, 6), mat('#606878'), 0, 3.5, -6), part(M.box(30, 6, 0.3), crowd, 0, 3.6, -4.5, -1.0, 0, 0), part(M.box(30, 10, 1), mat('#3a4050'), 0, 5, -9)]);
      L.lamp = [part(M.cyl(0.4, 0.6, 24, 8), mat('#8a8c92', { metal: 0.6 }), 0, 12, 0), part(M.box(5, 3, 0.5), glow(0xffffff, 2.5), 0, 24.5, 0)];
      L.far.push([part(M.box(0.3, 12, 0.3), mat('#ddd'), 0, 6, 0), part(M.box(3, 2, 0.05), mat('#ff3030', { double: true }), 1.5, 10.8, 0)]);
      L.spacing = 34; L.back = 'stadium'; L.ambient = 'confetti';
    } else if (sc === 'factory') {
      const brick = mat('#8a4a3a', { rough: 0.9 }), metal = mat('#7a828c', { rough: 0.4, metal: 0.8 });
      L.far.push([part(M.cyl(2, 2.6, 30, 12), brick, 0, 15, 0), part(M.cyl(2.05, 2.05, 1.5, 12), mat('#e8e8e8'), 0, 26, 0), part(M.cyl(2.05, 2.05, 1.5, 12), mat('#d83030'), 0, 24, 0)]);
      const gear = [part(M.torus(4, 1, Math.PI * 2, 8, 20), metal, 0, 6, 0)];
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; gear.push(part(M.box(1.5, 1.6, 1.4), metal, Math.cos(a) * 5.1, 6 + Math.sin(a) * 5.1, 0, 0, 0, a)); }
      L.near.push(gear);
      const crate = new THREE.MeshStandardMaterial({ map: T.wood(), roughness: 0.8 });
      L.near.push([part(M.box(2, 2, 2), crate, 0, 1, 0), part(M.box(2, 2, 2), crate, 2.1, 1, 0.3), part(M.box(2, 2, 2), crate, 1.0, 3, 0.1, 0, 0.3, 0)]);
      L.far.push([part(M.box(30, 16, 20), mat('#6a5a50', { rough: 0.9 }), 0, 8, 0), part(M.box(30.2, 1, 20.2), mat('#ffcc00'), 0, 14, 0)]);
      L.lamp = [part(M.cyl(0.2, 0.2, 9), metal, 0, 4.5, 0), part(M.box(0.6, 0.6, 0.6), glow(0xffa020, 2.5), 0, 9.2, 0)];
      L.back = 'factory'; L.ambient = 'sparks';
    } else if (sc === 'moon') {
      const grey = mat('#9a9ca3', { rough: 0.95 });
      L.far.push([part(M.torus(6, 1.5, Math.PI * 2, 8, 20), grey, 0, 0, 0, Math.PI / 2, 0, 0, 1, 1, 0.5)]);
      const glass = new THREE.MeshStandardMaterial({ color: 0xa0e0ff, transparent: true, opacity: 0.4, roughness: 0.05, metalness: 0.3 });
      L.near.push([part(M.cached('dome', () => new THREE.SphereGeometry(5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)), glass, 0, 0, 0), part(M.cyl(5.2, 5.2, 0.6, 20), mat('#d0d4dc'), 0, 0.3, 0), part(M.box(2, 2, 2), mat('#e8e8f0'), 0, 1, 0)]);
      L.near.push([part(M.lathe('rocket', [[0, 0], [1.2, 0.5], [1.4, 4], [1.2, 9], [0.6, 11], [0, 12]], 16), mat('#f0f0f4', { rough: 0.4 }), 0, 0, 0), part(M.cone(1.6, 3, 4), mat('#d83030'), 0, 1.5, 0), part(M.sphere(0.4), glow(0x40c0ff, 2), 0, 8, 1.3)]);
      L.near.push([part(M.cyl(0.2, 0.3, 4), mat('#c0c4cc'), 0, 2, 0), part(M.cached('dish', () => new THREE.SphereGeometry(2.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 3)), mat('#e0e4ec', { double: true }), 0, 4, 0, -2.2, 0, 0)]);
      L.back = 'earth'; L.ambient = 'none';
    } else if (sc === 'rainbow') {
      const star = M.cached('star', () => { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.9 : 2.2; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } const g = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2 }); g.center(); return g; });
      L.far.push([part(star, new THREE.MeshStandardMaterial({ color: 0xffd040, emissive: 0xffa000, emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.5 }), 0, 0, 0)]);
      L.far.push([part(M.cached('octa', () => new THREE.OctahedronGeometry(1.6, 0)), new THREE.MeshStandardMaterial({ color: 0xff70e0, emissive: 0xa020a0, emissiveIntensity: 1, roughness: 0.1, transparent: true, opacity: 0.85 }), 0, 0, 0, 0, 0, 0, 1.5, 3, 1.5)]);
      L.floating = true; L.back = 'galaxy'; L.ambient = 'sparkle'; L.rings = true;
    } else {
      const tr = mat('#6a4a2a'), lf = mat('#3a9a3a');
      L.near.push([part(M.cyl(0.4, 0.6, 5, 8), tr, 0, 2.5, 0), part(M.sphere(2.8, 14, 10), lf, 0, 6.5, 0)]);
      L.far.push(L.near[0]);
      L.back = 'hills'; L.ambient = 'none';
    }
    return L;
  }

  // ------------------------------------------------------------
  //  BUILD THE SCENERY FOR A TRACK
  // ------------------------------------------------------------
  function build(track, theme, race) {
    const group = new THREE.Group();
    animators = []; ambient = null;
    const L = lib(theme);
    const shadows = HG.settings.gfx === 'high';
    const placer = new Placer(shadows);
    const rnd = U.rng(U.hashStr(theme.scenery + (track.def ? track.def.id : '')));
    const groundY = race.groundY !== undefined ? race.groundY : track.minY - 1;
    const isArena = !!track.isArena;
    // a grid of road points so props don't land on the road
    const grid = new Map();
    const cell = 24;
    const key = (x, z) => Math.floor(x / cell) + ',' + Math.floor(z / cell);
    if (!isArena) for (let i = 0; i < track.n; i++) { const p = track.P[i]; const k = key(p.x, p.z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); }
    const blocked = (x, z, y, margin) => {
      if (isArena) { const r = Math.hypot(x, z); return track.round ? r < track.size + margin : Math.max(Math.abs(x), Math.abs(z)) < track.size + margin; }
      const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const list = grid.get((cx + a) + ',' + (cz + b));
        if (!list) continue;
        for (const i of list) {
          const p = track.P[i];
          const lim = track.W[i] / 2 + Math.max(track.offL[i], track.offR[i]) + margin;
          if ((p.x - x) ** 2 + (p.z - z) ** 2 < lim * lim && (y === undefined || Math.abs(p.y - y) < 14)) return true;
        }
      }
      return false;
    };
    const center = track.box ? track.box.getCenter(new THREE.Vector3()) : new THREE.Vector3();
    const size = track.box ? Math.max(track.box.max.x - track.box.min.x, track.box.max.z - track.box.min.z) : track.size * 2;
    // ---------- props beside the road ----------
    if (!isArena && L.near.length) {
      for (let s = 10; s < track.length; s += L.spacing) {
        for (const side of [-1, 1]) {
          if (rnd() > L.sides) continue;
          const fr = track.frame(s, HG.Track.makeFrame());
          if (fr.flags & track.F.GAP) continue;
          const edge = fr.w / 2 + (side < 0 ? fr.offL : fr.offR) + 3 + rnd() * 14;
          const p = fr.p.clone().addScaledVector(fr.r, side * edge);
          const y = L.floating ? p.y - 4 - rnd() * 10 : (fr.p.y - groundY > 6 ? null : groundY);
          if (y === null) continue;
          if (blocked(p.x, p.z, undefined, 3)) continue;
          placer.add(L.near[Math.floor(rnd() * L.near.length)], p.x, y, p.z, rnd() * Math.PI * 2, 0.8 + rnd() * 0.5);
        }
      }
    }
    // ---------- lamps along the road ----------
    if (!isArena && L.lamp) {
      for (let s = 0; s < track.length; s += 40) {
        const fr = track.frame(s, HG.Track.makeFrame());
        if ((fr.flags & (track.F.GAP | track.F.FALL_L | track.F.FALL_R | track.F.TUNNEL)) || fr.n.y < 0.9) continue;
        const side = (Math.floor(s / 40) % 2) ? 1 : -1;
        const p = fr.p.clone().addScaledVector(fr.r, side * (fr.w / 2 + (side < 0 ? fr.offL : fr.offR) + 1.2));
        const yaw = Math.atan2(fr.t.x, fr.t.z) + (side > 0 ? Math.PI / 2 : -Math.PI / 2);
        placer.add(L.lamp, p.x, p.y - 0.2, p.z, yaw, 1);
      }
    }
    // ---------- props far away ----------
    let tries = 0, placed = 0;
    while (placed < L.farCount && tries < L.farCount * 6 && L.far.length) {
      tries++;
      const a = rnd() * Math.PI * 2, r = size * (0.2 + rnd() * 1.2);
      const x = center.x + Math.cos(a) * r, z = center.z + Math.sin(a) * r;
      const y = L.floating ? center.y + (rnd() - 0.5) * 120 : groundY;
      if (blocked(x, z, L.floating ? y : undefined, 8)) continue;
      placer.add(L.far[Math.floor(rnd() * L.far.length)], x, y, z, rnd() * Math.PI * 2, (L.floating ? 0.8 : 0.9) + rnd() * 1.1, L.floating ? rnd() * 3 : 0);
      placed++;
    }
    // ---------- arrow signs on the outside of sharp turns ----------
    if (!isArena) {
      const chev = new THREE.MeshBasicMaterial({ map: T.chevron(theme.chevron || '#ffcc1a'), toneMapped: false, side: THREE.DoubleSide });
      const post = M.mat('#222228');
      for (let i = 0; i < track.n; i += 6) {
        const k = track.K[i];
        if (Math.abs(k) < 1 / 55 || (track.flags[i] & (track.F.GAP | track.F.TUNNEL)) || track.N[i].y < 0.8) continue;
        const outside = k > 0 ? -1 : 1;
        const fr = track.frame(i * track.ds, HG.Track.makeFrame());
        const open = outside < 0 ? (fr.flags & track.F.FALL_L) : (fr.flags & track.F.FALL_R);
        const e = fr.w / 2 + (open ? 0.5 : (outside < 0 ? fr.offL : fr.offR) + 0.8);
        const p = fr.p.clone().addScaledVector(fr.r, outside * e).addScaledVector(fr.n, (theme.wallH || 1.4) + 0.9);
        const yaw = Math.atan2(fr.t.x, fr.t.z) + Math.PI;
        // arrows point toward the inside of the turn
        placer.add([part(M.box(3.2, 1.6, 0.12), chev, 0, 0, 0, 0, 0, 0, outside > 0 ? -1 : 1, 1, 1), part(M.box(0.15, 1.8, 0.15), post, 0, -1.2, -0.1)], p.x, p.y, p.z, yaw, 1);
      }
    }
    group.add(placer.build());
    // ---------- far background ----------
    group.add(backdrop(L.back, center, size, groundY, theme));
    // ---------- rainbow rings over the road ----------
    if (L.rings && !isArena) {
      const ringMat = new THREE.MeshBasicMaterial({ map: T.rainbow(), toneMapped: false, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
      for (let s = 60; s < track.length; s += 110) {
        const fr = track.frame(s, HG.Track.makeFrame());
        const ring = new THREE.Mesh(M.torus(fr.w / 2 + 3, 0.6, Math.PI * 2, 8, 40), ringMat);
        const m = new THREE.Matrix4().makeBasis(fr.r.clone().negate(), fr.n, fr.t);
        ring.quaternion.setFromRotationMatrix(m);
        ring.position.copy(fr.p).addScaledVector(fr.n, 2);
        group.add(ring);
        animators.push((dt, t) => ring.rotateZ(dt * 0.5));
      }
    }
    ambient = L.ambient;
    return group;
  }

  // big things far away (mountains, skylines, planets...)
  function backdrop(kind, c, size, gy, theme) {
    const g = new THREE.Group();
    const R = Math.max(500, size * 1.6);
    const ring = (n, make) => { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + Math.random() * 0.2; const o = make(i, a); if (!o) continue; o.position.x += c.x + Math.cos(a) * R * (0.9 + Math.random() * 0.25); o.position.z += c.z + Math.sin(a) * R * (0.9 + Math.random() * 0.25); o.position.y += gy; g.add(o); } };
    const fogless = (m) => { m.fog = true; return m; };
    if (kind === 'skyline') {
      const wm = new THREE.MeshBasicMaterial({ map: HG.Tex.windows('#14102a', '#ffcf80', true), color: 0xffffff });
      wm.map.repeat.set(3, 6);
      ring(60, (i) => { const h = 60 + Math.random() * 180, w = 20 + Math.random() * 30; const m = new THREE.Mesh(M.box(w, h, w), wm); m.position.y = h / 2; return m; });
    } else if (kind === 'islands') {
      const gm = M.mat('#4aa84a', { rough: 0.9 }), sm = M.mat('#e8d090');
      ring(10, () => { const r = 40 + Math.random() * 60; const o = new THREE.Group(); o.add(new THREE.Mesh(M.sphere(1, 20, 12), gm)); o.children[0].scale.set(r, r * 0.5, r); const b = new THREE.Mesh(M.cyl(1, 1, 1, 24), sm); b.scale.set(r * 1.15, 4, r * 1.15); o.add(b); return o; });
    } else if (kind === 'cakes') {
      const cols = ['#ffd0e8', '#c87a4a', '#fff4c0', '#b0f0ff'];
      ring(12, () => { const o = new THREE.Group(); let y = 0; for (let k = 0; k < 3; k++) { const r = 50 - k * 14, h = 26; const m = new THREE.Mesh(M.cyl(r, r, h, 28), M.mat(cols[(k + Math.floor(Math.random() * 4)) % 4], { rough: 0.6 })); m.position.y = y + h / 2; y += h; o.add(m); } return o; });
    } else if (kind === 'mesas' || kind === 'snowpeaks' || kind === 'hills' || kind === 'temple' || kind === 'reef' || kind === 'factory' || kind === 'labwalls') {
      const col = { mesas: '#b8683a', snowpeaks: '#e8f0f8', hills: '#5a9a4a', temple: '#3a7a3a', reef: '#3a5a7a', factory: '#5a4a40', labwalls: '#1a221c' }[kind];
      const m = M.mat(col, { rough: 0.95, flat: true });
      ring(kind === 'labwalls' ? 40 : 24, () => {
        if (kind === 'mesas') { const h = 60 + Math.random() * 80, w = 60 + Math.random() * 80; const o = new THREE.Mesh(M.cyl(w * 0.8, w, h, 7), m); o.position.y = h / 2; return o; }
        if (kind === 'labwalls') { const o = new THREE.Mesh(M.box(80, 120, 20), m); o.position.y = 60; o.lookAt(c.x, 60, c.z); return o; }
        if (kind === 'factory') { const o = new THREE.Mesh(M.box(60 + Math.random() * 60, 40 + Math.random() * 50, 50), m); o.position.y = 30; return o; }
        const h = 80 + Math.random() * 160; const o = new THREE.Mesh(M.cone(h * 0.8, h, 7), m); o.position.y = h / 2 - 5;
        if (kind === 'snowpeaks') { const cap = new THREE.Mesh(M.cone(h * 0.28, h * 0.35, 7), M.mat('#ffffff', { rough: 0.6, flat: true })); cap.position.y = h * 0.33; o.add(cap); o.material = M.mat('#8a9ab0', { rough: 0.9, flat: true }); }
        return o;
      });
      if (kind === 'temple') {
        const st = M.mat('#9a9a80', { rough: 0.9 });
        const t = new THREE.Group(); for (let k = 0; k < 6; k++) { const s = 90 - k * 14; const b = new THREE.Mesh(M.box(s, 12, s), st); b.position.y = k * 12 + 6; t.add(b); }
        t.position.set(c.x + R * 0.7, gy, c.z - R * 0.5); g.add(t);
      }
      if (kind === 'labwalls') { const lm = M.glowMat(0x30ff80, 2); ring(40, () => { const o = new THREE.Mesh(M.box(6, 1, 1), lm); o.position.y = 30 + Math.random() * 60; return o; }); }
    } else if (kind === 'hotel') {
      const hm = new THREE.MeshBasicMaterial({ map: HG.Tex.windows('#2a1a30', '#ffd060', true) });
      hm.map.repeat.set(4, 3);
      const h = new THREE.Group();
      const body = new THREE.Mesh(M.box(120, 80, 50), hm); body.position.y = 40; h.add(body);
      const roof = new THREE.Mesh(M.cone(85, 50, 4), M.mat('#2a1430')); roof.position.y = 105; roof.rotation.y = Math.PI / 4; h.add(roof);
      const tower = new THREE.Mesh(M.cyl(12, 12, 120, 12), hm); tower.position.set(55, 60, 0); h.add(tower);
      h.position.set(c.x + R * 0.6, gy, c.z + R * 0.6); h.lookAt(c.x, gy, c.z); g.add(h);
      const moon = new THREE.Mesh(M.sphere(60, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff0c0, fog: false }));
      moon.position.set(c.x - R * 1.2, gy + R * 0.7, c.z - R * 1.2); g.add(moon);
      const hills = M.mat('#1a1020', { rough: 1 });
      ring(16, () => { const r = 80 + Math.random() * 60; const o = new THREE.Mesh(M.sphere(1, 16, 8), hills); o.scale.set(r, r * 0.5, r); return o; });
    } else if (kind === 'planets' || kind === 'galaxy' || kind === 'earth') {
      const add = (r, col, pos, ringCol, em = 0.3) => {
        const p = new THREE.Mesh(M.sphere(r, 32, 20), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: em, roughness: 0.8, fog: false }));
        p.position.copy(pos); g.add(p);
        if (ringCol) { const rg = new THREE.Mesh(new THREE.RingGeometry(r * 1.4, r * 2.1, 48), new THREE.MeshBasicMaterial({ color: ringCol, side: THREE.DoubleSide, transparent: true, opacity: 0.7, fog: false })); rg.position.copy(pos); rg.rotation.x = 1.2; g.add(rg); }
        animators.push((dt) => { p.rotation.y += dt * 0.05; });
      };
      if (kind === 'earth') add(140, 0x3a7ad0, new THREE.Vector3(c.x - 600, gy + 500, c.z - 900), null, 0.5);
      else {
        add(180, 0xd08a40, new THREE.Vector3(c.x + 700, gy + 300, c.z - 900), 0xe0c090);
        add(70, 0x6a50d0, new THREE.Vector3(c.x - 800, gy + 450, c.z + 300), null);
        add(40, 0x40d0a0, new THREE.Vector3(c.x - 300, gy + 600, c.z - 800), 0x80fff0);
      }
      if (kind === 'galaxy') {
        const pos = [], col = [];
        for (let i = 0; i < 3000; i++) { const arm = i % 3, r = Math.random() * 700, a = r * 0.006 + arm * 2.1 + Math.random() * 0.5; pos.push(c.x + Math.cos(a) * r, gy + 900 + (Math.random() - 0.5) * 40, c.z + Math.sin(a) * r); const cc = new THREE.Color().setHSL(0.7 + Math.random() * 0.3, 1, 0.6); col.push(cc.r, cc.g, cc.b); }
        const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        const pts = new THREE.Points(gg, new THREE.PointsMaterial({ size: 3, vertexColors: true, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        g.add(pts); animators.push((dt) => { pts.rotation.y += dt * 0.01; });
      }
      if (kind === 'earth') { const hm = M.mat('#7a7c84', { rough: 1, flat: true }); ring(20, () => { const r = 70 + Math.random() * 80; const o = new THREE.Mesh(M.sphere(1, 12, 6), hm); o.scale.set(r, r * 0.35, r); return o; }); }
    } else if (kind === 'castle') {
      const st = M.mat('#f0e8d8', { rough: 0.8 }), rf = M.mat('#3a6ae0', { rough: 0.5 }), cl = M.mat('#ffffff', { rough: 1 });
      const cas = new THREE.Group();
      const base = new THREE.Mesh(M.box(120, 60, 80), st); base.position.y = 30; cas.add(base);
      for (const [x, z] of [[-60, -40], [60, -40], [-60, 40], [60, 40], [0, 0]]) { const tw = new THREE.Mesh(M.cyl(12, 12, x || z ? 90 : 130, 16), st); tw.position.set(x, (x || z ? 45 : 65), z); cas.add(tw); const r = new THREE.Mesh(M.cone(16, 40, 16), rf); r.position.set(x, (x || z ? 110 : 150), z); cas.add(r); }
      const cloud = new THREE.Mesh(M.sphere(1, 20, 10), cl); cloud.scale.set(130, 30, 100); cas.add(cloud);
      cas.position.set(c.x + R * 0.8, c.y - 30, c.z - R * 0.6); g.add(cas);
      ring(18, () => { const o = new THREE.Mesh(M.sphere(1, 16, 10), cl); const r = 40 + Math.random() * 50; o.scale.set(r, r * 0.4, r); o.position.y = (c.y - gy) - 60 + Math.random() * 80; return o; });
      const arc = new THREE.Mesh(M.torus(400, 18, Math.PI, 8, 60), new THREE.MeshBasicMaterial({ map: T.rainbow(), transparent: true, opacity: 0.55, fog: false }));
      arc.position.set(c.x - R * 0.5, c.y - 100, c.z - R * 0.9); g.add(arc);
    } else if (kind === 'stadium') {
      const crowd = new THREE.MeshStandardMaterial({ map: T.crowd(), roughness: 0.8 });
      crowd.map.repeat.set(30, 6);
      const bowl = new THREE.Mesh(M.cached('bowl', () => new THREE.CylinderGeometry(R * 0.55, R * 0.42, 70, 64, 1, true)), crowd);
      bowl.material.side = THREE.BackSide; bowl.position.set(c.x, gy + 25, c.z); g.add(bowl);
      const scr = new THREE.Mesh(M.box(60, 30, 2), new THREE.MeshBasicMaterial({ map: T.screen('Σ SIGMA GP') }));
      scr.position.set(c.x, gy + 75, c.z - R * 0.5); g.add(scr);
    }
    g.traverse((o) => { if (o.isMesh) { o.matrixAutoUpdate = true; } });
    return g;
  }

  // ------------------------------------------------------------
  //  AMBIENT EFFECTS (snow, bubbles, leaves, embers...) around the camera
  // ------------------------------------------------------------
  let acc = 0, t = 0;
  function animate(dt, camPos) {
    t += dt;
    for (const a of animators) a(dt, t);
    if (!HG.FX || !camPos || !ambient || ambient === 'none') return;
    acc += dt;
    const rate = HG.settings.gfx === 'low' ? 0.08 : 0.03;
    while (acc > rate) {
      acc -= rate;
      const off = new THREE.Vector3((Math.random() - 0.5) * 60, (Math.random() - 0.2) * 25, (Math.random() - 0.5) * 60);
      if (off.length() < 9) off.setLength(9 + Math.random() * 10);
      const p = camPos.clone().add(off);
      if (ambient === 'snow') HG.FX.emit({ p, v: new THREE.Vector3(Math.random() - 0.5, -3, Math.random() - 0.5), c: 0xffffff, s: 0.25, life: 4, add: false, a: 0.9 });
      else if (ambient === 'bubbles') HG.FX.emit({ p, v: new THREE.Vector3(0, 2.5, 0), c: 0xc0f0ff, s: 0.35, life: 4, a: 0.6 });
      else if (ambient === 'leaves') HG.FX.emit({ p, v: new THREE.Vector3(1.5, -1.5, 0.5), c: U.pick([0x5ab83a, 0x8ac840, 0xd8c040]), s: 0.3, life: 4, add: false });
      else if (ambient === 'dust') HG.FX.emit({ p, v: new THREE.Vector3(4, 0.2, 1), c: 0xe0c090, s: 0.5, life: 3, add: false, a: 0.35 });
      else if (ambient === 'sparkle' || ambient === 'stars') HG.FX.emit({ p, v: new THREE.Vector3(0, 0.3, 0), c: new THREE.Color().setHSL(Math.random(), 0.8, 0.7), s: 0.25, life: 2, bright: 2 });
      else if (ambient === 'bats') { if (Math.random() < 0.3) HG.FX.emit({ p, v: new THREE.Vector3((Math.random() - 0.5) * 8, 1, (Math.random() - 0.5) * 8), c: 0x100810, s: 0.6, life: 3, add: false }); }
      else if (ambient === 'confetti') HG.FX.emit({ p: p.setY(camPos.y + 18), v: new THREE.Vector3(Math.random() - 0.5, -2, Math.random() - 0.5), c: U.pick([0xff3b6b, 0xffd21a, 0x3bd0ff, 0x7cff6a]), s: 0.25, life: 5, add: false });
      else if (ambient === 'sparks') { if (Math.random() < 0.2) HG.FX.sparks(p.setY(camPos.y - 2), 0xffa030, 4, 4, 0.2); }
      else if (ambient === 'embers') HG.FX.emit({ p, v: new THREE.Vector3(0, 3, 0), c: 0xff6a20, s: 0.25, life: 3, bright: 2 });
    }
  }

  return { build, animate, Placer, part };
})();
