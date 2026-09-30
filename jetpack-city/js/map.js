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
];

// The very first run teaches you the moves, one piece at a time.
JC.TUTORIAL = [
  { hint: 'SWIPE ⬅ or ➡ to change lanes', rows: ['oBo', 'o.o', 'o.o', '...'] },
  { hint: 'SWIPE ⬆ to hop with your jetpack', rows: ['.o.', 'BBB', '...', '...'] },
  { hint: 'SWIPE ⬇ to slide under lasers', rows: ['.o.', 'LLL', '...', '...'] },
  { hint: 'Run up RAMPS to get on top of trains', rows: ['TtT', 'TtT', 'TtT', 'TRT', '.R.', '...'] },
  { hint: 'Grab power-ups! ⚡', rows: ['.J.', '...', '...'] },
];

// ------------------------------------------------------------
//  THE GARAGE: things you can buy with energy bolts
//  (colors are written like on the web: #rrggbb)
// ------------------------------------------------------------
JC.GARAGE = {
  jetpacks: [
    { id: 'rookie', name: 'Rookie Rocket', price: 0, tank: '#c8ccd4', stripe: '#ff7a1a', flame: '#ff9a2a' },
    { id: 'comet', name: 'Blue Comet', price: 150, tank: '#2a6aff', stripe: '#ffffff', flame: '#40e8ff' },
    { id: 'toxic', name: 'Toxic Blast', price: 300, tank: '#2a3a24', stripe: '#a4ff2a', flame: '#7aff3a' },
    { id: 'bubble', name: 'Bubblegum Boost', price: 450, tank: '#ff6ac8', stripe: '#ffffff', flame: '#ff4af0' },
    { id: 'gold', name: 'Golden Thunder', price: 1000, tank: '#e8b030', stripe: '#fff4c0', flame: '#fff08a' },
    { id: 'rainbow', name: 'Rainbow Rocket', price: 2000, tank: '#f4f4ff', stripe: '#ff3a8a', flame: 'rainbow' },
  ],
  outfits: [
    { id: 'runner', name: 'Street Runner', price: 0, suit: '#ff7a1a', pants: '#24305a', helmet: '#f4f4f8', visor: '#30d8ff', shoes: '#ffffff' },
    { id: 'pilot', name: 'Sky Pilot', price: 200, suit: '#3a6a3a', pants: '#2a2a20', helmet: '#8a6a3a', visor: '#ffb030', shoes: '#3a2a1a' },
    { id: 'ninja', name: 'Neon Ninja', price: 500, suit: '#15151c', pants: '#15151c', helmet: '#15151c', visor: '#6aff4a', shoes: '#6aff4a' },
    { id: 'astro', name: 'Astronaut', price: 800, suit: '#f0f0f4', pants: '#f0f0f4', helmet: '#ffffff', visor: '#ffc040', shoes: '#8a8a9a' },
    { id: 'robo', name: 'Robo Disguise', price: 1500, suit: '#9aa4b8', pants: '#5a6478', helmet: '#c8d0e0', visor: '#ff3040', shoes: '#3a4050' },
  ],
};

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
  ],
  // the title on the game over screen
  caught: [
    'MEGA-BOT GOT YOU!',
    'GRABBED!',
    'CAUGHT!',
  ],
  // the neon signs on the buildings
  signs: ['ROBO', 'NEON', 'BOLT', 'ZAP', 'CYBER', 'MEGA', 'PIXEL', 'TURBO', 'BYTE', 'VOLT', 'LASER', 'NOVA'],
  powerUps: {
    shield: '🛡️ SHIELD!',
    magnet: '🧲 MAGNET!',
    jet: '🚀 JET BOOST!',
  },
};
