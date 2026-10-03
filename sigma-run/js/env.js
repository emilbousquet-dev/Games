// ============================================================
//  SIGMA RUN — SKY, SUN, FOG and TIME OF DAY
//  The run starts at a golden sunset and slowly turns into a
//  neon night the further you get.
// ============================================================
window.SR = window.SR || {};

SR.Env = (function () {
  const U = SR.U;
  let scene, renderer, sky, skyMat, sun, hemi, pmrem, envTarget = null, skyScene, skyCopy;
  let lastEnvT = -1, timeOfDay = 0;
  const C = (h) => new THREE.Color(h);

  // what the world looks like at sunset (0), dusk (0.5) and night (1)
  const KEYS = [
    { zen: C('#2f63a8'), hor: C('#ffb27a'), fog: C('#d99a7a'), sun: C('#ffc890'), sunI: 2.6, elev: 9, hemiS: C('#a8c4ea'), hemiG: C('#7a5544'), hemiI: 1.05, win: 0.35, cloud: C('#ffd0a0') },
    { zen: C('#1f2460'), hor: C('#ff6a6a'), fog: C('#8a4a6a'), sun: C('#ff8a5a'), sunI: 1.5, elev: 2.5, hemiS: C('#7a7ac0'), hemiG: C('#4a3040'), hemiI: 0.9, win: 0.9, cloud: C('#ff8a8a') },
    { zen: C('#04061a'), hor: C('#2a1e58'), fog: C('#1c1838'), sun: C('#9fb4ff'), sunI: 0.9, elev: 35, hemiS: C('#7080c8'), hemiG: C('#3a2a48'), hemiI: 1.15, win: 1.8, cloud: C('#3a3a6a') },
  ];
  const cur = { zen: C('#000'), hor: C('#000'), fog: C('#000'), sun: C('#000'), sunI: 1, elev: 10, hemiS: C('#000'), hemiG: C('#000'), hemiI: 1, win: 0, cloud: C('#000') };
  const sunDir = new THREE.Vector3();

  const skyVert = `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_Position = p.xyww; // always at the very back
    }`;
  const skyFrag = `
    uniform vec3 zen, hor, fogCol, sunCol, cloudCol, sunDir;
    uniform float time, night;
    varying vec3 vDir;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
    }
    float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
    void main() {
      vec3 d = normalize(vDir);
      float h = d.y;
      float up = clamp(h, 0.0, 1.0);
      vec3 col = mix(hor, zen, pow(up, 0.55));
      // warm glow around the sun
      float sd = max(dot(d, sunDir), 0.0);
      col += sunCol * (pow(sd, 6.0) * 0.45 + pow(sd, 60.0) * 0.8) * (1.0 - night * 0.8);
      // the sun (or the moon at night)
      float disc = smoothstep(0.9993, 0.9996, sd);
      col = mix(col, sunCol * (night > 0.5 ? 1.6 : 5.0), disc);
      // clouds
      if (h > 0.0) {
        vec2 cp = d.xz / (h + 0.12) * 1.6 + vec2(time * 0.01, time * 0.004);
        float c = fbm(cp);
        c = smoothstep(0.48, 0.85, c) * smoothstep(0.0, 0.25, h);
        vec3 cc = mix(cloudCol, cloudCol * 0.45 + zen * 0.4, smoothstep(0.5, 0.9, fbm(cp * 1.7 + 3.0)));
        cc += sunCol * pow(sd, 4.0) * 0.6 * (1.0 - night);
        col = mix(col, cc, c * 0.85);
      }
      // stars at night
      if (night > 0.3 && h > 0.05) {
        vec2 sp = d.xz / (h + 0.3) * 160.0;
        float s = hash(floor(sp));
        float star = step(0.995, s) * smoothstep(0.5, 0.0, length(fract(sp) - 0.5));
        col += vec3(star) * (night - 0.3) * 1.6 * (0.6 + 0.4 * sin(time * 3.0 + s * 50.0));
      }
      // city haze near the horizon and below it
      float hz = smoothstep(0.12, -0.02, h);
      col = mix(col, fogCol, hz);
      gl_FragColor = vec4(col, 1.0);
    }`;

  function makeSky() {
    skyMat = new THREE.ShaderMaterial({
      vertexShader: skyVert, fragmentShader: skyFrag, side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        zen: { value: cur.zen }, hor: { value: cur.hor }, fogCol: { value: cur.fog }, sunCol: { value: cur.sun },
        cloudCol: { value: cur.cloud }, sunDir: { value: sunDir }, time: { value: 0 }, night: { value: 0 },
      },
    });
    const m = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), skyMat);
    m.frustumCulled = false; m.renderOrder = -10;
    return m;
  }

  function init(s, r) {
    scene = s; renderer = r;
    sky = makeSky(); scene.add(sky);
    scene.fog = new THREE.FogExp2(0xd99a7a, 0.0042);
    hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xffffff, 2.5);
    const q = SR.settings.gfx;
    sun.castShadow = q !== 'low';
    const size = q === 'ultra' ? 4096 : q === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.set(size, size);
    const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 260;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    scene.add(sun); scene.add(sun.target);
    // a separate little scene with just the sky, used for shiny reflections
    skyScene = new THREE.Scene();
    skyCopy = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat);
    skyScene.add(skyCopy);
    pmrem = new THREE.PMREMGenerator(renderer);
    setTime(0, true);
  }

  function mixKey(t) {
    const a = t < 0.5 ? KEYS[0] : KEYS[1], b = t < 0.5 ? KEYS[1] : KEYS[2], k = U.smooth(t < 0.5 ? t * 2 : (t - 0.5) * 2);
    for (const key of ['zen', 'hor', 'fog', 'sun', 'hemiS', 'hemiG', 'cloud']) cur[key].copy(a[key]).lerp(b[key], k);
    for (const key of ['sunI', 'elev', 'hemiI', 'win']) cur[key] = U.lerp(a[key], b[key], k);
  }

  function setTime(t, force) {
    timeOfDay = t;
    mixKey(t);
    // the sun sets toward the front-left, the moon rises high
    const el = cur.elev * Math.PI / 180, az = t < 0.75 ? -0.22 : 0.5;
    sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
    sun.color.copy(cur.sun); sun.intensity = cur.sunI;
    hemi.color.copy(cur.hemiS); hemi.groundColor.copy(cur.hemiG); hemi.intensity = cur.hemiI;
    scene.fog.color.copy(cur.fog);
    scene.fog.density = U.lerp(0.0030, 0.0042, t);
    skyMat.uniforms.night.value = U.clamp((t - 0.5) * 2, 0, 1);
    if (force || Math.abs(t - lastEnvT) > 0.04) updateEnv();
  }
  function updateEnv() {
    lastEnvT = timeOfDay;
    const old = envTarget;
    envTarget = pmrem.fromScene(skyScene, 0.02, 0.1, 500);
    scene.environment = envTarget.texture;
    if (old) old.dispose();
  }

  // keep the sky and the sun's shadow box around the player
  function follow(pos, time) {
    sky.position.copy(pos);
    skyMat.uniforms.time.value = time;
    sun.position.set(pos.x + sunDir.x * 120, pos.y + sunDir.y * 120 + 20, pos.z + sunDir.z * 120);
    // when the sun is very low, shadows get super long, so lift it a bit for shadows
    if (sunDir.y < 0.4) sun.position.y = pos.y + 62;
    sun.target.position.set(pos.x, pos.y - 5, pos.z - 15);
  }

  return {
    init, setTime, follow,
    get windowGlow() { return cur.win; },
    get time() { return timeOfDay; },
    get fogColor() { return cur.fog; },
    get sunColor() { return cur.sun; },
    get sunDir() { return sunDir; },
    get sun() { return sun; },
    get hemi() { return hemi; },
  };
})();
