// ============================================================
//  SIGMA RUN — SCREEN EFFECTS ("post processing")
//  The 3D picture is drawn into a hidden image first, then we
//  add: glow around bright things (bloom), speed blur, color
//  magic, a dark border (vignette), and the SIGMA MODE look.
// ============================================================
window.SR = window.SR || {};

SR.Post = (function () {
  let renderer, enabled = false, w = 1, h = 1;
  let rtScene, mips = [], quadScene, quadCam, quad;
  let matBright, matDown, matUp, matFinal;
  const fx = {
    bloom: 0.9, speed: 0, aberration: 0, damage: 0, sigma: 0, exposure: 1.0, flash: 0, warmth: 0, saturation: 1.12, time: 0, slowmo: 0,
  };

  const vert = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

  const brightFrag = `
    uniform sampler2D tex; uniform float threshold; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tex, vUv).rgb;
      float l = max(c.r, max(c.g, c.b));
      float k = smoothstep(threshold, threshold + 0.6, l);
      gl_FragColor = vec4(min(c * k, vec3(20.0)), 1.0);
    }`;
  // soft 13-tap-ish downsample
  const downFrag = `
    uniform sampler2D tex; uniform vec2 texel; varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tex, vUv).rgb * 4.0;
      c += texture2D(tex, vUv + texel * vec2(-1.0, -1.0)).rgb;
      c += texture2D(tex, vUv + texel * vec2( 1.0, -1.0)).rgb;
      c += texture2D(tex, vUv + texel * vec2(-1.0,  1.0)).rgb;
      c += texture2D(tex, vUv + texel * vec2( 1.0,  1.0)).rgb;
      gl_FragColor = vec4(c / 8.0, 1.0);
    }`;
  const upFrag = `
    uniform sampler2D tex; uniform sampler2D low; uniform vec2 texel; varying vec2 vUv;
    void main() {
      vec3 b = vec3(0.0);
      b += texture2D(low, vUv + texel * vec2(-1.0, 0.0)).rgb;
      b += texture2D(low, vUv + texel * vec2( 1.0, 0.0)).rgb;
      b += texture2D(low, vUv + texel * vec2(0.0, -1.0)).rgb;
      b += texture2D(low, vUv + texel * vec2(0.0,  1.0)).rgb;
      b += texture2D(low, vUv).rgb * 2.0;
      gl_FragColor = vec4(texture2D(tex, vUv).rgb + b / 6.0, 1.0);
    }`;
  const finalFrag = `
    uniform sampler2D tex, bloomTex;
    uniform float bloom, speed, aberration, damage, sigma, exposure, flash, time, saturation, warmth, slowmo, aspect;
    varying vec2 vUv;
    vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    vec3 toSRGB(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main() {
      vec2 uv = vUv;
      vec2 fromC = uv - 0.5;
      float dist = length(fromC * vec2(aspect, 1.0));
      // speed blur: smear the edges toward the middle when you go fast
      vec3 col;
      float blur = speed * smoothstep(0.15, 0.75, dist);
      if (blur > 0.002) {
        col = vec3(0.0);
        for (int i = 0; i < 8; i++) {
          float k = float(i) / 7.0;
          col += texture2D(tex, uv - fromC * k * blur * 0.06).rgb;
        }
        col /= 8.0;
      } else col = texture2D(tex, uv).rgb;
      // colorful edges (chromatic aberration)
      if (aberration > 0.001) {
        vec2 off = fromC * aberration * 0.006;
        col.r = texture2D(tex, uv + off).r;
        col.b = texture2D(tex, uv - off).b;
      }
      col += texture2D(bloomTex, uv).rgb * bloom;
      col *= exposure;
      // speed lines
      if (speed > 0.25) {
        float ang = atan(fromC.y, fromC.x);
        float lines = step(0.993, hash(vec2(floor(ang * 160.0), floor(time * 24.0))));
        col += vec3(1.0) * lines * smoothstep(0.45, 0.9, dist) * (speed - 0.25) * 0.35;
      }
      col = aces(col);
      // color grading
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, saturation);
      col = mix(col, col * vec3(1.06, 1.0, 0.92), warmth);
      col = (col - 0.5) * 1.06 + 0.5;
      // SIGMA MODE: black and white, but gold stays gold
      if (sigma > 0.001) {
        float goldness = smoothstep(0.08, 0.3, col.r - col.b) * smoothstep(0.25, 0.5, col.g);
        vec3 bw = vec3(pow(lum, 1.25) * 1.15);
        vec3 sig = mix(bw, col * vec3(1.25, 1.05, 0.5), goldness);
        col = mix(col, sig, sigma);
      }
      // slow motion: a bit of blue
      col = mix(col, col * vec3(0.85, 0.95, 1.15), slowmo * 0.5);
      // dark edges
      float vig = smoothstep(0.95, 0.35, dist);
      col *= mix(0.55, 1.0, vig);
      // red edges when you get hit
      col = mix(col, vec3(0.9, 0.05, 0.05), damage * smoothstep(0.25, 0.8, dist));
      col += flash;
      // film grain
      col += (hash(uv * 900.0 + time) - 0.5) * 0.03;
      gl_FragColor = vec4(toSRGB(clamp(col, 0.0, 1.0)), 1.0);
    }`;

  function mk(frag, uniforms) {
    return new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  }

  function init(r) {
    renderer = r;
    enabled = SR.settings.gfx !== 'low';
    if (!enabled) return;
    const isWebGL2 = renderer.capabilities.isWebGL2;
    const samples = isWebGL2 ? (SR.settings.gfx === 'ultra' ? 8 : SR.settings.gfx === 'high' ? 4 : 0) : 0;
    rtScene = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples, depthBuffer: true });
    for (let i = 0; i < 5; i++) {
      mips.push(new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: false }));
    }
    quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quadScene = new THREE.Scene();
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    quad.frustumCulled = false;
    quadScene.add(quad);
    matBright = mk(brightFrag, { tex: { value: null }, threshold: { value: 1.0 } });
    matDown = mk(downFrag, { tex: { value: null }, texel: { value: new THREE.Vector2() } });
    matUp = mk(upFrag, { tex: { value: null }, low: { value: null }, texel: { value: new THREE.Vector2() } });
    const u = { tex: { value: null }, bloomTex: { value: null }, aspect: { value: 1 } };
    for (const k in fx) u[k] = { value: fx[k] };
    matFinal = mk(finalFrag, u);
  }

  function resize(width, height, pixelRatio) {
    w = Math.floor(width * pixelRatio); h = Math.floor(height * pixelRatio);
    if (!enabled) return;
    rtScene.setSize(w, h);
    let mw = Math.max(1, w >> 1), mh = Math.max(1, h >> 1);
    for (const m of mips) { m.setSize(mw, mh); mw = Math.max(1, mw >> 1); mh = Math.max(1, mh >> 1); }
    matFinal.uniforms.aspect.value = w / h;
  }

  function pass(mat, target) {
    quad.material = mat;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  }

  // draw everything: drawScene() renders the 3D world into whatever target is set
  function render(drawScene) {
    if (!enabled) {
      renderer.setRenderTarget(null);
      renderer.clear();
      drawScene();
      return;
    }
    renderer.setRenderTarget(rtScene);
    renderer.clear();
    drawScene();
    // bloom: keep the bright parts, shrink them a few times, then grow them back blurry
    matBright.uniforms.tex.value = rtScene.texture;
    pass(matBright, mips[0]);
    for (let i = 1; i < mips.length; i++) {
      matDown.uniforms.tex.value = mips[i - 1].texture;
      matDown.uniforms.texel.value.set(1 / mips[i - 1].width, 1 / mips[i - 1].height);
      pass(matDown, mips[i]);
    }
    for (let i = mips.length - 2; i >= 0; i--) {
      // add the smaller (blurrier) picture onto the bigger one
      matUp.uniforms.tex.value = mips[i].texture;
      matUp.uniforms.low.value = mips[i + 1].texture;
      matUp.uniforms.texel.value.set(1 / mips[i + 1].width, 1 / mips[i + 1].height);
      pass(matUp, upTargets(i));
      swapUp(i);
    }
    const U2 = matFinal.uniforms;
    U2.tex.value = rtScene.texture; U2.bloomTex.value = mips[0].texture;
    for (const k in fx) U2[k].value = fx[k];
    pass(matFinal, null);
  }

  // (a picture can't be read and written at the same time, so we keep spare copies)
  const spare = [];
  function upTargets(i) {
    if (!spare[i] || spare[i].width !== mips[i].width || spare[i].height !== mips[i].height) {
      if (spare[i]) spare[i].dispose();
      spare[i] = new THREE.WebGLRenderTarget(mips[i].width, mips[i].height, { type: THREE.HalfFloatType, depthBuffer: false });
    }
    return spare[i];
  }
  function swapUp(i) { const t = mips[i]; mips[i] = spare[i]; spare[i] = t; }

  return { init, resize, render, fx, get enabled() { return enabled; } };
})();
