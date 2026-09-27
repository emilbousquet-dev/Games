// ============================================================
//  FLOPPY PARTY — THE CARTOON LOOK
//  Toon shading (3 shades per color), black outlines,
//  cute bean characters, hats, trees, clouds...
// ============================================================
window.FP = window.FP || {};

FP.Look = (function () {
  // a tiny 3-step texture that makes lighting look like a cartoon
  const gradient = (() => {
    const data = new Uint8Array([90, 90, 90, 255, 180, 180, 180, 255, 255, 255, 255, 255]);
    const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  })();

  const cache = new Map();
  function toon(color, opts = {}) {
    const key = color + JSON.stringify(opts);
    if (!opts.unique && cache.has(key)) return cache.get(key);
    const m = new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradient }, opts));
    delete m.unique;
    if (!opts.unique) cache.set(key, m);
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
  const HATS = ['party', 'beanie', 'crown', 'cowboy', 'tophat', 'propeller', 'bunny', 'chef', 'none'];

  // body: a round bean with a lighter tummy
  function makeTorso(c, dims) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CapsuleGeometry(dims.torsoR, dims.torsoH, 8, 18), toon(c.body)));
    const belly = mesh(new THREE.SphereGeometry(dims.torsoR * 0.78, 18, 14), toon(c.light), 0);
    belly.scale.set(1, 1.15, 0.5);
    belly.position.set(0, -0.05, dims.torsoR * 0.55);
    g.add(belly);
    return g;
  }

  function makeHead(c, dims, hat) {
    const g = new THREE.Group();
    const r = dims.headR;
    g.add(mesh(new THREE.SphereGeometry(r, 24, 18), toon(c.body)));
    // big shiny eyes
    const eyes = [];
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      const white = mesh(new THREE.SphereGeometry(r * 0.36, 16, 12), toon(0xffffff), 0.015, false);
      white.scale.set(0.85, 1.1, 0.5);
      const pupil = mesh(new THREE.SphereGeometry(r * 0.23, 14, 10), toon(0x1d1a2f), 0, false);
      pupil.scale.set(0.85, 1.1, 0.5);
      pupil.position.z = r * 0.07;
      const shine = mesh(new THREE.SphereGeometry(r * 0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), 0, false);
      shine.position.set(r * 0.05, r * 0.07, r * 0.12);
      eye.add(white, pupil, shine);
      eye.position.set(side * r * 0.38, r * 0.12, r * 0.84);
      eye.lookAt(side * r * 0.6, r * 0.15, r * 3);
      g.add(eye);
      eyes.push(eye);
    }
    // rosy cheeks
    for (const side of [-1, 1]) {
      const cheek = mesh(new THREE.SphereGeometry(r * 0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff7aa2, transparent: true, opacity: 0.55 }), 0, false);
      cheek.scale.set(1.3, 0.8, 0.3);
      cheek.position.set(side * r * 0.62, -r * 0.18, r * 0.72);
      g.add(cheek);
    }
    // mouths: happy smile, surprised "O", and dizzy squiggle (shown one at a time)
    const smile = mesh(new THREE.TorusGeometry(r * 0.18, r * 0.045, 6, 14, Math.PI), toon(0x1d1a2f), 0, false);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -r * 0.2, r * 0.95);
    const oh = mesh(new THREE.TorusGeometry(r * 0.11, r * 0.05, 6, 14), toon(0x1d1a2f), 0, false);
    oh.position.set(0, -r * 0.3, r * 0.93);
    oh.visible = false;
    g.add(smile, oh);
    // X eyes for knocked out
    const xEyes = new THREE.Group();
    for (const side of [-1, 1]) {
      for (const a of [0.8, -0.8]) {
        const bar = mesh(new THREE.BoxGeometry(r * 0.38, r * 0.08, r * 0.05), toon(0x1d1a2f), 0, false);
        bar.rotation.z = a;
        bar.position.set(side * r * 0.36, r * 0.12, r * 0.97);
        xEyes.add(bar);
      }
    }
    xEyes.visible = false;
    g.add(xEyes);
    const hatMesh = makeHat(hat, r);
    if (hatMesh) g.add(hatMesh);
    return { group: g, eyes, smile, oh, xEyes, hat: hatMesh };
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
    } else if (kind === 'chef') {
      const band = mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, r * 0.35, 18), toon(0xffffff));
      band.position.y = r * 0.1;
      const puff = mesh(new THREE.SphereGeometry(r * 0.62, 16, 12), toon(0xffffff));
      puff.scale.y = 0.75;
      puff.position.y = r * 0.55;
      g.add(band, puff);
    } else {
      return null;
    }
    return g;
  }

  // an arm: a noodle with a round mitten at the end (pivot at the shoulder)
  function makeArm(c, dims) {
    const g = new THREE.Group();
    const noodle = mesh(new THREE.CapsuleGeometry(dims.armR, dims.armL, 6, 10), toon(c.body));
    g.add(noodle);
    const hand = mesh(new THREE.SphereGeometry(dims.armR * 1.35, 12, 10), toon(c.light));
    hand.position.y = -dims.armL / 2 - dims.armR * 0.4;
    g.add(hand);
    return g;
  }

  // a leg: a stubby noodle with a shoe
  function makeLeg(c, dims) {
    const g = new THREE.Group();
    g.add(mesh(new THREE.CapsuleGeometry(dims.legR, dims.legL, 6, 10), toon(c.body)));
    const shoe = mesh(new THREE.SphereGeometry(dims.legR * 1.35, 12, 10), toon(0x3a3350));
    shoe.scale.set(1, 0.7, 1.45);
    shoe.position.set(0, -dims.legL / 2 - dims.legR * 0.35, dims.legR * 0.35);
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

  return { toon, mesh, boxMesh, COLORS, HATS, makeTorso, makeHead, makeHat, makeArm, makeLeg, skyTexture, cloud, tree, flower, islandBlock, outlineMat };
})();
