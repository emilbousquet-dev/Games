// ============================================================
//  FLOPPY PARTY — OBSTACLE RACE
//  Race to the finish line! Jump over spinning bars, hop across
//  floating pads, ride moving platforms, dodge the pushers and
//  climb the stairs. Fall off and you go back to the last
//  checkpoint. First over the line wins!
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.race = (function () {
  const TIME = 150, FINISH_Z = -71, AFTER_FIRST = 25;
  const CHECKPOINTS = [{ z: 1, x: 0 }, { z: -7.5, x: 0 }, { z: -19, x: 0 }, { z: -38.5, x: 0 }, { z: -52, x: 0 }];
  const POINTS = [5, 3, 2, 1];
  // the path bots follow. 'mover' = wait for a moving platform
  const PATH = [
    { x: 0, z: -6 }, { x: 0, z: -13 }, { x: 0, z: -19.8 },
    { x: -1.5, z: -23 }, { x: 1.5, z: -27 }, { x: -1, z: -31 }, { x: 1.5, z: -35 },
    { x: 0, z: -40.3 }, { mover: 0, z: -44 }, { mover: 1, z: -48.5 }, { x: 0, z: -52.5 },
    { x: 0, z: -58 }, { x: 0, z: -64.5 }, { x: 0, z: -66.2 }, { x: 0, z: -68.2 }, { x: 0, z: -74 },
  ];
  let spinners = [], movers = [], pushers = [], time = 0, finished = [], firstT = -1, best = new Map(), self = null;

  function build() {
    spinners = []; movers = []; pushers = []; time = 0; finished = []; firstT = -1; best = new Map();
    const S = FP.Stage;
    // A: start
    S.island(0, -1, -2, 10, 2, 8, { grass: 0x9bd46e });
    // B: spinning bars
    S.island(0, -1, -13, 10, 2, 14);
    for (const [x, z, len, col] of [[-2, -10, 7, 0xff9a3c], [2, -16.5, 7, 0x9b6bff]]) {
      S.block(x, 0.6, z, 0.6, 1.2, 0.6, 0xff5a5f);
      const b = S.block(x, 0.32, z, len, 0.34, 0.34, col, { kinematic: true, unique: true });
      spinners.push({ x, z, len, body: b.body, angle: Math.random() * 3, speed: x < 0 ? 1.5 : -1.7 });
    }
    // C: floating pads (jump!)
    const padCols = [0xffd6e7, 0xfff1b8, 0xd4f5c4, 0xcfe8ff];
    [[-1.5, -23], [1.5, -27], [-1, -31], [1.5, -35]].forEach(([x, z], i) => S.block(x, -0.25, z, 3, 0.5, 3, padCols[i]));
    // D: landing, then two platforms sliding left and right over a big gap
    S.island(0, -1, -39, 8, 2, 4);
    [[-44, 0.9, 0], [-48.5, 1.1, Math.PI]].forEach(([z, sp, ph]) => {
      const b = S.block(0, -0.25, z, 3, 0.5, 3, 0xffcf33, { kinematic: true, unique: true });
      movers.push({ z, sp, ph, body: b.body, x: 0 });
    });
    // E: the pushers
    S.island(0, -1, -58, 8, 2, 14);
    [[-54.5, 1.3, 0], [-58, 1.1, 2], [-61.5, 1.5, 4]].forEach(([z, sp, ph], i) => {
      const side = i % 2 ? 1 : -1;
      const b = S.block(side * 6, 0.6, z, 3, 1.2, 1.4, 0x4aa8ff, { kinematic: true, unique: true });
      pushers.push({ z, sp, ph, side, body: b.body });
    });
    // F: stairs and the finish platform
    S.block(0, 0.2, -66, 6, 0.4, 2, 0xe6d9ff);
    S.block(0, 0.4, -68.5, 6, 0.8, 3, 0xd4c4ff);
    S.island(0, 0.2, -74, 10, 2, 8, { grass: 0xffe08a, dirt: 0xc98b58 });
    // the finish arch with a checkered banner
    for (const x of [-4, 4]) S.block(x, 2.8, FINISH_Z, 0.5, 3.2, 0.5, 0xffffff);
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32;
    const g = cv.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#2a2140' : '#ffffff'; g.fillRect(i * 8, j * 8, 8, 8); }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const banner = FP.Look.boxMesh(8.4, 0.9, 0.2, new THREE.MeshBasicMaterial({ map: tex }));
    banner.position.set(0, 4.5, FINISH_Z);
    S.add(banner);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(8, 0.5), new THREE.MeshBasicMaterial({ map: tex }));
    line.rotation.x = -Math.PI / 2; line.position.set(0, 1.23, FINISH_Z);
    S.add(line);
    // checkpoint flags
    for (const cp of CHECKPOINTS.slice(1)) {
      const flag = FP.Look.mesh(new THREE.BoxGeometry(0.7, 0.45, 0.05), FP.Look.toon(0x5cc44a), 0.02);
      flag.position.set(4.3, 1.8, cp.z);
      const pole = FP.Look.mesh(new THREE.CylinderGeometry(0.04, 0.04, 2, 6), FP.Look.toon(0xdddddd), 0);
      pole.position.set(3.95, 1, cp.z);
      S.add(flag, pole);
    }
    FP.Camera.setAngle(0.58, 0.9);
  }

  function spawn(i, n) { return { x: (i - (n - 1) / 2) * 1.6, y: 0.2, z: 0.5, yaw: Math.PI }; }

  function beforeStep(dt) {
    const t = time;
    for (const s of spinners) {
      s.angle += s.speed * dt;
      s.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), s.angle);
      s.body.angularVelocity.set(0, s.speed, 0);
    }
    for (const m of movers) {
      const want = Math.sin(t * m.sp + m.ph) * 3.2;
      m.body.velocity.set((want - m.body.position.x) / dt, 0, 0);
      m.x = m.body.position.x;
    }
    for (const p of pushers) {
      // slide in fast, then slowly back out
      const k = (Math.sin(t * p.sp + p.ph) + 1) / 2;
      const want = p.side * (6.2 - Math.pow(k, 3) * 5.4);
      p.body.velocity.set((want - p.body.position.x) / dt, 0, 0);
    }
  }

  const bestCheckpoint = (c) => best.get(c) || 0;

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const c of chars) {
        const p = c.parts.torso.position;
        // reached a new checkpoint?
        for (let k = CHECKPOINTS.length - 1; k > bestCheckpoint(c); k--) {
          if (p.z < CHECKPOINTS[k].z && p.y > -1) { best.set(c, k); if (c.player && !c.isBot) FP.UI.toast(`${c.name}: checkpoint!`); break; }
        }
        // fell off: back to the last checkpoint
        if (p.y < -6) {
          const cp = CHECKPOINTS[bestCheckpoint(c)];
          FP.Ragdoll.teleport(c, cp.x + (Math.random() - 0.5) * 2, 0.4, cp.z - 0.5, Math.PI);
          FP.FX.puffs(c.parts.torso.position, 10, 0xffffff, 3);
          FP.Audio.play('fall');
        }
        // crossed the finish line!
        if (!c.finished && p.z < FINISH_Z && p.y > 1) {
          c.finished = true;
          finished.push(c);
          const place = finished.length;
          game.scores[c.player.id] = POINTS[place - 1] || 0;
          c.cheer = 3; c.expression = 'happy'; c.exprTimer = 3;
          FP.FX.word(c.parts.head.position, ['1st!', '2nd!', '3rd!', '4th!'][place - 1] || 'Done!', '#ffcf33', 1.6);
          FP.FX.confetti(new THREE.Vector3(p.x, p.y + 1, p.z));
          FP.Audio.play(place === 1 ? 'win' : 'coin');
          if (place === 1) { firstT = time; FP.UI.big(`${c.name} wins!`, 1.4, `${AFTER_FIRST} seconds left for everyone else!`); if (FP.Net) FP.Net.banner(`${c.name} wins!`, `${AFTER_FIRST} seconds left for everyone else!`); }
        }
      }
      // spinning bars whack you
      for (const c of chars) {
        if (c.ko > 0) continue;
        const p = c.parts.torso.position;
        const feet = Math.min(c.parts.legs[0].position.y, c.parts.legs[1].position.y) - 0.1;
        if (feet > 0.5) continue;
        for (const s of spinners) {
          const dx = p.x - s.x, dz = p.z - s.z, r = Math.hypot(dx, dz);
          if (r > s.len / 2 + 0.2 || r < 0.5) continue;
          const along = Math.abs(Math.sin(Math.atan2(dz, dx) + s.angle)) * r;
          if (along < 0.42) {
            const w = Math.sign(s.speed);
            for (const bd of c.bodies) { bd.velocity.x += (dz / r) * w * 8; bd.velocity.z += (-dx / r) * w * 8; bd.velocity.y += 5; }
            FP.Ragdoll.knockOut(c, 1.2);
            FP.FX.word(p, 'BONK!', '#ff9a3c', 1);
            FP.Audio.play('bonk');
            break;
          }
        }
      }
    }
    if (roundOver || dt === 0) return null;
    const racing = chars.filter((c) => !c.finished);
    const done = (chars.length > 1 && racing.length <= 1 && finished.length) || racing.length === 0 || (firstT >= 0 && time - firstT > AFTER_FIRST) || time > TIME;
    if (done) {
      const w = finished.length ? [finished[0]] : [];
      return { winners: w, text: w.length ? `${w[0].name} wins the race!` : 'Time! Nobody finished!' };
    }
    return null;
  }

  // the camera follows the players who are still racing (people first, then bots near them)
  function focus(chars) {
    const racing = chars.filter((c) => !c.finished);
    const list = racing.length ? racing : chars;
    const humans = list.filter((c) => !c.isBot);
    if (!humans.length) return list.map(FP.Ragdoll.center);
    const hz = humans.reduce((s, c) => s + c.parts.torso.position.z, 0) / humans.length;
    return list.filter((c) => !c.isBot || Math.abs(c.parts.torso.position.z - hz) < 10).map(FP.Ragdoll.center);
  }

  function spinnerSoon(s, p, lead) {
    const dx = p.x - s.x, dz = p.z - s.z, r = Math.hypot(dx, dz);
    if (r > s.len / 2 + 0.6) return false;
    const a = Math.atan2(dz, dx), beta = -s.angle;
    let diff = s.speed > 0 ? beta - a : a - beta;
    diff = ((diff % Math.PI) + Math.PI) % Math.PI;
    return Math.max(0, diff - 0.45 / Math.max(0.5, r)) / Math.abs(s.speed) < lead;
  }

  // bot brain: follow the path, jump over gaps and bars, wait for the moving platforms
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position, y = p.y - FP.Ragdoll.STAND;
    if (c.finished) { tools.steer(c, ((c.index % 4) - 1.5) * 2, -75, input); input.x *= 0.3; input.z *= 0.3; if (c.grounded && Math.random() < dt) input.jumpPressed = true; return true; }
    let wp = PATH.find((w) => w.z < p.z - 0.7) || PATH[PATH.length - 1];
    let tx = wp.x, tz = wp.z;
    if (wp.mover !== undefined) { tx = movers[wp.mover].x; }
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1;
    input.x = dx / d; input.z = dz / d;
    const aheadX = p.x + input.x * 1.0, aheadZ = p.z + input.z * 1.0;
    const gapAhead = !FP.Bots.floorAt(aheadX, aheadZ, y);
    if (c.grounded && gapAhead) {
      if (wp.mover !== undefined) {
        // wait at the edge until the platform comes by, then jump on
        const m = movers[wp.mover];
        const soon = Math.sin((time + 0.35) * m.sp + m.ph) * 3.2;
        if (Math.abs(soon - p.x) < 1.1) input.jumpPressed = true;
        else { input.x = (soon - p.x) * 0.4; input.z = 0; }
      } else if (d > 1.2) input.jumpPressed = true;
    }
    // the next step up the stairs
    if (c.grounded && wp.z <= -66 && wp.z > -70 && d < 1.8) input.jumpPressed = true;
    // spinning bars: jump just in time
    const lead = 0.22 + tools.skill.reaction * 0.9;
    if (c.grounded && spinners.some((s) => spinnerSoon(s, p, lead))) input.jumpPressed = true;
    // bump into other racers sometimes
    for (const o of chars) if (o !== c && o.alive && o.parts.torso.position.distanceTo(p) < 1.1 && Math.random() < dt * 1.5) input.punchPressed = true;
    tools.unstick(input);
    return true;
  }

  function hud() {
    const left = firstT >= 0 ? Math.min(TIME - time, AFTER_FIRST - (time - firstT)) : TIME - time;
    return `${FP.UI.ICON.flag} Race to the finish! &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(left)}`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><path d="M8 70l22-16h26l-8 16z" fill="#7ad35e" stroke="#2a2140" stroke-width="2"/><rect x="50" y="50" width="14" height="5" fill="#fff1b8" stroke="#2a2140" stroke-width="2"/><rect x="68" y="42" width="14" height="5" fill="#ffd6e7" stroke="#2a2140" stroke-width="2"/><path d="M84 36h28v10H84z" fill="#ffe08a" stroke="#2a2140" stroke-width="2"/><path d="M90 36V14M108 36V14" stroke="#2a2140" stroke-width="2.5"/><path d="M90 14h18v7H90z" fill="#fff" stroke="#2a2140" stroke-width="2"/><path d="M90 14h4v3.5h-4zM98 14h4v3.5h-4zM94 17.5h4V21h-4zM102 17.5h4V21h-4z" fill="#2a2140"/><path d="M16 60l26-6" stroke="#ff9a3c" stroke-width="4" stroke-linecap="round"/><ellipse cx="34" cy="48" rx="4" ry="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="34" cy="41" r="3.5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'race', name: 'Obstacle Race', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 3, song: 'party', minZoom: 14, art: ART,
    desc: 'Spinning bars, jumping pads, moving platforms and pushers. First over the finish line wins!',
    build, spawn, update, beforeStep, botThink, hud, focus,
    scoreLabel: (s) => `${s} pts`,
    netState: () => ({ t: Math.round(time * 10) / 10, f: firstT }),
    applyNetState: (s) => { time = s.t; firstT = s.f; },
  };
  return self;
})();
