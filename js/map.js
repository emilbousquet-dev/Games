// ============================================================
//  LAB 13 — THE MAP, THE STORY AND THE SCARES
//
//  This is the file YOU can change to make your own level!
//  Every letter is one square (2.5 x 2.5 meters) of the lab.
//
//  WALLS & FLOOR          PEOPLE & MONSTERS
//   #  wall                1  player 1 start
//   .  floor               2  player 2 start
//   W  glass window        C  Crawler (small fast alien)
//   V  wall with a vent    S  Stalker (the tall one... it's coming)
//                          Z  Husk (infected scientist, slow but strong)
//                          Q  Hanger (hangs on the ceiling, watch out!)
//  DOORS
//   O  normal door (opens by itself)
//   D  SECURITY door (needs the keycard)
//   B  2-person door  — opens when both yellow  *  buttons are held
//   H  2-person door  — opens when both blue    +  buttons are held
//   P  ELEVATOR door (opens when the power is back on)
//
//  THINGS TO PICK UP      THINGS IN THE LAB
//   K  keycard             R  cryo pod          p  specimen tank
//   F  fuse (need 3!)      t  lab table         w  desk + computer
//   A  flashlight battery  r  server rack       k  crates
//   M  medkit              o  toxic barrels     s  shelves with jars
//   N  note (story!)       m  morgue bed        d  dead body
//                          G  generator         X  elevator floor
//                          u  surgery table     c  alien cocoon (on a wall)
//                          v  vending machine   y  security monitors
//                          h  hole in the wall  f  alien flesh on the floor
//  LIGHTS & SCARES
//   L  ceiling light
//   E  red emergency light
//   J  jump scare! (uses the next scare from the SCARES list)
//   !  words written in blood (uses the next one from WRITINGS)
// ============================================================
window.LAB = window.LAB || {};

LAB.MAP = [
  '#############################################',
  '#R.R.R.R.R#w.wyyr.r..s#sv.w.wv.s#p.p.p.p.p.p#',
  '#.........#...........#.........#...........#',
  '#..1...2..#..d...L..A.#.d..L..M.#.t.t.L.t.t.#',
  '#.N..L....#.....K..Z..#.........#.....d.....#',
  '#.........#!..........#.t..N..t.#C..!...N..F#',
  '#R.R.R.R.R#...w...N..s#..Z......#.t.t...t.t.#',
  '#....J....#k.........k#k..!....o#.....E.....#',
  '####O######.....B.....#####O#####p.p.C...p.p#',
  '####.###########.##########.#####.....J.....#',
  '####.###########.##########.##########D######',
  '#..L...J.....*......*....L....+.E.....!....+#',
  '#......!......L.........J.......L...........#',
  '####O#################O##############H#######',
  '#m.m.m...d#####.o...........o.#.o.o...kck.k.#',
  '#....u....#####.............E.#.........Q...#',
  '#.L...N..c#####..r.......r....#.o..L.....o..#',
  '#.........#####.....k...k.....#....Z..d.....#',
  '#m.m.J.m.m#####.......G.......#.Q.....!..N..#',
  '#.........#####.....k...k.....#.o..........k#',
  '#.FZ...d..#####..r...J...r....#.k..E.....F..#',
  '#!.....M..#####...............#..........o.c#',
  '#m.m...A..#####.o.....L.....o.#.k.k.J.k..Q..#',
  '####O#################O######################',
  '#...J....L........!.......L.......E..J....L.#',
  '######O###############P#########WWW###O##WW##',
  '#k.k....k.k.###.............###..p...p...p..#',
  '#h......A...###.E.........E.###c.f.......f.c#',
  '#.o.ZL....o.###.....L.......###..d...S...!..#',
  '#.........N.###.............###.f...L....f.c#',
  '#k.o.J..k.k.###.....XXX.....###..p...N...p..#',
  '#k.k..M.k.k.###.....XXX.....###.f..h..C..f..#',
  '#############################################',
];

