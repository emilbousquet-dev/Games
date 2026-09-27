// ============================================================
//  FLOPPY PARTY — SOUNDS AND MUSIC (all made with code)
// ============================================================
window.FP = window.FP || {};

FP.Audio = (function () {
  let ctx = null, master = null, musicGain = null, musicOn = true, song = 'party', step = 0;

  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.gain.value = 0.16; musicGain.connect(master);
      setInterval(tick, 150);
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
    o.connect(g); g.connect(dest || master);
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
    src.connect(f); f.connect(g); g.connect(dest || master);
    src.start(t);
  }

  const rnd = (a, b) => a + Math.random() * (b - a);
  const S = {
    jump: () => tone('sine', rnd(260, 320), rnd(700, 820), 0.16, 0.2),
    whoosh: () => noise(0.16, 0.18, rnd(700, 1100)),
    hit: () => { noise(0.1, 0.7, rnd(1800, 2600)); tone('sine', 260, 90, 0.14, 0.35); },
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
    select: () => { tone('square', 880, 880, 0.05, 0.08); tone('square', 1320, 1320, 0.08, 0.08, 0.05); },
    voice: () => { for (let i = 0; i < 3; i++) { const f = rnd(350, 800); tone('triangle', f, f * rnd(0.8, 1.4), 0.08, 0.08, i * 0.08); } },
  };
  function play(name) { if (ctx && S[name]) S[name](); }

  // a bouncy party tune
  const SONGS = {
    party: { bass: [131, 131, 196, 196, 175, 175, 147, 196], mel: [523, 0, 659, 784, 0, 784, 880, 784, 659, 0, 587, 659, 523, 0, 392, 0] },
    circus: { bass: [147, 220, 147, 220, 131, 196, 131, 196], mel: [587, 554, 587, 0, 880, 0, 784, 740, 784, 0, 659, 0, 587, 659, 740, 0] },
    tense: { bass: [110, 110, 131, 110, 98, 98, 117, 98], mel: [440, 0, 523, 0, 494, 0, 440, 415, 0, 0, 440, 0, 523, 587, 523, 0] },
  };
  function tick() {
    if (!ctx || !musicOn || ctx.state !== 'running') return;
    if (song === 'silent') return; // the music stopped (musical seats!)
    const s = SONGS[song] || SONGS.party;
    const b = s.bass[(step >> 1) % s.bass.length];
    if (step % 2 === 0) tone('triangle', b, b, 0.28, 0.55, 0, musicGain);
    const m = s.mel[step % s.mel.length];
    if (m && (step >> 4) % 4 !== 0) tone('square', m, m, 0.12, 0.13, 0, musicGain);
    if (step % 4 === 2) noise(0.05, 0.3, 6000, 0, musicGain);
    if (step % 8 === 0) tone('sine', 120, 45, 0.15, 0.6, 0, musicGain);
    step++;
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

  return {
    start, play,
    toggleMusic() { musicOn = !musicOn; return musicOn; },
    setSong(name) { song = name; },
  };
})();
