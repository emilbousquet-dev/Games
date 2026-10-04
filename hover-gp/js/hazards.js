// ============================================================
//  SIGMA HOVER GP — TRACK HAZARDS
//  roller   = something rolling down the road at you
//  crusher  = a big block that slams down (watch the shadow!)
//  sweeper  = something sliding across the road
//  geyser   = lava / water that shoots up
//  car      = hover traffic driving along the road
//  ghost    = spooky ghosts floating over the road
// ============================================================
window.HG = window.HG || {};

HG.Hazards = (function () {
  const U = HG.U, M = HG.M;
  let list = [], track = null, group = null, theme = null, t = 0;

  function model(type, th) {
    const g = new THREE.Group();
    const sc = th.scenery;
    if (type === 'roller') {
      let mat;
      if (sc === 'beach') mat = new THREE.MeshStandardMaterial({ map: HG.Tex.make('beachball', 128, 64, (c, w, h) => { ['#ff3a3a', '#ffffff', '#3a8aff', '#ffffff', '#ffd23a', '#ffffff'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * w / 6, 0, w / 6 + 1, h); }); }), roughness: 0.4 });
      else if (sc === 'candy') mat = M.mat(U.pick(['#ff4a9a', '#4ad0ff', '#ffe04a', '#7aff5a']), { rough: 0.2 });
      else if (sc === 'ice') mat = M.mat('#f4fbff', { rough: 0.7 });
      else if (sc === 'volcano') mat = new THREE.MeshStandardMaterial({ map: HG.Tex.ground('lava'), emissive: 0xff5010, emissiveMap: HG.Tex.ground('lava'), emissiveIntensity: 1.5, roughness: 0.9 });
      else if (sc === 'sky') mat = M.mat('#202028', { rough: 0.3, metal: 0.7 });
      else mat = M.mat(sc === 'moon' ? '#8a8c94' : '#a8683a', { rough: 0.95, flat: true });
      const r = sc === 'beach' || sc === 'candy' ? 2.2 : 2.6;
      const geo = sc === 'desert' || sc === 'moon' ? M.cached('rollrock', () => new THREE.DodecahedronGeometry(r, 1)) : M.sphere(r, 24, 16);
      const b = new THREE.Mesh(geo, mat); b.castShadow = true; b.position.y = r; g.add(b);
      g.userData.ball = b; g.userData.r = r;
    } else if (type === 'crusher') {
      const stone = sc === 'jungle' ? M.mat('#7a7a62', { rough: 0.9 }) : M.mat('#5a626c', { rough: 0.4, metal: 0.7 });
      const block = new THREE.Group();
      block.add(new THREE.Mesh(M.rbox(6, 6, 6, 0.6), stone));
      // an angry face
      const eye = M.glowMat(sc === 'jungle' ? 0xffd040 : 0xff3030, 2);
      for (const s of [1, -1]) { const e = new THREE.Mesh(M.box(1.1, 0.7, 0.2), eye); e.position.set(s * 1.3, 0.8, 3.02); e.rotation.z = s * 0.3; block.add(e); }
      const mouth = new THREE.Mesh(M.box(3, 0.5, 0.2), M.mat('#1a1a1a')); mouth.position.set(0, -1.2, 3.02); block.add(mouth);
      block.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.add(block); g.userData.block = block;
      const pole = new THREE.Mesh(M.cyl(0.4, 0.4, 30, 8), M.mat('#3a3a44', { metal: 0.6 })); pole.position.y = 30; g.add(pole);
      const warn = new THREE.Mesh(new THREE.RingGeometry(2.5, 3.5, 32), new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }));
      warn.rotation.x = -Math.PI / 2; warn.position.y = 0.12; g.add(warn); g.userData.warn = warn;
    } else if (type === 'sweeper') {
      if (sc === 'underwater') {
        const jm = new THREE.MeshStandardMaterial({ color: 0xff80e0, emissive: 0xc040b0, emissiveIntensity: 0.8, transparent: true, opacity: 0.75, roughness: 0.2 });
        const bell = new THREE.Mesh(M.cached('jelly', () => new THREE.SphereGeometry(2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)), jm); bell.position.y = 4; g.add(bell);
        for (let i = 0; i < 6; i++) { const tn = new THREE.Mesh(M.cyl(0.08, 0.04, 3.5, 5), jm); const a = (i / 6) * Math.PI * 2; tn.position.set(Math.cos(a) * 1.2, 2.2, Math.sin(a) * 1.2); g.add(tn); }
        g.userData.bob = true;
      } else {
        const beam = new THREE.Mesh(M.cyl(0.35, 0.35, 6, 12), M.glowMat(sc === 'lab' ? 0x30ff80 : 0xff3030, 2.5));
        beam.position.y = 3; g.add(beam);
        for (const y of [0.2, 6]) { const cap = new THREE.Mesh(M.cyl(0.8, 0.8, 0.5, 12), M.mat('#3a3a44', { metal: 0.7 })); cap.position.y = y; g.add(cap); }
      }
    } else if (type === 'geyser') {
      const col = sc === 'volcano' ? 0xff6a10 : 0x60d0ff;
      const pool = new THREE.Mesh(new THREE.CircleGeometry(3, 24), M.glowMat(col, 1.4)); pool.rotation.x = -Math.PI / 2; pool.position.y = 0.1; g.add(pool);
      const jet = new THREE.Mesh(M.cyl(1.6, 2.4, 1, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(2), transparent: true, opacity: 0.85, toneMapped: false }));
      jet.position.y = 0.5; g.add(jet); g.userData.jet = jet; g.userData.col = col;
    } else if (type === 'car') {
      const col = U.pick(['#ff4a4a', '#4ab0ff', '#ffd84a', '#7aff6a', '#ff8ae0']);
      const body = new THREE.Mesh(M.rbox(2.6, 1.3, 4.6, 0.4), M.paint(col)); body.position.y = 1.1; g.add(body);
      const glass = new THREE.Mesh(M.rbox(2.2, 0.8, 2.2, 0.3), M.mat('#1a2a40', { rough: 0.1, metal: 0.6 })); glass.position.set(0, 1.9, -0.3); g.add(glass);
      for (const s of [1, -1]) { const l = new THREE.Mesh(M.box(0.5, 0.25, 0.1), M.glowMat(0xff2020, 2)); l.position.set(s * 0.9, 1.1, -2.32); g.add(l); const h = new THREE.Mesh(M.box(0.5, 0.25, 0.1), M.glowMat(0xffffd0, 2)); h.position.set(s * 0.9, 1.1, 2.32); g.add(h); }
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.4), new THREE.MeshBasicMaterial({ map: HG.Tex.dot(), color: 0x40d0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.1; g.add(glow);
      g.traverse((o) => { if (o.isMesh && o !== glow) o.castShadow = true; });
    } else if (type === 'ghost') {
      const gm = new THREE.MeshStandardMaterial({ color: 0xf0f4ff, emissive: 0x8090ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.8, roughness: 0.4 });
      const body = new THREE.Mesh(M.lathe('ghostsheet', [[0, 2.4], [0.9, 2.2], [1.3, 1.5], [1.4, 0.5], [1.6, 0]], 20), gm); body.position.y = 1.5; g.add(body);
      for (const s of [1, -1]) { const e = new THREE.Mesh(M.sphere(0.22), M.mat('#101020')); e.position.set(s * 0.45, 3.2, 1.05); g.add(e); }
      const mo = new THREE.Mesh(M.sphere(0.3), M.mat('#301020')); mo.position.set(0, 2.6, 1.2); mo.scale.set(1, 1.4, 0.5); g.add(mo);
      g.userData.bob = true;
    }
    return g;
  }

  function setup(race, world) {
    track = race.track; theme = race.theme; list = []; t = 0;
    group = new THREE.Group(); world.add(group);
    if (track.isArena || !track.hazards) return;
    for (const hz of track.hazards) {
      const n = hz.n || 1;
      for (let i = 0; i < n; i++) {
        const fr = track.frame(hz.s, HG.Track.makeFrame());
        const hw = fr.w / 2;
        const h = { type: hz.type, s0: hz.s0, s1: hz.s1, s: U.lerp(hz.s0 + 6, hz.s1 - 6, n > 1 ? i / (n - 1) : 0.5), d: 0, h: 0, phase: i * 1.7 + Math.random(), mesh: model(hz.type, theme), on: false, hw };
        if (h.type === 'roller') { h.s = U.lerp(hz.s1, hz.s0, i / n); h.d = (i % 2 ? 1 : -1) * hw * U.rand(0.1, 0.5); }
        if (h.type === 'crusher') { h.d = (i % 2 ? 1 : -1) * hw * 0.45; }
        if (h.type === 'geyser') { h.d = (i % 2 ? 1 : -1) * hw * U.rand(0.2, 0.55); }
        if (h.type === 'car') { h.s = track.wrap(hz.s + i * track.length / n); h.d = (i % 2 ? 1 : -1) * hw * 0.45; h.spd = 17 + Math.random() * 4; }
        group.add(h.mesh);
        list.push(h);
      }
    }
  }

  // move them and hit racers (called in the physics step)
  function update(dt, race) {
    t += dt;
    for (const h of list) {
      if (h.type === 'roller') {
        h.s -= 13 * dt;
        if (track.diff(h.s0, h.s) < 0) { h.s = h.s1; h.d = U.rand(-0.6, 0.6) * h.hw; }
        h.hitR = 2.4; h.hitting = true; h.kind = 'tumble';
      } else if (h.type === 'crusher') {
        const c = (t + h.phase) % 3.4;
        h.y = c < 1.8 ? 7 : c < 2.0 ? U.lerp(7, 0, (c - 1.8) / 0.2) : c < 2.8 ? 0 : U.lerp(0, 7, (c - 2.8) / 0.6);
        h.hitting = h.y < 2.5; h.hitR = 3.3; h.kind = 'squash';
        if (c >= 2.0 && c < 2.0 + dt * 1.5 && HG.FX) HG.FX.smoke(track.point(h.s, h.d, 0.5, new THREE.Vector3()), 0xa0a0a0, 8, 1);
      } else if (h.type === 'sweeper') {
        h.d = Math.sin((t + h.phase) * 0.9) * h.hw * 0.8;
        h.hitting = true; h.hitR = 1.8; h.kind = 'spin';
      } else if (h.type === 'geyser') {
        const c = (t + h.phase) % 4.2;
        h.warn = c > 2.2 && c < 3.0; h.hitting = c >= 3.0; h.erupt = c >= 3.0 ? Math.sin(((c - 3.0) / 1.2) * Math.PI) : 0;
        h.hitR = 3; h.kind = 'tumble';
      } else if (h.type === 'car') {
        h.s = track.wrap(h.s + h.spd * dt);
        h.hitting = true; h.hitR = 2.4; h.kind = 'spin';
      } else if (h.type === 'ghost') {
        h.d = Math.sin((t + h.phase) * 0.6) * h.hw * 0.85;
        h.hitting = true; h.hitR = 1.8; h.kind = 'spin';
      }
      if (!h.hitting) continue;
      for (const k of race.karts) {
        if (k.out || k.falling > 0 || k.ctrl === 'remote' || k.h > 3) continue;
        const ds = track.diff(h.s, k.s), dd = k.d - h.d;
        if (ds * ds + dd * dd < h.hitR * h.hitR) {
          if (h.type === 'car' && k.hitT <= 0 && k.invT <= 0) { k.spd *= 0.5; k.lat += Math.sign(dd || 1) * 8; k.events.push({ type: 'bump', hard: 8 }); if (Math.random() < 0.4) k.hit('spin'); k.invT = 0.6; continue; }
          k.hit(h.kind);
        }
      }
    }
  }

  // for the CPU drivers: something dangerous ahead?
  function danger(k, look) {
    for (const h of list) {
      if (h.type === 'crusher' && !(h.y < 4)) continue;
      const ds = track.diff(k.s, h.s);
      if (ds > 2 && ds < look && Math.abs(h.d - k.d) < 3.5) return h.d;
    }
    return null;
  }

  const _fr = HG.Track.makeFrame();
  function animate(dt, race) {
    for (const h of list) {
      const f = track.frame(h.s, _fr);
      h.mesh.position.copy(f.p).addScaledVector(f.r, h.d).addScaledVector(f.n, 0);
      const fwd = h.type === 'roller' ? f.t.clone().negate() : f.t;
      HG.V.m.makeBasis(HG.V.c.crossVectors(fwd, f.n).normalize().negate(), f.n, fwd);
      h.mesh.quaternion.setFromRotationMatrix(HG.V.m);
      const u = h.mesh.userData;
      if (h.type === 'roller') u.ball.rotation.x += dt * 13 / u.r;
      if (h.type === 'crusher') { u.block.position.y = h.y + 3; u.warn.material.opacity = 0.25 + (7 - h.y) / 7 * 0.5; }
      if (h.type === 'sweeper' && u.bob) h.mesh.position.addScaledVector(f.n, Math.sin(t * 2 + h.phase) * 0.6);
      if (h.type === 'ghost') { h.mesh.position.addScaledVector(f.n, 0.5 + Math.sin(t * 2 + h.phase) * 0.5); h.mesh.rotateY(Math.sin(t + h.phase) * 0.5); }
      if (h.type === 'geyser') {
        u.jet.scale.set(1, 0.1 + h.erupt * 18, 1); u.jet.position.y = u.jet.scale.y / 2; u.jet.visible = h.erupt > 0.01;
        if ((h.warn || h.erupt > 0) && HG.FX && Math.random() < 0.5) HG.FX.emit({ p: h.mesh.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, h.erupt * 10 * Math.random(), (Math.random() - 0.5) * 3)), v: new THREE.Vector3(0, 6 + h.erupt * 10, 0), c: u.col, s: 0.8, life: 0.8, g: 8, bright: 2 });
      }
    }
  }

  return { setup, update, animate, danger, get list() { return list; } };
})();
