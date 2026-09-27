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
  const MODE_ORDER = ['arena', 'soccer', 'heist', 'bomb', 'hill', 'lava', 'tiles', 'color', 'sweeper', 'coins', 'dodge', 'paint', 'crown', 'race', 'balloons', 'seats', 'zombie', 'boulder'];
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
  let tour = null;          // Party Tour: { games: [mode ids], index, points: { playerId: n }, bots, awarded }
  let tourOpts = { games: 5, bots: null };
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
      hat: opts.hat || FP.Look.HATS[(players.length * 3 + 1) % (FP.Look.HATS.length - 1)],
      outfit: opts.outfit || FP.Look.OUTFITS[(players.length + 1) % FP.Look.OUTFITS.length],
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
      matchBots.push({ id: nextId++, source: { kind: 'bot' }, name, colorIndex: freeColor(), hat: FP.Look.HATS[Math.floor(Math.random() * (FP.Look.HATS.length - 1))], outfit: FP.Look.OUTFITS[Math.floor(Math.random() * FP.Look.OUTFITS.length)] });
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
    state = 'title';
    paused = false;
    mode = null;
    matchBots = [];
    FP.Audio.setSong('party');
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
        { label: `${ICON.help} How to play`, action: () => { FP.UI.help.hidden = false; }, small: true },
      ],
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
    if (!players.length) players.push({ id: nextId++, source: { kind: 'keys', map: 0 }, colorIndex: 0, hat: 'party', outfit: 'overalls', name: 'Player 1' });
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
    if (k === 'remote') return 'Online';
    if (k === 'me') return 'You (online)';
    if (k === 'host') return 'Host computer';
    return '';
  }
  function colorKeys(p) {
    const k = p.source.kind;
    if (k === 'keys') return p.source.map === 0 ? '<kbd>Z</kbd> color <kbd>X</kbd> hat <kbd>C</kbd> outfit' : '<kbd>K</kbd> color <kbd>L</kbd> hat <kbd>J</kbd> outfit';
    if (k === 'pad') return '<kbd>Back</kbd> color <kbd>Y</kbd> hat';
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
      slots.push(`<div class="slot" style="--c:${hex(col.body)};--l:${hex(col.light)}">
        <div class="slot-head"><span class="slot-num">P${i + 1}</span><b>${esc(p.name)}</b>${i > 0 && !client ? `<button class="leave" data-act="remove" data-i="${i}" title="Remove this player">Leave</button>` : ''}</div>
        <div class="slot-row"><span class="lbl">Color</span>${cl}<span class="val"><i class="dot"></i>${col.name}</span>${cr}</div>
        <div class="slot-row"><span class="lbl">Hat</span>${hl}<span class="val">${FP.UI.HAT_NAMES[p.hat]}</span>${hr}</div>
        <div class="slot-row"><span class="lbl">Outfit</span>${ol}<span class="val">${FP.Look.OUTFIT_NAMES[p.outfit || 'none']}</span>${or}</div>
        <div class="slot-foot">${controlsText(p)}<br><span class="keys">${colorKeys(p)}</span></div>
      </div>`);
    }
    const online = FP.Net && FP.Net.status() ? `<div class="online">${FP.Net.status()}</div>` : '';
    lobbyPanel.innerHTML = `
      <div class="lobby-top"><h2>Lobby</h2><p>${client ? 'The host picks the mini-game. Walk around and goof off while you wait!' : 'Walk around, punch and grab each other while everyone joins.'}</p>${online}</div>
      <div class="slots">${slots.join('')}</div>
      <div class="lobby-actions">
        <button class="btn" data-act="back">${ICON.back} ${client ? 'Leave the party' : 'Title'}</button>
        ${client ? '' : `<button class="btn go" data-act="start">${ICON.play} Pick a mini-game <kbd>Enter</kbd></button>`}
      </div>`;
    lobbyPanel.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => lobbyAction(b.dataset.act, +b.dataset.i, +b.dataset.dir || 1)));
  }

  function lobbyAction(act, i, dir) {
    FP.Audio.play('select');
    const p = players[i];
    if (FP.Net && FP.Net.isClient()) {
      if (act === 'color' || act === 'hat' || act === 'outfit') FP.Net.send({ t: act, dir });
      else if (act === 'back') { FP.Net.leave(); titleScreen(); }
      return;
    }
    if (act === 'color' && p) cycleColor(p, dir);
    else if (act === 'hat' && p) cycleHat(p, dir);
    else if (act === 'outfit' && p) cycleOutfit(p, dir);
    else if (act === 'remove' && p) removePlayer(p);
    else if (act === 'start') chooseMode();
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
    const n = FP.Look.HATS.length;
    p.hat = FP.Look.HATS[(FP.Look.HATS.indexOf(p.hat) + dir + n) % n];
    spawnInLobby(p); refreshLobby();
    if (FP.Net) FP.Net.playersChanged();
  }

  function cycleOutfit(p, dir = 1) {
    const n = FP.Look.OUTFITS.length;
    p.outfit = FP.Look.OUTFITS[(FP.Look.OUTFITS.indexOf(p.outfit || 'none') + dir + n) % n];
    spawnInLobby(p); refreshLobby();
    if (FP.Net) FP.Net.playersChanged();
  }

  // someone pressed jump on a keyboard side or controller that isn't playing yet: they join!
  function lobbyJoins() {
    const sources = [{ kind: 'keys', map: 0 }, { kind: 'keys', map: 1 }];
    FP.Input.getPads().forEach((gp, i) => { if (gp) sources.push({ kind: 'pad', index: i }); });
    for (const src of sources) {
      const input = FP.Input.read(src, 'join-' + src.kind + (src.map ?? src.index));
      if (FP.UI.open()) continue;
      const p = players.find((q) => sameSource(q.source, src));
      if (!p && input.jumpPressed) { if (addPlayer(src)) FP.UI.toast('A new player joined!'); }
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
      const html = `<div class="setup-art">${m.art || ''}</div><p>${m.desc}</p>
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
          { label: `${ICON.play} Start`, action: () => startMatch(m), cls: 'go' },
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
    state = 'countdown';
    count = 3.99;
    FP.UI.big(mode.roundsToWin > 1 && !mode.single ? `Round ${round}` : mode.name, 1.2, mode.desc);
    timer = 0;
    if (FP.Net) FP.Net.roundStarted();
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
    let text = 'Nobody wins!';
    const center = new THREE.Vector3();
    if (mode.teams && res.team !== undefined) {
      scores['team' + res.team] += res.points ?? 1;
      text = `${res.team === 0 ? 'Red' : 'Blue'} team wins!`;
    } else if (res.winners && res.winners.length) {
      res.winners.forEach((c) => { if (!mode.single) scores[c.player.id] = (scores[c.player.id] || 0) + 1; c.cheer = 3.5; c.expression = 'happy'; c.exprTimer = 3.5; });
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
    if (mode.single) return true;
    if (mode.teams) return scores.team0 >= mode.roundsToWin || scores.team1 >= mode.roundsToWin;
    return Object.values(scores).some((s) => s >= mode.roundsToWin);
  }

  function results() {
    state = 'results';
    FP.UI.setHud('');
    const list = everyone();
    let html;
    if (mode.teams) {
      const t0 = scores.team0, t1 = scores.team1;
      const win = t0 === t1 ? 'It\'s a tie!' : (t0 > t1 ? 'Red team wins!' : 'Blue team wins!');
      html = `<div class="final"><div class="team t0">Red<b>${t0}</b></div><div class="team t1">Blue<b>${t1}</b></div></div><p class="winner">${win}</p>` +
        `<div class="podium">${list.map((p) => FP.UI.playerPill(p, p.team === 0 ? ' <small>(Red)</small>' : ' <small>(Blue)</small>')).join('')}</div>`;
    } else {
      const sorted = list.slice().sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
      const label = (s) => (mode.scoreLabel ? mode.scoreLabel(s) : s);
      const places = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
      html = (mode.resultText ? `<p class="winner">${mode.resultText()}</p>` : '') +
        `<div class="podium">${sorted.map((p, i) => `<div class="place p${i}"><span class="medal m${i}">${places[i]}</span>${FP.UI.playerPill(p)}<b>${label(scores[p.id] || 0)}</b></div>`).join('')}</div>`;
    }
    if (tour) { tourResults(html); return; }
    FP.UI.screen({
      title: `${mode.name}: results`,
      html,
      buttons: [
        { label: `${ICON.again} Play again`, action: () => startMatch(mode) },
        { label: `${ICON.grid} Another mini-game`, action: () => { lobby(); chooseMode(); } },
        { label: `${ICON.home} Back to the lobby`, action: () => lobby(), small: true },
      ],
    });
    if (FP.Net) FP.Net.results(html);
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
    const goal = (mode.roundsToWin > 1 && !mode.single ? ` <small>first to ${mode.roundsToWin}</small>` : '') + (tour ? ` <small>Party Tour ${tour.index + 1} of ${tour.games.length}</small>` : '');
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
      const html = `<div class="champ">${ICON.trophy}</div><p>Play <b>${tourOpts.games}</b> random mini-games in a row. Win games to earn party points. Most points at the end is the <b>Party Champion</b>!</p>
        <div class="skill"><span class="lbl">Games</span>${[3, 5, 7].map((g) => `<button class="chip${g === tourOpts.games ? ' on' : ''}" data-games="${g}">${g}</button>`).join('')}</div>
        <div class="counter"><span class="lbl">Bots</span>
          <button class="round" data-bots="-1" ${n <= min ? 'disabled' : ''} title="Fewer bots">${ICON.minus}</button><b class="count">${n}</b>
          <button class="round" data-bots="1" ${n >= max ? 'disabled' : ''} title="More bots">${ICON.plus}</button></div>
        ${n > 0 ? `<div class="skill"><span class="lbl">Bot skill</span>${FP.Bots.SKILL_ORDER.map((id) => `<button class="chip${id === botSkill ? ' on' : ''}" data-skill="${id}">${skillStars(id)}${FP.Bots.SKILLS[id].name}</button>`).join('')}</div>` : ''}
        ${funLine()}<p class="small">Left and right: number of bots.${n > 0 ? ' Up and down: bot skill.' : ''}</p>`;
      const card = FP.UI.screen({
        cls: 'setup', title: 'Party Tour', html,
        buttons: [
          { label: `${ICON.play} Start the tour`, action: startTour, cls: 'go' },
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
      card.querySelectorAll('[data-games]').forEach((b) => b.addEventListener('click', () => { tourOpts.games = +b.dataset.games; FP.Audio.play('menu'); draw(); }));
      card.querySelectorAll('[data-skill]').forEach((b) => b.addEventListener('click', () => { botSkill = b.dataset.skill; try { localStorage.setItem('floppy-skill', botSkill); } catch (e) { /* no saving */ } FP.Audio.play('menu'); draw(); }));
    };
    draw();
  }

  function startTour() {
    const ids = MODES().map((m) => m.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    tour = { games: ids.slice(0, tourOpts.games), index: 0, points: {}, bots: null, botCount: tourOpts.bots, awarded: false };
    startMatch(FP.Modes[tour.games[0]]);
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

  function tourResults(gameHtml) {
    const got = tour.awarded ? null : tourAward();
    tour.awarded = true;
    const last = tour.index >= tour.games.length - 1;
    const html = `${gameHtml}<h2>Party points</h2>${tourTable(got)}${tourList()}`;
    FP.UI.screen({
      title: `${mode.name}: results`,
      html,
      buttons: [
        last ? { label: `${ICON.trophy} Who is the champion?`, action: tourFinal, cls: 'go' }
          : { label: `${ICON.play} Next game: ${FP.Modes[tour.games[tour.index + 1]].name}`, action: () => { tour.index++; startMatch(FP.Modes[tour.games[tour.index]]); }, cls: 'go' },
        { label: `${ICON.home} Stop the tour`, action: () => lobby(), small: true },
      ],
    });
    if (FP.Net) FP.Net.results(html);
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
    FP.UI.screen({
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
  //  PAUSE
  // ------------------------------------------------------------
  function pause() {
    if (!['countdown', 'play', 'roundOver'].includes(state) || paused || FP.UI.open()) return;
    paused = true;
    FP.UI.screen({
      title: 'Paused',
      buttons: [
        { label: `${ICON.play} Keep playing`, action: resume },
        { label: `${ICON.again} Restart this game`, action: () => { paused = false; startMatch(mode); } },
        { label: `${ICON.home} Back to the lobby`, action: () => { paused = false; lobby(); } },
      ],
      back: resume,
    });
  }
  function resume() { paused = false; FP.UI.closeScreen(); }
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
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
    if (src.kind === 'bot') return state === 'lobby' ? idle : FP.Bots.think(c, chars, FP.Physics.STEP, state === 'play' ? mode : null);
    if (src.kind === 'remote') return FP.Net ? FP.Net.inputOf(p.id) : idle;
    return FP.Input.read(src, p.id);
  }

  let acc = 0;
  function update(dt) {
    FP.UI.update(dt);
    FP.Fun.update(dt, FP.Net && FP.Net.isClient() ? 'client' : state);
    FP.Props.animate(dt);
    if (FP.Net && FP.Net.isClient()) {
      FP.Net.clientFrame(dt);
      FP.UI.nameTags(FP.Game.chars, FP.Camera.camera, state === 'lobby' || state === 'client');
      return;
    }
    if (paused) return;
    if (state === 'lobby') lobbyJoins();

    // physics runs in fixed little steps (60 per second)
    acc += dt;
    let steps = 0;
    while (acc >= FP.Physics.STEP && steps < 4) {
      for (const c of chars) FP.Ragdoll.control(c, inputFor(c), FP.Physics.STEP);
      if (mode && mode.beforeStep && ['countdown', 'play', 'roundOver'].includes(state)) mode.beforeStep(FP.Physics.STEP, chars);
      FP.Physics.step();
      acc -= FP.Physics.STEP;
      steps++;
    }
    if (steps === 4) acc = 0;

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
      if (timer > 3.2) { if (matchOver()) results(); else startRound(); }
    }

    for (const c of chars) FP.Ragdoll.sync(c, dt);
    if (['countdown', 'play', 'roundOver'].includes(state)) FP.UI.setHud(hudHtml());
    FP.FX.update(dt);
    FP.Stage.update(dt, timer, FP.Camera.target);
    const playing = mode && ['countdown', 'play', 'roundOver'].includes(state);
    const focus = playing && mode.focus ? mode.focus(chars) : chars.filter((c) => c.alive && c.parts.torso.position.y > (mode && mode.focusMinY !== undefined ? mode.focusMinY() : -4)).map(FP.Ragdoll.center);
    FP.Camera.update(focus.length ? focus : chars.map(FP.Ragdoll.center), dt, mode && state !== 'lobby' ? (mode.minZoom || 12) : 11);
    FP.UI.nameTags(chars, FP.Camera.camera, ['lobby', 'countdown', 'play', 'roundOver'].includes(state));
    if (FP.Net) FP.Net.hostFrame(dt);
  }

  const api = {
    get players() { return players; }, set players(v) { players = v; },
    get chars() { return chars; }, get state() { return state; }, get mode() { return mode; }, get scores() { return scores; },
    get everyone() { return everyone(); },
    MODES, addPlayer, removePlayer, eliminate, lobby, titleScreen, startMatch, chooseMode, setupMatch, refreshLobby, hudHtml, update,
    clientLobby, clientRound, cycle: (p, what, dir) => (what === 'color' ? cycleColor(p, dir) : what === 'outfit' ? cycleOutfit(p, dir) : cycleHat(p, dir)),
    botLimits, setBots(id, n) { botCount[id] = n; },
    setSkill(id) { if (FP.Bots.SKILLS[id]) botSkill = id; }, get botSkill() { return botSkill; },
    get tour() { return tour; }, tourSetup, startTour, surprise, funScreen,
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
