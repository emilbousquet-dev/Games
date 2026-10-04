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
  function setDiff(label) { $('diffBtn').textContent = label; }
  function setGfx(fast) { $('gfxBtn').textContent = fast ? '⚡ FAST' : '✨ PRETTY'; }

  function showOver(r) {
    $('oTitle').textContent = r.title;
    $('oScore').textContent = r.score;
    $('oDist').textContent = r.dist + ' m';
    $('oBolts').textContent = '🔩 ' + r.bolts;
    $('oBest').textContent = r.best;
    $('oMode').textContent = r.mode;
    $('oRecord').hidden = !r.record;
    $('oPlanets').textContent = '🪐 ' + r.planets;
  }
  function planet(name) { set('hPlanet', '🪐 ' + name); }
  // a white flash when you go through a warp gate
  function flash() {
    const el = $('flash');
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  }

  // the garage shelf: one card for every Clank paint or Ratchet outfit
  function buildShelf(kind, items, save, onPick) {
    const shelf = $('shelf');
    shelf.innerHTML = '';
    const ownedList = save.owned[kind];
    const current = save[kind];
    for (const it of items) {
      const owned = it.price === 0 || ownedList.includes(it.id);
      const b = document.createElement('button');
      b.className = 'card' + (it.id === current ? ' on' : '') + (owned ? '' : ' locked');
      let bg;
      if (kind === 'clank') bg = it.flame === 'rainbow'
        ? 'conic-gradient(#ff3a3a,#ffd21a,#3aff6a,#3af0ff,#9a5aff,#ff3aa8,#ff3a3a)'
        : `radial-gradient(circle at 34% 45%, ${it.eye} 0 10%, transparent 11%), radial-gradient(circle at 66% 45%, ${it.eye} 0 10%, transparent 11%), linear-gradient(180deg, ${it.metal} 0 70%, ${it.flame} 70% 100%)`;
      else bg = `linear-gradient(180deg, ${it.fur} 0 30%, ${it.stripe} 30% 38%, ${it.top} 38% 62%, ${it.accent} 62% 70%, ${it.pants} 70% 100%)`;
      const price = it.id === current ? '<span class="pr eq">WEARING</span>'
        : owned ? '<span class="pr eq">TAP TO WEAR</span>'
          : `<span class="pr ${save.bank >= it.price ? '' : 'no'}">🔩 ${it.price}</span>`;
      b.innerHTML = `<div class="sw" style="background:${bg}"></div><div class="nm">${it.name}</div>${price}`;
      b.addEventListener('click', () => onPick(it));
      shelf.appendChild(b);
    }
  }
  function garageNote(text) { $('gNote').textContent = text; }

  return { planet, flash, show, update, pop, hint, taunt, clearMessages, setTitleStats, setSound, setGfx, setDiff, showOver, buildShelf, garageNote };
})();
