// ============================================================
//  DEAD ACRES — BUILDING YOUR BASE
//  Walls and floors snap to a grid of 2.5 m squares.
//  Campfires, beds, boxes and spikes go where you look.
// ============================================================
window.DA = window.DA || {};

DA.Build = (function () {
  const U = DA.U, C = DA.Collide, Mo = DA.Models;
  const G = 2.5;          // grid size
  const WALL_H = 3.0;
  let W, scene;

  // hp = how many hits it takes. edge = snaps to the lines between squares
  const TYPES = {
    wall: { hp: 350, edge: true, item: 'wall', name: 'Wood Wall', repair: ['wood', 3] },
    stonewall: { hp: 900, edge: true, item: 'stonewall', name: 'Stone Wall', repair: ['stone', 4] },
    door: { hp: 300, edge: true, item: 'doorway', name: 'Wood Door', repair: ['wood', 3] },
    floor: { hp: 250, cell: true, item: 'floor', name: 'Wood Floor', repair: ['wood', 2] },
    campfire: { hp: 80, item: 'campfire', name: 'Campfire', r: 0.6 },
    bed: { hp: 150, item: 'bed', name: 'Bed', hw: 0.72, hd: 1.05 },
    box: { hp: 200, item: 'box', name: 'Storage Box', hw: 0.58, hd: 0.38 },
    spikes: { hp: 180, cell: true, item: 'spikes', name: 'Spike Trap' },
  };

  const B = {
    TYPES, G,
    list: new Map(),     // id -> { b, obj, cols: [], light }
    lights: [],          // campfires: { x, y, z }
  };

  // ---------- where would it go? ----------
  function terrainRange(x, z, hw, hd, rot) {
    let lo = 1e9, hi = -1e9;
    const c = Math.cos(rot), s = Math.sin(rot);
    for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]]) {
      const lx = a * hw, lz = b * hd;
      const h = W.heightAt(x + lx * c + lz * s, z - lx * s + lz * c);
      lo = Math.min(lo, h); hi = Math.max(hi, h);
    }
    return [lo, hi];
  }

  // the top of a player floor under this spot (or null)
  function floorTopAt(x, z) {
    let top = null;
    C.near(x, z, 0.3, (o) => {
      if (o.kind === 'build' && o.ref && o.ref.type === 'floor' && Math.abs(x - o.x) <= G / 2 + 0.01 && Math.abs(z - o.z) <= G / 2 + 0.01) top = Math.max(top ?? -1e9, o.y1);
    });
    return top;
  }

  // work out exactly where a piece goes. p = spot you look at, yaw = where you face
  B.snap = function (type, px, py, pz, yaw, turn) {
    const t = TYPES[type];
    const out = { type, x: px, y: py, z: pz, rot: 0 };
    if (t.edge) {
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      let alongX = Math.abs(fz) >= Math.abs(fx);   // wall faces you
      if (turn % 2) alongX = !alongX;
      if (alongX) { out.z = Math.round(pz / G) * G; out.x = Math.floor(px / G) * G + G / 2; out.rot = 0; }
      else { out.x = Math.round(px / G) * G; out.z = Math.floor(pz / G) * G + G / 2; out.rot = Math.PI / 2; }
      // stand on a floor next to it, or on the ground
      const c = Math.cos(out.rot), s = Math.sin(out.rot);
      const f1 = floorTopAt(out.x + s * 0.6, out.z + c * 0.6), f2 = floorTopAt(out.x - s * 0.6, out.z - c * 0.6);
      const [lo] = terrainRange(out.x, out.z, G / 2, 0.1, out.rot);
      const fl = Math.max(f1 ?? -1e9, f2 ?? -1e9);
      out.y = fl > -1e8 ? fl : lo;
      out.bottom = Math.min(lo, out.y) - 0.3;
    } else if (t.cell) {
      out.x = Math.floor(px / G) * G + G / 2; out.z = Math.floor(pz / G) * G + G / 2;
      const [lo, hi] = terrainRange(out.x, out.z, G / 2, G / 2, 0);
      out.y = type === 'floor' ? hi + 0.2 : (floorTopAt(out.x, out.z) ?? lo);
      out.bottom = lo - 0.2;
      out.slope = hi - lo;
    } else {
      out.x = Math.round(px * 4) / 4; out.z = Math.round(pz * 4) / 4;
      out.rot = Math.round(yaw / (Math.PI / 2)) * (Math.PI / 2) + (turn % 4) * Math.PI / 2 + Math.PI;
      const fl = floorTopAt(out.x, out.z);
      out.y = fl ?? W.heightAt(out.x, out.z);
      const [lo, hi] = terrainRange(out.x, out.z, 0.6, 0.6, 0);
      out.slope = fl !== null ? 0 : hi - lo;
    }
    return out;
  };

  // the solid box(es) of a piece
  function colliderShapes(b) {
    const t = TYPES[b.type];
    const top = b.y + WALL_H;
    const bottom = b.bottom ?? b.y - 0.3;
    if (b.type === 'wall' || b.type === 'stonewall') return [{ shape: 'box', x: b.x, z: b.z, hw: G / 2, hd: 0.13, rot: b.rot, y0: bottom, y1: top }];
    if (b.type === 'door') {
      const c = Math.cos(b.rot), s = Math.sin(b.rot);
      const at = (lx) => [b.x + lx * c, b.z - lx * s];
      const [lx1, lz1] = at(-0.9), [lx2, lz2] = at(0.9), [cx, cz] = at(0);
      return [
        { shape: 'box', x: lx1, z: lz1, hw: 0.35, hd: 0.13, rot: b.rot, y0: bottom, y1: top },
        { shape: 'box', x: lx2, z: lz2, hw: 0.35, hd: 0.13, rot: b.rot, y0: bottom, y1: top },
        { shape: 'box', x: cx, z: cz, hw: 0.55, hd: 0.13, rot: b.rot, y0: b.y + 2.2, y1: top },
        { shape: 'box', x: cx, z: cz, hw: 0.55, hd: 0.1, rot: b.rot, y0: bottom, y1: b.y + 2.2, panel: true },
      ];
    }
    if (b.type === 'floor') return [{ shape: 'box', x: b.x, z: b.z, hw: G / 2, hd: G / 2, rot: 0, y0: bottom, y1: b.y, walk: true }];
    if (b.type === 'spikes') return [{ shape: 'box', x: b.x, z: b.z, hw: 1.1, hd: 1.1, rot: 0, y0: b.y, y1: b.y + 0.5, solid: false, kind2: 'spikes' }];
    if (b.type === 'campfire') return [{ shape: 'circle', x: b.x, z: b.z, r: t.r, y0: b.y, y1: b.y + 0.5, solid: false }];
    return [{ shape: 'box', x: b.x, z: b.z, hw: t.hw, hd: t.hd, rot: b.rot, y0: b.y, y1: b.y + (b.type === 'bed' ? 0.62 : 0.8), walk: true }];
  }

  // can it go there? returns '' if yes, or the reason why not
  B.check = function (s, px, pz) {
    const t = TYPES[s.type];
    if (!W.inside(s.x, s.z)) return 'Too far out';
    if (W.heightAt(s.x, s.z) < W.WATER - 0.1 && s.type !== 'floor') return 'Not in the water';
    if (s.slope !== undefined && s.slope > (s.type === 'floor' ? 2.2 : 0.9)) return 'Too steep here';
    for (const e of B.list.values()) {
      const b = e.b;
      if (Math.abs(b.x - s.x) < 0.05 && Math.abs(b.z - s.z) < 0.05) {
        if (t.edge && TYPES[b.type].edge && Math.abs(Math.cos(b.rot - s.rot)) > 0.5) return 'There is already a wall here';
        if (t.cell && b.type === s.type) return 'Already built here';
      }
    }
    const shapes = colliderShapes(Object.assign({}, s));
    for (const sh of shapes) {
      if (sh.solid === false && s.type !== 'spikes') continue;
      const test = Object.assign({}, sh, { y0: Math.max(sh.y0, s.y + 0.15), hw: sh.hw && sh.hw - 0.05, hd: sh.hd && Math.max(0.02, sh.hd - 0.03), r: sh.r && sh.r - 0.05 });
      if (test.y1 <= test.y0) continue;
      // walls may touch other walls at the corners
      const hit = C.blocked(test, (o) => o.kind === 'bush' || o.kind === 'floor' || o.kind === 'stump' || o.kind === 'fence' ||
        (o.kind === 'build' && o.ref && (o.ref.type === 'floor' || o.ref.type === 'spikes' || (t.edge && TYPES[o.ref.type].edge))));
      if (hit) return 'Something is in the way';
    }
    // don't build on top of someone
    if (px !== undefined && s.type !== 'floor' && s.type !== 'spikes') {
      for (const p of DA.Game.players.values()) {
        if (!p.alive) continue;
        for (const sh of shapes) {
          if (sh.solid === false || sh.panel) continue;
          if (C.pushOut(Object.assign({}, sh, { c: Math.cos(sh.rot || 0), s: Math.sin(sh.rot || 0) }), p.x, p.z, 0.3)) return 'A player is in the way';
        }
      }
    }
    return '';
  };

  // ---------- 3D models ----------
  function makeModel(b) {
    let g;
    const h = b.y + WALL_H - (b.bottom ?? b.y);
    if (b.type === 'wall') g = Mo.Build.wall(h, false);
    else if (b.type === 'stonewall') g = Mo.Build.wall(h, true);
    else if (b.type === 'door') g = Mo.Build.door(h, b.y - (b.bottom ?? b.y));
    else if (b.type === 'floor') g = Mo.Build.floor(b.y - b.bottom);
    else g = Mo.Build[b.type]();
    const wrap = new THREE.Group();
    wrap.add(g);
    if (TYPES[b.type].edge) g.position.y = (b.bottom ?? b.y) - b.y;
    wrap.position.set(b.x, b.y, b.z);
    wrap.rotation.y = b.rot;
    wrap.userData.inner = g;
    return wrap;
  }

  B.ghost = null;
  let ghostType = null;
  const ghostOk = new THREE.MeshBasicMaterial({ color: 0x40ff60, transparent: true, opacity: 0.35, depthWrite: false });
  const ghostBad = new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.35, depthWrite: false });
  // the see-through preview
  B.showGhost = function (s, ok) {
    const key = s ? s.type + ':' + (s.bottom !== undefined ? (s.y - s.bottom).toFixed(1) : '') : null;
    if (!s) { if (B.ghost) { scene.remove(B.ghost); B.ghost = null; ghostType = null; } return; }
    if (ghostType !== key) {
      if (B.ghost) scene.remove(B.ghost);
      B.ghost = makeModel(Object.assign({ id: 0 }, s));
      B.ghost.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = false; } });
      scene.add(B.ghost);
      ghostType = key;
    }
    B.ghost.position.set(s.x, s.y, s.z);
    B.ghost.rotation.y = s.rot;
    B.ghost.traverse((m) => { if (m.isMesh) m.material = ok ? ghostOk : ghostBad; });
  };

  // ---------- real pieces ----------
  B.add = function (b) {
    if (B.list.has(b.id)) B.remove(b.id);
    const obj = makeModel(b);
    scene.add(obj);
    const cols = colliderShapes(b).map((sh) => {
      const o = Object.assign({ kind: sh.kind2 || 'build', ref: b, hit: true }, sh);
      if (o.kind === 'spikes') o.hit = true;
      return C.add(o);
    });
    // other code looks for "build" colliders, spikes too
    for (const o of cols) if (o.kind === 'spikes') o.build = true;
    const e = { b, obj, cols };
    B.list.set(b.id, e);
    if (b.type === 'campfire') { e.light = { x: b.x, y: b.y + 0.6, z: b.z, fire: true, id: b.id }; B.lights.push(e.light); }
    if (b.type === 'door') B.setDoor(b.id, !!b.open, true);
    B.setHp(b.id, b.hp);
    return e;
  };
  B.remove = function (id) {
    const e = B.list.get(id);
    if (!e) return;
    scene.remove(e.obj);
    e.cols.forEach((o) => C.remove(o));
    if (e.light) B.lights.splice(B.lights.indexOf(e.light), 1);
    B.list.delete(id);
  };
  B.setDoor = function (id, open, instant) {
    const e = B.list.get(id);
    if (!e) return;
    e.b.open = !!open;
    const panel = e.cols.find((o) => o.panel);
    if (panel) panel.solid = !open;
    e.doorTarget = open ? -1.7 : 0;
    const hinge = e.obj.userData.inner.userData.hinge;
    if (instant && hinge) hinge.rotation.y = e.doorTarget;
  };
  // damaged pieces get darker
  B.setHp = function (id, hp) {
    const e = B.list.get(id);
    if (!e) return;
    e.b.hp = hp;
    const k = U.clamp(hp / TYPES[e.b.type].hp, 0, 1);
    const inner = e.obj.userData.inner;
    inner.traverse((m) => {
      if (!m.isMesh) return;
      if (!m.userData.baseMat) m.userData.baseMat = m.material;
      if (k > 0.66) { m.material = m.userData.baseMat; return; }
      const key = k > 0.33 ? 'hurt1' : 'hurt2';
      const bm = m.userData.baseMat;
      if (!bm.userData[key]) { bm.userData[key] = bm.clone(); bm.userData[key].color = bm.color.clone().multiplyScalar(key === 'hurt1' ? 0.7 : 0.45); }
      m.material = bm.userData[key];
    });
  };

  B.update = function (dt, t) {
    for (const e of B.list.values()) {
      if (e.doorTarget !== undefined) {
        const hinge = e.obj.userData.inner.userData.hinge;
        if (hinge) hinge.rotation.y += (e.doorTarget - hinge.rotation.y) * Math.min(1, dt * 8);
      }
      if (e.b.type === 'campfire') {
        const fl = e.obj.userData.inner.userData.flames;
        if (fl) fl.children.forEach((f, i) => { f.scale.y = 0.8 + Math.sin(t * 13 + i * 2) * 0.2 + Math.random() * 0.1; f.rotation.y += dt * (i + 1); });
        if (Math.random() < dt * 3) DA.Effects.smoke(e.b.x + U.rand(-0.1, 0.1), e.b.y + 0.8, e.b.z + U.rand(-0.1, 0.1), 1.2, 0x555555);
        if (Math.random() < dt * 4) DA.Effects.sparks(e.b.x, e.b.y + 0.5, e.b.z);
      }
    }
  };

  B.clear = function () { for (const id of [...B.list.keys()]) B.remove(id); };
  B.init = function (world, sc) { W = world; scene = sc; };
  B.floorTopAt = floorTopAt;
  return B;
})();
