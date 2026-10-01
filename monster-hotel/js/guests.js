// ============================================================
//  MONSTER HOTEL — GUESTS (and sneaky humans!)
//  Every guest has a happiness from 0 to 100.
//  Happy guests write good reviews. Grumpy guests... don't.
// ============================================================
window.MH = window.MH || {};

MH.Guests = (function () {
  const U = MH.U, T = MH.Tex, Mo = MH.Models, A = MH.Audio;
  const G = { list: [], humans: [], on: {} };
  let scene, W;
  let nextId = 1;
  const SPEED = { vampire: 1.45, werewolf: 1.6, mummy: 0.95, ghost: 1.25, frankie: 1.05, blob: 1.0, human: 1.15, skeleton: 1.35, witch: 1.3, zombie: 0.8 };
  const usedNames = new Set();

  function init(sc) { scene = sc; W = MH.World; }

  // ---------- speech bubbles ----------
  function makeBubble() {
    const c = U.canvas(256, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
    const s = new THREE.Sprite(m);
    s.scale.set(0.7, 0.7, 1);
    s.renderOrder = 999;
    s.userData.ownTex = true;
    return { sprite: s, canvas: c, tex, key: '' };
  }
  function drawBubble(g) {
    const b = g.bubble;
    let icon = null, ring = -1, face = -1, urgent = false;
    if (g.state === 'queue' || g.state === 'arrive') { icon = 'key'; ring = g.happy / 100; }
    else if (g.request) { icon = g.request.icon; ring = g.happy / 100; urgent = g.happy < 35; }
    else if (g.scaredT > 0) { icon = 'human'; }
    else face = g.happy;
    const key = [icon, Math.round(ring * 24), face >= 0 ? Math.round(face / 12) : -1, urgent, g.sleepy > 0.5].join('|');
    if (key === b.key) return;
    b.key = key;
    const x = b.canvas.getContext('2d');
    x.clearRect(0, 0, 256, 256);
    if (g.sleepy > 0.5 && !icon) { x.drawImage(T.iconCanvas('zzz'), 64, 50, 128, 128); b.tex.needsUpdate = true; return; }
    if (icon) {
      // bubble with a little tail
      x.fillStyle = urgent ? '#ffe0e0' : '#fffaf0';
      x.strokeStyle = '#1d0f24'; x.lineWidth = 8;
      x.beginPath(); x.arc(128, 112, 92, 0, Math.PI * 2); x.fill(); x.stroke();
      x.beginPath(); x.moveTo(104, 196); x.lineTo(128, 246); x.lineTo(152, 196); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = urgent ? '#ffe0e0' : '#fffaf0'; x.fillRect(100, 186, 56, 16);
      if (ring >= 0) {
        x.strokeStyle = T.moodColor(ring * 100); x.lineWidth = 14; x.lineCap = 'round';
        x.beginPath(); x.arc(128, 112, 78, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ring); x.stroke();
      }
      x.drawImage(T.iconCanvas(icon), 64, 48, 128, 128);
    } else if (face >= 0) {
      x.globalAlpha = 0.95;
      T.drawFace(x, 128, 128, 70, face);
    }
    b.tex.needsUpdate = true;
  }

  // ---------- making guests ----------
  function pickName(kind) {
    const names = MH.MONSTERS[kind].names;
    for (let i = 0; i < 20; i++) { const n = U.pick(names); if (!usedNames.has(n)) { usedNames.add(n); return n; } }
    return U.pick(names) + ' ' + ['Jr.', 'II', 'the Third'][U.randInt(0, 2)];
  }
  function spawn(kind, ctx) {
    const style = U.randInt(0, 4);
    const model = Mo.monster(kind, style);
    const e = W.entrance;
    const g = {
      id: nextId++, kind, style, model, name: pickName(kind),
      x: e.x + U.rand(-0.8, 0.8), z: e.z, yaw: Math.PI, speed: SPEED[kind] * U.rand(0.9, 1.1),
      state: 'arrive', path: null, pathI: 0, target: null,
      happy: U.clamp(66 + ctx.rating * 4, 60, 92), room: null, request: null,
      stay: U.rand(ctx.night.stay[0], ctx.night.stay[1]),
      nextAsk: U.rand(4, 9), talkT: 0, scaredT: 0, seenCd: 0, idleT: 0, hangT: 0, sleepy: 0,
      bubble: makeBubble(), lookAt: null, moveSpeed: 0, queueSlot: -1, served: 0, checkedIn: false,
    };
    model.position.set(g.x, 0, g.z);
    model.rotation.y = g.yaw;
    g.bubble.sprite.position.set(0, model.userData.height + 0.45, 0);
    model.add(g.bubble.sprite);
    scene.add(model);
    G.list.push(g);
    goTo(g, e.inside.x, e.inside.z);
    g.state = 'arrive';
    return g;
  }
  function remove(g) {
    scene.remove(g.model);
    Mo.disposeModel(g.model);
    G.list.splice(G.list.indexOf(g), 1);
    usedNames.delete(g.name);
    if (g.room && g.room.guest === g) g.room.guest = null;
  }

  function goTo(g, x, z) {
    g.path = W.path(g.x, g.z, x, z);
    g.pathI = 0;
    g.target = { x, z };
  }
  // walk along the path; returns true when arrived
  function walk(g, dt, speedMul = 1) {
    if (!g.path || g.pathI >= g.path.length) { g.moveSpeed = 0; return true; }
    const p = g.path[g.pathI];
    const dx = p.x - g.x, dz = p.z - g.z;
    const d = Math.hypot(dx, dz);
    const sp = g.speed * speedMul;
    if (d < 0.12) { g.pathI++; return g.pathI >= g.path.length; }
    const step = Math.min(d, sp * dt);
    g.x += dx / d * step; g.z += dz / d * step;
    const want = Math.atan2(dx, dz);
    g.yaw += U.angleDiff(g.yaw, want) * Math.min(1, dt * 8);
    g.moveSpeed = sp;
    return false;
  }
  function face(g, x, z, dt) {
    const want = Math.atan2(x - g.x, z - g.z);
    g.yaw += U.angleDiff(g.yaw, want) * Math.min(1, dt * 5);
  }
  function say(g, text, mood) {
    g.talkT = 1.2;
    A.babble(g.kind, mood !== undefined ? mood : (g.happy - 50) / 50, 0, 0.12);
    if (G.on.say) G.on.say(g, text);
  }

  // ---------- requests ----------
  function makeRequest(g) {
    const m = MH.MONSTERS[g.kind];
    if (g.kind === 'werewolf' && Math.random() < 0.3) return { type: 'pet', icon: 'pet', text: 'Belly rub, please!', age: 0 };
    const item = U.pick(m.wants);
    return { type: 'item', item, icon: item, text: 'I want ' + MH.ITEMS[item].name + '!', age: 0 };
  }
  const WANT_LINES = {
    blood: ['I\'m SO thirsty!', 'One Blood Smoothie, extra red!', 'Bleh! I need a smoothie!'],
    bone: ['Bone! Bone! BONE!', 'I need something to chew!', 'Got a big bone for me?'],
    soup: ['Bug Soup, please! Extra crunchy!', 'I\'m hungry for soup!'],
    jelly: ['Wooo... Ecto-Jelly please!', 'I crave jiggly jelly!'],
    towel: ['I need a fluffy towel!', 'Towel please!', 'Where are my towels?!'],
    bandage: ['I\'m coming unwrapped! Bandages!', 'Fresh bandages, please!'],
    jar: ['My bolts need a Lightning Jar!', 'I\'m running out of power...'],
    potion: ['Hee hee! Bring me a Bubbling Potion!', 'My cauldron is empty! A potion, please!'],
    icecream: ['Braaaain Freeeeze...', 'Ice cream! Brain flavor, please!'],
    polish: ['My bones are so dusty! Bone Polish, please!', 'I want to be SHINY!'],
  };

  // ---------- the brain of a guest ----------
  function update(dt, t, ctx) {
    const grumpy = ctx.frozen ? 0 : ctx.night.grumpy;
    // who is in the line at the desk
    const queue = G.list.filter((g) => g.state === 'queue' || (g.state === 'arrive'));
    queue.sort((a, b) => a.id - b.id);
    queue.forEach((g, i) => { g.queueSlot = i; });

    for (const g of G.list.slice()) {
      g.talkT = Math.max(0, g.talkT - dt);
      g.scaredT = Math.max(0, g.scaredT - dt);
      g.seenCd = Math.max(0, g.seenCd - dt);
      let drain = 0;

      switch (g.state) {
        case 'arrive': {
          const spot = W.queue[Math.min(g.queueSlot, W.queue.length - 1)];
          if (!g.target || U.dist(g.target.x, g.target.z, spot.x, spot.z) > 0.3) goTo(g, spot.x, spot.z);
          if (walk(g, dt)) { g.state = 'queue'; say(g, U.pick(['Hello! One room, please!', 'Good evening! I have a reservation!', 'Room for one spooky guest!'])); if (G.on.arrived) G.on.arrived(g); }
          drain = 0.35;
          break;
        }
        case 'queue': {
          const spot = W.queue[Math.min(g.queueSlot, W.queue.length - 1)];
          if (U.dist(g.x, g.z, spot.x, spot.z) > 0.3) { if (!g.target || U.dist(g.target.x, g.target.z, spot.x, spot.z) > 0.3) goTo(g, spot.x, spot.z); walk(g, dt); }
          else { g.moveSpeed = 0; face(g, W.desk.x, W.desk.z, dt); }
          g.waitT = (g.waitT || 0) + dt;
          drain = 0.5 + Math.min(g.waitT, 40) * 0.015;
          if (g.waitT > 18 && Math.random() < dt * 0.08) say(g, U.pick(['Hellooo? Anybody?', '*taps foot*', 'I\'ve been waiting forever!']), -0.5);
          break;
        }
        case 'toRoom': {
          if (walk(g, dt)) { g.state = 'inRoom'; g.idleT = U.rand(2, 5); }
          break;
        }
        case 'inRoom': {
          // stand around, look out the window, stretch...
          g.idleT -= dt;
          if (g.idleT <= 0) {
            g.idleT = U.rand(3, 7);
            const R = g.room;
            const s = U.pick(R.messSpots.length ? R.messSpots : [R.spot]);
            goTo(g, U.lerp(R.spot.x, s.x, 0.4), U.lerp(R.spot.z, s.z, 0.4));
          }
          walk(g, dt, 0.5);
          // sometimes go hang out in the lobby
          if (!g.request && Math.random() < dt * 0.012 && W.hangouts.length) {
            const h = U.pick(W.hangouts);
            g.hang = h; g.state = 'toHang'; goTo(g, h.x, h.z);
          }
          break;
        }
        case 'toHang': {
          if (walk(g, dt)) { g.state = 'hang'; g.hangT = U.rand(10, 20); }
          break;
        }
        case 'hang': {
          g.moveSpeed = 0;
          face(g, g.hang.lookX, g.hang.lookZ, dt);
          g.hangT -= dt;
          if (g.hangT <= 0) { g.state = 'toRoom'; goTo(g, g.room.spot.x, g.room.spot.z); }
          break;
        }
        case 'leave':
        case 'storm': {
          const e = W.entrance;
          if (!g.target || g.target.x !== e.x) goTo(g, e.x, e.z + 0.8);
          if (walk(g, dt, g.state === 'storm' ? 1.5 : 1)) { remove(g); continue; }
          break;
        }
      }

      // ----- requests while staying -----
      if (g.checkedIn && ['inRoom', 'hang', 'toHang', 'toRoom'].includes(g.state)) {
        if (!g.request) {
          g.nextAsk -= dt * (ctx.frozen ? 0 : 1);
          if (g.nextAsk <= 0) {
            g.request = makeRequest(g);
            const line = g.request.type === 'pet' ? 'Belly rub, please! Pleeease!' : U.pick(WANT_LINES[g.request.item] || [g.request.text]);
            say(g, line);
            if (g.request.type === 'pet') A.howl(0, 0.08);
            if (G.on.request) G.on.request(g);
          }
        } else {
          g.request.age += dt * (ctx.frozen ? 0 : 1);
          drain += 0.5 + Math.min(g.request.age, 50) * 0.015;
        }
        // problems in the room
        const R = g.room;
        if (R && g.state === 'inRoom') {
          drain += Math.min(R.messes.length, 3) * 0.3;
          if (R.window && R.window.target > 0) drain += 0.8;
        }
        g.stay -= dt * (ctx.frozen ? 0 : 1);
        if (g.stay <= 0 && !g.request) checkout(g, false);
      }
      // happy guests relax
      if (drain === 0 && g.checkedIn) g.happy = Math.min(100, g.happy + dt * 0.6);
      g.happy -= drain * grumpy * dt;
      if (g.happy <= 0 && g.state !== 'storm' && g.state !== 'leave') {
        g.happy = 0;
        say(g, U.pick(['THAT\'S IT! I\'M LEAVING!', 'WORST. HOTEL. EVER!', 'I want my money back!']), -1);
        A.angryBurst();
        if (g.state === 'queue' || g.state === 'arrive') { g.state = 'storm'; g.path = null; g.target = null; review(g, 1); }
        else checkout(g, true);
      }

      // ----- humans nearby = PANIC -----
      for (const h of G.humans) {
        if (h.state === 'gone') continue;
        const d = U.dist(g.x, g.z, h.x, h.z);
        if (d < 7 && W.canSee(g.x, g.z, h.x, h.z)) {
          if (g.seenCd <= 0) {
            g.seenCd = 4;
            if (!ctx.frozen) g.happy -= 6;
            g.scaredT = 2.5;
            say(g, U.pick(['AAAH! A HUMAN!', 'EEEK! HUMAN!', 'Get it away from me!!', 'A h-h-human?!']), -1);
            if (G.on.scared) G.on.scared(g, h);
          }
          if (!ctx.frozen) g.happy -= 1.0 * dt;
          g.scaredT = Math.max(g.scaredT, 0.5);
        }
      }

      // ----- move the 3D model -----
      g.sleepy = ctx.dawn ? Math.min(1, g.sleepy + dt * 0.5) : 0;
      g.model.position.set(g.x, 0, g.z);
      g.model.rotation.y = g.yaw;
      Mo.animate(g.model, dt, {
        speed: g.moveSpeed, mood: g.scaredT > 0 ? -0.6 : (g.happy - 50) / 50, talk: g.talkT > 0,
        panic: g.scaredT > 0.6, wave: g.state === 'queue' && g.queueSlot === 0 && g.waitT > 3 && Math.sin(t * 0.8 + g.id) > 0.6, sleepy: g.sleepy,
      });
      drawBubble(g);
      // mood bubbles only show when you're close; requests show through walls
      const dPlayer = U.dist(g.x, g.z, ctx.px, ctx.pz);
      const important = !!g.request || g.state === 'queue' || g.state === 'arrive' || g.scaredT > 0;
      g.bubble.sprite.visible = important ? dPlayer < 40 : dPlayer < 9;
      g.bubble.sprite.material.depthTest = !important;
      const s = important ? U.clamp(0.55 + dPlayer * 0.025, 0.55, 1.2) : 0.5;
      g.bubble.sprite.scale.set(s, s, 1);
      g.bubble.sprite.material.opacity = g.request && g.happy < 30 ? 0.75 + 0.25 * Math.sin(t * 10) : 1;
    }
    // guests don't walk through each other
    for (let i = 0; i < G.list.length; i++) for (let j = i + 1; j < G.list.length; j++) {
      const a = G.list[i], b = G.list[j];
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d > 0.001 && d < 0.55) {
        const push = (0.55 - d) / 2;
        a.x -= dx / d * push; a.z -= dz / d * push; b.x += dx / d * push; b.z += dz / d * push;
      }
    }
    updateHumans(dt, t, ctx);
  }

  function starsFor(h) { return h >= 84 ? 5 : h >= 66 ? 4 : h >= 46 ? 3 : h >= 26 ? 2 : 1; }
  function review(g, stars) {
    if (g.reviewed) return;
    g.reviewed = true;
    if (G.on.review) G.on.review(g, stars);
  }
  function checkout(g, angry) {
    const R = g.room;
    if (R) {
      R.guest = null;
      R.status = 'dirty';
      if (G.on.roomDirty) G.on.roomDirty(R, 2);
    }
    if (g.request && G.on.requestDone) G.on.requestDone(g);
    g.request = null;
    g.state = angry ? 'storm' : 'leave';
    g.path = null; g.target = null;
    review(g, angry ? 1 : starsFor(g.happy));
    if (!angry) say(g, U.pick(g.happy > 65 ? ['Bye! Best stay ever!', 'See you next full moon!', 'Toodle-oo!'] : ['Goodbye.', 'Hmph. Bye.', 'It was... okay.']));
  }

  // ---------- things the boss does ----------
  G.checkIn = function (g, room) {
    g.room = room; room.guest = g; room.status = 'occupied';
    g.state = 'toRoom'; g.checkedIn = true;
    g.happy = Math.min(100, g.happy + 12);
    goTo(g, room.spot.x, room.spot.z);
    say(g, U.pick(['Thank you!', 'Ooh, Room ' + room.num + '!', 'Wonderful!', 'How spooky! I love it!']), 0.8);
  };
  G.give = function (g, item) {
    if (!g.request) return 'none';
    if (g.request.type === 'pet') return 'pet';
    if (g.request.item !== item) {
      g.happy -= 5;
      say(g, U.pick(['That\'s not what I asked for!', 'Eww, no!', 'Wrong thing!']), -0.6);
      return 'wrong';
    }
    const fast = g.request.age < 14;
    g.happy = Math.min(100, g.happy + 26 + (fast ? 12 : 0));
    g.request = null; g.served++;
    g.nextAsk = U.rand(MH.Game.nightParams().askEvery[0], MH.Game.nightParams().askEvery[1]);
    say(g, fast ? U.pick(['WOW, that was fast!', 'Yummy! Thank you!', 'You are the BEST!']) : U.pick(['Finally! Thanks.', 'About time!', 'Thank you!']), 1);
    if (G.on.requestDone) G.on.requestDone(g);
    return fast ? 'fast' : 'ok';
  };
  G.pet = function (g) {
    if (!g.request || g.request.type !== 'pet') return false;
    g.happy = Math.min(100, g.happy + 30);
    g.request = null; g.served++;
    g.nextAsk = U.rand(MH.Game.nightParams().askEvery[0], MH.Game.nightParams().askEvery[1]);
    say(g, 'Ooooh yes! Right there! *happy howl*', 1);
    A.howl(0, 0.12);
    if (G.on.requestDone) G.on.requestDone(g);
    return true;
  };
  G.cheer = function (x, z, amount, radius) {
    for (const g of G.list) if (U.dist(g.x, g.z, x, z) < radius && g.state !== 'storm' && g.state !== 'leave') g.happy = Math.min(100, g.happy + amount);
  };

  // ============================================================
  //  HUMANS (they just want a selfie with a monster...)
  // ============================================================
  G.spawnHuman = function () {
    const model = Mo.human(U.randInt(0, 2));
    const e = W.entrance;
    const h = { model, x: e.x, z: e.z + 0.3, yaw: Math.PI, state: 'sneak', path: null, pathI: 0, speed: 1.2, moveSpeed: 0, photoT: U.rand(3, 6), life: 55, waitT: 0, talkT: 0, target: null };
    const alert = makeBubble();
    const cx2 = alert.canvas.getContext('2d');
    cx2.drawImage(T.iconCanvas('human'), 32, 32, 192, 192);
    alert.tex.needsUpdate = true;
    alert.sprite.position.set(0, 2.3, 0);
    model.add(alert.sprite);
    h.alert = alert.sprite;
    model.position.set(h.x, 0, h.z);
    scene.add(model);
    G.humans.push(h);
    pickHumanTarget(h);
    return h;
  };
  function pickHumanTarget(h) {
    const opts = [W.randomLobbySpot(), W.randomHallSpot()];
    const occupied = W.rooms.filter((R) => R.guest);
    if (occupied.length) { const R = U.pick(occupied); opts.push(R.spot, R.spot); }
    const p = U.pick(opts);
    goTo(h, p.x, p.z);
  }
  G.shoo = function (h) {
    if (h.state !== 'sneak') return false;
    h.state = 'flee'; h.speed = 4.2; h.path = null; h.target = null;
    h.talkT = 1;
    A.scream();
    return true;
  };
  function updateHumans(dt, t, ctx) {
    for (const h of G.humans.slice()) {
      h.talkT = Math.max(0, h.talkT - dt);
      if (h.state === 'sneak') {
        h.life -= dt;
        if (walk(h, dt)) { h.waitT += dt; if (h.waitT > 2.5) { h.waitT = 0; pickHumanTarget(h); } }
        h.photoT -= dt;
        if (h.photoT <= 0) {
          h.photoT = U.rand(5, 8);
          h.flashT = 0.15;
          A.flash();
          for (const g of G.list) if (U.dist(g.x, g.z, h.x, h.z) < 6 && W.canSee(g.x, g.z, h.x, h.z) && !ctx.frozen) { g.happy -= 3; g.scaredT = 2; }
          if (G.on.flash) G.on.flash(h);
        }
        if (h.life <= 0) { h.state = 'flee'; h.speed = 2; h.path = null; h.target = null; }
      } else if (h.state === 'flee') {
        const e = W.entrance;
        if (!h.target || h.target.x !== e.x) goTo(h, e.x, e.z + 1);
        if (walk(h, dt)) { scene.remove(h.model); Mo.disposeModel(h.model); G.humans.splice(G.humans.indexOf(h), 1); continue; }
      }
      h.flashT = Math.max(0, (h.flashT || 0) - dt);
      h.model.userData.rig.flash.scale.setScalar(h.flashT > 0 ? 0.25 : 0.012);
      h.model.position.set(h.x, 0, h.z);
      h.model.rotation.y = h.yaw;
      h.alert.visible = h.state === 'sneak';
      h.alert.scale.setScalar(0.6 + 0.08 * Math.sin(t * 8));
      Mo.animate(h.model, dt, { speed: h.moveSpeed, mood: h.state === 'flee' ? -0.8 : 0.9, talk: h.talkT > 0, panic: h.state === 'flee' });
    }
  }

  // clear everyone (end of the night)
  G.clear = function () {
    for (const g of G.list) { scene.remove(g.model); Mo.disposeModel(g.model); }
    for (const h of G.humans) { scene.remove(h.model); Mo.disposeModel(h.model); }
    G.list.length = 0; G.humans.length = 0;
    usedNames.clear();
  };
  G.reviewAll = function () {
    for (const g of G.list.slice()) if (g.checkedIn && !g.reviewed && g.state !== 'storm') review(g, starsFor(g.happy));
  };
  G.starsFor = starsFor;
  G.init = init;
  G.update = update;
  G.spawn = spawn;
  return G;
})();
