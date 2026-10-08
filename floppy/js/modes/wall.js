// ============================================================
//  FLOPPY PARTY — HOLE IN THE WALL
//  A big wall slides across the platform. It has gaps in it:
//  stand in a gap or get pushed off the edge! The walls come
//  faster and the gaps get smaller. Last one standing wins.
//  First to 2.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.wall = (function () {
  const SEG = 12, SW = 1.0, H = 2.4, W = SEG * SW, D = 10, START_Z = -D / 2 - 2.5, END_Z = D / 2 + 3;
  let segs = [], z = START_Z, speed = 2.6, wave = 0, wait = 2.5, moving = false, holes = [], self = null;
  const COLORS = [0xff7eb6, 0xffcf33, 0x4aa8ff, 0x5cc44a, 0xa77bff, 0xff9a3c];

  function build() {
    segs = []; z = START_Z; speed = 2.6; wave = 0; wait = 2.5; moving = false; holes = [];
    const S = FP.Stage;
    S.island(0, -1, 0, W, 2, D, { grass: 0x9bd46e });
    // the wall: 12 pieces side by side (the gaps are pieces that drop into the floor)
    for (let i = 0; i < SEG; i++) {
      const x = (i - (SEG - 1) / 2) * SW;
      const b = S.block(x, H / 2, START_Z, SW - 0.02, H, 0.6, COLORS[i % COLORS.length], { kinematic: true, unique: true });
      const stripe = FP.Look.boxMesh(SW - 0.01, 0.2, 0.62, FP.Look.toon(0xffffff), 0);
      stripe.position.y = 0.6;
      b.mesh.add(stripe);
      segs.push({ x, body: b.body, down: false, y: H / 2 });
    }
    // the path the wall takes: guide rails on both sides
    for (const s of [-1, 1]) S.block(s * (W / 2 + 0.3), 0.2, 0, 0.4, 0.4, D + 6, 0x3a3450);
    S.island(0, -1.2, START_Z - 0.5, W + 1, 2, 3, { grass: 0x9bd46e });
    FP.Camera.setAngle(0.75, 0.82);
    newWave();
  }

  function spawn(i, n) { return { x: (i - (n - 1) / 2) * 2.2, y: 0.2, z: 1.5, yaw: Math.PI }; }

  // pick new gaps: big ones at first, smaller and fewer later
  function newWave() {
    wave++;
    const count = wave < 3 ? 2 : wave < 6 ? (Math.random() < 0.5 ? 2 : 1) : 1;
    const size = wave < 4 ? 2 : wave < 8 ? 2 : 1;
    holes = [];
    for (let k = 0; k < count; k++) {
      let start = Math.floor(Math.random() * (SEG - size + 1));
      for (let t = 0; t < 10 && holes.some((h) => Math.abs(h - start) < size + 1); t++) start = Math.floor(Math.random() * (SEG - size + 1));
      holes.push(start);
    }
    segs.forEach((s, i) => { s.down = holes.some((h) => i >= h && i < h + size); });
    z = START_Z; moving = false; wait = wave === 1 ? 0.5 : 1.4;
  }

  function beforeStep(dt) {
    const go = FP.Game.state === 'play' && moving;
    for (const s of segs) {
      const wantY = s.down ? -H / 2 - 0.3 : H / 2;
      s.y += (wantY - s.y) * Math.min(1, dt * 8);
      s.body.position.set(s.x, s.y, z);
      s.body.velocity.set(0, 0, go ? speed : 0);
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      if (!moving) { wait -= dt; if (wait <= 0) { moving = true; FP.Audio.play('whoosh'); } }
      else {
        z += speed * dt;
        if (z > END_Z) { speed = Math.min(8.5, speed + 0.35); newWave(); FP.Audio.play('beep'); }
      }
      // the wall shoves hard (so you really fly off)
      for (const c of chars) {
        if (!c.alive) continue;
        const p = c.parts.torso.position;
        if (moving && p.z > z - 0.9 && p.z < z + 0.6 && p.y < H + 0.5) {
          // your whole body has to fit in the gap (so two people can't squeeze into a tiny one)
          const hit = [-0.25, 0, 0.25].some((o) => { const seg = segs.find((s) => Math.abs(s.x - (p.x + o)) < SW / 2); return seg && !seg.down; });
          if (hit) { for (const b of c.bodies) { b.velocity.z = Math.max(b.velocity.z, speed + 4); b.velocity.y += 0.4; } }
        }
      }
    }
    if (roundOver || dt === 0) return null;
    FP.Kit.fallOut(chars, game, -5, 'got pushed off by the wall!');
    return FP.Kit.lastStanding(chars);
  }

  // bot brain: find the closest gap and stand in it before the wall arrives
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position;
    let best = null, bd = Infinity;
    segs.forEach((s) => { if (s.down) { const d = Math.abs(s.x - p.x); if (d < bd) { bd = d; best = s; } } });
    const tz = Math.min(2, Math.max(-2, p.z));
    if (best) {
      const dx = best.x - p.x;
      input.x = Math.abs(dx) > 0.15 ? Math.sign(dx) * Math.min(1, Math.abs(dx) * 2) : 0;
      input.z = (tz - p.z) * 0.5 + (p.z > 2.5 ? -1 : 0);
      if (Math.abs(dx) < 0.3) FP.Kit.punchNearby(c, chars, dt, input, tools, 1.2, 2); // shove others out of my gap
    }
    return true;
  }

  function hud() { return `Stand in a gap when the wall comes! Wall ${wave} &nbsp; Speed ${speed.toFixed(1)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><path d="M8 62l52-12 52 12-52 16z" fill="#9bd46e" stroke="#2a2140" stroke-width="2"/><g stroke="#2a2140" stroke-width="2"><rect x="14" y="18" width="14" height="34" fill="#ff7eb6"/><rect x="28" y="18" width="14" height="34" fill="#ffcf33"/><rect x="42" y="18" width="14" height="34" fill="#4aa8ff"/><rect x="84" y="18" width="14" height="34" fill="#5cc44a"/><rect x="98" y="18" width="10" height="34" fill="#a77bff"/></g><ellipse cx="70" cy="48" rx="6" ry="8" fill="#ff9a3c" stroke="#2a2140" stroke-width="2"/><circle cx="70" cy="36" r="5" fill="#ff9a3c" stroke="#2a2140" stroke-width="2"/><path d="M20 58v8M16 62l4 4 4-4M50 58v8M46 62l4 4 4-4" stroke="#2a2140" stroke-width="2" fill="none"/></svg>';

  self = {
    id: 'wall', name: 'Hole in the Wall', roundsToWin: 2, minTotal: 2, removeOut: 1.5, song: 'tense', minZoom: 15, art: ART,
    desc: 'A wall slides toward you. Stand in a gap or get pushed off! The gaps get smaller.',
    build, spawn, beforeStep, update, botThink, hud,
    netState: () => ({ w: wave, s: Math.round(speed * 10) / 10 }),
    applyNetState: (st) => { wave = st.w; speed = st.s; },
  };
  return self;
})();
