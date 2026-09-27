// ============================================================
//  ATLANTIS DIVER — THE SHOP, UPGRADES AND SAVING
// ============================================================
AT.Shop = (function () {
  const U = AT.U;
  // Every upgrade: what each level gives you, and what it costs.
  const UP = {
    air: { name: 'Air Tank', levels: [45, 70, 100, 140, 190], cost: [0, 150, 450, 1200, 3000], desc: (v) => `${v} seconds of air` },
    suit: { name: 'Diving Suit', levels: [70, 170, 310, 460, 620], cost: [0, 250, 900, 2600, 5500], desc: (v) => `Safe down to ${v} m` },
    fins: { name: 'Flippers', levels: [1, 1.18, 1.36, 1.55], cost: [0, 120, 500, 1400], desc: (v) => `Swim speed ${Math.round(v * 100)}%` },
    bag: { name: 'Treasure Bag', levels: [4, 6, 9, 13, 18], cost: [0, 100, 400, 1100, 2800], desc: (v) => `Carry ${v} treasures` },
    lamp: { name: 'Head Lamp', levels: [170, 250, 340, 450], cost: [0, 200, 800, 2000], desc: (v) => `Lights up ${Math.round(v / 12)} m ahead` },
    harpoon: {
      name: 'Stun Harpoon', cost: [0, 180, 700, 1800],
      levels: [{ stun: 1.6, reload: 0.9 }, { stun: 3, reload: 0.7 }, { stun: 4.5, reload: 0.55 }, { stun: 6.5, reload: 0.4 }],
      desc: (v) => `Stuns creatures for ${v.stun} s`,
    },
    sonar: { name: 'Treasure Sonar', levels: [0, 700, 1100, 1700], cost: [0, 300, 1000, 2400], desc: (v) => (v ? `Finds treasure ${Math.round(v / 12)} m away` : 'Not installed') },
  };
  const ORDER = ['air', 'suit', 'fins', 'bag', 'lamp', 'harpoon', 'sonar'];

  // ---------- saving ----------
  const KEY = 'atlantis.save.v1';
  const fresh = () => ({ gold: 0, up: { air: 0, suit: 0, fins: 0, bag: 0, lamp: 0, harpoon: 0, sonar: 0 }, taken: [], tablets: [], journal: [], broken: [], explored: '', dives: 0, trident: false, time: 0, earned: 0 });
  let S = fresh();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) S = Object.assign(fresh(), JSON.parse(raw));
    } catch (e) { S = fresh(); }
    // test helpers: ?gold=5000 and ?max
    if (AT.params.get && AT.params.get('gold')) S.gold = +AT.params.get('gold');
    if (AT.params.has && AT.params.has('max')) for (const k of ORDER) S.up[k] = UP[k].levels.length - 1;
    return S;
  }
  function save() {
    try {
      S.explored = AT.World.exploredString();
      localStorage.setItem(KEY, JSON.stringify(S));
    } catch (e) { /* private mode: no saving */ }
  }
  function wipe() { S = fresh(); try { localStorage.removeItem(KEY); } catch (e) { /* */ } }
  const hasSave = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } };

  const val = (k) => UP[k].levels[S.up[k]];
  const maxed = (k) => S.up[k] >= UP[k].levels.length - 1;
  const price = (k) => UP[k].cost[S.up[k] + 1];

  function buy(k) {
    if (maxed(k) || S.gold < price(k)) { AT.Audio.nope(); return false; }
    S.gold -= price(k); S.up[k]++;
    AT.Audio.buy();
    if (k === 'air') AT.Diver.D.air = val('air');
    save();
    return true;
  }

  // ---------- the shop screen ----------
  let el, cards = [], focus = 0;
  function build() {
    el = document.getElementById('shop');
    const grid = el.querySelector('.cards');
    grid.innerHTML = '';
    cards = ORDER.map((k, i) => {
      const card = document.createElement('button');
      card.className = 'card';
      card.appendChild(AT.Art.icon(k === 'air' ? 'air' : k, 72));
      const info = document.createElement('div'); info.className = 'info';
      card.appendChild(info);
      card.addEventListener('click', () => { focus = i; buy(k); refresh(); });
      card.addEventListener('mouseenter', () => { focus = i; refresh(); });
      grid.appendChild(card);
      return { k, card, info };
    });
    el.querySelector('.close').addEventListener('click', () => AT.Game.closePanel());
  }
  function refresh() {
    el.querySelector('.gold b').textContent = U.fmt(S.gold);
    cards.forEach(({ k, card, info }, i) => {
      const u = UP[k], lv = S.up[k], max = u.levels.length - 1;
      const pips = Array.from({ length: max + 1 }, (_, j) => `<i class="${j <= lv ? 'on' : ''}"></i>`).join('');
      const next = maxed(k) ? '<span class="maxed">MAX LEVEL</span>' : `<span class="next">Next: ${u.desc(u.levels[lv + 1])}</span>`;
      const cost = maxed(k) ? '' : `<span class="cost ${S.gold >= price(k) ? '' : 'poor'}">🪙 ${U.fmt(price(k))}</span>`;
      info.innerHTML = `<h3>${u.name}</h3><div class="pips">${pips}</div><p>${u.desc(u.levels[lv])}</p>${next}${cost}`;
      card.classList.toggle('focus', i === focus);
      card.classList.toggle('can', !maxed(k) && S.gold >= price(k));
    });
  }
  function open() { if (!el) build(); refresh(); el.classList.add('show'); }
  function close() { if (el) el.classList.remove('show'); }
  function input(s) {
    const cols = window.innerWidth > 900 ? 4 : window.innerWidth > 600 ? 3 : 2;
    if (s.navX) { focus = U.clamp(focus + s.navX, 0, ORDER.length - 1); refresh(); AT.Audio.tick(); }
    if (s.navY) { focus = U.clamp(focus + s.navY * cols, 0, ORDER.length - 1); refresh(); AT.Audio.tick(); }
    if (s.useP) { buy(ORDER[focus]); refresh(); }
  }

  return { UP, ORDER, load, save, wipe, hasSave, val, buy, maxed, price, open, close, input, refresh, get S() { return S; } };
})();
