// ============================================================
//  JETPACK CITY — MEGA-BOT, the giant robot chasing you
//  Normally it is far behind you (you only hear it stomping).
//  When you bump into something it catches up and reaches for
//  you with its giant hand. Bump into something again while it
//  is close... and it GRABS you!
// ============================================================
window.JC = window.JC || {};

JC.Chaser = (function () {
  const U = JC.U;
  const FAR = 42, NEAR = 11;          // how far behind you MEGA-BOT walks
  const c = { dist: 16, closeT: 0, mode: 'title', step: 0, lastStep: 0, grabT: 0, x: 0, reach: 0, crouch: 0, lift: 0, grip: 0, roared: false, done: false };
  let bot, ev = {};
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  function init(scene, events) {
    ev = events;
    bot = JC.Models.megabot();
    scene.add(bot.root);
    scene.add(bot.beam);
  }

  function reset(mode) {
    Object.assign(c, { dist: 15, closeT: 0, mode: mode || 'chase', grabT: 0, reach: 0, crouch: 0, lift: 0, grip: 0, roared: false, done: false });
  }

  // you bumped into something! Returns true if MEGA-BOT catches you.
  function bump() {
    if (c.closeT > 0) return true;
    c.closeT = JC.SETTINGS.stumbleTime;
    ev.taunt && ev.taunt();
    return false;
  }
  function startGrab() { c.mode = 'grab'; c.grabT = 0; c.roared = false; c.done = false; }
  const isClose = () => c.closeT > 0;

  // ---------------- every frame ----------------
  function update(dt, t, P, hero) {
    const pz = -P.d;
    let walk = 0;
    if (c.mode === 'chase') {
      if (c.closeT > 0) { c.closeT -= dt; if (c.closeT <= 0) ev.retreat && ev.retreat(); }
      c.dist = U.damp(c.dist, c.closeT > 0 ? NEAR : FAR, c.closeT > 0 ? 2.2 : 0.5, dt);
      c.reach = U.damp(c.reach, c.closeT > 0 ? 1 : 0, 3, dt);
      c.x = U.damp(c.x, P.x - 3.3 * c.reach, 4, dt);
      walk = 1;
      c.crouch = U.damp(c.crouch, 0, 3, dt); c.lift = 0; c.grip = 0;
    } else if (c.mode === 'grab') {
      c.grabT += dt;
      const g = c.grabT;
      c.dist = U.damp(c.dist, 4.8, 3, dt);
      c.x = U.damp(c.x, P.x - 3.3, 5, dt);
      walk = g < 0.9 ? 1 : 0;
      c.crouch = U.damp(c.crouch, g < 1.5 ? 1 : 0, 4, dt);
      c.reach = 1;
      c.grip = U.damp(c.grip, g > 1.0 ? 1 : 0, 10, dt);
      c.lift = U.damp(c.lift, g > 1.5 ? 1 : 0, 2.5, dt);
      if (g > 1.0 && !c.roared) { c.roared = true; ev.grab && ev.grab(); }
      if (g > 2.9 && !c.done) { c.done = true; ev.caught && ev.caught(); }
    } else { // title screen: standing behind the hero, looking down at them
      c.dist = 15; c.x = 0; c.reach = 0; c.crouch = 0; c.lift = 0; c.grip = 0;
    }

    // walking: big stomping steps
    const stepSpeed = c.mode === 'chase' ? 2.2 + P.speed * 0.12 : 2.6;
    if (walk) c.step += dt * stepSpeed;
    const ph = c.step;
    const s = walk ? Math.sin(ph) : 0;
    bot.root.position.set(c.x, 0, pz + c.dist);
    bot.hips.position.y = 6.3 - c.crouch * 1.6 - (walk ? Math.abs(Math.cos(ph)) * 0.35 : Math.sin(t * 1.5) * 0.08);
    bot.legs.forEach((l, i) => {
      const k = i ? -s : s;
      l.hip.rotation.x = k * 0.45 + c.crouch * 0.9;
      l.kn.rotation.x = -Math.max(0, i ? Math.cos(ph) : -Math.cos(ph)) * 0.7 * walk - c.crouch * 1.3;
    });
    bot.torso.rotation.x = -0.12 * walk - c.crouch * 0.35 + c.lift * 0.15;
    bot.torso.rotation.y = walk ? Math.sin(ph) * 0.06 : 0;
    // footsteps
    const stepNow = Math.floor(ph / Math.PI);
    if (walk && stepNow !== c.lastStep) {
      c.lastStep = stepNow;
      const loud = U.clamp(1 - (c.dist - 8) / 38, 0.08, 1);
      ev.stomp && ev.stomp(loud);
    }

    // arms: the left one swings, the right one reaches for you
    const L = bot.arms[0], R = bot.arms[1];
    L.sh.rotation.set(-s * 0.35 + (c.mode === 'title' ? 0.1 : 0), 0, -0.08);
    L.el.rotation.x = 0.35;
    let shx = U.lerp(s * 0.35, 1.3 + Math.sin(t * 3) * 0.08, c.reach);
    let elx = U.lerp(0.35, -0.7, c.reach);
    if (c.mode === 'grab') {
      // reach down to the ground, then lift you up to its face
      shx = U.lerp(U.lerp(1.0, 0.55, c.crouch), 1.35, c.lift);
      elx = U.lerp(-0.25, 1.2, c.lift);
    }
    R.sh.rotation.set(shx, 0, 0.05);
    R.el.rotation.x = elx;
    const open = c.mode === 'grab' ? 1 - c.grip : c.reach * (0.6 + Math.sin(t * 5) * 0.4);
    for (const arm of bot.arms) {
      for (const f of arm.fingers) f.rotation.x = (f.userData.back ? 1 : -1) * U.lerp(-0.25, 0.7, arm === R ? open : 0.2);
    }

    // head looks at you, the eye glows and blinks
    bot.head.rotation.x = c.mode === 'title' ? -0.35 : c.mode === 'grab' ? -0.1 - c.crouch * 0.4 + c.lift * 0.1 : -0.2 - c.reach * 0.2;
    const angry = c.reach > 0.3 || c.mode === 'grab';
    bot.eyeGlow.material.opacity = angry ? 0.7 + Math.sin(t * 20) * 0.3 : 0.55 + Math.sin(t * 2) * 0.15;
    bot.antenna.visible = Math.floor(t * 3) % 2 === 0;
    bot.chest.scale.set(0.75 + Math.sin(t * 4) * 0.05, 0.1, 0.75 + Math.sin(t * 4) * 0.05);

    // red search light pointing at you
    const beamOn = c.mode === 'title' ? 1 : 0;
    bot.beam.visible = beamOn > 0.05;
    if (bot.beam.visible) {
      bot.visor.getWorldPosition(tmp);
      bot.beam.position.copy(tmp);
      tmp2.set(P.x, P.y + 0.6, pz);
      bot.beam.lookAt(tmp2);
      bot.beam.scale.set(1, 1, tmp.distanceTo(tmp2) / 16);
      bot.beam.material.opacity = 0.13 * beamOn;
    }

    // hold the hero in the giant hand
    if (c.mode === 'grab' && c.grip > 0.5 && hero) {
      R.hand.getWorldPosition(tmp);
      hero.root.position.set(tmp.x, tmp.y - 2.4, tmp.z);
      hero.shadow.visible = false;
    } else if (hero) hero.shadow.visible = true;
  }

  function handWorld(out) { return bot.arms[1].hand.getWorldPosition(out); }
  function headWorld(out) { return bot.head.getWorldPosition(out); }

  return { init, reset, update, bump, startGrab, isClose, handWorld, headWorld, state: c };
})();
