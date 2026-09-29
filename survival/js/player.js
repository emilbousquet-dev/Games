// ============================================================
//  DEAD ACRES — YOU (and your friends)
//  Walking, jumping, swimming, hunger, thirst, hitting things,
//  your hands on the screen, and the bodies of other players.
// ============================================================
window.DA = window.DA || {};

DA.Player = (function () {
  const U = DA.U, C = DA.Collide, Mo = DA.Models, Inv = DA.Inv, ITEMS = DA.ITEMS;
  let W, A, FX, Z, G, scene, cam;

  const R = 0.32;            // body width (radius)
  const EYE = 1.62, EYE_CROUCH = 1.1;
  const WALK = 4.3, RUN = 7.0, CROUCH = 2.0, SWIM = 2.4;
  const HUNGER = 100 / (22 * 60), THIRST = 100 / (16 * 60);

  const me = {
    x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0,
    hp: 100, maxHp: 100, xp: 0, level: 1, food: 80, water: 80, stamina: 100, alive: true,
    onGround: true, inWater: false, swimming: false, crouch: false, sprinting: false,
    eye: EYE, bob: 0, stepT: 0, swingT: 0, swingDur: 0, swingHit: false, useT: 0, drawT: 0,
    noiseT: 0, hurtT: 0, staminaDelay: 0, fallV: 0, shake: 0, flags: 0, lastGround: 'grass',
    target: null, buildTurn: 0, bed: null, starveT: 0, kills: 0, lightOn: false,
  };

  // ============================================================
  //  HANDS ON THE SCREEN
  // ============================================================
  const vm = {};
  function buildViewmodel() {
    vm.scene = new THREE.Scene();
    vm.cam = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
    vm.hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 1);
    vm.dir = new THREE.DirectionalLight(0xffffff, 1); vm.dir.position.set(1, 2, 1);
    vm.fire = new THREE.PointLight(0xffa040, 0, 3, 1);
    vm.fire.position.set(0.3, 0, -0.5);
    vm.scene.add(vm.hemi, vm.dir, vm.fire);
    const color = Mo.People.PLAYER_COLORS[G.myColor % 4];
    const arm = (side) => {
      const g = new THREE.Group();
      const k = Mo.kit();
      k.box(0.085, 0.085, 0.42, color, 0, 0, 0.17);
      k.box(0.075, 0.07, 0.1, 0xe0b090, 0, 0, -0.08);
      k.box(0.025, 0.025, 0.06, 0xe0b090, side * 0.03, 0.025, -0.11);
      const m = k.mesh(); m.castShadow = false;
      g.add(m);
      vm.scene.add(g);
      return g;
    };
    vm.right = arm(1); vm.left = arm(-1);
    vm.hold = new THREE.Group(); // the item goes here
    vm.right.add(vm.hold);
    vm.hold.position.set(0, 0.02, -0.1);
    vm.itemId = null;
    vm.flame = new THREE.Group();
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 6), Mo.M.fire());
    f.position.y = 0.42; vm.flame.add(f);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: DA.Tex.glow(), color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }));
    glow.scale.setScalar(0.5); glow.position.y = 0.42; vm.flame.add(glow);
  }

  function setHeldModel(id) {
    if (vm.itemId === id) return;
    vm.itemId = id;
    vm.hold.clear();
    if (!id) return;
    const d = ITEMS[id];
    const m = Mo.Items.make(id);
    m.castShadow = false;
    const g = new THREE.Group(); g.add(m);
    if (['stoneaxe', 'pickaxe', 'metalaxe', 'bat', 'machete'].includes(id)) { g.rotation.set(-0.35, 0, 0.1); g.scale.setScalar(0.62); }
    else if (id === 'spear') { g.rotation.set(-1.45, 0, 0); g.position.set(0, 0, 0.3); g.scale.setScalar(0.7); }
    else if (id === 'torch' || id === 'flashlight') { g.rotation.set(-0.6, 0, 0); g.scale.setScalar(0.65); if (id === 'torch') g.add(vm.flame); }
    else if (id === 'bow') { g.rotation.set(0, Math.PI / 2, 0.1); g.scale.setScalar(0.55); }
    else if (d && d.kind === 'throw') { g.scale.setScalar(0.3); g.rotation.set(0.2, 0.3, -0.3); g.position.set(0, 0.04, -0.04); }
    else if (d && d.kind === 'build') { g.scale.setScalar(0.4); g.rotation.set(0.3, 0.5, 0); g.position.set(0, 0.06, -0.04); }
    else { g.scale.setScalar(0.42); g.rotation.set(0.3, 0.5, 0); g.position.set(0, 0.06, -0.04); }
    vm.hold.add(g);
  }

  function updateViewmodel(dt, inp) {
    const s = Inv.held();
    const id = s ? s.id : null;
    const d = id ? ITEMS[id] : null;
    setHeldModel(id);
    const w = vm.cam;
    w.aspect = cam.aspect; w.updateProjectionMatrix();
    // walking sway
    const sp = Math.hypot(me.vx, me.vz);
    const bx = Math.sin(me.bob) * 0.012 * Math.min(1, sp / 4), by = Math.abs(Math.cos(me.bob)) * 0.015 * Math.min(1, sp / 4);
    let rx = 0.3 + bx, ry = -0.3 - by, rz = -0.58;
    let rotX = 0, rotY = 0.1, rotZ = 0;
    let lx = -0.3 + bx, ly = -0.42 - by, lz = -0.58, lRotX = 0.2;
    const leftShow = id === 'bow';
    // swinging
    if (me.swingT > 0) {
      const t = 1 - me.swingT / me.swingDur;
      const up = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
      const k = Math.sin(up * Math.PI * 0.5);
      if (!id || d.kind === 'food' || d.kind === 'med' || d.kind === 'mat' || d.kind === 'special') { rz -= k * 0.25; ry += k * 0.08; rx -= k * 0.1; } // punch
      else if (id === 'spear') { rz -= k * 0.45; }
      else { rotX = -k * 1.4 + 0.5 * (t < 0.35 ? 0 : 1) * (1 - k); rotZ = k * 0.3; ry += k * 0.15; rz += k * 0.05; rx -= k * 0.1; }
    }
    // eating
    if (me.useT > 0) { const k = Math.min(1, me.useT * 4); rx -= 0.25 * k; ry += 0.12 * k + Math.sin(me.useT * 25) * 0.01 * k; rz += 0.2 * k; rotX = 0.4 * k; }
    // bow
    if (id === 'bow') {
      const k = Math.min(1, me.drawT / 0.6);
      lx = -0.05; ly = -0.18; lz = -0.55; lRotX = 0;
      rx = 0.05 + (1 - k) * 0.05; ry = -0.2; rz = -0.5 + k * 0.25;
      vm.left.add(vm.hold); vm.hold.position.set(0, 0.03, -0.18);
    } else if (vm.hold.parent !== vm.right) { vm.right.add(vm.hold); vm.hold.position.set(0, 0.02, -0.1); }
    if (!id) { rotX = rotX; }
    vm.right.position.set(rx, ry, rz);
    vm.right.rotation.set(rotX, rotY, rotZ);
    vm.left.position.set(lx, ly, lz);
    vm.left.rotation.set(lRotX, -0.15, 0);
    vm.left.visible = leftShow || !id || (me.swingT > 0 && !id);
    if (!id && !leftShow) { vm.left.visible = true; vm.left.position.y -= 0.12; }
    // light on the hands matches the world
    const dark = W.darkness(G.hour);
    vm.hemi.intensity = W.hemi.intensity * 1.2 + 0.05;
    vm.dir.intensity = W.sun.intensity * 0.5;
    vm.fire.intensity = id === 'torch' ? 3 + Math.random() * 0.6 : 0;
    if (vm.flame.parent) vm.flame.children[0].scale.y = 0.8 + Math.random() * 0.4;
    void dark;
  }

  // ============================================================
  //  MOVING AROUND
  // ============================================================
  function groundInfo() {
    const t = W.groundType(me.x, me.z);
    if (me.onFloor) return 'wood';
    return ['grass', 'road', 'sand', 'sand', 'water', 'road', 'grass', 'rock'][t] || 'grass';
  }

  function move(dt, inp) {
    // looking
    me.yaw -= inp.lookX;
    me.pitch = U.clamp(me.pitch - inp.lookY, -1.5, 1.5);
    const water = W.WATER;
    const th = W.heightAt(me.x, me.z);
    const depth = water - th;
    me.inWater = depth > 0.25 && me.y < water;
    me.swimming = depth > 1.25 && me.y < water - 0.9;
    me.crouch = inp.crouch && !me.swimming;
    const eyeT = me.crouch ? EYE_CROUCH : EYE;
    me.eye += (eyeT - me.eye) * Math.min(1, dt * 10);
    // speed
    const wantRun = inp.sprint && inp.move > 0 && !me.crouch && me.stamina > 1 && !me.swimming;
    let speed = me.swimming ? SWIM : me.crouch ? CROUCH : wantRun ? RUN : WALK;
    if (me.inWater && !me.swimming) speed *= 0.7;
    if (me.useT > 0) speed *= 0.5;
    if (me.drawT > 0) speed *= 0.55;
    if (me.food <= 0 || me.water <= 0) speed *= 0.85;
    me.sprinting = wantRun && (inp.move || inp.strafe);
    const fx = -Math.sin(me.yaw), fz = -Math.cos(me.yaw);
    const rx = Math.cos(me.yaw), rz = -Math.sin(me.yaw);
    let mx = fx * inp.move + rx * inp.strafe, mz = fz * inp.move + rz * inp.strafe;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    const acc = me.onGround || me.swimming ? 14 : 3;
    me.vx += (mx * speed - me.vx) * Math.min(1, dt * acc);
    me.vz += (mz * speed - me.vz) * Math.min(1, dt * acc);
    // jumping + falling
    if (me.swimming) {
      const surf = water - 1.35;
      me.vy += (surf - me.y) * dt * 6 - me.vy * dt * 3;
      if (inp.jump) me.vy = Math.max(me.vy, 2.2);
      me.onGround = false;
    } else {
      me.vy -= 22 * dt;
      if (inp.jump && me.onGround && me.stamina > 5) { me.vy = 7.2; me.onGround = false; me.stamina -= 6; me.staminaDelay = 0.8; A.jump(); }
    }
    let nx = me.x + me.vx * dt, nz = me.z + me.vz * dt, ny = me.y + me.vy * dt;
    const head = ny + (me.crouch ? 1.2 : 1.8);
    [nx, nz] = C.resolve(nx, nz, R, ny, head);
    if (!W.inside(nx, nz)) { nx = me.x; nz = me.z; }
    // what are we standing on?
    const tg = W.heightAt(nx, nz);
    const cg = C.groundAt(nx, nz, R, me.y);
    me.onFloor = cg > tg + 0.05;
    const ground = Math.max(tg, cg);
    if (ny <= ground) {
      if (!me.onGround && me.vy < -3) {
        A.land(Math.min(1, -me.vy / 12));
        if (me.vy < -13) hurt(Math.round((-me.vy - 13) * 6), null, null, 'fall');
        me.stepT = 0;
      }
      ny = ground; me.vy = 0; me.onGround = true;
    } else if (ny > ground + 0.08) me.onGround = me.swimming ? false : (me.onGround && ny - ground < 0.4 && me.vy <= 0 ? (ny = ground, me.vy = 0, true) : false);
    // bumping your head
    if (me.vy > 0) {
      let ceiling = false;
      C.near(nx, nz, R, (o) => { if (o.solid && o.y0 > me.y + 1 && o.y0 < ny + 1.85 && C.pushOut(o, nx, nz, R * 0.8)) ceiling = true; });
      if (ceiling) { me.vy = 0; ny = me.y; }
    }
    me.x = nx; me.y = ny; me.z = nz;
    // footsteps
    const sp = Math.hypot(me.vx, me.vz);
    if ((me.onGround || me.swimming) && sp > 0.5) {
      me.bob += dt * sp * 2.2;
      me.stepT -= dt * sp;
      if (me.stepT <= 0) {
        me.stepT = me.sprinting ? 2.6 : 2.0;
        const gtype = me.inWater ? 'water' : groundInfo();
        A.step(gtype, me.crouch ? 0.4 : me.sprinting ? 1.2 : 0.9);
        if (me.inWater && Math.random() < 0.5) FX.splash(me.x, W.WATER, me.z);
      }
    }
    // stamina
    if (me.sprinting && sp > 1) { me.stamina -= 16 * dt; me.staminaDelay = 1; }
    me.staminaDelay -= dt;
    if (me.staminaDelay <= 0) me.stamina = Math.min(100, me.stamina + 24 * dt);
    me.stamina = Math.max(0, me.stamina);
  }

  // ============================================================
  //  WHAT AM I LOOKING AT?
  // ============================================================
  const eyePos = new THREE.Vector3(), lookDir = new THREE.Vector3();
  function findTarget() {
    cam.getWorldPosition(eyePos);
    cam.getWorldDirection(lookDir);
    const REACH = 2.9;
    const hit = C.ray(eyePos.x, eyePos.y, eyePos.z, lookDir.x, lookDir.y, lookDir.z, REACH, (o) => o.kind !== 'fence' && o.kind !== 'floor');
    const z = Z.rayTarget(eyePos.x, eyePos.y, eyePos.z, lookDir.x, lookDir.y, lookDir.z, hit ? hit.d : REACH);
    let t = null;
    const dog = DA.Dogs.rayTarget(eyePos.x, eyePos.y, eyePos.z, lookDir.x, lookDir.y, lookDir.z, Math.min(z ? z.d : REACH, hit ? hit.d : REACH));
    if (dog) t = { kind: 'dog', dog: dog.d, d: dog.dist };
    else if (z) t = { kind: z.isAnimal ? 'animal' : 'zombie', e: z.e, d: z.d };
    else if (hit) t = { kind: hit.o.kind, o: hit.o, ref: hit.o.ref, d: hit.d };
    // water under us or in front
    if (!t || t.d > 1.5) {
      if (me.inWater) t = t || { kind: 'water', d: 1 };
      else if (lookDir.y < -0.2) {
        const d = (eyePos.y - W.WATER) / -lookDir.y;
        if (d < REACH + 0.8) {
          const wx = eyePos.x + lookDir.x * d, wz = eyePos.z + lookDir.z * d;
          if (W.heightAt(wx, wz) < W.WATER - 0.15 && (!t || d < t.d)) t = { kind: 'water', d };
        }
      }
    }
    // other players (to see their names / revive later)
    me.target = t;
    return t;
  }

  // the text telling you what E does here
  function promptFor(t) {
    if (!t) return '';
    const s = Inv.held(), held = s && s.id;
    const B = DA.Build;
    switch (t.kind) {
      case 'container': return `[E] Search ${t.ref.name}`;
      case 'drop': return '[E] Open the SUPPLY CRATE!';
      case 'dog': {
        const dg = t.dog;
        if (!dg.owner) return `[E] Make friends with ${dg.name} 🐕`;
        if (dg.owner === G.myName) return `[E] ${dg.name}: ${dg.sit ? 'come, follow me!' : 'sit and stay'}`;
        return `${dg.name} (${dg.owner}'s dog)`;
      }
      case 'bush': return G.state.gone.bush[t.ref.id] !== undefined || !t.ref.berries ? '' : '[E] Pick berries';
      case 'water': return held === 'bottle' ? '[E] Fill bottle' : '[E] Drink water';
      case 'radio': {
        const r = G.state.radio;
        if (r.fixed) return 'The radio is fixed. Survive until the helicopter comes!';
        return `[E] Fix the radio (${r.parts}/3 parts)` + (Inv.count('radiopart') ? ` - you have ${Inv.count('radiopart')}` : '');
      }
      case 'bag': return `[E] Open ${t.ref.owner ? t.ref.owner + '\'s' : 'a'} backpack`;
      case 'heli': return '[E] GET IN THE HELICOPTER!';
      case 'build': case 'spikes': {
        const b = t.ref, T = B.TYPES[b.type];
        const hurt = b.hp < T.hp * 0.95;
        let p = '';
        if (b.type === 'door') p = `[E] ${b.open ? 'Close' : 'Open'} door`;
        else if (b.type === 'box') p = '[E] Open storage box';
        else if (b.type === 'bed') p = b.owner === G.myName ? 'Your bed (you wake up here)' : '[E] Sleep here (set your wake up spot)';
        else if (b.type === 'campfire') p = Inv.count('rawmeat') ? '[E] Cook raw meat' : 'Campfire';
        else if (hurt && T.repair) p = `[E] Repair (${T.repair[1]} ${ITEMS[T.repair[0]].name})`;
        else p = T.name;
        if (hurt && T.repair && b.type === 'door') p += ` | [R] Repair`;
        return p + `  <small>${Math.ceil(b.hp)}/${T.hp}  [hold R] pick up</small>`;
      }
      default: return '';
    }
  }

  // ============================================================
  //  USING THINGS (E)
  // ============================================================
  function interact(t) {
    const s = Inv.held(), held = s && s.id;
    if (!t) return;
    switch (t.kind) {
      case 'container': G.openContainer('c' + t.ref.id, t.ref.name); A.loot(t.ref.x, t.ref.z); break;
      case 'drop': G.openContainer('d' + t.ref.id, 'Supply crate'); A.loot(t.ref.x, t.ref.z); break;
      case 'dog': G.act({ t: 'dog', i: t.dog.i }); break;
      case 'bag': G.openContainer('g' + t.ref.id, (t.ref.owner || 'Someone') + '\'s backpack'); A.loot(t.ref.x, t.ref.z); break;
      case 'bush':
        if (t.ref.berries && G.state.gone.bush[t.ref.id] === undefined) { G.act({ t: 'pick', id: t.ref.id }); FX.berries(t.ref.x, W.heightAt(t.ref.x, t.ref.z) + 0.6, t.ref.z); A.pickup(); }
        break;
      case 'water':
        if (held === 'bottle') { Inv.removeAt(Inv.sel, 1); Inv.add('water', 1); A.splash(me.x, me.z); G.msg('Filled a water bottle'); }
        else { me.water = Math.min(100, me.water + 20); A.drink(); if (Math.random() < 0.08) { me.hp -= 4; G.msg('Yuck... that water was dirty.', '#fa4'); } }
        break;
      case 'radio': {
        const n = Inv.count('radiopart');
        if (G.state.radio.fixed) break;
        if (!n) { G.msg('The radio is broken. Find 3 RADIO PARTS in the town, the police station, the gas station or the hunter\'s cabin.', '#fd6'); A.error(); break; }
        Inv.remove('radiopart', n);
        G.act({ t: 'radio', n });
        A.radio();
        break;
      }
      case 'heli': G.act({ t: 'board' }); break;
      case 'build': case 'spikes': {
        const b = t.ref, T = DA.Build.TYPES[b.type];
        if (b.type === 'door') { G.act({ t: 'door', id: b.id }); break; }
        if (b.type === 'box') { G.openContainer('b' + b.id, 'Storage Box'); break; }
        if (b.type === 'bed') { if (b.owner !== G.myName) G.act({ t: 'claimBed', id: b.id }); G.msg('You will wake up in this bed if you die.'); break; }
        if (b.type === 'campfire') {
          const n = Inv.count('rawmeat');
          if (n) { Inv.remove('rawmeat', n); Inv.add('meat', n); A.craft(); FX.smoke(b.x, b.y + 1, b.z); G.msg(`Cooked ${n} meat!`); }
          break;
        }
        if (T.repair && b.hp < T.hp * 0.95) repair(b);
        break;
      }
    }
  }
  function repair(b) {
    const T = DA.Build.TYPES[b.type];
    const [id, n] = T.repair;
    if (Inv.count(id) < n) { G.msg(`You need ${n} ${ITEMS[id].name} to repair this.`, '#fa4'); A.error(); return; }
    Inv.remove(id, n);
    G.act({ t: 'repair', id: b.id });
    A.build(b.x, b.z);
  }

  // ============================================================
  //  HITTING THINGS (left click)
  // ============================================================
  function startSwing() {
    const d = Inv.heldDef();
    const speed = d && d.speed ? d.speed : 0.45;
    me.swingDur = speed * (me.stamina < 5 ? 1.5 : 1);
    me.swingT = me.swingDur; me.swingHit = false;
    me.stamina = Math.max(0, me.stamina - 4); me.staminaDelay = 0.6;
    me.noiseT = 1;
    A.swing();
  }
  function doHit() {
    const s = Inv.held(), d = s ? ITEMS[s.id] : null;
    const tool = d && (d.kind === 'tool' || d.kind === 'weapon' || d.kind === 'light') && !d.ranged ? d : null;
    const dmg = Math.round((tool ? tool.dmg : 7) * dmgMult());
    const reach = tool ? tool.reach : 2.1;
    cam.getWorldPosition(eyePos); cam.getWorldDirection(lookDir);
    const hit = C.ray(eyePos.x, eyePos.y, eyePos.z, lookDir.x, lookDir.y, lookDir.z, reach, (o) => o.kind !== 'fence' && o.kind !== 'bush' && o.kind !== 'floor');
    const z = Z.rayTarget(eyePos.x, eyePos.y, eyePos.z, lookDir.x, lookDir.y, lookDir.z, hit ? hit.d : reach + 0.3);
    const px = eyePos.x + lookDir.x, py = eyePos.y + lookDir.y, pz = eyePos.z + lookDir.z;
    if (z) {
      const e = z.e, pos = e.avatar.root.position;
      const hx = eyePos.x + lookDir.x * z.d, hy = eyePos.y + lookDir.y * z.d, hz = eyePos.z + lookDir.z * z.d;
      FX.blood(hx, hy, hz);
      A.hitFlesh(hx, hz);
      DA.HUD.floatText(hx, hy + 0.3, hz, '-' + dmg, '#ff7050');
      DA.HUD.hitMarker();
      const kx = lookDir.x, kz = lookDir.z;
      const push = s && s.id === 'bat' ? 1.6 : 1;
      if (z.isAnimal) G.act({ t: 'hitA', id: e.id, dmg });
      else G.act({ t: 'hitZ', id: e.id, dmg, kx: kx * push, kz: kz * push });
      G.fx('hitZ', hx, hy, hz);
      me.shake = 0.12;
      DA.Input.rumble(0.4, 80);
      void pos;
      return;
    }
    if (!hit) return;
    const o = hit.o;
    const hx = eyePos.x + lookDir.x * hit.d, hy = eyePos.y + lookDir.y * hit.d, hz = eyePos.z + lookDir.z * hit.d;
    if (o.kind === 'tree') {
      const power = (tool ? tool.wood || 1 : 1) + gatherBonus();
      FX.wood(hx, hy, hz); if (Math.random() < 0.5) FX.leaves(o.x, hy + 3, o.z);
      A.hitWood(hx, hz);
      G.act({ t: 'hitRes', kind: 'tree', id: o.ref.id, power, fx: me.x, fz: me.z });
      G.fx('wood', hx, hy, hz);
      me.shake = 0.05;
    } else if (o.kind === 'rock') {
      const power = (tool ? tool.stone || 1 : 1) + gatherBonus();
      FX.rock(hx, hy, hz); A.hitRock(hx, hz);
      G.act({ t: 'hitRes', kind: 'rock', id: o.ref.id, power });
      G.fx('rock', hx, hy, hz);
      me.shake = 0.05;
    } else if (o.kind === 'build' || o.kind === 'spikes') {
      A.hitBuild(hx, hz);
    } else {
      A.hitWood(hx, hz);
      FX.dust(hx, hy, hz, 3);
    }
    void px; void py; void pz;
  }

  // shoot an arrow
  function shoot(power) {
    if (!Inv.count('arrow')) { G.msg('No arrows! Craft some (2 wood + 1 stone).', '#fa4'); A.error(); return; }
    Inv.remove('arrow', 1);
    cam.getWorldPosition(eyePos); cam.getWorldDirection(lookDir);
    const speed = 22 + 40 * power;
    const dmg = Math.round(ITEMS.bow.dmg * (0.35 + 0.65 * power) * dmgMult());
    A.bowShoot();
    me.noiseT = 0.5;
    const fire = (ox, oy, oz, dx, dy, dz, L) => {
      const z = Z.rayTarget(ox, oy, oz, dx, dy, dz, L);
      const h = C.ray(ox, oy, oz, dx, dy, dz, L, (o) => o.solid && o.kind !== 'floor' && o.kind !== 'fence');
      if (z && (!h || z.d < h.d)) {
        const e = z.e;
        if (z.isAnimal) G.act({ t: 'hitA', id: e.id, dmg });
        else G.act({ t: 'hitZ', id: e.id, dmg, kx: dx * 0.5, kz: dz * 0.5 });
        FX.blood(ox + dx * z.d, oy + dy * z.d, oz + dz * z.d);
        A.hitFlesh(ox, oz);
        DA.HUD.floatText(ox + dx * z.d, oy + dy * z.d + 0.3, oz + dz * z.d, '-' + dmg, '#ff7050');
        DA.HUD.hitMarker();
        return { t: z.d / L, gone: true };
      }
      if (h) { A.arrowHit(ox, oz); return { t: h.d / L }; }
      return null;
    };
    FX.arrow(eyePos.x + lookDir.x * 0.5, eyePos.y + lookDir.y * 0.5 - 0.05, eyePos.z + lookDir.z * 0.5, lookDir.x, lookDir.y, lookDir.z, speed, fire);
    G.act({ t: 'arrowFx', x: U.round(eyePos.x), y: U.round(eyePos.y), z: U.round(eyePos.z), dx: U.round(lookDir.x, 1000), dy: U.round(lookDir.y, 1000), dz: U.round(lookDir.z, 1000), s: speed });
  }

  // eat / drink / heal
  function consume(i) {
    const s = Inv.slots[i];
    if (!s) return false;
    const d = ITEMS[s.id];
    if (!d || (d.kind !== 'food' && d.kind !== 'med')) return false;
    Inv.removeAt(i, 1);
    if (d.food) me.food = U.clamp(me.food + d.food, 0, 100);
    if (d.water) me.water = U.clamp(me.water + d.water, 0, 100);
    if (d.hp) { if (d.hp < 0) hurt(-d.hp, null, null, 'food'); else me.hp = Math.min(me.maxHp, me.hp + d.hp); }
    if (d.empty && Inv.add(d.empty, 1) > 0) G.dropItems([[d.empty, 1]]);
    if (d.kind === 'med') A.heal(); else if (d.water > d.food || !d.food) A.drink(); else A.eat();
    if (s.id === 'rawmeat') G.msg('Raw meat made you sick! Cook it on a campfire.', '#fa4');
    return true;
  }

  // ============================================================
  //  EXPERIENCE AND LEVELS
  //  Every level: +10 max health and you hit 6% harder.
  //  Every 3 levels: you get 1 more wood / stone per hit.
  // ============================================================
  const xpForLevel = (lv) => 40 + lv * 35;          // XP needed to go from lv to lv+1
  const dmgMult = () => 1 + (me.level - 1) * 0.06;
  const gatherBonus = () => Math.floor((me.level - 1) / 3);
  function setLevel(lv, xp) {
    me.level = Math.max(1, lv | 0); me.xp = Math.max(0, xp | 0);
    me.maxHp = 100 + (me.level - 1) * 10;
    me.hp = Math.min(me.hp, me.maxHp);
  }
  function addXp(n, why) {
    if (!n || !me.alive) return;
    me.xp += n;
    DA.HUD.popup(`+${n} XP${why ? ' · ' + why : ''}`, '#c8d860');
    A.xp();
    while (me.xp >= xpForLevel(me.level)) {
      me.xp -= xpForLevel(me.level);
      me.level++;
      me.maxHp = 100 + (me.level - 1) * 10;
      me.hp = me.maxHp; // a level up heals you!
      A.levelUp();
      const perk = me.level % 3 === 1 ? 'You chop and mine faster!' : 'More health, stronger hits!';
      DA.HUD.banner(`LEVEL ${me.level}!`, `${perk} (max health ${me.maxHp})`, '#c8d860', 4);
      G.levelUp(me.level);
    }
  }

  // ============================================================
  //  THROWING (firecrackers)
  // ============================================================
  function throwHeld() {
    const s = Inv.held();
    if (!s) return;
    Inv.removeAt(Inv.sel, 1);
    eyePos.set(me.x, me.y + me.eye, me.z);
    lookDir.set(-Math.sin(me.yaw) * Math.cos(me.pitch), Math.sin(me.pitch), -Math.cos(me.yaw) * Math.cos(me.pitch));
    const p = 13;
    G.act({ t: 'throw', x: U.round(eyePos.x + lookDir.x * 0.6), y: U.round(eyePos.y + lookDir.y * 0.6 - 0.1), z: U.round(eyePos.z + lookDir.z * 0.6), vx: U.round(lookDir.x * p + me.vx * 0.5), vy: U.round(lookDir.y * p + 3.5), vz: U.round(lookDir.z * p + me.vz * 0.5) });
    A.throwIt();
    me.swingDur = 0.45; me.swingT = 0.45; me.swingHit = true;
  }

  // ============================================================
  //  BUILD MODE: holding something you can place
  // ============================================================
  let buildSnap = null, buildErr = '';
  function updateBuild(inp) {
    const d = Inv.heldDef();
    if (!d || d.kind !== 'build' || !me.alive) { DA.Build.showGhost(null); buildSnap = null; return; }
    if (inp.rotatePressed) { me.buildTurn++; A.click(); }
    cam.getWorldPosition(eyePos); cam.getWorldDirection(lookDir);
    // find the ground in front of you
    let px = null, py, pz;
    for (let t = 0.5; t <= 7; t += 0.1) {
      const x = eyePos.x + lookDir.x * t, y = eyePos.y + lookDir.y * t, z = eyePos.z + lookDir.z * t;
      const g = Math.max(W.heightAt(x, z), DA.Build.floorTopAt(x, z) ?? -1e9);
      if (y <= g) { px = x; py = g; pz = z; break; }
    }
    if (px === null) { const t = 4; px = eyePos.x + lookDir.x * t; pz = eyePos.z + lookDir.z * t; py = W.heightAt(px, pz); }
    const s = DA.Build.snap(d.build, px, py, pz, me.yaw, me.buildTurn);
    buildErr = DA.Build.check(s, me.x, me.z);
    if (U.dist(s.x, s.z, me.x, me.z) > 7) buildErr = 'Too far away';
    buildSnap = s;
    DA.Build.showGhost(s, !buildErr);
  }
  function placeBuild() {
    if (!buildSnap) return;
    if (buildErr) { G.msg(buildErr, '#f84'); A.error(); return; }
    const held = Inv.held();
    const item = held ? held.id : null;
    Inv.removeAt(Inv.sel, 1);
    const s = buildSnap;
    G.act({ t: 'build', b: { type: s.type, x: U.round(s.x), y: U.round(s.y), z: U.round(s.z), rot: U.round(s.rot, 1000), bottom: s.bottom !== undefined ? U.round(s.bottom) : undefined }, item });
    A.build(s.x, s.z);
    FX.dust(s.x, s.y + 0.2, s.z, 12);
    addXp(2);
  }

  // ============================================================
  //  EVERY FRAME
  // ============================================================
  let pickupT = 0;
  function update(dt, inp, uiOpen) {
    if (!me.alive) { me.flags = 8; return; }
    if (uiOpen) inp = Object.assign({}, inp, { move: 0, strafe: 0, lookX: 0, lookY: 0, jump: false, attack: false, attackPressed: false, usePressed: false, aim: false });
    // hotbar
    if (inp.slot >= 0) { Inv.sel = inp.slot; Inv.changed(); A.click(); me.drawT = 0; }
    if (inp.wheel) { Inv.sel = (Inv.sel + (inp.wheel > 0 ? 1 : -1) + Inv.HOT) % Inv.HOT; Inv.changed(); me.drawT = 0; }
    move(dt, inp);
    const t = findTarget();
    me.prompt = promptFor(t);
    const s = Inv.held(), d = s ? ITEMS[s.id] : null;
    if (inp.usePressed && !uiOpen) interact(t);
    // pick up / repair builds with R (not in build mode)
    if (!d || d.kind !== 'build') {
      if (DA.Input.isDown('KeyR') && t && (t.kind === 'build' || t.kind === 'spikes') && !uiOpen) {
        pickupT += dt;
        me.pickupProgress = pickupT / 1.2;
        if (pickupT > 1.2) { G.act({ t: 'demolish', id: t.ref.id }); pickupT = 0; A.build(t.ref.x, t.ref.z); }
      } else { pickupT = 0; me.pickupProgress = 0; }
    }
    // the item in your hand
    me.swingT = Math.max(0, me.swingT - dt);
    if (d && d.ranged) {
      if (inp.attack && Inv.count('arrow')) { if (me.drawT === 0) A.bowDraw(); me.drawT += dt; }
      else if (me.drawT > 0) { if (me.drawT > 0.15) shoot(Math.min(1, me.drawT / 0.9)); me.drawT = 0; }
      else if (inp.attackPressed && !Inv.count('arrow')) shoot(0);
    } else me.drawT = 0;
    if (d && (d.kind === 'food' || d.kind === 'med')) {
      if (inp.attack) { me.useT += dt; if (me.useT > (d.kind === 'med' ? 1.2 : 0.8)) { consume(Inv.sel); me.useT = 0; } }
      else me.useT = 0;
    } else me.useT = 0;
    if (d && d.kind === 'throw') { if (inp.attackPressed && me.swingT <= 0) throwHeld(); }
    else if (d && d.kind === 'build') { updateBuild(inp); if (inp.attackPressed) placeBuild(); }
    else if (!(d && d.ranged) && !(d && (d.kind === 'food' || d.kind === 'med')) && inp.attack && me.swingT <= 0) startSwing();
    if (me.swingT > 0 && !me.swingHit && me.swingT < me.swingDur * 0.6) { me.swingHit = true; doHit(); }
    if (!d || d.kind !== 'build') updateBuild(inp);
    // hunger and thirst
    const mult = me.sprinting ? 1.6 : 1;
    me.food = Math.max(0, me.food - HUNGER * mult * dt);
    me.water = Math.max(0, me.water - THIRST * mult * dt);
    if (me.food <= 0 || me.water <= 0) {
      me.starveT += dt;
      if (me.starveT > 2) { me.starveT = 0; hurt((me.food <= 0 ? 2 : 0) + (me.water <= 0 ? 2 : 0), null, null, 'starve'); }
    } else if (me.food > 50 && me.water > 50 && me.hp < me.maxHp) me.hp = Math.min(me.maxHp, me.hp + dt * 0.35);
    me.noiseT -= dt; me.hurtT -= dt;
    me.lightOn = !!(d && d.light);
    me.flags = (me.sprinting ? 1 : 0) | (me.noiseT > 0 ? 2 : 0) | (me.lightOn && W.darkness(G.hour) > 0.4 ? 4 : 0) | (me.crouch ? 16 : 0) | (me.swingT > 0 ? 32 : 0) | (me.useT > 0 ? 64 : 0) | (me.drawT > 0 ? 128 : 0);
    // camera
    me.shake = Math.max(0, me.shake - dt);
    cam.position.set(me.x, me.y + me.eye + (me.onGround ? Math.abs(Math.sin(me.bob)) * 0.04 * Math.min(1, Math.hypot(me.vx, me.vz) / 5) : 0), me.z);
    cam.rotation.set(me.pitch + (Math.random() - 0.5) * me.shake * 0.3, me.yaw + (Math.random() - 0.5) * me.shake * 0.3, 0, 'YXZ');
    updateViewmodel(dt, inp);
    A.setListener(me.x, me.z, me.yaw);
  }

  function hurt(dmg, fx, fz, why) {
    if (!me.alive || dmg <= 0) return;
    me.hp -= dmg;
    me.hurtT = 0.4;
    me.shake = Math.min(0.5, 0.15 + dmg / 60);
    A.hurt();
    DA.Input.rumble(0.8, 250);
    if (fx !== null && fx !== undefined) { // knocked back
      const dx = me.x - fx, dz = me.z - fz, d = Math.hypot(dx, dz) || 1;
      me.vx += dx / d * (why === 'brute' ? 9 : 3); me.vz += dz / d * (why === 'brute' ? 9 : 3);
      if (why === 'brute') me.vy = 4;
    }
    if (G.onHurt) G.onHurt(dmg, fx, fz);
    if (me.hp <= 0) { me.hp = 0; G.playerDied(why); }
  }

  function spawnAt(x, z, y) {
    me.x = x; me.z = z;
    me.y = y ?? Math.max(W.heightAt(x, z), C.groundAt(x, z, R, 999));
    me.vx = me.vy = me.vz = 0;
    me.alive = true;
    me.onGround = true;
  }

  // ============================================================
  //  OTHER PLAYERS (what you see of your friends)
  // ============================================================
  class Remote {
    constructor(pid, name, color) {
      this.pid = pid; this.name = name; this.color = color;
      const h = Mo.People.survivor(color, color);
      this.p = h; this.root = h.root;
      scene.add(this.root);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: DA.Tex.nameTag(name, '#' + new THREE.Color(Mo.People.PLAYER_COLORS[color % 4]).getHexString()), transparent: true, depthTest: false }));
      tag.scale.set(1.6, 0.4, 1); tag.position.y = 2.2; tag.renderOrder = 5;
      this.root.add(tag); this.tag = tag;
      this.item = null; this.itemMesh = null;
      this.tx = 0; this.ty = 0; this.tz = 0; this.ry = 0; this.phase = 0; this.flags = 0; this.alive = true;
    }
    set(x, y, z, ry, item, flags) {
      this.tx = x; this.ty = y; this.tz = z; this.ry = ry; this.flags = flags; this.alive = !(flags & 8);
      if (item !== this.item) {
        this.item = item;
        if (this.itemMesh) this.p.handR.remove(this.itemMesh);
        this.itemMesh = null;
        if (item && ITEMS[item]) {
          const m = Mo.Items.make(item);
          const g = new THREE.Group(); g.add(m);
          g.rotation.x = Math.PI / 2 - 0.3;
          if (ITEMS[item].kind === 'build') g.scale.setScalar(0.5);
          if (item === 'torch') { const f = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 6), Mo.M.fire()); f.position.y = 0.42; g.add(f); }
          this.p.handR.add(g); this.itemMesh = g;
        }
      }
    }
    update(dt) {
      const r = this.root;
      const k = Math.min(1, dt * 10);
      const ox = r.position.x, oz = r.position.z;
      if (r.position.distanceToSquared(new THREE.Vector3(this.tx, this.ty, this.tz)) > 400) r.position.set(this.tx, this.ty, this.tz);
      r.position.x += (this.tx - r.position.x) * k; r.position.y += (this.ty - r.position.y) * k; r.position.z += (this.tz - r.position.z) * k;
      r.rotation.y += U.angleDiff(r.rotation.y, this.ry) * k;
      const sp = Math.hypot(r.position.x - ox, r.position.z - oz) / Math.max(dt, 1e-3);
      const p = this.p;
      this.phase += dt * Math.min(12, sp * 2.2);
      const L = Math.min(0.9, sp * 0.15);
      p.legL.rotation.x = Math.sin(this.phase) * L; p.legR.rotation.x = -Math.sin(this.phase) * L;
      p.armL.rotation.x = -Math.sin(this.phase) * L * 0.7;
      p.armR.rotation.x = this.item ? 0.5 : Math.sin(this.phase) * L * 0.7;
      if (this.flags & 32) p.armR.rotation.x = 1.5 + Math.sin(performance.now() / 60) * 0.8; // swinging
      if (this.flags & 128) { p.armR.rotation.x = 1.5; p.armL.rotation.x = 1.5; }
      p.torso.rotation.x = (this.flags & 16) ? 0.4 : 0;
      p.body.position.y = (this.flags & 16) ? -0.3 : 0;
      p.body.rotation.x = this.alive ? 0 : 1.5;
      this.tag.visible = this.alive;
    }
    remove() { scene.remove(this.root); }
  }

  return {
    me, Remote, update, hurt, spawnAt, consume, interact, addXp, setLevel,
    init(world, sc, camera) {
      W = world; scene = sc; cam = camera;
      A = DA.Audio; FX = DA.Effects; Z = DA.Zombies; G = DA.Game;
      buildViewmodel();
    },
    get vm() { return vm; },
    get buildErr() { return buildErr; },
    resetStats() { me.hp = me.maxHp; me.food = 75; me.water = 75; me.stamina = 100; me.alive = true; me.swingT = 0; me.useT = 0; me.drawT = 0; },
  };
})();
