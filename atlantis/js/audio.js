// ============================================================
//  ATLANTIS DIVER — SOUNDS AND MUSIC
//  Every sound is made with math (oscillators + noise),
//  so there are no sound files at all.
// ============================================================
AT.Audio = (function () {
  const U = AT.U;
  let ctx = null, master, sfx, musicBus, verb, delay, noiseBuf, amb = null, surf = null;
  let muted = (() => { try { return localStorage.getItem('atlantis.mute') === '1'; } catch (e) { return false; } })();
  let zone = 0, atSurface = true, nextChord = 0, chordIx = 0, beat = 0, timer = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 5;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85; master.connect(comp);
    sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.42; musicBus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a big soft echo (like being inside the sea)
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = ir;
    const vg = ctx.createGain(); vg.gain.value = 0.55; verb.connect(vg); vg.connect(master);
    delay = ctx.createDelay(1); delay.delayTime.value = 0.43;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
    delay.connect(dl); dl.connect(fb); fb.connect(delay); dl.connect(musicBus); dl.connect(verb);
    startAmbience();
    nextChord = ctx.currentTime + 0.3;
    timer = setInterval(schedule, 120);
  }

  function noise(dur, filterType, freq, q = 1) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    src.connect(f);
    src.start(); if (dur) src.stop(ctx.currentTime + dur);
    return { src, f };
  }
  function env(node, t, a, peak, hold, rel) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + a);
    node.gain.setValueAtTime(peak, t + a + hold);
    node.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
  }
  function tone(freq, type, t, a, peak, hold, rel, dest = sfx, glideTo) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + a + hold + rel);
    o.connect(g); g.connect(dest);
    env(g, t, a, peak, hold, rel);
    o.start(t); o.stop(t + a + hold + rel + 0.05);
    return { o, g };
  }

  // ---------- the sea itself ----------
  function startAmbience() {
    const n = noise(0, 'lowpass', 260, 0.7);
    const g = ctx.createGain(); g.gain.value = 0.16;
    n.f.connect(g); g.connect(master);
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.09; lg.gain.value = 90; lfo.connect(lg); lg.connect(n.f.frequency); lfo.start();
    amb = { n, g };
    // waves when you're at the surface
    const w = noise(0, 'bandpass', 700, 0.6);
    const wg = ctx.createGain(); wg.gain.value = 0;
    const wl = ctx.createOscillator(), wlg = ctx.createGain();
    wl.frequency.value = 0.18; wlg.gain.value = 0.06; wl.connect(wlg); wlg.connect(wg.gain); wl.start();
    w.f.connect(wg); wg.connect(master);
    surf = { wg };
  }
  function setState(z, surface, depthM) {
    if (!ctx) return;
    zone = z; atSurface = surface;
    const t = ctx.currentTime;
    amb.n.f.frequency.setTargetAtTime(surface ? 500 : U.clamp(300 - depthM * 0.3, 110, 300), t, 0.5);
    amb.g.gain.setTargetAtTime(surface ? 0.07 : 0.16, t, 0.5);
    surf.wg.gain.setTargetAtTime(surface ? 0.07 : 0, t, 0.3);
  }

  // ---------- music ----------
  const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // chords as MIDI notes, one list per zone
  const SONGS = [
    [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59]],   // C major, sunny
    [[50, 57, 60, 64], [46, 53, 57, 62], [41, 48, 52, 57], [48, 55, 60, 64]],   // D dorian, wonder
    [[51, 58, 62, 67], [48, 55, 58, 63], [44, 51, 55, 60], [46, 53, 58, 62]],   // Eb, majestic gold
    [[45, 52, 57, 60], [41, 48, 53, 57], [38, 45, 50, 53], [40, 47, 52, 56]],   // A minor, mysterious temple
    [[40, 47, 51, 56], [37, 44, 49, 52], [45, 52, 56, 61], [47, 54, 59, 63]],   // E major, shimmering heart
  ];
  const BEAT = 60 / 66;
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    while (nextChord < now + 0.5) {
      const song = SONGS[zone], ch = song[chordIx % song.length];
      const t = nextChord, len = BEAT * 4;
      // soft pad
      for (const n of ch.slice(1)) {
        for (const det of [-6, 6]) {
          const { o } = tone(NOTE(n), 'triangle', t, 1.2, 0.035, len - 1.2, 2.2, musicBus);
          o.detune.value = det;
        }
      }
      // bass
      tone(NOTE(ch[0] - 12), 'sine', t, 0.3, 0.12, len - 0.6, 1.2, musicBus);
      // twinkly notes on top (more when deeper and magical)
      const scale = ch.map((n) => n + 12).concat(ch.map((n) => n + 24));
      for (let i = 0; i < 8; i++) {
        if (Math.random() < (zone === 4 ? 0.75 : 0.5)) {
          const n = scale[Math.floor(Math.random() * scale.length)];
          const nt = t + i * (BEAT / 2);
          const p = tone(NOTE(n), zone >= 3 ? 'sine' : 'triangle', nt, 0.01, 0.05, 0.05, 0.9, musicBus);
          p.g.connect(delay);
        }
      }
      nextChord += len; chordIx++;
    }
  }

  // ---------- sound effects ----------
  const ok = () => ctx && ctx.state === 'running';
  function bubbles() {
    if (!ok()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const f = U.rand(300, 700), st = t + i * U.rand(0.04, 0.09);
      tone(f, 'sine', st, 0.005, 0.05, 0.01, 0.07, sfx, f * 2.4);
    }
  }
  function pickup(value = 20) {
    if (!ok()) return;
    const t = ctx.currentTime, base = value > 300 ? 76 : value > 80 ? 72 : 67;
    [0, 4, 7, 12].forEach((s, i) => { const p = tone(NOTE(base + s), 'sine', t + i * 0.06, 0.005, 0.12, 0.05, 0.5); p.g.connect(verb); });
  }
  function sell(n) {
    if (!ok()) return;
    const t = ctx.currentTime;
    for (let i = 0; i < Math.min(12, 3 + n * 2); i++) tone(U.rand(1800, 3200), 'square', t + i * 0.05, 0.002, 0.03, 0.01, 0.12);
    [72, 76, 79, 84].forEach((n2, i) => tone(NOTE(n2), 'triangle', t + 0.1 + i * 0.08, 0.01, 0.1, 0.05, 0.4));
  }
  function harpoon() {
    if (!ok()) return;
    const t = ctx.currentTime;
    const n = noise(0.3, 'bandpass', 1800, 2), g = ctx.createGain();
    n.f.connect(g); g.connect(sfx); env(g, t, 0.01, 0.35, 0.02, 0.2);
    n.f.frequency.exponentialRampToValueAtTime(400, t + 0.25);
    tone(220, 'triangle', t, 0.005, 0.1, 0.02, 0.2, sfx, 110);
  }
  function clink() { if (ok()) { const t = ctx.currentTime; tone(1900, 'sine', t, 0.002, 0.08, 0.01, 0.25); tone(2700, 'sine', t, 0.002, 0.04, 0.01, 0.2); } }
  function crumble() {
    if (!ok()) return;
    const t = ctx.currentTime;
    const n = noise(1.2, 'lowpass', 600, 0.8), g = ctx.createGain();
    n.f.connect(g); g.connect(sfx); g.connect(verb); env(g, t, 0.01, 0.8, 0.1, 1);
    tone(70, 'sine', t, 0.01, 0.4, 0.1, 0.8);
    [60, 67, 72, 79].forEach((m, i) => tone(NOTE(m), 'triangle', t + 0.4 + i * 0.09, 0.01, 0.1, 0.05, 0.6));
  }
  function zap() { if (ok()) { const t = ctx.currentTime; tone(900, 'square', t, 0.005, 0.07, 0.02, 0.18, sfx, 2400); tone(1400, 'sine', t + 0.05, 0.005, 0.08, 0.05, 0.3, sfx, 600); } }
  function ouch() { if (ok()) { const t = ctx.currentTime; tone(180, 'sawtooth', t, 0.005, 0.15, 0.05, 0.25, sfx, 90); bubbles(); } }
  function nope() { if (ok()) { const t = ctx.currentTime; tone(200, 'square', t, 0.005, 0.07, 0.06, 0.05); tone(150, 'square', t + 0.13, 0.005, 0.07, 0.06, 0.08); } }
  function buy() { if (ok()) { const t = ctx.currentTime; [60, 64, 67, 72, 76].forEach((n, i) => { const p = tone(NOTE(n), 'triangle', t + i * 0.06, 0.005, 0.12, 0.04, 0.5); p.g.connect(verb); }); } }
  function tick() { if (ok()) tone(1200, 'sine', ctx.currentTime, 0.002, 0.04, 0.005, 0.04); }
  function lowAir() { if (ok()) { const t = ctx.currentTime; tone(880, 'square', t, 0.005, 0.06, 0.07, 0.03); tone(880, 'square', t + 0.18, 0.005, 0.06, 0.07, 0.03); } }
  function snap() { if (ok()) { const t = ctx.currentTime; const n = noise(0.15, 'highpass', 1500), g = ctx.createGain(); n.f.connect(g); g.connect(sfx); env(g, t, 0.003, 0.3, 0.01, 0.1); } }
  function whoosh() {
    if (!ok()) return;
    const t = ctx.currentTime;
    const n = noise(0.8, 'bandpass', 300, 1.5), g = ctx.createGain();
    n.f.connect(g); g.connect(sfx); env(g, t, 0.2, 0.3, 0.1, 0.4);
    n.f.frequency.exponentialRampToValueAtTime(900, t + 0.6);
  }
  function tablet() {
    if (!ok()) return;
    const t = ctx.currentTime;
    [57, 64, 69, 72, 76].forEach((n, i) => { const p = tone(NOTE(n), 'sine', t + i * 0.12, 0.05, 0.08, 0.6, 2); p.g.connect(verb); });
  }
  function discover() { if (ok()) { const t = ctx.currentTime; [84, 88, 91].forEach((n, i) => { const p = tone(NOTE(n), 'sine', t + i * 0.07, 0.005, 0.06, 0.03, 0.4); p.g.connect(verb); }); } }
  function faint() { if (ok()) { const t = ctx.currentTime; [72, 67, 64, 60, 55].forEach((n, i) => { const p = tone(NOTE(n), 'triangle', t + i * 0.18, 0.02, 0.1, 0.1, 0.8); p.g.connect(verb); }); } }
  function splash() {
    if (!ok()) return;
    const t = ctx.currentTime;
    const n = noise(0.9, 'lowpass', 2500, 0.7), g = ctx.createGain();
    n.f.connect(g); g.connect(sfx); env(g, t, 0.01, 0.5, 0.05, 0.7);
    n.f.frequency.exponentialRampToValueAtTime(300, t + 0.7);
  }
  function dolphin() {
    if (!ok()) return;
    const t = ctx.currentTime;
    tone(1400, 'sine', t, 0.02, 0.07, 0.15, 0.1, sfx, 2600);
    tone(2200, 'sine', t + 0.35, 0.02, 0.06, 0.1, 0.1, sfx, 1500);
    for (let i = 0; i < 6; i++) tone(3000, 'square', t + 0.6 + i * 0.03, 0.001, 0.02, 0.003, 0.01);
  }
  function fanfare() {
    if (!ok()) return;
    const t = ctx.currentTime;
    const seq = [[60, 0], [64, 0.15], [67, 0.3], [72, 0.45], [67, 0.75], [72, 0.9], [76, 1.05], [79, 1.2]];
    seq.forEach(([n, d]) => { const p = tone(NOTE(n), 'triangle', t + d, 0.01, 0.16, 0.15, 0.6); p.g.connect(verb); });
    [48, 55, 60, 64, 67, 72].forEach((n) => { const p = tone(NOTE(n), 'sawtooth', t + 1.5, 0.3, 0.035, 2.5, 3); p.g.connect(verb); });
    for (let i = 0; i < 24; i++) tone(NOTE(84 + [0, 4, 7, 12][i % 4]), 'sine', t + 1.5 + i * 0.09, 0.005, 0.05, 0.02, 0.5);
  }
  function danger() { if (ok()) tone(60, 'sawtooth', ctx.currentTime, 0.1, 0.08, 0.2, 0.4, sfx, 45); }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('atlantis.mute', m ? '1' : '0'); } catch (e) { /* */ }
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.1);
  }

  return {
    init, setState, setMuted, get muted() { return muted; },
    bubbles, pickup, sell, harpoon, clink, crumble, zap, ouch, nope, buy, tick, lowAir, snap, whoosh, tablet, discover, faint, splash, dolphin, fanfare, danger,
  };
})();
