// ============================================================
//  LIL' PLUT ODYSSEY — MUSIC & SOUNDS 🎵
//  Every sound is made with math (no sound files!).
//  The songs are written with numbers: 0 = the first note of
//  the scale, 1 = the next one, ... '-' = hold, '.' = quiet.
//  Try writing your own melody in SONGS below!
// ============================================================
window.LP = window.LP || {};

LP.SONGS = {
  title: {
    bpm: 92, root: 67, scale: 'major', chords: [0, 3, 4, 0, 5, 3, 4, 4], lead: 'bell', arp: 'pluck', bassInst: 'soft',
    melody: ['4---2---0---2---', '3---5---7---5---', '6---4---2---4---', '2-------4-------', '4---5---7---9---', '8---7---5---3---', '5---6---7---8---', '7---------------'],
    bass: 'x.......5.......', arpPat: '0.2.1.2.0.2.1.2.', drums: { h: '....x.......x...' },
  },
  house: {
    bpm: 108, root: 60, scale: 'major', chords: [0, 5, 3, 4, 0, 5, 3, 4], lead: 'bell', arp: 'pluck', bassInst: 'soft',
    melody: ['0.2.4.7.6-4-2---', '5.4.2.0.2-------', '3.5.7.5.4-2-4---', '4.5.6.7.8---7---', '7.6.4.2.4-5-6---', '5.2.0.2.4-------', '3.3.5.3.2.2.4.2.', '1.2.4.1.0-------'],
    bass: 'x...5...x...5...', arpPat: '0.1.2.1.0.1.2.1.', drums: { k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.' },
  },
  garden: {
    bpm: 122, root: 65, scale: 'major', chords: [0, 3, 4, 0, 5, 3, 1, 4], lead: 'flute', arp: 'pluck', bassInst: 'pluck',
    melody: ['4-2-4-7---6-4---', '3-5-7-5-3-------', '4-6-8-6-4-2-1-2-', '0-------0.2.4...', '5-4-5-7-9---8-7-', '3-5-8-7-5-------', '1-3-6-5-3-1-2-3-', '4---------2-1---'],
    bass: 'x..xo..xx..xo...', arpPat: '0.2.1.2.0.2.1.2.', drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' },
  },
  park: {
    bpm: 96, root: 62, scale: 'major', chords: [0, 4, 5, 3, 0, 4, 5, 3], lead: 'flute', arp: 'bell', bassInst: 'soft',
    melody: ['7---6-4-5---2---', '4---3-1-2-------', '5---4-2-3---5---', '3-------2-------', '9---8-7-8---6---', '8---7-4-5-------', '5-4-2-4-3---2-1-', '0---------------'],
    bass: 'x.......x...o...', arpPat: '0.1.2.3.2.1.0.1.', drums: { k: 'x.........x.....', s: '........x.......', h: '..x...x...x...x.' },
  },
  city: {
    bpm: 112, root: 57, scale: 'minor', chords: [0, 3, 6, 4, 0, 3, 6, 4], lead: 'square', arp: 'bell', bassInst: 'pluck', swing: 0.18,
    melody: ['4.4.2.4.--7.6.4.', '3---------1.2.3.', '6.6.4.6.--8.7.6.', '4-------2---1---', '7.7.6.4.--2.4.6.', '5---3---------3.', '6.4.6.8.7-6-4-6-', '4---------------'],
    bass: 'x.5.o.5.x.5.o.5.', arpPat: '..0...1...2...1.', drums: { k: 'x.....x...x.....', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx' },
  },
  dream: {
    bpm: 100, root: 63, scale: 'major', chords: [0, 5, 3, 4, 0, 5, 1, 4], lead: 'bell', arp: 'bell', bassInst: 'soft',
    melody: ['7---9-7-4---2---', '5---4---2-------', '3---5---7---8---', '7-------4-------', '9---a---9-7-4---', '5---7---8---7---', '6---5---3---1---', '4---------------'],
    bass: 'x.......5.......', arpPat: '0.2.1.3.0.2.1.3.', drums: { h: '....x.......x..x' },
  },
  chase: {
    bpm: 150, root: 52, scale: 'minor', chords: [0, 5, 6, 4], lead: 'square', arp: 'pluck', bassInst: 'saw',
    melody: ['7.7.7.4.7.9.a.9.', '7.7.7.4.5.4.2.4.', '7.7.7.4.7.9.a.c.', 'b-a-9-8-7-6-5-4-'],
    bass: 'x.xox.xox.xox.xo', arpPat: '0.1.2.1.0.1.2.1.', drums: { k: 'x...x...x...x...', s: '....x.......x..x', h: 'x.x.x.x.x.x.x.x.' },
  },
  boss: {
    bpm: 136, root: 48, scale: 'minor', chords: [0, 0, 5, 4], lead: 'square', arp: 'pluck', bassInst: 'saw',
    melody: ['7.7.a.7.c.7.b.a.', '7.7.a.7.d---c---', '7.7.a.7.c.7.b.a.', '9.9.b.9.d---e---'],
    bass: 'x..x..x.x..x..x.', arpPat: '0...1...2...1...', drums: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
  },
};

LP.Audio = (function () {
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10] };
  let ctx = null, master, sfxBus, musicBus, verb, verbSend, noiseBuf;
  let song = null, songName = '', step = 0, nextTime = 0, timer = null, muted = false;
  const lastPlayed = {};

  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = ctx.createGain(); master.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.connect(master);
    // a soft echo-y room for the music
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = ir;
    verbSend = ctx.createGain(); verbSend.gain.value = 0.25; verbSend.connect(verb);
    const vOut = ctx.createGain(); vOut.gain.value = 0.5; verb.connect(vOut); vOut.connect(musicBus);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    applyVolumes();
    if (songName) { const n = songName; songName = ''; music(n); }
  }
  function applyVolumes() {
    if (!ctx) return;
    master.gain.value = muted ? 0 : 1;
    sfxBus.gain.value = LP.settings.sfx;
    musicBus.gain.value = LP.settings.music * 0.55;
  }

  // ---------- little sound makers ----------
  function tone(type, f, t, dur, vol, opts) {
    opts = opts || {};
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + (opts.slide || dur));
    if (opts.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = opts.vib; lg.gain.value = f * 0.02; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.1); }
    const a = opts.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    if (opts.hold) g.gain.setValueAtTime(vol, t + opts.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (opts.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = opts.lp; f2.Q.value = opts.q || 0.7; o.connect(f2); node = f2; }
    node.connect(g);
    g.connect(opts.bus || sfxBus);
    if (opts.verb) g.connect(verbSend);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, vol, type, f, opts) {
    opts = opts || {};
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f || 1000, t); fl.Q.value = opts.q || 1;
    if (opts.to) fl.frequency.exponentialRampToValueAtTime(opts.to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(opts.bus || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }
  // a baby voice: a buzzy tone through "mouth" filters (makes vowel sounds!)
  function voice(t, dur, f0, f1, vowel, vol) {
    const V = { a: [850, 1600], e: [500, 2300], o: [500, 900], u: [350, 700] }[vowel || 'a'];
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur);
    const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = 9; vg.gain.value = f0 * 0.05; vib.connect(vg); vg.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.04); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const ff of V) {
      const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = ff; b.Q.value = 6;
      o.connect(b); b.connect(g);
    }
    g.connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.05); vib.start(t); vib.stop(t + dur + 0.05);
  }

  let milkCombo = 0, milkT = 0;
  const SFX = {
    jump(t) { tone('square', 300, t, 0.14, 0.07, { to: 640, slide: 0.1, lp: 2500 }); },
    wallJump(t) { tone('square', 380, t, 0.12, 0.07, { to: 820, slide: 0.08, lp: 2500 }); noise(t, 0.06, 0.12, 'highpass', 3000); },
    land(t, v) { tone('sine', 120, t, 0.12, 0.25 * (v || 0.5), { to: 50 }); noise(t, 0.08, 0.1 * (v || 0.5), 'lowpass', 600); },
    step(t) { noise(t, 0.04, 0.05, 'bandpass', 900 + Math.random() * 400, { q: 2 }); },
    slap(t) { noise(t, 0.09, 0.3, 'bandpass', 2500, { to: 900, q: 0.8 }); noise(t + 0.03, 0.06, 0.4, 'highpass', 1800); },
    bigSlap(t) { noise(t, 0.14, 0.35, 'bandpass', 3000, { to: 600 }); noise(t + 0.04, 0.1, 0.5, 'highpass', 1500); tone('sine', 200, t + 0.04, 0.15, 0.2, { to: 70 }); },
    poundStart(t) { tone('square', 700, t, 0.12, 0.05, { to: 200, lp: 1800 }); },
    pound(t) { tone('sine', 140, t, 0.3, 0.5, { to: 40 }); noise(t, 0.25, 0.3, 'lowpass', 500); },
    noScream(t) { voice(t, 0.25, 420, 300, 'u', 0.25); },
    scream(t) { voice(t, 0.9, 520, 760, 'a', 0.55); voice(t + 0.02, 0.9, 780, 1000, 'e', 0.18); noise(t, 0.8, 0.12, 'bandpass', 2400, { q: 0.6 }); },
    raspberry(t) { tone('sawtooth', 90, t, 0.5, 0.12, { vib: 30, lp: 900, q: 4 }); },
    cry(t) { voice(t, 0.35, 600, 420, 'a', 0.35); voice(t + 0.38, 0.3, 560, 400, 'e', 0.25); },
    bubble(t) { tone('sine', 300, t, 0.25, 0.25, { to: 1200 }); voice(t + 0.1, 0.5, 500, 380, 'o', 0.25); },
    pop(t) { tone('sine', 600, t, 0.1, 0.3, { to: 120 }); noise(t, 0.06, 0.25, 'highpass', 2000); },
    milk(t) {
      const now = ctx.currentTime;
      milkCombo = now - milkT < 0.5 ? Math.min(milkCombo + 1, 14) : 0; milkT = now;
      const scale = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31, 33];
      const f = freq(84 + scale[milkCombo]);
      tone('sine', f, t, 0.18, 0.12); tone('triangle', f * 2, t, 0.08, 0.04);
    },
    bottle(t) { [0, 4, 7, 12].forEach((n, i) => tone('triangle', freq(79 + n), t + i * 0.05, 0.2, 0.12)); },
    golden(t) { [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone('triangle', freq(72 + n), t + i * 0.06, 0.4, 0.13)); },
    heart(t) { tone('sine', freq(76), t, 0.15, 0.2); tone('sine', freq(83), t + 0.1, 0.3, 0.2); },
    duck(t) {
      // squeak squeak!
      tone('square', 1300, t, 0.12, 0.08, { to: 1800, lp: 3000 }); tone('square', 1500, t + 0.15, 0.12, 0.08, { to: 2100, lp: 3000 });
      [0, 4, 7, 12, 16].forEach((n, i) => tone('triangle', freq(72 + n), t + 0.3 + i * 0.07, 0.35, 0.12));
    },
    break(t) { noise(t, 0.25, 0.4, 'bandpass', 1200, { to: 300 }); tone('square', 180, t, 0.1, 0.06, { to: 80, lp: 900 }); },
    checkpoint(t) { [0, 7, 12].forEach((n, i) => tone('triangle', freq(79 + n), t + i * 0.08, 0.35, 0.14)); },
    spring(t) { tone('sine', 220, t, 0.35, 0.3, { to: 900, slide: 0.25, vib: 18 }); },
    spit(t) { noise(t, 0.12, 0.25, 'bandpass', 700, { to: 2000 }); tone('square', 300, t, 0.08, 0.05, { to: 150 }); },
    reflect(t) { tone('square', 900, t, 0.12, 0.08, { to: 1800, lp: 4000 }); },
    hop(t) { tone('sine', 250, t, 0.15, 0.12, { to: 500 }); },
    honk(t) { tone('sawtooth', 330, t, 0.35, 0.18, { lp: 1200, vib: 25 }); tone('sawtooth', 336, t, 0.35, 0.12, { lp: 1000 }); },
    suck(t) { noise(t, 0.8, 0.35, 'bandpass', 400, { to: 3000, q: 2 }); },
    vroom(t) { tone('sawtooth', 60, t, 0.7, 0.12, { to: 90, lp: 500 }); noise(t, 0.7, 0.1, 'bandpass', 800, { q: 3 }); },
    bossHit(t) { tone('square', 200, t, 0.25, 0.15, { to: 60, lp: 1500 }); noise(t, 0.15, 0.4, 'bandpass', 1500); },
    bossDie(t) { for (let i = 0; i < 6; i++) { noise(t + i * 0.12, 0.3, 0.3, 'lowpass', 900); tone('sine', 200 - i * 20, t + i * 0.12, 0.3, 0.2, { to: 40 }); } },
    gnomeJump(t) { voice(t, 0.4, 160, 260, 'o', 0.35); },
    slam(t) { tone('sine', 90, t, 0.5, 0.6, { to: 30 }); noise(t, 0.4, 0.4, 'lowpass', 400); },
    throw(t) { noise(t, 0.15, 0.2, 'bandpass', 1200, { to: 400 }); },
    meow(t) { voice(t, 0.45, 500, 800, 'e', 0.3); voice(t + 0.2, 0.3, 800, 450, 'o', 0.25); },
    hairball(t) { voice(t, 0.25, 200, 120, 'u', 0.35); noise(t + 0.1, 0.15, 0.2, 'lowpass', 600); },
    swipe(t) { noise(t, 0.18, 0.3, 'highpass', 2500, { to: 6000 }); },
    win(t) { [0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => tone(i < 4 ? 'triangle' : 'square', freq(72 + n), t + i * 0.09, i === 7 ? 0.8 : 0.2, 0.1, { lp: 3000 })); },
    menu(t) { tone('triangle', freq(84), t, 0.08, 0.1); },
    select(t) { tone('triangle', freq(79), t, 0.08, 0.12); tone('triangle', freq(86), t + 0.06, 0.15, 0.12); },
    page(t) { noise(t, 0.12, 0.12, 'highpass', 3000, { to: 1500 }); },
    crack(t) { noise(t, 0.12, 0.25, 'bandpass', 2600, { q: 3 }); noise(t + 0.08, 0.1, 0.2, 'bandpass', 1800, { q: 3 }); },
    bubblePop(t) { tone('sine', 500, t, 0.25, 0.25, { to: 1400, slide: 0.12 }); noise(t, 0.05, 0.2, 'highpass', 4000); },
    growl(t) { tone('sawtooth', 70, t, 0.8, 0.18, { lp: 400, q: 6, vib: 12 }); voice(t, 0.6, 140, 90, 'o', 0.2); },
    locked(t) { tone('square', 180, t, 0.2, 0.08, { lp: 800 }); },
  };

  function play(name, arg) {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    // don't play the same sound 50 times at once
    if (name !== 'milk' && lastPlayed[name] && now - lastPlayed[name] < 0.04) return;
    lastPlayed[name] = now;
    const f = SFX[name];
    if (f) f(now + 0.005, arg);
  }

  // ---------- music ----------
  function noteOf(idx) {
    const sc = SCALES[song.scale];
    return song.root + sc[((idx % 7) + 7) % 7] + 12 * Math.floor(idx / 7);
  }
  function chordNotes(deg) {
    // a chord made of 4 notes from the scale
    return [0, 2, 4, 7].map((k) => noteOf(deg + k));
  }
  function inst(kind, m, t, dur, vol) {
    const f = freq(m), B = { bus: musicBus, verb: true };
    if (kind === 'bell') { tone('sine', f, t, dur + 0.6, vol, B); tone('sine', f * 3.01, t, 0.25, vol * 0.25, B); }
    else if (kind === 'pluck') tone('triangle', f, t, Math.min(0.35, dur + 0.1), vol, { ...B, lp: 2500 });
    else if (kind === 'flute') tone('triangle', f, t, dur + 0.05, vol, { ...B, attack: 0.04, hold: dur * 0.7, vib: 5.5 });
    else if (kind === 'square') tone('square', f, t, dur + 0.05, vol * 0.45, { ...B, lp: 2200, hold: dur * 0.6, vib: 6 });
    else if (kind === 'soft') tone('triangle', f, t, dur, vol, { bus: musicBus, hold: dur * 0.5 });
    else if (kind === 'saw') tone('sawtooth', f, t, dur, vol * 0.6, { bus: musicBus, lp: 600, q: 3, hold: dur * 0.4 });
  }
  function drum(kind, t) {
    if (kind === 'k') { tone('sine', 150, t, 0.18, 0.5, { to: 45, bus: musicBus }); }
    else if (kind === 's') { noise(t, 0.14, 0.22, 'bandpass', 1800, { bus: musicBus }); tone('triangle', 190, t, 0.08, 0.1, { bus: musicBus }); }
    else if (kind === 'h') { noise(t, 0.04, 0.07, 'highpass', 7000, { bus: musicBus }); }
  }

  function tick() {
    if (!song || !ctx) return;
    const sd = 60 / song.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) {
      const s = step % 16, bar = Math.floor(step / 16);
      const t = nextTime + (s % 2 ? (song.swing || 0) * sd : 0);
      const chord = chordNotes(song.chords[bar % song.chords.length]);
      // melody
      const mel = song.melody[bar % song.melody.length];
      const ch = mel[s];
      if (ch && ch !== '.' && ch !== '-') {
        let len = 1; while (s + len < 16 && mel[s + len] === '-') len++;
        inst(song.lead, noteOf(parseInt(ch, 16)) + 12, t, len * sd * 0.95, 0.16);
      }
      // bass
      const b = song.bass[s];
      if (b && b !== '.') {
        let m = chord[0] - 12;
        if (b === 'o') m += 12; else if (b === '5') m = chord[2] - 12;
        inst(song.bassInst || 'soft', m, t, sd * 1.8, 0.28);
      }
      // chord arpeggio
      const a = song.arpPat && song.arpPat[s];
      if (a && a !== '.') inst(song.arp, chord[parseInt(a, 10) % 4] + 12, t, sd, 0.07);
      // drums
      for (const k in song.drums) if (song.drums[k][s] === 'x') drum(k, t);
      nextTime += sd; step++;
    }
  }

  function music(name) {
    if (name === songName) return;
    songName = name;
    song = LP.SONGS[name] || null;
    if (!ctx) return;
    step = 0; nextTime = ctx.currentTime + 0.1;
    if (!timer) timer = setInterval(tick, 25);
  }

  return {
    init, play, music,
    get on() { return !muted; },
    toggleMute() { muted = !muted; applyVolumes(); return !muted; },
    applyVolumes,
  };
})();
