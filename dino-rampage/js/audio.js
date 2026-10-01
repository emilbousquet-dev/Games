// ============================================================
//  DINO RAMPAGE — SOUNDS & MUSIC
//  Every sound is made with math (oscillators + noise),
//  so there are no sound files at all!
// ============================================================
window.DR = window.DR || {};

DR.Audio = (function () {
  const U = DR.U;
  let ctx = null, master, sfx, music, noiseBuf, reverb;
  let musicOn = false, intensity = 0, musicTimer = null, nextNote = 0, step = 0;
  let muted = false;
  const last = {};   // so the same sound doesn't play 20 times at once
  const can = (name, gap) => { const n = performance.now(); if (last[name] && n - last[name] < gap * 1000) return false; last[name] = n; return true; };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85; master.connect(comp);
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
    music = ctx.createGain(); music.gain.value = 0.26; music.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a little echo, like in a city full of buildings
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 1.6;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.18;
    reverb.connect(wet); wet.connect(master);
  }
  const now = () => ctx.currentTime;
  const ok = () => !!ctx && !muted;

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
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
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
    s.connect(f); f.connect(g); g.connect(out(1, pan, opt.echo !== false, opt.bus));
    s.start(t, Math.random()); s.stop(t + dur + 0.1);
  }
  const noteHz = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // ---------------- sound effects ----------------
  const S = {
    // footsteps: the bigger the dino, the deeper the BOOM
    stomp(size = 1) {
      const s = Math.max(1, size);
      const f = 150 / Math.pow(s, 0.45);
      tone('sine', f, f * 0.45, 0.12 + Math.sqrt(s) * 0.05, Math.min(0.55, 0.18 + s * 0.03), 0, { echo: s > 3 });
      noise(0.08 + Math.sqrt(s) * 0.03, 'lowpass', 500 / Math.pow(s, 0.3), 1, Math.min(0.35, 0.08 + s * 0.02), 0, { echo: false });
    },
    jump() { tone('sine', 220, 520, 0.18, 0.18); noise(0.12, 'bandpass', 900, 1, 0.08, 0, { f1: 2400 }); },
    land(size = 1) { S.stomp(size * 1.4); },
    // smashing things (tier 1 = small crunch, tier 5 = huge rumble)
    crash(tier, pan = 0, glassy) {
      if (!can('crash' + tier, 0.06)) return;
      const f = [0, 1800, 1200, 800, 500, 300][tier];
      noise(0.12 + tier * 0.1, 'bandpass', f, 0.8, 0.3 + tier * 0.04, pan, { f1: f * 0.4 });
      tone('square', 180 / tier + 60, 40, 0.1 + tier * 0.06, 0.12, pan, { filter: 'lowpass', ff: 600 });
      for (let i = 0; i < 2 + tier; i++) noise(0.05, 'bandpass', 600 + Math.random() * 1600, 3, 0.12, pan + (Math.random() - 0.5) * 0.4, { delay: 0.04 + Math.random() * 0.25 });
      if (glassy) S.glass(pan);
      if (tier >= 3) S.rumble(0.8 + tier * 0.35, 0.18 + tier * 0.04);
    },
    glass(pan = 0) {
      noise(0.25, 'highpass', 4000, 1, 0.18, pan);
      for (let i = 0; i < 7; i++) tone('sine', 2500 + Math.random() * 3500, 0, 0.12 + Math.random() * 0.2, 0.04, pan + (Math.random() - 0.5) * 0.6, { delay: Math.random() * 0.3 });
    },
    rumble(dur = 1.5, vol = 0.3) { noise(dur, 'lowpass', 160, 0.7, vol, 0, { attack: 0.05, f1: 60 }); tone('sine', 55, 35, dur, vol * 0.8); },
    // eating
    munch() {
      for (let i = 0; i < 3; i++) { noise(0.07, 'bandpass', 700 + i * 150, 2, 0.35, 0, { delay: i * 0.13, echo: false }); tone('sine', 160, 90, 0.07, 0.2, 0, { delay: i * 0.13, echo: false }); }
      [72, 76, 79, 84].forEach((n, i) => tone('triangle', noteHz(n), noteHz(n), 0.14, 0.12, 0, { delay: 0.42 + i * 0.06 }));
    },
    bite() { noise(0.05, 'highpass', 2500, 1, 0.22, 0, { echo: false }); tone('square', 900, 200, 0.06, 0.1, 0, { filter: 'lowpass', ff: 2000, echo: false }); },
    whoosh() { noise(0.45, 'bandpass', 400, 2, 0.32, 0, { f1: 2600 }); noise(0.3, 'bandpass', 2600, 2, 0.15, 0, { delay: 0.2, f1: 600 }); },
    // cartoon BOING when something is too big
    boing() {
      if (!can('boing', 0.3)) return;
      tone('sine', 180, 520, 0.12, 0.3, 0, { vib: 18, vibAmt: 40 });
      tone('sine', 520, 260, 0.45, 0.25, 0, { delay: 0.1, vib: 14, vibAmt: 60 });
    },
    // ROAR! (a baby dino only goes "rawr")
    roar(size = 1) {
      if (size < 1.6) {
        tone('sawtooth', 520, 820, 0.18, 0.2, 0, { filter: 'bandpass', ff: 1800, q: 2, vib: 20, vibAmt: 30 });
        tone('sawtooth', 820, 460, 0.35, 0.2, 0, { delay: 0.16, filter: 'bandpass', ff: 1600, q: 2, vib: 16, vibAmt: 40 });
        return;
      }
      const f = 190 / Math.pow(size, 0.35);
      tone('sawtooth', f * 1.3, f * 0.8, 1.6, 0.32, 0, { filter: 'lowpass', ff: 1400, vib: 28, vibAmt: f * 0.12, attack: 0.08 });
      tone('sawtooth', f * 0.66, f * 0.5, 1.7, 0.28, 0, { filter: 'lowpass', ff: 700, vib: 22, vibAmt: f * 0.08, attack: 0.1 });
      tone('square', f * 2, f * 1.2, 1.2, 0.08, 0, { filter: 'bandpass', ff: 1200, q: 3, vib: 35, vibAmt: 30, attack: 0.1 });
      noise(1.6, 'bandpass', 700, 0.8, 0.3, 0, { attack: 0.08, f1: 300 });
      S.rumble(1.4, 0.25);
    },
    flop(size = 1) { S.stomp(size * 2.5); S.rumble(1.2, 0.35); noise(0.3, 'lowpass', 900, 1, 0.3); },
    grow() {
      [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => { tone('square', noteHz(n), noteHz(n), 0.2, 0.08, 0, { delay: i * 0.07, filter: 'lowpass', ff: 3000 }); tone('triangle', noteHz(n + 12), noteHz(n + 12), 0.25, 0.06, 0, { delay: i * 0.07 }); });
      tone('sine', 200, 900, 0.8, 0.15, 0, { vib: 8, vibAmt: 30 });
      for (let i = 0; i < 8; i++) tone('sine', noteHz(96 + (i % 4) * 3), noteHz(96 + (i % 4) * 3), 0.15, 0.04, (Math.random() - 0.5), { delay: 0.5 + i * 0.05 });
    },
    // people
    scream(pan = 0) {
      if (!can('scream', 0.35)) return;
      const f = 600 + Math.random() * 500;
      tone('sawtooth', f, f * (1.1 + Math.random() * 0.3), 0.5 + Math.random() * 0.4, 0.07, pan, { filter: 'bandpass', ff: 1600, q: 2.5, vib: 10 + Math.random() * 6, vibAmt: 40 });
    },
    giggle(pan = 0) {
      if (!can('giggle', 0.5)) return;
      for (let i = 0; i < 3; i++) tone('triangle', 900 + i * 60, 1100, 0.08, 0.06, pan, { delay: i * 0.1, filter: 'bandpass', ff: 1500, q: 2 });
    },
    boop() { tone('sine', 500, 900, 0.1, 0.15); },
    honk() { if (!can('honk', 0.5)) return; tone('square', 392, 392, 0.14, 0.05, 0, { filter: 'lowpass', ff: 1400 }); tone('square', 494, 494, 0.14, 0.05, 0, { filter: 'lowpass', ff: 1400 }); tone('square', 392, 392, 0.22, 0.05, 0, { delay: 0.2, filter: 'lowpass', ff: 1400 }); tone('square', 494, 494, 0.22, 0.05, 0, { delay: 0.2, filter: 'lowpass', ff: 1400 }); },
    alarm() { if (!can('alarm', 3)) return; for (let i = 0; i < 6; i++) tone('square', i % 2 ? 700 : 950, i % 2 ? 950 : 700, 0.25, 0.035, 0, { delay: i * 0.25, filter: 'lowpass', ff: 2500 }); },
    splash() { noise(0.8, 'lowpass', 2500, 0.8, 0.35, 0, { f1: 400 }); for (let i = 0; i < 6; i++) tone('sine', 600 + Math.random() * 900, 300, 0.1, 0.05, 0, { delay: Math.random() * 0.4 }); },
    point(n = 1) { if (!can('point', 0.05)) return; const k = Math.min(n, 10); tone('square', noteHz(76 + k), noteHz(76 + k), 0.06, 0.05, 0, { filter: 'lowpass', ff: 4000, echo: false }); tone('square', noteHz(83 + k), noteHz(83 + k), 0.1, 0.05, 0, { delay: 0.05, filter: 'lowpass', ff: 4000, echo: false }); },
    win() {
      const mel = [[72, 0], [72, 0.15], [72, 0.3], [79, 0.45], [76, 0.75], [79, 0.9], [84, 1.2]];
      mel.forEach(([n, d], i) => { tone('square', noteHz(n), noteHz(n), i === mel.length - 1 ? 1.2 : 0.25, 0.1, 0, { delay: d, filter: 'lowpass', ff: 3000 }); tone('triangle', noteHz(n - 12), noteHz(n - 12), 0.3, 0.12, 0, { delay: d }); });
    },
    star(i) { tone('triangle', noteHz(79 + i * 5), noteHz(79 + i * 5), 0.35, 0.18); tone('sine', noteHz(91 + i * 5), noteHz(91 + i * 5), 0.5, 0.06, 0, { delay: 0.05 }); },
    // army sounds
    boom(v = 1) {
      if (!can('boom' + (v > 0.6 ? 'b' : 's'), 0.08)) return;
      noise(0.5 + v * 0.5, 'lowpass', 900, 0.8, 0.25 + v * 0.25, 0, { f1: 120 });
      tone('sine', 120, 35, 0.4 + v * 0.3, 0.3 * v + 0.1);
    },
    shot(type) {
      if (!can('shot' + type, 0.08)) return;
      if (type === 'ball') { tone('square', 500, 200, 0.06, 0.06, 0, { filter: 'lowpass', ff: 1500 }); noise(0.05, 'bandpass', 1500, 2, 0.08); }
      else if (type === 'shell') { noise(0.35, 'lowpass', 700, 1, 0.3, 0, { f1: 150 }); tone('sine', 90, 40, 0.3, 0.25); }
      else { noise(0.6, 'bandpass', 1800, 1.5, 0.12, 0, { f1: 600 }); tone('sawtooth', 300, 900, 0.4, 0.05, 0, { filter: 'lowpass', ff: 1500 }); }
    },
    chop(v) { if (!can('chop', 0.11)) return; noise(0.06, 'lowpass', 300, 1, 0.05 + v * 0.18, 0, { echo: false }); },
    dizzy() {
      for (let i = 0; i < 8; i++) tone('sine', noteHz(84 - (i % 4) * 2), noteHz(84 - (i % 4) * 2), 0.18, 0.06, (i % 2 ? -0.5 : 0.5), { delay: i * 0.1 });
      tone('sawtooth', 300, 120, 0.8, 0.08, 0, { filter: 'lowpass', ff: 900, vib: 8, vibAmt: 30 });
    },
    // you found a secret!
    secret() {
      [[67, 0], [66, 0.12], [63, 0.24], [57, 0.36], [56, 0.48], [64, 0.6], [68, 0.72], [72, 0.84]].forEach(([n, d]) => { tone('square', noteHz(n + 12), noteHz(n + 12), 0.14, 0.08, 0, { delay: d, filter: 'lowpass', ff: 3500 }); tone('triangle', noteHz(n), noteHz(n), 0.16, 0.08, 0, { delay: d }); });
    },
    radio() {
      if (!can('radio', 1)) return;
      noise(0.18, 'bandpass', 2500, 1, 0.07, 0, { echo: false });
      tone('sine', 1400, 1400, 0.06, 0.06, 0, { delay: 0.2, echo: false });
      tone('sine', 1400, 1400, 0.06, 0.06, 0, { delay: 0.32, echo: false });
    },
    click() { tone('sine', 900, 700, 0.05, 0.15, 0, { echo: false }); },
    hover() { tone('sine', 1300, 1300, 0.03, 0.04, 0, { echo: false }); },
    locked() { tone('square', 200, 150, 0.15, 0.08, 0, { filter: 'lowpass', ff: 800 }); },
  };

  // ---------------- music: a bouncy stomping tune ----------------
  const CHORDS = [
    [48, [60, 64, 67]], [53, [60, 65, 69]], [55, [59, 62, 67]], [48, [60, 64, 67]],
    [57, [60, 64, 69]], [53, [60, 65, 69]], [55, [59, 62, 67]], [55, [59, 62, 65]],
  ];
  // melody: 8 eighth-notes per bar (0 = rest)
  const MEL = [
    [72, 0, 76, 0, 79, 0, 76, 0], [77, 0, 81, 0, 77, 76, 74, 0], [74, 0, 79, 0, 83, 0, 79, 0], [84, 0, 79, 0, 76, 0, 0, 0],
    [76, 0, 81, 0, 84, 0, 81, 0], [77, 0, 81, 0, 84, 83, 81, 0], [79, 0, 74, 0, 71, 0, 74, 0], [79, 0, 0, 0, 67, 69, 71, 74],
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
    o.start(t); o.stop(t + dur + 0.05);
  }
  function drum(kind, t, vol) {
    if (kind === 'kick') {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
      const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(music); o.start(t); o.stop(t + 0.25);
      return;
    }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = kind === 'hat' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'hat' ? 7000 : 1800;
    const g = ctx.createGain(); const d = kind === 'hat' ? 0.04 : 0.14;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(music); s.start(t, Math.random()); s.stop(t + d + 0.02);
  }
  function scheduleMusic() {
    if (!ctx || !musicOn) return;
    const bpm = 116 + intensity * 24;
    const e = 60 / bpm / 2;   // one eighth note
    while (nextNote < now() + 0.25) {
      const bar = Math.floor(step / 8) % 8, b = step % 8;
      const [bass, chord] = CHORDS[bar];
      const t = nextNote;
      if (b % 4 === 0) mnote('triangle', bass - 12, t, e * 1.6, 0.5, { ff: 700 });
      if (b % 4 === 2) mnote('triangle', bass - 5, t, e * 1.4, 0.4, { ff: 700 });
      if (b % 2 === 1) chord.forEach((n) => mnote('square', n, t, e * 0.6, 0.035, { ff: 1800 }));
      const m = MEL[bar][b];
      if (m) mnote('square', m, t, e * 1.7, 0.07, { ff: 2600 });
      if (m && intensity > 0.3) mnote('triangle', m + 12, t, e, 0.03);
      // drums
      if (b % 4 === 0) drum('kick', t, 0.5);
      if (b % 4 === 2 && intensity > 0.15) drum('snare', t, 0.18);
      if (intensity > 0.45) drum('hat', t, 0.06);
      nextNote += e;
      step++;
    }
  }
  function startMusic() {
    if (!ctx) return;
    if (musicOn) return;
    musicOn = true;
    nextNote = now() + 0.1; step = 0;
    if (!musicTimer) musicTimer = setInterval(scheduleMusic, 80);
  }
  function stopMusic() { musicOn = false; }
  function setIntensity(v) { intensity = U.clamp(v, 0, 1); }
  function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.85; }

  return Object.assign({ init, startMusic, stopMusic, setIntensity, setMuted, isMuted: () => muted }, S);
})();
