// ============================================================
//  SIGMA HOVER GP — MENUS
//  Title, modes, character select, vehicle builder, cups,
//  tracks, results, the trophy podium, settings, how to play.
//  Works with the mouse, the keyboard (arrows + Enter + Esc)
//  and game controllers (D-pad + A + B).
// ============================================================
window.HG = window.HG || {};

HG.Menu = (function () {
  const U = HG.U;
  const $ = (id) => document.getElementById(id);
  let root, screen = null, stack = [], focusList = [], focusIdx = 0;
  let flow = null;                 // what the players are setting up
  const POINTS = [15, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
  const CCS = [{ id: 50, name: '50cc', diff: 0 }, { id: 100, name: '100cc', diff: 0.8 }, { id: 150, name: '150cc', diff: 1.4 }, { id: 200, name: '200cc', diff: 1.9 }, { id: 'mirror', name: 'MIRROR', diff: 1.4 }];
  const PAINTS = ['#ffcc1a', '#e8262a', '#ff6a2a', '#ff4ad8', '#8a3aff', '#3a7ad0', '#2ad8ff', '#3ac85a', '#7ae05a', '#ffffff', '#3a3a5a', '#1a1a20'];

  // ------------------------------------------------------------
  //  SHOWROOM: the 3D picture behind the menus
  // ------------------------------------------------------------
  let show = null;
  function initShowroom() {
    const sc = new THREE.Scene();
    sc.background = HG.Tex.sky('#140c30', '#3a1a6a', '#ff6a9a');
    sc.environment = null;
    sc.add(new THREE.HemisphereLight(0xd0c0ff, 0x302040, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.6); key.position.set(4, 8, 6); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 }); sc.add(key);
    const rim = new THREE.DirectionalLight(0xff60e0, 1.6); rim.position.set(-6, 4, -6); sc.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: 0x1a1430, roughness: 0.35, metalness: 0.4 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; sc.add(floor);
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.3, 3.5, 64), HG.M.glowMat(0x2af0ff, 2)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; sc.add(ring);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(5.0, 5.08, 64), HG.M.glowMat(0xff2fd0, 2)); ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.02; sc.add(ring2);
    const turn = new THREE.Group(); sc.add(turn);
    // floating Σ shapes in the background
    const sig = new THREE.MeshBasicMaterial({ map: HG.Tex.sign('Σ', '#00000000', '#ffcc1a', 128, 128), transparent: true, depthWrite: false, toneMapped: false });
    const floaters = [];
    for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), sig); m.position.set(U.rand(-25, 25), U.rand(2, 14), U.rand(-30, -12)); sc.add(m); floaters.push(m); }
    const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
    show = { sc, turn, cam, key, what: '', obj: null, t: 0, floaters, extra: [], camMode: 'turn' };
  }
  // what to show: { type: 'racer'|'lineup'|'char'|'podium', ... }
  function setShow(spec) {
    if (!show) return;
    const key = JSON.stringify(spec);
    if (key === show.what) return;
    show.what = key;
    while (show.turn.children.length) show.turn.remove(show.turn.children[0]);
    show.extra = [];
    show.spec = spec;
    if (spec.type === 'racer') {
      const k = fakeKart(spec.charId, spec.parts, spec.color);
      const r = HG.Models.racer(k);
      r.group.position.y = 0.55;
      show.turn.add(r.group);
      show.extra.push({ r, k });
      if (HG.Chars.byId[spec.charId].baby) {
        // Lille Plut gets out and toddles around!
      }
    } else if (spec.type === 'lineup') {
      const list = spec.list;
      list.forEach((p, i) => {
        const k = fakeKart(p.charId, p.parts, p.color);
        const r = HG.Models.racer(k);
        const a = (i / list.length) * Math.PI * 2;
        r.group.position.set(Math.sin(a) * 4.2, 0.55, Math.cos(a) * 4.2);
        r.group.rotation.y = a + Math.PI / 2;
        show.turn.add(r.group); show.extra.push({ r, k });
      });
    } else if (spec.type === 'char') {
      const c = HG.Models.character(spec.charId);
      show.turn.add(c.root);
      show.extra.push({ c, mode: spec.mode || 'select' });
    } else if (spec.type === 'podium') {
      const gold = HG.M.mat('#ffcc1a', { metal: 0.9, rough: 0.2 }), silver = HG.M.mat('#d0d8e0', { metal: 0.9, rough: 0.2 }), bronze = HG.M.mat('#d08a40', { metal: 0.9, rough: 0.25 });
      const steps = [[0, 1.6, gold], [-2.4, 1.0, silver], [2.4, 0.6, bronze]];
      spec.top.forEach((p, i) => {
        if (!p) return;
        const [x, h, m] = steps[i];
        const block = new THREE.Mesh(HG.M.rbox(2.2, h, 2.2, 0.1), m); block.position.set(x, h / 2, 0); block.castShadow = block.receiveShadow = true; show.turn.add(block);
        const num = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: HG.Tex.sign(String(i + 1), '#00000000', '#ffffff', 64, 64), transparent: true, toneMapped: false }));
        num.position.set(x, h / 2, 1.11); show.turn.add(num);
        const c = HG.Models.character(p.charId);
        c.root.position.set(x, h, 0);
        show.turn.add(c.root);
        show.extra.push({ c, mode: i === 0 ? 'win' : i === 1 ? 'wave' : 'idle', toddle: false });
      });
      // the trophy
      const cup = new THREE.Group();
      cup.add(new THREE.Mesh(HG.M.lathe('trophy', [[0, 0], [0.5, 0], [0.5, 0.15], [0.15, 0.25], [0.12, 0.8], [0.25, 0.9], [0.6, 1.3], [0.7, 1.9], [0.62, 1.9], [0.0, 1.2]], 28), new THREE.MeshStandardMaterial({ color: spec.trophyColor || 0xffcc1a, metalness: 1, roughness: 0.15, side: THREE.DoubleSide })));
      cup.position.set(0, 1.6, 1.4); cup.scale.setScalar(0.9);
      show.turn.add(cup); show.extra.push({ spin: cup });
    }
    show.turn.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  function fakeKart(charId, parts, color) {
    return { charId, parts, color, anim: { lean: 0, throwT: 0 }, steerSm: 0, drift: { dir: 0, level: 0 }, input: { gas: 0.3 }, grounded: true, place: 1, spd: 0, menu: true, trick: 0, trickType: 0, hitT: 0, events: [], boostT: 0, id: 1 };
  }
  let flashT = 0;
  function render3D(renderer, dt) {
    if (!show) initShowroom();
    show.t += dt;
    const t = show.t;
    const w = window.innerWidth, h = window.innerHeight;
    show.cam.aspect = w / h; show.cam.updateProjectionMatrix();
    const spec = show.spec || {};
    // camera
    if (spec.type === 'podium') { show.cam.position.set(Math.sin(t * 0.2) * 3, 3.2, 8.5); show.cam.lookAt(0, 1.9, 0); }
    else if (spec.type === 'lineup') { show.cam.position.set(Math.sin(t * 0.1) * 11, 4.2, Math.cos(t * 0.1) * 11); show.cam.lookAt(0, 0.8, 0); }
    else if (spec.type === 'char') { show.cam.position.set(1.6, 1.4, 4.2); show.cam.lookAt(1.6 - 2.2, 0.85, 0); }
    else { show.cam.position.set(2.4, 2.2, 6.2); show.cam.lookAt(-1.1, 0.7, 0); }
    if (spec.type !== 'lineup' && spec.type !== 'podium') show.turn.rotation.y = spec.type === 'char' ? 0.4 + Math.sin(t * 0.5) * 0.4 : t * 0.45;
    else show.turn.rotation.y = 0;
    for (const e of show.extra) {
      if (e.r) { e.k.steerSm = Math.sin(t * 0.9) * 0.4; e.k.anim.lean = -e.k.steerSm * 0.4; e.r.update(dt, e.k); }
      if (e.c) e.c.update(dt, { mode: e.mode, toddle: e.c.rig.def.baby && e.mode !== 'win' });
      if (e.spin) e.spin.rotation.y += dt * 1.2;
    }
    // Lille Plut toddles around in circles on the character screen
    for (const e of show.extra) if (e.c && e.c.rig.def.baby && spec.type === 'char') { const a = t * 0.8; e.c.root.position.set(Math.sin(a) * 0.8, 0, Math.cos(a) * 0.5); e.c.root.rotation.y = a + Math.PI / 2; }
    show.floaters.forEach((f, i) => { f.position.y += Math.sin(t + i) * 0.003; f.rotation.z = Math.sin(t * 0.5 + i) * 0.3; });
    if (spec.type === 'podium' && HG.FX && Math.random() < 0.08) { /* fireworks drawn by HTML confetti */ }
    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, w, h);
    const tm = renderer.toneMapping;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.clear();
    renderer.render(show.sc, show.cam);
    renderer.toneMapping = tm;
  }

  // ------------------------------------------------------------
  //  PICTURES: character portraits and track maps
  // ------------------------------------------------------------
  const portraits = {};
  function makePortraits() {
    const renderer = HG.Game.renderer;
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xffffff, 0x404060, 1.4));
    const l = new THREE.DirectionalLight(0xffffff, 2.2); l.position.set(2, 3, 4); sc.add(l);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
    const S = 160;
    const rt = new THREE.WebGLRenderTarget(S, S, { samples: 4 });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const buf = new Uint8Array(S * S * 4);
    const tm = renderer.toneMapping;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    for (const c of HG.Chars.LIST) {
      const rig = HG.Chars.build(c.id);
      HG.Chars.animate(rig, 0.01, { mood: 'happy' });
      sc.add(rig.root);
      rig.root.updateMatrixWorld(true);
      const hp = rig.head.getWorldPosition(new THREE.Vector3());
      const R = rig.R * rig.root.scale.x;
      cam.position.set(hp.x + R * 0.9, hp.y + R * 0.2, hp.z + R * 4.4);
      cam.lookAt(hp.x, hp.y - R * 0.15, hp.z);
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(sc, cam);
      renderer.readRenderTargetPixels(rt, 0, 0, S, S, buf);
      const cv = U.canvas(S, S, (g) => {
        const img = g.createImageData(S, S);
        for (let y = 0; y < S; y++) img.data.set(buf.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
        g.putImageData(img, 0, 0);
      });
      portraits[c.id] = cv.toDataURL();
      sc.remove(rig.root);
    }
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x000000, 1);
    renderer.toneMapping = tm;
    rt.dispose();
  }
  const trackPics = {}, trackObjs = {};
  function trackPic(def) {
    if (trackPics[def.id]) return trackPics[def.id];
    const th = HG.THEMES[def.theme];
    const cv = U.canvas(240, 150, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, th.sky[0]); gr.addColorStop(0.6, th.sky[1]); gr.addColorStop(1, th.sky[2]);
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      let pts;
      if (def.arena) {
        g.strokeStyle = '#fff'; g.lineWidth = 6; g.fillStyle = 'rgba(0,0,0,0.25)';
        g.beginPath(); if (def.round) g.arc(w / 2, h / 2, 55, 0, 7); else g.rect(w / 2 - 55, h / 2 - 55, 110, 110); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.7)'; for (const [x, z, r] of def.pillars) { g.beginPath(); g.arc(w / 2 - x * 55 / def.size, h / 2 - z * 55 / def.size, r * 55 / def.size, 0, 7); g.fill(); }
        return;
      }
      const tr = trackObjs[def.id] || (trackObjs[def.id] = new HG.Track(def));
      let mx = 1e9, Mx = -1e9, mz = 1e9, Mz = -1e9;
      for (const p of tr.P) { mx = Math.min(mx, p.x); Mx = Math.max(Mx, p.x); mz = Math.min(mz, p.z); Mz = Math.max(Mz, p.z); }
      const s = Math.min((w - 30) / (Mx - mx), (h - 24) / (Mz - mz));
      const X = (p) => w / 2 - (p.x - (mx + Mx) / 2) * s, Y = (p) => h / 2 - (p.z - (mz + Mz) / 2) * s;
      g.lineJoin = 'round';
      const path = () => { g.beginPath(); tr.P.forEach((p, i) => (i ? g.lineTo(X(p), Y(p)) : g.moveTo(X(p), Y(p)))); g.closePath(); };
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 10; path(); g.stroke();
      g.strokeStyle = '#ffffff'; g.lineWidth = 5; path(); g.stroke();
      g.fillStyle = '#ffcc1a'; g.beginPath(); g.arc(X(tr.P[0]), Y(tr.P[0]), 5, 0, 7); g.fill();
    });
    trackPics[def.id] = cv.toDataURL();
    return trackPics[def.id];
  }

  // ------------------------------------------------------------
  //  BUILDING SCREENS
  // ------------------------------------------------------------
  function el(tag, cls, parent, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
  function sfx(n) { if (HG.Audio) HG.Audio.play(n); }
  function btn(parent, html, onClick, cls = '') {
    const b = el('button', 'mb fx ' + cls, parent, html);
    b.addEventListener('click', (e) => { e.stopPropagation(); if (b.classList.contains('locked')) { sfx('back'); return; } sfx('ok'); onClick(b); });
    b.addEventListener('mouseenter', () => focusEl(b));
    return b;
  }
  function open(name, build, opts = {}) {
    if (screen && !opts.replace) stack.push(screen);
    screen = { name, build, back: opts.back };
    render();
  }
  function render() {
    root.innerHTML = '';
    root.style.display = 'block';
    const box = el('div', 'screen s-' + screen.name, root);
    screen.build(box);
    focusList = Array.from(root.querySelectorAll('.fx'));
    const pref = root.querySelector('.fx.selected') || root.querySelector('.fx.first') || focusList[0];
    focusIdx = Math.max(0, focusList.indexOf(pref));
    if (focusList[focusIdx]) focusEl(focusList[focusIdx], true);
  }
  function back() {
    if (screen && screen.back) { sfx('back'); screen.back(); return; }
    if (!stack.length) return;
    sfx('back');
    screen = stack.pop();
    render();
  }
  function home() { stack = []; screen = null; mainMenu(); }
  function focusEl(b, silent) {
    focusList.forEach((x) => x.classList.remove('focus'));
    b.classList.add('focus');
    const i = focusList.indexOf(b);
    if (i >= 0) { if (i !== focusIdx && !silent) sfx('menu'); focusIdx = i; }
    if (b.onfocusx) b.onfocusx();
    b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  // move focus to the nearest button in a direction
  function move(dx, dy) {
    const cur = focusList[focusIdx];
    if (!cur) return;
    if (cur.onarrow && cur.onarrow(dx, dy)) return;
    const a = cur.getBoundingClientRect(), ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = null, bs = Infinity;
    for (const b of focusList) {
      if (b === cur || b.offsetParent === null) continue;
      const r = b.getBoundingClientRect(), bx = r.left + r.width / 2, by = r.top + r.height / 2;
      const px = (bx - ax) * dx + (by - ay) * dy;
      if (px <= 4) continue;
      const side = Math.abs((bx - ax) * dy) + Math.abs((by - ay) * dx);
      const score = px + side * 2.2;
      if (score < bs) { bs = score; best = b; }
    }
    if (best) focusEl(best);
  }
  let pauseOpen = false, resultsOpen = false;
  function update(dt, m) {
    if (!root || root.style.display === 'none' || !screen) return;
    if (m.up) move(0, -1); if (m.down) move(0, 1); if (m.left) move(-1, 0); if (m.right) move(1, 0);
    if (m.ok && focusList[focusIdx]) focusList[focusIdx].click();
    if (m.back) back();
    if (screen.tick) screen.tick(dt);
  }

  // stat bars
  function statBars(parent, st) {
    const box = el('div', 'stats', parent);
    for (const [k, n] of [['speed', 'SPEED'], ['accel', 'ACCELERATION'], ['weight', 'WEIGHT'], ['handling', 'HANDLING'], ['grip', 'GRIP'], ['turbo', 'MINI-TURBO']]) {
      const row = el('div', 'srow', box, '<span>' + n + '</span><i><b style="width:' + Math.round(st[k] * 10) + '%"></b></i>');
    }
    return box;
  }
  function title(parent, text, sub) { el('h1', 'mtitle', parent, text + (sub ? '<small>' + sub + '</small>' : '')); }

  // ------------------------------------------------------------
  //  THE SCREENS
  // ------------------------------------------------------------
  function titleScreen() {
    HG.Game.state = 'menu';
    setShow({ type: 'lineup', list: HG.Chars.LIST.filter((c) => HG.Save.unlocked(c)).slice(0, 8).map((c, i) => ({ charId: c.id, parts: { body: c.defaultBody || HG.Vehicles.BODIES[i % 9].id, engine: HG.Vehicles.ENGINES[i % 3].id, fins: 'standard' }, color: c.kart })) });
    open('title', (box) => {
      el('div', 'logo', box, '<span class="l1">SIGMA</span><span class="l2">HOVER GP</span><span class="sig">Σ</span>');
      const b = btn(box, 'PRESS START', () => mainMenu(), 'big pulse first');
      el('div', 'hint', box, 'Keyboard: arrows + ENTER &nbsp;•&nbsp; Controller: D-pad + A &nbsp;•&nbsp; or use the mouse');
    });
  }

  function mainMenu() {
    HG.Game.state = 'menu';
    if (HG.Audio) HG.Audio.menuMusic();
    setShow({ type: 'lineup', list: HG.Chars.LIST.filter((c) => HG.Save.unlocked(c)).slice(0, 8).map((c, i) => ({ charId: c.id, parts: { body: c.defaultBody || HG.Vehicles.BODIES[i % 9].id, engine: HG.Vehicles.ENGINES[i % 3].id, fins: 'standard' }, color: c.kart })) });
    stack = []; screen = null;
    open('main', (box) => {
      el('div', 'logo small', box, '<span class="l1">SIGMA</span><span class="l2">HOVER GP</span>');
      const g = el('div', 'grid2', box);
      btn(g, '🏆<b>GRAND PRIX</b><small>Race a cup of 4 tracks</small>', () => startFlow('gp'), 'card first');
      btn(g, '🏁<b>VS RACE</b><small>Pick any track and rules</small>', () => startFlow('vs'), 'card');
      btn(g, '🎈<b>BALLOON BATTLE</b><small>Pop everyone\'s balloons!</small>', () => startFlow('battle'), 'card');
      btn(g, '⏱️<b>TIME TRIAL</b><small>Beat your ghost</small>', () => startFlow('tt'), 'card');
      btn(g, '🌍<b>ONLINE</b><small>Race friends (up to 4)</small>', () => { if (HG.Net) HG.Net.menu(); else alert('Online is coming soon!'); }, 'card');
      btn(g, '❓<b>HOW TO PLAY</b><small>Controls and items</small>', () => howTo(), 'card');
      const row = el('div', 'row', box);
      btn(row, '⚙️ SETTINGS', () => settings(), 'small');
      el('div', 'coins', row, '<i class="coinico">Σ</i> ' + HG.Save.data.totalCoins + ' coins collected');
    }, { back: () => { titleScreen(); } });
  }

  // ---------- a new game setup ----------
  function startFlow(mode) {
    flow = { mode, players: 1, cc: 150, mirror: false, difficulty: 1.4, cpus: 11, items: true, laps: 3, picks: [], online: false };
    if (mode === 'tt') { flow.players = 1; return pickChar(0); }
    open('players', (box) => {
      title(box, 'HOW MANY PLAYERS?');
      const g = el('div', 'grid2 narrow', box);
      btn(g, '👤<b>1 PLAYER</b>', () => { flow.players = 1; afterPlayers(); }, 'card first');
      btn(g, '👥<b>2 PLAYERS</b><small>Split screen</small>', () => { flow.players = 2; afterPlayers(); }, 'card');
      el('div', 'hint', box, '2 players: Player 1 = W A S D + SPACE (drift) + E (item) &nbsp;•&nbsp; Player 2 = arrows + RIGHT SHIFT (drift) + ENTER (item). Controllers work too!');
    });
  }
  function afterPlayers() {
    if (flow.mode === 'battle') { flow.cpus = 8 - flow.players; return pickChar(0); }
    open('class', (box) => {
      title(box, 'CHOOSE A SPEED');
      const g = el('div', 'grid5', box);
      CCS.forEach((c, i) => btn(g, '<b>' + c.name + '</b><small>' + ['Easy', 'Normal', 'Fast', 'SUPER FAST', 'Everything flipped!'][i] + '</small>', () => {
        flow.cc = c.id === 'mirror' ? 150 : c.id; flow.mirror = c.id === 'mirror'; flow.ccName = c.id; flow.difficulty = c.diff;
        if (flow.mode === 'vs') vsOptions(); else pickChar(0);
      }, 'card' + (i === 2 ? ' first' : '')));
    });
  }
  function vsOptions() {
    open('vsopts', (box) => {
      title(box, 'VS RACE RULES');
      const opts = el('div', 'opts', box);
      option(opts, 'CPU RACERS', () => flow.cpus, (v) => (flow.cpus = U.clamp(v, 0, 12 - flow.players)), 1);
      option(opts, 'CPU LEVEL', () => ['EASY', 'NORMAL', 'HARD'][flow.difficulty < 0.5 ? 0 : flow.difficulty < 1.6 ? 1 : 2], (v, d) => (flow.difficulty = U.clamp(flow.difficulty + d * 0.9, 0, 2)), 0, true);
      option(opts, 'ITEMS', () => (flow.items ? 'ON' : 'OFF'), (v, d) => (flow.items = !flow.items), 0, true);
      option(opts, 'LAPS', () => flow.laps, (v) => (flow.laps = U.clamp(v, 1, 9)), 1);
      btn(box, 'OK!', () => pickChar(0), 'big');
    });
  }
  // a row with < value > that changes with left/right
  function option(parent, label, get, set, step, toggle) {
    const row = el('div', 'opt', parent);
    el('span', 'olab', row, label);
    const b = btn(row, '', () => { change(1); }, 'oval');
    const change = (d) => { if (toggle) set(null, d); else set(get() + d * step, d); b.innerHTML = '◀ <b>' + get() + '</b> ▶'; sfx('menu'); };
    b.innerHTML = '◀ <b>' + get() + '</b> ▶';
    b.onarrow = (dx, dy) => { if (dx) { change(dx); return true; } return false; };
    b.addEventListener('contextmenu', (e) => { e.preventDefault(); change(-1); });
    return b;
  }

  // ---------- character select ----------
  function pickChar(p) {
    const saved = HG.Save.data.picks[p] || HG.Save.data.picks[0];
    const pick = flow.picks[p] = flow.picks[p] || JSON.parse(JSON.stringify(saved));
    if (!HG.Save.unlocked(HG.Chars.byId[pick.charId])) pick.charId = 'sigma';
    open('chars', (box) => {
      title(box, (flow.players > 1 ? 'PLAYER ' + (p + 1) + ': ' : '') + 'CHOOSE YOUR RACER');
      const wrap = el('div', 'charwrap', box);
      const info = el('div', 'charinfo', wrap);
      const grid = el('div', 'chargrid', wrap);
      const showInfo = (c) => {
        info.innerHTML = '<h2>' + c.name + '</h2><div class="wclass ' + c.weight + '">' + c.weight.toUpperCase() + '</div><p>' + c.desc + '</p>';
        statBars(info, HG.Vehicles.stats(c.id, pick.parts));
        setShow({ type: 'char', charId: c.id, mode: c.baby ? 'cheeky' : 'select' });
      };
      for (const c of HG.Chars.LIST) {
        const ok = HG.Save.unlocked(c);
        const b = btn(grid, '<img src="' + (portraits[c.id] || '') + '"><span>' + (ok ? c.name : '🔒') + '</span>', () => {
          pick.charId = c.id;
          if (c.defaultBody && !flow.picks[p].bodyChosen) pick.parts.body = c.defaultBody;
          if (!pick.color || !pick.colorChosen) pick.color = c.kart;
          if (HG.Chars.byId[c.id].baby && HG.Audio) HG.Audio.voice('raspberry');
          pickKart(p);
        }, 'pc' + (ok ? '' : ' locked') + (c.id === pick.charId ? ' selected' : ''));
        b.style.setProperty('--cc', c.kart);
        b.onfocusx = () => { if (ok) showInfo(c); else { info.innerHTML = '<h2>🔒 LOCKED</h2><p>' + HG.Save.lockText(c) + '</p>'; setShow({ type: 'char', charId: c.id, mode: 'idle' }); } };
      }
      showInfo(HG.Chars.byId[pick.charId]);
    });
  }

  // ---------- vehicle builder ----------
  function pickKart(p) {
    const pick = flow.picks[p];
    open('kart', (box) => {
      title(box, 'BUILD YOUR HOVER RIDE');
      const panel = el('div', 'kartpanel', box);
      const statsBox = el('div', '', panel);
      const refresh = () => {
        statsBox.innerHTML = '';
        statBars(statsBox, HG.Vehicles.stats(pick.charId, pick.parts));
        setShow({ type: 'racer', charId: pick.charId, parts: pick.parts, color: pick.color });
      };
      const partRow = (label, list, key) => {
        const row = el('div', 'opt', panel);
        el('span', 'olab', row, label);
        const b = btn(row, '', () => change(1), 'oval wide');
        const show = () => { const part = HG.Vehicles.find(list, pick.parts[key]); const ok = HG.Save.unlocked(part); b.innerHTML = '◀ <b>' + part.name + '</b>' + (ok ? '' : ' 🔒') + ' ▶'; b.title = ok ? '' : HG.Save.lockText(part); };
        const change = (d) => {
          let i = list.findIndex((x) => x.id === pick.parts[key]);
          for (let n = 0; n < list.length; n++) { i = (i + d + list.length) % list.length; if (HG.Save.unlocked(list[i])) break; }
          pick.parts[key] = list[i].id; if (key === 'body') pick.bodyChosen = true;
          show(); refresh(); sfx('menu');
        };
        b.onarrow = (dx) => { if (dx) { change(dx); return true; } return false; };
        show();
        return b;
      };
      partRow('BODY', HG.Vehicles.BODIES, 'body').classList.add('first');
      partRow('ENGINE', HG.Vehicles.ENGINES, 'engine');
      partRow('FINS', HG.Vehicles.FINS, 'fins');
      const crow = el('div', 'opt', panel);
      el('span', 'olab', crow, 'PAINT');
      const sw = el('div', 'swatches', crow);
      for (const c of PAINTS) { const b = btn(sw, '', () => { pick.color = c; pick.colorChosen = true; refresh(); }, 'sw'); b.style.background = c; }
      const locked = HG.Vehicles.BODIES.concat(HG.Vehicles.ENGINES, HG.Vehicles.FINS).filter((x) => !HG.Save.unlocked(x));
      if (locked.length) el('div', 'hint', panel, '🔒 ' + locked.length + ' parts still locked. Collect coins in races to unlock them! (' + HG.Save.data.totalCoins + ' coins)');
      btn(panel, 'READY! ▶', () => {
        HG.Save.data.picks[p] = pick; HG.Save.save();
        if (p + 1 < flow.players) pickChar(p + 1); else pickTrack();
      }, 'big');
      refresh();
    });
  }

  // ---------- cups, tracks and arenas ----------
  function pickTrack() {
    if (flow.mode === 'gp') {
      open('cups', (box) => {
        title(box, 'CHOOSE A CUP', (flow.mirror ? 'MIRROR' : flow.cc + 'cc'));
        const g = el('div', 'grid4', box);
        HG.CUPS.forEach((cup, i) => {
          const tr = HG.TRACKS.filter((t) => t.cup === i);
          const tro = HG.Save.data.trophies[i + '-' + (flow.mirror ? 'mirror' : flow.cc)];
          const b = btn(g, '<div class="cupicon" style="--cc:' + cup.color + '">' + cup.icon + '</div><b>' + cup.name + '</b>' + (tro ? '<div class="trophy">' + ['🥇', '🥈', '🥉'][tro - 1] + '</div>' : '') + '<ul>' + tr.map((t) => '<li>' + t.name + '</li>').join('') + '</ul>', () => {
            flow.cup = i; flow.tracks = tr.map((t) => t.id); flow.race = 0; startGP();
          }, 'cup' + (i === 0 ? ' first' : ''));
          b.onfocusx = () => {};
        });
      });
    } else if (flow.mode === 'battle') {
      open('arenas', (box) => {
        title(box, 'CHOOSE AN ARENA');
        const g = el('div', 'grid4', box);
        HG.ARENAS.forEach((a, i) => btn(g, '<img src="' + trackPic(a) + '"><b>' + a.name + '</b>', () => { flow.track = a.id; startRaceNow(); }, 'trk' + (i === 0 ? ' first' : '')));
      });
    } else {
      open('tracks', (box) => {
        title(box, 'CHOOSE A TRACK');
        const g = el('div', 'grid4 tracks', box);
        HG.TRACKS.forEach((t, i) => {
          const best = HG.Save.data.best[t.id];
          btn(g, '<img src="' + trackPic(t) + '"><b>' + t.name + '</b>' + (flow.mode === 'tt' && best ? '<small>BEST ' + U.time(best) + '</small>' : ''), () => { flow.track = t.id; startRaceNow(); }, 'trk' + (i === 0 ? ' first' : ''));
        });
        btn(g, '🎲<b>RANDOM</b>', () => { flow.track = U.pick(HG.TRACKS).id; startRaceNow(); }, 'trk');
      });
    }
  }

  // ---------- who races ----------
  function makeRacers() {
    const list = [];
    const taken = new Set(flow.picks.map((p) => p.charId));
    const pool = U.shuffle(HG.Chars.LIST.filter((c) => !taken.has(c.id) && (HG.Save.unlocked(c) || c.unlock !== 'gold')));
    const cpus = flow.mode === 'tt' ? 0 : flow.cpus;
    for (let i = 0; i < cpus; i++) {
      const c = pool[i % pool.length];
      list.push({ name: c.name, charId: c.id, ctrl: 'cpu', color: c.kart, parts: { body: c.defaultBody || U.pick(HG.Vehicles.BODIES.filter((b) => !b.unlock)).id, engine: U.pick(HG.Vehicles.ENGINES.filter((e) => !e.unlock)).id, fins: U.pick(HG.Vehicles.FINS.filter((f) => !f.unlock)).id } });
    }
    flow.picks.forEach((p, i) => list.push({ name: flow.players > 1 ? 'P' + (i + 1) + ' ' + HG.Chars.byId[p.charId].name : HG.Chars.byId[p.charId].name, charId: p.charId, ctrl: 'local', player: i, color: p.color || HG.Chars.byId[p.charId].kart, parts: Object.assign({}, p.parts), human: true }));
    return list;
  }

  function raceCfg(track, racers) {
    return { track, mode: flow.mode, cc: flow.cc, mirror: flow.mirror, laps: flow.mode === 'gp' ? undefined : flow.laps, racers, items: flow.mode === 'tt' ? false : flow.items, difficulty: flow.difficulty, timeLimit: 150 };
  }

  function startRaceNow() {
    const racers = makeRacers();
    go(raceCfg(flow.track, racers));
  }

  function go(cfg) {
    root.style.display = 'none'; root.innerHTML = ''; screen = null; stack = [];
    resultsOpen = false;
    const race = HG.Game.startRace(cfg, raceEnded);
    if (flow.mode === 'tt') setupTimeTrial(race);
    if (flow.mode === 'battle') HG.HUD.tip(race.karts.find((k) => k.ctrl === 'local'), 'Hit others with items to pop their balloons! 🎈🎈🎈', 5);
  }

  // ---------- GRAND PRIX ----------
  function startGP() {
    flow.gp = { racers: makeRacers(), points: {} };
    flow.gp.racers.forEach((r) => (flow.gp.points[r.name] = 0));
    nextGPRace();
  }
  function nextGPRace() {
    const gp = flow.gp;
    // first race: players start at the back. After that: by points (most points in front)
    let order = gp.racers.slice();
    if (flow.race > 0) order.sort((a, b) => gp.points[b.name] - gp.points[a.name]);
    go(raceCfg(flow.tracks[flow.race], order));
  }

  // ---------- TIME TRIAL: record a ghost, race against your best ----------
  let tt = null;
  function setupTimeTrial(race) {
    const me = race.karts.find((k) => k.ctrl === 'local');
    HG.Items.give(me, 'turbo3');
    tt = { me, rec: [], t: 0, ghost: null };
    const g = HG.Save.ghost(race.def.id);
    if (g && g.samples && g.samples.length) {
      // add the ghost racer
      const gk = new HG.Kart({ name: 'GHOST', charId: g.charId, parts: g.parts, color: g.color, ctrl: 'remote', stats: HG.Vehicles.stats(g.charId, g.parts) });
      gk.isGhost = true; gk.reset(me.dist, me.d);
      const S = g.samples;
      gk.playback = (time) => {
        const f = time * 10, i = Math.min(S.length / 5 - 2, Math.floor(f)), k = f - Math.floor(f);
        if (i < 0) return;
        const a = i * 5, b = a + 5;
        gk.dist = U.lerp(S[a], S[b], k); gk.s = race.track.wrap(gk.dist); gk.d = U.lerp(S[a + 1], S[b + 1], k); gk.h = U.lerp(S[a + 2], S[b + 2], k);
        gk.yaw = S[a + 3] + U.angleDiff(S[a + 3], S[b + 3]) * k; gk.spd = (S[b] - S[a]) * 10; gk.grounded = S[b + 2] < 0.1;
        gk.drift.dir = S[a + 4];
      };
      race.karts.push(gk);
      HG.Game.addKartView(gk);
      tt.ghost = gk;
    }
    tt.race = race;
  }
  function ttTick(dt) {
    if (!tt || !tt.race || !tt.race.go || tt.me.finished) return;
    tt.t += dt;
    while (tt.rec.length / 5 < tt.race.time * 10) {
      const k = tt.me;
      tt.rec.push(Math.round(k.dist * 100) / 100, Math.round(k.d * 100) / 100, Math.round(k.h * 100) / 100, Math.round(k.yaw * 1000) / 1000, k.drift.dir);
    }
  }

  // ------------------------------------------------------------
  //  AFTER A RACE
  // ------------------------------------------------------------
  function raceEnded(race) {
    resultsOpen = true;
    const humans = race.karts.filter((k) => k.ctrl === 'local');
    // coins become money for unlocks
    const coins = humans.reduce((s, k) => s + k.coins, 0) + humans.reduce((s, k) => s + Math.max(0, 9 - k.place), 0);
    const unlockedNow = HG.Save.addCoins(coins);
    HG.Save.data.races++; if (humans.some((k) => k.place === 1)) HG.Save.data.wins++;
    HG.Save.save();
    root.style.display = 'block';
    const order = race.battle ? race.finishOrder : race.order.filter((k) => !k.isGhost);
    if (flow.mode === 'tt') {
      const me = tt.me;
      const isRecord = me.finished && HG.Save.record(race.def.id, me.finishTime);
      if (isRecord) HG.Save.ghost(race.def.id, { charId: me.charId, parts: me.parts, color: me.color, samples: tt.rec, time: me.finishTime });
      open('results', (box) => {
        title(box, isRecord ? '🌟 NEW RECORD! 🌟' : 'TIME TRIAL');
        el('div', 'bigtime', box, U.time(me.finishTime));
        el('div', 'laps', box, me.lapTimes.map((t, i) => 'LAP ' + (i + 1) + ': ' + U.time(t)).join(' &nbsp; '));
        el('div', 'hint', box, 'BEST: ' + U.time(HG.Save.data.best[race.def.id]) + (isRecord ? ' — your ghost is saved. Race it next time!' : ''));
        const r = el('div', 'row', box);
        btn(r, '🔁 TRY AGAIN', () => startRaceNow(), 'first');
        btn(r, '🗺️ OTHER TRACK', () => { HG.Game.endRace(); pickTrack(); });
        btn(r, '🏠 MENU', () => { HG.Game.endRace(); mainMenu(); });
      });
      return;
    }
    if (flow.mode === 'gp') {
      const gp = flow.gp;
      order.forEach((k, i) => { gp.points[k.name] = (gp.points[k.name] || 0) + POINTS[i]; });
      open('results', (box) => {
        title(box, 'RACE ' + (flow.race + 1) + ' / 4 RESULTS', race.def.name);
        resultsTable(box, order, (k, i) => '+' + POINTS[i], (k) => gp.points[k.name]);
        if (unlockedNow.length) el('div', 'unlock', box, '🔓 NEW: ' + unlockedNow.join(', ') + '!');
        const r = el('div', 'row', box);
        if (flow.race < 3) btn(r, 'NEXT RACE ▶', () => { flow.race++; nextGPRace(); }, 'big first');
        else btn(r, 'SEE THE PODIUM 🏆', () => podium(), 'big first');
        btn(r, 'QUIT', () => { HG.Game.endRace(); mainMenu(); }, 'small');
      });
      return;
    }
    open('results', (box) => {
      title(box, race.battle ? 'BATTLE OVER!' : 'RESULTS', race.def.name);
      resultsTable(box, order, (k) => (race.battle ? '🎈' + Math.max(0, k.balloons) + '  ⭐' + k.score : k.finished ? U.time(k.finishTime) : '--'), null);
      if (unlockedNow.length) el('div', 'unlock', box, '🔓 NEW: ' + unlockedNow.join(', ') + '!');
      const r = el('div', 'row', box);
      btn(r, '🔁 AGAIN', () => startRaceNow(), 'first');
      btn(r, '🗺️ OTHER ' + (race.battle ? 'ARENA' : 'TRACK'), () => { HG.Game.endRace(); pickTrack(); });
      btn(r, '🏠 MENU', () => { HG.Game.endRace(); mainMenu(); });
    });
  }
  function resultsTable(box, order, col2, col3) {
    const t = el('div', 'results', box);
    order.forEach((k, i) => {
      const row = el('div', 'rrow' + (k.ctrl === 'local' ? ' me' : ''), t);
      row.style.animationDelay = (i * 0.05) + 's';
      row.innerHTML = '<b class="rp">' + (i + 1) + '</b><img src="' + (portraits[k.charId] || '') + '"><span class="rn">' + k.name + '</span><span class="r2">' + col2(k, i) + '</span>' + (col3 ? '<span class="r3">' + col3(k) + '</span>' : '');
    });
  }

  function podium() {
    HG.Game.endRace();
    HG.Game.state = 'menu';
    const gp = flow.gp;
    const order = gp.racers.slice().sort((a, b) => gp.points[b.name] - gp.points[a.name]);
    const best = Math.min(...flow.picks.map((p, i) => order.findIndex((r) => r.ctrl === 'local' && r.player === i) + 1));
    const tColor = best === 1 ? 0xffcc1a : best === 2 ? 0xd0d8e0 : best === 3 ? 0xd08a40 : 0x888888;
    setShow({ type: 'podium', top: order.slice(0, 3), trophyColor: tColor });
    const unlockedNow = HG.Save.trophy(flow.cup, flow.mirror ? 'mirror' : flow.cc, best);
    if (HG.Audio) { HG.Audio.stopSong(0.3); setTimeout(() => HG.Audio.raceMusic('star', false), 400); }
    open('podium', (box) => {
      const cup = HG.CUPS[flow.cup];
      title(box, best <= 3 ? ['🥇 YOU WON THE ', '🥈 SILVER TROPHY! ', '🥉 BRONZE TROPHY! '][best - 1] + (best === 1 ? cup.name + '!' : '') : 'GOOD TRY!', cup.name + ' • ' + (flow.mirror ? 'MIRROR' : flow.cc + 'cc'));
      const t = el('div', 'results small', box);
      order.slice(0, 6).forEach((r, i) => { el('div', 'rrow' + (r.ctrl === 'local' ? ' me' : ''), t, '<b class="rp">' + (i + 1) + '</b><img src="' + (portraits[r.charId] || '') + '"><span class="rn">' + r.name + '</span><span class="r2">' + gp.points[r.name] + ' pts</span>'); });
      if (unlockedNow.length) el('div', 'unlock', box, '🔓 UNLOCKED: ' + unlockedNow.join(', ') + '!');
      btn(box, 'CONTINUE ▶', () => mainMenu(), 'big first');
      confetti(box);
    });
  }
  function confetti(box) {
    const c = el('div', 'confetti', box);
    for (let i = 0; i < 80; i++) { const p = el('i', '', c); p.style.left = Math.random() * 100 + '%'; p.style.background = U.pick(['#ff3b6b', '#ffd21a', '#3bd0ff', '#7cff6a', '#ff7ae0', '#fff']); p.style.animationDelay = Math.random() * 3 + 's'; p.style.animationDuration = 2 + Math.random() * 2 + 's'; }
  }

  // ------------------------------------------------------------
  //  PAUSE
  // ------------------------------------------------------------
  function pauseMenu(on) {
    pauseOpen = on;
    if (!on) { if (!resultsOpen) { root.style.display = 'none'; root.innerHTML = ''; screen = null; stack = []; } return; }
    stack = []; screen = null;
    open('pause', (box) => {
      title(box, 'PAUSED');
      const col = el('div', 'col', box);
      btn(col, '▶ RESUME', () => HG.Game.pause(false), 'first');
      if (flow && flow.mode !== 'gp') btn(col, '🔁 RESTART', () => { HG.Game.pause(false); startRaceNow(); });
      if (flow && flow.mode === 'gp') btn(col, '🔁 RESTART RACE', () => { HG.Game.pause(false); nextGPRace(); });
      btn(col, '⚙️ SETTINGS', () => settings());
      btn(col, '❓ CONTROLS', () => howTo());
      btn(col, '🏠 QUIT TO MENU', () => { HG.Game.pause(false); HG.Game.endRace(); mainMenu(); });
    }, { back: () => HG.Game.pause(false) });
  }

  // ------------------------------------------------------------
  //  SETTINGS
  // ------------------------------------------------------------
  function settings() {
    const S = HG.settings;
    open('settings', (box) => {
      title(box, 'SETTINGS');
      const o = el('div', 'opts', box);
      option(o, 'GRAPHICS', () => S.gfx.toUpperCase(), (v, d) => { const L = ['low', 'medium', 'high']; S.gfx = L[(L.indexOf(S.gfx) + (d || 1) + 3) % 3]; HG.saveSettings(); }, 0, true).classList.add('first');
      option(o, 'MUSIC', () => Math.round(S.music * 10), (v) => { S.music = U.clamp(v, 0, 10) / 10; HG.saveSettings(); if (HG.Audio) HG.Audio.applyVolumes(); }, 1);
      option(o, 'SOUNDS', () => Math.round(S.sfx * 10), (v) => { S.sfx = U.clamp(v, 0, 10) / 10; HG.saveSettings(); if (HG.Audio) HG.Audio.applyVolumes(); }, 1);
      for (const p of [0, 1]) {
        option(o, 'P' + (p + 1) + ' AUTO GAS', () => (S.autoGas[p] ? 'ON' : 'OFF'), () => { S.autoGas[p] = !S.autoGas[p]; HG.saveSettings(); }, 0, true);
        option(o, 'P' + (p + 1) + ' SMART STEERING', () => (S.smartSteer[p] ? 'ON' : 'OFF'), () => { S.smartSteer[p] = !S.smartSteer[p]; HG.saveSettings(); }, 0, true);
      }
      option(o, 'CAMERA', () => ['CLOSE', 'NORMAL', 'FAR'][S.camDist < 0.95 ? 0 : S.camDist > 1.05 ? 2 : 1], (v, d) => { S.camDist = U.clamp(Math.round((S.camDist + (d || 1) * 0.15) * 100) / 100, 0.85, 1.15); HG.saveSettings(); }, 0, true);
      option(o, 'SHOW FPS', () => (S.showFps ? 'ON' : 'OFF'), () => { S.showFps = !S.showFps; $('fps').textContent = ''; HG.saveSettings(); }, 0, true);
      el('div', 'hint', box, 'AUTO GAS = your racer speeds up by itself. SMART STEERING = the game helps you not fall off. Graphics changes work after reloading the page.');
      btn(box, 'DONE', () => back(), 'big');
    });
  }

  function howTo() {
    open('howto', (box) => {
      title(box, 'HOW TO PLAY');
      const g = el('div', 'howgrid', box);
      el('div', 'howcard', g, '<h3>🎮 CONTROLS (1 player)</h3><table>' +
        '<tr><td>Steer</td><td>◀ ▶ or A D</td></tr><tr><td>Gas (auto!)</td><td>▲ or W</td></tr><tr><td>Brake / back</td><td>▼ or S</td></tr>' +
        '<tr><td>Hop + DRIFT</td><td>SPACE or SHIFT (hold)</td></tr><tr><td>Use item</td><td>E, Q, J or ENTER</td></tr><tr><td>Throw backwards</td><td>hold ▼ + item</td></tr>' +
        '<tr><td>Look behind</td><td>C</td></tr><tr><td>Pause</td><td>ESC or P</td></tr></table>' +
        '<h3>🎮 CONTROLLER</h3><p>Stick = steer • A = gas • B = brake • RB = drift • LB / X = item • Y = look back • START = pause</p>');
      el('div', 'howcard', g, '<h3>⚡ TRICKS</h3><p><b>DRIFT:</b> hold drift while turning. Sparks go <span style="color:#4aa8ff">BLUE</span> → <span style="color:#ff9a1a">ORANGE</span> → <span style="color:#d040ff">PURPLE</span>. Let go for a MINI-TURBO!</p>' +
        '<p><b>RAMP TRICK:</b> press drift when you fly off a ramp = boost when you land.</p><p><b>ROCKET START:</b> hold ▲ (or drift) right after the "2" in the countdown.</p>' +
        '<p><b>SLIPSTREAM:</b> drive right behind someone to get sucked along.</p><p><b>COINS:</b> up to 10 make you faster.</p>');
      const items = Object.entries(HG.Items.ITEMS).filter(([id]) => !/3$/.test(id));
      el('div', 'howcard wide', g, '<h3>🎁 ITEMS</h3><div class="itemlist">' + items.map(([id, d]) => '<span><i>' + d.icon + '</i>' + d.name + '</span>').join('') + '</div><p>The further behind you are, the better the items!</p>');
      btn(box, 'GOT IT!', () => back(), 'big first');
    });
  }

  // ------------------------------------------------------------
  function init() {
    root = $('menu');
    initShowroom();
    try { makePortraits(); } catch (e) { console.warn('portraits failed', e); }
    root.addEventListener('click', () => { if (HG.Audio) HG.Audio.init(); });
    titleScreen();
  }

  return {
    init, update, render3D, pauseMenu, mainMenu, titleScreen, raceEnded, tick: ttTick,
    get flow() { return flow; }, set flow(f) { flow = f; }, portraits, trackPic, setShow, go, open, back,
    startQuick(cfg) { flow = { mode: cfg.mode || 'vs', players: 1, cc: cfg.cc || 150, picks: [], laps: 3, items: true, difficulty: 1.4, cpus: 11 }; go(cfg); },
  };
})();
