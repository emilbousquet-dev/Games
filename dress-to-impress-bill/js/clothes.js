// =====================================================================
//  DRESS TO IMPRESS BILL: all the clothes, colors and themes (edit me!)
//
//  Every item has:
//    name  = what the card says
//    tags  = the themes it fits (look at THEMES below)
//    color = the color it starts with (a name from COLORS),
//            or null if you can't change its color
// =====================================================================

const COLORS = {
  red: '#e23b3b', orange: '#f08a24', yellow: '#f7d038', green: '#36b04f',
  bill: '#1f4a36', aqua: '#3fc8d6', blue: '#2f6fe0', navy: '#26314f',
  purple: '#8a4fd8', pink: '#f27cc0', white: '#f4f4f0', silver: '#b9c0c8',
  black: '#24242a', brown: '#7a4e2c', gold: '#e2b43a', tan: '#d8b58a',
};
// "bill" is BILL GREEN, the color of Bill's jacket. Bill LOVES it.
const GREENS = ['green', 'bill'];

const HAIR_COLORS = {
  black: '#1e1612', darkbrown: '#3b2719', brown: '#6b4428', blond: '#d6ae5c',
  light: '#ecd18e', ginger: '#c4602a', grey: '#a9a49c', white: '#efebe2',
  red: '#d4283a', pink: '#f27cc0', purple: '#8a4fd8', blue: '#2f6fe0',
  aqua: '#3fc8d6', green: '#36b04f', bill: '#1f4a36', gold: '#e2b43a',
};

// The 7 tabs of the wardrobe. A missing "color" means it uses HAIR_COLORS.
const CATEGORIES = [
  { key: 'hair', name: 'HAIR' },
  { key: 'hat', name: 'HAT' },
  { key: 'face', name: 'FACE' },
  { key: 'top', name: 'TOP' },
  { key: 'bottom', name: 'PANTS' },
  { key: 'shoes', name: 'SHOES' },
  { key: 'extra', name: 'EXTRA' },
];

