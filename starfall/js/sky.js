// ============================================================
//  STARFALL — SKY, SUN, TWO MOONS, STARS, DAY AND NIGHT
// ============================================================
window.SF = window.SF || {};

SF.Sky = (function () {
  const U = SF.U;
  let dome, stars, sunLight, hemi, moons = [], jellies = [], sunDisc;
  const S = { t: 0.08, night: 0, day: 1, indoor: null };
  const c1 = new THREE.Color(), c2 = new THREE.Color(), c3 = new THREE.Color();

  const KEYS = {
    day:    { top: 0x3f6ae0, hor: 0xc8b0f4, fog: 0xb8a8ea, sun: 0xfff2e0, hemiS: 0xc0d8ff, hemiG: 0x8a6ab0 },
    sunset: { top: 0x3a3a8a, hor: 0xff8a70, fog: 0xd08090, sun: 0xffa060, hemiS: 0xa080c0, hemiG: 0x604060 },
    night:  { top: 0x04051a, hor: 0x1c1a4a, fog: 0x141438, sun: 0x8090ff, hemiS: 0x3a4aa0, hemiG: 0x201830 },
  };

  function build(scene) {
    // the sky dome: a giant ball around the camera, painted with a gradient
    dome = new THREE.Mesh(
      new THREE.SphereGeometry(900, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
          top: { value: new THREE.Color() }, hor: { value: new THREE.Color() },
          sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color() },
        },
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP;
          void main(){
            float h = clamp(vP.y, -1.0, 1.0);
            vec3 c = mix(hor, top, pow(max(h, 0.0), 0.55));
            if (h < 0.0) c = mix(hor, hor * 0.6, min(-h * 3.0, 1.0));
            float s = max(dot(vP, sunDir), 0.0);
            c += sunCol * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.35);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      })
    );
    dome.renderOrder = -10;
    dome.frustumCulled = false;
    scene.add(dome);

    // stars
    const n = SF.lowGfx ? 700 : 1600;
    const pos = new Float32Array(n * 3), rnd = U.seeded(99);
    for (let i = 0; i < n; i++) {
      const a = rnd() * Math.PI * 2, y = rnd() * 0.95 + 0.05, r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(a) * r * 850; pos[i * 3 + 1] = y * 850; pos[i * 3 + 2] = Math.sin(a) * r * 850;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    stars.frustumCulled = false;
    scene.add(stars);

    // two moons: a big pink one and a small teal one
    const moonTex = (base, spot) => U.tex(U.canvas(64, 64, (g) => {
      g.fillStyle = base; g.fillRect(0, 0, 64, 64);
      const r = U.seeded(base.length * 31);
      for (let i = 0; i < 18; i++) { g.fillStyle = spot; g.beginPath(); g.arc(r() * 64, r() * 64, 2 + r() * 7, 0, 7); g.fill(); }
    }));
    [[40, 0xffffff, '#f0a8d0', '#c078a8', 0.4, 0.9], [18, 0xffffff, '#90f0e0', '#50b0b0', 2.3, 0.55]].forEach(([r, c, base, spot, az, el]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), new THREE.MeshBasicMaterial({ map: moonTex(base, spot), fog: false, transparent: true }));
      m.userData = { az, el };
      moons.push(m); scene.add(m);
    });

    // light
    sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.castShadow = !SF.lowGfx;
    if (sunLight.castShadow) {
      sunLight.shadow.mapSize.set(2048, 2048);
      const sc = sunLight.shadow.camera;
      sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 260;
      sunLight.shadow.bias = -0.0008;
      sunLight.shadow.normalBias = 0.05;
    }
    scene.add(sunLight); scene.add(sunLight.target);
    hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    scene.add(hemi);

    scene.fog = new THREE.Fog(0xb8a8ea, 60, SF.lowGfx ? 190 : 270);

    // giant sky jellyfish floating over the island
    for (let i = 0; i < 6; i++) {
      const j = SF.Models.jelly(i % 2 ? 0x9fd8ff : 0xe0a8ff);
      j.group.userData = { a: i * 1.1, r: 80 + i * 30, y: 70 + (i % 3) * 18, sp: 0.01 + i * 0.002 };
      scene.add(j.group);
      jellies.push(j);
    }
  }

  function lerpKey(a, b, t, out) {
    for (const k in a) { c1.set(a[k]); c2.set(b[k]); out[k] = (out[k] || new THREE.Color()).copy(c1).lerp(c2, t); }
    return out;
  }
  const cur = {};

  function update(dt, camera, focus, scene, time) {
    // the day is a bit longer than the night
    const sp = S.t < 0.5 ? 0.8 : 1.35;
    S.t = (S.t + (dt / SF.Layout.dayLength) * sp) % 1;
    const a = S.t * Math.PI * 2;
    const sunDir = new THREE.Vector3(Math.cos(a) * 0.85, Math.sin(a), 0.4).normalize();
    const h = sunDir.y;
    S.day = U.smooth(-0.05, 0.25, h);
    S.night = U.smooth(0.05, -0.25, h);
    const sunset = 1 - S.day - S.night;
    // pick the colors
    if (h >= 0.05) lerpKey(KEYS.sunset, KEYS.day, U.smooth(0.05, 0.3, h), cur);
    else lerpKey(KEYS.sunset, KEYS.night, U.smooth(0.05, -0.25, h), cur);

    if (S.indoor) {
      cur.top = c3.set(S.indoor.fog).clone(); cur.hor = cur.top.clone(); cur.fog = cur.top.clone();
    }
    dome.material.uniforms.top.value.copy(cur.top);
    dome.material.uniforms.hor.value.copy(cur.hor);
    dome.material.uniforms.sunDir.value.copy(sunDir);
    dome.material.uniforms.sunCol.value.copy(cur.sun).multiplyScalar(S.indoor ? 0 : S.day + sunset * 0.8);
    dome.position.copy(camera.position);
    stars.position.copy(camera.position);
    stars.material.opacity = S.indoor ? 0 : S.night * 0.95;
    scene.fog.color.copy(cur.fog);
    scene.fog.near = S.indoor ? 18 : 60;
    scene.fog.far = S.indoor ? 70 : (SF.lowGfx ? 190 : 270);

    // moons go around the sky too
    moons.forEach((m, i) => {
      const ma = a + Math.PI + m.userData.az;
      const dir = new THREE.Vector3(Math.cos(ma) * 0.7, Math.sin(ma) * m.userData.el + 0.25, Math.sin(m.userData.az) * 0.6).normalize();
      m.position.copy(camera.position).addScaledVector(dir, 700);
      m.material.opacity = S.indoor ? 0 : 0.35 + S.night * 0.65;
      m.visible = dir.y > -0.1 && !S.indoor;
    });

    // the light follows the player so shadows stay sharp nearby
    const lightDir = h > -0.05 ? sunDir : new THREE.Vector3(-0.3, 0.8, 0.35).normalize();
    sunLight.position.copy(focus).addScaledVector(lightDir, 120);
    sunLight.target.position.copy(focus);
    sunLight.color.copy(cur.sun);
    sunLight.intensity = S.indoor ? 0.6 : 0.35 + S.day * 2.3 + sunset * 0.8;
    hemi.color.copy(cur.hemiS); hemi.groundColor.copy(cur.hemiG);
    hemi.intensity = S.indoor ? 1.3 : 0.7 + S.day * 0.6 + S.night * 0.5;

    for (const j of jellies) {
      const u = j.group.userData;
      u.a += u.sp * dt;
      j.group.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(time * 0.4 + u.a * 5) * 2, Math.sin(u.a) * u.r);
      j.group.scale.y = 1 + Math.sin(time * 1.3 + u.r) * 0.08;
      j.group.visible = !S.indoor;
      j.tent.forEach((t, k) => (t.rotation.x = Math.sin(time * 1.2 + k) * 0.12));
    }
  }

  return { S, build, update };
})();
