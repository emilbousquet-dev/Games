// ============================================================
//  SPARE PARTS — MAIN GAME LOOP
//  Title screen → levels → level complete → next level...
// ============================================================
window.SP = window.SP || {};

SP.Game = (function () {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd3ff);
  scene.fog = new THREE.Fog(0x8fd3ff, 40, 90);

  // soft sky light + a sun that makes shadows (the sun follows the camera)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a080, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 50 });
  scene.add(sun, sun.target);

  // far below the levels: a giant ball pit (that's where you land when you fall!)
  const pitFloor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x5a7fb0, roughness: 1 }));
  pitFloor.rotation.x = -Math.PI / 2;
  pitFloor.position.y = -15;
  scene.add(pitFloor);
  const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.4 }), 900);
  const ballColors = [0xff5a5f, 0xffc933, 0x5cc96b, 0x4aa8ff, 0x9b6bff, 0xff8fc8].map((c) => new THREE.Color(c));
  const tmp = new THREE.Object3D();
  for (let i = 0; i < 900; i++) {
    tmp.position.set(-40 + Math.random() * 130, -14.6 + Math.random() * 0.4, -30 + Math.random() * 50);
    tmp.updateMatrix();
    balls.setMatrixAt(i, tmp.matrix);
    balls.setColorAt(i, ballColors[i % ballColors.length]);
  }
  scene.add(balls);

  SP.Parts.init(scene);
  SP.Effects.init(scene);
  const robots = [
    SP.Robot.create(scene, 'Bolt', 0xff8a2a, 'bolt', 0, 0),
    SP.Robot.create(scene, 'Nutty', 0x3d9cff, 'nutty', 0, 0),
  ];
  robots.forEach((r, i) => { r.index = i; });
  const HOLD = 0.25; // hold a button longer than this to grab or pull
  const LEVELS = SP.Levels.LEVELS;

  let level = null, levelIndex = -1, state = 'title', winTimer = 0;
  const noInput = { x: 0, z: 0 };

  // remember which levels you finished (only in this browser)
  let finished = {};
  try { finished = JSON.parse(localStorage.getItem('spare-parts-finished') || '{}'); } catch (e) { finished = {}; }
  function saveFinished() { try { localStorage.setItem('spare-parts-finished', JSON.stringify(finished)); } catch (e) { /* no saving */ } }

  function loadLevel(index) {
    if (level) SP.Level.destroy(scene, level);
    levelIndex = index;
    const data = index < 0 ? SP.Levels.PLAYGROUND : LEVELS[index];
    level = SP.Level.build(scene, data);
    SP.Parts.resetAll(robots);
    SP.Effects.clear();
    robots.forEach((r, i) => {
      const [x, y, z] = data.spawns[i];
      r.pos.set(x, y, z); r.spawn.set(x, y, z);
      r.vel.set(0, 0, 0); r.facing = 0; r.dizzy = 0; r.squished = 0; r.dance = 0; r.jumpers = null;
    });
    for (const k in SP.stats) delete SP.stats[k];
    SP.stats.time = 0;
    levelTitle();
    SP.UI.hint(null);
    SP.Camera.snap(robots);
  }

  function levelTitle() {
    const name = levelIndex < 0 ? 'Playground' : `Level ${levelIndex + 1}: ${level.data.name}`;
    SP.UI.level(level.coins.length ? `${name}  ·  🔩 ${level.coinsGot}/${level.coins.length}` : name);
  }

  // ---------------- menus ----------------
  function titleMenu() {
    state = 'title';
    SP.UI.level('');
    SP.UI.menu({
      title: 'SPARE PARTS',
      text: '<b>Escape the Toy Factory!</b><br>Two silly robots who can throw, swap and borrow each other\'s arms and legs.<br><span class="small">2 players on one keyboard, or with controllers.</span>',
      big: true,
      items: [
        { label: '▶ Play', action: () => start(firstUnfinished()) },
        { label: 'Choose a level', action: levelMenu },
        { label: 'Playground', action: () => start(-1) },
        { label: 'Controls', action: () => { SP.UI.toggleControls(true); } },
      ],
    });
  }

  function firstUnfinished() {
    const i = LEVELS.findIndex((l, k) => !finished[k]);
    return i < 0 ? 0 : i;
  }

  function levelMenu() {
    SP.UI.menu({
      title: 'Choose a level',
      items: [
        ...LEVELS.map((l, i) => ({ label: `${finished[i] ? '✅' : '⬜'} ${i + 1}. ${l.name}`, action: () => start(i) })),
        { label: '← Back', action: titleMenu },
      ],
      back: titleMenu,
    });
  }

  function start(index) {
    SP.UI.closeMenu();
    SP.UI.toggleControls(false);
    loadLevel(index);
    state = 'play';
  }

  function pauseMenu() {
    if (state !== 'play') return;
    state = 'paused';
    const resume = () => { SP.UI.closeMenu(); state = 'play'; };
    SP.UI.menu({
      title: 'Paused',
      items: [
        { label: '▶ Keep playing', action: resume },
        { label: '↺ Restart level', action: () => start(levelIndex) },
        { label: 'Controls', action: () => SP.UI.toggleControls() },
        { label: 'Back to title', action: () => { loadLevel(-1); titleMenu(); } },
      ],
      back: resume,
    });
  }
  SP.UI.on('pause', () => (state === 'paused' ? (SP.UI.closeMenu(), state = 'play') : pauseMenu()));

  function winMenu() {
    const s = SP.stats;
    const last = levelIndex === LEVELS.length - 1;
    const stats = `<div class="sp-stats">
      <div><b>${Math.floor(s.time / 60)}:${String(Math.floor(s.time % 60)).padStart(2, '0')}</b>time</div>
      <div><b>${s.thrown || 0}</b>limbs thrown</div>
      <div><b>${s.slaps || 0}</b>slaps</div>
      <div><b>${s.superJumps || 0}</b>super jumps</div>
      <div><b>${s.falls || 0}</b>falls</div>
      <div><b>${s.squished || 0}</b>squished</div></div>
      <p class="sp-bolts">🔩 Golden bolts: <b>${level.coinsGot} / ${level.coins.length}</b>${level.coinsGot === level.coins.length ? ' — ALL OF THEM! 🌟' : ''}</p>`;
    if (levelIndex < 0) { titleMenu(); return; }
    SP.UI.menu(last ? {
      title: 'YOU ESCAPED! 🎉',
      text: 'Bolt and Nutty escaped the Toy Factory!<br>Thanks for playing. More levels coming soon...' + stats,
      big: true,
      items: [{ label: 'Back to title', action: () => { loadLevel(-1); titleMenu(); } }, { label: '↺ Play this level again', action: () => start(levelIndex) }],
    } : {
      title: 'Level complete!',
      text: stats,
      items: [{ label: '▶ Next level', action: () => start(levelIndex + 1) }, { label: '↺ Play again', action: () => start(levelIndex) }, { label: 'Back to title', action: () => { loadLevel(-1); titleMenu(); } }],
    });
  }

  // ---------------- playing ----------------
  // your arm and leg buttons. If your friend is wearing one of your limbs,
  // the buttons control THAT limb instead of throwing.
  function ownerButtons(r, input) {
    const arm = SP.Parts.lent(r, 'arm')[0];
    const leg = SP.Parts.lent(r, 'leg')[0];
    if (arm) {
      // tap = slap, hold = grab (only counts if the arm was already on your friend when you pressed)
      if (input.armReleased > 0 && input.armReleased < HOLD && arm.wornTime > input.armReleased) SP.Parts.startAction(arm, 'slap');
      const grab = input.armHold > HOLD && arm.wornTime > input.armHold;
      if (grab && !arm.grabbing) SP.Audio.play('grab');
      arm.grabbing = grab;
      // hold call back = pull your friend over, tap = call your limbs home
      arm.pulling = input.recallHold > HOLD && arm.wornTime > input.recallHold;
      if (input.recallReleased > 0 && input.recallReleased < HOLD) SP.Parts.recall(r);
    } else {
      if (input.armPressed) SP.Parts.throwLimb(r, 'arm');
      if (input.recallPressed) SP.Parts.recall(r);
    }
    if (input.legPressed) {
      if (leg) SP.Parts.startAction(leg, 'kick');
      else SP.Parts.throwLimb(r, 'leg');
    }
  }

  function respawn(r) {
    r.pos.copy(r.spawn); r.vel.set(0, 0, 0); r.squished = 0; r.dizzy = 0;
    SP.Effects.poof(r.pos);
    SP.Audio.play('poof');
  }

  function update(dt) {
    SP.Input.pollJoin();
    SP.UI.update(dt);
    const playing = state === 'play';
    const inputs = robots.map((r, i) => {
      const input = SP.Input.read(i, dt);
      return playing ? input : noInput;
    });
    if (state === 'play' && inputs.some((inp) => inp.pausePressed)) { pauseMenu(); return; }
    if (state === 'paused') { SP.Effects.update(dt); return; }

    const events = SP.Level.update(level, dt, robots, SP.Parts.limbs);
    if (playing) SP.stats.time += dt;

    if (playing) robots.forEach((r, i) => ownerButtons(r, inputs[i]));
    robots.forEach((r, i) => {
      SP.Robot.control(r, inputs, dt);
      const held = SP.Parts.beforeStep(r, dt);
      // the other robot is solid too, so you can stand on your friend's head!
      const others = robots.filter((o) => o !== r).map(SP.Physics.bodyBox);
      if (!held && !(r.squished > 0)) SP.Physics.step(r, dt, level.solids.concat(others));
      if (r.squished > 0) { r.squished -= dt; if (r.squished <= 0) respawn(r); }
      // fell into the ball pit? pop back to the checkpoint
      if (r.pos.y < -8) { SP.stat('falls'); SP.Audio.play('fall'); respawn(r); }
      SP.Robot.animate(r, dt, robots[1 - i]);
    });
    SP.Parts.update(dt, robots, level.solids);

    if (playing) {
      for (const r of events.squished) {
        r.squished = 0.9; r.dizzy = 0;
        SP.stat('squished'); SP.Audio.play('squish');
      }
      if (events.coin) {
        SP.Audio.play('coin');
        SP.Effects.sparkle(events.coin, 0xffcc33);
        levelTitle();
        if (level.coinsGot === level.coins.length) SP.UI.toast('All the golden bolts! 🌟');
      }
      if (events.checkpoint) {
        robots.forEach((r, i) => r.spawn.copy(events.checkpoint).add(new THREE.Vector3(i ? 1 : -1, 0.1, 0)));
        SP.Audio.play('checkpoint');
        SP.UI.toast('Checkpoint! 🚩');
      }
      SP.UI.hint(events.hint);
      if (events.win) {
        state = 'won'; winTimer = 1.6;
        if (levelIndex >= 0) { finished[levelIndex] = true; saveFinished(); }
        SP.Effects.confetti(robots[0].pos.clone().add(robots[1].pos).multiplyScalar(0.5));
        SP.Audio.play('win');
        robots.forEach((r) => { r.dance = 1.6; SP.Audio.play('voice', r.index === 1); });
        SP.UI.hint(null);
      }
    }
    if (state === 'won') {
      winTimer -= dt;
      if (winTimer <= 0) { state = 'wonMenu'; winMenu(); }
    }
    // on the title screen the robots dance every now and then
    if (state === 'title') robots.forEach((r) => { if (!r.dance && Math.random() < dt * 0.25) r.dance = 1.6; });

    SP.Effects.update(dt);
    SP.Camera.update(robots, dt);
    const t = SP.Camera.target;
    sun.position.set(t.x + 8, t.y + 16, t.z + 10);
    sun.target.position.copy(t);
  }

  SP.Input.init();
  SP.UI.init();
  loadLevel(-1);
  titleMenu();

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    SP.Camera.resize();
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!api.manual) update(dt);
    renderer.render(scene, SP.Camera.camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  const api = {
    scene, robots, update, start, loadLevel,
    manual: false, // tests can turn this on and call step() themselves
    step(seconds) { for (let i = 0; i < Math.round(seconds * 60); i++) update(1 / 60); },
    get level() { return level; }, get state() { return state; }, get levelIndex() { return levelIndex; },
  };
  return api;
})();
