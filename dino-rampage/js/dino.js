// ============================================================
//  DINO RAMPAGE — THE DINO (that's you!)
//  Walking, running, jumping, biting, tail whips, belly flops,
//  the SUPER ROAR... and GROWING!
// ============================================================
window.DR = window.DR || {};

DR.Dino = (function () {
  const U = DR.U, Mo = DR.Models, City = DR.City, FX = DR.FX, A = DR.Audio, H = DR.HUD;
  const PI = Math.PI;
  const SIZES = [1, 1.9, 3.4, 6, 10.5];     // how big you are at each size
  const GROW_IN_SIZE = 0.3;                 // you also grow a bit while filling the bar

  const D = {
    x: 0, z: 0, y: 0, vy: 0, vx: 0, vz: 0, yaw: 0, onGround: true, airT: 0,
    tier: 1, growth: 0, scale: 1, scaleV: 0, r: 0.55,
    act: null, actT: 0, spin: 0, eatT: 0, flop: false,
    roar: 0, roarReady: false,
    camYaw: PI, camPitch: 0.32, camDist: 6, camIdle: 0, zoom: 1,
    bonkCd: 0, tipCd: {}, lastStep: 0,
    score: 0, combo: 0, comboT: 0,
    need: [0, 25, 100, 330, 900], rampNeed: 500, rampage: 0, won: false,
    stats: { smashed: 0, eaten: 0, cars: 0, houses: 0, towers: 0, bestCombo: 0, people: 0 },
    model: null, hit: new Set(), speedNow: 0,
  };
  const on = { smash() {}, grow() {}, win() {}, roar() {} };
  let scene, camera;

  function init(sc) {
    scene = sc;
    camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1200);
  }
  function resize(aspect) { camera.aspect = aspect; camera.updateProjectionMatrix(); }

  // how much growing you need for each size (depends on what's in the city)
  function computeNeeds() {
    const tot = City.totals().grow;
    const want = [0, 30, 140, 420, 650];
    const need = [0];
    let sum = 0;
    for (let t = 1; t <= 4; t++) { sum += Math.max(10, Math.min(want[t], tot[t] * 0.45 + tot[t - 1] * 0.15)); need.push(sum); }
    D.need = need;
    D.rampNeed = Math.max(250, Math.min(900, tot[5] * 0.6 + tot[4] * 0.15));
  }

  function makeModel(skin, hat) {
    if (D.model) scene.remove(D.model);
    D.model = Mo.dino(skin, hat);
    scene.add(D.model);
    D.shadowBlob = Mo.blobShadow(D.model, 0.8);
  }
  function reset(skin, hat) {
    const s = City.startPos();
    Object.assign(D, {
      x: s.x, z: s.z, y: 0, vy: 0, vx: 0, vz: 0, yaw: PI * 0.25, onGround: true, airT: 0,
      tier: 1, growth: 0, scale: SIZES[0], scaleV: 0, r: 0.55,
      act: null, actT: 0, spin: 0, eatT: 0, flop: false, roar: 0, roarReady: false,
      camYaw: PI * 1.25, camPitch: 0.32, camIdle: 0, camBoost: 0, zoom: 1, bonkCd: 0, tipCd: {}, lastStep: 0,
      score: 0, combo: 0, comboT: 0, rampage: 0, won: false,
      stats: { smashed: 0, eaten: 0, cars: 0, houses: 0, towers: 0, bestCombo: 0, people: 0 },
      speedNow: 0,
    });
    D.camDist = camTargetDist();
    computeNeeds();
    makeModel(skin, hat);
    place();
    updateCamera(0, { mx: 0, my: 0, camTurn: 0, camTilt: 0 });
  }

  // ------------------------------------------------------------
  //  GROWING
  // ------------------------------------------------------------
  function progress() {
    if (D.tier >= 5) return D.rampage;
    const a = D.need[D.tier - 1], b = D.need[D.tier];
    return U.clamp((D.growth - a) / (b - a), 0, 1);
  }
  function targetScale() { return SIZES[D.tier - 1] * (1 + GROW_IN_SIZE * progress()); }
  function addGrowth(g) {
    if (D.won) return;
    D.growth += g;
    while (D.tier < 5 && D.growth >= D.need[D.tier]) {
      D.tier++;
      A.grow();
      FX.sparkle(D.x, D.y + D.scale, D.z, D.scale * 0.8, 24, 0x9aff6a);
      FX.ring(D.x, D.z, D.scale * 8, 0x9aff6a, 0.9);
      D.scaleV += 4;
      on.grow(D.tier);
    }
    if (D.tier >= 5) {
      D.rampage = U.clamp((D.growth - D.need[4]) / D.rampNeed, 0, 1);
      if (D.rampage >= 1 && !D.won) { D.won = true; on.win(); }
    }
  }

  // ------------------------------------------------------------
  //  SMASHING THINGS!
  // ------------------------------------------------------------
  function smash(o, how) {
    if (!o.alive) return;
    City.remove(o);
    const pan = 0;
    const vh = Math.max(0.3, o.h / 2);
    if (o.food) {
      D.eatT = 0.9;
      A.munch();
      FX.burst(o.x, 0, o.z, o.vw * 0.5, vh * 0.6, o.vd * 0.5, o.cols, 8 + o.tier * 6, 0.6 + o.tier * 0.15, 0.6);
      FX.sparkle(o.x, o.h, o.z, Math.max(0.6, o.h * 0.3), 10, 0xffe070);
      H.popup('YUM!', o.x, o.h + 1, o.z, 'yum');
      D.stats.eaten++;
      if (o.tier >= 3) { FX.collapse(o); A.crash(o.tier, pan, true); } else City.detachMesh(o);
    } else {
      const n = [0, 7, 12, 22, 34, 50][o.tier];
      FX.burst(o.x, 0, o.z, o.vw * 0.8, vh, o.vd * 0.8, o.cols, n, 0.7 + o.tier * 0.2);
      FX.dust(o.x, 0.3, o.z, Math.max(1, Math.max(o.vw, o.vd) * 1.4), 2 + o.tier * 2);
      const glassy = ['house', 'shop', 'apartment', 'tower', 'hotel', 'car', 'bus', 'phonebooth', 'busstop', 'gasstation'].includes(o.kind);
      A.crash(o.tier, pan, glassy);
      if (o.kind === 'car' && Math.random() < 0.35) A.alarm();
      if (o.kind === 'watertower' || o.kind === 'hydrant' || o.kind === 'fountain') { A.splash(); FX.dust(o.x, o.h * 0.5, o.z, Math.max(2, o.h * 0.5), 10, 0x8ad8ff); }
      if (o.kind === 'ferris' && o.spin) {
        // the wheel rolls away down the street!
        const wheel = o.spin;
        const wp = new THREE.Vector3(); wheel.getWorldPosition(wp);
        o.mesh.remove(wheel);
        wheel.position.copy(wp); wheel.rotation.y = o.mesh.rotation.y;
        City.group.add(wheel);
        const dx = Math.cos(o.mesh.rotation.y), dz = -Math.sin(o.mesh.rotation.y);
        const away = (o.x - D.x) * dx + (o.z - D.z) * dz >= 0 ? 1 : -1;
        FX.roll(wheel, dx * away, dz * away, 16, 15.5, 5, (x, z) => {
          FX.burst(x, 0, z, 10, 12, 3, [0xffffff, 0xff4a6a, 0x3aa8ff, 0xffd23a], 50, 1.4);
          FX.dust(x, 1, z, 20, 10);
          A.crash(5, 0, true);
          if (wheel.parent) wheel.parent.remove(wheel);
        });
      }
      if (o.tier >= 3) { FX.collapse(o); City.addRubble(o); } else City.detachMesh(o);
    }
    FX.fx.shake = Math.min(1.5, FX.fx.shake + 0.08 + o.tier * 0.08 * (o.tier >= D.tier ? 1 : 0.5));
    // how much you grow (smaller things count less when you're big)
    const diff = D.tier - o.tier;
    const k = diff <= 0 ? 1 : diff === 1 ? 0.45 : diff === 2 ? 0.15 : 0.05;
    addGrowth(o.grow * k);
    // points & combos
    D.combo = D.comboT > 0 ? D.combo + 1 : 1;
    D.comboT = 2.2;
    D.stats.bestCombo = Math.max(D.stats.bestCombo, D.combo);
    const pts = o.pts * Math.min(D.combo, 10);
    D.score += pts;
    H.combo(D.combo);
    if (!o.food) H.popup('+' + pts, o.x, Math.min(o.h, 4 + D.scale * 2) + 0.5, o.z, D.combo >= 5 ? 'big' : '');
    A.point(D.combo);
    D.roar = Math.min(1, D.roar + (o.food ? 0.12 : 0.02 + o.tier * 0.012) * (diff >= 2 ? 0.4 : 1));
    D.stats.smashed++;
    if (o.kind === 'car' || o.kind === 'bus' || o.kind === 'truck' || o.kind === 'icecreamtruck') D.stats.cars++;
    if (o.kind === 'house') D.stats.houses++;
    if (o.tier === 5) D.stats.towers++;
    on.smash(o, how);
  }

  // hit everything in a circle (that is small enough)
  function hitArea(x, z, r, how, once) {
    let n = 0, bonk = null;
    for (const o of City.query(x, z, r)) {
      if (once && D.hit.has(o)) continue;
      if (o.tier <= D.tier) { if (once) D.hit.add(o); smash(o, how); n++; }
      else if (!bonk) bonk = o;
    }
    return { n, bonk };
  }

  // ------------------------------------------------------------
  //  MOVING AROUND
  // ------------------------------------------------------------
  const baseSpeed = () => 4.8 * Math.pow(D.scale, 0.72);
  function update(dt, inp) {
    const s = D.scale;
    D.comboT -= dt; if (D.comboT <= 0 && D.combo > 0) { D.combo = 0; H.combo(0); }
    D.bonkCd -= dt;
    for (const k in D.tipCd) D.tipCd[k] -= dt;
    if (D.eatT > 0) D.eatT -= dt;
    // --- actions ---
    if (D.act) {
      D.actT += dt;
      const dur = { bite: 0.42, whip: 0.62, roar: 1.6, grow: 0.8 }[D.act] || 0.5;
      if (D.act === 'bite' && D.actT >= 0.14 && !D.hit.has('done')) {
        D.hit.add('done');
        const reach = 1.0 * s + 0.4;
        const bx = D.x + Math.sin(D.yaw) * reach, bz = D.z + Math.cos(D.yaw) * reach;
        const res = hitArea(bx, bz, 0.8 * s + 0.3, 'bite');
        A.bite();
        DR.People.shockwave(bx, bz, 0.9 * s + 0.5, 0.6, D.tier === 1);
        if (!res.n && res.bonk) tooBig(res.bonk);
      }
      if (D.act === 'whip') {
        D.spin = -PI * 2 * U.smooth(Math.min(1, D.actT / dur));
        if (D.actT > 0.1 && D.actT < 0.5) {
          const res = hitArea(D.x, D.z, 2.3 * s + 0.3, 'whip', true);
          if (!res.n && res.bonk && !D.hit.has('bonked')) { D.hit.add('bonked'); tooBig(res.bonk); }
        }
      }
      if (D.act === 'roar' && D.actT >= 0.3 && !D.hit.has('done')) { D.hit.add('done'); roarBlast(); }
      if (D.actT >= dur) { D.act = null; D.spin = 0; }
    }
    // --- start actions ---
    if (!D.act && D.onGround) {
      if (inp.bite) startAct('bite');
      else if (inp.tail) { startAct('whip'); A.whoosh(); DR.People.shockwave(D.x, D.z, 2.8 * s + 0.5, 1, D.tier === 1); }
      else if (inp.roar) {
        if (D.roar >= 1) { startAct('roar'); D.roar = 0; A.roar(s); }
        else if ((D.tipCd.roar || 0) <= 0) { D.tipCd.roar = 5; H.tip('Your <b>ROAR</b> is not ready yet! Smash and eat more things to fill up the orange circle.', 3.5); }
      }
    }
    // --- walking ---
    const f = { x: -Math.sin(D.camYaw), z: -Math.cos(D.camYaw) };
    const rt = { x: Math.cos(D.camYaw), z: -Math.sin(D.camYaw) };
    let wx = f.x * inp.move + rt.x * inp.strafe, wz = f.z * inp.move + rt.z * inp.strafe;
    const len = Math.hypot(wx, wz);
    if (len > 1) { wx /= len; wz /= len; }
    let spd = baseSpeed() * (inp.run ? 1.75 : 1);
    if (D.act === 'roar') spd = 0;
    else if (D.act === 'bite') spd *= 0.35;
    else if (D.eatT > 0) spd *= 0.6;
    const tvx = wx * spd, tvz = wz * spd;
    const grip = D.onGround ? 9 : 2.5;
    D.vx = U.damp(D.vx, tvx, grip, dt); D.vz = U.damp(D.vz, tvz, grip, dt);
    if (len > 0.1 && D.act !== 'roar' && D.act !== 'whip') {
      const ty = Math.atan2(wx, wz);
      D.yaw += U.angleDiff(D.yaw, ty) * Math.min(1, dt * 9);
    }
    // --- jumping & belly flops ---
    if (inp.jump && D.onGround && !D.act) {
      D.vy = 6.5 * Math.sqrt(s); D.onGround = false; D.airT = 0; A.jump();
    } else if ((inp.jump || inp.bite) && !D.onGround && !D.flop && D.airT > 0.1) {
      D.flop = true; D.vy = -24 * Math.sqrt(s);
    }
    if (!D.onGround) {
      D.airT += dt;
      D.vy -= 22 * Math.pow(s, 0.3) * dt;
      D.y += D.vy * dt;
      if (D.y <= 0) { D.y = 0; D.onGround = true; land(); }
    }
    // --- move & bump into things ---
    let nx = D.x + D.vx * dt, nz = D.z + D.vz * dt;
    D.r = 0.55 * s;
    const near = City.query(nx, nz, D.r + 0.5);
    for (const o of near) {
      if (!o.alive) continue;
      if (D.y > o.h * 0.85) continue;      // jumping over it
      const dist = City.boxDist(o, nx, nz);
      if (dist >= D.r) continue;
      if (o.tier <= D.tier) { smash(o, 'stomp'); continue; }
      // too big: push the dino back out
      const cx = U.clamp(nx, o.x - o.hx, o.x + o.hx), cz = U.clamp(nz, o.z - o.hz, o.z + o.hz);
      if (dist > 0.001) {
        const ux = (nx - cx) / dist, uz = (nz - cz) / dist;
        nx = cx + ux * D.r; nz = cz + uz * D.r;
      } else {
        const px = o.hx - Math.abs(nx - o.x), pz = o.hz - Math.abs(nz - o.z);
        if (px < pz) nx = o.x + Math.sign(nx - o.x || 1) * (o.hx + D.r); else nz = o.z + Math.sign(nz - o.z || 1) * (o.hz + D.r);
      }
      if (Math.hypot(D.vx, D.vz) > baseSpeed() * 0.5) tooBig(o);
    }
    const info = City.info;
    nx = U.clamp(nx, -8, info.w + 8);
    nz = U.clamp(nz, -8, Math.min(info.d + 8, info.shore - D.r));
    D.speedNow = Math.hypot(nx - D.x, nz - D.z) / Math.max(dt, 1e-4);
    D.x = nx; D.z = nz;
    // --- size (springy!) ---
    const ts = targetScale();
    D.scaleV += (ts - D.scale) * 40 * dt - D.scaleV * 7 * dt;
    D.scale += D.scaleV * dt;
    if (D.scale < 0.3) D.scale = 0.3;
    // --- footsteps ---
    const ph = D.model.userData.phase || 0;
    const step = Math.floor(ph / PI);
    if (step !== D.lastStep && D.onGround && D.speedNow > 0.5) {
      D.lastStep = step;
      A.stomp(s);
      const side = step % 2 ? 1 : -1;
      const fx = D.x + Math.cos(D.yaw) * side * 0.3 * s, fz = D.z - Math.sin(D.yaw) * side * 0.3 * s;
      if (s > 2) FX.dust(fx, 0.2, fz, 0.6 * s, 2);
      if (s > 3) FX.fx.shake = Math.max(FX.fx.shake, 0.12 + s * 0.02);
    }
    place(dt);
  }
  function startAct(a) { D.act = a; D.actT = 0; D.hit.clear(); }
  function tooBig(o) {
    o.wobble = 0.5;
    if (D.bonkCd > 0) return;
    D.bonkCd = 1;
    A.boing();
    H.popup('TOO BIG!', o.x, Math.min(o.h, D.scale * 2 + 2), o.z, 'nope');
    if ((D.tipCd.big || 0) <= 0) {
      D.tipCd.big = 12;
      H.tip(`That <b>${o.name}</b> is too big for you right now! Grow bigger by smashing things and eating snacks 🍉`, 4);
    }
  }
  function land() {
    const s = D.scale;
    if (D.flop) {
      D.flop = false;
      const R = 3.4 * s + 0.6;
      hitArea(D.x, D.z, R, 'flop');
      FX.ring(D.x, D.z, R * 1.6, 0xffe8b0, 0.6);
      FX.dust(D.x, 0.3, D.z, R, 12);
      FX.fx.shake = Math.min(2, FX.fx.shake + 1.2);
      A.flop(s);
      DR.People.shockwave(D.x, D.z, R * 1.8, 2, D.tier === 1);
      H.popup('BELLY FLOP!', D.x, s * 2, D.z, 'big');
    } else {
      A.land(s);
      FX.dust(D.x, 0.2, D.z, 1.2 * s, 5);
      FX.fx.shake = Math.max(FX.fx.shake, 0.3);
      DR.People.shockwave(D.x, D.z, 1.8 * s, 0.6, D.tier === 1);
    }
  }
  // SUPER ROAR: things fly away, people run, the ground shakes!
  function roarBlast() {
    const s = D.scale;
    const R = 11 * s + 6;
    FX.ring(D.x, D.z, R, 0xff9a5a, 0.9);
    FX.ring(D.x, D.z, R * 0.6, 0xffe0a0, 0.7);
    FX.fx.shake = 2;
    H.flash('#ffb070', 0.3);
    const list = City.query(D.x, D.z, R).filter((o) => o.tier <= D.tier).sort((a, b) => U.dist(a.x, a.z, D.x, D.z) - U.dist(b.x, b.z, D.x, D.z));
    list.slice(0, 26).forEach((o) => {
      const d = Math.max(1, U.dist(o.x, o.z, D.x, D.z));
      const ux = (o.x - D.x) / d, uz = (o.z - D.z) / d;
      const pw = (6 + s * 1.5) * (1.2 - d / R * 0.6) / Math.sqrt(o.tier);
      City.remove(o);
      // it flies, then smashes when it lands
      FX.fly(o, ux * pw, pw * 1.3 + 4, uz * pw, (ob) => { ob.alive = true; smash(ob, 'roar'); });
    });
    for (const o of City.query(D.x, D.z, R)) if (o.tier === D.tier + 1) o.wobble = 1;
    DR.People.roared(D.x, D.z, R * 1.8, D.tier === 1);
    on.roar();
  }

  // put the 3D model where the dino is, and animate it
  function place(dt = 0) {
    const m = D.model;
    m.position.set(D.x, D.y, D.z);
    m.rotation.y = D.yaw + D.spin;
    m.scale.setScalar(D.scale);
    const w = D.speedNow / baseSpeed();
    const actP = (a, dur) => (D.act === a ? U.clamp(D.actT / dur, 0, 1) : 0);
    Mo.animateDino(m, dt, {
      walk: D.onGround ? w : 0, rate: 1 / Math.pow(D.scale, 0.25), air: !D.onGround && !D.flop, flop: D.flop,
      bite: actP('bite', 0.42), roar: actP('roar', 1.6), whip: actP('whip', 0.62), eat: D.eatT > 0 ? 1 - D.eatT / 0.9 : 0,
      turn: 0,
    });
    if (D.shadowBlob) { D.shadowBlob.position.y = (0.03 - D.y) / D.scale; const k = 1 / (1 + D.y / (D.scale * 3)); D.shadowBlob.scale.set(1.6 * k, 1.6 * k, 1); }
  }

  // ------------------------------------------------------------
  //  THE CAMERA (floats behind the dino)
  // ------------------------------------------------------------
  function camTargetDist() { return (3.6 + 3.2 * D.scale) * D.zoom; }
  const cv = new THREE.Vector3();
  function updateCamera(dt, inp) {
    const s = D.scale;
    const mouseMoved = Math.abs(inp.mx) + Math.abs(inp.my) > 0 || Math.abs(inp.camTurn) > 0.05;
    D.camYaw -= inp.mx * 0.0028 + inp.camTurn * 2.4 * dt;
    D.camPitch = U.clamp(D.camPitch + inp.my * 0.0022 + inp.camTilt * 1.6 * dt, 0.02, 1.25);
    D.camIdle = mouseMoved ? 0 : D.camIdle + dt;
    // when you don't touch the mouse, the camera slowly swings behind the dino
    if (D.camIdle > 1.2 && D.speedNow > 0.5 && dt > 0) {
      const behind = D.yaw + PI;
      D.camYaw += U.angleDiff(D.camYaw, behind) * Math.min(1, dt * 1.1);
    }
    const tx = D.x, ty = D.y * 0.7 + 1.25 * s, tz = D.z;
    let want = camTargetDist();
    // is a big building between the camera and the dino? (k = how far along, 0..1)
    const blocker = (pitch, dist) => {
      const dx = Math.sin(D.camYaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = Math.cos(D.camYaw) * Math.cos(pitch);
      for (let i = 2; i <= 10; i++) {
        const k = i / 10, px = tx + dx * dist * k, py = ty + dy * dist * k, pz = tz + dz * dist * k;
        const o = City.query(px, pz, 0.8).find((q) => q.tier > D.tier && q.h > py && q.h > 3);
        if (o) return { o, k, hd: dist * k * Math.cos(pitch) };
      }
      return null;
    };
    // first try to fly the camera up over the building...
    const b1 = dt > 0 ? blocker(D.camPitch + (D.camBoost || 0), want) : null;
    let boost = 0;
    if (b1) boost = U.clamp(Math.atan2(b1.o.h + 1.5 - ty, Math.max(1, b1.hd)) - D.camPitch, 0, Math.max(0, 1.2 - D.camPitch));
    D.camBoost = U.damp(D.camBoost || 0, b1 ? Math.max(boost, D.camBoost || 0) : 0, b1 ? 5 : 1.2, dt || 1);
    const pitch = D.camPitch + D.camBoost;
    // ...and if that's not enough, move the camera closer
    const b2 = dt > 0 ? blocker(pitch, want) : null;
    if (b2) want = Math.max(2 + s, want * (b2.k - 0.1));
    const dirx = Math.sin(D.camYaw) * Math.cos(pitch), diry = Math.sin(pitch), dirz = Math.cos(D.camYaw) * Math.cos(pitch);
    D.camDist = dt > 0 ? U.damp(D.camDist, want, want < D.camDist ? 10 : 2.5, dt) : want;
    const d = D.camDist;
    cv.set(tx + dirx * d, Math.max(0.4, ty + diry * d), tz + dirz * d);
    const sh = FX.fx.shake * 0.12 * Math.pow(s, 0.8);
    if (sh > 0) cv.add(new THREE.Vector3((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh));
    camera.position.copy(cv);
    camera.lookAt(tx, ty + 0.3 * s, tz);
    const fov = 60 + (inp.run && D.speedNow > baseSpeed() ? 6 : 0);
    camera.fov = U.damp(camera.fov, fov, 4, dt || 1);
    camera.far = 500 + 260 * s;
    camera.near = 0.1 * Math.max(1, s * 0.5);
    camera.updateProjectionMatrix();
  }

  return {
    D, on, init, resize, reset, update, updateCamera, place, makeModel, progress, smash, addGrowth, SIZES,
    get camera() { return camera; },
  };
})();