// Names of the areas (shown when you walk in). x1,y1 = top-left square, x2,y2 = bottom-right.
// style = what the walls look like: concrete, tiles or metal
LAB.ZONES = [
  { name: 'CRYO BAY', x1: 1, y1: 1, x2: 9, y2: 7, style: 'tiles' },
  { name: 'SECURITY OFFICE', x1: 11, y1: 1, x2: 21, y2: 7, style: 'metal' },
  { name: 'BREAK ROOM', x1: 23, y1: 1, x2: 31, y2: 7, style: 'concrete' },
  { name: 'RESEARCH LAB', x1: 33, y1: 1, x2: 43, y2: 9, style: 'tiles' },
  { name: 'MAIN CORRIDOR', x1: 1, y1: 8, x2: 43, y2: 12, style: 'concrete' },
  { name: 'MEDBAY / MORGUE', x1: 1, y1: 14, x2: 9, y2: 22, style: 'tiles' },
  { name: 'GENERATOR ROOM', x1: 11, y1: 14, x2: 30, y2: 22, style: 'metal' },
  { name: 'MAINTENANCE', x1: 31, y1: 14, x2: 43, y2: 22, style: 'metal' },
  { name: 'LOWER CORRIDOR', x1: 1, y1: 23, x2: 43, y2: 25, style: 'concrete' },
  { name: 'STORAGE', x1: 1, y1: 26, x2: 11, y2: 31, style: 'concrete' },
  { name: 'SURFACE LIFT', x1: 13, y1: 26, x2: 29, y2: 31, style: 'metal' },
  { name: 'CONTAINMENT CELL 13', x1: 30, y1: 26, x2: 43, y2: 31, style: 'metal' },
];

// The notes you find (in the order they appear in the map: top to bottom, left to right)
LAB.NOTES = [
  { title: 'CRYO LOG — 02:47 AM', text: 'Emergency stasis for Dr. REYES and Officer PARK.\nBoth were bitten during the breach in Containment.\n\nIf you are reading this, the stasis power failed. I am so sorry.\n\nGet to the SURFACE LIFT. It needs power: I pulled the 3 generator FUSES so the thing could not follow us up.\n\n— Dr. M. Okoye' },
  { title: 'TIM\'S DIARY — DAY 41', text: 'Everyone keeps joking about "Thirteen". It\'s just a lump of meat floating in a tank.\n\nBut today it turned its head when I walked past. I SWEAR it did.\n\nAlso, whoever keeps eating my pudding: I know it\'s you, Gary.' },
  { title: 'SPECIMEN 13 — RESEARCH NOTES', text: 'The organism splits into small fast forms (we call them CRAWLERS).\n\nThe large form (the STALKER) has no eyes, but reacts to light: under a direct flashlight beam it FREEZES completely. Keep the beam on it long enough and it runs away.\n\nKeep the lights on.\nKEEP THE LIGHTS ON.' },
  { title: 'SECURITY — CHIEF HALE', text: 'I locked the SECURITY KEYCARD in my office.\n\nThe door has a two-person lock: both yellow buttons in the corridor must be HELD AT THE SAME TIME.\n\nNobody goes into Research alone. That was the rule.\nNobody listened.' },
  { title: 'MEDBAY PATIENT LOG', text: '01:10  Dr. Lin bitten on the arm.\n01:25  Fever 42°C.\n01:40  Eyes turning completely black.\n01:55  He asked me to turn off the lights. Politely.\n02:05  He is not in his bed anymore\n\n[the rest of the page is torn off and soaked in blood]' },
  { title: 'MAINTENANCE — WARNING', text: 'THE THINGS ON THE CEILING — we call them HANGERS.\n\nThey drop a sticky tongue down to the floor. If one grabs you, it pulls you up to its mouth.\nYour partner has to HIT IT to get you free.\n\nWATCH WHERE YOU WALK. LOOK UP.' },
  { title: 'DR. OKOYE — LAST MESSAGE', text: 'I hid the three fuses: Research, Medbay and Maintenance.\n\nReyes, Park — put them in the GENERATOR and take the lift.\n\nDon\'t wait for me.\nI\'m not coming.\n\nIt found me.' },
  { title: 'CONTAINMENT — FINAL ENTRY', text: 'We had it all wrong.\n\nIt was never trying to escape.\nIt is trying to get UP. To the SURFACE. To the cities.\n\nIt needs to ride the lift with someone.\n\nWhatever you do, DON\'T LET IT' },
];

// Words written in blood on the walls (in map order)
LAB.WRITINGS = ['IT HEARS YOU', 'KEEP THE LIGHTS ON', 'NO WAY OUT', 'DONT LOOK AWAY', 'WE WERE 40', 'LOOK UP', 'HELP US', 'IT WANTS UP', 'BEHIND YOU'];

// The jump scares, in map order. Choose from:
//  'bodyDrop'      a body falls from the ceiling right in front of you
//  'faceLunge'     an alien face flies at your eyes
//  'stalkerPass'   the Stalker runs across the hallway far away
//  'crawlerAmbush' crawlers burst out of the walls
//  'lightsOut'     ALL lights die... and something is standing in front of you
//  'whisperBehind' something whispers behind you... don't turn around
//  'handsGlass'    bloody hands slam on your screen
LAB.SCARES = ['bodyDrop', 'faceLunge', 'stalkerPass', 'handsGlass', 'whisperBehind', 'crawlerAmbush', 'lightsOut', 'faceLunge', 'bodyDrop', 'lightsOut'];
