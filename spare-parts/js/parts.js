// ============================================================
//  SPARE PARTS — ARMS AND LEGS THAT COME OFF
//  A limb is either stuck on a robot, flying through the air,
//  lying on the floor, or crawling back home to its owner.
//  A limb always listens to its OWNER, even on someone else!
// ============================================================
window.SP = window.SP || {};

SP.Parts = (function () {
  const MAX = 4;            // a robot can wear up to 4 arms and 4 legs
  const limbs = [];
  let scene = null;

  // where each limb goes on the body: [x, y, z]
  const SLOTS = {
    arm: [[-0.43, 1.02, 0], [0.43, 1.02, 0], [-0.4, 0.78, -0.1], [0.4, 0.78, -0.1]],
    leg: [[-0.2, 0.55, 0], [0.2, 0.55, 0], [-0.36, 0.55, -0.18], [0.36, 0.55, -0.18]],
  };

  function mat(color, shiny) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: shiny });
  }

  // an arm hangs down from the shoulder: a floppy noodle and a round mitten hand
  function makeArm(color) {
    const arm = new THREE.Group();
    const noodle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.5, 8), mat(0xb8c0c8, 0.5));
    noodle.position.y = -0.25;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), mat(color, 0.25));
    hand.position.y = -0.53;
    arm.add(noodle, hand);
    return arm;
  }

  // a leg hangs down from the hip: a springy noodle and a big clown foot
  function makeLeg(color) {
    const leg = new THREE.Group();
    const noodle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), mat(0xb8c0c8, 0.5));
    noodle.position.y = -0.23;
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), mat(color, 0.25));
    foot.scale.set(1, 0.55, 1.5);
    foot.position.set(0, -0.46, 0.08);
    leg.add(noodle, foot);
    return leg;
  }

  function init(s) { scene = s; }

  function createLimb(owner, type) {
    const part = type === 'arm' ? makeArm(owner.color) : makeLeg(owner.color);
    part.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const holder = new THREE.Group(); // carries the limb around when it's not on a robot
    const limb = {
      type, owner, part, holder, wearer: null, slot: -1, state: 'worn', age: 0,
      pos: new THREE.Vector3(), vel: new THREE.Vector3(), halfW: 0.2, height: 0.3, onGround: false, landSpeed: 0,
      spin: 0, thrower: null,
      wornTime: 0,       // how long it has been stuck on its wearer
      action: null,      // a slap or kick in progress
      grabbing: false,   // holding on (the wearer is stuck!)
      pulling: false,    // dragging the wearer toward the owner
    };
    limbs.push(limb);
    return limb;
  }

  const list = (robot, type) => (type === 'arm' ? robot.arms : robot.legs);
  const freeSlot = (robot, type) => list(robot, type).indexOf(null);
  const count = (robot, type) => list(robot, type).filter(Boolean).length;

  // stick a limb onto a robot (returns false if the robot is full)
  function attach(limb, robot) {
    const slot = freeSlot(robot, limb.type);
    if (slot < 0) return false;
    list(robot, limb.type)[slot] = limb;
    limb.wearer = robot;
    limb.slot = slot;
    limb.state = 'worn';
    limb.wornTime = 0;
    limb.action = null;
    limb.grabbing = limb.pulling = false;
    scene.remove(limb.holder);
    limb.part.position.set(...SLOTS[limb.type][slot]);
    limb.part.rotation.set(0, 0, limb.type === 'arm' ? Math.sign(SLOTS.arm[slot][0]) * 0.3 : 0);
    robot.model.squash.add(limb.part);
    robot.squashVel -= 6; // a little "boing" when it clicks on
    if (SP.Robot.onLimbsChanged) SP.Robot.onLimbsChanged(robot);
    return true;
  }

  // take a limb off whoever is wearing it and let it fly free
  function detach(limb) {
    const robot = limb.wearer;
    if (robot) {
      list(robot, limb.type)[limb.slot] = null;
      const world = new THREE.Vector3();
      limb.part.getWorldPosition(world);
      limb.pos.set(world.x, Math.max(robot.pos.y + 0.2, world.y - 0.4), world.z);
      limb.vel.copy(robot.vel);
      if (SP.Robot.onLimbsChanged) SP.Robot.onLimbsChanged(robot);
    }
    limb.wearer = null;
    limb.slot = -1;
    // lie the limb down inside its holder
    limb.part.position.set(0, 0.14, 0.28);
    limb.part.rotation.set(Math.PI / 2, 0, 0);
    limb.holder.add(limb.part);
    limb.holder.position.copy(limb.pos);
    limb.holder.rotation.set(0, robot ? robot.facing : 0, 0);
    scene.add(limb.holder);
    limb.age = 0;
  }

  // throw one of your OWN arms or legs forward (you can't throw away your friend's)
  function throwLimb(robot, type) {
    const worn = list(robot, type);
    let slot = -1;
    for (let i = MAX - 1; i >= 0; i--) if (worn[i] && worn[i].owner === robot) { slot = i; break; }
    if (slot < 0) return false;
    const limb = worn[slot];
    detach(limb);
    const dirX = Math.sin(robot.facing), dirZ = Math.cos(robot.facing);
    limb.vel.set(robot.vel.x + dirX * 9, 7, robot.vel.z + dirZ * 9);
    limb.state = 'flying';
    limb.thrower = robot;
    limb.spin = 14;
    robot.squashVel += 5;
    return true;
  }

  // call all your own limbs back home, even the ones your friend is wearing
  function recall(robot) {
    for (const limb of limbs) {
      if (limb.owner !== robot || limb.wearer === robot) continue;
      if (limb.wearer) { detach(limb); limb.vel.y = 6; }
      limb.state = 'returning';
      limb.age = 0;
    }
  }

  // your limbs that someone else is wearing right now
  function lent(owner, type) {
    return limbs.filter((l) => l.owner === owner && l.type === type && l.wearer && l.wearer !== owner);
  }

  // start a slap or a kick with a limb your friend is wearing
  function startAction(limb, type) {
    if (limb.action) return;
    limb.action = { type, t: 0, done: false, self: false };
  }

  // is this spot right in front of a robot?
  function inFront(robot, p, reach = 0.95) {
    const cx = robot.pos.x + Math.sin(robot.facing) * reach;
    const cz = robot.pos.z + Math.cos(robot.facing) * reach;
    return Math.hypot(p.x - cx, p.z - cz) < 0.85 && p.y > robot.pos.y - 0.6 && p.y < robot.pos.y + 2.2;
  }

  // the moment a slap or kick lands: hit whatever is in front
  function strike(limb, robots) {
    const w = limb.wearer;
    const dirX = Math.sin(w.facing), dirZ = Math.cos(w.facing);
    const power = limb.type === 'leg' ? 10 : 8;
    let hitSomething = false;
    for (const r of robots) {
      if (r === w || !inFront(w, r.pos)) continue;
      r.vel.x += dirX * power; r.vel.z += dirZ * power; r.vel.y = 6;
      r.dizzy = 1.3;
      hitSomething = true;
    }
    for (const l of limbs) {
      if (l.state === 'worn' || !inFront(w, l.pos)) continue;
      l.vel.set(dirX * power * 1.2, 6, dirZ * power * 1.2);
      l.state = 'flying'; l.spin = 15; l.thrower = w; l.age = 0;
      hitSomething = true;
    }
    if (limb.type === 'leg') {
      // a kick makes the wearer hop forward too
      w.vel.x += dirX * 4; w.vel.z += dirZ * 4;
      if (w.onGround) w.vel.y = 5;
    } else if (!hitSomething) {
      // nothing to slap... so it slaps its own wearer in the face!
      limb.action.self = true;
      w.dizzy = 0.9;
      w.vel.x -= dirX * 3; w.vel.z -= dirZ * 3;
    }
  }

  // things your limbs do to the robot wearing them, before it moves.
  // returns true if the robot is being held in place
  function beforeStep(robot, dt) {
    let held = false;
    for (const limb of [...robot.arms, ...robot.legs]) {
      if (!limb || limb.owner === robot) continue;
      if (limb.grabbing) held = true;
      if (limb.pulling) {
        const to = limb.owner.pos.clone().sub(robot.pos);
        to.y = 0;
        if (to.length() > 1.5) {
          to.normalize();
          robot.vel.x = to.x * 6;
          robot.vel.z = to.z * 6;
          robot.facing = Math.atan2(to.x, to.z);
        }
      }
    }
    if (held) robot.vel.set(0, 0, 0);
    return held;
  }

  // is the limb touching this robot?
  function touching(limb, robot, extra = 0) {
    const r = SP.Physics.bodyBox(robot);
    const p = limb.pos;
    return p.x > r.min.x - 0.35 - extra && p.x < r.max.x + 0.35 + extra &&
           p.z > r.min.z - 0.35 - extra && p.z < r.max.z + 0.35 + extra &&
           p.y > r.min.y - 0.4 && p.y < r.max.y + 0.2;
  }

  function update(dt, robots, solids) {
    for (const limb of limbs) {
      if (limb.state === 'worn') {
        limb.wornTime += dt;
        const a = limb.action;
        if (a) {
          a.t += dt;
          if (!a.done && a.t > 0.12) { a.done = true; strike(limb, robots); }
          if (a.t > 0.4) limb.action = null;
        }
        continue;
      }
      limb.age += dt;
      const owner = limb.owner;

      if (limb.state === 'returning') {
        const to = owner.pos.clone().sub(limb.pos);
        to.y = 0;
        const dist = to.length();
        if (limb.age > 3) {
          // stuck? just fly straight home through everything
          const home = owner.pos.clone().add(new THREE.Vector3(0, 1, 0)).sub(limb.pos);
          limb.pos.addScaledVector(home.normalize(), Math.min(home.length(), 14 * dt));
          limb.vel.set(0, 0, 0);
        } else {
          to.normalize();
          limb.vel.x = to.x * 7;
          limb.vel.z = to.z * 7;
          if (limb.onGround) limb.vel.y = 3.5; // little hops on the way home
          SP.Physics.step(limb, dt, solids);
        }
        limb.holder.rotation.y = Math.atan2(to.x, to.z) + Math.PI;
        limb.holder.rotation.x = Math.sin(limb.age * 20) * 0.3; // wiggle wiggle
        if (touching(limb, owner) || dist < 0.5) attach(limb, owner);
      } else {
        // flying or lying on the floor: bouncy physics
        const hits = SP.Physics.step(limb, dt, solids);
        if (hits.x) limb.vel.x *= -0.4;
        if (hits.z) limb.vel.z *= -0.4;
        if (limb.onGround) {
          if (limb.landSpeed > 3) limb.vel.y = limb.landSpeed * 0.35; // bounce!
          limb.landSpeed = 0;
          limb.vel.x *= Math.max(0, 1 - 7 * dt);
          limb.vel.z *= Math.max(0, 1 - 7 * dt);
          limb.spin *= Math.max(0, 1 - 8 * dt);
          if (limb.state === 'flying' && limb.vel.lengthSq() < 1) limb.state = 'loose';
        }
        limb.holder.rotation.x += limb.spin * dt;
        if (limb.onGround && Math.abs(limb.spin) < 1) limb.holder.rotation.x *= Math.max(0, 1 - 10 * dt);

        // bump into a robot → stick onto it (but not right back onto whoever threw it)
        for (const r of robots) {
          const justThrown = r === limb.thrower && limb.age < 0.6;
          if (!justThrown && touching(limb, r) && attach(limb, r)) break;
        }
      }

      // fell out of the world? go home
      if (limb.state !== 'worn' && limb.pos.y < -10) {
        limb.pos.copy(owner.pos).y += 1;
        limb.state = 'returning';
        limb.age = 3;
      }
      if (limb.state !== 'worn') limb.holder.position.copy(limb.pos);
    }
  }

  return { init, createLimb, attach, throwLimb, recall, update, count, lent, startAction, beforeStep, limbs, SLOTS };
})();
