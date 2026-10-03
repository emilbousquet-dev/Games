// =====================================================================
//  KIDS vs VIDEO GAMES: all the numbers are here. Change them and reload!
// =====================================================================

// ---------------------------------------------------------------------
//  The kids (towers). Each kid has 3 levels (ADMIN/EMILE has 2).
//    cost  = coins to buy (level 1) or to upgrade (level 2 and 3)
//    range = how far they can reach
//    rate  = seconds between attacks (smaller = faster)
//    dmg   = damage per hit
// ---------------------------------------------------------------------
const TOWERS = {
  nafti: {
    name: 'Nafti', cost: 250, air: false,
    info: 'Throws dodgeballs super fast. Can\'t hit flying enemies.',
    levels: [
      { range: 155, rate: 0.5, dmg: 3, balls: 1 },
      { cost: 220, name: 'Double Throw', info: 'Throws 2 dodgeballs at once!', range: 165, rate: 0.42, dmg: 3, balls: 2 },
      { cost: 650, name: 'Time Watch', info: 'His watch FREEZES time for every enemy nearby!', range: 180, rate: 0.36, dmg: 4, balls: 2, freezeEvery: 7, freezeTime: 1.6 },
    ],
  },
  mio: {
    name: 'Mio', cost: 400, air: true,
    info: '"Shhh!" Magic stick bolts from far away. Every few hits puts an enemy to SLEEP.',
    levels: [
      { range: 260, rate: 1.0, dmg: 8, sleepEvery: 4, sleep: 1.3 },
      { cost: 380, name: 'Sleepy Spell', info: 'Stronger bolts, and the sleep spell hits a whole group.', range: 290, rate: 0.85, dmg: 12, sleepEvery: 3, sleep: 1.7, sleepArea: 55 },
      { cost: 950, name: 'Creeper Blast', info: 'Every bolt EXPLODES like a creeper!', range: 310, rate: 0.75, dmg: 16, sleepEvery: 3, sleep: 1.9, sleepArea: 65, blast: 65 },
    ],
  },
  felix: {
    name: 'Felix', cost: 350, air: true,
    info: 'Fishing rod! Hooks enemies and yanks them BACK along the path.',
    levels: [
      { range: 170, rate: 1.4, dmg: 6, hooks: 1, pull: 45 },
      { cost: 320, name: 'Double Hook', info: 'Hooks 2 enemies at once and pulls them further.', range: 185, rate: 1.2, dmg: 7, hooks: 2, pull: 65 },
      { cost: 850, name: 'Big Catch', info: 'Sometimes catches the strongest enemy and takes it out of the game!', range: 200, rate: 1.0, dmg: 9, hooks: 2, pull: 80, catchEvery: 8 },
    ],
  },
  emile: {
    name: 'ADMIN/EMILE', cost: 5000, air: true, flier: true,
    info: 'Flies around the WHOLE map shooting lasers. Uses the BAN HAMMER. Totally overpowered.',
    levels: [
      { range: 9999, rate: 0.13, dmg: 14, lasers: 1, banEvery: 12, banBoss: 400 },
      { cost: 7500, name: 'SUPER ADMIN', info: 'Two lasers and a faster BAN HAMMER. Nothing can stop this.', range: 9999, rate: 0.09, dmg: 20, lasers: 2, banEvery: 7, banBoss: 900 },
    ],
  },
};
const TOWER_ORDER = ['nafti', 'felix', 'mio', 'emile'];

// ---------------------------------------------------------------------
//  The video game characters.
//    hp = health, speed = how fast, coins = what you get for beating it,
//    hurt = how much it hurts Bill if it reaches the fort
// ---------------------------------------------------------------------
const ENEMIES = {
  puffy:  { name: 'Puffy',       hp: 5,    speed: 66,  coins: 5,   hurt: 1,   gap: 0.55, height: 30 },
  plumbo: { name: 'Plumbo',      hp: 14,   speed: 58,  coins: 8,   hurt: 2,   gap: 0.7,  height: 44 },
  spiky:  { name: 'Spiky',       hp: 8,    speed: 150, coins: 8,   hurt: 2,   gap: 0.45, height: 42 },
  zappy:  { name: 'Zappy',       hp: 20,   speed: 90,  coins: 10,   hurt: 3,   gap: 0.6,  height: 40 },
  boomer: { name: 'Boomer',      hp: 30,   speed: 42,  coins: 14,  hurt: 5,   gap: 1.1,  height: 54 },
  ghost:  { name: 'Ghosty',      hp: 16,   speed: 76,  coins: 10,   hurt: 2,   gap: 0.8,  height: 40, flies: true },
  wrench: { name: 'Wrench & Bolt', hp: 60, speed: 52,  coins: 18,  hurt: 6,   gap: 1.2,  height: 56 },
  bolt:   { name: 'Bolt',        hp: 20,   speed: 78,  coins: 6,   hurt: 2,   gap: 0.6,  height: 38 },
  ape:    { name: 'BIG BANANA APE', hp: 1300, speed: 26, coins: 300, hurt: 25, gap: 3, height: 100, boss: true, scale: 1.25 },
  king:   { name: 'KING SPIKESHELL', hp: 4500, speed: 22, coins: 1000, hurt: 60, gap: 3, height: 125, boss: true, scale: 1.3 },
};

// ---------------------------------------------------------------------
//  The 20 waves. "puffy*12" means 12 Puffies.
//  The tip is shown when the wave starts.
// ---------------------------------------------------------------------
const WAVES = [
  { list: 'puffy*12' },
  { list: 'puffy*18' },
  { list: 'puffy*12 plumbo*6' },
  { list: 'plumbo*12 spiky*4', tip: 'Spiky is SUPER fast!' },
  { list: 'puffy*20 spiky*8' },
  { list: 'ghost*6 plumbo*10', tip: 'Ghosties FLY! Nafti can\'t hit them. Use Mio or Felix!' },
  { list: 'zappy*8 puffy*20', tip: 'Zappy can zap forward really fast!' },
  { list: 'boomer*5 plumbo*12', tip: 'Boomers EXPLODE next to kids and make them dizzy!' },
  { list: 'wrench*6 spiky*12', tip: 'When Wrench goes down, little Bolt keeps walking!' },
  { list: 'ape puffy*20', tip: 'BOSS! The Big Banana Ape throws barrels at your kids!' },
  { list: 'ghost*14 zappy*10' },
  { list: 'boomer*10 wrench*8' },
  { list: 'spiky*36', tip: 'A HUGE Spiky rush!' },
  { list: 'wrench*14 ghost*12' },
  { list: 'zappy*20 boomer*10' },
  { list: 'plumbo*40 spiky*20' },
  { list: 'wrench*15 ghost*18' },
  { list: 'boomer*20 zappy*24' },
  { list: 'ape*2 wrench*15', tip: 'TWO Banana Apes!' },
  { list: 'king puffy*30 plumbo*20 ghost*15 wrench*10', tip: 'FINAL BOSS: KING SPIKESHELL breathes FIRE!' },
];

const START_COINS = 800;
const BILL_HEALTH = 100;
