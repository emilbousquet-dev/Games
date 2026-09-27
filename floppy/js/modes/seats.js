// ============================================================
//  FLOPPY PARTY — MUSICAL SEATS
//  Walk around while the music plays. When it STOPS, seats pop
//  up: run and stand on one! There is always one seat too few.
//  No seat? You're out. Last one left wins. First to 2.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.seats = (function () {
  const MAX = 3, SEAT_R = 0.75;
  const COLORS = [0xff5a5f, 0x4aa8ff, 0xffcf33];
  let seats = [], phase = 'music', timer = 0, self = null;

  function build() {
    seats = []; phase = 'music'; timer = 4 + Math.random() * 3;
    const S = FP.Stage;
    S.island(0, -1, 0, 15, 2, 11, { grass: 0x9bd46e });
    S.island(0, -1, 0, 11, 2, 15, { grass: 0x9bd46e });
    // a music box in the middle
    S.block(0, 0.45, 0, 1.3, 0.9, 1.3, 0xffb8d1);
    const note = FP.Look.mesh(new THREE.SphereGeometry(0.22, 12, 10), FP.Look.toon(0x2a2140), 0.02);
    note.position.set(0, 1.3, 0);
    S.add(note);
    for (let i = 0; i < MAX; i++) {
      const g = new THREE.Group();
      const cushion = FP.Look.mesh(new THREE.CylinderGeometry(SEAT_R, SEAT_R, 0.18, 24), FP.Look.toon(COLORS[i]), 0.03);
      cushion.position.y = 0.09;
      const ring = new THREE.Mesh(new THREE.RingGeometry(SEAT_R + 0.05, SEAT_R + 0.2, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
      g.add(cushion, ring);
      g.userData.ring = ring;
      g.position.set(0, -50, 0);
      S.add(g);
      seats.push({ mesh: g, x: 0, z: 0, on: false, owner: null, pop: 0 });
    }
    FP.Camera.setAngle(0.85, 0.75);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 4.3, 4.3, 0.2); }

  function showSeats(n) {
    const turn = Math.random() * Math.PI * 2;
    seats.forEach((s, i) => {
      s.on = i < n; s.owner = null; s.pop = 0;
      if (!s.on) return;
      const a = turn + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const r = 2.2 + Math.random() * 2.8;
      s.x = Math.cos(a) * r; s.z = Math.sin(a) * r;
    });
  }

  function visual(dt) {
    for (const s of seats) {
      s.pop = Math.min(1, s.pop + dt * 5);
      if (!s.on) { s.mesh.position.y = -50; continue; }
      s.mesh.position.set(s.x, 0, s.z);
      s.mesh.scale.setScalar(0.3 + 0.7 * s.pop);
      s.mesh.userData.ring.material.color.setHex(s.owner ? s.owner.color.body : 0xffffff);
    }
    FP.Audio.setSong(phase === 'music' ? 'circus' : 'silent');
  }

  function update(dt, chars, game, roundOver) {
    if (roundOver) { phase = 'music'; for (const s of seats) s.on = false; }
    if (dt > 0 && !roundOver) {
      timer -= dt;
      const alive = chars.filter((c) => c.alive);
      if (phase === 'music') {
        if (timer <= 0 && alive.length > 1) {
          phase = 'seek'; timer = 6;
          showSeats(Math.min(MAX, alive.length - 1));
          FP.UI.big('SIT!', 0.9, 'Find a seat!');
          if (FP.Net) FP.Net.banner('SIT!', 'Find a seat!');
          FP.Audio.play('beep');
        }
      } else if (phase === 'seek') {
        // claim a seat by standing on it (stay on it or lose it!)
        for (const s of seats) {
          if (!s.on) continue;
          if (s.owner) {
            const op = s.owner.parts.torso.position;
            if (!s.owner.alive || s.owner.ko > 0 || Math.hypot(op.x - s.x, op.z - s.z) > SEAT_R + 0.45) s.owner = null;
          }
          if (!s.owner) {
            for (const c of alive) {
              if (c.ko > 0 || seats.some((o) => o.owner === c)) continue;
              const p = c.parts.torso.position;
              if (Math.hypot(p.x - s.x, p.z - s.z) < SEAT_R && p.y < 2.5) { s.owner = c; FP.Audio.play('coin'); break; }
            }
          }
        }
        const open = seats.filter((s) => s.on && !s.owner).length;
        if (timer <= 0 || (open === 0 && timer < 4.5)) {
          // everyone without a seat is out!
          for (const c of alive) if (!seats.some((s) => s.on && s.owner === c)) { FP.Ragdoll.knockOut(c, 2); game.eliminate(c, 'had no seat!'); }
          phase = 'wait'; timer = 1.6;
        }
      } else if (phase === 'wait' && timer <= 0) {
        phase = 'music'; timer = 4 + Math.random() * 6;
        for (const s of seats) s.on = false;
        FP.UI.toast('The music is back! Keep walking...');
      }
    }
    visual(dt);
    if (roundOver || dt === 0) return null;
    FP.Kit.fallOut(chars, game, -5);
    return FP.Kit.lastStanding(chars);
  }

  // bot brain: walk around the music box while the music plays. When it stops, run to the best free seat and guard it
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position;
    if (phase === 'seek') {
      const mine = seats.find((s) => s.on && s.owner === c);
      if (mine) {
        const d = Math.hypot(mine.x - p.x, mine.z - p.z);
        if (d > 0.3) { tools.steer(c, mine.x, mine.z, input); input.x *= 0.5; input.z *= 0.5; }
        FP.Kit.punchNearby(c, chars, dt, input, tools, 1.3, 3);
        if (d < 0.3) { input.x *= 0.2; input.z *= 0.2; }
        return true;
      }
      let best = null, bs = Infinity;
      for (const s of seats) {
        if (!s.on) continue;
        const d = Math.hypot(s.x - p.x, s.z - p.z);
        let sc = d + (s.owner ? 3 : 0);
        for (const o of chars) if (o !== c && o.alive && Math.hypot(o.parts.torso.position.x - s.x, o.parts.torso.position.z - s.z) < d - 0.5) sc += 1.5;
        if (sc < bs) { bs = sc; best = s; }
      }
      if (best) {
        tools.steer(c, best.x, best.z, input);
        if (best.owner && Math.hypot(best.x - p.x, best.z - p.z) < 1.4 && Math.random() < dt * 4) input.punchPressed = true; // push them off!
      }
    } else {
      // walk in a circle around the middle (like real musical chairs)
      const a = Math.atan2(p.z, p.x) + 0.5;
      tools.steer(c, Math.cos(a) * 4.2, Math.sin(a) * 4.2, input);
      input.x *= 0.65; input.z *= 0.65;
    }
    tools.unstick(input);
    return true;
  }

  function hud() {
    if (phase === 'music') return 'Keep walking while the music plays...';
    if (phase === 'seek') return `Find a seat! <span class="fuse"><i style="width:${Math.round(Math.max(0, timer / 6) * 100)}%"></i></span>`;
    return '...';
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><ellipse cx="60" cy="62" rx="52" ry="13" fill="#9bd46e" stroke="#2a2140" stroke-width="2"/><rect x="54" y="42" width="12" height="12" fill="#ffb8d1" stroke="#2a2140" stroke-width="2"/><g stroke="#2a2140" stroke-width="2"><ellipse cx="30" cy="62" rx="10" ry="4" fill="#ff5a5f"/><ellipse cx="90" cy="64" rx="10" ry="4" fill="#4aa8ff"/></g><path d="M70 14v14a4 4 0 1 1-2-3.5V17l12-3v11a4 4 0 1 1-2-3.5V17z" fill="#2a2140"/><ellipse cx="30" cy="50" rx="5" ry="7" fill="#ffcf33" stroke="#2a2140" stroke-width="2"/><circle cx="30" cy="40" r="5" fill="#ffcf33" stroke="#2a2140" stroke-width="2"/><ellipse cx="46" cy="30" rx="5" ry="7" fill="#9b6bff" stroke="#2a2140" stroke-width="2" transform="rotate(-20 46 30)"/><circle cx="48" cy="20" r="5" fill="#9b6bff" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'seats', name: 'Musical Seats', roundsToWin: 2, minTotal: 2, removeOut: 1.5, song: 'circus', minZoom: 15, art: ART,
    desc: 'Walk while the music plays. When it stops, stand on a seat! One seat too few...',
    build, spawn, update, botThink, hud, visual,
    netState: () => ({ p: phase, t: Math.round(timer * 10) / 10, s: seats.map((s) => [s.on ? 1 : 0, Math.round(s.x * 100) / 100, Math.round(s.z * 100) / 100, s.owner && s.owner.player ? s.owner.player.id : -1]) }),
    applyNetState: (st) => {
      phase = st.p; timer = st.t;
      st.s.forEach(([on, x, z, id], i) => { const s = seats[i]; if (!s) return; if (on && !s.on) s.pop = 0; s.on = !!on; s.x = x; s.z = z; s.owner = FP.Ragdoll.all.find((c) => c.player && c.player.id === id) || null; });
    },
  };
  return self;
})();
