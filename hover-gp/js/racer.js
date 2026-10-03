// ============================================================
//  SIGMA HOVER GP — RIDER + VEHICLE = RACER
//  Sits the character on the vehicle, keeps hands on the
//  handlebars and feet on the pedals, and plays the
//  animations: leaning, tricks, waving, throwing, cheering,
//  crying... plus engine flames and opening wings.
// ============================================================
window.HG = window.HG || {};

HG.Models = (function () {
  const U = HG.U, M = HG.M, D = HG.Chars.D;
  const _v = new THREE.Vector3(), _p = new THREE.Vector3(), _w = new THREE.Vector3();

  // flame cones for the engines (shared shapes)
  let flameGeo = null, coreGeo = null;
  function flameShapes() {
    if (flameGeo) return;
    flameGeo = new THREE.ConeGeometry(0.17, 1, 14, 1, true); flameGeo.translate(0, 0.5, 0); flameGeo.rotateX(-Math.PI / 2);
    coreGeo = new THREE.ConeGeometry(0.09, 1, 10, 1, true); coreGeo.translate(0, 0.5, 0); coreGeo.rotateX(-Math.PI / 2);
  }
  const FLAME_COLORS = { normal: 0x40c8ff, mini1: 0x3a8aff, mini2: 0xff8a1a, mini3: 0xc040ff, turbo: 0xff6a1a, pad: 0xffa020, trick: 0xff6a1a, start: 0xff6a1a, slip: 0x80e0ff, spin: 0x40ffd0, gold: 0xffd020 };

  // ------------------------------------------------------------
  //  A RACER (vehicle + rider). kart can be a real kart or a fake
  //  one for menus: { charId, parts, color }
  // ------------------------------------------------------------
  function racer(kart) {
    flameShapes();
    const C = HG.Chars.byId[kart.charId] || HG.Chars.LIST[0];
    const veh = HG.Vehicles.build(kart.parts, kart.color, C);
    const rig = HG.Chars.build(C.id);
    const group = new THREE.Group();
    group.add(veh.group);
    veh.group.position.y = 0.05;
    veh.group.add(rig.root);
    rig.root.position.copy(veh.seat);
    rig.root.scale.multiplyScalar(1.3);   // big heads, small karts: like a toy!
    // how the rider sits on this kind of vehicle
    const pose = veh.pose;
    rig.hips.rotation.x = pose === 'sit' ? -0.25 : pose === 'sled' ? -0.75 : pose === 'bike' ? 0.1 : 0;
    const pitchBase = pose === 'bike' ? (veh.lean || 0.3) : pose === 'stand' ? 0.12 : pose === 'sled' ? 0.35 : 0.08;
    if (rig.floaty) rig.root.position.y += 0.12;
    // engine flames
    const flames = veh.nozzles.map((n) => {
      const outer = new THREE.Mesh(flameGeo, new THREE.MeshBasicMaterial({ color: FLAME_COLORS.normal, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      outer.castShadow = core.castShadow = false;
      n.obj.add(outer); n.obj.add(core);
      return { outer, core, size: n.size };
    });
    const R = {
      group, veh, rig, kart, glowColor: C.glow,
      t: Math.random() * 5, cheekyT: 0, happyT: 0, lastPlace: kart.place || 0, lookT: 0, lookCheck: 0, glide: 0, waveT: 0,
      sparkPoints: veh.spark, flamesList: flames,
      update(dt, k) { animateRacer(R, dt, k || kart, pose, pitchBase); },
    };
    return R;
  }

  // arm and leg targets in different spaces
  function vehPoint(veh, p, out) { return veh.group.localToWorld(out.copy(p)); }
  function bodyPoint(rig, x, y, z, out) { return rig.hips.localToWorld(out.set(x, y, z)); }

  function animateRacer(R, dt, k, pose, pitchBase) {
    const rig = R.rig, veh = R.veh, a = k.anim || {};
    R.t += dt;
    const t = R.t;
    const hurt = k.hitT > 0 || (a.hurtFace > 0 && k.hitT > 0);
    const finished = k.finished;
    const celebrate = finished && k.place <= 3 && !HG.Race.battle;
    const sad = finished && k.place >= 7;
    // passing someone: Lille Plut blows a raspberry, others smile
    if (k.place && R.lastPlace && k.place < R.lastPlace && !finished) {
      if (rig.def.baby) { R.cheekyT = 1.6; k.events && k.events.push({ type: 'raspberry' }); } else R.happyT = 0.9;
    }
    R.lastPlace = k.place;
    if (R.cheekyT > 0) R.cheekyT -= dt;
    if (R.happyT > 0) R.happyT -= dt;
    // look back sometimes when someone is right behind
    R.lookCheck -= dt;
    if (R.lookCheck <= 0 && HG.Race && HG.Race.karts && k.s !== undefined && !HG.Race.track.isArena) {
      R.lookCheck = 0.6;
      const near = HG.Race.karts.some((o) => o !== k && HG.Race.track.diff(o.s, k.s) > 1.5 && HG.Race.track.diff(o.s, k.s) < 7 && Math.abs(o.d - k.d) < 4);
      if (near && Math.random() < 0.35) R.lookT = 0.9;
    }
    if (R.lookT > 0) R.lookT -= dt;
    const look = (k.input && k.input.lookBack) || R.lookT > 0 ? (k.id % 2 ? 1 : -1) : 0;
    const trick = k.trick > 0 ? U.clamp(k.trick / 0.55, 0, 1) : 0;
    const st = {
      steer: k.steerSm || 0, drift: k.drift ? k.drift.level + (k.drift.dir ? 1 : 0) : 0, lean: (a.lean || 0) * 0.9,
      boost: k.boosting, air: !k.grounded, hit: hurt, trick, look, celebrate, sad, throwT: a.throwT || 0,
      cheeky: R.cheekyT > 0, mood: R.happyT > 0 ? 'happy' : null, speed: U.clamp(Math.abs(k.spd || 0) / 35, 0, 1.3), pitchBase,
      idle: !!k.menu,
    };
    HG.Chars.animate(rig, dt, st);
    // ---------- hands ----------
    veh.group.updateMatrixWorld(true);
    const poleArm = (side) => veh.group.localToWorld(_w.set(side * 1, -0.7, -0.6)).sub(veh.group.getWorldPosition(_p)).normalize();
    for (let i = 0; i < rig.arms.length; i++) {
      const arm = rig.arms[i], side = arm.side;
      let target = vehPoint(veh, veh.hands[i], _v);
      const right = side < 0;
      if (celebrate) {
        // fist pumps!
        const pump = Math.sin(t * 7 + (right ? 0 : 1.5));
        target = bodyPoint(rig, side * 0.25, 0.75 + pump * 0.12, 0.05, _v);
      } else if (sad) {
        target = bodyPoint(rig, side * 0.18, 0.05, 0.25, _v);
      } else if (trick > 0) {
        const tt = k.trickType;
        if (tt === 0 || (tt === 3 && right)) target = bodyPoint(rig, side * 0.28, 0.82, 0.05 + Math.sin(t * 20) * 0.04, _v);
        else if (tt === 1) target = bodyPoint(rig, side * 0.2, 0.42, 0.55, _v);
        else if (tt === 2 && right) target = bodyPoint(rig, side * 0.6, 0.35, 0.0, _v);
        else if (tt === 4) target = bodyPoint(rig, side * 0.42, 0.55, -0.1, _v);
      } else if (st.throwT > 0 && right) {
        // throw: arm swings from behind to the front
        const p = 1 - U.clamp(st.throwT / 0.4, 0, 1);
        const dir = a.throwDir || 1;
        target = bodyPoint(rig, -0.3, 0.55 + Math.sin(p * Math.PI) * 0.25, dir * U.lerp(-0.35, 0.45, p), _v);
      } else if (rig.def.baby && (st.cheeky || (k.boosting && Math.sin(t * 3) > 0))) {
        // baby flails his arms
        target = bodyPoint(rig, side * (0.3 + Math.sin(t * 13 + side) * 0.08), 0.6 + Math.sin(t * 17 + side * 2) * 0.12, 0.2, _v);
      } else if (hurt) {
        target = bodyPoint(rig, side * 0.3, 0.7 + Math.sin(t * 12 + side) * 0.1, 0.15, _v);
      }
      M.ik(arm.up, arm.lo, target, D.L1, D.L2, poleArm(side));
    }
    // ---------- legs ----------
    if (rig.legs.length) {
      const poleLeg = (side) => veh.group.localToWorld(_w.set(side * 0.35, 0.6, 1)).sub(veh.group.getWorldPosition(_p)).normalize();
      for (let i = 0; i < rig.legs.length; i++) {
        const leg = rig.legs[i];
        let target = vehPoint(veh, veh.feet[i], _v);
        if (celebrate && pose !== 'stand') target.y += Math.abs(Math.sin(t * 7 + i)) * 0.1;
        M.ik(leg.up, leg.lo, target, D.L3, D.L4, poleLeg(leg.side));
        leg.foot.rotation.x = -leg.up.rotation.x * 0;
      }
    }
    if (rig.floaty) rig.root.position.y = R.veh.seat.y + 0.12 + Math.sin(t * 2.5) * 0.05;
    // ---------- vehicle bits ----------
    if (veh.wheel) {
      const s = -(k.steerSm || 0);
      if (veh.wheelAxis === 'y') veh.wheel.rotation.y = s * 0.35;
      else if (veh.wheelAxis === 'z') veh.wheel.rotation.z = s * 0.4;
      else veh.wheel.rotation.z = s * 1.3;
    }
    for (const f of veh.fans) f.rotation.z += dt * (6 + Math.abs(k.spd || 0) * 1.2);
    for (const r of veh.reactors) r.children[0].scale.setScalar(1 + Math.sin(t * 9) * 0.1);
    for (const p of veh.pads) if (p.glow) p.glow.material.color.setHex(R.glowColor).multiplyScalar(1.4 + Math.sin(t * 8 + p.g.id) * 0.3);
    // wings open while gliding
    R.glide = U.damp(R.glide, k.gliding ? 1 : 0, 6, dt);
    if (veh.glider) {
      const gs = Math.max(0.001, R.glide);
      veh.glider.scale.setScalar(gs);
      veh.glider.visible = gs > 0.01;
      for (const w of veh.wings) w.rotation.z = Math.sin(t * 3) * 0.05 * R.glide;
    }
    // ---------- flames ----------
    const kind = k.sigmaT > 0 ? 'gold' : k.goldT > 0 ? 'gold' : k.boostT > 0 ? (k.boostKind || 'turbo') : 'normal';
    const boost = k.boosting ? 1 : 0;
    const throttle = k.input ? U.clamp(k.input.gas || 0, 0, 1) : (k.menu ? 0.3 : 0);
    const drift = k.drift && k.drift.dir ? k.drift.level : 0;
    let col = FLAME_COLORS[kind] || FLAME_COLORS.turbo;
    if (!boost && drift) col = [FLAME_COLORS.normal, FLAME_COLORS.mini1, FLAME_COLORS.mini2, FLAME_COLORS.mini3][drift];
    if (k.sigmaT > 0) col = new THREE.Color().setHSL((t * 1.5) % 1, 1, 0.55).getHex();
    const len = (0.35 + throttle * 0.35 + boost * 1.3 + (a.rev ? 0.4 : 0)) * (0.85 + Math.random() * 0.3);
    for (let i = 0; i < veh.nozzles.length; i++) {
      const fl = R.flamesList[i];
      fl.outer.scale.set(fl.size * (1 + boost * 0.4), fl.size * (1 + boost * 0.4), len * fl.size);
      fl.core.scale.set(fl.size, fl.size, len * fl.size * 0.6);
      fl.outer.material.color.setHex(col);
      fl.outer.visible = fl.core.visible = !(k.falling > 0) && !k.out;
    }
  }

  // ------------------------------------------------------------
  //  A CHARACTER STANDING ON THE GROUND (menus and the podium)
  // ------------------------------------------------------------
  function character(charId) {
    const rig = HG.Chars.build(charId);
    const C = rig.def;
    const legLen = D.L3 + D.L4 + 0.06;
    const S = {
      rig, root: rig.root, t: Math.random() * 3, mode: 'idle', walkPhase: 0,
      update(dt, o = {}) {
        S.t += dt;
        const t = S.t, mode = o.mode || S.mode;
        const st = { idle: mode === 'idle', celebrate: mode === 'win', sad: mode === 'lose', cheeky: mode === 'cheeky', mood: o.mood || (mode === 'wave' ? 'happy' : null), pitchBase: 0 };
        HG.Chars.animate(rig, dt, st);
        const walking = mode === 'walk' || (C.baby && o.toddle);
        if (walking) S.walkPhase += dt * (C.baby ? 9 : 7);
        const ph = S.walkPhase;
        // hips height (feet on the ground) + waddle
        const sc = rig.root.scale.y;
        rig.root.position.y = (rig.floaty ? legLen + 0.1 + Math.sin(t * 2.5) * 0.06 : legLen) * sc + (walking ? Math.abs(Math.sin(ph)) * 0.03 : 0) + (mode === 'win' ? Math.max(0, Math.sin(t * 7)) * 0.12 : 0);
        rig.hips.rotation.z = walking && C.baby ? Math.sin(ph) * 0.18 : 0;
        rig.hips.rotation.x = 0;
        for (const leg of rig.legs) {
          const sw = walking ? Math.sin(ph + (leg.side > 0 ? 0 : Math.PI)) * (C.baby ? 0.45 : 0.55) : 0;
          leg.up.quaternion.setFromEuler(new THREE.Euler(-sw, 0, leg.side * (C.baby ? 0.12 : 0.04), 'XYZ'));
          leg.lo.quaternion.setFromEuler(new THREE.Euler(walking ? Math.max(0, Math.sin(ph + (leg.side > 0 ? 0 : Math.PI) + 1.2)) * 0.7 : 0, 0, 0, 'XYZ'));
        }
        for (const arm of rig.arms) {
          const right = arm.side < 0;
          let x = 0, z = arm.side * 0.18, ex = -0.15;
          if (walking) x = Math.sin(S.walkPhase + (arm.side > 0 ? Math.PI : 0)) * 0.5;
          if (mode === 'win') { z = arm.side * (2.6 + Math.sin(t * 7 + arm.side) * 0.25); ex = -0.3; }
          else if (mode === 'lose') { z = arm.side * 0.08; x = 0.15; }
          else if ((mode === 'wave' || mode === 'select') && right) { z = arm.side * 2.5; ex = -0.6 - Math.sin(t * 9) * 0.5; }
          else if (C.baby && (mode === 'cheeky' || o.toddle)) { z = arm.side * (1.2 + Math.sin(t * 11 + arm.side) * 0.5); x = -0.4; }
          else { z += Math.sin(t * 1.6) * 0.04 * arm.side; }
          arm.up.quaternion.setFromEuler(new THREE.Euler(x, 0, z, 'XYZ'));
          arm.lo.quaternion.setFromEuler(new THREE.Euler(ex, 0, 0, 'XYZ'));
        }
      },
    };
    return S;
  }

  return { racer, character, FLAME_COLORS };
})();
