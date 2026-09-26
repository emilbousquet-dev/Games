// ============================================================
//  LAB 13 — SOUNDS
//  Every sound is made with math (oscillators + noise),
//  so there are no sound files.
// ============================================================
window.LAB = window.LAB || {};

LAB.Audio = (function () {
  let ctx = null, master, sfx, music, noiseBuf, reverb;
  let heartTimer = 0, droneNodes = null, alarm = null, genHum = null, chaseNodes = null;
  const U = LAB.U;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
    music = ctx.createGain(); music.gain.value = 0.6; music.connect(master);
    // white noise we reuse for lots of sounds
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // cheap echo (a big empty concrete lab)
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.5;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const ch = ir.getChannelData(c);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    reverb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.35;
    reverb.connect(wet); wet.connect(master);
  }

  const now = () => ctx.currentTime;

  // output chain: gain -> pan -> (dry + echo)
  function out(vol = 1, pan = 0, echo = true) {
    const g = ctx.createGain(); g.gain.value = vol;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (p) { p.pan.value = U.clamp(pan, -1, 1); g.connect(p); p.connect(sfx); if (echo) p.connect(reverb); }
    else { g.connect(sfx); if (echo) g.connect(reverb); }
    return g;
  }

  function noise(dur, filterType, freq, q, vol, pan, attack = 0.005, echo = true, freqEnd) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, now() + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(1, now() + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
    src.connect(f); f.connect(g); g.connect(out(vol, pan, echo));
    src.start(now(), Math.random()); src.stop(now() + dur + 0.05);
  }

  function tone(type, f0, f1, dur, vol, pan, attack = 0.01, echo = true) {
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, now());
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now() + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now());
    g.gain.exponentialRampToValueAtTime(1, now() + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now() + dur);
    o.connect(g); g.connect(out(vol, pan, echo));
    o.start(); o.stop(now() + dur + 0.05);
    return o;
  }

  // distortion curve for screams
  let distCurve;
  function distortion() {
    if (!distCurve) {
      distCurve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; distCurve[i] = Math.tanh(x * 8); }
    }
    const w = ctx.createWaveShaper(); w.curve = distCurve; return w;
  }

  const A = {
    init,
    shutUp() { try { speechSynthesis.cancel(); } catch (e) { /* */ } },
    get ready() { return !!ctx; },

    // spooky background drone that never stops
    startAmbience() {
      if (!ctx || droneNodes) return;
      const g = ctx.createGain(); g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.22, now() + 4);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180; f.Q.value = 4;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
      const lfoG = ctx.createGain(); lfoG.gain.value = 90;
      lfo.connect(lfoG); lfoG.connect(f.frequency);
      const oscs = [41, 41.6, 61.7, 82.3].map((fr) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o; });
      // rumbly air noise
      const n = ctx.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
      const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 300;
      const ng = ctx.createGain(); ng.gain.value = 0.25;
      n.connect(nf); nf.connect(ng); ng.connect(g); n.start();
      f.connect(g); g.connect(music); lfo.start();
      droneNodes = { g, oscs, n, lfo };
    },

    stopAll() {
      if (!ctx) return;
      if (droneNodes) { droneNodes.g.gain.setTargetAtTime(0.0001, now(), 0.5); const d = droneNodes; setTimeout(() => { d.oscs.forEach((o) => o.stop()); d.n.stop(); d.lfo.stop(); }, 2000); droneNodes = null; }
      if (alarm) { alarm.g.gain.setTargetAtTime(0.0001, now(), 0.3); const a = alarm; setTimeout(() => { a.o.stop(); a.lfo.stop(); }, 1500); alarm = null; }
      if (chaseNodes) { chaseNodes.g.gain.setTargetAtTime(0.0001, now(), 0.3); const c = chaseNodes; setTimeout(() => c.oscs.forEach((o) => o.stop()), 1500); chaseNodes = null; }
      if (genHum) { genHum.g.gain.setTargetAtTime(0.0001, now(), 0.3); const h = genHum; setTimeout(() => h.o.forEach((o) => o.stop()), 1500); genHum = null; }
    },

    footstep(vol, pan, metal) {
      if (!ctx) return;
      noise(0.09, 'bandpass', metal ? U.rand(1400, 2200) : U.rand(500, 900), 1.2, vol * 0.5, pan, 0.002);
      if (metal) tone('triangle', U.rand(180, 240), 120, 0.08, vol * 0.1, pan);
    },

    heartbeat(vol) {
      if (!ctx || vol < 0.02) return;
      tone('sine', 70, 40, 0.18, vol * 0.9, 0, 0.005, false);
      setTimeout(() => ctx && tone('sine', 62, 38, 0.2, vol * 0.7, 0, 0.005, false), 170);
    },

    // call every frame with how scared we should be (0..1)
    updateHeart(dt, fear) {
      heartTimer -= dt;
      if (fear > 0.05 && heartTimer <= 0) {
        A.heartbeat(Math.min(1, fear * 1.2));
        heartTimer = U.lerp(1.3, 0.38, fear);
      }
    },

    swing(pan) { if (ctx) noise(0.18, 'bandpass', 900, 0.8, 0.35, pan, 0.03, false, 3000); },
    clang(pan) {
      if (!ctx) return;
      [523, 1187, 1780, 2640].forEach((f, i) => tone('sine', f, f * 0.98, 0.6 - i * 0.1, 0.12, pan));
      noise(0.05, 'highpass', 3000, 1, 0.3, pan);
    },
    splat(vol, pan) {
      if (!ctx) return;
      noise(0.35, 'lowpass', 900, 3, vol * 0.9, pan, 0.003, true, 200);
      tone('sine', 120, 40, 0.25, vol * 0.5, pan);
    },
    hurt(pan) {
      if (!ctx) return;
      noise(0.25, 'bandpass', 700, 2, 0.6, pan, 0.003);
      tone('sawtooth', 220, 110, 0.3, 0.12, pan);
    },
    pickup(pan) {
      if (!ctx) return;
      tone('square', 660, 660, 0.08, 0.1, pan, 0.002, false);
      setTimeout(() => ctx && tone('square', 990, 990, 0.12, 0.1, pan, 0.002, false), 80);
    },
    noteSound(pan) { if (ctx) noise(0.4, 'highpass', 2500, 0.5, 0.2, pan, 0.05, false); },
    denied(pan) { if (ctx) { tone('square', 200, 200, 0.12, 0.12, pan, 0.002, false); setTimeout(() => ctx && tone('square', 150, 150, 0.2, 0.12, pan, 0.002, false), 140); } },
    beep(pan) { if (ctx) tone('sine', 1200, 1200, 0.06, 0.08, pan, 0.002, false); },
    doorHiss(vol, pan) {
      if (!ctx) return;
      noise(0.7, 'bandpass', 3000, 0.6, vol * 0.35, pan, 0.02, true, 800);
      tone('sawtooth', 60, 45, 0.6, vol * 0.1, pan);
    },
    flashClick(pan) { if (ctx) noise(0.03, 'highpass', 4000, 1, 0.3, pan, 0.001, false); },
    thud(vol, pan) {
      if (!ctx) return;
      tone('sine', 90, 30, 0.5, vol, pan, 0.003);
      noise(0.3, 'lowpass', 400, 1, vol * 0.8, pan, 0.003);
    },
    glass(pan) {
      if (!ctx) return;
      for (let i = 0; i < 8; i++) setTimeout(() => ctx && tone('sine', U.rand(2500, 6000), U.rand(2000, 5000), U.rand(0.1, 0.4), 0.06, pan + U.rand(-0.3, 0.3)), i * U.rand(10, 40));
      noise(0.4, 'highpass', 4000, 0.5, 0.5, pan, 0.002);
    },

    // small alien chitter
    chitter(vol, pan) {
      if (!ctx) return;
      for (let i = 0; i < 6; i++) setTimeout(() => ctx && noise(0.04, 'bandpass', U.rand(2000, 4000), 8, vol, pan, 0.002), i * 55);
    },
    // alien screech
    screech(vol, pan, low) {
      if (!ctx) return;
      const base = low ? 180 : 700;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(base, now());
      o.frequency.exponentialRampToValueAtTime(base * 2.4, now() + 0.15);
      o.frequency.exponentialRampToValueAtTime(base * 0.7, now() + 0.9);
      const fm = ctx.createOscillator(); fm.frequency.value = 37;
      const fmg = ctx.createGain(); fmg.gain.value = base * 0.6;
      fm.connect(fmg); fmg.connect(o.frequency);
      const d = distortion();
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now()); g.gain.exponentialRampToValueAtTime(1, now() + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, now() + 1.0);
      o.connect(d); d.connect(g); g.connect(out(vol * 0.25, pan));
      o.start(); fm.start(); o.stop(now() + 1.1); fm.stop(now() + 1.1);
      noise(0.8, 'bandpass', base * 3, 2, vol * 0.4, pan, 0.02);
    },
    // the BIG one for jump scares
    scream(vol = 1, pan = 0) {
      if (!ctx) return;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now()); g.gain.exponentialRampToValueAtTime(1, now() + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now() + 1.6);
      const d = distortion();
      d.connect(g); g.connect(out(vol * 0.35, pan));
      [310, 466, 620, 933, 1244].forEach((f) => {
        const o = ctx.createOscillator(); o.type = 'sawtooth';
        o.frequency.setValueAtTime(f, now());
        o.frequency.linearRampToValueAtTime(f * U.rand(1.3, 1.8), now() + 0.2);
        o.frequency.exponentialRampToValueAtTime(f * 0.6, now() + 1.5);
        const lfo = ctx.createOscillator(); lfo.frequency.value = U.rand(20, 45);
        const lg = ctx.createGain(); lg.gain.value = f * 0.15;
        lfo.connect(lg); lg.connect(o.frequency);
        o.connect(d); o.start(); lfo.start(); o.stop(now() + 1.7); lfo.stop(now() + 1.7);
      });
      noise(1.4, 'bandpass', 2500, 0.7, vol * 0.8, pan, 0.01);
      tone('sine', 55, 30, 1.2, vol * 0.9, pan, 0.005); // chest-punch bass
    },
    // spooky whisper
    whisper(pan) {
      if (!ctx) return;
      for (let i = 0; i < 5; i++) setTimeout(() => ctx && noise(U.rand(0.2, 0.5), 'bandpass', U.rand(1800, 3500), 6, 0.35, pan, 0.08, true), i * U.rand(150, 300));
    },
    spit(vol, pan) { if (ctx) { noise(0.3, 'bandpass', 1400, 3, vol, pan, 0.01, true, 400); tone('sine', 500, 150, 0.2, vol * 0.4, pan); } },
    sizzle(vol, pan) { if (ctx) noise(0.9, 'highpass', 3000, 0.5, vol * 0.5, pan, 0.02); },
    // husk groan (a moan through a throat full of alien)
    groan(vol, pan) {
      if (!ctx || vol < 0.02) return;
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      const f0 = U.rand(70, 110);
      o.frequency.setValueAtTime(f0, now()); o.frequency.linearRampToValueAtTime(f0 * U.rand(0.6, 1.3), now() + 1.2);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 5;
      f.frequency.setValueAtTime(400, now()); f.frequency.linearRampToValueAtTime(U.rand(600, 900), now() + 0.6); f.frequency.linearRampToValueAtTime(300, now() + 1.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now()); g.gain.exponentialRampToValueAtTime(1, now() + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, now() + 1.4);
      o.connect(f); f.connect(g); g.connect(out(vol * 0.9, pan));
      o.start(); o.stop(now() + 1.5);
      noise(1.2, 'bandpass', 500, 4, vol * 0.3, pan, 0.2);
    },
    // hanger tongue / wet sounds
    slurp(vol, pan) { if (ctx) { noise(0.5, 'lowpass', 1200, 8, vol, pan, 0.05, true, 300); tone('sine', 300, 90, 0.4, vol * 0.3, pan); } },
    // stalker breathing (call often)
    breathe(vol, pan) { if (ctx && vol > 0.02) noise(1.1, 'bandpass', 380, 3, vol * 0.8, pan, 0.4, true); },
    // random creepy noises far away
    distant() {
      if (!ctx) return;
      const r = Math.random(), pan = U.rand(-1, 1);
      if (r < 0.25) A.screech(0.25, pan, true);
      else if (r < 0.5) { A.thud(0.3, pan); setTimeout(() => A.thud(0.25, pan), 400); }
      else if (r < 0.7) A.chitter(0.15, pan);
      else if (r < 0.85) { for (let i = 0; i < 4; i++) setTimeout(() => A.footstep(0.25, pan, true), i * 380); }
      else A.clang(pan);
    },
    lightsOut() { if (ctx) { tone('sawtooth', 120, 30, 0.8, 0.3, 0); noise(0.3, 'highpass', 5000, 1, 0.4, 0, 0.001); } },
    spark(pan) { if (ctx) noise(0.08, 'highpass', 6000, 1, 0.25, pan, 0.001, false); },

    // alarm siren after the power comes back
    startAlarm() {
      if (!ctx || alarm) return;
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 600;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.8;
      const lg = ctx.createGain(); lg.gain.value = 180;
      lfo.connect(lg); lg.connect(o.frequency);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
      const g = ctx.createGain(); g.gain.value = 0.03;
      o.connect(f); f.connect(g); g.connect(sfx); g.connect(reverb);
      o.start(); lfo.start();
      alarm = { o, lfo, g };
    },
    startGenerator() {
      if (!ctx || genHum) return;
      const g = ctx.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.06, now() + 2);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400;
      const o = [50, 100, 150.5].map((fr) => { const x = ctx.createOscillator(); x.type = 'sawtooth'; x.frequency.setValueAtTime(10, now()); x.frequency.exponentialRampToValueAtTime(fr, now() + 2.5); x.connect(f); x.start(); return x; });
      f.connect(g); g.connect(sfx);
      genHum = { g, o };
    },
    elevator() {
      if (!ctx) return;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 45;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 200;
      const g = ctx.createGain(); g.gain.value = 0.0001;
      g.gain.exponentialRampToValueAtTime(0.25, now() + 1.5);
      g.gain.setValueAtTime(0.25, now() + 9);
      g.gain.exponentialRampToValueAtTime(0.0001, now() + 11);
      o.connect(f); f.connect(g); g.connect(sfx); o.start(); o.stop(now() + 11.5);
    },

    // scary chase music that gets louder when something is hunting you (level 0..1)
    chase(level) {
      if (!ctx) return;
      if (!chaseNodes) {
        const g = ctx.createGain(); g.gain.value = 0;
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 6;
        const trem = ctx.createGain(); trem.gain.value = 0.6;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 4.5;
        const lg = ctx.createGain(); lg.gain.value = 0.4;
        lfo.connect(lg); lg.connect(trem.gain);
        const oscs = [55, 55.7, 82.4, 110.3].map((fr) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o; });
        const hi = ctx.createOscillator(); hi.type = 'sine'; hi.frequency.value = 932;
        const vib = ctx.createOscillator(); vib.frequency.value = 6; const vg = ctx.createGain(); vg.gain.value = 14;
        vib.connect(vg); vg.connect(hi.frequency);
        const hg = ctx.createGain(); hg.gain.value = 0.08; hi.connect(hg); hg.connect(trem);
        f.connect(trem); trem.connect(g); g.connect(music);
        lfo.start(); hi.start(); vib.start();
        chaseNodes = { g, oscs: [...oscs, hi, vib, lfo], f };
      }
      chaseNodes.g.gain.setTargetAtTime(level * 0.35, now(), 0.6);
      chaseNodes.f.frequency.setTargetAtTime(300 + level * 900, now(), 0.6);
    },
    radioStatic(dur = 0.4) { if (ctx) { noise(dur, 'bandpass', 2200, 0.7, 0.35, 0, 0.01, false); tone('square', 1800, 1800, 0.05, 0.05, 0, 0.002, false); } },
    // creepy computer voice from the speakers (if the browser can talk)
    speak(text, pitch = 0.1, rate = 0.75, female) {
      try {
        if (!window.speechSynthesis) return;
        const u = new SpeechSynthesisUtterance(text);
        u.pitch = pitch; u.rate = rate; u.volume = 0.9;
        if (female) {
          const v = speechSynthesis.getVoices().find((vv) => /female|zira|samantha|susan|karen|victoria|fiona|moira|tessa/i.test(vv.name) && /^en/i.test(vv.lang));
          if (v) u.voice = v;
        }
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
        A.speaking = u;
      } catch (e) { /* no voice, no problem */ }
    },
  };
  return A;
})();
