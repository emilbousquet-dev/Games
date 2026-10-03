// ============================================================
//  LIL' PLUT ODYSSEY — THE STORY 📖
//  Comic panels shown before and after some levels.
//  Change the words to tell your own story!
//  scene = which picture is drawn (see LP.Scenes below)
// ============================================================
window.LP = window.LP || {};

LP.STORY = {
  intro: [
    { scene: 'nursery', text: 'This is PLUT. The most ANNOYING baby in the whole world.' },
    { scene: 'annoying', text: 'Plut screams. Plut throws spaghetti. Plut bites the cat\'s tail. Every. Single. Day.' },
    { scene: 'catsteal', text: 'One night, the cat, MR. WHISKERS, had enough. He sneaked into the room and stole Plut\'s teddy bear... BOBO!' },
    { scene: 'catrun', text: '"Hee hee hee! Bye-bye, stinky baby!" And he jumped out of the window.' },
    { scene: 'plutangry', text: 'Nobody takes BOBO. Plut climbs out of the crib. THE ODYSSEY BEGINS!' },
  ],
  garden: [
    { scene: 'garden', text: 'Muddy paw prints lead out to THE GARDEN. Plut follows them...' },
  ],
  gnome: [
    { scene: 'gnome', text: '"NONE SHALL PASS!" shouts the Garden Gnome. "This is MY garden, baby!"' },
    { scene: 'gnome', text: 'Plut sticks out his tongue. Pfffbbbt! IT\'S ON!' },
  ],
  gnomeBeaten: [
    { scene: 'gnomeBeaten', text: 'The gnome is beaten! "Th-the cat went to the PARK," he mumbles.' },
  ],
  park: [
    { scene: 'park', text: 'At the park, the sun is going down. The ducks say the cat ran past the pond... but watch out for the ANGRY SWAN.' },
  ],
  city: [
    { scene: 'city', text: 'Night falls on THE CITY. High above the rooftops, Plut sees a cat... and the big CLOCK TOWER.' },
  ],
  tower: [
    { scene: 'tower', text: 'There he is! MR. WHISKERS, on top of the clock tower, with BOBO!' },
    { scene: 'tower', text: '"You will NEVER get him back, you stinky baby! MEOW HA HA!"' },
  ],
  ending: [
    { scene: 'hug', text: 'Plut got BOBO back! HOORAY!' },
    { scene: 'home', text: 'Plut and Bobo go home, climb into the crib and fall asleep. So sweet. So quiet...' },
    { scene: 'waaah', text: '...WAAAAAAAAH!!! (Plut is still the most annoying baby in the world.) THE END!' },
  ],
};

