// ============================================================
//  SPARE PARTS — THE ROBOTS (Bolt and Nutty)
//  Each robot is built from separate parts so we can pull
//  them off later: head, body, 2 arms, legs.
// ============================================================
window.SP = window.SP || {};

SP.Robot = (function () {
  const WALK_SPEED = 5;
  const JUMP_SPEED = 10;

  function mat(color) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1 });
  }

  // a googly eye: white ball with a black pupil in front
  function makeEye() {
    const eye = new THREE.Group();
    const white = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), mat(0xffffff));
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), mat(0x111111));
    pupil.position.z = 0.11;
    eye.add(white, pupil);
    return eye;
  }

  function makeModel(color) {
    const root = new THREE.Group();
    const metal = mat(color);
    const grey = mat(0x9aa3ad);

    // legs: two springy sticks with round feet
    const legs = new THREE.Group();
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 8), grey);
      leg.position.set(side * 0.2, 0.3, 0);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8), metal);
      foot.scale.set(1, 0.6, 1.3);
      foot.position.set(side * 0.2, 0.08, 0.05);
      legs.add(leg, foot);
    }
    root.add(legs);

    // body: a round belly
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), metal);
    body.scale.set(1, 0.9, 0.9);
    body.position.y = 0.85;
    root.add(body);

    // arms: noodles on each side
    const arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      const noodle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), grey);
      noodle.position.y = -0.25;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), metal);
      hand.position.y = -0.52;
      arm.add(noodle, hand);
      arm.position.set(side * 0.44, 1.0, 0);
      arm.rotation.z = side * 0.25;
      root.add(arm);
      arms.push(arm);
    }

    // head: a box with big googly eyes and an antenna
    const head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.52), metal);
    head.add(skull);
    for (const side of [-1, 1]) {
      const eye = makeEye();
      eye.position.set(side * 0.15, 0.04, 0.24);
      head.add(eye);
    }
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), grey);
    antenna.position.y = 0.38;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), mat(0xff3355));
    ball.position.y = 0.55;
    head.add(antenna, ball);
    head.position.y = 1.5;
    root.add(head);

    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return { root, head, body, arms, legs };
  }

  function create(scene, name, color, x, z) {
    const model = makeModel(color);
    scene.add(model.root);
    const r = {
      name, color, model,
      pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(),
      halfW: 0.4, height: 1.75, onGround: false, landSpeed: 0,
      facing: 0, walkTime: 0, spawn: new THREE.Vector3(x, 0, z),
    };
    return r;
  }

  // controls → speed and direction
  function control(r, input, dt) {
    const tx = input.x * WALK_SPEED, tz = input.z * WALK_SPEED;
    const grip = r.onGround ? 14 : 5; // less control in the air
    r.vel.x += (tx - r.vel.x) * Math.min(1, grip * dt);
    r.vel.z += (tz - r.vel.z) * Math.min(1, grip * dt);
    if (input.jumpPressed && r.onGround) r.vel.y = JUMP_SPEED;
    if (Math.hypot(input.x, input.z) > 0.1) {
      const want = Math.atan2(input.x, input.z);
      let diff = want - r.facing;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      r.facing += diff * Math.min(1, 12 * dt);
    }
  }

  // put the model where the robot is, with a little walking wobble
  function animate(r, dt) {
    const m = r.model;
    const speed = Math.hypot(r.vel.x, r.vel.z);
    if (r.onGround && speed > 0.5) r.walkTime += dt * speed * 2.2;
    const wob = r.onGround ? Math.sin(r.walkTime) * Math.min(1, speed / WALK_SPEED) : 0;
    m.root.position.copy(r.pos);
    m.root.rotation.y = r.facing;
    m.root.rotation.z = wob * 0.12;
    m.head.rotation.z = -wob * 0.15;
    m.arms[0].rotation.x = wob * 0.8;
    m.arms[1].rotation.x = -wob * 0.8;
  }

  return { create, control, animate };
})();
