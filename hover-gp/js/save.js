// ============================================================
//  SIGMA HOVER GP — SAVED PROGRESS
//  Coins, trophies, records, ghosts and unlocked stuff are kept
//  in the browser, so they're still there next time you play.
// ============================================================
window.HG = window.HG || {};

HG.Save = (function () {
  const data = Object.assign({
    coins: 0,            // coins you can see in the garage
    totalCoins: 0,       // all coins ever collected (unlocks parts)
    trophies: {},        // 'cup-cc' -> 1 (gold), 2 (silver), 3 (bronze)
    best: {},            // track id -> best time
    races: 0, wins: 0,
    picks: [
      { charId: 'sigma', parts: { body: 'kart', engine: 'twin', fins: 'standard' }, color: null },
      { charId: 'kisse', parts: { body: 'bike', engine: 'twin', fins: 'standard' }, color: null },
    ],
    name: ['PLAYER 1', 'PLAYER 2'],
  }, HG.store.get('save', {}));

  function save() { HG.store.set('save', data); }

  function anyTrophy() { return Object.keys(data.trophies).length > 0; }
  function goldOn150() { return Object.entries(data.trophies).some(([k, v]) => v === 1 && (k.endsWith('-150') || k.endsWith('-200') || k.endsWith('-mirror'))); }

  // is this character / part unlocked?
  function unlocked(thing) {
    if (!thing) return true;
    if (location.search.includes('unlockall')) return true;
    if (thing.unlock === 'cup') return anyTrophy();
    if (thing.unlock === 'gold') return goldOn150();
    if (thing.cost) return data.totalCoins >= thing.cost;
    return true;
  }
  function lockText(thing) {
    if (thing.unlock === 'cup') return 'Win any cup';
    if (thing.unlock === 'gold') return 'Gold trophy on 150cc';
    if (thing.cost) return 'Collect ' + thing.cost + ' coins (' + data.totalCoins + ')';
    return '';
  }

  // add coins after a race; returns the list of things that just unlocked
  function addCoins(n) {
    const before = allUnlocked();
    data.coins += n; data.totalCoins += n;
    save();
    const after = allUnlocked();
    return after.filter((x) => !before.includes(x));
  }
  function allUnlocked() {
    const list = [];
    for (const c of HG.Chars.LIST) if (unlocked(c)) list.push(c.name);
    for (const p of HG.Vehicles.BODIES.concat(HG.Vehicles.ENGINES, HG.Vehicles.FINS)) if (unlocked(p)) list.push(p.name);
    return list;
  }
  function trophy(cup, cc, place) {
    const key = cup + '-' + cc;
    const before = allUnlocked();
    if (place <= 3 && (!data.trophies[key] || place < data.trophies[key])) data.trophies[key] = place;
    save();
    return allUnlocked().filter((x) => !before.includes(x));
  }
  function record(trackId, time) {
    if (!data.best[trackId] || time < data.best[trackId]) { data.best[trackId] = time; save(); return true; }
    return false;
  }
  // ghosts are big, so they get their own save slot
  function ghost(trackId, g) {
    if (g === undefined) return HG.store.get('ghost-' + trackId, null);
    HG.store.set('ghost-' + trackId, g);
  }

  return { data, save, unlocked, lockText, addCoins, trophy, record, ghost, allUnlocked };
})();
