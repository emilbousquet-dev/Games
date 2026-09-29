// ============================================================
//  ATLANTIS DIVER — SEA CREATURES
// ============================================================
AT.Creatures = (function () {
  const U = AT.U, T = AT.TILE;
  let list = [];

  // what the journal says about each creature
  const INFO = {
    clownfish: { name: 'Clownfish', text: 'Lives among the coral. Orange and white, just like a tiny clown!' },
    tang: { name: 'Blue Tang', text: 'Bright blue with a yellow tail. Always in a hurry.' },
    turtle: { name: 'Sea Turtle', text: 'Friendly and slow. Sea turtles can live for more than 100 years.' },
    sardine: { name: 'Silver Sardines', text: 'They swim in big shiny groups to confuse hungry fish.' },
    jelly: { name: 'Moon Jellyfish', text: 'Beautiful, but it stings! Touching it costs you air.' },
    crab: { name: 'Atlantean Crab', text: 'Guards its patch of floor with big claws. Stun it with your harpoon.' },
    butterfly: { name: 'Butterflyfish', text: 'Yellow and black. It loves the Golden Streets.' },
    eel: { name: 'Moray Eel', text: 'Hides in holes in the walls and snaps at anything that swims by.' },
    puffer: { name: 'Pufferfish', text: 'Puffs up into a spiky ball when you get too close.' },
    lantern: { name: 'Lanternfish', text: 'Tiny fish with glowing dots. They make their own light!' },
    angler: { name: 'Anglerfish', text: "Its glowing lure shines in the dark. Don't swim toward the light!" },
    shark: { name: 'Reef Shark', text: 'Patrols the Temple. A quick stun with the harpoon calms it down.' },
    tetra: { name: 'Crystal Tetra', text: 'Only lives near the Heart Crystal. It glows like a little star.' },
    serpent: { name: 'Guardian Serpent', text: "Poseidon's guardian. Stun it, then slip past while it rests." },
    dolphin: { name: 'Dolphin', text: 'Your best friend! It brings you back to the boat when you run out of air.' },
  };
  const SCHOOL = ['clownfish', 'sardine', 'butterfly', 'lantern', 'tetra'];

  function init() {
    list = [];
    for (const s of AT.World.spawns) {
      const c = { x: s.x, y: s.y, hx: s.x, hy: s.y, vx: 0, vy: 0, stun: 0, t: Math.random() * 10, face: 1, r: 16, ph: Math.random() * 6 };
      switch (s.ch) {
        case 'f': {
          let kind = SCHOOL[s.zone];
          if (s.zone === 0 && U.hash(s.tx, s.ty) > 0.5) kind = 'tang';
          const n = { clownfish: 7, tang: 8, sardine: 18, butterfly: 9, lantern: 12, tetra: 14 }[kind];
          c.type = 'school'; c.kind = kind; c.fish = [];
          for (let i = 0; i < n; i++) c.fish.push({ x: s.x + U.rand(-50, 50), y: s.y + U.rand(-30, 30), vx: U.rand(-40, 40), vy: U.rand(-20, 20), ph: Math.random() * 6, sz: U.rand(0.85, 1.15) });
          break;
        }
        case 'v': c.type = 'turtle'; c.r = 26; break;
        case 'j': c.type = 'jelly'; c.r = 20; c.hurt = 7; c.hue = U.hash(s.tx, s.ty) > 0.5 ? [255, 140, 220] : [160, 150, 255]; break;
        case 'r': {
          c.type = 'crab'; c.r = 14; c.hurt = 6; c.dir = 1;
          let ty = s.ty;
          while (!AT.World.solid(s.tx, ty + 1) && ty < s.ty + 6) ty++;
          c.y = c.hy = ty * T + T - 12;
          break;
        }
        case 'e': {
          c.type = 'eel'; c.r = 13; c.hurt = 10; c.ext = 0.1; c.state = 'hide'; c.timer = 0;
          c.dir = AT.World.solid(s.tx - 1, s.ty) ? 1 : -1;
          c.ax = c.dir === 1 ? s.tx * T : s.tx * T + T;
          c.ay = s.y;
          break;
        }
        case 'p': c.type = 'puffer'; c.r = 12; c.hurt = 8; c.puff = 0; break;
        case 'a': c.type = 'angler'; c.r = 18; c.hurt = 12; c.cool = 0; break;
        case 's': c.type = 'shark'; c.r = 28; c.hurt = 15; c.dir = 1; c.mode = 'patrol'; c.timer = 0; break;
        case 'Z': {
          c.type = 'serpent'; c.r = 26; c.hurt = 18;
          c.segs = [];
          for (let i = 0; i < 28; i++) c.segs.push({ x: s.x - i * 20, y: s.y });
          break;
        }
        default: continue;
      }
      c.info = c.type === 'school' ? c.kind : c.type;
      list.push(c);
    }
  }

  const D = () => AT.Diver.D;
  function touching(c, r) {
    const d = D();
    return U.dist(c.x, c.y, d.x, d.y) < r + AT.Diver.RADIUS;
  }

  function update(dt, t) {
    const d = D();
    for (const c of list) {
      const far = Math.abs(c.x - d.x) > 1500 || Math.abs(c.y - d.y) > 1100;
      if (far && c.type !== 'school') continue;
      if (far && c.type === 'school' && Math.abs(c.hy - d.y) > 1300) continue;
      c.t += dt;
      if (c.stun > 0) {
        c.stun -= dt;
        if (Math.random() < dt * 6) AT.Render.sparks(c.x + U.rand(-10, 10), c.y - c.r, 1, [255, 240, 120], 30);
        if (c.type === 'serpent') updateSerpentBody(c);
        if (c.type === 'shark') { c.vy = 20; c.y += c.vy * dt; AT.World.collide(c, 20); }
        continue;
      }
      // meeting a new creature adds it to the journal
      if (!far && U.dist(c.x, c.y, d.x, d.y) < 190) AT.Game.discover(c.info);
      UPD[c.type](c, dt, t, d);
    }
  }

  const UPD = {
    school(c, dt, t, d) {
      const f = c.fish;
      let cx = 0, cy = 0, ax = 0, ay = 0;
      for (const p of f) { cx += p.x; cy += p.y; ax += p.vx; ay += p.vy; }
      cx /= f.length; cy /= f.length; ax /= f.length; ay /= f.length;
      c.x = cx; c.y = cy;
      for (const p of f) {
        let fx = (cx - p.x) * 0.6 + (ax - p.vx) * 0.5, fy = (cy - p.y) * 0.6 + (ay - p.vy) * 0.5;
        for (const q of f) {
          if (q === p) continue;
          const dx = p.x - q.x, dy = p.y - q.y, dd = dx * dx + dy * dy;
          if (dd < 400 && dd > 0.01) { fx += (dx / dd) * 900; fy += (dy / dd) * 900; }
        }
        // wander around home
        const hx = c.hx + Math.sin(c.t * 0.21 + c.ph) * 200, hy = c.hy + Math.sin(c.t * 0.33 + c.ph) * 60;
        fx += (hx - p.x) * 0.25; fy += (hy - p.y) * 0.25;
        // run away from the diver!
        const dx = p.x - d.x, dy = p.y - d.y, dd = Math.hypot(dx, dy);
        let flee = false;
        if (dd < 140) { fx += (dx / dd) * 900; fy += (dy / dd) * 900; flee = true; }
        // don't swim into walls or out of the water
        if (AT.World.solidAt(p.x + p.vx * 0.5, p.y + p.vy * 0.5)) { fx -= p.vx * 4; fy -= p.vy * 4; }
        if (p.y < 60) fy += 300;
        p.vx += fx * dt; p.vy += fy * dt;
        const sp = Math.hypot(p.vx, p.vy), max = flee ? 230 : 110, min = 30;
        if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
        if (sp < min && sp > 0) { p.vx *= min / sp; p.vy *= min / sp; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (AT.World.solidAt(p.x, p.y)) { p.x -= p.vx * dt * 2; p.y -= p.vy * dt * 2; p.vx *= -0.5; p.vy *= -0.5; }
      }
    },
    turtle(c, dt, t) {
      const px = c.x, py = c.y;
      c.x = c.hx + Math.sin(c.t * 0.12) * 260;
      c.y = c.hy + Math.sin(c.t * 0.24) * 50;
      c.vx = (c.x - px) / dt; c.vy = (c.y - py) / dt;
      if (Math.abs(c.vx) > 1) c.face = Math.sign(c.vx);
    },
    jelly(c, dt, t, d) {
      c.x = c.hx + Math.sin(c.t * 0.25 + c.ph) * 40;
      c.y = c.hy + Math.sin(c.t * 0.5 + c.ph) * 45 - Math.max(0, Math.sin(c.t * 2.2)) * 6;
      if (touching(c, c.r) || U.dist(c.x, c.y + 28, d.x, d.y) < 14 + AT.Diver.RADIUS) AT.Diver.hurt(c.hurt, c.x, c.y);
    },
    crab(c, dt, t, d) {
      const near = Math.abs(d.x - c.x) < 160 && Math.abs(d.y - c.y) < 100;
      c.angry = near;
      if (near) c.dir = Math.sign(d.x - c.x) || 1;
      const sp = near ? 75 : 35;
      const nx = c.x + c.dir * sp * dt;
      const tx = Math.floor((nx + c.dir * 14) / T), ty = Math.floor(c.y / T);
      if (AT.World.solid(tx, ty) || !AT.World.solid(tx, ty + 1)) { if (!near) c.dir *= -1; }
      else c.x = nx;
      c.face = c.dir;
      if (touching(c, c.r)) AT.Diver.hurt(c.hurt, c.x, c.y + 10);
    },
    eel(c, dt, t, d) {
      c.timer -= dt;
      const inFront = (d.x - c.ax) * c.dir > 0 && Math.abs(d.x - c.ax) < 190 && Math.abs(d.y - c.ay) < 70;
      if (c.state === 'hide') { c.ext = U.lerp(c.ext, 0.14 + Math.sin(c.t * 2) * 0.04, dt * 4); if (inFront && c.timer <= 0) { c.state = 'out'; AT.Audio.snap(); } }
      else if (c.state === 'out') { c.ext = Math.min(1, c.ext + dt * 5); if (c.ext >= 1) { c.state = 'hold'; c.timer = 0.5; } }
      else if (c.state === 'hold') { if (c.timer <= 0) c.state = 'back'; }
      else if (c.state === 'back') { c.ext -= dt * 1.8; if (c.ext <= 0.14) { c.state = 'hide'; c.timer = 1.4; } }
      c.x = c.ax + c.dir * (c.ext * 115 + 6); c.y = c.ay + Math.sin(c.t * 6) * 4 * c.ext;
      if (c.ext > 0.4 && touching(c, c.r)) AT.Diver.hurt(c.hurt, c.x - c.dir * 20, c.y);
    },
    puffer(c, dt, t, d) {
      const near = U.dist(c.x, c.y, d.x, d.y) < 130;
      c.puff = U.clamp(c.puff + (near ? dt * 4 : -dt * 0.8), 0, 1);
      c.x = c.hx + Math.sin(c.t * 0.3 + c.ph) * 50; c.y = c.hy + Math.sin(c.t * 0.5 + c.ph) * 20;
      c.face = Math.cos(c.t * 0.3 + c.ph) >= 0 ? 1 : -1;
      c.r = 12 + c.puff * 13;
      if (c.puff > 0.6 && touching(c, c.r)) AT.Diver.hurt(c.hurt, c.x, c.y);
    },
    angler(c, dt, t, d) {
      c.cool -= dt;
      const dd = U.dist(c.x, c.y, d.x, d.y);
      let tx = c.hx, ty = c.hy, sp = 40;
      if (dd < 380 && c.cool <= 0) { tx = d.x; ty = d.y; sp = 58; }
      else if (c.cool > 0) { tx = c.x + (c.x - d.x); ty = c.y + (c.y - d.y); sp = 70; }
      const a = Math.atan2(ty - c.y, tx - c.x);
      c.vx = U.lerp(c.vx, Math.cos(a) * sp, dt * 2); c.vy = U.lerp(c.vy, Math.sin(a) * sp, dt * 2);
      c.x += c.vx * dt; c.y += c.vy * dt;
      AT.World.collide(c, 18);
      if (Math.abs(c.vx) > 3) c.face = Math.sign(c.vx);
      if (touching(c, c.r) && AT.Diver.hurt(c.hurt, c.x, c.y)) c.cool = 2.5;
    },
    shark(c, dt, t, d) {
      c.timer -= dt;
      const dd = U.dist(c.x, c.y, d.x, d.y);
      if (c.mode === 'patrol') {
        c.vx = U.lerp(c.vx, c.dir * 110, dt * 2);
        c.vy = U.lerp(c.vy, (c.hy + Math.sin(c.t * 0.5) * 60 - c.y) * 0.8, dt * 2);
        if (AT.World.solidAt(c.x + c.dir * 90, c.y)) c.dir *= -1;
        if (dd < 330 && c.timer <= 0 && !AT.World.ray(c.x, c.y, d.x, d.y)) { c.mode = 'charge'; c.timer = 1.1; AT.Audio.whoosh(); }
      } else if (c.mode === 'charge') {
        const a = Math.atan2(d.y - c.y, d.x - c.x);
        c.vx = U.lerp(c.vx, Math.cos(a) * 270, dt * 3); c.vy = U.lerp(c.vy, Math.sin(a) * 270, dt * 3);
        if (c.timer <= 0) { c.mode = 'patrol'; c.timer = 2.5; }
      }
      c.x += c.vx * dt; c.y += c.vy * dt;
      const hit = AT.World.collide(c, 26);
      if (hit && c.mode === 'patrol') c.dir = hit.nx > 0 ? 1 : hit.nx < 0 ? -1 : c.dir;
      if (Math.abs(c.vx) > 5) c.face = Math.sign(c.vx);
      if (touching(c, c.r) && AT.Diver.hurt(c.hurt, c.x, c.y)) { c.mode = 'patrol'; c.timer = 2.5; c.dir = -Math.sign(d.x - c.x) || 1; }
    },
    serpent(c, dt, t, d) {
      const inRoom = d.y > 6120;
      let tx = c.hx + Math.sin(c.t * 0.42) * 420, ty = c.hy + 40 + Math.sin(c.t * 0.84) * 220;
      if (inRoom && U.dist(c.x, c.y, d.x, d.y) < 520) { tx = d.x; ty = d.y; }
      tx = U.clamp(tx, 280, 2030); ty = U.clamp(ty, 6250, 6850);
      const a = Math.atan2(ty - c.y, tx - c.x);
      const sp = 150;
      c.vx = U.lerp(c.vx, Math.cos(a) * sp, dt * 1.8); c.vy = U.lerp(c.vy, Math.sin(a) * sp, dt * 1.8);
      c.x += c.vx * dt; c.y += c.vy * dt;
      if (Math.abs(c.vx) > 5) c.face = Math.sign(c.vx);
      updateSerpentBody(c);
      if (touching(c, c.r)) AT.Diver.hurt(c.hurt, c.x, c.y);
      else for (let i = 3; i < c.segs.length; i += 2) {
        const s = c.segs[i];
        if (U.dist(s.x, s.y, d.x, d.y) < segR(i) + AT.Diver.RADIUS - 4) { AT.Diver.hurt(10, s.x, s.y); break; }
      }
    },
  };
  const segR = (i) => 24 - i * 0.55;
  function updateSerpentBody(c) {
    let px = c.x, py = c.y;
    for (let i = 0; i < c.segs.length; i++) {
      const s = c.segs[i];
      const dx = s.x - px, dy = s.y - py, dd = Math.hypot(dx, dy) || 1, gap = i === 0 ? 22 : 19;
      if (dd > gap) { s.x = px + (dx / dd) * gap; s.y = py + (dy / dd) * gap; }
      px = s.x; py = s.y;
    }
  }

  // the harpoon hit something?
  function hitBolt(b) {
    for (const c of list) {
      if (c.type === 'school' || c.type === 'turtle') continue;
      if (c.type === 'eel' && c.ext < 0.3) continue;
      let hit = U.dist(c.x, c.y, b.x, b.y) < c.r + 6;
      if (!hit && c.type === 'serpent') for (let i = 0; i < 6; i++) if (U.dist(c.segs[i].x, c.segs[i].y, b.x, b.y) < segR(i) + 4) hit = true;
      if (!hit) continue;
      const h = AT.Shop.val('harpoon');
      c.stun = c.type === 'serpent' ? Math.max(3.5, h.stun * 1.3) : h.stun;
      if (c.type === 'eel') { c.state = 'back'; c.stun = 0; }
      if (c.type === 'puffer') c.puff = 0;
      AT.Render.sparks(b.x, b.y, 10, [255, 240, 140], 140);
      AT.Render.ring(b.x, b.y, [255, 240, 140], 40, 0.4);
      AT.Audio.zap();
      if (c.type === 'serpent') AT.Game.toast('The Guardian is stunned! Swim past, quick!');
      return true;
    }
    return false;
  }

  // lights from glowing creatures
  function lights(out, t) {
    for (const c of list) {
      if (c.type === 'jelly') out.push({ x: c.x, y: c.y + 6, r: 120, i: 0.75, color: c.hue, glow: 1.3 });
      else if (c.type === 'angler') out.push({ x: c.x + c.face * 30, y: c.y - 24, r: 150, i: 0.9, color: [120, 255, 230], glow: 1.8 });
      else if (c.type === 'school' && (c.kind === 'lantern' || c.kind === 'tetra')) out.push({ x: c.x, y: c.y, r: 170, i: 0.7, color: c.kind === 'tetra' ? [140, 255, 255] : [140, 220, 255] });
      else if (c.type === 'serpent') {
        out.push({ x: c.x, y: c.y, r: 190, i: 0.8, color: [90, 255, 200], glow: 1.1 });
        for (let i = 6; i < c.segs.length; i += 7) out.push({ x: c.segs[i].x, y: c.segs[i].y, r: 110, i: 0.6, color: [90, 220, 255] });
      }
    }
  }

  // ---------- drawing ----------
  function draw(g, t, cam) {
    for (const c of list) {
      if (c.type !== 'serpent' && (c.x < cam.x - 200 || c.x > cam.x + cam.w + 200 || c.y < cam.y - 200 || c.y > cam.y + cam.h + 200)) {
        if (c.type !== 'school') continue;
      }
      if (c.type === 'school') { for (const f of c.fish) if (f.x > cam.x - 40 && f.x < cam.x + cam.w + 40 && f.y > cam.y - 40 && f.y < cam.y + cam.h + 40) fish(g, c.kind, f, t); continue; }
      DRAW[c.type](g, c, t);
      if (c.stun > 0) stunStars(g, c.type === 'serpent' ? c.x : c.x, c.y - c.r - 10, t);
    }
  }

  function stunStars(g, x, y, t) {
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + (i * Math.PI * 2) / 3;
      const sx = x + Math.cos(a) * 16, sy = y + Math.sin(a) * 5;
      g.fillStyle = '#ffe98a';
      g.beginPath();
      for (let k = 0; k < 10; k++) { const r = k % 2 ? 2.2 : 5, b = (k / 10) * Math.PI * 2; g.lineTo(sx + Math.cos(b) * r, sy + Math.sin(b) * r); }
      g.fill();
    }
  }

  const FISH = {
    clownfish: { len: 15, body: ['#ff9f43', '#ff6b1a'], stripes: '#ffffff', fin: '#1a1a1a' },
    tang: { len: 17, body: ['#3d7dff', '#1f4fd6'], tail: '#ffd23f', fin: '#10206b' },
    sardine: { len: 12, body: ['#e8f2ff', '#7d93ad'], fin: '#9fb3c8' },
    butterfly: { len: 15, body: ['#ffe45e', '#f5c400'], stripes: '#222', fin: '#ffe45e', tall: true },
    lantern: { len: 11, body: ['#3a4f7a', '#1f2c4a'], dots: '#8ff7ff', fin: '#2a3a5c' },
    tetra: { len: 10, body: ['#a8fbff', '#4fc8ff'], dots: '#ffffff', fin: '#d9a8ff', glowy: true },
  };
  function fish(g, kind, f, t) {
    const F = FISH[kind], L = F.len * f.sz, h = L * (F.tall ? 0.6 : 0.42);
    const a = Math.atan2(f.vy, f.vx);
    g.save(); g.translate(f.x, f.y); g.rotate(a);
    if (f.vx < 0) g.scale(1, -1);
    const wag = Math.sin(t * 14 + f.ph) * 0.35;
    // tail
    g.fillStyle = F.tail || F.body[1];
    g.save(); g.translate(-L * 0.75, 0); g.rotate(wag);
    g.beginPath(); g.moveTo(3, 0); g.lineTo(-L * 0.45, -h * 0.9); g.lineTo(-L * 0.3, 0); g.lineTo(-L * 0.45, h * 0.9); g.closePath(); g.fill();
    g.restore();
    if (F.glowy) { g.fillStyle = 'rgba(160,250,255,0.25)'; g.beginPath(); g.ellipse(0, 0, L * 1.3, h * 1.8, 0, 0, Math.PI * 2); g.fill(); }
    const gr = g.createLinearGradient(0, -h, 0, h);
    gr.addColorStop(0, F.body[0]); gr.addColorStop(1, F.body[1]);
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(0, 0, L, h, 0, 0, Math.PI * 2); g.fill();
    // top fin
    g.fillStyle = F.fin; g.beginPath(); g.moveTo(-L * 0.4, -h * 0.8); g.quadraticCurveTo(0, -h * 1.7, L * 0.3, -h * 0.8); g.fill();
    if (F.stripes) {
      g.save(); g.beginPath(); g.ellipse(0, 0, L, h, 0, 0, Math.PI * 2); g.clip();
      g.fillStyle = F.stripes;
      for (const sx of kind === 'clownfish' ? [L * 0.35, -L * 0.25] : [-L * 0.1, L * 0.45]) g.fillRect(sx - 2, -h, 3.5, h * 2);
      g.restore();
    }
    if (F.dots) { g.fillStyle = F.dots; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-L * 0.5 + i * L * 0.3, h * 0.4, 1.3, 0, Math.PI * 2); g.fill(); } }
    if (kind === 'sardine') { g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillRect(-L * 0.6, -1, L * 1.2, 1.5); }
    // eye
    g.fillStyle = '#fff'; g.beginPath(); g.arc(L * 0.6, -h * 0.2, 2.2, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(L * 0.65, -h * 0.2, 1.2, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  const DRAW = {
    turtle(g, c, t) {
      g.save(); g.translate(c.x, c.y); g.scale(c.face, 1);
      const p = Math.sin(t * 2.2);
      // flippers
      g.fillStyle = '#6fa36a';
      const flip = (x, y, a, s) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(s * 12, 0, 16, 6, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
      flip(14, 10, 0.6 + p * 0.5, 1); flip(-18, 8, 2.4 - p * 0.3, 1);
      // head
      g.fillStyle = '#7fb57a'; g.beginPath(); g.ellipse(34, -2, 11, 8, 0.1, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(39, -4, 1.8, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#3d6b3a'; g.lineWidth = 1.2; g.beginPath(); g.arc(38, 0, 4, 0.2, 1.2); g.stroke();
      // shell
      const gr = g.createRadialGradient(-4, -10, 4, 0, 0, 34);
      gr.addColorStop(0, '#c9a45a'); gr.addColorStop(1, '#6b4a22');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 30, 18, 0, Math.PI * 0.95, Math.PI * 0.05, false); g.quadraticCurveTo(0, 14, -30, 2); g.fill();
      g.strokeStyle = 'rgba(60,35,10,0.6)'; g.lineWidth = 1.5;
      for (const [x, y] of [[-12, -6], [4, -9], [17, -4], [-4, 2]]) { g.beginPath(); for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; g.lineTo(x + Math.cos(a) * 7, y + Math.sin(a) * 5); } g.closePath(); g.stroke(); }
      g.fillStyle = '#a7c98f'; g.beginPath(); g.ellipse(0, 5, 26, 5, 0, 0, Math.PI); g.fill();
      flip(12, 12, 0.9 - p * 0.5, 1);
      g.restore();
    },
    jelly(g, c, t) {
      const pulse = Math.max(0, Math.sin(c.t * 2.2)), w = 22 - pulse * 4, h = 16 + pulse * 3;
      const [r, gg, b] = c.hue;
      g.save(); g.translate(c.x, c.y);
      // tentacles
      g.strokeStyle = `rgba(${r},${gg},${b},0.55)`; g.lineWidth = 1.6;
      for (let i = -3; i <= 3; i++) {
        g.beginPath(); g.moveTo(i * 5, 4);
        for (let k = 1; k <= 6; k++) g.lineTo(i * 5 + Math.sin(c.t * 3 + k * 0.8 + i) * 4, 4 + k * 7);
        g.stroke();
      }
      g.strokeStyle = `rgba(255,255,255,0.5)`; g.lineWidth = 3;
      for (const i of [-1, 1]) { g.beginPath(); g.moveTo(i * 4, 3); g.quadraticCurveTo(i * 8 + Math.sin(c.t * 2) * 4, 16, i * 3, 28); g.stroke(); }
      // bell
      const gr = g.createRadialGradient(0, -h * 0.5, 2, 0, 0, w * 1.2);
      gr.addColorStop(0, `rgba(255,255,255,0.9)`); gr.addColorStop(0.5, `rgba(${r},${gg},${b},0.6)`); gr.addColorStop(1, `rgba(${r},${gg},${b},0.25)`);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(-w, 4); g.quadraticCurveTo(-w, -h * 1.4, 0, -h * 1.3); g.quadraticCurveTo(w, -h * 1.4, w, 4);
      for (let i = 4; i >= -4; i--) g.lineTo(i * (w / 4), 4 + (i % 2 ? 3 : 0));
      g.fill();
      g.fillStyle = `rgba(255,255,255,0.55)`;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(-7 + i * 4.5, -h * 0.4 + (i % 2) * 3, 2.5, 0, Math.PI * 2); g.fill(); }
      g.restore();
    },
    crab(g, c, t) {
      g.save(); g.translate(c.x, c.y);
      const walk = Math.sin(c.t * (c.angry ? 22 : 12));
      g.strokeStyle = '#b8442c'; g.lineWidth = 3; g.lineCap = 'round';
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
        const lx = s * (6 + i * 4), k = walk * (i % 2 ? 1 : -1) * 3;
        g.beginPath(); g.moveTo(lx, 2); g.lineTo(lx + s * 8, 6 + k); g.lineTo(lx + s * 10, 12); g.stroke();
      }
      // claws
      const up = c.angry ? -10 + Math.sin(c.t * 10) * 3 : 0;
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(s * 10, -2); g.lineTo(s * 17, -8 + up); g.stroke();
        g.fillStyle = '#e8593c'; g.beginPath(); g.ellipse(s * 19, -12 + up, 6, 5, s * 0.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#b8442c'; g.beginPath(); g.moveTo(s * 19, -12 + up); g.lineTo(s * 26, -16 + up); g.lineTo(s * 22, -10 + up); g.fill();
      }
      const gr = g.createLinearGradient(0, -12, 0, 6);
      gr.addColorStop(0, '#ff7a55'); gr.addColorStop(1, '#b8442c');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, -2, 15, 9, 0, 0, Math.PI * 2); g.fill();
      // eyes on stalks
      for (const s of [-1, 1]) {
        g.strokeStyle = '#b8442c'; g.lineWidth = 2; g.beginPath(); g.moveTo(s * 4, -8); g.lineTo(s * 5, -15); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(s * 5, -16, 3, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#111'; g.beginPath(); g.arc(s * 5 + c.face, -16, 1.5, 0, Math.PI * 2); g.fill();
      }
      g.restore();
    },
    eel(g, c, t) {
      const L = c.ext * 115 + 6;
      g.save(); g.translate(c.ax, c.ay); g.scale(c.dir, 1);
      // dark hole in the wall
      g.fillStyle = 'rgba(0,0,0,0.75)'; g.beginPath(); g.ellipse(0, 0, 8, 16, 0, 0, Math.PI * 2); g.fill();
      // body
      const pts = [];
      for (let i = 0; i <= 12; i++) { const k = i / 12; pts.push([k * L, Math.sin(c.t * 7 - k * 5) * 5 * k * c.ext]); }
      g.lineCap = 'round';
      g.strokeStyle = '#3d5a2a'; g.lineWidth = 17;
      g.beginPath(); pts.forEach(([x, y]) => g.lineTo(x, y)); g.stroke();
      g.strokeStyle = '#6b8f3a'; g.lineWidth = 12;
      g.beginPath(); pts.forEach(([x, y]) => g.lineTo(x, y)); g.stroke();
      g.fillStyle = 'rgba(40,60,20,0.6)';
      for (let i = 2; i < pts.length; i += 2) { g.beginPath(); g.arc(pts[i][0], pts[i][1] - 2, 2, 0, Math.PI * 2); g.fill(); }
      // head
      const [hx, hy] = pts[pts.length - 1];
      const open = c.state === 'out' || c.state === 'hold' ? 0.5 : 0.15;
      g.fillStyle = '#6b8f3a';
      g.beginPath(); g.moveTo(hx - 6, hy - 9); g.quadraticCurveTo(hx + 16, hy - 10, hx + 20, hy - 2 - open * 6); g.lineTo(hx + 4, hy); g.lineTo(hx + 18, hy + 3 + open * 8); g.quadraticCurveTo(hx + 8, hy + 10, hx - 6, hy + 8); g.fill();
      g.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(hx + 8 + i * 4, hy - 1); g.lineTo(hx + 10 + i * 4, hy + 2); g.lineTo(hx + 12 + i * 4, hy - 1); g.fill(); }
      g.fillStyle = '#ffe35c'; g.beginPath(); g.arc(hx + 9, hy - 5, 2.8, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(hx + 10, hy - 5, 1.4, 0, Math.PI * 2); g.fill();
      g.restore();
    },
    puffer(g, c, t) {
      const R = c.r;
      g.save(); g.translate(c.x, c.y); g.scale(c.face, 1);
      // spikes
      g.strokeStyle = '#8a6a2a'; g.lineWidth = 2;
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, s = R * (0.95 + c.puff * 0.35);
        g.beginPath(); g.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); g.lineTo(Math.cos(a) * s, Math.sin(a) * s); g.stroke();
      }
      const gr = g.createRadialGradient(-R * 0.3, -R * 0.4, 1, 0, 0, R);
      gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.6, '#f2c94c'); gr.addColorStop(1, '#c9982a');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, R, R * (0.75 + c.puff * 0.25), 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(120,80,20,0.4)';
      for (const [x, y] of [[-4, -6], [3, -8], [-8, 1], [6, -2]]) { g.beginPath(); g.arc(x * R / 14, y * R / 14, 1.6, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fffbe8'; g.beginPath(); g.ellipse(0, R * 0.35, R * 0.7, R * 0.3, 0, 0, Math.PI); g.fill();
      // tail + fin
      g.fillStyle = '#e0b040'; g.beginPath(); g.moveTo(-R * 0.9, 0); g.lineTo(-R * 1.4, -6 + Math.sin(t * 10) * 2); g.lineTo(-R * 1.4, 6 + Math.sin(t * 10) * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(R * 0.45, -R * 0.2, 4.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(R * 0.52, -R * 0.2, 2.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#c96a4a'; g.beginPath(); g.ellipse(R * 0.85, R * 0.1, 3, 2 + c.puff * 1.5, 0, 0, Math.PI * 2); g.fill();
      g.restore();
    },
    angler(g, c, t) {
      g.save(); g.translate(c.x, c.y); g.scale(c.face, 1);
      const bob = Math.sin(c.t * 3) * 2;
      // lure
      g.strokeStyle = '#3a3050'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(8, -16); g.quadraticCurveTo(20, -40 + bob, 30, -24 + bob); g.stroke();
      g.fillStyle = '#d8fffa'; g.beginPath(); g.arc(30, -24 + bob, 5, 0, Math.PI * 2); g.fill();
      // body
      const gr = g.createRadialGradient(-4, -8, 2, 0, 0, 28);
      gr.addColorStop(0, '#5a4a7a'); gr.addColorStop(1, '#231a38');
      g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, 26, 20, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2a2040'; g.beginPath(); g.moveTo(-24, 0); g.lineTo(-40, -12 + Math.sin(t * 6) * 3); g.lineTo(-40, 12 + Math.sin(t * 6) * 3); g.fill();
      // big mouth with teeth (cartoony)
      g.fillStyle = '#120a1e'; g.beginPath(); g.moveTo(6, 2); g.quadraticCurveTo(20, 14, 26, 4); g.lineTo(26, 10); g.quadraticCurveTo(16, 22, 4, 10); g.fill();
      g.fillStyle = '#f4f4f4';
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(9 + i * 4.5, 5 + i); g.lineTo(11 + i * 4.5, 10 + i); g.lineTo(13 + i * 4.5, 5 + i); g.fill(); }
      // big friendly-ish eye
      g.fillStyle = '#fff'; g.beginPath(); g.arc(10, -6, 6.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(12, -6, 3.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(13, -7.5, 1.2, 0, Math.PI * 2); g.fill();
      g.restore();
    },
    shark(g, c, t) {
      g.save(); g.translate(c.x, c.y); g.scale(c.face, 1);
      g.rotate(U.clamp(c.vy / 300, -0.4, 0.4));
      const wag = Math.sin(c.t * (c.mode === 'charge' ? 12 : 6)) * 0.25;
      // tail
      g.fillStyle = '#5a6f86';
      g.save(); g.translate(-48, 0); g.rotate(wag);
      g.beginPath(); g.moveTo(4, 0); g.lineTo(-22, -24); g.lineTo(-12, 0); g.lineTo(-18, 16); g.closePath(); g.fill();
      g.restore();
      // body
      const gr = g.createLinearGradient(0, -18, 0, 16);
      gr.addColorStop(0, '#7d93ad'); gr.addColorStop(0.55, '#5a6f86'); gr.addColorStop(0.56, '#e6eef5'); gr.addColorStop(1, '#c8d4e0');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(58, 2); g.quadraticCurveTo(40, -20, 0, -17); g.quadraticCurveTo(-40, -12, -52, 0); g.quadraticCurveTo(-30, 12, 0, 15); g.quadraticCurveTo(40, 16, 58, 2); g.fill();
      // fins
      g.fillStyle = '#5a6f86';
      g.beginPath(); g.moveTo(4, -16); g.lineTo(-10, -40); g.lineTo(-18, -14); g.fill();
      g.beginPath(); g.moveTo(10, 10); g.lineTo(-6, 30); g.lineTo(-4, 10); g.fill();
      // gills and eye
      g.strokeStyle = 'rgba(40,50,70,0.5)'; g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(26 - i * 5, -6); g.lineTo(24 - i * 5, 6); g.stroke(); }
      g.fillStyle = '#111'; g.beginPath(); g.arc(42, -4, 2.8, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(43, -5, 1, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#2a3342'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(48, 7); g.quadraticCurveTo(40, 10, 34, 8); g.stroke();
      g.restore();
    },
    serpent(g, c, t) {
      // body, from the tail to the head
      for (let i = c.segs.length - 1; i >= 0; i--) {
        const s = c.segs[i], r = segR(i);
        const gr = g.createRadialGradient(s.x - r * 0.3, s.y - r * 0.4, 1, s.x, s.y, r);
        gr.addColorStop(0, '#6ff0c8'); gr.addColorStop(0.6, '#1f8f86'); gr.addColorStop(1, '#0d4a52');
        g.fillStyle = gr; g.beginPath(); g.arc(s.x, s.y, r, 0, Math.PI * 2); g.fill();
        // glowing spots and a fin on the back
        if (i % 3 === 0) { g.fillStyle = 'rgba(160,255,240,0.8)'; g.beginPath(); g.arc(s.x, s.y - r * 0.3, r * 0.2, 0, Math.PI * 2); g.fill(); }
        if (i % 2 === 0 && i < c.segs.length - 2) {
          g.fillStyle = 'rgba(255,200,90,0.85)';
          g.beginPath(); g.moveTo(s.x - r * 0.5, s.y - r * 0.8); g.lineTo(s.x, s.y - r * 1.5 - Math.sin(t * 4 + i) * 3); g.lineTo(s.x + r * 0.5, s.y - r * 0.8); g.fill();
        }
      }
      // head
      const a = c.segs[0] ? Math.atan2(c.y - c.segs[0].y, c.x - c.segs[0].x) : 0;
      g.save(); g.translate(c.x, c.y); g.rotate(a);
      if (Math.abs(a) > Math.PI / 2) g.scale(1, -1);
      const gr = g.createLinearGradient(0, -24, 0, 24);
      gr.addColorStop(0, '#5fe8c0'); gr.addColorStop(0.6, '#178078'); gr.addColorStop(1, '#f0c060');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(-18, -22); g.quadraticCurveTo(30, -26, 46, -4); g.lineTo(48, 6); g.quadraticCurveTo(26, 22, -18, 20); g.closePath(); g.fill();
      // golden crest (like a crown)
      g.fillStyle = '#ffd35a';
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-14 + i * 9, -20); g.lineTo(-20 + i * 9, -40 - (i === 1 ? 8 : 0)); g.lineTo(-6 + i * 9, -20); g.fill(); }
      // whiskers
      g.strokeStyle = '#ffd35a'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(40, 6); g.quadraticCurveTo(56, 20, 50 + Math.sin(t * 3) * 6, 36); g.stroke();
      // eye
      g.fillStyle = '#fff6b0'; g.beginPath(); g.ellipse(22, -8, 7, 5, 0, 0, Math.PI * 2); g.fill();
      if (c.stun > 0) {
        g.strokeStyle = '#222'; g.lineWidth = 1.5; g.beginPath();
        for (let k = 0; k < 14; k++) { const r = k * 0.35, b = k * 0.9 + t * 6; g.lineTo(22 + Math.cos(b) * r, -8 + Math.sin(b) * r); }
        g.stroke();
      } else { g.fillStyle = '#111'; g.beginPath(); g.ellipse(24, -8, 2.2, 4, 0, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#0d3a40'; g.beginPath(); g.arc(44, -2, 1.8, 0, Math.PI * 2); g.fill();
      g.restore();
    },
  };

  // the dolphin that saves you (drawn by the rescue animation and the journal)
  function dolphin(g, x, y, a, t, s = 1) {
    g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s);
    const wag = Math.sin(t * 10) * 0.3;
    g.fillStyle = '#6d8fb3';
    g.save(); g.translate(-46, 0); g.rotate(wag);
    g.beginPath(); g.moveTo(4, 0); g.lineTo(-16, -16); g.quadraticCurveTo(-10, 0, -16, 16); g.closePath(); g.fill();
    g.restore();
    const gr = g.createLinearGradient(0, -16, 0, 14);
    gr.addColorStop(0, '#8fb2d6'); gr.addColorStop(0.55, '#6d8fb3'); gr.addColorStop(0.6, '#e9f2fa'); gr.addColorStop(1, '#d0e0ee');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(60, 4); g.quadraticCurveTo(52, -2, 40, -6); g.quadraticCurveTo(20, -18, -10, -12); g.quadraticCurveTo(-40, -6, -48, 0); g.quadraticCurveTo(-30, 10, 0, 12); g.quadraticCurveTo(30, 12, 44, 6); g.quadraticCurveTo(52, 8, 60, 4); g.fill();
    g.fillStyle = '#6d8fb3';
    g.beginPath(); g.moveTo(4, -14); g.quadraticCurveTo(0, -30, -12, -32); g.quadraticCurveTo(-6, -20, -10, -12); g.fill();
    g.beginPath(); g.moveTo(10, 8); g.lineTo(-2, 22); g.lineTo(0, 8); g.fill();
    g.fillStyle = '#111'; g.beginPath(); g.arc(34, -4, 2.2, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(40,60,90,0.6)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(58, 5); g.quadraticCurveTo(50, 9, 44, 7); g.stroke();
    g.restore();
  }

  // a small picture of a creature for the journal
  function portrait(type, size = 96) {
    return U.canvas(size, size, (g) => {
      g.translate(size / 2, size / 2);
      const t = 1.3;
      const fake = { x: 0, y: 0, t: 1, face: 1, stun: 0, puff: 0.2, r: 14, ext: 0.7, state: 'hold', ax: -50, ay: 0, dir: 1, hue: [255, 150, 220], vx: 50, vy: 0, mode: 'patrol', angry: false };
      if (SCHOOL.includes(type) || type === 'tang') {
        g.scale(2.2, 2.2);
        fish(g, type, { x: 0, y: 0, vx: 1, vy: 0, ph: 1, sz: 1.1 }, t);
      } else if (type === 'dolphin') { dolphin(g, 0, 0, 0, t, 0.72); }
      else if (type === 'serpent') {
        g.scale(0.62, 0.62);
        fake.segs = []; for (let i = 0; i < 12; i++) fake.segs.push({ x: -20 - i * 13, y: Math.sin(i * 0.7) * 16 + 20 });
        fake.x = 20; fake.y = 0; fake.segs.length = 10;
        DRAW.serpent(g, fake, t);
      } else {
        const sc = { turtle: 1.2, jelly: 1.4, crab: 1.5, eel: 0.85, puffer: 1.8, angler: 1.3, shark: 0.75 }[type] || 1;
        g.scale(sc, sc);
        if (type === 'eel') g.translate(-10, 0);
        DRAW[type](g, fake, t);
      }
    });
  }

  return { init, update, draw, lights, hitBolt, dolphin, portrait, INFO, get list() { return list; } };
})();
