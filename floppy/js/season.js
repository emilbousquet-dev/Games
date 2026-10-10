// ============================================================
//  FLOPPY PARTY — SEASONS AND EVENTS
//  The game changes by itself on special dates:
//   - WINTER PARTY (December, and the first days of January):
//     snow falls, the islands get snowy, snowmen and presents
//     appear, and everyone gets a free Santa hat.
//   - SPOOKY PARTY (October): pumpkins and spooky trees, and a
//     free Witch hat.
//  Event hats are yours to keep. (For testing: add ?season=winter
//  or ?season=spooky to the address, or ?season=none.)
// ============================================================
window.FP = window.FP || {};

FP.Season = (function () {
  const SEASONS = {
    winter: { name: 'Winter Party', hat: 'santa', grass: 0xeef6ff, dirt: 0x8a9bb5, msg: 'Snow is falling, and everyone gets a free Santa hat!' },
    spooky: { name: 'Spooky Party', hat: 'witch', grass: 0x86b85a, dirt: 0x6b4f3f, msg: 'Pumpkins everywhere, and a free Witch hat for you!' },
  };
  function detect() {
    let force = null;
    try { force = new URLSearchParams(location.search).get('season') || localStorage.getItem('floppy-season'); } catch (e) { /* no address */ }
    if (force === 'none') return null;
    if (SEASONS[force]) return force;
    const d = new Date(), m = d.getMonth();
    if (m === 11 || (m === 0 && d.getDate() <= 6)) return 'winter';
    if (m === 9) return 'spooky';
    return null;
  }
  const id = detect();
  const info = id ? SEASONS[id] : null;
  const L = () => FP.Look;

  // ---------------- decorations for the title screen, the lobby and the podium ----------------
  function snowman(s = 1) {
    const g = new THREE.Group(), white = L().toon(0xffffff), ink = L().toon(0x2a2140);
    const b1 = L().mesh(new THREE.SphereGeometry(0.55 * s, 16, 12), white); b1.position.y = 0.5 * s;
    const b2 = L().mesh(new THREE.SphereGeometry(0.4 * s, 16, 12), white); b2.position.y = 1.2 * s;
    const b3 = L().mesh(new THREE.SphereGeometry(0.3 * s, 16, 12), white); b3.position.y = 1.72 * s;
    const nose = L().mesh(new THREE.ConeGeometry(0.06 * s, 0.3 * s, 8), L().toon(0xff8c1a), 0.01);
    nose.rotation.x = Math.PI / 2; nose.position.set(0, 1.72 * s, 0.35 * s);
    g.add(b1, b2, b3, nose);
    for (const x of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.04 * s, 8, 6), ink); e.position.set(x * s, 1.8 * s, 0.27 * s); g.add(e); }
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.045 * s, 8, 6), ink); b.position.set(0, (1.05 + i * 0.15) * s, 0.39 * s); g.add(b); }
    const scarf = L().mesh(new THREE.TorusGeometry(0.28 * s, 0.07 * s, 8, 20), L().toon(0xe8303a), 0.01);
    scarf.rotation.x = Math.PI / 2; scarf.position.y = 1.47 * s;
    const hat = L().makeHat('santa', 0.3 * s);
    if (hat) hat.position.y = 1.72 * s + 0.2 * s;
    g.add(scarf); if (hat) g.add(hat);
    return g;
  }
  function present(color) {
    const g = new THREE.Group();
    const box = L().boxMesh(0.6, 0.5, 0.6, L().toon(color));
    box.position.y = 0.25;
    const r1 = L().boxMesh(0.62, 0.52, 0.12, L().toon(0xffcf33), 0); r1.position.y = 0.25;
    const r2 = L().boxMesh(0.12, 0.52, 0.62, L().toon(0xffcf33), 0); r2.position.y = 0.25;
    const bow = L().mesh(new THREE.TorusGeometry(0.1, 0.04, 6, 12), L().toon(0xffcf33), 0.01); bow.position.y = 0.55;
    g.add(box, r1, r2, bow);
    return g;
  }
  // decorate an island: spots = [[x, z, rotation], ...] where things can stand
  function decorate(spots) {
    if (!info) return;
    spots.forEach(([x, z, r = 0], i) => {
      let o;
      if (id === 'winter') o = i % 3 === 0 ? snowman(0.9) : present([0xe8303a, 0x4aa8ff, 0x5cc44a, 0x9b6bff][i % 4]);
      else o = i % 3 === 0 ? FP.Props.deadTree(0.9) : FP.Props.pumpkin();
      o.position.set(x, 0, z); o.rotation.y = r;
      FP.Stage.add(o);
    });
  }

  // ---------------- falling snow (around the camera) ----------------
  let snow = null;
  const N = 450, BOX = [44, 24, 36];
  function makeSnow() {
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * BOX[0]; pos[i * 3 + 1] = Math.random() * BOX[1]; pos[i * 3 + 2] = (Math.random() - 0.5) * BOX[2]; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    // a soft round flake (drawn on a little canvas)
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const g = cv.getContext('2d'), grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.5, 'rgba(255,255,255,.9)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
    snow = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.95, depthWrite: false }));
    snow.frustumCulled = false;
    FP.Stage.scene.add(snow);
  }
  function update(dt) {
    if (id !== 'winter') return;
    if (!snow) makeSnow();
    const t = FP.Camera.target, a = snow.geometry.attributes.position, p = a.array, time = performance.now() / 1000;
    snow.position.set(t.x, t.y - 6, t.z);
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] -= dt * (1.1 + (i % 5) * 0.18);
      p[i * 3] += Math.sin(time + i) * dt * 0.3;
      if (p[i * 3 + 1] < 0) { p[i * 3 + 1] += BOX[1]; p[i * 3] = (Math.random() - 0.5) * BOX[0]; }
    }
    a.needsUpdate = true;
  }

  // ---------------- the free event hat ----------------
  function welcome() {
    if (!info) return;
    const key = `floppy-event-${id}-${new Date().getFullYear()}`;
    let seen = true;
    try { seen = !!localStorage.getItem(key); localStorage.setItem(key, '1'); } catch (e) { /* no saving */ }
    const got = FP.Profile.grant(info.hat);
    if (!seen || got) setTimeout(() => FP.UI.achievement(info.name + '!', info.msg, 0, 'Special event'), 900);
  }

  return { id, info, hat: info ? info.hat : null, grass: info ? info.grass : undefined, dirt: info ? info.dirt : undefined, decorate, update, welcome };
})();
