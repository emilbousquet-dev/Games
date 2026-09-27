// ============================================================
//  FLOPPY PARTY — COIN GRAB
//  Shiny coins pop up all over the island. Grab as many as you
//  can! Knock someone out and they drop some of theirs. Now and
//  then a BIG coin (worth 5) appears. Most coins after 75 s wins.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.coins = (function () {
  const TIME = 75, ACTIVE = 12, POOL = 22, BIG_EVERY = 20;
  let coins = [], spots = [], time = 0, bigT = 0, self = null;

  function build() {
    coins = []; spots = []; time = 0; bigT = BIG_EVERY; respawn.clear();
    const S = FP.Stage;
    S.island(0, -1, 0, 18, 2, 13);
    S.island(0, -1, 0, 13, 2, 17);
    // platforms to jump on (coins up there too)
    const plats = [[-5, -3.5, 3, 1, 3, 0xffd6e7], [5, 3.5, 3, 1, 3, 0xcfe8ff], [5, -4, 2.6, 0.8, 2.6, 0xd4f5c4], [-5, 4, 2.6, 0.8, 2.6, 0xfff1b8], [0, 0, 3.2, 0.7, 3.2, 0xe6d9ff]];
    for (const [x, z, w, h, d, col] of plats) S.block(x, h / 2, z, w, h, d, col);
    for (const [x, z] of [[-8, 0], [8, 0]]) { const t = FP.Look.tree(1); t.position.set(x, 0, z); S.add(t); FP.Stage.bodies.push(FP.Physics.staticBox(x, 0.8, z, 0.5, 1.6, 0.5)); }
    // a treasure chest full of gold, and party flags
    const ch = FP.Props.chest(); ch.position.set(0, 0, -7.4); S.add(ch);
    S.bodies.push(FP.Physics.staticBox(0, 0.45, -7.4, 1.3, 0.9, 0.9));
    S.add(FP.Props.bunting(-8, 2.6, 0, 8, 2.6, 0, 18));
    for (const [x, z] of [[-5.5, 7.6], [5.5, 7.6]]) { const r = FP.Props.rock(0.8); r.position.set(x, 0, z); S.add(r); }
    // places where coins can appear: all over the ground, and on top of each platform
    for (let x = -7; x <= 7; x += 1.75) for (let z = -5.5; z <= 5.5; z += 1.75) {
      if (Math.abs(x) > 6 && Math.abs(z) > 4.5) continue;
      const onPlat = plats.find(([px, pz, w, h, d]) => Math.abs(x - px) < w / 2 + 0.3 && Math.abs(z - pz) < d / 2 + 0.3);
      spots.push({ x, z, y: onPlat ? onPlat[3] : 0 });
    }
    for (let i = 0; i < POOL; i++) {
      const m = FP.Kit.coinMesh(i === 0 ? 0.6 : 0.32);
      m.position.set(0, -100, 0);
      S.add(m);
      coins.push({ mesh: m, on: false, x: 0, y: -100, z: 0, big: i === 0, vy: 0, vx: 0, vz: 0, floor: 0, wait: 0 });
    }
    for (let i = 1; i <= ACTIVE; i++) place(coins[i]);
    FP.Camera.setAngle(0.8, 0.78);
  }

  function place(coin) {
    // a random free spot, not too close to other coins
    let best = null;
    for (let k = 0; k < 12; k++) {
      const s = spots[Math.floor(Math.random() * spots.length)];
      if (!coins.some((o) => o.on && Math.hypot(o.x - s.x, o.z - s.z) < 1.5)) { best = s; break; }
      best = s;
    }
    coin.on = true; coin.x = best.x; coin.z = best.z; coin.y = best.y + 0.55; coin.floor = coin.y; coin.vy = 0; coin.vx = 0; coin.vz = 0; coin.wait = 0;
  }

  // coins pop out of someone who got knocked out
  function spill(c, n) {
    const p = c.parts.torso.position;
    for (let k = 0; k < n; k++) {
      const coin = coins.find((o, i) => i > 0 && !o.on);
      if (!coin) return;
      const a = Math.random() * Math.PI * 2;
      coin.on = true; coin.x = p.x; coin.y = p.y + 0.3; coin.z = p.z;
      coin.vx = Math.cos(a) * 3.5; coin.vz = Math.sin(a) * 3.5; coin.vy = 7; coin.wait = 0.7;
      const g = FP.Physics.groundBelow(new CANNON.Vec3(p.x + coin.vx * 0.9, p.y + 3, p.z + coin.vz * 0.9), 12, 0);
      coin.floor = g ? g.y + 0.55 : -100;
    }
  }

  function visual(dt) {
    const t = performance.now() / 1000;
    for (const coin of coins) {
      if (!coin.on) { coin.mesh.position.y = -100; continue; }
      coin.mesh.position.set(coin.x, coin.y + Math.sin(t * 3 + coin.x) * 0.08, coin.z);
      coin.mesh.rotation.y = t * 3 + coin.z;
    }
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      bigT -= dt;
      if (bigT <= 0 && !coins[0].on) {
        bigT = BIG_EVERY;
        const big = coins[0];
        big.on = true; big.x = 0; big.z = 0; big.y = 0.7 + 0.8; big.floor = big.y; big.wait = 0; big.vx = big.vy = big.vz = 0;
        FP.UI.big('BIG COIN!', 1.1, 'Worth 5 coins, in the middle!');
        if (FP.Net) FP.Net.banner('BIG COIN!', 'Worth 5 coins, in the middle!');
      }
      for (const coin of coins) {
        if (!coin.on) continue;
        // flying coins (spilled) fall back down
        if (coin.vx || coin.vz || coin.vy) {
          coin.vy -= 20 * dt;
          coin.x += coin.vx * dt; coin.z += coin.vz * dt; coin.y += coin.vy * dt;
          if (coin.y <= coin.floor && coin.vy < 0) { coin.y = coin.floor; coin.vx = coin.vz = coin.vy = 0; }
          if (coin.y < -20) coin.on = false;
        }
        coin.wait -= dt;
        if (coin.wait > 0) continue;
        for (const c of chars) {
          if (!c.alive || c.ko > 0) continue;
          const p = c.parts.torso.position;
          if (Math.hypot(p.x - coin.x, p.z - coin.z) < 0.9 && Math.abs(p.y - coin.y) < 1.2) {
            coin.on = false;
            const worth = coin.big ? 5 : 1;
            game.scores[c.player.id] = (game.scores[c.player.id] || 0) + worth;
            FP.FX.word(coin.mesh.position, coin.big ? '+5!' : '+1', '#ffcf33', coin.big ? 1.4 : 0.8);
            FP.Audio.play('coin');
            break;
          }
        }
      }
      // keep enough coins out
      const out = coins.filter((o, i) => i > 0 && o.on).length;
      if (out < ACTIVE) { const free = coins.find((o, i) => i > 0 && !o.on); if (free) place(free); }
      // fell off: lose 2 coins, come back
      respawn.update(chars, dt, -6);
    }
    visual(dt);
    if (roundOver || dt === 0) return null;
    if (time >= TIME) {
      const w = FP.Kit.mostPoints(chars, game.scores);
      return { winners: w, text: w.length === 1 ? `${w[0].name} is the richest!` : 'It\'s a tie!' };
    }
    return null;
  }

  const respawn = FP.Kit.respawner((c) => {
    const id = c.player.id, sc = FP.Game.scores;
    if (sc[id]) sc[id] = Math.max(0, sc[id] - 2);
    const a = Math.random() * Math.PI * 2;
    return { x: Math.cos(a) * 4, z: Math.sin(a) * 3, yaw: a + Math.PI };
  });

  // knocked out: drop up to 3 coins
  FP.bus.on('knockOut', (c) => {
    if (!FP.Kit.live(self) || !c.player) return;
    const sc = FP.Game.scores, id = c.player.id;
    const n = Math.min(3, sc[id] || 0);
    if (!n) return;
    sc[id] -= n;
    spill(c, n);
    FP.FX.word(c.parts.head.position, `-${n}`, '#ff5a5f', 1);
  });

  // bot brain: go for the best coin (close ones, big ones), jump up to platforms, punch the leader
  function botThink(c, chars, dt, input, tools) {
    const b = tools.brain, p = c.parts.torso.position;
    b.coinT = (b.coinT || 0) - dt;
    if (!b.coin || !b.coin.on || b.coinT <= 0) {
      let best = null, bs = Infinity;
      for (const coin of coins) {
        if (!coin.on) continue;
        let s = Math.hypot(coin.x - p.x, coin.z - p.z) + (coin.y - p.y > 0 ? 1.5 : 0) + Math.random() * 1.5;
        if (coin.big) s -= 6;
        for (const o of chars) if (o !== c && o.alive && Math.hypot(o.parts.torso.position.x - coin.x, o.parts.torso.position.z - coin.z) < Math.hypot(coin.x - p.x, coin.z - p.z) - 1) s += 2;
        if (s < bs) { bs = s; best = coin; }
      }
      b.coin = best; b.coinT = 1.2;
    }
    if (b.coin) {
      const d = tools.steer(c, b.coin.x, b.coin.z, input);
      const feet = p.y - FP.Ragdoll.STAND;
      if (b.coin.y - 0.55 > feet + 0.4 && d < 2.4 && c.grounded) input.jumpPressed = true;
    }
    // punch whoever has the most coins if they're close
    let leader = null;
    for (const o of chars) if (o !== c && o.alive && (!leader || (FP.Game.scores[o.player.id] || 0) > (FP.Game.scores[leader.player.id] || 0))) leader = o;
    if (leader && leader.parts.torso.position.distanceTo(p) < 1.5) {
      tools.steer(c, leader.parts.torso.position.x, leader.parts.torso.position.z, input);
      if (Math.random() < dt * 3) input.punchPressed = true;
    }
    tools.unstick(input);
    return true;
  }

  function hud() { return `${FP.UI.ICON.coin} Grab the coins! &nbsp; ${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)}`; }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#bfe6ff"/><ellipse cx="60" cy="64" rx="52" ry="11" fill="#7ad35e" stroke="#2a2140" stroke-width="2"/><rect x="74" y="44" width="24" height="12" fill="#cfe8ff" stroke="#2a2140" stroke-width="2"/><g stroke="#2a2140" stroke-width="2"><circle cx="30" cy="40" r="7" fill="#ffcf33"/><circle cx="86" cy="32" r="7" fill="#ffcf33"/><circle cx="58" cy="24" r="11" fill="#ffcf33"/><circle cx="46" cy="52" r="6" fill="#ffcf33"/></g><path d="M58 18l2 4 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5z" fill="#fff5c2"/><ellipse cx="70" cy="54" rx="5" ry="6" fill="#9b6bff" stroke="#2a2140" stroke-width="2"/><circle cx="70" cy="45" r="4" fill="#9b6bff" stroke="#2a2140" stroke-width="2"/></svg>';

  self = {
    id: 'coins', name: 'Coin Grab', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 3, song: 'chill', minZoom: 16, art: ART,
    desc: 'Grab the most coins! Knock people out and they drop theirs. Watch for the big coin.',
    build, spawn: (i, n) => FP.Kit.ring(i, n, 4, 3, 0.5), update, botThink, hud, visual,
    scoreLabel: (s) => `${Math.floor(s)}`,
    netState: () => coins.map((o) => (o.on ? [Math.round(o.x * 50) / 50, Math.round(o.y * 50) / 50, Math.round(o.z * 50) / 50] : 0)),
    applyNetState: (s) => { s.forEach((v, i) => { const o = coins[i]; if (!o) return; o.on = !!v; if (v) { o.x = v[0]; o.y = v[1]; o.z = v[2]; } }); },
  };
  return self;
})();
