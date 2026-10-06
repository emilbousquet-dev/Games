// ============================================================
//  MY LIFE — REALISTIC PEOPLE 🧍
//  Real body sizes (like GTA): a small head, long legs, knees,
//  elbows, fingers, a real face, clothes made of fabric.
//  Babies, kids, teens, adults and old-timers.
// ============================================================
window.ML = window.ML || {};

(function () {
  const U = ML.U, T = ML.Tex, Mo = ML.Models;
  const { P, G, C, E, M, B, grp, std, sprite, blobShadow, L0, makeEye, makeBrow, makeMouth, setMood, animateFace, bake } = Mo;
  const PI = Math.PI;

  // ---------- body sizes for every age ----------
  // b = body size, w = how wide, h = head size, leg = leg length, torso = body length
  const STAGES = {
    baby: { b: 0.42, w: 1.3, h: 0.7, leg: 0.72, torso: 0.95, neck: 0.35, arm: 0.85 },
    kid: { b: 0.7, w: 0.86, h: 0.87, leg: 0.98, torso: 0.96, neck: 0.8, arm: 0.98 },
    teen: { b: 0.94, w: 0.9, h: 0.97, leg: 1.0, torso: 0.98, neck: 1, arm: 1 },
    adult: { b: 1, w: 1, h: 1, leg: 1, torso: 1, neck: 1, arm: 1 },
    old: { b: 0.97, w: 1.05, h: 0.99, leg: 0.97, torso: 1, neck: 0.9, arm: 0.98 },
  };

  // ---------- materials ----------
  const skinMat = (c) => std('skin' + c, { color: c, map: T.skinTex(), roughness: 0.58 });
  const cloth = (c, kind = 'cotton') => std('cl' + c + kind, { color: c, map: T.fabric(kind), roughness: 0.88 });
  const hairMat = (c) => std('hair' + c, { color: c, map: T.hairTex(), roughness: 0.62, metalness: 0.05 });
  const mix = (a, b, t) => {
    const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255, br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
    return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
  };
  const LONG = { hoodie: 1, suit: 1, coat: 1, chef: 1, sweater: 1 };
  const isDenim = (c) => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; return b > r + 20 && b > g; };

  // ============================================================
  //  BUILD A PERSON
  //  look = { skin, hair, hairStyle, eyes, top, shirt, pants, shoes, extra, bag, cane }
  // ============================================================
  function person(look, stage = 'adult') {
    const L = Object.assign({ skin: 0xe8b894, hair: 0x3a2414, hairStyle: 'short', eyes: 0x4a7ac8, top: 'tshirt', shirt: 0x3a6ab8, pants: 0x2a3a5a, shoes: 0xf0f0f0, extra: 'none' }, look);
    const S = STAGES[stage] || STAGES.adult;
    const baby = stage === 'baby', old = stage === 'old', kid = stage === 'kid';
    const b = S.b, ww = S.b * S.w, hs = S.h;
    const skin = skinMat(L.skin);
    const darkSkin = C(mix(L.skin, 0x3a1a10, 0.25), 0.7);
    const top = baby ? 'onesie' : L.top;
    const hairColor = old && L.hairStyle !== 'bald' ? mix(L.hair, 0xe0e0e0, 0.75) : L.hair;
    const shirtM = cloth(L.shirt, top === 'sweater' ? 'knit' : 'cotton');
    const whiteM = cloth(0xf2f2f0);
    const pantsM = cloth(L.pants, isDenim(L.pants) ? 'denim' : 'cotton');
    const bodyM = top === 'coat' || top === 'chef' ? whiteM : shirtM;
    const legM = top === 'onesie' ? shirtM : top === 'dress' ? skin : pantsM;

    // sizes (meters)
    const foot = 0.07 * b, shin = 0.41 * b * S.leg, thigh = 0.44 * b * S.leg;
    const hipY = foot + shin + thigh;
    const Tt = 0.54 * b * S.torso, N = 0.08 * b * S.neck;
    const hipW = 0.345 * ww, hipD = 0.22 * ww, waistW = (baby ? 0.36 : 0.3) * ww, waistD = (baby ? 0.26 : 0.19) * ww;
    const chestW = 0.36 * ww, chestD = 0.225 * ww, shW = 0.4 * ww;
    const ua = 0.29 * b * S.arm, fa = 0.25 * b * S.arm;
    const key = stage; // shapes are the same for everyone of the same age

    const root = new THREE.Group();
    const hips = grp(root, [0, hipY, 0]);
    const torso = grp(hips);
    const head = grp(torso, [0, Tt + N * 0.7, 0]);
    const armL = grp(torso, [shW / 2 - 0.035 * ww, Tt * 0.9, -0.005]);
    const armR = grp(torso, [-(shW / 2 - 0.035 * ww), Tt * 0.9, -0.005]);
    const legL = grp(hips, [0.092 * ww, 0, 0]);
    const legR = grp(hips, [-0.092 * ww, 0, 0]);
    const R = { hips, torso, head, armL, armR, legL, legR, hipY, b: { leg: thigh + shin, legR: 0.06 * ww, tw: shW, td: chestD }, thigh, shin, foot };
    root.userData = { rig: R, face: { eyes: [], brows: [], mouth: null }, blinkOff: Math.random() * 5, kind: 'person', stage, look: L };

    // ---------- legs ----------
    for (const [leg, side] of [[legL, 'L'], [legR, 'R']]) {
      P(leg, L0(key + 'thigh', [[-thigh - 0.02 * b, 0.1 * ww, 0.105 * ww], [-thigh * 0.75, 0.125 * ww, 0.13 * ww, 0.004], [-thigh * 0.35, 0.15 * ww, 0.155 * ww, 0.008], [0.02, 0.165 * ww, 0.17 * ww]], { seg: 14 }), legM);
      const knee = grp(leg, [0, -thigh, 0]);
      P(knee, L0(key + 'shin', [[-shin, 0.066 * ww, 0.068 * ww], [-shin * 0.8, 0.074 * ww, 0.078 * ww], [-shin * 0.42, 0.1 * ww, 0.108 * ww, -0.012 * ww], [-shin * 0.15, 0.104 * ww, 0.11 * ww, -0.006 * ww], [0.01, 0.1 * ww, 0.104 * ww]], { seg: 14 }), legM);
      if (top === 'dress' && !baby) P(knee, G.cylLo(), cloth(0xf0e8e0), [0, -shin * 0.9, 0], [0.036 * ww, shin * 0.18, 0.038 * ww]); // socks
      const ft = grp(knee, [0, -shin, 0]);
      if (baby) P(ft, G.sphere(), shirtM, [0, -foot * 0.45, 0.025 * b], [0.045 * ww, 0.035 * b, 0.075 * b]);
      else shoe(ft, L.shoes, ww, b, foot);
      R['knee' + side] = knee;
    }
    // ---------- body ----------
    const pelvis = [[-Tt * 0.15, hipW * 0.55, hipD * 0.72, 0.004], [-Tt * 0.06, hipW * 0.94, hipD * 0.95], [Tt * 0.06, hipW, hipD], [Tt * 0.2, waistW * 1.02, waistD], [Tt * 0.27, waistW, waistD]];
    const chest = [[Tt * 0.15, waistW * 1.09, waistD * 1.1], [Tt * 0.22, waistW * 1.08, waistD * 1.09], [Tt * 0.36, waistW * 1.05, waistD * 1.06, 0.006], [Tt * 0.56, chestW * 0.97, chestD, 0.012 * ww], [Tt * 0.73, chestW, chestD * 1.02, 0.014 * ww], [Tt * 0.87, shW * 0.9, chestD * 0.9, 0.004], [Tt * 0.96, shW * 0.64, chestD * 0.72, -0.006], [Tt * 1.02, 0.15 * ww, 0.13 * ww, -0.01]];
    P(torso, L0(key + 'pelvis', pelvis, { pow: 2.3 }), top === 'dress' ? shirtM : top === 'onesie' ? shirtM : pantsM);
    P(torso, L0(key + 'chest', chest, { pow: 2.25, seg: 20 }), bodyM);
    if (baby) P(torso, G.sphere(), whiteM, [0, -Tt * 0.02, 0], [hipW * 0.6, Tt * 0.22, hipD * 0.62]); // diaper
    // shoulders (round, so arms join nicely)
    for (const a of [armL, armR]) P(a, G.sphere(), (LONG[top] || top === 'uniform' || top === 'tshirt' || top === 'onesie' || top === 'dress') ? bodyM : skin, [0, -0.015 * b, 0], [0.05 * ww, 0.052 * ww, 0.05 * ww]);
    clothesDetails(torso, top, L, Tt, ww, b, chestD, waistW, waistD, hipW, hipD, thigh, shirtM, whiteM, pantsM);

    // ---------- arms (shoulder, elbow, hand) ----------
    const sleeveM = top === 'coat' || top === 'chef' ? whiteM : shirtM;
    for (const [arm, side] of [[armL, 'L'], [armR, 'R']]) {
      const sx = side === 'L' ? 1 : -1;
      P(arm, L0(key + 'upper', [[-ua - 0.01, 0.07 * ww, 0.068 * ww], [-ua * 0.55, 0.084 * ww, 0.082 * ww], [-ua * 0.15, 0.094 * ww, 0.092 * ww], [0.02, 0.085 * ww, 0.085 * ww]], { seg: 12 }), LONG[top] ? sleeveM : skin);
      if (!LONG[top]) P(arm, L0(key + 'sleeve', [[-ua * 0.52, 0.106 * ww, 0.104 * ww], [-ua * 0.2, 0.112 * ww, 0.11 * ww], [0.02, 0.104 * ww, 0.104 * ww]], { seg: 12 }), sleeveM);
      const elbow = grp(arm, [0, -ua, 0]);
      P(elbow, L0(key + 'fore', [[-fa, 0.05 * ww, 0.04 * ww], [-fa * 0.65, 0.064 * ww, 0.056 * ww], [-fa * 0.2, 0.072 * ww, 0.066 * ww], [0.012, 0.068 * ww, 0.066 * ww]], { seg: 12 }), LONG[top] ? sleeveM : skin);
      if (LONG[top]) P(elbow, G.cylLo(), sleeveM, [0, -fa * 0.93, 0], [0.032 * ww, 0.03 * b, 0.028 * ww]); // cuff
      const h = hand(elbow, [0, -fa, 0], skin, ww, b, sx);
      R['elbow' + side] = elbow;
      R['hand' + side] = h;
    }

    // ---------- neck & head ----------
    P(torso, L0(key + 'neck', [[Tt * 0.9, 0.105 * ww, 0.1 * ww, -0.005], [Tt + N + 0.03 * hs, 0.095 * ww, 0.092 * ww, -0.008]], { seg: 12 }), skin);
    const H = grp(head, [0, -0.04 * hs, 0.01 * hs]);
    R.H = H; R.hr = 0.12 * hs; R.crown = 0.245 * hs;
    P(H, headGeo(hs, baby), skin);
    face(root, H, hs, L, skin, darkSkin, hairColor, stage);
    // hair
    if (baby) hairCap(H, hs, hairMat(hairColor), 1.025, 0.19, 0.25);
    else hair(H, hs, L.hairStyle, hairMat(hairColor), old);
    extras(root, H, hs, L, shirtM, hairColor, R, ua, fa, thigh, shin, ww, b);

    const height = hipY + Tt + N * 0.7 + 0.205 * hs;
    bake(root);
    blobShadow(root, 0.32 * ww);
    root.userData.height = height;
    return root;
  }

  // ---------- the head shape ----------
  function headRings(hs, baby) {
    return [[0, 0.05 * hs, 0.045 * hs, 0.055 * hs], [0.015 * hs, 0.085 * hs, 0.09 * hs, 0.04 * hs], [0.04 * hs, (baby ? 0.13 : 0.115) * hs, 0.145 * hs, 0.02 * hs], [0.075 * hs, (baby ? 0.145 : 0.132) * hs, 0.172 * hs, 0.006 * hs], [0.11 * hs, 0.142 * hs, 0.186 * hs], [0.14 * hs, 0.146 * hs, 0.192 * hs, -0.003 * hs], [0.17 * hs, 0.148 * hs, 0.196 * hs, -0.008 * hs], [0.2 * hs, 0.138 * hs, 0.186 * hs, -0.012 * hs], [0.225 * hs, 0.108 * hs, 0.15 * hs, -0.016 * hs], [0.24 * hs, 0.05 * hs, 0.07 * hs, -0.018 * hs], [0.245 * hs, 0.004, 0.006, -0.018 * hs]];
  }
  const headGeo = (hs, baby) => L0('head' + hs + (baby ? 'b' : ''), headRings(hs, baby), { pow: 2.15, seg: 26, sub: 3 });
  // hair = a copy of the head, a bit bigger, cut along a hairline (high in front, low at the back)
  function shell(hs, k, y0, slope, key) {
    return Mo.geo('shell' + key + hs + k + y0 + slope, () => {
      const g = headGeo(hs).toNonIndexed();
      const p = g.attributes.position, uv = g.attributes.uv;
      const cy = 0.13 * hs, out = [], ouv = [];
      for (let i = 0; i < p.count; i += 3) {
        let cyy = 0, cz = 0;
        for (let j = 0; j < 3; j++) { cyy += p.getY(i + j); cz += p.getZ(i + j); }
        cyy /= 3; cz /= 3;
        if (cyy < (y0 + slope * cz / hs) * hs) continue;
        for (let j = 0; j < 3; j++) {
          out.push(p.getX(i + j) * k, cy + (p.getY(i + j) - cy) * k, p.getZ(i + j) * k);
          ouv.push(uv.getX(i + j), uv.getY(i + j));
        }
      }
      const ng = new THREE.BufferGeometry();
      ng.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
      ng.setAttribute('uv', new THREE.Float32BufferAttribute(ouv, 2));
      ng.computeVertexNormals();
      return ng;
    });
  }

  // ---------- hands with fingers ----------
  function hand(parent, pos, skin, ww, b, sx) {
    const h = grp(parent, pos);
    P(h, G.rbox(0.07 * ww, 0.085 * b, 0.028 * ww, 0.012 * ww), skin, [0, -0.04 * b, 0]);
    for (let i = 0; i < 4; i++) {
      const len = (0.05 + (i === 1 || i === 2 ? 0.01 : 0)) * b;
      P(h, G.cap(0.0075 * ww, len), skin, [(i - 1.5) * 0.017 * ww, -0.085 * b - len / 2, 0.004], 1, [0.25, 0, 0]);
    }
    P(h, G.cap(0.009 * ww, 0.035 * b), skin, [sx * 0.03 * ww, -0.035 * b, 0.018 * ww], 1, [0.5, 0, sx * 0.6]);
    return h;
  }
  // ---------- shoes (sneakers with a white sole) ----------
  function shoe(ft, color, ww, b, foot) {
    const m = C(color, 0.55);
    P(ft, G.rbox(0.098 * ww, 0.07 * b, 0.25 * b, 0.03 * ww), m, [0, -foot * 0.45, 0.045 * b]);
    P(ft, G.sphere(), m, [0, -foot * 0.5, 0.15 * b], [0.048 * ww, 0.034 * b, 0.05 * b]);
    P(ft, G.rbox(0.104 * ww, 0.022 * b, 0.27 * b, 0.01), C(color === 0xf4f4f4 || color === 0xf0f0f0 ? 0xd8d8d8 : 0xf2f2f2, 0.7), [0, -foot * 0.92, 0.05 * b]);
    P(ft, G.box(), C(0xf8f8f8, 0.6), [0, -foot * 0.1, 0.1 * b], [0.04 * ww, 0.004, 0.06 * b]); // laces
  }

  // ---------- the face ----------
  function face(root, H, hs, L, skin, darkSkin, hairColor, stage) {
    const f = root.userData.face;
    const baby = stage === 'baby', young = baby || stage === 'kid';
    const er = (baby ? 0.017 : young ? 0.0155 : 0.0138) * hs;
    // eye sockets (a little shadow makes the face look real)
    for (const sx of [-1, 1]) P(H, G.sphere(), darkSkin, [sx * 0.034 * hs, 0.139 * hs, 0.08 * hs], [0.022 * hs, 0.014 * hs, 0.01 * hs]);
    for (const sx of [1, -1]) { const e = makeEye(H, [sx * 0.034 * hs, 0.138 * hs, 0.077 * hs], er, L.eyes, skin); e.userData.baseOpen = -1.0; f.eyes.push(e); }
    // nose
    P(H, G.cap(0.0085 * hs, 0.03 * hs), skin, [0, 0.118 * hs, 0.094 * hs], 1, [-0.3, 0, 0]);
    P(H, G.sphere(), skin, [0, 0.099 * hs, 0.1 * hs], [0.011 * hs, 0.0095 * hs, 0.01 * hs]);
    for (const sx of [-1, 1]) P(H, G.sphere(), skin, [sx * 0.01 * hs, 0.096 * hs, 0.094 * hs], [0.0075 * hs, 0.0065 * hs, 0.0075 * hs]);
    // cheeks, chin, ears
    for (const sx of [-1, 1]) {
      P(H, G.sphere(), skin, [sx * 0.072 * hs, 0.123 * hs, -0.006 * hs], [0.011 * hs, 0.028 * hs, 0.019 * hs], [0, sx * 0.3, 0]);
      P(H, G.sphere(), darkSkin, [sx * 0.078 * hs, 0.123 * hs, -0.004 * hs], [0.005 * hs, 0.018 * hs, 0.011 * hs]);
      if (young) P(H, G.sphereLo(), C(0xff8a80, 0.8, 0, { transparent: true, opacity: 0.25 }), [sx * 0.045 * hs, 0.098 * hs, 0.085 * hs], [0.017 * hs, 0.011 * hs, 0.004 * hs]);
    }
    if (!baby) P(H, G.sphere(), skin, [0, 0.022 * hs, 0.055 * hs], [0.028 * hs, 0.02 * hs, 0.022 * hs]);
    // eyebrows
    const browM = C(stage === 'old' ? 0xd8d8d8 : mix(hairColor, 0x000000, 0.15), 0.8);
    for (const sx of [1, -1]) f.brows.push(makeBrow(H, [sx * 0.034 * hs, 0.16 * hs, 0.087 * hs], 0.026 * hs, (baby ? 0.0022 : 0.0036) * hs, browM, sx));
    // lips + mouth
    const lip = mix(L.skin, 0xb04050, 0.35);
    P(H, G.cap(0.0048 * hs, 0.022 * hs), C(lip, 0.45), [0, 0.063 * hs, 0.089 * hs], 1, [0, 0, PI / 2]);
    f.mouth = makeMouth(H, [0, 0.071 * hs, 0.093 * hs], 0.019 * hs);
    f.mouth.userData.arc.material = C(mix(lip, 0x200000, 0.3), 0.5);
    if (stage === 'old') for (const sx of [-1, 1]) {
      P(H, G.cap(0.0012 * hs, 0.012 * hs), darkSkin, [sx * 0.058 * hs, 0.145 * hs, 0.075 * hs], 1, [0, 0, sx * 0.5]);
      P(H, G.cap(0.0015 * hs, 0.02 * hs), darkSkin, [sx * 0.03 * hs, 0.085 * hs, 0.09 * hs], 1, [0, 0, sx * 0.5]);
    }
  }

  // ---------- hair ----------
  const hairCap = (H, hs, m, k = 1.06, y0 = 0.135, slope = 0.55) => P(H, shell(hs, k, y0, slope, 'h'), m);
  function hair(H, hs, style, m, old) {
    if (style === 'bald') {
      if (old) for (const sx of [-1, 1]) P(H, G.sphere(), m, [sx * 0.07 * hs, 0.13 * hs, -0.035 * hs], [0.012 * hs, 0.028 * hs, 0.05 * hs]);
      return;
    }
    if (style === 'short') {
      hairCap(H, hs, m, 1.07);
      hairCap(H, hs, m, 1.1, 0.19, 0.3); // a bit of volume on top
    } else if (style === 'spiky') {
      hairCap(H, hs, m, 1.06);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * PI * 2, r = 0.045 * hs;
        P(H, G.cone(), m, [Math.cos(a) * r * 0.8, 0.245 * hs, Math.sin(a) * r - 0.005 * hs], [0.013 * hs, 0.04 * hs, 0.013 * hs], [Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45]);
      }
    } else if (style === 'long') {
      hairCap(H, hs, m, 1.08, 0.12, 0.5);
      P(H, Mo.L0('longback' + hs, [[-0.09 * hs, 0.12 * hs, 0.035 * hs], [0.02 * hs, 0.155 * hs, 0.05 * hs], [0.12 * hs, 0.16 * hs, 0.065 * hs], [0.2 * hs, 0.13 * hs, 0.05 * hs]], { seg: 14 }), m, [0, 0, -0.08 * hs]);
      for (const sx of [-1, 1]) P(H, G.cap(0.015 * hs, 0.12 * hs), m, [sx * 0.074 * hs, 0.07 * hs, 0.015 * hs], 1, [0.05, 0, sx * 0.06]);
    } else if (style === 'ponytail') {
      hairCap(H, hs, m, 1.06, 0.13, 0.5);
      P(H, G.sphere(), m, [0, 0.17 * hs, -0.11 * hs], 0.02 * hs);
      P(H, G.cap(0.018 * hs, 0.11 * hs), m, [0, 0.1 * hs, -0.13 * hs], 1, [0.25, 0, 0]);
    } else if (style === 'bun') {
      hairCap(H, hs, m, 1.06, 0.13, 0.5);
      P(H, G.sphere(), m, [0, 0.24 * hs, -0.05 * hs], 0.042 * hs);
    } else if (style === 'curly') {
      hairCap(H, hs, m, 1.08);
      const rr = U.seeded(7);
      for (let i = 0; i < 46; i++) {
        const a = rr() * PI * 2, el = rr() * 1.3;
        const x = Math.sin(el) * Math.cos(a), y = Math.cos(el), z = Math.sin(el) * Math.sin(a);
        if (z > 0.35 && y < 0.65) continue; // keep the forehead free
        P(H, G.sphereLo(), m, [x * 0.078 * hs, 0.135 * hs + y * 0.118 * hs, z * 0.098 * hs - 0.01 * hs], 0.017 * hs);
      }
    } else if (style === 'afro') {
      hairCap(H, hs, m, 1.06);
      P(H, G.sphere(), m, [0, 0.18 * hs, -0.02 * hs], [0.118 * hs, 0.11 * hs, 0.128 * hs]);
    } else if (style === 'mohawk') {
      P(H, shell(hs, 1.012, 0.135, 0.55, 'buzz'), C(0x2a2420, 0.95, 0, { transparent: true, opacity: 0.45 }));
      P(H, G.rbox(0.022 * hs, 0.055 * hs, 0.2 * hs, 0.011 * hs), m, [0, 0.245 * hs, -0.01 * hs], 1, [-0.1, 0, 0]);
    } else hairCap(H, hs, m, 1.07);
  }

  // ---------- clothes details ----------
  function clothesDetails(torso, top, L, Tt, ww, b, chestD, waistW, waistD, hipW, hipD, thigh, shirtM, whiteM, pantsM) {
    const dark = (c, k) => C(T.shade(c, -k), 0.85);
    if (top !== 'dress' && top !== 'onesie' && top !== 'coat') {
      P(torso, G.cylLo(), C(0x2a2018, 0.6), [0, Tt * 0.2, 0], [waistW * 0.52, 0.03 * b, waistD * 0.55]); // belt
      P(torso, G.box(), M.metal(), [0, Tt * 0.2, waistD * 0.53], [0.04 * ww, 0.025 * b, 0.006]);
    }
    if (top === 'tshirt' || top === 'onesie') P(torso, G.torus(), dark(L.shirt, 0.15), [0, Tt * 1.0, 0.004], [0.06 * ww, 0.052 * ww, 0.1 * ww], [PI / 2 - 0.2, 0, 0]);
    if (top === 'hoodie') {
      P(torso, G.torus(), shirtM, [0, Tt * 0.98, -0.045 * ww], [0.085 * ww, 0.08 * ww, 0.14 * ww], [PI / 2 - 0.45, 0, 0]);
      P(torso, G.rbox(0.18 * ww, 0.09 * b, 0.02, 0.01), dark(L.shirt, 0.12), [0, Tt * 0.36, waistD * 0.55]);
      for (const sx of [-1, 1]) P(torso, G.cap(0.003, 0.08 * b), whiteM, [sx * 0.025 * ww, Tt * 0.82, chestD * 0.52], 1, [0.1, 0, 0]);
    }
    if (top === 'sweater') P(torso, G.cylLo(), dark(L.shirt, 0.1), [0, Tt * 0.24, 0], [waistW * 0.54, 0.04 * b, waistD * 0.57]);
    if (top === 'suit') {
      P(torso, G.box(), whiteM, [0, Tt * 0.78, chestD * 0.5], [0.07 * ww, Tt * 0.36, 0.006]);
      P(torso, G.box(), C(0x9a1a28, 0.5), [0, Tt * 0.7, chestD * 0.52], [0.022 * ww, Tt * 0.42, 0.008]);
      for (const sx of [-1, 1]) P(torso, G.box(), dark(L.shirt, 0.2), [sx * 0.05 * ww, Tt * 0.78, chestD * 0.51], [0.035 * ww, Tt * 0.34, 0.008], [0, 0, sx * 0.25]);
      for (let i = 0; i < 2; i++) P(torso, G.sphereLo(), C(0x1a1a1a, 0.4), [0, Tt * (0.38 + i * 0.12), chestD * 0.52], 0.007 * ww);
    }
    if (top === 'coat') {
      P(torso, Mo.L0('coatskirt' + b, [[-thigh * 0.95, hipW * 1.15, hipD * 1.3], [-thigh * 0.4, hipW * 1.08, hipD * 1.18], [0, hipW * 1.04, hipD * 1.08], [Tt * 0.15, waistW * 1.08, waistD * 1.12]], { seg: 18, caps: false }), whiteM);
      P(torso, G.box(), shirtM, [0, Tt * 0.78, chestD * 0.5], [0.07 * ww, Tt * 0.36, 0.006]);
      P(torso, G.cap(0.004, 0.06 * b), M.metal(), [0.07 * ww, Tt * 0.72, chestD * 0.53]);
    }
    if (top === 'uniform') {
      P(torso, G.cylLo(), M.gold(), [0.07 * ww, Tt * 0.74, chestD * 0.52], [0.016 * ww, 0.004, 0.02 * ww], [PI / 2, 0, 0]);
      P(torso, G.rbox(0.03 * ww, 0.05 * b, 0.02 * ww, 0.006), M.black(), [-0.11 * ww, Tt * 0.86, 0.04 * ww]); // radio
      for (const sx of [-1, 1]) P(torso, G.rbox(0.05 * ww, 0.04 * b, 0.008, 0.004), shirtM, [sx * 0.07 * ww, Tt * 0.66, chestD * 0.52]);
    }
    if (top === 'chef') for (let i = 0; i < 3; i++) for (const sx of [-1, 1]) P(torso, G.sphereLo(), C(0x2a2a2a, 0.5), [sx * 0.04 * ww, Tt * (0.4 + i * 0.16), chestD * 0.52], 0.007 * ww);
    if (top === 'dress') P(torso, Mo.L0('skirt' + b + '_' + ww, [[-thigh * 1.0, hipW * 1.5, hipD * 1.7], [-thigh * 0.5, hipW * 1.25, hipD * 1.4], [-Tt * 0.05, hipW * 1.02, hipD * 1.05], [Tt * 0.22, waistW * 1.04, waistD * 1.06]], { seg: 20, caps: false }), shirtM);
  }

  // ---------- hats, glasses, beards, bags... ----------
  function extras(root, H, hs, L, shirtM, hairColor, R, ua, fa, thigh, shin, ww, b) {
    const ex = L.extra, old = root.userData.stage === 'old';
    if (ex === 'glasses' || ex === 'sunglasses' || (old && ex === 'none' && L.hairStyle !== 'long')) {
      const frame = ex === 'sunglasses' ? C(0x111114, 0.3) : C(0x2a2a30, 0.35, 0.4);
      for (const sx of [-1, 1]) {
        P(H, G.ring(), frame, [sx * 0.034 * hs, 0.137 * hs, 0.099 * hs], [0.021 * hs, 0.017 * hs, 0.02 * hs]);
        if (ex === 'sunglasses') P(H, G.sphere(), C(0x101018, 0.05, 0.6), [sx * 0.034 * hs, 0.137 * hs, 0.097 * hs], [0.02 * hs, 0.016 * hs, 0.006 * hs]);
        P(H, G.box(), frame, [sx * 0.074 * hs, 0.14 * hs, 0.045 * hs], [0.003, 0.003, 0.11 * hs]);
      }
      P(H, G.box(), frame, [0, 0.142 * hs, 0.1 * hs], [0.026 * hs, 0.003, 0.003]);
    }
    if (ex === 'cap') {
      P(H, shell(hs, 1.12, 0.165, 0.2, 'cap'), shirtM);
      P(H, G.cylLo(), shirtM, [0, 0.205 * hs, 0.1 * hs], [0.07 * hs, 0.006, 0.06 * hs], [0.12, 0, 0]);
      P(H, G.sphereLo(), shirtM, [0, 0.262 * hs, -0.006 * hs], 0.008 * hs);
    }
    if (ex === 'bow') {
      for (const sx of [-1, 1]) P(H, G.cone(), C(0xe83a7a, 0.5), [0.055 * hs + sx * 0.02 * hs, 0.23 * hs, -0.02 * hs], [0.016 * hs, 0.03 * hs, 0.01 * hs], [0, 0, sx * PI / 2]);
      P(H, G.sphereLo(), C(0xe83a7a, 0.5), [0.055 * hs, 0.23 * hs, -0.02 * hs], 0.009 * hs);
    }
    if (ex === 'headband') P(H, G.torus(), C(0xd83a3a, 0.7), [0, 0.18 * hs, -0.006 * hs], [0.079 * hs, 0.1 * hs, 0.07 * hs], [PI / 2 + 0.25, 0, 0]);
    if (ex === 'mustache' || ex === 'beard') {
      const hm = hairMat(hairColor);
      for (const sx of [-1, 1]) P(H, G.cap(0.007 * hs, 0.022 * hs), hm, [sx * 0.014 * hs, 0.081 * hs, 0.097 * hs], 1, [0, 0, sx * 1.25]);
      if (ex === 'beard') P(H, Mo.L0('beard' + hs, [[0, 0.06 * hs, 0.05 * hs, 0.056 * hs], [0.02 * hs, 0.1 * hs, 0.1 * hs, 0.045 * hs], [0.05 * hs, 0.128 * hs, 0.15 * hs, 0.024 * hs], [0.085 * hs, 0.142 * hs, 0.18 * hs, 0.004 * hs], [0.12 * hs, 0.149 * hs, 0.19 * hs]], { seg: 20, pow: 2.15 }), hm, [0, -0.004 * hs, 0.0], [1.03, 1, 1.03]);
    }
    if (ex === 'copHat') {
      P(H, G.cyl(), C(0x1a2448, 0.6), [0, 0.235 * hs, -0.005 * hs], [0.085 * hs, 0.05 * hs, 0.1 * hs]);
      P(H, G.cylLo(), M.black(), [0, 0.215 * hs, 0.08 * hs], [0.06 * hs, 0.004, 0.05 * hs], [0.15, 0, 0]);
      P(H, G.cylLo(), M.gold(), [0, 0.245 * hs, 0.098 * hs], [0.012 * hs, 0.003, 0.014 * hs], [PI / 2, 0, 0]);
    }
    if (ex === 'chefHat') {
      P(H, G.cyl(), M.white(), [0, 0.25 * hs, -0.006 * hs], [0.08 * hs, 0.06 * hs, 0.098 * hs]);
      P(H, G.sphere(), M.white(), [0, 0.31 * hs, -0.006 * hs], [0.1 * hs, 0.05 * hs, 0.11 * hs]);
    }
    if (ex === 'crown') {
      P(H, G.cyl(), M.gold(), [0, 0.245 * hs, -0.006 * hs], [0.07 * hs, 0.03 * hs, 0.085 * hs]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2; P(H, G.cone(), M.gold(), [Math.cos(a) * 0.066 * hs, 0.275 * hs, Math.sin(a) * 0.08 * hs - 0.006 * hs], [0.012 * hs, 0.03 * hs, 0.012 * hs]); }
    }
    if (L.bag) {
      const bm = C(L.bag, 0.45);
      P(R.elbowL, G.rbox(0.2 * b, 0.16 * b, 0.07 * b, 0.02), bm, [0.02, -fa * 1.2, 0]);
      P(R.elbowL, G.torus(), bm, [0.02, -fa * 0.85, 0], [0.05 * b, 0.07 * b, 0.05 * b], [0, PI / 2, 0]);
    }
    if (L.cane || (old && L.cane !== false && root.userData.look.cane)) R.cane = P(R.handR, G.cap(0.012, 0.85 * b), M.darkWood(), [0, -0.42 * b, 0.02]);
  }

  // ---------- personality decorations: halo + sparkles, storm cloud, propeller cap ----------
  function setPersona(ch, persona) {
    const R = ch.userData.rig;
    if (!R) return;
    if (R.personaFx) { R.H.remove(R.personaFx); R.personaFx = null; }
    const f = ch.userData.face;
    f.browBias = 0; f.moodBias = 0;
    ch.userData.persona = persona;
    if (!persona) return;
    const hs = R.hr / 0.12;
    const fx = grp(R.H, [0, R.crown + 0.06 * hs, -0.01 * hs]);
    R.personaFx = fx;
    if (persona === 'good') {
      f.moodBias = 0.25;
      const halo = P(fx, G.ring(), E(0xffd84a, 1.4), [0, 0.02 * hs, 0], [0.075 * hs, 0.075 * hs, 0.15 * hs], [PI / 2, 0, 0]);
      halo.castShadow = false;
      fx.userData.sparkles = [0, 1, 2].map(() => sprite(fx, 0xfff0a0, 0.05 * hs, [0, 0, 0]));
    } else if (persona === 'evil') {
      f.browBias = 1;
      const cloud = grp(fx, [0, 0.09 * hs, 0]);
      for (let i = 0; i < 7; i++) { const m = P(cloud, G.sphereLo(), C(0x2a2633, 0.95), [(i - 3) * 0.028 * hs, Math.sin(i * 2) * 0.012 * hs, Math.cos(i * 3) * 0.015 * hs], (0.03 + (i % 2) * 0.012) * hs); m.castShadow = false; }
      fx.userData.cloud = cloud;
      fx.userData.bolt = P(cloud, G.cone(), B(0xd8b0ff), [0, -0.05 * hs, 0], [0.008 * hs, 0.05 * hs, 0.008 * hs], [PI, 0, 0.3]);
      fx.userData.bolt.visible = false;
    } else if (persona === 'funny') {
      f.moodBias = 0.45;
      P(fx, G.hemi(), C(0xe83a3a, 0.6), [0, -0.075 * hs, 0], [0.075 * hs, 0.05 * hs, 0.092 * hs]);
      P(fx, G.cylLo(), M.metal(), [0, -0.03 * hs, 0], [0.003, 0.025 * hs, 0.003]);
      const prop = grp(fx, [0, -0.015 * hs, 0]);
      P(prop, G.rbox(0.12 * hs, 0.003, 0.02 * hs, 0.002), C(0x3ac8ff, 0.5), [0, 0, 0]);
      P(prop, G.rbox(0.02 * hs, 0.003, 0.12 * hs, 0.002), C(0xffd84a, 0.5), [0, 0.001, 0]);
      fx.userData.prop = prop;
    }
  }
  function animatePersona(ch, t) {
    const R = ch.userData.rig;
    const fx = R && R.personaFx;
    if (!fx) return;
    const u = fx.userData, hs = R.hr / 0.12;
    if (u.sparkles) u.sparkles.forEach((s, i) => { const a = t * 1.6 + i * 2.1; s.position.set(Math.cos(a) * 0.12 * hs, Math.sin(t * 3 + i) * 0.04 * hs - 0.06 * hs, Math.sin(a) * 0.12 * hs); s.scale.setScalar((0.035 + Math.sin(t * 5 + i) * 0.015) * hs); });
    if (u.cloud) { u.cloud.position.x = Math.sin(t * 0.8) * 0.02 * hs; u.bolt.visible = (t % 2.7) < 0.12; }
    if (u.prop) u.prop.rotation.y = t * 14;
  }

  // ============================================================
  //  MOVING: walking, sitting, dancing, crying...
  //  s = { speed, pose, pt (time in pose), mood, talk, sleepy }
  //  a = arm lift forward, z = arm out to the side, e = elbow bend
  // ============================================================
  const o = {};
  const ap = (obj, prop, target, k) => { obj[prop] += (target - obj[prop]) * k; };
  function animatePerson(ch, dt, s) {
    const R = ch.userData.rig;
    const ud = ch.userData;
    ud.t = (ud.t || 0) + dt;
    const t = ud.t;
    const moving = s.speed > 0.05;
    const legLen = R.thigh + R.shin;
    ud.phase = (ud.phase || 0) + dt * (moving ? 2.2 + s.speed * 3.2 / Math.max(0.35, legLen) : 0);
    const ph = ud.phase;
    const pose = s.pose || 'stand', pt = s.pt || 0;
    const old = ud.stage === 'old', baby = ud.stage === 'baby';
    o.hipY = R.hipY; o.hipRX = 0; o.hipRZ = 0; o.torRX = old ? 0.14 : 0; o.torRZ = 0; o.headRX = old ? -0.1 : 0; o.headRZ = Math.sin(t * 1.3) * 0.03; o.headRY = 0;
    o.aLX = 0.05; o.aLZ = 0.08; o.aRX = 0.05; o.aRZ = -0.08; o.eL = 0.18; o.eR = 0.18; o.ezL = 0; o.ezR = 0;
    o.lLX = 0; o.lRX = 0; o.kL = 0; o.kR = 0; o.lLZ = 0; o.lRZ = 0;
    let mood = s.mood || 0, open = s.talk ? 0.35 + Math.sin(t * 18) * 0.35 : 0, sleepy = s.sleepy || 0;
    const breathe = Math.sin(t * 2) * 0.003;
    const sitHip = R.shin + R.foot + 0.02;
    const k1 = Math.sin(t * 7);

    switch (pose) {
      case 'sit': case 'type': case 'drive': case 'swing': case 'read': case 'eat': case 'babysit': case 'phone': case 'sitTalk': {
        if (pose === 'babysit' || (baby && pose !== 'drive')) {
          o.hipY = R.hipY * 0.22; o.lLX = o.lRX = -1.45; o.lLZ = 0.3; o.lRZ = -0.3; o.kL = o.kR = 0.25;
          o.aLX = -0.5 + Math.sin(t * 4) * 0.25; o.aRX = -0.5 - Math.sin(t * 4) * 0.25; o.eL = o.eR = 0.6;
        } else { o.hipY = sitHip; o.lLX = o.lRX = -1.5; o.kL = o.kR = 1.5; o.aLX = o.aRX = -0.45; o.eL = o.eR = 0.55; o.aLZ = 0.15; o.aRZ = -0.15; }
        if (pose === 'type') { o.aLX = o.aRX = -0.55; o.eL = 1.15 + Math.sin(t * 20) * 0.04; o.eR = 1.15 + Math.cos(t * 19) * 0.04; o.aLZ = -0.05; o.aRZ = 0.05; o.headRX = 0.12; }
        if (pose === 'drive') { o.aLX = o.aRX = -0.85; o.eL = o.eR = 0.75; o.aLZ = 0.05; o.aRZ = -0.05; o.headRZ = Math.sin(t * 2) * 0.05; }
        if (pose === 'swing') { o.torRX = Math.sin(t * 3) * 0.2; o.aLX = o.aRX = -2.7; o.eL = o.eR = 0.1; }
        if (pose === 'read') { o.aLX = o.aRX = -0.5; o.eL = o.eR = 1.55; o.aLZ = -0.12; o.aRZ = 0.12; o.headRX = 0.35; }
        if (pose === 'eat') { o.aRX = -0.75; o.aRZ = 0.12; o.eR = 2.15 + Math.sin(t * 9) * 0.2; open = 0.15 + Math.max(0, Math.sin(t * 9)) * 0.5; mood = Math.max(mood, 0.6); }
        if (pose === 'phone') { o.aRX = -0.45; o.eR = 1.7; o.aRZ = 0.1; o.headRX = 0.38; }
        if (pose === 'sitTalk') { o.aRX = -0.6; o.eR = 1.0 + Math.sin(t * 3) * 0.3; open = 0.35 + Math.sin(t * 18) * 0.35; }
        break;
      }
      case 'eatStand': o.aRX = -0.75; o.aRZ = 0.12; o.eR = 2.15 + Math.sin(t * 9) * 0.2; open = 0.15 + Math.max(0, Math.sin(t * 9)) * 0.5; mood = Math.max(mood, 0.6); break;
      case 'crawl': {
        o.hipY = R.thigh * 0.95 + 0.03; o.hipRX = 1.4; o.headRX = -1.15;
        const c = moving ? Math.sin(ph) * 0.32 : 0;
        o.aLX = -1.4 + c; o.aRX = -1.4 - c; o.eL = o.eR = 0.05; o.lLX = -1.45 - c; o.lRX = -1.45 + c; o.kL = o.kR = 1.55;
        break;
      }
      case 'lie': case 'sleep': case 'fall': case 'dead':
        o.hipY = 0.12 * (R.hipY / 0.92); o.hipRX = -1.52; o.headRX = 0.08; o.aLZ = 0.18; o.aRZ = -0.18; o.eL = o.eR = 0.3;
        if (pose === 'sleep' || pose === 'dead') sleepy = 1;
        if (pose === 'fall') { mood = -0.5; open = 0.6; o.aLZ = 1.0; o.aRZ = -1.0; o.lLZ = 0.25; o.lRZ = -0.25; o.kL = 0.6; }
        break;
      case 'dance':
        o.hipY = R.hipY - Math.abs(k1) * legLen * 0.07; o.hipRZ = k1 * 0.1; o.torRZ = -k1 * 0.12;
        o.aLX = -2.2 + Math.sin(t * 7) * 0.4; o.aRX = -2.2 - Math.sin(t * 7) * 0.4; o.aLZ = 0.35; o.aRZ = -0.35; o.eL = o.eR = 0.7;
        o.lLX = Math.max(0, k1) * -0.5; o.lRX = Math.max(0, -k1) * -0.5; o.kL = Math.max(0, k1) * 0.9; o.kR = Math.max(0, -k1) * 0.9;
        o.headRZ = k1 * 0.15; mood = 1; open = 0.3;
        break;
      case 'silly': {
        const k = Math.sin(t * 12);
        o.hipRZ = k * 0.15; o.torRZ = -k * 0.25; o.headRZ = k * 0.3; o.aLZ = 1.3 + k * 0.4; o.aRZ = -1.3 + k * 0.4; o.ezL = 0.6 * k; o.ezR = 0.6 * k; o.lLZ = 0.15; o.lRZ = -0.15; o.kL = o.kR = 0.4;
        mood = 1; open = 0.7;
        break;
      }
      case 'wave': o.aRZ = -2.5; o.aRX = -0.2; o.eR = 0; o.ezR = -0.35 + Math.sin(t * 10) * 0.45; mood = Math.max(mood, 0.7); break;
      case 'cry': o.aLX = o.aRX = -0.75; o.eL = o.eR = 2.3; o.aLZ = -0.25; o.aRZ = 0.25; o.headRX = 0.42; o.torRX += 0.1 + Math.abs(Math.sin(t * 8)) * 0.04; mood = -1; open = 0.4 + Math.sin(t * 9) * 0.2; break;
      case 'sad': o.headRX = 0.45; o.torRX += 0.12; o.aLZ = 0.03; o.aRZ = -0.03; o.eL = o.eR = 0.1; mood = -0.8; break;
      case 'cheer': {
        const j = Math.abs(Math.sin(t * 7));
        o.hipY = R.hipY + j * legLen * 0.12; o.aLX = o.aRX = -2.9; o.aLZ = 0.4 + j * 0.2; o.aRZ = -0.4 - j * 0.2; o.eL = o.eR = 0.25; mood = 1; open = 0.8;
        break;
      }
      case 'hug': o.aLX = o.aRX = -1.3; o.aLZ = -0.3; o.aRZ = 0.3; o.eL = o.eR = 0.9; o.torRX += 0.1; mood = 1; break;
      case 'laugh': o.torRX = -0.2 + Math.sin(t * 16) * 0.05; o.headRX = -0.3; o.aLX = o.aRX = -0.25; o.eL = o.eR = 1.3; o.aLZ = -0.2; o.aRZ = 0.2; mood = 1; open = 0.6 + Math.sin(t * 16) * 0.3; break;
      case 'angry': o.aLX = -1.0 + Math.sin(t * 16) * 0.15; o.aRX = -1.0 + Math.cos(t * 16) * 0.15; o.eL = o.eR = 1.7; o.aLZ = 0.15; o.aRZ = -0.15; mood = -1; open = 0.35; break;
      case 'evilLaugh': o.torRX = -0.18; o.headRX = -0.3; o.aLX = o.aRX = -0.55; o.eL = o.eR = 1.7; o.aLZ = -0.32; o.aRZ = 0.32; o.ezL = Math.sin(t * 20) * 0.08; mood = 0.8; open = 0.6 + Math.sin(t * 14) * 0.3; break;
      case 'scared': o.aLX = -1.1 + Math.sin(t * 22) * 0.12; o.aRX = -1.1 + Math.cos(t * 24) * 0.12; o.eL = o.eR = 2.0; o.aLZ = 0.15; o.aRZ = -0.15; o.torRX = -0.15; mood = -0.6; open = 0.9; break;
      case 'point': o.aRX = -1.5; o.aRZ = 0.08; o.eR = 0.05; break;
      case 'think': o.aRX = -0.6; o.aRZ = 0.25; o.eR = 2.35; o.aLX = -0.3; o.eL = 1.4; o.aLZ = -0.2; o.headRZ = 0.12; o.headRX = -0.08; break;
      case 'flex': { const k = Math.sin(t * 5) * 0.1; o.aLZ = 1.45 + k; o.aRZ = -1.45 - k; o.ezL = 1.5; o.ezR = -1.5; o.eL = o.eR = 0; mood = 1; break; }
      case 'facepalm': o.aRX = -0.8; o.aRZ = 0.3; o.eR = 2.3; o.headRX = 0.3; mood = -0.4; break;
      case 'clap': o.aLX = o.aRX = -0.8; o.eL = o.eR = 1.2; o.aLZ = -0.2 - Math.max(0, Math.sin(t * 16)) * 0.15; o.aRZ = 0.2 + Math.max(0, Math.sin(t * 16)) * 0.15; mood = 1; open = 0.3; break;
      case 'sneak': o.hipY = R.hipY * 0.85; o.lLX = o.lRX = -0.4; o.kL = o.kR = 0.8; o.torRX = 0.4; o.aLX = o.aRX = -0.5; o.eL = o.eR = 0.9; o.headRX = -0.3; break;
      case 'shrug': o.aLZ = 0.35; o.aRZ = -0.35; o.aLX = o.aRX = -0.25; o.eL = o.eR = 1.5; o.headRZ = 0.18; break;
      case 'kneel': o.hipY = R.thigh + R.foot * 0.5 + 0.02; o.lLX = -1.5; o.kL = 1.5; o.lRX = 0; o.kR = 1.57; o.aLX = o.aRX = -0.5; o.eL = o.eR = 0.6; break;
      case 'bow': o.torRX = 0.7; o.headRX = 0.2; break;
      case 'kick': o.lRX = pt < 0.25 ? 0.6 : pt < 0.55 ? -1.4 : -0.2; o.kR = pt < 0.25 ? 1.2 : 0.1; o.aLZ = 0.6; o.aRZ = -0.6; break;
      case 'throw': o.aRX = pt < 0.3 ? 1.0 : pt < 0.6 ? -1.9 : -0.6; o.eR = pt < 0.3 ? 1.4 : 0.1; o.torRX = pt < 0.3 ? -0.15 : 0.15; break;
      case 'give': o.aRX = -1.1; o.aRZ = 0.08; o.eR = 0.45; mood = Math.max(mood, 0.6); break;
      case 'hold': o.aRX = o.aLX = -0.45; o.eL = o.eR = 1.3; o.aLZ = -0.12; o.aRZ = 0.12; break;
      case 'sing': o.aLX = o.aRX = -0.7; o.aLZ = 0.45; o.aRZ = -0.45; o.eL = o.eR = 0.6; o.headRX = -0.2; mood = 1; open = 0.4 + Math.abs(Math.sin(t * 5)) * 0.5; break;
      case 'yell': o.aLX = o.aRX = -0.3; o.aLZ = 0.3; o.aRZ = -0.3; o.eL = o.eR = 1.0; o.torRX = -0.1; mood = -0.7; open = 1; break;
      case 'cook': o.aRX = -0.6; o.eR = 1.2 + Math.sin(t * 8) * 0.12; o.aRZ = 0.15 + Math.cos(t * 8) * 0.1; o.aLX = -0.5; o.eL = 1.1; o.headRX = 0.25; break;
      case 'sweep': o.aLX = o.aRX = -0.6 + Math.sin(t * 6) * 0.25; o.eL = o.eR = 0.8; o.aLZ = -0.25; o.aRZ = 0.25; o.torRX = 0.2; break;
      case 'stretch': o.aLX = o.aRX = -3.0; o.aLZ = 0.18; o.aRZ = -0.18; o.eL = o.eR = 0.1; o.torRX = -0.1; open = 0.7; sleepy = 0.5; break;
      case 'surprised': o.aLX = o.aRX = -0.3; o.aLZ = 0.55; o.aRZ = -0.55; o.eL = o.eR = 1.2; o.torRX = -0.1; mood = 0.3; open = 0.95; break;
      case 'smug': o.aLX = o.aRX = -0.45; o.aLZ = -0.22; o.aRZ = 0.22; o.eL = o.eR = 2.0; o.headRX = -0.15; mood = 0.5; break;
      case 'film': o.aRX = -1.05; o.aRZ = 0.12; o.eR = 0.95; o.aLX = -0.6; o.eL = 1.2; open = 0.35 + Math.sin(t * 18) * 0.3; mood = 1; break;
      case 'shake': o.aRX = -0.85; o.aRZ = 0.12; o.eR = 0.7 + Math.sin(t * 14) * 0.06; mood = Math.max(mood, 0.5); break;
      default: break; // stand
    }
    // walking
    if (moving && pose !== 'crawl' && pose !== 'drive') {
      const k = U.clamp(s.speed / 1.3, 0, 1.6);
      const sw = Math.sin(ph) * 0.55 * Math.min(1.1, k);
      o.lLX = sw; o.lRX = -sw; o.kL = Math.max(0, -Math.sin(ph + 0.6)) * 1.0 * k + 0.05; o.kR = Math.max(0, Math.sin(ph + 0.6)) * 1.0 * k + 0.05;
      if (pose === 'stand' || pose === 'sad' || pose === 'sneak') { o.aLX = -sw * 0.75; o.aRX = sw * 0.75; o.eL = 0.3 + Math.max(0, -sw) * 0.5; o.eR = 0.3 + Math.max(0, sw) * 0.5; }
      o.hipY = (pose === 'sneak' ? R.hipY * 0.85 : R.hipY) - (1 - Math.abs(Math.cos(ph))) * 0.025 * k;
      o.hipRZ = Math.sin(ph) * 0.03 * k; o.torRZ = -Math.sin(ph) * 0.04 * k;
      o.torRX += 0.04 * k;
      o.hipRX = 0;
    }
    const k = Math.min(1, dt * 12);
    ap(R.hips.position, 'y', o.hipY + breathe, k);
    ap(R.hips.rotation, 'x', o.hipRX, k); ap(R.hips.rotation, 'z', o.hipRZ, k);
    ap(R.torso.rotation, 'x', o.torRX, k); ap(R.torso.rotation, 'z', o.torRZ, k);
    ap(R.head.rotation, 'x', o.headRX, k); ap(R.head.rotation, 'z', o.headRZ, k); ap(R.head.rotation, 'y', o.headRY, k);
    ap(R.armL.rotation, 'x', o.aLX, k); ap(R.armL.rotation, 'z', o.aLZ, k);
    ap(R.armR.rotation, 'x', o.aRX, k); ap(R.armR.rotation, 'z', o.aRZ, k);
    ap(R.elbowL.rotation, 'x', -o.eL, k); ap(R.elbowR.rotation, 'x', -o.eR, k);
    ap(R.elbowL.rotation, 'z', o.ezL, k); ap(R.elbowR.rotation, 'z', o.ezR, k);
    ap(R.legL.rotation, 'x', o.lLX, k); ap(R.legR.rotation, 'x', o.lRX, k);
    ap(R.legL.rotation, 'z', o.lLZ, k); ap(R.legR.rotation, 'z', o.lRZ, k);
    ap(R.kneeL.rotation, 'x', o.kL, k); ap(R.kneeR.rotation, 'x', o.kR, k);
    setMood(ch, mood, open);
    animateFace(ch, t, dt, sleepy);
    animatePersona(ch, t);
  }

  Object.assign(Mo, { person, setPersona, animatePerson, STAGES });
})();
