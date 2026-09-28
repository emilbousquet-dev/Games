// ============================================================
//  FLOPPY PARTY — TUTORIAL (learn the moves on a practice dummy)
//  Step by step: walk, jump, punch the dummy, knock it out,
//  grab it, throw it, and show off with an emote. Each step
//  shows the right buttons for your keyboard, controller or
//  touch screen. Nobody can lose: fall off and you pop back.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.tutorial = (function () {
  let self = null, step = 0, prog = 0, walked = 0, pause = 0, doneT = 0, respawn = null, lastPos = null;

  // which buttons to show, for whatever the player uses
  function keysFor(src) {
    const k = src && src.kind;
    if (k === 'pad') return { move: 'the left stick', jump: '<kbd>A</kbd>', punch: '<kbd>X</kbd>', grab: 'hold <kbd>LB</kbd> + <kbd>RB</kbd>', emote: '<kbd>Y</kbd>' };
    if (k === 'touch') return { move: 'the joystick', jump: 'the <b>Jump</b> button', punch: 'the <b>Punch</b> button', grab: 'hold the <b>Grab</b> button', emote: 'the <b>Emote</b> button' };
    // the keyboard: your own keys from Settings > Controls
    const m = k === 'keys' && src.map === 1 ? 1 : 0, K = (a) => FP.Input.kbd(m, a);
    return { move: FP.Input.label(m, 'move') === 'Arrows' ? 'the arrow keys' : K('move'), jump: K('jump'), punch: K('punch'), grab: `hold ${K('grab')}`, emote: m ? '<kbd>8</kbd> <kbd>9</kbd> or <kbd>0</kbd>' : '<kbd>1</kbd> <kbd>2</kbd> or <kbd>3</kbd>' };
  }
  const STEPS = [
    { id: 'move', need: 8, title: 'Walk around', how: (k) => `Use ${k.move}` },
    { id: 'jump', need: 3, title: 'Jump 3 times', how: (k) => `Press ${k.jump}` },
    { id: 'punch', need: 3, title: 'Punch the dummy 3 times', how: (k) => `Walk up to it and press ${k.punch}` },
    { id: 'ko', need: 1, title: 'Knock the dummy out', how: (k) => `Punch 3 times really fast: ${k.punch} ${k.punch} ${k.punch}` },
    { id: 'grab', need: 1, title: 'Grab the dummy', how: (k) => `Walk up to it and ${k.grab}` },
    { id: 'throw', need: 1, title: 'Throw the dummy', how: (k) => `${k.grab[0].toUpperCase() + k.grab.slice(1)}, walk, then let go` },
    { id: 'emote', need: 1, title: 'Show off with an emote', how: (k) => `Press ${k.emote}` },
  ];

  const active = () => FP.Game && FP.Game.mode === self && FP.Game.state === 'play' && pause <= 0 && step < STEPS.length;
  const isHuman = (c) => c && c.player && c.player.source && c.player.source.kind !== 'bot';
  const isDummy = (c) => c && c.player && c.player.source && c.player.source.kind === 'bot';
  function count(id, n = 1) {
    if (!active() || STEPS[step].id !== id) return;
    prog += n;
    if (prog < STEPS[step].need) return;
    // step done!
    const me = FP.Game.chars.find(isHuman);
    if (me) FP.FX.word(me.parts.head.position, ['NICE!', 'GREAT!', 'AWESOME!', 'SUPER!'][step % 4], '#5cc44a', 1.3);
    FP.Audio.play('ding');
    step++; prog = 0; pause = 0.9;
    if (step >= STEPS.length) { doneT = 1.6; FP.Audio.play('win'); }
  }
  FP.bus.on('jump', (c) => { if (isHuman(c)) count('jump'); });
  FP.bus.on('punchHit', (e) => { if (e && isHuman(e.by) && isDummy(e.victim)) count('punch'); });
  FP.bus.on('knockOut', (c) => { if (isDummy(c) && isHuman(c.lastHitBy)) count('ko'); });
  FP.bus.on('grab', (e) => { if (e && isHuman(e.by) && isDummy(e.victim)) count('grab'); });
  FP.bus.on('throw', (e) => { if (e && isHuman(e.by) && isDummy(e.who)) count('throw'); });
  FP.bus.on('emote', (c) => { if (isHuman(c)) count('emote'); });

  function build() {
    step = 0; prog = 0; walked = 0; pause = 0; doneT = 0; lastPos = null;
    const S = FP.Stage;
    S.island(0, -1, 0, 16, 2, 11);
    const gate = FP.Props.arch('TRAINING', 6, '#9b6bff'); gate.position.set(0, 0, -4.6); S.add(gate);
    for (const [x, z, s] of [[-7, -4, 1], [7, -4.2, 0.9], [-7.2, 4, 0.8], [7.1, 4.1, 1]]) { const t = FP.Look.tree(s); t.position.set(x, 0, z); S.add(t); }
    const flowerColors = [0xff5a5f, 0xffcf33, 0xffffff, 0x9b6bff, 0xff8fc8];
    for (let i = 0; i < 26; i++) {
      const f = FP.Look.flower(flowerColors[i % flowerColors.length]);
      f.position.set(-7.5 + ((i * 7.3) % 15), 0, -5 + ((i * 3.7) % 10));
      S.add(f);
    }
    respawn = FP.Kit.respawner((c) => (isDummy(c) ? { x: 0, y: 0.3, z: -1.5, yaw: 0 } : { x: 0, y: 0.3, z: 2.5, yaw: Math.PI }));
    FP.Camera.setAngle(0.62, 0.9);
  }

  // the player on the near side, the dummy in the middle. The bot becomes the practice dummy
  function spawn(i, n, p) {
    if (p && p.source && p.source.kind === 'bot') {
      Object.assign(p, { name: 'Dummy', hat: 'none', outfit: 'none', face: 'none', dance: 'none', trail: 'none' });
      return { x: 0, y: 0, z: -1.5, yaw: 0 };
    }
    return { x: (i - (n - 2) / 2) * 1.5, y: 0, z: 2.5, yaw: Math.PI };
  }

  // a red and white target painted on the dummy's tummy
  function control(c, input, dt) {
    if (isDummy(c) && !c.targetOn) {
      c.targetOn = true;
      [[0.3, 0xff5a5f], [0.2, 0xffffff], [0.1, 0xff5a5f]].forEach(([r, col], k) => {
        const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color: col }));
        disc.position.set(0, 0.02, 0.43 + k * 0.004);
        c.meshes.torso.add(disc);
      });
    }
    FP.Ragdoll.control(c, isDummy(c) ? { x: 0, z: 0 } : input || { x: 0, z: 0 }, dt);
  }
  // the dummy just stands there (and doesn't wriggle free)
  function botThink() { return true; }

  function update(dt, chars, game, roundOver) {
    if (roundOver || dt === 0) return null;
    if (respawn) respawn.update(chars, dt);
    for (const c of chars) c.alive = true; // nobody is ever out in the tutorial
    if (pause > 0) pause -= dt;
    // walking: count how far you went
    const me = chars.find(isHuman);
    if (me) {
      const p = me.parts.torso.position;
      if (lastPos && me.grounded) { const d = Math.hypot(p.x - lastPos.x, p.z - lastPos.z); if (d < 0.5) walked += d; }
      lastPos = { x: p.x, z: p.z };
      if (walked >= 1) { const n = Math.floor(walked); walked -= n; count('move', n); }
    }
    if (doneT > 0) {
      doneT -= dt;
      if (doneT <= 0) return { winners: me ? [me] : [], text: 'Tutorial complete!', sub: 'You are ready to party!' };
    }
    return null;
  }

  function hud() {
    const me = FP.Game.chars.find(isHuman);
    const keys = keysFor(me && me.player.source);
    const dots = STEPS.map((s, i) => `<i class="${i < step ? 'done' : i === step ? 'now' : ''}"></i>`).join('');
    if (step >= STEPS.length) return `<div class="tut"><div class="tut-dots">${dots}</div><b class="tut-title">All done! Great job!</b></div>`;
    const s = STEPS[step];
    const bar = s.need > 1 ? `<span class="tut-bar"><i style="width:${Math.round((prog / s.need) * 100)}%"></i></span>` : '';
    return `<div class="tut"><div class="tut-dots">${dots}</div><small>Step ${step + 1} of ${STEPS.length}</small><b class="tut-title">${s.title}</b><span class="tut-how">${s.how(keys)}</span>${bar}</div>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#e4d8ff"/><ellipse cx="60" cy="66" rx="46" ry="9" fill="#8fd46a"/><g stroke="#2a2140" stroke-width="2.4"><ellipse cx="80" cy="44" rx="11" ry="16" fill="#d9c7a7"/><circle cx="80" cy="24" r="8" fill="#d9c7a7"/><circle cx="80" cy="46" r="6" fill="#fff"/></g><circle cx="80" cy="46" r="3" fill="#ff5a5f"/><g stroke="#2a2140" stroke-width="2.4"><ellipse cx="40" cy="46" rx="10" ry="14" fill="#ff5a5f"/><circle cx="40" cy="28" r="8" fill="#ff5a5f"/><path d="M50 42l14 2" stroke-linecap="round"/></g></svg>';

  self = {
    id: 'tutorial', name: 'Tutorial', roundsToWin: 1, single: true, minTotal: 1, noIntro: true, noPills: true, hudClass: 'tut-hud', song: 'menu', minZoom: 11, art: ART,
    desc: 'Learn to walk, jump, punch, grab and throw on a practice dummy.',
    build, spawn, control, update, hud, botThink,
  };
  return self;
})();
