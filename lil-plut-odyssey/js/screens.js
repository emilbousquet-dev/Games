// ============================================================
//  LIL' PLUT ODYSSEY — SCREENS
//  The title screen, the world map, the story panels,
//  the pause menu and the "level complete" card.
// ============================================================
window.LP = window.LP || {};

LP.Screens = (function () {
  const A = LP.Art, U = LP.U, VH = LP.VH, I = LP.Input;
  const H = () => LP.HUD;
  let cur = null, t = 0;
  let mapSel = 0, mapCam = 0, titleBG = false;

  function g() { return LP.game; }
  function W() { return g().viewW; }

  function open(name, opts) {
    t = 0;
    cur = Object.assign({ name, sel: 0 }, opts || {});
    const G = g();
    if (name === 'title') { G.mode = 'title'; LP.Audio.music('title'); titleBG = false; }
    if (name === 'map') {
      G.mode = 'map'; LP.Audio.music('title');
      if (opts && opts.select !== undefined) mapSel = opts.select;
      else { mapSel = 0; for (let i = 0; i < LP.LEVELS.length; i++) if (LP.Save.unlocked(i)) mapSel = i; }
      mapCam = nodePos(mapSel).x - W() / 2;
    }
    if (name === 'story') { G.mode = 'story'; cur.page = 0; cur.pt = 0; }
    if (name === 'pause') G.mode = 'pause';
    if (name === 'complete') { G.mode = 'complete'; cur.count = 0; }
    if (name === 'credits') { G.mode = 'credits'; }
  }

  // ---------- a simple menu ----------
  function menu(c, items, x, y, sel) {
    const boxes = [];
    items.forEach((it, i) => {
      const yy = y + i * 64, on = i === sel;
      c.font = `800 30px ${LP.FONT}`;
      const w = Math.max(260, c.measureText(it).width + 60);
      const bounce = on ? Math.sin(t * 6) * 3 : 0;
      c.fillStyle = on ? '#ffd23f' : 'rgba(30,14,50,0.65)';
      c.beginPath(); c.roundRect(x - w / 2, yy - 25 + bounce, w, 50, 25); c.fill();
      c.strokeStyle = on ? '#fff6c0' : 'rgba(255,255,255,0.25)'; c.lineWidth = 3; c.stroke();
      H().text(c, it, x, yy + 1 + bounce, 30, on ? '#4a1e3a' : '#ffffff', 'center', on ? 0 : 5);
      boxes.push({ x: x - w / 2, y: yy - 25, w, h: 50 });
    });
    return boxes;
  }
  function menuInput(n, boxes) {
    if (I.take('up')) { cur.sel = (cur.sel + n - 1) % n; LP.Audio.play('menu'); }
    if (I.take('down')) { cur.sel = (cur.sel + 1) % n; LP.Audio.play('menu'); }
    const click = I.takeClick();
    if (click && boxes) {
      const x = click.x * W(), y = click.y * VH;
      const i = boxes.findIndex((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
      if (i >= 0) { cur.sel = i; return i; }
    }
    if (I.take('ok') || I.take('attack')) return cur.sel;
    return -1;
  }

  // =================== TITLE ===================
  function drawTitle(c) {
    const w = W(), G = g();
    if (!titleBG) { LP.BG.build('garden', G.scale); titleBG = true; }
    const cam = { x: t * 90, y: 144 };
    LP.BG.drawBack(c, cam, w, t, { ph: 864 });
    // grass
    c.fillStyle = '#7b4a2b'; c.fillRect(0, VH - 70, w, 70);
    c.fillStyle = '#2f8f2c'; c.fillRect(0, VH - 82, w, 16);
    c.fillStyle = '#5ccf48'; c.fillRect(0, VH - 86, w, 12);
    // the chase across the screen
    const loop = w + 900, x = ((t * 230) % loop) - 300;
    A.cat(c, x + 330, VH - 82, 1, t, { bobo: true, run: true, s: 0.75 });
    const jump = Math.max(0, Math.sin(t * 2.2)) * 60 * (Math.sin(t * 1.1) > 0.6 ? 1 : 0);
    A.plut(c, x, VH - 80 - jump, { anim: jump > 2 ? 'jump' : 'run', animT: 0, facing: 1, sx: 1.4, sy: 1.4, runPhase: t * 7, time: t });
    LP.BG.drawFront(c, cam, w, t, G.lastDt || 0.016, { ph: 864 });
    // the logo
    c.save(); c.translate(w / 2, 150);
    const title1 = "LIL' PLUT", title2 = 'ODYSSEY';
    c.font = `800 118px ${LP.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    let xx = -c.measureText(title1).width / 2;
    for (let i = 0; i < title1.length; i++) {
      const ch = title1[i], cw = c.measureText(ch).width, yy = Math.sin(t * 3 + i * 0.6) * 6;
      c.lineWidth = 16; c.strokeStyle = '#4a1e3a'; c.lineJoin = 'round';
      c.strokeText(ch, xx + cw / 2, yy);
      const gr = c.createLinearGradient(0, yy - 50, 0, yy + 50); gr.addColorStop(0, '#fff3a0'); gr.addColorStop(1, '#ff9a3c');
      c.fillStyle = gr; c.fillText(ch, xx + cw / 2, yy);
      xx += cw;
    }
    c.font = `800 64px ${LP.FONT}`;
    c.lineWidth = 12; c.strokeStyle = '#4a1e3a'; c.strokeText(title2, 0, 92);
    c.fillStyle = '#ff5a8a'; c.fillText(title2, 0, 92);
    c.restore();
    H().text(c, 'a story about the most annoying baby in the world', w / 2, 296, 22, '#ffffff', 'center');
    cur.boxes = menu(c, ['PLAY', 'SOUND: ' + (LP.Audio.on ? 'ON' : 'OFF'), cur.confirm ? 'SURE? PRESS AGAIN' : 'NEW GAME (erase save)'], w / 2, 380, cur.sel);
    H().text(c, 'ARROWS move · SPACE jump · X slap · C scream · SHIFT run · ESC pause', w / 2, VH - 28, 17, 'rgba(255,255,255,0.9)', 'center', 4);
  }
  function updateTitle() {
    const i = menuInput(3, cur.boxes);
    if (i === 0) { LP.Audio.init(); LP.Audio.play('select'); goMap(); }
    else if (i === 1) { LP.Audio.init(); LP.Audio.toggleMute(); LP.Audio.play('select'); }
    else if (i === 2) {
      if (cur.confirm) { LP.Save.reset(); cur.confirm = false; LP.Audio.play('break'); }
      else { cur.confirm = true; LP.Audio.play('locked'); }
    }
    if (cur.sel !== 2) cur.confirm = false;
  }
  function goMap(select) { open('map', select !== undefined ? { select } : undefined); }

  // =================== WORLD MAP ===================
  function nodePos(i) {
    const L = LP.LEVELS[i];
    let k = 0; for (let j = 0; j < i; j++) if (LP.LEVELS[j].world === L.world) k++;
    const x = 260 + L.world * 620 + k * 180;
    const y = 360 + Math.sin(i * 1.3) * 60;
    return { x, y };
  }
  const WORLD_ART = [
    (c, x, y, tt) => { A.crib(c, x, y, 0.5); A.teddy(c, x, y - 20, 0.8, tt); },
    (c, x, y, tt) => { A.gnome(c, x, y, 1, tt, { s: 0.45 }); },
    (c, x, y, tt) => { c.save(); c.translate(x, y); c.scale(0.28, 0.28); A.swan(c, 0, 0, tt); c.restore(); },
    (c, x, y, tt) => { A.cat(c, x, y, -1, tt, { s: 0.45, bobo: true }); },
  ];

  function drawMap(c) {
    const w = W();
    const bg = c.createLinearGradient(0, 0, 0, VH);
    bg.addColorStop(0, '#2b1f5a'); bg.addColorStop(1, '#5a3f8f');
    c.fillStyle = bg; c.fillRect(0, 0, w, VH);
    for (let i = 0; i < 80; i++) { c.fillStyle = `rgba(255,255,255,${0.2 + 0.3 * Math.sin(t + i)})`; c.fillRect((U.hash(i, 1) * 2400 - mapCam * 0.2) % w, U.hash(i, 2) * VH, 2, 2); }
    const target = nodePos(mapSel).x - w / 2;
    mapCam += (target - mapCam) * Math.min(1, (g().lastDt || 0.016) * 6);
    c.save(); c.translate(-mapCam, 0);
    // the 4 world islands
    LP.WORLDS.forEach((Wd, wi) => {
      const th = LP.THEMES[Wd.theme];
      const x0 = 120 + wi * 620, open = LP.Save.worldOpen(wi);
      const gr = c.createLinearGradient(0, 130, 0, 600);
      gr.addColorStop(0, th.sky[0]); gr.addColorStop(0.6, th.sky[1]); gr.addColorStop(1, th.sky[2]);
      c.fillStyle = gr; c.beginPath(); c.roundRect(x0, 130, 580, 470, 40); c.fill();
      c.fillStyle = th.top; c.beginPath(); c.roundRect(x0, 520, 580, 80, [0, 0, 40, 40]); c.fill();
      c.fillStyle = th.body; c.beginPath(); c.roundRect(x0, 548, 580, 52, [0, 0, 40, 40]); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 4; c.beginPath(); c.roundRect(x0, 130, 580, 470, 40); c.stroke();
      H().text(c, `WORLD ${wi + 1}: ${Wd.name.toUpperCase()}`, x0 + 290, 168, 30, '#ffffff', 'center');
      WORLD_ART[wi](c, x0 + 490, 520, t);
      if (!open) {
        c.fillStyle = 'rgba(20,10,40,0.55)'; c.beginPath(); c.roundRect(x0, 130, 580, 470, 40); c.fill();
        A.duck(c, x0 + 250, 470, 1.6, 0, t);
        H().text(c, `x ${Wd.ducks} ducks to open`, x0 + 330, 466, 26, '#ffe14a', 'center');
      }
    });
    // the path
    c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 6; c.setLineDash([4, 14]); c.lineCap = 'round';
    c.beginPath();
    LP.LEVELS.forEach((L, i) => { const p = nodePos(i); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); });
    c.stroke(); c.setLineDash([]);
    // the level dots
    cur.nodes = [];
    LP.LEVELS.forEach((L, i) => {
      const p = nodePos(i), rec = LP.Save.lvl(L.id), un = LP.Save.unlocked(i), on = i === mapSel;
      const r = on ? 40 : 34;
      c.fillStyle = 'rgba(0,0,0,0.25)'; A.ell(c, p.x, p.y + r * 0.8, r, 10); c.fill();
      c.fillStyle = !un ? '#7a7590' : rec.done ? '#ffd23f' : '#ffffff';
      A.circle(c, p.x, p.y, r); c.fill();
      c.strokeStyle = on ? '#ff5a8a' : '#4a1e3a'; c.lineWidth = on ? 6 : 4; A.circle(c, p.x, p.y, r); c.stroke();
      if (!un) {
        c.fillStyle = '#4a4560'; c.fillRect(p.x - 11, p.y - 4, 22, 18);
        c.strokeStyle = '#4a4560'; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y - 6, 8, Math.PI, 0); c.stroke();
      } else {
        const label = L.type === 'boss' ? '!' : L.type === 'chase' ? '>>' : L.id;
        H().text(c, label, p.x, p.y + 2, L.type === 'normal' ? 22 : 28, L.type === 'boss' ? '#e8345a' : '#4a1e3a', 'center', 0);
      }
      if (L.type === 'normal') {
        for (let k = 0; k < 3; k++) {
          c.globalAlpha = rec.ducks[k] ? 1 : 0.3;
          A.duck(c, p.x - 26 + k * 26, p.y + r + 26, 0.7, 0, 0);
        }
        c.globalAlpha = 1;
      }
      if (rec.medal) medal(c, p.x + r * 0.75, p.y - r * 0.75, rec.medal, 0.6);
      cur.nodes.push({ x: p.x - mapCam - r, y: p.y - r, w: r * 2, h: r * 2 });
    });
    // Plut standing on the chosen level
    const sp = nodePos(mapSel);
    A.plut(c, sp.x, sp.y - 40 - Math.abs(Math.sin(t * 4)) * 10, { anim: 'idle', animT: t, facing: 1, sx: 1.1, sy: 1.1, time: t, idleT: (t % 8) > 5 ? 5 : 0 });
    c.restore();

    // info at the bottom
    const L = LP.LEVELS[mapSel], rec = LP.Save.lvl(L.id), un = LP.Save.unlocked(mapSel);
    c.fillStyle = 'rgba(20,10,40,0.8)'; c.beginPath(); c.roundRect(w / 2 - 330, VH - 104, 660, 88, 24); c.fill();
    H().text(c, `${L.id}  ${L.name}`, w / 2, VH - 76, 32, '#ffffff', 'center');
    let info;
    if (!un) {
      const need = LP.WORLDS[L.world].ducks, have = LP.Save.totalDucks();
      info = have < need ? `Free ${need - have} more rubber ducks to open this world!` : 'Finish the level before this one first!';
    } else if (L.type === 'chase') info = 'CHASE! Run and don\'t look back!' + (rec.done ? '   ✔ done' : '');
    else if (L.type === 'boss') info = 'BOSS FIGHT!' + (rec.done ? '   ✔ beaten' : '');
    else info = `Best milk: ${rec.milk}   ·   Ducks: ${rec.ducks.filter(Boolean).length}/3   ·   ${['no medal yet', 'bronze bottle', 'silver bottle', 'GOLD bottle'][rec.medal]}`;
    H().text(c, info, w / 2, VH - 38, 20, un ? '#ffe7a0' : '#ff9ab0', 'center');
    A.duck(c, 40, 44, 1.2, 0, t);
    H().text(c, `x ${LP.Save.totalDucks()}`, 66, 40, 30, '#ffe14a');
    H().text(c, '← → choose   ENTER play   ESC title', w - 20, 36, 18, 'rgba(255,255,255,0.8)', 'right', 4);
  }
  function updateMap() {
    const n = LP.LEVELS.length;
    if (I.take('right') || I.take('down')) { if (mapSel < n - 1) { mapSel++; LP.Audio.play('menu'); } }
    if (I.take('left') || I.take('up')) { if (mapSel > 0) { mapSel--; LP.Audio.play('menu'); } }
    if (I.take('pause')) { open('title'); return; }
    let go = I.take('ok') || I.take('attack');
    const click = I.takeClick();
    if (click && cur.nodes) {
      const x = click.x * W(), y = click.y * VH;
      const i = cur.nodes.findIndex((b) => x > b.x && x < b.x + b.w && y > b.y && y < b.y + b.h);
      if (i >= 0) { if (i === mapSel) go = true; else { mapSel = i; LP.Audio.play('menu'); } }
    }
    if (go) {
      if (!LP.Save.unlocked(mapSel)) { LP.Audio.play('locked'); return; }
      LP.Audio.play('select');
      playLevel(mapSel);
    }
  }
  function playLevel(i) {
    const L = LP.LEVELS[i];
    if (L.storyBefore && !LP.Save.data.seen[L.storyBefore]) {
      LP.Save.data.seen[L.storyBefore] = true; LP.Save.write();
      open('story', { story: L.storyBefore, then: () => g().startLevel(i) });
    } else g().startLevel(i);
  }

  // =================== STORY ===================
  function drawStory(c) {
    const w = W();
    c.fillStyle = '#1a0f2a'; c.fillRect(0, 0, w, VH);
    const pages = LP.STORY[cur.story] || [];
    const pg = pages[cur.page];
    if (!pg) return;
    const pw = Math.min(w - 60, 1040), ph = 440, px = (w - pw) / 2, py = 40;
    const k = Math.min(1, cur.pt * 4);
    c.save();
    c.globalAlpha = k;
    c.translate(0, (1 - k) * 20);
    // comic panel
    c.save();
    c.beginPath(); c.roundRect(px, py, pw, ph, 18); c.clip();
    c.translate(px, py);
    LP.Scenes.draw(c, pg.scene, pw, ph, t);
    c.restore();
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.roundRect(px, py, pw, ph, 18); c.stroke();
    // words
    c.fillStyle = '#fff6e0'; c.beginPath(); c.roundRect(px + 20, py + ph + 20, pw - 40, 150, 18); c.fill();
    c.strokeStyle = '#4a1e3a'; c.lineWidth = 4; c.stroke();
    c.font = `700 27px ${LP.FONT}`;
    const lines = H().wrap(c, pg.text, pw - 100);
    c.fillStyle = '#3a1838'; c.textAlign = 'left'; c.textBaseline = 'top';
    // the words appear one letter at a time
    let shown = Math.floor(cur.pt * 60);
    lines.forEach((l, i) => { const s = l.slice(0, Math.max(0, shown)); shown -= l.length; c.fillText(s, px + 50, py + ph + 40 + i * 34); });
    c.restore();
    for (let i = 0; i < pages.length; i++) { c.fillStyle = i === cur.page ? '#ffd23f' : 'rgba(255,255,255,0.3)'; A.circle(c, w / 2 - (pages.length - 1) * 12 + i * 24, VH - 22, 6); c.fill(); }
    H().text(c, 'ENTER ▶     ESC skip', px + pw - 10, VH - 22, 18, 'rgba(255,255,255,0.8)', 'right', 4);
  }
  function updateStory(dt) {
    cur.pt += dt;
    const pages = LP.STORY[cur.story] || [];
    if (I.take('pause') || !pages.length) { finishStory(); return; }
    const click = I.takeClick();
    if (I.take('ok') || I.take('attack') || click) {
      const pg = pages[cur.page];
      if (pg && cur.pt * 60 < pg.text.length) { cur.pt = 100; return; }   // show all the words first
      cur.page++; cur.pt = 0; LP.Audio.play('page');
      if (cur.page >= pages.length) finishStory();
    }
  }
  function finishStory() { const then = cur.then; if (then) then(); else goMap(); }

  // =================== PAUSE ===================
  function drawPause(c) {
    const w = W();
    c.setTransform(g().scale, 0, 0, g().scale, 0, 0);
    c.fillStyle = 'rgba(20,10,40,0.65)'; c.fillRect(0, 0, w, VH);
    H().text(c, 'PAUSED', w / 2, 170, 72, '#ffd23f', 'center');
    cur.boxes = menu(c, ['CONTINUE', 'RESTART LEVEL', 'WORLD MAP', 'SOUND: ' + (LP.Audio.on ? 'ON' : 'OFF')], w / 2, 290, cur.sel);
    H().text(c, 'ARROWS move · SPACE jump · X slap · C scream · DOWN in the air = ground pound', w / 2, VH - 40, 18, 'rgba(255,255,255,0.85)', 'center', 4);
  }
  function updatePause() {
    if (I.take('pause')) { g().mode = 'play'; return; }
    const i = menuInput(4, cur.boxes);
    if (i === 0) { g().mode = 'play'; LP.Audio.play('select'); }
    else if (i === 1) { LP.Audio.play('select'); g().startLevel(g().levelIndex); }
    else if (i === 2) { LP.Audio.play('select'); goMap(g().levelIndex); }
    else if (i === 3) { LP.Audio.toggleMute(); }
  }

  // =================== LEVEL COMPLETE ===================
  function medal(c, x, y, m, s) {
    const col = ['#888', '#d08a4a', '#d8dce8', '#ffd23f'][m];
    c.save(); c.translate(x, y); c.scale(s || 1, s || 1);
    c.fillStyle = col; A.circle(c, 0, 0, 26); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 4; A.circle(c, 0, 0, 26); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.roundRect(-7, -12, 14, 26, 5); c.fill();
    c.fillStyle = col; c.fillRect(-7, -2, 14, 16);
    c.fillStyle = '#ffc4a0'; A.ell(c, 0, -17, 4, 5); c.fill();
    c.restore();
  }
  function drawComplete(c) {
    const G = g(), w = W();
    c.setTransform(G.scale, 0, 0, G.scale, 0, 0);
    c.fillStyle = 'rgba(20,10,40,0.6)'; c.fillRect(0, 0, w, VH);
    const k = U.backOut(Math.min(1, t * 2.5));
    c.save(); c.translate(w / 2, VH / 2); c.scale(k, k);
    c.fillStyle = '#fff6e0'; c.beginPath(); c.roundRect(-330, -230, 660, 460, 34); c.fill();
    c.strokeStyle = '#4a1e3a'; c.lineWidth = 6; c.stroke();
    H().text(c, G.def.type === 'boss' ? 'BOSS BEATEN!' : 'LEVEL COMPLETE!', 0, -175, 52, '#ff5a8a', 'center');
    H().text(c, G.def.name, 0, -122, 26, '#4a1e3a', 'center', 0);
    // milk counting up
    cur.count = Math.min(G.milk, cur.count + Math.max(1, G.milk / 60));
    A.milk(c, -90, -50, 0, false);
    H().text(c, `${Math.floor(cur.count)}`, -60, -48, 46, '#ffffff', 'left');
    if (G.totalMilk) H().text(c, `/ ${G.totalMilk}`, 40, -44, 26, '#8a6a9a', 'left', 0);
    if (t > 1.1) {
      medal(c, -110, 40, G.medal, 1.3);
      H().text(c, ['No medal. Get more milk!', 'BRONZE BOTTLE!', 'SILVER BOTTLE!', 'GOLD BOTTLE!'][G.medal], -60, 40, 28, ['#8a6a9a', '#d08a4a', '#8a92a8', '#e8a020'][G.medal], 'left', 0);
    }
    if (G.def.type === 'normal') {
      for (let i = 0; i < 3; i++) {
        const got = G.ducksFound[i] || LP.Save.levelDucks(G.levelIndex)[i];
        c.globalAlpha = got ? 1 : 0.25; A.duck(c, -60 + i * 60, 120, 1.6, 0, got ? t : 0); c.globalAlpha = 1;
      }
    }
    H().text(c, 'ENTER to continue', 0, 190, 24, '#4a1e3a', 'center', 0);
    c.restore();
  }
  function updateComplete() {
    if (t < 0.8) return;
    if (I.take('ok') || I.take('attack') || I.takeClick() || I.take('pause')) {
      LP.Audio.play('select');
      const G = g(), L = G.def, i = G.levelIndex;
      const next = Math.min(i + 1, LP.LEVELS.length - 1);
      if (L.storyAfter && (G.firstTime || L.storyAfter === 'ending')) {
        const last = i === LP.LEVELS.length - 1;
        open('story', { story: L.storyAfter, then: () => last ? open('credits') : goMap(next) });
      } else goMap(next);
    }
  }

  // =================== THE END ===================
  function drawCredits(c) {
    const w = W();
    const gr = c.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, '#ff9ac0'); gr.addColorStop(1, '#ffd88a');
    c.fillStyle = gr; c.fillRect(0, 0, w, VH);
    for (let i = 0; i < 14; i++) { const k = (t * 0.2 + i / 14) % 1; A.duck(c, U.hash(i, 3) * w, VH + 40 - k * (VH + 80), 1.4, Math.sin(t * 3 + i) * 0.3, t); }
    H().text(c, 'THE END', w / 2, 120, 96, '#ffffff', 'center');
    A.plut(c, w / 2 - 80, 420, { anim: 'scream', animT: t, facing: 1, sx: 2.6, sy: 2.6, time: t });
    A.teddy(c, w / 2 + 90, 420, 2.4, t);
    H().text(c, `Rubber ducks saved: ${LP.Save.totalDucks()} / 24`, w / 2, 500, 32, '#4a1e3a', 'center', 0);
    H().text(c, 'A game made by YOU and Claude', w / 2, 560, 28, '#ffffff', 'center');
    H().text(c, 'Can you find all the ducks and get every GOLD bottle?', w / 2, 610, 22, '#4a1e3a', 'center', 0);
    H().text(c, 'ENTER', w / 2, VH - 40, 22, '#ffffff', 'center');
  }
  function updateCredits() {
    if (t > 1 && (I.take('ok') || I.take('pause') || I.takeClick())) goMap(LP.LEVELS.length - 1);
  }

  function update(dt) {
    t += dt;
    if (!cur) return;
    ({ title: updateTitle, map: updateMap, story: updateStory, pause: updatePause, complete: updateComplete, credits: updateCredits })[cur.name](dt);
  }
  function draw(c) {
    if (!cur) return;
    c.setTransform(g().scale, 0, 0, g().scale, 0, 0);
    ({ title: drawTitle, map: drawMap, story: drawStory, pause: drawPause, complete: drawComplete, credits: drawCredits })[cur.name](c);
  }

  return { open, update, draw, playLevel, resized() { titleBG = false; } };
})();