const ITEMS = {
  hair: {
    short:    { name: 'Short', tags: ['school', 'sports'] },
    curly:    { name: 'Curly', tags: [] },
    wavy:     { name: 'Wavy', tags: ['beach'] },
    bangs:    { name: 'Bill Bangs', tags: ['school'] },
    spiky:    { name: 'Spiky', tags: ['rock', 'hero'] },
    long:     { name: 'Long', tags: ['fancy', 'royal'] },
    bun:      { name: 'Bun', tags: ['fancy', 'chef'] },
    ponytail: { name: 'Ponytail', tags: ['sports', 'cowboy'] },
    bald:     { name: 'Bald', tags: ['space'] },
  },
  hat: {
    none:       { name: 'No hat', tags: [] },
    cap:        { name: 'Cap', tags: ['sports', 'school', 'gamer'], color: 'red' },
    beanie:     { name: 'Beanie', tags: ['winter', 'gamer'], color: 'blue' },
    tophat:     { name: 'Top Hat', tags: ['fancy', 'spooky'], color: 'black' },
    crown:      { name: 'Crown', tags: ['royal', 'party'], color: null },
    pirate:     { name: 'Pirate Hat', tags: ['pirate'], color: 'black' },
    cowboy:     { name: 'Cowboy Hat', tags: ['cowboy'], color: 'brown' },
    party:      { name: 'Party Hat', tags: ['party'], color: 'pink' },
    chef:       { name: 'Chef Hat', tags: ['chef'], color: 'white' },
    space:      { name: 'Space Helmet', tags: ['space'], color: null },
    witch:      { name: 'Witch Hat', tags: ['spooky'], color: 'purple' },
    knight:     { name: 'Knight Helmet', tags: ['knight'], color: 'red' },
    headphones: { name: 'Headphones', tags: ['gamer', 'rock'], color: 'black' },
    straw:      { name: 'Straw Hat', tags: ['beach', 'cowboy'], color: 'red' },
    earmuffs:   { name: 'Earmuffs', tags: ['winter'], color: 'pink' },
    bandana:    { name: 'Bandana', tags: ['pirate', 'rock'], color: 'red' },
    halo:       { name: 'Halo', tags: ['fancy'], color: null },
  },
  face: {
    none:       { name: 'Nothing', tags: [] },
    glasses:    { name: 'Glasses', tags: ['school', 'gamer'], color: 'tan' },
    sunglasses: { name: 'Sunglasses', tags: ['beach', 'rock'], color: 'black' },
    starshades: { name: 'Star Shades', tags: ['rock', 'party'], color: 'pink' },
    eyepatch:   { name: 'Eye Patch', tags: ['pirate'], color: null },
    mustache:   { name: 'Mustache', tags: ['cowboy', 'chef', 'fancy'], color: 'brown' },
    mask:       { name: 'Hero Mask', tags: ['hero'], color: 'black' },
    goggles:    { name: 'Ski Goggles', tags: ['winter', 'space'], color: 'orange' },
    fangs:      { name: 'Vampire Fangs', tags: ['spooky'], color: null },
    clown:      { name: 'Clown Nose', tags: ['party'], color: null },
    monocle:    { name: 'Monocle', tags: ['fancy', 'royal'], color: null },
    facepaint:  { name: 'Face Paint', tags: ['sports', 'party'], color: 'blue' },
    beard:      { name: 'Beard', tags: ['pirate', 'knight', 'chef'], color: 'brown' },
  },
  top: {
    tshirt:   { name: 'T-Shirt', tags: ['beach', 'sports', 'school'], color: 'white' },
    hoodie:   { name: 'Hoodie', tags: ['gamer', 'school'], color: 'black' },
    puffer:   { name: 'Bill Jacket', tags: ['winter', 'school'], color: 'bill' },
    suit:     { name: 'Tuxedo', tags: ['fancy'], color: 'black' },
    hawaiian: { name: 'Hawaiian', tags: ['beach', 'party'], color: 'aqua' },
    coat:     { name: 'Pirate Coat', tags: ['pirate'], color: 'red' },
    hero:     { name: 'Hero Suit', tags: ['hero'], color: 'blue' },
    armor:    { name: 'Armor', tags: ['knight'], color: 'red' },
    robe:     { name: 'Royal Robe', tags: ['royal'], color: 'purple' },
    dress:    { name: 'Dress', tags: ['fancy', 'party', 'royal'], color: 'pink' },
    spacesuit:{ name: 'Space Suit', tags: ['space'], color: 'white' },
    vest:     { name: 'Cowboy Vest', tags: ['cowboy'], color: 'brown' },
    chefcoat: { name: 'Chef Coat', tags: ['chef'], color: 'white' },
    jersey:   { name: 'Jersey', tags: ['sports'], color: 'red' },
    leather:  { name: 'Leather Jacket', tags: ['rock'], color: 'black' },
    skeleton: { name: 'Skeleton', tags: ['spooky'], color: 'black' },
    sweater:  { name: 'Snow Sweater', tags: ['winter'], color: 'red' },
    gamer:    { name: 'Gamer Shirt', tags: ['gamer'], color: 'purple' },
  },
  bottom: {
    joggers:   { name: 'Joggers', tags: ['sports', 'gamer', 'school'], color: 'navy' },
    jeans:     { name: 'Jeans', tags: ['cowboy', 'school'], color: 'blue' },
    ripped:    { name: 'Ripped Jeans', tags: ['rock'], color: 'black' },
    cargo:     { name: 'Cargo Pants', tags: ['gamer'], color: 'tan' },
    shorts:    { name: 'Shorts', tags: ['beach', 'sports'], color: 'orange' },
    suitpants: { name: 'Suit Pants', tags: ['fancy'], color: 'black' },
    skirt:     { name: 'Skirt', tags: ['fancy', 'school'], color: 'navy' },
    tutu:      { name: 'Tutu', tags: ['party', 'royal'], color: 'pink' },
    spacepants:{ name: 'Space Pants', tags: ['space'], color: 'white' },
    armorlegs: { name: 'Armor Legs', tags: ['knight'], color: null },
    pirate:    { name: 'Pirate Pants', tags: ['pirate'], color: 'red' },
    tights:    { name: 'Hero Tights', tags: ['hero'], color: 'red' },
    snowpants: { name: 'Snow Pants', tags: ['winter'], color: 'aqua' },
    checkered: { name: 'Chef Pants', tags: ['chef'], color: 'black' },
    bones:     { name: 'Bone Pants', tags: ['spooky'], color: 'black' },
  },
  shoes: {
    sneakers:  { name: 'Sneakers', tags: ['sports', 'school', 'gamer'], color: 'white' },
    boots:     { name: 'Boots', tags: ['pirate', 'rock'], color: 'black' },
    fancy:     { name: 'Fancy Shoes', tags: ['fancy', 'royal'], color: 'black' },
    flipflops: { name: 'Flip Flops', tags: ['beach'], color: 'yellow' },
    gold:      { name: 'Gold Shoes', tags: ['royal', 'party'], color: null },
    moon:      { name: 'Moon Boots', tags: ['space'], color: 'silver' },
    skates:    { name: 'Roller Skates', tags: ['party', 'sports'], color: 'pink' },
    cowboy:    { name: 'Cowboy Boots', tags: ['cowboy'], color: 'brown' },
    iron:      { name: 'Iron Boots', tags: ['knight'], color: null },
    clogs:     { name: 'Chef Clogs', tags: ['chef'], color: 'white' },
    hero:      { name: 'Hero Boots', tags: ['hero'], color: 'red' },
    bunny:     { name: 'Bunny Slippers', tags: ['gamer'], color: 'white' },
    witch:     { name: 'Witch Shoes', tags: ['spooky'], color: 'purple' },
    snow:      { name: 'Snow Boots', tags: ['winter'], color: 'aqua' },
  },
  extra: {
    none:       { name: 'Nothing', tags: [] },
    cape:       { name: 'Cape', tags: ['hero', 'royal', 'spooky'], color: 'red' },
    wings:      { name: 'Angel Wings', tags: ['fancy'], color: null },
    batwings:   { name: 'Bat Wings', tags: ['spooky'], color: 'purple' },
    chain:      { name: 'Gold Chain', tags: ['rock', 'party'], color: null },
    scarf:      { name: 'Scarf', tags: ['winter'], color: 'red' },
    backpack:   { name: 'Backpack', tags: ['school'], color: 'blue' },
    guitar:     { name: 'Guitar', tags: ['rock'], color: 'red' },
    sword:      { name: 'Sword', tags: ['pirate', 'knight'], color: 'brown' },
    wand:       { name: 'Magic Wand', tags: ['spooky'], color: null },
    spatula:    { name: 'Spatula', tags: ['chef'], color: 'red' },
    ball:       { name: 'Soccer Ball', tags: ['sports'], color: null },
    controller: { name: 'Controller', tags: ['gamer'], color: 'black' },
    jetpack:    { name: 'Jetpack', tags: ['space', 'hero'], color: 'silver' },
    lasso:      { name: 'Lasso', tags: ['cowboy'], color: 'tan' },
    surfboard:  { name: 'Surfboard', tags: ['beach'], color: 'aqua' },
    parrot:     { name: 'Parrot', tags: ['pirate'], color: 'red' },
    balloons:   { name: 'Balloons', tags: ['party'], color: 'pink' },
    shield:     { name: 'Shield', tags: ['knight', 'hero'], color: 'blue' },
    scepter:    { name: 'Scepter', tags: ['royal'], color: null },
  },
};

