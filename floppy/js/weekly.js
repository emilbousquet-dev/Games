// ============================================================
//  FLOPPY PARTY — WEEKLY CHALLENGES
//  Every week (starting on Monday) there are 3 new, bigger
//  goals, like "Win 4 Brawl games". Each one gives 100 coins.
//  Finish all 3 for a MYSTERY PRIZE: something from the Shop
//  you don't have yet (or lots of coins if you have it all).
//  Saved on this computer.
// ============================================================
window.FP = window.FP || {};

FP.Weekly = (function () {
  const REWARD = 100, ALL_BONUS = 150;
  const CAT_NAME = { brawl: 'Brawl', sports: 'Sports', party: 'Party' };
  const TEMPLATES = [
    { id: 'winBrawl', n: [3, 5], text: (n) => `Win ${n} Brawl games`, kind: 'win', cat: 'brawl' },
    { id: 'winSports', n: [2, 4], text: (n) => `Win ${n} Sports games`, kind: 'win', cat: 'sports' },
    { id: 'winParty', n: [2, 4], text: (n) => `Win ${n} Party games`, kind: 'win', cat: 'party' },
    { id: 'play', n: [8, 12], text: (n) => `Play ${n} mini-games`, kind: 'play' },
    { id: 'different', n: [5, 8], text: (n) => `Play ${n} different mini-games`, kind: 'different' },
    { id: 'kos', n: [15, 30], text: (n) => `Knock out ${n} characters`, kind: 'ko' },
    { id: 'throws', n: [8, 15], text: (n) => `Throw ${n} characters`, kind: 'throw' },
    { id: 'hard', n: [1, 2], text: (n) => `Win ${n} game${n > 1 ? 's' : ''} against Hard bots`, kind: 'hard' },
  ];

  // this week's number (weeks start on Monday)
  function weekKey(d = new Date()) { return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000 + 3) / 7); }
  function daysLeft(d = new Date()) { return 7 - ((d.getDay() + 6) % 7); }
  // the same 3 challenges for everyone this week
  function challenges(key = weekKey()) {
    let s = (key * 7919) % 2147483647 || 1;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    rnd();
    const pool = TEMPLATES.slice(), out = [];
    while (out.length < 3) {
      const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
      const n = t.n[0] + Math.floor(rnd() * (t.n[1] - t.n[0] + 1));
      out.push({ ...t, n });
    }
    return out;
  }

  let st = null;
  function load() {
    const key = weekKey();
    try { st = JSON.parse(localStorage.getItem('floppy-weekly') || 'null'); } catch (e) { st = null; }
    if (!st || st.key !== key || !Array.isArray(st.prog)) st = { key, prog: [0, 0, 0], done: [false, false, false], all: false, games: [] };
    return st;
  }
  function save() { try { localStorage.setItem('floppy-weekly', JSON.stringify(st)); } catch (e) { /* no saving */ } }

  function add(kind, amount = 1, test = () => true) {
    load();
    const list = challenges(st.key);
    let changed = false;
    list.forEach((c, i) => {
      if (st.done[i] || c.kind !== kind || !test(c)) return;
      st.prog[i] = Math.min(c.n, st.prog[i] + amount);
      changed = true;
      if (st.prog[i] >= c.n) {
        st.done[i] = true;
        FP.Profile.earn(REWARD);
        FP.UI.achievement(c.text(c.n), 'Weekly challenge complete!', REWARD, 'Weekly challenge');
      }
    });
    if (changed && !st.all && st.done.every(Boolean)) { st.all = true; save(); mysteryPrize(); }
    if (changed) save();
  }

  // all 3 done: a free thing from the Shop you don't have yet
  function mysteryPrize() {
    const P = FP.Profile, prices = P.PRICES;
    const notMine = Object.keys(prices).filter((id) => !P.owns(id));
    if (!notMine.length) { P.earn(300); FP.UI.achievement('All weekly challenges done!', 'You have everything, so here are 300 coins!', 300, 'Mystery prize'); return; }
    const id = notMine[Math.floor(Math.random() * notMine.length)];
    P.grant(id);
    P.earn(ALL_BONUS);
    FP.UI.achievement(`Mystery prize: ${P.itemName(id)}!`, 'All 3 weekly challenges done! Pick it in the lobby.', ALL_BONUS, 'Mystery prize');
    FP.Audio.play('fanfare');
  }

  // a mini-game ended (called by the game, for players on this computer)
  function matchEnded({ mode, won, skill, bots }) {
    if (!mode || mode.id === 'tutorial') return;
    load();
    const cat = FP.Game && FP.Game.catOf ? FP.Game.catOf(mode.id) : 'party';
    add('play');
    if (!st.games.includes(mode.id)) { st.games.push(mode.id); save(); add('different'); }
    if (won) add('win', 1, (c) => c.cat === cat);
    if (won && skill === 'hard' && bots > 0) add('hard');
  }
  const local = (c) => FP.Profile.isLocal(c);
  const counting = () => FP.Game && FP.Game.state === 'play' && !(FP.Net && FP.Net.isClient());
  FP.bus.on('knockOut', (c) => { if (counting() && c && c.lastHitBy && c.lastHitBy !== c && local(c.lastHitBy) && performance.now() - c.lastHitTime < 3000) add('ko'); });
  FP.bus.on('throw', (e) => { if (counting() && e && e.who && e.who.bodies && local(e.by)) add('throw'); });

  // the list for the Challenges screen
  function html() {
    load();
    const list = challenges(st.key);
    const rows = list.map((c, i) => {
      const done = st.done[i], pct = Math.round((st.prog[i] / c.n) * 100);
      return `<div class="wk${done ? ' done' : ''}"><span class="wk-ico">${done ? FP.UI.ICON.check : FP.UI.ICON.starEmpty}</span><span class="wk-txt"><b>${c.text(c.n)}</b><span class="prog"><i style="width:${pct}%"></i></span><small>${st.prog[i]} / ${c.n}</small></span><span class="wk-coin">${FP.UI.ICON.coin} ${REWARD}</span></div>`;
    }).join('');
    const left = daysLeft();
    return `<h2>This week's challenges</h2><div class="wk-list">${rows}</div><p class="small">${st.all ? `${FP.UI.ICON.check} All done this week! New challenges in ${left} day${left > 1 ? 's' : ''}.` : `Finish all 3 for a <b>mystery prize</b> from the Shop! New challenges in ${left} day${left > 1 ? 's' : ''}.`}</p>`;
  }
  function doneCount() { load(); return st.done.filter(Boolean).length; }

  return { html, matchEnded, challenges, weekKey, doneCount, CAT_NAME };
})();
