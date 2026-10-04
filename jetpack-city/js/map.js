// ============================================================
//  JETPACK CITY — SETTINGS & LEVEL PIECES  (EDIT ME!)
//
//  Change the numbers and letters below, save the file,
//  and reload the page to see what happens.
// ============================================================
window.JC = window.JC || {};

// ------------------------------------------------------------
//  GAME SETTINGS
// ------------------------------------------------------------
JC.SETTINGS = {
  startSpeed: 13,        // meters per second when you start running
  maxSpeed: 30,          // the fastest the game can get
  speedUp: 0.14,         // how much faster you get every second

  hopHeight: 1.9,        // how high a jetpack hop goes (meters)
  hopTime: 0.72,         // how long a hop lasts (seconds)
  slideTime: 0.75,       // how long a slide lasts (seconds)

  stumbleTime: 5,        // after you bump into something, MEGA-BOT stays close for this many seconds
  magnetTime: 10,        // seconds the magnet lasts
  jetTime: 6,            // seconds the jet boost lasts
  shieldTime: 25,        // seconds the shield lasts (if nothing breaks it first)

  boltScore: 5,          // points for every bolt
  movingTrainSpeed: 9,   // how fast moving trains drive at you
  powerUpEvery: 180,     // about how many meters between surprise power-ups
  levelEvery: 350,       // every this many meters, harder level pieces can show up
  gapScale: 1,           // bigger = more empty road between level pieces
  hopForgive: 0.55,      // how high your feet must be to clear a barrier (smaller = easier)
  swingTime: 0.35,       // how long one OmniWrench swing lasts (seconds)
  smashBolts: 2,         // bolts you get for smashing a barrier
};

