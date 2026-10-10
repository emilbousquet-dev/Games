// ============================================================
//  FLOPPY PARTY — COMMENTATOR, QUICK CHAT AND RUMBLE
//  Commentator: a funny voice in the corner that shouts things
//    like "WHAT A THROW!" when something cool happens.
//  Quick Chat: press 5, 6 or 7 to say "Nice!", "Oops!" or
//    "Rematch?" in a bubble over your character (online too!)
//  Rumble: controllers shake when you get punched or knocked
//    out (if your controller can do it).
//  All three can be switched off in Settings.
// ============================================================
window.FP = window.FP || {};

FP.Caster = (function () {
  const on = (k) => !FP.Settings || FP.Settings.get(k) !== false;
  const isClient = () => !!(FP.Net && FP.Net.isClient());
  const isHost = () => !!(FP.Net && FP.Net.isHost());
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const nameOf = (c) => (c && c.player ? c.player.name : c && c.name) || 'Someone';
  const playing = () => FP.Game && ['play', 'roundOver'].includes(FP.Game.state) && !isClient();

  // ---------------- the commentator ----------------
  let box = null, hideT = 0, quietUntil = 0, lastLine = '';
  const MIC = '<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="#ff5a8a" stroke="#2a2140" stroke-width="1.8"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" fill="none" stroke="#2a2140" stroke-width="1.8" stroke-linecap="round"/></svg>';
  function show(text) {
    if (!on('commentator')) return;
    if (!box) { box = FP.UI.el('div', 'caster'); FP.UI.root.append(box); }
    box.innerHTML = `${MIC}<span></span>`;
    box.querySelector('span').textContent = text;
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    box.hidden = false;
    hideT = 2.4;
  }
  // say a line (important lines can interrupt, the others wait their turn)
  function say(lines, important = false) {
    const now = performance.now() / 1000;
    if (!important && now < quietUntil) return;
    let text = typeof lines === 'string' ? lines : pick(lines);
    if (text === lastLine && typeof lines !== 'string') text = pick(lines);
    lastLine = text;
    quietUntil = now + (important ? 1.2 : 2.6);
    show(text);
    if (isHost()) FP.Net.event('say', text);
  }
  FP.bus.on('net:say', (t) => { if (typeof t === 'string') show(t.slice(0, 80)); });

  // who knocked out who (for "ON FIRE!")
  const streaks = new Map();
  let outsThisRound = 0, roundStart = 0;
  FP.bus.on('throw', (e) => {
    if (!playing() || !e || !e.who || !e.who.bodies || !e.by) return;
    const by = nameOf(e.by), who = nameOf(e.who);
    say(['WHAT A THROW!', 'YEET!', 'Look at them fly!', 'Air mail!', `${by} throws ${who}!`, `${who} is flying!`, 'Free flying lessons!']);
  });
  FP.bus.on('knockOut', (c) => {
    if (!playing() || !c || !c.parts) return;
    const by = c.lastHitBy && c.lastHitBy !== c && performance.now() - c.lastHitTime < 3000 ? c.lastHitBy : null;
    if (c.playDead) return; // (pretending! Shh...)
    if (!by) return;
    const now = performance.now() / 1000;
    const st = streaks.get(by) || { n: 0, t: 0 };
    st.n = now - st.t < 25 ? st.n + 1 : 1; st.t = now;
    streaks.set(by, st);
    if (st.n === 3) { say(`${nameOf(by)} is ON FIRE!`, true); return; }
    if (st.n === 5) { say(`${nameOf(by)} is UNSTOPPABLE!`, true); return; }
    say(['KNOCKOUT!', `${nameOf(by)} sends ${nameOf(c)} to dreamland!`, `Down goes ${nameOf(c)}!`, 'Seeing stars!', 'BONK!', 'Nap time!', 'OOF! That one hurt!']);
  });
  FP.bus.on('out', (e) => {
    if (!playing() || !e || !e.c) return;
    const g = FP.Game, name = nameOf(e.c);
    outsThisRound++;
    const alive = g.chars.filter((c) => c.alive && c.player);
    if (alive.length === 2 && g.chars.filter((c) => c.player).length > 2 && !(g.mode && g.mode.teams)) { say(`It's down to ${nameOf(alive[0])} and ${nameOf(alive[1])}!`, true); return; }
    if (outsThisRound === 1 && e.by) { say([`${nameOf(e.by)} gets the first knockout!`, `${name} is the first one out!`], true); return; }
    if (outsThisRound === 1 && performance.now() / 1000 - roundStart < 10) { say(`${name} is out already! That was fast!`, true); return; }
    if (outsThisRound === 1) { say(`${name} is the first one out!`, true); return; }
    if (!e.by) { say([`${name} fell off all alone. Oops!`, `Nobody pushed ${name}. Nobody!`, `${name} took the scenic route down!`], true); return; }
    say([`Bye bye ${name}!`, `${name} is out!`, `See you later, ${name}!`], true);
  });
  FP.bus.on('land', (e) => { if (playing() && e && e.hard && e.c && e.c.player && Math.random() < 0.3) say(['What a landing!', 'Stuck the landing!', 'SPLAT!']); });
  FP.bus.on('roundStart', () => { outsThisRound = 0; roundStart = performance.now() / 1000; quietUntil = roundStart + 3; });

  // ---------------- Quick Chat ----------------
  const CHAT = ['Nice!', 'Oops!', 'Rematch?'];
  const CHAT_KEYS = { Digit5: 0, Digit6: 1, Digit7: 2 };
  const lastChat = new Map();
  function bubble(id, k) {
    const c = FP.Game && FP.Game.chars.find((ch) => ch.player && ch.player.id === id);
    if (!c || !CHAT[k]) return;
    const h = c.parts.head.position;
    FP.FX.word(new THREE.Vector3(h.x, h.y + 0.8, h.z), CHAT[k], ['#3fbf4a', '#ff8a2a', '#4aa8ff'][k], 1.5);
    FP.Audio.play('tick');
  }
  // somebody chatted (on this computer, or a friend online): the host tells everybody
  FP.bus.on('chat', (e) => {
    if (!e || isClient()) return;
    const k = e.k | 0, now = performance.now();
    if (!CHAT[k] || now - (lastChat.get(e.id) || 0) < 900) return;
    lastChat.set(e.id, now);
    bubble(e.id, k);
    if (isHost()) FP.Net.event('chat', { id: e.id, k });
  });
  FP.bus.on('net:chat', (e) => { if (e) bubble(e.id | 0, e.k | 0); });
  const CHAT_STATES = ['lobby', 'countdown', 'play', 'roundOver', 'results', 'client', 'clientResults'];
  window.addEventListener('keydown', (e) => {
    const k = CHAT_KEYS[e.code];
    if (k === undefined || e.repeat || !on('chat')) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const g = FP.Game;
    if (!g || !CHAT_STATES.includes(g.state) || (FP.Editor && FP.Editor.isOpen())) return;
    if (isClient()) { FP.Net.send({ t: 'chat', k }); return; }
    const me = g.players.find((p) => p.source.kind === 'keys');
    if (me) FP.bus.emit('chat', { id: me.id, k });
  });

  // ---------------- Rumble ----------------
  function buzzPad(index, strong, ms) {
    if (!on('rumble')) return;
    const gp = FP.Input.getPads()[index];
    const act = gp && gp.vibrationActuator;
    if (!act || !act.playEffect) return;
    try { act.playEffect(act.type || 'dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: Math.min(1, strong + 0.2) }).catch(() => {}); } catch (e) { /* this controller can't rumble */ }
  }
  function buzz(c, strong, ms) {
    const p = c && c.player;
    if (!p) return;
    if (p.source.kind === 'pad') buzzPad(p.source.index, strong, ms);
    else if (p.source.kind === 'remote' && isHost()) FP.Net.event('buzz', { id: p.id, s: strong, ms });
  }
  // a friend online: the host says our character got hit
  FP.bus.on('net:buzz', (e) => { if (e && FP.Net && e.id === FP.Net.myId) buzzPad(0, Math.min(1, +e.s || 0.5), Math.min(600, +e.ms || 150)); });
  const live = () => FP.Game && ['play', 'roundOver', 'countdown'].includes(FP.Game.state) && !isClient();
  FP.bus.on('punchHit', (e) => { if (live() && e && e.victim && e.victim.player) buzz(e.victim, 0.45, 120); });
  FP.bus.on('knockOut', (c) => { if (live() && c && c.player) buzz(c, 1, 380); });
  FP.bus.on('throw', (e) => { if (live() && e && e.who && e.who.player) buzz(e.who, 0.7, 250); });
  FP.bus.on('out', (e) => { if (live() && e && e.c) buzz(e.c, 0.8, 450); });

  function update(dt) {
    if (box && !box.hidden) { hideT -= dt; if (hideT <= 0) box.hidden = true; }
  }
  return { say, update, CHAT, bubble };
})();
