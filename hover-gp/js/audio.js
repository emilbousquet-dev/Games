// ============================================================
//  SIGMA HOVER GP — MUSIC & SOUNDS
//  Everything is made with math (oscillators + noise), so there
//  are no sound files at all! Every world has its own song,
//  and the music speeds up on the FINAL LAP like it should.
// ============================================================
window.HG = window.HG || {};

HG.Audio = (function () {
  const U = HG.U;
  let ctx = null, master, comp, sfx, music, musicFilter, noiseBuf, echo, echoSend, verbSend;
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const now = () => ctx.currentTime;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    sfx = ctx.createGain(); sfx.connect(master);
    musicFilter = ctx.createBiquadFilter(); musicFilter.type = 'lowpass'; musicFilter.frequency.value = 20000;
    music = ctx.createGain(); music.connect(musicFilter); musicFilter.connect(master);
    applyVolumes();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    echo = ctx.createDelay(1.5); echo.delayTime.value = 0.28;
    const fb = ctx.createGain(); fb.gain.value = 0.3;
    const ef = ctx.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 2500;
    echoSend = ctx.createGain(); echoSend.connect(echo); echo.connect(ef); ef.connect(fb); fb.connect(echo);
    const eo = ctx.createGain(); eo.gain.value = 0.25; ef.connect(eo); eo.connect(master);
    const verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    verb.buffer = ir;
    verbSend = ctx.createGain(); verbSend.connect(verb);
    const vo = ctx.createGain(); vo.gain.value = 0.3; verb.connect(vo); vo.connect(master);
    if (pendingSong) startSong(pendingSong.id, pendingSong.racing);
  }
  // sound can only start after a click or key press
  ['keydown', 'pointerdown', 'touchstart'].forEach((ev) => window.addEventListener(ev, () => init(), { once: false, passive: true }));
  window.addEventListener('gamepadconnected', () => init());

  function applyVolumes() {
    if (!ctx) return;
    music.gain.value = 0.38 * HG.settings.music;
    sfx.gain.value = 0.9 * HG.settings.sfx;
  }

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(type, f0, f1, dur, vol, o = {}) {
    if (!ctx) return;
    const t = o.at || now() + (o.delay || 0);
    const osc = ctx.createOscillator(); osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + (o.slide || dur));
    if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib; lg.gain.value = f0 * (o.vibAmt || 0.03); l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.1); }
    const g = ctx.createGain();
    env(g, t, o.attack || 0.005, vol, dur);
    let node = osc;
    if (o.filter) { const f = ctx.createBiquadFilter(); f.type = o.filter; f.frequency.value = o.ff || 1200; f.Q.value = o.q || 1; node.connect(f); node = f; }
    node.connect(g);
    g.connect(o.bus || sfx);
    if (o.echo) g.connect(echoSend);
    if (o.verb) { const vg = ctx.createGain(); vg.gain.value = o.verb; g.connect(vg); vg.connect(verbSend); }
    osc.start(t); osc.stop(t + (o.attack || 0.005) + dur + 0.05);
  }
  function noise(dur, type, freq, q, vol, o = {}) {
    if (!ctx) return;
    const t = o.at || now() + (o.delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
    const g = ctx.createGain();
    env(g, t, o.attack || 0.003, vol, dur);
    s.connect(f); f.connect(g); g.connect(o.bus || sfx);
    if (o.verb) { const vg = ctx.createGain(); vg.gain.value = o.verb; g.connect(vg); vg.connect(verbSend); }
    s.start(t, Math.random()); s.stop(t + (o.attack || 0.003) + dur + 0.05);
  }

  // ============================================================
  //  SOUND EFFECTS
  // ============================================================
  const SFX = {
    count: () => { tone('square', 440, 440, 0.25, 0.25, { filter: 'lowpass', ff: 2500 }); },
    go: () => { [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.5, 0.18, { delay: i * 0.02, filter: 'lowpass', ff: 3000, verb: 0.3 })); },
    boost: () => { noise(0.6, 'bandpass', 500, 1.2, 0.35, { f1: 3000, attack: 0.02 }); tone('sawtooth', 120, 400, 0.4, 0.08, { filter: 'lowpass', ff: 900 }); },
    mini: (lvl) => { noise(0.45, 'bandpass', 700 + lvl * 400, 1.5, 0.3, { f1: 3500 }); tone('square', 300 + lvl * 150, 900 + lvl * 300, 0.25, 0.07, { filter: 'lowpass', ff: 2000 }); },
    spark: (lvl) => { tone('triangle', 900 + lvl * 300, 1400 + lvl * 400, 0.12, 0.12); },
    hop: () => { tone('square', 300, 520, 0.08, 0.06, { filter: 'lowpass', ff: 1800 }); },
    land: (hard) => { noise(0.15, 'lowpass', 300, 1, Math.min(0.5, 0.1 + hard * 0.02)); },
    wall: (hard) => { noise(0.12, 'bandpass', 1800, 2, Math.min(0.4, 0.08 + hard * 0.025)); tone('square', 180, 90, 0.08, 0.06); },
    bump: () => { noise(0.1, 'lowpass', 500, 1, 0.25); tone('sine', 140, 70, 0.1, 0.2); },
    coin: () => { tone('square', 988, 988, 0.07, 0.12, { filter: 'lowpass', ff: 5000 }); tone('square', 1319, 1319, 0.25, 0.12, { delay: 0.07, filter: 'lowpass', ff: 5000 }); },
    box: () => { [1568, 2093, 2637].forEach((f, i) => tone('triangle', f, f, 0.18, 0.08, { delay: i * 0.04, verb: 0.3 })); noise(0.1, 'highpass', 6000, 1, 0.12); },
    roulette: () => { for (let i = 0; i < 14; i++) tone('square', 1200 + (i % 2) * 300, 1200 + (i % 2) * 300, 0.03, 0.035, { delay: i * 0.1, filter: 'lowpass', ff: 3000 }); },
    itemget: () => { tone('triangle', 1047, 1047, 0.12, 0.15); tone('triangle', 1568, 1568, 0.3, 0.15, { delay: 0.1, verb: 0.3 }); },
    throw: () => { noise(0.25, 'bandpass', 900, 1, 0.2, { f1: 300 }); },
    rocket: () => { noise(0.7, 'bandpass', 400, 0.8, 0.3, { f1: 1600 }); tone('sawtooth', 200, 600, 0.4, 0.06, { filter: 'lowpass', ff: 1200 }); },
    boom: (big) => { noise(big ? 1.2 : 0.8, 'lowpass', 900, 0.8, big ? 0.9 : 0.6, { f1: 80, verb: 0.4 }); tone('sine', 110, 35, 0.6, 0.6); },
    slip: () => { tone('sine', 900, 200, 0.5, 0.15, { vib: 18, vibAmt: 0.15 }); },
    shield: () => { for (let i = 0; i < 6; i++) tone('sine', 1400 + i * 220, 1400 + i * 220, 0.3, 0.05, { delay: i * 0.04, verb: 0.5 }); },
    shieldpop: () => { noise(0.3, 'highpass', 3000, 1, 0.3); tone('sine', 1600, 400, 0.25, 0.12); },
    horn: () => { [196, 247, 294, 392].forEach((f) => tone('sawtooth', f, f, 0.7, 0.09, { filter: 'lowpass', ff: 1600, verb: 0.4 })); },
    ink: () => { noise(0.35, 'lowpass', 600, 2, 0.4, { f1: 150 }); tone('sine', 300, 80, 0.3, 0.2); },
    emp: () => { tone('sawtooth', 2000, 60, 0.8, 0.15, { filter: 'lowpass', ff: 4000 }); noise(0.6, 'highpass', 2000, 1, 0.25, { f1: 200 }); },
    ghost: () => { tone('sine', 600, 300, 0.9, 0.12, { vib: 6, vibAmt: 0.08, verb: 0.6 }); },
    sigma: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone('square', f, f, 0.15, 0.08, { delay: i * 0.06, verb: 0.3 })); },
    fbi: () => { for (let i = 0; i < 6; i++) tone('square', i % 2 ? 660 : 880, i % 2 ? 660 : 880, 0.22, 0.07, { delay: i * 0.25, filter: 'lowpass', ff: 2000 }); },
    missile: () => { noise(1.2, 'bandpass', 300, 0.6, 0.4, { f1: 1200 }); },
    fall: () => { tone('sine', 1200, 200, 0.9, 0.12); },
    respawn: () => { [880, 1175, 1568].forEach((f, i) => tone('triangle', f, f, 0.12, 0.08, { delay: i * 0.1 })); },
    lap: () => { [784, 988, 1175].forEach((f, i) => tone('square', f, f, 0.15, 0.09, { delay: i * 0.1, filter: 'lowpass', ff: 3000 })); },
    finallap: () => { [523, 523, 523, 698].forEach((f, i) => tone('square', f, f, i === 3 ? 0.6 : 0.12, 0.12, { delay: i * 0.14, filter: 'lowpass', ff: 3500, verb: 0.3 })); },
    finish: (place) => {
      const good = place <= 3;
      const notes = good ? [523, 659, 784, 1047, 784, 1047] : [392, 349, 330, 262];
      notes.forEach((f, i) => tone('square', f, f, i === notes.length - 1 ? 0.8 : 0.16, 0.12, { delay: i * 0.15, filter: 'lowpass', ff: 3000, verb: 0.3 }));
    },
    place: (up) => { tone('triangle', up ? 880 : 440, up ? 1320 : 330, 0.08, 0.06); },
    rocketstart: () => { noise(0.8, 'bandpass', 300, 1, 0.4, { f1: 3000 }); },
    stall: () => { noise(0.4, 'lowpass', 400, 1, 0.3); tone('sawtooth', 120, 60, 0.4, 0.1); },
    slipboost: () => { noise(0.4, 'bandpass', 1500, 1, 0.2, { f1: 4000 }); },
    blocked: () => { tone('square', 700, 350, 0.1, 0.1); },
    menu: () => { tone('square', 880, 880, 0.05, 0.07, { filter: 'lowpass', ff: 3000 }); },
    ok: () => { tone('square', 988, 988, 0.06, 0.08, { filter: 'lowpass', ff: 4000 }); tone('square', 1319, 1319, 0.12, 0.08, { delay: 0.06, filter: 'lowpass', ff: 4000 }); },
    back: () => { tone('square', 660, 440, 0.1, 0.07, { filter: 'lowpass', ff: 3000 }); },
  };
  // little voices (higher for small characters)
  function voice(kind, pitch = 1) {
    if (!ctx) return;
    const p = pitch;
    if (kind === 'yahoo') { tone('sawtooth', 300 * p, 520 * p, 0.12, 0.1, { filter: 'bandpass', ff: 1100 * p, q: 2 }); tone('sawtooth', 520 * p, 380 * p, 0.25, 0.1, { delay: 0.12, filter: 'bandpass', ff: 900 * p, q: 2, vib: 7, vibAmt: 0.04 }); }
    else if (kind === 'ouch') { tone('sawtooth', 500 * p, 250 * p, 0.35, 0.12, { filter: 'bandpass', ff: 900 * p, q: 2, vib: 10, vibAmt: 0.05 }); }
    else if (kind === 'waah') { tone('sawtooth', 600 * p, 520 * p, 1.1, 0.12, { filter: 'bandpass', ff: 1300, q: 2.5, vib: 6, vibAmt: 0.06 }); tone('sawtooth', 450 * p, 380 * p, 0.6, 0.08, { delay: 1.0, filter: 'bandpass', ff: 1100, q: 2.5, vib: 6, vibAmt: 0.06 }); }
    else if (kind === 'raspberry') { tone('sawtooth', 90, 70, 0.6, 0.18, { vib: 32, vibAmt: 0.25, filter: 'lowpass', ff: 900 }); noise(0.6, 'bandpass', 600, 2, 0.12); for (let i = 0; i < 3; i++) tone('square', 700, 900, 0.07, 0.05, { delay: 0.65 + i * 0.12, filter: 'lowpass', ff: 2500 }); }
    else if (kind === 'woohoo') { [1, 1.25, 1.5].forEach((m, i) => tone('sawtooth', 350 * p * m, 420 * p * m, 0.14, 0.08, { delay: i * 0.12, filter: 'bandpass', ff: 1000 * p, q: 2 })); }
    else if (kind === 'meow') { tone('sawtooth', 600, 900, 0.15, 0.1, { filter: 'bandpass', ff: 1400, q: 3 }); tone('sawtooth', 900, 500, 0.3, 0.1, { delay: 0.15, filter: 'bandpass', ff: 1200, q: 3 }); }
  }
  function play(name, a) { if (!ctx) return; const f = SFX[name]; if (f) f(a); }

  // what to play when a racer does something (only loud for players)
  function kartEvent(k, e, mine, views) {
    if (!ctx) return;
    const near = mine || isNear(k, views);
    if (!near) return;
    const C = HG.Chars.byId[k.charId] || {};
    const pitch = C.voice || 1;
    switch (e.type) {
      case 'boost': if (!mine) break; if ((e.kind || '').startsWith('mini')) SFX.mini(+e.kind.slice(4)); else if (e.kind === 'pad' || e.kind === 'turbo' || e.kind === 'gold' || e.kind === 'trick') SFX.boost(); break;
      case 'sparklevel': if (mine) SFX.spark(e.level); break;
      case 'hop': if (mine) SFX.hop(); break;
      case 'land': if (mine && e.hard > 6) SFX.land(e.hard); break;
      case 'wall': SFX.wall(e.hard); break;
      case 'bump': if (mine) SFX.bump(); break;
      case 'coin': if (mine) SFX.coin(); break;
      case 'boxhit': SFX.box(); break;
      case 'roulette': if (mine) SFX.roulette(); break;
      case 'itemget': if (mine) SFX.itemget(); break;
      case 'throw': if (e.id === 'rocket') SFX.rocket(); else SFX.throw(); break;
      case 'use':
        if (e.id === 'shield') SFX.shield(); else if (e.id === 'horn') SFX.horn(); else if (e.id === 'smoke') SFX.ink(); else if (e.id === 'ghost') SFX.ghost();
        else if (e.id === 'sigma') { SFX.sigma(); if (mine) starMusic(8); } else if (e.id === 'missile') SFX.missile(); else if (e.id === 'emp') SFX.emp(); else if (e.id === 'fbi') SFX.fbi();
        break;
      case 'hurt': if (C.baby) voice('waah', pitch); else if (C.id === 'kisse') voice('meow', 1); else voice('ouch', pitch); break;
      case 'slipped': SFX.slip(); break;
      case 'shieldpop': SFX.shieldpop(); break;
      case 'trick': if (mine) voice(Math.random() < 0.5 ? 'yahoo' : 'woohoo', pitch); break;
      case 'raspberry': voice('raspberry', pitch); break;
      case 'fall': if (mine) SFX.fall(); break;
      case 'respawn': if (mine) SFX.respawn(); break;
      case 'lap': if (mine && !e.final) SFX.lap(); break;
      case 'finish': if (mine) { SFX.finish(e.place); stopSong(1.5); setTimeout(() => victorySong(e.place), 1600); } break;
      case 'rocketstart': if (mine) SFX.rocketstart(); break;
      case 'stall': if (mine) SFX.stall(); break;
      case 'slipboost': if (mine) SFX.slipboost(); break;
      case 'blocked': SFX.blocked(); break;
      case 'place': if (mine) SFX.place(e.to < e.from); break;
      case 'inked': if (mine) SFX.ink(); break;
      case 'fbiwarn': if (mine) SFX.fbi(); break;
      case 'hitother': if (mine) voice('woohoo', pitch); break;
    }
  }
  const _kp = new THREE.Vector3(), _q = new THREE.Quaternion();
  function isNear(k, views) {
    if (!views || !HG.Race.track) return false;
    for (const v of views) {
      const ds = HG.Race.track.isArena ? Math.hypot(v.kart.s - k.s, v.kart.d - k.d) : Math.abs(HG.Race.track.diff(v.kart.s, k.s));
      if (ds < 30) return true;
    }
    return false;
  }

  // ============================================================
  //  ENGINE HUM (one for each player)
  // ============================================================
  const engines = [];
  function engineFor(i) {
    if (engines[i]) return engines[i];
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.detune.value = 7;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 600; f.Q.value = 3;
    const g = ctx.createGain(); g.gain.value = 0;
    const ns = ctx.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2000; nf.Q.value = 0.8;
    const ng = ctx.createGain(); ng.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(sfx);
    ns.connect(nf); nf.connect(ng); ng.connect(sfx);
    o1.start(); o2.start(); ns.start();
    engines[i] = { o1, o2, f, g, ng, nf };
    return engines[i];
  }
  function raceUpdate(dt, race, views) {
    if (!ctx) return;
    views.forEach((v, i) => {
      const e = engineFor(i), k = v.kart, t = now();
      const sp = Math.abs(k.spd);
      const on = race.phase !== 'intro' && !k.out && !(k.falling > 0);
      const base = 55 + sp * 3.2 + (k.boosting ? 40 : 0) + (k.anim.rev ? 30 : 0);
      e.o1.frequency.setTargetAtTime(base, t, 0.05); e.o2.frequency.setTargetAtTime(base * 1.5, t, 0.05);
      e.f.frequency.setTargetAtTime(300 + sp * 30 + (k.boosting ? 1200 : 0), t, 0.08);
      e.g.gain.setTargetAtTime(on ? (0.035 + sp * 0.0012) / views.length : 0, t, 0.1);
      // hover hiss + drift screech
      e.nf.frequency.setTargetAtTime(k.drift.dir ? 3500 + k.drift.level * 800 : 1200 + sp * 20, t, 0.1);
      e.ng.gain.setTargetAtTime(on ? (k.drift.dir && k.grounded ? 0.06 : 0.012 + sp * 0.0004) / views.length : 0, t, 0.08);
    });
    // final lap speed-up
    if (song) {
      const me = views[0] && views[0].kart;
      song.fast = !!(me && race.laps && me.lap >= race.laps && !race.battle);
    }
  }
  function stopEngines() { for (const e of engines) if (e) e.g.gain.setTargetAtTime(0, now(), 0.05), e.ng.gain.setTargetAtTime(0, now(), 0.05); }

  // ============================================================
  //  MUSIC: a little song machine. Each world has a style.
  // ============================================================
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], mixo: [0, 2, 4, 5, 7, 9, 10] };
  const SONGS = {
    menu: { bpm: 118, root: 60, scale: 'major', prog: [0, 5, 3, 4], lead: 'square', drums: 'funk', bass: 'walk', arp: false, seed: 11 },
    city: { bpm: 128, root: 61, scale: 'minor', prog: [0, 5, 2, 6], lead: 'sawtooth', drums: 'house', bass: 'octave', arp: true, seed: 3 },
    volcano: { bpm: 150, root: 57, scale: 'harmonic', prog: [0, 5, 3, 4], lead: 'sawtooth', drums: 'rock', bass: 'gallop', arp: false, seed: 7, dist: true },
    beach: { bpm: 112, root: 62, scale: 'major', prog: [0, 3, 4, 3], lead: 'triangle', drums: 'calypso', bass: 'bounce', arp: true, seed: 21, pluck: true },
    desert: { bpm: 118, root: 62, scale: 'phrygian', prog: [0, 1, 0, 6], lead: 'triangle', drums: 'tribal', bass: 'drone', arp: false, seed: 5, pluck: true },
    ice: { bpm: 122, root: 64, scale: 'major', prog: [0, 4, 5, 3], lead: 'sine', drums: 'light', bass: 'octave', arp: true, seed: 9, bell: true },
    candy: { bpm: 144, root: 65, scale: 'major', prog: [0, 3, 4, 0], lead: 'square', drums: 'chip', bass: 'bounce', arp: true, seed: 33 },
    jungle: { bpm: 116, root: 60, scale: 'dorian', prog: [0, 3, 0, 4], lead: 'triangle', drums: 'tribal', bass: 'bounce', arp: false, seed: 17, pluck: true },
    underwater: { bpm: 96, root: 63, scale: 'major', prog: [0, 5, 3, 4], lead: 'sine', drums: 'light', bass: 'drone', arp: true, seed: 41, bell: true },
    hotel: { bpm: 132, root: 57, scale: 'harmonic', prog: [0, 3, 4, 0], lead: 'square', drums: 'swing', bass: 'walk', arp: false, seed: 13 },
    lab: { bpm: 110, root: 57, scale: 'minor', prog: [0, 5, 6, 4], lead: 'sawtooth', drums: 'house', bass: 'octave', arp: true, seed: 2 },
    space: { bpm: 126, root: 62, scale: 'minor', prog: [0, 5, 3, 6], lead: 'sawtooth', drums: 'house', bass: 'octave', arp: true, seed: 27 },
    sky: { bpm: 134, root: 62, scale: 'major', prog: [0, 4, 5, 3], lead: 'square', drums: 'rock', bass: 'gallop', arp: true, seed: 19, bell: true },
    stadium: { bpm: 146, root: 64, scale: 'mixo', prog: [0, 6, 3, 0], lead: 'sawtooth', drums: 'rock', bass: 'gallop', arp: false, seed: 23, dist: true },
    factory: { bpm: 124, root: 58, scale: 'minor', prog: [0, 0, 5, 6], lead: 'square', drums: 'industrial', bass: 'octave', arp: false, seed: 31 },
    moon: { bpm: 100, root: 60, scale: 'dorian', prog: [0, 3, 6, 4], lead: 'sine', drums: 'light', bass: 'drone', arp: true, seed: 37, bell: true },
    rainbow: { bpm: 152, root: 62, scale: 'major', prog: [0, 4, 5, 3], lead: 'sawtooth', drums: 'rock', bass: 'gallop', arp: true, seed: 43 },
    grass: { bpm: 130, root: 60, scale: 'major', prog: [0, 3, 4, 4], lead: 'square', drums: 'funk', bass: 'walk', arp: false, seed: 29 },
    battle: { bpm: 140, root: 60, scale: 'mixo', prog: [0, 6, 3, 4], lead: 'square', drums: 'rock', bass: 'gallop', arp: false, seed: 47 },
    star: { bpm: 180, root: 67, scale: 'major', prog: [0, 3, 0, 4], lead: 'square', drums: 'chip', bass: 'bounce', arp: true, seed: 99 },
  };

  // make a catchy melody from a seed (the same seed = the same song every time)
  function makeMelody(def) {
    const r = U.rng(def.seed * 7919 + 13);
    const sc = SCALES[def.scale];
    const motif = [];
    // 2 bars of motif, then variations: A A' B A''
    for (let i = 0; i < 32; i++) {
      const strong = i % 4 === 0;
      if (!strong && r() < 0.42) { motif.push(null); continue; }
      const chord = def.prog[Math.floor(i / 16) % 4];
      const deg = strong ? chord + [0, 2, 4][Math.floor(r() * 3)] : chord + Math.floor(r() * 7) - 2;
      motif.push(deg);
    }
    const mel = [];
    for (let bar = 0; bar < 8; bar++) {
      for (let s = 0; s < 16; s++) {
        let n = motif[(bar % 2) * 16 + s];
        if (n !== null && bar >= 4 && bar < 6) n += 2;          // B part goes higher
        if (n !== null && bar === 3 && s > 8) n -= 1;
        if (bar === 7 && s >= 12) n = s === 12 ? def.prog[0] + 7 : null;
        mel.push(n);
      }
    }
    return mel.map((d) => (d === null ? null : def.root + 12 + Math.floor(d / 7) * 12 + sc[((d % 7) + 7) % 7]));
  }
  function chordNotes(def, degree) {
    const sc = SCALES[def.scale];
    return [0, 2, 4].map((k) => { const d = degree + k; return def.root + Math.floor(d / 7) * 12 + sc[((d % 7) + 7) % 7]; });
  }

  let song = null, pendingSong = null, timer = null, star = 0;
  function startSong(id, racing) {
    pendingSong = { id, racing };
    if (!ctx) return;
    stopSong(0.05);
    const def = SONGS[id] || SONGS.grass;
    song = { id, def, mel: makeMelody(def), step: 0, next: now() + 0.12, racing, fast: false, vol: 1 };
    if (!timer) timer = setInterval(schedule, 25);
  }
  function stopSong(fade = 0.5) {
    song = null;
    if (ctx) { music.gain.cancelScheduledValues(now()); music.gain.setTargetAtTime(0, now(), fade / 3); setTimeout(() => applyVolumes(), fade * 1000 + 100); }
  }
  function starMusic(sec) { star = sec; }

  function schedule() {
    if (!ctx || !song) return;
    if (star > 0) star -= 0.025;
    const playing = star > 0 ? { def: SONGS.star, mel: song.starMel || (song.starMel = makeMelody(SONGS.star)) } : song;
    const def = playing.def;
    const bpm = def.bpm * (song.fast ? 1.12 : 1);
    const stepT = 60 / bpm / 4;
    while (song && song.next < now() + 0.15) {
      playStep(def, playing.mel, song.step, song.next, stepT);
      song.next += stepT;
      song.step++;
    }
  }

  function playStep(def, mel, step, t, stepT) {
    const s = step % 16, bar = Math.floor(step / 16), ch = def.prog[bar % 4];
    const B = music;
    const calm = !song.racing;
    // ---- drums ----
    const d = def.drums;
    const kick = (v = 1) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.7 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g); g.connect(B); o.start(t); o.stop(t + 0.32); };
    const snare = (v = 1) => { noise(0.16, 'bandpass', 1800, 0.8, 0.3 * v, { at: t, bus: B, verb: 0.2 }); tone('triangle', 200, 140, 0.08, 0.15 * v, { at: t, bus: B }); };
    const hat = (v = 1, open) => noise(open ? 0.14 : 0.03, 'highpass', 8000, 0.8, 0.08 * v, { at: t, bus: B });
    const bongo = (f, v = 1) => tone('sine', f, f * 0.8, 0.12, 0.25 * v, { at: t, bus: B });
    if (d === 'house') { if (s % 4 === 0) kick(); if (s % 8 === 4) snare(0.8); if (s % 4 === 2) hat(1, true); else if (s % 2 === 0) hat(0.6); }
    else if (d === 'rock') { if (s === 0 || s === 6 || s === 8 || s === 11) kick(); if (s % 8 === 4) snare(); if (s % 2 === 0) hat(0.8); }
    else if (d === 'funk') { if (s === 0 || s === 3 || s === 10) kick(); if (s % 8 === 4) snare(0.8); hat(s % 2 ? 0.4 : 0.8); }
    else if (d === 'calypso') { if (s % 8 === 0 || s === 11) kick(0.8); if (s === 4 || s === 12) snare(0.5); if (s % 4 === 2) hat(0.8); if (s % 4 === 3) bongo(400, 0.6); }
    else if (d === 'tribal') { if (s % 8 === 0) kick(); if ([2, 3, 6, 10, 14].includes(s)) bongo(s % 4 === 2 ? 320 : 240); if (s % 4 === 0) hat(0.5); }
    else if (d === 'light') { if (s === 0 || s === 10) kick(0.6); if (s === 8) snare(0.4); if (s % 4 === 2) hat(0.5); }
    else if (d === 'chip') { if (s % 4 === 0) kick(0.8); if (s % 8 === 4) noise(0.06, 'highpass', 3000, 1, 0.2, { at: t, bus: B }); if (s % 2) hat(0.5); }
    else if (d === 'swing') { if (s === 0 || s === 8) kick(0.8); if (s === 4 || s === 12) snare(0.6); if (s % 4 === 0 || s % 4 === 3) hat(0.7, s % 4 === 3); }
    else if (d === 'industrial') { if (s % 4 === 0) kick(); if (s % 8 === 4) { snare(); noise(0.08, 'bandpass', 3000, 3, 0.2, { at: t, bus: B }); } if (s % 2) noise(0.02, 'bandpass', 5000, 6, 0.1, { at: t, bus: B }); }
    // ---- bass ----
    const root = chordNotes(def, ch)[0] - 24;
    const bassNote = (n, len, v = 1) => tone(def.dist ? 'sawtooth' : 'triangle', hz(n), hz(n), len, 0.32 * v, { at: t, bus: B, filter: 'lowpass', ff: def.dist ? 700 : 500 });
    const bs = def.bass;
    if (bs === 'octave') { if (s % 2 === 0) bassNote(root + (s % 4 === 2 ? 12 : 0), stepT * 1.6); }
    else if (bs === 'gallop') { if (s % 4 !== 1) bassNote(root + (s % 8 === 6 ? 7 : 0), stepT * 0.9); }
    else if (bs === 'walk') { if (s % 4 === 0) bassNote(root + [0, 4, 7, 9][s / 4], stepT * 3.5); }
    else if (bs === 'bounce') { if (s === 0 || s === 6 || s === 8 || s === 12) bassNote(root + (s === 6 ? 7 : s === 12 ? 12 : 0), stepT * 2); }
    else if (bs === 'drone') { if (s === 0) bassNote(root, stepT * 15, 0.8); if (s === 8) bassNote(root + 7, stepT * 7, 0.5); }
    // ---- chords (soft pad) ----
    if (s === 0) for (const n of chordNotes(def, ch)) tone(def.bell ? 'sine' : 'sawtooth', hz(n), hz(n), stepT * 15, calm ? 0.035 : 0.025, { at: t, bus: B, attack: 0.15, filter: 'lowpass', ff: 1100, verb: 0.4 });
    // ---- arpeggio ----
    if (def.arp && s % 2 === 0) {
      const c = chordNotes(def, ch);
      const n = c[(s / 2) % 3] + 12 + (s % 8 === 6 ? 12 : 0);
      tone(def.bell ? 'sine' : 'square', hz(n), hz(n), stepT * 1.2, 0.04, { at: t, bus: B, filter: 'lowpass', ff: 2600, echo: true });
    }
    // ---- melody ----
    const m = mel[step % mel.length];
    if (m !== null && m !== undefined && !(calm && bar % 8 >= 6)) {
      let len = stepT * 1.8;
      const nxt = mel[(step + 1) % mel.length];
      if (nxt === null) len = stepT * 2.6;
      const lv = def.lead === 'sine' ? 0.13 : def.lead === 'triangle' ? 0.12 : 0.07;
      tone(def.lead, hz(m), hz(m), def.pluck ? stepT * 1.5 : len, lv, { at: t, bus: B, filter: 'lowpass', ff: def.lead === 'sawtooth' ? 2400 : 4000, echo: true, vib: def.pluck ? 0 : 5.5, vibAmt: 0.008 });
      if (def.bell) tone('sine', hz(m + 12), hz(m + 12), stepT * 3, 0.04, { at: t, bus: B, verb: 0.4 });
    }
  }

  // the little tune after you finish
  function victorySong(place) {
    if (!ctx) return;
    applyVolumes();
    const good = place <= 3;
    const notes = good ? [72, 76, 79, 84, 79, 84, 88, null, 86, 84, 83, 84] : [67, 65, 64, 62, null, 60, 59, 60];
    notes.forEach((n, i) => { if (n) tone('square', hz(n), hz(n), 0.22, 0.08, { delay: i * 0.18, bus: music, filter: 'lowpass', ff: 3000, echo: true }); });
    setTimeout(() => { if (!song) startSong('menu', false); }, notes.length * 180 + 1200);
  }

  return {
    init, play, voice, kartEvent, raceUpdate, applyVolumes, stopEngines,
    raceMusic(id, racing) { startSong(SONGS[id] ? id : 'grass', racing); },
    menuMusic() { if (!song || song.id !== 'menu') startSong('menu', false); },
    finalLap() { SFX.finallap(); },
    muffle(on) { if (ctx) musicFilter.frequency.setTargetAtTime(on ? 600 : 20000, now(), 0.1); if (on) stopEngines(); },
    stopSong, SONGS,
  };
})();
