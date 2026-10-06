// ============================================================
//  MY LIFE — THE 📱 LIFE MENU
//  Things YOU choose to do: see people, find a job, go shopping
//  for pets, cars, furniture and homes, and more.
// ============================================================
window.ML = window.ML || {};

ML.Menu = (function () {
  const U = ML.U, Life = ML.Life;
  const $ = (id) => document.getElementById(id);
  const PI = Math.PI;
  const JOKES = [
    'Why did the cow cross the road? To get to the UDDER side!',
    'What do you call a sleeping dinosaur? A DINO-SNORE!',
    'Why are skeletons so calm? Nothing gets under their SKIN!',
    'What do you call cheese that isn\'t yours? NACHO cheese!',
    'Why did the math book look sad? It had too many PROBLEMS!',
  ];
  let pendingName = '';

  // ---------- the name box ----------
  function askName(title, def) {
    return new Promise((res) => {
      $('ask-title').textContent = title;
      const inp = $('ask-input');
      inp.value = def;
      $('ask').classList.add('show');
      setTimeout(() => { inp.focus(); inp.select(); }, 50);
      const done = () => { $('ask').classList.remove('show'); res((inp.value || def).trim().slice(0, 16) || def); };
      $('ask-ok').onclick = done;
      inp.onkeydown = (e) => { if (e.key === 'Enter') done(); };
    });
  }

  // ============================================================
  //  MOMENTS THE MENU CAN START
  // ============================================================
  function hangout(p) {
    const L = Life.L;
    const rel = Life.relName(p);
    const fam = p.role === 'mom' || p.role === 'dad' || p.role === 'sib';
    const scene = L.age <= 17 ? (fam ? 'home' : 'playground') : (fam && L.home >= 1 ? 'myhome' : U.pick(['park', 'street']));
    return {
      id: 'hang', scene, cast: { a: () => p },
      at: { a: [1.3, 0.7, -1.4] },
      text: `${fam ? '👨‍👩‍👧' : '🤝'} You spend time with ${rel ? 'your ' + rel.toLowerCase() + ' ' : ''}<b>${p.name}</b>. <small>💕 ${p.love}/100</small>`,
      choices: [
        { good: 'Give them a big hug', do: [['walk', 'me', 'a'], ['together', [['pose', 'me', 'hug', 1.4]], [['pose', 'a', 'hug', 1.4]]], ['emote', 'a', '💕']], result: `${p.name} feels loved! 🤗`, love: { a: 8 }, stats: { happy: 3 } },
        { good: 'Give them a present', minAge: 7, cost: L.age < 18 ? 20 : 100, do: [['walk', 'me', 'a'], ['give', 'me', 'a', 'gift'], ['pose', 'a', 'cheer', 1.2]], result: `${p.name} LOVES the present! 🎁`, love: { a: 15 }, stats: { happy: 3 } },
        { evil: 'Play a mean prank on them', do: [['sneak', 'me', 'a'], ['say', 'me', 'BOO!!!'], ['pose', 'a', 'scared', 1.2], ['pose', 'me', 'evilLaugh', 1.4], ['pose', 'a', 'angry', 1.2]], result: `${p.name} is NOT amused. 😠`, love: { a: -10 }, stats: { happy: 4 } },
        { evil: 'Ask them for money', need: (l) => fam && p.role !== 'sib' && l.age >= 6, do: [['walk', 'me', 'a'], ['say', 'me', 'Can I have some money? Pleeeease?']],
          luck: [
            { chance: () => p.love / 150, do: [['give', 'a', 'me', 'money']], result: `${p.name} gives you $${L.age < 18 ? 20 : 500}! 💵`, stats: { money: L.age < 18 ? 20 : 500 }, love: { a: -3 } },
            { chance: 1, do: [['pose', 'a', 'shrug', 1.2]], result: '"Money doesn\'t grow on trees!" No money for you. 😤', love: { a: -2 } },
          ] },
        { funny: 'Tell them a terrible joke', do: [['walk', 'me', 'a'], ['say', 'me', U.pick(JOKES)], ['pose', 'a', 'laugh', 1.6]], result: `${p.name} groans... then laughs! 😂`, love: { a: 6 }, stats: { happy: 4 } },
        { funny: 'Challenge them to a dance battle', do: [['pose', 'me', 'dance', 1.8], ['pose', 'a', 'dance', 1.8], ['pose', 'me', 'silly', 1.2], ['pose', 'a', 'laugh', 1.2]], result: 'Nobody wins. Everybody laughs. 💃🕺', love: { a: 7 }, stats: { happy: 5, health: 1 } },
      ],
    };
  }

  function petShop() {
    const L = Life.L;
    const choices = Object.keys(Life.PETS).map((kind) => {
      const P = Life.PETS[kind];
      return {
        say: `${P.emoji} Adopt a ${P.name.toLowerCase()}`, cost: P.price,
        do: [['walk', 'me', kind], ['pose', 'me', 'kneel', 0.8], ['pose', kind, 'happy', 1.2], ['emote', kind, '💕'], async () => { pendingName = await askName(`Name your ${P.name.toLowerCase()}!`, ML.Game.api.cast[kind].name); }],
        result: () => `Welcome home, <b>${pendingName}</b>! ${P.emoji}💕`,
        stats: { happy: 10 },
        run: (l, api) => api.addPet(kind, pendingName, api.cast[kind].color),
      };
    });
    choices.push({ say: 'Just looking, thanks!', do: [['walk', 'me', 'door']] });
    return {
      id: 'petshop', scene: 'petshop', react: false, pet: false,
      cast: { keeper: 'new:keeper', dog: 'pet:dog', cat: 'pet:cat', parrot: 'pet:parrot' },
      at: { keeper: 'keeper', dog: 'dog', cat: 'cat', parrot: 'parrot' }, pose: { cat: 'sit' },
      start: [['say', 'keeper', 'Welcome to PET PALACE!']],
      text: `🐾 Which pet do you want to take home? <small>You have ${U.money(L.money)}. Pets cost $250 a year for food.</small>`,
      choices,
    };
  }

  function carShop() {
    const L = Life.L;
    const choices = [];
    for (const kind of ['bike', 'car', 'sports']) {
      const C = Life.CARS[kind];
      if (L.cars.some((c) => c.kind === kind)) continue;
      const tooYoung = L.age < C.minAge || (kind !== 'bike' && L.age < 18 && !L.license);
      choices.push({
        say: `${C.emoji} Buy the ${C.name.toLowerCase()}`, cost: C.price,
        need: () => !tooYoung,
        do: [['walk', 'me', kind], ['ride', 'me', kind], ['confetti', kind], ['drive', kind, 'exit', 6]],
        result: `It's YOURS! ${C.emoji} Vroom vroom!`,
        stats: { happy: C.happy, looks: C.looks || 0 },
        run: (l, api) => { api.addCar(kind); l.cars[l.cars.length - 1].color = api.cast[kind].color; l.highlights.push('Bought a ' + C.name.toLowerCase()); },
      });
    }
    choices.push({ say: 'Just looking!', do: [['walk', 'me', 'door']] });
    const young = L.age < 18 && !L.license;
    return {
      id: 'carshop', scene: 'cardealer', react: false,
      cast: { seller: 'new:seller', bike: 'car:bike', car: 'car:car', sports: 'car:sports' },
      at: { seller: 'seller', bike: 'bike', car: 'car', sports: 'sports' },
      start: [['say', 'seller', 'Welcome to SUPER CARS! Take a look!']],
      text: `🚗 Bike: $200 · Car: $15,000 · Sports car: $120,000<br><small>You have ${U.money(L.money)}.${young ? ' You need to be 18 (or pass the driving test) to buy a car.' : ''}</small>`,
      choices,
    };
  }

  function furnitureShop() {
    const L = Life.L;
    const tier = L.home;
    const slots = Life.HOMES[tier].slots;
    const used = L.furniture.map((f) => f.slot);
    const free = [];
    for (let i = 0; i < slots; i++) if (!used.includes(i)) free.push(i);
    const choices = Life.FURNITURE.map((f) => ({
      say: `${f.emoji} ${f.name}`, cost: f.price,
      need: () => free.length > 0,
      next: () => placeStep(f, free),
    }));
    choices.push({ say: 'Move my furniture', need: () => L.furniture.length > 0 && free.length > 0, next: () => moveStep(free) });
    choices.push({ say: 'Sell something', need: () => L.furniture.length > 0, next: () => sellStep() });
    choices.push({ say: 'Done', do: [['pose', 'me', 'cheer', 1]] });
    return {
      id: 'furniture', scene: 'myhome', pet: true,
      text: free.length ? `🛋️ What do you want for your home? <small>You have ${U.money(L.money)} · ${free.length} free spots</small>` : '🛋️ Your home is FULL! Sell something or buy a bigger home.',
      choices,
    };
  }
  function slotMarkers(list) {
    const slots = ML.Scenes.SLOTS[Life.L.home];
    ML.Stage.setMarkers(list.map((i, k) => ({ x: slots[i][0], z: slots[i][1], label: String(k + 1) })));
  }
  function placeStep(f, free) {
    slotMarkers(free);
    return {
      text: `📍 Where should the <b>${f.name}</b> go? Pick a number!`,
      choices: free.map((slot, k) => ({
        say: `Spot ${k + 1}`, icon: '📍',
        do: [async () => { ML.Stage.setMarkers([]); const s = ML.Scenes.SLOTS[Life.L.home][slot]; ML.Stage.A.spawn(f.id, [s[0], s[1]], 'new' + slot, { r: s[2] }); }, ['poof', 'me'], ['pose', 'me', 'cheer', 1.2]],
        result: `${f.emoji} Nice! Your home looks better already.`,
        stats: { happy: f.happy || 1, smarts: f.smarts || 0, health: f.health || 0 },
        run: (l) => { l.furniture.push({ item: f.id, slot }); },
        log: `Bought a ${f.name.toLowerCase()}`,
      })),
    };
  }
  function moveStep(free) {
    const L = Life.L;
    return {
      text: '🔀 What do you want to move?',
      choices: L.furniture.map((fu) => {
        const f = Life.FURNITURE.find((x) => x.id === fu.item);
        return { say: `${f.emoji} ${f.name}`, next: () => { slotMarkers(free); return { text: `📍 Move the <b>${f.name}</b> to which spot?`, choices: free.map((slot, k) => ({ say: `Spot ${k + 1}`, icon: '📍', do: [async () => { ML.Stage.setMarkers([]); }], run: () => { fu.slot = slot; }, result: 'Moved! You will see it next time you\'re home. 🏠', log: false })) }; } };
      }),
    };
  }
  function sellStep() {
    const L = Life.L;
    return {
      text: '💸 What do you want to sell? (You get half the price back.)',
      choices: L.furniture.map((fu, i) => {
        const f = Life.FURNITURE.find((x) => x.id === fu.item);
        return { say: `${f.emoji} ${f.name} (+${U.money(f.price / 2)})`, run: (l) => { l.furniture.splice(l.furniture.indexOf(fu), 1); }, stats: { money: Math.round(f.price / 2) }, result: `Sold the ${f.name.toLowerCase()}!`, log: false };
      }),
    };
  }

  function realEstate() {
    const L = Life.L;
    const choices = [2, 3].filter((t) => t > L.home).map((t) => {
      const H = Life.HOMES[t];
      return { say: `${H.emoji} Buy a ${H.name.toLowerCase()}`, cost: H.price, do: [['confetti', 'me'], ['pose', 'me', 'cheer', 1.4]], result: `🔑 You bought a ${H.name}! Your furniture moves with you.`, stats: { happy: 15 }, run: (l, api) => api.setHome(t) };
    });
    choices.push({ say: 'Not today', do: [['pose', 'me', 'shrug', 1]] });
    return {
      id: 'realestate', scene: 'street', cast: { a: 'new:seller' }, at: { a: [1.4, 1.2, -1.2] },
      start: [['say', 'a', 'Looking for a new home?']],
      text: `🏢 You live in: <b>${Life.HOMES[L.home].name}</b>.<br>Big apartment: $150,000 · Penthouse: $1,000,000 <small>(you have ${U.money(L.money)})</small>`,
      choices,
    };
  }

  function jobHunt() {
    const L = Life.L;
    const choices = Object.keys(Life.JOBS).map((id) => {
      const J = Life.JOBS[id];
      return {
        say: `${J.emoji} ${J.levels[0]} at ${J.name} <small>(${U.money(J.pay[0])}/yr)</small>`,
        need: () => Life.canGetJob(id),
        next: () => ({
          scene: J.scene,
          text: `🤝 Job interview at <b>${J.name}</b>! The boss asks: "Why should we hire YOU?"`,
          choices: [
            { good: 'Be honest and polite', do: [['say', 'me', 'I work hard and I love learning new things!']], luck: [{ chance: 0.85, result: `🎉 You got the job! You are now ${J.levels[0]}!`, run: (l, api) => api.giveJob(id) }, { chance: 1, result: '"We\'ll call you." They don\'t call. 😕 Try again next year!' }] },
            { evil: 'Lie: "I invented the internet"', do: [['say', 'me', 'I invented the internet. Also pizza.'], ['pose', 'me', 'smug', 1]], luck: [{ chance: 0.5, result: `They believe you?! You're hired as ${J.levels[0]}! 😈`, run: (l, api) => api.giveJob(id) }, { chance: 1, result: 'They google you. NOT hired! 😈' }] },
            { funny: 'Do a funny dance', do: [['pose', 'me', 'silly', 2]], luck: [{ chance: id === 'youtuber' || id === 'burger' ? 0.9 : 0.4, result: `They laugh so hard they hire you! You are now ${J.levels[0]}! 🤡`, run: (l, api) => api.giveJob(id) }, { chance: 1, result: '"Please leave." 🤡' }] },
          ],
        }),
      };
    });
    choices.push({ say: 'Never mind', do: [['pose', 'me', 'shrug', 1]] });
    return { id: 'jobhunt', scene: 'street', text: '💼 Which job do you want to try for? (Some jobs need high 🧠 smarts or ❤️ health.)', choices };
  }
  function askRaise() {
    return {
      id: 'raise', scene: 'job', cast: { boss: 'boss' }, at: { boss: [1.3, 0.6, -1.3] },
      text: '💰 You knock on your boss <b>{boss}</b>\'s door. Time to ask for more money...',
      choices: [
        { good: 'Show all your hard work', do: [['say', 'me', 'I\'ve worked really hard this year!']], luck: [{ chance: () => Life.L.job.perf / 100, result: 'BONUS! The boss gives you $3,000! 💵', stats: { money: 3000 } }, { chance: 1, result: '"Work harder first." No bonus. 😕' }] },
        { evil: 'Threaten to quit', do: [['say', 'me', 'Give me more money or I QUIT!'], ['pose', 'boss', 'angry', 1.2]], luck: [{ chance: 0.35, result: 'It works! +$6,000! 😈', stats: { money: 6000 } }, { chance: 1, result: '"Okay, bye!" You are FIRED! 😱', run: (l) => { l.job = null; } }] },
        { funny: 'Ask while wearing a gorilla mask', do: [['pose', 'me', 'silly', 1.4], ['pose', 'boss', 'laugh', 1.4]], luck: [{ chance: 0.5, result: '"I respect the gorilla." +$2,000! 🦍', stats: { money: 2000 } }, { chance: 1, result: '"Please take off the gorilla mask." No bonus. 🦍' }] },
      ],
    };
  }
  function quitJob() {
    return {
      id: 'quit', scene: 'job', cast: { boss: 'boss' }, at: { boss: [1.3, 0.6, -1.3] },
      text: '🚪 Are you sure you want to QUIT your job?',
      choices: [
        { good: 'Quit nicely and say thank you', do: [['pose', 'me', 'wave', 1.2], ['walk', 'me', 'door']], result: 'You leave on good terms. 👋', run: (l) => { l.job = null; } },
        { evil: 'Flip the desk and storm out', do: [['pose', 'me', 'angry', 1.2], ['shake', 0.5], ['run', 'me', 'door']], result: 'You are gone in a cloud of drama! 💨😈', stats: { happy: 4 }, run: (l) => { l.job = null; } },
        { say: 'No, stay', do: [['pose', 'me', 'shrug', 1]], result: 'Okay, back to work!' },
      ],
    };
  }

  function petPlay() {
    return {
      id: 'petplay', scene: 'myhome', cast: { pet: 'pet' }, at: { pet: [1.0, 0.4, -0.6] }, pet: false,
      text: '🐾 You play with <b>{pet}</b>!',
      choices: [
        { good: 'Feed {pet} and give belly rubs', do: [['walk', 'me', 'pet'], ['pose', 'me', 'kneel', 1.4], ['pose', 'pet', 'happy', 1.6], ['emote', 'pet', '💕']], result: '{pet} is SO happy! 🐾', stats: { happy: 5 }, love: { pet: 10 } },
        { evil: 'Pretend to throw the ball (but don\'t)', do: [['pose', 'me', 'throw', 0.8], ['run', 'pet', [3, -1]], ['emote', 'pet', '❓'], ['pose', 'me', 'evilLaugh', 1.2]], result: '{pet} looks everywhere for the ball. So mean! 😈', stats: { happy: 3 }, love: { pet: -5 } },
        { funny: 'Teach {pet} to dance', do: [['pose', 'me', 'dance', 2], ['pose', 'pet', 'happy', 2], ['jump', 'pet', 2]], result: '{pet} can now do a little spin! Superstar pet! 🌟', stats: { happy: 7 }, love: { pet: 6 } },
      ],
    };
  }
  function drive() {
    return {
      id: 'drive', scene: 'street', cast: { car: 'car', a: 'new:adult' }, car: false,
      at: { car: [-8, -3.2, 1.57], a: [3.0, 1.6, -1.2] },
      start: [['ride', 'me', 'car']],
      text: '🚗 You go for a ride around the big city in your {car}!',
      choices: [
        { good: 'Drive carefully and wave at people', do: [['drive', 'car', [2, -3.2], 4], ['pose', 'a', 'wave', 1.2], ['drive', 'car', [20, -3.2], 4]], result: 'What a nice, relaxing ride! 😊', stats: { happy: 4 } },
        { evil: 'Splash a puddle on someone', do: [['drive', 'car', [20, -3.2], 12], ['emote', 'a', '💦'], ['pose', 'a', 'angry', 1.4]], result: 'SPLASH! They are soaked. You laugh all the way home. 😈', stats: { happy: 5 } },
        { funny: 'Blast music and dance while driving', do: [['sound', 'song'], ['drive', 'car', [20, -3.2], 5], ['pose', 'a', 'dance', 1.6]], result: 'People dance on the sidewalk as you drive by! 🎶🤡', stats: { happy: 7 } },
      ],
    };
  }
  function exercise() {
    return {
      id: 'exercise', scene: 'park', text: '🏃 Time to get moving! What do you do?',
      choices: [
        { good: 'Go for a long jog', do: [['run', 'me', 'far'], ['run', 'me', [8, 1.2]], ['run', 'me', 'me'], ['pose', 'me', 'flex', 1]], result: 'You feel strong! 💪', stats: { health: 6, looks: 1 } },
        { evil: 'Pretend to jog, then eat ice cream', do: [['run', 'me', 'far'], ['hold', 'me', 'icecream'], ['walk', 'me', 'me'], ['pose', 'me', 'eatStand', 1.6]], result: 'You "jogged" 30 meters and ate 3 ice creams. 🍦😈', stats: { happy: 5, health: -1 } },
        { funny: 'Do yoga with the ducks', do: [['walk', 'me', 'pond'], ['pose', 'me', 'stretch', 2], ['emote', 'me', '🦆🧘']], result: 'The ducks are not good at yoga. You are! 🧘🤡', stats: { health: 4, happy: 4 } },
      ],
    };
  }
  function study() {
    const L = Life.L;
    return {
      id: 'study', scene: L.age <= 17 ? 'bedroom' : 'myhome', at: L.age <= 17 ? { me: 'desk' } : {}, pose: L.age <= 17 ? { me: 'type' } : {},
      text: '📚 Time to learn something new!',
      choices: [
        { good: 'Read a big science book', do: [['hold', 'me', 'book'], ['pose', 'me', 'read', 2.2], ['emote', 'me', '💡']], result: 'You learned about black holes! 🌌', stats: { smarts: 6 } },
        { evil: 'Learn how to be a super-villain online', do: [['pose', 'me', 'phone', 2], ['pose', 'me', 'evilLaugh', 1.2]], result: 'Lesson 1: get a cool laugh. You already have one. 😈', stats: { smarts: 3, happy: 3 } },
        { funny: 'Learn 100 jokes by heart', do: [['pose', 'me', 'read', 1.4], ['say', 'me', 'Joke number 47...'], ['pose', 'me', 'laugh', 1.2]], result: 'You are now a walking joke book! 📖🤡', stats: { smarts: 3, happy: 5 } },
      ],
    };
  }
  function makeover() {
    const L = Life.L;
    const set = (o) => async () => { ML.Stage.A.poof('me'); ML.Game.api.setLook(o); };
    const styles = ['short', 'spiky', 'long', 'ponytail', 'curly', 'bun', 'afro', 'mohawk', 'bald'];
    return {
      id: 'makeover', scene: L.age <= 17 ? 'bedroom' : 'myhome', text: '💇 MAKEOVER TIME! A new look costs $40.',
      choices: [
        { say: '💇 New hairstyle', cost: 40, next: () => ({ text: 'Which hairstyle?', choices: styles.map((s) => ({ say: s[0].toUpperCase() + s.slice(1), icon: '💇', do: [set({ hairStyle: s }), ['pose', 'me', 'cheer', 1]], result: 'Looking good! ✨', stats: { looks: 2 }, log: false })) }) },
        { say: '🎨 New hair color', cost: 40, next: () => ({ text: 'Which color?', choices: [['Black', 0x1a1210], ['Brown', 0x7a4a24], ['Blonde', 0xf0d890], ['Red', 0xc8442a], ['Blue', 0x3a6ae8], ['Pink', 0xff6ac8], ['Green', 0x6ad84a]].map(([n, c]) => ({ say: n, icon: '🎨', do: [set({ hair: c }), ['pose', 'me', 'cheer', 1]], result: 'Fabulous! ✨', stats: { looks: 2 }, log: false })) }) },
        { say: '👕 New clothes', cost: 40, next: () => ({ text: 'What do you want to wear?', choices: [['T-shirt', 'tshirt'], ['Hoodie', 'hoodie'], ['Dress', 'dress'], ['Sweater', 'sweater'], ['Suit', 'suit']].map(([n, t]) => ({ say: n, icon: '👕', do: [set({ top: t, shirt: U.pick(Life.SHIRTS) }), ['pose', 'me', 'cheer', 1]], result: 'So stylish! ✨', stats: { looks: 2 }, log: false })) }) },
        { say: '🕶️ New accessory', cost: 40, next: () => ({ text: 'Pick one!', choices: [['Nothing', 'none'], ['Glasses', 'glasses'], ['Sunglasses', 'sunglasses'], ['Cap', 'cap'], ['Bow', 'bow'], ['Headband', 'headband'], ['Mustache', 'mustache'], ['Beard', 'beard'], ['Crown', 'crown']].filter((x) => x[1] !== 'crown' || Life.L.money > 50000).map(([n, t]) => ({ say: n, icon: '🕶️', do: [set({ extra: t }), ['pose', 'me', 'cheer', 1]], result: 'Nice! ✨', stats: { looks: 1 }, log: false })) }) },
        { say: 'Never mind', do: [['pose', 'me', 'shrug', 1]] },
      ],
    };
  }

  // ============================================================
  //  THE MENU WINDOW
  // ============================================================
  function btn(icon, label, sub, fn, disabled) {
    const b = document.createElement('button');
    b.className = 'mbtn';
    b.innerHTML = `<span class="mi">${icon}</span><span class="ml">${label}${sub ? `<small>${sub}</small>` : ''}</span>`;
    if (disabled) { b.disabled = true; b.title = disabled; b.innerHTML += `<small class="why">${disabled}</small>`; }
    b.onclick = fn;
    return b;
  }
  function section(title) {
    const s = document.createElement('div');
    s.className = 'msec';
    s.innerHTML = `<h3>${title}</h3><div class="mgrid"></div>`;
    $('m-body').appendChild(s);
    return s.querySelector('.mgrid');
  }
  const done = (k) => Life.L.yearMenu[k];
  const mark = (k) => { Life.L.yearMenu[k] = true; };
  function go(m, key) { if (key) mark(key); ML.Game.playMenuMoment(m); }

  function open() {
    const L = Life.L;
    $('m-body').innerHTML = '';
    // people
    const ppl = section('👨‍👩‍👧 People');
    const people = Life.family().concat(Life.friends());
    if (!people.length) ppl.innerHTML = '<p class="empty">No friends yet... say yes to people in your moments!</p>';
    for (const p of people) {
      const key = 'p' + p.id;
      ppl.appendChild(btn(p.role === 'friend' ? '🤝' : p.role === 'mom' ? '👩' : p.role === 'dad' ? '👨' : '🧒', p.name, `${Life.relName(p)} · 💕 ${p.love}`, () => go(hangout(p), key), done(key) ? 'Seen this year' : (L.age < 2 ? 'Too little' : null)));
    }
    // things to do
    const todo = section('⭐ Things to do');
    todo.appendChild(btn('🏃', 'Exercise', '❤️ health', () => go(exercise(), 'ex'), done('ex') ? 'Done this year' : (L.age < 4 ? 'Too little' : null)));
    todo.appendChild(btn('📚', 'Study', '🧠 smarts', () => go(study(), 'st'), done('st') ? 'Done this year' : (L.age < 4 ? 'Too little' : null)));
    todo.appendChild(btn('💇', 'Makeover', '✨ $40', () => go(makeover()), L.age < 8 ? 'Age 8+' : (L.money < 40 ? 'Need $40' : null)));
    if (L.pets.length) todo.appendChild(btn(Life.PETS[L.pets[0].kind].emoji, 'Play with ' + L.pets[0].name, '💕 ' + (L.pets[0].love || 50), () => go(petPlay(), 'pet'), done('pet') ? 'Done this year' : null));
    if (L.cars.some((c) => c.kind !== 'bike')) todo.appendChild(btn('🚗', 'Go for a drive', '', () => go(drive(), 'drv'), done('drv') ? 'Done this year' : null));
    // job
    if (L.age >= 18 && !L.retired) {
      const job = section('💼 Job');
      if (!L.job) job.appendChild(btn('🔎', 'Find a job', 'Burger, office, police...', () => go(jobHunt(), 'hunt'), done('hunt') ? 'Try next year' : null));
      else {
        const J = Life.jobInfo();
        job.appendChild(btn(J.emoji, Life.jobTitle(), `${J.name} · ${U.money(Life.salary())}/yr`, () => {}, 'Your job'));
        job.appendChild(btn('💰', 'Ask for a bonus', '', () => go(askRaise(), 'raise'), done('raise') ? 'Asked this year' : null));
        job.appendChild(btn('🚪', 'Quit job', '', () => go(quitJob())));
      }
      if (L.age >= 60 && L.job) job.appendChild(btn('👴', 'Retire now', '', () => go({ id: 'retireNow', scene: 'job', text: '👴 Do you want to retire? You\'ll get $16,000 every year.', choices: [{ say: 'Yes, retire!', do: [['pose', 'me', 'cheer', 1.4]], result: 'Hello, retirement! 🏖️', run: (l) => { l.job = null; l.retired = true; } }, { say: 'Not yet', do: [] }] })));
    }
    // shopping
    const shop = section('🛍️ Shopping');
    shop.appendChild(btn('🐾', 'Pet Palace', 'Dog $300 · Cat $200 · Parrot $500', () => go(petShop()), L.age < 10 ? 'Age 10+' : (L.pets.length >= 3 ? 'Max 3 pets' : null)));
    shop.appendChild(btn('🚗', 'Super Cars', 'Bike · Car · Sports car', () => go(carShop()), L.age < 6 ? 'Age 6+' : null));
    shop.appendChild(btn('🛋️', 'Furniture', 'Decorate your home', () => go(furnitureShop()), L.home < 1 ? 'Get your own home first (age 18)' : null));
    shop.appendChild(btn('🏢', 'New home', 'Big apartment · Penthouse', () => go(realEstate()), L.age < 18 ? 'Age 18+' : (L.home >= 3 ? 'You have the best home!' : null)));
    $('menu').classList.add('show');
  }

  function diary() {
    const L = Life.L;
    if (!L) return;
    const by = {};
    for (const e of L.log) (by[e.age] = by[e.age] || []).push(e.text);
    const ages = Object.keys(by).map(Number).sort((a, b) => b - a);
    $('d-body').innerHTML = ages.length ? ages.map((a) => `<div class="dage"><b>Age ${a}</b>${by[a].map((t) => `<div>${t}</div>`).join('')}</div>`).join('') : '<p class="empty">Nothing yet! Your choices will be written here.</p>';
    $('diary').classList.add('show');
  }

  return { open, diary, askName };
})();
