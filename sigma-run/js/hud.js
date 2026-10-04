// ============================================================
//  SIGMA RUN — HUD (the numbers and icons on the screen)
// ============================================================
window.SR = window.SR || {};

SR.HUD = (function () {
  const $ = (id) => document.getElementById(id);
  const last = {};
  let hintTimer = 0, bigQueue = [], bigBusy = 0;
  const changed = (k, v) => { if (last[k] === v) return false; last[k] = v; return true; };

  function show(v) { $('hud').classList.toggle('show', v); }
  function aura(n) { const s = SR.U.fmt(n); if (changed('aura', s)) $('hAura').textContent = s; }
  function mult(m) {
    if (!changed('mult', m)) return;
    const el = $('hMult');
    el.textContent = m > 1 ? 'x' + m : '';
    el.style.transform = 'scale(1.6)'; setTimeout(() => { el.style.transform = ''; }, 120);
  }
  function dist(d) { const s = Math.floor(d) + ' m'; if (changed('dist', s)) $('hDist').textContent = s; }
  function coins(c) { const s = SR.U.fmt(c); if (changed('coins', s)) $('hCoins').textContent = s; }
  function hearts(n, max) {
    if (!changed('hearts', n + '/' + max)) return;
    let h = '';
    for (let i = 0; i < max; i++) h += `<span class="${i < n ? '' : 'lost'}">❤️</span>`;
    $('hHearts').innerHTML = h;
  }
  function wanted(level) {
    if (!changed('wanted', level)) return;
    const el = $('hStars');
    [...el.children].forEach((s, i) => s.classList.toggle('on', i < level));
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }
  function heli(info) {
    const k = info ? (info.crash ? 0 : info.hp) : -1;
    if (!changed('heli', k)) return;
    $('hHeli').classList.toggle('show', k > 0);
    [...$('hHeli').querySelectorAll('b')].forEach((b, i) => b.classList.toggle('gone', i >= k));
  }
  function sigma(frac, ready, active) {
    const pct = Math.round(frac * 100);
    if (changed('sig', pct)) $('hSigma').style.height = pct + '%';
    if (changed('sigR', ready && !active)) $('hSigmaReady').classList.toggle('show', ready && !active);
    if (changed('sigA', active)) $('hSigmaFrame').classList.toggle('show', active);
    if (changed('sigTxt', SR.Input.touch)) $('hSigmaReady').textContent = SR.Input.touch ? 'TAP SIGMA!' : 'PRESS E: SIGMA MODE';
  }
  function feed(text, pts) {
    const el = document.createElement('div');
    el.innerHTML = text + (pts ? `<em>+${pts}</em>` : '');
    const f = $('hFeed');
    f.appendChild(el);
    while (f.children.length > 5) f.removeChild(f.firstChild);
    setTimeout(() => el.remove(), 1650);
  }
  function big(text, sub, color) {
    bigQueue.push({ text, sub, color });
    if (bigQueue.length > 3) bigQueue.shift();
  }
  function hint(text, sec = 4) {
    const el = $('hHint');
    el.textContent = text; el.classList.add('show');
    hintTimer = sec;
  }
  function warn(on) { if (changed('warn', on)) $('hWarn').classList.toggle('show', on); }
  function powers(list) {
    const key = list.map((p) => p.type + Math.round(p.frac * 40) + (p.n || '')).join('|');
    if (!changed('pw', key)) return;
    const html = list.map((p) => {
      const col = '#' + new THREE.Color(SR.Pickups.TYPES[p.type].color).getHexString();
      const c = 2 * Math.PI * 34, off = c * (1 - p.frac);
      return `<div class="pw"><img src="${iconURL(p.type)}"><svg viewBox="0 0 74 74"><circle cx="37" cy="37" r="34" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="5"/>
        <circle cx="37" cy="37" r="34" fill="none" stroke="${col}" stroke-width="5" stroke-dasharray="${c}" stroke-dashoffset="${off}" stroke-linecap="round"/></svg>${p.n ? `<div class="n">x${p.n}</div>` : ''}</div>`;
    }).join('');
    $('hPowers').innerHTML = html;
  }
  const iconCache = {};
  function iconURL(type) {
    if (!iconCache[type]) iconCache[type] = SR.Pickups.icons[type].image.toDataURL();
    return iconCache[type];
  }
  function lock(p) {
    const el = $('hLock');
    if (!p) { if (changed('lock', false)) el.classList.remove('show'); return; }
    if (changed('lock', true)) el.classList.add('show');
    el.style.left = p.x + 'px'; el.style.top = p.y + 'px';
  }
  function hurt(a) { const v = Math.round(a * 20) / 20; if (changed('hurt', v)) $('hHurt').style.opacity = v; }
  function touchButtons(rockets, sigmaReady) {
    if (changed('tbF', rockets)) document.getElementById('tFire').classList.toggle('dim', !rockets);
    if (changed('tbS', sigmaReady)) document.getElementById('tSigma').classList.toggle('dim', !sigmaReady);
  }
  function clickToPlay(v) { if (changed('click', v)) $('hClick').style.display = v ? 'block' : 'none'; }

  function update(dt) {
    if (hintTimer > 0) { hintTimer -= dt; if (hintTimer <= 0) $('hHint').classList.remove('show'); }
    bigBusy -= dt;
    if (bigBusy <= 0 && bigQueue.length) {
      const b = bigQueue.shift();
      const el = $('hBig');
      el.innerHTML = b.text + (b.sub ? `<small>${b.sub}</small>` : '');
      el.style.color = b.color || '#fff';
      el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
      bigBusy = 1.25;
    }
  }
  function reset() {
    for (const k in last) delete last[k];
    $('hFeed').innerHTML = ''; $('hHint').classList.remove('show'); bigQueue = []; bigBusy = 0;
    $('hBig').classList.remove('go'); hintTimer = 0;
  }

  return { show, aura, mult, dist, coins, hearts, wanted, heli, sigma, feed, big, hint, warn, powers, lock, hurt, clickToPlay, touchButtons, update, reset };
})();
