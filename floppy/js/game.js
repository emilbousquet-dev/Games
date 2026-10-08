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
  // team mode: games where the last one standing wins can also be played in 2 teams (Red and Blue)
  const TEAMABLE = ['arena', 'tiles', 'color', 'sweeper', 'sumo', 'meteor', 'conveyor', 'wall', 'bumpers', 'boulder', 'custom', 'balloons', 'boxing'];
  const teamPlay = {};
  // who is on which team in team games (picked in the setup screen):
  // 'p' + player id for players, 'b0', 'b1'... for the bots. 0 = Red, 1 = Blue
  const teamPick = {};
  let botSkill = 'normal'; // how good the bots are: easy, normal or hard
  const VERSION = '1.3';
  let tour = null;          // Party Tour: { games: [mode ids], index, points: { playerId: n }, bots, awarded }
  let tourOpts = { games: 5, bots: null, list: false, king: true };
  let playlist = [];         // your own list of games for a Party Tour (saved on this computer)
  try { playlist = JSON.parse(localStorage.getItem('floppy-playlist') || '[]'); } catch (e) { /* no saving */ }
  let daily = null;          // the Daily Challenge being played right now
  let replayBuf = [], replay = null, replayPending = false, directorWanted = false; // the slow-motion replay of the last moment of a round
  let photo = null, photoShot = false; // photo mode
  try { botSkill = FP.Bots.SKILLS[localStorage.getItem('floppy-skill')] ? localStorage.getItem('floppy-skill') : 'normal'; } catch (e) { /* no saving */ }
  const idle = { x: 0, z: 0 };

  // ------------------------------------------------------------
  //  PLAYERS
  // ------------------------------------------------------------
  const humans = () => players.filter((p) => p.source.kind !== 'bot');
  // (in a tournament match only the two players in that match play)
  const everyone = () => (tourney && tourney.current ? [tourney.current.a, tourney.current.b] : players.concat(matchBots));

  function freeColor(list = everyone()) {
    for (let i = 0; i < FP.Look.COLORS.length; i++) if (!FP.Look.COLORS[i].special && !list.some((p) => p.colorIndex === i)) return i;
    return 0;
  }
  function nextPlayerName() {
    for (let n = 1; n <= 8; n++) if (!players.some((p) => p.name === `Player ${n}`)) return `Player ${n}`;
    return 'Player';
  }

  // names you typed in the lobby are remembered on this computer (Player 1 shares its name with online play)
  function savedName(i) {
    try {
      const n = i === 0 ? localStorage.getItem('floppy-name') : (JSON.parse(localStorage.getItem('floppy-names') || '[]') || [])[i];
      const clean = typeof n === 'string' ? n.replace(/[<>&"'`]/g, '').trim().slice(0, 12) : '';
      return clean && !everyone().some((p) => p.name === clean) ? clean : '';
    } catch (e) { return ''; }
  }
  function saveName(i, name) {
    try {
      if (i === 0) localStorage.setItem('floppy-name', name);
      else { const l = JSON.parse(localStorage.getItem('floppy-names') || '[]') || []; l[i] = name; localStorage.setItem('floppy-names', JSON.stringify(l)); }
    } catch (e) { /* no saving */ }
  }
  const isLocalSource = (src) => ['keys', 'pad', 'touch'].includes(src && src.kind);
  // your 4 emote buttons (saved on this computer, one list for each player slot)
  function savedEmotes(i) {
    try { const l = (JSON.parse(localStorage.getItem('floppy-emotes') || '[]') || [])[i]; if (Array.isArray(l) && l.length === 4 && l.every((e) => FP.Style.EMOTES.includes(e))) return l.slice(); } catch (e) { /* no saving */ }
    return FP.Style.DEFAULT_EMOTES.slice();
  }
  function saveEmotes(i, list) { try { const all = JSON.parse(localStorage.getItem('floppy-emotes') || '[]') || []; all[i] = list; localStorage.setItem('floppy-emotes', JSON.stringify(all)); } catch (e) { /* no saving */ } }
  function emotePicker(i) {
    const p = players[i];
    if (!p) return;
    if (!p.emotes) p.emotes = savedEmotes(i);
    const k = p.source.kind, m = p.source.map;
    const keyOf = (n) => (k === 'pad' ? ['Back', 'L3', 'Y', 'R3'][n] : k === 'touch' ? `Emote x${n + 1}` : m === 1 ? ['8', '9', '0', '-'][n] : String(n + 1));
    const rows = p.emotes.map((cur, n) => `<div class="emo-row"><span class="lbl"><kbd>${keyOf(n)}</kbd></span>${FP.Style.EMOTES.map((e) => `<button class="chip${e === cur ? ' on' : ''}" data-slot="${n}" data-emo="${e}">${FP.Style.EMOTE_NAMES[e]}${e === 'dance' && FP.Style.DANCE_EMOTE[p.dance] ? ` (${FP.Style.DANCE_NAMES[p.dance]})` : ''}</button>`).join('')}</div>`).join('');
    const card = FP.UI.screen({
      cls: 'setup emotes', title: `${esc(p.name)}'s emotes`,
      html: `<p class="small">Pick what each emote button does. <b>Laugh</b> at someone close to get a little speed boost (but they get angry and punch harder!).</p>${rows}`,
      buttons: [{ label: `${ICON.check} Done`, action: () => { FP.UI.closeScreen(); refreshLobby(); }, cls: 'go' }],
      back: () => { FP.UI.closeScreen(); refreshLobby(); },
    });
    card.querySelectorAll('[data-emo]').forEach((b) => {
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', () => {
        p.emotes[+b.dataset.slot] = b.dataset.emo;
        if (isLocalSource(p.source)) saveEmotes(i, p.emotes);
        const c = chars.find((q) => q.player === p);
        if (c) c.emote = null;
        FP.Audio.play('menu');
        emotePicker(i);
        if (c) { c.emote = { k: FP.Style.EMOTE_KIND[b.dataset.emo] === 2 && FP.Style.DANCE_EMOTE[p.dance] ? FP.Style.DANCE_EMOTE[p.dance] : FP.Style.EMOTE_KIND[b.dataset.emo], t: 0, hop: 0.2 }; }
      });
    });
  }

  function addPlayer(source, opts = {}) {
    if (players.length >= MAX_PLAYERS) return null;
    const p = {
      id: opts.id || nextId++, source,
      colorIndex: opts.colorIndex !== undefined ? opts.colorIndex : freeColor(),
      hat: opts.hat || FP.Look.FREE_HATS[(players.length * 3 + 1) % FP.Look.FREE_HATS.length],
      outfit: opts.outfit || FP.Look.FREE_OUTFITS[(players.length + 1) % FP.Look.FREE_OUTFITS.length],
      face: opts.face || 'none', dance: opts.dance || 'none', trail: opts.trail || 'none',
      name: opts.name || (isLocalSource(source) && savedName(players.length)) || nextPlayerName(),
      emotes: isLocalSource(source) ? savedEmotes(players.length) : undefined,
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
        // (in the Winter or Spooky event, bots often wear the event hat)
        hat: FP.Season.hat && Math.random() < 0.4 ? FP.Season.hat : pick(FP.Look.HATS.filter((h) => h !== 'none' && !FP.Look.TOUR_HATS.includes(h) && !FP.Look.EVENT_HATS.includes(h))),
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
    // everyone has their own voice (a higher or lower chirp)
    const h = String(p.name || '').split('').reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 997, p.colorIndex * 7);
    c.voice = 0.8 + (h % 11) * 0.055;
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
    const sea = { grass: FP.Season.grass, dirt: FP.Season.dirt }; // snowy in winter
    FP.Stage.island(0, -1, 0, 18, 2, 12, sea);
    FP.Stage.island(-6.5, 0, -4.5, 4, 4, 3, sea);
    FP.Stage.island(6.5, -0.5, -4.5, 4, 3, 3, sea);
    FP.Season.decorate([[-5, -3.2, 0.3], [5.2, -3.4, -0.4], [-8, 2, 0.8], [7.9, 1.6, -0.6], [-4.2, 4.6, 0.2], [4.6, 4.8, -0.2]]);
    const trees = [[-8, 1, -4.5, 1.1], [8, 0.5, -4.8, 0.9], [-7.8, 0, 4.4, 0.8], [7.6, 0, 4.2, 1]];
    trees.forEach(([x, y, z, s]) => { const t = FP.Look.tree(s); t.position.set(x, y, z); FP.Stage.add(t); });
    const flowerColors = [0xff5a5f, 0xffcf33, 0xffffff, 0x9b6bff, 0xff8fc8];
    for (let i = 0; i < (FP.Season.id === 'winter' ? 0 : 40); i++) { // (no flowers in the snow)
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
  let seasonWelcomed = false;
  function titleScreen() {
    const splash = document.getElementById('splash');
    if (splash && !splash.classList.contains('gone')) { splash.classList.add('gone'); setTimeout(() => splash.remove(), 600); }
    endDaily();
    endStory();
    tourney = null;
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
        ...(tutorialSeen() ? [] : [{ label: `${ICON.help} New here? Try the Tutorial!`, action: startTutorial, cls: 'go' }]),
        { label: `${ICON.people} Play on this computer`, action: () => lobby() },
        { label: `${ICON.online} Play online with friends`, action: () => FP.Net.menu() },
        { label: `${ICON.flag} Story Mode: World Tour`, action: () => storyMap(), cls: 'story-btn' },
        { label: `${ICON.star} Daily and Weekly Challenges`, action: dailyScreen, cls: 'daily-btn' },
        { label: `${ICON.crown} Shop`, action: () => FP.Profile.shopScreen(titleScreen), small: true },
        { label: `${ICON.chart} Stats`, action: () => FP.Profile.achievementsScreen(titleScreen), small: true },
        { label: `${ICON.pencil} Level Editor`, action: () => editor(), small: true },
        { label: `${ICON.gear} Settings`, action: () => FP.Settings.screen(titleScreen), small: true },
        { label: `${ICON.help} How to play`, action: () => { FP.UI.showHelp(); }, small: true },
        ...(tutorialSeen() ? [{ label: `${ICON.play} Tutorial`, action: startTutorial, small: true }] : []),
        { label: `${ICON.star} Credits`, action: credits, small: true },
      ],
    });
    const card = document.querySelector('.screen.title .card');
    if (card) card.insertAdjacentHTML('beforeend', `<p class="title-coins">${FP.Profile.coinLine()} &nbsp; ${FP.Profile.levelLine()}</p>`);
    if (card && FP.Season.info) card.querySelector('.logo').insertAdjacentHTML('afterend', `<div class="season-tag season-${FP.Season.id}">${FP.Season.info.name}!</div>`);
    if (!seasonWelcomed) { seasonWelcomed = true; FP.Season.welcome(); }
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

  // ------------------------------------------------------------
  //  TUTORIAL (learn the moves on a practice dummy; the steps are in modes/tutorial.js)
  // ------------------------------------------------------------
  function tutorialSeen() { try { return !!localStorage.getItem('floppy-tutorial') || FP.Profile.data.stats.games > 0; } catch (e) { return true; } }
  function startTutorial() {
    lobby(); // makes sure Player 1 is here
    botCount.tutorial = 1;
    FP.UI.wipe(() => startMatch(FP.Modes.tutorial));
  }
  function tutorialDone() {
    state = 'results';
    FP.UI.setHud('');
    let first = false;
    try { first = localStorage.getItem('floppy-tutorial') !== 'done'; localStorage.setItem('floppy-tutorial', 'done'); } catch (e) { /* no saving */ }
    if (first) FP.Profile.earn(100);
    for (const c of chars) if (c.player && c.player.source.kind !== 'bot') { c.cheer = 30; c.expression = 'happy'; c.exprTimer = 30; c.podiumWinner = true; }
    FP.FX.confetti(FP.Camera.target.clone(), 120, 5);
    FP.UI.screen({
      cls: 'setup',
      title: 'Tutorial complete!',
      html: `<div class="champ">${ICON.trophy}</div><p>You can walk, jump, punch, grab, throw and do emotes. <b>You are ready to party!</b></p>${first ? `<p class="coins">${ICON.coin} <b>+100</b> party coins for finishing the tutorial!</p>` : ''}<p class="small">Every mini-game shows its own tips before it starts. Press <kbd>H</kbd> any time to see all the controls.</p>`,
      buttons: [
        { label: `${ICON.play} Let's play!`, action: () => FP.UI.wipe(() => lobby()), cls: 'go' },
        { label: `${ICON.home} Title screen`, action: () => FP.UI.wipe(titleScreen), small: true },
      ],
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
    tourney = null;
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
    if (!players.length) players.push({ id: nextId++, source: FP.Touch.available && dev.kind !== 'pad' ? { kind: 'touch' } : { ...dev }, colorIndex: 0, hat: 'party', outfit: 'overalls', name: savedName(0) || 'Player 1', emotes: savedEmotes(0) });
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
    if (k === 'keys') return `Keyboard: ${esc(FP.Input.label(p.source.map, 'move'))}`;
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
          !taken({ kind: 'keys', map: 0 }) ? `Keyboard left: press ${FP.Input.kbd(0, 'jump')}` : '',
          !taken({ kind: 'keys', map: 1 }) ? `Keyboard right: press ${FP.Input.kbd(1, 'jump')}` : '',
          'Controller: press <kbd>A</kbd>',
        ].filter(Boolean).join('<br>');
        slots.push(`<div class="slot empty"><div class="slot-num">P${i + 1}</div><div class="slot-join">Join the party<small>${hints}</small></div></div>`);
        continue;
      }
      const col = FP.Look.COLORS[p.colorIndex];
      const mine = !client || p.source.kind === 'me';
      const arrows = (act) => (mine ? [`<button class="arrow" data-act="${act}" data-dir="-1" data-i="${i}" title="Previous">${ICON.left}</button>`, `<button class="arrow" data-act="${act}" data-dir="1" data-i="${i}" title="Next">${ICON.right}</button>`] : ['', '']);
      const [cl, cr] = arrows('color'), [hl, hr] = arrows('hat'), [ol, or] = arrows('outfit');
      const [fl, fr] = arrows('face'), [dl, dr] = arrows('dance'), [tl, tr] = arrows('trail'), [pl, pr] = arrows('pet'), [gl, gr] = arrows('tag');
      const local = client ? p.source.kind === 'me' : isLocalSource(p.source);
      slots.push(`<div class="slot${local ? ' slot-mine' : ''}" style="--c:${hex(col.body)};--l:${hex(col.light)}">
        <div class="slot-head"><span class="slot-num">P${i + 1}</span>${!client && isLocalSource(p.source) ? `<span class="slot-lv" title="Your level">Lv ${FP.Profile.levelInfo().level}</span>` : ''}${!client && isLocalSource(p.source) ? `<button class="name-btn" data-act="rename" data-i="${i}" title="Change your name">${esc(p.name)}${ICON.pencil}</button>` : `<b>${esc(p.name)}</b>`}${i > 0 && !client ? `<button class="leave" data-act="remove" data-i="${i}" title="Remove this player">Leave</button>` : ''}</div>
        <div class="slot-body"><div class="slot-row"><span class="lbl">Color</span>${cl}<span class="val"><i class="dot"></i>${col.name}</span>${cr}</div>
        <div class="slot-row"><span class="lbl">Hat</span>${hl}<span class="val">${FP.UI.HAT_NAMES[p.hat]}</span>${hr}</div>
        <div class="slot-row"><span class="lbl">Outfit</span>${ol}<span class="val">${FP.Look.OUTFIT_NAMES[p.outfit || 'none']}</span>${or}</div>
        <div class="slot-row"><span class="lbl">Face</span>${fl}<span class="val">${FP.Style.FACE_NAMES[p.face || 'none']}</span>${fr}</div>
        <div class="slot-row"><span class="lbl">Dance</span>${dl}<span class="val">${FP.Style.DANCE_NAMES[p.dance || 'none']}</span>${dr}</div>
        <div class="slot-row"><span class="lbl">Trail</span>${tl}<span class="val">${FP.Style.TRAIL_NAMES[p.trail || 'none']}</span>${tr}</div>
        <div class="slot-row"><span class="lbl">Pet</span>${pl}<span class="val">${FP.Style.PET_NAMES[p.pet || 'none']}</span>${pr}</div>
        <div class="slot-row"><span class="lbl">Tag</span>${gl}<span class="val">${FP.Style.TAG_NAMES[p.tag || 'none']}</span>${gr}</div>
        ${mine && !client ? `<div class="slot-row"><span class="lbl">Emotes</span><button class="emo-btn" data-act="emotes" data-i="${i}">Change</button></div>` : ''}</div>
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
    else if (['face', 'dance', 'trail', 'pet', 'tag'].includes(act) && p) cycleStyle(p, act, dir);
    else if (act === 'remove' && p) removePlayer(p);
    else if (act === 'rename' && p) renamePlayer(i);
    else if (act === 'emotes' && p) emotePicker(i);
    else if (act === 'start') chooseMode();
    else if (act === 'shop') { lobbyPanel.hidden = true; FP.Profile.shopScreen(() => { FP.UI.closeScreen(); showLobbyPanel(); refreshLobby(); }); }
    else if (act === 'back') { if (FP.Net) FP.Net.leave(); titleScreen(); }
  }
  // click your name in the lobby to type a new one
  function renamePlayer(i) {
    const p = players[i];
    const btn = p && lobbyPanel.querySelector(`[data-act="rename"][data-i="${i}"]`);
    if (!btn) return;
    const input = document.createElement('input');
    input.className = 'name-input'; input.maxLength = 12; input.value = p.name; input.spellcheck = false; input.autocomplete = 'off';
    btn.replaceWith(input);
    input.focus(); input.select();
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      const name = input.value.replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 12);
      if (keep && name && name !== p.name) {
        if (everyone().some((q) => q !== p && q.name.toLowerCase() === name.toLowerCase())) FP.UI.toast('Someone already has that name');
        else { p.name = name; saveName(i, name); spawnInLobby(p); if (FP.Net) FP.Net.playersChanged(); FP.Audio.play('select'); }
      }
      refreshLobby();
    };
    input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') finish(true); else if (e.key === 'Escape') finish(false); });
    input.addEventListener('keyup', (e) => e.stopPropagation());
    input.addEventListener('blur', () => finish(true));
  }
  function cycleColor(p, dir = 1) {
    const n = FP.Look.COLORS.length;
    let c = p.colorIndex;
    // (special colors like Gold only once you unlocked them by leveling up)
    for (let k = 0; k < n; k++) { c = (c + dir + n) % n; const sp = FP.Look.COLORS[c].special; if (sp && !FP.Profile.owns('color:' + sp)) continue; if (!players.some((q) => q !== p && q.colorIndex === c)) break; }
    if (c === p.colorIndex) return;
    const spc = FP.Look.COLORS[c].special;
    if (spc && !FP.Profile.owns('color:' + spc)) return;
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
  const STYLE_ACTS = ['color', 'hat', 'outfit', 'face', 'dance', 'trail', 'pet', 'tag'];
  function cycleStyle(p, what, dir = 1) {
    const L = { face: FP.Style.FACES, dance: FP.Style.DANCES, trail: FP.Style.TRAILS, pet: FP.Style.PETS, tag: FP.Style.TAG_STYLES }[what], n = L.length;
    let i = Math.max(0, L.indexOf(p[what] || 'none'));
    for (let k = 0; k < n; k++) { i = (i + dir + n) % n; if (FP.Profile.owns(what, L[i])) break; }
    if (L[i] === p[what]) { FP.UI.toast(what === 'pet' || what === 'tag' ? 'Level up to unlock more!' : 'Buy more in the Shop!'); return; }
    p[what] = L[i];
    if (what === 'face' || what === 'tag') spawnInLobby(p);
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
  // the mini-game picker has tabs: all games, brawls, sports and party games
  const CATS = [
    { id: 'all', name: 'All games' },
    { id: 'brawl', name: 'Brawl', ids: ['arena', 'bomb', 'hill', 'lava', 'tiles', 'color', 'sweeper', 'crown', 'balloons', 'seats', 'zombie', 'boulder', 'sumo', 'meteor', 'conveyor', 'wall', 'bumpers', 'boxing', 'custom'] },
    { id: 'sports', name: 'Sports', ids: ['soccer', 'dodge', 'race', 'kart', 'bowling', 'hoops', 'golf', 'volley', 'hurdles', 'penalty', 'hockey', 'tug', 'skydive'] },
    { id: 'party', name: 'Party' }, // everything else
  ];
  const catOf = (id) => (CATS.find((c) => c.ids && c.ids.includes(id)) || CATS[3]).id;
  let pickCat = 'all';
  function chooseMode(sel) {
    if (state !== 'lobby' || FP.UI.open()) return;
    if (FP.Net && FP.Net.isClient()) { FP.UI.toast('The host picks the mini-game'); return; }
    state = 'select';
    lobbyPanel.hidden = true;
    const nFun = FP.Fun.list().length;
    const all = MODES(), played = FP.Profile.data.played;
    const list = all.filter((m) => pickCat === 'all' || catOf(m.id) === pickCat);
    const nPlayed = all.filter((m) => played.includes(m.id)).length;
    const setCat = (id, i) => { pickCat = id; FP.UI.closeScreen(); state = 'lobby'; chooseMode(i); };
    FP.UI.screen({
      cls: 'modes',
      title: 'Pick a mini-game',
      html: `<p class="small">You have played <b>${nPlayed}</b> of ${all.length} mini-games${nPlayed < all.length ? '. Play them all for the Explorer achievement!' : '. You played them all!'}</p>`,
      columns: 4,
      // sel: a button number, or a mini-game id (to point at the game you just looked at)
      start: typeof sel === 'number' ? sel : typeof sel === 'string' && list.some((m) => m.id === sel) ? 8 + list.findIndex((m) => m.id === sel) : 8,
      buttons: [
        { label: `${ICON.trophy} Party Tour`, action: tourSetup, cls: 'extra tour' },
        { label: `${ICON.crown} Tournament`, action: tourneySetup, cls: 'extra tour' },
        { label: `${ICON.dice} Surprise me!`, action: surprise, cls: 'extra' },
        { label: `${ICON.sparkle} Fun options${nFun ? ` (${nFun})` : ''}`, action: () => funScreen(backToPicker), cls: 'extra' },
        ...CATS.map((c, i) => ({ label: `${c.name} <small>${c.id === 'all' ? all.length : all.filter((m) => catOf(m.id) === c.id).length}</small>`, action: () => setCat(c.id, 4 + i), cls: 'cat' + (pickCat === c.id ? ' active' : '') })),
        ...list.map((m) => ({ label: `<span class="art">${m.art || ''}</span><b>${m.name}</b><small>${m.desc}</small>${played.includes(m.id) ? `<span class="played" title="You played this one">${ICON.check}</span>` : ''}`, action: () => setupMatch(m), cls: 'mode' })),
        { label: `${ICON.back} Back to the lobby`, action: backToLobby, cls: 'extra wide' },
      ],
      back: backToLobby,
    });
    if (FP.Net) FP.Net.playersChanged();
  }
  function backToPicker(sel) { FP.UI.closeScreen(); state = 'lobby'; chooseMode(typeof sel === 'string' ? sel : undefined); }

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

  // everyone who will play, with their team (new people get Red, Blue, Red, Blue...)
  function teamsFor(m, n) {
    const slots = players.map((p) => ({ key: 'p' + p.id, p })).concat(Array.from({ length: n }, (_, i) => ({ key: 'b' + i, bot: i })));
    const pick = teamPick[m.id] || (teamPick[m.id] = {});
    slots.forEach((sl, i) => { if (pick[sl.key] !== 0 && pick[sl.key] !== 1) pick[sl.key] = i % 2; });
    // each team needs at least one player
    for (const t of [0, 1]) {
      if (slots.length >= 2 && !slots.some((sl) => pick[sl.key] === t)) { const from = slots.filter((sl) => pick[sl.key] !== t).pop(); pick[from.key] = t; }
    }
    return slots.map((sl) => ({ ...sl, team: pick[sl.key] }));
  }
  // quick team buttons: "Mixed" (Red, Blue, Red, Blue) or "Players vs Bots"
  function quickTeams(m, n, how) {
    const pick = teamPick[m.id] = {};
    players.map((p) => 'p' + p.id).concat(Array.from({ length: n }, (_, i) => 'b' + i)).forEach((key, i) => { pick[key] = how === 'pvb' ? (key[0] === 'p' ? 0 : 1) : i % 2; });
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
      const why = min > 0 ? `<p class="small">This game needs at least ${m.minTotal || 2} players, so you need at least ${min} bot${min > 1 ? 's' : ''}.</p>` : '<p class="small">You can play with no bots at all.</p>';
      const teamRow = TEAMABLE.includes(m.id) && (!m.teamOk || m.teamOk()) && total >= 3 ? `<div class="skill"><span class="lbl">Teams</span><button class="chip${!teamPlay[m.id] ? ' on' : ''}" data-team="0">Everyone for themselves</button><button class="chip${teamPlay[m.id] ? ' on' : ''}" data-team="1">Red vs Blue</button></div>` : '';
      // team games: pick who is on which team (tap someone to move them to the other team)
      if ((m.teams || (teamRow && teamPlay[m.id])) && total >= 2) {
        const t = teamsFor(m, n);
        const pill = (sl) => `<button type="button" class="team-pick" data-pick="${sl.key}" title="Move to the other team">${sl.p ? FP.UI.playerPill(sl.p) : `<span class="pill bot">Bot ${sl.bot + 1}</span>`}</button>`;
        const box = (k, name) => `<div class="tp tp-${k ? 'blue' : 'red'}"><b>${name}</b>${t.filter((sl) => sl.team === k).map(pill).join('')}</div>`;
        const pvb = humans().length && n ? `<button type="button" class="chip" data-quick="pvb">Players vs Bots</button>` : '';
        who = `<div class="teams-pick">${box(0, 'Red team')}${box(1, 'Blue team')}</div>
          <div class="skill"><span class="lbl">Teams</span><button type="button" class="chip" data-quick="mix">Mixed</button>${pvb}</div>
          <p class="small">Tap a player or a bot to move them to the other team.</p>`;
      }
      const html = `<div class="setup-art">${m.art || ''}</div><p>${m.desc}</p>${m.setupHtml ? m.setupHtml() : ''}${teamRow}
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
          { label: `${ICON.back} Pick another game`, action: () => backToPicker(m.id), small: true },
        ],
        back: () => backToPicker(m.id),
        onKey: (code) => {
          if (code === 'left') { change(-1); return true; }
          if (code === 'right') { change(1); return true; }
          if (botCount[m.id] > 0 && code === 'up') { moveSkill(1); return true; }
          if (botCount[m.id] > 0 && code === 'down') { moveSkill(-1); return true; }
          return false;
        },
      });
      card.querySelectorAll('[data-bots]').forEach((b) => b.addEventListener('click', () => change(+b.dataset.bots)));
      card.querySelectorAll('[data-pick]').forEach((b) => {
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => {
          const pick = teamPick[m.id], key = b.dataset.pick, from = pick[key];
          const left = teamsFor(m, botCount[m.id]).filter((sl) => sl.team === from).length;
          if (left <= 1) { FP.UI.toast('Each team needs at least 1 player!'); FP.Audio.play('tick'); return; }
          pick[key] = 1 - from;
          FP.Audio.play('menu'); draw();
        });
      });
      card.querySelectorAll('[data-quick]').forEach((b) => {
        b.addEventListener('mousedown', (e) => e.preventDefault());
        b.addEventListener('click', () => { quickTeams(m, botCount[m.id], b.dataset.quick); FP.Audio.play('menu'); draw(); });
      });
      card.querySelectorAll('[data-team]').forEach((b) => { b.addEventListener('mousedown', (e) => e.preventDefault()); b.addEventListener('click', () => { teamPlay[m.id] = b.dataset.team === '1'; FP.Audio.play('menu'); draw(); }); });
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
    if (m && m.base) m = m.base; // (Play again in team mode: start from the real mini-game)
    FP.UI.closeScreen();
    FP.UI.help.hidden = true;
    if (lobbyPanel) lobbyPanel.hidden = true;
    paused = false;
    mode = m;
    const { min, max } = botLimits(m);
    const n = Math.min(max, Math.max(min, botCount[m.id] !== undefined ? botCount[m.id] : min));
    // team mode: the same game, but Red against Blue
    if (teamPlay[m.id] && TEAMABLE.includes(m.id) && (!m.teamOk || m.teamOk()) && humans().length + n >= 3 && !tour && !story && !daily && !tourney) {
      mode = Object.create(m);
      Object.assign(mode, { base: m, teams: true, name: m.name + ': Teams', roundsToWin: Math.max(2, m.roundsToWin) });
    }
    if (tourney && tourney.current) matchBots = [tourney.current.a, tourney.current.b].filter((p) => p.source.kind === 'bot');
    else if (tour) { if (!tour.bots) { makeBots(tour.botCount); tour.bots = matchBots; } matchBots = tour.bots; tour.awarded = false; } else makeBots(n);
    const list = everyone();
    // the teams picked in the setup screen (tours, Story Mode and challenges just take turns: Red, Blue, Red...)
    const picked = mode.teams && !tour && !story && !daily && !tourney ? teamsFor(m, matchBots.length) : null;
    list.forEach((p, i) => {
      if (!mode.teams) { p.team = undefined; return; }
      const key = matchBots.includes(p) ? 'b' + matchBots.indexOf(p) : 'p' + p.id;
      const sl = picked && picked.find((x) => x.key === key);
      p.team = sl ? sl.team : i % 2;
    });
    if (mode.teams && !(list.some((p) => p.team === 0) && list.some((p) => p.team === 1))) list.forEach((p, i) => { p.team = i % 2; }); // (never a team of nobody)
    // each player's place in their team, so teammates don't start on top of each other
    const ranks = [0, 0];
    list.forEach((p) => { p.teamRank = p.team === undefined ? undefined : ranks[p.team]++; });
    scores = {};
    list.forEach((p) => { scores[p.id] = 0; });
    if (mode.teams) scores = { team0: 0, team1: 0 };
    round = 0;
    resetStats();
    FP.Camera.setLift(0);
    // World Tour: Lava Land, the Robot Factory and Outer Space have their own songs (the bosses keep theirs)
    FP.Audio.setSong(story && WORLD_SONGS[story.w] && !isBoss(m.id) ? WORLD_SONGS[story.w] : m.song || 'party');
    if (FP.Net) FP.Net.matchStarted(m.id);
    startRound();
  }

  function startRound() {
    replayBuf = []; replayPending = false; directorWanted = false;
    round++;
    FP.Stage.clear();
    FP.FX.clear();
    clearChars();
    FP.Bots.reset();
    FP.Camera.fix(null);
    outTimers = [];
    FP.Fun.hazard = null; // (a mini-game can switch on a hazard when it builds, like the Knockout Arena)
    const list = everyone();
    mode.build(list);
    list.forEach((p, i) => makeChar(p, mode.spawn(i, list.length, p)));
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
    timer = 0;
    if (FP.Net) FP.Net.roundStarted();
    FP.bus.emit('roundStart', round);
    if (round === 1 && humans().length && !api.skipIntro && !mode.noIntro && !tourney) showIntro();
    else goCountdown();
  }

  function goCountdown() {
    state = 'countdown';
    count = 3.99;
    let sub = mode.desc;
    if (round > 1) sub = matchPointText() || sub;
    const title = mode.rounds ? `${round === mode.rounds ? 'Final ' + (mode.roundName || 'Round').toLowerCase() : `${mode.roundName || 'Round'} ${round}`}` : mode.roundsToWin > 1 && !mode.single ? `Round ${round}` : mode.name;
    FP.UI.big(title, 1.2, sub);
  }
  // "Match point for Pickle!": someone wins the whole game if they win this round
  function matchPointText() {
    if (mode.single || mode.rounds || mode.roundsToWin < 2) return '';
    const need = mode.roundsToWin - 1;
    if (mode.teams) {
      const t = [0, 1].filter((k) => scores['team' + k] === need);
      return t.length === 2 ? 'Match point for both teams!' : t.length ? `Match point for ${t[0] === 0 ? 'Red' : 'Blue'}!` : '';
    }
    const who = everyone().filter((p) => scores[p.id] === need);
    if (!who.length) return '';
    return who.length === 1 ? `Match point for ${who[0].name}!` : who.length === 2 ? `Match point for ${who[0].name} and ${who[1].name}!` : 'Match point for everyone!';
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
    ufo: ['Run from the green tractor beam', 'Red stripes on the floor? Step out before the ZAP', 'When the UFO lands, PUNCH the lights on its edge'],
    custom: ['Build arenas in the Level Editor', 'Jump pads launch you high', 'Lava and falling off = out!'],
    water: ['PUNCH to lob a water balloon', 'Out? Refill at your team\'s water tap', 'Getting wet makes you slippery!'],
  };
  const INTRO_TIME = 15;
  let ready = new Set(), introT = 0;
  function introHtml(withButton) {
    const tips = TIPS[mode.id] || [];
    const left = Math.max(0, Math.ceil(INTRO_TIME - introT));
    const who = humans().map((p) => `<span class="ready-pill${ready.has(p.id) ? ' ok' : ''}">${FP.UI.playerPill(p)}${ready.has(p.id) ? ICON.check : `<small>${p.source.kind === 'touch' ? 'tap Start' : 'press jump'}</small>`}</span>`).join('');
    const allTouch = humans().length && humans().every((p) => p.source.kind === 'touch');
    return `<div class="intro-grid"><div class="setup-art">${mode.art || ''}</div><div class="intro-text"><p class="goal">${mode.desc}</p><ul class="tips">${tips.map((t) => `<li>${t}</li>`).join('')}</ul></div></div>
      ${keysRow()}
      <div class="ready-row">${who}</div>
      <p class="small">${allTouch ? 'Tap <b>Start now</b>' : 'Press <b>JUMP</b>'} when you're ready! Starting in <b class="intro-timer">${left}</b>...</p>
      ${withButton ? `<button class="btn go" data-start>${ICON.play} Start now</button>` : ''}`;
  }
  // the controls, for whatever everyone is playing with (keyboard, controller or touch screen)
  function keysRow() {
    const kinds = new Set(humans().map((p) => p.source.kind));
    const rows = [];
    const K = FP.Input.kbd, L = FP.Input.label;
    if (kinds.has('keys') || !kinds.size) rows.push(`<div class="keys-row"><span>${K(0, 'move')} move</span><span>${K(0, 'jump')} jump</span><span>${K(0, 'punch')} punch</span><span>${K(0, 'grab')} grab</span><span>${K(0, 'grabL')}${K(0, 'grabR')} one hand</span><span class="small">(player 2: ${esc([L(1, 'move'), L(1, 'jump'), L(1, 'punch'), L(1, 'grab')].join(' '))})</span></div>`);
    if (kinds.has('pad')) rows.push(`<div class="keys-row"><span><kbd>Stick</kbd> move</span><span><kbd>A</kbd> jump</span><span><kbd>X</kbd> punch</span><span><kbd>LB</kbd>+<kbd>RB</kbd> grab</span><span><kbd>LB</kbd> or <kbd>RB</kbd> one hand</span></div>`);
    if (kinds.has('touch')) rows.push('<div class="keys-row"><span>Use the joystick and the buttons on the screen</span></div>');
    return rows.join('');
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
      else if (src.kind === 'keys' || src.kind === 'pad' || src.kind === 'touch') pressed = FP.Input.read(src, p.id).jumpPressed;
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
    FP.bus.emit('out', { c, by });
    // some games move players who are out away from the action after a moment
    if (mode && mode.removeOut) outTimers.push({ c, t: mode.removeOut });
    FP.FX.puffs(c.parts.torso.position, 12, 0xffffff, 4, 1.5);
    const s = statOf(c); if (s) s.outs++;
  }

  // ------------------------------------------------------------
  //  HIT-STOP AND MATCH AWARDS (fun prizes at the end of a game:
  //  most punches, most knockouts, most throws...)
  // ------------------------------------------------------------
  function hitStop(t) {
    if (!['play', 'lobby'].includes(state) || (FP.Net && FP.Net.isClient())) return;
    const now = performance.now();
    if (now - lastStop < 220) return; // not too often, or a big brawl would stutter
    lastStop = now;
    hitstop = Math.max(hitstop, t);
  }
  // the coin counter in the lobby updates right away
  FP.bus.on('coins', () => { if (state === 'lobby' && lobbyPanel && !lobbyPanel.hidden && !lobbyPanel.querySelector('.name-input')) refreshLobby(); });
  let matchStats = {};
  function resetStats() { matchStats = {}; everyone().forEach((p) => { matchStats[p.id] = { hits: 0, kos: 0, throws: 0, knocked: 0, grabs: 0, jumps: 0, outs: 0 }; }); }
  const statOf = (c) => (c && c.player && state === 'play' && !(FP.Net && FP.Net.isClient()) ? matchStats[c.player.id] || null : null);
  FP.bus.on('punchHit', (e) => {
    if (!e || !e.by) return;
    if (e.victim && e.victim !== e.by) { const s = statOf(e.by); if (s) s.hits++; }
    hitStop(0.05);
  });
  FP.bus.on('knockOut', (c) => {
    if (!c || !c.parts) return;
    const s = statOf(c); if (s) s.knocked++;
    const by = c.lastHitBy;
    if (by && by !== c && performance.now() - c.lastHitTime < 3000) { const b = statOf(by); if (b) b.kos++; }
    hitStop(0.09);
    // knocked out the King of the Party: +1 party point (up to 3 per game)
    if (state === 'play' && tour && tour.king && c.player === tour.king && by && by !== c && by.player && performance.now() - c.lastHitTime < 3000 && tour.kingKos < 3) {
      tour.kingKos++;
      tour.bonus[by.player.id] = (tour.bonus[by.player.id] || 0) + 1;
      FP.UI.toast(`${by.player.name} knocked out the King! +1 party point`, 2.2);
      if (FP.Profile.isLocal(by)) FP.Profile.unlock('regicide');
      FP.Audio.play('ding');
    }
  });
  FP.bus.on('throw', (e) => { if (e && e.who && e.who.bodies) { const s = statOf(e.by); if (s) s.throws++; } });
  FP.bus.on('grab', (e) => { if (e && e.victim) { const s = statOf(e.by); if (s) s.grabs++; } });
  FP.bus.on('jump', (c) => { const s = statOf(c); if (s) s.jumps++; });

  const aIco = (inner) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;
  const AWARDS = [
    { k: 'kos', min: 2, name: 'Knockout King', text: (n) => `${n} knockouts`, icon: aIco('<path d="M12 1.5l2.2 5 5.3-1.8-1.9 5.2 5 2.3-5 2.2 1.9 5.3-5.3-1.9L12 22.5l-2.2-4.7-5.3 1.9 1.9-5.3-5-2.2 5-2.3-1.9-5.2 5.3 1.8z" fill="#ffcf33" stroke="#2a2140" stroke-width="1.5" stroke-linejoin="round"/><path d="M8.6 9.5v5M8.6 12l2.4-2.5M8.6 12l2.4 2.5" stroke="#2a2140" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="14.6" cy="12" r="2.2" fill="none" stroke="#2a2140" stroke-width="1.5"/>') },
    { k: 'hits', min: 4, name: 'Punch Machine', text: (n) => `${n} punches landed`, icon: aIco('<path d="M5 10.5a6.5 6.5 0 0 1 13 0V14a5 5 0 0 1-5 5H9a4 4 0 0 1-4-4z" fill="#ff5a5f" stroke="#2a2140" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 9.5c1.5-1.2 3.5-1.2 5 0" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".7"/><rect x="7" y="18" width="10" height="4.2" rx="1.4" fill="#fff" stroke="#2a2140" stroke-width="1.6"/>') },
    { k: 'throws', min: 1, name: 'Yeet Master', text: (n) => `${n} throw${n > 1 ? 's' : ''}`, icon: aIco('<path d="M4 19c1-7 6-11 13-11" fill="none" stroke="#6fd35a" stroke-width="3.2" stroke-linecap="round"/><path d="M14 4l5 4-5 4" fill="none" stroke="#2a2140" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="5" cy="19" r="2.2" fill="#2a2140"/>') },
    { k: 'knocked', min: 2, name: 'Frequent Flyer', text: (n) => `knocked out ${n} times`, icon: aIco('<path d="M2.5 11.5L21 4l-6 16-3.5-6.5z" fill="#4aa8ff" stroke="#2a2140" stroke-width="1.6" stroke-linejoin="round"/><path d="M11.5 13.5L21 4" stroke="#2a2140" stroke-width="1.5"/>') },
    { k: 'grabs', min: 3, name: 'Big Hugger', text: (n) => `${n} grabs`, icon: aIco('<path d="M12 20.5S3 15 3 9a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 6-9 11.5-9 11.5z" fill="#ff7eb6" stroke="#2a2140" stroke-width="1.7" stroke-linejoin="round"/>') },
    { k: 'jumps', min: 12, name: 'Bunny Hopper', text: (n) => `${n} jumps`, icon: aIco('<path d="M5 13l7-6 7 6M5 19l7-6 7 6" fill="none" stroke="#9b6bff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>') },
    { k: 'peace', name: 'Peacemaker', text: () => 'never landed a punch', icon: aIco('<path d="M12 21C5 18 3 12 5 4c7 0 12 4 12 10a7 7 0 0 1-5 7z" fill="#8fd46a" stroke="#2a2140" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 21c-1-6-3-10-6-15" fill="none" stroke="#2a2140" stroke-width="1.5" stroke-linecap="round"/>') },
  ];
  // up to 3 prizes, each to a different player (and no prize if two players are tied)
  function pickAwards(list) {
    const out = [], used = new Set(), val = (p, k) => (matchStats[p.id] ? matchStats[p.id][k] : 0);
    for (const a of AWARDS) {
      if (out.length >= 3) break;
      if (a.k === 'peace') {
        if (Math.max(0, ...list.map((p) => val(p, 'hits'))) < 5) continue;
        const peaceful = list.filter((p) => matchStats[p.id] && val(p, 'hits') === 0 && val(p, 'jumps') + val(p, 'grabs') > 0);
        if (peaceful.length === 1 && !used.has(peaceful[0].id)) { used.add(peaceful[0].id); out.push({ a, p: peaceful[0], n: 0 }); }
        continue;
      }
      const sorted = list.map((p) => [p, val(p, a.k)]).sort((x, y) => y[1] - x[1]);
      if (!sorted.length || sorted[0][1] < a.min || (sorted[1] && sorted[1][1] === sorted[0][1]) || used.has(sorted[0][0].id)) continue;
      used.add(sorted[0][0].id);
      out.push({ a, p: sorted[0][0], n: sorted[0][1] });
    }
    return out;
  }
  function awardsHtml(list) {
    const aw = pickAwards(list);
    if (!aw.length) return '';
    return `<div class="awards"><h3>Awards</h3>${aw.map((w, i) => `<div class="award" style="--k:${i}"><span class="award-ico">${w.a.icon}</span><b>${w.a.name}</b>${FP.UI.playerPill(w.p)}<small>${w.a.text(w.n)}</small></div>`).join('')}</div>`;
  }

  function endRound(res) {
    state = 'roundOver';
    timer = 0;
    // the final knockout happens in slow motion, with the camera zooming in
    const finalKO = !mode.single && res.winners && res.winners.length === 1 && chars.some((c) => !c.alive);
    if (finalKO) {
      slowmo = 1.2;
      FP.Camera.zoomTo(0.7);
      FP.Audio.play('whoosh');
    }
    let text = 'Nobody wins!';
    // team games: if all the winners are on one team, that team wins the round
    if (mode.teams && res.team === undefined && res.winners && res.winners.length && res.winners.every((c) => c.team === res.winners[0].team) && res.winners[0].team !== undefined) res.team = res.winners[0].team;
    roundWinners = (res.winners || []).map((c) => c.player && c.player.id);
    const center = new THREE.Vector3();
    if (mode.teams && res.team !== undefined) {
      scores['team' + res.team] += res.points ?? 1;
      text = `${res.team === 0 ? 'Red' : 'Blue'} team wins!`;
    } else if (res.winners && res.winners.length) {
      res.winners.forEach((c, i) => { if (!mode.single && !mode.rounds) scores[c.player.id] = (scores[c.player.id] || 0) + 1; c.cheer = 3.5; c.expression = 'happy'; c.exprTimer = 3.5; setTimeout(() => FP.Audio.voice(c, 'yay'), 300 + i * 150); });
      text = res.winners.length === 1 ? `${res.winners[0].name} wins${mode.roundsToWin > 1 ? ' the round' : ''}!` : 'Winners!';
      const t = res.winners[0].parts.torso.position;
      center.set(t.x, t.y, t.z);
    }
    if (res.text) text = res.text;
    // the knockout that wins the whole match gets a slow-motion replay
    if (finalKO && matchOver() && !mode.render && FP.Settings.get('replays') !== false && replayBuf.length > 60) replayPending = true;
    FP.UI.big(text, 2.8, res.sub || '');
    FP.FX.confetti(center);
    FP.Audio.play('win');
    FP.Audio.play('cheer');
    if (FP.Net) FP.Net.banner(text, res.sub || '');
  }

  // ------------------------------------------------------------
  //  BETWEEN ROUNDS: a little scoreboard (who has how many crowns)
  // ------------------------------------------------------------
  let boardEl = null, roundWinners = [];
  function showBoard() {
    if (!boardEl) { boardEl = FP.UI.el('div', 'round-board'); FP.UI.root.append(boardEl); }
    let rows;
    if (mode.teams) rows = `<div class="rb-teams"><span class="pill team0">Red ${scores.team0}</span><span class="rb-dash">to</span><span class="pill team1">Blue ${scores.team1}</span></div>`;
    else {
      const crowns = !mode.rounds && !mode.scoreLabel && mode.roundsToWin <= 5;
      rows = everyone().slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0)).map((p) => {
        const s = scores[p.id] || 0;
        const marks = crowns ? Array.from({ length: mode.roundsToWin }, (_, i) => `<span class="rb-crown${i < s ? ' on' : ''}${i === s - 1 && roundWinners.includes(p.id) ? ' new' : ''}">${ICON.crown}</span>`).join('')
          : `<b class="rb-num">${mode.scoreLabel ? mode.scoreLabel(s) : s}</b>`;
        return `<div class="rb-row">${FP.UI.playerPill(p)}<span class="rb-marks">${marks}</span></div>`;
      }).join('');
    }
    const goal = mode.rounds ? `Next: ${mode.roundName || 'Round'} ${round + 1} of ${mode.rounds}` : `First to ${mode.roundsToWin} wins`;
    boardEl.innerHTML = `<div class="rb-card"><div class="rb-title">Scores</div>${rows}<div class="rb-goal">${goal}</div></div>`;
    boardEl.hidden = false;
    if (roundWinners.length && !mode.teams) setTimeout(() => { if (state === 'roundOver') FP.Audio.play('ding'); }, 380);
  }
  const hideBoard = () => { if (boardEl) boardEl.hidden = true; };

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
    S.island(0, -1, 0, 16, 2, 10, { grass: FP.Season.grass || 0x9bd46e, dirt: FP.Season.dirt });
    FP.Season.decorate([[-6.8, -1.5, 0.4], [6.6, -1.2, -0.3], [5.4, 3.2, -0.5]]);
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
    // everyone else stands off to the left (where they don't hide the podium)
    const left = places[1] && places[1].length ? -2.7 - Math.max(2.2, places[1].length * 1.15) / 2 - 0.4 : -2;
    (places[3] || []).forEach((p, k) => spots.set(p.id, { x: left - k * 0.95, y: 0, z: 1.6 + k * 0.45 }));
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
    if (FP.Audio.song === 'silent') FP.Audio.setSong('party');
    const byId = (id) => players.find((p) => p.id === id) || { id };
    buildPodium((placeIds || []).map((g) => g.map(byId)));
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
  }

  function results() {
    if (mode.id === 'tutorial') { tutorialDone(); return; }
    if (FP.Audio.song === 'silent') FP.Audio.setSong('party'); // (Musical Chairs stops the music: bring it back for the podium)
    state = 'results';
    FP.UI.setHud('');
    const list = everyone();
    const places = placesOf(list);
    // party coins and achievements (for players on this computer)
    const got = FP.Profile.matchEnded({ mode, places, skill: botSkill, funCount: FP.Fun.list().length, bots: matchBots.length, online: !!(FP.Net && FP.Net.isHost()), extra: { survivor: mode.lastSurvivor } });
    dailyFinished(places);
    storyFinished(places);
    // weekly challenges (for players on this computer)
    const localHere = list.filter((p) => isLocalSource(p.source));
    if (localHere.length) FP.Weekly.matchEnded({ mode, won: places.length > 1 && places[0].some((p) => localHere.includes(p)), skill: botSkill, bots: matchBots.length });
    const placeOf = (p) => places.findIndex((g) => g.includes(p));
    const awardsBlock = awardsHtml(list);
    const nAwards = (awardsBlock.match(/class="award"/g) || []).length;
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
        `<div class="podium">${sorted.map((p) => { const i = placeOf(p) < 3 ? placeOf(p) : sorted.indexOf(p); return `<div class="place p${i}" style="--k:${sorted.indexOf(p)}"><span class="medal m${i}">${medals[i]}</span>${FP.UI.playerPill(p)}<b>${label(scores[p.id] || 0)}</b>${earn(p)}</div>`; }).join('')}</div>`;
    }
    html += awardsBlock;
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
        const lost = places.length > 1 && placeOf(p) === places.length - 1 && !win;
        c.cheer = win ? 30 : 0; c.expression = win ? 'happy' : lost ? 'sad' : 'oh'; c.exprTimer = win ? 30 : lost ? 30 : 2;
      }
      FP.Camera.snap(chars.map(FP.Ragdoll.center));
      for (let i = 0; i < nAwards; i++) setTimeout(() => { if (state === 'results') FP.Audio.play('ding'); }, 950 + i * 220);
      // coins for you, or an "aww" if nobody on this computer won
      const localP = list.filter((p) => ['keys', 'pad', 'touch'].includes(p.source.kind));
      if (Object.keys(got).length) setTimeout(() => { if (state === 'results') FP.Audio.play('coin'); }, 650);
      if (localP.length && places.length > 1 && !places[0].some((p) => localP.includes(p))) setTimeout(() => { if (state === 'results') FP.Audio.play('aww'); }, 400);
      if (FP.Net) FP.Net.podium(places.map((g) => g.map((p) => p.id)));
      if (tourney && tourney.current) { tourneyResults(html, places); return; }
      if (tour) { tourResults(html, netHtml); return; }
      if (story) { storyResults(html); return; }
      FP.UI.screen({
        cls: 'results',
        title: `${mode.name}: results`,
        html,
        buttons: [
          { label: `${ICON.again} Play again <span class="vote-count" data-v="again"></span>`, action: () => FP.UI.wipe(() => startMatch(mode)) },
          { label: `${ICON.grid} Another mini-game <span class="vote-count" data-v="new"></span>`, action: () => FP.UI.wipe(() => { lobby(); chooseMode(); }) },
          { label: `${ICON.home} Back to the lobby`, action: () => FP.UI.wipe(() => lobby()), small: true },
        ],
      });
      if (FP.Net) FP.Net.results(netHtml, true); // (friends can vote: play again or a new game)
    });
  }

  function hudHtml() {
    if (!mode) return '';
    const extra = mode.hud ? mode.hud() : '';
    let pills;
    if (mode.noPills) pills = '';
    else if (mode.teams) {
      pills = `<span class="pill team0">Red ${scores.team0}</span><span class="pill team1">Blue ${scores.team1}</span>`;
    } else {
      pills = everyone().map((p) => {
        const c = chars.find((ch) => ch.player === p);
        const s = scores[p.id] || 0;
        const score = mode.scoreLabel ? ` <b>${mode.scoreLabel(s)}</b>` : (s ? ` <span class="crowns">${ICON.crown.repeat(s)}</span>` : '');
        return FP.UI.playerPill(p, `${score}${c && c.alive === false ? ` <span class="outmark">${ICON.out}</span>` : ''}`);
      }).join('');
    }
    const goal = (mode.rounds ? ` <small>${mode.roundName || 'Round'} ${round} of ${mode.rounds}</small>` : mode.roundsToWin > 1 && !mode.single ? ` <small>first to ${mode.roundsToWin}</small>` : '') + (tour ? ` <small>Party Tour ${tour.index + 1} of ${tour.games.length}</small>` : '') + (story && story.speed && speedRun ? ` <small class="speed-clock">${speedFmt(speedRun.t)}</small>` : '') + (tour && tour.king && everyone().includes(tour.king) ? ` <small class="king-line" data-king="${tour.king.id}">${ICON.crown} King: ${esc(tour.king.name)}</small>` : '');
    return `<div class="modename">${mode.name}${goal}</div>${pills ? `<div class="pills">${pills}</div>` : ''}${extra ? `<div class="extra${mode.hudClass ? ' ' + mode.hudClass : ''}">${extra}</div>` : ''}`;
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
        <div class="skill"><span class="lbl">King of the Party</span><button class="chip${tourOpts.king ? ' on' : ''}" data-king="1">On</button><button class="chip${tourOpts.king ? '' : ' on'}" data-king="0">Off</button></div>
        ${tourOpts.king ? '<p class="small">The leader wears a big crown. Knock out the King for <b>+1</b> party point!</p>' : ''}
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
      card.querySelectorAll('[data-king]').forEach((b) => b.addEventListener('click', () => { tourOpts.king = b.dataset.king === '1'; FP.Audio.play('menu'); draw(); }));
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
    tour = { games, index: 0, points: {}, bots: null, botCount: tourOpts.bots, awarded: false, kingOn: tourOpts.king, king: null, bonus: {}, kingKos: 0 };
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
    // King of the Party: +1 for the King if they win, +1 for everyone who knocked out the King
    if (tour.kingOn && tour.king && list.includes(tour.king) && got[tour.king.id] === 4) tour.bonus[tour.king.id] = (tour.bonus[tour.king.id] || 0) + 1;
    list.forEach((p) => { got[p.id] += tour.bonus[p.id] || 0; tour.points[p.id] = (tour.points[p.id] || 0) + got[p.id]; });
    tour.bonus = {}; tour.kingKos = 0;
    // the new King: the one leader (nobody if there's a tie)
    const top = Math.max(...list.map((p) => tour.points[p.id] || 0));
    const leaders = list.filter((p) => (tour.points[p.id] || 0) === top);
    const was = tour.king;
    tour.king = tour.kingOn && leaders.length === 1 ? leaders[0] : null;
    if (tour.king && tour.king !== was) tour.newKing = true;
    return got;
  }

  function tourTable(got) {
    const list = everyone().slice().sort((a, b) => (tour.points[b.id] || 0) - (tour.points[a.id] || 0));
    return `<div class="tour-table">${list.map((p, i) => `<div class="tour-row"><span class="medal m${i}">${['1st', '2nd', '3rd'][i] || `${i + 1}th`}</span>${FP.UI.playerPill(p, tour.king === p ? ` <span class="crowns">${ICON.crown}</span>` : '')}<b>${tour.points[p.id] || 0}</b>${got ? `<span class="plus">+${got[p.id]}</span>` : ''}</div>`).join('')}</div>`;
  }
  const tourList = () => `<div class="tour-list">${tour.games.map((id, i) => `<span class="${i < tour.index ? 'done' : i === tour.index ? 'now' : ''}">${FP.Modes[id].name}</span>`).join('')}</div>`;

  function tourResults(gameHtml, netGameHtml = gameHtml) {
    const got = tour.awarded ? null : tourAward();
    tour.awarded = true;
    const last = tour.index >= tour.games.length - 1;
    const kingLine = tour.king && !last ? `<p class="small">${ICON.crown} <b>${esc(tour.king.name)}</b> is the King of the Party${tour.newKing ? ' now' : ''}! Knock them out for +1 point.</p>` : '';
    tour.newKing = false;
    const html = `${gameHtml}<h2>Party points</h2>${tourTable(got)}${kingLine}${tourList()}`;
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
    if (FP.Net) FP.Net.results(`${netGameHtml}<h2>Party points</h2>${tourTable(got)}${kingLine}${tourList()}`);
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
    if (champs.some((p) => ['keys', 'pad', 'touch'].includes(p.source.kind))) { FP.Profile.unlock('champion'); FP.Profile.earn(100); FP.UI.toast('Party Champion bonus: +100 coins!', 3); }
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
  //  TOURNAMENT: 8 players in a bracket (bots fill the empty spots).
  //  Win your match to move on: quarterfinals, semifinals, final!
  //  When two bots meet, their match is decided in a flash.
  // ------------------------------------------------------------
  const TOURNEY_GAMES = ['arena', 'sumo', 'bumpers', 'tiles', 'color', 'sweeper', 'meteor', 'boxing', 'conveyor', 'wall'];
  let tourney = null;
  const pickGame = () => TOURNEY_GAMES[Math.floor(Math.random() * TOURNEY_GAMES.length)];
  function tourneySetup() {
    if (FP.Net && (FP.Net.isHost() || FP.Net.isClient())) { FP.UI.toast('The Tournament works when you are not online'); return; }
    const draw = () => {
      const html = `<div class="champ">${ICON.crown}</div><p>8 players in a bracket. Every match is <b>1 against 1</b> in a random mini-game. Win to move on to the semifinals, then the <b>final</b>! Bots fill the empty spots.</p>
        <div class="skill"><span class="lbl">Bot skill</span>${FP.Bots.SKILL_ORDER.map((id) => `<button class="chip${id === botSkill ? ' on' : ''}" data-skill="${id}">${skillStars(id)}${FP.Bots.SKILLS[id].name}</button>`).join('')}</div>
        <p class="small">Players: ${humans().map((p) => esc(p.name)).join(', ')} and ${8 - humans().length} bots.</p>`;
      const card = FP.UI.screen({
        cls: 'setup', title: 'Tournament', html,
        buttons: [{ label: `${ICON.play} Start the tournament`, action: startTourney, cls: 'go' }, { label: `${ICON.back} Back`, action: backToPicker, small: true }],
        back: backToPicker,
      });
      card.querySelectorAll('[data-skill]').forEach((b) => b.addEventListener('click', () => { botSkill = b.dataset.skill; FP.Audio.play('menu'); draw(); }));
    };
    draw();
  }
  function startTourney() {
    const h = humans().slice(0, 8);
    makeBots(8 - h.length);
    const people = h.concat(matchBots);
    for (let i = people.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [people[i], people[j]] = [people[j], people[i]]; }
    const first = [];
    for (let i = 0; i < 8; i += 2) first.push({ a: people[i], b: people[i + 1], w: null, game: pickGame() });
    tourney = { people, rounds: [first, [], []], r: 0, current: null, champion: null };
    matchBots = [];
    FP.UI.wipe(bracketScreen);
  }
  const nextTourneyMatch = () => tourney.rounds[tourney.r].find((m) => !m.w);
  function advanceTourney() {
    const R = tourney.rounds[tourney.r];
    if (R.some((m) => !m.w)) return;
    if (tourney.r === 2) { tourney.champion = R[0].w; return; }
    const next = [];
    for (let i = 0; i < R.length; i += 2) next.push({ a: R[i].w, b: R[i + 1].w, w: null, game: pickGame() });
    tourney.r++; tourney.rounds[tourney.r] = next;
  }
  // the island behind the bracket (like the lobby, but the tournament keeps going)
  function tourneyWorld() {
    FP.UI.closeScreen();
    state = 'select'; paused = false; mode = null; matchBots = [];
    FP.UI.setHud('');
    FP.Audio.setSong('party');
    FP.Camera.setLift(1.6);
    buildLobbyIsland();
    clearChars();
    players.forEach((p) => { p.team = undefined; spawnInLobby(p); });
    FP.Camera.snap(chars.map(FP.Ragdoll.center));
    if (lobbyPanel) lobbyPanel.hidden = true;
  }
  function bracketScreen() {
    tourneyWorld();
    if (tourney.champion) { tourneyChampion(); return; }
    const pill = (p, m) => `<span class="br-p${m && m.w === p ? ' win' : m && m.w ? ' lose' : ''}">${FP.UI.playerPill(p)}</span>`;
    const match = (m) => `<div class="br-m${m === nextTourneyMatch() ? ' now' : ''}">${pill(m.a, m)}${pill(m.b, m)}<small>${FP.Modes[m.game].name}</small></div>`;
    const col = (i, title) => `<div class="br-col"><h3>${title}</h3><div class="br-list">${(tourney.rounds[i] || []).map(match).join('') || '<div class="br-m tbd">?</div>'}</div></div>`;
    const m = nextTourneyMatch();
    const human = m && [m.a, m.b].some((p) => p.source.kind !== 'bot');
    FP.UI.screen({
      cls: 'tourney', title: 'Tournament',
      html: `<div class="bracket">${col(0, 'Quarterfinals')}${col(1, 'Semifinals')}${col(2, 'Final')}</div>`,
      buttons: [
        { label: `${ICON.play} ${human ? `Play: ${esc(m.a.name)} vs ${esc(m.b.name)} in ${FP.Modes[m.game].name}` : 'Next: the bots play their matches'}`, action: playTourneyMatch, cls: 'go' },
        { label: `${ICON.home} Quit the tournament`, action: () => FP.UI.wipe(() => lobby()), small: true },
      ],
      back: () => {},
    });
  }
  function playTourneyMatch() {
    const m = nextTourneyMatch();
    if (!m) return;
    const botsOnly = (x) => x && ![x.a, x.b].some((p) => p.source.kind !== 'bot');
    if (botsOnly(m)) {
      // two bots: decided in a flash (all the bot matches in a row, until a player has to play)
      const lines = [];
      for (let x = m; botsOnly(x) && !tourney.champion; x = nextTourneyMatch()) {
        x.w = Math.random() < 0.5 ? x.a : x.b;
        lines.push(`${x.w.name} beats ${(x.w === x.a ? x.b : x.a).name}`);
        advanceTourney();
      }
      FP.UI.toast(lines.join('. ') + '!', 2.8);
      FP.Audio.play('ding');
      bracketScreen();
      return;
    }
    tourney.current = m;
    FP.UI.wipe(() => startMatch(FP.Modes[m.game]));
  }
  function tourneyResults(gameHtml, places) {
    const m = tourney.current;
    const top = places[0] || [];
    m.w = top.length === 1 ? top[0] : top.length ? top[Math.floor(Math.random() * top.length)] : Math.random() < 0.5 ? m.a : m.b;
    const stage = ['quarterfinal', 'semifinal', 'final'][tourney.r];
    advanceTourney();
    FP.UI.screen({
      cls: 'results', title: `${mode.name}: results`,
      html: `<p class="winner">${esc(m.w.name)} wins the ${stage}!</p>${gameHtml}`,
      buttons: [{ label: `${ICON.play} ${tourney.champion ? 'Who is the champion?' : 'Back to the bracket'}`, action: () => { tourney.current = null; FP.UI.wipe(bracketScreen); }, cls: 'go' }],
    });
  }
  function tourneyChampion() {
    const p = tourney.champion, mine = p.source.kind !== 'bot';
    FP.Audio.play('win'); FP.Audio.play('cheer');
    FP.FX.confetti(FP.Camera.target.clone(), 180, 6);
    let c = chars.find((q) => q.player === p);
    if (!c) { c = makeChar(p, { x: 0, y: 0.1, z: 3, yaw: 0 }); FP.Camera.snap(chars.map(FP.Ragdoll.center)); } // (a bot champion comes to the island too)
    if (c) { c.cheer = 30; c.expression = 'happy'; c.exprTimer = 30; c.podiumWinner = true; }
    if (mine) { FP.Profile.earn(150); FP.Profile.addXp(100); FP.Profile.unlock('tourney'); }
    FP.UI.screen({
      cls: 'results', title: 'Tournament Champion!',
      html: `<div class="champ">${ICON.trophy}</div><p class="winner">${esc(p.name)} is the Tournament Champion!</p>${mine ? `<p>${ICON.coin} <b>+150</b> party coins and <b>+100</b> XP!</p>` : '<p>A bot won this time. Try again!</p>'}`,
      buttons: [
        { label: `${ICON.again} New tournament`, action: () => { tourney = null; startTourney(); }, cls: 'go' },
        { label: `${ICON.home} Back to the lobby`, action: () => FP.UI.wipe(() => lobby()), small: true },
      ],
    });
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
      <p class="small">Your streak: <b>${streak}</b> day${streak === 1 ? '' : 's'} in a row.</p>${FP.Weekly.html()}`;
    FP.UI.screen({ cls: 'setup daily', title: 'Challenges', html: `<h2 class="daily-h">Today: ${esc(ch.name)}</h2>` + html.replace(`<h2>${esc(ch.name)}</h2>`, ''), buttons: [{ label: `${ICON.play} Play today's challenge`, action: () => startDaily(ch), cls: 'go' }, { label: `${ICON.back} Back`, action: titleScreen, small: true }], back: titleScreen });
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
    { name: 'Outer Space', levels: ['skydive', 'boulder', 'bumpers', 'ufo'] },
  ];
  const BOSSES = ['boss', 'ufo'];
  const WORLD_SONGS = { 3: 'lava', 4: 'factory', 5: 'space' };
  const isBoss = (id) => BOSSES.includes(id);
  const STORY_PRIZES = [
    { stars: 10, id: 'face:mask' }, { stars: 20, id: 'trail:gold' }, { stars: 30, id: 'outfit:knight' }, { stars: 45, id: 'dance:champ' }, { boss: 'boss', id: 'robot' }, { boss: 'ufo', id: 'alien' },
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
    const prizes = STORY_PRIZES.map((p) => `<span class="prize${FP.Profile.owns(p.id) ? ' got' : ''}">${FP.Profile.owns(p.id) ? ICON.check : p.boss ? ICON.trophy : ICON.star} ${p.boss ? (p.boss === 'ufo' ? 'Beat the UFO' : 'Beat the robot') : p.stars}: <b>${FP.Profile.itemName(p.id)}</b></span>`).join('');
    const buttons = [];
    WORLDS.forEach((W, w) => W.levels.forEach((id, l) => {
      const m = FP.Modes[id], open = levelOpen(d, w, l), st = d.stars[levelKey(w, l)] | 0;
      buttons.push({
        label: `<span class="lv-num">${w + 1}-${l + 1}</span>${open ? `<span class="lv-art">${m.art || ''}</span><b>${m.name}</b>${starRow(st)}` : `<span class="lv-lock">${LOCK}</span><b>Locked</b><small>Beat ${l > 0 ? `${w + 1}-${l}` : `${w}-4`} first</small>`}`,
        cls: `level w${w}${open ? '' : ' locked'}${isBoss(id) ? ' boss' : ''}`,
        action: () => (open ? storyLevel(w, l) : FP.UI.toast('Win the level before this one to open it!', 2.2)),
      });
    }));
    buttons.push({ label: `${ICON.clock} Speedrun`, action: speedrunScreen, small: true, cls: 'wide' });
    buttons.push({ label: `${ICON.back} Back`, action: titleScreen, small: true, cls: 'wide' });
    const card = FP.UI.screen({
      cls: 'story', title: 'Floppy World Tour',
      html: `<p>Travel the world and beat every mini-game! The <b>Robot Boss</b> waits in the factory, and the <b>UFO Mothership</b> in outer space.</p>
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
    const boss = isBoss(id);
    const html = `<div class="setup-art">${m.art || ''}</div><h2>${w + 1}-${l + 1} ${esc(WORLDS[w].name)}: ${m.name}</h2><p>${m.desc}</p>
      <p>${boss ? `Everyone on this computer plays together against the ${id === 'ufo' ? 'UFO' : 'robot'} (with a bot friend if you are alone).` : 'Come 1st to clear the level and open the next one!'}</p>
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

  function startStory(w, l, skill, speed = false) {
    const m = FP.Modes[WORLDS[w].levels[l]];
    if (!m) return;
    lobby(); // makes sure Player 1 is here
    story = { w, l, skill, prevSkill: botSkill, result: null, speed };
    botSkill = isBoss(m.id) ? 'hard' : skill; // (bots are your friends in the boss fights: they try their best)
    if (isBoss(m.id)) m.level = skill; // the bosses are tougher on Hard
    const { min, max } = botLimits(m);
    botCount[m.id] = Math.min(max, Math.max(min, isBoss(m.id) ? 1 : 3));
    FP.UI.wipe(() => startMatch(m));
  }
  function endStory() { if (!story) return; botSkill = story.prevSkill; story = null; for (const id of BOSSES) if (FP.Modes[id]) FP.Modes[id].level = null; }

  // after a story level: stars, coins and prizes
  function storyFinished(places) {
    if (!story) return;
    const local = (p) => ['keys', 'pad', 'touch'].includes(p.source.kind);
    const won = isBoss(mode.id) ? !!mode.beaten : places.length > 1 && places[0].some(local);
    const res = { won, newStars: 0, coins: 0, prizes: [] };
    if (won) {
      const d = storyData(), key = levelKey(story.w, story.l), before = d.stars[key] | 0;
      const got = STAR_SKILL[story.skill] || 1;
      if (got > before) { d.stars[key] = got; res.newStars = got - before; }
      res.coins = (before ? 0 : 50) + res.newStars * 25;
      if (mode.id === 'boss') d.boss = true;
      if (mode.id === 'ufo') d.ufo = true;
      saveStory(d);
      const total = totalStars(d);
      for (const p of STORY_PRIZES) if ((p.boss ? d[p.boss] : total >= p.stars) && FP.Profile.grant(p.id)) res.prizes.push(p.id);
      if (res.coins) FP.Profile.earn(res.coins);
    }
    // speedrun: on to the next level (or the finish line!)
    if (story.speed && speedRun) {
      if (won) {
        speedRun.i++;
        if (speedRun.i >= SPEED_LEVELS) {
          const sd = speedData(), t = speedRun.t;
          res.speedDone = { t, record: !sd.best || t < sd.best, old: sd.best };
          if (res.speedDone.record) sd.best = t;
          sd.runs = (sd.runs || 0) + 1;
          FP.Profile.unlock('speedrun');
          sd.run = null; speedRun = null;
          saveSpeed(sd);
        } else saveSpeedRun();
      } else saveSpeedRun();
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
    if (r.won && mode.id === 'boss') msg += '<p><b>You beat the Robot Boss! Next stop: Outer Space!</b></p>';
    if (r.won && lastLevel) msg += '<p><b>You beat the UFO Mothership and finished the whole Floppy World Tour! You are the champions of the universe!</b></p>';
    if (r.prizes.length) { FP.Audio.play('cheer'); setTimeout(() => FP.Audio.play('fanfare'), 400); FP.FX.confetti(FP.Camera.target.clone()); }
    for (let i = 0; i < (r.newStars || 0); i++) setTimeout(() => FP.Audio.play('star'), 700 + i * 260);
    if (!r.won) setTimeout(() => FP.Audio.play('aww'), 500);
    const buttons = [];
    if (story.speed) {
      // speedrun: straight on to the next level, no menus (the clock is stopped in here)
      if (r.speedDone) {
        msg = `<p class="winner">Speedrun finished!</p><p class="speed-time">${speedFmt(r.speedDone.t)}</p>` +
          (r.speedDone.record ? `<p><b>New record!</b>${r.speedDone.old ? ` Your old best was ${speedFmt(r.speedDone.old)}.` : ''}</p>` : `<p>Your best is still ${speedFmt(r.speedDone.old)}.</p>`) + msg;
        FP.Audio.play('fanfare'); FP.FX.confetti(FP.Camera.target.clone(), 160, 6);
        buttons.push({ label: `${ICON.again} New speedrun`, action: () => startSpeedrun(true), cls: 'go' });
      } else {
        const lv = speedRun ? speedRun.i : 0, sw = Math.floor(lv / 4), sl = lv % 4;
        msg = `<p class="speed-time">${speedFmt(speedRun ? speedRun.t : 0)} <small>${lv} of ${SPEED_LEVELS} levels done</small></p>` + msg;
        buttons.push({ label: `${ICON.play} ${r.won ? `Next: ${sw + 1}-${sl + 1} ${FP.Modes[WORLDS[sw].levels[sl]].name}` : 'Try again (the clock keeps going!)'}`, action: () => startStory(sw, sl, 'normal', true), cls: 'go' });
      }
      buttons.push({ label: `${ICON.grid} World Tour map${r.speedDone ? '' : ' (your run is saved)'}`, action: () => storyMap(w * 4 + l), small: true });
      FP.UI.screen({ cls: 'results', title: `${mode.name}: results`, html: msg + gameHtml, buttons });
      return;
    }
    if (r.won && !lastLevel) buttons.push({ label: `${ICON.play} Next level: ${FP.Modes[WORLDS[nw].levels[nl]].name}`, action: () => storyLevel(nw, nl), cls: 'go' });
    buttons.push({ label: `${ICON.again} ${r.won ? 'Play again' : 'Try again'}`, action: () => startStory(w, l, skill), cls: r.won ? '' : 'go' });
    buttons.push({ label: `${ICON.grid} World Tour map`, action: () => storyMap(w * 4 + l), small: true });
    FP.UI.screen({ cls: 'results', title: `${mode.name}: results`, html: msg + gameHtml, buttons });
  }

  // ------------------------------------------------------------
  //  SPEEDRUN: play all 24 World Tour levels in a row, on Normal,
  //  as fast as you can. The clock only runs while you play, and
  //  losing a level costs time (you have to try it again).
  // ------------------------------------------------------------
  const SPEED_LEVELS = WORLDS.length * 4;
  let speedRun = null; // { i: the level you are on, t: seconds so far }
  function speedData() { try { return JSON.parse(localStorage.getItem('floppy-speedrun') || '{}') || {}; } catch (e) { return {}; } }
  function saveSpeed(d) { try { localStorage.setItem('floppy-speedrun', JSON.stringify(d)); } catch (e) { /* no saving */ } }
  function saveSpeedRun() { const d = speedData(); d.run = speedRun ? { i: speedRun.i, t: speedRun.t } : null; saveSpeed(d); }
  function speedFmt(t) { const m = Math.floor(t / 60), sec = t - m * 60; return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(1)}`; }
  function startSpeedrun(fresh) {
    const d = speedData();
    if (fresh || !d.run) speedRun = { i: 0, t: 0 }; else speedRun = { i: d.run.i | 0, t: +d.run.t || 0 };
    saveSpeedRun();
    const w = Math.floor(speedRun.i / 4), l = speedRun.i % 4;
    startStory(w, l, 'normal', true);
  }
  function speedrunScreen() {
    const d = speedData();
    const run = d.run && d.run.i < SPEED_LEVELS ? d.run : null;
    const html = `<div class="champ">${ICON.trophy}</div><p>Play all <b>${SPEED_LEVELS} levels</b> of the World Tour in a row, on Normal, as fast as you can!</p>
      <p class="small">The clock only runs while you play. Lose a level and you must try it again, so the clock keeps going. You can stop and come back later.</p>
      <p class="speed-time">${d.best ? `Best: ${speedFmt(d.best)}` : 'No record yet'}</p>
      ${run ? `<p>Your run: level <b>${run.i + 1}</b> of ${SPEED_LEVELS}, <b>${speedFmt(run.t)}</b> so far.</p>` : ''}`;
    FP.UI.screen({
      cls: 'setup', title: 'Speedrun', html,
      buttons: [
        ...(run ? [{ label: `${ICON.play} Continue my run`, action: () => startSpeedrun(false), cls: 'go' }] : []),
        { label: `${ICON.again} New speedrun`, action: () => startSpeedrun(true), cls: run ? '' : 'go' },
        { label: `${ICON.back} World Tour map`, action: () => storyMap(), small: true },
      ],
      back: () => storyMap(),
    });
  }

  // ------------------------------------------------------------
  //  REPLAY: the last moment of a round, again, in slow motion
  // ------------------------------------------------------------
  let replayEl = null;
  function recordFrame() {
    const pose = (b) => [b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w];
    replayBuf.push({ c: chars.map((c) => c.bodies.map(pose)), m: FP.Stage.movers.map(([, b]) => pose(b)) });
    if (replayBuf.length > 600) replayBuf.shift(); // (about 10 seconds)
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
    replay = { frames: replayBuf.slice(Math.max(0, replayBuf.length - 260), Math.max(60, replayBuf.length - 60)), t: 0 };
    FP.UI.setHud('');
    showReplayBars('<b>REPLAY</b><small>Press jump to skip</small>');
    if (FP.Net) FP.Net.banner('REPLAY', '');
    FP.Camera.zoomTo(0.75);
  }
  function showReplayBars(inner) {
    if (!replayEl) { replayEl = document.createElement('div'); replayEl.className = 'replay-bars'; document.body.append(replayEl); }
    replayEl.innerHTML = '<i class="top"></i><i class="bot"></i>' + inner;
    replayEl.hidden = false;
  }
  // DIRECTOR MODE: watch the last 10 seconds again, turning and zooming the camera, in slow motion or not
  function startDirector() {
    directorWanted = false; replayPending = false;
    state = 'replay';
    replay = { frames: replayBuf.slice(), t: 0, director: true, orbit: 0, zoom: 1, slow: false, follow: -1, grabWas: true };
    FP.UI.setHud('');
    dirHint(false);
    showReplayBars(`<b>REPLAY</b><small><span>Move: turn and zoom the camera</span> <span>JUMP: slow motion</span> <span>PUNCH: follow someone</span> <span>GRAB or ESC: done</span></small><span class="rp-info"></span><span class="rp-bar"><i></i></span>`);
    if (FP.Net) FP.Net.banner('REPLAY', 'The host is watching the replay');
    FP.Audio.play('whoosh');
    FP.Profile.unlock('director');
  }
  function directorFrame(dt) {
    const r = replay;
    let x = 0, z = 0, jump = false, punch = false, grab = false;
    for (const p of humans()) {
      if (p.source.kind === 'remote') continue;
      const inp = FP.Input.read(p.source, 'director' + p.id);
      x += inp.x || 0; z += inp.z || 0; jump = jump || inp.jumpPressed; punch = punch || inp.punchPressed; grab = grab || inp.grab;
    }
    r.orbit += Math.max(-1, Math.min(1, x)) * dt * 2;
    r.zoom = Math.max(0.35, Math.min(1.8, r.zoom + Math.max(-1, Math.min(1, z)) * dt * 0.9));
    if (jump) { r.slow = !r.slow; FP.Audio.play('menu'); }
    if (punch) { r.follow = r.follow + 1 >= chars.length ? -1 : r.follow + 1; FP.Audio.play('menu'); }
    if (grab && !r.grabWas) { endReplay(); return; }
    r.grabWas = grab;
    r.t += dt * (r.slow ? 0.3 : 1);
    let i = Math.floor(r.t * 60);
    if (i >= r.frames.length) { r.t = 0; i = 0; } // (it plays again from the start)
    if (r.frames[i]) applyFrame(r.frames[i]);
    FP.Camera.zoomTo(r.zoom);
    const bar = replayEl && replayEl.querySelector('.rp-bar i');
    if (bar) bar.style.width = `${Math.round((i / Math.max(1, r.frames.length - 1)) * 100)}%`;
    const info = replayEl && replayEl.querySelector('.rp-info');
    if (info) info.textContent = `${r.slow ? 'Slow motion' : 'Normal speed'}  |  Camera: ${r.follow >= 0 && chars[r.follow] ? chars[r.follow].name : 'everyone'}`;
  }
  window.addEventListener('keydown', (e) => {
    if (FP.Net && FP.Net.isClient()) return;
    if (e.code === 'KeyV' && state === 'roundOver' && !paused && humans().length && replayBuf.length > 60 && !(mode && mode.render)) { e.preventDefault(); askDirector(); }
    if (e.code === 'Escape' && state === 'replay' && replay && replay.director) { e.preventDefault(); endReplay(); }
  });
  function askDirector() {
    if (directorWanted) return;
    directorWanted = true;
    FP.Audio.play('select');
    if (dirHintEl) dirHintEl.innerHTML = '<b>Replay coming up!</b>';
  }
  // the little "watch the replay" hint while a round ends
  let dirHintEl = null;
  function dirHint(show) {
    if (!show) { if (dirHintEl) dirHintEl.hidden = true; return; }
    if (!dirHintEl) { dirHintEl = document.createElement('button'); dirHintEl.className = 'dir-hint'; dirHintEl.type = 'button'; dirHintEl.hidden = true; dirHintEl.addEventListener('click', () => { if (state === 'roundOver') askDirector(); }); FP.UI.root.append(dirHintEl); }
    if (dirHintEl.hidden) { dirHintEl.innerHTML = directorWanted ? '<b>Replay coming up!</b>' : `${ICON.play} Watch the replay: <kbd>V</kbd> or controller <kbd>Back</kbd>`; dirHintEl.hidden = false; }
  }
  function replayFrame(dt) {
    if (!replay) { endReplay(); return; }
    if (replay.director) { directorFrame(dt); return; }
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
    dirHint(false);
    if (matchOver()) results(); else nextRound();
  }
  // a quick screen wipe, then the next round
  function nextRound() {
    state = 'transition';
    FP.UI.wipe(() => { if (state === 'transition') startRound(); });
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
  // stickers for your photo: a frame, a speech bubble, and little stickers
  const FRAMES = ['none', 'gold', 'party', 'film', 'hearts'];
  const BUBBLES = ['', 'WOW!', 'YEET!', 'I WIN!', 'BEST DAY EVER!', 'OOPS!', 'HA HA!'];
  function drawSticker(g, kind, x, y, r) {
    g.save(); g.translate(x, y); g.lineWidth = r * 0.12; g.strokeStyle = '#2a2140';
    g.beginPath();
    if (kind === 'star') { for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.fillStyle = '#ffcf33'; }
    else if (kind === 'heart') { g.moveTo(0, r * 0.8); g.bezierCurveTo(-r * 1.4, -r * 0.2, -r * 0.6, -r * 1.2, 0, -r * 0.4); g.bezierCurveTo(r * 0.6, -r * 1.2, r * 1.4, -r * 0.2, 0, r * 0.8); g.fillStyle = '#ff7eb6'; }
    else if (kind === 'crown') { g.moveTo(-r, r * 0.5); g.lineTo(-r, -r * 0.4); g.lineTo(-r * 0.5, 0); g.lineTo(0, -r * 0.7); g.lineTo(r * 0.5, 0); g.lineTo(r, -r * 0.4); g.lineTo(r, r * 0.5); g.fillStyle = '#ffcf33'; }
    else { g.arc(0, 0, r * 0.8, 0, Math.PI * 2); g.fillStyle = '#6fd35a'; } // a smiley
    g.closePath(); g.fill(); g.stroke();
    if (kind === 'smile') { g.fillStyle = '#2a2140'; g.beginPath(); g.arc(-r * 0.28, -r * 0.2, r * 0.1, 0, 7); g.arc(r * 0.28, -r * 0.2, r * 0.1, 0, 7); g.fill(); g.beginPath(); g.arc(0, 0, r * 0.45, 0.3, Math.PI - 0.3); g.stroke(); }
    g.restore();
  }
  function renderPhoto(base, st) {
    const cv = document.createElement('canvas'); cv.width = base.width; cv.height = base.height;
    const g = cv.getContext('2d'), W = cv.width, H = cv.height, u = Math.min(W, H) / 100;
    g.drawImage(base, 0, 0);
    for (const k of st.stickers) drawSticker(g, k.kind, k.x * W, k.y * H, k.r * u);
    const b = BUBBLES[st.bubble];
    if (b) {
      g.font = `900 ${Math.round(u * 7)}px Fredoka, Arial, sans-serif`;
      const tw = g.measureText(b).width, bx = W * 0.5 - tw / 2 - u * 3, by = H * 0.08, bw = tw + u * 6, bh = u * 11;
      g.fillStyle = '#fff'; g.strokeStyle = '#2a2140'; g.lineWidth = u * 0.8;
      g.beginPath(); g.roundRect ? g.roundRect(bx, by, bw, bh, u * 4) : g.rect(bx, by, bw, bh); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(W * 0.5 - u * 2, by + bh); g.lineTo(W * 0.5, by + bh + u * 4); g.lineTo(W * 0.5 + u * 2, by + bh); g.fill();
      g.fillStyle = '#2a2140'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(b, W * 0.5, by + bh / 2 + u * 0.5);
    }
    const fr = FRAMES[st.frame];
    if (fr !== 'none') {
      const t = u * 4;
      g.lineWidth = t * 2;
      if (fr === 'gold') { g.strokeStyle = '#e0b030'; g.strokeRect(0, 0, W, H); g.lineWidth = u; g.strokeStyle = '#fff3b0'; g.strokeRect(t * 1.5, t * 1.5, W - t * 3, H - t * 3); }
      else if (fr === 'party') { const cols = ['#ff5a5f', '#ffcf33', '#6fd35a', '#4aa8ff', '#9b6bff']; for (let i = 0; i < 40; i++) { g.fillStyle = cols[i % 5]; const along = (i / 40) * 2 * (W + H); let x, y; if (along < W) { x = along; y = 0; } else if (along < W + H) { x = W; y = along - W; } else if (along < 2 * W + H) { x = 2 * W + H - along; y = H; } else { x = 0; y = 2 * (W + H) - along; } g.beginPath(); g.arc(x, y, t * 1.1, 0, 7); g.fill(); } }
      else if (fr === 'film') { g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, W, t * 2.5); g.fillRect(0, H - t * 2.5, W, t * 2.5); g.fillStyle = '#fff'; for (let x = t; x < W; x += t * 2.5) { g.fillRect(x, t * 0.7, t, t); g.fillRect(x, H - t * 1.7, t, t); } }
      else if (fr === 'hearts') { for (let x = t; x < W; x += t * 3.2) { drawSticker(g, 'heart', x, t, t * 0.9); drawSticker(g, 'heart', x, H - t, t * 0.9); } for (let y = t * 4; y < H - t * 2; y += t * 3.2) { drawSticker(g, 'heart', t, y, t * 0.9); drawSticker(g, 'heart', W - t, y, t * 0.9); } }
    }
    g.font = `900 ${Math.round(H * 0.04)}px Fredoka, Arial, sans-serif`; g.fillStyle = 'rgba(255,255,255,0.9)'; g.textAlign = 'right'; g.textBaseline = 'alphabetic';
    g.fillText('Floppy Party', W - 20 - (fr !== 'none' ? u * 6 : 0), H - 20 - (fr !== 'none' ? u * 6 : 0));
    return cv;
  }
  function capturePhoto() {
    const src = FP.Stage.renderer.domElement;
    const base = document.createElement('canvas'); base.width = src.width; base.height = src.height;
    const g = base.getContext('2d');
    g.filter = FILTERS[photo ? photo.filter : 0][1];
    g.drawImage(src, 0, 0);
    g.filter = 'none';
    const st = { frame: 0, bubble: 0, stickers: [] };
    let cv = renderPhoto(base, st), url = '';
    try { url = cv.toDataURL('image/png'); } catch (e) { FP.UI.toast('Could not take the picture here'); return; }
    FP.Audio.play('coin');
    const flash = document.createElement('div'); flash.className = 'photo-flash'; document.body.append(flash); setTimeout(() => flash.remove(), 400);
    document.querySelectorAll('.photo-preview').forEach((el) => el.remove());
    const prev = document.createElement('div'); prev.className = 'photo-preview';
    prev.innerHTML = `<img src="${url}" alt="Your photo"><div class="photo-tools"><button class="btn small" data-frame>Frame</button> <button class="btn small" data-bubble>Speech bubble</button> <button class="btn small" data-sticker>Add sticker</button> <button class="btn small" data-clear>Clear</button></div><div><button class="btn small go" data-save>Save picture</button> <button class="btn small" data-close>Keep going</button></div>`;
    document.body.append(prev);
    const img = prev.querySelector('img');
    const redraw = () => { cv = renderPhoto(base, st); url = cv.toDataURL('image/png'); img.src = url; FP.Audio.play('tick'); };
    prev.querySelector('[data-frame]').addEventListener('click', () => { st.frame = (st.frame + 1) % FRAMES.length; redraw(); });
    prev.querySelector('[data-bubble]').addEventListener('click', () => { st.bubble = (st.bubble + 1) % BUBBLES.length; redraw(); });
    prev.querySelector('[data-sticker]').addEventListener('click', () => { if (st.stickers.length < 12) st.stickers.push({ kind: ['star', 'heart', 'crown', 'smile'][Math.floor(Math.random() * 4)], x: 0.1 + Math.random() * 0.8, y: 0.2 + Math.random() * 0.65, r: 4 + Math.random() * 4 }); redraw(); });
    prev.querySelector('[data-clear]').addEventListener('click', () => { st.frame = 0; st.bubble = 0; st.stickers = []; redraw(); });
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
    FP.Audio.duck(true);
    FP.UI.screen({
      cls: 'paused',
      title: 'Paused',
      buttons: [
        { label: `${ICON.play} Keep playing`, action: resume },
        { label: `${ICON.again} Restart this game`, action: () => { paused = false; FP.UI.wipe(() => startMatch(mode)); } },
        { label: `${ICON.help} How to play this game`, action: pauseHelp, small: true },
        { label: `${ICON.sparkle} Photo mode`, action: startPhoto, small: true },
        { label: `${ICON.gear} Settings`, action: () => FP.Settings.screen(pauseMenu), small: true },
        { label: `${ICON.home} Back to the lobby`, action: confirmQuit },
      ],
      back: resume,
    });
  }
  // leaving in the middle of a game: are you sure?
  function confirmQuit() {
    FP.UI.screen({
      cls: 'paused confirm',
      title: 'Leave this game?',
      html: '<p>The scores of this game will be lost.</p>',
      buttons: [
        { label: `${ICON.back} No, keep playing`, action: resume },
        { label: `${ICON.home} Yes, back to the lobby`, action: () => { paused = false; FP.Audio.duck(false); FP.UI.wipe(() => lobby()); } },
      ],
      back: pauseMenu,
    });
  }
  function pauseHelp() {
    const tips = TIPS[mode.id] || [];
    FP.UI.screen({
      cls: 'intro paused',
      title: mode.name,
      html: `<div class="intro-grid"><div class="setup-art">${mode.art || ''}</div><div class="intro-text"><p class="goal">${mode.desc}</p><ul class="tips">${tips.map((t) => `<li>${t}</li>`).join('')}</ul></div></div>${keysRow()}`,
      buttons: [{ label: `${ICON.back} Back`, action: pauseMenu }],
      back: pauseMenu,
    });
  }
  let resumedAt = 0;
  function resume() { paused = false; resumedAt = performance.now(); FP.UI.closeScreen(); FP.Audio.duck(false); }
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (photo) { photoKey(e); return; }
    // (Esc that just closed the pause menu must not open it again right away)
    if ((e.code === 'Escape' || e.code === 'KeyP') && !FP.UI.open() && !e.defaultPrevented) pause(); // (defaultPrevented: the menu already used this key)
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && state === 'lobby' && !FP.UI.open()) { e.preventDefault(); chooseMode(); }
  });

  // ------------------------------------------------------------
  //  PETS: a little friend follows you in the lobby, and cheers when you win
  // ------------------------------------------------------------
  const petObjs = new Map();
  function petMesh(kind) {
    const L = FP.Look, g = new THREE.Group(), T = (c) => L.toon(c);
    const ball = (r, col, x, y, z, sx = 1, sy = 1, sz = 1) => { const m = L.mesh(new THREE.SphereGeometry(r, 14, 10), T(col), 0.02); m.position.set(x, y, z); m.scale.set(sx, sy, sz); g.add(m); return m; };
    const eyes = (y, z, gap = 0.07) => { for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0x1a1030 })); e.position.set(s * gap, y, z); g.add(e); } };
    if (kind === 'cat') {
      ball(0.17, 0xffa64d, 0, 0.17, 0, 1, 0.9, 1.2); ball(0.14, 0xffa64d, 0, 0.36, 0.14); eyes(0.39, 0.26);
      for (const s of [-1, 1]) { const ear = L.mesh(new THREE.ConeGeometry(0.05, 0.1, 6), T(0xffa64d), 0.01); ear.position.set(s * 0.08, 0.5, 0.12); g.add(ear); }
      const tail = L.mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.3, 6), T(0xffa64d), 0.01); tail.position.set(0, 0.3, -0.2); tail.rotation.x = -0.6; g.add(tail);
    } else if (kind === 'duck') {
      ball(0.17, 0xffd23f, 0, 0.17, 0, 1, 0.9, 1.15); ball(0.12, 0xffd23f, 0, 0.36, 0.1); eyes(0.4, 0.2, 0.06);
      const beak = L.mesh(new THREE.ConeGeometry(0.05, 0.12, 8), T(0xff9a3c), 0.01); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.35, 0.25); g.add(beak);
    } else if (kind === 'robot') {
      const b = L.boxMesh(0.28, 0.24, 0.24, T(0xb8c2cc), 0.02); b.position.y = 0.16; g.add(b);
      const h = L.boxMesh(0.22, 0.18, 0.2, T(0xdfe4ea), 0.02); h.position.y = 0.38; g.add(h);
      for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: 0x4ae0ff })); e.position.set(s * 0.05, 0.39, 0.11); g.add(e); }
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3a3a })); bulb.position.y = 0.55; g.add(bulb);
    } else if (kind === 'dog') {
      ball(0.18, 0xc98b58, 0, 0.18, 0, 1, 0.9, 1.25); ball(0.14, 0xc98b58, 0, 0.37, 0.16); eyes(0.4, 0.28);
      ball(0.04, 0x2a2140, 0, 0.35, 0.3);
      for (const s of [-1, 1]) { const ear = L.boxMesh(0.05, 0.14, 0.08, T(0x8a5a3a), 0.01); ear.position.set(s * 0.13, 0.36, 0.14); ear.rotation.z = s * 0.3; g.add(ear); }
    } else if (kind === 'dragon') {
      ball(0.18, 0x6fd35a, 0, 0.18, 0, 1, 0.9, 1.3); ball(0.14, 0x6fd35a, 0, 0.38, 0.16); eyes(0.41, 0.28);
      for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 3), new THREE.MeshBasicMaterial({ color: 0xb07bff })); w.position.set(s * 0.2, 0.3, -0.02); w.rotation.z = s * 1.2; g.add(w); }
      for (let k = 0; k < 3; k++) { const sp = L.mesh(new THREE.ConeGeometry(0.03, 0.08, 5), T(0xffcf33), 0.005); sp.position.set(0, 0.35 - k * 0.07, -0.05 - k * 0.1); g.add(sp); }
    }
    return g;
  }
  function updatePets(dt) {
    const show = ['lobby', 'results', 'clientResults'].includes(state);
    for (const [c, o] of petObjs) if (!show || !chars.includes(c) || !c.player || c.player.pet !== o.kind) { FP.Stage.scene.remove(o.g); petObjs.delete(c); }
    if (!show) return;
    const now = performance.now() / 1000;
    for (const c of chars) {
      const kind = c.player && c.player.pet;
      if (!kind || kind === 'none') continue;
      const t = c.parts.torso.position;
      let o = petObjs.get(c);
      if (!o) { o = { g: petMesh(kind), kind, x: t.x + 0.8, z: t.z + 0.6, y: 0, vy: 0 }; FP.Stage.scene.add(o.g); petObjs.set(c, o); }
      const podium = state !== 'lobby';
      const feet = Math.max(0, t.y - FP.Ragdoll.STAND - 0.05);
      // lobby: follow behind you. Podium: sit in front of you
      const tx = podium ? t.x + 0.45 : t.x - Math.sin(c.yaw) * 0.8 + Math.cos(c.yaw) * 0.7;
      const tz = podium ? t.z + 0.75 : t.z - Math.cos(c.yaw) * 0.8 - Math.sin(c.yaw) * 0.7;
      const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
      if (d > 3) { o.x = tx; o.z = tz; } else if (d > 0.15) { const sp = Math.min(d, (1 + d * 3) * dt); o.x += (dx / d) * sp; o.z += (dz / d) * sp; }
      // hop along while walking, and jump for joy when you win
      const cheering = c.podiumWinner || (c.emote && c.emote.k === 3);
      o.vy -= 20 * dt; o.y += o.vy * dt;
      if (o.y <= 0) { o.y = 0; o.vy = cheering ? 4.5 : d > 0.3 ? 2.2 : 0; }
      o.g.position.set(o.x, feet + o.y, o.z);
      o.g.rotation.y = d > 0.3 ? Math.atan2(dx, dz) : Math.atan2(t.x - o.x, t.z - o.z) + Math.sin(now * 2) * 0.2;
    }
  }

  // the big floating crown of the King of the Party (online friends see it too: the id comes in the HUD)
  let kingCrown = null;
  function updateKingCrown() {
    let id = null;
    if (['countdown', 'play', 'roundOver'].includes(state) && tour && tour.king) id = tour.king.id;
    else if (state === 'client') { const el = document.querySelector('.king-line[data-king]'); if (el) id = +el.dataset.king; }
    const c = id !== null ? chars.find((ch) => ch.player && ch.player.id === id && ch.alive !== false) : null;
    if (!c) { if (kingCrown) kingCrown.visible = false; return; }
    if (!kingCrown) { kingCrown = FP.Look.makeHat('crown', 0.62); kingCrown.scale.setScalar(1.3); FP.Stage.scene.add(kingCrown); }
    if (kingCrown.parent !== FP.Stage.scene) FP.Stage.scene.add(kingCrown);
    const h = c.parts.head.position, t = performance.now() / 1000;
    kingCrown.visible = true;
    kingCrown.position.set(h.x, h.y + 1.2 + Math.sin(t * 3) * 0.08, h.z);
    kingCrown.rotation.set(0.15, t * 1.5, 0);
  }

  // ------------------------------------------------------------
  //  THE LOOP
  // ------------------------------------------------------------
  function inputFor(c) {
    const p = c.player;
    if (!p) return idle;
    const src = p.source;
    const canMove = ['play', 'lobby', 'roundOver', 'title'].includes(state);
    if (!canMove || paused) return idle;
    if (src.kind === 'bot') return state === 'lobby' || state === 'title' || state === 'select' || (c.emote && c.emote.t < 2) ? idle : FP.Bots.think(c, chars, FP.Physics.STEP, state === 'play' ? mode : null);
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
      if (down && !padStart[i] && ['countdown', 'play', 'roundOver'].includes(state) && !paused && !FP.UI.open() && performance.now() - resumedAt > 250) pause();
      padStart[i] = down;
    });
  }

  let acc = 0, titleT = 0, slowmo = 0, hitstop = 0, lastStop = 0;
  function update(dt) {
    FP.UI.update(dt);
    FP.Fun.update(dt, FP.Net && FP.Net.isClient() ? 'client' : state);
    titleT += dt;
    FP.Camera.setOrbit(state === 'title' ? Math.sin(titleT * 0.12) * 0.45 : state === 'replay' && replay ? (replay.director ? replay.orbit : Math.sin(replay.t * 1.4) * 0.7) : 0);
    FP.Camera.setShift(state === 'title' && innerWidth > 800 ? 3.2 : 0);
    FP.Props.animate(dt);
    FP.Season.update(dt); // falling snow in winter
    updatePets(dt);
    updateKingCrown();
    FP.Caster.update(dt);
    if (!paused && state !== 'replay') FP.Style.update(dt, chars); // sparkly trails
    // (never while a menu or the "how to play" screen is open, so they can't cover its buttons)
    FP.Touch.update(FP.Touch.available && ((['lobby', 'countdown', 'play', 'roundOver', 'client'].includes(state) && !FP.UI.open()) || (state === 'replay' && replay && replay.director)));
    if (FP.Net && FP.Net.isClient()) {
      FP.Audio.duck(false);
      FP.Net.clientFrame(dt);
      FP.UI.nameTags(FP.Game.chars, FP.Camera.camera, state === 'lobby' || (state === 'client' && !(mode && mode.noTags)));
      return;
    }
    padPause();
    if (state !== 'roundOver') { hideBoard(); dirHint(false); }
    FP.Audio.duck(paused && !photo);
    if (paused) { if (photo) photoFrame(dt); return; }
    if (state === 'lobby') lobbyJoins();
    if (state === 'editor') FP.Editor.update(dt);
    if (slowmo > 0) { slowmo -= dt; dt *= 0.3; if (slowmo <= 0) FP.Camera.zoomTo(1); }
    else if (state !== 'roundOver' && state !== 'replay') FP.Camera.zoomTo(1);

    // physics runs in fixed little steps (60 per second)
    // hit-stop: on a big hit everything freezes for a split second (it makes hits feel strong)
    if (hitstop > 0) { hitstop -= dt; acc = 0; } else acc += dt;
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
      if (story && story.speed && speedRun) speedRun.t += dt; // (the speedrun clock only runs while you play)
      for (const o of outTimers) { o.t -= dt; if (o.t <= 0 && !o.done) { o.done = true; FP.Ragdoll.teleport(o.c, 0, -80, 0); o.c.alive = false; } }
      const res = mode.update(dt, chars, api);
      if (res) endRound(res);
    } else if (state === 'roundOver') {
      timer += dt;
      if (mode.update) mode.update(dt, chars, api, true);
      if (timer > 1.1 && timer - dt <= 1.1 && !mode.single && !matchOver()) showBoard();
      // (controller: Back asks for the replay; keyboard: V)
      if (!directorWanted && humans().some((p) => p.source.kind === 'pad' && FP.Input.read(p.source, 'dirask' + p.id).colorPressed) && replayBuf.length > 60 && !mode.render) askDirector();
      dirHint(timer > 0.4 && humans().some((p) => p.source.kind !== 'remote') && replayBuf.length > 60 && !mode.render);
      if (timer > 3.2) { dirHint(false); if (directorWanted) startDirector(); else if (replayPending) startReplay(); else if (matchOver()) results(); else nextRound(); }
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
    const follow = state === 'replay' && replay && replay.director && replay.follow >= 0 ? chars[replay.follow] : null;
    const focus = follow ? [FP.Ragdoll.center(follow)] : state === 'replay' ? chars.filter((c) => c.parts.torso.position.y > -4).map(FP.Ragdoll.center) : playing && mode.focus ? mode.focus(chars) : chars.filter((c) => c.alive && c.parts.torso.position.y > (mode && mode.focusMinY !== undefined ? mode.focusMinY() : -4)).map(FP.Ragdoll.center);
    FP.Camera.update(focus.length ? focus : chars.map(FP.Ragdoll.center), dt, state === 'results' ? 7 : mode && state !== 'lobby' ? (mode.minZoom || 12) : 11);
    FP.UI.nameTags(chars, FP.Camera.camera, ['lobby', 'countdown', 'play', 'roundOver'].includes(state) && !(mode && mode.noTags && state !== 'lobby'));
    if (FP.Net) FP.Net.hostFrame(dt);
  }

  const api = {
    get players() { return players; }, set players(v) { players = v; },
    get chars() { return chars; }, get state() { return state; }, get round() { return round; }, set round(v) { round = v; }, get mode() { return mode; }, get scores() { return scores; },
    get everyone() { return everyone(); },
    MODES, addPlayer, removePlayer, eliminate, lobby, titleScreen, startMatch, chooseMode, setupMatch, refreshLobby, hudHtml, update,
    clientLobby, clientRound, clientPodium, skipIntro: false, dailyInfo, startDaily, editor, storyMap, startStory, get story() { return story; }, startPhoto, endPhoto, tourneySetup, startTourney, playTourneyMatch, get tourney() { return tourney; }, get replaying() { return !!replay; }, get playlist() { return playlist; }, endMatchNow: () => { if (['play', 'roundOver', 'countdown'].includes(state)) results(); }, cycle: (p, what, dir) => (what === 'color' ? cycleColor(p, dir) : what === 'outfit' ? cycleOutfit(p, dir) : what === 'hat' ? cycleHat(p, dir) : STYLE_ACTS.includes(what) ? cycleStyle(p, what, dir) : null),
    botLimits, setBots(id, n) { botCount[id] = n; },
    setSkill(id) { if (FP.Bots.SKILLS[id]) botSkill = id; }, get botSkill() { return botSkill; },
    catOf, get tour() { return tour; }, tourSetup, startTour, surprise, funScreen,
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
