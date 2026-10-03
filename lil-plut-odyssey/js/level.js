// ============================================================
//  LIL' PLUT ODYSSEY — turns the letter maps from levels.js
//  into a real level, and moves things so they bump into walls
// ============================================================
window.LP = window.LP || {};

// what kind of tile each letter is
LP.TILE = { EMPTY: 0, SOLID: 1, ONEWAY: 2, SPIKE: 3, WATER: 4, BREAK: 5 };

LP.Level = (function () {
  const T = LP.T, TL = LP.TILE;
  const TILE_OF = { '#': TL.SOLID, '=': TL.ONEWAY, '^': TL.SPIKE, '~': TL.WATER, 'B': TL.BREAK };

  function build(def, index) {
    const rows = def.map.slice();
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const tiles = new Uint8Array(w * h);
    const things = [];
    let start = { x: 2 * T, y: (h - 3) * T };
    for (let ty = 0; ty < h; ty++) {
      const row = rows[ty];
      for (let tx = 0; tx < w; tx++) {
        const ch = row[tx] || ' ';
        if (TILE_OF[ch] !== undefined) { tiles[ty * w + tx] = TILE_OF[ch]; continue; }
        if (ch === ' ' || ch === '.') continue;
        if (ch === 'P') { start = { x: tx * T + T / 2, y: (ty + 1) * T }; continue; }
        things.push({ ch, tx, ty, x: tx * T, y: ty * T });
      }
    }
    // signs get their words in the order they appear from left to right
    const signs = things.filter((t) => t.ch === '!').sort((a, b) => a.x - b.x);
    signs.forEach((s, i) => { s.text = (def.signs || [])[i] || ''; });

    const level = {
      def, index, w, h, tiles, things, start,
      pw: w * T, ph: h * T,
      world: def.world,
      get(tx, ty) {
        if (tx < 0 || tx >= w) return TL.SOLID;       // the sides of the level are walls
        if (ty < 0 || ty >= h) return TL.EMPTY;       // above and below: nothing (below is a pit!)
        return tiles[ty * w + tx];
      },
      set(tx, ty, v) { if (tx >= 0 && tx < w && ty >= 0 && ty < h) { tiles[ty * w + tx] = v; level.version++; } },
      solid(tx, ty) { const t = level.get(tx, ty); return t === TL.SOLID || t === TL.BREAK; },
      version: 0,   // goes up when a tile changes (so the picture of the ground gets redrawn)
    };
    return level;
  }

  // ---------- moving a box through the level ----------
  // b = {x, y, w, h, vx, vy}. x, y is the top-left corner.
  // platforms = moving platforms you can stand on: {x, y, w, h, dx, dy}
  function move(b, level, dt, platforms) {
    b.hitWallL = b.hitWallR = b.hitCeil = false;
    const wasGround = b.onGround;
    b.onGround = false;

    // ride the moving platform we stood on last time
    if (b.platform) {
      const p = b.platform;
      if (b.x + b.w > p.x - 2 && b.x < p.x + p.w + 2 && Math.abs(b.y + b.h - (p.y - p.dy)) < 6) {
        b.x += p.dx; b.y = p.y - b.h;
      }
      b.platform = null;
    }

    // ---- left / right ----
    b.x += b.vx * dt;
    const r0 = Math.floor((b.y + 1) / T), r1 = Math.floor((b.y + b.h - 1) / T);
    if (b.vx > 0 || b.pushR) {
      const c = Math.floor((b.x + b.w - 0.001) / T);
      for (let r = r0; r <= r1; r++) if (level.solid(c, r)) { b.x = c * T - b.w; if (b.vx > 0) b.vx = 0; b.hitWallR = true; break; }
    }
    if (b.vx < 0 || b.pushL) {
      const c = Math.floor(b.x / T);
      for (let r = r0; r <= r1; r++) if (level.solid(c, r)) { b.x = (c + 1) * T; if (b.vx < 0) b.vx = 0; b.hitWallL = true; break; }
    }

    // ---- up / down ----
    const prevBottom = b.y + b.h;
    b.y += b.vy * dt;
    const c0 = Math.floor((b.x + 1) / T), c1 = Math.floor((b.x + b.w - 1) / T);
    if (b.vy >= 0) {
      const r = Math.floor((b.y + b.h - 0.001) / T);
      for (let c = c0; c <= c1; c++) {
        const t = level.get(c, r);
        const solid = t === TL.SOLID || t === TL.BREAK;
        const oneway = t === TL.ONEWAY && !b.dropThrough && prevBottom <= r * T + 1;
        if (solid || oneway) {
          b.landVy = b.vy;
          b.y = r * T - b.h; b.vy = 0; b.onGround = true;
          break;
        }
      }
      if (!b.onGround && platforms) {
        for (const p of platforms) {
          if (b.x + b.w <= p.x || b.x >= p.x + p.w) continue;
          const oldTop = p.y - p.dy;
          if (prevBottom <= oldTop + 2 && b.y + b.h >= p.y) {
            b.landVy = b.vy;
            b.y = p.y - b.h; b.vy = 0; b.onGround = true; b.platform = p;
            break;
          }
        }
      }
    } else {
      const r = Math.floor(b.y / T);
      let hit = false;
      for (let c = c0; c <= c1; c++) if (level.solid(c, r)) { hit = true; break; }
      if (hit) {
        // bumped your head on a corner? slide around it (feels much nicer)
        const nudge = b.cornerNudge || 0;
        let fixed = false;
        for (let n = 1; n <= nudge && !fixed; n++) {
          for (const s of [-1, 1]) {
            const cc0 = Math.floor((b.x + s * n + 1) / T), cc1 = Math.floor((b.x + s * n + b.w - 1) / T);
            let free = true;
            for (let c = cc0; c <= cc1; c++) if (level.solid(c, r)) free = false;
            if (free) { b.x += s * n; fixed = true; break; }
          }
        }
        if (!fixed) { b.y = (r + 1) * T; b.vy = 0; b.hitCeil = true; }
      }
    }

    // ---- is there a wall right next to us? (for wall jumps) ----
    const mr0 = Math.floor((b.y + b.h * 0.25) / T), mr1 = Math.floor((b.y + b.h * 0.8) / T);
    b.wallL = b.wallR = false;
    for (let r = mr0; r <= mr1; r++) {
      if (level.solid(Math.floor((b.x - 2) / T), r)) b.wallL = true;
      if (level.solid(Math.floor((b.x + b.w + 2) / T), r)) b.wallR = true;
    }
    b.justLanded = b.onGround && !wasGround;
  }

  // is this box touching a tile of this kind? (shrink makes the check a bit smaller, to be fair)
  function touches(b, level, kind, shrink) {
    const s = shrink || 0;
    const c0 = Math.floor((b.x + s) / T), c1 = Math.floor((b.x + b.w - s) / T);
    const r0 = Math.floor((b.y + s) / T), r1 = Math.floor((b.y + b.h - s) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      if (level.get(c, r) !== kind) continue;
      if (kind === TL.SPIKE) {
        // spikes only fill the bottom part of their tile
        if (b.y + b.h - s > r * T + T * 0.45) return { tx: c, ty: r };
      } else if (kind === TL.WATER) {
        if (b.y + b.h - s > r * T + T * 0.35) return { tx: c, ty: r };
      } else return { tx: c, ty: r };
    }
    return null;
  }

  // can a box of this size stand up here? (used when crawling)
  function fits(x, y, w, h, level) {
    const c0 = Math.floor((x + 1) / T), c1 = Math.floor((x + w - 1) / T);
    const r0 = Math.floor((y + 1) / T), r1 = Math.floor((y + h - 1) / T);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (level.solid(c, r)) return false;
    return true;
  }

  return { build, move, touches, fits };
})();
