// ============================================================
//  NINJA CAT — THE GAME
//  Main loop, split screen, levels, lives, the shop, saving
//  and all the menus.
//
//  Secret test codes (add them to the address):
//    ?level=3   start right in level 3
//    ?2p        start with 2 players
//    ?god       nothing can hurt you
//    ?all       unlock all levels
// ============================================================
window.NC = window.NC || {};

(function () {
  const U = NC.U;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  // ---------- saved progress ----------
  const DEFAULT_SAVE = {
    unlocked: 1, wallet: 0, best: {}, stars: {}, bells: {}, won: false,
    owned: ['none', 'silver'],
    equip: { mochi: { hat: 'none', sword: 'silver' }, shadow: { hat: 'none', sword: 'silver' } },
    upgrades: { heart: 0, bag: 0, smoke: 0 },
  };
  function loadSave() {
    const s = NC.store.get('save', null);
    const d = JSON.parse(JSON.stringify(DEFAULT_SAVE));
    if (!s) return d;
    return Object.assign(d, s, { equip: Object.assign(d.equip, s.equip || {}), upgrades: Object.assign(d.upgrades, s.upgrades || {}) });
  }

  const G = {
    state: 'loading', mode: 1, players: [], world: null, levelIndex: 0, levelData: null,
    save: loadSave(), god: params.has('god'), lives: 9, fish: 0, fishForLife: 0, bells: [], levelTime: 0,
    checkpoint: null, boss: null, stats: {}, items: NC.Items, hud: NC.HUD, menuStack: [],
  };
  NC.game = G;
  if (params.has('all')) G.save.unlocked = 5;
  function saveNow() { NC.store.set('save', G.save); }

  // ---------- renderer ----------
  const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: !NC.lowGfx, powerPreference: 'high-performance' });
  renderer.setPixelRatio(NC.lowGfx ? 0.8 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setScissorTest(true);
  function resize() { renderer.setSize(window.innerWidth, window.innerHeight, false); }
  window.addEventListener('resize', resize);
  resize();

  let scene = new THREE.Scene();
  NC.Input.init();

  // ---------- sounds: louder when close to a cat ----------
  NC.Audio.setListener((x, z, range) => {
    let best = Infinity, bp = null;
    for (const p of G.players) { const d = U.dist(p.pos.x, p.pos.z, x, z); if (d < best) { best = d; bp = p; } }
    if (!bp) return { vol: 1, pan: 0 };
    const vol = Math.pow(Math.max(0, 1 - best / range), 1.3);
    const fx = Math.sin(bp.camYaw), fz = Math.cos(bp.camYaw);
    const dx = x - bp.pos.x, dz = z - bp.pos.z, d = Math.hypot(dx, dz) || 1;
    let pan = ((-fz * dx + fx * dz) / d) * 0.6;
    if (G.players.length > 1) pan = pan * 0.5 + (bp.index === 0 ? -0.35 : 0.35);
    return { vol, pan };
  });
  function startAudio() { NC.Audio.init(); }
  window.addEventListener('pointerdown', startAudio);
  window.addEventListener('keydown', startAudio);

  // ============================================================
  //  LEVELS
  // ============================================================
  function newStats() { return { kills: 0, sneaks: 0, hits: 0, hitsGiven: 0, falls: 0, stars: 0, superJumps: 0, spotted: 0 }; }

  function startLevel(i) {
    G.levelIndex = i;
    G.levelData = NC.LEVELS[i];
    if (G.world) G.world.dispose();
    scene = new THREE.Scene();
    G.world = NC.World.build(scene, G.levelData);
    G.scene = scene;
    NC.FX.init(scene);
    NC.FX._scene = scene;
    G.menuStack = [];
    NC.Shots.init(G, scene);
    NC.Items.init(G, scene);
    NC.Enemies.init(G, scene);
    NC.Items.spawn(G.world);
    NC.Enemies.spawn(G.world.spawns.enemies);
    // the cats
    if (G.players.length !== G.mode) {
      G.players = [];
      const kinds = ['mochi', 'shadow'];
      for (let k = 0; k < G.mode; k++) G.players.push(new NC.Player(G, k, kinds[k]));
    }
    const st = G.world.spawns.start;
    G.checkpoint = { x: st.x, y: st.y, z: st.z };
    G.players.forEach((p, k) => {
      p.reset();
      scene.add(p.mesh); scene.add(p.shadow);
      p.placeAt(st, G.mode > 1 ? (k === 0 ? -1 : 1) : 0);
    });
    G.lives = 9; G.fish = 0; G.fishForLife = 0; G.levelTime = 0; G.boss = null;
    G.bells = new Array(NC.Items.counts.bells).fill(false);
    G.stats = newStats();
    G.shakes = [0, 0];
    G.endT = 0;
    NC.HUD.setup(G.mode);
    NC.HUD.show(true);
    NC.Input.setSolo(G.mode === 1);
    hideMenus();
    G.state = 'play';
    // forget buttons that are still held down from the menu
    G.players.forEach((p) => NC.Input.read(p.index));
    NC.Audio.music(G.levelData.theme);
    NC.HUD.announce(`${i + 1}. ${G.levelData.name}`, G.levelData.story, 4.5);
  }

  // ---------- things the other files ask the game to do ----------
  G.message = (p, text) => NC.HUD.message(p ? p.index : null, text);
  G.flash = (p, kind) => NC.HUD.flash(p.index, kind);
  G.shake = (p, amount) => { if (p && G.shakes) G.shakes[p.index] = Math.max(G.shakes[p.index] || 0, amount); };
  G.shakeOf = (p) => (G.shakes ? G.shakes[p.index] || 0 : 0);
  G.findTarget = (from, dir, range, minDot) => NC.Enemies.findTarget(from, dir, range, minDot);
  G.enemyAt = (x, y, z, r) => NC.Enemies.at(x, y, z, r);
  G.alertNear = (x, z, r, p, except) => NC.Enemies.alertNear(x, z, r, p, except);
  G.loseTarget = (p) => NC.Enemies.loseTarget(p);
  G.onSpikes = (p) => !!NC.Items.spikeAt(p.pos.x, p.pos.z, p.pos.y);
  G.setCheckpoint = (p) => { G.checkpoint = p; };
  G.hitArea = (a) => {
    let n = NC.Enemies.hitArea(a);
    n += NC.Items.hitPots(a);
    n += NC.Shots.cutArea(a.x, a.y, a.z, a.r);
    if (n && a.by) G.shake(a.by, 0.12);
    return n;
  };
  G.addFish = (p, n) => {
    G.fish += n;
    G.fishForLife += n;
    G.save.wallet += n;
    if (G.fishForLife >= 100) {
      G.fishForLife -= 100;
      G.lives++;
      NC.Audio.play('lifeUp');
      G.message(null, '100 FISH! +1 LIFE 🐱');
    }
  };
  G.bellFound = (p) => {
    const k = G.bells.indexOf(false);
    if (k >= 0) G.bells[k] = true;
    const n = G.bells.filter(Boolean).length;
    G.message(null, `GOLDEN BELL ${n}/${G.bells.length}! 🔔`);
  };
  G.loseLife = (p) => {
    G.lives--;
    if (G.lives <= 0) {
      G.lives = 0;
      G.state = 'dying';
      G.endT = 2;
      NC.Audio.play('lose');
    }
  };
  // come back after losing a life: next to your friend, or at the last lantern
  G.respawn = (p) => {
    if (G.state !== 'play') { p.respawnT = 0.5; return; }
    const friend = G.players.find((o) => o !== p && o.alive && o.onGround && !G.onSpikes(o));
    if (friend) p.revive({ x: friend.pos.x - Math.sin(friend.yaw) * 1.2, y: friend.pos.y, z: friend.pos.z - Math.cos(friend.yaw) * 1.2 });
    else {
      const c = G.checkpoint;
      p.revive({ x: c.x + (G.players.length > 1 ? (p.index ? 0.8 : -0.8) : 0), y: c.y, z: c.z });
      // the friend comes too, if they're also gone
    }
    // if the spot next to the friend is inside a wall, use the friend's spot
    if (G.world.solidAt(p.pos.x, p.pos.y + 0.5, p.pos.z) && friend) p.pos.set(friend.pos.x, friend.pos.y + 1.2, friend.pos.z);
    p.snapCamera();
  };
  G.startBoss = (e) => {
    G.boss = e;
    NC.Audio.music('boss');
    NC.HUD.announce(e.name, e.type === 'K' ? 'Make him charge into a wall, then attack!' : 'Watch out for his tricks!', 3);
  };
  G.bossDefeated = (e) => {
    G.boss = null;
    NC.Audio.music(G.levelData.theme);
    for (const p of G.players) G.shake(p, 0.6);
    if (e.type === 'K') {
      NC.Items.unlockGoal();
      NC.HUD.announce('YOU BEAT THE BIG BULLDOG!', 'The gate is open! ⛩', 3);
      NC.Audio.play('win');
    } else {
      NC.HUD.announce('LORD WOOFMOTO IS BEATEN!', 'Grab the GOLDEN FISH! 🐟', 4);
      NC.Items.spawnGolden(e.center.x, e.center.y, e.center.z);
    }
  };

  // ---------- the end of a level ----------
  G.levelComplete = (pl) => {
    if (G.state !== 'play') return;
    G.state = 'complete';
    G.endT = 2.2;
    NC.Audio.music('');
    NC.Audio.play('win');
    G.message(null, 'LEVEL COMPLETE!');
    for (let k = 0; k < 6; k++) setTimeout(() => {
      const p = G.players[0];
      if (p && G.state === 'complete') NC.FX.firework(p.pos.x + U.rand(-8, 8), p.pos.y + U.rand(8, 14), p.pos.z + U.rand(-8, 8));
    }, k * 300);
    finishLevel();
  };
  function finishLevel() {
    const i = G.levelIndex + 1, s = G.save;
    const total = NC.Items.counts.fishTotal;
    const bellsFound = G.bells.filter(Boolean).length;
    const stars = 1 + (total === 0 || G.fish >= total * 0.75 ? 1 : 0) + (bellsFound === G.bells.length ? 1 : 0);
    const prevBest = s.best[i];
    const newBest = prevBest == null || G.levelTime < prevBest;
    if (newBest) s.best[i] = G.levelTime;
    s.stars[i] = Math.max(s.stars[i] || 0, stars);
    const old = s.bells[i] || [];
    s.bells[i] = G.bells.map((b, k) => b || !!old[k]);
    s.unlocked = Math.max(s.unlocked, Math.min(5, i + 1));
    saveNow();
    G.result = { stars, bellsFound, total, newBest };
  }
  function showResults() {
    const r = G.result;
    let st = '';
    for (let k = 0; k < 3; k++) st += `<span class="${k < r.stars ? 'on' : 'off'}">★</span>`;
    $('resStars').innerHTML = st;
    $('results').innerHTML = `
      ⏱ Time: <b>${U.time(G.levelTime)}</b> ${r.newBest ? '<span class="new">NEW RECORD!</span>' : `(best ${U.time(G.save.best[G.levelIndex + 1])})`}<br>
      🐟 Fish: <b>${G.fish}</b> / ${r.total} ${G.fish >= r.total * 0.75 ? '★' : '<small>(get 75% for a ★)</small>'}<br>
      🔔 Bells: <b>${r.bellsFound} / ${G.bells.length}</b> ${r.bellsFound === G.bells.length ? '★' : '<small>(find all 3 for a ★)</small>'}<br>
      🥷 Enemies beaten: <b>${G.stats.kills}</b> &nbsp; Sneak attacks: <b>${G.stats.sneaks}</b>`;
    $('nextBtn').style.display = G.levelIndex < NC.LEVELS.length - 1 ? '' : 'none';
    showMenu('complete');
  }

  // the GOLDEN FISH! The end of the game
  G.win = () => {
    if (G.state !== 'play') return;
    G.state = 'won';
    G.endT = 3;
    NC.Audio.play('win');
    NC.Audio.music('ending');
    finishLevel();
    G.save.won = true;
    saveNow();
    NC.HUD.announce('THE GOLDEN FISH! 🐟', 'You saved the cat village!', 3);
  };
  function showEnding() {
    NC.HUD.show(false);
    let total = 0;
    for (let k = 1; k <= 5; k++) total += G.save.stars[k] || 0;
    $('endText').innerHTML = `${G.mode > 1 ? 'MOCHI and SHADOW' : 'MOCHI'} brought the Golden Fish back to Sakura Village.
      The whole village had a big fish party under the cherry trees! 🌸🐟🎉<br><br>
      Lord Woofmoto promised to be a good dog from now on... maybe. 🐶<br><br>
      ⭐ Stars: <b>${total} / 15</b> &nbsp; 🐟 Fish in your bag: <b>${G.save.wallet}</b><br>
      Can you get all 15 stars?<br><br><b>Made by Emil & Claude</b>`;
    showcase.mode = 'ending';
    showMenu('ending');
    G.state = 'menu';
  }

  // ============================================================
  //  THE MAIN LOOP
  // ============================================================
  let lastT = performance.now(), time = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    time += dt;
    NC.Input.pollJoin();
    try {
      if (G.state === 'play' || G.state === 'complete' || G.state === 'dying' || G.state === 'won') { updateGame(dt); renderGame(); }
      else if (G.state === 'paused') { pauseUpdate(); renderGame(); }
      else { menuUpdate(dt); renderShowcase(dt); }
    } catch (e) {
      console.error(e);
    }
  }

  function updateGame(dt) {
    const playing = G.state === 'play';
    const inputs = G.players.map((p) => NC.Input.read(p.index));
    if (playing && inputs.some((s) => s.pausePressed)) { pause(); return; }
    if (playing) G.levelTime += dt;
    G.players.forEach((p, k) => {
      const inp = playing ? inputs[k] : idleInput(inputs[k]);
      p.update(dt, inp);
    });
    NC.Enemies.update(playing ? dt : dt * 0.3);
    NC.Shots.update(dt);
    if (playing) NC.Items.update(dt, time);
    G.world.update(dt, time);
    NC.FX.update(dt);
    // fireworks in the sky above the pagoda
    if (G.levelData.theme === 'pagoda' && Math.random() < dt * 0.5) {
      const p = G.players[0];
      NC.FX.firework(p.pos.x + U.rand(-40, 60), U.rand(30, 45), p.pos.z + U.rand(-60, -30));
    }
    for (let k = 0; k < G.shakes.length; k++) G.shakes[k] = Math.max(0, G.shakes[k] - dt * 1.5);
    NC.HUD.update(dt, G);
    if (G.state !== 'play') {
      G.endT -= dt;
      if (G.endT <= 0) {
        if (G.state === 'complete') { G.state = 'menu'; showResults(); }
        else if (G.state === 'dying') { G.state = 'menu'; showMenu('gameover'); }
        else if (G.state === 'won') showEnding();
      }
    }
  }
  // cats stand still (and celebrate) at the end of a level
  function idleInput(s) {
    return { x: 0, y: 0, camX: 0, camDX: s.camDX, camDY: s.camDY, jump: false, katana: false, star: false, smoke: false, taunt: false, pause: false };
  }

  function renderGame() {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    const n = G.players.length;
    G.players.forEach((p, i) => {
      const vw = Math.floor(w / n), vx = i * vw;
      p.cam.aspect = vw / h;
      p.cam.fov = n > 1 ? 66 : 60;
      p.cam.updateProjectionMatrix();
      renderer.setViewport(vx, 0, vw, h);
      renderer.setScissor(vx, 0, vw, h);
      NC.FX.setScale(h * renderer.getPixelRatio(), p.cam.fov);
      renderer.render(scene, p.cam);
    });
  }

  // ============================================================
  //  THE TITLE / SHOP SCENE (two cats on a roof under the moon)
  // ============================================================
  const showcase = { mode: 'title', t: 0 };
  function buildShowcase() {
    const sc = new THREE.Scene();
    sc.background = new THREE.Color(0x1a1040);
    sc.fog = new THREE.Fog(0x3a2460, 18, 70);
    const sky = new THREE.Mesh(new THREE.SphereGeometry(80, 24, 16), new THREE.MeshBasicMaterial({ map: NC.Tex.sky('village', '#140c38', '#4a2c78', '#e890a8'), side: THREE.BackSide, fog: false }));
    sc.add(sky);
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: NC.Tex.moon(), fog: false, transparent: true, depthWrite: false }));
    moon.scale.set(22, 22, 1); moon.position.set(10, 16, -40); sc.add(moon);
    sc.add(new THREE.HemisphereLight(0xb8a0ff, 0x402848, 1.7));
    const dl = new THREE.DirectionalLight(0xffe8d0, 1.5); dl.position.set(3, 5, 4); sc.add(dl);
    // the roof
    // the textures repeat every 3 meters, like in the levels
    const rep = (t, x, y) => { const c = t.clone(); c.repeat.set(x, y); c.needsUpdate = true; return c; };
    const wall = new THREE.MeshLambertMaterial({ map: rep(NC.Tex.shoji(), 14 / 3, 4 / 3) });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 8), [
      wall, wall, new THREE.MeshLambertMaterial({ map: rep(NC.Tex.roofTiles('roofBlue', '#5a6a8a', '#262c40'), 14 / 3, 8 / 3) }), new THREE.MeshLambertMaterial({ color: 0x222222 }), wall, wall,
    ]);
    roof.position.y = -2; sc.add(roof);
    const tree = NC.Models.cherryTree(U.seeded(4)); tree.position.set(-4.5, 0, -2.2); sc.add(tree);
    const torii = NC.Models.torii(); torii.position.set(4.5, 0, -2.5); torii.scale.setScalar(0.8); sc.add(torii);
    const lan = NC.Models.paperLantern(); lan.position.set(-2.5, 2.6, 0.5); sc.add(lan);
    for (let k = 0; k < 5; k++) { const p = NC.Models.pagodaSilhouette(3 + (k % 3), 0x241a48); p.position.set(-30 + k * 15, -14, -30 - (k % 2) * 8); sc.add(p); }
    const cats = [NC.Models.cat('mochi'), NC.Models.cat('shadow')];
    cats[0].position.set(-0.9, 0, 0.5); cats[1].position.set(0.9, 0, 0.3);
    cats[0].rotation.y = 0.35; cats[1].rotation.y = -0.35;
    cats.forEach((c) => sc.add(c));
    const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    // falling petals
    const N = 120, pp = new Float32Array(N * 3);
    for (let k = 0; k < N; k++) { pp[k * 3] = U.rand(-10, 10); pp[k * 3 + 1] = U.rand(0, 10); pp[k * 3 + 2] = U.rand(-6, 6); }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    const petals = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffa8cc, size: 0.12, map: NC.Tex.glow(), transparent: true, depthWrite: false }));
    sc.add(petals);
    Object.assign(showcase, { sc, cam, cats, petals, pg });
    NC.FX.init(sc);
  }
  function dressShowcase() {
    if (!showcase.cats) return;
    ['mochi', 'shadow'].forEach((k, i) => {
      const e = G.save.equip[k];
      NC.Models.setHat(showcase.cats[i], e.hat);
      NC.Models.setSword(showcase.cats[i], e.sword);
    });
  }
  function renderShowcase(dt) {
    if (!showcase.sc) { buildShowcase(); dressShowcase(); }
    if (showcase.sc !== NC.FX._scene) { NC.FX.init(showcase.sc); NC.FX._scene = showcase.sc; }
    const S = showcase;
    S.t += dt;
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    S.cam.aspect = w / h; S.cam.updateProjectionMatrix();
    const shopCat = S.mode === 'shop' ? shop.cat : -1;
    if (S.mode === 'shop') {
      const c = S.cats[shopCat];
      const tx = c.position.x;
      S.cam.position.set(tx - 1.7 + Math.sin(S.t * 0.4) * 0.2, 1.25, 4.4);
      S.cam.lookAt(tx - 1.25, 0.65, 0);
    } else {
      // on a wide screen the menu is on the left, so look a bit to the left: the cats show up on the right
      const wide = w / h > 1.2 && S.mode === 'title';
      S.cam.position.set(Math.sin(S.t * 0.15) * 1.5 - (wide ? 1.2 : 0), 1.6 + Math.sin(S.t * 0.2) * 0.2, wide ? 5.2 : 6.5);
      S.cam.lookAt(wide ? -2.4 : 0, 1.3, 0);
    }
    S.cats.forEach((c, i) => {
      const ending = S.mode === 'ending';
      const jumpPh = ending ? (S.t * 1.2 + i * 0.5) % 2 : 9;
      const inAir = jumpPh < 0.8;
      c.position.y = inAir ? Math.sin((jumpPh / 0.8) * Math.PI) * 1.6 : 0;
      if (S.mode === 'shop') c.rotation.y = i === shopCat ? S.t * 0.8 : (i ? -0.35 : 0.35);
      NC.Models.animCat(c, {
        t: S.t + i * 3, run: 0, phase: 0, mode: inAir ? 'air' : (Math.sin(S.t * 0.4 + i * 2) > 0.85 ? 'taunt' : 'ground'), vy: inAir ? 5 : 0,
        flip: inAir ? 1 - jumpPh / 0.8 : 0, slash: (!ending && ((S.t + i * 1.7) % 5) < 0.26) ? 1 - ((S.t + i * 1.7) % 5) / 0.26 : 0, combo: 1,
      }, dt);
    });
    const a = S.pg.attributes.position.array;
    for (let k = 0; k < a.length / 3; k++) {
      a[k * 3] += dt * (0.6 + Math.sin(S.t + k) * 0.3); a[k * 3 + 1] -= dt * 0.5;
      if (a[k * 3 + 1] < -1) { a[k * 3 + 1] = 10; a[k * 3] = U.rand(-12, 6); }
    }
    S.pg.attributes.position.needsUpdate = true;
    if (S.mode === 'ending' && Math.random() < dt * 2.5) NC.FX.firework(U.rand(-12, 12), U.rand(8, 14), U.rand(-20, -10), Math.random() < 0.3);
    NC.FX.update(dt);
    renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h);
    NC.FX.setScale(h * renderer.getPixelRatio(), S.cam.fov);
    renderer.render(S.sc, S.cam);
  }

  // ============================================================
  //  MENUS (mouse, keyboard or gamepad)
  // ============================================================
  const menu = { id: null, sel: 0, items: [] };
  function hideMenus() { document.querySelectorAll('.menu').forEach((m) => m.classList.remove('show')); menu.id = null; }
  function showMenu(id, keepStack) {
    hideMenus();
    const el = $(id);
    el.classList.add('show');
    menu.id = id;
    if (!keepStack) G.menuStack.push(id);
    refreshItems(0);
    NC.Input.unlockMouse();
  }
  function refreshItems(sel) {
    if (!menu.id) return;
    menu.items = [...$(menu.id).querySelectorAll('button')].filter((b) => !b.disabled && b.offsetParent !== null);
    menu.sel = U.clamp(sel, 0, menu.items.length - 1);
    highlight();
  }
  function highlight() { menu.items.forEach((b, i) => b.classList.toggle('sel', i === menu.sel)); }
  function back() {
    G.menuStack.pop();
    const prev = G.menuStack.pop();
    if (menu.id === 'shop' || menu.id === 'settings' || menu.id === 'help' || menu.id === 'select') {
      if (prev === 'pause') { showMenu('pause'); return; }
      if (prev === 'complete') { showMenu('complete'); return; }
    }
    goTitle();
  }
  function goTitle() {
    G.menuStack = [];
    G.state = 'menu';
    showcase.mode = 'title';
    NC.HUD.show(false);
    if (showcase.sc) NC.FX.init(showcase.sc);
    NC.FX._scene = showcase.sc;
    NC.Audio.music('title');
    showMenu('title');
    updatePadInfo();
  }

  function menuUpdate() {
    const m = NC.Input.menuRead();
    if (!menu.id) return;
    if (m.up || m.left) { menu.sel = (menu.sel - 1 + menu.items.length) % menu.items.length; highlight(); NC.Audio.play('menu'); }
    if (m.down || m.right) { menu.sel = (menu.sel + 1) % menu.items.length; highlight(); NC.Audio.play('menu'); }
    if (m.ok && menu.items[menu.sel]) { startAudio(); menu.items[menu.sel].click(); }
    if (m.back) {
      if (menu.id === 'pause') resume();
      else if (menu.id !== 'title' && menu.id !== 'complete' && menu.id !== 'gameover') back();
    }
    if (menu.id === 'title') updatePadInfo();
  }
  function pauseUpdate() { menuUpdate(); }
  function updatePadInfo() {
    const pads = NC.Input.pads.filter((p) => p !== null).length;
    const t = pads ? `🎮 ${pads} controller${pads > 1 ? 's' : ''} connected` : '🎮 Press a button on a controller to connect it';
    if ($('padinfo').textContent !== t) $('padinfo').textContent = t;
  }

  function pause() {
    G.state = 'paused';
    G.menuStack = [];
    NC.Audio.muffle(true);
    NC.Input.menuRead(); // the pause key must not also press "back"
    $('musicBtn').textContent = 'MUSIC: ' + (NC.Audio.vols.music > 0 ? 'ON' : 'OFF');
    showMenu('pause');
  }
  function resume() {
    hideMenus();
    G.menuStack = [];
    G.state = 'play';
    NC.Audio.muffle(false);
    NC.Input.menuRead(); NC.Input.read(0); if (G.mode > 1) NC.Input.read(1); // forget the button you pressed
    if (G.mode === 1) NC.Input.lockMouse(renderer.domElement);
  }

  // ---------- level select ----------
  function showSelect() {
    const list = $('levelList');
    list.innerHTML = '';
    NC.LEVELS.forEach((L, i) => {
      const n = i + 1, locked = n > G.save.unlocked;
      const b = document.createElement('button');
      const st = G.save.stars[n] || 0;
      const bells = (G.save.bells[n] || []).filter(Boolean).length;
      b.innerHTML = locked ? `<span class="num">🔒</span><span>${L.name}</span>` :
        `<span class="num">${n}</span><span>${L.name}</span><span class="lstars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span><span class="meta">🔔 ${bells}/3 · ⏱ ${U.time(G.save.best[n])}</span>`;
      b.disabled = locked;
      b.onclick = () => { NC.Audio.play('select'); startLevel(i); if (G.mode === 1) NC.Input.lockMouse(renderer.domElement); };
      list.appendChild(b);
    });
    $('selectTitle').textContent = G.mode > 1 ? 'CHOOSE A LEVEL (2 PLAYERS)' : 'CHOOSE A LEVEL';
    showMenu('select');
    // start on the newest level
    refreshItems(Math.min(G.save.unlocked, NC.LEVELS.length) - 1);
  }

  // ---------- the SHOP ----------
  const SHOP = [
    { group: 'HATS', items: [
      { id: 'none', kind: 'hat', name: 'No hat', price: 0 },
      { id: 'headband', kind: 'hat', name: 'Hero headband', price: 30 },
      { id: 'straw', kind: 'hat', name: 'Straw hat', price: 40 },
      { id: 'flower', kind: 'hat', name: 'Cherry flower', price: 60 },
      { id: 'samurai', kind: 'hat', name: 'Samurai helmet', price: 120 },
      { id: 'crown', kind: 'hat', name: 'Golden crown', price: 250 },
    ] },
    { group: 'SWORDS', items: [
      { id: 'silver', kind: 'sword', name: 'Silver katana', price: 0 },
      { id: 'blue', kind: 'sword', name: 'Ice katana', price: 40 },
      { id: 'pink', kind: 'sword', name: 'Sakura katana', price: 40 },
      { id: 'gold', kind: 'sword', name: 'Gold katana', price: 150 },
      { id: 'rainbow', kind: 'sword', name: 'RAINBOW katana', price: 200 },
    ] },
    { group: 'NINJA UPGRADES', items: [
      { id: 'heart', kind: 'up', name: '+1 heart ❤', price: 150, max: 1 },
      { id: 'bag', kind: 'up', name: 'Bigger shuriken bag', price: 60, max: 2 },
      { id: 'smoke', kind: 'up', name: 'Longer smoke bombs', price: 80, max: 2 },
    ] },
  ];
  const shop = { cat: 0 };
  function showShop(keepSel) {
    showcase.mode = 'shop';
    const s = G.save, catKey = shop.cat ? 'shadow' : 'mochi';
    $('wallet').textContent = `🐟 ${s.wallet} fish`;
    $('shopTabs').innerHTML = '';
    ['MOCHI', 'SHADOW'].forEach((n, i) => {
      const b = document.createElement('button');
      b.textContent = (i ? '🐈‍⬛ ' : '🐱 ') + n;
      b.className = shop.cat === i ? 'on' : '';
      b.onclick = () => { shop.cat = i; NC.Audio.play('menu'); showShop(true); };
      $('shopTabs').appendChild(b);
    });
    const box = $('shopItems');
    box.innerHTML = '';
    for (const grp of SHOP) {
      const h = document.createElement('div'); h.className = 'section'; h.textContent = grp.group; box.appendChild(h);
      const grid = document.createElement('div'); grid.className = 'shopgrid'; box.appendChild(grid);
      for (const it of grp.items) {
        const b = document.createElement('button');
        let label, on = false;
        if (it.kind === 'up') {
          const lvl = s.upgrades[it.id];
          const full = lvl >= it.max;
          label = `${it.name}<span class="price">${full ? 'MAXED ✔' : `🐟 ${it.price}`} (${lvl}/${it.max})</span>`;
          on = full;
          b.onclick = () => {
            if (full) return;
            if (s.wallet < it.price) { NC.Audio.play('nope'); return; }
            s.wallet -= it.price; s.upgrades[it.id]++; saveNow(); NC.Audio.play('buy'); showShop(true);
          };
        } else {
          const owned = s.owned.includes(it.id);
          on = s.equip[catKey][it.kind] === it.id;
          label = `${it.name}<span class="price">${on ? 'WEARING ✔' : owned ? 'OWNED: put on' : `🐟 ${it.price}`}</span>`;
          b.onclick = () => {
            if (!owned) {
              if (s.wallet < it.price) { NC.Audio.play('nope'); return; }
              s.wallet -= it.price; s.owned.push(it.id); NC.Audio.play('buy');
            } else NC.Audio.play('select');
            s.equip[catKey][it.kind] = it.id;
            saveNow(); dressShowcase(); showShop(true);
          };
        }
        b.innerHTML = label;
        if (on) b.className = 'on';
        grid.appendChild(b);
      }
    }
    const sel = menu.sel;
    if (menu.id !== 'shop') showMenu('shop'); else refreshItems(keepSel ? sel : 0);
  }

  // ---------- settings ----------
  function showSettings(keep) {
    $('gfxBtn').textContent = 'GRAPHICS: ' + (NC.lowGfx ? 'LOW (FAST)' : 'HIGH');
    $('musicVal').textContent = 'MUSIC ' + Math.round(NC.Audio.vols.music * 10);
    $('sfxVal').textContent = 'SOUND ' + Math.round(NC.Audio.vols.sfx * 10);
    if (!keep) showMenu('settings');
  }

  // ---------- every button in every menu ----------
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    startAudio();
    const act = b.dataset.act;
    if (act !== 'back') NC.Audio.play('select');
    switch (act) {
      case 'play1': G.mode = 1; showSelect(); break;
      case 'play2': G.mode = 2; showSelect(); break;
      case 'shop': showShop(); break;
      case 'help': showMenu('help'); break;
      case 'settings': showSettings(); break;
      case 'back': NC.Audio.play('menu'); if (menu.id === 'shop' && G.menuStack.includes('complete')) { G.menuStack = []; showcase.mode = 'title'; showResults(); } else back(); break;
      case 'title': goTitle(); break;
      case 'resume': resume(); break;
      case 'restart': NC.Audio.muffle(false); G.menuStack = []; startLevel(G.levelIndex); if (G.mode === 1) NC.Input.lockMouse(renderer.domElement); break;
      case 'next': G.menuStack = []; startLevel(Math.min(NC.LEVELS.length - 1, G.levelIndex + 1)); if (G.mode === 1) NC.Input.lockMouse(renderer.domElement); break;
      case 'levels': NC.Audio.muffle(false); saveNow(); G.menuStack = ['title']; G.state = 'menu'; NC.HUD.show(false); showcase.mode = 'title'; NC.FX._scene = null; NC.Audio.music('title'); showSelect(); break;
      case 'music': NC.Audio.setVolume('music', NC.Audio.vols.music > 0 ? 0 : 0.7); $('musicBtn').textContent = 'MUSIC: ' + (NC.Audio.vols.music > 0 ? 'ON' : 'OFF'); break;
      case 'gfx': NC.store.set('gfxLow', !NC.lowGfx); location.reload(); break;
      case 'musicUp': NC.Audio.setVolume('music', NC.Audio.vols.music + 0.1); showSettings(true); break;
      case 'musicDown': NC.Audio.setVolume('music', NC.Audio.vols.music - 0.1); showSettings(true); break;
      case 'sfxUp': NC.Audio.setVolume('sfx', NC.Audio.vols.sfx + 0.1); showSettings(true); NC.Audio.play('coin'); break;
      case 'sfxDown': NC.Audio.setVolume('sfx', NC.Audio.vols.sfx - 0.1); showSettings(true); NC.Audio.play('coin'); break;
    }
  });
  document.addEventListener('mouseover', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const i = menu.items.indexOf(b);
    if (i >= 0 && i !== menu.sel) { menu.sel = i; highlight(); }
  });
  // click on the game to steer the camera with the mouse
  renderer.domElement.addEventListener('click', () => { if (G.state === 'play' && G.mode === 1) NC.Input.lockMouse(renderer.domElement); });
  // pause when the window loses focus
  window.addEventListener('blur', () => { if (G.state === 'play') pause(); });
  document.addEventListener('pointerlockchange', () => {
    // pressing Esc unlocks the mouse: that should pause too
    if (!document.pointerLockElement && G.state === 'play' && G.mode === 1 && G.lockedOnce) pause();
    if (document.pointerLockElement) G.lockedOnce = true;
  });

  // ============================================================
  //  GO!
  // ============================================================
  $('loading').style.display = 'none';
  if (params.has('level')) {
    G.mode = params.has('2p') ? 2 : 1;
    startLevel(U.clamp(parseInt(params.get('level'), 10) - 1 || 0, 0, NC.LEVELS.length - 1));
  } else goTitle();
  requestAnimationFrame(frame);
})();
