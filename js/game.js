// ============================================================
//  LAB 13 — THE GAME (main loop, rules, menus, ending)
// ============================================================
window.LAB = window.LAB || {};

(function () {
  const U = LAB.U;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  const G = {
    state: 'title', mode: 2, nightmare: false, god: params.has('god'),
    players: [], aliens: [], fields: [], team: { keycard: false, fuses: 0, placed: 0 },
    power: false, stats: {}, time: 0, playTime: 0,
  };
  LAB.game = G;

  // ---------- setup ----------
  const renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(LAB.lowGfx ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = !LAB.lowGfx;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.setScissorTest(true);

  let scene;
  G.hud = new LAB.HUD();
  LAB.Input.init();

  function buildWorld() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x020203, 0.07);
    scene.add(new THREE.AmbientLight(0x303848, 0.55));
    scene.add(new THREE.HemisphereLight(0x283038, 0x100808, 0.4));
    LAB.World.build(scene);
    LAB.Effects.init(scene);
    G.scene = scene;
    // reflections for metal and glass: a tiny dark "room" with a few lamps
    if (!G.envTex) {
      const pm = new THREE.PMREMGenerator(renderer);
      const es = new THREE.Scene();
      es.add(new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), new THREE.MeshBasicMaterial({ color: 0x1a1c1e, side: THREE.BackSide })));
      const lamp = (x, y, z, w, d, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: c })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
      lamp(0, 2.9, 0, 3, 0.6, 0xfff0d8); lamp(3, 2.9, -3, 2, 0.4, 0xd8e0ff); lamp(-5.9, 0.5, 2, 1.5, 1, 0x801010); lamp(4, 0, 5.9, 2, 2, 0x303840);
      G.envTex = pm.fromScene(es, 0.03).texture;
      pm.dispose();
    }
    scene.environment = G.envTex;
    scene.traverse((o) => { if (o.material && o.material.isMeshStandardMaterial) o.material.envMapIntensity = 0.45; });
  }

  // sound volume + left/right based on where it is
  G.soundAt = function (x, z, range) {
    let best = Infinity, bi = 0;
    G.players.forEach((p, i) => { const d = U.dist(p.x, p.z, x, z); if (d < best) { best = d; bi = i; } });
    const vol = Math.pow(Math.max(0, 1 - best / range), 1.5);
    let pan = 0;
    const p = G.players[bi];
    if (!p) return { vol, pan };
    if (G.players.length > 1) pan = bi === 0 ? -0.65 : 0.65;
    else { const f = p.forward(); const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz) || 1; pan = ((-f.z) * dx + f.x * dz) / d * 0.8; }
    return { vol, pan };
  };

  // Dr. Okoye talks to you over the radio (with subtitles that type out as she talks)
  // kind: 'radio' (walkie-talkie) or 'pa' (facility loudspeaker)
  let radioTimer = null, typeTimer = null;
  G.radio = function (text, who = 'DR. OKOYE', kind) {
    const el = $('radio');
    if (G.state !== 'play') return;
    const pa = kind === 'pa' || who === 'FACILITY';
    const dur = pa ? LAB.Audio.pa(text) : LAB.Audio.radioVoice(text, who === 'UNKNOWN' ? 'unknown' : 'okoye');
    const talkStart = pa ? 1.55 : 0.25;
    el.className = pa ? 'pa' : who === 'UNKNOWN' ? 'unknown' : '';
    el.innerHTML = `<b>${pa ? '🔊' : '📻'} ${who}:</b> <span></span>`;
    el.style.display = 'block';
    const span = el.querySelector('span');
    const talk = Math.max(0.5, dur - talkStart - 0.4);
    const t0 = performance.now();
    clearInterval(typeTimer);
    typeTimer = setInterval(() => {
      const k = Math.min(1, Math.max(0, ((performance.now() - t0) / 1000 - talkStart) / talk));
      span.textContent = text.slice(0, Math.ceil(text.length * k));
      if (k >= 1) clearInterval(typeTimer);
    }, 40);
    clearTimeout(radioTimer);
    radioTimer = setTimeout(() => { el.style.display = 'none'; }, Math.max(dur * 1000 + 2500, 3000 + text.length * 45));
  };
  G.radioOnce = function (key, text, who) {
    G.radioDone = G.radioDone || {};
    if (G.radioDone[key]) return;
    G.radioDone[key] = true;
    G.radio(text, who);
  };

  G.message = (i, text, t) => G.hud.message(i === null ? null : (i >= G.players.length ? null : i), text, t);

  G.spawnCrawler = function (x, z, awake) {
    const c = new LAB.Aliens.Crawler(scene, x, z, awake);
    c.game = G;
    if (awake) c.target = G.players.find((p) => p.standing) || null;
    G.aliens.push(c);
    return c;
  };

  // ---------- start a new game ----------
  function newGame(mode, nightmare) {
    buildWorld();
    G.mode = mode; G.nightmare = nightmare;
    G.team = { keycard: false, fuses: 0, placed: 0 };
    G.power = false; G.playTime = 0; G.ending = null;
    G.stats = { kills: 0, notes: 0, revives: 0, scares: 0 };
    G.players = [];
    for (let i = 0; i < mode; i++) G.players.push(new LAB.Player(i, scene, G));
    G.aliens = [];
    for (const s of LAB.World.spawns.C) G.spawnCrawler(s.x, s.z, false);
    for (const s of LAB.World.spawns.T) { const h = new LAB.Aliens.Spitter(scene, s.x, s.z); h.game = G; G.aliens.push(h); }
    G.projectiles = [];
    for (const s of LAB.World.spawns.Z) { const h = new LAB.Aliens.Husk(scene, s.x, s.z); h.game = G; G.aliens.push(h); }
    for (const s of LAB.World.spawns.Q) { const h = new LAB.Aliens.Hanger(scene, s.x, s.z); h.game = G; G.aliens.push(h); }
    const ss = LAB.World.spawns.S[0];
    G.stalker = null;
    if (ss) { G.stalker = new LAB.Aliens.Stalker(scene, ss.x, ss.z); G.stalker.game = G; G.aliens.push(G.stalker); }
    G.scaresys = new LAB.Scares(scene, G);
    G.fieldT = 0; G.spawnT = 60; G.lastZone = [null, null]; G.radioDone = {};
    G.lives = nightmare ? 0 : 2;
    G.saveCheckpoint();
    G.explored = new Uint8Array(LAB.World.w * LAB.World.h);
    G.hud.halves.forEach((h, i) => G.hud.toggleMap(i, false));
    // every world light also lights the hands (layer 5 is used by the hands pass)
    scene.traverse((o) => { if (o.isLight && o.layers.isEnabled(0)) o.layers.enable(5); });
    G.hud.layout(mode);
    resize();
  }

  // ---------- rules ----------
  G.objective = function () {
    const t = G.team;
    if (G.ending) return 'ESCAPE!';
    if (G.power) return G.mode > 1 ? '▶ GET TO THE SURFACE LIFT — BOTH OF YOU!' : '▶ GET TO THE SURFACE LIFT!';
    if (!t.keycard) return '▶ Find the SECURITY KEYCARD (Security Office)';
    if (t.fuses + t.placed < 3) return `▶ Find the 3 FUSES (${t.fuses + t.placed}/3)` + (t.fuses ? ' — or put them in the GENERATOR' : '');
    return '▶ Put the fuses in the GENERATOR';
  };

  G.promptFor = function (p) {
    if (!p.standing) return '';
    const useKey = LAB.Input.pads[p.i] !== null ? '[A]' : (G.mode === 1 ? '[R]' : (p.i === 0 ? '[R]' : '[/]'));
    const o = G.players[1 - p.i];
    if (o && o.downed && U.dist(p.x, p.z, o.x, o.z) < 2.0) return `HOLD ${useKey} TO REVIVE PARTNER`;
    const gen = LAB.World.generator;
    if (gen && U.dist(p.x, p.z, gen.x, gen.z + 1.4) < 1.8 && !G.power) {
      return G.team.fuses ? `${useKey} INSERT FUSES (${G.team.placed}/3 placed)` : `GENERATOR: ${G.team.placed}/3 FUSES`;
    }
    for (const type of ['B', 'H']) for (const b of LAB.World.buttons[type]) {
      if (U.dist(p.x, p.z, b.x, b.z) < 1.8) {
        const d = LAB.World.doors.find((dd) => dd.type === type);
        if (d && d.stayOpen) return '';
        return G.mode > 1 ? `HOLD ${useKey} — your partner must hold the other button!` : `${useKey} PRESS — then run to the other button in time!`;
      }
    }
    for (const d of LAB.World.doors) {
      if (U.dist(p.x, p.z, d.x, d.z) > 2.6) continue;
      if (d.type === 'D' && !G.team.keycard) return 'LOCKED — needs the SECURITY KEYCARD';
      if (d.type === 'P' && !G.power) return 'LIFT OFFLINE — no power';
      if ((d.type === 'B' || d.type === 'H') && !d.stayOpen) return '2-PERSON LOCK — hold both buttons';
    }
    if (p.grabbedBy) return 'ATTACK TO BREAK FREE!';
    return '';
  };

  // ---------- checkpoints ----------
  G.saveCheckpoint = function () {
    G.checkpoint = G.players.map((p) => ({ x: p.x, z: p.z, yaw: p.yaw }));
  };
  function continueGame() {
    G.lives--;
    $('end').style.display = 'none';
    G.players.forEach((p, i) => {
      const c = G.checkpoint[i] || G.checkpoint[0];
      if (p.grabbedBy) p.grabbedBy.release();
      p.x = c.x + (i ? 0.6 : 0); p.z = c.z; p.yaw = c.yaw;
      p.hp = 100; p.downed = false; p.dead = false; p.bleed = 0; p.battery = 100; p.flashOn = true; p.stamina = 100;
    });
    // monsters near the checkpoint go away
    for (const a of G.aliens) {
      if (!a.alive || a.type === 'hanger') continue;
      const near = G.players.some((p) => U.dist(p.x, p.z, a.x, a.z) < 14);
      if (a.type === 'stalker') { if (a.state !== 'dormant') { a.state = 'flee'; a.fleeT = 10; a.cool = 20; a.pickWaypoint(G, true); } }
      else if (near) { a.alive = false; a.model.visible = false; }
    }
    G.state = 'play'; G.allDownT = 0;
    G.hud.show(true);
    LAB.Audio.startAmbience();
    if (G.power) { LAB.Audio.startGenerator(); LAB.Audio.startAlarm(); }
    G.message(null, `You got back up... (${G.lives} ${G.lives === 1 ? 'life' : 'lives'} left)`, 4);
    const cv = $('game');
    cv.style.transition = 'none'; cv.style.filter = 'blur(8px) brightness(0.3)';
    requestAnimationFrame(() => requestAnimationFrame(() => { cv.style.transition = 'filter 3s ease-out'; cv.style.filter = 'none'; }));
    last = performance.now();
  }

  function pickups() {
    for (const it of LAB.World.items) {
      if (it.taken) continue;
      for (const p of G.players) {
        if (!p.standing || U.dist(p.x, p.z, it.x, it.z) > 1.3) continue;
        const pan = G.mode > 1 ? (p.i ? 0.6 : -0.6) : 0;
        let take = true;
        if (it.type === 'K') {
          G.team.keycard = true;
          G.saveCheckpoint();
          G.message(null, (p.i ? 'PARK' : 'REYES') + ' found the SECURITY KEYCARD!');
          setTimeout(() => G.radioOnce('key', 'You got the keycard! The three fuses are in RESEARCH, the MEDBAY and MAINTENANCE. Put them in the generator. And... it knows you are awake now.'), 7000);
          // the breach!
          setTimeout(() => { if (G.state === 'play' && G.stalker) { G.stalker.wake(G); G.radio('Warning. Specimen 13 has left containment.', 'FACILITY', 'pa'); LAB.Audio.screech(0.5, 0, true); G.message(null, 'Something BIG is awake... Keep your flashlights ready.', 5); } }, 3500);
        } else if (it.type === 'F') {
          G.team.fuses++;
          G.saveCheckpoint();
          G.message(null, `FUSE found! (${G.team.fuses + G.team.placed}/3)`);
          const got = G.team.fuses + G.team.placed;
          if (got === 1) G.radioOnce('f1', 'One fuse! Good. If the tall one comes, shine your flashlight right at it. It cannot move in the light.');
          if (got === 3) G.radioOnce('f3', 'That is all three! The GENERATOR is in the middle of the lab. Go!');
        } else if (it.type === 'A') {
          if (p.battery > 95) take = false; else { p.battery = Math.min(100, p.battery + 60); G.message(p.i, 'Battery +60%'); }
        } else if (it.type === 'M') {
          if (p.hp > 95) take = false; else { p.heal(50); G.message(p.i, 'Medkit +50 health'); }
        } else if (it.type === 'N') {
          G.hud.showNote(p.i, it.note); G.stats.notes++; p.noteItem = it;
          LAB.Audio.noteSound(pan);
        }
        if (take) {
          it.taken = true; it.model.visible = false;
          if (it.type !== 'N') LAB.Audio.pickup(pan);
          break;
        }
      }
    }
    // close notes when walking away
    G.players.forEach((p, i) => { if (p.noteItem && U.dist(p.x, p.z, p.noteItem.x, p.noteItem.z) > 3.5) { G.hud.closeNote(i); p.noteItem = null; } });
  }

  function generatorUse() {
    const gen = LAB.World.generator;
    if (!gen || G.power) return;
    for (const p of G.players) {
      if (!p.standing || !p.input || !p.input.usePressed) continue;
      if (U.dist(p.x, p.z, gen.x, gen.z + 1.4) > 1.8 || G.team.fuses <= 0) continue;
      while (G.team.fuses > 0 && G.team.placed < 3) { gen.fuses[G.team.placed].visible = true; G.team.placed++; G.team.fuses--; }
      LAB.Audio.clang(0); LAB.Audio.beep(0);
      if (G.team.placed >= 3) powerOn();
      else G.message(null, `Fuses in the generator: ${G.team.placed}/3`);
    }
  }

  function powerOn() {
    G.power = true;
    G.saveCheckpoint();
    LAB.Audio.startGenerator();
    setTimeout(() => LAB.Audio.startAlarm(), 1500);
    G.radio('Power restored. Surface lift online. Warning: all specimens released.', 'FACILITY', 'pa');
    setTimeout(() => G.radioOnce('power', 'The lights! You did it! The LIFT is at the south end. I will meet you th... wait. Something is in here with me... no... NO...'), 10000);
    setTimeout(() => { if (G.state === 'play') { LAB.Audio.stopVoice(); LAB.Audio.radioStatic(1.2); LAB.Audio.scream(0.5, 0); } }, 19500);
    G.message(null, 'POWER IS BACK! GET TO THE LIFT! RUN!', 6);
    LAB.Effects.sparks(LAB.World.generator.x, 2, LAB.World.generator.z, 60);
    if (G.stalker) {
      G.stalker.wake(G);
      G.stalker.cool = 0; G.stalker.state = 'hunt';
      G.stalker.target = G.players.find((p) => p.standing);
    }
    // more crawlers pour out
    const far = LAB.World.floorCells.filter(([x, y]) => G.players.every((p) => U.dist(p.x, p.z, U.cellToWorld(x), U.cellToWorld(y)) > 16) && LAB.World.passable(x, y));
    for (let i = 0; i < (G.nightmare ? 6 : 4); i++) { const c = U.pick(far); if (c) G.spawnCrawler(U.cellToWorld(c[0]), U.cellToWorld(c[1]), true); }
  }

  // acid blobs flying through the air
  function updateProjectiles(dt) {
    for (let i = G.projectiles.length - 1; i >= 0; i--) {
      const b = G.projectiles[i];
      b.vy -= 14 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.model.position.set(b.x, b.y, b.z);
      let hit = null;
      for (const p of G.players) if (p.standing && U.dist(p.x, p.z, b.x, b.z) < 0.55 && b.y < 2.0) hit = p;
      const wall = LAB.World.isWall(U.worldToCell(b.x), U.worldToCell(b.z)) || b.y <= 0.05 || b.y > LAB.WALL_H;
      if (hit || wall) {
        const s = G.soundAt(b.x, b.z, 18);
        LAB.Audio.sizzle(s.vol, s.pan); LAB.Audio.splat(s.vol * 0.5, s.pan);
        LAB.Effects.blood(b.x, Math.max(0.1, b.y), b.z, 18, true, 0.8);
        LAB.World.addBlood(b.x, b.z, 1.3, true);
        if (hit) {
          hit.damage(G.nightmare ? 16 : 11, b.x - b.vx * 0.1, b.z - b.vz * 0.1);
          G.hud.acid(hit.i);
        }
        G.scene.remove(b.model);
        G.projectiles.splice(i, 1);
      }
    }
  }

  function checkScares() {
    for (const s of LAB.World.scares) {
      if (s.done) continue;
      const p = G.players.find((pp) => pp.standing && pp.cx === s.cx && pp.cy === s.cy);
      if (p) { s.done = true; G.scaresys.trigger(s.type, p); }
    }
  }

  function checkElevator() {
    const el = LAB.World.elevator;
    if (!el || !G.power || G.ending) return;
    const inside = (p) => p.standing && p.cx >= el.minX && p.cx <= el.maxX && p.cy >= el.minY && p.cy <= el.maxY;
    const n = G.players.filter(inside).length;
    if (n === G.players.length) startEnding();
    else if (n > 0) G.players.forEach((p) => { if (inside(p)) G.hud.halves[p.i].prompt.textContent = 'WAIT FOR YOUR PARTNER!'; });
  }

  function startEnding() {
    G.ending = { t: 0 };
    setTimeout(() => G.radioOnce('end', '...Reyes... Park... it is not in here anymore... it is on the ROOF of the lift...', 'UNKNOWN'), 4200);
    G.message(null, 'THE LIFT IS MOVING...', 4);
    LAB.Audio.elevator();
    G.radio('Surface lift ascending.', 'FACILITY', 'pa');
  }

  function updateEnding(dt) {
    const e = G.ending, el = LAB.World.elevator;
    e.t += dt;
    const gate = el.model.userData.gate;
    gate.position.y = Math.max(LAB.WALL_H, gate.position.y - dt * 2);
    if (e.t > 2) {
      const rise = (e.t - 2) * (e.t - 2) * 0.6;
      el.model.position.y = rise;
      G.players.forEach((p) => { p.liftY = rise; p.cam.position.y = 1.62 + rise; p.body.position.y = rise; });
      el.light.position.y = LAB.WALL_H - 0.4 + rise;
    }
    // claws punch through the roof!
    if (e.t > 6.3 && !e.claws) {
      e.claws = [];
      G.players.forEach((p, i) => {
        const c = LAB.Models.claw();
        const f = p.forward();
        c.userData.lx = (p.x + f.x * 1.3) - el.x; c.userData.lz = (p.z + f.z * 1.3) - el.z;
        c.position.set(c.userData.lx, LAB.WALL_H + 1.2, c.userData.lz);
        c.rotation.y = Math.atan2(p.x - (p.x + f.x), p.z - (p.z + f.z)) + (i ? 0.4 : -0.4);
        el.model.add(c);
        e.claws.push({ c, t: -i * 0.6, p });
      });
    }
    if (e.claws) for (const k of e.claws) {
      k.t += dt;
      if (k.t < 0) continue;
      const y = LAB.WALL_H + 1.2 - Math.min(1, k.t / 0.18) * 1.9;
      k.c.position.y = y + Math.sin(G.time * 30) * 0.02 * (k.t < 1 ? 1 : 0);
      if (!k.hit && k.t > 0.18) {
        k.hit = true;
        LAB.Audio.clang(0); LAB.Audio.scream(1, G.mode > 1 ? (k.p.i ? 0.6 : -0.6) : 0);
        LAB.Effects.sparks(el.x + k.c.userData.lx, LAB.WALL_H + el.model.position.y - 0.1, el.z + k.c.userData.lz, 40);
        k.p.shake = 1.5; G.hud.flash(k.p.i, 'rgba(160,0,0,0.6)'); LAB.Input.rumble(k.p.i, 1, 900);
      }
    }
    if (e.t > 6 && !e.bang) {
      e.bang = true;
      LAB.Audio.thud(1, 0); setTimeout(() => LAB.Audio.thud(1, 0.3), 500); setTimeout(() => { LAB.Audio.scream(0.8, 0); LAB.Audio.clang(0); }, 1100);
      G.players.forEach((p) => { p.shake = 1.5; LAB.Input.rumble(p.i, 1, 800); G.hud.bloodSplat(p.i, 30); });
      G.message(null, 'SOMETHING IS ON THE ROOF!', 3);
    }
    if (e.t > 9.2 && !e.done) { e.done = true; finish(true); }
  }

  G.onPlayerDied = function (p) {
    if (G.state !== 'play') return;
    finish(false, (p.i === 0 ? 'Dr. Reyes' : 'Officer Park') + ' bled out.');
  };

  function finish(win, reason) {
    G.state = win ? 'win' : 'dead';
    LAB.Audio.stopAll();
    if (document.pointerLockElement) document.exitPointerLock();
    const t = Math.floor(G.playTime), mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
    const statsHtml = `<div class="endstats">TIME ${mm}:${ss} · ALIENS KILLED ${G.stats.kills} · NOTES ${G.stats.notes}/${LAB.NOTES.length}${G.mode > 1 ? ' · REVIVES ' + G.stats.revives : ''}</div>`;
    // best escape time (saved in this browser)
    let record = '';
    if (win) {
      const key = 'lab13.best.' + G.mode + (G.nightmare ? 'n' : '');
      let best = null;
      try { best = +localStorage.getItem(key) || null; } catch (e) { /* */ }
      if (!best || t < best) { record = '<div class="record">★ NEW RECORD! ★</div>'; try { localStorage.setItem(key, t); } catch (e) { /* */ } }
      else record = `<div class="endstats">BEST: ${Math.floor(best / 60)}:${String(best % 60).padStart(2, '0')}</div>`;
    }
    const box = $('end');
    if (win) {
      box.className = 'screen win';
      box.innerHTML = `<h1>YOU ESCAPED<br>LAB 13</h1>${statsHtml}${record}
        <p class="twist">The lift reached the surface at 04:02 AM.<br>Nobody checked the roof of the lift.<br><br><b>Specimen 13 is free.</b></p>
        <p class="blink">Press ENTER / A to play again</p>`;
      setTimeout(() => LAB.Audio.pa('Surface level. Welcome home.'), 600);
    } else {
      box.className = 'screen dead';
      G.canContinue = G.lives > 0;
      box.innerHTML = `<h1>YOU DIED</h1><p>${reason || 'Lab 13 claimed two more victims.'}</p>${statsHtml}` +
        (G.canContinue ? `<p class="lives">${'❤ '.repeat(G.lives)}</p><p class="blink">Press ENTER / A to CONTINUE from the last checkpoint</p><p class="hint">(Q / B to give up)</p>`
          : `<p class="blink">Press ENTER / A to try again</p>`);
      LAB.Audio.scream(0.8, 0);
    }
    box.style.display = 'flex';
    $('radio').style.display = 'none';
    G.hud.show(false);
    G.endLock = 1.5;
  }

  // ---------- main loop ----------
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    G.time += dt;
    LAB.Input.pollJoin();
    if (G.state === 'title') { titleUpdate(dt); titleRender(dt); return; }
    if (G.state === 'intro') { introUpdate(dt); }
    if (G.state === 'play' || G.state === 'intro') {
      if (G.state === 'play') update(dt);
      render();
    } else if (G.state === 'win' || G.state === 'dead') {
      G.endLock -= dt;
      const i0 = LAB.Input.read(0), i1 = LAB.Input.read(1);
      const go = LAB.Input.isDown('Enter') || LAB.Input.isDown('Space') || i0.usePressed || i1.usePressed;
      const quit = LAB.Input.isDown('KeyQ') || LAB.Input.isDown('Escape') || (i0.map && i0.pad) || (i1.map && i1.pad);
      if (G.endLock <= 0 && G.state === 'dead' && G.canContinue && go) continueGame();
      else if (G.endLock <= 0 && (go || (G.state === 'dead' && quit))) toTitle();
      render();
    } else if (G.state === 'paused') {
      pauseUpdate();
    }
  }

  function update(dt) {
    G.playTime += dt;
    // input
    const inputs = G.players.map((p, i) => LAB.Input.read(i));
    if (G.mode === 1) { // one player can use either side of the keyboard + any pad
      const b = LAB.Input.read(1);
      const a = inputs[0];
      for (const k of ['move', 'strafe', 'turn', 'look']) a[k] = U.clamp(a[k] + b[k], -1, 1);
      for (const k of ['sprint', 'flash', 'attack', 'use', 'map', 'attackPressed', 'usePressed', 'flashPressed', 'pausePressed', 'mapPressed', 'pad']) a[k] = a[k] || b[k];
    }
    if (inputs.some((s) => s.pausePressed) || LAB.Input.isDown('Escape') || LAB.Input.isDown('KeyP')) { pause(); return; }

    if (G.wakeT > 0) { // still getting up off the floor
      G.wakeT -= dt;
      inputs.forEach((s) => { s.move = s.strafe = s.turn = s.look = 0; s.lookDX = s.lookDY = 0; s.attackPressed = s.attack = false; });
    }
    G.players.forEach((p, i) => p.update(dt, inputs[i], G.time));

    // paths toward each player (for the aliens)
    G.fieldT -= dt;
    if (G.fieldT <= 0) { G.fieldT = 0.4; G.fields = G.players.map((p) => LAB.World.flowField(p.cx, p.cy)); }

    if (!G.ending) for (const a of G.aliens) a.update(dt, G.time, G);
    updateProjectiles(dt);
    G.players.forEach((p) => { p.lastX = p.x; p.lastZ = p.z; });
    LAB.Aliens.separate(G.aliens);

    // new crawlers sometimes crawl out of the vents
    G.spawnT -= dt;
    if (G.spawnT <= 0) {
      G.spawnT = G.power ? 22 : U.rand(45, 75);
      const alive = G.aliens.filter((a) => a.type === 'crawler' && a.alive).length;
      if (alive < (G.nightmare ? 8 : 5)) {
        const far = LAB.World.floorCells.filter(([x, y]) => LAB.World.passable(x, y) && G.players.every((p) => U.dist(p.x, p.z, U.cellToWorld(x), U.cellToWorld(y)) > 18));
        const c = U.pick(far);
        if (c) G.spawnCrawler(U.cellToWorld(c[0]), U.cellToWorld(c[1]), G.power);
      }
    }
    // the Stalker wakes up by itself after a while
    if (G.stalker && G.stalker.state === 'dormant' && G.playTime > (G.nightmare ? 90 : 200)) { G.stalker.wake(G); G.radio('Warning. Specimen 13 has left containment.', 'FACILITY', 'pa'); }

    pickups();
    generatorUse();
    checkScares();
    checkElevator();
    if (G.ending) updateEnding(dt);
    G.scaresys.update(dt, G.time);
    LAB.World.update(dt, G.time, G);
    LAB.Effects.update(dt);

    // remember which parts of the lab we've seen (for the map)
    G.exploreT = (G.exploreT || 0) - dt;
    if (G.exploreT <= 0) {
      G.exploreT = 0.25;
      const W = LAB.World;
      for (const p of G.players) {
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
          const x = p.cx + dx, y = p.cy + dy;
          if (x < 0 || y < 0 || x >= W.w || y >= W.h || G.explored[y * W.w + x]) continue;
          if (dx * dx + dy * dy <= 17 && W.los(p.x, p.z, LAB.U.cellToWorld(x), LAB.U.cellToWorld(y))) G.explored[y * W.w + x] = 1;
        }
      }
    }
    G.players.forEach((p, i) => { if (inputs[i].mapPressed) G.hud.toggleMap(i); });

    // area names
    G.players.forEach((p, i) => {
      const z = LAB.World.zoneAt(p.cx, p.cy);
      if (z && z !== G.lastZone[i]) { G.lastZone[i] = z; G.hud.zone(i, z.name); }
    });

    // heartbeat: how close is danger?
    let fear = 0;
    for (const p of G.players) {
      if (!p.standing) continue;
      for (const a of G.aliens) {
        if (!a.alive || a.state === 'dormant') continue;
        const d = U.dist(p.x, p.z, a.x, a.z);
        if (a.type === 'stalker') fear = Math.max(fear, U.clamp(1 - d / 16, 0, 1));
        else if ((a.type === 'crawler' || a.type === 'husk' || a.type === 'spitter') && a.state !== 'idle') fear = Math.max(fear, U.clamp(1 - d / 10, 0, 0.6));
      }
      if (p.hp < 30) fear = Math.max(fear, 0.35);
    }
    LAB.Audio.updateHeart(dt, fear);
    // chase music: is something hunting us right now?
    let chase = 0;
    for (const a of G.aliens) {
      if (!a.alive || !a.target || !a.target.standing) continue;
      const d = U.dist(a.x, a.z, a.target.x, a.target.z);
      if (a.type === 'stalker' && (a.state === 'hunt' || a.state === 'frozen')) chase = Math.max(chase, U.clamp(1.3 - d / 22, 0.35, 1));
      else if ((a.type === 'crawler' || a.type === 'husk' || a.type === 'spitter') && a.state === 'chase') chase = Math.max(chase, U.clamp(0.6 - d / 20, 0, 0.4));
    }
    LAB.Audio.chase(G.ending ? 0 : chase);
    G.fear = fear;

    // both players down = game over
    if (G.players.every((p) => p.downed)) {
      G.allDownT = (G.allDownT || 0) + dt;
      if (G.allDownT > 2) finish(false, G.mode > 1 ? 'Nobody was left to help.' : 'Nobody was there to help you.');
    } else G.allDownT = 0;

    G.hud.update(dt, G);
  }

  function render() {
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    renderer.shadowMap.needsUpdate = true;
    const n = G.players.length;
    G.players.forEach((p, i) => {
      const vw = Math.floor(w / n), vx = i * vw;
      p.cam.aspect = vw / h;
      p.cam.fov = n > 1 ? 70 : 68;
      p.cam.updateProjectionMatrix();
      renderer.setViewport(vx, 0, vw, h);
      renderer.setScissor(vx, 0, vw, h);
      renderer.render(scene, p.cam);
      // second pass: my own hands (and jump-scare faces) on top, so they never go through walls
      const mask = p.cam.layers.mask;
      p.cam.layers.mask = (1 << p.vmLayer) | (1 << 5);
      const bg = scene.background;
      scene.background = null; // don't paint over the world
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(scene, p.cam);
      renderer.autoClear = true;
      scene.background = bg;
      p.cam.layers.mask = mask;
    });
  }

  // ---------- menus ----------
  const menu = { sel: 0, items: [], lockT: 0 };
  // a creepy 3D scene behind the title menu
  let titleScene = null;
  function titleRender(dt) {
    if (!titleScene) {
      const sc = new THREE.Scene();
      sc.fog = new THREE.FogExp2(0x000000, 0.18);
      sc.background = new THREE.Color(0x000000);
      const st = LAB.Models.stalker();
      st.position.set(3.0, 0, -0.5); st.rotation.y = -0.6;
      sc.add(st);
      const cr = LAB.Models.crawler(); cr.position.set(-2.8, 0, 1.4); cr.rotation.y = 0.7; sc.add(cr);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ map: LAB.Tex.floorMetal(), roughness: 0.5, metalness: 0.5 }));
      floor.material.map.repeat.set(12, 12);
      floor.rotation.x = -Math.PI / 2; sc.add(floor);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), new THREE.MeshStandardMaterial({ map: LAB.Tex.wallConcrete(), roughness: 0.9 }));
      back.material.map = back.material.map.clone(); back.material.map.repeat.set(8, 2); back.material.map.needsUpdate = true;
      back.position.set(0, 4, -4); sc.add(back);
      const red = new THREE.PointLight(0xff2010, 30, 14, 1.5); red.position.set(3, 3, 2); sc.add(red);
      const cold = new THREE.SpotLight(0x8098c0, 40, 20, 0.5, 0.6, 1.2); cold.position.set(-4, 5, 5); cold.target = st; sc.add(cold);
      sc.add(new THREE.AmbientLight(0x202020, 0.4));
      const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 50);
      titleScene = { sc, st, cr, red, cam, t: 0 };
    }
    const T = titleScene;
    T.t += dt;
    T.cam.aspect = window.innerWidth / window.innerHeight; T.cam.updateProjectionMatrix();
    T.cam.position.set(Math.sin(T.t * 0.1) * 1.5, 1.6, 6 - Math.sin(T.t * 0.07));
    T.cam.lookAt(0.3, 1.5, 0);
    LAB.Models.animateStalker(T.st, T.t * 0.6, 0.4, Math.sin(T.t * 0.5) > 0.7, Math.sin(T.t * 0.3) > 0.8);
    LAB.Models.animateCrawler(T.cr, T.t, 0, Math.sin(T.t * 2) > 0.5);
    const n = Math.sin(T.t * 11) + Math.sin(T.t * 23.1) + Math.sin(T.t * 3.3);
    T.red.intensity = n > 1.8 ? 2 : 30 + Math.sin(T.t * 2) * 8;
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h);
    renderer.render(T.sc, T.cam);
  }

  function titleUpdate(dt) {
    menu.lockT -= dt;
    const i0 = LAB.Input.read(0), i1 = LAB.Input.read(1);
    const up = i0.move > 0.5 || i1.move > 0.5, down = i0.move < -0.5 || i1.move < -0.5;
    const left = i0.turn < -0.5 || i1.turn < -0.5 || i0.strafe < -0.5 || i1.strafe < -0.5;
    const right = i0.turn > 0.5 || i1.turn > 0.5 || i0.strafe > 0.5 || i1.strafe > 0.5;
    if (menu.lockT <= 0) {
      if (up) { menu.sel = (menu.sel + menu.items.length - 1) % menu.items.length; menu.lockT = 0.2; drawMenu(); LAB.Audio.ready && LAB.Audio.beep(); }
      if (down) { menu.sel = (menu.sel + 1) % menu.items.length; menu.lockT = 0.2; drawMenu(); LAB.Audio.ready && LAB.Audio.beep(); }
      if ((left || right) && menu.items[menu.sel].id === 'diff') { G.nightmare = !G.nightmare; menu.lockT = 0.25; drawMenu(); }
    }
    if (i0.usePressed || i1.usePressed || i0.attackPressed || i1.attackPressed) choose(menu.items[menu.sel].id);
    // show which controllers belong to which player
    const pads = LAB.Input.pads;
    $('padinfo').innerHTML = [0, 1].map((i) => `<span>P${i + 1}: ${pads[i] !== null ? '🎮 CONTROLLER ' + (pads[i] + 1) : '⌨ KEYBOARD'}</span>`).join('');
  }

  function drawMenu() {
    menu.items = [
      { id: 'p1', label: '1 PLAYER' },
      { id: 'p2', label: '2 PLAYERS · SPLIT SCREEN' },
      { id: 'diff', label: 'DIFFICULTY: ' + (G.nightmare ? '☠ NIGHTMARE ☠' : 'NORMAL') },
      { id: 'gfx', label: 'GRAPHICS: ' + (LAB.lowGfx ? 'LOW (FAST)' : 'HIGH') },
      { id: 'controls', label: 'CONTROLS' },
    ];
    $('menu').innerHTML = menu.items.map((it, i) => `<div class="mi ${i === menu.sel ? 'sel' : ''}" data-id="${it.id}">${it.label}</div>`).join('');
    $('menu').querySelectorAll('.mi').forEach((el, i) => {
      el.onclick = () => { menu.sel = i; choose(el.dataset.id); };
      el.onmouseenter = () => { menu.sel = i; drawMenu(); };
    });
  }

  function choose(id) {
    LAB.Audio.init();
    if (id === 'p1' || id === 'p2') startIntro(id === 'p1' ? 1 : 2);
    else if (id === 'diff') { G.nightmare = !G.nightmare; drawMenu(); }
    else if (id === 'gfx') {
      try { localStorage.setItem('lab13.gfx', LAB.lowGfx ? 'high' : 'low'); } catch (e) { /* */ }
      if (location.search.includes('low')) location.search = ''; else location.reload();
    }
    else if (id === 'controls') $('controls').style.display = $('controls').style.display === 'block' ? 'none' : 'block';
  }

  function startIntro(mode) {
    $('title').style.display = 'none';
    $('controls').style.display = 'none';
    $('loading').style.display = 'flex';
    setTimeout(() => {
      newGame(mode, G.nightmare);
      $('loading').style.display = 'none';
      G.state = 'intro';
      G.introT = 0;
      G.hud.show(false);
      const intro = $('intro');
      intro.style.display = 'flex';
      intro.style.opacity = 1;
      const lines = [
        'KESSLER DEEP RESEARCH FACILITY',
        'SUBLEVEL 13 · 900 METERS UNDERGROUND',
        '03:13 AM',
        '',
        'STASIS POWER FAILURE . . .',
        'WAKING SUBJECTS: ' + (mode > 1 ? 'R-07 REYES, P-02 PARK' : 'R-07 REYES'),
      ];
      intro.innerHTML = '<div class="typed"></div><div class="skip">press any key to skip</div>';
      G.introText = lines.join('\n');
      LAB.Audio.startAmbience();
      setTimeout(() => LAB.Audio.pa('Stasis power failure. Waking subjects.'), 800);
      warmup();
      render();
    }, 50);
  }

  // prepare every material now, so nothing stutters when a monster first appears
  function warmup() {
    const extra = [LAB.Models.scareFace(), LAB.Models.corpse('deadcoat'), LAB.Models.crawler()];
    extra.forEach((m) => { m.position.set(-50, 0, -50); scene.add(m); });
    const hidden = [];
    scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
    try { G.players.forEach((p) => renderer.compile(scene, p.cam)); } catch (e) { /* older browsers */ }
    hidden.forEach((o) => (o.visible = false));
    extra.forEach((m) => scene.remove(m));
  }

  function introUpdate(dt) {
    G.introT += dt;
    const n = Math.floor(G.introT * 28);
    const el = document.querySelector('#intro .typed');
    if (el) el.textContent = G.introText.slice(0, n);
    const keyed = LAB.Input.keys.size > 0 || G.players.some((p, i) => { const s = LAB.Input.read(i); return s.usePressed || s.attackPressed; });
    if ((G.introT > 1 && keyed) || G.introT > 10) {
      G.state = 'play';
      $('intro').style.transition = 'opacity 2s';
      $('intro').style.opacity = 0;
      setTimeout(() => { $('intro').style.display = 'none'; $('intro').style.transition = ''; }, 2000);
      G.hud.show(true);
      G.wakeT = 4.5;
      const cv = $('game');
      cv.style.transition = 'none'; cv.style.filter = 'blur(10px) brightness(0.25)';
      requestAnimationFrame(() => requestAnimationFrame(() => { cv.style.transition = 'filter 5s ease-out'; cv.style.filter = 'blur(0px) brightness(1)'; }));
      setTimeout(() => { cv.style.filter = ''; cv.style.transition = ''; }, 5600);
      G.message(null, G.mode > 1 ? 'You both wake up in the dark... Stick together.' : 'You wake up in the dark... alone.', 5);
      setTimeout(() => { if (G.state === 'play') G.radio('...anyone? Is anyone awake? The stasis pods failed... You have to get out. The SECURITY KEYCARD is in the Security Office, up the corridor. Please hurry.'); }, 7000);
      LAB.Audio.thud(0.6, 0);
    }
    G.players.forEach((p) => p.placeCamera(dt, G.time, 1.62));
    LAB.World.update(dt, G.time, G);
  }

  function pause() {
    G.state = 'paused';
    $('pause').style.display = 'flex';
    if (document.pointerLockElement) document.exitPointerLock();
    G.pauseLock = 0.3;
    LAB.Input.keys.delete('Escape'); LAB.Input.keys.delete('KeyP');
  }
  function pauseUpdate() {
    G.pauseLock -= 1 / 60;
    const i0 = LAB.Input.read(0), i1 = LAB.Input.read(1);
    if (G.pauseLock > 0) return;
    if (LAB.Input.isDown('Escape') || LAB.Input.isDown('KeyP') || LAB.Input.isDown('Enter') || i0.pausePressed || i1.pausePressed || i0.usePressed || i1.usePressed) resume();
    if (LAB.Input.isDown('KeyQ') || LAB.Input.isDown('Backspace')) { $('pause').style.display = 'none'; toTitle(); }
  }
  function resume() {
    G.state = 'play';
    $('pause').style.display = 'none';
    LAB.Input.keys.clear();
    last = performance.now();
  }
  $('resumeBtn').onclick = resume;
  $('quitBtn').onclick = () => { $('pause').style.display = 'none'; toTitle(); };

  function toTitle() {
    LAB.Audio.stopAll();
    LAB.Audio.stopVoice();
    clearInterval(typeTimer);
    $('end').style.display = 'none';
    $('radio').style.display = 'none';
    $('title').style.display = 'flex';
    G.hud.show(false);
    G.state = 'title';
    menu.lockT = 0.4;
    drawMenu();
  }

  // P1 can click to use the mouse
  $('game').addEventListener('click', () => {
    if (G.state === 'play' && !document.pointerLockElement) { try { $('game').requestPointerLock(); } catch (e) { /* */ } }
  });

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    G.hud.resize();
  }
  window.addEventListener('resize', resize);
  LAB.Input.onAnyPress(() => LAB.Audio.init());

  // test helpers (for the ?debug URL)
  G.debug = { newGame, startIntro, powerOn, finish, render, update: (dt) => update(dt), cont: () => continueGame() };

  drawMenu();
  resize();
  G.hud.show(false);
  requestAnimationFrame(frame);
  if (params.has('solo') || params.has('duo')) startIntro(params.has('solo') ? 1 : 2);
})();
