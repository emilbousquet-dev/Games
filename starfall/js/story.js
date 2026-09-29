// ============================================================
//  STARFALL — THE STORY: Zib, the villagers, quests and the ending
//  (you can change what everybody says!)
// ============================================================
window.SF = window.SF || {};

SF.Story = (function () {
  const U = SF.U, L = SF.Layout;
  let zib = null, zibPos = new THREE.Vector3(), zibBounce = 0;
  const W = () => SF.State.world;
  const ME = () => SF.State.me;
  const ZIB = { who: 'ZIB', color: '#c8b0ff' };
  const z = (text) => ({ ...ZIB, text });
  const you = (text) => ({ who: SF.Game.myName(), color: '#ffb070', text });

  const POWERS = {
    glider: { name: 'GLIDER WINGS', how: 'Jump, then press JUMP again in the air to open your wings. Glide down from high places!' },
    bow: { name: 'PLASMA BOW', how: 'Hold Q (or LB) to aim, then CLICK (or RT) to shoot. Shoot crystals, switches and far away enemies!' },
    boots: { name: 'JET BOOTS', how: 'Jump, then press JUMP again in the air for a DOUBLE JUMP!' },
  };

  // ---------- what should you do now? ----------
  function objective() {
    const w = W();
    if (w.flags.fixed) return { text: 'You fixed the ship! Explore as much as you like.', x: L.crash.x, z: L.crash.z };
    if (w.parts.every((p) => p)) return { text: 'Bring the 4 parts back to your ship!', x: L.crash.x, z: L.crash.z };
    if (!w.flags.metElder) return { text: 'Follow the star shards to Zib\'s village', x: L.village.x, z: L.village.z };
    const t = L.temples;
    if (!w.rewards[0]) {
      if (!w.doors[0]) return { text: 'Light the 3 rune stones at the Temple of Roots (Glow Jungle)', x: t[0].x, z: t[0].z };
      return { text: 'Enter the Temple of Roots and defeat its guardian', x: t[0].x, z: t[0].z };
    }
    if (!w.rewards[1]) return { text: 'Glide from the big hill to the Temple of Sands on the desert cliff', x: t[1].x, z: t[1].z };
    if (!w.rewards[2]) {
      if (!w.doors[2]) return { text: 'Shoot the 3 crystals to open the Temple of Frost (Frozen Peaks)', x: t[2].x, z: t[2].z };
      return { text: 'Enter the Temple of Frost', x: t[2].x, z: t[2].z };
    }
    return { text: 'Double jump up the stone pillars to the Lava Rift, then glide to the Temple of Embers', x: 70, z: -40 };
  }

  // ---------- Zib, your little alien friend ----------
  function build(scene) {
    zib = SF.Models.zib();
    zib.group.scale.setScalar(0.8);
    scene.add(zib.group);
  }
  function update(dt, time) {
    const P = SF.Game.player;
    if (!zib || !P) return;
    const side = new THREE.Vector3(Math.cos(P.facing) * -0.9, 0, -Math.sin(P.facing) * -0.9);
    const behind = new THREE.Vector3(-Math.sin(P.facing) * 1.1, 0, -Math.cos(P.facing) * 1.1);
    const want = P.pos.clone().add(side).add(behind);
    want.y += 2.1 + Math.sin(time * 2) * 0.15;
    if (zibPos.distanceTo(want) > 30) zibPos.copy(want);
    zibPos.lerp(want, 1 - Math.exp(-dt * 3));
    zibBounce = Math.max(0, zibBounce - dt);
    zib.group.position.copy(zibPos);
    zib.group.position.y += Math.abs(Math.sin(zibBounce * 12)) * zibBounce * 0.8;
    const cam = SF.Game.camera;
    const look = SF.HUD.dialogOpen ? cam.position : P.pos.clone().add(new THREE.Vector3(Math.sin(P.facing) * 6, 1, Math.cos(P.facing) * 6));
    zib.group.rotation.y = U.dampAngle(zib.group.rotation.y, Math.atan2(look.x - zibPos.x, look.z - zibPos.z), 4, dt);
    zib.antennas.forEach((a, i) => (a.rotation.x = Math.sin(time * 4 + i) * 0.2));
    zib.fins.forEach((f, i) => (f.rotation.x = Math.sin(time * 10 + i) * 0.3));
    zib.group.visible = !SF.Game.cutscene || SF.Game.cutscene.showZib;
  }
  function bounce() { zibBounce = 1; }

  function say(lines, done) {
    bounce();
    SF.HUD.dialog(lines, done);
  }

  // ---------- the start of the game ----------
  function intro() {
    const P = SF.Game.player;
    P.down = true; P.frozen = true;
    SF.Game.fadeIn(2.5);
    setTimeout(() => {
      P.down = false; P.hp = P.maxHp;
      say([
        z('Bzzt! Hello? HELLO?! Are you alive?'),
        z('You fell out of the sky in a big shiny egg! BOOM! It was AMAZING!'),
        z('I\'m ZIB! Welcome to VEYRA, the planet with two moons!'),
        you('My ship... it\'s broken. 4 parts are missing. I can\'t go home like this...'),
        z('Shiny parts? The old TEMPLES are full of shiny things! But they are guarded by BIG scary monsters.'),
        z('The Elder in my village knows all about them. Follow the STAR SHARDS, they lead to Zibville!'),
        z('I\'ll come with you! If you get lost, press E when nothing is around to talk to me.'),
      ], () => {
        P.frozen = false;
        SF.HUD.help(true);
        W().flags.intro = true;
        SF.Game.save();
      });
    }, 2600);
  }

  // talking to Zib (E with nothing around)
  function talkZib() {
    const o = objective();
    const tips = [
      'Spinecrabs have armor on their faces. Hit them from BEHIND, or right after they lunge!',
      'Hold RIGHT CLICK (or LT) to block with your shield. It stops almost everything!',
      'Climb the signal towers to see more of the map. Press M to open it.',
      'Beacons save your game, and you can teleport between them!',
      'Gloops come out at night. They are a bit spooky... and a bit cute.',
      'If you fall from very high, it hurts! Unless you have wings...',
      'Mo the trader sells hearts and better swords for star shards!',
      'Find 4 heart pieces to get a whole new heart!',
      'Swing your sword 3 times in a row for a super strong final hit!',
    ];
    const lines = [z(o.text + '!')];
    if (Math.random() < 0.7) lines.push(z(U.pick(tips)));
    say(lines);
  }

  // ---------- the villagers ----------
  const PIP_TIPS = [
    'Did you know? Rock golems have a glowing crystal on their back. That\'s where it hurts!',
    'Zapwings shoot lightning. Hide behind your shield!',
    'There are ring races on the island. Fly through all the rings before the time runs out!',
    'I saw a chest on top of a FLOATING rock! How do you get up there?!',
    'At night the mushrooms glow. It\'s my favorite time!',
    'My mom says don\'t swim too far. You get tired and the waves bring you back.',
  ];
  function talk(id) {
    const w = W();
    const npcs = { quib: 'ELDER QUIB', mo: 'MO', pip: 'PIP', zara: 'ZARA' };
    const col = { quib: '#a8b8ff', mo: '#ffc080', pip: '#90ffb0', zara: '#ffe070' }[id];
    const n = (text) => ({ who: npcs[id], color: col, text });
    SF.Audio.chirp(0.8);
    if (id === 'quib') {
      if (!w.flags.metElder) {
        say([
          n('A visitor from the stars! Zib told me everything. Welcome, welcome.'),
          n('Long ago, the Ancients built FOUR TEMPLES. Each one keeps a Star Relic... and a Guardian.'),
          n('Your ship parts must be those relics. The Guardians will not give them up easily!'),
          n('The first is the TEMPLE OF ROOTS, in the Glow Jungle to the west. Light its three rune stones with your sword to open the door.'),
          n('Each temple also holds an ancient POWER. You will need them to reach the other temples.'),
          z('Ooooh, an ADVENTURE! Let\'s go, let\'s go!'),
        ], () => { SF.World.event({ t: 'flag', k: 'metElder', v: true }); W().flags.metElder = true; SF.Game.save(); });
      } else {
        const o = objective();
        say([n('Hmm... ' + o.text + '.'), n(U.pick(['The stars are watching over you.', 'Be brave, little star traveler.', 'Rest at a beacon if you are hurt.']))]);
      }
    } else if (id === 'mo') {
      say([n('Welcome to Mo\'s! Best stuff on Veyra! Well... only stuff on Veyra.')], () => SF.HUD.openShop());
    } else if (id === 'pip') {
      say([n(U.pick(PIP_TIPS))]);
    } else if (id === 'zara') {
      const hp = ME().heartPieces;
      say([
        n('I\'m an explorer too! I love climbing the old SIGNAL TOWERS. From the top you can see everything!'),
        n('Some chests have HEART PIECES inside. Puzzles too: rune stones, ring races, crystal targets...'),
        n('You have ' + hp + ' heart piece' + (hp === 1 ? '' : 's') + '. Four of them make a new heart!'),
        n(w.powers.glider ? 'With wings you can jump off a tower and glide really far!' : 'If only we could fly...'),
      ]);
    }
  }

  // ---------- shop ----------
  function buy(item) {
    const me = ME();
    const lv = { heart: me.boughtHearts || 0, energy: me.energyLv, sword: me.swordLv }[item.id];
    if (lv >= item.max) { SF.Audio.sfx('no'); SF.HUD.toast('Sold out!'); return false; }
    if (me.shards < item.price) { SF.Audio.sfx('no'); SF.HUD.toast('Not enough star shards!'); return false; }
    me.shards -= item.price;
    if (item.id === 'heart') { me.boughtHearts = (me.boughtHearts || 0) + 1; me.maxHearts++; SF.Game.player.heal(99); }
    if (item.id === 'energy') me.energyLv++;
    if (item.id === 'sword') me.swordLv++;
    SF.Audio.sfx('item');
    SF.Game.save();
    return true;
  }
  function shopLevel(id) { const me = ME(); return { heart: me.boughtHearts || 0, energy: me.energyLv, sword: me.swordLv }[id]; }

  // ---------- temples ----------
  function lockedDoor(i) {
    if (i === 0) say([z('It\'s locked! Look, there are 3 rune stones around. Hit them all with your sword, FAST!')]);
    else if (i === 2) say([z('Locked! See those 3 crystals up on the ice pillars? We need something to hit them from far away...')].concat(W().powers.bow ? [z('YOUR BOW! Hold Q to aim and click to shoot!')] : []));
    else if (i === 3) say([z('The door is sealed by three lights... It needs the other three relics!')]);
  }

  function bossIntro(i) {
    const names = { thornmaw: 'THORNMAW, THE HUNGRY ROOT', sandwyrm: 'SANDWYRM, EATER OF DUNES', colossus: 'FROST COLOSSUS', emberking: 'THE EMBER KING' };
    const hints = [
      'Watch out for its vines! After it slams a few times it gets tired and opens its mouth. Hit it then!',
      'It charges in a straight line! Stand in front of a pillar, then jump out of the way!',
      'It\'s too big to hit! Shoot its red eye with your bow to knock it down!',
      'Shoot its glowing eye to bring it down! Jump over the rings of fire!',
    ];
    SF.Audio.setMusic('temple');
    setTimeout(() => {
      if (W().bosses[i]) return;
      SF.HUD.bossTitle(names[L.temples[i].boss]);
      SF.Audio.sfx('roar');
      SF.Audio.setMusic('boss');
      setTimeout(() => SF.HUD.toast('ZIB: ' + hints[i], 0xc8b0ff, 6), 2600);
    }, 1500);
  }

  function bossDefeated(i) {
    SF.Audio.setMusic('temple');
    setTimeout(() => SF.Audio.sfx('fanfare'), 600);
    SF.HUD.bossBar(null);
    SF.HUD.toast('The Guardian is defeated! Take the relic!', 0xffe060, 5);
  }

  function gotReward(i) {
    const t = L.temples[i];
    const me = ME();
    me.maxHearts++;
    SF.Game.player.heal(99);
    SF.Audio.sfx('item');
    const pw = t.power && POWERS[t.power];
    const count = W().parts.filter((p) => p).length;
    const lines = [];
    SF.HUD.itemBanner('YOU GOT THE ' + t.part + '!', count + ' of 4 ship parts   ♥ +1 heart');
    if (pw) {
      setTimeout(() => {
        SF.HUD.itemBanner('NEW POWER: ' + pw.name, pw.how);
        SF.Audio.sfx('fanfare');
      }, 3200);
      lines.push(z('WOW! You got the ' + pw.name + '!'), z(pw.how));
    }
    if (count === 4) lines.push(z('That\'s ALL FOUR parts! Let\'s go back to your ship!'));
    else lines.push(z('Only ' + (4 - count) + ' more to go! ' + objective().text + '!'));
    setTimeout(() => say(lines), pw ? 6600 : 3400);
    SF.Game.save();
  }

  function gotHeartPiece() {
    const me = ME();
    me.heartPieces++;
    SF.Audio.sfx('heart');
    if (me.heartPieces % 4 === 0) {
      me.maxHearts++;
      SF.Game.player.heal(99);
      SF.HUD.itemBanner('HEART PIECE!', '4 pieces make a NEW HEART! ♥');
      SF.Audio.sfx('fanfare');
    } else {
      SF.HUD.itemBanner('HEART PIECE!', (me.heartPieces % 4) + ' / 4 pieces');
    }
    SF.Game.save();
  }

  // ---------- the ship and THE ENDING ----------
  function shipTalk() {
    const w = W();
    const n = w.parts.filter((p) => p).length;
    if (w.flags.fixed) { say([z('Your ship looks so shiny now! Do you want to explore some more?')]); return; }
    if (n < 4) {
      say([you('Still missing ' + (4 - n) + ' part' + (4 - n === 1 ? '' : 's') + '...'), z(objective().text + '!')]);
      return;
    }
    say([
      you('The Engine Core... the Navigation Chip... the Fuel Cell... and the Hyperdrive Crystal!'),
      z('Is it going to work? Is it? IS IT?!'),
    ], () => SF.World.event({ t: 'ending' }));
  }

  function ending() {
    const w = W();
    if (SF.Game.cutscene) return;
    w.flags.fixed = true;
    SF.Game.save();
    const ship = SF.World.ship;
    const P = SF.Game.player;
    const cam = SF.Game.camera;
    const start = ship.position.clone();
    let t = 0;
    SF.Audio.setMusic('title');
    ship.userData.flames.forEach((f) => (f.visible = true));
    ship.rotation.set(0, ship.rotation.y, 0);
    SF.Game.cutscene = {
      showZib: true,
      update(dt) {
        t += dt;
        if (t < 3) { // shake and power up
          ship.position.set(start.x + Math.sin(t * 40) * 0.05, start.y + t * 0.3, start.z);
          if (Math.random() < 0.5) SF.FX.puff(start.x, start.y - 1, start.z, 0xa0e0ff, 2);
        } else { // FLY!
          const k = t - 3;
          ship.position.set(start.x - Math.sin(ship.rotation.y) * k * k * 3, start.y + 0.9 + k * k * 2.4, start.z - Math.cos(ship.rotation.y) * k * k * 3);
          ship.rotation.x = -Math.min(0.7, k * 0.2);
          if (k < 0.1) { SF.Audio.sfx('jet'); SF.Audio.sfx('boom'); }
        }
        ship.userData.flames.forEach((f) => f.scale.set(1, 1 + Math.random() * 0.4, 1));
        cam.position.set(start.x + 22, start.y + 6 + Math.min(40, t * 3), start.z + 18);
        cam.lookAt(ship.position);
        P.avatar.group.visible = false;
        if (t > 9 && !this.shown) {
          this.shown = true;
          SF.HUD.credits({
            time: U.timeText(w.playTime), shards: ME().shards, hearts: ME().maxHearts, pieces: ME().heartPieces,
            chests: Object.keys(w.chests).length,
          }, () => {
            SF.Game.cutscene = null;
            ship.position.copy(start);
            ship.position.y = SF.Terrain.heightAt(L.crash.x, L.crash.z) + 2.2;
            ship.rotation.set(0, ship.rotation.y, 0);
            ship.userData.flames.forEach((f) => (f.visible = false));
            P.avatar.group.visible = true;
            P.camInit = false;
          });
        }
      },
    };
  }

  return { build, update, objective, intro, talk, talkZib, buy, shopLevel, lockedDoor, bossIntro, bossDefeated, gotReward, gotHeartPiece, shipTalk, ending, POWERS, bounce };
})();
