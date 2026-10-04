// ============================================================
//  DRAGON LIFE — WHAT YOU SEE ON THE SCREEN
//  Bars, the hotbar, messages, the map, and all the menus
//  (bag, journal, cooking, shop, talking to people).
// ============================================================
window.DL = window.DL || {};

DL.Hud = (function () {
  const U = DL.U;
  const $ = (id) => document.getElementById(id);
  const It = () => DL.Items, Dr = () => DL.Dragon, W = () => DL.World;
  const H = {};
  let mapImg = null, mini, miniG, bigmap, bigG;

  function init() {
    mini = $('minimap'); miniG = mini.getContext('2d');
    bigmap = $('bigmap'); bigG = bigmap.getContext('2d');
    mapImg = W().mapCanvas(512);
    $('panel').addEventListener('mousedown', (e) => { if (e.target === $('panel')) closePanel(); });
    $('panel').querySelector('.x').onclick = () => closePanel();
    $('dialog').addEventListener('mousedown', () => nextLine());
    buildHotbar();
  }

  // ---------------- hotbar and counters ----------------
  function buildHotbar() {
    const hb = $('hotbar');
    hb.innerHTML = '';
    It().TOOLS.forEach((t, i) => {
      const d = document.createElement('div');
      d.className = 'slot';
      d.innerHTML = `<span class="k">${i + 1}</span><span class="i">${t.icon}</span><span class="n"></span>`;
      d.onmousedown = (e) => { e.stopPropagation(); DL.Game.selectSlot(i); };
      hb.appendChild(d);
    });
  }
  H.refresh = () => {
    const hb = $('hotbar');
    if (!hb.children.length) return;
    const tools = It().TOOLS;
    for (let i = 0; i < tools.length; i++) {
      const s = hb.children[i];
      s.classList.toggle('on', i === It().slot);
      const n = s.querySelector('.n'), ic = s.querySelector('.i');
      if (tools[i].id === 'food') {
        const f = It().foodSel;
        ic.textContent = It().has(f) ? It().ITEMS[f].icon : '🍽️';
        n.textContent = It().has(f) ? It().count(f) : '';
      } else n.textContent = '';
    }
    $('toolName').textContent = tools[It().slot].name + (tools[It().slot].id === 'food' && It().has(It().foodSel) ? ': ' + It().ITEMS[It().foodSel].name : '');
    $('toolTip').textContent = tools[It().slot].tip;
    const show = ['wood', 'stone', 'berries', 'fish', 'crystal', 'seeds'];
    $('res').innerHTML = show.filter(k => It().has(k) || k === 'wood' || k === 'stone').map(k => `<span>${It().ITEMS[k].icon} ${It().count(k)}</span>`).join('') + `<span>🪙 ${It().coins}</span>`;
  };

  // ---------------- every frame ----------------
  let lastWhere = '';
  H.update = (dt) => {
    const D = Dr();
    $('foodBar').style.width = It().food + '%';
    $('foodBar').parentNode.classList.toggle('low', It().food < 20);
    const hatched = D.hatched();
    $('dragonBox').style.display = hatched ? 'block' : 'none';
    if (hatched) {
      $('dName').textContent = D.name;
      $('dStage').textContent = { baby: '🐣 Baby', young: '🐉 Young', adult: '🐲 Grown-up' }[D.stage] + (D.sleeping ? ' 💤' : '');
      $('dHunger').style.width = D.hunger + '%';
      $('dHappy').style.width = D.happy + '%';
      $('dGrow').style.width = (D.growth / D.ADULT_AT * 100) + '%';
      $('dHunger').parentNode.classList.toggle('low', D.hunger < 20);
      $('dHappy').parentNode.classList.toggle('low', D.happy < 20);
      $('dGrowRow').style.display = D.stage === 'adult' ? 'none' : 'flex';
      $('dStamRow').style.display = D.mode === 'ride' ? 'flex' : 'none';
      $('dStam').style.width = (D.stamina * 100) + '%';
    }
    // clock
    const tod = W().tod, h = Math.floor(tod * 24), m = Math.floor((tod * 24 - h) * 60 / 10) * 10;
    $('clock').textContent = `${W().night > 0.5 ? '🌙' : '☀️'} Day ${W().day} · ${h}:${m < 10 ? '0' + m : m}`;
    drawMini();
    questArrow();
    // fading messages
    for (const el of [$('toast'), $('big')]) {
      if (el._t > 0) { el._t -= dt; if (el._t <= 0) el.classList.remove('show'); }
    }
    if (!$('toast').classList.contains('show') && toastQ.length) showToast(toastQ.shift());
  };
  H.where = (name) => { if (name !== lastWhere) { lastWhere = name; $('where').textContent = '📍 ' + name; } };

  // ---------------- messages ----------------
  const toastQ = [];
  function showToast(text) { const t = $('toast'); t.textContent = text; t.classList.add('show'); t._t = 3.6; }
  H.toast = (text) => {
    const t = $('toast');
    if (t.classList.contains('show') && t.textContent === text) { t._t = 3.6; return; }
    if (toastQ.includes(text)) return;
    if (t.classList.contains('show')) { toastQ.push(text); if (toastQ.length > 3) toastQ.shift(); t._t = Math.min(t._t, 1.2); }
    else showToast(text);
  };
  H.big = (title, sub, dur = 3) => {
    const b = $('big');
    b.querySelector('h1').textContent = title;
    b.querySelector('p').textContent = sub || '';
    b.classList.add('show');
    b._t = dur;
  };
  H.pickup = (icon, text) => {
    const box = $('pickups');
    const d = document.createElement('div');
    d.className = 'pick';
    d.textContent = icon + ' ' + text;
    box.appendChild(d);
    setTimeout(() => d.classList.add('out'), 1800);
    setTimeout(() => d.remove(), 2400);
    while (box.children.length > 5) box.firstChild.remove();
  };
  H.prompt = (text) => {
    const p = $('prompt');
    if (text) { p.innerHTML = text; p.classList.add('show'); } else p.classList.remove('show');
  };

  // ---------------- quest tip ----------------
  let curQuest = null;
  H.quest = (Q) => {
    curQuest = Q;
    $('qTitle').textContent = '📜 ' + Q.title;
    $('qHint').textContent = Q.hint;
    $('quest').style.display = DL.settings.tips ? 'block' : 'none';
  };
  H.questDone = (Q) => {
    H.big('✨ NEW GOAL', Q.title, 3.5);
  };
  function questArrow() {
    const a = $('qArrow');
    const tgt = curQuest && curQuest.target ? curQuest.target() : null;
    if (!tgt || !DL.settings.tips) { a.style.display = 'none'; return; }
    const p = DL.Player;
    const dx = tgt.x - p.pos.x, dz = tgt.z - p.pos.z, d = Math.hypot(dx, dz);
    if (d < 6) { a.style.display = 'none'; return; }
    a.style.display = 'inline-flex';
    const rel = U.angleDiff(p.camYaw, Math.atan2(dx, dz));
    a.querySelector('i').style.transform = `rotate(${-rel}rad)`;
    a.querySelector('b').textContent = d > 1000 ? (d / 1000).toFixed(1) + ' km' : Math.round(d) + ' m';
  }

  // ---------------- minimap ----------------
  const M = () => W().MAP;
  function toMap(x, z, size) { return [(x - M().x0) / M().span * size, (z - M().z0) / M().span * size]; }
  function drawMini() {
    const p = DL.Player;
    const g = miniG, S = mini.width;
    const span = p.riding ? 600 : 260;      // meters shown
    const k = 512 / M().span;
    const [mx, mz] = toMap(p.pos.x, p.pos.z, 512);
    const src = span * k;
    g.save();
    g.fillStyle = '#1a5a7a'; g.fillRect(0, 0, S, S);
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.clip();
    g.imageSmoothingEnabled = true;
    // north (minus z) is up... but we turn the map so where you look is up
    g.translate(S / 2, S / 2);
    g.rotate(p.camYaw + Math.PI);
    g.drawImage(mapImg, mx - src / 2, mz - src / 2, src, src, -S / 2, -S / 2, S, S);
    const dot = (x, z, color, r) => {
      const [ax, az] = toMap(x, z, 512);
      const sx = (ax - mx) / src * S, sz = (az - mz) / src * S;
      if (Math.hypot(sx, sz) > S / 2 - 6) return;
      g.fillStyle = color; g.beginPath(); g.arc(sx, sz, r, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
    };
    const D = Dr();
    if (D.hatched() && D.mode !== 'ride') dot(D.pos.x, D.pos.z, '#3ad070', 5);
    const t = curQuest && curQuest.target ? curQuest.target() : null;
    if (t && DL.settings.tips) dot(t.x, t.z, '#ffd23a', 5);
    for (const b of DL.Build.pieces) if (b.id === 'bed' || b.id === 'nest') dot(b.x, b.z, '#c87a3a', 3);
    g.restore();
    // you (an arrow in the middle, always pointing up)
    g.save(); g.translate(S / 2, S / 2);
    g.rotate(U.angleDiff(p.camYaw, p.riding ? D.yaw : p.yaw) * -1);
    g.fillStyle = '#ff5a3a'; g.strokeStyle = '#fff'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.stroke();
    // N for north
    g.fillStyle = '#fff'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('N', S / 2 - Math.sin(p.camYaw) * (S / 2 - 12), S / 2 + Math.cos(p.camYaw) * (S / 2 - 12));
  }

  // ---------------- big map ----------------
  H.showMap = (on) => {
    $('mapScreen').classList.toggle('show', on);
    if (!on) return;
    const S = Math.min(window.innerWidth, window.innerHeight) * 0.82;
    bigmap.width = bigmap.height = Math.floor(S);
    const g = bigG;
    g.drawImage(mapImg, 0, 0, S, S);
    g.fillStyle = 'rgba(0,0,0,0)';
    const fl = DL.Story.flags;
    g.textAlign = 'center'; g.font = `bold ${Math.round(S / 40)}px Trebuchet MS, sans-serif`;
    for (const I of W().ISLANDS) {
      const [x, z] = toMap(I.x, I.z - I.r * 0.75, S);
      const known = fl['isl_' + I.id] || I.id === 'home';
      g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,0.6)';
      g.strokeText(known ? I.name : '???', x, z); g.fillStyle = '#fff'; g.fillText(known ? I.name : '???', x, z);
    }
    const mark = (wx, wz, color, label, r = 7) => {
      const [x, z] = toMap(wx, wz, S);
      g.fillStyle = color; g.beginPath(); g.arc(x, z, r, 0, 7); g.fill(); g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
      if (label) { g.font = `bold ${Math.round(S / 55)}px sans-serif`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,0.6)'; g.strokeText(label, x, z - r - 6); g.fillStyle = '#fff'; g.fillText(label, x, z - r - 6); }
    };
    for (const b of DL.Build.pieces) if (b.id === 'bed') mark(b.x, b.z, '#c87a3a', '🛏️', 5);
    const t = curQuest && curQuest.target ? curQuest.target() : null;
    if (t) mark(t.x, t.z, '#ffd23a', '⭐ ' + curQuest.title);
    const D = Dr();
    if (D.hatched()) mark(D.pos.x, D.pos.z, '#3ad070', D.name);
    const p = DL.Player;
    mark(p.pos.x, p.pos.z, '#ff5a3a', 'You');
  };

  // ---------------- the fishing game ----------------
  H.fishGame = (on, F) => {
    const el = $('fishgame');
    el.classList.toggle('show', on);
    if (!on) return;
    const z = el.querySelector('.zone');
    z.style.left = (F.zone[0] * 100) + '%'; z.style.width = ((F.zone[1] - F.zone[0]) * 100) + '%';
    el.querySelector('.needle').style.left = (F.needle * 100) + '%';
    el.querySelector('.fishIcon').textContent = It().ITEMS[F.catch].icon;
  };

  // ---------------- build bar ----------------
  H.buildBar = (on) => {
    $('buildbar').classList.toggle('show', on);
    $('buildinfo').classList.toggle('show', on);
    $('hotbar').style.display = on ? 'none' : 'flex';
    $('toolLabel').style.display = on ? 'none' : 'block';
    if (!on) return;
    const B = DL.Build;
    $('buildbar').innerHTML = B.PIECES.map((p, i) => {
      const ok = It().hasAll(p.cost);
      return `<div class="bslot ${i === B.sel ? 'on' : ''} ${ok ? '' : 'no'}" data-i="${i}"><span class="k">${i < 10 ? (i + 1) % 10 : ''}</span><span class="i">${p.icon}</span></div>`;
    }).join('');
    $('buildbar').querySelectorAll('.bslot').forEach(el => el.onmousedown = (e) => { e.stopPropagation(); B.select(+el.dataset.i); });
  };
  let lastInfo = '';
  H.buildInfo = (def, why) => {
    const s = `<b>${def.icon} ${def.name}</b> <span class="cost">${It().needText(def.cost)}</span><br><small>${def.tip}</small>` +
      (why ? `<div class="why">❌ ${why}</div>` : '<div class="okk">✅ Click to build</div>') +
      '<small class="keys">Mouse wheel / 1-0: choose · R: turn · X or right click: remove · B: done</small>';
    if (s !== lastInfo) { $('buildinfo').innerHTML = s; lastInfo = s; }
  };

  // ---------------- talking ----------------
  let dlg = null;
  H.dialog = (who, lines, onDone) => {
    dlg = { who, lines: lines.slice(), onDone, i: 0 };
    $('dialog').querySelector('.who').textContent = who;
    showLine();
    $('dialog').classList.add('show');
    DL.Audio.play('open');
  };
  function showLine() { $('dialog').querySelector('.text').textContent = dlg.lines[dlg.i]; }
  function nextLine() {
    if (!dlg) return;
    dlg.i++;
    DL.Audio.play('ui');
    if (dlg.i >= dlg.lines.length) {
      const cb = dlg.onDone; dlg = null;
      $('dialog').classList.remove('show');
      if (cb) cb();
    } else showLine();
  }
  H.nextLine = nextLine;
  H.talking = () => !!dlg;

  // ---------------- panels (menus) ----------------
  let pan = null;
  H.panel = (title, build, bind) => {
    pan = { build, bind };
    $('panel').querySelector('h2').textContent = title;
    H.repaintPanel();
    $('panel').classList.add('show');
    DL.Audio.play('open');
  };
  H.repaintPanel = () => {
    if (!pan) return;
    const body = $('panel').querySelector('.body');
    body.innerHTML = pan.build();
    if (pan.bind) pan.bind(body);
  };
  function closePanel(force) {
    if (!pan) return;
    if ($('panel').classList.contains('noclose') && force !== true) return;
    pan = null;
    $('panel').classList.remove('show');
    DL.Audio.play('ui');
    H.refresh();
  }
  H.closePanel = closePanel;
  H.panelOpen = () => !!pan;

  // ---------------- naming the dragon ----------------
  H.nameDragon = (colors, cb) => {
    let color = colors[0];
    const names = ['Ember', 'Spark', 'Pebble', 'Mochi', 'Blaze', 'Sky', 'Nugget', 'Storm', 'Bean', 'Comet'];
    H.panel('🐣 Your dragon hatched!', () => {
      const sw = colors.map(c => `<button class="swatch ${c === color ? 'on' : ''}" data-c="${c}" style="background:#${new THREE.Color(DL.Models.DRAGON_COLORS[c].main).getHexString()}" title="${c}"></button>`).join('');
      return `<p class="sub">What color is your baby dragon?</p><div class="swatches">${sw}</div>
        <p class="sub">What is its name?</p>
        <input id="dragonName" maxlength="14" value="${document.getElementById('dragonName') ? document.getElementById('dragonName').value : ''}" placeholder="Type a name...">
        <div class="names">${names.map(n => `<button data-n="${n}">${n}</button>`).join('')}</div>
        <button class="go" id="nameOk">💚 That's my dragon!</button>`;
    }, (el) => {
      const inp = el.querySelector('#dragonName');
      el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { color = b.dataset.c; const v = inp.value; H.repaintPanel(); $('dragonName').value = v; Dr().color = color; Dr().setLook(); });
      el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { inp.value = b.dataset.n; });
      const ok = () => {
        const name = (inp.value || '').trim() || U.pick(names);
        closePanel(true);
        cb(name.charAt(0).toUpperCase() + name.slice(1), color);
      };
      el.querySelector('#nameOk').onclick = ok;
      inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); e.stopPropagation(); };
      setTimeout(() => inp.focus(), 50);
    });
    $('panel').classList.add('noclose');
    const done = cb;
    cb = (n, c) => { $('panel').classList.remove('noclose'); done(n, c); };
  };

  // ---------------- the bag ----------------
  H.openBag = () => {
    H.panel('🎒 Your bag', () => {
      const inv = It().inv;
      let h = `<div class="coinsBig">🪙 ${It().coins} coins</div><div class="items">`;
      const keys = Object.keys(inv).filter(k => inv[k] > 0);
      if (!keys.length) h += '<p class="sub">Your bag is empty.</p>';
      for (const k of keys) {
        const it = It().ITEMS[k];
        const food = it.food ? `<button data-eat="${k}">Eat</button>` : '';
        h += `<div class="item"><span class="big">${it.icon}</span><b>${it.name}</b><span class="cnt">×${inv[k]}</span>${food}</div>`;
      }
      h += '</div>';
      const D = Dr();
      if (D.hatched()) {
        h += `<h3>🐉 ${D.name}</h3><p class="sub">Paint</p><div class="swatches">` +
          D.colors.map(c => `<button class="swatch ${c === D.color ? 'on' : ''}" data-c="${c}" style="background:#${new THREE.Color(DL.Models.DRAGON_COLORS[c].main).getHexString()}" title="${c}"></button>`).join('') + '</div>';
        if (D.stage !== 'baby') h += '<p class="sub">Saddle</p><div class="names">' + ['none'].concat(D.saddles).map(s => `<button data-s="${s}" class="${s === D.saddle ? 'on' : ''}">${s === 'none' ? 'No saddle' : s.charAt(0).toUpperCase() + s.slice(1)}</button>`).join('') + '</div>';
        h += `<p class="sub">Food ${Math.round(D.hunger)}% · Happy ${Math.round(D.happy)}% · ${D.stage === 'adult' ? 'All grown up!' : 'Growing: ' + Math.round(D.growth / D.ADULT_AT * 100) + '%'}</p>`;
      }
      return h;
    }, (el) => {
      el.querySelectorAll('[data-eat]').forEach(b => b.onclick = () => { It().eat(b.dataset.eat); H.repaintPanel(); });
      el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { Dr().color = b.dataset.c; Dr().setLook(); DL.Audio.play('pick'); H.repaintPanel(); });
      el.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { Dr().saddle = b.dataset.s; Dr().setLook(); DL.Audio.play('place'); H.repaintPanel(); });
    });
  };

  // ---------------- the journal ----------------
  H.openJournal = () => {
    H.panel('📖 Journal', () => {
      const S = DL.Story;
      let h = '<div class="journal">';
      S.QUESTS.forEach((Q, i) => {
        if (i < S.q) h += `<div class="q done">✅ ${Q.title}</div>`;
        else if (i === S.q) h += `<div class="q now">⭐ <b>${Q.title}</b><br><small>${Q.hint}</small></div>`;
        else if (i === S.q + 1) h += '<div class="q later">❔ ...</div>';
      });
      const isl = W().ISLANDS.filter(I => S.flags['isl_' + I.id] || I.id === 'home').length;
      h += `</div><p class="sub">💰 Treasure chests found: <b>${S.chestsFound()} of 6</b> · 🏝️ Islands visited: <b>${isl} of 6</b></p>`;
      h += `<label class="opt"><input type="checkbox" id="tipsBox" ${DL.settings.tips ? 'checked' : ''}> Show the goal at the top of the screen</label>`;
      return h;
    }, (el) => {
      el.querySelector('#tipsBox').onchange = (e) => { DL.settings.tips = e.target.checked; DL.saveSettings(); H.quest(DL.Story.quest); };
    });
  };

  H.openHelp = () => {
    H.panel('❓ How to play', () => `
      <table class="keys">
        <tr><td>W A S D</td><td>Walk</td></tr>
        <tr><td>Mouse</td><td>Look around (click the game to grab the mouse)</td></tr>
        <tr><td>Shift</td><td>Run (or fly fast)</td></tr>
        <tr><td>Space</td><td>Jump (or fly up)</td></tr>
        <tr><td>C / Ctrl</td><td>Fly down</td></tr>
        <tr><td>E</td><td>Use: talk, pet your dragon, pick berries, open chests</td></tr>
        <tr><td>Click</td><td>Use your tool (chop, mine, fish, eat, throw) · breathe FIRE when flying</td></tr>
        <tr><td>1 - 6</td><td>Choose a tool · Q: choose a food</td></tr>
        <tr><td>F</td><td>Ride your dragon / land / call your dragon</td></tr>
        <tr><td>G</td><td>Whistle: your dragon comes to you</td></tr>
        <tr><td>B</td><td>Build mode</td></tr>
        <tr><td>I</td><td>Bag (and paint your dragon)</td></tr>
        <tr><td>J</td><td>Journal (your goals)</td></tr>
        <tr><td>M</td><td>Map</td></tr>
        <tr><td>Mouse wheel</td><td>Zoom the camera</td></tr>
        <tr><td>Esc</td><td>Pause</td></tr>
      </table>`);
  };

  H.init = init;
  return H;
})();
