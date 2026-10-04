// ============================================================
//  DRAGON LIFE — THE GAME
//  Starts everything, runs the main loop, the menus, saving,
//  sleeping, and decides what E and the mouse button do.
// ============================================================
window.DL = window.DL || {};

DL.Game = (function () {
  const U = DL.U;
  const $ = (id) => document.getElementById(id);
  const G = { DAY_LENGTH: 720, lookAtDragon: 0 };
  let renderer, scene, camera;
  let state = 'loading', lastT = performance.now(), saveT = 30, titleT = 0;
  const P = () => DL.Player, D = () => DL.Dragon, It = () => DL.Items, In = () => DL.Input, Hud = () => DL.Hud, W = () => DL.World;

  // ------------------------------------------------------------
  //  SETUP
  // ------------------------------------------------------------
  function init() {
    const canvas = $('game');
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      document.body.innerHTML = '<div style="padding:40px;font:20px sans-serif;color:#fff">Sorry! Your browser can\'t show 3D games (WebGL is off). Try Chrome or Edge.</div>';
      return;
    }
    renderer.shadowMap.enabled = DL.settings.gfx !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(65, 1, 0.1, 3200);
    G.scene = scene; G.camera = camera; G.renderer = renderer;
    DL.Tex.init();
    DL.World.init(scene);
    DL.FX.init(scene);
    DL.Build.init(scene);
    DL.Dragon.init(scene);
    DL.Player.init(camera, scene);
    DL.Story.init();
    DL.Build.addFixed();
    DL.Dragon.initWild();
    DL.Hud.init();
    DL.Input.init(canvas);
    hookMenus();
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') { save(); pause(); } });
    window.addEventListener('beforeunload', () => { if (state === 'play' || state === 'paused') save(); });
    $('loading').remove();
    showTitle();
    requestAnimationFrame(loop);
    // for testing
    window.__dl = { G, DL, get state() { return state; }, start: startGame, save, freezeCam: (p, t) => { state = 'freeze'; camera.position.set(...p); camera.lookAt(...t); }, tick: (n, dt = 1 / 30) => { for (let i = 0; i < n; i++) step(dt); renderer.render(scene, camera); }, useE: () => { const t = findTarget(); if (t) t.use(); return t && t.label; }, useTool, get fps() { return 1 / frameAvg; } };
  }

  let resScale = 1, frameAvg = 1 / 60, resCheck = 0;
  function adaptResolution(rawDt) {
    frameAvg += (Math.min(rawDt, 0.1) - frameAvg) * 0.05;
    resCheck += rawDt;
    if (resCheck < 2) return;
    resCheck = 0;
    if (frameAvg > 1 / 40 && resScale > 0.55) { resScale = Math.max(0.55, resScale - 0.15); resize(); }
    else if (frameAvg < 1 / 57 && resScale < 1) { resScale = Math.min(1, resScale + 0.1); resize(); }
  }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, DL.settings.gfx === 'low' ? 1 : 1.5);
    renderer.setPixelRatio(Math.max(0.5, dpr * resScale));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    DL.FX.setScale(h * renderer.getPixelRatio(), camera.fov);
  }

  // ------------------------------------------------------------
  //  MENUS
  // ------------------------------------------------------------
  function hookMenus() {
    $('bContinue').onclick = () => { DL.Audio.init(); startGame(DL.store.get('save', null)); };
    const newGame = () => { DL.Audio.init(); DL.store.del('save'); startGame(null); };
    $('bNew').onclick = () => {
      if (!DL.store.get('save', null)) { newGame(); return; }
      // ask first (inside the game, because some pages don't allow pop-up boxes)
      Hud().panel('🥚 Start a new game?', () => `
        <p class="sub">Your old island, your house and your dragon will be gone forever!</p>
        <div class="names"><button id="newYes">Yes, start over</button><button id="newNo" class="on">No, keep my dragon</button></div>`,
      (el) => {
        el.querySelector('#newYes').onclick = () => { Hud().closePanel(); newGame(); };
        el.querySelector('#newNo').onclick = () => Hud().closePanel();
      });
    };
    $('bSettings').onclick = () => settings();
    $('bHelp').onclick = () => Hud().openHelp();
    $('pResume').onclick = () => resume();
    $('pHelp').onclick = () => Hud().openHelp();
    $('pSettings').onclick = () => settings();
    $('pQuit').onclick = () => { save(); showTitle(); };
    window.addEventListener('keydown', (e) => {
      if (state === 'title' && e.code === 'Enter' && !Hud().panelOpen()) { DL.Audio.init(); const s = DL.store.get('save', null); startGame(s); }
    });
  }
  function settings() {
    Hud().panel('⚙️ Settings', () => `
      <div class="slider"><span>🎵 Music</span><input type="range" min="0" max="1" step="0.05" value="${DL.settings.music}" data-k="music"></div>
      <div class="slider"><span>🔊 Sounds</span><input type="range" min="0" max="1" step="0.05" value="${DL.settings.sfx}" data-k="sfx"></div>
      <div class="slider"><span>🖱️ Mouse speed</span><input type="range" min="0.3" max="2.5" step="0.1" value="${DL.settings.sens}" data-k="sens"></div>
      <label class="opt"><input type="checkbox" data-b="invertY" ${DL.settings.invertY ? 'checked' : ''}> Upside-down mouse (up = look down)</label>
      <label class="opt"><input type="checkbox" data-b="tips" ${DL.settings.tips ? 'checked' : ''}> Show the goal at the top of the screen</label>
      <p class="sub">🖥️ Graphics (the page reloads):</p>
      <div class="names"><button data-g="high" class="${DL.settings.gfx === 'high' ? 'on' : ''}">HIGH (pretty)</button><button data-g="low" class="${DL.settings.gfx === 'low' ? 'on' : ''}">LOW (fast)</button></div>`,
    (el) => {
      el.querySelectorAll('[data-k]').forEach(i => i.oninput = () => { DL.settings[i.dataset.k] = +i.value; DL.saveSettings(); DL.Audio.applyVolumes(); });
      el.querySelectorAll('[data-b]').forEach(i => i.onchange = () => { DL.settings[i.dataset.b] = i.checked; DL.saveSettings(); if (DL.Story.quest) Hud().quest(DL.Story.quest); });
      el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { if (DL.settings.gfx === b.dataset.g) return; DL.settings.gfx = b.dataset.g; DL.saveSettings(); if (state === 'play' || state === 'paused') save(); location.reload(); });
    });
  }
  function showTitle() {
    state = 'title';
    $('hud').style.display = 'none';
    $('pause').classList.remove('show');
    $('title').classList.add('show');
    $('bContinue').style.display = DL.store.get('save', null) ? 'block' : 'none';
    In().setEnabled(false);
    In().unlock();
    if (DL.Build.active) DL.Build.setActive(false);
  }
  function pause() {
    if (state !== 'play') return;
    state = 'paused';
    In().setEnabled(false);
    In().unlock();
    $('pause').classList.add('show');
  }
  function resume() {
    $('pause').classList.remove('show');
    state = 'play';
    In().setEnabled(true);
    In().lock();
  }

  // ------------------------------------------------------------
  //  START A GAME
  // ------------------------------------------------------------
  function startGame(s) {
    $('title').classList.remove('show');
    $('hud').style.display = 'block';
    It().load(s ? s.items : null);
    W().tod = s ? s.tod : 0.3;
    W().day = s ? s.day : 1;
    // things you chopped are still chopped
    for (const n of W().nodes) { if (!n.alive) W().setNodeAlive(n, true); if (n.kind === 'bush' && !n.berries) W().setNodeAlive(n, true, 'berries'); n.regrowAt = 0; }
    W().regrowList = [];
    if (s && s.gone) for (const [id, left, part] of s.gone) {
      const n = W().nodes[id];
      if (!n) continue;
      if (part) W().setNodeAlive(n, false, 'berries'); else W().setNodeAlive(n, false);
      n.regrowAt = W().time + left;
      W().regrowList.push(n);
    }
    const pl = W().places;
    if (s && s.player) { P().spawn(s.player[0], s.player[2], s.player[3]); P().pos.y = W().groundAt(s.player[0], s.player[2], s.player[1] + 1); }
    else P().spawn(pl.spawn.x, pl.spawn.z, pl.spawn.yaw);
    DL.Build.load(s ? s.build : null);
    D().load(s ? s.dragon : null);
    DL.Story.load(s ? s.story : null);
    if (DL.debug && !s) {
      It().add('wood', 99, true); It().add('stone', 99, true); It().add('fish', 10, true); It().add('seeds', 5, true); It().add('crystal', 4, true); It().coins = 500;
      D().stage = 'adult'; D().growth = 100; D().egg.state = 'hatched'; D().name = 'Ember'; D().hunger = 90;
      D().pos.set(P().pos.x + 4, 0, P().pos.z - 4); D().pos.y = W().groundAt(D().pos.x, D().pos.z, 100);
      D().model.root.visible = true; D().setLook();
      DL.Story.event('debug');
    }
    Hud().refresh();
    state = 'play';
    In().setEnabled(true);
    In().lock();
    saveT = 30;
    $('fade').classList.add('on');
    setTimeout(() => $('fade').classList.remove('on'), 60);
    if (!s) setTimeout(() => Hud().big('🏝️ THE EMBER ISLES', 'Your new home! Go say hello to Grandma Wren.', 5), 900);
    else setTimeout(() => Hud().big('Welcome back! 💚', D().hatched() ? D().name + ' missed you!' : ''), 600);
  }

  // ------------------------------------------------------------
  //  SAVING
  // ------------------------------------------------------------
  function save() {
    if (state === 'title' || state === 'loading') return;
    const p = P();
    const pos = p.riding ? D().pos : p.pos;
    const data = {
      v: 1, tod: W().tod, day: W().day,
      player: [pos.x, Math.max(pos.y, W().groundAt(pos.x, pos.z, pos.y)), pos.z, p.yaw],
      items: It().save(), dragon: D().save(), build: DL.Build.save(), story: DL.Story.save(),
      gone: W().regrowList.filter(n => n.regrowAt).map(n => [n.id, Math.max(10, n.regrowAt - W().time), n.alive && n.kind === 'bush' ? 1 : 0]),
    };
    DL.store.set('save', data);
  }
  // sleeping in a bed
  function sleep() {
    const night = DL.Build.sleepy();
    state = 'sleeping';
    In().setEnabled(false);
    $('fade').classList.add('on');
    DL.Audio.play('purr');
    setTimeout(() => {
      if (night) { if (W().tod > 0.5) W().day++; W().tod = 0.26; }
      else W().tod = (W().tod + 0.08) % 1;
      It().food = Math.max(10, It().food - 10);
      if (D().hatched()) { D().happy = Math.min(100, D().happy + 15); D().sleeping = false; }
      save();
      $('fade').classList.remove('on');
      state = 'play';
      In().setEnabled(true);
      In().lock();
      Hud().big(night ? `☀️ GOOD MORNING! Day ${W().day}` : '😴 What a nice nap!', 'The game is saved.');
    }, 1800);
  }
  G.sleep = sleep;

  // ------------------------------------------------------------
  //  WHAT E DOES
  // ------------------------------------------------------------
  function findTarget() {
    const p = P();
    if (p.riding) return null;
    let best = null, bd = Infinity;
    const fx = Math.sin(p.yaw), fz = Math.cos(p.yaw);
    const score = (x, z, r) => {
      const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
      if (d > r) return Infinity;
      const facing = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
      return d - facing * 0.8;
    };
    for (const t of W().things) {
      if (t.ok && !t.ok()) continue;
      if (Math.abs(t.y - p.pos.y) > 3.2) continue;
      const s = score(t.x, t.z, t.r);
      if (s < bd) { bd = s; best = { label: t.label(), use: t.use }; }
    }
    // your dragon
    const Dd = D();
    if (Dd.hatched() && Dd.mode === 'ground') {
      const s = score(Dd.pos.x, Dd.pos.z, Dd.reach()) - 0.5;
      if (s < bd) { bd = s; best = { label: Dd.sleeping ? `Gently wake up ${Dd.name}` : `Pet ${Dd.name} 💚`, use: () => Dd.pet() }; }
    }
    // berries and mushrooms
    for (const n of W().nodesNear(p.pos.x, p.pos.z, 3)) {
      if (!n.alive) continue;
      if (n.kind === 'bush' && n.berries) { const s = score(n.x, n.z, 2.4); if (s < bd) { bd = s; best = { label: 'Pick berries 🫐', use: () => It().pickNode(n) }; } }
      if (n.kind === 'mushroom') { const s = score(n.x, n.z, 2.2); if (s < bd) { bd = s; best = { label: 'Pick mushrooms 🍄', use: () => It().pickNode(n) }; } }
    }
    return best;
  }

  // what clicking does (when you're not building or flying)
  function useTool() {
    const p = P();
    const tool = It().tool();
    if (tool === 'axe' || tool === 'pick') { if (p.swing === 0) { p.swing = 0.01; p.hitDone = false; } }
    else if (tool === 'rod') It().castOrReel(p);
    else if (tool === 'stick') It().throwStick(p);
    else if (tool === 'build') DL.Build.setActive(true);
    else if (tool === 'food') {
      const f = It().foodSel;
      if (!It().has(f)) { Hud().toast('🍽️ You don\'t have any food! Pick berries (E on a bush) or go fishing.'); return; }
      if (D().near()) D().feed(f);
      else It().eat(f);
    }
  }
  G.selectSlot = (i) => {
    if (state !== 'play') return;
    if (It().TOOLS[i].id === 'build') { DL.Build.setActive(!DL.Build.active); return; }
    if (It().fish.state !== 'idle' && i !== It().slot) It().stopFishing();
    if (DL.Build.active) DL.Build.setActive(false);
    if (It().slot === i && It().TOOLS[i].id === 'food') It().nextFood();
    It().slot = i;
    DL.Audio.play('ui');
    Hud().refresh();
  };

  // ------------------------------------------------------------
  //  THE MAIN LOOP
  // ------------------------------------------------------------
  function modalOpen() { return Hud().panelOpen() || Hud().talking() || $('mapScreen').classList.contains('show'); }
  let wasModal = false;
  function step(dt) {
    const I = In();
    const modal = modalOpen();
    if (modal !== wasModal) {
      wasModal = modal;
      if (modal) { I.setEnabled(false); I.unlock(); }
      else if (state === 'play') { I.setEnabled(true); I.lock(); }
    }
    if (state === 'play' && modal) {
      // menus are open: the world waits for you
      if (Hud().talking()) { if (I.consume('use') || I.consume('enter') || I.consume('jump')) Hud().nextLine(); }
      else if ($('mapScreen').classList.contains('show')) { if (I.consume('map') || I.consume('pause')) Hud().showMap(false); }
      else if (I.consume('pause') || I.consume('bag') || I.consume('journal') || I.consume('help')) Hud().closePanel();
      I.takeLook();
      I.endFrame();
      Hud().update(dt);
      return;
    }
    if (state === 'title') {
      titleCamera(dt);
      W().update(dt, camera.position, camera);
      D().updateWild(dt);
      DL.FX.update(dt);
      I.endFrame();
      return;
    }
    if (state !== 'play') { I.endFrame(); return; }

    // ---- keys ----
    if (I.consume('pause') || I.consume('unlock')) { if (DL.Build.active) DL.Build.setActive(false); else { pause(); I.endFrame(); return; } }
    P().look(I.takeLook());
    if (!DL.Build.active) {
      for (let i = 1; i <= 6; i++) if (I.consume('slot' + i)) G.selectSlot(i - 1);
      if (I.consume('cycle')) { It().nextFood(); DL.Audio.play('ui'); }
    }
    if (I.consume('build')) { if (P().riding) Hud().toast('🛬 Land first to build!'); else DL.Build.setActive(!DL.Build.active); }
    if (I.consume('bag')) Hud().openBag();
    if (I.consume('journal')) Hud().openJournal();
    if (I.consume('help')) Hud().openHelp();
    if (I.consume('map')) Hud().showMap(true);
    if (I.consume('dragon')) D().onDragonKey();
    if (I.consume('whistle')) D().callDragon();
    // E
    const target = DL.Build.active ? null : findTarget();
    if (I.consume('use') && target) target.use();
    // mouse click
    if (!DL.Build.active && !P().riding && I.consume('click')) useTool();
    if (P().riding) I.consume('click');

    // ---- the world ----
    W().update(dt, P().riding ? D().pos : P().pos, camera);
    It().update(dt, P());
    P().update(dt);
    if (P().swing > 0.4 && !P().hitDone && (It().tool() === 'axe' || It().tool() === 'pick')) { P().hitDone = true; It().hit(P()); }
    D().update(dt);
    D().updateWild(dt);
    DL.Build.update(dt, camera);
    DL.Story.update(dt);
    DL.FX.update(dt);
    // a new day starts at midnight
    if (W().tod < lastTod - 0.5) W().day++;
    lastTod = W().tod;
    // look at the dragon when it hatches
    if (G.lookAtDragon > 0) {
      G.lookAtDragon -= dt;
      const a = Math.atan2(D().pos.x - P().pos.x, D().pos.z - P().pos.z);
      P().camYaw = U.dampAngle(P().camYaw, a, 3, dt);
    }
    // flying makes the camera wider
    const fast = P().riding ? U.clamp((D().speed - 20) / 30, 0, 1) : 0;
    const fov = 65 + fast * 15;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = U.damp(camera.fov, fov, 3, dt); camera.updateProjectionMatrix(); DL.FX.setScale(window.innerHeight * renderer.getPixelRatio(), camera.fov); }

    // ---- what's on the screen ----
    let prompt = '';
    if (target) prompt = `<kbd>E</kbd>${target.label}`;
    else if (!DL.Build.active && !P().riding) {
      const tool = It().tool();
      if (tool === 'axe' || tool === 'pick') {
        const n = It().nodeInFront(P(), tool === 'axe' ? ['tree'] : ['rock', 'crystal']);
        if (n) prompt = `<kbd>Click</kbd>${tool === 'axe' ? 'Chop the tree 🌳' : n.kind === 'crystal' ? 'Mine the crystal 💎' : 'Mine the rock 🪨'}`;
      }
      if (tool === 'food' && D().near() && It().has(It().foodSel)) prompt = `<kbd>Click</kbd>Feed ${D().name} ${It().ITEMS[It().foodSel].icon}`;
      if (D().hatched() && D().stage !== 'baby' && D().mode === 'ground' && D().pos.distanceTo(P().pos) < D().reach() + 1.5 && !prompt) prompt = `<kbd>F</kbd>Ride ${D().name} 🐉`;
    } else if (P().riding) prompt = '';
    Hud().prompt(prompt);
    $('dot').style.display = DL.Build.active ? 'block' : 'none';
    $('clickToLook').style.display = !I.locked && !modal && !DL.Build.active && P().speed < 0.1 && state === 'play' && Math.floor(W().time / 4) % 4 === 0 && !document.pointerLockElement && W().time > 3 ? 'block' : 'none';
    Hud().update(dt);
    // sounds
    const pp = P().riding ? D().pos : P().pos;
    let water = 0;
    for (let a = 0; a < 6.28; a += 1.05) if (W().terrainH(pp.x + Math.cos(a) * 25, pp.z + Math.sin(a) * 25) < 0) water += 1 / 6;
    DL.Audio.update(dt, { night: W().night, flying: P().riding && D().pos.y - W().terrainH(D().pos.x, D().pos.z) > 4, water: water * (pp.y < 40 ? 1 : 0.3), land: W().terrainH(pp.x, pp.z) > 1 });
    // autosave
    saveT -= dt;
    if (saveT < 0) { saveT = 30; save(); }
    I.endFrame();
  }
  let lastTod = 0.3;

  // the camera flies around the island on the title screen
  function titleCamera(dt) {
    titleT += dt * 0.04;
    const a = titleT;
    camera.position.set(Math.cos(a) * 230, 70, Math.sin(a) * 230);
    camera.lookAt(0, 15, 0);
  }

  function loop(now) {
    requestAnimationFrame(loop);
    const raw = Math.min(0.1, (now - lastT) / 1000);
    lastT = now;
    const dt = Math.min(raw, 0.05);
    adaptResolution(raw);
    step(dt);
    renderer.render(scene, camera);
  }

  G.init = init;
  window.addEventListener('load', () => setTimeout(init, 30));
  return G;
})();
