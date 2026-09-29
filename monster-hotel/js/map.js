// ============================================================
//  MONSTER HOTEL — THE HOTEL MAP + ALL THE GAME SETTINGS
//  You can change almost everything in this file!
//  Save it and reload the page to see your changes.
// ============================================================
//
//  One letter = one square of 1.5 x 1.5 meters.
//
//   #  stone wall                 W  window (big, in the lobby / kitchen)
//   w  guest room window (it can blow open in a storm!)
//   E  the big front doors (guests come in here)
//   L  lobby floor                .  hallway floor
//   K  kitchen floor              S  supply room floor
//   1-8  guest room number (all the squares of that room)
//   d  guest room door            D  open archway / door
//   P  where the boss (you!) starts
//
//   F  front desk                 X  grand staircase
//   k  kitchen station (food, in the order of KITCHEN below)
//   s  supply shelf (in the order of SUPPLIES below)
//   f  fireplace                  c  sofa
//   t  little round table         p  spooky plant
//   A  suit of armor              g  grandfather clock
//
window.MH = window.MH || {};

MH.MAP = [
  "####W######W######w#####w#####w#####w######WW####",
  "#LLLLLXXXXLLLLp#11111#22222#33333#44444#KkkkkkkK#",
  "#LLLLLXXXXLLLLL#11111#22222#33333#44444#KKKKKKKK#",
  "#FFFFLXXXXLLLLA#11111#22222#33333#44444#KKKKKKKK#",
  "#LLLLLLLLLLLLLL#11111#22222#33333#44444#KKKKKKKK#",
  "WLLLLLLPLLLLLLL###d#####d#####d#####d######DD####",
  "#LLLLLLLLLLLLLLD................................#",
  "WLLLLLLLLLLLLLLD................................#",
  "#pLLLLLLLLLLLLA###d#####d#####d#####d######DD####",
  "#fLcLLLLLLtLLLL#55555#66666#77777#88888#SSSSSSSS#",
  "#fLcLLLLLLLLLtL#55555#66666#77777#88888#SSSSSSSS#",
  "#LLLLLLLLLLLLLL#55555#66666#77777#88888#SSSSSSSS#",
  "#gLLLLLLLLLLLLp#55555#66666#77777#88888#SsssssSS#",
  "######EEEE########w#####w#####w#####w############",
];

// ---------- things you can carry ----------
MH.ITEMS = {
  blood:   { name: 'Blood Smoothie', color: '#d4203a', where: 'Kitchen' },
  bone:    { name: 'Giant Bone',     color: '#f1e3c0', where: 'Kitchen' },
  soup:    { name: 'Bug Soup',       color: '#7cc22e', where: 'Kitchen' },
  jelly:   { name: 'Ecto-Jelly',     color: '#39e0c8', where: 'Kitchen' },
  towel:   { name: 'Fluffy Towel',   color: '#9a5cd6', where: 'Supplies' },
  bandage: { name: 'Fresh Bandages', color: '#efe6cf', where: 'Supplies' },
  jar:     { name: 'Lightning Jar',  color: '#ffd23a', where: 'Supplies' },
};
// the kitchen stations (the letters k in the map, from left to right)
MH.KITCHEN = ['blood', 'bone', 'soup', 'jelly', 'cauldron', 'sink'];
// the supply shelves (the letters s in the map)
MH.SUPPLIES = ['towel', 'bandage', 'jar', 'shelf', 'shelf'];

// ---------- the monsters that stay at the hotel ----------
MH.MONSTERS = {
  vampire: {
    title: 'Vampire', wants: ['blood', 'blood', 'towel'], firstNight: 1,
    names: ['Count Fangula', 'Baron Batsworth', 'Lady Nightshade', 'Countess Velvet', 'Duke Draculon', 'Madame Bitey', 'Sir Cape-a-lot', 'Vlad the Fabulous'],
  },
  werewolf: {
    title: 'Werewolf', wants: ['bone', 'bone', 'towel'], firstNight: 1,
    names: ['Wolfgang', 'Howlie', 'Barkley', 'Fuzzy Frank', 'Lupita', 'Sir Sniffs', 'Grr-trude', 'Chompers'],
  },
  mummy: {
    title: 'Mummy', wants: ['bandage', 'bandage', 'soup'], firstNight: 3,
    names: ['Pharaoh Phil', 'Tutti Wrapson', 'Queen Nefer-tissue', 'Ramses the Rolled', 'Wrappy', 'Cleo-patchy'],
  },
  ghost: {
    title: 'Ghost', wants: ['jelly', 'jelly', 'towel'], firstNight: 4,
    names: ['Boo-Boo', 'Wispy', 'Mr. Boolington', 'Lady Floatsworth', 'Spooky Sue', 'Sheetsy'],
  },
  frankie: {
    title: 'Monster', wants: ['jar', 'jar', 'soup'], firstNight: 5,
    names: ['Big Frank', 'Sparky', 'Boltz', 'Stitches', 'Frankenbert', 'Voltina'],
  },
  blob: {
    title: 'Blob', wants: ['soup', 'jelly', 'soup'], firstNight: 6,
    names: ['Globby', 'Gloop', 'Jiggles', 'Squishy Pete', 'Oozie', 'Wobbles'],
  },
};

