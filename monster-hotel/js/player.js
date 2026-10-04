// ============================================================
//  MONSTER HOTEL — YOU, THE BOSS (first person)
// ============================================================
window.MH = window.MH || {};

MH.Player = (function () {
  const U = MH.U, Mo = MH.Models, A = MH.Audio;
  const P = {};
  const EYE = { vampire: 1.72, werewolf: 1.68, mummy: 1.6, frankie: 1.95, witch: 1.66 };

  P.create = function (boss, scene, aspect) {
    P.boss = boss;
    P.info = MH.BOSSES.find((b) => b.id === boss);
    P.eye = EYE[boss] || 1.7;
    P.x = MH.World.playerStart.x; P.z = MH.World.playerStart.z;
    P.yaw = Math.PI; P.pitch = -0.05;  // look south at the lobby
    P.vx = 0; P.vz = 0;
    P.carry = [];
    P.cap = boss === 'frankie' ? 2 : 1;
    P.powerCd = 0; P.powerT = 0;
    P.bob = 0; P.stepT = 0; P.shake = 0;
    P.reach = 0; P.scrub = 0;
    if (!P.camera) P.camera = new THREE.PerspectiveCamera(72, aspect, 0.05, 120);
    // the hands live in their own little scene so they never poke through walls
    P.handScene = new THREE.Scene();
    P.handScene.environment = scene.environment;
    P.handScene.add(new THREE.HemisphereLight(0xd8c8ff, 0x3a2030, 1.4));
    const key = new THREE.DirectionalLight(0xffd8b0, 1.8); key.position.set(0.5, 1, 0.6); P.handScene.add(key);
    P.handLight = new THREE.PointLight(0xffa860, 0, 3, 2); P.handLight.position.set(0.3, 0.3, 0); P.handScene.add(P.handLight);
    P.handCam = new THREE.PerspectiveCamera(60, aspect, 0.01, 10);
    P.vm = Mo.viewModel(boss);
    P.handScene.add(P.vm);
    P.held = [];
    updateCamera();
  };

  P.holding = function () { return P.carry[0] || null; };
  P.pickUp = function (kind) {
    if (P.carry.length >= P.cap) return false;
    P.carry.push(kind);
    rebuildHeld();
    P.reach = 1;
    A.pickup();
    return true;
  };
  P.takeItem = function (kind) {
    const i = P.carry.indexOf(kind);
    if (i < 0) return false;
    P.carry.splice(i, 1);
    rebuildHeld();
    P.reach = 1;
    return true;
  };
  P.dropAll = function () {
    if (!P.carry.length) return false;
    P.carry.length = 0; rebuildHeld(); A.drop();
    return true;
  };
  function rebuildHeld() {
    for (const h of P.held) h.parent.remove(h);
    P.held = [];
    P.carry.forEach((k, i) => {
      const it = Mo.item(k);
      const hand = (i === 0 ? P.vm.userData.R : P.vm.userData.L).userData.hand;
      it.position.set(0, 0.014, -0.01);
      it.scale.setScalar(k === 'towel' || k === 'bone' ? 0.5 : 0.62);
      hand.add(it);
      P.held.push(it);
    });
  }

  P.forward = function () { return { x: -Math.sin(P.yaw) * Math.cos(P.pitch), y: Math.sin(P.pitch), z: -Math.cos(P.yaw) * Math.cos(P.pitch) }; };

  P.update = function (dt, inp, t, locked) {
    // --- looking around ---
    const sens = 0.0023;
    if (locked) { P.yaw -= inp.mx * sens; P.pitch -= inp.my * sens; }
    P.yaw -= inp.turn * dt * 2.6;
    P.pitch -= inp.look * dt * 2.0;
    P.pitch = U.clamp(P.pitch, -1.25, 1.2);
    // --- walking ---
    const bat = P.powerT > 0 && P.boss === 'vampire';
    let speed = inp.run ? (P.boss === 'werewolf' ? 7.8 : 6.6) : 4.3;
    if (bat) speed = 10;
    const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
    let mx = fx * inp.move + rx * inp.strafe, mz = fz * inp.move + rz * inp.strafe;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    const acc = Math.min(1, dt * 12);
    P.vx += (mx * speed - P.vx) * acc; P.vz += (mz * speed - P.vz) * acc;
    const p = { x: P.x + P.vx * dt, z: P.z + P.vz * dt };
    MH.World.collide(p, 0.32, false);
    // bump into guests
    for (const g of MH.Guests.list) { const dx = p.x - g.x, dz = p.z - g.z, d = Math.hypot(dx, dz); if (d < 0.6 && d > 0.001) { p.x = g.x + dx / d * 0.6; p.z = g.z + dz / d * 0.6; } }
    MH.World.collide(p, 0.32, false);
    const moved = Math.hypot(p.x - P.x, p.z - P.z);
    P.x = p.x; P.z = p.z;
    // --- footsteps and head bob ---
    const sp = moved / Math.max(dt, 0.001);
    if (sp > 0.5 && !bat) {
      P.bob += dt * sp * 2.1;
      P.stepT -= dt * sp;
      if (P.stepT <= 0) { P.stepT = P.boss === 'frankie' ? 1.9 : 1.6; if (P.boss === 'frankie') A.stomp(); else A.step(MH.World.zoneAt(P.x, P.z)); }
    }
    // --- powers ---
    P.powerCd = Math.max(0, P.powerCd - dt);
    P.powerT = Math.max(0, P.powerT - dt);
    P.reach = Math.max(0, P.reach - dt * 3);
    P.shake = Math.max(0, P.shake - dt * 2);
    updateCamera(t, sp, bat);
    animateHands(dt, t, sp, bat);
  };

  function updateCamera(t = 0, sp = 0, bat = false) {
    const c = P.camera;
    const bobY = bat ? Math.sin(t * 9) * 0.06 + 0.35 : Math.sin(P.bob * 2) * 0.035 * Math.min(1, sp / 3);
    const bobX = bat ? 0 : Math.cos(P.bob) * 0.025 * Math.min(1, sp / 3);
    const sh = P.shake * 0.05;
    c.position.set(P.x + Math.cos(P.yaw) * bobX + (Math.random() - 0.5) * sh, P.eye + bobY + (Math.random() - 0.5) * sh, P.z - Math.sin(P.yaw) * bobX);
    c.rotation.order = 'YXZ';
    c.rotation.set(P.pitch, P.yaw, bat ? Math.sin(t * 3) * 0.08 : 0);
  }

  function animateHands(dt, t, sp, bat) {
    const v = P.vm.userData;
    const walk = Math.min(1, sp / 4);
    const sway = Math.sin(P.bob) * 0.012 * walk, lift = Math.abs(Math.cos(P.bob)) * 0.012 * walk;
    v.R.visible = v.L.visible = !bat;
    v.wings.visible = bat;
    if (bat) {
      const f = Math.sin(t * 22);
      if (v.wings.userData.l) { v.wings.userData.l.rotation.z = 0.4 + f * 0.6; v.wings.userData.r.rotation.z = -0.4 - f * 0.6; }
      return;
    }
    // right hand: holds things in front of you
    const holdR = P.carry.length > 0;
    const holdL = P.carry.length > 1;
    const reach = P.reach;
    const scrub = P.scrub > 0 ? 1 : 0;
    const sx = Math.sin(t * 14) * 0.05 * scrub, sy = Math.cos(t * 14) * 0.03 * scrub;
    const tr = holdR ? { x: 0.14, y: -0.15, z: -0.4 } : { x: 0.19, y: -0.2, z: -0.4 };
    const tl = holdL ? { x: -0.14, y: -0.15, z: -0.4 } : { x: -0.19, y: -0.21, z: -0.4 };
    if (scrub) { tr.x = 0.1; tr.y = -0.3; tr.z = -0.4; tl.x = -0.1; tl.y = -0.3; tl.z = -0.4; }
    const k = Math.min(1, dt * 12);
    v.R.position.x += (tr.x + sway + sx - v.R.position.x) * k;
    v.R.position.y += (tr.y - lift + sy - v.R.position.y) * k;
    v.R.position.z += (tr.z - reach * 0.12 - v.R.position.z) * k;
    v.L.position.x += (tl.x + sway - sx - v.L.position.x) * k;
    v.L.position.y += (tl.y - lift - sy - v.L.position.y) * k;
    v.L.position.z += (tl.z - v.L.position.z) * k;
    v.R.rotation.set(holdR ? 0.3 : 0.4 + Math.sin(t * 1.5) * 0.02, holdR ? 0.15 : 0.3, holdR ? 0 : -0.4);
    v.L.rotation.set(holdL ? 0.3 : 0.4 + Math.cos(t * 1.4) * 0.02, holdL ? -0.15 : -0.3, holdL ? 0 : 0.4);
    // curl the fingers a little when not holding anything
    for (const [arm, hold] of [[v.R, holdR], [v.L, holdL]]) {
      arm.userData.fingers.forEach((f, i) => { f.rotation.x = hold ? -0.15 : -(0.55 + i * 0.08 + Math.sin(t * 2 + i) * 0.03); });
    }
    for (const it of P.held) {
      it.rotation.y = Math.sin(t * 1.3) * 0.1;
      it.traverse((o) => { if (o.userData && o.userData.wobble) o.scale.set(1 + Math.sin(t * 9) * 0.05, 1 - Math.sin(t * 9) * 0.05, 1 + Math.sin(t * 9) * 0.05); });
    }
    P.handLight.intensity = P.nearLight || 0;
  }

  P.resize = function (aspect) { if (P.camera) { P.camera.aspect = aspect; P.camera.updateProjectionMatrix(); } if (P.handCam) { P.handCam.aspect = aspect; P.handCam.updateProjectionMatrix(); } };
  return P;
})();
