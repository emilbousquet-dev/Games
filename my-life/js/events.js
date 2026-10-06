// ============================================================
//  MY LIFE — ALL THE LIFE MOMENTS ⭐
//  This is the file to add new ideas to!
//
//  A moment looks like this:
//    moment({
//      id: 'peas',               // a unique name
//      ages: [0, 2],             // it can happen from age 0 to age 2
//      scene: 'home',            // where: nursery, home, bedroom, playground, classroom,
//                                //   street, office, burger, apartment, petshop, cardealer,
//                                //   park, hospital, oldhome, talent, garden, myhome, job
//      cast: { a: 'mom' },       // who is there (mom, dad, sib, friend, pet, boss, or new:lady...)
//      text: 'Mom gives you peas.',
//      choices: [
//        { good: 'Eat them', do: [...actions...], result: 'Yum!', stats: { health: 5 } },
//        { evil: 'Throw them', ... },
//        { funny: 'Pea mustache', ... },
//        { only: 'evil', evil: 'A secret evil choice', ... },   // only for evil people!
//      ],
//    });
//
//  Actions:  ['walk', who, where]   ['run', who, where]   ['say', who, 'text']
//            ['pose', who, 'dance', seconds]   ['emote', who, '😂']   ['throw', who, target, 'ball']
//            ['give', who, target, 'gift']   ['jump', who]   ['spin', who]   ['cam', 'close', who]
//            ['leave', who]   ['enter', who]   ['confetti', who]   ['shake']   ['sound', 'boing']
//  Poses:    stand sit lie sleep crawl dance silly wave cry sad cheer hug laugh angry evilLaugh scared
//            point think flex facepalm clap sneak shrug kneel bow kick throw give sing yell cook
//            type read phone eat eatStand stretch surprised smug film shake babysit swing fall
// ============================================================
window.ML = window.ML || {};

