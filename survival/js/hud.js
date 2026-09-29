// ============================================================
//  DEAD ACRES — THE SCREEN STUFF
//  Health bars, hotbar, compass, clock, messages, map, chat.
// ============================================================
window.DA = window.DA || {};

DA.HUD = (function () {
  const U = DA.U, Inv = DA.Inv;
  const $ = (id) => document.getElementById(id);
  const H = {};
  let last = {};
  const msgs = [];

  function setBar(id, v) {
    const k = Math.round(v);
    if (last[id] === k) return;
    last[id] = k;
    const el = $(id);
    el.querySelector('i').style.width = U.clamp(v, 0, 100) + '%';
    el.classList.toggle('low', v < 25);
    const b = el.querySelector('b'); if (b) b.textContent = k;
  }

  H.drawHotbar = function () {
    let h = '';
    for (let i = 0; i < Inv.HOT; i++) h += Inv.slotHTML(Inv.slots[i], i, i === Inv.sel ? 'sel' : '').replace('class="slot', `data-k="${i + 1}" class="slot`);
    $('hotbar').innerHTML = h;
    // how much wood, stone... you have (always on screen)
    let m = '';
    for (const id of ['wood', 'stone', 'scrap', 'nails', 'cloth', 'rope', 'hide', 'arrow', 'radiopart']) {
      const n = Inv.count(id);
      if (n || id === 'wood' || id === 'stone') m += `<span class="mat${n ? '' : ' none'}" title="${U.esc(Inv.def(id).name)}"><img src="${Inv.iconOf(id)}" alt="">${n}</span>`;
    }
    $('mats').innerHTML = m;
    const s = Inv.held();
    $('heldName').textContent = s ? Inv.def(s.id).name + (Inv.def(s.id).kind === 'build' ? '  (click to place, R to turn)' : Inv.def(s.id).ranged ? `  (${Inv.count('arrow')} arrows)` : '') : '';
  };

  H.msg = function (text, color = '#e8e0c8', time = 5) {
    const el = document.createElement('div');
    el.className = 'msg';
    el.style.color = color;
    el.innerHTML = text;
    $('msgs').appendChild(el);
    msgs.push({ el, t: time });
    while (msgs.length > 6) { const m = msgs.shift(); m.el.remove(); }
  };
  H.chat = function (name, text, color) {
    H.msg(`<b style="color:${color}">${U.esc(name)}:</b> ${U.esc(text)}`, '#fff', 10);
  };

  let bannerT = 0;
  H.banner = function (big, small = '', color = '#e8e0c8', time = 4) {
    const el = $('banner');
    el.innerHTML = `<h1 style="color:${color}">${big}</h1><p>${small}</p>`;
    el.style.opacity = 1;
    bannerT = time;
  };

  // ---------- numbers that float up from where you hit ----------
  const floats = [];
  const v3 = new THREE.Vector3();
  H.floatText = function (x, y, z, text, color = '#fff') {
    const el = document.createElement('div');
    el.className = 'float';
    el.textContent = text; el.style.color = color;
    $('floaters').appendChild(el);
    floats.push({ el, x, y, z, t: 0 });
    while (floats.length > 20) floats.shift().el.remove();
  };
  // quick messages in the middle ("+3 Wood", "+10 XP")
  H.popup = function (text, color = '#fff') {
    const el = document.createElement('div');
    el.className = 'pop'; el.innerHTML = text; el.style.color = color;
    const box = $('pops');
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => el.remove(), 1600);
  };
  H.trophy = function (t) {
    const el = $('trophyToast');
    el.innerHTML = `🏆 <b>TROPHY!</b> ${U.esc(t.name)}<small>${U.esc(t.desc)}</small>`;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  };
  let markT = 0;
  H.hitMarker = function () { markT = 0.18; };

  // health bars over hurt zombies
  const bars = [];
  function zombieBars(cam) {
    let n = 0;
    const W = innerWidth, Hh = innerHeight;
    for (const zb of DA.Zombies.zombies.values()) {
      const a = zb.avatar;
      if (!a || a.hpShowT <= 0 || zb.dead || zb.state === 'dead' || zb.kind === 'boss') continue;
      const pos = a.root.position;
      if (pos.distanceToSquared(cam.position) > 35 * 35) continue;
      v3.set(pos.x, pos.y + (zb.kind === 'brute' ? 2.6 : 2.1), pos.z).project(cam);
      if (v3.z > 1) continue;
      let el = bars[n];
      if (!el) { el = document.createElement('div'); el.className = 'zbar'; el.innerHTML = '<i></i>'; $('floaters').appendChild(el); bars.push(el); }
      el.style.display = 'block';
      el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * W - 25}px, ${(-v3.y * 0.5 + 0.5) * Hh}px)`;
      el.firstChild.style.width = a.hpPct + '%';
      n++;
    }
    for (let i = n; i < bars.length; i++) bars[i].style.display = 'none';
  }

  let hurtFlash = 0;
  H.hurt = function (amount) { hurtFlash = Math.min(1, hurtFlash + 0.3 + amount / 40); };

  // ---------- compass ----------
  function compass(yaw, markers) {
    const el = $('compass');
    const W = el.clientWidth || 400;
    const fov = Math.PI * 0.9;
    let h = '';
    const dirs = [['N', Math.PI], ['E', -Math.PI / 2], ['S', 0], ['W', Math.PI / 2], ['NE', Math.PI * 0.75], ['SE', -Math.PI * 0.25], ['SW', Math.PI * 0.25], ['NW', -Math.PI * 0.75]];
    // our yaw: 0 = looking north (-z). direction angle of a vector = atan2(-dx, -dz)
    for (const [name, ang] of dirs) {
      const a = name.length === 1 ? { N: 0, E: -Math.PI / 2, S: Math.PI, W: Math.PI / 2 }[name] : { NE: -Math.PI / 4, SE: -Math.PI * 0.75, SW: Math.PI * 0.75, NW: Math.PI / 4 }[name];
      const d = U.angleDiff(yaw, a);
      if (Math.abs(d) > fov / 2) continue;
      const x = W / 2 - (d / (fov / 2)) * (W / 2);
      h += `<span class="cd ${name.length > 1 ? 'small' : ''}" style="left:${x}px">${name}</span>`;
      void ang;
    }
    for (const m of markers) {
      const d = U.angleDiff(yaw, m.a);
      if (Math.abs(d) > fov / 2) continue;
      const x = W / 2 - (d / (fov / 2)) * (W / 2);
      h += `<span class="cm" style="left:${x}px;color:${m.color}" title="${U.esc(m.label || '')}">${m.icon}<small>${m.dist}m</small></span>`;
    }
    el.innerHTML = h + '<i class="cc"></i>';
  }

  // ---------- the map (M) ----------
  let mapCanvas = null;
  H.drawMap = function (me, others, extra) {
    const cv = $('mapCanvas');
    const W = DA.World;
    const S = cv.width;
    const g = cv.getContext('2d');
    if (!mapCanvas) mapCanvas = W.groundCanvas;
    g.drawImage(mapCanvas, 0, 0, S, S);
    const toMap = (x, z) => [((x + W.HALF) / W.SIZE) * S, ((z + W.HALF) / W.SIZE) * S];
    // darken the edges (mountains)
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 0, S, S);
    // place names
    g.font = 'bold 13px Arial'; g.textAlign = 'center';
    for (const p of DA.MAP.places) {
      const [x, y] = toMap(p.x, p.z);
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(p.name, x + 1, y - 7 + 1);
      g.fillStyle = '#f0e8d0'; g.fillText(p.name, x, y - 7);
    }
    // things to find
    const icon = (x, z, text, color) => { const [mx, my] = toMap(x, z); g.font = '16px Arial'; g.fillStyle = color; g.fillText(text, mx, my + 6); };
    for (const e of extra) icon(e.x, e.z, e.icon, e.color || '#fff');
    for (const o of others) {
      const [x, y] = toMap(o.x, o.z);
      g.fillStyle = o.color; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke();
      g.font = 'bold 12px Arial'; g.fillStyle = '#fff'; g.fillText(o.name, x, y - 10);
    }
    // you: an arrow
    const [px, py] = toMap(me.x, me.z);
    g.save(); g.translate(px, py); g.rotate(-me.yaw);
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -11); g.lineTo(7, 8); g.lineTo(0, 4); g.lineTo(-7, 8); g.closePath(); g.fill(); g.stroke();
    g.restore();
  };

  // ---------- every frame ----------
  H.update = function (dt, o) {
    const me = o.me;
    setBar('barHp', me.hp / me.maxHp * 100);
    const hb = $('barHp').querySelector('b'); if (hb) hb.textContent = Math.ceil(me.hp) + (me.maxHp > 100 ? ' / ' + me.maxHp : '');
    // experience
    const need = 40 + me.level * 35;
    const xpKey = me.level + ':' + me.xp;
    if (last.xp !== xpKey) { last.xp = xpKey; $('xpFill').style.width = Math.min(100, me.xp / need * 100) + '%'; $('lvl').textContent = 'LV ' + me.level; $('xpText').textContent = `${me.xp} / ${need} XP`; }
    // floating numbers
    const cam = o.cam;
    if (cam) {
      for (let i = floats.length - 1; i >= 0; i--) {
        const f = floats[i];
        f.t += dt;
        if (f.t > 1.1) { f.el.remove(); floats.splice(i, 1); continue; }
        v3.set(f.x, f.y + f.t * 0.8, f.z).project(cam);
        if (v3.z > 1) { f.el.style.display = 'none'; continue; }
        f.el.style.display = 'block';
        f.el.style.opacity = Math.min(1, (1.1 - f.t) * 3);
        f.el.style.transform = `translate(${(v3.x * 0.5 + 0.5) * innerWidth}px, ${(-v3.y * 0.5 + 0.5) * innerHeight}px) translate(-50%, -50%)`;
      }
      zombieBars(cam);
    }
    markT -= dt;
    $('hitmark').style.opacity = markT > 0 ? 1 : 0;
    // the boss
    const boss = DA.Zombies.boss();
    const showBoss = boss && boss.avatar && boss.avatar.root.position.distanceTo(cam ? cam.position : new THREE.Vector3()) < 70;
    $('bossBar').style.display = showBoss ? 'block' : 'none';
    if (showBoss) $('bossFill').style.width = boss.avatar.hpPct + '%';
 setBar('barFood', me.food); setBar('barWater', me.water); setBar('barSta', me.stamina);
    // clock
    const hour = o.hour;
    const hh = Math.floor(hour), mm = Math.floor((hour - hh) * 60 / 10) * 10;
    const night = DA.World.isNight(hour);
    const clock = `${night ? '🌙' : '☀️'} DAY ${o.day} · ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    if (last.clock !== clock) { last.clock = clock; $('clock').textContent = clock; }
    const warn = o.nightIn !== null && o.nightIn < 90 && !night ? `Night in ${U.fmtTime(o.nightIn)}${o.horde ? ' — HORDE NIGHT!' : ''}` : o.dayIn !== null && night ? `Sunrise in ${U.fmtTime(o.dayIn)}` : '';
    if (last.warn !== warn) { last.warn = warn; $('clockWarn').textContent = warn; $('clockWarn').className = o.horde ? 'horde' : ''; }
    // prompt
    const pr = me.alive ? (o.prompt || '') : '';
    if (last.prompt !== pr) { last.prompt = pr; $('prompt').innerHTML = pr; $('prompt').style.opacity = pr ? 1 : 0; }
    const pp = me.pickupProgress || 0;
    $('pickBar').style.display = pp > 0 ? 'block' : 'none';
    if (pp > 0) $('pickBar').firstElementChild.style.width = Math.min(100, pp * 100) + '%';
    // eat / bow progress
    const use = me.useT > 0 ? me.useT / 0.8 : me.drawT > 0 ? Math.min(1, me.drawT / 0.9) : 0;
    $('useBar').style.display = use > 0 ? 'block' : 'none';
    if (use > 0) $('useBar').firstElementChild.style.width = Math.min(100, use * 100) + '%';
    // messages fade away
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      m.t -= dt;
      if (m.t < 1) m.el.style.opacity = Math.max(0, m.t);
      if (m.t <= 0) { m.el.remove(); msgs.splice(i, 1); }
    }
    if (bannerT > 0) { bannerT -= dt; if (bannerT < 1) $('banner').style.opacity = Math.max(0, bannerT); }
    // red flash when hurt, red edges when almost dead
    hurtFlash = Math.max(0, hurtFlash - dt * 1.5);
    $('hurt').style.opacity = hurtFlash;
    $('lowhp').style.opacity = me.alive ? U.clamp((40 - me.hp) / 40, 0, 1) * (0.6 + Math.sin(performance.now() / 200) * 0.2) : 0;
    $('crosshair').className = o.targetKind === 'zombie' || o.targetKind === 'animal' ? 'enemy' : o.prompt ? 'use' : '';
    compass(me.yaw, o.markers || []);
    // what to do next
    const goal = o.goal ? `<b>NEXT GOAL</b>${o.goal}` : '';
    if (last.goal !== goal) { last.goal = goal; $('goal').innerHTML = goal; }
    // online info
    const online = o.online || '';
    if (last.online !== online) { last.online = online; $('online').innerHTML = online; $('online').style.display = online ? 'block' : 'none'; }
  };

  H.reset = function () { last = {}; msgs.forEach((m) => m.el.remove()); msgs.length = 0; };
  return H;
})();
