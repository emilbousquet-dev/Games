// ============================================================
//  SIGMA RUN — THE GAME
//  Menus, scoring (AURA!), the SIGMA meter, wanted stars,
//  hearts, the shop, and the main loop that runs everything.
// ============================================================
window.SR = window.SR || {};

SR.Game = (function () {
  const U = SR.U;
  const $ = (id) => document.getElementById(id);
  const S = () => SR.Audio.S;
  let renderer, scene, camera;
  let state = 'title', lastT = performance.now(), time = 0, readyT = 0, deadT = 0, fadeT = 0, pendingRespawn = null;
  const P = SR.Player.P;
  let run = null;

  // when the FBI gets more serious (distance in meters)
  const WANTED_AT = [0, 250, 600, 1000, 1600, 2300];
  const WANTED_MSG = ['', 'THE FBI IS ON TO YOU!', 'HELICOPTER INCOMING!', 'THEY HAVE MISSILES! WATCH THE RED RINGS!', 'ATTACK DRONES!', 'MAXIMUM WANTED LEVEL!'];
  const WANTED_TIP_AUTO = ['', 'FBI agents! Your runner slide-tackles them by himself!', 'Grab a 🚀 and press the ROCKET button to shoot the helicopter down!',
    'Missiles land on the RED RINGS: steer away from them!', 'Drones dive at you: steer left or right!', ''];
  const WANTED_TIP = ['', 'FBI agents! SLIDE into them, or JUMP on their heads!', 'Grab a 🚀 ROCKET LAUNCHER to shoot the helicopter down!',
    'Missiles land on the RED RINGS: get out of the way!', 'Drones dive at you: move left or right!', ''];

  // ---------------- saved stuff ----------------
  const save = {
    coins: SR.store.get('coins', 0),
    best: SR.store.get('best', 0),
    bestDist: SR.store.get('bestDist', 0),
    up: SR.store.get('up', {}),
    gloves: SR.store.get('gloves', ['default']),
    glove: SR.store.get('glove', 'default'),
  };
  function persist() {
    SR.store.set('coins', save.coins); SR.store.set('best', save.best); SR.store.set('bestDist', save.bestDist);
    SR.store.set('up', save.up); SR.store.set('gloves', save.gloves); SR.store.set('glove', save.glove);
  }
  const lvl = (id) => save.up[id] || 0;

  const UPGRADES = [
    { id: 'magnet', icon: '🧲', name: 'MAGNET POWER', desc: 'The coin magnet lasts longer', costs: [150, 400, 900] },
    { id: 'boost', icon: '⚡', name: 'SPEED BOOST', desc: 'Speed boosts last longer', costs: [150, 400, 900] },
    { id: 'sigma', icon: 'Σ', name: 'SIGMA MODE', desc: 'Sigma mode lasts longer', costs: [250, 600, 1200] },
    { id: 'hearts', icon: '❤️', name: 'EXTRA HEART', desc: 'Start every run with more hearts', costs: [500, 1200] },
    { id: 'rockets', icon: '🚀', name: 'ROCKET START', desc: 'Start every run with rockets', costs: [300, 700, 1400] },
    { id: 'shield', icon: '🛡️', name: 'SHIELD START', desc: 'Start every run with a shield', costs: [600] },
  ];
  const GLOVES = [
    { id: 'default', name: 'STREET', cost: 0, col: '#2a2a2e' },
    { id: 'fire', name: 'FIRE', cost: 300, col: '#ff3a1a' },
    { id: 'neon', name: 'NEON', cost: 600, col: '#2af0ff' },
    { id: 'fbi', name: 'AGENT', cost: 800, col: '#101010' },
    { id: 'gold', name: 'GOLD SIGMA', cost: 1500, col: '#ffc61a' },
    { id: 'diamond', name: 'DIAMOND', cost: 3000, col: '#bff4ff' },
  ];

  function newRun() {
    const maxHearts = 3 + lvl('hearts');
    return {
      aura: 0, coins: 0, hearts: maxHearts, maxHearts, combo: 0, comboT: 0, mult: 1, sigma: 0, sigmaT: 0, wanted: 0, maxWanted: 0,
      tricks: 0, takedowns: 0, magnet: 0, double: 0, shield: lvl('shield') ? 1 : 0, hurt: 0, lastDist: 0, fallT: 0, reason: '',
      shown: new Set(), safe: null, sigmaFx: 0, flash: 0, bulletTime: 0,
    };
  }

  // ------------------------------------------------------------
  //  SETUP
  // ------------------------------------------------------------
  function init() {
    const canvas = $('game');
    const gfx = SR.settings.gfx;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: gfx === 'low', powerPreference: 'high-performance' });
    } catch (e) {
      document.body.innerHTML = '<div style="padding:40px;font:20px sans-serif;color:#fff">Sorry! Your browser can\'t show 3D games (WebGL is off). Try Chrome or Edge.</div>';
      return;
    }
    renderer.autoClear = false;
    renderer.shadowMap.enabled = gfx !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(SR.settings.fov, 1, 0.08, 2600);
    camera.rotation.order = 'YXZ';
    SR.Tex.init(renderer);
    SR.Mats.init();
    SR.Env.init(scene, renderer);
    SR.Post.init(renderer);
    renderer.toneMapping = SR.Post.enabled ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    SR.FX.init(scene, renderer, camera);
    SR.Pickups.init(scene);
    SR.City.init(scene);
    SR.Level.init(scene);
    SR.Player.init(camera);
    SR.Player.setGloves(save.glove);
    SR.FBI.init(scene);
    SR.Input.init(canvas);
    hookGameplay();
    hookMenus();
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pause(); });
    SR.Level.reset();
    SR.Mats.setNight(SR.Env.windowGlow);
    showScreen('sTitle');
    refreshTitle();
    requestAnimationFrame(loop);
    window.__sr = {
      agents: () => SR.FBI._agents,
      P, get run() { return run; }, get state() { return state; }, startRun, scene, camera, renderer, playFrame, draw,
      setState(v) { state = v; }, hurt, trick,
    };
  }

  // if the computer is too slow, the game draws fewer pixels so it stays smooth
  let resScale = 1, frameAvg = 1 / 60, resCheck = 0;
  function adaptResolution(rawDt) {
    frameAvg += (Math.min(rawDt, 0.1) - frameAvg) * 0.05;
    resCheck += rawDt;
    if (resCheck < 2) return;
    resCheck = 0;
    if (frameAvg > 1 / 42 && resScale > 0.5) { resScale = Math.max(0.5, resScale - 0.15); resize(); }
    else if (frameAvg < 1 / 57 && resScale < 1) { resScale = Math.min(1, resScale + 0.1); resize(); }
  }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const pr = Math.max(0.5, Math.min(dpr, { low: 1, medium: 1, high: 1.35, ultra: 2 }[SR.settings.gfx] || 1.35) * resScale);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    SR.Post.resize(w, h, pr);
  }

  // ------------------------------------------------------------
  //  SCORING
  // ------------------------------------------------------------
  function trick(name, pts, opts = {}) {
    if (!run) return;
    if (!opts.noCombo) {
      run.combo++; run.comboT = 4;
      const m = Math.min(5, 1 + Math.floor(run.combo / 3));
      if (m > run.mult) S().combo(m);
      run.mult = m;
    }
    const total = Math.round(pts * run.mult * (run.sigmaT > 0 ? 2 : 1));
    run.aura += total;
    run.tricks++;
    if (run.sigmaT <= 0) {
      const before = run.sigma;
      run.sigma = Math.min(1, run.sigma + pts / 420);
      if (before < 1 && run.sigma >= 1) { S().aura(); SR.HUD.big('Σ SIGMA READY', SR.Input.touch || SR.Input.isAuto() ? 'PRESS THE SIGMA BUTTON!' : 'PRESS E!', '#ffd21a'); }
    }
    SR.HUD.feed(name, total);
  }

  function hookGameplay() {
    SR.Pickups.onCoin = (x, y, z) => {
      const n = run.double > 0 ? 2 : 1;
      run.coins += n; run.aura += 5 * n;
      S().coin();
      SR.FX.sparkle(x, y, z);
    };
    SR.Pickups.onPowerup = (type, x, y, z) => {
      const T = SR.Pickups.TYPES[type];
      S().pickup(type);
      SR.FX.burst(x, y, z, T.color, 36);
      switch (type) {
        case 'speed': P.boost = 6 + lvl('boost') * 2; S().boost(); P.fovKick = 10; break;
        case 'magnet': run.magnet = 10 + lvl('magnet') * 3.5; break;
        case 'shield': run.shield = 1; break;
        case 'rocket': P.rockets = Math.min(9, P.rockets + 3); break;
        case 'jump': P.superJump = 12; P.airJumps = 1; break;
        case 'double': run.double = 15; break;
        case 'heart': if (run.hearts < run.maxHearts) run.hearts++; else run.aura += 100; break;
      }
      SR.HUD.big(T.name + '!', type === 'rocket' ? (SR.Input.isAuto() ? 'PRESS THE 🚀 BUTTON TO FIRE!' : SR.Input.touch ? 'TAP 🚀 TO FIRE' : 'CLICK TO FIRE AT THE HELICOPTER') : type === 'jump' ? 'JUMP AGAIN IN THE AIR!' : '', '#' + new THREE.Color(T.color).getHexString());
      run.aura += 20;
    };
    const F = SR.FBI.cb;
    F.hit = (source, dir) => hurt(source, dir);
    F.knock = (how) => {
      if (how === 'tackled') return;
      run.takedowns++;
      S().knock();
      if (how === 'stomp') { S().stomp(); trick('STOMP!', 100); }
      else if (how === 'slide') trick('SLIDE TACKLE', 75);
      else if (how === 'smash') trick('BULLDOZER', 60);
      else trick('BOOM!', 50);
    };
    F.heliHit = (hp) => { if (hp > 0) { trick('DIRECT HIT!', 100); SR.HUD.big('DIRECT HIT!', hp + ' MORE TO GO', '#ff7a1a'); } };
    F.heliDown = () => {
      trick('HELICOPTER DOWN', 500);
      SR.HUD.big('HELICOPTER DOWN!', '+500 AURA', '#ffd21a');
      S().heliDown(); run.sigma = Math.min(1, run.sigma + 0.4); run.takedowns++;
      run.bulletTime = 1.3; P.fovKick = 12;
    };
    F.heliCrash = (d) => { P.shake = Math.max(P.shake, U.clamp(1.4 - d / 60, 0.2, 1)); };
    F.nearMiss = () => trick('NEAR MISS', 40);
    F.droneKill = (how) => { run.takedowns++; trick(how === 'rocket' ? 'DRONE DOWN' : 'DRONE SMASH', 150); };
    F.say = () => S().megaphone(0);
    F.boom = (d) => { P.shake = Math.max(P.shake, U.clamp(1.1 - d / 22, 0, 1)); if (d < 10) run.flash = Math.max(run.flash, 0.25 * (1 - d / 10)); };
  }

  function hurt(source, dir) {
    if (!run || state !== 'play' || run.fallT > 0) return;
    if (run.sigmaT > 0 || P.invuln > 0) return;
    if (run.shield > 0) {
      run.shield = 0; P.invuln = 1.2;
      S().shieldHit(); SR.HUD.big('SHIELD SAVED YOU!', '', '#3af0ff');
      SR.FX.burst(P.pos.x, P.pos.y + 1, P.pos.z, 0x3af0ff, 40);
      return;
    }
    run.hearts--;
    P.invuln = 1.8; P.stagger = 0.7; P.shake = 0.9;
    if (dir) { P.vel.x += dir.x * 7; P.vel.z += dir.z * 7; }
    if (P.grounded) P.vel.y = 5;
    run.hurt = 1; run.combo = 0; run.mult = 1;
    S().hurt();
    const reasons = { agent: 'TACKLED BY THE FBI!', missile: 'BLOWN UP BY A MISSILE!', drone: 'TAKEN DOWN BY A DRONE!' };
    if (run.hearts <= 0) die(reasons[source] || 'THE FBI GOT YOU!');
    else SR.HUD.big(source === 'agent' ? 'TACKLED!' : 'OUCH!', run.hearts + (run.hearts === 1 ? ' HEART LEFT!' : ' HEARTS LEFT'), '#ff4a5a');
  }

  function fell() {
    if (run.fallT > 0 || state !== 'play') return;
    S().fall();
    run.fallT = 0.75;
    SR.HUD.big('WHOOPS!', '', '#ff4a5a');
  }
  function doRespawn() {
    run.hearts--;
    run.combo = 0; run.mult = 1;
    if (run.hearts <= 0) { die('YOU FELL OFF THE ROOF!'); return; }
    // back to the start of the last roof you stood on
    let spot = null;
    const seg = run.safe ? run.safe.seg : null;
    if (seg && SR.Level.segs.includes(seg)) spot = seg.respawns[0];
    if (!spot) { const s = SR.Level.segAt(P.pos.z) || SR.Level.segs[0]; spot = s.respawns[0]; }
    SR.Player.respawn(spot.x, spot.y, spot.z);
    SR.HUD.big('TRY AGAIN!', run.hearts + (run.hearts === 1 ? ' HEART LEFT!' : ' HEARTS LEFT'), '#ffffff');
    S().hurt();
  }

  function die(reason) {
    run.reason = reason;
    state = 'dying'; deadT = 1.6;
    S().busted();
    SR.Audio.muffle(1);
    SR.Audio.stopLoops();
  }

  function gameOver() {
    state = 'over';
    SR.Input.setEnabled(false);
    SR.Input.unlock();
    SR.HUD.show(false);
    SR.Audio.setIntensity(0);
    SR.Audio.muffle(0);
    const aura = Math.floor(run.aura), dist = Math.floor(P.maxDist);
    const rec = aura > save.best;
    save.coins += run.coins;
    if (rec) save.best = aura;
    if (dist > save.bestDist) save.bestDist = dist;
    persist();
    $('oReason').textContent = run.reason;
    $('oAura').textContent = U.fmt(aura);
    $('oDist').textContent = dist + ' m';
    $('oCoins').textContent = U.fmt(run.coins);
    $('oStars').textContent = run.maxWanted ? '★'.repeat(run.maxWanted) : '-';
    $('oTricks').textContent = run.tricks;
    $('oTakedowns').textContent = run.takedowns;
    $('oRecord').classList.toggle('show', rec);
    if (rec) setTimeout(() => S().record(), 600);
    showScreen('sOver');
  }

  // ------------------------------------------------------------
  //  START / PAUSE
  // ------------------------------------------------------------
  function startRun() {
    SR.Audio.init(); SR.Audio.applyVolumes();
    SR.Audio.startMusic(); SR.Audio.setIntensity(1); SR.Audio.restartBeat(); SR.Audio.muffle(0);
    SR.FX.reset(); SR.Pickups.reset(); SR.FBI.reset(); SR.Level.reset(); SR.HUD.reset();
    const r0 = SR.Level.segs[0].respawns[0];
    SR.Player.reset(r0.x, r0.y, r0.z + 1);
    P.rockets = lvl('rockets');
    run = newRun();
    run.safe = { seg: SR.Level.segs[0] };
    SR.Env.setTime(0, true); SR.Mats.setNight(SR.Env.windowGlow);
    state = 'ready'; readyT = 1.4;
    SR.HUD.show(true);
    SR.HUD.big('READY?', SR.Level.tutorial ? 'GET TO THE END OF THE CITY... IF YOU CAN' : '', '#ffffff');
    showScreen(null);
    SR.Input.setEnabled(true);
    SR.Input.resetSteer(); SR.Auto.reset();
    applyControlMode();
    if (!SR.Input.isAuto()) SR.Input.lock();
    else SR.HUD.hint(SR.Input.touch ? 'Slide your finger LEFT and RIGHT to steer. Everything else is automatic!' : 'Move the mouse LEFT and RIGHT to steer. Everything else is automatic!', 6);
    S().countdown(false);
  }
  function pause() {
    if (state !== 'play' && state !== 'ready') return;
    state = 'pause';
    SR.Input.setEnabled(false);
    SR.Input.unlock();
    SR.Audio.muffle(1); SR.Audio.stopLoops();
    showScreen('sPause');
  }
  function resume() {
    showScreen(null);
    state = 'play';
    SR.Input.setEnabled(true); SR.Input.clear();
    if (!SR.Input.isAuto()) SR.Input.lock();
    SR.Audio.muffle(0);
  }
  function toMenu() {
    state = 'title';
    SR.Input.setEnabled(false); SR.Input.unlock();
    SR.HUD.show(false);
    SR.Audio.setIntensity(0); SR.Audio.muffle(0); SR.Audio.stopLoops();
    SR.FBI.reset(); SR.FX.reset();
    SR.Level.reset(); SR.Env.setTime(0, true); SR.Mats.setNight(SR.Env.windowGlow);
    refreshTitle();
    showScreen('sTitle');
  }

  // ------------------------------------------------------------
  //  EVERY FRAME
  // ------------------------------------------------------------
  function loop(now) {
    requestAnimationFrame(loop);
    let dt = (now - lastT) / 1000; lastT = now;
    if (state === 'play' && !window.__srTest) adaptResolution(dt);
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) dt = 0.001;
    time += dt;
    if (state === 'ready' || state === 'play' || state === 'dying') playFrame(dt);
    else menuFrame(dt);
    draw();
  }

  function menuFrame(dt) {
    if (state === 'title') {
      // slow movie camera over the rooftops
      const t = time * 0.08;
      camera.position.set(Math.sin(t) * 22 + 6, 68 + Math.sin(t * 1.7) * 4, 24 + Math.cos(t) * 10);
      camera.lookAt(0, 54, -70);
      camera.fov = 70; camera.updateProjectionMatrix();
    }
    SR.Env.follow(camera.position, time);
    SR.Level.update(camera.position.z - 10, time);
    SR.City.update(dt, camera.position, time, 0);
    SR.Pickups.update(dt, { pos: new THREE.Vector3(0, -999, 0), coinRadius: 0, magnet: false }, time, camera);
    SR.FX.update(dt, camera);
    const fx = SR.Post.fx;
    fx.speed = 0; fx.aberration = 0; fx.damage = 0; fx.sigma = state === 'title' ? 0 : fx.sigma; fx.flash = 0; fx.time = time; fx.slowmo = 0; fx.saturation = 1.12; fx.warmth = 0.2;
  }

  function playFrame(dt) {
    const inp = SR.Input.read(dt);
    if ((state === 'play' || state === 'ready') && (inp.pressed.has('pause') || (inp.pressed.has('unlock') && !SR.Input.touch && !SR.Input.isAuto()))) { pause(); return; }
    // AUTO PARKOUR: the runner does the moves, you steer
    const auto = SR.Input.isAuto();
    if (auto && state !== 'dying') SR.Auto.drive(P, inp, dt);
    if (inp.pressed.has('mute')) { const m = !SR.store.get('muted', false); SR.store.set('muted', m); SR.Audio.setMuted(m); SR.HUD.feed(m ? 'SOUND OFF' : 'SOUND ON'); }
    if (state === 'ready') {
      readyT -= dt;
      if (readyT <= 0) { state = 'play'; SR.HUD.big('GO!', '', '#ffd21a'); S().countdown(true); }
    }
    // bullet time (slow motion for a moment when the helicopter goes down)
    if (run.bulletTime > 0) { run.bulletTime -= dt; dt *= run.bulletTime > 0.25 ? 0.35 : 0.7; }
    const dying = state === 'dying';
    const sigmaOn = run.sigmaT > 0;
    const opts = { sigma: sigmaOn, slowmo: sigmaOn, frozen: state === 'ready' };
    const wdt = dying ? dt * 0.3 : dt;

    if (!dying) {
      SR.Player.update(dt, inp, opts);
      if (auto) {
        // the camera looks a little where you're going
        const hs = Math.hypot(P.vel.x, P.vel.z);
        const want = hs > 2 && P.mode !== 'wallrun' ? U.clamp(Math.atan2(-P.vel.x, -P.vel.z), -0.6, 0.6) * 0.4 : 0;
        P.camYaw = U.damp(P.camYaw || 0, want, 4, dt);
        P.pitch = U.damp(P.pitch, P.mode === 'zip' ? -0.12 : -0.07, 4, dt);
      } else P.camYaw = 0;
      handleEvents();
    } else {
      // getting caught: everything goes slow
      deadT -= dt;
      P.roll = U.damp(P.roll, 0.45, 2, dt); P.pitch = U.damp(P.pitch, -0.35, 2, dt);
      P.pos.addScaledVector(P.vel, wdt); P.vel.multiplyScalar(Math.exp(-3 * dt));
      if (deadT <= 0) { gameOver(); return; }
    }
    // remember the last roof you stood on
    if (P.grounded && P.ground && P.ground.roof) run.safe = { seg: P.ground.seg };

    // falling off the roof
    if (run.fallT > 0) {
      run.fallT -= dt;
      $('fade').style.opacity = U.clamp(1 - run.fallT / 0.75, 0, 1);
      if (run.fallT <= 0) { doRespawn(); $('fade').style.opacity = 0; }
    }

    // SIGMA MODE
    if (!dying && inp.pressed.has('sigma') && run.sigma >= 1 && run.sigmaT <= 0) {
      run.sigmaT = 7 + lvl('sigma') * 2; run.sigma = 0;
      S().sigmaOn(); P.fovKick = 14; P.shake = 0.5;
      SR.HUD.big('Σ SIGMA MODE Σ', 'UNSTOPPABLE · DOUBLE AURA', '#ffd21a');
    }
    if (run.sigmaT > 0) { run.sigmaT -= dt; if (run.sigmaT <= 0) { S().sigmaOff(); SR.HUD.feed('SIGMA MODE OVER'); } }

    // fire a rocket
    if (!dying && inp.pressed.has('fire') && state === 'play') {
      if (P.rockets > 0) {
        const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        const r = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const u = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
        const from = camera.position.clone().addScaledVector(f, 1.1).addScaledVector(r, 0.35).addScaledVector(u, -0.25);
        if (SR.FBI.fireRocket(camera, from, auto)) {
          P.rockets--; P.fireAnim = 1; P.shake = Math.max(P.shake, 0.3);
          S().rocketFire();
          for (let i = 0; i < 6; i++) SR.FX.trail(from.x, from.y, from.z, 1.2);
        }
      } else if (!SR.Input.touch) { /* no rockets: nothing happens */ }
    }

    // timers
    run.comboT -= dt; if (run.comboT <= 0 && run.combo) { run.combo = 0; run.mult = 1; }
    run.magnet -= dt; run.double -= dt; run.hurt = Math.max(0, run.hurt - dt * 1.4); run.flash = Math.max(0, run.flash - dt * 2);

    // AURA for distance
    if (P.maxDist > run.lastDist) { run.aura += (P.maxDist - run.lastDist) * (sigmaOn ? 2 : 1); run.lastDist = P.maxDist; }

    // wanted level
    let w = 0; for (let i = 1; i < WANTED_AT.length; i++) if (P.maxDist >= WANTED_AT[i]) w = i;
    if (w > run.wanted) {
      run.wanted = w; run.maxWanted = Math.max(run.maxWanted, w);
      S().wantedUp(w);
      SR.HUD.big('★'.repeat(w), WANTED_MSG[w], '#ff5a5a');
      const tip = (auto ? WANTED_TIP_AUTO : WANTED_TIP)[w];
      if (tip) SR.HUD.hint(SR.Input.touch ? tip.replace('SLIDE', 'Tap SLIDE') : tip, 5);
      if (w === 2) SR.FBI.heliTimer = 1.5;
    }
    SR.Audio.setIntensity(sigmaOn ? 3 : run.wanted >= 2 ? 2 : 1);

    // tutorial hints
    for (const s of SR.Level.segs) for (const h of s.hints) {
      if (!h.text || run.shown.has(h) || auto) continue;
      if (P.pos.z < h.z && P.pos.z > h.z - 25) { run.shown.add(h); SR.HUD.hint(touchText(h.text), 4); }
    }
    if (SR.Level.tutorial && P.maxDist > 430) { SR.store.set('tutorialDone', true); }

    // the world
    SR.FBI.update(wdt, P, state === 'play' || dying ? run.wanted : 0, time, opts);
    SR.Pickups.update(dt, { pos: P.pos, coinRadius: P.boost > 0 ? 1.9 : 1.45, magnet: run.magnet > 0 }, time, camera);
    SR.Level.update(P.pos.z, time);
    SR.City.update(dt, P.pos, time, run.wanted);
    const tod = window.__srTod !== undefined ? window.__srTod : U.clamp(P.maxDist / 2600, 0, 1);
    if (Math.abs(tod - SR.Env.time) > 0.008) { SR.Env.setTime(tod); SR.Mats.setNight(SR.Env.windowGlow); }

    // camera
    SR.Player.applyCamera(camera, time);
    SR.Env.follow(camera.position, time);
    SR.FX.update(wdt, camera);
    SR.Player.animArms(dt, time, camera.aspect);
    SR.Player.lightArms(SR.Env.sunDir, SR.Env.sunColor, SR.Env.hemi.color, SR.Env.hemi.groundColor, camera.quaternion);

    sounds(dt, dying);
    hud(dt);
    postFx(dt, dying);
  }

  function touchText(t) {
    if (!SR.Input.touch) return t;
    return t.replace('Press SPACE to JUMP', 'Tap JUMP').replace('Hold SHIFT (or C) to SLIDE', 'Tap SLIDE').replace('Steer with the MOUSE (or A / D)', 'Steer with your thumbs');
  }

  function handleEvents() {
    for (const e of P.events) {
      switch (e.name) {
        case 'step': S().step(e.data.surface, U.clamp(P.speed / 12, 0.4, 1.2)); break;
        case 'jump': S().jump(); if (e.data.slideJump) trick('SLIDE JUMP', 15); break;
        case 'doublejump': S().jump(); SR.FX.burst(P.pos.x, P.pos.y, P.pos.z, 0x5aff6a, 20); trick('DOUBLE JUMP', 10); break;
        case 'land': S().land(e.data.hard); if (e.data.hard) P.shake = Math.max(P.shake, 0.25); if (P.airT > 0.9) trick('BIG AIR', 20); break;
        case 'roll': S().roll(); S().land(true); P.shake = Math.max(P.shake, 0.3); trick('ROLL', 25); break;
        case 'vault': S().vault(); trick('VAULT', 10); break;
        case 'mantle': S().vault(); trick(e.data.h > 1.5 ? 'LEDGE GRAB' : 'CLIMB', 15); break;
        case 'wallrun': S().wallKick(); trick('WALL RUN', 25); break;
        case 'walljump': S().wallKick(); S().jump(); trick('WALL JUMP', 40); break;
        case 'slide': trick('SLIDE', 5); SR.FX.dust(P.pos.x, P.pos.y, P.pos.z, 5, 0.6); break;
        case 'zip': S().zipAttach(); trick('ZIPLINE', 30); break;
        case 'launch': S().launchPad(); trick('LAUNCH!', 30); P.fovKick = 16; P.shake = 0.35; SR.FX.burst(P.pos.x, P.pos.y + 0.3, P.pos.z, 0x3af0ff, 40); break;
        case 'glass': {
          const b = e.data;
          S().glass(); SR.FX.glass((b.x0 + b.x1) / 2, b.y0, (b.z0 + b.z1) / 2, b.x1 - b.x0, P.vel.x, P.vel.z);
          trick('SMASH!', 50); P.shake = Math.max(P.shake, 0.3); break;
        }
        case 'fell': fell(); break;
      }
    }
  }

  function sounds(dt, dying) {
    const A = SR.Audio;
    if (!A.ready) return;
    if (dying || state !== 'play' && state !== 'ready') { A.stopLoops(); return; }
    const sp = Math.hypot(P.vel.x, P.vel.y, P.vel.z);
    A.setLoop('wind', U.clamp((sp - 5) / 22, 0, 1) * 0.32, 300 + sp * 55);
    A.setLoop('scrape', P.mode === 'wallrun' ? 0.09 : 0, 2400);
    A.setLoop('slide', P.sliding && P.grounded ? 0.3 : 0, 700 + P.speed * 20);
    A.setLoop('zip', P.mode === 'zip' ? 0.08 : 0, 900 + P.speed * 60);
    const h = SR.FBI.heliInfo();
    if (h) {
      const d = h.pos.distanceTo(P.pos);
      A.setLoop('heli', U.clamp(26 / d, 0, 1) * 0.55, 380, SR.FBI.heliPan(P, camera));
    } else A.setLoop('heli', 0);
  }

  function hud(dt) {
    const H = SR.HUD;
    H.aura(run.aura); H.mult(run.mult); H.dist(P.maxDist); H.coins(run.coins);
    H.hearts(run.hearts, run.maxHearts); H.wanted(run.wanted); H.heli(SR.FBI.heliInfo());
    H.sigma(run.sigmaT > 0 ? run.sigmaT / (7 + lvl('sigma') * 2) : run.sigma, run.sigma >= 1, run.sigmaT > 0);
    const pw = [];
    if (P.boost > 0) pw.push({ type: 'speed', frac: P.boost / (6 + lvl('boost') * 2) });
    if (run.magnet > 0) pw.push({ type: 'magnet', frac: run.magnet / (10 + lvl('magnet') * 3.5) });
    if (run.shield > 0) pw.push({ type: 'shield', frac: 1 });
    if (P.superJump > 0) pw.push({ type: 'jump', frac: P.superJump / 12 });
    if (run.double > 0) pw.push({ type: 'double', frac: run.double / 15 });
    if (P.rockets > 0) pw.push({ type: 'rocket', frac: 1, n: P.rockets });
    H.powers(pw);
    H.warn(SR.FBI.incoming(P) > 0);
    if (P.rockets > 0) {
      const t = SR.FBI.lockTarget(camera, SR.Input.isAuto());
      if (t) {
        const v = t.clone().project(camera);
        if (v.z < 1) H.lock({ x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight }); else H.lock(null);
      } else H.lock(null);
    } else H.lock(null);
    H.hurt(run.hurt * 0.9);
    H.clickToPlay(state === 'play' && !SR.Input.locked && !SR.Input.touch && !SR.Input.isAuto());
    if (SR.Input.touch || SR.Input.isAuto()) H.touchButtons(P.rockets > 0, run.sigma >= 1 && run.sigmaT <= 0);
    H.update(dt);
  }

  function postFx(dt, dying) {
    const fx = SR.Post.fx;
    const sp = Math.hypot(P.vel.x, P.vel.z);
    fx.speed = U.damp(fx.speed, Math.min(0.8, U.clamp((sp - 14) / 10, 0, 1) * 0.7 + (P.boost > 0 ? 0.2 : 0) + (P.mode === 'zip' ? 0.25 : 0)), 6, dt);
    fx.aberration = U.damp(fx.aberration, (P.boost > 0 ? 0.35 : 0) + run.hurt * 2 + (run.sigmaT > 0 ? 0.4 : 0), 6, dt);
    fx.damage = run.hurt * 0.7;
    run.sigmaFx = U.damp(run.sigmaFx, run.sigmaT > 0 ? 1 : 0, 5, dt);
    fx.sigma = run.sigmaFx;
    fx.slowmo = dying || run.bulletTime > 0 ? 1 : 0;
    fx.saturation = dying ? U.damp(fx.saturation, 0.2, 2, dt) : 1.12;
    fx.flash = run.flash;
    fx.time = time;
    fx.warmth = U.lerp(0.25, 0, SR.Env.time);
  }

  function draw() {
    const showArms = state === 'play' || state === 'ready' || state === 'dying' || state === 'pause';
    SR.Post.render(() => {
      renderer.render(scene, camera);
      if (showArms) {
        renderer.clearDepth();
        renderer.render(SR.Player.armsScene, SR.Player.armsCam);
      }
    });
  }

  // ------------------------------------------------------------
  //  MENUS
  // ------------------------------------------------------------
  let backTo = 'sTitle';
  function showScreen(id) {
    for (const el of document.querySelectorAll('.screen')) el.classList.toggle('show', el.id === id);
    document.getElementById('touch').classList.toggle('on', !id);
  }
  function refreshTitle() {
    $('cBest').textContent = U.fmt(save.best);
    $('cBestDist').textContent = U.fmt(save.bestDist) + ' m';
    $('cCoins').textContent = U.fmt(save.coins);
  }
  function hookMenus() {
    const click = (id, f) => $(id).addEventListener('click', () => { SR.Audio.init(); S().click(); f(); });
    click('bPlay', startRun);
    click('bAgain', startRun);
    click('bShop', () => openShop('sTitle'));
    click('bOShop', () => openShop('sOver'));
    click('bHow', () => { backTo = 'sTitle'; showScreen('sHow'); });
    click('bSettings', () => openSettings('sTitle'));
    click('bPSettings', () => openSettings('sPause'));
    click('bResume', resume);
    click('bRestart', startRun);
    click('bQuit', toMenu);
    click('bOMenu', toMenu);
    for (const b of document.querySelectorAll('[data-back]')) b.addEventListener('click', () => { S().click(); if (backTo === 'sTitle') refreshTitle(); showScreen(backTo); });
    // start the music on the title screen as soon as the page is touched
    const wake = () => { SR.Audio.init(); SR.Audio.setMuted(SR.store.get('muted', false)); SR.Audio.setIntensity(state === 'title' ? 0 : SR.Audio.intensity); SR.Audio.startMusic(); };
    window.addEventListener('pointerdown', wake, { once: true });
    window.addEventListener('keydown', wake, { once: true });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        if (state === 'title' && $('sTitle').classList.contains('show')) { e.preventDefault(); SR.Audio.init(); startRun(); }
        else if (state === 'over') { e.preventDefault(); startRun(); }
        else if (state === 'pause' && e.code === 'Enter') { resume(); }
      }
      if ((e.code === 'Escape' || e.code === 'KeyP') && state === 'pause' && $('sPause').classList.contains('show') && e.code === 'KeyP') resume();
    });
    // shop tabs
    for (const b of document.querySelectorAll('.shopTabs button')) b.addEventListener('click', () => {
      S().click();
      for (const o of document.querySelectorAll('.shopTabs button')) o.classList.toggle('on', o === b);
      shopTab = b.dataset.tab; renderShop();
    });
    // settings
    const segBtns = (id, get, set) => {
      const el = $(id);
      const paint = () => { for (const b of el.children) b.classList.toggle('on', b.dataset.v === String(get())); };
      for (const b of el.children) b.addEventListener('click', () => { S().click(); set(b.dataset.v); SR.saveSettings(); paint(); });
      paint();
      return paint;
    };
    segBtns('setGfx', () => SR.settings.gfx, (v) => { if (v !== SR.settings.gfx) { SR.settings.gfx = v; SR.saveSettings(); location.reload(); } });
    segBtns('setAuto', () => (SR.settings.autoRun ? '1' : '0'), (v) => { SR.settings.autoRun = v === '1'; });
    segBtns('setInv', () => (SR.settings.invertY ? '1' : '0'), (v) => { SR.settings.invertY = v === '1'; });
    segBtns('setCtrl', () => SR.settings.controls || 'auto', (v) => { SR.settings.controls = v; SR.Input.resetSteer(); applyControlMode(); });
    paintTrack = segBtns('setTrack', () => SR.settings.track || 'edm', (v) => setTrack(v));
    click('bMusic', () => { const order = ['edm', 'phonk', 'off']; setTrack(order[(order.indexOf(SR.settings.track || 'edm') + 1) % 3]); });
    $('bMusic').textContent = '♪ MUSIC: ' + TRACKS[SR.settings.track || 'edm'];
    applyControlMode();
    const slider = (id, key, after) => {
      const el = $(id); el.value = SR.settings[key];
      el.addEventListener('input', () => { SR.settings[key] = parseFloat(el.value); SR.saveSettings(); if (after) after(); });
    };
    slider('setSens', 'sens'); slider('setFov', 'fov');
    slider('setMusic', 'music', () => SR.Audio.applyVolumes()); slider('setSfx', 'sfx', () => { SR.Audio.applyVolumes(); S().coin(); });
  }
  function openSettings(from) { backTo = from; showScreen('sSettings'); }
  function applyControlMode() {
    document.body.classList.toggle('automode', SR.Input.isAuto());
    $('howAuto').hidden = !SR.Input.isAuto(); $('howManual').hidden = SR.Input.isAuto();
  }
  const TRACKS = { edm: 'SKYLINE', phonk: 'SIGMA PHONK', off: 'OFF' };
  function setTrack(v) {
    SR.settings.track = v; SR.saveSettings();
    SR.Audio.setTrack(v);
    $('bMusic').textContent = '♪ MUSIC: ' + TRACKS[v];
    if (paintTrack) paintTrack();
  }
  let paintTrack = null;

  let shopTab = 'up';
  function openShop(from) { backTo = from; renderShop(); showScreen('sShop'); }
  function renderShop() {
    $('shopCoins').textContent = U.fmt(save.coins);
    const grid = $('shopGrid');
    grid.innerHTML = '';
    if (shopTab === 'up') {
      for (const u of UPGRADES) {
        const l = lvl(u.id), max = u.costs.length, cost = u.costs[l];
        const el = document.createElement('div'); el.className = 'item' + (l >= max ? ' owned' : '');
        el.innerHTML = `<div class="ic">${u.icon}</div><div class="nm">${u.name}</div><div class="ds">${u.desc}</div>
          <div class="lv">${'■'.repeat(l)}${'□'.repeat(max - l)}</div>`;
        const b = document.createElement('button');
        if (l >= max) { b.textContent = 'MAXED!'; b.disabled = true; }
        else { b.textContent = '🪙 ' + U.fmt(cost); b.disabled = save.coins < cost; }
        b.addEventListener('click', () => {
          if (save.coins < cost) { S().nope(); return; }
          save.coins -= cost; save.up[u.id] = l + 1; persist(); S().buy(); renderShop();
        });
        el.appendChild(b); grid.appendChild(el);
      }
    } else {
      for (const g of GLOVES) {
        const owned = save.gloves.includes(g.id), on = save.glove === g.id;
        const el = document.createElement('div'); el.className = 'item' + (on ? ' owned' : '');
        el.innerHTML = `<div class="swatch" style="background:${g.col}"></div><div class="nm">${g.name}</div><div class="ds">${owned ? (on ? 'Wearing them!' : 'You own these') : 'Cool gloves for your runner'}</div>`;
        const b = document.createElement('button');
        if (on) { b.textContent = 'WEARING'; b.disabled = true; }
        else if (owned) b.textContent = 'WEAR';
        else { b.textContent = '🪙 ' + U.fmt(g.cost); b.disabled = save.coins < g.cost; }
        b.addEventListener('click', () => {
          if (!owned) { if (save.coins < g.cost) { S().nope(); return; } save.coins -= g.cost; save.gloves.push(g.id); S().buy(); }
          else S().click();
          save.glove = g.id; SR.Player.setGloves(g.id); persist(); renderShop();
        });
        el.appendChild(b); grid.appendChild(el);
      }
    }
  }

  return { init };
})();

window.addEventListener('load', () => SR.Game.init());
