// ============================================================
//  DEAD ACRES — ITEMS, CRAFTING and LOOT  (edit me!)
//
//  Every thing you can carry is in ITEMS.
//  Every thing you can make is in RECIPES.
//  What you find in cupboards, cars and fridges is in LOOT.
// ============================================================
window.DA = window.DA || {};

// kind:  mat = material, food, med = heals you, tool, weapon,
//        build = something you place in the world, light, ammo, special
// stack: how many fit in one inventory square
DA.ITEMS = {
  // ---------- materials ----------
  wood:     { name: 'Wood', kind: 'mat', stack: 50, desc: 'Chop trees to get it.' },
  stone:    { name: 'Stone', kind: 'mat', stack: 50, desc: 'Hit rocks to get it.' },
  scrap:    { name: 'Scrap Metal', kind: 'mat', stack: 30, desc: 'Found in cars and garages.' },
  nails:    { name: 'Nails', kind: 'mat', stack: 50, desc: 'For strong builds.' },
  cloth:    { name: 'Cloth', kind: 'mat', stack: 30, desc: 'Old clothes and rags.' },
  rope:     { name: 'Rope', kind: 'mat', stack: 20, desc: 'Made from cloth.' },
  hide:     { name: 'Animal Hide', kind: 'mat', stack: 20, desc: 'From deer. Warm and tough.' },
  radiopart:{ name: 'Radio Part', kind: 'special', stack: 3, desc: 'Bring 3 to the radio tower on Radio Hill!' },

  // ---------- food and drinks ----------
  berries:  { name: 'Berries', kind: 'food', stack: 20, food: 8, water: 3, desc: 'Picked from bushes.' },
  apple:    { name: 'Apple', kind: 'food', stack: 10, food: 14, water: 4 },
  can:      { name: 'Canned Beans', kind: 'food', stack: 10, food: 32 },
  chips:    { name: 'Chips', kind: 'food', stack: 10, food: 16, water: -4 },
  rawmeat:  { name: 'Raw Meat', kind: 'food', stack: 10, food: 8, hp: -6, cook: 'meat', desc: 'Cook it on a campfire first!' },
  meat:     { name: 'Cooked Meat', kind: 'food', stack: 10, food: 38, hp: 5 },
  water:    { name: 'Water Bottle', kind: 'food', stack: 5, water: 42, empty: 'bottle' },
  bottle:   { name: 'Empty Bottle', kind: 'mat', stack: 5, desc: 'Fill it at the lake or river.' },
  soda:     { name: 'Soda', kind: 'food', stack: 10, food: 4, water: 24 },

  // ---------- healing ----------
  bandage:  { name: 'Bandage', kind: 'med', stack: 10, hp: 25 },
  medkit:   { name: 'Medkit', kind: 'med', stack: 3, hp: 70 },

  // ---------- tools and weapons ----------
  // dmg = damage to zombies, speed = seconds per swing, reach = meters
  // wood / stone = how much you get from each hit on a tree / rock
  stoneaxe: { name: 'Stone Axe', kind: 'tool', stack: 1, dmg: 16, speed: 0.75, reach: 2.4, wood: 3, stone: 1 },
  pickaxe:  { name: 'Pickaxe', kind: 'tool', stack: 1, dmg: 14, speed: 0.85, reach: 2.4, wood: 1, stone: 3 },
  metalaxe: { name: 'Metal Axe', kind: 'tool', stack: 1, dmg: 26, speed: 0.7, reach: 2.5, wood: 5, stone: 2 },
  spear:    { name: 'Spear', kind: 'weapon', stack: 1, dmg: 24, speed: 0.8, reach: 3.2, wood: 1, stone: 1 },
  bat:      { name: 'Nail Bat', kind: 'weapon', stack: 1, dmg: 34, speed: 0.75, reach: 2.4, wood: 1, stone: 1 },
  machete:  { name: 'Machete', kind: 'weapon', stack: 1, dmg: 42, speed: 0.55, reach: 2.4, wood: 2, stone: 1, desc: 'Only found, never made.' },
  bow:      { name: 'Bow', kind: 'weapon', stack: 1, dmg: 45, speed: 0.9, reach: 60, ranged: true, desc: 'Needs arrows. Hold the button to pull, let go to shoot.' },
  arrow:    { name: 'Arrow', kind: 'ammo', stack: 30 },
  firecracker: { name: 'Firecracker', kind: 'throw', stack: 10, dmg: 70, desc: 'Click to throw. Zombies run to the noise... then BOOM!' },

  // ---------- lights ----------
  torch:    { name: 'Torch', kind: 'light', stack: 5, light: 'torch', dmg: 10, speed: 0.7, reach: 2.2, wood: 1, stone: 1, desc: 'Lights the dark... zombies can see it too!' },
  flashlight: { name: 'Flashlight', kind: 'light', stack: 1, light: 'flash', dmg: 7, speed: 0.6, reach: 2.2, wood: 1, stone: 1, desc: 'Bright and never runs out.' },

  // ---------- things you build ----------
  campfire: { name: 'Campfire', kind: 'build', stack: 5, build: 'campfire', desc: 'Light, and cooks raw meat.' },
  wall:     { name: 'Wood Wall', kind: 'build', stack: 20, build: 'wall' },
  doorway:  { name: 'Wood Door', kind: 'build', stack: 10, build: 'door', desc: 'A wall with a door. Press E to open.' },
  floor:    { name: 'Wood Floor', kind: 'build', stack: 20, build: 'floor' },
  stonewall:{ name: 'Stone Wall', kind: 'build', stack: 20, build: 'stonewall', desc: 'Very strong!' },
  bed:      { name: 'Bed', kind: 'build', stack: 1, build: 'bed', desc: 'You wake up here after dying.' },
  box:      { name: 'Storage Box', kind: 'build', stack: 5, build: 'box', desc: 'Keep your stuff safe.' },
  spikes:   { name: 'Spike Trap', kind: 'build', stack: 10, build: 'spikes', desc: 'Hurts zombies that walk on it.' },
};

