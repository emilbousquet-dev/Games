// ============================================================
//  SIGMA HOVER GP — THE CHARACTERS
//  Every racer is built from simple shapes with a skeleton
//  (hips, body, head, arms, legs) so they can move, lean,
//  wave, celebrate, cry... Faces blink and change mood!
//
//  Want a new racer? Copy one of the entries in LIST below,
//  change the colors, and add it to the list.
// ============================================================
window.HG = window.HG || {};

HG.Chars = (function () {
  const U = HG.U, M = HG.M;
  const D = { L1: 0.2, L2: 0.19, L3: 0.21, L4: 0.2 };   // arm and leg bone lengths

  // ------------------------------------------------------------
  //  THE RACERS
  //  weight: light / medium / heavy (changes the stats)
  // ------------------------------------------------------------
  const LIST = [
    { id: 'sigma', name: 'SIGMA', weight: 'medium', kart: '#ffcc1a', glow: 0xffcc1a, voice: 1.0,
      skin: '#f0c49a', top: '#1a1a20', bottom: '#2a2a32', shoes: '#f4f4f4', hands: '#1a1a20', eyes: '#4a3020', brows: '#1a1208',
      extra: sigmaExtra, desc: 'The coolest racer. Never smiles too much.' },
    { id: 'kisse', name: 'KISSE KAT', weight: 'light', kart: '#ffd23a', glow: 0xffe060, voice: 1.5,
      skin: '#ffcf3a', top: '#ffcf3a', bottom: '#ffcf3a', shoes: '#fff0c0', hands: '#fff0c0', eyes: '#2ec860', brows: null, mouth: 'cat', catEyes: true,
      headR: 0.31, extra: kisseExtra, desc: 'A super fluffy yellow cat. Purrs when she wins!' },
    { id: 'plut', name: 'LILLE PLUT', weight: 'light', kart: '#7ac8ff', glow: 0x9ad8ff, voice: 1.8, scale: 0.86,
      skin: '#ffd6c0', top: '#9ad4ff', bottom: '#ffffff', shoes: '#ffd6c0', hands: '#ffd6c0', eyes: '#3a8aff', brows: '#c89a70',
      headR: 0.35, bodyW: 1.1, extra: plutExtra, baby: true, defaultBody: 'buggy', desc: 'An annoying baby. Blows raspberries at everyone!' },
    { id: 'giga', name: 'GIGA', weight: 'heavy', kart: '#e8262a', glow: 0xff4040, voice: 0.7, scale: 1.12,
      skin: '#e0a878', top: '#e8262a', bottom: '#2a3a6a', shoes: '#202020', hands: '#e0a878', eyes: '#3a6aa0', brows: '#2a1a10',
      bodyW: 1.45, limb: 1.35, headR: 0.29, extra: gigaExtra, desc: 'Huge muscles. Huge jaw. Huge bumps.' },
    { id: 'bolt', name: 'BOLT', weight: 'medium', kart: '#2ad8ff', glow: 0x2ad8ff, voice: 1.2,
      skin: '#9aa4b0', top: '#5a6470', bottom: '#4a525c', shoes: '#2a3038', hands: '#2ad8ff', eyes: null, brows: null, mouth: null,
      robot: true, extra: boltExtra, desc: 'A speedy robot with a screen for a face.' },
    { id: 'kage', name: 'KAGE', weight: 'light', kart: '#3a3a5a', glow: 0xff3030, voice: 1.1,
      skin: '#f0c49a', top: '#22223a', bottom: '#22223a', shoes: '#14141e', hands: '#22223a', eyes: '#202020', brows: '#101010', mouth: null,
      headColor: '#22223a', extra: kageExtra, desc: 'A silent ninja. Super good at drifting.' },
    { id: 'zorp', name: 'ZORP', weight: 'medium', kart: '#7ae05a', glow: 0x9aff6a, voice: 1.4,
      skin: '#7ae05a', top: '#c0c8d0', bottom: '#a0a8b0', shoes: '#606870', hands: '#7ae05a', eyes: 'alien', brows: null, mouth: 'o',
      headScale: [1, 1.18, 1], extra: zorpExtra, desc: 'From planet Zorg. Has three eyes!' },
    { id: 'blaze', name: 'BLAZE', weight: 'heavy', kart: '#ff6a2a', glow: 0xff8a30, voice: 0.6, scale: 1.08,
      skin: '#ff6a2a', top: '#ff6a2a', bottom: '#ff6a2a', shoes: '#c84a1a', hands: '#ff8a4a', eyes: '#ffcc00', brows: '#8a2a0a', mouth: 'grin',
      bodyW: 1.25, extra: blazeExtra, desc: 'A baby dragon who breathes little fireballs.' },
    { id: 'cosmo', name: 'COSMO', weight: 'medium', kart: '#ffffff', glow: 0x80c0ff, voice: 1.0,
      skin: '#f0c8a8', top: '#f0f0f4', bottom: '#f0f0f4', shoes: '#606870', hands: '#f0f0f4', eyes: '#2a5aa0', brows: '#5a3a20',
      extra: cosmoExtra, desc: 'An astronaut. Loves low gravity.' },
    { id: 'bones', name: 'BONES', weight: 'light', kart: '#a040ff', glow: 0xa040ff, voice: 0.9,
      skin: '#ece4d0', top: '#ece4d0', bottom: '#ece4d0', shoes: '#ece4d0', hands: '#ece4d0', eyes: 'socket', brows: null, mouth: 'teeth',
      limb: 0.55, bodyW: 0.7, skeleton: true, extra: bonesExtra, desc: 'Lives at the Monster Hotel. Very light!' },
    { id: 'hex', name: 'HEX', weight: 'medium', kart: '#8a3aff', glow: 0xb060ff, voice: 1.3,
      skin: '#b8e8a0', top: '#5a2a8a', bottom: '#5a2a8a', shoes: '#2a1a3a', hands: '#b8e8a0', eyes: '#ff4ad8', brows: '#4a1a6a',
      extra: hexExtra, desc: 'A witch. Her hat is taller than she is.' },
    { id: 'finn', name: 'FINN', weight: 'heavy', kart: '#3a7ad0', glow: 0x40a0ff, voice: 0.75, scale: 1.06,
      skin: '#5a8ac8', top: '#5a8ac8', bottom: '#5a8ac8', shoes: '#4a7ab8', hands: '#5a8ac8', eyes: '#101010', brows: '#2a4a7a', mouth: 'shark',
      bodyW: 1.2, headScale: [1.05, 0.95, 1.15], extra: finnExtra, desc: 'A shark. Big teeth, big smile.' },
    { id: 'wisp', name: 'WISP', weight: 'light', kart: '#d0f0ff', glow: 0xa0f0ff, voice: 1.6,
      skin: '#f4fbff', top: '#f4fbff', bottom: '#f4fbff', shoes: '#f4fbff', hands: '#f4fbff', eyes: '#202040', brows: null, mouth: 'o',
      ghost: true, extra: wispExtra, desc: 'A friendly ghost. Floats instead of sitting.' },
    { id: 'rusty', name: 'RUSTY', weight: 'medium', kart: '#ff8a20', glow: 0xffa040, voice: 1.15, unlock: 'cup',
      skin: '#ff8a30', top: '#3a5a8a', bottom: '#3a5a8a', shoes: '#5a3a20', hands: '#fff4e0', eyes: '#2a8a30', brows: '#a04a10', mouth: 'smile',
      extra: rustyExtra, desc: 'A fox mechanic. Can fix anything!' },
    { id: 'goldsigma', name: 'GOLD SIGMA', weight: 'heavy', kart: '#ffd84a', glow: 0xffd84a, voice: 0.95, unlock: 'gold',
      skin: '#ffcc33', top: '#ffcc33', bottom: '#ffcc33', shoes: '#ffcc33', hands: '#ffcc33', eyes: '#4a3020', brows: '#8a6a00', gold: true,
      extra: sigmaExtra, desc: 'Win a gold trophy on 150cc to unlock. Pure gold aura.' },
  ];
  const byId = {};
  LIST.forEach((c) => (byId[c.id] = c));

  // ------------------------------------------------------------
  //  BUILD A CHARACTER
  // ------------------------------------------------------------
  function build(id) {
    const C = byId[id] || LIST[0];
    const gold = !!C.gold;
    const mk = (col, o = {}) => (gold ? M.mat('#ffcc33', { rough: 0.22, metal: 0.95 }) : M.mat(col, o));
    const mats = {
      skin: mk(C.skin, { rough: 0.6 }), top: mk(C.top, { rough: 0.7 }), bottom: mk(C.bottom, { rough: 0.75 }),
      shoes: mk(C.shoes, { rough: 0.5 }), hands: mk(C.hands, { rough: 0.6 }), head: mk(C.headColor || C.skin, { rough: 0.6 }),
      white: M.mat('#ffffff', { rough: 0.25 }), black: M.mat('#101014', { rough: 0.3 }), dark: M.mat('#3a0a10', { rough: 0.5 }),
    };
    if (C.ghost) for (const k of ['skin', 'top', 'bottom', 'hands', 'head']) { mats[k] = M.mat('#f4fbff', { rough: 0.4, opacity: 0.9, glow: 0.25, glowColor: '#a0e0ff' }); }
    const limb = C.limb || 1, bw = C.bodyW || 1, R = C.headR || 0.3;
    const rig = { def: C, mats, R, root: new THREE.Group(), face: {}, extras: [], t: Math.random() * 10, blinkT: 2, expr: 'normal', exprT: 0 };
    const root = rig.root;
    root.scale.setScalar(C.scale || 1);
    // hips
    const hips = M.group(root, 0, 0, 0);
    rig.hips = hips;
    if (!C.ghost && !C.skeleton) M.mesh(M.sphere(0.16), mats.bottom, 0, 0.02, 0, hips, { s: [1.05 * bw, 0.8, 0.95] });
    // body
    const torso = M.group(hips, 0, 0.04, 0);
    rig.torso = torso;
    if (C.skeleton) {
      // spine and ribs
      M.mesh(M.cyl(0.035, 0.035, 0.4), mats.skin, 0, 0.2, -0.05, torso);
      for (let i = 0; i < 4; i++) M.mesh(M.torus(0.13 - i * 0.012, 0.022, Math.PI * 1.6, 6, 16), mats.skin, 0, 0.14 + i * 0.065, 0, torso, { r: [Math.PI / 2, 0, Math.PI * 0.7] });
      M.mesh(M.sphere(0.1), mats.skin, 0, 0.0, 0, torso, { s: [1.3, 0.6, 0.9] });
    } else if (!C.ghost) {
      const body = M.lathe('torso' + bw, [[0, 0], [0.15 * bw, 0.01], [0.19 * bw, 0.1], [0.2 * bw, 0.24], [0.18 * bw, 0.34], [0.1 * bw, 0.41], [0, 0.42]], 24);
      rig.body = M.mesh(body, mats.top, 0, 0, 0, torso, { s: [1, 1, 0.82] });
    }
    // neck & head
    const neck = M.group(torso, 0, 0.4, 0);
    const head = M.group(neck, 0, R * 0.85, 0.02);
    rig.neck = neck; rig.head = head;
    const hs = C.headScale || [1, 1, 1];
    if (!C.robot && !C.ghost) rig.skull = M.mesh(M.sphere(R, 32, 24), mats.head, 0, 0, 0, head, { s: hs });
    // shoulders, arms, hands
    rig.arms = [];
    for (const side of [1, -1]) {
      const sh = M.group(torso, side * 0.2 * bw, 0.33, 0);
      const up = M.group(sh, 0, 0, 0);
      const r1 = 0.055 * limb;
      M.mesh(M.capsule(r1, D.L1 - r1), C.skeleton ? mats.skin : mats.top, 0, -D.L1 / 2, 0, up);
      const lo = M.group(up, 0, -D.L1, 0);
      M.mesh(M.capsule(r1 * 0.92, D.L2 - r1), C.skeleton ? mats.skin : (C.robot ? mats.top : mats.skin), 0, -D.L2 / 2, 0, lo);
      const hand = M.mesh(M.sphere(0.072 * Math.max(1, limb * 0.85)), mats.hands, 0, -D.L2 - 0.02, 0, lo, { s: [1, 1.05, 1.1] });
      // a thumb makes hands look like hands
      M.mesh(M.sphere(0.03), mats.hands, side * 0.045, -D.L2 - 0.01, 0.04, lo);
      if (C.robot) { M.mesh(M.sphere(0.06), mats.top, 0, 0, 0, up); M.mesh(M.sphere(0.05), mats.top, 0, -D.L1, 0, up); }
      rig.arms.push({ side, sh, up, lo, hand });
    }
    // legs
    rig.legs = [];
    if (!C.ghost) {
      for (const side of [1, -1]) {
        const hp = M.group(hips, side * 0.09 * Math.max(1, bw * 0.85), -0.02, 0);
        const up = M.group(hp, 0, 0, 0);
        const r = 0.065 * limb;
        M.mesh(M.capsule(r, D.L3 - r), C.skeleton ? mats.skin : mats.bottom, 0, -D.L3 / 2, 0, up);
        const lo = M.group(up, 0, -D.L3, 0);
        M.mesh(M.capsule(r * 0.9, D.L4 - r), C.skeleton ? mats.skin : (C.baby ? mats.skin : mats.bottom), 0, -D.L4 / 2, 0, lo);
        const foot = M.group(lo, 0, -D.L4, 0);
        M.mesh(M.rbox(0.13 * Math.max(1, limb * 0.8), 0.09, 0.21, 0.04), mats.shoes, 0, -0.02, 0.05, foot);
        rig.legs.push({ side, hp, up, lo, foot });
      }
    }
    // face
    buildFace(rig, C);
    if (C.extra) C.extra(rig, C, mats);
    root.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    setFace(rig, 'normal');
    return rig;
  }

  // ---------- eyes, eyebrows, mouth ----------
  function buildFace(rig, C) {
    const R = rig.R, head = rig.head, f = rig.face;
    const hs = C.headScale || [1, 1, 1];
    f.eyes = []; f.brows = [];
    const front = R * hs[2];
    if (C.eyes === 'socket') {
      for (const side of [1, -1]) {
        const g = M.group(head, side * R * 0.36, R * 0.05, front * 0.86);
        M.mesh(M.sphere(R * 0.24), rig.mats.black, 0, 0, 0, g, { s: [1, 1.15, 0.45] });
        const glowE = M.mesh(M.sphere(R * 0.07), M.glowMat(0x80ff60, 2), 0, 0, R * 0.08, g);
        f.eyes.push({ g, pupil: glowE });
      }
    } else if (C.eyes === 'alien') {
      [[0.38, 0.05, 1], [-0.38, 0.05, 1], [0, 0.4, 0.8]].forEach(([x, y, s]) => {
        const g = M.group(head, x * R, y * R * hs[1], front * 0.82);
        M.mesh(M.sphere(R * 0.26 * s), rig.mats.black, 0, 0, 0, g, { s: [0.8, 1.15, 0.45], r: [0, 0, -x * 0.9] });
        M.mesh(M.sphere(R * 0.06 * s), rig.mats.white, R * 0.06, R * 0.08, R * 0.1, g);
        g.rotation.y = x * 0.6;
        f.eyes.push({ g });
      });
    } else if (C.eyes) {
      const ew = R * 0.25, ey = R * 0.08, ex = R * 0.36;
      for (const side of [1, -1]) {
        const g = M.group(head, side * ex, ey, front * 0.84);
        g.rotation.y = side * 0.32;
        const white = M.mesh(M.sphere(ew, 20, 14), rig.mats.white, 0, 0, 0, g, { s: [0.85, 1.15, 0.5] });
        const irisMat = M.mat(C.eyes, { rough: 0.2 });
        const iris = M.mesh(M.sphere(ew * 0.62, 18, 12), irisMat, 0, -ew * 0.08, ew * 0.3, g, { s: [C.catEyes ? 0.9 : 1, 1.15, 0.45] });
        const pupil = M.mesh(M.sphere(ew * 0.34, 14, 10), rig.mats.black, 0, -ew * 0.08, ew * 0.42, g, { s: [C.catEyes ? 0.35 : 1, 1.25, 0.4] });
        M.mesh(M.sphere(ew * 0.14, 10, 8), M.glowMat(0xffffff, 1.2), ew * 0.22, ew * 0.25, ew * 0.48, g);
        // happy eyes: ^ ^
        const happy = M.mesh(M.torus(ew * 0.55, ew * 0.13, Math.PI, 6, 14), rig.mats.black, 0, -ew * 0.1, ew * 0.38, g);
        happy.visible = false;
        f.eyes.push({ g, white, iris, pupil, happy, side });
      }
    }
    if (C.brows) {
      const bm = M.mat(C.brows, { rough: 0.8 });
      for (const side of [1, -1]) {
        const b = M.mesh(M.rbox(R * 0.34, R * 0.09, R * 0.08, R * 0.03), bm, side * R * 0.36, R * 0.42, front * 0.86, rig.head);
        b.rotation.y = side * 0.3;
        b.userData.side = side;
        f.brows.push(b);
      }
    }
    const mouthKind = C.mouth === undefined ? 'smile' : C.mouth;
    if (mouthKind) {
      const patch = new THREE.SphereGeometry(R * 1.006, 14, 10, Math.PI / 2 - 0.5, 1.0, Math.PI / 2 + 0.05, 0.52);
      const mm = new THREE.MeshStandardMaterial({ map: M.mouth(mouthKind), transparent: true, alphaTest: 0.25, roughness: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
      f.mouth = M.mesh(patch, mm, 0, 0, 0, rig.head, { s: hs, shadow: false });
      f.mouthBase = mouthKind;
    }
  }

  // moods: normal, happy, ouch, angry, sad, cheeky (tongue), cry, blink
  const MOUTHS = {
    human: { normal: 'smile', happy: 'grin', ouch: 'o', angry: 'grit', sad: 'frown', cheeky: 'tongue', cry: 'cry', yell: 'open' },
    cat: { normal: 'cat', happy: 'catopen', ouch: 'o', angry: 'catopen', sad: 'frown', cheeky: 'tongue', cry: 'cry', yell: 'catopen' },
    shark: { normal: 'shark', happy: 'shark', ouch: 'o', angry: 'shark', sad: 'frown', cheeky: 'shark', cry: 'open', yell: 'shark' },
    teeth: { normal: 'teeth', happy: 'teeth', ouch: 'teeth', angry: 'teeth', sad: 'teeth', cheeky: 'teeth', cry: 'teeth', yell: 'teeth' },
    o: { normal: 'o', happy: 'grin', ouch: 'o', angry: 'grit', sad: 'frown', cheeky: 'tongue', cry: 'cry', yell: 'open' },
    grin: { normal: 'grin', happy: 'grin', ouch: 'o', angry: 'grit', sad: 'frown', cheeky: 'tongue', cry: 'cry', yell: 'open' },
  };
  function setFace(rig, expr) {
    rig.expr = expr;
    const f = rig.face, C = rig.def;
    if (f.mouth) {
      const fam = C.mouth === 'cat' ? 'cat' : C.mouth === 'shark' ? 'shark' : C.mouth === 'teeth' ? 'teeth' : C.mouth === 'o' ? 'o' : C.mouth === 'grin' ? 'grin' : 'human';
      let kind = MOUTHS[fam][expr] || MOUTHS[fam].normal;
      if (C.id === 'sigma' && expr === 'normal') kind = 'smile';
      f.mouth.material.map = M.mouth(kind);
      f.mouth.material.needsUpdate = true;
    }
    for (const e of f.eyes) {
      if (!e.white) continue;
      const happy = expr === 'happy' || expr === 'cheeky';
      e.happy.visible = happy; e.white.visible = !happy; e.iris.visible = !happy; e.pupil.visible = !happy;
      if (e.g.children[3]) e.g.children[3].visible = !happy;
      e.g.scale.y = expr === 'ouch' || expr === 'cry' ? 0.18 : expr === 'angry' ? 0.75 : 1;
    }
    for (const b of f.brows) {
      const s = b.userData.side;
      const z = { angry: -0.5, ouch: -0.35, sad: 0.45, cry: 0.5, happy: 0.1, cheeky: 0.25, yell: -0.3 }[expr] || 0;
      b.rotation.z = z * s;
      b.position.y = rig.R * (expr === 'happy' || expr === 'sad' ? 0.47 : 0.42);
    }
    if (rig.onFace) rig.onFace(expr);
  }

  // ------------------------------------------------------------
  //  ANIMATION (called every frame by the racer)
  //  st = { steer, drift, lean, boost, air, hit, trick, trickType, look, celebrate, sad, throwT, idle, walk }
  // ------------------------------------------------------------
  function animate(rig, dt, st) {
    rig.t += dt;
    const t = rig.t;
    // blinking
    rig.blinkT -= dt;
    let blink = 1;
    if (rig.blinkT < 0) { blink = 0.1; if (rig.blinkT < -0.12) rig.blinkT = U.rand(1.8, 4.5); }
    // choose the mood
    let expr = 'normal';
    if (st.hit) expr = rig.def.baby ? 'cry' : 'ouch';
    else if (st.sad) expr = rig.def.baby ? 'cry' : 'sad';
    else if (st.celebrate || st.trick > 0) expr = 'happy';
    else if (st.cheeky) expr = 'cheeky';
    else if (st.drift > 1 || st.boost) expr = rig.def.baby ? 'happy' : 'angry';
    else if (st.mood) expr = st.mood;
    if (expr !== rig.expr) setFace(rig, expr);
    if (expr === 'normal' || expr === 'angry') for (const e of rig.face.eyes) if (e.white) e.g.scale.y = (expr === 'angry' ? 0.75 : 1) * blink;
    // head: look into turns, look back, wobble when hit
    const head = rig.neck;
    let hy = (st.steer || 0) * -0.35 + (st.look || 0) * 2.2;
    let hx = 0, hz = 0;
    if (st.hit) { hz = Math.sin(t * 14) * 0.35; hx = 0.2; }
    if (st.celebrate) { hx = -0.25 + Math.sin(t * 6) * 0.08; hz = Math.sin(t * 3) * 0.2; }
    if (st.sad) { hx = 0.45; }
    if (st.idle) { hy += Math.sin(t * 0.7) * 0.35; hx += Math.sin(t * 1.3) * 0.06; }
    head.rotation.y = U.damp(head.rotation.y, hy, 8, dt);
    head.rotation.x = U.damp(head.rotation.x, hx, 8, dt);
    head.rotation.z = U.damp(head.rotation.z, hz, 8, dt);
    // body: lean into turns, crouch when boosting
    const torso = rig.torso;
    const lean = (st.lean || 0);
    const crouch = st.boost ? 0.22 : st.air ? -0.1 : 0;
    torso.rotation.z = U.damp(torso.rotation.z, lean * 0.55, 8, dt);
    torso.rotation.x = U.damp(torso.rotation.x, (st.pitchBase || 0) + crouch + (st.celebrate ? -0.15 : 0) + (st.sad ? 0.3 : 0), 6, dt);
    torso.rotation.y = U.damp(torso.rotation.y, (st.look || 0) * 0.5 + (st.throwT > 0 ? Math.sin(st.throwT * 10) * 0.4 : 0), 8, dt);
    // breathing and bouncing
    const breathe = Math.sin(t * 2.2) * 0.012;
    rig.hips.position.y = breathe + (st.celebrate ? Math.abs(Math.sin(t * 6)) * 0.06 : 0);
    // extra wiggly bits (tails, ears, ribbons...)
    for (const x of rig.extras) x(dt, st, t);
  }

  // ------------------------------------------------------------
  //  EXTRA DECORATIONS FOR EACH CHARACTER
  // ------------------------------------------------------------
  function hairMat(c) { return M.mat(c, { rough: 0.7 }); }

  function sigmaExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    const hm = C.gold ? mats.skin : hairMat('#1a140e');
    // swept-back hair
    M.mesh(M.sphere(R * 1.07), hm, 0, R * 0.16, -R * 0.1, h, { s: [1.02, 0.88, 1.0] });
    for (let i = 0; i < 5; i++) M.mesh(M.cone(R * 0.22, R * 0.7, 8), hm, (i - 2) * R * 0.22, R * 0.62, R * 0.25 - Math.abs(i - 2) * R * 0.05, h, { r: [-1.2, 0, (i - 2) * -0.15] });
    // sunglasses (gold rim)
    const lens = M.mat('#08080c', { rough: 0.05, metal: 0.6 });
    const rim = M.mat('#ffcc1a', { rough: 0.25, metal: 0.9 });
    for (const side of [1, -1]) {
      M.mesh(M.rbox(R * 0.6, R * 0.34, R * 0.08, R * 0.08), lens, side * R * 0.36, R * 0.1, R * 0.93, h, { r: [0, side * 0.32, 0] });
      M.mesh(M.box(R * 0.05, R * 0.04, R * 0.6), rim, side * R * 0.68, R * 0.18, R * 0.55, h, { r: [0, side * 0.5, 0] });
    }
    M.mesh(M.box(R * 0.3, R * 0.05, R * 0.05), rim, 0, R * 0.2, R * 0.98, h);
    for (const e of rig.face.eyes) e.g.visible = false;
    // gold chain with a Σ
    M.mesh(M.torus(0.13, 0.016, Math.PI * 2, 8, 24), rim, 0, 0.36, 0.05, rig.torso, { r: [1.25, 0, 0] });
    const sig = M.mesh(M.cyl(0.055, 0.055, 0.02, 20), rim, 0, 0.22, 0.18, rig.torso, { r: [Math.PI / 2 - 0.15, 0, 0] });
    const st = new THREE.MeshBasicMaterial({ map: HG.Tex.sign('Σ', '#ffcc1a', '#3a2a00', 64, 64), toneMapped: false });
    M.mesh(new THREE.CircleGeometry(0.05, 20), st, 0, 0.225, 0.192, rig.torso, { r: [-0.15, 0, 0] });
    // jacket gold stripe
    if (!C.gold && rig.body) M.mesh(M.box(0.03, 0.36, 0.02), rim, 0, 0.18, 0.165, rig.torso);
  }

  function kisseExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    const fur = mats.skin, cream = M.mat('#fff0c0', { rough: 0.9 }), pink = M.mat('#ff9ab8', { rough: 0.6 });
    // fluffy head: lots of little fur puffs around the head
    const rnd = U.rng(7);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2, b = rnd() * Math.PI * 0.75;
      const x = Math.sin(b) * Math.cos(a), y = Math.cos(b), z = Math.sin(b) * Math.sin(a);
      if (z > 0.55 && y < 0.6) continue;     // keep the face clear
      M.mesh(M.sphere(R * U.lerp(0.22, 0.32, rnd()), 12, 10), fur, x * R * 0.9, y * R * 0.9, z * R * 0.85, h);
    }
    // fluffy cheeks
    for (const side of [1, -1]) {
      for (let k = 0; k < 3; k++) M.mesh(M.cone(R * 0.16, R * 0.45, 8), fur, side * R * (0.92 + k * 0.04), -R * (0.15 + k * 0.12), R * 0.3, h, { r: [0, 0, side * (-1.3 - k * 0.25)] });
      // ears (pointy, pink inside)
      const ear = M.group(h, side * R * 0.62, R * 0.95, 0.02);
      ear.rotation.z = side * -0.4;
      M.mesh(M.cone(R * 0.42, R * 0.8, 3), fur, 0, 0, 0, ear, { s: [1, 1, 0.45] });
      M.mesh(M.cone(R * 0.28, R * 0.55, 3), pink, 0, -R * 0.06, R * 0.07, ear, { s: [1, 1, 0.3] });
      M.mesh(M.cone(R * 0.07, R * 0.3, 5), cream, 0, R * 0.42, 0, ear);
      ear.userData.side = side;
      rig['ear' + side] = ear;
      // whiskers
      for (let w = 0; w < 3; w++) {
        const wk = M.mesh(M.cyl(0.004, 0.004, R * 0.9, 4), M.mat('#ffffff'), side * R * 0.62, -R * (0.08 + w * 0.07), R * 0.88, h, { r: [0, 0, Math.PI / 2 + side * (w - 1) * 0.18], shadow: false });
        wk.rotation.y = side * -0.25;
      }
    }
    // a white muzzle and pink nose
    M.mesh(M.sphere(R * 0.32), cream, 0, -R * 0.2, R * 0.78, h, { s: [1.25, 0.8, 0.7] });
    M.mesh(M.sphere(R * 0.09), pink, 0, -R * 0.02, R * 1.0, h, { s: [1.3, 0.9, 0.8] });
    // fluffy chest
    for (let i = 0; i < 6; i++) M.mesh(M.sphere(0.07 + rnd() * 0.03, 10, 8), cream, (rnd() - 0.5) * 0.14, 0.2 + rnd() * 0.18, 0.13, rig.torso);
    // fluffy body fur
    for (let i = 0; i < 10; i++) { const a = rnd() * Math.PI * 2; M.mesh(M.sphere(0.07 + rnd() * 0.03, 10, 8), fur, Math.cos(a) * 0.17, 0.08 + rnd() * 0.3, Math.sin(a) * 0.14, rig.torso); }
    // the big fluffy tail
    const tail = M.group(rig.hips, 0, 0.0, -0.14);
    const segs = [];
    let parent = tail;
    for (let i = 0; i < 7; i++) {
      const s = M.group(parent, 0, i ? 0.09 : 0, 0);
      const r = 0.07 + Math.sin((i / 6) * Math.PI) * 0.06 + (i > 4 ? 0.02 : 0);
      M.mesh(M.sphere(r, 12, 10), i === 6 ? cream : fur, 0, 0.05, 0, s);
      segs.push(s); parent = s;
    }
    tail.rotation.x = -2.2;
    rig.extras.push((dt, st, t) => {
      segs.forEach((s, i) => {
        s.rotation.x = 0.18 + Math.sin(t * 2.4 - i * 0.6) * 0.06 + (st.boost ? 0.12 : 0);
        s.rotation.z = Math.sin(t * 1.8 - i * 0.5) * 0.18 + (st.steer || 0) * 0.1;
      });
      // ears twitch
      for (const side of [1, -1]) { const e = rig['ear' + side]; e.rotation.x = Math.max(0, Math.sin(t * 0.9 + side) * 8 - 7.4) * 0.6 + (st.hit ? 0.6 : 0); }
    });
  }

  function plutExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    const hair = hairMat('#d8a870');
    // the single curl of hair
    M.mesh(M.torus(R * 0.16, R * 0.045, Math.PI * 1.6, 6, 16), hair, 0, R * 1.05, R * 0.05, h, { r: [0, Math.PI / 2, 0] });
    M.mesh(M.sphere(R * 0.06), hair, 0, R * 0.95, R * 0.12, h);
    // rosy cheeks
    const blush = M.mat('#ff9aa8', { rough: 0.8, opacity: 0.75 });
    for (const side of [1, -1]) M.mesh(M.sphere(R * 0.14), blush, side * R * 0.55, -R * 0.22, R * 0.76, h, { s: [1, 0.6, 0.3], shadow: false });
    // little ears
    for (const side of [1, -1]) M.mesh(M.sphere(R * 0.17), mats.skin, side * R * 0.98, 0, 0, h, { s: [0.5, 1, 0.8] });
    // the pacifier
    const pac = M.group(h, 0, -R * 0.3, R * 0.98);
    M.mesh(M.cyl(R * 0.26, R * 0.26, R * 0.05, 18), M.mat('#ff7ab0', { rough: 0.3 }), 0, 0, 0, pac, { r: [Math.PI / 2, 0, 0] });
    M.mesh(M.torus(R * 0.13, R * 0.035, Math.PI * 2, 6, 16), M.mat('#ffe04a', { rough: 0.3 }), 0, -R * 0.02, R * 0.08, pac);
    rig.onFace = (expr) => { pac.visible = expr === 'normal' || expr === 'angry'; };
    // the diaper (bigger and white) with a pin
    M.mesh(M.sphere(0.19), mats.bottom, 0, -0.01, 0, rig.hips, { s: [1.15, 0.85, 1.05] });
    M.mesh(M.box(0.03, 0.06, 0.02), M.mat('#ff7ab0'), 0.12, 0.04, 0.17, rig.hips);
    // onesie collar
    M.mesh(M.torus(0.11, 0.025, Math.PI * 2, 6, 18), M.mat('#ffffff'), 0, 0.39, 0, rig.torso, { r: [Math.PI / 2, 0, 0] });
    // a tiny rattle in one hand? no: he waves his arms around instead (see racer animation)
  }

  function gigaExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    // big square jaw
    M.mesh(M.rbox(R * 1.45, R * 0.75, R * 1.3, R * 0.25), mats.skin, 0, -R * 0.45, R * 0.12, h);
    M.mesh(M.sphere(R * 0.18), mats.skin, 0, -R * 0.82, R * 0.6, h, { s: [1.6, 0.8, 1] });
    // flat-top hair
    const hm = hairMat('#2a1a10');
    M.mesh(M.rbox(R * 1.85, R * 0.55, R * 1.75, R * 0.2), hm, 0, R * 0.68, -R * 0.08, h);
    // muscles!
    for (const side of [1, -1]) {
      M.mesh(M.sphere(0.11), mats.skin, side * 0.3, 0.32, 0, rig.torso, { s: [1.1, 0.9, 1] });
      M.mesh(M.sphere(0.09), mats.skin, side * 0.11, 0.26, 0.14, rig.torso, { s: [1.2, 0.8, 0.6] });
    }
    for (const a of rig.arms) M.mesh(M.sphere(0.085), mats.skin, 0, -0.08, 0.02, a.up);
  }

  function boltExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    const metal = M.mat('#a8b4c0', { rough: 0.25, metal: 0.85 });
    const cyan = M.mat('#2ad8ff', { rough: 0.3, metal: 0.5 });
    M.mesh(M.rbox(R * 2.0, R * 1.6, R * 1.7, R * 0.3), metal, 0, 0, 0, h);
    // the screen face
    const scr = new THREE.MeshBasicMaterial({ map: robotFace('normal'), toneMapped: false });
    const screen = M.mesh(new THREE.PlaneGeometry(R * 1.6, R * 1.15), scr, 0, 0, R * 0.86, h, { shadow: false });
    rig.onFace = (expr) => { scr.map = robotFace(expr); };
    // antenna
    M.mesh(M.cyl(0.012, 0.012, R * 0.6), metal, 0, R * 1.05, 0, h);
    const ball = M.mesh(M.sphere(R * 0.12), M.glowMat(0xff4040, 2), 0, R * 1.38, 0, h);
    for (const side of [1, -1]) M.mesh(M.cyl(R * 0.2, R * 0.2, R * 0.12, 16), cyan, side * R * 1.02, 0, 0, h, { r: [0, 0, Math.PI / 2] });
    // chest light
    M.mesh(M.cyl(0.05, 0.05, 0.02, 16), M.glowMat(0x2ad8ff, 1.6), 0, 0.24, 0.16, rig.torso, { r: [Math.PI / 2, 0, 0] });
    rig.extras.push((dt, st, t) => { ball.material.color.setHex(Math.sin(t * 6) > 0 ? 0xff4040 : 0x601010); });
  }
  const robotFaces = {};
  function robotFace(expr) {
    if (robotFaces[expr]) return robotFaces[expr];
    const t = U.tex(U.canvas(128, 96, (g, w, h) => {
      g.fillStyle = '#04141c'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#2af0ff'; g.fillStyle = '#2af0ff'; g.lineWidth = 7; g.lineCap = 'round';
      const eye = (x) => {
        if (expr === 'happy' || expr === 'cheeky') { g.beginPath(); g.arc(x, 44, 12, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
        else if (expr === 'ouch' || expr === 'cry') { g.beginPath(); g.moveTo(x - 10, 30); g.lineTo(x + 10, 46); g.moveTo(x + 10, 30); g.lineTo(x - 10, 46); g.stroke(); }
        else if (expr === 'angry') { g.fillRect(x - 11, 34, 22, 10); }
        else if (expr === 'sad') { g.fillRect(x - 8, 36, 16, 8); }
        else { g.beginPath(); g.ellipse(x, 38, 9, 13, 0, 0, 7); g.fill(); }
      };
      eye(38); eye(90);
      g.beginPath();
      if (expr === 'happy' || expr === 'cheeky') g.arc(64, 62, 16, 0.15 * Math.PI, 0.85 * Math.PI);
      else if (expr === 'sad' || expr === 'cry') g.arc(64, 84, 14, 1.2 * Math.PI, 1.8 * Math.PI);
      else if (expr === 'ouch') g.ellipse(64, 72, 8, 9, 0, 0, 7);
      else { g.moveTo(50, 72); g.lineTo(78, 72); }
      g.stroke();
      // scan lines
      g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 2);
    }));
    robotFaces[expr] = t;
    return t;
  }

  function kageExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    // skin band around the eyes
    M.mesh(M.cached('kageband' + R, () => new THREE.CylinderGeometry(R * 1.01, R * 1.01, R * 0.42, 28, 1, true)), mats.skin, 0, R * 0.12, 0, h);
    // red headband with flowing tails
    const red = M.mat('#e02a2a', { rough: 0.6, double: true });
    M.mesh(M.torus(R * 1.02, R * 0.07, Math.PI * 2, 6, 28), red, 0, R * 0.48, 0, h, { r: [Math.PI / 2, 0, 0] });
    const tails = [];
    for (const side of [1, -1]) {
      let parent = M.group(h, side * R * 0.15, R * 0.48, -R * 1.0);
      for (let i = 0; i < 5; i++) {
        const s = M.group(parent, 0, 0, i ? -0.09 : 0);
        M.mesh(M.box(0.06, 0.01, 0.1), red, 0, 0, -0.045, s);
        tails.push({ s, i, side }); parent = s;
      }
    }
    rig.extras.push((dt, st, t) => {
      const sp = st.speed || 0.3;
      for (const q of tails) { q.s.rotation.x = Math.sin(t * 9 - q.i * 0.9 + q.side) * 0.25 * (0.3 + sp) + (q.i === 0 ? 0.3 - sp * 0.3 : 0); q.s.rotation.y = q.side * 0.15 + Math.sin(t * 7 - q.i) * 0.15 * sp; }
    });
    // little sword on the back
    M.mesh(M.box(0.04, 0.5, 0.02), M.mat('#c0c8d0', { metal: 0.9, rough: 0.2 }), 0.08, 0.3, -0.18, rig.torso, { r: [0, 0, 0.6] });
    M.mesh(M.box(0.06, 0.14, 0.04), M.mat('#3a2a1a'), -0.1, 0.48, -0.18, rig.torso, { r: [0, 0, 0.6] });
  }

  function zorpExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    for (const side of [1, -1]) {
      const a = M.group(h, side * R * 0.35, R * 1.0, 0);
      a.rotation.z = side * -0.4;
      M.mesh(M.cyl(0.012, 0.015, R * 0.7), mats.skin, 0, R * 0.35, 0, a);
      const ball = M.mesh(M.sphere(R * 0.12), M.glowMat(0xc0ff40, 1.5), 0, R * 0.72, 0, a);
      rig.extras.push((dt, st, t) => { a.rotation.x = Math.sin(t * 3 + side) * 0.2 - (st.speed || 0) * 0.4; });
    }
    // silver collar
    M.mesh(M.torus(0.13, 0.03, Math.PI * 2, 8, 24), M.mat('#e0e8f0', { metal: 0.8, rough: 0.2 }), 0, 0.39, 0, rig.torso, { r: [Math.PI / 2, 0, 0] });
  }

  function blazeExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    const belly = M.mat('#ffd04a', { rough: 0.6 }), horn = M.mat('#fff0d0', { rough: 0.4 });
    // snout
    M.mesh(M.sphere(R * 0.55), mats.skin, 0, -R * 0.3, R * 0.75, h, { s: [1.1, 0.75, 1] });
    for (const side of [1, -1]) {
      M.mesh(M.sphere(R * 0.07), rig.mats.black, side * R * 0.18, -R * 0.12, R * 1.25, h);
      // horns
      M.mesh(M.cone(R * 0.15, R * 0.65, 10), horn, side * R * 0.45, R * 0.75, -R * 0.35, h, { r: [-0.8, 0, side * -0.3] });
      // wings
      const w = M.group(rig.torso, side * 0.12, 0.32, -0.15);
      M.mesh(M.extrude('wing', [[0, 0], [0.35, 0.18], [0.42, -0.05], [0.3, -0.12], [0.2, -0.05], [0.1, -0.12]], 0.015, 0.01), M.mat('#c83a1a', { rough: 0.6, double: true }), 0, 0, 0, w, { s: [side, 1, 1], r: [0, side * 0.6, 0] });
      rig.extras.push((dt, st, t) => { w.rotation.y = Math.sin(t * (st.air ? 14 : 4)) * (st.air ? 0.5 : 0.15); });
    }
    if (rig.body) M.mesh(M.sphere(0.15), belly, 0, 0.17, 0.08, rig.torso, { s: [1, 1.3, 0.6] });
    // tail with spikes
    let parent = M.group(rig.hips, 0, 0, -0.15);
    parent.rotation.x = -2.0;
    const segs = [];
    for (let i = 0; i < 5; i++) {
      const s = M.group(parent, 0, i ? 0.1 : 0, 0);
      M.mesh(M.sphere(0.08 - i * 0.012), mats.skin, 0, 0.05, 0, s);
      M.mesh(M.cone(0.03, 0.07, 6), horn, 0, 0.06, -0.06 + i * 0.008, s, { r: [-1.2, 0, 0] });
      segs.push(s); parent = s;
    }
    rig.extras.push((dt, st, t) => segs.forEach((s, i) => { s.rotation.z = Math.sin(t * 3 - i * 0.7) * 0.2; s.rotation.x = 0.15; }));
  }

  function cosmoExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    const hair = hairMat('#5a3a20');
    M.mesh(M.sphere(R * 1.0), hair, 0, R * 0.2, -R * 0.1, h, { s: [1.02, 0.85, 1.0] });
    // glass bubble helmet
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xd8f0ff, transparent: true, opacity: 0.22, roughness: 0.02, metalness: 0, clearcoat: 1, depthWrite: false });
    const bubble = M.mesh(M.sphere(R * 1.45, 32, 24), glass, 0, -R * 0.05, 0, h, { shadow: false });
    bubble.renderOrder = 5;
    M.mesh(M.torus(R * 1.1, R * 0.12, Math.PI * 2, 8, 28), M.mat('#c0c8d0', { metal: 0.7, rough: 0.3 }), 0, -R * 1.0, 0, h, { r: [Math.PI / 2, 0, 0] });
    // backpack
    M.mesh(M.rbox(0.3, 0.32, 0.16, 0.05), M.mat('#d0d4dc', { rough: 0.5 }), 0, 0.22, -0.2, rig.torso);
    M.mesh(M.cyl(0.04, 0.04, 0.08, 12), M.glowMat(0x40c0ff, 1.5), 0.08, 0.06, -0.26, rig.torso);
    M.mesh(M.cyl(0.04, 0.04, 0.08, 12), M.glowMat(0x40c0ff, 1.5), -0.08, 0.06, -0.26, rig.torso);
    // chest panel and patch
    M.mesh(M.rbox(0.16, 0.1, 0.03, 0.01), M.mat('#3a4a6a'), 0, 0.25, 0.16, rig.torso);
    M.mesh(M.sphere(0.012), M.glowMat(0xff3030, 2), -0.04, 0.26, 0.18, rig.torso);
    M.mesh(M.sphere(0.012), M.glowMat(0x30ff60, 2), 0.04, 0.26, 0.18, rig.torso);
    for (const a of rig.arms) M.mesh(M.cyl(0.07, 0.07, 0.04, 14), M.mat('#c0c8d0'), 0, -D.L2 + 0.03, 0, a.lo);
  }

  function bonesExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    // jaw
    M.mesh(M.rbox(R * 1.1, R * 0.4, R * 0.9, R * 0.15), mats.skin, 0, -R * 0.65, R * 0.2, h);
    // nose hole
    M.mesh(M.cone(R * 0.08, R * 0.15, 3), rig.mats.black, 0, -R * 0.15, R * 0.98, h, { r: [Math.PI, 0, 0] });
    // purple bow tie (fancy hotel style)
    const bow = M.mat('#a040ff', { rough: 0.5 });
    for (const side of [1, -1]) M.mesh(M.cone(0.05, 0.09, 4), bow, side * 0.05, 0.38, 0.1, rig.torso, { r: [0, 0, side * Math.PI / 2] });
    M.mesh(M.sphere(0.025), bow, 0, 0.38, 0.11, rig.torso);
    // little top hat
    const hat = M.mat('#1a1420', { rough: 0.6 });
    M.mesh(M.cyl(R * 0.75, R * 0.75, R * 0.06, 20), hat, 0, R * 0.85, 0, h, { r: [0.15, 0, 0.1] });
    M.mesh(M.cyl(R * 0.48, R * 0.5, R * 0.6, 20), hat, 0.02, R * 1.15, -0.02, h, { r: [0.15, 0, 0.1] });
    M.mesh(M.cyl(R * 0.505, R * 0.505, R * 0.12, 20), bow, 0.01, R * 0.95, -0.01, h, { r: [0.15, 0, 0.1] });
    rig.extras.push((dt, st, t) => { for (const e of rig.face.eyes) if (e.pupil) e.pupil.scale.setScalar(1 + Math.sin(t * 5) * 0.2); });
  }

  function hexExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    const hair = hairMat('#7a3ac8'), hatM = M.mat('#3a1a5a', { rough: 0.7 }), gold = M.mat('#ffcc1a', { metal: 0.9, rough: 0.2 });
    // long hair
    M.mesh(M.sphere(R * 1.04), hair, 0, R * 0.1, -R * 0.15, h, { s: [1.05, 1.0, 1.0] });
    M.mesh(M.capsule(R * 0.6, R * 0.9), hair, 0, -R * 0.55, -R * 0.45, h, { s: [1.4, 1, 0.7] });
    for (const side of [1, -1]) M.mesh(M.capsule(R * 0.22, R * 0.8), hair, side * R * 0.75, -R * 0.45, R * 0.15, h);
    // the hat
    const hat = M.group(h, 0, R * 0.65, -R * 0.05);
    hat.rotation.set(-0.15, 0, 0.12);
    M.mesh(M.cyl(R * 1.55, R * 1.55, R * 0.06, 28), hatM, 0, 0, 0, hat);
    const tip = M.group(hat, 0, 0, 0);
    M.mesh(M.cone(R * 0.85, R * 1.5, 24), hatM, 0, R * 0.75, 0, tip);
    const tip2 = M.group(tip, 0, R * 1.4, 0);
    M.mesh(M.cone(R * 0.35, R * 0.7, 16), hatM, 0.04, R * 0.2, 0, tip2, { r: [0, 0, -0.5] });
    M.mesh(M.cyl(R * 0.86, R * 0.86, R * 0.2, 24), M.mat('#ff4ad8'), 0, R * 0.12, 0, hat);
    M.mesh(M.rbox(R * 0.3, R * 0.24, R * 0.06, 0.01), gold, 0, R * 0.12, R * 0.86, hat);
    rig.extras.push((dt, st, t) => { tip2.rotation.z = Math.sin(t * 2.5) * 0.15 - (st.speed || 0) * 0.1; tip2.rotation.x = -(st.speed || 0) * 0.5; });
    // a skirt
    M.mesh(M.cached('skirt', () => new THREE.ConeGeometry(0.28, 0.32, 20, 1, true)), M.mat('#5a2a8a', { double: true }), 0, -0.02, 0, rig.hips);
  }

  function finnExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    const white = M.mat('#f0f4f8', { rough: 0.5 });
    // white belly side of the head
    M.mesh(M.sphere(R * 0.98, 28, 20), white, 0, -R * 0.12, R * 0.08, h, { s: [1.02, 0.75, 1.12] });
    // dorsal fin
    M.mesh(M.extrude('fin', [[0, 0], [0.1, 0.32], [0.28, 0.0]], 0.04, 0.02), mats.skin, 0, R * 0.78, -R * 0.4, h, { r: [0, -Math.PI / 2, 0] });
    // gills
    for (const side of [1, -1]) for (let i = 0; i < 3; i++) M.mesh(M.box(0.008, R * 0.3, 0.03), M.mat('#2a4a7a'), side * R * 0.92, -R * 0.1, -R * 0.1 - i * 0.05, h, { r: [0, 0, side * 0.2] });
    if (rig.body) M.mesh(M.sphere(0.15), white, 0, 0.18, 0.06, rig.torso, { s: [1.1, 1.3, 0.7] });
    // tail fin
    const tail = M.group(rig.hips, 0, 0.02, -0.18);
    M.mesh(M.capsule(0.07, 0.15), mats.skin, 0, 0, -0.08, tail, { r: [Math.PI / 2, 0, 0] });
    M.mesh(M.extrude('tailfin', [[0, 0], [-0.12, 0.2], [0.02, 0.05], [0.0, -0.05], [-0.12, -0.18]], 0.03, 0.01), mats.skin, 0, 0, -0.22, tail, { r: [0, Math.PI / 2, 0] });
    rig.extras.push((dt, st, t) => { tail.rotation.y = Math.sin(t * 5) * 0.4; });
  }

  function wispExtra(rig, C, mats) {
    const R = rig.R;
    // the ghost's body: a sheet with a wavy bottom
    const pts = [[0, 0.62], [0.14, 0.6], [0.24, 0.5], [0.28, 0.3], [0.3, 0.1], [0.33, -0.1], [0.36, -0.22], [0, -0.22]];
    const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 28);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); if (y < -0.05) { const a = Math.atan2(z, x); p.setY(i, y + Math.sin(a * 6) * 0.05); } }
    g.computeVertexNormals();
    const body = M.mesh(g, mats.skin, 0, 0, 0, rig.hips);
    rig.skull = M.mesh(M.sphere(R, 28, 20), mats.skin, 0, 0, 0, rig.head);
    const blush = M.mat('#ffa0c0', { opacity: 0.7, rough: 0.9 });
    for (const side of [1, -1]) M.mesh(M.sphere(R * 0.14), blush, side * R * 0.55, -R * 0.2, R * 0.78, rig.head, { s: [1, 0.6, 0.3], shadow: false });
    rig.extras.push((dt, st, t) => { body.rotation.y = Math.sin(t * 2) * 0.1; body.scale.y = 1 + Math.sin(t * 3) * 0.04; });
    rig.floaty = true;
  }

  function rustyExtra(rig, C, mats) {
    const R = rig.R, h = rig.head;
    const cream = M.mat('#fff4e0', { rough: 0.8 }), dark = M.mat('#3a2010', { rough: 0.6 });
    M.mesh(M.sphere(R * 0.5), cream, 0, -R * 0.35, R * 0.7, h, { s: [1.0, 0.7, 1.1] });
    M.mesh(M.sphere(R * 0.12), dark, 0, -R * 0.2, R * 1.22, h);
    for (const side of [1, -1]) {
      const ear = M.group(h, side * R * 0.55, R * 0.8, -R * 0.1);
      ear.rotation.z = side * -0.3;
      M.mesh(M.cone(R * 0.3, R * 0.85, 4), mats.skin, 0, 0.0, 0, ear, { r: [0, Math.PI / 4, 0] });
      M.mesh(M.cone(R * 0.12, R * 0.3, 4), dark, 0, R * 0.36, 0, ear, { r: [0, Math.PI / 4, 0] });
    }
    // goggles on the forehead
    const strap = M.mat('#5a3a20'), lensM = M.mat('#60d0ff', { rough: 0.05, metal: 0.3, glow: 0.3 });
    M.mesh(M.torus(R * 1.0, R * 0.06, Math.PI * 2, 6, 28), strap, 0, R * 0.48, 0, h, { r: [Math.PI / 2 - 0.25, 0, 0] });
    for (const side of [1, -1]) {
      M.mesh(M.cyl(R * 0.22, R * 0.22, R * 0.18, 16), M.mat('#c08a40', { metal: 0.8, rough: 0.3 }), side * R * 0.3, R * 0.6, R * 0.82, h, { r: [Math.PI / 2 - 0.5, 0, 0] });
      M.mesh(M.cyl(R * 0.17, R * 0.17, R * 0.02, 16), lensM, side * R * 0.3, R * 0.66, R * 0.92, h, { r: [Math.PI / 2 - 0.5, 0, 0] });
    }
    // bushy tail
    const tail = M.group(rig.hips, 0, 0, -0.14);
    tail.rotation.x = -2.3;
    M.mesh(M.capsule(0.1, 0.3), mats.skin, 0, 0.18, 0, tail, { s: [1, 1, 1] });
    M.mesh(M.sphere(0.1), cream, 0, 0.4, 0, tail);
    rig.extras.push((dt, st, t) => { tail.rotation.z = Math.sin(t * 3) * 0.3; });
    // tool belt
    M.mesh(M.torus(0.17, 0.03, Math.PI * 2, 6, 24), strap, 0, 0.05, 0, rig.hips, { r: [Math.PI / 2, 0, 0] });
    M.mesh(M.box(0.03, 0.14, 0.03), M.mat('#c0c8d0', { metal: 0.9, rough: 0.3 }), 0.15, -0.02, 0.1, rig.hips, { r: [0, 0, 0.3] });
  }

  // stats for each weight class (0..10)
  const WEIGHT = {
    light: { speed: 3.5, accel: 7, weight: 2.5, handling: 7, grip: 5.5, turbo: 6.5 },
    medium: { speed: 5, accel: 5, weight: 5, handling: 5, grip: 5, turbo: 5 },
    heavy: { speed: 6.5, accel: 3.5, weight: 8, handling: 3.5, grip: 4.5, turbo: 3.5 },
  };

  return { LIST, byId, build, animate, setFace, WEIGHT, D };
})();
