// ============================================================
//  FLOPPY PARTY — FUN OPTIONS
//  Silly rules you can switch on for any mini-game: moon
//  gravity, turbo speed, big heads, super punches, slippery
//  floors, a disco party, and "surprise events" that switch
//  random silly rules on for a few seconds during a game.
// ============================================================
window.FP = window.FP || {};

FP.Fun = (function () {
  const OPTIONS = [
    { id: 'moon', name: 'Moon gravity', desc: 'Everyone floats and jumps super high.' },
    { id: 'turbo', name: 'Turbo speed', desc: 'Everyone runs super fast.' },
    { id: 'bighead', name: 'Big heads', desc: 'Giant heads for everyone.' },
    { id: 'superpunch', name: 'Super punches', desc: 'Punches send people flying.' },
    { id: 'ice', name: 'Slippery floor', desc: 'Everything is as slippery as ice.' },
    { id: 'disco', name: 'Disco party', desc: 'Flashing colored lights and a disco ball.' },
    { id: 'chaos', name: 'Surprise events', desc: 'Every 20 seconds, something silly happens!' },
    { id: 'wind', name: 'Windy', desc: 'Strong gusts of wind push everyone around.' },
    { id: 'hand', name: 'Giant Hand', desc: 'A giant hand comes down from the sky and swats someone!' },
    { id: 'quake', name: 'Earthquakes', desc: 'The ground shakes and bumps everyone around.' },
  ];
  const EVENTS = ['moon', 'turbo', 'bighead', 'superpunch', 'ice', 'disco'];
  const SHOUT = { moon: ['MOON GRAVITY!', 'Everyone is floaty!'], turbo: ['TURBO!', 'Super speed for everyone!'], bighead: ['BIG HEADS!', 'Look at those heads!'], superpunch: ['SUPER PUNCHES!', 'Punches are extra strong!'], ice: ['ICE FLOOR!', 'Slip and slide!'], disco: ['DISCO TIME!', 'Dance party!'] };

  const chosen = {};
  try { Object.assign(chosen, JSON.parse(localStorage.getItem('floppy-fun') || '{}')); } catch (e) { /* no saving */ }
  let temp = null, tempT = 0, chaosT = 20, inMatch = false, t = 0, discoBall = null, net = null;
  let forced = {}; // rules switched on just for one game (like the Daily Challenge), without changing your settings

  const api = { speed: 1, jump: 1, punch: 1, slip: false, bighead: false, disco: false, hazard: null };

  function isOn(id) { return !!chosen[id]; }
  function toggle(id) {
    chosen[id] = !chosen[id];
    try { localStorage.setItem('floppy-fun', JSON.stringify(chosen)); } catch (e) { /* no saving */ }
  }
  function list() { return OPTIONS.filter((o) => chosen[o.id]); }

  // which rules are switched on right now?
  function recompute() {
    const on = (id) => inMatch && (chosen[id] || forced[id] || temp === id);
    api.speed = on('turbo') ? 1.7 : 1;
    api.jump = 1;
    api.punch = on('superpunch') ? 2.2 : 1;
    api.slip = on('ice');
    api.bighead = net ? net.b : on('bighead');
    api.disco = net ? net.d : on('disco');
    const g = on('moon') ? -9 : -25;
    if (FP.Physics.world.gravity.y !== g) FP.Physics.world.gravity.set(0, g, 0);
  }

  function makeDiscoBall() {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), new THREE.MeshToonMaterial({ color: 0xe8ecff, flatShading: true, gradientMap: FP.Look.toon(0xffffff).gradientMap }));
    const string = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6, 5), new THREE.MeshBasicMaterial({ color: 0x2a2140 }));
    string.position.y = 3.5;
    g.add(ball, string);
    g.userData.ball = ball;
    return g;
  }

  // every frame: surprise events, and the disco lights
  // ---------------- hazards: wind, the giant hand, earthquakes ----------------
  const HZ = { wind: { next: 8, on: 0, dx: 0, dz: 0 }, hand: { next: 10, target: null, t: 0, mesh: null, shadow: null }, quake: { next: 12, on: 0 } };
  const hazardOn = (id) => chosen[id] || forced[id] || api.hazard === id;
  function resetHazards() { HZ.wind.next = 8; HZ.wind.on = 0; HZ.hand.next = 10; HZ.hand.target = null; HZ.hand.mesh = null; HZ.quake.next = 12; HZ.quake.on = 0; }
  function makeHand() {
    const L = FP.Look, g = new THREE.Group(), skin = L.toon(0xffd6b0);
    const palm = L.mesh(new THREE.BoxGeometry(2.2, 0.6, 2.4), skin, 0.05); g.add(palm);
    for (let i = 0; i < 4; i++) { const f = L.mesh(new THREE.CapsuleGeometry(0.24, 1.1, 4, 8), skin, 0.04); f.rotation.x = Math.PI / 2; f.position.set(-0.8 + i * 0.53, 0, 1.7); g.add(f); }
    const thumb = L.mesh(new THREE.CapsuleGeometry(0.26, 0.8, 4, 8), skin, 0.04); thumb.rotation.z = Math.PI / 2; thumb.position.set(1.5, 0, 0.3); g.add(thumb);
    const cuff = L.mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 16), L.toon(0xffffff), 0.05); cuff.rotation.x = Math.PI / 2; cuff.position.z = -1.7; g.add(cuff);
    FP.Stage.add(g);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.5, 24), new THREE.MeshBasicMaterial({ color: 0xff3a3a, transparent: true, opacity: 0.35, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; FP.Stage.add(shadow);
    return { g, shadow };
  }
  function hazards(dt) {
    const chars = (FP.Game && FP.Game.chars) || [];
    const alive = chars.filter((c) => c.alive && c.parts.torso.position.y > -2);
    const shout = (a, b) => { FP.UI.big(a, 1.2, b); if (FP.Net && FP.Net.banner) FP.Net.banner(a, b); };
    // wind: a gust from one side for a few seconds
    if (hazardOn('wind')) {
      const w = HZ.wind;
      if (w.on > 0) {
        w.on -= dt;
        for (const c of alive) { if (c.grab && (c.grab[0] || c.grab[1]) && c.grab.some((g) => g && g.body.mass === 0)) continue; for (const b of c.bodies) { b.velocity.x += w.dx * 7 * dt; b.velocity.z += w.dz * 7 * dt; } }
        if (Math.random() < dt * 12 && alive.length) { const p = alive[Math.floor(Math.random() * alive.length)].parts.torso.position; FP.FX.puffs(new THREE.Vector3(p.x - w.dx * 3, p.y, p.z - w.dz * 3), 3, 0xffffff, 1.5, 0.6); }
      } else if ((w.next -= dt) <= 0) {
        w.next = 12 + Math.random() * 6; w.on = 3;
        const a = Math.random() * Math.PI * 2; w.dx = Math.sin(a); w.dz = Math.cos(a);
        shout('WIND!', 'Hold on to something! (grab a wall)'); FP.Audio.play('whoosh');
      }
    }
    // the giant hand: a red circle follows someone, then SWAT!
    if (hazardOn('hand')) {
      const h = HZ.hand;
      if (h.target) {
        h.t += dt;
        if (!h.mesh) Object.assign(h, { mesh: makeHand() });
        const p = h.target.parts.torso.position;
        if (h.t < 1.4) { h.x = p.x; h.z = p.z; } // it follows you, then stops just before it swats
        const y = h.t < 1.6 ? 12 - h.t * 4 : Math.max(0.9, 5.6 - (h.t - 1.6) * 30);
        h.mesh.g.position.set(h.x, y, h.z - 0.4); h.mesh.shadow.position.set(h.x, 0.04, h.z);
        h.mesh.shadow.material.opacity = 0.25 + 0.2 * Math.sin(h.t * 20);
        if (h.t > 1.6 && !h.hit && y <= 1.0) {
          h.hit = true; FP.Camera.shake(0.6); FP.Audio.play('bonk');
          FP.FX.word(new THREE.Vector3(h.x, 2, h.z), 'SWAT!', '#ff5a5f', 1.6);
          for (const c of alive) {
            const q = c.parts.torso.position, dx = q.x - h.x, dz = q.z - h.z, d = Math.hypot(dx, dz);
            if (d > 1.7) continue;
            const a = d > 0.2 ? Math.atan2(dx, dz) : Math.random() * Math.PI * 2;
            FP.Ragdoll.knockOut(c, 1.2);
            c.lastHitBy = null;
            for (const b of c.bodies) { b.velocity.x += Math.sin(a) * 6; b.velocity.z += Math.cos(a) * 6; b.velocity.y += 5; }
          }
        }
        if (h.t > 2.6) { FP.Stage.scene.remove(h.mesh.g); FP.Stage.scene.remove(h.mesh.shadow); h.mesh = null; h.target = null; }
      } else if ((h.next -= dt) <= 0 && alive.length) {
        h.next = 11 + Math.random() * 6; h.t = 0; h.hit = false;
        h.target = alive[Math.floor(Math.random() * alive.length)];
        shout('GIANT HAND!', `It's coming for ${h.target.name}! Run!`); FP.Audio.play('alarm');
      }
    }
    // earthquake: everything shakes and people get bumped around
    if (hazardOn('quake')) {
      const q = HZ.quake;
      if (q.on > 0) {
        q.on -= dt;
        FP.Camera.shake(0.35);
        if (Math.random() < dt * 5) for (const c of alive) { if (!c.grounded) continue; const a = Math.random() * Math.PI * 2; for (const b of c.bodies) { b.velocity.x += Math.sin(a) * 2.5; b.velocity.z += Math.cos(a) * 2.5; b.velocity.y += 2.5; } }
      } else if ((q.next -= dt) <= 0) {
        q.next = 14 + Math.random() * 6; q.on = 2.5;
        shout('EARTHQUAKE!', 'Everything is shaking!'); FP.Audio.play('bonk');
      }
    }
  }

  function update(dt, state) {
    t += dt;
    if (state === 'play') hazards(dt);
    else if (state !== 'roundOver') resetHazards();
    inMatch = ['countdown', 'play', 'roundOver', 'transition'].includes(state) || state === 'client';
    if (state === 'play' && (chosen.chaos || forced.chaos)) {
      if (temp) { tempT -= dt; if (tempT <= 0) temp = null; }
      chaosT -= dt;
      if (chaosT <= 0) {
        chaosT = 18 + Math.random() * 6;
        const choices = EVENTS.filter((e) => !chosen[e] && !forced[e]);
        if (choices.length) {
          temp = choices[Math.floor(Math.random() * choices.length)];
          tempT = 9;
          const [a, b] = SHOUT[temp];
          FP.UI.big(a, 1.4, b);
          if (FP.Net && FP.Net.banner) FP.Net.banner(a, b);
          FP.Audio.play('cheer');
        }
      }
    }
    if (!inMatch) { temp = null; chaosT = 20; }
    recompute();
    // disco: the lights change color, and a disco ball spins in the sky
    const S = FP.Stage;
    if (api.disco) {
      const hue = (t * 0.25) % 1;
      S.hemi.color.setHSL(hue, 0.8, 0.65);
      S.hemi.groundColor.setHSL((hue + 0.5) % 1, 0.8, 0.5);
      S.sun.color.setHSL((hue + 0.3) % 1, 0.7, 0.7);
      if (!discoBall) { discoBall = makeDiscoBall(); S.scene.add(discoBall); }
      const c = FP.Camera.target;
      discoBall.position.set(c.x, c.y + 4.5, c.z - 5);
      discoBall.userData.ball.rotation.y = t * 1.5;
      discoBall.userData.ball.material.color.setHSL((t * 0.7) % 1, 0.6, 0.8);
    } else if (discoBall) {
      S.scene.remove(discoBall); discoBall = null;
      S.hemi.color.setHex(0xffffff); S.hemi.groundColor.setHex(0x9fc4ff); S.sun.color.setHex(0xfff4e0);
    }
  }

  // online: the host tells everyone which things to show
  function netState() { return (api.bighead ? 1 : 0) + (api.disco ? 2 : 0); }
  function applyNet(v) { net = { b: !!(v & 1), d: !!(v & 2) }; }
  function clearNet() { net = null; }

  function force(ids) { forced = {}; for (const id of ids || []) forced[id] = true; }
  function unforce() { forced = {}; }

  Object.assign(api, { OPTIONS, isOn, toggle, list, update, netState, applyNet, clearNet, force, unforce });
  Object.defineProperty(api, 'forced', { get: () => Object.keys(forced) });
  return api;
})();
