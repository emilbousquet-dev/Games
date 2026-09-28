// ============================================================
//  FLOPPY PARTY — SOUNDS AND MUSIC (all made with code)
// ============================================================
window.FP = window.FP || {};

FP.Audio = (function () {
  let ctx = null, master = null, musicGain = null, duckGain = null, sfxGain = null, vols = [0.8, 0.6, 0.8], musicOn = true, song = 'party', step = 0;

  function start() {
    // (wake the sound up again if the browser paused it, for example after switching tabs)
    if (ctx) { if (ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => {}); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      // music -> music volume -> "quieter while paused" -> everything
      duckGain = ctx.createGain(); duckGain.gain.value = ducked ? 0.35 : 1; duckGain.connect(master);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(duckGain);
      sfxGain = ctx.createGain(); sfxGain.gain.value = 1; sfxGain.connect(master);
      setVolumes(...vols);
      setInterval(schedule, 25);
    } catch (e) { ctx = null; }
  }

  function tone(type, f1, f2, dur, vol = 0.3, when = 0, dest = null) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || sfxGain || master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.3, freq = 1500, when = 0, dest = null, q = 0.8) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(dest || sfxGain || master);
    src.start(t);
  }

  const rnd = (a, b) => a + Math.random() * (b - a);
  const S = {
    jump: () => tone('sine', rnd(260, 320), rnd(700, 820), 0.16, 0.2),
    whoosh: () => noise(0.16, 0.18, rnd(700, 1100)),
    hit: () => { noise(0.1, 0.7, rnd(1800, 2600)); tone('sine', rnd(240, 290), 80, 0.16, 0.4); noise(0.06, 0.3, 300, 0, null, 1.5); },
    bonk: () => { tone('triangle', 520, 180, 0.2, 0.3); tone('sine', 1040, 600, 0.12, 0.12); },
    ko: () => { tone('square', 700, 90, 0.5, 0.12); for (let i = 0; i < 5; i++) tone('triangle', 1500 - i * 120, 1600 - i * 120, 0.07, 0.07, 0.3 + i * 0.08); },
    grab: () => tone('square', 320, 240, 0.08, 0.1),
    yeet: () => { noise(0.3, 0.25, 800); tone('sine', 300, 900, 0.25, 0.12); },
    squeak: () => tone('sine', rnd(900, 1200), rnd(1300, 1600), 0.06, 0.08),
    fall: () => tone('sine', rnd(700, 900), 110, 1.1, 0.14),
    splash: () => noise(0.6, 0.4, 500),
    cheer: () => { for (let i = 0; i < 6; i++) noise(0.7, 0.08, rnd(800, 2400), i * 0.05, null, 3); },
    beep: () => tone('square', 660, 660, 0.12, 0.12),
    go: () => { tone('square', 990, 990, 0.35, 0.14); tone('square', 1320, 1320, 0.35, 0.08); },
    win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone('square', f, f, 0.2, 0.1, i * 0.11)),
    goal: () => { S.cheer(); [784, 988, 1175, 1568].forEach((f, i) => tone('square', f, f, 0.16, 0.1, i * 0.09)); },
    coin: () => { tone('square', 988, 988, 0.07, 0.1); tone('square', 1319, 1319, 0.2, 0.1, 0.07); },
    alarm: () => { for (let i = 0; i < 4; i++) tone('sawtooth', i % 2 ? 600 : 800, i % 2 ? 600 : 800, 0.18, 0.06, i * 0.2); },
    menu: () => tone('square', 660, 880, 0.05, 0.07),
    tick: () => tone('sine', 1500, 1300, 0.025, 0.035),
    pop: () => tone('sine', 420, 880, 0.07, 0.06),
    buy: () => { [1047, 1319, 1568, 2093].forEach((f, i) => tone('square', f, f, 0.08, 0.07, i * 0.06)); noise(0.05, 0.12, 5000, 0.26); },
    star: () => { tone('triangle', 1568, 2093, 0.18, 0.1); tone('sine', 3136, 3136, 0.16, 0.04, 0.05); },
    fanfare: () => { [523, 659, 784].forEach((f, i) => tone('square', f, f, 0.11, 0.09, i * 0.12)); tone('square', 1047, 1047, 0.45, 0.1, 0.36); tone('square', 784, 784, 0.45, 0.05, 0.36); },
    aww: () => { tone('triangle', 520, 300, 0.5, 0.1); tone('triangle', 400, 230, 0.6, 0.08, 0.14); },
    thud: () => { tone('sine', 150, 55, 0.14, 0.28); noise(0.08, 0.14, 320); },
    step: () => tone('sine', 210, 90, 0.07, 0.1),
    ding: () => { tone('sine', 1320, 1320, 0.28, 0.09); tone('sine', 1980, 1980, 0.2, 0.05, 0.03); },
    select: () => { tone('square', 880, 880, 0.05, 0.08); tone('square', 1320, 1320, 0.08, 0.08, 0.05); },
    boing: () => { tone('sine', rnd(180, 220), rnd(600, 700), 0.18, 0.22); tone('triangle', 400, 1200, 0.1, 0.08, 0.04); },
    cluck: () => { for (let i = 0; i < 2; i++) tone('square', rnd(500, 650), rnd(900, 1100), 0.05, 0.05, i * 0.09); },
    splat: () => { noise(0.18, 0.35, rnd(300, 500)); tone('sine', 200, 70, 0.15, 0.2); },
    plop: () => { tone('sine', 900, 200, 0.18, 0.2); tone('sine', 400, 120, 0.3, 0.12, 0.1); },
    voice: () => { for (let i = 0; i < 3; i++) { const f = rnd(350, 800); tone('triangle', f, f * rnd(0.8, 1.4), 0.08, 0.08, i * 0.08); } },
  };
  function play(name) { if (ctx && S[name]) S[name](); }

  // ------------------------------------------------------------
  //  CHARACTER VOICES: silly little chirps (like Animal Crossing).
  //  Every character has its own voice pitch (c.voice).
  // ------------------------------------------------------------
  function syll(f1, f2, dur, when = 0, vol = 0.06) {
    tone('triangle', f1, f2, dur, vol, when);
    tone('square', f1 * 2, f2 * 2, dur, vol * 0.22, when);
  }
  function voice(c, kind) {
    if (!ctx || !c) return;
    const now = ctx.currentTime;
    if (c.voiceT && now - c.voiceT < 0.22 && kind !== 'ko') return; // don't talk over yourself
    c.voiceT = now;
    const p = (c.voice || 1) * rnd(0.95, 1.05);
    if (kind === 'hurt') syll(430 * p, 250 * p, 0.12);
    else if (kind === 'ko') { syll(520 * p, 200 * p, 0.3, 0, 0.07); syll(320 * p, 140 * p, 0.3, 0.26, 0.05); }
    else if (kind === 'hup') syll(330 * p, 470 * p, 0.07, 0, 0.035);
    else if (kind === 'wee') syll(380 * p, 950 * p, 0.45, 0, 0.06);
    else if (kind === 'eep') syll(700 * p, 840 * p, 0.08, 0, 0.05);
    else if (kind === 'yay') { syll(440 * p, 660 * p, 0.12, 0, 0.06); syll(660 * p, 900 * p, 0.2, 0.13, 0.06); }
  }
  FP.bus.on('punchHit', (e) => { if (e && e.victim) voice(e.victim, 'hurt'); });
  FP.bus.on('knockOut', (c) => voice(c, 'ko'));
  FP.bus.on('jump', (c) => { if (Math.random() < 0.35) voice(c, 'hup'); });
  FP.bus.on('throw', (e) => { if (e && e.who && e.who.bodies) voice(e.who, 'wee'); });
  FP.bus.on('grab', (e) => { if (e && e.victim) voice(e.victim, 'eep'); });
  FP.bus.on('emote', (c) => { if (c && c.emote && c.emote.k === 3) voice(c, 'yay'); });

  // the music gets quieter while the game is paused
  let ducked = false;
  // (its own volume knob, so it can never mix up the music volume from Settings)
  function duck(on) {
    on = !!on;
    if (on === ducked) return;
    ducked = on;
    if (!ctx || !duckGain) return;
    const g = duckGain.gain, t = ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(on ? 0.35 : 1, t + 0.25);
  }

  // volumes from 0 to 1 (the settings screen changes these)
  function setVolumes(m, mu, fx) {
    vols = [m, mu, fx];
    if (!ctx) return;
    master.gain.value = 0.62 * m;
    musicGain.gain.value = 0.27 * mu;
    sfxGain.gain.value = fx;
  }

  // ------------------------------------------------------------
  //  MUSIC: songs made of chords, a bass line, soft arpeggios,
  //  a melody and drums. Notes are scheduled a little ahead of
  //  time so the beat stays steady.
  // ------------------------------------------------------------
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // melody: 64 steps (4 bars of 16th notes). A number is a note, '.' is a rest, '-' holds the note longer
  const SONGS = {
    menu: { bpm: 106, chords: [[55, 'M'], [52, 'm'], [48, 'M'], [50, 'M']], lead: 'triangle', arp: true, bass: 'x.....x.x.......',
      drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' },
      mel: '79 . . 83 . . 86 . 83 . . . 81 . . . 79 . . 83 . . 88 . 86 . . . 83 . . . 76 . . 79 . . 84 . 83 . . . 81 . . . 78 . . 81 . . 86 . 84 - 83 . 81 . . .' },
    party: { bpm: 124, chords: [[60, 'M'], [57, 'm'], [53, 'M'], [55, 'M']], lead: 'square', arp: true, bass: 'x..x..x.x..x..x.',
      drums: { k: 'x...x...x...x...', s: '....x.......x..x', h: '..x...x...x...xx' },
      mel: '72 . 76 . 79 . 76 . 81 . 79 . 76 . 74 . 72 . 76 . 81 . 79 . 76 . 72 . 69 . 71 . 72 . 77 . 81 . 77 . 84 . 81 . 77 . 76 . 74 . 79 . 83 . 79 . 86 - 83 . 79 . 74 .' },
    tense: { bpm: 136, chords: [[57, 'm'], [53, 'M'], [55, 'M'], [52, 'M']], lead: 'sawtooth', arp: true, bass: 'x.x.x.x.x.x.x.x.',
      drums: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
      mel: '69 . 72 . 76 . 72 . 74 . 72 . 71 . 69 . 65 . 69 . 72 . 69 . 71 . 69 . 67 . 65 . 67 . 71 . 74 . 71 . 72 . 71 . 69 . 67 . 68 . 71 . 76 . 71 . 74 - 72 . 71 . 68 .' },
    race: { bpm: 156, chords: [[62, 'M'], [59, 'm'], [55, 'M'], [57, 'M']], lead: 'square', arp: true, bass: 'x.xxx.xxx.xxx.xx',
      drums: { k: 'x...x...x...x...', s: '....x.......x.x.', h: 'xxxxxxxxxxxxxxxx' },
      mel: '74 74 78 . 81 . 78 . 86 . 81 . 78 . 76 . 74 74 78 . 83 . 78 . 86 . 83 . 78 . 74 . 74 74 79 . 83 . 79 . 86 . 83 . 79 . 78 . 76 76 81 . 85 . 81 . 88 - 85 . 81 . 76 .' },
    chill: { bpm: 94, chords: [[53, 'M'], [50, 'm'], [46, 'M'], [48, 'M']], lead: 'triangle', arp: true, bass: 'x.......x..x....',
      drums: { k: 'x.......x.x.....', s: '....x.......x...', h: '..x.x.x...x.x.xx' },
      mel: '77 . . . 81 . . 79 . . 77 . . . 76 . 74 . . . 77 . . 76 . . 74 . . . 72 . 70 . . . 74 . . 77 . . 76 . . . 74 . 72 . . . 76 . . 79 . - . 77 . 76 . . .' },
    spooky: { bpm: 100, chords: [[50, 'm'], [46, 'M'], [43, 'm'], [45, 'M']], lead: 'triangle', arp: true, bass: 'x.....x.........',
      drums: { k: 'x.......x.......', s: '............x...', h: '....x.......x...' },
      mel: '74 . . 77 . . 76 . 74 . . . 73 . . . 74 . . 77 . . 81 . 79 . . . 77 . . . 74 . . 70 . . 72 . 74 . . . 76 . . . 73 . . 76 . . 79 . 81 - - . 76 . . .' },
    circus: { bpm: 144, chords: [[62, 'M'], [57, 'M'], [57, 'M'], [62, 'M']], lead: 'square', arp: false, bass: 'x...x...x...x...',
      drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' },
      mel: '74 73 74 . 81 . 79 78 79 . 76 . 74 76 78 . 76 75 76 . 81 . 79 78 79 . 76 . 73 76 79 . 76 75 76 . 85 . 83 82 83 . 79 . 76 79 81 . 78 77 78 . 86 . 85 83 81 . 78 . 74 . . .' },
  };
  for (const k in SONGS) SONGS[k].notes = SONGS[k].mel.split(' ');

  let nextTime = 0, playing = null, loop = 0;
  function playStep(sg, i, when) {
    const bar = Math.floor(i / 16) % 4, st = i % 16;
    const [root, q] = sg.chords[bar];
    const third = root + (q === 'm' ? 3 : 4), fifth = root + 7;
    const sixteenth = 60 / sg.bpm / 4;
    const at = Math.max(0, when - ctx.currentTime);
    // bass (root, and the fifth now and then)
    if (sg.bass[st] === 'x') { const n = (st === 8 || st === 14 ? fifth : root) - 12; tone('triangle', midi(n), midi(n), sixteenth * 1.8, 0.5, at, musicGain); }
    // soft arpeggio of the chord
    if (sg.arp) { const arp = [root, third, fifth, root + 12]; const n = arp[st % 4] + 12; tone('square', midi(n), midi(n), sixteenth * 0.9, 0.035, at, musicGain); }
    // the melody (it drops out every 4th time around, and goes up high on the last time)
    const sect = loop % 4;
    const tok = sg.notes[i % 64];
    if (tok !== '.' && tok !== '-' && sect !== 0) {
      let len = 1; while (sg.notes[(i + len) % 64] === '-' && len < 8) len++;
      const n = +tok + (sect === 3 ? 12 : 0);
      tone(sg.lead, midi(n), midi(n), sixteenth * len * 0.95, sg.lead === 'sawtooth' ? 0.06 : 0.1, at, musicGain);
    }
    // drums
    if (sg.drums.k[st] === 'x') tone('sine', 150, 42, 0.16, 0.7, at, musicGain);
    if (sg.drums.s[st] === 'x') { noise(0.12, 0.32, 1900, at, musicGain, 0.7); tone('triangle', 220, 140, 0.07, 0.18, at, musicGain); }
    if (sg.drums.h[st] === 'x') noise(0.035, 0.12, 8500, at, musicGain, 1.2);
  }
  function schedule() {
    if (!ctx || !musicOn || ctx.state !== 'running' || song === 'silent') { if (ctx) nextTime = ctx.currentTime + 0.05; return; }
    const sg = SONGS[song] || SONGS.party;
    if (playing !== song) { playing = song; step = 0; loop = 1; nextTime = ctx.currentTime + 0.05; }
    if (nextTime < ctx.currentTime - 0.2) nextTime = ctx.currentTime + 0.05; // the tab was asleep: don't play a pile of old notes
    while (nextTime < ctx.currentTime + 0.12) {
      playStep(sg, step, nextTime);
      nextTime += 60 / sg.bpm / 4;
      step++;
      if (step % 64 === 0) loop++;
    }
  }

  // a go-kart engine hum: higher when you go faster (0 = off)
  let eng = null;
  function engine(speed) {
    if (!ctx) return;
    if (!eng && speed > 0) {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0;
      o.connect(f); o2.connect(f); f.connect(g); g.connect(sfxGain || master);
      o.start(); o2.start();
      eng = { o, o2, g };
    }
    if (!eng) return;
    const t = ctx.currentTime, on = speed > 0;
    eng.o.frequency.setTargetAtTime(45 + speed * 6, t, 0.08);
    eng.o2.frequency.setTargetAtTime(22 + speed * 3, t, 0.08);
    eng.g.gain.setTargetAtTime(on ? 0.05 + Math.min(1, speed / 20) * 0.05 : 0, t, 0.1);
  }

  // react to things happening
  const bus = FP.bus;
  bus.on('jump', () => play('jump'));
  bus.on('punch', () => play('whoosh'));
  bus.on('punchHit', () => play('hit'));
  bus.on('punchProp', () => play('bonk'));
  bus.on('knockOut', () => play('ko'));
  bus.on('bump', () => play('bonk'));
  bus.on('grab', () => play('grab'));
  bus.on('throw', () => play('yeet'));
  bus.on('breakFree', () => play('squeak'));
  bus.on('land', (e) => play(e.hard ? 'thud' : 'step'));

  return {
    start, play,
    toggleMusic() { musicOn = !musicOn; return musicOn; },
    setSong(name) { song = name; },
    get song() { return song; },
    setVolumes,
    duck,
    voice,
    engine,
  };
})();
