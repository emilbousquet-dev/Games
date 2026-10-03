// ============================================================
//  DINO RAMPAGE — HUD (everything drawn on top of the game)
// ============================================================
window.DR = window.DR || {};

DR.HUD = (function () {
  const U = DR.U;
  const $ = (id) => document.getElementById(id);
  const SIZE_NAMES = ['BABY', 'LITTLE', 'BIG', 'HUGE', 'GIANT'];
  const CAN_SMASH = [
    '🌷 fences, bushes, mailboxes & snacks',
    '🚗 cars, trees & lamp posts',
    '🏠 houses, buses & trucks',
    '🏬 shops, apartments & water towers',
    '🏙️ SKYSCRAPERS! Smash them all!',
  ];
  let el = {};
  const labels = [];   // speech bubbles and "+50" popups floating in 3D
  const v = new THREE.Vector3();
  let centerT = 0, tipT = 0, lastScore = -1;

  function init() {
    for (const id of ['hud', 'lvl-name', 'timer', 'badges', 'grow-fill', 'size-name', 'can-smash', 'score', 'combo', 'roar-ring', 'roarbox', 'minimap', 'center-msg', 'tip', 'labels', 'flash', 'rampage-lbl', 'hint', 'hpbox', 'hp-fill', 'radio', 'radio-text', 'powerbox']) el[id] = $(id);
    el.badges.innerHTML = SIZE_NAMES.map((n, i) => `<div class="badge" data-i="${i}"><span style="font-size:${14 + i * 5}px">🦖</span></div>`).join('');
    el.mapCtx = el.minimap.getContext('2d');
  }
  function show(on) { el.hud.style.display = on ? 'block' : 'none'; if (!on) clearLabels(); }
  function hideRadio() { radioT = 0; el.radio.classList.remove('show'); }
  function setLevel(name) { el['lvl-name'].textContent = name; }
  function setTime(s) { el.timer.textContent = '⏱ ' + U.timeText(s); }
  function setGrowth(tier, p, rampage) {
    [...el.badges.children].forEach((b, i) => { b.classList.toggle('done', i < tier - 1); b.classList.toggle('now', i === tier - 1); });
    el['grow-fill'].style.width = (U.clamp(p, 0, 1) * 100).toFixed(1) + '%';
    el['grow-fill'].classList.toggle('rampage', !!rampage);
    el['size-name'].textContent = rampage ? 'GIANT — RAMPAGE!' : SIZE_NAMES[tier - 1] + ' DINO';
    el['rampage-lbl'].textContent = rampage ? 'Fill the bar to WIN!' : 'Grow to ' + SIZE_NAMES[tier] + '!';
    el['can-smash'].innerHTML = 'You can smash: <b>' + CAN_SMASH[tier - 1] + '</b>';
  }
  function setScore(s) {
    if (s === lastScore) return;
    lastScore = s;
    el.score.textContent = s.toLocaleString();
  }
  function combo(n) {
    if (n < 2) { el.combo.classList.remove('show'); return; }
    el.combo.textContent = 'COMBO x' + n + '!';
    el.combo.classList.remove('show'); void el.combo.offsetWidth; el.combo.classList.add('show');
  }
  function setRoar(v, ready) {
    const deg = (U.clamp(v, 0, 1) * 360).toFixed(0);
    const bg = `conic-gradient(${ready ? '#ff5a3a' : '#ffb03a'} ${deg}deg, rgba(255,255,255,0.15) ${deg}deg)`;
    el['roar-ring'].style.background = bg;
    el.roarbox.classList.toggle('ready', ready);
    // the ROAR button on phones shows the same circle
    const tb = document.getElementById('tb-roar');
    if (tb) { tb.style.setProperty('--ring', bg); tb.classList.toggle('ready', ready); }
  }
  function center(html, secs = 2, cls = '') {
    const c = el['center-msg'];
    c.innerHTML = html;
    c.className = 'show ' + cls;
    centerT = secs;
  }
  // on phones, talk about buttons instead of keys
  const TOUCH_WORDS = [
    [/\(right click or Q\)/g, '(the 🌀 TAIL button)'], [/\(jump with Space, then click\)/g, '(⬆️ JUMP, then JUMP again in the air)'],
    [/Press <b>R<\/b>/g, 'Tap the <b>ROAR</b> button'],
  ];
  function tip(html, secs = 4) {
    if (DR.touch) for (const [a, b] of TOUCH_WORDS) html = html.replace(a, b);
    el.tip.innerHTML = html;
    el.tip.classList.add('show');
    tipT = secs;
  }
  function flash(color = '#fff', a = 0.5) {
    const f = el.flash;
    f.style.transition = 'none'; f.style.background = color; f.style.opacity = a;
    requestAnimationFrame(() => { f.style.transition = 'opacity 0.6s'; f.style.opacity = 0; });
  }
  function hint(on) { el.hint.style.display = on ? 'flex' : 'none'; }
  // dino health (only shown when the army is around)
  function setHP(v, show) {
    el.hpbox.style.display = show ? 'flex' : 'none';
    el['hp-fill'].style.width = (U.clamp(v, 0, 1) * 100).toFixed(0) + '%';
    el.hpbox.classList.toggle('low', v < 0.35);
  }
  // funny messages from the FBI and army radio
  let radioT = 0;
  function radio(text) {
    const i = text.indexOf(':');
    el['radio-text'].innerHTML = i > 0 ? `<b>${text.slice(0, i)}:</b>${text.slice(i + 1)}` : text;
    el.radio.classList.add('show');
    radioT = 7;
  }
  function setPower(t) {
    el.powerbox.style.display = t > 0 ? 'block' : 'none';
    if (t > 0) el.powerbox.textContent = '🌈 RAINBOW POWER! ' + Math.ceil(t) + 's';
  }

  // ---------- words floating in the 3D world ----------
  // speech bubble above a person (follows them around)
  function say(text, target, height = 2.2) {
    const bubbles = labels.filter((l) => l.kind === 'say');
    if (bubbles.length >= 4) { const old = bubbles[0]; old.life = Math.min(old.life, 0.2); }
    const d = document.createElement('div');
    d.className = 'bubble';
    d.textContent = text;
    el.labels.appendChild(d);
    labels.push({ kind: 'say', el: d, target, height, life: 2.6, t: 0 });
  }
  // "+50" that floats up from a spot
  function popup(text, x, y, z, cls = '') {
    if (labels.filter((l) => l.kind === 'pop').length > 10) return;
    const d = document.createElement('div');
    d.className = 'pop ' + cls;
    d.innerHTML = text;
    el.labels.appendChild(d);
    labels.push({ kind: 'pop', el: d, x, y, z, life: 1.3, t: 0 });
  }
  function clearLabels() { labels.forEach((l) => l.el.remove()); labels.length = 0; }

  function update(dt, cam) {
    if (centerT > 0) { centerT -= dt; if (centerT <= 0) el['center-msg'].classList.remove('show'); }
    if (tipT > 0) { tipT -= dt; if (tipT <= 0) el.tip.classList.remove('show'); }
    if (radioT > 0) { radioT -= dt; if (radioT <= 0) el.radio.classList.remove('show'); }
    const W = innerWidth, H = innerHeight;
    for (let i = labels.length - 1; i >= 0; i--) {
      const l = labels[i];
      l.t += dt; l.life -= dt;
      if (l.life <= 0 || (l.target && !l.target.parent)) { l.el.remove(); labels.splice(i, 1); continue; }
      if (l.kind === 'say') v.set(l.target.position.x, l.target.position.y + l.height * l.target.scale.y, l.target.position.z);
      else v.set(l.x, l.y, l.z);
      v.project(cam);
      if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) { l.el.style.display = 'none'; continue; }
      l.el.style.display = 'block';
      let x = (v.x * 0.5 + 0.5) * W, y = (-v.y * 0.5 + 0.5) * H;
      if (l.kind === 'pop') y -= l.t * 60;
      l.el.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) translate(-50%, -100%)`;
      l.el.style.opacity = Math.min(1, l.life * 3, l.t * 8);
    }
  }

  // ---------- mini-map ----------
  function drawMap(city, dino, army) {
    const c = el.minimap, g = el.mapCtx;
    const S = 150;
    if (c.width !== S) { c.width = S; c.height = S; }
    const info = city.info;
    const range = 140 + dino.scale * 18;
    const sc = S / (range * 2);
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, 7); g.clip();
    g.fillStyle = '#6ab04a'; g.fillRect(0, 0, S, S);
    const tx = (x) => S / 2 + (x - dino.x) * sc, tz = (z) => S / 2 + (z - dino.z) * sc;
    if (info.shore < Infinity) { g.fillStyle = '#3a9ae0'; g.fillRect(0, tz(info.shore), S, S); }
    g.fillStyle = '#55555d';
    for (const x of info.roadsX) g.fillRect(tx(x) - 5 * sc, tz(0) - 5 * sc, 10 * sc, info.d * sc + 10 * sc);
    for (const z of info.roadsZ) g.fillRect(tx(0) - 5 * sc, tz(z) - 5 * sc, info.w * sc + 10 * sc, 10 * sc);
    // things you can smash right now (bright), and too-big things (dark)
    for (const o of city.objects) {
      if (!o.alive || o.tier < 3) continue;
      const x = tx(o.x), z = tz(o.z);
      if (x < -20 || z < -20 || x > S + 20 || z > S + 20) continue;
      g.fillStyle = o.tier <= dino.tier ? '#ffd8a0' : '#3a3440';
      g.fillRect(x - o.hx * sc, z - o.hz * sc, Math.max(2, o.hx * 2 * sc), Math.max(2, o.hz * 2 * sc));
    }
    // snacks!
    for (const o of city.foods) {
      if (!o.alive) continue;
      const x = tx(o.x), z = tz(o.z);
      if (x < 0 || z < 0 || x > S || z > S) continue;
      g.fillStyle = o.tier <= dino.tier ? '#ff3a8a' : 'rgba(255,58,138,0.35)';
      g.beginPath(); g.arc(x, z, o.tier <= dino.tier ? 3.2 : 2, 0, 7); g.fill();
    }
    // army vehicles (red)
    for (const u of army || []) {
      const x = tx(u.x), z = tz(u.z);
      if (x < 0 || z < 0 || x > S || z > S) continue;
      g.fillStyle = '#ff2a2a'; g.strokeStyle = '#fff'; g.lineWidth = 1.5;
      g.beginPath(); g.rect(x - 3.5, z - 3.5, 7, 7); g.fill(); g.stroke();
    }
    g.restore();
    // the dino (an arrow pointing where it looks)
    g.save();
    g.translate(S / 2, S / 2); g.rotate(-dino.yaw + Math.PI);
    g.fillStyle = '#fff'; g.strokeStyle = '#1a3a1a'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -8); g.lineTo(6, 6); g.lineTo(0, 3); g.lineTo(-6, 6); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  return { hideRadio, setHP, radio, setPower, init, show, setLevel, setTime, setGrowth, setScore, combo, setRoar, center, tip, flash, hint, say, popup, clearLabels, update, drawMap, SIZE_NAMES };
})();
