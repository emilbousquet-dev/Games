// ============================================================
//  STARFALL — SOUNDS AND MUSIC (all made with math, no sound files!)
// ============================================================
window.SF = window.SF || {};

SF.Audio = (function () {
  let ctx = null, master, musicBus, sfxBus, noiseBuf;
  let musicVol = 0.5, sfxVol = 0.8;
  try {
    const v = JSON.parse(localStorage.getItem('starfall.vol') || 'null');
    if (v) { musicVol = v.m; sfxVol = v.s; }
  } catch (e) {}

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    musicBus = ctx.createGain(); musicBus.gain.value = musicVol * 0.55; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVol; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a soft echo for the music
    const delay = ctx.createDelay(); delay.delayTime.value = 0.33;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.3;
    musicBus.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
    setInterval(schedule, 50);
  }

  const now = () => (ctx ? ctx.currentTime : 0);
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // one note
  function tone(f, dur, { type = 'sine', vol = 0.3, when = 0, att = 0.005, slide = 0, dest = sfxBus, filter = 0 } = {}) {
    if (!ctx) return;
    const t = now() + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let last = o;
    if (filter) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = filter; o.connect(fl); last = fl; }
    last.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // a burst of noise (for whooshes, thumps and splashes)
  function noise(dur, { vol = 0.3, when = 0, type = 'bandpass', f = 1000, f2 = 0, q = 1, dest = sfxBus, att = 0.005 } = {}) {
    if (!ctx) return;
    const t = now() + when;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }

  // ---------- sound effects ----------
  const SFX = {
    swing: (i = 0) => { noise(0.18, { vol: 0.25, f: 700 + i * 300, f2: 3500, q: 2 }); tone(300 + i * 60, 0.12, { type: 'sine', vol: 0.06, slide: 900 }); },
    hit: () => { tone(160, 0.15, { type: 'square', vol: 0.15, slide: 50, filter: 1200 }); noise(0.12, { vol: 0.35, f: 1800, q: 0.8 }); },
    clank: () => { tone(1250, 0.35, { type: 'triangle', vol: 0.16 }); tone(1870, 0.25, { type: 'triangle', vol: 0.1 }); noise(0.05, { vol: 0.2, f: 5000 }); },
    block: () => { tone(900, 0.2, { type: 'sine', vol: 0.18, slide: 600 }); noise(0.1, { vol: 0.2, f: 3000, q: 3 }); },
    hurt: () => { tone(420, 0.3, { type: 'sawtooth', vol: 0.14, slide: 120, filter: 1500 }); noise(0.15, { vol: 0.2, f: 600 }); },
    jump: () => tone(280, 0.14, { type: 'sine', vol: 0.12, slide: 560 }),
    land: () => noise(0.12, { vol: 0.18, f: 300, type: 'lowpass' }),
    step: () => noise(0.05, { vol: 0.05, f: 900 + Math.random() * 400, q: 1.5 }),
    jet: () => { noise(0.4, { vol: 0.3, f: 400, f2: 1600, type: 'lowpass' }); tone(120, 0.35, { type: 'sawtooth', vol: 0.06, slide: 240, filter: 600 }); },
    glide: () => noise(0.5, { vol: 0.18, f: 400, f2: 1200, q: 0.7, att: 0.1 }),
    shard: () => { tone(1318, 0.12, { type: 'triangle', vol: 0.12 }); tone(1975, 0.25, { type: 'triangle', vol: 0.12, when: 0.07 }); },
    heart: () => [72, 76, 79, 84].forEach((n, i) => tone(midi(n), 0.2, { type: 'triangle', vol: 0.12, when: i * 0.06 })),
    chest: () => { [60, 64, 67, 72].forEach((n, i) => tone(midi(n), 0.25, { type: 'square', vol: 0.06, when: i * 0.1, filter: 2500 })); [72, 76, 79].forEach((n) => tone(midi(n), 0.9, { type: 'triangle', vol: 0.1, when: 0.42 })); },
    item: () => {
      const mel = [[67, 0], [72, 0.15], [76, 0.3], [79, 0.45], [77, 0.75], [79, 0.9], [84, 1.05]];
      mel.forEach(([n, w]) => tone(midi(n), 0.3, { type: 'square', vol: 0.07, when: w, filter: 3000 }));
      [72, 76, 79, 84].forEach((n) => tone(midi(n), 1.6, { type: 'triangle', vol: 0.09, when: 1.05 }));
      tone(midi(48), 1.8, { type: 'sine', vol: 0.2, when: 1.05 });
    },
    bowDraw: () => tone(200, 0.4, { type: 'triangle', vol: 0.06, slide: 420 }),
    bowShoot: () => { tone(900, 0.15, { type: 'sine', vol: 0.14, slide: 300 }); noise(0.15, { vol: 0.15, f: 2500, f2: 800, q: 2 }); },
    zap: () => { tone(1400, 0.2, { type: 'square', vol: 0.06, slide: 300, filter: 4000 }); noise(0.2, { vol: 0.1, f: 4000, q: 4 }); },
    boom: () => { tone(90, 0.8, { type: 'sine', vol: 0.5, slide: 30 }); noise(0.7, { vol: 0.45, f: 500, f2: 80, type: 'lowpass' }); },
    roar: () => { tone(110, 1.2, { type: 'sawtooth', vol: 0.18, slide: 70, filter: 700 }); tone(165, 1.2, { type: 'sawtooth', vol: 0.12, slide: 90, filter: 600 }); noise(1.0, { vol: 0.2, f: 300, q: 0.7 }); },
    pop: () => { tone(500, 0.12, { type: 'sine', vol: 0.2, slide: 1400 }); noise(0.08, { vol: 0.15, f: 2000 }); },
    enemyDie: () => { tone(700, 0.25, { type: 'square', vol: 0.08, slide: 120, filter: 2000 }); [84, 88, 91].forEach((n, i) => tone(midi(n), 0.15, { type: 'triangle', vol: 0.07, when: 0.12 + i * 0.05 })); },
    splash: () => noise(0.5, { vol: 0.3, f: 1200, f2: 400, q: 0.6 }),
    sizzle: () => noise(0.6, { vol: 0.3, f: 4000, f2: 2000, q: 0.5 }),
    door: () => { noise(1.5, { vol: 0.3, f: 150, type: 'lowpass', att: 0.2 }); tone(55, 1.5, { type: 'sawtooth', vol: 0.08, filter: 200 }); },
    portal: () => { tone(300, 1.0, { type: 'sine', vol: 0.15, slide: 1200 }); tone(450, 1.0, { type: 'sine', vol: 0.1, slide: 1800 }); },
    rune: () => { tone(midi(79), 0.6, { type: 'sine', vol: 0.15 }); tone(midi(86), 0.6, { type: 'sine', vol: 0.1, when: 0.05 }); },
    puzzle: () => [72, 79, 76, 84, 88].forEach((n, i) => tone(midi(n), 0.4, { type: 'triangle', vol: 0.12, when: i * 0.09 })),
    ui: () => tone(880, 0.06, { type: 'square', vol: 0.05, filter: 3000 }),
    ok: () => { tone(880, 0.08, { type: 'square', vol: 0.06, filter: 3000 }); tone(1320, 0.12, { type: 'square', vol: 0.06, when: 0.06, filter: 3000 }); },
    no: () => tone(200, 0.2, { type: 'square', vol: 0.08, slide: 140, filter: 1500 }),
    beacon: () => [67, 74, 79, 86].forEach((n, i) => tone(midi(n), 0.9, { type: 'sine', vol: 0.12, when: i * 0.12 })),
    revive: () => [60, 67, 72, 79].forEach((n, i) => tone(midi(n), 0.4, { type: 'triangle', vol: 0.12, when: i * 0.08 })),
    fanfare: () => {
      const mel = [[72, 0], [72, 0.15], [72, 0.3], [76, 0.45], [74, 0.9], [77, 1.05], [76, 1.2], [79, 1.35], [84, 1.8]];
      mel.forEach(([n, w]) => tone(midi(n), 0.35, { type: 'square', vol: 0.07, when: w, filter: 3000 }));
      [60, 64, 67, 72].forEach((n) => tone(midi(n), 2.2, { type: 'triangle', vol: 0.1, when: 1.8 }));
    },
  };
  function sfx(name, ...args) { if (ctx && SFX[name]) SFX[name](...args); }

  // Zib and friends talk in funny little chirps
  function chirp(pitch = 1) {
    if (!ctx) return;
    const notes = [72, 74, 76, 79, 81, 84];
    const n = notes[Math.floor(Math.random() * notes.length)];
    tone(midi(n) * pitch, 0.07, { type: 'sine', vol: 0.08, slide: midi(n) * pitch * (Math.random() < 0.5 ? 1.3 : 0.8) });
  }

  // ---------- MUSIC ----------
  // each place has its own little song, made from a scale and a seed
  const SONGS = {
    title:  { bpm: 72,  root: 50, scale: [0, 2, 4, 7, 9], seed: 3, pad: true, lead: 'sine', arp: 0.5, bass: 0.7 },
    plains: { bpm: 100, root: 50, scale: [0, 2, 4, 7, 9], seed: 11, lead: 'triangle', arp: 1, bass: 1 },
    jungle: { bpm: 104, root: 52, scale: [0, 2, 3, 5, 7, 9, 10], seed: 21, lead: 'triangle', arp: 1, bass: 1, perc: true },
    desert: { bpm: 92,  root: 50, scale: [0, 1, 4, 5, 7, 8, 10], seed: 31, lead: 'sawtooth', arp: 0.7, bass: 1, perc: true },
    frozen: { bpm: 76,  root: 57, scale: [0, 2, 3, 7, 8], seed: 41, lead: 'sine', arp: 0.8, bass: 0.6, pad: true },
    lava:   { bpm: 118, root: 48, scale: [0, 1, 3, 5, 7, 8, 10], seed: 51, lead: 'square', arp: 0.6, bass: 1.3, perc: true },
    night:  { bpm: 66,  root: 53, scale: [0, 2, 4, 7, 9], seed: 61, lead: 'sine', arp: 0.35, bass: 0.5, pad: true },
    temple: { bpm: 80,  root: 45, scale: [0, 1, 3, 6, 7, 10], seed: 71, lead: 'sine', arp: 0.5, bass: 0.9, pad: true },
    boss:   { bpm: 150, root: 45, scale: [0, 1, 3, 5, 7, 8, 11], seed: 81, lead: 'square', arp: 1, bass: 1.4, perc: true, drive: true },
    village:{ bpm: 112, root: 55, scale: [0, 2, 4, 5, 7, 9, 11], seed: 91, lead: 'triangle', arp: 0.8, bass: 1, perc: true },
  };
  let song = null, songName = '', step = 0, nextT = 0, pattern = null;

  function makePattern(s) {
    const r = SF.U.seeded(s.seed);
    const len = s.scale.length;
    const deg = (d) => s.root + 12 + s.scale[((d % len) + len) % len] + 12 * Math.floor(d / len);
    // a melody of 64 steps: phrase A, A', B, A
    const phrase = () => { const p = []; let d = Math.floor(r() * len); for (let i = 0; i < 16; i++) { if (r() < 0.45) { p.push(null); continue; } d += Math.floor(r() * 5) - 2; d = SF.U.clamp(d, -2, len * 2); p.push(deg(d)); } return p; };
    const A = phrase(), B = phrase();
    const A2 = A.map((n, i) => (i > 11 && n ? n + (s.scale[2] || 3) : n));
    const mel = [...A, ...A2, ...B, ...A];
    const chords = [0, 3, 4, 2].map((c) => (c * 2) % len);
    return { mel, chords, deg };
  }

  function setMusic(name) {
    if (!ctx || name === songName) return;
    songName = name;
    const t = now();
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(musicBus.gain.value, t);
    musicBus.gain.linearRampToValueAtTime(0.0001, t + 0.8);
    setTimeout(() => {
      song = SONGS[name] || null;
      if (song) { pattern = makePattern(song); step = 0; nextT = now() + 0.1; }
      const t2 = now();
      musicBus.gain.cancelScheduledValues(t2);
      musicBus.gain.setValueAtTime(0.0001, t2);
      musicBus.gain.linearRampToValueAtTime(Math.max(0.0001, musicVol * 0.55), t2 + 1.2);
    }, 850);
  }

  function schedule() {
    if (!ctx || !song) return;
    const spb = 60 / song.bpm / 4; // one 16th note
    while (nextT < now() + 0.25) {
      const when = nextT - now();
      const bar = Math.floor(step / 16) % 4, st = step % 16;
      const chordDeg = pattern.chords[bar];
      const d = { dest: musicBus };
      const L = song.scale.length;
      const note = (deg, oct) => song.root + song.scale[((deg % L) + L) % L] + 12 * (oct + Math.floor(deg / L));
      // bass
      if (song.bass && (st === 0 || st === 8 || (song.drive && st % 2 === 0))) tone(midi(note(chordDeg, 0) - 12), spb * (song.drive ? 1.8 : 6), { ...d, type: 'triangle', vol: 0.16 * song.bass, when, filter: 700 });
      // arpeggio
      if (song.arp && st % 2 === 0) {
        const k = [0, 2, 4, 2][(st / 2) % 4];
        tone(midi(note(chordDeg + k, 1)), spb * 1.6, { ...d, type: 'triangle', vol: 0.045 * song.arp, when, filter: 2500 });
      }
      // melody
      const m = pattern.mel[step % 64];
      if (m && (!song.pad || st % 2 === 0)) tone(midi(m), spb * 2.6, { ...d, type: song.lead, vol: song.lead === 'sine' ? 0.08 : 0.045, when, filter: song.lead === 'sine' ? 0 : 2200 });
      // soft pad chords
      if (song.pad && st === 0) [0, 2, 4].forEach((k) => tone(midi(note(chordDeg + k, 0)), spb * 15, { ...d, type: 'sine', vol: 0.035, when, att: 0.6 }));
      // drums
      if (song.perc) {
        if (st % 8 === 0) tone(110, 0.18, { ...d, type: 'sine', vol: 0.22, slide: 45, when });
        if (st % 8 === 4) noise(0.12, { ...d, vol: 0.08, f: 2500, q: 0.7, when });
        if (st % 2 === 1 && song.drive) noise(0.04, { ...d, vol: 0.04, f: 8000, type: 'highpass', when });
        else if (st % 4 === 2) noise(0.03, { ...d, vol: 0.03, f: 7000, type: 'highpass', when });
      }
      nextT += spb;
      step++;
    }
  }

  function setVolumes(m, s) {
    musicVol = m; sfxVol = s;
    if (ctx) { musicBus.gain.value = m * 0.55; sfxBus.gain.value = s; }
    try { localStorage.setItem('starfall.vol', JSON.stringify({ m, s })); } catch (e) {}
  }

  return { init, sfx, chirp, setMusic, setVolumes, get musicVol() { return musicVol; }, get sfxVol() { return sfxVol; }, get song() { return songName; } };
})();
