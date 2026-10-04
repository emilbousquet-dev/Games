// ============================================================
//  DRAGON LIFE — YOUR DRAGON
//  The egg, hatching, growing up (baby, young, adult), food,
//  happiness, following you around, playing fetch, sleeping
//  in its nest... and FLYING with you on its back!
//  Also the wild dragons that live on the other islands.
// ============================================================
window.DL = window.DL || {};

DL.Dragon = (function () {
  const U = DL.U, PI = Math.PI;
  const W = () => DL.World, P = () => DL.Player, In = () => DL.Input, Hud = () => DL.Hud, S = () => DL.Audio, It = () => DL.Items;

  // how big the dragon gets at each age
  const YOUNG_AT = 30, ADULT_AT = 100;
  const D = {
    stage: 'egg', name: 'Ember', color: 'emerald', saddle: 'leather',
    growth: 0, hunger: 80, happy: 70,
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, bank: 0,
    mode: 'ground',          // 'ground', 'fly' (on its own), 'ride' (you're on it)
    ai: 'follow', aiT: 0, model: null,
    egg: { state: 'cave', obj: null, warm: 0, pos: new THREE.Vector3(), fire: null },
    stamina: 1, flapPh: 0, walkPh: 0, anim: {}, sleepK: 0, sitK: 0, eatT: 0, roarT: 0, fireT: 0,
    petCool: 0, hungryMsg: 30, growCool: 0, speed: 0, landing: false,
    colors: ['emerald', 'ruby', 'ocean', 'amethyst', 'snow'], saddles: ['leather'],
  };
  let scene;

  function init(sc) {
    scene = sc;
    D.model = DL.Models.dragon(D.color);
    D.model.root.visible = false;
    scene.add(D.model.root);
    D.egg.obj = DL.Models.egg();
    scene.add(D.egg.obj);
  }

  const stageOf = (g) => g >= ADULT_AT ? 'adult' : g >= YOUNG_AT ? 'young' : 'baby';
  function scale() {
    if (D.stage === 'adult') return 1;
    if (D.stage === 'young') return U.lerp(0.5, 0.72, (D.growth - YOUNG_AT) / (ADULT_AT - YOUNG_AT));
    return U.lerp(0.27, 0.36, D.growth / YOUNG_AT);
  }
  function setLook() {
    D.model.setColor(D.color);
    D.model.setSaddle(D.saddle);
    D.model.setStage(D.stage);
    D.model.stageY = D.model.body.position.y;
  }

  // ------------------------------------------------------------
  //  THE EGG
  // ------------------------------------------------------------
  function eggUpdate(dt) {
    const E = D.egg, o = E.obj;
    o.visible = E.state !== 'hatched';
    if (E.state === 'cave') {
      const sp = W().places.cave.eggSpot;
      o.position.set(sp.x, sp.y, sp.z);
      o.rotation.z = Math.sin(W().time * 1.5) * 0.04;
      o.userData.mat.emissiveIntensity = 0.3 + Math.sin(W().time * 2) * 0.2;
      if (Math.random() < dt * 3) DL.FX.spawn('star', { x: sp.x + U.rand(-0.6, 0.6), y: sp.y + U.rand(0.2, 1.4), z: sp.z + U.rand(-0.6, 0.6), vy: 0.4, life: 1.2, size: 0.15, size1: 0, color: 0x9affc0 });
    } else if (E.state === 'carried') {
      const p = P();
      o.position.set(p.pos.x + Math.sin(p.yaw) * 0.45, p.pos.y + 0.6, p.pos.z + Math.cos(p.yaw) * 0.45);
      o.scale.setScalar(0.65);
      o.rotation.set(0, p.yaw, 0);
      if (p.riding) o.visible = false;
    } else if (E.state === 'warming') {
      o.scale.setScalar(1);
      o.position.copy(E.pos);
      const fireNear = DL.Build.fireNear(E.pos.x, E.pos.z, 4.5);
      if (fireNear) E.warm = Math.min(1, E.warm + dt / 75);
      // it wobbles more and more!
      const k = E.warm;
      const wob = k > 0.3 ? Math.sin(W().time * (6 + k * 14)) * k * 0.18 * (Math.sin(W().time * 1.3) > 0.2 ? 1 : 0.2) : 0;
      o.rotation.set(wob, 0, wob * 0.7);
      o.userData.mat.emissiveIntensity = 0.2 + k * 0.8 + Math.sin(W().time * 4) * 0.1 * k;
      if (k > 0.5 && Math.random() < dt * k * 2) S().play('crack', { soft: true });
      if (E.warm >= 1) hatch();
    }
  }
  function pickEgg() {
    D.egg.state = 'carried';
    It().add('egg', 1);
    S().play('pickup');
    DL.FX.sparkle(D.egg.obj.position.x, D.egg.obj.position.y + 0.6, D.egg.obj.position.z, 0x9affc0, 30);
    Hud().big('🥚 A DRAGON EGG!', 'It feels a little cold... Keep it warm next to a CAMPFIRE.');
    DL.Story.event('egg');
  }
  function placeEgg(x, z) {
    It().take('egg', 1);
    D.egg.state = 'warming';
    D.egg.pos.set(x, W().groundAt(x, z, 100) + 0.05, z);
    S().play('place');
    Hud().big('🔥 The egg is getting warm...', 'Stay close and wait. Something is moving inside!');
    DL.Story.event('eggWarm');
  }
  function hatch() {
    const E = D.egg;
    E.state = 'hatched';
    S().play('hatch');
    DL.FX.burst(E.pos.x, E.pos.y + 0.6, E.pos.z, 0x9affc0, 60);
    DL.FX.burst(E.pos.x, E.pos.y + 0.6, E.pos.z, 0xffffff, 30);
    for (let i = 0; i < 12; i++) DL.FX.chips(E.pos.x, E.pos.y + 0.6, E.pos.z, 0x4ab07a, 3);
    D.stage = 'baby'; D.growth = 0; D.hunger = 50; D.happy = 80;
    D.pos.copy(E.pos); D.yaw = Math.atan2(P().pos.x - E.pos.x, P().pos.z - E.pos.z);
    D.mode = 'ground'; D.ai = 'follow';
    D.model.root.visible = true;
    setLook();
    DL.Game.lookAtDragon = 2.5;
    setTimeout(() => {
      Hud().nameDragon(D.colors, (name, color) => {
        D.name = name; D.color = color;
        setLook();
        S().play('chirp');
        DL.FX.hearts(D.pos.x, D.pos.y + 1, D.pos.z, 10);
        Hud().big('💚 HELLO, ' + name.toUpperCase() + '!', 'Your baby dragon is hungry. Give it some food!');
        DL.Story.event('hatch');
      });
    }, 1500);
  }

  // ------------------------------------------------------------
  //  CARE: feeding, petting, playing
  // ------------------------------------------------------------
  const hatched = () => D.stage !== 'egg';
  function reach() { return 2.2 + scale() * 3.2; }
  function near(dist) { return hatched() && D.mode === 'ground' && D.pos.distanceTo(P().pos) < (dist || reach()); }
  function feed(id) {
    const it = It().ITEMS[id];
    if (!it || !it.dragon) return false;
    if (D.hunger > 96) { Hud().toast(`😊 ${D.name} is full! Try petting (E) or playing fetch instead.`); return true; }
    It().take(id);
    D.hunger = Math.min(100, D.hunger + it.dragon.hunger);
    D.happy = Math.min(100, D.happy + it.dragon.happy);
    grow(it.dragon.grow);
    D.eatT = 1.4; D.ai = 'follow'; D.sleeping = false;
    D.yaw = Math.atan2(P().pos.x - D.pos.x, P().pos.z - D.pos.z);
    S().play('chomp');
    setTimeout(() => S().play(D.stage === 'adult' ? 'purr' : 'chirp'), 700);
    DL.FX.hearts(D.pos.x, D.pos.y + 1.5 * scale() + 0.5, D.pos.z, 4);
    Hud().pickup(it.icon, `${D.name}: nom nom!`);
    DL.Story.event('feed', id);
    return true;
  }
  function pet() {
    P().pet = 1.3;
    D.sleeping = false;
    D.happy = Math.min(100, D.happy + 12);
    if (D.growCool <= 0) { grow(2); D.growCool = 15; }
    D.petT = 1.6;
    S().play(D.stage === 'adult' ? 'purr' : 'chirp');
    DL.FX.hearts(D.pos.x, D.pos.y + 1.6 * scale() + 0.4, D.pos.z, 6);
    DL.Story.event('pet');
  }
  function grow(n) {
    if (!hatched()) return;
    const before = D.stage;
    D.growth = Math.min(ADULT_AT, D.growth + n);
    D.stage = stageOf(D.growth);
    if (D.stage !== before) {
      setLook();
      S().play('grow');
      DL.FX.burst(D.pos.x, D.pos.y + 1.5, D.pos.z, 0xffe680, 50);
      if (D.stage === 'young') Hud().big(`⭐ ${D.name.toUpperCase()} GREW UP!`, `${D.name} is a YOUNG dragon now. Press F next to it to try a short flight!`, 5);
      if (D.stage === 'adult') Hud().big(`🌟 ${D.name.toUpperCase()} IS A GROWN-UP DRAGON!`, 'Press F next to your dragon to ride it. You can fly ANYWHERE now!', 6);
      DL.Story.event('grow', D.stage);
    }
  }

  // ------------------------------------------------------------
  //  RIDING
  // ------------------------------------------------------------
  function canRide() {
    if (!hatched()) return 'egg';
    if (D.stage === 'baby') return 'baby';
    if (D.hunger < 15) return 'hungry';
    if (D.saddle === 'none') return 'saddle';
    return 'ok';
  }
  function mount() {
    const why = canRide();
    if (why === 'baby') { Hud().toast(`🐣 ${D.name} is too little to carry you! Feed it, pet it and play fetch so it grows.`); S().play('chirp'); return; }
    if (why === 'hungry') { Hud().toast(`🍖 ${D.name} is too hungry to fly. Feed it first!`); S().play('sad'); return; }
    if (why === 'saddle') { Hud().toast('🪢 Put a saddle on your dragon first (press I).'); return; }
    if (It().fish.state !== 'idle') It().stopFishing();
    P().riding = true;
    D.mode = 'ride';
    D.sleeping = false;
    D.speed = 8;
    D.vel.set(0, 12 * (D.stage === 'adult' ? 1 : 0.8), 0);
    D.stamina = 1;
    P().camYaw = D.yaw; P().camPitch = 0.05;
    S().play('roar');
    S().play('flap');
    DL.FX.dust(D.pos.x, D.pos.y, D.pos.z, 30);
    DL.Story.event('ride');
  }
  function dismount() {
    const p = P();
    p.riding = false;
    D.mode = 'ground'; D.landing = false;
    const side = new THREE.Vector3(Math.cos(D.yaw), 0, -Math.sin(D.yaw)).multiplyScalar(1.6 + scale() * 1.6);
    p.pos.set(D.pos.x + side.x, 0, D.pos.z + side.z);
    p.pos.y = W().groundAt(p.pos.x, p.pos.z, D.pos.y + 3);
    p.vy = 0; p.yaw = D.yaw; p.camYaw = D.yaw;
    S().play('land');
    DL.FX.dust(D.pos.x, D.pos.y, D.pos.z, 30);
  }
  // F key
  function onDragonKey() {
    const p = P();
    if (!hatched()) { Hud().toast(D.egg.state === 'cave' ? '🥚 You don\'t have a dragon yet... Wren says there is an egg in a glowing cave!' : '🥚 Your egg needs to be warm before it can hatch.'); return; }
    if (D.mode === 'ride') {
      if (D.landing) return;
      const g = W().groundAt(D.pos.x, D.pos.z, D.pos.y);
      if (g < -0.5) { Hud().toast('🌊 You can\'t land on water! Fly over land and press F.'); return; }
      D.landing = true;
      Hud().toast('🛬 Landing...');
      return;
    }
    if (D.pos.distanceTo(p.pos) < reach() + 1.5) { mount(); return; }
    // too far: call your dragon
    callDragon();
  }
  function callDragon() {
    if (!hatched()) return;
    D.sleeping = false;
    D.ai = 'follow';
    const d = D.pos.distanceTo(P().pos);
    if (d > 30 && D.mode !== 'ride') { D.mode = 'fly'; D.flyTo = true; }
    P().wave = 1;
    S().play('whistle');
    setTimeout(() => S().play(D.stage === 'adult' ? 'roar' : 'chirp'), 500);
    Hud().toast(`📣 ${D.name}! Come here!`);
  }

  let fireSnd = 0;
  function rideUpdate(dt) {
    const I = In(), p = P();
    const adult = D.stage === 'adult';
    const sc = scale();
    // where are you looking?
    const wantYaw = p.camYaw;
    const turn = U.angleDiff(D.yaw, wantYaw);
    D.yaw = U.dampAngle(D.yaw, wantYaw, 2.6, dt);
    D.bank = U.damp(D.bank, U.clamp(-turn * 1.1, -0.8, 0.8), 4, dt);
    // speed
    const boost = I.down('run') && D.stamina > 0.05;
    let target = (adult ? 26 : 17) * (I.down('fwd') ? 1.25 : 1) * (I.down('back') ? 0.35 : 1) * (boost ? 1.8 : 1);
    if (D.landing) target = 9;
    D.speed = U.damp(D.speed, target, 1.5, dt);
    // up and down
    let climb = U.clamp(p.camPitch * 1.3 + 0.1, -0.9, 0.9);
    let vy = Math.sin(climb) * D.speed;
    if (I.down('jump')) vy += 12;
    if (I.down('down')) vy -= 14;
    // a young dragon gets tired
    if (!adult) {
      D.stamina = Math.max(0, D.stamina - dt / 14);
      if (D.stamina <= 0) { vy = Math.min(vy, -4); if (!D.tiredMsg) { D.tiredMsg = true; Hud().toast(`😮‍💨 ${D.name} is tired! Young dragons can only fly a little. Landing...`); D.landing = true; } }
    } else if (boost) D.stamina = Math.max(0, D.stamina - dt / 20);
    else D.stamina = Math.min(1, D.stamina + dt / 10);
    const g = Math.max(W().groundAt(D.pos.x, D.pos.z, D.pos.y + 5), -0.2);
    if (D.landing) vy = Math.min(vy, -10 - (D.pos.y - g) * 0.4);
    const maxH = adult ? 320 : g + 14;
    if (D.pos.y > maxH && vy > 0) vy = Math.min(vy, (maxH - D.pos.y));
    D.vel.x = Math.sin(D.yaw) * D.speed * Math.cos(climb * 0.5);
    D.vel.z = Math.cos(D.yaw) * D.speed * Math.cos(climb * 0.5);
    D.vel.y = U.damp(D.vel.y, vy, 3, dt);
    D.pos.addScaledVector(D.vel, dt);
    // don't fly into the ground
    const minY = g + 1.0 * sc;
    if (D.pos.y < minY) {
      D.pos.y = minY;
      if (D.vel.y < 0) D.vel.y = 0;
      if (D.landing || (I.down('down') && g > -0.3)) {
        if (g < -0.3) { D.landing = false; Hud().toast('🌊 You can\'t land on water!'); }
        else { D.pos.y = g; D.tiredMsg = false; dismount(); return; }
      }
    }
    // stay inside the world
    const cx = D.pos.x - 60, cz = D.pos.z - 30, far = Math.hypot(cx, cz);
    if (far > 1150) { D.pos.x = 60 + cx / far * 1150; D.pos.z = 30 + cz / far * 1150; if (Math.random() < 0.03) Hud().toast('🌊 Nothing but sea out there! Turn around.'); }
    D.pitch = U.damp(D.pitch, -Math.atan2(D.vel.y, Math.hypot(D.vel.x, D.vel.z)) * 0.8, 4, dt);
    // fire!
    D.breathing = false;
    if (I.mouseHeld() && D.fireCool <= 0) {
      D.breathing = true;
      const mouth = mouthPos();
      const dir = new THREE.Vector3(Math.sin(D.yaw) * Math.cos(-D.pitch), Math.sin(-D.pitch) - 0.15, Math.cos(D.yaw) * Math.cos(-D.pitch)).normalize();
      if (adult) DL.FX.fire(mouth, dir, D.vel, 1); else if (Math.random() < 0.3) DL.FX.puff(mouth, dir);
      fireSnd -= dt;
      if (fireSnd <= 0) { fireSnd = adult ? 0.45 : 0.6; S().play(adult ? 'fire' : 'puff'); }
      DL.Story.fireAt(mouth, dir, adult ? 22 : 7);
    }
    D.fireCool = Math.max(0, (D.fireCool || 0) - dt);
    // wings
    const flapping = boost || vy > 2 || D.speed < 14;
    const flapSpeed = flapping ? (boost ? 9 : 6.5) : 2.5;
    const prev = Math.sin(D.flapPh);
    D.flapPh += dt * flapSpeed;
    if (prev > 0 && Math.sin(D.flapPh) <= 0 && flapping) S().play('flap', { vol: adult ? 1 : 0.6 });
    D.anim.flap = U.damp(D.anim.flap || 0, flapping ? 1 : 0.15, 3, dt);
    D.anim.glide = !flapping;
    D.anim.fly = U.damp(D.anim.fly || 0, 1, 5, dt);
    D.anim.climb = U.clamp(D.vel.y / 20, -1, 1);
    D.anim.jaw = D.breathing ? 1 : 0;
    S().wind(Math.min(1, D.speed / 45) * (0.6 + Math.min(1, D.pos.y / 120) * 0.4));
  }

  // ------------------------------------------------------------
  //  THE DRAGON'S BRAIN (when you're not riding it)
  // ------------------------------------------------------------
  function aiUpdate(dt) {
    const p = P();
    const sc = scale();
    const toP = new THREE.Vector3(p.pos.x - D.pos.x, 0, p.pos.z - D.pos.z);
    const dist = toP.length();
    D.aiT -= dt;
    S().wind(0);
    // flying over to you
    if (D.mode === 'fly') {
      const tx = p.pos.x - toP.x / Math.max(dist, 0.01) * 4, tz = p.pos.z - toP.z / Math.max(dist, 0.01) * 4;
      const hd = Math.hypot(tx - D.pos.x, tz - D.pos.z);
      const g = W().groundAt(D.pos.x, D.pos.z, D.pos.y + 3);
      const cruise = Math.max(g, W().groundAt(tx, tz, 300), 0) + 14;
      const sp = Math.min(30, 8 + hd * 0.8);
      D.yaw = U.dampAngle(D.yaw, Math.atan2(tx - D.pos.x, tz - D.pos.z), 3, dt);
      D.pos.x += Math.sin(D.yaw) * sp * dt; D.pos.z += Math.cos(D.yaw) * sp * dt;
      const wantY = hd < 12 ? Math.max(W().groundAt(D.pos.x, D.pos.z, D.pos.y), -0.3) : cruise;
      D.pos.y = U.damp(D.pos.y, wantY, hd < 12 ? 2.5 : 1.2, dt);
      D.pos.y = Math.max(D.pos.y, g + 0.5 * sc);
      D.flapPh += dt * 6.5;
      if (Math.sin(D.flapPh) > 0.98 && Math.random() < 0.3) S().play('flap', { vol: 0.5 });
      D.anim.flap = 1; D.anim.fly = U.damp(D.anim.fly || 0, 1, 4, dt);
      D.pitch = 0; D.bank = 0;
      if (hd < 3 && D.pos.y - Math.max(W().groundAt(D.pos.x, D.pos.z, D.pos.y), -0.3) < 0.8) { D.mode = 'ground'; DL.FX.dust(D.pos.x, D.pos.y, D.pos.z, 16); }
      return;
    }
    D.anim.fly = U.damp(D.anim.fly || 0, 0, 4, dt);
    D.anim.flap = 0;
    // fly over if you are far away
    if (dist > 45 && !D.sleeping) { D.mode = 'fly'; return; }

    let tx = D.pos.x, tz = D.pos.z, want = 0, look = null;
    const stick = It().stick;
    D.eatT = Math.max(0, D.eatT - dt);
    D.petT = Math.max(0, (D.petT || 0) - dt);
    const busy = D.eatT > 0 || D.petT > 0;
    // sleepy at night
    const nest = DL.Build.nearestNest(D.pos.x, D.pos.z, 120);
    if (!busy && W().night > 0.75 && D.ai !== 'fetch') {
      if (nest) {
        const nd = Math.hypot(nest.x - D.pos.x, nest.z - D.pos.z);
        if (nd > 1.5) { tx = nest.x; tz = nest.z; want = nd > 10 ? 5 : 2.5; D.sleeping = false; }
        else if (!D.sleeping) { D.sleeping = true; Hud().toast(`💤 ${D.name} curled up in the nest. Good night!`); }
      } else if (p.speed < 0.5 && dist < 8 && !D.sleeping && Math.random() < dt * 0.1) D.sleeping = true;
    }
    if (W().night < 0.4 && D.sleeping && !busy) { D.sleeping = false; S().play('chirp'); }
    if (D.sleeping) {
      want = 0;
      if (Math.random() < dt * 0.6) DL.FX.zzz(D.pos.x + Math.sin(D.yaw) * 2 * sc, D.pos.y + 1.6 * sc, D.pos.z + Math.cos(D.yaw) * 2 * sc);
      D.happy = Math.min(100, D.happy + dt / 20);
      // wake up when you go far away
      if (dist > 40) D.sleeping = false;
    } else if (busy) {
      look = p.pos;
    } else if (stick.state === 'ground' || (stick.state === 'flying' && D.ai === 'fetch')) {
      // FETCH!
      D.ai = 'fetch';
      if (stick.state === 'ground') {
        tx = stick.pos.x; tz = stick.pos.z; want = 8 + sc * 4;
        if (Math.hypot(tx - D.pos.x, tz - D.pos.z) < 1 + sc * 2.2) { stick.state = 'carried'; S().play('chirp'); }
      } else { tx = stick.pos.x; tz = stick.pos.z; want = 6; }
    } else if (stick.state === 'carried') {
      tx = p.pos.x; tz = p.pos.z; want = 7 + sc * 3;
      if (dist < 1.6 + sc * 2.6) {
        It().stickHome(true);
        D.ai = 'follow';
        D.happy = Math.min(100, D.happy + 8);
        grow(3);
        DL.FX.hearts(D.pos.x, D.pos.y + 1.5 * sc + 0.4, D.pos.z, 4);
        S().play(D.stage === 'adult' ? 'purr' : 'chirp');
        Hud().toast(`🦴 Good ${D.stage === 'baby' ? 'baby' : 'dragon'}! ${D.name} brought the stick back!`);
        DL.Story.event('fetch');
      }
    } else {
      D.ai = 'follow';
      // chase a butterfly (only little dragons do that)
      if (D.stage !== 'adult' && !D.chasing && dist < 10 && p.speed < 0.5 && Math.random() < dt * 0.08) {
        const b = W().butterflies.find(b => b.visible && b.position.distanceTo(D.pos) < 14);
        if (b) D.chasing = b;
      }
      if (D.chasing) {
        const b = D.chasing;
        tx = b.position.x; tz = b.position.z; want = 6;
        if (Math.hypot(tx - D.pos.x, tz - D.pos.z) < 1.2) { b.userData.caught = true; DL.FX.sparkle(tx, b.position.y, tz, 0xffe680, 10); S().play('chirp'); D.chasing = null; D.happy = Math.min(100, D.happy + 3); }
        if (dist > 20 || !b.visible) D.chasing = null;
      } else {
        // stay close to you (a little behind you)
        const side = D.side || (D.side = Math.random() < 0.5 ? -1 : 1);
        // walk next to you (not behind you, that's where the camera is!)
        const off = 2 + sc * 4.5;
        const fx = p.pos.x + Math.sin(p.camYaw) * off * 0.25 + Math.cos(p.camYaw) * off * side;
        const fz = p.pos.z + Math.cos(p.camYaw) * off * 0.25 - Math.sin(p.camYaw) * off * side;
        const fd = Math.hypot(fx - D.pos.x, fz - D.pos.z);
        if (fd > (p.speed > 0.5 ? 1 : 3.5)) { tx = fx; tz = fz; want = fd > 14 ? 10 : fd > 6 ? Math.max(5, p.speed + 1) : Math.max(2.5, p.speed); }
        else look = p.pos;
        // little things a dragon does
        if (want === 0 && D.aiT < 0) {
          D.aiT = U.rand(4, 9);
          const r = Math.random();
          if (r < 0.3) D.sitT = U.rand(3, 7);
          else if (r < 0.45 && D.stage !== 'baby') { D.roarT = 1.2; S().play(D.stage === 'adult' ? 'roar' : 'chirp', { soft: true }); }
          else if (r < 0.6) { D.puffT = 0.8; }
          else if (r < 0.75) { D.stretchT = 1.5; }
        }
      }
    }
    if (look) {
      D.anim.headYaw = U.clamp(U.angleDiff(D.yaw, Math.atan2(look.x - D.pos.x, look.z - D.pos.z)), -1.2, 1.2);
    } else D.anim.headYaw = U.damp(D.anim.headYaw || 0, 0, 3, dt);

    // move
    const dx = tx - D.pos.x, dz = tz - D.pos.z, dd = Math.hypot(dx, dz);
    const adultK = D.stage === 'adult' ? 1.3 : D.stage === 'young' ? 1.1 : 0.85;
    let sp = want > 0 && dd > 0.3 ? Math.min(want * adultK, dd * 3) : 0;
    D.speed = U.damp(D.speed, sp, 5, dt);
    if (want > 0 && dd > 0.3) D.yaw = U.dampAngle(D.yaw, Math.atan2(dx, dz), 5, dt);
    else if (look && dist < 12 && !D.sleeping && D.ai !== 'fetch') {
      // turn toward you when you're close and it's standing still
      const a = Math.atan2(look.x - D.pos.x, look.z - D.pos.z);
      if (Math.abs(U.angleDiff(D.yaw, a)) > 1.3) D.yaw = U.dampAngle(D.yaw, a, 1.5, dt);
    }
    D.pos.x += Math.sin(D.yaw) * D.speed * dt;
    D.pos.z += Math.cos(D.yaw) * D.speed * dt;
    const g = W().groundAt(D.pos.x, D.pos.z, D.pos.y + 1);
    if (g < -0.8) {
      // over water: hover and flap
      D.pos.y = U.damp(D.pos.y, 0.8, 4, dt);
      D.anim.fly = U.damp(D.anim.fly || 0, 0.8, 6, dt); D.anim.flap = 1; D.flapPh += dt * 7;
    } else D.pos.y = U.damp(D.pos.y, g, 18, dt);
    // tilt with the hill
    const fx = D.pos.x + Math.sin(D.yaw) * 2 * sc, fz = D.pos.z + Math.cos(D.yaw) * 2 * sc;
    const bx = D.pos.x - Math.sin(D.yaw) * 2 * sc, bz = D.pos.z - Math.cos(D.yaw) * 2 * sc;
    D.pitch = U.damp(D.pitch, U.clamp(-Math.atan2(W().terrainH(fx, fz) - W().terrainH(bx, bz), 4 * sc), -0.5, 0.5), 6, dt);
    D.bank = 0;
    D.walkPh += dt * D.speed * (2.4 / Math.max(0.4, sc));
    if (D.speed > 0.5 && Math.sin(D.walkPh) > 0.95 && D.stage === 'adult' && Math.random() < 0.2) S().play('stomp');
    D.anim.walk = U.clamp(D.speed / (D.stage === 'adult' ? 5 : 3), 0, 1);
    D.sitT = Math.max(0, (D.sitT || 0) - dt);
    if (want > 0) D.sitT = 0;
    D.sitK = U.damp(D.sitK, D.sitT > 0 ? 1 : 0, 4, dt);
    D.sleepK = U.damp(D.sleepK, D.sleeping ? 1 : 0, 2, dt);
    D.roarT = Math.max(0, (D.roarT || 0) - dt);
    D.puffT = Math.max(0, (D.puffT || 0) - dt);
    D.stretchT = Math.max(0, (D.stretchT || 0) - dt);
    if (D.puffT > 0 && Math.random() < dt * 10) DL.FX.smoke(mouthPos().x, mouthPos().y, mouthPos().z, sc);
    D.anim.jaw = D.roarT > 0 ? Math.sin(D.roarT / 1.2 * PI) : D.eatT > 0 ? Math.abs(Math.sin(D.eatT * 9)) * 0.7 : 0;
    D.anim.headPitch = D.eatT > 0 ? 0.9 : D.petT > 0 ? -0.3 : 0;
    D.anim.wag = D.petT > 0 || D.ai === 'fetch' ? 1 : 0;
    D.anim.stretch = D.stretchT > 0 ? Math.sin(D.stretchT / 1.5 * PI) : 0;
    D.anim.flapPh = D.flapPh;
  }

  // ------------------------------------------------------------
  //  EVERY FRAME
  // ------------------------------------------------------------
  function update(dt) {
    eggUpdate(dt);
    if (!hatched()) return;
    // tummy and mood
    D.hunger = Math.max(0, D.hunger - dt / (D.sleeping ? 14 : 7));
    D.happy = Math.max(0, D.happy - dt / (D.hunger < 25 ? 6 : 14));
    if (D.mode !== 'ride' && D.pos.distanceTo(P().pos) < 12 && D.hunger > 40) D.happy = Math.min(100, D.happy + dt / 20);
    D.growCool -= dt;
    D.growTimer = (D.growTimer || 0) + dt;
    if (D.growTimer > 40) { D.growTimer = 0; if (D.hunger > 30 && D.happy > 50) grow(1); }
    D.hungryMsg -= dt;
    if (D.hunger < 20 && D.hungryMsg < 0) { D.hungryMsg = 70; Hud().toast(`🍖 ${D.name} is hungry! Give it some fish or berries.`); S().play('sad'); }
    else if (D.happy < 20 && D.hungryMsg < 0) { D.hungryMsg = 80; Hud().toast(`😢 ${D.name} is sad. Pet it (E) or play fetch with the stick (key 5)!`); S().play('sad'); }

    if (D.mode === 'ride') rideUpdate(dt);
    else aiUpdate(dt);

    // the 3D model
    const m = D.model;
    const sc = scale();
    m.root.position.copy(D.pos);
    m.root.rotation.set(0, 0, 0);
    m.root.scale.setScalar(sc);
    m.root.rotation.order = 'YXZ';
    m.root.rotation.y = D.yaw;
    m.root.rotation.x = D.pitch;
    m.root.rotation.z = D.mode === 'ride' ? D.bank : 0;
    const flapPh = D.flapPh;
    m.animate(dt, {
      t: W().time, walk: D.anim.walk || 0, phase: D.walkPh, fly: D.anim.fly || 0, flap: D.anim.flap || 0, flapPh, glide: D.anim.glide,
      headYaw: D.anim.headYaw || 0, headPitch: D.anim.headPitch || 0, jaw: D.anim.jaw || 0, sleep: D.sleepK, sit: D.sitK,
      wag: D.anim.wag || 0, stretch: D.anim.stretch || 0, climb: D.mode === 'ride' ? 0 : 0,
    });
  }

  // ---------------- helpers for other parts of the game ----------------
  const tmpV = new THREE.Vector3(), tmpQ = new THREE.Quaternion();
  function mouthPos() { D.model.root.updateMatrixWorld(true); return D.model.mouth.getWorldPosition(new THREE.Vector3()); }
  function seatWorld() { D.model.root.updateMatrixWorld(true); return D.model.seat.getWorldPosition(tmpV); }
  function bodyQuat() { return D.model.body.getWorldQuaternion(tmpQ); }

  // ------------------------------------------------------------
  //  WILD DRAGONS (they live on the other islands)
  // ------------------------------------------------------------
  const wild = [];
  function addWild(color, cx, cz, r, h, sp, sitting) {
    const m = DL.Models.dragon(color);
    m.setSaddle('none');
    m.setStage('adult');
    m.stageY = m.body.position.y;
    const w = { m, cx, cz, r, h, sp, a: Math.random() * 6, sitting, ph: Math.random() * 6, s: U.rand(0.9, 1.25) };
    m.root.scale.setScalar(w.s);
    if (sitting) {
      const y = W().groundAt(cx, cz, 300);
      m.root.position.set(cx, y, cz);
      m.root.rotation.y = Math.random() * 6;
    }
    scene.add(m.root);
    wild.push(w);
    return w;
  }
  function initWild() {
    const B = W().byId;
    addWild('ocean', B.misty.x, B.misty.z, 70, 70, 0.22);
    addWild('amethyst', B.misty.x + 30, B.misty.z - 20, 50, 55, -0.28);
    addWild('ruby', B.volcano.x, B.volcano.z, 90, 160, 0.18);
    addWild('gold', B.volcano.x, B.volcano.z, 60, 140, -0.24);
    addWild('snow', B.crystal.x, B.crystal.z, 80, 170, 0.2);
    // two sleeping by the big trees in the Misty Forest
    const s1 = W().coast(B.misty, 2.2, 6); addWild('emerald', U.lerp(B.misty.x, s1.x, 0.5), U.lerp(B.misty.z, s1.z, 0.5), 0, 0, 0, true);
    const s2 = W().coast(B.misty, 2.6, 6); addWild('shadow', U.lerp(B.misty.x, s2.x, 0.55), U.lerp(B.misty.z, s2.z, 0.55), 0, 0, 0, true);
  }
  // when the story ends, dragons come back to all the islands
  function dragonsReturn() {
    const B = W().byId;
    const cols = ['ruby', 'ocean', 'gold', 'amethyst', 'snow', 'shadow', 'emerald'];
    let i = 0;
    for (const isl of ['home', 'village', 'ruins', 'home']) {
      addWild(cols[i++ % cols.length], B[isl].x + U.rand(-40, 40), B[isl].z + U.rand(-40, 40), U.rand(50, 90), U.rand(50, 90), U.rand(0.15, 0.3) * (Math.random() < 0.5 ? -1 : 1));
    }
  }
  function updateWild(dt) {
    const cam = DL.Game.camera.position;
    for (const w of wild) {
      const m = w.m;
      const far = U.dist2(m.root.position.x, m.root.position.z, cam.x, cam.z) > 600 * 600;
      m.root.visible = !far;
      if (w.sitting) {
        if (!far) m.animate(dt, { t: W().time + w.ph, sleep: 1 });
        if (!far && Math.random() < dt * 0.4) DL.FX.zzz(m.root.position.x, m.root.position.y + 2, m.root.position.z);
        continue;
      }
      w.a += w.sp * dt;
      const x = w.cx + Math.cos(w.a) * w.r, z = w.cz + Math.sin(w.a) * w.r;
      const y = w.h + Math.sin(w.a * 3) * 8;
      m.root.position.set(x, y, z);
      m.root.rotation.order = 'YXZ';
      m.root.rotation.y = Math.atan2(-Math.sin(w.a) * w.sp, Math.cos(w.a) * w.sp);
      m.root.rotation.z = -Math.sign(w.sp) * 0.35;
      w.ph += dt * 4.5;
      if (!far) m.animate(dt, { t: W().time, fly: 1, flap: Math.sin(w.a * 2) > -0.2 ? 1 : 0.15, flapPh: w.ph, glide: false });
      // you can hear them roar sometimes
      if (Math.random() < dt * 0.03) { const d = m.root.position.distanceTo(cam); if (d < 200) S().play('roar', { vol: Math.max(0.1, 1 - d / 200) * 0.6, far: true }); }
    }
  }

  // ---------------- saving ----------------
  function save() {
    return {
      stage: D.stage, name: D.name, color: D.color, saddle: D.saddle, growth: D.growth, hunger: D.hunger, happy: D.happy,
      pos: D.pos.toArray(), yaw: D.yaw, egg: { state: D.egg.state, warm: D.egg.warm, pos: D.egg.pos.toArray() },
      colors: D.colors, saddles: D.saddles, returned: D.returned,
    };
  }
  function load(s) {
    if (!s) {
      Object.assign(D, { stage: 'egg', name: 'Ember', color: 'emerald', saddle: 'leather', growth: 0, hunger: 80, happy: 70, colors: ['emerald', 'ruby', 'ocean', 'amethyst', 'snow'], saddles: ['leather'], returned: false });
      D.egg.state = 'cave'; D.egg.warm = 0;
    } else {
      Object.assign(D, { stage: s.stage, name: s.name, color: s.color, saddle: s.saddle, growth: s.growth, hunger: s.hunger, happy: s.happy, colors: s.colors || D.colors, saddles: s.saddles || ['leather'], returned: s.returned });
      D.pos.fromArray(s.pos); D.yaw = s.yaw || 0;
      D.egg.state = s.egg.state; D.egg.warm = s.egg.warm; D.egg.pos.fromArray(s.egg.pos);
      if (D.egg.state === 'carried' && !It().has('egg')) It().add('egg', 1, true);
      if (s.returned) dragonsReturn();
    }
    D.mode = 'ground'; D.sleeping = false; D.ai = 'follow'; D.landing = false;
    D.model.root.visible = hatched();
    if (hatched()) {
      setLook();
      // put it next to you
      const p = P();
      if (D.pos.distanceTo(p.pos) > 30 || !isFinite(D.pos.y)) D.pos.set(p.pos.x + 3, 0, p.pos.z + 2);
      D.pos.y = Math.max(W().groundAt(D.pos.x, D.pos.z, 300), 0);
    }
  }

  return Object.assign(D, {
    init, initWild, update, updateWild, scale, feed, pet, grow, mount, dismount, onDragonKey, callDragon, pickEgg, placeEgg, hatched, near, reach,
    mouthPos, seatWorld, bodyQuat, setLook, canRide, save, load, dragonsReturn,
    canFetch: () => hatched() && !D.sleeping && D.mode === 'ground' && D.pos.distanceTo(P().pos) < 45,
    YOUNG_AT, ADULT_AT,
  });
})();
