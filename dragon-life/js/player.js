// ============================================================
//  DRAGON LIFE — YOU!
//  Walking, running, jumping, swimming, and the camera that
//  follows you (or your dragon when you ride it).
// ============================================================
window.DL = window.DL || {};

DL.Player = (function () {
  const U = DL.U;
  const In = () => DL.Input;
  const W = () => DL.World;

  const P = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), vy: 0,
    yaw: 0, camYaw: 0, camPitch: -0.15, camDist: 6.5,
    onGround: true, swimming: false, riding: false, sitting: false,
    swing: 0, pet: 0, wave: 0, speed: 0, rodTip: new THREE.Vector3(),
    model: null, stepT: 0,
  };
  let camera;
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();

  function init(cam, scene) {
    camera = cam;
    P.model = DL.Models.human({ shirt: 0x3d7fd6, pants: 0x4a3a2a, hair: 0x5a3417, hairStyle: 'spiky', bag: true });
    P.model.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(P.model.root);
  }

  function spawn(x, z, yaw) {
    P.pos.set(x, W().groundAt(x, z, 100), z);
    P.vel.set(0, 0, 0); P.vy = 0;
    P.yaw = yaw; P.camYaw = yaw; P.camPitch = -0.15;
    P.riding = false; P.swimming = false;
    camPos.set(x - Math.sin(yaw) * 6, P.pos.y + 3, z - Math.cos(yaw) * 6);
  }

  // turn the camera with the mouse
  function look(l) {
    const sens = 0.0024 * DL.settings.sens;
    P.camYaw -= l.x * sens;
    P.camPitch -= l.y * sens * (DL.settings.invertY ? -1 : 1);
    P.camPitch = U.clamp(P.camPitch, P.riding ? -1.0 : -1.25, P.riding ? 0.9 : 0.75);
  }

  function update(dt) {
    const I = In();
    if (I.consume('wheelUp')) P.camDist = Math.max(3, P.camDist - 0.8);
    if (I.consume('wheelDown')) P.camDist = Math.min(14, P.camDist + 0.8);
    P.swing = P.swing > 0 ? P.swing + dt / 0.45 : 0;
    if (P.swing >= 1) P.swing = 0;
    P.pet = Math.max(0, P.pet - dt);
    P.wave = Math.max(0, P.wave - dt);

    if (P.riding) { rideUpdate(dt); return; }
    // ---- walking ----
    let mx = (I.down('right') ? 1 : 0) - (I.down('left') ? 1 : 0);
    let mz = (I.down('fwd') ? 1 : 0) - (I.down('back') ? 1 : 0);
    if (P.busy) mx = mz = 0;
    const fx = Math.sin(P.camYaw), fz = Math.cos(P.camYaw);
    const rx = -Math.cos(P.camYaw), rz = Math.sin(P.camYaw);
    let dx = fx * mz + rx * mx, dz = fz * mz + rz * mx;
    const len = Math.hypot(dx, dz);
    if (len > 0) { dx /= len; dz /= len; }
    const hungry = DL.Items.food <= 0 ? 0.7 : 1;
    let max = P.swimming ? 3 : (I.down('run') ? 8.5 : 4.6) * hungry;
    const fishing = DL.Items.fish.state !== 'idle';
    if (fishing) max = 0;
    const accel = P.onGround || P.swimming ? 12 : 3;
    P.vel.x = U.damp(P.vel.x, dx * max, accel, dt);
    P.vel.z = U.damp(P.vel.z, dz * max, accel, dt);
    P.speed = Math.hypot(P.vel.x, P.vel.z);
    if (len > 0 && !fishing) P.yaw = U.dampAngle(P.yaw, Math.atan2(dx, dz), 12, dt);
    // face where you work
    if (P.swing > 0 || fishing) P.yaw = U.dampAngle(P.yaw, P.camYaw, 14, dt);

    P.pos.x += P.vel.x * dt;
    P.pos.z += P.vel.z * dt;
    // the sea goes on forever... but you shouldn't swim away forever
    const cx = P.pos.x - 60, cz = P.pos.z - 30;
    const far = Math.hypot(cx, cz);
    if (far > 1050) { P.pos.x = 60 + cx / far * 1050; P.pos.z = 30 + cz / far * 1050; if (Math.random() < 0.02) DL.Hud.toast('🌊 The sea is too big out there! Turn back.'); }
    W().collide(P.pos, 0.38, 1.7);

    const ground = W().groundAt(P.pos.x, P.pos.z, P.pos.y);
    const deep = ground < -1.25;
    if (deep) {
      // swimming
      if (!P.swimming) { DL.FX.splash(P.pos.x, P.pos.z, 16); DL.Audio.play('splash'); }
      P.swimming = true;
      P.vy = 0;
      P.pos.y = U.damp(P.pos.y, -1.2 + Math.sin(W().time * 2.5) * 0.06, 6, dt);
      P.onGround = false;
      if (Math.random() < dt * (P.speed > 0.5 ? 6 : 1)) DL.FX.splash(P.pos.x, P.pos.z, 2);
    } else {
      if (P.swimming) P.pos.y = Math.max(P.pos.y, ground);
      P.swimming = false;
      if (I.consume('jump') && P.onGround && !fishing) { P.vy = 8.2; P.onGround = false; DL.Audio.play('jump'); }
      P.vy -= 24 * dt;
      P.pos.y += P.vy * dt;
      if (P.pos.y <= ground) {
        if (!P.onGround && P.vy < -12) { DL.FX.dust(P.pos.x, ground, P.pos.z, 8); DL.Audio.play('land'); }
        P.pos.y = ground; P.vy = 0; P.onGround = true;
      } else if (P.pos.y > ground + 0.3) P.onGround = false;
      else if (P.vy <= 0) { P.pos.y = ground; P.onGround = true; P.vy = 0; } // walk down hills smoothly
    }
    // footsteps
    if (P.onGround && P.speed > 1) {
      P.stepT -= dt * P.speed * 0.42;
      if (P.stepT < 0) { P.stepT = 1; DL.Audio.play('step', { soft: ground < 2.6 }); }
    }
    // the model
    const M = P.model;
    M.root.position.copy(P.pos);
    M.root.rotation.set(0, P.yaw, 0);
    const tool = DL.Items.tool();
    M.setTool(P.pet > 0 ? null : tool === 'food' ? (DL.Items.has(DL.Items.foodSel) ? 'food' : null) : tool === 'build' ? null : tool === 'stick' ? (DL.Items.stick.state === 'held' ? 'stick' : null) : tool);
    if (tool === 'food') M.setFoodColor(DL.Items.ITEMS[DL.Items.foodSel].color || 0xe05050);
    M.animate(dt, { speed: P.speed, swim: P.swimming, swing: P.swing, t: W().time, holdOut: tool === 'rod' && fishing, pet: P.pet, wave: P.wave, sit: P.sitting });
    P.rodTip.set(P.pos.x + Math.sin(P.yaw) * 1.3, P.pos.y + 2.4, P.pos.z + Math.cos(P.yaw) * 1.3);
    camTarget.set(P.pos.x, P.pos.y + 1.7, P.pos.z);
    updateCamera(dt, P.camDist, 1);
  }

  // riding: the dragon moves you, you just sit there
  function rideUpdate(dt) {
    const D = DL.Dragon;
    const seat = D.seatWorld();
    P.pos.copy(seat);
    P.yaw = D.yaw;
    const M = P.model;
    M.root.position.copy(seat);
    M.root.quaternion.copy(D.bodyQuat());
    M.setTool(null);
    M.animate(dt, { ride: true, t: W().time });
    P.speed = 0; P.swimming = false; P.onGround = false;
    const sc = D.scale();
    camTarget.set(seat.x, seat.y + 2.4 * sc, seat.z);
    updateCamera(dt, P.camDist * 1.4 + 4 * sc, 1);
  }

  function updateCamera(dt, dist, smooth) {
    const cp = Math.cos(P.camPitch), sp = Math.sin(P.camPitch);
    const lx = Math.sin(P.camYaw) * cp, ly = sp, lz = Math.cos(P.camYaw) * cp;
    let want = new THREE.Vector3(camTarget.x - lx * dist, camTarget.y - ly * dist, camTarget.z - lz * dist);
    // don't let the camera go inside a hill
    for (let k = 1; k <= 4; k++) {
      const t = k / 4;
      const x = U.lerp(camTarget.x, want.x, t), z = U.lerp(camTarget.z, want.z, t), y = U.lerp(camTarget.y, want.y, t);
      const g = W().terrainH(x, z) + 0.5;
      if (y < g) { want.y += (g - y) * (k === 4 ? 1 : 0.6); }
    }
    // don't let the camera go inside the leaves of a tree: come closer instead
    const steps = 10;
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const x = U.lerp(camTarget.x, want.x, t), y = U.lerp(camTarget.y, want.y, t), z = U.lerp(camTarget.z, want.z, t);
      let hit = false;
      for (const n of W().nodesNear(x, z, 5)) {
        if (!n.alive || n.kind !== 'tree' || n.type === 'dead') continue;
        const big = n.type === 'giant';
        const r = (big ? 4.2 : n.type === 'pine' || n.type === 'snowpine' ? 1.8 : 2.1) * n.s;
        if (U.dist2(x, z, n.x, n.z) < r * r && y > n.y + (big ? 8 : 2.2) * n.s && y < n.y + (big ? 17 : 7) * n.s) { hit = true; break; }
      }
      if (hit) {
        const back = Math.max(0, (k - 1) / steps);
        want.set(U.lerp(camTarget.x, want.x, back), U.lerp(camTarget.y, want.y, back), U.lerp(camTarget.z, want.z, back));
        if (back < 0.25) want.set(camTarget.x - lx * 1.2, camTarget.y - ly * 1.2 + 0.3, camTarget.z - lz * 1.2);
        break;
      }
    }
    const g = Math.max(W().groundAt(want.x, want.z, want.y + 1) + 0.45, 0.35);
    if (want.y < g) want.y = g;
    camPos.lerp(want, smooth >= 1 ? 1 - Math.exp(-25 * dt) : smooth);
    camera.position.copy(camPos);
    camera.lookAt(camTarget);
  }

  return Object.assign(P, { init, spawn, look, update, camTarget });
})();
