// ============================================================
//  NINJA CAT — EFFECTS
//  Sparks, smoke, sword swooshes, shockwaves and fireworks.
// ============================================================
window.NC = window.NC || {};

NC.FX = (function () {
  const U = NC.U;
  let scene = null;
  const systems = [];

  // one big cloud of dots, drawn in a single go (fast!)
  function makeSystem(max, additive) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(max * 3), col = new Float32Array(max * 3), size = new Float32Array(max), alpha = new Float32Array(max);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { scale: { value: 400 } },
      vertexShader: `
        attribute float size; attribute float alpha; attribute vec3 color;
        varying float vA; varying vec3 vC;
        uniform float scale;
        void main() {
          vA = alpha; vC = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying float vA; varying vec3 vC;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = vA * smoothstep(1.0, ${additive ? '0.0' : '0.55'}, d);
          if (a < 0.01) discard;
          gl_FragColor = vec4(vC, a);
        }`,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = additive ? 5 : 4;
    const S = { pts, geo, mat, max, next: 0, vx: new Float32Array(max), vy: new Float32Array(max), vz: new Float32Array(max), life: new Float32Array(max), maxLife: new Float32Array(max), grav: new Float32Array(max), drag: new Float32Array(max), grow: new Float32Array(max), size0: new Float32Array(max), alpha0: new Float32Array(max) };
    return S;
  }
  let sparks, smoke;
  const tmpC = new THREE.Color();

  function init(sc) {
    scene = sc;
    if (!sparks) { sparks = makeSystem(NC.lowGfx ? 900 : 2200, true); smoke = makeSystem(NC.lowGfx ? 400 : 900, false); systems.push(sparks, smoke); }
    clear();
    scene.add(sparks.pts); scene.add(smoke.pts);
  }

  function emit(S, x, y, z, vx, vy, vz, color, size, life, grav = 0, drag = 0, grow = 0, alpha = 1) {
    const i = S.next; S.next = (S.next + 1) % S.max;
    const p = S.geo.attributes.position.array, c = S.geo.attributes.color.array;
    p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
    tmpC.set(color);
    c[i * 3] = tmpC.r; c[i * 3 + 1] = tmpC.g; c[i * 3 + 2] = tmpC.b;
    S.vx[i] = vx; S.vy[i] = vy; S.vz[i] = vz;
    S.life[i] = S.maxLife[i] = life; S.grav[i] = grav; S.drag[i] = drag; S.grow[i] = grow;
    S.size0[i] = size; S.alpha0[i] = alpha;
    S.geo.attributes.size.array[i] = size;
    S.geo.attributes.alpha.array[i] = alpha;
  }

  // ---------- ready-made effects ----------
  function burst(x, y, z, o = {}) {
    const n = Math.round((o.n || 14) * (NC.lowGfx ? 0.6 : 1));
    const colors = Array.isArray(o.color) ? o.color : [o.color || 0xffe080];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.3) * (o.flat ? 0.4 : 1.6);
      const sp = (o.speed || 5) * (0.4 + Math.random() * 0.8);
      emit(sparks, x, y, z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + (o.up || 0), Math.sin(a) * Math.cos(e) * sp,
        U.pick(colors), (o.size || 0.25) * (0.6 + Math.random() * 0.8), (o.life || 0.5) * (0.6 + Math.random() * 0.8), o.gravity == null ? -12 : o.gravity, 2, -0.5);
    }
  }
  function puff(x, y, z, o = {}) {
    const n = Math.round((o.n || 10) * (NC.lowGfx ? 0.6 : 1));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = (o.speed || 2) * Math.random();
      emit(smoke, x + (Math.random() - 0.5) * (o.spread || 0.6), y + Math.random() * (o.spread || 0.6), z + (Math.random() - 0.5) * (o.spread || 0.6),
        Math.cos(a) * sp, (o.up == null ? 1 : o.up) * Math.random(), Math.sin(a) * sp,
        o.color || 0xc8c0d0, (o.size || 1.2) * (0.7 + Math.random() * 0.6), (o.life || 1.2) * (0.7 + Math.random() * 0.6), 0, 1.5, o.grow == null ? 1.5 : o.grow, o.alpha || 0.85);
    }
  }
  // the big purple cloud of a smoke bomb
  function smokeBomb(x, y, z) {
    puff(x, y + 0.3, z, { n: 45, color: 0xa890c8, size: 2.2, life: 1.8, speed: 4, spread: 1.4, grow: 2, up: 1.5 });
    puff(x, y + 0.3, z, { n: 20, color: 0x605070, size: 1.6, life: 1.4, speed: 3, spread: 1, grow: 1.5 });
    burst(x, y + 0.5, z, { n: 20, color: [0xd0a0ff, 0xffffff], speed: 6, life: 0.4 });
  }
  function firework(x, y, z, big = false) {
    const colors = U.pick([[0xff4060, 0xffd040], [0x40c0ff, 0xffffff], [0x80ff60, 0xffff80], [0xff80e0, 0xa060ff], [0xffa030, 0xff4020]]);
    const n = big ? 90 : 50;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.asin(Math.random() * 2 - 1), sp = (big ? 14 : 9) * (0.85 + Math.random() * 0.3);
      emit(sparks, x, y, z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp, Math.sin(a) * Math.cos(e) * sp, U.pick(colors), big ? 0.9 : 0.6, 1.2 + Math.random() * 0.6, -4, 1.8, -0.3);
    }
  }
  // a fiery explosion (rockets)
  function boom(x, y, z, r = 2) {
    burst(x, y, z, { n: 40, color: [0xffd040, 0xff6020, 0xffffff], speed: 9 * r / 2, size: 0.5, life: 0.6, up: 2 });
    puff(x, y, z, { n: 18, color: 0x3a3030, size: 2.4, life: 1.4, speed: 4, spread: 1, grow: 2 });
    ring(x, y + 0.1, z, r * 1.2, 0xffa040, 0.35);
  }

  // ---------- sword swoosh ----------
  const swooshes = [];
  const swooshGeo = new THREE.RingGeometry(0.55, 1.5, 24, 1, -1.3, 2.6);
  const spinGeo = new THREE.RingGeometry(0.7, 2.4, 40, 1, 0, Math.PI * 2);
  function slash(x, y, z, yaw, color = 0xffffff, kind = 'slash', dir = 1) {
    const m = new THREE.Mesh(kind === 'spin' ? spinGeo : swooshGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    // the arc lies flat and points where the cat looks; "dir" tilts it a little (left or right swing)
    m.rotation.order = 'YXZ';
    m.rotation.set(-Math.PI / 2, -Math.PI / 2, 0);
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    holder.rotation.order = 'YXZ';
    holder.rotation.set(0, yaw, kind === 'spin' ? 0 : dir * 0.3);
    holder.add(m);
    scene.add(holder);
    swooshes.push({ m: holder, mat: m.material, t: 0, life: kind === 'spin' ? 0.3 : 0.18, spin: kind === 'spin' });
  }

  // ---------- shockwave rings + warning circles ----------
  const rings = [];
  const ringGeo = new THREE.RingGeometry(0.85, 1, 48);
  function ring(x, y, z, maxR, color = 0xffffff, life = 0.5) {
    const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.scale.setScalar(0.1);
    scene.add(m);
    rings.push({ m, t: 0, life, maxR });
    return m;
  }
  // a red circle on the floor: "something is going to land here!"
  const warns = [];
  function warn(x, y, z, r, life) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: NC.Tex.ring(), transparent: true, depthWrite: false, opacity: 0.9 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.06, z);
    scene.add(m);
    const w = { m, t: 0, life };
    warns.push(w);
    return w;
  }

  function update(dt) {
    for (const S of systems) {
      const p = S.geo.attributes.position.array, sz = S.geo.attributes.size.array, al = S.geo.attributes.alpha.array;
      for (let i = 0; i < S.max; i++) {
        if (S.life[i] <= 0) { if (al[i] !== 0) al[i] = 0; continue; }
        S.life[i] -= dt;
        const k = Math.max(0, S.life[i] / S.maxLife[i]);
        const d = Math.exp(-S.drag[i] * dt);
        S.vx[i] *= d; S.vy[i] = S.vy[i] * d + S.grav[i] * dt; S.vz[i] *= d;
        p[i * 3] += S.vx[i] * dt; p[i * 3 + 1] += S.vy[i] * dt; p[i * 3 + 2] += S.vz[i] * dt;
        sz[i] = Math.max(0.01, S.size0[i] * (1 + S.grow[i] * (1 - k)));
        al[i] = S.alpha0[i] * Math.min(1, k * 2.5);
      }
      S.geo.attributes.position.needsUpdate = true;
      S.geo.attributes.size.needsUpdate = true;
      S.geo.attributes.alpha.needsUpdate = true;
      S.geo.attributes.color.needsUpdate = true;
    }
    for (let i = swooshes.length - 1; i >= 0; i--) {
      const s = swooshes[i];
      s.t += dt;
      const k = s.t / s.life;
      s.mat.opacity = 0.85 * (1 - k);
      if (s.spin) s.m.rotation.y += dt * 20; else s.m.scale.setScalar(1 + k * 0.3);
      if (k >= 1) { scene.remove(s.m); s.mat.dispose(); swooshes.splice(i, 1); }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.t += dt;
      const k = r.t / r.life;
      r.m.scale.setScalar(0.1 + r.maxR * U.smooth(Math.min(1, k)));
      r.m.material.opacity = 0.9 * (1 - k);
      if (k >= 1) { scene.remove(r.m); r.m.material.dispose(); rings.splice(i, 1); }
    }
    for (let i = warns.length - 1; i >= 0; i--) {
      const w = warns[i];
      w.t += dt;
      w.m.material.opacity = 0.5 + Math.sin(w.t * 20) * 0.35;
      if (w.t >= w.life || w.dead) { scene.remove(w.m); w.m.material.dispose(); w.m.geometry.dispose(); warns.splice(i, 1); }
    }
  }

  // dots get bigger on a bigger screen
  function setScale(viewHeight, fov) {
    const s = viewHeight / (2 * Math.tan((fov * Math.PI) / 360));
    for (const S of systems) S.mat.uniforms.scale.value = s;
  }

  function clear() {
    for (const S of systems) { S.life.fill(0); S.geo.attributes.alpha.array.fill(0); S.geo.attributes.alpha.needsUpdate = true; }
    for (const s of swooshes) scene && scene.remove(s.m);
    for (const r of rings) scene && scene.remove(r.m);
    for (const w of warns) scene && scene.remove(w.m);
    swooshes.length = rings.length = warns.length = 0;
  }

  return { init, burst, puff, smokeBomb, firework, boom, slash, ring, warn, update, setScale, clear };
})();
