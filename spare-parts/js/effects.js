// ============================================================
//  SPARE PARTS — EFFECTS (dust puffs, poofs, confetti)
// ============================================================
window.SP = window.SP || {};

SP.Effects = (function () {
  let scene = null;
  const bits = [];
  const puffGeo = new THREE.SphereGeometry(0.12, 8, 6);
  const confettiGeo = new THREE.PlaneGeometry(0.14, 0.08);
  const COLORS = [0xff5a5f, 0xffc933, 0x5cc96b, 0x4aa8ff, 0x9b6bff, 0xff8fc8];

  function init(s) { scene = s; }

  function add(geo, color, pos, vel, life, opts = {}) {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }));
    m.position.copy(pos);
    scene.add(m);
    bits.push({ m, vel, life, max: life, grow: opts.grow || 0, gravity: opts.gravity || 0, spin: opts.spin || 0, drag: opts.drag || 0 });
  }

  // little dust clouds when landing
  function dust(pos, count = 6, color = 0xe8dcc0) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      add(puffGeo, color, pos.clone().add(new THREE.Vector3(Math.cos(a) * 0.3, 0.1, Math.sin(a) * 0.3)),
        new THREE.Vector3(Math.cos(a) * 1.5, 0.6, Math.sin(a) * 1.5), 0.45, { grow: 2.5, drag: 3 });
    }
  }

  // a big white poof (when a robot pops back after falling)
  function poof(pos) {
    for (let i = 0; i < 16; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).multiplyScalar(5);
      add(puffGeo, 0xffffff, pos.clone().add(new THREE.Vector3(0, 0.8, 0)), v, 0.6, { grow: 4, drag: 4 });
    }
  }

  // sparkles when a limb clicks on
  function sparkle(pos, color = 0xffe14a) {
    for (let i = 0; i < 6; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random(), Math.random() - 0.5).multiplyScalar(3);
      add(puffGeo, color, pos.clone(), v, 0.35, { grow: -2, drag: 2 });
    }
  }

  // confetti everywhere! (when you win)
  function confetti(center, count = 160) {
    for (let i = 0; i < count; i++) {
      const p = center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, 4 + Math.random() * 4, (Math.random() - 0.5) * 6));
      const v = new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3);
      add(confettiGeo, COLORS[i % COLORS.length], p, v, 3 + Math.random() * 2, { gravity: 3, spin: 8 + Math.random() * 8, drag: 1.2 });
    }
  }

  function update(dt) {
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.life -= dt;
      if (b.life <= 0) {
        scene.remove(b.m); b.m.material.dispose();
        bits.splice(i, 1);
        continue;
      }
      b.vel.y -= b.gravity * dt;
      b.vel.multiplyScalar(Math.max(0, 1 - b.drag * dt));
      b.m.position.addScaledVector(b.vel, dt);
      if (b.grow) b.m.scale.setScalar(Math.max(0.05, b.m.scale.x + b.grow * dt));
      if (b.spin) { b.m.rotation.x += b.spin * dt; b.m.rotation.y += b.spin * 0.7 * dt; }
      b.m.material.opacity = Math.min(1, b.life / b.max * 2);
    }
  }

  function clear() { while (bits.length) { const b = bits.pop(); scene.remove(b.m); b.m.material.dispose(); } }

  return { init, dust, poof, sparkle, confetti, update, clear };
})();
