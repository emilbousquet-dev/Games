// ============================================================
//  SIGMA HOVER GP — ONLINE (up to 4 players)
//  One player HOSTS a room and gets a 4-letter code. Friends
//  type the code to JOIN. Uses PeerJS (computers talk directly).
//  The host drives the CPU racers; every player drives their
//  own racer and sends where it is 20 times per second.
// ============================================================
window.HG = window.HG || {};

HG.Net = (function () {
  const U = HG.U;
  const PREFIX = 'sigmahovergp-';
  const SEND_RATE = 1 / 20;
  let peer = null, isHost = false, code = '', conns = [], hostConn = null;
  let myId = 0, players = [], settings = { track: 'neon', cc: 150, cpus: true, items: true };
  let status = '', race = null, sendT = 0, snaps = {}, onLobby = null, started = false;
  const ui = () => HG.Menu.ui;

  function peerOptions() {
    const q = new URLSearchParams(location.search).get('peer');
    if (!q) return { debug: 1 };
    const [host, port] = q.split(':');
    return { host, port: +(port || 9000), path: '/', secure: false, debug: 1 };
  }
  const myPick = () => { const p = HG.Menu.flow.picks[0]; return { name: HG.Chars.byId[p.charId].name, charId: p.charId, parts: p.parts, color: p.color || HG.Chars.byId[p.charId].kart }; };

  // ------------------------------------------------------------
  //  MENUS
  // ------------------------------------------------------------
  function menu() {
    if (!window.Peer) { alert('The online library (lib/peerjs.min.js) is missing.'); return; }
    HG.Menu.startFlow('online');
  }
  // after choosing a racer and a vehicle
  function lobbyMenu() {
    if (peer && (isHost || hostConn)) return lobby();
    const { el, btn, title } = ui();
    HG.Menu.open('online', (box) => {
      title(box, 'ONLINE RACE', 'Race your friends on other computers!');
      const col = el('div', 'col', box);
      btn(col, '🏠 HOST A ROOM', () => host(), 'first');
      const row = el('div', 'row', col);
      const inp = el('input', 'codein', row);
      inp.maxLength = 4; inp.placeholder = 'CODE'; inp.value = code && !isHost ? code : '';
      inp.addEventListener('input', () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z]/g, ''); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && inp.value.length === 4) join(inp.value); e.stopPropagation(); });
      btn(row, '🚪 JOIN', () => { if (inp.value.length === 4) join(inp.value); else { inp.focus(); setStatus('Type the 4-letter code first!'); } });
      el('div', 'netstatus', box, status);
      el('div', 'hint', box, 'One player presses HOST and tells the others the 4-letter code. Everybody needs internet. Up to 4 players, CPUs fill the empty spots.');
    }, { back: () => { leave(); HG.Menu.mainMenu(); } });
  }
  function setStatus(s) { status = s; const e = document.querySelector('.netstatus'); if (e) e.innerHTML = s; }

  function lobby(replace) {
    const { el, btn, title, option } = ui();
    HG.Menu.open('lobby', (box) => {
      title(box, 'ROOM ' + code, isHost ? 'Tell your friends this code!' : 'Waiting for the host to start...');
      const list = el('div', 'results small', box);
      players.forEach((p, i) => el('div', 'rrow' + (p.id === myId ? ' me' : ''), list, '<b class="rp">' + (i + 1) + '</b><img src="' + (HG.Menu.portraits[p.charId] || '') + '"><span class="rn">' + p.name + '</span><span class="r2">' + (p.id === 0 ? '👑 HOST' : '') + '</span>'));
      for (let i = players.length; i < 4; i++) el('div', 'rrow empty', list, '<b class="rp">' + (i + 1) + '</b><span></span><span class="rn">waiting...</span>');
      if (isHost) {
        const o = el('div', 'opts', box);
        const ids = HG.TRACKS.map((t) => t.id).concat(['random']);
        option(o, 'TRACK', () => (settings.track === 'random' ? 'RANDOM' : HG.TRACKS.find((t) => t.id === settings.track).name), (v, d) => { settings.track = ids[(ids.indexOf(settings.track) + (d || 1) + ids.length) % ids.length]; sendLobby(); }, 0, true).classList.add('first');
        option(o, 'SPEED', () => settings.cc + 'cc', (v, d) => { const L = [50, 100, 150, 200]; settings.cc = L[(L.indexOf(settings.cc) + (d || 1) + 4) % 4]; sendLobby(); }, 0, true);
        option(o, 'CPU RACERS', () => (settings.cpus ? 'ON' : 'OFF'), () => { settings.cpus = !settings.cpus; sendLobby(); }, 0, true);
        option(o, 'ITEMS', () => (settings.items ? 'ON' : 'OFF'), () => { settings.items = !settings.items; sendLobby(); }, 0, true);
        btn(box, '🏁 START RACE!', () => startRace(), 'big');
      } else {
        const t = settings.track === 'random' ? 'RANDOM' : (HG.TRACKS.find((x) => x.id === settings.track) || {}).name;
        el('div', 'hint', box, 'TRACK: ' + t + ' • ' + settings.cc + 'cc • CPUs ' + (settings.cpus ? 'ON' : 'OFF') + ' • ITEMS ' + (settings.items ? 'ON' : 'OFF'));
      }
      el('div', 'netstatus', box, status);
    }, { back: () => { leave(); HG.Menu.mainMenu(); }, replace });
  }
  function refreshLobby() { if (document.querySelector('.s-lobby')) lobby(true); }

  // ------------------------------------------------------------
  //  CONNECTING
  // ------------------------------------------------------------
  function randomCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
  function host() {
    leave();
    isHost = true; myId = 0; code = randomCode();
    setStatus('Opening a room...');
    peer = new Peer(PREFIX + code, peerOptions());
    peer.on('open', () => { players = [Object.assign({ id: 0 }, myPick())]; status = ''; lobby(); });
    peer.on('connection', (c) => {
      c.on('open', () => {
        if (players.length >= 4 || started) { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); return; }
        conns.push(c);
        c.on('data', (m) => onHostData(c, m));
        c.on('close', () => { conns = conns.filter((x) => x !== c); players = players.filter((p) => p.id !== c.playerId); sendLobby(); dropRemote(c.playerId); });
      });
    });
    peer.on('error', (e) => { setStatus('😕 ' + niceError(e)); if (e.type === 'unavailable-id') host(); });
  }
  function join(c) {
    leave();
    isHost = false; code = c;
    setStatus('Connecting to room ' + c + '...');
    peer = new Peer(undefined, peerOptions());
    peer.on('open', () => {
      hostConn = peer.connect(PREFIX + c, { reliable: true });
      hostConn.on('open', () => { hostConn.send(Object.assign({ t: 'hello' }, myPick())); setStatus('Connected! Waiting for the host...'); });
      hostConn.on('data', onClientData);
      hostConn.on('close', () => { setStatus('The host left the room.'); if (race) { HG.Game.endRace(); } hostConn = null; started = false; race = null; HG.Menu.mainMenu(); });
    });
    peer.on('error', (e) => setStatus('😕 ' + niceError(e)));
    setTimeout(() => { if (!hostConn || !hostConn.open) setStatus('😕 Could not find room ' + c + '. Check the code and that the host is waiting.'); }, 9000);
  }
  function niceError(e) {
    if (e.type === 'peer-unavailable') return 'That room does not exist. Check the code!';
    if (e.type === 'network' || e.type === 'server-error' || e.type === 'socket-error') return 'Can\'t reach the online server. Are you connected to the internet?';
    if (e.type === 'browser-incompatible') return 'This browser can\'t play online. Try Chrome or Edge.';
    return 'Online error: ' + (e.type || e.message || e);
  }
  function leave() {
    if (peer) { try { peer.destroy(); } catch (e) { /* ok */ } }
    peer = null; conns = []; hostConn = null; players = []; started = false; race = null; snaps = {};
  }
  function sendAll(m) { for (const c of conns) if (c.open) c.send(m); }
  function sendLobby() { sendAll({ t: 'lobby', players, settings }); refreshLobby(); }

  // ------------------------------------------------------------
  //  MESSAGES
  // ------------------------------------------------------------
  function onHostData(c, m) {
    if (m.t === 'hello') {
      const id = [1, 2, 3].find((i) => !players.some((p) => p.id === i));
      c.playerId = id;
      players.push({ id, name: m.name, charId: m.charId, parts: m.parts, color: m.color });
      c.send({ t: 'welcome', id });
      sendLobby();
    } else if (m.t === 'k') { receiveKart(m); for (const o of conns) if (o !== c && o.open) o.send(m); }
    else if (m.t === 'item' || m.t === 'box') { applyEvent(m); for (const o of conns) if (o !== c && o.open) o.send(m); }
  }
  function onClientData(m) {
    if (m.t === 'welcome') { myId = m.id; }
    else if (m.t === 'full') setStatus('😕 That room is full (or already racing).');
    else if (m.t === 'lobby') { players = m.players; settings = m.settings; if (!started) { if (document.querySelector('.s-lobby')) refreshLobby(); else lobby(); } }
    else if (m.t === 'start') beginRace(m.cfg);
    else if (m.t === 'w') { for (const k of m.karts) receiveKart({ id: k[0], s: k }); }
    else if (m.t === 'k') receiveKart(m);
    else if (m.t === 'item' || m.t === 'box') applyEvent(m);
    else if (m.t === 'lobbyagain') { started = false; if (race) HG.Game.endRace(); race = null; lobby(); }
  }

  // ------------------------------------------------------------
  //  RACING
  // ------------------------------------------------------------
  function startRace() {
    const track = settings.track === 'random' ? U.pick(HG.TRACKS).id : settings.track;
    const racers = players.map((p) => ({ name: p.name, charId: p.charId, parts: p.parts, color: p.color, netId: p.id, human: true }));
    if (settings.cpus) {
      const taken = new Set(players.map((p) => p.charId));
      const pool = U.shuffle(HG.Chars.LIST.filter((c) => !taken.has(c.id) && !c.unlock));
      for (let i = 0; racers.length < 8; i++) { const c = pool[i % pool.length]; racers.unshift({ name: c.name, charId: c.id, color: c.kart, netId: 100 + i, parts: { body: c.defaultBody || U.pick(HG.Vehicles.BODIES.filter((b) => !b.cost && !b.unlock)).id, engine: 'twin', fins: 'standard' } }); }
    }
    const cfg = { track, mode: 'vs', cc: settings.cc, items: settings.items, racers, online: true, difficulty: 1.2 };
    sendAll({ t: 'start', cfg });
    beginRace(cfg);
  }
  function beginRace(cfg) {
    started = true; snaps = {};
    // who drives what on this computer
    cfg = JSON.parse(JSON.stringify(cfg));
    for (const r of cfg.racers) {
      if (r.netId === myId) { r.ctrl = 'local'; r.player = 0; }
      else if (r.netId >= 100 && isHost) r.ctrl = 'cpu';
      else r.ctrl = 'remote';
    }
    HG.Menu.flow = { mode: 'online', players: 1, picks: HG.Menu.flow ? HG.Menu.flow.picks : [], cc: cfg.cc, laps: 3, items: cfg.items, difficulty: 1.2, cpus: 0 };
    HG.Menu.go(cfg);
    race = HG.Race;
  }

  // pack a racer into a small list of numbers
  function pack(k) {
    const f = (k.grounded ? 1 : 0) | (k.boosting ? 2 : 0) | (k.shieldT > 0 ? 4 : 0) | (k.ghostT > 0 ? 8 : 0) | (k.sigmaT > 0 ? 16 : 0) | (k.missileT > 0 ? 32 : 0) |
      (k.hitT > 0 ? 64 : 0) | (k.gliding ? 128 : 0) | (k.finished ? 256 : 0) | (k.falling > 0 || k.respawnT > 0 ? 512 : 0) | (k.shrinkT > 0 ? 1024 : 0) | (k.squashT > 0 ? 2048 : 0);
    const r2 = (v) => Math.round(v * 100) / 100;
    return [k.netId, r2(k.dist), r2(k.d), r2(k.h), r2(k.yaw), r2(k.spd), r2(k.steerSm), f, k.drift.dir, k.drift.level, r2(k.hitSpin), r2(k.trick), k.trickType, k.coins, k.lap, r2(k.finishTime), k.dragged || '', k.orbiting ? (k.item + k.orbiting) : '', k.hitKind || ''];
  }
  function receiveKart(m) {
    if (!HG.Race.karts) return;
    const s = m.s;
    const k = HG.Race.karts.find((x) => x.netId === s[0]);
    if (!k || k.ctrl !== 'remote') return;
    const list = snaps[s[0]] || (snaps[s[0]] = []);
    list.push({ t: performance.now(), s });
    if (list.length > 6) list.shift();
  }
  // put remote racers where they should be (a little in the past, smoothly)
  function applyRemote() {
    const now = performance.now() - 110;
    for (const k of HG.Race.karts) {
      if (k.ctrl !== 'remote' || k.isGhost) continue;
      const L = snaps[k.netId];
      if (!L || !L.length) continue;
      let a = L[0], b = L[L.length - 1];
      for (let i = 0; i < L.length - 1; i++) if (L[i].t <= now && L[i + 1].t >= now) { a = L[i]; b = L[i + 1]; break; }
      const f = b.t > a.t ? U.clamp((now - a.t) / (b.t - a.t), 0, 1) : 1;
      const A = a.s, B = b.s;
      k.dist = U.lerp(A[1], B[1], f); k.s = HG.Race.track.wrap(k.dist);
      k.d = U.lerp(A[2], B[2], f); k.h = U.lerp(A[3], B[3], f);
      k.yaw = A[4] + U.angleDiff(A[4], B[4]) * f; k.spd = U.lerp(A[5], B[5], f); k.steerSm = U.lerp(A[6], B[6], f);
      const fl = B[7];
      k.grounded = !!(fl & 1); k.boostT = fl & 2 ? 0.1 : 0; k.shieldT = fl & 4 ? 1 : 0; k.ghostT = fl & 8 ? 1 : 0; k.sigmaT = fl & 16 ? 1 : 0; k.missileT = fl & 32 ? 1 : 0;
      k.hitT = fl & 64 ? 0.3 : 0; k.hitKind = B[18] || 'spin'; k.gliding = !!(fl & 128); k.shrinkT = fl & 1024 ? 1 : 0; k.squashT = fl & 2048 ? 1 : 0;
      k.respawnT = fl & 512 ? 0.1 : 0;
      if ((fl & 256) && !k.finished) { k.finished = true; k.finishTime = B[15]; }
      k.drift.dir = B[8]; k.drift.level = B[9]; k.hitSpin = B[10]; k.trick = B[11]; k.trickType = B[12]; k.coins = B[13];
      k.dragged = B[16] || null;
      if (B[17]) { k.item = B[17].replace(/\d+$/, ''); k.orbiting = +B[17].replace(/^\D+/, ''); } else if (k.orbiting) { k.orbiting = 0; k.item = null; }
      k.anim.lean = U.damp(k.anim.lean, -k.steerSm * 0.5 - k.drift.dir * 0.25, 8, 1 / 60);
    }
  }

  function beforeStep(r, dt) { applyRemote(); }
  function afterStep(r, dt) {
    sendT += dt;
    if (sendT < SEND_RATE) return;
    sendT = 0;
    const mine = r.karts.filter((k) => k.ctrl === 'local' || (isHost && k.ctrl === 'cpu'));
    if (isHost) sendAll({ t: 'w', karts: mine.map(pack) });
    else if (hostConn && hostConn.open) for (const k of mine) hostConn.send({ t: 'k', s: pack(k) });
    // race over: host can open the lobby again
  }
  function dropRemote(id) {
    if (!HG.Race.karts) return;
    const k = HG.Race.karts.find((x) => x.netId === id);
    if (k) { k.out = true; HG.HUD.msg(HG.Race.karts.find((x) => x.ctrl === 'local'), k.name + ' left the race', 2); }
  }

  // ------------------------------------------------------------
  //  ITEMS travel across the internet too
  // ------------------------------------------------------------
  function itemEvent(k, kind, id, forward) {
    const m = { t: 'item', from: k.netId, kind, id, forward, s: k.s, d: k.d, yaw: k.yaw, dist: k.dist };
    if (isHost) sendAll(m); else if (hostConn && hostConn.open) hostConn.send(m);
  }
  function boxTaken(i) {
    const m = { t: 'box', i };
    if (isHost) sendAll(m); else if (hostConn && hostConn.open) hostConn.send(m);
  }
  function applyEvent(m) {
    if (!HG.Race.karts) return;
    if (m.t === 'box') { const b = HG.Items.boxes[m.i]; if (b) b.t = 1.2; return; }
    const k = HG.Race.karts.find((x) => x.netId === m.from);
    if (!k || k.ctrl !== 'remote') return;
    // put the sender exactly where they threw it
    k.s = m.s; k.d = m.d; k.yaw = m.yaw; k.dist = m.dist;
    HG.Items.fromNet = true;
    if (m.kind === 'throw') HG.Items.throwItem(k, m.id, m.forward);
    else HG.Items.useInstant(k, m.id);
    HG.Items.fromNet = false;
  }

  return {
    menu, lobbyMenu, beforeStep, afterStep, itemEvent, boxTaken, thingSpawned() {}, thingGone() {},
    get isHost() { return isHost; }, get online() { return !!peer; },
    backToLobby() { started = false; race = null; if (isHost) sendAll({ t: 'lobbyagain' }); lobby(); },
  };
})();