// ------------------------------------------------------------
//  LEVEL PIECES
//  The road is built from these pieces, one after another, forever.
//  Every piece has 3 columns (the 3 lanes: LEFT, MIDDLE, RIGHT).
//  You run from the BOTTOM row to the TOP row, just like on the screen.
//  Every row is 3 meters long.
//
//    .  empty road
//    o  energy bolt
//    B  barrier            (hop over it)
//    L  laser gate         (slide under it)
//    H  hole in the road   (hop over it)
//    T  parked train       (go around it, or climb on top with a ramp)
//    t  parked train with a bolt on its roof
//    R  ramp               (put it right before a train to run up onto it)
//    M  MOVING train       (it drives straight at you, get out of its lane!)
//    S  shield    G  magnet    J  jet boost    ?  a surprise power-up
//
//  "level" is how far you must run before this piece can show up:
//  1 = from the start, 2 = after 400 m, 3 = after 800 m, 4 = after 1200 m, 5 = after 1600 m
//
//  RULE: always leave a way through! (The game can't check that for you.)
// ------------------------------------------------------------
JC.PIECES = [
  { level: 1, rows: [
    '.o.',
    '.o.',
    '.o.',
    '.o.',
    '.o.',
  ] },
  { level: 1, rows: [
    '.o.',
    '.o.',
    '.o.',
    '...',
    '.B.',
    '...',
  ] },
  { level: 1, rows: [
    'B.B',
    '.o.',
    '.o.',
    '...',
    '.B.',
    '...',
  ] },
  { level: 1, rows: [
    'o..',
    'o..',
    '.o.',
    '.o.',
    '..o',
    '..o',
  ] },
  { level: 1, rows: [
    '.L.',
    '...',
    '...',
    'L.L',
    '...',
  ] },
  { level: 1, rows: [
    'T..',
    'T..',
    'T.o',
    'T.o',
    'T.o',
    '...',
  ] },
  { level: 1, rows: [
    '.t.',
    '.t.',
    '.t.',
    '.t.',
    '.R.',
    '.R.',
    '...',
  ] },
  { level: 1, rows: [
    '...',
    '.?.',
    '...',
  ] },
  { level: 2, rows: [
    'T.T',
    'T.T',
    'T.T',
    'T.T',
    '.o.',
    '.o.',
    '...',
  ] },
  { level: 2, rows: [
    '.H.',
    '...',
    '...',
    'H.H',
    '...',
  ] },
  { level: 2, rows: [
    '..B',
    '...',
    '...',
    'B..',
    '...',
    '...',
    '..B',
  ] },
  { level: 2, rows: [
    'TT.',
    'TT.',
    'TT.',
    'TTo',
    '..o',
    '..o',
  ] },
  { level: 2, rows: [
    '.M.',
    '.M.',
    '.M.',
    '.M.',
    '...',
    '...',
    '...',
    'o..',
    'o..',
    'o..',
    '...',
    '...',
  ] },
  { level: 2, rows: [
    'LLL',
    '...',
    '...',
    '...',
    '...',
    '...',
    '...',
    'BBB',
    '...',
  ] },
  { level: 3, rows: [
    'ttt',
    'ttt',
    'ttt',
    'TtT',
    'TtT',
    'TRT',
    '.R.',
    '...',
    '...',
  ] },
  { level: 3, rows: [
    'H.H',
    '...',
    '...',
    '.H.',
    '...',
    '...',
    'H.H',
  ] },
  { level: 3, rows: [
    'T.L',
    'T..',
    'T..',
    'T..',
    'T.B',
    'T..',
    '...',
  ] },
  { level: 3, rows: [
    'B..',
    '...',
    '...',
    '.L.',
    '...',
    '...',
    '..H',
  ] },
  { level: 3, rows: [
    'M..',
    'M..',
    'M..',
    'M.T',
    '..T',
    '..T',
    '..T',
    '.o.',
    '.o.',
    '.o.',
    '...',
    '...',
  ] },
  { level: 4, rows: [
    '.M.',
    'TM.',
    'TM.',
    'TM.',
    'T..',
    'T.o',
    'T.o',
    'T.o',
    'T..',
    '...',
    '...',
  ] },
  { level: 4, rows: [
    'T.T',
    'T.T',
    'TtT',
    'TtT',
    'TRT',
    '.R.',
    '.o.',
  ] },
  { level: 4, rows: [
    '.L.',
    '...',
    'L.L',
    '...',
    '.L.',
    '...',
    'L.L',
  ] },
  { level: 5, rows: [
    'TH.',
    'T..',
    'T..',
    'T.H',
    'T..',
    '...',
  ] },
  { level: 5, rows: [
    '..M',
    '..M',
    '..M',
    'M.M',
    'M..',
    'M..',
    'M..',
    '...',
    '...',
    '...',
    '...',
    '...',
  ] },
  { level: 5, rows: [
    'LLM',
    '..M',
    '..M',
    '..M',
    '...',
    'BH.',
    '...',
    '...',
    '...',
    '...',
    '...',
  ] },
  { level: 5, rows: [
    'B.B',
    '.H.',
    '...',
    'H.H',
    '.B.',
    '...',
    'LBL',
    '...',
  ] },
];

// ------------------------------------------------------------
//  DIFFICULTY: the button on the title screen picks one of these.
//  Each one changes the settings above when you start running.
// ------------------------------------------------------------
JC.DIFFICULTY = {
  easy: { label: '😀 EASY', startSpeed: 11, maxSpeed: 24, speedUp: 0.10, levelEvery: 500, gapScale: 1.3, powerUpEvery: 140, stumbleTime: 4, movingTrainSpeed: 7, hopForgive: 0.35 },
  normal: { label: '😐 NORMAL', startSpeed: 14, maxSpeed: 32, speedUp: 0.17, levelEvery: 350, gapScale: 1.0, powerUpEvery: 200, stumbleTime: 6, movingTrainSpeed: 10, hopForgive: 0.55 },
  hard: { label: '😈 HARD', startSpeed: 17, maxSpeed: 36, speedUp: 0.26, levelEvery: 220, gapScale: 0.75, powerUpEvery: 320, stumbleTime: 8, movingTrainSpeed: 13, hopForgive: 0.8 },
};

