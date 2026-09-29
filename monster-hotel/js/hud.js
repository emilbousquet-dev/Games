// ============================================================
//  MONSTER HOTEL — THE HUD (everything drawn on top of the game)
// ============================================================
window.MH = window.MH || {};

MH.HUD = (function () {
  const U = MH.U, T = MH.Tex;
  const $ = (id) => document.getElementById(id);
  const H = {};
  let mapBase = null, mapScale = 6;

  H.init = function () {
    H.el = {
      hud: $('hud'), stars: $('stars-fill'), ratingNum: $('rating-num'), night: $('night-num'), clock: $('clock'), clockBar: $('clock-bar'),
      tasks: $('tasks'), prompt: $('prompt'), holding: $('holding'), power: $('power'), powerName: $('power-name'), powerRing: $('power-ring'), powerKey: $('power-key'),
      reviews: $('reviews'), speech: $('speech'), center: $('center-msg'), tip: $('tip'), minimap: $('minimap'), guests: $('guest-count'), progress: $('progress'), progressFill: $('progress-fill'),
      vignette: $('vignette'), flash: $('screen-flash'), sand: $('sand-tint'),
    };
    H.mapCtx = H.el.minimap.getContext('2d');
  };

  // ---------- stars ----------
  H.setRating = function (r) {
    H.el.stars.style.width = (U.clamp(r, 0, 5) / 5 * 100) + '%';
    H.el.ratingNum.textContent = r.toFixed(1);
    H.el.ratingNum.style.color = r >= 4 ? '#8aff7a' : r >= 3 ? '#ffe68a' : r >= 2 ? '#ffae5a' : '#ff5a5a';
  };
  H.pulseRating = function (up) {
    const s = $('rating');
    s.classList.remove('pulse-up', 'pulse-down'); void s.offsetWidth;
    s.classList.add(up ? 'pulse-up' : 'pulse-down');
  };
  H.setClock = function (night, hours) {
    H.el.night.textContent = night;
    H.el.clock.textContent = U.clockText(hours);
    H.el.clockBar.style.width = (U.clamp(hours / 10, 0, 1) * 100) + '%';
  };

  // ---------- task list ----------
  let lastTasksKey = '';
  H.setTasks = function (tasks) {
    const key = tasks.map((t) => [t.icon, t.title, t.sub, Math.round(t.bar * 20), t.hot].join('~')).join('|');
    if (key === lastTasksKey) return;
    lastTasksKey = key;
    H.el.tasks.innerHTML = tasks.slice(0, 7).map((t) => `
      <div class="task ${t.hot ? 'hot' : ''} ${t.kind || ''}">
        <img src="${T.iconURL(t.icon)}">
        <div class="task-text"><b>${t.title}</b><span>${t.sub}</span>
        ${t.bar >= 0 ? `<div class="bar"><i style="width:${Math.round(t.bar * 100)}%;background:${T.moodColor(t.bar * 100)}"></i></div>` : ''}</div>
      </div>`).join('') + (tasks.length > 7 ? `<div class="task more">+ ${tasks.length - 7} more...</div>` : '')
      + (tasks.length === 0 ? '<div class="task calm"><img src="' + T.iconURL('sparkle') + '"><div class="task-text"><b>All good!</b><span>Everyone is happy right now.</span></div></div>' : '');
  };

  // ---------- prompt & holding ----------
  H.setPrompt = function (text, progress) {
    H.el.prompt.style.display = text ? 'block' : 'none';
    if (text) H.el.prompt.innerHTML = text;
    H.el.progress.style.display = progress > 0 ? 'block' : 'none';
    H.el.progressFill.style.width = (progress * 100) + '%';
  };
  let lastHold = '';
  H.setHolding = function (carry, cap) {
    const key = carry.join(',') + cap;
    if (key === lastHold) return;
    lastHold = key;
    if (!carry.length) { H.el.holding.innerHTML = ''; H.el.holding.style.display = 'none'; return; }
    H.el.holding.style.display = 'flex';
    H.el.holding.innerHTML = carry.map((k) => `<div class="hold-item"><img src="${T.iconURL(k)}"><span>${MH.ITEMS[k].name}</span></div>`).join('') + '<small>G = drop</small>';
  };

  // ---------- power ----------
  H.setPower = function (name, cd, max, active) {
    H.el.powerName.textContent = name;
    const f = max > 0 ? 1 - cd / max : 1;
    H.el.powerRing.style.background = `conic-gradient(${active ? '#8aff7a' : f >= 1 ? '#ffd23a' : '#7a6a9a'} ${f * 360}deg, rgba(255,255,255,0.08) 0deg)`;
    H.el.power.classList.toggle('ready', f >= 1 && !active);
    H.el.power.classList.toggle('active', !!active);
    H.el.powerKey.textContent = active ? 'ON!' : f >= 1 ? 'SPACE' : Math.ceil(cd) + 's';
  };

  // ---------- reviews ----------
  H.review = function (name, kind, stars, text) {
    const d = document.createElement('div');
    d.className = 'review ' + (stars >= 4 ? 'good' : stars <= 2 ? 'bad' : '');
    d.innerHTML = `<div class="rv-stars">${'★'.repeat(stars)}<span>${'★'.repeat(5 - stars)}</span></div>
      <div class="rv-text">"${text}"</div><div class="rv-name">— ${name}, ${kind}</div>`;
    H.el.reviews.prepend(d);
    setTimeout(() => d.classList.add('show'), 20);
    setTimeout(() => { d.classList.remove('show'); setTimeout(() => d.remove(), 600); }, 5500);
    while (H.el.reviews.children.length > 3) H.el.reviews.lastChild.remove();
  };

  // ---------- speech subtitles ----------
  H.say = function (name, text, color) {
    const d = document.createElement('div');
    d.className = 'line';
    d.innerHTML = `<b style="color:${color || '#ffd8a0'}">${name}:</b> ${text}`;
    H.el.speech.appendChild(d);
    setTimeout(() => d.classList.add('fade'), 3800);
    setTimeout(() => d.remove(), 4600);
    while (H.el.speech.children.length > 3) H.el.speech.firstChild.remove();
  };

  // ---------- big messages & tips ----------
  let centerTimer = null;
  H.center = function (html, time = 2.5, cls = '') {
    const c = H.el.center;
    c.className = 'show ' + cls;
    c.innerHTML = html;
    clearTimeout(centerTimer);
    centerTimer = setTimeout(() => { c.className = cls; }, time * 1000);
  };
  let tipTimer = null;
  H.tip = function (html, time = 7) {
    const t = H.el.tip;
    t.innerHTML = html;
    t.classList.add('show');
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => t.classList.remove('show'), time * 1000);
  };
  H.flash = function (color = 'white', dur = 0.3) {
    const f = H.el.flash;
    f.style.transition = 'none'; f.style.background = color; f.style.opacity = 0.8;
    void f.offsetWidth;
    f.style.transition = `opacity ${dur}s`; f.style.opacity = 0;
  };
  H.setStress = function (v) { H.el.vignette.style.opacity = U.clamp(v, 0, 1) * 0.8; };
  H.setSand = function (on) { H.el.sand.style.opacity = on ? 1 : 0; };

  // ---------- minimap ----------
  const MAPCOL = { lobby: '#4b3a63', hall: '#6a2a3a', room: '#3a2a55', kitchen: '#2a5a4a', supply: '#4a4030', door: '#5a4a5a', arch: '#5a4a5a' };
  function buildMapBase() {
    const W = MH.World;
    const c = U.canvas(W.COLS * mapScale, W.ROWS * mapScale, (g) => {
      g.fillStyle = '#120a18'; g.fillRect(0, 0, W.COLS * mapScale, W.ROWS * mapScale);
      for (let r = 0; r < W.ROWS; r++) for (let q = 0; q < W.COLS; q++) {
        const ch = W.at(q, r);
        const z = W.zoneAt(W.cx(q), W.cx(r));
        if (MAPCOL[z]) { g.fillStyle = MAPCOL[z]; g.fillRect(q * mapScale, r * mapScale, mapScale, mapScale); }
        if ('FXAgpcft'.includes(ch)) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(q * mapScale + 1, r * mapScale + 1, mapScale - 2, mapScale - 2); }
      }
      g.font = 'bold 9px Fredoka, sans-serif'; g.textAlign = 'center'; g.fillStyle = 'rgba(255,255,255,0.55)';
      if (W.lobby) g.fillText('LOBBY', (W.lobby.x0 + W.lobby.x1) / 2 / MH.CELL * mapScale, (W.lobby.z1 / MH.CELL - 1.2) * mapScale);
      if (W.kitchen) g.fillText('KITCHEN', W.kitchen.x / MH.CELL * mapScale, (W.kitchen.z / MH.CELL + 1.3) * mapScale);
      if (W.supply) g.fillText('SUPPLIES', W.supply.x / MH.CELL * mapScale, (W.supply.z / MH.CELL + 1.8) * mapScale);
    });
    return c;
  }
  H.drawMap = function (t, player, guests, humans) {
    const W = MH.World;
    if (!mapBase) {
      mapBase = buildMapBase();
      H.el.minimap.width = mapBase.width; H.el.minimap.height = mapBase.height;
    }
    const g = H.mapCtx;
    const s = mapScale / MH.CELL;
    g.drawImage(mapBase, 0, 0);
    // rooms colored by status
    for (const R of W.rooms) {
      g.fillStyle = R.status === 'free' ? 'rgba(80,255,110,0.18)' : R.status === 'dirty' ? 'rgba(255,160,40,0.35)' : 'rgba(255,60,90,0.18)';
      g.fillRect(R.x0 * s, R.z0 * s, (R.x1 - R.x0) * s, (R.z1 - R.z0) * s);
      if (R.window && R.window.target > 0 && Math.sin(t * 8) > 0) { g.fillStyle = '#8ab0ff'; g.fillRect(R.window.mid.x * s - 4, R.window.mid.z * s - 3, 8, 6); }
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = 'bold 10px Fredoka, sans-serif'; g.textAlign = 'center';
      g.fillText(R.num, R.center.x * s, R.center.z * s + 4);
    }
    // stations
    for (const st of W.stations) { g.fillStyle = MH.ITEMS[st.kind].color; g.beginPath(); g.arc(st.x * s, st.z * s, 2.5, 0, 7); g.fill(); }
    // guests
    for (const q of guests) {
      const hasReq = q.request || q.state === 'queue';
      g.fillStyle = T.moodColor(q.happy);
      g.beginPath(); g.arc(q.x * s, q.z * s, hasReq ? 3.5 + Math.sin(t * 8) : 2.5, 0, 7); g.fill();
      if (hasReq) { g.strokeStyle = '#fff'; g.lineWidth = 1.2; g.stroke(); }
    }
    for (const h of humans) {
      g.fillStyle = Math.sin(t * 10) > 0 ? '#ff2a2a' : '#fff';
      g.beginPath(); g.arc(h.x * s, h.z * s, 4, 0, 7); g.fill();
    }
    // you
    g.save(); g.translate(player.x * s, player.z * s); g.rotate(-player.yaw + Math.PI);
    g.fillStyle = '#ffe14a'; g.strokeStyle = '#1d0f24'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, 7); g.lineTo(5, -5); g.lineTo(0, -2); g.lineTo(-5, -5); g.closePath(); g.fill(); g.stroke();
    g.restore();
  };

  H.show = function (on) { H.el.hud.style.display = on ? 'block' : 'none'; };
  return H;
})();
