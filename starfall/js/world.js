// ============================================================
//  STARFALL — THINGS IN THE WORLD
//  the ship, the village, temples, towers, beacons, chests,
//  star shards, puzzles and the temple rooms.
// ============================================================
window.SF = window.SF || {};

SF.World = (function () {
  const U = SF.U, T = SF.Terrain, Ph = SF.Phys, Mo = SF.Models, L = SF.Layout;
  let scene;
  const interactables = [];
  const chests = [], shards = [], loot = [], towers = [], beacons = [], temples = [], arenas = [], puzzles = [], npcs = [];
  let ship, arenaLight, lootId = 0;
  const pillarPath = [];
  const W = () => SF.State.world;

  // a fresh saved world
  function newState() {
    return {
      chests: {}, shards: {}, towers: {}, beacons: { 0: true }, puzzles: {}, doors: {}, bosses: {}, rewards: {},
      parts: [false, false, false, false], powers: { glider: false, bow: false, boots: false },
      flags: {}, time: 0.08, playTime: 0,
    };
  }

  // ---------- helpers ----------
  const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
  function place(obj, x, z, y, ry = 0) {
    obj.position.set(x, y ?? T.heightAt(x, z), z);
    obj.rotation.y = ry;
    scene.add(obj);
    return obj;
  }
  // turn a local offset (in front of a building) into a world position
  function local(ox, oz, lx, lz, ry) {
    const c = Math.cos(ry), s = Math.sin(ry);
    return { x: ox + lx * c + lz * s, z: oz - lx * s + lz * c };
  }
  function addInteract(o) { interactables.push(o); return o; }
  function findSpot(rnd, region, avoid = [], maxSlope = 0.5, minH = 1.5) {
    for (let i = 0; i < 4000; i++) {
      const x = (rnd() * 2 - 1) * 270, z = (rnd() * 2 - 1) * 270;
      if (region && T.regionAt(x, z) !== region) continue;
      const h = T.heightAt(x, z);
      if (h < minH || T.slopeAt(x, z) > maxSlope) continue;
      if (T.inLava(x, z)) continue;
      if (avoid.some((a) => dist(a.x, a.z, x, z) < (a.r || 30))) continue;
      if (!Ph.isClear(x, z)) continue;
      return { x, z, y: h };
    }
    return null;
  }

  // ============================================================
  //  BUILD EVERYTHING
  // ============================================================
  function build(sc) {
    scene = sc;
    const rnd = U.seeded(L.seed + 1);

    // ---------- YOUR CRASHED SHIP ----------
    ship = Mo.ship(true);
    const sy = T.heightAt(L.crash.x, L.crash.z);
    place(ship, L.crash.x, L.crash.z, sy + 1.2, 0.6);
    ship.rotation.z = 0.18; ship.rotation.x = -0.08;
    for (let k = -2; k <= 2; k++) { const p = local(L.crash.x, L.crash.z, 0, k * 2.4, 0.6); Ph.addCyl(p.x, p.z, 1.8, sy - 1, sy + 3.2); }
    for (const s of [-1, 1]) { const p = local(L.crash.x, L.crash.z, s * 3.6, -1.2, 0.6); Ph.addCyl(p.x, p.z, 1.4, sy - 1, sy + 1.4); }
    Ph.clear(L.crash.x, L.crash.z, 22);
    addInteract({
      x: L.crash.x, z: L.crash.z, y: sy, r: 10,
      label: () => (W().parts.every((p) => p) ? 'Repair the ship and FLY HOME!' : 'Your ship (' + W().parts.filter((p) => p).length + '/4 parts)'),
      act: () => SF.Story.shipTalk(),
    });

    // ---------- THE VILLAGE ----------
    const vx = L.village.x, vz = L.village.z, vy = T.heightAt(vx, vz);
    Ph.clear(vx, vz, 30);
    const hutCols = [0xf07aa0, 0x7ad0f0, 0xf0d070, 0xa0f07a, 0xc090ff, 0xff9a60];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const hx = vx + Math.cos(a) * 16, hz = vz + Math.sin(a) * 16;
      const h = Mo.hut(hutCols[i]);
      place(h, hx, hz, T.heightAt(hx, hz) - 0.2, Math.atan2(vx - hx, vz - hz));
      Ph.addCyl(hx, hz, 2.8, -50, T.heightAt(hx, hz) + 5);
    }
    const stall = Mo.stall();
    place(stall, vx + 4, vz - 3, vy, -0.6);
    Ph.addCyl(vx + 4, vz - 3, 1.5, vy - 1, vy + 1.1);
    const NPC = [
      { id: 'quib', name: 'ELDER QUIB', body: 0x9ab0ff, robe: 0x6a3aa0, x: vx - 3, z: vz + 4 },
      { id: 'mo', name: 'MO THE TRADER', body: 0xffb070, robe: 0x2a8a6a, x: vx + 4.5, z: vz - 1.2 },
      { id: 'pip', name: 'PIP', body: 0x90ffb0, robe: 0xff6a8a, x: vx - 7, z: vz - 6, small: true },
      { id: 'zara', name: 'ZARA THE EXPLORER', body: 0xffe070, robe: 0x3a5ab0, x: vx + 8, z: vz + 7 },
    ];
    for (const n of NPC) {
      const v = Mo.villager(n.body, n.robe);
      const s = n.small ? 1.3 : 1.7;
      v.group.scale.setScalar(s);
      place(v.group, n.x, n.z, T.heightAt(n.x, n.z) + 0.75 * s);
      n.v = v; n.baseY = T.heightAt(n.x, n.z) + 0.75 * s;
      npcs.push(n);
      Ph.addCyl(n.x, n.z, 0.6, -50, n.baseY + 0.3);
      addInteract({ x: n.x, z: n.z, y: n.baseY - 0.75 * s, r: 3.2, label: () => 'Talk to ' + n.name, act: () => SF.Story.talk(n.id), npc: n });
    }

    // ---------- TEMPLES ----------
    L.temples.forEach((t, i) => {
      const ty = T.heightAt(t.x, t.z);
      const ry = i === 3 ? -Math.PI / 2 : Math.atan2(-t.x, -t.z);
      const m = Mo.temple(i);
      place(m, t.x, t.z, ty - 0.1, ry);
      Ph.clear(t.x, t.z, 18);
      // walls you can't walk through
      for (const [lx, lz] of [[-2.5, -3.5], [2.5, -3.5]]) { const p = local(t.x, t.z, lx, lz, ry); Ph.addCyl(p.x, p.z, 3.7, ty - 1, ty + 16); }
      for (const [lx, lz] of [[-5.2, 1.5], [5.2, 1.5], [-5.2, -1], [5.2, -1]]) { const p = local(t.x, t.z, lx, lz, ry); Ph.addCyl(p.x, p.z, 0.65, ty - 1, ty + 8.5); }
      // steps
      [[6.6, 0.55], [5.6, 1.1], [4.6, 1.65]].forEach(([r, h]) => { const p = local(t.x, t.z, 0, -1.6, ry); Ph.addCyl(p.x, p.z, r, ty - 2, ty + h, { noArrow: true, step: true }); });
      const door = local(t.x, t.z, 0, 2.2, ry);
      const tp = { i, t, x: t.x, z: t.z, y: ty, ry, m, door, open: false };
      temples.push(tp);
      addInteract({
        x: door.x, z: door.z, y: ty + 1.65, r: 3.5,
        label: () => (isDoorOpen(i) ? 'Enter the ' + t.name : t.name + ' (locked)'),
        act: () => (isDoorOpen(i) ? enterTemple(i) : SF.Story.lockedDoor(i)),
      });
    });

    // jungle temple puzzle: 3 rune stones. Hit them all quickly!
    {
      const tp = temples[0];
      const stones = [[-9, 5], [9, 5], [0, 12]].map(([lx, lz]) => {
        const p = local(tp.x, tp.z, lx, lz, tp.ry);
        const m = Mo.runeStone(0x60ffb0);
        place(m, p.x, p.z, T.heightAt(p.x, p.z) - 0.1, tp.ry);
        Ph.addCyl(p.x, p.z, 0.7, -50, T.heightAt(p.x, p.z) + 2.2);
        return { x: p.x, z: p.z, m, lit: 0 };
      });
      puzzles.push({ id: 'door0', kind: 'runes', stones, time: 10, color: 0x60ffb0, door: 0 });
    }
    // frozen temple lock: 3 crystal targets on tall ice pillars. You need the bow!
    {
      const tp = temples[2];
      const tg = [[-10, 6], [10, 6], [0, 14]].map(([lx, lz]) => {
        const p = local(tp.x, tp.z, lx, lz, tp.ry);
        const gy = T.heightAt(p.x, p.z);
        const col = Mo.pillar(7, 0x8aa8d0);
        place(col, p.x, p.z, gy - 0.5);
        Ph.addCyl(p.x, p.z, 1.6, gy - 1, gy + 6.5);
        const m = Mo.target();
        place(m, p.x, p.z, gy + 6.4);
        return { x: p.x, z: p.z, y: gy + 6.4 + 1.9, m, hit: false };
      });
      puzzles.push({ id: 'door2', kind: 'targets', targets: tg, door: 2 });
    }

    // ---------- TEMPLE ROOMS (far away from the island) ----------
    L.temples.forEach((t, i) => buildArena(i));
    arenaLight = new THREE.PointLight(0xffffff, 0, 60, 1.2);
    scene.add(arenaLight);

    // ---------- SIGNAL TOWERS ----------
    L.towers.forEach((tw, i) => {
      let base = Infinity;
      for (let a = 0; a < 6.28; a += 0.2) for (const r of [3, 5, 6.3]) base = Math.min(base, T.heightAt(tw.x + Math.cos(a) * r, tw.z + Math.sin(a) * r));
      base = Math.min(base, T.heightAt(tw.x, tw.z));
      const steps = [];
      for (let k = 0; k < 66; k++) {
        const a = k * 0.3 + i;
        steps.push({ x: Math.cos(a) * 5, z: Math.sin(a) * 5, top: 0.5 * (k + 1) });
      }
      const m = Mo.tower(steps);
      place(m, tw.x, tw.z, base);
      Ph.clear(tw.x, tw.z, 9);
      Ph.addCyl(tw.x, tw.z, 2.1, base - 5, base + 32);
      Ph.addCyl(tw.x, tw.z, 4.2, base + 32, base + 32.8, { noArrow: true });
      for (const s of steps) if (base + s.top > T.heightAt(tw.x + s.x, tw.z + s.z) + 0.3) Ph.addCyl(tw.x + s.x, tw.z + s.z, 1.25, base + s.top - 0.35, base + s.top);
      const top = base + 32.8;
      const o = { i, x: tw.x, z: tw.z, top, m };
      towers.push(o);
      addInteract({
        x: tw.x, z: tw.z, y: top, r: 3.5,
        label: () => (W().towers[i] ? 'Tower is active' : 'Activate the signal tower'),
        act: () => { if (!W().towers[i]) event({ t: 'tower', i }); },
      });
    });

    // ---------- BEACONS ----------
    L.beacons.forEach((b, i) => {
      const by = T.heightAt(b.x, b.z);
      const m = Mo.beacon();
      place(m, b.x, b.z, by - 0.05);
      Ph.clear(b.x, b.z, 5);
      Ph.addCyl(b.x, b.z, 1.4, by - 2, by + 0.5, { noArrow: true });
      Ph.addCyl(b.x, b.z, 0.5, by - 2, by + 2.8);
      const o = { i, name: b.name, x: b.x, z: b.z, y: by, m };
      beacons.push(o);
      addInteract({
        x: b.x, z: b.z, y: by, r: 3,
        label: () => (W().beacons[i] ? 'Beacon: fast travel' : 'Activate the beacon'),
        act: () => {
          if (!W().beacons[i]) event({ t: 'beacon', i });
          else { SF.Game.save(); SF.HUD.openTravel(); }
        },
      });
    });

    // ---------- THE PILLARS UP TO THE LAVA RIFT (you need jet boots!) ----------
    {
      const c = T.lavaCenter;
      const n = 20, arc = 0.8;
      const a0 = Math.PI - 0.35;
      const p0 = { x: c.x + Math.cos(a0) * 98, z: c.z + Math.sin(a0) * 98 };
      let rimH = 0;
      for (let a = 0; a < 6.28; a += 0.2) rimH = Math.max(rimH, T.heightAt(c.x + Math.cos(a) * 72, c.z + Math.sin(a) * 72));
      const endA = a0 + arc;
      const endH = T.heightAt(c.x + Math.cos(endA) * 77, c.z + Math.sin(endA) * 77) + 0.8;
      const startH = T.heightAt(p0.x, p0.z) + 2.4;
      for (let k = 0; k < n; k++) {
        const t = k / (n - 1);
        const a = a0 + t * arc, r = U.lerp(98, 79.5, t);
        const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
        const top = U.lerp(startH, endH, t);
        const g = T.heightAt(x, z);
        const m = Mo.pillar(top - g + 3);
        place(m, x, z, g - 3);
        Ph.addCyl(x, z, 1.5, g - 5, top);
        pillarPath.push({ x, z, top });
        Ph.clear(x, z, 3);
      }
    }

    // ---------- PUZZLES around the island (each gives a heart piece) ----------
    const avoid = [{ x: L.crash.x, z: L.crash.z, r: 40 }, { x: vx, z: vz, r: 45 }, ...L.temples.map((t) => ({ x: t.x, z: t.z, r: 35 })), ...L.towers.map((t) => ({ x: t.x, z: t.z, r: 20 }))];
    const prnd = U.seeded(L.seed + 9);
    // rune circles
    ['plains', 'jungle', 'frozen'].forEach((reg, k) => {
      const s = findSpot(prnd, reg, avoid, 0.35);
      if (!s) return;
      avoid.push({ x: s.x, z: s.z, r: 40 });
      const stones = [];
      for (let j = 0; j < 4; j++) {
        const a = j * Math.PI / 2 + k;
        const x = s.x + Math.cos(a) * 7, z = s.z + Math.sin(a) * 7;
        const m = Mo.runeStone(0xffe060);
        place(m, x, z, T.heightAt(x, z) - 0.1, a);
        Ph.addCyl(x, z, 0.7, -50, T.heightAt(x, z) + 2.2);
        stones.push({ x, z, m, lit: 0 });
      }
      const pz = { id: 'rune' + k, kind: 'runes', stones, time: 8, color: 0xffe060 };
      puzzles.push(pz);
      addChest('pz_' + pz.id, s.x, s.z, { heart: 1 }, pz.id);
    });
    // ring races
    ['plains', 'desert'].forEach((reg, k) => {
      const s = findSpot(prnd, reg, avoid, 0.3);
      if (!s) return;
      avoid.push({ x: s.x, z: s.z, r: 50 });
      const orb = Mo.target();
      place(orb, s.x, s.z);
      orb.userData.orb.material = Mo.M.glow(0x60ffe0);
      Ph.addCyl(s.x, s.z, 0.5, -50, s.y + 1.2);
      const rings = [];
      let x = s.x, z = s.z, a = prnd() * 7;
      for (let j = 0; j < 8; j++) {
        for (let tries = 0; tries < 12; tries++) {
          const nx = x + Math.cos(a) * 13, nz = z + Math.sin(a) * 13;
          if (T.heightAt(nx, nz) > 1 && Math.abs(nx) < 270 && Math.abs(nz) < 270 && !T.inLava(nx, nz) && T.slopeAt(nx, nz) < 0.8) { x = nx; z = nz; break; }
          a += 0.9;
        }
        a += (prnd() - 0.5) * 0.9;
        const ry = T.heightAt(x, z) + 1.8;
        const m = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.14, 6, 24), Mo.M.glow(0x60ffe0));
        m.position.set(x, ry, z); m.rotation.y = Math.PI / 2 - a;
        m.visible = false; scene.add(m);
        rings.push({ x, y: ry, z, m, got: false });
      }
      const pz = { id: 'race' + k, kind: 'race', orb, x: s.x, z: s.z, y: s.y, rings, time: 32, running: false };
      puzzles.push(pz);
      addInteract({ x: s.x, z: s.z, y: s.y, r: 3, label: () => (W().puzzles[pz.id] ? 'Race again (just for fun)' : 'Start the ring race!'), act: () => startRace(pz) });
      addChest('pz_' + pz.id, s.x + 3, s.z, { heart: 1 }, pz.id);
    });
    // target shooting (bow)
    ['desert', 'frozen'].forEach((reg, k) => {
      const s = findSpot(prnd, reg, avoid, 0.35);
      if (!s) return;
      avoid.push({ x: s.x, z: s.z, r: 45 });
      const tg = [];
      for (let j = 0; j < 3; j++) {
        const a = j * 2.1 + k, r = 14 + j * 3;
        const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
        const gy = T.heightAt(x, z);
        const hgt = 5 + j * 2;
        const col = Mo.pillar(hgt, reg === 'desert' ? 0xb07080 : 0x8aa8d0);
        place(col, x, z, gy - 0.5);
        Ph.addCyl(x, z, 1.6, gy - 1, gy + hgt - 0.5);
        const m = Mo.target();
        place(m, x, z, gy + hgt - 0.6);
        tg.push({ x, z, y: gy + hgt - 0.6 + 1.9, m, hit: false });
      }
      const sign = Mo.runeStone(0xff60d0);
      place(sign, s.x, s.z);
      Ph.addCyl(s.x, s.z, 0.7, -50, s.y + 2.2);
      const pz = { id: 'shoot' + k, kind: 'targets', targets: tg };
      puzzles.push(pz);
      addChest('pz_' + pz.id, s.x + 2.5, s.z + 1, { heart: 1 }, pz.id);
    });

    // ---------- CHESTS ----------
    addChest('ship', L.crash.x - 9, L.crash.z + 6, { shards: 10 });
    towers.forEach((tw, i) => addChest('tower' + i, tw.x + 2.4, tw.z - 1.2, { shards: 20 }, null, tw.top));
    // on the lava rim (reward for climbing the pillars)
    {
      const c = T.lavaCenter, a = Math.PI - 0.35 + 0.8;
      const x = c.x + Math.cos(a) * 68, z = c.z + Math.sin(a) * 68;
      addChest('rim', x, z, { heart: 1 });
    }
    // desert mesa, next to the temple
    { const t = temples[1], p = local(t.x, t.z, 8, 9, t.ry); addChest('mesa', p.x, p.z, { shards: 30 }); }
    // on a rock island in the lava
    {
      const c = T.lavaCenter;
      let best = null;
      for (let a = 0; a < 6.28; a += 0.05) for (let r = 24; r < 48; r += 2) {
        const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r, h = T.heightAt(x, z);
        if (h > T.LAVA_Y + 1.5 && T.slopeAt(x, z) < 0.4 && (!best || r > best.r)) best = { x, z, r };
      }
      if (best) addChest('lavaisle', best.x, best.z, { heart: 1 });
    }
    // the highest mountain top
    {
      let best = null;
      for (let x = -200; x < 150; x += 4) for (let z = -300; z < -80; z += 4) {
        const h = T.heightAt(x, z);
        if (T.regionAt(x, z) === 'frozen' && T.slopeAt(x, z) < 0.6 && (!best || h > best.h)) best = { x, z, h };
      }
      if (best) addChest('peak', best.x, best.z, { heart: 1 });
    }
    // floating rocks near two towers: glide from the top of the tower to reach them
    [1, 3].forEach((ti, k) => {
      const tw = towers[ti];
      for (let d = 0; d < 8; d++) {
        const a = d * 0.785 + k;
        const x = tw.x + Math.cos(a) * 38, z = tw.z + Math.sin(a) * 38;
        const top = tw.top - 12;
        if (T.heightAt(x, z) > top - 10 || T.heightAt(x, z) < 0) continue;
        const b = Mo.builder();
        b.add(Mo.G.dod(3), 0x6a5a80, 0, -1.5, 0, 0, 0, 0, 1.2, 0.8, 1.2);
        b.add(Mo.G.cone(2.5, 5, 6), 0x5a4a70, 0, -5, 0, Math.PI, 0, 0);
        b.glow(Mo.G.oct(0.4), 0x80fff0, 2.8, -1, 0);
        place(b.build(), x, z, top);
        Ph.addCyl(x, z, 3.2, top - 6, top);
        addChest('float' + k, x, z, { heart: 1 }, null, top);
        break;
      }
    });
    // chests around the island (more in the harder places)
    const crnd = U.seeded(L.seed + 3);
    const regs = ['plains', 'jungle', 'jungle', 'desert', 'desert', 'frozen', 'frozen', 'plains', 'jungle', 'desert', 'frozen', 'plains', 'jungle', 'desert'];
    regs.forEach((reg, k) => {
      const s = findSpot(crnd, reg, avoid, 0.45, 2);
      if (!s) return;
      avoid.push({ x: s.x, z: s.z, r: 25 });
      addChest('c' + k, s.x, s.z, k % 5 === 4 ? { heart: 1 } : { shards: 8 + Math.floor(crnd() * 12) });
    });

    // ---------- STAR SHARDS lying around ----------
    const srnd = U.seeded(L.seed + 4);
    let sid = 0;
    for (let g = 0; g < 34; g++) {
      const s = findSpot(srnd, null, [{ x: L.crash.x, z: L.crash.z, r: 12 }], 0.7, 1);
      if (!s) continue;
      const a = srnd() * 7, n = 3 + Math.floor(srnd() * 3);
      for (let j = 0; j < n; j++) {
        const x = s.x + Math.cos(a) * j * 2.2, z = s.z + Math.sin(a) * j * 2.2;
        const h = T.heightAt(x, z);
        if (h < 0.5 || (T.inLava(x, z) && h < T.LAVA_Y + 1)) continue;
        addShard('s' + sid++, x, h + 0.9, z);
      }
    }
    // a line of shards leading from the ship to the village (to show the way!)
    for (let j = 0; j < 10; j++) {
      const t = (j + 1) / 11;
      const x = U.lerp(L.crash.x, vx, t) + Math.sin(j) * 2, z = U.lerp(L.crash.z, vz, t);
      if (T.heightAt(x, z) > 0.5) addShard('s' + sid++, x, T.heightAt(x, z) + 0.9, z);
    }
  }

  // ---------- chests ----------
  function addChest(id, x, z, content, puzzleId = null, y) {
    const c = Mo.chest();
    const gy = y ?? T.heightAt(x, z);
    place(c.group, x, z, gy, Math.random() * 6);
    const o = { id, x, z, y: gy, c, content, puzzle: puzzleId, open: 0 };
    Ph.addCyl(x, z, 0.65, gy - 1, gy + 0.9, { noArrow: true });
    chests.push(o);
    addInteract({ x, z, y: gy, r: 2.2, chest: o, label: () => 'Open the chest', act: () => event({ t: 'chest', id }), can: () => !W().chests[id] && (!puzzleId || W().puzzles[puzzleId]) });
    return o;
  }
  function addShard(id, x, y, z) {
    const m = Mo.shard();
    m.position.set(x, y, z);
    scene.add(m);
    shards.push({ id, x, y, z, m });
  }

  // ---------- temple rooms ----------
  const ARENA_FLOOR = [0x3a5a4a, 0xd8b080, 0xb8d8f0, 0x2a2020];
  function buildArena(i) {
    const c = Mo.TEMPLE_COLORS[i];
    const a = { i, x: 2000 + i * 150, z: 2000, y: 0, r: 22, pillars: [] };
    Ph.addArena(a);
    const b = Mo.builder();
    b.add(new THREE.CylinderGeometry(a.r + 0.5, a.r + 0.5, 1, 40), ARENA_FLOOR[i], 0, -0.5, 0);
    for (let k = 0; k < 4; k++) b.add(new THREE.TorusGeometry(4 + k * 5, 0.12, 4, 40), c.trim, 0, 0.02, 0, Math.PI / 2, 0, 0);
    const walls = 24;
    for (let k = 0; k < walls; k++) {
      const ang = (k / walls) * Math.PI * 2;
      const x = Math.cos(ang) * (a.r + 1.2), z = Math.sin(ang) * (a.r + 1.2);
      b.add(new THREE.BoxGeometry(6.2, 14, 1.5), c.stone, x, 7, z, 0, -ang + Math.PI / 2, 0);
      if (k % 2 === 0) {
        b.add(new THREE.CylinderGeometry(0.8, 1, 14, 8), c.trim, Math.cos(ang) * (a.r + 0.2), 7, Math.sin(ang) * (a.r + 0.2));
        b.glow(new THREE.OctahedronGeometry(0.5), c.glow, Math.cos(ang) * (a.r - 0.8), 5, Math.sin(ang) * (a.r - 0.8));
      }
    }
    b.add(new THREE.TorusGeometry(a.r + 0.6, 0.6, 4, 40), c.trim, 0, 14, 0, Math.PI / 2, 0, 0);
    if (i === 3) for (let k = 0; k < 10; k++) b.glow(new THREE.BoxGeometry(0.3, 0.05, 8), 0xff5020, Math.cos(k) * 10, 0.03, Math.sin(k * 1.7) * 10, 0, k, 0);
    if (i === 2) b.glow(new THREE.CircleGeometry(6, 24), 0x80c0ff, 0, 0.02, 0, -Math.PI / 2, 0, 0);
    const g = b.build(false);
    g.position.set(a.x, a.y, a.z);
    scene.add(g);
    // the sandwyrm's room has 4 pillars to trick it into
    if (i === 1) {
      for (let k = 0; k < 4; k++) {
        const ang = k * Math.PI / 2 + Math.PI / 4;
        const x = a.x + Math.cos(ang) * 10, z = a.z + Math.sin(ang) * 10;
        const m = Mo.pillar(8, 0xc08a6a);
        m.position.set(x, a.y, z);
        scene.add(m);
        const col = Ph.addCyl(x, z, 1.6, a.y - 1, a.y + 8);
        a.pillars.push({ x, z, r: 1.6, m, col, broken: false });
      }
    }
    // exit portal
    const portal = Mo.portal(c.glow);
    portal.position.set(a.x, a.y, a.z + a.r - 2);
    scene.add(portal);
    a.portal = portal;
    addInteract({ x: a.x, z: a.z + a.r - 2, y: a.y, r: 3, label: () => 'Leave the temple', act: () => leaveTemple(i) });
    // the reward (appears when the boss is beaten)
    const rw = new THREE.Group();
    const part = Mo.shipPart(i);
    part.position.y = 1.8; part.scale.setScalar(1.5);
    rw.add(part);
    const ped = Mo.builder().add(new THREE.CylinderGeometry(1, 1.3, 1, 8), c.trim, 0, 0.5, 0).build();
    rw.add(ped);
    rw.position.set(a.x, a.y, a.z);
    rw.visible = false;
    scene.add(rw);
    a.reward = rw; a.part = part;
    addInteract({ x: a.x, z: a.z, y: a.y, r: 3, label: () => 'Take the ' + L.temples[i].part, act: () => event({ t: 'reward', i }), can: () => W().bosses[i] && !W().rewards[i] });
    arenas.push(a);
  }

  function breakPillar(a, pl) {
    pl.broken = true;
    pl.col.off = true;
    pl.m.visible = false;
    SF.FX.burst(pl.x, a.y + 3, pl.z, 0xd0a080, 40);
  }

  // ============================================================
  //  TEMPLES: going in and out
  // ============================================================
  function isDoorOpen(i) {
    if (i === 1) return true;
    if (i === 3) return W().parts.slice(0, 3).every((p) => p);
    return !!W().doors[i];
  }
  function enterTemple(i) {
    const a = arenas[i];
    SF.Game.fade(() => {
      const p = SF.Game.player;
      p.place(a.x, a.z + a.r - 5, a.y);
      p.camYaw = 0; p.facing = Math.PI; p.camInit = false;
      SF.Sky.S.indoor = { fog: [0x10261e, 0x2a1a10, 0x101a2a, 0x1a0806][i] };
      arenaLight.position.set(a.x, a.y + 12, a.z);
      arenaLight.color.set(Mo.TEMPLE_COLORS[i].glow).lerp(new THREE.Color(0xffffff), 0.6);
      arenaLight.intensity = 1.2;
      SF.HUD.zone(L.temples[i].name);
      if (!W().bosses[i]) SF.Story.bossIntro(i);
    });
  }
  function leaveTemple(i) {
    const tp = temples[i];
    SF.Game.fade(() => {
      const p = SF.Game.player;
      const out = local(tp.x, tp.z, 0, 7.5, tp.ry);
      p.place(out.x, out.z);
      p.camYaw = tp.ry; p.facing = tp.ry; p.camInit = false;
      SF.Sky.S.indoor = null;
      arenaLight.intensity = 0;
      if (SF.Creatures.bossIn(arenas[i])) SF.Creatures.clearArena(arenas[i]);
    });
  }
  function inArena(p) { const a = Ph.arenaAt(p.x, p.z); return a || null; }

  // ============================================================
  //  WORLD EVENTS (chests, shards, puzzles, bosses...)
  // ============================================================
  function event(ev) {
    apply(ev);
  }

  function apply(ev) {
    const w = W(), me = SF.State.me, P = SF.Game.player;
    switch (ev.t) {
      case 'chest': {
        if (w.chests[ev.id]) return;
        w.chests[ev.id] = true;
        const c = chests.find((c) => c.id === ev.id);
        if (!c) return;
        SF.Audio.sfx('chest');
        SF.FX.burst(c.x, c.y + 1, c.z, 0x70f0ff, 30);
        if (c.content.heart) {
          setTimeout(() => SF.Story.gotHeartPiece(), 700);
        } else {
          me.shards += c.content.shards;
          SF.HUD.toast('+' + c.content.shards + ' star shards!', 0xffe040);
        }
        SF.Game.save();
        break;
      }
      case 'shard': {
        if (w.shards[ev.id]) return;
        w.shards[ev.id] = true;
        const s = shards.find((s) => s.id === ev.id);
        if (s) { scene.remove(s.m); SF.FX.sparks(s.x, s.y, s.z, 0xffe040, 8, 3); }
        me.shards += 1; SF.Audio.sfx('shard');
        break;
      }
      case 'tower': {
        if (w.towers[ev.i]) return;
        w.towers[ev.i] = true;
        const tw = towers[ev.i];
        SF.Audio.sfx('beacon');
        SF.FX.burst(tw.x, tw.top + 3, tw.z, 0x60fff0, 60);
        SF.HUD.reveal(tw.x, tw.z, 120);
        SF.HUD.toast('Signal tower active! Your map shows more of the island.', 0x60fff0);
        SF.Game.save();
        break;
      }
      case 'beacon': {
        if (w.beacons[ev.i]) return;
        w.beacons[ev.i] = true;
        SF.Audio.sfx('beacon');
        const b = beacons[ev.i];
        SF.FX.burst(b.x, b.y + 3, b.z, 0x60f0ff, 40);
        P.heal(99); SF.HUD.toast('Beacon activated! You can travel here, and it saves your game.', 0x60f0ff);
        SF.Game.save();
        break;
      }
      case 'puzzle': {
        if (w.puzzles[ev.id]) return;
        w.puzzles[ev.id] = true;
        const pz = puzzles.find((p) => p.id === ev.id);
        SF.Audio.sfx('puzzle');
        if (pz && pz.door !== undefined) { w.doors[pz.door] = true; openDoorFx(pz.door); SF.HUD.toast('The temple door opens!', 0x60ffb0); }
        else SF.HUD.toast('Puzzle solved! A chest appeared!', 0xffe060);
        if (pz) finishPuzzleFx(pz);
        SF.Game.save();
        break;
      }
      case 'boss': {
        if (w.bosses[ev.i]) return;
        w.bosses[ev.i] = true;
        SF.Creatures.clearArena(arenas[ev.i]);
        SF.Story.bossDefeated(ev.i);
        SF.Game.save();
        break;
      }
      case 'reward': {
        if (w.rewards[ev.i]) return;
        w.rewards[ev.i] = true;
        w.parts[ev.i] = true;
        const pw = L.temples[ev.i].power;
        if (pw) w.powers[pw] = true;
        SF.Story.gotReward(ev.i);
        SF.Game.save();
        break;
      }
      case 'pillar': {
        const a = arenas[ev.a];
        if (a && a.pillars[ev.p] && !a.pillars[ev.p].broken) breakPillar(a, a.pillars[ev.p]);
        break;
      }
      case 'flag': w.flags[ev.k] = ev.v; break;
      case 'ending': SF.Story.ending(); break;
    }
  }

  function openDoorFx(i) {
    const tp = temples[i];
    SF.Audio.sfx('door');
    SF.Game.shake(0.3);
  }
  function finishPuzzleFx(pz) {
    const c = chests.find((c) => c.puzzle === pz.id);
    if (c) SF.FX.burst(c.x, c.y + 1, c.z, 0xffe060, 40);
  }

  // when the boss is beaten (on the host, or in a single player game)
  function bossDefeated(i) { event({ t: 'boss', i }); }

  // ============================================================
  //  PUZZLES
  // ============================================================
  function meleeHit(x, z, y) {
    for (const pz of puzzles) {
      if (pz.kind !== 'runes' || W().puzzles[pz.id]) continue;
      for (const s of pz.stones) {
        if (dist(s.x, s.z, x, z) < 1.8 && s.lit <= 0) {
          s.lit = pz.time;
          SF.Audio.sfx('rune');
          SF.FX.sparks(s.x, T.heightAt(s.x, s.z) + 1.4, s.z, pz.color, 16);
          s.m.userData.runes.forEach((r) => (r.material = Mo.M.glow(pz.color)));
          if (pz.stones.every((st) => st.lit > 0)) event({ t: 'puzzle', id: pz.id });
          else if (pz.stones.filter((st) => st.lit > 0).length === 1) SF.HUD.toast('A rune lights up... light them ALL quickly!');
        }
      }
    }
  }

  function arrowHit(p) {
    for (const pz of puzzles) {
      if (pz.kind !== 'targets') continue;
      for (const t of pz.targets) {
        if (t.hit) continue;
        if (Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z) < 1.0) {
          t.hit = true;
          t.m.userData.orb.material = Mo.M.glow(0x60ff80);
          SF.Audio.sfx('rune');
          SF.FX.burst(t.x, t.y, t.z, 0x60ff80, 20);
          if (!W().puzzles[pz.id]) {
            if (pz.targets.every((q) => q.hit)) event({ t: 'puzzle', id: pz.id });
            else SF.HUD.toast(pz.targets.filter((q) => q.hit).length + ' / ' + pz.targets.length + ' targets');
          }
          return true;
        }
      }
    }
    return false;
  }

  function targetAt(p, r) {
    for (const pz of puzzles) if (pz.kind === 'targets') for (const t of pz.targets) if (Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z) < r) return t;
    return null;
  }

  let race = null;
  function startRace(pz) {
    if (race) return;
    race = { pz, t: pz.time, got: 0 };
    pz.rings.forEach((r) => { r.got = false; r.m.visible = true; r.m.material = Mo.M.glow(0x60ffe0); });
    SF.Audio.sfx('ok');
    SF.HUD.toast('GO! Fly through all ' + pz.rings.length + ' rings!', 0x60ffe0);
  }
  function updateRace(dt, P) {
    if (!race) return;
    race.t -= dt;
    SF.HUD.timer(race.t, race.got + ' / ' + race.pz.rings.length);
    for (const r of race.pz.rings) {
      if (r.got) continue;
      if (Math.hypot(P.pos.x - r.x, P.pos.y + 1 - r.y, P.pos.z - r.z) < 2.3) {
        r.got = true; race.got++;
        r.m.visible = false;
        SF.Audio.sfx('shard');
        SF.FX.burst(r.x, r.y, r.z, 0x60ffe0, 20);
      }
    }
    if (race.got === race.pz.rings.length) {
      SF.HUD.timer(null);
      if (!W().puzzles[race.pz.id]) event({ t: 'puzzle', id: race.pz.id });
      else { SF.Audio.sfx('puzzle'); SF.HUD.toast('You did it again! Time left: ' + race.t.toFixed(1) + 's'); }
      race = null;
    } else if (race.t <= 0) {
      SF.HUD.timer(null);
      SF.Audio.sfx('no');
      SF.HUD.toast('Too slow! Try again.');
      race.pz.rings.forEach((r) => (r.m.visible = false));
      race = null;
    }
  }

  // ============================================================
  //  LOOT (shards and hearts that fall out of enemies)
  // ============================================================
  function dropLoot(x, y, z, range) {
    const n = range ? U.randInt(range[0], range[1]) : 1;
    for (let i = 0; i < n; i++) {
      const m = Mo.shard();
      m.scale.setScalar(0.8);
      scene.add(m);
      loot.push({ id: 'd' + lootId++, kind: 'shard', m, x, y, z, vx: U.rand(-3, 3), vy: U.rand(4, 7), vz: U.rand(-3, 3), life: 40 });
    }
    if (Math.random() < 0.3) {
      const m = Mo.heartPiece();
      m.scale.setScalar(0.7);
      scene.add(m);
      loot.push({ kind: 'heart', m, x, y, z, vx: U.rand(-2, 2), vy: 6, vz: U.rand(-2, 2), life: 40 });
    }
  }

  // ============================================================
  //  EVERY FRAME
  // ============================================================
  function update(dt, time) {
    const P = SF.Game.player;
    const w = W();
    // shards spin; walk into them to collect
    for (const s of shards) {
      if (w.shards[s.id]) { if (s.m.parent) scene.remove(s.m); continue; }
      s.m.rotation.y = time * 2 + s.x;
      s.m.position.y = s.y + Math.sin(time * 2 + s.z) * 0.15;
      if (P && !P.down && Math.abs(P.pos.x - s.x) < 1.3 && Math.abs(P.pos.z - s.z) < 1.3 && Math.abs(P.pos.y + 0.9 - s.y) < 1.6) event({ t: 'shard', id: s.id });
    }
    // loot
    for (let i = loot.length - 1; i >= 0; i--) {
      const l = loot[i];
      l.life -= dt;
      const g = Ph.groundAt(l.x, l.z, l.y + 0.5) + 0.4;
      l.vy -= 15 * dt; l.x += l.vx * dt; l.y += l.vy * dt; l.z += l.vz * dt;
      if (l.y < g) { l.y = g; l.vy = Math.abs(l.vy) > 2 ? -l.vy * 0.4 : 0; l.vx *= 0.7; l.vz *= 0.7; }
      if (P && !P.down) {
        const dx = P.pos.x - l.x, dy = P.pos.y + 0.8 - l.y, dz = P.pos.z - l.z, d = Math.hypot(dx, dy, dz);
        if (d < 3.5 && l.life < 39.4) { l.x += dx / d * 12 * dt; l.y += dy / d * 12 * dt; l.z += dz / d * 12 * dt; }
        if (d < 0.9) {
          if (l.kind === 'shard') { SF.State.me.shards++; SF.Audio.sfx('shard'); }
          else { P.heal(4); SF.Audio.sfx('heart'); }
          l.life = 0;
        }
      }
      l.m.position.set(l.x, l.y + Math.sin(time * 4 + i) * 0.05, l.z);
      l.m.rotation.y = time * 3;
      if (l.life <= 0) { scene.remove(l.m); loot.splice(i, 1); }
      else if (l.life < 5) l.m.visible = Math.floor(time * 8) % 2 === 0;
    }
    // chests
    for (const c of chests) {
      const opened = !!w.chests[c.id];
      const visible = !c.puzzle || w.puzzles[c.puzzle];
      c.c.group.visible = !!visible;
      c.open = U.damp(c.open, opened ? 1 : 0, 5, dt);
      c.c.lid.rotation.x = -c.open * 1.9;
      c.c.glowS.visible = !opened;
    }
    // towers
    towers.forEach((tw, i) => {
      const on = w.towers[i];
      tw.m.userData.orb.material = Mo.M.glow(on ? 0x60fff0 : 0x606070);
      tw.m.userData.orb.rotation.y = time;
      tw.m.userData.orb.position.y = 36.6 + Math.sin(time * 1.5) * 0.3;
    });
    // beacons
    beacons.forEach((b, i) => {
      const on = w.beacons[i];
      const u = b.m.userData;
      u.crystal.material = Mo.M.glow(on ? 0x60f0ff : 0x707080);
      u.crystal.rotation.y = time * (on ? 1.5 : 0.3);
      u.crystal.position.y = 3.3 + Math.sin(time * 2 + i) * (on ? 0.2 : 0.05);
      u.beam.visible = on && !SF.Sky.S.indoor;
    });
    // temple doors
    temples.forEach((tp, i) => {
      const open = isDoorOpen(i);
      const door = tp.m.userData.door;
      door.position.y = U.damp(door.position.y, open ? -0.4 : 3.9, 1.5, dt);
      tp.m.userData.seal.visible = !open;
      tp.m.userData.seal.rotation.z = time;
    });
    // rune puzzles: the runes go dark again if you are too slow
    for (const pz of puzzles) {
      if (pz.kind === 'runes') {
        const solved = w.puzzles[pz.id];
        for (const s of pz.stones) {
          if (solved) { if (!s.done) { s.done = true; s.m.userData.runes.forEach((r) => (r.material = Mo.M.glow(pz.color))); } continue; }
          if (s.lit > 0) {
            s.lit -= dt;
            if (s.lit <= 0) { s.m.userData.runes.forEach((r) => (r.material = Mo.M.glow(0x303040))); SF.Audio.sfx('no'); }
          }
        }
      } else if (pz.kind === 'targets') {
        const solved = w.puzzles[pz.id];
        for (const t of pz.targets) {
          if (solved && !t.hit) { t.hit = true; t.m.userData.orb.material = Mo.M.glow(0x60ff80); }
          t.m.userData.ring.rotation.x = time * 1.5; t.m.userData.ring.rotation.y = time;
        }
      } else if (pz.kind === 'race') {
        pz.orb.userData.ring.rotation.y = time * 2;
        pz.rings.forEach((r) => r.m.visible && (r.m.rotation.z = time));
      }
    }
    if (P) updateRace(dt, P);
    // arenas
    for (const a of arenas) {
      a.portal.userData.ring.rotation.z = time;
      a.portal.userData.disc.material.opacity = 0.25 + Math.sin(time * 3) * 0.1;
      a.reward.visible = !!w.bosses[a.i] && !w.rewards[a.i];
      a.part.rotation.y = time * 1.5;
      a.part.position.y = 1.8 + Math.sin(time * 2) * 0.2;
      // start the boss fight when someone walks in
      if (!w.bosses[a.i] && !SF.Creatures.bossIn(a)) {
        const inside = SF.Game.targets().some((t) => Ph.arenaAt(t.pos.x, t.pos.z) === a && dist(t.pos.x, t.pos.z, a.x, a.z) < a.r - 3.5);
        if (inside) SF.Creatures.spawnBoss(a);
      }
    }
    // the ship smokes until it's fixed
    if (ship && w.flags.fixed && !ship.userData.parked && !SF.Game.cutscene) {
      ship.userData.parked = true;
      ship.position.y = T.heightAt(L.crash.x, L.crash.z) + 2.2;
      ship.rotation.set(0, 0.6, 0);
    }
    if (ship && !w.flags.fixed && Math.random() < dt * 6) {
      const p = local(L.crash.x, L.crash.z, (Math.random() < 0.5 ? -1 : 1) * 2.2, -5, 0.6);
      SF.FX.puff(p.x, T.heightAt(L.crash.x, L.crash.z) + 1.5, p.z, 0x505060, 1);
    }
    // villagers bob up and down and look at you
    for (const n of npcs) {
      n.v.group.position.y = n.baseY + Math.sin(time * 2 + n.x) * 0.1;
      if (P) n.v.group.rotation.y = U.dampAngle(n.v.group.rotation.y, Math.atan2(P.pos.x - n.x, P.pos.z - n.z), 3, dt);
      n.v.antennas.forEach((a, k) => (a.rotation.x = Math.sin(time * 3 + k) * 0.15));
    }
  }

  // the closest thing you can use
  function nearestInteract(p) {
    let best = null, bd = 1e9;
    for (const o of interactables) {
      if (o.can && !o.can()) continue;
      const d = dist(p.x, p.z, o.x, o.z);
      if (d < o.r && Math.abs(p.y - o.y) < 3 && d < bd) { best = o; bd = d; }
    }
    return best;
  }

  return {
    newState, build, update, event, apply, nearestInteract, meleeHit, arrowHit, targetAt, dropLoot, bossDefeated, breakPillar,
    enterTemple, leaveTemple, inArena, isDoorOpen,
    temples, arenas, towers, beacons, chests, shards, puzzles, npcs, pillarPath,
    get ship() { return ship; },
  };
})();
