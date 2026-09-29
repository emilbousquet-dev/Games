// ============================================================
//  MONSTER HOTEL — THE MAIN GAME (nights, rules, menus)
// ============================================================
window.MH = window.MH || {};

MH.Game = (function () {
  const U = MH.U, W = MH.World, Mo = MH.Models, A = MH.Audio, In = MH.Input, P = MH.Player, Gs = MH.Guests, H = MH.HUD, T = MH.Tex;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const AUTO = params.has('auto');

  let renderer, scene, clock, titleCam;
  let state = 'loading';
  const S = {
    night: 1, rating: 3, time: 0, hours: 0, nightP: MH.night(1), boss: 'vampire',
    timers: {}, frozenT: 0, stats: null, lastHour: 0, hadLock: false, cleanT: 0, target: null,
    tips: {}, chatCd: {}, over: false, bestNight: 0,
  };
  const COLORS = { vampire: '#ff8a9a', werewolf: '#e0b080', mummy: '#f0e0b0', ghost: '#a0fff0', frankie: '#a8e890', blob: '#9aff6a', human: '#ffb080' };
  const KIND_NAME = { vampire: 'Vampire', werewolf: 'Werewolf', mummy: 'Mummy', ghost: 'Ghost', frankie: 'Monster', blob: 'Blob' };

  // ============================================================
  //  SETUP
  // ============================================================
  function init() {
    const canvas = $('game');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !MH.lowGfx, powerPreference: 'high-performance', preserveDrawingBuffer: AUTO });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MH.lowGfx ? 0.85 : 1.5));
    renderer.setSize(innerWidth, innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    MH.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0510);
    scene.fog = new THREE.FogExp2(0x140a1c, 0.016);
    buildEnvironment();
    W.build(scene);
    Gs.init(scene);
    H.init();
    In.init();
    titleCam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.05, 150);
    clock = new THREE.Clock();
    wireUI();
    hookEvents();
    window.addEventListener('resize', onResize);
    W.setRating(S.rating);
    try { S.bestNight = +localStorage.getItem('mh.bestNight') || 0; } catch (e) { S.bestNight = 0; }
    showBest();
    buildTitleActors();
    $('loading').style.display = 'none';
    if (AUTO) autoStart(); else showScreen('title');
    loop();
  }

  // soft light that bounces around (makes shiny things look shiny)
  function buildEnvironment() {
    const env = new THREE.Scene();
    const room = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 20), new THREE.MeshBasicMaterial({ color: 0x2a1a36, side: THREE.BackSide }));
    env.add(room);
    const panel = (color, mult, pos, scale) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(mult), side: THREE.DoubleSide }));
      m.position.set(...pos); m.scale.set(...scale); m.lookAt(0, 0, 0);
      env.add(m);
    };
    panel(0xffb070, 6, [0, 4.8, 0], [6, 6, 1]);
    panel(0xff8a40, 3, [-9.8, 0, 0], [4, 3, 1]);
    panel(0x8a7aff, 3, [9.8, 1, 3], [3, 5, 1]);
    panel(0x6aff8a, 1.5, [0, 0, 9.8], [4, 2, 1]);
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0.04).texture;
    pm.dispose();
  }

  function onResize() {
    renderer.setSize(innerWidth, innerHeight);
    P.resize(innerWidth / innerHeight);
    titleCam.aspect = innerWidth / innerHeight; titleCam.updateProjectionMatrix();
  }

  // ============================================================
  //  MENUS
  // ============================================================
  function showScreen(id) {
    for (const s of ['title', 'how', 'select', 'intro', 'pause', 'summary', 'over']) $(s).classList.toggle('show', s === id);
    H.show(id === null);
    $('mute').style.display = id === 'title' ? 'block' : 'none';
    if (id) { state = id === 'how' ? 'title' : id; }
    if (id !== null) In.unlock();
  }
  function showBest() { $('best').textContent = S.bestNight > 0 ? `Your best: survived ${S.bestNight} night${S.bestNight > 1 ? 's' : ''}!` : ''; }
  function wireUI() {
    const click = (id, f) => $(id).addEventListener('click', () => { A.init(); A.click(); f(); });
    document.querySelectorAll('.btn, .arrow').forEach((b) => b.addEventListener('mouseenter', () => A.hover()));
    click('btn-play', () => { showScreen('select'); selIndex = 0; updateSelect(); A.startMusic(); });
    click('btn-how', () => showScreen('how'));
    click('btn-how-back', () => showScreen('title'));
    $('btn-gfx').textContent = 'GRAPHICS: ' + (MH.lowGfx ? 'FAST' : 'PRETTY');
    click('btn-gfx', () => { try { localStorage.setItem('mh.gfx', MH.lowGfx ? 'high' : 'low'); } catch (e) { /* ignore */ } location.reload(); });
    click('sel-prev', () => { selIndex = (selIndex + MH.BOSSES.length - 1) % MH.BOSSES.length; updateSelect(); });
    click('sel-next', () => { selIndex = (selIndex + 1) % MH.BOSSES.length; updateSelect(); });
    click('btn-choose', () => { S.boss = MH.BOSSES[selIndex].id; newGame(); });
    click('btn-start', () => beginNight());
    click('btn-resume', () => resume());
    click('btn-quit', () => quitToMenu());
    click('btn-next', () => { S.night++; prepareNight(); });
    click('btn-again', () => newGame());
    click('btn-menu', () => quitToMenu());
    const toggleMute = () => { A.setMuted(!A.isMuted()); $('mute').textContent = A.isMuted() ? '🔇' : '🔊'; $('btn-mute2').textContent = 'SOUND: ' + (A.isMuted() ? 'OFF' : 'ON'); };
    click('mute', toggleMute);
    click('btn-mute2', toggleMute);
    In.onKey((code) => {
      if (code === 'KeyM') toggleMute();
      if (state === 'select') {
        if (code === 'ArrowLeft' || code === 'KeyA' || code === 'KeyQ') { selIndex = (selIndex + MH.BOSSES.length - 1) % MH.BOSSES.length; updateSelect(); A.click(); }
        if (code === 'ArrowRight' || code === 'KeyD') { selIndex = (selIndex + 1) % MH.BOSSES.length; updateSelect(); A.click(); }
        if (code === 'Enter' || code === 'Space') { S.boss = MH.BOSSES[selIndex].id; newGame(); }
      } else if (state === 'intro' && (code === 'Enter' || code === 'Space')) beginNight();
      else if (state === 'pause' && (code === 'Escape' || code === 'KeyP')) resume();
    });
    $('game').addEventListener('click', () => {
      A.init();
      if (state === 'play' && !In.mouse.locked) In.lock($('game'));
    });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) S.hadLock = true;
      else if (state === 'play' && S.hadLock) pause();
    });
  }

  // ---------- title screen: a few monsters hanging out in the lobby ----------
  let titleActors = [];
  function buildTitleActors() {
    const L = W.lobby;
    const spots = [
      ['vampire', 0, L.cx + 1.2, L.cz + 2.5, 0.4], ['werewolf', 1, W.fireplace.x + 1.8, W.fireplace.z - 1.5, -2.3], ['ghost', 0, L.cx - 2.5, L.cz + 3.5, 0.9],
      ['mummy', 1, L.cx + 4.5, L.cz + 4, -0.6], ['blob', 1, L.cx - 0.8, L.cz + 5.2, 0.2], ['frankie', 0, L.cx + 6.5, L.cz - 1, -1.2],
    ];
    for (const [k, st, x, z, yaw] of spots) {
      const m = Mo.monster(k, st);
      m.position.set(x, 0, z); m.rotation.y = yaw;
      scene.add(m);
      titleActors.push({ m, mood: U.rand(0.5, 1), talkT: U.rand(0, 5) });
    }
  }
  function clearTitleActors() { titleActors.forEach((a) => scene.remove(a.m)); titleActors = []; }

  // ---------- choose your boss ----------
  let selIndex = 0, selModels = [];
  function selectSpot(i) { const L = W.lobby; return { x: L.cx - 3.3 + i * 2.2, z: L.cz + 1.5 }; }
  function updateSelect() {
    if (!selModels.length) {
      clearTitleActors();
      MH.BOSSES.forEach((b, i) => {
        const m = Mo.monster(b.id, 0);
        const s = selectSpot(i);
        m.position.set(s.x, 0, s.z); m.rotation.y = 0;
        scene.add(m);
        selModels.push(m);
      });
    }
    const b = MH.BOSSES[selIndex];
    $('sel-name').textContent = b.name;
    $('sel-kind').textContent = 'the ' + b.short;
    $('sel-power').textContent = '⚡ ' + b.power;
    $('sel-about').textContent = b.about;
    $('sel-dots').innerHTML = MH.BOSSES.map((_, i) => `<i class="${i === selIndex ? 'on' : ''}"></i>`).join('');
    if (selModels[selIndex]) A.babble(b.id, 0.8, 0, 0.12);
  }
  function clearSelect() { selModels.forEach((m) => scene.remove(m)); selModels = []; }

  // ============================================================
  //  STARTING, PAUSING, ENDING
  // ============================================================
  function newGame() {
    clearSelect(); clearTitleActors();
    S.night = +(params.get('night') || 1);
    S.rating = 3;
    S.over = false;
    W.setRating(S.rating);
    H.setRating(S.rating);
    P.create(S.boss, scene, innerWidth / innerHeight);
    prepareNight();
  }
  function prepareNight() {
    S.nightP = MH.night(S.night);
    const news = MH.NEWS[S.night] || ['Night ' + S.night + ': busier than ever!', 'More guests, less patience. You can do it, Boss!'];
    $('intro-night').textContent = 'NIGHT ' + S.night;
    $('intro-news').textContent = news[0];
    $('intro-news2').textContent = news[1];
    resetHotel();
    showScreen('intro');
    state = 'intro';
  }
  function resetHotel() {
    Gs.clear();
    for (const R of W.rooms) {
      R.messes.forEach((m) => scene.remove(m.obj));
      R.messes = []; R.status = 'free'; R.guest = null;
      if (R.window) { R.window.target = 0; R.window.open = 0; }
      W.setRoomLamp(R);
    }
    P.x = W.playerStart.x; P.z = W.playerStart.z; P.yaw = Math.PI; P.pitch = -0.05;
    P.dropAll();
    P.powerCd = 0; P.powerT = 0;
    S.time = 0; S.hours = 0; S.lastHour = 0; S.frozenT = 0;
    const n = S.nightP;
    S.timers = {
      arrive: 2.5,
      human: n.humans ? n.humans * U.rand(0.35, 0.6) : Infinity,
      storm: n.storms ? n.storms * U.rand(0.5, 0.9) : Infinity,
      mess: n.messes * U.rand(0.6, 1),
      lightning: U.rand(6, 14),
    };
    S.stats = { checkedIn: 0, served: 0, humans: 0, reviews: [], cleaned: 0, ratingStart: S.rating };
    S.firstKindThisNight = Object.keys(MH.MONSTERS).find((k) => MH.MONSTERS[k].firstNight === S.night);
    H.setClock(S.night, 0);
    H.setPower(P.info.power, 0, 1, false);
  }
  function beginNight() {
    showScreen(null);
    state = 'play';
    A.init(); A.startMusic(); A.nightStart();
    H.center('NIGHT ' + S.night + '<small>The doors are open!</small>', 2.5);
    if (!AUTO) In.lock($('game'));
    if (S.night === 1) tip('start', 'Walk with <b>W A S D</b> and look with the <b>mouse</b>.<br>The first guest is coming through the big front doors!');
    else if (MH.NEWS[S.night]) { const news = MH.NEWS[S.night][1]; setTimeout(() => H.tip(news, 8), 2600); }
  }
  function pause() {
    if (state !== 'play') return;
    showScreen('pause');
    state = 'pause';
    A.setWind(0);
  }
  function resume() {
    showScreen(null);
    state = 'play';
    if (!AUTO) In.lock($('game'));
    clock.getDelta();
  }
  function quitToMenu() {
    Gs.clear();
    resetHotel();
    S.rating = 3; W.setRating(3);
    showScreen('title');
    buildTitleActors();
    A.stopMusic(); A.setWind(0);
  }
  function endNight() {
    state = 'summary';
    Gs.reviewAll();
    A.rooster();
    A.setWind(0);
    const st = S.stats;
    const avg = st.reviews.length ? st.reviews.reduce((a, r) => a + r.stars, 0) / st.reviews.length : 0;
    $('sum-title').textContent = '☀ SUNRISE! ☀';
    $('sum-sub').textContent = `You survived Night ${S.night}! All the monsters are going to sleep...`;
    const r = S.rating;
    $('sum-stars').innerHTML = '★'.repeat(Math.round(r)) + '<span>' + '★'.repeat(5 - Math.round(r)) + '</span>';
    const diff = r - st.ratingStart;
    $('sum-stats').innerHTML = `
      <div>🛎️ Guests checked in: <b>${st.checkedIn}</b></div><div>🍹 Wishes granted: <b>${st.served}</b></div>
      <div>⭐ Average review: <b>${avg ? avg.toFixed(1) : '-'}</b></div><div>🧹 Messes cleaned: <b>${st.cleaned}</b></div>
      <div>😱 Humans scared away: <b>${st.humans}</b></div><div>🏨 Hotel rating: <b>${r.toFixed(1)}</b> <span style="color:${diff >= 0 ? '#8aff7a' : '#ff7a7a'}">(${diff >= 0 ? '+' : ''}${diff.toFixed(1)})</span></div>`;
    const best = st.reviews.slice().sort((a, b) => b.stars - a.stars)[0];
    $('sum-quote').textContent = best ? `"${best.text}" — ${best.name}` : '';
    S.bestNight = Math.max(S.bestNight, S.night);
    try { localStorage.setItem('mh.bestNight', S.bestNight); } catch (e) { /* ignore */ }
    showBest();
    setTimeout(() => { if (state === 'summary') { showScreen('summary'); state = 'summary'; } }, 1800);
    H.center('☀ SUNRISE! ☀<small>Night ' + S.night + ' complete!</small>', 2, 'green');
  }
  function gameOver() {
    if (S.over) return;
    S.over = true;
    state = 'over';
    A.sadTrombone();
    A.setWind(0);
    H.center('HOTEL CLOSED!', 2, 'red');
    const st = S.stats;
    $('over-stars').innerHTML = '★'.repeat(Math.max(0, Math.round(S.rating))) + '<span>' + '★'.repeat(5 - Math.max(0, Math.round(S.rating))) + '</span>';
    $('over-stats').innerHTML = `<div>🌙 You made it to: <b>Night ${S.night}</b></div><div>🛎️ Guests tonight: <b>${st.checkedIn}</b></div>
      <div>🍹 Wishes granted: <b>${st.served}</b></div><div>🏆 Best ever: <b>${S.bestNight} night${S.bestNight === 1 ? '' : 's'}</b></div>`;
    setTimeout(() => showScreen('over'), 2200);
  }

  // ---------- test mode (used to check the game automatically) ----------
  function autoStart() {
    S.boss = params.get('boss') || 'vampire';
    clearTitleActors();
    newGame();
    beginNight();
    const cam = params.get('cam');
    if (cam) { const [x, z, yaw, pitch] = cam.split(',').map(Number); P.x = x; P.z = z; P.yaw = yaw; P.pitch = pitch || 0; }
  }

  // ============================================================
  //  EVENTS FROM THE GUESTS & THE HOTEL
  // ============================================================
  function hookEvents() {
    Gs.on.say = (g, text) => {
      const d = P.camera ? U.dist(g.x, g.z, P.x, P.z) : 0;
      if (d < 13 || g.request || g.state === 'queue' || g.happy <= 0) H.say(g.name, text, COLORS[g.kind]);
    };
    Gs.on.arrived = (g) => {
      A.bell();
      tip('arrive', `<b>${g.name}</b> is waiting at the <b>front desk</b>!<br>Walk up, look at them and press <b>E</b> to check them in.`);
    };
    Gs.on.request = (g) => {
      if (g.request.type === 'item') tip('request', `<b>${g.name}</b> wants a <b>${MH.ITEMS[g.request.item].name}</b>!<br>Get it in the <b>${MH.ITEMS[g.request.item].where}</b>${MH.ITEMS[g.request.item].where === 'Kitchen' ? ' (end of the hallway, on the left)' : ' room (end of the hallway, on the right)'} and bring it to them.`);
      else tip('pet', `<b>${g.name}</b> wants a belly rub! Walk up and press <b>E</b>. 🐺`);
    };
    Gs.on.requestDone = () => {};
    Gs.on.review = (g, stars) => {
      let text = U.pick(MH.REVIEWS[stars]);
      if (stars <= 2 && g.scaredT > 0) text = U.pick(['I SAW A HUMAN!!!', 'There was a HUMAN in the hallway!', 'A human took my picture! HORRIBLE!']);
      H.review(g.name, KIND_NAME[g.kind] || g.kind, stars, text);
      A.review(stars);
      const before = S.rating;
      S.rating = U.clamp(S.rating + (stars - S.rating) * 0.1, 0, 5);
      H.setRating(S.rating);
      H.pulseRating(S.rating >= before);
      W.setRating(S.rating);
      S.stats.reviews.push({ stars, text, name: g.name });
      if (S.rating < 2.2 && !S.tips.low) { tip('low', '⚠️ Careful, Boss! Your rating is getting <b>low</b>.<br>If it drops below <b>1.5 stars</b> the hotel gets closed!'); }
      if (S.rating < 1.5) setTimeout(gameOver, 1200);
    };
    Gs.on.roomDirty = (R, n) => {
      for (let i = 0; i < n; i++) addMess(R);
      W.setRoomLamp(R);
      tip('dirty', `Room ${R.num} is <b>dirty</b> now (orange lamp).<br>Go there, look at the mess and <b>HOLD E</b> to clean it for the next guest.`);
    };
    Gs.on.scared = (g, h) => { if (Math.random() < 0.5) A.scream(); };
    Gs.on.flash = () => { if (U.dist(P.x, P.z, Gs.humans[0] ? Gs.humans[0].x : 0, Gs.humans[0] ? Gs.humans[0].z : 0) < 8) H.flash('white', 0.4); };
    W.onDoor = (d) => { if (U.dist(d.x, d.z, P.x, P.z) < 9) A.creak(); };
    W.onFrontDoor = () => { if (state === 'play') A.bigDoor(); };
  }
  function tip(key, html) {
    if (S.tips[key]) return;
    S.tips[key] = true;
    H.tip(html, 9);
  }

  // ---------- messes ----------
  function addMess(R) {
    if (R.messes.length >= 3 || !R.messSpots.length) return;
    const free = R.messSpots.filter((s) => !R.messes.some((m) => U.dist(m.x, m.z, s.x, s.z) < 0.8));
    if (!free.length) return;
    const s = U.pick(free);
    const obj = Mo.mess(U.randInt(0, 2));
    const x = s.x + U.rand(-0.3, 0.3), z = s.z + U.rand(-0.3, 0.3);
    obj.position.set(x, 0, z); obj.rotation.y = U.rand(0, 6.28);
    scene.add(obj);
    R.messes.push({ obj, x, z, room: R });
  }
  function removeMess(m) {
    const R = m.room;
    scene.remove(m.obj);
    R.messes.splice(R.messes.indexOf(m), 1);
    S.stats.cleaned++;
    A.sparkle();
    if (R.guest) R.guest.happy = Math.min(100, R.guest.happy + 6);
    if (!R.messes.length && R.status === 'dirty') { R.status = 'free'; W.setRoomLamp(R); H.center('ROOM ' + R.num + ' IS CLEAN!', 1.4, 'green'); }
  }

  // ============================================================
  //  THE NIGHT (runs every frame while playing)
  // ============================================================
  function spawnGuest() {
    const kinds = Object.keys(MH.MONSTERS).filter((k) => MH.MONSTERS[k].firstNight <= S.night);
    let kind = U.pick(kinds);
    if (S.firstKindThisNight && Math.random() < 0.4) kind = S.firstKindThisNight;
    if (S.night === 1 && S.stats.checkedIn === 0 && !Gs.list.length) kind = S.boss === 'vampire' ? 'werewolf' : 'vampire';
    Gs.spawn(kind, { rating: S.rating, night: S.nightP });
  }
  function stormWindow() {
    const rooms = W.rooms.filter((R) => R.window && R.window.target === 0);
    if (!rooms.length) return;
    const occupied = rooms.filter((R) => R.guest);
    const R = U.pick(occupied.length && Math.random() < 0.8 ? occupied : rooms);
    R.window.target = 1;
    W.lightning(); A.thunder(0.3); A.windowBang();
    H.center('STORM!<small>A window blew open in Room ' + R.num + '!</small>', 2.2);
    tip('storm', `The storm blew the window open in <b>Room ${R.num}</b>! 🌧️<br>Go there, look at the window and press <b>E</b> to close it.`);
  }

  function update(dt, t) {
    const inp = In.read();
    if (inp.pause) { pause(); return; }
    const n = S.nightP;
    S.time += dt;
    S.hours = S.time / n.length * 10;
    if (Math.floor(S.hours) > S.lastHour) {
      S.lastHour = Math.floor(S.hours);
      if (S.lastHour === 4) { A.chime(3); H.center('MIDNIGHT!<small>The spookiest hour!</small>', 2); }
      else if (S.lastHour === 9) { H.center('5 AM<small>Almost sunrise! Hang in there!</small>', 2); A.chime(1); }
    }
    const frozen = S.frozenT > 0;
    S.frozenT = Math.max(0, S.frozenT - dt);
    H.setSand(frozen);
    // --- timers for things that happen ---
    const tm = S.timers;
    if (S.hours < 8) {
      tm.arrive -= dt;
      const waiting = Gs.list.filter((g) => g.state === 'queue' || g.state === 'arrive').length;
      if (tm.arrive <= 0 && waiting < 5 && Gs.list.length < W.rooms.length + 4) { spawnGuest(); tm.arrive = n.arriveEvery * U.rand(0.75, 1.25); }
    }
    if (S.hours < 9.3) {
      tm.human -= dt;
      const maxH = 1 + Math.floor((S.night - 4) / 3);
      if (tm.human <= 0) {
        tm.human = n.humans * U.rand(0.7, 1.3);
        if (Gs.humans.filter((h) => h.state === 'sneak').length < maxH) {
          Gs.spawnHuman();
          A.humanAlert();
          H.center('A HUMAN SNUCK IN!<small>Find it and scare it away!</small>', 2.4, 'red');
          tip('human', 'A <b>HUMAN</b> snuck into the hotel! 😱 The guests are TERRIFIED of humans.<br>Find it (red dot on the map), walk up and press <b>E</b> to scare it away!');
        }
      }
      tm.storm -= dt;
      if (tm.storm <= 0) { tm.storm = n.storms * U.rand(0.7, 1.3); stormWindow(); }
      tm.mess -= dt;
      if (tm.mess <= 0) {
        tm.mess = n.messes * U.rand(0.7, 1.3);
        const occ = W.rooms.filter((R) => R.guest && R.guest.state === 'inRoom');
        if (occ.length) { const R = U.pick(occ); addMess(R); tip('mess', `Uh oh, ${R.guest.name} made a <b>mess</b> in Room ${R.num}! 🤢<br>Messy rooms make guests grumpy. <b>HOLD E</b> on the mess to clean it.`); }
      }
    }
    tm.lightning -= dt;
    if (tm.lightning <= 0) { tm.lightning = U.rand(12, 30); W.lightning(); A.thunder(U.rand(0.4, 1.6)); }

    // --- you ---
    P.update(dt, inp, t, true);
    handlePower(inp);
    handleInteraction(inp, dt);
    if (inp.drop && P.dropAll()) H.say('You', 'Oops, dropped it!', '#ffe14a');

    // --- guests ---
    Gs.update(dt, t, { night: n, rating: S.rating, frozen, dawn: S.hours > 9.3, px: P.x, pz: P.z });

    // --- rooms ---
    for (const R of W.rooms) {
      if (R.status === 'dirty' && !R.messes.length && !R.guest) { R.status = 'free'; }
      if (R.status === 'occupied' && !R.guest) R.status = R.messes.length ? 'dirty' : 'free';
      W.setRoomLamp(R);
    }
    const anyOpen = W.windows.some((w) => w.target > 0 && w.room && U.dist(w.mid.x, w.mid.z, P.x, P.z) < 10);
    A.setWind(anyOpen ? 1 : 0);

    // --- the hotel ---
    const actors = Gs.list.map((g) => ({ x: g.x, z: g.z, guest: true })).concat(Gs.humans.map((h) => ({ x: h.x, z: h.z, guest: true })), [{ x: P.x, z: P.z }]);
    W.update(dt, t, { x: P.x, z: P.z, yaw: P.yaw }, actors);
    if (S.hours > 9) { const k = U.clamp(S.hours - 9, 0, 1); if (W.flashLight.intensity === 0) W.skyMat.color.setRGB(1 + k * 1.2, 1 + k * 0.5, 1 + k * 0.1); }

    // --- HUD ---
    updateHUD(t);
    if (S.hours >= 10) endNight();
  }

  // ---------- your boss power ----------
  function handlePower(inp) {
    const b = P.info;
    const active = P.powerT > 0 || S.frozenT > 0;
    H.setPower(b.power, P.powerCd, b.cooldown, active);
    if (!inp.power) return;
    if (P.powerCd > 0) { H.say('You', 'My power is still charging... (' + Math.ceil(P.powerCd) + 's)', '#ffe14a'); return; }
    P.powerCd = b.cooldown;
    if (S.boss === 'vampire') {
      P.powerT = 4; P.powerCd += 4;
      A.whoosh(); H.center('BAT FORM!', 1, 'green');
    } else if (S.boss === 'werewolf') {
      A.bigHowl(); P.shake = 1.2;
      let n = 0;
      for (const h of Gs.humans) if (Gs.shoo(h)) n++;
      S.stats.humans += n;
      H.center('AAAWOOOOO!<small>' + (n ? n + ' human' + (n > 1 ? 's' : '') + ' ran away!' : 'What a howl!') + '</small>', 1.6, 'green');
      Gs.cheer(P.x, P.z, n ? 8 : 3, 12);
    } else if (S.boss === 'mummy') {
      S.frozenT = 8; P.powerCd += 8;
      A.freeze(); H.center('SAND OF TIME!<small>Nobody gets grumpy for 8 seconds!</small>', 1.6, 'green');
    } else if (S.boss === 'frankie') {
      A.zap(); W.lightning(); H.flash('#c8f0ff', 0.5); P.shake = 0.8;
      let cleaned = 0;
      const R = W.rooms.find((q) => P.x > q.x0 - 0.5 && P.x < q.x1 + 0.5 && P.z > q.z0 - 0.5 && P.z < q.z1 + 0.5);
      for (const q of W.rooms) for (const m of q.messes.slice()) if ((q === R) || U.dist(m.x, m.z, P.x, P.z) < 5) { removeMess(m); cleaned++; }
      if (R && R.window && R.window.target > 0) { R.window.target = 0; cleaned++; }
      H.center('THUNDER ZAP!<small>' + (cleaned ? 'Sparkling clean!' : 'Nothing to clean here!') + '</small>', 1.4, 'green');
    }
  }

  // ---------- looking at things and pressing E ----------
  function findTarget() {
    const cam = P.camera.position, f = P.forward();
    let best = null, bestScore = 1e9;
    const consider = (kind, obj, x, y, z, range, minDot) => {
      const dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
      const dh = Math.hypot(dx, dz);
      if (dh > range) return;
      const d = Math.hypot(dx, dy, dz);
      const dot = d < 0.001 ? 1 : (dx * f.x + dy * f.y + dz * f.z) / d;
      if (dot < minDot && dh > 0.9) return;
      if (!W.canSee(cam.x, cam.z, x, z)) return;
      const score = (1 - dot) * 12 + dh * 0.12;
      if (score < bestScore) { bestScore = score; best = { kind, obj, x, z }; }
    };
    for (const g of Gs.list) if (g.state !== 'leave' && g.state !== 'storm') consider('guest', g, g.x, g.model.userData.height * 0.65, g.z, 2.7, 0.8);
    for (const h of Gs.humans) if (h.state === 'sneak') consider('human', h, h.x, 1.1, h.z, 3.0, 0.75);
    for (const st of W.stations) consider('station', st, st.x, st.y, st.z, 2.5, 0.84);
    for (const w of W.windows) if (w.target > 0) consider('window', w, w.mid.x - w.dx * 0.3, (w.hole.y0 + w.hole.y1) / 2, w.mid.z - w.dz * 0.3, 3.2, 0.75);
    for (const R of W.rooms) for (const m of R.messes) consider('mess', m, m.x, 0.15, m.z, 2.6, 0.78);
    return best;
  }
  const KEY = (k = 'E') => `<b class="key">${k}</b>`;
  function handleInteraction(inp, dt) {
    // one press = one action (no accidental double presses)
    if (inp.use && S.time - (S.lastUse || -1) < 0.3) inp.use = false;
    if (inp.use) S.lastUse = S.time;
    const tg = findTarget();
    S.target = tg;
    $('crosshair').classList.toggle('target', !!tg);
    P.scrub = 0;
    if (!tg) { S.cleanT = 0; H.setPrompt(null, 0); return; }
    const held = P.holding();
    if (tg.kind === 'guest') {
      S.cleanT = 0;
      const g = tg.obj;
      if (g.state === 'queue' || g.state === 'arrive') {
        H.setPrompt(`${KEY()} Check in <b>${g.name}</b>`, 0);
        if (inp.use) {
          const free = W.rooms.filter((R) => R.status === 'free' && !R.guest);
          if (free.length) {
            const R = free[0];
            Gs.checkIn(g, R);
            W.setRoomLamp(R);
            A.checkIn();
            S.stats.checkedIn++;
            P.reach = 1;
            H.center(`${g.name} → ROOM ${R.num}`, 1.4, 'green');
            tip('checkin', `Great! <b>${g.name}</b> is going to <b>Room ${R.num}</b>.<br>Watch the list on the right: it shows what every guest wants!`);
          } else {
            const dirty = W.rooms.filter((R) => R.status === 'dirty');
            A.wrong();
            H.say('You', dirty.length ? `No clean rooms! I need to clean Room ${dirty.map((R) => R.num).join(', ')} first!` : 'All rooms are full! They have to wait a bit...', '#ffe14a');
          }
        }
      } else if (g.request && g.request.type === 'pet') {
        H.setPrompt(`${KEY()} Give <b>${g.name}</b> a belly rub 🐾`, 0);
        if (inp.use) { Gs.pet(g); P.reach = 1; S.stats.served++; A.deliver(); }
      } else if (g.request) {
        const want = g.request.item;
        const has = P.carry.includes(want);
        if (has) {
          H.setPrompt(`${KEY()} Give <b>${MH.ITEMS[want].name}</b> to ${g.name}`, 0);
          if (inp.use) {
            const r = Gs.give(g, want);
            P.takeItem(want);
            A.deliver();
            S.stats.served++;
            if (r === 'fast') H.center('SUPER FAST!', 1, 'green');
            tip('delivered', 'Awesome! Happy guests leave <b>5-star reviews</b> ⭐ when they check out.<br>Keep everyone happy until <b>6 AM</b>!');
          }
        } else {
          H.setPrompt(`${g.name} wants <b>${MH.ITEMS[want].name}</b> <small>(${MH.ITEMS[want].where})</small>`, 0);
          if (inp.use) {
            if (held) { Gs.give(g, held); A.wrong(); }
            else { A.babble(g.kind, 0, 0, 0.12); H.say(g.name, `Please bring me a ${MH.ITEMS[want].name}! It's in the ${MH.ITEMS[want].where}.`, COLORS[g.kind]); }
          }
        }
      } else {
        H.setPrompt(`${KEY()} Chat with <b>${g.name}</b>`, 0);
        if (inp.use) {
          const cd = S.chatCd[g.id] || 0;
          if (S.time > cd) { g.happy = Math.min(100, g.happy + 4); S.chatCd[g.id] = S.time + 12; }
          g.talkT = 1.2;
          A.babble(g.kind, (g.happy - 50) / 50, 0, 0.13);
          const lines = g.happy > 70 ? ['I love this hotel!', 'What a lovely spooky night!', 'Your hotel is so creepy. I LOVE it!', 'Best vacation ever!'] : g.happy > 40 ? ['It\'s okay here.', 'Hmm, not bad.', 'Could be spookier...'] : ['Hmph!', 'I am NOT happy.', 'This place needs work!'];
          H.say(g.name, U.pick(lines), COLORS[g.kind]);
        }
      }
    } else if (tg.kind === 'human') {
      S.cleanT = 0;
      H.setPrompt(`${KEY()} <b>BOO!</b> Scare the human away!`, 0);
      if (inp.use) {
        Gs.shoo(tg.obj); S.stats.humans++; P.reach = 1; P.shake = 0.5;
        A.babble(S.boss, -1, 0, 0.2);
        H.center('BOO!', 0.8, 'green');
        Gs.cheer(tg.obj.x, tg.obj.z, 6, 10);
      }
    } else if (tg.kind === 'station') {
      S.cleanT = 0;
      const st = tg.obj;
      const nm = MH.ITEMS[st.kind].name;
      if (P.carry.length >= P.cap) {
        H.setPrompt(`Your hands are full! ${KEY('G')} drop`, 0);
      } else {
        H.setPrompt(`${KEY()} Take a <b>${nm}</b>`, 0);
        if (inp.use) {
          P.pickUp(st.kind);
          const who = Gs.list.filter((g) => g.request && g.request.item === st.kind);
          tip('carry', who.length ? `Now bring the ${nm} to <b>${who[0].name}</b>${who[0].room && who[0].state !== 'hang' ? ' in <b>Room ' + who[0].room.num + '</b>' : ''}.<br>Look at them and press <b>E</b>.` : `You're carrying a ${nm}. Press <b>G</b> to drop it.`);
        }
      }
    } else if (tg.kind === 'window') {
      S.cleanT = 0;
      H.setPrompt(`${KEY()} Close the window`, 0);
      if (inp.use) {
        tg.obj.target = 0; P.reach = 1;
        A.closeWindow();
        if (tg.obj.room && tg.obj.room.guest) { tg.obj.room.guest.happy = Math.min(100, tg.obj.room.guest.happy + 5); }
      }
    } else if (tg.kind === 'mess') {
      if (inp.useHeld) {
        S.cleanT += dt;
        P.scrub = 1;
        if (Math.random() < dt * 8) A.scrub();
        const need = 1.1;
        H.setPrompt('Cleaning...', S.cleanT / need);
        if (S.cleanT >= need) { removeMess(tg.obj); S.cleanT = 0; }
      } else {
        S.cleanT = 0;
        H.setPrompt(`Hold ${KEY()} to clean the mess`, 0);
      }
    }
  }

  // ---------- HUD every frame ----------
  function updateHUD(t) {
    H.setClock(S.night, S.hours);
    H.setHolding(P.carry, P.cap);
    const tasks = [];
    for (const g of Gs.list) {
      if (g.state === 'leave' || g.state === 'storm') continue;
      if (g.state === 'queue' || g.state === 'arrive') tasks.push({ icon: 'key', title: 'Check in ' + g.name, sub: 'Waiting at the Front Desk', bar: g.happy / 100, hot: g.happy < 30, urg: g.happy });
      else if (g.request) {
        const where = g.state === 'hang' || g.state === 'toHang' ? 'Lobby' : 'Room ' + g.room.num;
        tasks.push({ icon: g.request.icon, title: where + ': ' + g.name, sub: g.request.type === 'pet' ? 'wants a belly rub!' : 'wants ' + MH.ITEMS[g.request.item].name, bar: g.happy / 100, hot: g.happy < 30, urg: g.happy });
      }
    }
    for (const R of W.rooms) {
      if (R.window && R.window.target > 0) tasks.push({ icon: 'storm', title: 'Room ' + R.num + ': window open!', sub: R.guest ? R.guest.name + ' is freezing!' : 'Close it before a guest comes', bar: -1, hot: !!R.guest, urg: R.guest ? 25 : 75 });
      if (R.status === 'dirty') tasks.push({ icon: 'sparkle', title: 'Room ' + R.num + ' is dirty', sub: 'Clean it for the next guest', bar: -1, urg: Gs.list.some((g) => g.state === 'queue') ? 35 : 80 });
      else if (R.messes.length && R.guest) tasks.push({ icon: 'mess', title: 'Room ' + R.num + ' is messy', sub: R.guest.name + ' doesn\'t like it', bar: -1, urg: 45 });
    }
    for (const h of Gs.humans) if (h.state === 'sneak') tasks.push({ icon: 'human', title: 'A HUMAN is inside!', sub: 'Scare it away! (' + ({ lobby: 'lobby', hall: 'hallway', room: 'a guest room', kitchen: 'kitchen', supply: 'supplies', door: 'hallway', arch: 'lobby' }[W.zoneAt(h.x, h.z)] || 'hotel') + ')', bar: -1, hot: true, kind: 'human', urg: -10 });
    tasks.sort((a, b) => a.urg - b.urg);
    H.setTasks(tasks);
    const staying = Gs.list.filter((g) => g.checkedIn && g.state !== 'leave' && g.state !== 'storm').length;
    const waiting = Gs.list.filter((g) => g.state === 'queue' || g.state === 'arrive').length;
    H.el.guests.textContent = `Guests: ${staying}  ·  Waiting: ${waiting}`;
    H.drawMap(t, P, Gs.list, Gs.humans.filter((h) => h.state === 'sneak'));
    // stress: grumpy guests + humans
    const grumpy = Gs.list.filter((g) => g.happy < 30 && g.state !== 'leave' && g.state !== 'storm').length;
    const stress = U.clamp(grumpy * 0.2 + Gs.humans.filter((h) => h.state === 'sneak').length * 0.3, 0, 1);
    H.setStress(stress * 0.35);
    A.setIntensity(stress * 0.35 + (S.night - 1) * 0.03);
    const lm = $('lockmsg');
    lm.style.display = !AUTO && !In.mouse.locked && state === 'play' && S.time < 25 ? 'block' : 'none';
    lm.textContent = In.mouse.noLock ? 'Hold the mouse button and drag to look around' : 'Click to look around with the mouse';
  }

  // ============================================================
  //  THE LOOP
  // ============================================================
  let titleT = 0;
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05) * (S.timeScale || 1);
    const t = clock.elapsedTime;
    if (state === 'play') {
      update(dt, t);
      render(P.camera, true);
      return;
    }
    // menus: a slow camera flying around the lobby
    const L = W.lobby;
    titleT += dt;
    if (state === 'select' && selModels.length) {
      const s = selectSpot(selIndex);
      const tx = s.x, tz = s.z + 5;
      titleCam.position.x += (tx - titleCam.position.x) * Math.min(1, dt * 5);
      titleCam.position.y += (1.5 - titleCam.position.y) * Math.min(1, dt * 5);
      titleCam.position.z += (tz - titleCam.position.z) * Math.min(1, dt * 5);
      titleCam.lookAt(titleCam.position.x, 0.45, s.z);
      selModels.forEach((m, i) => {
        m.rotation.y += ((i === selIndex ? Math.sin(t * 0.8) * 0.4 : 0) - m.rotation.y) * Math.min(1, dt * 4);
        Mo.animate(m, dt, { speed: 0, mood: i === selIndex ? 1 : 0.4, talk: false, wave: i === selIndex && Math.sin(t * 0.6) > 0.3 });
      });
    } else if (state === 'title' || state === 'loading') {
      const a = titleT * 0.06;
      titleCam.position.set(L.cx + Math.sin(a) * 5.5, 2.6 + Math.sin(titleT * 0.2) * 0.4, L.cz + 2 + Math.cos(a) * 5.5);
      titleCam.lookAt(L.cx, 2.2, L.cz - 1);
      for (const ac of titleActors) {
        ac.talkT -= dt;
        if (ac.talkT < 0) ac.talkT = U.rand(3, 7);
        Mo.animate(ac.m, dt, { speed: 0, mood: ac.mood, talk: ac.talkT < 1.2, wave: false });
      }
    } else if (state === 'intro' || state === 'summary' || state === 'over' || state === 'pause') {
      if (P.camera && state !== 'intro') { render(P.camera, false); return; }
      const a = titleT * 0.05;
      titleCam.position.set(L.cx + Math.sin(a) * 4, 3.2, L.cz + 3 + Math.cos(a) * 4);
      titleCam.lookAt(L.cx, 2, L.cz);
    }
    W.update(dt, t, { x: titleCam.position.x, z: titleCam.position.z, yaw: Math.atan2(titleCam.position.x - L.cx, titleCam.position.z - L.cz) }, []);
    render(titleCam, false);
  }
  function render(cam, hands) {
    renderer.autoClear = true;
    renderer.render(scene, cam);
    MH.renderInfo = { calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, progs: renderer.info.programs ? renderer.info.programs.length : 0 };
    if (hands && P.handScene) {
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(P.handScene, P.handCam);
    }
  }

  window.addEventListener('load', init);
  return {
    nightParams: () => S.nightP,
    S, spawnGuest, addMess, removeMess, stormWindow, endNight, gameOver,
    debug: {
      get state() { return state; }, P, W, Gs, spawnHuman: () => Gs.spawnHuman(),
      // run the game fast without drawing (for automatic tests)
      simulate(seconds, each) { let t = clock.elapsedTime; for (let i = 0; i < seconds * 10 && state === 'play'; i++) { t += 0.1; if (each) each(); update(0.1, t); } return state; },
    },
  };
})();
