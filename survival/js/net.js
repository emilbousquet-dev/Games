// ============================================================
//  DEAD ACRES — PLAYING ONLINE
//  Uses PeerJS: browsers talk straight to each other.
//  The HOST's computer runs the world. Friends type the
//  host's 5-letter ROOM CODE to join (up to 3 players).
// ============================================================
window.DA = window.DA || {};

DA.Net = (function () {
  const PREFIX = 'deadacres-v1-';
  const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const MAX_FRIENDS = 2;               // host + 2 friends = 3 players

  const N = {
    role: null,          // 'host' or 'client' (null = playing alone)
    code: null,
    peer: null,
    conns: new Map(),    // host: pid -> connection
    hostConn: null,      // client: the connection to the host
    onMessage: null,     // fn(msg, pid)
    onLeave: null,       // fn(pid)
    onClose: null,       // fn(reason)  (client lost the host)
    nextPid: 1,
    get online() { return !!N.role; },
    get friends() { return N.conns.size; },
  };

  // settings for your own PeerJS server (only for testing): ?peerhost=localhost&peerport=9000
  function peerOptions() {
    const q = new URLSearchParams(location.search);
    const o = { debug: 1 };
    if (q.get('peerhost')) {
      o.host = q.get('peerhost'); o.port = +(q.get('peerport') || 9000); o.path = q.get('peerpath') || '/'; o.secure = q.get('peersecure') === '1';
      o.config = { iceServers: [] };
    }
    return o;
  }

  const makeCode = () => Array.from({ length: 5 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join('');

  function available() { return typeof window.Peer === 'function'; }
  N.available = available;

  // ---------- HOST ----------
  N.host = function (onReady, onError, tries = 0) {
    if (!available()) { onError('The online part could not load.'); return; }
    const code = makeCode();
    const peer = new Peer(PREFIX + code, peerOptions());
    let opened = false;
    peer.on('open', () => {
      opened = true;
      N.role = 'host'; N.code = code; N.peer = peer;
      onReady(code);
    });
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        if (N.conns.size >= MAX_FRIENDS) { try { conn.send({ k: 'full' }); } catch (e) { /* gone */ } setTimeout(() => conn.close(), 500); return; }
        const pid = 'p' + N.nextPid++;
        conn.pid = pid;
        N.conns.set(pid, conn);
        conn.on('data', (msg) => { if (N.onMessage && msg && typeof msg === 'object') N.onMessage(msg, pid); });
        conn.on('close', () => { if (N.conns.get(pid) === conn) { N.conns.delete(pid); if (N.onLeave) N.onLeave(pid); } });
        conn.on('error', () => { /* close handles it */ });
      });
    });
    peer.on('disconnected', () => { if (!peer.destroyed) try { peer.reconnect(); } catch (e) { /* try later */ } });
    peer.on('error', (err) => {
      if (!opened && err.type === 'unavailable-id' && tries < 4) { peer.destroy(); N.host(onReady, onError, tries + 1); return; }
      if (!opened) { peer.destroy(); onError(explain(err)); }
      else console.warn('peer error', err.type);
    });
  };

  // ---------- FRIEND ----------
  N.join = function (code, onOpen, onError) {
    if (!available()) { onError('The online part could not load.'); return; }
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 5) { onError('The room code has 5 letters.'); return; }
    const peer = new Peer(undefined, peerOptions());
    let done = false;
    const fail = (why) => { if (done) return; done = true; try { peer.destroy(); } catch (e) { /* already */ } onError(why); };
    const timer = setTimeout(() => fail('Could not find that game. Check the code and your internet.'), 15000);
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
      conn.on('open', () => {
        clearTimeout(timer);
        done = true;
        N.role = 'client'; N.code = code; N.peer = peer; N.hostConn = conn;
        conn.on('data', (msg) => { if (N.onMessage && msg && typeof msg === 'object') N.onMessage(msg, 'h'); });
        conn.on('close', () => { if (N.role === 'client' && N.onClose) N.onClose('The host left the game.'); N.leave(); });
        onOpen();
      });
      conn.on('error', () => fail('Could not connect to that game.'));
    });
    peer.on('error', (err) => { clearTimeout(timer); if (!done) fail(explain(err)); else console.warn('peer error', err.type); });
  };

  function explain(err) {
    switch (err && err.type) {
      case 'peer-unavailable': return 'No game with that code. Is the host still playing?';
      case 'network': case 'server-error': case 'socket-error': case 'socket-closed': return 'Could not reach the online server. Check your internet.';
      case 'browser-incompatible': return 'This browser can\'t play online. Try Chrome, Edge or Firefox.';
      default: return 'Online error: ' + ((err && err.type) || 'unknown');
    }
  }

  // ---------- sending ----------
  N.send = function (msg) { // friend -> host
    if (N.hostConn && N.hostConn.open) try { N.hostConn.send(msg); } catch (e) { /* lost */ }
  };
  N.sendTo = function (pid, msg) { // host -> one friend
    const c = N.conns.get(pid);
    if (c && c.open) try { c.send(msg); } catch (e) { /* lost */ }
  };
  N.broadcast = function (msg, except) { // host -> every friend
    for (const [pid, c] of N.conns) if (pid !== except && c.open) try { c.send(msg); } catch (e) { /* lost */ }
  };
  N.kick = function (pid) { const c = N.conns.get(pid); if (c) { N.conns.delete(pid); try { c.close(); } catch (e) { /* ok */ } } };

  N.leave = function () {
    const p = N.peer;
    N.role = null; N.code = null; N.peer = null; N.hostConn = null;
    N.conns.clear();
    if (p) setTimeout(() => { try { p.destroy(); } catch (e) { /* ok */ } }, 200);
  };

  return N;
})();
