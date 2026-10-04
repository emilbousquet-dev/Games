// ============================================================
//  SIGMA HOVER GP — EFFECTS
//  Drift sparks, boost fire, dust, water spray, explosions,
//  confetti and shockwaves. Thousands of tiny glowing dots!
// ============================================================
window.HG = window.HG || {};

HG.FX = (function () {
  const U = HG.U;
  const MAX = 5000;
  let scene, pools = [], rings = [], ringGeo, flashes = [];
  const vs = `
    attribute float size; attribute vec4 col;
    varying vec4 vCol;
    uniform float scale;
    void main() {
      vCol = col;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = min(size * scale / max(0.1, -mv.z), 90.0);
      gl_Position = projectionMatrix * mv;
    }`;
  const fs = `
    varying vec4 vCol;
    void main() {
      vec2 p = gl_PointCoord - 0.5;
      float d = length(p) * 2.0;
      float a = smoothstep(1.0, 0.0, d);
      gl_FragColor = vec4(vCol.rgb, vCol.a * a * a);
      if (gl_FragColor.a < 0.01) discard;
    }`;

  // a pool of particles drawn in one go
  function makePool(additive) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 4), size = new Float32Array(MAX);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('col', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setDrawRange(0, 0);
    const m = new THREE.ShaderMaterial({
      vertexShader: vs, fragmentShader: fs, uniforms: { scale: { value: 400 } },
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.renderOrder = additive ? 20 : 19;
    return { pts, g, pos, col, size, list: [], additive };
  }

  function init(sc) {
    scene = sc;
    pools = [makePool(true), makePool(false)];
    for (const p of pools) scene.add(p.pts);
    ringGeo = new THREE.RingGeometry(0.85, 1, 40);
  }

  // add one particle. o = { p, v, c (color), a (alpha), s (size), life, g (gravity), drag, grow, add }
  const _c = new THREE.Color();
  function emit(o) {
    const pool = o.add === false ? pools[1] : pools[0];
    if (pool.list.length >= MAX) pool.list.shift();
    _c.set(o.c !== undefined ? o.c : 0xffffff);
    pool.list.push({
      x: o.p.x, y: o.p.y, z: o.p.z, vx: o.v ? o.v.x : 0, vy: o.v ? o.v.y : 0, vz: o.v ? o.v.z : 0,
      r: _c.r * (o.bright || 1), g: _c.g * (o.bright || 1), b: _c.b * (o.bright || 1), a: o.a !== undefined ? o.a : 1,
      s: o.s || 0.3, life: o.life || 0.5, t: 0, grav: o.g || 0, drag: o.drag || 0, grow: o.grow || 0,
    });
  }
  const rv = (s) => new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s);

  // ---------- ready-made effects ----------
  function sparks(p, color, n = 10, speed = 6, size = 0.25) {
    for (let i = 0; i < n; i++) emit({ p, v: rv(speed).add(new THREE.Vector3(0, speed * 0.4, 0)), c: color, s: size * U.rand(0.6, 1.3), life: U.rand(0.25, 0.6), g: 14, drag: 2, bright: 2 });
  }
  function explosion(p, big = 1) {
    for (let i = 0; i < 40 * big; i++) emit({ p, v: rv(16 * big), c: U.pick([0xffe080, 0xff9a20, 0xff5010]), s: U.rand(0.8, 2.2) * big, life: U.rand(0.35, 0.8), drag: 3, grow: 2.5, bright: 2.5 });
    for (let i = 0; i < 24 * big; i++) emit({ p, v: rv(8 * big).add(new THREE.Vector3(0, 4, 0)), c: U.pick([0x404040, 0x606060, 0x2a2a2a]), s: U.rand(1.2, 2.6) * big, life: U.rand(0.8, 1.6), drag: 2, grow: 2, a: 0.7, add: false });
    sparks(p, 0xffd060, 20 * big, 18 * big, 0.3);
    ring(p, 0xffa040, 9 * big, 0.45);
  }
  function smoke(p, color = 0x808080, n = 6, s = 1) {
    for (let i = 0; i < n; i++) emit({ p, v: rv(2).add(new THREE.Vector3(0, 1.5, 0)), c: color, s: U.rand(0.8, 1.6) * s, life: U.rand(0.6, 1.2), drag: 1.5, grow: 1.5, a: 0.55, add: false });
  }
  function confetti(p, n = 80) {
    const cols = [0xff3b6b, 0xffd21a, 0x3bd0ff, 0x7cff6a, 0xff7ae0, 0xffffff, 0xa070ff];
    for (let i = 0; i < n; i++) emit({ p, v: rv(14).add(new THREE.Vector3(0, 10, 0)), c: U.pick(cols), s: U.rand(0.2, 0.4), life: U.rand(1.5, 3), g: 6, drag: 1.2, add: false });
  }
  function firework(p, color) {
    for (let i = 0; i < 70; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(U.rand(10, 14));
      emit({ p, v, c: color, s: 0.5, life: U.rand(0.9, 1.4), g: 5, drag: 1.4, bright: 3 });
    }
  }
  function ring(p, color, size, life = 0.4, normal) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2), transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    m.position.copy(p);
    if (normal) m.lookAt(p.clone().add(normal)); else m.rotation.x = -Math.PI / 2;
    scene.add(m);
    rings.push({ m, t: 0, life, size });
  }

  // ------------------------------------------------------------
  //  EVERY FRAME: racers make sparks, flames and dust
  // ------------------------------------------------------------
  const _p = new THREE.Vector3(), _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _back = new THREE.Vector3(), _up = new THREE.Vector3();
  const SPARK = [0xffffff, 0x4aa8ff, 0xff9a1a, 0xd040ff];
  let acc = 0;
  function update(dt, race, kartViews, views) {
    // keep particle sizes right for the screen size
    const h = window.innerHeight / Math.max(1, views ? views.length : 1);
    for (const p of pools) p.pts.material.uniforms.scale.value = h * 0.9;
    acc += dt;
    const tick = acc > 1 / 60; if (tick) acc = 0;
    if (race && kartViews && tick) {
      for (const kv of kartViews) {
        const k = kv.kart;
        if (k.out || k.falling > 0) continue;
        const r = kv.racer;
        kv.root.updateMatrixWorld(true);
        _back.set(0, 0, -1).transformDirection(kv.root.matrixWorld);
        _up.set(0, 1, 0).transformDirection(kv.root.matrixWorld);
        // drift sparks
        if (k.drift.dir && k.grounded) {
          const lvl = k.drift.level;
          for (const sp of r.sparkPoints) {
            r.veh.group.localToWorld(_p.copy(sp));
            const n = lvl ? 2 : 1;
            for (let i = 0; i < n; i++) emit({ p: _p, v: _v.copy(_back).multiplyScalar(U.rand(3, 8)).add(rv(4)).addScaledVector(_up, U.rand(1, 4)), c: SPARK[lvl], s: lvl ? U.rand(0.18, 0.32) : 0.12, life: U.rand(0.15, 0.35), g: 12, drag: 1, bright: lvl ? 2.5 : 1.2 });
          }
        }
        // boost fire puffs
        if (k.boosting) {
          for (const n of r.veh.nozzles) {
            n.obj.getWorldPosition(_p);
            emit({ p: _p, v: _v.copy(_back).multiplyScalar(U.rand(4, 9)).add(rv(1.5)), c: k.sigmaT > 0 ? new THREE.Color().setHSL(Math.random(), 1, 0.6) : U.pick([0xffa040, 0xff6a1a, 0xffe080]), s: U.rand(0.4, 0.8), life: U.rand(0.12, 0.25), grow: -1, bright: 2 });
          }
        }
        // hover dust or water spray when going fast
        if (k.grounded && Math.abs(k.spd) > 12 && Math.random() < 0.5) {
          kv.root.getWorldPosition(_p).addScaledVector(_up, -0.5).addScaledVector(_back, 1);
          const surf = k.surface;
          const col = surf === 'water' ? 0xc0f0ff : surf === 'off' ? (race.theme.dust || 0xb09070) : surf === 'ice' ? 0xe0f8ff : surf === 'dirt' ? 0x9a7050 : null;
          if (col !== null) emit({ p: _p.add(rv(1.5)), v: _v.copy(_back).multiplyScalar(U.rand(2, 5)).addScaledVector(_up, U.rand(1, surf === 'water' ? 6 : 2.5)), c: col, s: U.rand(0.4, 0.9), life: U.rand(0.3, 0.6), g: surf === 'water' ? 10 : 2, grow: 1.5, a: 0.7, add: false });
        }
        // star power sparkle
        if (k.sigmaT > 0) { kv.root.getWorldPosition(_p); emit({ p: _p.add(rv(2.5)), v: rv(2), c: new THREE.Color().setHSL(Math.random(), 1, 0.6), s: 0.35, life: 0.5, bright: 2 }); }
        // dizzy stars after a hit
        if (k.hitT > 0 && Math.random() < 0.3) { kv.root.getWorldPosition(_p).addScaledVector(_up, 2.2); emit({ p: _p.add(rv(0.8)), v: rv(1).addScaledVector(_up, 1), c: 0xffe040, s: 0.3, life: 0.5, bright: 2 }); }
      }
    }
    // move all particles
    for (const pool of pools) {
      const L = pool.list;
      let w = 0;
      for (let i = 0; i < L.length; i++) {
        const q = L[i];
        q.t += dt;
        if (q.t >= q.life) continue;
        const dr = Math.exp(-q.drag * dt);
        q.vx *= dr; q.vy = q.vy * dr - q.grav * dt; q.vz *= dr;
        q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
        L[w++] = q;
      }
      L.length = w;
      for (let i = 0; i < w; i++) {
        const q = L[i], k = q.t / q.life;
        pool.pos[i * 3] = q.x; pool.pos[i * 3 + 1] = q.y; pool.pos[i * 3 + 2] = q.z;
        const fade = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
        pool.col[i * 4] = q.r; pool.col[i * 4 + 1] = q.g; pool.col[i * 4 + 2] = q.b; pool.col[i * 4 + 3] = q.a * fade;
        pool.size[i] = Math.max(0.01, q.s * (1 + q.grow * k));
      }
      pool.g.setDrawRange(0, w);
      pool.g.attributes.position.needsUpdate = true; pool.g.attributes.col.needsUpdate = true; pool.g.attributes.size.needsUpdate = true;
    }
    // shockwave rings
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.t += dt;
      const k = r.t / r.life;
      if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); continue; }
      r.m.scale.setScalar(0.5 + r.size * U.smooth(k));
      r.m.material.opacity = 1 - k;
    }
  }

  // a racer did something: show it!
  function kartEvent(k, e, race) {
    const kv = HG.Game && HG.Game.kartView ? HG.Game.kartView(k) : null;
    if (!kv) return;
    const p = kv.root.getWorldPosition(new THREE.Vector3());
    if (e.type === 'wall' && e.hard > 3) sparks(p, 0xffe0a0, Math.min(20, e.hard * 2), 6);
    else if (e.type === 'land' && e.hard > 8) { smoke(p, 0xc0b0a0, 6, 0.8); }
    else if (e.type === 'sparklevel') sparks(p, SPARK[e.level], 14, 5, 0.3);
    else if (e.type === 'boost' && (e.kind || '').startsWith('mini')) ring(p, SPARK[+e.kind.slice(4)] || 0xffffff, 4, 0.3, null);
    else if (e.type === 'hurt') { sparks(p.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xffe040, 16, 6, 0.35); }
    else if (e.type === 'shieldpop') { sparks(p, 0x80e0ff, 30, 8, 0.35); ring(p, 0x80e0ff, 5, 0.35); }
    else if (e.type === 'losecoins') { for (let i = 0; i < e.n * 3; i++) emit({ p, v: rv(8).add(new THREE.Vector3(0, 8, 0)), c: 0xffcc1a, s: 0.45, life: 0.8, g: 20, bright: 1.6 }); }
    else if (e.type === 'coin') { sparks(p.clone().add(new THREE.Vector3(0, 1, 0)), 0xffdd40, 8, 4, 0.25); }
    else if (e.type === 'trick') sparks(p, 0xffffff, 12, 6, 0.25);
    else if (e.type === 'respawn') sparks(p, 0x80ffff, 20, 5, 0.3);
    else if (e.type === 'finish') confetti(p.add(new THREE.Vector3(0, 3, 0)), 60);
  }

  function clear() {
    for (const p of pools) { p.list.length = 0; p.g.setDrawRange(0, 0); }
    for (const r of rings) scene.remove(r.m);
    rings.length = 0;
  }

  return { init, emit, sparks, explosion, smoke, confetti, firework, ring, update, kartEvent, clear };
})();
