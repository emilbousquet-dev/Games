// ============================================================
//  DINO RAMPAGE — THE MAIN GAME (menus, levels, stars, saving)
// ============================================================
window.DR = window.DR || {};

DR.Game = (function () {
  const U = DR.U, Mo = DR.Models, City = DR.City, FX = DR.FX, A = DR.Audio, In = DR.Input, H = DR.HUD, Dn = DR.Dino, P = DR.People, Army = DR.Army;
  const D = Dn.D;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const AUTO = params.has('auto');
  const PI = Math.PI;

  let renderer, scene, clock, sun, hemi, menuCam;
  let state = 'loading';
  let levelIdx = 0, time = 0, winT = 0, mapT = 0, hadLock = false;
  const tipsShown = {};

  // ---------- saving (stars, best times, outfit) ----------
  const NL = City.LEVELS.length;
  let save = { stars: [], best: [], skin: 'green', hat: 'none', secrets: [] };
  try { const s = JSON.parse(localStorage.getItem('dr.save')); if (s) save = Object.assign(save, s); } catch (e) { /* no save yet */ }
  for (let i = 0; i < NL; i++) { save.stars[i] = save.stars[i] || 0; save.best[i] = save.best[i] || null; save.secrets[i] = !!save.secrets[i]; }
  // secret closet items: find the FBI bakery once for Robo Rex, in EVERY city for the Agent Hat
  const secretOpen = (it) => (it.secret === 'robo' ? save.secrets.some(Boolean) : it.secret === 'agent' ? save.secrets.every(Boolean) : true);
  function store() { try { localStorage.setItem('dr.save', JSON.stringify(save)); } catch (e) { /* ignore */ } }
  const totalStars = () => save.stars.reduce((a, b) => a + b, 0);
  const unlocked = (i) => i === 0 || save.stars[i - 1] > 0;

  // ============================================================
  //  SETUP
  // ============================================================
  function init() {
    renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: !DR.lowGfx, powerPreference: 'high-performance', preserveDrawingBuffer: AUTO });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DR.lowGfx ? 0.8 : 1.5));
    renderer.setSize(innerWidth, innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !DR.lowGfx;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    DR.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xcfeeff, 60, 300);
    hemi = new THREE.HemisphereLight(0xe8f4ff, 0x6a8a4a, 1.25);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff0d8, 2.3);
    sun.castShadow = !DR.lowGfx;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    scene.add(sun); scene.add(sun.target);
    City.init(scene); FX.init(scene); P.init(scene); Dn.init(scene); Army.init(scene);
    H.init(); In.init();
    menuCam = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 2000);
    clock = new THREE.Clock();
    wireUI();
    Dn.on.smash = (o) => P.smashed(o, D);
    Dn.on.grow = onGrow;
    Dn.on.win = onWin;
    Dn.on.secret = onSecret;
    Dn.on.dizzy = () => {
      H.center('DIZZY! 💫<small>The army got you! You shrank a little. Eat snacks to heal!</small>', 2.6);
      if (Army.active) Army.radio(Army.RADIO.dizzy);
    };
    window.addEventListener('resize', onResize);
    loadLevel(params.has('level') ? U.clamp(+params.get('level') - 1, 0, NL - 1) : 0);
    $('loading').style.display = 'none';
    showBest();
    if (AUTO) { startPlaying(); } else showScreen('title');
    loop();
  }
  function onResize() {
    renderer.setSize(innerWidth, innerHeight);
    Dn.resize(innerWidth / innerHeight);
    menuCam.aspect = innerWidth / innerHeight; menuCam.updateProjectionMatrix();
  }

  // ============================================================
  //  MENUS
  // ============================================================
  const SCREENS = ['title', 'how', 'levels', 'closet', 'intro', 'pause', 'win'];
  function showScreen(id) {
    for (const s of SCREENS) $(s).classList.toggle('show', s === id);
    H.show(id === null);
    $('mute').style.display = id === 'title' ? 'block' : 'none';
    if (id) state = id;
    if (id !== null) { In.unlock(); $('lockmsg').style.display = 'none'; }
  }
  function showBest() {
    const n = totalStars();
    $('best').textContent = n > 0 ? `⭐ You have ${n} star${n > 1 ? 's' : ''}! (out of ${NL * 3})` : '';
  }
  function wireUI() {
    const click = (id, f) => $(id).addEventListener('click', () => { A.init(); A.click(); f(); });
    document.querySelectorAll('.btn').forEach((b) => b.addEventListener('mouseenter', () => A.hover()));
    click('btn-play', () => { buildCards(); showScreen('levels'); A.startMusic(); });
    click('btn-how', () => showScreen('how'));
    click('btn-how-back', () => showScreen('title'));
    click('btn-levels-back', () => showScreen('title'));
    click('btn-closet', () => openCloset('title'));
    click('btn-closet2', () => openCloset('win'));
    click('btn-closet-done', () => closeCloset());
    $('btn-gfx').textContent = 'GRAPHICS: ' + (DR.lowGfx ? 'FAST' : 'PRETTY');
    click('btn-gfx', () => { try { localStorage.setItem('dr.gfx', DR.lowGfx ? 'high' : 'low'); } catch (e) { /* ignore */ } location.reload(); });
    click('btn-go', () => startPlaying());
    click('btn-resume', () => resume());
    click('btn-restart', () => { loadLevel(levelIdx); showIntro(); });
    click('btn-quit', () => quitToMenu());
    click('btn-next', () => { if (levelIdx < NL - 1) { loadLevel(levelIdx + 1); showIntro(); } else { buildCards(); showScreen('levels'); } });
    click('btn-again', () => { loadLevel(levelIdx); showIntro(); });
    click('btn-menu', () => quitToMenu());
    const toggleMute = () => { A.setMuted(!A.isMuted()); $('mute').textContent = A.isMuted() ? '🔇' : '🔊'; $('btn-mute2').textContent = 'SOUND: ' + (A.isMuted() ? 'OFF' : 'ON'); };
    click('mute', toggleMute);
    click('btn-mute2', toggleMute);
    In.onKey((code) => {
      if (code === 'KeyM') toggleMute();
      if (state === 'intro' && (code === 'Enter' || code === 'Space')) startPlaying();
      else if (state === 'pause' && (code === 'Escape' || code === 'KeyP')) resume();
    });
    $('game').addEventListener('click', () => {
      A.init();
      if (state === 'play' && !In.mouse.locked) In.lock($('game'));
    });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) { hadLock = true; $('lockmsg').style.display = 'none'; }
      else if (state === 'play' && hadLock) pause();
    });
  }

  // ---------- pick a city ----------
  function buildCards() {
    $('cards').innerHTML = City.LEVELS.map((L, i) => {
      const st = save.stars[i], b = save.best[i];
      return `<div class="card ${unlocked(i) ? '' : 'locked'}" data-i="${i}">
        <div class="emo">${L.emoji}</div><div class="nm">${L.name}</div><div class="ab">${L.about}</div>
        <div class="st">${'★'.repeat(st)}<span>${'★'.repeat(3 - st)}</span></div>
        <div class="bt">${b ? '⏱ best ' + U.timeText(b.time) + ' · ' + b.score.toLocaleString() + ' pts' : unlocked(i) ? 'Not played yet!' : 'Finish ' + City.LEVELS[i - 1].name + ' first'}</div></div>`;
    }).join('');
    $('cards').querySelectorAll('.card').forEach((c) => c.addEventListener('click', () => {
      const i = +c.dataset.i;
      if (!unlocked(i)) { A.locked(); return; }
      A.click();
      loadLevel(i);
      showIntro();
    }));
  }
  function showIntro() {
    const L = City.LEVELS[levelIdx];
    $('intro-emo').textContent = L.emoji;
    $('intro-name').textContent = L.name.toUpperCase();
    $('intro-about').innerHTML = L.about + '<br><span style="font-size:18px;color:#d8f0c8">Grow from a baby to a GIANT, then fill the RAMPAGE bar to win! ⭐⭐⭐ if you finish in under ' + U.timeText(L.par) + '</span>';
    showScreen('intro');
  }

  // ---------- the dino closet (skins & hats) ----------
  let closetFrom = 'title', closetYaw = 0;
  function openCloset(from) {
    closetFrom = from;
    if (from === 'win') { loadLevel(levelIdx); }
    closetYaw = D.yaw;
    buildCloset();
    showScreen('closet');
  }
  function closeCloset() {
    if (closetFrom === 'win') showIntro();
    else { showScreen('title'); showBest(); }
  }
  function buildCloset() {
    const n = totalStars();
    $('closet-stars').textContent = `⭐ ${n} star${n === 1 ? '' : 's'} — earn stars to unlock more!`;
    const HAT_ICONS = { none: '🚫', party: '🥳', shades: '😎', cowboy: '🤠', propeller: '🧢', chef: '👨‍🍳', flowers: '🌼', crown: '👑', agent: '🕵️' };
    const lockTxt = (it) => (it.secret ? (it.secret === 'robo' ? '🔍 Secret!' : '🔍 Secret ×' + NL) : `🔒 ${it.stars}⭐`);
    $('pick-skins').innerHTML = Mo.SKINS.map((s) => {
      const lock = n < s.stars || !secretOpen(s);
      if (s.secret && lock) return `<div class="pick locked" data-skin="${s.id}"><div class="sw" style="background:#333">?</div>???<div class="lk">${lockTxt(s)}</div></div>`;
      const bg = s.id === 'rainbow' ? 'conic-gradient(#ff4a4a,#ffe23a,#4ad84a,#3aa8ff,#8a5aff,#ff4a4a)' : s.base;
      return `<div class="pick ${save.skin === s.id ? 'on' : ''} ${lock ? 'locked' : ''}" data-skin="${s.id}"><div class="sw" style="background:${bg}"></div>${s.name}${lock ? `<div class="lk">${lockTxt(s)}</div>` : ''}</div>`;
    }).join('');
    $('pick-hats').innerHTML = Mo.HATS.map((h) => {
      const lock = n < h.stars || !secretOpen(h);
      if (h.secret && lock) return `<div class="pick locked" data-hat="${h.id}"><div class="ic">❓</div>???<div class="lk">${lockTxt(h)}</div></div>`;
      return `<div class="pick ${save.hat === h.id ? 'on' : ''} ${lock ? 'locked' : ''}" data-hat="${h.id}"><div class="ic">${HAT_ICONS[h.id]}</div>${h.name}${lock ? `<div class="lk">${lockTxt(h)}</div>` : ''}</div>`;
    }).join('');
    document.querySelectorAll('.pick').forEach((p) => p.addEventListener('click', () => {
      if (p.classList.contains('locked')) {
        A.locked();
        if (p.querySelector('.lk') && p.querySelector('.lk').textContent.includes('Secret')) $('closet-stars').textContent = '🤫 Psst... every city has a SECRET building. Smash it!';
        return;
      }
      if (p.dataset.skin) save.skin = p.dataset.skin;
      if (p.dataset.hat) save.hat = p.dataset.hat;
      store();
      A.init(); A.click();
      Dn.makeModel(save.skin, save.hat);
      P.setHat(save.hat);
      Dn.place();
      FX.sparkle(D.x, D.scale * 1.5, D.z, 0.5, 14, 0xffe070);
      buildCloset();
    }));
  }

  // ============================================================
  //  LEVELS
  // ============================================================
  function loadLevel(i) {
    levelIdx = i;
    const L = City.build(i);
    FX.clear(); P.clear(); H.clearLabels();
    Dn.reset(save.skin, save.hat);
    Army.setup(L);
    H.hideRadio();
    P.setHat(save.hat);
    scene.fog.color.set(L.fog);
    scene.background = new THREE.Color(L.fog);
    time = 0; winT = 0;
    for (const k in tipsShown) delete tipsShown[k];
    H.setLevel(L.emoji + ' ' + L.name);
    // extra growth for testing (?grow=300)
    if (params.has('grow')) Dn.addGrowth(+params.get('grow'));
  }
  function startPlaying() {
    showScreen(null);
    state = 'play';
    A.init(); A.startMusic();
    if (!AUTO) { In.lock($('game')); setTimeout(() => { if (state === 'play' && !In.mouse.locked) $('lockmsg').style.display = 'block'; }, 600); }
    H.hint(levelIdx === 0);
    clock.getDelta();
    H.center(City.LEVELS[levelIdx].name.toUpperCase() + '<small>Eat the sparkly snacks and smash small things to grow!</small>', 3);
  }
  function pause() {
    if (state !== 'play') return;
    showScreen('pause');
  }
  function resume() {
    showScreen(null);
    state = 'play';
    if (!AUTO) In.lock($('game'));
    clock.getDelta();
  }
  function quitToMenu() {
    loadLevel(levelIdx);
    showScreen('title');
    showBest();
  }

  const GROW_MSG = ['', '', 'Now you can smash <b>cars, trees and lamp posts</b> 🚗🌳', 'Now you can smash <b>HOUSES, buses and trucks</b> 🏠🚌', 'Now you can smash <b>SHOPS, apartments and water towers</b> 🏬', 'You are a <b>GIANT</b>! Smash the <b>SKYSCRAPERS</b> 🏙️ and fill the RAMPAGE bar to win!'];
  function onGrow(tier) {
    H.center('YOU GREW!<small>You are now a ' + H.SIZE_NAMES[tier - 1] + ' dino!</small>', 2.4, 'green');
    H.tip(GROW_MSG[tier], 5);
    H.flash('#c8ff9a', 0.35);
    P.scare(D.x, D.z, 30 + D.scale * 10, null);
    if (tier === 2) setTimeout(() => { if (state === 'play') H.tip('Try your <b>TAIL WHIP</b> (right click or Q) and the <b>BELLY FLOP</b> (jump with Space, then click)!', 5); }, 5500);
  }
  // THE EASTER EGG: you smashed the Totally Normal Bakery (the secret FBI base)!
  function onSecret(o) {
    const first = !save.secrets.some(Boolean);
    save.secrets[levelIdx] = true;
    store();
    D.power = 25; D.hp = 1; D.roar = 1;
    A.secret();
    FX.confetti(o.x, o.h, o.z, 120, 6 + D.scale);
    FX.sparkle(o.x, o.h, o.z, 2 + D.scale * 0.5, 30, 0xffd23a);
    H.flash('#fff6a0', 0.5);
    H.center('🥚 SECRET FOUND! 🥚<small>The FBI was hiding a GOLDEN EGG! 🌈 RAINBOW POWER!</small>', 4);
    H.tip('🌈 <b>RAINBOW POWER</b>: you run faster, smash things one size <b>BIGGER</b>, and nothing can hurt you!', 4.5);
    Army.radio(Army.RADIO.secret);
    let msg = '';
    if (first) msg = '🎉 You unlocked <b>ROBO REX</b> in the Dino Closet!';
    else if (save.secrets.every(Boolean)) msg = '🎉 You found the secret in EVERY city! The <b>FBI AGENT HAT</b> is in the Dino Closet!';
    else msg = `Secret bakeries found: <b>${save.secrets.filter(Boolean).length} of ${NL}</b>. Find them all for a special hat!`;
    setTimeout(() => { if (state === 'play') H.tip(msg, 7); }, 4500);
  }
  function onWin() {
    state = 'winning';
    winT = 0;
    A.win();
    H.center('GIANT RAMPAGE!<small>You smashed ' + City.LEVELS[levelIdx].name + '!</small>', 4);
    Dn.D.act = 'roar'; Dn.D.actT = 0; Dn.D.hit.clear(); Dn.D.hit.add('done');
    setTimeout(() => A.roar(D.scale), 300);
    In.unlock();
  }
  function showWin() {
    const L = City.LEVELS[levelIdx];
    const stars = time <= L.par ? 3 : time <= L.par * 1.5 ? 2 : 1;
    const before = totalStars();
    const old = save.stars[levelIdx];
    save.stars[levelIdx] = Math.max(old, stars);
    const b = save.best[levelIdx];
    save.best[levelIdx] = { time: b ? Math.min(b.time, time) : time, score: b ? Math.max(b.score, D.score) : D.score };
    store();
    const after = totalStars();
    $('win-sub').innerHTML = `You grew from a tiny baby into a GIANT in <b>${U.timeText(time)}</b>!`;
    const spans = $('win-stars').querySelectorAll('span');
    spans.forEach((s, i) => { s.className = ''; s.classList.toggle('off', i >= stars); });
    spans.forEach((s, i) => setTimeout(() => { s.classList.add('on'); if (i < stars) A.star(i); }, 500 + i * 450));
    const st = D.stats;
    $('win-stats').innerHTML = `
      <div>🏆 Score: <b>${D.score.toLocaleString()}</b></div><div>⏱ Time: <b>${U.timeText(time)}</b></div>
      <div>💥 Things smashed: <b>${st.smashed}</b></div><div>🍉 Snacks eaten: <b>${st.eaten}</b></div>
      <div>🚗 Cars squished: <b>${st.cars}</b></div><div>🏠 Houses smashed: <b>${st.houses}</b></div>
      <div>🏙️ Big towers: <b>${st.towers}</b></div><div>🔥 Best combo: <b>x${st.bestCombo}</b></div>
      ${st.army ? `<div>🚁 Army stuff smashed: <b>${st.army}</b></div><div></div>` : ''}`;
    const newItems = [...Mo.SKINS, ...Mo.HATS].filter((it) => !it.secret && it.stars > before && it.stars <= after).map((it) => it.name);
    let msg = newItems.length ? '🎉 NEW in the Dino Closet: ' + newItems.join(', ') + '!' : '';
    if (levelIdx < NL - 1 && old === 0) msg += (msg ? '<br>' : '') + '🗺️ New city unlocked: ' + City.LEVELS[levelIdx + 1].name + '!';
    if (stars < 3) msg += (msg ? '<br>' : '') + `<span style="color:#d8f0c8;font-weight:500">Finish in under ${U.timeText(stars === 1 ? L.par * 1.5 : L.par)} to get ${stars + 1} stars!</span>`;
    $('win-unlock').innerHTML = msg;
    $('btn-next').textContent = levelIdx < NL - 1 ? 'NEXT CITY →' : 'PICK A CITY';
    showScreen('win');
    showBest();
  }

  // ============================================================
  //  THE ROBOT PLAYER (for testing the game automatically: ?auto)
  // ============================================================
  const bot = { target: null, t: 0, stuck: 0, lastD: 1e9, ban: new Map(), wander: 0, wdir: 0, clock: 0 };
  function botInput(dt) {
    const inp = { move: 1, strafe: 0, camTurn: 0, camTilt: 0, run: true, jump: false, bite: false, tail: false, roar: false, pause: false, mx: 0, my: 0 };
    bot.t -= dt; bot.clock += dt;
    if (bot.wander > 0) { bot.wander -= dt; D.camYaw = bot.wdir; return inp; }
    if (!bot.target || !bot.target.alive || bot.t <= 0) {
      let best = null, bs = -1e9;
      for (const o of City.objects) {
        if (!o.alive || o.tier > D.tier || (bot.ban.get(o) || 0) > bot.clock) continue;
        const d = U.dist(o.x, o.z, D.x, D.z);
        const sc = (o.food ? 25 : 0) + (o.tier === D.tier ? 20 : o.tier * 3) - d / D.scale;
        if (sc > bs) { bs = sc; best = o; }
      }
      bot.target = best; bot.t = 2; bot.lastD = 1e9;
    }
    const o = bot.target;
    if (o) {
      const dx = o.x - D.x, dz = o.z - D.z, d = Math.hypot(dx, dz);
      D.camYaw = Math.atan2(-dx, -dz);
      if (d > bot.lastD - 0.05) bot.stuck += dt; else bot.stuck = Math.max(0, bot.stuck - dt);
      bot.lastD = Math.min(bot.lastD, d);
      if (bot.stuck > 1.2) {
        inp.jump = true; inp.tail = Math.random() < 0.5; bot.stuck = 0; bot.t = 0;
        bot.ban.set(o, bot.clock + 12); bot.target = null;
        bot.wander = 1 + Math.random(); bot.wdir = D.camYaw + PI + U.rand(-1.2, 1.2);
      }
      if (d < D.scale * 2 + 1) inp.bite = true;
    }
    if (D.roar >= 1) inp.roar = true;
    if (!D.onGround && Math.random() < 0.02) inp.bite = true;
    return inp;
  }

  // ============================================================
  //  THE GAME LOOP
  // ============================================================
  const NO_INPUT = { move: 0, strafe: 0, camTurn: 0, camTilt: 0, run: false, jump: false, bite: false, tail: false, roar: false, pause: false, mx: 0, my: 0 };
  function update(dt, t) {
    let inp = AUTO ? botInput(dt) : In.read();
    if (state === 'winning') inp = NO_INPUT;
    if (inp.pause && state === 'play') { pause(); return; }
    if (inp.mx || inp.my) $('lockmsg').style.display = 'none';
    Dn.update(dt, inp);
    Dn.updateCamera(dt, inp);
    const cam = Dn.camera;
    City.update(dt, t, D, cam.position, cam.far);
    P.update(dt, t, D, City.info, true);
    Army.update(dt, t, D);
    FX.update(dt);
    if (state === 'play') time += dt;
    // HUD
    H.setTime(time);
    H.setGrowth(D.tier, Dn.progress(), D.tier === 5);
    H.setScore(D.score);
    H.setRoar(D.roar, D.roar >= 1);
    H.setHP(D.hp, Army.active || D.hp < 0.99);
    H.setPower(D.power);
    mapT -= dt;
    if (mapT <= 0) { mapT = 0.15; H.drawMap(City, D, Army.units); }
    H.update(dt, cam);
    A.setIntensity((D.tier - 1) / 4);
    // helpful tips
    if (state === 'play') {
      if (!tipsShown.start && time > 3.5) { tipsShown.start = 1; H.tip('Walk into small things to <b>SMASH</b> them! Eat the <b>sparkly snacks</b> 🍉🍩 to grow fast. The pink dots on the map are snacks!', 6); }
      if (!tipsShown.bakery && D.tier >= 2) {
        const b = City.objects.find((o) => o.kind === 'fbibase' && o.alive);
        if (b && U.dist(b.x, b.z, D.x, D.z) < 40 + D.scale * 6) { tipsShown.bakery = 1; H.tip('Hmm... why does that <b>bakery</b> have so many antennas? 🤔📡', 5); }
      }
      if (!tipsShown.roar && D.roar >= 1) { tipsShown.roar = 1; H.tip('Your <b>SUPER ROAR</b> is ready! Press <b>R</b>!', 4); }
      if (time > 25) H.hint(false);
    }
    // the winning celebration
    if (state === 'winning') {
      winT += dt;
      if (Math.random() < dt * 6) FX.confetti(D.x + U.rand(-1, 1) * D.scale * 3, D.scale * 3, D.z + U.rand(-1, 1) * D.scale * 3, 40, D.scale * 1.2);
      if (winT > 4.5) showWin();
    }
    followLights(D.x, D.z, D.scale);
  }
  function followLights(x, z, s) {
    const L = City.level;
    const size = 18 + s * 9;
    sun.position.set(x + size * 1.2, size * 3, z + size * 0.8);
    sun.target.position.set(x, 0, z);
    const c = sun.shadow.camera;
    if (c.right !== size) { c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.near = 1; c.far = size * 8; c.updateProjectionMatrix(); }
    scene.fog.near = 50 + s * 30;
    scene.fog.far = 240 + s * 110;
    if (L) scene.fog.color.set(L.fog);
  }

  let menuT = 0;
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    if (state === 'play' || state === 'winning') {
      update(dt, t);
      renderer.render(scene, Dn.camera);
      return;
    }
    if (state === 'pause' || state === 'win') { renderer.render(scene, Dn.camera); return; }
    // menus: the baby dino hangs out in the park while the camera flies around
    menuT += dt;
    if (state === 'closet') {
      // the camera stands still and the dino turns around slowly (like a fashion show!)
      const a = closetYaw, dx = Math.sin(a), dz = Math.cos(a);
      const want = new THREE.Vector3(D.x + dx * 4.6, 1.35, D.z + dz * 4.6);
      menuCam.position.lerp(want, Math.min(1, dt * 4));
      menuCam.lookAt(D.x + dz * 1.5, 0.95, D.z - dx * 1.5);
      D.yaw += dt * 0.5;
    } else {
      const a = menuT * 0.07;
      menuCam.position.set(D.x + Math.sin(a) * 8, 2.6 + Math.sin(menuT * 0.2) * 0.5, D.z + Math.cos(a) * 8);
      menuCam.lookAt(D.x, 1.3, D.z);
      // the dino sometimes does a little roar
      if (Math.floor(menuT / 6) !== Math.floor((menuT - dt) / 6) && !D.act) { D.act = 'roar'; D.actT = 0; D.hit.clear(); D.hit.add('done'); }
    }
    if (D.act) { D.actT += dt; if (D.actT > 1.6) D.act = null; }
    Dn.place(dt);
    City.update(dt, t, D, menuCam.position, menuCam.far);
    P.update(dt, t, D, City.info, true);
    FX.update(dt);
    followLights(D.x, D.z, 1);
    renderer.render(scene, menuCam);
  }

  window.addEventListener('load', init);
  return {
    debug: {
      get state() { return state; }, D, City, P, FX, save,
      get time() { return time; },
      // run the game fast without drawing (for automatic tests)
      simulate(seconds, step = 0.05) {
        let t = clock.elapsedTime;
        for (let i = 0; i < seconds / step && (state === 'play' || state === 'winning'); i++) { t += step; update(step, t); }
        return { state, time, tier: D.tier, growth: D.growth, score: D.score, rampage: D.rampage, smashed: D.stats.smashed, need: D.need, rampNeed: D.rampNeed };
      },
      loadLevel, startPlaying,
    },
  };
})();
