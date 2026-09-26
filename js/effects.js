// ============================================================
//  LAB 13 — PARTICLES (blood, alien goo, sparks, glass)
// ============================================================
window.LAB = window.LAB || {};

LAB.Effects = (function () {
  const U = LAB.U;
  const MAX = 500;
  let mesh, parts = [], dummy, col;
  const E = {};

  E.init = function (scene) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.1 });
    mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mat, MAX);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.setColorAt(0, new THREE.Color(1, 1, 1)); // make sure colors are switched on
    mesh.count = 0;
    scene.add(mesh);
    dummy = new THREE.Object3D();
    col = new THREE.Color();
    parts = [];
  };

  function spawn(x, y, z, vx, vy, vz, size, color, life, stick) {
    if (parts.length >= MAX) parts.shift();
    parts.push({ x, y, z, vx, vy, vz, size, color, life, max: life, stick, rx: Math.random() * 6, ry: Math.random() * 6 });
  }

  // blood burst (green = alien goo)
  E.blood = function (x, y, z, n, green, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = U.rand(1, 4) * power;
      const c = green ? (Math.random() < 0.5 ? 0x7ac020 : 0x3a8010) : (Math.random() < 0.5 ? 0x7a0404 : 0x4a0000);
      spawn(x, y, z, Math.cos(a) * s, U.rand(0.5, 4) * power, Math.sin(a) * s, U.rand(0.03, 0.09), c, U.rand(0.8, 1.6), true);
    }
  };
  // chunks (when an alien is destroyed)
  E.gibs = function (x, y, z, n, color = 0xb9a898) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = U.rand(1, 5);
      spawn(x, y, z, Math.cos(a) * s, U.rand(2, 5), Math.sin(a) * s, U.rand(0.08, 0.2), Math.random() < 0.5 ? color : 0x6a1018, U.rand(3, 5), false);
    }
  };
  E.sparks = function (x, y, z, n) {
    for (let i = 0; i < n; i++) spawn(x, y, z, U.rand(-3, 3), U.rand(0, 3), U.rand(-3, 3), 0.025, 0xffd060, U.rand(0.2, 0.6), false);
  };
  E.glass = function (x, y, z, n) {
    for (let i = 0; i < n; i++) spawn(x, y, z, U.rand(-4, 4), U.rand(0, 4), U.rand(-4, 4), U.rand(0.03, 0.12), 0xaad8ff, U.rand(1, 2.5), false);
  };

  E.update = function (dt) {
    let n = 0;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy -= 12 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < p.size / 2) {
        p.y = p.size / 2;
        if (p.stick && !p.splatted) {
          p.splatted = true;
          if (Math.random() < 0.08) LAB.World.addBlood(p.x, p.z, U.rand(0.3, 0.7), p.color === 0x7ac020 || p.color === 0x3a8010);
        }
        p.vx *= 0.3; p.vz *= 0.3; p.vy = -p.vy * 0.2;
      }
      if (p.y > LAB.WALL_H) { p.y = LAB.WALL_H; p.vy = 0; }
      const flat = p.splatted ? 0.25 : 1;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(p.splatted ? 0 : p.rx += dt * 5, p.ry, 0);
      const s = p.size * Math.min(1, p.life / p.max * 3);
      dummy.scale.set(s * (p.splatted ? 2 : 1), s * flat, s * (p.splatted ? 2 : 1));
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      col.setHex(p.color);
      mesh.setColorAt(n, col);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  };

  return E;
})();
