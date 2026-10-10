// ============================================================
//  ATLANTIS DIVER — THE MAIN GAME
//  Game states, the camera, treasure, the boat, the rescue,
//  the ending, and drawing everything in the right order.
// ============================================================
AT.Game = (function () {
  const U = AT.U, T = AT.TILE, M = AT.PX_PER_M;
  const BOAT_X = 24 * T;
  let canvas, g, W = 0, H = 0, scale = 1;
  const cam = { x: 0, y: -200, w: 1280, h: 720 };
  let state = 'title', t = 0, last = 0, shakeAmt = 0;
  let prompt = '', rescue = null, ending = null, awake = false;
  let wasSurface = true, lastZone = 0, zoneToastT = 0, audioT = 0, fullToastT = 0, overToast = false, saveT = 0;
  const $ = (id) => document.getElementById(id);

  // ---------- starting up ----------
  function init() {
    canvas = $('game'); g = canvas.getContext('2d');
    AT.Input.init();
    AT.Art.init();
    const S = AT.Shop.load();
    AT.World.load(S);
    applySave();
    AT.Creatures.init();
    AT.Render.init();
    AT.Diver.reset(BOAT_X + 80, 20);
    resize();
    window.addEventListener('resize', resize);
    setupMenus();
    AT.HUD.shownGold = AT.Shop.S.gold;
    // start right away with ?play or ?depth=... (for testing)
    if (AT.params.has && (AT.params.has('play') || AT.params.has('depth'))) {
      start(false);
      if (AT.params.get('depth')) teleport(+AT.params.get('depth'));
    }
    requestAnimationFrame(frame);
  }

  function applySave() {
    const S = AT.Shop.S;
    awake = !!S.trident;
    for (const it of AT.World.items) {
      it.gone = S.taken.includes(it.id);
      it.inBag = false;
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, AT.lowGfx ? 1 : 1.5);
    W = canvas.width = Math.floor(window.innerWidth * dpr);
    H = canvas.height = Math.floor(window.innerHeight * dpr);
    // phones held upright see a tall view; everyone sees at least 640 pixels of the sea across
    scale = Math.max(Math.min(H / AT.VIEW_H, W / 640), W / AT.World.W);
    cam.w = W / scale; cam.h = H / scale;
    AT.World.setRes(Math.min(2, Math.ceil(scale * 4) / 4));
    AT.Render.resize(W, H);
  }

  // ---------- menus ----------
  let menu = null, menuFocus = 0;
  function setMenu(el) {
    menu = el ? Array.from(el.querySelectorAll('button:not([hidden])')) : null;
    menuFocus = 0;
    focusMenu();
  }
  function focusMenu() { if (menu) menu.forEach((b, i) => b.classList.toggle('focus', i === menuFocus)); }
  function menuInput(s) {
    if (!menu || !menu.length) return;
    if (s.navY) { menuFocus = (menuFocus + s.navY + menu.length) % menu.length; focusMenu(); AT.Audio.tick(); }
    if (s.useP || s.fireP) menu[menuFocus].click();
  }
  function show(id, on) { $(id).classList.toggle('show', on); }

  function setupMenus() {
    const cont = $('btn-continue'), neu = $('btn-new');
    cont.hidden = !AT.Shop.hasSave();
    cont.addEventListener('click', () => start(false));
    neu.addEventListener('click', () => {
      if (AT.Shop.hasSave() && !confirm('Start a new game? Your saved game will be lost.')) return;
      start(true);
    });
    const gfx = () => { $('btn-gfx').textContent = 'Graphics: ' + (AT.lowGfx ? 'LOW' : 'HIGH'); $('btn-gfx2').textContent = $('btn-gfx').textContent; };
    const snd = () => { $('btn-sound').textContent = 'Sound: ' + (AT.Audio.muted ? 'OFF' : 'ON'); $('btn-sound2').textContent = $('btn-sound').textContent; };
    const toggleGfx = () => {
      try { localStorage.setItem('atlantis.gfx', AT.lowGfx ? 'high' : 'low'); } catch (e) { /* */ }
      location.reload();
    };
    const toggleSnd = () => { AT.Audio.init(); AT.Audio.setMuted(!AT.Audio.muted); snd(); };
    $('btn-gfx').addEventListener('click', toggleGfx); $('btn-gfx2').addEventListener('click', toggleGfx);
    $('btn-sound').addEventListener('click', toggleSnd); $('btn-sound2').addEventListener('click', toggleSnd);
    gfx(); snd();
    $('btn-resume').addEventListener('click', () => setState('play'));
    $('btn-journal').addEventListener('click', () => openJournal());
    $('btn-map').addEventListener('click', () => setState('map'));
    $('btn-quit').addEventListener('click', () => { AT.Shop.save(); location.reload(); });
    $('btn-keep').addEventListener('click', () => { show('ending', false); setState('play'); });
    $('tablet').addEventListener('click', () => setState('play'));
    $('journal').querySelector('.close').addEventListener('click', () => closePanel());
    setMenu($('title'));
    // the first click/key turns on the sound (browsers need that)
    const wake = () => AT.Audio.init();
    window.addEventListener('pointerdown', wake); window.addEventListener('keydown', wake);
  }

  function start(fresh) {
    AT.Audio.init();
    if (fresh) {
      AT.Shop.wipe();
      AT.Shop.load();
      AT.World.load(AT.Shop.S);
      applySave();
      AT.Creatures.init();
      AT.HUD.shownGold = 0;
      AT.HUD.resetMap();
    }
    AT.Diver.reset(BOAT_X + 80, 20);
    show('title', false);
    setState('play');
    snapCamera();
    AT.Audio.splash();
    if (!AT.Shop.S.dives) {
      setTimeout(() => AT.HUD.toast(AT.Input.usingTouch ? 'Touch the left side of the screen to swim!' : 'Swim down with W A S D or the arrow keys!', '#fff'), 600);
      setTimeout(() => AT.HUD.toast('Grab treasure, then come back to the boat to sell it.', '#ffe08a'), 4200);
    }
  }

  function setState(s) {
    const old = state;
    state = s;
    if (old === 'shop') AT.Shop.close();
    show('pause', s === 'pause');
    show('tablet', s === 'tablet');
    show('journal', s === 'journal');
    if (s === 'pause') setMenu($('pause'));
    else if (s === 'play' || s === 'map') setMenu(null);
    if (s === 'map') AT.HUD.buildMap();
  }
  function closePanel() { setState('play'); }

  // ---------- the camera ----------
  function camTarget() {
    const D = AT.Diver.D;
    let tx = D.x + D.vx * 0.35 - cam.w / 2, ty = D.y + D.vy * 0.25 - cam.h * 0.5;
    if (D.atSurface) ty = D.y - cam.h * 0.58;
    tx = cam.w >= AT.World.W ? (AT.World.W - cam.w) / 2 : U.clamp(tx, 0, AT.World.W - cam.w);
    ty = U.clamp(ty, -cam.h * 0.62, AT.World.H - cam.h);
    return [tx, ty];
  }
  function snapCamera() { const [x, y] = camTarget(); cam.x = x; cam.y = y; AT.World.warm(cam); }
  function updateCamera(dt) {
    const [x, y] = camTarget(), k = 1 - Math.exp(-dt * 5);
    cam.x += (x - cam.x) * k; cam.y += (y - cam.y) * k;
  }

  // ---------- one frame ----------
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now; t += dt;
    AT.Input.update();
    const s = AT.Input.s;
    switch (state) {
      case 'title': titleUpdate(dt); menuInput(s); break;
      case 'play': play(dt, s); break;
      case 'shop':
        AT.Shop.input(s);
        if (s.backP || s.pauseP || s.journalP || (s.mapP)) closePanel();
        break;
      case 'map': if (s.mapP || s.backP || s.pauseP || s.useP) setState('play'); break;
      case 'tablet': if (s.useP || s.backP || s.fireP || s.pauseP) setState('play'); break;
      case 'journal': if (s.journalP || s.backP || s.pauseP || s.useP) closePanel(); break;
      case 'pause': menuInput(s); if (s.pauseP || s.backP) setState('play'); break;
      case 'rescue': rescueUpdate(dt); break;
      case 'ending': endingUpdate(dt, s); break;
    }
    if (state === 'play' || state === 'rescue' || state === 'title' || state === 'ending') {
      AT.Render.updateParticles(dt);
      if (state !== 'title') AT.Creatures.update(dt, t);
    }
    AT.HUD.update(dt);
    // tell the page what's happening (shows the touch buttons only while swimming)
    if (document.body.dataset.state !== state) document.body.dataset.state = state;
    const canUse = state === 'play' && prompt.includes('shop');
    if (canUse !== document.body.classList.contains('canuse')) document.body.classList.toggle('canuse', canUse);
    shakeAmt = Math.max(0, shakeAmt - dt * 30);
    draw();
    requestAnimationFrame(frame);
  }

  function titleUpdate(dt) {
    cam.x = U.clamp(BOAT_X - cam.w / 2 + Math.sin(t * 0.07) * 380, 0, Math.max(0, AT.World.W - cam.w));
    cam.y = -cam.h * 0.42 + Math.sin(t * 0.11) * 90;
    if (Math.random() < dt * 3) AT.Render.bubbles(cam.x + Math.random() * cam.w, cam.y + cam.h + 10, 1, 2);
    AT.Creatures.update(dt, t);
  }

  function play(dt, s) {
    const D = AT.Diver.D, S = AT.Shop.S;
    S.time += dt;
    AT.Diver.update(dt, t, true);
    updateCamera(dt);
    AT.World.explore(D.x, D.y, Math.max(260, AT.Shop.val('lamp') + 60));
    const depthM = AT.Diver.depth();
    const zone = AT.World.zoneAtY(D.y);

    // new zone!
    zoneToastT -= dt;
    if (zone !== lastZone) {
      if (zone > lastZone && zoneToastT <= 0) { AT.HUD.zoneBanner(AT.ZONES[zone].name, AT.ZONES[zone].from); AT.Audio.discover(); zoneToastT = 8; }
      lastZone = zone;
    }
    audioT -= dt;
    if (audioT <= 0) { AT.Audio.setState(zone, D.atSurface, depthM); audioT = 0.4; }

    // diving in from the surface counts as a new dive
    if (wasSurface && !D.atSurface && D.y > 70) { S.dives++; wasSurface = false; overToast = false; AT.Render.bubbles(D.x, D.y - 20, 18, 16); }
    if (D.atSurface) wasSurface = true;
    if (D.overDepth > 0 && !overToast) { overToast = true; AT.HUD.toast('Too deep for your suit! Upgrade it at the boat.', '#ff9a9a'); AT.Audio.danger(); }

    items(dt);

    // at the boat: sell treasure and shop
    prompt = '';
    const nearBoat = D.atSurface && Math.abs(D.x - BOAT_X) < 190;
    if (nearBoat) {
      if (D.bag.length) sell();
      prompt = AT.Input.say('use') + ' to open the shop';
      if (s.useP) { setState('shop'); AT.Shop.open(); AT.Audio.tick(); return; }
    } else if (D.atSurface && D.bag.length) {
      prompt = 'Swim to the boat to sell your treasure';
    }

    if (D.air <= 0) { startRescue(); return; }
    if (s.pauseP) setState('pause');
    else if (s.mapP) setState('map');
    else if (s.journalP) openJournal();
    saveT += dt;
    if (saveT > 15) { saveT = 0; AT.Shop.save(); }
  }

  // ---------- treasure ----------
  function items(dt) {
    const D = AT.Diver.D, S = AT.Shop.S;
    fullToastT -= dt;
    for (const it of AT.World.items) {
      if (it.gone || it.inBag) continue;
      const d = U.dist(it.x, it.y, D.x, D.y);
      if (it.ch === 'o') it.open = U.clamp(it.open + (d < 120 ? dt * 3 : -dt * 2), 0, 1);
      if (d > 38) continue;
      if (it.ch === '!') {
        if (!S.tablets.includes(it.tablet)) {
          S.tablets.push(it.tablet);
          AT.Shop.save();
          openTablet(it.tablet);
          AT.Render.sparks(it.x, it.y, 20, [120, 240, 255]);
          AT.Audio.tablet();
          return;
        }
        continue;
      }
      if (it.ch === 'Y') { startEnding(it); return; }
      if (D.bag.length >= AT.Shop.val('bag')) {
        if (fullToastT <= 0) { AT.HUD.toast('Your bag is full! Go back to the boat to sell.', '#ff9a9a'); AT.Audio.nope(); fullToastT = 5; }
        continue;
      }
      it.inBag = true;
      D.bag.push({ ch: it.ch, value: it.value, id: it.id, it });
      AT.Render.sparks(it.x, it.y, 14, [255, 220, 110]);
      AT.Render.ring(it.x, it.y, [255, 230, 140], 46, 0.5);
      AT.Render.text(it.x, it.y - 28, '+' + it.value, '#ffe08a');
      AT.Audio.pickup(it.value);
      if (it.ch === '@') AT.HUD.toast('Treasure chest! Worth ' + it.value + ' gold!', '#ffe08a');
    }
  }

  function sell() {
    const D = AT.Diver.D, S = AT.Shop.S;
    let total = 0;
    for (const b of D.bag) {
      total += b.value;
      if (b.it.respawn) b.it.inBag = false;          // the sea makes new coins and pearls
      else { b.it.gone = true; b.it.inBag = false; S.taken.push(b.id); }
    }
    const n = D.bag.length;
    D.bag = [];
    S.gold += total; S.earned += total;
    AT.HUD.fly(D.x, D.y, Math.min(14, 3 + n * 2));
    AT.HUD.toast(`Sold ${n} treasure${n > 1 ? 's' : ''} for ${U.fmt(total)} gold!`, '#ffe08a');
    AT.Audio.sell(n);
    AT.Shop.save();
  }

  function openTablet(i) {
    const [title, text] = AT.TABLETS[i] || ['???', ''];
    const el = $('tablet');
    el.querySelector('.num').textContent = `TABLET ${['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][i]} OF XII`;
    el.querySelector('h2').textContent = title;
    el.querySelector('p').textContent = text;
    el.querySelector('.hint').textContent = AT.Input.say('cont') + ' to continue';
    setState('tablet');
  }

  function openJournal() {
    const S = AT.Shop.S, el = $('journal');
    const grid = el.querySelector('.grid');
    grid.innerHTML = '';
    for (const [k, info] of Object.entries(AT.Creatures.INFO)) {
      const card = document.createElement('div');
      const known = S.journal.includes(k);
      card.className = 'jcard' + (known ? '' : ' unknown');
      if (known) card.appendChild(AT.Creatures.portrait(k, 96));
      else { const q = document.createElement('div'); q.className = 'q'; q.textContent = '?'; card.appendChild(q); }
      const info2 = document.createElement('div');
      info2.innerHTML = known ? `<h4>${info.name}</h4><p>${info.text}</p>` : '<h4>???</h4><p>Not found yet.</p>';
      card.appendChild(info2);
      grid.appendChild(card);
    }
    const tl = el.querySelector('.tablets');
    tl.innerHTML = AT.TABLETS.map(([title, text], i) => S.tablets.includes(i)
      ? `<details><summary><b>${i + 1}.</b> ${title}</summary><p>${text}</p></details>`
      : `<div class="locked"><b>${i + 1}.</b> ??? (not found)</div>`).join('');
    el.querySelector('.count').textContent = `${S.journal.length} / ${Object.keys(AT.Creatures.INFO).length} creatures  ·  ${S.tablets.length} / 12 tablets`;
    setState('journal');
  }

  function discover(type) {
    const S = AT.Shop.S;
    if (S.journal.includes(type)) return;
    S.journal.push(type);
    AT.HUD.toast(`New creature: ${AT.Creatures.INFO[type].name}!  (${AT.Input.say('journal')} = journal)`, '#9ff7ff');
    AT.Audio.discover();
    AT.Shop.save();
  }

  function onBreak(tx, ty) {
    const S = AT.Shop.S;
    S.broken.push(tx + ty * AT.World.cols);
    AT.HUD.toast('You found a secret room!', '#ffe08a');
    AT.Shop.save();
  }

  // ---------- out of air: the dolphin saves you ----------
  function startRescue() {
    state = 'rescue';
    rescue = { t: 0, moved: false };
    AT.Audio.faint();
    prompt = '';
  }
  function rescueUpdate(dt) {
    const r = rescue, D = AT.Diver.D;
    r.t += dt;
    if (!r.moved) { D.vx *= 0.95; D.vy = -20; D.y += D.vy * dt; updateCamera(dt); }
    if (r.t > 1.1 && !r.moved) {
      r.moved = true;
      for (const b of D.bag) b.it.inBag = false;       // the treasure falls back where it was
      D.bag = [];
      AT.Diver.reset(BOAT_X + 110, 20);
      snapCamera();
      AT.Shop.save();
      AT.Audio.dolphin();
      AT.Audio.splash();
    }
    if (r.moved) { AT.Diver.update(dt, t, false); updateCamera(dt); }
    // the dolphin jumps over the waves
    const k = (r.t - 1.4) / 1.6;
    if (k > 0 && k < 1) {
      const x = BOAT_X + 420 - k * 560, y = -Math.sin(k * Math.PI) * 160 + 10;
      if (Math.abs(k - 0.02) < 0.02 || Math.abs(k - 0.98) < 0.02) { AT.Render.bubbles(x, 10, 10, 20); AT.Render.dust(x, 0, 6, [230, 250, 255]); }
      r.dolphin = { x, y, a: Math.atan2(-Math.cos(k * Math.PI) * 160 * Math.PI, -560) + Math.PI };
    } else r.dolphin = null;
    if (r.t > 3.3) {
      state = 'play';
      rescue = null;
      AT.HUD.toast('A friendly dolphin brought you back to the boat!', '#9ff7ff');
      AT.HUD.toast('The treasure in your bag was lost.', '#ffb3b3');
      discover('dolphin');
    }
  }

  // ---------- the ending ----------
  function startEnding(it) {
    const S = AT.Shop.S;
    state = 'ending';
    ending = { t: 0, it, shown: false };
    it.gone = true;
    awake = true;
    if (!S.trident) { S.trident = true; }
    if (!S.taken.includes(it.id)) S.taken.push(it.id);
    AT.Shop.save();
    AT.Audio.fanfare();
    shake(14);
    AT.Render.sparks(it.x, it.y, 60, [255, 225, 120], 300);
    AT.Render.ring(it.x, it.y, [255, 230, 140], 300, 1.5);
    AT.Render.ring(it.x, it.y, [140, 240, 255], 500, 2.2);
  }
  function endingUpdate(dt, s) {
    const e = ending, D = AT.Diver.D;
    e.t += dt;
    D.vx *= 0.9; D.vy *= 0.9;
    AT.Diver.update(dt, t, false);
    updateCamera(dt);
    if (Math.random() < dt * 12) AT.Render.sparks(D.x + U.rand(-300, 300), D.y + U.rand(-200, 200), 1, [255, 230, 140], 40);
    if (e.t > 3.2 && !e.shown) {
      e.shown = true;
      const S = AT.Shop.S;
      const mins = Math.floor(S.time / 60);
      $('ending-stats').innerHTML = `
        <div><b>${mins}</b><span>minutes</span></div>
        <div><b>${S.dives}</b><span>dives</span></div>
        <div><b>${U.fmt(S.earned)}</b><span>gold earned</span></div>
        <div><b>${S.tablets.length}/12</b><span>tablets</span></div>
        <div><b>${S.journal.length}/${Object.keys(AT.Creatures.INFO).length}</b><span>creatures</span></div>`;
      show('ending', true);
      setMenu($('ending'));
    }
    if (e.shown) menuInput(s);
  }

  // ---------- drawing ----------
  function draw() {
    const R = AT.Render;
    const sx = (Math.random() - 0.5) * shakeAmt, sy = (Math.random() - 0.5) * shakeAmt;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = true;
    R.background(g, cam, t, W, H, scale);
    R.parallax(g, cam, t, scale);
    R.marineSnow(g, cam, t, W, H, scale);
    R.sky(g, cam, t, W, H, scale);
    g.setTransform(scale, 0, 0, scale, -cam.x * scale + sx, -cam.y * scale + sy);
    AT.World.drawChunks(g, cam);
    drawPlants(g);
    drawItems(g);
    AT.Creatures.draw(g, t, cam);
    drawBoat(g);
    if (state !== 'title') AT.Diver.draw(g, t);
    if (rescue && rescue.dolphin) AT.Creatures.dolphin(g, rescue.dolphin.x, rescue.dolphin.y, rescue.dolphin.a, t, 1.1);
    R.drawParticles(g);
    R.rays(g, cam, t);
    R.surface(g, cam, t);
    g.setTransform(1, 0, 0, 1, 0, 0);
    R.caustics(g, cam, t, W, H, scale);
    R.lighting(g, cam, collectLights(), W, H, scale);
    R.glowPlankton(g, cam, t, W, H, scale);
    g.drawImage(R.vignette, 0, 0);
    if (state === 'ending' && ending) {
      const a = Math.max(0, 1 - ending.t / 1.2);
      if (a > 0) { g.fillStyle = `rgba(255,245,210,${a * 0.9})`; g.fillRect(0, 0, W, H); }
    }
    if (rescue) {
      const a = rescue.t < 1.1 ? rescue.t / 1.1 : Math.max(0, 1 - (rescue.t - 1.1) / 0.8);
      g.fillStyle = `rgba(210,240,255,${a})`; g.fillRect(0, 0, W, H);
    }
    if (state === 'play' || state === 'rescue' || state === 'shop' || state === 'tablet' || state === 'journal' || state === 'pause') AT.HUD.draw(g, W, H, t, cam, scale);
    if (state === 'map') AT.HUD.drawMap(g, W, H, t);
  }

  function collectLights() {
    const L = [], D = AT.Diver.D;
    if (state !== 'title') {
      const h = AT.Diver.head();
      L.push({ cone: true, x: h.x, y: h.y, angle: D.look, r: AT.Shop.val('lamp') * 1.6, i: 1 });
      L.push({ x: D.x, y: D.y, r: 120, i: 0.75 });
      for (const b of D.bolts) L.push({ x: b.x, y: b.y, r: 60, i: 0.8, color: [120, 240, 255] });
    }
    for (const it of AT.World.items) {
      if (it.gone || it.inBag) continue;
      if (it.ch === 'Y') L.push({ x: it.x, y: it.y - 10, r: 320, i: 1, color: [255, 220, 120], glow: 1.4 });
      else if (it.ch === '!') L.push({ x: it.x, y: it.y, r: 110, i: AT.Shop.S.tablets.includes(it.tablet) ? 0.4 : 0.85, color: [110, 235, 255] });
      else L.push({ x: it.x, y: it.y, r: 75, i: 0.55, color: [255, 215, 110], glow: 0.7 });
    }
    for (const w of AT.World.glows) {
      let i = 0.8;
      if (w.kind === 'lamp') i = 0.85 + Math.sin(t * 9 + w.x) * 0.06 + Math.sin(t * 13.7 + w.y) * 0.05;
      if (w.kind === 'rune') i = 0.55 + Math.sin(t * 1.5 + w.x * 0.01) * 0.25;
      if (w.kind === 'crystal') i = 0.7 + Math.sin(t * 2 + w.y) * 0.15;
      if (awake) i = Math.min(1, i + 0.25);
      L.push({ x: w.x, y: w.y, r: w.r * (awake ? 1.3 : 1), i, color: w.color });
    }
    AT.Creatures.lights(L, t);
    return L;
  }

  function drawPlants(g) {
    const x0 = cam.x - 100, x1 = cam.x + cam.w + 100, y0 = cam.y - 50, y1 = cam.y + cam.h + 300;
    for (const k of AT.World.kelp) {
      if (k.x < x0 || k.x > x1 || k.y < y0 || k.y > y1) continue;
      const h = k.h * T * 0.95, n = 12;
      const deep = k.zone;
      const col = deep ? ['#3f6b33', '#7a8f3a'] : ['#4f8a34', '#a8b84a'];
      let px = k.x, py = k.y;
      const pts = [[px, py]];
      for (let i = 1; i <= n; i++) {
        const f = i / n;
        px = k.x + Math.sin(t * 1.1 + k.seed + i * 0.35) * f * 18 + Math.sin(t * 0.4) * f * 10;
        py = k.y - f * h;
        pts.push([px, py]);
      }
      g.lineCap = 'round';
      for (let i = 1; i < pts.length; i++) {
        g.strokeStyle = i % 2 ? col[0] : col[1];
        g.lineWidth = 7 - (i / n) * 4;
        g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
        if (i % 2 === 0) {
          const s = (i / 2) % 2 ? 1 : -1;
          g.fillStyle = col[1];
          g.save(); g.translate(pts[i][0], pts[i][1]); g.rotate(s * 0.9 + Math.sin(t * 1.5 + i + k.seed) * 0.2);
          g.beginPath(); g.ellipse(s * 10, 0, 12, 4.5, 0, 0, Math.PI * 2); g.fill();
          g.restore();
        }
      }
      // a little bladder at the top
      g.fillStyle = '#c9b04a'; g.beginPath(); g.arc(px, py, 4, 0, Math.PI * 2); g.fill();
    }
    for (const gr of AT.World.grass) {
      if (gr.x < x0 || gr.x > x1 || gr.y < y0 || gr.y > y1) continue;
      g.strokeStyle = gr.zone ? '#4d7a45' : '#5aa860'; g.lineWidth = 3; g.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const bx = gr.x - 15 + i * 5, h = 18 + U.hash(i, gr.seed) * 22;
        const sw = Math.sin(t * 1.6 + gr.seed + i * 0.6) * 7;
        g.beginPath(); g.moveTo(bx, gr.y); g.quadraticCurveTo(bx + sw * 0.4, gr.y - h * 0.6, bx + sw, gr.y - h); g.stroke();
      }
    }
  }

  function drawItems(g) {
    const S = AT.Shop.S;
    for (const it of AT.World.items) {
      if (it.gone || it.inBag) continue;
      if (it.x < cam.x - 60 || it.x > cam.x + cam.w + 60 || it.y < cam.y - 90 || it.y > cam.y + cam.h + 60) continue;
      const floats = it.ch === '*' || it.ch === 'W' || it.ch === 'u' || it.ch === '!' || it.ch === 'Y';
      const y = it.y + (floats ? Math.sin(t * 2 + it.bob) * (it.ch === 'Y' ? 6 : 3) : 0);
      // soft glow behind
      const found = it.ch === '!' && S.tablets.includes(it.tablet);
      const glowCol = it.ch === '!' ? [110, 235, 255] : [255, 215, 110];
      g.globalAlpha = found ? 0.25 : 0.55 + Math.sin(t * 3 + it.bob) * 0.15;
      const gs = it.ch === 'Y' ? 120 : 34;
      g.drawImage(AT.Render.glow(glowCol), it.x - gs, y - gs, gs * 2, gs * 2);
      g.globalAlpha = 1;
      if (it.ch === 'Y') {
        // rays of light around the Trident
        g.save(); g.translate(it.x, y - 10); g.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 8; i++) {
          g.rotate(Math.PI / 4 + Math.sin(t * 0.5) * 0.02);
          g.fillStyle = `rgba(255,230,150,${0.08 + 0.05 * Math.sin(t * 2 + i)})`;
          g.beginPath(); g.moveTo(0, 0); g.lineTo(-14, -170); g.lineTo(14, -170); g.fill();
        }
        g.restore();
      }
      g.save(); g.translate(it.x, y);
      if (found) g.globalAlpha = 0.6;
      AT.Art.treasure(g, it.ch, it.id, it.open);
      g.restore();
      if (Math.random() < 0.012 && !found) AT.Render.sparks(it.x + U.rand(-12, 12), y + U.rand(-12, 8), 1, [255, 245, 200], 20);
    }
  }

  let boatCanvas = null;
  function drawBoat(g0) {
    const X = BOAT_X;
    if (X < cam.x - 300 || X > cam.x + cam.w + 300 || cam.y > 260) return;
    const BR = 2, BW = 420, BH = 340;
    if (!boatCanvas) boatCanvas = U.canvas(BW * BR, BH * BR);
    const g = boatCanvas.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, BW * BR, BH * BR);
    g.setTransform(BR, 0, 0, BR, (BW / 2) * BR, 260 * BR);
    const x = 0;
    const y = AT.Render.waveY(X, t);
    const slope = (AT.Render.waveY(X + 60, t) - AT.Render.waveY(X - 60, t)) / 120;
    g.save(); g.translate(x, y + 6); g.rotate(Math.atan(slope) * 0.8);
    // mast, sail and flag
    g.fillStyle = '#6b4424'; g.fillRect(-8, -210, 7, 180);
    g.fillStyle = '#f4ecd8';
    g.beginPath(); g.moveTo(0, -200); g.quadraticCurveTo(70 + Math.sin(t * 1.3) * 6, -130, 4, -48); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(120,90,50,0.35)'; g.lineWidth = 1.5; g.stroke();
    g.fillStyle = '#2a7aa8';
    g.beginPath(); g.moveTo(-1, -210); g.lineTo(34 + Math.sin(t * 5) * 3, -200); g.lineTo(-1, -190); g.fill();
    g.fillStyle = '#ffd966'; g.font = 'bold 13px Cinzel, serif'; g.textAlign = 'center'; g.fillText('Ψ', 12, -196);
    // cabin
    g.fillStyle = '#e8dcc0'; g.fillRect(-90, -62, 70, 36);
    g.fillStyle = '#b5553a'; g.beginPath(); g.moveTo(-98, -60); g.lineTo(-55, -80); g.lineTo(-12, -60); g.fill();
    g.fillStyle = '#7fd0f0'; g.fillRect(-80, -52, 16, 13); g.fillRect(-52, -52, 16, 13);
    g.strokeStyle = '#6b4424'; g.lineWidth = 2; g.strokeRect(-80, -52, 16, 13); g.strokeRect(-52, -52, 16, 13);
    // lantern
    g.fillStyle = '#3a2a1a'; g.fillRect(70, -70, 3, 40);
    g.fillStyle = `rgba(255,210,120,${0.85 + Math.sin(t * 7) * 0.1})`; g.beginPath(); g.arc(72, -74, 6, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 0.35; g.drawImage(AT.Render.glow([255, 200, 110]), 72 - 40, -74 - 40, 80, 80); g.globalAlpha = 1;
    // hull
    const hg = g.createLinearGradient(0, -30, 0, 40);
    hg.addColorStop(0, '#9a5a2e'); hg.addColorStop(1, '#4a2812');
    g.fillStyle = hg;
    g.beginPath(); g.moveTo(-140, -30); g.lineTo(140, -30); g.quadraticCurveTo(128, 30, 90, 40); g.lineTo(-100, 40); g.quadraticCurveTo(-130, 20, -140, -30); g.fill();
    g.fillStyle = '#f4ecd8'; g.fillRect(-138, -30, 276, 8);
    g.fillStyle = '#2a7aa8'; g.fillRect(-134, -16, 266, 5);
    g.strokeStyle = 'rgba(40,20,5,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-128 + i * 4, 2 + i * 12); g.lineTo(122 - i * 12, 2 + i * 12); g.stroke(); }
    g.fillStyle = '#fff'; g.font = 'bold 13px Nunito, sans-serif'; g.fillText('SEA SPARROW', 20, -1);
    // ladder into the water
    g.strokeStyle = '#c9c9c9'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(118, -30); g.lineTo(122, 60); g.moveTo(132, -30); g.lineTo(136, 60); g.stroke();
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(119 + i * 0.8, -18 + i * 17); g.lineTo(133 + i * 0.8, -18 + i * 17); g.stroke(); }
    g.restore();
    // the part under water looks blue (only the boat, not the sea around it)
    g.globalCompositeOperation = 'source-atop';
    g.beginPath(); g.moveTo(-BW / 2, 80);
    for (let px = -BW / 2; px <= BW / 2; px += 10) g.lineTo(px, AT.Render.waveY(X + px, t));
    g.lineTo(BW / 2, 80); g.closePath();
    g.fillStyle = U.css(AT.Render.waterAt(3), 0.55); g.fill();
    g.globalCompositeOperation = 'source-over';
    g0.drawImage(boatCanvas, X - BW / 2, -260, BW, BH);
  }

  // ---------- helpers other files use ----------
  function shake(n) { shakeAmt = Math.max(shakeAmt, n); }
  function teleport(m) {
    const ty = Math.floor((m * M) / T);
    let best = null;
    for (let d = 0; d < 48 && !best; d++) for (const dy of [0, 1, -1, 2, -2]) for (const tx of [24 + d, 24 - d]) {
      if (!best && !AT.World.solid(tx, ty + dy) && !AT.World.solid(tx, ty + dy - 1) && tx > 0 && tx < 47) best = [tx, ty + dy];
    }
    if (!best) return;
    const D = AT.Diver.D;
    D.x = best[0] * T + T / 2; D.y = best[1] * T + T / 2; D.vx = D.vy = 0; D.atSurface = false; wasSurface = false;
    lastZone = AT.World.zoneAtY(D.y);
    snapCamera();
  }

  return {
    init, discover, onBreak, shake, closePanel, teleport, setState, snapCamera, openTablet, openJournal,
    toast: (s, c) => AT.HUD.toast(s, c),
    BOAT_X, cam,
    get state() { return state; }, get prompt() { return prompt; }, get awake() { return awake; }, get rescuing() { return !!rescue; },
  };
})();

window.addEventListener('load', () => AT.Game.init());
