// ============================================================
//  FLOPPY PARTY — FLOPPY BOXING
//  Into the ring! Everyone gets big boxing gloves and a health
//  bar. A referee watches the fight.
//    PUNCH: punch!   Hold GRAB: gloves up to block.
//    JUMP: hop out of the way.
//  No health left? You go down and the referee counts to 5.
//  MASH JUMP to get back up! 3 knockdowns and you're out.
//  Last boxer standing wins the round. First to 2 rounds.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.boxing = (function () {
  const RING = 9, ROUND_TIME = 60, COUNT_TO = 5;
  let hp = new Map(), downs = new Map(), downed = new Map(), time = 0, ref = null, bars = new Map(), gloves = [], self = null;

  function build() {
    hp = new Map(); downs = new Map(); downed = new Map(); time = 0; bars = new Map(); gloves = [];
    const S = FP.Stage;
    S.block(0, -1.6, 0, RING + 10, 1, RING + 10, 0x3a3450); // the arena floor
    S.block(0, -0.4, 0, RING + 1, 0.8, RING + 1, 0x6a4c93); // the ring platform
    const canvas = new THREE.Mesh(new THREE.PlaneGeometry(RING, RING), FP.Look.toon(0x5ab0ff));
    canvas.rotation.x = -Math.PI / 2; canvas.position.y = 0.01; S.add(canvas);
    const logo = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), FP.Look.toon(0xffcf33)); logo.rotation.x = -Math.PI / 2; logo.position.y = 0.02; S.add(logo);
    // corner posts and three ropes (the ropes keep you in, mostly)
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    const postColors = [0xff5a5f, 0xffffff, 0x4aa8ff, 0xffffff];
    corners.forEach(([sx, sz], i) => S.block(sx * RING / 2, 0.8, sz * RING / 2, 0.3, 1.6, 0.3, postColors[i]));
    for (let k = 0; k < 3; k++) {
      const y = 0.45 + k * 0.4;
      for (let i = 0; i < 4; i++) {
        const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
        const rope = FP.Look.mesh(new THREE.CylinderGeometry(0.04, 0.04, RING, 6), FP.Look.toon(k === 1 ? 0xffffff : 0xff5a5f), 0.01);
        rope.position.set((ax + bx) * RING / 4, y, (az + bz) * RING / 4);
        if (ax === bx) rope.rotation.x = Math.PI / 2; else rope.rotation.z = Math.PI / 2;
        S.add(rope);
      }
    }
    // the ropes stop people (they are a bit bouncy)
    for (const [x, z, w, d] of [[0, -RING / 2, RING, 0.2], [0, RING / 2, RING, 0.2], [-RING / 2, 0, 0.2, RING], [RING / 2, 0, 0.2, RING]]) S.bodies.push(FP.Physics.staticBox(x, 0.8, z, w, 1.6, d));
    // spotlights, a crowd all around, and a bell
    const fans = FP.Props.crowd(2, 14, 1.4); fans.position.set(0, -1.1, -RING / 2 - 3); S.add(fans);
    const fans2 = FP.Props.crowd(1, 14, 1.4); fans2.position.set(0, -1.1, RING / 2 + 3); fans2.rotation.y = Math.PI; S.add(fans2);
    // the referee (in a bow tie, of course)
    ref = FP.Ragdoll.create(S.scene, { index: 7, colorIndex: 7, hat: 'none', outfit: 'bowtie', name: 'Referee', x: 0, y: 0, z: -RING / 2 + 1.2, yaw: 0 });
    ref.isKeeper = true;
    S.onClear(() => { if (ref) FP.Ragdoll.remove(ref); ref = null; gloves.forEach(([arm, g]) => arm.remove(g)); gloves = []; bars.forEach((b) => FP.Stage.scene.remove(b)); bars = new Map(); for (const c of FP.Ragdoll.all) c.guard = false; });
    FP.Camera.setAngle(0.75, 0.85);
  }

  function spawn(i, n) { return FP.Kit.ring(i, n, 2.8, 2.8, Math.PI / 4); }

  const pos = (c) => c.parts.torso.position;
  function giveGloves(chars) {
    if (gloves.length) return;
    for (const c of chars) {
      for (const arm of c.meshes.arms) {
        const g = FP.Look.mesh(new THREE.SphereGeometry(0.2, 12, 10), FP.Look.toon(c.team === 1 ? 0x4aa8ff : 0xff3a4a), 0.02);
        g.scale.set(1, 1, 1.15); g.position.y = -0.27; arm.add(g); gloves.push([arm, g]);
      }
    }
  }

  // punches land: take away health (a lot less if they had their gloves up)
  FP.bus.on('punchHit', (d) => {
    if (!FP.Kit.live(self) || !d || !d.victim || !d.by || !hp.has(d.victim) || downed.has(d.victim)) return;
    const v = d.victim, by = d.by;
    v.dizzy = 0; // in boxing only the health bar can knock you down
    const q = pos(v), p = pos(by);
    const facing = ((p.x - q.x) * Math.sin(v.yaw) + (p.z - q.z) * Math.cos(v.yaw)) > 0;
    let dmg = 16 + Math.random() * 8;
    if (v.guard && facing) {
      dmg *= 0.2;
      for (const b of v.bodies) { b.velocity.x *= 0.3; b.velocity.z *= 0.3; }
      FP.FX.word(v.parts.head.position, 'BLOCKED!', '#4aa8ff', 0.9);
    } else if (dmg > 21) FP.FX.word(v.parts.head.position, 'POW!', '#ffcf33', 1.2);
    hp.set(v, Math.max(0, hp.get(v) - dmg));
    if (hp.get(v) <= 0) knockDown(v);
  });

  function knockDown(c) {
    const n = (downs.get(c) || 0) + 1;
    downs.set(c, n);
    FP.Ragdoll.knockOut(c, 30);
    FP.Camera.shake(0.4); FP.Audio.play('ko'); FP.Props.hype();
    if (n >= 3) { out(c, 'is knocked out for good!'); return; }
    downed.set(c, { t: 0, mash: 0, said: 0 });
    FP.FX.word(c.parts.head.position, 'DOWN!', '#ff5a5f', 1.5);
  }
  function out(c, how) {
    downed.delete(c);
    FP.Game.eliminate(c, how);
    FP.FX.stars(c.parts.head.position, 10);
  }
  function getUp(c) {
    downed.delete(c);
    c.ko = 0; c.getUp = 0.5;
    hp.set(c, 40);
    FP.FX.word(c.parts.head.position, 'BACK UP!', '#5cc44a', 1.2);
    FP.Audio.play('cheer');
  }

  function control(c, input, dt, playing) {
    const inp = input || {};
    if (!hp.has(c)) hp.set(c, 100);
    const d = downed.get(c);
    if (d && playing) {
      // down on the canvas: mash jump to get back up!
      const pressed = c.isBot ? Math.random() < dt * ({ easy: 4, normal: 6, hard: 8 }[c.botSkill] || 6) : inp.jumpPressed || inp.punchPressed;
      if (pressed) { d.mash++; FP.FX.puffs(c.parts.head.position, 2, 0xffffff, 1, 0.5); }
      if (d.mash >= 10) getUp(c);
      FP.Ragdoll.control(c, { x: 0, z: 0 }, dt);
      return;
    }
    c.guard = playing && !!inp.grab && c.alive;
    const slow = c.guard ? 0.45 : 1;
    FP.Ragdoll.control(c, { x: (inp.x || 0) * slow, z: (inp.z || 0) * slow, jump: inp.jump, jumpPressed: inp.jumpPressed, punchPressed: c.guard ? false : inp.punchPressed, grab: false, emote: inp.emote }, dt);
  }

  // the referee walks around the fighters, and counts over anyone who is down
  function beforeStep(dt) {
    if (!ref) return;
    const input = { x: 0, z: 0 };
    const target = [...downed.keys()][0];
    let tx = 0, tz = -RING / 2 + 1.2;
    if (target) { const q = pos(target); tx = q.x + 1.1; tz = q.z; }
    else {
      const fighters = FP.Game.chars.filter((c) => c.alive);
      if (fighters.length) { const cx = fighters.reduce((s, c) => s + pos(c).x, 0) / fighters.length, cz = fighters.reduce((s, c) => s + pos(c).z, 0) / fighters.length; tx = Math.max(-RING / 2 + 1, Math.min(RING / 2 - 1, cx + 2.2)); tz = Math.max(-RING / 2 + 1, Math.min(RING / 2 - 1, cz - 1.5)); }
    }
    const r = pos(ref);
    input.x = Math.max(-1, Math.min(1, (tx - r.x) * 1.5)) * 0.6; input.z = Math.max(-1, Math.min(1, (tz - r.z) * 1.5)) * 0.6;
    if (Math.hypot(input.x, input.z) < 0.1) { input.x = 0; input.z = 0; }
    FP.Ragdoll.control(ref, input, dt);
  }

  function update(dt, chars, game, roundOver) {
    if (ref) FP.Ragdoll.sync(ref, dt);
    if (dt > 0 && !roundOver) {
      time += dt;
      for (const c of chars) if (!hp.has(c)) hp.set(c, 100);
      for (const [c, d] of downed) {
        d.t += dt;
        const n = Math.floor(d.t);
        if (n > d.said && ref) { d.said = n; FP.FX.word(ref.parts.head.position, ['', 'ONE!', 'TWO!', 'THREE!', 'FOUR!', 'FIVE!'][n] || '', '#ffffff', 1.3); FP.Audio.play('beep'); }
        if (d.t >= COUNT_TO + 0.5) out(c, 'is knocked out!');
      }
      // fell out of the ring? That's a knockout too
      for (const c of chars) if (c.alive && pos(c).y < -2.5) out(c, 'fell out of the ring!');
    }
    visual();
    if (roundOver || dt === 0) return null;
    const res = FP.Kit.lastStanding(chars);
    if (res) return res;
    if (time >= ROUND_TIME) {
      // time's up: the boxer with the most health wins
      const alive = chars.filter((c) => c.alive);
      const best = alive.reduce((a, c) => (!a || (hp.get(c) || 0) > (hp.get(a) || 0) ? c : a), null);
      return { winners: best ? [best] : [], text: best ? `Time! ${best.name} wins on points!` : 'Time!' };
    }
    return null;
  }

  // health bars over everyone's head
  function visual() {
    giveGloves(FP.Game.chars);
    const cam = FP.Camera.camera;
    for (const c of FP.Game.chars) {
      let bar = bars.get(c);
      if (!bar) {
        bar = new THREE.Group();
        const bg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.14), new THREE.MeshBasicMaterial({ color: 0x2a2140, depthTest: false }));
        const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.08), new THREE.MeshBasicMaterial({ color: 0x5cc44a, depthTest: false }));
        fill.position.z = 0.001; bar.add(bg, fill); bar.userData.fill = fill; bar.renderOrder = 10;
        FP.Stage.scene.add(bar); bars.set(c, bar);
      }
      const h = Math.max(0, (hp.has(c) ? hp.get(c) : 100) / 100);
      bar.visible = c.alive !== false;
      const head = c.parts.head.position;
      bar.position.set(head.x, head.y + 1.5, head.z); // above the name tag
      if (cam) bar.quaternion.copy(cam.quaternion);
      const f = bar.userData.fill;
      f.scale.x = Math.max(0.001, h); f.position.x = -0.47 * (1 - h);
      f.material.color.setHex(h > 0.5 ? 0x5cc44a : h > 0.25 ? 0xffcf33 : 0xff5a5f);
    }
  }

  // bots: go for the closest boxer, punch, and put the gloves up when they swing
  function botThink(c, chars, dt, input, tools) {
    const p = pos(c), br = tools.brain;
    const foes = chars.filter((o) => o !== c && o.alive && !downed.has(o));
    const tgt = foes.reduce((a, o) => (!a || pos(o).distanceTo(p) < pos(a).distanceTo(p) ? o : a), null);
    if (!tgt) { input.x = -p.x * 0.3; input.z = -p.z * 0.3; return true; }
    const q = pos(tgt), d = q.distanceTo(p);
    const blockSkill = { easy: 0.15, normal: 0.35, hard: 0.6 }[c.botSkill] || 0.35;
    if (tgt.punchT < 0.15 && d < 1.8 && !br.blockRoll) { br.blockRoll = true; br.blocking = Math.random() < blockSkill ? 0.5 : 0; }
    if (tgt.punchT > 0.3) br.blockRoll = false;
    br.blocking = Math.max(0, (br.blocking || 0) - dt);
    if (br.blocking > 0) { input.grab = true; tools.steer(c, q.x, q.z, input); input.x *= 0.2; input.z *= 0.2; return true; }
    tools.steer(c, q.x, q.z, input);
    if (d < 1.4) { input.x *= 0.3; input.z *= 0.3; if (Math.random() < dt * 3) input.punchPressed = true; }
    if ((hp.get(c) || 100) < 30 && d < 2 && Math.random() < dt * 1.5) input.jumpPressed = true; // hop away when hurt
    tools.unstick(input);
    return true;
  }

  function hud() {
    return `<span>${FP.UI.ICON.clock} ${FP.Kit.clock(ROUND_TIME - time)}</span><span class="hud-tip">PUNCH: punch &nbsp; Hold GRAB: block &nbsp; Knocked down? MASH JUMP to get up!</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#3a3450"/><path d="M14 60l20-26h52l20 26z" fill="#5ab0ff" stroke="#2a2140" stroke-width="2"/><path d="M34 34v-10M86 34v-10M14 60v-12M106 60v-12" stroke="#fff" stroke-width="3"/><path d="M34 26h52M34 30h52" stroke="#ff5a5f" stroke-width="2"/><circle cx="48" cy="40" r="6" fill="#ff3a4a" stroke="#2a2140" stroke-width="2"/><circle cx="72" cy="42" r="6" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><text x="60" y="20" font-size="10" font-weight="900" text-anchor="middle" fill="#ffcf33">POW!</text><rect x="36" y="12" width="20" height="4" fill="#5cc44a"/><rect x="64" y="12" width="12" height="4" fill="#ffcf33"/></svg>';

  self = {
    id: 'boxing', name: 'Floppy Boxing', roundsToWin: 2, minTotal: 2, removeOut: 1.5, song: 'tense', minZoom: 12, art: ART,
    desc: 'Into the ring with big gloves! PUNCH, hold GRAB to block. Knocked down? MASH JUMP before the ref counts to 5.',
    build, spawn, control, beforeStep, update, botThink, hud, visual,
    netState: () => ({ t: Math.round(time), h: FP.Game.chars.map((c) => Math.round(hp.has(c) ? hp.get(c) : 100)) }),
    applyNetState: (s) => { time = s.t; (s.h || []).forEach((v, i) => { const c = FP.Game.chars[i]; if (c) hp.set(c, v); }); },
  };
  return self;
})();
