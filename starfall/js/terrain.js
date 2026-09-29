// ============================================================
//  STARFALL — THE GROUND: hills, mountains, rivers, sea and lava
// ============================================================
window.SF = window.SF || {};

SF.Terrain = (function () {
  const U = SF.U, N = SF.Noise, L = SF.Layout;
  const HALF = 320;          // the world goes from -320 to +320 meters
  const RES = 2;             // one grid square = 2 meters
  const GN = HALF * 2 / RES + 1; // grid points per side (321)
  const WATER_Y = 0;
  const LAVA_Y = 11;
  const CHUNK = 32;          // grid squares per chunk

  const H = new Float32Array(GN * GN);   // height of every grid point
  const BIO = new Uint8Array(GN * GN);   // which region every grid point is in
  const REG = ['plains', 'jungle', 'desert', 'frozen', 'lava'];
  const regionIndex = {}; REG.forEach((r, i) => (regionIndex[r] = i));
  let lava = null, lavaC = null, templeFlat = [];

  // ---------- distance from a point to a line of points ----------
  function distToPath(x, z, pts) {
    let best = 1e9;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const dx = bx - ax, dz = bz - az;
      const t = U.clamp(((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz), 0, 1);
      best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
    }
    return best;
  }

  // how much each region "owns" this spot (numbers that add up to 1)
  function regionWeights(x, z, out) {
    const wx = x + N.n2(x * 0.011, z * 0.011) * 28, wz = z + N.n2(x * 0.011 + 40, z * 0.011 - 7) * 28;
    let tot = 0;
    for (let i = 0; i < 5; i++) {
      const r = L.regions[i];
      const d = Math.hypot(wx - r.x, wz - r.z);
      const sig = i === 0 ? 95 : 85;
      const w = Math.exp(-(d / sig) * (d / sig)) + 1e-6;
      out[i] = w; tot += w;
    }
    for (let i = 0; i < 5; i++) out[i] /= tot;
    return out;
  }

  const W = new Float32Array(5);
  // ---------- THE HEIGHT RECIPE ----------
  function rawHeight(x, z) {
    const r = Math.hypot(x, z);
    const ang = Math.atan2(z, x);
    const coast = 262 + N.fbm(Math.cos(ang) * 2.2 + 5, Math.sin(ang) * 2.2 + 5, 3) * 34;
    const land = U.smooth(coast + 15, coast - 35, r);

    regionWeights(x, z, W);
    const hPlains = 6 + N.fbm(x * 0.012, z * 0.012) * 5 + N.fbm(x * 0.05, z * 0.05, 2) * 0.8;
    const hJungle = 6 + N.fbm(x * 0.02, z * 0.02) * 8 + Math.max(0, N.fbm(x * 0.008 + 3, z * 0.008)) * 12;
    const hDesert = 9 + Math.sin((x * 0.9 + z * 0.4) * 0.09 + N.n2(x * 0.02, z * 0.02) * 2.2) * 2.2 + N.fbm(x * 0.01, z * 0.01) * 5;
    const rid = N.ridged(x * 0.009, z * 0.009);
    const hFrozen = 10 + Math.pow(rid, 1.6) * 80 + N.fbm(x * 0.03, z * 0.03, 2) * 2;
    const hLava = 11 + N.fbm(x * 0.015, z * 0.015) * 6;
    let h = W[0] * hPlains + W[1] * hJungle + W[2] * hDesert + W[3] * hFrozen + W[4] * hLava;

    // the pass into the Frozen Peaks (so you can walk to the temple)
    const t2 = L.temples[2];
    const pass = distToPath(x, z, [[0, -60], [-8, -130], [t2.x, t2.z]]);
    const passH = 14 + U.clamp((-60 - z) / 140, 0, 1) * 8;
    h = U.lerp(h, Math.min(h, passH + N.fbm(x * 0.05, z * 0.05, 2) * 1.5), U.smooth(22, 9, pass));

    // the glide hill in the desert
    const gh = L.glideHill;
    const dg = Math.hypot(x - gh.x, z - gh.z);
    const hill = gh.height * Math.pow(U.clamp(1 - dg / gh.radius, 0, 1), 0.9) + N.fbm(x * 0.05, z * 0.05, 2) * 1.2;
    h = Math.max(h, hill);

    // rivers
    for (const rv of L.rivers) {
      const rd = distToPath(x, z, rv);
      if (rd < 24) h = U.lerp(-1.8, h, U.smooth(3, 22, rd));
    }

    // flat places: the crash site, the village and the temple plazas
    const flat = (px, pz, inner, outer, fh) => {
      const d = Math.hypot(x - px, z - pz);
      if (d < outer) h = U.lerp(h, fh, U.smooth(outer, inner, d));
    };
    flat(L.crash.x, L.crash.z, 16, 30, 3.2);
    flat(L.village.x, L.village.z, 22, 34, 8);
    flat(L.temples[0].x, L.temples[0].z, 16, 26, 9);
    flat(t2.x, t2.z, 22, 36, 22);

    // the desert temple sits on top of a cliff (a mesa). You need to glide there!
    const t1 = L.temples[1];
    const dm = Math.hypot(x - t1.x, z - t1.z);
    h = U.lerp(h, 48 + N.fbm(x * 0.08, z * 0.08, 2) * 0.6, U.smooth(30, 27, dm));

    // the sea
    h = U.lerp(-14 + N.fbm(x * 0.02, z * 0.02, 2) * 3, h, land);

    // the LAVA RIFT: a giant ring of cliffs with lava inside
    const dL = Math.hypot(x - lavaC.x, z - lavaC.z);
    if (dL < 95) {
      const wall = 58 + N.fbm(x * 0.04, z * 0.04, 3) * 3;
      h = U.lerp(h, wall, U.smooth(89, 77, dL));
      h = U.lerp(h, 5 + N.fbm(x * 0.06, z * 0.06, 2) * 2, U.smooth(58, 51, dL));
      // little rock islands in the lava
      const a = Math.atan2(z - lavaC.z, x - lavaC.x);
      const isl = Math.max(0, N.n2(Math.cos(a) * 3 + dL * 0.09, Math.sin(a) * 3 + 11)) ;
      if (dL < 50 && dL > 22) h = Math.max(h, U.lerp(5, 13.5, U.smooth(0.35, 0.45, isl)));
      // the island in the middle, where the temple stands
      h = U.lerp(h, 15 + N.fbm(x * 0.1, z * 0.1, 2) * 0.5, U.smooth(20, 16, dL));
    }
    return h;
  }

  // ---------- which region is here? ----------
  function computeBiome(x, z) {
    regionWeights(x, z, W);
    let best = 0;
    for (let i = 1; i < 5; i++) if (W[i] > W[best]) best = i;
    if (Math.hypot(x - lavaC.x, z - lavaC.z) < 80) best = 4;
    return best;
  }

  // ---------- build the height grid ----------
  function generate() {
    N.setSeed(L.seed);
    lavaC = L.regions[4];
    for (let j = 0; j < GN; j++) {
      for (let i = 0; i < GN; i++) {
        const x = -HALF + i * RES, z = -HALF + j * RES;
        H[j * GN + i] = rawHeight(x, z);
        BIO[j * GN + i] = computeBiome(x, z);
      }
    }
  }

  // ---------- height anywhere (exactly matches the triangles you see) ----------
  function heightAt(x, z) {
    const gx = (x + HALF) / RES, gz = (z + HALF) / RES;
    if (gx < 0 || gz < 0 || gx >= GN - 1 || gz >= GN - 1) return -14;
    const i = Math.floor(gx), j = Math.floor(gz);
    const fx = gx - i, fz = gz - j;
    const k = j * GN + i;
    const h00 = H[k], h10 = H[k + 1], h01 = H[k + GN], h11 = H[k + GN + 1];
    if (fx + fz < 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  }

  // how steep the ground is (0 = flat, 1 = 45 degrees)
  function slopeAt(x, z) {
    const e = 1;
    const dx = heightAt(x + e, z) - heightAt(x - e, z);
    const dz = heightAt(x, z + e) - heightAt(x, z - e);
    return Math.hypot(dx, dz) / (2 * e);
  }
  // the downhill direction
  function gradAt(x, z) {
    const e = 1;
    return { x: (heightAt(x + e, z) - heightAt(x - e, z)) / (2 * e), z: (heightAt(x, z + e) - heightAt(x, z - e)) / (2 * e) };
  }

  function biomeAt(x, z) {
    const gx = Math.round((x + HALF) / RES), gz = Math.round((z + HALF) / RES);
    if (gx < 0 || gz < 0 || gx >= GN || gz >= GN) return 0;
    return BIO[gz * GN + gx];
  }
  function regionAt(x, z) { return REG[biomeAt(x, z)]; }
  function regionName(x, z) {
    if (heightAt(x, z) < -3) return 'THE GLIMMER SEA';
    return L.regions[biomeAt(x, z)].name;
  }
  function inLava(x, z) { return Math.hypot(x - lavaC.x, z - lavaC.z) < 56; }

  // ---------- colors ----------
  const C = (h) => new THREE.Color(h);
  const COL = {
    plains: [C(0x8a63d2), C(0x6a45b0)], plainsRock: C(0x5a4a70),
    jungle: [C(0x1ea889), C(0x187a8f)], jungleRock: C(0x345a5c),
    desert: [C(0xf0aabb), C(0xe08fa6)], desertRock: C(0xb86a82),
    frozen: [C(0xe8f0ff), C(0xc8dcff)], frozenRock: C(0x6e7896),
    lava: [C(0x2c2328), C(0x3a2a2c)], lavaRock: C(0x1c1618),
    sand: C(0xf2e0a8), under: C(0x1e5a66), glow: C(0xff5020),
  };
  const tmp = new THREE.Color(), tmp2 = new THREE.Color();
  function colorAt(x, z, h, slope, out) {
    regionWeights(x, z, W);
    const dL = Math.hypot(x - lavaC.x, z - lavaC.z);
    if (dL < 85) { W.fill(0); W[4] = 1; }
    out.setRGB(0, 0, 0);
    const nv = N.n2(x * 0.08, z * 0.08) * 0.5 + 0.5;
    for (let i = 0; i < 5; i++) {
      if (W[i] < 0.01) continue;
      const r = REG[i];
      tmp.copy(COL[r][0]).lerp(COL[r][1], nv);
      // snow only high up in the Frozen Peaks, grey rock lower down
      if (r === 'frozen' && h < 18) tmp.lerp(COL.frozenRock, 0.35 + 0.3 * nv);
      tmp.lerp(COL[r + 'Rock'], U.smooth(0.75, 1.3, slope));
      out.r += tmp.r * W[i]; out.g += tmp.g * W[i]; out.b += tmp.b * W[i];
    }
    if (dL < 58 && h < 16) out.lerp(COL.glow, U.smooth(13, 7, h) * 0.7);
    if (h < 2.2 && dL > 90) out.lerp(COL.sand, U.smooth(2.2, 0.8, h));
    if (h < -0.6) out.lerp(COL.under, U.smooth(-0.6, -5, h));
    const v = 0.93 + N.n2(x * 0.5, z * 0.5) * 0.07;
    out.multiplyScalar(v);
    return out;
  }

  // ---------- 3D meshes ----------
  let meshes = [], waterMat, lavaMat, lavaTex;
  function build(scene) {
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const chunks = (GN - 1) / CHUNK;
    const step = SF.lowGfx ? 2 : 1;
    const c = new THREE.Color();
    for (let cz = 0; cz < chunks; cz++) {
      for (let cx = 0; cx < chunks; cx++) {
        const n = CHUNK / step + 1;
        const pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), col = new Float32Array(n * n * 3);
        let k = 0;
        for (let j = 0; j < n; j++) {
          for (let i = 0; i < n; i++) {
            const gi = cx * CHUNK + i * step, gj = cz * CHUNK + j * step;
            const x = -HALF + gi * RES, z = -HALF + gj * RES;
            const h = H[gj * GN + gi];
            pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
            const hl = H[gj * GN + Math.max(0, gi - 1)], hr = H[gj * GN + Math.min(GN - 1, gi + 1)];
            const hu = H[Math.max(0, gj - 1) * GN + gi], hd = H[Math.min(GN - 1, gj + 1) * GN + gi];
            const nx = hl - hr, nz = hu - hd, ny = 2 * RES;
            const nl = Math.hypot(nx, ny, nz);
            nor[k * 3] = nx / nl; nor[k * 3 + 1] = ny / nl; nor[k * 3 + 2] = nz / nl;
            const slope = Math.hypot(hr - hl, hd - hu) / (2 * RES);
            colorAt(x, z, h, slope, c);
            col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
            k++;
          }
        }
        const idx = [];
        for (let j = 0; j < n - 1; j++) {
          for (let i = 0; i < n - 1; i++) {
            const a = j * n + i, b = a + 1, d = a + n, e = d + 1;
            idx.push(a, d, b, b, d, e); // same diagonal as heightAt()
          }
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        g.setIndex(idx);
        g.computeBoundingSphere();
        const m = new THREE.Mesh(g, mat);
        m.receiveShadow = !SF.lowGfx;
        scene.add(m);
        meshes.push(m);
      }
    }

    // ---- the sea (and rivers) ----
    const wn = U.canvas(128, 128, (g, w, h) => {
      const img = g.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const a = N.n2(i / 12, j / 12) * 0.5 + N.n2(i / 5 + 30, j / 5) * 0.25;
        const b = N.n2(i / 12 + 70, j / 12) * 0.5 + N.n2(i / 5, j / 5 + 30) * 0.25;
        const o = (j * w + i) * 4;
        img.data[o] = 128 + a * 110; img.data[o + 1] = 128 + b * 110; img.data[o + 2] = 255; img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    const wtex = new THREE.CanvasTexture(wn);
    wtex.wrapS = wtex.wrapT = THREE.RepeatWrapping;
    wtex.repeat.set(90, 90);
    waterMat = new THREE.MeshPhongMaterial({
      color: 0x2ab8c8, specular: 0xbff8ff, shininess: 60, transparent: true, opacity: 0.78,
      normalMap: wtex, normalScale: new THREE.Vector2(0.35, 0.35), depthWrite: false,
    });
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = WATER_Y;
    water.renderOrder = 2;
    scene.add(water);

    // ---- the lava ----
    const lc = U.canvas(128, 128, (g, w, h) => {
      const img = g.createImageData(w, h);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const v = N.fbm(i / 18, j / 18, 3) * 0.5 + 0.5;
        const cr = Math.abs(N.n2(i / 9 + 50, j / 9)) < 0.08 ? 1 : 0;
        const o = (j * w + i) * 4;
        img.data[o] = 200 + v * 55; img.data[o + 1] = 40 + v * 120 + cr * 80; img.data[o + 2] = 10 + cr * 40; img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
    lavaTex = new THREE.CanvasTexture(lc);
    lavaTex.colorSpace = THREE.SRGBColorSpace;
    lavaTex.wrapS = lavaTex.wrapT = THREE.RepeatWrapping;
    lavaTex.repeat.set(8, 8);
    lavaMat = new THREE.MeshBasicMaterial({ map: lavaTex, fog: true });
    lava = new THREE.Mesh(new THREE.CircleGeometry(60, 48), lavaMat);
    lava.rotation.x = -Math.PI / 2;
    lava.position.set(lavaC.x, LAVA_Y, lavaC.z);
    scene.add(lava);
    const glow = new THREE.PointLight(0xff5020, 2.5, 110, 1.2);
    glow.position.set(lavaC.x, LAVA_Y + 12, lavaC.z);
    scene.add(glow);
  }

  function update(dt, time) {
    if (waterMat) { waterMat.normalMap.offset.x = time * 0.004; waterMat.normalMap.offset.y = time * 0.006; }
    if (lavaTex) { lavaTex.offset.x = Math.sin(time * 0.05) * 0.2; lavaTex.offset.y = time * 0.01; }
  }

  // ---------- a painted picture of the island, for the map ----------
  let mapCanvas = null;
  function getMapCanvas() {
    if (mapCanvas) return mapCanvas;
    const S = 320;
    const c = new THREE.Color();
    mapCanvas = U.canvas(S, S, (g) => {
      const img = g.createImageData(S, S);
      for (let j = 0; j < S; j++) {
        for (let i = 0; i < S; i++) {
          const x = -HALF + (i + 0.5) * 2, z = -HALF + (j + 0.5) * 2;
          const h = heightAt(x, z);
          const o = (j * S + i) * 4;
          if (h < WATER_Y) {
            const d = U.clamp(-h / 14, 0, 1);
            img.data[o] = 40 - d * 20; img.data[o + 1] = 150 - d * 70; img.data[o + 2] = 170 - d * 40;
          } else {
            colorAt(x, z, h, slopeAt(x, z), c);
            const shade = U.clamp(1 + (heightAt(x - 2, z - 2) - h) * 0.12, 0.6, 1.3);
            img.data[o] = U.clamp(c.r * 255 * shade, 0, 255); img.data[o + 1] = U.clamp(c.g * 255 * shade, 0, 255); img.data[o + 2] = U.clamp(c.b * 255 * shade, 0, 255);
            if (inLava(x, z) && h < LAVA_Y) { img.data[o] = 255; img.data[o + 1] = 110; img.data[o + 2] = 30; }
          }
          img.data[o + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    });
    return mapCanvas;
  }

  return {
    HALF, WATER_Y, LAVA_Y, REG,
    generate, build, update, heightAt, slopeAt, gradAt, biomeAt, regionAt, regionName, inLava,
    getMapCanvas, get lavaCenter() { return lavaC; },
  };
})();