// ---------- the bosses you can choose ----------
MH.BOSSES = [
  { id: 'vampire', name: 'COUNT FANGSWORTH', short: 'Vampire', power: 'BAT FORM',
    about: 'Turn into a bat and zoom through the hotel super fast!', cooldown: 10 },
  { id: 'werewolf', name: 'WOLFINA MOONHOWL', short: 'Werewolf', power: 'SCARY HOWL',
    about: 'Runs faster all the time. HOWL to scare every human out of the hotel!', cooldown: 22 },
  { id: 'mummy', name: 'KING TUTTLEWRAP', short: 'Mummy', power: 'SAND OF TIME',
    about: 'Freeze time! Guests stop getting grumpy for a while.', cooldown: 24 },
  { id: 'frankie', name: 'DR. BOLTS', short: 'Monster', power: 'THUNDER ZAP',
    about: 'Carries TWO things at once. ZAP to clean a whole room in one go!', cooldown: 16 },
];

// ---------- how hard each night is ----------
MH.night = function (n) {
  return {
    length: Math.min(160 + (n - 1) * 15, 240),          // seconds from 8 PM to 6 AM
    arriveEvery: Math.max(12, 30 - n * 2.5),           // seconds between new guests
    stay: [60 + n * 3, 95 + n * 4],                    // how long guests stay (seconds)
    askEvery: [Math.max(14, 30 - n * 2), Math.max(24, 46 - n * 2.5)], // seconds between requests
    grumpy: Math.min(1, 0.4 + (n - 1) * 0.08),         // how fast guests get grumpy
    humans: n >= 4 ? Math.max(40, 90 - (n - 4) * 10) : 0,  // seconds between humans sneaking in
    storms: n >= 2 ? Math.max(30, 75 - n * 6) : 0,     // seconds between windows blowing open
    messes: Math.max(25, 55 - n * 4),                  // seconds between guests making a mess
  };
};

// what's new each night (shown at the start of the night)
MH.NEWS = {
  1: ['Welcome to your hotel, Boss!', 'Check guests in at the front desk and bring them what they ask for. Take your time!'],
  2: ['NEW: Stormy weather!', 'Storms can blow a window open. Close it by looking at it and pressing E.'],
  3: ['NEW: Mummies are checking in!', 'They need Fresh Bandages from the Supplies room.'],
  4: ['NEW: Ghosts and... HUMANS?!', 'Humans sneak in and scare the guests. Walk up to them and press E to scare them away!'],
  5: ['NEW: Big Monsters!', 'They need Lightning Jars to recharge their bolts.'],
  6: ['NEW: Blobs!', 'They love Bug Soup and Ecto-Jelly. Everyone is checking in tonight!'],
}

// ---------- reviews ----------
MH.REVIEWS = {
  5: ['Best. Hotel. EVER!', 'The coffin was SO comfy!', 'Five fangs up!', 'I will haunt this place forever!', 'Service was spooktacular!',
      'The boss is a legend.', 'Scarier than my grandma. LOVED IT.', 'I am telling ALL my monster friends!', 'Perfectly creepy. 10/10.'],
  4: ['Really nice stay!', 'Great food, cozy rooms.', 'Almost perfect. Almost.', 'Would howl here again.', 'Spooky and comfy!'],
  3: ['It was okay.', 'Not bad, not great.', 'The service was a bit slow.', 'Meh. I have seen spookier.', 'Average creepiness.'],
  2: ['I waited FOREVER.', 'Nobody helped me!', 'Kind of a mess...', 'My room was a disaster.', 'Not coming back soon.'],
  1: ['WORST HOTEL EVER!', 'I SAW A HUMAN!!!', 'Terrible! Horrible! Not the good kind!', 'I am never coming back!', 'Zero fangs. ZERO.'],
};
