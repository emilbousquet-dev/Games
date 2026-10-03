// =====================================================================
//  KIDS vs VIDEO GAMES: 8-bit sounds and music, made with math!
// =====================================================================
const Sound = (() => {
  let ac = null, out = null, musicOut = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('kvvg-muted') === '1'; } catch (e) { /* no storage */ }
  const lastPlayed = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    out = ac.createGain(); out.gain.value = muted ? 0 : 0.5; out.connect(ac.destination);
    musicOut = ac.createGain(); musicOut.gain.value = 0.14; musicOut.connect(out);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }

  function tone(freq, dur, type, vol, slide, delay, dest) {
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || out);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, ftype, freq, delay, q, slide, dest) {
    const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = ftype || 'lowpass';
    f.frequency.setValueAtTime(freq || 1000, t); f.Q.value = q || 1;
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || out);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  const S = {
    click: () => tone(880, 0.05, 'square', 0.07),
    nope: () => { tone(180, 0.1, 'square', 0.1); tone(130, 0.14, 'square', 0.1, null, 0.09); },
    place: () => { tone(330, 0.08, 'square', 0.15); tone(660, 0.12, 'square', 0.12, null, 0.07); },
    upgrade: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.1, 'square', 0.1, null, i * 0.05)),
    sell: () => { tone(1318, 0.08, 'square', 0.1); tone(1760, 0.15, 'square', 0.1, null, 0.07); },
    throw: () => noise(0.09, 0.12, 'bandpass', 1500, 0, 1.4, 3500),
    bonk: () => { tone(240, 0.06, 'square', 0.1, 120); },
    magic: () => tone(1200, 0.18, 'square', 0.08, 300),
    hook: () => { noise(0.12, 0.14, 'bandpass', 2500, 0, 3, 800); tone(900, 0.08, 'triangle', 0.1, 1800, 0.05); },
    laser: () => tone(1800, 0.08, 'sawtooth', 0.05, 400),
    ban: () => { tone(80, 0.6, 'square', 0.3, 40); noise(0.7, 0.45, 'lowpass', 900, 0, 1, 80); [1046, 784, 523].forEach((f, i) => tone(f, 0.12, 'square', 0.12, null, 0.15 + i * 0.08)); },
    pop: () => tone(520 + Math.random() * 300, 0.07, 'square', 0.07, 1400),
    coin: () => { tone(988, 0.05, 'square', 0.07); tone(1318, 0.12, 'square', 0.07, null, 0.05); },
    hiss: () => noise(0.9, 0.12, 'highpass', 3000),
    boom: () => { noise(0.6, 0.45, 'lowpass', 600, 0, 1, 60); tone(90, 0.4, 'square', 0.25, 30); },
    hurt: () => { tone(300, 0.15, 'square', 0.15, 120); },
    wave: () => [392, 523, 659].forEach((f, i) => tone(f, 0.12, 'square', 0.12, null, i * 0.09)),
    boss: () => { tone(110, 0.9, 'sawtooth', 0.2, 55); tone(116, 0.9, 'sawtooth', 0.15, 58); noise(0.9, 0.2, 'lowpass', 300); },
    freeze: () => [2093, 1760, 2349, 1976].forEach((f, i) => tone(f, 0.12, 'triangle', 0.08, null, i * 0.05)),
    sleep: () => tone(600, 0.3, 'sine', 0.1, 200),
    zap: () => noise(0.15, 0.15, 'highpass', 4000),
    barrel: () => { noise(0.3, 0.3, 'lowpass', 400); tone(140, 0.2, 'square', 0.15, 70); },
    fire: () => noise(0.8, 0.25, 'bandpass', 600, 0, 0.7, 200),
    win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, i === 6 ? 0.7 : 0.14, 'square', 0.12, null, i * 0.12)),
    lose: () => [494, 466, 440, 415].forEach((f, i) => tone(f, i === 3 ? 0.9 : 0.3, 'square', 0.12, i === 3 ? 300 : null, i * 0.32)),
  };
  const GAP = { throw: 0.05, bonk: 0.05, pop: 0.04, coin: 0.05, laser: 0.05, magic: 0.06, hook: 0.08, hurt: 0.1, zap: 0.2, sleep: 0.2 };

  function sfx(name) {
    if (!ac || muted || !S[name]) return;
    const now = ac.currentTime;
    if (GAP[name] && lastPlayed[name] && now - lastPlayed[name] < GAP[name]) return;
    lastPlayed[name] = now;
    try { S[name](); } catch (e) { /* ignore */ }
  }

  // ---------------- chiptune music ----------------
  const MEL = [
    76, 0, 79, 0, 84, 83, 79, 0, 76, 0, 74, 76, 0, 0, 72, 0,
    74, 0, 77, 0, 81, 79, 77, 0, 76, 0, 74, 72, 0, 0, 71, 0,
    76, 0, 79, 0, 84, 86, 88, 0, 86, 84, 83, 81, 0, 79, 0, 0,
    81, 0, 79, 77, 76, 0, 74, 0, 72, 0, 71, 72, 0, 0, 0, 0,
  ];
  const BASS = [
    45, 57, 45, 57, 45, 57, 45, 57, 41, 53, 41, 53, 41, 53, 41, 53,
    43, 55, 43, 55, 43, 55, 43, 55, 40, 52, 40, 52, 40, 52, 44, 56,
    45, 57, 45, 57, 45, 57, 45, 57, 41, 53, 41, 53, 41, 53, 41, 53,
    43, 55, 43, 55, 40, 52, 40, 52, 45, 57, 45, 57, 45, 0, 0, 0,
  ];
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  let step = 0, nextT = 0;
  function startMusic() {
    nextT = ac.currentTime + 0.1;
    setInterval(() => {
      if (muted) { nextT = ac.currentTime + 0.1; return; }
      const len = 60 / 140 / 2;
      while (nextT < ac.currentTime + 0.3) {
        const d = Math.max(0, nextT - ac.currentTime), i = step % MEL.length;
        if (MEL[i]) tone(midi(MEL[i]), len * 0.85, 'square', 0.1, null, d, musicOut);
        if (BASS[i]) tone(midi(BASS[i]), len * 0.9, 'triangle', 0.32, null, d, musicOut);
        if (i % 4 === 0) noise(0.06, 0.18, 'lowpass', 180, d, 1, null, musicOut);
        if (i % 4 === 2) noise(0.04, 0.08, 'highpass', 6000, d, 1, null, musicOut);
        step++; nextT += len;
      }
    }, 50);
  }

  function say(text, pitch, rate) {
    if (muted || !window.speechSynthesis) return;
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.pitch = pitch || 1; u.rate = rate || 1;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* no voice */ }
  }

  function toggleMute() {
    muted = !muted;
    if (out) out.gain.value = muted ? 0 : 0.5;
    try { localStorage.setItem('kvvg-muted', muted ? '1' : '0'); } catch (e) { /* no storage */ }
    if (muted && window.speechSynthesis) speechSynthesis.cancel();
  }

  return { init, sfx, say, toggleMute, get muted() { return muted; } };
})();
