// ============================================================
//  SPARE PARTS — SHARED CAMERA
//  Looks down at both robots and zooms out when they move apart.
// ============================================================
window.SP = window.SP || {};

SP.Camera = (function () {
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
  const target = new THREE.Vector3();
  let zoom = 12;

  function update(robots, dt) {
    const mid = new THREE.Vector3();
    for (const r of robots) mid.add(r.pos);
    mid.divideScalar(robots.length);
    mid.y += 0.8;
    const apart = robots[0].pos.distanceTo(robots[1].pos);
    const wantZoom = Math.max(12, apart * 1.3 + 6);
    const k = Math.min(1, 4 * dt);
    zoom += (wantZoom - zoom) * k;
    target.lerp(mid, k);
    camera.position.set(target.x, target.y + zoom * 0.75, target.z + zoom * 0.8);
    camera.lookAt(target);
  }

  // jump straight to the robots (at the start of a level)
  function snap(robots) {
    target.set(0, 0, 0);
    for (const r of robots) target.add(r.pos);
    target.divideScalar(robots.length);
    update(robots, 1);
  }

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  return { camera, update, snap, resize };
})();
