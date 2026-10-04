// ============================================================
//  DRAGON LIFE — ITEMS, TOOLS, FISHING AND COOKING
//  Want a new food? Add it to ITEMS and RECIPES below!
// ============================================================
window.DL = window.DL || {};

DL.Items = (function () {
  const U = DL.U;
  const S = () => DL.Audio;
  const W = () => DL.World;
  const Hud = () => DL.Hud;

  // food = how much it fills YOUR tummy. dragon = what it does for your dragon.
  const ITEMS = {
    wood: { name: 'Wood', icon: '🪵', sell: 1 },
    stone: { name: 'Stone', icon: '🪨', sell: 1 },
    crystal: { name: 'Crystal', icon: '💎', sell: 10 },
    berries: { name: 'Berries', icon: '🫐', food: 6, dragon: { grow: 1, hunger: 8, happy: 4 }, sell: 1, color: 0x5a3ad8 },
    mushroom: { name: 'Mushroom', icon: '🍄', food: 5, dragon: { grow: 1, hunger: 6, happy: 3 }, sell: 2, color: 0xd83a3a },
    fish: { name: 'Fish', icon: '🐟', raw: true, dragon: { grow: 4, hunger: 25, happy: 10 }, sell: 3, color: 0x7ab0d0 },
    bigfish: { name: 'Big Fish', icon: '🐠', raw: true, dragon: { grow: 6, hunger: 40, happy: 12 }, sell: 6, color: 0xff9a3a },
    goldfish: { name: 'Golden Fish', icon: '🐡', raw: true, dragon: { grow: 16, hunger: 45, happy: 30 }, sell: 25, color: 0xffd23a },
    grilled: { name: 'Grilled Fish', icon: '🍢', food: 35, dragon: { grow: 7, hunger: 45, happy: 15 }, sell: 6, color: 0xc87a3a },
    pie: { name: 'Berry Pie', icon: '🥧', food: 45, dragon: { grow: 5, hunger: 30, happy: 22 }, sell: 8, color: 0xd8a050 },
    soup: { name: 'Mushroom Soup', icon: '🍲', food: 40, dragon: { grow: 5, hunger: 30, happy: 14 }, sell: 7, color: 0xb8704a },
    feast: { name: 'Dragon Feast', icon: '🍖', food: 60, dragon: { grow: 20, hunger: 100, happy: 40 }, sell: 15, color: 0xa04a2a },
    seeds: { name: 'Berry Seeds', icon: '🌱', sell: 1 },
    egg: { name: 'Dragon Egg', icon: '🥚' },
    heart: { name: 'Heart of the Volcano', icon: '🔥' },
  };
  const FOODS = ['berries', 'mushroom', 'fish', 'bigfish', 'goldfish', 'grilled', 'pie', 'soup', 'feast'];
  const RECIPES = [
    { out: 'grilled', n: 1, need: { fish: 1 }, text: 'Grill a fish' },
    { out: 'grilled', n: 2, need: { bigfish: 1 }, text: 'Grill a big fish (makes 2!)' },
    { out: 'pie', n: 1, need: { berries: 5 }, text: 'Bake a berry pie' },
    { out: 'soup', n: 1, need: { mushroom: 3 }, text: 'Cook mushroom soup' },
    { out: 'feast', n: 1, need: { grilled: 2, berries: 3, mushroom: 1 }, text: 'Make a DRAGON FEAST (dragons LOVE it)' },
    { out: 'feast', n: 2, need: { goldfish: 1 }, text: 'Golden fish = 2 feasts!' },
  ];
  // the hotbar
  const TOOLS = [
    { id: 'axe', icon: '🪓', name: 'Axe', tip: 'Click a tree to chop it' },
    { id: 'pick', icon: '⛏️', name: 'Pickaxe', tip: 'Click a rock or crystal to mine it' },
    { id: 'rod', icon: '🎣', name: 'Fishing Rod', tip: 'Click when you face the water' },
    { id: 'food', icon: '🍽️', name: 'Food', tip: 'Click to eat, or feed your dragon. Q = other food' },
    { id: 'stick', icon: '🦴', name: 'Fetch Stick', tip: 'Click to throw it. Your dragon brings it back!' },
    { id: 'build', icon: '🔨', name: 'Build', tip: 'Build houses and a nest' },
  ];

  const I = {
    ITEMS, FOODS, RECIPES, TOOLS,
    inv: {}, coins: 0, food: 100, slot: 0, foodSel: 'berries',
  };

  // ---------------- inventory ----------------
  I.count = (id) => I.inv[id] || 0;
  I.has = (id, n = 1) => (I.inv[id] || 0) >= n;
  I.add = (id, n = 1, quiet) => {
    I.inv[id] = (I.inv[id] || 0) + n;
    if (!quiet) Hud().pickup(ITEMS[id].icon, '+' + n + ' ' + ITEMS[id].name);
    if (FOODS.includes(id) && !I.has(I.foodSel)) I.foodSel = id;
    Hud().refresh();
  };
  I.take = (id, n = 1) => {
    if (!I.has(id, n)) return false;
    I.inv[id] -= n;
    if (I.inv[id] <= 0) delete I.inv[id];
    if (id === I.foodSel && !I.has(id)) I.nextFood();
    Hud().refresh();
    return true;
  };
  I.hasAll = (need) => Object.keys(need).every(k => I.has(k, need[k]));
  I.takeAll = (need) => { if (!I.hasAll(need)) return false; for (const k in need) I.take(k, need[k]); return true; };
  I.nextFood = () => {
    const have = FOODS.filter(f => I.has(f));
    if (!have.length) return;
    const i = have.indexOf(I.foodSel);
    I.foodSel = have[(i + 1) % have.length];
    Hud().refresh();
  };
  I.needText = (need) => Object.keys(need).map(k => `${need[k]} ${ITEMS[k].icon}`).join(' + ');
  I.tool = () => TOOLS[I.slot].id;

  // ---------------- your tummy ----------------
  let hungryWarn = 0;
  I.update = (dt, P) => {
    I.food = Math.max(0, I.food - dt / 9);
    hungryWarn -= dt;
    if (I.food < 20 && hungryWarn < 0) {
      hungryWarn = 60;
      Hud().toast('😋 You are getting hungry! Pick 🍽️ (key 4) and click to eat.');
    }
    updateFishing(dt, P);
    updateStick(dt);
  };
  I.eat = (id) => {
    const it = ITEMS[id];
    if (!it) return;
    if (it.raw) { Hud().toast('🔥 Raw fish? Yuck! Cook it at a campfire first. (Dragons love raw fish though!)'); return; }
    if (!it.food) return;
    if (I.food > 97) { Hud().toast('😊 You are full!'); return; }
    I.take(id);
    I.food = Math.min(100, I.food + it.food);
    S().play('eat');
    Hud().pickup(it.icon, 'Yum! ' + it.name);
  };

  // ---------------- chopping and mining ----------------
  // the tree or rock right in front of you
  I.nodeInFront = (P, kinds, reach = 2.6) => {
    const fx = Math.sin(P.yaw), fz = Math.cos(P.yaw);
    let best = null, bd = Infinity;
    for (const n of W().nodesNear(P.pos.x, P.pos.z, reach + 2)) {
      if (!n.alive || !kinds.includes(n.kind)) continue;
      const dx = n.x - P.pos.x, dz = n.z - P.pos.z;
      const r = n.type === 'giant' ? 1.3 * n.s : n.kind === 'rock' ? 0.85 * n.s : 0.5;
      const d = Math.hypot(dx, dz) - r;
      if (d > reach) continue;
      const dot = (dx * fx + dz * fz) / Math.max(0.01, Math.hypot(dx, dz));
      if (dot < 0.35 && d > 0.6) continue;
      if (Math.abs(n.y - P.pos.y) > 4) continue;
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  };
  I.hit = (P) => {
    const tool = I.tool();
    const n = I.nodeInFront(P, tool === 'axe' ? ['tree', 'rock', 'crystal'] : ['rock', 'crystal', 'tree']);
    if (!n) { S().play('swish'); return; }
    if (tool === 'axe' && n.kind !== 'tree') { S().play('clink'); Hud().toast('⛏️ Use the pickaxe (key 2) for rocks!'); return; }
    if (tool === 'pick' && n.kind === 'tree') { S().play('chop'); Hud().toast('🪓 Use the axe (key 1) for trees!'); return; }
    n.hp--;
    const hy = n.y + (n.kind === 'tree' ? 1.2 : 0.6);
    if (n.kind === 'tree') { S().play('chop'); DL.FX.chips(n.x, hy, n.z); W().shake(n); if (n.type !== 'dead') DL.FX.leaves(n.x, n.y, n.z, 3); }
    else { S().play('clink'); DL.FX.chips(n.x, hy, n.z, n.kind === 'crystal' ? 0x9af0ff : 0x9a968e); DL.FX.sparkle(n.x, hy, n.z, n.kind === 'crystal' ? 0x9af0ff : 0xffffff, 5); }
    if (n.hp > 0) return;
    // done!
    W().setNodeAlive(n, false);
    n.regrowAt = W().time + (n.kind === 'tree' ? 300 : 420);
    W().regrowList.push(n);
    if (n.kind === 'tree') {
      S().play('treefall');
      DL.FX.leaves(n.x, n.y, n.z, 20);
      DL.FX.dust(n.x, n.y, n.z);
      I.add('wood', n.type === 'giant' ? 8 : n.type === 'dead' ? 2 : 3);
      if (Math.random() < 0.25) I.add('seeds', 1);
      DL.Story.event('chop');
    } else if (n.kind === 'rock') {
      S().play('rockbreak');
      DL.FX.dust(n.x, n.y, n.z, 18, 0x9a968e);
      I.add('stone', Math.max(1, Math.round(n.s * 2.5)));
      DL.Story.event('mine');
    } else if (n.kind === 'crystal') {
      S().play('crystal');
      DL.FX.burst(n.x, n.y + 1, n.z, 0x9af0ff, 24);
      I.add('crystal', 1 + (Math.random() < 0.4 ? 1 : 0));
    }
  };
  // picking berries and mushrooms with E
  I.pickNode = (n) => {
    if (n.kind === 'bush') {
      W().setNodeAlive(n, false, 'berries');
      n.regrowAt = W().time + 180; W().regrowList.push(n);
      I.add('berries', 2 + Math.floor(Math.random() * 2));
      if (Math.random() < 0.3) I.add('seeds', 1);
      S().play('pick');
      DL.FX.sparkle(n.x, n.y + 0.8, n.z, 0xb08aff, 8);
    } else if (n.kind === 'mushroom') {
      W().setNodeAlive(n, false);
      n.regrowAt = W().time + 240; W().regrowList.push(n);
      I.add('mushroom', 1 + (Math.random() < 0.4 ? 1 : 0));
      S().play('pick');
      DL.FX.sparkle(n.x, n.y + 0.5, n.z, 0xff8a8a, 8);
    }
  };

  // ---------------- FISHING ----------------
  const F = I.fish = { state: 'idle', t: 0, bob: null, line: null, target: null, needle: 0, dir: 1, zone: [0.4, 0.6], catch: null };
  function makeBobber() {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xff3030 }));
    const bot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    g.add(top, bot);
    DL.Game.scene.add(g);
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    F.line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }));
    F.line.frustumCulled = false;
    DL.Game.scene.add(F.line);
    return g;
  }
  I.castOrReel = (P) => {
    if (F.state === 'idle') {
      if (P.swimming) { Hud().toast('🏊 You can\'t fish while swimming!'); return; }
      // look for water in front of you
      let spot = null;
      for (let d = 10; d >= 4; d -= 0.5) {
        const x = P.pos.x + Math.sin(P.yaw) * d, z = P.pos.z + Math.cos(P.yaw) * d;
        if (W().groundAt(x, z) < -0.6) { spot = { x, z }; break; }
      }
      if (!spot) { Hud().toast('🎣 Face the water to fish! A dock or a beach is perfect.'); return; }
      if (!F.bob) F.bob = makeBobber();
      F.state = 'cast'; F.t = 0; F.target = spot;
      F.from = P.rodTip.clone();
      S().play('cast');
      return;
    }
    if (F.state === 'wait' || F.state === 'cast') { stopFishing('Reeled in. Nothing this time!'); return; }
    if (F.state === 'bite') {
      // start the catching game
      const r = Math.random(), night = W().night > 0.5;
      F.catch = r < (night ? 0.12 : 0.07) ? 'goldfish' : r < 0.36 ? 'bigfish' : 'fish';
      const size = F.catch === 'goldfish' ? 0.14 : F.catch === 'bigfish' ? 0.2 : 0.28;
      const c = U.rand(0.2 + size / 2, 0.8 - size / 2);
      F.zone = [c - size / 2, c + size / 2];
      F.speed = F.catch === 'goldfish' ? 1.5 : F.catch === 'bigfish' ? 1.2 : 0.9;
      F.needle = 0; F.dir = 1;
      F.state = 'reel'; F.t = 0;
      Hud().fishGame(true, F);
      S().play('reel');
      return;
    }
    if (F.state === 'reel') {
      Hud().fishGame(false);
      if (F.needle >= F.zone[0] && F.needle <= F.zone[1]) {
        I.add(F.catch, 1);
        S().play('catch');
        DL.FX.splash(F.bob.position.x, F.bob.position.z, 24);
        DL.FX.sparkle(F.bob.position.x, 0.5, F.bob.position.z, F.catch === 'goldfish' ? 0xffd23a : 0xbfefff, 20);
        Hud().big(ITEMS[F.catch].icon + ' ' + ITEMS[F.catch].name.toUpperCase() + '!', F.catch === 'goldfish' ? 'WOW, a rare one!' : 'Nice catch!');
        DL.Story.event('fish', F.catch);
        stopFishing();
      } else {
        S().play('miss');
        stopFishing('🐟 It got away! Click when the needle is in the GREEN part.');
      }
    }
  };
  function stopFishing(msg) {
    if (F.state === 'reel') Hud().fishGame(false);
    F.state = 'idle';
    if (F.bob) F.bob.visible = false;
    if (F.line) F.line.visible = false;
    if (msg) Hud().toast(msg);
  }
  I.stopFishing = stopFishing;
  function updateFishing(dt, P) {
    if (F.state === 'idle') return;
    F.t += dt;
    const tip = P.rodTip;
    if (I.tool() !== 'rod' || P.riding || P.swimming || Math.hypot(P.pos.x - F.target.x, P.pos.z - F.target.z) > 14) { stopFishing(); return; }
    const b = F.bob;
    b.visible = true; F.line.visible = true;
    if (F.state === 'cast') {
      const k = Math.min(1, F.t / 0.6);
      b.position.set(U.lerp(F.from.x, F.target.x, k), U.lerp(F.from.y, 0.05, k) + Math.sin(k * Math.PI) * 3, U.lerp(F.from.z, F.target.z, k));
      if (k >= 1) { F.state = 'wait'; F.t = 0; F.wait = U.rand(2, 6); DL.FX.splash(F.target.x, F.target.z, 8); S().play('plop'); }
    } else if (F.state === 'wait') {
      b.position.set(F.target.x, 0.05 + Math.sin(F.t * 3) * 0.05, F.target.z);
      if (F.t > F.wait) { F.state = 'bite'; F.t = 0; S().play('bite'); DL.FX.splash(F.target.x, F.target.z, 14); Hud().big('❗', 'CLICK NOW!', 0.9); }
    } else if (F.state === 'bite') {
      b.position.set(F.target.x + Math.sin(F.t * 30) * 0.08, -0.15 + Math.sin(F.t * 20) * 0.08, F.target.z);
      if (F.t > 1.2) stopFishing('🐟 Too slow! Click as soon as the bobber goes under.');
    } else if (F.state === 'reel') {
      F.needle += F.dir * F.speed * dt;
      if (F.needle > 1) { F.needle = 1; F.dir = -1; }
      if (F.needle < 0) { F.needle = 0; F.dir = 1; }
      b.position.set(F.target.x + Math.sin(F.t * 25) * 0.15, -0.1, F.target.z + Math.cos(F.t * 21) * 0.15);
      Hud().fishGame(true, F);
      if (Math.random() < dt * 8) DL.FX.splash(b.position.x, b.position.z, 2);
      if (F.t > 8) stopFishing('🐟 It got away!');
    }
    const pa = F.line.geometry.attributes.position;
    pa.setXYZ(0, tip.x, tip.y, tip.z); pa.setXYZ(1, b.position.x, b.position.y + 0.1, b.position.z);
    pa.needsUpdate = true;
  }

  // ---------------- FETCH STICK ----------------
  const stick = I.stick = { state: 'held', obj: null, pos: new THREE.Vector3(), vel: new THREE.Vector3() };
  I.throwStick = (P) => {
    if (stick.state !== 'held') { Hud().toast('🦴 Your stick is out there! Your dragon will bring it back.'); return; }
    if (!stick.obj) {
      stick.obj = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 5), DL.Models.mat(0x8a5a30));
      stick.obj.castShadow = true;
      DL.Game.scene.add(stick.obj);
    }
    stick.pos.copy(P.pos).add(new THREE.Vector3(0, 1.6, 0));
    stick.vel.set(Math.sin(P.camYaw) * 13, 7, Math.cos(P.camYaw) * 13);
    stick.state = 'flying';
    stick.obj.visible = true;
    S().play('throw');
    P.swing = 0.01;
  };
  function updateStick(dt) {
    if (stick.state === 'flying') {
      stick.vel.y -= 20 * dt;
      stick.pos.addScaledVector(stick.vel, dt);
      const g = Math.max(W().groundAt(stick.pos.x, stick.pos.z, stick.pos.y), 0);
      if (stick.pos.y <= g + 0.05) {
        stick.pos.y = g + 0.05;
        stick.state = 'ground';
        if (W().terrainH(stick.pos.x, stick.pos.z) < 0) DL.FX.splash(stick.pos.x, stick.pos.z, 8);
        else DL.FX.dust(stick.pos.x, stick.pos.y, stick.pos.z, 5);
        stick.landT = W().time;
      }
      stick.obj.position.copy(stick.pos);
      stick.obj.rotation.x += dt * 12;
    } else if (stick.state === 'ground') {
      stick.obj.position.copy(stick.pos);
      stick.obj.rotation.set(Math.PI / 2, 0, 0.3);
      // nobody fetches it? it comes back to your bag after a while
      if (!DL.Dragon.canFetch() && W().time - stick.landT > 4) I.stickHome(false);
    } else if (stick.state === 'carried') {
      stick.obj.position.copy(DL.Dragon.mouthPos());
      stick.obj.rotation.set(0, DL.Dragon.yaw + Math.PI / 2, Math.PI / 2);
    }
  }
  I.stickHome = (praised) => {
    stick.state = 'held';
    if (stick.obj) stick.obj.visible = false;
    if (!praised) Hud().toast('🦴 The stick is back in your bag.');
  };

  // ---------------- COOKING ----------------
  I.openCooking = () => {
    Hud().panel('🔥 Campfire cooking', () => {
      let html = '<p class="sub">Cook food for you and your dragon. Cooked food fills you up more!</p><div class="recipes">';
      RECIPES.forEach((r, i) => {
        const ok = I.hasAll(r.need);
        html += `<button class="recipe ${ok ? '' : 'no'}" data-cook="${i}"><span class="big">${ITEMS[r.out].icon}${r.n > 1 ? '×' + r.n : ''}</span><b>${ITEMS[r.out].name}</b><small>${r.text}</small><em>${I.needText(r.need)}</em></button>`;
      });
      html += '</div>';
      return html;
    }, (el) => {
      el.querySelectorAll('[data-cook]').forEach(b => b.onclick = () => {
        const r = RECIPES[+b.dataset.cook];
        if (!I.takeAll(r.need)) { S().play('no'); Hud().toast('You need ' + I.needText(r.need)); return; }
        I.add(r.out, r.n);
        S().play('sizzle');
        DL.Story.event('cook', r.out);
        Hud().repaintPanel();
      });
    });
  };

  // ---------------- saving ----------------
  I.save = () => ({ inv: I.inv, coins: I.coins, food: I.food, slot: I.slot, foodSel: I.foodSel });
  I.load = (s) => {
    I.inv = s ? Object.assign({}, s.inv) : { wood: 6, stone: 4, berries: 3 };
    I.coins = s ? s.coins : 10;
    I.food = s ? s.food : 90;
    I.slot = s ? s.slot || 0 : 0;
    I.foodSel = s ? s.foodSel || 'berries' : 'berries';
    if (I.inv.egg && !s) delete I.inv.egg;
    F.state = 'idle';
    stick.state = 'held';
  };

  return I;
})();
