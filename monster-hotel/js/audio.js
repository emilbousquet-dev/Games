// ============================================================
//  MONSTER HOTEL — SOUNDS & MUSIC
//  Every sound is made with math (oscillators + noise),
//  so there are no sound files at all!
// ============================================================
window.MH = window.MH || {};

MH.Audio = (function () {
  const U = MH.U;
  let ctx = null, master, sfx, music, noiseBuf, reverb, windNode = null;
  let musicOn = true, intensity = 0, musicTimer = null, nextNote = 0, step = 0;
  let muted = false;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 5;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(comp);
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
    music = ctx.createGain(); music.gain.value = 0.32; music.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // echo of a big stone castle hall
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.28;
    reverb.connect(wet); wet.connect(master);
    if (muted) master.gain.value = 0;
  }
  const now = () => ctx.currentTime;
  const ok = () => !!ctx;

  function out(vol = 1, pan = 0, echo = true, bus) {
    const g = ctx.createGain(); g.gain.value = vol;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const dest = bus || sfx;
    if (p) { p.pan.value = U.clamp(pan, -1, 1); g.connect(p); p.connect(dest); if (echo) p.connect(reverb); }
    else { g.connect(dest); if (echo) g.connect(reverb); }
    return g;
  }
  function env(g, t, a, peak, dec, sus = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + dec);
  }
  function tone(type, f0, f1, dur, vol, pan = 0, opt = {}) {
    if (!ok()) return;
    const t = now() + (opt.delay || 0);
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    env(g, t, opt.attack || 0.005, vol, dur);
    let node = o;
    if (opt.filter) { const f = ctx.createBiquadFilter(); f.type = opt.filter; f.frequency.value = opt.ff || 1200; f.Q.value = opt.q || 1; o.connect(f); node = f; }
    if (opt.vib) { const l = ctx.createOscillator(); l.frequency.value = opt.vib; const lg = ctx.createGain(); lg.gain.value = opt.vibAmt || f0 * 0.03; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.1); }
    node.connect(g); g.connect(out(1, pan, opt.echo !== false, opt.bus));
    o.start(t); o.stop(t + dur + 0.1);
  }
  function noise(dur, type, freq, q, vol, pan = 0, opt = {}) {
    if (!ok()) return;
    const t = now() + (opt.delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (opt.f1) f.frequency.exponentialRampToValueAtTime(opt.f1, t + dur);
    const g = ctx.createGain();
    env(g, t, opt.attack || 0.004, vol, dur);
    s.connect(f); f.connect(g); g.connect(out(1, pan, opt.echo !== false));
    s.start(t, Math.random()); s.stop(t + dur + 0.1);
  }
  const noteHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // ---------------- sound effects ----------------
  const S = {
    bell() { tone('sine', 1760, 1760, 1.4, 0.35); tone('sine', 4400, 4400, 0.5, 0.08); tone('triangle', 880, 880, 0.9, 0.1); },
    pickup() { tone('sine', 420, 980, 0.12, 0.3); tone('triangle', 840, 1400, 0.1, 0.1, 0, { delay: 0.05 }); },
    drop() { tone('sine', 700, 250, 0.15, 0.25); },
    deliver() { [72, 76, 79, 84].forEach((n, i) => tone('triangle', noteHz(n), noteHz(n), 0.3, 0.22, 0, { delay: i * 0.07 })); tone('sine', noteHz(96), noteHz(96), 0.6, 0.05, 0, { delay: 0.28 }); },
    wrong() { tone('square', 150, 110, 0.25, 0.12, 0, { filter: 'lowpass', ff: 900 }); tone('square', 110, 80, 0.3, 0.12, 0, { delay: 0.18, filter: 'lowpass', ff: 700 }); },
    checkIn() { S.bell(); [67, 71, 74].forEach((n, i) => tone('triangle', noteHz(n), noteHz(n), 0.25, 0.14, 0, { delay: 0.15 + i * 0.08 })); },
    sparkle() { for (let i = 0; i < 6; i++) tone('sine', noteHz(84 + i * 3), noteHz(84 + i * 3), 0.2, 0.08, (Math.random() - 0.5), { delay: i * 0.04 }); },
    scrub() { noise(0.12, 'bandpass', 2200 + Math.random() * 800, 2, 0.12, 0, { echo: false }); },
    step(surface) {
      if (surface === 'lobby' || surface === 'arch') noise(0.06, 'highpass', 2500, 1, 0.08, 0, { echo: true });
      else if (surface === 'hall') noise(0.08, 'lowpass', 500, 1, 0.12, 0, { echo: false });
      else if (surface === 'kitchen') noise(0.05, 'bandpass', 1800, 2, 0.08);
      else { noise(0.07, 'bandpass', 380, 1.5, 0.16, 0, { echo: false }); tone('sine', 110, 70, 0.06, 0.08, 0, { echo: false }); }
    },
    creak(pan = 0) {
      if (!ok()) return;
      const t = now();
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(70, t);
      for (let i = 0; i < 8; i++) o.frequency.linearRampToValueAtTime(60 + Math.random() * 90, t + i * 0.08);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6;
      const g = ctx.createGain(); env(g, t, 0.05, 0.08, 0.7);
      o.connect(f); f.connect(g); g.connect(out(1, pan));
      o.start(t); o.stop(t + 0.9);
    },
    bigDoor() { S.creak(0); tone('sine', 60, 40, 0.6, 0.25, 0, { delay: 0.5 }); noise(0.3, 'lowpass', 200, 1, 0.2, 0, { delay: 0.5 }); },
    thunder(delay = 0) {
      noise(0.3, 'lowpass', 2000, 0.7, 0.35, 0, { delay, f1: 300 });
      noise(3.2, 'lowpass', 180, 0.8, 0.6, 0, { delay: delay + 0.1, attack: 0.3, f1: 60 });
    },
    windowBang() { noise(0.12, 'lowpass', 900, 1, 0.35); tone('sine', 120, 60, 0.15, 0.3); },
    closeWindow() { noise(0.1, 'lowpass', 1200, 1, 0.3); tone('sine', 200, 90, 0.12, 0.25); S.sparkle(); },
    howl(pan = 0, vol = 0.22) {
      tone('sawtooth', 300, 620, 0.7, vol, pan, { filter: 'lowpass', ff: 1400, vib: 5, vibAmt: 12, attack: 0.15 });
      tone('sawtooth', 620, 480, 1.4, vol, pan, { delay: 0.65, filter: 'lowpass', ff: 1400, vib: 5.5, vibAmt: 16, attack: 0.05 });
    },
    scream(pan = 0) {
      tone('sawtooth', 700, 1100, 0.7, 0.14, pan, { filter: 'bandpass', ff: 1500, q: 2, vib: 12, vibAmt: 40 });
      noise(0.6, 'bandpass', 2500, 2, 0.1, pan);
    },
    flash() { noise(0.03, 'highpass', 4000, 1, 0.25); tone('sine', 1800, 4200, 0.5, 0.05, 0, { delay: 0.02 }); },
    whoosh() { noise(0.4, 'bandpass', 500, 2, 0.3, 0, { f1: 2500 }); for (let i = 0; i < 4; i++) noise(0.04, 'lowpass', 600, 1, 0.2, 0, { delay: i * 0.09 }); },
    zap() { noise(0.4, 'bandpass', 3000, 1, 0.3, 0, { f1: 800 }); tone('square', 60, 55, 0.4, 0.15, 0, { filter: 'lowpass', ff: 2000 }); tone('sawtooth', 2000, 200, 0.3, 0.1); S.sparkle(); },
    freeze() { for (let i = 0; i < 8; i++) tone('sine', noteHz(96 - i * 2), noteHz(96 - i * 2), 0.5, 0.06, (i % 2 ? -0.5 : 0.5), { delay: i * 0.06 }); noise(1.2, 'bandpass', 1200, 4, 0.12, 0, { f1: 300 }); },
    bigHowl() { S.howl(-0.3, 0.3); S.howl(0.3, 0.2); noise(1.5, 'lowpass', 400, 1, 0.2); },
    chime(n = 1) { for (let i = 0; i < Math.min(n, 3); i++) { tone('sine', 196, 196, 2.2, 0.2, 0, { delay: i * 1.1 }); tone('sine', 392 * 1.01, 392, 1.5, 0.08, 0, { delay: i * 1.1 }); } },
    review(stars) {
      if (stars >= 4) { tone('triangle', noteHz(79), noteHz(79), 0.18, 0.15); tone('triangle', noteHz(84), noteHz(84), 0.3, 0.15, 0, { delay: 0.1 }); if (stars === 5) tone('sine', noteHz(91), noteHz(91), 0.5, 0.08, 0, { delay: 0.2 }); }
      else if (stars === 3) tone('triangle', noteHz(72), noteHz(72), 0.3, 0.12);
      else { tone('triangle', noteHz(67), noteHz(67), 0.25, 0.15); tone('triangle', noteHz(61), noteHz(61), 0.45, 0.15, 0, { delay: 0.2 }); }
    },
    starsUp() { [72, 79, 84, 88, 91].forEach((n, i) => tone('triangle', noteHz(n), noteHz(n), 0.35, 0.14, 0, { delay: i * 0.08 })); },
    rooster() {
      const parts = [[500, 700, 0.18], [700, 650, 0.2], [650, 900, 0.3], [900, 500, 0.5]];
      let d = 0;
      for (const [a, b, l] of parts) { tone('sawtooth', a, b, l, 0.1, 0, { delay: d, filter: 'bandpass', ff: 1600, q: 2, vib: 8, vibAmt: 15 }); d += l * 0.9; }
    },
    sadTrombone() {
      [[62, 0.35], [61, 0.35], [60, 0.35], [59, 1.2]].reduce((d, [n, l]) => { tone('sawtooth', noteHz(n), noteHz(n) * (l > 1 ? 0.97 : 1), l, 0.14, 0, { delay: d, filter: 'lowpass', ff: 1100, vib: l > 1 ? 6 : 0, vibAmt: 5, attack: 0.04 }); return d + l * 0.95; }, 0);
    },
    nightStart() { [57, 60, 64, 69].forEach((n, i) => tone('sawtooth', noteHz(n), noteHz(n), 2.2, 0.06, 0, { delay: i * 0.12, filter: 'lowpass', ff: 1200, attack: 0.3 })); S.chime(1); },
    magic() { for (let i = 0; i < 10; i++) tone('sine', noteHz(72 + i * 2), noteHz(72 + i * 2), 0.3, 0.07, (i % 2 ? -0.4 : 0.4), { delay: i * 0.05 }); tone('sawtooth', 300, 900, 0.5, 0.06, 0, { filter: 'bandpass', ff: 1200, vib: 11, vibAmt: 60 }); },
    click() { tone('sine', 900, 700, 0.05, 0.15, 0, { echo: false }); },
    hover() { tone('sine', 1300, 1300, 0.03, 0.05, 0, { echo: false }); },
    humanAlert() { [0, 0.18, 0.36].forEach((d) => tone('square', 880, 880, 0.12, 0.08, 0, { delay: d, filter: 'lowpass', ff: 2500 })); },
    angryBurst() { tone('sawtooth', 160, 90, 0.4, 0.12, 0, { filter: 'lowpass', ff: 800 }); noise(0.3, 'lowpass', 600, 1, 0.1); },
    stomp() { tone('sine', 80, 40, 0.25, 0.3); noise(0.15, 'lowpass', 300, 1, 0.2); },
    coin() { tone('square', noteHz(88), noteHz(88), 0.08, 0.08, 0, { filter: 'lowpass', ff: 4000 }); tone('square', noteHz(93), noteHz(93), 0.2, 0.08, 0, { delay: 0.07, filter: 'lowpass', ff: 4000 }); },
  };

  // ---------------- monster voices (gibberish!) ----------------
  const VOICE = {
    vampire: { f: 150, type: 'sawtooth', formant: 900, q: 3 },
    werewolf: { f: 105, type: 'sawtooth', formant: 600, q: 2, growl: true },
    mummy: { f: 95, type: 'sawtooth', formant: 450, q: 2 },
    ghost: { f: 330, type: 'sine', formant: 1200, q: 1, woo: true },
    frankie: { f: 72, type: 'sawtooth', formant: 500, q: 3 },
    blob: { f: 240, type: 'triangle', formant: 1400, q: 2, bubble: true },
    human: { f: 230, type: 'sawtooth', formant: 1600, q: 3 },
    skeleton: { f: 190, type: 'square', formant: 1800, q: 4, rattle: true },
    witch: { f: 280, type: 'sawtooth', formant: 2000, q: 5, cackle: true },
    zombie: { f: 85, type: 'sawtooth', formant: 380, q: 2, growl: true },
  };
  function babble(kind, mood = 0, pan = 0, vol = 0.14) {
    if (!ok()) return;
    const v = VOICE[kind] || VOICE.vampire;
    const n = 2 + Math.floor(Math.random() * 4);
    let t = now();
    for (let i = 0; i < n; i++) {
      const len = v.woo ? 0.35 : 0.09 + Math.random() * 0.12;
      const o = ctx.createOscillator(); o.type = v.type;
      const base = v.f * (1 + mood * 0.25) * (0.9 + Math.random() * 0.25);
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * (mood < -0.3 ? 0.8 : 1.15), t + len);
      if (v.woo || v.bubble) { const l = ctx.createOscillator(); l.frequency.value = v.bubble ? 25 : 6; const lg = ctx.createGain(); lg.gain.value = base * (v.bubble ? 0.3 : 0.05); l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + len + 0.05); }
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = v.q;
      f.frequency.setValueAtTime(v.formant * (0.7 + Math.random() * 0.8), t);
      f.frequency.linearRampToValueAtTime(v.formant * (0.7 + Math.random() * 0.8), t + len);
      const g = ctx.createGain(); env(g, t, 0.02, vol * (mood < -0.4 ? 1.4 : 1), len);
      o.connect(f); f.connect(g); g.connect(out(1, pan));
      o.start(t); o.stop(t + len + 0.05);
      if (v.growl) noise(len, 'lowpass', 400, 1, vol * 0.5, pan, { delay: t - now() });
      if (v.rattle) for (let k = 0; k < 3; k++) noise(0.03, 'highpass', 3000, 2, vol * 0.6, pan, { delay: t - now() + k * 0.04 });
      if (v.cackle) { const l = ctx.createOscillator(); l.frequency.value = 11; const lg = ctx.createGain(); lg.gain.value = base * 0.25; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + len + 0.05); }
      t += len + 0.03 + Math.random() * 0.05;
    }
  }

  // ---------------- wind & rain (when windows are open) ----------------
  function setWind(level) {
    if (!ok()) return;
    if (!windNode) {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.25; const lg = ctx.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      const g = ctx.createGain(); g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(sfx); s.start();
      windNode = g;
    }
    windNode.gain.setTargetAtTime(level * 0.35, now(), 0.4);
  }

  // ---------------- music: a spooky waltz ----------------
  // chords (MIDI notes) for each bar, 3 beats per bar
  const CHORDS = [
    [45, [57, 60, 64]], [45, [57, 60, 64]], [50, [57, 62, 65]], [50, [57, 62, 65]],
    [40, [56, 59, 62]], [40, [56, 59, 62]], [45, [57, 60, 64]], [40, [56, 59, 64]],
    [45, [57, 60, 64]], [43, [55, 59, 62]], [41, [57, 60, 65]], [41, [57, 60, 65]],
    [38, [57, 62, 65]], [40, [56, 59, 64]], [45, [57, 60, 64]], [45, [57, 60, 64]],
  ];
  // melody: [bar, beat, note, length in beats]
  const MEL = [
    [0, 0, 76, 1], [0, 1, 77, 1], [0, 2, 76, 1], [1, 0, 72, 2], [1, 2, 69, 1],
    [2, 0, 74, 1], [2, 1, 76, 1], [2, 2, 77, 1], [3, 0, 81, 2], [3, 2, 77, 1],
    [4, 0, 80, 1], [4, 1, 77, 1], [4, 2, 74, 1], [5, 0, 71, 2], [5, 2, 68, 1],
    [6, 0, 69, 1], [6, 1, 72, 1], [6, 2, 76, 1], [7, 0, 75, 1.5], [7, 1.5, 76, 1.5],
    [8, 0, 81, 1], [8, 1, 79, 1], [8, 2, 76, 1], [9, 0, 79, 1], [9, 1, 74, 2],
    [10, 0, 77, 1], [10, 1, 76, 1], [10, 2, 74, 1], [11, 0, 72, 2], [11, 2, 69, 1],
    [12, 0, 74, 1], [12, 1, 77, 1], [12, 2, 81, 1], [13, 0, 80, 1], [13, 1, 76, 1], [13, 2, 71, 1],
    [14, 0, 69, 3], [15, 1, 64, 0.5], [15, 1.5, 68, 0.5], [15, 2, 71, 1],
  ];
  function mnote(type, n, t, dur, vol, opt = {}) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = noteHz(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (opt.a || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (opt.ff) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opt.ff; o.connect(f); node = f; }
    node.connect(g); g.connect(music);
    if (opt.echo) g.connect(reverb);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function scheduleMusic() {
    if (!ctx || !musicOn) return;
    const bpm = 132 * (1 + intensity * 0.22);
    const beat = 60 / bpm;
    while (nextNote < now() + 0.3) {
      const bar = Math.floor(step / 3) % CHORDS.length, b = step % 3;
      const [bass, chord] = CHORDS[bar];
      const t = nextNote;
      if (b === 0) { mnote('triangle', bass, t, beat * 0.9, 0.5, { ff: 900 }); mnote('sine', bass - 12, t, beat * 0.7, 0.35); }
      else chord.forEach((n) => mnote('square', n, t, beat * 0.35, 0.05, { ff: 1500 }));
      // melody (music box)
      for (const [mb, mbeat, n, l] of MEL) {
        if (mb !== bar) continue;
        if (mbeat >= b && mbeat < b + 1) {
          const tt = t + (mbeat - b) * beat;
          mnote('sine', n, tt, beat * l * 1.1 + 0.3, 0.16, { echo: true });
          mnote('sine', n + 12, tt, beat * 0.6, 0.04, { echo: true });
        }
      }
      // ticking clock when things get stressful
      if (intensity > 0.35) mnote('square', b === 0 ? 96 : 91, t, 0.03, 0.02 + intensity * 0.02, { ff: 6000 });
      nextNote += beat;
      step++;
    }
  }
  function startMusic() {
    if (!ctx) return;
    musicOn = true;
    nextNote = now() + 0.1; step = 0;
    if (!musicTimer) musicTimer = setInterval(scheduleMusic, 100);
  }
  function stopMusic() { musicOn = false; }
  function setIntensity(v) { intensity = U.clamp(v, 0, 1); }
  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.85; }

  return Object.assign({ init, babble, setWind, startMusic, stopMusic, setIntensity, setMuted, isMuted: () => muted }, S);
})();
