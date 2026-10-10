// ============================================================
//  ATLANTIS DIVER — THE MAP (edit me!)
//
//  The whole city is drawn with letters. Every letter is one square.
//  Every line must have exactly 48 letters. The top line is the sea surface,
//  and each line going down is 4 meters deeper.
//
//  WALLS (you can't swim through them)
//    #  rock             B  white marble        G  gold
//    T  temple stone     R  glowing rune stone  X  crystal rock
//    %  cracked wall (break it with the harpoon to find secret rooms!)
//
//  BACK WALLS (drawn behind you, you swim in front of them)
//    b  marble   g  gold   t  temple   x  crystal
//
//  DECORATIONS
//    |  column (stack them!)   /  broken column   S  statue   P  giant Poseidon statue
//    k  kelp   w  seagrass   c  coral   L  crystal lamp   C  glowing crystals
//
//  TREASURE
//    $  gold coins   o  pearl clam   *  gem   u  golden cup
//    h  marble head  W  crown        @  treasure chest
//    !  stone tablet (a piece of the story)   Y  the Trident of Poseidon
//
//  CREATURES
//    f  fish school   v  sea turtle   j  jellyfish   r  crab
//    e  moray eel (put it next to a wall)   p  pufferfish
//    a  anglerfish    s  shark          Z  the Guardian Sea Serpent
// ============================================================

