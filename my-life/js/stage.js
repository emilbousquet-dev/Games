// ============================================================
//  MY LIFE — THE STAGE
//  Shows a 3D place, puts the actors in it and makes them
//  ACT OUT your choices: walk, eat, throw, hug, cry, dance...
// ============================================================
window.ML = window.ML || {};

ML.Stage = (function () {
  const U = ML.U, Mo = ML.Models;
  let renderer, scene, camera, hemi, sun, ambient, setGroup = null;
  let set = null;              // the current place (from ML.Scenes)
  let sceneName = '';
  const actors = {};           // id -> actor
  const props = {};            // id -> { obj, ... }
  const flying = [];           // things flying through the air
  let markers = [];            // numbered labels on the floor (furniture spots)
  const confetti = [];
  let camPos = new THREE.Vector3(0, 2.5, 7), camLook = new THREE.Vector3(0, 1, 0);
  let camGoalPos = camPos.clone(), camGoalLook = camLook.clone();
  let shake = 0, time = 0, last = 0;
  let overlay, fadeEl;
  const tmpV = new THREE.Vector3();

  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
    hemi = new THREE.HemisphereLight(0xffffff, 0xb0a090, 1.1);
    scene.add(hemi);
    ambient = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambient);
    sun = new THREE.DirectionalLight(0xfff4e0, 1.9);
    sun.position.set(5, 10, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 1; sc.far = 50;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun); scene.add(sun.target);
    overlay = document.getElementById('bubbles');
    fadeEl = document.getElementById('fade');
    window.addEventListener('resize', resize);
    resize();
    requestAnimationFrame(loop);
  }
  // the story box covers the bottom of the screen, so we show the 3D a bit higher up
  let frameShift = 0;
  function setFrame(shift) { frameShift = shift; resize(); }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    // on tall/narrow screens move the camera back so everything fits
    const baseFov = w / h < 1.2 ? 55 : 42;
    if (frameShift > 0) {
      const fullH = h * (1 + frameShift);
      camera.fov = 2 * Math.atan(Math.tan(baseFov * Math.PI / 360) * (1 + frameShift)) * 180 / Math.PI;
      camera.aspect = w / fullH;
      camera.setViewOffset(w, fullH, 0, h * frameShift, w, h);
    } else {
      camera.fov = baseFov;
      camera.aspect = w / h;
      camera.clearViewOffset();
    }
    camera.updateProjectionMatrix();
  }

  // ---------- places ----------
  async function setScene(name, opt = {}) {
    if (!opt.instant && setGroup) { fadeEl.classList.add('on'); await U.wait(0.32); }
    clearAll();
    sceneName = name;
    setGroup = new THREE.Group();
    scene.add(setGroup);
    const builder = ML.Scenes[name] || ML.Scenes.home;
    set = builder(setGroup, opt) || {};
    set.spots = set.spots || {};
    // lights & sky
    const li = set.light || {};
    hemi.intensity = li.hemi !== undefined ? li.hemi : 1.1;
    hemi.color.set(li.sky !== undefined ? li.sky : 0xffffff);
    hemi.groundColor.set(li.ground !== undefined ? li.ground : 0xb0a090);
    sun.intensity = li.sun !== undefined ? li.sun : 1.9;
    sun.color.set(li.sunColor !== undefined ? li.sunColor : 0xfff4e0);
    sun.position.set(...(li.sunPos || [5, 10, 7]));
    ambient.intensity = li.ambient !== undefined ? li.ambient : 0.25;
    scene.background = set.bg !== undefined ? (typeof set.bg === 'number' ? new THREE.Color(set.bg) : set.bg) : new THREE.Color(0xf4e8d8);
    scene.fog = set.fog ? new THREE.Fog(set.fog[0], set.fog[1], set.fog[2]) : null;
    dim(false);
    resetCam(true);
    if (!opt.instant) { fadeEl.classList.remove('on'); }
    return set;
  }
  function setMarkers(list) {
    for (const m of markers) m.el.remove();
    markers = (list || []).map((m) => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.textContent = m.label;
      overlay.appendChild(el);
      return { el, p: new THREE.Vector3(m.x, 0.4, m.z) };
    });
  }
  function clearAll() {
    setMarkers([]);
    for (const id of Object.keys(actors)) removeActor(id);
    for (const id of Object.keys(props)) removeProp(id);
    flying.length = 0;
    for (const c of confetti) scene.remove(c.mesh);
    confetti.length = 0;
    if (setGroup) { scene.remove(setGroup); Mo.dispose(setGroup); setGroup = null; }
    if (overlay) overlay.innerHTML = '';
  }
  function resetCam(instant) {
    const c = set.cam || [0, 2.6, 7.5], l = set.look || [0, 1, 0];
    camGoalPos.set(c[0], c[1], c[2]); camGoalLook.set(l[0], l[1], l[2]);
    if (instant) { camPos.copy(camGoalPos); camLook.copy(camGoalLook); }
  }

  // where is a spot? accepts a spot name, an actor id, or [x, z]
  function where(w) {
    if (Array.isArray(w)) return { x: w[0], z: w[1], r: w[2] !== undefined ? w[2] : null, y: w[3] || 0 };
    if (typeof w === 'object' && w) return w;
    if (set && set.spots[w]) { const s = set.spots[w]; return { x: s[0], z: s[1], r: s[2] !== undefined ? s[2] : 0, y: s[3] || 0 }; }
    if (actors[w]) { const a = actors[w]; return { x: a.pos.x, z: a.pos.z, r: a.rot, y: a.pos.y, actor: a }; }
    if (props[w]) { const p = props[w].obj; return { x: p.position.x, z: p.position.z, r: 0, y: 0 }; }
    return { x: 0, z: 0.5, r: 0, y: 0 };
  }
  const hasSpot = (n) => !!(set && set.spots[n]);

  // ---------- actors ----------
  function addActor(id, obj, at, opt = {}) {
    if (actors[id]) removeActor(id);
    const s = where(at || id);
    const a = {
      id, obj, kind: obj.userData.kind,
      pos: new THREE.Vector3(s.x, s.y || 0, s.z), rot: s.r || 0,
      target: null, speed: 0, maxSpeed: opt.speed || 1.3, pose: opt.pose || 'stand', basePose: opt.pose || 'stand', poseT: 0,
      mood: opt.mood || 0, talk: 0, jumpT: -1, spinT: -1, faceTo: null, holding: null, hidden: false,
      crawler: !!opt.crawler, riding: null, size: obj.userData.height || 1.7,
    };
    if (opt.face) a.rot = Math.atan2(where(opt.face).x - a.pos.x, where(opt.face).z - a.pos.z);
    obj.position.copy(a.pos);
    obj.rotation.y = a.rot;
    scene.add(obj);
    actors[id] = a;
    return a;
  }
  function removeActor(id) {
    const a = actors[id];
    if (!a) return;
    if (a.holding) dropHeld(a);
    if (a.obj.parent) a.obj.parent.remove(a.obj);
    Mo.dispose(a.obj);
    delete actors[id];
  }
  const get = (id) => actors[id];

  // ---------- props (things in the scene) ----------
  function addProp(id, obj, at, opt = {}) {
    if (props[id]) removeProp(id);
    const s = where(at);
    obj.position.set(s.x, (s.y || 0) + (opt.y || 0), s.z);
    if (opt.r !== undefined) obj.rotation.y = opt.r;
    if (opt.scale) obj.scale.setScalar(opt.scale);
    scene.add(obj);
    props[id] = { obj };
    return obj;
  }
  function removeProp(id) {
    const p = props[id];
    if (!p) return;
    if (p.obj.parent) p.obj.parent.remove(p.obj);
    delete props[id];
  }

  // hold something in the right hand
  function hold(a, obj) {
    if (a.holding) dropHeld(a);
    const h = a.obj.userData.rig && a.obj.userData.rig.handR;
    if (!h) { scene.add(obj); obj.position.copy(a.pos); return; }
    obj.position.set(0, -0.04, 0.05);
    obj.rotation.set(0, 0, 0);
    h.add(obj);
    a.holding = obj;
  }
  function dropHeld(a) {
    if (a.holding && a.holding.parent) a.holding.parent.remove(a.holding);
    a.holding = null;
  }
  function headPos(a, out) {
    out.copy(a.pos);
    out.y += (a.pose === 'lie' || a.pose === 'sleep' || a.pose === 'fall' || a.pose === 'dead') ? 0.5 : (a.pose === 'crawl' ? a.size * 0.65 : (a.pose === 'sit' || a.pose === 'type' || a.pose === 'drive' ? a.size * 0.75 : a.size)) + 0.05;
    if (a.riding) { out.copy(a.riding.pos); out.y += 1.6; }
    return out;
  }
  function handPos(a, out) {
    const h = a.obj.userData.rig && a.obj.userData.rig.handR;
    if (h) { h.getWorldPosition(out); return out; }
    out.copy(a.pos); out.y += a.size * 0.5; return out;
  }

  // ---------- moving ----------
  function moveTo(id, w, speed, stopDist) {
    const a = actors[id];
    if (!a) return Promise.resolve();
    const s = where(w);
    let tx = s.x, tz = s.z;
    if (s.actor && s.actor !== a) {
      // stop in front of them, not on top of them
      const dx = a.pos.x - tx, dz = a.pos.z - tz, d = Math.hypot(dx, dz) || 1;
      const k = stopDist !== undefined ? stopDist : (a.kind === 'pet' ? 0.6 : 0.62 + Math.min(a.size, s.actor.size) * 0.12);
      tx += dx / d * k; tz += dz / d * k;
    }
    a.target = new THREE.Vector3(tx, s.actor ? a.pos.y : (s.y || 0), tz);
    a.finalRot = (!s.actor && s.r !== null && s.r !== undefined && typeof w === 'string') ? s.r : null;
    a.faceAfter = s.actor ? s.actor.id : null;
    a.speed = speed || a.maxSpeed;
    if (a.crawler) a.pose = 'crawl';
    return new Promise((res) => { a.onArrive = res; });
  }

  // ---------- speech bubbles & emojis ----------
  function bubble(id, text, secs = 2.4) {
    const a = actors[id];
    if (!a || !overlay) return;
    if (a.bubbleEl) a.bubbleEl.remove();
    const el = document.createElement('div');
    el.className = 'bubble' + (id === 'me' ? ' me' : '');
    el.textContent = text;
    overlay.appendChild(el);
    a.bubbleEl = el;
    a.talk = secs;
    setTimeout(() => { if (a.bubbleEl === el) { el.classList.add('out'); setTimeout(() => el.remove(), 300); a.bubbleEl = null; } }, secs * 1000 / ML.SPEED);
  }
  function emote(id, emoji, big) {
    const a = actors[id] || null;
    const p = a ? headPos(a, new THREE.Vector3()) : (props[id] ? props[id].obj.position.clone().add(new THREE.Vector3(0, 0.6, 0)) : new THREE.Vector3(0, 1.5, 0));
    floatText(p, emoji, 'emote' + (big ? ' big' : ''));
  }
  function floatText(p, text, cls) {
    if (!overlay) return;
    const el = document.createElement('div');
    el.className = cls;
    el.textContent = text;
    overlay.appendChild(el);
    const v = p.clone().add(new THREE.Vector3(U.rand(-0.15, 0.15), 0.15, 0)).project(camera);
    el.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    el.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    setTimeout(() => el.remove(), 1800);
  }

  // ---------- flying things ----------
  function fly(obj, from, to, dur, arc, onLand) {
    scene.add(obj);
    obj.position.copy(from);
    return new Promise((res) => flying.push({ obj, from: from.clone(), to: to.clone(), t: 0, dur, arc, onLand, res }));
  }
  function burst(pos, colors, n = 60) {
    const g = Mo.G.box();
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(g, Mo.C(U.pick(colors), 0.5));
      m.scale.set(0.05, 0.05, 0.012);
      m.position.copy(pos);
      scene.add(m);
      confetti.push({ mesh: m, v: new THREE.Vector3(U.rand(-2, 2), U.rand(2, 5), U.rand(-2, 2)), life: U.rand(1.5, 2.5), spin: U.rand(-10, 10) });
    }
  }

  // ---------- camera ----------
  function camClose(id, dist) {
    const a = actors[id];
    if (!a) return;
    const h = headPos(a, new THREE.Vector3());
    h.y -= a.size * 0.12;
    const base = set.cam || [0, 2.6, 7.5];
    const dir = new THREE.Vector3(base[0] - h.x, 0, base[2] - h.z).normalize();
    const d = dist || U.clamp(a.size * 2.1, 1.7, 4.0);
    camGoalLook.copy(h);
    camGoalLook.y -= a.size * 0.2;
    camGoalPos.set(h.x + dir.x * d, h.y + d * 0.32, h.z + dir.z * d);
  }
  function camBoth(id1, id2) {
    const a = actors[id1], b = actors[id2];
    if (!a || !b) return;
    const ha = headPos(a, new THREE.Vector3()), hb = headPos(b, new THREE.Vector3());
    const mid = ha.clone().add(hb).multiplyScalar(0.5);
    mid.y -= 0.25;
    const span = ha.distanceTo(hb);
    const base = set.cam || [0, 2.6, 7.5];
    const dir = new THREE.Vector3(base[0] - mid.x, 0, base[2] - mid.z).normalize();
    const d = U.clamp(span * 1.6 + 1.6, 2.4, 7);
    camGoalLook.copy(mid);
    camGoalPos.set(mid.x + dir.x * d, mid.y + d * 0.3, mid.z + dir.z * d);
  }

  // dark room with only the birthday candles
  let dimmed = false;
  function dim(on) {
    dimmed = on;
  }

  // ---------- the animation loop ----------
  function loop(ms) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ms - last) / 1000 || 0.016) * ML.SPEED;
    last = ms;
    time += dt;
    update(dt);
    renderer.render(scene, camera);
  }
  function update(dt) {
    // lights fade for the birthday candles
    const li = (set && set.light) || {};
    const want = dimmed ? 0.18 : 1;
    const cur = sun.userData.k === undefined ? 1 : sun.userData.k;
    const k = cur + (want - cur) * Math.min(1, dt * 3);
    sun.userData.k = k;
    sun.intensity = (li.sun !== undefined ? li.sun : 1.9) * k;
    hemi.intensity = (li.hemi !== undefined ? li.hemi : 1.1) * k;
    ambient.intensity = (li.ambient !== undefined ? li.ambient : 0.25) * k;

    for (const id in actors) updateActor(actors[id], dt);
    for (const id in props) Mo.animateItem(props[id].obj, time);
    if (set && set.anim) set.anim(time, dt);
    if (setGroup) setGroup.traverse((o) => { if (o.userData.kind === 'item') Mo.animateItem(o, time); });

    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      f.t += dt / f.dur;
      const t = Math.min(1, f.t);
      f.obj.position.lerpVectors(f.from, f.to, t);
      f.obj.position.y += Math.sin(t * Math.PI) * f.arc;
      f.obj.rotation.x += dt * 8;
      if (t >= 1) { flying.splice(i, 1); if (f.onLand) f.onLand(); f.res(); }
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const c = confetti[i];
      c.v.y -= 6 * dt;
      c.mesh.position.addScaledVector(c.v, dt);
      c.mesh.rotation.x += c.spin * dt; c.mesh.rotation.y += c.spin * 0.7 * dt;
      if (c.mesh.position.y < 0.02) { c.mesh.position.y = 0.02; c.v.set(0, 0, 0); }
      c.life -= dt;
      if (c.life <= 0) { scene.remove(c.mesh); confetti.splice(i, 1); }
    }
    // camera glides smoothly
    const ck = Math.min(1, dt * 2.6);
    camPos.lerp(camGoalPos, ck);
    camLook.lerp(camGoalLook, ck);
    camera.position.copy(camPos);
    camera.position.x += Math.sin(time * 0.31) * 0.05;
    camera.position.y += Math.sin(time * 0.43) * 0.03;
    if (shake > 0) { shake -= dt; camera.position.x += U.rand(-1, 1) * shake * 0.25; camera.position.y += U.rand(-1, 1) * shake * 0.25; }
    camera.lookAt(camLook);
    for (const m of markers) {
      tmpV.copy(m.p).project(camera);
      m.el.style.left = ((tmpV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
      m.el.style.top = ((-tmpV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    }
    // keep the speech bubbles above the heads
    for (const id in actors) {
      const a = actors[id];
      if (a.bubbleEl) {
        headPos(a, tmpV);
        tmpV.y += 0.18;
        tmpV.project(camera);
        a.bubbleEl.style.left = ((tmpV.x * 0.5 + 0.5) * window.innerWidth) + 'px';
        a.bubbleEl.style.top = ((-tmpV.y * 0.5 + 0.5) * window.innerHeight) + 'px';
      }
    }
  }
  function updateActor(a, dt) {
    a.poseT += dt;
    if (a.talk > 0) a.talk -= dt;
    let speed = 0;
    if (a.target && !a.riding) {
      const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      const step = a.speed * dt;
      if (d <= step || d < 0.02) {
        a.pos.x = a.target.x; a.pos.z = a.target.z; a.pos.y = a.target.y;
        a.target = null;
        if (a.crawler && a.pose === 'crawl') a.pose = a.basePose;
        if (a.finalRot !== null && a.finalRot !== undefined) a.faceAngle = a.finalRot;
        if (a.faceAfter && actors[a.faceAfter]) a.faceTo = a.faceAfter;
        const r = a.onArrive; a.onArrive = null; if (r) r();
      } else {
        a.pos.x += dx / d * step; a.pos.z += dz / d * step;
        a.pos.y += (a.target.y - a.pos.y) * Math.min(1, dt * 4);
        speed = a.speed;
        a.faceAngle = Math.atan2(dx, dz);
        a.faceTo = null;
      }
    }
    if (a.faceTo && actors[a.faceTo]) { const o = actors[a.faceTo]; a.faceAngle = Math.atan2(o.pos.x - a.pos.x, o.pos.z - a.pos.z); }
    if (a.faceAngle !== undefined && a.faceAngle !== null) a.rot += U.angleDiff(a.rot, a.faceAngle) * Math.min(1, dt * 9);
    let y = a.pos.y;
    if (a.jumpT >= 0) { a.jumpT += dt; const t = a.jumpT / 0.55; if (t >= 1) a.jumpT = -1; else y += Math.sin(t * Math.PI) * 0.45 * Math.min(1, a.size / 1.2); }
    let extraRot = 0;
    if (a.spinT >= 0) { a.spinT += dt; const t = a.spinT / 0.8; if (t >= 1) a.spinT = -1; else extraRot = U.smooth(t) * Math.PI * 2; }
    if (a.riding) {
      const v = a.riding;
      const seat = v.obj.userData.seat;
      tmpV.set(seat[0], seat[1], seat[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), v.rot);
      a.obj.position.set(v.pos.x + tmpV.x, v.pos.y + tmpV.y, v.pos.z + tmpV.z);
      a.obj.rotation.y = v.rot;
    } else {
      a.obj.position.set(a.pos.x, y, a.pos.z);
      a.obj.rotation.y = a.rot + extraRot;
    }
    const st = { speed, pose: a.pose, pt: a.poseT, mood: a.mood, talk: a.talk > 0 ? 1 : 0 };
    if (a.kind === 'person') Mo.animatePerson(a.obj, dt, st);
    else if (a.kind === 'pet') Mo.animatePet(a.obj, dt, st);
    else if (a.kind === 'vehicle') a.obj.userData.wheels.forEach((w) => { w.rotation.x += speed * dt / a.obj.userData.wheelR; });
    // funny people sometimes do a little wiggle when they stand around
    if (a.kind === 'person' && a.obj.userData.persona === 'funny' && a.pose === 'stand' && !a.target && Math.random() < dt * 0.08) { a.pose = 'silly'; a.poseT = 0; setTimeout(() => { if (a.pose === 'silly') a.pose = 'stand'; }, 900); }
  }

  // ============================================================
  //  ACTIONS — every step of a choice is one of these
  //  ['walk', 'me', 'a']  ['say', 'a', 'Hello!']  ['pose', 'me', 'dance', 2] ...
  // ============================================================
  const A = {
    async walk(who, w, speed) { await moveTo(who, w, speed); },
    async run(who, w) { const a = actors[who]; await moveTo(who, w, a ? a.maxSpeed * 2.2 : 3); },
    async sneak(who, w) { const a = actors[who]; if (a) a.pose = 'sneak'; await moveTo(who, w, 0.7); if (a) a.pose = a.basePose; },
    async crawl(who, w) { const a = actors[who]; if (a) a.pose = 'crawl'; await moveTo(who, w, 0.55); if (a) a.pose = a.basePose; },
    async face(who, w) { const a = actors[who]; if (!a) return; if (actors[w]) a.faceTo = w; else { const s = where(w); a.faceTo = null; a.faceAngle = typeof w === 'number' ? w : Math.atan2(s.x - a.pos.x, s.z - a.pos.z); } await U.wait(0.25); },
    async turn(who, angle) { const a = actors[who]; if (a) { a.faceTo = null; a.faceAngle = angle; } await U.wait(0.25); },
    async pose(who, p, secs) {
      const a = actors[who]; if (!a) return;
      a.pose = p; a.poseT = 0;
      if (secs) { await U.wait(secs); if (a.pose === p) { a.pose = a.basePose; a.poseT = 0; } }
    },
    async base(who, p) { const a = actors[who]; if (a) { a.basePose = p; a.pose = p; a.poseT = 0; } },
    async mood(who, m) { const a = actors[who]; if (a) a.mood = m; },
    async say(who, text, secs) {
      const s = secs || U.clamp(1.2 + text.length * 0.045, 1.6, 4);
      bubble(who, ML.Game ? ML.Game.fill(text) : text, s);
      ML.Audio && ML.Audio.talk(who === 'me');
      await U.wait(s);
    },
    async emote(who, e) { emote(who, e); },
    async wait(s) { await U.wait(s); },
    async throw(who, target, kind = 'ball', splat) {
      const a = actors[who]; if (!a) return;
      await A.face(who, target);
      a.pose = 'throw'; a.poseT = 0;
      await U.wait(0.45);
      const from = handPos(a, new THREE.Vector3());
      const tt = actors[target];
      const to = tt ? headPos(tt, new THREE.Vector3()).add(new THREE.Vector3(0, -0.12, 0)) : (() => { const s = where(target); return new THREE.Vector3(s.x, 0.3, s.z); })();
      const obj = Mo.item(kind);
      ML.Audio && ML.Audio.whoosh();
      await fly(obj, from, to, 0.55, 0.6);
      scene.remove(obj);
      ML.Audio && ML.Audio.splat();
      if (splat !== false) emote(target, kind === 'peas' || kind === 'bowl' ? '🟢💥' : '💥', true);
      if (tt && tt.kind === 'person') { tt.pose = 'surprised'; tt.poseT = 0; setTimeout(() => { if (tt.pose === 'surprised') tt.pose = tt.basePose; }, 1200); }
      a.pose = a.basePose;
    },
    async give(who, target, kind = 'gift') {
      const a = actors[who], b = actors[target]; if (!a || !b) return;
      if (a.holding) dropHeld(a);
      await A.face(who, target);
      a.pose = 'give'; a.poseT = 0;
      await U.wait(0.35);
      const obj = Mo.item(kind);
      await fly(obj, handPos(a, new THREE.Vector3()), handPos(b, new THREE.Vector3()), 0.45, 0.2);
      scene.remove(obj);
      if (b.kind === 'person') hold(b, obj); else { obj.position.copy(b.pos); scene.add(obj); }
      a.pose = a.basePose;
      emote(target, kind === 'gift' ? '🎁' : '✨');
    },
    async hold(who, kind) { const a = actors[who]; if (a) hold(a, Mo.item(kind)); },
    async drop(who) { const a = actors[who]; if (a) dropHeld(a); },
    async spawn(kind, w, id, opt = {}) { const o = Mo.item(kind, opt); addProp(id || ('p' + Math.random()), o, w, opt); },
    async remove(id) { if (actors[id]) removeActor(id); else removeProp(id); },
    async hide(who) { const a = actors[who]; if (a) a.obj.visible = false; },
    async show(who) { const a = actors[who]; if (a) a.obj.visible = true; },
    async jump(who, n = 1) { const a = actors[who]; if (!a) return; for (let i = 0; i < n; i++) { a.jumpT = 0; ML.Audio && ML.Audio.boing(); await U.wait(0.6); } },
    async spin(who) { const a = actors[who]; if (a) { a.spinT = 0; await U.wait(0.85); } },
    async cam(mode, who, who2) {
      if (mode === 'close') camClose(who);
      else if (mode === 'far') camClose(who, 5);
      else if (mode === 'both') camBoth(who, who2);
      else resetCam();
      await U.wait(0.15);
    },
    async confetti(w) { const s = actors[w] ? headPos(actors[w], new THREE.Vector3()) : (() => { const p = where(w || 'me'); return new THREE.Vector3(p.x, 1.6, p.z); })(); burst(s, [0xff4a8a, 0xffd84a, 0x3ab0ff, 0x7ae84a, 0xc87aff]); ML.Audio && ML.Audio.pop(); },
    async shake(s = 0.5) { shake = s; },
    async sound(name) { ML.Audio && ML.Audio[name] && ML.Audio[name](); },
    async enter(id, from, to) {
      const a = actors[id]; if (!a) return;
      const s = where(from || 'door');
      a.pos.set(s.x, 0, s.z); a.obj.visible = true;
      await moveTo(id, to || id, undefined);
    },
    async leave(who, to) { const a = actors[who]; if (!a) return; await moveTo(who, to || (hasSpot('door') ? 'door' : [a.pos.x + 8, a.pos.z])); a.obj.visible = false; },
    async ride(who, vid) { const a = actors[who], v = actors[vid]; if (!a || !v) return; a.riding = v; a.pose = 'drive'; a.basePose = 'drive'; await U.wait(0.2); },
    async unride(who) { const a = actors[who]; if (!a || !a.riding) return; const v = a.riding; a.riding = null; a.pos.set(v.pos.x + Math.cos(v.rot) * 1.3, 0, v.pos.z - Math.sin(v.rot) * 1.3); a.pose = a.basePose = 'stand'; },
    async drive(vid, w, speed = 5) { const v = actors[vid]; if (!v) return; ML.Audio && ML.Audio.vroom(); await moveTo(vid, w, speed); },
    async dim(on) { dim(on !== false); await U.wait(0.4); },
    async blow(id) { const p = props[id]; if (p) { p.obj.userData.blownOut = true; ML.Audio && ML.Audio.whoosh(); } },
    async together(...lists) { await Promise.all(lists.map((l) => run(l))); },
    async flash(color) { const f = document.getElementById('flash'); if (!f) return; f.style.background = color || '#fff'; f.classList.add('on'); await U.wait(0.12); f.classList.remove('on'); },
    async zzz(who) { for (let i = 0; i < 3; i++) { emote(who, '💤'); await U.wait(0.5); } },
    async poof(who) { const a = actors[who]; if (!a) return; burst(headPos(a, new THREE.Vector3()).add(new THREE.Vector3(0, -0.5, 0)), [0xffffff, 0xe8e8f0, 0xd0d0e0], 40); ML.Audio && ML.Audio.pop(); },
  };
  async function run(steps) {
    if (!steps) return;
    if (typeof steps === 'function') steps = steps();
    for (const step of steps) {
      if (!step) continue;
      if (typeof step === 'function') { await step(); continue; }
      const fn = A[step[0]];
      if (!fn) { console.warn('Unknown action', step[0]); continue; }
      try { await fn(...step.slice(1)); } catch (e) { console.error('Action failed', step, e); }
    }
  }

  return {
    init, setScene, setMarkers, setFrame, addActor, removeActor, addProp, removeProp, get, where, hasSpot, run, A, emote, bubble, floatText, burst,
    camClose, resetCam, headPos, actors, props,
    get set() { return set; }, get scene() { return scene; }, get camera() { return camera; }, get sceneName() { return sceneName; }, get renderer() { return renderer; },
  };
})();
