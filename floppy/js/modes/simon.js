// ============================================================
//  FLOPPY PARTY — FLOPPY SAYS
//  Like "Simon says"! The big announcer gives orders: jump,
//  punch, wave, dance, touch your nose, grab with one hand,
//  spin around, hug a friend, freeze... Only do it when it
//  starts with "Floppy says"! (Watch out for "Flappy says"!)
//  Do it right: +1 point. Get tricked: -1.
//  It gets faster and trickier the longer it goes. 20 orders.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.simon = (function () {
  // every move: its words, a hint for how to do it, and from which order it can show up
  const MOVES = {
    jump: { word: 'JUMP!', hint: 'Space / A', from: 1 },
    punch: { word: 'PUNCH!', hint: 'F / X', from: 1 },
    wave: { word: 'WAVE!', hint: 'key 1 / Back', from: 1 },
    freeze: { word: 'FREEZE!', hint: "don't move at all", from: 1 },
    grab: { word: 'GRAB WITH BOTH HANDS!', hint: 'G / both bumpers', from: 3 },
    dance: { word: 'DANCE!', hint: 'key 2 / left stick click', from: 4 },
    cheer: { word: 'CHEER!', hint: 'key 3 / Y', from: 4 },
    nose: { word: 'TOUCH YOUR NOSE!', hint: 'key 4 / right stick click', from: 5 },
    left: { word: 'LEFT HAND ONLY!', hint: 'Q / left bumper', from: 6 },
    right: { word: 'RIGHT HAND ONLY!', hint: 'E / right bumper', from: 6 },
    spin: { word: 'SPIN AROUND!', hint: 'walk in a little circle', from: 8 },
    run: { word: 'RUN AROUND!', hint: 'keep running', from: 8 },
    hug: { word: 'HUG A FRIEND!', hint: 'grab someone', from: 10, needsFriend: true },
  };
  const TOTAL = 20;
  let orders = [], says = true, trick = '', phase = 'wait', timer = 0, windowLen = 2.5, count = 0;
  let did = new Map(), moved = new Map(), turn = new Map(), ran = new Map(), lastYaw = new Map();
  let sign = null, host = null, respawn = null, self = null;

  function build() {
    orders = []; says = true; trick = ''; phase = 'wait'; timer = 3; count = 0; windowLen = 2.5;
    did = new Map(); moved = new Map(); turn = new Map(); ran = new Map(); lastYaw = new Map();
    respawn = FP.Kit.respawner((c) => spawn(Math.max(0, FP.Game.chars.indexOf(c)), FP.Game.chars.length));
    const S = FP.Stage;
    S.island(0, -1, 0, 16, 2, 12, { grass: 0x9bd46e });
    S.block(0, 0.4, -5, 5, 0.8, 2.2, 0xffb8d1); // the announcer's stage
    // the announcer: a giant bean with a megaphone
    host = new THREE.Group();
    const body = FP.Look.mesh(new THREE.CapsuleGeometry(0.9, 1, 8, 16), FP.Look.toon(0xa77bff), 0.05);
    body.position.y = 1.4;
    const head = FP.Look.mesh(new THREE.SphereGeometry(0.85, 20, 16), FP.Look.toon(0xa77bff), 0.05);
    head.position.y = 3.1;
    const ink = new THREE.MeshBasicMaterial({ color: 0x1d1a2f });
    for (const x of [-0.3, 0.3]) {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      w.position.set(x, 3.2, 0.72); w.scale.z = 0.5;
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), ink);
      pu.position.set(x, 3.2, 0.84);
      host.add(w, pu);
    }
    const mega = FP.Look.mesh(new THREE.ConeGeometry(0.45, 1.1, 16, 1, true), FP.Look.toon(0xffcf33, { side: THREE.DoubleSide }), 0.03);
    mega.rotation.x = -Math.PI / 2; mega.position.set(0.9, 2.7, 0.9);
    const crown = FP.Look.makeHat('crown', 0.85);
    crown.position.y = 3.9;
    host.add(body, head, mega, crown);
    host.position.set(0, 0.8, -5.2);
    S.add(host);
    const bb = FP.Props.billboard(4.2, 1.6);
    bb.position.set(0, 6.4, -6.2);
    S.add(bb);
    sign = bb.userData.panel;
    const fans = FP.Props.crowd(1, 10, 1.3); fans.position.set(0, 0, 6.8); fans.rotation.y = Math.PI; S.add(fans);
    FP.Camera.setAngle(0.7, 0.85);
  }

  function spawn(i, n) { return { x: (i - (n - 1) / 2) * 2.4, y: 0.2, z: 1, yaw: Math.PI }; }

  // remember what everyone did while an order is on
  function mark(c, what) { const d = did.get(c) || new Set(); d.add(what); did.set(c, d); }
  const on = () => FP.Kit.live(self) && phase === 'order';
  FP.bus.on('jump', (c) => { if (on() && c && c.parts) mark(c, 'jump'); });
  FP.bus.on('punch', (c) => { if (on() && c && c.parts) mark(c, 'punch'); });
  FP.bus.on('emote', (c) => { if (on() && c && c.emote) mark(c, ['', 'wave', 'dance', 'cheer', 'nose'][c.emote.k] || ''); });

  // it gets harder: less time, more tricks, two moves at once, and "Flappy says"
  function nextOrder(chars) {
    count++;
    const pool = Object.keys(MOVES).filter((k) => MOVES[k].from <= count && !(MOVES[k].needsFriend && chars.length < 2));
    const pick = () => pool[Math.floor(Math.random() * pool.length)];
    orders = [pick()];
    if (count >= 12 && Math.random() < 0.45) {
      // a combo: two moves at once (never freeze plus something else)
      const others = pool.filter((k) => k !== 'freeze');
      const first = others[Math.floor(Math.random() * others.length)];
      const rest = others.filter((k) => k !== first);
      orders = [first, rest[Math.floor(Math.random() * rest.length)]];
    }
    says = Math.random() < Math.max(0.55, 0.75 - count * 0.012);
    trick = '';
    if (!says) {
      const r = Math.random();
      if (count >= 9 && r < 0.4) trick = 'Flappy says: ';
      else if (count >= 14 && r < 0.6) trick = 'Floppy SAID: ';
    }
    windowLen = Math.max(1.3, 2.7 - count * 0.075) + (orders.includes('hug') ? 1.2 : 0) + (orders.length > 1 ? 0.6 : 0);
    phase = 'order'; timer = windowLen;
    did = new Map(); moved = new Map(); turn = new Map(); ran = new Map(); lastYaw = new Map();
    const words = orders.map((o) => MOVES[o].word.replace('!', '')).join(' and ') + '!';
    const text = says ? `Floppy says: ${words}` : `${trick}${words}`;
    const hint = orders.map((o) => MOVES[o].hint).join('   +   ');
    FP.UI.big(text, Math.min(windowLen, 2.4), hint);
    if (FP.Net) FP.Net.banner(text, hint);
    FP.Audio.play('voice');
  }

  function doneIt(c, o) {
    if (o === 'freeze') return !moved.get(c);
    return (did.get(c) || new Set()).has(o);
  }

  function judge(chars, game) {
    for (const c of chars) {
      const id = c.player.id;
      const all = orders.every((o) => doneIt(c, o));
      const any = orders.some((o) => o !== 'freeze' && doneIt(c, o));
      const pos = c.parts.head.position;
      if (says && all) { game.scores[id] = (game.scores[id] || 0) + 1; FP.FX.word(pos, '+1', '#5cc44a', 1); }
      else if (says) FP.FX.word(pos, orders.includes('freeze') ? 'You moved!' : 'Too slow!', '#ff9a3c', 1);
      else if (any) { game.scores[id] = (game.scores[id] || 0) - 1; FP.FX.word(pos, 'TRICKED! -1', '#ff5a5f', 1.2); c.expression = 'oh'; c.exprTimer = 1; }
    }
    FP.Audio.play(says ? 'coin' : 'beep');
  }

  function update(dt, chars, game, roundOver) {
    const t = performance.now() / 1000;
    if (host) host.rotation.y = Math.sin(t * 1.5) * 0.25;
    if (dt > 0 && !roundOver) {
      timer -= dt;
      if (phase === 'order') {
        for (const c of chars) {
          const h = c.hands || [false, false];
          if (c.grabHeld > 0.05) {
            if (h[0] && h[1]) mark(c, 'grab');
            else if (h[1]) mark(c, 'left');
            else if (h[0]) mark(c, 'right');
          }
          if (c.grab.some((g) => g && g.victim)) mark(c, 'hug');
          const v = c.parts.torso.velocity, sp = Math.hypot(v.x, v.z);
          if (timer < windowLen - 0.35 && sp > 1.4) moved.set(c, true); // a little time to stop first
          if (sp > 3) { ran.set(c, (ran.get(c) || 0) + dt); if (ran.get(c) > 0.9) mark(c, 'run'); }
          // spinning: add up how much you turned
          const ly = lastYaw.get(c);
          if (ly !== undefined) {
            let d = c.yaw - ly;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            turn.set(c, (turn.get(c) || 0) + Math.abs(d));
            if (turn.get(c) > Math.PI * 1.6) mark(c, 'spin');
          }
          lastYaw.set(c, c.yaw);
        }
        if (timer <= 0) { judge(chars, game); phase = 'wait'; timer = Math.max(0.6, 1.2 - count * 0.03); orders = []; }
      } else if (phase === 'wait' && timer <= 0) {
        if (count >= TOTAL) phase = 'done'; else nextOrder(chars);
      }
      respawn.update(chars, dt, -5);
    }
    if (sign) sign.material.color.setHex(phase === 'order' ? (says ? 0x5cc44a : 0xff9a3c) : 0xffffff);
    if (roundOver || dt === 0) return null;
    if (phase === 'done') {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `${w[0].name} listens the best!` : "It's a tie!" };
    }
    return null;
  }

  // bot brain: do what Floppy says (after a moment), sometimes fall for the trick
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain;
    if (phase !== 'order') { b.sOrder = null; b.wander = (b.wander || 0) + dt * 0.3; input.x = Math.sin(b.wander + c.index) * 0.3; input.z = 0; return true; }
    if (b.sOrder !== count) {
      b.sOrder = count;
      const fooled = ({ easy: 0.4, normal: 0.22, hard: 0.08 }[c.botSkill] || 0.22) * (trick ? 1.6 : 1) + count * 0.006;
      b.sAct = says ? Math.random() > fooled * 0.4 : Math.random() < fooled;
      b.sAt = 0.35 + Math.random() * 0.7;
      b.sT = 0; b.sDone = {};
    }
    b.sT += dt;
    input.x = 0; input.z = 0;
    if (!b.sAct || b.sT < b.sAt) return true;
    for (const o of orders) {
      if (o === 'jump' && c.grounded && !b.sDone.jump) { input.jumpPressed = true; b.sDone.jump = 1; }
      if (o === 'punch' && !b.sDone.punch) { input.punchPressed = true; b.sDone.punch = 1; }
      if (o === 'grab') input.grab = true;
      if (o === 'left') { input.grabL = true; input.grabR = false; }
      if (o === 'right') { input.grabR = true; input.grabL = false; }
      if (['wave', 'dance', 'cheer', 'nose'].includes(o) && !b.sDone[o]) { input.emote = { wave: 1, dance: 2, cheer: 3, nose: 4 }[o]; b.sDone[o] = 1; }
      if (o === 'spin') { const a = b.sT * 7 + c.index; input.x = Math.cos(a); input.z = Math.sin(a); }
      if (o === 'run') { const a = b.sT * 1.5 + c.index * 2; input.x = Math.cos(a); input.z = Math.sin(a); }
      if (o === 'hug') {
        const f = FP.Kit.nearest(c, chars.filter((x) => x !== c).map((x) => ({ x: x.parts.torso.position.x, z: x.parts.torso.position.z })));
        if (f) { tools.steer(c, f.item.x, f.item.z, input); if (f.d < 1.5) input.grab = true; }
      }
      if (o === 'freeze' && !says) input.x = 0.8; // wiggles when it isn't needed
    }
    return true;
  }

  function hud() {
    const left = Math.max(0, TOTAL - count);
    if (phase === 'order') return `${says ? '<b>Floppy says</b>' : trick ? `<b>${trick.replace(': ', '')}</b>...?` : 'Floppy did <b>NOT</b> say it...'} &nbsp; Order ${count} of ${TOTAL}`;
    return `Listen to Floppy! Orders left: ${left}${count >= 12 ? ' &nbsp; (super fast now!)' : ''}`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><ellipse cx="60" cy="70" rx="52" ry="8" fill="#9bd46e"/><ellipse cx="36" cy="42" rx="12" ry="16" fill="#a77bff" stroke="#2a2140" stroke-width="2"/><circle cx="36" cy="22" r="10" fill="#a77bff" stroke="#2a2140" stroke-width="2"/><path d="M46 30l14-8v20z" fill="#ffcf33" stroke="#2a2140" stroke-width="2" stroke-linejoin="round"/><rect x="64" y="10" width="48" height="22" rx="5" fill="#5cc44a" stroke="#2a2140" stroke-width="2"/><text x="88" y="26" font-size="12" font-weight="900" text-anchor="middle" fill="#fff">JUMP!</text><ellipse cx="84" cy="56" rx="6" ry="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="84" cy="45" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><path d="M78 64l-3 4M90 64l3 4" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'simon', name: 'Floppy Says', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 3, song: 'circus', minZoom: 14, art: ART,
    desc: 'Jump, wave, dance, touch your nose, spin, hug... but only if it starts with "Floppy says"! It gets faster and trickier.',
    build, spawn, update, botThink, hud,
    focus: (chars) => chars.map(FP.Ragdoll.center).concat([new THREE.Vector3(0, 2.5, -5)]), // keep the announcer in view
    scoreLabel: (s) => `${s}`,
    netState: () => ({ o: orders, s: says ? 1 : 0, k: trick, p: phase, n: count }),
    applyNetState: (st) => { orders = st.o || []; says = !!st.s; trick = st.k || ''; phase = st.p; count = st.n; },
    visual: () => { if (host) host.rotation.y = Math.sin(performance.now() / 1000 * 1.5) * 0.25; if (sign) sign.material.color.setHex(phase === 'order' ? (says ? 0x5cc44a : 0xff9a3c) : 0xffffff); },
  };
  return self;
})();
