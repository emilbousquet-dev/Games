// ============================================================
//  JETPACK CITY — THE GAME
//  The main loop, the camera, the menus, the garage,
//  and what happens when MEGA-BOT catches you.
// ============================================================
window.JC = window.JC || {};

JC.Game = (function () {
  const U = JC.U, S = JC.SETTINGS, W = JC.World, P = JC.Player, C = JC.Chaser, A = JC.Audio, H = JC.HUD;
  let renderer, scene, camera, clock;
  let state = 'title';                // title, garage, run, paused, caught, over
  let t = 0, shake = 0, camY = 0, wakeLock = null;
  let garageTab = 'clank', planets = 1;
  const cam = { pos: new THREE.Vector3(0, 2, -6), look: new THREE.Vector3(0, 2, 0), blend: 1, fromPos: new THREE.Vector3(), fromLook: new THREE.Vector3(), speed: 1.4 };
  const tp = new THREE.Vector3(), tl = new THREE.Vector3();

  // everything we remember between games
  const save = {
    bests: JC.store.get('bests', { easy: 0, normal: JC.store.get('best', 0), hard: 0 }),   // best score for each difficulty
    diff: JC.store.get('diff', 'normal'),
    bank: JC.store.get('bank', 0),
    owned: JC.store.get('owned2', { clank: ['classic'], ratchet: ['classic'] }),
    clank: JC.store.get('clank', 'classic'),
    ratchet: JC.store.get('ratchet', 'classic'),
    tutorialDone: JC.store.get('tutorialDone', false),
  };
  function saveAll() { for (const k of Object.keys(save)) JC.store.set(k === 'owned' ? 'owned2' : k, save[k]); }

  // ---------------- starting up ----------------
  function init() {
    const canvas = document.getElementById('game');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !JC.lowGfx, powerPreference: 'high-performance', preserveDrawingBuffer: location.search.includes('test') });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, JC.lowGfx ? 1.25 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    JC.maxAniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, 1, 0.1, 500);
    clock = new THREE.Clock();

    W.init(scene);
    P.init(scene, playerEvents);
    C.init(scene, chaserEvents);
    JC.Input.init(canvas);
    W.onPlanet = (w) => {
      if (state !== 'run') return;
      planets++;
      A.warp(); buzz(40);
      H.flash();
      H.planet(w.name);
      H.pop('🪐 ' + w.name.toUpperCase() + '!', w.gate, 2);
    };
    applyLook();
    P.reset(); P.state.mode = 'idle';
    W.reset(false);
    C.reset('title');

    window.addEventListener('resize', resize);
    resize();
    bindButtons();
    H.setSound(!A.isMuted());
    H.setGfx(JC.lowGfx);
    applyDifficulty();
    toTitle();
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (state === 'run') pause(); A.suspend(true); } else A.suspend(false);
    });
    if (TEST) { tick(0.016); renderer.render(scene, camera); } else renderer.setAnimationLoop(loop);
  }
  // test mode (?test in the address): the game only moves when the test robot says so
  const TEST = location.search.includes('test');
  function advance(seconds, draw = true) {
    for (let i = 0; i < Math.round(seconds * 30); i++) tick(1 / 30);
    if (draw) renderer.render(scene, camera);
  }

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    // on a tall phone screen we need a wider view so you can see all 3 lanes
    const vt = 0.44 / camera.aspect;
    camera.userData.baseFov = U.clamp(2 * Math.atan(vt) * 180 / Math.PI, 58, 84);
    camera.fov = camera.userData.baseFov;
    camera.updateProjectionMatrix();
  }

  function bindButtons() {
    const on = (id, f) => document.getElementById(id).addEventListener('click', (e) => { e.stopPropagation(); A.init(); A.click(); f(); });
    on('playBtn', startRun);
    on('againBtn', startRun);
    on('garageBtn', toGarage);
    on('oGarageBtn', toGarage);
    on('garageBack', toTitle);
    on('menuBtn', toTitle);
    on('quitBtn', toTitle);
    on('resumeBtn', resume);
    on('pauseBtn', pause);
    on('soundBtn', toggleSound);
    on('diffBtn', nextDifficulty);
    on('pSoundBtn', toggleSound);
    on('tabJet', () => { garageTab = 'clank'; refreshGarage(); });
    on('tabSuit', () => { garageTab = 'ratchet'; refreshGarage(); });
    on('gfxBtn', () => {
      JC.store.set('gfxFast', !JC.lowGfx);
      location.reload();  // the new graphics setting needs a fresh start
    });
  }
  // EASY / NORMAL / HARD: copy that difficulty's numbers into the settings
  function applyDifficulty() {
    if (!JC.DIFFICULTY[save.diff]) save.diff = 'normal';
    Object.assign(S, JC.DIFFICULTY[save.diff]);
    H.setDiff(JC.DIFFICULTY[save.diff].label);
    H.setTitleStats(save.bests[save.diff] || 0, save.bank);
  }
  function nextDifficulty() {
    const modes = Object.keys(JC.DIFFICULTY);
    save.diff = modes[(modes.indexOf(save.diff) + 1) % modes.length];
    saveAll();
    applyDifficulty();
  }
  function toggleSound() { A.setMuted(!A.isMuted()); H.setSound(!A.isMuted()); }

  function applyLook() {
    const ck = JC.GARAGE.clank.find((j) => j.id === save.clank) || JC.GARAGE.clank[0];
    const rt = JC.GARAGE.ratchet.find((o) => o.id === save.ratchet) || JC.GARAGE.ratchet[0];
    P.setLook(ck, rt);
  }

  // ---------------- moving between screens ----------------
  function camTo(speed) { cam.fromPos.copy(cam.pos).sub(heroPos(tp)); cam.fromLook.copy(cam.look).sub(heroPos(tl)); cam.blend = 0; cam.speed = speed; }
  function heroPos(out) { const p = P.state; return out.set(p.x, p.y, -p.d); }

  function toTitle() {
    state = 'title';
    releaseWake();
    JC.Input.setEnabled(false);
    A.setJet(false);
    A.setIntensity(0);
    H.clearMessages();
    P.reset(); P.state.mode = 'idle';
    W.reset(false);
    C.reset('title');
    applyDifficulty();
    H.show('title');
    camTo(1.2);
  }

  function toGarage() {
    state = 'garage';
    if (P.state.d > 0 || !P.state.alive) { P.reset(); W.reset(false); C.reset('title'); }
    H.show('garage');
    H.garageNote('');
    refreshGarage();
    camTo(1.6);
  }
  function refreshGarage() {
    document.getElementById('tabJet').classList.toggle('on', garageTab === 'clank');
    document.getElementById('tabSuit').classList.toggle('on', garageTab === 'ratchet');
    H.setTitleStats(save.bests[save.diff] || 0, save.bank);
    H.buildShelf(garageTab, JC.GARAGE[garageTab], save, pickItem);
  }
  function pickItem(it) {
    const owned = it.price === 0 || save.owned[garageTab].includes(it.id);
    if (!owned) {
      if (save.bank < it.price) { A.nope(); H.garageNote(`You need ${it.price - save.bank} more bolts for ${it.name}!`); return; }
      save.bank -= it.price;
      save.owned[garageTab].push(it.id);
      A.buy();
      H.garageNote(`You got ${it.name}! 🎉`);
    } else H.garageNote('');
    save[garageTab] = it.id;
    saveAll();
    applyLook();
    refreshGarage();
  }

  function startRun() {
    applyDifficulty();
    A.init();
    A.startMusic();
    A.setIntensity(0.4);
    H.clearMessages();
    P.reset();
    W.reset(!save.tutorialDone);
    C.reset('chase');
    planets = 1;
    H.planet(JC.WORLDS[0].name);
    state = 'run';
    JC.Input.setEnabled(true);
    H.show('hud');
    camTo(1.5);
    camY = 0;
    A.roar();
    shake = 0.4;
    H.taunt(U.pick(JC.TEXT.taunts));
    requestWake();
  }

  function pause() {
    if (state !== 'run') return;
    state = 'paused';
    JC.Input.setEnabled(false);
    A.setJet(false);
    H.show('pause');
  }
  function resume() {
    if (state !== 'paused') return;
    state = 'run';
    JC.Input.setEnabled(true);
    if (P.state.jetT > 0) A.setJet(true);
    H.show('hud');
    clock.getDelta();
  }

  // ---------------- things that happen while running ----------------
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no buzz, that's ok */ } }

  const playerEvents = {
    bolt: () => A.bolt(),
    hop: () => A.hop(),
    slide: () => A.slide(),
    lane: () => A.lane(),
    land: () => A.land(),
    swing: () => A.swish(),
    smash: () => { A.clang(); buzz(25); shake = Math.max(shake, 0.15); H.pop('SMASH! +' + S.smashBolts + ' 🔩', '#ffd21a', 0.6); },
    pause: () => pause(),
    stumble: () => {
      A.stumble(); buzz(60); shake = Math.max(shake, 0.35);
      if (C.bump()) caught('MEGA-BOT GOT YOU!');
    },
    crash: () => { A.crash(); buzz([120, 60, 200]); shake = 1; caught('CRASH!'); },
    shieldBreak: (timeUp) => { if (timeUp) A.shieldGone(); else { A.shieldBreak(); buzz(40); H.pop('SHIELD SAVED YOU!', '#3ac8ff'); } },
    power: (kind) => {
      A.power(kind);
      H.pop(JC.TEXT.powerUps[kind], '#' + JC.Models.PU_COLORS[kind].toString(16).padStart(6, '0'));
      if (kind === 'jet') A.setJet(true);
    },
    jetEnd: () => A.setJet(false),
  };
  const chaserEvents = {
    stomp: (loud) => { A.stomp(loud); if (state === 'run' || state === 'caught') shake = Math.max(shake, loud * loud * 0.35); },
    taunt: () => { A.beepTalk(); H.taunt(U.pick(JC.TEXT.taunts)); },
    retreat: () => A.retreat(),
    grab: () => { A.roar(); shake = 0.6; buzz(150); },
    caught: () => showOver(),
  };
  function onTrainStart() { A.horn(); }

  function caught(title) {
    if (state !== 'run') return;
    state = 'caught';
    P.state.alive = false;
    JC.Input.setEnabled(false);
    A.setJet(false);
    A.setIntensity(0);
    H.clearMessages();
    H.show('none');
    C.startGrab();
    cam.overTitle = title === 'CRASH!' ? 'CRASH! ' + U.pick(JC.TEXT.caught) : U.pick(JC.TEXT.caught);
    // if you were flying or on a train, drop to the road (and power-ups switch off)
    P.state.jetT = 0; P.state.magnetT = 0; P.state.shieldT = 0;
    P.place(t);
    camTo(1.3);
  }

  function showOver() {
    const p = P.state;
    const score = Math.floor(p.d) + p.bolts * S.boltScore;
    const best = save.bests[save.diff] || 0;
    const record = score > best;
    if (record) save.bests[save.diff] = score;
    save.bank += p.bolts;
    if (p.d > 150) save.tutorialDone = true;
    saveAll();
    state = 'over';
    releaseWake();
    H.showOver({ title: cam.overTitle || 'CAUGHT!', score, dist: Math.floor(p.d), bolts: p.bolts, best: save.bests[save.diff], record, planets, mode: JC.DIFFICULTY[save.diff].label });
    H.show('over');
    if (record && score > 0) A.record(); else A.gameOver();
  }

  // keep the phone screen on while you play (if the phone lets us)
  async function requestWake() {
    try { if (navigator.wakeLock && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; }
  }
  function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }

  // ---------------- the camera ----------------
  function cameraTarget(outPos, outLook) {
    const p = P.state;
    const z = -p.d;
    if (state === 'title') {
      outPos.set(1.0, 1.15, z - 6.6); outLook.set(0.3, 0.1, z + 6);
    } else if (state === 'garage') {
      outPos.set(0.9, 1.45, z - 3.1); outLook.set(0, 1.0, z);
    } else if (state === 'caught' || state === 'over') {
      const hx = C.state.x + 3.3;
      outPos.set(U.clamp(hx + 2.5, -3, 3), 2.6, z - 11); outLook.set(hx, 5.2, z + 3);
    } else {
      camY = U.damp(camY, p.y, 4, camDt);
      jetCam = U.damp(jetCam, p.jetT > 0 ? 1 : 0, 3, camDt);
      // while flying, the camera comes closer and flies with you
      outPos.set(p.x * 0.75, U.lerp(camY * 0.6 + 4.3, camY + 2.3, jetCam), z + U.lerp(8.6, 5.8, jetCam));
      outLook.set(p.x * 0.85, U.lerp(camY * 0.7 + 1.3, camY + 0.3, jetCam), z - 7);
    }
  }

  let camDt = 1 / 60, jetCam = 0;
  function updateCamera(dt) {
    camDt = dt;
    cameraTarget(tp, tl);
    if (cam.blend < 1) {
      cam.blend = Math.min(1, cam.blend + dt * cam.speed);
      const k = U.smooth(cam.blend);
      heroPos(cam.pos).add(cam.fromPos).lerp(tp, k);
      heroPos(cam.look).add(cam.fromLook).lerp(tl, k);
    } else { cam.pos.copy(tp); cam.look.copy(tl); }
    camera.position.copy(cam.pos);
    if (shake > 0) {
      camera.position.x += (Math.random() - 0.5) * shake * 0.6;
      camera.position.y += (Math.random() - 0.5) * shake * 0.6;
      shake = Math.max(0, shake - dt * 2.2);
    }
    camera.lookAt(cam.look);
    const wantFov = camera.userData.baseFov + (state === 'run' && P.state.jetT > 0 ? 8 : 0) + (state === 'run' ? (P.state.speed - S.startSpeed) * 0.25 : 0);
    if (Math.abs(camera.fov - wantFov) > 0.05) { camera.fov = U.damp(camera.fov, wantFov, 3, dt); camera.updateProjectionMatrix(); }
  }

  // ---------------- the main loop ----------------
  function loop() {
    tick(Math.min(clock.getDelta(), 0.05));
    renderer.render(scene, camera);
  }
  function tick(dt) {
    const p = P.state;
    if (state !== 'paused') t += dt;

    if (state === 'run') {
      W.update(dt, p.d, t, onTrainStart, p.speed);
      P.update(dt, t);
      C.update(dt, t, p, P.hero);
      // tutorial hints
      while (W.hints.length && p.d >= W.hints[0].d) {
        H.hint(W.hints.shift().text);
      }
      const cs = C.state;
      H.update(dt, p, U.clamp(1 - (cs.dist - 11) / 31, 0, 1));
      A.setIntensity(0.4 + (p.speed - S.startSpeed) / (S.maxSpeed - S.startSpeed) * 0.6);
    } else if (state === 'caught' || state === 'over') {
      W.update(dt, p.d, t);
      if (state === 'caught' && !(C.state.grip > 0.5)) {
        // fall down onto the road
        p.vy -= 30 * dt; p.y = Math.max(P.groundAt(p.x, -p.d, p.y), p.y + p.vy * dt);
        P.hero.root.position.set(p.x, p.y, -p.d);
        P.hero.pose('fall', 0, t, 0.2);
      } else P.hero.pose('grabbed', 0, t, 0.8);
      C.update(dt, t, p, P.hero);
    } else if (state === 'title' || state === 'garage') {
      W.update(dt, p.d, t);
      P.showIdle(t, 'idle');
      C.update(dt, t, p, P.hero);
    }
    updateCamera(dt);
  }

  // wait for the fonts so the neon signs use the right letters
  function boot() {
    const go = () => { try { init(); } catch (e) { console.error(e); document.body.insertAdjacentHTML('beforeend', '<p style="position:fixed;top:40%;width:100%;text-align:center;color:#fff">Oops! Your browser could not start the 3D game.</p>'); } };
    if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(go);
    else go();
  }
  boot();

  return { get state() { return state; }, startRun, save, advance, debug: () => ({ scene, camera, renderer }) };
})();
