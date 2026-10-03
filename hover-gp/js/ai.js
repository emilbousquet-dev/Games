// ============================================================
//  SIGMA HOVER GP — CPU DRIVERS
//  The computer racers follow a smart "racing line", drift
//  through long corners, dodge things and use items.
// ============================================================
window.HG = window.HG || {};

HG.AI = (function () {
  const U = HG.U;
  let line = null, track = null;
  const fr = HG.Track.makeFrame ? HG.Track.makeFrame() : null;
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

  // ---------- the racing line: hug the inside of corners ----------
  function buildLine(tr) {
    const N = tr.n, L = new Float32Array(N), lim = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      let m = tr.W[i] / 2 - 3.2;
      if (tr.flags[i] & (tr.F.GAP | tr.F.FALL_L | tr.F.FALL_R)) m = Math.min(m, tr.W[i] * 0.22);
      lim[i] = Math.max(0, m);
    }
    // don't drive the line off the end of a ramp sideways
    for (const r of tr.ramps) for (let s = r.s0 - 20; s < r.s1 + r.gap + 10; s += tr.ds) lim[tr.idx(s)] = Math.min(lim[tr.idx(s)], tr.W[tr.idx(s)] * 0.18);
    const X = new Float32Array(N * 3);
    const set = (i) => { const p = tr.P[i], r = tr.R[i]; X[i * 3] = p.x + r.x * L[i]; X[i * 3 + 1] = p.y + r.y * L[i]; X[i * 3 + 2] = p.z + r.z * L[i]; };
    for (let i = 0; i < N; i++) set(i);
    for (const stride of [16, 8, 4, 2, 1]) {
      for (let it = 0; it < 40; it++) {
        for (let i = 0; i < N; i++) {
          const a = (i - stride + N) % N, b = (i + stride) % N;
          const mx = (X[a * 3] + X[b * 3]) / 2, my = (X[a * 3 + 1] + X[b * 3 + 1]) / 2, mz = (X[a * 3 + 2] + X[b * 3 + 2]) / 2;
          const p = tr.P[i], r = tr.R[i];
          const d = (mx - p.x) * r.x + (my - p.y) * r.y + (mz - p.z) * r.z;
          L[i] = U.clamp(U.lerp(L[i], d, 0.6), -lim[i], lim[i]);
          set(i);
        }
      }
    }
    // pull the line onto boost pads
    for (const b of tr.boosts) {
      const lane = b.lane * tr.W[tr.idx(b.s)] / 2;
      for (let s = b.s - 40; s < b.s + b.len; s += tr.ds) {
        const i = tr.idx(s), w = U.clamp(1 - Math.abs(s - b.s) / 40, 0, 1);
        L[i] = U.lerp(L[i], lane, w * 0.85);
      }
    }
    // smooth it once more
    for (let it = 0; it < 4; it++) { const c = L.slice(); for (let i = 0; i < N; i++) L[i] = (c[(i - 1 + N) % N] + c[i] * 2 + c[(i + 1) % N]) / 4; }
    return L;
  }

  function lineAt(s) {
    const f = track.wrap(s) / track.ds;
    const i = Math.floor(f) % track.n, j = (i + 1) % track.n;
    return U.lerp(line[i], line[j], f - Math.floor(f));
  }

  function setup(race) {
    track = race.track;
    line = track.isArena ? null : buildLine(track);
    const diff = race.cfg.difficulty !== undefined ? race.cfg.difficulty : 1;   // 0 easy, 1 normal, 2 hard
    race.karts.forEach((k, i) => {
      k.ai = {
        offset: U.rand(-2.5, 2.5), offT: U.rand(0, 10), skill: U.clamp(0.55 + diff * 0.2 + U.rand(-0.12, 0.12), 0.3, 1),
        stuck: 0, driftWant: 0, itemT: U.rand(1, 3), dodge: 0, reverseT: 0, noise: 0, wanderT: 0, target: null,
      };
      // some CPUs get a rocket start
      if (k.ctrl === 'cpu') k.cpuStart = U.chance(0.35 + diff * 0.2) ? U.rand(1.45, 1.9) : U.rand(0.2, 0.9);
    });
  }

  // how much the road turns over the next stretch (+ right, - left)
  function curveAhead(s, from, to) {
    let sum = 0, n = 0;
    for (let x = from; x <= to; x += 4) { sum += track.K[track.idx(s + x)]; n++; }
    return sum / n;
  }

  function drive(k, race, dt) {
    if (track.isArena) { if (HG.Battle) HG.Battle.driveAI(k, race, dt); return; }
    const ai = k.ai, inp = k.input;
    if (!race.go) { inp.steer = 0; inp.gas = 0; inp.drift = false; return; }
    if (k.disabled) { inp.steer = 0; inp.drift = false; inp.gas = 1; return; }
    const spd = Math.max(8, k.spd);
    // where to aim
    ai.offT += dt;
    const wander = Math.sin(ai.offT * 0.37 + k.id) * 1.6 * (1.2 - ai.skill);
    const look = 7 + spd * 0.5;
    const ts = k.s + look;
    const tf = track.frame(ts, HG.AI.fr2);
    const hw = tf.w / 2;
    let td = lineAt(ts) + (ai.offset * 0.4 + wander) * (1 - ai.skill * 0.5) + ai.dodge + (ai.pass || 0);
    td = U.clamp(td, -hw + 2.2, hw - 2.2);
    // boost pads and coins pull us in
    const target = tmpA.copy(tf.p).addScaledVector(tf.r, td);
    const kf = track.frame(k.s, HG.AI.fr);
    const me = tmpB.copy(kf.p).addScaledVector(kf.r, k.d);
    target.sub(me);
    const want = Math.atan2(target.dot(kf.r), target.dot(kf.t));
    const velYaw = k.yaw + Math.atan2(k.lat, Math.max(4, Math.abs(k.spd)));
    const err = U.wrapAngle(want - velYaw);
    let steer = U.clamp(err * 2.4 - (k.yawRate - 0) * 0.08, -1, 1);
    // ---------- drifting through long curves ----------
    const curve = curveAhead(k.s, 4, 40);
    const R = 1 / Math.max(1e-4, Math.abs(curve));
    if (k.drift.dir === 0) {
      if (R < 70 && k.spd > 20 && k.grounded && ai.skill > 0.45 && U.chance(dt * 6 * ai.skill) && Math.abs(err) < 0.5 && k.d * Math.sign(curve) < kf.w / 2 - 4) {
        ai.driftWant = Math.sign(curve);
      }
    } else {
      // stop drifting when the curve is over (or the boost is big enough)
      const now = curveAhead(k.s, 0, 18);
      if (Math.sign(now) !== k.drift.dir || Math.abs(now) < 1 / 160 || (k.drift.level >= 3 && U.chance(dt * 2)) || err * k.drift.dir < -0.12 || Math.abs(err) > 0.9) ai.driftWant = 0;
    }
    if (ai.driftWant) {
      if (k.drift.dir === 0 && !k.drift.pending) {
        // hop into the drift: press drift (let go first if it's still held) + steer that way
        ai.driftTry = (ai.driftTry || 0) + dt;
        if (ai.driftTry > 0.6) { ai.driftWant = 0; ai.driftTry = 0; inp.drift = false; }
        else { inp.drift = !k.prevIn.drift; steer = ai.driftWant; }
      } else {
        inp.drift = true; ai.driftTry = 0;
        if (k.drift.dir) {
          // steer to adjust the drift so we follow the line
          steer = U.clamp(err * 3.2 * k.drift.dir + 0.2, -1, 1) * k.drift.dir;
        } else steer = ai.driftWant;
      }
    } else inp.drift = false;
    // a little bit of human-like wobble on easy
    ai.noise = U.damp(ai.noise, (Math.random() - 0.5) * 2 * (1 - ai.skill), 3, dt);
    inp.steer = U.clamp(steer + ai.noise * 0.3, -1, 1);
    inp.gas = 1; inp.brake = 0;
    // tricks on ramps
    if (k.trickWindow > 0 && !k.trickDone && U.chance(ai.skill * 0.8)) inp.drift = true;
    // ---------- stuck? back up ----------
    if (k.spd < 3 && race.go) ai.stuck += dt; else ai.stuck = Math.max(0, ai.stuck - dt);
    if (ai.stuck > 1.6) { ai.reverseT = 1.0; ai.stuck = 0; }
    if (ai.reverseT > 0) { ai.reverseT -= dt; inp.gas = 0; inp.brake = 1; inp.steer = -Math.sign(err) || 1; inp.drift = false; }
    if (Math.abs(k.yaw) > 2.2 && k.spd < 6) { inp.steer = Math.sign(k.yaw) * -1; }
    if (k.wrongT > 4) { k.startFall(track); k.wrongT = 0; }
    // overtake: don't drive into the back of someone
    let block = null, bd = 14;
    for (const o of race.karts) {
      if (o === k || o.falling > 0) continue;
      const ds = track.diff(k.s, o.s);
      if (ds > 0.5 && ds < bd && Math.abs(o.d - k.d) < 2.6 && o.spd < k.spd + 2) { bd = ds; block = o; }
    }
    if (block) {
      const room = (side) => { const nd = block.d + side * 3.2; return Math.abs(nd) < kf.w / 2 - 1.5 ? 1 : 0; };
      if (!ai.passSide || !room(ai.passSide)) ai.passSide = room(Math.sign(k.d - block.d) || 1) ? (Math.sign(k.d - block.d) || 1) : -(Math.sign(k.d - block.d) || 1);
      ai.pass = U.clamp((ai.pass || 0) + ai.passSide * dt * 10, -3.5, 3.5);
    } else ai.pass = U.damp(ai.pass || 0, 0, 1.2, dt);
    // dodge things on the road (slime, mines...)
    ai.dodge = U.damp(ai.dodge, 0, 1.5, dt);
    if (HG.Items && HG.Items.dangerAhead) {
      const d = HG.Items.dangerAhead(k, race, 6 + spd * 0.8);
      if (d !== null && ai.skill > 0.4) ai.dodge = U.clamp(ai.dodge + (d > k.d ? -1 : 1) * dt * 14 * ai.skill, -6, 6);
    }
    // items
    if (HG.Items && HG.Items.aiUse && k.ctrl === 'cpu') HG.Items.aiUse(k, race, dt);
  }

  return { setup, drive, lineAt, get line() { return line; }, fr: HG.Track.makeFrame(), fr2: HG.Track.makeFrame() };
})();
