// ============================================================
//  STARFALL — ALIEN PLANTS, ROCKS AND CRYSTALS
//  Thousands of them! They are drawn in groups ("instancing"),
//  so the computer only has to draw each kind once.
// ============================================================
window.SF = window.SF || {};

SF.Nature = (function () {
  const U = SF.U, G = SF.Models.G, T = SF.Terrain;
  const glowMats = [];

  // ---------- the kinds of plants ----------
  // each one: how to build it, where it grows, how many, and its bump size
  function kinds() {
    const B = () => SF.Models.builder();
    return {
      glowtree: {
        biomes: ['jungle'], count: 520, slope: 0.8, cluster: 0.1, scale: [0.8, 1.35], collide: { r: 0.55, top: 7 },
        build() {
          const b = B();
          b.add(new THREE.CylinderGeometry(0.28, 0.45, 5, 6, 1, true), 0x2a4a5a, 0, 2.5, 0);
          b.add(new THREE.CylinderGeometry(0.18, 0.28, 2.5, 5, 1, true), 0x2a4a5a, 0.4, 5.8, 0, 0, 0, -0.3);
          b.add(new THREE.IcosahedronGeometry(2.1, 0), 0x1a9a9a, 0.6, 7.4, 0);
          b.add(new THREE.IcosahedronGeometry(1.6, 0), 0x2080b0, -0.8, 6.6, 0.6);
          b.add(new THREE.IcosahedronGeometry(1.4, 0), 0x20a0a0, 0.4, 6.4, -1.1);
          for (let k = 0; k < 6; k++) b.glow(G.oct(0.2), 0x80fff0, Math.cos(k) * 1.6, 5.4 + (k % 2) * 0.4, Math.sin(k) * 1.6);
          return b;
        },
      },
      mushroom: {
        biomes: ['jungle'], count: 90, slope: 0.5, cluster: 0.3, scale: [0.8, 1.6], collide: { r: 0.7, top: 5.2, cap: { r: 3, y: 5.4 } },
        build() {
          const b = B();
          b.add(G.cyl(0.45, 0.7, 5.2, 8), 0xf0e0f0, 0, 2.6, 0);
          b.add(new THREE.SphereGeometry(3.1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), 0xd040a0, 0, 5.1, 0, 0, 0, 0, 1, 0.5, 1);
          b.glow(new THREE.CylinderGeometry(3.05, 1.2, 0.3, 14, 1, true), 0xff80e0, 0, 5.0, 0);
          for (let k = 0; k < 7; k++) { const a = k * 0.9; b.glow(G.sph(0.3, 6, 4), 0xfff080, Math.cos(a) * 1.9, 5.9 + Math.sin(k * 2) * 0.1, Math.sin(a) * 1.9); }
          return b;
        },
      },
      bush: {
        biomes: ['jungle', 'plains'], count: 900, slope: 0.9, cluster: 0.2, scale: [0.6, 1.3],
        build() {
          const b = B();
          for (let k = 0; k < 5; k++) b.add(G.cone(0.25, 1.6, 4), 0x20a080, Math.cos(k * 1.3) * 0.3, 0.7, Math.sin(k * 1.3) * 0.3, Math.cos(k * 1.3) * 0.5, 0, Math.sin(k * 1.3) * 0.5);
          b.glow(G.sph(0.12, 5, 4), 0xa0ffff, 0, 1.4, 0);
          return b;
        },
      },
      grass: {
        biomes: ['jungle', 'plains', 'desert'], count: 6000, slope: 1.0, cluster: 0.0, scale: [0.7, 1.4], tint: true, noShadow: true,
        build() {
          const b = B();
          for (let k = 0; k < 3; k++) b.add(new THREE.ConeGeometry(0.07, 0.8, 3, 1, true), 0xffffff, Math.cos(k * 2.1) * 0.12, 0.4, Math.sin(k * 2.1) * 0.12, Math.cos(k * 2.1) * 0.3, 0, Math.sin(k * 2.1) * 0.3);
          return b;
        },
      },
      bulb: {
        biomes: ['plains'], count: 500, slope: 0.8, cluster: 0.15, scale: [0.7, 1.4], noShadow: true,
        build() {
          const b = B();
          b.add(G.cyl(0.04, 0.06, 1.2, 4), 0x3a6a5a, 0, 0.6, 0, 0, 0, 0.1);
          b.add(G.cone(0.2, 0.5, 4), 0x3a8a6a, 0.1, 0.3, 0, 0, 0, -0.8);
          b.glow(G.sph(0.2, 7, 5), 0xffa0ff, 0.06, 1.25, 0);
          return b;
        },
      },
      lollipop: {
        biomes: ['plains'], count: 240, slope: 0.6, cluster: 0.25, scale: [0.8, 1.4], collide: { r: 0.4, top: 6 },
        build() {
          const b = B();
          b.add(G.cyl(0.2, 0.3, 5, 6), 0x5a3a6a, 0, 2.5, 0);
          b.add(G.ico(1.8, 1), 0xff90d0, 0, 5.8, 0, 0, 0, 0, 1, 0.8, 1);
          b.add(G.tor(1.7, 0.12, 4, 14), 0xffffff, 0, 5.7, 0, Math.PI / 2, 0, 0);
          b.glow(G.sph(0.3, 6, 4), 0xfff0a0, 0, 7.1, 0);
          return b;
        },
      },
      crystal: {
        biomes: ['desert', 'frozen'], count: 420, slope: 1.0, cluster: 0.2, scale: [0.6, 1.8], tint: true, collide: { r: 0.9, top: 2.4 },
        build() {
          const b = B();
          b.glow(G.oct(0.6), 0xffffff, 0, 1.4, 0, 0, 0, 0, 0.8, 2.6, 0.8);
          b.glow(G.oct(0.4), 0xdddddd, 0.6, 0.8, 0.2, 0, 0, -0.5, 0.8, 2.2, 0.8);
          b.glow(G.oct(0.35), 0xcccccc, -0.5, 0.7, -0.3, 0.3, 0, 0.6, 0.8, 2.0, 0.8);
          b.add(G.dod(0.6), 0x6a5a6a, 0, 0.1, 0, 0, 0, 0, 1.2, 0.4, 1.2);
          return b;
        },
      },
      rock: {
        biomes: ['plains', 'jungle', 'desert', 'frozen', 'lava'], count: 700, slope: 1.4, cluster: 0.3, scale: [0.5, 2.6], tint: true, collide: { r: 1.1, top: 1.0, stand: true },
        build() {
          const b = B();
          b.add(G.dod(1.2), 0xffffff, 0, 0.4, 0, 0.3, 0.5, 0, 1.1, 0.75, 1);
          return b;
        },
      },
      tube: {
        biomes: ['desert'], count: 260, slope: 0.7, cluster: 0.3, scale: [0.7, 1.5], collide: { r: 0.5, top: 3 },
        build() {
          const b = B();
          const parts = [[0, 0, 3], [0.6, 0.3, 2], [-0.5, -0.4, 2.4]];
          for (const [x, z, h] of parts) {
            b.add(G.cyl(0.28, 0.32, h, 7), 0x40a080, x, h / 2, z);
            b.glow(G.sph(0.3, 7, 5), 0xff60c0, x, h, z);
          }
          return b;
        },
      },
      icepine: {
        biomes: ['frozen'], count: 480, slope: 0.9, cluster: 0.25, scale: [0.7, 1.4], collide: { r: 0.5, top: 7 },
        build() {
          const b = B();
          b.add(G.cyl(0.2, 0.3, 2, 6), 0x3a3a5a, 0, 1, 0);
          for (let k = 0; k < 3; k++) {
            b.add(G.cone(2.2 - k * 0.55, 2.6, 7), 0x3a8aa8, 0, 2.8 + k * 1.5, 0);
            b.add(G.cone(1.6 - k * 0.45, 1.0, 7), 0xf4f8ff, 0, 3.8 + k * 1.5, 0);
          }
          b.glow(G.oct(0.25), 0x80e0ff, 0, 7.3, 0);
          return b;
        },
      },
      spire: {
        biomes: ['lava'], count: 240, slope: 1.5, cluster: 0.2, scale: [0.6, 1.6], collide: { r: 1.0, top: 6 },
        build() {
          const b = B();
          b.add(G.cone(1.3, 7, 6), 0x1e1618, 0, 3.5, 0);
          b.glow(G.cyl(0.95, 1.05, 0.25, 6), 0xff5010, 0, 1.6, 0);
          b.glow(G.cyl(0.5, 0.58, 0.2, 6), 0xff8020, 0, 4.2, 0);
          return b;
        },
      },
    };
  }

  // colors for things that change color per region
  const TINTS = {
    grass: { plains: [0xb080ff, 0x8a60e0], jungle: [0x30d0a0, 0x20a0c0], desert: [0xffc0d0, 0xf0a0b8] },
    crystal: { desert: [0xff70c0, 0x70f0ff], frozen: [0x90e0ff, 0xc0f0ff] },
    rock: { plains: [0x8a7aa0, 0x6a5a80], jungle: [0x5a7a7a, 0x4a6a70], desert: [0xd08a9a, 0xb07080], frozen: [0xc0cce0, 0x9aa8c0], lava: [0x2a2224, 0x3a2a2a] },
  };

  function build(scene) {
    const rnd = U.seeded(SF.Layout.seed + 77);
    const all = kinds();
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const col = new THREE.Color(), c2 = new THREE.Color();
    for (const name in all) {
      const k = all[name];
      const want = Math.round(k.count * (SF.lowGfx ? (name === 'grass' ? 0.3 : 0.6) : 1));
      const spots = [];
      let tries = 0;
      while (spots.length < want && tries < want * 40) {
        tries++;
        const x = (rnd() * 2 - 1) * 300, z = (rnd() * 2 - 1) * 300;
        const reg = T.regionAt(x, z);
        if (!k.biomes.includes(reg)) continue;
        const h = T.heightAt(x, z);
        if (h < 0.8) continue;
        if (reg === 'lava' && (T.inLava(x, z) && h < T.LAVA_Y + 1)) continue;
        if (T.slopeAt(x, z) > k.slope) continue;
        // plants grow in groups
        if (k.cluster && SF.Noise.n2(x * 0.03 + name.length * 7, z * 0.03) < -0.4 + k.cluster) continue;
        if (!SF.Phys.isClear(x, z)) continue;
        const sc = U.lerp(k.scale[0], k.scale[1], rnd());
        spots.push({ x, z, y: h, sc, ry: rnd() * Math.PI * 2, reg, t: rnd() });
        if (k.collide) {
          const cc = k.collide;
          if (cc.cap) {
            SF.Phys.addCyl(x, z, cc.r * sc, h - 1, h + cc.top * sc);
            SF.Phys.addCyl(x, z, cc.cap.r * sc, h + (cc.cap.y - 0.8) * sc, h + cc.cap.y * sc, { noArrow: true });
          } else {
            const top = cc.stand ? h + cc.top * sc * 1.1 : h + cc.top * sc;
            SF.Phys.addCyl(x, z, cc.r * sc, h - 1, top);
          }
        }
      }
      if (!spots.length) continue;
      const b = k.build();
      const geos = b.geos();
      // split the plants into 16 areas, so only the areas you can see get drawn
      const buckets = new Map();
      for (const sp of spots) {
        const key = Math.floor((sp.x + 320) / 160) * 10 + Math.floor((sp.z + 320) / 160);
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(sp);
      }
      const make = (geo, mat) => {
        for (const list of buckets.values()) {
          const im = new THREE.InstancedMesh(geo, mat, list.length);
          list.forEach((sp, i) => {
            if (name === 'bush') { (sp.inst = sp.inst || []).push({ im, i }); }
            e.set(0, sp.ry, 0); q.setFromEuler(e);
            p.set(sp.x, sp.y - 0.1, sp.z); s.set(sp.sc, sp.sc, sp.sc);
            m4.compose(p, q, s);
            im.setMatrixAt(i, m4);
            if (k.tint || name === 'rock') {
              const tt = (TINTS[name] && TINTS[name][sp.reg]) || [0xffffff, 0xdddddd];
              col.set(tt[0]).lerp(c2.set(tt[1]), sp.t);
              im.setColorAt(i, col);
            }
          });
          im.castShadow = !k.noShadow && !SF.lowGfx && mat === SF.Models.M.vc;
          im.receiveShadow = !SF.lowGfx;
          im.computeBoundingSphere();
          scene.add(im);
        }
      };
      if (geos.body) make(geos.body, SF.Models.M.vc);
      if (name === 'bush') bushes = spots;
      if (geos.glow) {
        const gm = new THREE.MeshBasicMaterial({ vertexColors: true });
        glowMats.push(gm);
        make(geos.glow, gm);
      }
    }
  }

  // glowing plants glow brighter at night
  function update(night, dt = 0) {
    const v = 0.75 + night * 0.35;
    for (const m of glowMats) m.color.setScalar(v);
    // cut bushes grow back after a while
    for (let k = cut.length - 1; k >= 0; k--) {
      const b = cut[k];
      b.t -= dt;
      if (b.t <= 0) { showBush(b.sp, true); cut.splice(k, 1); }
    }
  }

  // ---------- cutting bushes with your sword (like in Zelda!) ----------
  let bushes = [];
  const cut = [];
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  function showBush(sp, on) {
    const m = new THREE.Matrix4();
    m.compose(new THREE.Vector3(sp.x, sp.y - 0.1, sp.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sp.ry, 0)), new THREE.Vector3(sp.sc, sp.sc, sp.sc));
    for (const { im, i } of sp.inst) { im.setMatrixAt(i, on ? m : zero); im.instanceMatrix.needsUpdate = true; }
    sp.gone = !on;
  }
  function cutBushes(x, z, r) {
    let n = 0;
    for (const sp of bushes) {
      if (sp.gone || Math.abs(sp.x - x) > r + 1 || Math.abs(sp.z - z) > r + 1) continue;
      if (Math.hypot(sp.x - x, sp.z - z) > r + 0.4 * sp.sc) continue;
      showBush(sp, false);
      cut.push({ sp, t: 120 });
      SF.FX.burst(sp.x, sp.y + 0.6, sp.z, 0x40d0a0, 14);
      if (Math.random() < 0.35) SF.World.dropLoot(sp.x, sp.y + 0.6, sp.z, [1, 1]);
      n++;
    }
    if (n) SF.Audio.sfx('pop');
    return n;
  }

  return { build, update, cutBushes };
})();
