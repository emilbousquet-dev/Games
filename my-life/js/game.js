// ============================================================
//  MY LIFE — THE GAME
//  Picks this year's moments, shows the choices, plays them
//  in 3D, then AGE UP for the next birthday... until the end.
// ============================================================
window.ML = window.ML || {};

ML.Game = (function () {
  const U = ML.U, Life = ML.Life, Stage = ML.Stage, Mo = ML.Models;
  const $ = (id) => document.getElementById(id);
  let cast = {};            // who is in the current moment
  let state = 'title';      // title | creator | moment | idle | busy | end
  let nextResolve = null;
  let choiceResolve = null;
  const TYPE_EMOJI = { good: '😇', evil: '😈', funny: '🤡', say: '💬' };
  const STAT_EMOJI = { health: '❤️', happy: '😊', smarts: '🧠', looks: '✨', money: '💰' };
  const PERSONA_REACT = { good: '😊', evil: '😨', funny: '😆' };

  // ============================================================
  //  TEXT — {me}, {mom}, {a}, {pet} ... become real names
  // ============================================================
  function fill(text) {
    const L = Life.L;
    if (!L) return text;
    if (typeof text === 'function') text = text(L, api);
    if (typeof text !== 'string') return '';
    return text.replace(/\{(\w+)\}/g, (m, k) => {
      if (k === 'me') return L.first;
      if (k === 'full') return L.first + ' ' + L.last;
      if (cast[k] && cast[k].name) return cast[k].name;
      if (k === 'mom' || k === 'dad' || k === 'sib') { const p = Life.person(k); return p ? p.name : k; }
      if (k === 'pet') return L.pets[0] ? L.pets[0].name : 'your pet';
      if (k === 'petKind') return L.pets[0] ? Life.PETS[L.pets[0].kind].name.toLowerCase() : 'pet';
      if (k === 'job') return Life.jobTitle();
      if (k === 'company') return Life.jobInfo() ? Life.jobInfo().name : 'work';
      if (k === 'age') return String(L.age);
      if (k === 'sibRel') { const s = Life.person('sib'); return s ? (s.gender === 'f' ? 'sister' : 'brother') : 'sibling'; }
      if (k === 'money') return U.money(L.money);
      if (k === 'title') return Life.title();
      if (k === 'car') { const c = bestCar(); return c ? Life.CARS[c.kind].name.toLowerCase() : 'car'; }
      if (k === 'first') return L.firstChoice || 'cried a lot';
      return m;
    });
  }

  // ============================================================
  //  ACTORS
  // ============================================================
  const speedFor = (age) => age < 1 ? 0.45 : age <= 3 ? 0.7 : age <= 64 ? 1.3 : 0.8;
  function meModel() {
    const L = Life.L;
    const look = Object.assign({}, L.look);
    if (L.outfit) Object.assign(look, L.outfit);
    const m = Mo.person(look, Life.stageOf(L.age));
    Mo.setPersona(m, Life.persona());
    return m;
  }
  function addMe(at, pose) {
    const L = Life.L;
    const baby0 = L.age === 0;
    const a = Stage.addActor('me', meModel(), at || 'me', { crawler: baby0, pose: pose || (L.age <= 1 ? 'babysit' : 'stand'), speed: speedFor(L.age) });
    a.basePose = L.age <= 1 && !pose ? 'babysit' : (pose || 'stand');
    return a;
  }
  function personActor(id, p, at, opt = {}) {
    const look = Object.assign({}, p.look);
    if (p.cane) look.cane = true;
    const obj = Mo.person(look, Life.stageOf(p.age));
    return Stage.addActor(id, obj, at, Object.assign({ speed: speedFor(p.age), crawler: p.age === 0 }, opt));
  }
  function petActor(id, pt, at, opt = {}) {
    return Stage.addActor(id, Mo.pet(pt.kind, pt.color), at, Object.assign({ speed: 1.6 }, opt));
  }
  function bestCar() {
    const L = Life.L;
    const order = ['sports', 'car', 'bike'];
    for (const k of order) { const c = L.cars.find((x) => x.kind === k); if (c) return c; }
    return null;
  }
  function refreshMe() {
    const a = Stage.get('me');
    if (!a) return;
    const p = Life.persona();
    if (a.obj.userData.persona !== p) Mo.setPersona(a.obj, p);
  }
  // build a new "me" (when you grow up or change your look)
  function rebuildMe() {
    const a = Stage.get('me');
    if (!a) return;
    const pos = a.pos.clone(), rot = a.rot;
    Stage.removeActor('me');
    const n = addMe([pos.x, pos.z, rot, pos.y]);
    n.rot = rot;
  }

  // who is "a", "b"... in a moment
  function resolveCast(spec) {
    const L = Life.L;
    if (typeof spec === 'function') return spec(L, api);
    if (spec === 'mom' || spec === 'dad' || spec === 'sib') return Life.person(spec) || null;
    if (spec === 'friend' || spec === 'friend2') {
      const fs = U.shuffle(Life.friends()).filter((f) => !Object.values(cast).includes(f));
      if (fs.length) return fs[0];
      const p = Life.makeStranger(L.age < 13 ? 'kid' : L.age < 18 ? 'teen' : 'same');
      p.isNew = true;
      return p;
    }
    if (spec === 'boss') {
      if (L.job) {
        if (!L.job.boss) { L.job.boss = Life.makeStranger('boss'); L.job.boss.role = 'boss'; }
        return L.job.boss;
      }
      return Life.makeStranger('boss');
    }
    if (spec === 'pet') return L.pets[0] ? Object.assign({ isPet: true }, L.pets[0], { ref: L.pets[0] }) : null;
    if (spec.startsWith('pet:')) {
      const kind = spec.slice(4);
      return { isPet: true, kind, name: U.pick(Life.PET_NAMES[kind]), color: U.pick(Life.PETS[kind].colors), age: 1 };
    }
    if (spec === 'car') { const c = bestCar(); return c ? Object.assign({ isCar: true }, c) : null; }
    if (spec.startsWith('car:')) return { isCar: true, kind: spec.slice(4), color: U.pick([0xe83a3a, 0x3a7ae8, 0xf2c84a, 0x2a2a30, 0xffffff]) };
    const role = spec.startsWith('new:') ? spec.slice(4) : spec;
    const p = Life.makeStranger(role);
    p.isNew = true;
    return p;
  }
  function castOk(m) {
    const L = Life.L;
    for (const k in m.cast || {}) {
      const s = m.cast[k];
      if ((s === 'mom' || s === 'dad' || s === 'sib') && !Life.person(s)) return false;
      if (s === 'pet' && !L.pets.length) return false;
      if (s === 'car' && !L.cars.length) return false;
    }
    return true;
  }

  // ============================================================
  //  SCENES
  // ============================================================
  function bedroomOpt() {
    const p = Life.persona();
    return { good: { wall: 0xc8e8ff, pattern: 'stars' }, evil: { wall: 0x5a4a7a, pattern: 'dots', bed: 0x2a2a34 }, funny: { wall: 0xfff0a0, pattern: 'stripes', bed: 0xff8a2a } }[p] || { wall: 0xd8f0d0, pattern: 'dots' };
  }
  function homeScene() {
    const L = Life.L;
    if (L.home >= 1) return ['apartment', { tier: L.home, furniture: L.furniture }];
    if (L.age <= 3) return ['nursery', {}];
    if (L.age <= 17) return ['bedroom', bedroomOpt()];
    return ['home', {}];
  }
  function sceneFor(m) {
    const L = Life.L;
    let name = typeof m.scene === 'function' ? m.scene(L, api) : m.scene;
    let opt = typeof m.sceneOpt === 'function' ? m.sceneOpt(L, api) : m.sceneOpt;
    if (!name || name === 'myhome') { const h = homeScene(); name = h[0]; opt = Object.assign({}, h[1], opt || {}); }
    if (name === 'apartment' && !opt) opt = { tier: Math.max(1, L.home), furniture: L.furniture };
    if (name === 'bedroom' && !opt) opt = bedroomOpt();
    if (name === 'job') { const j = Life.jobInfo(); name = j ? j.scene : 'office'; if (name === 'apartment') opt = { tier: Math.max(1, L.home), furniture: L.furniture }; }
    return [name, opt || {}];
  }
  const PET_SCENES = { apartment: 1, home: 1, park: 1, nursery: 1, bedroom: 1, street: 1 };

  async function setupMoment(m) {
    const L = Life.L;
    $('story').classList.remove('show');
    const [name, opt] = sceneFor(m);
    await Stage.setScene(name, opt);
    cast = {};
    const at = m.at || {}, poses = m.pose || {};
    addMe(at.me || 'me', poses.me);
    const spare = ['a', 'b', 'c', 'd'].filter((s) => !(m.cast && m.cast[s]) && !Object.values(at).includes(s));
    for (const k in m.cast || {}) {
      const p = resolveCast(m.cast[k]);
      if (!p) continue;
      cast[k] = p;
      const spot = at[k] || (Stage.hasSpot(k) ? k : (spare.shift() || [U.rand(-2, 2), U.rand(0, 1.5)]));
      const faceOpt = at[k] ? {} : { face: 'me' };
      if (p.isPet) petActor(k, p, spot, Object.assign({ pose: poses[k] || 'stand' }, faceOpt));
      else if (p.isCar) Stage.addActor(k, Mo.vehicle(p.kind, p.color), spot, {});
      else {
        personActor(k, p, spot, Object.assign({ pose: poses[k] || 'stand' }, faceOpt));
        if (poses[k]) Stage.get(k).basePose = poses[k];
      }
      if ((m.hidden || []).includes(k)) Stage.get(k).obj.visible = false;
    }
    // your pet comes along
    if (L.pets.length && !Object.values(cast).some((c) => c && c.isPet && c.ref) && m.pet !== false && PET_SCENES[name]) {
      const me = Stage.get('me');
      const spot = Stage.hasSpot('pet') ? 'pet' : [me.pos.x + 0.9, me.pos.z + 0.5, -0.4];
      petActor('pet', L.pets[0], spot, {});
      cast.pet = L.pets[0];
    }
    // your car is parked on the street
    if (name === 'street' && L.cars.length && !cast.car && m.car !== false) {
      const c = bestCar();
      Stage.addActor('car', Mo.vehicle(c.kind, c.color), 'car', {});
    }
    // strangers react to who you are
    const p = Life.persona();
    if (p && m.react !== false) setTimeout(() => { for (const k in cast) if (cast[k] && cast[k].isNew && Stage.get(k) && Stage.get(k).obj.visible) Stage.emote(k, PERSONA_REACT[p]); }, 700);
    if (m.mood) for (const k in m.mood) { const a = Stage.get(k); if (a) a.mood = m.mood[k]; }
    if (m.start) await Stage.run(m.start);
  }

  // ============================================================
  //  PLAYING A MOMENT
  // ============================================================
  async function playMoment(m) {
    state = 'moment';
    setSide();
    await setupMoment(m);
    await playStep(m, true);
    Stage.resetCam();
  }
  async function playStep(step, first) {
    const L = Life.L;
    const choices = (step.choices || []).filter((c) => {
      if (c.only && Life.persona() !== c.only) return false;
      if (c.need && !c.need(L, api)) return false;
      if (c.minAge && L.age < c.minAge) return false;
      return true;
    });
    setStory(fill(step.text), first ? step.emoji : null);
    if (!choices.length) { await waitNext(); return; }
    const c = await askChoice(choices);
    $('s-choices').innerHTML = '';
    if (c.cost && L.money < c.cost) {
      setStory(`😬 You don't have enough money for that! You have ${U.money(L.money)}.`);
      await waitNext();
      return playStep(step, false);
    }
    $('s-text').classList.add('dim');
    const type = typeOf(c);
    const label = fill(c[type]);
    if (!L.firstChoice) L.firstChoice = label.toLowerCase();
    if (type !== 'say') { Life.addPersona(type, c.power || 1); ML.Audio.choose(type); } else ML.Audio.click();
    // luck: one of several things can happen
    let r = c;
    if (c.luck) {
      let roll = Math.random(), acc = 0;
      r = c.luck[c.luck.length - 1];
      for (const l of c.luck) { acc += (typeof l.chance === 'function' ? l.chance(L) : l.chance) || 0; if (roll < acc) { r = l; break; } }
      r = Object.assign({}, c, r, { luck: null });
    }
    await Stage.run(r.do);
    const before = Life.persona();
    applyEffects(r, type, label);
    refreshMe();
    const after = Life.persona();
    if (after !== before) {
      if (after) toast(`${Life.PERSONA_EMOJI[after]} You are now a ${Life.title()}!`);
      else toast(`You are a ${Life.title()} now.`);
      Stage.A.poof('me');
    }
    updateHud();
    if (r.next) {
      const nx = typeof r.next === 'function' ? r.next(L, api) : r.next;
      if (nx.scene) await setupMoment(nx);
      return playStep(nx, false);
    }
    if (r.result) {
      setStory(fill(r.result));
      await waitNext();
    }
    if (r.then) await Stage.run(r.then);
  }
  const typeOf = (c) => (c.good !== undefined ? 'good' : c.evil !== undefined ? 'evil' : c.funny !== undefined ? 'funny' : 'say');

  function applyEffects(e, type, label) {
    const L = Life.L;
    const pops = [];
    if (type && type !== 'say') pops.push([TYPE_EMOJI[type] + ' +' + (e.power || 1), type]);
    if (e.cost) { Life.change('money', -e.cost); pops.push(['-' + U.money(e.cost).slice(1) + ' 💰', 'bad']); }
    for (const k in e.stats || {}) {
      let d = e.stats[k];
      if (typeof d === 'function') d = d(L);
      const real = Life.change(k, d);
      if (k === 'money') pops.push([(d > 0 ? '+' : '-') + U.money(Math.abs(d)) + ' 💰', d > 0 ? 'good' : 'bad']);
      else if (real) pops.push([(real > 0 ? '+' : '') + real + ' ' + STAT_EMOJI[k], real > 0 ? 'good' : 'bad']);
    }
    for (const k in e.love || {}) {
      const p = cast[k] || Life.person(k);
      if (!p || p.isPet) { if (p && p.ref) p.ref.love = U.clamp((p.ref.love || 50) + e.love[k], 0, 100); continue; }
      p.love = U.clamp((p.love || 50) + e.love[k], 0, 100);
      pops.push([(e.love[k] > 0 ? '💕 ' : '💔 ') + p.name + ' ' + (e.love[k] > 0 ? '+' : '') + e.love[k], e.love[k] > 0 ? 'good' : 'bad']);
    }
    for (const k of [].concat(e.friend || [])) {
      const p = cast[k];
      if (p && !p.isPet && Life.addFriend(p)) { pops.push(['🤝 New friend: ' + p.name + '!', 'good']); ML.Audio.good(); }
    }
    for (const k of [].concat(e.unfriend || [])) {
      const p = cast[k];
      if (p && p.role === 'friend') { p.role = 'stranger'; p.love = 0; pops.push(['👋 ' + p.name + ' is not your friend anymore', 'bad']); }
    }
    if (e.run) e.run(L, api);
    if (e.highlight) L.highlights.push(fill(e.highlight));
    if (label && e.log !== false) Life.log((TYPE_EMOJI[type] || '') + ' ' + fill(e.log || label));
    showPops(pops);
  }

  // ============================================================
  //  THE YEAR
  // ============================================================
  function eligible(m) {
    const L = Life.L;
    if (m.ages && (L.age < m.ages[0] || L.age > m.ages[1])) return false;
    if (m.need && !m.need(L, api)) return false;
    const last = L.lastSeen[m.id];
    if (last !== undefined) { if (!m.repeat) return false; if (L.age - last < m.repeat) return false; }
    return castOk(m);
  }
  function pickYear() {
    const L = Life.L;
    const all = ML.Events.list.filter(eligible);
    const always = all.filter((m) => m.always);
    let rest = all.filter((m) => !m.always);
    // moments you have never seen come first, then the ones that can repeat
    rest = U.shuffle(rest).sort((a, b) => (L.lastSeen[a.id] !== undefined) - (L.lastSeen[b.id] !== undefined) || (b.weight || 1) - (a.weight || 1) + U.rand(-0.5, 0.5));
    const st = Life.stageOf(L.age);
    let n = st === 'adult' ? U.randInt(1, 2) : st === 'old' ? U.randInt(1, 2) : 2;
    if (L.age === 0) n = 1;
    if (always.length >= 2) n = Math.max(0, n - 1);
    const q = always.map((m) => m.id);
    for (const m of rest) { if (q.length >= always.length + n) break; q.push(m.id); }
    return q;
  }
  async function startYear() {
    const L = Life.L;
    if (!L.yearQueue) { L.yearQueue = pickYear(); L.yearDone = []; }
    Life.save();
    await nextMoment();
  }
  async function nextMoment() {
    const L = Life.L;
    const id = L.yearQueue.find((x) => !L.yearDone.includes(x));
    if (!id) return idle();
    const m = ML.Events.byId[id];
    L.yearDone.push(id);
    if (!m || !castOk(m)) return nextMoment();
    L.lastSeen[m.id] = L.age;
    await playMoment(m);
    Life.save();
    updateHud();
    return nextMoment();
  }
  // a moment from the 📱 Life menu
  async function playMenuMoment(m) {
    if (state !== 'idle') return;
    closeModals();
    await playMoment(m);
    Life.save();
    updateHud();
    idle();
  }

  async function idle() {
    const L = Life.L;
    state = 'idle';
    const [name, opt] = homeScene();
    await Stage.setScene(name, opt);
    cast = {};
    addMe('me');
    if (L.pets.length) { petActor('pet', L.pets[0], Stage.hasSpot('pet') ? 'pet' : [0.9, 1.4, -0.4]); cast.pet = L.pets[0]; }
    const me = Stage.get('me');
    if (me && L.age > 1 && Math.random() < 0.5) Stage.A.pose('me', U.pick(['wave', 'stretch', 'cheer', 'think']), 1.6);
    const lines = [
      `That was year ${L.age}! 🎂 Press <b>AGE UP</b> for your next birthday.`,
      `Year ${L.age} is done! Open the 📱 <b>LIFE</b> menu to do more things, or <b>AGE UP</b>.`,
    ];
    setStory(L.age >= 4 ? U.pick(lines) : `Year ${L.age} is done! Press <b>AGE UP</b> to grow a little bit. 👶`, null, true);
    setSide();
    Life.save();
    updateHud();
  }

  // ============================================================
  //  🎂 AGE UP
  // ============================================================
  async function ageUp() {
    if (state !== 'idle') return;
    const L = Life.L;
    state = 'busy';
    setSide();
    ML.Audio.click();
    const kid = L.age < 17;
    if (kid) await Stage.setScene('home', { party: true });
    else { const [name, opt] = homeScene(); await Stage.setScene(name, opt); }
    cast = {};
    if (kid) {
      addMe([0.9, 0.35, Math.PI]);
      Stage.A.spawn('table', [0.9, -0.5], 'ptable');
      Stage.A.spawn('cake', [0.9, -0.5, 0, 0.77], 'cake');
      const fam = [['mom', [-0.2, -0.5, Math.PI / 2]], ['dad', [2.0, -0.5, -Math.PI / 2]], ['sib', [0.9, -1.4, 0]]];
      for (const [r, spot] of fam) { const p = Life.person(r); if (p) { personActor(r, p, spot); cast[r] = p; } }
      Stage.A.cam('far', 'me');
    } else {
      addMe([0, 0.6, Math.PI]);
      Stage.A.spawn('table', [0, -0.35], 'ptable');
      Stage.A.spawn('cake', [0, -0.35, 0, 0.77], 'cake');
      const fs = Life.friends().slice(0, 2);
      fs.forEach((f, i) => { personActor('f' + i, f, [i ? 1.1 : -1.1, -0.35, i ? -Math.PI / 2 : Math.PI / 2]); });
      if (L.pets.length) petActor('pet', L.pets[0], [0.9, 1.2, -0.5]);
      Stage.A.cam('close', 'me');
    }
    setStory(`🎂 Happy birthday, ${L.first}! Make a wish...`, null, true);
    await U.wait(0.6);
    await Stage.run([['dim'], ['sound', 'birthday']]);
    for (const id of ['mom', 'dad', 'sib', 'f0', 'f1']) if (Stage.get(id)) Stage.A.pose(id, 'clap', 3.2);
    await U.wait(3.2);
    await Stage.run([['face', 'me', 'cake'], ['emote', 'me', '💨'], ['blow', 'cake'], ['wait', 0.4], ['dim', false]]);
    const oldStage = Life.stageOf(L.age);
    const news = Life.ageUp();
    const newStage = Life.stageOf(L.age);
    await Stage.run([['confetti', 'me'], ['pose', 'me', L.age <= 2 ? 'babysit' : 'cheer', 0.1]]);
    if (oldStage !== newStage) {
      await U.wait(0.5);
      Stage.A.poof('me');
      rebuildMe();
      ML.Audio.levelUp();
      banner(`${Life.STAGE_EMOJI[newStage]} You're ${newStage === 'adult' ? 'an' : 'a'} ${Life.STAGE_NAME[newStage].toUpperCase()} now!`);
    }
    Stage.A.pose('me', L.age <= 1 ? 'babysit' : 'cheer', 2);
    updateHud();
    const head = `🎉 You are <b>${L.age}</b> years old!`;
    setStory(head + (news.length ? '<br><span class="news">' + news.join('<br>') + '</span>' : ''), null, true);
    await waitNext();
    if (Life.shouldDie()) return endOfLife();
    L.yearQueue = null;
    startYear();
  }

  // ============================================================
  //  THE END 🕊️
  // ============================================================
  async function endOfLife() {
    const L = Life.L;
    state = 'end';
    setSide();
    await playMoment(ML.Events.death);
    ML.Audio.sad();
    L.dead = true;
    Life.save();
    const sc = Life.score();
    const title = Life.lifeTitle();
    Life.addPastLife({ name: L.first + ' ' + L.last, title, age: L.age, score: sc, emoji: Life.lifeTitleEmoji(), when: Date.now() });
    showLifeStory(title, sc);
  }
  function showLifeStory(title, sc) {
    const L = Life.L;
    const P = L.personaLife, tot = (P.good + P.evil + P.funny) || 1;
    const j = Life.jobInfo();
    const stars = Life.stars(sc);
    const pets = L.pets.map((p) => Life.PETS[p.kind].emoji + ' ' + p.name).join(', ') || 'none';
    const cars = L.cars.map((c) => Life.CARS[c.kind].emoji + ' ' + Life.CARS[c.kind].name).join(', ') || 'none';
    const hl = L.highlights.slice(-6).map((h) => `<li>${h}</li>`).join('') || '<li>A quiet, peaceful life.</li>';
    $('ls-body').innerHTML = `
      <div class="ls-title">${Life.lifeTitleEmoji()} ${title}</div>
      <div class="ls-name">${L.first} ${L.last} · lived to <b>${L.age}</b></div>
      <div class="ls-stars">${'⭐'.repeat(stars)}${'☆'.repeat(5 - stars)} <small>${sc} points</small></div>
      <div class="ls-bars">
        <div><span>😇 Good</span><i style="width:${Math.round(P.good / tot * 100)}%" class="good"></i></div>
        <div><span>😈 Evil</span><i style="width:${Math.round(P.evil / tot * 100)}%" class="evil"></i></div>
        <div><span>🤡 Funny</span><i style="width:${Math.round(P.funny / tot * 100)}%" class="funny"></i></div>
      </div>
      <div class="ls-grid">
        <div>💼 <b>Job:</b> ${j ? j.levels[L.job.level] + ' at ' + j.name : (L.retired ? 'Retired' : 'None')}</div>
        <div>💰 <b>Money:</b> ${U.money(L.money)}</div>
        <div>🏠 <b>Home:</b> ${Life.HOMES[L.home].name}</div>
        <div>🤝 <b>Friends:</b> ${Life.friends().length}</div>
        <div>🐾 <b>Pets:</b> ${pets}</div>
        <div>🚗 <b>Rides:</b> ${cars}</div>
      </div>
      <div class="ls-hl"><b>Best moments</b><ul>${hl}</ul></div>`;
    show('lifestory');
  }

  // ============================================================
  //  UI
  // ============================================================
  function setStory(html, emoji, raw) {
    const L = Life.L;
    $('s-head').textContent = L ? `${Life.STAGE_EMOJI[Life.stageOf(L.age)]} Age ${L.age}` : '';
    $('s-text').innerHTML = raw ? html : escapeKeepTags(html);
    $('s-text').classList.remove('dim');
    $('s-text').classList.remove('pop'); void $('s-text').offsetWidth; $('s-text').classList.add('pop');
    $('s-choices').innerHTML = '';
    $('s-next').style.display = 'none';
    $('story').classList.add('show');
  }
  function escapeKeepTags(s) { return s; }
  function askChoice(list) {
    return new Promise((res) => {
      const box = $('s-choices');
      box.innerHTML = '';
      box.className = list.length > 4 ? 'many' : '';
      list.forEach((c, i) => {
        const t = typeOf(c);
        const b = document.createElement('button');
        b.className = 'choice ' + t + (c.only ? ' special' : '');
        const cost = c.cost ? ` <em>${U.money(c.cost)}</em>` : '';
        const special = c.only ? `<small class="star">⭐ ${Life.PERSONA_WORD[c.only]} only!</small>` : '';
        b.innerHTML = `<span class="key">${i + 1}</span><span class="tag">${c.icon || TYPE_EMOJI[t]}</span><span class="lbl">${fill(c[t])}${cost}</span>${special}`;
        b.onclick = () => { if (choiceResolve) { choiceResolve = null; res(c); } };
        box.appendChild(b);
      });
      choiceResolve = (i) => { if (list[i]) { choiceResolve = null; res(list[i]); } };
    });
  }
  function waitNext() {
    return new Promise((res) => {
      $('s-next').style.display = '';
      nextResolve = () => { nextResolve = null; $('s-next').style.display = 'none'; ML.Audio.click(); res(); };
    });
  }
  function showPops(pops) {
    const box = $('pops');
    pops.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'pop ' + (p[1] || '');
      el.textContent = p[0];
      el.style.animationDelay = (i * 0.18) + 's';
      box.appendChild(el);
      setTimeout(() => el.remove(), 3200 + i * 180);
    });
    if (pops.some((p) => p[0].includes('💰') && p[1] === 'good')) ML.Audio.coin();
  }
  function toast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }
  function banner(text) {
    const b = $('banner');
    b.textContent = text;
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
  }
  function updateHud() {
    const L = Life.L;
    if (!L) return;
    $('h-name').textContent = L.first + ' ' + L.last;
    $('h-age').textContent = `Age ${L.age}`;
    const p = Life.persona();
    $('h-title').textContent = (p ? Life.PERSONA_EMOJI[p] + ' ' : '🙂 ') + Life.title();
    $('h-title').className = 'title-badge ' + (p || 'none');
    for (const k of ['health', 'happy', 'smarts', 'looks']) {
      const v = L.stats[k];
      const bar = $('b-' + k);
      bar.style.width = v + '%';
      bar.className = v < 25 ? 'low' : v > 70 ? 'high' : '';
      $('v-' + k).textContent = v;
    }
    $('h-money').textContent = U.money(L.money);
    $('h-money').className = L.money < 0 ? 'neg' : '';
    $('h-job').textContent = Life.jobTitle();
    const P = L.persona, tot = Math.max(1, P.good + P.evil + P.funny);
    for (const k of ['good', 'evil', 'funny']) $('p-' + k).style.width = Math.round(P[k] / tot * 100) + '%';
  }
  function setSide() {
    const idle = state === 'idle';
    $('btnAge').disabled = !idle;
    $('btnLife').disabled = !idle || Life.L.age < 1;
    $('btnAge').classList.toggle('ready', idle);
  }
  function show(id) {
    for (const s of document.querySelectorAll('.screen')) s.classList.remove('show');
    if (id) $(id).classList.add('show');
    const inGame = !id || id === 'none';
    Stage.setFrame(inGame ? 0.3 : 0);
    $('hud').style.display = inGame ? '' : 'none';
    $('side').style.display = inGame ? '' : 'none';
    $('story').style.display = inGame ? '' : 'none';
  }
  function closeModals() { for (const m of document.querySelectorAll('.modal')) m.classList.remove('show'); }

  // ============================================================
  //  STARTING
  // ============================================================
  function titleScreen() {
    state = 'title';
    show('title');
    $('btnContinue').style.display = Life.hasSave() ? '' : 'none';
    const lives = Life.pastLives();
    $('pastLives').innerHTML = lives.length ? '<b>Past lives</b>' + lives.slice(0, 5).map((l) => `<div>${l.emoji} <b>${l.name}</b> · ${l.title} · ${l.age} yrs · ${l.score} pts</div>`).join('') : '';
    Stage.setScene('street', { instant: true });
  }
  async function beginLife(first, last, look) {
    Life.newLife(first, last, look);
    show(null);
    updateHud();
    await playMoment(ML.Events.birth);
    Life.L.lastSeen.birth = 0;
    Life.L.yearQueue = pickYear();
    Life.L.yearDone = [];
    Life.save();
    nextMoment();
  }
  function continueLife() {
    const L = Life.load();
    if (!L) return;
    show(null);
    updateHud();
    if (L.yearQueue) nextMoment(); else startYear();
  }

  function init() {
    Stage.init($('game'));
    ML.Creator.init();
    ML.Audio.init && document.addEventListener('pointerdown', () => ML.Audio.init(), { once: false });
    $('btnNew').onclick = () => { ML.Audio.init(); ML.Creator.open(); };
    $('btnContinue').onclick = () => { ML.Audio.init(); continueLife(); };
    $('s-next').onclick = () => nextResolve && nextResolve();
    $('btnAge').onclick = () => ageUp();
    $('btnLife').onclick = () => { if (state === 'idle') ML.Menu.open(); };
    $('btnDiary').onclick = () => ML.Menu.diary();
    $('btnSound').onclick = () => { const on = ML.Audio.toggle(); $('btnSound').textContent = on ? '🔊' : '🔇'; };
    $('ls-again').onclick = () => { Life.clearSave(); ML.Creator.open(); };
    $('ls-title').onclick = () => { Life.clearSave(); titleScreen(); };
    for (const b of document.querySelectorAll('.modal .close')) b.onclick = () => closeModals();
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (choiceResolve && e.key >= '1' && e.key <= '9') { const btns = $('s-choices').querySelectorAll('button'); const b = btns[+e.key - 1]; if (b) b.click(); }
      if ((e.key === ' ' || e.key === 'Enter') && nextResolve) { e.preventDefault(); nextResolve(); }
      if ((e.key === 'a' || e.key === 'A') && state === 'idle' && !document.querySelector('.modal.show')) ageUp();
      if (e.key === 'Escape') closeModals();
      if (e.key === 'm' || e.key === 'M') $('btnSound').click();
    });
    titleScreen();
  }

  // things the moments (events.js) and the menu can use
  const api = {
    get cast() { return cast; },
    fill, rebuildMe, refreshMe, toast, banner, updateHud, bestCar, personActor, petActor, addMe,
    giveJob(id) { Life.giveJob(id); toast(`${Life.JOBS[id].emoji} New job: ${Life.jobTitle()}!`); Life.L.highlights.push(`Got a job: ${Life.jobTitle()} at ${Life.JOBS[id].name}`); },
    setHome(tier) { Life.L.home = tier; if (tier >= 1) Life.L.furniture = Life.L.furniture.filter((f) => f.slot < Life.HOMES[tier].slots); Life.L.highlights.push(`Moved into a ${Life.HOMES[tier].name.toLowerCase()}`); },
    addPet(kind, name, color) { const pt = { kind, name, color: color !== undefined ? color : U.pick(Life.PETS[kind].colors), age: 0, love: 70 }; Life.L.pets.push(pt); Life.L.highlights.push(`Got a ${Life.PETS[kind].name.toLowerCase()} called ${name}`); return pt; },
    addCar(kind) { Life.L.cars.push({ kind, color: U.pick([0xe83a3a, 0x3a7ae8, 0xf2c84a, 0x2a2a30, 0x7ae84a, 0xff8a2a]) }); },
    setLook(o) { Object.assign(Life.L.look, o); rebuildMe(); },
    perf(d) { if (Life.L.job) Life.L.job.perf = U.clamp(Life.L.job.perf + d, 0, 100); },
    playMenuMoment,
    get state() { return state; },
  };

  return { init, fill, api, updateHud, playMenuMoment, show, titleScreen, beginLife, get state() { return state; } };
})();
