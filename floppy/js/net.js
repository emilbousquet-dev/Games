// ============================================================
//  FLOPPY PARTY — ONLINE PLAY (PeerJS)
//  The HOST runs the whole game. Friends ("clients") join with
//  a 4-letter room code. Clients send their button presses to
//  the host; the host sends back where everything is,
//  20 times a second, and the clients just draw it.
// ============================================================
window.FP = window.FP || {};

FP.Net = (function () {
  const PREFIX = 'floppyparty-v1-';
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let peer = null, role = null, code = '', conns = new Map(), hostConn = null, myId = null, myName = '';
  const inputs = {}, prevCount = {};
  let sendTimer = 0, inTimer = 0, lastHud = '', lastState = '', events = [];
  let snap = null, clientState = 'lobby', clientMode = null, pressCount = { jump: 0, punch: 0 }, lastLocal = {};

  // for testing on one computer: ?peerhost=localhost&peerport=9000
  function peerOptions() {
    const q = new URLSearchParams(location.search);
    const o = { debug: 1 };
    if (q.get('peerhost')) { o.host = q.get('peerhost'); o.port = +(q.get('peerport') || 9000); o.path = q.get('peerpath') || '/'; o.secure = false; }
    return o;
  }
  const randomCode = () => Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');
  const isHost = () => role === 'host';
  const isClient = () => role === 'client';

  // ------------------------------------------------------------
  //  MENU
  // ------------------------------------------------------------
  function menu() {
    if (typeof Peer === 'undefined' || !window.RTCPeerConnection) {
      FP.UI.screen({ title: 'Play online', html: '<p>Online play works on the <b>website version</b> of Floppy Party (on GitHub Pages).<br>This page can only play on one computer.</p>', buttons: [{ label: `${FP.UI.ICON.back} Back`, action: () => FP.Game.titleScreen() }], back: () => FP.Game.titleScreen() });
      return;
    }
    FP.UI.screen({
      title: 'Play online',
      html: `<p>One person <b>hosts</b> and gets a room code.<br>Friends type the code to <b>join</b>.</p>
        <p><input id="fp-name" class="field name" maxlength="12" placeholder="Your name" autocomplete="off" spellcheck="false"></p>
        <p><input id="fp-code" class="field" maxlength="4" placeholder="CODE" autocomplete="off" spellcheck="false"></p>
        <p class="small">Tip: the host can also have a friend on the same keyboard, and bots!</p>`,
      buttons: [
        { label: `${FP.UI.ICON.home} Host a party`, action: () => host() },
        { label: `${FP.UI.ICON.online} Join with the code`, action: () => { const v = (document.getElementById('fp-code').value || '').trim().toUpperCase(); const n = (document.getElementById('fp-name').value || '').trim(); if (v.length === 4) join(v, n || 'Friend'); else FP.UI.toast('Type the 4-letter code first!'); } },
        { label: `${FP.UI.ICON.back} Back`, action: () => FP.Game.titleScreen(), small: true },
      ],
      back: () => FP.Game.titleScreen(),
    });
    const field = document.getElementById('fp-code');
    const nameField = document.getElementById('fp-name');
    [field, nameField].forEach((f) => f.addEventListener('keydown', (e) => e.stopPropagation()));
    field.addEventListener('input', () => { field.value = field.value.toUpperCase().replace(/[^A-Z]/g, ''); });
    try { nameField.value = localStorage.getItem('floppy-name') || ''; } catch (e) { /* no saving */ }
    nameField.addEventListener('input', () => { try { localStorage.setItem('floppy-name', nameField.value); } catch (e) { /* no saving */ } });
  }

  function waiting(text) {
    FP.UI.screen({ title: 'Online', html: `<p>${text}</p>`, buttons: [{ label: 'Cancel', action: () => { leave(); FP.Game.titleScreen(); } }] });
  }

  // ------------------------------------------------------------
  //  HOST
  // ------------------------------------------------------------
  function host(tries = 0) {
    leave();
    code = randomCode();
    waiting('Opening your party room...');
    peer = new Peer(PREFIX + code, peerOptions());
    peer.on('open', () => {
      role = 'host';
      FP.UI.closeScreen();
      FP.Game.lobby();
      FP.UI.toast(`Your room code is ${code}!`, 4);
    });
    peer.on('connection', (conn) => setupHostConn(conn));
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id' && tries < 5) { host(tries + 1); return; }
      FP.UI.toast('Online problem: ' + (err.type || err.message));
      if (!role) { leave(); menu(); }
    });
  }

  function setupHostConn(conn) {
    conn.on('data', (msg) => {
      if (!msg || !msg.t) return;
      if (msg.t === 'hello') {
        const g = FP.Game;
        if (g.players.length >= 4) { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); return; }
        const p = g.addPlayer({ kind: 'remote', peer: conn.peer }, { name: (msg.name || 'Friend').slice(0, 12) });
        if (!p) return;
        conns.set(conn.peer, { conn, pid: p.id });
        conn.send({ t: 'welcome', id: p.id, code });
        FP.UI.toast(`${p.name} joined the party!`);
        playersChanged();
        sendState(true);
        if (g.state !== 'lobby' && g.state !== 'title') conn.send({ t: 'round', mode: g.mode && g.mode.id, players: playerList(), state: g.state });
      } else if (msg.t === 'in') {
        const c = conns.get(conn.peer);
        if (c) inputs[c.pid] = msg;
      } else if (msg.t === 'color' || msg.t === 'hat' || msg.t === 'outfit') {
        const c = conns.get(conn.peer);
        const p = c && FP.Game.players.find((q) => q.id === c.pid);
        if (p && FP.Game.state === 'lobby') FP.Game.cycle(p, msg.t, msg.dir === -1 ? -1 : 1);
      }
    });
    conn.on('close', () => {
      const c = conns.get(conn.peer);
      conns.delete(conn.peer);
      if (!c) return;
      const p = FP.Game.players.find((q) => q.id === c.pid);
      if (p) { FP.UI.toast(`${p.name} left`); if (FP.Game.state === 'lobby') FP.Game.removePlayer(p); else p.source = { kind: 'bot' }; }
    });
  }

  function broadcast(msg) { for (const { conn } of conns.values()) if (conn.open) conn.send(msg); }
  const playerList = () => FP.Game.everyone.map((p) => ({ id: p.id, name: p.name, colorIndex: p.colorIndex, hat: p.hat, outfit: p.outfit, team: p.team, kind: p.source.kind }));

  // what a remote player is pressing (presses are counted so none get lost)
  function inputOf(pid) {
    const m = inputs[pid];
    if (!m) return { x: 0, z: 0 };
    const prev = prevCount[pid] || { j: 0, p: 0 };
    const out = { x: m.x || 0, z: m.z || 0, jump: !!m.jump, grab: !!m.grab, jumpPressed: m.jc > prev.j, punchPressed: m.pc > prev.p };
    prevCount[pid] = { j: m.jc, p: m.pc };
    return out;
  }

  function playersChanged() { if (isHost()) broadcast({ t: 'players', players: playerList(), state: FP.Game.state }); }
  function matchStarted() { /* the round message has everything */ }
  function roundStarted() { if (isHost()) broadcast({ t: 'round', mode: FP.Game.mode.id, players: playerList(), state: 'countdown' }); }
  function banner(text, sub) { if (isHost()) broadcast({ t: 'banner', text, sub }); }
  function results(html) { if (isHost()) broadcast({ t: 'results', html }); }

  // remember things that happened (punches, jumps...) so clients can show effects and play sounds
  const EVENT_NAMES = ['punchHit', 'knockOut', 'jump', 'throw', 'grab', 'bump', 'punch', 'breakFree', 'wakeUp'];
  EVENT_NAMES.forEach((n) => FP.bus.on(n, (d) => {
    if (!isHost() || !conns.size) return;
    const c = d && (d.by || d.c || (d.parts ? d : null));
    const key = c ? charKey(c) : null;
    const pos = d && d.pos ? [d.pos.x, d.pos.y, d.pos.z] : null;
    events.push({ n, k: key, p: pos });
  }));
  const charKey = (c) => (c.player ? 'p' + c.player.id : 'g' + c.index);
  const r3 = (v) => Math.round(v * 1000) / 1000;

  function sendState(force) {
    const g = FP.Game;
    if (g.state !== lastState || force) {
      lastState = g.state;
      broadcast({ t: 'state', state: g.state, players: playerList(), mode: g.mode && g.mode.id });
    }
  }

  function hostFrame(dt) {
    if (!isHost() || !conns.size) return;
    sendState(false);
    sendTimer -= dt;
    if (sendTimer > 0) return;
    sendTimer = 1 / 20;
    const chars = FP.Ragdoll.all.map((c) => ({
      k: charKey(c), ko: c.ko > 0 ? 1 : 0, e: c.faceExpr && c.faceExpr !== 'smile' && c.faceExpr !== 'ko' ? c.faceExpr : '', a: c.alive ? 1 : 0,
      b: c.bodies.map((b) => [r3(b.position.x), r3(b.position.y), r3(b.position.z), r3(b.quaternion.x), r3(b.quaternion.y), r3(b.quaternion.z), r3(b.quaternion.w)]),
    }));
    const movers = FP.Stage.movers.map(([, b]) => [r3(b.position.x), r3(b.position.y), r3(b.position.z), r3(b.quaternion.x), r3(b.quaternion.y), r3(b.quaternion.z), r3(b.quaternion.w)]);
    const hud = g_hud();
    const msg = { t: 's', chars, movers, ev: events };
    if (hud !== lastHud) { msg.hud = hud; lastHud = hud; }
    const mode = FP.Game.mode;
    if (mode && mode.netState && FP.Game.state !== 'lobby') msg.x = mode.netState();
    events = [];
    broadcast(msg);
  }
  const g_hud = () => (['countdown', 'play', 'roundOver'].includes(FP.Game.state) ? FP.Game.hudHtml() : '');

  // ------------------------------------------------------------
  //  CLIENT
  // ------------------------------------------------------------
  function join(roomCode, name) {
    leave();
    code = roomCode;
    myName = name || 'Friend';
    waiting(`Joining room <b>${code}</b>...`);
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

  function onClientData(msg) {
    if (!msg || !msg.t) return;
    const g = FP.Game;
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
      clientState = msg.state || 'countdown';
      clientMode = FP.Modes[msg.mode];
      g.players = msg.players.map(fromList);
      FP.UI.closeScreen();
      g.clientRound(clientMode);
    } else if (msg.t === 's') { snap = msg; if (msg.hud !== undefined) FP.UI.setHud(msg.hud); applyEvents(msg.ev || []); if (msg.x && clientMode && clientMode.applyNetState) clientMode.applyNetState(msg.x); }
    else if (msg.t === 'banner') FP.UI.big(msg.text, msg.text === 'GO!' ? 0.8 : 2.6, msg.sub);
    else if (msg.t === 'results') {
      FP.UI.setHud('');
      FP.UI.screen({ title: 'Results', html: msg.html + '<p class="small">Waiting for the host to pick what\'s next...</p>', buttons: [{ label: 'Leave the party', action: () => { leave(); g.titleScreen(); }, small: true }] });
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
    const a = FP.Input.read({ kind: 'keys', map: 0 }, 'net0'), b = FP.Input.read({ kind: 'keys', map: 1 }, 'net1'), pad = FP.Input.read({ kind: 'pad', index: 0 }, 'netpad');
    const x = Math.max(-1, Math.min(1, a.x + b.x + pad.x)), z = Math.max(-1, Math.min(1, a.z + b.z + pad.z));
    if (a.jumpPressed || b.jumpPressed || pad.jumpPressed) pressCount.jump++;
    if (a.punchPressed || b.punchPressed || pad.punchPressed) pressCount.punch++;
    if (clientState === 'lobby' && (a.colorPressed || b.colorPressed || pad.colorPressed)) hostConn.send({ t: 'color' });
    if (clientState === 'lobby' && (a.hatPressed || b.hatPressed || pad.hatPressed)) hostConn.send({ t: 'hat' });
    if (clientState === 'lobby' && (a.outfitPressed || b.outfitPressed || pad.outfitPressed)) hostConn.send({ t: 'outfit' });
    inTimer -= dt;
    if (inTimer <= 0 && hostConn && hostConn.open) {
      inTimer = 1 / 30;
      hostConn.send({ t: 'in', x, z, jump: a.jump || b.jump || pad.jump, grab: a.grab || b.grab || pad.grab, jc: pressCount.jump, pc: pressCount.punch });
    }
    // move everything smoothly toward the host's latest positions
    if (snap) {
      const k = Math.min(1, dt * 18);
      const byKey = keyMap();
      for (const s of snap.chars) {
        const c = byKey.get(s.k);
        if (!c) continue;
        s.b.forEach((p, i) => {
          const body = c.bodies[i];
          body.position.x += (p[0] - body.position.x) * k; body.position.y += (p[1] - body.position.y) * k; body.position.z += (p[2] - body.position.z) * k;
          const q = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w).slerp(new THREE.Quaternion(p[3], p[4], p[5], p[6]), k);
          body.quaternion.set(q.x, q.y, q.z, q.w);
        });
        c.ko = s.ko ? 1 : 0; c.alive = !!s.a;
        c.expression = s.e || 'smile'; c.exprTimer = s.e ? 0.2 : 0; c.airTime = 0;
      }
      snap.movers.forEach((p, i) => {
        const m = FP.Stage.movers[i];
        if (!m) return;
        const body = m[1];
        body.position.set(body.position.x + (p[0] - body.position.x) * k, body.position.y + (p[1] - body.position.y) * k, body.position.z + (p[2] - body.position.z) * k);
        if (Math.abs(p[1] - body.position.y) > 5) body.position.set(p[0], p[1], p[2]);
        body.quaternion.set(p[3], p[4], p[5], p[6]);
      });
    }
    const chars = FP.Ragdoll.all;
    for (const c of chars) FP.Ragdoll.sync(c, dt);
    if (clientMode && clientMode.visual && clientState !== 'lobby') clientMode.visual(dt, FP.Game.chars);
    FP.FX.update(dt);
    FP.Stage.update(dt, 0, FP.Camera.target);
    const mine = FP.Game.chars.filter((c) => c.alive !== false).map(FP.Ragdoll.center);
    FP.Camera.update(mine.length ? mine : chars.map(FP.Ragdoll.center), dt, clientMode && clientState !== 'lobby' ? (clientMode.minZoom || 12) : 11);
  }

  // ------------------------------------------------------------
  function leave() {
    if (peer) { try { peer.destroy(); } catch (e) { /* already closed */ } }
    peer = null; role = null; hostConn = null; conns.clear(); myId = null; snap = null; clientState = 'lobby'; clientMode = null;
  }

  function status() {
    if (isHost()) return `Online party. Room code: <b>${code}</b> &nbsp; Friends: open the game, click <i>Play online</i> and type the code.`;
    if (isClient()) return `You're in room <b>${code}</b>. The host starts the game.`;
    return '';
  }

  function send(msg) { if (hostConn && hostConn.open) hostConn.send(msg); }

  return { menu, host, join, leave, status, send, isHost, isClient, inputOf, playersChanged, matchStarted, roundStarted, banner, results, update: () => {}, hostFrame, clientFrame, get myId() { return myId; }, get code() { return code; } };
})();
