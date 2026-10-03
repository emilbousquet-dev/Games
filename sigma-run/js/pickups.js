// ============================================================
//  SIGMA RUN — COINS & POWER-UPS
//    ⚡ SPEED    - run super fast and smash through FBI agents
//    🧲 MAGNET   - coins fly to you
//    🛡 SHIELD   - blocks one hit
//    🚀 ROCKETS  - 3 rockets to shoot the helicopter down!
//    👟 SUPER JUMP - jump higher, and jump again in the air
//    x2 DOUBLE   - every coin counts twice
//    ❤ HEART     - get a heart back
// ============================================================
window.SR = window.SR || {};

SR.Pickups = (function () {
  const U = SR.U;
  let scene, coinMesh, MAX = 2500;
  const dummy = new THREE.Object3D();
  const live = new Set();          // power-ups that exist right now
  const flying = [];               // coins being pulled by the magnet

  const TYPES = {
    speed: { color: 0xffd21a, name: 'SPEED BOOST', weight: 2.2 },
    magnet: { color: 0xff3a5a, name: 'COIN MAGNET', weight: 2 },
    shield: { color: 0x3af0ff, name: 'SHIELD', weight: 1.6 },
    rocket: { color: 0xff7a1a, name: 'ROCKET LAUNCHER', weight: 1.4 },
    jump: { color: 0x5aff6a, name: 'SUPER JUMP', weight: 1.2 },
    double: { color: 0xffffff, name: 'DOUBLE COINS', weight: 1 },
    heart: { color: 0xff3a6a, name: 'EXTRA HEART', weight: 0.7 },
  };
  const icons = {};

  function drawIcon(type) {
    return U.canvas(128, 128, (g) => {
      const col = '#' + new THREE.Color(TYPES[type].color).getHexString();
      g.fillStyle = 'rgba(10,10,20,0.85)'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill();
      g.strokeStyle = col; g.lineWidth = 7; g.stroke();
      g.fillStyle = col; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
      g.save(); g.translate(64, 64);
      switch (type) {
        case 'speed':
          g.beginPath(); g.moveTo(8, -40); g.lineTo(-22, 6); g.lineTo(-2, 6); g.lineTo(-10, 40); g.lineTo(22, -8); g.lineTo(2, -8); g.closePath(); g.fill(); break;
        case 'magnet':
          g.lineWidth = 16; g.beginPath(); g.arc(0, 0, 24, Math.PI, 0, true); g.stroke();
          g.beginPath(); g.moveTo(-24, 0); g.lineTo(-24, -22); g.moveTo(24, 0); g.lineTo(24, -22); g.stroke();
          g.fillStyle = '#fff'; g.fillRect(-32, -36, 16, 12); g.fillRect(16, -36, 16, 12); break;
        case 'shield':
          g.beginPath(); g.moveTo(0, -38); g.lineTo(30, -26); g.quadraticCurveTo(28, 18, 0, 40); g.quadraticCurveTo(-28, 18, -30, -26); g.closePath(); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(0, -28); g.lineTo(0, 28); g.quadraticCurveTo(-20, 12, -21, -19); g.closePath(); g.fill(); break;
        case 'rocket':
          g.rotate(-0.7);
          g.fillStyle = '#ddd'; g.beginPath(); g.moveTo(0, -40); g.quadraticCurveTo(14, -20, 12, 20); g.lineTo(-12, 20); g.quadraticCurveTo(-14, -20, 0, -40); g.fill();
          g.fillStyle = col; g.beginPath(); g.moveTo(-12, 8); g.lineTo(-24, 28); g.lineTo(-10, 22); g.fill(); g.beginPath(); g.moveTo(12, 8); g.lineTo(24, 28); g.lineTo(10, 22); g.fill();
          g.fillStyle = '#ffd21a'; g.beginPath(); g.moveTo(-8, 22); g.lineTo(0, 42); g.lineTo(8, 22); g.fill();
          g.fillStyle = '#3a7aff'; g.beginPath(); g.arc(0, -12, 6, 0, 7); g.fill(); break;
        case 'jump':
          g.lineWidth = 7;
          g.beginPath(); for (let i = 0; i < 5; i++) { g.lineTo(i % 2 ? 14 : -14, 30 - i * 9); } g.stroke();
          g.beginPath(); g.moveTo(-26, -14); g.lineTo(14, -14); g.quadraticCurveTo(30, -14, 30, -26); g.lineTo(-10, -26); g.lineTo(-26, -40); g.closePath(); g.fill();
          g.beginPath(); g.moveTo(-26, 34); g.lineTo(26, 34); g.stroke(); break;
        case 'heart':
          g.beginPath(); g.moveTo(0, 34); g.bezierCurveTo(-46, 4, -30, -40, 0, -16); g.bezierCurveTo(30, -40, 46, 4, 0, 34); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.arc(-14, -14, 7, 0, 7); g.fill(); break;
        case 'double':
          g.font = '900 58px Impact, Arial Black'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillStyle = '#ffd21a'; g.fillText('x2', 0, 4); break;
      }
      g.restore();
    });
  }

  function init(sc) {
    scene = sc;
    const T = SR.Tex.T;
    const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 28);
    geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ map: T.coin, metalness: 0.95, roughness: 0.22, emissive: 0xffaa00, emissiveIntensity: 0.55, emissiveMap: T.coin, envMapIntensity: 1.6 });
    coinMesh = new THREE.InstancedMesh(geo, mat, MAX);
    coinMesh.count = 0; coinMesh.frustumCulled = false; coinMesh.castShadow = SR.settings.gfx === 'ultra';
    scene.add(coinMesh);
    for (const k in TYPES) icons[k] = U.tex(drawIcon(k));
  }

  function addCoin(seg, x, y, z) { seg.coins.push({ x, y, z, taken: false }); }

  function pickType() {
    let sum = 0; for (const k in TYPES) sum += TYPES[k].weight;
    let r = Math.random() * sum;
    for (const k in TYPES) { r -= TYPES[k].weight; if (r <= 0) return k; }
    return 'speed';
  }

  function addPowerup(seg, type, x, y, z) {
    type = type || pickType();
    const T = SR.Tex.T, col = new THREE.Color(TYPES[type].color);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: icons[type], color: new THREE.Color(1.6, 1.6, 1.6) }));
    icon.scale.set(1.1, 1.1, 1);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: col.clone().multiplyScalar(0.9), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.set(2.6, 2.6, 1);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: col.clone().multiplyScalar(3) }));
    const ring2 = ring.clone(); ring2.scale.setScalar(0.8);
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 12), new THREE.MeshBasicMaterial({ map: T.beam, color: col.clone().multiplyScalar(0.55), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5, side: THREE.DoubleSide }));
    beam.position.y = 5.5;
    g.add(glow, icon, ring, ring2, beam);
    scene.add(g);
    const p = { type, x, y, z, g, ring, ring2, beam, taken: false, seg };
    seg.pickups.push(p);
    live.add(p);
    return p;
  }

  function removeSeg(seg) {
    for (const p of seg.pickups) { scene.remove(p.g); live.delete(p); p.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    for (let i = flying.length - 1; i >= 0; i--) if (flying[i].seg === seg) flying.splice(i, 1);
  }

  // player: { pos, magnet (true/false), radius }
  // returns nothing, calls onCoin / onPowerup
  let onCoin = () => {}, onPowerup = () => {};
  function update(dt, P, time, camera) {
    const segs = SR.Level.segs;
    const px = P.pos.x, py = P.pos.y + 0.9, pz = P.pos.z;
    const r2 = P.coinRadius * P.coinRadius;
    let n = 0;
    const spin = time * 3.2;
    for (const s of segs) {
      if (s.zEnd > pz + 15 || s.zStart < pz - 220) continue;
      for (const c of s.coins) {
        if (c.taken) continue;
        if (c.z > pz + 15 || c.z < pz - 220) continue;
        const dx = c.x - px, dy = c.y - py, dz = c.z - pz;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (P.magnet && d2 < 14 * 14) { c.taken = true; flying.push({ x: c.x, y: c.y, z: c.z, t: 0, seg: s }); continue; }
        if (d2 < r2) { c.taken = true; onCoin(c.x, c.y, c.z); continue; }
        if (n >= MAX) continue;
        dummy.position.set(c.x, c.y + Math.sin(time * 2 + c.z * 0.3) * 0.08, c.z);
        dummy.rotation.set(0, spin + c.z * 0.15, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        coinMesh.setMatrixAt(n++, dummy.matrix);
      }
    }
    // magnet coins zoom to you
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      f.t += dt;
      const k = 1 - Math.exp(-dt * (6 + f.t * 20));
      f.x += (px - f.x) * k; f.y += (py - f.y) * k; f.z += (pz - f.z) * k;
      if (f.t > 0.35 || Math.hypot(px - f.x, py - f.y, pz - f.z) < 0.8) { flying.splice(i, 1); onCoin(f.x, f.y, f.z); continue; }
      if (n < MAX) {
        dummy.position.set(f.x, f.y, f.z); dummy.rotation.set(0, spin * 3, 0); dummy.scale.setScalar(0.8); dummy.updateMatrix();
        coinMesh.setMatrixAt(n++, dummy.matrix);
      }
    }
    coinMesh.count = n;
    coinMesh.instanceMatrix.needsUpdate = true;

    // power-ups
    for (const p of live) {
      if (p.taken) continue;
      p.ring.rotation.set(time * 1.5, time * 2, 0);
      p.ring2.rotation.set(-time * 2, time, 0.5);
      p.g.position.y = p.y + Math.sin(time * 3 + p.z) * 0.15;
      p.beam.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
      const dx = p.x - px, dy = p.g.position.y - py, dz = p.z - pz;
      if (dx * dx + dy * dy + dz * dz < 2.0 * 2.0) {
        p.taken = true; p.g.visible = false; live.delete(p);
        onPowerup(p.type, p.x, p.y, p.z);
      }
    }
  }

  function reset() { flying.length = 0; live.clear(); if (coinMesh) coinMesh.count = 0; }

  return {
    init, addCoin, addPowerup, removeSeg, update, reset, TYPES, icons,
    set onCoin(f) { onCoin = f; }, set onPowerup(f) { onPowerup = f; },
  };
})();
