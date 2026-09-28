// ============================================================
//  FLOPPY PARTY — COLOR PANIC
//  The floor is made of colored tiles. A color is called out:
//  run to a tile of that color before the others drop away!
//  It gets faster every time. Last one standing wins. First to 2.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.color = (function () {
  const N = 7, SIZE = 2.2, GAP = 0.1;
  const PALETTE = [
    { name: 'PINK', hex: 0xff7eb6, css: '#ff7eb6', shape: 'circle' },
    { name: 'YELLOW', hex: 0xffd23f, css: '#ffd23f', shape: 'star' },
    { name: 'GREEN', hex: 0x6ad65a, css: '#6ad65a', shape: 'triangle' },
    { name: 'BLUE', hex: 0x4aa8ff, css: '#4aa8ff', shape: 'square' },
    { name: 'PURPLE', hex: 0xa77bff, css: '#a77bff', shape: 'diamond' },
  ];
  // colorblind shapes (Settings): every color also has its own shape, painted on the tiles
  const cb = () => !!(FP.Settings && FP.Settings.get('colorblind'));
  const poly = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath(); return new THREE.ShapeGeometry(s); };
  let GEOS = null;
  function geos() {
    if (GEOS) return GEOS;
    const star = []; for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.22 : 0.5; star.push([Math.cos(a) * r, Math.sin(a) * r]); }
    GEOS = { circle: new THREE.CircleGeometry(0.42, 28), star: poly(star), triangle: poly([[0, 0.5], [0.46, -0.34], [-0.46, -0.34]]), square: new THREE.PlaneGeometry(0.72, 0.72), diamond: poly([[0, 0.52], [0.38, 0], [0, -0.52], [-0.38, 0]]) };
    return GEOS;
  }
  const shapeMat = new THREE.MeshBasicMaterial({ color: 0x2a2140, transparent: true, opacity: 0.55, depthWrite: false });
  const SVG = { circle: '<circle cx="12" cy="12" r="8"/>', star: '<path d="M12 2l3 7 7 .6-5.4 4.6 1.7 7L12 17.4 5.7 21.2l1.7-7L2 9.6 9 9z"/>', triangle: '<path d="M12 3l10 17H2z"/>', square: '<rect x="4" y="4" width="16" height="16"/>', diamond: '<path d="M12 2l8 10-8 10-8-10z"/>' };
  const shapeIcon = (c) => `<svg class="ico" viewBox="0 0 24 24" fill="#2a2140" aria-hidden="true">${SVG[PALETTE[c].shape]}</svg>`;
  // phases: 'calm' (tiles up, waiting), 'warn' (color called, run!), 'drop' (wrong tiles gone), 'rise' (coming back)
  let tiles = [], phase = 'calm', timer = 0, target = 0, cycle = 0, sign = null, signShape = null;

  function shuffle() {
    // every color appears a few times, spread around randomly
    const colors = tiles.map((_, i) => i % PALETTE.length);
    for (let i = colors.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [colors[i], colors[j]] = [colors[j], colors[i]]; }
    tiles.forEach((t, i) => { t.c = colors[i]; });
    paint();
  }
  function paint() {
    for (const t of tiles) {
      t.mesh.material.color.setHex(PALETTE[t.c].hex);
      if (t.shape) { t.shape.geometry = geos()[PALETTE[t.c].shape]; t.shape.visible = cb(); }
    }
  }

  function build() {
    tiles = []; phase = 'calm'; timer = 2.5; cycle = 0; target = 0;
    const half = (N - 1) / 2;
    for (let ix = 0; ix < N; ix++) {
      for (let iz = 0; iz < N; iz++) {
        const x = (ix - half) * SIZE, z = (iz - half) * SIZE;
        const b = FP.Stage.block(x, -0.3, z, SIZE - GAP, 0.6, SIZE - GAP, 0xffffff, { kinematic: true, unique: true });
        const shape = new THREE.Mesh(geos().circle, shapeMat);
        shape.rotation.x = -Math.PI / 2; shape.position.y = 0.31; shape.scale.setScalar(1.3);
        b.mesh.add(shape);
        tiles.push({ x, z, body: b.body, mesh: b.mesh, c: 0, y: -0.3, shape });
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
    signShape = new THREE.Mesh(geos().circle, new THREE.MeshBasicMaterial({ color: 0x2a2140 }));
    signShape.position.z = 0.01; signShape.scale.setScalar(1.7); signShape.visible = false;
    sign.add(signShape);
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
    if (signShape) { signShape.visible = show && cb(); signShape.geometry = geos()[PALETTE[target].shape]; }
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
          FP.UI.big(col.name, 1.2, 'Get on a ' + col.name.toLowerCase() + ' tile!' + (cb() ? ` (the ${col.shape})` : ''));
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
      return `Find <b class="swatch" style="background:${col.css}">${cb() ? shapeIcon(target) + ' ' : ''}${col.name}</b> ${phase === 'warn' ? `<span class="fuse"><i style="width:${Math.round((timer / warnTime()) * 100)}%"></i></span>` : ''}`;
    }
    return 'Get ready...';
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><g stroke="#2a2140" stroke-width="2"><rect x="18" y="40" width="20" height="14" fill="#ff7eb6"/><rect x="38" y="40" width="20" height="14" fill="#4aa8ff"/><rect x="58" y="40" width="20" height="14" fill="#ffd23f"/><rect x="78" y="40" width="20" height="14" fill="#6ad65a"/><rect x="18" y="54" width="20" height="14" fill="#a77bff"/><rect x="38" y="54" width="20" height="14" fill="#ffd23f"/><rect x="78" y="54" width="20" height="14" fill="#ff7eb6"/><rect x="42" y="8" width="36" height="20" rx="3" fill="#ffd23f"/></g><path d="M58 60h20" stroke="#2a2140" stroke-width="2" stroke-dasharray="3 3"/><ellipse cx="68" cy="34" rx="5" ry="6" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="68" cy="25" r="4" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/></svg>';

  return {
    id: 'color', name: 'Color Panic', roundsToWin: 2, minTotal: 2, removeOut: 1.5, song: 'race', minZoom: 16, art: ART,
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