// ---------- the pictures for each story panel ----------
LP.Scenes = (function () {
  const A = LP.Art, U = LP.U;

  function sky(c, w, h, a, b) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, a); g.addColorStop(1, b);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  }
  function room(c, w, h, t) {
    sky(c, w, h, '#2e2457', '#4a3a78');
    for (let x = 0; x < w; x += 50) { c.fillStyle = 'rgba(255,255,255,0.04)'; c.fillRect(x, 0, 25, h); }
    c.fillStyle = '#3a2b5e'; c.fillRect(0, h - 70, w, 70);
    c.fillStyle = '#93593a'; c.fillRect(0, h - 30, w, 30);
  }
  function windowMoon(c, x, y, open) {
    c.fillStyle = '#0d1240'; c.fillRect(x, y, 150, 180);
    c.fillStyle = '#fff4c2'; c.shadowColor = '#fff7c0'; c.shadowBlur = 30; A.circle(c, x + 100, y + 55, 28); c.fill(); c.shadowBlur = 0;
    c.fillStyle = '#fff'; for (let i = 0; i < 12; i++) c.fillRect(x + U.hash(i, 5) * 150, y + U.hash(i, 6) * 170, 2, 2);
    c.strokeStyle = '#e9e1f5'; c.lineWidth = 8;
    if (open) { c.strokeRect(x, y, 150, 180); c.fillStyle = '#e9e1f5'; c.fillRect(x - 60, y, 50, 180); }
    else { c.strokeRect(x, y, 150, 180); c.beginPath(); c.moveTo(x + 75, y); c.lineTo(x + 75, y + 180); c.moveTo(x, y + 90); c.lineTo(x + 150, y + 90); c.stroke(); }
  }
  function pl(c, x, y, s, anim, t, extra) {
    c.save(); c.translate(x, y); c.scale(s, s);
    A.plut(c, 0, 0, Object.assign({ anim, animT: t % 1, facing: 1, sx: 1, sy: 1, time: t, runPhase: t * 8, idleT: 0 }, extra || {}));
    c.restore();
  }
  function bubble(c, x, y, text, size) {
    c.font = `800 ${size || 26}px ${LP.FONT}`;
    const w = c.measureText(text).width + 30;
    c.fillStyle = '#fff'; c.beginPath(); c.roundRect(x - w / 2, y - 26, w, 48, 20); c.fill();
    c.beginPath(); c.moveTo(x - 10, y + 20); c.lineTo(x - 22, y + 44); c.lineTo(x + 8, y + 20); c.fill();
    c.fillStyle = '#2a1840'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, x, y - 1);
  }
  function garden(c, w, h, t) {
    sky(c, w, h, '#3aa6f0', '#d6f6ff');
    c.fillStyle = '#fffbe0'; A.circle(c, w - 120, 80, 44); c.fill();
    c.fillStyle = '#86cfa0'; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 20) c.lineTo(x, h - 150 + Math.sin(x * 0.01) * 30); c.lineTo(w, h); c.fill();
    c.fillStyle = '#e8c79c'; for (let x = 0; x < w; x += 40) c.fillRect(x + 6, h - 170, 28, 120);
    c.fillStyle = '#5ccf48'; c.fillRect(0, h - 60, w, 60);
    c.fillStyle = '#7b4a2b'; c.fillRect(0, h - 30, w, 30);
  }

  const S = {
    nursery(c, w, h, t) {
      room(c, w, h, t); windowMoon(c, w - 220, 50, false);
      A.crib(c, w * 0.42, h - 30, 1.3);
      pl(c, w * 0.42, h - 82, 2.2, 'idle', t, { idleT: 5 });
      A.teddy(c, w * 0.42 + 70, h - 80, 1.2, t);
    },
    annoying(c, w, h, t) {
      sky(c, w, h, '#ffe0b0', '#ffb0a0');
      c.fillStyle = '#c8955a'; c.fillRect(0, h - 40, w, 40);
      pl(c, w * 0.3, h - 40, 2.4, 'scream', t);
      // flying spaghetti
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.8 + i / 6) % 1;
        c.strokeStyle = '#ffd25a'; c.lineWidth = 5;
        c.beginPath(); const sx = w * 0.36 + k * w * 0.35, sy = h * 0.4 - Math.sin(k * Math.PI) * 120;
        c.moveTo(sx, sy); c.quadraticCurveTo(sx + 20, sy - 20, sx + 30, sy + 10); c.stroke();
        c.fillStyle = '#e83a3a'; A.circle(c, sx + 10, sy, 6); c.fill();
      }
      A.cat(c, w * 0.75, h - 40, -1, t, { hiss: true, s: 1 });
      c.fillStyle = '#ffd25a'; c.fillRect(w * 0.75 - 70, h - 180, 40, 8);
    },
    catsteal(c, w, h, t) {
      room(c, w, h, t); windowMoon(c, w - 220, 50, false);
      A.crib(c, w * 0.3, h - 30, 1.3);
      pl(c, w * 0.3, h - 82, 2.2, 'hurt', t);
      c.font = `800 34px ${LP.FONT}`; c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.fillText('z z z', w * 0.3 + 70, 70 + Math.sin(t * 2) * 6);
      A.cat(c, w * 0.66 + Math.sin(t) * 10, h - 30, -1, t, { bobo: true, s: 1.1, crouch: 0.5 });
    },
    catrun(c, w, h, t) {
      room(c, w, h, t); windowMoon(c, w * 0.5, 40, true);
      A.cat(c, w * 0.5 + 60, 260 - Math.sin(t * 3) * 20, 1, t, { bobo: true, run: true, s: 0.9 });
      bubble(c, w * 0.32, 90, 'HEE HEE HEE!');
    },
    plutangry(c, w, h, t) {
      sky(c, w, h, '#ff9a3c', '#ff4f6a');
      c.save(); c.translate(w / 2, h / 2);
      for (let i = 0; i < 24; i++) { c.rotate(Math.PI * 2 / 24); c.fillStyle = i % 2 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'; c.beginPath(); c.moveTo(0, 0); c.lineTo(-40, -900); c.lineTo(40, -900); c.fill(); }
      c.restore();
      A.crib(c, w * 0.5, h + 40, 1.6);
      pl(c, w * 0.5, h - 40, 3.6, 'wall', t);
      bubble(c, w * 0.72, 80, 'BOBO!!!', 34);
    },
    garden(c, w, h, t) {
      garden(c, w, h, t);
      pl(c, w * 0.2, h - 60, 2, 'run', t);
      c.fillStyle = 'rgba(90,50,20,0.6)';
      for (let i = 0; i < 6; i++) { const x = w * 0.32 + i * 70, y = h - 46 + (i % 2) * 8; A.circle(c, x, y, 7); c.fill(); for (let k = -1; k <= 1; k++) { A.circle(c, x + k * 7, y - 9, 3); c.fill(); } }
      A.cat(c, w * 0.88, h - 60, 1, t, { bobo: true, run: true, s: 0.5 });
    },
    gnome(c, w, h, t) {
      garden(c, w, h, t);
      pl(c, w * 0.25, h - 60, 2.2, 'idle', t, { idleT: 5 });
      A.gnome(c, w * 0.68, h - 60, -1, t, { s: 1.3 });
      bubble(c, w * 0.5, 70, 'NONE SHALL PASS!');
    },
    gnomeBeaten(c, w, h, t) {
      garden(c, w, h, t);
      pl(c, w * 0.3, h - 60, 2.2, 'win', t);
      A.gnome(c, w * 0.68, h - 60, -1, t, { s: 1.1, dizzy: true, squash: 0.5 });
      A.stunStars(c, w * 0.68, h - 240, t);
    },
    park(c, w, h, t) {
      sky(c, w, h, '#3f347e', '#ffcf73');
      c.fillStyle = '#fff0b0'; A.circle(c, w * 0.6, h * 0.6, 60); c.fill();
      c.fillStyle = '#7a4f9a'; c.fillRect(0, h * 0.62, w, h);
      c.fillStyle = 'rgba(255,230,160,0.5)'; for (let i = 0; i < 20; i++) c.fillRect(U.hash(i, 1) * w, h * 0.64 + U.hash(i, 2) * h * 0.3, 40, 3);
      c.fillStyle = '#41264f'; c.fillRect(0, h - 50, w, 50);
      pl(c, w * 0.18, h - 50, 2, 'idle', t);
      c.save(); c.translate(w * 0.72, h * 0.72); c.scale(0.5, 0.5); A.swan(c, 0, 0, t); c.restore();
      A.duck(c, w * 0.38, h * 0.68, 1.2, 0, t); A.duck(c, w * 0.44, h * 0.7, 1, 0, t);
    },
    city(c, w, h, t) {
      sky(c, w, h, '#050822', '#33246a');
      c.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i); c.fillRect(U.hash(i, 3) * w, U.hash(i, 4) * h * 0.6, 2, 2); } c.globalAlpha = 1;
      c.fillStyle = '#f4f1ff'; A.circle(c, w * 0.2, 80, 40); c.fill();
      for (let i = 0; i < 12; i++) { const bw = 70 + U.hash(i, 7) * 60, bh = 120 + U.hash(i, 8) * 160; c.fillStyle = '#1d1e4c'; c.fillRect(i * 90, h - bh, bw, bh); c.fillStyle = 'rgba(255,220,130,0.6)'; for (let k = 0; k < 6; k++) c.fillRect(i * 90 + 10 + (k % 3) * 20, h - bh + 20 + Math.floor(k / 3) * 30, 8, 12); }
      // clock tower
      c.fillStyle = '#272862'; c.fillRect(w * 0.72, 60, 90, h); c.beginPath(); c.moveTo(w * 0.72 - 10, 60); c.lineTo(w * 0.72 + 45, 0); c.lineTo(w * 0.72 + 100, 60); c.fill();
      c.fillStyle = '#ffe9a0'; A.circle(c, w * 0.72 + 45, 110, 30); c.fill();
      c.strokeStyle = '#272862'; c.lineWidth = 4; c.beginPath(); c.moveTo(w * 0.72 + 45, 110); c.lineTo(w * 0.72 + 45, 90); c.moveTo(w * 0.72 + 45, 110); c.lineTo(w * 0.72 + 60, 115); c.stroke();
      c.fillStyle = '#5c6278'; c.fillRect(0, h - 40, w * 0.5, 40);
      pl(c, w * 0.2, h - 40, 2, 'idle', t);
    },
    tower(c, w, h, t) {
      sky(c, w, h, '#050822', '#33246a');
      c.fillStyle = '#ffe9a0'; A.circle(c, w * 0.5, h * 0.42, 150); c.fill();
      c.strokeStyle = '#272862'; c.lineWidth = 10; c.beginPath(); c.moveTo(w * 0.5, h * 0.42); c.lineTo(w * 0.5, h * 0.42 - 110); c.moveTo(w * 0.5, h * 0.42); c.lineTo(w * 0.5 + 80, h * 0.42 + 20); c.stroke();
      c.fillStyle = '#5c6278'; c.fillRect(0, h - 40, w, 40);
      pl(c, w * 0.18, h - 40, 2, 'idle', t, { idleT: 5 });
      A.cat(c, w * 0.72, h - 40, -1, t, { bobo: true, hiss: true, s: 1.2 });
    },
    hug(c, w, h, t) {
      sky(c, w, h, '#ffb0d0', '#ffe0a0');
      for (let i = 0; i < 10; i++) { const k = (t * 0.3 + i / 10) % 1; A.heart(c, U.hash(i, 9) * w, h - k * h, t, 1.2); }
      pl(c, w * 0.45, h - 30, 3, 'win', t);
      A.teddy(c, w * 0.6, h - 50 - Math.abs(Math.sin(t * 9)) * 30, 2.2, t);
    },
    home(c, w, h, t) {
      room(c, w, h, t); windowMoon(c, w - 220, 50, false);
      A.crib(c, w * 0.45, h - 30, 1.3);
      pl(c, w * 0.42, h - 82, 2.2, 'hurt', 0);
      A.teddy(c, w * 0.42 + 60, h - 82, 1.1, t);
      c.font = `800 34px ${LP.FONT}`; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText('z z z', w * 0.45 + 90, 80 + Math.sin(t * 2) * 6);
    },
    waaah(c, w, h, t) {
      room(c, w, h, t);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) { const r = ((t * 300 + i * 120) % 480); c.strokeStyle = `rgba(255,220,120,${1 - r / 480})`; c.lineWidth = 10; A.circle(c, w * 0.45, h * 0.55, r); c.stroke(); }
      c.restore();
      A.crib(c, w * 0.45, h - 30, 1.3);
      pl(c, w * 0.45, h - 82, 2.6, 'scream', t);
      c.font = `800 64px ${LP.FONT}`; c.fillStyle = '#ffe14a'; c.textAlign = 'center'; c.strokeStyle = '#7a1e2e'; c.lineWidth = 8;
      c.save(); c.translate(w * 0.5, 80); c.rotate(Math.sin(t * 30) * 0.03); c.strokeText('WAAAAAAH!!!', 0, 0); c.fillText('WAAAAAAH!!!', 0, 0); c.restore();
    },
  };

  function draw(c, name, w, h, t) { (S[name] || S.nursery)(c, w, h, t); }
  return { draw };
})();
