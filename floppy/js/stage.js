// ============================================================
//  FLOPPY PARTY — THE STAGE
//  Renderer, sky, sunshine, clouds, and helpers for building
//  levels. Everything a level adds is removed by clear().
// ============================================================
window.FP = window.FP || {};

FP.Stage = (function () {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = FP.Look.skyTexture();
  scene.fog = new THREE.Fog(0xcfe9ff, 60, 160);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x9fc4ff, 1.5));
  const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 70 });
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);

  // clouds drifting far below and around (they stay between levels)
  const sky = new THREE.Group();
  for (let i = 0; i < 26; i++) {
    const c = FP.Look.cloud(1.5 + Math.random() * 2.5);
    const a = Math.random() * Math.PI * 2, r = 25 + Math.random() * 60;
    c.position.set(Math.cos(a) * r, -18 - Math.random() * 20 + (i % 4 === 0 ? 30 : 0), Math.sin(a) * r - 10);
    c.userData.speed = 0.3 + Math.random() * 0.6;
    sky.add(c);
  }
  scene.add(sky);

  // ------------------------------------------------------------
  const things = [];   // meshes the level added
  const bodies = [];   // physics bodies the level added
  const movers = [];   // [mesh, body] pairs that need syncing every frame

  function add(obj) { scene.add(obj); things.push(obj); return obj; }

  // a solid block that looks like a floating grassy island piece
  function island(x, y, z, w, h, d, opts = {}) {
    const body = FP.Physics.staticBox(x, y, z, w, h, d, opts.material);
    bodies.push(body);
    const m = FP.Look.islandBlock(w, h, d, opts.grass, opts.dirt);
    m.position.set(x, y, z);
    add(m);
    return { body, mesh: m };
  }

  // a plain colored solid block
  function block(x, y, z, w, h, d, color, opts = {}) {
    const body = opts.kinematic ? FP.Physics.kinematicBox(x, y, z, w, h, d) : FP.Physics.staticBox(x, y, z, w, h, d, opts.material);
    bodies.push(body);
    const m = FP.Look.boxMesh(w, h, d, FP.Look.toon(color, opts.unique ? { unique: true } : {}));
    m.position.set(x, y, z);
    add(m);
    if (opts.kinematic) movers.push([m, body]);
    return { body, mesh: m };
  }

  // something that moves with physics (a ball, a box, a treasure)
  function prop(mesh, body) {
    FP.Physics.world.addBody(body);
    bodies.push(body);
    add(mesh);
    movers.push([mesh, body]);
    return { mesh, body };
  }

  function update(dt, t, focus) {
    for (const [m, b] of movers) { m.position.copy(b.position); m.quaternion.copy(b.quaternion); }
    for (const c of sky.children) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 90) c.position.x = -90;
    }
    if (focus) {
      sun.position.set(focus.x + 12, focus.y + 25, focus.z + 14);
      sun.target.position.copy(focus);
    }
  }

  function clear() {
    for (const o of things) scene.remove(o);
    for (const b of bodies) if (FP.Physics.world.bodies.includes(b)) FP.Physics.world.removeBody(b);
    things.length = 0; bodies.length = 0; movers.length = 0;
  }

  function render(camera) { renderer.render(scene, camera); }
  function resize() { renderer.setSize(window.innerWidth, window.innerHeight); }

  return { renderer, scene, sun, add, island, block, prop, update, clear, render, resize, movers, bodies };
})();
