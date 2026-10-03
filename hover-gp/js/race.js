// ============================================================
//  SIGMA HOVER GP — THE RACE
//  Starting grid, countdown, laps, who is in front, bumping
//  into each other, slipstream, and the finish line.
// ============================================================
window.HG = window.HG || {};

HG.Race = (function () {
  const U = HG.U;
  const STEP = 1 / 120;
  const R = {
    track: null, def: null, theme: null, karts: [], cfg: null,
    phase: 'none', t: 0, time: 0, go: false, countdown: 0, acc: 0,
    finishOrder: [], battle: false, laps: 3, events: [],
  };

  function setup(cfg) {
    R.cfg = cfg;
    R.battle = cfg.mode === 'battle';
    R.def = cfg.trackDef || HG.TRACKS.find((t) => t.id === cfg.track) || HG.TRACKS[0];
    R.theme = HG.THEMES[R.def.theme] || HG.THEMES.grass;
    R.track = R.def.arena ? new HG.Arena(R.def) : new HG.Track(R.def);
    R.laps = cfg.laps || R.def.laps || 3;
    R.karts = [];
    R.finishOrder = [];
    R.phase = cfg.skipIntro ? 'countdown' : 'intro';
    R.t = 0; R.time = 0; R.go = false; R.acc = 0;
    R.countdown = 3.8;
    const tr = R.track;
    cfg.racers.forEach((rc, i) => {
      const k = new HG.Kart(Object.assign({}, rc, { cc: cfg.cc || 150, stats: HG.Vehicles.stats(rc.charId || 'sigma', rc.parts || { body: 'kart', engine: 'twin', fins: 'standard' }) }));
      k.mirror = !!cfg.mirror;
      k.smart = rc.ctrl === 'local' ? !!HG.settings.smartSteer[rc.player] : rc.ctrl === 'cpu';
      // the starting grid: two by two, staggered
      if (tr.isArena) {
        const sp = tr.spawn(i, cfg.racers.length);
        k.reset(0, 0); k.s = sp.x; k.d = sp.z; k.yaw = sp.yaw; k.dist = 0;
      } else {
        const row = Math.floor(i / 2), col = i % 2;
        const fr = tr.frame(0, HG.Track.makeFrame());
        const dist = -6 - row * 7 - col * 3.5;
        const d = (col ? 1 : -1) * fr.w * 0.22 + (row % 2 ? 1 : -1) * 0.8;
        k.reset(dist, d);
        k.s = tr.wrap(dist);
      }
      k.grid = i;
      R.karts.push(k);
    });
    if (HG.AI) HG.AI.setup(R);
    if (HG.Items) HG.Items.setup(R);
    updatePlaces();
    return R;
  }

  // ------------------------------------------------------------
  function update(dt) {
    R.t += dt;
    if (R.phase === 'intro') {
      if (R.t > (R.cfg.introTime || 4.5)) { R.phase = 'countdown'; R.t = 0; }
    } else if (R.phase === 'countdown') {
      const before = R.countdown;
      R.countdown -= dt;
      for (const n of [3, 2, 1]) if (before > n && R.countdown <= n) R.events.push({ type: 'count', n });
      // rocket start: press the gas at the right moment (just after "2")
      for (const k of R.karts) {
        if (k.ctrl === 'remote') continue;
        const gas = k.ctrl === 'cpu' ? (k.cpuStart !== undefined && R.countdown < k.cpuStart) : (k.input.gas > 0.5 && !HG.settings.autoGas[k.player]) || k.input.drift || k.input.gasKey;
        if (gas && k.startCharge < 0) k.startCharge = R.countdown;
        if (!gas) k.startCharge = -1;
        k.anim.rev = gas ? 1 : 0;
      }
      if (R.countdown <= 0) {
        R.phase = 'race'; R.go = true; R.time = 0; R.events.push({ type: 'go' });
        for (const k of R.karts) {
          if (k.ctrl === 'remote') continue;
          const c = k.startCharge;
          if (c > 0.6 && c < 2.05) { k.boost(c > 1.4 ? 1.3 : 0.7, 'start'); k.events.push({ type: 'rocketstart' }); }
          else if (c >= 2.9) { k.hitT = 0.8; k.hitKind = 'spin'; k.events.push({ type: 'stall' }); }
        }
      }
    }
    if (R.go) R.time += dt;

    // fixed-size physics steps so it feels the same on every computer
    R.acc = Math.min(R.acc + dt, 0.1);
    while (R.acc >= STEP) {
      R.acc -= STEP;
      physics(STEP);
    }
  }

  function physics(dt) {
    const tr = R.track;
    for (const k of R.karts) {
      if (k.ctrl === 'remote') continue;
      // CPUs drive themselves; the computer also drives you after the finish and in a Sigma Missile
      if (HG.AI && (k.ctrl === 'cpu' || (k.ctrl === 'local' && (k.finished || k.missileT > 0)))) {
        const keepItem = k.ctrl === 'local' ? k.input.item : null;
        HG.AI.drive(k, R, dt);
        if (keepItem !== null) k.input.item = keepItem;
      }
      if (k.out) continue;
      k.step(dt, tr, R);
    }
    collide(dt);
    if (HG.Items) HG.Items.update(dt, R);
    if (!R.battle) laps();
    slipstream(dt);
    updatePlaces();
  }

  // ---------- bumping into each other ----------
  function collide(dt) {
    const tr = R.track, ks = R.karts;
    for (let i = 0; i < ks.length; i++) {
      const a = ks[i];
      if (a.falling > 0 || a.respawnT > 0 || a.out) continue;
      for (let j = i + 1; j < ks.length; j++) {
        const b = ks[j];
        if (b.falling > 0 || b.respawnT > 0 || b.out) continue;
        if (a.ghostT > 0 || b.ghostT > 0) continue;
        const ds = tr.isArena ? b.s - a.s : tr.diff(a.s, b.s);
        const dd = b.d - a.d, dh = b.h - a.h;
        if (Math.abs(dh) > 1.6) continue;
        const ra = a.shrinkT > 0 ? 0.7 : 1.25, rb = b.shrinkT > 0 ? 0.7 : 1.25;
        const dist2 = ds * ds + dd * dd, min = ra + rb;
        if (dist2 >= min * min || dist2 < 1e-6) continue;
        const dist = Math.sqrt(dist2), nx = ds / dist, ny = dd / dist;
        // big & star karts knock others away
        if (a.sigmaT > 0 || a.missileT > 0 || a.goldT > 0 && false) { if (b.hit('tumble', a)) continue; }
        if (b.sigmaT > 0 || b.missileT > 0) { if (a.hit('tumble', b)) continue; }
        if (a.shrinkT > 0 && b.shrinkT <= 0) { a.hit('squash', b); }
        if (b.shrinkT > 0 && a.shrinkT <= 0) { b.hit('squash', a); }
        const wa = 1 + a.stats.weight * 0.25, wb = 1 + b.stats.weight * 0.25;
        const over = min - dist;
        const pa = over * wb / (wa + wb), pb = over * wa / (wa + wb);
        move(a, -nx * pa, -ny * pa); move(b, nx * pb, ny * pb);
        // bounce
        const va = vel(a), vb = vel(b);
        const rel = (vb[0] - va[0]) * nx + (vb[1] - va[1]) * ny;
        if (rel < 0) {
          const imp = -(1 + 0.9) * rel / (1 / wa + 1 / wb);
          const ia = imp / wa, ib = imp / wb;
          // mostly push sideways so racers don't stop dead
          setVel(a, va[0] - nx * ia * 0.4, va[1] - ny * ia * 1.6);
          setVel(b, vb[0] + nx * ib * 0.4, vb[1] + ny * ib * 1.6);
          if (-rel > 2) {
            a.events.push({ type: 'bump', hard: -rel }); b.events.push({ type: 'bump', hard: -rel });
            // anti-gravity: bumping gives both a little spin boost
            if (!tr.isArena && (tr.flags[tr.idx(a.s)] & tr.F.ANTI)) { a.boost(0.45, 'spin'); b.boost(0.45, 'spin'); a.anim.spinBoost = 1; b.anim.spinBoost = 1; }
          }
        }
      }
    }
  }
  function move(k, ds, dd) { k.dist += ds; k.s = R.track.isArena ? k.s + ds : R.track.wrap(k.dist); k.d += dd; if (R.track.isArena) k.dist = 0; }
  function vel(k) { return [k.spd * Math.cos(k.yaw) - k.lat * Math.sin(k.yaw), k.spd * Math.sin(k.yaw) + k.lat * Math.cos(k.yaw)]; }
  function setVel(k, vs, vd) { k.spd = vs * Math.cos(k.yaw) + vd * Math.sin(k.yaw); k.lat = -vs * Math.sin(k.yaw) + vd * Math.cos(k.yaw); }

  // ---------- laps ----------
  function laps() {
    const L = R.track.length;
    for (const k of R.karts) {
      if (k.finished) continue;
      const lap = Math.floor(k.dist / L) + 1;
      if (lap > k.lap) {
        if (k.lap >= 1) { k.lapTimes.push(R.time - k.lapStart); }
        k.lapStart = R.time;
        k.lap = lap;
        if (k.lap > R.laps) {
          k.finished = true; k.finishTime = R.time;
          R.finishOrder.push(k);
          k.finishPlace = R.finishOrder.length;
          k.events.push({ type: 'finish', place: k.finishPlace });
          R.events.push({ type: 'finish', kart: k });
        } else if (k.lap > 1) {
          k.events.push({ type: 'lap', lap: k.lap, final: k.lap === R.laps });
        }
      }
      // going backwards over the line takes the lap away
      if (lap < k.lap && lap >= 0 && k.lap > 0 && k.dist < (k.lap - 1) * L - 5) k.lap = lap;
    }
    // everybody (or every player) done?
    const humans = R.karts.filter((k) => k.ctrl === 'local' || k.ctrl === 'remote');
    if (R.phase === 'race' && (humans.length ? humans.every((k) => k.finished) : R.karts.every((k) => k.finished))) {
      R.phase = 'done'; R.doneT = 0; R.events.push({ type: 'alldone' });
    }
    if (R.phase === 'done') R.doneT += 1 / 120;
  }

  // ---------- slipstream: drive right behind someone to get sucked along ----------
  function slipstream(dt) {
    if (R.track.isArena) return;
    for (const k of R.karts) {
      if (!R.go || k.disabled || !k.grounded || k.spd < 20) { k.slip = Math.max(0, k.slip - dt * 2); k.slipOn = 0; continue; }
      let behind = false;
      for (const o of R.karts) {
        if (o === k || o.falling > 0) continue;
        const ds = R.track.diff(k.s, o.s);
        if (ds > 3 && ds < 24 && Math.abs(o.d - k.d) < 2.2) { behind = true; break; }
      }
      if (k.slipCool > 0) { k.slipCool -= dt; k.slipOn = 0; continue; }
      if (behind) {
        k.slip += dt; k.slipOn = 1;
        if (k.slip > 1.8) { k.slip = 0; k.slipCool = 4; k.boost(0.8, 'slip'); k.events.push({ type: 'slipboost' }); }
      } else { k.slip = Math.max(0, k.slip - dt); k.slipOn = 0; }
    }
  }

  // ---------- who is 1st, 2nd... ----------
  function updatePlaces() {
    const ks = R.karts.slice();
    if (R.battle) {
      ks.sort((a, b) => (b.out ? -1 : b.balloons * 100 + b.score) - (a.out ? -1 : a.balloons * 100 + a.score));
    } else {
      ks.sort((a, b) => {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        if (a.finished) return -1;
        if (b.finished) return 1;
        return b.dist - a.dist;
      });
    }
    ks.forEach((k, i) => {
      if (k.place !== i + 1 && R.go) k.events.push({ type: 'place', from: k.place, to: i + 1 });
      k.place = i + 1;
    });
    R.order = ks;
  }

  // CPUs far behind go a tiny bit faster, so races stay exciting
  R.rubber = function (k) {
    if (k.ctrl !== 'cpu' || !R.order || R.battle) return 1;
    const humans = R.karts.filter((o) => o.ctrl !== 'cpu');
    if (!humans.length) return 1;
    const lead = Math.max(...humans.map((h) => h.dist));
    const gap = lead - k.dist;              // + = this CPU is behind the best player
    const diff = R.cfg.difficulty !== undefined ? R.cfg.difficulty : 1;
    if (gap > 0) return 1 + U.clamp(gap / 300, 0, 1) * (0.04 + diff * 0.03);
    return 1 - U.clamp(-gap / 400, 0, 1) * (0.06 - diff * 0.025);
  };

  R.setup = setup;
  R.update = update;
  R.updatePlaces = updatePlaces;
  R.popBalloon = (k, by) => { if (HG.Battle) HG.Battle.pop(k, by, R); };
  return R;
})();
