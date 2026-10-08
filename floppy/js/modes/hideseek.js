// ============================================================
//  FLOPPY PARTY — HIDE AND SEEK
//  One player is the seeker, everyone else hides in the house.
//    Hiders: 12 seconds to hide! Press GRAB next to furniture
//    to hide INSIDE it (GRAB again to come out).
//    Seeker: close your eyes while they hide... then find them!
//    PUNCH furniture to look inside, or tag hiders you can see.
//  Hidden furniture wiggles now and then (a little hint).
//  Found hiders help the seeker. Everyone gets a turn to seek.
//  Points: hiders +1 every 10 seconds hidden, +3 if never found.
//  The seeker gets +2 for everyone they find.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.hideseek = (function () {
  const W = 22, D = 15, HIDE_TIME = 12, SEEK_TIME = 60;
  let spots = [], hidden = new Map(), seekers = new Set(), phase = 'hide', t = 0, wiggleT = 0, cone = null, curtain = null, self = null;
  const pos = (c) => c.parts.torso.position;

  // furniture you can hide in
  function furniture(kind) {
    const g = new THREE.Group();
    const T = FP.Look.toon, B = FP.Look.boxMesh, M = FP.Look.mesh;
    if (kind === 'box') { const b = B(1.1, 1.0, 1.1, T(0xc98b58)); b.position.y = 0.5; const tape = B(1.12, 0.12, 0.3, T(0xe0b070), 0); tape.position.y = 1.0; g.add(b, tape); }
    else if (kind === 'wardrobe') { const b = B(1.3, 2.2, 0.8, T(0x8a5a36)); b.position.y = 1.1; const line = B(0.04, 2, 0.82, T(0x5a3a26), 0); line.position.y = 1.1; g.add(b, line); }
    else if (kind === 'bed') { const b = B(1.4, 0.6, 2.2, T(0xffffff)); b.position.y = 0.3; const blanket = B(1.42, 0.2, 1.4, T(0x4aa8ff), 0.02); blanket.position.set(0, 0.62, 0.35); const pillow = B(1, 0.2, 0.4, T(0xfff1d6), 0.02); pillow.position.set(0, 0.7, -0.8); g.add(b, blanket, pillow); }
    else if (kind === 'barrel') { const b = M(new THREE.CylinderGeometry(0.5, 0.5, 1.1, 14), T(0xa8744a), 0.03); b.position.y = 0.55; const ring = M(new THREE.TorusGeometry(0.5, 0.04, 6, 16), T(0x3a3450), 0); ring.rotation.x = Math.PI / 2; ring.position.y = 0.8; g.add(b, ring); }
    else if (kind === 'plant') { const pot = M(new THREE.CylinderGeometry(0.4, 0.3, 0.5, 12), T(0xe0674a), 0.02); pot.position.y = 0.25; const bush = M(new THREE.SphereGeometry(0.75, 12, 10), T(0x5cc44a), 0.03); bush.position.y = 1.0; g.add(pot, bush); }
    else { const b = B(2, 0.7, 0.9, T(0xff7eb6)); b.position.y = 0.35; const back = B(2, 0.6, 0.25, T(0xff5a9a), 0.02); back.position.set(0, 0.95, -0.35); g.add(b, back); }
    return g;
  }

  function build() {
    spots = []; hidden = new Map(); seekers = new Set(); phase = 'hide'; t = 0; wiggleT = 0;
    const S = FP.Stage;
    S.island(0, -1, 0, W + 2, 2, D + 2, { grass: 0xd9b27a, dirt: 0x8a6a55 });
    // rooms: different floors
    const rooms = [[-W / 4, -D / 4, 0xe8d4b8], [W / 4, -D / 4, 0xc2e0ff], [-W / 4, D / 4, 0xffd6e6], [W / 4, D / 4, 0xd6f0c2]];
    for (const [x, z, col] of rooms) { const f = new THREE.Mesh(new THREE.PlaneGeometry(W / 2 - 0.2, D / 2 - 0.2), FP.Look.toon(col)); f.rotation.x = -Math.PI / 2; f.position.set(x, 0.03, z); S.add(f); }
    // walls (outside, and inside with doorways)
    const wallC = 0xfff1d6, H = 1.6;
    S.block(0, H / 2, -D / 2 - 0.2, W + 0.8, H, 0.4, wallC); S.block(0, H / 2, D / 2 + 0.2, W + 0.8, H, 0.4, wallC);
    S.block(-W / 2 - 0.2, H / 2, 0, 0.4, H, D, wallC); S.block(W / 2 + 0.2, H / 2, 0, 0.4, H, D, wallC);
    for (const s of [-1, 1]) {
      S.block(s * (W / 4 + 1.4), H / 2, 0, W / 2 - 2.8, H, 0.3, wallC); // across the middle, doorways near the center
      S.block(0, H / 2, s * (D / 4 + 1.3), 0.3, H, D / 2 - 2.6, wallC);  // down the middle
    }
    // furniture spread around the rooms
    const list = [['wardrobe', -9.5, -5.5, 0], ['bed', -6.5, -5.3, Math.PI / 2], ['box', -3, -6, 0], ['plant', -9.8, -1.5, 0],
      ['sofa', 5, -6.5, 0], ['barrel', 9.5, -6, 0], ['box', 9.3, -2, 0], ['plant', 2.2, -2.6, 0],
      ['bed', -9.2, 5, 0], ['box', -5, 6.3, 0], ['barrel', -2.3, 2.6, 0], ['wardrobe', -9.5, 1.8, Math.PI / 2],
      ['sofa', 5.5, 6.6, Math.PI], ['wardrobe', 9.6, 5.5, 0], ['plant', 9.7, 1.6, 0], ['barrel', 2.5, 6.2, 0], ['box', 6.8, 2.4, 0.4]];
    list.forEach(([kind, x, z, rot]) => {
      const m = furniture(kind); m.position.set(x, 0, z); m.rotation.y = rot; S.add(m);
      const size = { box: [1.1, 1, 1.1], wardrobe: [1.3, 2.2, 0.8], bed: [1.4, 0.7, 2.2], barrel: [1, 1.1, 1], plant: [0.9, 1.5, 0.9], sofa: [2, 1, 0.9] }[kind];
      const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: FP.Physics.mats.floor, collisionFilterGroup: FP.Physics.GROUP.WORLD, collisionFilterMask: FP.Physics.ALL });
      body.addShape(new CANNON.Box(new CANNON.Vec3(size[0] / 2, size[1] / 2, size[2] / 2)));
      body.position.set(x, size[1] / 2, z); body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rot);
      FP.Physics.world.addBody(body); S.bodies.push(body);
      spots.push({ kind, x, z, mesh: m, who: null, wig: 0 });
    });
    // the seeker's flashlight
    cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 18, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    S.add(cone);
    S.onClear(() => { for (const c of [...hidden.keys()]) unhide(c, true); hideCurtain(); });
    FP.Camera.setAngle(1.05, 0.72);
  }

  function seekerOf(chars) { return chars[((FP.Game.round || 1) - 1) % Math.max(1, chars.length)]; }
  function spawn(i, n) { return { x: -1.2 + (i % 2) * 2.4, y: 0.2, z: -1.2 + Math.floor(i / 2) * 2.4, yaw: 0 }; }

  // hiding inside furniture: the character disappears and waits
  function hide(c, s) {
    s.who = c;
    hidden.set(c, { spot: s, rel: c.bodies.map((b) => b.position.vsub(c.parts.torso.position)), mask: c.bodies.map((b) => b.collisionFilterMask) });
    c.meshList.forEach((m) => { m.visible = false; });
    c.bodies.forEach((b) => { b.collisionFilterMask = 0; });
    FP.Audio.play('squeak');
  }
  function unhide(c, quiet) {
    const h = hidden.get(c);
    if (!h) return;
    hidden.delete(c);
    h.spot.who = null;
    c.meshList.forEach((m) => { m.visible = true; });
    c.bodies.forEach((b, i) => { b.collisionFilterMask = h.mask[i]; });
    if (!quiet) {
      const s = h.spot, dx = -s.x, dz = -s.z, dl = Math.hypot(dx, dz) || 1;
      FP.Ragdoll.teleport(c, s.x + (dx / dl) * 1.3, 0.4, s.z + (dz / dl) * 1.3, c.yaw);
    }
  }
  function found(c, by, game) {
    unhide(c);
    seekers.add(c);
    FP.FX.word(c.parts.head.position, 'FOUND YOU!', '#ff5a5f', 1.4);
    FP.FX.stars(c.parts.head.position, 6);
    FP.Audio.play('bonk');
    const seeker = [...seekers][0];
    const credit = by && by.player ? by : seeker;
    if (credit && credit.player) game.scores[credit.player.id] = (game.scores[credit.player.id] || 0) + 2;
    for (const b of c.bodies) b.velocity.y += 4;
  }

  // the seeker has to look away while the others hide
  function showCurtain(text) {
    if (!curtain) { curtain = document.createElement('div'); curtain.className = 'hs-curtain'; document.body.append(curtain); }
    curtain.innerHTML = `<div><b>${text}</b><small>No peeking!</small></div>`;
    curtain.hidden = false;
  }
  function hideCurtain() { if (curtain) curtain.hidden = true; }

  function control(c, input, dt, playing) {
    const inp = input || {};
    const grabEdge = !!inp.grab && !c.hsGrab;
    c.hsGrab = !!inp.grab;
    if (hidden.has(c)) { if (playing && grabEdge && !seekers.has(c)) unhide(c); return; } // hidden: just wait (GRAB to come out)
    const isSeeker = seekers.has(c);
    if (isSeeker && phase === 'hide') { FP.Ragdoll.control(c, { x: 0, z: 0 }, dt); return; } // counting with eyes closed
    if (playing && !isSeeker && grabEdge) {
      const p = pos(c);
      const s = spots.filter((x) => !x.who && Math.hypot(x.x - p.x, x.z - p.z) < 1.8).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      if (s) { hide(c, s); return; }
    }
    if (playing && isSeeker && inp.punchPressed && phase === 'seek') {
      const p = pos(c);
      const s = spots.find((x) => Math.hypot(x.x - p.x, x.z - p.z) < 1.9);
      if (s) {
        if (s.who) found(s.who, c, FP.Game);
        else { s.wig = 0.4; FP.FX.word(new THREE.Vector3(s.x, 1.8, s.z), 'Empty!', '#8a8fa0', 0.9); }
      }
    }
    FP.Ragdoll.control(c, { x: inp.x || 0, z: inp.z || 0, jump: inp.jump, jumpPressed: inp.jumpPressed, punchPressed: inp.punchPressed, grab: false, emote: inp.emote }, dt);
  }

  // hidden characters stay put inside their furniture
  function beforeStep() {
    for (const [c, h] of hidden) {
      const base = new CANNON.Vec3(h.spot.x, -1.5, h.spot.z);
      c.bodies.forEach((b, i) => { b.position.copy(base.vadd(h.rel[i])); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); });
    }
  }

  function update(dt, chars, game, roundOver) {
    if (!seekers.size && chars.length) {
      const s = seekerOf(chars);
      seekers.add(s);
      FP.Ragdoll.teleport(s, 0, 0.3, 0, 0);
    }
    const seeker = seekerOf(chars);
    if (dt > 0 && !roundOver) {
      t += dt;
      if (phase === 'hide') {
        const isLocal = (c) => c.player && ['keys', 'pad', 'touch'].includes(c.player.source.kind);
        // the seeker is the only person on this computer: cover the screen. Otherwise the hiders here need to see
        if (seeker && isLocal(seeker) && chars.filter(isLocal).length === 1) showCurtain(`${seeker.name}, close your eyes! ${Math.ceil(HIDE_TIME - t)}`);
        if (t >= HIDE_TIME) { phase = 'seek'; t = 0; hideCurtain(); FP.UI.big('Ready or not, here I come!', 1.8); if (FP.Net) FP.Net.banner('Ready or not, here I come!', ''); FP.Audio.play('alarm'); }
      } else {
        // hints: hidden furniture wiggles every few seconds
        wiggleT -= dt;
        if (wiggleT <= 0) { wiggleT = 6; for (const s of spots) if (s.who && Math.random() < 0.6) s.wig = 0.5; }
        // tagging hiders you can see
        for (const c of chars) {
          if (seekers.has(c) || hidden.has(c)) continue;
          for (const s of seekers) if (s.ko <= 0 && pos(s).distanceTo(pos(c)) < 1.0) { found(c, s, game); break; }
        }
        // hidden hiders earn a point every 10 seconds
        if (Math.floor(t / 10) !== Math.floor((t - dt) / 10)) for (const c of chars) if (hidden.has(c) && c.player) game.scores[c.player.id] = (game.scores[c.player.id] || 0) + 1;
      }
      for (const s of spots) s.wig = Math.max(0, s.wig - dt);
      for (const c of chars) if (!hidden.has(c) && pos(c).y < -5) FP.Ragdoll.teleport(c, 0, 0.4, 0, 0);
    }
    visual(dt);
    if (roundOver || dt === 0) return null;
    const hiders = chars.filter((c) => !seekers.has(c));
    if (phase === 'seek' && hiders.length === 0) return { winners: [seeker], text: `${seeker.name} found everybody!` };
    if (phase === 'seek' && t >= SEEK_TIME) {
      for (const c of hiders) if (c.player) game.scores[c.player.id] = (game.scores[c.player.id] || 0) + 3;
      return { winners: hiders, text: hiders.length === 1 ? `${hiders[0].name} was never found!` : 'The hiders win!' };
    }
    return null;
  }

  function visual() {
    for (const s of spots) {
      const w = s.wig > 0 ? Math.sin(performance.now() / 30) * 0.08 : 0;
      s.mesh.rotation.z = w; s.mesh.scale.y = 1 + Math.abs(w);
    }
    const seeker = seekerOf(FP.Game.chars);
    if (cone && seeker) {
      const h = seeker.parts.head.position, fx = Math.sin(seeker.yaw), fz = Math.cos(seeker.yaw);
      cone.visible = phase === 'seek';
      cone.position.set(h.x + fx * 2.2, 0.9, h.z + fz * 2.2);
      cone.rotation.set(Math.PI / 2, 0, 0); cone.rotation.order = 'YXZ'; cone.rotation.y = seeker.yaw + Math.PI;
    }
    // online: the seeker's own screen goes dark while the others hide
    if (FP.Net && FP.Net.isClient && FP.Net.isClient()) {
      if (phase === 'hide' && seeker && seeker.player && seeker.player.id === FP.Net.myId) showCurtain('You are the seeker! Close your eyes...'); else hideCurtain();
    }
  }

  // bots: hiders run to free furniture and hide; seekers search the nearest furniture (wiggly ones first)
  function botThink(c, chars, dt, input, tools) {
    const p = pos(c), br = tools.brain;
    if (hidden.has(c)) return true;
    if (seekers.has(c)) {
      if (phase === 'hide') return true;
      // a hider out in the open? chase them
      const open = chars.filter((o) => !seekers.has(o) && !hidden.has(o));
      if (open.length) { const o = open.reduce((a, x) => (!a || pos(x).distanceTo(p) < pos(a).distanceTo(p) ? x : a), null); tools.steer(c, pos(o).x, pos(o).z, input); return true; }
      br.checked = br.checked || new Set();
      const skill = { easy: 0.3, normal: 0.6, hard: 0.9 }[c.botSkill] || 0.6;
      const pick = spots.filter((s) => !br.checked.has(s)).sort((a, b) => (Math.hypot(a.x - p.x, a.z - p.z) - (a.wig > 0 && Math.random() < skill ? 8 : 0)) - (Math.hypot(b.x - p.x, b.z - p.z) - (b.wig > 0 && Math.random() < skill ? 8 : 0)))[0];
      if (!pick) { br.checked.clear(); return true; }
      const d = tools.steer(c, pick.x, pick.z, input);
      if (d < 1.7) { input.x = 0; input.z = 0; input.punchPressed = true; br.checked.add(pick); }
      tools.unstick(input);
      return true;
    }
    // hider
    if (phase === 'hide' || br.hideSpot) {
      if (!br.hideSpot || br.hideSpot.who) br.hideSpot = spots.filter((s) => !s.who).sort(() => Math.random() - 0.5)[0];
      if (br.hideSpot) {
        const d = tools.steer(c, br.hideSpot.x, br.hideSpot.z, input);
        if (d < 1.6) { input.grab = !c.hsGrab; }
      }
      tools.unstick(input);
      return true;
    }
    // caught in the open during seeking: run from the seeker
    const s = [...seekers][0];
    if (s) { const q = pos(s), dx = p.x - q.x, dz = p.z - q.z, dl = Math.hypot(dx, dz) || 1; input.x = dx / dl; input.z = dz / dl; }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const seeker = seekerOf(FP.Game.chars);
    const name = seeker ? FP.UI.escapeHtml(seeker.name) : '';
    const left = phase === 'hide' ? HIDE_TIME - t : SEEK_TIME - t;
    const label = phase === 'hide' ? `HIDE! ${name} is counting... ${Math.ceil(left)}` : `${name} is seeking! &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(left)} &nbsp; Hiding: ${FP.Game.chars.filter((c) => !seekers.has(c)).length}`;
    return `<span>${label}</span><span class="hud-tip">Hiders: GRAB next to furniture to hide inside &nbsp; Seeker: PUNCH furniture to look inside, touch hiders to tag them</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#ffd6e6"/><rect x="10" y="30" width="30" height="42" fill="#8a5a36" stroke="#2a2140" stroke-width="2"/><path d="M25 30v42" stroke="#5a3a26" stroke-width="2"/><circle cx="31" cy="50" r="2" fill="#2a2140"/><circle cx="20" cy="50" r="2" fill="#2a2140"/><rect x="70" y="50" width="26" height="22" fill="#c98b58" stroke="#2a2140" stroke-width="2"/><path d="M60 40l30-10v24z" fill="#fff2a0" opacity=".6"/><ellipse cx="56" cy="46" rx="6" ry="8" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="56" cy="34" r="5" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><text x="84" y="44" font-size="12" font-weight="900" fill="#2a2140" text-anchor="middle">?</text></svg>';

  self = {
    id: 'hideseek', name: 'Hide and Seek', roundsToWin: 1, roundName: 'Round', minTotal: 2, defaultBots: 3, song: 'spooky', minZoom: 15, art: ART, noTags: true,
    get rounds() { return Math.max(2, Math.min(4, FP.Game.everyone ? FP.Game.everyone.length : 2)); },
    desc: 'Hide inside furniture (GRAB) while the seeker counts! Seekers PUNCH furniture to look inside. Everyone takes a turn seeking.',
    build, spawn, control, beforeStep, update, botThink, hud, visual,
    scoreLabel: (s) => `${s} pts`,
    // the camera never follows hidden players (that would give them away)
    focus: (chars) => chars.filter((c) => !hidden.has(c)).map(FP.Ragdoll.center).concat([new THREE.Vector3(0, 0, 0)]),
    netState: () => ({ p: phase, t: Math.round(t), h: FP.Game.chars.map((c) => (hidden.has(c) ? spots.indexOf(hidden.get(c).spot) : -1)), s: FP.Game.chars.map((c) => (seekers.has(c) ? 1 : 0)).join(''), w: spots.map((s) => (s.wig > 0 ? 1 : 0)).join('') }),
    applyNetState: (st) => {
      phase = st.p; t = st.t;
      (st.w || '').split('').forEach((v, i) => { if (spots[i] && v === '1') spots[i].wig = 0.3; });
      (st.h || []).forEach((v, i) => { const c = FP.Game.chars[i]; if (c) c.meshList.forEach((m) => { m.visible = v < 0; }); });
      seekers = new Set(FP.Game.chars.filter((c, i) => (st.s || '')[i] === '1'));
    },
  };
  return self;
})();
