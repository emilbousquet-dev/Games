// ============================================================
//  STARFALL — THE PLANET LAYOUT  (edit me!)
//
//  Everything that is placed in the world is listed here.
//  The world is 640 x 640 meters. The middle of the island is x:0, z:0.
//  x goes EAST (right on the map), z goes SOUTH (down on the map).
//  Change a number, save, and reload the page to see it move!
// ============================================================
window.SF = window.SF || {};

SF.Layout = {
  seed: 1313,             // change this for a different shaped planet
  dayLength: 480,         // seconds for a full day + night

  // the 5 regions of the island
  regions: [
    { id: 'plains', name: 'VIOLET PLAINS',  x: 0,    z: 10 },
    { id: 'jungle', name: 'GLOW JUNGLE',    x: 10,   z: 160 },
    { id: 'desert', name: 'CRYSTAL DESERT', x: -175, z: 10 },
    { id: 'frozen', name: 'FROZEN PEAKS',   x: -20,  z: -185 },
    { id: 'lava',   name: 'LAVA RIFT',      x: 160,  z: -25 },
  ],

  crash:   { x: 20, z: 222 },   // where your ship crashed (you start here)
  village: { x: 72, z: 112 },   // the village of Zib's friends

  // the 4 temples. Each one has a boss, a new power, and a ship part.
  temples: [
    { name: 'TEMPLE OF ROOTS', region: 'jungle', x: -62, z: 118, power: 'glider', boss: 'thornmaw', part: 'ENGINE CORE' },
    { name: 'TEMPLE OF SANDS', region: 'desert', x: -208, z: 32, power: 'bow',    boss: 'sandwyrm', part: 'NAVIGATION CHIP' },
    { name: 'TEMPLE OF FROST', region: 'frozen', x: -18, z: -200, power: 'boots', boss: 'colossus', part: 'FUEL CELL' },
    { name: 'TEMPLE OF EMBERS', region: 'lava',  x: 160, z: -25, power: null,     boss: 'emberking', part: 'HYPERDRIVE CRYSTAL' },
  ],

  // the big hill you can glide from to reach the desert temple
  glideHill: { x: -150, z: -25, height: 66, radius: 78 },

  // rivers (lists of points from the mountains to the sea)
  rivers: [
    [[-40, -110], [-30, -30], [15, 50], [40, 140], [75, 200], [105, 290]],
    [[-95, 50], [-115, 120], [-125, 180], [-150, 290]],
  ],

  // signal towers: climb to the top to reveal the map around them
  towers: [
    { x: 30, z: 20 }, { x: -20, z: 170 }, { x: -150, z: 70 }, { x: -60, z: -150 }, { x: 95, z: -95 },
  ],

  // beacons: save points and fast travel
  beacons: [
    { name: 'CRASH SITE', x: 34, z: 214 },
    { name: 'ZIBVILLE', x: 62, z: 124 },
    { name: 'PLAINS', x: 10, z: -10 },
    { name: 'DESERT OASIS', x: -140, z: 60 },
    { name: 'FROST PASS', x: -8, z: -130 },
    { name: 'EMBER ISLAND', x: 153, z: -12 },
  ],

  // shop in the village (prices in star shards)
  shop: [
    { id: 'heart',  name: 'Heart Container', text: '+1 heart',            price: 30, max: 5 },
    { id: 'energy', name: 'Energy Cell',     text: 'run & glide longer',  price: 25, max: 4 },
    { id: 'sword',  name: 'Sword Upgrade',   text: 'your sword hits harder', price: 60, max: 2 },
  ],

  startHearts: 3,
};
