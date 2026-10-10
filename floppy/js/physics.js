// ============================================================
//  FLOPPY PARTY — PHYSICS WORLD (cannon-es)
//  Collision groups: the world, props, and one group for each
//  character, so a character's own parts don't bump each other.
// ============================================================
window.FP = window.FP || {};

FP.Physics = (function () {
  const GROUP = { WORLD: 1, PROP: 2, NPC: 4, CHAR0: 8 }; // characters use 8, 16, 32, 64, ...
  const ALL = 0xffff;
  const STEP = 1 / 60;

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -25, 0) });
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = false;
  world.solver.iterations = 12;
  world.defaultContactMaterial.friction = 0.4;
  world.defaultContactMaterial.restitution = 0.05;

  // materials: slippery characters, grippy floor, bouncy ball
  const mats = {
    floor: new CANNON.Material('floor'),
    char: new CANNON.Material('char'),
    ball: new CANNON.Material('ball'),
    prop: new CANNON.Material('prop'),
    ice: new CANNON.Material('ice'),
  };
  world.addContactMaterial(new CANNON.ContactMaterial(mats.char, mats.floor, { friction: 0.05, restitution: 0 }));
  world.addContactMaterial(new CANNON.ContactMaterial(mats.char, mats.char, { friction: 0.2, restitution: 0.1 }));
  world.addContactMaterial(new CANNON.ContactMaterial(mats.ball, mats.floor, { friction: 0.4, restitution: 0.7 }));
  world.addContactMaterial(new CANNON.ContactMaterial(mats.ball, mats.char, { friction: 0.3, restitution: 0.6 }));
  world.addContactMaterial(new CANNON.ContactMaterial(mats.prop, mats.floor, { friction: 0.5, restitution: 0.1 }));
  world.addContactMaterial(new CANNON.ContactMaterial(mats.ice, mats.char, { friction: 0, restitution: 0 }));

  const charGroup = (i) => GROUP.CHAR0 << i;

  // a solid, not-moving box (floors, walls). Returns the body.
  function staticBox(x, y, z, w, h, d, material = mats.floor) {
    const body = new CANNON.Body({
      mass: 0, material, type: CANNON.Body.STATIC,
      collisionFilterGroup: GROUP.WORLD, collisionFilterMask: ALL,
    });
    body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
    body.position.set(x, y, z);
    world.addBody(body);
    return body;
  }

  // a box that can move but is pushed around by code (moving platforms, falling tiles)
  function kinematicBox(x, y, z, w, h, d) {
    const body = new CANNON.Body({
      mass: 0, material: mats.floor, type: CANNON.Body.KINEMATIC,
      collisionFilterGroup: GROUP.WORLD, collisionFilterMask: ALL,
    });
    body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
    body.position.set(x, y, z);
    world.addBody(body);
    return body;
  }

  // what's straight below a point? (for standing). `ignoreGroup` = the character's own group
  const ray = new CANNON.RaycastResult();
  function groundBelow(from, length, ignoreGroup) {
    ray.reset();
    const to = new CANNON.Vec3(from.x, from.y - length, from.z);
    world.raycastClosest(from, to, { collisionFilterMask: ALL & ~ignoreGroup & ~GROUP.NPC, skipBackfaces: true }, ray);
    return ray.hasHit ? { y: ray.hitPointWorld.y, dist: from.y - ray.hitPointWorld.y, body: ray.body, normal: ray.hitNormalWorld.clone() } : null;
  }

  function step() { world.step(STEP); }

  function clear() {
    for (const c of world.constraints.slice()) world.removeConstraint(c);
    for (const b of world.bodies.slice()) world.removeBody(b);
  }

  return { world, GROUP, ALL, STEP, mats, charGroup, staticBox, kinematicBox, groundBelow, step, clear };
})();
