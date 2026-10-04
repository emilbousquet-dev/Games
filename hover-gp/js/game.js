// ============================================================
//  SIGMA HOVER GP — THE GAME
//  Sets up the 3D screen, starts races, runs every frame,
//  and draws 1 or 2 players (split screen).
// ============================================================
window.HG = window.HG || {};

HG.Game = (function () {
  const U = HG.U;
  const $ = (id) => document.getElementById(id);
  let renderer, scene, canvas;
  let state = 'boot', lastT = performance.now(), paused = false;
  const views = [];          // one per local player: { kart, cam, chase }
  let kartViews = [];
  let world = null;          // everything built for the current race
  let introCam = null;
  let race = null;
  let onRaceEnd = null;
  let fpsT = 0, fpsN = 0, fps = 60;

  function init() {
    canvas = $('game');
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: HG.settings.gfx !== 'low', powerPreference: 'high-performance' });
    } catch (e) {
      document.body.innerHTML = '<div style="padding:40px;font:20px sans-serif;color:#fff">Sorry! Your browser can\'t show 3D games (WebGL is off). Try Chrome or Edge.</div>';
      return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, HG.settings.gfx === 'high' ? 2 : HG.settings.gfx === 'medium' ? 1.25 : 1));
    renderer.shadowMap.enabled = HG.settings.gfx !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.autoClear = false;
    scene = new THREE.Scene();
    HG.Tex.init(renderer);
    HG.Env.init(scene, renderer);
    if (HG.FX) HG.FX.init(scene);
    if (HG.Post) HG.Post.init(renderer);
    HG.Input.init();
    HG.HUD.init();
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'race' && !paused && !isOnline()) pause(true); });
    requestAnimationFrame(loop);
    window.__hg = { get race() { return race; }, get state() { return state; }, scene, renderer, views, startRace, get kartViews() { return kartViews; }, frame: (dt) => frame(dt),
      // run the race quickly without drawing (for testing)
      sim(sec, step = 1 / 30) { for (let t = 0; t < sec && race; t += step) { HG.Input.poll(); raceFrame(step); HG.Input.endFrame(); } },
    };
    return true;
  }
  const isOnline = () => !!(race && race.cfg && race.cfg.online);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    if (HG.Post) HG.Post.resize(w, h, renderer.getPixelRatio());
    fitCams();
  }
  function fitCams() {
    const w = window.innerWidth, h = window.innerHeight;
    const n = Math.max(1, views.length);
    for (const v of views) { v.cam.aspect = w / (h / n); v.cam.updateProjectionMatrix(); }
    if (introCam) { introCam.aspect = w / h; introCam.updateProjectionMatrix(); }
  }

  // ------------------------------------------------------------
  //  START A RACE
  //  cfg = { track, mode, cc, mirror, laps, racers: [{ name, charId, parts, color, ctrl, player }], items }
  // ------------------------------------------------------------
  function startRace(cfg, onEnd) {
    endRace();
    onRaceEnd = onEnd || null;
    race = HG.Race.setup(cfg);
    world = new THREE.Group();
    scene.add(world);
    const theme = race.theme;
    race.groundY = HG.Env.setTheme(theme, race.track);
    world.add(race.track.isArena ? HG.ArenaMesh.build(race.track, theme) : HG.TrackMesh.build(race.track, theme));
    if (HG.Scenery) world.add(HG.Scenery.build(race.track, theme, race));
    if (HG.Hazards) HG.Hazards.setup(race, world);
    if (HG.Items) HG.Items.build(world, race);
    kartViews = race.karts.map((k) => new HG.KartView(k, world));
    // cameras for the local players
    views.length = 0;
    race.karts.filter((k) => k.ctrl === 'local').sort((a, b) => a.player - b.player).forEach((k) => {
      const cam = new THREE.PerspectiveCamera(72, 1, 0.1, 3000);
      views.push({ kart: k, cam, chase: new HG.ChaseCam(cam, k) });
    });
    if (!views.length) {
      // nobody playing (a demo): watch the first racer
      const cam = new THREE.PerspectiveCamera(72, 1, 0.1, 3000);
      views.push({ kart: race.karts[0], cam, chase: new HG.ChaseCam(cam, race.karts[0]) });
    }
    HG.Input.players = views.length;
    introCam = new THREE.PerspectiveCamera(60, 1, 0.1, 3000);
    fitCams();
    HG.HUD.setup(views, race);
    $('hud').style.display = 'block';
    if (HG.Audio) HG.Audio.raceMusic(race.def.music || theme.scenery, false);
    if (race.phase === 'intro') HG.HUD.big(null, '<span class="trackname">' + race.def.name + '</span>', 4, 'intro');
    state = 'race'; paused = false;
    // compile shaders now so the first frames don't stutter
    try { renderer.compile(scene, views[0].cam); } catch (e) { /* fine */ }
    return race;
  }

  function endRace() {
    if (world) {
      scene.remove(world);
      world.traverse((o) => { if (o.isMesh || o.isPoints || o.isInstancedMesh) { o.geometry.dispose(); } });
      world = null;
    }
    if (HG.FX) HG.FX.clear();
    kartViews = []; views.length = 0; race = null;
    HG.HUD.clear();
    $('hud').style.display = 'none';
  }

  function pause(on) {
    if (state !== 'race') return;
    paused = on;
    if (HG.Menu) HG.Menu.pauseMenu(on);
    if (HG.Audio) HG.Audio.muffle(on);
  }

  // ------------------------------------------------------------
  //  EVERY FRAME
  // ------------------------------------------------------------
  function loop(t) {
    requestAnimationFrame(loop);
    let dt = (t - lastT) / 1000;
    lastT = t;
    if (!(dt > 0)) dt = 1 / 60;
    fpsT += dt; fpsN++;
    dt = Math.min(dt, 0.05);
    if (fpsT > 0.5) { fps = fpsN / fpsT; fpsT = 0; fpsN = 0; if (HG.settings.showFps) $('fps').textContent = Math.round(fps) + ' FPS'; }
    frame(dt);
  }

  function frame(dt) {
    HG.Input.poll();
    const m = HG.Input.menu();
    if (state === 'race' && race) {
      if ((m.pause || HG.Input.padPausePressed()) && race.phase !== 'done' && !race.ended) pause(!paused);
      if (!paused || isOnline()) raceFrame(dt);
      if ((paused || race.ended) && HG.Menu) HG.Menu.update(dt, m);
      if (race) render(dt);
    } else {
      if (HG.Menu) HG.Menu.update(dt, m);
      if (HG.Menu && HG.Menu.render3D) HG.Menu.render3D(renderer, dt);
      else { renderer.setRenderTarget(null); renderer.clear(); }
    }
    HG.Input.endFrame();
  }

  function raceFrame(dt) {
    // read the controls
    for (const v of views) {
      if (v.kart.ctrl !== 'local') continue;
      const inp = v.kart.input;
      inp.back = false;
      HG.Input.read(v.kart.player, inp);
      // skip the intro
      if (race.phase === 'intro' && (inp.item || inp.drift) && race.t > 0.8) { race.t = 99; }
    }
    if (HG.Net && race.cfg.online) HG.Net.beforeStep(race, dt);
    HG.Race.update(dt);
    if (HG.Net && race.cfg.online) HG.Net.afterStep(race, dt);
    // events: sounds, effects, messages
    handleEvents();
    for (const kv of kartViews) kv.update(dt, race.track);
    if (HG.Items) HG.Items.animate(dt, race);
    if (HG.Hazards) HG.Hazards.animate(dt, race);
    if (HG.Scenery) HG.Scenery.animate(dt, views[0].cam.position);
    if (HG.FX) HG.FX.update(dt, race, kartViews, views);
    for (const v of views) v.chase.update(dt, race.track, race);
    if (race.phase === 'intro') HG.IntroCam.update(introCam, race.track, race.t, race.cfg.introTime || 4.5);
    else if (race.phase === 'countdown' && race.countdown > 3.3) { for (const v of views) v.chase.snap(); }
    HG.Env.follow(views[0].kart ? kartPos(views[0].kart) : new THREE.Vector3(), dt);
    HG.HUD.update(dt, race);
    if (HG.Menu && HG.Menu.tick) HG.Menu.tick(dt);
    if (HG.Audio) HG.Audio.raceUpdate(dt, race, views);
    // start lights
    startLights();
    // race over?
    if (race.phase === 'done' && race.doneT > 3.2 && !race.ended) {
      race.ended = true;
      if (onRaceEnd) onRaceEnd(race);
    }
  }

  const _kp = new THREE.Vector3(), _kq = new THREE.Quaternion();
  function kartPos(k) { k.worldPose(race.track, _kp, _kq, 0); return _kp; }

  function startLights() {
    if (!world || race.track.isArena) return;
    const lights = world.children[0] && world.children[0].children.find((c) => c.userData && c.userData.lights);
    if (!lights) return;
    const n = race.phase === 'countdown' ? Math.max(0, Math.min(3, Math.ceil(3 - race.countdown + 0.001))) : race.go ? 4 : 0;
    lights.userData.lights.forEach((l, i) => {
      const on = n >= 4 ? 0x30ff60 : i < n ? 0xff2a2a : 0x331111;
      l.material.color.setHex(on);
    });
  }

  function handleEvents() {
    for (const e of race.events) {
      if (e.type === 'count') { HG.HUD.big(null, e.n, 0.9, 'count'); if (HG.Audio) HG.Audio.play('count'); }
      if (e.type === 'go') { HG.HUD.big(null, 'GO!', 1, 'go'); if (HG.Audio) { HG.Audio.play('go'); HG.Audio.raceMusic(race.def.music || race.theme.scenery, true); } }
    }
    race.events.length = 0;
    for (const k of race.karts) {
      for (const e of k.events) {
        const mine = k.ctrl === 'local';
        if (HG.Audio) HG.Audio.kartEvent(k, e, mine, views);
        if (HG.FX) HG.FX.kartEvent(k, e, race);
        if (!mine) continue;
        const v = views.find((x) => x.kart === k);
        if (e.type === 'lap') {
          HG.HUD.msg(k, e.final ? '<span class="final">FINAL LAP!</span>' : 'LAP ' + e.lap, 2, e.final ? 'finallap' : '');
          if (e.final && HG.Audio) HG.Audio.finalLap();
        } else if (e.type === 'finish') {
          HG.HUD.big(k, '<span class="finish">FINISH!</span><small>' + U.ordinal(e.place) + '</small>', 4, 'finishbig');
        } else if (e.type === 'hurt' || e.type === 'land' && e.hard > 16) { if (v) v.chase.shake = e.type === 'hurt' ? 1 : 0.4; }
        else if (e.type === 'trick') HG.HUD.msg(k, 'TRICK!', 0.8, 'trick');
        else if (e.type === 'rocketstart') HG.HUD.msg(k, 'ROCKET START!', 1.2, 'trick');
        else if (e.type === 'stall') HG.HUD.msg(k, 'TOO EARLY!', 1.2);
        else if (e.type === 'slipboost') HG.HUD.msg(k, 'SLIPSTREAM!', 0.9, 'trick');
        else if (e.type === 'fall') { if (v) v.chase.shake = 0.3; }
      }
      k.events.length = 0;
    }
  }

  // ------------------------------------------------------------
  //  DRAW
  // ------------------------------------------------------------
  function render(dt) {
    const w = window.innerWidth, h = window.innerHeight;
    if (race.phase === 'intro') {
      drawViews([{ cam: introCam, x: 0, y: 0, w, h, kart: null }], dt);
      return;
    }
    const n = views.length;
    const list = views.map((v, i) => ({ cam: v.cam, x: 0, y: n > 1 ? (i === 0 ? h / 2 : 0) : 0, w, h: h / n, kart: v.kart }));
    drawViews(list, dt);
  }

  function drawViews(list, dt) {
    if (HG.Post && HG.Post.enabled) { HG.Post.render(scene, list, dt); return; }
    renderer.setRenderTarget(null);
    renderer.setScissorTest(true);
    for (const v of list) {
      renderer.setViewport(v.x, v.y, v.w, v.h);
      renderer.setScissor(v.x, v.y, v.w, v.h);
      renderer.clear();
      renderer.render(scene, v.cam);
    }
    renderer.setScissorTest(false);
  }

  return {
    init, startRace, endRace, pause,
    kartView: (k) => kartViews.find((v) => v.kart === k), kartViewsList: () => kartViews,
    addKartView(k) { const v = new HG.KartView(k, world); kartViews.push(v); return v; },
    get renderer() { return renderer; }, get scene() { return scene; }, get race() { return race; },
    get state() { return state; }, set state(s) { state = s; }, get paused() { return paused; },
    get views() { return views; }, get fps() { return fps; },
  };
})();
