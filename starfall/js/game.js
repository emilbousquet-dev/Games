// ============================================================
//  STARFALL — THE MAIN GAME: title screen, saving, the game loop
// ============================================================
window.SF = window.SF || {};

SF.State = null;

SF.Game = (function () {
  const U = SF.U, L = SF.Layout;
  const $ = (id) => document.getElementById(id);
  const G = {
    scene: null, camera: null, renderer: null, player: null, cutscene: null,
    interact: null, mode: 'loading', paused: false,
  };
  let clock = null, time = 0, shakeA = 0, lastRegion = '';

  function newMe() {
    return { maxHearts: L.startHearts, heartPieces: 0, energyLv: 0, swordLv: 0, shards: 0, boughtHearts: 0, fog: [], pos: null, lastBeacon: 0 };
  }
  G.myName = () => { try { return (localStorage.getItem('starfall.name') || 'STAR KID').toUpperCase(); } catch (e) { return 'STAR KID'; } };

  // ---------- saving (in your browser) ----------
  function readSave() { try { return JSON.parse(localStorage.getItem('starfall.save') || 'null'); } catch (e) { return null; } }
  G.save = function () {
    if (!SF.State || G.mode !== 'play') return;
    const P = G.player;
    const me = SF.State.me;
    const a = SF.Phys.arenaAt(P.pos.x, P.pos.z);
    if (a) { const t = SF.World.temples[a.i]; me.pos = { x: t.door.x, z: t.door.z }; }
    else if (!P.down && !P.swimming) me.pos = { x: +P.pos.x.toFixed(1), z: +P.pos.z.toFixed(1) };
    SF.State.world.time = SF.Sky.S.t;
    try {
      localStorage.setItem('starfall.save', JSON.stringify(SF.State));
    } catch (e) {}
  };

  // ---------- loading the planet ----------
  function init() {
    const canvas = $('game');
    G.renderer = new THREE.WebGLRenderer({ canvas, antialias: !SF.lowGfx, powerPreference: 'high-performance' });
    G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SF.lowGfx ? 1 : 1.5));
    G.renderer.setSize(window.innerWidth, window.innerHeight);
    G.renderer.shadowMap.enabled = !SF.lowGfx;
    G.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    G.scene = new THREE.Scene();
    G.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
    window.addEventListener('resize', () => {
      G.camera.aspect = window.innerWidth / window.innerHeight; G.camera.updateProjectionMatrix();
      G.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    SF.Input.init(canvas);
    SF.HUD.init();
    SF.State = { world: SF.World.newState(), me: newMe() };

    const steps = [
      ['Growing mountains...', () => SF.Terrain.generate()],
      ['Painting the ground...', () => SF.Terrain.build(G.scene)],
      ['Building temples...', () => SF.World.build(G.scene)],
      ['Planting alien trees...', () => SF.Nature.build(G.scene)],
      ['Lighting the stars...', () => { SF.Sky.build(G.scene); SF.FX.build(G.scene); }],
      ['Waking up the creatures...', () => { SF.Creatures.build(G.scene); SF.Story.build(G.scene); }],
      ['Drawing the map...', () => SF.Terrain.getMapCanvas()],
      ['Ready!', () => {
        G.player = new SF.Player(G.scene, G.camera, 0xff8a30, G.myName());
        G.player.place(L.crash.x + 6, L.crash.z + 4);
        G.player.avatar.group.visible = false;
        G.renderer.compile(G.scene, G.camera);
      }],
    ];
    let i = 0;
    const next = () => {
      if (i >= steps.length) { showTitle(); return; }
      $('loadText').textContent = steps[i][0];
      $('loadBar').style.width = (i / steps.length) * 100 + '%';
      setTimeout(() => {
        try { steps[i][1](); } catch (e) { console.error(e); $('loadText').textContent = 'Oops! ' + e.message; throw e; }
        i++; next();
      }, 30);
    };
    next();
    clock = new THREE.Clock();
    requestAnimationFrame(loop);
  }

  // ---------- title screen ----------
  function showTitle(msg) {
    G.mode = 'title';
    $('loading').style.display = 'none';
    $('title').style.display = 'flex';
    $('hud').style.display = 'none';
    $('pause').style.display = 'none';
    $('titleMsg').textContent = msg || '';
    const save = readSave();
    $('btnContinue').style.display = save ? 'block' : 'none';
    $('btnNew').textContent = save ? 'NEW GAME' : 'START ADVENTURE';
    $('nameInput').value = G.myName();
    $('gfxBtn').textContent = 'GRAPHICS: ' + (SF.lowGfx ? 'LOW' : 'HIGH');
    SF.Audio.setMusic('title');
    if (G.player) G.player.avatar.group.visible = false;
  }
  G.backToTitle = function (msg) {
    G.save();
    try { sessionStorage.setItem('starfall.msg', msg || ''); } catch (e) {}
    location.reload();
  };

  function setupTitle() {
    const click = () => { SF.Audio.init(); SF.Audio.sfx('ok'); };
    $('nameInput').addEventListener('change', () => { try { localStorage.setItem('starfall.name', $('nameInput').value.trim().slice(0, 14) || 'STAR KID'); } catch (e) {} });
    $('btnContinue').onclick = () => { click(); startSolo(readSave()); };
    $('btnNew').onclick = () => {
      click();
      // press twice to erase an old adventure (pop-up questions don't work everywhere)
      if (readSave() && !G.confirmNew) {
        G.confirmNew = true;
        $('btnNew').textContent = 'CLICK AGAIN TO ERASE YOUR SAVE';
        setTimeout(() => { G.confirmNew = false; if (G.mode === 'title') $('btnNew').textContent = 'NEW GAME'; }, 4000);
        return;
      }
      try { localStorage.removeItem('starfall.save'); } catch (e) {}
      startSolo(null);
    };
    $('gfxBtn').onclick = () => {
      try { localStorage.setItem('starfall.gfx', SF.lowGfx ? 'high' : 'low'); } catch (e) {}
      location.reload();
    };
    $('btnHelp').onclick = () => { click(); $('helpPanel').style.display = 'flex'; };
    $('helpClose').onclick = () => { $('helpPanel').style.display = 'none'; };
    // pause menu
    $('btnResume').onclick = () => resume();
    $('btnQuit').onclick = () => { G.backToTitle(); };
    $('volMusic').oninput = () => SF.Audio.setVolumes(+$('volMusic').value, SF.Audio.sfxVol);
    $('volSfx').oninput = () => SF.Audio.setVolumes(SF.Audio.musicVol, +$('volSfx').value);
    $('sens').oninput = () => SF.Input.setSensitivity(+$('sens').value);
    $('volMusic').value = SF.Audio.musicVol; $('volSfx').value = SF.Audio.sfxVol; $('sens').value = SF.Input.sensitivity;
    $('game').addEventListener('click', () => { if (G.mode === 'play' && !G.paused && !SF.HUD.modalOpen) SF.Input.lock($('game')); });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) return;
      if (SF.Input.mouse.intentional) { SF.Input.mouse.intentional = false; return; }
      if (G.mode === 'play' && !SF.HUD.modalOpen && !G.cutscene && $('credits').style.display !== 'flex') pause();
    });
    let msg = null;
    try { msg = sessionStorage.getItem('starfall.msg'); sessionStorage.removeItem('starfall.msg'); } catch (e) {}
    if (msg) setTimeout(() => ($('titleMsg').textContent = msg), 100);
  }

  // ---------- starting a game ----------
  function begin() {
    G.mode = 'play';
    $('title').style.display = 'none';
    $('hud').style.display = 'block';
    SF.Audio.init();
    const P = G.player;
    P.avatar.group.visible = true;
    P.hp = P.maxHp; P.energy = P.maxEnergy;
    P.camInit = false;
    SF.HUD.redrawFog();
    SF.Input.lock($('game'));
    lastRegion = '';
  }

  function startSolo(save) {
    if (save && save.world && save.me) {
      SF.State = { world: Object.assign(SF.World.newState(), save.world), me: Object.assign(newMe(), save.me) };
    } else SF.State = { world: SF.World.newState(), me: newMe() };
    SF.Sky.S.t = SF.State.world.time ?? 0.08;
    const me = SF.State.me;
    begin();
    if (me.pos) { G.player.place(me.pos.x, me.pos.z); G.player.facing = 0; G.player.camYaw = Math.PI; }
    else { G.player.place(L.crash.x - 2, L.crash.z - 13); G.player.facing = 0.2; G.player.camYaw = G.player.facing + Math.PI; G.player.camPitch = 0.25; }
    if (!SF.State.world.flags.intro) SF.Story.intro();
    else G.fadeIn(1);
  }

  // ---------- pause ----------
  function pause() {
    if (G.mode !== 'play' || G.paused) return;
    G.paused = true;
    $('pause').style.display = 'flex';
    G.menuOpen = true;
    G.save();
  }
  function resume() {
    $('pause').style.display = 'none';
    G.paused = false; G.menuOpen = false;
    SF.Input.lock($('game'));
  }
  G.relock = () => { if (G.mode === 'play') SF.Input.lock($('game')); };

  // ---------- helpers other files use ----------
  G.targets = function () {
    const P = G.player;
    return [{ id: 'me', pos: P.pos, down: P.down, hurt: (a, fx, fz, k) => P.hurt(a, fx, fz, k) }];
  };
  // the first thing in the middle of the screen (so arrows go where the crosshair is)
  G.aimPoint = function (from, dir, max) {
    const p = from.clone();
    const P = G.player;
    for (let t = 0; t < max; t += 0.4) {
      p.copy(from).addScaledVector(dir, t);
      if (t < 3.5) continue; // don't hit yourself
      if (SF.Phys.solidAt(p.x, p.y, p.z)) return p;
      if (SF.World.targetAt(p, 1.0)) return p;
      for (const e of SF.Creatures.list) {
        const def = SF.Creatures.TYPES[e.type];
        if (Math.hypot(p.x - e.x, p.z - e.z) < def.r && p.y > e.y && p.y < e.y + def.h) return p;
      }
    }
    return p;
  };
  G.shake = (a) => { shakeA = Math.max(shakeA, a); };
  G.fade = function (cb) {
    const f = $('fade');
    f.style.transition = 'opacity 0.35s'; f.style.opacity = 1;
    setTimeout(() => { cb(); f.style.opacity = 0; }, 380);
  };
  G.fadeIn = function (secs = 1) {
    const f = $('fade');
    f.style.transition = 'none'; f.style.opacity = 1;
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = `opacity ${secs}s`; f.style.opacity = 0; }));
  };

  // when your hearts run out
  G.onPlayerDown = function () {
    $('faint').style.display = 'flex';
    setTimeout(() => { $('faint').style.display = 'none'; G.respawn(); }, 2800);
  };
  G.respawn = function () {
    const P = G.player;
    G.fade(() => {
      const w = SF.State.world;
      // the nearest beacon that works
      let best = SF.World.beacons[0], bd = 1e9;
      const a = SF.Phys.arenaAt(P.pos.x, P.pos.z);
      const from = a ? SF.World.temples[a.i] : P.pos;
      for (const b of SF.World.beacons) { if (!w.beacons[b.i]) continue; const d = Math.hypot(b.x - from.x, b.z - from.z); if (d < bd) { bd = d; best = b; } }
      if (a) {
        SF.Sky.S.indoor = null;
        SF.Creatures.clearArena(a);
      }
      P.down = false; P.hp = P.maxHp; P.inv = 2;
      P.place(best.x + 2.5, best.z + 2.5);
      P.camInit = false;
      SF.HUD.toast('You woke up at the ' + best.name + ' beacon.', 0x60f0ff);
    });
  };

  function updateMusic() {
    const P = G.player;
    const a = SF.Phys.arenaAt(P.pos.x, P.pos.z);
    let m;
    if (G.cutscene) return;
    if (a) m = SF.Creatures.bossIn(a) ? 'boss' : 'temple';
    else {
      const reg = SF.Terrain.regionAt(P.pos.x, P.pos.z);
      m = reg;
      if (Math.hypot(P.pos.x - L.village.x, P.pos.z - L.village.z) < 45) m = 'village';
      else if (SF.Sky.S.night > 0.6 && reg !== 'lava') m = 'night';
    }
    SF.Audio.setMusic(m);
    // show the name of the region when you walk into it
    const name = a ? L.temples[a.i].name : (Math.hypot(P.pos.x - L.village.x, P.pos.z - L.village.z) < 30 ? 'ZIBVILLE' : SF.Terrain.regionName(P.pos.x, P.pos.z));
    if (name !== lastRegion) { if (lastRegion) SF.HUD.zone(name); lastRegion = name; }
  }

  // ---------- THE GAME LOOP (runs about 60 times per second) ----------
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta());
    time += dt;
    if (G.mode === 'loading') return;
    SF.Input.mouse.active = G.mode === 'play' && !G.paused && !G.menuOpen && !SF.HUD.modalOpen;
    const inp = SF.Input.read(dt);

    if (G.mode === 'title') {
      // a slow flight around the island
      const a = time * 0.04;
      G.camera.position.set(L.crash.x + Math.cos(a) * 95, 42, L.crash.z - 60 + Math.sin(a) * 95);
      G.camera.lookAt(L.crash.x, 12, L.crash.z - 60);
      SF.Sky.update(dt, G.camera, G.camera.position, G.scene, time);
      SF.Terrain.update(dt, time);
      SF.Nature.update(SF.Sky.S.night);
      G.renderer.render(G.scene, G.camera);
      SF.Input.endFrame();
      return;
    }

    const P = G.player;
    if (G.paused) {
      G.renderer.render(G.scene, G.camera);
      SF.Input.endFrame();
      return;
    }

    tick(dt, inp);
    G.renderer.render(G.scene, G.camera);
    SF.Input.endFrame();
  }

  // one step of the game (the tests also call this to play really fast)
  function tick(dt, inp) {
    const P = G.player;
    // menus and talking come first
    let busy = false;
    if (G.menuOpen) busy = true;
    else if (SF.HUD.updateDialog(dt, inp)) busy = true;
    else if (SF.HUD.updateModal(inp)) busy = true;
    else if (!G.cutscene) {
      if (inp.mapPressed) { SF.HUD.toggleMap(); SF.Audio.sfx('ui'); }
      if (inp.pausePressed) { if (SF.HUD.mapOpen) SF.HUD.toggleMap(false); else { SF.Input.unlock(); pause(); } }
      if (inp.usePressed && !P.down) {
        if (G.interact) { G.interact.act(); SF.Audio.sfx('ui'); }
        else SF.Story.talkZib();
      }
    }
    if (G.cutscene) { P.frozen = true; G.hadCutscene = true; }
    else if (G.hadCutscene) { G.hadCutscene = false; P.frozen = false; }

    P.update(dt, busy && !G.cutscene ? { ...inp, mx: 0, mz: 0, jumpPressed: false, attackPressed: false, block: false, aim: false, sprint: false } : inp);
    // like in Zelda, the monsters wait while you talk or shop
    if (!busy || G.cutscene) SF.Creatures.update(dt, time);
    SF.World.update(dt, time);
    SF.Story.update(dt, time);
    SF.Sky.update(dt, G.camera, P.pos, G.scene, time);
    SF.Terrain.update(dt, time);
    SF.Nature.update(SF.Sky.S.night, dt);
    SF.FX.update(dt);
    SF.State.world.playTime += dt;

    // camera
    if (G.cutscene) G.cutscene.update(dt);
    else P.updateCamera(dt);
    if (shakeA > 0.001) {
      G.camera.position.x += (Math.random() - 0.5) * shakeA;
      G.camera.position.y += (Math.random() - 0.5) * shakeA;
      shakeA *= Math.exp(-dt * 8);
    }
    P.animate(dt);
    updateMusic();
    SF.HUD.update(dt, inp);

    // save every 20 seconds, just in case
    G.saveT = (G.saveT || 0) + dt;
    if (G.saveT > 20) { G.saveT = 0; G.save(); }
  }
  G.tick = (dt, inp) => { time += dt; tick(dt, Object.assign(SF.Input.empty(), inp || {})); };

  window.addEventListener('beforeunload', () => G.save());

  G.start = function () { setupTitle(); init(); };
  G.time = () => time;
  return G;
})();

window.addEventListener('load', () => SF.Game.start());