// what you need to make each thing. out = how many you get
DA.RECIPES = [
  { item: 'stoneaxe', need: { wood: 3, stone: 3 } },
  { item: 'pickaxe', need: { wood: 3, stone: 5 } },
  { item: 'torch', need: { wood: 1, cloth: 1 }, out: 2 },
  { item: 'campfire', need: { wood: 5, stone: 3 } },
  { item: 'spear', need: { wood: 5, stone: 1 } },
  { item: 'bandage', need: { cloth: 2 } },
  { item: 'rope', need: { cloth: 2 } },
  { item: 'bow', need: { wood: 5, rope: 1 } },
  { item: 'arrow', need: { wood: 2, stone: 1 }, out: 5 },
  { item: 'bat', need: { wood: 4, nails: 6 } },
  { item: 'firecracker', need: { cloth: 1, scrap: 1 }, out: 3 },
  { item: 'metalaxe', need: { wood: 3, scrap: 4 } },
  { item: 'wall', need: { wood: 8 } },
  { item: 'doorway', need: { wood: 10, nails: 2 } },
  { item: 'floor', need: { wood: 6 } },
  { item: 'stonewall', need: { stone: 12, wood: 2 } },
  { item: 'spikes', need: { wood: 6 } },
  { item: 'box', need: { wood: 12, nails: 2 } },
  { item: 'bed', need: { wood: 6, cloth: 5 } },
  { item: 'bed', need: { wood: 6, hide: 2 }, alt: true },
  { item: 'medkit', need: { bandage: 2, hide: 1 } },
];

// what you can find. [item, chance weight, min, max]
DA.LOOT = {
  kitchen: { rolls: [1, 3], table: [['can', 5, 1, 2], ['chips', 4, 1, 2], ['soda', 4, 1, 2], ['water', 5, 1, 2], ['apple', 3, 1, 3], ['bottle', 2, 1, 1]] },
  fridge:  { rolls: [1, 2], table: [['soda', 4, 1, 2], ['water', 5, 1, 2], ['apple', 3, 1, 2], ['can', 1, 1, 1]] },
  bathroom:{ rolls: [1, 2], table: [['bandage', 6, 1, 2], ['medkit', 1, 1, 1], ['cloth', 3, 1, 2]] },
  closet:  { rolls: [1, 3], table: [['cloth', 8, 1, 4], ['rope', 2, 1, 1], ['bandage', 1, 1, 1], ['flashlight', 1, 1, 1]] },
  garage:  { rolls: [2, 3], table: [['firecracker', 1, 1, 3], ['nails', 6, 3, 8], ['scrap', 5, 1, 3], ['rope', 3, 1, 2], ['cloth', 2, 1, 2], ['flashlight', 1, 1, 1], ['machete', 1, 1, 1], ['torch', 2, 1, 2]] },
  car:     { rolls: [1, 2], table: [['scrap', 5, 1, 3], ['water', 3, 1, 1], ['cloth', 3, 1, 2], ['nails', 2, 2, 5], ['bandage', 2, 1, 1], ['chips', 2, 1, 1], ['flashlight', 1, 1, 1]] },
  police:  { rolls: [2, 3], table: [['firecracker', 2, 2, 4], ['bandage', 4, 1, 2], ['medkit', 2, 1, 1], ['flashlight', 3, 1, 1], ['machete', 2, 1, 1], ['arrow', 2, 4, 8], ['can', 2, 1, 1]] },
  shelf:   { rolls: [2, 4], table: [['can', 5, 1, 3], ['chips', 5, 1, 3], ['soda', 5, 1, 3], ['water', 5, 1, 3], ['bandage', 2, 1, 2], ['torch', 1, 1, 2], ['nails', 1, 3, 6]] },
  barn:    { rolls: [2, 3], table: [['rope', 4, 1, 2], ['nails', 4, 3, 8], ['scrap', 3, 1, 3], ['apple', 4, 2, 5], ['cloth', 2, 1, 3], ['bottle', 2, 1, 1], ['arrow', 1, 3, 6]] },
  // supply drops from the plane: the best stuff!
  supply:  { rolls: [4, 6], table: [['medkit', 4, 1, 2], ['metalaxe', 2, 1, 1], ['machete', 2, 1, 1], ['bow', 2, 1, 1], ['arrow', 4, 10, 20], ['firecracker', 4, 3, 6], ['can', 4, 2, 4], ['water', 4, 2, 3], ['nails', 3, 8, 16], ['scrap', 3, 3, 6], ['bat', 2, 1, 1], ['flashlight', 2, 1, 1]] },
  // what the horde boss drops
  boss:    { rolls: [4, 5], table: [['medkit', 4, 2, 3], ['machete', 3, 1, 1], ['metalaxe', 3, 1, 1], ['firecracker', 4, 4, 8], ['arrow', 3, 15, 25], ['scrap', 3, 5, 10], ['nails', 3, 10, 20]] },
  cabin:   { rolls: [2, 3], table: [['arrow', 4, 4, 8], ['hide', 3, 1, 2], ['rope', 3, 1, 2], ['can', 3, 1, 2], ['water', 3, 1, 2], ['bow', 1, 1, 1], ['medkit', 1, 1, 1]] },
};

// how long until an empty cupboard gets new stuff in it (in game days)
DA.LOOT_REFILL_DAYS = 4;
// what you start with
DA.START_ITEMS = [['water', 1], ['apple', 2]];
