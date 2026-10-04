// ============================================================
//  SIGMA HOVER GP — POWER-UPS!
//  Item boxes, coins, and every item: turbos, homing Sigma
//  Rockets, bouncing orbs, banana slimes, mines, shields,
//  squid ink, EMP shock, ghost, SIGMA MODE, the FBI helicopter
//  that hunts down 1st place, and the Sigma Missile autopilot.
//
//  The further behind you are, the better the items you get!
// ============================================================
window.HG = window.HG || {};

HG.Items = (function () {
  const U = HG.U, M = HG.M;

  // ---------- every item ----------
  const ITEMS = {
    turbo: { icon: '🔥', name: 'TURBO' },
    turbo3: { icon: '🔥', name: 'TRIPLE TURBO', count: 3, as: 'turbo' },
    goldturbo: { icon: '🌟', name: 'GOLDEN TURBO' },
    rocket: { icon: '🚀', name: 'SIGMA ROCKET', drag: true },
    rocket3: { icon: '🚀', name: 'TRIPLE ROCKETS', count: 3, as: 'rocket', orbit: true },
    orb: { icon: '🟢', name: 'BOUNCE ORB', drag: true },
    orb3: { icon: '🟢', name: 'TRIPLE ORBS', count: 3, as: 'orb', orbit: true },
    banana: { icon: '🍌', name: 'BANANA SLIME', drag: true },
    banana3: { icon: '🍌', name: 'TRIPLE BANANAS', count: 3, as: 'banana', orbit: true },
    mine: { icon: '💣', name: 'SIGMA MINE', drag: true },
    shield: { icon: '🛡️', name: 'SHIELD BUBBLE' },
    coins: { icon: '💰', name: 'COINS' },
    horn: { icon: '📯', name: 'SIGMA HORN' },
    smoke: { icon: '🦑', name: 'SQUID INK' },
    emp: { icon: '⚡', name: 'EMP SHOCK' },
    ghost: { icon: '👻', name: 'GHOST' },
    sigma: { icon: '⭐', name: 'SIGMA MODE' },
    fbi: { icon: '🚁', name: 'FBI HELICOPTER' },
    missile: { icon: '🎯', name: 'SIGMA MISSILE' },
  };
  // chances by place: [front, upper middle, lower middle, back]
  const ODDS = {
    banana: [24, 10, 3, 0], banana3: [8, 6, 2, 0], orb: [20, 14, 4, 0], orb3: [4, 8, 8, 0], coins: [14, 8, 2, 0],
    mine: [8, 10, 6, 0], horn: [8, 3, 0, 0], shield: [10, 8, 4, 0], smoke: [2, 8, 6, 0],
    rocket: [0, 14, 16, 8], rocket3: [0, 2, 10, 12], turbo: [0, 14, 14, 4], turbo3: [0, 4, 12, 16],
    ghost: [0, 4, 6, 6], fbi: [0, 0, 5, 8], sigma: [0, 0, 6, 14], goldturbo: [0, 0, 5, 14], emp: [0, 0, 2, 6], missile: [0, 0, 0, 12],
  };
  const BATTLE_ODDS = { orb: 16, orb3: 8, rocket: 12, rocket3: 6, banana: 12, banana3: 6, mine: 10, shield: 6, turbo: 8, ghost: 6, horn: 6, sigma: 3 };

  let race = null, track = null, group = null;
  let boxes = [], coins = [], things = [], heli = null;
  let fbiCool = 0, empCool = 0;
  const _p = new THREE.Vector3(), _q = new THREE.Quaternion();
  const meshes = {};

  // ------------------------------------------------------------
  //  SETUP
  // ------------------------------------------------------------
  function setup(r) {
    race = r; track = r.track;
    boxes = []; coins = []; things = []; heli = null; fbiCool = 0; empCool = 0;
    if (r.cfg.items === false) return;
    if (track.isArena) {
      for (const b of track.boxes) boxes.push({ s: b.s, d: b.d, h: 1.1, t: 0, mesh: null });
      for (const c of track.coins || []) coins.push({ s: c.s, d: c.d, t: 0, mesh: null });
      return;
    }
    for (const row of track.itemRows) {
      const fr = track.frame(row.s, HG.Track.makeFrame());
      const hw = fr.w / 2;
      const n = hw > 14 ? 7 : hw > 10 ? 6 : 5;
      for (let i = 0; i < n; i++) boxes.push({ s: row.s, d: (i / (n - 1) - 0.5) * 2 * (hw - 2.5), h: 1.1, t: 0, mesh: null });
    }
    for (const c of track.coins) coins.push({ s: c.s, d: c.lane * track.frame(c.s, HG.Track.makeFrame()).w / 2, t: 0, mesh: null });
  }

  // ------------------------------------------------------------
  //  3D MODELS FOR ITEMS
  // ------------------------------------------------------------
  function model(type) {
    const g = new THREE.Group();
    if (type === 'box') {
      const t = HG.Tex.itemBox();
      const mat = new THREE.MeshStandardMaterial({ map: t, transparent: true, opacity: 0.85, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.6, roughness: 0.2, depthWrite: false });
      g.add(new THREE.Mesh(M.rbox(1.4, 1.4, 1.4, 0.15), mat));
      const core = new THREE.Mesh(M.sphere(0.35, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      g.add(core); g.userData.core = core;
    } else if (type === 'coin') {
      const mat = new THREE.MeshStandardMaterial({ map: HG.Tex.coin(), metalness: 0.8, roughness: 0.25, emissive: 0x6a4a00, emissiveIntensity: 0.4 });
      const c = new THREE.Mesh(M.cyl(0.5, 0.5, 0.1, 24), [new THREE.MeshStandardMaterial({ color: 0xd8a010, metalness: 0.9, roughness: 0.3 }), mat, mat]);
      c.rotation.x = Math.PI / 2;
      g.add(c);
    } else if (type === 'banana') {
      const y = M.mat('#ffd82a', { rough: 0.5 }), br = M.mat('#6a4a1a');
      const peel = new THREE.Mesh(M.torus(0.45, 0.16, Math.PI * 1.1, 10, 16), y);
      peel.rotation.set(0, 0, 0.9); peel.position.y = 0.2; g.add(peel);
      for (let i = 0; i < 3; i++) { const f = M.mesh(M.capsule(0.12, 0.35), y, Math.cos(i * 2.1) * 0.35, 0.05, Math.sin(i * 2.1) * 0.35, g); f.rotation.set(Math.sin(i * 2.1) * 1.2, 0, -Math.cos(i * 2.1) * 1.2); }
      M.mesh(M.cyl(0.06, 0.08, 0.15), br, -0.38, 0.6, 0, g);
      // a slimy green puddle
      const pud = M.mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshStandardMaterial({ color: 0x7aff4a, transparent: true, opacity: 0.6, roughness: 0.1, emissive: 0x204a10 }), 0, 0.02, 0, g, { r: [-Math.PI / 2, 0, 0], shadow: false });
    } else if (type === 'orb') {
      M.mesh(M.sphere(0.6, 20, 14), new THREE.MeshStandardMaterial({ color: 0x30ff60, emissive: 0x10a030, emissiveIntensity: 0.8, roughness: 0.15, metalness: 0.2 }), 0, 0, 0, g);
      M.mesh(M.torus(0.62, 0.1, Math.PI * 2, 8, 24), M.mat('#ffffff', { rough: 0.3 }), 0, 0, 0, g, { r: [Math.PI / 2, 0, 0] });
    } else if (type === 'rocket') {
      const red = M.mat('#e8262a', { rough: 0.3, metal: 0.3 }), white = M.mat('#ffffff', { rough: 0.3 });
      const body = M.group(g); body.rotation.x = Math.PI / 2;
      M.mesh(M.cyl(0.3, 0.3, 1.1, 16), red, 0, 0, 0, body);
      M.mesh(M.cone(0.3, 0.6, 16), white, 0, 0.85, 0, body);
      for (let i = 0; i < 4; i++) { const f = M.mesh(M.box(0.04, 0.4, 0.35), white, 0, -0.45, 0, body); f.rotation.y = i * Math.PI / 2; f.position.x = Math.cos(i * Math.PI / 2) * 0.3; f.position.z = Math.sin(i * Math.PI / 2) * 0.3; }
      const fl = M.mesh(M.cone(0.22, 0.9, 12), new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, blending: THREE.AdditiveBlending, toneMapped: false }), 0, -1.0, 0, body, { r: [Math.PI, 0, 0], shadow: false });
      g.userData.flame = fl;
      const st = new THREE.MeshBasicMaterial({ map: HG.Tex.sign('Σ', '#e8262a', '#ffcc1a', 64, 64), toneMapped: false });
      M.mesh(new THREE.PlaneGeometry(0.4, 0.4), st, 0, 0.31, 0.1, g, { r: [-Math.PI / 2, 0, 0] });
    } else if (type === 'mine') {
      M.mesh(M.sphere(0.55, 18, 14), M.mat('#1a1a22', { rough: 0.4, metal: 0.5 }), 0, 0.5, 0, g);
      for (let i = 0; i < 8; i++) { const sp = M.mesh(M.cone(0.1, 0.35, 8), M.mat('#9aa0a8', { metal: 0.8, rough: 0.3 }), 0, 0.5, 0, g); const d = new THREE.Vector3().randomDirection(); sp.position.addScaledVector(d, 0.55); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); }
      const light = M.mesh(M.sphere(0.12), new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }), 0, 1.08, 0, g);
      g.userData.light = light;
    } else if (type === 'heli') {
      const black = M.mat('#14141a', { rough: 0.4, metal: 0.4 });
      M.mesh(M.capsule(1.0, 2.0), black, 0, 0, 0, g, { r: [Math.PI / 2, 0, 0], s: [1, 1, 0.85] });
      M.mesh(M.cyl(0.25, 0.12, 3.0), black, 0, 0.3, -2.6, g, { r: [Math.PI / 2 - 0.1, 0, 0] });
      M.mesh(M.sphere(0.85, 16, 12), new THREE.MeshStandardMaterial({ color: 0x80c0ff, transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.5 }), 0, 0.2, 1.1, g, { s: [0.9, 0.8, 0.9] });
      const fbiTex = new THREE.MeshBasicMaterial({ map: HG.Tex.sign('FBI', '#14141a', '#ffffff', 256, 128), toneMapped: false });
      for (const s of [1, -1]) M.mesh(new THREE.PlaneGeometry(1.4, 0.7), fbiTex, s * 0.86, 0, -0.2, g, { r: [0, s * Math.PI / 2, 0] });
      const rotor = M.group(g, 0, 1.15, 0);
      for (let i = 0; i < 4; i++) M.mesh(M.box(4.6, 0.05, 0.3), black, 0, 0, 0, rotor).rotation.y = i * Math.PI / 4;
      g.userData.rotor = rotor;
      const r1 = M.mesh(M.sphere(0.18), new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }), 0.4, -0.75, 0.6, g);
      const b1 = M.mesh(M.sphere(0.18), new THREE.MeshBasicMaterial({ color: 0x2060ff, toneMapped: false }), -0.4, -0.75, 0.6, g);
      g.userData.sirens = [r1, b1];
      for (const s of [1, -1]) M.mesh(M.box(0.1, 0.1, 2.4), black, s * 0.6, -1.05, 0, g);
    } else if (type === 'ink') {
      M.mesh(M.sphere(0.6), M.mat('#1a0a2a', { rough: 0.2 }), 0, 0, 0, g);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = type !== 'box'; });
    return g;
  }

  function build(world, r) {
    group = new THREE.Group();
    world.add(group);
    meshes.heli = null;
    for (const b of boxes) { b.mesh = model('box'); group.add(b.mesh); }
    for (const c of coins) { c.mesh = model('coin'); group.add(c.mesh); }
  }

  // world position of a track-space point
  function wpos(s, d, h, out) {
    if (track.isArena) return track.point(s, d, h, out);
    return track.point(s, d, h, out);
  }

  // ------------------------------------------------------------
  //  WHICH ITEM DO YOU GET?
  // ------------------------------------------------------------
  function roll(k) {
    if (race.battle) return weighted(BATTLE_ODDS);
    const n = race.karts.length;
    const p = n > 1 ? (k.place - 1) / (n - 1) : 0;
    // smoothly mix the four tiers
    const f = p * 3, i = Math.min(2, Math.floor(f)), t = f - i;
    const odds = {};
    for (const id in ODDS) {
      let w = U.lerp(ODDS[id][i], ODDS[id][i + 1], t);
      if (id === 'fbi' && (fbiCool > 0 || heli)) w = 0;
      if (id === 'emp' && empCool > 0) w = 0;
      if (race.cfg.mode === 'tt') w = 0;
      odds[id] = w;
    }
    return weighted(odds);
  }
  function weighted(odds) {
    let sum = 0;
    for (const id in odds) sum += odds[id];
    let r = Math.random() * sum;
    for (const id in odds) { r -= odds[id]; if (r <= 0) return id; }
    return 'banana';
  }

  function give(k, id) {
    const def = ITEMS[id];
    k.item = def.as || id;
    k.itemId = id;
    k.itemCount = def.count || 1;
    k.orbiting = def.orbit ? def.count : 0;
    k.events.push({ type: 'itemget', id });
    if (id === 'goldturbo') { k.item = 'goldturbo'; }
  }

  // ------------------------------------------------------------
  //  EVERY STEP
  // ------------------------------------------------------------
  function update(dt, r) {
    if (r.cfg.items === false) return;
    if (fbiCool > 0) fbiCool -= dt;
    if (empCool > 0) empCool -= dt;
    for (const k of r.karts) {
      if (k.out) continue;
      // item roulette
      if (k.roulette > 0) {
        k.roulette -= dt;
        if (k.roulette <= 0) give(k, k.rouletteItem);
      }
      if (k.ctrl !== 'remote') useItems(k, dt);
      if (k.goldT > 0 && k.ctrl !== 'remote') {
        // golden turbo: boost as often as you like
        if (k.input.item && !k.prevItem && k.goldT > 0) k.boost(0.9, 'gold');
      }
      k.prevItem = k.input.item;
    }
    // boxes and coins
    for (const b of boxes) {
      if (b.t > 0) { b.t -= dt; continue; }
      for (const k of r.karts) {
        if (k.out || k.falling > 0) continue;
        if (near(k, b.s, b.d, b.h, 2.3)) {
          b.t = 1.2;
          k.events.push({ type: 'boxhit' });
          if (k.ctrl === 'remote') continue;
          if (!k.item && !(k.roulette > 0) && !k.missileT) {
            k.roulette = 1.4 + Math.random() * 0.3;
            k.rouletteItem = roll(k);
            k.events.push({ type: 'roulette' });
            if (HG.Net && r.cfg.online) HG.Net.boxTaken(boxes.indexOf(b));
          }
          break;
        }
      }
    }
    for (const c of coins) {
      if (c.t > 0) { c.t -= dt; continue; }
      for (const k of r.karts) {
        if (k.out || k.falling > 0) continue;
        if (near(k, c.s, c.d, 0.8, 1.7)) {
          c.t = 12;
          if (k.ctrl !== 'remote') addCoins(k, 1);
          break;
        }
      }
    }
    // things moving or lying on the track
    for (let i = things.length - 1; i >= 0; i--) {
      const t = things[i];
      t.age += dt;
      stepThing(t, dt, r);
      if (t.dead) { removeThing(t); things.splice(i, 1); }
    }
    if (heli) stepHeli(dt, r);
  }

  function near(k, s, d, h, rad) {
    const ds = track.isArena ? k.s - s : track.diff(s, k.s);
    if (Math.abs(ds) > rad + 2) return false;
    const dd = k.d - d, dh = (k.h + 0.5) - h;
    return ds * ds + dd * dd + dh * dh * 0.5 < rad * rad;
  }

  function addCoins(k, n) {
    const before = k.coins;
    k.coins = Math.min(10, k.coins + n);
    if (race.battle) k.coins = Math.min(99, before + n);
    k.events.push({ type: 'coin' });
    // each coin gives a tiny speed burst
    if (k.boostT < 0.25) { k.boostT = 0.25; k.boostKind = 'coin'; }
  }

  // ------------------------------------------------------------
  //  USING ITEMS
  // ------------------------------------------------------------
  function useItems(k, dt) {
    const inp = k.input;
    const press = inp.item && !k.itemHeld;
    const release = !inp.item && k.itemHeld;
    k.itemHeld = inp.item;
    // let go of a dragged item: throw it
    if (k.dragged && (release || k.hitT > 0)) {
      const id = k.dragged; k.dragged = null;
      if (k.hitT > 0) return;
      const forward = id === 'banana' || id === 'mine' ? !!(inp.gasKey && !inp.back && k.ctrl === 'local') || (k.ctrl === 'cpu' && k.aiThrowFwd) : !inp.back;
      throwItem(k, id, forward);
      return;
    }
    if (!press || k.disabled && k.hitT > 0) return;
    if (!k.item || k.roulette > 0) return;
    const id = k.item;
    const def = ITEMS[k.itemId || id] || ITEMS[id];
    if (def.drag && !k.orbiting) {
      // hold the button = drag it behind you as a shield
      k.dragged = id; k.item = null; k.itemCount = 0;
      if (!inp.item) { k.dragged = null; throwItem(k, id, id === 'banana' || id === 'mine' ? false : !inp.back); }
      return;
    }
    // triple items: fire one at a time
    if (k.orbiting) {
      k.itemCount--; k.orbiting = k.itemCount;
      if (id === 'turbo') k.boost(1.15, 'turbo');
      else throwItem(k, id, id === 'banana' ? false : !inp.back);
      if (k.itemCount <= 0) { k.item = null; k.orbiting = 0; }
      return;
    }
    k.itemCount--;
    if (k.itemCount <= 0) { k.item = null; k.itemCount = 0; }
    useInstant(k, id);
  }

  function useInstant(k, id) {
    if (HG.Net && race.cfg.online && k.ctrl !== 'remote' && !HG.Items.fromNet) HG.Net.itemEvent(k, 'use', id);
    k.events.push({ type: 'use', id });
    if (id === 'turbo') k.boost(1.15, 'turbo');
    else if (id === 'goldturbo') { k.goldT = 7.5; k.boost(0.9, 'gold'); }
    else if (id === 'shield') k.shieldT = 14;
    else if (id === 'coins') { addCoins(k, 1); setTimeout(() => race && addCoins(k, 1), 350); }
    else if (id === 'sigma') { k.sigmaT = 8; k.boost(0.6, 'turbo'); }
    else if (id === 'ghost') {
      k.ghostT = 6;
      // steal an item from someone ahead
      const victims = race.karts.filter((o) => o !== k && o.item && !o.ghostT);
      if (victims.length && !k.item) { const v = U.pick(victims); k.item = v.item; k.itemId = v.itemId; k.itemCount = 1; k.orbiting = 0; v.item = null; v.itemCount = 0; v.orbiting = 0; v.events.push({ type: 'stolen' }); }
    } else if (id === 'missile') { k.missileT = 6.5; k.boost(0.5, 'turbo'); k.cancelDrift(); }
    else if (id === 'horn') horn(k);
    else if (id === 'smoke') {
      for (const o of race.karts) if (o !== k && o.place < k.place && !o.ghostT && !o.sigmaT) { o.smokeT = 5; o.events.push({ type: 'inked' }); }
      if (!race.karts.some((o) => o.place < k.place)) for (const o of race.karts) if (o !== k) o.smokeT = 4;
    } else if (id === 'emp') {
      empCool = 25;
      for (const o of race.karts) {
        if (o === k || o.sigmaT > 0 || o.ghostT > 0 || o.missileT > 0) continue;
        if (o.shieldT > 0) { o.shieldT = 0; o.events.push({ type: 'shieldpop' }); continue; }
        o.shrinkT = 6; o.hit('spin', k); o.dragged = null; o.item = null; o.orbiting = 0;
      }
      race.events.push({ type: 'emp', by: k });
    } else if (id === 'fbi') {
      fbiCool = 30;
      launchHeli(k);
    }
  }

  // ------------------------------------------------------------
  //  THROWN THINGS (they live in track space, like the racers)
  // ------------------------------------------------------------
  function throwItem(k, id, forward) {
    if (HG.Net && race.cfg.online && k.ctrl !== 'remote' && !HG.Items.fromNet) HG.Net.itemEvent(k, 'throw', id, forward);
    k.anim.throwT = 0.4; k.anim.throwDir = forward ? 1 : -1;
    k.events.push({ type: 'throw', id });
    const t = { type: id, s: k.s, dist: k.dist, d: k.d, h: 0.6, vh: 0, yaw: forward ? k.yaw : U.wrapAngle(k.yaw + Math.PI), spd: 0, age: 0, owner: k, mesh: null, bounces: 0, target: null, armed: 0 };
    const fwdOff = forward ? 2.8 : -2.6;
    t.s = (track.isArena ? k.s + Math.cos(k.yaw) * fwdOff : track.wrap(k.s + fwdOff * Math.cos(k.yaw)));
    t.d = k.d + Math.sin(k.yaw) * fwdOff;
    if (id === 'banana') {
      if (forward) { t.spd = Math.max(20, k.spd + 8); t.vh = 9; t.h = 1.2; t.flying = true; } else { t.spd = 0; t.h = 0; }
    } else if (id === 'mine') {
      t.spd = forward ? Math.max(18, k.spd + 6) : 0; t.vh = forward ? 10 : 0; t.h = forward ? 1.2 : 0; t.flying = forward; t.fuse = 9;
    } else if (id === 'orb') {
      t.spd = Math.max(48, Math.abs(k.spd) + 22); t.h = 0.6; t.life = 10;
    } else if (id === 'rocket') {
      t.spd = Math.max(52, Math.abs(k.spd) + 22); t.h = 0.8; t.life = 9;
      t.target = forward ? targetAhead(k) : null;
      if (!forward) t.spd = 45;
    }
    things.push(t);
    t.mesh = model(id === 'rocket' ? 'rocket' : id);
    if (group) group.add(t.mesh);
    // too many bananas on the track? remove the oldest
    const lying = things.filter((x) => x.type === 'banana');
    if (lying.length > 24) lying[0].dead = true;
    return t;
  }

  function targetAhead(k) {
    let best = null, bd = Infinity;
    for (const o of race.karts) {
      if (o === k || o.out || o.finished) continue;
      let d;
      if (track.isArena) { d = Math.hypot(o.s - k.s, o.d - k.d); const ang = Math.abs(U.angleDiff(k.yaw, Math.atan2(o.d - k.d, o.s - k.s))); if (ang > 1.2) continue; }
      else { d = track.diff(k.s, o.s); if (d <= 0) d += track.length; if (o.place !== k.place - 1 && d > 120) continue; }
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  function stepThing(t, dt, r) {
    const tr = track;
    if (t.life !== undefined) { t.life -= dt; if (t.life <= 0) { if (t.type === 'rocket') boom(t, 4); t.dead = true; return; } }
    // movement
    if (t.spd) {
      if (t.type === 'rocket' && t.target && !t.target.out) {
        // homing: steer toward the target
        const o = t.target;
        const ds = tr.isArena ? o.s - t.s : tr.diff(t.s, o.s);
        const want = Math.atan2(o.d - t.d, Math.max(4, ds));
        const close = Math.abs(ds) < 25;
        t.yaw = U.wrapAngle(t.yaw + U.clamp(U.angleDiff(t.yaw, tr.isArena ? Math.atan2(o.d - t.d, o.s - t.s) : want), -1, 1) * (close ? 7 : 3) * dt);
        if (!tr.isArena && !close) t.d = U.damp(t.d, 0, 0.5, dt);
      } else if (t.type === 'rocket' && !tr.isArena) {
        t.yaw = U.damp(t.yaw, 0, 3, dt);
      }
      const fr = tr.frame(t.s, HG.Items.fr);
      const fwd = t.spd * Math.cos(t.yaw), side = t.spd * Math.sin(t.yaw);
      const kd = tr.isArena ? 1 : U.clamp(1 - fr.k * t.d, 0.35, 2.5);
      const ds = fwd * dt / kd;
      t.s = tr.isArena ? t.s + ds : tr.wrap(t.s + ds);
      t.d += side * dt;
      if (!tr.isArena) t.yaw -= fr.k * ds;
      // walls
      const lim = tr.isArena ? null : fr.w / 2 + Math.min(fr.offL, fr.offR) - 0.6;
      if (tr.isArena) {
        const hitN = tr.collidePoint(t, 0.6);
        if (hitN) { if (t.type === 'orb') { t.yaw = tr.reflect(t.yaw, hitN); t.bounces++; } else if (t.type === 'rocket') { boom(t, 4); t.dead = true; return; } }
      } else if (Math.abs(t.d) > lim) {
        t.d = Math.sign(t.d) * lim;
        if (t.type === 'orb') { t.yaw = -t.yaw; t.bounces++; t.events = 1; }
        else if (t.type === 'rocket') t.yaw *= 0.3;
        else t.spd *= 0.5;
      }
      if (t.flying) {
        t.vh -= 30 * dt; t.h += t.vh * dt;
        if (t.h <= 0) { t.h = 0; t.flying = false; t.spd = 0; t.vh = 0; }
      }
      // fell into a hole?
      if (!tr.isArena && !tr.hasGround(t.s) && !t.flying && t.type !== 'rocket') { t.h -= 20 * dt; if (t.h < -10) t.dead = true; }
    }
    if (t.type === 'mine') {
      t.armed += dt;
      t.fuse -= dt;
      if (t.fuse <= 0) { boom(t, 6.5); t.dead = true; return; }
    }
    // hitting racers
    const rad = t.type === 'orb' ? 1.7 : t.type === 'rocket' ? 1.9 : t.type === 'mine' ? 2.4 : 1.6;
    for (const k of r.karts) {
      if (k.out || k.falling > 0 || k.respawnT > 0) continue;
      if (k === t.owner && t.age < (t.type === 'orb' ? 0.35 : 0.8)) continue;
      if (t.type === 'mine' && t.armed < 0.6) continue;
      if (!near(k, t.s, t.d, t.h + 0.2, rad)) continue;
      if (k.ghostT > 0) continue;
      if (k.ctrl === 'remote') { if (r.cfg.online && !k.isGhost) { if (t.type !== 'mine') { t.dead = true; return; } } else continue; }
      // something dragged behind you blocks it
      if (blocks(k, t)) { t.dead = true; return; }
      if (t.type === 'mine') { boom(t, 6.5); t.dead = true; return; }
      if (t.type === 'banana') { if (k.hit('spin', t.owner)) k.events.push({ type: 'slipped' }); t.dead = true; return; }
      if (t.type === 'orb' || t.type === 'rocket') { if (k.hit('tumble', t.owner)) { hitBy(t.owner, k); } boom(t, 0); t.dead = true; return; }
    }
    // projectiles break bananas and each other
    if (t.type === 'orb' || t.type === 'rocket') {
      for (const o of things) {
        if (o === t || o.dead || o.type === 'rocket' && t.type === 'rocket') continue;
        const ds = tr.isArena ? o.s - t.s : tr.diff(t.s, o.s);
        if (Math.abs(ds) < 1.6 && Math.abs(o.d - t.d) < 1.6 && Math.abs(o.h - t.h) < 1.5) {
          if (o.type === 'mine') boom(o, 6.5);
          o.dead = true; t.dead = true; sparksAt(t, 0xffffff); return;
        }
      }
    }
    if (t.type === 'orb' && t.bounces > 6) t.dead = true;
  }

  function blocks(k, t) {
    const behind = track.isArena ? Math.cos(Math.atan2(t.d - k.d, t.s - k.s) - k.yaw) < 0 : track.diff(k.s, t.s) < 0;
    if (k.dragged && behind) { k.dragged = null; sparksAt(t, 0xffffff); k.events.push({ type: 'blocked' }); return true; }
    if (k.orbiting > 0) { k.orbiting--; k.itemCount--; if (k.itemCount <= 0) { k.item = null; k.orbiting = 0; } sparksAt(t, 0xffffff); k.events.push({ type: 'blocked' }); return true; }
    return false;
  }

  function hitBy(owner, victim) {
    if (owner && owner !== victim) owner.events.push({ type: 'hitother', victim });
  }

  // explosion: hits everyone close by
  function boom(t, radius) {
    const p = wpos(t.s, t.d, t.h + 0.5, new THREE.Vector3());
    if (HG.FX) HG.FX.explosion(p, radius > 5 ? 1.3 : 0.8);
    race.events.push({ type: 'boom', p, big: radius > 5 });
    if (!radius) return;
    for (const k of race.karts) {
      if (k.out || k.falling > 0) continue;
      const ds = track.isArena ? k.s - t.s : track.diff(t.s, k.s);
      if (ds * ds + (k.d - t.d) ** 2 < radius * radius) { if (k.hit('tumble', t.owner)) hitBy(t.owner, k); }
    }
  }
  function sparksAt(t, c) { if (HG.FX) HG.FX.sparks(wpos(t.s, t.d, t.h + 0.5, new THREE.Vector3()), c, 14, 6); }

  function horn(k) {
    k.events.push({ type: 'horn' });
    const p = wpos(k.s, k.d, 1, new THREE.Vector3());
    if (HG.FX) { HG.FX.ring(p, 0xffe040, 16, 0.5); HG.FX.ring(p, 0xffffff, 12, 0.4); }
    for (const t of things) {
      const ds = track.isArena ? t.s - k.s : track.diff(k.s, t.s);
      if (ds * ds + (t.d - k.d) ** 2 < 14 * 14) { t.dead = true; sparksAt(t, 0xffe040); }
    }
    if (heli) {
      const ds = track.isArena ? heli.s - k.s : track.diff(k.s, heli.s);
      if (Math.abs(ds) < 30) { heli.leaving = true; heli.shot = true; if (HG.FX) HG.FX.explosion(heli.mesh.position, 1.5); }
    }
    for (const o of race.karts) {
      if (o === k) continue;
      const ds = track.isArena ? o.s - k.s : track.diff(k.s, o.s);
      if (ds * ds + (o.d - k.d) ** 2 < 9 * 9) if (o.hit('spin', k)) hitBy(k, o);
    }
  }

  // ------------------------------------------------------------
  //  THE FBI HELICOPTER: flies to 1st place and drops a bomb
  // ------------------------------------------------------------
  function launchHeli(k) {
    heli = { s: k.s, d: k.d, h: 14, owner: k, t: 0, leaving: false, dropped: false, mesh: model('heli') };
    if (group) group.add(heli.mesh);
    race.events.push({ type: 'fbi' });
    for (const o of race.karts) if (o.place === 1) o.events.push({ type: 'fbiwarn' });
  }
  function stepHeli(dt, r) {
    const h = heli;
    h.t += dt;
    const lead = r.order ? r.order.find((o) => !o.finished && !o.out) : null;
    if (!h.leaving && lead) {
      const ds = track.isArena ? lead.s - h.s : track.diff(h.s, lead.s);
      const sp = Math.max(70, lead.spd + 30);
      if (track.isArena) { const dx = lead.s - h.s, dd = lead.d - h.d, L = Math.hypot(dx, dd) || 1; h.s += dx / L * sp * dt; h.d += dd / L * sp * dt; }
      else { h.s = track.wrap(h.s + Math.min(sp * dt, Math.max(0, ds) + lead.spd * dt)); h.d = U.damp(h.d, lead.d, 4, dt); }
      const dist = track.isArena ? Math.hypot(lead.s - h.s, lead.d - h.d) : Math.abs(ds);
      h.h = U.damp(h.h, dist < 30 ? 6 : 14, 3, dt);
      if (dist < 4 && h.t > 1) {
        // bombs away!
        const p = wpos(lead.s, lead.d, 1, new THREE.Vector3());
        if (HG.FX) { HG.FX.explosion(p, 1.6); HG.FX.ring(p, 0x4080ff, 14, 0.6); }
        r.events.push({ type: 'boom', p, big: true, fbi: true });
        for (const o of r.karts) {
          const ds2 = track.isArena ? o.s - lead.s : track.diff(lead.s, o.s);
          if (ds2 * ds2 + (o.d - lead.d) ** 2 < 6 * 6) { const was = o.shieldT; o.shieldT = 0; if (o.hit('fbi', h.owner)) hitBy(h.owner, o); o.shieldT = 0; }
        }
        h.leaving = true;
      }
    } else h.leaving = true;
    if (h.leaving) { h.h += dt * 12; h.lt = (h.lt || 0) + dt; if (h.lt > 2.5) { group.remove(h.mesh); heli = null; return; } }
    if (h.t > 40) h.leaving = true;
  }

  // ------------------------------------------------------------
  //  DRAWING (every frame)
  // ------------------------------------------------------------
  const _fr = HG.Track.makeFrame();
  function place(mesh, s, d, h, yaw) {
    const fr = track.frame(s, _fr);
    mesh.position.copy(fr.p).addScaledVector(fr.r, d).addScaledVector(fr.n, h);
    const f = HG.V.a.copy(fr.t).multiplyScalar(Math.cos(yaw || 0)).addScaledVector(fr.r, Math.sin(yaw || 0));
    const right = HG.V.c.crossVectors(f, fr.n).normalize();
    HG.V.m.makeBasis(right.negate(), fr.n, f);
    mesh.quaternion.setFromRotationMatrix(HG.V.m);
  }
  let animT = 0;
  function animate(dt, r) {
    if (!group) return;
    animT += dt;
    for (const b of boxes) {
      const m = b.mesh;
      if (!m) continue;
      const vis = b.t <= 0 ? 1 : b.t < 0.4 ? 1 - b.t / 0.4 : 0;
      m.visible = vis > 0.01;
      if (!m.visible) continue;
      place(m, b.s, b.d, b.h + Math.sin(animT * 2 + b.d) * 0.15, 0);
      m.rotateY(animT * 1.2 + b.d); m.rotateX(0.5);
      m.scale.setScalar(vis);
      m.userData.core.material.color.setHSL((animT * 0.3 + b.d * 0.05) % 1, 1, 0.6);
    }
    for (const c of coins) {
      if (!c.mesh) continue;
      c.mesh.visible = c.t <= 0;
      if (!c.mesh.visible) continue;
      place(c.mesh, c.s, c.d, 0.9 + Math.sin(animT * 3 + c.s) * 0.1, 0);
      c.mesh.rotateY(animT * 3 + c.s);
    }
    for (const t of things) {
      if (!t.mesh) continue;
      place(t.mesh, t.s, t.d, t.h, t.yaw);
      if (t.type === 'orb') t.mesh.rotateY(animT * 10);
      if (t.type === 'banana' && !t.spd) t.mesh.rotateY(t.s);
      if (t.type === 'rocket' && t.mesh.userData.flame) t.mesh.userData.flame.scale.set(1, 0.8 + Math.random() * 0.5, 1);
      if (t.type === 'mine') t.mesh.userData.light.visible = Math.sin(animT * (t.fuse < 2 ? 30 : 8)) > 0;
      if (t.type === 'rocket' && HG.FX && Math.random() < 0.7) HG.FX.emit({ p: t.mesh.position, v: new THREE.Vector3((Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2), c: 0xb0b0b0, s: 0.7, life: 0.6, grow: 2, a: 0.5, add: false });
    }
    if (heli) {
      place(heli.mesh, heli.s, heli.d, heli.h, 0);
      heli.mesh.userData.rotor.rotation.y += dt * 30;
      const on = Math.sin(animT * 14) > 0;
      heli.mesh.userData.sirens[0].visible = on; heli.mesh.userData.sirens[1].visible = !on;
      heli.mesh.rotateX(0.15);
    }
    // things racers carry: dragged items, orbiting triples, shields
    for (const kv of HG.Game.kartViewsList()) {
      const k = kv.kart;
      let extra = kv.itemExtra;
      const want = (k.dragged || '') + '|' + (k.orbiting ? k.item + k.orbiting : '') + '|' + (k.shieldT > 0 ? 's' : '') + '|' + (k.missileT > 0 ? 'm' : '') + '|' + (race.battle ? k.balloons : '');
      if (!extra || extra.key !== want) {
        if (extra) kv.root.remove(extra.g);
        extra = kv.itemExtra = { key: want, g: new THREE.Group(), orbs: [] };
        kv.root.add(extra.g);
        if (k.dragged) { const m = model(k.dragged); m.position.set(0, k.dragged === 'banana' || k.dragged === 'mine' ? -0.5 : 0, -2.0); m.scale.setScalar(0.8); extra.g.add(m); }
        if (k.orbiting) for (let i = 0; i < k.orbiting; i++) { const m = model(k.item); m.scale.setScalar(0.65); extra.g.add(m); extra.orbs.push(m); }
        if (k.shieldT > 0) {
          const sh = new THREE.Mesh(M.sphere(2.0, 24, 16), new THREE.MeshPhysicalMaterial({ color: 0x80e0ff, transparent: true, opacity: 0.25, roughness: 0, clearcoat: 1, emissive: 0x2080ff, emissiveIntensity: 0.4, depthWrite: false }));
          sh.position.y = 0.6; extra.g.add(sh); extra.shield = sh;
        }
        if (k.missileT > 0) {
          const m = model('rocket'); m.scale.setScalar(3.2); m.position.set(0, 0.6, 0.3); extra.g.add(m); extra.missile = m;
        }
        if (race.battle && k.balloons > 0) {
          extra.balloons = [];
          for (let i = 0; i < k.balloons; i++) {
            const b = new THREE.Group();
            const ball = new THREE.Mesh(M.sphere(0.42, 16, 12), new THREE.MeshStandardMaterial({ color: ['#ff3b3b', '#3bb0ff', '#ffd21a'][i % 3], roughness: 0.25, emissiveIntensity: 0.15 }));
            ball.scale.set(1, 1.2, 1); ball.position.y = 1.9; b.add(ball);
            b.add(new THREE.Mesh(M.cyl(0.01, 0.01, 1.9, 4), M.mat('#ffffff')));
            b.children[1].position.y = 0.95;
            b.position.set(0, 1.2, -1.1);
            b.rotation.z = (i - (k.balloons - 1) / 2) * 0.45;
            extra.g.add(b); extra.balloons.push(b);
          }
        }
      }
      extra.orbs.forEach((m, i) => { const a = animT * 4 + (i / extra.orbs.length) * Math.PI * 2; m.position.set(Math.cos(a) * 2.2, 0.3, Math.sin(a) * 2.2); });
      if (extra.shield) extra.shield.scale.setScalar(1 + Math.sin(animT * 8) * 0.04);
      if (extra.balloons) extra.balloons.forEach((b, i) => { b.rotation.x = Math.sin(animT * 3 + i) * 0.15 - Math.min(0.5, Math.abs(k.spd) * 0.015); });
      if (extra.missile) kv.racer.group.visible = false; else kv.racer.group.visible = true;
    }
  }

  function removeThing(t) {
    if (t.mesh && group) group.remove(t.mesh);
    if (HG.Net && race && race.cfg.online) HG.Net.thingGone(t);
  }

  // ------------------------------------------------------------
  //  FOR THE HUD, THE CPUS AND THE MINIMAP
  // ------------------------------------------------------------
  function hudItem(k) {
    if (k.roulette > 0) {
      const ids = Object.keys(ITEMS);
      return { rolling: true, icon: ITEMS[ids[Math.floor(performance.now() / 70) % ids.length]].icon };
    }
    const dragIcon = k.dragged ? ITEMS[k.dragged].icon : null;
    if (!k.item) return dragIcon ? { icon: '', dragIcon } : null;
    const def = ITEMS[k.itemId] || ITEMS[k.item];
    return { icon: def.icon, count: k.itemCount, dragIcon };
  }

  // is there something dangerous in front of this CPU? (returns its sideways position)
  function dangerAhead(k, r, look) {
    if (track.isArena) return null;
    if (HG.Hazards) { const h = HG.Hazards.danger(k, look); if (h !== null) return h; }
    for (const t of things) {
      if (t.type !== 'banana' && t.type !== 'mine') continue;
      const ds = track.diff(k.s, t.s);
      if (ds > 2 && ds < look && Math.abs(t.d - k.d) < 2.6) return t.d;
    }
    return null;
  }

  // CPU item brains
  function aiUse(k, r, dt) {
    const inp = k.input;
    k.ai.itemT -= dt;
    inp.item = false;
    if (k.dragged) {
      // drop it when someone is right behind (or after a while)
      const behind = r.karts.some((o) => o !== k && track.diff(o.s, k.s) > 1 && track.diff(o.s, k.s) < 14 && Math.abs(o.d - k.d) < 3);
      if (behind || k.ai.itemT < -6) { inp.item = false; k.aiThrowFwd = false; return; }
      inp.item = true; return;
    }
    if (!k.item || k.roulette > 0 || k.ai.itemT > 0) return;
    const id = k.item;
    const ahead = targetAhead(k);
    const gapAhead = !ahead ? 999 : track.isArena ? Math.hypot(ahead.s - k.s, ahead.d - k.d) : (track.diff(k.s, ahead.s) + track.length) % track.length;
    const inLine = ahead && (track.isArena ? Math.abs(U.angleDiff(k.yaw, Math.atan2(ahead.d - k.d, ahead.s - k.s))) < 0.25 : Math.abs(ahead.d - k.d) < 2.5);
    let use = false;
    if (id === 'turbo' || id === 'goldturbo') use = Math.abs(track.K[track.idx(k.s + 20)]) < 0.01 || k.offroad;
    else if (id === 'rocket') use = ahead && gapAhead < 80;
    else if (id === 'orb') use = ahead && gapAhead < 30 && inLine;
    else if (id === 'banana' || id === 'mine') { use = true; }
    else if (id === 'horn') use = !!heli || things.some((t) => (t.type === 'rocket' || t.type === 'orb') && Math.abs(track.diff(k.s, t.s)) < 18);
    else if (id === 'fbi' || id === 'emp' || id === 'smoke') use = k.place > 1;
    else use = true;
    if (k.orbiting && (id === 'banana')) use = r.karts.some((o) => o !== k && track.diff(o.s, k.s) > 1 && track.diff(o.s, k.s) < 12);
    if (k.ai.itemT < -8) use = true;
    if (use) { inp.item = true; k.ai.itemT = U.rand(0.4, 1.4) / (k.ai.skill + 0.3); }
  }

  function mapMarks(g, r, mp) {
    for (const t of things) {
      if (t.type !== 'rocket' && t.type !== 'orb') continue;
      const [x, y] = mp(t);
      g.fillStyle = t.type === 'rocket' ? '#ff3030' : '#30ff60';
      g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill();
    }
    if (heli) { const [x, y] = mp(heli); g.fillStyle = '#2040ff'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); g.stroke(); }
  }

  return {
    ITEMS, setup, build, update, animate, hudItem, dangerAhead, aiUse, mapMarks, give, useInstant, throwItem,
    get things() { return things; }, get boxes() { return boxes; }, get heli() { return heli; }, model,
    fr: HG.Track.makeFrame(),
  };
})();
