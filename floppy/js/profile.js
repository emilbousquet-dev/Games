// ============================================================
//  FLOPPY PARTY — PARTY COINS, HAT SHOP AND ACHIEVEMENTS
//  You earn party coins after every mini-game (more for 1st
//  place). Spend them on new hats in the shop. Achievements
//  give bonus coins. Everything is saved on this computer.
// ============================================================
window.FP = window.FP || {};

FP.Profile = (function () {
  const PRICES = { headphones: 100, flowers: 100, wizard: 150, antlers: 150, pirate: 200, viking: 200, halo: 250, astronaut: 300 };
  const PLACE_COINS = [40, 25, 15, 10];
  const ACH_BONUS = 50;
  const ACH = [
    { id: 'first_win', name: 'Winner!', desc: 'Win a mini-game.' },
    { id: 'champion', name: 'Party Champion', desc: 'Win a Party Tour.' },
    { id: 'yeet', name: 'Yeet Master', desc: 'Throw 10 people.', stat: 'throws', goal: 10 },
    { id: 'ko', name: 'Knockout King', desc: 'Knock out 25 characters.', stat: 'kos', goal: 25 },
    { id: 'explorer', name: 'Explorer', desc: 'Play every mini-game.', stat: 'playedCount', goal: 24 },
    { id: 'hard', name: 'Bot Boss', desc: 'Win a game against Hard bots.' },
    { id: 'survivor', name: 'Survivor', desc: 'Be the last survivor in Zombie Tag.' },
    { id: 'sharp', name: 'Sharpshooter', desc: 'Win Dodgeball.' },
    { id: 'racer', name: 'Speedy', desc: 'Win the Obstacle Race.' },
    { id: 'fashion', name: 'Fashionista', desc: 'Buy a hat in the shop.' },
    { id: 'rich', name: 'Rich!', desc: 'Earn 1000 party coins.', stat: 'earned', goal: 1000 },
    { id: 'silly', name: 'So Silly', desc: 'Play a game with 3 fun options on.' },
    { id: 'online', name: 'Party People', desc: 'Play a game in an online party.' },
    { id: 'games50', name: 'Party Animal', desc: 'Play 50 mini-games.', stat: 'games', goal: 50 },
  ];

  let data = { coins: 0, owned: [], stats: { throws: 0, kos: 0, earned: 0, games: 0 }, played: [], ach: [] };
  try { const saved = JSON.parse(localStorage.getItem('floppy-profile') || 'null'); if (saved && typeof saved === 'object') data = Object.assign(data, saved, { stats: Object.assign(data.stats, saved.stats || {}) }); } catch (e) { /* no saving */ }
  function save() { try { localStorage.setItem('floppy-profile', JSON.stringify(data)); } catch (e) { /* no saving */ } }

  const ICON = () => FP.UI.ICON;
  const statValue = (a) => (a.stat === 'playedCount' ? data.played.length : data.stats[a.stat] || 0);
  // "Explorer": play every mini-game (however many there are now)
  function goalOf(a) { return a.id === 'explorer' && FP.Game && FP.Game.MODES ? FP.Game.MODES().length : a.goal; }
  const has = (id) => data.ach.includes(id);

  function earn(n) {
    if (!n) return;
    data.coins += n;
    data.stats.earned += n;
    save();
    check();
  }

  function unlock(id) {
    if (has(id)) return;
    const a = ACH.find((x) => x.id === id);
    if (!a) return;
    data.ach.push(id);
    save();
    FP.UI.toast(`Achievement: ${a.name}! +${ACH_BONUS} coins`, 3.5);
    FP.Audio.play('win');
    earn(ACH_BONUS);
  }

  // achievements that count something (throws, knockouts...) unlock by themselves
  function check() { for (const a of ACH) if (a.goal && !has(a.id) && statValue(a) >= goalOf(a)) unlock(a.id); }

  // is this character played by someone on THIS computer?
  const isLocal = (c) => { const k = c && c.player && c.player.source && c.player.source.kind; return k === 'keys' || k === 'pad'; };
  const counting = () => FP.Game && FP.Game.state === 'play' && !(FP.Net && FP.Net.isClient());

  FP.bus.on('throw', (d) => { if (counting() && d && isLocal(d.by) && d.who && d.who.bodies) { data.stats.throws++; save(); check(); } });
  FP.bus.on('knockOut', (c) => {
    if (!counting() || !c || !c.lastHitBy || c.lastHitBy === c || !isLocal(c.lastHitBy)) return;
    if (performance.now() - c.lastHitTime > 3000) return;
    data.stats.kos++; save(); check();
  });

  // a mini-game ended. places: [[players in 1st], [2nd], [3rd], [everyone else]]. Returns coins per local player id
  function matchEnded({ mode, places, skill, funCount, bots, online, extra = {} }) {
    data.stats.games++;
    if (!data.played.includes(mode.id)) data.played.push(mode.id);
    check();
    const got = {};
    let total = 0;
    places.forEach((group, i) => {
      for (const p of group) {
        const k = p.source && p.source.kind;
        if (k !== 'keys' && k !== 'pad') continue;
        const n = PLACE_COINS[Math.min(i, 3)];
        got[p.id] = n; total += n;
        if (i === 0 && places.length > 1) {
          unlock('first_win');
          if (skill === 'hard' && bots > 0) unlock('hard');
          if (mode.id === 'dodge') unlock('sharp');
          if (mode.id === 'race') unlock('racer');
        }
      }
    });
    if (extra.survivor && ['keys', 'pad'].includes(extra.survivor.source && extra.survivor.source.kind)) unlock('survivor');
    if (funCount >= 3) unlock('silly');
    if (online) unlock('online');
    save();
    earn(total);
    return got;
  }

  // ---------------- the hat shop ----------------
  const owns = (hat) => hat === 'none' || FP.Look.FREE_HATS.includes(hat) || data.owned.includes(hat);
  function buy(hat) {
    const price = PRICES[hat];
    if (!price || owns(hat)) return false;
    if (data.coins < price) { FP.UI.toast(`You need ${price - data.coins} more coins!`); FP.Audio.play('beep'); return false; }
    data.coins -= price;
    data.owned.push(hat);
    save();
    FP.Audio.play('coin'); FP.Audio.play('cheer');
    FP.UI.toast(`You got the ${FP.UI.HAT_NAMES[hat]}! Pick it in the lobby.`, 3);
    unlock('fashion');
    return true;
  }

  // little pictures of each hat on a bean head (drawn once with a small extra renderer)
  let thumbR = null, thumbScene = null, thumbCam = null;
  const thumbs = {};
  function hatThumb(hat) {
    if (thumbs[hat] !== undefined) return thumbs[hat];
    try {
      if (!thumbR) {
        thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        thumbR.setPixelRatio(1); thumbR.setSize(140, 140);
        thumbScene = new THREE.Scene();
        thumbScene.add(new THREE.HemisphereLight(0xffffff, 0x9fc4ff, 1.7));
        const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(2, 3, 4); thumbScene.add(sun);
        thumbCam = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
        thumbCam.position.set(0, 0.45, 2.6); thumbCam.lookAt(0, 0.28, 0);
      }
      const head = FP.Look.makeHead(FP.Look.COLORS[3], FP.Ragdoll.D, hat === 'none' ? null : hat).group;
      head.rotation.y = -0.4;
      thumbScene.add(head);
      thumbR.render(thumbScene, thumbCam);
      thumbs[hat] = thumbR.domElement.toDataURL();
      thumbScene.remove(head);
    } catch (e) { thumbs[hat] = ''; }
    return thumbs[hat];
  }

  function coinLine() { return `<span class="coins">${ICON().coin} <b>${data.coins}</b> party coins</span>`; }

  function shopScreen(back, sel = 0) {
    const hats = FP.Look.SHOP_HATS;
    FP.UI.screen({
      cls: 'shop',
      title: 'Hat Shop',
      html: `<p>${coinLine()}</p><p class="small">Earn coins by playing mini-games (more for winning) and from achievements.</p>`,
      columns: 4,
      start: sel,
      buttons: [
        ...hats.map((h, i) => {
          const own = owns(h), price = PRICES[h];
          const img = hatThumb(h);
          return {
            label: `${img ? `<img src="${img}" alt="">` : ''}<b>${FP.UI.HAT_NAMES[h]}</b><small>${own ? `${ICON().check} Yours!` : `${ICON().coin} ${price}`}</small>`,
            cls: 'hat' + (own ? ' owned' : data.coins >= price ? ' afford' : ''),
            action: () => { if (!own && buy(h)) shopScreen(back, i); else if (own) FP.UI.toast('You have this one! Pick it in the lobby.'); },
          };
        }),
        { label: `${ICON().back} Back`, action: back, small: true, cls: 'wide' },
      ],
      back,
    });
  }

  function achievementsScreen(back) {
    const rows = ACH.map((a) => {
      const done = has(a.id);
      const goal = goalOf(a);
      const prog = a.goal && !done ? `<span class="prog"><i style="width:${Math.min(100, Math.round((statValue(a) / goal) * 100))}%"></i></span><small>${Math.min(statValue(a), goal)} / ${goal}</small>` : '';
      return `<div class="ach${done ? ' done' : ''}"><span class="medal-ico">${done ? ICON().trophy : ICON().starEmpty}</span><span class="txt"><b>${a.name}</b><small>${a.desc}</small>${prog}</span></div>`;
    }).join('');
    FP.UI.screen({
      cls: 'achievements',
      title: 'Achievements',
      html: `<p>${data.ach.length} of ${ACH.length} unlocked &nbsp; ${coinLine()}</p><p class="small">Every achievement gives ${ACH_BONUS} bonus coins.</p><div class="ach-list">${rows}</div>`,
      buttons: [{ label: `${ICON().back} Back`, action: back, small: true }],
      back,
    });
  }

  return { PRICES, ACH, owns, buy, earn, unlock, matchEnded, shopScreen, achievementsScreen, hatThumb, coinLine, get coins() { return data.coins; }, get data() { return data; }, isLocal };
})();
