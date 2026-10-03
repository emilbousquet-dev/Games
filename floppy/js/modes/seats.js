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
  let seats = [], phase = 'music', timer = 0, box = null, self = null;

  function build() {
    seats = []; phase = 'music'; timer = 4 + Math.random() * 3;
    const S = FP.Stage;
    S.island(0, -1, 0, 15, 2, 11, { grass: 0x9bd46e });
    S.island(0, -1, 0, 11, 2, 15, { grass: 0x9bd46e });
    // a jukebox in the middle (it lights up while the music plays)
    box = FP.Props.jukebox();
    box.position.set(0, 0, 0);
    box.rotation.y = 0.4;
    S.add(box);
    S.bodies.push(FP.Physics.staticBox(0, 0.9, 0, 1.3, 1.8, 1.3));
    // lamps and flowers around the edge
    for (const [x, z] of [[-6.5, -4.5], [6.5, 4.5], [-6.5, 4.5], [6.5, -4.5]]) { const l = FP.Props.lamp(); l.position.set(x, 0, z); S.add(l); }
    S.add(FP.Props.bunting(-6.5, 2.5, -4.5, 6.5, 2.5, -4.5));
    // the chairs (a real chair to climb on, and a ring on the floor that shows who has it)
    for (let i = 0; i < MAX; i++) {
      const g = new THREE.Group();
      const ch = FP.Props.chair(COLORS[i]);
      const ring = new THREE.Mesh(new THREE.RingGeometry(SEAT_R + 0.1, SEAT_R + 0.28, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03;
      g.add(ch, ring);
      g.userData.ring = ring; g.userData.chair = ch;
      g.position.set(0, -50, 0);
      S.add(g);
      const body = FP.Physics.staticBox(0, -50, 0, 1.0, 0.5, 1.0);
      S.bodies.push(body);
      seats.push({ mesh: g, body, x: 0, z: 0, on: false, owner: null, pop: 0 });
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
      if (!s.on) { s.mesh.position.y = -50; if (s.body) s.body.position.set(0, -50 - seats.indexOf(s) * 3, 0); continue; }
      s.mesh.position.set(s.x, 0, s.z);
      s.mesh.rotation.y = Math.atan2(-s.x, -s.z); // chairs face the jukebox
      s.mesh.userData.chair.scale.setScalar(0.3 + 0.7 * s.pop);
      s.mesh.userData.chair.position.y = (1 - s.pop) * 0.8;
      s.mesh.userData.ring.material.color.setHex(s.owner ? s.owner.color.body : 0xffffff);
      if (s.body) s.body.position.set(s.x, 0.25, s.z);
    }
    if (box) box.userData.playing = phase === 'music';
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
              if (Math.hypot(p.x - s.x, p.z - s.z) < SEAT_R && p.y < 3) { s.owner = c; FP.Audio.play('coin'); break; }
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
        if (d > 0.3) { input.x = (mine.x - p.x) / d; input.z = (mine.z - p.z) / d; input.x *= 0.5; input.z *= 0.5; }
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
        const bd = Math.hypot(best.x - p.x, best.z - p.z) || 1;
        input.x = (best.x - p.x) / bd; input.z = (best.z - p.z) / bd;
        // hop up onto the chair
        if (bd < 1.4 && c.grounded && p.y - FP.Ragdoll.STAND < 0.3 && Math.random() < dt * 6) input.jumpPressed = true;
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
