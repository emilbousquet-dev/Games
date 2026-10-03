// ============================================================
//  SIGMA RUN — THE FBI IS AFTER YOU!
//  ★     agents pop up on the roofs ("FREEZE!")
//  ★★    a helicopter with a spotlight follows you
//  ★★★   the helicopter fires MISSILES (watch for red rings!)
//  ★★★★  attack drones
//  ★★★★★ everything, faster
//  Grab a 🚀 ROCKET LAUNCHER and shoot back!
// ============================================================
window.SR = window.SR || {};

SR.FBI = (function () {
  const U = SR.U;
  let scene, M;
  const agents = [], missiles = [], drones = [], rockets = [];
  let heli = null, heliTimer = 0, missileTimer = 0, droneTimer = 0, megaTimer = 0;
  const cb = { knock() {}, hit() {}, heliDown() {}, heliCrash() {}, nearMiss() {}, droneKill() {}, heliHit() {}, say() {}, boom() {} };
  const SAY = ['FREEZE!', 'FBI! OPEN UP!', 'STOP RIGHT THERE!', 'GET HIM!', 'HANDS UP!', 'YOU CAN\'T ESCAPE!', 'HE\'S TOO FAST!', 'NOT SO FAST!'];

  // ------------------------------------------------------------
  //  AGENT MODEL (black suit, sunglasses, FBI on the back)
  // ------------------------------------------------------------
  let agentMats;
  function agentModel() {
    if (!agentMats) {
      agentMats = {
        suit: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6 }),
        shirt: new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7 }),
        tie: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.5 }),
        skin: new THREE.MeshStandardMaterial({ color: 0xd9a27a, roughness: 0.7 }),
        skin2: new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: 0.7 }),
        hair: new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.9 }),
        glasses: new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.9, roughness: 0.1 }),
        shoe: new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.3, metalness: 0.4 }),
        letters: new THREE.MeshBasicMaterial({ map: SR.Tex.T.fbi, transparent: true, color: new THREE.Color(1.4, 1.4, 1.4) }),
      };
    }
    const A = agentMats;
    const g = new THREE.Group();
    const body = new THREE.Group(); g.add(body);
    const mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; };
    const torso = mk(new THREE.CapsuleGeometry(0.24, 0.42, 4, 10), A.suit, 0, 1.22, 0); torso.scale.set(1.15, 1, 0.75);
    const shirt = mk(new THREE.PlaneGeometry(0.16, 0.36), A.shirt, 0, 1.36, -0.185); shirt.rotation.y = Math.PI;
    const tie = mk(new THREE.PlaneGeometry(0.05, 0.3), A.tie, 0, 1.34, -0.19); tie.rotation.y = Math.PI;
    const letters = mk(new THREE.PlaneGeometry(0.42, 0.21), A.letters, 0, 1.33, 0.19);
    const skinMat = Math.random() < 0.5 ? A.skin : A.skin2;
    const head = mk(new THREE.SphereGeometry(0.15, 14, 10), skinMat, 0, 1.73, 0); head.scale.set(1, 1.12, 1);
    const hair = mk(new THREE.SphereGeometry(0.155, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), A.hair, 0, 1.76, 0.01);
    const glasses = mk(new THREE.BoxGeometry(0.26, 0.05, 0.04), A.glasses, 0, 1.75, -0.135);
    const ear = mk(new THREE.SphereGeometry(0.02, 6, 4), A.tie, 0.15, 1.72, 0);
    body.add(torso, shirt, tie, letters, head, hair, glasses, ear);
    const limb = (x, y, len, r, mat, handMat) => {
      const p = new THREE.Group(); p.position.set(x, y, 0);
      const l = mk(new THREE.CapsuleGeometry(r, len, 4, 8), mat, 0, -len / 2 - r, 0); p.add(l);
      if (handMat) { const h = mk(new THREE.SphereGeometry(r * 0.95, 8, 6), handMat, 0, -len - r * 2, 0); p.add(h); }
      else { const s = mk(new THREE.BoxGeometry(r * 2.2, r * 1.4, r * 3.6), A.shoe, 0, -len - r * 1.8, -r * 0.8); p.add(s); }
      body.add(p);
      return p;
    };
    const legL = limb(-0.12, 0.9, 0.62, 0.085, A.suit), legR = limb(0.12, 0.9, 0.62, 0.085, A.suit);
    const armL = limb(-0.33, 1.5, 0.5, 0.07, A.suit, skinMat), armR = limb(0.33, 1.5, 0.5, 0.07, A.suit, skinMat);
    // speech bubble
    const bubbleCanvas = document.createElement('canvas'); bubbleCanvas.width = 512; bubbleCanvas.height = 160;
    const bubbleTex = new THREE.CanvasTexture(bubbleCanvas); bubbleTex.colorSpace = THREE.SRGBColorSpace;
    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, depthTest: false, transparent: true }));
    bubble.scale.set(2.6, 0.81, 1); bubble.position.y = 2.45; bubble.visible = false; bubble.renderOrder = 20;
    g.add(bubble);
    return { g, body, legL, legR, armL, armR, bubble, bubbleCanvas, bubbleTex };
  }
  function say(a, text) {
    const c = a.m.bubbleCanvas, g = c.getContext('2d');
    g.clearRect(0, 0, 512, 160);
    g.fillStyle = '#fff'; g.strokeStyle = '#111'; g.lineWidth = 8;
    U.rrect(g, 8, 8, 496, 110, 30); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(230, 114); g.lineTo(256, 152); g.lineTo(282, 114); g.fill();
    g.font = '900 64px Impact, Arial Black'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#d01818'; g.fillText(text, 256, 66, 470);
    a.m.bubbleTex.needsUpdate = true;
    a.m.bubble.visible = true; a.sayT = 1.6;
  }

  // ------------------------------------------------------------
  //  HELICOPTER MODEL
  // ------------------------------------------------------------
  function heliModel() {
    const g = new THREE.Group();
    const black = new THREE.MeshStandardMaterial({ color: 0x0d0e12, metalness: 0.8, roughness: 0.3 });
    const glassM = new THREE.MeshStandardMaterial({ color: 0x0a2040, metalness: 0.9, roughness: 0.05, emissive: 0x08203a, envMapIntensity: 2 });
    const grey = new THREE.MeshStandardMaterial({ color: 0x33363c, metalness: 0.7, roughness: 0.4 });
    const add = (geo, mat, x, y, z, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
    const body = add(new THREE.SphereGeometry(1.6, 20, 14), black, 0, 0, 0); body.scale.set(1, 0.9, 1.9);
    const glass = add(new THREE.SphereGeometry(1.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), glassM, 0, 0.1, -1.6); glass.scale.set(1, 0.8, 1); glass.rotation.x = -Math.PI / 2 + 0.3;
    const boom = add(new THREE.CylinderGeometry(0.22, 0.45, 6, 10), black, 0, 0.3, 4.5); boom.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.15, 1.8, 1.1), black, 0, 1.0, 7.3);
    add(new THREE.BoxGeometry(2, 0.1, 0.6), black, 0, 0.5, 7.0);
    const tailRotor = new THREE.Group(); tailRotor.position.set(0.2, 1.1, 7.5); g.add(tailRotor);
    add(new THREE.BoxGeometry(0.05, 1.6, 0.15), grey, 0, 0, 0, tailRotor);
    add(new THREE.BoxGeometry(0.05, 0.15, 1.6), grey, 0, 0, 0, tailRotor);
    add(new THREE.CylinderGeometry(0.3, 0.4, 0.5, 10), grey, 0, 1.55, 0);
    const rotor = new THREE.Group(); rotor.position.set(0, 1.85, 0); g.add(rotor);
    for (let i = 0; i < 4; i++) { const b = add(new THREE.BoxGeometry(0.3, 0.05, 6), grey, 0, 0, 0, rotor); b.rotation.y = i * Math.PI / 2; b.position.set(Math.sin(i * Math.PI / 2) * 3, 0, Math.cos(i * Math.PI / 2) * 3); }
    const disc = new THREE.Mesh(new THREE.CircleGeometry(6.2, 32), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 1.86; g.add(disc);
    for (const sx of [-1, 1]) {
      add(new THREE.BoxGeometry(0.1, 0.1, 3.4), grey, sx * 1.1, -1.55, 0);
      add(new THREE.BoxGeometry(0.08, 0.6, 0.08), grey, sx * 1.0, -1.25, -0.8);
      add(new THREE.BoxGeometry(0.08, 0.6, 0.08), grey, sx * 1.0, -1.25, 0.8);
      // missile pods
      add(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 10), grey, sx * 1.9, -0.5, -0.2).rotation.x = Math.PI / 2;
      add(new THREE.BoxGeometry(0.9, 0.08, 0.3), grey, sx * 1.4, -0.3, -0.2);
      // FBI letters
      const l = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.95), new THREE.MeshBasicMaterial({ map: SR.Tex.T.fbiWhite, transparent: true, depthWrite: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
      l.position.set(sx * 1.62, -0.05, 0.6); l.rotation.y = sx * Math.PI / 2; g.add(l);
    }
    const red = add(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 0.3, 0.3) }), -1.6, -0.2, -0.5);
    const blue = add(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.6, 9) }), 1.6, -0.2, -0.5);
    const strobe = add(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 9, 9) }), 0, 1.6, 7.4);
    // the searchlight
    const spot = new THREE.SpotLight(0xfff2d8, 0, 120, 0.22, 0.6, 1);
    spot.position.set(0, -1.3, -2.5); g.add(spot); g.add(spot.target);
    const coneMat = new THREE.ShaderMaterial({
      uniforms: { strength: { value: 0.35 } },
      vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV;
        void main() { vY = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float strength; varying float vY; varying vec3 vN; varying vec3 vV;
        void main() { float edge = pow(abs(dot(vN, vV)), 1.5); float a = pow(vY, 1.6) * edge * strength; gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * a, 1.0); }`,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const coneGeo = new THREE.CylinderGeometry(0.35, 7, 40, 24, 1, true); coneGeo.translate(0, -20, 0);
    const cone = new THREE.Mesh(coneGeo, coneMat); cone.position.copy(spot.position); g.add(cone);
    const lamp = add(new THREE.SphereGeometry(0.25, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 8, 7) }), 0, -1.3, -2.5);
    g.traverse((o) => { if (o.material && o.material.transparent) o.castShadow = false; });
    cone.castShadow = false; disc.castShadow = false;
    return { g, rotor, tailRotor, red, blue, strobe, spot, cone, coneMat, lamp };
  }

  function droneModel() {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1c22, metalness: 0.8, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.7), dark); g.add(body);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark); dome.position.y = 0.1; g.add(dome);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 0.4, 0.3) }));
    eye.position.set(0, -0.02, -0.36); g.add(eye);
    const props = [];
    for (const [x, z] of [[-0.55, -0.55], [0.55, -0.55], [-0.55, 0.55], [0.55, 0.55]]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.8), dark); arm.position.set(x / 2, 0, z / 2); arm.rotation.y = Math.atan2(x, z); g.add(arm);
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 14), new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.4, depthWrite: false }));
      p.position.set(x, 0.1, z); g.add(p); props.push(p);
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: SR.Tex.T.glow, color: 0xff2020, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    glow.scale.set(1.6, 1.6, 1); glow.position.copy(eye.position); g.add(glow);
    g.traverse((o) => { if (o.isMesh && !o.material.transparent) o.castShadow = true; });
    return { g, eye, glow, props };
  }

  function missileModel() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 1.4, 10), new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.5, roughness: 0.4 }));
    body.rotation.x = Math.PI / 2; g.add(body);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.35, 10), new THREE.MeshStandardMaterial({ color: 0xc02020, roughness: 0.5 }));
    nose.rotation.x = -Math.PI / 2; nose.position.z = -0.87; g.add(nose);
    for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.3), body.material); f.position.z = 0.55; f.rotation.z = i * Math.PI / 2; f.position.x = Math.sin(i * Math.PI / 2) * 0.15; f.position.y = Math.cos(i * Math.PI / 2) * 0.15; g.add(f); }
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: SR.Tex.T.glow, color: new THREE.Color(4, 2, 0.6), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    flame.scale.set(1.6, 1.6, 1); flame.position.z = 0.9; g.add(flame);
    return g;
  }

  function init(sc) {
    scene = sc; M = SR.Mats.M;
    for (let i = 0; i < 10; i++) {
      const m = agentModel();
      m.g.visible = false; scene.add(m.g);
      agents.push({ m, state: 'off', x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, spin: new THREE.Vector3(), t: 0, sayT: 0, phase: Math.random() * 6 });
    }
    for (let i = 0; i < 8; i++) {
      const g = missileModel(); g.visible = false; scene.add(g);
      const ring = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), new THREE.MeshBasicMaterial({ map: SR.Tex.T.target, transparent: true, depthWrite: false, color: new THREE.Color(3, 0.4, 0.4), polygonOffset: true, polygonOffsetFactor: -4 }));
      ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);
      missiles.push({ g, ring, on: false });
    }
    for (let i = 0; i < 5; i++) {
      const d = droneModel(); d.g.visible = false; scene.add(d.g);
      drones.push({ m: d, on: false });
    }
    for (let i = 0; i < 6; i++) {
      const g = missileModel(); g.scale.setScalar(0.8); g.visible = false; scene.add(g);
      rockets.push({ g, on: false, vel: new THREE.Vector3(), t: 0, target: null });
    }
  }

  function reset() {
    for (const a of agents) { a.state = 'off'; a.m.g.visible = false; }
    for (const m of missiles) { m.on = false; m.g.visible = false; m.ring.visible = false; }
    for (const d of drones) { d.on = false; d.m.g.visible = false; }
    for (const r of rockets) { r.on = false; r.g.visible = false; }
    if (heli) { scene.remove(heli.m.g); heli = null; }
    heliTimer = 0; missileTimer = 3; droneTimer = 4; megaTimer = 0;
    for (const s of SR.Level.segs) s.agentsSpawned = false;
  }

  // ------------------------------------------------------------
  //  AGENTS
  // ------------------------------------------------------------
  function spawnAgents(P, wanted) {
    if (wanted < 1) return;
    for (const s of SR.Level.segs) {
      if (s.agentsSpawned || !s.roof) continue;
      if (s.zStart > P.pos.z - 50 || s.zStart < P.pos.z - 140) continue;
      s.agentsSpawned = true;
      if (Math.random() > 0.45 + wanted * 0.1) continue;
      const n = Math.min(s.spawns.length, U.randInt(1, 1 + Math.ceil(wanted / 2)));
      const spots = s.spawns.slice().sort(() => Math.random() - 0.5).slice(0, n);
      for (const sp of spots) {
        const a = agents.find((q) => q.state === 'off');
        if (!a) return;
        a.state = 'hidden'; a.x = sp.x; a.y = sp.y; a.z = sp.z; a.roofY = sp.roofTop; a.x0 = sp.x0; a.x1 = sp.x1;
        a.z0 = s.roof.z0 + 1; a.z1 = s.roof.z1 - 1;
        a.t = 0; a.vx = a.vz = a.vy = 0; a.rise = 0;
        a.m.g.visible = false; a.m.g.position.set(a.x, a.y - 1.2, a.z); a.m.g.rotation.set(0, 0, 0); a.m.body.rotation.set(0, 0, 0);
        a.m.bubble.visible = false;
      }
    }
  }

  function knockAgent(a, P, how) {
    a.state = 'flying'; a.t = 0;
    const d = new THREE.Vector3(a.x - P.pos.x, 0, a.z - P.pos.z);
    if (d.lengthSq() < 0.01) d.set(0, 0, -1);
    d.normalize();
    const pv = new THREE.Vector3(P.vel.x, 0, P.vel.z);
    if (how === 'stomp') { a.vx = pv.x * 0.2; a.vz = pv.z * 0.2; a.vy = -2; a.squash = 1; }
    else { a.vx = d.x * 9 + pv.x * 0.7; a.vz = d.z * 9 + pv.z * 0.7; a.vy = U.rand(7, 10); }
    a.spin.set(U.rand(-9, 9), U.rand(-6, 6), U.rand(-9, 9));
    a.m.bubble.visible = false;
    SR.FX.stars(a.x, a.y + 1.8, a.z);
    cb.knock(how, a);
  }

  function updateAgents(dt, P, opts) {
    for (const a of agents) {
      if (a.state === 'off') continue;
      const m = a.m;
      a.t += dt;
      if (a.sayT > 0) { a.sayT -= dt; if (a.sayT <= 0) m.bubble.visible = false; }
      if (a.state === 'flying') {
        a.vy -= 22 * dt;
        a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
        if (a.squash) { m.g.scale.set(1.4, 0.25, 1.4); if (a.y < a.roofY) { a.y = a.roofY; a.vy = 0; } }
        else { m.body.rotation.x += a.spin.x * dt; m.body.rotation.z += a.spin.z * dt; m.g.rotation.y += a.spin.y * dt; }
        m.g.position.set(a.x, a.y, a.z);
        if (a.t > 3) { a.state = 'off'; m.g.visible = false; m.g.scale.set(1, 1, 1); a.squash = 0; }
        continue;
      }
      const dz = a.z - P.pos.z, dx = P.pos.x - a.x;
      const dist = Math.hypot(dx, dz);
      if (a.state === 'hidden') {
        // crouched behind something... until you get close
        m.g.position.set(a.x, a.y - 1.2, a.z);
        if (dist < 34 && dz < 0) {
          a.state = 'pop'; a.t = 0; m.g.visible = true;
          SR.FX.dust(a.x, a.y, a.z, 10, 1.5);
          if (megaTimer <= 0) { cb.say(a); megaTimer = 2.5; }
          say(a, U.pick(SAY));
        }
        if (P.pos.z < a.z - 30) { a.state = 'off'; m.g.visible = false; }
        continue;
      }
      if (a.state === 'pop') {
        // jump up!
        const k = Math.min(1, a.t / 0.35);
        m.g.position.set(a.x, a.y - 1.2 * (1 - k) + Math.sin(k * Math.PI) * 0.4, a.z);
        m.armR.rotation.x = k * 1.6; m.armL.rotation.x = k * 0.3;
        m.g.rotation.y = Math.atan2(-dx, dz);
        if (k >= 1) { a.state = 'chase'; a.t = 0; }
        continue;
      }
      // chase: run to get in your way
      const ahead = P.pos.z - Math.min(dist, 10) * 0.5;
      const tx = U.clamp(P.pos.x, a.x0, a.x1), tz = U.clamp(dz < -1 ? ahead : P.pos.z, a.z0, a.z1);
      let mx = tx - a.x, mz = tz - a.z;
      const ml = Math.hypot(mx, mz);
      const sp = opts.slowmo ? 3.2 : 6.6;
      if (ml > 0.2) { mx /= ml; mz /= ml; a.x += mx * sp * dt; a.z += mz * sp * dt; }
      a.x = U.clamp(a.x, a.x0, a.x1); a.z = U.clamp(a.z, a.z0, a.z1);
      const g = SR.Level.groundAt(a.x, a.z, a.roofY + 1.3);
      a.y = U.damp(a.y, isFinite(g) ? g : a.roofY, 20, dt);
      m.g.position.set(a.x, a.y, a.z);
      m.g.rotation.y = Math.atan2(-(P.pos.x - a.x), -(P.pos.z - a.z));
      // running legs and arms
      a.phase += dt * 11;
      const sw = Math.sin(a.phase) * (ml > 0.2 ? 0.8 : 0.1);
      m.legL.rotation.x = sw; m.legR.rotation.x = -sw;
      m.armL.rotation.x = -sw * 0.8; m.armR.rotation.x = ml > 0.2 ? sw * 0.8 : 1.5;
      m.body.position.y = Math.abs(Math.cos(a.phase)) * 0.06;
      // touching you?
      const vy = P.pos.y - a.y;
      if (dist < 0.85 && vy > -1.6 && vy < 1.9) {
        if (vy > 1.1 && P.vel.y < 1) { knockAgent(a, P, 'stomp'); P.vel.y = 10; continue; }
        if (P.sliding || P.boost > 0 || opts.sigma) { knockAgent(a, P, P.sliding ? 'slide' : 'smash'); continue; }
        knockAgent(a, P, 'tackled');
        cb.hit('agent', new THREE.Vector3(-dx, 0, -dz).normalize());
        continue;
      }
      // left far behind
      if (P.pos.z < a.z - 40) { a.state = 'off'; m.g.visible = false; }
    }
  }

  // ------------------------------------------------------------
  //  HELICOPTER
  // ------------------------------------------------------------
  function spawnHeli(P) {
    const m = heliModel();
    scene.add(m.g);
    m.g.rotation.order = 'YXZ';
    heli = { m, hp: 3, state: 'arrive', t: 0, pos: new THREE.Vector3(P.pos.x + 40, P.pos.y + 45, P.pos.z + 70), vel: new THREE.Vector3(), side: 1, sideT: 0, crashSpin: 0, smokeT: 0 };
    m.g.position.copy(heli.pos);
  }
  function updateHeli(dt, P, wanted, time, opts) {
    if (!heli) {
      if (wanted >= 2) { heliTimer -= dt; if (heliTimer <= 0) spawnHeli(P); }
      return;
    }
    const h = heli, m = h.m;
    h.t += dt;
    m.rotor.rotation.y += dt * 28; m.tailRotor.rotation.x += dt * 40;
    const blink = Math.sin(time * 10) > 0;
    m.red.visible = blink; m.blue.visible = !blink; m.strobe.visible = Math.sin(time * 6) > 0.85;
    const night = SR.Env.time;
    m.spot.intensity = U.lerp(2, 9, night);
    m.coneMat.uniforms.strength.value = U.lerp(0.12, 0.4, night);
    if (h.state === 'crash') {
      h.vel.y -= 14 * dt;
      h.pos.addScaledVector(h.vel, dt);
      h.crashSpin += dt * 6;
      m.g.rotation.y += dt * 5; m.g.rotation.z = Math.sin(h.t * 3) * 0.4;
      SR.FX.trail(h.pos.x, h.pos.y, h.pos.z, 3);
      if (Math.random() < 0.3) SR.FX.emit('add', { x: h.pos.x, y: h.pos.y, z: h.pos.z, vx: U.rand(-3, 3), vy: U.rand(-1, 3), vz: U.rand(-3, 3), life: 0.4, size: 3, size1: 6, r: 4, g: 1.6, b: 0.3 });
      const ground = SR.Level.groundAt(h.pos.x, h.pos.z);
      if (h.pos.y < (isFinite(ground) ? ground + 1 : 2) || h.t > 4) {
        SR.FX.explosion(h.pos, 2.4);
        const dd = h.pos.distanceTo(P.pos);
        SR.Audio.S.explosion(U.clamp(60 / dd, 0.3, 1.3));
        scene.remove(m.g); heli = null; heliTimer = 18;
        cb.heliCrash && cb.heliCrash(dd);
      }
      m.g.position.copy(h.pos);
      return;
    }
    // fly next to you, a bit ahead, swinging from side to side
    h.sideT -= dt;
    if (h.sideT <= 0) { h.side = -h.side; h.sideT = U.rand(5, 9); }
    const fwd = SR.Player.fwdVec(0);
    const tgt = new THREE.Vector3(P.pos.x + h.side * 9, P.safeY + 24 + Math.sin(time * 0.7) * 2, P.pos.z + fwd.z * 32 - 4);
    if (h.state === 'arrive' && h.pos.distanceTo(tgt) < 10) h.state = 'hunt';
    const k = h.state === 'arrive' ? 1.2 : 1.8;
    const nx = U.damp(h.pos.x, tgt.x, k, dt), ny = U.damp(h.pos.y, tgt.y, k, dt), nz = U.damp(h.pos.z, tgt.z, k * 1.4, dt);
    h.vel.set((nx - h.pos.x) / dt, (ny - h.pos.y) / dt, (nz - h.pos.z) / dt);
    h.pos.set(nx, ny, nz);
    m.g.position.copy(h.pos);
    // look toward you, lean into the turn
    const look = Math.atan2(-(P.pos.x - h.pos.x), -(P.pos.z - h.pos.z));
    m.g.rotation.y += U.angleDiff(m.g.rotation.y, look) * (1 - Math.exp(-3 * dt));
    m.g.rotation.z = U.clamp(-h.vel.x * 0.02, -0.35, 0.35);
    m.g.rotation.x = U.clamp(h.vel.z * 0.012, -0.3, 0.3);
    // point the searchlight at you
    const target = m.g.worldToLocal(P.pos.clone().add(new THREE.Vector3(0, 0.5, 0)));
    m.spot.target.position.copy(target);
    const dirL = target.clone().sub(m.spot.position).normalize();
    m.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dirL);
    if (h.hp < 3) {
      h.smokeT -= dt;
      if (h.smokeT <= 0) { h.smokeT = h.hp === 1 ? 0.03 : 0.08; SR.FX.emit('smoke', { x: h.pos.x, y: h.pos.y + 1, z: h.pos.z + 1, vx: 0, vy: 2, vz: 4, life: 2, size: 1.5, size1: 5, r: 0.12, g: 0.12, b: 0.12, alpha: 0.7 }); }
    }
    // shoot missiles
    if (wanted >= 3 && h.state === 'hunt' && !opts.noMissiles) {
      missileTimer -= dt * (opts.slowmo ? 0.4 : 1);
      if (missileTimer <= 0) {
        missileTimer = wanted >= 5 ? 2.3 : wanted >= 4 ? 3.2 : 4.4;
        fireMissile(P, h.pos.clone().add(new THREE.Vector3(h.side > 0 ? -1.9 : 1.9, -0.6, 0)));
        if (wanted >= 5) setTimeout(() => { if (heli && heli.state === 'hunt') fireMissile(P, heli.pos.clone(), 0.6); }, 450);
      }
    }
  }
  function heliPan(P, camera) {
    if (!heli) return 0;
    const v = heli.pos.clone().sub(camera.position).normalize();
    const r = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    return v.dot(r);
  }

  // ------------------------------------------------------------
  //  MISSILES (from the helicopter)
  // ------------------------------------------------------------
  function fireMissile(P, from, extraTime = 0) {
    const m = missiles.find((q) => !q.on);
    if (!m) return;
    const T = 1.9 + extraTime;
    const hv = new THREE.Vector3(P.vel.x, 0, P.vel.z);
    if (hv.length() > 16) hv.setLength(16);
    const tx = P.pos.x + hv.x * T * 0.92 + U.rand(-1.5, 1.5), tz = P.pos.z + hv.z * T * 0.92;
    let ty = SR.Level.groundAt(tx, tz, P.pos.y + 4);
    if (!isFinite(ty) || ty < P.pos.y - 8) ty = P.pos.y;
    m.on = true; m.t = 0; m.T = T;
    m.from = from.clone(); m.to = new THREE.Vector3(tx, ty + 0.4, tz);
    m.mid = m.from.clone().lerp(m.to, 0.5).add(new THREE.Vector3(0, 9, 0));
    m.g.visible = true; m.g.position.copy(from);
    m.ring.visible = true; m.ring.position.set(tx, ty + 0.06, tz); m.ring.scale.setScalar(1.6);
    m.beep = 0; m.near = false;
    SR.Audio.S.missileLaunch(0);
  }
  function updateMissiles(dt, P, opts) {
    for (const m of missiles) {
      if (!m.on) continue;
      m.t += dt * (opts.slowmo ? 0.45 : 1);
      const k = Math.min(1, m.t / m.T);
      // a curved path (up and over, then down onto the target)
      const a = m.from.clone().lerp(m.mid, k), b = m.mid.clone().lerp(m.to, k);
      const p = a.lerp(b, k);
      const prev = m.g.position.clone();
      m.g.position.copy(p);
      if (p.distanceToSquared(prev) > 1e-6) { m.g.lookAt(p.clone().add(p.clone().sub(prev))); m.g.rotateY(Math.PI); }
      SR.FX.trail(p.x, p.y, p.z, 1);
      // the ring on the ground pulses faster as the missile gets close
      const pulse = 1 + Math.sin(m.t * (8 + k * 20)) * 0.12;
      m.ring.scale.setScalar(pulse * (1.25 - k * 0.25));
      m.ring.rotation.z += dt * 2;
      m.beep -= dt;
      if (m.beep <= 0) { m.beep = U.lerp(0.45, 0.1, k); if (P.pos.distanceTo(m.to) < 25) SR.Audio.S.warning(); }
      // hit something on the way? (a missile passing near you also explodes)
      const close = p.distanceTo(new THREE.Vector3(P.pos.x, P.pos.y + 1, P.pos.z));
      if (k >= 1 || (k > 0.5 && close < 1.6)) {
        explode(m, p, P);
      }
    }
  }
  function explode(m, p, P) {
    m.on = false; m.g.visible = false; m.ring.visible = false;
    SR.FX.explosion(p, 1.2);
    const d = p.distanceTo(new THREE.Vector3(P.pos.x, P.pos.y + 0.9, P.pos.z));
    SR.Audio.S.explosion(U.clamp(25 / d, 0.4, 1.2));
    cb.boom(d);
    if (d < 3.4) cb.hit('missile', new THREE.Vector3(P.pos.x - p.x, 0, P.pos.z - p.z).normalize());
    else if (d < 7) cb.nearMiss();
    // agents nearby get blasted too
    for (const a of agents) if ((a.state === 'chase' || a.state === 'pop') && Math.hypot(a.x - p.x, a.z - p.z) < 4) knockAgent(a, P, 'boom');
  }

  // ------------------------------------------------------------
  //  DRONES
  // ------------------------------------------------------------
  function updateDrones(dt, P, wanted, time, opts) {
    if (wanted >= 4 && !opts.noDrones) {
      droneTimer -= dt;
      if (droneTimer <= 0) {
        droneTimer = wanted >= 5 ? U.rand(4, 6) : U.rand(6, 9);
        const d = drones.find((q) => !q.on);
        if (d) {
          d.on = true; d.state = 'come'; d.t = 0;
          d.pos = new THREE.Vector3(P.pos.x + U.rand(-15, 15), P.pos.y + U.rand(6, 12), P.pos.z - U.rand(60, 80));
          d.vel = new THREE.Vector3();
          d.off = U.rand(-3, 3);
          d.m.g.visible = true;
        }
      }
    }
    for (const d of drones) {
      if (!d.on) continue;
      d.t += dt * (opts.slowmo ? 0.4 : 1);
      const head = new THREE.Vector3(P.pos.x, P.pos.y + 1.3, P.pos.z);
      for (const p of d.m.props) p.rotation.y += dt * 40;
      if (d.state === 'come') {
        const tgt = head.clone().add(new THREE.Vector3(d.off, 2.2, -12));
        d.pos.x = U.damp(d.pos.x, tgt.x, 2.5, dt); d.pos.y = U.damp(d.pos.y, tgt.y, 2.5, dt); d.pos.z = U.damp(d.pos.z, tgt.z, 3, dt);
        if (d.t > 2.4) { d.state = 'charge'; d.t = 0; }
      } else if (d.state === 'charge') {
        const tgt = head.clone().add(new THREE.Vector3(d.off, 2.2, -11));
        d.pos.x = U.damp(d.pos.x, tgt.x, 3, dt); d.pos.y = U.damp(d.pos.y, tgt.y, 3, dt); d.pos.z = U.damp(d.pos.z, tgt.z, 4, dt);
        const blink = Math.sin(d.t * 30) > 0;
        d.m.glow.scale.setScalar(blink ? 2.6 : 1.4);
        if (d.t > 0.9) {
          d.state = 'dive'; d.t = 0;
          d.vel = head.clone().add(new THREE.Vector3(P.vel.x * 0.35, 0, P.vel.z * 0.35)).sub(d.pos).normalize().multiplyScalar(26);
          SR.Audio.S.missileLaunch(0);
        }
      } else if (d.state === 'dive') {
        d.pos.addScaledVector(d.vel, dt * (opts.slowmo ? 0.45 : 1));
        SR.FX.trail(d.pos.x, d.pos.y, d.pos.z, 0.5);
        const dd = d.pos.distanceTo(head);
        if (dd < 1.3) {
          killDrone(d, P, false);
          if (P.boost > 0 || opts.sigma) cb.droneKill('smash');
          else cb.hit('drone', d.vel.clone().setY(0).normalize());
          continue;
        }
        const g = SR.Level.groundAt(d.pos.x, d.pos.z, d.pos.y + 0.5);
        if (d.t > 2.5 || d.pos.y < g + 0.3) { killDrone(d, P, false); continue; }
      }
      d.m.g.position.copy(d.pos);
      d.m.g.position.y += Math.sin(time * 4 + d.off) * 0.1;
      d.m.g.lookAt(head.x, d.m.g.position.y, head.z);
      d.m.g.rotateY(Math.PI);
    }
  }
  function killDrone(d, P, byRocket) {
    d.on = false; d.m.g.visible = false;
    SR.FX.explosion(d.pos, 0.6);
    SR.Audio.S.explosion(0.6);
    if (byRocket) cb.droneKill('rocket');
  }

  // ------------------------------------------------------------
  //  YOUR ROCKETS
  // ------------------------------------------------------------
  function pickTarget(origin, dir) {
    let best = null, bestScore = -1;
    const consider = (pos, kind, ref, weight) => {
      const v = pos.clone().sub(origin);
      const dist = v.length();
      if (dist > 170 || dist < 2) return;
      const dot = v.normalize().dot(dir);
      if (dot < 0.82) return;
      const score = dot * weight - dist * 0.001;
      if (score > bestScore) { bestScore = score; best = { kind, ref }; }
    };
    if (heli && heli.state !== 'crash') consider(heli.pos, 'heli', heli, 1.2);
    for (const d of drones) if (d.on) consider(d.pos, 'drone', d, 1.1);
    for (const a of agents) if (a.state === 'chase' || a.state === 'pop') consider(new THREE.Vector3(a.x, a.y + 1, a.z), 'agent', a, 1);
    return best;
  }
  function targetPos(t) {
    if (!t) return null;
    if (t.kind === 'heli') return heli && t.ref === heli && heli.state !== 'crash' ? heli.pos : null;
    if (t.kind === 'drone') return t.ref.on ? t.ref.pos : null;
    if (t.kind === 'agent') return (t.ref.state === 'chase' || t.ref.state === 'pop') ? new THREE.Vector3(t.ref.x, t.ref.y + 1, t.ref.z) : null;
    return null;
  }
  function fireRocket(camera, from) {
    const r = rockets.find((q) => !q.on);
    if (!r) return false;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    r.on = true; r.t = 0;
    r.g.visible = true; r.g.position.copy(from);
    r.vel.copy(dir).multiplyScalar(48);
    r.target = pickTarget(camera.position, dir);
    return true;
  }
  function updateRockets(dt, P) {
    for (const r of rockets) {
      if (!r.on) continue;
      r.t += dt;
      const tp = targetPos(r.target);
      if (tp) {
        // homing: turn toward the target
        const want = tp.clone().sub(r.g.position).normalize().multiplyScalar(r.vel.length() + 30 * dt);
        r.vel.lerp(want, Math.min(1, dt * 5));
      } else r.vel.multiplyScalar(1 + dt * 0.5);
      const prev = r.g.position.clone();
      r.g.position.addScaledVector(r.vel, dt);
      r.g.lookAt(r.g.position.clone().add(r.vel)); r.g.rotateY(Math.PI);
      SR.FX.trail(r.g.position.x, r.g.position.y, r.g.position.z, 0.8);
      const p = r.g.position;
      let boom = r.t > 4;
      if (heli && heli.state !== 'crash' && p.distanceTo(heli.pos) < 3.2) {
        boom = true; heli.hp--;
        cb.heliHit(heli.hp);
        if (heli.hp <= 0) { heli.state = 'crash'; heli.t = 0; heli.vel.set(U.rand(-4, 4), 2, -6); cb.heliDown(); }
      }
      for (const d of drones) if (d.on && p.distanceTo(d.pos) < 1.8) { boom = true; killDrone(d, P, true); }
      for (const a of agents) if ((a.state === 'chase' || a.state === 'pop') && Math.hypot(a.x - p.x, a.z - p.z) < 1.2 && p.y > a.y - 0.3 && p.y < a.y + 2.2) { boom = true; }
      if (!boom) {
        const g = SR.Level.groundAt(p.x, p.z, p.y + 0.3);
        if (p.y < g + 0.1 && p.y > g - 2) boom = true;
        for (const b of SR.Level.boxesNear(p.z, 6)) if (p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1 && p.z > b.z0 && p.z < b.z1) { boom = true; break; }
      }
      if (boom) {
        r.on = false; r.g.visible = false;
        SR.FX.explosion(p, 1);
        SR.Audio.S.explosion(0.8);
        for (const a of agents) if ((a.state === 'chase' || a.state === 'pop' || a.state === 'hidden') && Math.hypot(a.x - p.x, a.z - p.z) < 4.5) knockAgent(a, P, 'rocket');
        for (const d of drones) if (d.on && p.distanceTo(d.pos) < 4) killDrone(d, P, true);
        const pd = p.distanceTo(P.pos);
        cb.boom(pd);
      }
    }
  }

  function update(dt, P, wanted, time, opts) {
    megaTimer -= dt;
    spawnAgents(P, wanted);
    updateAgents(dt, P, opts);
    updateHeli(dt, P, wanted, time, opts);
    updateMissiles(dt, P, opts);
    updateDrones(dt, P, wanted, time, opts);
    updateRockets(dt, P);
  }

  // where the helicopter is (for sound and the HUD)
  function heliInfo() { return heli ? { pos: heli.pos, hp: heli.hp, crash: heli.state === 'crash' } : null; }
  function incoming(P) {
    let n = 0;
    for (const m of missiles) if (m.on && P.pos.distanceTo(m.to) < 30) n++;
    for (const d of drones) if (d.on && d.state !== 'come') n++;
    return n;
  }
  function lockTarget(camera) {
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const t = pickTarget(camera.position, dir);
    return t ? targetPos(t) : null;
  }
  function missileDirs(P) {
    const out = [];
    for (const m of missiles) if (m.on) out.push(m.g.position);
    for (const d of drones) if (d.on && d.state === 'dive') out.push(d.pos);
    return out;
  }

  return { _agents: agents, init, reset, update, fireRocket, heliInfo, heliPan, incoming, lockTarget, missileDirs, cb, get heliTimer() { return heliTimer; }, set heliTimer(v) { heliTimer = v; } };
})();
