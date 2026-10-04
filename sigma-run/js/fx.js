// ============================================================
//  SIGMA RUN — EFFECTS
//  Explosions, fire, smoke, sparks, glass shards, dust...
//  Thousands of tiny glowing dots ("particles").
// ============================================================
window.SR = window.SR || {};

SR.FX = (function () {
  const U = SR.U;
  let scene, renderer, camera;
  const systems = {};
  const debris = [], rings = [], lights = [];

  function makeSystem(name, cap, map, additive) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(cap * 3), col = new Float32Array(cap * 3), size = new Float32Array(cap), alpha = new Float32Array(cap), rot = new Float32Array(cap);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('rot', new THREE.BufferAttribute(rot, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: map }, scale: { value: 500 } },
      vertexShader: `
        attribute float size; attribute float alpha; attribute float rot; attribute vec3 color;
        uniform float scale;
        varying vec3 vCol; varying float vA; varying float vRot;
        void main() {
          vCol = color; vA = alpha; vRot = rot;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(size * scale / -mv.z, 0.0, 600.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec3 vCol; varying float vA; varying float vRot;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float c = cos(vRot), s = sin(vRot);
          p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
          vec4 t = texture2D(map, p);
          gl_FragColor = vec4(vCol * t.rgb, t.a * vA);
          if (gl_FragColor.a < 0.003) discard;
        }`,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    pts.renderOrder = additive ? 5 : 4;
    scene.add(pts);
    systems[name] = { pts, geo, cap, list: [], pos, col, size, alpha, rot };
  }

  function init(sc, r, cam) {
    scene = sc; renderer = r; camera = cam;
    const T = SR.Tex.T;
    makeSystem('add', 3000, T.glow, true);
    makeSystem('smoke', 1500, T.smoke, false);
    // chunks that fly out of explosions
    const dg = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const dm = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
    for (let i = 0; i < 40; i++) { const m = new THREE.Mesh(dg, dm); m.visible = false; scene.add(m); debris.push({ m, v: new THREE.Vector3(), r: new THREE.Vector3(), life: 0 }); }
    // glass shards
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.3, 0, -0.18, -0.15, 0, 0.2, -0.12, 0], 3));
    sg.computeVertexNormals();
    const sm = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.7, side: THREE.DoubleSide, envMapIntensity: 2 });
    for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(sg, sm); m.visible = false; scene.add(m); debris.push({ m, v: new THREE.Vector3(), r: new THREE.Vector3(), life: 0, glass: true }); }
    // shockwave rings
    for (let i = 0; i < 6; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2, 1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.visible = false; scene.add(m); rings.push({ m, life: 0, max: 1, size: 1 });
    }
    // flashes of light (always in the scene so nothing has to be rebuilt)
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0xff8a3a, 0, 40, 1.5);
      scene.add(l); lights.push({ l, life: 0, max: 1, power: 0 });
    }
  }

  // add one particle
  function emit(sysName, o) {
    const S = systems[sysName];
    if (S.list.length >= S.cap) S.list.shift();
    S.list.push({
      x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
      life: 0, max: o.life || 1, s0: o.size || 1, s1: o.size1 !== undefined ? o.size1 : (o.size || 1),
      r: o.r !== undefined ? o.r : 1, g: o.g !== undefined ? o.g : 1, b: o.b !== undefined ? o.b : 1,
      a0: o.alpha !== undefined ? o.alpha : 1, grav: o.grav || 0, drag: o.drag || 0, rot: Math.random() * 6.28, vr: o.vr || 0, fadeIn: o.fadeIn || 0,
    });
  }
  const rs = () => Math.random() * 2 - 1;
  function sphereV(speed) { let x, y, z, l; do { x = rs(); y = rs(); z = rs(); l = x * x + y * y + z * z; } while (l > 1 || l < 0.01); l = Math.sqrt(l); return [x / l * speed, y / l * speed, z / l * speed]; }

  function explosion(p, scale = 1) {
    const { x, y, z } = p;
    emit('add', { x, y, z, life: 0.25, size: 14 * scale, size1: 22 * scale, r: 5, g: 3.5, b: 2 });
    for (let i = 0; i < 26 * scale; i++) {
      const [vx, vy, vz] = sphereV(U.rand(3, 11) * scale);
      emit('add', { x, y, z, vx, vy: vy + 2, vz, life: U.rand(0.5, 1.0), size: U.rand(2, 3.5) * scale, size1: U.rand(4, 7) * scale, r: 4, g: U.rand(1.2, 2.2), b: 0.3, drag: 3, grav: -2 });
    }
    for (let i = 0; i < 40 * scale; i++) {
      const [vx, vy, vz] = sphereV(U.rand(10, 26));
      emit('add', { x, y, z, vx, vy: vy + 6, vz, life: U.rand(0.5, 1.3), size: 0.35, size1: 0.1, r: 6, g: 3.5, b: 1, grav: 18, drag: 0.6 });
    }
    for (let i = 0; i < 18 * scale; i++) {
      const [vx, vy, vz] = sphereV(U.rand(2, 6) * scale);
      const c = U.rand(0.08, 0.2);
      emit('smoke', { x, y, z, vx, vy: vy + 3, vz, life: U.rand(1.8, 3.2), size: 3 * scale, size1: U.rand(8, 12) * scale, r: c, g: c, b: c, alpha: 0.85, drag: 1.5, grav: -1.5, vr: rs() });
    }
    for (let i = 0; i < 8 * scale; i++) {
      const d = debris.find((q) => q.life <= 0 && !q.glass);
      if (!d) break;
      d.life = U.rand(1.5, 2.5); d.m.visible = true; d.m.position.set(x, y, z);
      const [vx, vy, vz] = sphereV(U.rand(8, 16)); d.v.set(vx, Math.abs(vy) + 6, vz);
      d.r.set(rs() * 10, rs() * 10, rs() * 10); d.m.scale.setScalar(U.rand(0.6, 1.6));
    }
    ring(p, 9 * scale, 0.45);
    flash(p, 9 * scale, 0.5, 0xff8a3a);
  }
  function ring(p, size, life, color) {
    const r = rings.find((q) => q.life <= 0) || rings[0];
    r.life = life; r.max = life; r.size = size; r.m.visible = true;
    r.m.position.set(p.x, p.y, p.z);
    r.m.lookAt(camera.position);
    r.m.material.color.copy(color || new THREE.Color(3, 2, 1));
  }
  function flash(p, power, life, color) {
    const L = lights.find((q) => q.life <= 0) || lights[0];
    L.l.position.set(p.x, p.y + 1, p.z); L.l.color.setHex(color); L.life = life; L.max = life; L.power = power;
  }
  function sparkle(x, y, z, color = [4, 3, 0.6], n = 7) {
    for (let i = 0; i < n; i++) {
      const [vx, vy, vz] = sphereV(U.rand(1.5, 4));
      emit('add', { x, y, z, vx, vy, vz, life: U.rand(0.25, 0.5), size: U.rand(0.15, 0.3), size1: 0, r: color[0], g: color[1], b: color[2], drag: 2 });
    }
  }
  function burst(x, y, z, color, n = 30) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2;
      emit('add', { x, y, z, vx: Math.cos(a) * 7, vy: rs() * 2, vz: Math.sin(a) * 7, life: 0.5, size: 0.4, size1: 0, r: c.r * 4, g: c.g * 4, b: c.b * 4, drag: 3 });
    }
    emit('add', { x, y, z, life: 0.3, size: 4, size1: 8, r: c.r * 3, g: c.g * 3, b: c.b * 3 });
  }
  function dust(x, y, z, n = 8, spread = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = U.rand(1, 3) * spread;
      emit('smoke', { x, y: y + 0.1, z, vx: Math.cos(a) * s, vy: U.rand(0.2, 1), vz: Math.sin(a) * s, life: U.rand(0.5, 0.9), size: 0.5, size1: 1.8, r: 0.55, g: 0.5, b: 0.45, alpha: 0.35, drag: 3 });
    }
  }
  function glass(x, y, z, w, vx, vz) {
    for (let i = 0; i < 40; i++) {
      const d = debris.find((q) => q.life <= 0 && q.glass);
      if (!d) break;
      d.life = U.rand(1, 1.8); d.m.visible = true;
      d.m.position.set(x + rs() * w / 2, y + U.rand(0, 2.6), z);
      d.v.set(vx * U.rand(0.3, 0.9) + rs() * 3, U.rand(0, 4), vz * U.rand(0.3, 0.9) + rs() * 3);
      d.r.set(rs() * 15, rs() * 15, rs() * 15); d.m.scale.setScalar(U.rand(0.5, 1.4));
    }
    for (let i = 0; i < 30; i++) emit('add', { x: x + rs() * w / 2, y: y + U.rand(0, 2.6), z, vx: vx * 0.5 + rs() * 3, vy: rs() * 3, vz: vz * 0.5 + rs() * 3, life: 0.5, size: 0.2, size1: 0, r: 2, g: 3, b: 4, drag: 1, grav: 10 });
  }
  function stars(x, y, z) {
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      emit('add', { x, y, z, vx: Math.cos(a) * 3, vy: U.rand(1, 4), vz: Math.sin(a) * 3, life: 0.7, size: 0.5, size1: 0.1, r: 4, g: 3.5, b: 0.5, grav: 5 });
    }
  }
  // exhaust behind a missile or rocket
  function trail(x, y, z, big = 1) {
    emit('add', { x, y, z, vx: rs() * 0.5, vy: rs() * 0.5, vz: rs() * 0.5, life: 0.12, size: 0.9 * big, size1: 0.3, r: 5, g: 2.5, b: 0.6 });
    const c = U.rand(0.55, 0.8);
    emit('smoke', { x, y, z, vx: rs() * 0.6, vy: U.rand(0.2, 0.8), vz: rs() * 0.6, life: U.rand(1.2, 2), size: 0.6 * big, size1: 3 * big, r: c, g: c, b: c, alpha: 0.45, drag: 1, vr: rs() });
  }

  function update(dt, cam) {
    camera = cam;
    for (const name in systems) {
      const S = systems[name];
      let n = 0;
      const L = S.list;
      for (let i = L.length - 1; i >= 0; i--) {
        const p = L[i];
        p.life += dt;
        if (p.life >= p.max) { L[i] = L[L.length - 1]; L.pop(); continue; }
      }
      for (const p of L) {
        const k = Math.exp(-p.drag * dt);
        p.vx *= k; p.vy = p.vy * k - p.grav * dt; p.vz *= k;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.rot += p.vr * dt;
        const t = p.life / p.max;
        S.pos[n * 3] = p.x; S.pos[n * 3 + 1] = p.y; S.pos[n * 3 + 2] = p.z;
        S.col[n * 3] = p.r; S.col[n * 3 + 1] = p.g; S.col[n * 3 + 2] = p.b;
        S.size[n] = U.lerp(p.s0, p.s1, t);
        S.alpha[n] = p.a0 * (1 - t) * (p.fadeIn ? Math.min(1, t / p.fadeIn) : 1);
        S.rot[n] = p.rot;
        n++;
      }
      S.geo.setDrawRange(0, n);
      for (const a of ['position', 'color', 'size', 'alpha', 'rot']) S.geo.attributes[a].needsUpdate = true;
      const h = renderer.getSize(new THREE.Vector2()).y * renderer.getPixelRatio();
      S.pts.material.uniforms.scale.value = h / (2 * Math.tan(cam.fov * Math.PI / 360));
    }
    for (const d of debris) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.v.y -= 22 * dt;
      d.m.position.addScaledVector(d.v, dt);
      d.m.rotation.x += d.r.x * dt; d.m.rotation.y += d.r.y * dt; d.m.rotation.z += d.r.z * dt;
      if (!d.glass && Math.random() < 0.3) emit('smoke', { x: d.m.position.x, y: d.m.position.y, z: d.m.position.z, life: 0.8, size: 0.4, size1: 1.5, r: 0.2, g: 0.2, b: 0.2, alpha: 0.5 });
      if (d.life <= 0) d.m.visible = false;
    }
    for (const r of rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      const t = 1 - r.life / r.max;
      r.m.scale.setScalar(0.2 + t * r.size);
      r.m.material.opacity = (1 - t);
      if (r.life <= 0) r.m.visible = false;
    }
    for (const L of lights) {
      if (L.life <= 0) { L.l.intensity = 0; continue; }
      L.life -= dt;
      L.l.intensity = Math.max(0, L.power * (L.life / L.max));
    }
  }

  function reset() {
    for (const name in systems) systems[name].list.length = 0;
    for (const d of debris) { d.life = 0; d.m.visible = false; }
    for (const r of rings) { r.life = 0; r.m.visible = false; }
    for (const L of lights) { L.life = 0; L.l.intensity = 0; }
  }

  return { init, update, emit, explosion, sparkle, burst, dust, glass, stars, trail, ring, flash, reset };
})();
