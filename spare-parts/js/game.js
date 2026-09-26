// ============================================================
//  SPARE PARTS — MAIN GAME LOOP
// ============================================================
window.SP = window.SP || {};

SP.Game = (function () {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd3ff);

  // soft sky light + a sun that makes shadows
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a080, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(6, 14, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 40 });
  scene.add(sun);

  const level = SP.Level.build(scene, SP.Level.TEST_ROOM);
  SP.Parts.init(scene);
  const robots = [
    SP.Robot.create(scene, 'Bolt', 0xff8a2a, 'bolt', ...level.spawns[0]),
    SP.Robot.create(scene, 'Nutty', 0x3d9cff, 'nutty', ...level.spawns[1]),
  ];
  robots.forEach((r, i) => { r.index = i; });
  const HOLD = 0.25; // hold a button longer than this to grab or pull

  SP.Input.init();
  SP.Camera.snap(robots);
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    SP.Camera.resize();
  });

  function update(dt) {
    SP.Input.pollJoin();
    const inputs = robots.map((r, i) => SP.Input.read(i, dt));
    robots.forEach((r, i) => ownerButtons(r, inputs[i]));
    robots.forEach((r, i) => {
      SP.Robot.control(r, inputs, dt);
      const held = SP.Parts.beforeStep(r, dt);
      // the other robot is solid too, so you can stand on your friend's head!
      const others = robots.filter((o) => o !== r).map(SP.Physics.bodyBox);
      if (!held) SP.Physics.step(r, dt, level.solids.concat(others));
      // fell off the world? pop back to the start
      if (r.pos.y < -10) { r.pos.copy(r.spawn); r.vel.set(0, 0, 0); }
      SP.Robot.animate(r, dt, robots[1 - i]);
    });
    SP.Parts.update(dt, robots, level.solids);
    SP.Camera.update(robots, dt);
  }

  // your arm and leg buttons. If your friend is wearing one of your limbs,
  // the buttons control THAT limb instead of throwing.
  function ownerButtons(r, input) {
    const arm = SP.Parts.lent(r, 'arm')[0];
    const leg = SP.Parts.lent(r, 'leg')[0];
    if (arm) {
      // tap = slap, hold = grab (only counts if the arm was already on your friend when you pressed)
      if (input.armReleased > 0 && input.armReleased < HOLD && arm.wornTime > input.armReleased) SP.Parts.startAction(arm, 'slap');
      arm.grabbing = input.armHold > HOLD && arm.wornTime > input.armHold;
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

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    renderer.render(scene, SP.Camera.camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { scene, robots, level, update };
})();
