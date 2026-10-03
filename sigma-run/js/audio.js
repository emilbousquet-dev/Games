// ============================================================
//  SIGMA RUN — MUSIC & SOUNDS
//  Every sound is made with math (oscillators + noise), so
//  there are no sound files at all!
//  The music is a PHONK beat: cowbell melody, booming 808 bass,
//  half-time drums and fast hi-hats. It gets more intense when
//  the FBI is after you, and goes CRAZY in SIGMA MODE.
// ============================================================
window.SR = window.SR || {};

SR.Audio = (function () {
  const U = SR.U;
  let ctx = null, master, comp, sfx, music, musicFilter, noiseBuf, echo, echoSend, verb, verbSend, dist808;
  let musicOn = false, timer = null, nextStep = 0, step = 0, bar = 0;
  let intensity = 0;          // 0 menu, 1 running, 2 chased, 3 crazy
  let musicMuffle = 0;        // pause menu / falling = muffled music
  const loops = {};

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.15;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    sfx = ctx.createGain(); sfx.connect(master);
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 20000; musicFilter.Q.value = 0.7;
    music = ctx.createGain(); music.connect(musicFilter); musicFilter.connect(master);
    applyVolumes();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // echo (like between tall buildings)
    echo = ctx.createDelay(1.5); echo.delayTime.value = 60 / 140 * 0.75;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const eFilt = ctx.createBiquadFilter(); eFilt.type = 'lowpass'; eFilt.frequency.value = 3000;
    echoSend = ctx.createGain(); echoSend.gain.value = 1;
    echoSend.connect(echo); echo.connect(eFilt); eFilt.connect(fb); fb.connect(echo);
    const eOut = ctx.createGain(); eOut.gain.value = 0.3; eFilt.connect(eOut); eOut.connect(master);
    // big reverb (a fake concert hall made from noise)
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.6, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = ir;
    verbSend = ctx.createGain(); verbSend.gain.value = 1; verbSend.connect(verb);
    const vOut = ctx.createGain(); vOut.gain.value = 0.35; verb.connect(vOut); vOut.connect(master);
    // crunchy distortion for the 808
    dist808 = ctx.createWaveShaper();
    setDrive(2);
    const d808Out = ctx.createBiquadFilter(); d808Out.type = 'lowpass'; d808Out.frequency.value = 1400;
    dist808.connect(d808Out); d808Out.connect(music);
    makeLoops();
  }
  function setDrive(k) {
    const n = 1024, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; curve[i] = Math.tanh(x * k) / Math.tanh(k); }
    dist808.curve = curve;
  }
  function applyVolumes() {
    if (!ctx) return;
    music.gain.value = 0.42 * SR.settings.music;
    sfx.gain.value = 1.0 * SR.settings.sfx;
  }

  const now = () => ctx.currentTime;
  const ok = () => !!ctx;
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  // one beep / boop. opt: { at, attack, filter, ff, q, bus, echo, verb, pan }
  function tone(type, f0, f1, dur, vol, opt = {}) {
    if (!ok()) return;
    const t = opt.at || now() + (opt.delay || 0);
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + (opt.slide || dur));
    if (opt.detune) o.detune.value = opt.detune;
    const g = ctx.createGain();
    env(g, t, opt.attack || 0.005, vol, dur);
    let node = o;
    if (opt.filter) { const f = ctx.createBiquadFilter(); f.type = opt.filter; f.frequency.value = opt.ff || 1200; f.Q.value = opt.q || 1; node.connect(f); node = f; }
    node.connect(g);
    let out = g;
    if (opt.pan) { const p = ctx.createStereoPanner(); p.pan.value = opt.pan; g.connect(p); out = p; }
    out.connect(opt.bus || sfx);
    if (opt.echo) out.connect(echoSend);
    if (opt.verb) { const vg = ctx.createGain(); vg.gain.value = opt.verb; out.connect(vg); vg.connect(verbSend); }
    o.start(t); o.stop(t + (opt.attack || 0.005) + dur + 0.05);
  }
  function noise(dur, type, freq, q, vol, opt = {}) {
    if (!ok()) return;
    const t = opt.at || now() + (opt.delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    if (opt.rate) s.playbackRate.value = opt.rate;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (opt.f1) f.frequency.exponentialRampToValueAtTime(opt.f1, t + dur);
    const g = ctx.createGain();
    env(g, t, opt.attack || 0.003, vol, dur);
    s.connect(f); f.connect(g);
    let out = g;
    if (opt.pan) { const p = ctx.createStereoPanner(); p.pan.value = opt.pan; g.connect(p); out = p; }
    out.connect(opt.bus || sfx);
    if (opt.echo) out.connect(echoSend);
    if (opt.verb) { const vg = ctx.createGain(); vg.gain.value = opt.verb; out.connect(vg); vg.connect(verbSend); }
    s.start(t, Math.random()); s.stop(t + (opt.attack || 0.003) + dur + 0.05);
  }

  // ======================= MUSIC =======================
  const BPM = 140, STEP = 60 / BPM / 4;
  const ROOT = 61; // C#4
  // cowbell melody, 4 bars x 16 steps (null = rest), numbers = semitones above the root
  const _ = null;
  const MELODY_A = [
    [12, _, 12, _, 10, _, 7, _, 12, _, 12, _, 15, _, 12, 10],
    [8, _, 8, _, 7, _, 3, _, 8, _, 8, _, 10, _, 8, 7],
    [12, _, 12, _, 10, _, 7, _, 12, _, 15, _, 17, _, 15, 12],
    [10, _, 10, _, 8, _, 7, _, 3, _, 5, _, 7, _, _, _],
  ];
  const MELODY_B = [
    [15, _, 15, 15, _, 15, 12, _, 15, _, 17, _, 15, 12, 10, _],
    [8, _, 8, 8, _, 8, 7, _, 8, _, 10, _, 12, _, 10, 8],
    [15, _, 15, 15, _, 15, 12, _, 15, _, 19, _, 17, 15, 12, _],
    [10, _, 12, 10, _, 8, 7, _, 7, _, 3, _, 0, _, _, _],
  ];
  const CHORDS = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]]; // C#m, A, E, B
  const BASS = [0, -4, 3, -2];
  // 808 pattern: [step, length in steps, glide from (semitones) or 0]
  const BASS_PAT = [[0, 5, 0], [6, 3, 0], [10, 4, 12], [14, 2, 0]];

  function kick(t, vol = 1) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(vol * 0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
    o.connect(g); g.connect(music); o.start(t); o.stop(t + 0.35);
    noise(0.012, 'highpass', 3000, 0.7, 0.15 * vol, { at: t, bus: music });
  }
  function clap(t, vol = 1) {
    for (let i = 0; i < 3; i++) noise(0.012, 'bandpass', 1500, 0.9, 0.35 * vol, { at: t + i * 0.011, bus: music });
    noise(0.22, 'bandpass', 1300, 0.7, 0.3 * vol, { at: t + 0.033, bus: music, verb: 0.5 });
    tone('triangle', 220, 160, 0.08, 0.18 * vol, { at: t, bus: music });
  }
  function hat(t, open, vol = 1) {
    noise(open ? 0.16 : 0.035, 'highpass', 8000, 0.8, (open ? 0.12 : 0.1) * vol, { at: t, bus: music });
  }
  function cowbell(t, note, vol = 1, filt = 0) {
    const f = hz(ROOT + note);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22 * vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.05 * vol, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 1.5; bp.Q.value = 1.4;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = filt ? 1400 : 9000;
    for (const m of [1, 1.483]) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f * m;
      o.connect(bp); o.start(t); o.stop(t + 0.34);
    }
    bp.connect(lp); lp.connect(g); g.connect(music); g.connect(echoSend);
  }
  function bass808(t, note, len, glide, vol = 1) {
    const f = hz(ROOT - 24 + note);
    const o = ctx.createOscillator(); o.type = 'sine';
    if (glide) { o.frequency.setValueAtTime(hz(ROOT - 24 + note + glide), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.09); }
    else o.frequency.setValueAtTime(f, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.8 * vol, t + 0.006);
    g.gain.setValueAtTime(0.7 * vol, t + len * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
    o.connect(g); g.connect(dist808);
    o.start(t); o.stop(t + len + 0.1);
  }
  function pad(t, chord, len, vol = 1) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05 * vol, t + 0.4);
    g.gain.setValueAtTime(0.05 * vol, t + len - 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 2;
    f.connect(g); g.connect(music); g.connect(verbSend);
    for (const n of chord) for (const det of [-9, 9]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = hz(ROOT - 12 + n); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + len + 0.05);
    }
  }

  function scheduleStep(t) {
    const s = step % 16, b = bar % 4;
    const section = Math.floor(bar / 8) % 2; // switch melody every 8 bars
    const I = intensity;
    if (s === 0) pad(t, CHORDS[b], STEP * 16, I === 0 ? 1.4 : 0.8);
    if (I === 0) {
      // menu: chill version
      if (s === 0 || s === 10) kick(t, 0.55);
      if (s === 8) clap(t, 0.5);
      if (s % 4 === 2) hat(t, false, 0.6);
      const m = MELODY_A[b][s];
      if (m !== null && bar % 4 >= 2) cowbell(t, m, 0.5, 1);
      return;
    }
    // drums (half-time phonk)
    if (s === 0 || s === 10 || (I >= 2 && s === 7 && b % 2 === 1)) kick(t, 1);
    if (s === 8) clap(t, 1);
    if (I >= 2 && s === 15 && b === 3) clap(t, 0.5);
    // hi-hats: 8ths, with fast rolls sometimes
    if (s % 2 === 0) hat(t, s === 6 || s === 14, 0.9);
    if (I >= 2 && (s === 13 || s === 15)) hat(t, false, 0.6);
    if (I >= 3 && s % 2 === 1) hat(t, false, 0.5);
    if (I >= 2 && b === 3 && s >= 12) { hat(t + STEP / 3, false, 0.5); hat(t + STEP * 2 / 3, false, 0.5); }
    // 808
    for (const [ps, len, gl] of BASS_PAT) if (ps === s) bass808(t, BASS[b], len * STEP, gl, I >= 3 ? 1.1 : 0.9);
    // cowbell melody
    if (I >= 2 || bar % 8 >= 4) {
      const mel = section ? MELODY_B : MELODY_A;
      const m = mel[b][s];
      if (m !== null) {
        cowbell(t, m, I >= 2 ? 1 : 0.6, I >= 2 ? 0 : 1);
        if (I >= 3) cowbell(t, m + 12, 0.45);
      }
    }
  }
  function tick() {
    if (!ctx || !musicOn) return;
    while (nextStep < now() + 0.15) {
      scheduleStep(nextStep);
      nextStep += STEP;
      step++;
      if (step % 16 === 0) bar++;
    }
  }
  function startMusic() {
    if (!ctx) return;
    if (musicOn) return;
    musicOn = true; step = 0; bar = 0; nextStep = now() + 0.1;
    timer = setInterval(tick, 25);
  }
  function stopMusic() { musicOn = false; if (timer) clearInterval(timer); timer = null; }
  function setIntensity(i) {
    if (!ctx) { intensity = i; return; }
    if (i !== intensity) {
      intensity = i;
      setDrive(i >= 3 ? 6 : 2.2);
    }
  }
  function restartBeat() { if (!ctx) return; step = 0; bar = 0; nextStep = now() + 0.05; }
  function muffle(v) {
    if (!ctx) return;
    musicMuffle = v;
    musicFilter.frequency.setTargetAtTime(v ? 650 : 20000, now(), 0.08);
  }

  // ======================= LOOPING SOUNDS =======================
  function loopNoise(type, freq, q) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = 0;
    const p = ctx.createStereoPanner();
    s.connect(f); f.connect(g); g.connect(p); p.connect(sfx); s.start();
    return { s, f, g, p };
  }
  function makeLoops() {
    loops.wind = loopNoise('bandpass', 500, 0.6);
    loops.scrape = loopNoise('bandpass', 2600, 1.5);
    loops.slide = loopNoise('lowpass', 900, 0.8);
    loops.zip = loopNoise('bandpass', 1800, 6);
    // helicopter: low rumble chopped by the spinning blades
    const h = loopNoise('lowpass', 380, 1);
    const chop = ctx.createGain(); chop.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 15;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
    lfo.connect(lfoG); lfoG.connect(chop.gain); lfo.start();
    h.f.disconnect(); h.f.connect(chop); chop.connect(h.g);
    const thr = ctx.createOscillator(); thr.type = 'triangle'; thr.frequency.value = 46;
    const thrG = ctx.createGain(); thrG.gain.value = 0.35; thr.connect(thrG); thrG.connect(chop); thr.start();
    loops.heli = h;
  }
  function setLoop(name, vol, freq, pan = 0) {
    if (!ctx || !loops[name]) return;
    const L = loops[name];
    L.g.gain.setTargetAtTime(vol, now(), 0.06);
    if (freq) L.f.frequency.setTargetAtTime(freq, now(), 0.08);
    L.p.pan.setTargetAtTime(U.clamp(pan, -1, 1), now(), 0.08);
  }
  function stopLoops() { for (const k in loops) setLoop(k, 0); }

  // ======================= SOUND EFFECTS =======================
  let coinCount = 0, coinTime = 0, stepFoot = 0;
  const S = {
    step(surface = 'roof', speed = 1) {
      if (!ok()) return;
      stepFoot = 1 - stepFoot;
      const p = stepFoot ? -0.15 : 0.15;
      if (surface === 'metal') {
        tone('triangle', 420 + Math.random() * 60, 260, 0.06, 0.07, { pan: p });
        noise(0.05, 'bandpass', 2400, 2, 0.08, { pan: p });
      } else {
        noise(0.05, 'lowpass', 600 + Math.random() * 200, 0.8, 0.22 * speed, { pan: p });
        noise(0.03, 'bandpass', 3000, 1, 0.05, { pan: p });
      }
    },
    jump() {
      noise(0.18, 'bandpass', 600, 0.9, 0.18, { f1: 1800 });
      noise(0.04, 'lowpass', 500, 0.8, 0.2);
    },
    land(hard) {
      noise(hard ? 0.18 : 0.08, 'lowpass', hard ? 400 : 700, 0.8, hard ? 0.55 : 0.3);
      if (hard) tone('sine', 120, 50, 0.15, 0.3);
    },
    roll() { noise(0.4, 'bandpass', 500, 0.8, 0.3, { f1: 250 }); },
    vault() { noise(0.12, 'bandpass', 900, 1, 0.2, { f1: 2000 }); tone('sine', 300, 500, 0.08, 0.05); },
    wallKick() { noise(0.08, 'lowpass', 900, 0.8, 0.35); noise(0.2, 'bandpass', 800, 0.9, 0.15, { f1: 2400 }); },
    coin() {
      if (!ok()) return;
      if (now() - coinTime > 0.7) coinCount = 0;
      coinTime = now(); coinCount = Math.min(coinCount + 1, 14);
      const n = 88 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26, 28, 31][coinCount - 1];
      tone('square', hz(n), hz(n), 0.06, 0.035, { filter: 'lowpass', ff: 6000 });
      tone('sine', hz(n + 7), hz(n + 7), 0.18, 0.06, { delay: 0.04, echo: true });
    },
    pickup(kind) {
      const base = { speed: 72, magnet: 67, shield: 64, rocket: 60, jump: 69, double: 74 }[kind] || 70;
      [0, 4, 7, 12, 16].forEach((n, i) => tone('square', hz(base + n), hz(base + n), 0.1, 0.06, { delay: i * 0.05, filter: 'lowpass', ff: 4000 }));
      tone('sine', hz(base + 24), hz(base + 24), 0.5, 0.08, { delay: 0.25, echo: true });
      noise(0.5, 'bandpass', 800, 1, 0.12, { f1: 6000 });
    },
    boost() {
      noise(0.9, 'bandpass', 300, 1.2, 0.35, { f1: 3000 });
      tone('sawtooth', 80, 300, 0.7, 0.12, { filter: 'lowpass', ff: 1200 });
    },
    shieldHit() { tone('sine', 900, 300, 0.4, 0.2, { echo: true }); noise(0.3, 'highpass', 4000, 1, 0.15); },
    hurt() {
      tone('sine', 140, 40, 0.35, 0.6);
      noise(0.25, 'lowpass', 800, 1, 0.45);
      tone('square', 200, 120, 0.2, 0.06, { filter: 'lowpass', ff: 900 });
    },
    explosion(vol = 1, pan = 0) {
      if (!ok()) return;
      noise(1.6, 'lowpass', 1800, 0.7, 0.9 * vol, { f1: 120, pan, verb: 0.6 });
      noise(0.3, 'highpass', 2000, 0.7, 0.4 * vol, { pan });
      tone('sine', 90, 30, 1.0, 0.9 * vol, { pan });
      // crackles
      for (let i = 0; i < 8; i++) noise(0.03, 'bandpass', 1500 + Math.random() * 3000, 2, 0.15 * vol, { delay: 0.15 + Math.random() * 0.8, pan });
    },
    missileLaunch(pan = 0) {
      noise(1.2, 'bandpass', 1500, 0.8, 0.35, { f1: 400, pan });
      tone('sawtooth', 300, 900, 0.5, 0.05, { filter: 'lowpass', ff: 2000, pan });
    },
    warning() {
      tone('square', 1320, 1320, 0.08, 0.08, { filter: 'lowpass', ff: 4000 });
      tone('square', 1320, 1320, 0.08, 0.08, { delay: 0.12, filter: 'lowpass', ff: 4000 });
    },
    rocketFire() {
      noise(0.6, 'bandpass', 2500, 0.7, 0.5, { f1: 300 });
      tone('sine', 200, 60, 0.3, 0.5);
      noise(0.08, 'lowpass', 600, 0.8, 0.6);
    },
    glass() {
      if (!ok()) return;
      noise(0.5, 'highpass', 3500, 0.7, 0.4);
      for (let i = 0; i < 14; i++) tone('sine', 2500 + Math.random() * 4500, 0, 0.05 + Math.random() * 0.15, 0.04, { delay: Math.random() * 0.4 });
    },
    tackle() {
      tone('sawtooth', 240, 130, 0.18, 0.12, { filter: 'bandpass', ff: 900, q: 3 });
      noise(0.15, 'lowpass', 700, 0.8, 0.5);
      tone('sine', 160, 60, 0.2, 0.35);
    },
    stomp() { tone('square', 300, 900, 0.15, 0.08, { filter: 'lowpass', ff: 3000 }); noise(0.1, 'lowpass', 600, 0.8, 0.4); },
    knock() { noise(0.12, 'lowpass', 900, 0.8, 0.5); tone('sine', 220, 80, 0.15, 0.3); tone('square', 600, 1200, 0.12, 0.05, { delay: 0.06, filter: 'lowpass', ff: 3000 }); },
    // the famous deep BOOM
    vineBoom(vol = 1) {
      if (!ok()) return;
      tone('sine', 75, 38, 1.4, 0.95 * vol, { verb: 0.8 });
      tone('triangle', 150, 60, 0.6, 0.35 * vol, { verb: 0.8 });
      noise(0.25, 'lowpass', 900, 0.7, 0.45 * vol, { verb: 1 });
    },
    sigmaOn() {
      S.vineBoom(1.1);
      noise(1.2, 'bandpass', 300, 1, 0.3, { f1: 8000, delay: 0.05 });
      [0, 7, 12, 19, 24].forEach((n, i) => tone('sawtooth', hz(49 + n), hz(49 + n), 0.6, 0.05, { delay: 0.1 + i * 0.06, filter: 'lowpass', ff: 3000, verb: 0.5 }));
    },
    sigmaOff() { tone('sawtooth', 400, 80, 0.6, 0.08, { filter: 'lowpass', ff: 1500 }); },
    siren() {
      if (!ok()) return;
      // "wee-ooo wee-ooo"
      for (let i = 0; i < 3; i++) {
        tone('sawtooth', 700, 1150, 0.45, 0.07, { delay: i * 0.9, slide: 0.4, filter: 'lowpass', ff: 2500, echo: true });
        tone('sawtooth', 1150, 700, 0.45, 0.07, { delay: i * 0.9 + 0.45, slide: 0.4, filter: 'lowpass', ff: 2500, echo: true });
      }
    },
    // a squawky megaphone voice, sounds a bit like "F-B-I! FREEZE!"
    megaphone(pan = 0) {
      if (!ok()) return;
      const syl = [[180, 0.11], [200, 0.11], [230, 0.13], [0, 0.12], [260, 0.32]];
      let t = 0;
      for (const [f, d] of syl) {
        if (f) {
          tone('sawtooth', f, f * 0.85, d, 0.13, { delay: t, filter: 'bandpass', ff: 1400, q: 2.5, pan, echo: true });
          tone('square', f * 2, f * 1.6, d, 0.05, { delay: t, filter: 'bandpass', ff: 2600, q: 3, pan });
          noise(d, 'bandpass', 3000, 2, 0.04, { delay: t, pan });
        }
        t += d + 0.02;
      }
    },
    launchPad() {
      tone('square', 200, 1600, 0.35, 0.12, { filter: 'lowpass', ff: 3000 });
      noise(0.9, 'bandpass', 400, 1, 0.4, { f1: 4000 });
      tone('sine', 80, 40, 0.4, 0.5);
    },
    zipAttach() { tone('square', 1200, 900, 0.08, 0.08, { filter: 'bandpass', ff: 2000, q: 4 }); noise(0.06, 'highpass', 3000, 1, 0.2); },
    aura() { tone('sine', hz(84), hz(96), 0.25, 0.05, { echo: true }); },
    wantedUp(level) {
      S.siren();
      tone('sawtooth', hz(37), hz(37), 0.7, 0.2, { filter: 'lowpass', ff: 400 });
      if (level >= 2) S.vineBoom(0.6);
    },
    heliDown() { S.explosion(1.3); S.vineBoom(1.2); },
    click() { tone('square', 900, 1300, 0.04, 0.05, { filter: 'lowpass', ff: 5000 }); },
    buy() {
      tone('square', hz(84), hz(84), 0.08, 0.06); tone('square', hz(88), hz(88), 0.08, 0.06, { delay: 0.08 });
      tone('square', hz(91), hz(91), 0.3, 0.06, { delay: 0.16, echo: true });
      noise(0.1, 'highpass', 6000, 1, 0.15, { delay: 0.16 });
    },
    nope() { tone('square', 200, 150, 0.15, 0.08, { filter: 'lowpass', ff: 1200 }); },
    // sad "womp womp womp wommmp"
    busted() {
      if (!ok()) return;
      [[62, 0.3], [61, 0.3], [60, 0.3], [59, 0.9]].reduce((t, [n, d]) => {
        tone('sawtooth', hz(n), hz(n) * (d > 0.5 ? 0.94 : 1), d, 0.1, { delay: t, filter: 'lowpass', ff: 900, attack: 0.03 });
        return t + d + 0.05;
      }, 0.2);
      S.vineBoom(0.9);
    },
    record() { [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone('square', hz(72 + n), hz(72 + n), 0.15, 0.06, { delay: i * 0.08, filter: 'lowpass', ff: 5000, echo: true })); },
    countdown(last) { tone('square', last ? 1320 : 880, last ? 1320 : 880, last ? 0.4 : 0.12, 0.08, { filter: 'lowpass', ff: 4000 }); },
    combo(level) { tone('square', hz(72 + level * 2), hz(84 + level * 2), 0.12, 0.05, { filter: 'lowpass', ff: 5000 }); },
    fall() { tone('sine', 900, 120, 1.2, 0.08); noise(1.2, 'bandpass', 800, 1, 0.2, { f1: 300 }); },
  };

  function setMuted(m) {
    if (!ctx) return;
    master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.05);
  }

  return {
    init, S, setLoop, stopLoops, startMusic, stopMusic, setIntensity, restartBeat, muffle, applyVolumes, setMuted,
    get ready() { return !!ctx; },
    get intensity() { return intensity; },
  };
})();
