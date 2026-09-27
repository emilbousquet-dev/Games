// ============================================================
//  FLOPPY PARTY — CONVEYOR BRAWL
//  The floor is made of moving belts! They carry you toward the
//  edge, and they speed up. Every so often they switch
//  direction. Walk against them, punch others off.
//  Last one on the platform wins. First to 2.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.conveyor = (function () {
  const STRIPS = 6, SW = 2.2, LEN = 14;
  let belts = [], time = 0, speed = 1.5, flip = 1, switchT = 0, self = null;

  function beltTexture(color) {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
    const g = cv.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 64, 64);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(8, i * 16 + 12); g.lineTo(32, i * 16 + 4); g.lineTo(56, i * 16 + 12); g.lineTo(56, i * 16 + 16); g.lineTo(32, i * 16 + 8); g.lineTo(8, i * 16 + 16); g.fill(); }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, LEN / SW);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function build() {
    belts = []; time = 0; speed = 2; flip = 1; switchT = 12;
    const S = FP.Stage;
    const cols = ['#ffb13b', '#4aa8ff', '#ff7eb6', '#5cc44a', '#a77bff', '#ffd23f'];
    for (let i = 0; i < STRIPS; i++) {
      const x = (i - (STRIPS - 1) / 2) * SW;
      const b = S.block(x, -0.3, 0, SW - 0.08, 0.6, LEN, 0xffffff, { kinematic: true, unique: true });
      const tex = beltTexture(cols[i]);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(SW - 0.1, LEN), new THREE.MeshToonMaterial({ map: tex, gradientMap: FP.Look.toon(0xffffff).gradientMap }));
      top.rotation.x = -Math.PI / 2; top.position.set(x, 0.005, 0); top.receiveShadow = true;
      S.add(top);
      // rollers at both ends
      for (const s of [-1, 1]) {
        const r = FP.Look.mesh(new THREE.CylinderGeometry(0.32, 0.32, SW - 0.1, 14), FP.Look.toon(0x8a8fa0), 0.02);
        r.rotation.z = Math.PI / 2; r.position.set(x, -0.3, s * LEN / 2);
        S.add(r);
      }
      belts.push({ x, body: b.body, tex, dir: 1, mul: [1, 1.25, 0.85, 1.15, 0.9, 1.3][i] }); // all belts go the same way, some faster
    }
    // side walls on the left and right (you can only fall off the ends)
    S.block(-(STRIPS * SW) / 2 - 0.3, 0.4, 0, 0.5, 0.8, LEN, 0x3a3450);
    S.block((STRIPS * SW) / 2 + 0.3, 0.4, 0, 0.5, 0.8, LEN, 0x3a3450);
    // warning stripes at the ends
    for (const s of [-1, 1]) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry(STRIPS * SW, 0.4), new THREE.MeshBasicMaterial({ color: 0xffcf33 }));
      st.rotation.x = -Math.PI / 2; st.position.set(0, 0.02, s * (LEN / 2 - 0.3)); S.add(st);
    }
    // a big factory lamp
    const l1 = FP.Props.lamp(0xff5a5f); l1.position.set(-(STRIPS * SW) / 2 - 0.3, 0.8, -LEN / 2 + 1); S.add(l1);
    const l2 = FP.Props.lamp(0x5cc44a); l2.position.set((STRIPS * SW) / 2 + 0.3, 0.8, LEN / 2 - 1); S.add(l2);
    FP.Camera.setAngle(0.9, 0.62);
  }

  function spawn(i, n) {
    const x = (i - (n - 1) / 2) * 2.4;
    return { x, y: 0.2, z: (i % 2 ? 1 : -1) * 1.5, yaw: i % 2 ? Math.PI : 0 };
  }

  // the belts don't really move: they just push whoever stands on them
  function beforeStep(dt) {
    for (const b of belts) {
      b.body.position.set(b.x, -0.3, 0);
      const go = FP.Game.state === 'play' ? 1 : 0; // the belts wait for GO
      b.body.velocity.set(0, 0, b.dir * flip * speed * b.mul * go);
    }
  }

  function visual(dt) {
    const go = !FP.Game || FP.Game.state === 'play' || FP.Game.state === 'client' ? 1 : 0;
    for (const b of belts) b.tex.offset.y -= b.dir * flip * speed * b.mul * dt * go / SW;
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      speed = Math.min(8, 2.5 + time * 0.14); // later on, faster than you can walk!
      switchT -= dt;
      if (switchT <= 0) {
        switchT = 9 + Math.random() * 6;
        flip = -flip;
        FP.UI.big('SWITCH!', 0.9, 'The belts changed direction!');
        if (FP.Net) FP.Net.banner('SWITCH!', 'The belts changed direction!');
        FP.Audio.play('beep');
      }
    }
    visual(dt);
    if (roundOver || dt === 0) return null;
    FP.Kit.fallOut(chars, game, -5);
    return FP.Kit.lastStanding(chars);
  }

  // bot brain: walk against your belt, toward the middle, and punch people off
  function botThink(c, chars, dt, input, tools) {
    const p = c.parts.torso.position;
    const push = flip; // which way the belts carry everyone (+z or -z)
    // walk against the belt, and toward a belt going the other way if I'm near an end
    const wantZ = -Math.sign(p.z || push) * Math.min(1, Math.abs(p.z) / 3) - push * 0.7;
    // the slowest belt is the safest
    const slow = belts.reduce((a, b) => (b.mul < a.mul ? b : a), belts[0]);
    const wantX = Math.abs(slow.x - p.x) > 0.6 ? Math.sign(slow.x - p.x) * 0.6 : 0;
    input.x = wantX; input.z = Math.max(-1, Math.min(1, wantZ));
    for (const o of chars) if (o !== c && o.alive && o.parts.torso.position.distanceTo(p) < 1.3 && Math.random() < dt * 2.5) input.punchPressed = true;
    tools.unstick(input);
    return true;
  }

  function hud() { return `The floor is moving! Belt speed ${speed.toFixed(1)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#cfd6e6"/><g stroke="#2a2140" stroke-width="2"><path d="M14 30h92v30H14z" fill="#8a8fa0"/><path d="M14 30h23v30H14z" fill="#ffb13b"/><path d="M37 30h23v30H37z" fill="#4aa8ff"/><path d="M60 30h23v30H60z" fill="#ff7eb6"/><path d="M83 30h23v30H83z" fill="#5cc44a"/></g><path d="M25 52l0-14M21 42l4-4 4 4M48 38l0 14M44 48l4 4 4-4M71 52l0-14M67 42l4-4 4 4M94 38l0 14M90 48l4 4 4-4" stroke="#2a2140" stroke-width="2" fill="none"/><ellipse cx="58" cy="24" rx="5" ry="6" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="58" cy="15" r="4" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'conveyor', name: 'Conveyor Brawl', roundsToWin: 2, minTotal: 2, removeOut: 1.5, song: 'race', minZoom: 15, art: ART,
    desc: 'The floor is made of moving belts! Walk against them and push everyone else off the ends.',
    build, spawn, beforeStep, update, botThink, hud, visual,
    netState: () => ({ s: Math.round(speed * 10) / 10, f: flip }),
    applyNetState: (st) => { speed = st.s; flip = st.f; },
  };
  return self;
})();
