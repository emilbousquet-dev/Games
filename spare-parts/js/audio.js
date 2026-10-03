// ============================================================
//  SPARE PARTS — SOUNDS
//  Every sound is made with code (no sound files needed).
// ============================================================
window.SP = window.SP || {};

SP.Audio = (function () {
  let ctx = null, master = null, musicGain = null, musicOn = true, musicTimer = null;

  // browsers only allow sound after you click or press a key
  function start() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.18;
      musicGain.connect(master);
      startMusic();
    } catch (e) { ctx = null; }
  }

  // one beep: a wave that slides from one pitch to another
  function tone(type, f1, f2, dur, vol = 0.3, when = 0, dest = null) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // a burst of noise (for slaps, whooshes and crashes)
  function noise(dur, vol = 0.3, freq = 1500, when = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + when;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass'; filter.frequency.value = freq; filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t);
  }

  const rnd = (a, b) => a + Math.random() * (b - a);

  const sounds = {
    jump: () => tone('square', rnd(250, 300), 700, 0.15, 0.12),
    superJump: () => { tone('square', 200, 1200, 0.35, 0.15); tone('sine', 400, 1600, 0.35, 0.1, 0.05); },
    land: () => tone('sine', 140, 60, 0.12, 0.25),
    hop: () => tone('sine', rnd(400, 500), 800, 0.08, 0.1),
    pop: () => { tone('sine', 900, 200, 0.12, 0.25); noise(0.05, 0.15, 3000); },
    click: () => { tone('square', 1200, 1500, 0.04, 0.12); tone('sine', 600, 900, 0.08, 0.15, 0.03); },
    throw: () => noise(0.18, 0.12, 900),
    slap: () => { noise(0.12, 0.6, 2500); tone('sine', 300, 120, 0.1, 0.2); },
    kick: () => { noise(0.08, 0.4, 600); tone('sine', 180, 60, 0.15, 0.3); },
    dizzy: () => { for (let i = 0; i < 4; i++) tone('triangle', 1400 - i * 150, 1500 - i * 150, 0.08, 0.08, i * 0.09); },
    button: () => { tone('square', 500, 500, 0.05, 0.1); tone('square', 750, 750, 0.08, 0.1, 0.06); },
    buttonUp: () => { tone('square', 750, 750, 0.05, 0.08); tone('square', 500, 500, 0.08, 0.08, 0.06); },
    door: () => { tone('sawtooth', 90, 60, 0.4, 0.08); noise(0.4, 0.08, 400); },
    checkpoint: () => [523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.15, 0.15, i * 0.08)),
    fall: () => tone('sine', 900, 120, 0.9, 0.15),
    squish: () => { noise(0.2, 0.5, 300); tone('square', 150, 40, 0.3, 0.2); },
    poof: () => noise(0.3, 0.2, 1200),
    grab: () => tone('square', 300, 250, 0.1, 0.1),
    win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone('square', f, f, 0.18, 0.1, i * 0.12)),
    hat: () => tone('sine', 600, 1400, 0.2, 0.12),
    menu: () => tone('square', 660, 880, 0.06, 0.08),
    charge: (p) => tone('square', 300 + p * 900, 320 + p * 900, 0.05, 0.05),
    coin: () => { tone('square', 988, 988, 0.08, 0.1); tone('square', 1319, 1319, 0.25, 0.1, 0.08); },
    // silly robot voice: a few random beeps and boops
    voice: (high) => {
      const base = high ? 700 : 400;
      for (let i = 0; i < 4; i++) {
        const f = base * rnd(0.7, 1.5);
        tone('square', f, f * rnd(0.8, 1.3), 0.07, 0.07, i * 0.08);
      }
    },
  };

  function play(name, arg) { if (ctx && sounds[name]) sounds[name](arg); }

  // a happy little bouncy tune that loops
  function startMusic() {
    const bass = [131, 131, 165, 165, 175, 175, 196, 147];
    const melody = [523, 0, 659, 784, 0, 659, 587, 0, 523, 587, 659, 0, 784, 880, 784, 0];
    let step = 0;
    const beat = 0.22;
    musicTimer = setInterval(() => {
      if (!ctx || !musicOn || ctx.state !== 'running') { step++; return; }
      if (step % 2 === 0) tone('triangle', bass[(step / 2 | 0) % bass.length], bass[(step / 2 | 0) % bass.length], beat * 1.6, 0.5, 0, musicGain);
      const m = melody[step % melody.length];
      if (m && (step / 16 | 0) % 2 === 1) tone('square', m, m, beat * 0.8, 0.12, 0, musicGain);
      if (step % 4 === 2) {
        const t = ctx.currentTime;
        // a little "tick" drum
        const len = 800, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
        const s = ctx.createBufferSource(); s.buffer = buf;
        const g = ctx.createGain(); g.gain.value = 0.25;
        s.connect(g); g.connect(musicGain); s.start(t);
      }
      step++;
    }, beat * 1000);
  }

  function toggleMusic() { musicOn = !musicOn; return musicOn; }

  return { start, play, toggleMusic };
})();