AT.MAP = [
    // ---------- SUNLIT SHALLOWS ----------
    '................................................', // 0 m
    '................................................',
    '......f.........................................',
    '........................................f.......',
    '...............v................................',
    '.c......................................|.....c.', // 20 m
    '##w.k...................................|..wk.##',
    '#####c.w$...ocw..................$.ow...|/c#####',
    '#########/.####.k..............wc####...########',
    '##########..#####c......f.....k#######..########',
    '##########..######............########..########', // 40 m
    '####...........####..........####............###',
    '####...........###............###............###',
    '####.ow.$...c*.###............###.c.!..w.o.$.###',
    '######.c.k..######............#####..k..c.######',
    // ---------- OUTER RUINS ----------
    '##################............##################', // 60 m
    '########.............................###########',
    '###.....................................#....c##',
    '###.....................................%.....##',
    '###...........j...................j.....%.....##',
    '###.....f.............j.................%.@W$.##', // 80 m
    '###...........................f.........########',
    '###..........................................###',
    '###.......BBBB...............................###',
    '###....BBBBBBBBBB...........$................###',
    '###.BBBBBBBBBBBBBBBB...BBBBBBB...............###', // 100 m
    '###.BbbbbbbbbbbbbbbB....|..|.................###',
    '###.BbbbbbbjbbbbbbbB....|..|..|.......j......###',
    '###.Bbbb|bbb|bbb|bbB....|..|..|../.......o...###',
    '###.bbbb|bbb|bbb|bbB....|.h|..|!.|...........###',
    '###.bbbb|bbb|bbb|bbB...BBBBBBBBBBBB..........###', // 120 m
    '###.Bbbb|bbb|bbb|bbB.........................###',
    '###.Bbbb|bbb|bbb|bbb.........................###',
    '###.Bbbb|bbb|bbb|bbb......................$..###',
    '###.Bbbb|bbb|bbb|bbb.......j.................###',
    '###.Bbbb|bbb|bbb|bbb.........................###', // 140 m
    '###.BbSb|b!b|bub|b$b..S./.o.r.......rS*.kwkck###',
    '####BBBBBBBBBBBBBBBB##########......############',
    '##############################......############',
    '##############################......############',
    // ---------- GOLDEN STREETS ----------
    '#############################........###########', // 160 m
    '##............................................##',
    '##.......................GGGGGG...............##',
    '##...........GGGG......GGGGGGGGGG.............##',
    '##.........GGGGGGGG....BggggggggB..f..........##',
    '##.........BggggggB.p..Bggggggggg.....GG......##', // 180 m
    '##.......p.gggggggB....BggggggggB...GGGGGG....##',
    '##.........BggggggB....BggggggggB...BggggB...e##',
    '##e........BggggggB....BggggggggB...Bggggg....##',
    '##.........Bggggggg....gggggggggB...gggggB....##',
    '##.o......LBgug*g$g.Sp.gg!ghgug@B.L.gg*guB....##', // 200 m
    '##GGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...G##',
    '##GGG....GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...G##',
    '##............................................##',
    '##............GGGGGGGGGGGGGG..................##',
    '##...GGGG.....BggggggggggggB....GGGG.......GGG##', // 220 m
    '##.GGGGGGGG...Bgg|gg|gg|gggB..GGGGGGGG.....GGG##',
    '##.BggggggB...Bgg|gg|gg|gggBp.BggggggB.....%..##',
    '##.gggggggBp..Bgg|gg|gg|gggB..Bggggggg.f...%..##',
    '##.BggggggB...Bgg|gg|gg|gggB..BggggggB.....%..##',
    '##eBggggggg...ggg|gg|gg|gggg..gggggggB.....%@W##', // 240 m
    '##.Bggggggg.S.gg$|!g|Wg|ug*g.Lggug*g$B..o..GGG##',
    '##GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGG##',
    '##GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG....GGG##',
    '##.....................f......................##',
    '##....GGGGGG.......................GGGGGGG....##', // 260 m
    '##..GGGGGGGGGG...................GGGGGGGGGGG..##',
    '##..BggggggggB...................BgggggggggB..##',
    '##..gggggggggB..........p........Bgggggggggg..##',
    '##..BggggggggB...................BgggggggggB.e##',
    '##e.BggggggggB...................BgggggggggB..##', // 280 m
    '##..Bggggggggg...................ggggggggggB..##',
    '##..Bg!ghg@g$g..S.L..........L.S.ggug*gWg$gB..##',
    '##GGGGGGGGGGGGGGGGGG........GGGGGGGGGGGGGGGGGG##',
    '##GGGGGGGGGGGGGGGGGG........GGGGGGGGGGGGGGGGGG##',
    // ---------- TEMPLE OF POSEIDON ----------
    'TTTTTTTTTTTTTTTTTTTT........TTTTTTTTTTTTTTTTTTTT', // 300 m
    'TTTTTTTTTTTTTTTTTTTT........TTTTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTT............TTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTR............RTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTttttttttttttttttttttttttttTTTTTTTTTTT',
    'TTttttttttttttttttttttttttttttttttttttttttttttTT', // 320 m
    'TTttttttttttttttttttttttttttttttttttttttttttttTT',
    'TTTTTTTTTTTTTttttttttttttttttttttttTTTTTTTTTTTTT',
    'TTttttttttttTttttttttttttttttttttttTttttttttttTT',
    'tt%tttttttttTtttttttttttjttttttttttTttttttttttTT',
    'tt%tttttttttTttttttttttttttttttttttTttttttttttTT', // 340 m
    't*%tttttttttttttttttttttttttttttttttttttttttttTT',
    'TTLt!t*tWtLttttttttttttttttttttttttttLt@t*t!ttTT',
    'TTTTTTTTRTTTTttttttttttttttttttttttTTTTRTTTTTTTT',
    'TTttttttttttttttttttttttttttttttttttttttttttttTT',
    'TTttttttttttttttttttttttttttttttttttttttttttttTT', // 360 m
    'TTttttttttttttttttttttttttttttttttttttttttttttTT',
    'TRttttttttttttttttttttttttttttttttttttttttttttRT',
    'TTttttttjt|tttt|tttttttttttttttttt|tttt|ttttttTT',
    'TTtttttttt|tttt|tttttttttttttttttt|tttt|ftttttTT',
    'TTtttttttt|tttt|tttttttttttttttttt|tttt|ttttttTT', // 380 m
    'TTtttttttt|tttt|ttttttttsttttttttt|tttt|ttttttTT',
    'TTtttttttt|tttt|tttttttttttttttttt|tttt|ttttttTT',
    'TRtttttttt|tttt|tttttttttttttttttt|tttt|ttttttRT',
    'TTtttttttt|tatt|tttttttttttttttttt|tttt|ttttttTT',
    'TTtttttttt|tttt|tttttttttttttttttt|ttat|ttttttTT', // 400 m
    'TTtttttttt|tttt|tttttttttttttttttt|tttt|ttttttTT',
    'TRtttttttt|tttt|ttttttttttttttsttt|tttt|ttttttRT',
    'TTtttttttt|tttt|tttttttttttttttttt|tttt|ttttttTT',
    'TTttSttttt|tttt|tttttttttttttttttt|tttt|tttSttTT',
    'TTTTTTTTtt|tttt|tttttttttttttttttt|tttt|TTTTTTTT', // 420 m
    'TTTTTTTTtt|tttt|tttttttttttttttttt|tttt|TTTTTTTT',
    'TTTTTTTTtt|tt$t|thtLt!ttPttLtttttt|tutt|TTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTRTTTRTTT....TTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTT....TTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTT....TTTTTTTTTTTTTTTT', // 440 m
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTT....TTTTTTTTTTTTTTTT',
    // ---------- HEART OF ATLANTIS ----------
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXxxxxxXXXXXXXXXXXXXXXX',
    'XXXxxxxxxxxxXXXXXXXXXXXXXXXxxxxxXXXXXXXXXXXXXXXX',
    'XXXxxxxxxxxxXXXXXXXXXXXXXXXxxCxxXXXXXXXXXXXXXXXX',
    'XXXxxxxxxxxxXXXXXXXXXXXXXXXxxxxxXXXXXXXXXXXXXXXX', // 460 m
    'XXXxxxxxxxxxXXXXXXXXXXXXXXXxxxxxXXXXXXXXXXXXXXXX',
    'XXXx!xCx*xWxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXXXXX',
    'XXXXXXXXXXXXxxxxxxxxaxxxxxxxxxxxxxxxxxxxxXXXXXXX',
    'XXXXXXXXXXXXxxxxxxxxxxxxxxjxxxxxxxxxxxxxxXXXXXXX',
    'XXXXXXXXXXXXxxxxxxxxxxxx$xxxxxxxxxxxxxoxxxxxxXXX', // 480 m
    'XXXXXXXXXXxxxxxxCxxxxxCxxxxxxxx*xxxxxxxxxxxxxXXX',
    'XXXXXXXXXXxxxxxxXXXXXXXXXXXXXXXXXXxxxfxxxxxxxXXX',
    'XXXXXXXXXXxxxxxxXXXXXXXXXXXXXXXXXXxxxxxxxxxxxXXX',
    'XXXXXXXXXXxxxxxxXXXXXXXXXXXXXXXXXXxxxxxxxxxxxXXX',
    'XXXXXXXXXXxxxxxxXXXXXXXXXXXXXXXXXXxxxxxxxxxxxXXX', // 500 m
    'XXXXXXXXXXxxaxxxXXXXXXXXXXXXXXXXXXxCxx!x@xxCxXXX',
    'XXXXXXXXXXxxxxxxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'XXXXXXXXXXxxxxxxXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'XXXXXXXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXXXXXXX',
    'XXXXXXXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXXXXXXX', // 520 m
    'XXXXXXXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXXXXXXX',
    'XXXXxxxxxCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXXXXXXX',
    'XXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxCxxxxxXXXX',
    'XXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXX',
    'XXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxfxxxxxxxXXXX', // 540 m
    'XXXXxxxxxxxxxxxxxxxxxxxxZxxxxxxxxxxxxxxxxxxxXXXX',
    'XXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXX',
    'XXXXxCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXX',
    'XXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXX',
    'XXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxCxXXXX', // 560 m
    'XXXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXX',
    'XXXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXX',
    'XXXCx!xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxXXXX',
    'XXXXXXXxxxxxxxxxxxxxCxxxYxxxCxxxxxxxxxxxxXXXXXXX',
    'XXXXXXXxxxxxxxxxxxxxxXXXXXXXxxxxxxxxxxxxxXXXXXXX', // 580 m
    'XXXXXXXxCxxxCxxxx*xxxXXXXXXXxxWxxxxCxxxCxXXXXXXX',
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
];

