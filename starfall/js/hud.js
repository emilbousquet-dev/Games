// ============================================================
//  STARFALL — WHAT YOU SEE ON THE SCREEN
//  hearts, energy, map, messages, dialog boxes, shop...
// ============================================================
window.SF = window.SF || {};

SF.HUD = (function () {
  const U = SF.U, L = SF.Layout;
  const $ = (id) => document.getElementById(id);
  let els = {};
  let lastHearts = '', toastT = 0, zoneT = 0, bannerT = 0, bossTitleT = 0;
  let dialog = null, modal = null;
  let mapOpen = false, fogCanvas, fogCtx, mini, miniCtx, big, bigCtx;
  const FOG = 64;

  function init() {
    els = {
      hud: $('hud'), hearts: $('hearts'), energy: $('energy'), energyFill: $('energyFill'), shards: $('shards'), powers: $('powers'),
      obj: $('objective'), zone: $('zone'), toast: $('toast'), prompt: $('prompt'), cross: $('crosshair'), hurt: $('hurt'),
      dialog: $('dialog'), dName: $('dName'), dText: $('dText'), banner: $('banner'), bTitle: $('bTitle'), bSub: $('bSub'),
      bossbar: $('bossbar'), bossName: $('bossName'), bossFill: $('bossFill'), bossTitle: $('bossTitle'),
      timer: $('timer'), modal: $('modal'), map: $('map'), mapInfo: $('mapInfo'), help: $('help'), friend: $('friend'),
      credits: $('credits'), fade: $('fade'), net: $('netStatus'),
    };
    mini = $('minimap'); miniCtx = mini.getContext('2d');
    big = $('bigmap'); bigCtx = big.getContext('2d');
    fogCanvas = U.canvas(FOG, FOG, () => {});
    fogCtx = fogCanvas.getContext('2d');
  }

  // ---------- map fog (the parts of the island you haven't seen yet) ----------
  function fogData() {
    const me = SF.State.me;
    if (!me.fog || me.fog.length !== FOG * FOG) me.fog = new Array(FOG * FOG).fill(0);
    return me.fog;
  }
  function reveal(x, z, r) {
    const f = fogData();
    const cs = 640 / FOG;
    const ci = Math.floor((x + 320) / cs), cj = Math.floor((z + 320) / cs), cr = Math.ceil(r / cs);
    let changed = false;
    for (let j = cj - cr; j <= cj + cr; j++) for (let i = ci - cr; i <= ci + cr; i++) {
      if (i < 0 || j < 0 || i >= FOG || j >= FOG) continue;
      if (Math.hypot(i - ci, j - cj) > cr) continue;
      if (!f[j * FOG + i]) { f[j * FOG + i] = 1; changed = true; }
    }
    if (changed) redrawFog();
  }
  function redrawFog() {
    const f = fogData();
    const img = fogCtx.createImageData(FOG, FOG);
    for (let k = 0; k < FOG * FOG; k++) { img.data[k * 4] = 20; img.data[k * 4 + 1] = 16; img.data[k * 4 + 2] = 40; img.data[k * 4 + 3] = f[k] ? 0 : 255; }
    fogCtx.putImageData(img, 0, 0);
  }

  // ---------- small messages ----------
  function toast(text, color = 0xffffff, secs = 3.5) {
    els.toast.textContent = text;
    els.toast.style.color = '#' + new THREE.Color(color).getHexString();
    els.toast.classList.add('show');
    toastT = secs;
  }
  function zone(name) {
    els.zone.textContent = name;
    els.zone.classList.add('show');
    zoneT = 3.5;
  }
  function itemBanner(title, sub) {
    els.bTitle.textContent = title; els.bSub.textContent = sub;
    els.banner.classList.add('show');
    bannerT = 3;
  }
  function bossTitle(name) {
    els.bossTitle.textContent = name;
    els.bossTitle.classList.add('show');
    bossTitleT = 3;
  }
  function hurtFlash() {
    els.hurt.style.transition = 'none'; els.hurt.style.opacity = 0.7;
    requestAnimationFrame(() => { els.hurt.style.transition = 'opacity 0.6s'; els.hurt.style.opacity = 0; });
  }
  function timer(t, label) {
    if (t === null) { els.timer.style.display = 'none'; return; }
    els.timer.style.display = 'block';
    els.timer.innerHTML = `⏱ ${Math.max(0, t).toFixed(1)}<small>${label || ''}</small>`;
    els.timer.style.color = t < 5 ? '#ff6060' : '#ffffff';
  }
  function help(show) { els.help.classList.toggle('show', show); if (show) setTimeout(() => els.help.classList.remove('show'), 14000); }
  function bossBar(e) {
    if (!e) { els.bossbar.style.display = 'none'; return; }
    els.bossbar.style.display = 'block';
    els.bossName.textContent = SF.Creatures.TYPES[e.type].name;
    els.bossFill.style.width = U.clamp(e.hp / e.maxHp, 0, 1) * 100 + '%';
  }

  // ---------- dialog boxes ----------
  function openDialog(lines, done) {
    dialog = { lines, i: 0, shown: 0, done };
    els.dialog.style.display = 'block';
    SF.Game.player && (SF.Game.player.frozen = true);
    showLine();
  }
  function showLine() {
    const l = dialog.lines[dialog.i];
    els.dName.textContent = l.who;
    els.dName.style.color = l.color || '#fff';
    dialog.shown = 0; dialog.t = 0;
    els.dText.textContent = '';
  }
  function updateDialog(dt, inp) {
    if (!dialog) return false;
    const l = dialog.lines[dialog.i];
    if (dialog.shown < l.text.length) {
      dialog.t += dt;
      const n = Math.min(l.text.length, Math.floor(dialog.t * 45));
      if (n > dialog.shown) {
        if (Math.floor(n / 3) > Math.floor(dialog.shown / 3) && l.who !== SF.Game.myName()) SF.Audio.chirp(l.who === 'ZIB' ? 1.2 : 0.9);
        dialog.shown = n;
        els.dText.textContent = l.text.slice(0, n);
      }
    }
    if (inp.ok || inp.attackPressed || inp.usePressed) {
      if (dialog.shown < l.text.length) { dialog.shown = l.text.length; els.dText.textContent = l.text; }
      else {
        dialog.i++;
        SF.Audio.sfx('ui');
        if (dialog.i >= dialog.lines.length) {
          const d = dialog; dialog = null;
          els.dialog.style.display = 'none';
          if (SF.Game.player) SF.Game.player.frozen = false;
          if (d.done) d.done();
        } else showLine();
      }
    }
    return true;
  }

  // ---------- menus (shop, fast travel) ----------
  function openModal(m) {
    modal = m; m.sel = 0;
    els.modal.style.display = 'block';
    SF.Game.player.frozen = true;
    renderModal();
  }
  function closeModal() {
    const m = modal;
    modal = null;
    els.modal.style.display = 'none';
    if (mapOpen) toggleMap(false);
    if (SF.Game.player) SF.Game.player.frozen = false;
    if (m && m.onClose) m.onClose();
  }
  function renderModal() {
    const m = modal;
    els.modal.innerHTML = `<h2>${m.title}</h2>` + (m.sub ? `<p class="sub">${m.sub()}</p>` : '') +
      m.items().map((it, i) => `<div class="mi ${i === m.sel ? 'sel' : ''} ${it.off ? 'off' : ''}" data-i="${i}"><b>${it.name}</b><span>${it.right || ''}</span><small>${it.text || ''}</small></div>`).join('') +
      `<p class="keys">↑ ↓ choose · E select · ESC close</p>`;
    els.modal.querySelectorAll('.mi').forEach((d) => {
      d.onmouseenter = () => { m.sel = +d.dataset.i; renderModal(); };
      d.onclick = () => { m.sel = +d.dataset.i; m.pick(m.items()[m.sel]); if (modal) renderModal(); };
    });
  }
  function updateModal(inp) {
    if (!modal) return false;
    const n = modal.items().length;
    if (inp.up) { modal.sel = (modal.sel + n - 1) % n; SF.Audio.sfx('ui'); renderModal(); }
    if (inp.down) { modal.sel = (modal.sel + 1) % n; SF.Audio.sfx('ui'); renderModal(); }
    if (inp.ok) { modal.pick(modal.items()[modal.sel]); if (modal) renderModal(); }
    if (inp.back || inp.pausePressed) { SF.Audio.sfx('ui'); closeModal(); }
    return true;
  }
  function openShop() {
    SF.Input.unlock();
    openModal({
      title: '🛒 MO\'S SHOP',
      sub: () => `You have <b class="gold">✦ ${SF.State.me.shards}</b> star shards`,
      items: () => L.shop.map((it) => {
        const lv = SF.Story.shopLevel(it.id), sold = lv >= it.max;
        return { ...it, right: sold ? 'SOLD OUT' : '✦ ' + it.price, text: it.text + `  (${lv}/${it.max})`, off: sold || SF.State.me.shards < it.price };
      }).concat([{ id: 'bye', name: 'Bye bye!', right: '', text: '' }]),
      pick: (it) => { if (it.id === 'bye') { closeModal(); return; } SF.Story.buy(it); },
      onClose: () => SF.Game.relock(),
    });
  }
  function openTravel() {
    SF.Input.unlock();
    toggleMap(true);
    openModal({
      title: '✨ FAST TRAVEL',
      sub: () => 'Your game was saved. Where do you want to go?',
      items: () => SF.World.beacons.filter((b) => SF.State.world.beacons[b.i]).map((b) => ({ name: b.name, b, text: '', right: '' })).concat([{ name: 'Stay here', stay: true }]),
      pick: (it) => {
        if (it.stay) { closeModal(); return; }
        closeModal();
        SF.Game.fade(() => { SF.Game.player.place(it.b.x + 2.5, it.b.z + 2.5); SF.Game.player.camInit = false; SF.Audio.sfx('portal'); });
      },
      onClose: () => SF.Game.relock(),
    });
  }

  // ---------- the big map ----------
  function toggleMap(v) {
    mapOpen = v === undefined ? !mapOpen : v;
    els.map.style.display = mapOpen ? 'flex' : 'none';
    if (mapOpen) drawBigMap();
  }
  const ICON = (g, x, y, c, s, shape = 'dot') => {
    g.fillStyle = c; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath();
    if (shape === 'dot') g.arc(x, y, s, 0, 7);
    else if (shape === 'dia') { g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y); g.closePath(); }
    else if (shape === 'sq') g.rect(x - s, y - s, s * 2, s * 2);
    else if (shape === 'tri') { g.moveTo(x, y - s * 1.3); g.lineTo(x + s, y + s); g.lineTo(x - s, y + s); g.closePath(); }
    g.fill(); g.stroke();
  };
  function arrow(g, x, y, ang, color, s = 7) {
    g.save(); g.translate(x, y); g.rotate(-ang + Math.PI);
    g.fillStyle = color; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -s * 1.4); g.lineTo(s, s); g.lineTo(0, s * 0.4); g.lineTo(-s, s); g.closePath();
    g.fill(); g.stroke(); g.restore();
  }
  function drawMarkers(g, toX, toY, scale, full) {
    const w = SF.State.world, f = fogData();
    const seen = (x, z) => { const cs = 640 / FOG; const i = Math.floor((x + 320) / cs), j = Math.floor((z + 320) / cs); return f[j * FOG + i]; };
    SF.World.temples.forEach((t, i) => { if (seen(t.x, t.z) || full) ICON(g, toX(t.x), toY(t.z), w.rewards[i] ? '#7a7a7a' : '#' + new THREE.Color(SF.Models.TEMPLE_COLORS[i].glow).getHexString(), 7 * scale, 'sq'); });
    SF.World.towers.forEach((t, i) => { if (seen(t.x, t.z)) ICON(g, toX(t.x), toY(t.z), w.towers[i] ? '#60fff0' : '#8080a0', 5 * scale, 'tri'); });
    SF.World.beacons.forEach((b, i) => { if (seen(b.x, b.z)) ICON(g, toX(b.x), toY(b.z), w.beacons[i] ? '#60f0ff' : '#606070', 4.5 * scale, 'dia'); });
    ICON(g, toX(L.village.x), toY(L.village.z), '#ffb0e0', 6 * scale);
    ICON(g, toX(L.crash.x), toY(L.crash.z), '#ffffff', 6 * scale, 'dia');
    if (full) SF.World.chests.forEach((c) => { if (w.chests[c.id] || !seen(c.x, c.z)) return; if (c.puzzle && !w.puzzles[c.puzzle]) return; ICON(g, toX(c.x), toY(c.z), '#d0a040', 3.5 * scale, 'sq'); });
    const o = SF.Story.objective();
    if (o) {
      const x = toX(o.x), y = toY(o.z);
      g.font = `bold ${18 * scale}px sans-serif`; g.textAlign = 'center'; g.fillStyle = '#ffe040'; g.strokeStyle = '#000'; g.lineWidth = 3;
      g.strokeText('★', x, y + 6 * scale); g.fillText('★', x, y + 6 * scale);
    }
    const fr = SF.Net.friend && SF.Net.friend.st;
    if (fr && SF.Net.friend.avatar) arrow(g, toX(fr.x), toY(fr.z), fr.f, '#6ab0ff', 6 * scale);
    const P = SF.Game.player;
    if (P && !SF.Phys.arenaAt(P.pos.x, P.pos.z)) arrow(g, toX(P.pos.x), toY(P.pos.z), P.facing, '#ff9a50', 7 * scale);
  }
  function drawBigMap() {
    const S = big.width, g = bigCtx;
    g.clearRect(0, 0, S, S);
    g.imageSmoothingEnabled = true;
    g.drawImage(SF.Terrain.getMapCanvas(), 0, 0, S, S);
    g.drawImage(fogCanvas, 0, 0, S, S);
    const toX = (x) => ((x + 320) / 640) * S, toY = (z) => ((z + 320) / 640) * S;
    drawMarkers(g, toX, toY, S / 640 * 1.6, true);
    const w = SF.State.world, me = SF.State.me;
    els.mapInfo.innerHTML =
      `<b>SHIP PARTS</b> ${w.parts.map((p, i) => `<span style="color:${p ? '#' + new THREE.Color(SF.Models.PART_COL[i]).getHexString() : '#555'}">●</span>`).join(' ')}` +
      `<br><b>POWERS</b> ${['glider', 'bow', 'boots'].map((k) => (w.powers[k] ? SF.Story.POWERS[k].name : '???')).join(' · ')}` +
      `<br><b>HEART PIECES</b> ${me.heartPieces % 4} / 4 &nbsp; <b>SHARDS</b> ✦ ${me.shards}` +
      `<br><span class="leg">■ temple ▲ tower ◆ beacon ★ where to go</span>`;
  }
  function drawMini() {
    const P = SF.Game.player;
    if (!P) return;
    const S = mini.width, g = miniCtx, R = 70;   // shows 140 m across
    const inA = SF.Phys.arenaAt(P.pos.x, P.pos.z);
    g.save();
    g.clearRect(0, 0, S, S);
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.clip();
    g.fillStyle = '#141028'; g.fillRect(0, 0, S, S);
    if (!inA) {
      const k = S / (R * 2);
      const mc = SF.Terrain.getMapCanvas();
      const sx = (P.pos.x - R + 320) / 2, sz = (P.pos.z - R + 320) / 2;
      g.drawImage(mc, sx, sz, R, R, 0, 0, S, S);
      g.drawImage(fogCanvas, (P.pos.x - R + 320) / 10, (P.pos.z - R + 320) / 10, R / 5, R / 5, 0, 0, S, S);
      const toX = (x) => S / 2 + (x - P.pos.x) * k, toY = (z) => S / 2 + (z - P.pos.z) * k;
      drawMarkers(g, toX, toY, 1, false);
      // objective arrow on the edge
      const o = SF.Story.objective();
      const dx = o.x - P.pos.x, dz = o.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d > R) {
        const x = S / 2 + dx / d * (S / 2 - 12), y = S / 2 + dz / d * (S / 2 - 12);
        g.font = 'bold 16px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffe040'; g.strokeStyle = '#000'; g.lineWidth = 3;
        g.strokeText('★', x, y + 6); g.fillText('★', x, y + 6);
      }
    } else {
      g.fillStyle = '#c8c0e0'; g.font = 'bold 13px sans-serif'; g.textAlign = 'center';
      g.fillText('TEMPLE', S / 2, S / 2 + 4);
    }
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3;
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 2, 0, 7); g.stroke();
    g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.fillText('N', S / 2, 14);
  }

  // ---------- the end ----------
  function credits(stats, done) {
    els.credits.style.display = 'flex';
    els.credits.innerHTML = `
      <div class="cr">
        <h1>STARFALL</h1>
        <p class="big">You fixed your ship and flew home!</p>
        <p>But Veyra will always be your second home... and Zib will always be your friend. 💜</p>
        <div class="stats">
          <div>⏱ Time<br><b>${stats.time}</b></div><div>✦ Shards<br><b>${stats.shards}</b></div>
          <div>♥ Hearts<br><b>${stats.hearts}</b></div><div>📦 Chests<br><b>${stats.chests}</b></div>
        </div>
        <p class="sub">Made with code, math and imagination.</p>
        <button id="keepPlaying">KEEP EXPLORING</button>
      </div>`;
    SF.Input.unlock();
    $('keepPlaying').onclick = () => { els.credits.style.display = 'none'; SF.Game.relock(); done(); };
  }

  // ---------- every frame ----------
  let miniT = 0, lastShards = -1, lastEnergy = -1, lastPowers = '';
  function update(dt, inp) {
    const P = SF.Game.player;
    if (!P) return;
    const me = SF.State.me, w = SF.State.world;
    // hearts
    const hs = P.hp + '/' + P.maxHp;
    if (hs !== lastHearts) {
      lastHearts = hs;
      let h = '';
      for (let i = 0; i < P.maxHp / 4; i++) {
        const q = U.clamp(P.hp - i * 4, 0, 4);
        h += `<span class="heart q${q}"></span>`;
      }
      els.hearts.innerHTML = h;
      els.hearts.classList.toggle('low', P.hp <= 4 && P.hp > 0);
    }
    // energy
    const ew = Math.round((P.energy / P.maxEnergy) * 100);
    if (ew !== lastEnergy) { lastEnergy = ew; els.energyFill.style.width = ew + '%'; }
    els.energy.style.width = 90 + me.energyLv * 30 + 'px';
    els.energy.classList.toggle('tired', !!P.exhausted);
    els.energy.style.opacity = ew >= 100 && !P.gliding ? 0.35 : 1;
    if (me.shards !== lastShards) { lastShards = me.shards; els.shards.textContent = '✦ ' + me.shards; }
    const pw = ['glider', 'bow', 'boots'].filter((k) => w.powers[k]).join(',');
    if (pw !== lastPowers) {
      lastPowers = pw;
      els.powers.innerHTML = (w.powers.glider ? '<span title="Glider">🪽</span>' : '') + (w.powers.bow ? '<span title="Bow">🏹</span>' : '') + (w.powers.boots ? '<span title="Jet boots">🚀</span>' : '');
    }
    els.obj.textContent = '★ ' + SF.Story.objective().text;
    // interact prompt
    const it = !P.frozen && !P.down && !SF.Game.cutscene ? SF.World.nearestInteract(P.pos) : null;
    SF.Game.interact = it;
    if (it) { els.prompt.innerHTML = `<kbd>E</kbd> ${it.label()}`; els.prompt.style.display = 'block'; }
    else if (P.down && SF.Net.active) { els.prompt.innerHTML = 'You are knocked out! Wait for your friend to help you up...'; els.prompt.style.display = 'block'; }
    else if (SF.Game.reviveTarget) { els.prompt.innerHTML = `<kbd>E</kbd> Hold to help your friend up! ${Math.round(SF.Game.reviveT * 33)}%`; els.prompt.style.display = 'block'; }
    else els.prompt.style.display = 'none';
    els.cross.style.display = P.aiming ? 'block' : 'none';
    // timers
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) els.toast.classList.remove('show'); }
    if (zoneT > 0) { zoneT -= dt; if (zoneT <= 0) els.zone.classList.remove('show'); }
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) els.banner.classList.remove('show'); }
    if (bossTitleT > 0) { bossTitleT -= dt; if (bossTitleT <= 0) els.bossTitle.classList.remove('show'); }
    // boss bar
    const a = SF.Phys.arenaAt(P.pos.x, P.pos.z);
    const boss = a && SF.Creatures.bossIn(a);
    bossBar(boss);
    // reveal the map around you
    miniT -= dt;
    if (miniT <= 0) {
      miniT = 0.1;
      if (!a) reveal(P.pos.x, P.pos.z, 45);
      drawMini();
      if (mapOpen) drawBigMap();
    }
    // your online friend
    const fr = SF.Net.friend;
    if (SF.Net.active && fr && fr.st) {
      els.friend.style.display = 'block';
      const q = fr.st.hp, m = fr.st.mh || 12;
      let h = '';
      for (let i = 0; i < m / 4; i++) h += `<span class="heart small q${U.clamp(q - i * 4, 0, 4)}"></span>`;
      els.friend.innerHTML = `<b>${fr.name}</b> ${fr.st.dn ? '💫 KNOCKED OUT!' : h}`;
    } else els.friend.style.display = 'none';
    els.net.textContent = SF.Net.statusText();
  }

  return {
    init, update, toast, zone, itemBanner, bossTitle, bossBar, hurtFlash, timer, help, reveal, redrawFog,
    dialog: openDialog, updateDialog, updateModal, openShop, openTravel, closeModal, toggleMap, credits,
    get dialogOpen() { return !!dialog; }, get modalOpen() { return !!modal; }, get mapOpen() { return mapOpen; },
  };
})();
