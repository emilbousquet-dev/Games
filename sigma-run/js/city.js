// ============================================================
//  SIGMA RUN — THE CITY FAR AWAY
//  Hundreds of skyscrapers on the horizon, the street way down
//  below with traffic, and FBI cars with flashing lights.
// ============================================================
window.SR = window.SR || {};

SR.City = (function () {
  const U = SR.U;
  let scene, M;
  let ground, skyline = [], skyData = [];
  let cars, carLightsF, carLightsB, carData = [];
  const MAXCARS = 140;
  const streets = [];
  let suvs = [], suvLights = [];
  const dummy = new THREE.Object3D();

  // skyscraper materials that use world positions for their windows (so tall buildings aren't stretched)
  function skylineMaterial(base) {
    const m = base.clone();
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
        vec4 wp4 = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vec3 an = abs(normal);
        vec2 wuv = an.x > 0.5 ? vec2(wp4.z, wp4.y) : vec2(wp4.x, wp4.y);
        wuv /= 16.0;
        if (an.y > 0.5) wuv = vec2(0.01, 0.01);
        #ifdef USE_MAP
          vMapUv = wuv;
        #endif
        #ifdef USE_EMISSIVEMAP
          vEmissiveMapUv = wuv;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = wuv;
        #endif
      `);
    };
    m.customProgramCacheKey = () => 'skyline';
    return m;
  }

  function init(sc) {
    scene = sc; M = SR.Mats.M;
    // the street far below
    const T = SR.Tex.T;
    const roadTex = T.road.clone(); roadTex.repeat.set(120, 120); roadTex.needsUpdate = true;
    ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.9, color: 0x9a9a9a }));
    ground.rotation.x = -Math.PI / 2; ground.receiveShadow = false;
    scene.add(ground);

    // skyline: 4 kinds of buildings, lots of each
    const styles = ['glass', 'modern', 'concrete', 'office', 'brick'];
    const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
    const per = SR.settings.gfx === 'low' ? 50 : 90;
    for (const st of styles) {
      const mat = skylineMaterial(M.facades[st][0]);
      SR.Mats.M.facadeList.push(mat);
      const im = new THREE.InstancedMesh(geo, mat, per);
      im.frustumCulled = false;
      im.castShadow = false; im.receiveShadow = false;
      scene.add(im);
      skyline.push(im);
      const data = [];
      for (let i = 0; i < per; i++) data.push(newTower({}, 300 - Math.random() * 1250));
      skyData.push(data);
      for (let i = 0; i < per; i++) placeTower(im, i, data[i]);
      im.instanceMatrix.needsUpdate = true;
    }
    // cars
    const body = new THREE.BoxGeometry(1.9, 1.3, 4.4); body.translate(0, 0.75, 0);
    cars = new THREE.InstancedMesh(body, new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.35 }), MAXCARS);
    const lf = new THREE.BoxGeometry(1.6, 0.25, 0.1); lf.translate(0, 0.8, -2.22);
    const lb = new THREE.BoxGeometry(1.6, 0.25, 0.1); lb.translate(0, 0.8, 2.22);
    carLightsF = new THREE.InstancedMesh(lf, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.6, 3.5) }), MAXCARS);
    carLightsB = new THREE.InstancedMesh(lb, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 0.2, 0.15) }), MAXCARS);
    for (const im of [cars, carLightsF, carLightsB]) { im.count = 0; im.frustumCulled = false; scene.add(im); }
    const palette = [0xd8d8d8, 0x202020, 0xb01818, 0x1a4ab0, 0xf0c020, 0x2a7a3a, 0xe8e8e8, 0x555a60];
    for (let i = 0; i < MAXCARS; i++) cars.setColorAt(i, new THREE.Color(U.pick(palette)));

    // FBI cars (black SUVs with red and blue lights)
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.1, 4.8), new THREE.MeshStandardMaterial({ color: 0x0b0b0e, metalness: 0.7, roughness: 0.25 }));
      b.position.y = 0.9; g.add(b);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 3), b.material); top.position.set(0, 1.85, 0.3); g.add(top);
      const red = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 0.2, 0.2) }));
      const blue = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.2, 0.6, 9) }));
      red.position.set(-0.45, 2.33, 0.3); blue.position.set(0.45, 2.33, 0.3);
      g.add(red, blue);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: SR.Tex.T.glow, color: 0xff2020, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      glow.scale.set(9, 9, 1); glow.position.y = 2.6; g.add(glow);
      g.visible = false;
      scene.add(g);
      suvs.push({ g, red, blue, glow, street: null, phase: Math.random() * 6 });
    }
  }

  function newTower(t, z) {
    const side = Math.random() < 0.5 ? -1 : 1;
    t.x = side * U.rand(70, 420);
    t.z = z;
    const far = Math.abs(t.x) / 420;
    t.h = U.rand(40, 120) + (Math.random() < 0.15 ? U.rand(60, 170) : 0) + far * 40;
    t.w = U.rand(18, 45); t.d = U.rand(18, 45);
    return t;
  }
  function placeTower(im, i, t) {
    dummy.position.set(t.x, -2, t.z);
    dummy.scale.set(t.w, t.h, t.d);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    im.setMatrixAt(i, dummy.matrix);
  }

  // a street where the course has a gap: some cars drive across it
  function addStreet(seg, zA, zB) {
    // zA = end of the roof, zB = start of the next roof (smaller)
    if (zA - zB < 4) { seg.street = null; return; }
    const st = { z: (zA + zB) / 2, w: zA - zB, seg, cars: [] };
    const n = Math.min(4, Math.floor(st.w / 3));
    for (let i = 0; i < n; i++) {
      if (carData.length >= MAXCARS) break;
      const dir = i % 2 ? 1 : -1;
      const c = { x: U.rand(-250, 250), z: st.z + (dir > 0 ? -1.5 : 1.5) * Math.min(1, st.w / 6), dir, speed: U.rand(10, 22), street: st, idx: carData.length };
      carData.push(c); st.cars.push(c);
    }
    seg.street = st;
    streets.push(st);
  }
  function removeStreet(seg) {
    const st = seg.street;
    if (!st) return;
    carData = carData.filter((c) => c.street !== st);
    const i = streets.indexOf(st); if (i >= 0) streets.splice(i, 1);
    for (const s of suvs) if (s.street === st) { s.street = null; s.g.visible = false; }
  }

  function update(dt, player, time, wanted) {
    const pz = player.z;
    ground.position.set(Math.round(player.x / 40) * 40, 0, Math.round(pz / 40) * 40);
    // move far towers from behind you to in front of you
    for (let k = 0; k < skyline.length; k++) {
      const im = skyline[k], data = skyData[k];
      let changed = false;
      for (let i = 0; i < data.length; i++) {
        const t = data[i];
        if (t.z > pz + 300) { newTower(t, t.z - 1250); placeTower(im, i, t); changed = true; }
      }
      if (changed) im.instanceMatrix.needsUpdate = true;
    }
    // traffic
    let n = 0;
    for (const c of carData) {
      c.x += c.dir * c.speed * dt;
      if (c.x > 260) c.x = -260; if (c.x < -260) c.x = 260;
      dummy.position.set(c.x, 0.05, c.z);
      dummy.rotation.set(0, c.dir > 0 ? -Math.PI / 2 : Math.PI / 2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      cars.setMatrixAt(n, dummy.matrix); carLightsF.setMatrixAt(n, dummy.matrix); carLightsB.setMatrixAt(n, dummy.matrix);
      n++;
    }
    cars.count = carLightsF.count = carLightsB.count = n;
    cars.instanceMatrix.needsUpdate = carLightsF.instanceMatrix.needsUpdate = carLightsB.instanceMatrix.needsUpdate = true;

    // FBI roadblocks on the streets ahead of you
    for (const s of suvs) {
      if (s.street && (s.street.z > pz + 30)) { s.street = null; s.g.visible = false; }
    }
    if (wanted >= 1) {
      for (const st of streets) {
        if (st.z > pz - 25 || st.z < pz - 160 || st.suvDone) continue;
        st.suvDone = true;
        const free = suvs.filter((s) => !s.street);
        const k = Math.min(free.length, U.randInt(2, 3));
        for (let i = 0; i < k; i++) {
          const s = free[i];
          s.street = st; s.g.visible = true;
          s.g.position.set(player.x + U.rand(-14, 14), 0, st.z + U.rand(-1, 1));
          s.g.rotation.y = U.rand(-1, 1) + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
        }
      }
    }
    for (const s of suvs) {
      if (!s.g.visible) continue;
      const on = Math.sin(time * 14 + s.phase) > 0;
      s.red.visible = on; s.blue.visible = !on;
      s.glow.material.color.setHex(on ? 0xff2020 : 0x2050ff);
    }
  }

  return { init, update, addStreet, removeStreet };
})();
