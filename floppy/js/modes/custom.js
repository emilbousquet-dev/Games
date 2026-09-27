// ============================================================
//  FLOPPY PARTY — MY ARENA (knockout on arenas YOU built)
//  Build arenas in the Level Editor (floor, blocks, walls,
//  jump pads, ice, lava and start spots), then play them here.
//  Knockout rules: fall off (or step in lava) and you're out.
//  Last one standing wins the round. First to 3!
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.custom = (function () {
  const N = 14, C = 1.3, TIME = 90;
  let cells = '', netCells = null, time = 0, self = null, spawns = [], decor = [];

  // grid square -> world position
  const cx = (col) => (col - (N - 1) / 2) * C;
  const cz = (row) => (row - (N - 1) / 2) * C;
  function cellAt(x, z) {
    const col = Math.round(x / C + (N - 1) / 2), row = Math.round(z / C + (N - 1) / 2);
    if (col < 0 || row < 0 || col >= N || row >= N) return '.';
    return cells[row * N + col] || '.';
  }
  // floor, start spots and jump pads are all "ground" for the physics
  const kindOf = (ch) => (ch === 's' || ch === 'j' ? 'f' : ch);

  // turn a map into a real 3D arena (also used by the Level Editor to show your arena)
  function buildMap(map, preview) {
    cells = (map && map.cells) || '';
    const S = FP.Stage;
    spawns = []; decor = [];
    for (let r = 0; r < N; r++) {
      let c = 0;
      while (c < N) {
        const k = kindOf(cells[r * N + c]);
        if (!k || k === '.') { c++; continue; }
        let e = c;
        while (e + 1 < N && kindOf(cells[r * N + e + 1]) === k) e++;
        // one long box for each row of the same squares (fewer boxes = faster)
        const w = (e - c + 1) * C, x = (cx(c) + cx(e)) / 2, z = cz(r);
        if (k === 'f') S.island(x, -1, z, w, 2, C, { grass: 0x8fd46a, dirt: 0x7a5a48 });
        else if (k === 'i') S.island(x, -1, z, w, 2, C, { grass: 0xd6f1ff, dirt: 0x8ab8d8, material: FP.Physics.mats.ice });
        else if (k === 'b') S.block(x, -0.1, z, w, 1.8, C, 0xffb35a);
        else if (k === 'w') S.block(x, 0.5, z, w, 3, C, 0x9a7bff);
        else if (k === 'l') {
          const lava = S.block(x, -0.6, z, w, 1, C, 0xff6a2a);
          lava.mesh.material = new THREE.MeshBasicMaterial({ color: 0xff7a2a });
        }
        c = e + 1;
      }
    }
    // jump pads and start spots
    for (let i = 0; i < N * N; i++) {
      const ch = cells[i], x = cx(i % N), z = cz(Math.floor(i / N));
      if (ch === 'j') {
        const pad = FP.Look.mesh(new THREE.CylinderGeometry(C * 0.4, C * 0.45, 0.14, 20), FP.Look.toon(0xff7eb6), 0.02);
        pad.position.set(x, 0.07, z); S.add(pad);
        const arrow = FP.Look.mesh(new THREE.ConeGeometry(C * 0.18, 0.3, 4), FP.Look.toon(0xffffff), 0.01);
        arrow.position.set(x, 0.3, z); S.add(arrow);
        decor.push(arrow);
      } else if (ch === 's') {
        spawns.push({ x, z });
        const ring = new THREE.Mesh(new THREE.RingGeometry(C * 0.28, C * 0.4, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: preview ? 0.9 : 0.5, side: THREE.DoubleSide }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.03, z); S.add(ring);
      }
    }
  }

  // the arena being played: the host's saved arena (or the one the host sent us online)
  function currentMap() {
    if (FP.Net && FP.Net.isClient()) return { cells: netCells || '' };
    if (!FP.Editor) return { cells: '' };
    const a = FP.Editor.playing();
    // an empty arena can't be played: use the ready-made one instead
    const floor = a.cells.split('').filter((ch) => 'fsijb'.includes(ch)).length;
    return floor >= 6 ? a : FP.Editor.sample();
  }

  function build() {
    time = 0;
    buildMap(currentMap(), false);
    FP.Camera.setAngle(0.8, 0.75);
  }

  // start spots from the map, or spread out on the floor if there aren't enough
  function spawn(i, n) {
    if (spawns.length >= n) { const s = spawns[i]; return { x: s.x, y: 0.2, z: s.z, yaw: Math.atan2(-s.x, -s.z) }; }
    const a = (i / n) * Math.PI * 2 + 0.4;
    let best = null, bd = Infinity;
    for (let k = 0; k < N * N; k++) {
      if (!'fsij'.includes(cells[k])) continue;
      const x = cx(k % N), z = cz(Math.floor(k / N));
      const d = Math.hypot(x - Math.cos(a) * 3.5, z - Math.sin(a) * 3.5);
      if (d < bd) { bd = d; best = { x, z }; }
    }
    if (!best) best = { x: 0, z: 0 };
    return { x: best.x, y: best.y || 0.2, z: best.z, yaw: Math.atan2(-best.x, -best.z) };
  }

  function update(dt, chars, game, roundOver) {
    const t = performance.now() / 1000;
    for (const a of decor) { a.position.y = 0.3 + Math.abs(Math.sin(t * 4)) * 0.15; a.rotation.y = t * 2; }
    if (roundOver || dt === 0) return null;
    time += dt;
    for (const c of chars) {
      if (!c.alive) continue;
      const p = c.parts.torso.position;
      const under = cellAt(p.x, p.z);
      c.onIce = under === 'i';
      // jump pads launch you high in the air
      if (under === 'j' && p.y < 1.25 && (c.padT || 0) < time) {
        c.padT = time + 0.6;
        for (const b of c.bodies) b.velocity.y = 13;
        FP.FX.puffs(new THREE.Vector3(p.x, 0.2, p.z), 8, 0xff7eb6, 3);
        FP.Audio.play('jump');
      }
      // lava!
      if (under === 'l' && p.y < 1.1) {
        for (const b of c.bodies) b.velocity.y = 9;
        FP.FX.puffs(new THREE.Vector3(p.x, 0.2, p.z), 14, 0xff9a3c, 4, 1.4);
        FP.FX.word(c.parts.head.position, 'HOT HOT HOT!', '#ff5a1a', 1.4);
        game.eliminate(c, 'got toasted!');
      }
    }
    FP.Kit.fallOut(chars, game, -5);
    const res = FP.Kit.lastStanding(chars);
    if (res) return res;
    if (time >= TIME) return { winners: [], text: 'Time is up!', sub: 'Nobody wins this round' };
    return null;
  }

  function hud() { return `<span>${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}</span><span class="hud-tip">${FP.UI.escapeHtml((currentMap().name) || 'My Arena')}: knock everyone off!</span>`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe3ff"/><g stroke="#2a2140" stroke-width="2"><rect x="20" y="40" width="80" height="26" fill="#8fd46a"/><rect x="28" y="26" width="16" height="14" fill="#ffb35a"/><rect x="76" y="18" width="14" height="22" fill="#9a7bff"/><rect x="50" y="48" width="20" height="10" fill="#ff7a2a"/><ellipse cx="60" cy="44" rx="8" ry="3" fill="#ff7eb6"/></g><path d="M60 10v14M53 17h14" stroke="#2a2140" stroke-width="3" stroke-linecap="round"/></svg>';

  self = {
    id: 'custom', name: 'My Arena', roundsToWin: 3, minTotal: 2, removeOut: 1.5, song: 'party', minZoom: 16, art: ART,
    desc: 'Knockout on an arena YOU built in the Level Editor! Last one standing wins.',
    build, spawn, update, hud, buildMap, cellAt, N, C,
    netSetup: () => currentMap().cells,
    applyNetSetup: (c) => { netCells = typeof c === 'string' && c.length === N * N ? c : null; },
    // the setup screen lets you pick which of your 3 arenas to play
    setupHtml: () => (FP.Editor ? `<div class="skill"><span class="lbl">Arena</span>${FP.Editor.arenas().map((a, i) => `<button class="chip${i === FP.Editor.slot() ? ' on' : ''}" data-arena="${i}">${FP.UI.escapeHtml(a.name)}</button>`).join('')}<button class="chip" data-edit>Edit</button></div>` : ''),
    setupWire: (card, redraw) => {
      card.querySelectorAll('[data-arena]').forEach((b) => b.addEventListener('click', () => { FP.Editor.setSlot(+b.dataset.arena); FP.Audio.play('menu'); redraw(); }));
      card.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => FP.Game.editor()));
    },
  };
  return self;
})();
