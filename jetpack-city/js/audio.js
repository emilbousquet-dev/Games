// ============================================================
//  JETPACK CITY — SOUNDS & MUSIC
//  Every sound is made with math (oscillators + noise),
//  so there are no sound files at all!
//  The music is a fast synthwave beat.
// ============================================================
window.JC = window.JC || {};

JC.Audio = (function () {
  const U = JC.U;
  let ctx = null, master, sfx, music, noiseBuf, echo, jetNode = null;
  let musicOn = false, musicTimer = null, nextNote = 0, step = 0, muted = JC.store.get('muted', false);
  let intensity = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(comp);
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
    music = ctx.createGain(); music.gain.value = 0.3; music.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a short echo, like between tall buildings
    echo = ctx.createDelay(1); echo.delayTime.value = 0.28;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const wet = ctx.createGain(); wet.gain.value = 0.25;
    echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(master);
  }
  const now = () => ctx.currentTime;
  const ok = () => !!ctx;

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(type, f0, f1, dur, vol, opt = {}) {
    if (!ok()) return;
    const t = now() + (opt.delay || 0);
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    env(g, t, opt.attack || 0.005, vol, dur);
    let node = o;
    if (opt.filter) { const f = ctx.createBiquadFilter(); f.type = opt.filter; f.frequency.value = opt.ff || 1200; f.Q.value = opt.q || 1; o.connect(f); node = f; }
    node.connect(g); g.connect(opt.bus || sfx);
    if (opt.echo) g.connect(echo);
    o.start(t); o.stop(t + dur + 0.1);
  }
  function noise(dur, type, freq, q, vol, opt = {}) {
    if (!ok()) return;
    const t = now() + (opt.delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (opt.f1) f.frequency.exponentialRampToValueAtTime(opt.f1, t + dur);
    const g = ctx.createGain();
    env(g, t, opt.attack || 0.004, vol, dur);
    s.connect(f); f.connect(g); g.connect(opt.bus || sfx);
    if (opt.echo) g.connect(echo);
    s.start(t, Math.random()); s.stop(t + dur + 0.1);
  }
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // ---------------- sound effects ----------------
  let boltCount = 0, boltTime = 0;
  const S = {
    bolt() {
      // bolts go up in pitch when you grab many in a row
      if (!ok()) return;
      if (now() - boltTime > 0.6) boltCount = 0;
      boltTime = now(); boltCount = Math.min(boltCount + 1, 12);
      const n = 84 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26][boltCount - 1];
      tone('square', hz(n), hz(n), 0.07, 0.05, { filter: 'lowpass', ff: 5000 });
      tone('sine', hz(n + 12), hz(n + 12), 0.12, 0.05, { delay: 0.03 });
    },
    hop() { noise(0.35, 'bandpass', 600, 1.2, 0.3, { f1: 2400 }); tone('sine', 180, 420, 0.2, 0.12); },
    slide() { noise(0.4, 'lowpass', 1800, 1, 0.22, { f1: 400 }); },
    lane() { noise(0.12, 'bandpass', 1400, 2, 0.12, { f1: 2600 }); },
    land() { noise(0.08, 'lowpass', 400, 1, 0.15); },
    stumble() { noise(0.2, 'bandpass', 900, 1.5, 0.35); tone('square', 220, 90, 0.3, 0.12, { filter: 'lowpass', ff: 1400 }); tone('triangle', 660, 440, 0.15, 0.1, { delay: 0.05 }); },
    crash() { noise(0.8, 'lowpass', 3000, 0.8, 0.5, { f1: 200 }); tone('sine', 120, 40, 0.6, 0.4); tone('square', 300, 60, 0.5, 0.1, { filter: 'lowpass', ff: 900 }); },
    shieldBreak() { for (let i = 0; i < 6; i++) tone('sine', 2000 + Math.random() * 2000, 800, 0.25, 0.05, { delay: i * 0.03 }); noise(0.3, 'highpass', 3000, 1, 0.2); },
    shieldGone() { tone('sine', 800, 300, 0.4, 0.1); },
    power(kind) {
      [72, 76, 79, 84, 88].forEach((n, i) => tone('square', hz(n), hz(n), 0.12, 0.06, { delay: i * 0.05, filter: 'lowpass', ff: 3500, echo: true }));
      if (kind === 'jet') noise(1.0, 'bandpass', 300, 1, 0.35, { f1: 1800, attack: 0.1 });
      if (kind === 'magnet') tone('sawtooth', 110, 220, 0.6, 0.08, { filter: 'lowpass', ff: 800 });
      if (kind === 'shield') tone('sine', hz(96), hz(96), 0.6, 0.06, { delay: 0.25, echo: true });
    },
    stomp(loud) {
      tone('sine', 70, 35, 0.35, 0.5 * loud);
      noise(0.25, 'lowpass', 250, 1, 0.35 * loud);
      if (loud > 0.5) noise(0.1, 'bandpass', 1200, 3, 0.1 * loud, { delay: 0.02 }); // metal clank
    },
    roar() {
      tone('sawtooth', 90, 60, 1.4, 0.2, { filter: 'lowpass', ff: 700, attack: 0.1 });
      tone('sawtooth', 135, 80, 1.4, 0.12, { filter: 'lowpass', ff: 900, attack: 0.1 });
      tone('square', 400, 200, 0.8, 0.05, { filter: 'bandpass', ff: 1200, q: 4, delay: 0.1 });
      noise(1.3, 'bandpass', 500, 1, 0.2, { f1: 200, attack: 0.1 });
    },
    // robot voice: beeps that go up and down
    beepTalk() {
      for (let i = 0; i < 6; i++) tone('square', U.pick([300, 400, 500, 350, 600]), U.pick([300, 450, 250]), 0.08, 0.06, { delay: i * 0.1, filter: 'lowpass', ff: 1800 });
    },
    retreat() { [67, 64, 60].forEach((n, i) => tone('square', hz(n), hz(n), 0.1, 0.04, { delay: i * 0.08, filter: 'lowpass', ff: 1500 })); },
    horn() { tone('sawtooth', 311, 311, 0.9, 0.1, { filter: 'lowpass', ff: 1400 }); tone('sawtooth', 370, 370, 0.9, 0.1, { filter: 'lowpass', ff: 1400 }); },
    click() { tone('sine', 900, 700, 0.05, 0.15); },
    buy() { [76, 79, 84, 91].forEach((n, i) => tone('triangle', hz(n), hz(n), 0.2, 0.12, { delay: i * 0.07, echo: true })); },
    nope() { tone('square', 200, 150, 0.2, 0.08, { filter: 'lowpass', ff: 900 }); },
    record() { [72, 76, 79, 84, 79, 84, 88, 91].forEach((n, i) => tone('square', hz(n), hz(n), 0.15, 0.06, { delay: i * 0.09, filter: 'lowpass', ff: 3000, echo: true })); },
    gameOver() { [67, 63, 60, 55].forEach((n, i) => tone('sawtooth', hz(n), hz(n), 0.35, 0.08, { delay: i * 0.2, filter: 'lowpass', ff: 1200 })); },
  };

  // the jet boost rumble (plays while you fly)
  function setJet(on) {
    if (!ok()) return;
    if (!jetNode) {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const g = ctx.createGain(); g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(sfx); s.start();
      jetNode = g;
    }
    jetNode.gain.setTargetAtTime(on ? 0.3 : 0, now(), 0.15);
  }

  // ---------------- music: synthwave! ----------------
  // bass notes for each bar (4 beats, 8 steps of an eighth note each)
  const BASS = [45, 45, 41, 41, 43, 43, 40, 40];
  const CHORD = [[57, 60, 64], [57, 60, 64], [53, 57, 60], [53, 57, 60], [55, 59, 62], [55, 59, 62], [52, 56, 59], [52, 55, 59]];
  // melody: one note per step (0 = rest), 16 steps per bar, 2 bars repeating
  const MEL = [
    76, 0, 0, 79, 0, 0, 81, 0, 79, 0, 76, 0, 74, 0, 72, 0,
    74, 0, 0, 76, 0, 0, 72, 0, 69, 0, 0, 0, 72, 0, 74, 0,
  ];
  function mnote(type, n, t, dur, vol, ff) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (ff) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = ff; o.connect(f); node = f; }
    node.connect(g); g.connect(music);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function drum(kind, t) {
    if (kind === 'kick') {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(music); o.start(t); o.stop(t + 0.3);
    } else {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
      const g = ctx.createGain(); const v = kind === 'hat' ? 0.12 : 0.4, len = kind === 'hat' ? 0.04 : 0.18;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      s.connect(f); f.connect(g); g.connect(music); s.start(t, Math.random()); s.stop(t + len + 0.02);
    }
  }
  function scheduleMusic() {
    if (!ctx || !musicOn) return;
    const bpm = 118 + intensity * 22;
    const sixteenth = 60 / bpm / 4;
    while (nextNote < now() + 0.25) {
      const t = nextNote;
      const bar = Math.floor(step / 16) % BASS.length;
      const s16 = step % 16;
      // drums
      if (s16 % 4 === 0) drum('kick', t);
      if (s16 === 4 || s16 === 12) drum('snare', t);
      if (s16 % 2 === 0) drum('hat', t);
      // bass: pumping eighth notes
      if (s16 % 2 === 0) mnote('sawtooth', BASS[bar] - 12 + (s16 % 4 === 2 ? 12 : 0), t, sixteenth * 1.8, 0.16, 500);
      // chords
      if (s16 === 0 || s16 === 6 || s16 === 10) CHORD[bar].forEach((n) => mnote('square', n, t, sixteenth * 3, 0.025, 1800));
      // melody (only when the game is going)
      const mn = MEL[step % 32];
      if (mn && intensity > 0.05) mnote('triangle', mn, t, sixteenth * 2.5, 0.1);
      nextNote += sixteenth;
      step++;
    }
  }
  function startMusic() {
    if (!ctx) return;
    if (!musicOn) { nextNote = now() + 0.1; step = 0; }
    musicOn = true;
    if (!musicTimer) musicTimer = setInterval(scheduleMusic, 80);
  }
  function stopMusic() { musicOn = false; }
  function setIntensity(v) { intensity = U.clamp(v, 0, 1); }
  function setMuted(m) {
    muted = m; JC.store.set('muted', m);
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, now(), 0.05);
  }
  function suspend(yes) { if (!ctx) return; if (yes) ctx.suspend(); else ctx.resume(); }

  return Object.assign({ init, setJet, startMusic, stopMusic, setIntensity, setMuted, suspend, isMuted: () => muted }, S);
})();
