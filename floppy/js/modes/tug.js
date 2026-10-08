// ============================================================
//  FLOPPY PARTY — TUG OF WAR
//  Red team vs Blue team on a big rope over a mud pit.
//  MASH PUNCH (or jump) as fast as you can to pull!
//  When the sign says HEAVE!, every press counts 3 times.
//  Pull the red flag over your line and the others land in
//  the mud. First to 2.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.tug = (function () {
  const WIN = 2.6, TIME = 30, PIT = 1.6;
  let ropeX = 0, ropeV = 0, time = 0, heave = 0, heaveT = 2, done = 0, presses = new Map(), rope = null, flag = null, sign = null, self = null;

  function build() {
    ropeX = 0; ropeV = 0; time = 0; heave = 0; heaveT = 2.5; done = 0; presses = new Map();
    const S = FP.Stage;
    // two grassy sides and the mud pit in the middle
    S.island(-7.5, -1, 0, 12, 2, 6, { grass: 0x9bd46e });
    S.island(7.5, -1, 0, 12, 2, 6, { grass: 0x9bd46e });
    S.block(0, -1.4, 0, PIT * 2 + 0.2, 1.2, 6, 0x7a5236);
    const mud = new THREE.Mesh(new THREE.PlaneGeometry(PIT * 2, 5.8), FP.Look.toon(0x6a4428));
    mud.rotation.x = -Math.PI / 2; mud.position.set(0, -0.78, 0); S.add(mud);
    for (let i = 0; i < 6; i++) {
      const blob = new THREE.Mesh(new THREE.CircleGeometry(0.2 + Math.random() * 0.2, 10), FP.Look.toon(0x8a5a36));
      blob.rotation.x = -Math.PI / 2; blob.position.set((Math.random() - 0.5) * PIT * 1.6, -0.77, (Math.random() - 0.5) * 4.5); S.add(blob);
    }
    // the win lines
    for (const s of [-1, 1]) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 5), new THREE.MeshBasicMaterial({ color: s < 0 ? 0xff5a5f : 0x4aa8ff }));
      line.rotation.x = -Math.PI / 2; line.position.set(s * (PIT + WIN), 0.03, 0); S.add(line);
    }
    // the rope and its flag
    rope = FP.Look.mesh(new THREE.CylinderGeometry(0.07, 0.07, 22, 8), FP.Look.toon(0xd9b27a), 0.015);
    rope.rotation.z = Math.PI / 2; rope.position.set(0, 1.0, 0); S.add(rope);
    flag = new THREE.Group();
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), FP.Look.toon(0xff5a5f, { side: THREE.DoubleSide }));
    cloth.position.y = -0.3; flag.add(cloth);
    S.add(flag);
    // the HEAVE sign
    const bb = FP.Props.billboard(3.2, 1.2);
    bb.position.set(0, 3.1, -4.6); S.add(bb);
    sign = bb.userData.panel;
    const fans = FP.Props.crowd(1, 12, 1.4); fans.position.set(0, 0, -4.4); S.add(fans);
    FP.Camera.setAngle(0.55, 0.9);
  }

  const sideOf = (team) => (team === 0 ? -1 : 1);
  function spawn(i, n, p) {
    const team = p && p.team !== undefined ? p.team : i % 2, rank = p && p.teamRank !== undefined ? p.teamRank : Math.floor(i / 2); // (place in the team)
    return { x: sideOf(team) * (PIT + 1 + rank * 1.3), y: 0.2, z: 0, yaw: team === 0 ? Math.PI / 2 : -Math.PI / 2 };
  }

  // how fast someone is pressing (presses in the last second)
  function rate(c) { const now = time, list = (presses.get(c) || []).filter((t) => now - t.t < 1); presses.set(c, list); return list.reduce((s, t) => s + t.w, 0); }
  function press(c) {
    const list = presses.get(c) || [];
    list.push({ t: time, w: heave > 0 ? 3 : 1 });
    presses.set(c, list);
    if (heave > 0 && !c.isBot) FP.FX.word(c.parts.head.position, 'HEAVE!', '#ffcf33', 0.8);
  }

  // tug controls: mash punch or jump to pull. Your character holds the rope by itself
  function control(c, input, dt, playing) {
    const inp = input || {};
    if (playing && !done) {
      if (c.isBot) {
        const r = { easy: 4.5, normal: 6.2, hard: 7.8 }[c.botSkill] || 6.2;
        if (Math.random() < dt * r * (heave > 0 ? 1.3 : 1)) press(c);
      } else if (inp.punchPressed || inp.jumpPressed) press(c);
    }
    // stand in your place on the rope, leaning back
    const s = sideOf(c.team), rank = FP.Game.chars.filter((o) => o.team === c.team).indexOf(c);
    const t = c.parts.torso.position;
    const tx = ropeX + s * (PIT + 1 + Math.max(0, rank) * 1.3);
    const fake = { x: 0, z: 0, grab: false };
    if (!done || c.team !== self.loser) { fake.x = Math.max(-1, Math.min(1, (tx - t.x) * 3)); fake.z = Math.max(-1, Math.min(1, -t.z * 3)); }
    if (Math.hypot(fake.x, fake.z) < 0.1) { fake.x = 0; fake.z = 0; }
    FP.Ragdoll.control(c, fake, dt);
    c.yaw = c.team === 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver && !done) {
      time += dt;
      heaveT -= dt; heave = Math.max(0, heave - dt);
      if (heaveT <= 0) { heave = 0.55; heaveT = 2.2 + Math.random() * 1.6; FP.Audio.play('beep'); }
      // both teams pull: the rope slides toward the stronger team
      const pull = [0, 1].map((t) => chars.filter((c) => c.team === t).reduce((s, c) => s + Math.min(14, rate(c)), 0) / Math.max(1, chars.filter((c) => c.team === t).length));
      const force = (pull[1] - pull[0]) * 0.16;
      ropeV += (force - ropeV) * Math.min(1, dt * 3);
      ropeX += ropeV * dt;
      if (Math.abs(ropeX) > WIN) {
        done = 1.8;
        self.loser = ropeX > 0 ? 0 : 1;
        // the losers get yanked into the mud!
        for (const c of chars) if (c.team === self.loser) { for (const b of c.bodies) { b.velocity.x += -sideOf(c.team) * 7; b.velocity.y += 5; } FP.Ragdoll.knockOut(c, 2); }
        FP.Audio.play('splash'); FP.Camera.shake(0.5); FP.Props.hype();
      }
    } else if (done > 0 && dt > 0) {
      done -= dt;
      for (const c of chars) if (c.team === self.loser && c.parts.torso.position.y < -0.2 && !c.mudded) { c.mudded = true; FP.FX.puffs(c.parts.torso.position, 14, 0x6a4428, 4, 1.5); FP.Audio.play('splash'); }
    }
    visual();
    if (roundOver || dt === 0) return null;
    if (done && done <= 0.001) {
      const w = 1 - self.loser;
      return { team: w, points: 1, text: `${w ? 'Blue' : 'Red'} team pulls them into the mud!` };
    }
    if (!done && time >= TIME) {
      if (Math.abs(ropeX) < 0.05) return { text: 'Nobody could win that pull!' };
      const w = ropeX > 0 ? 1 : 0;
      return { team: w, points: 1, text: `Time! ${w ? 'Blue' : 'Red'} pulled farther!` };
    }
    return null;
  }

  function visual() {
    if (rope) rope.position.x = ropeX;
    if (flag) { flag.position.set(ropeX, 1.0, 0); flag.rotation.y = Math.sin(performance.now() / 200) * 0.3; }
    if (sign) {
      if (!sign.material.map || sign.userData.h !== (heave > 0)) {
        sign.userData.h = heave > 0;
        if (sign.material.map) sign.material.map.dispose();
        sign.material.map = FP.Props.textTexture(heave > 0 ? 'HEAVE!' : 'PULL!', heave > 0 ? '#ffcf33' : '#ffffff', heave > 0 ? '#ff5a5f' : '#2a2140');
        sign.material.color.setHex(0xffffff); sign.material.needsUpdate = true;
      }
    }
  }

  function botThink() { return true; } // tug bots are driven in control()

  function hud() {
    const pct = Math.round(50 + (ropeX / WIN) * 50);
    const bar = `<span class="tug-bar"><i style="left:${Math.max(0, Math.min(100, pct))}%"></i></span>`;
    return `<span>${heave > 0 ? '<b>HEAVE! Every press counts 3 times!</b>' : 'MASH PUNCH to pull!'} &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}</span>${bar}`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><rect x="4" y="54" width="46" height="22" fill="#9bd46e" stroke="#2a2140" stroke-width="2"/><rect x="70" y="54" width="46" height="22" fill="#9bd46e" stroke="#2a2140" stroke-width="2"/><rect x="50" y="60" width="20" height="16" fill="#6a4428"/><path d="M8 40h104" stroke="#d9b27a" stroke-width="4"/><path d="M60 40v10" stroke="#2a2140" stroke-width="1.5"/><rect x="56" y="44" width="8" height="8" fill="#ff5a5f"/><ellipse cx="30" cy="44" rx="6" ry="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2" transform="rotate(-20 30 44)"/><circle cx="27" cy="32" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><ellipse cx="90" cy="44" rx="6" ry="8" fill="#4aa8ff" stroke="#2a2140" stroke-width="2" transform="rotate(20 90 44)"/><circle cx="93" cy="32" r="5" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'tug', name: 'Tug of War', roundsToWin: 2, teams: true, minTotal: 2, song: 'tense', minZoom: 13, art: ART,
    desc: 'Red vs Blue on a big rope over the mud. MASH PUNCH to pull! On HEAVE!, presses count 3 times.',
    build, spawn, control, update, botThink, hud, visual,
    netState: () => ({ x: Math.round(ropeX * 100) / 100, h: heave > 0 ? 1 : 0, t: Math.round(time) }),
    applyNetState: (s) => { ropeX = s.x; heave = s.h ? 0.3 : 0; time = s.t; },
  };
  return self;
})();