// The very first run teaches you the moves, one piece at a time.
JC.TUTORIAL = [
  { hint: 'SWIPE ⬅ or ➡ to change lanes', rows: ['oBo', 'o.o', 'o.o', '...'] },
  { hint: 'TAP to smash barriers with the OmniWrench! 🔧', rows: ['.o.', 'BBB', '...', '...'] },
  { hint: 'SWIPE ⬆ to hop with Clank\'s Heli-Pack', rows: ['.o.', 'BBB', '...', '...'] },
  { hint: 'SWIPE ⬇ to slide under lasers', rows: ['.o.', 'LLL', '...', '...'] },
  { hint: 'Run up RAMPS to get on top of trains', rows: ['TtT', 'TtT', 'TtT', 'TRT', '.R.', '...'] },
  { hint: 'Grab the 🚀 for Clank\'s Thruster-Pack!', rows: ['.J.', '...', '...'] },
];

// ------------------------------------------------------------
//  THE GARAGE: things you can buy with bolts
//  (colors are written like on the web: #rrggbb)
// ------------------------------------------------------------
JC.GARAGE = {
  // Clank's paint: his metal, his eyes, and the flames of his Thruster-Pack
  clank: [
    { id: 'classic', name: 'Classic Clank', price: 0, metal: '#c8d0dc', dark: '#6a7486', eye: '#6aff5a', flame: '#5ad8ff' },
    { id: 'gold', name: 'Golden Clank', price: 300, metal: '#f0c040', dark: '#a87818', eye: '#ffffff', flame: '#fff08a' },
    { id: 'red', name: 'Red Alert', price: 500, metal: '#e04040', dark: '#7a1a1a', eye: '#ffe03a', flame: '#ff8a2a' },
    { id: 'stealth', name: 'Stealth Clank', price: 800, metal: '#30343e', dark: '#15171c', eye: '#3af0ff', flame: '#3af0ff' },
    { id: 'rainbow', name: 'Rainbow Clank', price: 2000, metal: '#f4f4ff', dark: '#9aa4c0', eye: '#ff3aa8', flame: 'rainbow' },
  ],
  // Ratchet's outfits: fur, stripes and clothes
  ratchet: [
    { id: 'classic', name: 'Classic Ratchet', price: 0, fur: '#e8b85a', stripe: '#7a4a22', muzzle: '#fff0d8', top: '#eef2f8', accent: '#3a78d8', pants: '#b89a6a', cap: '#8a5a30', boots: '#6a4020', gloves: '#6a4020' },
    { id: 'racer', name: 'Hoverboard Racer', price: 200, fur: '#e8b85a', stripe: '#7a4a22', muzzle: '#fff0d8', top: '#e83a3a', accent: '#ffffff', pants: '#2a2a34', cap: '#ffffff', boots: '#2a2a34', gloves: '#e83a3a' },
    { id: 'explorer', name: 'Space Explorer', price: 500, fur: '#e8b85a', stripe: '#7a4a22', muzzle: '#fff0d8', top: '#ff8a2a', accent: '#2a3a5a', pants: '#2a3a5a', cap: '#ffffff', boots: '#ffffff', gloves: '#ffffff' },
    { id: 'snow', name: 'Snow Lombax', price: 800, fur: '#f4f4f8', stripe: '#8a9ab0', muzzle: '#ffffff', top: '#3a8aff', accent: '#ffffff', pants: '#2a4a8a', cap: '#3a8aff', boots: '#ffffff', gloves: '#3a8aff' },
    { id: 'holo', name: 'Holo Armor', price: 1500, fur: '#e8b85a', stripe: '#7a4a22', muzzle: '#fff0d8', top: '#1a2a4a', accent: '#3af0ff', pants: '#1a2a4a', cap: '#3af0ff', boots: '#3af0ff', gloves: '#3af0ff' },
  ],
};

