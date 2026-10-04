// ============================================================
//  DRAGON LIFE — THE STORY (you don't have to follow it!)
//  Grandma Wren, the village people, the shop, the treasure
//  chests, the story stones, the dragon fires and the Heart of
//  the Volcano. Change what people say in the TALK lists!
// ============================================================
window.DL = window.DL || {};

DL.Story = (function () {
  const U = DL.U, PI = Math.PI;
  const W = () => DL.World, It = () => DL.Items, Hud = () => DL.Hud, S = () => DL.Audio, Dr = () => DL.Dragon, P = () => DL.Player, B = () => DL.Build;

  let flags = {};
  let q = 0;
  const places = () => W().places;

  const QUESTS = [
    { id: 'wren', title: 'Say hello to Grandma Wren', hint: 'She is in front of the cottage near the dock. Walk to her and press E.', done: () => flags.metWren, target: () => places().wren },
    { id: 'egg', title: 'Find the dragon egg', hint: 'Look for a glowing cave in the north of Home Island.', done: () => Dr().egg.state !== 'cave', target: () => places().cave },
    { id: 'warm', title: 'Keep the egg warm', hint: 'Walk to a campfire and press E. Wren has one next to her house!', done: () => ['warming', 'hatched'].includes(Dr().egg.state), target: () => places().wrenFire },
    { id: 'hatch', title: 'Wait for the egg to hatch', hint: 'Stay close to the fire... it\'s wobbling!', done: () => Dr().hatched(), target: () => Dr().egg.pos },
    { id: 'feed', title: 'Feed your baby dragon', hint: 'Pick berries (E on a bush), choose 🍽️ (key 4) and click next to your dragon.', done: () => flags.fed },
    { id: 'nest', title: 'Build a dragon nest', hint: 'Chop trees with the axe (key 1) for wood, then press B to build.', done: () => B().pieces.some(p => p.id === 'nest') },
    { id: 'grow', title: 'Help your dragon grow up', hint: 'Feed it, pet it (E) and play fetch (key 5). Fish make dragons grow fast! Fish from the dock (key 3).', done: () => Dr().stage === 'adult' },
    { id: 'fly', title: 'Your first flight!', hint: 'Stand next to your grown-up dragon and press F. The mouse steers!', done: () => flags.flew },
    { id: 'village', title: 'Visit Village Island', hint: 'Fly east across the sea. Talk to the people there!', done: () => flags.isl_village, target: () => places().village },
    { id: 'stones', title: 'Read the 4 story stones', hint: 'They are at the Old Ruins, far to the west. Press E next to each stone.', done: () => (flags.stones || []).length >= 4, target: () => places().ruins },
    { id: 'fires', title: 'Light the 4 dragon fires', hint: 'Fly over the temple and HOLD the mouse button to breathe fire on the 4 big stone bowls.', done: () => places().braziers.every(b => b.lit), target: () => places().ruins },
    { id: 'heart', title: 'Find the Heart of the Volcano', hint: 'Fly into the volcano (south-east). Land on the rock in the lava and take the glowing Heart.', done: () => flags.heart, target: () => places().heart },
    { id: 'altar', title: 'Bring the Heart to the temple', hint: 'Put it on the altar in the middle of the Old Ruins (E).', done: () => flags.altar, target: () => places().altar },
    { id: 'done', title: 'Live happily with your dragon!', hint: 'Explore, build, fish, and find all 6 treasure chests. It\'s your life!', done: () => false },
  ];

  const STONES = [
    'Long ago, people and dragons lived together on the Ember Isles. Every family had a dragon friend.',
    'One winter, a great storm came. The Heart of the Volcano went cold, and all the islands got cold too.',
    'The dragons flew far away to find a warm place. Before they left, they hid one last egg in a glowing cave.',
    'Light the four dragon fires. Bring the Heart of the Volcano back to the temple. Then the dragons will come home.',
  ];
  const ISLAND_TEXT = {
    home: 'Your new home',
    village: 'Friendly people live here',
    crystal: 'Shiny crystals on top of the mountains',
    ruins: 'An old dragon temple',
    misty: 'Giant trees... and wild dragons!',
    volcano: 'Hot hot hot! 🌋',
  };
  const CHEST_LOOT = [
    { coins: 30, items: { seeds: 5 }, text: '30 coins and 5 seeds' },
    { coins: 20, color: 'shadow', text: 'SHADOW dragon paint! (press I to use it)' },
    { coins: 50, color: 'gold', text: 'GOLD dragon paint and 50 coins!' },
    { saddle: 'sky', text: 'the SKY SADDLE! (press I to use it)' },
    { coins: 30, saddle: 'royal', text: 'the ROYAL SADDLE and 30 coins!' },
    { coins: 100, items: { crystal: 3 }, text: '100 coins and 3 crystals!' },
  ];
  const SHOP = [
    { id: 'seeds', icon: '🌱', name: '3 Berry Seeds', price: 5, give: () => It().add('seeds', 3) },
    { id: 'wood', icon: '🪵', name: '10 Wood', price: 12, give: () => It().add('wood', 10) },
    { id: 'stone', icon: '🪨', name: '10 Stone', price: 12, give: () => It().add('stone', 10) },
    { id: 'royal', icon: '🪢', name: 'Royal Saddle', price: 80, saddle: 'royal' },
    { id: 'sky', icon: '🪢', name: 'Sky Saddle', price: 120, saddle: 'sky' },
    { id: 'gold', icon: '🎨', name: 'Gold Paint', price: 150, color: 'gold' },
    { id: 'shadow', icon: '🎨', name: 'Shadow Paint', price: 100, color: 'shadow' },
  ];

  // ------------------------------------------------------------
  //  PEOPLE
  // ------------------------------------------------------------
  const npcs = [];
  function addNpc(name, look, spot, talk, opts = {}) {
    const m = DL.Models.human(look);
    m.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const y = spot.dock ? 1.3 : W().groundAt(spot.x, spot.z, 300);
    m.root.position.set(spot.x, y, spot.z);
    DL.Game.scene.add(m.root);
    const n = { name, m, x: spot.x, z: spot.z, y, home: { x: spot.x, z: spot.z, dock: spot.dock }, yaw: opts.yaw || 0, talk, t: Math.random() * 10, opts };
    n.thing = W().addThing({ x: spot.x, y, z: spot.z, r: 2.8, npc: n, label: () => 'Talk to ' + name, use: () => { n.talking = 3; talk(n); } });
    W().addCollider(n.col = { x: spot.x, z: spot.z, r: 0.4, y0: y - 1, y1: y + 2 });
    npcs.push(n);
    return n;
  }

  function wrenTalk() {
    const D = Dr();
    let lines;
    if (!flags.metWren) {
      flags.metWren = true;
      lines = [
        'Oh! A visitor! Welcome to the Ember Isles, dear. I\'m Wren.',
        'Long ago, dragons and people lived here together. Then one day... all the dragons flew away.',
        'But last night I saw something GLOWING in the old cave, in the north of this island. A dragon egg, maybe?',
        'If you find it, bring it to a campfire. Eggs need to be warm! You can use mine, right here.',
        'Oh, and this little island can be your home. Chop trees for wood, mine rocks for stone, and press B to build. 🏡',
      ];
    } else if (D.egg.state === 'cave') lines = ['The cave is in the NORTH of the island. Follow the arrow at the top of your screen! ⬆️'];
    else if (D.egg.state === 'carried') lines = ['Is that... a DRAGON EGG?! Quick, put it next to my campfire! Walk to the fire and press E.'];
    else if (D.egg.state === 'warming') lines = ['Shhh... it\'s moving! Stay close, dear. It will hatch very soon.'];
    else if (!flags.fed) lines = [`Look at little ${D.name}! Babies are always hungry. Give it some berries or fish!`];
    else if (D.stage !== 'adult') lines = [U.pick([
      `Dragons grow up fast when they are loved. Feed ${D.name}, pet it, and play fetch!`,
      'Dragons LOVE fish. Try fishing from my dock with your rod (key 3).',
      'At night, fish are sneaky... but sometimes you catch a GOLDEN one!',
      `Build ${D.name} a nest. Dragons sleep much better in a nest.`,
    ])];
    else if (!flags.flew) lines = [`My, my! ${D.name} is all grown up! Stand next to it and press F. Hold on tight!`];
    else if (!flags.altar) lines = [U.pick([
      'Have you been to the Old Ruins, far to the west? The story stones tell what happened to the dragons.',
      'The people in the village (east) are very nice. Mila sells saddles and paint for dragons!',
      'They say there are wild dragons in the Misty Forest, in the south.',
      'There are 6 treasure chests hidden on the islands. My grandmother found one on the Crystal Peaks!',
    ])];
    else lines = [U.pick([
      'Look at the sky! The dragons came home. Thank you, dear. 💚',
      `You and ${D.name} are the best friends I ever saw.`,
      'Have you found all 6 treasure chests yet?',
    ])];
    Hud().dialog('👵 Grandma Wren', lines, () => check());
  }
  function finnTalk() {
    Hud().dialog('🎣 Fisher Finn', [U.pick([
      'Fish bite better at night! And the GOLDEN fish only come out when it\'s dark... mostly.',
      'Big fish are hard to catch. Wait for the needle to be in the green part!',
      'I\'ll buy your fish! Let\'s see what you have...',
    ])], () => openShop('sell'));
  }
  function milaTalk() {
    Hud().dialog('🛍️ Mila the Merchant', [U.pick(['Welcome to my shop! Saddles, paint, seeds... I have everything!', 'Your dragon would look GREAT in gold. Just saying!', 'Want to sell something? I buy everything!'])], () => openShop('buy'));
  }
  function boTalk() {
    const lines = [];
    if (!flags.boGift) { flags.boGift = true; lines.push('A new builder! Here, take some wood and stone to get started.'); setTimeout(() => { It().add('wood', 12); It().add('stone', 8); }, 300); }
    lines.push(U.pick([
      'Build a FLOOR first, then WALLS on its sides, then a ROOF on top. Aim at the side of a square to put a wall there!',
      'Press R to turn things, and X to take them back down. You get your wood back!',
      'A door is a wall you can walk through. Very useful. 😄',
      'Put lanterns everywhere. They light up at night!',
    ]));
    Hud().dialog('🔨 Bo the Builder', lines);
  }
  function pipTalk() {
    const D = Dr();
    if (D.hatched() && D.pos.distanceTo(P().pos) < 15) {
      if (!flags.pipGift) {
        flags.pipGift = true;
        Hud().dialog('🧒 Pip', [`IS THAT A REAL DRAGON?! Is it called ${D.name}? That's the BEST name!`, 'Here, you can have my treasure! 🪙'], () => { It().coins += 25; Hud().pickup('🪙', '+25 coins'); S().play('coin'); DL.FX.hearts(D.pos.x, D.pos.y + 2, D.pos.z, 8); });
      } else Hud().dialog('🧒 Pip', [U.pick([`Hi ${D.name}!! 👋`, 'When I grow up I want a dragon too!', 'Can your dragon do a backflip?'])]);
    } else Hud().dialog('🧒 Pip', [U.pick(['I wish I had a dragon...', 'Grandma Wren says there used to be dragons everywhere!', 'Do you have a dragon? Bring it here! Please please please!'])]);
  }

  // ------------------------------------------------------------
  //  SHOP
  // ------------------------------------------------------------
  function openShop(tab) {
    let cur = tab;
    Hud().panel('🛍️ Shop', () => {
      let h = `<div class="tabs"><button data-tab="buy" class="${cur === 'buy' ? 'on' : ''}">BUY</button><button data-tab="sell" class="${cur === 'sell' ? 'on' : ''}">SELL</button><span class="coins">🪙 ${It().coins}</span></div><div class="shop">`;
      if (cur === 'buy') {
        for (const s of SHOP) {
          const owned = (s.saddle && Dr().saddles.includes(s.saddle)) || (s.color && Dr().colors.includes(s.color));
          h += `<div class="row"><span class="big">${s.icon}</span><b>${s.name}</b><button data-buy="${s.id}" ${owned || It().coins < s.price ? 'disabled' : ''}>${owned ? 'You have it' : '🪙 ' + s.price}</button></div>`;
        }
      } else {
        let any = false;
        for (const id in It().inv) {
          const it = It().ITEMS[id];
          if (!it.sell || !It().inv[id]) continue;
          any = true;
          h += `<div class="row"><span class="big">${it.icon}</span><b>${it.name} ×${It().inv[id]}</b><button data-sell="${id}">Sell 1 (🪙${it.sell})</button><button data-sellall="${id}">Sell all (🪙${it.sell * It().inv[id]})</button></div>`;
        }
        if (!any) h += '<p class="sub">You have nothing to sell. Go fishing, chop trees or find crystals!</p>';
      }
      return h + '</div>';
    }, (el) => {
      el.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { cur = b.dataset.tab; Hud().repaintPanel(); });
      el.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
        const s = SHOP.find(x => x.id === b.dataset.buy);
        if (It().coins < s.price) return;
        It().coins -= s.price;
        if (s.give) s.give();
        if (s.saddle) { Dr().saddles.push(s.saddle); Hud().toast('🪢 New saddle! Press I to put it on your dragon.'); }
        if (s.color) { Dr().colors.push(s.color); Hud().toast('🎨 New paint! Press I to paint your dragon.'); }
        S().play('coin');
        Hud().repaintPanel();
      });
      const sell = (id, n) => { const it = It().ITEMS[id]; It().take(id, n); It().coins += it.sell * n; S().play('coin'); Hud().repaintPanel(); };
      el.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => sell(b.dataset.sell, 1));
      el.querySelectorAll('[data-sellall]').forEach(b => b.onclick = () => sell(b.dataset.sellall, It().inv[b.dataset.sellall]));
    });
  }

  // ------------------------------------------------------------
  //  SETUP
  // ------------------------------------------------------------
  function init() {
    const pl = places();
    addNpc('Wren', { shirt: 0x8a5aa0, pants: 0x5a4a6a, hair: 0xd8d8d8, hairStyle: 'bun', skin: 0xe8b890, dress: true, apron: 0xf0e8d8, scale: 0.92 }, pl.wren, wrenTalk, { yaw: Math.atan2(pl.dockDir.x, pl.dockDir.z) });
    addNpc('Finn', { shirt: 0x3a6a8a, pants: 0x3a3a4a, hair: 0x8a4a2a, beard: true, hat: 0xd8b860, bag: false }, pl.finn, finnTalk, { yaw: PI });
    addNpc('Mila', { shirt: 0xd84a6a, pants: 0x4a3a5a, hair: 0x2a1a10, hairStyle: 'long', dress: true, skin: 0xc8905a }, pl.mila, milaTalk);
    addNpc('Bo', { shirt: 0xd8a03a, pants: 0x4a4a4a, hair: 0x3a2a1a, beard: true, apron: 0x8a6a4a, scale: 1.08 }, pl.bo, boTalk);
    addNpc('Pip', { shirt: 0x5ad06a, pants: 0x3a5aa0, hair: 0xf0c050, hairStyle: 'spiky', scale: 0.7 }, pl.pip, pipTalk, { runs: true });
    // story stones
    pl.stones.forEach((s, i) => W().addThing({ x: s.x, y: W().terrainH(s.x, s.z), z: s.z, r: 3, label: () => 'Read story stone ' + ['I', 'II', 'III', 'IV'][i], use: () => readStone(i) }));
    // treasure chests
    pl.chests.forEach((c, i) => { c.thing = W().addThing({ x: c.x, y: c.y, z: c.z, r: 2.4, label: () => flags['chest' + i] ? 'Empty chest' : 'Open the treasure chest!', use: () => openChest(i) }); });
    // the heart and the altar
    pl.heart.thing = W().addThing({ x: pl.heart.x, y: pl.heart.y, z: pl.heart.z, r: 3, label: () => 'Take the Heart of the Volcano', ok: () => !flags.heart, use: takeHeart });
    W().addThing({ x: pl.altar.x, y: pl.altar.y - 1.5, z: pl.altar.z, r: 3.2, label: () => It().has('heart') ? 'Put the Heart on the altar' : flags.altar ? 'The Heart of the Volcano is home 🔥' : 'An old altar. Something is missing...', use: useAltar });
    // the egg in the cave
    W().addThing({ x: pl.cave.eggSpot.x, y: pl.cave.eggSpot.y, z: pl.cave.eggSpot.z, r: 3.4, label: () => 'Pick up the dragon egg', ok: () => Dr().egg.state === 'cave', use: () => Dr().pickEgg() });
    // you can stand on the lava (but it's HOT)
    const L = W().lava;
    W().addPlatform({ minx: L.x - L.r * 0.7, maxx: L.x + L.r * 0.7, minz: L.z - L.r * 0.7, maxz: L.z + L.r * 0.7, top: L.y, lava: true });
  }

  function readStone(i) {
    flags.stones = flags.stones || [];
    if (!flags.stones.includes(i)) flags.stones.push(i);
    S().play('stone');
    Hud().dialog('🪨 Story stone ' + ['I', 'II', 'III', 'IV'][i], [STONES[i], `(${flags.stones.length} of 4 stones read)`], () => check());
  }
  function openChest(i) {
    if (flags['chest' + i]) { Hud().toast('This chest is empty. You already found its treasure!'); return; }
    flags['chest' + i] = true;
    const c = places().chests[i];
    const L = CHEST_LOOT[i];
    c.obj.userData.lid.rotation.x = -1.9;
    S().play('treasure');
    DL.FX.burst(c.x, c.y + 1, c.z, 0xffd23a, 50);
    if (L.coins) It().coins += L.coins;
    if (L.items) for (const k in L.items) It().add(k, L.items[k], true);
    if (L.color && !Dr().colors.includes(L.color)) Dr().colors.push(L.color);
    if (L.saddle && !Dr().saddles.includes(L.saddle)) Dr().saddles.push(L.saddle);
    const found = places().chests.filter((_, k) => flags['chest' + k]).length;
    Hud().big('💰 TREASURE!', `You found ${L.text}  (${found} of 6 chests)`, 5);
    Hud().refresh();
  }
  function takeHeart() {
    if (flags.heart) return;
    flags.heart = true;
    places().heart.obj.visible = false;
    It().add('heart', 1);
    S().play('treasure');
    DL.FX.burst(places().heart.x, places().heart.y + 1.3, places().heart.z, 0xff6a2a, 60);
    Hud().big('🔥 THE HEART OF THE VOLCANO!', 'It\'s warm in your hands. Bring it to the altar at the Old Ruins!', 5);
    check();
  }
  function useAltar() {
    if (flags.altar) { Hud().toast('🔥 The Heart glows warmly on the altar.'); return; }
    if (!It().has('heart')) { Hud().toast(places().braziers.every(b => b.lit) ? '🌋 The Heart of the Volcano belongs here. Find it in the volcano!' : '🔥 The story stones say: light the four dragon fires first.'); return; }
    It().take('heart');
    flags.altar = true;
    const A = places().altar;
    const gem = DL.Models.heartGem();
    gem.position.set(A.x, A.y - 1.3, A.z);
    DL.Game.scene.add(gem);
    A.gem = gem;
    for (const b of places().braziers) lightBrazier(b, true);
    Dr().returned = true;
    Dr().dragonsReturn();
    S().play('fanfare');
    DL.FX.burst(A.x, A.y + 1, A.z, 0xff8a2a, 80);
    DL.FX.burst(A.x, A.y + 1, A.z, 0xffe680, 60);
    It().coins += 200;
    Hud().big('🐉 THE DRAGONS ARE COMING HOME!', 'Look at the sky! You brought the warmth back to the Ember Isles. (+200 🪙)', 8);
    check();
  }
  function lightBrazier(b, quiet) {
    if (b.lit && !quiet) return;
    const wasLit = b.lit;
    b.lit = true;
    b.obj.userData.flame.visible = true;
    if (!b.light) b.light = W().addLight({ x: b.x, y: b.y + 1.5, z: b.z, color: 0xff8a30, intensity: 30, range: 26, always: true, flicker: true });
    if (wasLit) return;
    S().play('whoosh');
    DL.FX.burst(b.x, b.y + 1, b.z, 0xff8a2a, 40);
    const n = places().braziers.filter(x => x.lit).length;
    if (n < 4) Hud().big(`🔥 Dragon fire ${n} of 4!`, n === 1 ? 'Find the other big stone bowls!' : '');
    else {
      S().play('rumble');
      Hud().big('🔥🔥🔥🔥 ALL FOUR FIRES ARE BURNING!', 'The ground shakes... The Heart of the Volcano is waiting in the volcano!', 6);
    }
    check();
  }
  // the dragon breathes fire: did it hit a stone bowl?
  function fireAt(o, dir, range) {
    for (const b of places().braziers) {
      if (b.lit) continue;
      const v = new THREE.Vector3(b.x - o.x, b.y + 0.5 - o.y, b.z - o.z);
      const d = v.length();
      if (d > range + 4) continue;
      v.normalize();
      if (v.dot(dir) > (d < 6 ? 0.5 : 0.82)) lightBrazier(b);
    }
  }

  // ------------------------------------------------------------
  //  QUESTS
  // ------------------------------------------------------------
  function check() {
    let advanced = false;
    while (q < QUESTS.length - 1 && QUESTS[q].done()) { q++; advanced = true; }
    if (advanced) {
      const Q = QUESTS[q];
      S().play('quest');
      Hud().questDone(Q);
      if (QUESTS[q - 1] && QUESTS[q - 1].id === 'fly') { It().coins += 20; }
    }
    Hud().quest(QUESTS[q]);
  }
  function event(name, arg) {
    if (name === 'feed') flags.fed = true;
    if (name === 'ride' && Dr().stage === 'adult') flags.flew = true;
    check();
  }

  // ------------------------------------------------------------
  //  EVERY FRAME
  // ------------------------------------------------------------
  let islT = 0;
  function update(dt) {
    const p = P();
    // people look at you
    for (const n of npcs) {
      n.t += dt;
      const dx = p.pos.x - n.x, dz = p.pos.z - n.z, d = Math.hypot(dx, dz);
      let speed = 0;
      if (n.opts.runs && d > 6) {
        // Pip runs around the well
        const V = places().village;
        const a = n.t * 0.35;
        const tx = V.x + Math.cos(a) * 9, tz = V.z + Math.sin(a) * 9;
        const ny = Math.atan2(tx - n.x, tz - n.z);
        n.yaw = U.dampAngle(n.yaw, ny, 5, dt);
        n.x += Math.sin(n.yaw) * 3.2 * dt; n.z += Math.cos(n.yaw) * 3.2 * dt;
        speed = 3.2;
      } else if (d < 10) n.yaw = U.dampAngle(n.yaw, Math.atan2(dx, dz), 3, dt);
      n.y = n.home.dock ? n.y : W().groundAt(n.x, n.z, n.y + 1);
      n.m.root.position.set(n.x, n.y, n.z);
      n.m.root.rotation.y = n.yaw;
      n.thing.x = n.x; n.thing.z = n.z; n.thing.y = n.y;
      n.col.x = n.x; n.col.z = n.z;
      n.talking = Math.max(0, (n.talking || 0) - dt);
      const hello = d < 9 && !n.waved;
      if (hello) { n.waved = true; n.waveT = 1.5; }
      if (d > 20) n.waved = false;
      n.waveT = Math.max(0, (n.waveT || 0) - dt);
      if (d < 120) n.m.animate(dt, { speed, t: n.t, wave: n.waveT, lookDown: Math.sin(n.t * 0.7) * 0.05 });
    }
    // which island are you on?
    islT -= dt;
    if (islT < 0) {
      islT = 1;
      const I = W().islandAt(p.pos.x, p.pos.z);
      if (I) {
        if (!flags['isl_' + I.id]) {
          flags['isl_' + I.id] = true;
          if (I.id !== 'home') { Hud().big('🏝️ ' + I.name.toUpperCase(), ISLAND_TEXT[I.id], 4); S().play('discover'); }
          check();
        }
        Hud().where(I.name);
      } else Hud().where('The Sea');
    }
    // lava is HOT
    const L = W().lava;
    if (!p.riding && Math.hypot(p.pos.x - L.x, p.pos.z - L.z) < L.r && p.pos.y < L.y + 0.3 && p.onGround) {
      const H = places().heart;
      p.pos.set(H.x + 1.5, H.y + 0.5, H.z);
      p.vy = 6;
      S().play('ouch');
      DL.FX.burst(p.pos.x, p.pos.y, p.pos.z, 0xff6a2a, 20);
      Hud().toast('🔥 OUCH! The lava is HOT! You jumped onto the rock.');
    }
    // the heart spins
    const H = places().heart;
    if (H.obj.visible) {
      H.obj.userData.gem.rotation.y += dt;
      H.obj.userData.gem.position.y = 1.3 + Math.sin(W().time * 2) * 0.15;
      if (Math.random() < dt * 6) DL.FX.ember(H.x, H.y + 1, H.z);
    }
    if (places().altar.gem) places().altar.gem.rotation.y += dt;
    for (const b of places().braziers) if (b.lit && Math.random() < dt * 8) DL.FX.ember(b.x, b.y + 0.5, b.z);
  }

  // ---------------- saving ----------------
  function save() { return { q, flags, braziers: places().braziers.map(b => b.lit) }; }
  function load(s) {
    q = s ? s.q : 0;
    flags = s ? Object.assign({}, s.flags) : {};
    places().braziers.forEach((b, i) => { b.lit = false; b.obj.userData.flame.visible = false; if (b.light) { W().removeLight(b.light); b.light = null; } if (s && s.braziers && s.braziers[i]) lightBrazier(b, true); });
    places().heart.obj.visible = !flags.heart;
    places().chests.forEach((c, i) => { c.obj.userData.lid.rotation.x = flags['chest' + i] ? -1.9 : 0; });
    if (flags.altar && !places().altar.gem) {
      const A = places().altar;
      const gem = DL.Models.heartGem(); gem.position.set(A.x, A.y - 1.3, A.z); DL.Game.scene.add(gem); A.gem = gem;
    }
    check();
  }

  return {
    init, update, event, check, fireAt, save, load, QUESTS, openShop,
    get quest() { return QUESTS[q]; }, get flags() { return flags; }, get q() { return q; },
    chestsFound: () => places().chests.filter((_, k) => flags['chest' + k]).length,
  };
})();