// The five zones of Atlantis (depth in meters)
AT.ZONES = [
  { name: 'Sunlit Shallows', from: 0, mult: 1 },
  { name: 'Outer Ruins', from: 60, mult: 2 },
  { name: 'Golden Streets', from: 160, mult: 3.5 },
  { name: 'Temple of Poseidon', from: 300, mult: 6 },
  { name: 'Heart of Atlantis', from: 450, mult: 10 },
];

// Treasure: how much gold it's worth near the surface.
// Deeper zones multiply the value (see "mult" above)!
AT.TREASURE = {
  '$': { name: 'Gold Coins', value: 15 },
  'o': { name: 'Pearl', value: 30 },
  '*': { name: 'Gem', value: 50 },
  'u': { name: 'Golden Cup', value: 80 },
  'h': { name: 'Marble Head', value: 100 },
  'W': { name: 'Crown', value: 200 },
  '@': { name: 'Treasure Chest', value: 300 },
};

// The 12 stone tablets, in order from the top to the bottom of the map
AT.TABLETS = [
  ['Welcome, Traveller', 'You are swimming above Atlantis, the greatest city of the old world. If you are reading this, our city has fallen asleep beneath the waves. Dive deeper to learn our story.'],
  ['The City of Inventors', 'We Atlanteans loved to build. We made singing fountains, moving statues and lamps that never went out. Our ships sailed to every corner of the world.'],
  ['The Heart Crystal', 'Deep below the city glows the Heart Crystal. It gave us light and warmth, and its power made our gold shine like the sun.'],
  ["Poseidon's Gift", 'The sea god Poseidon gave our first queen a golden Trident. Whoever held it could calm any storm and speak with every creature of the sea.'],
  ['The Golden Age', 'For a thousand years the Trident kept the waves gentle. Dolphins raced beside our ships and the whales sang to our children.'],
  ['Prince Aldric', 'Young Prince Aldric wanted more. "With the Trident," he said, "I could rule the whole world!" One night, he stole it from the Temple.'],
  ['The Great Wave', "But the Trident only obeys a kind heart. In Aldric's hands it grew angry. The sea rose higher and higher, taller than our tallest towers."],
  ['The Last Night', 'Our people escaped on the ships, carrying only what they could hold. We watched our beautiful city sink beneath the waves.'],
  ['The Guardian', 'Poseidon sent his great Sea Serpent to guard the Trident in the Heart of Atlantis, so that no greedy hand could ever take it again.'],
  ['The Promise', 'The Serpent will not harm those who are brave and gentle for long. Calm it with your harpoon, do not fear it, and slip past while it rests.'],
  ['The Sleeping City', 'Atlantis is not dead, only sleeping. When the Trident is lifted by a kind heart, the Heart Crystal will shine again.'],
  ['To the Finder', 'If you found all our tablets, you know our whole story. Take the Trident, diver. Wake our city. And please... be kinder than Aldric was.'],
];
