// ============================================================
//  FLOPPY PARTY — CAMERA (follows everyone, shakes on big hits)
// ============================================================
window.FP = window.FP || {};

FP.Camera = (function () {
  const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 400);
  const target = new THREE.Vector3(0, 0, 0);
  let zoom = 14, shake = 0, lift = 0;
  const offset = new THREE.Vector3(0, 0.62, 0.9).normalize();
  let fixed = null; // a mode can pin the camera to look at the whole arena

  function update(points, dt, minZoom = 12) {
    let want = target.clone(), spread = 0;
    if (fixed) { want.copy(fixed.center); spread = fixed.size; }
    else if (points.length) {
      const box = new THREE.Box3();
      points.forEach((p) => box.expandByPoint(p));
      box.getCenter(want);
      const size = new THREE.Vector3();
      box.getSize(size);
      spread = Math.max(size.x, size.z * 1.4, size.y * 1.5); // height counts too (for climbing games)
      want.y -= lift; // look a bit lower, so the characters show higher on the screen
    }
    const wantZoom = Math.max(minZoom, spread * 1.05 + 7);
    const k = Math.min(1, 3 * dt);
    zoom += (wantZoom - zoom) * k;
    target.lerp(want, k);
    camera.position.copy(target).addScaledVector(offset, zoom);
    camera.lookAt(target);
    if (shake > 0) {
      shake = Math.max(0, shake - dt * 2.5);
      const s = shake * shake * 0.6;
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s;
    }
  }

  function snap(points) {
    const box = new THREE.Box3();
    points.forEach((p) => box.expandByPoint(p));
    if (points.length) box.getCenter(target);
    update(points, 1);
  }

  return {
    camera, update, snap, target,
    shake(amount) { if (FP.Settings && !FP.Settings.get('shake')) return; shake = Math.min(1, Math.max(shake, amount)); },
    fix(center, size) { fixed = center ? { center: center.clone(), size } : null; },
    setAngle(y, z) { offset.set(0, y, z).normalize(); },
    setLift(v) { lift = v; },
    resize() { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); },
  };
})();
