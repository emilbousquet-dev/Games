// ============================================================
//  MY LIFE — REALISTIC VEHICLES 🚲 🚗 🏎️ 🚕 🚌
// ============================================================
window.ML = window.ML || {};

(function () {
  const U = ML.U, Mo = ML.Models;
  const { P, G, C, E, M, grp, std, blobShadow, L0, tube, paint } = Mo;
  const PI = Math.PI;
  const glass = () => Mo.mats.carGlass || (Mo.mats.carGlass = new THREE.MeshPhysicalMaterial({ color: 0x1a2430, roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.72, clearcoat: 1 }));
  const chrome = () => C(0xd8dce4, 0.15, 1);
  const rubber = () => C(0x18181a, 0.88);
  const plastic = () => C(0x1e1f22, 0.6);

  // a lying-down loft: rings go from the back of the car (-z) to the front (+z)
  // ring = [z, width, height, centerHeight]
  function body(parent, key, rings, mat, pow) {
    const g = grp(parent, [0, 0, 0], [PI / 2, 0, 0]);
    P(g, L0('car' + key, rings.map((r) => [r[0], r[1], r[2], -r[3]]), { pow: pow || 4, seg: 28, sub: 3 }), mat);
    return g;
  }
  function wheel(root, list, x, z, r, w, rimColor) {
    const wg = grp(root, [x, r, z]);
    const sp = grp(wg, [0, 0, 0], [0, 0, PI / 2]);
    P(sp, G.cyl(), rubber(), [0, 0, 0], [r, w, r]);
    P(sp, G.torus(), rubber(), [0, w * 0.5, 0], [r * 0.86, r * 0.86, r * 0.5], [PI / 2, 0, 0]);
    P(sp, G.torus(), rubber(), [0, -w * 0.5, 0], [r * 0.86, r * 0.86, r * 0.5], [PI / 2, 0, 0]);
    const rim = C(rimColor || 0xc8ccd4, 0.2, 0.9);
    const side = x > 0 ? -1 : 1; // the rim faces outward
    P(sp, G.cyl(), rim, [0, side * w * 0.52, 0], [r * 0.64, 0.02, r * 0.64]);
    P(sp, G.cyl(), C(0x2a2a2e, 0.5), [0, side * w * 0.5, 0], [r * 0.56, 0.025, r * 0.56]);
    for (let i = 0; i < 5; i++) P(sp, G.box(), rim, [0, side * w * 0.54, 0], [r * 1.05, 0.02, 0.05], [0, i * PI / 5 * 2, 0]);
    P(sp, G.cyl(), chrome(), [0, side * w * 0.56, 0], [r * 0.15, 0.02, r * 0.15]);
    list.push(wg);
    return wg;
  }

  function vehicle(kind, color = 0xc8202a) {
    const root = new THREE.Group();
    const wheels = [];
    if (kind === 'bike') return bike(root, wheels, color);
    if (kind === 'bus') return bus(root, wheels, color);
    const sports = kind === 'sports', taxi = kind === 'taxi';
    const pm = paint(taxi ? 0xf2c21a : color);
    const W = sports ? 1.9 : 1.8, Lh = sports ? 2.25 : 2.25;
    const k = sports ? 0.82 : 1; // sports cars are lower
    // lower body
    body(root, kind + 'low', sports
      ? [[-2.25, 1.7, 0.36, 0.52], [-2.1, 1.88, 0.5, 0.6], [-1.5, 1.92, 0.58, 0.64], [-0.4, 1.86, 0.52, 0.62], [0.9, 1.9, 0.46, 0.58], [1.8, 1.86, 0.34, 0.52], [2.25, 1.6, 0.2, 0.46]]
      : [[-2.25, 1.62, 0.42, 0.62], [-2.1, 1.76, 0.6, 0.72], [-1.6, 1.8, 0.66, 0.75], [-0.6, 1.8, 0.62, 0.73], [0.9, 1.8, 0.6, 0.72], [1.7, 1.78, 0.5, 0.68], [2.15, 1.7, 0.38, 0.62], [2.28, 1.5, 0.26, 0.58]], pm);
    // windows (tinted glass) and roof
    const cab = sports
      ? [[-1.25, 1.2, 0.1, 0.9], [-0.9, 1.34, 0.42, 1.04], [-0.3, 1.36, 0.46, 1.06], [0.25, 1.34, 0.4, 1.03], [0.85, 1.24, 0.08, 0.88]]
      : [[-1.55, 1.3, 0.12, 1.08], [-1.2, 1.42, 0.5, 1.28], [-0.9, 1.45, 0.62, 1.34], [0.2, 1.46, 0.62, 1.34], [0.55, 1.45, 0.5, 1.28], [1.05, 1.4, 0.1, 1.08]];
    body(root, kind + 'cab', cab, glass(), 3);
    const roofY = sports ? 1.29 : 1.645;
    P(root, G.rbox(sports ? 1.2 : 1.3, 0.05, sports ? 0.85 : 1.25, 0.025), pm, [0, roofY, sports ? -0.25 : -0.35]);
    // pillars
    for (const sx of [-1, 1]) {
      tube(root, [sx * 0.66, sports ? 0.93 : 1.1, sports ? 0.82 : 1.0], [sx * 0.62, roofY - 0.01, sports ? 0.2 : 0.3], 0.035, pm);
      tube(root, [sx * 0.68, sports ? 0.93 : 1.1, sports ? -1.2 : -1.5], [sx * 0.62, roofY - 0.01, sports ? -0.7 : -1.0], 0.045, pm);
      if (!sports) tube(root, [sx * 0.72, 1.08, -0.35], [sx * 0.64, roofY - 0.01, -0.35], 0.03, pm);
    }
    // wheel wells (dark) and wheels
    const r = sports ? 0.35 : 0.34, wz = sports ? [1.42, -1.38] : [1.4, -1.4];
    for (const sx of [-1, 1]) for (const z of wz) {
      P(root, G.cylLo(), C(0x0e0e10, 0.9), [sx * (W / 2 + 0.003), r, z], [r * 1.18, 0.02, r * 1.18], [0, 0, PI / 2]);
      wheel(root, wheels, sx * (W / 2 - 0.06), z, r, sports ? 0.28 : 0.23, sports ? 0x2a2a2e : undefined);
    }
    // lights, grille, bumpers, plates, mirrors, handles
    const fz = Lh * (sports ? 0.98 : 0.995), bz = -Lh * 0.995;
    for (const sx of [-1, 1]) {
      P(root, G.sphere(), E(0xf8f4e8, 0.5), [sx * W * 0.34, 0.72 * k, fz - 0.06], [0.2, 0.065, 0.06], [0, sx * 0.15, 0]);
      P(root, G.rbox(0.36, 0.1, 0.05, 0.02), E(0xd81a1a, 0.6), [sx * W * 0.35, 0.86 * k, bz + 0.02]);
      P(root, G.rbox(0.07, 0.07, 0.16, 0.02), pm, [sx * (W / 2 + 0.06), sports ? 0.95 : 1.12, sports ? 0.75 : 0.95]); // mirror
      P(root, G.box(), C(0x0e0e10, 0.7), [sx * (W / 2 + 0.004), 0.85 * k, 0.3], [0.004, 0.5 * k, 0.012]); // door lines
      P(root, G.box(), C(0x0e0e10, 0.7), [sx * (W / 2 + 0.004), 0.85 * k, -0.85], [0.004, 0.5 * k, 0.012]);
      P(root, G.rbox(0.02, 0.025, 0.12, 0.008), chrome(), [sx * (W / 2 + 0.01), 0.95 * k, 0.1]);
    }
    P(root, G.rbox(0.9, 0.16, 0.06, 0.02), plastic(), [0, 0.62 * k, fz - 0.01]);
    for (let i = 0; i < 4; i++) P(root, G.box(), chrome(), [0, 0.57 * k + i * 0.035, fz + 0.012], [0.86, 0.008, 0.01]);
    P(root, G.rbox(W * 0.9, 0.08, 0.08, 0.03), plastic(), [0, 0.42 * k, fz - 0.04]);
    P(root, G.rbox(W * 0.9, 0.08, 0.08, 0.03), plastic(), [0, 0.45 * k, bz + 0.03]);
    for (const z of [fz + 0.005, bz - 0.005]) P(root, G.box(), C(0xf4f4f4, 0.4), [0, 0.5 * k, z], [0.5, 0.11, 0.01]);
    if (sports) {
      P(root, G.rbox(1.6, 0.04, 0.28, 0.02), pm, [0, 1.08, -2.05]);
      for (const sx of [-1, 1]) P(root, G.box(), plastic(), [sx * 0.6, 0.98, -2.05], [0.04, 0.18, 0.12]);
      P(root, G.box(), C(0xf8f8f8, 0.35), [0, 0.952, 1.1], [0.22, 0.004, 2.0]);
      P(root, G.box(), C(0xf8f8f8, 0.35), [0, roofY + 0.028, -0.25], [0.22, 0.004, 0.84]);
    }
    if (taxi) {
      P(root, G.rbox(0.62, 0.16, 0.24, 0.04), E(0xfff4c0, 0.4), [0, roofY + 0.1, -0.35]);
      for (let i = 0; i < 10; i++) for (const sx of [-1, 1]) P(root, G.box(), C((i % 2) ? 0x111111 : 0xf4f4f4, 0.5), [sx * (W / 2 + 0.006), 0.95, -1.2 + i * 0.22], [0.005, 0.08, 0.22]);
    }
    root.userData = { kind: 'vehicle', vkind: kind, wheels, seat: [0.38, sports ? 0.08 : 0.2, -0.25], height: 1.5, wheelR: r };
    blobShadow(root, W * 0.65, Lh * 1.1);
    return root;
  }

  function bus(root, wheels, color) {
    const pm = paint(color || 0x2a6ac8), wm = paint(0xf2f2f0);
    const L = 9, W = 2.5;
    P(root, G.rbox(W, 1.0, L, 0.15), pm, [0, 0.9, 0]);
    P(root, G.rbox(W, 1.5, L, 0.25), wm, [0, 2.15, 0]);
    for (const sx of [-1, 1]) P(root, G.box(), glass(), [sx * (W / 2 + 0.01), 2.05, 0], [0.02, 0.9, L - 1.2]);
    P(root, G.box(), glass(), [0, 1.95, L / 2 + 0.01], [W - 0.3, 1.3, 0.02]);
    P(root, G.box(), E(0xff9a2a, 0.8), [0, 2.75, L / 2 + 0.02], [1.4, 0.25, 0.02]);
    for (const sx of [-1, 1]) for (const z of [-L / 2 + 1.6, L / 2 - 1.8]) wheel(root, wheels, sx * (W / 2 - 0.12), z, 0.5, 0.3);
    root.userData = { kind: 'vehicle', vkind: 'bus', wheels, seat: [0.6, 0.6, 3.6], height: 3, wheelR: 0.5 };
    blobShadow(root, W * 0.62, L * 0.55);
    return root;
  }

  function bike(root, wheels, color) {
    const fm = paint(color);
    const r = 0.34;
    for (const z of [-0.52, 0.52]) {
      const wg = grp(root, [0, r, z]);
      P(wg, G.torus(), rubber(), [0, 0, 0], [r, r, r * 0.5], [0, PI / 2, 0]);
      P(wg, G.torus(), chrome(), [0, 0, 0], [r * 0.9, r * 0.9, r * 0.25], [0, PI / 2, 0]);
      for (let i = 0; i < 12; i++) P(wg, G.box(), chrome(), [0, 0, 0], [0.003, r * 1.8, 0.003], [i * PI / 12, 0, 0]);
      P(wg, G.cyl(), chrome(), [0, 0, 0], [0.025, 0.08, 0.025], [0, 0, PI / 2]);
      wheels.push(wg);
    }
    const hubB = [0, r, -0.52], bb = [0, 0.3, -0.05], seat = [0, 0.82, -0.2], headT = [0, 0.86, 0.36], hubF = [0, r, 0.52];
    tube(root, bb, seat, 0.02, fm); tube(root, seat, hubB, 0.014, fm); tube(root, bb, hubB, 0.015, fm);
    tube(root, bb, headT, 0.022, fm); tube(root, seat, headT, 0.02, fm); tube(root, headT, hubF, 0.017, chrome());
    tube(root, headT, [0, 1.0, 0.33], 0.016, chrome());
    tube(root, [-0.25, 1.0, 0.33], [0.25, 1.0, 0.33], 0.014, chrome());
    for (const sx of [-1, 1]) P(root, G.cap(0.018, 0.08), rubber(), [sx * 0.27, 1.0, 0.33], 1, [0, 0, PI / 2]);
    tube(root, seat, [0, 0.92, -0.22], 0.014, chrome());
    P(root, G.rbox(0.12, 0.05, 0.24, 0.02), rubber(), [0, 0.95, -0.2]);
    P(root, G.cyl(), chrome(), [0, 0.3, -0.05], [0.07, 0.02, 0.07], [0, 0, PI / 2]);
    for (const sx of [-1, 1]) P(root, G.rbox(0.08, 0.02, 0.05, 0.005), rubber(), [sx * 0.1, 0.22 + sx * 0.08, -0.05 + sx * 0.1]);
    root.userData = { kind: 'vehicle', vkind: 'bike', wheels, seat: [0, 0.38, -0.28], height: 1.1, wheelR: r };
    blobShadow(root, 0.25, 0.85);
    return root;
  }

  Object.assign(Mo, { vehicle });
})();
