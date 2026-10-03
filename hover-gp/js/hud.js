// ============================================================
//  SIGMA HOVER GP — THE HUD (what you see on top of the race)
//  Place, laps, coins, item box, timer, minimap, messages.
// ============================================================
window.HG = window.HG || {};

HG.HUD = (function () {
  const U = HG.U;
  const views = [];
  let root, mapCanvas = null, mapScale = 1, mapOff = { x: 0, z: 0 }, trackRef = null;

  function el(tag, cls, parent, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }

  function init() { root = document.getElementById('hud'); }

  // make one HUD per local player
  function setup(viewList, race) {
    root.innerHTML = '';
    views.length = 0;
    trackRef = race.track;
    buildMap(race.track);
    const split = viewList.length > 1;
    viewList.forEach((v, i) => {
      const box = el('div', 'hview' + (split ? ' split' : ''), root);
      const h = {
        box, kart: v.kart,
        item: el('div', 'hitem', box, '<div class="islot"><span></span></div><div class="islot2"><span></span></div><b class="icount"></b>'),
        place: el('div', 'hplace', box),
        lap: el('div', 'hlap', box),
        coins: el('div', 'hcoins', box),
        time: el('div', 'htime', box),
        msg: el('div', 'hmsg', box),
        big: el('div', 'hbig', box),
        warn: el('div', 'hwarn', box),
        tip: el('div', 'htip', box),
        list: split ? null : el('div', 'hlist', box),
        map: null, mapCtx: null,
        lastPlace: 0, msgT: 0, bigT: 0, tipT: 0, roul: 0, lastItem: null,
        smoke: el('div', 'hsmoke', box),
        boostfx: el('div', 'hboost', box),
        balloons: race.battle ? el('div', 'hballoons', box) : null,
      };
      h.itemSpan = h.item.querySelector('.islot span');
      h.item2Span = h.item.querySelector('.islot2 span');
      h.countEl = h.item.querySelector('.icount');
      if (!race.track.isArena || true) {
        const c = el('canvas', 'hmap', box);
        c.width = 220; c.height = 220;
        h.map = c; h.mapCtx = c.getContext('2d');
      }
      if (race.battle) { h.lap.style.display = 'none'; }
      views.push(h);
    });
    layout(viewList);
  }

  function layout(viewList) {
    const split = viewList.length > 1;
    views.forEach((h, i) => {
      const s = h.box.style;
      s.left = '0'; s.width = '100%';
      if (split) { s.top = i === 0 ? '0' : '50%'; s.height = '50%'; } else { s.top = '0'; s.height = '100%'; }
    });
  }

  // draw the track shape once
  function buildMap(track) {
    const pts = [];
    if (track.isArena) {
      const r = track.size;
      mapScale = 190 / (r * 2); mapOff = { x: -r, z: -r };
      mapCanvas = U.canvas(220, 220, (g) => {
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3;
        g.beginPath(); if (track.round) g.arc(110, 110, 95, 0, 7); else g.rect(15, 15, 190, 190); g.fill(); g.stroke();
      });
      return;
    }
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of track.P) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z); }
    const size = Math.max(maxX - minX, maxZ - minZ);
    mapScale = 190 / size;
    mapOff = { x: (minX + maxX) / 2 - size / 2, z: (minZ + maxZ) / 2 - size / 2 };
    mapCanvas = U.canvas(220, 220, (g) => {
      g.lineJoin = 'round'; g.lineCap = 'round';
      const path = () => { g.beginPath(); track.P.forEach((p, i) => { const [x, y] = mp(p.x, p.z); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.closePath(); };
      g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 12; path(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.92)'; g.lineWidth = 7; path(); g.stroke();
      // start line
      const [sx, sy] = mp(track.P[0].x, track.P[0].z);
      g.fillStyle = '#ffcc1a'; g.beginPath(); g.arc(sx, sy, 5, 0, 7); g.fill();
    });
  }
  // world to minimap (x is flipped so right turns look right from above)
  function mp(x, z) { return [215 - ((x - mapOff.x) * mapScale + 15) + 0, (220 - ((z - mapOff.z) * mapScale + 15))]; }

  const PLACE_COLORS = ['#ffd21a', '#d8e0ea', '#ff9a3a', '#7ad0ff', '#7ad0ff', '#7ad0ff', '#b0b0c0', '#b0b0c0', '#b0b0c0', '#9a9aaa', '#9a9aaa', '#9a9aaa'];

  function update(dt, race) {
    const pos = new THREE.Vector3();
    for (const h of views) {
      const k = h.kart;
      // place
      if (!race.battle) {
        if (k.place !== h.lastPlace) {
          h.place.innerHTML = '<b>' + k.place + '</b><i>' + U.ordinal(k.place).replace(/\d+/, '') + '</i>';
          h.place.style.setProperty('--pc', PLACE_COLORS[k.place - 1] || '#aaa');
          h.place.classList.remove('pop'); void h.place.offsetWidth; h.place.classList.add('pop');
          h.lastPlace = k.place;
        }
        h.lap.innerHTML = '<span>LAP</span> ' + Math.min(race.laps, k.lapNum) + '<small>/' + race.laps + '</small>';
      } else {
        h.place.innerHTML = '';
        if (h.balloons) h.balloons.innerHTML = k.out ? '<span class="outtxt">OUT!</span>' : '🎈'.repeat(Math.max(0, k.balloons)) + '<small> ' + k.score + ' pts</small>';
      }
      h.coins.innerHTML = '<i class="coinico">Σ</i> ' + k.coins + (k.coins >= 10 ? '<small>MAX</small>' : '');
      h.time.textContent = race.battle ? U.time(Math.max(0, (race.cfg.timeLimit || 180) - race.time)).slice(0, -4) : U.time(race.time);
      // item box
      const it = HG.Items ? HG.Items.hudItem(k) : null;
      if (it && it.rolling) {
        h.roul += dt;
        h.itemSpan.textContent = it.icon;
        h.item.classList.add('rolling');
      } else {
        h.item.classList.remove('rolling');
        h.itemSpan.textContent = it ? it.icon : '';
      }
      h.item.classList.toggle('has', !!it);
      h.countEl.textContent = it && it.count > 1 ? '×' + it.count : '';
      h.item2Span.textContent = it && it.dragIcon ? it.dragIcon : '';
      h.item.classList.toggle('dragging', !!(it && it.dragIcon));
      // messages
      if (h.msgT > 0) { h.msgT -= dt; if (h.msgT <= 0) h.msg.classList.remove('show'); }
      if (h.bigT > 0) { h.bigT -= dt; if (h.bigT <= 0) h.big.classList.remove('show'); }
      if (h.tipT > 0) { h.tipT -= dt; if (h.tipT <= 0) h.tip.classList.remove('show'); }
      h.warn.classList.toggle('show', !!(k.wrongWay && !k.finished && race.go && !race.battle));
      h.warn.textContent = 'WRONG WAY!';
      h.smoke.style.opacity = U.clamp(k.smokeT / 1.5, 0, 1).toFixed(2);
      h.boostfx.style.opacity = k.boosting ? '1' : '0';
      // minimap
      if (h.mapCtx && mapCanvas) {
        const g = h.mapCtx;
        g.clearRect(0, 0, 220, 220);
        g.drawImage(mapCanvas, 0, 0);
        const order = race.karts.slice().sort((a, b) => (a === k ? 1 : 0) - (b === k ? 1 : 0));
        for (const o of order) {
          if (o.out) continue;
          let x, y;
          if (race.track.isArena) [x, y] = [110 - o.s * mapScale, 110 - o.d * mapScale];
          else { race.track.point(o.s, o.d, 0, pos); [x, y] = mp(pos.x, pos.z); }
          const me = o === k;
          g.fillStyle = o.color; g.strokeStyle = me ? '#fff' : '#000'; g.lineWidth = me ? 3 : 1.5;
          g.beginPath(); g.arc(x, y, me ? 7 : 5, 0, 7); g.fill(); g.stroke();
        }
        if (HG.Items && HG.Items.mapMarks) HG.Items.mapMarks(g, race, (o) => { if (race.track.isArena) return [110 - o.s * mapScale, 110 - o.d * mapScale]; race.track.point(o.s, o.d, 0, pos); return mp(pos.x, pos.z); });
      }
      // the list of racers on the left
      if (h.list && race.order) {
        if (!h.listT || (h.listT -= dt) <= 0) {
          h.listT = 0.25;
          h.list.innerHTML = race.order.slice(0, 12).map((o, i) => '<div class="' + (o.ctrl === 'local' ? 'me' : '') + '"><b>' + (i + 1) + '</b><i style="background:' + o.color + '"></i>' + o.name + '</div>').join('');
        }
      }
    }
  }

  function viewFor(k) { return views.find((h) => h.kart === k); }
  function msg(k, text, t = 1.6, cls = '') {
    const h = viewFor(k); if (!h) return;
    h.msg.className = 'hmsg ' + cls; h.msg.innerHTML = text; void h.msg.offsetWidth; h.msg.classList.add('show'); h.msgT = t;
  }
  function big(k, text, t = 1, cls = '') {
    const list = k ? [viewFor(k)] : views;
    for (const h of list) { if (!h) continue; h.big.className = 'hbig ' + cls; h.big.innerHTML = text; void h.big.offsetWidth; h.big.classList.add('show'); h.bigT = t; }
  }
  function tip(k, text, t = 4) {
    const h = viewFor(k); if (!h) return;
    h.tip.innerHTML = text; h.tip.classList.add('show'); h.tipT = t;
  }
  function clear() { if (root) root.innerHTML = ''; views.length = 0; }

  return { init, setup, update, msg, big, tip, clear, views };
})();
