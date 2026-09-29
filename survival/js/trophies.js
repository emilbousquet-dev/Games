// ============================================================
//  DEAD ACRES — TROPHIES 🏆
//  Little awards for doing cool things. Add your own!
//  "stat" is what we count, "need" is how many you need.
// ============================================================
window.DA = window.DA || {};

DA.TROPHIES = [
  { id: 'firstblood', name: 'First Zombie', desc: 'Defeat your first zombie', stat: 'kills', need: 1 },
  { id: 'hunter', name: 'Zombie Hunter', desc: 'Defeat 25 zombies', stat: 'kills', need: 25 },
  { id: 'legend', name: 'Legend of Maple Creek', desc: 'Defeat 100 zombies', stat: 'kills', need: 100 },
  { id: 'headshot', name: 'Bullseye', desc: 'Hit 10 zombies in the head', stat: 'headshots', need: 10 },
  { id: 'lumberjack', name: 'Lumberjack', desc: 'Chop down 10 trees', stat: 'trees', need: 10 },
  { id: 'miner', name: 'Rock Smasher', desc: 'Break 10 rocks', stat: 'rocks', need: 10 },
  { id: 'crafter', name: 'Crafty', desc: 'Craft 15 things', stat: 'crafted', need: 15 },
  { id: 'builder', name: 'Builder', desc: 'Build 20 pieces', stat: 'built', need: 20 },
  { id: 'boom', name: 'Kaboom!', desc: 'Defeat 3 zombies with one firecracker', stat: 'bestBoom', need: 3 },
  { id: 'dog', name: 'Best Friends', desc: 'Make friends with a dog', stat: 'dogs', need: 1 },
  { id: 'crate', name: 'Special Delivery', desc: 'Open a supply crate', stat: 'crates', need: 1 },
  { id: 'night', name: 'Night Owl', desc: 'Survive a night', stat: 'nights', need: 1 },
  { id: 'week', name: 'One Week Later', desc: 'Survive 7 nights', stat: 'nights', need: 7 },
  { id: 'boss', name: 'Boss Slayer', desc: 'Help defeat a Horde Boss', stat: 'bosses', need: 1 },
  { id: 'level5', name: 'Level 5', desc: 'Reach level 5', stat: 'level', need: 5 },
  { id: 'level10', name: 'Level 10', desc: 'Reach level 10', stat: 'level', need: 10 },
];

DA.Trophies = (function () {
  const T = {
    stats: {},        // counters
    got: {},          // trophy id -> true
    add(stat, n = 1) { T.stats[stat] = (T.stats[stat] || 0) + n; T.check(); },
    max(stat, v) { if (v > (T.stats[stat] || 0)) { T.stats[stat] = v; T.check(); } },
    check() {
      for (const t of DA.TROPHIES) {
        if (T.got[t.id] || (T.stats[t.stat] || 0) < t.need) continue;
        T.got[t.id] = true;
        DA.HUD.trophy(t);
        DA.Audio.levelUp();
      }
    },
    load(rec) { T.stats = Object.assign({}, rec && rec.stats); T.got = Object.assign({}, rec && rec.trophies); },
    // the list for the pause menu
    html() {
      const n = DA.TROPHIES.filter((t) => T.got[t.id]).length;
      return `<div class="trophyHead">🏆 TROPHIES ${n} / ${DA.TROPHIES.length}</div>` + DA.TROPHIES.map((t) => {
        const have = T.got[t.id], v = Math.min(t.need, T.stats[t.stat] || 0);
        return `<div class="trophy ${have ? 'got' : ''}"><b>${have ? '🏆' : '🔒'} ${DA.U.esc(t.name)}</b><span>${DA.U.esc(t.desc)}${have ? '' : ` (${v}/${t.need})`}</span></div>`;
      }).join('');
    },
  };
  return T;
})();
