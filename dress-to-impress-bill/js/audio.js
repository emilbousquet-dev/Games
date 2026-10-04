// =====================================================================
//  DRESS TO IMPRESS BILL: sounds and a runway beat, made with math!
// =====================================================================
const Sound = (() => {
  let ac = null, out = null, musicOut = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('dtib-muted') === '1'; } catch (e) { /* no storage */ }
  const lastPlayed = {};

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ac = new AC(); } catch (e) { return; }
    out = ac.createGain(); out.gain.value = muted ? 0 : 0.5; out.connect(ac.destination);
    musicOut = ac.createGain(); musicOut.gain.value = 0.13; musicOut.connect(out);
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

  // Bill's famous scream: a buzzing voice pushed through "AAAH" filters
  function scream() {
    const t = ac.currentTime;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    const base = 470 + Math.random() * 90;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 1.35, t + 0.15);
    o.frequency.linearRampToValueAtTime(base * 1.15, t + 0.9);
    const vib = ac.createOscillator(), vg = ac.createGain();
    vib.frequency.value = 9; vg.gain.value = 20;
    vib.connect(vg); vg.connect(o.frequency);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.04);
    g.gain.setValueAtTime(0.45, t + 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    for (const [f, q, v] of [[1000, 5, 3], [1500, 7, 2.2], [2900, 9, 1]]) {
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const bg = ac.createGain(); bg.gain.value = v;
      o.connect(bp); bp.connect(bg); bg.connect(g);
    }
    g.connect(out);
    o.start(t); vib.start(t);
    o.stop(t + 1.05); vib.stop(t + 1.05);
  }

  const S = {
    click: () => tone(880, 0.05, 'square', 0.06),
    swish: () => noise(0.16, 0.18, 'bandpass', 1200, 0, 1.2, 4500),
    color: () => { tone(1046, 0.06, 'sine', 0.15); tone(1568, 0.1, 'sine', 0.12, null, 0.04); },
    tick: () => tone(1500, 0.04, 'square', 0.08),
    go: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.1, null, i * 0.07)),
    whistle: () => { tone(1800, 0.25, 'sine', 0.15, 2600); tone(2600, 0.35, 'sine', 0.12, 1500, 0.25); },
    card: () => { noise(0.08, 0.25, 'highpass', 2500); tone(300, 0.08, 'square', 0.12, 600); },
    star: () => [1, 1.26, 1.5, 2].forEach((m, i) => tone(1046 * m, 0.14, 'sine', 0.12, null, i * 0.035)),
    cheer: () => { for (let i = 0; i < 6; i++) noise(0.5 + Math.random() * 0.6, 0.12, 'bandpass', 900 + Math.random() * 1500, i * 0.06, 0.8); },
    clap: () => { for (let i = 0; i < 14; i++) noise(0.05, 0.25, 'bandpass', 1800 + Math.random() * 800, i * 0.09 + Math.random() * 0.04, 1.5); },
    boo: () => { tone(220, 0.6, 'sawtooth', 0.1, 150); tone(233, 0.6, 'sawtooth', 0.08, 140); },
    sad: () => [392, 370, 349, 330].forEach((f, i) => tone(f, i === 3 ? 0.8 : 0.28, 'triangle', 0.18, i === 3 ? 260 : null, i * 0.3)),
    timeup: () => { tone(880, 0.15, 'square', 0.15); tone(660, 0.15, 'square', 0.15, null, 0.15); tone(440, 0.4, 'square', 0.15, null, 0.3); },
    win: () => [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, i === 6 ? 0.7 : 0.14, 'square', 0.12, null, i * 0.12)),
    scream,
  };
  const GAP = { click: 0.03, swish: 0.05, color: 0.05, tick: 0.2 };

  function sfx(name) {
    if (!ac || muted || !S[name]) return;
    const now = ac.currentTime;
    if (GAP[name] && lastPlayed[name] && now - lastPlayed[name] < GAP[name]) return;
    lastPlayed[name] = now;
    try { S[name](); } catch (e) { /* ignore */ }
  }

  // ---------------- runway music: a funky beat ----------------
  const MEL = [
    74, 0, 0, 74, 0, 72, 74, 0, 77, 0, 74, 0, 72, 0, 69, 0,
    74, 0, 0, 74, 0, 72, 74, 0, 79, 0, 77, 0, 74, 0, 0, 0,
    74, 0, 0, 74, 0, 72, 74, 0, 77, 0, 74, 0, 72, 0, 69, 0,
    67, 0, 69, 0, 72, 0, 74, 0, 72, 0, 69, 0, 67, 0, 0, 0,
  ];
  const BASS = [
    38, 0, 38, 50, 0, 38, 48, 0, 38, 0, 38, 50, 0, 45, 48, 0,
    43, 0, 43, 55, 0, 43, 53, 0, 43, 0, 43, 55, 0, 50, 53, 0,
    38, 0, 38, 50, 0, 38, 48, 0, 38, 0, 38, 50, 0, 45, 48, 0,
    36, 0, 36, 48, 0, 36, 45, 0, 41, 0, 41, 53, 0, 43, 45, 0,
  ];
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  let step = 0, nextT = 0, tempo = 112;
  function startMusic() {
    nextT = ac.currentTime + 0.1;
    setInterval(() => {
      if (muted) { nextT = ac.currentTime + 0.1; return; }
      const len = 60 / tempo / 4;
      while (nextT < ac.currentTime + 0.3) {
        const d = Math.max(0, nextT - ac.currentTime), i = step % MEL.length;
        if (MEL[i]) tone(midi(MEL[i]), len * 1.6, 'square', 0.07, null, d, musicOut);
        if (BASS[i]) tone(midi(BASS[i]), len * 1.4, 'sawtooth', 0.22, null, d, musicOut);
        if (i % 8 === 0) { tone(150, 0.12, 'sine', 0.7, 45, d, musicOut); }
        if (i % 8 === 4) noise(0.12, 0.3, 'bandpass', 1800, d, 0.8, null, musicOut);
        if (i % 2 === 0) noise(0.03, 0.12, 'highpass', 7000, d, 1, null, musicOut);
        step++; nextT += len;
      }
    }, 50);
  }
  function setTempo(bpm) { tempo = bpm; }

  function toggleMute() {
    muted = !muted;
    if (out) out.gain.value = muted ? 0 : 0.5;
    try { localStorage.setItem('dtib-muted', muted ? '1' : '0'); } catch (e) { /* no storage */ }
  }

  return { init, sfx, toggleMute, setTempo, get muted() { return muted; } };
})();
