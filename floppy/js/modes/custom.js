// ============================================================
//  FLOPPY PARTY — MY ARENA (knockout on arenas YOU built)
//  Build arenas in the Level Editor (floor, blocks, walls,
//  jump pads, ice, lava and start spots), then play them here.
//  3 rules to pick in the editor:
//   Knockout: fall off (or step in lava) and you're out.
//             Last one standing wins the round. First to 3!
//   Coin Grab: coins pop up on your arena. Most coins wins.
//   King of the Hill: get on the gold Hill squares alone to be
//             the King. You score until someone pushes you off.
//             First to 30 (or the most when time is up).
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.custom = (function () {
  const N = 14, C = 1.3, TIME = 90, COIN_TIME = 60, HILL_TIME = 75, HILL_GOAL = 30, COINS = 10;
  const RULES = ['ko', 'coins', 'hill'];
  const RULE_NAMES = { ko: 'Knockout', coins: 'Coin Grab', hill: 'King of the Hill' };
  let cells = '', netCells = null, netRule = null, time = 0, self = null, spawns = [], decor = [];
  let coins = [], coinSpots = [], hillCells = [], hillGlow = [], king = null, lavaT = new Map();

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
  const rule = () => { const r = currentMap().rule; return RULES.includes(r) ? r : 'ko'; };

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
        else if (k === 'k') S.island(x, -1, z, w, 2, C, { grass: 0xffd23f, dirt: 0x9a7a3a });
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
    if (FP.Net && FP.Net.isClient()) return { cells: netCells || '', rule: netRule };
    if (!FP.Editor) return { cells: '' };
    const a = FP.Editor.playing();
    // an empty arena can't be played: use the ready-made one instead
    const floor = a.cells.split('').filter((ch) => 'fsijbk'.includes(ch)).length;
    return floor >= 6 ? a : FP.Editor.sample();
  }

  function build() {
    time = 0; king = null; lavaT = new Map(); respawn.clear();
    buildMap(currentMap(), false);
    FP.Camera.setAngle(0.8, 0.75);
    // Coin Grab: coins can pop up on any floor square (and on top of blocks)
    coins = []; coinSpots = []; hillCells = []; hillGlow = [];
    const r = rule();
    for (let i = 0; i < N * N; i++) {
      const ch = cells[i], x = cx(i % N), z = cz(Math.floor(i / N));
      if ('fsik'.includes(ch)) coinSpots.push({ x, z, y: 0 });
      else if (ch === 'b') coinSpots.push({ x, z, y: 0.8 });
      if (ch === 'k') hillCells.push({ x, z });
    }
    if (r === 'coins') {
      for (let i = 0; i < COINS; i++) {
        const m = FP.Kit.coinMesh(0.32); m.position.set(0, -100, 0); FP.Stage.add(m);
        const o = { mesh: m, on: false, x: 0, y: -100, z: 0 };
        coins.push(o);
        if (coinSpots.length) placeCoin(o);
      }
    }
    if (r === 'hill') {
      // no Hill squares painted? Then the middle of the arena is the hill
      if (!hillCells.length) {
        const floor = coinSpots.filter((q) => q.y === 0).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
        hillCells = floor.slice(0, 4).map((q) => ({ x: q.x, z: q.z }));
      }
      for (const h of hillCells) {
        const g = new THREE.Mesh(new THREE.PlaneGeometry(C * 0.96, C * 0.96), new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 0.35 }));
        g.rotation.x = -Math.PI / 2; g.position.set(h.x, 0.04, h.z); FP.Stage.add(g); hillGlow.push(g);
      }
    }
  }
  function placeCoin(o) {
    let best = null;
    for (let k = 0; k < 10; k++) {
      best = coinSpots[Math.floor(Math.random() * coinSpots.length)];
      if (!coins.some((q) => q !== o && q.on && Math.hypot(q.x - best.x, q.z - best.z) < 1.4)) break;
    }
    o.on = true; o.x = best.x; o.z = best.z; o.y = best.y + 0.55;
  }
  const onHill = (p) => hillCells.some((h) => Math.abs(p.x - h.x) < C * 0.55 && Math.abs(p.z - h.z) < C * 0.55) && p.y < 2.2 && p.y > 0.3;
  // (in Coin Grab and King of the Hill, falling off isn't "out": you come back)
  const respawn = FP.Kit.respawner((c) => {
    const sc = FP.Game.scores, id = c.player.id;
    if (rule() === 'coins' && sc[id]) sc[id] = Math.max(0, sc[id] - 2);
    const s = spawns.length ? spawns[Math.floor(Math.random() * spawns.length)] : spawn(Math.floor(Math.random() * 4), 4);
    return { x: s.x, y: 0.3, z: s.z, yaw: Math.atan2(-s.x, -s.z) };
  });

  // start spots from the map, or spread out on the floor if there aren't enough
  function spawn(i, n) {
    if (spawns.length >= n) { const s = spawns[i]; return { x: s.x, y: 0.2, z: s.z, yaw: Math.atan2(-s.x, -s.z) }; }
    const a = (i / n) * Math.PI * 2 + 0.4;
    let best = null, bd = Infinity;
    for (let k = 0; k < N * N; k++) {
      if (!'fsijk'.includes(cells[k])) continue;
      const x = cx(k % N), z = cz(Math.floor(k / N));
      const d = Math.hypot(x - Math.cos(a) * 3.5, z - Math.sin(a) * 3.5);
      if (d < bd) { bd = d; best = { x, z }; }
    }
    if (!best) best = { x: 0, z: 0 };
    return { x: best.x, y: best.y || 0.2, z: best.z, yaw: Math.atan2(-best.x, -best.z) };
  }

  function visual() {
    const t = performance.now() / 1000;
    for (const a of decor) { a.position.y = 0.3 + Math.abs(Math.sin(t * 4)) * 0.15; a.rotation.y = t * 2; }
    for (const o of coins) { if (!o.on) { o.mesh.position.y = -100; continue; } o.mesh.position.set(o.x, o.y + Math.sin(t * 3 + o.x) * 0.08, o.z); o.mesh.rotation.y = t * 3 + o.z; }
    for (const g of hillGlow) g.material.opacity = 0.25 + Math.abs(Math.sin(t * 3)) * 0.35;
  }

  function update(dt, chars, game, roundOver) {
    visual();
    if (roundOver || dt === 0) return null;
    time += dt;
    const r = rule();
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
      // lava! (Knockout: you're out. Other rules: OUCH, bounce, and lose a coin)
      if (under === 'l' && p.y < 1.1) {
        for (const b of c.bodies) b.velocity.y = 9;
        FP.FX.puffs(new THREE.Vector3(p.x, 0.2, p.z), 14, 0xff9a3c, 4, 1.4);
        if (r === 'ko') { FP.FX.word(c.parts.head.position, 'HOT HOT HOT!', '#ff5a1a', 1.4); game.eliminate(c, 'got toasted!'); }
        else if ((lavaT.get(c) || 0) < time) {
          lavaT.set(c, time + 0.8);
          FP.FX.word(c.parts.head.position, 'HOT!', '#ff5a1a', 1.1);
          if (r === 'coins' && game.scores[c.player.id]) game.scores[c.player.id]--;
          FP.Audio.play('boing');
        }
      }
    }
    if (r === 'ko') {
      FP.Kit.fallOut(chars, game, -5);
      const res = FP.Kit.lastStanding(chars);
      if (res) return res;
      if (time >= TIME) return { winners: [], text: 'Time is up!', sub: 'Nobody wins this round' };
      return null;
    }
    respawn.update(chars, dt, -6);
    if (r === 'coins') {
      for (const o of coins) {
        if (!o.on) continue;
        for (const c of chars) {
          if (!c.alive || c.ko > 0) continue;
          const p = c.parts.torso.position;
          if (Math.hypot(p.x - o.x, p.z - o.z) < 0.9 && Math.abs(p.y - o.y) < 1.2) {
            o.on = false;
            game.scores[c.player.id] = (game.scores[c.player.id] || 0) + 1;
            FP.FX.word(o.mesh.position, '+1', '#ffcf33', 0.8);
            FP.Audio.play('coin');
            break;
          }
        }
        if (!o.on) placeCoin(o);
      }
      if (time >= COIN_TIME) {
        const w = FP.Kit.mostPoints(chars, game.scores);
        return { winners: w, text: w.length === 1 ? `${w[0].name} is the richest!` : 'It\'s a tie!' };
      }
      return null;
    }
    // King of the Hill: the first one alone on the hill is the King, and scores until pushed off
    const on = chars.filter((c) => c.alive && c.ko <= 0 && !respawn.waiting(c) && onHill(c.parts.torso.position));
    if (!(king && on.includes(king))) king = on.length === 1 ? on[0] : null;
    if (king) {
      const id = king.player.id, before = Math.floor(game.scores[id] || 0);
      game.scores[id] = (game.scores[id] || 0) + dt;
      if (Math.floor(game.scores[id]) > before && Math.floor(game.scores[id]) % 5 === 0) FP.Audio.play('ding');
      if (game.scores[id] >= HILL_GOAL) return { winners: [king], text: `${king.player.name} is the King of the Hill!` };
    }
    if (time >= HILL_TIME) {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `${w[0].name} is the King of the Hill!` : 'It\'s a tie!' };
    }
    return null;
  }

  // bot brains for Coin Grab (go get coins) and King of the Hill (get on the hill, push others off)
  function botThink(c, chars, dt, input, tools) {
    const r = rule();
    if (r === 'ko') return false;
    const b = tools.brain, p = c.parts.torso.position;
    if (r === 'coins') {
      b.coinT = (b.coinT || 0) - dt;
      if (!b.coin || !b.coin.on || b.coinT <= 0) {
        const n = FP.Kit.nearest(c, coins, (o) => o.on);
        b.coin = n ? n.item : null; b.coinT = 1 + Math.random();
      }
      if (b.coin) { const d = tools.steer(c, b.coin.x, b.coin.z, input); if (b.coin.y > p.y - FP.Ragdoll.STAND + 0.9 && d < 2.2 && c.grounded) input.jumpPressed = true; }
    } else {
      // someone close on the hill? Fight them off (punch, grab, throw). Otherwise: go to the hill
      const o = FP.Kit.nearest(c, chars.filter((q) => q !== c && q.alive && q.ko <= 0).map((q) => ({ x: q.parts.torso.position.x, z: q.parts.torso.position.z })));
      if (o && o.d < 1.8 && onHill(p)) return false;
      const h = FP.Kit.nearest(c, hillCells);
      if (h) tools.steer(c, h.item.x, h.item.z, input);
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const r = rule(), name = FP.UI.escapeHtml(currentMap().name || 'My Arena');
    if (r === 'coins') return `<span>${FP.UI.ICON.clock} ${FP.Kit.clock(COIN_TIME - time)}</span><span class="hud-tip">${name}: grab the most coins!</span>`;
    if (r === 'hill') return `<span>${FP.UI.ICON.clock} ${FP.Kit.clock(HILL_TIME - time)}</span><span class="hud-tip">${name}: get on the gold hill and stay there! First to ${HILL_GOAL}${king ? ` <b>${FP.UI.escapeHtml(king.player.name)} is the King</b>` : ''}</span>`;
    return `<span>${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}</span><span class="hud-tip">${name}: knock everyone off!</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe3ff"/><g stroke="#2a2140" stroke-width="2"><rect x="20" y="40" width="80" height="26" fill="#8fd46a"/><rect x="28" y="26" width="16" height="14" fill="#ffb35a"/><rect x="76" y="18" width="14" height="22" fill="#9a7bff"/><rect x="50" y="48" width="20" height="10" fill="#ff7a2a"/><ellipse cx="60" cy="44" rx="8" ry="3" fill="#ff7eb6"/></g><path d="M60 10v14M53 17h14" stroke="#2a2140" stroke-width="3" stroke-linecap="round"/></svg>';

  self = {
    id: 'custom', name: 'My Arena', minTotal: 2, removeOut: 1.5, song: 'party', minZoom: 16, art: ART,
    desc: 'Play on an arena YOU built in the Level Editor! Knockout, Coin Grab or King of the Hill.',
    build, spawn, update, hud, visual, botThink, buildMap, cellAt, N, C, RULES, RULE_NAMES,
    // the rule changes how the match works (Knockout: first to 3 rounds. The others: one round, most points)
    get roundsToWin() { return rule() === 'ko' ? 3 : 1; },
    set roundsToWin(v) { if (this !== self) Object.defineProperty(this, 'roundsToWin', { value: v, writable: true, configurable: true }); },
    get single() { return rule() !== 'ko'; },
    get scoreLabel() { return rule() === 'ko' ? undefined : (v) => Math.floor(v); },
    teamOk: () => rule() === 'ko',
    netSetup: () => ({ c: currentMap().cells, r: rule() }),
    applyNetSetup: (c) => {
      const cellsIn = c && typeof c === 'object' ? c.c : c;
      netCells = typeof cellsIn === 'string' && cellsIn.length === N * N ? cellsIn : null;
      netRule = c && typeof c === 'object' && RULES.includes(c.r) ? c.r : 'ko';
    },
    netState: () => ({ co: coins.map((o) => (o.on ? [Math.round(o.x * 50) / 50, Math.round(o.y * 50) / 50, Math.round(o.z * 50) / 50] : 0)) }),
    applyNetState: (st) => {
      if (!st || !Array.isArray(st.co)) return;
      st.co.forEach((v, i) => {
        let o = coins[i];
        if (!o) { const m = FP.Kit.coinMesh(0.32); FP.Stage.add(m); o = coins[i] = { mesh: m, on: false, x: 0, y: -100, z: 0 }; }
        o.on = !!v; if (v) { o.x = v[0]; o.y = v[1]; o.z = v[2]; }
      });
    },
    // the setup screen lets you pick which of your 3 arenas to play
    setupHtml: () => (FP.Editor ? `<div class="skill"><span class="lbl">Arena</span>${FP.Editor.arenas().map((a, i) => `<button class="chip${i === FP.Editor.slot() ? ' on' : ''}" data-arena="${i}">${FP.UI.escapeHtml(a.name)}</button>`).join('')}<button class="chip" data-edit>Edit</button></div><p class="small">Rule: <b>${RULE_NAMES[rule()]}</b> (change it in the Level Editor)</p>` : ''),
    setupWire: (card, redraw) => {
      card.querySelectorAll('[data-arena]').forEach((b) => b.addEventListener('click', () => { FP.Editor.setSlot(+b.dataset.arena); FP.Audio.play('menu'); redraw(); }));
      card.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => FP.Game.editor()));
    },
  };
  return self;
})();
