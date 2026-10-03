// ============================================================
//  SIGMA HOVER GP — 3D MODEL HELPERS
//  Little tools to build smooth toy-like shapes, plus the
//  "IK" math that puts hands on handlebars and feet on pedals.
// ============================================================
window.HG = window.HG || {};

HG.M = (function () {
  const U = HG.U;
  const geoCache = {};
  const hi = () => HG.settings.gfx !== 'low';

  // ---------- materials ----------
  // every racer gets its own materials (so a ghost racer can turn see-through alone)
  function mat(color, o = {}) {
    const m = new THREE.MeshStandardMaterial({
      color, roughness: o.rough !== undefined ? o.rough : 0.55, metalness: o.metal || 0,
      emissive: o.glow ? new THREE.Color(o.glowColor || color) : 0x000000, emissiveIntensity: o.glow || 0,
      transparent: !!o.opacity, opacity: o.opacity || 1, side: o.double ? THREE.DoubleSide : THREE.FrontSide,
      flatShading: !!o.flat,
    });
    if (o.map) m.map = o.map;
    if (o.toneMapped === false) m.toneMapped = false;
    return m;
  }
  // shiny car paint
  function paint(color, o = {}) {
    if (hi() && !o.plain) {
      return new THREE.MeshPhysicalMaterial({ color, roughness: o.rough !== undefined ? o.rough : 0.32, metalness: o.metal !== undefined ? o.metal : 0.35, clearcoat: 1, clearcoatRoughness: 0.08 });
    }
    return mat(color, { rough: 0.35, metal: 0.4 });
  }
  function glowMat(color, intensity = 1.5) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false }); }

  // ---------- shapes (cached, shared) ----------
  function cached(key, make) { return geoCache[key] || (geoCache[key] = make()); }
  const seg = () => (hi() ? 1 : 0.6);
  function sphere(r = 1, ws, hs) { ws = ws || Math.round(24 * seg()); hs = hs || Math.round(16 * seg()); return cached('s' + r + ws + hs, () => new THREE.SphereGeometry(r, ws, hs)); }
  function cyl(rt, rb, h, n) { n = n || Math.round(18 * seg()); return cached('c' + rt + rb + h + n, () => new THREE.CylinderGeometry(rt, rb, h, n)); }
  function cone(r, h, n) { n = n || 16; return cached('co' + r + h + n, () => new THREE.ConeGeometry(r, h, n)); }
  function capsule(r, len) { return cached('cap' + r + len, () => new THREE.CapsuleGeometry(r, len, Math.round(6 * seg()) + 2, Math.round(14 * seg()) + 2)); }
  function torus(r, t, arc = Math.PI * 2, rs = 10, ts = 24) { return cached('t' + r + t + arc + rs + ts, () => new THREE.TorusGeometry(r, t, rs, ts, arc)); }
  function box(w, h, d) { return cached('b' + w + h + d, () => new THREE.BoxGeometry(w, h, d)); }
  // a box with round edges (looks like a toy)
  function rbox(w, h, d, r) {
    return cached('rb' + w + h + d + r, () => {
      const s = hi() ? 5 : 3;
      const g = new THREE.BoxGeometry(w, h, d, s, s, s);
      const p = g.attributes.position, v = new THREE.Vector3(), inner = new THREE.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
      for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const c = new THREE.Vector3(U.clamp(v.x, -inner.x, inner.x), U.clamp(v.y, -inner.y, inner.y), U.clamp(v.z, -inner.z, inner.z));
        const dlt = v.clone().sub(c);
        if (dlt.lengthSq() > 1e-9) dlt.setLength(r);
        p.setXYZ(i, c.x + dlt.x, c.y + dlt.y, c.z + dlt.z);
      }
      g.computeVertexNormals();
      return g;
    });
  }
  // a smooth shape spun around (like a vase); pts = [[radius, y], ...]
  function lathe(key, pts, n = 28) {
    return cached('l' + key, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), Math.round(n * seg()) + 4));
  }
  // a flat outline pulled out into 3D with round edges; pts = [[x, y], ...]
  function extrude(key, pts, depth, bevel = 0.05) {
    return cached('e' + key, () => {
      const sh = new THREE.Shape();
      pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
      sh.closePath();
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: hi() ? 3 : 1, curveSegments: 12 });
      g.translate(0, 0, -depth / 2);
      g.computeVertexNormals();
      return g;
    });
  }
  function smoothShape(key, pts, depth, bevel) {
    // like extrude, but the outline is a smooth curve through the points
    return cached('ss' + key, () => {
      const curve = new THREE.CatmullRomCurve3(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)), true, 'centripetal');
      const p2 = curve.getPoints(48).map((v) => new THREE.Vector2(v.x, v.y));
      const sh = new THREE.Shape(p2);
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: hi() ? 4 : 2, curveSegments: 24 });
      g.translate(0, 0, -depth / 2);
      g.computeVertexNormals();
      return g;
    });
  }

  // make a mesh and put it somewhere
  function mesh(geo, material, x = 0, y = 0, z = 0, parent, o = {}) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    if (o.s !== undefined) { if (Array.isArray(o.s)) m.scale.set(o.s[0], o.s[1], o.s[2]); else m.scale.setScalar(o.s); }
    if (o.r) m.rotation.set(o.r[0] || 0, o.r[1] || 0, o.r[2] || 0);
    m.castShadow = o.shadow !== false;
    m.receiveShadow = !!o.receive;
    if (parent) parent.add(m);
    return m;
  }
  function group(parent, x = 0, y = 0, z = 0) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    if (parent) parent.add(g);
    return g;
  }

  // ---------- IK: bend an arm or leg so its end reaches a target ----------
  const _inv = new THREE.Matrix4(), _t = new THREE.Vector3(), _d = new THREE.Vector3(), _pole = new THREE.Vector3(), _ax = new THREE.Vector3(),
    _ud = new THREE.Vector3(), _el = new THREE.Vector3(), _fd = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3();
  function basisQuat(dirDown, axis, out) {
    // y axis points away from the limb direction, x is the bend axis
    _y.copy(dirDown).negate();
    _x.copy(axis).addScaledVector(_y, -axis.dot(_y)).normalize();
    _z.crossVectors(_x, _y).normalize();
    _m.makeBasis(_x, _y, _z);
    return out.setFromRotationMatrix(_m);
  }
  // upper & lower: groups (lower is a child of upper at (0,-L1,0)). target/poleDir are in WORLD space.
  function ik(upper, lower, target, L1, L2, poleDir) {
    const parent = upper.parent;
    parent.updateWorldMatrix(true, false);
    _inv.copy(parent.matrixWorld).invert();
    _t.copy(target).applyMatrix4(_inv);
    _pole.copy(poleDir).transformDirection(_inv);
    // the parent may be scaled: measure lengths in parent space
    const sc = upper.scale.y || 1;
    const l1 = L1 * sc, l2 = L2 * sc;
    _d.subVectors(_t, upper.position);
    let D = _d.length();
    if (D < 1e-5) return;
    _d.divideScalar(D);
    D = U.clamp(D, Math.abs(l1 - l2) + 0.001, l1 + l2 - 0.001);
    _ax.crossVectors(_d, _pole);
    if (_ax.lengthSq() < 1e-8) _ax.set(1, 0, 0); else _ax.normalize();
    const a = Math.acos(U.clamp((l1 * l1 + D * D - l2 * l2) / (2 * l1 * D), -1, 1));
    _ud.copy(_d).applyAxisAngle(_ax, a);
    _el.copy(upper.position).addScaledVector(_ud, l1);
    _fd.copy(_d).multiplyScalar(D).add(upper.position).sub(_el).normalize();
    basisQuat(_ud, _ax, upper.quaternion);
    basisQuat(_fd, _ax, _q);
    lower.quaternion.copy(upper.quaternion).invert().multiply(_q);
  }

  // ---------- canvas faces (mouths) ----------
  const mouthTex = {};
  function mouth(kind) {
    if (mouthTex[kind]) return mouthTex[kind];
    const c = U.canvas(128, 64, (g, w, h) => {
      g.lineCap = 'round'; g.lineJoin = 'round';
      const dark = '#3a0a10', red = '#c8283a', tongue = '#ff6a7a', teeth = '#ffffff';
      g.strokeStyle = dark; g.fillStyle = dark; g.lineWidth = 6;
      const cx = w / 2, cy = h / 2;
      if (kind === 'smile') { g.beginPath(); g.arc(cx, cy - 14, 22, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke(); }
      else if (kind === 'grin') {
        g.beginPath(); g.moveTo(cx - 30, cy - 8); g.quadraticCurveTo(cx, cy + 34, cx + 30, cy - 8); g.closePath(); g.fill();
        g.fillStyle = teeth; g.beginPath(); g.moveTo(cx - 26, cy - 6); g.lineTo(cx + 26, cy - 6); g.lineTo(cx + 22, cy + 2); g.lineTo(cx - 22, cy + 2); g.fill();
        g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + 12, 12, 6, 0, 0, 7); g.fill();
      } else if (kind === 'open') {
        g.beginPath(); g.ellipse(cx, cy + 2, 16, 20, 0, 0, 7); g.fill();
        g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + 12, 10, 7, 0, 0, 7); g.fill();
      } else if (kind === 'o') { g.beginPath(); g.ellipse(cx, cy, 10, 13, 0, 0, 7); g.fill(); }
      else if (kind === 'frown') { g.beginPath(); g.arc(cx, cy + 22, 20, 1.2 * Math.PI, 1.8 * Math.PI); g.stroke(); }
      else if (kind === 'grit') {
        g.fillStyle = teeth; g.strokeStyle = dark; g.lineWidth = 4;
        U.rrect(g, cx - 24, cy - 9, 48, 18, 6); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(cx - 24, cy); g.lineTo(cx + 24, cy); g.stroke();
        for (let x = -12; x <= 12; x += 12) { g.beginPath(); g.moveTo(cx + x, cy - 9); g.lineTo(cx + x, cy + 9); g.stroke(); }
      } else if (kind === 'tongue') {
        // blowing a raspberry!
        g.beginPath(); g.moveTo(cx - 22, cy - 6); g.lineTo(cx + 22, cy - 6); g.stroke();
        g.fillStyle = tongue; g.strokeStyle = '#c03a4a'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(cx - 12, cy - 6); g.lineTo(cx - 12, cy + 12); g.arc(cx, cy + 12, 12, Math.PI, 0, true); g.lineTo(cx + 12, cy - 6); g.closePath(); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(cx, cy - 2); g.lineTo(cx, cy + 14); g.stroke();
      } else if (kind === 'cry') {
        g.beginPath(); g.moveTo(cx - 28, cy + 14); g.quadraticCurveTo(cx, cy - 34, cx + 28, cy + 14); g.closePath(); g.fill();
        g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + 8, 12, 5, 0, 0, 7); g.fill();
      } else if (kind === 'cat') {
        g.lineWidth = 5; g.beginPath(); g.moveTo(cx - 20, cy - 4); g.quadraticCurveTo(cx - 10, cy + 10, cx, cy - 4); g.quadraticCurveTo(cx + 10, cy + 10, cx + 20, cy - 4); g.stroke();
      } else if (kind === 'catopen') {
        g.beginPath(); g.moveTo(cx - 20, cy - 6); g.quadraticCurveTo(cx, cy + 30, cx + 20, cy - 6); g.quadraticCurveTo(cx, cy, cx - 20, cy - 6); g.fill();
        g.fillStyle = tongue; g.beginPath(); g.ellipse(cx, cy + 8, 8, 5, 0, 0, 7); g.fill();
        g.fillStyle = teeth; g.beginPath(); g.moveTo(cx - 16, cy - 4); g.lineTo(cx - 12, cy + 4); g.lineTo(cx - 8, cy - 2); g.fill(); g.beginPath(); g.moveTo(cx + 16, cy - 4); g.lineTo(cx + 12, cy + 4); g.lineTo(cx + 8, cy - 2); g.fill();
      } else if (kind === 'shark') {
        g.beginPath(); g.moveTo(cx - 44, cy - 10); g.quadraticCurveTo(cx, cy + 30, cx + 44, cy - 10); g.quadraticCurveTo(cx, cy + 4, cx - 44, cy - 10); g.fill();
        g.fillStyle = teeth; for (let x = -36; x <= 32; x += 10) { g.beginPath(); g.moveTo(cx + x, cy - 6 + Math.abs(x) * 0.1); g.lineTo(cx + x + 5, cy + 4); g.lineTo(cx + x + 10, cy - 5 + Math.abs(x) * 0.1); g.fill(); }
      } else if (kind === 'teeth') {
        g.fillStyle = '#e8e0cc'; g.strokeStyle = '#2a2420'; g.lineWidth = 3;
        U.rrect(g, cx - 30, cy - 10, 60, 20, 5); g.fill(); g.stroke();
        for (let x = -20; x <= 20; x += 10) { g.beginPath(); g.moveTo(cx + x, cy - 10); g.lineTo(cx + x, cy + 10); g.stroke(); }
        g.beginPath(); g.moveTo(cx - 30, cy); g.lineTo(cx + 30, cy); g.stroke();
      }
    });
    const t = U.tex(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    mouthTex[kind] = t;
    return t;
  }

  return { mat, paint, glowMat, sphere, cyl, cone, capsule, torus, box, rbox, lathe, extrude, smoothShape, mesh, group, ik, mouth, cached };
})();
