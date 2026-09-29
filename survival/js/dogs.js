// ============================================================
//  DEAD ACRES — DOG BUDDIES 🐕
//  Three dogs are hiding in the world. Find one and press E
//  to make friends. Your dog follows you, barks when zombies
//  come, and bites them! Press E again to make it sit / follow.
// ============================================================
window.DA = window.DA || {};

// the dogs: change their names, colors, or where they wait for you
DA.DOGS = [
  { name: 'Rex', x: -140, z: 176, color: 0x9a6a3a },      // at Hollow Farm, next to the barn
  { name: 'Luna', x: 157, z: 199, color: 0x3a3a3a },      // at the hunter's cabin
  { name: 'Biscuit', x: 133, z: -6, color: 0xd8b070 },    // behind the gas station
];

DA.Dogs = (function () {
  const U = DA.U, C = DA.Collide;
  let W, scene, A;
  const list = [];            // { i, name, x, y, z, ry, anim, owner, sit, avatar... }
  const BITE = 16;            // damage of one bite

  // ---------- the body you see ----------
  function makeAvatar(d) {
    const h = DA.Models.People.dog(DA.DOGS[d.i].color);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: DA.Tex.nameTag(d.name, '#ffd890'), transparent: true, depthTest: false }));
    tag.scale.set(1.2, 0.3, 1); tag.position.y = 1.25; tag.renderOrder = 5;
    h.root.add(tag);
    scene.add(h.root);
    return { p: h, root: h.root, phase: Math.random() * 6, prevAnim: 0, tx: d.x, ty: d.y, tz: d.z, try: 0 };
  }

  function animate(d, dt) {
    const a = d.avatar, p = a.p;
    if (d.anim !== a.prevAnim) { if (d.anim === 3 || (d.anim === 2 && a.prevAnim !== 3)) A.bark(d.x, d.z); a.prevAnim = d.anim; }
    const speed = d.anim === 2 || d.anim === 3 ? 14 : d.anim === 1 ? 7 : 0;
    a.phase += dt * (speed || 2);
    const L = d.anim >= 2 ? 0.8 : d.anim === 1 ? 0.45 : 0;
    p.legs.forEach((g, i) => (g.rotation.x = Math.sin(a.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? 0.6 : 0)) * L));
    p.tail.rotation.y = Math.sin(performance.now() / 90) * (d.anim === 3 ? 0.2 : 0.7); // wag wag
    p.body.position.y = d.anim >= 2 ? Math.abs(Math.sin(a.phase)) * 0.08 : 0;
    p.head.rotation.x = d.anim === 3 ? Math.sin(a.phase * 1.5) * 0.4 : 0;
    // sitting
    // sitting: back end down, front legs straight
    const sit = d.sit && d.anim === 0;
    const k = Math.min(1, dt * 8);
    p.body.rotation.x += ((sit ? 0.5 : 0) - p.body.rotation.x) * k;
    p.body.position.y += ((sit ? -0.12 : p.body.position.y) - p.body.position.y) * k;
    if (sit) { p.legs[0].rotation.x = p.legs[1].rotation.x = -0.5; p.legs[2].rotation.x = p.legs[3].rotation.x = -1.3; }
  }

  // ---------- host: the dog brain ----------
  function ownerOf(d) {
    if (!d.owner) return null;
    for (const p of DA.Game.players.values()) if (p.name === d.owner) return p;
    return null;
  }

  function move(d, tx, tz, speed, dt) {
    const dx = tx - d.x, dz = tz - d.z, dist = Math.hypot(dx, dz);
    if (dist < 0.05) return;
    const step = Math.min(dist, speed * dt);
    let nx = d.x + dx / dist * step, nz = d.z + dz / dist * step;
    [nx, nz] = C.resolve(nx, nz, 0.25, d.y, d.y + 0.8);
    if (W.inside(nx, nz)) { d.x = nx; d.z = nz; }
    d.ry += U.angleDiff(d.ry, Math.atan2(-dx, -dz)) * Math.min(1, dt * 10);
  }

  function hostUpdate(d, dt) {
    const o = ownerOf(d);
    d.biteT -= dt;
    d.anim = 0;
    if (o && o.alive && !o.inHeli && !d.sit) {
      // far away? run to your owner (dogs are good at finding you)
      if (U.dist(d.x, d.z, o.x, o.z) > 45) { d.x = o.x + U.rand(-2, 2); d.z = o.z + U.rand(-2, 2); }
      // a zombie near my owner? get it!
      if (!d.target || d.target.state === 'dead' || !DA.Zombies.zombies.has(d.target.id) || U.dist(d.target.x, d.target.z, o.x, o.z) > 20) {
        d.target = null;
        let best = 12;
        for (const zb of DA.Zombies.zombies.values()) {
          if (zb.state === 'dead') continue;
          const dd = U.dist(zb.x, zb.z, d.x, d.z);
          if (dd < best && U.dist(zb.x, zb.z, o.x, o.z) < 18) { best = dd; d.target = zb; }
        }
      }
      if (d.target) {
        const zb = d.target, dd = U.dist(zb.x, zb.z, d.x, d.z);
        if (dd > 1.3) { move(d, zb.x, zb.z, 7.5, dt); d.anim = 2; }
        else {
          d.anim = 3;
          d.ry += U.angleDiff(d.ry, Math.atan2(-(zb.x - d.x), -(zb.z - d.z))) * Math.min(1, dt * 10);
          if (d.biteT <= 0) { d.biteT = 0.9; DA.Zombies.hit(zb.id, BITE, (zb.x - d.x) / (dd || 1) * 0.6, (zb.z - d.z) / (dd || 1) * 0.6, o.pid); }
        }
      } else {
        // stay close, a bit behind
        const bx = o.x + Math.sin(o.yaw || 0) * 1.8 + Math.cos(o.yaw || 0) * 0.8, bz = o.z + Math.cos(o.yaw || 0) * 1.8 - Math.sin(o.yaw || 0) * 0.8;
        const dd = U.dist(bx, bz, d.x, d.z);
        if (dd > 1) { move(d, bx, bz, dd > 5 ? 7.5 : 3.5, dt); d.anim = dd > 5 ? 2 : 1; }
      }
    } else {
      d.target = null;
      // no owner around: sniff about near home (or sit where you were told)
      if (!d.sit) {
        d.wanderT = (d.wanderT || 0) - dt;
        if (d.wanderT <= 0) { d.wanderT = U.rand(3, 8); const h = d.owner ? { x: d.x, z: d.z } : DA.DOGS[d.i]; d.wx = h.x + U.rand(-3, 3); d.wz = h.z + U.rand(-3, 3); }
        if (U.dist(d.wx, d.wz, d.x, d.z) > 0.4) { move(d, d.wx, d.wz, 1.6, dt); d.anim = 1; }
      }
    }
    d.y = Math.max(W.heightAt(d.x, d.z), C.groundAt(d.x, d.z, 0.25, d.y));
    // bark at zombies that come close, even when sitting (a good guard dog!)
    d.barkT = (d.barkT || 0) - dt;
    if (d.barkT <= 0) {
      d.barkT = 2.5;
      for (const zb of DA.Zombies.zombies.values()) if (zb.state !== 'dead' && U.dist(zb.x, zb.z, d.x, d.z) < 14) { A.bark(d.x, d.z); break; }
    }
    // remember it (for saving)
    const st = DA.Game.state.dogs[d.i];
    st.x = U.round(d.x); st.z = U.round(d.z); st.owner = d.owner; st.sit = d.sit;
  }

  const D = {
    list,
    init(world, sc) { W = world; scene = sc; A = DA.Audio; },

    // (re)make the dogs from the saved state
    load(state) {
      D.clear();
      state.dogs = state.dogs || {};
      DA.DOGS.forEach((def, i) => {
        const st = state.dogs[i] = state.dogs[i] || { x: def.x, z: def.z, owner: '', sit: false };
        const d = { i, name: def.name, x: st.x, z: st.z, y: W.heightAt(st.x, st.z), ry: 0, anim: 0, owner: st.owner || '', sit: !!st.sit, biteT: 0 };
        d.avatar = makeAvatar(d);
        d.avatar.root.position.set(d.x, d.y, d.z);
        list.push(d);
      });
    },
    clear() { for (const d of list) scene.remove(d.avatar.root); list.length = 0; },

    update(dt, isHost) {
      for (const d of list) {
        if (isHost) hostUpdate(d, dt);
        const r = d.avatar.root;
        if (isHost) { r.position.set(d.x, d.y, d.z); r.rotation.y = d.ry; }
        else {
          const k = Math.min(1, dt * 10);
          if (r.position.distanceToSquared(new THREE.Vector3(d.x, d.y, d.z)) > 900) r.position.set(d.x, d.y, d.z);
          r.position.x += (d.x - r.position.x) * k; r.position.y += (d.y - r.position.y) * k; r.position.z += (d.z - r.position.z) * k;
          r.rotation.y += U.angleDiff(r.rotation.y, d.ry) * k;
        }
        animate(d, dt);
      }
    },

    snapshot() { return list.map((d) => [d.i, U.round(d.x), U.round(d.y), U.round(d.z), U.round(d.ry), d.anim, d.owner, d.sit ? 1 : 0]); },
    applySnapshot(arr) {
      for (const [i, x, y, z, ry, anim, owner, sit] of arr || []) {
        const d = list[i];
        if (!d) continue;
        Object.assign(d, { x, y, z, ry, anim, owner, sit: !!sit });
      }
    },

    // someone pressed E on a dog (host)
    interact(i, name) {
      const d = list[i];
      if (!d) return null;
      if (!d.owner) { d.owner = name; d.sit = false; A.bark(d.x, d.z); return `🐕 ${d.name} is now ${name}'s best friend!`; }
      if (d.owner === name) { d.sit = !d.sit; return d.sit ? `${d.name} sits and waits here.` : `${d.name} follows you!`; }
      return `${d.name} is ${d.owner}'s dog.`;
    },

    // which dog is the player looking at?
    rayTarget(ox, oy, oz, dx, dy, dz, maxD) {
      let best = null, bestD = maxD;
      for (const d of list) {
        const pos = d.avatar.root.position;
        const t = C.rayHit({ shape: 'circle', x: pos.x, z: pos.z, r: 0.5, y0: pos.y, y1: pos.y + 1 }, ox, oy, oz, dx, dy, dz, bestD);
        if (t >= 0 && t < bestD) { bestD = t; best = d; }
      }
      return best ? { d: best, dist: bestD } : null;
    },
  };
  return D;
})();