ML.Events = (function () {
  const U = ML.U;
  const list = [];
  const moment = (o) => { list.push(o); return o; };
  const PI = Math.PI;
  const L = () => ML.Life.L;
  const has = (role) => !!ML.Life.person(role);

  // ============================================================
  //  👶 YOU ARE BORN!
  // ============================================================
  const birth = {
    id: 'birth', scene: 'nursery', react: false,
    cast: { mom: 'mom', dad: 'dad' },
    at: { me: 'crib', mom: [-1.05, -1.6, -2.3], dad: [-3.1, -1.5, 2.4] },
    pose: { me: 'babysit' },
    start: [['cam', 'both', 'me', 'mom']],
    text: (l) => `👶 WAAAH! You are born! Welcome to the world, <b>${l.first} ${l.last}</b>!<br>Your mom <b>{mom}</b> and your dad <b>{dad}</b> look at you with HUGE smiles.` + (has('sib') ? `<br>Your ${ML.Life.person('sib').gender === 'f' ? 'big sister' : 'big brother'} <b>{sib}</b> is waiting outside!` : ''),
    choices: [
      { good: 'Smile and giggle', do: [['pose', 'me', 'laugh', 1.6], ['emote', 'me', '💖'], ['pose', 'mom', 'hug', 1.2]], result: '"Our little angel!" Mom and Dad melt like ice cream. 😇', stats: { happy: 5 }, love: { mom: 5, dad: 5 } },
      { evil: 'Scream as LOUD as you can', do: [['pose', 'me', 'yell', 0.1], ['sound', 'cry'], ['shake', 0.6], ['pose', 'dad', 'scared', 1.6], ['pose', 'me', 'babysit']], result: 'WAAAAAAAH! The windows shake. Dad covers his ears. "Is that... normal?" 😈', stats: { health: 3 } },
      { funny: 'Make a funny face', do: [['pose', 'me', 'silly', 1.6], ['pose', 'dad', 'laugh', 1.6]], result: 'You stick out your tongue and cross your eyes. Dad laughs so hard he snorts! 🤡', stats: { happy: 5 }, love: { dad: 5 } },
    ],
  };

  // ============================================================
  //  👶 BABY (0 - 3)
  // ============================================================
  moment({
    id: 'peas', ages: [0, 2], scene: 'home', cast: { mom: 'mom' },
    at: { me: [-3.2, 0.3, PI], mom: [-2.5, -0.1, -2.2] }, pose: { me: 'babysit' },
    start: [['spawn', 'bowl', [-3.0, 0.0], 'bowl'], ['cam', 'both', 'me', 'mom']],
    text: 'Mom gives you a bowl of mashed peas. 🟢 They look like green slime...',
    choices: [
      { good: 'Eat them all up', do: [['pose', 'me', 'eat', 2.2], ['emote', 'me', '😋'], ['pose', 'mom', 'clap', 1.4]], result: '"Yum!" Mom is SO proud of you. You will grow big and strong. 💪', stats: { health: 6 }, love: { mom: 5 } },
      { evil: 'Throw them at Mom', do: [['remove', 'bowl'], ['throw', 'me', 'mom', 'bowl'], ['pose', 'mom', 'facepalm', 1.6], ['pose', 'me', 'evilLaugh', 1.4]], result: 'SPLAT! 💚 Mom has peas in her hair. She does not look happy. You look VERY happy.', stats: { happy: 6 }, love: { mom: -8 } },
      { funny: 'Make a pea mustache', do: [['pose', 'me', 'eat', 1.0], ['emote', 'me', '🥸'], ['pose', 'me', 'silly', 1.4], ['pose', 'mom', 'laugh', 1.4]], result: 'You smear peas under your nose. "Bonjour, Mama!" Mom can\'t stop laughing. 🤡', stats: { happy: 5 }, love: { mom: 3 } },
    ],
  });

  moment({
    id: 'firstWord', ages: [0, 2], scene: 'nursery', cast: { mom: 'mom', dad: 'dad' },
    at: { mom: [1.0, 0.6, -1.5], dad: [-1.0, 0.6, 1.5] }, pose: { me: 'babysit' },
    start: [['cam', 'close', 'me']],
    text: 'Mom and Dad sit in front of you. "Say MAMA!" says Mom. "No, say DADA!" says Dad. Everybody is waiting for your FIRST WORD...',
    choices: [
      { good: 'Say "I love you!"', do: [['say', 'me', 'I wuv you!'], ['emote', 'mom', '😭'], ['pose', 'mom', 'cry', 1.2], ['pose', 'dad', 'cheer', 1.2]], result: 'Three words at once! Mom cries happy tears. "Our baby is a GENIUS!" 😇', stats: { smarts: 6 }, love: { mom: 6, dad: 6 }, highlight: 'First words: "I love you!"' },
      { evil: 'Say "NO!"', do: [['say', 'me', 'NO!!!'], ['pose', 'me', 'angry', 1.4], ['pose', 'dad', 'surprised', 1.4]], result: 'Your first word is NO. Mom and Dad look at each other. "Uh oh..." 😈', stats: { happy: 3 }, highlight: 'First word: "NO!"' },
      { funny: 'Say "BANANA!"', do: [['say', 'me', 'BA-NA-NA!'], ['pose', 'me', 'silly', 1.2], ['pose', 'mom', 'laugh', 1.4], ['pose', 'dad', 'laugh', 1.4]], result: 'Nobody knows why you said banana. But it\'s the best first word EVER. 🍌', stats: { happy: 5 }, love: { dad: 3, mom: 3 }, highlight: 'First word: "BANANA!"' },
    ],
  });

  moment({
    id: 'crawlAway', ages: [0, 0], scene: 'nursery', cast: { mom: 'mom' },
    at: { mom: [1.6, 0.4, -1.4] }, pose: { me: 'babysit' },
    text: 'Mom says: "Stay right there, sweetie, I\'ll be back in ONE second!" She looks away...',
    choices: [
      { good: 'Crawl to Mom for a hug', do: [['crawl', 'me', 'mom'], ['pose', 'mom', 'hug', 1.4], ['emote', 'me', '🥰']], result: 'You crawl into Mom\'s arms. Best. Hug. Ever. 😇', stats: { happy: 5 }, love: { mom: 6 } },
      { evil: 'Crawl out the door and escape', do: [['crawl', 'me', 'door'], ['emote', 'mom', '😱'], ['run', 'mom', 'door'], ['pose', 'mom', 'scared', 1]], result: 'You almost made it to the stairs! Mom runs after you. You are a tiny escape artist. 😈', stats: { health: 2, happy: 4 }, love: { mom: -4 } },
      { funny: 'Crawl in circles until you\'re dizzy', do: [['crawl', 'me', 'toys'], ['spin', 'me'], ['spin', 'me'], ['emote', 'me', '😵‍💫'], ['pose', 'mom', 'laugh', 1.2]], result: 'Round and round and round... you fall over giggling. 🤡', stats: { happy: 6 } },
    ],
  });

  moment({
    id: 'firstSteps', ages: [1, 1], always: true, scene: 'home', cast: { mom: 'mom', dad: 'dad' },
    at: { me: [-1.6, 0.9, 1.57], mom: [1.2, 0.8, -1.57], dad: [-0.2, -1.2, 0.3] },
    start: [['pose', 'mom', 'kneel'], ['cam', 'both', 'me', 'mom']],
    text: 'It\'s time for your FIRST STEPS! 👣 Mom kneels down with her arms open: "Come on, {me}! You can do it!"',
    choices: [
      { good: 'Walk to Mom', do: [['walk', 'me', 'mom'], ['pose', 'mom', 'hug', 1.4], ['pose', 'dad', 'cheer', 1.4]], result: 'One, two, three steps... you made it! Everyone cheers! 👏', stats: { health: 5, happy: 5 }, love: { mom: 5 }, highlight: 'Took your first steps' },
      { evil: 'Walk the OTHER way and push the TV buttons', do: [['walk', 'me', 'tv'], ['pose', 'me', 'point', 1.0], ['emote', 'me', '📺'], ['sound', 'boing'], ['pose', 'dad', 'facepalm', 1.4]], result: 'Click click click! The TV is now in Japanese and very LOUD. 😈', stats: { smarts: 4 }, love: { dad: -3 }, highlight: 'Took your first steps (straight to the TV)' },
      { funny: 'Walk backwards like a moonwalk', do: [['walk', 'me', [-3.0, 1.2], 0.6], ['pose', 'me', 'silly', 1.5], ['pose', 'dad', 'laugh', 1.5]], result: 'You moonwalk your first steps! Dad films it. It gets 2 million views. 🕺', stats: { happy: 6 }, love: { dad: 5 }, highlight: 'Moonwalked your first steps' },
    ],
  });

  moment({
    id: 'familyCat', ages: [0, 3], scene: 'home', cast: { a: 'pet:cat', mom: 'mom' },
    at: { a: [1.0, 0.6, -1.4], mom: [-1.2, -0.6, 0.6] }, pose: { a: 'sit' },
    text: 'Grandma\'s cat <b>{a}</b> is visiting. It\'s SO fluffy. 🐱',
    choices: [
      { good: 'Pet it gently', do: [['walk', 'me', 'a'], ['pose', 'me', 'give', 1.5], ['pose', 'a', 'happy', 1.5], ['emote', 'a', '💕']], result: 'Purrrrr... the cat loves you. You love the cat. ❤️', stats: { happy: 6 } },
      { evil: 'Pull its tail', do: [['walk', 'me', 'a'], ['pose', 'me', 'give', 0.6], ['emote', 'a', '😾'], ['run', 'a', 'door'], ['pose', 'me', 'evilLaugh', 1.2]], result: 'MRRROOOW! The cat runs away. It will never trust you again. 😈', stats: { happy: 3 }, love: { mom: -3 } },
      { funny: 'Meow at it', do: [['say', 'me', 'MEOW!'], ['say', 'a', 'Meow?'], ['say', 'me', 'MEOW MEOW!'], ['pose', 'mom', 'laugh', 1.4]], result: 'You and the cat have a very serious meow conversation. 🤡', stats: { happy: 5 } },
    ],
  });

  moment({
    id: 'napTime', ages: [1, 3], scene: 'nursery', cast: { dad: 'dad' },
    at: { me: 'crib', dad: [-1.0, -1.4, -2.3] }, pose: { me: 'babysit' },
    start: [['spawn', 'teddy', [-2.3, -2.2, 0, 0.47], 'ted']],
    text: '💤 NAP TIME! Dad puts you in your crib. "Sleep tight, little one."',
    choices: [
      { good: 'Close your eyes and sleep', do: [['pose', 'me', 'sleep'], ['zzz', 'me'], ['pose', 'dad', 'clap', 1]], result: 'You sleep like an angel. Dad finally gets to drink his coffee. ☕', stats: { health: 6 }, love: { dad: 4 } },
      { evil: 'Throw your teddy out of the crib', do: [['remove', 'ted'], ['throw', 'me', 'dad', 'teddy'], ['pose', 'me', 'yell', 1.2], ['pose', 'dad', 'facepalm', 1.4]], result: 'BONK! Teddy hits Dad on the head. Nap time is CANCELLED. 😈', stats: { happy: 3 }, love: { dad: -4 } },
      { funny: 'Sing a loud baby song', do: [['pose', 'me', 'sing', 2.2], ['say', 'me', 'LA LA LAAAA 🎵'], ['pose', 'dad', 'laugh', 1.4]], result: 'You sing the song of your people: "Goo goo GAAAA!" Dad joins in. 🎶', stats: { happy: 5 }, love: { dad: 3 } },
    ],
  });

  moment({
    id: 'shareBlocks', ages: [2, 3], scene: 'nursery', cast: { sib: 'sib' }, need: () => has('sib'),
    at: { sib: [1.4, 0.8, -1.5] },
    start: [['spawn', 'blocks', [0.6, 0.8], 'blk']],
    text: 'Your {sibRel} <b>{sib}</b> wants to play with YOUR blocks. 🧱',
    choices: [
      { good: 'Share them', do: [['walk', 'me', [0.2, 0.8]], ['pose', 'me', 'give', 1], ['pose', 'sib', 'cheer', 1.4]], result: 'You build the tallest tower in the world together! 🏰', stats: { happy: 5 }, love: { sib: 8 } },
      { evil: 'Knock their tower down', do: [['run', 'me', 'sib'], ['pose', 'me', 'kick', 0.8], ['emote', 'sib', '😭'], ['pose', 'sib', 'cry', 1.6]], result: 'CRASH! 😈 Your {sibRel} cries. You feel very powerful.', stats: { happy: 3 }, love: { sib: -8 } },
      { funny: 'Put a block on your head like a hat', do: [['pose', 'me', 'silly', 1.6], ['emote', 'me', '🎩'], ['pose', 'sib', 'laugh', 1.4]], result: 'You wear the block like a fancy hat. "I am the KING!" 👑 🤡', stats: { happy: 5 }, love: { sib: 4 } },
    ],
  });

  moment({
    id: 'babyDoctor', ages: [1, 3], scene: 'hospital', cast: { doctor: 'new:doctor', mom: 'mom' },
    at: { me: [-1.2, -1.4, 0, 0.75], mom: [-2.9, -0.6, 1.2] }, pose: { me: 'babysit' },
    text: 'Checkup time at the doctor! 🩺 Dr. <b>{doctor}</b> needs to give you a little shot.',
    choices: [
      { good: 'Be super brave', do: [['walk', 'doctor', [-0.4, -1.4]], ['pose', 'doctor', 'give', 1], ['emote', 'me', '💪'], ['pose', 'mom', 'clap', 1.2]], result: 'You didn\'t even cry! The doctor gives you a sticker: "BRAVEST BABY". 🏅', stats: { health: 8 }, love: { mom: 4 } },
      { evil: 'Kick the doctor', do: [['walk', 'doctor', [-0.4, -1.4]], ['pose', 'me', 'angry', 0.8], ['emote', 'doctor', '💥'], ['pose', 'doctor', 'facepalm', 1.4]], result: 'Right in the knee! The doctor hops around. You still get the shot. 😈', stats: { health: 5 } },
      { funny: 'Laugh at the funny stethoscope', do: [['pose', 'me', 'laugh', 1.8], ['pose', 'doctor', 'laugh', 1.4]], result: 'You laugh so much you don\'t even notice the shot. Done! 🤡', stats: { health: 5, happy: 4 } },
    ],
  });

  moment({
    id: 'bathtime', ages: [1, 3], scene: 'home', cast: { dad: 'dad' },
    at: { dad: [1.0, 0.5, -1.4] },
    text: 'Dad says: "BATH TIME!" 🛁 You are covered in chocolate pudding.',
    choices: [
      { good: 'Go to the bath nicely', do: [['walk', 'me', 'dad'], ['pose', 'dad', 'hug', 1], ['emote', 'me', '🫧']], result: 'Bubbles everywhere! You smell like strawberries now. 🍓', stats: { health: 4, looks: 3 }, love: { dad: 4 } },
      { evil: 'Run around the house NAKED', do: [['run', 'me', 'kitchen'], ['run', 'me', 'door'], ['run', 'me', 'b'], ['emote', 'dad', '😫'], ['run', 'dad', 'me']], result: 'You run through the house like a tiny tornado! Dad catches you 10 minutes later. 😈', stats: { health: 3, happy: 5 }, love: { dad: -3 } },
      { funny: 'Pretend to be a duck', do: [['say', 'me', 'QUACK QUACK!'], ['pose', 'me', 'silly', 1.6], ['pose', 'dad', 'laugh', 1.2]], result: 'You waddle to the bath going QUACK. Best bath ever. 🦆', stats: { happy: 5 }, love: { dad: 3 } },
    ],
  });

  // ============================================================
  //  🧒 KID (4 - 12)
  // ============================================================
  moment({
    id: 'firstDaySchool', ages: [5, 5], always: true, scene: 'classroom', cast: { teacher: 'new:teacher', a: 'new:kid', b: 'new:kid', c: 'new:kid' },
    at: { me: 'stand', a: 'a', b: 'b', c: 'c' }, pose: { a: 'sit', b: 'sit', c: 'sit' }, sceneOpt: { lines: ['Welcome, class! :)', 'My name is...'] },
    start: [['walk', 'me', 'front'], ['face', 'me', 'b'], ['cam', 'close', 'me']],
    text: '🏫 FIRST DAY OF SCHOOL! Your teacher, <b>{teacher}</b>, says: "Please tell the class about yourself!" Everyone is looking at you...',
    choices: [
      { good: 'Say hi and tell them you like making friends', do: [['say', 'me', 'Hi! I\'m {me} and I want to be friends with everyone!'], ['pose', 'a', 'clap', 1.2], ['pose', 'b', 'clap', 1.2]], result: 'Everybody smiles. <b>{a}</b> wants to sit next to you! 😇', stats: { happy: 6 }, friend: 'a', highlight: 'First day of school' },
      { evil: 'Say "I will RULE this school!"', do: [['say', 'me', 'I am {me} and I will RULE THIS SCHOOL!'], ['pose', 'me', 'evilLaugh', 1.6], ['emote', 'a', '😨'], ['emote', 'b', '😨']], result: 'The class goes very quiet. <b>{teacher}</b> writes something in a little notebook. 😈', stats: { happy: 4 }, highlight: 'First day of school (you said you would rule it)' },
      { funny: 'Do the chicken dance', do: [['say', 'me', 'BAWK BAWK!'], ['pose', 'me', 'silly', 2.2], ['pose', 'a', 'laugh', 1.6], ['pose', 'c', 'laugh', 1.6]], result: 'The whole class is laughing. You are famous now! 🐔', stats: { happy: 6 }, friend: 'c', highlight: 'Did the chicken dance on day one' },
    ],
  });

  moment({
    id: 'bully', ages: [6, 11], scene: 'playground', cast: { bully: 'new:bully', a: 'new:kid' },
    at: { bully: [1.8, 0.2, -1.2], a: [2.8, 0.4, 1.4] },
    start: [['spawn', 'ball', [2.4, 0.3], 'ball'], ['pose', 'bully', 'smug'], ['pose', 'a', 'sad']],
    text: '😠 At recess, a big kid named <b>{bully}</b> takes the ball from little <b>{a}</b>. "MY ball now!"',
    choices: [
      { good: 'Tell {bully} to give it back', do: [['walk', 'me', 'bully'], ['say', 'me', 'Hey! Give it back, that\'s not nice!']],
        luck: [
          { chance: 0.6, do: [['pose', 'bully', 'shrug', 1.2], ['say', 'bully', 'Ugh... fine.'], ['leave', 'bully'], ['pose', 'a', 'cheer', 1.2]], result: 'It worked! {bully} walks away. <b>{a}</b> thinks you are a HERO. 🦸', friend: 'a', stats: { happy: 6 } },
          { chance: 0.4, do: [['pose', 'bully', 'angry', 1], ['emote', 'me', '💥'], ['pose', 'me', 'fall', 1.6], ['pose', 'me', 'stand']], result: 'BONK! {bully} pushes you over. But <b>{a}</b> helps you up. "Thanks for trying!" 🤕', friend: 'a', stats: { health: -5 } },
        ] },
      { evil: 'Help {bully} and laugh at {a}', do: [['walk', 'me', 'bully'], ['pose', 'me', 'evilLaugh', 1.4], ['pose', 'bully', 'laugh', 1.4], ['pose', 'a', 'cry', 1.6]], result: 'You and {bully} are a team now. Nobody else wants to play with you. 😈', stats: { happy: 2 }, friend: 'bully' },
      { funny: 'Make everyone laugh at {bully}', do: [['say', 'me', 'Hey everyone! {bully} plays with balls because he\'s afraid of DOLLS!'], ['pose', 'a', 'laugh', 1.4], ['pose', 'bully', 'facepalm', 1.4], ['leave', 'bully']], result: 'Everyone laughs. {bully} drops the ball and runs off, embarrassed. 🤡', stats: { happy: 5 }, friend: 'a' },
      { only: 'evil', evil: 'Scare {bully} away with your evil stare', do: [['walk', 'me', 'bully'], ['pose', 'me', 'angry', 1], ['emote', 'bully', '😱'], ['pose', 'bully', 'scared', 0.8], ['run', 'bully', 'far'], ['pose', 'me', 'evilLaugh', 1.2]], result: 'Even bullies are scared of YOU. {a} gets the ball back... and is a little scared too. 😈', stats: { happy: 6 } },
    ],
  });

  moment({
    id: 'mathTest', ages: [6, 12], repeat: 3, scene: 'classroom', cast: { teacher: 'new:teacher', a: 'new:kid', b: 'new:kid' },
    at: { me: 'mySeat', a: 'a', b: 'b' }, pose: { me: 'sit', a: 'sit', b: 'sit' }, sceneOpt: { lines: ['MATH TEST', '7 x 8 = ?', 'No talking!'] },
    start: [['pose', 'me', 'read'], ['pose', 'a', 'read'], ['cam', 'close', 'me']],
    text: '📝 MATH TEST! Question 1: what is 7 × 8? Your brain is empty. <b>{a}</b> is sitting right next to you...',
    choices: [
      { good: 'Think really hard', do: [['pose', 'me', 'think', 2], ['emote', 'me', '💡']],
        luck: [
          { chance: (l) => 0.3 + l.stats.smarts / 140, result: 'It\'s 56! You get an A+! 🌟 Your teacher puts your test on the wall.', stats: { smarts: 6, happy: 4 }, highlight: 'Got an A+ on a math test' },
          { chance: 1, result: 'You write 78. Oops. You get a C. But at least it\'s YOUR C. 😅', stats: { smarts: 3 } },
        ] },
      { evil: 'Copy from {a}', do: [['sneak', 'me', [0.75, 0.6]], ['pose', 'me', 'sneak', 1], ['emote', 'teacher', '👀']],
        luck: [
          { chance: 0.5, do: [['walk', 'me', 'mySeat'], ['pose', 'me', 'smug', 1]], result: 'You copy everything and get an A! Nobody saw. 😈', stats: { smarts: -1, happy: 4 } },
          { chance: 0.5, do: [['walk', 'teacher', [-0.2, 0.9]], ['say', 'teacher', '{me}! I SAW THAT!'], ['pose', 'me', 'scared', 1.2]], result: 'CAUGHT! You get a zero AND detention. 😬', stats: { smarts: -2, happy: -6 } },
        ] },
      { funny: 'Draw a funny face on the test', do: [['pose', 'me', 'type', 1.6], ['emote', 'me', '✏️'], ['emote', 'teacher', '🤨']], result: 'You draw your teacher as a potato. You get an F... but the teacher secretly keeps the drawing. 🥔', stats: { happy: 6, smarts: -1 } },
    ],
  });

  moment({
    id: 'lostDog', ages: [5, 12], scene: 'park', cast: { dog: 'pet:dog', lady: 'new:lady' },
    at: { dog: [1.6, 0.4, -1.2], lady: 'far' }, hidden: ['lady'], pose: { dog: 'sit' },
    start: [['emote', 'dog', '🥺']],
    text: '🐶 A little puppy is sitting all alone in the park. It has a collar that says <b>"{dog}"</b>. It looks lost and sad.',
    choices: [
      { good: 'Find its owner', do: [['walk', 'me', 'dog'], ['pose', 'me', 'kneel', 1], ['pose', 'dog', 'happy'], ['show', 'lady'], ['run', 'lady', [-0.4, 0.8]], ['say', 'lady', '{dog}! My baby! Thank you SO much!'], ['give', 'lady', 'me', 'money']], result: 'The owner, <b>{lady}</b>, gives you $20 as a thank you! 💵 😇', stats: { happy: 8, money: 20 }, friend: 'lady' },
      { evil: 'Tell it to go away', do: [['walk', 'me', 'dog'], ['say', 'me', 'Shoo! Go away!'], ['emote', 'dog', '😢'], ['walk', 'dog', 'door']], result: 'The puppy walks away slowly. Even the ducks look at you like you\'re mean. 😈', stats: { happy: 1 } },
      { funny: 'Bark at it', do: [['say', 'me', 'WOOF WOOF!'], ['say', 'dog', 'WOOF!'], ['pose', 'dog', 'happy'], ['run', 'dog', 'c'], ['run', 'me', 'c']], result: 'You and the puppy have a barking contest. The puppy wins. 🐕 🤡', stats: { happy: 7 } },
    ],
  });

  moment({
    id: 'birthdayParty', ages: [5, 10], scene: 'home', sceneOpt: { party: true }, cast: { a: 'friend', mom: 'mom' },
    at: { a: [1.3, 0.6, -1.4], mom: [-1.3, -0.3, 0.8] },
    start: [['give', 'a', 'me', 'gift']],
    text: '🎉 It\'s your friend party! <b>{a}</b> gives you a present. You open it... it\'s a pair of SOCKS. 🧦',
    choices: [
      { good: 'Say "Thank you, I love them!"', do: [['say', 'me', 'Thank you! I LOVE socks!'], ['pose', 'me', 'hug', 1.2], ['emote', 'a', '🥰']], result: '{a} is so happy. Good friends are better than any present. 😇', stats: { happy: 5 }, friend: 'a', love: { a: 10 } },
      { evil: 'Say "This present is LAME!"', do: [['say', 'me', 'Socks?! This present is LAME!'], ['throw', 'me', 'a', 'gift'], ['pose', 'a', 'cry', 1.6]], result: '{a} goes home crying. Mom is VERY embarrassed. 😈', stats: { happy: 2 }, love: { mom: -6 }, unfriend: 'a' },
      { funny: 'Put the socks on your hands and do a puppet show', do: [['pose', 'me', 'silly', 1], ['say', 'me', 'Hello, I am Mister Sock!'], ['pose', 'a', 'laugh', 1.6], ['pose', 'mom', 'laugh', 1.6]], result: 'Mister Sock is the star of the party! 🧦🎭', stats: { happy: 7 }, friend: 'a', love: { a: 6 } },
    ],
  });

  moment({
    id: 'pocketMoney', ages: [6, 12], scene: 'home', cast: { dad: 'dad' },
    at: { dad: [1.2, 0.5, -1.4] },
    start: [['give', 'dad', 'me', 'money']],
    text: '💵 Dad gives you $10! "Spend it wisely, kiddo."',
    choices: [
      { good: 'Save it in your piggy bank', do: [['emote', 'me', '🐷'], ['pose', 'dad', 'clap', 1.2]], result: 'Clink! Smart choice. Rich people start with piggy banks. 💰', stats: { money: 10, smarts: 3 }, love: { dad: 4 } },
      { evil: 'Buy a mountain of candy and don\'t share', do: [['pose', 'me', 'eatStand', 2], ['emote', 'me', '🍬'], ['pose', 'me', 'evilLaugh', 1]], result: 'You eat ALL the candy. You feel amazing... then you feel sick. 🤢 😈', stats: { happy: 5, health: -5 } },
      { funny: 'Throw it in the air like a millionaire', do: [['pose', 'me', 'cheer', 1.6], ['say', 'me', 'I\'M RICH!'], ['confetti', 'me'], ['pose', 'dad', 'laugh', 1.2]], result: 'The money flies everywhere! It takes 20 minutes to find it. 🤡', stats: { happy: 5, money: 10 } },
    ],
  });

  moment({
    id: 'cookieJar', ages: [4, 9], scene: 'home', cast: { mom: 'mom' },
    at: { mom: [-0.8, -1.0, 0.6] },
    start: [['say', 'mom', 'NO cookies before dinner!'], ['leave', 'mom']],
    text: '🍪 Mom said NO COOKIES before dinner. Then she leaves the kitchen... The cookie jar is RIGHT THERE.',
    choices: [
      { good: 'Wait for dinner', do: [['pose', 'me', 'sit', 1.5], ['emote', 'me', '⏳'], ['enter', 'mom', 'door', [-0.8, -0.2]], ['give', 'mom', 'me', 'cookie']], result: 'Mom is so proud she gives you TWO cookies after dinner! 🍪🍪 😇', stats: { happy: 4, health: 2 }, love: { mom: 6 } },
      { evil: 'Sneak one cookie', do: [['sneak', 'me', 'kitchen'], ['face', 'me', [-3.8, -3]], ['pose', 'me', 'eatStand', 1.4], ['emote', 'me', '😏']], result: 'Nobody saw you. The perfect crime. 😈', stats: { happy: 4 } },
      { funny: 'Ask the cookie jar for permission', do: [['walk', 'me', 'kitchen'], ['say', 'me', 'Excuse me, Mr. Jar... may I?'], ['say', 'me', '(in a jar voice) Yes you may!'], ['pose', 'me', 'eatStand', 1.2]], result: 'The cookie jar said yes, so it\'s not stealing. That\'s the rule! 🤡', stats: { happy: 5 } },
      { only: 'evil', evil: 'Steal the WHOLE jar and blame the dog', do: [['sneak', 'me', 'kitchen'], ['emote', 'me', '🫙'], ['run', 'me', 'door'], ['pose', 'me', 'evilLaugh', 1.4]], result: 'You hide 47 cookies under your bed. The dog gets in trouble. You don\'t even HAVE a dog. 😈😈', stats: { happy: 8, health: -3 }, power: 2 },
    ],
  });

  moment({
    id: 'kittenSlide', ages: [5, 11], scene: 'playground', cast: { kit: 'pet:cat', a: 'new:kid' },
    at: { kit: 'slideTop', a: [-1.8, 0.4, 0.6] }, pose: { kit: 'sit' },
    start: [['emote', 'kit', '😿'], ['say', 'kit', 'Mew... mew...']],
    text: '🐱 A tiny kitten is stuck at the top of the slide and is too scared to come down!',
    choices: [
      { good: 'Climb up and save it', do: [['walk', 'me', [3.6, -2.6]], ['jump', 'me'], ['pose', 'me', 'hug', 1.2], ['walk', 'kit', 'slideEnd'], ['pose', 'kit', 'happy', 1.4], ['pose', 'a', 'clap', 1.4]], result: 'You are a HERO! The kitten licks your nose. 😇', stats: { happy: 7 }, friend: 'a', highlight: 'Saved a kitten' },
      { evil: 'Laugh at the scaredy-cat', do: [['walk', 'me', 'slideEnd'], ['pose', 'me', 'evilLaugh', 1.6], ['emote', 'a', '😠']], result: 'You laugh until a teacher comes and saves the kitten. Everyone thinks you\'re mean. 😈', stats: { happy: 2 } },
      { funny: 'Show it how to slide by sliding yourself', do: [['walk', 'me', [3.6, -2.6]], ['jump', 'me'], ['walk', 'me', 'slideEnd', 2.4], ['pose', 'me', 'cheer', 1], ['walk', 'kit', 'slideEnd', 2.4], ['pose', 'a', 'laugh', 1.4]], result: 'WHEEE! The kitten copies you and slides down! Best day EVER. 🤡', stats: { happy: 8 }, friend: 'a' },
      { only: 'good', good: 'Adopt the kitten and take it home', need: (l) => !l.pets.length, do: [['walk', 'me', [3.6, -2.6]], ['pose', 'me', 'hug', 1.2], ['walk', 'kit', 'slideEnd'], ['emote', 'kit', '💕']], result: 'Mom and Dad say YES! The kitten is yours now! 🐱💕', stats: { happy: 10 }, run: (l, api) => api.addPet('cat', api.cast.kit.name, api.cast.kit.color), power: 2 },
    ],
  });

  moment({
    id: 'teacherLeaves', ages: [7, 12], scene: 'classroom', cast: { teacher: 'new:teacher', a: 'new:kid', b: 'new:kid' },
    at: { me: 'mySeat', a: 'a', b: 'b' }, pose: { me: 'sit', a: 'sit', b: 'sit' },
    start: [['say', 'teacher', 'I\'ll be back in 5 minutes. Be GOOD!'], ['leave', 'teacher']],
    text: '🚪 The teacher leaves the classroom for 5 minutes. The whole class looks at each other...',
    choices: [
      { good: 'Clean the board as a surprise', do: [['walk', 'me', 'board'], ['pose', 'me', 'sweep', 2], ['enter', 'teacher', 'door', 'teacher'], ['say', 'teacher', 'Oh! Who cleaned the board? Thank you!']], result: 'The teacher gives you a gold star! ⭐ 😇', stats: { smarts: 3, happy: 4 } },
      { evil: 'Write "TEACHER IS A POTATO" on the board', do: [['walk', 'me', 'board'], ['pose', 'me', 'type', 1.6], ['pose', 'a', 'laugh', 1.4], ['enter', 'teacher', 'door', 'teacher'], ['pose', 'teacher', 'angry', 1.6]], result: 'The teacher reads it out loud. Detention for a WEEK. Worth it? 😈', stats: { happy: 4, smarts: -2 } },
      { funny: 'Do an impression of the teacher', do: [['walk', 'me', 'front'], ['say', 'me', '"Be GOOD, class! Blah blah blah!"'], ['pose', 'me', 'silly', 1.4], ['pose', 'a', 'laugh', 1.6], ['pose', 'b', 'laugh', 1.6]], result: 'The class LOVES it. You do the impression every day now. 🤡', stats: { happy: 6 }, friend: 'b' },
      { only: 'funny', funny: 'Put a whoopee cushion on the teacher\'s chair', do: [['sneak', 'me', [-4.0, -1.5]], ['emote', 'me', '🎈'], ['walk', 'me', 'mySeat'], ['enter', 'teacher', 'door', 'teacher'], ['pose', 'teacher', 'sit', 0.6], ['sound', 'fart'], ['emote', 'teacher', '😳'], ['pose', 'a', 'laugh', 2], ['pose', 'b', 'laugh', 2]], result: 'PFFFRRRTTT! 💨 The class laughs for 10 MINUTES. Even the teacher smiles a little. 🤡🤡', stats: { happy: 10 }, power: 2, highlight: 'The legendary whoopee cushion prank' },
    ],
  });

  moment({
    id: 'newKid', ages: [6, 12], scene: 'playground', cast: { a: 'new:kid', b: 'new:kid' },
    at: { a: [2.6, -0.4, -0.8], b: [-2.2, -1.2, 0.6] },
    start: [['pose', 'a', 'sad']],
    text: '🙁 There\'s a new kid at school, <b>{a}</b>. Nobody is playing with them.',
    choices: [
      { good: 'Ask {a} to play with you', do: [['walk', 'me', 'a'], ['say', 'me', 'Hi! Want to play tag with me?'], ['pose', 'a', 'cheer', 1.2], ['run', 'a', 'b'], ['run', 'me', 'b']], result: 'You play tag all recess. {a} is your new best friend! 🤝', stats: { happy: 6 }, friend: 'a', love: { a: 20 } },
      { evil: 'Point and laugh', do: [['walk', 'me', [1.2, 0.2]], ['pose', 'me', 'point', 1], ['pose', 'me', 'laugh', 1.2], ['pose', 'a', 'cry', 1.6]], result: '{a} has a terrible first day. Karma is watching you... 😈', stats: { happy: 2 } },
      { funny: 'Try to juggle for them', do: [['walk', 'me', 'a'], ['pose', 'me', 'silly', 1.2], ['emote', 'me', '🤹'], ['pose', 'me', 'fall', 1.2], ['pose', 'a', 'laugh', 1.6]], result: 'You drop everything and fall over. {a} laughs for the first time today. 🤡', stats: { happy: 5 }, friend: 'a' },
    ],
  });

  moment({
    id: 'remote', ages: [4, 12], scene: 'home', cast: { sib: 'sib' }, need: () => has('sib'),
    at: { me: 'sofaL', sib: 'sofaR' }, pose: { me: 'sit', sib: 'sit' },
    start: [['cam', 'both', 'me', 'sib']],
    text: '📺 You\'re watching your favorite show... and <b>{sib}</b> grabs the remote and changes the channel!',
    choices: [
      { good: 'Let them watch their show', do: [['say', 'me', 'It\'s okay, you can pick!'], ['pose', 'sib', 'hug', 1.2]], result: 'Your {sibRel} is surprised. "Thanks! You\'re the best!" 😇', stats: { happy: 2 }, love: { sib: 10 } },
      { evil: 'Hide the remote in the fridge', do: [['pose', 'me', 'stand'], ['walk', 'me', 'fridge'], ['emote', 'me', '🧊'], ['walk', 'me', 'sofaL'], ['pose', 'me', 'evilLaugh', 1.4], ['pose', 'sib', 'angry', 1.4]], result: 'Nobody can watch TV now. Nobody finds the remote for 3 weeks. 😈', stats: { happy: 4 }, love: { sib: -8 } },
      { funny: 'Make all the TV sounds yourself', do: [['say', 'me', 'BZZZT! And now... THE NEWS! The cat is the new king!'], ['pose', 'sib', 'laugh', 1.6]], result: 'Your TV show is better than the real TV. 📺🤡', stats: { happy: 5 }, love: { sib: 5 } },
    ],
  });

  moment({
    id: 'brokenPlant', ages: [6, 12], scene: 'home', cast: { mom: 'mom' }, hidden: ['mom'],
    at: { mom: 'door' },
    start: [['spawn', 'ball', [0.4, 0.4], 'ball'], ['emote', 'me', '⚽'], ['throw', 'me', [-0.7, -2.8], 'ball', false], ['sound', 'splat'], ['emote', 'me', '😱']],
    text: '💥 CRASH! You were playing ball inside... and you broke Mom\'s favorite lamp! You hear her footsteps coming...',
    choices: [
      { good: 'Tell the truth', do: [['enter', 'mom', 'door', 'a'], ['say', 'me', 'Mom... I broke your lamp. I\'m sorry.'], ['pose', 'mom', 'think', 1], ['pose', 'mom', 'hug', 1.2]], result: '"Thank you for being honest. That\'s more important than a lamp." 😇', stats: { happy: 3 }, love: { mom: 6 } },
      { evil: 'Blame it on a ghost', need: () => true, do: [['enter', 'mom', 'door', 'a'], ['say', 'me', 'It was a GHOST! I saw it!'], ['pose', 'mom', 'facepalm', 1.4]],
        luck: [
          { chance: 0.3, result: 'Mom actually believes you. She calls a ghost hunter. 👻 😈', stats: { happy: 6 } },
          { chance: 0.7, result: 'Mom does NOT believe you. No video games for a week! 😈', stats: { happy: -4 }, love: { mom: -6 } },
        ] },
      { funny: 'Pretend you are the lamp', do: [['pose', 'me', 'cheer'], ['enter', 'mom', 'door', 'a'], ['say', 'me', 'I am... a lamp. Click.'], ['pose', 'mom', 'laugh', 1.6], ['pose', 'me', 'stand']], result: 'Mom laughs so hard she forgets to be mad. 🤡💡', stats: { happy: 5 }, love: { mom: 2 } },
    ],
  });

  moment({
    id: 'raceDay', ages: [7, 12], scene: 'playground', cast: { a: 'new:kid', b: 'new:kid' },
    at: { me: [-4.5, 1.6, 1.57], a: [-4.5, 0.6, 1.57], b: [-4.5, -0.4, 1.57] },
    start: [['say', 'b', 'Ready... set... GO!']],
    text: '🏃 SPORTS DAY! It\'s the big race! You are running really fast... and <b>{a}</b> trips and falls next to you!',
    choices: [
      { good: 'Stop and help {a} up', do: [['together', [['run', 'me', [0, 1.6]]], [['run', 'a', [-0.6, 0.6]], ['pose', 'a', 'fall']]], ['walk', 'me', 'a'], ['pose', 'me', 'give', 1], ['pose', 'a', 'stand'], ['walk', 'a', [5, 0.6]], ['walk', 'me', [5, 1.6]]], result: 'You come last... but the whole school claps for YOU. 👏 😇', stats: { happy: 6, health: 3 }, friend: 'a', highlight: 'Helped a kid in the big race' },
      { evil: 'Trip {b} too and WIN', do: [['together', [['run', 'me', [5, 1.6]]], [['run', 'a', [-0.6, 0.6]], ['pose', 'a', 'fall']], [['run', 'b', [1, -0.4]], ['pose', 'b', 'fall']]], ['pose', 'me', 'flex', 1.6]], result: 'You WIN! 🏆 Then a teacher watches the video. You lose the medal. 😈', stats: { health: 4, happy: 2 } },
      { funny: 'Run in slow motion', do: [['together', [['walk', 'me', [3, 1.6], 0.5]], [['run', 'b', [5, -0.4]]]], ['say', 'me', 'Nooooo... I\'m... sooo... faaast...'], ['pose', 'b', 'laugh', 1.4]], result: 'Everyone is laughing too hard to run. It\'s a tie! 🐢 🤡', stats: { happy: 6, health: 2 } },
    ],
  });

  moment({
    id: 'scienceFair', ages: [8, 12], scene: 'classroom', cast: { teacher: 'new:teacher', a: 'new:kid' },
    at: { me: [0.2, 0.8, 0], a: [2.2, 0.9, -0.3] }, sceneOpt: { lines: ['SCIENCE FAIR', 'Volcanoes!', 'Be careful :)'] },
    start: [['spawn', 'jar', [0.2, 0.0, 0, 0.62], 'volcano']],
    text: '🌋 SCIENCE FAIR! You made a baking soda volcano. The teacher is coming to look...',
    choices: [
      { good: 'Explain how it works, step by step', do: [['say', 'me', 'Baking soda + vinegar = carbon dioxide gas!'], ['confetti', 'volcano'], ['pose', 'teacher', 'clap', 1.4]], result: 'FIRST PRIZE! 🥇 You are a real scientist!', stats: { smarts: 8, happy: 4 }, highlight: 'Won the science fair' },
      { evil: 'Secretly break {a}\'s project', do: [['sneak', 'me', 'a'], ['pose', 'me', 'kick', 0.8], ['emote', 'a', '😭'], ['pose', 'a', 'cry', 1.4]], result: 'You win second place. {a} cries. Science is supposed to be fun... 😈', stats: { smarts: 2 } },
      { funny: 'Add WAY too much vinegar', do: [['pose', 'me', 'give', 1], ['shake', 0.8], ['confetti', 'volcano'], ['emote', 'teacher', '🌋'], ['pose', 'teacher', 'scared', 1.4], ['pose', 'a', 'laugh', 1.4]], result: 'KABOOOOM! The volcano covers the teacher in foam. Best science fair ever! 🤡', stats: { happy: 8, smarts: 3 } },
    ],
  });

  moment({
    id: 'iceCream', ages: [4, 10], scene: 'street', cast: { a: 'new:kid', b: 'new:kid' },
    at: { a: [1.2, 1.0, -1.5], b: [2.6, 1.6, -1.5] },
    start: [['hold', 'a', 'icecream'], ['pose', 'a', 'eatStand', 1.2]],
    text: '🍦 It\'s super hot outside. A little kid named <b>{a}</b> has the BIGGEST ice cream you\'ve ever seen.',
    choices: [
      { good: 'Buy ice creams for you and {b}', cost: 6, do: [['hold', 'me', 'icecream'], ['walk', 'me', 'b'], ['give', 'me', 'b', 'icecream'], ['pose', 'b', 'cheer', 1.2]], result: '{b} is so happy! Sharing is caring. 🍦🍦 😇', stats: { happy: 6 }, friend: 'b' },
      { evil: 'Steal {a}\'s ice cream', do: [['run', 'me', 'a'], ['drop', 'a'], ['hold', 'me', 'icecream'], ['pose', 'a', 'cry', 1.6], ['run', 'me', 'far']], result: 'You run off with the ice cream. It melts on your shirt. Karma! 😈', stats: { happy: 4, looks: -2 } },
      { funny: 'Put your face in a puddle to cool down', do: [['pose', 'me', 'kneel', 1.2], ['emote', 'me', '💦'], ['pose', 'me', 'silly', 1.2], ['pose', 'a', 'laugh', 1.4]], result: 'The kids think you are the weirdest, funniest kid in the city. 🤡', stats: { happy: 5 }, friend: 'a' },
    ],
  });

  moment({
    id: 'sleepover', ages: [8, 12], scene: 'bedroom', cast: { a: 'friend' },
    at: { me: 'bedSit', a: [-0.8, -0.4, -1.2] }, pose: { me: 'sit', a: 'babysit' },
    start: [['cam', 'both', 'me', 'a']],
    text: '🌙 SLEEPOVER! <b>{a}</b> is staying at your house tonight. It\'s midnight and you\'re both still awake...',
    choices: [
      { good: 'Tell a nice story about two best friends', do: [['say', 'me', 'Once upon a time, there were two best friends...'], ['pose', 'a', 'sleep'], ['zzz', 'a']], result: '{a} falls asleep smiling. You will be friends forever. 😇', stats: { happy: 5 }, friend: 'a', love: { a: 12 } },
      { evil: 'Tell the SCARIEST ghost story', do: [['say', 'me', '...and the ghost was RIGHT BEHIND YOU!'], ['shake', 0.4], ['pose', 'a', 'scared', 1.8], ['pose', 'me', 'evilLaugh', 1.4]], result: '{a} sleeps with the lights on for a month. 👻 😈', stats: { happy: 6 }, love: { a: -5 } },
      { funny: 'Start a PILLOW FIGHT', do: [['pose', 'me', 'stand'], ['throw', 'me', 'a', 'gift'], ['throw', 'a', 'me', 'gift'], ['pose', 'me', 'laugh', 1.2], ['pose', 'a', 'laugh', 1.2]], result: 'Feathers EVERYWHERE! Your parents yell "GO TO SLEEP!" 🪶🤡', stats: { happy: 8 }, friend: 'a', love: { a: 8 } },
    ],
  });

  moment({
    id: 'bikeGift', ages: [6, 10], scene: 'street', cast: { dad: 'dad', bike: 'car:bike' }, car: false,
    at: { bike: [1.4, 0.6, -1.1], dad: [2.6, 1.6, -1.2] }, need: (l) => !l.cars.some((c) => c.kind === 'bike'),
    text: '🚲 SURPRISE! Dad got you a shiny new BIKE!',
    choices: [
      { good: 'Hug Dad and ride carefully', do: [['walk', 'me', 'dad'], ['pose', 'me', 'hug', 1.2], ['ride', 'me', 'bike'], ['drive', 'bike', [5, 1.2], 2]], result: 'You ride around the block like a pro! 😇', stats: { happy: 8, health: 3 }, love: { dad: 8 }, run: (l, api) => api.addCar('bike'), highlight: 'Got your first bike' },
      { evil: '"Only ONE bike? I wanted a CAR!"', do: [['say', 'me', 'A bike?! I wanted a CAR!'], ['pose', 'me', 'angry', 1.4], ['pose', 'dad', 'sad', 1.6]], result: 'Dad is sad. You still keep the bike, though. 😈', stats: { happy: 4 }, love: { dad: -8 }, run: (l, api) => api.addCar('bike') },
      { funny: 'Ride it standing on the seat', do: [['ride', 'me', 'bike'], ['pose', 'me', 'cheer'], ['drive', 'bike', [5, 1.2], 2], ['emote', 'me', '🤸'], ['pose', 'dad', 'facepalm', 1.4]], result: 'You are a circus star! Dad buys you a helmet. A BIG helmet. 🪖🤡', stats: { happy: 9, health: -2 }, love: { dad: 3 }, run: (l, api) => api.addCar('bike') },
    ],
  });

  moment({
    id: 'lemonade', ages: [6, 11], scene: 'street', cast: { a: 'new:lady', b: 'new:man' },
    at: { a: 'farR', b: [6, 2.2, -1.5] }, hidden: ['a'],
    start: [['spawn', 'table', [-0.4, 0.5], 'stand'], ['spawn', 'jar', [-0.4, 0.5, 0, 0.77], 'lem'], ['spawn', 'sign', [-0.4, 0.15, 0, 1.15], 'sg', { text: 'LEMONADE 50¢', w: 1.2 }], ['face', 'me', [0, 3]]],
    text: '🍋 You open a LEMONADE STAND! A customer is coming...',
    choices: [
      { good: 'Sell it for a fair price', do: [['show', 'a'], ['walk', 'a', [0.8, 1.2]], ['give', 'me', 'a', 'jar'], ['say', 'a', 'Delicious! Here\'s a tip!']], result: 'Lots of happy customers! You make $15. 🍋 😇', stats: { money: 15, happy: 4, smarts: 2 } },
      { evil: 'Sell it for $50 a cup', do: [['show', 'a'], ['walk', 'a', [0.8, 1.2]], ['say', 'me', 'That will be FIFTY dollars.'], ['emote', 'a', '😤']],
        luck: [
          { chance: 0.25, do: [['give', 'a', 'me', 'money']], result: 'She actually pays! You are a business genius. 💰 😈', stats: { money: 50 } },
          { chance: 0.75, do: [['leave', 'a']], result: 'Nobody buys anything. You drink all the lemonade yourself. 😈', stats: { money: 0, happy: -2 } },
        ] },
      { funny: 'Dance to attract customers', do: [['pose', 'me', 'dance', 2.2], ['show', 'a'], ['walk', 'a', [0.8, 1.2]], ['walk', 'b', [1.8, 1.4]], ['pose', 'a', 'laugh', 1.2], ['pose', 'b', 'clap', 1.2]], result: 'A crowd comes to watch your dance! You make $25! 💃🤡', stats: { money: 25, happy: 6 } },
    ],
  });

  moment({
    id: 'toothFairy', ages: [6, 8], scene: 'bedroom', at: { me: 'bed' }, pose: { me: 'lie' },
    text: '🦷 Your tooth fell out! Tonight the Tooth Fairy is coming...',
    choices: [
      { good: 'Put it under your pillow and sleep', do: [['pose', 'me', 'sleep'], ['zzz', 'me'], ['confetti', 'me']], result: 'In the morning there\'s $5 under your pillow! 🧚 😇', stats: { money: 5, happy: 4 } },
      { evil: 'Put a painted rock instead and keep the tooth', do: [['pose', 'me', 'sneak'], ['emote', 'me', '🪨'], ['pose', 'me', 'sleep'], ['zzz', 'me']],
        luck: [
          { chance: 0.5, result: 'The Tooth Fairy falls for it! $5 AND you keep the tooth. 😈', stats: { money: 5, happy: 5 } },
          { chance: 0.5, result: 'The Tooth Fairy leaves a note: "Nice try." 🧚‍♀️😤 😈', stats: { happy: -2 } },
        ] },
      { funny: 'Stay awake to catch the Tooth Fairy', do: [['pose', 'me', 'sit'], ['emote', 'me', '👀'], ['wait', 1], ['pose', 'me', 'sleep'], ['zzz', 'me']], result: 'You fall asleep after 4 minutes. There\'s $5 AND a drawing of you sleeping with your mouth open. 🤡', stats: { money: 5, happy: 6 } },
    ],
  });

  moment({
    id: 'begPet', ages: [7, 12], scene: 'home', cast: { mom: 'mom', dad: 'dad' }, need: (l) => !l.pets.length,
    at: { mom: [1.0, 0.0, -1.5], dad: [1.8, 0.6, -1.5] },
    text: '🐾 You REALLY want a pet. Mom and Dad are sitting on the sofa looking at you...',
    choices: [
      { good: 'Promise to walk it and feed it every day', do: [['say', 'me', 'I promise I will take care of it every single day!'], ['pose', 'mom', 'think', 1.2], ['pose', 'dad', 'cheer', 1.2]], result: 'They say YES! You get a puppy! 🐶 What a happy day!', stats: { happy: 12 }, love: { mom: 3, dad: 3 }, run: (l, api) => api.addPet('dog', U.pick(ML.Life.PET_NAMES.dog)), highlight: 'Got a puppy' },
      { evil: 'Cry and scream until they say yes', do: [['pose', 'me', 'cry', 1.2], ['pose', 'me', 'yell', 1.2], ['shake', 0.5], ['pose', 'dad', 'facepalm', 1.4]],
        luck: [
          { chance: 0.5, result: 'They give up! You get a cat. 🐱 They are not happy about it. 😈', stats: { happy: 8 }, love: { mom: -6, dad: -6 }, run: (l, api) => api.addPet('cat', U.pick(ML.Life.PET_NAMES.cat)) },
          { chance: 0.5, result: '"NO means NO!" You go to your room with no pet. 😈', stats: { happy: -5 }, love: { mom: -4, dad: -4 } },
        ] },
      { funny: 'Do a 10-slide presentation about parrots', do: [['say', 'me', 'Slide 1: Parrots are AWESOME.'], ['say', 'me', 'Slide 2: They can say BANANA.'], ['pose', 'me', 'point', 1], ['pose', 'mom', 'laugh', 1.4], ['pose', 'dad', 'clap', 1.4]], result: 'It\'s so funny that they say YES! You get a parrot! 🦜🤡', stats: { happy: 12, smarts: 2 }, run: (l, api) => api.addPet('parrot', U.pick(ML.Life.PET_NAMES.parrot)), highlight: 'Got a parrot after a very funny presentation' },
    ],
  });

  // ============================================================
  //  🧑 TEEN (13 - 17)
  // ============================================================
  moment({
    id: 'crush', ages: [13, 16], scene: 'park', cast: { crush: 'new:teen', a: 'friend' },
    at: { crush: [2.2, 0.0, -1.2], a: [-1.6, 1.4, 0.6] },
    start: [['emote', 'me', '😍'], ['hold', 'me', 'card']],
    text: '💌 You have a crush on <b>{crush}</b>! You made a card for them. Your heart is going BOOM BOOM BOOM.',
    choices: [
      { good: 'Give the card and say something nice', do: [['walk', 'me', 'crush'], ['give', 'me', 'crush', 'card'], ['say', 'me', 'I made this for you. I think you\'re really cool!']],
        luck: [
          { chance: 0.6, do: [['emote', 'crush', '😊'], ['pose', 'crush', 'hug', 1.2]], result: '{crush} smiles: "I think you\'re cool too!" 💕 You hang out every day now.', stats: { happy: 10 }, friend: 'crush', love: { crush: 20 }, highlight: 'Gave a card to {crush}' },
          { chance: 0.4, do: [['pose', 'crush', 'shrug', 1.2]], result: '"Thanks... but I just want to be friends." Ouch. But you were brave! 💪', stats: { happy: -3 }, friend: 'crush' },
        ] },
      { evil: 'Pretend you hate them', do: [['walk', 'me', 'crush'], ['say', 'me', 'Ew, why are you even HERE?'], ['pose', 'crush', 'sad', 1.4], ['pose', 'me', 'smug', 1]], result: 'That... did not work. Now {crush} thinks you\'re mean. 😈', stats: { happy: -2 } },
      { funny: 'Read them a poem about pizza', do: [['walk', 'me', 'crush'], ['say', 'me', 'Roses are red, pizza is too... I like pizza, but I like YOU!'], ['pose', 'crush', 'laugh', 1.6]], result: '{crush} laughs SO much. "You\'re the funniest person I know!" 💕🍕', stats: { happy: 9 }, friend: 'crush', love: { crush: 15 } },
    ],
  });

  moment({
    id: 'homework', ages: [13, 17], repeat: 3, scene: 'bedroom',
    at: { me: 'desk' }, pose: { me: 'type' },
    start: [['cam', 'close', 'me']],
    text: '📚 You have a BIG history test tomorrow... but your friends are online playing your favorite game. 🎮',
    choices: [
      { good: 'Study for 3 hours', do: [['pose', 'me', 'read', 2.2], ['emote', 'me', '🧠']], result: 'You get 98%! History is actually kind of cool. 😇', stats: { smarts: 8, happy: -1 } },
      { evil: 'Play games and hack the school website for the answers', do: [['pose', 'me', 'type', 2], ['emote', 'me', '💻']],
        luck: [
          { chance: 0.5, result: 'You find the answers! 100%! Nobody knows... yet. 😈', stats: { smarts: 2, happy: 6 } },
          { chance: 0.5, result: 'The school computer guy catches you. Suspended for 3 days! 😈', stats: { happy: -6, smarts: -2 } },
        ] },
      { funny: 'Make a rap song about history to remember it', do: [['pose', 'me', 'stand'], ['pose', 'me', 'sing', 2.2], ['say', 'me', '🎵 In 1492, Columbus sailed the ocean BLUE! 🎵']], result: 'You get 85% AND your rap gets 10,000 views! 🎤🤡', stats: { smarts: 5, happy: 5 } },
    ],
  });

  moment({
    id: 'firstPhone', ages: [13, 14], scene: 'home', cast: { mom: 'mom', dad: 'dad' },
    at: { mom: [1.0, 0.4, -1.5], dad: [-1.0, 0.4, 1.5] },
    start: [['give', 'mom', 'me', 'phone']],
    text: '📱 Mom and Dad give you your FIRST PHONE! "Use it wisely..."',
    choices: [
      { good: 'Text Grandma "I love you"', do: [['pose', 'me', 'phone', 1.8], ['emote', 'me', '💌']], result: 'Grandma texts back 47 heart emojis. ❤️❤️❤️ 😇', stats: { happy: 5 }, love: { mom: 5, dad: 5 } },
      { evil: 'Prank call the whole school', do: [['pose', 'me', 'phone', 1.8], ['say', 'me', 'Hello? Is your fridge running? Then go CATCH IT!'], ['pose', 'me', 'evilLaugh', 1.2]], result: 'The principal calls your parents. No phone for a month! 😈', stats: { happy: 3 }, love: { mom: -5, dad: -5 } },
      { funny: 'Take 500 selfies with funny faces', do: [['pose', 'me', 'film', 1.4], ['pose', 'me', 'silly', 1.2], ['flash'], ['flash'], ['pose', 'dad', 'laugh', 1.2]], result: 'Your phone memory is full after 1 hour. Worth it. 🤳🤡', stats: { happy: 6, looks: 1 } },
    ],
  });

  moment({
    id: 'talentShow', ages: [13, 17], scene: 'talent', cast: { a: 'friend', b: 'new:teen', c: 'mom' },
    at: { me: 'wing', a: 'seatA', b: 'wing2', c: 'seatB' }, pose: { a: 'sit', c: 'sit' }, react: false,
    start: [['walk', 'me', 'stage'], ['face', 'me', [0, 6]]],
    text: '🎤 TALENT SHOW! You walk onto the stage. The spotlight is on you. Everybody is watching...',
    choices: [
      { good: 'Sing your heart out', do: [['hold', 'me', 'mic'], ['sound', 'song'], ['pose', 'me', 'sing', 3]],
        luck: [
          { chance: (l) => 0.35 + l.stats.looks / 200, do: [['pose', 'a', 'cheer', 1.4], ['confetti', 'me']], result: 'Standing ovation! You WIN the talent show! 🏆', stats: { happy: 10, looks: 3 }, highlight: 'Won the school talent show' },
          { chance: 1, do: [['emote', 'me', '🎵❌'], ['pose', 'a', 'clap', 1.2]], result: 'Your voice cracks on the high note... but everyone claps anyway! 👏', stats: { happy: 3 } },
        ] },
      { evil: 'Trip {b} so they can\'t win', do: [['walk', 'b', [1.2, -2.2]], ['pose', 'me', 'kick', 0.8], ['pose', 'b', 'fall', 1.6], ['pose', 'me', 'evilLaugh', 1.4]], result: 'Everyone saw it. You get BOOED off the stage! 👎😈', stats: { happy: -3 } },
      { funny: 'Do a stand-up comedy show', do: [['hold', 'me', 'mic'], ['say', 'me', 'Why did the teacher wear sunglasses? Because her students were SO BRIGHT!'], ['pose', 'a', 'laugh', 1.6], ['pose', 'c', 'laugh', 1.6], ['confetti', 'me']], result: 'The crowd goes WILD! You win "Funniest Act"! 🎭🤡', stats: { happy: 10 }, highlight: 'Funniest act at the talent show' },
    ],
  });

  moment({
    id: 'teenJob', ages: [15, 17], scene: 'burger', cast: { boss: 'new:worker' },
    at: { me: 'customer', boss: 'worker' }, need: (l) => !l.teenJob,
    text: '🍔 BURGER BLAST is looking for a part-time helper. The manager <b>{boss}</b> asks: "Want the job? $3,500 a year!"',
    choices: [
      { good: 'Yes! I\'ll work really hard', do: [['say', 'me', 'Yes please! I\'ll work super hard!'], ['pose', 'boss', 'clap', 1.2]], result: 'You got the job! 🍔 You earn money every year now.', stats: { happy: 4 }, run: (l) => { l.teenJob = true; }, highlight: 'First job at Burger Blast' },
      { evil: 'Yes... so I can eat free burgers all day', do: [['say', 'me', 'Sure. (free burgers, here I come...)'], ['pose', 'me', 'smug', 1.2]], result: 'You got the job. You also ate 200 burgers this year. 🍔😈', stats: { happy: 4, health: -5 }, run: (l) => { l.teenJob = true; } },
      { funny: 'Say "Only if I can wear the burger costume"', do: [['say', 'me', 'Only if I can wear the giant burger costume!'], ['pose', 'boss', 'laugh', 1.4]], result: 'You become the Burger Blast mascot! Kids LOVE you. 🍔🤡', stats: { happy: 7 }, run: (l) => { l.teenJob = true; } },
      { say: 'No thanks, I want to focus on school', do: [['say', 'me', 'No thanks!'], ['walk', 'me', 'door']], result: 'You study more instead. 📚', stats: { smarts: 4 } },
    ],
  });

  moment({
    id: 'drivingTest', ages: [16, 17], scene: 'street', cast: { cop: 'new:cop', car: 'car:car' }, car: false,
    at: { car: 'car', cop: [-2.0, -1.4, 0] },
    text: '🚗 DRIVING TEST! The instructor <b>{cop}</b> gets in the car. "Okay. Start the engine..."',
    choices: [
      { good: 'Drive slowly and carefully', do: [['ride', 'me', 'car'], ['hide', 'cop'], ['drive', 'car', 'carEnd', 3]], result: 'PERFECT score! You have your driver\'s license! 🪪😇', stats: { happy: 8, smarts: 2 }, run: (l) => { l.license = true; }, highlight: 'Got your driver\'s license' },
      { evil: 'Drive like a race car driver', do: [['ride', 'me', 'car'], ['hide', 'cop'], ['drive', 'car', 'carEnd', 14], ['shake', 0.6]],
        luck: [
          { chance: 0.3, result: 'Somehow you pass?! The instructor is shaking. 😈', stats: { happy: 8 }, run: (l) => { l.license = true; } },
          { chance: 0.7, result: 'FAIL! The instructor jumps out and kisses the ground. 😈', stats: { happy: -4 } },
        ] },
      { funny: 'Honk at every bird you see', do: [['ride', 'me', 'car'], ['hide', 'cop'], ['sound', 'honk'], ['drive', 'car', [4, -3]], ['sound', 'honk'], ['drive', 'car', 'carEnd'], ['sound', 'honk']], result: 'HONK HONK! The instructor laughs so much they pass you anyway. 🦆🤡', stats: { happy: 7 }, run: (l) => { l.license = true; }, highlight: 'Got your driver\'s license (honk honk)' },
    ],
  });

  moment({
    id: 'election', ages: [14, 17], scene: 'classroom', cast: { a: 'new:teen', b: 'new:teen', c: 'new:teen', rival: 'new:teen' },
    at: { me: 'front', a: 'a', b: 'b', c: 'c', rival: [-4.4, -1.5, 1.57] }, pose: { a: 'sit', b: 'sit', c: 'sit' }, sceneOpt: { lines: ['VOTE FOR', 'CLASS PRESIDENT!'] },
    start: [['face', 'me', 'b'], ['cam', 'close', 'me']],
    text: '🗳️ You are running for CLASS PRESIDENT against <b>{rival}</b>! Time for your big speech...',
    choices: [
      { good: 'Promise to make school better for everyone', do: [['say', 'me', 'I will get better lunches and more fun trips for EVERYONE!'], ['pose', 'a', 'clap', 1.4], ['pose', 'c', 'clap', 1.4]],
        luck: [
          { chance: (l) => 0.4 + l.stats.smarts / 250, do: [['confetti', 'me']], result: 'You WIN! Madam/Mister President {me}! 🎉', stats: { happy: 10, smarts: 3 }, highlight: 'Became class president' },
          { chance: 1, result: 'You lose by 2 votes. So close! {rival} lets you be vice president. 🙂', stats: { happy: 2 } },
        ] },
      { evil: 'Spread a rumor that {rival} eats boogers', do: [['say', 'me', 'Did you know {rival} EATS BOOGERS?'], ['emote', 'rival', '😡'], ['pose', 'rival', 'angry', 1.4]], result: 'You win... but now everybody knows you are a liar. 😈', stats: { happy: 4 }, highlight: 'Won class president (with a mean rumor)' },
      { funny: 'Promise a pet llama for every classroom', do: [['say', 'me', 'Vote for me and EVERY classroom gets a LLAMA!'], ['pose', 'a', 'laugh', 1.4], ['pose', 'b', 'cheer', 1.4], ['pose', 'c', 'cheer', 1.4], ['confetti', 'me']], result: 'You win by a LANDSLIDE! There are no llamas. Nobody cares. 🦙🤡', stats: { happy: 9 }, highlight: 'Won class president with the llama promise' },
    ],
  });

  moment({
    id: 'secret', ages: [13, 17], scene: 'classroom', cast: { a: 'friend', b: 'new:teen' },
    at: { me: [1.4, 2.4, -0.8], a: [0.6, 2.2, 0.8], b: [3.6, 1.0, -0.8] },
    start: [['say', 'a', 'Psst... I\'ll tell you a secret, but DON\'T tell anyone!']],
    text: '🤫 <b>{a}</b> tells you a big secret: they still sleep with a teddy bear called Mr. Fluffles.',
    choices: [
      { good: 'Keep the secret forever', do: [['say', 'me', 'Your secret is safe with me. 🤐'], ['pose', 'a', 'hug', 1.2]], result: '{a} trusts you more than anyone now. 😇', stats: { happy: 3 }, love: { a: 15 } },
      { evil: 'Tell the WHOLE school', do: [['walk', 'me', 'b'], ['say', 'me', 'Guess what? {a} sleeps with a teddy called MR. FLUFFLES!'], ['pose', 'b', 'laugh', 1.4], ['pose', 'a', 'cry', 1.6]], result: 'Everyone is laughing at {a}. You lost a friend today. 😈', stats: { happy: 2 }, unfriend: 'a' },
      { funny: 'Say "Mr. Fluffles is my best friend too"', do: [['say', 'me', 'Wait... YOU know Mr. Fluffles too?!'], ['pose', 'a', 'laugh', 1.6], ['pose', 'me', 'laugh', 1.6]], result: 'You start the Secret Teddy Club. Members: 2. 🧸🤡', stats: { happy: 6 }, love: { a: 10 } },
    ],
  });

  moment({
    id: 'haircut', ages: [13, 17], scene: 'bedroom', cast: { sib: 'sib' },
    at: { sib: [1.6, 0.4, -1.4] },
    text: '💇 You want a NEW LOOK for the new school year! Which haircut do you pick?',
    choices: [
      { good: 'Nice and neat', do: [['poof', 'me'], (async () => { ML.Game.api.setLook({ hairStyle: 'short' }); }), ['pose', 'me', 'cheer', 1.2]], result: 'You look super neat. Grandmas everywhere approve. 😇', stats: { looks: 4 } },
      { evil: 'A spiky MOHAWK', do: [['poof', 'me'], (async () => { ML.Game.api.setLook({ hairStyle: 'mohawk', hair: 0x3a3a40 }); }), ['pose', 'me', 'flex', 1.4]], result: 'You look like a rock star villain. The teachers are worried. 😈', stats: { looks: 5 } },
      { funny: 'A GIANT AFRO', do: [['poof', 'me'], (async () => { ML.Game.api.setLook({ hairStyle: 'afro' }); }), ['pose', 'me', 'silly', 1.4]], result: 'Your hair is so big you need a bigger door. 🤡', stats: { looks: 3, happy: 6 } },
      { say: 'Dye it a crazy color', do: [['poof', 'me'], (async () => { ML.Game.api.setLook({ hair: U.pick([0x3a6ae8, 0xff6ac8, 0x6ad84a]) }); }), ['pose', 'me', 'cheer', 1.2]], result: 'BAM! Rainbow head! 🌈', stats: { looks: 3, happy: 4 } },
    ],
  });

  moment({
    id: 'teenParty', ages: [15, 17], scene: 'home', sceneOpt: { party: true }, cast: { a: 'friend', b: 'new:teen', c: 'new:teen' },
    at: { a: [1.4, 0.4, -1.4], b: [2.4, -1.0, -0.8], c: [-1.6, -0.4, 1.2] }, pose: { b: 'dance', c: 'dance' },
    text: '🎶 You\'re at a party at <b>{a}</b>\'s house! The music is loud and everyone is dancing.',
    choices: [
      { good: 'Help {a} clean up after', do: [['pose', 'me', 'sweep', 2.2], ['say', 'a', 'You\'re a real friend!']], result: '{a}\'s parents think you are the best kid ever. 😇', stats: { happy: 3 }, love: { a: 12 } },
      { evil: 'Eat ALL the snacks and leave', do: [['walk', 'me', 'kitchen'], ['pose', 'me', 'eatStand', 2], ['leave', 'me']], result: 'There are no chips left. NONE. Everyone knows it was you. 😈', stats: { happy: 4, health: -3 }, love: { a: -6 } },
      { funny: 'Dance on the table', do: [['walk', 'me', [-3.2, 0.5]], ['pose', 'me', 'dance', 3], ['pose', 'a', 'cheer', 1.6], ['pose', 'b', 'cheer', 1.6]], result: 'Everyone chants your name! {me}! {me}! {me}! 🕺🤡', stats: { happy: 10 }, friend: 'b', love: { a: 6 } },
    ],
  });

  moment({
    id: 'sportsTeam', ages: [13, 16], scene: 'playground', cast: { coach: 'new:teacher', a: 'new:teen' },
    at: { coach: [2.0, 0.0, -1.2], a: [-1.8, 0.5, 1.0] },
    start: [['spawn', 'ball', [0.6, 0.2], 'ball']],
    text: '⚽ SOCCER TRYOUTS! Coach <b>{coach}</b> is watching. You get the ball...',
    choices: [
      { good: 'Pass to {a} so the team scores', do: [['pose', 'me', 'kick', 0.8], ['throw', 'me', 'a', 'ball', false], ['pose', 'a', 'cheer', 1.4], ['pose', 'coach', 'clap', 1.2]], result: '"Great teamwork!" You make the team! ⚽ 😇', stats: { health: 6, happy: 5 }, friend: 'a', highlight: 'Made the soccer team' },
      { evil: 'Kick the ball at the coach', do: [['pose', 'me', 'kick', 0.8], ['throw', 'me', 'coach', 'ball'], ['pose', 'coach', 'fall', 1.6]], result: 'BONK! You are NOT on the team. You are on the "go home" team. 😈', stats: { happy: 3 } },
      { funny: 'Do a crazy celebration dance before scoring', do: [['pose', 'me', 'silly', 1.8], ['pose', 'a', 'laugh', 1.2], ['emote', 'me', '⚽❌']], result: 'You forgot to actually kick the ball. But the coach puts you on the team for "team spirit". 🤡', stats: { health: 4, happy: 7 } },
    ],
  });

  // ============================================================
  //  🎓 18: MOVING TO THE BIG CITY!
  // ============================================================
  moment({
    id: 'moveOut', ages: [18, 18], always: true, scene: 'street', cast: { mom: 'mom', dad: 'dad' }, car: false,
    at: { mom: [1.4, 1.2, -1.2], dad: [2.4, 1.6, -1.2] },
    start: [['spawn', 'gift', [-0.5, 1.6], 'box1'], ['spawn', 'gift', [-0.7, 1.9], 'box2', { color: 0xc8a070 }], ['cam', 'both', 'me', 'mom']],
    text: '🏙️ You are 18! You finished school and it\'s time to move to the BIG CITY! 🎓 You found a tiny apartment. Mom and Dad came to say goodbye...',
    choices: [
      { good: 'Hug them and say thank you for everything', do: [['walk', 'me', 'mom'], ['pose', 'me', 'hug', 1.4], ['pose', 'mom', 'cry', 1.4], ['pose', 'dad', 'hug', 1.4]], result: '"We are SO proud of you." Mom cries. Dad pretends he\'s not crying. 😭😇', stats: { happy: 6 }, love: { mom: 10, dad: 10 }, run: (l, api) => api.setHome(1), highlight: 'Moved to the big city' },
      { evil: 'Leave without saying goodbye', do: [['walk', 'me', 'far']], result: 'You just... walk away. Mom calls you 47 times. You don\'t answer. 😈', stats: { happy: 3 }, love: { mom: -12, dad: -12 }, run: (l, api) => api.setHome(1), highlight: 'Moved to the big city' },
      { funny: 'Leave doing the moonwalk', do: [['face', 'me', 'mom'], ['walk', 'me', [-4, 1.2], 0.6], ['pose', 'me', 'silly', 1], ['pose', 'dad', 'laugh', 1.4], ['pose', 'mom', 'laugh', 1.4]], result: 'Your parents laugh and cry at the same time. Best goodbye ever! 🕺🤡', stats: { happy: 7 }, love: { mom: 5, dad: 5 }, run: (l, api) => api.setHome(1), highlight: 'Moonwalked to the big city' },
    ],
  });

  moment({
    id: 'firstJobHunt', ages: [18, 19], always: true, scene: 'street', need: (l) => !l.job, cast: { a: 'new:adult' },
    at: { a: [2.4, 1.6, -1.2] },
    start: [['pose', 'me', 'phone', 1.5]],
    text: '💼 You need a JOB to pay the rent! You can look for a job any time in the 📱 <b>LIFE</b> menu. Which one sounds fun?',
    choices: [
      { say: '🍔 Burger Blast (anyone can do it)', do: [['emote', 'me', '🍔']], result: 'You start as a Fry Cook! Let\'s flip some burgers! 🍔', run: (l, api) => api.giveJob('burger') },
      { say: '🎬 Become a YouTuber', do: [['pose', 'me', 'film', 1.6]], result: 'You start your channel! You have 3 subscribers (Mom, Dad and a robot). 🎬', run: (l, api) => api.giveJob('youtuber') },
      { say: '💼 Mega Corp office (needs 🧠 45)', need: (l) => ML.Life.canGetJob('office'), do: [['emote', 'me', '💼']], result: 'You start as an Intern at Mega Corp! ☕', run: (l, api) => api.giveJob('office') },
      { say: '👮 City Police (needs ❤️ 55)', need: (l) => ML.Life.canGetJob('police'), do: [['pose', 'me', 'flex', 1.2]], result: 'You start as a Police Cadet! 🚓', run: (l, api) => api.giveJob('police') },
      { say: '🩺 Doctor (needs 🧠 72)', need: (l) => ML.Life.canGetJob('doctor'), do: [['emote', 'me', '🩺']], result: 'You start as a Student Doctor! 🏥', run: (l, api) => api.giveJob('doctor') },
      { say: 'I\'ll look later', do: [['pose', 'me', 'shrug', 1]], result: 'You can find a job later in the 📱 LIFE menu.' },
    ],
  });

  // ============================================================
  //  💼 WORK (every year you have a job)
  // ============================================================
  const WORK_TEXT = {
    burger: ['🍔 The burger line is SUPER long today and the grill is on fire (a little bit).', 'cook', 'grill'],
    office: ['💼 Your boss <b>{boss}</b> needs a big report by 5 o\'clock.', 'type', 'myDesk'],
    police: ['🚓 You\'re on patrol in the city. A man just ran a red light on a scooter!', 'stand', 'me'],
    doctor: ['🩺 A patient comes in with a banana stuck in their ear. Somehow.', 'stand', 'me'],
    youtuber: ['🎬 You need a new video today. Your fans are waiting!', 'film', 'me'],
    teacher: ['🍎 Your class is SUPER loud today. Nobody is listening.', 'stand', 'front'],
  };
  moment({
    id: 'work', ages: [16, 75], always: true, repeat: 1, scene: 'job', need: (l) => !!l.job, cast: { boss: 'boss', a: 'new:coworker' },
    sceneOpt: (l) => (l.job && l.job.id === 'youtuber' ? { tier: Math.max(1, l.home), furniture: l.furniture } : (l.job && l.job.id === 'teacher' ? { lines: ['Today: FRACTIONS', '1/2 + 1/2 = 1'] } : undefined)),
    start: [async () => {
      const l = L(), w = WORK_TEXT[l.job.id];
      const S = ML.Stage;
      const me = S.get('me');
      const spot = S.hasSpot(w[2]) ? w[2] : 'me';
      const p = S.where(spot);
      me.pos.set(p.x, p.y || 0, p.z); me.rot = p.r || 0; me.faceAngle = me.rot;
      me.pose = me.basePose = w[1] === 'type' ? 'type' : 'stand';
      if (w[1] === 'cook') me.pose = 'cook';
      if (w[1] === 'film') { me.pose = 'film'; S.A.hold('me', 'camera'); }
      const a = S.get('a');
      if (a && l.job.id === 'office') { const d = S.where('deskA'); a.pos.set(d.x, 0, d.z); a.rot = 0; a.faceAngle = 0; a.faceTo = null; a.pose = a.basePose = 'type'; }
      if (l.job.id !== 'office') S.A.cam('close', 'me');
    }],
    text: (l) => `${WORK_TEXT[l.job.id][0]}<br><small>Job: <b>${ML.Life.jobTitle()}</b> · how well you work: ${'🟩'.repeat(Math.round(l.job.perf / 20))}${'⬜'.repeat(5 - Math.round(l.job.perf / 20))}</small>`,
    choices: [
      { good: 'Work super hard', do: [['emote', 'me', '💪'], ['wait', 1.2], ['pose', 'me', 'cheer', 1]], result: 'Great work! Your boss noticed. 📈 😇', stats: { smarts: 2, happy: -1 }, run: (l, api) => api.perf(22) },
      { evil: 'Take credit for {a}\'s work', do: [['say', 'me', 'Boss! Look at MY amazing work! (it\'s {a}\'s work)'], ['emote', 'a', '😠']],
        luck: [
          { chance: 0.6, result: 'The boss believes you! 📈 But {a} hates you now. 😈', run: (l, api) => api.perf(25) },
          { chance: 0.4, result: 'The boss finds out it was {a}\'s work. BIG trouble! 📉 😈', stats: { happy: -5 }, run: (l, api) => api.perf(-30) },
        ] },
      { funny: 'Prank your coworker {a}', do: [['emote', 'me', '🤭'], ['say', 'me', 'Hey {a}, your shoe is untied! ...GOTCHA!'], ['pose', 'a', 'laugh', 1.4], ['pose', 'me', 'laugh', 1.2]], result: 'Everyone at work loves you... but you didn\'t get much work done. 🤡', stats: { happy: 6 }, friend: 'a', run: (l, api) => api.perf(l.job.id === 'youtuber' ? 20 : -5) },
      { say: 'Take a nap 😴', do: [['pose', 'me', 'sleep', 0.1], ['zzz', 'me']], result: 'Zzzz... You feel great! Your boss does not. 📉', stats: { health: 4, happy: 3 }, run: (l, api) => api.perf(-15) },
      { only: 'good', good: 'Stay late to help everybody', do: [['emote', 'me', '🌙'], ['pose', 'me', 'cheer', 1]], result: 'You\'re the hero of the office! BIG bonus! 📈💰', stats: { money: 2000, happy: 3 }, run: (l, api) => api.perf(30), power: 2 },
    ],
  });

  moment({
    id: 'retire', ages: [65, 80], always: true, scene: 'job', need: (l) => !!l.job, cast: { boss: 'boss', a: 'new:coworker' },
    at: { boss: [1.2, 0.8, -1.4], a: [-1.4, 0.8, 1.4] },
    start: [['spawn', 'table', [0, -0.4], 'rt'], ['spawn', 'cake', [0, -0.4, 0, 0.77], 'rc']],
    text: '👴 After many years, it\'s time to RETIRE! Everyone at work has a party for you. 🎉',
    choices: [
      { good: 'Give a speech thanking everyone', do: [['say', 'me', 'Thank you all. It was an honor to work with you!'], ['pose', 'boss', 'clap', 1.4], ['pose', 'a', 'cry', 1.4]], result: 'There isn\'t a dry eye in the room. You retire as a legend. 😇', stats: { happy: 10 }, run: (l) => { l.highlights.push('Retired as ' + ML.Life.jobTitle()); l.job = null; l.retired = true; } },
      { evil: 'Take the whole cake home', do: [['walk', 'me', [0, 0.25]], ['remove', 'rc'], ['hold', 'me', 'cake'], ['walk', 'me', 'door']], result: 'You leave with the cake. Nobody gets any. Bye, losers! 😈', stats: { happy: 8 }, run: (l) => { l.job = null; l.retired = true; } },
      { funny: 'Do a retirement dance on your desk', do: [['pose', 'me', 'dance', 2.4], ['pose', 'boss', 'laugh', 1.6], ['pose', 'a', 'cheer', 1.6]], result: 'You dance into retirement! 🕺👴🤡', stats: { happy: 10 }, run: (l) => { l.highlights.push('Retired with a dance'); l.job = null; l.retired = true; } },
    ],
  });

  // ============================================================
  //  🧑‍💼 ADULT (18 - 64)
  // ============================================================
  moment({
    id: 'ladyStreet', ages: [18, 64], repeat: 7, scene: 'street', cast: { lady: 'new:lady' },
    at: { me: [-2.6, 1.2, 0.3], lady: [4.5, 1.5, -1.4] },
    start: [['walk', 'lady', [1.8, 1.4]], ['cam', 'both', 'me', 'lady']],
    text: '👩 You\'re walking in the city. A lady with a heavy shopping bag is walking towards you...',
    choices: [
      { say: 'Walk up to her', do: [['walk', 'me', 'lady']],
        next: {
          text: '"Oh! Hello there," says the lady. Her name is <b>{lady}</b>. Her bag looks REALLY heavy.',
          choices: [
            { good: 'Help carry her bag', do: [['say', 'me', 'Can I help you with that?'], ['pose', 'me', 'hold'], ['walk', 'me', [4.5, 1.6]], ['walk', 'lady', [5.2, 1.4]], ['say', 'lady', 'What a kind person! Thank you!']], result: '{lady} gives you a homemade cookie and her phone number. You have a new friend! 🍪 😇', stats: { happy: 6 }, friend: 'lady' },
            { evil: 'Grab her bag and RUN', do: [['pose', 'me', 'give', 0.5], ['hold', 'me', 'gift'], ['run', 'me', 'far'], ['pose', 'lady', 'scared', 1.2], ['say', 'lady', 'THIEF! STOP!']],
              luck: [
                { chance: 0.5, result: 'You got away! Inside the bag: 12 cans of cat food. 🐟 Great. 😈', stats: { happy: 2 } },
                { chance: 0.5, result: 'A police officer catches you around the corner! You pay a $500 fine. 🚓 😈', stats: { money: -500, happy: -5 } },
              ] },
            { funny: 'Tell her your best joke', do: [['say', 'me', 'Why can\'t a bicycle stand up? Because it\'s TWO TIRED!'], ['pose', 'lady', 'laugh', 1.8]], result: '{lady} laughs so much she drops her bag. Oranges everywhere! 🍊🤡', stats: { happy: 6 }, friend: 'lady' },
          ],
        } },
      { say: 'Walk away', do: [['face', 'me', 'far'], ['walk', 'me', 'far']], result: 'You walk away. You\'ll never know who she was. Maybe that\'s okay. 🚶', stats: { happy: 0 } },
    ],
  });

  moment({
    id: 'wallet', ages: [18, 64], repeat: 9, scene: 'street', cast: { a: 'new:man' },
    at: { a: [6, 1.6, 1.57] }, hidden: ['a'],
    start: [['spawn', 'wallet', [0.2, 1.0], 'wal'], ['walk', 'me', [-0.3, 1.1]], ['pose', 'me', 'kneel', 0.8], ['remove', 'wal'], ['hold', 'me', 'wallet'], ['emote', 'me', '😮']],
    text: '👛 You find a wallet on the sidewalk! There\'s $300 inside... and an ID card with an address.',
    choices: [
      { good: 'Return it to the owner', do: [['show', 'a'], ['walk', 'a', [1.2, 1.2]], ['give', 'me', 'a', 'wallet'], ['say', 'a', 'My wallet! You\'re a good person! Here, take $50!']], result: 'The owner, <b>{a}</b>, gives you $50 and a big handshake! 🤝 😇', stats: { money: 50, happy: 6 }, friend: 'a' },
      { evil: 'Keep the money', do: [['pose', 'me', 'smug', 1.2], ['emote', 'me', '💰']], result: '+$300! You throw the wallet in the trash. You feel rich... and a little bit itchy. 😈', stats: { money: 300 } },
      { funny: 'Use the wallet as a puppet', do: [['pose', 'me', 'silly', 1], ['say', 'me', '(wallet voice) "PLEASE take me home!"'], ['show', 'a'], ['walk', 'a', [1.2, 1.2]], ['pose', 'a', 'laugh', 1.4]], result: 'The owner walks by, sees a talking wallet, and laughs. They give you $20 for the show. 🤡', stats: { money: 20, happy: 5 } },
    ],
  });

  moment({
    id: 'musician', ages: [18, 70], repeat: 8, scene: 'street', cast: { a: 'new:musician', b: 'new:adult' },
    at: { a: [1.6, 1.8, -0.4], b: [3.4, 2.0, -1.2] }, pose: { a: 'sing' },
    start: [['sound', 'song']],
    text: '🎸 A street musician named <b>{a}</b> is singing a beautiful song. Their hat is almost empty.',
    choices: [
      { good: 'Give $20', cost: 20, do: [['walk', 'me', 'a'], ['give', 'me', 'a', 'money'], ['say', 'a', 'Thank you, friend! This song is for you!']], result: 'They sing a song with YOUR name in it! 🎵 😇', stats: { happy: 7 }, friend: 'a' },
      { evil: 'Take money from the hat', do: [['sneak', 'me', [1.6, 2.4]], ['pose', 'me', 'kneel', 0.6], ['run', 'me', 'far']], result: 'You steal $3. That\'s it. Just $3. Was it worth it? 😈', stats: { money: 3 } },
      { funny: 'Dance next to them', do: [['walk', 'me', [0.6, 1.6]], ['pose', 'me', 'dance', 3], ['pose', 'b', 'clap', 1.4]], result: 'A crowd comes! The hat fills up! The musician gives you half. 💃🤡', stats: { happy: 8, money: 40 }, friend: 'a' },
    ],
  });

  moment({
    id: 'adoptDay', ages: [20, 60], scene: 'park', need: (l) => !l.pets.length, cast: { keeper: 'new:keeper', dog: 'pet:dog', cat: 'pet:cat' },
    at: { keeper: [2.6, 0.3, -0.8], dog: [1.4, 0.0, 0], cat: [3.6, 0.0, 0] }, pose: { cat: 'sit' },
    text: '🐾 It\'s ADOPTION DAY in the park! <b>{keeper}</b> from the animal shelter says: "These two need a home!"',
    choices: [
      { good: 'Adopt the dog, {dog}', do: [['walk', 'me', 'dog'], ['pose', 'me', 'kneel', 1], ['pose', 'dog', 'happy', 1.4], ['emote', 'dog', '💕']], result: '{dog} licks your whole face! You have a new best friend! 🐶', stats: { happy: 12 }, run: (l, api) => api.addPet('dog', api.cast.dog.name, api.cast.dog.color) },
      { good: 'Adopt the cat, {cat}', do: [['walk', 'me', 'cat'], ['pose', 'me', 'kneel', 1], ['pose', 'cat', 'happy', 1.4], ['emote', 'cat', '💕']], result: '{cat} purrs like a little motor. You have a new best friend! 🐱', stats: { happy: 12 }, run: (l, api) => api.addPet('cat', api.cast.cat.name, api.cast.cat.color) },
      { evil: 'Say "Ew, animals are gross"', do: [['say', 'me', 'Ew. Animals are gross.'], ['emote', 'dog', '😢'], ['emote', 'cat', '😾'], ['walk', 'me', 'far']], result: 'The puppy\'s sad eyes will haunt your dreams. 😈', stats: { happy: -2 } },
      { funny: 'Ask if they have a dinosaur', do: [['say', 'me', 'Do you have any DINOSAURS?'], ['pose', 'keeper', 'laugh', 1.4]], result: '"No dinosaurs today." You adopt the dog anyway and call it T-Rex. 🦖🐶🤡', stats: { happy: 10 }, run: (l, api) => api.addPet('dog', 'T-Rex', api.cast.dog.color) },
    ],
  });

  moment({
    id: 'loudNeighbor', ages: [18, 64], repeat: 8, scene: 'apartment', cast: { a: 'new:adult' },
    at: { a: 'door' }, hidden: ['a'],
    start: [['sound', 'song'], ['shake', 0.3], ['emote', 'me', '😫']],
    text: '🔊 BOOM BOOM BOOM! It\'s 2 AM and your neighbor is playing music SUPER loud.',
    choices: [
      { good: 'Knock and ask nicely', do: [['walk', 'me', 'door'], ['show', 'a'], ['say', 'me', 'Hi! Could you please turn it down a little?'], ['say', 'a', 'Oh! Sorry! Of course!']], result: 'The neighbor, <b>{a}</b>, says sorry and brings you cookies the next day. 😇', stats: { health: 3, happy: 3 }, friend: 'a' },
      { evil: 'Play your music EVEN LOUDER', do: [['pose', 'me', 'evilLaugh', 1], ['sound', 'song'], ['shake', 0.8], ['pose', 'me', 'dance', 2]], result: 'MUSIC WAR! Nobody in the building sleeps for a week. 😈', stats: { health: -4, happy: 4 } },
      { funny: 'Go and JOIN the party', do: [['walk', 'me', 'door'], ['show', 'a'], ['pose', 'me', 'dance', 2.2], ['pose', 'a', 'dance', 2.2]], result: 'You dance until 5 AM with your new friend <b>{a}</b>! 🪩🤡', stats: { happy: 9, health: -3 }, friend: 'a' },
    ],
  });

  moment({
    id: 'oldLadyCross', ages: [18, 64], repeat: 9, scene: 'street', cast: { a: 'new:oldlady' },
    at: { a: [0.6, -1.3, 3.14] }, car: false,
    text: '👵 An old lady named <b>{a}</b> wants to cross the busy street, but the cars are going SO fast.',
    choices: [
      { good: 'Help her cross the street', do: [['walk', 'me', 'a'], ['together', [['walk', 'me', [1.4, -8.6]]], [['walk', 'a', [0.6, -8.8]]]], ['say', 'a', 'Thank you, young one!']], result: 'She gives you a candy from 1985. It still tastes great! 🍬 😇', stats: { happy: 7 }, friend: 'a' },
      { evil: 'Tell her the wrong way', do: [['say', 'me', 'The crosswalk? It\'s that way! (it is NOT that way)'], ['walk', 'a', 'farR', 0.6]], result: 'She walks 5 miles the wrong way. 😈 Shame on you!', stats: { happy: 2 } },
      { funny: 'Stop traffic with a dance', do: [['walk', 'me', [0, -4.5]], ['pose', 'me', 'dance', 2.2], ['walk', 'a', [0.6, -8.8], 0.6]], result: 'All the cars stop to watch you dance. She crosses safely! 🕺🚗🤡', stats: { happy: 8 } },
    ],
  });

  moment({
    id: 'jogging', ages: [18, 64], repeat: 6, scene: 'park', cast: { a: 'new:adult' },
    at: { a: [3.0, 0.2, -1.2] },
    text: '🏃 You go to the park to get in shape. A runner named <b>{a}</b> is stretching...',
    choices: [
      { good: 'Go for a long run', do: [['run', 'me', 'far'], ['run', 'me', [8, 1.2]], ['run', 'me', 'me'], ['pose', 'me', 'flex', 1.2]], result: 'You run 5 km! You feel AMAZING! 💪', stats: { health: 8, happy: 3, looks: 2 } },
      { evil: 'Race {a} and trip them at the end', do: [['together', [['run', 'me', [8, 1.2]]], [['run', 'a', [7, 0.4]], ['pose', 'a', 'fall', 1.2]]], ['pose', 'me', 'flex', 1.2]], result: 'You win the "race"! {a} has grass in their teeth. 😈', stats: { health: 5 } },
      { funny: 'Run like a chicken', do: [['say', 'me', 'BAWK BAWK BAWK!'], ['run', 'me', 'far'], ['pose', 'a', 'laugh', 1.6]], result: '{a} laughs so hard they can\'t run. You are a park legend. 🐔🤡', stats: { health: 5, happy: 6 }, friend: 'a' },
    ],
  });

  moment({
    id: 'lottery', ages: [18, 80], repeat: 12, scene: 'street', cast: { a: 'new:seller' },
    at: { a: [1.6, 1.4, -1.2] },
    text: '🎟️ A man is selling LOTTERY tickets. "Only $10! You could win a MILLION DOLLARS!"',
    choices: [
      { good: 'Buy one and give it to a stranger', cost: 10, do: [['give', 'a', 'me', 'card'], ['emote', 'me', '🎁']],
        luck: [
          { chance: 0.06, do: [['confetti', 'me']], result: 'The stranger WINS a million dollars and gives YOU half! 💰💰💰 Being nice pays off!', stats: { money: 500000, happy: 20 }, highlight: 'Shared a lottery prize' },
          { chance: 1, result: 'The stranger wins $5. They smile at you. That\'s nice too. 😇', stats: { happy: 3 } },
        ] },
      { evil: 'Buy one... and secretly peek at the winning numbers', cost: 10, do: [['sneak', 'me', 'a'], ['emote', 'me', '👀']],
        luck: [
          { chance: 0.12, do: [['confetti', 'me'], ['pose', 'me', 'evilLaugh', 1.4]], result: 'YOU WIN $100,000!!! 😈💰', stats: { money: 100000, happy: 15 }, highlight: 'Won the lottery (sneakily)' },
          { chance: 1, result: 'You can\'t see anything. You lose $10. 😈', stats: { happy: -1 } },
        ] },
      { funny: 'Pick your numbers by asking a pigeon', cost: 10, do: [['say', 'me', 'Mr. Pigeon, which number?'], ['emote', 'me', '🐦'], ['pose', 'a', 'laugh', 1.2]],
        luck: [
          { chance: 0.08, do: [['confetti', 'me'], ['pose', 'me', 'dance', 2]], result: 'THE PIGEON WAS RIGHT! You win $250,000! 🐦💰🤡', stats: { money: 250000, happy: 15 }, highlight: 'Won the lottery thanks to a pigeon' },
          { chance: 1, result: 'The pigeon was wrong. Never trust a pigeon. 🤡', stats: { happy: 2 } },
        ] },
      { say: 'No thanks', do: [['walk', 'me', 'far']], result: 'You keep your $10. Smart!' },
    ],
  });

  moment({
    id: 'cookDinner', ages: [18, 70], repeat: 7, scene: 'myhome', need: (l) => l.home >= 1,
    start: [['pose', 'me', 'cook', 1.4]],
    text: '🍝 It\'s dinner time and you\'re HUNGRY. What do you make?',
    choices: [
      { good: 'A healthy salad with veggies', do: [['pose', 'me', 'cook', 1.4], ['pose', 'me', 'eatStand', 1.6], ['emote', 'me', '🥗']], result: 'Crunchy and healthy! Your body says thank you. 🥦 😇', stats: { health: 6 } },
      { evil: 'Burn it, then order 3 pizzas', do: [['emote', 'me', '🔥'], ['shake', 0.3], ['hold', 'me', 'pizza'], ['pose', 'me', 'eatStand', 2]], result: 'The smoke alarm screams. The pizza is DELICIOUS though. 🍕😈', stats: { happy: 6, health: -4, money: -40 } },
      { funny: 'Make spaghetti and wear it as hair', do: [['pose', 'me', 'cook', 1], ['emote', 'me', '🍝'], ['pose', 'me', 'silly', 1.6]], result: 'You look like a pasta monster. You send a selfie to everyone. 🍝🤡', stats: { happy: 7 } },
    ],
  });

  moment({
    id: 'friendBirthday', ages: [18, 70], repeat: 5, scene: 'park', cast: { a: 'friend', b: 'new:adult' }, need: (l) => ML.Life.friends().length > 0,
    at: { a: [1.0, 0.0, -0.6], b: [2.4, 0.2, -1.2] },
    start: [['spawn', 'table', [0.4, -1.3], 'tb'], ['spawn', 'cake', [0.4, -1.3, 0, 0.77], 'ck']],
    text: '🎈 It\'s your friend <b>{a}</b>\'s birthday picnic! Everyone brought a present...',
    choices: [
      { good: 'Give a really thoughtful gift', cost: 50, do: [['walk', 'me', 'a'], ['give', 'me', 'a', 'gift'], ['pose', 'a', 'hug', 1.4]], result: '{a} LOVES it! "How did you know?!" 🎁😇', stats: { happy: 6 }, love: { a: 15 } },
      { evil: 'Eat the cake before they blow the candles', do: [['walk', 'me', [0.4, -0.7]], ['face', 'me', 'ck'], ['remove', 'ck'], ['pose', 'me', 'eatStand', 1.8], ['pose', 'a', 'angry', 1.4]], result: 'You ate the WHOLE cake. {a} is not inviting you next year. 😈', stats: { happy: 5, health: -3 }, love: { a: -15 } },
      { funny: 'Sing "Happy Birthday" in an opera voice', do: [['pose', 'me', 'sing', 2.6], ['say', 'me', '🎵 HAPPY BIRTHDAAAAAAAY! 🎵'], ['pose', 'a', 'laugh', 1.6], ['pose', 'b', 'laugh', 1.6]], result: 'The birds fly away. Everyone is crying with laughter. 🎶🤡', stats: { happy: 7 }, love: { a: 10 } },
    ],
  });

  moment({
    id: 'checkup', ages: [30, 64], repeat: 6, scene: 'hospital', cast: { doctor: 'new:doctor' },
    at: { me: 'chair', doctor: [-0.8, -0.8, 0.7] }, pose: { me: 'sit' },
    text: (l) => `🩺 Yearly checkup! Dr. <b>{doctor}</b> looks at your results. "Your health is ${l.stats.health > 70 ? 'GREAT' : l.stats.health > 40 ? 'okay' : 'not so good'}. You should eat more vegetables."`,
    choices: [
      { good: 'Promise to eat broccoli every day', do: [['say', 'me', 'I promise! Broccoli every day!'], ['pose', 'doctor', 'clap', 1.2]], result: 'You keep your promise! You feel healthier than ever. 🥦😇', stats: { health: 10 } },
      { evil: 'Say "Vegetables are a scam"', do: [['say', 'me', 'Vegetables are a SCAM made by Big Carrot.'], ['pose', 'doctor', 'facepalm', 1.4]], result: 'The doctor sighs very loudly. 😈', stats: { health: -3, happy: 3 } },
      { funny: 'Ask if chocolate is a vegetable', do: [['say', 'me', 'Chocolate comes from a BEAN. Beans are vegetables. Right?'], ['pose', 'doctor', 'laugh', 1.4]], result: '"...I mean... technically..." You leave with a smile. 🍫🤡', stats: { health: 2, happy: 5 } },
    ],
  });

  moment({
    id: 'robber', ages: [20, 64], repeat: 15, scene: 'street', cast: { thief: 'new:thief', lady: 'new:lady' },
    at: { thief: [4.5, 1.6, -1.5], lady: [2.6, 1.6, 1.5] }, react: false,
    start: [['run', 'thief', 'lady'], ['pose', 'lady', 'scared', 0.2], ['say', 'lady', 'HELP! He stole my purse!'], ['run', 'thief', [0.6, 1.4]]],
    text: '🚨 A robber just stole a lady\'s purse and he\'s running RIGHT towards you!',
    choices: [
      { good: 'Stop the robber!', do: [['run', 'me', 'thief']],
        luck: [
          { chance: (l) => 0.35 + l.stats.health / 200, do: [['pose', 'thief', 'fall', 1.6], ['give', 'me', 'lady', 'gift'], ['pose', 'lady', 'cheer', 1.4]], result: 'You catch him! The newspaper calls you "THE CITY HERO"! 🦸📰', stats: { happy: 12 }, friend: 'lady', highlight: 'Stopped a robber' },
          { chance: 1, do: [['pose', 'me', 'fall', 1.4], ['run', 'thief', 'far']], result: 'He pushes you over and gets away. But you tried! 🤕', stats: { health: -6 } },
        ] },
      { evil: 'Ask the robber to share', do: [['walk', 'me', 'thief'], ['say', 'me', 'Psst... 50/50?'], ['give', 'thief', 'me', 'money'], ['run', 'thief', 'far']], result: 'He gives you $20 and runs away. You feel like a villain. You ARE a villain. 😈', stats: { money: 20 } },
      { funny: 'Throw a banana peel', do: [['throw', 'me', [0.2, 1.4], 'ball', false], ['pose', 'thief', 'fall', 1.8], ['emote', 'thief', '🍌'], ['pose', 'lady', 'laugh', 1.2]], result: 'He slips like in a cartoon! The police arrive and arrest him. 🍌🤡', stats: { happy: 9 }, highlight: 'Stopped a robber with a banana peel' },
      { only: 'good', good: 'Do a superhero jump and catch him', do: [['jump', 'me'], ['run', 'me', 'thief'], ['pose', 'thief', 'fall', 1.6], ['pose', 'me', 'flex', 1.4], ['confetti', 'me']], result: 'You catch him in ONE move! People take photos. You are a REAL superhero! 🦸‍♀️🦸', stats: { happy: 15, health: 2 }, highlight: 'Became a real-life superhero', power: 2 },
    ],
  });

  moment({
    id: 'viral', ages: [18, 50], scene: 'myhome', need: (l) => l.home >= 1,
    start: [['hold', 'me', 'phone'], ['pose', 'me', 'phone', 1.4]],
    text: '📈 One of your videos is going VIRAL! 1 million views! People want more!',
    choices: [
      { good: 'Use your fame to raise money for a hospital', do: [['pose', 'me', 'film', 1.6], ['confetti', 'me']], result: 'You raise $50,000 for sick kids! The mayor gives you a medal. 🏅😇', stats: { happy: 12 }, highlight: 'Raised money for a hospital' },
      { evil: 'Sell your fans a "magic" rock for $99', do: [['pose', 'me', 'film', 1.4], ['pose', 'me', 'evilLaugh', 1.2]], result: 'You sell 300 rocks. That\'s $29,700! People are angry when the rocks do nothing. 🪨😈', stats: { money: 29700, happy: 3 } },
      { funny: 'Make a video of you dancing with your toaster', do: [['pose', 'me', 'dance', 2.4], ['flash']], result: 'The toaster dance becomes a worldwide trend! 🍞🕺🤡', stats: { happy: 10, money: 5000 }, highlight: 'Started the toaster dance trend' },
    ],
  });

  moment({
    id: 'parentsVisit', ages: [19, 64], repeat: 5, scene: 'myhome', need: (l) => l.home >= 1 && (has('mom') || has('dad')), cast: { mom: 'mom', dad: 'dad' },
    at: { mom: 'door', dad: 'door' }, hidden: ['mom', 'dad'],
    start: [['enter', 'mom', 'door', 'a'], ['enter', 'dad', 'door', 'b']],
    text: '🚪 DING DONG! Mom and Dad came to visit your home! Mom looks around...',
    choices: [
      { good: 'Cook them a nice dinner', do: [['pose', 'me', 'cook', 1.6], ['give', 'me', 'mom', 'pizza'], ['pose', 'mom', 'hug', 1.2]], result: '"Our kid is all grown up!" They\'re so proud. 🍝😇', stats: { happy: 6 }, love: { mom: 10, dad: 10 } },
      { evil: 'Ask them for money', do: [['say', 'me', 'Soooo... can I borrow $1,000?'], ['pose', 'dad', 'facepalm', 1.4], ['give', 'dad', 'me', 'money']], result: 'They give you $1,000... and a long speech about saving money. 😈', stats: { money: 1000 }, love: { mom: -5, dad: -5 } },
      { funny: 'Give them a "tour" like a museum guide', do: [['say', 'me', 'And on your left... the famous SOFA. Built in... last Tuesday.'], ['pose', 'mom', 'laugh', 1.6], ['pose', 'dad', 'laugh', 1.6]], result: 'Your parents laugh all evening. 🏛️🤡', stats: { happy: 6 }, love: { mom: 8, dad: 8 } },
    ],
  });

  moment({
    id: 'friendWedding', ages: [24, 45], scene: 'garden', cast: { a: 'friend', b: 'new:adult', c: 'new:adult', d: 'new:adult' },
    at: { me: 'seatA', a: 'me', b: 'b', c: 'c', d: 'd' }, pose: { me: 'sit', c: 'sit', d: 'sit' }, need: (l) => ML.Life.friends().length > 0,
    start: [['face', 'a', 'b'], ['face', 'b', 'a']],
    text: '💒 Your friend <b>{a}</b> is getting married to <b>{b}</b>! The priest says: "If anyone has something to say, speak now..."',
    choices: [
      { good: 'Give a beautiful speech', do: [['pose', 'me', 'stand'], ['say', 'me', '{a} is the kindest person I know. Be happy forever!'], ['pose', 'a', 'cry', 1.4], ['confetti', 'a']], result: 'Everyone cries happy tears. 💐😇', stats: { happy: 8 }, love: { a: 15 } },
      { evil: 'Stand up and say "I OBJECT!"', do: [['pose', 'me', 'stand'], ['say', 'me', 'I OBJECT! ...just kidding. Or am I?'], ['pose', 'a', 'angry', 1.4], ['pose', 'c', 'scared', 1.4]], result: 'Total chaos! {a} doesn\'t talk to you for a year. 😈', stats: { happy: 4 }, love: { a: -20 } },
      { funny: 'Catch the flowers with a backflip', do: [['pose', 'me', 'stand'], ['jump', 'me'], ['spin', 'me'], ['confetti', 'me'], ['pose', 'b', 'laugh', 1.4], ['pose', 'a', 'cheer', 1.4]], result: 'You catch the flowers AND do a backflip! Best wedding guest ever! 💐🤸🤡', stats: { happy: 9 }, love: { a: 8 } },
    ],
  });

  moment({
    id: 'crazyIdea', ages: [38, 55], scene: 'myhome',
    text: '🤪 You wake up and feel like doing something CRAZY with your life!',
    choices: [
      { good: 'Run a marathon for charity', do: [['pose', 'me', 'flex', 1.2], ['run', 'me', 'door']], result: '42 km! You raise $10,000 for charity and your legs hate you. 🏅😇', stats: { health: 8, happy: 8 }, highlight: 'Ran a charity marathon' },
      { evil: 'Buy a pet shark for the bathtub', cost: 3000, do: [['emote', 'me', '🦈'], ['pose', 'me', 'evilLaugh', 1.6]], result: 'You name it Mr. Chompers. The neighbors are VERY worried. 🦈😈', stats: { happy: 10 }, highlight: 'Owned a pet shark called Mr. Chompers' },
      { funny: 'Learn to juggle 5 rubber chickens', do: [['pose', 'me', 'silly', 2.2], ['emote', 'me', '🐔'], ['emote', 'me', '🐔'], ['emote', 'me', '🐔']], result: 'After 6 months you can juggle 5 rubber chickens. Your life is complete. 🐔🤡', stats: { happy: 10 }, highlight: 'Learned to juggle 5 rubber chickens' },
    ],
  });

  moment({
    id: 'celebrity', ages: [18, 70], scene: 'street', cast: { star: 'new:celebrity', a: 'new:adult' },
    at: { star: [2.0, 1.4, -1.2], a: [3.6, 2.2, -1.2] },
    start: [['flash'], ['emote', 'a', '📸']],
    text: '🌟 OMG! The super famous movie star <b>{star}</b> is walking down YOUR street!',
    choices: [
      { good: 'Ask politely for a photo', do: [['walk', 'me', 'star'], ['say', 'me', 'Hi! Could I please have a photo?'], ['pose', 'star', 'wave', 1.2], ['flash']], result: '{star} says yes AND follows you on social media! 📸😇', stats: { happy: 10, looks: 2 }, highlight: 'Took a selfie with movie star {star}' },
      { evil: 'Sell their location to the paparazzi', do: [['pose', 'me', 'phone', 1.6], ['flash'], ['flash'], ['pose', 'star', 'angry', 1.4]], result: '+$800! {star} has to run away from 50 photographers. 😈', stats: { money: 800 } },
      { funny: 'Pretend YOU are the famous one', do: [['walk', 'me', [0.6, 1.6]], ['pose', 'me', 'wave', 1.4], ['say', 'me', 'No autographs please! I\'m VERY famous!'], ['pose', 'star', 'laugh', 1.6]], result: '{star} laughs and gives YOU an autograph that says "To the funniest fan!" 🌟🤡', stats: { happy: 9 }, friend: 'star', highlight: 'Became friends with movie star {star}' },
    ],
  });

  moment({
    id: 'ufo', ages: [18, 90], scene: 'park', cast: { zorp: 'new:alien' }, weight: 0.3,
    at: { zorp: [2.4, -0.6, -0.8] }, hidden: ['zorp'], react: false,
    start: [['shake', 1], ['flash', '#aaffaa'], ['show', 'zorp'], ['poof', 'zorp'], ['say', 'zorp', 'GREETINGS, EARTHLING. TAKE ME TO YOUR LEADER.']],
    text: '🛸 A UFO lands in the park and a little green alien walks out!',
    choices: [
      { good: 'Welcome it to Earth and show it around', do: [['walk', 'me', 'zorp'], ['pose', 'me', 'wave', 1.2], ['say', 'me', 'Welcome to Earth! Want some pizza?'], ['pose', 'zorp', 'cheer', 1.4]], result: 'Zorp LOVES pizza. Zorp gives you a glowing space rock as a thank you. 👽🍕😇', stats: { happy: 12, smarts: 5 }, friend: 'zorp', highlight: 'Became friends with an alien' },
      { evil: 'Try to sell the alien on the internet', do: [['pose', 'me', 'phone', 1.4], ['say', 'zorp', 'RUDE.'], ['poof', 'zorp'], ['hide', 'zorp']], result: 'The alien zaps your phone and flies away. Your phone now only plays polka music. 😈', stats: { happy: -3 } },
      { funny: 'Teach it the chicken dance', do: [['walk', 'me', 'zorp'], ['pose', 'me', 'silly', 1.6], ['pose', 'zorp', 'silly', 2]], result: 'The chicken dance is now the most popular dance on planet Zorg. 🐔👽🤡', stats: { happy: 12 }, friend: 'zorp', highlight: 'Taught an alien the chicken dance' },
    ],
  });

  moment({
    id: 'hotdog', ages: [18, 75], repeat: 6, scene: 'street', cast: { a: 'new:worker', b: 'new:kid' },
    at: { a: [1.6, 2.0, -0.6], b: [2.8, 1.6, -1.2] },
    start: [['spawn', 'counter', [1.6, 1.3], 'stand', { w: 1.4 }]],
    text: '🌭 The hot dog stand smells AMAZING. A little kid named <b>{b}</b> is looking at the hot dogs, but has no money.',
    choices: [
      { good: 'Buy a hot dog for the kid too', cost: 8, do: [['walk', 'me', [0.6, 1.9]], ['give', 'me', 'b', 'burger'], ['pose', 'b', 'cheer', 1.4]], result: 'The kid is SO happy! Your heart feels warm. 🌭😇', stats: { happy: 8 } },
      { evil: 'Eat your hot dog right in front of the kid', cost: 4, do: [['walk', 'me', [0.6, 1.9]], ['hold', 'me', 'burger'], ['face', 'me', 'b'], ['pose', 'me', 'eatStand', 2], ['pose', 'b', 'cry', 1.4]], result: 'Mmm. Delicious. And so, so mean. 😈', stats: { happy: 3 } },
      { funny: 'Challenge the seller to a hot dog eating contest', cost: 10, do: [['walk', 'me', [0.6, 1.9]], ['pose', 'me', 'eatStand', 2.4], ['emote', 'me', '🌭🌭🌭'], ['pose', 'b', 'laugh', 1.4]], result: 'You eat 11 hot dogs! You win a hat that says "HOT DOG CHAMP". 🌭🏆🤡', stats: { happy: 8, health: -4 }, highlight: 'Hot dog eating champion' },
    ],
  });

  moment({
    id: 'ducks', ages: [18, 100], repeat: 8, scene: 'park', cast: { a: 'new:old' },
    at: { me: 'pond', a: [4.0, -1.1, -2.4] },
    start: [['face', 'me', [3.5, -3.6]], ['hold', 'me', 'cookie']],
    text: '🦆 You\'re at the pond. The ducks are swimming over to you, quacking for bread.',
    choices: [
      { good: 'Feed them healthy duck food', do: [['throw', 'me', [3.5, -3.0], 'cookie', false], ['emote', 'me', '🦆']], result: 'The ducks follow you around the park like a parade. 🦆🦆🦆😇', stats: { happy: 6 } },
      { evil: 'Pretend to throw bread, but don\'t', do: [['pose', 'me', 'throw', 0.8], ['pose', 'me', 'evilLaugh', 1.4], ['emote', 'me', '🦆💢']], result: 'The ducks are FURIOUS. One of them bites your shoe. 😈', stats: { happy: 3, health: -1 } },
      { funny: 'Quack at them in duck language', do: [['say', 'me', 'QUACK! Quack quack. QUAAACK.'], ['pose', 'a', 'laugh', 1.4]], result: 'You accidentally become the leader of the ducks. 👑🦆🤡', stats: { happy: 7 }, friend: 'a' },
    ],
  });

  moment({
    id: 'carRace', ages: [18, 70], repeat: 6, scene: 'street', need: (l) => l.cars.some((c) => c.kind !== 'bike'), cast: { car: 'car', rival: 'car:sports' }, car: false,
    at: { car: [-6, -3.2, 1.57], rival: [-6, -6.0, 1.57] },
    start: [['ride', 'me', 'car'], ['cam', 'both', 'car', 'rival']],
    text: '🚦 You stop at a red light in your {car}. The guy in the sports car next to you revs his engine. VROOM VROOM! He wants to RACE!',
    choices: [
      { good: 'Wait for the green light and drive safely', do: [['wait', 1], ['drive', 'car', [16, -3.2], 4]], result: 'Safe and sound! The other guy gets a speeding ticket. 🚓😇', stats: { happy: 3 } },
      { evil: 'RACE HIM!', do: [['together', [['drive', 'car', [30, -3.2], 16]], [['drive', 'rival', [30, -6], 15]]], ['shake', 0.6]],
        luck: [
          { chance: 0.5, result: 'You WIN! ...and the police see you. $300 ticket! 🚓😈', stats: { happy: 6, money: -300 } },
          { chance: 0.5, result: 'You lose AND get a ticket. Double fail! 🚓😈', stats: { happy: -2, money: -300 } },
        ] },
      { funny: 'Open the window and sing opera at him', do: [['say', 'me', '🎵 FIGARO! FIGAROOOO! 🎵'], ['wait', 1], ['drive', 'rival', [30, -6], 10], ['drive', 'car', [16, -3.2], 4]], result: 'He drives away really fast, confused. You win by being weird! 🎭🤡', stats: { happy: 7 } },
    ],
  });

  moment({
    id: 'bossParty', ages: [20, 64], repeat: 6, scene: 'office', need: (l) => !!l.job && l.job.id === 'office', cast: { boss: 'boss', a: 'new:coworker', b: 'new:coworker' },
    at: { boss: [1.0, 0.0, -0.8], a: [2.6, 0.6, -1.2], b: [-1.6, 0.4, 1.2] }, pose: { a: 'dance' },
    start: [['spawn', 'table', [0, -0.3], 'tb'], ['spawn', 'cake', [0, -0.3, 0, 0.77], 'ck']],
    text: '🎊 It\'s the office party! The boss <b>{boss}</b> is wearing a party hat and doing karaoke...',
    choices: [
      { good: 'Clap and cheer for the boss', do: [['pose', 'me', 'clap', 1.6], ['pose', 'boss', 'sing', 1.6]], result: 'The boss is SO happy. "You\'re my favorite!" 📈😇', run: (l, api) => api.perf(10), stats: { happy: 4 } },
      { evil: 'Record it and post it online', do: [['pose', 'me', 'film', 1.6], ['pose', 'boss', 'sing', 1.6], ['flash']], result: 'It gets 5 million views. The boss is famous and FURIOUS. 📉😈', run: (l, api) => api.perf(-15), stats: { happy: 6 } },
      { funny: 'Join the karaoke and do a duet', do: [['walk', 'me', 'boss'], ['pose', 'me', 'sing', 2.4], ['pose', 'boss', 'sing', 2.4], ['pose', 'b', 'laugh', 1.4]], result: 'Your duet is legendary. Everyone at work talks about it for years. 🎤🤡', run: (l, api) => api.perf(5), stats: { happy: 9 }, friend: 'b' },
    ],
  });

  moment({
    id: 'petBirthday', ages: [5, 100], repeat: 4, scene: 'myhome', cast: { pet: 'pet' },
    at: { pet: [0.8, 0.6, -0.5] }, pet: false,
    text: '🐾 It\'s <b>{pet}</b>\'s birthday! {pet} is looking at you with big eyes...',
    choices: [
      { good: 'Give {pet} a special treat and lots of cuddles', do: [['walk', 'me', 'pet'], ['pose', 'me', 'kneel', 1.4], ['pose', 'pet', 'happy', 1.6], ['emote', 'pet', '💕']], result: '{pet} is the happiest pet in the whole world! 🦴😇', stats: { happy: 6 }, love: { pet: 15 } },
      { evil: 'Eat {pet}\'s birthday treat yourself', do: [['pose', 'me', 'eatStand', 1.6], ['emote', 'pet', '😢']], result: 'It tasted like... pet food. Why did you do that? 😈', stats: { happy: 1, health: -2 }, love: { pet: -10 } },
      { funny: 'Throw {pet} a birthday party with party hats', do: [['confetti', 'pet'], ['pose', 'me', 'dance', 2], ['pose', 'pet', 'happy', 2]], result: '{pet} wears a party hat for ONE second before eating it. 🎉🤡', stats: { happy: 7 }, love: { pet: 8 } },
    ],
  });

  // ============================================================
  //  🧓 OLD (65+)
  // ============================================================
  moment({
    id: 'bingo', ages: [65, 110], repeat: 3, scene: 'oldhome', cast: { a: 'new:old', b: 'new:old' },
    at: { me: 'bingoC', a: 'bingoA', b: 'bingoB' }, pose: { me: 'sit', a: 'sit', b: 'sit' },
    start: [['cam', 'both', 'a', 'b']],
    text: '🎱 BINGO NIGHT at Sunny Days! You need ONE more number to win... <b>{a}</b> also needs one more number!',
    choices: [
      { good: 'Let {a} win and cheer for them', do: [['say', 'a', 'BINGO!'], ['pose', 'me', 'clap', 1.6]], result: '{a} wins a fruit basket and shares it with you! 🍎😇', stats: { happy: 5 }, friend: 'a' },
      { evil: 'Cheat by changing your numbers', do: [['pose', 'me', 'sneak', 1], ['say', 'me', 'BINGO!!! I WIN!'], ['pose', 'a', 'angry', 1.4]], result: 'You win the fruit basket. {a} knows. {a} will remember. 😈', stats: { happy: 5 } },
      { funny: 'Shout "BINGO!" when you haven\'t won', do: [['say', 'me', 'BINGO!!!'], ['say', 'b', 'You don\'t have bingo...'], ['pose', 'me', 'silly', 1.2], ['pose', 'a', 'laugh', 1.6]], result: 'You do it 7 more times. Everyone laughs every time. 🤡', stats: { happy: 8 }, friend: 'b' },
    ],
  });

  moment({
    id: 'chairRace', ages: [68, 110], scene: 'oldhome', cast: { a: 'new:old', b: 'new:old' },
    at: { me: [-4.4, 1.6, 1.57], a: [-4.4, 0.6, 1.57], b: [3.0, 0.8, -0.6] },
    text: '🏁 <b>{a}</b> challenges you to a race down the hallway! "Last one to the piano is a rotten egg!"',
    choices: [
      { good: 'Race fair and square', do: [['together', [['run', 'me', [3.6, 1.6]]], [['run', 'a', [3.8, 0.6]]]], ['pose', 'b', 'clap', 1.4]],
        luck: [
          { chance: (l) => 0.3 + l.stats.health / 200, do: [['pose', 'me', 'cheer', 1.4]], result: 'You WIN! You still got it! 🏆', stats: { happy: 8, health: 3 } },
          { chance: 1, do: [['pose', 'a', 'cheer', 1.4]], result: '{a} wins by a nose. You shake hands. Good race! 🤝', stats: { happy: 4, health: 3 }, friend: 'a' },
        ] },
      { evil: 'Hide {a}\'s glasses before the race', do: [['sneak', 'me', 'a'], ['emote', 'a', '👓❓'], ['together', [['run', 'me', [3.6, 1.6]]], [['walk', 'a', [0, -2.5]]]]], result: '{a} runs into the plant. You win. Shame! 😈', stats: { happy: 6 } },
      { funny: 'Race backwards while singing', do: [['face', 'me', [-6, 1.6]], ['walk', 'me', [3.6, 1.6], 1.6], ['say', 'me', '🎵 I\'m the fastest grandparent in the WEST! 🎵'], ['pose', 'b', 'laugh', 1.4]], result: 'You lose, but you are a LEGEND at Sunny Days now. 🤡', stats: { happy: 9 }, friend: 'b' },
    ],
  });

  moment({
    id: 'piano', ages: [65, 110], repeat: 5, scene: 'oldhome', cast: { a: 'new:old', b: 'new:old' },
    at: { me: 'piano', a: 'chairA', b: 'chairB' }, pose: { me: 'sit', a: 'sit', b: 'sit' },
    start: [['face', 'me', [3.4, -3.0]]],
    text: '🎹 Everyone at Sunny Days asks you to play the piano!',
    choices: [
      { good: 'Play everyone\'s favorite old song', do: [['pose', 'me', 'type', 2.4], ['sound', 'song'], ['pose', 'a', 'clap', 1.4], ['pose', 'b', 'clap', 1.4]], result: 'Everybody sings along. Some people cry happy tears. 🎶😇', stats: { happy: 8 }, friend: 'a' },
      { evil: 'Play the same note for 20 minutes', do: [['pose', 'me', 'type', 2.4], ['emote', 'a', '😫'], ['emote', 'b', '😫']], result: 'PLONK. PLONK. PLONK. Everyone leaves the room. 😈', stats: { happy: 5 } },
      { funny: 'Play with your elbows', do: [['pose', 'me', 'silly', 2.4], ['sound', 'boing'], ['pose', 'a', 'laugh', 1.6], ['pose', 'b', 'laugh', 1.6]], result: 'It sounds terrible and it is AMAZING. 🎹🤡', stats: { happy: 9 } },
    ],
  });

  moment({
    id: 'advice', ages: [65, 110], repeat: 4, scene: 'park', cast: { a: 'new:kid', b: 'new:kid' },
    at: { me: 'bench', a: [-4.2, 1.2, -1.5], b: [-4.0, 0.0, -1.5] }, pose: { me: 'sit' },
    text: '🧒 Two kids sit next to you on the bench. "Excuse me... you\'re really old. What\'s the secret of life?"',
    choices: [
      { good: 'Be kind, and the world is kind to you', do: [['say', 'me', 'Be kind to everyone. That\'s the big secret.'], ['pose', 'a', 'think', 1.2], ['pose', 'b', 'clap', 1.2]], result: 'The kids think about it all day. Maybe you changed the world a little. 🌍😇', stats: { happy: 7 } },
      { evil: 'Never trust anyone. ESPECIALLY ducks.', do: [['say', 'me', 'Never trust anyone. ESPECIALLY ducks.'], ['emote', 'a', '😨'], ['run', 'a', 'far'], ['run', 'b', 'far']], result: 'The kids are now very scared of ducks. Mission accomplished. 😈', stats: { happy: 5 } },
      { funny: 'Always wear clean underwear', do: [['say', 'me', 'The secret of life? ALWAYS wear clean underwear.'], ['pose', 'a', 'laugh', 1.6], ['pose', 'b', 'laugh', 1.6]], result: 'The kids laugh all the way home. Good advice, honestly. 🩲🤡', stats: { happy: 8 } },
    ],
  });

  moment({
    id: 'remember', ages: [72, 110], scene: 'oldhome', cast: { a: 'new:old' },
    at: { me: 'chairB', a: 'chairA' }, pose: { me: 'sit', a: 'sit' },
    start: [['cam', 'close', 'me']],
    text: (l) => `🌅 You sit by the window and remember your life... Do you remember when you were a baby and you <b>${l.firstChoice || 'cried a lot'}</b>?` + (l.highlights.length ? ` And the time you... <b>${l.highlights[Math.floor(Math.random() * l.highlights.length)]}</b>!` : ''),
    choices: [
      { good: 'Smile. It was a good life.', do: [['pose', 'me', 'sitTalk', 2], ['emote', 'me', '🥲']], result: 'You feel warm and happy inside. ☀️😇', stats: { happy: 10 } },
      { evil: 'Laugh about all the trouble you caused', do: [['pose', 'me', 'evilLaugh', 2.2]], result: 'Hehehe. You were a little monster. And you don\'t regret ANYTHING. 😈', stats: { happy: 8 } },
      { funny: 'Tell {a} a totally made-up story about fighting a bear', do: [['say', 'me', 'And then I punched the bear right in the nose. TRUE STORY.'], ['pose', 'a', 'laugh', 1.6]], result: '{a} doesn\'t believe you for one second. You tell it again tomorrow. 🐻🤡', stats: { happy: 9 }, friend: 'a' },
    ],
  });

  moment({
    id: 'oldDoctor', ages: [66, 110], repeat: 3, scene: 'hospital', cast: { doctor: 'new:doctor' },
    at: { me: 'bed', doctor: 'doctor' }, pose: { me: 'lie' },
    text: '🩺 You don\'t feel very well, so you visit the doctor. "Let\'s see... you need to rest more and take your vitamins."',
    choices: [
      { good: 'Do everything the doctor says', do: [['pose', 'doctor', 'give', 1], ['emote', 'me', '💊']], result: 'You feel much better after a few weeks! 💪😇', stats: { health: 12 } },
      { evil: 'Escape from the hospital at night', do: [['pose', 'me', 'stand'], ['sneak', 'me', 'door']], result: 'You escape to get a cheeseburger. Worth it, but your body says NO. 🍔😈', stats: { health: -4, happy: 8 } },
      { funny: 'Pretend to be a robot so the doctor fixes you faster', do: [['say', 'me', 'BEEP BOOP. PLEASE INSTALL NEW KNEES.'], ['pose', 'doctor', 'laugh', 1.6]], result: 'The doctor laughs so much they forget to charge you! 🤖🤡', stats: { health: 8, happy: 5 } },
    ],
  });

  moment({
    id: 'oldDance', ages: [70, 110], scene: 'oldhome', cast: { a: 'new:old', b: 'new:old', c: 'new:old' },
    at: { a: 'a', b: 'b', c: 'c' },
    start: [['sound', 'song']],
    text: '💃 It\'s the Sunny Days DANCE CONTEST! The prize is a golden walking stick!',
    choices: [
      { good: 'Dance with someone who has no partner', do: [['walk', 'me', 'c'], ['pose', 'me', 'dance', 2.4], ['pose', 'c', 'dance', 2.4]], result: '<b>{c}</b> hasn\'t danced in 20 years. Now they can\'t stop smiling. 💃😇', stats: { happy: 9, health: 3 }, friend: 'c' },
      { evil: 'Put marbles on the dance floor', do: [['sneak', 'me', [0, 0]], ['pose', 'a', 'fall', 1.6], ['pose', 'b', 'fall', 1.6], ['pose', 'me', 'dance', 1.6]], result: 'You are the only one left standing. You win the golden stick! 🏆😈', stats: { happy: 8 }, highlight: 'Won the golden walking stick (with marbles)' },
      { funny: 'Do the worm', do: [['pose', 'me', 'lie', 0.6], ['pose', 'me', 'silly', 1.6], ['pose', 'a', 'cheer', 1.4], ['pose', 'b', 'cheer', 1.4], ['confetti', 'me']], result: 'An old-timer doing the WORM?! You win by a mile! 🐛🏆🤡', stats: { happy: 12 }, highlight: 'Won the golden walking stick doing the worm' },
    ],
  });

  // ============================================================
  //  🕊️ THE END
  // ============================================================
  const death = {
    id: 'death', scene: 'hospital', react: false,
    cast: { a: 'friend', b: (l) => ML.Life.family()[0] || null },
    at: { me: 'bed', a: 'a', b: 'b' }, pose: { me: 'lie' }, pet: false,
    start: [['cam', 'close', 'me']],
    text: (l) => `🌙 You are ${l.age} years old. You lived a long, long life. Your friends are here with you. It is time to say goodbye... What are your last words?`,
    choices: [
      { good: '"I love you all. Be kind to each other."', do: [['say', 'me', 'I love you all. Be kind to each other.'], ['pose', 'a', 'cry', 2], ['pose', 'me', 'sleep']], result: 'You close your eyes with a smile. 🕊️' },
      { evil: '"I left all my money to my cat. HA!"', do: [['say', 'me', 'I left ALL my money... to my cat. HAHAHA!'], ['pose', 'me', 'evilLaugh', 1.6], ['pose', 'a', 'facepalm', 1.4], ['pose', 'me', 'sleep']], result: 'Your last laugh echoes through the hospital. 🕊️😈' },
      { funny: '"I\'m not dead yet!" and do one last dance', do: [['pose', 'me', 'stand'], ['say', 'me', 'I\'m not dead yet!'], ['pose', 'me', 'dance', 2.2], ['pose', 'a', 'laugh', 1.4], ['pose', 'me', 'sleep']], result: 'Everyone laughs through their tears. What a way to go! 🕊️🤡' },
    ],
  };

  const byId = {};
  list.forEach((m) => { byId[m.id] = m; });
  return { list, byId, birth, death, moment };
})();
