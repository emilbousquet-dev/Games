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
    { id: 'fashion', name: 'Fashionista', desc: 'Buy something in the shop.' },
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

  // ---------------- the shop ----------------
  // hats use their plain name ("wizard"); everything else has its kind in front ("outfit:tutu", "dance:robot")
  const KINDS = [
    { id: 'hat', tab: 'Hats', list: () => FP.Look.SHOP_HATS, prizes: () => FP.Look.TOUR_HATS, free: () => FP.Look.FREE_HATS, names: () => FP.UI.HAT_NAMES, where: 'Pick it in the lobby.' },
    { id: 'outfit', tab: 'Outfits', list: () => FP.Look.SHOP_OUTFITS, prizes: () => FP.Look.TOUR_OUTFITS, free: () => FP.Look.FREE_OUTFITS, names: () => FP.Look.OUTFIT_NAMES, where: 'Pick it in the lobby.' },
    { id: 'face', tab: 'Face paint', ...styleKind('FACES', 'FREE_FACES'), names: () => FP.Style.FACE_NAMES, where: 'Pick it in the lobby.' },
    { id: 'dance', tab: 'Dances', ...styleKind('DANCES', 'FREE_DANCES'), names: () => FP.Style.DANCE_NAMES, where: 'Win a game to show it off!' },
    { id: 'trail', tab: 'Trails', ...styleKind('TRAILS', 'FREE_TRAILS'), names: () => FP.Style.TRAIL_NAMES, where: 'Pick it in the lobby.' },
  ];
  // face paint, dances and trails: the shop sells the ones that aren't free and aren't World Tour prizes
  function styleKind(all, free) {
    return {
      list: () => FP.Style[all].filter((f) => !FP.Style[free].includes(f) && !FP.Style.TOUR_ONLY.includes(f)),
      prizes: () => FP.Style[all].filter((f) => FP.Style.TOUR_ONLY.includes(f)),
      free: () => FP.Style[free],
    };
  }
  Object.assign(PRICES, {
    'outfit:hoodie': 120, 'outfit:jersey': 120, 'outfit:tutu': 150, 'outfit:tuxedo': 200, 'outfit:hero': 200, 'outfit:spacesuit': 250,
    'face:whiskers': 80, 'face:stars': 80, 'face:tiger': 100, 'face:clown': 100, 'face:shades': 120,
    'dance:spin': 120, 'dance:robot': 150, 'dance:floss': 150, 'dance:chicken': 150, 'dance:flip': 200,
    'trail:bubbles': 150, 'trail:sparkles': 200, 'trail:hearts': 200, 'trail:rainbow': 300, 'trail:fire': 300,
  });
  const splitId = (id) => { const k = String(id).indexOf(':'); return k < 0 ? ['hat', id] : [id.slice(0, k), id.slice(k + 1)]; };
  const kindOf = (kid) => KINDS.find((k) => k.id === kid);
  function owns(id, name) {
    // owns('wizard'), owns('outfit:tutu') or owns('outfit', 'tutu')
    const [kid, item] = name !== undefined ? [id, name] : splitId(id);
    const kind = kindOf(kid);
    if (!kind || item === 'none' || item == null) return true;
    if (kind.free().includes(item)) return true;
    return data.owned.includes(kid === 'hat' ? item : kid + ':' + item);
  }
  // a World Tour prize: yours for free
  function grant(id) {
    if (owns(id)) return false;
    data.owned.push(id);
    save();
    return true;
  }
  function itemName(id) { const [kid, item] = splitId(id); const kind = kindOf(kid); return (kind && kind.names()[item]) || item; }
  function buy(id) {
    const price = PRICES[id];
    if (!price || owns(id)) return false;
    if (data.coins < price) { FP.UI.toast(`You need ${price - data.coins} more coins!`); FP.Audio.play('beep'); return false; }
    data.coins -= price;
    data.owned.push(id);
    save();
    FP.Audio.play('coin'); FP.Audio.play('cheer');
    FP.UI.toast(`You got ${itemName(id)}! ${kindOf(splitId(id)[0]).where}`, 3);
    unlock('fashion');
    return true;
  }

  // little pictures of each thing on a bean (drawn once with a small extra renderer)
  let thumbR = null, thumbScene = null, thumbCam = null;
  const thumbs = {};
  function snap(key, build, camY = 0.28, dist = 2.6) {
    if (thumbs[key] !== undefined) return thumbs[key];
    try {
      if (!thumbR) {
        thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
        thumbR.setPixelRatio(1); thumbR.setSize(140, 140);
        thumbScene = new THREE.Scene();
        thumbScene.add(new THREE.HemisphereLight(0xffffff, 0x9fc4ff, 1.7));
        const sun = new THREE.DirectionalLight(0xffffff, 1.8); sun.position.set(2, 3, 4); thumbScene.add(sun);
        thumbCam = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
      }
      thumbCam.position.set(0, camY + 0.17, dist); thumbCam.lookAt(0, camY, 0);
      const obj = build();
      thumbScene.add(obj);
      thumbR.render(thumbScene, thumbCam);
      thumbs[key] = thumbR.domElement.toDataURL();
      thumbScene.remove(obj);
    } catch (e) { thumbs[key] = ''; }
    return thumbs[key];
  }
  const hatThumb = (hat) => snap('hat:' + hat, () => {
    const head = FP.Look.makeHead(FP.Look.COLORS[3], FP.Ragdoll.D, hat === 'none' ? null : hat).group;
    head.rotation.y = -0.4;
    return head;
  });
  const outfitThumb = (o) => snap('outfit:' + o, () => {
    const g = FP.Look.makeTorso(FP.Look.COLORS[3], FP.Ragdoll.D, o);
    g.rotation.y = -0.6;
    return g;
  }, 0.0, 2.9);
  const faceThumb = (f) => snap('face:' + f, () => {
    const h = FP.Look.makeHead(FP.Look.COLORS[3], FP.Ragdoll.D, null);
    FP.Style.applyFace({ meshes: { head: h.group }, face: { r: h.r } }, f);
    h.group.rotation.y = -0.25;
    return h.group;
  }, 0.0, 1.75);
  // dances and trails get simple drawings
  const DANCE_ART = {
    robot: '<rect x="15" y="4" width="10" height="9" rx="2"/><rect x="13" y="14" width="14" height="13" rx="3"/><path d="M13 16H6v8M27 16h7V8M17 27v9M23 27v9" fill="none" stroke-width="3.2"/>',
    flip: '<circle cx="20" cy="31" r="5"/><path d="M20 26V13M20 20l-8-6M20 20l8-6M20 13l-6-8M20 13l6-8" fill="none" stroke-width="3.2"/><path d="M6 24a14 14 0 0 1 28 0" fill="none" stroke-width="2.2" stroke-dasharray="3 3"/>',
    spin: '<circle cx="20" cy="8" r="5"/><path d="M20 13v13M20 17l-11 2M20 17l11-2M20 26l-6 10M20 26l6 10" fill="none" stroke-width="3.2"/><path d="M5 30a15 6 0 0 0 30 0" fill="none" stroke-width="2.2"/>',
    floss: '<circle cx="20" cy="7" r="5"/><path d="M20 12v14M20 16l-10 8M20 16l-6 10M20 26l-5 10M20 26l5 10" fill="none" stroke-width="3.2"/>',
    chicken: '<circle cx="20" cy="7" r="5"/><path d="M20 12v14M20 16l-7 2 3 4M20 16l7 2-3 4M20 26l-7 10M20 26l7 10" fill="none" stroke-width="3.2"/><path d="M18 3l2-3 2 3" fill="#ff3a4a" stroke-width="1"/>',
  };
  const danceThumb = (d) => `<svg class="art" viewBox="0 0 40 40" fill="#7bd05a" stroke="#2a2140" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${DANCE_ART[d] || ''}</svg>`;
  function trailThumb(t) {
    const dots = [];
    for (let k = 0; k < 6; k++) {
      const x = 6 + k * 5.5, y = 30 - k * 4 + (k % 2) * 3, s = 1.5 + k * 0.6;
      if (t === 'sparkles') dots.push(`<path d="M${x} ${y - s * 1.6}l${s * 0.5} ${s * 1.1} ${s * 1.1} ${s * 0.5} -${s * 1.1} ${s * 0.5} -${s * 0.5} ${s * 1.1} -${s * 0.5} -${s * 1.1} -${s * 1.1} -${s * 0.5} ${s * 1.1} -${s * 0.5}z" fill="#ffcf33"/>`);
      else if (t === 'hearts') dots.push(`<path d="M${x} ${y + s}l-${s} -${s}a${s * 0.6} ${s * 0.6} 0 0 1 ${s} -${s * 0.9}a${s * 0.6} ${s * 0.6} 0 0 1 ${s} ${s * 0.9}z" fill="#ff5a9a"/>`);
      else if (t === 'bubbles') dots.push(`<circle cx="${x}" cy="${y}" r="${s}" fill="#dff3ff" stroke="#6ab8e8" stroke-width="1"/>`);
      else if (t === 'rainbow') dots.push(`<circle cx="${x}" cy="${y}" r="${s}" fill="hsl(${k * 55},90%,60%)"/>`);
      else if (t === 'fire') dots.push(`<circle cx="${x}" cy="${y}" r="${s}" fill="${k % 2 ? '#ffcf33' : '#ff5a1a'}"/>`);
    }
    return `<svg class="art" viewBox="0 0 40 40"><circle cx="34" cy="7" r="5" fill="#ff9ad0" stroke="#2a2140" stroke-width="1.6"/>${dots.join('')}</svg>`;
  }
  function thumbFor(kid, item) {
    if (kid === 'hat') { const s = hatThumb(item); return s ? `<img src="${s}" alt="">` : ''; }
    if (kid === 'outfit') { const s = outfitThumb(item); return s ? `<img src="${s}" alt="">` : ''; }
    if (kid === 'face') { const s = faceThumb(item); return s ? `<img src="${s}" alt="">` : ''; }
    if (kid === 'dance') return danceThumb(item);
    return trailThumb(item);
  }

  function coinLine() { return `<span class="coins">${ICON().coin} <b>${data.coins}</b> party coins</span>`; }

  let shopTab = 0;
  function shopScreen(back, sel, tab = shopTab) {
    shopTab = tab;
    const kind = KINDS[tab];
    const items = kind.list();
    const tabs = KINDS.map((k, i) => ({
      label: k.tab, small: true, cls: 'tab' + (i === tab ? ' cur' : ''),
      action: () => shopScreen(back, i, i),
    }));
    const T = tabs.length;
    const goods = items.map((it, i) => {
      const id = kind.id === 'hat' ? it : kind.id + ':' + it;
      const own = owns(id), price = PRICES[id];
      return {
        label: `${thumbFor(kind.id, it)}<b>${kind.names()[it]}</b><small>${own ? `${ICON().check} Yours!` : `${ICON().coin} ${price}`}</small>`,
        cls: 'hat' + (own ? ' owned' : data.coins >= price ? ' afford' : ''),
        action: () => { if (!own && buy(id)) shopScreen(back, T + i, tab); else if (own) FP.UI.toast(`You have this one! ${kind.where}`); },
      };
    });
    for (const it of kind.prizes()) {
      const id = kind.id === 'hat' ? it : kind.id + ':' + it;
      const own = owns(id);
      goods.push({
        label: `${thumbFor(kind.id, it)}<b>${kind.names()[it]}</b><small>${own ? `${ICON().check} Yours!` : `${ICON().trophy} World Tour prize`}</small>`,
        cls: 'hat prize' + (own ? ' owned' : ''),
        action: () => FP.UI.toast(own ? `You have this one! ${kind.where}` : 'Win it in Story Mode: the Floppy World Tour!', 2.5),
      });
    }
    const last = T + goods.length; // the Back button
    FP.UI.screen({
      cls: 'shop',
      title: 'Shop',
      html: `<p>${coinLine()}</p><p class="small">Earn coins by playing mini-games (more for winning) and from achievements. Hats, outfits, face paint and trails show up in the lobby. Your dance plays when you win!</p>`,
      columns: 4,
      start: sel === undefined ? tab : sel,
      // the tab row has 5 buttons, the rows below have 4: move up and down by hand so it feels right
      onKey: (code) => {
        const s = FP.UI.selected();
        if (code === 'down' && s < T) { FP.UI.select(T + Math.min(s, 3, goods.length - 1)); return true; }
        if (code === 'up' && s >= T && s < T + 4) { FP.UI.select(tab); return true; }
        if (code === 'up' && s === last) { FP.UI.select(T + Math.max(0, goods.length - 1)); return true; }
        if (code === 'down' && s >= T && s < last && s + 4 >= last) { FP.UI.select(last); return true; }
        return false;
      },
      buttons: [...tabs, ...goods, { label: `${ICON().back} Back`, action: back, small: true, cls: 'wide' }],
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

  return { PRICES, ACH, KINDS, owns, buy, grant, itemName, earn, unlock, matchEnded, shopScreen, achievementsScreen, hatThumb, coinLine, get coins() { return data.coins; }, get data() { return data; }, isLocal };
})();