// The themes Bill can pick. colors = colors that fit the theme (a little bonus)
const THEMES = {
  pirate: { name: 'PIRATE', emoji: '🏴‍☠️', colors: ['black', 'red', 'brown', 'white'], say: 'a pirate' },
  beach:  { name: 'BEACH DAY', emoji: '🏖️', colors: ['yellow', 'orange', 'aqua', 'pink'], say: 'a day at the beach' },
  fancy:  { name: 'FANCY PARTY', emoji: '🥂', colors: ['black', 'white', 'gold', 'pink', 'purple'], say: 'a fancy party' },
  hero:   { name: 'SUPERHERO', emoji: '🦸', colors: ['red', 'blue', 'yellow'], say: 'a superhero' },
  winter: { name: 'WINTER', emoji: '❄️', colors: ['white', 'aqua', 'blue', 'silver'], say: 'a snowy winter day' },
  space:  { name: 'SPACE', emoji: '🚀', colors: ['white', 'silver', 'navy', 'black'], say: 'outer space' },
  sports: { name: 'SPORTS DAY', emoji: '⚽', colors: ['red', 'blue', 'white', 'green'], say: 'sports day' },
  royal:  { name: 'ROYAL', emoji: '👑', colors: ['purple', 'gold', 'red'], say: 'a king or a queen' },
  cowboy: { name: 'COWBOY', emoji: '🤠', colors: ['brown', 'tan', 'orange', 'red'], say: 'a cowboy' },
  gamer:  { name: 'GAMER', emoji: '🎮', colors: ['green', 'black', 'purple', 'aqua'], say: 'a pro gamer' },
  school: { name: 'SCHOOL DAY', emoji: '🎒', colors: ['navy', 'blue', 'white', 'bill'], say: 'a day at school' },
  spooky: { name: 'SPOOKY', emoji: '🎃', colors: ['black', 'purple', 'orange', 'green'], say: 'something spooky' },
  chef:   { name: 'CHEF', emoji: '👨‍🍳', colors: ['white', 'red', 'black'], say: 'a chef' },
  rock:   { name: 'ROCKSTAR', emoji: '🎸', colors: ['black', 'red', 'silver', 'purple'], say: 'a rockstar' },
  knight: { name: 'KNIGHT', emoji: '🛡️', colors: ['silver', 'red', 'blue', 'gold'], say: 'a knight' },
  party:  { name: 'BIRTHDAY PARTY', emoji: '🎂', colors: ['pink', 'yellow', 'aqua', 'gold'], say: 'a birthday party' },
};

// Who can be your model, and the clothes they start each round in
const MODELS = {
  mio:   { name: 'MIO', hair: 'wavy', hairColor: 'blond', outfit: { top: ['hoodie', 'black'], bottom: ['cargo', 'tan'], shoes: ['sneakers', 'silver'] } },
  nafti: { name: 'NAFTI', hair: 'curly', hairColor: 'black', outfit: { top: ['hoodie', 'aqua'], bottom: ['joggers', 'black'], shoes: ['sneakers', 'blue'] } },
  felix: { name: 'FELIX', hair: 'short', hairColor: 'darkbrown', outfit: { top: ['tshirt', 'navy'], bottom: ['cargo', 'bill'], shoes: ['sneakers', 'black'] } },
  emile: { name: 'EMILE', hair: 'short', hairColor: 'brown', outfit: { top: ['hoodie', 'white'], bottom: ['joggers', 'navy'], shoes: ['sneakers', 'white'] } },
};

const ROUNDS = 5;          // rounds in one fashion show
const ROUND_TIME = 60;     // seconds to get dressed
