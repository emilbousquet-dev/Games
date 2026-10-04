// ============================================================
//  DRAGON LIFE — MUSIC & SOUNDS
//  Every sound is made with math (oscillators + noise), so there
//  are no sound files at all! The music makes itself up as it
//  plays: calm in the day, dreamy at night, and big drums when
//  you fly on your dragon.
// ============================================================
window.DL = window.DL || {};

DL.Audio = (function () {
  const U = DL.U;
  let ctx = null, master, sfx, music, amb, verb, verbSend, noiseBuf, windGain, windFilter, waveGain, waveFilter;
  let timer = null, nextT = 0, step = 0, bar = 0;
  const mood = { night: 0, fly: 0, water: 0 };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    sfx = ctx.createGain(); sfx.connect(master);
    music = ctx.createGain(); music.connect(master);
    amb = ctx.createGain(); amb.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // reverb: a pretend big room made from fading noise
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.8, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir;
    verbSend = ctx.createGain(); verbSend.gain.value = 0.5;
    verbSend.connect(verb); verb.connect(master);
    // wind (when you fly) and waves (near the sea)
    const wn = loopNoise();
    windFilter = ctx.createBiquadFilter(); windFilter.type = 'bandpass'; windFilter.frequency.value = 500; windFilter.Q.value = 0.6;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    wn.connect(windFilter); windFilter.connect(windGain); windGain.connect(amb);
    const wv = loopNoise();
    waveFilter = ctx.createBiquadFilter(); waveFilter.type = 'lowpass'; waveFilter.frequency.value = 450;
    waveGain = ctx.createGain(); waveGain.gain.value = 0;
    wv.connect(waveFilter); waveFilter.connect(waveGain); waveGain.connect(amb);
    applyVolumes();
    nextT = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 30);
  }
  function loopNoise() { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(); return s; }
  function applyVolumes() {
    if (!ctx) return;
    music.gain.value = DL.settings.music * 0.55;
    sfx.gain.value = DL.settings.sfx;
    amb.gain.value = DL.settings.sfx * 0.8;
  }

  // ---------------- building blocks ----------------
  function tone(f, t, dur, o = {}) {
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.slide || dur));
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibAmt || 15; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.1); }
    const g = ctx.createGain();
    const v = o.vol === undefined ? 0.3 : o.vol, a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.filter) { const fl = ctx.createBiquadFilter(); fl.type = o.filterType || 'lowpass'; fl.frequency.value = o.filter; fl.Q.value = o.Q || 0.8; osc.connect(fl); node = fl; }
    node.connect(g);
    g.connect(o.dest || sfx);
    if (o.verb) { const s = ctx.createGain(); s.gain.value = o.verb; g.connect(s); s.connect(verbSend); }
    osc.start(t); osc.stop(t + dur + 0.05);
    return osc;
  }
  function noise(t, dur, o = {}) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    s.playbackRate.value = o.rate || 1;
    const fl = ctx.createBiquadFilter(); fl.type = o.type || 'lowpass';
    fl.frequency.setValueAtTime(o.f || 1000, t);
    if (o.f1) fl.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    fl.Q.value = o.Q || 0.7;
    const g = ctx.createGain();
    const v = o.vol === undefined ? 0.3 : o.vol, a = o.attack || 0.003;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(o.dest || sfx);
    if (o.verb) { const sv = ctx.createGain(); sv.gain.value = o.verb; g.connect(sv); sv.connect(verbSend); }
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);   // note number -> frequency

  // ---------------- all the sounds ----------------
  const SOUNDS = {
    step(t, o) { noise(t, 0.08, { f: o.soft ? 1800 : 700, vol: 0.12, type: o.soft ? 'highpass' : 'lowpass', rate: 0.7 }); },
    jump(t) { tone(300, t, 0.15, { f1: 520, vol: 0.08, slide: 0.1 }); },
    land(t) { noise(t, 0.18, { f: 300, vol: 0.35 }); },
    chop(t) { noise(t, 0.1, { f: 900, type: 'bandpass', Q: 2, vol: 0.5 }); tone(160, t, 0.15, { f1: 70, vol: 0.4 }); },
    clink(t) { tone(1900, t, 0.25, { vol: 0.15 }); tone(2700, t, 0.18, { vol: 0.1 }); noise(t, 0.05, { f: 3000, type: 'highpass', vol: 0.2 }); },
    swish(t) { noise(t, 0.2, { f: 600, f1: 2500, type: 'bandpass', Q: 1.5, vol: 0.15 }); },
    treefall(t) { tone(90, t, 0.6, { f1: 45, type: 'sawtooth', vol: 0.12, filter: 300 }); noise(t + 0.55, 0.6, { f: 250, vol: 0.6 }); noise(t + 0.55, 0.4, { f: 2500, type: 'bandpass', vol: 0.2 }); },
    rockbreak(t) { for (let i = 0; i < 4; i++) noise(t + i * 0.05, 0.15, { f: 600 + i * 300, vol: 0.35 }); tone(110, t, 0.3, { f1: 50, vol: 0.3 }); },
    crystal(t) { [1760, 2637, 3520, 2093].forEach((f, i) => tone(f, t + i * 0.06, 1.2, { vol: 0.08, verb: 0.6 })); },
    pick(t) { tone(600, t, 0.1, { f1: 950, vol: 0.18 }); tone(1300, t + 0.05, 0.1, { vol: 0.08 }); },
    cast(t) { noise(t, 0.35, { f: 500, f1: 3000, type: 'bandpass', Q: 2, vol: 0.18 }); for (let i = 0; i < 6; i++) noise(t + i * 0.04, 0.02, { f: 4000, type: 'highpass', vol: 0.06 }); },
    plop(t) { tone(500, t, 0.12, { f1: 140, vol: 0.25 }); },
    bite(t) { tone(420, t, 0.12, { f1: 120, vol: 0.35 }); noise(t, 0.3, { f: 1400, type: 'bandpass', vol: 0.35 }); tone(880, t + 0.05, 0.2, { vol: 0.12 }); },
    reel(t) { for (let i = 0; i < 10; i++) noise(t + i * 0.035, 0.02, { f: 3500, type: 'highpass', vol: 0.08 }); },
    catch(t) { [72, 76, 79, 84].forEach((n, i) => tone(N(n), t + i * 0.08, 0.35, { type: 'triangle', vol: 0.18, verb: 0.3 })); noise(t, 0.5, { f: 1500, type: 'bandpass', vol: 0.3 }); },
    miss(t) { tone(N(67), t, 0.2, { type: 'triangle', vol: 0.15 }); tone(N(62), t + 0.18, 0.35, { type: 'triangle', vol: 0.15 }); },
    throw(t) { noise(t, 0.25, { f: 400, f1: 1800, type: 'bandpass', Q: 1.2, vol: 0.2 }); },
    sizzle(t) { noise(t, 1.0, { f: 3500, type: 'highpass', vol: 0.18 }); for (let i = 0; i < 8; i++) noise(t + Math.random() * 0.9, 0.02, { f: 5000, type: 'highpass', vol: 0.15 }); [79, 84].forEach((n, i) => tone(N(n), t + 0.6 + i * 0.1, 0.3, { type: 'triangle', vol: 0.1 })); },
    no(t) { tone(150, t, 0.18, { type: 'square', vol: 0.06, filter: 800 }); },
    splash(t) { noise(t, 0.5, { f: 1300, type: 'bandpass', Q: 0.8, vol: 0.4 }); noise(t, 0.2, { f: 300, vol: 0.3 }); },
    eat(t) { for (let i = 0; i < 3; i++) noise(t + i * 0.14, 0.07, { f: 1400, type: 'bandpass', Q: 2, vol: 0.3 }); },
    chomp(t) { for (let i = 0; i < 4; i++) { noise(t + i * 0.16, 0.08, { f: 800, type: 'bandpass', Q: 1.5, vol: 0.45 }); tone(180, t + i * 0.16, 0.06, { vol: 0.2 }); } },
    crack(t, o) { noise(t, 0.04, { f: 3000, type: 'highpass', vol: o.soft ? 0.15 : 0.4 }); tone(1200, t, 0.05, { f1: 600, vol: o.soft ? 0.05 : 0.15 }); },
    pickup(t) { [72, 76, 79].forEach((n, i) => tone(N(n), t + i * 0.07, 0.25, { type: 'triangle', vol: 0.15 })); },
    place(t) { noise(t, 0.15, { f: 400, vol: 0.4 }); tone(120, t, 0.15, { f1: 80, vol: 0.2 }); },
    hatch(t) {
      for (let i = 0; i < 5; i++) SOUNDS.crack(t + i * 0.12, {});
      [72, 76, 79, 83, 86, 91].forEach((n, i) => tone(N(n), t + 0.7 + i * 0.09, 1.4, { vol: 0.1, verb: 0.7 }));
      SOUNDS.chirp(t + 1.3, {});
    },
    chirp(t, o) {
      const v = o.soft ? 0.08 : 0.16;
      tone(1100, t, 0.16, { f1: 2100, slide: 0.08, vol: v, vib: 30, vibAmt: 60 });
      tone(1500, t + 0.18, 0.2, { f1: 1900, slide: 0.1, vol: v, vib: 25, vibAmt: 80 });
    },
    purr(t) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55;
      const am = ctx.createOscillator(); am.frequency.value = 22; const amg = ctx.createGain(); amg.gain.value = 0.5;
      const g = ctx.createGain(); g.gain.value = 0.0001;
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 260;
      am.connect(amg); amg.connect(g.gain);
      o.connect(fl); fl.connect(g); g.connect(sfx);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + 0.2); g.gain.linearRampToValueAtTime(0.0001, t + 1.3);
      o.start(t); am.start(t); o.stop(t + 1.4); am.stop(t + 1.4);
    },
    grow(t) { tone(200, t, 1.5, { f1: 1600, slide: 1.2, type: 'triangle', vol: 0.15, verb: 0.5 }); [84, 88, 91, 96].forEach((n, i) => tone(N(n), t + 1 + i * 0.1, 1.2, { vol: 0.1, verb: 0.6 })); },
    roar(t, o) {
      const v = (o.vol || 1) * (o.soft ? 0.35 : 0.7);
      noise(t, 1.3, { f: 500, f1: 250, vol: v * 0.7, attack: 0.08, verb: o.far ? 0.8 : 0.3 });
      tone(110, t, 1.2, { f1: 65, type: 'sawtooth', vol: v * 0.35, filter: 700, attack: 0.08, vib: 9, vibAmt: 8, verb: 0.3 });
      tone(160, t, 1.0, { f1: 95, type: 'sawtooth', vol: v * 0.2, filter: 1200, attack: 0.05, vib: 11, vibAmt: 10 });
    },
    flap(t, o) { noise(t, 0.35, { f: 350, f1: 150, vol: 0.35 * (o.vol || 1), attack: 0.08 }); },
    sad(t) { tone(900, t, 0.5, { f1: 550, vol: 0.1, vib: 6, vibAmt: 20 }); },
    whistle(t) { tone(1500, t, 0.16, { f1: 2200, slide: 0.12, vol: 0.12 }); tone(1500, t + 0.22, 0.3, { f1: 2500, slide: 0.2, vol: 0.12 }); },
    fire(t) { noise(t, 0.6, { f: 700, type: 'bandpass', Q: 0.6, vol: 0.4, attack: 0.05 }); noise(t, 0.6, { f: 200, vol: 0.3, attack: 0.05 }); for (let i = 0; i < 5; i++) noise(t + Math.random() * 0.5, 0.03, { f: 3000, type: 'highpass', vol: 0.12 }); },
    puff(t) { noise(t, 0.3, { f: 600, vol: 0.2, attack: 0.03 }); },
    stomp(t) { tone(70, t, 0.2, { f1: 40, vol: 0.25 }); },
    build(t) { noise(t, 0.08, { f: 1000, type: 'bandpass', Q: 3, vol: 0.4 }); noise(t + 0.12, 0.08, { f: 800, type: 'bandpass', Q: 3, vol: 0.4 }); tone(N(79), t + 0.2, 0.2, { type: 'triangle', vol: 0.08 }); },
    remove(t) { tone(500, t, 0.15, { f1: 200, vol: 0.15 }); noise(t, 0.12, { f: 600, vol: 0.2 }); },
    coin(t) { tone(N(83), t, 0.08, { type: 'square', vol: 0.06, filter: 4000 }); tone(N(88), t + 0.08, 0.3, { type: 'square', vol: 0.06, filter: 4000 }); },
    stone(t) { tone(110, t, 1.5, { vol: 0.15, verb: 0.8 }); tone(165, t, 1.5, { vol: 0.08, verb: 0.8 }); },
    treasure(t) { [72, 76, 79, 84, 88, 91].forEach((n, i) => tone(N(n), t + i * 0.07, 0.6, { type: 'triangle', vol: 0.13, verb: 0.4 })); for (let i = 0; i < 10; i++) tone(N(96 + (i % 5)), t + 0.4 + i * 0.05, 0.3, { vol: 0.04 }); },
    whoosh(t) { noise(t, 0.8, { f: 300, f1: 2500, type: 'bandpass', vol: 0.4 }); noise(t, 1, { f: 200, vol: 0.3 }); },
    rumble(t) { noise(t, 2.5, { f: 120, vol: 0.6, attack: 0.3, rate: 0.5 }); },
    fanfare(t) {
      const chord = [60, 64, 67, 72];
      chord.forEach((n, i) => tone(N(n), t + i * 0.15, 0.4, { type: 'sawtooth', vol: 0.08, filter: 2000, verb: 0.4 }));
      chord.concat([76]).forEach(n => tone(N(n), t + 0.7, 2.2, { type: 'sawtooth', vol: 0.06, filter: 2500, attack: 0.05, verb: 0.6 }));
      [84, 88, 91, 96].forEach((n, i) => tone(N(n), t + 0.8 + i * 0.12, 1.5, { vol: 0.05, verb: 0.7 }));
    },
    quest(t) { [76, 79, 84].forEach((n, i) => tone(N(n), t + i * 0.12, 0.6, { type: 'triangle', vol: 0.12, verb: 0.5 })); },
    discover(t) { [60, 67, 72, 76].forEach(n => tone(N(n), t, 2.5, { type: 'triangle', vol: 0.06, attack: 0.3, verb: 0.7 })); tone(N(88), t + 0.4, 1.5, { vol: 0.06, verb: 0.8 }); },
    ouch(t) { tone(420, t, 0.25, { f1: 180, type: 'square', vol: 0.08, filter: 1500 }); },
    ui(t) { tone(1200, t, 0.04, { vol: 0.06 }); },
    open(t) { tone(700, t, 0.08, { f1: 1000, vol: 0.08 }); },
  };

  function play(name, o = {}) {
    if (!ctx || !SOUNDS[name]) return;
    try { SOUNDS[name](ctx.currentTime + 0.01, o); } catch (e) { /* never crash because of a sound */ }
  }

  // ---------------- music that makes itself up ----------------
  // 8 steps per bar. Chords change every bar.
  const DAY_CHORDS = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];       // C G Am F
  const NIGHT_CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];     // Am F C G
  const PENTA = [0, 2, 4, 7, 9];
  let melodyNote = 72;
  function schedule() {
    if (!ctx) return;
    while (nextT < ctx.currentTime + 0.15) {
      const tempo = U.lerp(U.lerp(78, 64, mood.night), 112, mood.fly);
      const stepDur = 60 / tempo / 2;
      musicStep(nextT, stepDur);
      nextT += stepDur;
      step++;
      if (step % 8 === 0) bar++;
    }
  }
  function musicStep(t, sd) {
    if (DL.settings.music <= 0) return;
    const night = mood.night > 0.5;
    const chords = night ? NIGHT_CHORDS : DAY_CHORDS;
    const ch = chords[bar % 4];
    const s = step % 8;
    const fly = mood.fly;
    // soft pad on the first step of each bar
    if (s === 0) {
      for (const n of ch) tone(N(n), t, sd * 8.5, { type: 'triangle', vol: 0.035 + fly * 0.015, attack: 0.6, verb: 0.6, dest: music, filter: 1400 });
      tone(N(ch[0] - 24), t, sd * 7, { type: 'sine', vol: 0.07 + fly * 0.05, attack: 0.05, dest: music });
    }
    // melody: little notes from the 5-note scale
    const playChance = night ? 0.35 : 0.5 + fly * 0.3;
    if ((s % 2 === 0 || fly > 0.5) && Math.random() < playChance) {
      let options = [];
      for (let o = 60; o < 90; o += 12) for (const p of PENTA) options.push(o + p);
      options = options.filter(n => Math.abs(n - melodyNote) <= 5 && n >= 64 && n <= 86);
      melodyNote = options.length ? U.pick(options) : 72;
      const bell = night;
      tone(N(melodyNote), t, bell ? 1.4 : 0.7, { type: bell ? 'sine' : 'triangle', vol: bell ? 0.05 : 0.06, verb: 0.55, dest: music });
      if (bell) tone(N(melodyNote + 12), t, 0.6, { vol: 0.012, dest: music });
    }
    // drums when you fly!
    if (fly > 0.3) {
      if (s === 0 || s === 4) tone(110, t, 0.25, { f1: 45, slide: 0.15, vol: 0.32 * fly, dest: music });
      if (s === 2 || s === 6) noise(t, 0.12, { f: 1800, type: 'bandpass', vol: 0.12 * fly, dest: music });
      noise(t, 0.04, { f: 7000, type: 'highpass', vol: 0.04 * fly, dest: music });
      if (s % 2 === 1) tone(N(ch[0] - 12), t, sd * 0.9, { type: 'sawtooth', vol: 0.04 * fly, filter: 600, dest: music });
    }
  }

  // ---------------- every frame ----------------
  let birdT = 3, cricketT = 1;
  function update(dt, st) {
    if (!ctx) return;
    mood.night = U.damp(mood.night, st.night, 0.5, dt);
    mood.fly = U.damp(mood.fly, st.flying ? 1 : 0, 0.8, dt);
    waveGain.gain.value = U.damp(waveGain.gain.value, st.water * (0.1 + 0.06 * Math.sin(ctx.currentTime * 0.4)), 2, dt);
    // birds sing in the day, crickets at night
    birdT -= dt; cricketT -= dt;
    if (birdT < 0) {
      birdT = U.rand(2, 7);
      if (st.night < 0.3 && st.land && !st.flying) {
        const t = ctx.currentTime, f = U.rand(2200, 3800), n = U.randInt(2, 5);
        for (let i = 0; i < n; i++) tone(f * U.rand(0.9, 1.15), t + i * 0.11, 0.08, { f1: f * U.rand(1.1, 1.4), vol: 0.025, verb: 0.3, dest: amb });
      }
    }
    if (cricketT < 0) {
      cricketT = U.rand(0.4, 1.2);
      if (st.night > 0.6 && st.land && !st.flying) {
        const t = ctx.currentTime;
        for (let i = 0; i < 4; i++) tone(4400, t + i * 0.05, 0.03, { vol: 0.012, dest: amb });
      }
    }
  }
  function wind(k) {
    if (!ctx) return;
    windGain.gain.value = U.damp(windGain.gain.value, k * 0.35, 4, 1 / 60);
    windFilter.frequency.value = 300 + k * 900;
  }

  return { init, play, update, wind, applyVolumes, get ready() { return !!ctx; } };
})();
