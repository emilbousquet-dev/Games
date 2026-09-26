// ============================================================
//  LAB 13 — JUMP SCARES 👻
// ============================================================
window.LAB = window.LAB || {};

LAB.Scares = (function () {
  const U = LAB.U, Mo = LAB.Models, W = LAB.World;

  class ScareSystem {
    constructor(scene, game) {
      this.scene = scene; this.game = game;
      this.active = [];
      this.ambientT = U.rand(15, 30);
      this.voiceT = U.rand(60, 90);
      // a "fake" stalker used for ghost appearances
      this.ghost = Mo.stalker();
      this.ghost.visible = false;
      scene.add(this.ghost);
      this.ghostT = 0;
    }

    pan(p) { return this.game.players.length > 1 ? (p.i === 0 ? -0.6 : 0.6) : 0; }

    // a spot in front of the player (not inside a wall)
    spotAhead(p, dist) {
      const f = p.forward();
      for (let d = dist; d > 0.8; d -= 0.4) {
        const x = p.x + f.x * d, z = p.z + f.z * d;
        if (W.passable(U.worldToCell(x), U.worldToCell(z)) && W.los(p.x, p.z, x, z)) return { x, z, d };
      }
      return null;
    }
    spotBehind(p, dist) {
      const f = p.forward();
      for (let d = dist; d > 1; d -= 0.4) {
        for (const side of [0, -0.5, 0.5]) {
          const x = p.x - f.x * d - f.z * side * d, z = p.z - f.z * d + f.x * side * d;
          if (W.passable(U.worldToCell(x), U.worldToCell(z)) && W.los(p.x, p.z, x, z)) return { x, z };
        }
      }
      return null;
    }

    trigger(type, p) {
      const g = this.game;
      g.stats.scares++;
      switch (type) {
        case 'faceLunge': this.face(p, 'face'); break;
        case 'bodyDrop': this.bodyDrop(p); break;
        case 'stalkerPass': this.stalkerPass(p); break;
        case 'crawlerAmbush': this.crawlerAmbush(p); break;
        case 'lightsOut': this.lightsOut(p); break;
        case 'whisperBehind': this.whisperBehind(p); break;
        case 'handsGlass': this.handsGlass(p); break;
        default: this.face(p, 'face');
      }
    }

    // ---------- THE FACE ----------
    face(p, kind) {
      const face = Mo.scareFace();
      face.traverse((o) => o.layers.set(p.i === 0 ? 3 : 4));
      if (kind === 'stalker') face.scale.set(0.9, 1.25, 0.9);
      p.cam.add(face);
      face.position.set(U.rand(-0.2, 0.2), -0.05, -4);
      this.active.push({ kind: 'face', p, face, t: 0 });
      LAB.Audio.scream(1, this.pan(p));
      this.game.hud.flash(p.i, 'rgba(255,230,220,0.35)');
      LAB.Input.rumble(p.i, 1, 700);
      p.shake = 1.2;
    }

    bodyDrop(p) {
      const s = this.spotAhead(p, 2.6);
      if (!s) return this.face(p, 'face');
      const body = Mo.corpse(U.pick(['deadcoat', 'deadcoat', 'deadguard']));
      const holder = new THREE.Group();
      holder.add(body);
      body.rotation.x = Math.PI / 2; // hanging upside down while falling
      body.position.y = -0.5;
      holder.position.set(s.x, LAB.WALL_H + 0.8, s.z);
      holder.rotation.y = p.yaw;
      W.dyn.add(holder);
      LAB.Audio.clang(this.pan(p));
      this.active.push({ kind: 'drop', p, obj: holder, body, vy: 0, t: 0 });
    }

    stalkerPass(p) {
      const s = this.spotAhead(p, 13);
      if (!s || s.d < 6) return this.face(p, 'face');
      const f = p.forward();
      const rx = -f.z, rz = f.x;
      this.ghost.visible = true;
      this.ghostRun = { x: s.x - rx * 4, z: s.z - rz * 4, vx: rx * 8, vz: rz * 8, t: 1.0 };
      this.ghost.position.set(this.ghostRun.x, 0, this.ghostRun.z);
      this.ghost.rotation.y = Math.atan2(rx, rz);
      LAB.Audio.screech(0.7, this.pan(p), true);
      setTimeout(() => LAB.Audio.thud(0.6, this.pan(p)), 200);
    }

    crawlerAmbush(p) {
      const g = this.game;
      LAB.Audio.glass(this.pan(p));
      LAB.Audio.screech(0.9, this.pan(p));
      for (let i = 0; i < 2; i++) {
        const s = this.spotBehind(p, 3 + i) || this.spotAhead(p, 4);
        if (!s) continue;
        LAB.Effects.blood(s.x, 2.5, s.z, 30, true);
        LAB.Effects.glass(s.x, 2.5, s.z, 20);
        W.addBlood(s.x, s.z, 1.8, true);
        g.spawnCrawler(s.x, s.z, true);
      }
      g.message(p.i, 'BEHIND YOU!');
      p.shake = 0.6;
    }

    lightsOut(p) {
      W.blackout(4.2);
      LAB.Audio.lightsOut();
      setTimeout(() => LAB.Audio.whisper(this.pan(p)), 900);
      setTimeout(() => LAB.Audio.whisper(-this.pan(p)), 2000);
      this.active.push({ kind: 'lightsOut', p, t: 0 });
    }

    whisperBehind(p) {
      LAB.Audio.whisper(this.pan(p));
      this.game.message(p.i, '...did you hear that?');
      this.active.push({ kind: 'whisper', p, t: 0, yaw: p.yaw });
    }

    handsGlass(p) {
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          if (this.game.state !== 'play') return;
          this.game.hud.hands(p.i);
          LAB.Audio.thud(0.9, this.pan(p));
          LAB.Audio.glass(this.pan(p));
          p.shake = 0.5;
          LAB.Input.rumble(p.i, 0.8, 150);
        }, i * 380 + (i === 0 ? 0 : 200));
      }
      setTimeout(() => LAB.Audio.scream(0.6, this.pan(p)), 1600);
    }

    // THE STALKER SMASHES THROUGH A WALL near a player
    wallBreak() {
      const g = this.game, st = g.stalker;
      const p = U.pick(g.players.filter((pp) => pp.standing)) || g.players[0];
      let best = null;
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
        const cx = p.cx + dx, cy = p.cy + dy;
        if (!W.passable(cx, cy) || W.doorAt(cx, cy)) continue;
        const x = U.cellToWorld(cx), z = U.cellToWorld(cy), d = U.dist(p.x, p.z, x, z);
        if (d < 5 || d > 11 || !W.los(p.x, p.z, x, z)) continue;
        for (const [sx, sy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          if (!W.isWall(cx + sx, cy + sy) || W.ch(cx + sx, cy + sy) === 'W') continue;
          const score = Math.abs(d - 7.5) + Math.random();
          if (!best || score < best.score) best = { cx, cy, sx, sy, x, z, score };
        }
      }
      if (!best) return;
      const hole = Mo.wallHole(Math.random);
      hole.position.set(best.x + best.sx * LAB.CELL / 2, 0, best.z + best.sy * LAB.CELL / 2);
      hole.rotation.y = best.sy === -1 ? 0 : best.sy === 1 ? Math.PI : best.sx === -1 ? Math.PI / 2 : -Math.PI / 2;
      W.dyn.add(hole);
      const wx = best.x + best.sx * 1.1, wz = best.z + best.sy * 1.1;
      for (let k = 0; k < 3; k++) setTimeout(() => { LAB.Effects.gibs(wx, 1.2, wz, 14, 0x6a6e70); LAB.Effects.sparks(wx, 1.8, wz, 20); }, k * 90);
      LAB.Effects.blood(wx, 1.5, wz, 30, false);
      const s = g.soundAt(wx, wz, 40);
      LAB.Audio.thud(1, s.pan); LAB.Audio.clang(s.pan); LAB.Audio.glass(s.pan);
      setTimeout(() => LAB.Audio.scream(1, s.pan), 150);
      g.players.forEach((pp) => { pp.shake = Math.max(pp.shake, U.dist(pp.x, pp.z, wx, wz) < 15 ? 1.4 : 0.5); LAB.Input.rumble(pp.i, 1, 700); });
      st.wake(g);
      st.placeAt(best.x, best.z, Math.atan2(p.x - best.x, p.z - best.z));
      st.state = 'hunt'; st.target = p; st.cool = 0; st.cd = 1.2;
      g.message(null, 'IT CAME THROUGH THE WALL!', 3);
    }

    // something crawls through the vents above you
    ventCrawl(p) {
      const pan0 = U.rand(-1, 1);
      for (let i = 0; i < 9; i++) setTimeout(() => {
        if (this.game.state !== 'play') return;
        const pan = U.clamp(pan0 + (i / 9) * (pan0 > 0 ? -1.6 : 1.6), -1, 1);
        LAB.Audio.thud(0.25, pan); if (i % 3 === 0) LAB.Audio.chitter(0.2, pan);
      }, i * U.rand(110, 170));
      LAB.Input.rumble(p.i, 0.2, 800);
    }
    // blood drips from the ceiling right next to you
    bloodDrip(p) {
      const f = p.forward();
      const x = p.x + f.x * 1.2 + U.rand(-0.4, 0.4), z = p.z + f.z * 1.2 + U.rand(-0.4, 0.4);
      if (!W.passable(U.worldToCell(x), U.worldToCell(z))) return LAB.Audio.distant();
      let n = 0;
      const drip = () => {
        if (n++ > 14 || this.game.state !== 'play') return;
        LAB.Effects.blood(x, LAB.WALL_H - 0.05, z, 2, false, 0.15);
        LAB.Audio.splat(0.15, this.pan(p));
        setTimeout(drip, U.rand(180, 500));
      };
      drip();
      setTimeout(() => W.addBlood(x, z, 1.2), 2500);
    }
    // a door near you slams open and shut by itself
    doorSlam(p) {
      const d = W.doors.filter((dd) => dd.type === 'O' && U.dist(dd.x, dd.z, p.x, p.z) < 16 && U.dist(dd.x, dd.z, p.x, p.z) > 4)
        .sort((a, b) => U.dist(a.x, a.z, p.x, p.z) - U.dist(b.x, b.z, p.x, p.z))[0];
      if (!d) return LAB.Audio.distant();
      d.slamT = 1.4;
      const s = this.game.soundAt(d.x, d.z, 25);
      LAB.Audio.thud(s.vol, s.pan);
      setTimeout(() => LAB.Audio.thud(s.vol * 0.8, s.pan), 700);
    }
    // the Stalker's shape stands at the end of the hallway... then it's gone
    stalkerPeek(p) {
      const st = this.game.stalker;
      if (!st || st.state === 'dormant' || this.ghost.visible) return LAB.Audio.distant();
      const s = this.spotAhead(p, 17);
      if (!s || s.d < 9 || U.dist(s.x, s.z, st.x, st.z) < 6) return LAB.Audio.distant();
      this.ghost.visible = true; this.ghostRun = null; this.ghostT = 0;
      this.ghost.position.set(s.x, 0, s.z);
      this.peek = { p, t: 2.2, seen: false };
      LAB.Audio.breathe(0.5, this.pan(p));
    }

    update(dt, time) {
      const g = this.game;
      for (let i = this.active.length - 1; i >= 0; i--) {
        const a = this.active[i];
        a.t += dt;
        if (a.kind === 'face') {
          const k = Math.min(1, a.t / 0.2);
          a.face.position.z = U.lerp(-4, -0.62, k * k);
          a.face.position.x += (Math.random() - 0.5) * 0.02;
          a.face.rotation.z = Math.sin(a.t * 40) * 0.08;
          a.face.rotation.x = Math.sin(a.t * 27) * 0.05;
          const open = Math.min(1, a.t * 5);
          a.face.userData.mand.forEach((m, k) => {
            const ax = k % 2 ? 1 : -1, ay = k < 2 ? 1 : -1;
            m.rotation.z = -ax * ay * 0.5 * open * (1 + Math.sin(a.t * 35 + k) * 0.25);
            m.rotation.x = -ay * 0.4 * open;
          });
          if (a.t > 0.95) { a.p.cam.remove(a.face); this.active.splice(i, 1); }
        } else if (a.kind === 'drop') {
          if (!a.landed) {
            a.vy -= 14 * dt;
            a.obj.position.y += a.vy * dt;
            a.body.rotation.x = U.lerp(Math.PI / 2, 0, Math.min(1, a.t * 1.3));
            if (a.obj.position.y <= 0) {
              a.obj.position.y = 0; a.landed = true;
              a.body.rotation.x = 0;
              a.body.userData.parts.body.rotation.x = -Math.PI / 2;
              LAB.Audio.thud(1, this.pan(a.p)); LAB.Audio.splat(1, this.pan(a.p));
              LAB.Effects.blood(a.obj.position.x, 0.3, a.obj.position.z, 50, false, 1.3);
              W.addBlood(a.obj.position.x, a.obj.position.z, 2.8);
              a.p.shake = 0.8;
              LAB.Input.rumble(a.p.i, 1, 300);
              setTimeout(() => LAB.Audio.scream(0.5, this.pan(a.p)), 150);
            }
          } else if (a.t > 3) this.active.splice(i, 1);
        } else if (a.kind === 'lightsOut') {
          if (a.t > 3.6 && !a.shown) {
            a.shown = true;
            const s = this.spotAhead(a.p, 2.4);
            if (s) {
              this.ghost.visible = true;
              this.ghost.position.set(s.x, 0, s.z);
              this.ghost.rotation.y = Math.atan2(a.p.x - s.x, a.p.z - s.z);
              this.ghostT = 0.9; this.ghostRun = null;
              Mo.animateStalker(this.ghost, time, 0, false, true);
            }
          }
          if (a.t > 4.2 && !a.screamed) {
            a.screamed = true;
            LAB.Audio.scream(1, this.pan(a.p));
            g.hud.flash(a.p.i, 'rgba(120,0,0,0.8)');
            a.p.shake = 1; LAB.Input.rumble(a.p.i, 1, 600);
            this.active.splice(i, 1);
          }
        } else if (a.kind === 'whisper') {
          const turned = Math.abs(U.angleDiff(a.yaw, a.p.yaw)) > 2.0;
          if (turned || a.t > 6) { this.face(a.p, 'face'); this.active.splice(i, 1); }
          else if (a.t > 2.5 && !a.w2) { a.w2 = true; LAB.Audio.whisper(this.pan(a.p)); }
        }
      }
      // the ghost stalker
      if (this.ghostRun) {
        const r = this.ghostRun;
        r.t -= dt; r.x += r.vx * dt; r.z += r.vz * dt;
        this.ghost.position.set(r.x, 0, r.z);
        Mo.animateStalker(this.ghost, time * 1.6, 6, false, false);
        if (r.t <= 0) { this.ghost.visible = false; this.ghostRun = null; }
      } else if (this.ghostT > 0) {
        this.ghostT -= dt;
        if (this.ghostT <= 0) this.ghost.visible = false;
      }

      // the ghost vanishes when you shine a light on it
      if (this.peek && this.ghost.visible) {
        this.peek.t -= dt;
        const lit = g.players.some((p) => p.lights(this.ghost.position.x, this.ghost.position.z, 25));
        if (lit && !this.peek.seen) { this.peek.seen = true; this.peek.t = Math.min(this.peek.t, 0.35); LAB.Audio.screech(0.35, this.pan(this.peek.p), true); }
        this.ghost.rotation.y = Math.atan2(this.peek.p.x - this.ghost.position.x, this.peek.p.z - this.ghost.position.z);
        LAB.Models.animateStalker(this.ghost, time, 0, true, false);
        if (this.peek.t <= 0) { this.ghost.visible = false; this.peek = null; }
      }

      // random creepy things
      if (g.state !== 'play' || g.wakeT > 0) return;
      this.ambientT -= dt;
      if (this.ambientT <= 0) {
        this.ambientT = U.rand(g.nightmare ? 8 : 12, g.nightmare ? 20 : 28);
        const p = U.pick(g.players.filter((pp) => pp.standing)) || g.players[0];
        const r = Math.random();
        if (r < 0.3) LAB.Audio.distant();
        else if (r < 0.45) this.ventCrawl(p);
        else if (r < 0.6) this.bloodDrip(p);
        else if (r < 0.75) this.doorSlam(p);
        else if (r < 0.9) this.stalkerPeek(p);
        else W.blackout(0.4);
      }
      this.voiceT -= dt;
      if (this.voiceT <= 0) {
        this.voiceT = U.rand(80, 140);
        g.radio(U.pick([
          'Warning. Containment breach on sublevel 13.',
          'All personnel. Evacuate. Evacuate.',
          'Life signs detected. Two. No. Three.',
          'Do not. Turn off. The lights.',
          'Specimen thirteen. Location. Unknown.',
          'It is. Right. Behind you.',
        ]), 'FACILITY', 'pa');
      }
    }
  }
  return ScareSystem;
})();
