// ============================================================
//  DRAGON LIFE — BUILDING
//  Floors, walls, doors, windows and roofs snap to a grid of
//  4 x 4 meter squares, so houses always fit together.
//  Want a new thing to build? Add it to PIECES and to make()!
// ============================================================
window.DL = window.DL || {};

DL.Build = (function () {
  const U = DL.U, PI = Math.PI;
  const W = () => DL.World, It = () => DL.Items, Hud = () => DL.Hud, S = () => DL.Audio, M = () => DL.Models;
  const C = 4;          // size of one square
  const WALL_H = 3.2;   // how tall walls are

  // kind: 'center' (in the middle of a square), 'floor', 'edge' (on the side of a square), 'roof'
  const PIECES = [
    { id: 'campfire', icon: '🔥', name: 'Campfire', cost: { wood: 3, stone: 2 }, kind: 'center', tip: 'Cook food here. Keeps dragon eggs warm!' },
    { id: 'nest', icon: '🪺', name: 'Dragon Nest', cost: { wood: 8 }, kind: 'center', tip: 'Your dragon sleeps here at night' },
    { id: 'floor', icon: '🟫', name: 'Wood Floor', cost: { wood: 4 }, kind: 'floor', tip: 'Start every house with a floor' },
    { id: 'wall', icon: '🧱', name: 'Wood Wall', cost: { wood: 4 }, kind: 'edge', tip: 'Aim at the side of a square' },
    { id: 'window', icon: '🪟', name: 'Window', cost: { wood: 4 }, kind: 'edge', tip: 'A wall with a window' },
    { id: 'door', icon: '🚪', name: 'Door', cost: { wood: 3 }, kind: 'edge', tip: 'A wall you can walk through' },
    { id: 'roof', icon: '🛖', name: 'Roof', cost: { wood: 3 }, kind: 'roof', tip: 'Goes on top of the walls' },
    { id: 'bed', icon: '🛏️', name: 'Bed', cost: { wood: 6 }, kind: 'center', tip: 'Sleep at night (and save the game)' },
    { id: 'garden', icon: '🌱', name: 'Berry Garden', cost: { wood: 3 }, kind: 'center', tip: 'Plant seeds and grow berries' },
    { id: 'lantern', icon: '🏮', name: 'Lantern', cost: { wood: 1, stone: 1 }, kind: 'center', tip: 'Light for the night' },
    { id: 'table', icon: '🪑', name: 'Table', cost: { wood: 4 }, kind: 'center', tip: 'A table and a stool' },
    { id: 'fence', icon: '🚧', name: 'Fence', cost: { wood: 2 }, kind: 'edge', tip: 'A little fence' },
    { id: 'flowers', icon: '🌷', name: 'Flower Pot', cost: { stone: 1, seeds: 1 }, kind: 'center', tip: 'Pretty!' },
    { id: 'stonefloor', icon: '⬜', name: 'Stone Floor', cost: { stone: 4 }, kind: 'floor', tip: 'A strong stone floor' },
    { id: 'stonewall', icon: '🪨', name: 'Stone Wall', cost: { stone: 5 }, kind: 'edge', tip: 'A strong stone wall' },
    { id: 'crystallamp', icon: '💎', name: 'Crystal Lamp', cost: { crystal: 2, stone: 1 }, kind: 'center', tip: 'A magic glowing lamp' },
  ];
  const byId = {}; for (const p of PIECES) byId[p.id] = p;

  const B = { PIECES, active: false, sel: 0, rot: 0, pieces: [], ghost: null, target: null };
  const slots = new Map();      // what's already built where
  let scene, ghostOk, ghostBad;

  function init(sc) {
    scene = sc;
    ghostOk = new THREE.MeshBasicMaterial({ color: 0x5aff7a, transparent: true, opacity: 0.45, depthWrite: false });
    ghostBad = new THREE.MeshBasicMaterial({ color: 0xff4a4a, transparent: true, opacity: 0.45, depthWrite: false });
  }

  // ---------------- where things go ----------------
  const cellOf = (x, z) => [Math.floor(x / C), Math.floor(z / C)];
  const edgeKey = (cx, cz, rot) => {
    // 0 = +z side, 1 = +x side, 2 = -z side, 3 = -x side. Two squares share each side.
    if (rot === 0) return `h${cx},${cz + 1}`;
    if (rot === 2) return `h${cx},${cz}`;
    if (rot === 1) return `v${cx + 1},${cz}`;
    return `v${cx},${cz}`;
  };
  function slotKey(def, cx, cz, rot) {
    if (def.kind === 'edge') return 'e' + edgeKey(cx, cz, rot);
    if (def.kind === 'floor') return `f${cx},${cz}`;
    if (def.kind === 'roof') return `r${cx},${cz}`;
    return `c${cx},${cz}`;
  }
  function floorTop(cx, cz) { const f = slots.get(`f${cx},${cz}`); return f ? f.y : null; }
  function terrainCorners(cx, cz) {
    const x0 = cx * C, z0 = cz * C;
    const hs = [[0, 0], [C, 0], [0, C], [C, C], [C / 2, C / 2]].map(([a, b]) => W().terrainH(x0 + a, z0 + b));
    return { min: Math.min(...hs), max: Math.max(...hs), mid: hs[4] };
  }
  // the height a piece sits at
  function baseY(def, cx, cz, rot) {
    if (def.kind === 'floor') return Math.max(terrainCorners(cx, cz).max + 0.15, 0.4);
    if (def.kind === 'edge') {
      const [ox, oz] = rot === 0 ? [0, 1] : rot === 2 ? [0, -1] : rot === 1 ? [1, 0] : [-1, 0];
      const a = floorTop(cx, cz), b = floorTop(cx + ox, cz + oz);
      if (a !== null || b !== null) return Math.max(a === null ? -99 : a, b === null ? -99 : b);
      const [mx, mz] = edgeMid(cx, cz, rot);
      return W().terrainH(mx, mz);
    }
    if (def.kind === 'roof') {
      const f = floorTop(cx, cz);
      return (f !== null ? f : terrainCorners(cx, cz).max) + WALL_H;
    }
    const f = floorTop(cx, cz);
    return f !== null ? f : W().terrainH(cx * C + C / 2, cz * C + C / 2);
  }
  function edgeMid(cx, cz, rot) {
    const x = cx * C + C / 2, z = cz * C + C / 2;
    if (rot === 0) return [x, z + C / 2];
    if (rot === 2) return [x, z - C / 2];
    if (rot === 1) return [x + C / 2, z];
    return [x - C / 2, z];
  }

  // ---------------- 3D models of the pieces ----------------
  function make(id, rot, y, cx, cz) {
    const { woodMat, stoneMat, thatchMat } = M().materials();
    const g = new THREE.Group();
    const add = (geo, mat, x, yy, z) => { const m = M().mesh(geo, mat, x, yy, z); g.add(m); return m; };
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const dark = M().mat(0x6a4224);
    const def = byId[id];
    if (def.kind === 'floor') {
      const tc = terrainCorners(cx, cz);
      const depth = Math.max(0.4, y - Math.min(tc.min, -1) + 0.5);
      add(box(C, depth, C), id === 'stonefloor' ? stoneMat : woodMat, 0, -depth / 2, 0);
      if (id === 'floor') for (const s of [-1, 1]) add(box(C + 0.02, 0.12, 0.2), dark, 0, -0.05, s * (C / 2 - 0.1));
    } else if (def.kind === 'edge') {
      const mat = id === 'stonewall' ? stoneMat : woodMat;
      // built along x, then turned
      if (id === 'wall' || id === 'stonewall') add(box(C, WALL_H, 0.3), mat, 0, WALL_H / 2, 0);
      if (id === 'window') {
        add(box(C, 1.0, 0.3), mat, 0, 0.5, 0);
        add(box(C, 0.9, 0.3), mat, 0, WALL_H - 0.45, 0);
        add(box(1.2, 1.3, 0.3), mat, -1.4, 1.65, 0);
        add(box(1.2, 1.3, 0.3), mat, 1.4, 1.65, 0);
        const glass = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0xffb050, emissiveIntensity: 0, transparent: true, opacity: 0.5, roughness: 0.1 });
        add(box(1.6, 1.3, 0.06), glass, 0, 1.65, 0);
        add(box(0.08, 1.3, 0.1), dark, 0, 1.65, 0);
        add(box(1.6, 0.08, 0.1), dark, 0, 1.65, 0);
        g.userData.glass = glass;
      }
      if (id === 'door') {
        add(box(1.3, WALL_H, 0.3), woodMat, -1.35, WALL_H / 2, 0);
        add(box(1.3, WALL_H, 0.3), woodMat, 1.35, WALL_H / 2, 0);
        add(box(1.4, 0.8, 0.3), woodMat, 0, WALL_H - 0.4, 0);
        const hinge = new THREE.Group(); hinge.position.set(-0.7, 0, 0); hinge.rotation.y = -1.3; g.add(hinge);
        const door = M().mesh(box(1.38, 2.35, 0.1), M().mat(0x8a5a30), 0.69, 1.2, 0); hinge.add(door);
        hinge.add(M().mesh(new THREE.SphereGeometry(0.06, 5, 4), M().mat(0xd8b040), 1.2, 1.2, 0.08));
      }
      if (id === 'fence') {
        for (const x of [-1.9, 0, 1.9]) add(box(0.16, 1.2, 0.16), dark, x, 0.6, 0);
        add(box(C, 0.12, 0.08), M().mat(0x9a6a3a), 0, 0.85, 0);
        add(box(C, 0.12, 0.08), M().mat(0x9a6a3a), 0, 0.45, 0);
      } else {
        // wooden posts on the corners
        for (const s of [-1, 1]) add(box(0.36, WALL_H + 0.05, 0.36), id === 'stonewall' ? stoneMat : dark, s * C / 2, WALL_H / 2, 0);
      }
      // walls go a little into the ground, so there's no gap on hills
      if (id !== 'door' && id !== 'fence') add(box(C, 2, 0.28), mat, 0, -1, 0);
    } else if (def.kind === 'roof') {
      add(box(C + 0.4, 0.25, C + 0.4), dark, 0, 0.12, 0);
      const r = add(new THREE.ConeGeometry((C + 1) * 0.72, 1.6, 4), thatchMat, 0, 1.05, 0);
      r.rotation.y = PI / 4;
    } else if (id === 'campfire') {
      g.add(M().campfire());
    } else if (id === 'nest') {
      g.add(M().nest());
    } else if (id === 'bed') {
      add(box(1.5, 0.45, 2.6), dark, 0, 0.23, 0);
      add(box(1.4, 0.25, 2.4), M().mat(0xf4f0e8), 0, 0.55, 0);
      add(box(1.42, 0.27, 1.6), M().mat(0x4a7ad8), 0, 0.56, 0.4);
      add(box(1.0, 0.2, 0.5), M().mat(0xffffff), 0, 0.75, -0.9);
      add(box(1.5, 1.1, 0.15), dark, 0, 0.55, -1.3);
    } else if (id === 'table') {
      add(box(1.6, 0.12, 1.0), woodMat, 0, 0.9, 0);
      for (const sx of [-0.7, 0.7]) for (const sz of [-0.4, 0.4]) add(box(0.1, 0.9, 0.1), dark, sx, 0.45, sz);
      add(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 8), woodMat, 0, 0.55, 1.0);
      add(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 5), dark, 0, 0.25, 1.0);
      add(new THREE.CylinderGeometry(0.15, 0.12, 0.25, 8), M().mat(0xf0f0f0), 0.3, 1.08, 0);
      add(new THREE.SphereGeometry(0.1, 6, 4), M().mat(0xff5a3a), -0.3, 1.02, 0.1);
    } else if (id === 'lantern') {
      const l = M().lantern(); g.add(l); g.userData.lamp = l.userData.glow;
    } else if (id === 'garden') {
      add(box(3.2, 0.3, 3.2), M().mat(0x6a4a2a), 0, 0.15, 0);
      add(box(3.0, 0.05, 3.0), M().mat(0x4a3220), 0, 0.31, 0);
      for (const s of [-1, 1]) { add(box(3.4, 0.4, 0.14), dark, 0, 0.2, s * 1.65); add(box(0.14, 0.4, 3.4), dark, s * 1.65, 0.2, 0); }
      const plants = new THREE.Group(); g.add(plants); g.userData.plants = plants;
    } else if (id === 'flowers') {
      add(new THREE.CylinderGeometry(0.35, 0.28, 0.5, 8), M().mat(0xc8643a), 0, 0.25, 0);
      const f = new THREE.Mesh(W().geos.flowers, M().vcMat()); f.scale.setScalar(1.4); f.position.y = 0.45; g.add(f);
    } else if (id === 'crystallamp') {
      add(new THREE.CylinderGeometry(0.4, 0.5, 0.8, 6), stoneMat, 0, 0.4, 0);
      const cm = new THREE.MeshStandardMaterial({ color: 0x9af0ff, emissive: 0x40c0ff, emissiveIntensity: 1.2, flatShading: true });
      const cr = add(new THREE.OctahedronGeometry(0.4, 0), cm, 0, 1.3, 0); cr.scale.y = 1.6;
      g.userData.spin = cr;
    }
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g;
  }

  function placeObj(g, def, cx, cz, rot, y) {
    if (def.kind === 'edge') {
      const [mx, mz] = edgeMid(cx, cz, rot);
      g.position.set(mx, y, mz);
      g.rotation.y = rot % 2 === 0 ? 0 : PI / 2;
    } else {
      g.position.set(cx * C + C / 2, y, cz * C + C / 2);
      g.rotation.y = def.kind === 'center' ? rot * PI / 2 : 0;
    }
  }

  // ---------------- putting a piece in the world ----------------
  function addPiece(id, cx, cz, rot, y, opts = {}) {
    const def = byId[id];
    const key = opts.fixed ? 'fixed' + Math.random() : slotKey(def, cx, cz, rot);
    const g = make(id, rot, y, cx, cz);
    placeObj(g, def, cx, cz, rot, y);
    scene.add(g);
    const p = { id, cx, cz, rot, y, obj: g, key, cols: [], fixed: !!opts.fixed, data: opts.data || {} };
    if (opts.at) { g.position.x = opts.at.x; g.position.z = opts.at.z; }
    const px = g.position.x, pz = g.position.z;
    p.x = px; p.z = pz;
    // you can't walk through walls
    if (def.kind === 'edge') {
      const h = id === 'fence' ? 1.1 : WALL_H;
      const along = rot % 2 === 0;
      const seg = (a, b) => {
        // a and b: from where to where along the wall (meters from the middle)
        const c = (a + b) / 2, half = (b - a) / 2;
        const box = along ? { minx: px + c - half, maxx: px + c + half, minz: pz - 0.18, maxz: pz + 0.18 } : { minx: px - 0.18, maxx: px + 0.18, minz: pz + c - half, maxz: pz + c + half };
        p.cols.push(W().addCollider(Object.assign(box, { y0: y - 1, y1: y + h })));
      };
      if (id === 'door') { seg(-2, -0.75); seg(0.75, 2); } else seg(-2, 2);
    } else if (def.kind === 'floor') {
      p.plat = W().addPlatform({ minx: cx * C, maxx: cx * C + C, minz: cz * C, maxz: cz * C + C, top: y });
    } else if (def.kind === 'roof') {
      p.plat = W().addPlatform({ minx: cx * C - 0.2, maxx: cx * C + C + 0.2, minz: cz * C - 0.2, maxz: cz * C + C + 0.2, top: y + 0.25 });
    } else if (id === 'bed') {
      p.cols.push(W().addCollider({ x: px, z: pz, r: 0.9, y0: y - 1, y1: y + 0.6 }));
    } else if (id === 'campfire' || id === 'table' || id === 'lantern' || id === 'crystallamp') {
      p.cols.push(W().addCollider({ x: px, z: pz, r: id === 'campfire' ? 0.8 : id === 'table' ? 0.8 : 0.35, y0: y - 1, y1: y + (id === 'campfire' ? 0.5 : 2) }));
    }
    // lights
    if (id === 'campfire') p.light = W().addLight({ x: px, y: y + 1.2, z: pz, color: 0xff9a40, intensity: 18, range: 18, always: true, flicker: true });
    if (id === 'lantern') p.light = W().addLight({ x: px + 0.42 * Math.cos(rot * PI / 2), y: y + 1.9, z: pz - 0.42 * Math.sin(rot * PI / 2), color: 0xffc070, intensity: 10, range: 14 });
    if (id === 'crystallamp') p.light = W().addLight({ x: px, y: y + 1.5, z: pz, color: 0x60d0ff, intensity: 12, range: 16 });
    if (g.userData.glass) W().windows.push(g.userData.glass);
    // things you can use with E
    if (id === 'campfire') p.thing = W().addThing({ x: px, y, z: pz, r: 2.6, piece: p, label: () => It().has('egg') && DL.Dragon.egg.state === 'carried' ? 'Put the dragon egg next to the fire' : 'Cook food', use: () => fireUse(p) });
    if (id === 'bed') p.thing = W().addThing({ x: px, y, z: pz, r: 2.2, label: () => sleepy() ? 'Sleep until morning' : 'Take a nap (saves the game)', use: () => DL.Game.sleep() });
    if (id === 'garden') {
      p.data.plant = p.data.plant || 0;
      p.thing = W().addThing({ x: px, y, z: pz, r: 2.6, label: () => gardenLabel(p), use: () => gardenUse(p) });
      drawGarden(p);
    }
    if (!opts.fixed) slots.set(key, p);
    B.pieces.push(p);
    return p;
  }
  function removePiece(p) {
    scene.remove(p.obj);
    for (const c of p.cols) W().removeCollider(c);
    if (p.plat) W().removePlatform(p.plat);
    if (p.light) W().removeLight(p.light);
    if (p.thing) W().removeThing(p.thing);
    if (p.obj.userData.glass) { const i = W().windows.indexOf(p.obj.userData.glass); if (i >= 0) W().windows.splice(i, 1); }
    slots.delete(p.key);
    B.pieces.splice(B.pieces.indexOf(p), 1);
  }

  // ---------------- campfire, bed, garden ----------------
  function fireUse(p) {
    if (It().has('egg') && DL.Dragon.egg.state === 'carried') {
      // put the egg on the side of the fire facing you
      const pl = DL.Player.pos;
      const a = Math.atan2(pl.x - p.x, pl.z - p.z);
      DL.Dragon.placeEgg(p.x + Math.sin(a) * 1.5, p.z + Math.cos(a) * 1.5);
      return;
    }
    It().openCooking();
  }
  const sleepy = () => W().tod > 0.72 || W().tod < 0.22;
  const GROW_TIME = 150;
  function gardenLabel(p) {
    const d = p.data;
    if (!d.plant) return It().has('seeds') ? 'Plant berry seeds 🌱' : 'Garden (you need 🌱 seeds: chop trees or pick berries to find some)';
    if (W().time - d.plant >= GROW_TIME || d.ready) return 'Pick the berries!';
    return 'Growing... ' + Math.floor((W().time - d.plant) / GROW_TIME * 100) + '%';
  }
  function gardenUse(p) {
    const d = p.data;
    if (!d.plant) {
      if (!It().take('seeds')) { S().play('no'); return; }
      d.plant = W().time; d.ready = false;
      S().play('place');
      DL.FX.dust(p.x, p.y + 0.3, p.z, 8, 0x6a4a2a);
      drawGarden(p);
      DL.Story.event('plant');
      return;
    }
    if (W().time - d.plant >= GROW_TIME || d.ready) {
      d.plant = 0; d.ready = false;
      It().add('berries', 6);
      if (Math.random() < 0.6) It().add('seeds', 1);
      S().play('pick');
      DL.FX.sparkle(p.x, p.y + 0.8, p.z, 0xb08aff, 20);
      drawGarden(p);
    }
  }
  function drawGarden(p) {
    const plants = p.obj.userData.plants;
    if (!plants) return;
    plants.clear();
    const d = p.data;
    if (!d.plant) return;
    const k = U.clamp((W().time - d.plant) / GROW_TIME, 0, 1);
    const done = k >= 1 || d.ready;
    for (const sx of [-0.8, 0.8]) for (const sz of [-0.8, 0.8]) {
      const b = new THREE.Mesh(W().geos.bush, M().vcMat());
      b.scale.setScalar(0.15 + (done ? 0.55 : k * 0.45));
      b.position.set(sx, 0.3, sz);
      plants.add(b);
      if (done) { const be = new THREE.Mesh(W().geos.berries, M().vcMat()); be.scale.copy(b.scale); be.position.copy(b.position); plants.add(be); }
    }
    p.lastK = Math.floor(k * 10);
  }

  // ---------------- helpers for the dragon ----------------
  function fireNear(x, z, r) {
    for (const p of B.pieces) if (p.id === 'campfire' && U.dist2(p.x, p.z, x, z) < r * r) return p;
    return null;
  }
  function nearestNest(x, z, r) {
    let best = null, bd = r * r;
    for (const p of B.pieces) if (p.id === 'nest') { const d = U.dist2(p.x, p.z, x, z); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  // ------------------------------------------------------------
  //  BUILD MODE
  // ------------------------------------------------------------
  function setActive(on) {
    B.active = on;
    if (!on && B.ghost) { scene.remove(B.ghost); B.ghost = null; }
    if (on) { B.ghostFor = null; DL.Story.event('buildmode'); }
    Hud().buildBar(on);
  }
  function select(i) { B.sel = (i + PIECES.length) % PIECES.length; B.ghostFor = null; Hud().buildBar(true); }

  function update(dt, camera) {
    // gardens grow, crystal lamps spin, campfires smoke
    for (const p of B.pieces) {
      if (p.id === 'garden' && p.data.plant) { const k = Math.floor(U.clamp((W().time - p.data.plant) / GROW_TIME, 0, 1) * 10); if (k !== p.lastK) drawGarden(p); }
      if (p.obj.userData.spin) p.obj.userData.spin.rotation.y += dt;
      if (p.obj.userData.lamp) p.obj.userData.lamp.emissiveIntensity = 0.3 + W().night * 2;
      if (p.id === 'campfire') {
        const fl = p.obj.children[0].userData.flame;
        fl.scale.set(1 + Math.sin(W().time * 13 + p.x) * 0.1, 1 + Math.sin(W().time * 17 + p.z) * 0.15, 1);
        if (Math.random() < dt * 4 && U.dist2(p.x, p.z, camera.position.x, camera.position.z) < 6400) DL.FX.ember(p.x, p.y + 0.6, p.z);
        if (Math.random() < dt * 1.5 && U.dist2(p.x, p.z, camera.position.x, camera.position.z) < 6400) DL.FX.smoke(p.x, p.y + 1.2, p.z, 0.7);
      }
    }
    if (!B.active) return;
    const I = DL.Input;
    for (let i = 1; i <= 10; i++) if (I.consume('slot' + i)) select(i - 1);
    if (I.consume('wheelUp')) select(B.sel - 1);
    if (I.consume('wheelDown')) select(B.sel + 1);
    if (I.consume('rotate')) { B.rot = (B.rot + 1) % 4; B.ghostFor = null; }
    const def = PIECES[B.sel];
    // where are you aiming?
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
    const pl = DL.Player.pos;
    let hit = W().rayGround(camera.position, dir, 26);
    const maxD = 11;
    if (!hit || Math.hypot(hit.x - pl.x, hit.z - pl.z) > maxD) {
      const yaw = DL.Player.camYaw;
      hit = new THREE.Vector3(pl.x + Math.sin(yaw) * 6, 0, pl.z + Math.cos(yaw) * 6);
    }
    const [cx, cz] = cellOf(hit.x, hit.z);
    let rot = B.rot;
    if (def.kind === 'edge') {
      // the side of the square closest to where you aim
      const fx = hit.x - (cx * C + C / 2), fz = hit.z - (cz * C + C / 2);
      rot = Math.abs(fx) > Math.abs(fz) ? (fx > 0 ? 1 : 3) : (fz > 0 ? 0 : 2);
    }
    const y = baseY(def, cx, cz, rot);
    const key = slotKey(def, cx, cz, rot);
    // can it go here?
    let why = '';
    if (slots.has(key)) why = def.kind === 'center' ? 'Something is already here' : 'There is already one here';
    else if (!It().hasAll(def.cost)) why = 'You need ' + It().needText(def.cost);
    else if (def.kind !== 'floor' && def.kind !== 'roof' && floorTop(cx, cz) === null && W().terrainH(cx * C + C / 2, cz * C + C / 2) < 0.3 && def.kind === 'center') why = 'Too wet here! Build a floor first.';
    else if (def.kind === 'floor' && terrainCorners(cx, cz).mid < -3) why = 'The water is too deep here';
    else if (def.kind === 'floor' && terrainCorners(cx, cz).max - terrainCorners(cx, cz).min > 4) why = 'Too steep here';
    else if (Math.hypot(cx * C + C / 2 - pl.x, cz * C + C / 2 - pl.z) > 14) why = 'Too far away';
    else {
      const blockers = W().nodesNear(cx * C + C / 2, cz * C + C / 2, def.kind === 'center' ? 1.8 : 2.6).filter(n => n.alive && (n.kind === 'tree' || n.kind === 'rock' || n.kind === 'crystal'));
      if (blockers.length) why = blockers[0].kind === 'tree' ? 'A tree is in the way. Chop it first!' : 'A rock is in the way. Mine it first!';
      for (const s of [W().places.cottage, W().places.ruins, W().places.village]) if (s && Math.hypot(cx * C + C / 2 - s.x, cz * C + C / 2 - s.z) < (s === W().places.village ? 36 : 12)) why = 'You can\'t build here';
    }
    B.target = { def, cx, cz, rot, y, key, why };
    // the see-through preview
    const gkey = def.id + rot + (why ? 'x' : 'o');
    if (B.ghostFor !== gkey) {
      if (B.ghost) scene.remove(B.ghost);
      B.ghost = make(def.id, rot, y, cx, cz);
      B.ghost.traverse(o => { if (o.isMesh) { o.material = why ? ghostBad : ghostOk; o.castShadow = false; } });
      scene.add(B.ghost);
      B.ghostFor = gkey;
    }
    placeObj(B.ghost, def, cx, cz, rot, y);
    Hud().buildInfo(def, why);
    if (I.consume('click')) {
      if (why) { S().play('no'); Hud().toast('🔨 ' + why); }
      else {
        It().takeAll(def.cost);
        const p = addPiece(def.id, cx, cz, rot, y);
        S().play('build');
        DL.FX.dust(p.x, y, p.z, 14, 0xc8b898);
        DL.Story.event('build', def.id);
        Hud().buildBar(true);
      }
    }
    if (I.consume('remove') || I.consume('rclick')) {
      // remove what you're aiming at
      const order = ['c', 'r', 'e', 'f'];
      let found = null;
      for (const o of order) {
        if (o === 'e') {
          for (const r of [rot, 0, 1, 2, 3]) { const p = slots.get('e' + edgeKey(cx, cz, r)); if (p) { found = p; break; } }
        } else found = slots.get(`${o}${cx},${cz}`);
        if (found) break;
      }
      if (found) {
        for (const k in byId[found.id].cost) It().add(k, byId[found.id].cost[k], true);
        DL.FX.dust(found.x, found.y, found.z, 14);
        removePiece(found);
        S().play('remove');
        Hud().toast('♻️ Removed. You got your stuff back!');
        Hud().buildBar(true);
      } else { S().play('no'); Hud().toast('Aim at something you built to remove it.'); }
    }
  }

  // ---------------- saving ----------------
  function save() { return B.pieces.filter(p => !p.fixed).map(p => ({ id: p.id, cx: p.cx, cz: p.cz, rot: p.rot, y: p.y, data: p.data })); }
  function load(list) {
    for (const p of B.pieces.slice()) if (!p.fixed) removePiece(p);
    if (!list) return;
    // floors first, so walls know how high to go
    const order = (p) => byId[p.id] ? ['floor', 'edge', 'center', 'roof'].indexOf(byId[p.id].kind) : 9;
    for (const p of list.slice().sort((a, b) => order(a) - order(b))) {
      if (!byId[p.id]) continue;
      const data = Object.assign({}, p.data);
      // garden time is counted from when the game started
      if (data.plant) { data.ready = true; }
      addPiece(p.id, p.cx, p.cz, p.rot, p.y, { data });
    }
  }
  // Wren's campfire is always there
  function addFixed() {
    const f = W().places.wrenFire;
    const y = W().terrainH(f.x, f.z);
    addPiece('campfire', 0, 0, 0, y, { fixed: true, at: f });
    const p = B.pieces[B.pieces.length - 1];
    p.obj.position.set(f.x, y, f.z);
  }

  return Object.assign(B, { init, update, setActive, select, addPiece, removePiece, fireNear, nearestNest, save, load, addFixed, byId, sleepy });
})();
