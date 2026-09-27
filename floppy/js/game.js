// ============================================================
//  FLOPPY PARTY — MAIN GAME
//  Title → Lobby (join, pick color and hat) → pick a mini-game
//  → rounds → results → back to the lobby.
// ============================================================
window.FP = window.FP || {};

FP.Game = (function () {
  const scene = FP.Stage.scene;
  const MAX_PLAYERS = 4;
  const MODES = () => [FP.Modes.arena, FP.Modes.soccer, FP.Modes.heist].filter(Boolean);
  const BOT_NAMES = ['Wobbles', 'Noodle', 'Biscuit', 'Pickle', 'Jellybean', 'Mr. Flop', 'Sprout', 'Bonkers'];

  let players = [];   // { id, name, colorIndex, hat, source, team, online }
  let chars = [];     // ragdolls in the world right now
  let state = 'title', mode = null, scores = {}, round = 0, timer = 0, count = 0, lastBanner = '';
  let paused = false, extraBots = [];
  let nextId = 1;
  const idle = { x: 0, z: 0 };

  // ------------------------------------------------------------
  //  PLAYERS
  // ------------------------------------------------------------
  function freeColor() {
    for (let i = 0; i < FP.Look.COLORS.length; i++) if (!players.some((p) => p.colorIndex === i)) return i;
    return 0;
  }
  function addPlayer(source, opts = {}) {
    if (players.length >= MAX_PLAYERS) return null;
    const colorIndex = opts.colorIndex !== undefined ? opts.colorIndex : freeColor();
    const isBot = source.kind === 'bot';
    const p = {
      id: opts.id || nextId++, source, colorIndex,
      hat: opts.hat || FP.Look.HATS[(players.length * 3 + 1) % (FP.Look.HATS.length - 1)],
      name: opts.name || (isBot ? botName() : `Player ${players.filter((q) => q.source.kind !== 'bot').length + 1}`),
    };
    players.push(p);
    if (state === 'lobby') { spawnInLobby(p); FP.Audio.play('voice'); refreshLobby(); }
    if (FP.Net) FP.Net.playersChanged();
    return p;
  }
  function botName() {
    const free = BOT_NAMES.filter((n) => !players.some((p) => p.name === n));
    return free[Math.floor(Math.random() * free.length)] || 'Bot';
  }
  function removePlayer(p) {
    players = players.filter((q) => q !== p);
    const c = chars.find((ch) => ch.player === p);
    if (c) { FP.Ragdoll.remove(c); chars = chars.filter((ch) => ch !== c); }
    refreshLobby();
    if (FP.Net) FP.Net.playersChanged();
  }
  function sameSource(a, b) { return a.kind === b.kind && a.map === b.map && a.index === b.index && a.peer === b.peer; }

  function makeChar(p, i, spot) {
    // every character needs its own collision group number
    const used = new Set(chars.map((ch) => ch.index));
    let idx = 0;
    while (used.has(idx)) idx++;
    const c = FP.Ragdoll.create(scene, { index: idx, colorIndex: p.colorIndex, hat: p.hat, name: p.name, x: spot.x, y: spot.y || 0, z: spot.z, yaw: spot.yaw || 0, isBot: p.source.kind === 'bot' });
    c.player = p;
    c.team = p.team;
    chars.push(c);
    return c;
  }
  function clearChars() { chars.forEach(FP.Ragdoll.remove); chars = []; }

  // ------------------------------------------------------------
  //  TITLE SCREEN (4 bots goofing around behind the menu)
  // ------------------------------------------------------------
  function buildLobbyIsland() {
    FP.Stage.clear();
    FP.Camera.fix(null);
    FP.Camera.setAngle(0.62, 0.9);
    FP.Stage.island(0, -1, 0, 18, 2, 12);
    FP.Stage.island(-6.5, 0, -4.5, 4, 4, 3);
    FP.Stage.island(6.5, -0.5, -4.5, 4, 3, 3);
    const trees = [[-8, -4.5, 1.1], [8, -4.8, 0.9], [-7.8, 4.4, 0.8], [7.6, 4.2, 1]];
    trees.forEach(([x, z, s]) => { const t = FP.Look.tree(s); t.position.set(x, x < 0 && z < 0 ? 1 : (x > 0 && z < 0 ? 0.5 : 0), z); FP.Stage.add(t); });
    const flowerColors = [0xff5a5f, 0xffcf33, 0xffffff, 0x9b6bff, 0xff8fc8];
    for (let i = 0; i < 40; i++) {
      const f = FP.Look.flower(flowerColors[i % flowerColors.length]);
      f.position.set((Math.random() - 0.5) * 17, 0, (Math.random() - 0.5) * 11);
      FP.Stage.add(f);
    }
    // a couple of things to push around
    for (let i = 0; i < 3; i++) {
      const size = 0.9;
      const m = FP.Look.boxMesh(size, size, size, FP.Look.toon([0xffcf33, 0x4aa8ff, 0xff8fc8][i]));
      const b = new CANNON.Body({ mass: 1.2, material: FP.Physics.mats.prop, collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.ALL });
      b.addShape(new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2)));
      b.position.set(-3 + i * 3, 1, -3.5);
      FP.Stage.prop(m, b);
    }
  }

  function titleScreen() {
    state = 'title';
    FP.Audio.setSong('party');
    FP.UI.setHud('');
    if (lobbyBar) lobbyBar.hidden = true;
    buildLobbyIsland();
    clearChars();
    for (let i = 0; i < 4; i++) {
      const fake = { id: -1 - i, name: BOT_NAMES[i], colorIndex: [0, 1, 3, 4][i], hat: ['party', 'crown', 'propeller', 'bunny'][i], source: { kind: 'bot' } };
      makeChar(fake, i, { x: -3 + i * 2, z: 1, yaw: 0 });
    }
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
    FP.UI.screen({
      cls: 'title',
      title: '<span class="logo">' + ['FLOPPY', 'PARTY'].map((w, k) => `<span class="word">${w.split('').map((ch, i) => `<b style="--i:${i + k * 6}">${ch}</b>`).join('')}</span>`).join('') + '</span>',
      html: 'Wobbly ragdoll mini-games for 1 to 4 players!',
      buttons: [
        { label: '🎉 Play on this computer', action: () => lobby() },
        { label: '🌍 Play online with friends', action: () => FP.Net ? FP.Net.menu() : FP.UI.toast('Online play is coming soon!') },
        { label: '❓ How to play', action: () => { FP.UI.help.hidden = false; }, small: true },
      ],
    });
  }

  // ------------------------------------------------------------
  //  LOBBY: join with your jump button, pick color and hat
  // ------------------------------------------------------------
  let lobbyBar = null;
  function lobby() {
    FP.UI.closeScreen();
    state = 'lobby';
    mode = null;
    FP.UI.setHud('');
    FP.Audio.setSong('party');
    buildLobbyIsland();
    clearChars();
    removeExtraBots();
    if (!players.some((p) => p.source.kind !== 'bot')) addPlayer({ kind: 'keys', map: 0 });
    players.forEach((p) => spawnInLobby(p));
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
    if (!lobbyBar) {
      lobbyBar = FP.UI.el('div', 'lobby');
      document.querySelector('.ui').append(lobbyBar);
    }
    lobbyBar.hidden = false;
    refreshLobby();
  }

  // ---- online friends (clients) build the same world the host has ----
  function clientLobby() {
    state = 'lobby';
    mode = null;
    FP.UI.closeScreen();
    FP.UI.setHud('');
    buildLobbyIsland();
    clearChars();
    players.forEach((p, i) => makeChar(p, i, { x: -4.5 + i * 3, z: 1.5, yaw: 0 }));
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
    if (!lobbyBar) { lobbyBar = FP.UI.el('div', 'lobby'); document.querySelector('.ui').append(lobbyBar); }
    lobbyBar.hidden = false;
    refreshLobby();
  }
  function clientRound(m) {
    state = 'client';
    mode = m;
    if (lobbyBar) lobbyBar.hidden = true;
    FP.Audio.setSong(m.song || 'party');
    FP.Stage.clear();
    FP.FX.clear();
    clearChars();
    FP.Camera.fix(null);
    m.build(players);
    players.forEach((p, i) => makeChar(p, i, m.spawn(i, players.length, p)));
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
  }

  function spawnInLobby(p) {
    const old = chars.find((c) => c.player === p);
    const i = players.indexOf(p);
    const spot = old ? { x: old.parts.torso.position.x, z: old.parts.torso.position.z, yaw: old.yaw } : { x: -4.5 + i * 3, z: 1.5, yaw: 0 };
    if (old) { FP.Ragdoll.remove(old); chars = chars.filter((c) => c !== old); }
    makeChar(p, i, spot);
  }

  function refreshLobby() {
    if (!lobbyBar || state !== 'lobby') return;
    const hex = FP.UI.hex;
    const cards = [];
    const client = FP.Net && FP.Net.isClient();
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const p = players[i];
      if (!p && client) { cards.push('<div class="pcard empty"><b>Empty</b><span>Waiting for friends...</span></div>'); continue; }
      if (!p) {
        cards.push(`<div class="pcard empty"><b>Empty</b><span>Player 2: press <kbd>/</kbd><br>Controller: press <kbd>A</kbd></span><button class="mini" data-act="bot">+ Add bot</button></div>`);
        continue;
      }
      const col = FP.Look.COLORS[p.colorIndex];
      const how = { keys: p.source.map === 0 ? 'Keyboard left' : 'Keyboard right', pad: 'Controller ' + (p.source.index + 1), bot: 'Bot 🤖', remote: 'Online 🌍', me: 'You! 🌍', host: 'At the host 🏠' }[p.source.kind] || 'Host';
      const keysHelp = p.source.kind === 'keys' ? (p.source.map === 0 ? '<kbd>Z</kbd> color <kbd>X</kbd> hat' : '<kbd>K</kbd> color <kbd>L</kbd> hat') : p.source.kind === 'pad' ? '<kbd>Back</kbd> color <kbd>Y</kbd> hat' : '';
      cards.push(`<div class="pcard" style="--c:${hex(col.body)};--l:${hex(col.light)}">
        <div class="swatch">${FP.UI.HAT_ICONS[p.hat]}</div>
        <b>${p.name}</b><span>${how}</span>
        <div class="row"><button class="mini" data-act="color" data-i="${i}">🎨 ${col.name}</button><button class="mini" data-act="hat" data-i="${i}">${FP.UI.HAT_ICONS[p.hat]} hat</button></div>
        <span class="keys">${keysHelp}</span>
        ${i > 0 && !client ? `<button class="x" data-act="remove" data-i="${i}" title="Remove">✕</button>` : ''}
      </div>`);
    }
    const online = FP.Net && FP.Net.status() ? `<div class="online">${FP.Net.status()}</div>` : '';
    lobbyBar.innerHTML = `${online}<div class="cards">${cards.join('')}</div>
      <div class="lobby-buttons"><button class="btn" data-act="back">${client ? '← Leave the party' : '← Title'}</button>${client ? '' : '<button class="btn go" data-act="start">▶ Choose a mini-game <kbd>Enter</kbd></button>'}</div>
      <p class="tip">Try it out: walk, jump, punch and grab each other on the island!</p>`;
    lobbyBar.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => lobbyAction(b.dataset.act, +b.dataset.i)));
  }

  function lobbyAction(act, i) {
    FP.Audio.play('select');
    const p = players[i];
    if (FP.Net && FP.Net.isClient() && (act === 'color' || act === 'hat')) { FP.Net.send({ t: act }); return; }
    if (act === 'bot') addPlayer({ kind: 'bot' });
    else if (act === 'color' && p) cycleColor(p);
    else if (act === 'hat' && p) cycleHat(p);
    else if (act === 'remove' && p) removePlayer(p);
    else if (act === 'start') chooseMode();
    else if (act === 'back') { if (FP.Net) FP.Net.leave(); titleScreen(); }
  }
  function cycleColor(p) {
    let c = p.colorIndex;
    for (let k = 0; k < FP.Look.COLORS.length; k++) { c = (c + 1) % FP.Look.COLORS.length; if (!players.some((q) => q !== p && q.colorIndex === c)) break; }
    p.colorIndex = c; spawnInLobby(p); refreshLobby();
    if (FP.Net) FP.Net.playersChanged();
  }
  function cycleHat(p) {
    p.hat = FP.Look.HATS[(FP.Look.HATS.indexOf(p.hat) + 1) % FP.Look.HATS.length];
    spawnInLobby(p); refreshLobby();
    if (FP.Net) FP.Net.playersChanged();
  }

  // someone pressed jump on a keyboard side or controller that isn't playing yet → they join!
  function lobbyJoins() {
    const sources = [{ kind: 'keys', map: 0 }, { kind: 'keys', map: 1 }];
    FP.Input.getPads().forEach((gp, i) => { if (gp) sources.push({ kind: 'pad', index: i }); });
    for (const src of sources) {
      const input = FP.Input.read(src, 'join-' + src.kind + (src.map ?? src.index));
      const p = players.find((q) => sameSource(q.source, src));
      if (!p && input.jumpPressed && !FP.UI.open()) addPlayer(src);
      if (p && input.colorPressed) cycleColor(p);
      if (p && input.hatPressed) cycleHat(p);
      if (p && input.startPressed) chooseMode();
    }
  }

  // ------------------------------------------------------------
  //  PICK A MINI-GAME
  // ------------------------------------------------------------
  function chooseMode() {
    if (state !== 'lobby') return;
    if (FP.Net && FP.Net.isClient()) { FP.UI.toast('The host picks the mini-game!'); return; }
    state = 'select';
    lobbyBar.hidden = true;
    FP.UI.screen({
      cls: 'modes',
      title: 'Pick a mini-game',
      buttons: [
        ...MODES().map((m) => ({ label: `<span class="icon">${m.icon}</span><b>${m.name}</b><small>${m.desc}</small>`, action: () => startMatch(m) })),
        { label: '← Back', action: backToLobby, small: true },
      ],
      back: backToLobby,
    });
  }
  function backToLobby() { FP.UI.closeScreen(); state = 'lobby'; lobbyBar.hidden = false; refreshLobby(); }

  // ------------------------------------------------------------
  //  MATCHES AND ROUNDS
  // ------------------------------------------------------------
  function removeExtraBots() { players = players.filter((p) => !extraBots.includes(p)); extraBots = []; }

  function startMatch(m) {
    FP.UI.closeScreen();
    if (lobbyBar) lobbyBar.hidden = true;
    mode = m;
    removeExtraBots();
    // some games need more players: fill with bots
    while (players.length < (m.minPlayers || 2)) {
      const b = addPlayer({ kind: 'bot' });
      if (!b) break;
      extraBots.push(b);
    }
    // teams: alternate
    players.forEach((p, i) => { p.team = m.teams ? i % 2 : undefined; });
    scores = {};
    players.forEach((p) => { scores[p.id] = 0; });
    if (m.teams) scores = { team0: 0, team1: 0 };
    round = 0;
    FP.Audio.setSong(m.song || 'party');
    if (FP.Net) FP.Net.matchStarted(m.id);
    startRound();
  }

  function startRound() {
    round++;
    FP.Stage.clear();
    FP.FX.clear();
    clearChars();
    FP.Bots.reset();
    FP.Camera.fix(null);
    mode.build(players);
    players.forEach((p, i) => makeChar(p, i, mode.spawn(i, players.length, p)));
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
    state = 'countdown';
    count = 3.99;
    lastBanner = '';
    const title = mode.roundsToWin > 1 ? `Round ${round}` : mode.name;
    FP.UI.big(title, 1.2, mode.desc);
    timer = 0;
    if (FP.Net) FP.Net.roundStarted();
  }

  // a character fell off or is out
  function eliminate(c) {
    if (!c.alive) return;
    c.alive = false;
    FP.Audio.play('fall');
    FP.UI.toast(`${c.name} is out! 💫`);
    if (c.lastHitBy && c.lastHitBy !== c && performance.now() - c.lastHitTime < 6000) FP.UI.toast(`${c.lastHitBy.name} knocked out ${c.name}! 💥`);
    FP.FX.puffs(c.parts.torso.position, 12, 0xffffff, 4, 1.5);
  }

  function endRound(res) {
    state = 'roundOver';
    timer = 0;
    let text = 'Nobody wins!', center = new THREE.Vector3();
    if (mode.teams && res.team !== undefined) {
      scores['team' + res.team] += res.points ?? 1;
      text = `${res.team === 0 ? 'Red' : 'Blue'} team wins!`;
    } else if (res.winners && res.winners.length) {
      res.winners.forEach((c) => { scores[c.player.id] = (scores[c.player.id] || 0) + 1; c.expression = 'smile'; });
      text = res.winners.length === 1 ? `${res.winners[0].name} wins${mode.roundsToWin > 1 ? ' the round' : ''}!` : 'Winners!';
      center.copy(res.winners[0].parts.torso.position);
    }
    if (res.text) text = res.text;
    FP.UI.big(text, 2.8, res.sub || '');
    FP.FX.confetti(center);
    FP.Audio.play('win');
    FP.Audio.play('cheer');
    if (FP.Net) FP.Net.banner(text, res.sub || '');
  }

  function matchOver() {
    if (mode.single) return true;
    if (mode.teams) return scores.team0 >= mode.roundsToWin || scores.team1 >= mode.roundsToWin || mode.roundsToWin === 1;
    return Object.values(scores).some((s) => s >= mode.roundsToWin);
  }

  function results() {
    state = 'results';
    FP.UI.setHud('');
    let html;
    if (mode.teams) {
      const t0 = scores.team0, t1 = scores.team1;
      const win = t0 === t1 ? 'It\'s a tie!' : (t0 > t1 ? '🔴 Red team wins!' : '🔵 Blue team wins!');
      html = `<div class="final"><div class="team t0">🔴 Red<b>${t0}</b></div><div class="team t1">🔵 Blue<b>${t1}</b></div></div><p class="winner">${win}</p>` +
        `<div class="podium">${players.map((p) => FP.UI.playerPill(p, p.team === 0 ? ' 🔴' : ' 🔵')).join('')}</div>`;
    } else {
      const sorted = players.slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
      const label = (s) => (mode.scoreLabel ? mode.scoreLabel(s) : s);
      html = `<div class="podium big">${sorted.map((p, i) => `<div class="place p${i}">${['🥇', '🥈', '🥉', '🎈'][i]} ${FP.UI.playerPill(p)} <b>${label(scores[p.id] || 0)}</b></div>`).join('')}</div>`;
      if (mode.id === 'heist') html = `<p class="winner">${mode.resultText ? mode.resultText() : ''}</p>` + html;
    }
    FP.UI.screen({
      title: `${mode.icon} ${mode.name}: results`,
      html,
      buttons: [
        { label: '↺ Play again', action: () => startMatch(mode) },
        { label: '🎲 Another mini-game', action: () => { lobby(); chooseMode(); } },
        { label: '🏝️ Back to the lobby', action: () => lobby(), small: true },
      ],
    });
    if (FP.Net) FP.Net.results(html);
  }

  function hudHtml() {
    if (!mode) return '';
    const extra = mode.hud ? mode.hud() : '';
    let pills;
    if (mode.teams) {
      pills = `<span class="pill team0">🔴 ${scores.team0}</span><span class="pill team1">🔵 ${scores.team1}</span>`;
    } else {
      pills = players.map((p) => {
        const c = chars.find((ch) => ch.player === p);
        const crowns = mode.scoreLabel ? mode.scoreLabel(scores[p.id] || 0) : '👑'.repeat(scores[p.id] || 0);
        return FP.UI.playerPill(p, ` ${crowns}${c && !c.alive ? ' 💫' : ''}`);
      }).join('');
    }
    return `<div class="modename">${mode.icon} ${mode.name}${mode.roundsToWin > 1 ? ` · first to ${mode.roundsToWin}` : ''}</div><div class="pills">${pills}</div>${extra ? `<div class="extra">${extra}</div>` : ''}`;
  }

  // ------------------------------------------------------------
  //  PAUSE
  // ------------------------------------------------------------
  function pause() {
    if (!['countdown', 'play', 'roundOver'].includes(state) || paused) return;
    paused = true;
    FP.UI.screen({
      title: 'Paused',
      buttons: [
        { label: '▶ Keep playing', action: resume },
        { label: '↺ Restart this game', action: () => { paused = false; FP.UI.closeScreen(); startMatch(mode); } },
        { label: '🏝️ Back to the lobby', action: () => { paused = false; lobby(); } },
      ],
      back: resume,
    });
  }
  function resume() { paused = false; FP.UI.closeScreen(); }
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Escape' || e.code === 'KeyP') && !FP.UI.open()) pause();
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && state === 'lobby' && !FP.UI.open()) chooseMode();
  });

  // ------------------------------------------------------------
  //  THE LOOP
  // ------------------------------------------------------------
  function inputFor(c) {
    const p = c.player;
    if (!p) return idle;
    const src = p.source;
    const canMove = state === 'play' || state === 'lobby' || state === 'roundOver' || state === 'title' || state === 'select';
    if (src.kind === 'bot') return canMove && state !== 'select' ? FP.Bots.think(c, chars, FP.Physics.STEP, state === 'play' ? mode : null) : idle;
    if (!canMove || paused) return idle;
    if (src.kind === 'remote') return FP.Net ? FP.Net.inputOf(p.id) : idle;
    return FP.Input.read(src, p.id);
  }

  let acc = 0;
  function update(dt) {
    FP.UI.update(dt);
    if (FP.Net) FP.Net.update(dt);
    if (FP.Net && FP.Net.isClient()) { FP.Net.clientFrame(dt); return; }
    if (paused) return;
    if (state === 'lobby') lobbyJoins();

    // physics runs in fixed little steps (60 per second)
    acc += dt;
    let steps = 0;
    while (acc >= FP.Physics.STEP && steps < 4) {
      for (const c of chars) FP.Ragdoll.control(c, inputFor(c), FP.Physics.STEP);
      if (mode && mode.beforeStep && (state === 'play' || state === 'roundOver')) mode.beforeStep(FP.Physics.STEP, chars);
      FP.Physics.step();
      acc -= FP.Physics.STEP;
      steps++;
    }
    if (steps === 4) acc = 0;

    // fell off the lobby island? pop back on
    if (state === 'lobby' || state === 'title' || state === 'select') {
      for (const c of chars) if (c.parts.torso.position.y < -12) { FP.Ragdoll.teleport(c, (Math.random() - 0.5) * 6, 2, 0); FP.FX.puffs(c.parts.torso.position, 10, 0xffffff, 3); }
    }

    if (state === 'countdown') {
      const before = Math.ceil(count);
      count -= dt;
      const now = Math.ceil(count);
      if (now !== before && now <= 3 && now >= 1) { FP.UI.big(String(now), 0.9); FP.Audio.play('beep'); }
      if (count <= 0) { state = 'play'; FP.UI.big('GO!', 0.8); FP.Audio.play('go'); if (FP.Net) FP.Net.banner('GO!', ''); }
    } else if (state === 'play') {
      timer += dt;
      const res = mode.update(dt, chars, api);
      if (res) endRound(res);
    } else if (state === 'roundOver') {
      timer += dt;
      if (mode.update) mode.update(dt, chars, api, true);
      if (timer > 3.2) { if (matchOver()) results(); else startRound(); }
    }

    for (const c of chars) FP.Ragdoll.sync(c, dt);
    if (['countdown', 'play', 'roundOver'].includes(state)) FP.UI.setHud(hudHtml());
    FP.FX.update(dt);
    FP.Stage.update(dt, timer, FP.Camera.target);
    const focus = chars.filter((c) => c.alive && c.parts.torso.position.y > -4).map(FP.Ragdoll.center);
    FP.Camera.update(focus.length ? focus : chars.map(FP.Ragdoll.center), dt, mode && state !== 'lobby' ? (mode.minZoom || 12) : 11);
    if (FP.Net) FP.Net.hostFrame(dt);
  }

  const api = {
    get players() { return players; }, set players(v) { players = v; },
    get chars() { return chars; }, get state() { return state; }, get mode() { return mode; }, get scores() { return scores; },
    MODES, addPlayer, removePlayer, eliminate, lobby, titleScreen, startMatch, chooseMode, refreshLobby, hudHtml, update,
    clientLobby, clientRound, cycle: (p, what) => (what === 'color' ? cycleColor(p) : cycleHat(p)),
    manual: false,
    step(seconds) { for (let i = 0; i < Math.round(seconds * 60); i++) update(1 / 60); },
  };

  FP.Input.init();
  window.addEventListener('resize', () => { FP.Stage.resize(); FP.Camera.resize(); });
  setTimeout(titleScreen, 0);
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!api.manual) update(dt);
    FP.Stage.render(FP.Camera.camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return api;
})();
