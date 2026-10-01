// ============================================================
//  DINO RAMPAGE — PEOPLE
//  They walk on the sidewalks. When the dino is a baby they
//  think it's CUTE. When it gets bigger... they RUN!
//  (Nobody ever gets hurt: they just tumble and get back up.)
// ============================================================
window.DR = window.DR || {};

DR.People = (function () {
  const U = DR.U, Mo = DR.Models, A = DR.Audio, H = DR.HUD;
  const LANE = 10 / 2 + 2.5 / 2;   // sidewalk distance from the road middle
  const MAX = DR.lowGfx ? 14 : 26;

  const LINES = {
    cute: ['Awww, a baby dino!', "Who's a cute little guy?", 'Is it a lizard?', 'Can we keep it?!', "It's so tiny!", 'Look at its little arms!', 'Here, dino dino!', 'Is it lost?'],
    scared: ['AAAAH!', 'RUN!!!', 'DINOSAUR!!!', 'MOMMY!', "It's getting BIGGER!", 'Somebody call a vet!', 'Who ordered the dinosaur?!', "I'm late for work anyway!", 'HEEELP!', 'Why is it so BIG?!', 'RUN FOR THE HILLS!', 'I should have stayed home!', 'Not my day!', 'Is this a movie?!'],
    giant: ["It's as big as a building!", "That's the biggest dino EVER!", 'We need a BIGGER zoo!', 'Is that... GODZILLA?!', 'It blocked out the sun!'],
    roar: ['SO LOUD!', 'My ears!!', 'AAAAAH!', 'What a ROAR!', 'I think I need new pants...'],
    babyRoar: ['Awww, it tried to roar!', 'Hehe, so cute!', 'Was that a burp?', 'RAWR to you too!'],
    boop: ['Oof!', 'Hey!', 'Wheee!', 'My sandwich!', 'I can FLY!', 'Not again!', 'Ouchie!'],
    tickle: ['Hehe, it tickles!', 'Aww, it wants a hug!', 'Good dino!', 'Careful, little guy!'],
    hat: ['I love its hat!', 'Nice hat, buddy!', 'Fancy dino!'],
    shades: ['Is that dino wearing SUNGLASSES?', 'Cool shades, dino!'],
    crown: ['All hail the Dino King!', 'Is that a real crown?!'],
    chef: ['A chef dino?! Is it hungry?!'],
    // FBI agents (they follow the dino around and are VERY serious... not)
    fbi: [
      'FBI! Open up! ...Oh. You already opened the whole building.',
      'This is the FBI. You have the right to remain... HUGE.',
      "Agent, write this down: 'Suspect is green and VERY hungry.'",
      'Sir, the dinosaur does not have a driving license!',
      'We checked your search history. Why is it ALL snacks?',
      'Quick, call the CIA! ...They hung up on us.',
      "Is this classified? It's definitely classified as BIG.",
      'Agent, did you bring the giant leash?',
      'Our disguise is perfect. It will NEVER know we are FBI.',
      'Suspect last seen eating a bus. Again.',
      "My report just says 'RAWR' fifty times.",
      'Stop! FBI! ...Please? Pretty please?',
      'Nobody tell the boss we lost a whole city.',
      "Hold on, I'm on hold with Dinosaur Control.",
      'We need backup! And a BIGGER donut.',
      "Act casual. We're just two normal guys in black suits. Watching.",
    ],
    fbiRun: ['Agent down! ...I am fine!', 'Tactical retreat! RUN!', 'This was NOT in the training video!', 'I want a raise!', 'Mom, I quit the FBI!', "Write in the report: we RAN."],
    fbiBaby: ["Suspect is... adorable. Should we arrest it?", 'Agent, it is just a baby. Stand down. Aww.', "Put in the report: 'very cute'.", 'Is that... a top secret lizard?'],
  };

  let scene, list = [], globalCool = 0, hatId = 'none';
  let recentFear = 0;

  function init(sc) { scene = sc; }
  function setHat(h) { hatId = h; }
  function clear() { for (const p of list) scene.remove(p.m); list = []; }
  const pickLine = (k) => U.pick(LINES[k]);
  function say(p, text, force) {
    if (!text) return;
    if (!force && (p.cool > 0 || globalCool > 0)) return;
    p.cool = 6 + Math.random() * 4;
    globalCool = force ? 0.3 : 0.8;
    H.say(text, p.m, 2.15);
  }

  // ---------- where can people walk? (along the sidewalks) ----------
  function lanes(info) {
    const xs = [], zs = [];
    for (const x of info.roadsX) xs.push(x - LANE, x + LANE);
    for (const z of info.roadsZ) zs.push(z - LANE, z + LANE);
    return { xs, zs };
  }
  function spawn(info, dino) {
    const { xs, zs } = lanes(info);
    const minD = 22 + dino.scale * 4, maxD = 55 + dino.scale * 10;
    for (let tries = 0; tries < 12; tries++) {
      const axis = Math.random() < 0.5 ? 'x' : 'z';
      const at = axis === 'z' ? U.pick(xs) : U.pick(zs);
      const len = axis === 'z' ? info.d : info.w;
      const along = U.rand(-LANE, len + LANE);
      const x = axis === 'z' ? at : along, z = axis === 'z' ? along : at;
      if (z > info.shore - 3) continue;
      const d = U.dist(x, z, dino.x, dino.z);
      if (d < minD || d > maxD) continue;
      const agent = Math.random() < (DR.Army.active ? 0.3 : dino.tier >= 2 ? 0.14 : 0.05);
      const m = Mo.person(agent ? 'agent' : Math.floor(Math.random() * 1000));
      m.position.set(x, 0, z);
      scene.add(m);
      const kid = m.userData.kid;
      const p = { m, x, z, y: 0, vy: 0, vx: 0, vz: 0, axis, at, dir: Math.random() < 0.5 ? 1 : -1, state: 'walk', t: 0, cool: Math.random() * 3, speed: (kid ? 1.1 : 1.4) + Math.random() * 0.3, run: kid ? 4.6 : 5.6, kid, spin: 0, agent, joke: 2 + Math.random() * 3 };
      list.push(p);
      return;
    }
  }
  function nearestLane(info, x, z) {
    const { xs, zs } = lanes(info);
    let best = null;
    for (const lx of xs) { const d = Math.abs(x - lx); if (!best || d < best.d) best = { axis: 'z', at: lx, d }; }
    for (const lz of zs) { const d = Math.abs(z - lz); if (d < best.d) best = { axis: 'x', at: lz, d }; }
    return best;
  }

  // ---------- make people react to things ----------
  function scare(x, z, r, line) {
    for (const p of list) {
      if (p.state === 'tumble' || p.state === 'dizzy') continue;
      if (U.dist(p.x, p.z, x, z) < r) {
        if (p.state !== 'flee') { p.state = 'flee'; p.t = 0; if (Math.random() < 0.35) A.scream(0); }
        if (line && Math.random() < 0.5) say(p, typeof line === 'function' ? line() : line);
      }
    }
  }
  // something got smashed: people nearby complain about it
  function smashed(o, dino) {
    const r = 18 + dino.scale * 6;
    let best = null, bd = 1e9;
    for (const p of list) {
      const d = U.dist(p.x, p.z, o.x, o.z);
      if (d < r && d < bd && p.state !== 'tumble') { bd = d; best = p; }
    }
    if (best && o.lines && Math.random() < (o.tier >= 3 || o.food ? 0.9 : 0.55)) say(best, U.pick(o.lines), o.tier >= 3);
    if (dino.tier > 1 || o.tier > 1) scare(o.x, o.z, r, null);
  }
  function roared(x, z, r, baby) {
    if (baby) {
      for (const p of list) if (U.dist(p.x, p.z, x, z) < r && Math.random() < 0.4) say(p, pickLine('babyRoar'));
      return;
    }
    scare(x, z, r, () => pickLine('roar'));
  }
  // a push (tail whip, belly flop): people inside go flying (but they're OK!)
  function shockwave(x, z, r, power, baby) {
    for (const p of list) {
      if (p.y > 0.05) continue;
      const d = U.dist(p.x, p.z, x, z);
      if (d > r) continue;
      if (baby) { push(p, x, z, 1.5); continue; }
      const k = (1 - d / r) * 0.6 + 0.4;
      tumble(p, x, z, power * k);
    }
  }
  function push(p, x, z, amt) {
    const d = Math.max(0.1, U.dist(p.x, p.z, x, z));
    p.x += (p.x - x) / d * amt * 0.3; p.z += (p.z - z) / d * amt * 0.3;
  }
  function tumble(p, x, z, power) {
    const d = Math.max(0.1, U.dist(p.x, p.z, x, z));
    const sp = 4 + power * 3;
    p.vx = (p.x - x) / d * sp; p.vz = (p.z - z) / d * sp;
    p.vy = 5 + power * 3;
    p.state = 'tumble'; p.t = 0;
    p.spin = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 6);
    if (Math.random() < 0.5) say(p, pickLine('boop'));
    A.scream(0);
  }

  // ------------------------------------------------------------
  //  EVERY FRAME
  // ------------------------------------------------------------
  function update(dt, t, dino, info, playing) {
    globalCool -= dt;
    recentFear -= dt;
    // keep enough people around the dino
    if (playing !== false) {
      if (list.length < MAX && Math.random() < dt * 6) spawn(info, dino);
    }
    const far = 75 + dino.scale * 14;
    const baby = dino.tier === 1;
    const { xs, zs } = lanes(info);
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.t += dt; p.cool -= dt;
      const dx = p.x - dino.x, dz = p.z - dino.z;
      const dist = Math.hypot(dx, dz);
      if (dist > far * 1.3) { scene.remove(p.m); list.splice(i, 1); continue; }
      // the dino bumps into people
      if (p.y < 0.05 && p.state !== 'tumble' && dino.y < 1 + dino.scale && dist < dino.r + 0.4 && playing !== false) {
        if (baby) { push(p, dino.x, dino.z, 2); say(p, pickLine('tickle')); A.giggle(0); }
        else tumble(p, dino.x, dino.z, 1 + dino.tier * 0.3);
      }
      // what should I do?
      const scary = !baby && dist < (p.agent ? dino.r + 3 + dino.scale * 1.5 : 12 + dino.scale * 7);
      if (p.agent && p.state === 'walk' && dist < 70) { p.state = 'agent'; p.t = 0; }
      if (p.state === 'walk' || p.state === 'curious' || p.state === 'watch' || p.state === 'agent') {
        if (scary) {
          p.state = 'flee'; p.t = 0;
          if (Math.random() < 0.4) A.scream(U.clamp(dx / 30, -1, 1));
          if (p.agent) say(p, pickLine('fbiRun'), true);
          else if (dino.tier === 5 && Math.random() < 0.5) say(p, pickLine('giant'));
          else say(p, pickLine('scared'));
        } else if (baby && p.state === 'walk' && dist < 14 && p.cool < 0 && Math.random() < dt * 0.6) {
          p.state = 'curious'; p.t = 0;
          const hatLine = hatId === 'shades' ? 'shades' : hatId === 'crown' ? 'crown' : hatId === 'chef' ? 'chef' : hatId !== 'none' ? 'hat' : null;
          say(p, pickLine(hatLine && Math.random() < 0.5 ? hatLine : 'cute'));
        }
      }
      let speed = 0, panic = false, wave = false;
      if (p.state === 'walk') {
        speed = p.speed;
        walkLane(p, dt, speed, xs, zs, info, null);
      } else if (p.state === 'flee') {
        speed = p.run;
        panic = true;
        walkLane(p, dt, speed, xs, zs, info, dino);
        if (dist > 40 + dino.scale * 12 && p.t > 4) { p.state = 'walk'; p.t = 0; }
      } else if (p.state === 'agent') {
        // follow the dino (from a safe distance) and say silly FBI things
        const keep = dino.r + 6 + dino.scale * 3;
        if (dist > keep + 2) {
          speed = p.speed * 1.8;
          p.x -= dx / dist * speed * dt; p.z -= dz / dist * speed * dt;
        } else wave = Math.sin(p.t * 0.7) > 0.6;
        p.m.rotation.y = Math.atan2(-dx, -dz);
        p.joke -= dt;
        if (p.joke <= 0 && dist < 45) { p.joke = 7 + Math.random() * 6; say(p, pickLine(baby ? 'fbiBaby' : 'fbi'), true); }
        if (dist > 90) { p.state = 'return'; p.t = 0; }
      } else if (p.state === 'curious') {
        // walk up to the baby dino and say hi
        if (dist > 3 + dino.r) {
          speed = p.speed * 1.2;
          p.x -= dx / dist * speed * dt; p.z -= dz / dist * speed * dt;
          p.m.rotation.y = Math.atan2(-dx, -dz);
        } else { wave = true; p.m.rotation.y = Math.atan2(-dx, -dz); }
        if (p.t > 7 || dist > 25) { p.state = 'return'; p.t = 0; }
      } else if (p.state === 'return') {
        const L = nearestLane(info, p.x, p.z);
        const tx = L.axis === 'z' ? L.at : p.x, tz = L.axis === 'x' ? L.at : p.z;
        const d = U.dist(p.x, p.z, tx, tz);
        speed = baby ? p.speed : p.run;
        panic = !baby;
        if (d < 0.3) { p.axis = L.axis; p.at = L.at; if (L.axis === 'z') p.x = L.at; else p.z = L.at; p.state = baby || p.agent ? 'walk' : 'flee'; p.t = 0; }
        else { p.x += (tx - p.x) / d * speed * dt; p.z += (tz - p.z) / d * speed * dt; p.m.rotation.y = Math.atan2(tx - p.x, tz - p.z); }
      } else if (p.state === 'tumble') {
        p.vy -= 20 * dt;
        p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
        p.m.rotation.x += p.spin * dt;
        if (p.y <= 0 && p.t > 0.15) { p.y = 0; p.state = 'dizzy'; p.t = 0; p.m.rotation.x = -Math.PI / 2; }
      } else if (p.state === 'dizzy') {
        p.m.rotation.z = Math.sin(p.t * 10) * 0.2;
        if (p.t > 1.3) { p.m.rotation.x = 0; p.m.rotation.z = 0; p.state = 'return'; p.t = 0; }
      }
      p.m.position.set(p.x, p.y, p.z);
      // only animate people that are close enough to see
      const vis = dist < far;
      p.m.visible = vis;
      if (vis && p.state !== 'tumble' && p.state !== 'dizzy') Mo.animatePerson(p.m, dt, { speed, panic, wave });
    }
  }

  // walk along the sidewalk; at corners maybe turn (when running away, turn AWAY from the dino)
  function walkLane(p, dt, speed, xs, zs, info, dino) {
    if (dino) {
      const along = p.axis === 'x' ? p.x - dino.x : p.z - dino.z;
      const side = p.axis === 'x' ? p.z - dino.z : p.x - dino.x;
      if (Math.abs(along) > 2 || Math.abs(side) < 4) p.dir = along >= 0 ? 1 : -1;
    }
    const old = p.axis === 'x' ? p.x : p.z;
    let nw = old + p.dir * speed * dt;
    const cross = p.axis === 'x' ? xs : zs;
    for (const c of cross) {
      if ((old - c) * (nw - c) <= 0 && old !== c) {
        let turn = false, dir = Math.random() < 0.5 ? 1 : -1;
        if (dino) {
          // pick the direction that goes most away from the dino
          const ax = p.axis === 'x' ? 'z' : 'x';
          const away = ax === 'x' ? p.x - dino.x : p.z - dino.z;
          const awayNow = p.axis === 'x' ? p.x - dino.x : p.z - dino.z;
          if (Math.abs(away) > Math.abs(awayNow) * 0.7) { turn = true; dir = away >= 0 ? 1 : -1; }
        } else turn = Math.random() < 0.3;
        if (turn) {
          const other = p.axis === 'x' ? p.z : p.x;
          p.axis = p.axis === 'x' ? 'z' : 'x';
          p.at = c;
          if (p.axis === 'x') { p.z = c; p.x = other; } else { p.x = c; p.z = other; }
          p.dir = dir;
          nw = other + dir * 0.01;
          break;
        }
      }
    }
    const len = p.axis === 'x' ? info.w : info.d;
    let max = len + LANE;
    if (p.axis === 'z') max = Math.min(max, info.shore - 4);
    if (nw > max) { nw = max; p.dir = -1; }
    if (nw < -LANE) { nw = -LANE; p.dir = 1; }
    if (p.axis === 'x') { p.x = nw; p.z = p.at; p.m.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { p.z = nw; p.x = p.at; p.m.rotation.y = p.dir > 0 ? 0 : Math.PI; }
  }

  return { init, clear, update, smashed, roared, shockwave, scare, setHat, get count() { return list.length; }, list: () => list };
})();
