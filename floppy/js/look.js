// ============================================================
//  FLOPPY PARTY — THE CARTOON LOOK
//  Toon shading (3 shades per color), black outlines,
//  cute bean characters, hats, trees, clouds...
// ============================================================
window.FP = window.FP || {};

FP.Look = (function () {
  // a tiny texture with 4 steps that makes lighting look like a cartoon
  const gradient = (() => {
    const data = new Uint8Array([105, 105, 105, 255, 165, 165, 165, 255, 222, 222, 222, 255, 255, 255, 255, 255]);
    const t = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  })();

  const cache = new Map();
  function toon(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (!opts.unique && cache.has(key)) return cache.get(key);
    const o = Object.assign({ color, gradientMap: gradient }, opts);
    delete o.unique; // our own flag, not a three.js setting
    const m = new THREE.MeshToonMaterial(o);
    if (!opts.unique) cache.set(key, m);
    return m;
  }

  // character material: cartoon shading plus a soft light around the edges ("rim light")
  const charCache = new Map();
  function charToon(color) {
    if (charCache.has(color)) return charCache.get(color);
    const m = new THREE.MeshToonMaterial({ color, gradientMap: gradient });
    m.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `#include <dithering_fragment>
        float rim = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
        gl_FragColor.rgb += vec3(1.0, 0.97, 0.92) * pow(rim, 3.0) * 0.45;`);
    };
    m.customProgramCacheKey = () => 'fp-rim';
    charCache.set(color, m);
    return m;
  }
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1d1a2f, side: THREE.BackSide });

  // a mesh with a black cartoon outline around it
  function mesh(geo, material, outline = 0.04, shadows = true) {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = shadows; m.receiveShadow = true;
    if (outline) {
      const o = new THREE.Mesh(geo, outlineMat);
      o.scale.setScalar(1 + outline * 2 / Math.max(0.2, geoSize(geo)));
      o.userData.isOutline = true;
      m.add(o);
    }
    return m;
  }
  function geoSize(geo) {
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    return geo.boundingSphere.radius * 2;
  }

  // a box outline scales badly, so boxes get an outline shell built slightly bigger
  function boxMesh(w, h, d, material, outline = 0.05) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.castShadow = true; m.receiveShadow = true;
    if (outline) {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w + outline * 2, h + outline * 2, d + outline * 2), outlineMat);
      o.userData.isOutline = true;
      m.add(o);
    }
    return m;
  }

  // ------------------------------------------------------------
  //  CHARACTERS
  // ------------------------------------------------------------
  const COLORS = [
    { name: 'Tomato', body: 0xff5a5f, light: 0xffb3b0 },
    { name: 'Sky', body: 0x4aa8ff, light: 0xb5dcff },
    { name: 'Lime', body: 0x6fd35a, light: 0xc6f0b8 },
    { name: 'Banana', body: 0xffcf33, light: 0xfff0b0 },
    { name: 'Grape', body: 0x9b6bff, light: 0xd6c4ff },
    { name: 'Bubblegum', body: 0xff8fc8, light: 0xffd2ea },
    { name: 'Orange', body: 0xff9a3c, light: 0xffd3a8 },
    { name: 'Mint', body: 0x3fd6c1, light: 0xb4f2e9 },
  ];
  const FREE_HATS = ['party', 'beanie', 'crown', 'cowboy', 'tophat', 'propeller', 'bunny', 'chef'];
  const SHOP_HATS = ['headphones', 'flowers', 'wizard', 'antlers', 'pirate', 'viking', 'halo', 'astronaut']; // bought with party coins
  const TOUR_HATS = ['robot']; // won in the World Tour
  const HATS = [...FREE_HATS, ...SHOP_HATS, ...TOUR_HATS, 'none'];

  const FREE_OUTFITS = ['none', 'overalls', 'bowtie', 'scarf', 'cape', 'belt'];
  const SHOP_OUTFITS = ['tutu', 'tuxedo', 'hero', 'spacesuit', 'hoodie', 'jersey']; // bought with party coins
  const TOUR_OUTFITS = ['knight']; // won in the World Tour
  const OUTFITS = [...FREE_OUTFITS, ...SHOP_OUTFITS, ...TOUR_OUTFITS];
  const OUTFIT_NAMES = { none: 'Nothing', overalls: 'Overalls', bowtie: 'Bow tie', scarf: 'Scarf', cape: 'Cape', belt: 'Belt', tutu: 'Tutu', tuxedo: 'Tuxedo', hero: 'Superhero', spacesuit: 'Space suit', hoodie: 'Hoodie', jersey: 'Jersey', knight: 'Knight armor' };

  // a shiny spot that makes things look glossy
  function shine(w, h) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
    m.scale.set(w, h, w * 0.3);
    return m;
  }

  // body: a round bean with a lighter tummy, a shiny spot, and an outfit
  function makeTorso(c, dims, outfit = 'none') {
    const g = new THREE.Group();
    const R = dims.torsoR;
    g.add(mesh(new THREE.CapsuleGeometry(R, dims.torsoH, 10, 20), charToon(c.body)));
    const belly = mesh(new THREE.SphereGeometry(R * 0.8, 20, 14), charToon(c.light), 0);
    belly.scale.set(1, 1.15, 0.5);
    belly.position.set(0, -0.06, R * 0.56);
    g.add(belly);
    const s1 = shine(R * 0.2, R * 0.32);
    s1.position.set(-R * 0.5, R * 0.35, R * 0.72);
    s1.rotation.z = 0.5;
    g.add(s1);
    const dark = (col) => toon(col);
    if (outfit === 'overalls') {
      const denim = dark(0x3d6fd6);
      const bib = mesh(new THREE.SphereGeometry(R * 1.02, 20, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), denim, 0.02);
      bib.position.y = -dims.torsoH / 2 + 0.02;
      g.add(bib);
      const front = mesh(new THREE.BoxGeometry(R * 0.8, R * 0.55, 0.05), denim, 0.015);
      front.position.set(0, R * 0.05, R * 0.95);
      g.add(front);
      for (const side of [-1, 1]) {
        const strap = mesh(new THREE.BoxGeometry(0.07, R * 1.1, 0.05), denim, 0.012);
        strap.position.set(side * R * 0.35, R * 0.55, R * 0.72);
        strap.rotation.x = -0.45;
        const button = mesh(new THREE.SphereGeometry(0.035, 8, 6), dark(0xffcf33), 0);
        button.position.set(side * R * 0.3, R * 0.28, R * 1.0);
        g.add(strap, button);
      }
    } else if (outfit === 'bowtie') {
      const red = dark(0xff3355);
      for (const side of [-1, 1]) {
        const wing = mesh(new THREE.ConeGeometry(0.08, 0.15, 10), red, 0.015);
        wing.rotation.set(-0.35, 0, side * Math.PI / 2);
        wing.position.set(side * 0.085, R * 0.62, R * 0.93);
        g.add(wing);
      }
      const knot = mesh(new THREE.SphereGeometry(0.045, 10, 8), red, 0.012);
      knot.position.set(0, R * 0.62, R * 0.98);
      g.add(knot);
    } else if (outfit === 'scarf') {
      const yel = dark(0xffb62e);
      const ring = mesh(new THREE.TorusGeometry(R * 0.72, 0.09, 10, 24), yel, 0.02);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = R * 0.72;
      const tail = mesh(new THREE.BoxGeometry(0.16, 0.38, 0.06), yel, 0.015);
      tail.position.set(R * 0.35, R * 0.45, R * 0.72);
      tail.rotation.set(-0.3, 0, 0.25);
      for (let i = 0; i < 2; i++) {
        const stripe = mesh(new THREE.BoxGeometry(0.17, 0.04, 0.065), dark(0xff5a5f), 0);
        stripe.position.set(0, -0.06 - i * 0.1, 0);
        tail.add(stripe);
      }
      g.add(ring, tail);
    } else if (outfit === 'cape') {
      const red = dark(0xe8343f);
      const cape = mesh(new THREE.CylinderGeometry(R * 0.7, R * 1.15, R * 2.1, 16, 1, true, Math.PI * 0.62, Math.PI * 0.76), toon(0xe8343f, { side: THREE.DoubleSide }), 0);
      cape.position.set(0, -R * 0.1, -R * 0.12);
      g.add(cape);
      const clasp = mesh(new THREE.SphereGeometry(0.05, 8, 6), dark(0xffcf33), 0);
      clasp.position.set(0, R * 0.78, R * 0.55);
      g.add(clasp);
      void red;
    } else if (outfit === 'belt') {
      const belt = mesh(new THREE.TorusGeometry(R * 1.0, 0.055, 8, 28), dark(0x6b4226), 0.015);
      belt.rotation.x = Math.PI / 2;
      belt.position.y = -R * 0.2;
      const buckle = mesh(new THREE.BoxGeometry(0.16, 0.12, 0.04), dark(0xffcf33), 0.012);
      buckle.position.set(0, -R * 0.2, R * 1.02);
      g.add(belt, buckle);
    } else if (outfit === 'tutu') {
      for (const [r, y, col] of [[R * 1.55, -R * 0.35, 0xff9ad0], [R * 1.4, -R * 0.2, 0xffc2e2]]) {
        const skirt = mesh(new THREE.CylinderGeometry(R * 0.95, r, 0.16, 22, 1, true), toon(col, { side: THREE.DoubleSide }), 0.015);
        skirt.position.y = y;
        g.add(skirt);
      }
      const bow = mesh(new THREE.SphereGeometry(0.06, 8, 6), dark(0xff5a9a), 0.01); bow.position.set(0, -R * 0.1, R * 0.98); g.add(bow);
    } else if (outfit === 'tuxedo') {
      // a black jacket (open at the front), a white shirt and a bow tie
      const jacket = mesh(new THREE.SphereGeometry(R * 1.04, 22, 14, Math.PI / 2 + 0.55, Math.PI * 2 - 1.1, 0.2, Math.PI * 0.8), toon(0x2a2a3a, { side: THREE.DoubleSide }), 0.02);
      jacket.scale.y = 1 + dims.torsoH / (2 * R) * 0.9;
      g.add(jacket);
      const shirt = mesh(new THREE.BoxGeometry(R * 0.7, R * 1.3, 0.04), dark(0xffffff), 0.01); shirt.position.set(0, R * 0.05, R * 0.93); g.add(shirt);
      for (const side of [-1, 1]) { const wing = mesh(new THREE.ConeGeometry(0.07, 0.13, 10), dark(0x2a2a3a), 0.012); wing.rotation.set(-0.35, 0, side * Math.PI / 2); wing.position.set(side * 0.075, R * 0.66, R * 0.97); g.add(wing); }
      for (let k = 0; k < 3; k++) { const b = mesh(new THREE.SphereGeometry(0.025, 6, 4), dark(0x2a2a3a), 0); b.position.set(0, R * 0.35 - k * R * 0.28, R * 0.97); g.add(b); }
    } else if (outfit === 'hero') {
      const cape = mesh(new THREE.CylinderGeometry(R * 0.7, R * 1.15, R * 2.1, 16, 1, true, Math.PI * 0.62, Math.PI * 0.76), toon(0x3a6fe8, { side: THREE.DoubleSide }), 0);
      cape.position.set(0, -R * 0.1, -R * 0.12);
      const shape = new THREE.Shape();
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + Math.PI / 2, rr = k % 2 ? 0.07 : 0.16; if (k) shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      const star = mesh(new THREE.ShapeGeometry(shape), toon(0xffcf33, { side: THREE.DoubleSide }), 0.012);
      star.position.set(0, R * 0.2, R * 1.0);
      const belt = mesh(new THREE.TorusGeometry(R * 1.0, 0.05, 8, 28), dark(0xffcf33), 0.012); belt.rotation.x = Math.PI / 2; belt.position.y = -R * 0.25;
      g.add(cape, star, belt);
    } else if (outfit === 'spacesuit') {
      const suit = mesh(new THREE.CapsuleGeometry(R * 1.05, dims.torsoH, 10, 20), toon(0xf4f6fb), 0.03);
      g.add(suit);
      const panel = mesh(new THREE.BoxGeometry(R * 0.7, R * 0.45, 0.08), dark(0x8a8fa0), 0.012); panel.position.set(0, R * 0.2, R * 1.02); g.add(panel);
      [[0xff5a5f, -1], [0x5cc44a, 0], [0x4aa8ff, 1]].forEach(([col, k]) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: col })); l.position.set(k * R * 0.2, R * 0.2, R * 1.07); g.add(l); });
      const pack = mesh(new THREE.BoxGeometry(R * 1.2, R * 1.4, R * 0.6), dark(0xd9dde6), 0.02); pack.position.set(0, R * 0.1, -R * 1.1); g.add(pack);
    } else if (outfit === 'hoodie') {
      const top = mesh(new THREE.CapsuleGeometry(R * 1.04, dims.torsoH * 0.6, 10, 20), toon(0xff9a3c), 0.025); top.position.y = R * 0.15; g.add(top);
      const hood = mesh(new THREE.TorusGeometry(R * 0.62, 0.14, 10, 22), dark(0xff8a2a), 0.02); hood.rotation.x = Math.PI / 2.4; hood.position.set(0, R * 0.85, -R * 0.35); g.add(hood);
      const pocket = mesh(new THREE.BoxGeometry(R * 0.9, R * 0.35, 0.05), dark(0xe07a20), 0.012); pocket.position.set(0, -R * 0.2, R * 1.02); g.add(pocket);
      for (const side of [-1, 1]) { const cord = mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25, 5), dark(0xffffff), 0); cord.position.set(side * 0.08, R * 0.5, R * 0.98); g.add(cord); }
    } else if (outfit === 'jersey') {
      const shirt = mesh(new THREE.CapsuleGeometry(R * 1.04, dims.torsoH * 0.6, 10, 20), toon(0xff3a4a), 0.025); shirt.position.y = R * 0.15; g.add(shirt);
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const x = cv.getContext('2d'); x.fillStyle = '#ffffff'; x.font = '900 52px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('7', 32, 36);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      for (const z of [1, -1]) { const num = new THREE.Mesh(new THREE.PlaneGeometry(R * 0.9, R * 0.9), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); num.position.set(0, R * 0.1, z * R * 1.06); if (z < 0) num.rotation.y = Math.PI; g.add(num); }
      for (const side of [-1, 1]) { const stripe = mesh(new THREE.BoxGeometry(0.05, R * 1.2, 0.05), dark(0xffffff), 0); stripe.position.set(side * R * 1.02, R * 0.15, 0); g.add(stripe); }
    } else if (outfit === 'knight') {
      const plate = mesh(new THREE.CapsuleGeometry(R * 1.05, dims.torsoH * 0.55, 10, 20), toon(0xc9d1db), 0.025); plate.position.y = R * 0.15; g.add(plate);
      const shine2 = mesh(new THREE.BoxGeometry(R * 0.12, R * 1.1, 0.05), dark(0xffffff), 0); shine2.position.set(-R * 0.5, R * 0.3, R * 0.98); shine2.rotation.z = 0.2; g.add(shine2);
      const crossV = mesh(new THREE.BoxGeometry(R * 0.22, R * 0.9, 0.06), dark(0xd9a52b), 0.01); crossV.position.set(0, R * 0.25, R * 1.06); g.add(crossV);
      const crossH = mesh(new THREE.BoxGeometry(R * 0.7, R * 0.22, 0.06), dark(0xd9a52b), 0.01); crossH.position.set(0, R * 0.4, R * 1.06); g.add(crossH);
      for (const side of [-1, 1]) {
        const pad = mesh(new THREE.SphereGeometry(R * 0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xaab4c0), 0.02);
        pad.position.set(side * R * 0.85, R * 0.75, 0); pad.rotation.z = -side * 0.5; g.add(pad);
      }
      const belt = mesh(new THREE.TorusGeometry(R * 1.02, 0.05, 8, 24), dark(0x6a4c3a), 0.01); belt.rotation.x = Math.PI / 2; belt.position.y = -R * 0.3; g.add(belt);
    }
    return g;
  }

  // head: big eyes that look around, eyebrows, cheeks, mouths for every mood, and a hat
  function makeHead(c, dims, hat) {
    const g = new THREE.Group();
    const r = dims.headR * 1.06;
    const skull = mesh(new THREE.SphereGeometry(r, 28, 20), charToon(c.body));
    skull.scale.set(1.02, 0.97, 1);
    g.add(skull);
    const s1 = shine(r * 0.18, r * 0.12);
    s1.position.set(-r * 0.42, r * 0.62, r * 0.55);
    s1.rotation.z = 0.6;
    g.add(s1);
    const ink = toon(0x1d1a2f);
    const eyes = [], brows = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      const white = mesh(new THREE.SphereGeometry(r * 0.3, 18, 14), toon(0xffffff), 0.012, false);
      white.scale.set(0.9, 1.15, 0.55);
      const pupil = new THREE.Group();
      const iris = mesh(new THREE.SphereGeometry(r * 0.19, 16, 12), ink, 0, false);
      iris.scale.set(0.9, 1.1, 0.5);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(r * 0.065, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      glint.position.set(r * 0.06, r * 0.08, r * 0.09);
      const glint2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.03, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      glint2.position.set(-r * 0.05, -r * 0.06, r * 0.09);
      pupil.add(iris, glint, glint2);
      pupil.position.z = r * 0.1;
      eye.add(white, pupil);
      eye.position.set(side * r * 0.35, r * 0.1, r * 0.83);
      eye.lookAt(side * r * 0.7, r * 0.12, r * 3.5);
      g.add(eye);
      eyes.push({ grp: eye, pupil });
      const brow = mesh(new THREE.CapsuleGeometry(r * 0.04, r * 0.22, 4, 8), ink, 0, false);
      brow.rotation.z = Math.PI / 2;
      const browHolder = new THREE.Group();
      browHolder.add(brow);
      browHolder.position.set(side * r * 0.35, r * 0.5, r * 0.84);
      browHolder.lookAt(side * r * 0.7, r * 0.55, r * 3.5);
      browHolder.userData.side = side;
      g.add(browHolder);
      brows.push(browHolder);
    }
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff7aa2, transparent: true, opacity: 0.55, depthWrite: false }));
      cheek.scale.set(1.35, 0.8, 0.3);
      cheek.position.set(side * r * 0.6, -r * 0.2, r * 0.74);
      g.add(cheek);
    }
    // mouths (one at a time)
    const mouthAt = (m) => { m.position.set(0, -r * 0.3, r * 0.94); m.lookAt(0, -r * 0.4, r * 4); g.add(m); m.visible = false; return m; };
    const smile = mouthAt(mesh(new THREE.TorusGeometry(r * 0.17, r * 0.045, 6, 16, Math.PI), ink, 0, false));
    smile.rotation.z = Math.PI;
    smile.position.y = -r * 0.22;
    smile.visible = true;
    // big open grin (happy) and an open shouting mouth (angry or scared), each with a tongue
    const grin = new THREE.Group();
    const grinShape = new THREE.Mesh(new THREE.CircleGeometry(r * 0.22, 20, Math.PI, Math.PI), new THREE.MeshBasicMaterial({ color: 0x3a1624 }));
    const grinTongue = new THREE.Mesh(new THREE.CircleGeometry(r * 0.1, 14), new THREE.MeshBasicMaterial({ color: 0xff7a93 }));
    grinTongue.position.set(0, -r * 0.13, 0.002);
    grin.add(grinShape, grinTongue);
    mouthAt(grin);
    grin.position.y = -r * 0.2;
    const shout = new THREE.Group();
    const shoutShape = new THREE.Mesh(new THREE.CircleGeometry(r * 0.13, 18), new THREE.MeshBasicMaterial({ color: 0x3a1624 }));
    shoutShape.scale.set(1, 1.25, 1);
    const shoutTongue = new THREE.Mesh(new THREE.CircleGeometry(r * 0.07, 12), new THREE.MeshBasicMaterial({ color: 0xff7a93 }));
    shoutTongue.position.set(0, -r * 0.07, 0.002);
    shout.add(shoutShape, shoutTongue);
    mouthAt(shout);
    // knocked out: tongue hanging out
    const tongue = mouthAt(mesh(new THREE.CapsuleGeometry(r * 0.07, r * 0.1, 4, 8), toon(0xff7a93), 0.01, false));
    tongue.position.set(r * 0.08, -r * 0.4, r * 0.9);
    tongue.rotation.set(0.3, 0, 0.2);
    // X eyes for knocked out
    const xEyes = new THREE.Group();
    for (const side of [-1, 1]) {
      for (const a of [0.8, -0.8]) {
        const bar = mesh(new THREE.BoxGeometry(r * 0.36, r * 0.08, r * 0.05), ink, 0, false);
        bar.rotation.z = a;
        bar.position.set(side * r * 0.35, r * 0.1, r * 0.97);
        xEyes.add(bar);
      }
    }
    xEyes.visible = false;
    g.add(xEyes);
    const hatMesh = makeHat(hat, dims.headR);
    if (hatMesh) g.add(hatMesh);
    return { group: g, eyes, brows, mouths: { smile, grin, shout, tongue }, xEyes, hat: hatMesh, r };
  }

  // change the face: expression is 'smile', 'happy', 'sad', 'angry', 'oh' (scared) or 'ko'.
  // look = where the eyes look (-1..1 left/right, -1..1 down/up), blink = eyes closed
  function setFace(face, expr, lookX = 0, lookY = 0, blink = false) {
    const ko = expr === 'ko';
    const m = face.mouths;
    const sad = expr === 'sad';
    m.smile.visible = expr === 'smile' || sad;
    m.smile.rotation.z = sad ? 0 : Math.PI; // upside-down smile = sad
    m.smile.position.y = sad ? -face.r * 0.4 : -face.r * 0.22;
    m.grin.visible = expr === 'happy';
    m.shout.visible = expr === 'angry' || expr === 'oh';
    m.shout.scale.setScalar(expr === 'oh' ? 1.25 : 0.9);
    m.tongue.visible = ko;
    face.xEyes.visible = ko;
    const r = face.r;
    for (const e of face.eyes) {
      e.grp.visible = !ko;
      e.grp.scale.y = blink ? 0.1 : (expr === 'oh' ? 1.18 : expr === 'happy' ? 0.85 : sad ? 0.8 : 1);
      e.pupil.position.x = lookX * r * 0.09;
      e.pupil.position.y = lookY * r * 0.08;
      e.pupil.scale.setScalar(expr === 'oh' ? 0.75 : 1);
    }
    for (const b of face.brows) {
      b.visible = !ko;
      const side = b.userData.side;
      // angry: inner ends down. scared: inner ends up. happy: raised
      const tilt = expr === 'angry' ? -0.5 : expr === 'oh' || sad ? 0.4 : expr === 'happy' ? 0.15 : 0.05;
      b.children[0].rotation.set(0, 0, Math.PI / 2 + tilt * side);
      b.children[0].position.y = expr === 'oh' || expr === 'happy' ? r * 0.06 : expr === 'angry' ? -r * 0.04 : 0;
    }
  }

  function makeHat(kind, r) {
    r *= 1.3; // hats are a bit big, it's funnier
    const g = new THREE.Group();
    g.position.y = r * 0.62;
    if (kind === 'party') {
      const cone = mesh(new THREE.ConeGeometry(r * 0.45, r * 1.1, 16), toon(0xff5a5f));
      cone.position.y = r * 0.45;
      cone.rotation.z = -0.25;
      const pom = mesh(new THREE.SphereGeometry(r * 0.14, 10, 8), toon(0xffcf33));
      pom.position.set(0.14 * r * 4 * 0.25 + r * 0.12, r * 1.0, 0);
      const band = mesh(new THREE.TorusGeometry(r * 0.3, r * 0.05, 6, 16), toon(0xffcf33), 0);
      band.rotation.x = Math.PI / 2;
      band.position.y = r * 0.25;
      cone.add(band); band.position.y = -r * 0.2;
      g.add(cone, pom);
    } else if (kind === 'beanie') {
      const cap = mesh(new THREE.SphereGeometry(r * 0.78, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x3d7bff));
      cap.position.y = -r * 0.1;
      const rim = mesh(new THREE.TorusGeometry(r * 0.76, r * 0.12, 8, 24), toon(0xffffff));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = -r * 0.1;
      const pom = mesh(new THREE.SphereGeometry(r * 0.2, 10, 8), toon(0xffffff));
      pom.position.y = r * 0.72;
      g.add(cap, rim, pom);
    } else if (kind === 'crown') {
      const base = mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, r * 0.35, 16, 1, true), toon(0xffcf33, { side: THREE.DoubleSide }));
      base.position.y = r * 0.1;
      g.add(base);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const spike = mesh(new THREE.ConeGeometry(r * 0.12, r * 0.3, 6), toon(0xffcf33));
        spike.position.set(Math.cos(a) * r * 0.45, r * 0.4, Math.sin(a) * r * 0.45);
        const gem = mesh(new THREE.SphereGeometry(r * 0.06, 8, 6), toon(0xff5a8a), 0);
        gem.position.set(Math.cos(a) * r * 0.51, r * 0.12, Math.sin(a) * r * 0.51);
        g.add(spike, gem);
      }
    } else if (kind === 'cowboy') {
      const brim = mesh(new THREE.CylinderGeometry(r * 1.0, r * 1.0, r * 0.06, 24), toon(0xa0643a));
      brim.scale.z = 0.8;
      const top = mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.5, r * 0.5, 16), toon(0xa0643a));
      top.position.y = r * 0.25;
      const band = mesh(new THREE.CylinderGeometry(r * 0.51, r * 0.51, r * 0.1, 16), toon(0x4a2a12), 0);
      band.position.y = r * 0.06;
      g.add(brim, top, band);
      g.rotation.x = -0.12;
    } else if (kind === 'tophat') {
      const brim = mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.72, r * 0.06, 20), toon(0x2a2438));
      const tube = mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.47, r * 0.8, 20), toon(0x2a2438));
      tube.position.y = r * 0.4;
      const band = mesh(new THREE.CylinderGeometry(r * 0.475, r * 0.475, r * 0.14, 20), toon(0xff5a5f), 0);
      band.position.y = r * 0.1;
      g.add(brim, tube, band);
      g.rotation.z = 0.2;
    } else if (kind === 'propeller') {
      const cap = mesh(new THREE.SphereGeometry(r * 0.72, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xffcf33));
      cap.position.y = -r * 0.12;
      const stick = mesh(new THREE.CylinderGeometry(r * 0.04, r * 0.04, r * 0.3, 6), toon(0x555555), 0);
      stick.position.y = r * 0.72;
      const prop = new THREE.Group();
      [0xff5a5f, 0x4aa8ff].forEach((c, i) => {
        const blade = mesh(new THREE.BoxGeometry(r * 1.3, r * 0.04, r * 0.22), toon(c), 0.015);
        blade.rotation.y = i * Math.PI / 2;
        prop.add(blade);
      });
      prop.position.y = r * 0.88;
      g.add(cap, stick, prop);
      g.userData.spin = prop;
    } else if (kind === 'bunny') {
      for (const side of [-1, 1]) {
        const ear = mesh(new THREE.CapsuleGeometry(r * 0.16, r * 0.7, 6, 10), toon(0xffffff));
        ear.position.set(side * r * 0.3, r * 0.45, 0);
        ear.rotation.z = -side * 0.25;
        const inner = mesh(new THREE.CapsuleGeometry(r * 0.08, r * 0.5, 6, 10), toon(0xffa8c8), 0);
        inner.position.z = r * 0.1;
        ear.add(inner);
        g.add(ear);
      }
      g.position.y = r * 0.5;
    } else if (kind === 'police') {
      const cap = mesh(new THREE.CylinderGeometry(r * 0.6, r * 0.5, r * 0.4, 18), toon(0x23305e));
      cap.position.y = r * 0.1;
      const top = mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.6, r * 0.15, 18), toon(0x23305e));
      top.position.y = r * 0.35;
      const visor = mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, r * 0.05, 16, 1, false, -Math.PI / 2, Math.PI), toon(0x111111), 0.01);
      visor.position.set(0, -r * 0.05, r * 0.2);
      const badge = mesh(new THREE.OctahedronGeometry(r * 0.12), toon(0xffcf33), 0);
      badge.position.set(0, r * 0.15, r * 0.6);
      g.add(cap, top, visor, badge);
    } else if (kind === 'chef') {
      const band = mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, r * 0.35, 18), toon(0xffffff));
      band.position.y = r * 0.1;
      const puff = mesh(new THREE.SphereGeometry(r * 0.62, 16, 12), toon(0xffffff));
      puff.scale.y = 0.75;
      puff.position.y = r * 0.55;
      g.add(band, puff);
    } else if (kind === 'wizard') {
      const brim = mesh(new THREE.CylinderGeometry(r * 0.85, r * 0.85, r * 0.05, 24), toon(0x5b3fa8));
      const cone = mesh(new THREE.ConeGeometry(r * 0.5, r * 1.5, 18), toon(0x6a4cc4));
      cone.position.set(0, r * 0.72, 0); cone.rotation.z = -0.18;
      g.add(brim, cone);
      for (let i = 0; i < 4; i++) {
        const st = mesh(new THREE.OctahedronGeometry(r * 0.07), toon(0xffcf33), 0);
        st.position.set(Math.sin(i * 1.7) * r * 0.3 + r * 0.06 * i, r * (0.25 + i * 0.28), Math.cos(i * 1.7) * r * 0.3);
        g.add(st);
      }
    } else if (kind === 'viking') {
      const dome = mesh(new THREE.SphereGeometry(r * 0.74, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x9aa3b5));
      dome.position.y = -r * 0.12;
      const band = mesh(new THREE.TorusGeometry(r * 0.72, r * 0.07, 8, 24), toon(0xd9a52b), 0.01);
      band.rotation.x = Math.PI / 2; band.position.y = -r * 0.1;
      g.add(dome, band);
      for (const side of [-1, 1]) {
        const horn = mesh(new THREE.ConeGeometry(r * 0.14, r * 0.7, 10), toon(0xfff1d6));
        horn.position.set(side * r * 0.78, r * 0.25, 0);
        horn.rotation.z = -side * 0.9;
        g.add(horn);
      }
    } else if (kind === 'halo') {
      const ring = mesh(new THREE.TorusGeometry(r * 0.45, r * 0.07, 10, 28), new THREE.MeshBasicMaterial({ color: 0xffe066 }), 0.015);
      ring.rotation.x = Math.PI / 2; ring.position.y = r * 0.55;
      g.add(ring);
      g.userData.bob = ring;
    } else if (kind === 'pirate') {
      const brim = mesh(new THREE.CylinderGeometry(r * 0.85, r * 0.85, r * 0.08, 3), toon(0x2a2438));
      brim.rotation.y = Math.PI / 6;
      const top = mesh(new THREE.SphereGeometry(r * 0.55, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0x2a2438));
      top.scale.y = 0.9;
      const trim = mesh(new THREE.TorusGeometry(r * 0.56, r * 0.04, 6, 24), toon(0xd9a52b), 0);
      trim.rotation.x = Math.PI / 2; trim.position.y = r * 0.03;
      const skull = mesh(new THREE.SphereGeometry(r * 0.12, 10, 8), toon(0xffffff), 0.01);
      skull.position.set(0, r * 0.25, r * 0.5);
      g.add(brim, top, trim, skull);
    } else if (kind === 'antlers') {
      const brown = toon(0x8a5a3a);
      for (const side of [-1, 1]) {
        const main = mesh(new THREE.CylinderGeometry(r * 0.05, r * 0.07, r * 0.8, 6), brown, 0.015);
        main.position.set(side * r * 0.35, r * 0.3, 0); main.rotation.z = -side * 0.35;
        g.add(main);
        for (const [y, len, tilt] of [[0.35, 0.4, 1.1], [0.55, 0.35, 0.6]]) {
          const tine = mesh(new THREE.CylinderGeometry(r * 0.035, r * 0.05, r * len, 6), brown, 0.012);
          tine.position.set(side * r * (0.4 + len * 0.25), r * y, 0); tine.rotation.z = -side * tilt;
          g.add(tine);
        }
      }
    } else if (kind === 'headphones') {
      const band = mesh(new THREE.TorusGeometry(r * 0.78, r * 0.07, 8, 24, Math.PI), toon(0x3dd6c4), 0.015);
      band.position.y = -r * 0.25;
      g.add(band);
      for (const side of [-1, 1]) {
        const cup = mesh(new THREE.CylinderGeometry(r * 0.24, r * 0.24, r * 0.18, 16), toon(0xff7eb6), 0.02);
        cup.rotation.z = Math.PI / 2; cup.position.set(side * r * 0.8, -r * 0.3, 0);
        g.add(cup);
      }
    } else if (kind === 'flowers') {
      const ring = mesh(new THREE.TorusGeometry(r * 0.6, r * 0.06, 8, 24), toon(0x3faa55), 0.01);
      ring.rotation.x = Math.PI / 2; ring.position.y = -r * 0.1;
      g.add(ring);
      const cols = [0xff7eb6, 0xffcf33, 0xffffff, 0x9b6bff, 0xff5a5f, 0x4aa8ff];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const f = mesh(new THREE.SphereGeometry(r * 0.14, 10, 8), toon(cols[i]), 0.012);
        f.scale.y = 0.6;
        f.position.set(Math.cos(a) * r * 0.6, -r * 0.05, Math.sin(a) * r * 0.6);
        const mid = mesh(new THREE.SphereGeometry(r * 0.06, 8, 6), toon(0xffcf33), 0);
        mid.position.y = r * 0.06;
        f.add(mid);
        g.add(f);
      }
    } else if (kind === 'astronaut') {
      const bubble = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 24, 18), new THREE.MeshPhongMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.28, shininess: 120, depthWrite: false }));
      bubble.position.y = -r * 0.62;
      const collar = mesh(new THREE.TorusGeometry(r * 0.72, r * 0.12, 10, 24), toon(0xffffff), 0.02);
      collar.rotation.x = Math.PI / 2; collar.position.y = -r * 1.3;
      const antenna = mesh(new THREE.CylinderGeometry(r * 0.02, r * 0.02, r * 0.4, 5), toon(0x8a8fa0), 0);
      antenna.position.set(r * 0.35, r * 0.4, 0);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3a3a }));
      tip.position.set(r * 0.35, r * 0.62, 0);
      g.add(bubble, collar, antenna, tip);
    } else if (kind === 'robot') {
      // a little copy of the Robot Boss's head
      const box = mesh(new THREE.BoxGeometry(r * 1.2, r * 0.75, r * 1.1), toon(0xb8c2cc), 0.02);
      box.position.y = r * 0.12;
      const visor = mesh(new THREE.BoxGeometry(r * 1.0, r * 0.28, 0.02), toon(0x2a2140), 0);
      visor.position.set(0, r * 0.14, r * 0.56);
      g.add(box, visor);
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.BoxGeometry(r * 0.26, r * 0.13, 0.02), new THREE.MeshBasicMaterial({ color: 0xff3a3a }));
        eye.position.set(side * r * 0.24, r * 0.15, r * 0.575); g.add(eye);
        const bolt = mesh(new THREE.CylinderGeometry(r * 0.1, r * 0.1, r * 0.12, 10), toon(0xff9a3c), 0.01);
        bolt.rotation.z = Math.PI / 2; bolt.position.set(side * r * 0.65, r * 0.1, 0); g.add(bolt);
      }
      const antenna = mesh(new THREE.CylinderGeometry(r * 0.03, r * 0.03, r * 0.45, 5), toon(0x5a6270), 0);
      antenna.position.y = r * 0.7;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3a3a }));
      tip.position.y = r * 0.95;
      g.add(antenna, tip);
    } else {
      return null;
    }
    return g;
  }

  // an arm: a noodle with a round mitten (and a thumb!)
  function makeArm(c, dims) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CapsuleGeometry(dims.armR, dims.armL, 6, 10), charToon(c.body)));
    const hand = mesh(new THREE.SphereGeometry(dims.armR * 1.45, 14, 10), charToon(c.light));
    hand.scale.set(1, 1.1, 0.9);
    hand.position.y = -dims.armL / 2 - dims.armR * 0.4;
    const thumb = mesh(new THREE.SphereGeometry(dims.armR * 0.6, 10, 8), charToon(c.light), 0.012);
    thumb.position.set(0, dims.armR * 0.3, dims.armR * 1.1);
    hand.add(thumb);
    g.add(hand);
    return g;
  }

  // a leg: a stubby noodle with a sneaker (with a white sole)
  function makeLeg(c, dims) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CapsuleGeometry(dims.legR, dims.legL, 6, 10), charToon(c.body)));
    const shoe = mesh(new THREE.SphereGeometry(dims.legR * 1.4, 14, 10), toon(0x3a3350));
    shoe.scale.set(1, 0.72, 1.5);
    shoe.position.set(0, -dims.legL / 2 - dims.legR * 0.3, dims.legR * 0.4);
    const sole = mesh(new THREE.CylinderGeometry(dims.legR * 1.35, dims.legR * 1.35, 0.05, 14), toon(0xffffff), 0.01);
    sole.scale.set(1, 1, 1.5);
    sole.position.y = -dims.legR * 0.85;
    shoe.add(sole);
    const lace = mesh(new THREE.BoxGeometry(dims.legR * 1.1, 0.03, 0.05), toon(0xffffff), 0);
    lace.position.set(0, dims.legR * 0.55, dims.legR * 0.7);
    shoe.add(lace);
    g.add(shoe);
    return g;
  }

  // ------------------------------------------------------------
  //  WORLD DECORATION
  // ------------------------------------------------------------
  function skyTexture() {
    const cv = document.createElement('canvas');
    cv.width = 4; cv.height = 256;
    const g = cv.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#5ab8ff');
    grad.addColorStop(0.55, '#a8dcff');
    grad.addColorStop(1, '#ffe6f2');
    g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function cloud(scale = 1) {
    const g = new THREE.Group();
    const m = toon(0xffffff);
    const puffs = [[0, 0, 0, 1.2], [1.1, -0.1, 0.2, 0.9], [-1.1, -0.15, 0, 0.85], [0.4, 0.5, -0.2, 0.8], [-0.5, 0.35, 0.3, 0.75]];
    for (const [x, y, z, r] of puffs) {
      const p = mesh(new THREE.SphereGeometry(r, 14, 10), m, 0, false);
      p.position.set(x, y, z);
      g.add(p);
    }
    g.scale.setScalar(scale);
    return g;
  }

  function tree(scale = 1) {
    const g = new THREE.Group();
    const trunk = mesh(new THREE.CylinderGeometry(0.15, 0.22, 1, 8), toon(0x9a6a44));
    trunk.position.y = 0.5;
    const leaves = mesh(new THREE.SphereGeometry(0.75, 14, 10), toon(0x4cc26a));
    leaves.position.y = 1.4;
    const leaves2 = mesh(new THREE.SphereGeometry(0.5, 12, 8), toon(0x5fd67c));
    leaves2.position.set(0.35, 1.85, 0.1);
    g.add(trunk, leaves, leaves2);
    g.scale.setScalar(scale);
    return g;
  }

  function flower(color) {
    const g = new THREE.Group();
    const stem = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), toon(0x3faa55), 0);
    stem.position.y = 0.15;
    const head = mesh(new THREE.SphereGeometry(0.08, 8, 6), toon(color), 0.01);
    head.position.y = 0.32;
    g.add(stem, head);
    return g;
  }

  // a floating island block: grass on top, dirt on the sides
  function islandBlock(w, h, d, grass = 0x7ad35e, dirt = 0xc98b58) {
    const g = new THREE.Group();
    const dirtBox = boxMesh(w, h, d, toon(dirt));
    g.add(dirtBox);
    const top = boxMesh(w + 0.08, 0.25, d + 0.08, toon(grass), 0.05);
    top.position.y = h / 2 - 0.1;
    g.add(top);
    return g;
  }

  return { toon, charToon, mesh, boxMesh, COLORS, HATS, FREE_HATS, SHOP_HATS, OUTFITS, FREE_OUTFITS, SHOP_OUTFITS, TOUR_OUTFITS, TOUR_HATS, OUTFIT_NAMES, makeTorso, makeHead, makeHat, makeArm, makeLeg, setFace, skyTexture, cloud, tree, flower, islandBlock, outlineMat };
})();
