// ============================================================
//  DEAD ACRES — THE GAME
//  Menus, the main loop, day and night, saving, and the rules.
//
//  How online works: the HOST's computer is the boss of the
//  world. Everyone asks the host to do things ("actions", like
//  "I hit tree 12") and the host tells everyone what happened
//  ("events", like "tree 12 fell down").
//  When you play alone, you are the host (with no friends).
// ============================================================
window.DA = window.DA || {};

DA.Game = (function () {
  const U = DA.U, W = DA.World, C = DA.Collide, A = DA.Audio, Inv = DA.Inv, HUD = DA.HUD, Net = DA.Net, ITEMS = DA.ITEMS, MAP = DA.MAP;
  const $ = (id) => document.getElementById(id);
  const SAVE_KEY = 'deadacres.save', BEST_KEY = 'deadacres.best', NAME_KEY = 'deadacres.name';
  const REGROW = { tree: 3, rock: 4, bush: 1 };
  const HORDE_EVERY = 5;
  const COLORS_CSS = ['#ff9a50', '#6ab0ff', '#70e080', '#e080e0'];

  let renderer, scene, cam, clock;
  let P, me, Z, B, FX;

  const G = {
    mode: 'loading',        // loading, title, play
    isHost: true,
    myPid: 'h', myName: 'Survivor', myColor: 0,
    players: new Map(),     // pid -> { pid, name, color, x, y, z, yaw, item, flags, hp, alive, remote }
    state: null,            // the world's memory (saved)
    hour: 8,
    paused: false,
    get day() { return G.state ? G.state.day : 1; },
  };

  function freshState() {
    return {
      v: 1, seed: MAP.seed, day: 1, time: 7.2,
      gone: { tree: {}, rock: {}, bush: {} },
      boxes: {}, builds: {}, bags: {},
      radio: { parts: 0, fixed: false, found: {}, heli: 0, heliT: 0, hordeTonight: false },
      nextId: 1, players: {}, hordeNight: 0, kills: 0, lastDawn: 1,
      dogs: {}, drops: {}, lastDrop: 0,
    };
  }

  // ============================================================
  //  SETUP
  // ============================================================
  // everything that happens once, while the loading screen is up
  function setupSteps() {
    return [
      ['Starting the 3D engine', () => {
        renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: !DA.lowGfx, powerPreference: 'high-performance' });
        renderer.setPixelRatio(DA.lowGfx ? Math.min(1, devicePixelRatio) : Math.min(1.5, devicePixelRatio));
        renderer.shadowMap.enabled = !DA.lowGfx;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.autoClear = false;
        scene = new THREE.Scene();
        cam = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.08, 480);
        cam.rotation.order = 'YXZ';
        scene.add(cam);
        clock = new THREE.Clock();
        window.addEventListener('resize', resize);
        resize();
        DA.Input.init($('game'));
      }],
      ...W.buildSteps(null).map(([label], i) => [label, () => W.buildSteps(scene)[i][1]()]),
      ['Waking up the zombies', () => {
        Z = DA.Zombies; B = DA.Build; FX = DA.Effects; P = DA.Player; me = P.me;
        Z.init(W, scene); B.init(W, scene); FX.init(scene); DA.Dogs.init(W, scene);
        setupLights();
      }],
      ['Drawing the items', () => {
        try { Inv.makeIcons(renderer); } catch (e) { console.warn('item pictures failed', e); }
        Inv.UI.init();
        Inv.onChange = () => HUD.drawHotbar();
        P.init(W, scene, cam);
        setupMenus();
        Net.onMessage = onNetMessage;
        Net.onLeave = onFriendLeft;
        Net.onClose = (why) => { if (G.mode === 'play' && !G.isHost) toTitle(why); };
        G.onHurt = (dmg) => HUD.hurt(dmg);
      }],
    ];
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
  }

  // ---------- lights that move around (fires, torches) ----------
  // A fixed number of lights is used so the game doesn't stutter.
  const pool = [];
  let flashlight;
  function setupLights() {
    const n = DA.lowGfx ? 3 : 6;
    for (let i = 0; i < n; i++) {
      const l = new THREE.PointLight(0xff9a40, 0, 16, 1.6);
      scene.add(l); pool.push(l);
    }
    flashlight = new THREE.SpotLight(0xfff4d8, 0, 38, 0.42, 0.45, 1.3);
    cam.add(flashlight);
    flashlight.position.set(0.25, -0.2, 0);
    flashlight.target.position.set(0, 0, -5);
    cam.add(flashlight.target);
  }
  function updateLights(t) {
    const src = [];
    for (const l of B.lights) src.push({ x: l.x, y: l.y, z: l.z, i: 14, d: 17, c: 0xff9a40, flick: 1 });
    const held = Inv.held();
    if (me.alive && held && held.id === 'torch') src.push({ x: me.x, y: me.y + 1.9, z: me.z, i: 9, d: 15, c: 0xffa050, flick: 1, mine: 1 });
    for (const p of G.players.values()) {
      if (p.pid === G.myPid || !p.remote || !p.alive) continue;
      if (p.item === 'torch') src.push({ x: p.x, y: p.y + 1.8, z: p.z, i: 9, d: 15, c: 0xffa050, flick: 1 });
      else if (p.item === 'flashlight' && (p.flags & 4)) src.push({ x: p.x - Math.sin(p.yaw) * 2, y: p.y + 1.5, z: p.z - Math.cos(p.yaw) * 2, i: 6, d: 12, c: 0xfff0d0 });
    }
    if (G.heliObj && G.heliObj.visible) src.push({ x: G.heliObj.position.x, y: G.heliObj.position.y - 1, z: G.heliObj.position.z, i: 30, d: 40, c: 0xffffff });
    for (const s of src) s.dist = s.mine ? -1 : U.dist(s.x, s.z, me.x, me.z);
    src.sort((a, b) => a.dist - b.dist);
    for (let i = 0; i < pool.length; i++) {
      const l = pool[i], s = src[i];
      if (!s || s.dist > 60) { l.intensity = 0; continue; }
      l.position.set(s.x, s.y, s.z);
      l.color.set(s.c);
      l.distance = s.d;
      l.intensity = s.i * (s.flick ? 0.85 + Math.sin(t * 17 + i) * 0.08 + Math.random() * 0.1 : 1);
    }
    flashlight.intensity = me.alive && held && held.id === 'flashlight' ? 60 : 0;
  }

  // ============================================================
  //  TIME OF DAY
  // ============================================================
  const hourRate = (h) => (h >= 6 && h < 20 ? 14 / 480 : 10 / 240); // game hours per second
  function secondsUntil(from, to) {
    let s = 0, h = from;
    for (let i = 0; i < 200 && Math.abs(h - to) > 0.01; i++) {
      const next = h < 6 ? 6 : h < 20 ? 20 : 24;
      const target = (to > h && to <= next) ? to : next;
      s += (target - h) / hourRate(h === 24 ? 0 : h);
      h = target >= 24 ? 0 : target;
      if (Math.abs(h - to) < 0.01) break;
    }
    return s;
  }
  const isHordeNight = () => G.state && (G.state.day % HORDE_EVERY === 0 || G.state.radio.hordeTonight);

  function advanceTime(dt) {
    const s = G.state;
    const before = s.time;
    s.time += hourRate(s.time) * dt;
    if (s.time >= 24) s.time -= 24;
    // dawn: a new day
    if (before < 6 && s.time >= 6) newDay();
    // dusk
    if (before < 12 && s.time >= 12 && s.lastDrop !== s.day) { s.lastDrop = s.day; supplyDrop(); }
    if (before < 20.2 && s.time >= 20.2) {
      if (isHordeNight() && s.hordeNight !== s.day) {
        s.hordeNight = s.day;
        const n = 18 + s.day * 2 + (s.radio.hordeTonight ? 15 : 0);
        Z.startHorde(Math.min(60, n), true);
        emit({ t: 'horde' });
      } else emit({ t: 'night' });
    }
    G.hour = s.time;
  }

  function newDay() {
    const s = G.state;
    s.day++;
    // trees, rocks and bushes grow back
    for (const kind of ['tree', 'rock', 'bush']) {
      for (const id in s.gone[kind]) if (s.day - s.gone[kind][id] >= REGROW[kind]) { delete s.gone[kind][id]; emit({ t: 'gone', kind, id: +id, v: false }); }
    }
    s.radio.hordeTonight = false;
    for (const d of Object.values(s.drops)) if (s.day - d.day >= 3) { delete s.drops[d.id]; delete s.boxes['d' + d.id]; emit({ t: 'undrop', id: d.id }); }
    emit({ t: 'xp', n: 25, why: 'survived the night' });
    if (s.radio.fixed && !s.radio.heli) { s.radio.heli = 1; s.radio.heliT = 0; emit({ t: 'heli', s: 1 }); }
    emit({ t: 'day', day: s.day });
    save();
  }

  // ============================================================
  //  ACTIONS: someone wants to do something
  // ============================================================
  G.act = function (a) {
    if (G.isHost) handleAction(a, G.myPid);
    else Net.send({ k: 'act', a });
  };
  // tell others about a little effect (sound + particles) we already made
  let fxBudget = 0;
  G.fx = function (k, x, y, z) {
    if (!Net.online || fxBudget > 6) return;
    fxBudget++;
    G.act({ t: 'fx', k, x: U.round(x), y: U.round(y), z: U.round(z) });
  };

  // send an event to everyone (or one player) and do it here too
  function emit(ev, to) {
    if (!G.isHost) return;
    if (to && to !== G.myPid) { Net.sendTo(to, { k: 'ev', ev }); return; }
    if (!to) Net.broadcast({ k: 'ev', ev });
    applyEvent(ev);
  }
  function emitExcept(ev, pid) {
    Net.broadcast({ k: 'ev', ev }, pid);
    if (pid !== G.myPid) applyEvent(ev);
  }
  const give = (pid, items, note) => emit({ t: 'give', items, note }, pid);
  const newId = () => G.state.nextId++;
  const pname = (pid) => (G.players.get(pid) || {}).name || '?';

  function rollLoot(kind, slots) {
    const L = DA.LOOT[kind] || DA.LOOT.kitchen;
    const n = U.randInt(L.rolls[0], L.rolls[1]);
    const tot = L.table.reduce((a, r) => a + r[1], 0);
    const items = new Array(slots).fill(null);
    for (let i = 0; i < n; i++) {
      let r = Math.random() * tot, row = L.table[0];
      for (const t of L.table) { r -= t[1]; if (r <= 0) { row = t; break; } }
      const cnt = U.randInt(row[2], row[3]);
      const same = items.find((s) => s && s[0] === row[0]);
      if (same) same[1] = Math.min(ITEMS[row[0]].stack, same[1] + cnt);
      else { const free = items.indexOf(null); if (free >= 0) items[free] = [row[0], cnt]; }
    }
    return items;
  }

  // open a cupboard / box / backpack. Makes loot the first time
  function boxFor(cid) {
    const s = G.state;
    const kind = cid[0], id = +cid.slice(1);
    if (kind === 'c') {
      const cont = W.containers[id];
      if (!cont) return null;
      let bx = s.boxes[cid];
      const empty = !bx || bx.items.every((x) => !x);
      if (!bx || (empty && s.day - bx.day >= DA.LOOT_REFILL_DAYS)) {
        bx = { items: rollLoot(cont.loot, cont.slots), day: s.day };
        if (cont.radio && !s.radio.found[cid]) {
          s.radio.found[cid] = true;
          const free = bx.items.indexOf(null);
          bx.items[free >= 0 ? free : 0] = ['radiopart', 1];
        }
        s.boxes[cid] = bx;
      }
      return bx;
    }
    return s.boxes[cid] || null;
  }

  function addToBox(bx, id, n) {
    const st = ITEMS[id] ? ITEMS[id].stack : 1;
    for (const sl of bx.items) if (sl && sl[0] === id && sl[1] < st && n > 0) { const k = Math.min(n, st - sl[1]); sl[1] += k; n -= k; }
    for (let i = 0; i < bx.items.length && n > 0; i++) if (!bx.items[i]) { const k = Math.min(n, st); bx.items[i] = [id, k]; n -= k; }
    return n;
  }

  function makeBag(x, y, z, items, owner) {
    const id = newId();
    const list = items.filter(Boolean);
    const bx = { items: new Array(Math.max(12, list.length)).fill(null), day: G.state.day };
    list.forEach((it, i) => (bx.items[i] = it));
    G.state.boxes['g' + id] = bx;
    const bag = { id, x: U.round(x), y: U.round(y), z: U.round(z), owner: owner || '' };
    G.state.bags[id] = bag;
    emit({ t: 'bag', bag });
    return bag;
  }

  function checkBagEmpty(cid) {
    if (cid[0] === 'd') {
      const bx = G.state.boxes[cid];
      if (bx && bx.items.every((x) => !x)) { const id = +cid.slice(1); delete G.state.boxes[cid]; delete G.state.drops[id]; emit({ t: 'undrop', id }); }
      return;
    }
    if (cid[0] !== 'g') return;
    const bx = G.state.boxes[cid];
    if (bx && bx.items.every((x) => !x)) {
      const id = +cid.slice(1);
      delete G.state.boxes[cid]; delete G.state.bags[id];
      emit({ t: 'unbag', id });
    }
  }

  const resHp = {};
  function handleAction(a, pid) {
    const s = G.state;
    if (!a || !s) return;
    const pl = G.players.get(pid);
    switch (a.t) {
      case 'hitRes': {
        const list = W.res[a.kind];
        const o = list && list[a.id];
        if (!o || s.gone[a.kind][a.id] !== undefined) return;
        const key = a.kind + a.id;
        const max = a.kind === 'tree' ? 100 : 60 + 60 * o.s;
        if (resHp[key] === undefined) resHp[key] = max;
        const power = U.clamp(a.power || 1, 1, 6);
        resHp[key] -= 10 + power * 6;
        const got = [[a.kind === 'tree' ? 'wood' : 'stone', power]];
        if (resHp[key] <= 0) {
          delete resHp[key];
          s.gone[a.kind][a.id] = s.day;
          got[0][1] += 2 + power;
          if (a.kind === 'tree' && o.type === 'oak' && Math.random() < 0.3) got.push(['apple', U.randInt(1, 2)]);
          if (a.kind === 'rock' && Math.random() < 0.15) got.push(['scrap', 1]);
          emit({ t: 'gone', kind: a.kind, id: a.id, v: true, fx: a.fx, fz: a.fz });
          emit({ t: 'xp', n: 3, why: a.kind === 'tree' ? 'tree' : 'rock' }, pid);
        }
        give(pid, got);
        break;
      }
      case 'pick': {
        const b = W.res.bush[a.id];
        if (!b || !b.berries || s.gone.bush[a.id] !== undefined) return;
        s.gone.bush[a.id] = s.day;
        emit({ t: 'gone', kind: 'bush', id: a.id, v: true });
        give(pid, [['berries', U.randInt(2, 4)]]);
        break;
      }
      case 'open': {
        const bx = boxFor(a.cid);
        emit({ t: 'box', cid: a.cid, items: bx ? bx.items : [] }, pid);
        break;
      }
      case 'take': case 'takeAll': {
        const bx = boxFor(a.cid);
        if (!bx) return;
        const got = [];
        if (a.t === 'take') { const it = bx.items[a.slot]; if (!it) return; got.push(it); bx.items[a.slot] = null; }
        else { for (let i = 0; i < bx.items.length; i++) if (bx.items[i]) { got.push(bx.items[i]); bx.items[i] = null; } }
        if (!got.length) return;
        give(pid, got, 'box:' + a.cid);
        emit({ t: 'box', cid: a.cid, items: bx.items });
        checkBagEmpty(a.cid);
        break;
      }
      case 'put': {
        const bx = boxFor(a.cid);
        const [id, n] = a.item || [];
        if (!ITEMS[id] || !(n > 0)) return;
        if (!bx) { give(pid, [[id, n]]); return; }
        const left = addToBox(bx, id, n);
        if (left > 0) give(pid, [[id, left]], 'full');
        emit({ t: 'box', cid: a.cid, items: bx.items });
        break;
      }
      case 'drop': {
        const items = (a.items || []).filter((it) => it && ITEMS[it[0]] && it[1] > 0);
        if (!items.length) return;
        // put it in a bag close by, or make a new one
        let bag = null;
        for (const b of Object.values(s.bags)) if (U.dist(b.x, b.z, a.x, a.z) < 1.5) bag = b;
        if (bag) { const bx = s.boxes['g' + bag.id]; items.forEach(([id, n]) => addToBox(bx, id, n)); emit({ t: 'box', cid: 'g' + bag.id, items: bx.items }); }
        else makeBag(a.x, a.y, a.z, items, '');
        break;
      }
      case 'build': {
        const b = a.b;
        const T = b && B.TYPES[b.type];
        if (!T) return;
        const err = B.check(Object.assign({}, b));
        if (err) { if (a.item) give(pid, [[a.item, 1]]); emit({ t: 'msg', text: err, color: '#f84' }, pid); return; }
        b.id = newId(); b.hp = T.hp; b.owner = b.type === 'bed' ? pname(pid) : ''; b.open = false;
        s.builds[b.id] = b;
        if (b.type === 'box') s.boxes['b' + b.id] = { items: new Array(12).fill(null), day: s.day };
        if (b.type === 'bed') for (const o of Object.values(s.builds)) if (o.type === 'bed' && o.owner === b.owner && o.id !== b.id) { o.owner = ''; emit({ t: 'bed', id: o.id, owner: '' }); }
        emit({ t: 'built', b });
        break;
      }
      case 'door': {
        const b = s.builds[a.id];
        if (!b || b.type !== 'door') return;
        b.open = !b.open;
        emit({ t: 'door', id: b.id, open: b.open });
        break;
      }
      case 'repair': {
        const b = s.builds[a.id];
        if (!b) return;
        b.hp = Math.min(B.TYPES[b.type].hp, b.hp + B.TYPES[b.type].hp * 0.35);
        emit({ t: 'bhp', id: b.id, hp: b.hp });
        break;
      }
      case 'demolish': {
        const b = s.builds[a.id];
        if (!b) return;
        const T = B.TYPES[b.type];
        delete s.builds[b.id];
        emit({ t: 'unbuilt', id: b.id });
        if (b.hp > T.hp * 0.5) give(pid, [[T.item, 1]]);
        else emit({ t: 'msg', text: 'It was too broken to keep.', color: '#fa4' }, pid);
        if (b.type === 'box') { const bx = s.boxes['b' + b.id]; if (bx) { const items = bx.items.filter(Boolean); delete s.boxes['b' + b.id]; if (items.length) makeBag(b.x, b.y, b.z, items, ''); } }
        break;
      }
      case 'claimBed': {
        const b = s.builds[a.id];
        if (!b || b.type !== 'bed') return;
        for (const o of Object.values(s.builds)) if (o.type === 'bed' && o.owner === pname(pid)) { o.owner = ''; emit({ t: 'bed', id: o.id, owner: '' }); }
        b.owner = pname(pid);
        emit({ t: 'bed', id: b.id, owner: b.owner });
        break;
      }
      case 'hitZ': Z.hit(a.id, U.clamp(+a.dmg || 0, 0, 80), +a.kx || 0, +a.kz || 0, pid); break;
      case 'hitA': Z.hitAnimal(a.id, U.clamp(+a.dmg || 0, 0, 80), pid); break;
      case 'died': {
        const items = (a.items || []).filter(Boolean);
        if (items.length) makeBag(a.x, a.y, a.z, items, pname(pid));
        emit({ t: 'msg', text: `💀 ${U.esc(pname(pid))} died!`, color: '#f66' });
        break;
      }
      case 'radio': {
        if (s.radio.fixed) { give(pid, [['radiopart', a.n]]); return; }
        s.radio.parts = Math.min(3, s.radio.parts + (a.n | 0));
        if (s.radio.parts >= 3) {
          s.radio.fixed = true;
          s.radio.hordeTonight = true;
          emit({ t: 'radio', radio: s.radio, fixedBy: pname(pid) });
        } else emit({ t: 'radio', radio: s.radio });
        save();
        break;
      }
      case 'board': {
        if (s.radio.heli !== 2 || !pl) return;
        if (G.heliObj && U.dist(pl.x, pl.z, G.heliObj.position.x, G.heliObj.position.z) > 8) return;
        pl.inHeli = true;
        emit({ t: 'boarded', pid, name: pl.name });
        break;
      }
      case 'throw': {
        const id = newId();
        const L = FX.landing(a.x, a.y, a.z, a.vx, a.vy, a.vz);
        emit({ t: 'fc', id, x: a.x, y: a.y, z: a.z, vx: a.vx, vy: a.vy, vz: a.vz });
        later(0.3, () => Z.lure(L.x, L.z, 32, 5));
        later(4.5, () => { Z.blast(L.x, L.z, 6, ITEMS.firecracker.dmg, pid); emit({ t: 'boom', id, x: U.round(L.x), y: U.round(L.y), z: U.round(L.z) }); });
        break;
      }
      case 'dog': {
        const text = DA.Dogs.interact(a.i, pname(pid));
        if (text) emit({ t: 'msg', text: U.esc(text), color: '#ffd890' }, pid);
        break;
      }
      case 'lvl': if (pl) emitExcept({ t: 'lvl', name: pl.name, lv: a.lv | 0 }, pid); break;
      case 'fx': emitExcept({ t: 'fx', k: a.k, x: a.x, y: a.y, z: a.z }, pid); break;
      case 'arrowFx': emitExcept({ t: 'arrow', x: a.x, y: a.y, z: a.z, dx: a.dx, dy: a.dy, dz: a.dz, s: a.s }, pid); break;
      case 'chat': {
        const text = String(a.text || '').slice(0, 120);
        if (text) emit({ t: 'chat', name: pname(pid), color: COLORS_CSS[(pl && pl.color) || 0], text });
        break;
      }
    }
  }

  // ============================================================
  //  EVENTS: something happened (runs on every computer)
  // ============================================================
  const bagObjs = new Map();
  function addBag(bag) {
    removeBag(bag.id);
    const obj = DA.Models.People.bag();
    obj.position.set(bag.x, bag.y, bag.z);
    obj.rotation.y = Math.random() * 6;
    scene.add(obj);
    const col = C.add({ shape: 'circle', x: bag.x, z: bag.z, r: 0.45, y0: bag.y - 0.2, y1: bag.y + 0.6, kind: 'bag', ref: bag, solid: false });
    bagObjs.set(bag.id, { obj, col });
  }
  function removeBag(id) {
    const b = bagObjs.get(id);
    if (!b) return;
    scene.remove(b.obj); C.remove(b.col);
    bagObjs.delete(id);
  }

  function applyEvent(ev) {
    const s = G.state;
    switch (ev.t) {
      case 'gone': {
        if (ev.v) s.gone[ev.kind][ev.id] = s.gone[ev.kind][ev.id] ?? s.day; else delete s.gone[ev.kind][ev.id];
        const o = W.setResGone(ev.kind, ev.id, ev.v);
        if (o && ev.v && ev.kind === 'tree' && ev.fx !== undefined) {
          const it = o.inst && o.inst[o.type];
          if (it) FX.fallTree(it.im.geometry, o.x, W.heightAt(o.x, o.z), o.z, o.s, o.ry, ev.fx, ev.fz);
          A.treeFall(o.x, o.z);
        }
        if (o && ev.v && ev.kind === 'rock') { A.rockBreak(o.x, o.z); FX.rock(o.x, W.heightAt(o.x, o.z) + 0.5, o.z); FX.dust(o.x, W.heightAt(o.x, o.z) + 0.3, o.z, 14); }
        break;
      }
      case 'give': {
        let left = [];
        const names = [];
        for (const [id, n] of ev.items || []) {
          if (!ITEMS[id]) continue;
          const l = Inv.add(id, n);
          if (l > 0) left.push([id, l]);
          if (n - l > 0) names.push(`<img src="${Inv.iconOf(id)}" alt="">+${n - l} ${ITEMS[id].name}`);
        }
        if (names.length && !(ev.note || '').startsWith('box:')) HUD.popup(names.join('  '), '#e8f0c8');
        if (ev.note === 'full') HUD.msg('It\'s full!', '#fa4');
        if (left.length) {
          if (Inv.UI.open && Inv.UI.box && ev.note && ev.note.startsWith('box:')) { left.forEach((it) => G.act({ t: 'put', cid: Inv.UI.box.cid, item: it })); HUD.msg('Your backpack is full!', '#fa4'); }
          else G.dropItems(left);
        }
        A.pickup();
        break;
      }
      case 'box':
        Inv.UI.setBox(ev.cid, ev.items);
        break;
      case 'built': {
        s.builds[ev.b.id] = ev.b;
        B.add(ev.b);
        break;
      }
      case 'unbuilt': {
        const b = s.builds[ev.id] || (B.list.get(ev.id) || {}).b;
        delete s.builds[ev.id];
        if (b) { FX.dust(b.x, b.y + 1, b.z, 20); FX.wood(b.x, b.y + 1, b.z); A.hitBuild(b.x, b.z); }
        B.remove(ev.id);
        break;
      }
      case 'bhp': { if (s.builds[ev.id]) s.builds[ev.id].hp = ev.hp; B.setHp(ev.id, ev.hp); if (ev.hit) { const b = s.builds[ev.id]; if (b) { A.hitBuild(b.x, b.z); FX.wood(b.x, b.y + 1.2, b.z); } } break; }
      case 'door': { if (s.builds[ev.id]) s.builds[ev.id].open = ev.open; B.setDoor(ev.id, ev.open); const b = s.builds[ev.id]; if (b) A.door(b.x, b.z, ev.open); break; }
      case 'bed': if (s.builds[ev.id]) s.builds[ev.id].owner = ev.owner; break;
      case 'bag': s.bags[ev.bag.id] = ev.bag; addBag(ev.bag); break;
      case 'unbag': delete s.bags[ev.id]; removeBag(ev.id); if (Inv.UI.box && Inv.UI.box.cid === 'g' + ev.id) G.closeInventory(); break;
      case 'hurt': P.hurt(ev.dmg, ev.x, ev.z, ev.kind); break;
      case 'msg': HUD.msg(ev.text, ev.color); break;
      case 'chat': HUD.chat(ev.name, ev.text, ev.color); A.click(); break;
      case 'fx': {
        const k = ev.k;
        if (k === 'hitZ') { FX.blood(ev.x, ev.y, ev.z); A.hitFlesh(ev.x, ev.z); }
        else if (k === 'wood') { FX.wood(ev.x, ev.y, ev.z); A.hitWood(ev.x, ev.z); }
        else if (k === 'rock') { FX.rock(ev.x, ev.y, ev.z); A.hitRock(ev.x, ev.z); }
        break;
      }
      case 'arrow': FX.arrow(ev.x, ev.y, ev.z, ev.dx, ev.dy, ev.dz, ev.s, null); break;
      case 'day':
        s.day = ev.day;
        HUD.banner(`DAY ${ev.day}`, ev.day % HORDE_EVERY === 0 ? 'Tonight the HORDE comes. Get ready!' : 'You survived the night.', ev.day % HORDE_EVERY === 0 ? '#ff6040' : '#f0e0b0', 5);
        A.morning();
        bestDays(ev.day);
        break;
      case 'night': HUD.msg('🌙 Night is falling. Zombies are faster in the dark...', '#9ab0ff'); A.nightfall(); break;
      case 'horde':
        HUD.banner('THE HORDE IS COMING', 'Hide in your base. Or run.', '#ff3020', 5);
        A.hordeHorn();
        break;
      case 'radio': {
        s.radio = ev.radio;
        if (ev.radio.fixed) {
          HUD.banner('RADIO FIXED!', 'A rescue helicopter is coming at SUNRISE. Survive the night on Radio Hill!', '#60ff80', 7);
          HUD.msg(`📻 "...we hear you... helicopter on the way... hold on until morning..."`, '#8f8', 12);
        } else HUD.msg(`📻 Radio parts: ${ev.radio.parts} / 3`, '#8f8');
        A.radio();
        break;
      }
      case 'heli':
        s.radio.heli = ev.s;
        if (ev.s === 1) { HUD.banner('THE HELICOPTER IS HERE!', 'Get to the helipad on Radio Hill and press E to get in!', '#60ff80', 8); }
        break;
      case 'boarded':
        HUD.msg(`🚁 ${U.esc(ev.name)} got into the helicopter!`, '#8f8');
        if (ev.pid === G.myPid) { me.inHeli = true; }
        break;
      case 'end': showEnding(ev); break;
      case 'kill': me.kills++; P.addXp(ev.xp || 10, ev.kind === 'boss' ? 'HORDE BOSS DEFEATED!' : 'zombie'); break;
      case 'xp': if (me.alive) P.addXp(ev.n, ev.why); break;
      case 'fc': FX.throwThing(ev.id, ev.x, ev.y, ev.z, ev.vx, ev.vy, ev.vz); A.fuse(ev.x, ev.z); break;
      case 'boom': FX.explode(ev.x, ev.y, ev.z, ev.id); A.boom(ev.x, ev.z); if (U.dist(ev.x, ev.z, me.x, me.z) < 18) me.shake = Math.max(me.shake, 0.35 * (1 - U.dist(ev.x, ev.z, me.x, me.z) / 18)); break;
      case 'drop': s.drops[ev.drop.id] = ev.drop; addDrop(ev.drop, true); break;
      case 'undrop': delete s.drops[ev.id]; removeDrop(ev.id); if (Inv.UI.box && Inv.UI.box.cid === 'd' + ev.id) G.closeInventory(); break;
      case 'boss':
        HUD.banner('👑 THE HORDE BOSS IS HERE', 'A giant zombie leads the horde tonight. Beat it for great loot!', '#ff5030', 6);
        A.bossRoar(ev.x, ev.z);
        break;
      case 'lvl': HUD.msg(`⭐ ${U.esc(ev.name)} reached level ${ev.lv}!`, '#c8d860'); break;
    }
  }

  // ============================================================
  //  HOST HELPERS (called by zombies and players)
  // ============================================================
  G.hurtPlayer = function (pid, dmg, x, z, kind) {
    const p = G.players.get(pid);
    if (!p || p.inHeli) return;
    emit({ t: 'hurt', dmg, x, z, kind }, pid);
  };
  G.damageBuild = function (id, dmg) {
    const b = G.state.builds[id];
    if (!b) return;
    b.hp -= dmg;
    if (b.hp <= 0) { delete G.state.builds[id]; emit({ t: 'unbuilt', id }); if (b.type === 'box') { const bx = G.state.boxes['b' + id]; delete G.state.boxes['b' + id]; if (bx) { const items = bx.items.filter(Boolean); if (items.length) makeBag(b.x, b.y, b.z, items, ''); } } }
    else emit({ t: 'bhp', id, hp: Math.round(b.hp), hit: 1 });
  };
  G.spikeHit = function (b, zb, dt) {
    zb.spikeT = (zb.spikeT || 0) - dt;
    if (zb.spikeT > 0) return;
    zb.spikeT = 0.5;
    Z.hit(zb.id, 9, 0, 0, null);
    G.damageBuild(b.id, 4);
  };
  G.zombieKilled = function (zb, pid) {
    G.state.kills++;
    if (zb.kind === 'boss') {
      makeBag(zb.x, zb.y + 0.2, zb.z, rollLoot('boss', 12).filter(Boolean), 'the Boss');
      emit({ t: 'msg', text: `👑 The HORDE BOSS was defeated${pid ? ' by ' + U.esc(pname(pid)) : ''}! Its loot bag is where it fell.`, color: '#ffc040' });
    }
    if (!pid) return;
    const drops = [];
    const r = Math.random();
    if (zb.kind === 'brute') drops.push(U.pick([['scrap', 3], ['medkit', 1], ['nails', 8], ['machete', 1], ['can', 2]]));
    else if (r < 0.22) drops.push(['cloth', U.randInt(1, 2)]);
    else if (r < 0.3) drops.push(['bandage', 1]);
    else if (r < 0.35) drops.push(['can', 1]);
    else if (r < 0.39) drops.push(['nails', U.randInt(2, 4)]);
    if (drops.length) give(pid, drops);
    emit({ t: 'kill', kind: zb.kind, xp: zb.k.xp }, pid);
  };
  G.animalKilled = function (an, pid) {
    if (pid) { give(pid, Z.ANIMALS[an.kind].drops.map((d) => [d[0], d[1]])); emit({ t: 'xp', n: 5, why: an.kind }, pid); }
  };
  G.bossSpawned = function () {
    const b = Z.boss();
    emit({ t: 'boss', x: b ? U.round(b.x) : me.x, z: b ? U.round(b.z) : me.z });
  };
  G.levelUp = function (lv) { if (Net.online) G.act({ t: 'lvl', lv }); };

  // things that happen a little later (host), paused with the game
  const timers = [];
  function later(sec, fn) { timers.push({ t: sec, fn }); }
  function runTimers(dt) {
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const f = timers[i].fn; timers.splice(i, 1); f(); } }
  }

  // ============================================================
  //  SUPPLY DROPS: every day at noon a plane drops a crate
  // ============================================================
  function supplyDrop() {
    const alive = [...G.players.values()].filter((p) => p.alive && !p.inHeli);
    if (!alive.length) return;
    const p = U.pick(alive);
    for (let tries = 0; tries < 40; tries++) {
      const a = Math.random() * 6.28, d = U.rand(50, 110);
      const x = p.x + Math.sin(a) * d, z = p.z + Math.cos(a) * d;
      if (!W.inside(x, z) || Math.abs(x) > 260 || Math.abs(z) > 260) continue;
      if (W.groundType(x, z) !== 0 || W.slopeAt(x, z) > 0.6) continue;
      const y = W.heightAt(x, z);
      if (C.blocked({ shape: 'circle', x, z, r: 1.5, y0: y + 0.2, y1: y + 3 })) continue;
      const id = newId();
      const drop = { id, x: U.round(x), y: U.round(y), z: U.round(z), day: G.state.day };
      G.state.drops[id] = drop;
      G.state.boxes['d' + id] = { items: rollLoot('supply', 12), day: G.state.day };
      emit({ t: 'drop', drop });
      // the noise brings zombies...
      later(20, () => { for (let i = 0; i < 3 + Math.min(4, G.state.day); i++) { const s = [x + U.rand(-25, 25), z + U.rand(-25, 25)]; if (W.inside(s[0], s[1]) && W.heightAt(s[0], s[1]) > W.WATER + 0.3) Z.spawnZombie(Math.random() < 0.8 ? 'walker' : 'runner', s[0], s[1], false); } });
      return;
    }
  }
  const dropObjs = new Map();
  function addDrop(d, animate) {
    removeDrop(d.id);
    const crate = DA.Models.Props.supplyCrate();
    scene.add(crate);
    const o = { crate, d, t: animate ? 0 : 99, col: null, plane: null };
    if (animate) {
      o.plane = DA.Models.Props.plane();
      scene.add(o.plane);
      A.plane();
      HUD.banner('📦 SUPPLY DROP!', 'A plane dropped a crate full of good stuff. Find the 📦 on your compass!', '#ffc040', 6);
    } else crate.userData.chute.visible = false;
    dropObjs.set(d.id, o);
    placeDrop(o, 0);
  }
  function placeDrop(o, dt) {
    const d = o.d;
    o.t += dt;
    const FALL = 16, H = 70;
    const k = Math.min(1, o.t / FALL);
    o.crate.position.set(d.x, d.y + (1 - k) * H, d.z);
    o.crate.rotation.y = o.t * 0.3;
    o.crate.rotation.z = k < 1 ? Math.sin(o.t * 1.5) * 0.08 : 0;
    if (o.plane) {
      const pt = o.t + 3; // the plane passes over the spot at t = 0
      o.plane.position.set(d.x - 180 + pt * 60, d.y + H + 12, d.z + 5);
      o.plane.rotation.y = -Math.PI / 2;
      if (pt > 7) { scene.remove(o.plane); o.plane = null; }
    }
    if (k >= 1 && !o.col) {
      o.crate.userData.chute.visible = false;
      o.col = C.add({ shape: 'box', x: d.x, z: d.z, hw: 0.62, hd: 0.62, rot: 0, y0: d.y - 0.3, y1: d.y + 0.95, kind: 'drop', ref: d, walk: true });
      if (dt > 0) { FX.dust(d.x, d.y + 0.2, d.z, 20); A.land(1); }
    }
    // red smoke so you can find it
    if (k >= 1 && Math.random() < dt * 6) FX.smoke(d.x + 0.3, d.y + 1.1, d.z, 1.4, 0xd04030);
  }
  function removeDrop(id) {
    const o = dropObjs.get(id);
    if (!o) return;
    scene.remove(o.crate); if (o.plane) scene.remove(o.plane); if (o.col) C.remove(o.col);
    dropObjs.delete(id);
  }

  // ============================================================
  //  YOU: opening things, dying, eating from the backpack
  // ============================================================
  G.openContainer = function (cid, name) {
    Inv.UI.show({ cid, name, items: null });
    document.exitPointerLock && document.exitPointerLock();
    G.act({ t: 'open', cid });
  };
  G.openInventory = function () {
    Inv.UI.show(null);
    document.exitPointerLock && document.exitPointerLock();
  };
  G.closeInventory = function () {
    Inv.UI.hide();
    if (G.mode === 'play') lockMouse();
  };
  G.useItemAt = function (i) { if (P.consume(i)) Inv.UI.draw(); };
  G.dropItems = function (items) {
    if (!items.length) return;
    G.act({ t: 'drop', items, x: me.x - Math.sin(me.yaw) * 0.8, y: me.y, z: me.z - Math.cos(me.yaw) * 0.8 });
  };
  G.msg = (text, color) => HUD.msg(U.esc(text), color);

  let deadT = 0;
  G.playerDied = function (why) {
    if (!me.alive) return;
    me.alive = false;
    deadT = 0;
    const items = Inv.dump().filter(Boolean);
    Inv.clear();
    G.act({ t: 'died', items, x: me.x, y: me.y + 0.1, z: me.z });
    A.death();
    DA.Build.showGhost(null);
    if (Inv.UI.open) Inv.UI.hide();
    const reasons = { walker: 'A zombie got you.', runner: 'A runner caught you.', brute: 'A brute smashed you.', fall: 'You fell too far.', starve: 'You starved.', food: 'Bad food...' };
    $('deathWhy').textContent = reasons[why] || 'You died.';
    $('deathInfo').textContent = `Day ${G.state.day}. Your backpack is where you died — go get it back!`;
    $('death').style.display = 'flex';
    $('respawnBtn').disabled = true;
    setTimeout(() => ($('respawnBtn').disabled = false), 2500);
    document.exitPointerLock && document.exitPointerLock();
  };

  function respawn() {
    $('death').style.display = 'none';
    P.resetStats();
    const bed = Object.values(G.state.builds).find((b) => b.type === 'bed' && b.owner === G.myName);
    if (bed) P.spawnAt(bed.x + Math.sin(bed.rot) * 1.3, bed.z + Math.cos(bed.rot) * 1.3);
    else spawnNearStart();
    Inv.slots[4] = Inv.slots[4] || { id: 'water', n: 1 }; Inv.slots[5] = Inv.slots[5] || { id: 'apple', n: 1 };
    Inv.sel = 0; Inv.changed();
    lockMouse();
  }

  function spawnNearStart() {
    const [sx, sz] = MAP.spawn;
    for (let i = 0; i < 20; i++) {
      const x = sx + U.rand(-4, 4), z = sz + U.rand(-4, 4);
      if (!C.blocked({ shape: 'circle', x, z, r: 0.4, y0: W.heightAt(x, z) + 0.3, y1: W.heightAt(x, z) + 1.8 })) { P.spawnAt(x, z); me.yaw = -Math.PI / 2; me.pitch = 0; return; }
    }
    P.spawnAt(sx, sz);
  }

  function bestDays(day) {
    try { const b = +(localStorage.getItem(BEST_KEY) || 0); if (day > b) localStorage.setItem(BEST_KEY, day); } catch (e) { /* no storage */ }
  }

  // ============================================================
  //  SAVING (only the host saves the world)
  // ============================================================
  function myRecord() {
    return { inv: Inv.dump(), lv: me.level, xp: me.xp, hp: Math.round(me.hp), food: Math.round(me.food), water: Math.round(me.water), x: U.round(me.x), y: U.round(me.y), z: U.round(me.z), yaw: U.round(me.yaw), alive: me.alive };
  }
  function save() {
    if (!G.isHost || !G.state || G.mode !== 'play') return;
    G.state.players[G.myName.toLowerCase()] = myRecord();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.state)); } catch (e) { console.warn('save failed', e); }
  }
  G.save = save;
  function loadSave() {
    try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1) return s; } catch (e) { /* broken save */ }
    return null;
  }

  // put a saved (or received) world into the scene
  function applyWorldState(s) {
    G.state = s;
    for (const kind of ['tree', 'rock', 'bush']) for (const id in s.gone[kind]) W.setResGone(kind, +id, true);
    for (const b of Object.values(s.builds)) B.add(b);
    for (const bag of Object.values(s.bags)) addBag(bag);
    s.drops = s.drops || {}; s.dogs = s.dogs || {};
    for (const d of Object.values(s.drops)) addDrop(d, false);
    DA.Dogs.load(s);
    G.hour = s.time;
  }
  function clearWorld() {
    if (G.state) for (const kind of ['tree', 'rock', 'bush']) for (const id in G.state.gone[kind]) W.setResGone(kind, +id, false);
    B.clear();
    for (const id of [...bagObjs.keys()]) removeBag(id);
    Z.clear();
    for (const p of G.players.values()) if (p.remote) p.remote.remove();
    G.players.clear();
    if (G.heliObj) { scene.remove(G.heliObj); G.heliObj = null; }
    for (const id of [...dropObjs.keys()]) removeDrop(id);
    DA.Dogs.clear();
    timers.length = 0;
  }

  function loadMe(rec) {
    P.setLevel(rec ? rec.lv || 1 : 1, rec ? rec.xp || 0 : 0);
    P.resetStats();
    if (rec) {
      Inv.load(rec.inv);
      me.hp = rec.hp ?? 100; me.food = rec.food ?? 75; me.water = rec.water ?? 75;
      if (rec.alive === false || me.hp <= 0) { me.hp = 100; spawnNearStart(); }
      else { P.spawnAt(rec.x, rec.z, rec.y); me.yaw = rec.yaw || 0; }
    } else {
      Inv.clear();
      // start with empty hands (fists) and some food at the end of the hotbar
      DA.START_ITEMS.forEach(([id, n], i) => { Inv.slots[Inv.HOT - DA.START_ITEMS.length + i] = { id, n }; });
      Inv.sel = 0;
      Inv.changed();
      spawnNearStart();
    }
  }

  // ============================================================
  //  STARTING AND STOPPING
  // ============================================================
  function startCommon() {
    G.mode = 'play';
    G.paused = false;
    HUD.reset();
    $('title').style.display = 'none';
    $('hud').style.display = 'block';
    $('pause').style.display = 'none';
    $('death').style.display = 'none';
    $('end').style.display = 'none';
    Inv.sel = 0;
    HUD.drawHotbar();
    A.init();
    lockMouse();
    G.players.set(G.myPid, { pid: G.myPid, name: G.myName, color: G.myColor, x: me.x, y: me.y, z: me.z, yaw: 0, flags: 0, alive: true, hp: 100 });
    lastPlace = null;
  }

  // alone, or as the host of an online game
  function startHost(state, online) {
    clearWorld();
    G.isHost = true; G.myPid = 'h'; G.myColor = 0;
    applyWorldState(state);
    loadMe(state.players[G.myName.toLowerCase()]);
    startCommon();
    if (state.day === 1 && state.time < 7.5) {
      HUD.banner('DAY 1', 'You crashed your car. The town of Maple Creek is east. Survive.', '#f0e0b0', 7);
      setTimeout(() => HUD.msg('Tip: punch trees for wood (hold left click). Press TAB to craft.', '#fd6', 10), 3000);
      setTimeout(() => HUD.msg('Find 3 RADIO PARTS and fix the radio tower to call for rescue!', '#8f8', 10), 9000);
    } else HUD.banner(`DAY ${state.day}`, 'Welcome back.', '#f0e0b0', 3);
    if (online) goOnline();
  }

  function goOnline() {
    $('online').style.display = 'block';
    $('online').textContent = 'Starting online game...';
    Net.host((code) => {
      HUD.msg(`🌐 Online! Your ROOM CODE is <b>${code}</b>. Tell your friends!`, '#8cf', 15);
    }, (err) => {
      HUD.msg('🌐 ' + U.esc(err) + ' Playing alone.', '#f84', 10);
    });
  }

  function toTitle(why) {
    if (G.isHost) save();
    if (Net.online) {
      if (G.isHost) Net.broadcast({ k: 'bye' });
      else Net.send({ k: 'rec', rec: myRecord() });
      Net.leave();
    }
    clearWorld();
    G.mode = 'title';
    G.paused = false;
    Inv.UI.hide();
    DA.Build.showGhost(null);
    $('hud').style.display = 'none';
    $('pause').style.display = 'none';
    $('death').style.display = 'none';
    $('title').style.display = 'flex';
    A.stopLoops();
    document.exitPointerLock && document.exitPointerLock();
    refreshTitle();
    if (why) showTitleMsg(why);
  }
  G.toTitle = toTitle;

  // ============================================================
  //  ONLINE MESSAGES
  // ============================================================
  function onNetMessage(msg, from) {
    if (Net.role === 'host') {
      const p = G.players.get(from);
      switch (msg.k) {
        case 'hello': {
          if (G.mode !== 'play') return;
          let name = String(msg.name || 'Friend').replace(/[<>]/g, '').slice(0, 14) || 'Friend';
          const taken = new Set([...G.players.values()].map((q) => q.name.toLowerCase()));
          let n = 2, base = name;
          while (taken.has(name.toLowerCase())) name = base + n++;
          const used = new Set([...G.players.values()].map((q) => q.color));
          let color = 1; while (used.has(color)) color++;
          const remote = new P.Remote(from, name, color);
          const sp = MAP.spawn;
          remote.root.position.set(sp[0], W.heightAt(sp[0], sp[1]), sp[1]);
          G.players.set(from, { pid: from, name, color, x: sp[0], y: 0, z: sp[1], yaw: 0, flags: 0, alive: true, hp: 100, remote });
          save();
          const st = Object.assign({}, G.state, { players: undefined, boxes: undefined });
          Net.sendTo(from, { k: 'welcome', pid: from, name, color, state: st, rec: G.state.players[name.toLowerCase()] || null });
          emit({ t: 'msg', text: `👋 ${U.esc(name)} joined the game!`, color: '#8cf' });
          break;
        }
        case 'me': {
          if (!p) return;
          const [x, y, z, yaw, pitch, item, flags, hp] = msg.p;
          p.x = x; p.y = y; p.z = z; p.yaw = yaw; p.pitch = pitch; p.item = item; p.flags = flags; p.hp = hp; p.alive = !(flags & 8);
          if (p.remote) p.remote.set(x, y, z, yaw, item, flags);
          break;
        }
        case 'act': if (p) handleAction(msg.a, from); break;
        case 'rec': if (p && msg.rec) G.state.players[p.name.toLowerCase()] = msg.rec; break;
      }
    } else {
      switch (msg.k) {
        case 'welcome': joinedGame(msg); break;
        case 's': applySnapshot(msg); break;
        case 'ev': if (G.state) applyEvent(msg.ev); break;
        case 'full': showTitleMsg('That game is full (3 players max).'); Net.leave(); break;
        case 'bye': toTitle('The host ended the game.'); break;
      }
    }
  }

  function onFriendLeft(pid) {
    const p = G.players.get(pid);
    if (!p) return;
    if (p.remote) p.remote.remove();
    G.players.delete(pid);
    emit({ t: 'msg', text: `${U.esc(p.name)} left the game.`, color: '#aaa' });
    save();
  }

  function joinedGame(msg) {
    clearWorld();
    G.isHost = false; G.myPid = msg.pid; G.myName = msg.name; G.myColor = msg.color;
    const st = Object.assign(freshState(), msg.state, { players: {}, boxes: {} });
    applyWorldState(st);
    loadMe(msg.rec);
    startCommon();
    HUD.banner(`DAY ${st.day}`, 'You joined the game!', '#8cf', 4);
    $('joinStatus').textContent = '';
  }

  // the host's picture of the world (10 times a second)
  let snapT = 0, sendT = 0, recT = 0;
  function hostSnapshot() {
    const R = U.round;
    const pl = [];
    for (const p of G.players.values()) pl.push([p.pid, p.name, p.color, R(p.x), R(p.y), R(p.z), R(p.yaw), R(p.pitch || 0), p.item || null, p.flags | 0, Math.round(p.hp), p.inHeli ? 1 : 0]);
    const zs = Z.snapshot();
    Net.broadcast({ k: 's', t: R(G.state.time, 1000), d: G.state.day, p: pl, z: zs.z, a: zs.a, dg: DA.Dogs.snapshot(), h: [G.state.radio.heli, R(G.state.radio.heliT)] });
  }
  function applySnapshot(m) {
    if (!G.state || G.mode !== 'play') return;
    G.state.time = m.t; G.hour = m.t;
    if (m.d !== G.state.day) G.state.day = m.d;
    const seen = new Set();
    for (const [pid, name, color, x, y, z, yaw, pitch, item, flags, hp, inHeli] of m.p) {
      seen.add(pid);
      if (pid === G.myPid) continue;
      let p = G.players.get(pid);
      if (!p) { p = { pid, name, color, remote: new P.Remote(pid, name, color) }; G.players.set(pid, p); }
      Object.assign(p, { x, y, z, yaw, pitch, item, flags, hp, alive: !(flags & 8), inHeli: !!inHeli });
      p.remote.set(x, y, z, yaw, item, flags);
      p.remote.root.visible = !inHeli;
    }
    for (const pid of [...G.players.keys()]) if (!seen.has(pid) && pid !== G.myPid) { const p = G.players.get(pid); if (p.remote) p.remote.remove(); G.players.delete(pid); }
    Z.applySnapshot(m.z, m.a);
    DA.Dogs.applySnapshot(m.dg);
    G.state.radio.heli = m.h[0]; G.state.radio.heliT = m.h[1];
  }

  // ============================================================
  //  THE RESCUE HELICOPTER
  // ============================================================
  function updateHeli(dt) {
    const r = G.state.radio;
    if (!r.heli || !W.helipad) { if (G.heliObj) G.heliObj.visible = false; return; }
    if (!G.heliObj) { G.heliObj = DA.Models.Props.helicopter(); scene.add(G.heliObj); }
    const h = G.heliObj, pad = W.helipad;
    if (G.isHost) r.heliT += dt;
    const t = r.heliT;
    h.visible = true;
    h.userData.rotor.rotation.y += dt * 25; h.userData.tail.rotation.x += dt * 30;
    // 1 = flying in (30 s), 2 = waiting on the pad, 3 = flying away
    if (r.heli === 1) {
      const k = Math.min(1, t / 30), e = 1 - Math.pow(1 - k, 2);
      h.position.set(pad.x + (1 - e) * 250, pad.y + (1 - e) * 60 + 0.05, pad.z + (1 - e) * -120);
      h.rotation.y = -Math.PI / 2 * (1 - e) + 0.3;
      if (G.isHost && k >= 1) { r.heli = 2; r.heliT = 0; emit({ t: 'heli', s: 2 }); emit({ t: 'msg', text: '🚁 The helicopter landed! Everyone, get in! (press E next to it)', color: '#8f8' }); }
    } else if (r.heli === 2) {
      h.position.set(pad.x, pad.y + 0.05, pad.z);
      if (G.isHost) {
        const alive = [...G.players.values()].filter((p) => p.alive);
        const all = alive.length > 0 && alive.every((p) => p.inHeli);
        const some = [...G.players.values()].some((p) => p.inHeli);
        if (all || (some && t > 120)) { r.heli = 3; r.heliT = 0; emit({ t: 'heli', s: 3 }); }
      }
    } else if (r.heli === 3) {
      h.position.set(pad.x - t * t * 2, pad.y + t * t * 1.5, pad.z + t * 3);
      if (G.isHost && t > 6 && !r.ended) {
        r.ended = true;
        const saved = [...G.players.values()].filter((p) => p.inHeli).map((p) => p.name);
        emit({ t: 'end', day: G.state.day, saved, kills: G.state.kills });
      }
    }
    // a collider to press E on
    if (!G.heliCol) G.heliCol = C.add({ shape: 'circle', x: pad.x, z: pad.z, r: 2.2, y0: pad.y, y1: pad.y + 3.5, kind: 'heli', solid: false });
    G.heliCol.hit = r.heli === 2;
  }

  function showEnding(ev) {
    const saved = (ev.saved || []).includes(G.myName);
    bestDays(ev.day);
    A.win();
    $('endTitle').textContent = saved ? 'RESCUED!' : 'LEFT BEHIND...';
    $('endText').innerHTML = saved
      ? `You escaped from Maple Creek after <b>${ev.day} days</b>.<br>Rescued: ${ev.saved.map(U.esc).join(', ')}<br>Zombies defeated: ${ev.kills}`
      : `The helicopter left without you. Maybe next time...<br>Rescued: ${(ev.saved || []).map(U.esc).join(', ') || 'nobody'}`;
    $('end').style.display = 'flex';
    $('death').style.display = 'none';
    document.exitPointerLock && document.exitPointerLock();
    if (G.isHost) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ok */ } G.state.radio.ended = true; }
    G.mode = 'end';
  }

  // ============================================================
  //  THE MAIN LOOP
  // ============================================================
  let lastPlace = null, heartT = 0, mapOpen = false, titleT = 0, saveT = 0, goalT = 0, lastGoal = '';
  function lockMouse() {
    const c = $('game');
    if (c.requestPointerLock && !Inv.UI.open && !mapOpen && G.mode === 'play' && !DA.Input.typing) { try { const r = c.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* needs a click */ } }
  }
  G.lockMouse = lockMouse;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    if (G.mode === 'title') { titleFrame(dt, t); return; }
    if (G.mode !== 'play' && G.mode !== 'end') return;
    const inp = DA.Input.read();
    const uiOpen = Inv.UI.open || mapOpen || G.paused || DA.Input.typing || !me.alive;
    // menus
    if (inp.pausePressed && !DA.Input.typing) {
      if (Inv.UI.open) G.closeInventory();
      else if (mapOpen) toggleMap(false);
      else setPause(!G.paused);
    }
    if (!G.paused && !DA.Input.typing && me.alive) {
      if (inp.invPressed) { if (Inv.UI.open) G.closeInventory(); else G.openInventory(); }
      if (inp.mapPressed) toggleMap(!mapOpen);
      if (inp.chatPressed && Net.online && !Inv.UI.open) openChat();
      if (inp.dropPressed && !Inv.UI.open) { const s = Inv.held(); if (s) { const it = Inv.removeAt(Inv.sel, s.n); G.dropItems([[it.id, it.n]]); A.loot(me.x, me.z); } }
    }
    const frozen = G.paused && !Net.online;
    if (!frozen && G.mode === 'play') {
      if (me.inHeli) { me.x = W.helipad.x; me.z = W.helipad.z; me.y = W.helipad.y + 1; me.vy = 0; me.prompt = ''; DA.Build.showGhost(null); }
      else P.update(dt, inp, uiOpen);
      const mine = G.players.get(G.myPid);
      if (mine) { Object.assign(mine, { x: me.x, y: me.y, z: me.z, yaw: me.yaw, pitch: me.pitch, item: Inv.held() ? Inv.held().id : null, flags: me.flags | (me.alive ? 0 : 8), hp: me.hp, alive: me.alive, inHeli: !!me.inHeli }); }
      if (G.isHost) {
        advanceTime(dt);
        runTimers(dt);
        Z.hostUpdate(dt, G.hour);
        snapT -= dt;
        if (snapT <= 0 && Net.online) { snapT = 0.1; hostSnapshot(); }
        saveT += dt;
        if (saveT > 30) { saveT = 0; save(); }
      } else {
        G.state.time = (G.state.time + hourRate(G.state.time) * dt) % 24; G.hour = G.state.time;
        sendT -= dt;
        if (sendT <= 0) {
          sendT = 0.1;
          const R = U.round;
          Net.send({ k: 'me', p: [R(me.x), R(me.y), R(me.z), R(me.yaw), R(me.pitch), Inv.held() ? Inv.held().id : null, me.flags | (me.alive ? 0 : 8), Math.round(me.hp)] });
        }
        recT += dt;
        if (recT > 10) { recT = 0; Net.send({ k: 'rec', rec: myRecord() }); }
      }
      fxBudget = Math.max(0, fxBudget - dt * 10);
      for (const p of G.players.values()) if (p.remote) p.remote.update(dt);
      Z.update(dt, G.isHost);
      DA.Dogs.update(dt, G.isHost);
      for (const o of dropObjs.values()) placeDrop(o, dt);
      B.update(dt, t);
      updateHeli(dt);
      if (!me.alive) { deadT += dt; }
    }
    FX.update(dt);
    W.update(dt, cam);
    W.updateSky(G.hour, cam);
    if (W.towerLight) W.towerLight.visible = Math.sin(t * 3) > 0;
    // your crashed car is still smoking on the first day
    if (G.state.day === 1 && Math.random() < dt * 4) { const c = MAP.cars[0]; FX.smoke(c.x + U.rand(-0.3, 0.3), W.heightAt(c.x, c.z) + 1, c.z + U.rand(-0.3, 0.3), 1.6, 0x444444); }
    updateLights(t);
    // sounds all around
    const zNear = Z.nearestZombie(me.x, me.z);
    const fear = me.alive ? U.clamp((20 - zNear) / 16, 0, 1) : 0;
    let fire = 0;
    for (const l of B.lights) fire = Math.max(fire, U.clamp(1 - U.dist(l.x, l.z, me.x, me.z) / 12, 0, 1));
    const heli = G.heliObj && G.heliObj.visible ? U.clamp(1 - U.dist(G.heliObj.position.x, G.heliObj.position.z, me.x, me.z) / 250, 0, 1) : 0;
    A.ambience({ dt, night: W.darkness(G.hour), fear, fire, heli, wind: U.clamp((me.y - 10) / 25, 0, 1) });
    heartT -= dt;
    if (heartT <= 0 && me.alive && (me.hp < 35 || fear > 0.6)) { heartT = me.hp < 20 ? 0.6 : 0.9; A.heartbeat(me.hp < 35 ? 0.5 : fear * 0.3); }
    // place names
    const place = W.placeAt(me.x, me.z);
    if (place !== lastPlace) { if (place && lastPlace !== undefined) HUD.banner(place.name, '', '#e0d8c0', 3); lastPlace = place; }
    // HUD
    const s = G.state;
    const night = W.isNight(G.hour);
    HUD.update(dt, {
      me, hour: G.hour, day: s.day, prompt: me.prompt, targetKind: me.target && me.target.kind,
      nightIn: night ? null : secondsUntil(G.hour, 20.2), dayIn: night ? secondsUntil(G.hour, 6) : null, horde: isHordeNight(),
      cam, markers: compassMarkers(), online: onlineText(), goal: goalT <= 0 ? (goalT = 0.5, lastGoal = goalText()) : lastGoal,
    });
    goalT -= dt;
    if (mapOpen) HUD.drawMap(me, [...G.players.values()].filter((p) => p.pid !== G.myPid).map((p) => ({ x: p.x, z: p.z, name: p.name, color: COLORS_CSS[p.color % 4] })), mapExtras());
    // draw
    if (window.DA_NO_RENDER) return; // (for test robots)
    renderer.clear();
    renderer.render(scene, cam);
    if (me.alive && !me.inHeli) { renderer.clearDepth(); renderer.render(P.vm.scene, P.vm.cam); }
  }

  // what should I do next? (a little helper for new players)
  function goalText() {
    const s = G.state, r = s.radio;
    const has = (id) => Inv.count(id) > 0;
    const myBuild = (t) => Object.values(s.builds).some((b) => b.type === t && (t !== 'bed' || b.owner === G.myName));
    const parts = Inv.count('radiopart');
    if (r.heli) return 'Get to the helipad on Radio Hill and press E on the helicopter!';
    if (r.fixed) return 'The helicopter comes at sunrise. Stay alive until morning!';
    if (parts + r.parts >= 3) return 'Bring the radio parts to the tower on Radio Hill (📡 on your compass) and press E.';
    const tools = has('stoneaxe') || has('metalaxe');
    if (!tools && Inv.count('wood') < 3) return 'Punch a tree to get wood (hold left click).';
    if (!tools && Inv.count('stone') < 3) return 'Punch a rock to get stone.';
    if (!tools) return 'Press TAB and craft a Stone Axe.';
    if (!myBuild('campfire') && !has('campfire') && s.day < 3) return 'Craft a Campfire and place it. It lights up the night.';
    if (has('campfire') && !myBuild('campfire') && s.day < 3) return 'Hold the Campfire and click to place it.';
    if (!myBuild('bed') && (Inv.count('cloth') < 5 || !has('bed'))) return has('bed') ? 'Hold the Bed and click to place it.' : 'Build a Bed so you wake up there if you die (search houses for cloth).';
    if (!myBuild('bed')) return 'Hold the Bed and click to place it.';
    if (!DA.Dogs.list.some((d) => d.owner === G.myName)) {
      const free = DA.Dogs.list.find((d) => !d.owner);
      if (free) return `Find a dog buddy! ${free.name} is waiting somewhere (🐕 on the map, press M).`;
    }
    return `Find the 3 radio parts (${parts + r.parts}/3): police station, gas station, hunter's cabin.`;
  }

  function onlineText() {
    if (!Net.online) return '';
    if (G.isHost) return `🌐 ROOM CODE: <b>${Net.code}</b> · ${G.players.size}/3 players · [T] chat`;
    return `🌐 Online · ${G.players.size} players · [T] chat`;
  }

  function markerFor(x, z, icon, color, label) {
    return { a: Math.atan2(-(x - me.x), -(z - me.z)), icon, color, label, dist: Math.round(U.dist(x, z, me.x, me.z)) };
  }
  function compassMarkers() {
    const m = [];
    for (const p of G.players.values()) if (p.pid !== G.myPid) m.push(markerFor(p.x, p.z, '●', COLORS_CSS[p.color % 4], p.name));
    const bed = Object.values(G.state.builds).find((b) => b.type === 'bed' && b.owner === G.myName);
    if (bed) m.push(markerFor(bed.x, bed.z, '🛏', '#fff', 'Your bed'));
    for (const b of Object.values(G.state.bags)) if (b.owner === G.myName) m.push(markerFor(b.x, b.z, '🎒', '#fd6', 'Your stuff'));
    for (const d of Object.values(G.state.drops)) m.push(markerFor(d.x, d.z, '📦', '#ffc040', 'Supply crate'));
    for (const d of DA.Dogs.list) if (d.owner === G.myName && U.dist(d.x, d.z, me.x, me.z) > 8) m.push(markerFor(d.x, d.z, '🐕', '#ffd890', d.name));
    if (W.radioSpot && (Inv.count('radiopart') || G.state.radio.parts || G.state.radio.fixed)) m.push(markerFor(W.radioSpot.x, W.radioSpot.z, '📡', '#8f8', 'Radio tower'));
    return m;
  }
  function mapExtras() {
    const e = [];
    if (W.radioSpot) e.push({ x: W.radioSpot.x, z: W.radioSpot.z, icon: '📡', color: '#8f8' });
    const bed = Object.values(G.state.builds).find((b) => b.type === 'bed' && b.owner === G.myName);
    if (bed) e.push({ x: bed.x, z: bed.z, icon: '🛏' });
    for (const b of Object.values(G.state.bags)) e.push({ x: b.x, z: b.z, icon: '🎒' });
    for (const d of Object.values(G.state.drops)) e.push({ x: d.x, z: d.z, icon: '📦' });
    for (const d of DA.Dogs.list) if (d.owner === G.myName || !d.owner) e.push({ x: d.x, z: d.z, icon: '🐕' });
    return e;
  }

  function toggleMap(open) {
    mapOpen = open;
    $('map').style.display = open ? 'flex' : 'none';
    if (open) document.exitPointerLock && document.exitPointerLock(); else lockMouse();
  }

  function setPause(p) {
    G.paused = p;
    $('pause').style.display = p ? 'flex' : 'none';
    $('pauseNote').textContent = Net.online ? 'The game does NOT pause when playing online!' : '';
    $('pauseCode').innerHTML = Net.online && G.isHost ? `Room code: <b>${Net.code}</b>` : '';
    if (p) { document.exitPointerLock && document.exitPointerLock(); save(); } else lockMouse();
  }

  function openChat() {
    const box = $('chatBox');
    box.style.display = 'block';
    DA.Input.typing = true;
    document.exitPointerLock && document.exitPointerLock();
    const inp = $('chatInput');
    inp.value = '';
    setTimeout(() => inp.focus(), 10);
  }
  function closeChat(send) {
    const inp = $('chatInput');
    if (send && inp.value.trim()) G.act({ t: 'chat', text: inp.value.trim() });
    $('chatBox').style.display = 'none';
    DA.Input.typing = false;
    inp.blur();
    lockMouse();
  }

  // the title screen: fly slowly over the town at sunset
  function titleFrame(dt, t) {
    titleT += dt;
    const a = titleT * 0.03;
    const cx = 60 + Math.sin(a) * 80, cz = 24 + Math.cos(a) * 80;
    cam.position.set(cx, W.heightAt(cx, cz) + 22, cz);
    cam.lookAt(60, 10, 24);
    const hour = 18.5;
    G.hour = hour;
    W.update(dt, cam);
    W.updateSky(hour, cam);
    B.update(dt, t);
    FX.update(dt);
    for (const l of pool) l.intensity = 0;
    renderer.clear();
    renderer.render(scene, cam);
  }

  // ============================================================
  //  MENUS
  // ============================================================
  function showTitleMsg(t) { $('titleMsg').textContent = t; $('titleMsg').style.display = t ? 'block' : 'none'; }
  function refreshTitle() {
    const s = loadSave();
    $('btnContinue').style.display = s ? 'block' : 'none';
    $('btnContinue').textContent = s ? `CONTINUE (DAY ${s.day})` : 'CONTINUE';
    let best = 0; try { best = +(localStorage.getItem(BEST_KEY) || 0); } catch (e) { /* no storage */ }
    $('best').textContent = best ? `Best: survived ${best} days` : '';
    $('gfxBtn').textContent = 'GRAPHICS: ' + (DA.lowGfx ? 'LOW' : 'HIGH');
    $('onlineWarn').style.display = Net.available() ? 'none' : 'block';
  }
  function getName() {
    const n = $('nameInput').value.trim().replace(/[<>]/g, '').slice(0, 14) || 'Survivor';
    try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* no storage */ }
    return n;
  }

  function setupMenus() {
    try { $('nameInput').value = localStorage.getItem(NAME_KEY) || ''; } catch (e) { /* no storage */ }
    const click = (id, f) => $(id).addEventListener('click', () => { A.init(); A.click(); f(); });
    click('btnNew', () => {
      // with a saved world, the first click asks, the second click starts over
      const btn = $('btnNew');
      if (loadSave() && !btn.dataset.sure) {
        btn.dataset.sure = '1';
        btn.textContent = 'CLICK AGAIN TO ERASE YOUR OLD WORLD';
        btn.classList.add('danger');
        setTimeout(() => { delete btn.dataset.sure; btn.textContent = 'NEW WORLD'; btn.classList.remove('danger'); }, 4000);
        return;
      }
      delete btn.dataset.sure; btn.textContent = 'NEW WORLD'; btn.classList.remove('danger');
      G.myName = getName();
      const s = freshState();
      startHost(s, $('hostToggle').checked);
      save();
    });
    click('btnContinue', () => { G.myName = getName(); const s = loadSave(); if (s) startHost(s, $('hostToggle').checked); });
    click('btnJoin', () => {
      const code = $('codeInput').value;
      G.myName = getName();
      $('joinStatus').textContent = 'Connecting...';
      Net.join(code, () => {
        $('joinStatus').textContent = 'Connected! Loading the world...';
        Net.send({ k: 'hello', name: G.myName, v: 1 });
      }, (err) => { $('joinStatus').textContent = err; });
    });
    click('gfxBtn', () => {
      try { localStorage.setItem('deadacres.gfx', DA.lowGfx ? 'high' : 'low'); } catch (e) { /* no storage */ }
      location.reload();
    });
    click('btnHelp', () => { $('help').style.display = 'flex'; });
    click('helpClose', () => { $('help').style.display = 'none'; });
    click('btnResume', () => setPause(false));
    click('btnQuit', () => toTitle());
    click('btnEndTitle', () => toTitle());
    click('respawnBtn', () => respawn());
    click('mapClose', () => toggleMap(false));
    $('volume').value = A.volume;
    $('volume').addEventListener('input', (e) => A.setVolume(+e.target.value));
    $('sens').value = DA.Input.sensitivity || 1;
    $('sens').addEventListener('input', (e) => { DA.Input.sensitivity = +e.target.value; try { localStorage.setItem('deadacres.sens', e.target.value); } catch (er) { /* no storage */ } });
    $('game').addEventListener('click', () => { if (G.mode === 'play' && !G.paused && me.alive) lockMouse(); });
    document.addEventListener('pointerlockchange', () => {
      // pressing Esc lets the mouse go: show the pause menu
      if (!document.pointerLockElement && G.mode === 'play' && !Inv.UI.open && !mapOpen && !DA.Input.typing && me.alive && !G.paused) setPause(true);
    });
    $('chatInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); closeChat(true); }
      if (e.key === 'Escape') { e.preventDefault(); closeChat(false); }
      e.stopPropagation();
    });
    $('codeInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnJoin').click(); e.stopPropagation(); });
    $('nameInput').addEventListener('keydown', (e) => e.stopPropagation());
    window.addEventListener('beforeunload', () => { if (G.mode === 'play') { save(); if (Net.online && !G.isHost) Net.send({ k: 'rec', rec: myRecord() }); } });
  }

  // ============================================================
  //  GO!
  // ============================================================
  G.start = async function () {
    const steps = setupSteps();
    const status = $('loadStep'), bar = $('loadBar');
    const t0 = performance.now();
    for (let i = 0; i < steps.length; i++) {
      status.textContent = steps[i][0] + '...';
      bar.style.width = Math.round((i / steps.length) * 100) + '%';
      await new Promise((r) => setTimeout(r, 20)); // let the screen show the new text
      steps[i][1]();
    }
    console.log('World built in ' + Math.round(performance.now() - t0) + ' ms');
    G.state = freshState();
    G.mode = 'title';
    $('loading').style.display = 'none';
    $('title').style.display = 'flex';
    refreshTitle();
    const q = new URLSearchParams(location.search);
    if (q.get('join')) { $('codeInput').value = q.get('join'); }
    requestAnimationFrame(frame);
  };

  // for testing from the console / robots
  G._debug = { handleAction, applyEvent, emit, startHost, freshState, respawn, setPause, toggleMap, get renderer() { return renderer; }, get cam() { return cam; }, get scene() { return scene; } };
  return G;
})();
