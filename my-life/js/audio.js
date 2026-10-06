// ============================================================
//  MY LIFE — SOUNDS & MUSIC 🎵
//  Every sound is made with math (no sound files at all!)
// ============================================================
window.ML = window.ML || {};

ML.Audio = (function () {
  const U = ML.U;
  let ctx = null, master, sfx, music, noiseBuf;
  let on = true, musicTimer = null, step = 0;
  try { on = localStorage.getItem('ml.sound') !== 'off'; } catch (e) { /* ignore */ }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = on ? 0.8 : 0; master.connect(comp);
    sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    music = ctx.createGain(); music.gain.value = 0.16; music.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startMusic();
  }
  const ok = () => !!ctx && on;
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function tone(type, f0, f1, dur, vol, delay = 0, bus) {
    if (!ok()) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus || sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, freq, vol, delay = 0, type = 'bandpass', f1) {
    if (!ok()) return;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = 1;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfx);
    s.start(t); s.stop(t + dur + 0.05);
  }
  const notes = (list, type = 'triangle', len = 0.14, vol = 0.18, gap) => list.forEach((n, i) => { if (n) tone(type, hz(n), null, len * 1.6, vol, i * (gap || len)); });

  // ---------- sound effects ----------
  const S = {
    click() { tone('sine', 900, 700, 0.06, 0.12); },
    talk(me) { for (let i = 0; i < 4; i++) tone('square', (me ? 520 : 380) + Math.random() * 160, null, 0.05, 0.035, i * 0.07); },
    choose(type) {
      if (type === 'good') notes([72, 76, 79, 84], 'sine', 0.08, 0.16);
      else if (type === 'evil') notes([48, 51, 47], 'sawtooth', 0.14, 0.09);
      else if (type === 'funny') { tone('sine', 300, 900, 0.25, 0.18); tone('sine', 900, 250, 0.25, 0.15, 0.25); }
      else S.click();
    },
    good() { notes([79, 84, 88], 'sine', 0.07, 0.15); },
    whoosh() { noise(0.3, 800, 0.25, 0, 'bandpass', 3000); },
    splat() { noise(0.25, 400, 0.5, 0, 'lowpass', 120); tone('sine', 180, 60, 0.2, 0.25); },
    boing() { tone('sine', 220, 660, 0.12, 0.2); tone('sine', 660, 330, 0.2, 0.15, 0.12); },
    pop() { tone('sine', 600, 1400, 0.08, 0.2); noise(0.08, 3000, 0.15); },
    coin() { tone('square', hz(83), null, 0.08, 0.08); tone('square', hz(88), null, 0.25, 0.08, 0.08); },
    levelUp() { notes([60, 64, 67, 72, 76, 79, 84], 'triangle', 0.07, 0.15); },
    birthday() { notes([67, 67, 69, 67, 72, 71, 0, 67, 67, 69, 67, 74, 72], 'triangle', 0.24, 0.16); },
    song() { notes([72, 74, 76, 79, 76, 74, 72, 67], 'triangle', 0.2, 0.12); },
    sad() { notes([69, 67, 64, 62, 60], 'sine', 0.4, 0.14); },
    cry() { for (let i = 0; i < 3; i++) tone('sawtooth', 520, 380, 0.4, 0.06, i * 0.42); },
    vroom() { tone('sawtooth', 60, 180, 0.9, 0.1); noise(0.9, 200, 0.15, 0, 'lowpass', 600); },
    honk() { tone('square', 330, null, 0.3, 0.08); tone('square', 415, null, 0.3, 0.06); },
    fart() { tone('sawtooth', 90, 50, 0.6, 0.18); noise(0.6, 150, 0.2, 0, 'lowpass', 80); },
    bark() { tone('sawtooth', 500, 250, 0.12, 0.14); tone('sawtooth', 520, 260, 0.12, 0.14, 0.18); },
  };

  // ---------- happy background music ----------
  const PROG = [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]];
  const MEL = [76, 0, 79, 76, 74, 0, 72, 74, 76, 0, 72, 0, 69, 72, 74, 0, 77, 0, 76, 74, 72, 0, 74, 76, 79, 0, 76, 74, 72, 0, 0, 0];
  function startMusic() {
    if (musicTimer) return;
    musicTimer = setInterval(() => {
      if (!ok()) return;
      const bar = Math.floor(step / 8) % 4;
      if (step % 8 === 0) PROG[bar].forEach((n) => tone('sine', hz(n - 12), null, 1.9, 0.05, 0, music));
      if (step % 4 === 2) tone('triangle', hz(PROG[bar][0] - 24), null, 0.3, 0.07, 0, music);
      const m = MEL[step % MEL.length];
      if (m && Math.random() < 0.85) tone('triangle', hz(m), null, 0.3, 0.045, 0, music);
      step++;
    }, 260);
  }
  function toggle() {
    on = !on;
    try { localStorage.setItem('ml.sound', on ? 'on' : 'off'); } catch (e) { /* ignore */ }
    if (master) master.gain.value = on ? 0.8 : 0;
    return on;
  }

  return Object.assign({ init, toggle, get on() { return on; } }, S);
})();
