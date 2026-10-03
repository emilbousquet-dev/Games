// ============================================================
//  FLOPPY PARTY — JUICE! (POW! pop-ups, stars, dust, confetti)
// ============================================================
window.FP = window.FP || {};

FP.FX = (function () {
  const scene = FP.Stage.scene;
  const bits = [];
  const puffGeo = new THREE.SphereGeometry(0.14, 8, 6);
  const starGeo = new THREE.OctahedronGeometry(0.12);
  const confGeo = new THREE.PlaneGeometry(0.16, 0.09);
  const COLORS = [0xff5a5f, 0xffcf33, 0x6fd35a, 0x4aa8ff, 0x9b6bff, 0xff8fc8];

  // positions can come from the physics (cannon) or from three.js: make them three.js
  const v3 = (p) => new THREE.Vector3(p.x, p.y, p.z);

  function add(mesh, vel, life, o = {}) {
    mesh.position.copy(v3(o.pos));
    scene.add(mesh);
    bits.push({ mesh, vel, life, max: life, grow: o.grow || 0, gravity: o.gravity || 0, spin: o.spin || 0, drag: o.drag || 0, fade: o.fade !== false, pop: o.pop });
  }

  function puffs(pos, count, color = 0xffffff, speed = 2, size = 1) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * speed, Math.random() * speed * 0.6, Math.sin(a) * speed);
      const m = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color, transparent: true }));
      m.scale.setScalar(size);
      add(m, v, 0.5, { pos, grow: 2.5 * size, drag: 4 });
    }
  }

  function stars(pos, count = 6) {
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.3, Math.random() - 0.5).multiplyScalar(6);
      add(new THREE.Mesh(starGeo, new THREE.MeshBasicMaterial({ color: 0xffe14a, transparent: true })), v, 0.6, { pos, gravity: 14, spin: 12, drag: 1 });
    }
  }

  function confetti(center, count = 180, spread = 10) {
    center = v3(center);
    for (let i = 0; i < count; i++) {
      const p = center.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, 5 + Math.random() * 5, (Math.random() - 0.5) * spread * 0.7));
      const v = new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3);
      const m = new THREE.Mesh(confGeo, new THREE.MeshBasicMaterial({ color: COLORS[i % COLORS.length], transparent: true, side: THREE.DoubleSide }));
      add(m, v, 3.5 + Math.random() * 2, { pos: p, gravity: 2.5, spin: 8 + Math.random() * 8, drag: 1.1 });
    }
  }

  // comic-book words that pop up: POW! BAM! BONK!
  const wordCache = {};
  function wordTexture(text, color) {
    const key = text + color;
    if (wordCache[key]) return wordCache[key];
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 128;
    const g = cv.getContext('2d');
    // spiky burst behind the word
    g.translate(128, 64);
    g.beginPath();
    for (let i = 0; i < 24; i++) {
      const r = i % 2 ? 44 : 62, a = (i / 24) * Math.PI * 2;
      g.lineTo(Math.cos(a) * r * 1.8, Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = '#fff'; g.fill();
    g.lineWidth = 6; g.strokeStyle = '#1d1a2f'; g.stroke();
    g.font = '900 52px "Baloo 2", "Arial Black", Impact, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = '#1d1a2f'; g.strokeText(text, 0, 4);
    g.fillStyle = color; g.fillText(text, 0, 4);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    wordCache[key] = t;
    return t;
  }

  function word(pos, text, color = '#ff5a5f', size = 1.6) {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: wordTexture(text, color), transparent: true, depthTest: false }));
    sprite.renderOrder = 20;
    sprite.scale.set(size * 2, size, 1);
    add(sprite, new THREE.Vector3(0, 1.5, 0), 0.8, { pos: v3(pos).add(new THREE.Vector3(0, 0.8, 0)), drag: 3, pop: size });
  }

  const HIT_WORDS = [['POW!', '#ff5a5f'], ['BAM!', '#ffcf33'], ['BONK!', '#4aa8ff'], ['WHAM!', '#9b6bff'], ['BOP!', '#ff8fc8']];

  function update(dt) {
    for (let i = bits.length - 1; i >= 0; i--) {
      const b = bits[i];
      b.life -= dt;
      if (b.life <= 0) { scene.remove(b.mesh); b.mesh.material.dispose(); bits.splice(i, 1); continue; }
      b.vel.y -= b.gravity * dt;
      b.vel.multiplyScalar(Math.max(0, 1 - b.drag * dt));
      b.mesh.position.addScaledVector(b.vel, dt);
      if (b.grow) b.mesh.scale.setScalar(Math.max(0.05, b.mesh.scale.x + b.grow * dt));
      if (b.spin) { b.mesh.rotation.x += b.spin * dt; b.mesh.rotation.y += b.spin * 0.7 * dt; }
      if (b.pop) {
        const age = b.max - b.life, k = age < 0.12 ? age / 0.12 * 1.3 : 1.3 - Math.min(0.3, (age - 0.12) * 2);
        b.mesh.scale.set(b.pop * 2 * k, b.pop * k, 1);
      }
      if (b.fade) b.mesh.material.opacity = Math.min(1, b.life / b.max * 2.5);
    }
  }

  function clear() { while (bits.length) { const b = bits.pop(); scene.remove(b.mesh); b.mesh.material.dispose(); } }

  // react to things happening in the game
  const bus = FP.bus;
  bus.on('punchHit', (e) => {
    const [w, c] = HIT_WORDS[Math.floor(Math.random() * HIT_WORDS.length)];
    word(e.pos, w, c, 1.3);
    stars(e.pos, 5);
    FP.Camera.shake(0.35);
  });
  bus.on('knockOut', (c) => { stars(c.parts.head.position, 10); word(c.parts.head.position, 'KO!', '#ffcf33', 1.8); FP.Camera.shake(0.6); });
  bus.on('bump', (e) => { puffs(e.pos, 8, 0xffffff, 3); word(e.pos, 'BONK!', '#4aa8ff', 1.4); FP.Camera.shake(0.5); });
  bus.on('jump', (c) => { const p = v3(c.parts.torso.position); p.y -= 0.9; puffs(p, 5, 0xf2ead8, 1.8, 0.8); });
  bus.on('throw', (e) => { word(e.by.parts.torso.position, 'YEET!', '#6fd35a', 1.4); });
  bus.on('breakFree', (c) => { puffs(c.parts.torso.position, 8, 0xffffff, 3); });
  bus.on('land', (e) => { const p = v3(e.c.parts.torso.position); p.y -= 0.95; puffs(p, e.hard ? 9 : 5, 0xf2ead8, e.hard ? 2.6 : 1.6, e.hard ? 1 : 0.7); if (e.hard) FP.Camera.shake(0.12); });

  return { puffs, stars, confetti, word, update, clear };
})();
