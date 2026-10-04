// ============================================================
//  DRAGON LIFE — THE WORLD
//  6 islands in a big sea, the sky, day and night, trees,
//  rocks, berry bushes, and the special places of the story.
//  Want to move an island? Change the ISLANDS list below!
// ============================================================
window.DL = window.DL || {};

DL.World = (function () {
  const U = DL.U, N = DL.N, M = () => DL.Models;
  const PI = Math.PI;

  // kind: 'hills', 'flat', 'peaks' (tall mountains) or 'volcano'
  const ISLANDS = [
    { id: 'home', name: 'Home Island', x: 0, z: 0, r: 190, h: 26, kind: 'hills', seed: 1, grass: [0x5fae46, 0x7ac050] },
    { id: 'village', name: 'Village Island', x: 470, z: -170, r: 140, h: 12, kind: 'flat', seed: 2, grass: [0x6ab84a, 0x88c858] },
    { id: 'crystal', name: 'Crystal Peaks', x: -430, z: -460, r: 170, h: 150, kind: 'peaks', seed: 3, grass: [0x5a9a5a, 0x6aaa66] },
    { id: 'ruins', name: 'Old Ruins', x: -500, z: 260, r: 130, h: 20, kind: 'hills', seed: 4, grass: [0x8aa848, 0xa0b858] },
    { id: 'misty', name: 'Misty Forest', x: 170, z: 540, r: 180, h: 34, kind: 'hills', seed: 5, grass: [0x3f8a5a, 0x4a9a68] },
    { id: 'volcano', name: 'Volcano Isle', x: 620, z: 430, r: 160, h: 130, kind: 'volcano', seed: 6, grass: [0x4a4440, 0x5a4a40] },
  ];
  const byId = {}; for (const I of ISLANDS) byId[I.id] = I;
  const SEA_FLOOR = -14;

  // ---------------- the shape of the land ----------------
  let lastIsland = null;
  function islandH(I, x, z) {
    const dx = x - I.x, dz = z - I.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > I.r * 1.75) return SEA_FLOOR;
    const a = Math.atan2(dz, dx);
    const wob = 1 + 0.15 * Math.sin(a * 3 + I.seed * 1.7) + 0.08 * Math.sin(a * 5 + I.seed * 3.1) + 0.24 * (N.fbm(x * 0.008, z * 0.008, 3, I.seed) - 0.5);
    const t = d / (I.r * wob);
    if (t >= 1) return Math.max(SEA_FLOOR, 1 - (t - 1) * 42);
    const u = 1 - t;
    const beach = U.smooth(U.clamp(u / 0.1, 0, 1));
    let h = 1 + beach * 1.8;
    const inland = U.smooth(U.clamp((u - 0.07) / 0.93, 0, 1));
    const n = N.fbm(x * 0.018, z * 0.018, 4, I.seed + 10);
    if (I.kind === 'hills') {
      h += I.h * Math.pow(inland, 1.2) * (0.35 + 0.9 * n) + (N.fbm(x * 0.06, z * 0.06, 2, I.seed + 3) - 0.5) * 3 * inland;
    } else if (I.kind === 'flat') {
      h += I.h * Math.pow(inland, 1.6) * (0.4 + 0.6 * n);
    } else if (I.kind === 'peaks') {
      const r = 1 - Math.abs(2 * N.fbm(x * 0.011, z * 0.011, 4, I.seed + 5) - 1);
      h += I.h * Math.pow(inland, 1.5) * (0.25 + 0.75 * r * r) + 6 * inland;
    } else if (I.kind === 'volcano') {
      let c = I.h * Math.pow(inland, 1.4);
      if (u > 0.84) c -= (u - 0.84) / 0.16 * I.h * 0.32;
      h += c + (n - 0.5) * 8 * inland;
    }
    return h;
  }
  function rawHeight(x, z) {
    let best = SEA_FLOOR; lastIsland = null;
    for (const I of ISLANDS) {
      const h = islandH(I, x, z);
      if (h > best) { best = h; lastIsland = I; }
    }
    return best;
  }

  // ---------------- terrain grid ----------------
  const GX0 = -720, GZ0 = -760, GW = 1620, GD = 1600;
  let CELL = 4, NX, NZ, H;
  function gridH(i, j) { return H[j * (NX + 1) + i]; }
  // the height of the ground exactly like the 3D mesh shows it
  function terrainH(x, z) {
    const fx = (x - GX0) / CELL, fz = (z - GZ0) / CELL;
    if (fx < 0 || fz < 0 || fx >= NX || fz >= NZ) return SEA_FLOOR;
    const i = Math.floor(fx), j = Math.floor(fz);
    const u = fx - i, v = fz - j;
    const h00 = gridH(i, j), h10 = gridH(i + 1, j), h01 = gridH(i, j + 1), h11 = gridH(i + 1, j + 1);
    if (u + v < 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
    return h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
  }
  function slopeAt(x, z) {
    const e = 2;
    const dx = terrainH(x + e, z) - terrainH(x - e, z), dz = terrainH(x, z + e) - terrainH(x, z - e);
    return Math.sqrt(dx * dx + dz * dz) / (2 * e);
  }

  // ---------------- platforms (floors you can stand on) ----------------
  // { minx, maxx, minz, maxz, top }
  const PCELL = 16;
  const platGrid = new Map();
  const pkey = (i, j) => i * 100000 + j;
  function addPlatform(p) {
    for (let i = Math.floor(p.minx / PCELL); i <= Math.floor(p.maxx / PCELL); i++)
      for (let j = Math.floor(p.minz / PCELL); j <= Math.floor(p.maxz / PCELL); j++) {
        const k = pkey(i, j);
        if (!platGrid.has(k)) platGrid.set(k, []);
        platGrid.get(k).push(p);
      }
    return p;
  }
  function removePlatform(p) { for (const arr of platGrid.values()) { const i = arr.indexOf(p); if (i >= 0) arr.splice(i, 1); } }
  // the ground under you: the land, or a floor (only floors below your feet + a little step)
  function groundAt(x, z, y = Infinity) {
    let g = terrainH(x, z);
    const arr = platGrid.get(pkey(Math.floor(x / PCELL), Math.floor(z / PCELL)));
    if (arr) for (const p of arr) {
      if (x >= p.minx && x <= p.maxx && z >= p.minz && z <= p.maxz && p.top > g && p.top <= y + 0.7) g = p.top;
    }
    return g;
  }

  // ---------------- colliders (things you can't walk through) ----------------
  // circles { x, z, r, y0, y1 } and boxes { minx, maxx, minz, maxz, y0, y1 }
  const CCELL = 12;
  const colGrid = new Map();
  function addCollider(c) {
    const b = c.r !== undefined ? [c.x - c.r, c.x + c.r, c.z - c.r, c.z + c.r] : [c.minx, c.maxx, c.minz, c.maxz];
    if (c.y0 === undefined) c.y0 = -100;
    if (c.y1 === undefined) c.y1 = 1000;
    c.cells = [];
    for (let i = Math.floor(b[0] / CCELL); i <= Math.floor(b[1] / CCELL); i++)
      for (let j = Math.floor(b[2] / CCELL); j <= Math.floor(b[3] / CCELL); j++) {
        const k = pkey(i, j);
        if (!colGrid.has(k)) colGrid.set(k, []);
        colGrid.get(k).push(c);
        c.cells.push(k);
      }
    return c;
  }
  function removeCollider(c) {
    if (!c || !c.cells) return;
    for (const k of c.cells) { const arr = colGrid.get(k); if (!arr) continue; const i = arr.indexOf(c); if (i >= 0) arr.splice(i, 1); }
    c.cells = [];
  }
  // push a circle (the player) out of everything it touches
  function collide(pos, radius, height) {
    const seen = new Set();
    for (let i = Math.floor((pos.x - radius) / CCELL); i <= Math.floor((pos.x + radius) / CCELL); i++)
      for (let j = Math.floor((pos.z - radius) / CCELL); j <= Math.floor((pos.z + radius) / CCELL); j++) {
        const arr = colGrid.get(pkey(i, j));
        if (!arr) continue;
        for (const c of arr) {
          if (seen.has(c) || c.off) continue;
          seen.add(c);
          if (pos.y + height < c.y0 || pos.y > c.y1 - 0.05) continue;
          if (c.r !== undefined) {
            const dx = pos.x - c.x, dz = pos.z - c.z;
            const d = Math.sqrt(dx * dx + dz * dz), min = c.r + radius;
            if (d < min && d > 0.0001) { pos.x = c.x + dx / d * min; pos.z = c.z + dz / d * min; }
          } else {
            const cx = U.clamp(pos.x, c.minx, c.maxx), cz = U.clamp(pos.z, c.minz, c.maxz);
            const dx = pos.x - cx, dz = pos.z - cz;
            const d2 = dx * dx + dz * dz;
            if (d2 < radius * radius) {
              if (d2 > 0.000001) { const d = Math.sqrt(d2); pos.x = cx + dx / d * radius; pos.z = cz + dz / d * radius; }
              else {
                // inside the box: go out the closest side
                const l = pos.x - c.minx, r = c.maxx - pos.x, b = pos.z - c.minz, f = c.maxz - pos.z;
                const m = Math.min(l, r, b, f);
                if (m === l) pos.x = c.minx - radius; else if (m === r) pos.x = c.maxx + radius; else if (m === b) pos.z = c.minz - radius; else pos.z = c.maxz + radius;
              }
            }
          }
        }
      }
  }

  // ---------------- things you can use with E ----------------
  // { x, y, z, r, label: () => text, use: () => {}, ok: () => true/false }
  const things = [];
  function addThing(t) { things.push(t); return t; }
  function removeThing(t) { const i = things.indexOf(t); if (i >= 0) things.splice(i, 1); }

  // ---------------- light pool ----------------
  // only a few real lights (they are slow), moved to the closest lamps and fires
  const lightSources = [];
  let lightPool = [];
  function addLight(src) { lightSources.push(src); return src; }
  function removeLight(src) { const i = lightSources.indexOf(src); if (i >= 0) lightSources.splice(i, 1); }

  // ---------------- resource nodes (trees, rocks, bushes...) ----------------
  const nodes = [];
  const NCELL = 10;
  const nodeGrid = new Map();
  function nodesNear(x, z, r) {
    const out = [];
    for (let i = Math.floor((x - r) / NCELL); i <= Math.floor((x + r) / NCELL); i++)
      for (let j = Math.floor((z - r) / NCELL); j <= Math.floor((z + r) / NCELL); j++) {
        const arr = nodeGrid.get(pkey(i, j));
        if (arr) for (const n of arr) if (U.dist2(n.x, n.z, x, z) < r * r) out.push(n);
      }
    return out;
  }

  let scene, sky, sun, hemi, water, waterMat, terrain, stars;
  const W = {
    ISLANDS, byId, terrainH, groundAt, slopeAt, addPlatform, removePlatform, addCollider, removeCollider, collide,
    things, addThing, removeThing, nodes, nodesNear, addLight, removeLight, rawHeight,
    tod: 0.3, day: 1, places: {}, inst: {},
  };

  // ------------------------------------------------------------
  //  BUILD EVERYTHING
  // ------------------------------------------------------------
  function init(sc) {
    scene = sc;
    CELL = DL.settings.gfx === 'low' ? 5 : 4;
    buildTerrain();
    buildWater();
    buildSky();
    buildLights();
    buildPlaces();
    buildNature();
    buildCritters();
    for (let i = 0; i < (DL.settings.gfx === 'low' ? 3 : 5); i++) {
      const l = new THREE.PointLight(0xffa050, 0, 22, 1.6);
      l.castShadow = false;
      scene.add(l); lightPool.push(l);
    }
  }

  function buildTerrain() {
    NX = Math.round(GW / CELL); NZ = Math.round(GD / CELL);
    H = new Float32Array((NX + 1) * (NZ + 1));
    const isl = new Array((NX + 1) * (NZ + 1));
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const k = j * (NX + 1) + i;
      H[k] = rawHeight(GX0 + i * CELL, GZ0 + j * CELL);
      isl[k] = lastIsland;
    }
    // colors
    const pos = new Float32Array((NX + 1) * (NZ + 1) * 3), col = new Float32Array((NX + 1) * (NZ + 1) * 3), uv = new Float32Array((NX + 1) * (NZ + 1) * 2);
    const c = new THREE.Color(), c2 = new THREE.Color();
    const sand = new THREE.Color(0xe8d49a), wetSand = new THREE.Color(0xb8a878), rock = new THREE.Color(0x8a857a), snow = new THREE.Color(0xf4f8ff), deep = new THREE.Color(0x3a7a80), ash = new THREE.Color(0x6a5e58), lavaRock = new THREE.Color(0x6a3020), dirt = new THREE.Color(0x8a6a44);
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) {
      const k = j * (NX + 1) + i;
      const x = GX0 + i * CELL, z = GZ0 + j * CELL, h = H[k];
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      uv[k * 2] = x / 8; uv[k * 2 + 1] = z / 8;
      const hx = gridH(Math.min(NX, i + 1), j) - gridH(Math.max(0, i - 1), j), hz = gridH(i, Math.min(NZ, j + 1)) - gridH(i, Math.max(0, j - 1));
      const slope = Math.sqrt(hx * hx + hz * hz) / (2 * CELL);
      const I = isl[k];
      const n = N.fbm(x * 0.03, z * 0.03, 3, 77);
      if (h < 0) c.copy(wetSand).lerp(deep, U.clamp(-h / 10, 0, 1));
      else if (h < 2.4 && I && I.kind !== 'volcano') c.copy(sand).lerp(wetSand, U.clamp(1 - h, 0, 1) * 0.6);
      else if (I) {
        c.set(I.grass[0]); c2.set(I.grass[1]); c.lerp(c2, n);
        if (I.kind === 'volcano') {
          const top = U.clamp((h - 50) / 50, 0, 1);
          c.lerp(ash, 0.4 + top * 0.6);
          if (h > 95) c.lerp(lavaRock, U.clamp((h - 95) / 10, 0, 0.6));
          if (h < 2.4) c.copy(ash).lerp(sand, 0.25);
        }
        if (h < 3.6 && I.kind !== 'volcano') c.lerp(sand, (3.6 - h) / 1.2 * 0.7);
        if (slope > 0.55) c.lerp(I.kind === 'volcano' ? ash : rock, U.clamp((slope - 0.55) * 3, 0, 1));
        if (I.kind === 'peaks' && h > 70) c.lerp(snow, U.clamp((h - 70) / 18 - slope * 0.6, 0, 1));
        if (I.kind === 'peaks' && h > 30 && h < 72) c.lerp(rock, U.clamp((h - 30) / 40, 0, 0.6));
        if (I.kind === 'hills' && n < 0.32 && slope < 0.3 && h > 4) c.lerp(dirt, (0.32 - n) * 2.5);
      } else c.copy(deep);
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    const idx = [];
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
      const a = j * (NX + 1) + i, b = a + 1, cc = a + (NX + 1), d = cc + 1;
      // skip squares that are deep under water everywhere
      if (H[a] < -10 && H[b] < -10 && H[cc] < -10 && H[d] < -10) continue;
      idx.push(a, cc, b, b, cc, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true, map: DL.Tex.T.ground });
    terrain = new THREE.Mesh(g, m);
    terrain.receiveShadow = true;
    scene.add(terrain);
    // a big flat sea floor far away
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), new THREE.MeshBasicMaterial({ color: 0x1a4a5a }));
    floor.rotation.x = -PI / 2; floor.position.y = SEA_FLOOR - 1; scene.add(floor);
  }

  function buildWater() {
    // a picture of how deep the water is, so the sea is light blue near the beaches
    const S = 512;
    const data = new Uint8Array(S * S * 4);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = GX0 + (i + 0.5) / S * GW, z = GZ0 + (j + 0.5) / S * GD;
      const h = terrainH(x, z);
      const d = U.clamp(-h / 14, 0, 1);
      const k = (j * S + i) * 4;
      data[k] = d * 255; data[k + 1] = d * 255; data[k + 2] = d * 255; data[k + 3] = 255;
    }
    const depthTex = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
    depthTex.magFilter = THREE.LinearFilter; depthTex.minFilter = THREE.LinearFilter;
    depthTex.needsUpdate = true;
    waterMat = new THREE.ShaderMaterial({
      transparent: true, fog: true, depthWrite: false,
      uniforms: Object.assign({
        time: { value: 0 }, depthTex: { value: depthTex }, area: { value: new THREE.Vector4(GX0, GZ0, GW, GD) },
        deepCol: { value: new THREE.Color(0x0e5a8a) }, shallowCol: { value: new THREE.Color(0x3ad8d0) }, skyCol: { value: new THREE.Color(0xa8d8f0) },
        sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xffffff) }, dark: { value: 0 },
      }, THREE.UniformsLib.fog),
      vertexShader: `
        uniform float time;
        varying vec3 vW;
        #include <fog_pars_vertex>
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          wp.y += sin(wp.x * 0.08 + time * 1.2) * 0.15 + sin(wp.z * 0.11 + time * 0.9) * 0.12;
          vW = wp.xyz;
          vec4 mvPosition = viewMatrix * wp;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: `
        uniform float time, dark;
        uniform sampler2D depthTex;
        uniform vec4 area;
        uniform vec3 deepCol, shallowCol, skyCol, sunDir, sunCol;
        varying vec3 vW;
        #include <common>
        #include <fog_pars_fragment>
        void main() {
          vec2 p = vW.xz;
          float t = time;
          vec2 tuv = (p - area.xy) / area.zw;
          float depth = (tuv.x < 0.0 || tuv.y < 0.0 || tuv.x > 1.0 || tuv.y > 1.0) ? 1.0 : texture2D(depthTex, tuv).r;
          float dx = cos(p.x * 0.08 + t * 1.2) * 0.012 + cos(p.x * 0.9 + p.y * 0.4 + t * 3.0) * 0.05 + cos(p.x * 1.7 - p.y * 1.1 + t * 4.0) * 0.035;
          float dz = cos(p.y * 0.11 + t * 0.9) * 0.013 + cos(p.y * 1.3 - p.x * 0.5 + t * 3.4) * 0.05 + cos(p.y * 2.1 + p.x * 0.7 + t * 4.5) * 0.035;
          vec3 n = normalize(vec3(-dx, 1.0, -dz));
          vec3 v = normalize(cameraPosition - vW);
          float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
          float shallow = 1.0 - smoothstep(0.0, 0.45, depth);
          vec3 col = mix(deepCol, shallowCol, shallow);
          col = mix(col, skyCol, fres * 0.55);
          vec3 h = normalize(sunDir + v);
          col += sunCol * pow(max(dot(n, h), 0.0), 180.0) * 2.0;
          // white foam at the beach
          float foam = smoothstep(0.06, 0.0, depth) * (0.55 + 0.45 * sin(depth * 220.0 - t * 2.5 + p.x * 0.05));
          col = mix(col, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.75);
          col *= 1.0 - dark * 0.55;
          float alpha = mix(0.55, 0.93, smoothstep(0.0, 0.25, depth));
          gl_FragColor = vec4(col, alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    const g = new THREE.PlaneGeometry(6000, 6000, 200, 200);
    g.rotateX(-PI / 2);
    water = new THREE.Mesh(g, waterMat);
    water.renderOrder = 2;
    scene.add(water);
  }

  // ---------------- sky ----------------
  let skyMat;
  function buildSky() {
    skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x4a90e0) }, bottom: { value: new THREE.Color(0xbfe0f5) },
        sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xfff0c0) },
        night: { value: 0 }, time: { value: 0 },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
      fragmentShader: `
        uniform vec3 top, bottom, sunDir, sunCol; uniform float night, time;
        varying vec3 vDir;
        float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, -0.2, 1.0);
          vec3 col = mix(bottom, top, pow(max(h, 0.0), 0.55));
          float s = max(dot(d, sunDir), 0.0);
          col += sunCol * (pow(s, 600.0) * 4.0 + pow(s, 12.0) * 0.35) * (1.0 - night);
          // the moon is on the other side of the sky
          float m = max(dot(d, -sunDir), 0.0);
          col += vec3(0.9, 0.95, 1.0) * (smoothstep(0.9993, 0.9996, m) * 1.2 + pow(m, 40.0) * 0.1) * night;
          // stars
          if (night > 0.01 && d.y > 0.0) {
            vec3 q = floor(d * 300.0);
            float st = hash(q);
            float tw = 0.6 + 0.4 * sin(time * 2.0 + st * 50.0);
            col += vec3(1.0) * step(0.997, st) * night * tw * smoothstep(0.0, 0.25, d.y);
          }
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), skyMat);
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    scene.add(sky);
    scene.fog = new THREE.Fog(0xbfe0f5, 200, DL.settings.gfx === 'low' ? 800 : 1150);
    // clouds
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.92 });
    W.clouds = new THREE.Group();
    const r = U.rng(99);
    for (let i = 0; i < 26; i++) {
      const parts = [];
      const n = 3 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) parts.push({ geo: new THREE.IcosahedronGeometry(8 + r() * 10, 1), color: 0xffffff, pos: [k * 12 - n * 6 + r() * 6, r() * 5, r() * 10 - 5], scale: [1, 0.55, 1] });
      const c = new THREE.Mesh(DL.Geo.merge(parts), cloudMat);
      c.position.set(-700 + r() * 1700, 150 + r() * 70, -800 + r() * 1700);
      c.userData.speed = 2 + r() * 3;
      W.clouds.add(c);
    }
    scene.add(W.clouds);
  }

  function buildLights() {
    hemi = new THREE.HemisphereLight(0xcfe6ff, 0x6a5a3a, 1.2);
    scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 2.6);
    sun.castShadow = DL.settings.gfx !== 'low';
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 400;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.04;
    scene.add(sun); scene.add(sun.target);
    W.sun = sun;
  }

  // ------------------------------------------------------------
  //  SPECIAL PLACES
  // ------------------------------------------------------------
  const exclusions = []; // no trees here
  function exclude(x, z, r) { exclusions.push({ x, z, r }); }
  function place(obj, x, z, rotY = 0, yOff = 0) {
    obj.position.set(x, terrainH(x, z) + yOff, z);
    obj.rotation.y = rotY;
    scene.add(obj);
    return obj;
  }
  // walk from the middle of an island toward an angle until we reach the beach
  function coast(I, angle, height = 0.6) {
    let d = 0;
    while (d < I.r * 1.6) {
      const x = I.x + Math.cos(angle) * d, z = I.z + Math.sin(angle) * d;
      if (terrainH(x, z) < height && d > 20) return { x, z, d };
      d += 1;
    }
    return { x: I.x + Math.cos(angle) * I.r, z: I.z + Math.sin(angle) * I.r, d: I.r };
  }
  // a box you can't walk through, turned by an angle (made from little circles along the walls)
  function solidBox(x, z, w, d, rot, y0, y1) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const out = [];
    const step = 0.8;
    const edge = (ax, az, bx, bz) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / step));
      for (let i = 0; i <= n; i++) {
        const lx = ax + (bx - ax) * i / n, lz = az + (bz - az) * i / n;
        out.push(addCollider({ x: x + lx * c + lz * s, z: z - lx * s + lz * c, r: 0.5, y0, y1 }));
      }
    };
    const hw = w / 2 - 0.4, hd = d / 2 - 0.4;
    edge(-hw, -hd, hw, -hd); edge(hw, -hd, hw, hd); edge(hw, hd, -hw, hd); edge(-hw, hd, -hw, -hd);
    return out;
  }

  function buildPlaces() {
    const P = W.places;
    const home = byId.home;
    // ---- Home Island: the dock where you arrive, Grandma Wren's cottage ----
    const ang = PI / 2 + 0.25;
    const c = coast(home, ang);
    const dir = { x: Math.cos(ang), z: Math.sin(ang) };
    const dockStart = { x: c.x - dir.x * 8, z: c.z - dir.z * 8 };
    const dock = M().dock(26);
    dock.position.set(dockStart.x, 1.2, dockStart.z);
    dock.rotation.y = Math.atan2(dir.x, dir.z);
    scene.add(dock);
    const dockEnd = { x: dockStart.x + dir.x * 25, z: dockStart.z + dir.z * 25 };
    addPlatform({ minx: Math.min(dockStart.x, dockEnd.x) - 1.2, maxx: Math.max(dockStart.x, dockEnd.x) + 1.2, minz: Math.min(dockStart.z, dockEnd.z) - 1.2, maxz: Math.max(dockStart.z, dockEnd.z) + 1.2, top: 1.3, dock: true });
    const boat = M().boat();
    boat.position.set(dockEnd.x - dir.x * 6 + dir.z * 3.6, 0.05, dockEnd.z - dir.z * 6 - dir.x * 3.6);
    boat.rotation.y = Math.atan2(dir.x, dir.z);
    scene.add(boat); W.boat = boat;
    P.spawn = { x: dockEnd.x - dir.x * 2, z: dockEnd.z - dir.z * 2, yaw: Math.atan2(-dir.x, -dir.z) };
    P.dockDir = dir;
    exclude(dockStart.x, dockStart.z, 14);
    // the cottage, up from the beach
    const cx = c.x - dir.x * 34, cz = c.z - dir.z * 34;
    const cot = M().cottage({ w: 7.5, d: 6.5, wall: 0xf3e9d2 });
    const cy = terrainH(cx, cz);
    flatten(cx, cz, 9);
    place(cot, cx, cz, Math.atan2(dir.x, dir.z), 0.2);
    cot.position.y = cy + 0.2;
    solidBox(cx, cz, 7.5, 6.5, Math.atan2(dir.x, dir.z), cy - 2, cy + 6);
    exclude(cx, cz, 16);
    P.cottage = { x: cx, z: cz, y: cy, obj: cot };
    cot.updateMatrixWorld(true);
    W.windows = [cot.userData.glass];
    W.chimneys = [cot.localToWorld(cot.userData.chimney.clone())];
    // Wren stands in front of her house
    P.wren = { x: cx + dir.x * 6.5 + dir.z * 2, z: cz + dir.z * 6.5 - dir.x * 2 };
    // her campfire
    P.wrenFire = { x: cx + dir.x * 7 - dir.z * 4, z: cz + dir.z * 7 + dir.x * 4 };
    // a little path of stones from the house to the dock
    const pathMat = M().mat(0xb8b0a0);
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const px = U.lerp(cx + dir.x * 4.5, dockStart.x, t) + Math.sin(i) * 0.6, pz = U.lerp(cz + dir.z * 4.5, dockStart.z, t) + Math.cos(i * 1.3) * 0.6;
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.75, 0.2, 7), pathMat);
      s.position.set(px, terrainH(px, pz) + 0.05, pz); s.receiveShadow = true; scene.add(s);
    }

    // ---- the egg cave, north of Home Island ----
    const cave = { x: 30, z: -112 };
    makeCave(cave);
    P.cave = cave;

    // ---- Village Island ----
    const V = byId.village;
    P.village = { x: V.x, z: V.z };
    flatten(V.x, V.z, 34);
    const vy = terrainH(V.x, V.z);
    const well = new THREE.Group();
    well.add(M().mesh(new THREE.CylinderGeometry(1.4, 1.5, 1.1, 12), M().materials().stoneMat, 0, 0.55, 0));
    well.add(M().mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.2, 12), M().mat(0x2a6aa0), 0, 0.9, 0));
    for (const s of [-1, 1]) well.add(M().mesh(M().box(0.18, 2.2, 0.18), M().mat(0x6a4224), s * 1.2, 1.6, 0));
    well.add(M().mesh(new THREE.ConeGeometry(1.9, 1.0, 4), M().mat(0xb84a3a), 0, 3.1, 0).rotateY(PI / 4));
    place(well, V.x, V.z);
    addCollider({ x: V.x, z: V.z, r: 1.6 });
    const houseCols = [0xf3e9d2, 0xf0d8c0, 0xe8f0d8, 0xf8e0e0, 0xe0e8f8, 0xf6ecd0];
    const roofs = ['thatch', 0xb84a3a, 'thatch', 0x4a6ab0, 'thatch', 0x8a5aa0];
    P.villageHouses = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * PI * 2 + 0.3;
      const hx = V.x + Math.cos(a) * 24, hz = V.z + Math.sin(a) * 24;
      const rot = Math.atan2(-Math.cos(a), -Math.sin(a));
      const h = M().cottage({ w: 6 + (i % 2), d: 5.5, wall: houseCols[i], roof: roofs[i], door: U.pick([0x7a4a2a, 0x4a6a9a, 0x9a3a3a]) });
      const hy = terrainH(hx, hz);
      place(h, hx, hz, rot, 0.2);
      solidBox(hx, hz, 6 + (i % 2), 5.5, rot, hy - 2, hy + 6);
      h.updateMatrixWorld(true);
      W.windows.push(h.userData.glass);
      W.chimneys.push(h.localToWorld(h.userData.chimney.clone()));
      P.villageHouses.push({ x: hx, z: hz, a });
    }
    exclude(V.x, V.z, 40);
    // market stall
    const stall = new THREE.Group();
    stall.add(M().mesh(M().box(3.6, 1.0, 1.4), M().materials().woodMat, 0, 0.5, 0));
    for (const sx of [-1.7, 1.7]) for (const sz of [-0.6, 0.6]) stall.add(M().mesh(M().box(0.14, 2.8, 0.14), M().mat(0x6a4224), sx, 1.4, sz));
    const awning = M().mesh(M().box(4.2, 0.1, 2.2), M().mat(0xe84a5a), 0, 2.85, 0.2); awning.rotation.x = 0.15; stall.add(awning);
    for (let k = 0; k < 6; k++) stall.add(M().mesh(M().ball(0.18, 6, 4), M().mat(U.pick([0xff5a3a, 0xffd03a, 0x5a3ad8, 0x6ad04a])), -1.3 + k * 0.5, 1.1, 0.1));
    const stx = V.x + 9, stz = V.z - 6;
    place(stall, stx, stz, -PI / 2.6);
    addCollider({ x: stx, z: stz, r: 1.8 });
    P.mila = { x: stx - 2.2, z: stz - 1.2 };
    P.finn = coast(V, PI + 0.5, 1.5);
    P.bo = { x: V.x - 10, z: V.z + 12 };
    P.pip = { x: V.x - 5, z: V.z - 5 };
    // village dock
    const vc = coast(V, PI + 0.5);
    const vdir = { x: Math.cos(PI + 0.5), z: Math.sin(PI + 0.5) };
    const vd = M().dock(14);
    vd.position.set(vc.x - vdir.x * 4, 1.2, vc.z - vdir.z * 4); vd.rotation.y = Math.atan2(vdir.x, vdir.z); scene.add(vd);
    const vde = { x: vc.x + vdir.x * 10, z: vc.z + vdir.z * 10 };
    addPlatform({ minx: Math.min(vc.x - vdir.x * 4, vde.x) - 1.2, maxx: Math.max(vc.x - vdir.x * 4, vde.x) + 1.2, minz: Math.min(vc.z - vdir.z * 4, vde.z) - 1.2, maxz: Math.max(vc.z - vdir.z * 4, vde.z) + 1.2, top: 1.3, dock: true });
    P.finn = { x: vc.x + vdir.x * 6, z: vc.z + vdir.z * 6, dock: true };
    exclude(vc.x, vc.z, 12);

    // ---- Old Ruins: the dragon temple ----
    const R = byId.ruins;
    flatten(R.x, R.z, 22);
    const ry = terrainH(R.x, R.z);
    const plat = M().mesh(new THREE.BoxGeometry(30, 3, 30), M().materials().stoneMat, R.x, ry - 1.0, R.z);
    plat.receiveShadow = true; scene.add(plat);
    addPlatform({ minx: R.x - 15, maxx: R.x + 15, minz: R.z - 15, maxz: R.z + 15, top: ry + 0.5 });
    // steps
    for (let s = 0; s < 3; s++) { const st = M().mesh(new THREE.BoxGeometry(8, 0.5, 1.2), M().materials().stoneMat, R.x, ry + 0.25 - s * 0.5 - 0.5, R.z + 15.6 + s * 1.2); scene.add(st); }
    const top = ry + 0.5;
    P.ruins = { x: R.x, z: R.z, y: top };
    const rr = U.rng(8);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * PI * 2;
      const broken = rr() < 0.4;
      const col = M().column(broken ? 2 + rr() * 3 : 6.5, broken);
      col.position.set(R.x + Math.cos(a) * 12.5, top, R.z + Math.sin(a) * 12.5);
      col.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(col);
      addCollider({ x: col.position.x, z: col.position.z, r: 0.75 });
    }
    // fallen column pieces lying around
    for (let i = 0; i < 6; i++) {
      const a = rr() * PI * 2, d = 18 + rr() * 14;
      const px = R.x + Math.cos(a) * d, pz = R.z + Math.sin(a) * d;
      const piece = M().mesh(new THREE.CylinderGeometry(0.5, 0.5, 2 + rr() * 2, 10), M().materials().stoneMat, px, terrainH(px, pz) + 0.45, pz);
      piece.rotation.set(PI / 2, 0, rr() * 3); scene.add(piece);
    }
    P.braziers = [];
    for (let i = 0; i < 4; i++) {
      const a = PI / 4 + i * PI / 2;
      const b = M().brazier();
      b.position.set(R.x + Math.cos(a) * 9, top, R.z + Math.sin(a) * 9);
      b.traverse(o => { if (o.isMesh) o.castShadow = true; });
      scene.add(b);
      addCollider({ x: b.position.x, z: b.position.z, r: 0.9 });
      P.braziers.push({ obj: b, x: b.position.x, y: top + 2.4, z: b.position.z, lit: false });
    }
    P.stones = [];
    for (let i = 0; i < 4; i++) {
      const a = -PI / 2 + (i - 1.5) * 0.5 + PI;
      const s = M().storyStone(i);
      const sx = R.x + Math.cos(a) * 24, sz = R.z + Math.sin(a) * 24;
      place(s, sx, sz, Math.atan2(R.x - sx, R.z - sz));
      addCollider({ x: sx, z: sz, r: 0.9 });
      P.stones.push({ x: sx, z: sz, obj: s });
    }
    // the altar and a stone dragon statue
    const altar = new THREE.Group();
    altar.add(M().mesh(new THREE.BoxGeometry(3, 1.2, 2), M().materials().stoneMat, 0, 0.6, 0));
    altar.add(M().mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.3, 8), M().mat(0x5a5048), 0, 1.35, 0));
    altar.position.set(R.x, top, R.z); scene.add(altar);
    addCollider({ x: R.x, z: R.z, r: 1.6 });
    P.altar = { x: R.x, y: top + 1.5, z: R.z, obj: altar };
    const statue = M().dragon('emerald');
    const stoneSkin = new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 1, flatShading: true });
    statue.root.traverse(o => { if (o.isMesh) o.material = stoneSkin; });
    statue.animate(0, { t: 0, sit: 1, headPitch: -0.2 });
    statue.animate(0, { t: 0, sit: 1, headPitch: -0.2 });
    statue.root.scale.setScalar(1.3);
    statue.root.position.set(R.x, top, R.z - 7.5);
    scene.add(statue.root);
    addCollider({ x: R.x, z: R.z - 7.5, r: 2.5 });
    addCollider({ x: R.x, z: R.z - 5, r: 1.5 });
    exclude(R.x, R.z, 32);

    // ---- Volcano Isle: the Heart of the Volcano ----
    const Vo = byId.volcano;
    // the lava fills the crater up to a little below the lowest point of a ring inside the rim
    let ring = Infinity;
    for (let a = 0; a < PI * 2; a += 0.15) ring = Math.min(ring, terrainH(Vo.x + Math.cos(a) * 17, Vo.z + Math.sin(a) * 17));
    const lavaY = ring - 0.8;
    const lava = new THREE.Mesh(new THREE.CircleGeometry(24, 40), new THREE.MeshBasicMaterial({ color: 0xff5a10, fog: true }));
    lava.rotation.x = -PI / 2; lava.position.set(Vo.x, lavaY, Vo.z); scene.add(lava);
    W.lava = { x: Vo.x, z: Vo.z, y: lavaY, r: 20, mesh: lava };
    const pillar = M().mesh(new THREE.CylinderGeometry(2.6, 3.4, 9, 8), M().mat(0x3a3030), Vo.x, lavaY, Vo.z);
    scene.add(pillar);
    addPlatform({ minx: Vo.x - 2.5, maxx: Vo.x + 2.5, minz: Vo.z - 2.5, maxz: Vo.z + 2.5, top: lavaY + 4.5 });
    const gem = M().heartGem();
    gem.position.set(Vo.x, lavaY + 4.5, Vo.z); scene.add(gem);
    P.heart = { x: Vo.x, y: lavaY + 4.5, z: Vo.z, obj: gem };
    addLight({ x: Vo.x, y: lavaY + 8, z: Vo.z, color: 0xff6020, intensity: 60, range: 60, always: true });
    exclude(Vo.x, Vo.z, 40);

    // ---- treasure chests, hidden around the world ----
    P.chests = [];
    const chestSpots = [
      { isl: 'home', ang: -2.4, t: 0.93 },
      { isl: 'village', ang: 1.9, t: 0.9 },
      { isl: 'crystal', top: true },
      { isl: 'ruins', ang: 2.6, t: 0.85 },
      { isl: 'misty', ang: 0.6, t: 0.45 },
      { isl: 'volcano', ang: -2.2, t: 0.88 },
    ];
    for (let i = 0; i < chestSpots.length; i++) {
      const s = chestSpots[i], I = byId[s.isl];
      let x, z;
      if (s.top) { // highest spot on the island
        let best = -1;
        for (let k = 0; k < 2000; k++) { const a = k * 2.39996, d = Math.sqrt(k / 2000) * I.r; const xx = I.x + Math.cos(a) * d, zz = I.z + Math.sin(a) * d; const h = terrainH(xx, zz); if (h > best && slopeAt(xx, zz) < 0.9) { best = h; x = xx; z = zz; } }
      } else {
        const cc = coast(I, s.ang, 2.6);
        x = I.x + (cc.x - I.x) * s.t; z = I.z + (cc.z - I.z) * s.t;
      }
      const ch = M().chest(i === 2 ? 0x5a8ab0 : 0x8a5a2c);
      place(ch, x, z, U.rng(i)() * 6);
      ch.traverse(o => { if (o.isMesh) o.castShadow = true; });
      addCollider({ x, z, r: 0.6 });
      exclude(x, z, 4);
      P.chests.push({ x, z, y: terrainH(x, z), obj: ch, i });
    }
  }

  // make the ground flatter in a circle (for houses)
  function flatten(x, z, r) {
    const target = terrainH(x, z);
    const i0 = Math.max(0, Math.floor((x - r - GX0) / CELL)), i1 = Math.min(NX, Math.ceil((x + r - GX0) / CELL));
    const j0 = Math.max(0, Math.floor((z - r - GZ0) / CELL)), j1 = Math.min(NZ, Math.ceil((z + r - GZ0) / CELL));
    const pos = terrain.geometry.attributes.position;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const vx = GX0 + i * CELL, vz = GZ0 + j * CELL;
      const d = Math.hypot(vx - x, vz - z);
      if (d > r) continue;
      const k = j * (NX + 1) + i;
      const t = U.smooth(U.clamp((r - d) / (r * 0.5), 0, 1));
      H[k] = U.lerp(H[k], Math.max(target, 0.9), t);
      pos.setY(k, H[k]);
    }
    pos.needsUpdate = true;
    terrain.geometry.computeVertexNormals();
  }

  function makeCave(cave) {
    const y = terrainH(cave.x, cave.z);
    cave.y = y;
    const face = Math.atan2(-cave.x, -cave.z); // the opening looks at the middle of the island
    cave.face = face;
    const g = new THREE.Group();
    const rockMat = M().mat(0x6a6460);
    // the dome, with a gap for the door
    const gap = 1.1;
    const dome = new THREE.SphereGeometry(7, 14, 8, 0, PI * 2 - gap, 0, PI / 2);
    const p = dome.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
      const k = 1 + (N.noise(vx * 0.6 + 3, vz * 0.6 + vy * 0.5, 5) - 0.5) * 0.35;
      p.setXYZ(i, vx * k, vy * k * 1.05, vz * k);
    }
    dome.computeVertexNormals();
    const dm = new THREE.Mesh(dome, new THREE.MeshStandardMaterial({ color: 0x6a6460, roughness: 1, flatShading: true, side: THREE.DoubleSide }));
    // SphereGeometry starts the gap at angle (2PI - gap) measured from +x toward -z ... turn it to face the island
    dm.rotation.y = face - Math.atan2(-Math.cos(gap / 2), -Math.sin(gap / 2));
    dm.castShadow = true; dm.receiveShadow = true;
    g.add(dm);
    // big rocks around the door
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(DL.Geo.rock(2.4, 1, 20 + s), rockMat);
      r.position.set(Math.sin(face + s * 0.62) * 6.8, 1.2, Math.cos(face + s * 0.62) * 6.8);
      r.castShadow = true; g.add(r);
    }
    // glowing crystals inside
    const cm = new THREE.MeshStandardMaterial({ color: 0x8af0ff, emissive: 0x40c0ff, emissiveIntensity: 0.9, flatShading: true });
    for (let i = 0; i < 7; i++) {
      const a = face + PI + (i - 3) * 0.45;
      const cr = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5 + (i % 3) * 0.5, 5), cm);
      cr.position.set(Math.sin(a) * 5.2, 0.6, Math.cos(a) * 5.2);
      cr.rotation.set(Math.cos(a) * 0.4, 0, -Math.sin(a) * 0.4);
      g.add(cr);
    }
    // a stone for the egg
    const ped = M().mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.6, 8), M().mat(0x8a8478), 0, 0.3, 0);
    ped.position.set(Math.sin(face + PI) * 2, 0.3, Math.cos(face + PI) * 2);
    g.add(ped);
    cave.eggSpot = { x: cave.x + ped.position.x, y: y + 0.6, z: cave.z + ped.position.z };
    g.position.set(cave.x, y - 0.3, cave.z);
    scene.add(g);
    // walls you can't walk through (but not the door)
    for (let a = 0; a < PI * 2; a += 0.2) {
      if (Math.abs(U.angleDiff(a, face)) < 0.55) continue;
      addCollider({ x: cave.x + Math.sin(a) * 6.8, z: cave.z + Math.cos(a) * 6.8, r: 0.9 });
    }
    addLight({ x: cave.x, y: y + 3, z: cave.z, color: 0x60c8ff, intensity: 25, range: 18, always: true });
    exclude(cave.x, cave.z, 14);
    exclude(cave.x + Math.sin(face) * 12, cave.z + Math.cos(face) * 12, 8);
  }

  // ------------------------------------------------------------
  //  TREES, ROCKS, BUSHES (with "instancing": one shape drawn
  //  thousands of times in one go)
  // ------------------------------------------------------------
  const RULES = {
    home: [['oak', 260], ['pine', 140], ['rock', 70], ['bush', 60], ['mushroom', 14], ['flowers', 220], ['grass', 2600]],
    village: [['blossom', 50], ['oak', 30], ['rock', 25], ['bush', 30], ['flowers', 260], ['grass', 1600]],
    crystal: [['pine', 120], ['snowpine', 140], ['rock', 120], ['crystal', 45], ['grass', 600]],
    ruins: [['palm', 70], ['oak', 30], ['rock', 50], ['bush', 30], ['flowers', 80], ['grass', 1000]],
    misty: [['giant', 70], ['pine', 120], ['oak', 60], ['mushroom', 60], ['rock', 40], ['bush', 20], ['grass', 1400]],
    volcano: [['dead', 60], ['darkrock', 120], ['crystal', 6]],
  };
  const KIND = {
    oak: 'tree', pine: 'tree', snowpine: 'tree', blossom: 'tree', giant: 'tree', palm: 'tree', dead: 'tree',
    rock: 'rock', darkrock: 'rock', bush: 'bush', mushroom: 'mushroom', crystal: 'crystal', flowers: 'deco', grass: 'deco',
  };
  function buildNature() {
    const geos = M().natureGeos();
    W.geos = geos;
    const low = DL.settings.gfx === 'low';
    const lists = {};
    const rnd = U.rng(1234);
    for (const I of ISLANDS) {
      for (const [type, count0] of RULES[I.id]) {
        let count = count0;
        if (low && type === 'grass') count = Math.floor(count0 * 0.3);
        const L = lists[type] = lists[type] || [];
        let made = 0, tries = 0;
        while (made < count && tries < count * 25) {
          tries++;
          const a = rnd() * PI * 2, d = Math.sqrt(rnd()) * I.r * 1.05;
          const x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
          const h = terrainH(x, z);
          const sl = slopeAt(x, z);
          // where can it grow?
          if (h < (type === 'palm' ? 2.2 : 3.2)) continue;
          if (sl > (KIND[type] === 'rock' || type === 'crystal' ? 1.4 : 0.75)) continue;
          if (type === 'crystal' && I.id === 'crystal' && h < 30) continue;
          if (type === 'snowpine' && h < 45) continue;
          if (type === 'pine' && I.id === 'crystal' && h > 60) continue;
          if (I.id === 'volcano' && h > 90) continue;
          if (KIND[type] === 'tree' && I.id !== 'misty' && I.id !== 'crystal' && N.fbm(x * 0.012, z * 0.012, 2, 31) < 0.42) continue; // forests and meadows
          let bad = false;
          for (const e of exclusions) if (U.dist2(x, z, e.x, e.z) < e.r * e.r) { bad = true; break; }
          if (bad) continue;
          const s = type === 'giant' ? 0.8 + rnd() * 0.5 : KIND[type] === 'rock' ? 0.5 + rnd() * 1.3 : 0.75 + rnd() * 0.5;
          L.push({ x, z, y: h, s, rot: rnd() * PI * 2, island: I.id });
          made++;
        }
      }
    }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    const baseMat = M().vcMat();
    const crystalMat = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x2a9ac0, emissiveIntensity: 0.6, roughness: 0.25, flatShading: true });
    const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
    let stumpCount = 0;
    for (const type in lists) if (KIND[type] === 'tree') stumpCount += lists[type].length;
    const stumps = new THREE.InstancedMesh(geos.stump, baseMat, stumpCount);
    stumps.castShadow = false; stumps.receiveShadow = true;
    m4.makeScale(0, 0, 0);
    for (let i = 0; i < stumpCount; i++) stumps.setMatrixAt(i, m4);
    scene.add(stumps); W.inst.stumps = stumps;
    let stumpI = 0;
    for (const type in lists) {
      const L = lists[type];
      if (!L.length) continue;
      const geo = geos[type];
      const mat = type === 'crystal' ? crystalMat : type === 'grass' ? grassMat : baseMat;
      const im = new THREE.InstancedMesh(geo, mat, L.length);
      im.castShadow = KIND[type] !== 'deco' && type !== 'mushroom';
      im.receiveShadow = true;
      let berries = null;
      if (type === 'bush') { berries = new THREE.InstancedMesh(geos.berries, baseMat, L.length); scene.add(berries); W.inst.berries = berries; }
      for (let i = 0; i < L.length; i++) {
        const o = L[i];
        e.set(0, o.rot, 0); q.setFromEuler(e);
        const sy = KIND[type] === 'rock' ? o.s * 0.8 : o.s;
        v.set(o.x, o.y - (KIND[type] === 'rock' ? 0.25 * o.s : 0.05), o.z); sc.set(o.s, sy, o.s);
        m4.compose(v, q, sc);
        im.setMatrixAt(i, m4);
        if (berries) berries.setMatrixAt(i, m4);
        if (KIND[type] === 'deco') continue;
        const node = {
          id: nodes.length, type, kind: KIND[type], x: o.x, y: o.y, z: o.z, s: o.s, island: o.island,
          mesh: im, index: i, matrix: m4.clone(), alive: true, hp: 0, regrowAt: 0, berries: berries ? true : false, berryMesh: berries,
        };
        node.hp = maxHp(node);
        if (node.kind === 'tree') {
          node.stump = stumpI++;
          const r = type === 'giant' ? 1.3 * o.s : 0.4 * o.s;
          node.col = addCollider({ x: o.x, z: o.z, r, y0: o.y - 2, y1: o.y + (type === 'giant' ? 14 : 6) * o.s });
        } else if (node.kind === 'rock') node.col = addCollider({ x: o.x, z: o.z, r: 0.85 * o.s, y0: o.y - 2, y1: o.y + 1.4 * o.s });
        else if (node.kind === 'crystal') node.col = addCollider({ x: o.x, z: o.z, r: 0.6 * o.s, y0: o.y - 2, y1: o.y + 2 });
        nodes.push(node);
        const k = pkey(Math.floor(o.x / NCELL), Math.floor(o.z / NCELL));
        if (!nodeGrid.has(k)) nodeGrid.set(k, []);
        nodeGrid.get(k).push(node);
      }
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      if (berries) { berries.instanceMatrix.needsUpdate = true; berries.computeBoundingSphere(); }
      scene.add(im);
      W.inst[type] = im;
    }
    W.inst.stumps.instanceMatrix.needsUpdate = true;
    W.inst.stumps.computeBoundingSphere();
  }
  function maxHp(n) { return n.kind === 'tree' ? (n.type === 'giant' ? 6 : 3) : n.kind === 'rock' ? Math.max(2, Math.round(n.s * 3)) : n.kind === 'crystal' ? 3 : 1; }

  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  // a tree was chopped, a rock was mined, berries were picked...
  function setNodeAlive(n, alive, part) {
    if (part === 'berries') {
      n.berries = alive;
      n.berryMesh.setMatrixAt(n.index, alive ? n.matrix : zero);
      n.berryMesh.instanceMatrix.needsUpdate = true;
      return;
    }
    n.alive = alive;
    n.hp = maxHp(n);
    n.mesh.setMatrixAt(n.index, alive ? n.matrix : zero);
    n.mesh.instanceMatrix.needsUpdate = true;
    if (n.col) n.col.off = !alive;
    if (n.kind === 'tree') {
      const m = new THREE.Matrix4();
      if (!alive) { m.makeTranslation(n.x, n.y - 0.05, n.z); m.scale(new THREE.Vector3(n.s, n.s, n.s)); }
      W.inst.stumps.setMatrixAt(n.stump, alive ? zero : m);
      W.inst.stumps.instanceMatrix.needsUpdate = true;
    }
    if (n.kind === 'bush' && !alive) setNodeAlive(n, false, 'berries');
  }
  // shake a tree when you hit it
  const shaking = [];
  function shake(n) { shaking.push({ n, t: 0 }); }

  // ------------------------------------------------------------
  //  LITTLE ANIMALS
  // ------------------------------------------------------------
  const gulls = [], flies = [];
  let fireflies;
  function buildCritters() {
    for (let i = 0; i < 10; i++) {
      const g = M().seagull();
      const I = i < 6 ? byId.home : byId.village;
      g.userData.c = { x: I.x + U.rand(-80, 80), z: I.z + U.rand(-80, 80), r: 25 + Math.random() * 40, h: 25 + Math.random() * 20, sp: (0.25 + Math.random() * 0.2) * (Math.random() < 0.5 ? 1 : -1), a: Math.random() * 6 };
      scene.add(g); gulls.push(g);
    }
    const cols = [0xffd23a, 0xff7ab0, 0x7ad0ff, 0xffffff, 0xff8a3a];
    for (let i = 0; i < 14; i++) {
      const b = M().butterfly(cols[i % cols.length]);
      b.userData.p = new THREE.Vector3(9999, 0, 0);
      b.userData.t = Math.random() * 10;
      scene.add(b); flies.push(b);
    }
    W.butterflies = flies;
    // fireflies at night
    const n = 160;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    fireflies = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd8ff6a, size: 0.35, map: DL.Tex.T.dot, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    fireflies.frustumCulled = false;
    fireflies.userData.seeds = Array.from({ length: n }, () => [Math.random() * 80 - 40, Math.random() * 80 - 40, Math.random() * 10]);
    scene.add(fireflies);
  }

  function islandAt(x, z) {
    let best = null, bd = Infinity;
    for (const I of ISLANDS) {
      const d = Math.hypot(x - I.x, z - I.z) / I.r;
      if (d < 1.25 && d < bd) { bd = d; best = I; }
    }
    return best;
  }

  // ------------------------------------------------------------
  //  EVERY FRAME
  // ------------------------------------------------------------
  const cTop = new THREE.Color(), cBot = new THREE.Color(), cSun = new THREE.Color(), tmp = new THREE.Color();
  const DAY_TOP = new THREE.Color(0x3d86e0), DAY_BOT = new THREE.Color(0xc4e4f6);
  const SET_TOP = new THREE.Color(0x4a5a9a), SET_BOT = new THREE.Color(0xffa070);
  const NIGHT_TOP = new THREE.Color(0x0a1638), NIGHT_BOT = new THREE.Color(0x24365e);
  let lightTimer = 0, regrowTimer = 0;
  W.time = 0;
  function update(dt, focus, camera) {
    W.time += dt;
    // ---- day and night (a whole day is 12 minutes) ----
    W.tod = (W.tod + dt / DL.Game.DAY_LENGTH) % 1;
    const ang = (W.tod - 0.25) * PI * 2;
    const elev = Math.sin(ang);
    const sunDir = new THREE.Vector3(Math.cos(ang) * 0.85, elev, 0.45).normalize();
    const day = U.smooth(U.clamp((elev + 0.12) / 0.35, 0, 1));
    const sunset = U.clamp(1 - Math.abs(elev) / 0.3, 0, 1);
    W.night = 1 - day;
    cTop.copy(NIGHT_TOP).lerp(DAY_TOP, day).lerp(SET_TOP, sunset * 0.5);
    cBot.copy(NIGHT_BOT).lerp(DAY_BOT, day).lerp(SET_BOT, sunset * 0.75);
    skyMat.uniforms.top.value.copy(cTop);
    skyMat.uniforms.bottom.value.copy(cBot);
    skyMat.uniforms.sunDir.value.copy(sunDir);
    skyMat.uniforms.night.value = W.night;
    skyMat.uniforms.time.value = W.time;
    cSun.set(0xfff2d8).lerp(tmp.set(0xff9a50), sunset * 0.8);
    skyMat.uniforms.sunCol.value.copy(cSun);
    // mist in the Misty Forest
    const isl = islandAt(focus.x, focus.z);
    const misty = isl && isl.id === 'misty' && focus.y < 60 ? 1 : 0;
    W.mist = U.damp(W.mist || 0, misty, 0.6, dt);
    scene.fog.color.copy(cBot).lerp(tmp.set(0xc8d8d0), W.mist * 0.5 * day);
    scene.fog.near = U.lerp(200, 25, W.mist);
    scene.fog.far = U.lerp(DL.settings.gfx === 'low' ? 800 : 1150, 260, W.mist);
    // the sun (or the moon at night)
    const moon = elev < 0;
    const lightDir = moon ? sunDir.clone().negate() : sunDir;
    sun.position.set(focus.x + lightDir.x * 150, focus.y + lightDir.y * 150, focus.z + lightDir.z * 150);
    sun.target.position.set(focus.x, focus.y, focus.z);
    sun.intensity = moon ? 0.55 * U.clamp(-elev * 4, 0, 1) : 2.7 * U.clamp(elev * 4, 0, 1);
    sun.color.copy(moon ? tmp.set(0x9ab8ff) : cSun);
    hemi.intensity = U.lerp(0.55, 1.15, day);
    hemi.color.copy(tmp.set(0x8aa4e0).lerp(new THREE.Color(0xcfe6ff), day));
    hemi.groundColor.set(day > 0.5 ? 0x6a5a3a : 0x2a2a3a);
    // water
    waterMat.uniforms.time.value = W.time;
    waterMat.uniforms.sunDir.value.copy(lightDir);
    waterMat.uniforms.sunCol.value.copy(moon ? tmp.set(0x6a7aa0) : cSun);
    waterMat.uniforms.skyCol.value.copy(cBot);
    waterMat.uniforms.dark.value = W.night * 0.8;
    water.position.x = Math.round(focus.x / 30) * 30; water.position.z = Math.round(focus.z / 30) * 30;
    sky.position.copy(camera.position);
    // windows glow at night
    for (const g of W.windows) g.emissiveIntensity = W.night * 1.4;
    // clouds drift
    for (const c of W.clouds.children) { c.position.x += c.userData.speed * dt; if (c.position.x > 1100) c.position.x = -800; }
    // lava glows
    if (W.lava) W.lava.mesh.material.color.setHSL(0.04 + Math.sin(W.time * 2) * 0.01, 1, 0.5 + Math.sin(W.time * 3) * 0.05);

    // ---- trees shake when you chop them ----
    for (let i = shaking.length - 1; i >= 0; i--) {
      const s = shaking[i]; s.t += dt;
      const n = s.n;
      if (!n.alive || s.t > 0.4) { if (n.alive) { n.mesh.setMatrixAt(n.index, n.matrix); n.mesh.instanceMatrix.needsUpdate = true; } shaking.splice(i, 1); continue; }
      const k = Math.sin(s.t * 40) * 0.05 * (1 - s.t / 0.4);
      const m = n.matrix.clone().multiply(new THREE.Matrix4().makeRotationZ(k));
      n.mesh.setMatrixAt(n.index, m); n.mesh.instanceMatrix.needsUpdate = true;
    }
    // ---- things grow back ----
    regrowTimer -= dt;
    if (regrowTimer < 0) {
      regrowTimer = 2;
      for (const n of W.regrowList) {
        if (n.regrowAt && W.time > n.regrowAt) {
          // don't pop back on top of the player
          if (U.dist2(n.x, n.z, focus.x, focus.z) < 25) continue;
          n.regrowAt = 0;
          if (n.kind === 'bush' && n.alive) setNodeAlive(n, true, 'berries');
          else setNodeAlive(n, true);
        }
      }
      W.regrowList = W.regrowList.filter(n => n.regrowAt);
    }

    // ---- the closest lamps and fires get a real light ----
    lightTimer -= dt;
    if (lightTimer < 0) {
      lightTimer = 0.5;
      const list = lightSources.filter(s => (s.always || W.night > 0.3) && (!s.on || s.on()))
        .map(s => ({ s, d: U.dist2(s.x, s.z, camera.position.x, camera.position.z) }))
        .sort((a, b) => a.d - b.d);
      for (let i = 0; i < lightPool.length; i++) {
        const l = lightPool[i], it = list[i];
        if (it && it.d < 120 * 120) { l.position.set(it.s.x, it.s.y, it.s.z); l.color.set(it.s.color); l.userData.target = it.s.intensity; l.distance = it.s.range; l.userData.flicker = it.s.flicker; }
        else l.userData.target = 0;
      }
    }
    for (const l of lightPool) {
      const fl = l.userData.flicker ? 0.85 + Math.sin(W.time * 13 + l.id) * 0.08 + Math.sin(W.time * 31) * 0.07 : 1;
      l.intensity = U.damp(l.intensity, (l.userData.target || 0) * fl, 6, dt);
    }

    // ---- seagulls, butterflies, fireflies ----
    for (const g of gulls) {
      const c = g.userData.c;
      c.a += c.sp * dt;
      g.position.set(c.x + Math.cos(c.a) * c.r, c.h + Math.sin(c.a * 2) * 2, c.z + Math.sin(c.a) * c.r);
      g.rotation.y = -c.a + (c.sp > 0 ? 0 : PI);
      g.rotation.z = c.sp > 0 ? -0.3 : 0.3;
      for (const w of g.userData.wings) w.g.rotation.z = Math.sin(W.time * 6 + c.a) * 0.4 * w.s;
      g.visible = day > 0.2;
    }
    for (const b of flies) {
      const u = b.userData;
      u.t += dt;
      if (U.dist2(u.p.x, u.p.z, focus.x, focus.z) > 45 * 45 || u.caught) {
        // fly somewhere new near you
        const a = Math.random() * PI * 2, d = 12 + Math.random() * 25;
        const x = focus.x + Math.cos(a) * d, z = focus.z + Math.sin(a) * d;
        u.p.set(x, terrainH(x, z) + 1 + Math.random(), z);
        u.caught = false;
      }
      u.p.x += Math.sin(u.t * 0.7 + u.p.y) * dt * 1.2;
      u.p.z += Math.cos(u.t * 0.5 + u.p.x * 0.1) * dt * 1.2;
      const gy = terrainH(u.p.x, u.p.z);
      u.p.y = Math.max(gy + 0.5, U.damp(u.p.y, gy + 1.2 + Math.sin(u.t) * 0.6, 1, dt));
      b.position.copy(u.p);
      b.rotation.y = u.t * 0.3;
      for (const w of b.userData.wings) w.g.rotation.z = Math.sin(u.t * 20) * 0.9 * w.s;
      b.visible = day > 0.3 && gy > 1;
    }
    fireflies.material.opacity = U.clamp(W.night * 1.5 - 0.3, 0, 1);
    if (fireflies.material.opacity > 0) {
      const p = fireflies.geometry.attributes.position;
      const seeds = fireflies.userData.seeds;
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        const x = Math.floor(focus.x / 80) * 80 + s[0] + Math.sin(W.time * 0.3 + s[2]) * 3, z = Math.floor(focus.z / 80) * 80 + s[1] + Math.cos(W.time * 0.27 + s[2]) * 3;
        const wx = x + (x - focus.x > 40 ? -80 : x - focus.x < -40 ? 80 : 0), wz = z + (z - focus.z > 40 ? -80 : z - focus.z < -40 ? 80 : 0);
        const gy = terrainH(wx, wz);
        p.setXYZ(i, wx, gy < 1 ? -50 : gy + 0.8 + Math.sin(W.time + s[2] * 3) * 0.6, wz);
      }
      p.needsUpdate = true;
    }
  }
  W.regrowList = [];

  // ---------------- a ray from the camera to the ground ----------------
  function rayGround(origin, dir, maxDist = 30) {
    let last = origin.clone();
    for (let d = 0.5; d < maxDist; d += 0.25) {
      const p = origin.clone().addScaledVector(dir, d);
      const g = groundAt(p.x, p.z, p.y);
      if (p.y <= g) return p.set(p.x, g, p.z);
      last = p;
    }
    return null;
  }

  // ---------------- a small picture of the islands (for the map) ----------------
  function mapCanvas(size) {
    return U.canvas(size, size, (g) => {
      const img = g.createImageData(size, size);
      const x0 = -760, z0 = -760, span = 1700;
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const x = x0 + (i + 0.5) / size * span, z = z0 + (j + 0.5) / size * span;
        const h = terrainH(x, z);
        const isl = islandAt(x, z);
        let r, gg, b;
        if (h < 0) { const d = U.clamp(-h / 12, 0, 1); r = 60 - d * 30; gg = 170 - d * 70; b = 200 - d * 40; }
        else if (h < 2.6) { r = 232; gg = 212; b = 160; }
        else {
          const c = new THREE.Color(isl ? isl.grass[0] : 0x5fae46);
          if (isl && isl.kind === 'volcano') c.set(0x5a4a44);
          if (isl && isl.kind === 'peaks' && h > 70) c.set(0xf0f4ff);
          const k = 0.75 + U.clamp(h / 120, 0, 0.5);
          r = c.r * 255 * k; gg = c.g * 255 * k; b = c.b * 255 * k;
        }
        const o = (j * size + i) * 4;
        img.data[o] = r; img.data[o + 1] = gg; img.data[o + 2] = b; img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  const MAP = { x0: -760, z0: -760, span: 1700 };

  return Object.assign(W, { init, update, setNodeAlive, shake, islandAt, rayGround, mapCanvas, MAP, coast, exclude, solidBox, maxHp });
})();
