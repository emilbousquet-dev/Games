// ============================================================
//  MY LIFE — THE PLACES 🏠🏫🏙️
//  Each place is a little 3D "doll house" built with code.
//  "spots" are places where people can stand:
//     name: [x, z, turn, height]
//  turn 0 = looking at you (the camera), Math.PI = looking away.
// ============================================================
window.ML = window.ML || {};

ML.Scenes = (function () {
  const U = ML.U, T = ML.Tex, Mo = ML.Models;
  const { P, G, C, E, M } = Mo;
  const PI = Math.PI, H = PI / 2;

  // ---------- helpers ----------
  const matCache = {};
  function texMat(tex, rx, ry, rough = 0.85, key) {
    const k = (key || tex.uuid) + rx + '_' + ry + rough;
    if (matCache[k]) return matCache[k];
    const t = tex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
    return (matCache[k] = new THREE.MeshStandardMaterial({ map: t, roughness: rough }));
  }
  function plane(g, mat, x, y, z, w, h, rx = -H, ry = 0) {
    const m = new THREE.Mesh(G.plane(), mat);
    m.position.set(x, y, z); m.scale.set(w, h, 1); m.rotation.set(rx, ry, 0);
    m.receiveShadow = true;
    g.add(m);
    return m;
  }
  function put(g, kind, x, z, r = 0, opt = {}) {
    const o = Mo.item(kind, opt);
    o.position.set(x, opt.y || 0, z);
    o.rotation.y = r;
    if (opt.s) o.scale.setScalar(opt.s);
    g.add(o);
    return o;
  }
  // a room with a floor, a back wall and two side walls (the front is open, like a doll house)
  function room(g, o) {
    const w = o.w, d = o.d, h = o.h || 2.9;
    const fl = o.floor || T.wood();
    plane(g, texMat(fl, w / (o.floorTile || 2), d / (o.floorTile || 2), 0.75), 0, 0, 0, w, d);
    const wallM = texMat(o.wall || T.wall(0xf4e8d0), w / 2.5, h / 2.5, 0.9);
    const sideM = texMat(o.wall || T.wall(0xf4e8d0), d / 2.5, h / 2.5, 0.9);
    // back wall
    P(g, G.box(), wallM, [0, h / 2, -d / 2 - 0.1], [w + 0.4, h, 0.2]);
    // side walls
    if (o.left !== false) P(g, G.box(), sideM, [-w / 2 - 0.1, h / 2, 0], [0.2, h, d]).rotation.y = 0;
    if (o.right !== false) P(g, G.box(), sideM, [w / 2 + 0.1, h / 2, 0], [0.2, h, d]);
    // baseboards
    const trim = C(o.trim || 0xffffff, 0.5);
    P(g, G.box(), trim, [0, 0.06, -d / 2 + 0.01], [w, 0.12, 0.04]);
    if (o.left !== false) P(g, G.box(), trim, [-w / 2 + 0.01, 0.06, 0], [0.04, 0.12, d]);
    if (o.right !== false) P(g, G.box(), trim, [w / 2 - 0.01, 0.06, 0], [0.04, 0.12, d]);
    if (o.stripe) P(g, G.box(), C(o.stripe, 0.7), [0, 0.95, -d / 2 + 0.01], [w, 0.08, 0.03]);
    // the edge of the floor in front (looks like a doll house)
    P(g, G.box(), C(o.edge || 0x6a4a3a, 0.7), [0, -0.15, d / 2 + 0.02], [w + 0.4, 0.3, 0.1]);
    for (const win of o.windows || []) windowOn(g, win.x, win.y || 1.5, -d / 2 + 0.02, win.w || 1.4, win.h || 1.2, win.view || 'sky');
    if (o.door) door(g, o.door === 'left' ? -w / 2 + 0.02 : w / 2 - 0.02, o.doorZ !== undefined ? o.doorZ : d / 2 - 1.2, o.door === 'left' ? H : -H, o.doorColor);
    return { w, d, h };
  }
  function windowOn(g, x, y, z, w, h, view = 'sky', ry = 0) {
    const grp = Mo.grp(g, [x, y, z], [0, ry, 0]);
    const vm = new THREE.MeshBasicMaterial({ map: T.windowView(view) });
    const m = new THREE.Mesh(G.plane(), vm); m.scale.set(w, h, 1); m.position.z = 0.01; grp.add(m);
    const fr = M.white();
    P(grp, G.box(), fr, [0, h / 2, 0.04], [w + 0.12, 0.08, 0.08]);
    P(grp, G.box(), fr, [0, -h / 2, 0.06], [w + 0.24, 0.08, 0.16]);
    P(grp, G.box(), fr, [-w / 2, 0, 0.04], [0.08, h, 0.08]);
    P(grp, G.box(), fr, [w / 2, 0, 0.04], [0.08, h, 0.08]);
    P(grp, G.box(), fr, [0, 0, 0.04], [0.05, h, 0.05]);
    return grp;
  }
  function door(g, x, z, ry, color = 0x8a5a3a) {
    const grp = Mo.grp(g, [x, 0, z], [0, ry, 0]);
    P(grp, G.box(), C(color, 0.6), [0, 1.05, 0.02], [1.0, 2.1, 0.06]);
    P(grp, G.sphereLo(), M.gold(), [0.38, 1.0, 0.07], 0.04);
    P(grp, G.box(), M.white(), [0, 2.12, 0.02], [1.12, 0.08, 0.08]);
    return grp;
  }
  function picture(g, x, y, z, seed, w = 0.7, h = 0.55, ry = 0) {
    const grp = Mo.grp(g, [x, y, z], [0, ry, 0]);
    P(grp, G.box(), M.darkWood(), [0, 0, 0], [w + 0.08, h + 0.08, 0.04]);
    const m = new THREE.Mesh(G.plane(), new THREE.MeshStandardMaterial({ map: T.painting(seed), roughness: 0.7 }));
    m.scale.set(w, h, 1); m.position.z = 0.025; grp.add(m);
  }
  function signOn(g, text, x, y, z, w, bg, fg, ry = 0) {
    const s = Mo.item('sign', { text, w, bg, fg });
    s.position.set(x, y, z); s.rotation.y = ry;
    g.add(s);
    return s;
  }
  function outdoors(g, groundTex, size = 80) {
    plane(g, texMat(groundTex, size / 4, size / 4, 1), 0, 0, 0, size, size);
  }
  const sky = (top, bottom) => T.sky(top, bottom);
  const OUT_LIGHT = { hemi: 1.2, sky: 0xcfe8ff, ground: 0x7aa060, sun: 2.3, sunPos: [6, 12, 8], ambient: 0.2 };
  const IN_LIGHT = { hemi: 1.0, sky: 0xfff4e8, ground: 0xb09078, sun: 1.6, sunPos: [3, 9, 8], ambient: 0.35 };

  // ============================================================
  //  👶 THE NURSERY (baby room)
  // ============================================================
  function nursery(g) {
    room(g, { w: 8, d: 6, wall: T.wall(0xbfe0ff, 'stars', 0xffffff), floor: T.wood(0xd8b080), windows: [{ x: 0.6, view: 'sky' }], door: 'right', doorZ: 1.5, stripe: 0xffc8e0 });
    put(g, 'crib', -2.1, -2.3, H);
    put(g, 'rug', 0, 0.3, 0, { color: 0xffb8d8 });
    put(g, 'toybox', 2.5, -2.6, 0);
    put(g, 'blocks', 0.8, 0.9);
    put(g, 'teddy', 1.6, -1.4, -0.4);
    put(g, 'armchair', 3.1, -0.9, -1.0, { color: 0xffd0a0 });
    put(g, 'lamp', 3.4, -2.6, 0);
    put(g, 'plant', -3.5, 0.2, 0, { color: 0x6ac8ff });
    picture(g, -2.1, 2.1, -2.98, 7);
    picture(g, 2.6, 1.9, -2.98, 9, 0.5, 0.5);
    return {
      spots: { crib: [-2.1, -2.3, 0, 0.47], me: [0, 0.7, 0], a: [1.3, 0.3, -0.6], b: [-1.3, 0.4, 0.6], c: [2.3, -0.6, -0.8], d: [-2.3, 1.2, 0.4], door: [3.5, 1.6, -H], chair: [3.1, -0.9, -1.0, 0.12], toys: [0.8, 1.2, PI], window: [0.6, -2.3, PI], center: [0, 0.3, 0] },
      cam: [0, 2.4, 6.6], look: [0, 0.7, -0.6], bg: 0xffe8f0, light: IN_LIGHT,
    };
  }

  // ============================================================
  //  🏠 THE FAMILY HOUSE (kitchen + living room)
  // ============================================================
  function home(g, opt = {}) {
    const w = 11, d = 6.5;
    room(g, { w, d, wall: T.wall(0xf6e6c8, 'stripes', 0xf0dab0), floor: T.wood(0xc08a58), windows: [{ x: 0.4, view: 'sky' }], door: 'right', doorZ: 1.6, stripe: 0xc8a070 });
    plane(g, texMat(T.checker(0xffffff, 0x8ac8e8, 4), 2.5, 3.2, 0.5, 'kitchenfloor'), -3.25, 0.004, 0, 4.5, d);
    put(g, 'fridge', -5.0, -2.8, 0);
    put(g, 'counter', -3.5, -2.85, 0, { w: 2.2 });
    put(g, 'stove', -1.9, -2.85, 0);
    put(g, 'jar', -3.8, -2.85, 0, { y: 1.0 });
    put(g, 'table', -3.2, -0.5, 0);
    put(g, 'chair', -3.2, -1.25, 0);
    put(g, 'chair', -3.2, 0.25, PI);
    put(g, 'chair', -3.95, -0.5, H);
    put(g, 'chair', -2.45, -0.5, -H);
    put(g, 'sofa', 2.3, -2.45, 0, { color: 0x4a8ac8 });
    put(g, 'rug', 2.3, -0.7, 0, { color: 0xe8a04a });
    put(g, 'tv', 5.15, -0.8, -H);
    put(g, 'plant', 4.8, -2.85);
    put(g, 'lamp', -0.7, -2.8);
    picture(g, 2.3, 1.9, -3.23, 3, 1.0, 0.6);
    if (opt.party) {
      for (let i = 0; i < 6; i++) put(g, 'balloon', -4.5 + i * 1.8, -3.0 + (i % 2) * 0.3, 0, { color: [0xff3a6a, 0x3ab0ff, 0xffd84a, 0x7ae84a, 0xc87aff, 0xff8a3a][i] });
    }
    return {
      spots: {
        me: [0, 0.9, 0], a: [1.4, 0.6, -0.5], b: [-1.4, 0.6, 0.5], c: [2.3, -1.1, 0], d: [-2.2, 1.3, 0.3], door: [5.0, 1.7, -H], center: [0, 0.4, 0],
        sofaL: [1.85, -2.3, 0, 0.12], sofaR: [2.75, -2.3, 0, 0.12], tableA: [-3.2, -1.25, 0], tableB: [-3.2, 0.25, PI], tableC: [-3.95, -0.5, H], tableD: [-2.45, -0.5, -H],
        kitchen: [-3.4, -2.15, PI], stove: [-1.9, -2.15, PI], fridge: [-5.0, -2.0, PI], tv: [4.2, -0.8, -H], cake: [-3.2, -0.5, 0, 0.77], window: [0.4, -2.6, PI],
      },
      cam: [0.3, 3.1, 8.6], look: [-0.2, 0.9, -0.8], bg: 0xf8eedc, light: IN_LIGHT,
    };
  }

  // ============================================================
  //  🛏️ YOUR BEDROOM (kid & teen)
  // ============================================================
  function bedroom(g, opt = {}) {
    const wc = opt.wall || 0xc8e0ff;
    room(g, { w: 8, d: 6, wall: T.wall(wc, opt.pattern || 'dots'), floor: T.carpet(0xd8c8b0), floorTile: 3, windows: [{ x: -0.6, view: 'sky' }], door: 'right', doorZ: 1.5 });
    put(g, 'bed', -2.6, -1.95, PI, { color: opt.bed || 0xe85a5a });
    put(g, 'pc', 2.2, -2.55, 0);
    put(g, 'chair', 2.2, -1.75, PI, { color: 0x3a3a40 });
    put(g, 'bookshelf', 0.9, -2.85);
    put(g, 'rug', 0, 0.2, 0, { color: 0x7ac8a0 });
    put(g, 'toybox', 3.3, 0.2, -H);
    put(g, 'lamp', -3.6, -0.4);
    picture(g, -2.6, 1.9, -2.98, 11, 0.9, 0.6);
    picture(g, 3.98, 1.7, -0.5, 21, 0.6, 0.8, -H);
    return {
      spots: { me: [0, 0.6, 0], a: [1.3, 0.3, -0.5], b: [-1.2, 0.6, 0.5], c: [2, 0.9, -0.8], door: [3.6, 1.5, -H], bed: [-2.6, -1.5, 0, 0.55], bedSit: [-1.95, -1.6, H, 0.1], desk: [2.2, -1.75, PI, 0], center: [0, 0.3, 0], window: [-0.6, -2.4, PI] },
      cam: [0, 2.7, 7.4], look: [0, 0.9, -0.8], bg: 0xf4ecff, light: IN_LIGHT,
    };
  }

  // ============================================================
  //  🛝 THE PLAYGROUND
  // ============================================================
  function playground(g) {
    outdoors(g, T.grass());
    plane(g, texMat(T.sand(), 3, 1), 0, 0.006, 0.7, 14, 3.4);
    put(g, 'swings', -3.2, -2.7, 0);
    put(g, 'slide', 3.2, -2.6, -0.35);
    put(g, 'sandbox', 0.2, -3.0);
    put(g, 'bench', -5.0, 0.7, H);
    put(g, 'fence', 0, -5.2, 0, { w: 18 });
    put(g, 'tree', -6.5, -3.5, 0, { s: 1.1 });
    put(g, 'tree', 6.8, -3.0);
    put(g, 'tree', 8.5, 1.0, 0, { s: 0.9 });
    put(g, 'bush', -7.5, 1.5);
    put(g, 'trashcan', 5.2, 1.2);
    const school = Mo.building(18, 7, 6, 0xc8604a, 0);
    school.position.set(0, 0, -13); g.add(school);
    signOn(g, 'SUNNYVALE SCHOOL', 0, 5.5, -9.95, 6, 0xffffff, 0x2a4aa8);
    put(g, 'tree', -10, -9, 0, { s: 1.3 });
    put(g, 'tree', 11, -9.5, 0, { s: 1.2 });
    return {
      spots: { me: [0, 0.9, 0], a: [1.4, 0.7, -0.4], b: [-1.4, 0.7, 0.4], c: [2.6, 0.2, -0.6], d: [-2.6, 0.1, 0.6], swing: [-2.7, -2.7, 0, 0.5], swing2: [-3.7, -2.7, 0, 0.5], slideTop: [3.5, -3.6, 0, 1.0], slideEnd: [2.6, -1.1, -0.35], sand: [0.2, -2.3, PI], bench: [-5.0, 0.7, H, 0.05], door: [9, 1.5, -H], far: [-10, 1.2, H], center: [0, 0.6, 0] },
      cam: [0, 3.0, 9.6], look: [0, 1.0, -1.2], bg: sky(), fog: [0xcfeaff, 30, 70], light: OUT_LIGHT,
    };
  }

  // ============================================================
  //  🏫 THE CLASSROOM
  // ============================================================
  function classroom(g, opt = {}) {
    const w = 11, d = 8;
    room(g, { w, d, wall: T.wall(0xfff0b8, 'plain'), floor: T.checker(0xe8e0d0, 0xd0c4b0, 4), floorTile: 3, windows: [{ x: -1.5, view: 'sky' }, { x: 1.5, view: 'sky' }], door: 'right', doorZ: 2.6, stripe: 0x8ab0e8 });
    const board = put(g, 'chalkboard', -5.45, 0, H, { lines: opt.lines || ['ABC  123', '2 + 2 = 4', 'Be kind! :)'], y: 1.6 });
    board.position.y = 1.6;
    put(g, 'desk', -4.4, -2.6, H, { computer: false, color: 0x8a5a3a });
    put(g, 'book', -4.4, -2.6, 0, { y: 0.8 });
    for (const x of [-2, 0.2, 2.4]) for (const z of [-1.6, 0, 1.6]) {
      put(g, 'schooldesk', x, z, H);
      put(g, 'chair', x + 0.55, z, -H, { color: 0x3a7ae8 });
    }
    put(g, 'bookshelf', 4.6, -3.7);
    put(g, 'plant', 5.0, 0.6);
    put(g, 'locker', 2.2, -3.75, 0, { n: 3, color: 0xe85a5a });
    picture(g, 0.1, 2.1, -3.98, 31, 0.8, 0.5);
    return {
      spots: {
        me: [0.6, 2.6, 0], mySeat: [0.75, 1.6, -H], a: [0.75, 0, -H], b: [2.95, 1.6, -H], c: [2.95, 0, -H], d: [-1.45, 1.6, -H], e: [-1.45, 0, -H],
        teacher: [-4.3, -0.6, H], front: [-3.6, 0.8, H], board: [-4.9, 1.0, -H], door: [5.0, 2.6, -H], stand: [1.6, 2.8, PI], center: [0, 2.6, 0],
      },
      cam: [2.4, 3.4, 9.0], look: [-0.6, 0.9, -0.2], bg: 0xfff8e0, light: IN_LIGHT,
    };
  }

  // ============================================================
  //  🏙️ THE BIG CITY STREET
  // ============================================================
  function street(g, opt = {}) {
    const W = 70;
    plane(g, texMat(T.sidewalk(), W / 2, 3), 0, 0, 1, W, 6);
    plane(g, texMat(T.road(), W / 8, 1, 0.9), 0, 0.002, -5.5, W, 7);
    plane(g, texMat(T.sidewalk(), W / 2, 1.5), 0, 0, -10.5, W, 3);
    plane(g, texMat(T.asphalt(), 20, 20), 0, -0.01, -40, 200, 60);
    plane(g, texMat(T.sidewalk(), W / 2, 2), 0, -0.01, 8, W, 8);
    P(g, G.box(), C(0xa8a49c, 0.8), [0, 0.07, -2.0], [W, 0.14, 0.2]);
    // crosswalk
    for (let i = 0; i < 7; i++) P(g, G.box(), M.white(), [7 + i * 0.7 - 2.1, 0.005, -5.5], [0.45, 0.01, 6.5]);
    // the skyscrapers
    const rnd = U.seeded(77);
    let x = -40;
    while (x < 40) {
      const w = 6 + rnd() * 6, h = 14 + rnd() * 40, dd = 8 + rnd() * 6;
      const b = Mo.building(w, h, dd, [0x8aa0c0, 0xc8b8a0, 0x9a6a5a, 0x6a7a8a, 0xd8d0c0, 0x5a8aa8][Math.floor(rnd() * 6)], Math.floor(rnd() * 3));
      b.position.set(x + w / 2, 0, -12.2 - dd / 2 - rnd() * 3);
      g.add(b);
      x += w + 0.4 + rnd() * 1.5;
    }
    // shops behind you (so the street feels full when the camera turns)
    for (let i = 0; i < 8; i++) { const b = Mo.building(8, 20 + i * 3, 6, [0xc8b8a0, 0x8aa0c0][i % 2], 1); b.position.set(-32 + i * 8.4, 0, 12); g.add(b); }
    for (const sx of [-12, -4, 4, 12]) put(g, 'streetlight', sx, -1.6, PI);
    for (const sx of [-15, 15]) put(g, 'trafficlight', sx > 0 ? 9.8 : -9.8, -1.7, PI);
    put(g, 'hydrant', -6.2, -1.2);
    put(g, 'tree', -8.2, -0.8, 0, { s: 0.8 });
    put(g, 'tree', 8.0, -0.8, 0, { s: 0.8 });
    put(g, 'bench', 4.6, 2.6, PI);
    put(g, 'trashcan', 6.0, 2.8);
    if (opt.shop) signOn(g, opt.shop, 0, 4.2, -11.3, 5, 0xffd84a, 0x2a1406);
    // traffic 🚗
    const cars = [];
    const colors = [0xe83a3a, 0x3a7ae8, 0xf2c84a, 0xffffff, 0x3a3a40, 0x7ac83a];
    for (let i = 0; i < 6; i++) {
      const lane = i % 2;
      const v = Mo.vehicle(i === 2 ? 'taxi' : i === 5 ? 'bus' : 'car', i === 2 ? 0xf2c84a : colors[i]);
      v.rotation.y = lane ? -H : H;
      v.position.set(-30 + i * 11, 0, lane ? -7.4 : -4.0);
      v.userData.lane = lane; v.userData.v = 6 + (i % 3) * 2;
      g.add(v); cars.push(v);
    }
    return {
      spots: { me: [-1.4, 1.2, 0], a: [1.4, 1.2, 0], b: [-3.4, 1.6, 0.5], c: [3.2, 1.8, -0.3], d: [0, 2.6, 0], curb: [0, -1.3, PI], car: [-4, -3.0, H], carEnd: [16, -3.0, H], far: [-12, 1.2, H], farR: [12, 1.2, -H], door: [12, 1.4, -H], bench: [4.6, 2.6, PI, 0.08], benchSit: [4.6, 2.75, 0, 0.0], center: [0, 1.2, 0], shopDoor: [0, -1.4, PI] },
      cam: [0, 2.7, 10], look: [0, 1.7, -2], bg: sky(0x6ab8f0, 0xe0f0ff), fog: [0xd8ecff, 40, 140], light: OUT_LIGHT,
      anim(t, dt) { for (const c of cars) { const v = c.userData.v * (c.userData.lane ? -1 : 1); c.position.x += v * dt; if (c.position.x > 36) c.position.x = -36; if (c.position.x < -36) c.position.x = 36; c.userData.wheels.forEach((wh) => { wh.rotation.x += Math.abs(v) * dt / 0.36; }); } },
    };
  }

  // ============================================================
  //  💼 THE OFFICE
  // ============================================================
  function office(g) {
    const w = 11, d = 7;
    room(g, { w, d, wall: T.wall(0xdce4ec, 'plain'), floor: T.carpet(0x7a8a9a), floorTile: 3, windows: [{ x: -2.5, view: 'city', w: 2.2 }, { x: 0.5, view: 'city', w: 2.2 }], door: 'right', doorZ: 2.0, stripe: 0x3a6ab0 });
    for (const x of [-2.6, 0, 2.6]) { put(g, 'desk', x, -1.4, PI); put(g, 'chair', x, -2.15, 0, { color: 0x2a2a30 }); }
    door(g, 3.6, -3.45, 0, 0x3a3a40);
    signOn(g, 'BOSS', 3.6, 2.45, -3.42, 0.9, 0xffd84a, 0x2a1406);
    put(g, 'plant', -5.0, -3.0);
    put(g, 'plant', 5.0, 0.5);
    P(g, G.cyl(), C(0xe8f4ff, 0.3), [-5.0, 0.55, -0.6], [0.2, 1.1, 0.2]);
    P(g, G.cyl(), M.water(), [-5.0, 1.3, -0.6], [0.18, 0.4, 0.18]);
    put(g, 'bookshelf', -4.6, 1.8, H);
    return {
      spots: { me: [0, 0.8, 0], myDesk: [0, -2.15, 0, 0], deskA: [-2.6, -2.15, 0, 0], deskB: [2.6, -2.15, 0, 0], a: [1.4, 0.6, -0.5], b: [-1.4, 0.6, 0.5], c: [2.4, 1.4, -0.4], boss: [3.6, -2.7, 0], bossDoor: [3.6, -2.7, PI], cooler: [-4.5, -0.6, -H], door: [5.0, 2.0, -H], center: [0, 0.4, 0] },
      cam: [0, 3.2, 8.4], look: [0, 1.0, -1.1], bg: 0xe8eef4, light: IN_LIGHT,
    };
  }

  // ============================================================
  //  🍔 BURGER BLAST (fast food)
  // ============================================================
  function burger(g) {
    const w = 11, d = 7;
    room(g, { w, d, wall: T.wall(0xffffff, 'tiles'), floor: T.checker(0xffffff, 0xe83a3a, 4), floorTile: 2, door: 'right', doorZ: 2.2, stripe: 0xe83a3a, windows: [{ x: -3.8, view: 'city', w: 1.6 }] });
    put(g, 'counter', 0, -1.6, 0, { w: 5, color: 0xe83a3a });
    put(g, 'stove', -1.6, -3.1);
    put(g, 'stove', -0.7, -3.1);
    put(g, 'fridge', 1.6, -3.05);
    P(g, G.rbox(0.4, 0.3, 0.35, 0.04), C(0x3a3a40, 0.5), [1.6, 1.15, -1.6]);
    signOn(g, 'BURGER BLAST', 0, 2.45, -3.45, 3.4, 0xffd84a, 0xc8202a);
    put(g, 'burger', -0.4, -1.6, 0, { y: 1.0 });
    for (const sx of [-1, 1]) {
      put(g, 'table', sx * 3.8, 0.9, 0);
      put(g, 'stool', sx * 3.8 - 0.4, 1.55, 0);
      put(g, 'stool', sx * 3.8 + 0.4, 1.55, 0);
    }
    return {
      spots: { me: [-0.6, 0.2, PI], customer: [0, -0.9, PI], worker: [0, -2.3, 0], grill: [-1.15, -2.55, PI], a: [1.3, 0.4, -0.4], b: [-1.9, 0.6, 0.4], c: [2.4, 1.6, -0.4], tableA: [-4.2, 1.55, 0, 0.27], tableB: [-3.4, 1.55, 0, 0.27], tableC: [3.4, 1.55, 0, 0.27], tableD: [4.2, 1.55, 0, 0.27], door: [5.0, 2.2, -H], center: [0, 0.5, 0] },
      cam: [0, 3.1, 8.6], look: [0, 1.1, -1.0], bg: 0xfff0e0, light: IN_LIGHT,
    };
  }

  // ============================================================
  //  🏢 YOUR OWN HOME: tiny apartment, big apartment, PENTHOUSE
  // ============================================================
  const HOMES = {
    1: { w: 7.5, d: 5.5, wall: () => T.wall(0xefe0c8, 'plain'), floor: () => T.wood(0xb07a4a), view: 'city', windows: [0.3], bed: [-2.6, -1.8], bedColor: 0x8a8ac8 },
    2: { w: 10, d: 6.5, wall: () => T.wall(0xc8ece4, 'stripes', 0xb8e0d8), floor: () => T.wood(0x8a5a3a), view: 'city', windows: [-1.0, 1.8], bed: [-3.7, -2.1], bedColor: 0x3aa08a },
    3: { w: 13, d: 8, wall: () => T.wall(0xfaf6f0, 'plain'), floor: () => T.checker(0xf4f0ea, 0xd8d0c4, 2), view: 'high', windows: [-3.5, 0, 3.5], bed: [-5.2, -2.8], bedColor: 0xd8b04a },
  };
  // where your furniture can go in each home: [x, z, turn]
  const SLOTS = {
    1: [[0.4, -2.2, 0], [2.9, -0.4, -H], [-0.6, 0.1, 0], [1.6, -2.3, 0], [3.0, 1.6, -H]],
    2: [[-0.2, -2.6, 0], [3.9, -0.6, -H], [0.6, 0.2, 0], [2.3, -2.7, 0], [-1.7, -2.6, 0], [4.0, 1.8, -H], [-4.1, 1.0, H], [-2.0, 1.2, 0], [1.3, -2.8, 0]],
    3: [[-1.8, -3.4, 0], [5.6, -1.0, -H], [0, 0, 0], [2.4, -3.4, 0], [-3.4, -3.3, 0], [5.6, 2.0, -H], [-5.6, 1.4, H], [-2.6, 1.6, 0], [0.4, -3.5, 0], [4.2, -3.3, 0], [-0.6, 2.4, 0], [3.0, 1.0, 0], [-4.2, -0.4, H]],
  };
  function apartment(g, opt = {}) {
    const tier = U.clamp(opt.tier || 1, 1, 3);
    const hm = HOMES[tier];
    room(g, { w: hm.w, d: hm.d, h: tier === 3 ? 3.4 : 2.9, wall: hm.wall(), floor: hm.floor(), floorTile: tier === 3 ? 2.5 : 2, door: 'right', doorZ: hm.d / 2 - 1.0, stripe: tier === 3 ? 0xd8b04a : undefined, trim: tier === 3 ? 0xd8b04a : 0xffffff });
    if (tier === 3) {
      // a huge glass wall with the whole city below
      const v = new THREE.Mesh(G.plane(), new THREE.MeshBasicMaterial({ map: T.windowView('high') }));
      v.scale.set(hm.w - 1, 2.6, 1); v.position.set(0, 1.75, -hm.d / 2 + 0.03); g.add(v);
      for (let i = 0; i <= 6; i++) P(g, G.box(), M.gold(), [-(hm.w - 1) / 2 + i * (hm.w - 1) / 6, 1.75, -hm.d / 2 + 0.06], [0.06, 2.6, 0.06]);
      P(g, G.box(), M.gold(), [0, 0.45, -hm.d / 2 + 0.06], [hm.w - 1, 0.06, 0.06]);
      P(g, G.box(), M.gold(), [0, 3.05, -hm.d / 2 + 0.06], [hm.w - 1, 0.06, 0.06]);
    } else for (const x of hm.windows) windowOn(g, x, 1.55, -hm.d / 2 + 0.02, 1.5, 1.2, hm.view);
    put(g, 'bed', hm.bed[0], hm.bed[1], PI, { color: hm.bedColor });
    if (tier >= 2) picture(g, hm.bed[0], 2.0, -hm.d / 2 + 0.03, 40 + tier, 0.9, 0.6);
    const slots = SLOTS[tier];
    (opt.furniture || []).forEach((f) => {
      const s = slots[f.slot];
      if (!s) return;
      put(g, f.item, s[0], s[1], s[2], { color: f.color });
    });
    const sp = {
      me: [0, 1.0, 0], a: [1.4, 0.8, -0.5], b: [-1.4, 0.9, 0.5], c: [2.2, 1.5, -0.5], pet: [1.0, 1.7, -0.3], door: [hm.w / 2 - 0.5, hm.d / 2 - 1.0, -H],
      bed: [hm.bed[0], hm.bed[1] + 0.3, 0, 0.55], bedSit: [hm.bed[0] + 0.65, hm.bed[1] + 0.3, H, 0.1], center: [0, 0.6, 0], window: [hm.windows[0] || 0, -hm.d / 2 + 0.8, PI],
    };
    slots.forEach((s, i) => { sp['slot' + i] = [s[0] + Math.sin(s[2]) * 0.9, s[1] + Math.cos(s[2]) * 0.9, s[2] + PI]; });
    return {
      spots: sp,
      cam: tier === 3 ? [0, 4.2, 11.5] : tier === 2 ? [0, 3.4, 9.0] : [0, 3.0, 7.6], look: [0, 0.9, -0.8], bg: tier === 3 ? 0xf0e8d8 : 0xf4ece0, light: IN_LIGHT,
      slots,
    };
  }

  // ============================================================
  //  🐶 PET PALACE (pet shop)
  // ============================================================
  function petshop(g) {
    const w = 10, d = 6.5;
    room(g, { w, d, wall: T.wall(0xc8f0d8, 'dots', 0xa8e0c0), floor: T.checker(0xf8f8f0, 0xd8e8d0, 4), door: 'right', doorZ: 2.0, stripe: 0x3aa06a });
    signOn(g, 'PET PALACE', 0, 2.45, -3.2, 3.2, 0x3aa06a, 0xffffff);
    for (const x of [-3.8, -2.6]) { put(g, 'cage', x, -2.9, 0); put(g, 'cage', x, -2.9, 0, { y: 0.65 }); }
    put(g, 'fishtank', 2.6, -2.9, 0);
    put(g, 'counter', 3.9, -1.3, H, { w: 2, color: 0x3aa06a });
    P(g, G.cylLo(), C(0x8a5a3a, 0.6), [2.3, 0.4, -1.0], [0.04, 0.8, 0.04]);
    P(g, G.cylLo(), C(0x8a5a3a, 0.6), [2.3, 0.78, -1.0], [0.02, 0.4, 0.02], [0, 0, H]);
    P(g, G.cylLo(), C(0x8a5a3a, 0.6), [2.3, 0.02, -1.0], [0.25, 0.04, 0.25]);
    put(g, 'rug', -2.4, -0.7, 0, { color: 0xffd0a0 });
    put(g, 'rug', 0, -0.7, 0, { color: 0xc8d8ff });
    put(g, 'plant', -4.4, 1.2);
    put(g, 'ball', -1.5, 0.6, 0, { color: 0xffd84a });
    return {
      spots: { me: [0, 1.4, 0], keeper: [4.0, -0.4, -H], dog: [-2.4, -0.7, 0], cat: [0, -0.7, 0], parrot: [2.3, -1.0, 0, 0.8], a: [1.4, 1.1, -0.5], b: [-1.4, 1.2, 0.5], door: [4.7, 2.0, -H], center: [0, 0.6, 0] },
      cam: [0, 2.9, 8.0], look: [0, 0.8, -0.8], bg: 0xeaf8f0, light: IN_LIGHT,
    };
  }

  // ============================================================
  //  🚗 SUPER CARS (car shop)
  // ============================================================
  function cardealer(g) {
    const w = 16, d = 8;
    room(g, { w, d, h: 3.6, wall: T.wall(0x3a3a48, 'plain'), floor: T.checker(0xd8dce4, 0xb8bcc8, 2), floorTile: 2.5, door: 'right', doorZ: 2.5, stripe: 0xff3a3a, trim: 0x2a2a30 });
    const v = new THREE.Mesh(G.plane(), new THREE.MeshBasicMaterial({ map: T.windowView('city') }));
    v.scale.set(w - 2, 2.6, 1); v.position.set(0, 1.8, -d / 2 + 0.03); g.add(v);
    for (let i = 0; i <= 7; i++) P(g, G.box(), C(0x2a2a30, 0.4), [-(w - 2) / 2 + i * (w - 2) / 7, 1.8, -d / 2 + 0.06], [0.08, 2.6, 0.08]);
    signOn(g, 'SUPER CARS', 0, 3.3, -3.9, 3.6, 0xff3a3a, 0xffffff);
    for (const x of [-5, 0, 5]) put(g, 'pedestal', x, -1.6, 0);
    put(g, 'plant', -7.3, -3.4);
    put(g, 'plant', 7.3, -3.4);
    put(g, 'desk', 6.0, 2.0, -H);
    return {
      spots: { me: [0, 2.3, 0], seller: [2.2, 2.0, -0.6], bike: [-5, -1.6, 0.6, 0.2], car: [0, -1.6, 0.6, 0.2], sports: [5, -1.6, -0.6, 0.2], a: [1.6, 2.2, -0.5], b: [-1.6, 2.2, 0.5], door: [7.5, 2.5, -H], exit: [12, 2.5, -H], center: [0, 1.5, 0] },
      cam: [0, 4.0, 11.5], look: [0, 0.8, -0.8], bg: 0x2a2a34, light: Object.assign({}, IN_LIGHT, { sun: 2.0 }),
    };
  }

  // ============================================================
  //  🌳 THE PARK
  // ============================================================
  function park(g) {
    outdoors(g, T.grass());
    plane(g, texMat(T.sand(), 6, 1), 0, 0.006, 1.0, 30, 2.2);
    P(g, G.cyl(), M.water(), [3.5, 0.02, -3.6], [3.0, 0.04, 2.2]);
    P(g, G.torus(), C(0xa8a49c, 0.8), [3.5, 0.04, -3.6], [3.0, 2.2, 0.4], [H, 0, 0]);
    put(g, 'fountain', -3.8, -3.6);
    put(g, 'bench', -5.6, 0.6, H);
    put(g, 'bench', 5.8, 1.3, -H);
    put(g, 'tree', -8, -2, 0, { s: 1.2 });
    put(g, 'tree', 8.5, -4, 0, { s: 1.1 });
    put(g, 'tree', -2, -8, 0, { s: 1.3 });
    put(g, 'tree', 6, -9, 0);
    put(g, 'bush', 0.6, -5.5);
    for (let i = 0; i < 14; i++) put(g, 'flower', -6 + (i % 7) * 0.4 + (i > 6 ? 9 : 0), -1.4 - (i % 3) * 0.25, 0, { color: [0xff6aa0, 0xffd84a, 0xc87aff, 0xff8a4a][i % 4] });
    // ducks on the pond
    const ducks = [];
    for (let i = 0; i < 3; i++) {
      const dk = Mo.grp(g, [3.5, 0.08, -3.6]);
      P(dk, G.sphere(), C(0xffffff, 0.6), [0, 0.08, 0], [0.12, 0.08, 0.16]);
      P(dk, G.sphere(), C(0x3a8a4a, 0.6), [0, 0.2, 0.1], 0.07);
      P(dk, G.cone(), C(0xffa030, 0.5), [0, 0.19, 0.18], [0.03, 0.06, 0.03], [H, 0, 0]);
      ducks.push(dk);
    }
    const city = Mo.building(60, 25, 4, 0x8aa0c0, 2);
    city.position.set(0, 0, -30); g.add(city);
    return {
      spots: { me: [0, 1.2, 0], a: [1.4, 1.0, -0.4], b: [-1.4, 1.0, 0.4], c: [2.6, 0.4, -0.6], d: [-2.6, 0.4, 0.6], bench: [-5.6, 0.6, H, 0.05], pond: [2.6, -1.2, PI], fountain: [-3.8, -1.6, PI], door: [10, 1.2, -H], far: [-11, 1.2, H], center: [0, 1.0, 0] },
      cam: [0, 3.0, 9.8], look: [0, 1.0, -1.4], bg: sky(), fog: [0xcfeaff, 30, 75], light: OUT_LIGHT,
      anim(t) { ducks.forEach((dk, i) => { const a = t * 0.3 + i * 2.1; dk.position.set(3.5 + Math.cos(a) * 2.0, 0.04, -3.6 + Math.sin(a) * 1.3); dk.rotation.y = -a; }); },
    };
  }

  // ============================================================
  //  🏥 THE HOSPITAL
  // ============================================================
  function hospital(g) {
    const w = 9, d = 6;
    room(g, { w, d, wall: T.wall(0xd8f0ec, 'plain'), floor: T.checker(0xf0f4f4, 0xd8e4e4, 4), windows: [{ x: 2.0, view: 'city' }], door: 'right', doorZ: 1.6, stripe: 0x3ab0a0 });
    put(g, 'hospitalbed', -1.2, -1.7, PI);
    put(g, 'monitor', -2.4, -2.5);
    put(g, 'chair', 0.3, -0.5, -H + 0.4, { color: 0x3ab0a0 });
    put(g, 'flower', -2.3, -0.4, 0, { y: 0 });
    put(g, 'plant', 3.8, -2.4);
    P(g, G.box(), C(0xa8d8f0, 0.9), [-3.8, 1.3, -0.2], [0.04, 2.4, 2.6]);
    return {
      spots: { bed: [-1.2, -1.45, 0, 0.75], me: [0, 0.8, 0], doctor: [0.4, -1.5, -H], a: [-2.9, -0.5, H], b: [0.7, 0.3, -0.6], c: [-0.6, 1.1, 0.2], chair: [0.3, -0.5, -H + 0.4, 0], door: [4.0, 1.6, -H], center: [0, 0.5, 0] },
      cam: [0.6, 3.0, 7.4], look: [-0.5, 0.8, -0.9], bg: 0xeaf6f4, light: IN_LIGHT,
    };
  }

  // ============================================================
  //  👵 SUNNY DAYS (home for old people)
  // ============================================================
  function oldhome(g) {
    const w = 11, d = 7;
    room(g, { w, d, wall: T.wall(0xffe0c8, 'stripes', 0xf8d4b8), floor: T.wood(0x9a6a40), windows: [{ x: -0.8, view: 'sky' }], door: 'right', doorZ: 2.2, stripe: 0xc87a5a });
    put(g, 'armchair', -3.6, -2.4, 0.3, { color: 0x8a5ac8 });
    put(g, 'armchair', -2.1, -2.7, 0, { color: 0x5a8ac8 });
    put(g, 'piano', 3.4, -3.0);
    put(g, 'table', 1.0, -0.4);
    put(g, 'chair', 0.25, -0.4, H);
    put(g, 'chair', 1.75, -0.4, -H);
    put(g, 'chair', 1.0, 0.35, PI);
    put(g, 'bingo', 1.0, -0.4, 0, { y: 0.775 });
    put(g, 'plant', 5.0, -0.5);
    put(g, 'plant', -5.0, 0.8);
    put(g, 'tv', -5.2, -0.6, H);
    picture(g, -2.8, 2.0, -3.48, 51, 1.0, 0.6);
    signOn(g, 'SUNNY DAYS', 1.2, 2.5, -3.45, 2.0, 0xffd84a, 0xc8602a);
    return {
      spots: { me: [0, 1.4, 0], chairA: [-3.6, -2.4, 0.3, 0.12], chairB: [-2.1, -2.7, 0, 0.12], bingoA: [0.25, -0.4, H], bingoB: [1.75, -0.4, -H], bingoC: [1.0, 0.35, PI], piano: [3.4, -2.3, PI], a: [1.6, 1.2, -0.4], b: [-1.6, 1.2, 0.4], c: [3.0, 0.8, -0.6], door: [5.0, 2.2, -H], center: [0, 1.0, 0] },
      cam: [0, 3.0, 8.6], look: [0, 0.9, -0.9], bg: 0xfff0e0, light: IN_LIGHT,
    };
  }

  // ============================================================
  //  🎤 THE SCHOOL SHOW (stage)
  // ============================================================
  function talent(g) {
    plane(g, texMat(T.wood(0x8a5a3a), 8, 6), 0, 0, 0, 30, 24);
    P(g, G.box(), C(0x2a1a3a, 0.9), [0, 4, -5], [30, 8, 0.2]);
    put(g, 'stage', 0, -2.4);
    for (const r of [0, 1]) for (let i = 0; i < 7; i++) put(g, 'chair', -4.5 + i * 1.5, 2.6 + r * 1.3, PI, { color: 0xa01828 });
    const spot = new THREE.Mesh(G.cone(), new THREE.MeshBasicMaterial({ color: 0xfff4c0, transparent: true, opacity: 0.12, depthWrite: false }));
    spot.scale.set(1.3, 5, 1.3); spot.position.set(0, 3.1, -2.2); g.add(spot);
    P(g, G.cylLo(), new THREE.MeshBasicMaterial({ color: 0xfff4c0, transparent: true, opacity: 0.25, depthWrite: false }), [0, 0.615, -2.2], [1.3, 0.005, 1.3]);
    signOn(g, 'TALENT SHOW', 0, 4.9, -4.8, 3.6, 0xffd84a, 0xa01828);
    return {
      spots: { me: [0, -2.2, 0, 0.6], stage: [0, -2.2, 0, 0.6], wing: [-2.6, -2.6, H, 0.6], wing2: [2.6, -2.6, -H, 0.6], seatA: [-1.5, 2.6, PI], seatB: [1.5, 2.6, PI], seatC: [0, 3.9, PI], a: [-1.5, 2.6, PI], b: [1.5, 2.6, PI], c: [0, 3.9, PI], door: [8, 3, -H], center: [0, -2.2, 0, 0.6] },
      cam: [0, 3.4, 9.5], look: [0, 1.4, -2.0], bg: 0x1a1024, light: { hemi: 0.6, sky: 0xffe8d0, ground: 0x402030, sun: 2.4, sunPos: [0, 10, 2], ambient: 0.15 },
    };
  }

  // ============================================================
  //  🎓 GRADUATION / WEDDING STYLE GARDEN (for big moments)
  // ============================================================
  function garden(g) {
    outdoors(g, T.grass());
    for (let i = 0; i < 2; i++) for (let k = 0; k < 4; k++) put(g, 'chair', -3 + k * 0.9 + (i ? 0 : 0), 2.3 + i * 1.1, PI, { color: 0xffffff });
    for (let i = 0; i < 2; i++) for (let k = 0; k < 4; k++) put(g, 'chair', 0.6 + k * 0.9, 2.3 + i * 1.1, PI, { color: 0xffffff });
    const arch = Mo.grp(g, [0, 0, -2.6]);
    for (const sx of [-1, 1]) P(arch, G.cyl(), M.white(), [sx * 1.3, 1.3, 0], [0.08, 2.6, 0.08]);
    P(arch, G.torus(), M.white(), [0, 2.6, 0], [1.3, 0.6, 0.4], [0, 0, 0]);
    for (let i = 0; i < 12; i++) { const a = i / 11 * PI; P(arch, G.sphereLo(), C([0xff8ac8, 0xffffff, 0xffd84a][i % 3], 0.6), [Math.cos(a) * 1.3, 2.6 + Math.sin(a) * 0.6, 0.05], 0.12); }
    put(g, 'tree', -6, -4, 0, { s: 1.2 });
    put(g, 'tree', 6.5, -4.5, 0, { s: 1.1 });
    put(g, 'bush', -4, -3.4);
    put(g, 'bush', 4, -3.4);
    return {
      spots: { me: [0, -1.8, 0], a: [1.0, -1.8, -H], b: [-1.0, -1.8, H], c: [-1.8, 2.3, PI], d: [1.5, 2.3, PI], seatA: [-1.2, 2.3, PI], seatB: [1.5, 2.3, PI], door: [9, 1.0, -H], center: [0, -1.8, 0] },
      cam: [0, 3.0, 9.4], look: [0, 1.2, -1.6], bg: sky(), fog: [0xcfeaff, 30, 70], light: OUT_LIGHT,
    };
  }

  // ============================================================
  //  🎨 THE STUDIO (character creator)
  // ============================================================
  function studio(g) {
    P(g, G.cyl(), C(0xffffff, 0.4), [0, 0.06, 0], [2.4, 0.12, 2.4]);
    P(g, G.ring(), E(0xffc8e8, 0.6), [0, 0.12, 0], [2.4, 2.4, 2.4], [H, 0, 0]);
    const bgm = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.MeshBasicMaterial({ map: T.sky(0xffd8ec, 0xd8ecff), side: THREE.BackSide }));
    g.add(bgm);
    plane(g, new THREE.MeshStandardMaterial({ color: 0xf4e8f8, roughness: 0.9 }), 0, 0, 0, 60, 60);
    return {
      spots: { grown: [0.55, 0, 0, 0.12], baby: [-0.75, 0.35, 0, 0.12], me: [0, 0, 0, 0.12] },
      cam: [-0.1, 1.5, 4.6], look: [-0.1, 0.9, 0], bg: 0xf4e8f8, light: { hemi: 1.2, sky: 0xffffff, ground: 0xd8c8e8, sun: 1.8, sunPos: [3, 8, 6], ambient: 0.3 },
    };
  }

  return { studio, nursery, home, bedroom, playground, classroom, street, office, burger, apartment, petshop, cardealer, park, hospital, oldhome, talent, garden, SLOTS };
})();
