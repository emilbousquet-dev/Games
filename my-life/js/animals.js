// ============================================================
//  MY LIFE — REALISTIC PETS 🐶 🐱 🦜
// ============================================================
window.ML = window.ML || {};

(function () {
  const U = ML.U, T = ML.Tex, Mo = ML.Models;
  const { P, G, C, M, grp, std, blobShadow, L0, makeEye, animateFace } = Mo;
  const PI = Math.PI;
  const fur = (c) => std('fur' + c, { color: c, map: T.hairTex(), roughness: 0.92 });
  const shade = (c, k) => T.shade(c, k);

  function pet(kind, color = 0xc8904a) {
    const root = new THREE.Group();
    const R = { legs: [], lows: [], kind };
    root.userData = { rig: R, kind: 'pet', petKind: kind, face: { eyes: [], brows: [], mouth: null }, blinkOff: Math.random() * 4 };
    if (kind === 'parrot') return parrot(root, R, color);
    const cat = kind === 'cat';
    const s = cat ? 0.6 : 1;               // a cat is smaller
    const F = fur(color), F2 = fur(shade(color, cat ? 0.5 : 0.35)), Fd = fur(shade(color, -0.35));
    const legH = 0.34 * s;
    const body = grp(root, [0, legH + 0.04 * s, 0]);
    R.body = body;
    R.bodyY = body.position.y;
    // the body is a long loft lying down (front = +z)
    const torso = grp(body, [0, 0, 0], [PI / 2, 0, 0]);
    P(torso, L0(kind + 'body', cat
      ? [[-0.27, 0.13, 0.15], [-0.18, 0.15, 0.17], [0, 0.14, 0.16, 0.01], [0.16, 0.15, 0.17], [0.25, 0.12, 0.14], [0.29, 0.07, 0.08]]
      : [[-0.3, 0.17, 0.19], [-0.22, 0.2, 0.23], [0, 0.18, 0.22, 0.02], [0.17, 0.21, 0.27, -0.01], [0.27, 0.18, 0.23, -0.02], [0.33, 0.1, 0.13, -0.03]], { seg: 16 }), F, [0, 0, 0], [s, s, s]);
    P(body, G.sphere(), F2, [0, -0.07 * s, 0.17 * s], [0.08 * s, 0.07 * s, 0.1 * s]); // light chest
    // neck & head
    P(body, G.cap(0.06 * s, 0.12 * s), F, [0, 0.08 * s, 0.27 * s], 1, [0.7, 0, 0]);
    const head = grp(body, [0, 0.17 * s, 0.35 * s]);
    R.head = head;
    P(head, G.sphere(), F, [0, 0, 0], [0.085 * s, 0.08 * s, 0.09 * s]);
    if (cat) {
      P(head, G.sphere(), F2, [0, -0.025 * s, 0.065 * s], [0.045 * s, 0.03 * s, 0.035 * s]);
      P(head, G.sphereLo(), C(0xe88a9a, 0.5), [0, -0.012 * s, 0.093 * s], [0.012, 0.008, 0.008]);
      for (const sx of [-1, 1]) {
        P(head, G.cone(), F, [sx * 0.05 * s, 0.075 * s, -0.005], [0.03 * s, 0.06 * s, 0.018 * s], [-0.1, 0, -sx * 0.25]);
        P(head, G.cone(), C(0xe8a0a8, 0.8), [sx * 0.05 * s, 0.072 * s, 0.004], [0.018 * s, 0.04 * s, 0.006 * s], [-0.1, 0, -sx * 0.25]);
        for (const dy of [-0.006, 0.006]) P(head, G.box(), M.white(), [sx * 0.06 * s, -0.022 * s + dy, 0.07 * s], [0.07 * s, 0.0012, 0.0012], [0, sx * 0.25, 0]);
      }
    } else {
      // snout, nose, mouth, ears
      P(head, Mo.L0('snout', [[0, 0.075, 0.07, -0.005], [0.06, 0.06, 0.055, -0.012], [0.11, 0.042, 0.04, -0.016]], { seg: 12 }), F2, [0, -0.02, 0.04], [1, 1, 1], [PI / 2, 0, 0]);
      P(head, G.sphere(), C(0x141416, 0.25), [0, -0.008, 0.155], [0.022, 0.017, 0.016]);
      P(head, G.box(), C(0x2a1a1a, 0.6), [0, -0.05, 0.12], [0.04, 0.004, 0.03]);
      const floppy = ((color >> 16) & 255) > 120;
      R.ears = [-1, 1].map((sx) => {
        const e = grp(head, [sx * 0.065, 0.05, -0.02]);
        if (floppy) P(e, G.sphere(), Fd, [sx * 0.02, -0.05, 0], [0.022, 0.07, 0.045], [0, 0, sx * 0.2]);
        else P(e, G.cone(), Fd, [sx * 0.005, 0.05, 0], [0.035, 0.08, 0.02], [0, 0, -sx * 0.2]);
        return e;
      });
      R.tongue = P(head, G.sphere(), M.tongue(), [0, -0.065, 0.11], [0.022, 0.006, 0.035]);
      R.tongue.userData.anim = true;
    }
    const f = root.userData.face;
    for (const sx of [-1, 1]) f.eyes.push(makeEye(head, [sx * 0.04 * s, 0.025 * s, 0.07 * s], 0.016 * s, cat ? 0x9ad04a : 0x3a2414, F));
    // legs with a joint in the middle
    for (const [x, z, back] of [[0.065, 0.2, 0], [-0.065, 0.2, 0], [0.07, -0.22, 1], [-0.07, -0.22, 1]]) {
      const l = grp(body, [x * s, -0.02 * s, z * s]);
      P(l, G.cap((back ? 0.045 : 0.036) * s, legH * 0.42), F, [0, -legH * 0.24, back ? -0.015 * s : 0]);
      const low = grp(l, [0, -legH * 0.5, back ? -0.02 * s : 0]);
      P(low, G.cap(0.026 * s, legH * 0.4), F, [0, -legH * 0.22, 0]);
      P(low, G.sphere(), F2, [0, -legH * 0.48, 0.015 * s], [0.032 * s, 0.02 * s, 0.042 * s]);
      R.legs.push(l); R.lows.push(low);
    }
    // tail
    const tail = grp(body, [0, 0.05 * s, -0.3 * s], [cat ? -0.25 : -0.8, 0, 0]);
    P(tail, G.cap(cat ? 0.018 : 0.025, cat ? 0.3 : 0.2), F, [0, cat ? 0.17 : 0.11, 0]);
    R.tail = tail;
    root.userData.height = legH + 0.32 * s;
    blobShadow(root, 0.2 * s, 0.4 * s);
    return root;
  }

  function parrot(root, R, color) {
    const F = fur(color);
    const wingC = fur(color === 0xe83a3a || color === 0xd8302a ? 0x2a6ae8 : T.shade(color, -0.3));
    const body = grp(root, [0, 0.24, 0]);
    R.body = body;
    P(body, L0('parrotbody', [[-0.14, 0.04, 0.05, -0.02], [-0.08, 0.1, 0.11, -0.01], [0, 0.12, 0.12], [0.08, 0.1, 0.1, 0.01], [0.13, 0.06, 0.06, 0.015]], { seg: 14 }), F, [0, 0, 0], 1, [0.35, 0, 0]);
    const head = grp(body, [0, 0.15, 0.04]);
    R.head = head;
    P(head, G.sphere(), F, [0, 0, 0], [0.055, 0.058, 0.06]);
    P(head, G.sphere(), M.white(), [0, 0.0, 0.035], [0.04, 0.03, 0.03]);
    P(head, G.cone(), C(0x2a2a2a, 0.3), [0, -0.012, 0.07], [0.02, 0.05, 0.022], [PI / 2 + 0.6, 0, 0]);
    P(head, G.sphere(), C(0x2a2a2a, 0.3), [0, 0.004, 0.06], [0.022, 0.02, 0.02]);
    const f = root.userData.face;
    for (const sx of [-1, 1]) f.eyes.push(makeEye(head, [sx * 0.04, 0.012, 0.03], 0.012, 0xf2d84a, F));
    R.wings = [-1, 1].map((sx) => {
      const w = grp(body, [sx * 0.055, 0.06, -0.01]);
      P(w, G.sphere(), wingC, [sx * 0.008, -0.07, -0.02], [0.02, 0.11, 0.06], [0.3, 0, 0]);
      P(w, G.sphere(), fur(0xf2c83a), [sx * 0.012, -0.02, 0.01], [0.015, 0.05, 0.04], [0.3, 0, 0]);
      return w;
    });
    P(body, G.box(), wingC, [0, -0.2, -0.09], [0.035, 0.2, 0.008], [0.45, 0, 0]);
    P(body, G.box(), F, [0, -0.17, -0.085], [0.025, 0.14, 0.009], [0.45, 0, 0]);
    for (const sx of [-1, 1]) {
      P(root, G.cap(0.008, 0.05), C(0x6a6a72, 0.6), [sx * 0.025, 0.09, 0.0]);
      P(root, G.cap(0.006, 0.03), C(0x6a6a72, 0.6), [sx * 0.025, 0.065, 0.015], 1, [PI / 2, 0, 0]);
    }
    root.userData.height = 0.45;
    blobShadow(root, 0.1);
    return root;
  }

  function animatePet(p, dt, s) {
    const R = p.userData.rig;
    const ud = p.userData;
    ud.t = (ud.t || 0) + dt;
    const t = ud.t;
    const moving = s.speed > 0.05;
    ud.phase = (ud.phase || 0) + dt * (moving ? 6 + s.speed * 6 : 0);
    if (R.kind === 'parrot') {
      const flap = s.pose === 'fly' || moving;
      R.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * (flap ? 0.5 + Math.sin(t * 30) * 0.7 : 0.03); });
      R.body.position.y = (flap ? 0.36 + Math.sin(t * 8) * 0.03 : 0.24) + (s.pose === 'happy' ? Math.abs(Math.sin(t * 8)) * 0.05 : 0);
      R.head.rotation.z = Math.sin(t * 2.3) * 0.25;
      R.head.rotation.x = s.talk ? Math.sin(t * 20) * 0.2 : Math.sin(t * 1.1) * 0.1;
      animateFace(p, t, dt, 0);
      return;
    }
    const sw = moving ? Math.sin(ud.phase) * 0.55 : 0;
    const legs = R.legs, lows = R.lows;
    legs[0].rotation.x = sw; legs[3].rotation.x = sw; legs[1].rotation.x = -sw; legs[2].rotation.x = -sw;
    lows.forEach((l, i) => { l.rotation.x = moving ? Math.max(0, Math.sin(ud.phase + (i === 0 || i === 3 ? 0 : PI) + 1)) * (i < 2 ? 0.6 : -0.6) : 0; });
    const happy = s.pose === 'happy' || s.mood > 0.5;
    R.tail.rotation.z = Math.sin(t * (happy ? 18 : 3)) * (happy ? 0.6 : 0.2);
    if (s.pose === 'sit') {
      R.body.rotation.x = -0.5; R.body.position.y = R.bodyY * 0.8;
      legs[2].rotation.x = legs[3].rotation.x = -1.0; lows[2].rotation.x = lows[3].rotation.x = 1.4;
      legs[0].rotation.x = legs[1].rotation.x = 0.45;
    } else if (s.pose === 'lie' || s.pose === 'sleep') {
      R.body.rotation.x = 0; R.body.position.y = R.bodyY * 0.35;
      legs.forEach((l) => { l.rotation.x = -1.3; }); lows.forEach((l) => { l.rotation.x = 1.2; });
    } else {
      R.body.rotation.x = 0;
      R.body.position.y = R.bodyY + (happy ? Math.abs(Math.sin(t * 9)) * 0.03 : 0) + (moving ? Math.abs(Math.sin(ud.phase)) * 0.015 : 0);
    }
    R.head.rotation.x = s.talk ? -0.25 + Math.sin(t * 22) * 0.12 : Math.sin(t * 1.4) * 0.06;
    R.head.rotation.y = Math.sin(t * 0.7) * 0.2;
    if (R.tongue) R.tongue.visible = happy || moving;
    if (R.ears) R.ears.forEach((e, i) => { e.rotation.z = (i ? -1 : 1) * (0.05 + Math.sin(t * 3 + i) * 0.06); });
    animateFace(p, t, dt, s.pose === 'sleep' ? 1 : 0);
  }

  Object.assign(Mo, { pet, animatePet });
})();
