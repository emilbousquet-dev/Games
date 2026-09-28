// ============================================================
//  FLOPPY PARTY — BOMB TAG
//  One player carries a ticking bomb. Bump into or punch
//  someone to pass it on. When it explodes, whoever holds it
//  is OUT. Last one standing wins the round. First to 2.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.bomb = (function () {
  let bomb = null, holder = null, fuse = 0, fuseMax = 1, passCool = 0, waitNext = 0, time = 0;

  function build() {
    holder = null; fuse = 0; passCool = 0; waitNext = 1.5; time = 0;
    const S = FP.Stage;
    // a round-ish island made of a few blocks, with things to run around
    S.island(0, -1, 0, 16, 2, 11);
    S.island(0, -1, 0, 11, 2, 15);
    S.island(-6.5, -1.2, -5.5, 4, 2, 4);
    S.island(6.5, -1.2, 5.5, 4, 2, 4);
    S.island(6.5, -1.2, -5.5, 4, 2, 4);
    S.island(-6.5, -1.2, 5.5, 4, 2, 4);
    for (const [x, z] of [[-3.5, -2], [3.5, 2], [0, -4.5], [0, 4.5]]) S.block(x, 0.6, z, 1.2, 1.2, 1.2, 0xc98b58);
    for (const [x, z] of [[-3.5, 3], [3.5, -3]]) {
      const t = FP.Look.tree(1); t.position.set(x, 0, z); S.add(t);
      FP.Stage.bodies.push(FP.Physics.staticBox(x, 0.8, z, 0.5, 1.6, 0.5));
    }
    // the bomb
    const g = new THREE.Group();
    g.add(FP.Look.mesh(new THREE.SphereGeometry(0.42, 20, 16), FP.Look.toon(0x2a2140), 0.04));
    const cap = FP.Look.mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.16, 12), FP.Look.toon(0x8a8fa0), 0.02);
    cap.position.y = 0.44;
    const fuseMesh = FP.Look.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), FP.Look.toon(0xc98b58), 0);
    fuseMesh.position.set(0.08, 0.62, 0); fuseMesh.rotation.z = -0.4;
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffcf33 }));
    spark.position.set(0.15, 0.78, 0);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    shine.position.set(-0.15, 0.18, 0.33);
    g.add(cap, fuseMesh, spark, shine);
    g.visible = false;
    g.userData = { spark, body: g.children[0] };
    S.add(g);
    bomb = g;
    FP.Camera.setAngle(0.8, 0.8);
  }

  function spawn(i, n) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    return { x: Math.cos(a) * 4.5, y: 0, z: Math.sin(a) * 3.5, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) };
  }

  function giveBomb(c, chars) {
    holder = c;
    passCool = 1.0;
    c.expression = 'oh'; c.exprTimer = 0.8;
    FP.FX.word(c.parts.head.position, 'TAG!', '#ff9a3c', 1.2);
    FP.Audio.play('beep');
  }

  function newBomb(chars) {
    const alive = chars.filter((c) => c.alive);
    if (alive.length < 2) return;
    fuseMax = fuse = Math.max(8, 16 - time * 0.05) + Math.random() * 5;
    giveBomb(alive[Math.floor(Math.random() * alive.length)], chars);
    FP.UI.big('BOMB!', 1.4, `${holder.name} has the bomb`);
    if (FP.Net) FP.Net.banner('BOMB!', `${holder.name} has the bomb`);
  }

  function explode(chars, game) {
    const c = holder;
    holder = null;
    const p = c.parts.torso.position;
    FP.FX.word(p, 'BOOM!', '#ff5a5f', 2.2);
    FP.FX.puffs(p, 24, 0xffa04a, 7, 2.2);
    FP.FX.puffs(p, 14, 0x555566, 5, 1.8);
    FP.FX.stars(p, 12);
    FP.Camera.shake(1);
    FP.Audio.play('bonk'); FP.Audio.play('splash');
    // BOOM: the holder flies away, and everyone close gets pushed
    for (const o of chars) {
      if (!o.alive) continue;
      const d = o.parts.torso.position.distanceTo(p);
      if (o !== c && d > 3.5) continue;
      const dir = new CANNON.Vec3(o.parts.torso.position.x - p.x, 0, o.parts.torso.position.z - p.z);
      if (dir.length() < 0.1) dir.set(Math.random() - 0.5, 0, Math.random() - 0.5);
      dir.normalize();
      const power = o === c ? 1 : (3.5 - d) / 3.5;
      FP.Ragdoll.knockOut(o, o === c ? 3 : 1.2);
      for (const b of o.bodies) { b.velocity.x += dir.x * 16 * power; b.velocity.z += dir.z * 16 * power; b.velocity.y += 14 * power; }
    }
    c.lastHitBy = null;
    game.eliminate(c, 'went BOOM!');
    waitNext = 2;
  }

  // the bomb floats over the holder's head and blinks faster and faster
  function drawBomb() {
    if (holder) {
      const h = holder.parts.head.position;
      bomb.visible = true;
      bomb.position.set(h.x, h.y + 0.95 + Math.sin(time * 8) * 0.05, h.z);
      const danger = fuse < 3.5;
      const blink = danger ? Math.sin(time * (40 - fuse * 8)) > 0 : false;
      bomb.userData.body.material = FP.Look.toon(blink ? 0xff3a3a : 0x2a2140);
      bomb.userData.spark.scale.setScalar(0.8 + Math.random() * 0.6);
      bomb.scale.setScalar(1 + (danger ? Math.sin(time * 20) * 0.08 : 0));
    } else bomb.visible = false;
  }

  function update(dt, chars, game, roundOver) {
    time += dt;
    drawBomb();
    for (const c of chars) if (c.alive && c.parts.torso.position.y < -5) {
      if (c === holder) { holder = null; waitNext = 1.5; }
      game.eliminate(c, 'fell off!');
    }
    if (roundOver || dt === 0) return null;

    if (!holder) {
      waitNext -= dt;
      if (waitNext <= 0) newBomb(chars);
    } else {
      fuse -= dt;
      passCool -= dt;
      if (Math.floor(fuse) !== Math.floor(fuse + dt) && fuse < 4) FP.Audio.play('beep');
      // pass the bomb by bumping into or punching someone
      if (passCool <= 0 && holder.ko <= 0) {
        const touchers = [holder.parts.torso, holder.parts.head, ...holder.parts.arms];
        for (const o of chars) {
          if (o === holder || !o.alive) continue;
          const near = touchers.some((b) => b.position.distanceTo(o.parts.torso.position) < 1.05 || b.position.distanceTo(o.parts.head.position) < 0.8);
          if (near) { giveBomb(o, chars); break; }
        }
      }
      if (fuse <= 0) explode(chars, game);
    }
    const alive = chars.filter((c) => c.alive);
    if (chars.length > 1 && alive.length <= 1) return { winners: alive };
    if (chars.length === 1 && alive.length === 0) return { winners: [] };
    return null;
  }

  // bot brain: with the bomb, chase someone. Without it, run away from whoever has it
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position;
    if (holder === c) {
      let best = null, bd = Infinity;
      for (const o of chars) { if (o === c || !o.alive) continue; const d = o.parts.torso.position.distanceTo(p); if (d < bd) { bd = d; best = o; } }
      if (best) {
        tools.steer(c, best.parts.torso.position.x, best.parts.torso.position.z, input);
        if (bd < 1.5 && Math.random() < dt * 4) input.punchPressed = true;
      }
    } else if (holder) {
      const h = holder.parts.torso.position;
      const dx = p.x - h.x, dz = p.z - h.z, d = Math.hypot(dx, dz) || 1;
      if (d < 7) {
        // run away, but lean toward the middle so we don't run off the edge
        const tx = p.x + (dx / d) * 4 - p.x * 0.25, tz = p.z + (dz / d) * 4 - p.z * 0.25;
        tools.steer(c, tx, tz, input);
        if (d < 1.6 && Math.random() < dt * 3) input.punchPressed = true; // push them away!
      } else {
        const b = tools.brain;
        b.wander = (b.wander || 0) + dt;
        tools.steer(c, Math.cos(b.wander * 0.5 + c.index) * 3, Math.sin(b.wander * 0.5 + c.index) * 2, input);
        input.x *= 0.5; input.z *= 0.5;
      }
    } else {
      tools.steer(c, 0, 0, input);
      if (Math.hypot(p.x, p.z) < 2.5) { input.x = 0; input.z = 0; }
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    if (!holder) return 'Get ready...';
    const pct = Math.max(0, fuse / fuseMax) * 100;
    return `${FP.UI.ICON.bomb} ${FP.UI.escapeHtml(holder.name)} has the bomb <span class="fuse"><i style="width:${pct.toFixed(0)}%"></i></span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#ffe0c2"/><ellipse cx="60" cy="68" rx="52" ry="9" fill="#7ad35e"/><circle cx="38" cy="30" r="13" fill="#2a2140"/><path d="M45 19l6-7" stroke="#c98b58" stroke-width="3"/><circle cx="53" cy="10" r="4" fill="#ffcf33"/><circle cx="33" cy="25" r="3" fill="#fff"/><ellipse cx="38" cy="56" rx="7" ry="9" fill="#ff9a3c" stroke="#2a2140" stroke-width="2.5"/><circle cx="38" cy="44" r="6" fill="#ff9a3c" stroke="#2a2140" stroke-width="2.5"/><ellipse cx="86" cy="56" rx="7" ry="9" fill="#9b6bff" stroke="#2a2140" stroke-width="2.5" transform="rotate(-15 86 56)"/><circle cx="89" cy="44" r="6" fill="#9b6bff" stroke="#2a2140" stroke-width="2.5"/><path d="M98 48h10M96 54h12M98 60h8" stroke="#2a2140" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>';

  return {
    id: 'bomb', name: 'Bomb Tag', roundsToWin: 2, minTotal: 2, removeOut: 2.5, song: 'tense', minZoom: 14, art: ART,
    desc: 'Pass the ticking bomb by bumping into someone. If it explodes on you, you\'re out!',
    build, spawn, update, botThink, hud,
    netState: () => ({ h: holder ? (holder.player ? 'p' + holder.player.id : '') : '', f: fuse, m: fuseMax }),
    applyNetState: (s) => { holder = FP.Ragdoll.all.find((c) => c.player && 'p' + c.player.id === s.h) || null; fuse = s.f; fuseMax = s.m; },
    visual: (dt) => { time += dt; drawBomb(); },
  };
})();
