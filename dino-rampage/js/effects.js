// ============================================================
//  DINO RAMPAGE — EFFECTS
//  Flying chunks, dust clouds, shockwave rings, sparkles,
//  buildings that crumble into the ground, and things that
//  go flying when the dino ROARS.
// ============================================================
window.DR = window.DR || {};

DR.FX = (function () {
  const U = DR.U, T = DR.Tex;
  let scene;
  const fx = { shake: 0 };

  // ---------- CHUNKS (lots of little boxes, drawn all at once) ----------
  const N = DR.lowGfx ? 500 : 1100;
  let chunks, chunkMesh, next = 0;
  const dummy = new THREE.Object3D();
  const col = new THREE.Color();
  // ---------- DUST PUFFS & SPARKLES ----------
  const puffs = [], sparks = [], rings = [];
  const collapsing = [], flyers = [];

  function init(sc) {
    scene = sc;
    chunkMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.7 }), N);
    chunkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    chunkMesh.frustumCulled = false;
    chunkMesh.castShadow = !DR.lowGfx;
    chunks = [];
    dummy.scale.setScalar(0); dummy.updateMatrix();
    for (let i = 0; i < N; i++) {
      chunks.push({ life: 0 });
      chunkMesh.setMatrixAt(i, dummy.matrix);
      chunkMesh.setColorAt(i, col.set(0xffffff));
    }
    scene.add(chunkMesh);
    for (let i = 0; i < 70; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.puff(), color: 0xd8d0c0, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false; scene.add(s); puffs.push({ s, t: 1, dur: 1 });
    }
    for (let i = 0; i < 50; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.star(), color: 0xffe070, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
      s.visible = false; scene.add(s); sparks.push({ s, t: 1, dur: 1 });
    }
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.82, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); rings.push({ m, t: 1, dur: 1 });
    }
  }

  // throw chunks out of a box-shaped area
  function burst(x, y, z, hw, hh, hd, cols, n, power = 1, size = 1) {
    n = Math.min(n, DR.lowGfx ? Math.ceil(n * 0.5) : n);
    const s0 = Math.max(0.12, Math.cbrt(hw * hh * hd) * 0.28) * size;
    for (let i = 0; i < n; i++) {
      const c = chunks[next];
      const idx = next;
      next = (next + 1) % N;
      c.x = x + (Math.random() * 2 - 1) * hw; c.y = y + Math.random() * hh * 2; c.z = z + (Math.random() * 2 - 1) * hd;
      const ang = Math.random() * Math.PI * 2, sp = (3 + Math.random() * 7) * power;
      c.vx = Math.cos(ang) * sp; c.vz = Math.sin(ang) * sp; c.vy = (4 + Math.random() * 8) * power;
      c.rx = Math.random() * 6; c.ry = Math.random() * 6; c.rz = 0;
      c.ax = (Math.random() - 0.5) * 12; c.ay = (Math.random() - 0.5) * 12;
      c.s = s0 * (0.5 + Math.random() * 0.8);
      c.sy = c.s * (0.5 + Math.random() * 0.6);
      c.life = c.max = 2.2 + Math.random() * 1.5;
      c.g = 22 * Math.min(2, power);
      chunkMesh.setColorAt(idx, col.set(cols[Math.floor(Math.random() * cols.length)]));
    }
    chunkMesh.instanceColor.needsUpdate = true;
  }
  function confetti(x, y, z, n = 80, spread = 4) {
    const cols = [0xff4a6a, 0x3aa8ff, 0xffd23a, 0x4ad86a, 0xff8a2a, 0xb05aff, 0xffffff];
    for (let i = 0; i < n; i++) {
      const c = chunks[next]; const idx = next; next = (next + 1) % N;
      c.x = x + (Math.random() - 0.5) * spread; c.y = y + Math.random() * spread * 0.5; c.z = z + (Math.random() - 0.5) * spread;
      const ang = Math.random() * Math.PI * 2, sp = Math.random() * spread * 1.5;
      c.vx = Math.cos(ang) * sp; c.vz = Math.sin(ang) * sp; c.vy = spread * (1 + Math.random() * 2.5);
      c.rx = 0; c.ry = 0; c.rz = 0; c.ax = (Math.random() - 0.5) * 20; c.ay = (Math.random() - 0.5) * 20;
      c.s = spread * 0.05; c.sy = c.s * 0.15;
      c.life = c.max = 3 + Math.random() * 2; c.g = spread * 1.2;
      c.drag = true;
      chunkMesh.setColorAt(idx, col.set(cols[i % cols.length]));
    }
    chunkMesh.instanceColor.needsUpdate = true;
  }
  function dust(x, y, z, size, n = 6, color = 0xd8d0c0) {
    for (let i = 0; i < n; i++) {
      const p = puffs.find((q) => q.t >= q.dur) || puffs[Math.floor(Math.random() * puffs.length)];
      p.t = 0; p.dur = 0.9 + Math.random() * 0.8;
      p.x = x + (Math.random() - 0.5) * size; p.y = y + Math.random() * size * 0.3; p.z = z + (Math.random() - 0.5) * size;
      p.vx = (Math.random() - 0.5) * size * 0.8; p.vz = (Math.random() - 0.5) * size * 0.8; p.vy = size * (0.2 + Math.random() * 0.4);
      p.s0 = size * 0.5; p.s1 = size * (1.4 + Math.random());
      p.s.material.color.set(color);
      p.s.visible = true;
    }
  }
  function sparkle(x, y, z, size, n = 10, color = 0xffe070) {
    for (let i = 0; i < n; i++) {
      const p = sparks.find((q) => q.t >= q.dur) || sparks[Math.floor(Math.random() * sparks.length)];
      p.t = 0; p.dur = 0.6 + Math.random() * 0.6;
      p.x = x; p.y = y; p.z = z;
      const a = Math.random() * Math.PI * 2, e = Math.random() * 1.2;
      p.vx = Math.cos(a) * size * 2.5; p.vz = Math.sin(a) * size * 2.5; p.vy = size * (1 + e * 2);
      p.size = size * (0.3 + Math.random() * 0.4);
      p.s.material.color.set(color);
      p.s.visible = true;
    }
  }
  function ring(x, z, r, color = 0xffffff, dur = 0.55) {
    const q = rings.find((k) => k.t >= k.dur) || rings[0];
    q.t = 0; q.dur = dur; q.r = r;
    q.m.position.set(x, 0.2, z);
    q.m.material.color.set(color);
    q.m.visible = true;
  }

  // a big thing sinks into the ground in a cloud of dust
  function collapse(o) {
    collapsing.push({ o, m: o.mesh, t: 0, dur: 0.6 + o.tier * 0.25, h: o.h, puffT: 0 });
  }
  // something flies through the air (then smashes when it lands)
  function fly(o, vx, vy, vz, onLand) {
    flyers.push({ o, m: o.mesh, x: o.x, y: 0, z: o.z, vx, vy, vz, t: 0, ax: (Math.random() - 0.5) * 8, az: (Math.random() - 0.5) * 8, onLand });
  }
  // a wheel that rolls away! (the Ferris wheel)
  function roll(mesh, dirX, dirZ, speed, radius, dur, onEnd) {
    flyers.push({ roll: true, m: mesh, dirX, dirZ, speed, radius, t: 0, dur, onEnd });
  }

  function update(dt) {
    fx.shake = Math.max(0, fx.shake - dt * 2.2);
    // chunks
    let any = false;
    for (let i = 0; i < N; i++) {
      const c = chunks[i];
      if (c.life <= 0) continue;
      any = true;
      c.life -= dt;
      if (c.life <= 0) { dummy.scale.setScalar(0); dummy.updateMatrix(); chunkMesh.setMatrixAt(i, dummy.matrix); continue; }
      if (c.drag) { c.vx *= 1 - dt * 1.5; c.vz *= 1 - dt * 1.5; c.vy = Math.max(c.vy - c.g * dt, -c.g * 0.25); }
      else c.vy -= c.g * dt;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      c.rx += c.ax * dt; c.ry += c.ay * dt;
      if (c.y < c.sy / 2) {
        c.y = c.sy / 2;
        if (c.vy < 0) c.vy = -c.vy * 0.3;
        c.vx *= 0.55; c.vz *= 0.55; c.ax *= 0.5; c.ay *= 0.5;
        if (c.drag) { c.vy = 0; c.ax = c.ay = 0; }
      }
      const k = Math.min(1, c.life / 0.5);
      dummy.position.set(c.x, c.y, c.z);
      dummy.rotation.set(c.rx, c.ry, c.rz);
      dummy.scale.set(c.s * k, c.sy * k, c.s * k);
      dummy.updateMatrix();
      chunkMesh.setMatrixAt(i, dummy.matrix);
    }
    if (any) chunkMesh.instanceMatrix.needsUpdate = true;
    // puffs
    for (const p of puffs) {
      if (p.t >= p.dur) continue;
      p.t += dt;
      const k = p.t / p.dur;
      if (k >= 1) { p.s.visible = false; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vx *= 1 - dt * 2; p.vz *= 1 - dt * 2;
      p.s.position.set(p.x, p.y, p.z);
      const s = U.lerp(p.s0, p.s1, 1 - (1 - k) * (1 - k));
      p.s.scale.set(s, s, 1);
      p.s.material.opacity = (1 - k) * 0.75;
    }
    for (const p of sparks) {
      if (p.t >= p.dur) continue;
      p.t += dt;
      const k = p.t / p.dur;
      if (k >= 1) { p.s.visible = false; continue; }
      p.vy -= p.size * 12 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.s.position.set(p.x, p.y, p.z);
      const s = p.size * (1 - k * 0.5) * 2;
      p.s.scale.set(s, s, 1);
      p.s.material.rotation += dt * 4;
      p.s.material.opacity = 1 - k;
    }
    for (const q of rings) {
      if (q.t >= q.dur) continue;
      q.t += dt;
      const k = q.t / q.dur;
      if (k >= 1) { q.m.visible = false; continue; }
      const s = q.r * (0.15 + 0.85 * (1 - (1 - k) * (1 - k)));
      q.m.scale.set(s, s, 1);
      q.m.material.opacity = (1 - k) * 0.8;
    }
    // collapsing buildings
    for (let i = collapsing.length - 1; i >= 0; i--) {
      const c = collapsing[i];
      c.t += dt;
      const k = Math.min(1, c.t / c.dur);
      c.m.position.y = -c.h * Math.pow(k, 1.6) * 0.95;
      c.m.scale.y = 1 - k * 0.3;
      c.m.position.x = c.o.x + (Math.random() - 0.5) * 0.02 * c.h * (1 - k);
      c.puffT -= dt;
      if (c.puffT < 0) { c.puffT = 0.12; dust(c.o.x, 0.5, c.o.z, Math.max(c.o.vw, c.o.vd) * 1.1, 3); }
      if (k >= 1) {
        if (c.m.parent) c.m.parent.remove(c.m);
        c.m.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
        collapsing.splice(i, 1);
      }
    }
    // flying things
    for (let i = flyers.length - 1; i >= 0; i--) {
      const f = flyers[i];
      f.t += dt;
      if (f.roll) {
        f.m.position.x += f.dirX * f.speed * dt;
        f.m.position.z += f.dirZ * f.speed * dt;
        f.m.rotation.z -= f.speed / f.radius * dt;
        f.speed = Math.max(4, f.speed - dt * 1.5);
        if (f.t >= f.dur) { flyers.splice(i, 1); f.onEnd(f.m.position.x, f.m.position.z); }
        continue;
      }
      f.vy -= 25 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      f.m.position.set(f.x, f.y, f.z);
      f.m.rotation.x += f.ax * dt; f.m.rotation.z += f.az * dt;
      if (f.y <= 0 && f.t > 0.2) {
        flyers.splice(i, 1);
        f.o.x = f.x; f.o.z = f.z;
        f.onLand(f.o);
      }
    }
  }
  function clear() {
    for (const c of chunks) c.life = 0;
    dummy.scale.setScalar(0); dummy.updateMatrix();
    for (let i = 0; i < N; i++) chunkMesh.setMatrixAt(i, dummy.matrix);
    chunkMesh.instanceMatrix.needsUpdate = true;
    for (const p of puffs) { p.t = p.dur; p.s.visible = false; }
    for (const p of sparks) { p.t = p.dur; p.s.visible = false; }
    for (const q of rings) { q.t = q.dur; q.m.visible = false; }
    collapsing.length = 0; flyers.length = 0;
    fx.shake = 0;
  }

  return { init, burst, confetti, dust, sparkle, ring, collapse, fly, roll, update, clear, fx, get busy() { return flyers.length; } };
})();
