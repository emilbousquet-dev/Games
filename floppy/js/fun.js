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
  ];
  const EVENTS = ['moon', 'turbo', 'bighead', 'superpunch', 'ice', 'disco'];
  const SHOUT = { moon: ['MOON GRAVITY!', 'Everyone is floaty!'], turbo: ['TURBO!', 'Super speed for everyone!'], bighead: ['BIG HEADS!', 'Look at those heads!'], superpunch: ['SUPER PUNCHES!', 'Punches are extra strong!'], ice: ['ICE FLOOR!', 'Slip and slide!'], disco: ['DISCO TIME!', 'Dance party!'] };

  const chosen = {};
  try { Object.assign(chosen, JSON.parse(localStorage.getItem('floppy-fun') || '{}')); } catch (e) { /* no saving */ }
  let temp = null, tempT = 0, chaosT = 20, inMatch = false, t = 0, discoBall = null, net = null;

  const api = { speed: 1, jump: 1, punch: 1, slip: false, bighead: false, disco: false };

  function isOn(id) { return !!chosen[id]; }
  function toggle(id) {
    chosen[id] = !chosen[id];
    try { localStorage.setItem('floppy-fun', JSON.stringify(chosen)); } catch (e) { /* no saving */ }
  }
  function list() { return OPTIONS.filter((o) => chosen[o.id]); }

  // which rules are switched on right now?
  function recompute() {
    const on = (id) => inMatch && (chosen[id] || temp === id);
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
  function update(dt, state) {
    t += dt;
    inMatch = ['countdown', 'play', 'roundOver'].includes(state) || state === 'client';
    if (state === 'play' && chosen.chaos) {
      if (temp) { tempT -= dt; if (tempT <= 0) temp = null; }
      chaosT -= dt;
      if (chaosT <= 0) {
        chaosT = 18 + Math.random() * 6;
        const choices = EVENTS.filter((e) => !chosen[e]);
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

  return Object.assign(api, { OPTIONS, isOn, toggle, list, update, netState, applyNet, clearNet });
})();
