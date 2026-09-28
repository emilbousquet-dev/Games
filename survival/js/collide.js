// ============================================================
//  DEAD ACRES — BUMPING INTO THINGS
//  Everything solid (walls, trees, cars, fridges...) is a
//  "collider": a circle or a turned box seen from above,
//  with a bottom (y0) and a top (y1).
//  They are kept in a grid of buckets so we only check the
//  things that are close by.
// ============================================================
window.DA = window.DA || {};

DA.Collide = (function () {
  const CELL = 8;
  const buckets = new Map();
  let stamp = 1;
  const key = (ix, iz) => (ix + 512) * 1024 + (iz + 512);

  // o = { shape: 'box'|'circle', x, z, y0, y1, hw, hd, rot, r, solid, hit, walk, kind, ref }
  function prep(o) {
    if (o.shape === 'box') {
      o.c = Math.cos(o.rot || 0); o.s = Math.sin(o.rot || 0);
      o.br = Math.hypot(o.hw, o.hd);
    } else o.br = o.r;
    if (o.solid === undefined) o.solid = true;
    if (o.hit === undefined) o.hit = true;
  }

  function add(o) {
    prep(o);
    o.cells = [];
    const x0 = Math.floor((o.x - o.br) / CELL), x1 = Math.floor((o.x + o.br) / CELL);
    const z0 = Math.floor((o.z - o.br) / CELL), z1 = Math.floor((o.z + o.br) / CELL);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const k = key(ix, iz);
      let b = buckets.get(k);
      if (!b) { b = []; buckets.set(k, b); }
      b.push(o); o.cells.push(k);
    }
    o._s = 0;
    return o;
  }

  function remove(o) {
    if (!o || !o.cells) return;
    for (const k of o.cells) {
      const b = buckets.get(k);
      if (!b) continue;
      const i = b.indexOf(o);
      if (i >= 0) b.splice(i, 1);
    }
    o.cells = null;
  }

  function clear() { buckets.clear(); }

  // call fn(o) once for each collider near (x, z)
  function near(x, z, r, fn) {
    const s = ++stamp;
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const b = buckets.get(key(ix, iz));
      if (!b) continue;
      for (let i = 0; i < b.length; i++) {
        const o = b[i];
        if (o._s === s) continue;
        o._s = s;
        if (Math.abs(o.x - x) > r + o.br || Math.abs(o.z - z) > r + o.br) continue;
        if (fn(o) === false) return;
      }
    }
  }

  // world -> box space
  const toLocal = (o, x, z) => { const dx = x - o.x, dz = z - o.z; return [dx * o.c - dz * o.s, dx * o.s + dz * o.c]; };
  const toWorldDir = (o, lx, lz) => [lx * o.c + lz * o.s, -lx * o.s + lz * o.c];

  // how far a circle must move to get out of a collider (or null)
  function pushOut(o, x, z, r) {
    if (o.shape === 'circle') {
      const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), m = r + o.r;
      if (d >= m) return null;
      if (d < 1e-6) return [m, 0];
      return [dx / d * (m - d), dz / d * (m - d)];
    }
    const [lx, lz] = toLocal(o, x, z);
    const qx = Math.max(-o.hw, Math.min(o.hw, lx)), qz = Math.max(-o.hd, Math.min(o.hd, lz));
    const dx = lx - qx, dz = lz - qz, d = Math.hypot(dx, dz);
    if (d >= r) return null;
    let px, pz;
    if (d > 1e-6) { px = dx / d * (r - d); pz = dz / d * (r - d); }
    else { // the middle is inside the box: go out the closest side
      const ex = o.hw - Math.abs(lx), ez = o.hd - Math.abs(lz);
      if (ex < ez) { px = Math.sign(lx || 1) * (ex + r); pz = 0; } else { px = 0; pz = Math.sign(lz || 1) * (ez + r); }
    }
    return toWorldDir(o, px, pz);
  }

  // slide a circle (a person) out of everything solid.
  // feet..head = the height range of the body; things below feet+step are stepped over
  function resolve(x, z, r, feet, head, step = 0.45, skip) {
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      near(x, z, r + 0.1, (o) => {
        if (!o.solid || o === skip) return;
        if (o.y1 <= feet + step || o.y0 >= head) return;
        const p = pushOut(o, x, z, r);
        if (p) { x += p[0]; z += p[1]; moved = true; }
      });
      if (!moved) break;
    }
    return [x, z];
  }

  // the highest thing you can stand on under this spot (floors, car roofs...)
  function groundAt(x, z, r, feet, step = 0.45) {
    let best = -1e9;
    near(x, z, r, (o) => {
      if (!o.walk || !o.solid) return;
      if (o.y1 > feet + step || o.y1 <= best) return;
      if (o.shape === 'circle') { if (Math.hypot(x - o.x, z - o.z) > o.r + r * 0.5) return; }
      else {
        const [lx, lz] = toLocal(o, x, z);
        if (Math.abs(lx) > o.hw + r * 0.3 || Math.abs(lz) > o.hd + r * 0.3) return;
      }
      best = o.y1;
    });
    return best;
  }

  // distance along a ray to a collider, or -1
  function rayHit(o, ox, oy, oz, dx, dy, dz, maxD) {
    if (o.shape === 'circle') {
      const fx = ox - o.x, fz = oz - o.z;
      const a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - o.r * o.r;
      let t;
      if (c <= 0) t = 0;
      else {
        if (a < 1e-9) return -1;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return -1;
        t = (-b - Math.sqrt(disc)) / (2 * a);
        if (t < 0) return -1;
      }
      if (t > maxD) return -1;
      const y = oy + dy * t;
      if (y < o.y0 || y > o.y1) {
        // maybe we hit the top (standing above and looking down)
        if (dy < 0 && oy > o.y1) {
          const tt = (o.y1 - oy) / dy;
          if (tt <= maxD && Math.hypot(ox + dx * tt - o.x, oz + dz * tt - o.z) <= o.r) return tt;
        }
        return -1;
      }
      return t;
    }
    const [lx, lz] = toLocal(o, ox, oz);
    const ldx = dx * o.c - dz * o.s, ldz = dx * o.s + dz * o.c;
    let t0 = 0, t1 = maxD;
    const slab = (p, d, lo, hi) => {
      if (Math.abs(d) < 1e-9) return p >= lo && p <= hi;
      let a = (lo - p) / d, b = (hi - p) / d;
      if (a > b) { const tmp = a; a = b; b = tmp; }
      if (a > t0) t0 = a;
      if (b < t1) t1 = b;
      return t0 <= t1;
    };
    if (!slab(lx, ldx, -o.hw, o.hw)) return -1;
    if (!slab(lz, ldz, -o.hd, o.hd)) return -1;
    if (!slab(oy, dy, o.y0, o.y1)) return -1;
    return t0;
  }

  // the first thing a ray touches. filter(o) says which things count
  function ray(ox, oy, oz, dx, dy, dz, maxD, filter) {
    let best = null, bestD = maxD;
    // walk along the ray in steps, checking buckets
    const steps = Math.ceil(maxD / (CELL * 0.5)) + 1;
    const s = ++stamp;
    for (let i = 0; i <= steps; i++) {
      const t = Math.min(maxD, (i / steps) * maxD);
      if (t > bestD + CELL) break;
      const px = ox + dx * t, pz = oz + dz * t;
      const ix0 = Math.floor((px - 2) / CELL), ix1 = Math.floor((px + 2) / CELL);
      const iz0 = Math.floor((pz - 2) / CELL), iz1 = Math.floor((pz + 2) / CELL);
      for (let ix = ix0; ix <= ix1; ix++) for (let iz = iz0; iz <= iz1; iz++) {
        const b = buckets.get(key(ix, iz));
        if (!b) continue;
        for (const o of b) {
          if (o._s === s) continue;
          o._s = s;
          if (!o.hit || (filter && !filter(o))) continue;
          const d = rayHit(o, ox, oy, oz, dx, dy, dz, bestD);
          if (d >= 0 && d < bestD) { bestD = d; best = o; }
        }
      }
    }
    return best ? { o: best, d: bestD } : null;
  }

  // corners of a box seen from above
  function corners(o) {
    const out = [];
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const lx = sx * o.hw, lz = sz * o.hd;
      out.push([o.x + lx * o.c + lz * o.s, o.z - lx * o.s + lz * o.c]);
    }
    return out;
  }
  // do two colliders touch? (seen from above + heights)
  function overlaps(a, b, shrink = 0.02) {
    if (a.y1 <= b.y0 || b.y1 <= a.y0) return false;
    if (a.shape === 'circle' && b.shape === 'circle') return Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r - shrink;
    if (a.shape === 'circle') return !!pushOut(b, a.x, a.z, a.r - shrink);
    if (b.shape === 'circle') return !!pushOut(a, b.x, b.z, b.r - shrink);
    const ca = corners(a), cb = corners(b);
    const axes = [[a.c, -a.s], [a.s, a.c], [b.c, -b.s], [b.s, b.c]];
    for (const [ax, az] of axes) {
      let amin = 1e9, amax = -1e9, bmin = 1e9, bmax = -1e9;
      for (const [x, z] of ca) { const p = x * ax + z * az; amin = Math.min(amin, p); amax = Math.max(amax, p); }
      for (const [x, z] of cb) { const p = x * ax + z * az; bmin = Math.min(bmin, p); bmax = Math.max(bmax, p); }
      if (amax - shrink <= bmin || bmax - shrink <= amin) return false;
    }
    return true;
  }

  // is anything solid in the way of this (not yet added) collider?
  function blocked(test, ignore) {
    prep(test);
    let hit = null;
    near(test.x, test.z, test.br + 0.1, (o) => {
      if (!o.solid || (ignore && ignore(o))) return;
      if (overlaps(test, o)) { hit = o; return false; }
    });
    return hit;
  }

  return { add, remove, clear, near, resolve, groundAt, ray, rayHit, pushOut, overlaps, blocked, prep };
})();
