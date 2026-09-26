// ============================================================
//  LAB 13 — HUD (the stuff drawn on top of the 3D view)
// ============================================================
window.LAB = window.LAB || {};

LAB.HUD = (function () {
  const U = LAB.U;

  class HUD {
    constructor() {
      this.halves = [0, 1].map((i) => this.makeHalf(i));
      this.grain = document.getElementById('grain');
      this.grainG = this.grain.getContext('2d');
      this.grainT = 0;
    }

    makeHalf(i) {
      const el = document.createElement('div');
      el.className = 'half p' + (i + 1);
      el.innerHTML = `
        <canvas class="bloodfx"></canvas>
        <div class="lowhp"></div>
        <div class="flashfx"></div>
        <div class="stats">
          <div class="pname">${i === 0 ? 'P1 · DR. REYES' : 'P2 · OFFICER PARK'} <span class="dev"></span></div>
          <div class="bar hp"><i></i><b>HEALTH</b></div>
          <div class="bar bat"><i></i><b>FLASHLIGHT</b></div>
          <div class="bar sta"><i></i></div>
          <div class="inv"></div>
        </div>
        <div class="obj"></div>
        <div class="zone"></div>
        <div class="dot"></div>
        <div class="prompt"></div>
        <div class="msg"></div>
        <div class="note"><h3></h3><p></p><small>walk away or press USE to close</small></div>
        <div class="downed"><h2>YOU ARE DOWN</h2><p></p><div class="rev"><i></i></div></div>`;
      document.getElementById('hud').appendChild(el);
      const q = (s) => el.querySelector(s);
      const h = {
        el, hp: q('.hp i'), bat: q('.bat i'), sta: q('.sta i'), obj: q('.obj'), zone: q('.zone'), prompt: q('.prompt'), msg: q('.msg'),
        note: q('.note'), noteT: q('.note h3'), noteP: q('.note p'), downed: q('.downed'), downedP: q('.downed p'), rev: q('.rev i'),
        blood: q('.bloodfx'), lowhp: q('.lowhp'), flashEl: q('.flashfx'), dev: q('.dev'), inv: q('.inv'),
        msgT: 0, zoneT: 0, noteOpen: null, bloodAlpha: 0,
      };
      h.bg = h.blood.getContext('2d');
      return h;
    }

    layout(mode) {
      this.halves.forEach((h, i) => {
        h.el.style.display = i < mode ? 'block' : 'none';
        h.el.style.left = mode === 1 ? '0' : (i * 50) + '%';
        h.el.style.width = mode === 1 ? '100%' : '50%';
      });
      document.getElementById('divider').style.display = mode === 2 ? 'block' : 'none';
      this.resize();
    }
    resize() {
      this.halves.forEach((h) => { h.blood.width = h.el.clientWidth / 2 || 400; h.blood.height = h.el.clientHeight / 2 || 300; });
      this.grain.width = 256; this.grain.height = 256;
    }
    show(on) { document.getElementById('hud').style.display = on ? 'block' : 'none'; }

    message(i, text, time = 3.5) {
      const list = i === null || i === undefined ? [0, 1] : [i];
      list.forEach((k) => { const h = this.halves[k]; h.msg.textContent = text; h.msg.style.opacity = 1; h.msgT = time; });
    }
    zone(i, name) { const h = this.halves[i]; h.zone.textContent = '— ' + name + ' —'; h.zone.style.opacity = 1; h.zoneT = 3; }
    showNote(i, note) {
      const h = this.halves[i];
      h.noteT.textContent = note.title; h.noteP.textContent = note.text;
      h.note.style.display = 'block'; h.noteOpen = note;
    }
    closeNote(i) { const h = this.halves[i]; h.note.style.display = 'none'; h.noteOpen = null; }

    flash(i, color) {
      const f = this.halves[i].flashEl;
      f.style.transition = 'none'; f.style.background = color; f.style.opacity = 1;
      requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity 0.9s'; f.style.opacity = 0; }));
    }

    // blood dripping down your screen when you get hurt
    bloodSplat(i, amount) {
      const h = this.halves[i], g = h.bg, w = h.blood.width, hh = h.blood.height;
      const n = Math.ceil(amount / 8);
      for (let k = 0; k < n; k++) {
        const edge = Math.random() < 0.5;
        const x = edge ? (Math.random() < 0.5 ? U.rand(0, w * 0.2) : U.rand(w * 0.8, w)) : U.rand(0, w);
        const y = edge ? U.rand(0, hh) : (Math.random() < 0.5 ? U.rand(0, hh * 0.2) : U.rand(hh * 0.8, hh));
        LAB.Tex.splat(g, x, y, U.rand(10, 30), `rgba(${U.randInt(90, 140)},0,0,0.85)`, U.randInt(2, 5));
      }
      h.bloodAlpha = 1;
    }
    hands(i) {
      const h = this.halves[i], g = h.bg, w = h.blood.width, hh = h.blood.height;
      const cx = U.rand(w * 0.2, w * 0.8), cy = U.rand(hh * 0.2, hh * 0.7), s = U.rand(1.2, 2);
      g.save(); g.translate(cx, cy); g.scale(s, s); g.rotate(U.rand(-0.4, 0.4));
      g.fillStyle = 'rgba(110,0,0,0.9)';
      g.beginPath(); g.ellipse(0, 0, 20, 25, 0, 0, 7); g.fill();
      for (let f = 0; f < 4; f++) { g.beginPath(); g.ellipse(-16 + f * 11, -36, 5, 16, (f - 1.5) * 0.12, 0, 7); g.fill(); }
      g.beginPath(); g.ellipse(25, -4, 6, 14, 0.9, 0, 7); g.fill();
      for (let d = 0; d < 4; d++) g.fillRect(U.rand(-15, 15), 15, 3, U.rand(20, 60));
      g.restore();
      h.bloodAlpha = 1.4;
    }

    update(dt, game) {
      // film grain
      this.grainT -= dt;
      if (this.grainT <= 0) {
        this.grainT = 0.05;
        const g = this.grainG, img = g.createImageData(256, 256), d = img.data;
        for (let k = 0; k < d.length; k += 4) { const v = Math.random() * 255; d[k] = d[k + 1] = d[k + 2] = v; d[k + 3] = 38; }
        g.putImageData(img, 0, 0);
      }
      game.players.forEach((p, i) => {
        const h = this.halves[i];
        h.hp.style.width = p.hp + '%';
        h.bat.style.width = p.battery + '%';
        h.bat.parentNode.classList.toggle('off', !p.flashOn);
        h.sta.style.width = p.stamina + '%';
        h.dev.textContent = LAB.Input.pads[i] !== null && LAB.Input.pads[i] !== undefined ? '🎮' : (i === 0 && LAB.Input.mouse.locked ? '🖱' : '⌨');
        const t = game.team;
        h.inv.innerHTML = (t.keycard ? '<span class="k">KEYCARD</span>' : '') + (t.fuses ? `<span class="f">FUSE ×${t.fuses}</span>` : '');
        h.obj.textContent = game.objective();
        if (h.msgT > 0) { h.msgT -= dt; if (h.msgT <= 0) h.msg.style.opacity = 0; }
        if (h.zoneT > 0) { h.zoneT -= dt; if (h.zoneT <= 0) h.zone.style.opacity = 0; }
        h.lowhp.style.opacity = p.hp < 35 ? (0.35 + Math.sin(performance.now() / 180) * 0.25) * (1 - p.hp / 35) + 0.25 : 0;
        h.blood.style.opacity = Math.min(1, h.bloodAlpha);
        h.bloodAlpha = Math.max(0, h.bloodAlpha - dt * 0.12);
        if (h.bloodAlpha <= 0) h.bg.clearRect(0, 0, h.blood.width, h.blood.height);
        h.downed.style.display = p.downed ? 'flex' : 'none';
        if (p.downed) {
          h.downedP.textContent = game.players.length > 1 ? `Your partner must hold USE next to you! Bleeding out in ${Math.ceil(p.bleed)}...` : '';
          h.rev.style.width = (p.reviveT / 3 * 100) + '%';
        }
        h.prompt.textContent = game.promptFor(p);
        h.prompt.style.opacity = h.prompt.textContent ? 1 : 0;
        if (h.noteOpen && (p.input && p.input.usePressed)) this.closeNote(i);
      });
    }
  }
  return HUD;
})();
