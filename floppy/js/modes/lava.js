// ============================================================
//  FLOPPY PARTY — LAVA RISING
//  The floor is lava, and it keeps rising! Jump up the two
//  spiral staircases around the tower. Push others down.
//  Last one out of the lava wins the round. First to 2.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.lava = (function () {
  const STEPS = 18, STEP_H = 0.95, RADIUS = 5.2, ANGLE = 0.62, PAD = 2.6;
  const START_Y = -3;
  let lava = null, lavaY = START_Y, time = 0, pads = [], bubbles = [], tex = null;

  function lavaTexture() {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    g.fillStyle = '#ff6a1a'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 26; i++) {
      g.fillStyle = i % 2 ? '#ffb13b' : '#e8430f';
      g.beginPath(); g.arc((i * 37) % 128, (i * 59) % 128, 6 + (i % 5) * 3, 0, 7); g.fill();
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 10);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function build() {
    time = 0; lavaY = START_Y; pads = []; bubbles = [];
    const S = FP.Stage;
    // the starting island
    S.island(0, -1, 0, 11, 2, 11, { grass: 0x9bd46e, dirt: 0x8a6a55 });
    // the tall tower in the middle (you can't climb it, go around!)
    const topY = STEP_H * (STEPS + 1) + 0.6;
    S.block(0, (topY - 0.5 - 1) / 2, 0, 2.2, topY - 0.5 + 1, 2.2, 0xb9a38a); // ends just under the top platform
    // two spiral staircases of floating platforms
    const colors = [0xffd6e7, 0xfff1b8, 0xd4f5c4, 0xcfe8ff, 0xe6d9ff];
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < STEPS; i++) {
        const a = i * ANGLE + s * Math.PI;
        const y = STEP_H * (i + 1);
        const x = Math.cos(a) * RADIUS, z = Math.sin(a) * RADIUS;
        const b = S.block(x, y - 0.25, z, PAD, 0.5, PAD, colors[(i + s) % colors.length], { unique: true });
        b.mesh.material.transparent = true;
        pads.push({ x, y, z, body: b.body, mesh: b.mesh });
      }
    }
    // a big platform at the very top
    S.block(0, topY - 0.25, 0, 5, 0.5, 5, 0xffcf33);
    pads.push({ x: 0, y: topY, z: 0 });
    // the lava
    tex = lavaTexture();
    lava = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshBasicMaterial({ map: tex }));
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = lavaY;
    S.add(lava);
    for (let i = 0; i < 16; i++) {
      const bub = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc04a, transparent: true }));
      bub.userData = { x: (Math.random() - 0.5) * 24, z: (Math.random() - 0.5) * 24, t: Math.random() * 2 };
      S.add(bub);
      bubbles.push(bub);
    }
    FP.Camera.setAngle(0.32, 0.95);
  }

  function spawn(i, n) {
    const a = (i / n) * Math.PI * 2 + 0.8;
    return { x: Math.cos(a) * 3.6, y: 0, z: Math.sin(a) * 3.6, yaw: a + Math.PI };
  }

  function visual(dt, chars) {
    lava.position.y = lavaY;
    // platforms in front of the players (closer to the camera) become see-through
    const alive = (chars || []).filter((c) => c.alive !== false && c.parts.torso.position.y > lavaY);
    const low = alive.length ? Math.min(...alive.map((c) => c.parts.torso.position.y)) : 0;
    const back = alive.length ? Math.min(...alive.map((c) => c.parts.torso.position.z)) : 0;
    for (const pad of pads) {
      if (!pad.mesh) continue;
      const inFront = pad.z > back + 0.8 && pad.y > low - 0.2;
      const want = inFront ? 0.28 : 1;
      pad.mesh.material.opacity += (want - pad.mesh.material.opacity) * Math.min(1, dt * 8);
      pad.mesh.material.depthWrite = pad.mesh.material.opacity > 0.9;
      pad.mesh.children.forEach((o) => { o.visible = pad.mesh.material.opacity > 0.9; });
    }
    tex.offset.x += dt * 0.03; tex.offset.y += dt * 0.02;
    for (const b of bubbles) {
      const u = b.userData;
      u.t += dt;
      const k = (u.t % 2) / 2;
      b.position.set(u.x, lavaY + k * 0.5, u.z);
      b.scale.setScalar(0.5 + k);
      b.material.opacity = 1 - k;
      if (u.t % 2 < dt) { u.x = (Math.random() - 0.5) * 24; u.z = (Math.random() - 0.5) * 24; }
    }
  }

  function update(dt, chars, game, roundOver) {
    if (!roundOver && dt > 0) {
      time += dt;
      // slow at first, then faster
      lavaY = START_Y + 0.14 * time + 0.0022 * time * time;
    }
    visual(dt, chars);
    for (const c of chars) {
      if (!c.alive) continue;
      if (c.parts.torso.position.y < lavaY + 0.35) {
        const p = c.parts.torso.position;
        FP.FX.word(p, 'HOT!', '#ff6a1a', 1.5);
        FP.FX.puffs(p, 16, 0xff9a3c, 4, 1.6);
        for (const b of c.bodies) b.velocity.y = 12; // hop out of the lava, ouch!
        FP.Ragdoll.knockOut(c, 5);
        if (game) game.eliminate(c, 'fell in the lava!');
        else c.alive = false;
      }
    }
    if (roundOver || dt === 0) return null;
    const alive = chars.filter((c) => c.alive);
    if (chars.length > 1 && alive.length <= 1) return { winners: alive };
    if (chars.length === 1 && alive.length === 0) return { winners: [] };
    return null;
  }

  // does the line from A to B go through the tower in the middle?
  function towerInTheWay(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
    const k = Math.max(0, Math.min(1, -(ax * dx + az * dz) / len2));
    return Math.hypot(ax + dx * k, az + dz * k) < 1.9;
  }

  // bot brain: jump to the next platform up. At the top, push others off
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain;
    const p = c.parts.torso.position;
    const feet = p.y - FP.Ragdoll.STAND;
    // find the closest platform a little higher than me
    if (!b.pad || b.padTime > 4 || Math.abs(feet - b.pad.y) < 0.2 || b.pad.y < feet - 0.3) {
      // first try close platforms with no tower in the way, then any platform at the right height
      const pick = (strict, noTower) => {
        let best = null, bd = Infinity;
        for (const pad of pads) {
          const up = pad.y - feet;
          if (up < 0.35 || up > 1.35) continue;
          const d = Math.hypot(pad.x - p.x, pad.z - p.z);
          if (strict && d > 5) continue;
          if (noTower && towerInTheWay(p.x, p.z, pad.x, pad.z) && pad.y < 18) continue;
          if (d < bd) { bd = d; best = pad; }
        }
        return best;
      };
      b.pad = pick(true, true) || pick(false, true) || pick(false, false);
      b.padTime = 0;
    }
    b.padTime = (b.padTime || 0) + dt;
    if (b.pad) {
      const d = Math.hypot(b.pad.x - p.x, b.pad.z - p.z);
      const dx = (b.pad.x - p.x) / (d || 1), dz = (b.pad.z - p.z) / (d || 1);
      input.x = dx; input.z = dz;
      // walk close to the platform, then jump (and keep steering to its middle in the air)
      if (d < 2.4 && c.grounded && b.pad.y > feet + 0.3) input.jumpPressed = true;
    } else {
      // nothing higher to reach: stand still and punch anyone close
      for (const o of chars) {
        if (o === c || !o.alive) continue;
        if (o.parts.torso.position.distanceTo(p) < 1.5) {
          tools.steer(c, o.parts.torso.position.x, o.parts.torso.position.z, input);
          if (Math.random() < dt * 3) input.punchPressed = true;
        }
      }
    }
    if (c.grabbedBy && Math.random() < dt * 6) input.jumpPressed = true;
    return true;
  }

  function hud() {
    return `Lava height: ${Math.max(0, lavaY).toFixed(1)} m &nbsp; Keep climbing!`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#ffe0c2"/><rect x="52" y="6" width="16" height="64" fill="#b9a38a" stroke="#2a2140" stroke-width="2.5"/><rect x="18" y="52" width="26" height="6" rx="2" fill="#d4f5c4" stroke="#2a2140" stroke-width="2"/><rect x="76" y="40" width="26" height="6" rx="2" fill="#cfe8ff" stroke="#2a2140" stroke-width="2"/><rect x="22" y="28" width="26" height="6" rx="2" fill="#fff1b8" stroke="#2a2140" stroke-width="2"/><rect x="74" y="16" width="26" height="6" rx="2" fill="#ffd6e7" stroke="#2a2140" stroke-width="2"/><path d="M0 64q10-6 20 0t20 0 20 0 20 0 20 0 20 0v16H0z" fill="#ff6a1a"/><circle cx="30" cy="70" r="3" fill="#ffc04a"/><circle cx="90" cy="72" r="2.5" fill="#ffc04a"/><ellipse cx="87" cy="10" rx="5" ry="6" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/></svg>';

  return {
    id: 'lava', name: 'Lava Rising', roundsToWin: 2, minTotal: 2, removeOut: 1.5, song: 'lava', minZoom: 19, art: ART,
    desc: 'The floor is lava and it keeps rising! Jump up the platforms and be the last one out of the lava.',
    build, spawn, update, botThink, hud, visual,
    focusMinY: () => lavaY - 1,
    netState: () => ({ y: lavaY }),
    applyNetState: (s) => { lavaY = s.y; },
  };
})();
