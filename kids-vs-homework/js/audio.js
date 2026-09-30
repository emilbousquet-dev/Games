// =====================================================================
//  KIDS vs HOMEWORK: all the sounds and music, made with math!
//  (there are no sound files at all)
// =====================================================================
const Sound = (() => {
  let ac = null, out = null, musicOut = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('kvh-muted') === '1'; } catch (e) { /* no storage */ }
  const lastPlayed = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    out = ac.createGain();
    out.gain.value = muted ? 0 : 0.55;
    out.connect(ac.destination);
    musicOut = ac.createGain();
    musicOut.gain.value = 0.16;
    musicOut.connect(out);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }

  // One beep. slide = the pitch it slides to.
  function tone(freq, dur, type, vol, slide, delay, dest) {
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // A burst of hiss, shaped by a filter (paper, water, wind...)
  function noise(dur, vol, ftype, freq, delay, q, slide, dest) {
    const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter();
    f.type = ftype || 'lowpass';
    f.frequency.setValueAtTime(freq || 1000, t);
    f.Q.value = q || 1;
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  // Bill's scream: a buzzing voice pushed through "AAAH" vowel filters
  function scream() {
    const t = ac.currentTime;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    const base = 470 + Math.random() * 90;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.35, t + 0.15);
    o.frequency.linearRampToValueAtTime(base * 1.15, t + 0.65);
    const vib = ac.createOscillator(), vg = ac.createGain();
    vib.frequency.value = 9; vg.gain.value = 20;
    vib.connect(vg); vg.connect(o.frequency);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.04);
    g.gain.setValueAtTime(0.5, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    for (const [f, q, v] of [[1000, 5, 3], [1500, 7, 2.2], [2900, 9, 1]]) {
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const bg = ac.createGain(); bg.gain.value = v;
      o.connect(bp); bp.connect(bg); bg.connect(g);
    }
    g.connect(out);
    o.start(t); vib.start(t);
    o.stop(t + 0.75); vib.stop(t + 0.75);
  }

  const S = {
    click: () => tone(700, 0.06, 'square', 0.08),
    nope: () => { tone(160, 0.12, 'square', 0.12); tone(120, 0.15, 'square', 0.12, null, 0.1); },
    pop: () => { tone(520, 0.1, 'sine', 0.3, 1100); tone(1000, 0.12, 'sine', 0.18, 1600, 0.06); },
    place: () => { tone(200, 0.15, 'sine', 0.4, 90); noise(0.08, 0.2, 'lowpass', 900); },
    throw: () => noise(0.12, 0.15, 'bandpass', 1800, 0, 1.5, 4000),
    star: () => [1, 1.26, 1.5, 2].forEach((m, i) => tone(1046 * m, 0.14, 'sine', 0.1, null, i * 0.035)),
    hit: () => noise(0.07, 0.22, 'highpass', 2200),
    crumple: () => { for (let i = 0; i < 5; i++) noise(0.05, 0.22, 'bandpass', 1400 + Math.random() * 3000, i * 0.03, 1.2); },
    chomp: () => noise(0.08, 0.12, 'bandpass', 3000 + Math.random() * 1500, 0, 4),
    scream,
    splash: () => { noise(0.35, 0.3, 'lowpass', 1400, 0, 1, 300); tone(700, 0.12, 'sine', 0.15, 250, 0.03); },
    poof: () => { tone(600, 0.3, 'sine', 0.2, 150); noise(0.25, 0.1, 'lowpass', 1200); },
    vacuum: () => { tone(110, 1.6, 'sawtooth', 0.1, 220); noise(1.6, 0.12, 'bandpass', 500, 0, 1, 1500); },
    boom: () => { noise(0.9, 0.6, 'lowpass', 700, 0, 1, 80); tone(110, 0.7, 'sine', 0.5, 35); },
    horn: () => { tone(196, 0.45, 'sawtooth', 0.14); tone(185, 0.9, 'sawtooth', 0.14, null, 0.5); },
    roar: () => { tone(90, 1.1, 'sawtooth', 0.25, 45); noise(1.0, 0.25, 'lowpass', 500, 0, 1, 150); },
    lava: () => { noise(0.4, 0.3, 'lowpass', 600, 0, 1, 150); tone(220, 0.3, 'triangle', 0.2, 70); },
    boing: () => { tone(200, 0.18, 'sine', 0.3, 700); tone(700, 0.25, 'sine', 0.2, 300, 0.18); },
    whoosh: () => noise(0.6, 0.1, 'bandpass', 600, 0, 2, 3000),
    win: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i === 5 ? 0.6 : 0.16, 'square', 0.14, null, i * 0.13)),
    lose: () => [392, 370, 349, 311].forEach((f, i) => tone(f, i === 3 ? 0.9 : 0.35, 'sawtooth', 0.14, i === 3 ? 260 : null, i * 0.38)),
    unlock: () => [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.2, 'triangle', 0.2, null, i * 0.09)),
  };
  // Some sounds can't play too often (or 10 Bills would be VERY loud)
  const GAP = { scream: 0.3, hit: 0.04, chomp: 0.12, throw: 0.06, star: 0.08, crumple: 0.05, pop: 0.03, splash: 0.1 };

  function sfx(name) {
    if (!ac || muted || !S[name]) return;
    const now = ac.currentTime;
    if (GAP[name] && lastPlayed[name] && now - lastPlayed[name] < GAP[name]) return;
    lastPlayed[name] = now;
    try { S[name](); } catch (e) { /* ignore */ }
  }

  // ---------------- music: a bouncy little loop ----------------
  const MEL = [
    72, 0, 76, 79, 0, 76, 74, 0, 72, 0, 67, 69, 72, 0, 0, 0,
    74, 0, 77, 81, 0, 79, 77, 0, 76, 0, 74, 72, 74, 0, 0, 0,
    72, 0, 76, 79, 0, 84, 83, 0, 81, 0, 79, 77, 76, 0, 74, 0,
    77, 0, 76, 74, 0, 72, 71, 0, 72, 0, 0, 67, 72, 0, 0, 0,
  ];
  const BASS = [
    48, 0, 55, 0, 48, 0, 55, 0, 45, 0, 52, 0, 45, 0, 52, 0,
    41, 0, 48, 0, 41, 0, 48, 0, 43, 0, 50, 0, 43, 0, 47, 0,
    48, 0, 55, 0, 48, 0, 55, 0, 45, 0, 52, 0, 45, 0, 52, 0,
    41, 0, 48, 0, 43, 0, 50, 0, 48, 0, 43, 0, 48, 0, 0, 0,
  ];
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  let step = 0, nextT = 0;
  function startMusic() {
    nextT = ac.currentTime + 0.1;
    setInterval(() => {
      if (muted) { nextT = ac.currentTime + 0.1; return; }
      const len = 60 / 132 / 2;
      while (nextT < ac.currentTime + 0.3) {
        const d = Math.max(0, nextT - ac.currentTime);
        const i = step % MEL.length;
        if (MEL[i]) tone(midi(MEL[i]), len * 0.9, 'square', 0.12, null, d, musicOut);
        if (BASS[i]) tone(midi(BASS[i]), len * 1.6, 'triangle', 0.3, null, d, musicOut);
        if (i % 2 === 1) noise(0.03, 0.06, 'highpass', 7000, d, 1, null, musicOut);
        step++; nextT += len;
      }
    }, 50);
  }

  // A real voice (the computer's own voice) for the big moments
  function say(text, pitch, rate) {
    if (muted || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch || 1; u.rate = rate || 1; u.volume = 1;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) { /* no voice, no problem */ }
  }

  function toggleMute() {
    muted = !muted;
    if (out) out.gain.value = muted ? 0 : 0.55;
    try { localStorage.setItem('kvh-muted', muted ? '1' : '0'); } catch (e) { /* no storage */ }
    if (muted && window.speechSynthesis) speechSynthesis.cancel();
  }

  return { init, sfx, say, toggleMute, get muted() { return muted; } };
})();
