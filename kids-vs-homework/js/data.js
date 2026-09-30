// =====================================================================
//  KIDS vs HOMEWORK: all the numbers are here. Change them and reload!
// =====================================================================

// ---------------------------------------------------------------------
//  The kids who protect the bedroom door.
//    cost   = how many snacks it costs
//    hp     = how much homework it can take before giving up
//    reload = seconds before you can place another one
// ---------------------------------------------------------------------
const KIDS = {
  snack: {
    name: 'Snack Kid', cost: 50, hp: 300, reload: 7, makeEvery: 14,
    info: 'Munches cookies and shares them. Makes extra snacks!',
  },
  natti: {
    name: 'Natti', cost: 100, hp: 300, reload: 7, shootEvery: 1.4, damage: 20,
    info: 'SUPER grumpy about homework. Throws pencils at it!',
  },
  bill: {
    name: 'Bill', cost: 150, hp: 300, reload: 10, screamEvery: 3, damage: 30, range: 3,
    info: 'Screams SO loud that homework gets blown backwards!',
  },
  gamer: {
    name: 'Gamer', cost: 50, hp: 4000, reload: 25,
    info: 'Will NOT stop playing. Homework can\'t get past!',
  },
  mio: {
    name: 'Mio', cost: 200, hp: 300, reload: 10, shootEvery: 2, damage: 25,
    info: 'Throws shooting stars from the space hoodie. They fly through EVERYTHING!',
  },
  splash: {
    name: 'Splash', cost: 175, hp: 300, reload: 10, shootEvery: 3, damage: 40, slowFor: 4,
    info: 'Throws water balloons. Soggy homework is SLOW homework!',
  },
  eraser: {
    name: 'Mega Eraser', cost: 125, hp: 9999, reload: 30, damage: 1800,
    info: 'BOOM! Erases all the homework around it.',
  },
};

// ---------------------------------------------------------------------
//  The homework that tries to get into your room.
//    speed = how fast it walks
//    bite  = how fast it tires out a kid
//    size  = how wide it is (for hitting)
// ---------------------------------------------------------------------
const HOMEWORK = {
  sheet: {
    name: 'Worksheet', hp: 190, speed: 17, bite: 50, size: 22,
    info: 'Just a normal worksheet. Still annoying.',
  },
  math: {
    name: 'Math Problem', hp: 220, speed: 17, bite: 50, size: 22, splitsInto: 'mini',
    info: 'Beat it and it splits into two smaller problems!',
  },
  mini: {
    name: 'Mini Problem', hp: 80, speed: 26, bite: 30, size: 15,
    info: 'Small, fast and annoying.',
  },
  due: {
    name: 'Due Tomorrow', hp: 260, speed: 42, slowSpeed: 17, bite: 50, size: 22,
    info: 'In a HUGE hurry. Jumps over the first kid it meets!',
  },
  book: {
    name: 'Big Textbook', hp: 1100, speed: 10, bite: 70, size: 28,
    info: 'Slow, heavy and super tough.',
  },
  plane: {
    name: 'Paper Airplane', hp: 110, speed: 48, bite: 0, size: 24, flies: true,
    info: 'Flies right over the kids!',
  },
  boss: {
    name: 'THE SCIENCE PROJECT', hp: 6000, speed: 4.5, bite: 400, size: 70,
    info: 'A giant exploding volcano. The final boss!',
  },
};

// ---------------------------------------------------------------------
//  The 5 school days (levels).
//    lanes  = which rows of the rug you can use (0 is the top row)
//    unlock = new kids you get when you win the day
//    waves  = the homework that comes, one wave per text.
//             "sheet*3" means 3 worksheets.
//             "BIG" is a huge wave, "BOSS" brings the final boss.
// ---------------------------------------------------------------------
const LEVELS = [
  {
    day: 'MONDAY', lanes: [1, 2, 3], snacks: 150, unlock: ['bill'],
    firstWave: 22, gap: 17,
    waves: ['sheet', 'sheet', 'sheet*2', 'sheet*2', 'sheet*3', 'BIG sheet*6'],
  },
  {
    day: 'TUESDAY', lanes: [0, 1, 2, 3, 4], snacks: 150, unlock: ['gamer'],
    firstWave: 20, gap: 17,
    waves: ['sheet', 'sheet*2', 'math', 'sheet*2 math', 'math*2 sheet', 'sheet*3 math',
            'BIG sheet*5 math*3'],
  },
  {
    day: 'WEDNESDAY', lanes: [0, 1, 2, 3, 4], snacks: 150, unlock: ['mio'],
    firstWave: 20, gap: 17,
    waves: ['sheet*2', 'math sheet', 'book', 'due sheet', 'due*2 math', 'book sheet*2',
            'math*2 due*2', 'BIG book*2 due*2 sheet*4 math*2'],
  },
  {
    day: 'THURSDAY', lanes: [0, 1, 2, 3, 4], snacks: 150, unlock: ['splash', 'eraser'],
    firstWave: 20, gap: 17,
    waves: ['sheet*2', 'plane', 'math*2 sheet', 'due*2 plane', 'book math*2', 'plane*2 due*2',
            'book*2 sheet*3', 'BIG plane*3 book*2 due*3 math*3 sheet*3'],
  },
  {
    day: 'FRIDAY', lanes: [0, 1, 2, 3, 4], snacks: 200, unlock: [],
    firstWave: 20, gap: 18,
    waves: ['sheet*3', 'math*2 due', 'book plane*2', 'due*3 sheet*2', 'book*2 math*2 plane',
            'BIG book*2 due*3 math*3 sheet*4', 'plane*2 sheet*3',
            'BOSS boss sheet*4 plane*2'],
  },
];
