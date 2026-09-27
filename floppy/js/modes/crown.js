// ============================================================
//  FLOPPY PARTY — CROWN KEEPER
//  One golden crown. Wear it to earn points every second!
//  Punch whoever wears it and the crown pops off their head.
//  First to 30 points (or the most after 2:00) wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.crown = (function () {
  const GOAL = 30, TIME = 120;
  let crown = null, holder = null, pos = { x: 0, y: 1.2, z: 0 }, vel = null, floorY = 0, cool = 0, time = 0, self = null;

  function build() {
    holder = null; pos = { x: 0, y: 1.6, z: 0 }; vel = null; floorY = 0.6; cool = 0; time = 0; respawn.clear();
    const S = FP.Stage;
    S.island(0, -1, 0, 18, 2, 12);
    S.island(0, -1, 0, 12, 2, 17);
    // castle-ish blocks to run around
    const roofs = [0xff5a5f, 0x4aa8ff, 0x9b6bff, 0x5cc44a];
    [[-4, -3], [4, 3], [-4, 3.5], [4, -3.5]].forEach(([x, z], i) => {
      const t = FP.Props.tower(0xe8dcc6, roofs[i], 1.5);
      t.position.set(x, 0, z); t.rotation.y = Math.atan2(-x, -z);
      S.add(t);
      S.bodies.push(FP.Physics.staticBox(x, 0.9, z, 1.3, 1.8, 1.3));
    });
    S.add(FP.Props.bunting(-4, 3.3, -3, 4, 3.3, -3.5, 14));
    S.add(FP.Props.bunting(-4, 3.3, 3.5, 4, 3.3, 3, 14));
    S.block(0, 0.3, 0, 3, 0.6, 3, 0xffe8a3); // a little stage in the middle
    // the crown
    crown = FP.Look.makeHat('crown', 0.34);
    crown.scale.setScalar(1.6);
    S.add(crown);
    FP.Camera.setAngle(0.82, 0.78);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 6, 5, 0.3); }

  function take(c) {
    holder = c; vel = null; cool = 0.8;
    c.expression = 'happy'; c.exprTimer = 1;
    FP.FX.word(c.parts.head.position, 'MINE!', '#ffcf33', 1.2);
    FP.Audio.play('coin');
  }

  // the crown pops off and flies a little way
  function drop() {
    if (!holder) return;
    const h = holder.parts.head.position;
    holder = null;
    pos = { x: h.x, y: h.y + 0.6, z: h.z };
    const a = Math.random() * Math.PI * 2;
    vel = { x: Math.cos(a) * 3, y: 7, z: Math.sin(a) * 3 };
    const g = FP.Physics.groundBelow(new CANNON.Vec3(pos.x + vel.x * 0.9, pos.y + 4, pos.z + vel.z * 0.9), 14, 0);
    floorY = g ? g.y + 0.3 : -100;
    cool = 0.6;
    FP.Audio.play('whoosh');
  }

  function visual(dt) {
    if (!crown) return;
    const t = performance.now() / 1000;
    if (holder) {
      const h = holder.parts.head.position;
      crown.position.set(h.x, h.y + 0.55 + Math.sin(t * 6) * 0.04, h.z);
      crown.rotation.set(0, holder.yaw, 0);
    } else {
      crown.position.set(pos.x, pos.y + Math.sin(t * 3) * 0.1, pos.z);
      crown.rotation.set(0, t * 1.5, 0);
    }
  }

  // punching the crown wearer knocks the crown off
  FP.bus.on('punchHit', (d) => { if (FP.Kit.live(self) && d && d.victim && d.victim === holder) drop(); });
  FP.bus.on('knockOut', (c) => { if (FP.Kit.live(self) && c === holder) drop(); });
  FP.bus.on('grab', (d) => { if (FP.Kit.live(self) && d && d.victim && d.victim === holder && Math.random() < 0.5) drop(); });

  const respawn = FP.Kit.respawner((c) => { const a = Math.random() * Math.PI * 2; return { x: Math.cos(a) * 5, z: Math.sin(a) * 4, yaw: a + Math.PI }; });

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      cool -= dt;
      if (holder && (!holder.alive || holder.parts.torso.position.y < -4)) { holder = null; pos = { x: 0, y: 1.6, z: 0 }; vel = null; FP.UI.toast('The crown is back in the middle!'); }
      if (!holder && vel) {
        vel.y -= 20 * dt;
        pos.x += vel.x * dt; pos.y += vel.y * dt; pos.z += vel.z * dt;
        if (pos.y <= floorY && vel.y < 0) { pos.y = floorY; vel = null; }
        if (pos.y < -10) { pos = { x: 0, y: 1.6, z: 0 }; vel = null; }
      }
      if (!holder && cool <= 0) {
        for (const c of chars) {
          if (!c.alive || c.ko > 0) continue;
          const p = c.parts.torso.position;
          if (Math.hypot(p.x - pos.x, p.z - pos.z) < 1 && Math.abs(p.y - pos.y) < 1.6) { take(c); break; }
        }
      }
      if (holder) game.scores[holder.player.id] = (game.scores[holder.player.id] || 0) + dt;
      respawn.update(chars, dt, -6);
    }
    visual(dt);
    if (roundOver || dt === 0) return null;
    if (holder && game.scores[holder.player.id] >= GOAL) return { winners: [holder], text: `${holder.name} keeps the crown!` };
    if (time >= TIME) {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `Time! ${w[0].name} wins!` : 'Time! It\'s a tie!' };
    }
    return null;
  }

  // bot brain: wearing the crown? run away! Otherwise chase the crown (or whoever wears it) and punch
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain, p = c.parts.torso.position;
    if (holder === c) {
      let chaser = null, cd = Infinity;
      for (const o of chars) { if (o === c || !o.alive) continue; const d = o.parts.torso.position.distanceTo(p); if (d < cd) { cd = d; chaser = o; } }
      if (chaser && cd < 6) {
        const h = chaser.parts.torso.position;
        const dx = p.x - h.x, dz = p.z - h.z, d = Math.hypot(dx, dz) || 1;
        tools.steer(c, p.x + (dx / d) * 4 - p.x * 0.3, p.z + (dz / d) * 4 - p.z * 0.3, input);
        if (cd < 1.3 && Math.random() < dt * 3) input.punchPressed = true;
      } else {
        b.wander += dt * 0.5;
        tools.steer(c, Math.cos(b.wander + c.index) * 4, Math.sin(b.wander + c.index) * 3, input);
        input.x *= 0.6; input.z *= 0.6;
      }
    } else if (holder) {
      const h = holder.parts.torso.position;
      // guess where they're running to (a little ahead of them)
      const d = tools.steer(c, h.x + holder.parts.torso.velocity.x * 0.3, h.z + holder.parts.torso.velocity.z * 0.3, input);
      if (d < 1.5 && Math.random() < dt * 4.5) input.punchPressed = true;
    } else {
      const d = tools.steer(c, pos.x, pos.z, input);
      if (pos.y - (p.y - FP.Ragdoll.STAND) > 1.2 && d < 2.2 && c.grounded) input.jumpPressed = true;
      FP.Kit.punchNearby(c, chars, dt, input, tools, 1.2, 1.5);
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const who = holder ? `${FP.UI.escapeHtml(holder.name)} has the crown` : 'Grab the crown!';
    return `${FP.UI.ICON.crown} ${who} &nbsp; first to ${GOAL} &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><ellipse cx="60" cy="64" rx="52" ry="11" fill="#7ad35e" stroke="#2a2140" stroke-width="2"/><ellipse cx="50" cy="50" rx="8" ry="10" fill="#ff9a3c" stroke="#2a2140" stroke-width="2"/><circle cx="50" cy="36" r="7" fill="#ff9a3c" stroke="#2a2140" stroke-width="2"/><path d="M41 26l3-9 6 6 6-6 3 9z" fill="#ffcf33" stroke="#2a2140" stroke-width="2" stroke-linejoin="round"/><ellipse cx="84" cy="52" rx="7" ry="9" fill="#5cc44a" stroke="#2a2140" stroke-width="2" transform="rotate(-20 84 52)"/><circle cx="88" cy="40" r="6" fill="#5cc44a" stroke="#2a2140" stroke-width="2"/><path d="M74 42l-10-2M76 48l-12 1" stroke="#2a2140" stroke-width="2" stroke-linecap="round" opacity=".5"/></svg>';

  self = {
    id: 'crown', name: 'Crown Keeper', roundsToWin: 1, single: true, minTotal: 2, song: 'party', minZoom: 16, art: ART,
    desc: 'Wear the crown to earn points. Punch whoever has it to knock it off! First to 30.',
    build, spawn, update, botThink, hud, visual,
    scoreLabel: (s) => `${Math.floor(s)}`,
    netState: () => ({ h: holder && holder.player ? 'p' + holder.player.id : '', x: Math.round(pos.x * 50) / 50, y: Math.round(pos.y * 50) / 50, z: Math.round(pos.z * 50) / 50 }),
    applyNetState: (s) => { holder = FP.Ragdoll.all.find((c) => c.player && 'p' + c.player.id === s.h) || null; pos = { x: s.x, y: s.y, z: s.z }; },
  };
  return self;
})();
