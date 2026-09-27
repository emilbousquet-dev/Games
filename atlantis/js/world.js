// ============================================================
//  ATLANTIS DIVER — THE WORLD
//  Reads the map letters, knows where the walls are, and paints
//  the city into big cached pictures ("chunks") so it's fast.
// ============================================================
AT.World = (function () {
  const U = AT.U, T = AT.TILE;
  const SOLID = '#BGTRX%';
  const BACK = 'bgtx';
  const TREASURE = '$o*uhW@';
  const CREATURES = 'fvjrepasZ';
  const PROPS = '|/SPcCL';
  const CH = 8;                          // a chunk is 8 x 8 squares
  let cols = 48, rows = 0, grid = [], dist = [];
  let props = [], items = [], spawns = [], kelp = [], grass = [], glows = [];
  let chunks = new Map(), chunkRes = 1, tmp = null;
  let explored = null;

  const zoneOfRow = (ty) => {
    const m = ty * 4;
    let z = 0;
    AT.ZONES.forEach((zone, i) => { if (m >= zone.from) z = i; });
    return z;
  };
  const zoneAtY = (y) => zoneOfRow(Math.floor(y / T));

  function raw(tx, ty) {
    if (ty < 0) return '.';
    if (tx < 0 || tx >= cols || ty >= rows) return '#';
    return grid[ty][tx];
  }
  const isSolidCh = (c) => SOLID.includes(c);
  const solid = (tx, ty) => isSolidCh(raw(tx, ty));
  const solidAt = (x, y) => solid(Math.floor(x / T), Math.floor(y / T));

  // the back wall under something (look left and right)
  function backUnder(tx, ty, line) {
    for (const d of [-1, 1, -2, 2]) {
      const c = line[tx + d];
      if (c && BACK.includes(c)) return c;
    }
    return '.';
  }

  function load(save) {
    rows = AT.MAP.length;
    grid = AT.MAP.map((line) => {
      let l = line.slice(0, cols);
      while (l.length < cols) l += '#';
      return l.split('');
    });
    props = []; items = []; spawns = []; kelp = []; grass = []; glows = [];
    let tablet = 0;
    for (let ty = 0; ty < rows; ty++) {
      const line = grid[ty].slice();
      for (let tx = 0; tx < cols; tx++) {
        const c = line[tx];
        const cx = tx * T + T / 2, cy = ty * T + T / 2, zone = zoneOfRow(ty);
        if (TREASURE.includes(c) || c === '!' || c === 'Y') {
          const it = { ch: c, x: cx, y: ty * T + T - 16, tx, ty, id: tx + ty * cols, zone, bob: Math.random() * 6, open: 0 };
          if (c === '!') { it.tablet = tablet++; it.y = ty * T + T - 20; }
          if (c === 'Y') it.y = ty * T + T - 44;
          if (TREASURE.includes(c)) {
            it.value = Math.round(AT.TREASURE[c].value * AT.ZONES[zone].mult / 5) * 5;
            it.respawn = c === '$' || c === 'o';
          }
          items.push(it);
          grid[ty][tx] = backUnder(tx, ty, line);
        } else if (CREATURES.includes(c)) {
          spawns.push({ ch: c, x: cx, y: cy, tx, ty, zone });
          grid[ty][tx] = backUnder(tx, ty, line);
        } else if (c === 'k' || c === 'w') {
          (c === 'k' ? kelp : grass).push({ x: cx, y: ty * T + T, seed: tx * 131 + ty * 7, zone, h: 3 + Math.floor(U.hash(tx, ty, 5) * 3) });
          grid[ty][tx] = backUnder(tx, ty, line);
        } else if (PROPS.includes(c)) {
          props.push({ ch: c, tx, ty, zone });
          grid[ty][tx] = backUnder(tx, ty, line);
          if (c === 'L') glows.push({ kind: 'lamp', x: cx, y: ty * T + T - 50, r: 190, color: [120, 230, 255] });
          if (c === 'C') glows.push({ kind: 'crystal', x: cx, y: cy, r: 150, color: U.hash(tx, ty) > 0.4 ? [110, 240, 255] : [210, 140, 255] });
        } else if (c === 'R') {
          glows.push({ kind: 'rune', x: cx, y: cy, r: 170, color: [90, 230, 255] });
        }
      }
    }
    // walls you already broke stay broken
    if (save && save.broken) for (const id of save.broken) breakTile(id % cols, Math.floor(id / cols), true);
    computeDist();
    explored = new Uint8Array(cols * rows);
    if (save && save.explored) {
      try {
        const bin = atob(save.explored);
        for (let i = 0; i < bin.length && i * 8 < explored.length; i++) for (let b = 0; b < 8; b++) explored[i * 8 + b] = (bin.charCodeAt(i) >> b) & 1;
      } catch (e) { /* old save */ }
    }
    chunks.clear();
  }

  // how far each wall square is from the water (used to shade the inside of the rock)
  function computeDist() {
    dist = grid.map((line) => line.map(() => 99));
    const q = [];
    for (let ty = 0; ty < rows; ty++) for (let tx = 0; tx < cols; tx++) {
      if (!isSolidCh(grid[ty][tx])) { dist[ty][tx] = 0; q.push([tx, ty]); }
    }
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (dist[ny][nx] > dist[y][x] + 1) { dist[ny][nx] = dist[y][x] + 1; q.push([nx, ny]); }
      }
    }
  }
  const distAt = (tx, ty) => (tx < 0 || tx >= cols || ty >= rows ? 6 : ty < 0 ? 0 : dist[ty][tx]);

  // ---------- collisions ----------
  // pushes a circle (o.x, o.y, radius r) out of the walls. Returns the push direction or null.
  function collide(o, r) {
    let hit = null;
    for (let iter = 0; iter < 3; iter++) {
      const tx0 = Math.floor((o.x - r) / T), tx1 = Math.floor((o.x + r) / T);
      const ty0 = Math.floor((o.y - r) / T), ty1 = Math.floor((o.y + r) / T);
      let moved = false;
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        if (!solid(tx, ty)) continue;
        const px = U.clamp(o.x, tx * T, tx * T + T), py = U.clamp(o.y, ty * T, ty * T + T);
        let dx = o.x - px, dy = o.y - py;
        const d = Math.hypot(dx, dy);
        if (d >= r) continue;
        if (d < 0.001) { dx = 0; dy = -1; } else { dx /= d; dy /= d; }
        const push = r - d;
        o.x += dx * push; o.y += dy * push;
        hit = { nx: dx, ny: dy, tx, ty };
        moved = true;
      }
      if (!moved) break;
    }
    return hit;
  }

  // walk along a line and return the first wall square it hits
  function ray(x0, y0, x1, y1) {
    const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(len / 6);
    for (let i = 1; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps, y = y0 + ((y1 - y0) * i) / steps;
      const tx = Math.floor(x / T), ty = Math.floor(y / T);
      if (solid(tx, ty)) return { x, y, tx, ty, ch: raw(tx, ty) };
    }
    return null;
  }

  // break a cracked wall
  function breakTile(tx, ty, silent) {
    if (raw(tx, ty) !== '%') return false;
    const z = zoneOfRow(ty);
    grid[ty][tx] = ['b', 'b', 'g', 't', 'x'][z];
    if (!silent) { computeDist(); invalidate(tx, ty); }
    return true;
  }

  function explore(x, y, radius) {
    const r = Math.ceil(radius / T), cx = Math.floor(x / T), cy = Math.floor(y / T);
    for (let ty = cy - r; ty <= cy + r; ty++) for (let tx = cx - r; tx <= cx + r; tx++) {
      if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) continue;
      if ((tx - cx) ** 2 + (ty - cy) ** 2 <= r * r) explored[tx + ty * cols] = 1;
    }
  }
  function exploredString() {
    let s = '';
    for (let i = 0; i < explored.length; i += 8) {
      let b = 0;
      for (let k = 0; k < 8; k++) if (explored[i + k]) b |= 1 << k;
      s += String.fromCharCode(b);
    }
    return btoa(s);
  }

  // ---------- painting the chunks ----------
  function setRes(r) { if (r !== chunkRes) { chunkRes = r; chunks.clear(); } }
  function invalidate(tx, ty) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      chunks.delete(Math.floor((tx + dx) / CH) + ',' + Math.floor((ty + dy) / CH));
    }
    // statues and tall props can reach into the chunk above
    chunks.delete(Math.floor(tx / CH) + ',' + (Math.floor(ty / CH) - 1));
  }

  const RIM = { T: 'rgba(150,185,255,0.4)', R: 'rgba(150,185,255,0.4)', X: 'rgba(200,160,255,0.55)', '#': 'rgba(255,255,240,0.14)', B: 'rgba(255,255,255,0.25)', G: 'rgba(255,240,190,0.35)' };
  // the color of the rock changes slowly as you go deeper
  const TINT = [[0, [200, 160, 100, 0.28]], [11, [200, 160, 100, 0.28]], [20, [90, 140, 120, 0.22]], [36, [90, 140, 120, 0.22]], [44, [140, 100, 70, 0.25]], [150, [140, 100, 70, 0.25]]];
  function rockTint(ty) {
    for (let i = 1; i < TINT.length; i++) if (ty <= TINT[i][0]) {
      const [r0, a] = TINT[i - 1], [r1, b] = TINT[i], k = (ty - r0) / (r1 - r0);
      return `rgba(${U.lerp(a[0], b[0], k) | 0},${U.lerp(a[1], b[1], k) | 0},${U.lerp(a[2], b[2], k) | 0},${U.lerp(a[3], b[3], k)})`;
    }
    return 'rgba(140,100,70,0.25)';
  }

  function tilePath(g, x, y, up, dn, lf, rt, R) {
    const e = 0.75;
    const x0 = x - (lf ? 0 : e), y0 = y - (up ? 0 : e), x1 = x + T + (rt ? 0 : e), y1 = y + T + (dn ? 0 : e);
    const tl = up && lf ? R : 0, tr = up && rt ? R : 0, br = dn && rt ? R : 0, bl = dn && lf ? R : 0;
    g.beginPath();
    g.moveTo(x0 + tl, y0);
    g.lineTo(x1 - tr, y0); if (tr) g.quadraticCurveTo(x1, y0, x1, y0 + tr);
    g.lineTo(x1, y1 - br); if (br) g.quadraticCurveTo(x1, y1, x1 - br, y1);
    g.lineTo(x0 + bl, y1); if (bl) g.quadraticCurveTo(x0, y1, x0, y1 - bl);
    g.lineTo(x0, y0 + tl); if (tl) g.quadraticCurveTo(x0, y0, x0 + tl, y0);
    g.closePath();
  }

  // only the edges that touch the water
  function rimPath(g, x, y, up, dn, lf, rt, R) {
    const tl = up && lf ? R : 0, tr = up && rt ? R : 0, br = dn && rt ? R : 0, bl = dn && lf ? R : 0;
    const x1 = x + T, y1 = y + T;
    g.beginPath();
    if (up) { g.moveTo(x + tl, y); g.lineTo(x1 - tr, y); }
    if (tr) { g.moveTo(x1 - tr, y); g.quadraticCurveTo(x1, y, x1, y + tr); }
    if (rt) { g.moveTo(x1, y + tr); g.lineTo(x1, y1 - br); }
    if (br) { g.moveTo(x1, y1 - br); g.quadraticCurveTo(x1, y1, x1 - br, y1); }
    if (dn) { g.moveTo(x1 - br, y1); g.lineTo(x + bl, y1); }
    if (bl) { g.moveTo(x + bl, y1); g.quadraticCurveTo(x, y1, x, y1 - bl); }
    if (lf) { g.moveTo(x, y1 - bl); g.lineTo(x, y + tl); }
    if (tl) { g.moveTo(x, y + tl); g.quadraticCurveTo(x, y, x + tl, y); }
  }

  function patterns(g) {
    if (!g._pat) {
      g._pat = {};
      for (const k in AT.Art.tex) g._pat[k] = g.createPattern(AT.Art.tex[k], 'repeat');
    }
    return g._pat;
  }

  function drawBack(g, tx, ty, c) {
    const x = tx * T, y = ty * T;
    g.fillStyle = patterns(g)[c];
    g.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    g.fillStyle = c === 'g' ? 'rgba(3,10,28,0.5)' : 'rgba(4,8,26,0.66)'; g.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
    // shadows from the walls around (makes rooms look deep)
    const sh = (x0, y0, x1, y1) => {
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, 'rgba(0,0,10,0.55)'); gr.addColorStop(1, 'rgba(0,0,10,0)');
      g.fillStyle = gr; g.fillRect(x, y, T, T);
    };
    if (solid(tx, ty - 1)) sh(x, y, x, y + 22);
    if (solid(tx - 1, ty)) sh(x, y, x + 16, y);
    if (solid(tx + 1, ty)) sh(x + T, y, x + T - 16, y);
    // edges next to open water fade out
    const open = (c2) => c2 === '.';
    const fade = (x0, y0, x1, y1) => {
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, 'rgba(120,170,220,0.12)'); gr.addColorStop(1, 'rgba(120,170,220,0)');
      g.fillStyle = gr; g.fillRect(x, y, T, T);
    };
    if (open(raw(tx - 1, ty))) fade(x, y, x + 10, y);
    if (open(raw(tx + 1, ty))) fade(x + T, y, x + T - 10, y);
  }

  function drawSolid(g, tx, ty, c) {
    const x = tx * T, y = ty * T, zone = zoneOfRow(ty);
    const up = !solid(tx, ty - 1), dn = !solid(tx, ty + 1), lf = !solid(tx - 1, ty), rt = !solid(tx + 1, ty);
    const R = c === '#' || c === 'X' ? 20 : 7;
    tilePath(g, x, y, up, dn, lf, rt, R);
    let pc = c === '%' ? ['B', 'B', 'G', 'T', 'X'][zone] : c;
    g.fillStyle = patterns(g)[pc];
    g.fill();
    g.save();
    g.clip();
    if (c === '#') { g.fillStyle = rockTint(ty); g.fillRect(x - 1, y - 1, T + 2, T + 2); }
    // light from above, shadow below
    if (up) {
      const gr = g.createLinearGradient(0, y, 0, y + 16);
      gr.addColorStop(0, 'rgba(255,255,240,0.32)'); gr.addColorStop(1, 'rgba(255,255,240,0)');
      g.fillStyle = gr; g.fillRect(x, y, T, 16);
    }
    if (dn) {
      const gr = g.createLinearGradient(0, y + T, 0, y + T - 18);
      gr.addColorStop(0, 'rgba(0,0,15,0.5)'); gr.addColorStop(1, 'rgba(0,0,15,0)');
      g.fillStyle = gr; g.fillRect(x, y + T - 18, T, 18);
    }
    if (lf) { g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(x, y, 3, T); }
    if (rt) { g.fillStyle = 'rgba(0,0,20,0.22)'; g.fillRect(x + T - 4, y, 4, T); }
    const rim = RIM[c];
    if (rim) {
      g.strokeStyle = rim; g.lineWidth = 3;
      rimPath(g, x, y, up, dn, lf, rt, R);
      g.stroke();
    }
    // special trims
    if (up && (c === 'B' || c === '%')) {
      g.fillStyle = 'rgba(255,252,240,0.8)'; g.fillRect(x, y, T, 4);
      g.fillStyle = 'rgba(80,70,55,0.45)'; g.fillRect(x, y + 5, T, 2);
    }
    if (up && c === 'G') {
      // golden roof shingles
      for (let row = 0; row < 2; row++) for (let i = -1; i < 5; i++) {
        const sx = x + i * 12 + (row % 2) * 6, sy = y + 4 + row * 8;
        const gr = g.createLinearGradient(sx, sy, sx, sy + 9);
        gr.addColorStop(0, '#ffe59a'); gr.addColorStop(1, '#b07a1c');
        g.fillStyle = gr; g.beginPath(); g.arc(sx + 6, sy, 6.5, 0, Math.PI); g.fill();
      }
      g.fillStyle = 'rgba(255,248,210,0.9)'; g.fillRect(x, y, T, 3);
    }
    if (up && (c === 'T' || c === 'R')) {
      g.fillStyle = 'rgba(160,190,240,0.5)'; g.fillRect(x, y, T, 4);
      g.fillStyle = 'rgba(10,16,40,0.6)';
      for (let i = 0; i < 6; i++) g.fillRect(x + i * 8 + 2, y + 6, 5, 5);
    }
    if (c === '%') {
      // cracks, so you know you can break it
      g.strokeStyle = 'rgba(40,25,10,0.8)'; g.lineWidth = 2.2;
      const r = U.seeded(tx * 999 + ty);
      for (let k = 0; k < 3; k++) {
        let px = x + 8 + r() * 32, py = y + 2;
        g.beginPath(); g.moveTo(px, py);
        while (py < y + T) { px += (r() - 0.5) * 18; py += 6 + r() * 8; g.lineTo(px, py); }
        g.stroke();
      }
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; g.stroke();
    }
    g.restore();
    if (c === 'R') AT.Art.rune(g, x, y, tx * 7 + ty);
    // things growing on top
    if (up && c === '#') {
      if (zone === 0) {
        const gr = g.createLinearGradient(0, y - 3, 0, y + 10);
        gr.addColorStop(0, '#f1dca6'); gr.addColorStop(1, 'rgba(200,170,110,0)');
        g.fillStyle = gr;
        g.beginPath(); g.moveTo(x - 1, y + 10);
        for (let i = 0; i <= 6; i++) g.lineTo(x + (i * T) / 6, y - 1.5 + Math.sin((tx * 6 + i) * 1.3) * 1.8);
        g.lineTo(x + T + 1, y + 10); g.fill();
        const r = U.seeded(tx * 37 + ty);
        for (let i = 0; i < 3; i++) { g.fillStyle = ['#fff4e0', '#f7b6a0', '#d9c6a0'][i]; g.beginPath(); g.ellipse(x + r() * T, y + 2 + r() * 3, 2 + r() * 2, 1.4, 0, 0, Math.PI * 2); g.fill(); }
      } else {
        g.strokeStyle = zone === 1 ? 'rgba(110,170,90,0.7)' : 'rgba(150,140,70,0.6)'; g.lineWidth = 1.6; g.lineCap = 'round';
        const r = U.seeded(tx * 31 + ty);
        for (let i = 0; i < 7; i++) { const px = x + r() * T; g.beginPath(); g.moveTo(px, y + 2); g.quadraticCurveTo(px + (r() - 0.5) * 6, y - 4, px + (r() - 0.5) * 8, y - 3 - r() * 6); g.stroke(); }
      }
    }
    if (up && c === 'X') {
      const r = U.seeded(tx * 53 + ty);
      for (let i = 0; i < 2; i++) {
        const px = x + 8 + r() * 32, h = 6 + r() * 10;
        g.fillStyle = r() > 0.5 ? 'rgba(120,240,255,0.85)' : 'rgba(210,150,255,0.85)';
        g.beginPath(); g.moveTo(px - 3, y + 2); g.lineTo(px, y - h); g.lineTo(px + 3, y + 2); g.fill();
      }
    }
  }

  function drawProp(g, p) {
    const x = p.tx * T, y = p.ty * T, seed = p.tx * 131 + p.ty * 17;
    const stone = p.zone >= 3 ? 'temple' : 'marble';
    const Art = AT.Art;
    switch (p.ch) {
      case '|': {
        const up = raw(p.tx, p.ty - 1), dn = raw(p.tx, p.ty + 1);
        const top = !isColumn(p.tx, p.ty - 1) && !isSolidCh(up), bottom = !isColumn(p.tx, p.ty + 1);
        Art.column(g, x, y, top, bottom, false, seed, stone);
        break;
      }
      case '/': Art.column(g, x, y, true, !isColumn(p.tx, p.ty + 1), true, seed, stone); break;
      case 'S': Art.statue(g, x + T / 2, y + T, seed, 1, p.zone >= 3 ? 'bronze' : 'marble'); break;
      case 'P': Art.poseidon(g, x + T / 2, y + T); break;
      case 'c': Art.coral(g, x + T / 2, y + T, seed, p.zone); break;
      case 'L': Art.lamp(g, x + T / 2, y + T); break;
      case 'C': {
        g.save();
        let ax = x + T / 2, ay = y + T, rot = 0;
        if (solid(p.tx, p.ty + 1)) { /* on the floor */ } else if (solid(p.tx, p.ty - 1)) { ay = y; rot = Math.PI; } else if (solid(p.tx - 1, p.ty)) { ax = x; ay = y + T / 2; rot = Math.PI / 2; } else if (solid(p.tx + 1, p.ty)) { ax = x + T; ay = y + T / 2; rot = -Math.PI / 2; } else { ay = y + T / 2 + 10; }
        g.translate(ax, ay); g.rotate(rot);
        Art.crystals(g, 0, 0, seed);
        g.restore();
        break;
      }
    }
  }
  const propAt = new Map();
  function isColumn(tx, ty) { return propAt.get(tx + ',' + ty) === '|'; }

  function buildChunk(cx, cy) {
    if (!propAt.size) props.forEach((p) => propAt.set(p.tx + ',' + p.ty, p.ch));
    const size = CH * T * chunkRes;
    const c = U.canvas(size, size);
    const g = c.getContext('2d');
    g.scale(chunkRes, chunkRes);
    g.translate(-cx * CH * T, -cy * CH * T);
    const tx0 = cx * CH, ty0 = cy * CH;
    // 1. back walls
    for (let ty = ty0; ty < ty0 + CH; ty++) for (let tx = tx0; tx < tx0 + CH; tx++) {
      const ch = raw(tx, ty);
      if (BACK.includes(ch)) drawBack(g, tx, ty, ch);
    }
    // 2. decorations (also the ones just outside, because statues are tall)
    for (const p of props) {
      if (p.tx < tx0 - 3 || p.tx > tx0 + CH + 3 || p.ty < ty0 - 1 || p.ty > ty0 + CH + 8) continue;
      drawProp(g, p);
    }
    // 3. walls, painted on their own layer so we can shade the inside of the rock
    if (!tmp || tmp.width !== size) tmp = U.canvas(size, size);
    const s = tmp.getContext('2d');
    s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, size, size);
    s.setTransform(chunkRes, 0, 0, chunkRes, -cx * CH * T * chunkRes, -cy * CH * T * chunkRes);
    let any = false;
    for (let ty = ty0 - 1; ty <= ty0 + CH; ty++) for (let tx = tx0 - 1; tx <= tx0 + CH; tx++) {
      const ch = raw(tx, ty);
      if (ty >= 0 && isSolidCh(ch)) { drawSolid(s, tx, ty, ch); any = true; }
    }
    if (any) {
      // darker deep inside the rock (a tiny picture, stretched smoothly)
      const dm = U.canvas(CH + 2, CH + 2, (dg) => {
        const img = dg.createImageData(CH + 2, CH + 2);
        for (let j = 0; j < CH + 2; j++) for (let i = 0; i < CH + 2; i++) {
          const d = distAt(tx0 + i - 1, ty0 + j - 1);
          const a = d <= 1 ? 0 : Math.min(0.42, (d - 1) * 0.16);
          img.data[(j * (CH + 2) + i) * 4 + 3] = a * 255;
        }
        dg.putImageData(img, 0, 0);
      });
      s.globalCompositeOperation = 'source-atop';
      s.imageSmoothingEnabled = true;
      s.drawImage(dm, (tx0 - 1) * T, (ty0 - 1) * T, (CH + 2) * T, (CH + 2) * T);
      s.globalCompositeOperation = 'source-over';
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (!AT.lowGfx) { g.shadowColor = 'rgba(0,5,20,0.55)'; g.shadowBlur = 10 * chunkRes; }
      g.drawImage(tmp, 0, 0);
      g.shadowBlur = 0;
    }
    return c;
  }

  function drawChunks(g, cam) {
    const size = CH * T;
    const cx0 = Math.floor(cam.x / size), cx1 = Math.floor((cam.x + cam.w) / size);
    const cy0 = Math.max(0, Math.floor(cam.y / size)), cy1 = Math.floor((cam.y + cam.h) / size);
    let built = 0;
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      if (cx < 0 || cx * CH >= cols || cy * CH >= rows) continue;
      const key = cx + ',' + cy;
      let c = chunks.get(key);
      if (!c) {
        if (built >= 2 && chunks.size) continue;   // don't freeze: build a few per frame
        c = buildChunk(cx, cy); chunks.set(key, c); built++;
      }
      g.drawImage(c, cx * size, cy * size, size, size);
    }
    // nothing to build on screen? build one just outside, so it's ready before you get there
    if (!built) {
      outer: for (let cy = cy0 - 1; cy <= cy1 + 1; cy++) for (let cx = cx0 - 1; cx <= cx1 + 1; cx++) {
        if (cx < 0 || cy < 0 || cx * CH >= cols || cy * CH >= rows) continue;
        const key = cx + ',' + cy;
        if (!chunks.has(key)) { chunks.set(key, buildChunk(cx, cy)); break outer; }
      }
    }
    // forget chunks that are far away (saves memory)
    if (chunks.size > 60) {
      for (const key of chunks.keys()) {
        const [kx, ky] = key.split(',').map(Number);
        if (ky < cy0 - 3 || ky > cy1 + 3 || kx < cx0 - 3 || kx > cx1 + 3) chunks.delete(key);
      }
    }
  }

  // build every chunk near a spot right away (used when teleporting)
  function warm(cam) {
    const size = CH * T;
    for (let cy = Math.floor(cam.y / size) - 1; cy <= Math.floor((cam.y + cam.h) / size) + 1; cy++)
      for (let cx = Math.floor(cam.x / size) - 1; cx <= Math.floor((cam.x + cam.w) / size) + 1; cx++) {
        if (cx < 0 || cy < 0 || cx * CH >= cols || cy * CH >= rows) continue;
        const key = cx + ',' + cy;
        if (!chunks.has(key)) chunks.set(key, buildChunk(cx, cy));
      }
  }

  return {
    load, raw, solid, solidAt, collide, ray, breakTile, explore, exploredString, zoneAtY, zoneOfRow,
    drawChunks, warm, setRes, isSolidCh,
    get cols() { return cols; }, get rows() { return rows; },
    get W() { return cols * T; }, get H() { return rows * T; },
    get items() { return items; }, get spawns() { return spawns; }, get kelp() { return kelp; },
    get grass() { return grass; }, get glows() { return glows; }, get explored() { return explored; },
  };
})();
