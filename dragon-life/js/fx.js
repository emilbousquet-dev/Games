// ============================================================
//  DRAGON LIFE — EFFECTS
//  Hearts, sparkles, dragon fire, splashes, wood chips, smoke.
//  Thousands of tiny pictures that fly around and fade away.
// ============================================================
window.DL = window.DL || {};

DL.FX = (function () {
  const U = DL.U;
  const MAX = 1400;
  const systems = {};
  let pixelScale = 600;

  function makeSystem(scene, tex, additive) {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(MAX * 3), col = new Float32Array(MAX * 3), size = new Float32Array(MAX), alpha = new Float32Array(MAX);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('pcolor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('psize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('palpha', new THREE.BufferAttribute(alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { map: { value: tex }, scale: { value: pixelScale } },
      vertexShader: `
        attribute vec3 pcolor; attribute float psize; attribute float palpha;
        uniform float scale;
        varying vec3 vC; varying float vA;
        void main() {
          vC = pcolor; vA = palpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = psize * scale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map;
        varying vec3 vC; varying float vA;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(vC * t.rgb, t.a * vA);
          if (gl_FragColor.a < 0.01) discard;
          #include <colorspace_fragment>
        }`,
    });
    const pts = new THREE.Points(g, m);
    pts.frustumCulled = false;
    pts.renderOrder = 5;
    scene.add(pts);
    return { pts, list: [], g, m };
  }

  function init(scene) {
    const T = DL.Tex.T;
    systems.glow = makeSystem(scene, T.dot, true);
    systems.soft = makeSystem(scene, T.dot, false);
    systems.heart = makeSystem(scene, T.heart, false);
    systems.star = makeSystem(scene, T.star, true);
  }
  function setScale(h, fov) { pixelScale = h / 2 / Math.tan(fov * Math.PI / 360); for (const k in systems) systems[k].m.uniforms.scale.value = pixelScale; }

  const c0 = new THREE.Color(), c1 = new THREE.Color();
  function spawn(sys, o) {
    const S = systems[sys];
    if (S.list.length >= MAX) S.list.shift();
    c0.set(o.color === undefined ? 0xffffff : o.color);
    c1.set(o.color1 === undefined ? (o.color === undefined ? 0xffffff : o.color) : o.color1);
    S.list.push({
      x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0,
      life: 0, max: o.life || 1, s0: o.size || 0.3, s1: o.size1 === undefined ? (o.size || 0.3) : o.size1,
      r0: c0.r, g0: c0.g, b0: c0.b, r1: c1.r, g1: c1.g, b1: c1.b,
      grav: o.gravity || 0, drag: o.drag || 0, a: o.alpha === undefined ? 1 : o.alpha, fadeIn: o.fadeIn || 0,
    });
  }

  function update(dt) {
    for (const k in systems) {
      const S = systems[k];
      const L = S.list;
      const P = S.g.attributes.position.array, C = S.g.attributes.pcolor.array, Z = S.g.attributes.psize.array, A = S.g.attributes.palpha.array;
      let n = 0;
      for (let i = 0; i < L.length; i++) {
        const p = L[i];
        p.life += dt;
        if (p.life >= p.max) continue;
        p.vy -= p.grav * dt;
        const dr = Math.exp(-p.drag * dt);
        p.vx *= dr; p.vy *= dr; p.vz *= dr;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        const t = p.life / p.max;
        P[n * 3] = p.x; P[n * 3 + 1] = p.y; P[n * 3 + 2] = p.z;
        C[n * 3] = p.r0 + (p.r1 - p.r0) * t; C[n * 3 + 1] = p.g0 + (p.g1 - p.g0) * t; C[n * 3 + 2] = p.b0 + (p.b1 - p.b0) * t;
        Z[n] = p.s0 + (p.s1 - p.s0) * t;
        A[n] = p.a * Math.min(1, (1 - t) * 3) * (p.fadeIn ? Math.min(1, t / p.fadeIn) : 1);
        L[n] = p;
        n++;
      }
      L.length = n;
      S.g.setDrawRange(0, n);
      for (const a of ['position', 'pcolor', 'psize', 'palpha']) S.g.attributes[a].needsUpdate = true;
    }
  }

  // ---------------- ready-made effects ----------------
  const R = U.rand;
  const FX = {
    init, update, spawn, setScale,
    hearts(x, y, z, n = 5) {
      for (let i = 0; i < n; i++) spawn('heart', { x: x + R(-0.5, 0.5), y: y + R(0, 0.5), z: z + R(-0.5, 0.5), vx: R(-0.4, 0.4), vy: R(1, 2), vz: R(-0.4, 0.4), life: R(1.2, 1.8), size: R(0.25, 0.4), color: U.pick([0xff4a7a, 0xff7aa0, 0xff2a5a]), drag: 1 });
    },
    sparkle(x, y, z, color = 0xffe680, n = 16) {
      for (let i = 0; i < n; i++) spawn('star', { x, y, z, vx: R(-3, 3), vy: R(1, 5), vz: R(-3, 3), life: R(0.5, 1.1), size: R(0.25, 0.5), size1: 0.05, color, gravity: 4, drag: 2 });
    },
    chips(x, y, z, color = 0xc89a5a, n = 8) {
      for (let i = 0; i < n; i++) spawn('soft', { x, y, z, vx: R(-3, 3), vy: R(2, 5), vz: R(-3, 3), life: R(0.5, 0.9), size: R(0.08, 0.16), color, gravity: 14 });
    },
    leaves(x, y, z, n = 10) {
      for (let i = 0; i < n; i++) spawn('soft', { x: x + R(-1.5, 1.5), y: y + R(2, 5), z: z + R(-1.5, 1.5), vx: R(-1, 1), vy: R(-0.5, 0.5), vz: R(-1, 1), life: R(1.2, 2), size: R(0.12, 0.2), color: U.pick([0x4f9a3a, 0x6ab84a, 0x3a7a2a]), gravity: 1.5, drag: 1.5 });
    },
    dust(x, y, z, n = 14, color = 0xc8b898) {
      for (let i = 0; i < n; i++) { const a = R(0, 6.28); spawn('soft', { x, y: y + 0.2, z, vx: Math.cos(a) * R(1, 4), vy: R(0.3, 1.5), vz: Math.sin(a) * R(1, 4), life: R(0.6, 1.2), size: R(0.4, 0.8), size1: 1.4, color, alpha: 0.5, drag: 3 }); }
    },
    splash(x, z, n = 18) {
      for (let i = 0; i < n; i++) spawn('soft', { x, y: 0.2, z, vx: R(-2, 2), vy: R(2, 5), vz: R(-2, 2), life: R(0.5, 0.9), size: R(0.15, 0.3), color: 0xe8f8ff, gravity: 12, alpha: 0.85 });
    },
    smoke(x, y, z, big = 1) {
      spawn('soft', { x: x + R(-0.2, 0.2), y, z: z + R(-0.2, 0.2), vx: R(-0.3, 0.3) + 0.4, vy: R(1, 1.6), vz: R(-0.3, 0.3), life: R(2.5, 4), size: 0.5 * big, size1: 2.5 * big, color: 0x9a9a9a, color1: 0xd8d8d8, alpha: 0.35, fadeIn: 0.15 });
    },
    ember(x, y, z) {
      spawn('glow', { x: x + R(-0.3, 0.3), y, z: z + R(-0.3, 0.3), vx: R(-0.3, 0.3), vy: R(1.5, 3), vz: R(-0.3, 0.3), life: R(0.6, 1.4), size: R(0.08, 0.15), color: 0xffa040, color1: 0xff4010, drag: 1 });
    },
    // dragon fire! o = start, d = direction (length 1), v = how fast the dragon moves
    fire(o, d, v, power = 1) {
      for (let i = 0; i < 6 * power; i++) {
        const sp = R(18, 26);
        spawn('glow', {
          x: o.x, y: o.y, z: o.z,
          vx: d.x * sp + R(-2, 2) + (v ? v.x : 0), vy: d.y * sp + R(-2, 2) + (v ? v.y : 0), vz: d.z * sp + R(-2, 2) + (v ? v.z : 0),
          life: R(0.55, 0.85), size: R(0.5, 0.8) * power, size1: R(2.6, 3.8) * power, color: 0xffc860, color1: 0xff3a0a, alpha: 0.55, drag: 2.2, gravity: -3,
        });
      }
      if (Math.random() < 0.5) spawn('soft', { x: o.x + d.x * 10, y: o.y + d.y * 10 + 1, z: o.z + d.z * 10, vx: d.x * 4, vy: 2, vz: d.z * 4, life: 1.6, size: 1.5, size1: 4, color: 0x5a5a5a, alpha: 0.25 });
    },
    // a little puff of fire (baby dragons try their best)
    puff(o, d) {
      for (let i = 0; i < 10; i++) spawn('glow', { x: o.x, y: o.y, z: o.z, vx: d.x * R(3, 6) + R(-1, 1), vy: d.y * 4 + R(0, 1.5), vz: d.z * R(3, 6) + R(-1, 1), life: R(0.3, 0.5), size: 0.15, size1: 0.6, color: 0xffe08a, color1: 0xff4010, drag: 3 });
      for (let i = 0; i < 4; i++) spawn('soft', { x: o.x, y: o.y, z: o.z, vx: d.x * 2, vy: 1.5, vz: d.z * 2, life: 1.2, size: 0.3, size1: 1.2, color: 0x8a8a8a, alpha: 0.4 });
    },
    burst(x, y, z, color, n = 30) {
      for (let i = 0; i < n; i++) { const a = R(0, 6.28), b = R(-1, 1); spawn('star', { x, y, z, vx: Math.cos(a) * 6 * Math.sqrt(1 - b * b), vy: b * 6 + 2, vz: Math.sin(a) * 6 * Math.sqrt(1 - b * b), life: R(0.8, 1.4), size: 0.5, size1: 0.1, color, drag: 2.5, gravity: 2 }); }
    },
    zzz(x, y, z) {
      spawn('soft', { x, y, z, vx: 0.3, vy: 0.6, vz: 0, life: 2.2, size: 0.25, size1: 0.6, color: 0xe8f0ff, alpha: 0.7 });
    },
  };
  return FX;
})();
