// ============================================================
//  ATLANTIS DIVER — HUD (air gauge, depth, gold, bag, map...)
// ============================================================
AT.HUD = (function () {
  const U = AT.U, M = AT.PX_PER_M;
  let shownGold = 0, goldBump = 0, toasts = [], flyers = [], lowBeep = 0, banner = null;
  const icons = {};
  const FONT = "Nunito, 'Trebuchet MS', sans-serif", TITLE = 'Cinzel, Georgia, serif';

  function itemIcon(ch, seed) {
    const key = ch + (ch === '*' ? seed % 4 : '');
    if (!icons[key]) icons[key] = U.canvas(64, 64, (g) => { g.translate(32, 34); g.scale(1.3, 1.3); AT.Art.treasure(g, ch, seed, 1); });
    return icons[key];
  }

  // the big title when you swim into a new zone
  function zoneBanner(name, depth) { banner = { name, depth, t: 0 }; }

  function toast(text, color = '#fff') {
    if (toasts.some((t) => t.text === text)) return;
    toasts.push({ text, color, t: 0 });
    if (toasts.length > 3) toasts.shift();
  }
  // coins flying from the diver to the gold counter
  function fly(fromX, fromY, n) {
    for (let i = 0; i < n; i++) flyers.push({ x: fromX + U.rand(-20, 20), y: fromY + U.rand(-20, 20), t: -i * 0.05 });
  }

  function update(dt) {
    const S = AT.Shop.S;
    if (Math.abs(shownGold - S.gold) > 0.5) {
      const diff = S.gold - shownGold;
      shownGold += Math.sign(diff) * Math.max(1, Math.abs(diff) * dt * 4);
      if (Math.sign(S.gold - shownGold) !== Math.sign(diff)) shownGold = S.gold;
      goldBump = 1;
    }
    goldBump = Math.max(0, goldBump - dt * 3);
    toasts.forEach((t) => (t.t += dt));
    toasts = toasts.filter((t) => t.t < 3.4);
    flyers.forEach((f) => (f.t += dt));
    if (banner) { banner.t += dt; if (banner.t > 4) banner = null; }
    flyers = flyers.filter((f) => f.t < 0.9);
  }

  function draw(g, W, H, t, cam, scale) {
    const u = Math.min(W / 1280, H / 720) * 1.05;
    const D = AT.Diver.D, S = AT.Shop.S;
    const air = Math.max(0, D.air), maxA = AT.Diver.maxAir(), k = air / maxA;
    const depth = AT.Diver.depth();

    // ----- danger glow at the edges -----
    const low = k < 0.25 && !D.atSurface, over = D.overDepth > 0;
    if (low || over) {
      const p = 0.5 + 0.5 * Math.sin(t * (low ? 7 : 4));
      const gr = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.6);
      gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, `rgba(255,40,40,${0.18 + p * 0.25})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
      lowBeep -= 1 / 60;
      if (low && lowBeep <= 0) { AT.Audio.lowAir(); lowBeep = k < 0.12 ? 0.8 : 1.6; }
    }

    // ----- air gauge -----
    const gx = 78 * u, gy = 78 * u, R = 50 * u;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 12 * u;
    const ring = g.createLinearGradient(gx - R, gy - R, gx + R, gy + R);
    ring.addColorStop(0, '#f7dc8a'); ring.addColorStop(0.5, '#b8862b'); ring.addColorStop(1, '#6b4a12');
    g.fillStyle = ring; g.beginPath(); g.arc(gx, gy, R, 0, Math.PI * 2); g.fill();
    g.restore();
    const dial = g.createRadialGradient(gx - R * 0.3, gy - R * 0.3, 2, gx, gy, R);
    dial.addColorStop(0, '#16415e'); dial.addColorStop(1, '#061a2b');
    g.fillStyle = dial; g.beginPath(); g.arc(gx, gy, R * 0.83, 0, Math.PI * 2); g.fill();
    // ticks
    g.strokeStyle = 'rgba(200,230,255,0.45)'; g.lineWidth = 1.5 * u;
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
    for (let i = 0; i <= 10; i++) {
      const a = a0 + ((a1 - a0) * i) / 10;
      g.beginPath(); g.moveTo(gx + Math.cos(a) * R * 0.7, gy + Math.sin(a) * R * 0.7); g.lineTo(gx + Math.cos(a) * R * 0.78, gy + Math.sin(a) * R * 0.78); g.stroke();
    }
    const col = k < 0.2 ? (Math.sin(t * 10) > 0 ? '#ff5555' : '#ff9a9a') : k < 0.4 ? '#ffb347' : '#5ef0ff';
    g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 7 * u; g.lineCap = 'round';
    g.beginPath(); g.arc(gx, gy, R * 0.6, a0, a1); g.stroke();
    g.strokeStyle = col; g.shadowColor = col; g.shadowBlur = 10 * u;
    g.beginPath(); g.arc(gx, gy, R * 0.6, a0, a0 + (a1 - a0) * k); g.stroke();
    g.shadowBlur = 0;
    g.fillStyle = '#fff'; g.textAlign = 'center';
    g.font = `900 ${24 * u}px ${FONT}`; g.fillText(Math.ceil(air), gx, gy + 6 * u);
    g.font = `800 ${10 * u}px ${FONT}`; g.fillStyle = 'rgba(200,235,255,0.8)'; g.fillText('AIR', gx, gy + 22 * u);
    if (D.atSurface && k < 0.999) { g.fillStyle = '#9ff7c9'; g.fillText('REFILLING', gx, gy - 16 * u); }

    // ----- depth -----
    g.textAlign = 'left';
    const zone = AT.ZONES[AT.World.zoneAtY(D.y)];
    const tx = gx + R + 16 * u;
    g.font = `700 ${34 * u}px ${TITLE}`;
    g.lineWidth = 5 * u; g.strokeStyle = 'rgba(0,15,30,0.6)';
    const dtxt = `${Math.floor(depth)} m`;
    g.strokeText(dtxt, tx, gy + 2 * u); g.fillStyle = '#fff'; g.fillText(dtxt, tx, gy + 2 * u);
    g.font = `800 ${14 * u}px ${FONT}`;
    g.strokeText(zone.name.toUpperCase(), tx, gy + 24 * u);
    g.fillStyle = '#ffe08a'; g.fillText(zone.name.toUpperCase(), tx, gy + 24 * u);
    const lim = AT.Shop.val('suit');
    g.font = `700 ${12 * u}px ${FONT}`;
    g.fillStyle = over ? '#ff8080' : 'rgba(210,235,255,0.75)';
    const ltxt = over ? `⚠ TOO DEEP! Suit is safe to ${lim} m` : `Suit safe to ${lim} m`;
    g.strokeText(ltxt, tx, gy + 42 * u); g.fillText(ltxt, tx, gy + 42 * u);

    // ----- gold -----
    g.textAlign = 'right';
    const bump = 1 + goldBump * 0.15;
    g.font = `900 ${30 * u * bump}px ${FONT}`;
    const gtxt = U.fmt(shownGold);
    g.lineWidth = 5 * u; g.strokeText(gtxt, W - 30 * u, 56 * u);
    g.fillStyle = '#ffd966'; g.fillText(gtxt, W - 30 * u, 56 * u);
    const cw = g.measureText(gtxt).width;
    coin(g, W - 52 * u - cw, 45 * u, 13 * u);
    g.textAlign = 'right';
    g.font = `700 ${12 * u}px ${FONT}`; g.fillStyle = 'rgba(210,235,255,0.75)';
    g.fillText(`Tablets ${S.tablets.length}/12  ·  Creatures ${S.journal.length}/${Object.keys(AT.Creatures.INFO).length}`, W - 30 * u, 78 * u);

    // ----- bag -----
    const n = AT.Shop.val('bag'), sz = 40 * u, gap = 6 * u;
    const bw = n * sz + (n - 1) * gap, bx = W / 2 - bw / 2, by = H - sz - 22 * u;
    g.fillStyle = 'rgba(0,15,30,0.45)'; U.rr(g, bx - 12 * u, by - 26 * u, bw + 24 * u, sz + 38 * u, 14 * u); g.fill();
    g.font = `800 ${12 * u}px ${FONT}`; g.textAlign = 'center'; g.fillStyle = D.bag.length >= n ? '#ff9a9a' : 'rgba(220,240,255,0.85)';
    const bagVal = D.bag.reduce((s, b) => s + b.value, 0);
    g.fillText(`BAG ${D.bag.length}/${n}${bagVal ? '  ·  worth ' + U.fmt(bagVal) : ''}${D.bag.length >= n ? '  ·  FULL!' : ''}`, W / 2, by - 8 * u);
    for (let i = 0; i < n; i++) {
      const x = bx + i * (sz + gap);
      g.fillStyle = 'rgba(120,200,255,0.12)'; g.strokeStyle = 'rgba(160,220,255,0.35)'; g.lineWidth = 1.5 * u;
      U.rr(g, x, by, sz, sz, 8 * u); g.fill(); g.stroke();
      const it = D.bag[i];
      if (it) g.drawImage(itemIcon(it.ch, it.id), x + 2 * u, by + 2 * u, sz - 4 * u, sz - 4 * u);
    }

    // ----- sonar arrows -----
    const range = AT.Shop.val('sonar');
    if (range) {
      const near = AT.World.items.filter((it) => !it.gone && !it.inBag && it.ch !== 'Y' && U.dist(it.x, it.y, D.x, D.y) < range)
        .sort((a, b) => U.dist(a.x, a.y, D.x, D.y) - U.dist(b.x, b.y, D.x, D.y)).slice(0, 3);
      const used = [];
      for (const it of near) {
        const sx = (it.x - cam.x) * scale, sy = (it.y - cam.y) * scale;
        if (sx > 0 && sx < W && sy > 0 && sy < H) {
          g.strokeStyle = `rgba(255,230,120,${0.5 + 0.4 * Math.sin(t * 5)})`; g.lineWidth = 2 * u;
          g.beginPath(); g.arc(sx, sy, (22 + Math.sin(t * 5) * 3) * u, 0, Math.PI * 2); g.stroke();
          continue;
        }
        const a = Math.atan2(sy - H / 2, sx - W / 2);
        if (used.some((b) => Math.abs(U.angleDiff(a, b)) < 0.25)) continue;
        used.push(a);
        const ex = U.clamp(W / 2 + Math.cos(a) * W, 40 * u, W - 40 * u), ey = U.clamp(H / 2 + Math.sin(a) * H, 160 * u, H - 110 * u);
        g.save(); g.translate(ex, ey); g.rotate(a);
        g.fillStyle = `rgba(255,220,100,${0.65 + 0.3 * Math.sin(t * 6)})`;
        g.beginPath(); g.moveTo(16 * u, 0); g.lineTo(-6 * u, -10 * u); g.lineTo(-2 * u, 0); g.lineTo(-6 * u, 10 * u); g.fill();
        g.restore();
        g.font = `800 ${11 * u}px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#ffe08a';
        g.fillText(Math.round(U.dist(it.x, it.y, D.x, D.y) / M) + ' m', ex - Math.cos(a) * 26 * u, ey - Math.sin(a) * 20 * u + 4 * u);
      }
    }

    // ----- prompt (near the boat) -----
    const prompt = AT.Game.prompt;
    if (prompt) {
      g.font = `800 ${17 * u}px ${FONT}`; g.textAlign = 'center';
      const w = g.measureText(prompt).width + 40 * u, y = by - 64 * u;
      g.fillStyle = 'rgba(0,20,40,0.6)'; U.rr(g, W / 2 - w / 2, y - 22 * u, w, 34 * u, 17 * u); g.fill();
      g.fillStyle = '#fff'; g.fillText(prompt, W / 2, y + 1 * u);
    }

    // ----- toasts -----
    toasts.forEach((tt, i) => {
      const a = Math.min(1, tt.t * 4, (3.4 - tt.t) * 2);
      g.globalAlpha = a;
      g.font = `800 ${19 * u}px ${FONT}`; g.textAlign = 'center';
      const w = g.measureText(tt.text).width + 44 * u, y = (banner ? H * 0.24 + 70 * u : 150 * u) + i * 46 * u - (1 - Math.min(1, tt.t * 4)) * 10 * u;
      g.fillStyle = 'rgba(4,24,48,0.72)'; U.rr(g, W / 2 - w / 2, y - 26 * u, w, 38 * u, 19 * u); g.fill();
      g.strokeStyle = 'rgba(255,224,138,0.5)'; g.lineWidth = 1.5 * u; g.stroke();
      g.fillStyle = tt.color; g.fillText(tt.text, W / 2, y);
      g.globalAlpha = 1;
    });
    if (low && !AT.Game.rescuing) {
      g.font = `900 ${26 * u}px ${FONT}`; g.textAlign = 'center';
      g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 8);
      g.lineWidth = 6 * u; g.strokeStyle = 'rgba(60,0,0,0.7)'; g.strokeText('LOW AIR! SWIM UP!', W / 2, H * 0.3);
      g.fillStyle = '#ff7070'; g.fillText('LOW AIR! SWIM UP!', W / 2, H * 0.3);
      g.globalAlpha = 1;
    }

    // ----- zone banner -----
    if (banner) {
      const a = Math.min(1, banner.t * 2, (4 - banner.t) * 1.5);
      const y = H * 0.24;
      g.save(); g.globalAlpha = Math.max(0, a); g.textAlign = 'center';
      g.font = `700 ${16 * u}px ${TITLE}`; g.fillStyle = '#bff6ff';
      g.fillText(`— ${banner.depth} METERS —`, W / 2, y - 44 * u);
      g.font = `900 ${58 * u}px ${TITLE}`;
      g.shadowColor = 'rgba(255,200,90,0.6)'; g.shadowBlur = 24 * u;
      const gr = g.createLinearGradient(0, y - 50 * u, 0, y + 6 * u);
      gr.addColorStop(0, '#fff6cf'); gr.addColorStop(0.5, '#ffd966'); gr.addColorStop(1, '#c98a1c');
      g.fillStyle = gr; g.fillText(banner.name.toUpperCase(), W / 2, y);
      g.shadowBlur = 0;
      const lw = Math.min(1, banner.t * 1.5) * 220 * u;
      g.strokeStyle = 'rgba(255,217,102,0.7)'; g.lineWidth = 2 * u;
      g.beginPath(); g.moveTo(W / 2 - lw, y + 18 * u); g.lineTo(W / 2 + lw, y + 18 * u); g.stroke();
      g.restore();
    }

    // ----- flying coins -----
    for (const f of flyers) {
      if (f.t < 0) continue;
      const k2 = U.smooth(Math.min(1, f.t / 0.8));
      const sx = (f.x - cam.x) * scale, sy = (f.y - cam.y) * scale;
      const ex = W - 60 * u, ey = 45 * u;
      const x = U.lerp(sx, ex, k2), y = U.lerp(sy, ey, k2) - Math.sin(k2 * Math.PI) * 120 * u;
      coin(g, x, y, 9 * u);
    }
  }

  function coin(g, x, y, r) {
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.6, '#f2c230'); gr.addColorStop(1, '#a8741a');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(120,70,10,0.8)'; g.lineWidth = Math.max(1, r * 0.12);
    g.beginPath(); g.arc(x, y, r * 0.68, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(140,90,10,0.8)'; g.font = `900 ${r * 1.1}px Cinzel, serif`; g.textAlign = 'center'; g.fillText('A', x, y + r * 0.4);
  }

  // ---------- the map screen ----------
  let mapImg = null;
  function buildMap() {
    const W = AT.World, ex = W.explored;
    mapImg = U.canvas(W.cols, W.rows, (g) => {
      const img = g.createImageData(W.cols, W.rows);
      const COL = { '#': [110, 118, 128], B: [235, 228, 212], G: [240, 196, 80], T: [80, 105, 160], R: [110, 240, 255], X: [120, 90, 200], '%': [200, 180, 150], b: [70, 80, 100], g: [110, 90, 50], t: [40, 55, 90], x: [60, 45, 100] };
      for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
        const i = (y * W.cols + x) * 4;
        if (!ex[y * W.cols + x]) { img.data[i + 3] = 0; continue; }
        const c = W.raw(x, y);
        const w = AT.Render.waterAt(y * 4);
        const rgb = COL[c] || [w[0] * 0.55, w[1] * 0.55, w[2] * 0.65];
        img.data[i] = rgb[0]; img.data[i + 1] = rgb[1]; img.data[i + 2] = rgb[2]; img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  function drawMap(g, W, H, t) {
    if (!mapImg) buildMap();
    const u = Math.min(W / 1280, H / 720);
    g.fillStyle = 'rgba(2,10,24,0.88)'; g.fillRect(0, 0, W, H);
    const px = Math.floor((H - 120 * u) / AT.World.rows * 10) / 10;
    const mw = AT.World.cols * px, mh = AT.World.rows * px;
    const mx = W / 2 - mw / 2, my = 70 * u;
    g.font = `700 ${30 * u}px ${TITLE}`; g.textAlign = 'center'; g.fillStyle = '#ffe08a';
    g.fillText('MAP OF ATLANTIS', W / 2, 48 * u);
    g.fillStyle = 'rgba(40,90,140,0.25)'; g.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    g.imageSmoothingEnabled = false;
    g.drawImage(mapImg, mx, my, mw, mh);
    g.imageSmoothingEnabled = true;
    g.strokeStyle = 'rgba(255,224,138,0.6)'; g.lineWidth = 2; g.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
    // zones and depth marks
    g.textAlign = 'left';
    for (const z of AT.ZONES) {
      const y = my + (z.from / 4) * px;
      g.strokeStyle = 'rgba(255,224,138,0.35)'; g.beginPath(); g.moveTo(mx - 4, y); g.lineTo(mx + mw + 14 * u, y); g.stroke();
      g.font = `800 ${14 * u}px ${FONT}`; g.fillStyle = '#ffe08a'; g.fillText(z.name, mx + mw + 20 * u, y + 16 * u);
      g.font = `700 ${12 * u}px ${FONT}`; g.fillStyle = 'rgba(200,230,255,0.7)'; g.fillText(z.from + ' m', mx + mw + 20 * u, y + 32 * u);
    }
    // suit limit
    const ly = my + (AT.Shop.val('suit') / 4) * px;
    g.strokeStyle = 'rgba(255,100,100,0.7)'; g.setLineDash([6, 4]); g.beginPath(); g.moveTo(mx - 30 * u, ly); g.lineTo(mx + mw, ly); g.stroke(); g.setLineDash([]);
    g.textAlign = 'right'; g.fillStyle = '#ff9a9a'; g.font = `800 ${12 * u}px ${FONT}`; g.fillText('suit limit', mx - 10 * u, ly - 5 * u);
    // tablets found, boat and you
    const S = AT.Shop.S;
    for (const it of AT.World.items) {
      if (it.ch !== '!' || !AT.World.explored[it.tx + it.ty * AT.World.cols]) continue;
      const found = S.tablets.includes(it.tablet);
      g.fillStyle = found ? '#5ef0ff' : 'rgba(94,240,255,0.35)';
      g.fillRect(mx + it.tx * px - 2, my + it.ty * px - 3, 5, 6);
    }
    g.fillStyle = '#c98a4a'; g.fillRect(mx + (AT.Game.BOAT_X / 48) * px - 8, my - 6, 16, 5);
    const D = AT.Diver.D;
    const dx = mx + (D.x / 48) * px, dy = my + (D.y / 48) * px;
    g.fillStyle = '#ff8a3d'; g.beginPath(); g.arc(dx, dy, 4 + Math.sin(t * 6) * 1.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
    g.textAlign = 'center'; g.font = `700 ${14 * u}px ${FONT}`; g.fillStyle = 'rgba(220,240,255,0.8)';
    g.fillText('You only see places you have explored  ·  press M or Esc to close', W / 2, H - 18 * u);
  }

  return { update, draw, toast, zoneBanner, fly, itemIcon, buildMap, drawMap, coin, resetMap() { mapImg = null; }, get shownGold() { return shownGold; }, set shownGold(v) { shownGold = v; } };
})();
