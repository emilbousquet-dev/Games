// ============================================================
//  SIGMA HOVER GP — SKY, SUN, FOG AND THE GROUND
// ============================================================
window.HG = window.HG || {};

HG.Env = (function () {
  const U = HG.U;
  let scene, renderer, sun, hemi, amb, skyMesh, starMesh, groundMesh, pmrem, envRT, waterMat, lavaMat;
  let theme = null;
  const anim = [];

  function init(sc, r) {
    scene = sc; renderer = r;
    pmrem = new THREE.PMREMGenerator(renderer);
    hemi = new THREE.HemisphereLight(0xbfdfff, 0x4a5a3a, 0.7);
    scene.add(hemi);
    amb = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(amb);
    sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.castShadow = HG.settings.gfx !== 'low';
    const size = HG.settings.gfx === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.set(size, size);
    const c = sun.shadow.camera;
    c.left = -60; c.right = 60; c.top = 60; c.bottom = -60; c.near = 1; c.far = 400;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    scene.add(sun); scene.add(sun.target);
  }

  // build the sky, lights and ground for a theme
  function setTheme(th, track) {
    theme = th;
    anim.length = 0;
    for (const m of [skyMesh, starMesh, groundMesh]) if (m) { scene.remove(m); m.geometry.dispose(); }
    // sky dome
    const skyTex = HG.Tex.sky(th.sky[0], th.sky[1], th.sky[2]);
    skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1800, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false }));
    skyMesh.renderOrder = -10;
    scene.add(skyMesh);
    if (th.stars) {
      // little dots far away in the sky
      const pos = [], col = [];
      for (let i = 0; i < 2500; i++) {
        const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2;
        const y = Math.abs(u) * 0.95 + 0.05, r = Math.sqrt(1 - y * y);
        pos.push(Math.cos(a) * r * 1600, y * 1600, Math.sin(a) * r * 1600);
        const b = (0.4 + Math.random() * 0.6) * th.stars;
        col.push(b, b, b * (0.9 + Math.random() * 0.2));
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      starMesh = new THREE.Points(g, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      starMesh.renderOrder = -9;
      scene.add(starMesh);
    } else starMesh = null;
    scene.fog = new THREE.Fog(th.fog, th.fogNear || 180, th.fogFar || 900);
    scene.background = new THREE.Color(th.sky[2]);
    // lights
    sun.color.set(th.sunColor || 0xfff4e0);
    sun.intensity = (th.sun !== undefined ? th.sun : 2.4) * 0.8;
    hemi.color.set(th.hemiSky || 0xbfdfff); hemi.groundColor.set(th.hemiGround || 0x4a5a3a); hemi.intensity = (th.hemi !== undefined ? th.hemi : 0.8) * 0.7;
    amb.intensity = th.amb !== undefined ? th.amb : 0.15;
    // ground
    const gy = track ? track.minY + (th.groundY !== undefined ? th.groundY : -1) : -1;
    let gmat;
    if (th.ground === 'water' || th.ground === 'lava') {
      const isLava = th.ground === 'lava';
      const t = isLava ? HG.Tex.ground('lava') : HG.Tex.make('waterwaves', 256, 256, (g, w, h) => {
        g.fillStyle = '#1a7ac8'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < 300; i++) { g.strokeStyle = 'rgba(255,255,255,' + U.rand(0.05, 0.3) + ')'; g.lineWidth = U.rand(1, 3); const x = Math.random() * w, y = Math.random() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 4, x + 20, y); g.stroke(); }
      });
      t.repeat.set(120, 120);
      gmat = new THREE.MeshStandardMaterial({ map: t, color: isLava ? 0xffffff : (th.waterColor || 0x3aa0e0), roughness: isLava ? 0.9 : 0.08, metalness: isLava ? 0 : 0.2,
        emissive: isLava ? 0xff5a10 : 0x000000, emissiveMap: isLava ? t : null, emissiveIntensity: isLava ? 1.4 : 0, transparent: !isLava, opacity: 0.92 });
      anim.push((dt) => { t.offset.x += dt * (isLava ? 0.002 : 0.004); t.offset.y += dt * 0.003; });
    } else if (th.ground === 'void') {
      gmat = null;
    } else {
      const t = HG.Tex.ground(th.ground).clone(); t.needsUpdate = true;
      t.repeat.set(220, 220);
      gmat = new THREE.MeshStandardMaterial({ map: t, roughness: 1, color: th.groundTint || 0xffffff });
    }
    if (gmat) {
      groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), gmat);
      groundMesh.rotation.x = -Math.PI / 2;
      const c = track ? track.box.getCenter(new THREE.Vector3()) : new THREE.Vector3();
      groundMesh.position.set(c.x, gy, c.z);
      groundMesh.receiveShadow = true;
      scene.add(groundMesh);
    } else groundMesh = null;
    // reflections come from the sky
    const envScene = new THREE.Scene();
    // the reflections are a darker copy of the sky (a bright sky would make everything glow white)
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, color: new THREE.Color(th.envDim || 0x5a5a5a) })));
    const lowRing = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 9.5, 6, 16, 1, true), new THREE.MeshBasicMaterial({ color: th.envGround || th.fog, side: THREE.BackSide }));
    lowRing.position.y = -4; envScene.add(lowRing);
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, 0.02);
    scene.environment = envRT.texture;
    return gy;
  }

  // the sun's shadow box follows the player
  const sunDir = new THREE.Vector3();
  function follow(pos, dt) {
    if (theme) sunDir.set(theme.sunDir ? theme.sunDir[0] : 0.5, theme.sunDir ? theme.sunDir[1] : 1, theme.sunDir ? theme.sunDir[2] : 0.35).normalize();
    sun.position.copy(pos).addScaledVector(sunDir, 150);
    sun.target.position.copy(pos);
    if (skyMesh) skyMesh.position.copy(pos);
    if (starMesh) { starMesh.position.copy(pos); }
    for (const f of anim) f(dt);
  }

  return { init, setTheme, follow, get sun() { return sun; }, get ground() { return groundMesh; } };
})();
