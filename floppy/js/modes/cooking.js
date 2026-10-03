// ============================================================
//  FLOPPY PARTY — COOKING CHAOS
//  Everyone cooks together in a busy kitchen!
//    Run into a crate to pick up an ingredient.
//    Run into a pot to put it in. 3 things = soup (it cooks).
//    Run into a ready pot to take the soup, and bring it to the
//    serving window. Soups that match an order score!
//    GRAB drops what you carry. PUNCH someone to make them drop it.
//  3 of the same = that soup. 3 different = veggie soup.
//  Don't let soups burn, and watch out for slippery spills!
//  The best cook (most points) wins. 2 minutes.
// ============================================================
window.FP = window.FP || {};
FP.Modes = FP.Modes || {};

FP.Modes.cooking = (function () {
  const W = 14, D = 10, TIME = 120, COOK = 5, BURN = 11;
  const ING = { tomato: 0xff4a4a, mushroom: 0xc9a27a, onion: 0xb07ae0 };
  const ING_LIST = Object.keys(ING);
  const SOUPS = { tomato: 'Tomato Soup', mushroom: 'Mushroom Soup', onion: 'Onion Soup', veggie: 'Veggie Soup' };
  const SOUP_COLOR = { tomato: 0xff5a3a, mushroom: 0xb08a5a, onion: 0xc8a0f0, veggie: 0x7ac85a };
  let crates = [], pots = [], hatch = null, orders = [], carry = new Map(), carryMesh = new Map(), spills = [], time = 0, nextOrder = 0, served = 0, burnt = 0, self = null;
  const pos = (c) => c.parts.torso.position;

  function ingMesh(type) {
    const g = new THREE.Group();
    if (type === 'mushroom') {
      const cap = FP.Look.mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), FP.Look.toon(0xc9a27a), 0.02); cap.position.y = 0.08;
      const stem = FP.Look.mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.15, 8), FP.Look.toon(0xfff1d6), 0.01);
      g.add(cap, stem);
    } else if (type === 'soup') {
      const bowl = FP.Look.mesh(new THREE.SphereGeometry(0.24, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), FP.Look.toon(0xffffff, { side: THREE.DoubleSide }), 0.02);
      const liquid = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), FP.Look.toon(0xff5a3a, { unique: true }));
      liquid.rotation.x = -Math.PI / 2; liquid.position.y = -0.03;
      g.add(bowl, liquid); g.userData.liquid = liquid;
    } else {
      const b = FP.Look.mesh(new THREE.SphereGeometry(0.18, 12, 10), FP.Look.toon(ING[type]), 0.02);
      const leaf = FP.Look.mesh(new THREE.SphereGeometry(0.06, 8, 6), FP.Look.toon(0x5cc44a), 0); leaf.scale.set(1.4, 0.4, 0.8); leaf.position.y = 0.18;
      g.add(b, leaf);
    }
    return g;
  }

  function build() {
    crates = []; pots = []; orders = []; carry = new Map(); carryMesh = new Map(); spills = []; time = 0; nextOrder = 1; served = 0; burnt = 0;
    const S = FP.Stage;
    S.island(0, -1, 0, W + 2, 2, D + 2, { grass: 0xf2e6d0, dirt: 0xb89b7a });
    for (let i = 0; i < 7; i++) for (let k = 0; k < 5; k++) if ((i + k) % 2) { const t = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), FP.Look.toon(0xe0d0b4)); t.rotation.x = -Math.PI / 2; t.position.set(-W / 2 + 1 + i * 2, 0.03, -D / 2 + 1 + k * 2); S.add(t); }
    // counters along the back wall and a middle island
    S.block(0, 0.5, -D / 2 - 0.4, W + 2, 1, 0.8, 0xffffff);
    S.block(0, 0.45, 0.4, 3.5, 0.9, 1.2, 0xff9a3c);
    for (const s of [-1, 1]) S.block(s * (W / 2 + 0.4), 0.5, 0, 0.8, 1, D + 2, 0xffffff);
    S.block(0, 0.3, D / 2 + 0.4, W + 2, 0.6, 0.6, 0xff9a3c);
    // ingredient crates (left side)
    ING_LIST.forEach((type, i) => {
      const z = -3 + i * 3, x = -W / 2 + 0.9;
      const box = FP.Look.boxMesh(1.1, 0.7, 1.1, FP.Look.toon(0xc98b58)); box.position.set(x, 0.35, z); S.add(box);
      S.bodies.push(FP.Physics.staticBox(x, 0.35, z, 1.1, 0.7, 1.1));
      for (let k = 0; k < 4; k++) { const m = ingMesh(type); m.position.set(x - 0.25 + (k % 2) * 0.5, 0.8, z - 0.2 + Math.floor(k / 2) * 0.4); S.add(m); }
      crates.push({ type, x, z });
    });
    // two pots on stoves (back)
    for (const x of [-2.5, 2.5]) {
      const stove = FP.Look.boxMesh(1.3, 1.0, 1.3, FP.Look.toon(0x3a3450)); stove.position.set(x, 0.5, -D / 2 + 0.3); S.add(stove);
      S.bodies.push(FP.Physics.staticBox(x, 0.5, -D / 2 + 0.3, 1.3, 1.0, 1.3));
      const pot = FP.Look.mesh(new THREE.CylinderGeometry(0.5, 0.42, 0.55, 18, 1, true), FP.Look.toon(0x8a8fa0, { side: THREE.DoubleSide }), 0.03); pot.position.set(x, 1.3, -D / 2 + 0.3); S.add(pot);
      const soup = new THREE.Mesh(new THREE.CircleGeometry(0.46, 18), FP.Look.toon(0xffffff, { unique: true })); soup.rotation.x = -Math.PI / 2; soup.position.set(x, 1.15, -D / 2 + 0.3); soup.visible = false; S.add(soup);
      const barBg = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.14), new THREE.MeshBasicMaterial({ color: 0x2a2140 })); barBg.position.set(x, 2.1, -D / 2 + 0.5); S.add(barBg);
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.09), new THREE.MeshBasicMaterial({ color: 0x5cc44a })); bar.position.set(x, 2.1, -D / 2 + 0.51); S.add(bar);
      // little icons of what's in the pot: one of each ingredient in each of the 3 spots (only the right one shows)
      const icons = [0, 1, 2].map((k) => { const set = {}; for (const t of ING_LIST) { const m = ingMesh(t); m.scale.setScalar(0.7); m.position.set(x - 0.35 + k * 0.35, 1.75, -D / 2 + 0.5); m.visible = false; S.add(m); set[t] = m; } return set; });
      pots.push({ x, z: -D / 2 + 0.3, items: [], cook: 0, state: 'empty', soup, bar, barBg, icons });
    }
    // the serving window (right side) with a bell
    const hx = W / 2 - 0.5;
    const win = FP.Look.boxMesh(0.6, 1.2, 2.2, FP.Look.toon(0x5ab0ff)); win.position.set(hx + 0.3, 0.6, 0); S.add(win);
    const sign = FP.Props.billboard(2, 0.7); sign.position.set(hx + 0.2, 3, 0); sign.rotation.y = -Math.PI / 2; S.add(sign);
    sign.userData.panel.material.map = FP.Props.textTexture('SERVE', '#ffcf33', '#2a2140'); sign.userData.panel.material.color.setHex(0xffffff);
    hatch = { x: hx, z: 0 };
    S.onClear(() => { for (const c of FP.Ragdoll.all) c.onIce = false; });
    FP.Camera.setAngle(1.0, 0.72);
    addOrder(); addOrder();
  }

  function spawn(i, n) { return { x: -1.5 + (i % 2) * 3, y: 0.2, z: 2.2 + Math.floor(i / 2) * 1.4, yaw: Math.PI }; }

  function addOrder() {
    const keys = Object.keys(SOUPS);
    orders.push({ type: keys[Math.floor(Math.random() * keys.length)], t: 45 });
  }
  const soupOf = (items) => (items.every((t) => t === items[0]) ? items[0] : 'veggie');

  function drop(c, lost) {
    const it = carry.get(c);
    if (!it) return;
    carry.delete(c);
    if (lost) FP.FX.word(c.parts.head.position, 'OOPS!', '#ff9a3c', 1);
    FP.FX.puffs(c.parts.head.position, 6, it.type === 'soup' ? SOUP_COLOR[it.soup] : ING[it.type] || 0xffffff, 2, 0.7);
    FP.Audio.play('splat');
  }

  FP.bus.on('punchHit', (d) => { if (FP.Kit.live(self) && d && d.victim && carry.has(d.victim)) drop(d.victim, true); });

  function control(c, input, dt, playing) {
    const inp = input || {};
    const grabEdge = !!inp.grab && !c.ckGrab;
    c.ckGrab = !!inp.grab;
    if (playing && grabEdge && carry.has(c)) drop(c, false);
    // slipping on a spill
    const p = pos(c);
    c.onIce = spills.some((s) => Math.hypot(p.x - s.x, p.z - s.z) < s.r);
    FP.Ragdoll.control(c, { x: inp.x || 0, z: inp.z || 0, jump: inp.jump, jumpPressed: inp.jumpPressed, punchPressed: inp.punchPressed, grab: false, emote: inp.emote }, dt);
  }

  function score(c, n, word, game) {
    if (c.player) game.scores[c.player.id] = (game.scores[c.player.id] || 0) + n;
    if (word) FP.FX.word(c.parts.head.position, word, '#ffcf33', 1);
  }

  function update(dt, chars, game, roundOver) {
    if (dt > 0 && !roundOver) {
      time += dt;
      // orders come in and run out
      nextOrder -= dt;
      if (nextOrder <= 0 && orders.length < 3) { addOrder(); nextOrder = 14; FP.Audio.play('beep'); }
      for (const o of orders) o.t -= dt;
      const late = orders.filter((o) => o.t <= 0);
      if (late.length) { orders = orders.filter((o) => o.t > 0); FP.UI.toast(`Too slow! ${late.map((o) => SOUPS[o.type]).join(', ')} ran out`, 2); FP.Audio.play('beep'); if (orders.length < 2) addOrder(); }
      // pots cook, and burn if you leave them
      for (const pot of pots) {
        if (pot.state === 'cooking') { pot.cook += dt; if (pot.cook >= COOK) { pot.state = 'ready'; FP.Audio.play('coin'); FP.FX.word(new THREE.Vector3(pot.x, 2.4, pot.z), 'READY!', '#5cc44a', 1.1); } }
        else if (pot.state === 'ready') { pot.cook += dt; if (pot.cook >= BURN) { pot.state = 'burnt'; pot.cook = 0; burnt++; FP.FX.word(new THREE.Vector3(pot.x, 2.4, pot.z), 'BURNT!', '#ff5a5f', 1.3); FP.Audio.play('alarm'); } }
        else if (pot.state === 'burnt') { pot.cook += dt; if (pot.cook > 2.5) { pot.state = 'empty'; pot.items = []; pot.cook = 0; } }
      }
      // spills show up now and then (slippery!), and dry up
      if (Math.random() < dt / 9 && spills.length < 3) spills.push({ x: (Math.random() - 0.5) * (W - 4), z: (Math.random() - 0.5) * (D - 4) + 0.5, r: 0.9, t: 12, mesh: null });
      for (const s of spills) s.t -= dt;
      spills.filter((s) => s.t <= 0 && s.mesh).forEach((s) => FP.Stage.scene.remove(s.mesh));
      spills = spills.filter((s) => s.t > 0);
      // everyone's automatic kitchen moves
      for (const c of chars) {
        if (c.ko > 0) { if (carry.has(c)) drop(c, true); continue; }
        const p = pos(c), it = carry.get(c);
        if (!it) {
          for (const cr of crates) if (Math.hypot(p.x - cr.x, p.z - cr.z) < 1.3) { carry.set(c, { type: cr.type }); FP.Audio.play('grab'); break; }
          if (!carry.has(c)) for (const pot of pots) if (pot.state === 'ready' && Math.hypot(p.x - pot.x, p.z - pot.z) < 1.5) { carry.set(c, { type: 'soup', soup: soupOf(pot.items) }); pot.state = 'empty'; pot.items = []; pot.cook = 0; FP.Audio.play('grab'); break; }
        } else if (it.type !== 'soup') {
          for (const pot of pots) if ((pot.state === 'empty' || pot.state === 'filling') && pot.items.length < 3 && Math.hypot(p.x - pot.x, p.z - pot.z) < 1.5) {
            pot.items.push(it.type); carry.delete(c); pot.state = pot.items.length >= 3 ? 'cooking' : 'filling'; pot.cook = 0;
            score(c, 1, '+1', game); FP.Audio.play('plop');
            break;
          }
        } else if (Math.hypot(p.x - hatch.x, p.z - hatch.z) < 1.6) {
          carry.delete(c);
          const o = orders.find((x) => x.type === it.soup);
          if (o) { orders = orders.filter((x) => x !== o); served++; score(c, 3, `${SOUPS[it.soup]}! +3`, game); FP.Audio.play('cheer'); FP.Props.hype(); FP.FX.confetti(new THREE.Vector3(hatch.x, 1.5, 0), 60, 3); if (orders.length < 2) addOrder(); }
          else { FP.FX.word(c.parts.head.position, 'Nobody ordered that!', '#ff9a3c', 1); FP.Audio.play('beep'); }
        }
      }
      for (const c of chars) if (pos(c).y < -5) FP.Ragdoll.teleport(c, 0, 0.3, 2.5, Math.PI);
    }
    visual();
    if (roundOver || dt === 0) return null;
    if (time >= TIME) {
      const w = FP.Kit.mostPoints(chars, game.scores);
      const stars = served >= 8 ? 3 : served >= 5 ? 2 : served >= 2 ? 1 : 0;
      return { winners: w, text: w.length === 1 ? `${w[0].name} is the best cook!` : "It's a tie!", sub: `The kitchen served ${served} soup${served === 1 ? '' : 's'} (${stars} of 3 stars)` };
    }
    return null;
  }

  // everything you can see: carried items, pots, spills (also for online friends)
  function visual() {
    for (const c of FP.Game.chars) {
      let set = carryMesh.get(c);
      if (!set) {
        set = {};
        for (const t of [...ING_LIST, 'soup']) { const m = ingMesh(t); m.visible = false; FP.Stage.add(m); set[t] = m; }
        carryMesh.set(c, set);
      }
      const it = carry.get(c), h = c.parts.head.position, fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
      for (const [t, m] of Object.entries(set)) {
        m.visible = !!it && it.type === t;
        if (m.visible) {
          m.position.set(h.x + fx * 0.45, h.y - 0.35, h.z + fz * 0.45);
          if (t === 'soup') m.userData.liquid.material.color.setHex(SOUP_COLOR[it.soup]);
        }
      }
    }
    for (const pot of pots) {
      pot.soup.visible = pot.items.length > 0;
      if (pot.soup.visible) pot.soup.material.color.setHex(pot.state === 'burnt' ? 0x2a2a2a : pot.items.length >= 3 ? SOUP_COLOR[soupOf(pot.items)] : 0x9ad0ff);
      pot.soup.position.y = 1.08 + pot.items.length * 0.05;
      const k = pot.state === 'cooking' ? pot.cook / COOK : pot.state === 'ready' ? 1 - (pot.cook - COOK) / (BURN - COOK) : 0;
      pot.bar.visible = pot.barBg.visible = pot.state === 'cooking' || pot.state === 'ready';
      pot.bar.scale.x = Math.max(0.01, Math.min(1, k)); pot.bar.position.x = pot.x - 0.47 * (1 - Math.min(1, k));
      pot.bar.material.color.setHex(pot.state === 'ready' ? (k < 0.4 ? 0xff5a5f : 0xffcf33) : 0x5cc44a);
      // little icons of what's in the pot
      pot.icons.forEach((set, i) => { for (const [t, m] of Object.entries(set)) m.visible = pot.items[i] === t && pot.state !== 'burnt'; });
      if (pot.state === 'burnt' && Math.random() < 0.3) FP.FX.puffs(new THREE.Vector3(pot.x, 1.6, pot.z), 1, 0x3a3a3a, 1, 1);
      if (pot.state === 'ready' && Math.random() < 0.15) FP.FX.puffs(new THREE.Vector3(pot.x, 1.6, pot.z), 1, 0xffffff, 0.8, 0.7);
    }
    for (const s of spills) if (!s.mesh) { s.mesh = new THREE.Mesh(new THREE.CircleGeometry(s.r, 20), new THREE.MeshBasicMaterial({ color: 0x9ad0ff, transparent: true, opacity: 0.7 })); s.mesh.rotation.x = -Math.PI / 2; s.mesh.position.set(s.x, 0.05, s.z); FP.Stage.add(s.mesh); }
  }

  // bots: work out what the kitchen needs and do it
  function botThink(c, chars, dt, input, tools) {
    const p = pos(c), it = carry.get(c);
    const go = (x, z) => tools.steer(c, x, z, input);
    if (it && it.type === 'soup') { go(hatch.x, 0); return true; }
    if (it) {
      const pot = pots.filter((pt) => (pt.state === 'empty' || pt.state === 'filling') && pt.items.length < 3).sort((a, b) => b.items.length - a.items.length)[0];
      if (pot) go(pot.x, pot.z + 1); else input.grab = true; // nowhere to put it
      return true;
    }
    const ready = pots.find((pt) => pt.state === 'ready');
    if (ready && !chars.some((o) => o !== c && o.isBot && o.botTarget === ready)) { c.botTarget = ready; go(ready.x, ready.z + 1); return true; }
    c.botTarget = null;
    // pick an ingredient that an order needs
    const pot = pots.filter((pt) => (pt.state === 'empty' || pt.state === 'filling') && pt.items.length < 3).sort((a, b) => b.items.length - a.items.length)[0];
    if (!pot) { go(0, 2.5); input.x *= 0.3; input.z *= 0.3; return true; }
    const order = orders.find((o) => o.type !== 'veggie' ? pot.items.every((t) => t === o.type) : new Set(pot.items).size === pot.items.length) || orders[0];
    let want = order ? order.type : 'tomato';
    if (want === 'veggie') want = ING_LIST.find((t) => !pot.items.includes(t)) || 'tomato';
    const cr = crates.find((x) => x.type === want);
    go(cr.x + 0.9, cr.z);
    tools.unstick(input);
    return true;
  }

  function hud() {
    const list = orders.map((o) => `<b>${SOUPS[o.type]}</b> ${Math.ceil(o.t)}s`).join(' &nbsp; ');
    return `<span>${FP.UI.ICON.clock} ${FP.Kit.clock(TIME - time)} &nbsp; Orders: ${list || 'none'}</span><span class="hud-tip">Run into crates and pots &nbsp; 3 of a kind or 3 different = soup &nbsp; Bring soups to SERVE &nbsp; GRAB drops</span>`;
  }

  const ART = '<svg viewBox="0 0 120 80"><rect width="120" height="80" rx="12" fill="#f2e6d0"/><rect x="0" y="0" width="120" height="22" fill="#fff"/><rect x="40" y="10" width="40" height="18" fill="#3a3450"/><path d="M46 12h28l-3 14H49z" fill="#8a8fa0" stroke="#2a2140" stroke-width="2"/><ellipse cx="60" cy="13" rx="13" ry="3" fill="#ff5a3a"/><path d="M52 6c0-4 4-4 4 0M62 5c0-4 4-4 4 0" stroke="#bbb" stroke-width="2" fill="none"/><ellipse cx="34" cy="56" rx="6" ry="8" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="34" cy="44" r="5" fill="#ff5a5f" stroke="#2a2140" stroke-width="2"/><circle cx="42" cy="42" r="4" fill="#ff4a4a" stroke="#2a2140" stroke-width="1.5"/><ellipse cx="86" cy="58" rx="6" ry="8" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><circle cx="86" cy="46" r="5" fill="#4aa8ff" stroke="#2a2140" stroke-width="2"/><path d="M92 44a6 3 0 0 0 10 0z" fill="#fff" stroke="#2a2140" stroke-width="1.5"/></svg>';

  self = {
    id: 'cooking', name: 'Cooking Chaos', roundsToWin: 1, single: true, minTotal: 1, defaultBots: 3, song: 'circus', minZoom: 13, art: ART,
    desc: 'Cook soups together! Grab ingredients, fill the pots, serve the soups that were ordered. Don\'t let them burn!',
    build, spawn, control, update, botThink, hud, visual,
    scoreLabel: (s) => `${s} pts`,
    netState: () => ({
      c: FP.Game.chars.map((c) => { const it = carry.get(c); return it ? (it.type === 'soup' ? 's' + it.soup[0] : it.type[0]) : '-'; }),
      p: pots.map((pt) => [pt.state[0], pt.items.map((t) => t[0]).join(''), Math.round(pt.cook * 10)]),
      s: spills.map((s) => [Math.round(s.x * 10), Math.round(s.z * 10)]),
    }),
    applyNetState: (st) => {
      const ING_BY = { t: 'tomato', m: 'mushroom', o: 'onion' }, SOUP_BY = { t: 'tomato', m: 'mushroom', o: 'onion', v: 'veggie' }, STATE_BY = { e: 'empty', f: 'filling', c: 'cooking', r: 'ready', b: 'burnt' };
      (st.c || []).forEach((v, i) => { const c = FP.Game.chars[i]; if (!c) return; if (v === '-') carry.delete(c); else if (v[0] === 's') carry.set(c, { type: 'soup', soup: SOUP_BY[v[1]] }); else carry.set(c, { type: ING_BY[v] }); });
      (st.p || []).forEach(([s, items, cook], i) => { const pt = pots[i]; if (!pt) return; pt.state = STATE_BY[s]; pt.items = items.split('').map((k) => ING_BY[k]); pt.cook = cook / 10; });
      // spills: rebuild if they changed
      const key = JSON.stringify(st.s || []);
      if (key !== self.spillKey) { self.spillKey = key; spills.forEach((s) => s.mesh && FP.Stage.scene.remove(s.mesh)); spills = (st.s || []).map(([x, z]) => ({ x: x / 10, z: z / 10, r: 0.9, t: 1, mesh: null })); }
    },
  };
  return self;
})();
