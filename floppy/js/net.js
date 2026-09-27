// ============================================================
//  FLOPPY PARTY — ONLINE PLAY
//  The HOST runs the whole game. Friends ("clients") join the
//  host's party. Clients send their button presses to the host;
//  the host sends back where everything is, many times a second,
//  and the clients just draw it.
//
//  Two ways to connect:
//  - "room": inside the claude.ai play link. Everyone who has the
//    page open is in the same room. The host sends messages on the
//    "fp" topic, and friends send their buttons in their "presence".
//  - "peer": on a normal website (like GitHub Pages), with PeerJS
//    and a 4-letter room code.
// ============================================================
window.FP = window.FP || {};

FP.Net = (function () {
  const PREFIX = 'floppyparty-v1-';
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const MAX_BYTES = 3600;  // room messages must stay under 4 KiB
  let kind = null;         // 'peer' or 'room'
  let peer = null, role = null, code = '', conns = new Map(), hostConn = null, myId = null, myName = '';
  const inputs = {}, prevCount = {};
  let sendTimer = 0, keyTimer = 0, beatTimer = 0, inTimer = 0, lastHud = '', lastState = '', events = [], lastMovers = [];
  let snap = null, clientState = 'lobby', clientMode = null, pressCount = { jump: 0, punch: 0 }, actCount = { color: 0, hat: 0, outfit: 0 };
  let roundNo = 0, clientRoundNo = -1, resultsHtml = '', resultsNo = 0, clientResultsNo = -1;

  // ---------------- the claude.ai room (if this page runs there) ----------------
  let roomNs = null, roomAsked = false, party = null, myPeer = '', hostPeer = '', unsub = [], chunks = new Map(), lastActs = {}, joinWait = 0;
  if (window.claude && typeof window.claude.use === 'function') {
    roomAsked = true;
    try { window.claude.use('room').then((r) => { roomNs = r; roomAsked = false; }, () => { roomAsked = false; }); } catch (e) { roomAsked = false; }
  }
  const roomReady = () => !!roomNs;

  // for testing PeerJS on one computer: ?peerhost=localhost&peerport=9000
  function peerOptions() {
    const q = new URLSearchParams(location.search);
    const o = { debug: 1 };
    if (q.get('peerhost')) { o.host = q.get('peerhost'); o.port = +(q.get('peerport') || 9000); o.path = q.get('peerpath') || '/'; o.secure = false; }
    return o;
  }
  const peerReady = () => typeof Peer !== 'undefined' && !!window.RTCPeerConnection;
  const randomCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
  const isHost = () => role === 'host';
  const isClient = () => role === 'client';
  const esc = (s) => FP.UI.escapeHtml(String(s));

  // ------------------------------------------------------------
  //  MENU
  // ------------------------------------------------------------
  function menu() {
    if (!roomReady() && roomAsked) {
      // still asking the page's host if we can use the room: wait a moment
      FP.UI.screen({ title: 'Play online', html: '<p>Connecting...</p>', buttons: [{ label: `${FP.UI.ICON.back} Back`, action: () => FP.Game.titleScreen() }], back: () => FP.Game.titleScreen() });
      const t0 = performance.now();
      const wait = () => { if (roomReady() || !roomAsked || performance.now() - t0 > 11000) menu(); else setTimeout(wait, 250); };
      setTimeout(wait, 250);
      return;
    }
    if (!roomReady() && !peerReady()) {
      FP.UI.screen({ title: 'Play online', html: '<p>Online play is not available here.</p><p class="small">It works in the claude.ai play link (friends need to be invited with the Share button), and on the website version of the game.</p>', buttons: [{ label: `${FP.UI.ICON.back} Back`, action: () => FP.Game.titleScreen() }], back: () => FP.Game.titleScreen() });
      return;
    }
    const inRoom = roomReady();
    FP.UI.screen({
      title: 'Play online',
      html: `<p>One person <b>hosts</b> a party. Friends <b>join</b> it.</p>
        <p><input id="fp-name" class="field name" maxlength="12" placeholder="Your name" autocomplete="off" spellcheck="false"></p>
        ${inRoom ? '<div class="parties" id="fp-parties"><p class="small">Looking for parties...</p></div><p class="small">Friends need this page too: the owner invites them with the <b>Share</b> button at the top.</p>' : ''}
        <p><input id="fp-code" class="field" maxlength="4" placeholder="CODE" autocomplete="off" spellcheck="false"></p>
        <p class="small">Tip: the host can also have a friend on the same keyboard, and bots!</p>`,
      buttons: [
        { label: `${FP.UI.ICON.home} Host a party`, action: () => host() },
        { label: `${FP.UI.ICON.online} Join with the code`, action: () => { const v = (document.getElementById('fp-code').value || '').trim().toUpperCase(); if (v.length === 4) join(v, nameNow()); else FP.UI.toast('Type the 4-letter code first!'); } },
        { label: `${FP.UI.ICON.back} Back`, action: () => { stopPartyList(); FP.Game.titleScreen(); }, small: true },
      ],
      back: () => { stopPartyList(); FP.Game.titleScreen(); },
    });
    const field = document.getElementById('fp-code');
    const nameField = document.getElementById('fp-name');
    [field, nameField].forEach((f) => f.addEventListener('keydown', (e) => e.stopPropagation()));
    field.addEventListener('input', () => { field.value = field.value.toUpperCase().replace(/[^A-Z]/g, ''); });
    try { nameField.value = localStorage.getItem('floppy-name') || ''; } catch (e) { /* no saving */ }
    nameField.addEventListener('input', () => { try { localStorage.setItem('floppy-name', nameField.value); } catch (e) { /* no saving */ } });
    if (inRoom) startPartyList();
  }
  const nameNow = () => { const f = document.getElementById('fp-name'); return ((f && f.value) || '').trim().slice(0, 12) || 'Friend'; };

  // the list of parties open right now (hosts say so in their lobby presence)
  let listUnsub = null;
  function startPartyList() {
    stopPartyList();
    const draw = () => {
      const box = document.getElementById('fp-parties');
      if (!box) { stopPartyList(); return; }
      const open = roomNs.peers().filter((p) => !p.sameTab && p.presence && p.presence.fpHost && typeof p.presence.fpHost.code === 'string');
      if (!open.length) { box.innerHTML = '<p class="small">No parties open right now. Host one, or wait for a friend to host!</p>'; return; }
      box.innerHTML = open.map((p) => { const h = p.presence.fpHost; return `<button class="btn small party" data-code="${esc(h.code).slice(0, 4)}">${FP.UI.ICON.online} Join <b>${esc(h.name || 'a party').slice(0, 14)}</b>'s party (${Math.min(4, +h.n || 1)}/4)</button>`; }).join('');
      box.querySelectorAll('[data-code]').forEach((b) => b.addEventListener('click', () => join(b.dataset.code, nameNow())));
    };
    listUnsub = roomNs.onPeers(draw, () => {});
    draw();
  }
  function stopPartyList() { if (listUnsub) { listUnsub(); listUnsub = null; } }

  function waiting(text) {
    FP.UI.screen({ title: 'Online', html: `<p>${text}</p>`, buttons: [{ label: 'Cancel', action: () => { leave(); FP.Game.titleScreen(); } }] });
  }

  // ------------------------------------------------------------
  //  HOST
  // ------------------------------------------------------------
  function host(tries = 0) {
    stopPartyList();
    leave();
    code = randomCode();
    myName = nameNow();
    if (roomReady()) { roomHost(); return; }
    kind = 'peer';
    waiting('Opening your party room...');
    peer = new Peer(PREFIX + code, peerOptions());
    peer.on('open', () => { role = 'host'; hostStarted(); });
    peer.on('connection', (conn) => setupHostConn(conn));
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && tries < 5) { host(tries + 1); return; }
      FP.UI.toast('Online problem: ' + (err.type || err.message));
      if (!role) { leave(); menu(); }
    });
  }
  function hostStarted() {
    FP.UI.closeScreen();
    FP.Game.lobby();
    FP.UI.toast(`Your party is open! Room code: ${code}`, 4);
  }

  async function roomHost() {
    kind = 'room';
    waiting('Opening your party...');
    try {
      party = await roomNs.join('fp-' + code.toLowerCase());
      // check that we're allowed to send (only people who can edit the page can host)
      await party.emit('fp', { t: 'hi' });
    } catch (e) {
      const why = e && e.code === 'not_permitted' ? 'Only the owner of this page (or people who can edit it) can host. Ask them to host, then join their party!' : 'Could not open the party. Try again in a moment.';
      leave();
      FP.UI.screen({ title: 'Play online', html: `<p>${why}</p>`, buttons: [{ label: `${FP.UI.ICON.back} Back`, action: () => menu() }], back: () => menu() });
      return;
    }
    role = 'host';
    party.presence({ fp: { host: 1, name: myName } });
    roomNs.presence({ fpHost: { code, name: myName, n: 1 } });
    unsub.push(party.onPeers(roomPeersChanged, () => {}));
    hostStarted();
  }

  // room: friends appear (and leave) as peers with an "fp" presence
  function roomPeersChanged(ch) {
    if (!isHost()) return;
    for (const p of ch.peers) {
      if (p.sameTab || conns.has(p.peer)) continue;
      const pr = p.presence && p.presence.fp;
      if (!pr || pr.host || typeof pr.name !== 'string') continue;
      const g = FP.Game;
      if (g.players.length >= 4 || (g.state !== 'lobby' && g.everyone.length >= 4)) continue; // full: they will see that they didn't get in
      const pl = g.addPlayer({ kind: 'remote', peer: p.peer }, { name: pr.name.slice(0, 12) || 'Friend' });
      if (!pl) continue;
      conns.set(p.peer, { pid: pl.id });
      lastActs[p.peer] = { c: pr.cc | 0, h: pr.hc | 0, o: pr.oc | 0 };
      FP.UI.toast(`${pl.name} joined the party!`);
      playersChanged();
      sendState(true);
      if (g.state !== 'lobby' && g.state !== 'title') broadcast({ t: 'round', n: roundNo, r: g.round, mode: g.mode && g.mode.id, players: playerList(), state: g.state });
    }
    for (const p of ch.left) dropClient(p.peer);
    roomNs.presence({ fpHost: { code, name: myName, n: FP.Game.players.length } });
  }

  // room: read every friend's buttons from their presence
  function roomReadInputs() {
    if (!party) return;
    for (const p of party.peers()) {
      const c = conns.get(p.peer);
      const pr = p.presence && p.presence.fp;
      if (!c || !pr) continue;
      inputs[c.pid] = { x: +pr.x || 0, z: +pr.z || 0, jump: !!pr.j, grab: !!pr.g, gl: pr.gl, gr: pr.gr, jc: pr.jc | 0, pc: pr.pc | 0, em: pr.em | 0, ek: pr.ek | 0 };
      const last = lastActs[p.peer] || { c: 0, h: 0, o: 0 };
      const pl = FP.Game.players.find((q) => q.id === c.pid);
      if (pl && FP.Game.state === 'lobby') {
        if ((pr.cc | 0) > last.c) FP.Game.cycle(pl, 'color', 1);
        if ((pr.hc | 0) > last.h) FP.Game.cycle(pl, 'hat', 1);
        if ((pr.oc | 0) > last.o) FP.Game.cycle(pl, 'outfit', 1);
      }
      lastActs[p.peer] = { c: pr.cc | 0, h: pr.hc | 0, o: pr.oc | 0 };
    }
  }

  function dropClient(key) {
    const c = conns.get(key);
    conns.delete(key);
    if (!c) return;
    const p = FP.Game.players.find((q) => q.id === c.pid);
    if (p) { FP.UI.toast(`${p.name} left`); if (FP.Game.state === 'lobby') FP.Game.removePlayer(p); else p.source = { kind: 'bot' }; }
  }

  function setupHostConn(conn) {
    conn.on('data', (msg) => {
      if (!msg || !msg.t) return;
      if (msg.t === 'hello') {
        const g = FP.Game;
        if (g.players.length >= 4 || (g.state !== 'lobby' && g.everyone.length >= 4)) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
        const p = g.addPlayer({ kind: 'remote', peer: conn.peer }, { name: (msg.name || 'Friend').slice(0, 12) });
        if (!p) return;
        conns.set(conn.peer, { conn, pid: p.id });
        conn.send({ t: 'welcome', id: p.id, code });
        FP.UI.toast(`${p.name} joined the party!`);
        playersChanged();
        sendState(true);
        if (g.state !== 'lobby' && g.state !== 'title') conn.send({ t: 'round', n: roundNo, r: g.round, mode: g.mode && g.mode.id, players: playerList(), state: g.state });
      } else if (msg.t === 'in') {
        const c = conns.get(conn.peer);
        if (c) inputs[c.pid] = msg;
      } else if (msg.t === 'color' || msg.t === 'hat' || msg.t === 'outfit') {
        const c = conns.get(conn.peer);
        const p = c && FP.Game.players.find((q) => q.id === c.pid);
        if (p && FP.Game.state === 'lobby') FP.Game.cycle(p, msg.t, msg.dir === -1 ? -1 : 1);
      }
    });
    conn.on('close', () => dropClient(conn.peer));
  }

  // send a message to every friend. Room messages are split into pieces if they're too big
  let chunkId = 0;
  function broadcast(msg) {
    if (kind === 'peer') { for (const { conn } of conns.values()) if (conn && conn.open) conn.send(msg); return; }
    if (kind !== 'room' || !party) return;
    const text = JSON.stringify(msg);
    if (text.length <= MAX_BYTES) { party.emit('fp', msg).catch(() => {}); return; }
    const id = ++chunkId, n = Math.ceil(text.length / MAX_BYTES);
    for (let i = 0; i < n; i++) party.emit('fp', { t: 'ch', id, i, n, s: text.slice(i * MAX_BYTES, (i + 1) * MAX_BYTES) }).catch(() => {});
  }
  const hasFriends = () => conns.size > 0;
  const playerList = () => FP.Game.everyone.map((p) => ({ id: p.id, name: p.name, colorIndex: p.colorIndex, hat: p.hat, outfit: p.outfit, team: p.team, kind: p.source.kind, peer: p.source.kind === 'remote' ? p.source.peer : undefined }));

  // what a remote player is pressing (presses are counted so none get lost)
  function inputOf(pid) {
    const m = inputs[pid];
    if (!m) return { x: 0, z: 0 };
    const prev = prevCount[pid] || { j: m.jc, p: m.pc, e: m.em | 0 };
    const out = { x: m.x || 0, z: m.z || 0, jump: !!m.jump, grab: !!m.grab, ...(m.gl !== undefined ? { grabL: !!m.gl, grabR: !!m.gr } : {}), jumpPressed: m.jc > prev.j, punchPressed: m.pc > prev.p, emote: (m.em | 0) > (prev.e | 0) ? Math.max(0, Math.min(4, m.ek | 0)) : 0 };
    prevCount[pid] = { j: m.jc, p: m.pc, e: m.em | 0 };
    return out;
  }

  function playersChanged() { if (isHost()) broadcast({ t: 'players', players: playerList(), state: FP.Game.state }); }
  function matchStarted() { /* the round message has everything */ }
  function roundStarted() { if (isHost()) { roundNo++; broadcast({ t: 'round', n: roundNo, r: FP.Game.round, mode: FP.Game.mode.id, players: playerList(), state: 'countdown' }); } }
  function banner(text, sub) { if (isHost()) broadcast({ t: 'banner', text, sub }); }
  function results(html) { if (isHost()) { resultsNo++; resultsHtml = html; broadcast({ t: 'results', n: resultsNo, html }); } }
  function podium(places) { if (isHost()) broadcast({ t: 'podium', places, players: playerList() }); }
  function intro(html) { if (isHost()) broadcast({ t: 'intro', html }); }
  function introEnd() { if (isHost()) broadcast({ t: 'introEnd' }); }

  // remember things that happened (punches, jumps...) so clients can show effects and play sounds
  const EVENT_NAMES = ['punchHit', 'knockOut', 'jump', 'throw', 'grab', 'bump', 'punch', 'breakFree', 'wakeUp'];
  EVENT_NAMES.forEach((n) => FP.bus.on(n, (d) => {
    if (!isHost() || !hasFriends()) return;
    const c = d && (d.by || d.c || (d.parts ? d : null));
    const key = c ? charKey(c) : null;
    const pos = d && d.pos ? [r2(d.pos.x), r2(d.pos.y), r2(d.pos.z)] : null;
    if (events.length < 20) events.push({ n, k: key, p: pos });
  }));
  const charKey = (c) => (c.player ? 'p' + c.player.id : 'g' + c.index);
  const r2 = (v) => Math.round(v * 100) / 100;
  const pose = (b) => [r2(b.position.x), r2(b.position.y), r2(b.position.z), r2(b.quaternion.x), r2(b.quaternion.y), r2(b.quaternion.z), r2(b.quaternion.w)];

  function sendState(force) {
    const g = FP.Game;
    if (g.state !== lastState || force) {
      lastState = g.state;
      broadcast({ t: 'state', state: g.state, players: playerList(), mode: g.mode && g.mode.id });
    }
  }

  function hostFrame(dt) {
    if (!isHost()) return;
    if (kind === 'room') roomReadInputs();
    if (!hasFriends()) return;
    sendState(false);
    // every 2 seconds: a "heartbeat" so a friend who missed a message catches up
    beatTimer -= dt;
    if (beatTimer <= 0) {
      beatTimer = 2;
      const g = FP.Game;
      broadcast({ t: 'beat', state: g.state, mode: g.mode && g.mode.id, n: roundNo, r: g.round, players: playerList() });
      if (g.state === 'results' && resultsHtml) broadcast({ t: 'results', n: resultsNo, html: resultsHtml });
    }
    sendTimer -= dt;
    if (sendTimer > 0) return;
    sendTimer = kind === 'room' ? 1 / 12 : 1 / 20;
    const chars = FP.Ragdoll.all.map((c) => ({
      k: charKey(c), ko: c.ko > 0 ? 1 : 0, e: c.faceExpr && c.faceExpr !== 'smile' && c.faceExpr !== 'ko' ? c.faceExpr : '', a: c.alive ? 1 : 0,
      b: c.bodies.map(pose),
    }));
    const msg = { t: 's', chars, ev: events };
    // moving things: only the ones that moved (and everything every 2 seconds)
    keyTimer -= 1 / 12;
    const all = FP.Stage.movers.map(([, b]) => pose(b));
    if (keyTimer <= 0 || all.length !== lastMovers.length) { keyTimer = 2; msg.mv = all; }
    else {
      const md = [];
      all.forEach((m, i) => { const o = lastMovers[i]; if (!o || m.some((v, k) => v !== o[k])) md.push([i, ...m]); });
      if (md.length) msg.md = md;
    }
    lastMovers = all;
    const hud = g_hud();
    if (hud !== lastHud) { msg.hud = hud; lastHud = hud; }
    const mode = FP.Game.mode;
    if (mode && mode.netState && FP.Game.state !== 'lobby') msg.x = mode.netState();
    if (FP.Fun) msg.f = FP.Fun.netState();
    events = [];
    broadcast(msg);
  }
  const g_hud = () => (['countdown', 'play', 'roundOver'].includes(FP.Game.state) ? FP.Game.hudHtml() : '');

  // ------------------------------------------------------------
  //  CLIENT
  // ------------------------------------------------------------
  function join(roomCode, name) {
    stopPartyList();
    leave();
    code = roomCode;
    myName = name || 'Friend';
    if (roomReady()) { roomJoin(); return; }
    kind = 'peer';
    waiting(`Joining room <b>${esc(code)}</b>...`);
    peer = new Peer(peerOptions());
    peer.on('open', () => {
      hostConn = peer.connect(PREFIX + code, { reliable: true });
      hostConn.on('open', () => { role = 'client'; hostConn.send({ t: 'hello', name: myName }); });
      hostConn.on('data', onClientData);
      hostConn.on('close', () => { if (role === 'client') { FP.UI.toast('The host left the party'); leave(); FP.Game.titleScreen(); } });
    });
    peer.on('error', (err) => {
      FP.UI.toast(err.type === 'peer-unavailable' ? `No party with the code ${code}!` : 'Online problem: ' + (err.type || err.message), 3);
      leave(); menu();
    });
  }

  async function roomJoin() {
    kind = 'room';
    waiting(`Joining the party <b>${esc(code)}</b>...`);
    try { party = await roomNs.join('fp-' + code.toLowerCase()); } catch (e) {
      leave();
      FP.UI.toast('Could not join that party. Try again!', 3);
      menu();
      return;
    }
    role = 'client';
    joinWait = 8;
    pressCount = { jump: 0, punch: 0 }; actCount = { color: 0, hat: 0, outfit: 0 };
    party.presence({ fp: { name: myName, x: 0, z: 0, j: false, g: false, jc: 0, pc: 0, cc: 0, hc: 0, oc: 0 } });
    unsub.push(party.on('fp', (m) => { if (m.sameTab) return; hostPeer = m.peer; onRoomMessage(m.data); }, () => {}));
    unsub.push(party.onPeers((ch) => {
      const me = ch.peers.find((p) => p.sameTab);
      if (me) myPeer = me.peer;
      if (hostPeer && ch.left.some((p) => p.peer === hostPeer)) { FP.UI.toast('The host left the party'); leave(); FP.Game.titleScreen(); }
    }, () => {}));
  }

  // room: put big messages back together, then handle them like any other
  function onRoomMessage(d) {
    if (!d || typeof d !== 'object') return;
    if (d.t === 'ch') {
      let c = chunks.get(d.id);
      if (!c) { c = { n: d.n, parts: [], got: 0, t: performance.now() }; chunks.set(d.id, c); }
      if (!c.parts[d.i]) { c.parts[d.i] = String(d.s); c.got++; }
      if (c.got === c.n) { chunks.delete(d.id); try { onClientData(JSON.parse(c.parts.join(''))); } catch (e) { /* a broken message: skip it */ } }
      for (const [id, o] of chunks) if (performance.now() - o.t > 3000) chunks.delete(id); // pieces that never all arrived
      return;
    }
    onClientData(d);
  }

  // room: which player am I? (the host lists my peer label next to my player)
  function findMe(list) {
    if (kind !== 'room' || myId !== null || !myPeer) return;
    const mine = list.find((p) => p.peer === myPeer);
    if (mine) { myId = mine.id; FP.UI.closeScreen(); FP.UI.toast(`You joined the party ${code}!`); }
  }

  function onClientData(msg) {
    if (!msg || !msg.t) return;
    const g = FP.Game;
    if (msg.players) findMe(msg.players);
    if (msg.t === 'welcome') { myId = msg.id; FP.UI.closeScreen(); FP.UI.toast(`You joined room ${msg.code}!`); }
    else if (msg.t === 'full') { FP.UI.toast('That party is full (4 players)'); leave(); menu(); }
    else if (msg.t === 'players' || msg.t === 'state') {
      g.players = msg.players.map(fromList);
      if (msg.state !== clientState || msg.t === 'players') {
        const was = clientState;
        clientState = msg.state;
        if (clientState === 'lobby' && (was !== 'lobby' || msg.t === 'players')) g.clientLobby();
        if (clientState === 'select') FP.UI.toast('The host is picking a mini-game...', 3);
      }
      g.refreshLobby();
    } else if (msg.t === 'round') {
      clientRoundNo = msg.n;
      clientState = msg.state || 'countdown';
      clientMode = FP.Modes[msg.mode];
      g.players = msg.players.map(fromList);
      g.round = msg.r || 1; // which round of the match (golf needs it to build the right hole)
      FP.UI.closeScreen();
      if (clientMode) g.clientRound(clientMode);
    } else if (msg.t === 'beat') {
      // missed the start of a round, or the return to the lobby? catch up now
      const playing = ['countdown', 'play', 'roundOver'].includes(msg.state);
      if (playing && msg.mode && msg.n !== clientRoundNo) onClientData({ t: 'round', n: msg.n, r: msg.r, mode: msg.mode, players: msg.players, state: msg.state });
      else if (msg.state === 'lobby' && clientState !== 'lobby') onClientData({ t: 'players', players: msg.players, state: 'lobby' });
    } else if (msg.t === 's') {
      snap = msg;
      if (msg.mv) lastMovers = msg.mv.slice();
      if (msg.md) for (const d of msg.md) lastMovers[d[0]] = d.slice(1);
      if (msg.f !== undefined && FP.Fun) FP.Fun.applyNet(msg.f);
      if (msg.hud !== undefined) FP.UI.setHud(msg.hud);
      applyEvents(msg.ev || []);
      if (msg.x && clientMode && clientMode.applyNetState) clientMode.applyNetState(msg.x);
    } else if (msg.t === 'banner') FP.UI.big(String(msg.text), msg.text === 'GO!' ? 0.8 : 2.6, String(msg.sub || ''));
    else if (msg.t === 'podium') { if (g.clientPodium) { g.players = msg.players.map(fromList); clientState = 'results'; g.clientPodium(msg.places); } }
    else if (msg.t === 'intro') FP.UI.screen({ cls: 'intro', title: clientMode ? clientMode.name : 'Get ready', html: String(msg.html || '') });
    else if (msg.t === 'introEnd') FP.UI.closeScreen();
    else if (msg.t === 'results') {
      if (msg.n !== undefined && msg.n === clientResultsNo) return;
      clientResultsNo = msg.n;
      FP.UI.setHud('');
      FP.UI.screen({ cls: 'results', title: 'Results', html: msg.html + '<p class="small">Waiting for the host to pick what\'s next...</p>', buttons: [{ label: 'Leave the party', action: () => { leave(); g.titleScreen(); }, small: true }] });
    }
  }
  const fromList = (p) => ({ id: p.id, name: p.name, colorIndex: p.colorIndex, hat: p.hat, outfit: p.outfit, team: p.team, source: { kind: p.id === myId ? 'me' : (p.kind === 'keys' || p.kind === 'pad' ? 'host' : p.kind) } });

  function applyEvents(list) {
    const byKey = keyMap();
    for (const e of list) {
      const c = e.k ? byKey.get(e.k) : null;
      const pos = e.p ? new THREE.Vector3(e.p[0], e.p[1], e.p[2]) : (c ? c.parts.torso.position : null);
      if (['knockOut', 'jump', 'breakFree', 'wakeUp'].includes(e.n)) { if (c) FP.bus.emit(e.n, c); }
      else if (e.n === 'bump') FP.bus.emit('bump', { c, pos, power: 14 });
      else if (e.n === 'punchHit') FP.bus.emit('punchHit', { by: c, pos });
      else if (e.n === 'throw') { if (c) FP.bus.emit('throw', { by: c }); }
      else FP.bus.emit(e.n, { by: c, pos });
    }
  }
  function keyMap() {
    const m = new Map();
    for (const c of FP.Ragdoll.all) m.set(c.player ? 'p' + c.player.id : 'g' + c.index, c);
    return m;
  }

  // every frame on a client: send my buttons, move everything to where the host says
  function clientFrame(dt) {
    if (!isClient()) return;
    // my buttons (either side of the keyboard, or the first controller)
    const a = FP.Input.read({ kind: 'keys', map: 0 }, 'net0'), b = FP.Input.read({ kind: 'keys', map: 1 }, 'net1');
    const pad = FP.Touch && FP.Touch.available ? FP.Input.read({ kind: 'touch' }, 'nettouch') : FP.Input.read({ kind: 'pad', index: 0 }, 'netpad');
    const x = Math.max(-1, Math.min(1, a.x + b.x + pad.x)), z = Math.max(-1, Math.min(1, a.z + b.z + pad.z));
    if (a.jumpPressed || b.jumpPressed || pad.jumpPressed) pressCount.jump++;
    if (a.punchPressed || b.punchPressed || pad.punchPressed) pressCount.punch++;
    const emote = a.emote || b.emote || pad.emote;
    if (emote) { pressCount.em = (pressCount.em || 0) + 1; pressCount.ek = emote; }
    if (clientState === 'lobby' && (a.colorPressed || b.colorPressed || pad.colorPressed)) send({ t: 'color' });
    if (clientState === 'lobby' && (a.hatPressed || b.hatPressed || pad.hatPressed)) send({ t: 'hat' });
    if (clientState === 'lobby' && (a.outfitPressed || b.outfitPressed || pad.outfitPressed)) send({ t: 'outfit' });
    const jump = a.jump || b.jump || pad.jump, grab = a.grab || b.grab || pad.grab;
    const gl = !!(a.grabL || b.grabL || (pad.grabL !== undefined ? pad.grabL : pad.grab)), gr = !!(a.grabR || b.grabR || (pad.grabR !== undefined ? pad.grabR : pad.grab));
    if (kind === 'room') {
      // the room sends presence about 30 times a second by itself: just keep it up to date
      party.presence({ fp: { name: myName, x: r2(x), z: r2(z), j: jump, g: grab, gl, gr, jc: pressCount.jump, pc: pressCount.punch, em: pressCount.em || 0, ek: pressCount.ek || 0, cc: actCount.color, hc: actCount.hat, oc: actCount.outfit } }).catch(() => {});
      if (myId === null) {
        joinWait -= dt;
        if (joinWait <= 0) { FP.UI.toast(hostPeer ? 'That party is full (4 players)' : 'Nobody is hosting that party right now', 3); leave(); menu(); return; }
      }
    } else {
      inTimer -= dt;
      if (inTimer <= 0 && hostConn && hostConn.open) {
        inTimer = 1 / 30;
        hostConn.send({ t: 'in', x, z, jump, grab, gl, gr, jc: pressCount.jump, pc: pressCount.punch, em: pressCount.em || 0, ek: pressCount.ek || 0 });
      }
    }
    // move everything to where the host says (smoothly)
    if (snap) {
      const k = Math.min(1, dt * (kind === 'room' ? 14 : 18));
      const byKey = keyMap();
      for (const s of snap.chars) {
        const c = byKey.get(s.k);
        if (!c) continue;
        s.b.forEach((p, i) => {
          const body = c.bodies[i];
          if (!body) return;
          if (Math.abs(p[1] - body.position.y) > 6) body.position.set(p[0], p[1], p[2]);
          body.position.x += (p[0] - body.position.x) * k; body.position.y += (p[1] - body.position.y) * k; body.position.z += (p[2] - body.position.z) * k;
          const q = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w).slerp(new THREE.Quaternion(p[3], p[4], p[5], p[6]).normalize(), k);
          body.quaternion.set(q.x, q.y, q.z, q.w);
        });
        c.ko = s.ko ? 1 : 0; c.alive = !!s.a;
        c.expression = s.e || 'smile'; c.exprTimer = s.e ? 0.2 : 0; c.airTime = 0;
      }
      lastMovers.forEach((p, i) => {
        const m = FP.Stage.movers[i];
        if (!m || !p) return;
        const body = m[1];
        body.position.set(body.position.x + (p[0] - body.position.x) * k, body.position.y + (p[1] - body.position.y) * k, body.position.z + (p[2] - body.position.z) * k);
        if (Math.abs(p[1] - body.position.y) > 5) body.position.set(p[0], p[1], p[2]);
        body.quaternion.set(p[3], p[4], p[5], p[6]); body.quaternion.normalize();
      });
    }
    const chars = FP.Ragdoll.all;
    for (const c of chars) FP.Ragdoll.sync(c, dt);
    if (clientMode && clientMode.visual && clientState !== 'lobby' && clientState !== 'results') clientMode.visual(dt, FP.Game.chars);
    FP.FX.update(dt);
    FP.Stage.update(dt, 0, FP.Camera.target);
    const mine = FP.Game.chars.filter((c) => c.alive !== false).map(FP.Ragdoll.center);
    FP.Camera.update(mine.length ? mine : chars.map(FP.Ragdoll.center), dt, clientMode && clientState !== 'lobby' ? (clientMode.minZoom || 12) : 11);
  }

  // ------------------------------------------------------------
  function leave() {
    if (peer) { try { peer.destroy(); } catch (e) { /* already closed */ } }
    for (const u of unsub) { try { u(); } catch (e) { /* already gone */ } }
    unsub = [];
    if (party) { try { party.leave(); } catch (e) { /* already gone */ } }
    if (roomNs && role === 'host') roomNs.presence({ fpHost: null }).catch(() => {});
    peer = null; party = null; role = null; kind = null; hostConn = null; conns.clear(); myId = null; snap = null; clientState = 'lobby'; clientMode = null;
    hostPeer = ''; chunks.clear(); lastMovers = []; clientRoundNo = -1; clientResultsNo = -1; resultsHtml = '';
    if (FP.Fun) FP.Fun.clearNet();
  }

  function status() {
    if (isHost()) return `Online party <b>${esc(code)}</b> is open. ${kind === 'room' ? 'Friends: open this page, click <i>Play online</i> and join the party.' : 'Friends: open the game, click <i>Play online</i> and type the code.'}`;
    if (isClient()) return `You're in the party <b>${esc(code)}</b>. The host starts the game.`;
    return '';
  }

  // client actions (change color, hat or outfit in the lobby)
  function send(msg) {
    if (kind === 'room') { if (actCount[msg.t] !== undefined) actCount[msg.t]++; return; }
    if (hostConn && hostConn.open) hostConn.send(msg);
  }

  return { menu, host, join, leave, status, send, isHost, isClient, inputOf, playersChanged, matchStarted, roundStarted, banner, results, podium, intro, introEnd, update: () => {}, hostFrame, clientFrame, get myId() { return myId; }, get code() { return code; }, get kind() { return kind; } };
})();
