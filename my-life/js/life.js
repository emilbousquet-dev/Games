// ============================================================
//  MY LIFE — YOUR LIFE (all the numbers and rules)
//  Stats, money, family, friends, job, home, pets, cars,
//  the 😇 Good / 😈 Evil / 🤡 Funny meters, and saving.
// ============================================================
window.ML = window.ML || {};

ML.Life = (function () {
  const U = ML.U;

  // ---------- names ----------
  const NAMES = {
    f: ['Emma', 'Lily', 'Mia', 'Zoe', 'Chloe', 'Ava', 'Ruby', 'Nora', 'Maya', 'Lucy', 'Sofia', 'Ella', 'Grace', 'Ivy', 'Luna', 'Amara', 'Priya', 'Yuki', 'Fatima', 'Rosa', 'Hana', 'Jade', 'Olivia', 'Clara'],
    m: ['Leo', 'Max', 'Sam', 'Noah', 'Oscar', 'Jack', 'Theo', 'Ben', 'Hugo', 'Liam', 'Omar', 'Kai', 'Felix', 'Ravi', 'Mateo', 'Jonah', 'Tom', 'Arlo', 'Ezra', 'Diego', 'Kenji', 'Louis', 'Milo', 'Finn'],
  };
  const LAST = ['Sparks', 'Rivers', 'Moon', 'Stone', 'Bloom', 'Fox', 'Wilde', 'Bright', 'Park', 'Silva', 'Novak', 'Kim', 'Brooks', 'Lopez', 'Bauer', 'Dubois', 'Patel', 'Rossi', 'Berg', 'Hart'];
  const PET_NAMES = { dog: ['Buddy', 'Biscuit', 'Rex', 'Pickle', 'Waffles', 'Luna', 'Rocket'], cat: ['Whiskers', 'Mittens', 'Shadow', 'Noodle', 'Pumpkin', 'Socks'], parrot: ['Captain', 'Kiwi', 'Mango', 'Polly', 'Tweety'] };

  const SKINS = [0xffdcc0, 0xf0c09a, 0xd8a070, 0xb07848, 0x8a5a36, 0x5e3a22];
  const HAIRS = [0x1a1210, 0x3a2414, 0x7a4a24, 0xd8a050, 0xf0d890, 0xc8442a, 0xe8e8e8, 0x3a6ae8, 0xff6ac8, 0x6ad84a];
  const EYES = [0x3a2414, 0x4a7ac8, 0x3a9a5a, 0x8a6a3a, 0x7a5ac8];
  const SHIRTS = [0x3a8ae8, 0xe8503a, 0x3ac87a, 0xffc83a, 0xc85ae8, 0xff7ab0, 0x2a2a34, 0xffffff, 0xff8a2a, 0x3ad8d8];
  const PANTS = [0x2a3a5a, 0x3a3a40, 0x6a4a2a, 0x5a7ab0, 0xc8b080, 0x8a2a3a];

  // ---------- age groups ----------
  function stageOf(age) { return age <= 3 ? 'baby' : age <= 12 ? 'kid' : age <= 17 ? 'teen' : age <= 64 ? 'adult' : 'old'; }
  const STAGE_NAME = { baby: 'Baby', kid: 'Kid', teen: 'Teen', adult: 'Adult', old: 'Old-timer' };
  const STAGE_EMOJI = { baby: '👶', kid: '🧒', teen: '🧑', adult: '🧑‍💼', old: '🧓' };

  // ---------- jobs ----------
  const JOBS = {
    burger: { name: 'Burger Blast', emoji: '🍔', levels: ['Fry Cook', 'Head Cook', 'Burger Boss'], pay: [18000, 27000, 42000], need: {}, scene: 'burger', top: 'chef', extra: 'chefHat', about: 'Flip burgers! Anyone can do it.' },
    office: { name: 'Mega Corp', emoji: '💼', levels: ['Intern', 'Office Worker', 'Manager', 'THE BOSS'], pay: [22000, 45000, 85000, 220000], need: { smarts: 45 }, scene: 'office', top: 'suit', about: 'Type, meet, type. Needs 🧠 45.' },
    police: { name: 'City Police', emoji: '👮', levels: ['Cadet', 'Officer', 'Detective', 'Police Chief'], pay: [30000, 52000, 78000, 130000], need: { health: 55 }, scene: 'street', top: 'uniform', extra: 'copHat', shirt: 0x2a3a7a, about: 'Catch bad guys! Needs ❤️ 55.' },
    doctor: { name: 'City Hospital', emoji: '🩺', levels: ['Student Doctor', 'Doctor', 'Surgeon', 'Hospital Boss'], pay: [24000, 95000, 170000, 260000], need: { smarts: 72 }, scene: 'hospital', top: 'coat', about: 'Save lives! Needs 🧠 72.' },
    youtuber: { name: 'YouTube', emoji: '🎬', levels: ['Tiny YouTuber', 'Popular YouTuber', 'Famous YouTuber', 'MEGA SUPERSTAR'], pay: [3000, 35000, 160000, 650000], need: {}, scene: 'apartment', about: 'Make videos! Pay depends on 🤡 and ✨.' },
    teacher: { name: 'Sunnyvale School', emoji: '🍎', levels: ['Helper Teacher', 'Teacher', 'Head Teacher', 'Principal'], pay: [26000, 42000, 58000, 90000], need: { smarts: 55 }, scene: 'classroom', top: 'sweater', about: 'Teach kids! Needs 🧠 55.' },
  };
  const TEEN_JOB = { id: 'burgerTeen', name: 'Burger Blast', title: 'Burger Helper', pay: 3500 };

  // ---------- homes, furniture, pets, cars ----------
  const HOMES = [
    { tier: 0, name: "Mom & Dad's house", emoji: '🏠', price: 0 },
    { tier: 1, name: 'Tiny apartment', emoji: '🏢', price: 0, rent: 6000, slots: 5 },
    { tier: 2, name: 'Big apartment', emoji: '🏬', price: 150000, slots: 9 },
    { tier: 3, name: 'PENTHOUSE', emoji: '🏙️', price: 1000000, slots: 13 },
  ];
  const FURNITURE = [
    { id: 'plant', name: 'Plant', emoji: '🪴', price: 40, happy: 1 },
    { id: 'lamp', name: 'Lamp', emoji: '💡', price: 80, happy: 1 },
    { id: 'rug', name: 'Rug', emoji: '🟫', price: 150, happy: 1 },
    { id: 'bookshelf', name: 'Bookshelf', emoji: '📚', price: 200, smarts: 3 },
    { id: 'table', name: 'Table', emoji: '🍽️', price: 250, happy: 1 },
    { id: 'tv', name: 'TV', emoji: '📺', price: 600, happy: 3 },
    { id: 'sofa', name: 'Sofa', emoji: '🛋️', price: 800, happy: 3 },
    { id: 'fishtank', name: 'Fish tank', emoji: '🐠', price: 500, happy: 3 },
    { id: 'fridge', name: 'Fridge', emoji: '🧊', price: 900, health: 3 },
    { id: 'piano', name: 'Piano', emoji: '🎹', price: 2500, smarts: 3, happy: 2 },
    { id: 'pc', name: 'Gaming PC', emoji: '🖥️', price: 2000, happy: 5 },
    { id: 'arcade', name: 'Arcade machine', emoji: '🕹️', price: 3000, happy: 6 },
    { id: 'hottub', name: 'Hot tub', emoji: '🛁', price: 8000, happy: 8, health: 2 },
  ];
  const PETS = {
    dog: { name: 'Dog', emoji: '🐶', price: 300, colors: [0xc8904a, 0x3a2a1a, 0xf0e0c0, 0x8a6a4a] },
    cat: { name: 'Cat', emoji: '🐱', price: 200, colors: [0xff9a3a, 0x3a3a40, 0xf4f4f4, 0x9a9aa8] },
    parrot: { name: 'Parrot', emoji: '🦜', price: 500, colors: [0x3ac85a, 0xe83a3a, 0x3ab0ff, 0xffc83a] },
  };
  const CARS = {
    bike: { name: 'Bike', emoji: '🚲', price: 200, minAge: 6, happy: 4 },
    car: { name: 'Car', emoji: '🚗', price: 15000, minAge: 16, happy: 6 },
    sports: { name: 'Sports car', emoji: '🏎️', price: 120000, minAge: 18, happy: 12, looks: 5 },
  };

  let L = null;
  let uid = 1;
  const nextId = () => 'p' + (uid++) + '_' + Math.floor(Math.random() * 1e6);

  // ---------- making people ----------
  function randomLook(gender, opt = {}) {
    const f = gender === 'f';
    return {
      skin: opt.skin !== undefined ? opt.skin : U.pick(SKINS),
      hair: opt.hair !== undefined ? opt.hair : U.pick(HAIRS.slice(0, 7)),
      hairStyle: opt.hairStyle || U.pick(f ? ['long', 'ponytail', 'bun', 'curly', 'short', 'afro'] : ['short', 'spiky', 'curly', 'short', 'bald', 'afro']),
      eyes: U.pick(EYES),
      top: opt.top || U.pick(f ? ['tshirt', 'dress', 'hoodie', 'sweater'] : ['tshirt', 'hoodie', 'sweater', 'tshirt']),
      shirt: opt.shirt !== undefined ? opt.shirt : U.pick(SHIRTS),
      pants: opt.pants !== undefined ? opt.pants : U.pick(PANTS),
      shoes: U.pick([0xf4f4f4, 0x2a2a30, 0xe83a3a, 0x3a6ae8, 0x8a5a3a]),
      extra: opt.extra || (U.chance(0.2) ? U.pick(['glasses', 'glasses', 'cap', f ? 'bow' : 'mustache']) : 'none'),
      bag: opt.bag,
    };
  }
  // a skin color close to yours (so your family looks like you)
  function familySkin(skin) {
    const i = SKINS.indexOf(skin);
    if (i < 0) return skin;
    return SKINS[U.clamp(i + U.randInt(-1, 1), 0, SKINS.length - 1)];
  }
  function makePerson(role, age, gender, opt = {}) {
    gender = gender || U.pick(['f', 'm']);
    return {
      id: opt.id || nextId(), role, gender, age,
      name: opt.name || U.pick(NAMES[gender]),
      look: opt.look || randomLook(gender, opt),
      love: opt.love !== undefined ? opt.love : 50,
      alive: true, deathAge: U.randInt(78, 98),
    };
  }
  // strangers that show up in moments
  const ROLES = {
    kid: (me) => ({ age: U.clamp(me + U.randInt(-1, 1), 4, 12) }),
    teen: (me) => ({ age: U.clamp(me + U.randInt(-1, 1), 13, 17) }),
    same: (me) => ({ age: U.clamp(me + U.randInt(-1, 1), 4, 70) }),
    bully: (me) => ({ age: U.clamp(me + 2, 6, 17), opt: { shirt: 0x2a2a34, hairStyle: U.pick(['mohawk', 'spiky']), top: 'hoodie' }, gender: 'm' }),
    teacher: () => ({ age: U.randInt(32, 55), opt: { extra: 'glasses', top: 'sweater' } }),
    lady: () => ({ age: U.randInt(30, 55), gender: 'f', opt: { hairStyle: U.pick(['long', 'bun', 'ponytail']), top: U.pick(['dress', 'sweater']), bag: U.pick([0xc83a6a, 0x8a5a3a, 0x3a6ac8]) } }),
    man: () => ({ age: U.randInt(25, 55), gender: 'm' }),
    adult: () => ({ age: U.randInt(22, 55) }),
    oldman: () => ({ age: U.randInt(72, 88), gender: 'm', opt: { top: 'sweater', cane: true } }),
    oldlady: () => ({ age: U.randInt(72, 88), gender: 'f', opt: { top: 'sweater', hairStyle: 'bun', bag: 0x8a5ac8 } }),
    old: () => ({ age: U.randInt(68, 85) }),
    cop: () => ({ age: U.randInt(25, 50), opt: { top: 'uniform', shirt: 0x2a3a7a, pants: 0x1a2440, extra: 'copHat' } }),
    doctor: () => ({ age: U.randInt(30, 60), opt: { top: 'coat', shirt: 0x3ab0a0, extra: 'glasses' } }),
    boss: () => ({ age: U.randInt(45, 60), opt: { top: 'suit', shirt: 0x2a2a34, pants: 0x2a2a34 } }),
    seller: () => ({ age: U.randInt(28, 50), opt: { top: 'suit', shirt: 0xc83a3a, pants: 0x2a2a34 } }),
    keeper: () => ({ age: U.randInt(22, 45), opt: { top: 'tshirt', shirt: 0x3aa06a, extra: 'cap' } }),
    worker: () => ({ age: U.randInt(17, 30), opt: { top: 'chef', extra: 'chefHat' } }),
    musician: () => ({ age: U.randInt(20, 40), opt: { top: 'hoodie', shirt: 0x6a3ac8, extra: 'headband' } }),
    thief: () => ({ age: U.randInt(20, 40), gender: 'm', opt: { top: 'hoodie', shirt: 0x1a1a20, pants: 0x1a1a20, extra: 'sunglasses' } }),
    clown: () => ({ age: U.randInt(25, 45), opt: { hairStyle: 'afro', hair: 0xff3a3a, shirt: 0xffd83a, pants: 0x3a6ae8, top: 'tshirt' } }),
    celebrity: () => ({ age: U.randInt(25, 40), opt: { extra: 'sunglasses', top: 'suit', shirt: 0xd8b04a, pants: 0xffffff } }),
    coworker: () => ({ age: U.randInt(22, 50), opt: { top: U.pick(['sweater', 'tshirt', 'suit']) } }),
    baby: () => ({ age: 1 }),
    alien: () => ({ age: 30, opt: { skin: 0x7ae84a, hairStyle: 'bald', eyes: 0x1a1a1a, top: 'tshirt', shirt: 0xc8c8d8, pants: 0xc8c8d8, extra: 'none' } }),
  };
  function makeStranger(role) {
    const r = (ROLES[role] || ROLES.adult)(L ? L.age : 20);
    const p = makePerson(role, r.age, r.gender, r.opt || {});
    if (role === 'alien') p.name = 'Zorp';
    return p;
  }

  // ============================================================
  //  A NEW LIFE
  // ============================================================
  function newLife(first, last, look) {
    const momSkin = familySkin(look.skin), dadSkin = familySkin(look.skin);
    L = {
      v: 1,
      first, last, look,
      age: 0,
      stats: { health: U.randInt(70, 95), happy: U.randInt(70, 95), smarts: U.randInt(25, 70), looks: U.randInt(30, 80) },
      money: 0,
      persona: { good: 0, evil: 0, funny: 0 },      // what you've been doing lately
      personaLife: { good: 0, evil: 0, funny: 0 },  // your whole life
      people: [],
      job: null, teenJob: null, retired: false, everWorked: false,
      home: 0, furniture: [], pets: [], cars: [],
      log: [], done: {}, lastSeen: {}, yearQueue: null, yearDone: [], yearMenu: {},
      deathAge: U.randInt(78, 97),
      firstChoice: null, highlights: [],
      started: Date.now(),
    };
    L.people.push(makePerson('mom', U.randInt(25, 36), 'f', { look: randomLook('f', { skin: momSkin }), love: 80 }));
    L.people.push(makePerson('dad', U.randInt(26, 38), 'm', { look: randomLook('m', { skin: dadSkin }), love: 80 }));
    if (U.chance(0.55)) {
      const g = U.pick(['f', 'm']);
      L.people.push(makePerson('sib', U.randInt(2, 5), g, { look: randomLook(g, { skin: familySkin(look.skin) }), love: 60 }));
    }
    L.people.forEach((p) => { if (p.role !== 'sib') p.last = L.last; });
    return L;
  }

  // ---------- people helpers ----------
  const person = (role) => L.people.find((p) => p.role === role && p.alive);
  const byId = (id) => L.people.find((p) => p.id === id);
  const friends = () => L.people.filter((p) => p.role === 'friend' && p.alive);
  const family = () => L.people.filter((p) => (p.role === 'mom' || p.role === 'dad' || p.role === 'sib') && p.alive);
  function addFriend(p) {
    if (L.people.includes(p)) { if (p.role !== 'mom' && p.role !== 'dad' && p.role !== 'sib') p.role = 'friend'; p.love = Math.max(p.love, 60); return false; }
    p.role = 'friend'; p.love = Math.max(p.love, 60);
    L.people.push(p);
    return true;
  }
  function relName(p) {
    if (p.role === 'mom') return 'Mom';
    if (p.role === 'dad') return 'Dad';
    if (p.role === 'sib') return p.gender === 'f' ? 'Sister' : 'Brother';
    if (p.role === 'friend') return 'Friend';
    return '';
  }

  // ============================================================
  //  CHANGING THINGS
  // ============================================================
  function change(stat, d) {
    if (stat === 'money') { L.money += d; return d; }
    const before = L.stats[stat];
    L.stats[stat] = U.clamp(before + d, 0, 100);
    return L.stats[stat] - before;
  }
  function addPersona(type, n = 1) {
    if (!L.persona[type] && L.persona[type] !== 0) return;
    L.persona[type] += n;
    L.personaLife[type] += n;
  }
  // what kind of person are you right now?
  function persona() {
    const p = L.persona;
    const total = p.good + p.evil + p.funny;
    if (total < 1.5) return null;
    const top = ['good', 'evil', 'funny'].sort((a, b) => p[b] - p[a])[0];
    return p[top] / total >= 0.4 ? top : null;
  }
  const PERSONA_WORD = { good: 'Good', evil: 'Evil', funny: 'Funny' };
  const PERSONA_EMOJI = { good: '😇', evil: '😈', funny: '🤡' };
  function title() {
    const st = STAGE_NAME[stageOf(L.age)];
    const p = persona();
    if (!p) return (L.age === 0 ? 'Brand New ' : 'Little ') + st;
    return PERSONA_WORD[p] + ' ' + st;
  }
  // the title of your whole life (at the end)
  function lifeTitle() {
    const p = L.personaLife;
    const total = p.good + p.evil + p.funny || 1;
    const sorted = ['good', 'evil', 'funny'].sort((a, b) => p[b] - p[a]);
    const [a, b] = sorted;
    if (p[a] / total >= 0.6) return { good: 'The Hero', evil: 'The Evil Mastermind', funny: 'The Class Clown Forever' }[a];
    const pair = [a, b].sort().join('+');
    return { 'evil+good': 'The Unpredictable One', 'funny+good': 'The Happy Hero', 'evil+funny': 'The Funny Villain' }[pair] || 'A Totally Normal Person';
  }
  const lifeTitleEmoji = () => { const p = L.personaLife; return PERSONA_EMOJI[['good', 'evil', 'funny'].sort((a, b) => p[b] - p[a])[0]]; };

  // ---------- jobs ----------
  function jobInfo() { return L.job ? JOBS[L.job.id] : null; }
  function jobTitle() {
    if (L.job) return JOBS[L.job.id].levels[L.job.level];
    if (L.teenJob) return TEEN_JOB.title;
    if (L.retired) return 'Retired';
    if (L.age >= 18) return 'No job';
    if (L.age >= 5) return 'Student';
    return 'Baby';
  }
  function salary() {
    if (L.job) {
      const j = JOBS[L.job.id];
      let pay = j.pay[L.job.level];
      if (L.job.id === 'youtuber') pay = Math.round(pay * (0.6 + (L.persona.funny > 3 ? 0.5 : 0) + L.stats.looks / 150));
      return pay;
    }
    if (L.teenJob) return TEEN_JOB.pay;
    return 0;
  }
  function canGetJob(id) {
    const j = JOBS[id];
    for (const k in j.need) if (L.stats[k] < j.need[k]) return false;
    return L.age >= 18;
  }
  function giveJob(id) {
    L.job = { id, level: 0, perf: 50, years: 0, boss: null };
    L.teenJob = null;
    L.everWorked = true;
    L.retired = false;
  }

  // ============================================================
  //  🎂 AGE UP — one year goes by
  //  returns a list of news lines for the birthday screen
  // ============================================================
  function ageUp() {
    const news = [];
    L.age++;
    // feelings fade a little so you can change who you are
    for (const k in L.persona) L.persona[k] = Math.round(L.persona[k] * 0.8 * 10) / 10;
    // money
    let pay = salary();
    if (pay) { L.money += pay; news.push(`💰 You earned ${U.money(pay)} as ${jobTitle()}.`); }
    if (L.age >= 6 && L.age <= 17 && !L.teenJob) {
      const mom = person('mom'), dad = person('dad');
      const love = ((mom ? mom.love : 50) + (dad ? dad.love : 50)) / 2;
      const pm = love > 35 ? 10 + L.age * 3 : 0;
      if (pm) { L.money += pm; news.push(`🪙 Pocket money: ${U.money(pm)}.`); } else news.push('😬 Your parents are too mad to give you pocket money.');
    }
    if (L.retired && L.everWorked) { L.money += 16000; news.push('👴 Pension: $16,000.'); }
    if (L.home === 1) { L.money -= HOMES[1].rent; news.push(`🏢 Rent for your tiny apartment: -${U.money(HOMES[1].rent)}.`); }
    if (L.pets.length && L.age >= 18) { const c = L.pets.length * 250; L.money -= c; news.push(`🦴 Pet food: -${U.money(c)}.`); }
    // job progress
    if (L.job) {
      L.job.years++;
      const j = JOBS[L.job.id];
      if (L.job.perf >= 75 && L.job.years >= 2 && L.job.level < j.levels.length - 1) {
        L.job.level++; L.job.years = 0; L.job.perf = 50;
        news.push(`🎉 PROMOTION! You are now ${j.levels[L.job.level]}!`);
        L.highlights.push(`Became ${j.levels[L.job.level]} at ${j.name}`);
        change('happy', 10);
      } else if (L.job.perf <= 10) {
        news.push(`😱 You got FIRED from ${j.name}!`);
        L.job = null;
        change('happy', -15);
      }
    }
    // body
    const st = stageOf(L.age);
    if (L.age > 50) change('health', -U.randInt(0, 3));
    if (L.age > 70) change('health', -U.randInt(1, 4));
    if (st === 'teen' || st === 'adult') change('looks', U.randInt(-1, 1));
    if (L.age > 55) change('looks', -U.randInt(0, 2));
    if (L.age <= 20) change('smarts', U.randInt(0, 3));
    // your home makes you happy
    for (const f of L.furniture) { const it = FURNITURE.find((x) => x.id === f.item); if (it && it.happy && U.chance(0.3)) change('happy', 1); }
    // family & friends get older
    for (const p of L.people) {
      if (!p.alive) continue;
      p.age++;
      if (p.role === 'friend') p.love = Math.max(0, p.love - U.randInt(1, 4));
      if ((p.role === 'mom' || p.role === 'dad') && p.age >= p.deathAge && L.age >= 25) {
        p.alive = false;
        news.push(`🕊️ Your ${relName(p).toLowerCase()} ${p.name} passed away peacefully at ${p.age}. You will always remember them.`);
        change('happy', -15);
      }
      if (p.role === 'friend' && p.love <= 0) { p.role = 'stranger'; news.push(`👋 You and ${p.name} are not friends anymore.`); }
    }
    // pets get older too
    for (const pt of L.pets.slice()) {
      pt.age++;
      if (pt.age > (pt.kind === 'parrot' ? 30 : 15) && U.chance(0.35)) {
        L.pets.splice(L.pets.indexOf(pt), 1);
        news.push(`🌈 Your ${PETS[pt.kind].name.toLowerCase()} ${pt.name} went to pet heaven. Good ${pt.kind === 'dog' ? 'dog' : 'friend'}, ${pt.name}.`);
        change('happy', -10);
      }
    }
    // a little random sadness or happiness drifts back to the middle
    if (L.stats.happy > 70) change('happy', -2); else if (L.stats.happy < 40) change('happy', 3);
    L.yearQueue = null; L.yearDone = []; L.yearMenu = {};
    return news;
  }
  function shouldDie() {
    if (L.age < 60) return false;
    if (L.age >= L.deathAge) return true;
    if (L.stats.health <= 0) return true;
    if (L.stats.health < 15 && U.chance(0.25)) return true;
    return L.age >= 110;
  }
  function score() {
    const s = L.stats;
    let pts = s.happy * 2 + s.health + s.smarts + s.looks * 0.5;
    pts += Math.min(200, Math.max(0, L.money) / 10000);
    pts += friends().length * 8 + L.pets.length * 10 + L.cars.length * 6 + L.home * 25 + L.furniture.length * 3;
    if (L.job) pts += L.job.level * 25;
    pts += L.highlights.length * 6;
    return Math.round(pts);
  }
  const stars = (sc) => sc >= 500 ? 5 : sc >= 400 ? 4 : sc >= 300 ? 3 : sc >= 200 ? 2 : 1;

  // ---------- diary ----------
  function log(text) { L.log.push({ age: L.age, text }); if (L.log.length > 400) L.log.shift(); }

  // ---------- save / load ----------
  function save() { try { localStorage.setItem('ml.save', JSON.stringify(L)); } catch (e) { /* ignore */ } }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem('ml.save'));
      if (s && s.v === 1) { L = s; uid = 1000 + L.people.length; return L; }
    } catch (e) { /* ignore */ }
    return null;
  }
  function hasSave() { try { const s = JSON.parse(localStorage.getItem('ml.save')); return !!(s && s.v === 1 && !s.dead); } catch (e) { return false; } }
  function clearSave() { try { localStorage.removeItem('ml.save'); } catch (e) { /* ignore */ } }
  function pastLives() { try { return JSON.parse(localStorage.getItem('ml.lives')) || []; } catch (e) { return []; } }
  function addPastLife(entry) { try { const a = pastLives(); a.unshift(entry); localStorage.setItem('ml.lives', JSON.stringify(a.slice(0, 12))); } catch (e) { /* ignore */ } }

  return {
    get L() { return L; }, set L(v) { L = v; },
    NAMES, LAST, PET_NAMES, SKINS, HAIRS, EYES, SHIRTS, PANTS, JOBS, TEEN_JOB, HOMES, FURNITURE, PETS, CARS, STAGE_NAME, STAGE_EMOJI, PERSONA_EMOJI, PERSONA_WORD,
    stageOf, newLife, randomLook, makePerson, makeStranger, person, byId, friends, family, addFriend, relName,
    change, addPersona, persona, title, lifeTitle, lifeTitleEmoji, jobInfo, jobTitle, salary, canGetJob, giveJob,
    ageUp, shouldDie, score, stars, log, save, load, hasSave, clearSave, pastLives, addPastLife,
  };
})();
