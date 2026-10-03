// ============================================================
//  SIGMA HOVER GP — BUILDS THE 3D ROAD
//  Road, curbs, offroad sides, walls, the thick road slab,
//  pillars, ramps, boost pads, tunnels and the start line.
// ============================================================
window.HG = window.HG || {};

HG.TrackMesh = (function () {
  const U = HG.U;
  const mats = {};

  function mat(key, make) { return mats[key] || (mats[key] = make()); }

  // a long strip that follows the track. edge(i) returns [a, b] = two points across the track at sample i
  // segments are broken where skip(i) is true
  function strip(track, edge, skip, uvU, tileV, material, closeLoop = true, alongU = false) {
    const pos = [], uv = [], idx = [];
    const N = track.n;
    let prevOk = false, vi = 0;
    for (let k = 0; k <= N; k++) {
      const i = k % N;
      if (k === N && !closeLoop) break;
      if (skip(i)) { prevOk = false; continue; }
      const [a, b] = edge(i);
      const v = (k * track.ds) / tileV;
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      if (alongU) uv.push(v, uvU[1], v, uvU[0]); else uv.push(uvU[0], v, uvU[1], v);
      if (prevOk) idx.push(vi - 2, vi - 1, vi, vi - 1, vi + 1, vi);
      vi += 2; prevOk = true;
    }
    if (!idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, material);
    m.receiveShadow = true;
    return m;
  }

  const tmp = () => new THREE.Vector3();
  function at(track, i, d, h) {
    const p = track.P[i];
    return new THREE.Vector3().copy(p).addScaledVector(track.R[i], d).addScaledVector(track.N[i], h);
  }

  function build(track, theme) {
    const group = new THREE.Group();
    const F = track.F;
    const N = track.n;
    const isGap = (i) => !!(track.flags[i] & F.GAP);
    const openL = (i) => !!(track.flags[i] & F.FALL_L);
    const openR = (i) => !!(track.flags[i] & F.FALL_R);
    const hw = (i) => track.W[i] / 2;
    const offL = (i) => (openL(i) ? 0 : track.offL[i]);
    const offR = (i) => (openR(i) ? 0 : track.offR[i]);

    // ---------- road surface ----------
    const roadMat = new THREE.MeshStandardMaterial({ map: HG.Tex.road(theme.road), roughness: theme.roadRough !== undefined ? theme.roadRough : 0.75, metalness: theme.roadMetal || 0.05, color: theme.roadTint || 0xffffff });
    if (theme.roadGlow) { roadMat.emissive = new THREE.Color(0xffffff); roadMat.emissiveMap = roadMat.map; roadMat.emissiveIntensity = theme.roadGlow; }
    const road = strip(track, (i) => [at(track, i, -hw(i), 0), at(track, i, hw(i), 0)], isGap, [0, 1], 24, roadMat);
    if (road) group.add(road);
    // water and ice look different on top
    const special = (flag, material) => {
      const m = strip(track, (i) => [at(track, i, -hw(i), 0.02), at(track, i, hw(i), 0.02)], (i) => isGap(i) || !(track.flags[i] & flag), [0, 1], 24, material);
      if (m) group.add(m);
    };
    special(F.WATER, mat('water', () => new THREE.MeshStandardMaterial({ color: 0x2ab0ff, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.3 })));
    special(F.ICE, mat('ice', () => new THREE.MeshStandardMaterial({ map: HG.Tex.road('ice'), transparent: true, opacity: 0.85, roughness: 0.1, metalness: 0.2 })));
    special(F.DIRT, mat('dirt', () => new THREE.MeshStandardMaterial({ map: HG.Tex.road('dirt'), roughness: 0.95 })));

    // ---------- offroad sides ----------
    const offTex = HG.Tex.ground(theme.shoulder || theme.ground);
    const offMat = new THREE.MeshStandardMaterial({ map: offTex, roughness: 0.95, color: theme.shoulderTint || 0xffffff });
    const sideL = strip(track, (i) => [at(track, i, -hw(i) - offL(i), 0), at(track, i, -hw(i), 0)], (i) => isGap(i) || offL(i) < 0.05, [0, 1], 10, offMat);
    const sideR = strip(track, (i) => [at(track, i, hw(i), 0), at(track, i, hw(i) + offR(i), 0)], (i) => isGap(i) || offR(i) < 0.05, [0, 1], 10, offMat);
    if (sideL) group.add(sideL); if (sideR) group.add(sideR);

    // ---------- curbs ----------
    const curbMat = new THREE.MeshStandardMaterial({ map: HG.Tex.curb(theme.curb[0], theme.curb[1]), roughness: 0.6 });
    curbMat.map.repeat.set(1, 1);
    const cw = 1.3;
    const cL = strip(track, (i) => [at(track, i, -hw(i) - cw * 0.3, 0.04), at(track, i, -hw(i) + cw * 0.7, 0.04)], isGap, [0, 1], 4, curbMat);
    const cR = strip(track, (i) => [at(track, i, hw(i) - cw * 0.7, 0.04), at(track, i, hw(i) + cw * 0.3, 0.04)], isGap, [0, 1], 4, curbMat);
    if (cL) group.add(cL); if (cR) group.add(cR);

    // ---------- glowing edges on anti-gravity parts and open edges ----------
    const glowMat = mat('edgeglow-' + theme.edgeGlow, () => new THREE.MeshBasicMaterial({ color: theme.edgeGlow || 0x3ad8ff, toneMapped: false }));
    const glowSkip = (side) => (i) => isGap(i) || !((track.flags[i] & F.ANTI) || (side < 0 ? openL(i) : openR(i)));
    for (const side of [-1, 1]) {
      const m = strip(track, (i) => { const e = hw(i) + (side < 0 ? offL(i) : offR(i)); return [at(track, i, side * e - side * 0.25, 0.08), at(track, i, side * e + side * 0.15, 0.08)]; }, glowSkip(side), [0, 1], 4, glowMat);
      if (m) group.add(m);
    }

    // ---------- walls ----------
    const wallH = theme.wallH || 1.4;
    const wallMat = new THREE.MeshStandardMaterial({ map: HG.Tex.wall(theme.wall), roughness: 0.6, side: THREE.DoubleSide, transparent: theme.wall === 'glass', color: theme.wallTint || 0xffffff });
    if (theme.wall === 'neon' || theme.wall === 'rainbow') { wallMat.emissive = new THREE.Color(0xffffff); wallMat.emissiveMap = wallMat.map; wallMat.emissiveIntensity = 0.9; }
    for (const side of [-1, 1]) {
      const skip = (i) => isGap(i) || (side < 0 ? openL(i) : openR(i));
      const e = (i) => side * (hw(i) + (side < 0 ? offL(i) : offR(i)));
      const w = strip(track, (i) => [at(track, i, e(i), wallH), at(track, i, e(i), -0.2)], skip, [0, 1], 8, wallMat, true, true);
      if (w) { w.castShadow = true; group.add(w); }
      // top cap
      const capMat = mat('cap' + theme.wallCap, () => new THREE.MeshStandardMaterial({ color: theme.wallCap || 0xdddddd, roughness: 0.5 }));
      const c = strip(track, (i) => [at(track, i, e(i) - side * 0.0, wallH), at(track, i, e(i) + side * 0.5, wallH)], skip, [0, 1], 8, capMat);
      if (c) group.add(c);
    }

    // ---------- the road slab (sides + bottom) ----------
    const slabMat = mat('slab' + theme.slab, () => new THREE.MeshStandardMaterial({ color: theme.slab || 0x55575e, roughness: 0.85, side: THREE.DoubleSide }));
    const thick = 1.6;
    const outer = (i, side) => side * (hw(i) + (side < 0 ? offL(i) : offR(i)) + (side < 0 ? (openL(i) ? 0 : 0.5) : (openR(i) ? 0 : 0.5)));
    for (const side of [-1, 1]) {
      const m = strip(track, (i) => [at(track, i, outer(i, side), 0), at(track, i, outer(i, side), -thick)], isGap, [0, 1], 8, slabMat);
      if (m) group.add(m);
    }
    const bottom = strip(track, (i) => [at(track, i, outer(i, 1), -thick), at(track, i, outer(i, -1), -thick)], isGap, [0, 1], 8, slabMat);
    if (bottom) group.add(bottom);
    // close the ends of the slab next to gaps
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      if (isGap(i) !== isGap(j)) {
        const k = isGap(i) ? j : i;
        const a = at(track, k, outer(k, -1), 0), b = at(track, k, outer(k, 1), 0), c = at(track, k, outer(k, 1), -thick), d = at(track, k, outer(k, -1), -thick);
        const g = new THREE.BufferGeometry().setFromPoints([a, b, c, a, c, d]);
        g.computeVertexNormals();
        group.add(new THREE.Mesh(g, slabMat));
      }
    }

    // ---------- pillars under high road ----------
    const groundY = theme.groundY !== undefined ? track.minY + theme.groundY : track.minY - 1;
    const pilMat = mat('pillar' + theme.pillar, () => new THREE.MeshStandardMaterial({ color: theme.pillar || 0x8a8c92, roughness: 0.7 }));
    const merger = new HG.Merger();
    const cyl = new THREE.CylinderGeometry(1.2, 1.5, 1, 10);
    for (let i = 0; i < N; i += 14) {
      if (isGap(i) || track.N[i].y < 0.85) continue;
      const p = track.P[i];
      const hgt = p.y - thick - groundY;
      if (hgt < 2.5 || theme.noPillars) continue;
      const m = new THREE.Matrix4().compose(new THREE.Vector3(p.x, groundY + hgt / 2, p.z), new THREE.Quaternion(), new THREE.Vector3(1, hgt, 1));
      merger.add(pilMat, cyl, m);
    }
    group.add(merger.build(true, true));

    // ---------- ramps ----------
    for (const r of track.ramps) group.add(rampMesh(track, r));

    // ---------- boost pads ----------
    const boostMat = mat('boostpad', () => {
      const t = HG.Tex.boost();
      return new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -2 });
    });
    for (const b of track.boosts) group.add(padMesh(track, b, boostMat));

    // ---------- start line ----------
    group.add(startLine(track, theme));

    // ---------- tunnels ----------
    group.add(tunnels(track, theme));

    group.traverse((o) => { if (o.isMesh) o.matrixAutoUpdate = false; });
    group.updateMatrixWorld(true);
    return group;
  }

  // a flat rectangle lying on the road
  function onRoad(track, s0, s1, d0, d1, h, material, steps) {
    steps = steps || Math.max(2, Math.ceil((s1 - s0) / 2));
    const pos = [], uv = [], idx = [];
    const fr = HG.Track.makeFrame();
    for (let k = 0; k <= steps; k++) {
      const s = s0 + (s1 - s0) * k / steps;
      track.frame(s, fr);
      const hh = typeof h === 'function' ? h(k / steps) : h;
      const a = fr.p.clone().addScaledVector(fr.r, d0).addScaledVector(fr.n, hh);
      const b = fr.p.clone().addScaledVector(fr.r, d1).addScaledVector(fr.n, hh);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
      uv.push(0, k / steps, 1, k / steps);
      if (k > 0) { const v = k * 2; idx.push(v - 2, v - 1, v, v - 1, v + 1, v); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, material);
    m.receiveShadow = true;
    return m;
  }

  function padMesh(track, b, material) {
    const fr = track.frame(b.s, HG.Track.makeFrame());
    const hwid = fr.w / 2;
    const c = b.lane * hwid, half = b.wide ? hwid * 0.55 : hwid * 0.32;
    return onRoad(track, b.s, b.s + b.len, c - half, c + half, 0.07, material, 4);
  }

  function rampMesh(track, r) {
    const g = new THREE.Group();
    const fr = track.frame(r.s1, HG.Track.makeFrame());
    const hwid = fr.w / 2 + 0.2;
    const material = mat(r.glide ? 'glideramp' : 'ramp', () => {
      const t = r.glide ? HG.Tex.glideRamp() : HG.Tex.ramp();
      return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.45, roughness: 0.4 });
    });
    const len = r.s1 - r.s0;
    g.add(onRoad(track, r.s0, r.s1, -hwid, hwid, (t) => r.height * t + 0.03, material, 6));
    // the front face of the ramp
    const sideMat = mat('rampside', () => new THREE.MeshStandardMaterial({ color: 0x1a3a7a, roughness: 0.6, side: THREE.DoubleSide }));
    const a = track.point(r.s1, -hwid, 0, new THREE.Vector3()), b = track.point(r.s1, hwid, 0, new THREE.Vector3());
    const c = track.point(r.s1, hwid, r.height, new THREE.Vector3()), d = track.point(r.s1, -hwid, r.height, new THREE.Vector3());
    const geo = new THREE.BufferGeometry().setFromPoints([a, b, c, a, c, d]);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, sideMat));
    // side triangles
    for (const side of [-1, 1]) {
      const pts = [];
      const steps = 4;
      for (let k = 0; k < steps; k++) {
        const s0 = r.s0 + len * k / steps, s1 = r.s0 + len * (k + 1) / steps;
        const p0 = track.point(s0, side * hwid, 0, new THREE.Vector3()), p1 = track.point(s1, side * hwid, 0, new THREE.Vector3());
        const q0 = track.point(s0, side * hwid, r.height * k / steps, new THREE.Vector3()), q1 = track.point(s1, side * hwid, r.height * (k + 1) / steps, new THREE.Vector3());
        pts.push(p0, p1, q1, p0, q1, q0);
      }
      const sg = new THREE.BufferGeometry().setFromPoints(pts); sg.computeVertexNormals();
      g.add(new THREE.Mesh(sg, sideMat));
    }
    return g;
  }

  function startLine(track, theme) {
    const g = new THREE.Group();
    const fr = track.frame(0, HG.Track.makeFrame());
    const hwid = fr.w / 2;
    const chk = mat('checker', () => { const t = HG.Tex.checker(); t.repeat.set(6, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 }); });
    g.add(onRoad(track, -1.5, 1.5, -hwid, hwid, 0.06, chk, 1));
    // the big arch over the start line
    const archMat = mat('arch', () => new THREE.MeshStandardMaterial({ color: 0x24242c, roughness: 0.35, metalness: 0.6 }));
    const span = hwid + (fr.offL + fr.offR) / 2 + 2;
    const H = 9;
    const arch = new THREE.Group();
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(1.2, H, 1.2), archMat);
      post.position.set(side * span, H / 2, 0); post.castShadow = true;
      arch.add(post);
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(span * 2 + 1.2, 2.6, 1.4), archMat);
    beam.position.y = H; arch.add(beam);
    const signTex = HG.Tex.sign('Σ SIGMA HOVER GP Σ', '#14141c', '#ffcc1a', 1024, 128);
    const signMat = new THREE.MeshBasicMaterial({ map: signTex, toneMapped: false });
    const signM = new THREE.Mesh(new THREE.PlaneGeometry(span * 2 - 1, 2.1), signMat);
    signM.position.set(0, H, -0.72); signM.rotation.y = Math.PI; arch.add(signM);
    const signB = signM.clone(); signB.position.z = 0.72; signB.rotation.y = 0; arch.add(signB);
    // countdown lights
    const lights = [];
    for (let k = 0; k < 3; k++) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), new THREE.MeshBasicMaterial({ color: 0x331111, toneMapped: false }));
      l.position.set((k - 1) * 1.4, H - 1.9, -0.8);
      arch.add(l); lights.push(l);
    }
    g.userData.lights = lights;
    // place the arch on the track frame
    const m = new THREE.Matrix4().makeBasis(fr.r.clone().negate(), fr.n, fr.t);
    arch.quaternion.setFromRotationMatrix(m);
    arch.position.copy(fr.p);
    g.add(arch);
    g.userData.arch = arch;
    return g;
  }

  function tunnels(track, theme) {
    const g = new THREE.Group();
    const F = track.F;
    const ribMat = mat('tunnel' + theme.tunnel, () => new THREE.MeshStandardMaterial({ color: theme.tunnel || 0x5a5048, roughness: 0.8, side: THREE.DoubleSide }));
    const lampMat = mat('tunnellamp', () => new THREE.MeshBasicMaterial({ color: 0xffe0a0, toneMapped: false }));
    const merger = new HG.Merger();
    const fr = HG.Track.makeFrame();
    let any = false;
    for (let i = 0; i < track.n; i += 4) {
      if (!(track.flags[i] & F.TUNNEL)) continue;
      any = true;
      track.frame(i * track.ds, fr);
      const r = fr.w / 2 + Math.max(fr.offL, fr.offR) + 1.5;
      const ring = new THREE.TorusGeometry(r, i % 8 === 0 ? 0.9 : 0.4, 6, 20, Math.PI);
      const m = new THREE.Matrix4().makeBasis(fr.r.clone().negate(), fr.n, fr.t);
      m.setPosition(fr.p);
      merger.add(ribMat, ring, m);
      if (i % 16 === 0) {
        const lamp = new THREE.BoxGeometry(2.4, 0.3, 0.8);
        const lm = new THREE.Matrix4().makeBasis(fr.r.clone().negate(), fr.n, fr.t);
        lm.setPosition(fr.p.clone().addScaledVector(fr.n, r - 0.6));
        merger.add(lampMat, lamp, lm);
      }
    }
    if (any) {
      // the roof between the ribs
      const roof = strip(track, (i) => { const r = track.W[i] / 2 + Math.max(track.offL[i], track.offR[i]) + 1.5; return [at(track, i, -r * 0.7, r * 0.72), at(track, i, r * 0.7, r * 0.72)]; },
        (i) => !(track.flags[i] & F.TUNNEL), [0, 1], 8, ribMat);
      if (roof) g.add(roof);
      for (const side of [-1, 1]) {
        const wall = strip(track, (i) => { const r = track.W[i] / 2 + Math.max(track.offL[i], track.offR[i]) + 1.5; return [at(track, i, side * r * 0.98, 0), at(track, i, side * r * 0.7, r * 0.72)]; },
          (i) => !(track.flags[i] & F.TUNNEL), [0, 1], 8, ribMat);
        if (wall) g.add(wall);
      }
    }
    g.add(merger.build(false, true));
    return g;
  }

  return { build, onRoad, strip, at };
})();
