// ============================================================
//  FLOPPY PARTY — MAIN GAME
//  Title, then the Lobby (players join and pick color and hat),
//  then pick a mini-game and how many bots, then rounds,
//  results, and back to the lobby.
// ============================================================
window.FP = window.FP || {};

FP.Game = (function () {
  const scene = FP.Stage.scene;
  const MAX_PLAYERS = 4;
  const MODE_ORDER = ['arena', 'soccer', 'heist', 'bomb', 'hill', 'lava', 'tiles', 'color', 'sweeper', 'coins', 'dodge', 'paint', 'crown', 'race', 'balloons', 'seats', 'zombie', 'boulder', 'kart', 'sumo', 'bowling', 'hoops', 'meteor', 'conveyor', 'wall', 'simon', 'moles', 'chickens', 'golf', 'bumpers', 'fruit', 'tug', 'volley', 'hurdles', 'penalty', 'hockey', 'snowball', 'boxing', 'skydive', 'cooking', 'hideseek', 'water', 'custom'];
  const MODES = () => MODE_ORDER.map((id) => FP.Modes[id]).filter(Boolean);
  const BOT_NAMES = ['Wobbles', 'Noodle', 'Biscuit', 'Pickle', 'Jellybean', 'Mr. Flop', 'Sprout', 'Bonkers'];
  const ICON = FP.UI.ICON;
  const esc = FP.UI.escapeHtml;

  let players = [];     // the people playing: { id, name, colorIndex, hat, source, team }
  let matchBots = [];   // bots added just for the current match
  let chars = [];       // ragdolls in the world right now
  let state = 'title', mode = null, scores = {}, round = 0, timer = 0, count = 0;
  let paused = false, botCount = {}, nextId = 1, lobbyPanel = null, outTimers = [];
  let botSkill = 'normal'; // how good the bots are: easy, normal or hard
  const VERSION = '1.0';
  let tour = null;          // Party Tour: { games: [mode ids], index, points: { playerId: n }, bots, awarded }
  let tourOpts = { games: 5, bots: null, list: false };
  let playlist = [];         // your own list of games for a Party Tour (saved on this computer)
  try { playlist = JSON.parse(localStorage.getItem('floppy-playlist') || '[]'); } catch (e) { /* no saving */ }
  let daily = null;          // the Daily Challenge being played right now
  let replayBuf = [], replay = null, replayPending = false; // the slow-motion replay of the last moment of a round
  let photo = null, photoShot = false; // photo mode
  try { botSkill = FP.Bots.SKILLS[localStorage.getItem('floppy-skill')] ? localStorage.getItem('floppy-skill') : 'normal'; } catch (e) { /* no saving */ }
  const idle = { x: 0, z: 0 };

  // ------------------------------------------------------------
  //  PLAYERS
  // ------------------------------------------------------------
  const humans = () => players.filter((p) => p.source.kind !== 'bot');
  const everyone = () => players.concat(matchBots);

  function freeColor(list = everyone()) {
    for (let i = 0; i < FP.Look.COLORS.length; i++) if (!list.some((p) => p.colorIndex === i)) return i;
    return 0;
  }
  function nextPlayerName() {
    for (let n = 1; n <= 8; n++) if (!players.some((p) => p.name === `Player ${n}`)) return `Player ${n}`;
    return 'Player';
  }

  function addPlayer(source, opts = {}) {
    if (players.length >= MAX_PLAYERS) return null;
    const p = {
      id: opts.id || nextId++, source,
      colorIndex: opts.colorIndex !== undefined ? opts.colorIndex : freeColor(),
      hat: opts.hat || FP.Look.FREE_HATS[(players.length * 3 + 1) % FP.Look.FREE_HATS.length],
      outfit: opts.outfit || FP.Look.FREE_OUTFITS[(players.length + 1) % FP.Look.FREE_OUTFITS.length],
      face: opts.face || 'none', dance: opts.dance || 'none', trail: opts.trail || 'none',
      name: opts.name || nextPlayerName(),
    };
    players.push(p);
    if (state === 'lobby') { spawnInLobby(p); FP.Audio.play('voice'); refreshLobby(); }
    if (FP.Net) FP.Net.playersChanged();
    return p;
  }
  function removePlayer(p) {
    players = players.filter((q) => q !== p);
    const c = chars.find((ch) => ch.player === p);
    if (c) { FP.Ragdoll.remove(c); chars = chars.filter((ch) => ch !== c); }
    refreshLobby();
    if (FP.Net) FP.Net.playersChanged();
  }
  function sameSource(a, b) { return a.kind === b.kind && a.map === b.map && a.index === b.index && a.peer === b.peer; }

  function makeBots(n) {
    matchBots = [];
    const used = new Set(players.map((p) => p.name));
    for (let i = 0; i < n; i++) {
      const names = BOT_NAMES.filter((nm) => !used.has(nm));
      const name = names[Math.floor(Math.random() * names.length)] || `Bot ${i + 1}`;
      used.add(name);
      // bots dress up too (but never in World Tour prizes: those are special)
      const pick = (list) => list[Math.floor(Math.random() * list.length)];
      const notPrize = (x) => !FP.Style.TOUR_ONLY.includes(x);
      matchBots.push({
        id: nextId++, source: { kind: 'bot' }, name, colorIndex: freeColor(),
        hat: pick(FP.Look.HATS.filter((h) => h !== 'none' && !FP.Look.TOUR_HATS.includes(h))),
        outfit: pick(FP.Look.OUTFITS.filter((o) => !FP.Look.TOUR_OUTFITS.includes(o))),
        face: Math.random() < 0.3 ? pick(FP.Style.FACES.filter((f) => f !== 'none' && notPrize(f))) : 'none',
        dance: pick(FP.Style.DANCES.filter(notPrize)), trail: 'none',
      });
    }
  }

  function makeChar(p, spot) {
    // every character needs its own collision group number
    const used = new Set(FP.Ragdoll.all.map((ch) => ch.index));
    let idx = 0;
    while (used.has(idx)) idx++;
    const c = FP.Ragdoll.create(scene, { index: idx, colorIndex: p.colorIndex, hat: p.hat, outfit: p.outfit, name: p.name, x: spot.x, y: spot.y || 0, z: spot.z, yaw: spot.yaw || 0, isBot: p.source.kind === 'bot' });
    c.player = p;
    c.team = p.team;
    if (p.face && p.face !== 'none') FP.Style.applyFace(c, p.face);
    if (c.isBot) c.botSkill = botSkill;
    chars.push(c);
    return c;
  }
  function clearChars() { chars.forEach(FP.Ragdoll.remove); chars = []; }

  // ------------------------------------------------------------
  //  THE ISLAND (for the title screen and the lobby)
  // ------------------------------------------------------------
  function buildLobbyIsland() {
    FP.Stage.clear();
    FP.FX.clear();
    FP.Camera.fix(null);
    FP.Camera.setAngle(0.62, 0.9);
    FP.Stage.island(0, -1, 0, 18, 2, 12);
    FP.Stage.island(-6.5, 0, -4.5, 4, 4, 3);
    FP.Stage.island(6.5, -0.5, -4.5, 4, 3, 3);
    const trees = [[-8, 1, -4.5, 1.1], [8, 0.5, -4.8, 0.9], [-7.8, 0, 4.4, 0.8], [7.6, 0, 4.2, 1]];
    trees.forEach(([x, y, z, s]) => { const t = FP.Look.tree(s); t.position.set(x, y, z); FP.Stage.add(t); });
    const flowerColors = [0xff5a5f, 0xffcf33, 0xffffff, 0x9b6bff, 0xff8fc8];
    for (let i = 0; i < 40; i++) {
      const f = FP.Look.flower(flowerColors[i % flowerColors.length]);
      f.position.set(-8.5 + ((i * 7.3) % 17), 0, -5.5 + ((i * 3.7) % 11)); // same spots every time
      FP.Stage.add(f);
    }
    for (let i = 0; i < 3; i++) {
      const size = 0.9;
      const m = FP.Look.boxMesh(size, size, size, FP.Look.toon([0xffcf33, 0x4aa8ff, 0xff8fc8][i]));
      const b = new CANNON.Body({ mass: 1.2, material: FP.Physics.mats.prop, collisionFilterGroup: FP.Physics.GROUP.PROP, collisionFilterMask: FP.Physics.ALL });
      b.addShape(new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2)));
      b.position.set(-3 + i * 3, 1, -3.5);
      FP.Stage.prop(m, b);
    }
  }

  // ------------------------------------------------------------
  //  TITLE SCREEN (4 bots goofing around behind the menu)
  // ------------------------------------------------------------
  function titleScreen() {
    const splash = document.getElementById('splash');
    if (splash && !splash.classList.contains('gone')) { splash.classList.add('gone'); setTimeout(() => splash.remove(), 600); }
    endDaily();
    endStory();
    state = 'title';
    paused = false;
    mode = null;
    matchBots = [];
    FP.Audio.setSong('menu');
    FP.UI.setHud('');
    FP.UI.help.hidden = true;
    if (lobbyPanel) lobbyPanel.hidden = true;
    FP.Camera.setLift(0);
    buildLobbyIsland();
    clearChars();
    for (let i = 0; i < 4; i++) {
      const fake = { id: -1 - i, name: BOT_NAMES[i], colorIndex: [0, 1, 3, 4][i], hat: ['party', 'crown', 'propeller', 'bunny'][i], outfit: ['overalls', 'cape', 'bowtie', 'scarf'][i], source: { kind: 'bot' } };
      makeChar(fake, { x: -3 + i * 2, z: 1, yaw: 0 });
    }
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
    FP.UI.screen({
      cls: 'title',
      title: '<span class="logo">' + ['FLOPPY', 'PARTY'].map((w, k) => `<span class="word">${w.split('').map((ch, i) => `<b style="--i:${i + k * 6}">${ch}</b>`).join('')}</span>`).join('') + '</span>',
      html: 'Wobbly ragdoll mini-games for 1 to 4 players',
      buttons: [
        { label: `${ICON.people} Play on this computer`, action: () => lobby() },
        { label: `${ICON.online} Play online with friends`, action: () => FP.Net.menu() },
        { label: `${ICON.flag} Story Mode: World Tour`, action: () => storyMap(), cls: 'story-btn' },
        { label: `${ICON.star} Daily Challenge${dailyDone() ? ' (done!)' : ''}`, action: dailyScreen, cls: 'daily-btn' },
        { label: `${ICON.crown} Shop`, action: () => FP.Profile.shopScreen(titleScreen), small: true },
        { label: `${ICON.trophy} Achievements`, action: () => FP.Profile.achievementsScreen(titleScreen), small: true },
        { label: `${ICON.grid} Level Editor`, action: () => editor(), small: true },
        { label: `${ICON.grid} Settings`, action: () => FP.Settings.screen(titleScreen), small: true },
        { label: `${ICON.help} How to play`, action: () => { FP.UI.help.hidden = false; }, small: true },
        { label: `${ICON.star} Credits`, action: credits, small: true },
      ],
    });
    const card = document.querySelector('.screen.title .card');
    if (card) card.insertAdjacentHTML('beforeend', `<p class="title-coins">${FP.Profile.coinLine()}</p>`);
  }

  // ------------------------------------------------------------
  //  LEVEL EDITOR (build your own arenas; the editor is in editor.js)
  // ------------------------------------------------------------
  function editor() {
    const fromGame = players.length > 0 && state !== 'title';
    endDaily(); endStory(); tour = null;
    FP.UI.closeScreen();
    FP.UI.help.hidden = true;
    if (lobbyPanel) lobbyPanel.hidden = true;
    if (FP.Net && (FP.Net.isHost() || FP.Net.isClient())) { FP.UI.toast('The Level Editor works when you are not online'); if (fromGame) lobby(); else titleScreen(); return; }
    state = 'editor';
    paused = false;
    mode = null;
    FP.UI.setHud('');
    FP.Audio.setSong('menu');
    clearChars();
    FP.Camera.setLift(0);
    FP.Editor.open({
      back: () => (fromGame ? lobby() : titleScreen()),
      play: () => { lobby(); FP.UI.closeScreen(); state = 'select'; if (lobbyPanel) lobbyPanel.hidden = true; setupMatch(FP.Modes.custom); },
    });
  }

  function credits() {
    FP.UI.screen({
      cls: 'credits',
      title: 'Credits',
      html: `<div class="credit-list">
        <p><small>Game director and ideas</small><b>Emil</b></p>
        <p><small>Programming, art and music</small><b>Emil and Claude</b></p>
        <p><small>Made with</small><b>three.js, cannon-es and PeerJS</b></p>
        <p><small>All sounds and music</small><b>made with code</b></p>
      </div><p class="small">Thanks for playing Floppy Party!</p><p class="small version">Version ${VERSION}</p>`,
      buttons: [{ label: `${ICON.back} Back`, action: titleScreen }],
      back: titleScreen,
    });
  }

  // ------------------------------------------------------------
  //  LOBBY
  // ------------------------------------------------------------
  function showLobbyPanel() {
    if (!lobbyPanel) { lobbyPanel = FP.UI.el('div', 'lobby'); FP.UI.root.append(lobbyPanel); }
    lobbyPanel.hidden = false;
  }

  function lobby() {
    endDaily();
    endStory();
    tour = null;
    FP.UI.closeScreen();
    FP.UI.help.hidden = true;
    state = 'lobby';
    paused = false;
    mode = null;
    matchBots = [];
    players = players.filter((p) => p.source.kind !== 'bot');
    players.forEach((p) => { p.team = undefined; });
    FP.UI.setHud('');
    FP.Audio.setSong('party');
    FP.Camera.setLift(1.6);
    buildLobbyIsland();
    clearChars();
    // Player 1 uses whatever picked "Play on this computer": the keyboard, a controller or the touch screen
    const dev = FP.UI.lastDevice();
    if (!players.length) players.push({ id: nextId++, source: FP.Touch.available && dev.kind !== 'pad' ? { kind: 'touch' } : { ...dev }, colorIndex: 0, hat: 'party', outfit: 'overalls', name: 'Player 1' });
    players.forEach((p) => spawnInLobby(p));
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
    showLobbyPanel();
    refreshLobby();
    if (FP.Net) FP.Net.playersChanged();
  }

  // online friends build the same lobby the host has
  function clientLobby() {
    state = 'lobby';
    mode = null;
    FP.UI.closeScreen();
    FP.UI.setHud('');
    FP.Camera.setLift(1.6);
    buildLobbyIsland();
    clearChars();
    players.forEach((p, i) => makeChar(p, { x: -4.5 + i * 3, z: 1.5, yaw: 0 }));
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
    showLobbyPanel();
    refreshLobby();
  }
  function clientRound(m) {
    state = 'client';
    mode = m;
    if (lobbyPanel) lobbyPanel.hidden = true;
    FP.Camera.setLift(0);
    FP.Audio.setSong(m.song || 'party');
    FP.Stage.clear();
    FP.FX.clear();
    clearChars();
    FP.Camera.fix(null);
    m.build(players);
    players.forEach((p, i) => makeChar(p, m.spawn(i, players.length, p)));
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
  }

  // put a player's character on the island (or rebuild it after a color or hat change, in the same spot)
  function spawnInLobby(p) {
    const old = chars.find((c) => c.player === p);
    const i = players.indexOf(p);
    let spot = { x: -4.5 + i * 3, y: 0, z: 1.5, yaw: 0 };
    if (old) {
      const t = old.parts.torso.position;
      const ok = old.alive && t.y > -2 && t.y < 6 && old.ko <= 0;
      if (ok) spot = { x: t.x, y: Math.max(0, t.y - FP.Ragdoll.STAND) + 0.1, z: t.z, yaw: old.yaw };
      FP.Ragdoll.remove(old);
      chars = chars.filter((c) => c !== old);
    }
    makeChar(p, spot);
  }

  function controlsText(p) {
    const k = p.source.kind;
    if (k === 'keys') return p.source.map === 0 ? 'Keyboard: W A S D' : 'Keyboard: arrows';
    if (k === 'pad') return `Controller ${p.source.index + 1}`;
    if (k === 'touch') return 'Touch screen';
    if (k === 'remote') return 'Online';
    if (k === 'me') return 'You (online)';
    if (k === 'host') return 'Host computer';
    return '';
  }
  function colorKeys(p) {
    const k = p.source.kind;
    if (k === 'keys') return p.source.map === 0 ? '<kbd>Z</kbd> color <kbd>X</kbd> hat <kbd>C</kbd> outfit' : '<kbd>K</kbd> color <kbd>L</kbd> hat <kbd>J</kbd> outfit';
    if (k === 'pad') return '<kbd>Back</kbd> color <kbd>Y</kbd> hat';
    if (k === 'touch') return 'Tap the arrows to change';
    if (k === 'me') return '<kbd>Z</kbd> color <kbd>X</kbd> hat <kbd>C</kbd> outfit';
    return '&nbsp;';
  }

  function refreshLobby() {
    if (!lobbyPanel || state !== 'lobby') return;
    const hex = FP.UI.hex;
    const client = FP.Net && FP.Net.isClient();
    const slots = [];
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const p = players[i];
      if (!p) {
        const taken = (src) => players.some((q) => sameSource(q.source, src));
        const hints = client ? 'Waiting for a friend to join' : [
          !taken({ kind: 'keys', map: 0 }) ? 'Keyboard left: press <kbd>Space</kbd>' : '',
          !taken({ kind: 'keys', map: 1 }) ? 'Keyboard right: press <kbd>/</kbd>' : '',
          'Controller: press <kbd>A</kbd>',
        ].filter(Boolean).join('<br>');
        slots.push(`<div class="slot empty"><div class="slot-num">P${i + 1}</div><div class="slot-join">Join the party<small>${hints}</small></div></div>`);
        continue;
      }
      const col = FP.Look.COLORS[p.colorIndex];
      const mine = !client || p.source.kind === 'me';
      const arrows = (act) => (mine ? [`<button class="arrow" data-act="${act}" data-dir="-1" data-i="${i}" title="Previous">${ICON.left}</button>`, `<button class="arrow" data-act="${act}" data-dir="1" data-i="${i}" title="Next">${ICON.right}</button>`] : ['', '']);
      const [cl, cr] = arrows('color'), [hl, hr] = arrows('hat'), [ol, or] = arrows('outfit');
      const [fl, fr] = arrows('face'), [dl, dr] = arrows('dance'), [tl, tr] = arrows('trail');
      slots.push(`<div class="slot" style="--c:${hex(col.body)};--l:${hex(col.light)}">
        <div class="slot-head"><span class="slot-num">P${i + 1}</span><b>${esc(p.name)}</b>${i > 0 && !client ? `<button class="leave" data-act="remove" data-i="${i}" title="Remove this player">Leave</button>` : ''}</div>
        <div class="slot-row"><span class="lbl">Color</span>${cl}<span class="val"><i class="dot"></i>${col.name}</span>${cr}</div>
        <div class="slot-row"><span class="lbl">Hat</span>${hl}<span class="val">${FP.UI.HAT_NAMES[p.hat]}</span>${hr}</div>
        <div class="slot-row"><span class="lbl">Outfit</span>${ol}<span class="val">${FP.Look.OUTFIT_NAMES[p.outfit || 'none']}</span>${or}</div>
        <div class="slot-row"><span class="lbl">Face</span>${fl}<span class="val">${FP.Style.FACE_NAMES[p.face || 'none']}</span>${fr}</div>
        <div class="slot-row"><span class="lbl">Dance</span>${dl}<span class="val">${FP.Style.DANCE_NAMES[p.dance || 'none']}</span>${dr}</div>
        <div class="slot-row"><span class="lbl">Trail</span>${tl}<span class="val">${FP.Style.TRAIL_NAMES[p.trail || 'none']}</span>${tr}</div>
        <div class="slot-foot">${controlsText(p)}<br><span class="keys">${colorKeys(p)}</span></div>
      </div>`);
    }
    const online = FP.Net && FP.Net.status() ? `<div class="online">${FP.Net.status()}</div>` : '';
    lobbyPanel.innerHTML = `
      <div class="lobby-top"><h2>Lobby</h2><p>${client ? 'The host picks the mini-game. Walk around and goof off while you wait!' : 'Walk around, punch and grab each other while everyone joins.'}</p>${online}</div>
      <div class="slots">${slots.join('')}</div>
      <div class="lobby-actions">
        <button class="btn" data-act="back">${ICON.back} ${client ? 'Leave the party' : 'Title'}</button>
        ${client ? '' : `<button class="btn" data-act="shop">${ICON.crown} Shop</button><button class="btn go" data-act="start">${ICON.play} Pick a mini-game <kbd>Enter</kbd></button>`}
      </div>
      ${client ? '' : `<div class="lobby-coins">${FP.Profile.coinLine()}</div>`}`;
    lobbyPanel.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => lobbyAction(b.dataset.act, +b.dataset.i, +b.dataset.dir || 1)));
  }

  function lobbyAction(act, i, dir) {
    FP.Audio.play('select');
    const p = players[i];
    if (FP.Net && FP.Net.isClient()) {
      if (STYLE_ACTS.includes(act)) FP.Net.send({ t: act, dir });
      else if (act === 'back') { FP.Net.leave(); titleScreen(); }
      return;
    }
    if (act === 'color' && p) cycleColor(p, dir);
    else if (act === 'hat' && p) cycleHat(p, dir);
    else if (act === 'outfit' && p) cycleOutfit(p, dir);
    else if ((act === 'face' || act === 'dance' || act === 'trail') && p) cycleStyle(p, act, dir);
    else if (act === 'remove' && p) removePlayer(p);
    else if (act === 'start') chooseMode();
    else if (act === 'shop') { lobbyPanel.hidden = true; FP.Profile.shopScreen(() => { FP.UI.closeScreen(); showLobbyPanel(); refreshLobby(); }); }
    else if (act === 'back') { if (FP.Net) FP.Net.leave(); titleScreen(); }
  }
  function cycleColor(p, dir = 1) {
    const n = FP.Look.COLORS.length;
    let c = p.colorIndex;
    for (let k = 0; k < n; k++) { c = (c + dir + n) % n; if (!players.some((q) => q !== p && q.colorIndex === c)) break; }
    if (c === p.colorIndex) return;
    p.colorIndex = c; spawnInLobby(p); refreshLobby();
    if (FP.Net) FP.Net.playersChanged();
  }
  function cycleHat(p, dir = 1) {
    // only hats you have (the others are in the Shop)
    const H = FP.Look.HATS, n = H.length;
    let i = H.indexOf(p.hat);
    for (let k = 0; k < n; k++) { i = (i + dir + n) % n; if (FP.Profile.owns(H[i])) break; }
    p.hat = H[i];
    spawnInLobby(p); refreshLobby();
    if (FP.Net) FP.Net.playersChanged();
  }

  function cycleOutfit(p, dir = 1) {
    // only outfits you have (the others are in the Shop)
    const O = FP.Look.OUTFITS, n = O.length;
    let i = Math.max(0, O.indexOf(p.outfit || 'none'));
    for (let k = 0; k < n; k++) { i = (i + dir + n) % n; if (FP.Profile.owns('outfit', O[i])) break; }
    p.outfit = O[i];
    spawnInLobby(p); refreshLobby();
    if (FP.Net) FP.Net.playersChanged();
  }
  // face paint, victory dance and trail (only the ones you have)
  const STYLE_ACTS = ['color', 'hat', 'outfit', 'face', 'dance', 'trail'];
  function cycleStyle(p, what, dir = 1) {
    const L = what === 'face' ? FP.Style.FACES : what === 'dance' ? FP.Style.DANCES : FP.Style.TRAILS, n = L.length;
    let i = Math.max(0, L.indexOf(p[what] || 'none'));
    for (let k = 0; k < n; k++) { i = (i + dir + n) % n; if (FP.Profile.owns(what, L[i])) break; }
    if (L[i] === p[what]) { FP.UI.toast('Buy more in the Shop!'); return; }
    p[what] = L[i];
    if (what === 'face') spawnInLobby(p);
    if (what === 'dance') { const c = chars.find((q) => q.player === p); if (c && FP.Style.DANCE_EMOTE[p.dance]) c.emote = { k: FP.Style.DANCE_EMOTE[p.dance], t: 0, hop: 0.2 }; }
    refreshLobby();
    if (FP.Net) FP.Net.playersChanged();
  }

  // someone pressed jump on a keyboard side or controller that isn't playing yet: they join!
  function lobbyJoins() {
    const sources = [{ kind: 'keys', map: 0 }, { kind: 'keys', map: 1 }];
    if (FP.Touch.available) sources.push({ kind: 'touch' });
    FP.Input.getPads().forEach((gp, i) => { if (gp) sources.push({ kind: 'pad', index: i }); });
    for (const src of sources) {
      const input = FP.Input.read(src, 'join-' + src.kind + (src.map ?? src.index));
      if (FP.UI.open()) continue;
      const p = players.find((q) => sameSource(q.source, src));
      if (!p && input.jumpPressed) {
        // only Player 1 so far, and they never touched the keyboard? Then this controller becomes Player 1
        const p1 = players[0];
        if (src.kind === 'pad' && players.length === 1 && p1.source.kind === 'keys' && !p1.used) {
          p1.source = { ...src };
          FP.UI.toast('Player 1 is using the controller!');
          refreshLobby();
          if (FP.Net) FP.Net.playersChanged();
        } else if (addPlayer(src)) FP.UI.toast('A new player joined!');
      }
      if (p && input.colorPressed) cycleColor(p, 1);
      if (p && input.hatPressed) cycleHat(p, 1);
      if (p && input.outfitPressed) cycleOutfit(p, 1);
      if (p && input.startPressed) chooseMode();
    }
  }

  // ------------------------------------------------------------
  //  PICK A MINI-GAME, THEN HOW MANY BOTS
  // ------------------------------------------------------------
  function chooseMode() {
    if (state !== 'lobby' || FP.UI.open()) return;
    if (FP.Net && FP.Net.isClient()) { FP.UI.toast('The host picks the mini-game'); return; }
    state = 'select';
    lobbyPanel.hidden = true;
    const nFun = FP.Fun.list().length;
    FP.UI.screen({
      cls: 'modes',
      title: 'Pick a mini-game',
      columns: 4,
      start: 4,
      buttons: [
        { label: `${ICON.trophy} Party Tour`, action: tourSetup, cls: 'extra tour' },
        { label: `${ICON.dice} Surprise me!`, action: surprise, cls: 'extra' },
        { label: `${ICON.sparkle} Fun options${nFun ? ` (${nFun})` : ''}`, action: () => funScreen(backToPicker), cls: 'extra' },
        { label: `${ICON.back} Lobby`, action: backToLobby, cls: 'extra' },
        ...MODES().map((m) => ({ label: `<span class="art">${m.art || ''}</span><b>${m.name}</b><small>${m.desc}</small>`, action: () => setupMatch(m), cls: 'mode' })),
      ],
      back: backToLobby,
    });
    if (FP.Net) FP.Net.playersChanged();
  }
  function backToPicker() { FP.UI.closeScreen(); state = 'lobby'; chooseMode(); }

  // Surprise me: a spinning wheel of mini-games that stops on a random one
  function surprise() {
    const list = MODES();
    let k = Math.floor(Math.random() * list.length), ticks = 0;
    const total = 16 + Math.floor(Math.random() * list.length);
    const card = FP.UI.screen({ cls: 'setup roulette', title: 'Surprise!', html: '<div class="setup-art" data-art></div><h2 data-name></h2>' });
    const art = card.querySelector('[data-art]'), name = card.querySelector('[data-name]');
    const tick = () => {
      if (!document.body.contains(art)) return; // the screen was closed
      const m = list[k % list.length];
      art.innerHTML = m.art || ''; name.textContent = m.name;
      k++; ticks++;
      if (ticks < total) { FP.Audio.play('menu'); setTimeout(tick, 45 + ticks * ticks * 0.9); } else {
        FP.Audio.play('win');
        setTimeout(() => { if (document.body.contains(art)) setupMatch(m); }, 900);
      }
    };
    tick();
  }

  // the fun options screen (switch silly rules on and off)
  function funScreen(back, sel = 0) {
    const opts = FP.Fun.OPTIONS;
    FP.UI.screen({
      cls: 'fun',
      title: 'Fun options',
      html: '<p>Silly rules for every mini-game. Switch on as many as you like!</p>',
      columns: 2,
      start: sel,
      buttons: [
        ...opts.map((o, i) => ({
          label: `<span class="check${FP.Fun.isOn(o.id) ? ' on' : ''}">${FP.Fun.isOn(o.id) ? ICON.check : ''}</span><span class="txt"><b>${o.name}</b><small>${o.desc}</small></span>`,
          cls: 'opt',
          action: () => { FP.Fun.toggle(o.id); funScreen(back, i); },
        })),
        { label: `${ICON.play} Done`, action: back, cls: 'go wide' },
      ],
      back,
    });
  }
  const funLine = () => { const l = FP.Fun.list(); return l.length ? `<p class="funline">${ICON.sparkle} Fun: ${l.map((o) => o.name).join(', ')}</p>` : ''; };

  function backToLobby() { FP.UI.closeScreen(); state = 'lobby'; showLobbyPanel(); refreshLobby(); if (FP.Net) FP.Net.playersChanged(); }

  function botLimits(m) {
    const h = humans().length;
    const min = Math.max(0, (m.minTotal || 2) - h);
    const max = Math.max(min, MAX_PLAYERS - h);
    return { min, max };
  }

  // 1, 2 or 3 little stars for the skill buttons
  function skillStars(id) {
    const k = FP.Bots.SKILL_ORDER.indexOf(id) + 1;
    return `<span class="stars">${Array.from({ length: 3 }, (_, i) => (i < k ? ICON.star : ICON.starEmpty)).join('')}</span>`;
  }

  function setupMatch(m) {
    const { min, max } = botLimits(m);
    if (botCount[m.id] === undefined) botCount[m.id] = Math.min(max, Math.max(min, m.defaultBots !== undefined ? m.defaultBots : MAX_PLAYERS - humans().length));
    botCount[m.id] = Math.min(max, Math.max(min, botCount[m.id]));
    const change = (d) => {
      const n = Math.min(max, Math.max(min, botCount[m.id] + d));
      if (n !== botCount[m.id]) { botCount[m.id] = n; FP.Audio.play('menu'); draw(); }
    };
    const setSkill = (id) => {
      if (!FP.Bots.SKILLS[id] || id === botSkill) return;
      botSkill = id;
      try { localStorage.setItem('floppy-skill', id); } catch (e) { /* no saving */ }
      FP.Audio.play('menu'); draw();
    };
    const moveSkill = (d) => {
      const order = FP.Bots.SKILL_ORDER;
      setSkill(order[Math.min(order.length - 1, Math.max(0, order.indexOf(botSkill) + d))]);
    };
    const draw = () => {
      const n = botCount[m.id];
      const total = humans().length + n;
      let who = humans().map((p) => FP.UI.playerPill(p)).join('') + Array.from({ length: n }, (_, i) => `<span class="pill bot">Bot ${i + 1}</span>`).join('');
      if (m.teams) who += `<p class="small">Teams are split up automatically: Red and Blue.</p>`;
      const why = min > 0 ? `<p class="small">This game needs at least ${m.minTotal || 2} players, so you need at least ${min} bot${min > 1 ? 's' : ''}.</p>` : '<p class="small">You can play with no bots at all.</p>';
      const html = `<div class="setup-art">${m.art || ''}</div><p>${m.desc}</p>${m.setupHtml ? m.setupHtml() : ''}
        <div class="counter"><span class="lbl">Bots</span>
          <button class="round" data-bots="-1" ${n <= min ? 'disabled' : ''} title="Fewer bots">${ICON.minus}</button>
          <b class="count">${n}</b>
          <button class="round" data-bots="1" ${n >= max ? 'disabled' : ''} title="More bots">${ICON.plus}</button>
        </div>
        ${n > 0 ? `<div class="skill"><span class="lbl">Bot skill</span>${FP.Bots.SKILL_ORDER.map((id) => `<button class="chip${id === botSkill ? ' on' : ''}" data-skill="${id}">${skillStars(id)}${FP.Bots.SKILLS[id].name}</button>`).join('')}</div>` : ''}
        ${why}<div class="who">${who}</div>${funLine()}<p class="small">${total} player${total > 1 ? 's' : ''} in total. Left and right: number of bots.${n > 0 ? ' Up and down: bot skill.' : ''}</p>`;
      const card = FP.UI.screen({
        cls: 'setup',
        title: m.name,
        html,
        buttons: [
          { label: `${ICON.play} Start`, action: () => FP.UI.wipe(() => startMatch(m)), cls: 'go' },
          { label: `${ICON.sparkle} Fun options`, action: () => funScreen(() => setupMatch(m)), small: true },
          { label: `${ICON.back} Pick another game`, action: backToPicker, small: true },
        ],
        back: () => { FP.UI.closeScreen(); state = 'lobby'; chooseMode(); },
        onKey: (code) => {
          if (code === 'left') { change(-1); return true; }
          if (code === 'right') { change(1); return true; }
          if (botCount[m.id] > 0 && code === 'up') { moveSkill(1); return true; }
          if (botCount[m.id] > 0 && code === 'down') { moveSkill(-1); return true; }
          return false;
        },
      });
      card.querySelectorAll('[data-bots]').forEach((b) => b.addEventListener('click', () => change(+b.dataset.bots)));
      if (m.setupWire) m.setupWire(card, draw);
      card.querySelectorAll('[data-skill]').forEach((b) => {
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => setSkill(b.dataset.skill));
      });
    };
    draw();
  }

  // ------------------------------------------------------------
  //  MATCHES AND ROUNDS
  // ------------------------------------------------------------
  function startMatch(m) {
    FP.UI.closeScreen();
    FP.UI.help.hidden = true;
    if (lobbyPanel) lobbyPanel.hidden = true;
    paused = false;
    mode = m;
    const { min, max } = botLimits(m);
    const n = Math.min(max, Math.max(min, botCount[m.id] !== undefined ? botCount[m.id] : min));
    if (tour) { if (!tour.bots) { makeBots(tour.botCount); tour.bots = matchBots; } matchBots = tour.bots; tour.awarded = false; } else makeBots(n);
    const list = everyone();
    list.forEach((p, i) => { p.team = m.teams ? i % 2 : undefined; });
    scores = {};
    list.forEach((p) => { scores[p.id] = 0; });
    if (m.teams) scores = { team0: 0, team1: 0 };
    round = 0;
    FP.Camera.setLift(0);
    FP.Audio.setSong(m.song || 'party');
    if (FP.Net) FP.Net.matchStarted(m.id);
    startRound();
  }

  function startRound() {
    replayBuf = []; replayPending = false;
    round++;
    FP.Stage.clear();
    FP.FX.clear();
    clearChars();
    FP.Bots.reset();
    FP.Camera.fix(null);
    outTimers = [];
    const list = everyone();
    mode.build(list);
    list.forEach((p, i) => makeChar(p, mode.spawn(i, list.length, p)));
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
    timer = 0;
    if (FP.Net) FP.Net.roundStarted();
    if (round === 1 && humans().length && !api.skipIntro) showIntro();
    else goCountdown();
  }

  function goCountdown() {
    state = 'countdown';
    count = 3.99;
    FP.UI.big(mode.rounds ? `${mode.roundName || 'Round'} ${round}` : mode.roundsToWin > 1 && !mode.single ? `Round ${round}` : mode.name, 1.2, mode.desc);
  }

  // ------------------------------------------------------------
  //  HOW TO PLAY (before each mini-game): tips, controls, and
  //  everyone presses JUMP when they're ready
  // ------------------------------------------------------------
  const TIPS = {
    arena: ['Punch 3 times fast to knock someone out', 'Hold grab, walk to the edge, let go to throw', 'The tiles start falling after 12 seconds'],
    soccer: ['Run into the ball to dribble it', 'PUNCH to shoot, GRAB to pass', 'No ball? JUMP to slide tackle'],
    heist: ['Hold grab to pick up treasure', 'Carry it to the getaway van', 'Guards knock you out with one hit'],
    bomb: ['Bump into someone to pass the bomb', 'It blinks faster just before it explodes', 'Run away from whoever has it!'],
    hill: ['Stand on top of the hill alone to score', 'Push everyone else off', 'First to 25 points'],
    lava: ['Jump up the platforms around the tower', 'The lava rises faster and faster', 'Push others down!'],
    tiles: ['Tiles fall after you step on them', 'Keep moving!', 'There is a second floor below'],
    color: ['Watch the billboard for the color', 'Stand on that color before time runs out', 'Push others off the good tiles'],
    sweeper: ['Jump over the spinning bar', 'It gets faster and faster', 'A second bar joins in later'],
    coins: ['Walk into coins to grab them', 'Knock people out to make them drop coins', 'The big coin is worth 5'],
    dodge: ['Run into a ball to pick it up, PUNCH to throw', 'Hit by a ball? You are out', 'GRAB just as a ball comes to CATCH it: the thrower is out!'],
    paint: ['Walk around to paint the floor', 'Jump and land for a big splat', 'Paint over other colors!'],
    crown: ['Touch the crown to wear it', 'Wearing it earns points', 'Punch the wearer to knock it off'],
    race: ['Jump over the spinning bars', 'Wait for the moving platforms', 'Fall off? Back to the last checkpoint'],
    balloons: ['Your balloons are on your back', 'Sneak behind people and punch', 'Turn around to protect yours!'],
    seats: ['Keep walking while the music plays', 'When it stops, jump onto a chair', 'No chair? You are out!'],
    zombie: ['Run from the zombies!', 'Punch a zombie to stun it', 'Zombies are slower than you'],
    boulder: ['Red arrows show where boulders come from', 'Step out of the way', 'They get faster!'],
    kart: ['Steer left and right (the kart drives by itself). Back = brake', 'Hold JUMP while turning to drift: sparks give a boost', 'Drive through ? boxes, then PUNCH to use the item'],
    sumo: ['Push everyone out of the ring', 'JUMP does a belly charge!', 'Punches push extra hard here'],
    bowling: ['Left and right: step to line up your throw', 'Hold GRAB to aim and power up, let go to bowl', 'While it rolls, left and right curve the ball'],
    hoops: ['Run into the ball to pick it up', 'PUNCH to shoot (jump by the hoop to DUNK), GRAB to pass', 'No ball? PUNCH to steal, JUMP to block'],
    meteor: ['Red circles show where meteors land', 'Get out of the circles!', 'Push others into them'],
    conveyor: ['The floor moves! Walk against it', 'Belts push you toward the edge', 'Last one on the platform wins'],
    wall: ['A wall is coming!', 'Stand in a gap in the wall', 'Push others out of your gap'],
    simon: ['Only do it if it starts with "Floppy says" (not "Flappy says")', 'Wave 1, dance 2, cheer 3, left hand Q, right hand E', 'It gets faster and trickier as it goes'],
    moles: ['Punch the moles when they pop up', 'Golden moles are worth 3', 'Never punch a mole with a bomb!'],
    chickens: ['Grab a chicken (hold grab)', 'Carry it to the pen in your color', 'Golden chicken = 3 points'],
    golf: ['Stand behind your ball and face the hole', 'Punch to hit it (the caddy picks how hard)', 'First in the hole gets the most points'],
    bumpers: ['Touching a bumper sends you flying', 'Punch others into the bumpers', 'Last one on the table wins'],
    fruit: ['Watch the shadows on the ground', 'Catch fruit with your head', 'Dodge the rotten fruit!'],
    tug: ['MASH PUNCH as fast as you can to pull', 'When the sign says HEAVE!, presses count 3 times', 'Pull the flag over your line!'],
    volley: ['Stand under the ball and you BUMP it', 'PUNCH near the ball to hit it over the net', 'JUMP and PUNCH up high to SPIKE!'],
    hurdles: ['MASH PUNCH as fast as you can to run', 'JUMP over the hurdles (or trip!)', '3 races: points for every place'],
    penalty: ['Shooter: move your aim, PUNCH to shoot', 'Goalie: left and right, JUMP to dive', 'Goals and saves both score points'],
    hockey: ['The ice is slippery!', 'Skate into the puck, PUNCH to shoot, GRAB to pass', 'No puck? PUNCH the carrier to poke it away'],
    snowball: ['Hold GRAB to make a snowball (up to 3)', 'PUNCH to throw it', 'Hide behind the snow forts!'],
    boxing: ['PUNCH to punch, hold GRAB to block', 'No health left? You go down!', 'MASH JUMP to get up before the ref counts to 5'],
    skydive: ['Steer through the rings while you fall', 'Press JUMP to open your parachute', 'Land in the middle of the target for +5'],
    cooking: ['Run into a crate to pick up food, run into a pot to put it in', '3 of the same or 3 different = soup', 'Bring soups to the SERVE window before they burn!'],
    hideseek: ['Hiders: GRAB next to furniture to hide inside it', 'Seeker: PUNCH furniture to look inside', 'Hidden furniture wiggles sometimes!'],
    boss: ['JUMP over the rings and the laser', 'Red circle? Missiles! Get out', 'When the robot sits down, PUNCH its glowing core'],
    custom: ['Build arenas in the Level Editor', 'Jump pads launch you high', 'Lava and falling off = out!'],
    water: ['PUNCH to lob a water balloon', 'Out? Refill at your team\'s water tap', 'Getting wet makes you slippery!'],
  };
  const INTRO_TIME = 15;
  let ready = new Set(), introT = 0;
  function introHtml(withButton) {
    const tips = TIPS[mode.id] || [];
    const left = Math.max(0, Math.ceil(INTRO_TIME - introT));
    const who = humans().map((p) => `<span class="ready-pill${ready.has(p.id) ? ' ok' : ''}">${FP.UI.playerPill(p)}${ready.has(p.id) ? ICON.check : '<small>press jump</small>'}</span>`).join('');
    return `<div class="intro-grid"><div class="setup-art">${mode.art || ''}</div><div class="intro-text"><p class="goal">${mode.desc}</p><ul class="tips">${tips.map((t) => `<li>${t}</li>`).join('')}</ul></div></div>
      <div class="keys-row"><span><kbd>W A S D</kbd> move</span><span><kbd>Space</kbd> jump</span><span><kbd>F</kbd> punch</span><span><kbd>G</kbd> grab</span><span><kbd>Q</kbd><kbd>E</kbd> one hand</span><span class="small">(player 2: arrows / . ,)</span></div>
      <div class="ready-row">${who}</div>
      <p class="small">Press <b>JUMP</b> when you're ready! Starting in <b class="intro-timer">${left}</b>...</p>
      ${withButton ? `<button class="btn go" data-start>${ICON.play} Start now</button>` : ''}`;
  }
  function drawIntro() {
    const card = FP.UI.screen({ cls: 'intro', title: mode.name, html: introHtml(true) });
    const b = card.querySelector('[data-start]');
    if (b) b.addEventListener('click', introDone);
    if (FP.Net) FP.Net.intro(introHtml(false));
  }
  function showIntro() {
    state = 'intro'; ready = new Set(); introT = 0;
    drawIntro();
  }
  function introDone() {
    if (state !== 'intro') return;
    FP.UI.closeScreen();
    if (FP.Net) FP.Net.introEnd();
    goCountdown();
  }
  function introFrame(dt) {
    introT += dt;
    let changed = false;
    for (const p of humans()) {
      if (ready.has(p.id)) continue;
      const src = p.source;
      let pressed = false;
      if (src.kind === 'remote') pressed = FP.Net ? FP.Net.inputOf(p.id).jumpPressed : false;
      else if (src.kind === 'keys' || src.kind === 'pad') pressed = FP.Input.read(src, p.id).jumpPressed;
      if (pressed) { ready.add(p.id); changed = true; FP.Audio.play('select'); }
    }
    if (changed) drawIntro();
    const t = document.querySelector('.intro-timer');
    if (t) t.textContent = String(Math.max(0, Math.ceil(INTRO_TIME - introT)));
    if (introT > INTRO_TIME || humans().every((p) => ready.has(p.id))) introDone();
  }

  // a character is out of this round
  function eliminate(c, how = 'is out!') {
    if (!c.alive) return;
    c.alive = false;
    FP.Audio.play('fall');
    const by = c.lastHitBy && c.lastHitBy !== c && performance.now() - c.lastHitTime < 6000 ? c.lastHitBy : null;
    FP.UI.toast(by ? `${by.name} knocked out ${c.name}!` : `${c.name} ${how}`);
    // some games move players who are out away from the action after a moment
    if (mode && mode.removeOut) outTimers.push({ c, t: mode.removeOut });
    FP.FX.puffs(c.parts.torso.position, 12, 0xffffff, 4, 1.5);
  }

  function endRound(res) {
    state = 'roundOver';
    timer = 0;
    // the final knockout happens in slow motion, with the camera zooming in
    if (!mode.single && res.winners && res.winners.length === 1 && chars.some((c) => !c.alive)) {
      if (!mode.render && FP.Settings.get('replays') !== false && replayBuf.length > 60) replayPending = true;
      slowmo = 1.2;
      FP.Camera.zoomTo(0.7);
      FP.Audio.play('whoosh');
    }
    let text = 'Nobody wins!';
    const center = new THREE.Vector3();
    if (mode.teams && res.team !== undefined) {
      scores['team' + res.team] += res.points ?? 1;
      text = `${res.team === 0 ? 'Red' : 'Blue'} team wins!`;
    } else if (res.winners && res.winners.length) {
      res.winners.forEach((c) => { if (!mode.single && !mode.rounds) scores[c.player.id] = (scores[c.player.id] || 0) + 1; c.cheer = 3.5; c.expression = 'happy'; c.exprTimer = 3.5; });
      text = res.winners.length === 1 ? `${res.winners[0].name} wins${mode.roundsToWin > 1 ? ' the round' : ''}!` : 'Winners!';
      const t = res.winners[0].parts.torso.position;
      center.set(t.x, t.y, t.z);
    }
    if (res.text) text = res.text;
    FP.UI.big(text, 2.8, res.sub || '');
    FP.FX.confetti(center);
    FP.Audio.play('win');
    FP.Audio.play('cheer');
    if (FP.Net) FP.Net.banner(text, res.sub || '');
  }

  function matchOver() {
    if (mode.rounds) return round >= mode.rounds; // a set number of rounds (like 3 golf holes)
    if (mode.single) return true;
    if (mode.teams) return scores.team0 >= mode.roundsToWin || scores.team1 >= mode.roundsToWin;
    return Object.values(scores).some((s) => s >= mode.roundsToWin);
  }

  // who came 1st, 2nd, 3rd (ties share a place): [[1st...], [2nd...], [3rd...], [everyone else]]
  function placesOf(list) {
    if (mode.teams) {
      const t0 = scores.team0, t1 = scores.team1;
      if (t0 === t1) return [list];
      const w = t0 > t1 ? 0 : 1;
      return [list.filter((p) => p.team === w), [], [], list.filter((p) => p.team !== w)];
    }
    const sorted = list.slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    const groups = [];
    let last = null;
    for (const p of sorted) { const v = scores[p.id] || 0; if (last !== null && v === last) groups[groups.length - 1].push(p); else groups.push([p]); last = v; }
    const out = groups.slice(0, 3);
    if (groups.length > 3) out.push(groups.slice(3).flat());
    return out;
  }

  // the winners' podium: a little stage with 1st, 2nd and 3rd blocks (also built by online friends)
  function buildPodium(places) {
    FP.Stage.clear();
    FP.FX.clear();
    FP.Camera.fix(null);
    const S = FP.Stage;
    S.island(0, -1, 0, 16, 2, 10, { grass: 0x9bd46e });
    const blocks = [{ x: 0, h: 1.5, col: 0xffcf33, t: '1' }, { x: -2.7, h: 1.0, col: 0xd8dde6, t: '2' }, { x: 2.7, h: 0.6, col: 0xf0b27a, t: '3' }];
    const spots = new Map();
    blocks.forEach((b, i) => {
      const grp = places[i] || [];
      if (i > 0 && !grp.length) return;
      const w = Math.max(2.2, grp.length * 1.15);
      S.block(b.x, b.h / 2, 0, w, b.h, 2, b.col);
      const num = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: FP.Props.textTexture(b.t, '#ffffff', '#2a2140', 128, 128), transparent: true }));
      num.position.set(b.x, b.h / 2, 1.01);
      S.add(num);
      grp.forEach((p, k) => spots.set(p.id, { x: b.x + (k - (grp.length - 1) / 2) * 1.1, y: b.h, z: 0 }));
    });
    (places[3] || []).forEach((p, k, arr) => spots.set(p.id, { x: (k - (arr.length - 1) / 2) * 1.4, y: 0, z: 2.6 }));
    const fans = FP.Props.crowd(2, 10, 1.2); fans.position.set(0, 0, -3); S.add(fans);
    fans.userData.hype = 1;
    S.add(FP.Props.bunting(-6, 3.2, -1.2, 6, 3.2, -1.2, 16));
    for (const [x, z] of [[-6.5, 1], [6.5, 1.5]]) { const t = FP.Look.tree(1.1); t.position.set(x, 0, z); S.add(t); }
    FP.Camera.fix(new THREE.Vector3(innerWidth > 800 ? 2.2 : 0, 1.3, 0.6), 3);
    FP.Camera.setAngle(0.34, 0.94);
    FP.FX.confetti(new THREE.Vector3(0, 3, 0), 160, 6);
    return spots;
  }
  function clientPodium(placeIds) {
    state = 'clientResults';
    const byId = (id) => players.find((p) => p.id === id) || { id };
    buildPodium((placeIds || []).map((g) => g.map(byId)));
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
  }

  function results() {
    state = 'results';
    FP.UI.setHud('');
    const list = everyone();
    const places = placesOf(list);
    // party coins and achievements (for players on this computer)
    const got = FP.Profile.matchEnded({ mode, places, skill: botSkill, funCount: FP.Fun.list().length, bots: matchBots.length, online: !!(FP.Net && FP.Net.isHost()), extra: { survivor: mode.lastSurvivor } });
    dailyFinished(places);
    storyFinished(places);
    const placeOf = (p) => places.findIndex((g) => g.includes(p));
    const makeHtml = (coins) => {
    const earn = (p) => (coins && got[p.id] ? ` <span class="earn">${ICON.coin}+${got[p.id]}</span>` : '');
    let html;
    if (mode.teams) {
      const t0 = scores.team0, t1 = scores.team1;
      const win = t0 === t1 ? 'It\'s a tie!' : (t0 > t1 ? 'Red team wins!' : 'Blue team wins!');
      html = `<div class="final"><div class="team t0">Red<b>${t0}</b></div><div class="team t1">Blue<b>${t1}</b></div></div><p class="winner">${win}</p>` +
        `<div class="podium">${list.map((p) => FP.UI.playerPill(p, (p.team === 0 ? ' <small>(Red)</small>' : ' <small>(Blue)</small>') + earn(p))).join('')}</div>`;
    } else {
      const sorted = list.slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
      const label = (v) => (mode.scoreLabel ? mode.scoreLabel(v) : v);
      const medals = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
      html = (mode.resultText ? `<p class="winner">${mode.resultText()}</p>` : '') +
        `<div class="podium">${sorted.map((p) => { const i = placeOf(p) < 3 ? placeOf(p) : sorted.indexOf(p); return `<div class="place p${i}"><span class="medal m${i}">${medals[i]}</span>${FP.UI.playerPill(p)}<b>${label(scores[p.id] || 0)}</b>${earn(p)}</div>`; }).join('')}</div>`;
    }
    if (coins && Object.keys(got).length) html += `<p class="small">${FP.Profile.coinLine()}</p>`;
    return html;
    };
    const html = makeHtml(true), netHtml = makeHtml(false);
    FP.UI.wipe(() => {
      // everyone goes to the podium
      const spots = buildPodium(places);
      for (const p of list) {
        let c = chars.find((ch) => ch.player === p);
        const sp = spots.get(p.id);
        if (!sp) continue;
        if (!c) c = makeChar(p, { x: sp.x, y: sp.y, z: sp.z, yaw: 0 });
        c.alive = true; c.ko = 0; c.getUp = 0; c.grabbedBy = null; c.thrownT = 0;
        FP.Ragdoll.releaseGrab(c);
        FP.Ragdoll.teleport(c, sp.x, sp.y + 0.05, sp.z, 0);
        const win = places[0].includes(p) && places.length > 1;
        c.podiumWinner = win;
        c.cheer = win ? 30 : 0; c.expression = win ? 'happy' : 'oh'; c.exprTimer = win ? 30 : 2;
      }
      FP.Camera.snap(chars.map(FP.Ragdoll.center));
      if (FP.Net) FP.Net.podium(places.map((g) => g.map((p) => p.id)));
      if (tour) { tourResults(html, netHtml); return; }
      if (story) { storyResults(html); return; }
      FP.UI.screen({
        cls: 'results',
        title: `${mode.name}: results`,
        html,
        buttons: [
          { label: `${ICON.again} Play again`, action: () => FP.UI.wipe(() => startMatch(mode)) },
          { label: `${ICON.grid} Another mini-game`, action: () => FP.UI.wipe(() => { lobby(); chooseMode(); }) },
          { label: `${ICON.home} Back to the lobby`, action: () => FP.UI.wipe(() => lobby()), small: true },
        ],
      });
      if (FP.Net) FP.Net.results(netHtml);
    });
  }

  function hudHtml() {
    if (!mode) return '';
    const extra = mode.hud ? mode.hud() : '';
    let pills;
    if (mode.teams) {
      pills = `<span class="pill team0">Red ${scores.team0}</span><span class="pill team1">Blue ${scores.team1}</span>`;
    } else {
      pills = everyone().map((p) => {
        const c = chars.find((ch) => ch.player === p);
        const s = scores[p.id] || 0;
        const score = mode.scoreLabel ? ` <b>${mode.scoreLabel(s)}</b>` : (s ? ` <span class="crowns">${ICON.crown.repeat(s)}</span>` : '');
        return FP.UI.playerPill(p, `${score}${c && c.alive === false ? ` <span class="outmark">${ICON.out}</span>` : ''}`);
      }).join('');
    }
    const goal = (mode.rounds ? ` <small>${mode.roundName || 'Round'} ${round} of ${mode.rounds}</small>` : mode.roundsToWin > 1 && !mode.single ? ` <small>first to ${mode.roundsToWin}</small>` : '') + (tour ? ` <small>Party Tour ${tour.index + 1} of ${tour.games.length}</small>` : '');
    return `<div class="modename">${mode.name}${goal}</div><div class="pills">${pills}</div>${extra ? `<div class="extra">${extra}</div>` : ''}`;
  }

  // ------------------------------------------------------------
  //  PARTY TOUR: a few random mini-games in a row. Every game
  //  gives party points (4 for 1st, 3 for 2nd...). Most points wins!
  // ------------------------------------------------------------
  function tourSetup() {
    const h = humans().length;
    const min = Math.max(0, 2 - h), max = Math.max(min, MAX_PLAYERS - h);
    if (tourOpts.bots === null) tourOpts.bots = max;
    tourOpts.bots = Math.min(max, Math.max(min, tourOpts.bots));
    const change = (d) => { const v = Math.min(max, Math.max(min, tourOpts.bots + d)); if (v !== tourOpts.bots) { tourOpts.bots = v; FP.Audio.play('menu'); draw(); } };
    const moveSkill = (d) => { const o = FP.Bots.SKILL_ORDER; const id = o[Math.min(o.length - 1, Math.max(0, o.indexOf(botSkill) + d))]; if (id !== botSkill) { botSkill = id; try { localStorage.setItem('floppy-skill', id); } catch (e) { /* no saving */ } FP.Audio.play('menu'); draw(); } };
    const draw = () => {
      const n = tourOpts.bots;
      const html = `<div class="champ">${ICON.trophy}</div><p>Play ${tourOpts.list ? `<b>your playlist</b> (${cleanPlaylist().length} games)` : `<b>${tourOpts.games}</b> random mini-games`} in a row. Win games to earn party points. Most points at the end is the <b>Party Champion</b>!</p>
        <div class="skill"><span class="lbl">Games</span>${[3, 5, 7].map((g) => `<button class="chip${g === tourOpts.games && !tourOpts.list ? ' on' : ''}" data-games="${g}">${g}</button>`).join('')}<button class="chip${tourOpts.list ? ' on' : ''}" data-list>My playlist (${cleanPlaylist().length})</button></div>
        <div class="counter"><span class="lbl">Bots</span>
          <button class="round" data-bots="-1" ${n <= min ? 'disabled' : ''} title="Fewer bots">${ICON.minus}</button><b class="count">${n}</b>
          <button class="round" data-bots="1" ${n >= max ? 'disabled' : ''} title="More bots">${ICON.plus}</button></div>
        ${n > 0 ? `<div class="skill"><span class="lbl">Bot skill</span>${FP.Bots.SKILL_ORDER.map((id) => `<button class="chip${id === botSkill ? ' on' : ''}" data-skill="${id}">${skillStars(id)}${FP.Bots.SKILLS[id].name}</button>`).join('')}</div>` : ''}
        ${funLine()}<p class="small">Left and right: number of bots.${n > 0 ? ' Up and down: bot skill.' : ''}</p>`;
      const card = FP.UI.screen({
        cls: 'setup', title: 'Party Tour', html,
        buttons: [
          { label: `${ICON.play} Start the tour`, action: startTour, cls: 'go' },
          { label: `${ICON.grid} Pick my playlist`, action: () => playlistScreen(), small: true },
          { label: `${ICON.sparkle} Fun options`, action: () => funScreen(tourSetup), small: true },
          { label: `${ICON.back} Back`, action: backToPicker, small: true },
        ],
        back: backToPicker,
        onKey: (code) => {
          if (code === 'left') { change(-1); return true; }
          if (code === 'right') { change(1); return true; }
          if (tourOpts.bots > 0 && code === 'up') { moveSkill(1); return true; }
          if (tourOpts.bots > 0 && code === 'down') { moveSkill(-1); return true; }
          return false;
        },
      });
      card.querySelectorAll('[data-bots]').forEach((b) => b.addEventListener('click', () => change(+b.dataset.bots)));
      card.querySelectorAll('[data-games]').forEach((b) => b.addEventListener('click', () => { tourOpts.games = +b.dataset.games; tourOpts.list = false; FP.Audio.play('menu'); draw(); }));
      card.querySelectorAll('[data-list]').forEach((b) => b.addEventListener('click', () => { FP.Audio.play('menu'); if (!cleanPlaylist().length) playlistScreen(); else { tourOpts.list = true; draw(); } }));
      card.querySelectorAll('[data-skill]').forEach((b) => b.addEventListener('click', () => { botSkill = b.dataset.skill; try { localStorage.setItem('floppy-skill', botSkill); } catch (e) { /* no saving */ } FP.Audio.play('menu'); draw(); }));
    };
    draw();
  }

  function startTour() {
    const ids = MODES().map((m) => m.id).filter((id) => id !== 'custom'); // (your own arenas are played on purpose)
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const games = tourOpts.list && cleanPlaylist().length ? cleanPlaylist() : ids.slice(0, tourOpts.games);
    tour = { games, index: 0, points: {}, bots: null, botCount: tourOpts.bots, awarded: false };
    FP.UI.wipe(() => startMatch(FP.Modes[tour.games[0]]));
  }

  // party points for this game: 4 for 1st, 3 for 2nd, 2 for 3rd, 1 for everyone else (ties get the same)
  function tourAward() {
    const list = everyone(), got = {};
    if (mode.teams) {
      const t0 = scores.team0, t1 = scores.team1;
      list.forEach((p) => { got[p.id] = t0 === t1 ? 2 : ((p.team === 0) === (t0 > t1) ? 4 : 1); });
    } else {
      const sorted = list.slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
      let place = 0;
      sorted.forEach((p, i) => { if (i > 0 && (scores[p.id] || 0) < (scores[sorted[i - 1].id] || 0)) place = i; got[p.id] = [4, 3, 2, 1][place] || 1; });
    }
    list.forEach((p) => { tour.points[p.id] = (tour.points[p.id] || 0) + got[p.id]; });
    return got;
  }

  function tourTable(got) {
    const list = everyone().slice().sort((a, b) => (tour.points[b.id] || 0) - (tour.points[a.id] || 0));
    return `<div class="tour-table">${list.map((p, i) => `<div class="tour-row"><span class="medal m${i}">${['1st', '2nd', '3rd'][i] || `${i + 1}th`}</span>${FP.UI.playerPill(p)}<b>${tour.points[p.id] || 0}</b>${got ? `<span class="plus">+${got[p.id]}</span>` : ''}</div>`).join('')}</div>`;
  }
  const tourList = () => `<div class="tour-list">${tour.games.map((id, i) => `<span class="${i < tour.index ? 'done' : i === tour.index ? 'now' : ''}">${FP.Modes[id].name}</span>`).join('')}</div>`;

  function tourResults(gameHtml, netGameHtml = gameHtml) {
    const got = tour.awarded ? null : tourAward();
    tour.awarded = true;
    const last = tour.index >= tour.games.length - 1;
    const html = `${gameHtml}<h2>Party points</h2>${tourTable(got)}${tourList()}`;
    FP.UI.screen({
      cls: 'results',
      title: `${mode.name}: results`,
      html,
      buttons: [
        last ? { label: `${ICON.trophy} Who is the champion?`, action: tourFinal, cls: 'go' }
          : { label: `${ICON.play} Next game: ${FP.Modes[tour.games[tour.index + 1]].name}`, action: () => FP.UI.wipe(() => { tour.index++; startMatch(FP.Modes[tour.games[tour.index]]); }), cls: 'go' },
        { label: `${ICON.home} Stop the tour`, action: () => lobby(), small: true },
      ],
    });
    if (FP.Net) FP.Net.results(`${netGameHtml}<h2>Party points</h2>${tourTable(got)}${tourList()}`);
  }

  function tourFinal() {
    const list = everyone().slice().sort((a, b) => (tour.points[b.id] || 0) - (tour.points[a.id] || 0));
    const top = tour.points[list[0].id] || 0;
    const champs = list.filter((p) => (tour.points[p.id] || 0) === top);
    const text = champs.length === 1 ? `${esc(champs[0].name)} is the Party Champion!`
      : champs.length === list.length ? 'It\'s a tie! You are all Party Champions!'
        : `It's a tie! ${champs.map((p) => esc(p.name)).join(' and ')} are the Party Champions!`;
    const html = `<div class="champ">${ICON.trophy}</div><p class="winner">${text}</p>${tourTable(null)}`;
    FP.Audio.play('win'); FP.Audio.play('cheer');
    FP.FX.confetti(FP.Camera.target.clone());
    for (const c of chars) if (champs.includes(c.player)) { c.cheer = 6; c.expression = 'happy'; c.exprTimer = 6; }
    if (champs.some((p) => p.source.kind === 'keys' || p.source.kind === 'pad')) { FP.Profile.unlock('champion'); FP.Profile.earn(100); FP.UI.toast('Party Champion bonus: +100 coins!', 3); }
    FP.UI.screen({
      cls: 'results',
      title: 'Party Tour: the end!',
      html,
      buttons: [
        { label: `${ICON.again} New tour`, action: () => { lobby(); chooseMode(); tourSetup(); }, cls: 'go' },
        { label: `${ICON.home} Back to the lobby`, action: () => lobby(), small: true },
      ],
    });
    if (FP.Net) FP.Net.results(html);
  }

  // ------------------------------------------------------------
  //  MY PLAYLIST (your own list of games for a Party Tour)
  // ------------------------------------------------------------
  function cleanPlaylist() { return playlist.filter((id) => FP.Modes[id]); }
  function savePlaylist() { try { localStorage.setItem('floppy-playlist', JSON.stringify(playlist)); } catch (e) { /* no saving */ } }
  function playlistScreen(sel = 0) {
    const all = MODES();
    const n = cleanPlaylist().length;
    FP.UI.screen({
      cls: 'modes playlist',
      title: 'My playlist',
      html: `<p class="small">Click the games you want, in the order you want them. Click again to take one out. ${n ? `<b>${n}</b> picked.` : 'Nothing picked yet.'}</p>`,
      columns: 4,
      start: sel,
      buttons: [
        { label: `${ICON.check} Done`, action: () => { savePlaylist(); tourOpts.list = cleanPlaylist().length > 0; tourSetup(); }, cls: 'extra tour' },
        { label: `${ICON.dice} Random 5`, action: () => { playlist = all.map((m) => m.id).sort(() => Math.random() - 0.5).slice(0, 5); savePlaylist(); FP.Audio.play('menu'); playlistScreen(1); }, cls: 'extra' },
        { label: `${ICON.minus} Clear`, action: () => { playlist = []; savePlaylist(); FP.Audio.play('menu'); playlistScreen(2); }, cls: 'extra' },
        { label: `${ICON.back} Back`, action: () => { savePlaylist(); tourSetup(); }, cls: 'extra' },
        ...all.map((m, i) => {
          const k = playlist.indexOf(m.id);
          return {
            label: `<span class="art">${m.art || ''}</span><b>${m.name}</b>${k >= 0 ? `<span class="pl-num">${k + 1}</span>` : ''}`,
            cls: 'mode' + (k >= 0 ? ' picked' : ''),
            action: () => { if (k >= 0) playlist.splice(k, 1); else playlist.push(m.id); savePlaylist(); FP.Audio.play(k >= 0 ? 'menu' : 'select'); playlistScreen(i + 4); },
          };
        }),
      ],
      back: () => { savePlaylist(); tourSetup(); },
    });
  }

  // ------------------------------------------------------------
  //  DAILY CHALLENGE (a mini-game with a twist, new every day)
  // ------------------------------------------------------------
  const TWISTS = { moon: ['Moon Gravity', 'Everyone floats and jumps super high.'], turbo: ['Turbo', 'Everyone runs super fast.'], bighead: ['Big Head', 'Giant heads for everyone.'], superpunch: ['Super Punch', 'Punches send people flying.'], ice: ['Slippery', 'Everything is as slippery as ice.'], disco: ['Disco', 'A disco party with flashing lights.'], chaos: ['Surprise', 'Something silly happens every 20 seconds!'] };
  const dayKey = (d) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  function dailyInfo() {
    const now = new Date(), key = dayKey(now);
    let s = key % 2147483647;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    rnd(); rnd();
    const list = MODES().filter((m) => m.id !== 'heist' && m.id !== 'custom'); // (everyone is on one team in the heist)
    const m = list[Math.floor(rnd() * list.length)];
    const ids = Object.keys(TWISTS);
    const twist = ids[Math.floor(rnd() * ids.length)];
    const hard = rnd() < 0.35;
    return { key, yesterday: dayKey(new Date(now.getTime() - 86400000)), mode: m, twist, hard, name: `${TWISTS[twist][0]} ${m.name}`, reward: hard ? 200 : 150 };
  }
  function dailyState() { try { return JSON.parse(localStorage.getItem('floppy-daily') || '{}') || {}; } catch (e) { return {}; } }
  function dailyDone() { return dailyState().last === dailyInfo().key; }
  function dailyScreen() {
    const ch = dailyInfo(), st = dailyState(), done = st.last === ch.key;
    const streak = st.last === ch.key || st.last === ch.yesterday ? st.streak || 0 : 0;
    const html = `<div class="setup-art">${ch.mode.art || ''}</div><h2>${esc(ch.name)}</h2><p>${ch.mode.desc}</p>
      <p><b>Today's twist:</b> ${TWISTS[ch.twist][1]}${ch.hard ? ' And the bots are on HARD!' : ''}</p>
      <p>${done ? `${ICON.check} You beat today's challenge! Come back tomorrow for a new one.` : `Win it for <b>${ICON.coin} ${ch.reward}</b> bonus party coins!`}</p>
      <p class="small">Your streak: <b>${streak}</b> day${streak === 1 ? '' : 's'} in a row.</p>`;
    FP.UI.screen({ cls: 'setup daily', title: 'Daily Challenge', html, buttons: [{ label: `${ICON.play} Play`, action: () => startDaily(ch), cls: 'go' }, { label: `${ICON.back} Back`, action: titleScreen, small: true }], back: titleScreen });
  }
  function startDaily(ch) {
    lobby(); // makes sure Player 1 is here
    daily = { ...ch, prevSkill: botSkill };
    if (ch.hard) botSkill = 'hard';
    FP.Fun.force([ch.twist]);
    const { min, max } = botLimits(ch.mode);
    botCount[ch.mode.id] = Math.min(max, Math.max(min, ch.mode.defaultBots !== undefined ? ch.mode.defaultBots : 3));
    FP.UI.wipe(() => startMatch(ch.mode));
  }
  function endDaily() { if (!daily) return; botSkill = daily.prevSkill; daily = null; FP.Fun.unforce(); }
  function dailyFinished(places) {
    if (!daily) return;
    const local = (p) => ['keys', 'pad', 'touch'].includes(p.source.kind);
    const won = places.length > 1 && places[0].some(local);
    const st = dailyState(), reward = daily.reward;
    if (st.last === daily.key) return; // already done today
    if (won) {
      const streak = st.last === daily.yesterday ? (st.streak || 0) + 1 : 1;
      try { localStorage.setItem('floppy-daily', JSON.stringify({ last: daily.key, streak })); } catch (e) { /* no saving */ }
      FP.Profile.earn(reward);
      setTimeout(() => FP.UI.toast(`Daily Challenge complete! +${reward} coins. Streak: ${streak}`, 4), 1200);
    } else setTimeout(() => FP.UI.toast('So close! Try the Daily Challenge again', 3), 1200);
  }

  // ------------------------------------------------------------
  //  STORY MODE: THE FLOPPY WORLD TOUR
  //  5 worlds with 4 levels each. Win a level to open the next one.
  //  Stars: win on Easy = 1, on Normal = 2, on Hard = 3.
  //  Stars win prizes. The very last level is the Robot Boss!
  // ------------------------------------------------------------
  const WORLDS = [
    { name: 'Sunny Meadow', levels: ['arena', 'coins', 'race', 'hill'] },
    { name: 'Sandy Beach', levels: ['volley', 'fruit', 'balloons', 'sumo'] },
    { name: 'Snowy Peaks', levels: ['snowball', 'hockey', 'tiles', 'penalty'] },
    { name: 'Lava Land', levels: ['lava', 'meteor', 'bomb', 'boxing'] },
    { name: 'Robot Factory', levels: ['conveyor', 'sweeper', 'kart', 'boss'] },
  ];
  const STORY_PRIZES = [
    { stars: 10, id: 'face:mask' }, { stars: 20, id: 'trail:gold' }, { stars: 30, id: 'outfit:knight' }, { stars: 45, id: 'dance:champ' }, { boss: true, id: 'robot' },
  ];
  const STAR_SKILL = { easy: 1, normal: 2, hard: 3 };
  const LOCK = '<svg viewBox="0 0 24 24" class="ico"><rect x="5" y="10" width="14" height="11" rx="3" fill="#8a8fa0" stroke="#2a2140" stroke-width="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#2a2140" stroke-width="2.2"/></svg>';
  let story = null; // the level being played: { w, l, skill, prevSkill, result }
  function storyData() {
    try { const d = JSON.parse(localStorage.getItem('floppy-story') || '{}') || {}; d.stars = d.stars || {}; return d; } catch (e) { return { stars: {} }; }
  }
  function saveStory(d) { try { localStorage.setItem('floppy-story', JSON.stringify(d)); } catch (e) { /* no saving */ } }
  const levelKey = (w, l) => w + '-' + l;
  const totalStars = (d) => Object.values(d.stars).reduce((a, b) => a + (b | 0), 0);
  const MAX_STARS = WORLDS.length * 4 * 3;
  function levelOpen(d, w, l) {
    if (w === 0 && l === 0) return true;
    const pw = l > 0 ? w : w - 1, pl = l > 0 ? l - 1 : WORLDS[w - 1].levels.length - 1;
    return (d.stars[levelKey(pw, pl)] | 0) > 0;
  }
  const starRow = (n) => `<span class="stars">${[1, 2, 3].map((k) => (k <= n ? ICON.star : ICON.starEmpty)).join('')}</span>`;

  function storyMap(sel) {
    endStory();
    const d = storyData(), total = totalStars(d);
    if (sel === undefined) {
      // start on the first level that isn't beaten yet
      sel = 0;
      outer: for (let w = 0; w < WORLDS.length; w++) for (let l = 0; l < 4; l++) if (levelOpen(d, w, l) && !(d.stars[levelKey(w, l)] | 0)) { sel = w * 4 + l; break outer; }
    }
    const prizes = STORY_PRIZES.map((p) => `<span class="prize${FP.Profile.owns(p.id) ? ' got' : ''}">${FP.Profile.owns(p.id) ? ICON.check : p.boss ? ICON.trophy : ICON.star} ${p.boss ? 'Beat the boss' : p.stars}: <b>${FP.Profile.itemName(p.id)}</b></span>`).join('');
    const buttons = [];
    WORLDS.forEach((W, w) => W.levels.forEach((id, l) => {
      const m = FP.Modes[id], open = levelOpen(d, w, l), st = d.stars[levelKey(w, l)] | 0;
      buttons.push({
        label: `<span class="lv-num">${w + 1}-${l + 1}</span>${open ? `<span class="lv-art">${m.art || ''}</span><b>${m.name}</b>${starRow(st)}` : `<span class="lv-lock">${LOCK}</span><b>Locked</b><small>Beat ${l > 0 ? `${w + 1}-${l}` : `${w}-4`} first</small>`}`,
        cls: `level w${w}${open ? '' : ' locked'}${id === 'boss' ? ' boss' : ''}`,
        action: () => (open ? storyLevel(w, l) : FP.UI.toast('Win the level before this one to open it!', 2.2)),
      });
    }));
    buttons.push({ label: `${ICON.back} Back`, action: titleScreen, small: true, cls: 'wide' });
    const card = FP.UI.screen({
      cls: 'story', title: 'Floppy World Tour',
      html: `<p>Travel the world and beat every mini-game! At the end waits the <b>Robot Boss</b>.</p>
        <p class="story-stars">${ICON.star} <b>${total}</b> of ${MAX_STARS} stars &nbsp; <span class="small">(win on Easy = 1 star, Normal = 2, Hard = 3)</span></p>
        <div class="prizes">${prizes}</div>`,
      columns: 4, start: sel, buttons, back: titleScreen,
    });
    // a colored title above each world's levels
    const row = card && card.querySelector('.buttons');
    if (row) WORLDS.forEach((W, w) => { const first = row.children[w * 4 + w]; const h = FP.UI.el('div', `world-title w${w}`, `World ${w + 1}: ${W.name}`); row.insertBefore(h, first); });
  }

  function storyLevel(w, l) {
    const d = storyData(), id = WORLDS[w].levels[l], m = FP.Modes[id], st = d.stars[levelKey(w, l)] | 0;
    const back = () => storyMap(w * 4 + l);
    const boss = id === 'boss';
    const html = `<div class="setup-art">${m.art || ''}</div><h2>${w + 1}-${l + 1} ${esc(WORLDS[w].name)}: ${m.name}</h2><p>${m.desc}</p>
      <p>${boss ? 'Everyone on this computer plays together against the robot (with a bot friend if you are alone).' : 'Come 1st to clear the level and open the next one!'}</p>
      <p>Your best: ${starRow(st)} &nbsp; <span class="small">Easy = 1 star, Normal = 2, Hard = 3</span></p>`;
    FP.UI.screen({
      cls: 'setup story-level', title: 'Floppy World Tour', html,
      buttons: [
        ...FP.Bots.SKILL_ORDER.map((sk) => ({ label: `${skillStars(sk)} Play on ${FP.Bots.SKILLS[sk].name}`, action: () => startStory(w, l, sk), cls: sk === 'normal' ? 'go' : '' })),
        { label: `${ICON.back} World Tour map`, action: back, small: true },
      ],
      start: st >= 2 ? 2 : st >= 1 ? 1 : 0, back,
    });
  }

  function startStory(w, l, skill) {
    const m = FP.Modes[WORLDS[w].levels[l]];
    if (!m) return;
    lobby(); // makes sure Player 1 is here
    story = { w, l, skill, prevSkill: botSkill, result: null };
    botSkill = m.id === 'boss' ? 'hard' : skill; // (bots are your friends in the boss fight: they try their best)
    if (m.id === 'boss') m.level = skill; // the robot is tougher on Hard
    const { min, max } = botLimits(m);
    botCount[m.id] = Math.min(max, Math.max(min, m.id === 'boss' ? 1 : 3));
    FP.UI.wipe(() => startMatch(m));
  }
  function endStory() { if (!story) return; botSkill = story.prevSkill; story = null; if (FP.Modes.boss) FP.Modes.boss.level = null; }

  // after a story level: stars, coins and prizes
  function storyFinished(places) {
    if (!story) return;
    const local = (p) => ['keys', 'pad', 'touch'].includes(p.source.kind);
    const won = mode.id === 'boss' ? !!mode.beaten : places.length > 1 && places[0].some(local);
    const res = { won, newStars: 0, coins: 0, prizes: [] };
    if (won) {
      const d = storyData(), key = levelKey(story.w, story.l), before = d.stars[key] | 0;
      const got = STAR_SKILL[story.skill] || 1;
      if (got > before) { d.stars[key] = got; res.newStars = got - before; }
      res.coins = (before ? 0 : 50) + res.newStars * 25;
      if (mode.id === 'boss') d.boss = true;
      saveStory(d);
      const total = totalStars(d);
      for (const p of STORY_PRIZES) if ((p.boss ? d.boss : total >= p.stars) && FP.Profile.grant(p.id)) res.prizes.push(p.id);
      if (res.coins) FP.Profile.earn(res.coins);
    }
    story.result = res;
  }

  function storyResults(gameHtml) {
    const r = story.result || { won: false, prizes: [] }, { w, l, skill } = story;
    const lastLevel = w === WORLDS.length - 1 && l === WORLDS[w].levels.length - 1;
    const nw = l + 1 < WORLDS[w].levels.length ? w : w + 1, nl = l + 1 < WORLDS[w].levels.length ? l + 1 : 0;
    let msg = r.won ? `<p class="winner">Level cleared!${r.newStars ? ` +${r.newStars} star${r.newStars > 1 ? 's' : ''}` : ''}</p>` : '<p class="winner">Not this time... try again!</p>';
    if (r.coins) msg += `<p>${ICON.coin} +${r.coins} World Tour bonus coins</p>`;
    for (const id of r.prizes) msg += `<p class="prize-won">${ICON.trophy} New prize: <b>${FP.Profile.itemName(id)}</b>! Pick it in the lobby.</p>`;
    if (r.won && lastLevel) msg += '<p><b>You beat the Robot Boss and finished the Floppy World Tour! You are the champions!</b></p>';
    if (r.prizes.length) { FP.Audio.play('cheer'); FP.FX.confetti(FP.Camera.target.clone()); }
    const buttons = [];
    if (r.won && !lastLevel) buttons.push({ label: `${ICON.play} Next level: ${FP.Modes[WORLDS[nw].levels[nl]].name}`, action: () => storyLevel(nw, nl), cls: 'go' });
    buttons.push({ label: `${ICON.again} ${r.won ? 'Play again' : 'Try again'}`, action: () => startStory(w, l, skill), cls: r.won ? '' : 'go' });
    buttons.push({ label: `${ICON.grid} World Tour map`, action: () => storyMap(w * 4 + l), small: true });
    FP.UI.screen({ cls: 'results', title: `${mode.name}: results`, html: msg + gameHtml, buttons });
  }

  // ------------------------------------------------------------
  //  REPLAY: the last moment of a round, again, in slow motion
  // ------------------------------------------------------------
  let replayEl = null;
  function recordFrame() {
    const pose = (b) => [b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w];
    replayBuf.push({ c: chars.map((c) => c.bodies.map(pose)), m: FP.Stage.movers.map(([, b]) => pose(b)) });
    if (replayBuf.length > 200) replayBuf.shift();
  }
  function applyFrame(f) {
    const set = (b, v) => { b.position.set(v[0], v[1], v[2]); b.quaternion.set(v[3], v[4], v[5], v[6]); b.velocity.set(0, 0, 0); b.angularVelocity.set(0, 0, 0); };
    chars.forEach((c, i) => { const cf = f.c[i]; if (cf) c.bodies.forEach((b, k) => { if (cf[k]) set(b, cf[k]); }); });
    FP.Stage.movers.forEach(([, b], i) => { if (f.m[i]) set(b, f.m[i]); });
  }
  function startReplay() {
    replayPending = false;
    state = 'replay';
    // start the replay about 3 seconds before the end (the last frames are just the celebration)
    replay = { frames: replayBuf.slice(0, Math.max(60, replayBuf.length - 60)), t: 0 };
    FP.UI.setHud('');
    if (!replayEl) { replayEl = document.createElement('div'); replayEl.className = 'replay-bars'; replayEl.innerHTML = '<i class="top"></i><i class="bot"></i><b>REPLAY</b><small>Press jump to skip</small>'; document.body.append(replayEl); }
    replayEl.hidden = false;
    if (FP.Net) FP.Net.banner('REPLAY', '');
    FP.Camera.zoomTo(0.75);
  }
  function replayFrame(dt) {
    if (!replay) { endReplay(); return; }
    replay.t += dt * 0.45;
    const i = Math.floor(replay.t * 60);
    const skip = humans().some((p) => p.source.kind !== 'remote' && FP.Input.read(p.source, 'replay' + p.id).jumpPressed);
    if (i >= replay.frames.length || skip) { endReplay(); return; }
    applyFrame(replay.frames[i]);
  }
  function endReplay() {
    replay = null;
    if (replayEl) replayEl.hidden = true;
    FP.Camera.zoomTo(1);
    if (matchOver()) results(); else startRound();
  }

  // ------------------------------------------------------------
  //  PHOTO MODE: pause, move the camera around, take a picture
  // ------------------------------------------------------------
  const FILTERS = [['Normal', 'none'], ['Black and white', 'grayscale(1)'], ['Old photo', 'sepia(0.85)'], ['Super colors', 'saturate(1.9) contrast(1.1)'], ['Dreamy', 'hue-rotate(160deg) saturate(1.3)']];
  let photoEl = null;
  function startPhoto() {
    FP.UI.closeScreen();
    const cam = FP.Camera.camera, t = FP.Camera.target;
    const d = cam.position.clone().sub(t), len = d.length() || 10;
    photo = { yaw: Math.atan2(d.x, d.z), pitch: Math.asin(Math.max(-1, Math.min(1, d.y / len))), dist: len, target: t.clone(), filter: 0, src: (humans().find((p) => p.source.kind !== 'remote') || {}).source };
    if (!photoEl) { photoEl = document.createElement('div'); photoEl.className = 'photo-ui'; document.body.append(photoEl); }
    photoEl.hidden = false;
    document.body.classList.add('photo-mode');
    drawPhotoUi();
  }
  function drawPhotoUi() { if (photoEl && photo) photoEl.innerHTML = `<div class="photo-help"><b>Photo mode</b> &nbsp; Move: turn the camera, up and down: zoom &nbsp; <kbd>Space</kbd> or A: take a picture &nbsp; <kbd>F</kbd> or X: filter (${FILTERS[photo.filter][0]}) &nbsp; <kbd>Esc</kbd> or Start: back</div>`; }
  function photoFrame(dt) {
    const inp = photo.src ? FP.Input.read(photo.src, 'photo') : { x: 0, z: 0 };
    photo.yaw -= (inp.x || 0) * dt * 1.6;
    photo.dist = Math.max(3, Math.min(45, photo.dist * (1 + (inp.z || 0) * dt * 1.2)));
    if (inp.jumpPressed) photoShot = true;
    if (inp.punchPressed) nextFilter();
    if (inp.startPressed) { endPhoto(); return; }
    const cam = FP.Camera.camera, t = photo.target, cp = Math.cos(photo.pitch);
    cam.position.set(t.x + Math.sin(photo.yaw) * cp * photo.dist, t.y + Math.sin(photo.pitch) * photo.dist, t.z + Math.cos(photo.yaw) * cp * photo.dist);
    cam.lookAt(t);
  }
  function nextFilter() { if (!photo) return; photo.filter = (photo.filter + 1) % FILTERS.length; FP.Stage.renderer.domElement.style.filter = FILTERS[photo.filter][1] === 'none' ? '' : FILTERS[photo.filter][1]; drawPhotoUi(); FP.Audio.play('menu'); }
  function photoKey(e) {
    if (e.code === 'Escape') { e.preventDefault(); endPhoto(); }
    else if (e.code === 'KeyF') nextFilter();
  }
  function capturePhoto() {
    const src = FP.Stage.renderer.domElement;
    const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
    const g = cv.getContext('2d');
    g.filter = FILTERS[photo ? photo.filter : 0][1];
    g.drawImage(src, 0, 0);
    g.filter = 'none';
    g.font = `900 ${Math.round(cv.height * 0.04)}px Fredoka, Arial, sans-serif`; g.fillStyle = 'rgba(255,255,255,0.9)'; g.textAlign = 'right';
    g.fillText('Floppy Party', cv.width - 20, cv.height - 20);
    let url = '';
    try { url = cv.toDataURL('image/png'); } catch (e) { FP.UI.toast('Could not take the picture here'); return; }
    FP.Audio.play('coin');
    const flash = document.createElement('div'); flash.className = 'photo-flash'; document.body.append(flash); setTimeout(() => flash.remove(), 400);
    document.querySelectorAll('.photo-preview').forEach((el) => el.remove());
    const prev = document.createElement('div'); prev.className = 'photo-preview';
    prev.innerHTML = `<img src="${url}" alt="Your photo"><div><button class="btn small" data-save>Save picture</button> <button class="btn small" data-close>Keep going</button></div>`;
    document.body.append(prev);
    prev.querySelector('[data-close]').addEventListener('click', () => prev.remove());
    prev.querySelector('[data-save]').addEventListener('click', () => savePhoto(cv, url));
  }
  // save the picture: on claude.ai the page asks you first, on a normal website it just downloads
  async function savePhoto(cv, url) {
    const name = 'floppy-party-photo.png';
    let dl = null;
    try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
    if (dl) {
      cv.toBlob(async (blob) => {
        try { await dl.save({ filename: name, data: blob }); FP.UI.toast('Picture saved!'); }
        catch (e) { if (e && e.code !== 'declined') FP.UI.toast('Could not save the picture here'); }
      }, 'image/png');
      return;
    }
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  }

  function endPhoto() {
    if (!photo) return;
    photo = null;
    FP.Stage.renderer.domElement.style.filter = '';
    if (photoEl) photoEl.hidden = true;
    document.body.classList.remove('photo-mode');
    document.querySelectorAll('.photo-preview').forEach((el) => el.remove());
    pauseMenu();
  }

  // ------------------------------------------------------------
  //  PAUSE
  // ------------------------------------------------------------
  function pause() {
    if (!['countdown', 'play', 'roundOver'].includes(state) || paused || FP.UI.open()) return;
    paused = true;
    pauseMenu();
  }
  function pauseMenu() {
    FP.UI.screen({
      title: 'Paused',
      buttons: [
        { label: `${ICON.play} Keep playing`, action: resume },
        { label: `${ICON.again} Restart this game`, action: () => { paused = false; FP.UI.wipe(() => startMatch(mode)); } },
        { label: `${ICON.sparkle} Photo mode`, action: startPhoto, small: true },
        { label: `${ICON.grid} Settings`, action: () => FP.Settings.screen(pauseMenu), small: true },
        { label: `${ICON.home} Back to the lobby`, action: () => { paused = false; FP.UI.wipe(() => lobby()); } },
      ],
      back: resume,
    });
  }
  function resume() { paused = false; FP.UI.closeScreen(); }
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (photo) { photoKey(e); return; }
    if ((e.code === 'Escape' || e.code === 'KeyP') && !FP.UI.open()) pause();
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && state === 'lobby' && !FP.UI.open()) { e.preventDefault(); chooseMode(); }
  });

  // ------------------------------------------------------------
  //  THE LOOP
  // ------------------------------------------------------------
  function inputFor(c) {
    const p = c.player;
    if (!p) return idle;
    const src = p.source;
    const canMove = ['play', 'lobby', 'roundOver', 'title'].includes(state);
    if (!canMove || paused) return idle;
    if (src.kind === 'bot') return state === 'lobby' || state === 'title' || (c.emote && c.emote.t < 2) ? idle : FP.Bots.think(c, chars, FP.Physics.STEP, state === 'play' ? mode : null);
    if (src.kind === 'remote') return FP.Net ? FP.Net.inputOf(p.id) : idle;
    const input = FP.Input.read(src, p.id);
    if (!p.used && (Math.abs(input.x) > 0.3 || Math.abs(input.z) > 0.3 || input.jumpPressed || input.punchPressed || input.grab)) p.used = true;
    return input;
  }

  // Start on any controller pauses the game
  const padStart = {};
  function padPause() {
    FP.Input.getPads().forEach((gp, i) => {
      if (!gp) return;
      const down = !!(gp.buttons[9] && gp.buttons[9].pressed);
      if (down && !padStart[i] && ['countdown', 'play', 'roundOver'].includes(state) && !paused && !FP.UI.open()) pause();
      padStart[i] = down;
    });
  }

  let acc = 0, titleT = 0, slowmo = 0;
  function update(dt) {
    FP.UI.update(dt);
    FP.Fun.update(dt, FP.Net && FP.Net.isClient() ? 'client' : state);
    titleT += dt;
    FP.Camera.setOrbit(state === 'title' ? Math.sin(titleT * 0.12) * 0.45 : state === 'replay' && replay ? Math.sin(replay.t * 1.4) * 0.7 : 0);
    FP.Camera.setShift(state === 'title' && innerWidth > 800 ? 3.2 : 0);
    FP.Props.animate(dt);
    if (!paused && state !== 'replay') FP.Style.update(dt, chars); // sparkly trails
    const introOpen = !!document.querySelector('.screen.intro:not([hidden])');
    FP.Touch.update(FP.Touch.available && ((['lobby', 'countdown', 'play', 'roundOver', 'client'].includes(state) && !FP.UI.open()) || introOpen));
    if (FP.Net && FP.Net.isClient()) {
      FP.Net.clientFrame(dt);
      FP.UI.nameTags(FP.Game.chars, FP.Camera.camera, state === 'lobby' || (state === 'client' && !(mode && mode.noTags)));
      return;
    }
    padPause();
    if (paused) { if (photo) photoFrame(dt); return; }
    if (state === 'lobby') lobbyJoins();
    if (state === 'editor') FP.Editor.update(dt);
    if (slowmo > 0) { slowmo -= dt; dt *= 0.3; if (slowmo <= 0) FP.Camera.zoomTo(1); }
    else if (state !== 'roundOver') FP.Camera.zoomTo(1);

    // physics runs in fixed little steps (60 per second)
    acc += dt;
    let steps = 0;
    if (state === 'replay') acc = 0; // the replay moves everything by itself
    while (acc >= FP.Physics.STEP && steps < 6) {
      const modeControls = mode && mode.control && ['intro', 'countdown', 'play', 'roundOver'].includes(state);
      for (const c of chars) { const inp = inputFor(c); if (modeControls) mode.control(c, inp, FP.Physics.STEP, state === 'play'); else FP.Ragdoll.control(c, inp, FP.Physics.STEP); }
      if (mode && mode.beforeStep && ['countdown', 'play', 'roundOver'].includes(state)) mode.beforeStep(FP.Physics.STEP, chars);
      FP.Physics.step();
      acc -= FP.Physics.STEP;
      steps++;
    }
    if (steps === 6) acc = 0;
    if (state === 'play' || state === 'roundOver') recordFrame();

    // fell off the island? pop back on
    if (state === 'lobby' || state === 'title' || state === 'select') {
      for (const c of chars) if (c.parts.torso.position.y < -12) { FP.Ragdoll.teleport(c, (Math.random() - 0.5) * 6, 0.5, 1); FP.FX.puffs(c.parts.torso.position, 10, 0xffffff, 3); }
    }

    if (state === 'countdown') {
      const before = Math.ceil(count);
      count -= dt;
      const now = Math.ceil(count);
      if (now !== before && now <= 3 && now >= 1) { FP.UI.big(String(now), 0.9); FP.Audio.play('beep'); }
      if (count <= 0) { state = 'play'; FP.UI.big('GO!', 0.8); FP.Audio.play('go'); if (FP.Net) FP.Net.banner('GO!', ''); }
      if (mode.update) mode.update(0, chars, api, true);
    } else if (state === 'play') {
      timer += dt;
      for (const o of outTimers) { o.t -= dt; if (o.t <= 0 && !o.done) { o.done = true; FP.Ragdoll.teleport(o.c, 0, -80, 0); o.c.alive = false; } }
      const res = mode.update(dt, chars, api);
      if (res) endRound(res);
    } else if (state === 'roundOver') {
      timer += dt;
      if (mode.update) mode.update(dt, chars, api, true);
      if (timer > 3.2) { if (replayPending) startReplay(); else if (matchOver()) results(); else startRound(); }
    } else if (state === 'replay') {
      replayFrame(dt);
    } else if (state === 'intro') {
      if (mode.update) mode.update(0, chars, api, true);
      introFrame(dt);
    } else if (state === 'results') {
      // winners on the podium dance and cheer
      for (const c of chars) {
        if (!c.podiumWinner || c.emote || !c.grounded || Math.random() > dt * 1.5) continue;
        // your victory dance from the Shop (or a surprise one)
        const dance = c.player && FP.Style.DANCE_EMOTE[c.player.dance];
        c.emote = { k: dance || 2 + Math.floor(Math.random() * 2), t: 0, hop: 0.3 };
      }
    } else if (state === 'title') {
      // the characters on the title screen show off their moves
      if (chars.length && Math.random() < dt * 1.6) { const c = chars[Math.floor(Math.random() * chars.length)]; if (!c.emote && c.ko <= 0) c.emote = { k: 1 + Math.floor(Math.random() * 3), t: 0, hop: 0.3 }; }
    }

    for (const c of chars) FP.Ragdoll.sync(c, dt);
    if (['countdown', 'play', 'roundOver'].includes(state)) FP.UI.setHud(hudHtml());
    FP.FX.update(dt);
    FP.Stage.update(dt, timer, FP.Camera.target);
    const playing = mode && ['countdown', 'play', 'roundOver'].includes(state);
    const focus = state === 'replay' ? chars.filter((c) => c.parts.torso.position.y > -4).map(FP.Ragdoll.center) : playing && mode.focus ? mode.focus(chars) : chars.filter((c) => c.alive && c.parts.torso.position.y > (mode && mode.focusMinY !== undefined ? mode.focusMinY() : -4)).map(FP.Ragdoll.center);
    FP.Camera.update(focus.length ? focus : chars.map(FP.Ragdoll.center), dt, state === 'results' ? 7 : mode && state !== 'lobby' ? (mode.minZoom || 12) : 11);
    FP.UI.nameTags(chars, FP.Camera.camera, ['lobby', 'countdown', 'play', 'roundOver'].includes(state) && !(mode && mode.noTags && state !== 'lobby'));
    if (FP.Net) FP.Net.hostFrame(dt);
  }

  const api = {
    get players() { return players; }, set players(v) { players = v; },
    get chars() { return chars; }, get state() { return state; }, get round() { return round; }, set round(v) { round = v; }, get mode() { return mode; }, get scores() { return scores; },
    get everyone() { return everyone(); },
    MODES, addPlayer, removePlayer, eliminate, lobby, titleScreen, startMatch, chooseMode, setupMatch, refreshLobby, hudHtml, update,
    clientLobby, clientRound, clientPodium, skipIntro: false, dailyInfo, startDaily, editor, storyMap, startStory, get story() { return story; }, startPhoto, endPhoto, get replaying() { return !!replay; }, get playlist() { return playlist; }, endMatchNow: () => { if (['play', 'roundOver', 'countdown'].includes(state)) results(); }, cycle: (p, what, dir) => (what === 'color' ? cycleColor(p, dir) : what === 'outfit' ? cycleOutfit(p, dir) : what === 'hat' ? cycleHat(p, dir) : STYLE_ACTS.includes(what) ? cycleStyle(p, what, dir) : null),
    botLimits, setBots(id, n) { botCount[id] = n; },
    setSkill(id) { if (FP.Bots.SKILLS[id]) botSkill = id; }, get botSkill() { return botSkill; },
    get tour() { return tour; }, tourSetup, startTour, surprise, funScreen,
    manual: false,
    step(seconds) { for (let i = 0; i < Math.round(seconds * 60); i++) update(1 / 60); },
  };

  FP.Input.init();
  FP.Settings.apply();
  window.addEventListener('resize', () => { FP.Stage.resize(); FP.Camera.resize(); });
  setTimeout(titleScreen, 0);
  let last = performance.now();
  // watch how fast the game runs: if it's slow while playing, switch to Fast graphics (slow = buttons feel late)
  const slow = { t: 0, n: 0 };
  function watchSpeed(raw) {
    if (raw > 0.25 || document.hidden || !['countdown', 'play', 'roundOver', 'client'].includes(state)) return;
    slow.t += raw; slow.n++;
    if (slow.t >= 3 && slow.n >= 20) { // check every 3 seconds
      if (slow.t / slow.n > 1 / 30) FP.Settings.autoFast();
      slow.t = 0; slow.n = 0;
    }
  }
  // "Show speed (FPS)" in Settings: frames per second in the corner (60 is perfect, under 30 feels laggy)
  let fpsEl = null, fpsN = 0, fpsT = 0;
  function showFps(raw) {
    const on = FP.Settings.get('fps');
    if (!on) { if (fpsEl) fpsEl.hidden = true; return; }
    if (!fpsEl) { fpsEl = document.createElement('div'); fpsEl.className = 'fps'; document.body.append(fpsEl); }
    fpsEl.hidden = false;
    fpsN++; fpsT += raw;
    if (fpsT >= 0.5) { const f = Math.round(fpsN / fpsT); fpsEl.textContent = `${f} FPS`; fpsEl.classList.toggle('bad', f < 30); fpsN = 0; fpsT = 0; }
  }
  function frame(now) {
    const raw = (now - last) / 1000;
    const dt = Math.min(0.1, raw); // a slow computer still runs the game at full speed (up to 6 physics steps a frame)
    last = now;
    if (!api.manual) { watchSpeed(raw); showFps(raw); }
    if (!api.manual) update(dt);
    // some mini-games draw their own cameras (like the kart race with split screen)
    if (!photo && mode && mode.render && ['intro', 'countdown', 'play', 'roundOver', 'client'].includes(state)) mode.render(FP.Stage.renderer, FP.Stage.scene, dt);
    else FP.Stage.render(FP.Camera.camera);
    if (photoShot) { photoShot = false; capturePhoto(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return api;
})();
