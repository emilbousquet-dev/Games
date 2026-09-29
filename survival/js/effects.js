// ============================================================
//  DEAD ACRES — EFFECTS
//  Flying wood chips, sparks, dust, smoke, falling trees,
//  arrows in the air.
// ============================================================
window.DA = window.DA || {};

DA.Effects = (function () {
  const U = DA.U, T = DA.Tex;
  let scene, bits, smokeMat;
  const MAX = 400;
  const parts = [];
  const smokes = [];
  const falling = [];
  const arrows = [];
  const flashes = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const col = new THREE.Color();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

  function init(sc) {
    scene = sc;
    bits = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), MAX);
    bits.frustumCulled = false;
    for (let i = 0; i < MAX; i++) { bits.setMatrixAt(i, ZERO); bits.setColorAt(i, col.set(0xffffff)); }
    scene.add(bits);
    smokeMat = new THREE.SpriteMaterial({ map: T.smoke(), color: 0x888888, transparent: true, depthWrite: false, opacity: 0.5 });
  }

  // throw some little cubes
  function burst(x, y, z, color, n = 8, speed = 3, size = 0.06, gravity = 12, life = 0.8) {
    for (let i = 0; i < n; i++) {
      if (parts.length >= MAX) parts.shift();
      parts.push({
        x, y, z, vx: U.rand(-1, 1) * speed, vy: U.rand(0.3, 1.2) * speed, vz: U.rand(-1, 1) * speed,
        life: life * U.rand(0.6, 1.2), max: life, size: size * U.rand(0.6, 1.4), color, g: gravity, rx: Math.random() * 6, ry: Math.random() * 6,
      });
    }
  }

  // a thrown thing flies, bounces and rolls to a stop (same math on every computer)
  function stepThrow(t, dt) {
    if (t.rest) return;
    t.vy -= 14 * dt;
    let nx = t.x + t.vx * dt, ny = t.y + t.vy * dt, nz = t.z + t.vz * dt;
    // hit a wall? bounce back a little
    const L = Math.hypot(nx - t.x, nz - t.z);
    if (L > 1e-4) {
      const h = DA.Collide.ray(t.x, t.y, t.z, (nx - t.x) / L, 0, (nz - t.z) / L, L + 0.1, (o) => o.solid && o.kind !== 'floor');
      if (h) { t.vx *= -0.3; t.vz *= -0.3; nx = t.x; nz = t.z; }
    }
    const g = Math.max(DA.World.heightAt(nx, nz), DA.Collide.groundAt(nx, nz, 0.1, t.y)) + 0.05;
    if (ny <= g) {
      ny = g;
      if (Math.abs(t.vy) > 2) { t.vy = -t.vy * 0.35; t.vx *= 0.6; t.vz *= 0.6; }
      else { t.vy = 0; t.vx *= 0.8; t.vz *= 0.8; if (Math.hypot(t.vx, t.vz) < 0.2) t.rest = true; }
    }
    t.x = nx; t.y = ny; t.z = nz;
  }
  // where will it stop? (the host uses this to know where the BOOM is)
  function landing(x, y, z, vx, vy, vz) {
    const t = { x, y, z, vx, vy, vz };
    for (let i = 0; i < 60 * 4 && !t.rest; i++) stepThrow(t, 1 / 60);
    return t;
  }
  const throws = [];
  let glowMat;

  const FX = {
    init,
    landing,
    // a firecracker flying through the air, fizzing
    throwThing(id, x, y, z, vx, vy, vz) {
      const m = DA.Models.Items.make('firecracker');
      m.scale.setScalar(0.8);
      const g = new THREE.Group(); g.add(m);
      g.position.set(x, y, z);
      scene.add(g);
      throws.push({ id, g, t: { x, y, z, vx, vy, vz }, acc: 0, life: 7, spin: U.rand(5, 10) });
    },
    // BOOM!
    explode(x, y, z, id) {
      const i = throws.findIndex((t) => t.id === id);
      if (i >= 0) { scene.remove(throws[i].g); throws.splice(i, 1); }
      burst(x, y + 0.3, z, 0xffa020, 26, 7, 0.1, 9, 0.9);
      burst(x, y + 0.3, z, 0xffe070, 14, 9, 0.06, 6, 0.5);
      burst(x, y + 0.2, z, 0x4a3a2a, 12, 4, 0.12, 12, 1.2);
      for (let k = 0; k < 6; k++) FX.smoke(x + U.rand(-1, 1), y + U.rand(0.3, 1.2), z + U.rand(-1, 1), 3, 0x3a3a3a);
      if (!glowMat) glowMat = new THREE.SpriteMaterial({ map: T.glow(), color: 0xffb040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const fl = new THREE.Sprite(glowMat.clone());
      fl.position.set(x, y + 0.8, z); fl.scale.setScalar(2);
      scene.add(fl);
      flashes.push({ sp: fl, t: 0 });
    },
    wood: (x, y, z) => burst(x, y, z, 0xc8a070, 10, 3, 0.07),
    leaves: (x, y, z) => burst(x, y, z, 0x4a7a30, 14, 2, 0.1, 3, 1.5),
    rock: (x, y, z) => { burst(x, y, z, 0x8a8680, 8, 3, 0.07); burst(x, y, z, 0xfff0a0, 4, 5, 0.03, 10, 0.25); },
    blood: (x, y, z) => burst(x, y, z, 0x4a1010, 10, 2.5, 0.06),
    dust: (x, y, z, n = 10) => burst(x, y, z, 0x8a7a60, n, 1.5, 0.12, 1, 1.2),
    splash: (x, y, z) => burst(x, y, z, 0x8ab0c0, 16, 3, 0.08, 10, 0.8),
    sparks: (x, y, z) => burst(x, y, z, 0xffc040, 6, 2, 0.03, -1, 0.9),
    berries: (x, y, z) => burst(x, y, z, 0xb01830, 6, 1.5, 0.05),

    smoke(x, y, z, size = 1, color = 0x777777) {
      if (smokes.length > 60) return;
      const sp = new THREE.Sprite(smokeMat.clone());
      sp.material.color.set(color);
      sp.position.set(x, y, z); sp.scale.setScalar(size * 0.5);
      scene.add(sp);
      smokes.push({ sp, life: 3, size, vx: U.rand(-0.2, 0.2), vz: U.rand(-0.2, 0.2) });
    },

    // a tree falls over, away from (fromX, fromZ)
    fallTree(geo, x, y, z, scale, ry, fromX, fromZ) {
      const m = new THREE.Mesh(geo, DA.Models.M.vc());
      m.castShadow = true;
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      m.scale.setScalar(scale); m.rotation.y = ry;
      pivot.add(m);
      pivot.rotation.y = Math.atan2(x - fromX, z - fromZ);
      scene.add(pivot);
      falling.push({ pivot, t: 0 });
    },

    arrow(x, y, z, dx, dy, dz, speed, onHit) {
      const m = DA.Models.Items.make('arrow');
      m.scale.setScalar(0.9);
      const g = new THREE.Group(); g.add(m);
      m.rotation.x = -Math.PI / 2; // arrow model points up; make it point forward (-z)
      g.position.set(x, y, z);
      scene.add(g);
      arrows.push({ g, vx: dx * speed, vy: dy * speed, vz: dz * speed, life: 4, stuck: 0, onHit });
    },

    update(dt) {
      // little cubes
      for (let i = parts.length - 1; i >= 0; i--) {
        const b = parts[i];
        b.life -= dt;
        if (b.life <= 0) { parts.splice(i, 1); continue; }
        b.vy -= b.g * dt;
        b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
        const gy = DA.World.heightAt(b.x, b.z);
        if (b.y < gy + b.size / 2 && b.g > 0) { b.y = gy + b.size / 2; b.vy = 0; b.vx *= 0.5; b.vz *= 0.5; }
        b.rx += dt * 5; b.ry += dt * 4;
      }
      for (let i = 0; i < MAX; i++) {
        const b = parts[i];
        if (!b) { bits.setMatrixAt(i, ZERO); continue; }
        p.set(b.x, b.y, b.z); e.set(b.rx, b.ry, 0); q.setFromEuler(e);
        s.setScalar(b.size * Math.min(1, b.life / b.max * 3));
        bits.setMatrixAt(i, m4.compose(p, q, s));
        bits.setColorAt(i, col.set(b.color));
      }
      bits.instanceMatrix.needsUpdate = true;
      if (bits.instanceColor) bits.instanceColor.needsUpdate = true;
      // smoke puffs
      for (let i = smokes.length - 1; i >= 0; i--) {
        const sm = smokes[i];
        sm.life -= dt;
        if (sm.life <= 0) { scene.remove(sm.sp); sm.sp.material.dispose(); smokes.splice(i, 1); continue; }
        sm.sp.position.x += sm.vx * dt; sm.sp.position.z += sm.vz * dt; sm.sp.position.y += dt * 0.9;
        sm.sp.scale.setScalar(sm.size * (0.5 + (3 - sm.life) * 0.5));
        sm.sp.material.opacity = Math.min(0.45, sm.life / 3 * 0.6);
      }
      // falling trees
      for (let i = falling.length - 1; i >= 0; i--) {
        const f = falling[i];
        f.t += dt;
        const a = Math.min(Math.PI / 2 - 0.08, 0.15 * f.t * f.t * 9 + f.t * 0.2);
        f.pivot.rotation.x = a;
        if (f.t > 2.2) f.pivot.position.y -= dt * 1.2;
        if (f.t > 4) { scene.remove(f.pivot); falling.splice(i, 1); }
      }
      // thrown firecrackers
      for (let i = throws.length - 1; i >= 0; i--) {
        const th = throws[i];
        th.life -= dt;
        if (th.life <= 0) { scene.remove(th.g); throws.splice(i, 1); continue; }
        th.acc += dt;
        while (th.acc >= 1 / 60) { stepThrow(th.t, 1 / 60); th.acc -= 1 / 60; }
        th.g.position.set(th.t.x, th.t.y, th.t.z);
        if (!th.t.rest) { th.g.rotation.x += dt * th.spin; th.g.rotation.z += dt * th.spin * 0.7; }
        else th.g.rotation.set(Math.PI / 2, th.g.rotation.y, 0);
        if (Math.random() < dt * 25) burst(th.t.x, th.t.y + 0.15, th.t.z, 0xffe080, 1, 1.5, 0.03, 2, 0.3); // fizz
      }
      // explosion flashes
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.t += dt;
        f.sp.scale.setScalar(2 + f.t * 30);
        f.sp.material.opacity = Math.max(0, 1 - f.t * 3);
        if (f.t > 0.4) { scene.remove(f.sp); f.sp.material.dispose(); flashes.splice(i, 1); }
      }
      // arrows
      for (let i = arrows.length - 1; i >= 0; i--) {
        const a = arrows[i];
        a.life -= dt;
        if (a.life <= 0) { scene.remove(a.g); arrows.splice(i, 1); continue; }
        if (a.stuck) continue;
        const ox = a.g.position.x, oy = a.g.position.y, oz = a.g.position.z;
        a.vy -= 9.8 * dt;
        const nx = ox + a.vx * dt, ny = oy + a.vy * dt, nz = oz + a.vz * dt;
        const L = Math.hypot(nx - ox, ny - oy, nz - oz);
        const hit = a.onHit ? a.onHit(ox, oy, oz, (nx - ox) / L, (ny - oy) / L, (nz - oz) / L, L) : null;
        if (hit) {
          a.g.position.set(ox + (nx - ox) * hit.t, oy + (ny - oy) * hit.t, oz + (nz - oz) * hit.t);
          a.stuck = 1; a.life = hit.gone ? 0 : 6;
          continue;
        }
        a.g.position.set(nx, ny, nz);
        a.g.lookAt(nx + a.vx, ny + a.vy, nz + a.vz);
        a.g.rotateY(Math.PI);
        if (ny < DA.World.heightAt(nx, nz)) { a.stuck = 1; a.life = 6; }
      }
    },
  };
  return FX;
})();
