// ============================================================
//  STARFALL — BUMPING INTO THINGS
//  Trees, rocks, pillars and steps are "cylinders".
//  You can't walk through them, but you can stand on top of them.
// ============================================================
window.SF = window.SF || {};

SF.Phys = (function () {
  const CELL = 8;
  const STEP = 0.6;               // you can walk up steps this high
  const grid = new Map();
  const arenas = [];              // temple rooms (far away from the island)
  const clearZones = [];          // places where no plants should grow
  const key = (i, j) => i * 10007 + j;

  function addCyl(x, z, r, bottom, top, data = {}) {
    const c = { x, z, r, bottom, top, ...data };
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL);
    const j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = key(i, j);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(c);
    }
    return c;
  }
  function removeCyl(c) {
    for (const list of grid.values()) { const i = list.indexOf(c); if (i >= 0) list.splice(i, 1); }
  }
  function near(x, z) {
    return grid.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
  }

  function addArena(a) { arenas.push(a); return a; }
  function arenaAt(x, z) {
    for (const a of arenas) if (Math.hypot(x - a.x, z - a.z) < a.r + 30) return a;
    return null;
  }

  function clear(x, z, r) { clearZones.push({ x, z, r }); }
  function isClear(x, z) {
    for (const c of clearZones) if (Math.hypot(x - c.x, z - c.z) < c.r) return false;
    for (const c of near(x, z)) if (Math.hypot(x - c.x, z - c.z) < c.r + 1) return false;
    return true;
  }

  // the highest floor under you (terrain, arena floor or the top of a cylinder)
  function groundAt(x, z, y = 1e9) {
    const a = arenaAt(x, z);
    let g = a ? (a.floorAt ? a.floorAt(x, z) : a.y) : SF.Terrain.heightAt(x, z);
    for (const c of near(x, z)) {
      if (c.off) continue;
      if (c.top > g && c.top <= y + STEP && (x - c.x) * (x - c.x) + (z - c.z) * (z - c.z) < c.r * c.r) g = c.top;
    }
    return g;
  }

  // push a body (radius r, from y up to y+h) out of anything solid
  function pushOut(p, r, h) {
    let hit = false;
    for (const c of near(p.x, p.z)) {
      if (c.off) continue;
      if (c.top <= p.y + STEP || c.bottom >= p.y + h) continue;
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + r;
      if (d < min) {
        if (d < 1e-4) { p.x += min; continue; }
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
        hit = true;
      }
    }
    const a = arenaAt(p.x, p.z);
    if (a) {
      const dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz);
      if (d > a.r - r) { p.x = a.x + (dx / d) * (a.r - r); p.z = a.z + (dz / d) * (a.r - r); hit = true; }
    }
    return hit;
  }

  // is this point inside something solid? (for arrows and fireballs)
  function solidAt(x, y, z) {
    if (y < groundAt(x, z, -1e9) - 0.05) return true;
    for (const c of near(x, z)) {
      if (c.off || c.noArrow) continue;
      if (y > c.bottom && y < c.top && (x - c.x) * (x - c.x) + (z - c.z) * (z - c.z) < c.r * c.r) return true;
    }
    return false;
  }

  return { STEP, addCyl, removeCyl, near, groundAt, pushOut, solidAt, addArena, arenaAt, arenas, clear, isClear };
})();
