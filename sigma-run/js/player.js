// ============================================================
//  SIGMA RUN — YOU! (the runner)
//  Moves, jumps, wall runs, slides, vaults, grabs ledges,
//  rides ziplines... and you can see your arms pumping.
// ============================================================
window.SR = window.SR || {};

SR.Player = (function () {
  const U = SR.U;
  const R = 0.34;              // how fat you are
  const STAND = 1.75, CROUCH = 0.95;
  const STEP = 0.55;           // you walk up small things by yourself
  const GRAV = 24;
  const JUMP = 8.6;

  const P = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    yaw: 0, pitch: 0, roll: 0,
    h: STAND, eye: STAND - 0.12,
    grounded: false, ground: null, coyote: 0, jumpBuf: 0, slideBuf: 0,
    mode: 'run',               // run, wallrun, vault, mantle, zip
    sliding: false, slideT: 0,
    wr: null, wrCool: 0, lastWall: null,
    act: null,                 // the vault / mantle being done right now
    zip: null, zipCool: 0,
    airJumps: 0, airT: 0, launched: 0,
    runSpeed: 12.5, boost: 0, superJump: 0,
    stagger: 0, invuln: 0,
    safeY: 42, fell: false,
    bob: 0, bobAmp: 0, dip: 0, dipV: 0, rollAnim: 0, shake: 0, fovKick: 0,
    speed: 0, distance: 0, maxDist: 0,
    events: [],
    rockets: 0, fireAnim: 0,
  };

  let camera, armsScene, armsCam, arms = {}, armsLight, armsHemi;
  const tmpV = new THREE.Vector3();

  function fwdVec(yaw) { return new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)); }
  function rightVec(yaw) { return new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); }
  function ev(name, data) { P.events.push({ name, data }); }

  // ------------------------------------------------------------
  //  FIRST-PERSON ARMS (a hoodie and gloves)
  // ------------------------------------------------------------
  function buildArms() {
    armsScene = new THREE.Scene();
    armsCam = new THREE.PerspectiveCamera(62, 1, 0.01, 10);
    armsScene.add(armsCam);
    armsHemi = new THREE.HemisphereLight(0xbfd4ff, 0x40302a, 1.3); armsScene.add(armsHemi);
    armsLight = new THREE.DirectionalLight(0xffffff, 1.6); armsScene.add(armsLight);
    armsScene.add(new THREE.AmbientLight(0xffffff, 0.35));
    armsScene.add(armsLight.target);
    arms.sleeve = new THREE.MeshStandardMaterial({ color: 0x484b56, roughness: 0.85 });
    arms.cuff = new THREE.MeshStandardMaterial({ color: 0xffd21a, roughness: 0.6, emissive: 0x332200 });
    arms.glove = new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.55, metalness: 0.1 });
    arms.skin = new THREE.MeshStandardMaterial({ color: 0xc68a62, roughness: 0.7 });
    arms.list = [];
    for (const side of [-1, 1]) {
      // the pivot is your elbow: we only see the forearm and the glove
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.3, -0.36, -0.08);
      const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 6, 12), arms.sleeve);
      sleeve.rotation.x = Math.PI / 2; sleeve.position.z = -0.12;
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.053, 0.025, 14), arms.cuff);
      cuff.rotation.x = Math.PI / 2; cuff.position.z = -0.27;
      const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.05, 10), arms.skin);
      wrist.rotation.x = Math.PI / 2; wrist.position.z = -0.31;
      const hand = new THREE.Group(); hand.position.z = -0.36;
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.036, 0.085), arms.glove);
      hand.add(palm);
      const fingers = [];
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Group(); f.position.set(-0.027 + i * 0.018, 0, -0.042);
        const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.018, 0.045), arms.glove); seg1.position.z = -0.022;
        f.add(seg1); hand.add(f); fingers.push(f);
      }
      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.02, 0.045), arms.glove);
      thumb.position.set(side * -0.045, -0.005, -0.015); thumb.rotation.y = side * 0.6;
      hand.add(thumb);
      pivot.add(sleeve, cuff, wrist, hand);
      armsCam.add(pivot);
      arms.list.push({ side, pivot, hand, fingers, base: pivot.position.clone() });
    }
    // rocket launcher (shows up when you have rockets)
    const L = new THREE.Group();
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.9, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x6a7a4a, metalness: 0.3, roughness: 0.45, side: THREE.DoubleSide }));
    tube.rotation.x = Math.PI / 2;
    const ringM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 });
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 16), ringM); r1.position.z = -0.45;
    const r2 = r1.clone(); r2.position.z = 0.45;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.05), ringM); grip.position.set(0, -0.1, 0.05);
    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.12), ringM); sight.position.set(-0.07, 0.07, -0.1);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0xc23a1a, roughness: 0.5 }));
    tip.rotation.x = -Math.PI / 2; tip.position.z = -0.5;
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.077, 0.077, 0.06, 16), new THREE.MeshStandardMaterial({ color: 0xffd21a, emissive: 0x443300 }));
    stripe.rotation.x = Math.PI / 2; stripe.position.z = 0.25;
    L.add(tube, r1, r2, grip, sight, tip, stripe);
    L.position.set(0.24, -0.2, -0.35);
    L.visible = false;
    armsCam.add(L);
    arms.launcher = L; arms.launcherTip = tip;
  }
  function setGloves(skin) {
    const S = {
      default: [0x26262b, 0x484b56, 0xffd21a],
      gold: [0xffc61a, 0x111111, 0xffffff],
      neon: [0x2af0ff, 0x1a0a30, 0xff3aa8],
      fire: [0xff3a1a, 0x2a0a05, 0xffd21a],
      diamond: [0x9ff0ff, 0xe8f6ff, 0x3a8aff],
      fbi: [0x101010, 0x1a1a20, 0xffd21a],
    }[skin] || [0x26262b, 0x484b56, 0xffd21a];
    arms.glove.color.setHex(S[0]); arms.sleeve.color.setHex(S[1]); arms.cuff.color.setHex(S[2]);
    arms.glove.metalness = skin === 'gold' || skin === 'diamond' ? 0.9 : 0.1;
    arms.glove.roughness = skin === 'gold' || skin === 'diamond' ? 0.2 : 0.55;
    arms.cuff.emissive.setHex(skin === 'neon' ? 0x661144 : 0x221a00);
    if (skin === 'neon') { arms.glove.emissive = new THREE.Color(0x0a5a66); } else arms.glove.emissive = new THREE.Color(0);
  }

  function init(cam) {
    camera = cam;
    buildArms();
  }

  function reset(x, y, z) {
    P.pos.set(x, y, z); P.vel.set(0, 0, -6);
    P.yaw = 0; P.pitch = -0.05; P.roll = 0;
    P.h = STAND; P.eye = STAND - 0.12;
    P.grounded = false; P.mode = 'run'; P.sliding = false; P.wr = null; P.act = null; P.zip = null;
    P.coyote = P.jumpBuf = P.slideBuf = 0; P.wrCool = 0; P.zipCool = 0;
    P.boost = 0; P.superJump = 0; P.stagger = 0; P.invuln = 0; P.launched = 0;
    P.safeY = y; P.fell = false; P.dip = 0; P.dipV = 0; P.rollAnim = 0; P.shake = 0; P.fovKick = 0;
    P.distance = 0; P.maxDist = 0; P.events.length = 0; P.rockets = 0; P.airJumps = 0;
  }
  function respawn(x, y, z) {
    P.pos.set(x, y + 0.05, z); P.vel.set(0, 0, -8);
    P.yaw = 0; P.pitch = -0.08; P.mode = 'run'; P.wr = null; P.act = null; P.zip = null; P.sliding = false; P.h = STAND;
    P.safeY = y; P.fell = false; P.invuln = 2.5; P.stagger = 0; P.launched = 0;
  }

  // ------------------------------------------------------------
  //  COLLISIONS
  // ------------------------------------------------------------
  function overlaps(b, x, y, z, h) {
    return x + R > b.x0 && x - R < b.x1 && z + R > b.z0 && z - R < b.z1 && y + h > b.y0 + 1e-4 && y < b.y1 - 1e-4;
  }
  function fitsAt(x, y, z, h, boxes) {
    for (const b of boxes) if (b.kind !== 'glass' && overlaps(b, x, y, z, h)) return false;
    return true;
  }
  function moveAxis(axis, amount, boxes) {
    if (amount === 0) return null;
    P.pos[axis] += amount;
    let hit = null;
    for (const b of boxes) {
      if (!overlaps(b, P.pos.x, P.pos.y, P.pos.z, P.h)) continue;
      if (b.kind === 'glass') { smash(b); continue; }
      if (axis === 'y') {
        if (amount < 0) { P.pos.y = b.y1; land(b); }
        else { P.pos.y = b.y0 - P.h - 1e-4; if (P.vel.y > 0) P.vel.y = 0; }
        hit = b;
      } else {
        // walk up small steps and edges
        const rise = b.y1 - P.pos.y;
        if (rise > 0 && rise <= STEP && P.mode !== 'wallrun' && fitsAt(P.pos.x, b.y1 + 0.001, P.pos.z, P.h, boxes)) {
          P.pos.y = b.y1 + 0.001;
          if (!P.grounded && P.vel.y < 0) { P.vel.y = 0; }
          continue;
        }
        const lo = axis === 'x' ? b.x0 : b.z0, hi = axis === 'x' ? b.x1 : b.z1;
        P.pos[axis] = amount > 0 ? lo - R - 1e-4 : hi + R + 1e-4;
        hit = b;
      }
    }
    return hit;
  }
  function smash(b) {
    SR.Level.removeBox(b);
    if (b.mesh) { b.mesh.visible = false; }
    ev('glass', b);
  }

  // ------------------------------------------------------------
  //  LANDING
  // ------------------------------------------------------------
  function land(b) {
    const vy = P.vel.y;
    P.vel.y = 0;
    P.ground = b;
    P.safeY = b.y1;
    if (P._wasG || P._landed) return;
    // touching down after being in the air
    P._landed = true;
    P.airJumps = P.superJump > 0 ? 1 : 0;
    P.lastWall = null;
    P.launched = 0;
    if (P.mode === 'wallrun') endWallrun();
    if (vy < -17) {
      // big fall: do a cool roll and keep your speed
      P.rollAnim = 1; ev('roll');
      P.dipV -= 2;
    } else if (vy < -4) {
      P.dipV += vy * 0.12; ev('land', { hard: vy < -10 });
    }
    if (P.slideBuf > 0 && P.speed > 4) startSlide();
    if (P.airT > 0.25) SR.FX.dust(P.pos.x, P.pos.y, P.pos.z, 6, 0.8);
    P.airT = 0;
  }

  // ------------------------------------------------------------
  //  SLIDE
  // ------------------------------------------------------------
  function startSlide() {
    if (P.sliding) return;
    P.sliding = true; P.slideT = 0; P.slideBuf = 0;
    const hs = Math.hypot(P.vel.x, P.vel.z);
    const ns = Math.min(Math.max(hs, P.runSpeed) + 2.5, 18 + (P.boost > 0 ? 4 : 0));
    if (hs > 0.5) { P.vel.x *= ns / hs; P.vel.z *= ns / hs; }
    else { const f = fwdVec(P.yaw); P.vel.x = f.x * ns * 0.7; P.vel.z = f.z * ns * 0.7; }
    ev('slide');
  }
  function stopSlide(boxes) {
    if (!fitsAt(P.pos.x, P.pos.y, P.pos.z, STAND, boxes)) return false; // something is above your head
    P.sliding = false;
    return true;
  }

  // ------------------------------------------------------------
  //  WALL RUN
  // ------------------------------------------------------------
  function findWall(boxes) {
    const hs = Math.hypot(P.vel.x, P.vel.z);
    if (hs < 5) return null;
    const y0 = P.pos.y + 0.35, y1 = P.pos.y + 1.45;
    let best = null;
    for (const b of boxes) {
      if (!b.wall || b.kind === 'glass') continue;
      if (b.y0 > y0 || b.y1 < y1) continue;
      if (b === P.lastWall && P.wrCool > 0) continue;
      const cands = [];
      if (P.pos.z > b.z0 + 0.2 && P.pos.z < b.z1 - 0.2) {
        if (P.pos.x < b.x0) cands.push({ d: b.x0 - P.pos.x - R, n: new THREE.Vector3(-1, 0, 0) });
        if (P.pos.x > b.x1) cands.push({ d: P.pos.x - b.x1 - R, n: new THREE.Vector3(1, 0, 0) });
      }
      if (P.pos.x > b.x0 + 0.2 && P.pos.x < b.x1 - 0.2) {
        if (P.pos.z < b.z0) cands.push({ d: b.z0 - P.pos.z - R, n: new THREE.Vector3(0, 0, -1) });
        if (P.pos.z > b.z1) cands.push({ d: P.pos.z - b.z1 - R, n: new THREE.Vector3(0, 0, 1) });
      }
      for (const c of cands) {
        if (c.d > 1.15) continue;
        // you must be running ALONG the wall, not straight into it
        const into = -(P.vel.x * c.n.x + P.vel.z * c.n.z) / hs;
        if (into > 0.75) continue;
        if (!best || c.d < best.d) best = { d: c.d, n: c.n, b };
      }
    }
    return best;
  }
  function startWallrun(w) {
    const n = w.n;
    const vn = P.vel.x * n.x + P.vel.z * n.z;
    const t = new THREE.Vector3(P.vel.x - vn * n.x, 0, P.vel.z - vn * n.z);
    const sp = Math.max(t.length(), P.runSpeed * 1.02);
    t.normalize();
    // which side the wall is on (for leaning the camera)
    const r = rightVec(P.yaw);
    const side = -(n.x * r.x + n.z * r.z) > 0 ? 1 : -1;
    P.mode = 'wallrun';
    P.wr = { n: n.clone(), t, speed: sp, time: 0, box: w.b, side, pull: Math.max(0, w.d - 0.05) };
    P.vel.y = U.clamp(P.vel.y * 0.4 + 3.6, 3, 5);
    P.lastWall = w.b;
    P.sliding = false;
    ev('wallrun', { side });
  }
  function endWallrun() { P.mode = 'run'; P.wrCool = 0.35; P.wr = null; }
  function wallJump() {
    const w = P.wr;
    P.vel.set(w.t.x * w.speed * 1.03 + w.n.x * 6.2, JUMP * 0.98, w.t.z * w.speed * 1.03 + w.n.z * 6.2);
    endWallrun();
    P.airJumps = P.superJump > 0 ? 1 : 0;
    ev('walljump');
  }

  // ------------------------------------------------------------
  //  VAULT & MANTLE (grabbing things in front of you)
  // ------------------------------------------------------------
  function probeAhead(boxes, hs, wish) {
    if (P.mode !== 'run') return;
    let dx, dz;
    if (hs >= 2.5) { dx = P.vel.x / hs; dz = P.vel.z / hs; }
    else if (wish && wish.lengthSq() > 0.25) { const l = Math.hypot(wish.x, wish.z); dx = wish.x / l; dz = wish.z / l; hs = 3; }
    else return;
    const reach = R + 0.2 + (P.grounded ? hs * 0.11 : 0.25);
    const ax = P.pos.x, az = P.pos.z, bx = ax + dx * reach, bz = az + dz * reach;
    let best = null;
    for (const b of boxes) {
      if (b.kind === 'glass' || b.noVault) continue;
      if (b.y1 <= P.pos.y + 0.3) continue;
      // does the line in front of you hit this box (made a bit fatter by your size)?
      const t = segRect(ax, az, bx, bz, b.x0 - R + 0.02, b.z0 - R + 0.02, b.x1 + R - 0.02, b.z1 + R - 0.02);
      if (t === null) continue;
      if (!best || t < best.t) best = { b, t };
    }
    if (!best) return;
    const b = best.b, h = b.y1 - P.pos.y, under = b.y0 - P.pos.y;
    // something hanging in front of your face: slide under it automatically
    if (P.grounded && under >= 0.98 && under < STAND + 0.1) { if (!P.sliding) startSlide(); return; }
    if (under > 0.6) return;
    // is there room to stand on top?
    const tx = P.pos.x + dx * (best.t * reach + R + 0.45), tz = P.pos.z + dz * (best.t * reach + R + 0.45);
    if (P.grounded && h > 0.45 && h <= 1.38 && !P.sliding) {
      if (!fitsAt(tx, b.y1 + 0.02, tz, CROUCH, boxes)) return;
      P.mode = 'vault';
      P.act = { t: 0, dur: U.clamp(0.07 + h * 0.09, 0.1, 0.2), y0: P.pos.y, y1: b.y1 + 0.03, hs };
      P.vel.y = 0;
      ev('vault');
    } else if (h > (P.grounded ? 1.38 : 0.3) && h <= 2.45 && best.t * reach < R + 0.45) {
      if (!fitsAt(tx, b.y1 + 0.02, tz, STAND, boxes)) return;
      if (!P.grounded && P.vel.y > 5) return; // still flying up
      P.mode = 'mantle';
      P.act = { t: 0, dur: 0.18 + h * 0.08, y0: P.pos.y, y1: b.y1 + 0.03, x0: P.pos.x, z0: P.pos.z, x1: tx, z1: tz, hs: Math.max(hs * 0.8, P.runSpeed * 0.7), dx, dz };
      P.vel.set(0, 0, 0);
      P.sliding = false;
      ev('mantle', { h });
    }
  }
  // where a line from (ax,az) to (bx,bz) first enters a rectangle (0..1), or null
  function segRect(ax, az, bx, bz, x0, z0, x1, z1) {
    let t0 = 0, t1 = 1;
    const dx = bx - ax, dz = bz - az;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dz, az - z0], [dz, z1 - az]]) {
      if (p === 0) { if (q < 0) return null; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
      else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return t0;
  }

  // ------------------------------------------------------------
  //  ZIPLINE & LAUNCH PAD
  // ------------------------------------------------------------
  function checkTriggers() {
    for (const s of SR.Level.segs) {
      if (s.zEnd > P.pos.z + 80 || s.zStart < P.pos.z - 80) continue;
      for (const t of s.triggers) {
        if (t.type === 'zip' && P.mode !== 'zip' && P.zipCool <= 0) {
          const ab = tmpV.copy(t.b).sub(t.a), len = ab.length();
          ab.divideScalar(len);
          const head = new THREE.Vector3(P.pos.x, P.pos.y + 1.7, P.pos.z);
          const s0 = U.clamp(head.clone().sub(t.a).dot(ab), 0, len);
          if (s0 > len * 0.85) continue;
          const closest = t.a.clone().addScaledVector(ab, s0);
          if (closest.distanceTo(head) < 2.0) {
            P.mode = 'zip'; P.sliding = false; P.wr = null;
            P.zip = { t, s: s0, len, dir: ab.clone(), speed: Math.max(Math.hypot(P.vel.x, P.vel.z), 9) };
            ev('zip');
          }
        }
        if (t.type === 'pad' && P.mode === 'run' && P.vel.y < 1 && P.pos.x > t.x0 - 0.2 && P.pos.x < t.x1 + 0.2 && P.pos.z > t.z0 - 0.2 && P.pos.z < t.z1 + 0.2 && P.pos.y - t.y > -0.3 && P.pos.y - t.y < 1.6) {
          const dy = t.target.y - P.pos.y, vy = 15;
          const T = (vy + Math.sqrt(Math.max(0, vy * vy - 2 * GRAV * dy))) / GRAV;
          P.vel.set((t.target.x - P.pos.x) / T, vy, (t.target.z - P.pos.z) / T);
          P.grounded = false; P.launched = T; P.sliding = false;
          P.pos.y += 0.05;
          ev('launch');
        }
      }
    }
  }

  // ------------------------------------------------------------
  //  EVERY FRAME
  // ------------------------------------------------------------
  function update(dt, inp, opts) {
    P.events.length = 0;
    const sens = 0.0022 * SR.settings.sens;
    P.yaw -= inp.lookX * sens;
    P.pitch -= inp.lookY * sens * (SR.settings.invertY ? -1 : 1);
    P.pitch = U.clamp(P.pitch, -1.45, 1.35);

    if (inp.pressed.has('jump')) P.jumpBuf = 0.14;
    if (inp.pressed.has('slide')) P.slideBuf = 0.25;
    P.jumpBuf -= dt; P.slideBuf -= dt; P.coyote -= dt; P.wrCool -= dt; P.zipCool -= dt;
    P.invuln -= dt; P.stagger -= dt; P.launched -= dt;
    P.boost -= dt; P.superJump -= dt;

    const boxes = SR.Level.boxesNear(P.pos.z, 32);
    P.runSpeed = 12.5 + Math.min(1.5, P.maxDist / 1400);
    const target = (P.runSpeed + (P.boost > 0 ? 6.5 : 0) + (opts.sigma ? 3 : 0)) * (P.stagger > 0 ? 0.55 : 1);

    // --- the special moves that take over control ---
    if (P.mode === 'vault' || P.mode === 'mantle') {
      const a = P.act;
      a.t += dt;
      const k = U.clamp(a.t / a.dur, 0, 1), e = U.smooth(k);
      if (P.mode === 'vault') {
        P.pos.y = U.lerp(a.y0, a.y1, Math.min(1, e * 1.4));
        const hs = Math.hypot(P.vel.x, P.vel.z) || 1;
        P.pos.x += P.vel.x / hs * a.hs * dt; P.pos.z += P.vel.z / hs * a.hs * dt;
      } else {
        P.pos.y = U.lerp(a.y0, a.y1, Math.min(1, e * 1.25));
        P.pos.x = U.lerp(a.x0, a.x1, U.smooth(Math.max(0, k * 1.3 - 0.3)));
        P.pos.z = U.lerp(a.z0, a.z1, U.smooth(Math.max(0, k * 1.3 - 0.3)));
      }
      if (k >= 1) {
        if (P.mode === 'mantle') { P.vel.x = a.dx * a.hs; P.vel.z = a.dz * a.hs; }
        P.mode = 'run'; P.act = null; P.vel.y = 0;
        P.grounded = false;
      }
      if (P.jumpBuf > 0 && P.mode === 'vault' && k > 0.5) { P.mode = 'run'; P.act = null; doJump(); }
      finish(dt, inp, target);
      return;
    }
    if (P.mode === 'zip') {
      const z = P.zip;
      z.speed = Math.min(z.speed + (-z.dir.y) * GRAV * 0.7 * dt, 27);
      z.s += z.speed * dt;
      const hp = z.t.a.clone().addScaledVector(z.dir, z.s);
      P.pos.set(hp.x, hp.y - 2.0, hp.z);
      if (z.t.handle) { z.t.handle.position.copy(hp).add(new THREE.Vector3(0, -0.25, 0)); }
      P.vel.copy(z.dir).multiplyScalar(z.speed);
      const end = z.s >= z.len - 0.6;
      if (end || P.jumpBuf > 0) {
        P.mode = 'run'; P.zipCool = 0.8; P.zip = null;
        P.vel.y = end ? 2.5 : 7.5; P.jumpBuf = 0;
        P.grounded = false;
        ev('zipEnd');
      }
      finish(dt, inp, target);
      return;
    }

    // --- normal running / flying through the air ---
    const f = fwdVec(P.yaw), r = rightVec(P.yaw);
    let fwd = SR.settings.autoRun || SR.Input.touch ? (inp.my < -0.5 ? 0 : 1) : inp.my;
    if (opts.frozen) fwd = 0;
    const wish = new THREE.Vector3().addScaledVector(f, fwd).addScaledVector(r, inp.mx * 0.85);
    if (wish.lengthSq() > 1) wish.normalize();
    const hs = Math.hypot(P.vel.x, P.vel.z);

    if (P.mode === 'wallrun') {
      const w = P.wr;
      w.time += dt;
      // stick to the wall (and slide over to it if you grabbed it from a bit far away)
      const pull = 1.5 + (w.pull > 0 ? Math.min(8, w.pull * 14) : 0);
      w.pull = Math.max(0, w.pull - pull * dt);
      P.vel.x = w.t.x * w.speed - w.n.x * pull;
      P.vel.z = w.t.z * w.speed - w.n.z * pull;
      P.vel.y -= (w.time < 0.9 ? 7 : 14) * dt;
      // is the wall still there?
      const still = findWall(boxes);
      if (P.jumpBuf > 0) { P.jumpBuf = 0; wallJump(); }
      else if (!still || still.b !== w.box && Math.abs(still.n.dot(w.n)) < 0.9 || w.time > 2.2 || P.slideBuf > 0 || P.vel.y < -13) {
        endWallrun(); P.slideBuf = 0;
        // fall away from the wall a tiny bit
        P.vel.x += w.n.x * 1.5; P.vel.z += w.n.z * 1.5;
      }
      if (P.wr && still && still.b !== w.box) w.box = still.b;
    } else if (P.grounded) {
      if (P.sliding) {
        P.slideT += dt;
        // sliding: you keep your speed but it slowly runs out
        const dec = Math.exp(-0.55 * dt);
        P.vel.x *= dec; P.vel.z *= dec;
        // you can steer a little
        const sp = Math.hypot(P.vel.x, P.vel.z);
        if (sp > 0.1) {
          const dir = new THREE.Vector3(P.vel.x / sp, 0, P.vel.z / sp).lerp(wish.lengthSq() > 0.01 ? wish.clone().normalize() : new THREE.Vector3(P.vel.x / sp, 0, P.vel.z / sp), Math.min(1, dt * 2.2)).normalize();
          P.vel.x = dir.x * sp; P.vel.z = dir.z * sp;
        }
        const minT = 0.55, maxT = 1.15;
        if ((P.slideT > minT && !inp.slideHeld) || P.slideT > maxT || sp < 3.5) {
          if (!stopSlide(boxes) && sp < 4.5) {
            // stuck under something: keep scooting forward
            const d = sp > 0.1 ? new THREE.Vector3(P.vel.x / sp, 0, P.vel.z / sp) : fwdVec(P.yaw);
            P.vel.x = d.x * 4.5; P.vel.z = d.z * 4.5;
          }
        }
      } else {
        const tx = wish.x * target, tz = wish.z * target;
        const acc = 1 - Math.exp(-(hs > target + 0.5 ? 3 : 9) * dt);
        P.vel.x += (tx - P.vel.x) * acc; P.vel.z += (tz - P.vel.z) * acc;
        if (P.slideBuf > 0 && hs > 4) startSlide();
      }
    } else {
      // in the air: you keep your speed, and can steer a bit
      const ctrl = P.launched > 0 ? 4 : 14;
      P.vel.x += wish.x * ctrl * dt; P.vel.z += wish.z * ctrl * dt;
      const nhs = Math.hypot(P.vel.x, P.vel.z), cap = Math.max(hs, target);
      if (nhs > cap) { P.vel.x *= cap / nhs; P.vel.z *= cap / nhs; }
      // turning in the air bends your path toward where you look
      if (nhs > 2 && P.launched <= 0) {
        const want = wish.lengthSq() > 0.01 ? wish.clone().normalize() : null;
        if (want) {
          const cur = new THREE.Vector3(P.vel.x / nhs, 0, P.vel.z / nhs);
          cur.lerp(want, Math.min(1, dt * 2.5)).normalize();
          const sp = Math.min(nhs, cap);
          P.vel.x = cur.x * sp; P.vel.z = cur.z * sp;
        }
      }
      P.airT += dt;
    }

    // jumping
    if (P.jumpBuf > 0 && P.mode === 'run') {
      if (P.grounded || P.coyote > 0) doJump();
      else if (P.airJumps > 0 && P.superJump > 0) { P.airJumps--; P.vel.y = JUMP * 1.05; P.jumpBuf = 0; ev('doublejump'); }
    }
    if (P.mode !== 'wallrun') P.vel.y -= GRAV * dt;
    if (P.vel.y < -45) P.vel.y = -45;

    // vault / mantle / auto-slide
    probeAhead(boxes, Math.hypot(P.vel.x, P.vel.z), wish);
    if (P.mode === 'vault' || P.mode === 'mantle') { finish(dt, inp, target); return; }

    // move, in small steps so you never go through thin walls
    const wasGrounded = P.grounded;
    const travel = Math.hypot(P.vel.x, P.vel.y, P.vel.z) * dt;
    const steps = Math.min(8, Math.max(1, Math.ceil(travel / 0.25)));
    const sdt = dt / steps;
    P._wasG = P.grounded; P._landed = false;
    P.grounded = false;
    let hitWallBox = null;
    for (let i = 0; i < steps; i++) {
      const hx = moveAxis('x', P.vel.x * sdt, boxes); if (hx) { hitWallBox = hx; if (P.mode !== 'wallrun') P.vel.x = 0; }
      const hz = moveAxis('z', P.vel.z * sdt, boxes); if (hz) { hitWallBox = hz; if (P.mode !== 'wallrun') P.vel.z = 0; }
      const hy = moveAxis('y', P.vel.y * sdt - (P.vel.y === 0 ? 0.002 : 0), boxes);
      if (hy && P.vel.y <= 0 && P.pos.y >= hy.y1 - 0.01) P.grounded = true;
    }
    if (P.grounded && P.mode === 'wallrun') endWallrun();
    if (hitWallBox && P.grounded && !P.sliding && P.mode === 'run') {
      const under = hitWallBox.y0 - P.pos.y;
      if (under >= 0.98 && under < STAND) startSlide();
    }
    if (wasGrounded && !P.grounded && P.vel.y <= 0.01) P.coyote = 0.13;
    if (!P.grounded) P.ground = null;

    // start wall running?
    if (!P.grounded && P.mode === 'run' && P.airT > 0.05 && P.launched <= 0 && P.vel.y > -11) {
      const w = findWall(boxes);
      if (w) startWallrun(w);
    }
    // the slide height
    P.h = P.sliding ? CROUCH : STAND;
    if (!P.grounded && P.sliding && P.airT > 0.2) stopSlide(boxes);

    checkTriggers();
    finish(dt, inp, target);
  }

  function doJump() {
    const slideJump = P.sliding;
    P.vel.y = JUMP * (P.superJump > 0 ? 1.28 : 1);
    if (slideJump) {
      const hs = Math.hypot(P.vel.x, P.vel.z);
      if (hs > 0.1) { const k = Math.min(hs + 0.8, 19) / hs; P.vel.x *= k; P.vel.z *= k; }
      P.sliding = false;
    }
    P.grounded = false; P.coyote = 0; P.jumpBuf = 0; P.airT = 0;
    P.h = STAND;
    ev('jump', { slideJump });
  }

  // camera and the stuff that happens after moving
  function finish(dt, inp, target) {
    P.speed = Math.hypot(P.vel.x, P.vel.z);
    P.distance = -P.pos.z;
    if (P.distance > P.maxDist) P.maxDist = P.distance;
    if (P.pos.y < P.safeY - 18 && P.mode !== 'zip') { if (!P.fell) { P.fell = true; ev('fell'); } }

    // head bob + footsteps
    if (P.grounded && !P.sliding && P.speed > 1 && P.mode === 'run') {
      const before = Math.floor(P.bob / Math.PI);
      P.bob += dt * P.speed * 0.78;
      if (Math.floor(P.bob / Math.PI) !== before) ev('step', { surface: P.ground ? P.ground.surface : 'roof' });
      P.bobAmp = U.damp(P.bobAmp, Math.min(1, P.speed / 12), 8, dt);
    } else if (P.mode === 'wallrun') {
      const before = Math.floor(P.bob / Math.PI);
      P.bob += dt * P.speed * 0.9;
      if (Math.floor(P.bob / Math.PI) !== before) ev('step', { surface: 'metal' });
      P.bobAmp = U.damp(P.bobAmp, 0.6, 8, dt);
    } else P.bobAmp = U.damp(P.bobAmp, 0, 6, dt);
    // a springy dip when you land
    P.dipV += (-P.dip * 120 - P.dipV * 14) * dt;
    P.dip += P.dipV * dt;
    P.dip = U.clamp(P.dip, -0.6, 0.3);
    // the eyes go down when you slide
    const eyeT = (P.sliding ? CROUCH : STAND) - 0.12;
    P.eye = U.damp(P.eye, eyeT, 14, dt);
    // camera roll
    let rollT = 0;
    if (P.mode === 'wallrun' && P.wr) rollT = -P.wr.side * 0.24;
    else if (P.sliding) rollT = 0.06;
    else rollT = -inp.mx * 0.025;
    if (P.mode === 'zip') rollT = Math.sin(performance.now() / 300) * 0.04;
    P.roll = U.damp(P.roll, rollT, 7, dt);
    if (P.rollAnim > 0) P.rollAnim = Math.max(0, P.rollAnim - dt / 0.5);
    P.shake = Math.max(0, P.shake - dt * 1.6);
    P.fovKick = U.damp(P.fovKick, 0, 3, dt);
    P.fireAnim = Math.max(0, P.fireAnim - dt * 3);
  }

  // put the camera where your eyes are
  function applyCamera(cam, time) {
    const bobY = Math.abs(Math.sin(P.bob)) * 0.075 * P.bobAmp - 0.035 * P.bobAmp;
    const bobX = Math.cos(P.bob) * 0.04 * P.bobAmp;
    const r = rightVec(P.yaw);
    const sh = P.shake * P.shake;
    cam.position.set(
      P.pos.x + r.x * bobX + (Math.random() - 0.5) * sh * 0.5,
      P.pos.y + P.eye + bobY + P.dip + (Math.random() - 0.5) * sh * 0.5,
      P.pos.z + r.z * bobX + (Math.random() - 0.5) * sh * 0.5);
    // the roll after a big fall spins the camera forward all the way round
    const spin = P.rollAnim > 0 ? (1 - P.rollAnim) * Math.PI * 2 : 0;
    cam.rotation.set(P.pitch - spin + (Math.random() - 0.5) * sh * 0.06, P.yaw, P.roll + Math.sin(P.bob) * 0.006 * P.bobAmp, 'YXZ');
    if (P.rollAnim > 0) cam.position.y -= Math.sin((1 - P.rollAnim) * Math.PI) * 0.7;
    const speedFov = U.clamp((P.speed - 11) * 1.1, 0, 14);
    const fov = SR.settings.fov + speedFov + P.fovKick;
    cam.fov = U.damp(cam.fov, fov, 6, 1 / 60);
    cam.updateProjectionMatrix();
  }

  // ------------------------------------------------------------
  //  ARMS ANIMATION
  // ------------------------------------------------------------
  const armT = { L: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, grip: 1 }, R: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, grip: 1 } };
  function animArms(dt, time, aspect) {
    armsCam.aspect = aspect; armsCam.updateProjectionMatrix();
    const ph = P.bob, run = P.bobAmp;
    const hasL = P.rockets > 0;
    arms.launcher.visible = hasL;
    for (const a of arms.list) {
      const s = a.side, T = s < 0 ? armT.L : armT.R;
      // default: forearms angled up and in, like in a real parkour game
      let x = 0, y = 0, z = 0, rx = 0.55, ry = s * 0.42, rz = s * -0.3, grip = 1;
      const pump = Math.sin(ph + (s > 0 ? Math.PI : 0));
      if (P.mode === 'run' && P.grounded && !P.sliding) {
        // running: arms pump up and down
        y = pump * 0.06 * run; z = pump * -0.07 * run; rx = 0.55 + pump * 0.5 * run;
      } else if (P.mode === 'run' && !P.grounded) {
        // in the air: arms up and out for balance
        y = 0.04; z = -0.02; rx = 0.95; ry = s * 0.25; rz = s * -0.5;
      }
      if (P.sliding) {
        if (s < 0) { y = 0.06; z = -0.06; rx = 0.75; ry = s * 0.2; rz = 0.2; grip = 0.2; }
        else { y = -0.12; z = 0.05; rx = 0.1; }
      }
      if (P.mode === 'wallrun' && P.wr) {
        if (s === P.wr.side) { x = s * 0.02; y = 0.15 + Math.sin(ph * 2) * 0.015; z = -0.04; rx = 1.0; ry = s * 0.02; rz = s * 0.7; grip = 0; }
        else { y = pump * 0.06; z = pump * -0.07; rx = 0.55 + pump * 0.5; }
      }
      if (P.mode === 'vault' || P.mode === 'mantle') { y = 0.1; z = -0.1; rx = 0.3; ry = s * 0.2; rz = 0; grip = 0; }
      if (P.mode === 'zip') { x = -s * 0.05; y = 0.14; z = -0.1; rx = 1.2; ry = s * 0.25; rz = 0; grip = 1; }
      if (P.rollAnim > 0) { y = -0.25; rx = 0.1; }
      // right arm holds the rocket launcher
      if (hasL && s > 0 && P.mode !== 'zip') { x = -0.02; y = 0.02; z = P.fireAnim * 0.1; rx = 0.45 + P.fireAnim * 0.4; ry = 0.35; rz = 0; grip = 1; }
      T.x = U.damp(T.x, x, 14, dt); T.y = U.damp(T.y, y, 14, dt); T.z = U.damp(T.z, z, 14, dt);
      T.rx = U.damp(T.rx, rx, 14, dt); T.ry = U.damp(T.ry, ry, 14, dt); T.rz = U.damp(T.rz, rz, 14, dt);
      T.grip = U.damp(T.grip, grip, 10, dt);
      a.pivot.position.set(a.base.x + T.x, a.base.y + T.y, a.base.z + T.z);
      a.pivot.rotation.set(T.rx, T.ry, T.rz);
      for (const f of a.fingers) f.rotation.x = -T.grip * 1.5;
    }
    const L = arms.launcher;
    L.position.set(0.22, -0.2 + armT.R.y * 0.6 + Math.sin(ph) * 0.01 * run, -0.38 + P.fireAnim * 0.14);
    L.rotation.set(P.fireAnim * 0.35, 0.04, 0);
  }
  // arm lighting follows the sun
  function lightArms(sunDir, sunColor, hemiSky, hemiGround, camQuat) {
    const inv = camQuat.clone().invert();
    const d = sunDir.clone().applyQuaternion(inv);
    armsLight.position.copy(d.multiplyScalar(5));
    armsLight.color.copy(sunColor);
    armsHemi.color.copy(hemiSky); armsHemi.groundColor.copy(hemiGround);
  }

  return {
    P, init, reset, respawn, update, applyCamera, animArms, lightArms, setGloves, fwdVec,
    get armsScene() { return armsScene; }, get armsCam() { return armsCam; },
    get launcherTip() { return arms.launcherTip; },
    STAND, CROUCH, R,
  };
})();
