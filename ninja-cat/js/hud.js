// ============================================================
//  NINJA CAT — THE HUD (hearts, fish, messages, hints, boss bar)
// ============================================================
window.NC = window.NC || {};

NC.HUD = (function () {
  const $ = (id) => document.getElementById(id);
  let panes = [];
  const last = new Map(); // only touch the page when something changes (faster)
  function set(el, key, html) {
    if (last.get(key) === html) return;
    last.set(key, html);
    el.innerHTML = html;
  }

  function setup(n) {
    const root = $('panes');
    root.innerHTML = '';
    last.clear();
    panes = [];
    for (let i = 0; i < n; i++) {
      const d = document.createElement('div');
      d.className = 'pane p' + (i + 1) + (n > 1 ? ' split' : '');
      d.style.left = (i * 100) / n + '%';
      d.style.width = 100 / n + '%';
      d.innerHTML = `
        <div class="flashfx"></div>
        <div class="stats">
          <div class="pname"></div>
          <div class="hearts"></div>
          <div class="row"><span class="fish"></span><span class="stars"></span><span class="smoke"></span></div>
          <div class="invis"><i></i></div>
        </div>
        <div class="msg"></div>
        <div class="hint"></div>`;
      root.appendChild(d);
      panes.push({
        el: d, name: d.querySelector('.pname'), hearts: d.querySelector('.hearts'), fish: d.querySelector('.fish'), stars: d.querySelector('.stars'),
        smoke: d.querySelector('.smoke'), invis: d.querySelector('.invis'), invisBar: d.querySelector('.invis i'), msg: d.querySelector('.msg'), hint: d.querySelector('.hint'),
        flash: d.querySelector('.flashfx'), msgT: 0, hintText: null,
      });
    }
  }

  function update(dt, G) {
    G.players.forEach((p, i) => {
      const P = panes[i];
      if (!P) return;
      set(P.name, 'n' + i, `${p.name} <span class="lives">🐱×${G.lives}</span>`);
      let h = '';
      for (let k = 0; k < p.maxHearts; k++) h += `<b class="${k < p.hearts ? 'on' : 'off'}">❤</b>`;
      set(P.hearts, 'h' + i, h);
      set(P.fish, 'f' + i, `🐟 ${G.fish}`);
      set(P.stars, 's' + i, `<b class="star">✦</b> ${p.stars}`);
      set(P.smoke, 'm' + i, `💨 ${p.smokes}`);
      P.invis.style.display = p.invisT > 0 ? 'block' : 'none';
      if (p.invisT > 0) P.invisBar.style.width = (100 * p.invisT) / p.smokeTime + '%';
      if (P.msgT > 0) { P.msgT -= dt; if (P.msgT <= 0) P.msg.classList.remove('show'); }
    });
    // the bar at the top
    const lv = G.levelData;
    if (lv) {
      let bells = '';
      for (let k = 0; k < NC.Items.counts.bells; k++) bells += `<b class="${G.bells[k] ? 'on' : 'off'}">🔔</b>`;
      set($('topbar'), 'top', `<span class="lvname">${G.levelIndex + 1}. ${lv.name}</span><span class="bells">${bells}</span>`);
      set($('timer'), 'time', NC.U.time(G.levelTime));
    }
    // boss health
    const b = G.boss;
    $('bossbar').style.display = b ? 'block' : 'none';
    if (b) {
      set($('bossname'), 'bn', b.name);
      $('bossfill').style.width = Math.max(0, (100 * b.hp) / b.maxHp) + '%';
    }
  }

  function message(i, text, time = 1.8) {
    const list = i == null ? panes : [panes[i]];
    for (const P of list) {
      if (!P) continue;
      P.msg.textContent = text;
      P.msg.classList.remove('show');
      void P.msg.offsetWidth; // restart the pop animation
      P.msg.classList.add('show');
      P.msgT = time;
    }
  }

  // hint text with the right buttons for that player
  function setHint(i, text) {
    const P = panes[i];
    if (!P) return;
    if (P.hintText === text) return;
    P.hintText = text;
    if (!text) { P.hint.classList.remove('show'); return; }
    const t = text.replace(/\{(\w+)\}/g, (m, k) => `<b class="key">${NC.Input.keyName(i, k) || k}</b>`);
    P.hint.innerHTML = t;
    P.hint.classList.add('show');
  }

  function flash(i, kind) {
    const P = panes[i];
    if (!P) return;
    P.flash.className = 'flashfx ' + kind;
    void P.flash.offsetWidth;
    P.flash.classList.add('go');
  }

  // big title in the middle of the screen
  function announce(title, sub, time = 3) {
    const a = $('announce');
    a.innerHTML = `<div class="big">${title}</div>${sub ? `<div class="sub">${sub}</div>` : ''}`;
    a.classList.remove('show');
    void a.offsetWidth;
    a.classList.add('show');
    clearTimeout(announce.t);
    announce.t = setTimeout(() => a.classList.remove('show'), time * 1000);
  }

  function show(on) { $('hud').style.display = on ? 'block' : 'none'; }

  return { setup, update, message, setHint, flash, announce, show };
})();
