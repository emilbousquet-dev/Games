// ============================================================
//  FLOPPY PARTY — PROPS
//  Nicer models for the mini-games: chairs, a jukebox, a light-up
//  billboard, gravestones, castle towers, a treasure chest,
//  cacti, banners... and cheering crowds that bounce around.
//  Every prop stands on the ground at y = 0.
// ============================================================
window.FP = window.FP || {};

FP.Props = (function () {
  const L = () => FP.Look;
  const T = (c, o) => L().toon(c, o);
  const M = (geo, mat, outline = 0.03, shadows = true) => L().mesh(geo, mat, outline, shadows);
  const animated = []; // things that wiggle every frame: { obj, fn }

  function animate(dt) {
    const t = performance.now() / 1000;
    for (const a of animated) a.fn(t, dt);
  }
  function wiggle(obj, fn) {
    const entry = { obj, fn };
    animated.push(entry);
    FP.Stage.onClear(() => { const i = animated.indexOf(entry); if (i >= 0) animated.splice(i, 1); });
    return obj;
  }

  // text painted on a canvas, for banners and signs
  function textTexture(text, bg = '#ffffff', fg = '#2a2140', w = 512, h = 128) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = fg; g.font = `900 ${Math.floor(h * 0.62)}px Fredoka, Arial Rounded MT Bold, Arial, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = h * 0.08; g.strokeStyle = '#2a2140';
    if (fg !== '#2a2140') g.strokeText(text, w / 2, h / 2 + h * 0.04);
    g.fillText(text, w / 2, h / 2 + h * 0.04);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // a cute wooden chair with a colored cushion (faces +z)
  function chair(cushion = 0xff5a5f) {
    const g = new THREE.Group();
    const wood = T(0xc98b58), dark = T(0xa0643a);
    const seat = L().boxMesh(1.0, 0.12, 1.0, wood, 0.03);
    seat.position.y = 0.4;
    const pad = M(new THREE.CylinderGeometry(0.44, 0.46, 0.12, 20), T(cushion), 0.02);
    pad.scale.z = 0.95; pad.position.y = 0.51;
    g.add(seat, pad);
    for (const [x, z] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) {
      const leg = M(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 8), dark, 0.02);
      leg.position.set(x, 0.2, z);
      g.add(leg);
    }
    // the back
    for (const x of [-0.42, 0.42]) {
      const post = M(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), dark, 0.02);
      post.position.set(x, 0.85, -0.44);
      g.add(post);
    }
    const top = L().boxMesh(1.0, 0.22, 0.08, wood, 0.03);
    top.position.set(0, 1.22, -0.44);
    const mid = L().boxMesh(0.8, 0.1, 0.06, T(cushion), 0.02);
    mid.position.set(0, 0.9, -0.44);
    g.add(top, mid);
    return g;
  }

  // a big bright jukebox with blinking lights and music notes floating out
  function jukebox() {
    const g = new THREE.Group();
    const body = L().boxMesh(1.3, 1.1, 0.8, T(0xff7eb6), 0.04);
    body.position.y = 0.55;
    // the round top: half a cylinder lying on its side
    const archWrap = M(new THREE.CylinderGeometry(0.65, 0.65, 0.8, 24, 1, false, Math.PI / 2, Math.PI), T(0xff7eb6), 0.04);
    archWrap.rotation.x = Math.PI / 2;
    archWrap.position.y = 1.1;
    // light-up stripes (they change color)
    const lights = [];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.08, 0.84), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      s.position.y = 0.25 + i * 0.3;
      lights.push(s); g.add(s);
    }
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0xbfe6ff }));
    glass.position.set(0, 1.12, 0.41);
    const grille = M(new THREE.CircleGeometry(0.3, 20), T(0x6a4c93), 0);
    grille.position.set(0, 0.55, 0.405);
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5 - i * 0.12, 0.04, 0.01), new THREE.MeshBasicMaterial({ color: 0x2a2140 }));
      bar.position.set(0, 0.45 + i * 0.1, 0.41);
      g.add(bar);
    }
    g.add(body, archWrap, glass, grille);
    // music notes floating up
    const notes = [];
    for (let i = 0; i < 3; i++) {
      const n = new THREE.Group();
      const head = M(new THREE.SphereGeometry(0.1, 10, 8), T(0x2a2140), 0);
      head.scale.set(1.2, 0.9, 0.8);
      const stem = M(new THREE.BoxGeometry(0.03, 0.3, 0.03), T(0x2a2140), 0);
      stem.position.set(0.1, 0.15, 0);
      n.add(head, stem);
      g.add(n); notes.push(n);
    }
    g.userData.playing = true;
    return wiggle(g, (t) => {
      const on = g.userData.playing;
      lights.forEach((l, i) => l.material.color.setHSL(on ? (t * 0.5 + i * 0.25) % 1 : 0, on ? 0.9 : 0, on ? 0.6 : 0.45));
      notes.forEach((n, i) => {
        const k = (t * 0.5 + i / 3) % 1;
        n.visible = on;
        n.position.set(Math.sin(t * 2 + i * 2) * 0.4, 1.9 + k * 1.6, 0.2);
        n.scale.setScalar(Math.sin(k * Math.PI) * 1.2);
      });
    });
  }

  // a big billboard on two legs, with light bulbs all around the edge. Returns the group; .userData.panel is the colored part
  function billboard(w = 3.4, h = 1.8) {
    const g = new THREE.Group();
    const frame = L().boxMesh(w + 0.3, h + 0.3, 0.25, T(0x6a4c93), 0.05);
    frame.position.y = 0;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), T(0xffffff, { unique: true }));
    panel.position.z = 0.13;
    g.add(frame, panel);
    for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) {
      const leg = M(new THREE.CylinderGeometry(0.1, 0.12, 4, 8), T(0x8a8fa0), 0.02);
      leg.position.set(x, -h / 2 - 2, -0.05);
      g.add(leg);
    }
    const bulbs = [];
    const n = 10;
    for (let i = 0; i < n * 2 + 6; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff1b8 }));
      let x, y;
      if (i < n) { x = -w / 2 + (i / (n - 1)) * w; y = h / 2 + 0.15; }
      else if (i < n * 2) { x = -w / 2 + ((i - n) / (n - 1)) * w; y = -h / 2 - 0.15; }
      else { const k = i - n * 2; x = k < 3 ? -w / 2 - 0.15 : w / 2 + 0.15; y = -h / 2 + ((k % 3) + 1) * h / 4; }
      b.position.set(x, y, 0.14);
      g.add(b); bulbs.push(b);
    }
    g.userData.panel = panel;
    return wiggle(g, (t) => { bulbs.forEach((b, i) => b.material.color.setHex(Math.floor(t * 6 + i) % 2 ? 0xfff1b8 : 0xffb13b)); });
  }

  // a rounded gravestone (with a little crack), or a cross
  function tombstone(kind = 0) {
    const g = new THREE.Group();
    const stone = T(0xb8b4c8), dark = T(0x8f8aa3);
    if (kind === 1) {
      const up = L().boxMesh(0.2, 1.1, 0.2, stone, 0.03); up.position.y = 0.55;
      const arm = L().boxMesh(0.7, 0.2, 0.2, stone, 0.03); arm.position.y = 0.75;
      g.add(up, arm);
    } else {
      const shape = new THREE.Shape();
      shape.moveTo(-0.4, 0); shape.lineTo(-0.4, 0.7); shape.absarc(0, 0.7, 0.4, Math.PI, 0, true); shape.lineTo(0.4, 0); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
      geo.translate(0, 0, -0.11);
      const s = M(geo, stone, 0.03);
      const plate = L().boxMesh(0.45, 0.07, 0.02, dark, 0);
      plate.position.set(0, 0.75, 0.14);
      const plate2 = L().boxMesh(0.3, 0.06, 0.02, dark, 0);
      plate2.position.set(0, 0.58, 0.14);
      g.add(s, plate, plate2);
    }
    const dirt = M(new THREE.CylinderGeometry(0.5, 0.55, 0.12, 12), T(0x7a5a48), 0.02);
    dirt.scale.z = 1.5; dirt.position.set(0, 0.03, 0.55);
    g.add(dirt);
    return g;
  }

  function deadTree(scale = 1) {
    const g = new THREE.Group();
    const bark = T(0x6b4f3f);
    const trunk = M(new THREE.CylinderGeometry(0.12, 0.22, 1.8, 7), bark, 0.03);
    trunk.position.y = 0.9;
    g.add(trunk);
    for (const [y, a, len, tilt] of [[1.2, 0.3, 0.8, 0.9], [1.5, 2.6, 0.7, 0.8], [1.75, 4.4, 0.5, 0.6], [0.9, 5.2, 0.5, 1.1]]) {
      const br = M(new THREE.CylinderGeometry(0.03, 0.07, len, 5), bark, 0.02);
      br.position.set(Math.cos(a) * len * 0.35, y + len * 0.3, Math.sin(a) * len * 0.35);
      br.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
      g.add(br);
    }
    g.scale.setScalar(scale);
    return g;
  }

  function pumpkin() {
    const g = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const s = M(new THREE.SphereGeometry(0.28, 12, 10), T(0xff8c1a), i === 0 ? 0.03 : 0);
      s.scale.set(0.55, 0.85, 1);
      s.rotation.y = (i / 5) * Math.PI;
      s.position.y = 0.24;
      g.add(s);
    }
    const stem = M(new THREE.CylinderGeometry(0.04, 0.05, 0.14, 6), T(0x3faa55), 0.01);
    stem.position.y = 0.5;
    const face = new THREE.MeshBasicMaterial({ color: 0x3a1f00 });
    for (const x of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.CircleGeometry(0.05, 3), face); e.position.set(x, 0.3, 0.27); g.add(e); }
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.04), face); mouth.position.set(0, 0.18, 0.28);
    g.add(stem, mouth);
    return g;
  }

  function fence(length = 3, color = 0x8a6a55) {
    const g = new THREE.Group();
    const wood = T(color);
    const posts = Math.max(2, Math.round(length / 0.7) + 1);
    for (let i = 0; i < posts; i++) {
      const p = L().boxMesh(0.12, 0.8, 0.12, wood, 0.02);
      p.position.set(-length / 2 + (i / (posts - 1)) * length, 0.4, 0);
      g.add(p);
    }
    for (const y of [0.3, 0.6]) { const r = L().boxMesh(length, 0.08, 0.06, wood, 0.02); r.position.y = y; g.add(r); }
    return g;
  }

  // a castle tower with a pointy roof and a flag
  function tower(color = 0xd9c8b0, roof = 0xff5a5f, h = 1.6) {
    const g = new THREE.Group();
    const wall = M(new THREE.CylinderGeometry(0.7, 0.75, h, 16), T(color), 0.04);
    wall.position.y = h / 2;
    g.add(wall);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const c = L().boxMesh(0.22, 0.25, 0.22, T(color), 0.02);
      c.position.set(Math.cos(a) * 0.66, h + 0.12, Math.sin(a) * 0.66);
      c.rotation.y = -a;
      g.add(c);
    }
    const cone = M(new THREE.ConeGeometry(0.62, 1, 16), T(roof), 0.03);
    cone.position.y = h + 0.7;
    const pole = M(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 5), T(0xdddddd), 0);
    pole.position.y = h + 1.45;
    const flag = M(new THREE.BoxGeometry(0.35, 0.22, 0.02), T(0xffcf33), 0.01);
    flag.position.set(0.18, h + 1.6, 0);
    const door = M(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 12, 1, false, 0, Math.PI), T(0x6b4f3f), 0);
    door.rotation.set(Math.PI / 2, 0, 0);
    const doorBox = L().boxMesh(0.44, 0.35, 0.05, T(0x6b4f3f), 0);
    doorBox.position.set(0, 0.18, 0.74);
    door.position.set(0, 0.35, 0.74);
    for (let i = 0; i < 2; i++) { const w = L().boxMesh(0.14, 0.26, 0.04, T(0x2a2140), 0); w.position.set(0, h * 0.62, 0.73); w.rotation.y = 0; if (i) { w.position.set(0.73, h * 0.62, 0); w.rotation.y = Math.PI / 2; } g.add(w); }
    g.add(cone, pole, flag, door, doorBox);
    return wiggle(g, (t) => { flag.rotation.y = Math.sin(t * 3 + g.position.x) * 0.3; });
  }

  // a treasure chest overflowing with gold
  function chest() {
    const g = new THREE.Group();
    const wood = T(0xa0643a), gold = T(0xffcf33);
    const box = L().boxMesh(1.2, 0.6, 0.8, wood, 0.04); box.position.y = 0.3;
    const lid = M(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 16, 1, false, 0, Math.PI), wood, 0.04);
    lid.rotation.z = Math.PI / 2; lid.position.set(0, 0.62, -0.25);
    lid.rotation.x = -0.9;
    const wrap = new THREE.Group(); wrap.add(lid); wrap.position.set(0, 0, 0);
    for (const x of [-0.45, 0.45]) { const band = L().boxMesh(0.1, 0.62, 0.84, gold, 0.01); band.position.set(x, 0.3, 0); g.add(band); }
    const lock = L().boxMesh(0.16, 0.2, 0.05, gold, 0.01); lock.position.set(0, 0.5, 0.42);
    const pile = M(new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold, 0);
    pile.scale.set(1.1, 0.5, 0.75); pile.position.y = 0.58;
    g.add(box, wrap, lock, pile);
    for (let i = 0; i < 5; i++) {
      const c = FP.Kit.coinMesh(0.14);
      c.position.set(-0.4 + i * 0.2, 0.75 + (i % 2) * 0.08, 0.05 * (i % 3));
      c.rotation.set(0.4 * i, i, 0);
      g.add(c);
    }
    return g;
  }

  function cactus(scale = 1) {
    const g = new THREE.Group();
    const green = T(0x5cbf5a);
    const body = M(new THREE.CapsuleGeometry(0.25, 1.2, 6, 12), green, 0.03);
    body.position.y = 0.85;
    g.add(body);
    for (const [s, y, h] of [[1, 0.9, 0.5], [-1, 1.2, 0.4]]) {
      const armOut = M(new THREE.CapsuleGeometry(0.14, 0.25, 4, 8), green, 0.02);
      armOut.rotation.z = Math.PI / 2; armOut.position.set(s * 0.35, y, 0);
      const armUp = M(new THREE.CapsuleGeometry(0.14, h, 4, 8), green, 0.02);
      armUp.position.set(s * 0.52, y + h / 2 + 0.05, 0);
      g.add(armOut, armUp);
    }
    const flower = M(new THREE.SphereGeometry(0.1, 8, 6), T(0xff7eb6), 0.01);
    flower.position.y = 1.72;
    g.add(flower);
    g.scale.setScalar(scale);
    return g;
  }

  function rock(scale = 1, color = 0xb0a393) {
    const m = M(new THREE.DodecahedronGeometry(0.6, 0), new THREE.MeshToonMaterial({ color, flatShading: true, gradientMap: T(0xffffff).gradientMap }), 0.04);
    m.scale.set(scale * 1.2, scale * 0.8, scale);
    m.position.y = scale * 0.35;
    const g = new THREE.Group(); g.add(m);
    return g;
  }

  // a street lamp that glows
  function lamp(color = 0xfff1b8) {
    const g = new THREE.Group();
    const pole = M(new THREE.CylinderGeometry(0.06, 0.08, 2.4, 8), T(0x3a3450), 0.02);
    pole.position.y = 1.2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color }));
    bulb.position.y = 2.5;
    const cap = M(new THREE.ConeGeometry(0.3, 0.2, 10), T(0x3a3450), 0.02);
    cap.position.y = 2.72;
    g.add(pole, bulb, cap);
    return g;
  }

  // an arch with a banner that says something (like START)
  function arch(text, width = 7, bg = '#ffcf33') {
    const g = new THREE.Group();
    for (const x of [-width / 2, width / 2]) {
      const p = M(new THREE.CylinderGeometry(0.2, 0.25, 3.4, 10), T(0xffffff), 0.03);
      p.position.set(x, 1.7, 0);
      const ball = M(new THREE.SphereGeometry(0.3, 12, 10), T(0xff5a5f), 0.03);
      ball.position.set(x, 3.5, 0);
      g.add(p, ball);
    }
    const banner = new THREE.Mesh(new THREE.BoxGeometry(width, 0.9, 0.12), [T(0xffffff), T(0xffffff), T(0xffffff), T(0xffffff), new THREE.MeshBasicMaterial({ map: textTexture(text, bg) }), new THREE.MeshBasicMaterial({ map: textTexture(text, bg) })]);
    banner.position.y = 3.1;
    g.add(banner);
    return g;
  }

  // a signpost with an arrow
  function arrowSign(text = 'GO!', color = '#5cc44a') {
    const g = new THREE.Group();
    const post = M(new THREE.CylinderGeometry(0.06, 0.07, 1.6, 8), T(0xa0643a), 0.02);
    post.position.y = 0.8;
    const shape = new THREE.Shape();
    shape.moveTo(-0.6, -0.22); shape.lineTo(0.35, -0.22); shape.lineTo(0.35, -0.38); shape.lineTo(0.7, 0); shape.lineTo(0.35, 0.38); shape.lineTo(0.35, 0.22); shape.lineTo(-0.6, 0.22); shape.closePath();
    const board = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false }), [new THREE.MeshBasicMaterial({ map: textTexture(text, color, '#ffffff', 256, 96) }), T(0xffffff)]);
    board.geometry.computeBoundingBox();
    // map the text across the front face
    const uv = board.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (board.geometry.attributes.position.getX(i) + 0.6) / 1.3, (board.geometry.attributes.position.getY(i) + 0.38) / 0.76);
    board.position.set(0, 1.4, 0.05);
    g.add(post, board);
    return g;
  }

  // a crowd of little bean fans that bounce and cheer. rows x per row
  function crowd(rows = 2, perRow = 8, spacing = 0.9) {
    const g = new THREE.Group();
    const fans = [];
    const cols = [0xff5a5f, 0x4aa8ff, 0xffcf33, 0x5cc44a, 0x9b6bff, 0xff7eb6, 0xff9a3c, 0x3dd6c4];
    for (let r = 0; r < rows; r++) {
      const step = L().boxMesh(perRow * spacing + 0.6, 0.5 + r * 0.5, 0.9, T(r % 2 ? 0xe6d9ff : 0xd4c4ff), 0.03);
      step.position.set(0, (0.5 + r * 0.5) / 2, -r * 0.9);
      g.add(step);
      for (let i = 0; i < perRow; i++) {
        const fan = new THREE.Group();
        const c = cols[(i * 3 + r * 5) % cols.length];
        const body = M(new THREE.CapsuleGeometry(0.22, 0.25, 4, 10), T(c), 0.025);
        body.position.y = 0.35;
        const head = M(new THREE.SphereGeometry(0.2, 12, 10), T(c), 0.025);
        head.position.y = 0.78;
        const eyes = new THREE.MeshBasicMaterial({ color: 0x2a2140 });
        for (const x of [-0.07, 0.07]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), eyes); e.position.set(x, 0.82, 0.18); fan.add(e); }
        const arms = [];
        for (const s of [-1, 1]) { const a = M(new THREE.CapsuleGeometry(0.06, 0.2, 3, 6), T(c), 0.015); a.position.set(s * 0.27, 0.5, 0); fan.add(a); arms.push(a); }
        fan.add(body, head);
        fan.position.set(-perRow * spacing / 2 + spacing / 2 + i * spacing, 0.5 + r * 0.5, -r * 0.9);
        fan.userData = { base: fan.position.y, arms, phase: Math.random() * 6, speed: 5 + Math.random() * 4 };
        g.add(fan); fans.push(fan);
      }
    }
    g.userData.hype = 0; // set this higher (0 to 1) to make them jump more, like after a goal
    return wiggle(g, (t, dt) => {
      g.userData.hype = Math.max(0, g.userData.hype - (dt || 0.016) * 0.4);
      const h = 0.3 + g.userData.hype;
      for (const f of fans) {
        const u = f.userData;
        const k = Math.max(0, Math.sin(t * u.speed + u.phase));
        f.position.y = u.base + k * 0.18 * h * 2;
        u.arms.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * (0.3 + k * 2.2 * h); a.position.y = 0.5 + k * 0.1 * h; });
      }
    });
  }

  // cheer! makes every crowd in the level go wild for a moment
  function hype() { for (const a of animated) if (a.obj.userData && a.obj.userData.hype !== undefined) a.obj.userData.hype = 1; }

  // colorful triangle flags on a string between two points
  function bunting(x1, y1, z1, x2, y2, z2, n = 12) {
    const g = new THREE.Group();
    const cols = [0xff5a5f, 0xffcf33, 0x4aa8ff, 0x5cc44a, 0xff7eb6];
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, sag = Math.sin(k * Math.PI) * 0.5;
      pts.push(new THREE.Vector3(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k - sag, z1 + (z2 - z1) * k));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a2140 })));
    for (let i = 0; i < n; i++) {
      const tri = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 3), T(cols[i % cols.length]));
      tri.rotation.x = Math.PI;
      tri.position.copy(pts[i].clone().lerp(pts[i + 1], 0.5)); tri.position.y -= 0.18;
      g.add(tri);
    }
    return g;
  }

  return { animate, wiggle, textTexture, chair, jukebox, billboard, tombstone, deadTree, pumpkin, fence, tower, chest, cactus, rock, lamp, arch, arrowSign, crowd, hype, bunting };
})();
