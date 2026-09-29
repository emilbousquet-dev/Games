// ============================================================
//  STARFALL — PLAYING ONLINE WITH A FRIEND
//  Uses PeerJS: the two browsers talk to each other directly.
//  The HOST's game is the "boss": it moves the enemies and keeps the world.
// ============================================================
window.SF = window.SF || {};

SF.Net = (function () {
  const U = SF.U;
  let peer = null, conn = null, chan = null;
  let status = '';
  const N = {
    active: false, isHost: false, code: '', friend: null, connected: false,
    onConnected: null, onFail: null, onWelcome: null,
  };
  let sendT = 0, snapT = 0;

  // for testing: ?peerhost=localhost:9000 uses your own PeerJS server,
  // ?localnet uses two tabs of the same browser (no internet needed)
  const params = new URLSearchParams(location.search);
  function peerOptions() {
    const ph = params.get('peerhost');
    if (!ph) return { debug: 0 };
    const [host, port] = ph.split(':');
    return { host, port: +port || 9000, path: '/', secure: false, debug: 0 };
  }
  const useLocal = params.has('localnet');

  function makeCode() {
    const w = ['ZIB', 'MOON', 'STAR', 'GLOW', 'FLOOF', 'ORB'];
    return U.pick(w) + '-' + Math.floor(1000 + Math.random() * 9000);
  }
  const peerId = (code) => 'starfall-v1-' + code.toLowerCase().replace(/[^a-z0-9]/g, '');

  // ---------- a pretend connection between two tabs (for testing) ----------
  function localChannel(code, role) {
    const bc = new BroadcastChannel('starfall-' + code);
    const c = {
      open: false, handlers: {},
      on(ev, f) { this.handlers[ev] = f; },
      send(d) { bc.postMessage({ from: role, d }); },
      close() { bc.postMessage({ from: role, bye: true }); bc.close(); },
    };
    bc.onmessage = (m) => {
      if (m.data.from === role) return;
      if (m.data.bye) { c.handlers.close && c.handlers.close(); return; }
      if (m.data.knock && role === 'host') { c.send({ welcomeKnock: true }); if (!c.open) { c.open = true; c.handlers.open && c.handlers.open(); } return; }
      if (m.data.d && m.data.d.welcomeKnock && role === 'guest') { if (!c.open) { c.open = true; c.handlers.open && c.handlers.open(); } return; }
      c.handlers.data && c.handlers.data(m.data.d);
    };
    if (role === 'guest') {
      const knock = () => { if (!c.open) { bc.postMessage({ from: 'guest', knock: true }); setTimeout(knock, 500); } };
      knock();
    }
    return c;
  }

  // ---------- HOST ----------
  function host(onReady, onFail) {
    N.code = makeCode(); N.isHost = true; N.active = true;
    status = 'Starting...';
    if (useLocal) {
      setTimeout(() => { status = 'Waiting for friend'; onReady(N.code); }, 100);
      conn = localChannel(N.code, 'host');
      setupConn(conn);
      return;
    }
    if (!window.Peer) { onFail('The online library did not load.'); return; }
    peer = new Peer(peerId(N.code), peerOptions());
    peer.on('open', () => { status = 'Waiting for friend'; onReady(N.code); });
    peer.on('connection', (c) => {
      if (conn && N.connected) { c.on('open', () => { c.send({ t: 'full' }); setTimeout(() => c.close(), 500); }); return; }
      conn = c;
      setupConn(c);
    });
    peer.on('error', (e) => { status = 'Error'; onFail(errText(e)); });
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) {} });
  }

  // ---------- JOIN ----------
  function join(code, onFail) {
    N.code = code.trim().toUpperCase(); N.isHost = false; N.active = true;
    status = 'Connecting...';
    let done = false;
    const fail = (m) => { if (done) return; done = true; onFail(m); };
    setTimeout(() => { if (!N.connected) fail('Could not find that game. Check the code, and make sure your friend is still waiting!'); }, 15000);
    if (useLocal) { conn = localChannel(N.code, 'guest'); setupConn(conn); return; }
    if (!window.Peer) { fail('The online library did not load.'); return; }
    peer = new Peer(peerOptions());
    peer.on('open', () => {
      conn = peer.connect(peerId(N.code), { reliable: true });
      setupConn(conn);
    });
    peer.on('error', (e) => fail(errText(e)));
  }

  function errText(e) {
    const t = (e && e.type) || '';
    if (t === 'peer-unavailable') return 'Could not find that game. Check the code!';
    if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'Could not reach the internet game server. Are you online?';
    if (t === 'browser-incompatible') return 'This browser can\'t play online. Try Chrome or Firefox!';
    if (t === 'unavailable-id') return 'That room code is taken. Try again!';
    return 'Online error: ' + (t || e);
  }

  function setupConn(c) {
    c.on('open', () => {
      if (!N.isHost) send({ t: 'hello', name: SF.Game.myName() });
      status = N.isHost ? 'Friend connecting...' : 'Joining...';
    });
    c.on('data', (d) => receive(d));
    c.on('close', () => lost());
    c.on('error', () => lost());
  }

  function send(msg) { if (conn && (conn.open || conn.open === undefined)) { try { conn.send(msg); } catch (e) {} } }

  function lost() {
    if (!N.connected) return;
    N.connected = false;
    if (N.friend && N.friend.avatar) N.friend.avatar.remove(SF.Game.scene);
    N.friend = null;
    status = N.isHost ? 'Friend left' : 'Disconnected';
    SF.HUD.toast(N.isHost ? 'Your friend left the game.' : 'Lost connection to your friend\'s game!', 0xff8080, 5);
    if (!N.isHost) setTimeout(() => SF.Game.backToTitle('The connection was lost.'), 2500);
  }

  // ---------- messages ----------
  function receive(d) {
    if (!d || !d.t) return;
    const G = SF.Game;
    switch (d.t) {
      case 'full': N.onFail && N.onFail('That game is already full!'); break;
      case 'hello': // (host) a friend arrived
        N.connected = true;
        makeFriend(d.name || 'FRIEND');
        send({ t: 'welcome', name: G.myName(), world: SF.State.world, time: SF.Sky.S.t, seed: SF.Layout.seed, pos: G.player.pos });
        status = 'Playing with ' + N.friend.name;
        SF.HUD.toast(N.friend.name + ' joined your game! 🎉', 0x6ab0ff, 5);
        SF.Audio.sfx('fanfare');
        break;
      case 'welcome': // (friend) we are in!
        N.connected = true;
        makeFriend(d.name || 'HOST');
        status = 'Playing with ' + N.friend.name;
        N.onWelcome && N.onWelcome(d);
        break;
      case 'p':
        if (N.friend) N.friend.st = d.s;
        break;
      case 'snap':
        if (!N.isHost) { SF.Creatures.applySnapshot(d.c); if (Math.abs(U.angleDiff(SF.Sky.S.t * 6.283, d.time * 6.283)) > 0.05) SF.Sky.S.t = d.time; }
        break;
      case 'hit': { // (host) the friend hit an enemy
        const e = SF.Creatures.byId.get(d.id);
        if (!e || !e.alive) break;
        if (d.kind === 'eye') { const def = SF.Creatures.TYPES[e.type]; def.stun && def.stun(e); break; }
        SF.Creatures.applyHit(e, d.dmg, d.fx, d.fz, d.k, d.kind, null, true);
        break;
      }
      case 'hurt': G.player.hurt(d.a, d.fx, d.fz, d.k); break;
      case 'ev': SF.World.apply(d.ev, true); break;
      case 'arrow': SF.Creatures.shootArrow(new THREE.Vector3(...d.s), new THREE.Vector3(...d.d), 'friend'); SF.Audio.sfx('bowShoot'); break;
      case 'revive': if (G.player.down) { G.player.revive(8); SF.HUD.toast(N.friend.name + ' helped you up!', 0x6ab0ff); } break;
      case 'respawn': G.respawnAll(true); break;
    }
  }

  function makeFriend(name) {
    if (N.friend && N.friend.avatar) N.friend.avatar.remove(SF.Game.scene);
    const color = N.isHost ? 0x4a9aff : 0xff8a30;
    N.friend = { name: String(name).slice(0, 14).toUpperCase(), st: null, pos: new THREE.Vector3(), avatar: new SF.Avatar(SF.Game.scene, color, String(name).slice(0, 14).toUpperCase()), vis: null };
  }

  // ---------- every frame ----------
  function update(dt) {
    if (!N.active || !N.connected) return;
    const G = SF.Game;
    sendT -= dt; snapT -= dt;
    if (sendT <= 0) {
      sendT = 1 / 15;
      const s = G.player.state();
      const r = (v) => Math.round(v * 100) / 100;
      send({ t: 'p', s: { x: r(s.x), y: r(s.y), z: r(s.z), f: r(s.f), sp: r(s.sp), vy: r(s.vy), g: s.g, gl: s.gl, sw: s.sw, at: r(s.at), ci: s.ci, cn: s.cn, bl: s.bl, am: s.am, ap: r(s.ap), dn: s.dn, j: r(s.j), hp: s.hp, mh: s.mh, inv: r(s.inv) } });
    }
    if (N.isHost && snapT <= 0) {
      snapT = 1 / 12;
      const f = N.friend;
      send({ t: 'snap', c: SF.Creatures.snapshot(f && f.st ? [{ x: f.st.x, z: f.st.z }] : null), time: SF.Sky.S.t });
    }
    // move the friend's astronaut smoothly
    const f = N.friend;
    if (f && f.st) {
      if (!f.vis) f.vis = { ...f.st };
      const k = 1 - Math.exp(-14 * dt);
      if (Math.hypot(f.st.x - f.vis.x, f.st.z - f.vis.z) > 20) Object.assign(f.vis, f.st);
      const v = f.vis;
      v.x += (f.st.x - v.x) * k; v.y += (f.st.y - v.y) * k; v.z += (f.st.z - v.z) * k;
      v.f = v.f + U.angleDiff(v.f, f.st.f) * k;
      for (const key of ['sp', 'vy', 'g', 'gl', 'sw', 'at', 'ci', 'cn', 'bl', 'am', 'ap', 'dn', 'j', 'hp', 'mh', 'inv']) v[key] = f.st[key];
      f.pos.set(v.x, v.y, v.z);
      f.avatar.animate(dt, v, SF.Phys.groundAt(v.x, v.z, v.y + 0.1));
    }
  }

  // ---------- sending things ----------
  const event = (ev) => { if (N.connected) send({ t: 'ev', ev }); };
  const sendHit = (id, dmg, fx, fz, k, kind) => send({ t: 'hit', id, dmg, fx, fz, k, kind });
  const sendHurt = (a, fx, fz, k) => send({ t: 'hurt', a, fx, fz, k });
  const sendArrow = (s, d) => send({ t: 'arrow', s: [s.x, s.y, s.z], d: [d.x, d.y, d.z] });
  const sendRevive = () => send({ t: 'revive' });
  const sendRespawn = () => send({ t: 'respawn' });
  const sendMelee = () => {};

  function stop() {
    try { if (conn) conn.close(); } catch (e) {}
    try { if (peer) peer.destroy(); } catch (e) {}
    if (N.friend && N.friend.avatar) N.friend.avatar.remove(SF.Game.scene);
    peer = conn = null; N.friend = null; N.active = false; N.connected = false; N.isHost = false; status = '';
  }

  function statusText() {
    if (!N.active) return '';
    if (N.isHost && !N.connected) return '🌐 Room code: ' + N.code + ' — waiting for your friend';
    return '🌐 ' + status;
  }

  return Object.assign(N, { host, join, update, event, sendHit, sendHurt, sendArrow, sendRevive, sendRespawn, sendMelee, stop, statusText, send });
})();
