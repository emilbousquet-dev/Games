// ============================================================
//  DINO RAMPAGE — THE CITY
//  Builds each level: roads, sidewalks, houses, parks, shops,
//  skyscrapers... and remembers where everything is so the
//  dino can find what it bumps into.
// ============================================================
window.DR = window.DR || {};

DR.City = (function () {
  const U = DR.U, Mo = DR.Models, T = DR.Tex;
  const PI = Math.PI;
  const BLOCK = 50;          // one city block (from road middle to road middle)
  const RW = 10;             // road width
  const SW = 2.5;            // sidewalk width
  const IN = BLOCK / 2 - RW / 2 - SW;   // half-size of the space inside a block (for buildings)

  // ------------------------------------------------------------
  //  EVERY KIND OF THING: how big (tier), and what people shout
  // ------------------------------------------------------------
  const K = (tier, name, lines, extra) => Object.assign({ tier, name, lines }, extra || {});
  const KINDS = {
    fence: K(1, 'Fence', ['I JUST painted that fence!', 'My fence!!']),
    mailbox: K(1, 'Mailbox', ['My letters!', 'Hey, that was my mailbox!']),
    trashcan: K(1, 'Trash can', ['Eww, trash everywhere!', 'Who is going to clean THAT up?']),
    hydrant: K(1, 'Fire hydrant', ['Splash!', 'The hydrant!']),
    bench: K(1, 'Bench', ['I was sitting there!', 'My comfy bench!']),
    bush: K(1, 'Bush', ['My roses!', 'I just trimmed that bush!']),
    flowers: K(1, 'Flowers', ['My prize flowers!!', 'NOT THE TULIPS!']),
    gnome: K(1, 'Garden gnome', ['NOOO, GERALD THE GNOME!', 'Not my gnome!!']),
    trafficcone: K(1, 'Traffic cone', ['Watch the cones!']),
    newsbox: K(1, 'Newspaper box', ['Extra, extra! DINO SMASHES CITY!']),
    beachumbrella: K(1, 'Umbrella', ['My umbrella!', 'I was getting a tan!']),
    sandcastle: K(1, 'Sandcastle', ['My sandcastle!!', 'It took me ALL DAY to build that!']),
    beachball: K(1, 'Beach ball', ['Hey, give that back!', 'My beach ball!']),
    picnictable: K(1, 'Picnic table', ['Our picnic!!', 'I brought sandwiches!']),
    doghouse: K(1, 'Doghouse', ['Rex, run!', 'Where will the doggy sleep?!']),
    watermelon: K(1, 'Watermelon', ['HEY, THAT WAS MY LUNCH!', 'My watermelon!'], { food: true }),
    donut: K(1, 'Donut', ['My donut!!', 'I was saving that!'], { food: true }),
    cake: K(1, 'Birthday cake', ["That was my BIRTHDAY CAKE!", 'Happy birthday to... NOBODY!'], { food: true }),
    hotdog: K(1, 'Hot dog', ['My hot dog!', 'Extra mustard, huh?'], { food: true }),
    pizza: K(1, 'Pizza', ['My PIZZA!', 'It had extra cheese!'], { food: true }),
    icecream: K(1, 'Ice cream', ['MY ICE CREAM!!', 'Nooo, I only had one lick!'], { food: true }),
    burger: K(1, 'Burger', ['My burger!', 'I ordered that!'], { food: true }),
    car: K(2, 'Car', ['NOT MY CAR!', 'I just washed that!', 'My car! I still have 3 payments left!', 'Call my insurance!']),
    tree: K(2, 'Tree', ['That tree was 100 years old!', 'TIMBERRR!', 'The birds lived there!']),
    lamppost: K(2, 'Lamp post', ['Who turned off the lights?']),
    phonebooth: K(2, 'Phone booth', ['I was on the phone!', 'Hello? HELLO?!']),
    busstop: K(2, 'Bus stop', ['How will I get to work now?']),
    slide: K(2, 'Slide', ['The playground!', 'Wheee... NOOO!']),
    trampoline: K(2, 'Trampoline', ['BOING!', 'My trampoline!']),
    lifeguard: K(2, 'Lifeguard tower', ['Who will save the swimmers?!', 'The lifeguard tower!']),
    booth: K(2, 'Game booth', ['I almost won the teddy bear!']),
    'booth:cotton': K(2, 'Cotton candy stand', ['Not the cotton candy!'], { food: true }),
    'booth:popcorn': K(2, 'Popcorn stand', ['The popcorn!! POP POP POP!'], { food: true }),
    hotdogcart: K(2, 'Hot dog cart', ['My hot dog cart!!', 'That was lunch for the whole street!'], { food: true }),
    icecreamstand: K(2, 'Ice cream stand', ['MY ICE CREAM!!', 'Brain freeze!'], { food: true }),
    house: K(3, 'House', ['MY HOUSE!!', 'My homework was in there!', "Honey, I think we need a new house!", 'I just cleaned my room!']),
    bus: K(3, 'Bus', ['I missed my bus... forever!', 'The bus!']),
    truck: K(3, 'Truck', ['My delivery!', 'Those were 1000 rubber ducks!']),
    fountain: K(3, 'Fountain', ['My wishes!!', 'I threw a coin in there!']),
    gasstation: K(3, 'Gas station', ['The gas station!', 'Where do I get snacks now?']),
    carousel: K(3, 'Carousel', ['I wanted the pink horse!', 'Round and round... and SMASH!']),
    icecreamtruck: K(3, 'Ice cream truck', ['MY ICE CREAM!!', 'The ice cream truck! NOOOO!'], { food: true }),
    shop: K(4, 'Shop', ["We're CLOSED!", 'I was shopping!', 'The big sale was TODAY!']),
    'shop:burger': K(4, 'Burger restaurant', ['My order was number 42!', 'The burger place!!'], { food: true }),
    'shop:donut': K(4, 'Donut shop', ['NOT THE DONUT SHOP!', 'The police will be so sad!'], { food: true }),
    apartment: K(4, 'Apartment', ['My apartment!', 'I just moved in!']),
    watertower: K(4, 'Water tower', ['SPLASH!', 'Somebody get a towel!']),
    tower: K(5, 'Skyscraper', ['I left my phone in there!', 'My office!! ...Wait, no more work!', 'That was 50 floors!']),
    hotel: K(5, 'Hotel', ['My vacation!', 'I wanted room service!']),
    lighthouse: K(5, 'Lighthouse', ['How will the boats find their way?!']),
    ferris: K(5, 'Ferris wheel', ['I wanted to ride that!', 'The wheel is ROLLING AWAY!']),
    // secret!
    fbibase: K(3, 'Totally Normal Bakery', ["It's just a normal bakery! ...With 12 antennas.", 'NOT THE SECRET BA... I mean, NOT THE BAKERY!']),
    'car:fbi': K(2, 'FBI van', ['Our secret van!', 'Hey! That van was UNDERCOVER!']),
    // army base
    sandbags: K(1, 'Sandbags', ['Our sandbag wall!', 'Those took forever to fill!']),
    crates: K(1, 'Crates', ['Those were top secret socks!', 'The crates!']),
    pudding: K(1, 'Army pudding', ["That was the General's PUDDING!", 'My pudding cup!'], { food: true }),
    jeep: K(2, 'Jeep', ['My jeep!', 'Somebody call a tow truck!']),
    fueltank: K(2, 'Fuel tank', ['Not the fuel!']),
    flagpole: K(2, 'Flag pole', ['The flag! Salute... it?']),
    armytank: K(3, 'Tank', ['It ate the TANK!', 'That tank was brand new!']),
    barracks: K(3, 'Barracks', ['My bunk bed!', 'Where do we sleep now?!']),
    hangar: K(4, 'Hangar', ['The hangar!', 'Our planes were in there! ...Oh wait, they flew away.']),
    radar: K(4, 'Radar tower', ['Radar says... a big green blob. RIGHT HERE.']),
    'shop:pudding': K(4, 'Mess hall', ['Lunch is CANCELED!', 'Not the pudding factory!'], { food: true }),
    controltower: K(5, 'Control tower', ['Control tower to dinosaur: PLEASE STOP!']),
  };
  const GROW = [0, 1, 2.5, 10, 30, 80];       // how much bigger you get for each tier
  const POINTS = [0, 10, 50, 150, 400, 1000];
  const meta = (kind, variant) => KINDS[kind + ':' + variant] || KINDS[kind];

  // ------------------------------------------------------------
  //  THE LEVELS (each letter is one city block)
  //  H houses · P park · S shops · T towers · A apartments
  //  G gas station & parking · O beach hotel · W fairground · B beach
  // ------------------------------------------------------------
  const LEVELS = [
    {
      id: 1, name: 'Sleepy Suburbs', emoji: '🏡', seed: 11, par: 360,
      about: 'A quiet little town with houses, gardens and picnics. Nobody expects a dinosaur!',
      map: ['HHHPHH', 'HPHHSH', 'HHSTHH', 'HHTSHP', 'PHHHHH', 'HHPHHF'],
      start: [0, 4], sky: [0x4aa8ff, 0xcfeeff], fog: 0xcfeeff,
    },
    {
      id: 2, name: 'Downtown', emoji: '🏙️', seed: 22, par: 390,
      about: 'The big city! Busy streets, fancy shops and LOTS of skyscrapers.',
      map: ['APSTSGP', 'STTSTTA', 'GSTPTSS', 'TTSATTG', 'PSTTSAS', 'STGSTTP', 'FSPTSAS'],
      start: [6, 0], sky: [0x3a90e8, 0xe0e8f0], fog: 0xe0e8f0, army: { from: 3, extra: 0 },
    },
    {
      id: 3, name: 'Beach Boardwalk', emoji: '🎡', seed: 33, par: 480,
      about: 'Sunshine, ice cream, a fair with a giant Ferris wheel... and the ocean!',
      map: ['HHSPHHF', 'HOSHSOH', 'SHWOWHS', 'OSHWHSO', 'BBWBBWB', 'BBBBBBB'],
      start: [3, 5], sky: [0x2aa0f0, 0xfff0d0], fog: 0xfff0d8, ocean: true, army: { from: 3, extra: 0 },
    },
    {
      id: 4, name: 'Army Base', emoji: '🚁', seed: 44, par: 480,
      about: 'A little town right next to a big army base. The tanks and helicopters are READY... are you?',
      map: ['HHPSMMM', 'HHSTMMM', 'PSHTMMM', 'HHSSMMM', 'HPHTTMF', 'HHSHTSM', 'HHHPSTM'],
      start: [3, 6], sky: [0x5a9ad8, 0xe8e4d8], fog: 0xe8e4d8, army: { from: 2, extra: 1 },
    },
  ];

  // ------------------------------------------------------------
  //  STATE
  // ------------------------------------------------------------
  let scene, group, rnd;
  let objects = [], foods = [], drivers = [], spinners = [], rubbles = [];
  const hash = new Map();
  const CELL = 10;
  let level = null;
  let nx = 6, nz = 6;
  let water = null;
  const info = { w: 300, d: 300, roadsX: [], roadsZ: [], shore: Infinity };

  function init(sc) { scene = sc; }

  // ---------- the "where is everything" grid ----------
  const hkey = (cx, cz) => cx * 10007 + cz;
  function cellsOf(o) {
    const out = [];
    const x0 = Math.floor((o.x - o.hx) / CELL), x1 = Math.floor((o.x + o.hx) / CELL);
    const z0 = Math.floor((o.z - o.hz) / CELL), z1 = Math.floor((o.z + o.hz) / CELL);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) out.push(hkey(i, j));
    return out;
  }
  function hashAdd(o) {
    o.cells = cellsOf(o);
    for (const k of o.cells) { let l = hash.get(k); if (!l) hash.set(k, l = []); l.push(o); }
  }
  function hashRemove(o) {
    if (!o.cells) return;
    for (const k of o.cells) { const l = hash.get(k); if (l) { const i = l.indexOf(o); if (i >= 0) l.splice(i, 1); } }
    o.cells = null;
  }
  let qid = 0;
  const qout = [];
  // everything whose box touches the circle (x, z, r)
  function query(x, z, r) {
    qid++;
    qout.length = 0;
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
    const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const l = hash.get(hkey(i, j));
      if (!l) continue;
      for (const o of l) {
        if (o.q === qid || !o.alive) continue;
        o.q = qid;
        if (boxDist(o, x, z) <= r) qout.push(o);
      }
    }
    return qout.slice();
  }
  // how far a point is from the edge of a thing's box (0 = inside)
  function boxDist(o, x, z) {
    const dx = Math.max(Math.abs(x - o.x) - o.hx, 0), dz = Math.max(Math.abs(z - o.z) - o.hz, 0);
    return Math.hypot(dx, dz);
  }

  // ------------------------------------------------------------
  //  PLACING THINGS
  // ------------------------------------------------------------
  // q = which way it faces: 0 = +z, 1 = +x, 2 = -z, 3 = -x
  function place(kind, x, z, q = 0, variant) {
    const p = Mo.prop(kind, rnd, variant);
    const m = meta(kind, variant);
    p.mesh.position.set(x, 0, z);
    p.mesh.rotation.y = q * PI / 2;
    group.add(p.mesh);
    const odd = q % 2 === 1;
    const o = {
      kind, variant, key: KINDS[kind + ':' + variant] ? kind + ':' + variant : kind,
      tier: m.tier, food: !!m.food, name: m.name, lines: m.lines,
      x, z, q, hx: (odd ? p.cd : p.cw) / 2, hz: (odd ? p.cw : p.cd) / 2, vw: (odd ? p.d : p.w) / 2, vd: (odd ? p.w : p.d) / 2,
      h: p.h, mesh: p.mesh, cols: p.cols, alive: true, spin: p.spin,
      grow: GROW[m.tier] * (m.food ? 3 : 1), pts: POINTS[m.tier] * (m.food ? 2 : 1),
      wobble: 0, vis: true,
    };
    if (o.food) {
      const s = new THREE.Sprite(Mo.glowMat(0xffe070));
      const sz = 1.5 + o.h * 0.5;
      s.scale.set(sz, sz, 1);
      s.position.set(x, o.h + 0.6 + o.h * 0.1, z);
      group.add(s);
      o.sparkle = s;
      foods.push(o);
    }
    if (o.spin) spinners.push(o);
    objects.push(o);
    hashAdd(o);
    return o;
  }
  const faceTo = (dx, dz) => ((Math.round(Math.atan2(dx, dz) / (PI / 2)) % 4) + 4) % 4;
  const R = (a, b) => a + rnd() * (b - a);
  const chance = (p) => rnd() < p;
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const FOOD1 = ['watermelon', 'donut', 'cake', 'hotdog', 'pizza', 'icecream', 'burger'];

  // things along the sidewalk around a block
  function sidewalk(cx, cz, busy, beach) {
    const off = BLOCK / 2 - RW / 2 - 1.2;
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = faceTo(sx, sz);
      for (let k = -2; k <= 2; k++) {
        const t = k * 8.5 + R(-1, 1);
        const x = cx + (sx ? sx * off : t), z = cz + (sz ? sz * off : t);
        if (beach) { if (chance(0.3)) place(pick(['beachumbrella', 'beachball', 'sandcastle']), x, z, q); continue; }
        if (k % 2 === 0) { if (chance(0.8)) place('lamppost', x, z, q); continue; }
        const r = rnd();
        if (r < (busy ? 0.18 : 0.3)) place('tree', x, z, q, 'round');
        else if (r < 0.42) place('hydrant', x, z, q);
        else if (r < 0.55) place('trashcan', x, z, q);
        else if (r < 0.68) place('bench', x, z, q);
        else if (r < (busy ? 0.78 : 0.72)) place('newsbox', x, z, q);
        else if (busy && r < 0.84) place('busstop', x, z, q);
        else if (busy && r < 0.88) place('phonebooth', x, z, q);
        else if (r < 0.92) place('trafficcone', x, z, q);
      }
    }
  }
  function foodSnack(x, z) { place(pick(FOOD1), x, z, Math.floor(rnd() * 4)); }

  // ---------- H: four houses with gardens ----------
  function blockHouses(cx, cz) {
    for (const lx of [-1, 1]) for (const lz of [-1, 1]) {
      const x0 = cx + lx * IN / 2, z0 = cz + lz * IN / 2;
      const q = lz > 0 ? 0 : 2;               // houses face the nearest road (+z or -z)
      const fz = lz;                            // front direction
      const shift = chance(0.5) ? -1 : 1;
      const hx = x0 + shift * 2.2;
      const h = place('house', hx, z0 + fz * 2.2, q);
      place('mailbox', x0 + shift * 2.2 + (h.hx - 1) * -shift, z0 + fz * (IN / 2 - 0.8), q);
      if (chance(0.65)) place('car', x0 - shift * 5.5, z0 + fz * (IN / 2 - 4), q);
      else if (chance(0.5)) place('bush', x0 - shift * 5.5, z0 + fz * (IN / 2 - 3), q);
      if (chance(0.6)) place(pick(['flowers', 'bush', 'gnome']), hx + R(-2.5, 2.5), z0 + fz * (IN / 2 - 1.2), q);
      // back yard (between the two rows of houses)
      const by = z0 - fz * (IN / 2 - 2.6);
      if (lz > 0 && chance(0.75)) {
        for (let k = -1; k <= 1; k++) if (chance(0.8)) place('fence', x0 + k * 5.2, cz, 0);
      }
      const yard = rnd();
      if (yard < 0.25) { place('picnictable', x0 - 3, by, 0); foodSnack(x0 + 2.5, by); }
      else if (yard < 0.45) place('trampoline', x0 + R(-3, 3), by, 0);
      else if (yard < 0.62) { place('doghouse', x0 + R(-4, 4), by, q); if (chance(0.5)) place('gnome', x0 + R(-5, 5), by + R(-1, 1), q); }
      else if (yard < 0.78) foodSnack(x0 + R(-4, 4), by);
      if (chance(0.7)) place('tree', x0 + (chance(0.5) ? -5.5 : 5.5), by, 0, chance(0.3) ? 'pine' : 'round');
    }
    sidewalk(cx, cz, false);
  }
  // ---------- P: a park ----------
  function blockPark(cx, cz) {
    place('fountain', cx, cz, 0);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * PI * 2 + R(-0.2, 0.2), d = R(12, 16);
      place('tree', cx + Math.cos(a) * d, cz + Math.sin(a) * d, 0, chance(0.3) ? 'pine' : 'round');
    }
    for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + PI / 4; place('bench', cx + Math.cos(a) * 6.5, cz + Math.sin(a) * 6.5, faceTo(-Math.cos(a), -Math.sin(a))); }
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * PI * 2 + 0.4, d = 9.5;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      place('picnictable', x, z, 0);
      foodSnack(x + 2.2, z + R(-1, 1));
    }
    place('slide', cx + R(-4, 4), cz - 13, 0);
    for (let i = 0; i < 5; i++) place(pick(['flowers', 'bush', 'bush', 'trashcan']), cx + R(-12, 12), cz + R(-12, 12), 0);
    for (let i = 0; i < 2; i++) foodSnack(cx + R(-12, 12), cz + R(-12, 12));
    if (chance(0.6)) place('hotdogcart', cx + 13, cz + 5, 1);
    if (chance(0.6)) place('icecreamtruck', cx - 14, cz + R(-6, 6), 0);
    place('gnome', cx + R(-3, 3), cz + 5, 0);
    sidewalk(cx, cz, false);
  }
  // ---------- S: shops with a parking lot ----------
  function blockShops(cx, cz) {
    for (const lz of [-1, 1]) for (const lx of [-1, 1]) {
      const variant = chance(0.22) ? pick(['burger', 'donut']) : undefined;
      place('shop', cx + lx * 8.2, cz + lz * (IN - 6.2), lz > 0 ? 0 : 2, variant);
    }
    for (const lz of [-1, 1]) {
      const big = chance(0.5);   // sometimes a bus or a truck is parked here too
      if (big) place(pick(['bus', 'truck', 'truck']), cx - 8, cz + lz * 3, 1);
      for (let k = big ? 3 : 0; k < 7; k++) {
        if (chance(0.55)) place('car', cx - 13 + k * 4.3, cz + lz * 3, lz > 0 ? 0 : 2);
        else if (chance(0.3)) place('trafficcone', cx - 13 + k * 4.3, cz + lz * 3, 0);
      }
    }
    if (chance(0.5)) place('hotdogcart', cx + R(-8, 8), cz, 0);
    if (chance(0.4)) foodSnack(cx + R(-12, 12), cz + R(-1, 1));
    sidewalk(cx, cz, true);
  }
  // ---------- T: skyscrapers! ----------
  function blockTowers(cx, cz) {
    const corners = [[-1, -1], [1, 1], [1, -1], [-1, 1]];
    if (chance(0.5)) corners.reverse();
    corners.forEach(([sx, sz], i) => {
      const x = cx + sx * 9.2, z = cz + sz * 9.2;
      if (i < 2) place('tower', x, z, faceTo(sx, 0));
      else if (i === 2) {
        const r = rnd();
        if (r < 0.35) place('watertower', x, z, 0);
        else if (r < 0.55) place('tower', x, z, faceTo(0, sz));
        else { place('fountain', x, z, 0); place('bench', x + sx * -5, z, 1); }
      } else {
        place('tree', x - 4, z - 4, 0); place('tree', x + 4, z + 4, 0);
        place('bench', x, z, faceTo(-sx, 0));
        if (chance(0.7)) place('hotdogcart', x + 3, z - 4, 0); else foodSnack(x, z + 3);
        place('flowers', x - 4, z + 4, 0);
      }
    });
    sidewalk(cx, cz, true);
  }
  // ---------- A: apartments with a playground ----------
  function blockApartments(cx, cz) {
    for (const lz of [-1, 1]) place('apartment', cx + R(-3, 3), cz + lz * (IN - 7.5), lz > 0 ? 0 : 2);
    place('slide', cx - 8, cz, 1); place('trampoline', cx + 8, cz, 0);
    place('tree', cx - 14, cz, 0); place('tree', cx + 14, cz, 0);
    place('bench', cx, cz + 2, 2); place('bench', cx + 3, cz - 2, 0);
    foodSnack(cx + R(-4, 4), cz);
    sidewalk(cx, cz, true);
  }
  // ---------- G: gas station and a big parking lot ----------
  function blockGas(cx, cz) {
    place('gasstation', cx - 8, cz - 10, 0);
    place('bus', cx + 10, cz - 10, 1);
    place(chance(0.5) ? 'truck' : 'icecreamtruck', cx + 12, cz + 3, 0);
    for (const lz of [2, 8, 14]) for (let k = 0; k < 5; k++) {
      if (chance(0.6)) place('car', cx - 16 + k * 4.4, cz + lz, lz > 5 ? 2 : 0);
    }
    for (let i = 0; i < 4; i++) place('trafficcone', cx + R(-14, 4), cz + R(-2, 0), 0);
    sidewalk(cx, cz, true);
  }
  // ---------- O: beach hotel with a pool ----------
  function blockHotel(cx, cz) {
    place('hotel', cx - 8, cz - 8, 0);
    place('tower', cx + 9.3, cz + 9.3, 0);
    for (let i = 0; i < 3; i++) place('beachumbrella', cx - 15 + i * 6, cz + 8, 0);
    for (const z of [3, 15]) place('tree', cx - 3, cz + z, 0, 'palm');
    place('icecreamstand', cx + 10, cz - 11, 0);
    foodSnack(cx - 12, cz + 14);
    sidewalk(cx, cz, true);
  }
  // ---------- W: the fair ----------
  let hadFerris = false;
  function blockFair(cx, cz) {
    if (!hadFerris) { place('ferris', cx, cz - 5, 0); hadFerris = true; }
    else place('carousel', cx, cz - 4, 0);
    const booths = ['cotton', 'popcorn', undefined, undefined];
    for (let i = 0; i < 4; i++) place('booth', cx - 12 + i * 8, cz + 11, 0, booths[(i + (cx | 0)) % 4]);
    place('hotdogcart', cx + 14, cz - 12, 3);
    for (let i = 0; i < 3; i++) place(pick(['bench', 'trashcan', 'flowers']), cx + R(-15, 15), cz + 5, 0);
    foodSnack(cx - 14, cz - 12);
    sidewalk(cx, cz, true);
  }
  // ---------- F: the TOTALLY NORMAL BAKERY (it's really a secret FBI base!) ----------
  function blockFBI(cx, cz) {
    place('fbibase', cx, cz - 5, 0);
    place('car', cx - 12, cz + 9, 0, 'fbi'); place('car', cx + 12, cz + 9, 0, 'fbi');
    for (let i = -2; i <= 2; i++) place('bush', cx + i * 3.6, cz - 14, 0);
    for (const x of [-14, 14]) { place('tree', cx + x, cz - 8, 0, 'pine'); place('tree', cx + x, cz - 1, 0, 'pine'); }
    place('mailbox', cx + 4, cz + 15, 0); place('flowers', cx - 4, cz + 3, 0);
    place('donut', cx + 5, cz + 5, 0);
    sidewalk(cx, cz, false);
  }
  // ---------- M: the army base ----------
  function blockMilitary(cx, cz) {
    const kind = Math.floor(rnd() * 3);
    if (kind === 0) {
      place('hangar', cx - 6, cz - 7, 0);
      place('armytank', cx + 11, cz - 9, 0); place('armytank', cx + 11, cz + 1, 0);
      place('jeep', cx - 12, cz + 9, 0); place('jeep', cx - 6, cz + 9, 0);
      place('fueltank', cx + 2, cz + 7, 0);
      place('crates', cx + 3, cz + 13, 0); place('sandbags', cx + 12, cz + 13, 0); place('pudding', cx - 14, cz + 15, 0);
    } else if (kind === 1) {
      place('barracks', cx - 6, cz - 10, 0); place('barracks', cx - 6, cz + 1, 0);
      place('radar', cx + 11, cz - 10, 0); place('flagpole', cx + 11, cz + 1, 0);
      place('jeep', cx + 12, cz + 9, 0); place('armytank', cx - 6, cz + 12, 1);
      place('crates', cx + 5, cz + 14, 0); place('sandbags', cx + 5, cz + 9, 0); place('pudding', cx + 14, cz + 15, 0);
    } else {
      place('controltower', cx - 9, cz - 9, 0); place('radar', cx + 10, cz - 11, 0);
      place('shop', cx + 6, cz + 9, 0, 'pudding');
      place('armytank', cx - 10, cz + 7, 0); place('jeep', cx - 14, cz + 14, 0);
      place('crates', cx - 2, cz + 1, 0); place('sandbags', cx + 4, cz - 2, 0); place('pudding', cx - 4, cz + 13, 0);
    }
    // sandbags, crates and lights around the edge
    const off = BLOCK / 2 - RW / 2 - 1.2;
    for (const [sx, sz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = faceTo(sx, sz);
      for (let k = -2; k <= 2; k++) {
        const t = k * 8.5, x = cx + (sx ? sx * off : t), z = cz + (sz ? sz * off : t);
        if (k % 2 === 0) place('lamppost', x, z, q);
        else place(chance(0.6) ? 'sandbags' : 'crates', x, z, q);
      }
    }
  }
  // ---------- B: the beach ----------
  let hadLighthouse = false;
  function blockBeach(cx, cz, row) {
    if (!hadLighthouse && row === nz - 1 && cx > info.w * 0.6) { place('lighthouse', cx + 10, cz + 10, 0); hadLighthouse = true; }
    for (let i = 0; i < 7; i++) place('beachumbrella', cx + R(-17, 17), cz + R(-17, 17), Math.floor(rnd() * 4));
    for (let i = 0; i < 3; i++) place('sandcastle', cx + R(-17, 17), cz + R(-17, 17), 0);
    for (let i = 0; i < 3; i++) place('beachball', cx + R(-17, 17), cz + R(-17, 17), 0);
    for (let i = 0; i < 3; i++) place('tree', cx + R(-17, 17), cz + R(-17, 17), 0, 'palm');
    if (chance(0.5)) place('lifeguard', cx + R(-10, 10), cz + R(0, 10), 0);
    if (chance(0.5)) place('icecreamstand', cx + R(-12, 12), cz - 12, 0);
    for (let i = 0; i < 2; i++) place(pick(['watermelon', 'icecream', 'hotdog', 'pizza']), cx + R(-16, 16), cz + R(-16, 16), 0);
    sidewalk(cx, cz, false, true);
  }

  // ------------------------------------------------------------
  //  GROUND, ROADS, SKY
  // ------------------------------------------------------------
  const groundMats = {};
  function gmat(name, texFn) {
    return groundMats[name] || (groundMats[name] = new THREE.MeshStandardMaterial({ map: texFn(), roughness: 0.95 }));
  }
  // lay flat rectangles on the ground: list of [x, z, w, d, (roadAlongX)]
  function flatMesh(list, mat, y, uvScale, roadMode) {
    if (!list.length) return;
    const pos = [], uv = [], nor = [], idx = [];
    list.forEach(([x, z, w, d, alongX], i) => {
      const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
      pos.push(x0, y, z0, x1, y, z0, x1, y, z1, x0, y, z1);
      nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      if (roadMode) {
        // u goes across the road, v goes along it
        if (alongX) uv.push(0, x0 / RW, 0, x1 / RW, 1, x1 / RW, 1, x0 / RW);
        else uv.push(0, z0 / RW, 1, z0 / RW, 1, z1 / RW, 0, z1 / RW);
      } else uv.push(x0 / uvScale, z0 / uvScale, x1 / uvScale, z0 / uvScale, x1 / uvScale, z1 / uvScale, x0 / uvScale, z1 / uvScale);
      const b = i * 4;
      idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true;
    group.add(m);
    return m;
  }
  function buildGround(map) {
    const W = info.w, D = info.d;
    // big grass everywhere
    const grassMat = gmat('grass', T.grass);
    const big = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), grassMat);
    big.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 300; });
    big.rotation.x = -PI / 2; big.position.set(W / 2, 0, D / 2); big.receiveShadow = true;
    group.add(big);
    const conc = [], sand = [], roads = [], walks = [], boards = [];
    const isBeach = (i, j) => { if (i < 0 || j < 0 || i >= nx || j >= nz) return j >= nz - 1 && level.ocean; return map[j][i] === 'B'; };
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const c = map[j][i], cx = i * BLOCK + BLOCK / 2, cz = j * BLOCK + BLOCK / 2;
      const inner = BLOCK - RW;
      if (c === 'B') { sand.push([cx, cz, BLOCK + 0.1, BLOCK + 0.1]); continue; }
      if ('STAGOWM'.includes(c)) conc.push([cx, cz, inner - SW * 2, inner - SW * 2]);
      // sidewalk ring
      walks.push([cx, cz - inner / 2 + SW / 2, inner, SW], [cx, cz + inner / 2 - SW / 2, inner, SW], [cx - inner / 2 + SW / 2, cz, SW, inner - SW * 2], [cx + inner / 2 - SW / 2, cz, SW, inner - SW * 2]);
    }
    // roads: one piece per block edge (beach edges get a wooden boardwalk instead)
    for (let i = 0; i <= nx; i++) for (let j = 0; j < nz; j++) {
      const x = i * BLOCK, z = j * BLOCK + BLOCK / 2;
      const beachy = isBeach(i - 1, j) && isBeach(i, j);
      (beachy ? boards : roads).push([x, z, RW, BLOCK - RW, false]);
    }
    for (let j = 0; j <= nz; j++) for (let i = 0; i < nx; i++) {
      const z = j * BLOCK, x = i * BLOCK + BLOCK / 2;
      const beachy = isBeach(i, j - 1) && isBeach(i, j);
      (beachy ? boards : roads).push([x, z, BLOCK - RW, RW, true]);
    }
    // crossings
    const asphalt = [];
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= nz; j++) {
      if (isBeach(i - 1, j - 1) && isBeach(i, j - 1) && isBeach(i - 1, j) && isBeach(i, j)) boards.push([i * BLOCK, j * BLOCK, RW, RW]);
      else asphalt.push([i * BLOCK, j * BLOCK, RW, RW]);
    }
    flatMesh(conc, gmat('conc', T.concrete), 0.02, 16);
    flatMesh(walks, gmat('conc', T.concrete), 0.06, 8);
    flatMesh(sand, gmat('sand', T.sand), 0.03, 12);
    flatMesh(roads, gmat('road', T.road), 0.04, 0, true);
    flatMesh(asphalt, groundMats.asphalt || (groundMats.asphalt = new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 0.95 })), 0.045, 10);
    flatMesh(boards, groundMats.boards || (groundMats.boards = new THREE.MeshStandardMaterial({ color: 0xc8965a, roughness: 0.9 })), 0.05, 10);
    // the ocean
    if (level.ocean) {
      info.shore = D + 6;
      flatMesh([[W / 2, D + 20, W + 400, 40]], gmat('sand', T.sand), 0.03, 12);
      const wt = T.water();
      water = new THREE.Mesh(new THREE.PlaneGeometry(3000, 1200), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 }));
      water.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * (i % 2 ? 60 : 150); });
      water.rotation.x = -PI / 2; water.position.set(W / 2, 0.25, D + 32 + 600);
      group.add(water);
    } else info.shore = Infinity;
    // green hills far away all around
    const hills = new Mo.Builder();
    const hr = U.seeded(level.seed * 7);
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * PI * 2 + hr() * 0.1;
      if (level.ocean && Math.sin(a) > 0.2) continue;
      const d = 520 + hr() * 220, r = 60 + hr() * 90;
      hills.sph(r, r * (0.3 + hr() * 0.35), r, [0x5aa84a, 0x6ab85a, 0x4a983a][i % 3], [W / 2 + Math.cos(a) * d, 0, D / 2 + Math.sin(a) * d], null, true);
    }
    group.add(hills.mesh());
  }

  // a sky that fades from blue (top) to light (horizon), with fluffy clouds
  let sky = null, clouds = [];
  function buildSky() {
    const g = new THREE.SphereGeometry(1, 24, 16);
    const col = [], top = new THREE.Color(level.sky[0]), hor = new THREE.Color(level.sky[1]), c = new THREE.Color();
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); c.copy(hor).lerp(top, U.clamp(y * 1.6, 0, 1)); col.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    sky = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    sky.scale.setScalar(2400); sky.renderOrder = -10;
    group.add(sky);
    const cm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x8a8a9a, fog: false });
    const cr = U.seeded(level.seed * 3);
    clouds = [];
    for (let i = 0; i < 16; i++) {
      const b = new Mo.Builder();
      const n = 4 + Math.floor(cr() * 4);
      for (let k = 0; k < n; k++) b.sph(20 + cr() * 18, 12 + cr() * 8, 16 + cr() * 10, 0xffffff, [k * 22 - n * 11, cr() * 8, cr() * 16 - 8], null, true);
      const m = new THREE.Mesh(b.geometry(), cm);
      const a = cr() * PI * 2, d = 250 + cr() * 700;
      m.position.set(info.w / 2 + Math.cos(a) * d, 180 + cr() * 140, info.d / 2 + Math.sin(a) * d);
      m.rotation.y = cr() * PI;
      group.add(m);
      clouds.push(m);
    }
  }

  // ------------------------------------------------------------
  //  CARS THAT DRIVE AROUND
  // ------------------------------------------------------------
  function addDrivers(n) {
    const lines = [];
    for (let i = 0; i <= nx; i++) lines.push({ axis: 'z', at: i * BLOCK, len: info.d });
    const beachRow = level.map.findIndex((row) => row.includes('B'));
    for (let j = 0; j <= nz; j++) if (beachRow < 0 || j < beachRow) lines.push({ axis: 'x', at: j * BLOCK, len: info.w });
    const firstBeach = level.map.findIndex((row) => row.includes('B'));
    const zLimit = firstBeach >= 0 ? firstBeach * BLOCK : info.d;
    for (let k = 0; k < n; k++) {
      const L = lines[Math.floor(rnd() * lines.length)];
      const dir = chance(0.5) ? 1 : -1;
      const along = R(0, L.axis === 'z' ? zLimit : L.len);
      const x = L.axis === 'z' ? L.at + dir * -2.4 : along, z = L.axis === 'z' ? along : L.at + dir * 2.4;
      const q = L.axis === 'z' ? (dir > 0 ? 0 : 2) : (dir > 0 ? 1 : 3);
      const o = place(chance(0.15) ? 'bus' : 'car', x, z, q);
      o.drive = { axis: L.axis, dir, speed: R(7, 10), max: L.axis === 'z' ? zLimit : L.len, honk: 0, stop: 0 };
      drivers.push(o);
    }
  }

  // ------------------------------------------------------------
  //  BUILD / CLEAR A LEVEL
  // ------------------------------------------------------------
  function build(levelIndex) {
    clear();
    level = LEVELS[levelIndex];
    rnd = U.seeded(level.seed);
    nx = level.map[0].length; nz = level.map.length;
    info.w = nx * BLOCK; info.d = nz * BLOCK;
    info.roadsX = []; info.roadsZ = [];
    for (let i = 0; i <= nx; i++) info.roadsX.push(i * BLOCK);
    for (let j = 0; j <= nz; j++) info.roadsZ.push(j * BLOCK);
    group = new THREE.Group();
    scene.add(group);
    hadFerris = false; hadLighthouse = false;
    buildGround(level.map);
    buildSky();
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const c = level.map[j][i], cx = i * BLOCK + BLOCK / 2, cz = j * BLOCK + BLOCK / 2;
      if (c === 'H') blockHouses(cx, cz);
      else if (c === 'P') blockPark(cx, cz);
      else if (c === 'S') blockShops(cx, cz);
      else if (c === 'T') blockTowers(cx, cz);
      else if (c === 'A') blockApartments(cx, cz);
      else if (c === 'G') blockGas(cx, cz);
      else if (c === 'O') blockHotel(cx, cz);
      else if (c === 'W') blockFair(cx, cz);
      else if (c === 'B') blockBeach(cx, cz, j);
      else if (c === 'F') blockFBI(cx, cz);
      else if (c === 'M') blockMilitary(cx, cz);
    }
    // keep the start spot clear so the baby dino isn't stuck
    const s = startPos();
    for (const o of query(s.x, s.z, 4)) remove(o);
    addDrivers(DR.lowGfx ? 8 : 14);
    return level;
  }
  function clear() {
    if (group) {
      scene.remove(group);
      group.traverse((o) => { if (o.isMesh && o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
    }
    group = null;
    objects = []; foods = []; drivers = []; spinners = []; rubbles = []; camHidden = [];
    hash.clear();
    water = null;
  }
  function startPos() {
    const [i, j] = level.start;
    return { x: i * BLOCK + BLOCK / 2 + 7, z: j * BLOCK + BLOCK / 2 + 7 };
  }

  // how much growing is possible for each tier in this level
  function totals() {
    const g = [0, 0, 0, 0, 0, 0], n = [0, 0, 0, 0, 0, 0];
    for (const o of objects) { g[o.tier] += o.grow; n[o.tier]++; }
    return { grow: g, count: n };
  }

  // remove something from the city (smashed or eaten)
  function remove(o) {
    if (!o.alive) return;
    o.alive = false;
    hashRemove(o);
    if (o.sparkle) { group.remove(o.sparkle); o.sparkle = null; const i = foods.indexOf(o); if (i >= 0) foods.splice(i, 1); }
    if (o.drive) { const i = drivers.indexOf(o); if (i >= 0) drivers.splice(i, 1); }
    const si = spinners.indexOf(o); if (si >= 0) spinners.splice(si, 1);
  }
  function detachMesh(o) { if (o.mesh.parent) o.mesh.parent.remove(o.mesh); }
  // a brown patch on the ground where something big was smashed
  function addRubble(o) {
    if (!group) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), Mo.std('rubble', { map: T.rubble(), transparent: true, depthWrite: false, roughness: 1 }));
    m.rotation.x = -PI / 2; m.rotation.z = rnd() * PI;
    m.position.set(o.x, 0.08, o.z);
    const s = Math.max(o.vw, o.vd) * 2.4;
    m.scale.set(s, s, 1);
    group.add(m);
    rubbles.push(m);
    if (rubbles.length > 120) { const old = rubbles.shift(); group.remove(old); old.geometry.dispose(); }
  }

  // ------------------------------------------------------------
  //  EVERY FRAME
  // ------------------------------------------------------------
  let visT = 0, camHidden = [];
  const insideVis = (o, p, pad) => Math.abs(p.x - o.x) < o.vw + pad && Math.abs(p.z - o.z) < o.vd + pad && p.y < o.h + pad;
  function update(dt, t, dino, camPos, camFar) {
    if (!group) return;
    // spinning Ferris wheels
    for (const o of spinners) o.spin.rotation.z += dt * 0.15;
    // food sparkles bob up and down
    for (const o of foods) {
      const s = o.sparkle;
      s.position.y = o.h + 0.5 + o.h * 0.1 + Math.sin(t * 3 + o.x) * 0.25;
      const k = 1 + Math.sin(t * 5 + o.z) * 0.15, sz = (1.5 + o.h * 0.5) * k;
      s.scale.set(sz, sz, 1);
    }
    // things that got bonked wobble
    for (const o of objects) if (o.wobble > 0 && o.alive) {
      o.wobble = Math.max(0, o.wobble - dt);
      const a = Math.sin(o.wobble * 40) * o.wobble * 0.08;
      o.mesh.rotation.z = a; o.mesh.rotation.x = a * 0.5;
      if (o.wobble === 0) { o.mesh.rotation.z = 0; o.mesh.rotation.x = 0; }
    }
    // cars drive along the roads
    for (const o of drivers) {
      const d = o.drive;
      const fx = d.axis === 'x' ? d.dir : 0, fz = d.axis === 'z' ? d.dir : 0;
      const dx = dino.x - o.x, dz = dino.z - o.z;
      const ahead = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
      let speed = d.speed;
      const scary = dino.tier >= o.tier;
      if (!scary && ahead > 0 && ahead < 7 + dino.r * 2 && side < 3 + dino.r) {
        speed = 0;
        d.honk -= dt;
        if (d.honk < 0) { d.honk = 1.6; DR.Audio.honk(); }
      } else if (scary && Math.hypot(dx, dz) < 18 + dino.r * 6) {
        speed = d.speed * 1.8;
        d.honk -= dt;
        if (d.honk < 0 && ahead < 0) { d.honk = 2.5; DR.Audio.honk(); }
      }
      // don't bump into the car in front
      for (const other of drivers) {
        if (other === o || other.drive.axis !== d.axis || other.drive.dir !== d.dir) continue;
        const ox = other.x - o.x, oz = other.z - o.z;
        const oa = ox * fx + oz * fz, os = Math.abs(ox * fz - oz * fx);
        if (os < 1 && oa > 0 && oa < 5 + o.hz + o.hx) { speed = Math.min(speed, other.drive.speed * 0.5); break; }
      }
      d.cur = U.damp(d.cur || 0, speed, 3, dt);
      let nxp = o.x + fx * d.cur * dt, nzp = o.z + fz * d.cur * dt;
      const along = d.axis === 'x' ? nxp : nzp;
      if (along > d.max + 12) { if (d.axis === 'x') nxp = -12; else nzp = -12; }
      if (along < -12) { if (d.axis === 'x') nxp = d.max + 12; else nzp = d.max + 12; }
      if (nxp !== o.x || nzp !== o.z) {
        hashRemove(o);
        o.x = nxp; o.z = nzp;
        o.mesh.position.x = nxp; o.mesh.position.z = nzp;
        hashAdd(o);
      }
    }
    if (water) { water.material.map.offset.x = t * 0.004; water.material.map.offset.y = Math.sin(t * 0.3) * 0.02; }
    for (const c of clouds) c.position.x += dt * 1.5;
    if (sky) { sky.position.copy(camPos); sky.scale.setScalar(Math.min(2400, (camFar || 1000) * 0.9)); }
    // hide things the camera is inside of (like a tree or an umbrella)
    for (const o of camHidden) if (o.alive && !insideVis(o, camPos, 0.8)) { o.camHide = false; o.mesh.visible = o.vis; }
    camHidden = camHidden.filter((o) => o.camHide && o.alive);
    for (const o of query(camPos.x, camPos.z, 16)) {
      if (!o.camHide && insideVis(o, camPos, 0.5)) { o.camHide = true; o.mesh.visible = false; camHidden.push(o); }
    }
    // hide small things that are far away (so the game stays fast)
    visT -= dt;
    if (visT <= 0) {
      visT = 0.25;
      const base = 70 + dino.scale * 14;
      for (const o of objects) {
        if (!o.alive) continue;
        const d = Math.hypot(o.x - camPos.x, o.z - camPos.z);
        const v = d < base + o.h * 9 + Math.max(o.vw, o.vd) * 3;
        if (v !== o.vis) { o.vis = v; o.mesh.visible = v && !o.camHide; if (o.sparkle) o.sparkle.visible = v; }
      }
    }
  }

  return {
    init, build, clear, update, query, boxDist, remove, detachMesh, addRubble, totals, startPos,
    LEVELS, KINDS, BLOCK, RW, info,
    get objects() { return objects; }, get foods() { return foods; }, get level() { return level; }, get group() { return group; },
  };
})();
