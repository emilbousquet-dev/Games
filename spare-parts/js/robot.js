// ============================================================
//  SPARE PARTS — THE ROBOTS (Bolt and Nutty)
//  Each robot is built from separate parts so we can pull
//  them off later: head, body, 2 arms, legs.
// ============================================================
window.SP = window.SP || {};

SP.Robot = (function () {
  const WALK_SPEED = 5;
  const JUMP_SPEED = 10;

  function mat(color, shiny = 0.1) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: shiny });
  }

  // a googly eye: a big white ball with a black pupil that slides around
  function makeEye(size) {
    const eye = new THREE.Group();
    const white = new THREE.Mesh(new THREE.SphereGeometry(size, 18, 14), mat(0xffffff));
    white.scale.z = 0.6;
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(size * 0.45, 12, 10), mat(0x111111));
    pupil.scale.z = 0.4;
    pupil.position.z = size * 0.55;
    eye.add(white, pupil);
    // where the pupil is wobbling to (it lags behind like a real googly eye)
    eye.userData = { pupil, size, px: 0, py: 0, vx: 0, vy: 0 };
    return eye;
  }

  // hats!
  function propellerCap(color) {
    const hat = new THREE.Group();
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(color));
    cap.scale.y = 0.7;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16, 1, false, -Math.PI / 2, Math.PI), mat(color));
    brim.position.set(0, 0.01, 0.2);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 6), mat(0x333333));
    stick.position.y = 0.27;
    const propeller = new THREE.Group();
    for (const [c, a] of [[0xff3355, 0], [0x33cc66, Math.PI / 2], [0xffcc00, Math.PI], [0x3388ff, Math.PI * 1.5]]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.015, 0.08), mat(c));
      blade.position.x = 0.14;
      const holder = new THREE.Group();
      holder.rotation.y = a;
      holder.add(blade);
      propeller.add(holder);
    }
    propeller.position.y = 0.35;
    hat.add(cap, brim, stick, propeller);
    hat.userData.propeller = propeller;
    return hat;
  }

  function topHat() {
    const hat = new THREE.Group();
    const black = mat(0x1a1a22);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 20), black);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.32, 20), black);
    tube.position.y = 0.17;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.172, 0.172, 0.06, 20), mat(0xff3355));
    band.position.y = 0.06;
    hat.add(brim, tube, band);
    hat.rotation.z = -0.25; // fancy tilt
    return hat;
  }

  function mustache() {
    const m = new THREE.Group();
    const hair = mat(0x4a2a12);
    for (const side of [-1, 1]) {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), hair);
      curl.scale.set(1.3, 0.45, 0.5);
      curl.position.set(side * 0.1, 0, 0);
      curl.rotation.z = side * 0.35;
      m.add(curl);
    }
    return m;
  }

  function makeModel(color, style) {
    const root = new THREE.Group();
    const squash = new THREE.Group(); // gets squished when landing
    root.add(squash);
    const metal = mat(color, 0.25);
    const grey = mat(0xb8c0c8, 0.5);

    // legs: two springy noodles with big clown feet
    const legs = new THREE.Group();
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), grey);
      leg.position.set(side * 0.2, 0.32, 0);
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), metal);
      foot.scale.set(1, 0.55, 1.5);
      foot.position.set(side * 0.21, 0.09, 0.08);
      legs.add(leg, foot);
    }
    squash.add(legs);

    // body: a round tummy with a shiny button
    const body = new THREE.Group();
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.42, 22, 16), metal);
    belly.scale.set(1, 0.85, 0.9);
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 14), mat(0xffdd33, 0.6));
    button.rotation.x = Math.PI / 2;
    button.position.set(0, 0.02, 0.37);
    body.add(belly, button);
    body.position.y = 0.85;
    squash.add(body);

    // arms: floppy noodles with round mitten hands
    const arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      const noodle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.5, 8), grey);
      noodle.position.y = -0.25;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), metal);
      hand.position.y = -0.53;
      arm.add(noodle, hand);
      arm.position.set(side * 0.43, 1.02, 0);
      arm.rotation.z = side * 0.3;
      squash.add(arm);
      arms.push(arm);
    }

    // head: a big box with huge googly eyes, a mouth and a hat
    const head = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.58, 0.6), metal);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.44, 0.02), mat(0xeef3f7));
    face.position.z = 0.305;
    head.add(skull, face);

    const eyes = [];
    // Nutty has one big eye and one small eye (extra silly)
    const sizes = style === 'nutty' ? [0.13, 0.17] : [0.15, 0.15];
    [-1, 1].forEach((side, i) => {
      const eye = makeEye(sizes[i]);
      eye.position.set(side * 0.17, 0.07, 0.33);
      head.add(eye);
      eyes.push(eye);
    });

    // mouths: a smile and a shocked "O". We show one at a time.
    const mouthMat = mat(0x222222);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 6, 14, Math.PI), mouthMat);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.08, 0.32);
    const shocked = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.022, 6, 14), mouthMat);
    shocked.position.set(0, -0.12, 0.32);
    shocked.visible = false;
    head.add(smile, shocked);

    let hat, propeller = null;
    if (style === 'nutty') {
      hat = topHat();
      hat.position.set(0.1, 0.3, 0);
      const stache = mustache();
      stache.position.set(0, -0.05, 0.34);
      smile.position.y = -0.14;
      head.add(stache);
    } else {
      hat = propellerCap(0xffd23a);
      hat.position.set(0, 0.29, 0);
      propeller = hat.userData.propeller;
    }
    head.add(hat);
    head.position.y = 1.55;
    squash.add(head);

    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return { root, squash, head, body, arms, legs, eyes, mouths: { smile, shocked }, propeller };
  }

  function create(scene, name, color, style, x, z) {
    const model = makeModel(color, style);
    scene.add(model.root);
    return {
      name, color, model,
      pos: new THREE.Vector3(x, 0, z), vel: new THREE.Vector3(), lastVel: new THREE.Vector3(),
      halfW: 0.4, height: 1.75, onGround: false, landSpeed: 0,
      facing: 0, walkTime: 0, spawn: new THREE.Vector3(x, 0, z),
      squash: 0, squashVel: 0, blinkTimer: 2 + Math.random() * 3, time: Math.random() * 10,
    };
  }

  // controls → speed and direction
  function control(r, input, dt) {
    const tx = input.x * WALK_SPEED, tz = input.z * WALK_SPEED;
    const grip = r.onGround ? 14 : 5; // less control in the air
    r.vel.x += (tx - r.vel.x) * Math.min(1, grip * dt);
    r.vel.z += (tz - r.vel.z) * Math.min(1, grip * dt);
    if (input.jumpPressed && r.onGround) {
      r.vel.y = JUMP_SPEED;
      r.squashVel += 9; // stretch up when jumping
    }
    if (Math.hypot(input.x, input.z) > 0.1) {
      const want = Math.atan2(input.x, input.z);
      r.facing += angleDiff(want, r.facing) * Math.min(1, 12 * dt);
    }
  }

  function angleDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  // googly pupils: they get thrown around when the robot speeds up or stops
  function wobbleEyes(r, dt) {
    const acc = r.vel.clone().sub(r.lastVel).divideScalar(Math.max(dt, 0.001));
    // turn the push into the robot's own left/right
    const cos = Math.cos(r.facing), sin = Math.sin(r.facing);
    const side = acc.x * cos - acc.z * sin;
    for (const eye of r.model.eyes) {
      const e = eye.userData;
      const limit = e.size * 0.45;
      e.vx += (-side * 0.004 - e.px * 60 - e.vx * 3) * dt;
      e.vy += (-acc.y * 0.002 - 9 * 0.02 - e.py * 60 - e.vy * 3) * dt; // gravity pulls it down a bit
      e.px += e.vx * dt * 10;
      e.py += e.vy * dt * 10;
      const len = Math.hypot(e.px, e.py);
      if (len > limit) { e.px *= limit / len; e.py *= limit / len; e.vx *= -0.5; e.vy *= -0.5; }
      e.pupil.position.x = e.px;
      e.pupil.position.y = e.py;
    }
  }

  // put the model where the robot is, and make it move in a silly way
  function animate(r, dt, friend) {
    const m = r.model;
    r.time += dt;
    const speed = Math.hypot(r.vel.x, r.vel.z);
    if (r.onGround && speed > 0.5) r.walkTime += dt * speed * 2.4;
    const walk = r.onGround ? Math.min(1, speed / WALK_SPEED) : 0;
    const wob = Math.sin(r.walkTime) * walk;

    // bouncy waddle
    m.root.position.copy(r.pos);
    m.root.position.y += Math.abs(Math.sin(r.walkTime)) * 0.12 * walk;
    m.root.rotation.y = r.facing;
    m.root.rotation.z = wob * 0.14;
    m.arms[0].rotation.x = wob * 0.9;
    m.arms[1].rotation.x = -wob * 0.9;
    // arms flap up when in the air
    const flap = r.onGround ? 0 : 1.6 + Math.sin(r.time * 25) * 0.3;
    m.arms[0].rotation.z = -0.3 - flap;
    m.arms[1].rotation.z = 0.3 + flap;
    m.legs.children.forEach((p, i) => { p.position.z = (i < 2 ? 1 : -1) * wob * 0.12 + (i % 2 ? 0.08 : 0); });

    // squash when landing, stretch when jumping (a springy wobble)
    if (r.landSpeed > 4) { r.squashVel -= r.landSpeed * 0.9; }
    r.landSpeed = 0;
    r.squashVel += (-r.squash * 180 - r.squashVel * 9) * dt;
    r.squash += r.squashVel * dt;
    const s = THREE.MathUtils.clamp(r.squash * 0.05, -0.35, 0.35);
    m.squash.scale.set(1 - s * 0.6, 1 + s, 1 - s * 0.6);

    // look at your friend when standing still
    let look = 0;
    if (friend && speed < 0.5) {
      const want = Math.atan2(friend.pos.x - r.pos.x, friend.pos.z - r.pos.z);
      look = THREE.MathUtils.clamp(angleDiff(want, r.facing), -0.7, 0.7);
    }
    m.head.rotation.y += (look - m.head.rotation.y) * Math.min(1, 5 * dt);
    m.head.rotation.z = -wob * 0.18;

    // blink every few seconds
    r.blinkTimer -= dt;
    const blink = r.blinkTimer < 0.12;
    if (r.blinkTimer < 0) r.blinkTimer = 2 + Math.random() * 4;
    for (const eye of m.eyes) eye.scale.y = blink ? 0.1 : 1;
    wobbleEyes(r, dt);

    // shocked face when falling fast
    const scared = !r.onGround && r.vel.y < -7;
    m.mouths.smile.visible = !scared;
    m.mouths.shocked.visible = scared;

    // Bolt's propeller spins, super fast in the air
    if (m.propeller) m.propeller.rotation.y += dt * (r.onGround ? 3 + speed * 2 : 30);

    r.lastVel.copy(r.vel);
  }

  return { create, control, animate };
})();