// ------------------------------------------------------------
//  THE PLANETS
//  You go through a warp gate to the next planet every "planetLength" meters.
//  After the last planet you go back to the first one.
//    sky:     colors of the sky, from the top down to the horizon
//    road:    dirt, metal, planks, ice or basalt
//    trains:  colors of the parked trains
//    gate:    color of the warp gate that takes you there
// ------------------------------------------------------------
JC.SETTINGS.planetLength = 720;
JC.WORLDS = [
  { id: 'veldin', name: 'Veldin', scenery: 'canyon', road: 'dirt',
    sky: ['#3a78c8', '#7ab0e0', '#f0c890', '#f8a060'], fog: '#f0b878', stars: false,
    light: ['#fff4e0', '#c07a40', 1.6], sun: ['#fff0c8', '#fff8e0', 1.9], skyline: ['mesas', '#c07040', '#ffd090'],
    trains: [0xe06a2a, 0x3a8aff, 0xf0c040], gate: '#ff9a2a', cars: false },
  { id: 'metropolis', name: 'Metropolis', scenery: 'city', road: 'metal',
    sky: ['#101848', '#2a3a8a', '#7a5ab8', '#e87aa8'], fog: '#5a4a9a', stars: true,
    light: ['#c0c8ff', '#4a3a7a', 1.5], sun: ['#ffe0f0', '#ffd0f0', 1.6], skyline: ['city', '#2a2a5a', '#ffd27a'],
    trains: [0xff3aa8, 0x3ab8ff, 0xffb01a, 0x7a4aff], gate: '#3af0ff', cars: true },
  { id: 'pokitaru', name: 'Pokitaru', scenery: 'beach', road: 'planks',
    sky: ['#1aa8f0', '#5ad0ff', '#b8f0ff', '#e8fff8'], fog: '#b8ecf8', stars: false,
    light: ['#ffffff', '#3a9ab0', 1.7], sun: ['#fffae0', '#ffffe8', 2.0], skyline: ['islands', '#3a9a6a', '#ffffff'],
    trains: [0xff5a8a, 0xffd23a, 0x3ad0a0], gate: '#3aff8a', cars: false },
  { id: 'grelbin', name: 'Grelbin', scenery: 'ice', road: 'ice',
    sky: ['#050a24', '#10205a', '#2a4a8a', '#8ab0d8'], fog: '#6a8ab8', stars: true,
    light: ['#d0e8ff', '#5a7aa8', 1.5], sun: ['#e8f4ff', '#d8ecff', 1.5], skyline: ['mountains', '#4a6a9a', '#f0f8ff'],
    trains: [0x3a8aff, 0xe8f0ff, 0x8a5aff], gate: '#8ad8ff', cars: false },
  { id: 'gaspar', name: 'Gaspar', scenery: 'lava', road: 'basalt',
    sky: ['#1a0508', '#4a0a0a', '#a82a10', '#ff7a2a'], fog: '#6a1a10', stars: false,
    light: ['#ffb08a', '#5a1a10', 1.5], sun: ['#ffd0a0', '#ff8a4a', 1.7], skyline: ['volcanoes', '#2a1014', '#ff6a1a'],
    trains: [0x5a5a64, 0xffb01a, 0x8a3a2a], gate: '#ff5a1a', cars: false },
];

// ------------------------------------------------------------
//  WORDS
// ------------------------------------------------------------
JC.TEXT = {
  // what MEGA-BOT shouts when it gets close
  taunts: [
    'COME BACK, TINY HUMAN!',
    'I SEE YOU!',
    'YOU CANNOT ESCAPE MEGA-BOT!',
    'STOMP! STOMP! STOMP!',
    'BEEP BOOP... GOTCHA SOON!',
    'GIVE ME THAT LITTLE ROBOT!',
  ],
  // the title on the game over screen
  caught: [
    'MEGA-BOT GOT YOU!',
    'GRABBED!',
    'CAUGHT!',
    'OH NO, RATCHET!',
  ],
  // the neon signs on the buildings
  signs: ['ROBO', 'NEON', 'BOLT', 'ZAP', 'CYBER', 'MEGA', 'PIXEL', 'TURBO', 'BYTE', 'VOLT', 'LASER', 'NOVA'],
  powerUps: {
    shield: '🛡️ SHIELD!',
    magnet: '🧲 MAGNET!',
    jet: '🚀 THRUSTER-PACK!',
  },
};
