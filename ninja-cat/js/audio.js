// ============================================================
//  NINJA CAT — MUSIC & SOUNDS
//  Every sound is made with math (oscillators + noise), so
//  there are no sound files at all!
//  The music uses Japanese scales: a bamboo flute, a koto
//  (a Japanese harp) and big taiko drums.
// ============================================================
window.NC = window.NC || {};

NC.Audio = (function () {
  const U = NC.U;
  let ctx = null, master, sfxBus, musicBus, musicFilter, noiseBuf, verb, verbSend;
  let vols = { music: NC.store.get('musicVol', 0.7), sfx: NC.store.get('sfxVol', 0.9) };
  let listener = null; // game tells us how loud a sound at (x, z) should be

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.85; master.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 20000;
    musicBus = ctx.createGain(); musicBus.connect(musicFilter); musicFilter.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a temple-sized echo
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = ir;
    verbSend = ctx.createGain(); verbSend.gain.value = 1; verbSend.connect(verb);
    const vOut = ctx.createGain(); vOut.gain.value = 0.3; verb.connect(vOut); vOut.connect(master);
    applyVolumes();
  }
  function applyVolumes() {
    if (!ctx) return;
    musicBus.gain.value = vols.music * 0.55;
    sfxBus.gain.value = vols.sfx;
  }
  function setVolume(kind, v) { vols[kind] = U.clamp(v, 0, 1); NC.store.set(kind + 'Vol', vols[kind]); applyVolumes(); }

  // ---------- little building blocks ----------
  const now = () => ctx.currentTime;
  function env(g, t, a, peak, d, end = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a);
    g.gain.exponentialRampToValueAtTime(end, t + a + d);
  }
  function out(dest, pan) {
    if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = U.clamp(pan, -1, 1); p.connect(dest); return p; }
    return dest;
  }
  function osc(type, f, t, dur, peak, dest, o = {}) {
    const s = ctx.createOscillator(), g = ctx.createGain();
    s.type = type; s.frequency.setValueAtTime(f, t);
    if (o.to) s.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.glide || dur));
    if (o.detune) s.detune.value = o.detune;
    env(g, t, o.a || 0.005, peak, dur);
    s.connect(g); g.connect(dest);
    if (o.verb) { const vs = ctx.createGain(); vs.gain.value = o.verb; g.connect(vs); vs.connect(verbSend); }
    s.start(t); s.stop(t + (o.a || 0.005) + dur + 0.05);
    return s;
  }
  function noise(t, dur, peak, dest, o = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    s.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass';
    f.frequency.setValueAtTime(o.f || 2000, t);
    if (o.fTo) f.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    env(g, t, o.a || 0.003, peak, dur);
    s.connect(f); f.connect(g); g.connect(dest);
    if (o.verb) { const vs = ctx.createGain(); vs.gain.value = o.verb; g.connect(vs); vs.connect(verbSend); }
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // ---------- SOUND EFFECTS ----------
  const SFX = {
    jump(t, d) { osc('square', 300, t, 0.12, 0.12, d, { to: 620, glide: 0.1 }); noise(t, 0.08, 0.1, d, { type: 'highpass', f: 3000 }); },
    djump(t, d) { osc('triangle', 500, t, 0.18, 0.18, d, { to: 1100, glide: 0.15 }); osc('sine', 1500, t + 0.05, 0.15, 0.08, d, { to: 2200 }); noise(t, 0.2, 0.12, d, { type: 'bandpass', f: 1500, fTo: 4000 }); },
    land(t, d) { noise(t, 0.08, 0.25, d, { f: 500 }); },
    wallJump(t, d) { osc('square', 400, t, 0.1, 0.1, d, { to: 800 }); noise(t, 0.1, 0.2, d, { type: 'bandpass', f: 1200 }); },
    climb(t, d) { noise(t, 0.05, 0.08, d, { type: 'bandpass', f: 2500, q: 2 }); },
    slash(t, d, o) {
      const big = o && o.n === 3;
      noise(t, big ? 0.32 : 0.16, big ? 0.55 : 0.4, d, { type: 'bandpass', f: big ? 6000 : 4500, fTo: 600, q: 1.5 });
      osc('sine', big ? 1400 : 1800, t, 0.08, 0.05, d, { to: 600 });
    },
    hit(t, d) { noise(t, 0.12, 0.6, d, { f: 1800, fTo: 300 }); osc('sine', 180, t, 0.15, 0.5, d, { to: 60 }); },
    clang(t, d) { [820, 1270, 1930, 2610].forEach((f, i) => osc('sine', f, t, 0.5 - i * 0.08, 0.15, d, { verb: 0.3 })); noise(t, 0.05, 0.3, d, { type: 'highpass', f: 4000 }); },
    star(t, d) { noise(t, 0.15, 0.3, d, { type: 'bandpass', f: 3000, fTo: 7000, q: 3 }); osc('sine', 3200, t + 0.02, 0.1, 0.04, d); },
    starHit(t, d) { osc('sine', 2400, t, 0.15, 0.15, d, { to: 1800 }); osc('sine', 3700, t, 0.1, 0.08, d); },
    smoke(t, d) { noise(t, 0.7, 0.6, d, { f: 1400, fTo: 200 }); noise(t, 0.3, 0.2, d, { type: 'highpass', f: 5000 }); [1200, 1600, 2000].forEach((f, i) => osc('sine', f, t + i * 0.06, 0.2, 0.05, d, { verb: 0.5 })); },
    meow(t, d, o) {
      // a cat sound: a buzzy tone through two "mouth" filters
      const base = (o && o.p) || 1;
      const s = ctx.createOscillator(); s.type = 'sawtooth';
      s.frequency.setValueAtTime(520 * base, t); s.frequency.linearRampToValueAtTime(820 * base, t + 0.12); s.frequency.linearRampToValueAtTime(480 * base, t + 0.38);
      const g = ctx.createGain(); env(g, t, 0.03, 0.35, 0.38);
      const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 6; f1.frequency.setValueAtTime(800, t); f1.frequency.linearRampToValueAtTime(1300, t + 0.15); f1.frequency.linearRampToValueAtTime(700, t + 0.4);
      const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 8; f2.frequency.value = 2600;
      const g2 = ctx.createGain(); g2.gain.value = 0.5;
      s.connect(f1); s.connect(f2); f2.connect(g2); f1.connect(g); g2.connect(g); g.connect(d);
      s.start(t); s.stop(t + 0.5);
    },
    mrrp(t, d) { SFX.meow(t, d, { p: 1.4 }); },
    purr(t, d) {
      const s = ctx.createBufferSource(); s.buffer = noiseBuf;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
      const g = ctx.createGain(); g.gain.value = 0;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 24; const lg = ctx.createGain(); lg.gain.value = 0.5;
      lfo.connect(lg); lg.connect(g.gain);
      const e = ctx.createGain(); env(e, t, 0.1, 1.2, 0.8);
      s.connect(f); f.connect(g); g.connect(e); e.connect(d);
      s.start(t); s.stop(t + 1); lfo.start(t); lfo.stop(t + 1);
    },
    coin(t, d) { osc('square', 1320, t, 0.06, 0.08, d); osc('square', 1760, t + 0.06, 0.18, 0.08, d); },
    bell(t, d) { [1, 2.4, 3.9, 5.4].forEach((m, i) => osc('sine', 880 * m, t, 1.8 - i * 0.3, 0.2 / (i + 1), d, { verb: 0.6 })); },
    pickup(t, d) { [0, 4, 7, 12].forEach((s, i) => osc('triangle', mtof(72 + s), t + i * 0.05, 0.12, 0.15, d)); },
    heal(t, d) { [0, 7, 12, 16].forEach((s, i) => osc('sine', mtof(76 + s), t + i * 0.07, 0.25, 0.12, d, { verb: 0.3 })); SFX.purr(t + 0.1, d); },
    lifeUp(t, d) { [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => osc('square', mtof(72 + s), t + i * 0.06, 0.1, 0.07, d)); },
    checkpoint(t, d) { [1, 1.5, 2.76, 4.1].forEach((m, i) => osc('sine', 196 * m, t, 2.2 - i * 0.4, 0.25 / (i + 1), d, { verb: 0.8 })); },
    drum(t, d) { taiko(t, d, 1.3); osc('sine', 200, t, 0.35, 0.3, d, { to: 900, glide: 0.3 }); },
    superJump(t, d) { osc('square', 200, t, 0.4, 0.15, d, { to: 1600, glide: 0.35 }); osc('sine', 400, t, 0.4, 0.2, d, { to: 2400, glide: 0.35 }); },
    bark(t, d, o) {
      const p = (o && o.p) || 1;
      for (let k = 0; k < 2; k++) {
        const tt = t + k * 0.16;
        osc('square', 360 * p, tt, 0.1, 0.18, d, { to: 180 * p });
        noise(tt, 0.1, 0.4, d, { type: 'bandpass', f: 900 * p, q: 3 });
      }
    },
    alert(t, d) { osc('square', 1200, t, 0.06, 0.12, d); osc('square', 1800, t + 0.07, 0.15, 0.12, d); },
    lost(t, d) { osc('triangle', 900, t, 0.25, 0.12, d, { to: 600 }); },
    yelp(t, d) { osc('sine', 900, t, 0.15, 0.3, d, { to: 1500, glide: 0.06 }); noise(t, 0.1, 0.2, d, { type: 'bandpass', f: 2000 }); },
    squeak(t, d) { osc('sine', 2200, t, 0.1, 0.2, d, { to: 3200 }); osc('sine', 2600, t + 0.08, 0.08, 0.15, d, { to: 3600 }); },
    caw(t, d) { noise(t, 0.25, 0.5, d, { type: 'bandpass', f: 1100, q: 4 }); osc('sawtooth', 500, t, 0.25, 0.1, d, { to: 380 }); },
    ribbit(t, d) { for (let k = 0; k < 3; k++) osc('square', 220, t + k * 0.05, 0.04, 0.15, d, { to: 160 }); },
    poof(t, d) { noise(t, 0.35, 0.5, d, { f: 2500, fTo: 300 }); osc('sine', 1600, t + 0.05, 0.3, 0.08, d, { to: 2400, verb: 0.4 }); },
    potBreak(t, d) { noise(t, 0.2, 0.6, d, { type: 'highpass', f: 1500 }); [2100, 2900, 3800].forEach((f, i) => osc('sine', f, t + i * 0.03, 0.12, 0.08, d)); },
    splash(t, d) { noise(t, 0.6, 0.7, d, { f: 3000, fTo: 300 }); noise(t + 0.1, 0.4, 0.3, d, { type: 'highpass', f: 2000 }); },
    spike(t, d) { noise(t, 0.12, 0.35, d, { type: 'highpass', f: 3500 }); osc('sine', 2600, t, 0.1, 0.06, d); },
    alarm(t, d) { for (let k = 0; k < 4; k++) osc('square', k % 2 ? 660 : 880, t + k * 0.18, 0.16, 0.12, d); SFX.checkpoint(t, d); },
    rocket(t, d) { noise(t, 0.6, 0.35, d, { type: 'bandpass', f: 800, fTo: 3000, q: 2 }); osc('sawtooth', 200, t, 0.5, 0.06, d, { to: 900 }); },
    boom(t, d) { noise(t, 0.9, 1.0, d, { f: 1500, fTo: 80 }); osc('sine', 120, t, 0.6, 0.8, d, { to: 35 }); },
    roar(t, d) {
      const s = ctx.createOscillator(); s.type = 'sawtooth';
      s.frequency.setValueAtTime(110, t); s.frequency.linearRampToValueAtTime(160, t + 0.3); s.frequency.linearRampToValueAtTime(70, t + 1.1);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      const g = ctx.createGain(); env(g, t, 0.08, 0.5, 1.1);
      const am = ctx.createOscillator(); am.frequency.value = 30; const ag = ctx.createGain(); ag.gain.value = 0.4; am.connect(ag); ag.connect(g.gain);
      s.connect(f); f.connect(g); g.connect(d);
      s.start(t); s.stop(t + 1.3); am.start(t); am.stop(t + 1.3);
      noise(t, 1.0, 0.3, d, { type: 'bandpass', f: 600, q: 1 });
    },
    stomp(t, d) { taiko(t, d, 1.6); noise(t, 0.4, 0.5, d, { f: 400 }); },
    robot(t, d) { [0, 1, 2].forEach((k) => osc('square', 140 + k * 40, t + k * 0.08, 0.07, 0.1, d)); noise(t, 0.3, 0.2, d, { type: 'highpass', f: 6000 }); },
    steam(t, d) { noise(t, 1.2, 0.4, d, { type: 'highpass', f: 3000, fTo: 6000 }); },
    win(t, d) {
      const notes = [62, 64, 67, 69, 74, 0, 69, 74];
      notes.forEach((m, i) => { if (m) { osc('triangle', mtof(m + 12), t + i * 0.13, 0.25, 0.2, d, { verb: 0.3 }); osc('sine', mtof(m), t + i * 0.13, 0.3, 0.15, d); } });
      taiko(t, d, 1); taiko(t + 0.52, d, 1); taiko(t + 0.91, d, 1.3);
    },
    lose(t, d) { [69, 65, 62, 57].forEach((m, i) => osc('triangle', mtof(m), t + i * 0.22, 0.35, 0.18, d, { verb: 0.3 })); },
    menu(t, d) { osc('square', 880, t, 0.04, 0.06, d); },
    select(t, d) { osc('square', 880, t, 0.05, 0.08, d); osc('square', 1320, t + 0.05, 0.08, 0.08, d); },
    buy(t, d) { SFX.coin(t, d); SFX.pickup(t + 0.1, d); },
    nope(t, d) { osc('square', 200, t, 0.15, 0.1, d); osc('square', 150, t + 0.12, 0.2, 0.1, d); },
    gong(t, d) { [1, 1.48, 2.6, 3.9].forEach((m, i) => osc('sine', 110 * m, t, 3 - i * 0.5, 0.35 / (i + 1), d, { verb: 1 })); },
  };
  function taiko(t, d, v = 1) {
    osc('sine', 120, t, 0.45 * v, 0.9 * v, d, { to: 48, glide: 0.25 });
    noise(t, 0.12, 0.5 * v, d, { f: 500 });
  }

  // play a sound. "o.x, o.z" = where it happens (quieter far away)
  function play(name, o = {}) {
    if (!ctx || !SFX[name]) return;
    let vol = o.vol == null ? 1 : o.vol, pan = 0;
    if (o.x != null && listener) {
      const l = listener(o.x, o.z, o.range || 30);
      vol *= l.vol; pan = l.pan;
      if (vol < 0.02) return;
    }
    const g = ctx.createGain(); g.gain.value = vol;
    g.connect(out(sfxBus, pan));
    try { SFX[name](now() + (o.delay || 0), g, o); } catch (e) { /* never crash because of a sound */ }
    setTimeout(() => { try { g.disconnect(); } catch (e) { /* already gone */ } }, 4000);
  }

  // ============================================================
  //  MUSIC
  // ============================================================
  const YO = [0, 2, 5, 7, 9];   // happy Japanese scale
  const IN = [0, 1, 5, 7, 8];   // spooky Japanese scale
  const SONGS = {
    title: { bpm: 96, root: 62, scale: YO, seed: 3, drums: 'soft' },
    village: { bpm: 104, root: 62, scale: YO, seed: 7, drums: 'walk' },
    docks: { bpm: 118, root: 65, scale: YO, seed: 12, drums: 'bounce' },
    forest: { bpm: 92, root: 64, scale: IN, seed: 21, drums: 'soft' },
    castle: { bpm: 124, root: 57, scale: IN, seed: 33, drums: 'march' },
    pagoda: { bpm: 120, root: 67, scale: YO, seed: 41, drums: 'march' },
    boss: { bpm: 152, root: 62, scale: IN, seed: 55, drums: 'boss' },
    ending: { bpm: 90, root: 60, scale: YO, seed: 77, drums: 'soft' },
  };
  let song = null, songName = '', timer = null, nextT = 0, step = 0, data = null;

  // make up a melody that is the same every time (seeded random)
  function compose(s) {
    const r = U.seeded(s.seed);
    const deg = (d) => s.root + 12 * Math.floor(d / 5) + s.scale[((d % 5) + 5) % 5];
    function phrase(startDeg) {
      const notes = new Array(32).fill(null); // 2 bars of 16ths
      let d = startDeg, i = 0;
      while (i < 28) {
        const len = r() < 0.6 ? 2 : r() < 0.5 ? 4 : 1;
        if (r() < 0.15) { i += len; continue; }   // a little rest
        d = U.clamp(d + Math.round((r() - 0.5) * 4), 3, 12);
        notes[i] = { m: deg(d), len };
        i += len;
      }
      notes[28] = { m: deg(r() < 0.5 ? 5 : 8), len: 4 }; // end on a strong note
      return notes;
    }
    const A = phrase(7), B = phrase(9), C = phrase(6);
    const melody = [...A, ...B, ...A, ...C];      // 8 bars
    const chords = [0, 0, 2, 3, 0, 0, 2, 0].map((c) => (r() < 0.25 ? (c + 3) % 5 : c));
    return { melody, chords, deg };
  }

  function flute(t, f, dur, v, d) {
    const s = ctx.createOscillator(); s.type = 'sine'; s.frequency.value = f;
    const s2 = ctx.createOscillator(); s2.type = 'triangle'; s2.frequency.value = f * 2;
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5;
    const vg = ctx.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(dur, 0.35));
    vib.connect(vg); vg.connect(s.frequency); vg.connect(s2.frequency);
    // a little "slide up" into the note, like a shakuhachi
    s.frequency.setValueAtTime(f * 0.97, t); s.frequency.linearRampToValueAtTime(f, t + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * v, t + 0.05);
    g.gain.setValueAtTime(0.2 * v, t + Math.max(0.06, dur - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    const g2 = ctx.createGain(); g2.gain.value = 0.08;
    s.connect(g); s2.connect(g2); g2.connect(g); g.connect(d);
    const vs = ctx.createGain(); vs.gain.value = 0.5; g.connect(vs); vs.connect(verbSend);
    noise(t, 0.12, 0.05 * v, d, { type: 'bandpass', f: f * 2, q: 2 }); // breath
    for (const o of [s, s2, vib]) { o.start(t); o.stop(t + dur + 0.2); }
  }
  function koto(t, f, v, d, bright = 1) {
    const s = ctx.createOscillator(); s.type = 'sawtooth';
    s.frequency.setValueAtTime(f * 1.01, t); s.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 2;
    fl.frequency.setValueAtTime(3500 * bright, t); fl.frequency.exponentialRampToValueAtTime(500, t + 0.5);
    const g = ctx.createGain(); env(g, t, 0.003, 0.18 * v, 1.1);
    s.connect(fl); fl.connect(g); g.connect(d);
    const vs = ctx.createGain(); vs.gain.value = 0.25; g.connect(vs); vs.connect(verbSend);
    s.start(t); s.stop(t + 1.2);
  }
  function bass(t, f, dur, v, d) {
    osc('sine', f, t, dur, 0.35 * v, d, { a: 0.01 });
    osc('triangle', f, t, dur * 0.6, 0.1 * v, d, { a: 0.01 });
  }
  function ka(t, v, d) { noise(t, 0.04, 0.25 * v, d, { type: 'bandpass', f: 2500, q: 4 }); }
  function shaker(t, v, d) { noise(t, 0.035, 0.08 * v, d, { type: 'highpass', f: 7000 }); }

  const DRUMS = {
    // which 16th steps (0-15) get a big taiko (T), a rim "ka" (k) or a shaker (s)
    soft: { T: [0, 10], k: [8], s: [4, 12] },
    walk: { T: [0, 6, 8], k: [4, 12, 14], s: [2, 6, 10, 14] },
    bounce: { T: [0, 3, 8, 11], k: [4, 12], s: [2, 6, 10, 14, 15] },
    march: { T: [0, 4, 8, 10, 12], k: [2, 6, 14], s: [1, 3, 5, 7, 9, 11, 13, 15] },
    boss: { T: [0, 2, 4, 7, 8, 10, 12, 14, 15], k: [3, 6, 11], s: [1, 5, 9, 13] },
  };

  function scheduleStep(t) {
    const s = song, D = data;
    const bar = Math.floor(step / 16) % 8, i16 = step % 16;
    const spb = 60 / s.bpm / 4;
    const dest = musicBus;
    // melody (flute), sometimes an octave down on the second time around
    const n = D.melody[(step) % D.melody.length];
    if (n) flute(t, mtof(n.m), n.len * spb * 0.95, 0.9, dest);
    // koto plays the chord notes
    const c = D.chords[bar];
    if (i16 % 2 === 0) {
      const arp = [0, 2, 4, 2, 5, 2, 4, 2];
      const d = 0 + c + arp[(i16 / 2) % 8];
      koto(t, mtof(D.deg(d)), i16 === 0 ? 1 : 0.7, dest, s.drums === 'boss' ? 1.4 : 1);
    }
    // bass on beats 1 and 3
    if (i16 === 0 || i16 === 8 || (s.drums === 'boss' && i16 % 4 === 2)) bass(t, mtof(D.deg(c) - 24), spb * 3, 1, dest);
    // drums
    const P = DRUMS[s.drums];
    if (P.T.includes(i16)) taiko(t, dest, i16 === 0 ? 1 : 0.7);
    if (P.k.includes(i16)) ka(t, 1, dest);
    if (P.s.includes(i16)) shaker(t, 1, dest);
    // the big gong at the start of the song loop
    if (step % 128 === 0 && s.drums !== 'soft') { const g = ctx.createGain(); g.gain.value = 0.35; g.connect(dest); SFX.gong(t, g); }
  }

  function tick() {
    if (!ctx || !song) return;
    const spb = 60 / song.bpm / 4;
    while (nextT < ctx.currentTime + 0.15) {
      scheduleStep(nextT);
      nextT += spb;
      step++;
    }
  }

  function music(name) {
    if (!ctx) return;
    if (name === songName) return;
    songName = name;
    if (timer) { clearInterval(timer); timer = null; }
    song = SONGS[name] || null;
    if (!song) return;
    data = compose(song);
    step = 0;
    nextT = ctx.currentTime + 0.1;
    timer = setInterval(tick, 30);
  }
  // muffled music (pause menu)
  function muffle(on) {
    if (!ctx) return;
    musicFilter.frequency.setTargetAtTime(on ? 600 : 20000, ctx.currentTime, 0.1);
  }

  return {
    init, play, music, muffle, setVolume,
    get vols() { return vols; },
    setListener(f) { listener = f; },
    get ready() { return !!ctx; },
  };
})();
