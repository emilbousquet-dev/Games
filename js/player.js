// ============================================================
//  LAB 13 — THE PLAYERS
//  Player 1: Dr. Sam REYES (orange hazmat suit)
//  Player 2: Officer Jo PARK (blue security uniform)
// ============================================================
window.LAB = window.LAB || {};

LAB.Player = (function () {
  const U = LAB.U, Mo = LAB.Models, W = () => LAB.World;

  const WALK = 3.0, SPRINT = 5.4, RADIUS = 0.35, EYE = 1.62;

  class Player {
    constructor(index, scene, game) {
      this.i = index;
      this.game = game;
      this.name = index === 0 ? 'DR. REYES' : 'OFFICER PARK';
      this.style = index === 0 ? 'hazmat' : 'guard';
      const s = LAB.World.starts[index] || LAB.World.starts[0];
      this.x = s.x; this.z = s.z;
      this.yaw = Math.PI; // facing "down" the map (toward the cryo door)
      this.pitch = 0;
      this.hp = 100; this.battery = 100; this.stamina = 100;
      this.flashOn = true;
      this.downed = false; this.bleed = 0; this.reviveT = 0;
      this.attackT = 0; this.swingAnim = 0;
      this.bob = 0; this.stepSide = 0;
      this.hurtFlash = 0; this.shake = 0;
      this.grabbedBy = null;
      this.speed = 0;
      this.dead = false;

      // camera (what this player sees)
      this.cam = new THREE.PerspectiveCamera(72, 1, 0.05, 80);
      this.cam.layers.enable(0);
      this.cam.layers.enable(index === 0 ? 2 : 1); // see the OTHER player's body
      this.cam.layers.enable(index === 0 ? 3 : 4); // see our own hands
      scene.add(this.cam);

      // flashlight
      this.flash = new THREE.SpotLight(0xfff1d6, 60, 26, 0.42, 0.45, 1.3);
      this.flash.castShadow = true;
      this.flash.shadow.mapSize.set(512, 512);
      this.flash.shadow.camera.near = 0.3;
      this.flash.shadow.camera.far = 26;
      this.flash.shadow.bias = -0.002;
      this.flash.position.set(0.2, -0.15, 0);
      this.cam.add(this.flash);
      this.flash.target.position.set(0, -0.1, -5);
      this.cam.add(this.flash.target);
      // a faint glow around the player so it is never 100% black

      // hands in first person
      this.vm = Mo.viewModel(this.style);
      this.vm.traverse((o) => { o.layers.set(index === 0 ? 3 : 4); o.castShadow = false; o.receiveShadow = false; });
      this.cam.add(this.vm);

      // the body the other player sees
      this.body = Mo.human(this.style);
      this.body.traverse((o) => { o.layers.set(index === 0 ? 1 : 2); });
      scene.add(this.body);
      // colored light on the helmet so your friend can find you
      this.beacon = new THREE.PointLight(index === 0 ? 0xff7020 : 0x2080ff, 1.2, 3, 2);
      this.beacon.position.set(0, 1.9, -0.3);
      this.beacon.layers.set(index === 0 ? 1 : 2); // only the OTHER player sees this light
      this.body.add(this.beacon);
    }

    get cx() { return U.worldToCell(this.x); }
    get cy() { return U.worldToCell(this.z); }
    get standing() { return !this.downed && !this.dead; }
    forward() { return { x: -Math.sin(this.yaw), z: -Math.cos(this.yaw) }; }

    damage(amount, fromX, fromZ, source) {
      if (this.downed || this.dead || this.game.state !== 'play') return;
      if (this.game.god) amount = 0;
      this.hp -= amount;
      this.hurtFlash = 1;
      this.shake = Math.max(this.shake, 0.4);
      LAB.Audio.hurt(this.i === 0 ? -0.6 : 0.6);
      LAB.Input.rumble(this.i, 0.9, 250);
      this.game.hud.bloodSplat(this.i, amount);
      LAB.Effects.blood(this.x, 1.3, this.z, 14, false);
      if (Math.random() < 0.6) LAB.World.addBlood(this.x + U.rand(-0.5, 0.5), this.z + U.rand(-0.5, 0.5), U.rand(0.6, 1.2));
      if (fromX !== undefined) { // knockback
        const d = Math.hypot(this.x - fromX, this.z - fromZ) || 1;
        this.kx = (this.x - fromX) / d * 5; this.kz = (this.z - fromZ) / d * 5;
      }
      if (this.hp <= 0) {
        this.hp = 0; this.downed = true; this.bleed = 45; this.flashOn = false;
        if (this.grabbedBy) this.grabbedBy.release();
        this.game.message(this.i, 'YOU ARE DOWN! Your partner can revive you.');
        this.game.message(1 - this.i, (this.i === 0 ? 'REYES' : 'PARK') + ' IS DOWN! Hold USE next to them to revive!');
        LAB.Audio.screech(0.4, this.i === 0 ? -0.6 : 0.6, true);
      }
    }

    heal(n) { this.hp = Math.min(100, this.hp + n); }

    update(dt, inp, time) {
      this.input = inp;
      const game = this.game;
      this.hurtFlash = Math.max(0, this.hurtFlash - dt * 1.5);
      this.shake = Math.max(0, this.shake - dt * 1.5);
      this.attackT -= dt;

      // ---- downed: slowly bleeding out ----
      if (this.downed) {
        this.bleed -= dt;
        this.reviveT = 0;
        if (this.bleed <= 0 && !this.dead) { this.dead = true; this.game.onPlayerDied(this); }
        // crawl very slowly
        this.yaw -= inp.turn * 1.2 * dt + inp.lookDX;
        const f = this.forward();
        const nx = this.x + f.x * inp.move * 0.5 * dt, nz = this.z + f.z * inp.move * 0.5 * dt;
        const pos = { x: nx, z: nz }; LAB.World.collide(pos, RADIUS); this.x = pos.x; this.z = pos.z;
        this.pitch = U.lerp(this.pitch, 0.3, dt * 2);
        this.placeCamera(dt, time, 0.35);
        return;
      }

      // ---- grabbed by a hanger: you're pulled up! ----
      if (this.grabbedBy) {
        const g = this.grabbedBy;
        this.x = U.lerp(this.x, g.x, dt * 4); this.z = U.lerp(this.z, g.z, dt * 4);
        this.liftY = Math.min(1.1, (this.liftY || 0) + dt * 0.4);
        this.pitch = U.lerp(this.pitch, 1.2, dt * 3);
        this.yaw -= inp.turn * 1.0 * dt;
        this.shake = Math.max(this.shake, 0.15);
        if (inp.attackPressed && this.attackT <= 0) this.swing();
        this.updateFlash(dt, inp);
        this.placeCamera(dt, time, EYE + this.liftY);
        return;
      }
      this.liftY = Math.max(0, (this.liftY || 0) - dt * 3);

      // ---- turning / looking ----
      this.yaw -= inp.turn * 2.6 * dt + inp.lookDX;
      this.pitch += inp.look * 1.8 * dt - inp.lookDY;
      if (!inp.look && !inp.lookDY && !inp.pad && !LAB.Input.mouse.locked) this.pitch = U.lerp(this.pitch, 0, dt * 1.5);
      this.pitch = U.clamp(this.pitch, -1.2, 1.2);

      // ---- moving ----
      const wantSprint = inp.sprint && inp.move > 0.2 && this.stamina > 1;
      let spd = wantSprint ? SPRINT : WALK;
      if (this.hp < 25) spd *= 0.8;
      if (wantSprint) this.stamina = Math.max(0, this.stamina - 22 * dt);
      else this.stamina = Math.min(100, this.stamina + (inp.move ? 12 : 20) * dt);
      this.sprinting = wantSprint;
      const f = this.forward();
      const rx = -f.z, rz = f.x; // right direction
      let mx = f.x * inp.move + rx * inp.strafe, mz = f.z * inp.move + rz * inp.strafe;
      const ml = Math.hypot(mx, mz);
      if (ml > 1) { mx /= ml; mz /= ml; }
      const pos = { x: this.x + mx * spd * dt, z: this.z + mz * spd * dt };
      if (this.kx) { pos.x += this.kx * dt; pos.z += this.kz * dt; this.kx *= Math.pow(0.02, dt); this.kz *= Math.pow(0.02, dt); if (Math.abs(this.kx) < 0.05) this.kx = this.kz = 0; }
      LAB.World.collide(pos, RADIUS);
      // don't walk through the other player
      const o = game.players[1 - this.i];
      if (o && !o.dead) {
        const dx = pos.x - o.x, dz = pos.z - o.z, d = Math.hypot(dx, dz);
        if (d < RADIUS * 2 && d > 0.001) { pos.x = o.x + dx / d * RADIUS * 2; pos.z = o.z + dz / d * RADIUS * 2; LAB.World.collide(pos, RADIUS); }
      }
      this.speed = Math.hypot(pos.x - this.x, pos.z - this.z) / Math.max(dt, 0.001);
      this.x = pos.x; this.z = pos.z;

      // footsteps + head bob
      if (this.speed > 0.5) {
        const before = Math.sin(this.bob);
        this.bob += dt * this.speed * 2.3;
        const after = Math.sin(this.bob);
        if (Math.sign(before) !== Math.sign(after)) {
          LAB.Audio.footstep(this.sprinting ? 0.7 : 0.45, this.i === 0 ? -0.5 : 0.5, true);
          this.noise = this.sprinting ? 14 : 6; // how far aliens can hear us
        }
      } else this.bob = U.lerp(this.bob, Math.round(this.bob / Math.PI) * Math.PI, dt * 5);
      this.noise = Math.max(0, (this.noise || 0) - dt * 10);

      // ---- flashlight ----
      this.updateFlash(dt, inp);

      // ---- attack (wrench) ----
      if (inp.attackPressed && this.attackT <= 0) this.swing();

      // ---- use: revive partner ----
      if (o && o.downed && !o.dead && U.dist(this.x, this.z, o.x, o.z) < 2.0) {
        if (inp.use) {
          o.reviveT += dt;
          if (o.reviveT > 3) {
            o.downed = false; o.hp = 40; o.reviveT = 0; o.flashOn = true;
            game.message(o.i, 'You were revived! Stay close!');
            game.message(this.i, 'Partner revived!');
            game.stats.revives++;
          }
        } else o.reviveT = 0;
      }

      this.placeCamera(dt, time, EYE + this.liftY);
    }

    updateFlash(dt, inp) {
      if (inp.flashPressed && this.battery > 0) { this.flashOn = !this.flashOn; LAB.Audio.flashClick(this.i === 0 ? -0.5 : 0.5); }
      if (this.flashOn) {
        this.battery = Math.max(0, this.battery - dt * (this.freezing ? 1.4 : 0.55));
        if (this.battery <= 0) { this.flashOn = false; this.game.message(this.i, 'Flashlight battery is EMPTY! Turn it off to recharge or find a battery.'); }
      } else this.battery = Math.min(100, this.battery + dt * 0.8);
      let inten = this.flashOn ? 60 : 0;
      if (this.flashOn && this.battery < 20) { // low battery flicker
        if (Math.sin(performance.now() * 0.03) + Math.sin(performance.now() * 0.011) > 1.4) inten *= 0.1;
        inten *= 0.4 + this.battery / 33;
      }
      if (LAB.World.isBlackout() && Math.random() < 0.3) inten *= 0.1;
      this.flash.intensity = inten;
    }

    swing() {
      this.attackT = 0.55; this.swingAnim = 1;
      LAB.Audio.swing(this.i === 0 ? -0.5 : 0.5);
      this.noise = 10;
      const f = this.forward();
      let hit = false;
      for (const a of this.game.aliens) {
        if (!a.alive) continue;
        const dx = a.x - this.x, dz = a.z - this.z;
        const d = Math.hypot(dx, dz);
        const reach = a.type === 'hanger' ? 1.4 : 2.0;
        if (d > reach + (a.radius || 0.4)) continue;
        if (a.type !== 'hanger' && (dx * f.x + dz * f.z) / (d || 1) < 0.45) continue;
        a.hit(this, 1);
        hit = true;
      }
      // hit the hanger that is holding my partner
      const o = this.game.players[1 - this.i];
      if (!hit && o && o.grabbedBy && U.dist(this.x, this.z, o.x, o.z) < 2.2) { o.grabbedBy.hit(this, 1); hit = true; }
      if (hit) { this.shake = Math.max(this.shake, 0.2); LAB.Input.rumble(this.i, 0.5, 120); }
    }

    placeCamera(dt, time, eye) {
      const bobY = Math.sin(this.bob * 2) * 0.045 * Math.min(1, this.speed / 3);
      const bobX = Math.cos(this.bob) * 0.03 * Math.min(1, this.speed / 3);
      const sh = this.shake * this.shake;
      this.cam.position.set(this.x + (Math.random() - 0.5) * sh * 0.3, eye + bobY + (Math.random() - 0.5) * sh * 0.3, this.z);
      this.cam.rotation.set(0, 0, 0);
      this.cam.rotation.order = 'YXZ';
      this.cam.rotation.y = this.yaw + bobX * 0.05;
      this.cam.rotation.x = this.pitch + (Math.random() - 0.5) * sh * 0.1;
      this.cam.rotation.z = this.downed ? 0.5 : bobX * 0.3;
      // hands animation
      const vm = this.vm.userData;
      this.swingAnim = Math.max(0, this.swingAnim - dt * 3.5);
      const s = Math.sin(this.swingAnim * Math.PI);
      vm.left.rotation.set(-s * 1.6, s * 0.6, s * 0.5);
      vm.left.position.set(-0.19 + s * 0.1, -0.25 + Math.sin(this.bob * 2) * 0.008 + s * 0.08, -0.42 - s * 0.1);
      vm.right.position.set(0.17 + bobX * 0.15, -0.21 + bobY * 0.25, -0.42);
      vm.lens.material = this.flashOn && this.flash.intensity > 5 ? Mo.M.eyeYellow() : Mo.M.lampOff();
      this.vm.visible = !this.downed;
      // body seen by the other player
      this.body.position.set(this.x, (this.liftY || 0), this.z);
      this.body.rotation.y = this.yaw + Math.PI;
      Mo.animateHuman(this.body, this.bob, this.speed, this.downed);
      this.body.userData.parts.head.rotation.x = -this.pitch * 0.5;
      this.body.userData.parts.lens.material = this.flashOn ? Mo.M.eyeYellow() : Mo.M.lampOff();
      this.beacon.intensity = this.downed ? 1.5 + Math.sin(time * 6) : 1.0;
      this.beacon.color.setHex(this.downed ? 0xff0000 : (this.i === 0 ? 0xff7020 : 0x2080ff));
    }

    // is point (x,y,z) inside my flashlight beam?
    lights(x, z, maxDist = 17) {
      if (!this.flashOn || this.downed || this.flash.intensity < 5) return false;
      const dx = x - this.x, dz = z - this.z, d = Math.hypot(dx, dz);
      if (d > maxDist || d < 0.01) return false;
      const f = this.forward();
      if ((dx * f.x + dz * f.z) / d < Math.cos(0.4)) return false;
      return LAB.World.los(this.x, this.z, x, z);
    }
  }

  return Player;
})();
