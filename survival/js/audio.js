// ============================================================
//  DEAD ACRES — SOUNDS
//  Every sound is made with math (oscillators + noise),
//  so there are no sound files at all.
// ============================================================
window.DA = window.DA || {};

DA.Audio = (function () {
  const U = DA.U;
  let ctx = null, master, sfx, amb, noiseBuf, verb;
  let listener = { x: 0, z: 0, yaw: 0 };
  const loops = {};
  let birdT = 3, cricketT = 0, groanCool = 0;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.ratio.value = 5;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = A.volume; master.connect(comp);
    sfx = ctx.createGain(); sfx.connect(master);
    amb = ctx.createGain(); amb.gain.value = 0.8; amb.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // a little echo (outdoors = short and soft)
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 1.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4); }
    verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.18; verb.connect(wet); wet.connect(master);
  }
  const now = () => ctx.currentTime;

  function out(vol = 1, pan = 0, echo = true) {
    const g = ctx.createGain(); g.gain.value = vol;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = U.clamp(pan, -1, 1);
      g.connect(p); p.connect(sfx); if (echo) p.connect(verb);
    } else { g.connect(sfx); if (echo) g.connect(verb); }
    return g;
  }
  function noise(dur, type, freq, q, vol, pan, attack = 0.005, freqEnd, delay = 0) {
    const t = now() + delay;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out(vol, pan));
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  function tone(type, f0, f1, dur, vol, pan, attack = 0.01, delay = 0) {
    const t = now() + delay;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out(vol, pan));
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }

  // how loud and which ear, for a sound at (x, z)
  function spot(x, z, range = 40) {
    if (x === undefined) return { v: 1, p: 0 };
    const dx = x - listener.x, dz = z - listener.z;
    const d = Math.hypot(dx, dz);
    const v = U.clamp(1 - d / range, 0, 1);
    // right ear direction
    const rx = Math.cos(listener.yaw), rz = -Math.sin(listener.yaw);
    const p = d > 0.5 ? (dx * rx + dz * rz) / d : 0;
    return { v: v * v, p: p * 0.8 };
  }

  // a zombie voice: buzzy tone through a "mouth" filter
  function groan(pitch, dur, vol, pan, angry) {
    const t = now();
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(pitch, t);
    o.frequency.linearRampToValueAtTime(pitch * (angry ? 1.4 : 0.8), t + dur * 0.4);
    o.frequency.linearRampToValueAtTime(pitch * 0.7, t + dur);
    const vib = ctx.createOscillator(); vib.frequency.value = U.rand(5, 9);
    const vg = ctx.createGain(); vg.gain.value = pitch * 0.06; vib.connect(vg); vg.connect(o.frequency);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = angry ? 900 : 500; f1.Q.value = 3;
    f1.frequency.linearRampToValueAtTime(angry ? 1300 : 700, t + dur * 0.5);
    const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.1);
    g.gain.setValueAtTime(1, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f1); f1.connect(f2); f2.connect(g); g.connect(out(vol, pan));
    o.start(t); vib.start(t); o.stop(t + dur + 0.1); vib.stop(t + dur + 0.1);
    noise(dur * 0.8, 'bandpass', angry ? 1500 : 800, 2, vol * 0.25, pan, 0.08); // breathy
  }

  // a sound that keeps going (wind, fire, helicopter...). set its volume every frame
  function loop(name, make) {
    if (loops[name]) return loops[name];
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(amb);
    const l = { g, nodes: make(g), vol: 0 };
    loops[name] = l;
    return l;
  }
  function loopVol(name, v) {
    const l = loops[name];
    if (!l) return;
    v = Math.max(0.0001, v);
    if (Math.abs(l.vol - v) < 0.003) return;
    l.vol = v;
    l.g.gain.setTargetAtTime(v, now(), 0.3);
  }
  const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(0, Math.random() * 2); return s; };

  const A = {
    init,
    volume: (() => { try { return +(localStorage.getItem('deadacres.vol') ?? 0.8); } catch (e) { return 0.8; } })(),
    setVolume(v) { A.volume = v; if (master) master.gain.value = v; try { localStorage.setItem('deadacres.vol', v); } catch (e) { /* no storage */ } },
    get ready() { return !!ctx; },
    setListener(x, z, yaw) { listener.x = x; listener.z = z; listener.yaw = yaw; },
    spot,

    // ---------- the player ----------
    step(ground, vol = 1) {
      if (!ctx) return;
      const f = { grass: 700, road: 1400, wood: 500, sand: 900, water: 600, rock: 1600 }[ground] || 800;
      noise(ground === 'water' ? 0.2 : 0.08, 'bandpass', f * U.rand(0.8, 1.2), ground === 'grass' ? 0.8 : 1.4, vol * (ground === 'grass' ? 0.25 : 0.35), U.rand(-0.1, 0.1), 0.003);
      if (ground === 'wood') tone('sine', U.rand(90, 120), 60, 0.08, vol * 0.25, 0);
    },
    jump() { if (ctx) noise(0.12, 'lowpass', 600, 1, 0.2, 0); },
    land(v) { if (ctx) { noise(0.15, 'lowpass', 300, 1, 0.3 * v, 0); tone('sine', 80, 40, 0.12, 0.3 * v, 0); } },
    swing() { if (ctx) noise(0.18, 'bandpass', 1200, 1, 0.22, 0, 0.04, 400); },
    hitWood(x, z) { if (!ctx) return; const s = spot(x, z); noise(0.12, 'bandpass', 900, 3, 0.6 * s.v, s.p); tone('triangle', U.rand(160, 220), 90, 0.15, 0.35 * s.v, s.p, 0.002); },
    hitRock(x, z) { if (!ctx) return; const s = spot(x, z); noise(0.08, 'highpass', 2500, 1, 0.5 * s.v, s.p); tone('square', U.rand(900, 1300), 600, 0.08, 0.12 * s.v, s.p, 0.002); },
    hitFlesh(x, z) { if (!ctx) return; const s = spot(x, z); noise(0.15, 'lowpass', 700, 1, 0.7 * s.v, s.p, 0.003); tone('sine', 120, 50, 0.15, 0.5 * s.v, s.p, 0.003); },
    hitBuild(x, z) { if (!ctx) return; const s = spot(x, z, 50); noise(0.2, 'bandpass', 500, 2, 0.6 * s.v, s.p); tone('triangle', 110, 70, 0.2, 0.4 * s.v, s.p, 0.002); },
    treeFall(x, z) {
      if (!ctx) return; const s = spot(x, z, 60);
      noise(1.2, 'bandpass', 400, 1, 0.3 * s.v, s.p, 0.3, 150);
      setTimeout(() => ctx && (noise(0.6, 'lowpass', 250, 1, 0.9 * s.v, s.p, 0.005), tone('sine', 60, 30, 0.5, 0.7 * s.v, s.p, 0.005)), 1100);
    },
    rockBreak(x, z) { if (!ctx) return; const s = spot(x, z); for (let i = 0; i < 4; i++) noise(0.15, 'highpass', 1800, 1, 0.4 * s.v, s.p, 0.003, null, i * 0.05); },
    hurt() { if (!ctx) return; noise(0.2, 'lowpass', 900, 1, 0.6, 0); tone('sawtooth', 220, 140, 0.25, 0.18, 0); },
    eat() { if (!ctx) return; for (let i = 0; i < 4; i++) noise(0.07, 'bandpass', U.rand(1500, 2500), 2, 0.3, 0, 0.003, null, i * 0.13); },
    drink() { if (!ctx) return; for (let i = 0; i < 4; i++) tone('sine', U.rand(300, 400), 180, 0.1, 0.25, 0, 0.01, i * 0.18); },
    heal() { if (!ctx) return; noise(0.5, 'bandpass', 3000, 1, 0.2, 0, 0.1); tone('sine', 520, 780, 0.3, 0.12, 0, 0.05, 0.1); },
    splash(x, z) { if (!ctx) return; const s = spot(x, z); noise(0.4, 'lowpass', 1400, 1, 0.5 * s.v, s.p, 0.01, 300); },
    pickup() { if (ctx) { tone('sine', 660, 990, 0.08, 0.15, 0); tone('sine', 990, 1320, 0.08, 0.12, 0, 0.01, 0.07); } },
    craft() { if (!ctx) return; for (let i = 0; i < 3; i++) { noise(0.06, 'bandpass', 1800, 2, 0.3, 0, 0.003, null, i * 0.12); tone('triangle', 400 + i * 120, 300, 0.08, 0.15, 0, 0.003, i * 0.12); } },
    build(x, z) { if (!ctx) return; const s = spot(x, z); for (let i = 0; i < 3; i++) { noise(0.08, 'bandpass', 700, 3, 0.5 * s.v, s.p, 0.002, null, i * 0.16); tone('triangle', 180, 120, 0.1, 0.3 * s.v, s.p, 0.002, i * 0.16); } },
    click() { if (ctx) tone('square', 900, 700, 0.04, 0.06, 0, 0.002); },
    error() { if (ctx) { tone('square', 200, 160, 0.12, 0.1, 0); tone('square', 160, 120, 0.15, 0.1, 0, 0.005, 0.12); } },
    door(x, z, open) { if (!ctx) return; const s = spot(x, z); const o = tone('sawtooth', open ? 180 : 240, open ? 260 : 150, 0.45, 0.08 * s.v, s.p, 0.05); noise(0.1, 'lowpass', 400, 1, 0.4 * s.v, s.p, 0.003, null, open ? 0 : 0.4); return o; },
    loot(x, z) { if (ctx) { const s = spot(x, z); noise(0.25, 'bandpass', 1200, 1, 0.25 * s.v, s.p, 0.02); } },
    bowDraw() { if (ctx) tone('sawtooth', 90, 160, 0.5, 0.05, 0, 0.2); },
    bowShoot() { if (!ctx) return; tone('triangle', 180, 90, 0.15, 0.3, 0, 0.002); noise(0.25, 'bandpass', 1500, 1, 0.2, 0, 0.01, 500); },
    arrowHit(x, z) { if (!ctx) return; const s = spot(x, z); noise(0.06, 'bandpass', 1400, 3, 0.4 * s.v, s.p, 0.002); },
    heartbeat(v) { if (!ctx || v < 0.03) return; tone('sine', 70, 40, 0.18, v * 0.8, 0, 0.005); tone('sine', 62, 38, 0.2, v * 0.6, 0, 0.005, 0.17); },
    death() { if (!ctx) return; tone('sawtooth', 110, 40, 2.5, 0.2, 0, 0.05); noise(2.5, 'lowpass', 300, 1, 0.3, 0, 0.1, 80); },

    // ---------- zombies ----------
    zombie(x, z, kind, angry) {
      if (!ctx) return; const s = spot(x, z, 45);
      if (s.v < 0.02) return;
      const pitch = kind === 'brute' ? U.rand(55, 70) : kind === 'runner' ? U.rand(120, 160) : U.rand(80, 110);
      groan(pitch, U.rand(0.8, 1.6) * (kind === 'brute' ? 1.3 : 1), 0.35 * s.v, s.p, angry);
    },
    zombieAttack(x, z, kind) {
      if (!ctx) return; const s = spot(x, z, 30);
      groan(kind === 'brute' ? 70 : 130, 0.5, 0.5 * s.v, s.p, true);
      noise(0.2, 'bandpass', 1200, 1, 0.3 * s.v, s.p, 0.02, 300, 0.25);
    },
    zombieDie(x, z) { if (!ctx) return; const s = spot(x, z); groan(90, 1.2, 0.35 * s.v, s.p, false); noise(0.3, 'lowpass', 300, 1, 0.5 * s.v, s.p, 0.01, null, 0.5); },
    animal(x, z) { if (!ctx) return; const s = spot(x, z); tone('sine', 700, 1100, 0.15, 0.1 * s.v, s.p, 0.01); },

    // ---------- big events ----------
    hordeHorn() {
      if (!ctx) return;
      for (const f of [98, 147, 196]) {
        const o = tone('sawtooth', f, f * 0.97, 4, 0.08, 0, 0.8);
        void o;
      }
      noise(4, 'lowpass', 300, 1, 0.15, 0, 1);
    },
    morning() { if (!ctx) return; [523, 659, 784, 1047].forEach((f, i) => tone('sine', f, f, 0.6, 0.07, 0, 0.02, i * 0.18)); },
    nightfall() { if (!ctx) return; [392, 330, 262, 196].forEach((f, i) => tone('sine', f, f * 0.98, 0.9, 0.07, 0, 0.05, i * 0.3)); },
    radio() { if (!ctx) return; noise(1.2, 'bandpass', 1800, 0.8, 0.25, 0, 0.05); [880, 880, 1320].forEach((f, i) => tone('square', f, f, 0.1, 0.05, 0, 0.005, 0.3 + i * 0.2)); },
    win() { if (!ctx) return; [523, 659, 784, 1047, 1319].forEach((f, i) => { tone('triangle', f, f, 0.5, 0.12, 0, 0.01, i * 0.15); tone('sine', f / 2, f / 2, 0.8, 0.08, 0, 0.01, i * 0.15); }); },

    // ---------- sounds that keep going ----------
    // o = { night: 0..1, fear: 0..1, fire: 0..1, heli: 0..1, wind: 0..1, dt }
    ambience(o) {
      if (!ctx) return;
      loop('wind', (g) => { const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08; const lg = ctx.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency); lfo.start(); n.connect(f); f.connect(g); return [n, lfo]; });
      loop('fire', (g) => { const n = noiseSrc(); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = 0.5; const n2 = noiseSrc(); const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 200; const g2 = ctx.createGain(); g2.gain.value = 1.5; n.connect(f); f.connect(g); n2.connect(f2); f2.connect(g2); g2.connect(g); return [n, n2]; });
      loop('heli', (g) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55; const am = ctx.createOscillator(); am.frequency.value = 11; const ag = ctx.createGain(); ag.gain.value = 0.5; const vca = ctx.createGain(); vca.gain.value = 0.5; am.connect(ag); ag.connect(vca.gain); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; o.connect(f); f.connect(vca); vca.connect(g); o.start(); am.start(); return [o, am]; });
      loop('dread', (g) => { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160; const os = [55, 55.4, 82.4].map((fr) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o; }); f.connect(g); return os; });
      loopVol('wind', 0.05 + (o.wind || 0) * 0.12);
      loopVol('fire', (o.fire || 0) * 0.25);
      loopVol('heli', (o.heli || 0) * 0.6);
      loopVol('dread', 0.02 + (o.night || 0) * 0.05 + (o.fear || 0) * 0.12);
      // birds in the day, crickets at night
      birdT -= o.dt;
      if (birdT <= 0) {
        birdT = U.rand(2, 7);
        if ((o.night || 0) < 0.3) {
          const f = U.rand(2000, 3500), p = U.rand(-0.8, 0.8), n = U.randInt(2, 5);
          for (let i = 0; i < n; i++) tone('sine', f * U.rand(0.9, 1.1), f * U.rand(1.1, 1.4), 0.08, 0.025, p, 0.01, i * 0.12);
        }
      }
      cricketT -= o.dt;
      if (cricketT <= 0) {
        cricketT = U.rand(0.4, 1.2);
        if ((o.night || 0) > 0.5 && (o.fear || 0) < 0.5) {
          const p = U.rand(-0.9, 0.9);
          for (let i = 0; i < 3; i++) tone('sine', 4200, 4300, 0.04, 0.012, p, 0.005, i * 0.07);
        }
      }
    },
    stopLoops() { for (const k in loops) loopVol(k, 0); },
    get groanCool() { return groanCool; },
  };
  return A;
})();
