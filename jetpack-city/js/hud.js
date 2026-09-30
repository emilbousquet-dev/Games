// ============================================================
//  JETPACK CITY — SCREENS AND HUD
//  The score, bolts, power-up timers, the MEGA-BOT meter,
//  pop-up messages and the menus.
// ============================================================
window.JC = window.JC || {};

JC.HUD = (function () {
  const $ = (id) => document.getElementById(id);
  const screens = ['title', 'garage', 'pause', 'over'];
  let popTimer = 0, hintTimer = 0, tauntTimer = 0;
  let last = {};

  function show(name) {
    for (const s of screens) $(s).classList.toggle('show', s === name);
    $('hud').classList.toggle('show', name === 'hud' || name === 'pause');
  }

  // only touch the page when a number really changes (faster on phones)
  function set(id, text) { if (last[id] !== text) { last[id] = text; $(id).textContent = text; } }

  function update(dt, P, closeness) {
    set('hScore', String(Math.floor(P.d) + P.bolts * JC.SETTINGS.boltScore));
    set('hDist', Math.floor(P.d) + ' m');
    set('hBolts', String(P.bolts));
    // MEGA-BOT meter: the robot icon slides toward you when it gets close
    const pct = Math.round(8 + closeness * 72);
    if (last.bot !== pct) { last.bot = pct; $('hBot').style.left = pct + '%'; }
    const dz = Math.round(closeness * 100) / 100;
    if (last.danger !== dz) { last.danger = dz; $('danger').style.opacity = String(Math.max(0, closeness - 0.35) * 1.3); }
    // power-up timers
    const list = [];
    if (P.jetT > 0) list.push(['🚀', 'JET', P.jetT / JC.SETTINGS.jetTime, '#ffa01a']);
    if (P.magnetT > 0) list.push(['🧲', 'MAGNET', P.magnetT / JC.SETTINGS.magnetTime, '#ff3a5a']);
    if (P.shieldT > 0) list.push(['🛡️', 'SHIELD', P.shieldT / JC.SETTINGS.shieldTime, '#3aa8ff']);
    const key = list.map((l) => l[1] + Math.round(l[2] * 40)).join();
    if (last.powers !== key) {
      last.powers = key;
      $('hPowers').innerHTML = list.map(([i, n, f, c]) => `<div class="pw" style="--c:${c}"><i>${i}</i>${n}<div class="bar"><b style="width:${Math.round(f * 100)}%"></b></div></div>`).join('');
    }
    if (popTimer > 0) { popTimer -= dt; if (popTimer <= 0) $('hPop').classList.remove('show'); }
    if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) $('hHint').classList.remove('show'); }
    if (tauntTimer > 0) { tauntTimer -= dt; if (tauntTimer <= 0) $('hTaunt').classList.remove('show'); }
  }

  function pop(text, color = '#ffffff', time = 1.2) {
    const el = $('hPop');
    el.textContent = text; el.style.color = color;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    popTimer = time;
  }
  function hint(text) { $('hHint').textContent = text; $('hHint').classList.add('show'); hintTimer = 3.2; }
  function taunt(text) { $('hTaunt').textContent = text; $('hTaunt').classList.add('show'); tauntTimer = 2; }
  function clearMessages() {
    popTimer = hintTimer = tauntTimer = 0;
    for (const id of ['hPop', 'hHint', 'hTaunt']) $(id).classList.remove('show');
    $('danger').style.opacity = '0';
    last = {};
  }

  function setTitleStats(best, bank) { $('tBest').textContent = best; $('tBank').textContent = bank; $('gBank').textContent = bank; }
  function setSound(on) {
    $('soundBtn').textContent = on ? '🔊' : '🔇';
    $('pSoundBtn').textContent = on ? '🔊 SOUND ON' : '🔇 SOUND OFF';
  }
  function setGfx(fast) { $('gfxBtn').textContent = fast ? '⚡ FAST' : '✨ PRETTY'; }

  function showOver(r) {
    $('oTitle').textContent = r.title;
    $('oScore').textContent = r.score;
    $('oDist').textContent = r.dist + ' m';
    $('oBolts').textContent = '⚡ ' + r.bolts;
    $('oBest').textContent = r.best;
    $('oRecord').hidden = !r.record;
  }

  // the garage shelf: one card for every jetpack or outfit
  function buildShelf(kind, items, save, onPick) {
    const shelf = $('shelf');
    shelf.innerHTML = '';
    const ownedList = save.owned[kind];
    const current = kind === 'jetpacks' ? save.jetpack : save.outfit;
    for (const it of items) {
      const owned = ownedList.includes(it.id);
      const b = document.createElement('button');
      b.className = 'card' + (it.id === current ? ' on' : '') + (owned ? '' : ' locked');
      let bg;
      if (kind === 'jetpacks') bg = it.flame === 'rainbow'
        ? 'conic-gradient(#ff3a3a,#ffd21a,#3aff6a,#3af0ff,#9a5aff,#ff3aa8,#ff3a3a)'
        : `linear-gradient(135deg, ${it.tank} 0 50%, ${it.flame} 50% 100%)`;
      else bg = `linear-gradient(180deg, ${it.helmet} 0 30%, ${it.visor} 30% 42%, ${it.suit} 42% 72%, ${it.pants} 72% 100%)`;
      const price = it.id === current ? '<span class="pr eq">WEARING</span>'
        : owned ? '<span class="pr eq">TAP TO WEAR</span>'
          : `<span class="pr ${save.bank >= it.price ? '' : 'no'}">⚡ ${it.price}</span>`;
      b.innerHTML = `<div class="sw" style="background:${bg}"></div><div class="nm">${it.name}</div>${price}`;
      b.addEventListener('click', () => onPick(it));
      shelf.appendChild(b);
    }
  }
  function garageNote(text) { $('gNote').textContent = text; }

  return { show, update, pop, hint, taunt, clearMessages, setTitleStats, setSound, setGfx, showOver, buildShelf, garageNote };
})();
