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

  SP.Input.init();
  SP.Camera.snap(robots);
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    SP.Camera.resize();
  });

  function update(dt) {
    SP.Input.pollJoin();
    robots.forEach((r, i) => {
      const input = SP.Input.read(i);
      SP.Robot.control(r, input, dt);
      if (input.armPressed) SP.Parts.throwLimb(r, 'arm');
      if (input.legPressed) SP.Parts.throwLimb(r, 'leg');
      if (input.recallPressed) SP.Parts.recall(r);
      // the other robot is solid too, so you can stand on your friend's head!
      const others = robots.filter((o) => o !== r).map(SP.Physics.bodyBox);
      SP.Physics.step(r, dt, level.solids.concat(others));
      // fell off the world? pop back to the start
      if (r.pos.y < -10) { r.pos.copy(r.spawn); r.vel.set(0, 0, 0); }
      SP.Robot.animate(r, dt, robots[1 - i]);
    });
    SP.Parts.update(dt, robots, level.solids);
    SP.Camera.update(robots, dt);
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
