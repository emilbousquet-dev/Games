// ============================================================
//  SIGMA HOVER GP — SCREEN EFFECTS ("post processing")
//  The picture is drawn into a hidden image first, then we add:
//  glow around bright things (bloom), speed lines and blur when
//  boosting, dark edges, and a flash when you get hit.
//  Works for 1 or 2 players (each half gets its own effects).
// ============================================================
window.HG = window.HG || {};

HG.Post = (function () {
  let renderer, enabled = false, W = 1, H = 1, pr = 1;
  let rtScene, mips = [], spare = [], quadScene, quadCam, quad;
  let matBright, matDown, matUp, matFinal;
  const views = [{ speed: 0, flash: 0, damage: 0, sigma: 0 }, { speed: 0, flash: 0, damage: 0, sigma: 0 }];
  let time = 0;

  const vert = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  const brightFrag = `
    uniform sampler2D tex; varying vec2 vUv;
    void main() { vec3 c = texture2D(tex, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(min(c * smoothstep(1.3, 2.6, l), vec3(16.0)), 1.0); }`;
  const downFrag = `
    uniform sampler2D tex; uniform vec2 texel; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tex, vUv).rgb * 4.0;
      c += texture2D(tex, vUv + texel * vec2(-1.0, -1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, -1.0)).rgb;
      c += texture2D(tex, vUv + texel * vec2(-1.0, 1.0)).rgb + texture2D(tex, vUv + texel * vec2(1.0, 1.0)).rgb;
      gl_FragColor = vec4(c / 8.0, 1.0);
    }`;
  const upFrag = `
    uniform sampler2D tex; uniform sampler2D low; uniform vec2 texel; varying vec2 vUv;
    void main() {
      vec3 b = texture2D(low, vUv + texel * vec2(-1.0, 0.0)).rgb + texture2D(low, vUv + texel * vec2(1.0, 0.0)).rgb;
      b += texture2D(low, vUv + texel * vec2(0.0, -1.0)).rgb + texture2D(low, vUv + texel * vec2(0.0, 1.0)).rgb + texture2D(low, vUv).rgb * 2.0;
      gl_FragColor = vec4(texture2D(tex, vUv).rgb + b / 6.0, 1.0);
    }`;
  const finalFrag = `
    uniform sampler2D tex, bloomTex;
    uniform float split, time, aspect, bloom;
    uniform vec4 v0, v1;   // speed, flash, damage, sigma for each half
    varying vec2 vUv;
    vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main() {
      // which player's half is this pixel in?
      bool top = vUv.y > 0.5;
      vec4 fx = (split > 0.5 && !top) ? v1 : v0;
      vec2 c = split > 0.5 ? vec2(0.5, top ? 0.75 : 0.25) : vec2(0.5, 0.52);
      float h = split > 0.5 ? 0.5 : 1.0;
      vec2 fromC = vUv - c;
      vec2 fc = vec2(fromC.x * aspect, fromC.y / h);
      float dist = length(fc);
      float speed = fx.x;
      vec3 col;
      float blur = speed * smoothstep(0.25, 0.85, dist);
      if (blur > 0.002) {
        col = vec3(0.0);
        for (int i = 0; i < 6; i++) { float k = float(i) / 5.0; vec2 uv = vUv - fromC * k * blur * 0.07; if (split > 0.5) uv.y = top ? max(uv.y, 0.5) : min(uv.y, 0.5); col += texture2D(tex, uv).rgb; }
        col /= 6.0;
      } else col = texture2D(tex, vUv).rgb;
      col += texture2D(bloomTex, vUv).rgb * bloom;
      // speed lines
      if (speed > 0.15) {
        float ang = atan(fc.y, fc.x);
        float lines = step(0.992, hash(vec2(floor(ang * 150.0), floor(time * 22.0))));
        col += vec3(1.0) * lines * smoothstep(0.5, 1.0, dist) * (speed - 0.15) * 0.6;
      }
      col = aces(col * 1.02);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, 1.12 + fx.w * 0.4);
      col = (col - 0.5) * 1.05 + 0.5;
      // SIGMA MODE shimmer
      if (fx.w > 0.01) col += fx.w * 0.12 * (0.5 + 0.5 * sin(vec3(0.0, 2.1, 4.2) + time * 8.0 + dist * 10.0));
      // dark edges
      col *= mix(0.62, 1.0, smoothstep(1.05, 0.4, dist));
      // red edges when you get hit, white flash
      col = mix(col, vec3(0.9, 0.08, 0.05), fx.z * smoothstep(0.35, 0.95, dist));
      col += fx.y;
      // the line between two players
      if (split > 0.5 && abs(vUv.y - 0.5) < 0.002) col = vec3(0.0);
      gl_FragColor = vec4(toSRGB(clamp(col, 0.0, 1.0)), 1.0);
    }`;

  function mk(frag, uniforms) { return new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false }); }

  function init(r) {
    renderer = r;
    enabled = HG.settings.gfx !== 'low' && renderer.capabilities.isWebGL2;
    if (!enabled) return;
    const samples = HG.settings.gfx === 'high' ? 4 : 0;
    rtScene = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples, depthBuffer: true });
    for (let i = 0; i < 5; i++) { mips.push(new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false })); spare.push(null); }
    quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quadScene = new THREE.Scene();
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    quad.frustumCulled = false;
    quadScene.add(quad);
    matBright = mk(brightFrag, { tex: { value: null } });
    matDown = mk(downFrag, { tex: { value: null }, texel: { value: new THREE.Vector2() } });
    matUp = mk(upFrag, { tex: { value: null }, low: { value: null }, texel: { value: new THREE.Vector2() } });
    matFinal = mk(finalFrag, { tex: { value: null }, bloomTex: { value: null }, split: { value: 0 }, time: { value: 0 }, aspect: { value: 1 }, bloom: { value: 0.6 }, v0: { value: new THREE.Vector4() }, v1: { value: new THREE.Vector4() } });
    renderer.toneMapping = THREE.NoToneMapping;
  }

  function resize(w, h, pixelRatio) {
    pr = pixelRatio; W = Math.floor(w * pixelRatio); H = Math.floor(h * pixelRatio);
    if (!enabled) return;
    rtScene.setSize(W, H);
    let mw = Math.max(1, W >> 1), mh = Math.max(1, H >> 1);
    for (const m of mips) { m.setSize(mw, mh); mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1); }
    matFinal.uniforms.aspect.value = W / H;
  }

  function pass(mat, target) { quad.material = mat; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); }
  function spareFor(i) {
    if (!spare[i] || spare[i].width !== mips[i].width || spare[i].height !== mips[i].height) {
      if (spare[i]) spare[i].dispose();
      spare[i] = new THREE.WebGLRenderTarget(mips[i].width, mips[i].height, { type: THREE.HalfFloatType, depthBuffer: false });
    }
    return spare[i];
  }

  // list = [{ cam, x, y, w, h, kart }]
  function render(scene, list, dt) {
    time += dt;
    // effect numbers for each player
    list.forEach((v, i) => {
      const f = views[i], k = v.kart;
      const wantSpeed = k ? (k.boosting ? 0.75 : Math.max(0, (k.speedFrac || 0) - 0.95) * 1.5) : 0;
      f.speed = HG.U.damp(f.speed, wantSpeed, 5, dt);
      f.damage = HG.U.damp(f.damage, k && k.hitT > 0 ? 0.55 : 0, 6, dt);
      f.flash = Math.max(0, f.flash - dt * 2.5);
      f.sigma = HG.U.damp(f.sigma, k && k.sigmaT > 0 ? 1 : 0, 4, dt);
    });
    rtScene.scissorTest = true;
    renderer.setRenderTarget(rtScene);
    for (const v of list) {
      rtScene.viewport.set(v.x * pr, v.y * pr, v.w * pr, v.h * pr);
      rtScene.scissor.set(v.x * pr, v.y * pr, v.w * pr, v.h * pr);
      renderer.setRenderTarget(rtScene);
      renderer.clear();
      renderer.render(scene, v.cam);
    }
    rtScene.scissorTest = false;
    rtScene.viewport.set(0, 0, W, H); rtScene.scissor.set(0, 0, W, H);
    // bloom
    matBright.uniforms.tex.value = rtScene.texture;
    pass(matBright, mips[0]);
    for (let i = 1; i < mips.length; i++) {
      matDown.uniforms.tex.value = mips[i - 1].texture;
      matDown.uniforms.texel.value.set(1 / mips[i - 1].width, 1 / mips[i - 1].height);
      pass(matDown, mips[i]);
    }
    for (let i = mips.length - 2; i >= 0; i--) {
      matUp.uniforms.tex.value = mips[i].texture;
      matUp.uniforms.low.value = mips[i + 1].texture;
      matUp.uniforms.texel.value.set(1 / mips[i + 1].width, 1 / mips[i + 1].height);
      const t = spareFor(i);
      pass(matUp, t);
      spare[i] = mips[i]; mips[i] = t;
    }
    const U2 = matFinal.uniforms;
    U2.tex.value = rtScene.texture; U2.bloomTex.value = mips[0].texture;
    U2.split.value = list.length > 1 ? 1 : 0; U2.time.value = time;
    U2.v0.value.set(views[0].speed, views[0].flash, views[0].damage, views[0].sigma);
    U2.v1.value.set(views[1].speed, views[1].flash, views[1].damage, views[1].sigma);
    renderer.setViewport(0, 0, W / pr, H / pr);
    pass(matFinal, null);
  }

  function flash(i, amount = 0.6) { if (views[i]) views[i].flash = Math.max(views[i].flash, amount); }

  return { init, resize, render, flash, get enabled() { return enabled; } };
})();
