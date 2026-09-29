// ============================================================
//  STARFALL — SPARKLES, DUST, SPLASHES AND SHOCKWAVES
// ============================================================
window.SF = window.SF || {};

SF.FX = (function () {
  const MAX = 600;
  let mesh, parts = [], rings = [], scene;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();

  function build(sc) {
    scene = sc;
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    mesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.12, 0), mat, MAX);
    mesh.frustumCulled = false;
    for (let i = 0; i < MAX; i++) {
      parts.push({ life: 0 });
      m4.makeScale(0, 0, 0); mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, col.set(0xffffff));
    }
    scene.add(mesh);
  }

  let next = 0;
  function spawn(x, y, z, vx, vy, vz, color, life = 0.7, size = 1, grav = 9) {
    const i = next;
    next = (next + 1) % MAX;
    Object.assign(parts[i], { x, y, z, vx, vy, vz, life, max: life, size, grav });
    mesh.setColorAt(i, col.set(color));
    mesh.instanceColor.needsUpdate = true;
  }

  const R = (a) => (Math.random() * 2 - 1) * a;
  function sparks(x, y, z, color = 0xffffff, n = 12, speed = 5) {
    for (let i = 0; i < n; i++) spawn(x, y, z, R(speed), Math.random() * speed, R(speed), color, 0.4 + Math.random() * 0.4, 0.8, 12);
  }
  function puff(x, y, z, color = 0xd0c0e0, n = 8) {
    for (let i = 0; i < n; i++) spawn(x + R(0.4), y + 0.2, z + R(0.4), R(2), 1 + Math.random() * 2, R(2), color, 0.6 + Math.random() * 0.4, 2.2, -1);
  }
  function splash(x, y, z) {
    for (let i = 0; i < 20; i++) spawn(x + R(0.5), y, z + R(0.5), R(2.5), 3 + Math.random() * 4, R(2.5), 0x90f0ff, 0.8, 1, 14);
  }
  function burst(x, y, z, color, n = 30) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2, sp = 3 + Math.random() * 5;
      spawn(x, y, z, Math.cos(a) * Math.cos(e) * sp, Math.sin(e) * sp + 2, Math.sin(a) * Math.cos(e) * sp, color, 0.8 + Math.random() * 0.6, 1.4, 4);
    }
  }
  function trailDot(x, y, z, color, size = 1) { spawn(x, y, z, R(0.3), R(0.3), R(0.3), color, 0.35, size, 0); }

  // an expanding ring (boss slams, magic)
  function ring(x, y, z, color = 0xffffff, radius = 6, time = 0.6) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y + 0.15, z);
    scene.add(m);
    rings.push({ m, t: 0, time, radius });
  }

  function update(dt) {
    if (!mesh) return;
    for (let i = 0; i < MAX; i++) {
      const p = parts[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const k = Math.max(0, p.life / p.max) * p.size;
      v.set(p.x, p.y, p.z); s.set(k, k, k);
      q.setFromAxisAngle(v.clone().normalize(), p.life * 6);
      m4.compose(v, q, s);
      mesh.setMatrixAt(i, m4);
      if (p.life <= 0) { m4.makeScale(0, 0, 0); mesh.setMatrixAt(i, m4); }
    }
    mesh.instanceMatrix.needsUpdate = true;
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.t += dt;
      const k = r.t / r.time;
      r.m.scale.setScalar(0.5 + k * r.radius);
      r.m.material.opacity = 0.8 * (1 - k);
      if (k >= 1) { scene.remove(r.m); r.m.geometry.dispose(); r.m.material.dispose(); rings.splice(i, 1); }
    }
  }

  return { build, update, sparks, puff, splash, burst, ring, trailDot };
})();
