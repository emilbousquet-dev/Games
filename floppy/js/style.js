// ============================================================
//  FLOPPY PARTY — STYLE: face paint, victory dances and trails
//  Extra things to make your character yours. Buy them in the
//  shop with party coins, pick them in the lobby.
//    Face paint: drawn on the head.
//    Victory dance: your winner does it on the podium.
//    Trail: little sparkles (or hearts, bubbles...) behind you.
// ============================================================
window.FP = window.FP || {};

FP.Style = (function () {
  const FACES = ['none', 'blush', 'whiskers', 'stars', 'shades', 'tiger', 'clown', 'mask'];
  const FREE_FACES = ['none', 'blush'];
  const FACE_NAMES = { none: 'Nothing', blush: 'Blush', whiskers: 'Whiskers', stars: 'Stars', shades: 'Shades', tiger: 'Tiger', clown: 'Clown nose', mask: 'Hero mask' };

  // victory dances (they are emotes number 5 and up)
  const DANCES = ['none', 'disco', 'robot', 'flip', 'spin', 'floss', 'chicken', 'champ'];
  const FREE_DANCES = ['none', 'disco'];
  const DANCE_NAMES = { none: 'Surprise', disco: 'Disco', robot: 'Robot', flip: 'Backflip', spin: 'Spin', floss: 'Floss', chicken: 'Chicken', champ: 'Champion' };
  const DANCE_EMOTE = { disco: 5, robot: 6, flip: 7, spin: 8, floss: 9, chicken: 10, champ: 11 };

  const TRAILS = ['none', 'sparkles', 'hearts', 'bubbles', 'rainbow', 'fire', 'gold'];
  const FREE_TRAILS = ['none'];
  const TRAIL_NAMES = { none: 'Nothing', sparkles: 'Sparkles', hearts: 'Hearts', bubbles: 'Bubbles', rainbow: 'Rainbow', fire: 'Fire', gold: 'Gold stars' };
  // prizes from the World Tour (not in the shop)
  const TOUR_ONLY = ['mask', 'champ', 'gold'];

  // ---------------- face paint ----------------
  function onHead(r, x, y) { return Math.sqrt(Math.max(0.01, r * r - x * x - y * y)) * 0.99 + 0.005; }
  function flat(geo, color) { return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); }
  function starShape(big, small) {
    const s = new THREE.Shape();
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + Math.PI / 2, rr = k % 2 ? small : big; if (k) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    return new THREE.ShapeGeometry(s);
  }
  function applyFace(c, face) {
    if (!c || !face || face === 'none' || !c.face) return;
    const head = c.meshes.head, r = c.face.r;
    const put = (m, x, y, tilt = 0) => { const z = onHead(r, x, y); m.position.set(x, y, z); m.lookAt(x * 3, y * 3, z * 3); m.rotateZ(tilt); head.add(m); };
    if (face === 'blush') for (const s of [-1, 1]) { const m = flat(new THREE.CircleGeometry(r * 0.16, 16), 0xff8ab0); m.scale.y = 0.6; put(m, s * r * 0.5, -r * 0.22); }
    else if (face === 'whiskers') for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) { const m = flat(new THREE.PlaneGeometry(r * 0.4, r * 0.03), 0x2a2140); put(m, s * r * 0.55, -r * 0.2 + k * r * 0.09, s * k * 0.2); }
    else if (face === 'stars') [[-1, 0xffcf33], [1, 0xff7eb6]].forEach(([s, col]) => put(flat(starShape(r * 0.15, r * 0.065), col), s * r * 0.52, -r * 0.2));
    else if (face === 'shades') {
      // sunglasses sit in front of the big eyes (they stick out of the head)
      for (const side of [-1, 1]) {
        const lens = flat(new THREE.CircleGeometry(r * 0.37, 22), 0x1d1a2f); lens.scale.y = 0.95;
        lens.position.set(side * r * 0.36, r * 0.1, r * 1.13); lens.lookAt(side * r * 0.9, r * 0.12, r * 4); head.add(lens);
        const glint = flat(new THREE.CircleGeometry(r * 0.08, 10), 0x9aa0b8);
        glint.position.set(side * r * 0.36 - r * 0.12, r * 0.22, r * 1.15); glint.lookAt(side * r * 0.9 - r * 0.12, r * 0.24, r * 4); head.add(glint);
      }
      const bridge = flat(new THREE.PlaneGeometry(r * 0.2, r * 0.06), 0x1d1a2f); bridge.position.set(0, r * 0.2, r * 1.1); head.add(bridge);
    } else if (face === 'tiger') {
      for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const m = flat(new THREE.PlaneGeometry(r * 0.28, r * 0.06), k % 2 ? 0xff9a3c : 0x2a2140); put(m, s * (r * 0.62), -r * 0.05 - k * r * 0.12, s * 0.35); }
      for (let k = -1; k <= 1; k++) { const m = flat(new THREE.PlaneGeometry(r * 0.06, r * 0.22), 0x2a2140); put(m, k * r * 0.14, r * 0.62, k * 0.3); }
    } else if (face === 'mask') {
      // a superhero eye mask, in front of the big eyes, with holes to see through
      const shape = new THREE.Shape();
      shape.moveTo(-r * 0.85, r * 0.12); shape.quadraticCurveTo(-r * 0.78, r * 0.5, -r * 0.35, r * 0.46); shape.quadraticCurveTo(0, r * 0.38, r * 0.35, r * 0.46);
      shape.quadraticCurveTo(r * 0.78, r * 0.5, r * 0.85, r * 0.12); shape.quadraticCurveTo(r * 0.65, -r * 0.3, r * 0.3, -r * 0.22); shape.quadraticCurveTo(0, -r * 0.08, -r * 0.3, -r * 0.22);
      shape.quadraticCurveTo(-r * 0.65, -r * 0.3, -r * 0.85, r * 0.12);
      for (const side of [-1, 1]) { const hole = new THREE.Path(); hole.absellipse(side * r * 0.36, r * 0.1, r * 0.24, r * 0.3, 0, Math.PI * 2, true); shape.holes.push(hole); }
      const m = flat(new THREE.ShapeGeometry(shape, 14), 0x2a2140);
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / r; pos.setZ(i, -x * x * r * 0.9); } // bend it around the head
      pos.needsUpdate = true;
      m.position.set(0, 0, r * 1.13);
      head.add(m);
    } else if (face === 'clown') {
      const nose = FP.Look.mesh(new THREE.SphereGeometry(r * 0.16, 14, 10), FP.Look.toon(0xff3a4a), 0.01);
      nose.position.set(0, -r * 0.08, onHead(r, 0, -r * 0.08) + r * 0.05); head.add(nose);
      for (const s of [-1, 1]) { const m = flat(new THREE.CircleGeometry(r * 0.15, 16), 0xff7eb6); put(m, s * r * 0.52, -r * 0.25); }
    }
  }

  // ---------------- trails ----------------
  let trailT = 0, hue = 0;
  function update(dt, chars) {
    trailT += dt; hue = (hue + dt * 0.5) % 1;
    if (trailT < 0.07) return;
    trailT = 0;
    for (const c of chars) {
      const tr = c.player && c.player.trail;
      if (!tr || tr === 'none' || c.alive === false) continue;
      const t = c.parts.torso.position, v = c.parts.torso.velocity;
      if (Math.hypot(v.x, v.z) < 1.5 || t.y < -2) continue;
      const pos = new THREE.Vector3(t.x - v.x * 0.05, t.y - 0.5, t.z - v.z * 0.05);
      if (tr === 'sparkles') FP.FX.stars(pos, 1);
      else if (tr === 'hearts') FP.FX.puffs(pos, 1, 0xff5a9a, 0.5, 0.7);
      else if (tr === 'bubbles') FP.FX.puffs(pos, 1, 0xbfe6ff, 0.4, 0.8);
      else if (tr === 'rainbow') FP.FX.puffs(pos, 1, new THREE.Color().setHSL(hue, 0.9, 0.6).getHex(), 0.3, 0.9);
      else if (tr === 'gold') FP.FX.puffs(pos, 1, Math.random() < 0.5 ? 0xffcf33 : 0xffe680, 0.5, 0.6);
      else if (tr === 'fire') FP.FX.puffs(pos, 1, Math.random() < 0.5 ? 0xff5a1a : 0xffcf33, 0.8, 0.8);
    }
  }

  return { FACES, FREE_FACES, FACE_NAMES, DANCES, FREE_DANCES, DANCE_NAMES, DANCE_EMOTE, TRAILS, FREE_TRAILS, TRAIL_NAMES, TOUR_ONLY, applyFace, update };
})();
