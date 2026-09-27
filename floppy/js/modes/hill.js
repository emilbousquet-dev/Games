// ============================================================
//  FLOPPY PARTY — KING OF THE HILL
//  Stand on top of the hill ALONE to earn points. If someone
//  else is up there too, nobody scores: push them off!
//  Falling off is not the end: you come back after a moment.
//  First to 25 points wins (or the most points after 2:30).
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.hill = (function () {
  const GOAL = 25, TIME = 150, ZONE_R = 2.1, TOP = 1.2;
  let zone = null, flag = null, time = 0, king = null, fallen = new Map(), lastKing = null;

  function build() {
    time = 0; king = null; lastKing = null; fallen = new Map();
    const S = FP.Stage;
    S.island(0, -1, 0, 20, 2, 14);
    S.island(0, -1, 0, 14, 2, 19);
    // the hill: two steps up (jump to climb!)
    S.block(0, 0.3, 0, 7, 0.6, 7, 0xa8e08a);
    S.block(0, 0.9, 0, 4.4, 0.6, 4.4, 0x8fd46e);
    // bumpy rocks around to hide behind
    for (const [x, z] of [[-7, -4], [7, 4], [-6, 5], [6, -5]]) S.block(x, 0.5, z, 1.4, 1, 1.4, 0xb9a38a);
    for (const [x, z] of [[-8.5, 0], [8.5, 0]]) { const t = FP.Look.tree(1.1); t.position.set(x, 0, z); S.add(t); }
    // the glowing zone ring and a flag that shows who is king
    zone = new THREE.Mesh(new THREE.RingGeometry(ZONE_R - 0.25, ZONE_R, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    zone.rotation.x = -Math.PI / 2;
    zone.position.y = TOP + 0.02;
    S.add(zone);
    const pole = FP.Look.mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 8), FP.Look.toon(0xdddddd), 0.02);
    pole.position.set(0, TOP + 1.5, -1.6);
    S.add(pole);
    flag = FP.Look.mesh(new THREE.BoxGeometry(1.1, 0.7, 0.06), FP.Look.toon(0xffffff, { unique: true }), 0.02);
    flag.position.set(0.58, TOP + 2.6, -1.6);
    S.add(flag);
    FP.Camera.setAngle(0.78, 0.82);
  }

  function spawn(i, n) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    return { x: Math.cos(a) * 7, y: 0, z: Math.sin(a) * 5.5, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) };
  }

  const inZone = (c) => {
    const p = c.parts.torso.position;
    return c.alive && c.ko <= 0 && Math.hypot(p.x, p.z) < ZONE_R && p.y > TOP + 0.4 && p.y < TOP + 2.5;
  };

  function visual(dt) {
    time += dt;
    const col = king ? king.color.body : 0xffffff;
    zone.material.color.setHex(col);
    zone.scale.setScalar(1 + Math.sin(time * 4) * 0.03);
    flag.material.color.setHex(col);
    flag.rotation.y = Math.sin(time * 3) * 0.15;
  }

  function update(dt, chars, game, roundOver) {
    visual(dt);
    // fell off? come back after a moment
    for (const c of chars) {
      const p = c.parts.torso.position;
      if (p.y < -5 && !fallen.has(c)) { fallen.set(c, 1.6); FP.Audio.play('fall'); }
    }
    for (const [c, t] of fallen) {
      const left = t - dt;
      if (left <= 0) {
        fallen.delete(c);
        const a = Math.random() * Math.PI * 2;
        FP.Ragdoll.teleport(c, Math.cos(a) * 7.5, 0.3, Math.sin(a) * 5.5, a + Math.PI);
        FP.FX.puffs(c.parts.torso.position, 10, 0xffffff, 3);
      } else fallen.set(c, left);
    }
    if (roundOver || dt === 0) return null;
    const on = chars.filter(inZone);
    const newKing = on.length === 1 ? on[0] : null;
    if (newKing && newKing !== lastKing) { FP.FX.word(newKing.parts.head.position, 'KING!', '#ffcf33', 1.2); FP.Audio.play('coin'); }
    lastKing = newKing;
    king = newKing;
    if (king) {
      const id = king.player.id;
      game.scores[id] = (game.scores[id] || 0) + dt;
      if (game.scores[id] >= GOAL) return { winners: [king], text: `${king.name} is the King of the Hill!` };
    }
    if (time >= TIME) {
      let best = null;
      for (const c of chars) if (!best || (game.scores[c.player.id] || 0) > (game.scores[best.player.id] || 0)) best = c;
      return { winners: best ? [best] : [], text: best ? `Time! ${best.name} wins!` : 'Time!' };
    }
    return null;
  }

  // bot brain: climb the hill and push everyone off it
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position;
    const d = tools.steer(c, 0, 0, input);
    const onHill = p.y > TOP + 0.4;
    if (!onHill && d < 4.6 && c.grounded && Math.random() < dt * 5) input.jumpPressed = true;
    if (onHill && d < 0.8) { input.x *= 0.2; input.z *= 0.2; }
    for (const o of chars) {
      if (o === c || !o.alive) continue;
      const od = o.parts.torso.position.distanceTo(p);
      if (od < 1.4) {
        tools.steer(c, o.parts.torso.position.x, o.parts.torso.position.z, input);
        if (Math.random() < dt * 4) input.punchPressed = true;
        break;
      }
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    const left = Math.max(0, TIME - time);
    const who = king ? `${FP.UI.escapeHtml(king.name)} is king` : 'Nobody is king';
    return `${FP.UI.ICON.flag} ${who} &nbsp; ${FP.UI.ICON.clock} ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} &nbsp; first to ${GOAL}`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#cfeaff"/><path d="M0 70q60-60 120 0v10H0z" fill="#8fd46e" stroke="#2a2140" stroke-width="2.5"/><path d="M60 14v26" stroke="#2a2140" stroke-width="3"/><path d="M61 15h18l-5 6 5 6H61z" fill="#ffcf33" stroke="#2a2140" stroke-width="2"/><ellipse cx="48" cy="40" rx="6" ry="8" fill="#6fd35a" stroke="#2a2140" stroke-width="2.5"/><circle cx="48" cy="29" r="5.5" fill="#6fd35a" stroke="#2a2140" stroke-width="2.5"/><ellipse cx="96" cy="60" rx="6" ry="8" fill="#ff8fc8" stroke="#2a2140" stroke-width="2.5" transform="rotate(35 96 60)"/><circle cx="102" cy="52" r="5.5" fill="#ff8fc8" stroke="#2a2140" stroke-width="2.5"/></svg>';

  return {
    id: 'hill', name: 'King of the Hill', roundsToWin: 1, single: true, minTotal: 2, song: 'party', minZoom: 15, art: ART,
    desc: 'Stand on top of the hill alone to earn points. Push everyone else off! First to 25.',
    build, spawn, update, botThink, hud, visual,
    scoreLabel: (s) => Math.floor(s),
    netState: () => ({ k: king && king.player ? 'p' + king.player.id : '', t: time }),
    applyNetState: (s) => { king = FP.Ragdoll.all.find((c) => c.player && 'p' + c.player.id === s.k) || null; },
  };
})();
