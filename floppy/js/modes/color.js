// ============================================================
//  FLOPPY PARTY — COLOR PANIC
//  The floor is made of colored tiles. A color is called out:
//  run to a tile of that color before the others drop away!
//  It gets faster every time. Last one standing wins. First to 3.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.color = (function () {
  const N = 7, SIZE = 2.2, GAP = 0.1;
  const PALETTE = [
    { name: 'PINK', hex: 0xff7eb6, css: '#ff7eb6' },
    { name: 'YELLOW', hex: 0xffd23f, css: '#ffd23f' },
    { name: 'GREEN', hex: 0x6ad65a, css: '#6ad65a' },
    { name: 'BLUE', hex: 0x4aa8ff, css: '#4aa8ff' },
    { name: 'PURPLE', hex: 0xa77bff, css: '#a77bff' },
  ];
  // phases: 'calm' (tiles up, waiting), 'warn' (color called, run!), 'drop' (wrong tiles gone), 'rise' (coming back)
  let tiles = [], phase = 'calm', timer = 0, target = 0, cycle = 0, sign = null;

  function shuffle() {
    // every color appears a few times, spread around randomly
    const colors = tiles.map((_, i) => i % PALETTE.length);
    for (let i = colors.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [colors[i], colors[j]] = [colors[j], colors[i]]; }
    tiles.forEach((t, i) => { t.c = colors[i]; });
    paint();
  }
  function paint() { for (const t of tiles) t.mesh.material.color.setHex(PALETTE[t.c].hex); }

  function build() {
    tiles = []; phase = 'calm'; timer = 2.5; cycle = 0; target = 0;
    const half = (N - 1) / 2;
    for (let ix = 0; ix < N; ix++) {
      for (let iz = 0; iz < N; iz++) {
        const x = (ix - half) * SIZE, z = (iz - half) * SIZE;
        const b = FP.Stage.block(x, -0.3, z, SIZE - GAP, 0.6, SIZE - GAP, 0xffffff, { kinematic: true, unique: true });
        tiles.push({ x, z, body: b.body, mesh: b.mesh, c: 0, y: -0.3 });
      }
    }
    tiles.forEach((t, i) => { t.c = (i * 3 + Math.floor(i / N)) % PALETTE.length; });
    paint();
    // a big light-up billboard that shows the color to find
    const g = FP.Props.billboard(3.6, 1.9);
    g.position.set(0, 3.2, -N * SIZE / 2 - 2);
    FP.Stage.add(g);
    FP.Stage.island(0, -1.6, -N * SIZE / 2 - 2, 5, 1.6, 2, { grass: 0x9bd46e });
    sign = g.userData.panel;
    // lamps in the corners
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const l = FP.Props.lamp(0xfff1b8);
      l.position.set(x * (N * SIZE / 2 + 1.2), -2.2, z * (N * SIZE / 2 + 1.2));
      FP.Stage.add(l);
      FP.Stage.island(x * (N * SIZE / 2 + 1.2), -2.8, z * (N * SIZE / 2 + 1.2), 1.4, 1.2, 1.4, { grass: 0x9bd46e });
    }
    FP.Camera.setAngle(0.8, 0.75);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 3.2, 3.2, 0.4); }

  const warnTime = () => Math.max(1.3, 3.8 - cycle * 0.3);

  function moveTiles(dt) {
    for (const t of tiles) {
      const down = phase === 'drop' && t.c !== target;
      const want = down ? -12 : t.y;
      const y = t.body.position.y;
      const speed = down ? 14 : 8;
      const ny = Math.abs(want - y) < speed * dt ? want : y + Math.sign(want - y) * speed * dt;
      t.body.velocity.set(0, (ny - y) / (dt || 1), 0);
      t.body.position.y = ny;
      // wobble the wrong tiles just before they drop
      if (phase === 'warn' && timer < 0.8 && t.c !== target) t.body.position.x = t.x + Math.sin(timer * 60 + t.z) * 0.04;
      else t.body.position.x = t.x;
    }
  }

  function visual(dt) {
    const show = phase === 'warn' || phase === 'drop';
    sign.material.color.setHex(show ? PALETTE[target].hex : 0xffffff);
    sign.parent.rotation.z = show ? Math.sin(performance.now() / 120) * 0.02 : 0;
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      timer -= dt;
      if (timer <= 0) {
        if (phase === 'calm' || phase === 'rise') {
          if (phase === 'rise') shuffle();
          phase = 'warn';
          target = Math.floor(Math.random() * PALETTE.length);
          // later on, fewer tiles of the right color are left
          const good = tiles.filter((t) => t.c === target).sort(() => Math.random() - 0.5);
          const keep = Math.max(2, 9 - cycle);
          good.slice(keep).forEach((t) => { t.c = (target + 1 + Math.floor(Math.random() * (PALETTE.length - 1))) % PALETTE.length; });
          paint();
          timer = warnTime();
          const col = PALETTE[target];
          FP.UI.big(col.name, 1.2, 'Get on a ' + col.name.toLowerCase() + ' tile!');
          if (FP.Net) FP.Net.banner(col.name, 'Get on a ' + col.name.toLowerCase() + ' tile!');
          FP.Audio.play('beep');
        } else if (phase === 'warn') {
          phase = 'drop'; timer = 2.2; FP.Audio.play('whoosh');
        } else if (phase === 'drop') {
          phase = 'rise'; timer = 1.6; cycle++;
        }
      }
    }
    moveTiles(dt);
    visual(dt);
    if (roundOver || dt === 0) return null;
    FP.Kit.fallOut(chars, game, -5);
    return FP.Kit.lastStanding(chars);
  }

  // bot brain: when a color is called, run to the closest tile of that color
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position;
    let goal = null;
    if (phase === 'warn' || phase === 'drop') {
      const near = FP.Kit.nearest(c, tiles, (t) => t.c === target);
      if (near) goal = near.item;
    }
    if (goal) {
      const dx = goal.x - p.x, dz = goal.z - p.z, d = Math.hypot(dx, dz);
      if (d > 0.45) { input.x = dx / d; input.z = dz / d; }
      if (d < 0.9) { input.x *= 0.3; input.z *= 0.3; }
      // someone else on my tile? shove them off!
      for (const o of chars) if (o !== c && o.alive && o.parts.torso.position.distanceTo(p) < 1.3 && Math.random() < dt * 2.5) input.punchPressed = true;
    } else {
      // waiting: wander around the middle, poke people
      const b = tools.brain;
      b.wander += dt * 0.4;
      tools.steer(c, Math.cos(b.wander + c.index * 1.7) * 3, Math.sin(b.wander * 1.3 + c.index) * 3, input);
      input.x *= 0.6; input.z *= 0.6;
      FP.Kit.punchNearby(c, chars, dt, input, tools, 1.3, 1.5);
    }
    if (c.grabbedBy && Math.random() < dt * 6) input.jumpPressed = true;
    return true;
  }

  function hud() {
    if (phase === 'warn' || phase === 'drop') {
      const col = PALETTE[target];
      return `Find <b style="color:${col.css};-webkit-text-stroke:1px #2a2140">${col.name}</b> ${phase === 'warn' ? `<span class="fuse"><i style="width:${Math.round((timer / warnTime()) * 100)}%"></i></span>` : ''}`;
    }
    return 'Get ready...';
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><g stroke="#2a2140" stroke-width="2"><rect x="18" y="40" width="20" height="14" fill="#ff7eb6"/><rect x="38" y="40" width="20" height="14" fill="#4aa8ff"/><rect x="58" y="40" width="20" height="14" fill="#ffd23f"/><rect x="78" y="40" width="20" height="14" fill="#6ad65a"/><rect x="18" y="54" width="20" height="14" fill="#a77bff"/><rect x="38" y="54" width="20" height="14" fill="#ffd23f"/><rect x="78" y="54" width="20" height="14" fill="#ff7eb6"/><rect x="42" y="8" width="36" height="20" rx="3" fill="#ffd23f"/></g><path d="M58 60h20" stroke="#2a2140" stroke-width="2" stroke-dasharray="3 3"/><ellipse cx="68" cy="34" rx="5" ry="6" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="68" cy="25" r="4" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/></svg>';

  return {
    id: 'color', name: 'Color Panic', roundsToWin: 3, minTotal: 2, removeOut: 1.5, song: 'tense', minZoom: 16, art: ART,
    desc: 'A color is called: run to a tile of that color before the others drop away!',
    build, spawn, update, botThink, hud, visual,
    netState: () => ({ c: tiles.map((t) => t.c).join(''), t: target, p: phase, k: Math.round(timer * 10) / 10, n: cycle }),
    applyNetState: (s) => {
      let changed = false;
      tiles.forEach((t, i) => { const v = +s.c[i]; if (t.c !== v) { t.c = v; changed = true; } });
      if (changed) paint();
      target = s.t; phase = s.p; timer = s.k; cycle = s.n;
    },
  };
})();
