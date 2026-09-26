// ============================================================
//  SPARE PARTS — SIMPLE PHYSICS
//  Everything solid is a box. A body is a box too, with its
//  position at the middle of its feet.
// ============================================================
window.SP = window.SP || {};

SP.Physics = (function () {
  const GRAVITY = 30;

  // a solid box from its center and size
  function box(x, y, z, w, h, d) {
    return { min: { x: x - w / 2, y: y - h / 2, z: z - d / 2 }, max: { x: x + w / 2, y: y + h / 2, z: z + d / 2 } };
  }

  // the box a body takes up right now
  function bodyBox(b) {
    return {
      min: { x: b.pos.x - b.halfW, y: b.pos.y, z: b.pos.z - b.halfW },
      max: { x: b.pos.x + b.halfW, y: b.pos.y + b.height, z: b.pos.z + b.halfW },
    };
  }

  const overlap = (a, c) =>
    a.min.x < c.max.x && a.max.x > c.min.x &&
    a.min.y < c.max.y && a.max.y > c.min.y &&
    a.min.z < c.max.z && a.max.z > c.min.z;

  // move one axis at a time and push the body out of anything it hits
  function moveAxis(b, axis, amount, solids) {
    if (amount === 0) return false;
    b.pos[axis] += amount;
    let hit = false;
    const me = bodyBox(b);
    for (const s of solids) {
      if (s === b.solid || !overlap(me, s)) continue;
      hit = true;
      if (axis === 'y') {
        b.pos.y = amount > 0 ? s.min.y - b.height : s.max.y;
      } else {
        b.pos[axis] = amount > 0 ? s.min[axis] - b.halfW : s.max[axis] + b.halfW;
      }
      me.min[axis] = axis === 'y' ? b.pos.y : b.pos[axis] - b.halfW;
      me.max[axis] = axis === 'y' ? b.pos.y + b.height : b.pos[axis] + b.halfW;
    }
    return hit;
  }

  // one physics step for a body: gravity, then move and collide
  function step(b, dt, solids) {
    b.vel.y -= GRAVITY * dt;
    const hits = { x: moveAxis(b, 'x', b.vel.x * dt, solids), z: moveAxis(b, 'z', b.vel.z * dt, solids) };
    const wasFalling = b.vel.y < 0;
    b.onGround = false;
    if (moveAxis(b, 'y', b.vel.y * dt, solids)) {
      if (wasFalling) b.onGround = true;
      b.landSpeed = -b.vel.y;
      b.vel.y = 0;
    }
    return hits;
  }

  return { GRAVITY, box, bodyBox, overlap, step };
})();
