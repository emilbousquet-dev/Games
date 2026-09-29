// ============================================================
//  STARFALL — THE ASTRONAUT: moving, jumping, gliding, fighting
//  and the camera that follows you.
// ============================================================
window.SF = window.SF || {};

// ------------------------------------------------------------
//  AVATAR: the 3D astronaut and its animations.
// ------------------------------------------------------------
SF.Avatar = class {
  constructor(scene, accent, name) {
    const a = SF.Models.astronaut(accent);
    this.group = a.group; this.P = a.P;
    scene.add(this.group);
    this.phase = 0; this.time = 0;
    this.accent = accent;
    // a round shadow under your feet (helps a lot when jumping!)
    this.blob = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    this.blob.rotation.x = -Math.PI / 2;
    scene.add(this.blob);
    // the swoosh you see when swinging the sword
    this.trail = new THREE.Group();
    this.trailMesh = new THREE.Mesh(new THREE.RingGeometry(0.7, 2.5, 20, 1, 0, Math.PI * 0.9), SF.Models.M.add(0x80f8ff, 0.0).clone());
    this.trailMesh.material.opacity = 0;
    this.trail.add(this.trailMesh);
    scene.add(this.trail);
    if (name) this.setName(name, accent);
    this.lastCombo = -1; this.lastStep = 0;
  }

  setName(name, color) {
    if (this.tag) this.group.remove(this.tag);
    const c = SF.U.canvas(256, 64, (g) => {
      g.font = 'bold 34px Trebuchet MS, sans-serif'; g.textAlign = 'center';
      g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,0.7)'; g.strokeText(name, 128, 44);
      g.fillStyle = '#' + new THREE.Color(color).getHexString(); g.fillText(name, 128, 44);
    });
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    this.tag.scale.set(2.4, 0.6, 1); this.tag.position.y = 2.5; this.tag.renderOrder = 10;
    this.group.add(this.tag);
  }

  remove(scene) { scene.remove(this.group); scene.remove(this.blob); scene.remove(this.trail); }

  // st = what the astronaut is doing right now
  animate(dt, st, ground) {
    const P = this.P, U = SF.U;
    this.time += dt;
    const g = this.group;
    g.position.set(st.x, st.y, st.z);
    g.rotation.set(0, st.f, 0);
    const sp = st.sp || 0;
    this.phase += dt * (2 + sp * 1.25);
    const k = U.clamp(sp / 5, 0, 1.3);
    const s = Math.sin(this.phase), c = Math.cos(this.phase);
    const R = (o, x = 0, y = 0, z = 0) => o.rotation.set(x, y, z);

    // reset
    R(P.hips); P.hips.position.y = 0.92; R(P.torso); R(P.head);
    R(P.shL, 0, 0, -0.1); R(P.shR, 0, 0, 0.1); R(P.elL, -0.2); R(P.elR, -0.2);
    R(P.hipL); R(P.hipR); R(P.knL); R(P.knR);
    P.glider.visible = false; P.shield.visible = false; P.bow.visible = false;
    P.flames.forEach((f) => (f.visible = false));
    g.visible = !(st.inv > 0 && Math.floor(this.time * 16) % 2 === 0);

    if (st.dn) {
      // knocked down: lying on the ground
      P.hips.position.y = 0.25;
      R(P.hips, -1.45, 0, 0);
      R(P.shL, -2.8, 0, -0.3); R(P.shR, -2.8, 0, 0.3);
      R(P.head, 0.3 + Math.sin(this.time * 2) * 0.1);
    } else if (st.sw) {
      // swimming
      P.hips.position.y = 0.5;
      R(P.hips, 1.2, 0, 0);
      R(P.head, -0.9);
      R(P.shL, -2.4 + s * 0.9, 0, -0.4); R(P.shR, -2.4 - s * 0.9, 0, 0.4);
      R(P.hipL, s * 0.5); R(P.hipR, -s * 0.5);
    } else if (st.gl) {
      // gliding
      P.glider.visible = true;
      P.wings.forEach((w, i) => (w.rotation.z = Math.sin(this.time * 8 + i) * 0.03));
      R(P.hips, 0.5, 0, 0);
      R(P.shL, -2.9, 0, -0.35); R(P.shR, -2.9, 0, 0.35);
      R(P.hipL, 0.35 + s * 0.1); R(P.hipR, 0.3 - s * 0.1); R(P.knL, 0.4); R(P.knR, 0.4);
      R(P.head, -0.5);
    } else if (!st.g) {
      // in the air
      const up = U.clamp(st.vy / 8, -1, 1);
      R(P.hipL, -0.5 - up * 0.2); R(P.knL, 0.9); R(P.hipR, 0.2); R(P.knR, 0.3);
      R(P.shL, -0.3 - up * 0.6, 0, -0.6); R(P.shR, -0.3 - up * 0.6, 0, 0.6);
      if (st.j > 0) P.flames.forEach((f) => { f.visible = true; f.scale.setScalar(0.8 + Math.random() * 0.5); });
    } else {
      // walking / running / standing
      R(P.hipL, s * 0.75 * k); R(P.hipR, -s * 0.75 * k);
      R(P.knL, Math.max(0, -c) * 1.0 * k + 0.05); R(P.knR, Math.max(0, c) * 1.0 * k + 0.05);
      R(P.shL, -s * 0.6 * k, 0, -0.1); R(P.shR, s * 0.6 * k, 0, 0.1);
      P.hips.position.y = 0.92 - Math.abs(c) * 0.06 * k + Math.sin(this.time * 2) * 0.008;
      R(P.torso, 0.1 * k, 0, 0);
      if (k > 0.2 && Math.abs(s) > 0.95 && this.time - this.lastStep > 0.2 && st.local) { this.lastStep = this.time; SF.Audio.sfx('step'); }
    }

    // shield
    if (st.bl && !st.dn) {
      P.shield.visible = true;
      R(P.shL, -1.35, 0.3, -0.2); R(P.elL, -0.9, 0, 0);
      P.shield.rotation.set(1.4, 0, 0.2);
    }
    // bow
    if (st.am && !st.dn) {
      P.bow.visible = true;
      R(P.torso, 0, 0, 0);
      const pitch = st.ap || 0;
      R(P.shL, -1.55 + pitch, 0.1, -0.1); R(P.elL, 0);
      R(P.shR, -1.5 + pitch, -0.5, 0.2); R(P.elR, -1.6);
      P.bow.rotation.set(0, 0, 0);
    }
    // sword swings
    if (st.at >= 0 && !st.dn) {
      const t = st.at, e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      if (st.ci === 0) { R(P.torso, 0, U.lerp(0.9, -1.0, e), 0); R(P.shR, -1.4, 0, U.lerp(0.9, 0.2, e)); R(P.elR, -0.3); }
      else if (st.ci === 1) { R(P.torso, 0, U.lerp(-1.0, 0.9, e), 0); R(P.shR, -1.6, 0, U.lerp(-0.2, 1.2, e)); R(P.elR, -0.3); }
      else { R(P.torso, U.lerp(-0.3, 0.4, e), 0, 0); R(P.shR, U.lerp(-3.2, -1.0, e), 0, 0.1); R(P.elR, -0.1); }
      // the swoosh
      if (this.lastCombo !== st.ci + st.cn * 3) {
        this.lastCombo = st.ci + st.cn * 3;
        this.trailMesh.material.opacity = 0.75;
      }
    } else this.lastCombo = -1;
    const tm = this.trailMesh;
    tm.material.opacity = Math.max(0, tm.material.opacity - dt * 4);
    this.trail.visible = tm.material.opacity > 0.01;
    if (this.trail.visible) {
      this.trail.position.set(st.x, st.y + 1.1, st.z);
      this.trail.rotation.set(0, st.f, 0);
      if (st.ci === 2) tm.rotation.set(0, -Math.PI / 2, 0);
      else tm.rotation.set(-Math.PI / 2, 0, -0.95 * Math.PI + (st.ci === 1 ? 0.15 : -0.15));
    }
    P.bladeGlow.scale.set(1 + Math.sin(this.time * 20) * 0.1, 1, 1);

    // the shadow blob
    this.blob.position.set(st.x, (ground ?? st.y) + 0.04, st.z);
    const hgt = st.y - (ground ?? st.y);
    this.blob.scale.setScalar(SF.U.clamp(1 - hgt * 0.04, 0.4, 1));
    this.blob.material.opacity = SF.U.clamp(0.35 - hgt * 0.01, 0.1, 0.35);
  }
};

// ------------------------------------------------------------
//  PLAYER: the astronaut YOU control
// ------------------------------------------------------------
SF.Player = class {
  constructor(scene, camera, accent = 0xff8a30, name = 'YOU') {
    this.scene = scene; this.camera = camera;
    this.avatar = new SF.Avatar(scene, accent, null);
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.facing = Math.PI; this.camYaw = 0; this.camPitch = 0.35; this.camDist = 7;
    this.grounded = false; this.gliding = false; this.swimming = false; this.jetT = 0; this.doubleJumped = false;
    this.attackT = -1; this.combo = 0; this.comboCount = 0; this.comboWindow = 0; this.hitDone = false;
    this.blocking = false; this.aiming = false; this.bowCD = 0; this.drawT = 0;
    this.inv = 0; this.down = false; this.downT = 0; this.knock = new THREE.Vector3();
    this.hp = 12; this.energy = 100;
    this.fallStart = null; this.safe = new THREE.Vector3(); this.safeT = 0;
    this.frozen = false;  // when talking or in a cutscene
    this.speedNow = 0;
    this.name = name;
    this.id = 'me';
  }

  get me() { return SF.State.me; }
  get powers() { return SF.State.world.powers; }
  get maxHp() { return this.me.maxHearts * 4; }
  get maxEnergy() { return 100 + this.me.energyLv * 40; }

  place(x, z, y) {
    const g = y !== undefined ? y : SF.Phys.groundAt(x, z);
    this.pos.set(x, g + 0.05, z);
    this.vel.set(0, 0, 0);
    this.safe.copy(this.pos);
    this.fallStart = null; this.gliding = false; this.swimming = false;
  }

  // ---------- getting hurt ----------
  hurt(amount, fromX, fromZ, knock = 6) {
    if (this.inv > 0 || this.down || SF.Game.cutscene) return false;
    if (this.blocking && fromX !== undefined) {
      const ang = Math.atan2(fromX - this.pos.x, fromZ - this.pos.z);
      if (Math.abs(SF.U.angleDiff(this.facing, ang)) < 1.3) {
        SF.Audio.sfx('block');
        SF.FX && SF.FX.sparks(this.pos.x + Math.sin(this.facing) * 0.7, this.pos.y + 1.2, this.pos.z + Math.cos(this.facing) * 0.7, 0x80e0ff, 10);
        const d = Math.hypot(this.pos.x - fromX, this.pos.z - fromZ) || 1;
        this.knock.set((this.pos.x - fromX) / d * knock * 0.4, 0, (this.pos.z - fromZ) / d * knock * 0.4);
        return false;
      }
    }
    this.hp = Math.max(0, this.hp - amount);
    this.inv = 1.0;
    SF.Audio.sfx('hurt');
    SF.HUD.hurtFlash();
    if (fromX !== undefined) {
      const d = Math.hypot(this.pos.x - fromX, this.pos.z - fromZ) || 1;
      this.knock.set((this.pos.x - fromX) / d * knock, 0, (this.pos.z - fromZ) / d * knock);
      if (this.grounded) this.vel.y = 4;
    }
    this.attackT = -1;
    if (this.hp <= 0) this.knockDown();
    return true;
  }

  knockDown() {
    this.down = true; this.downT = 0; this.gliding = false; this.aiming = false; this.blocking = false;
    SF.Game.onPlayerDown(this);
  }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  // ---------- every frame ----------
  update(dt, inp) {
    const U = SF.U, T = SF.Terrain, Ph = SF.Phys;
    this.inv = Math.max(0, this.inv - dt);
    this.jetT = Math.max(0, this.jetT - dt);
    this.bowCD = Math.max(0, this.bowCD - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);

    // ---- the camera turns with the mouse / right stick ----
    if (!SF.Game.cutscene) {
      this.camYaw -= inp.lookX;
      this.camPitch = U.clamp(this.camPitch + inp.lookY, this.aiming ? -1.15 : -0.45, 1.25);
    }
    if (inp.pad && !inp.lookX && (Math.abs(inp.mx) > 0.2) && !this.aiming) {
      // controller: the camera slowly turns to follow where you run
      this.camYaw += U.angleDiff(this.camYaw, this.facing + Math.PI) * dt * 0.6 * Math.abs(inp.mx);
    }

    if (this.down) {
      this.downT += dt;
      this.vel.x = this.vel.z = 0;
      this.physics(dt, 0, 0);
      return;
    }
    const locked = this.frozen;
    const mx = locked ? 0 : inp.mx, mz = locked ? 0 : inp.mz;

    // ---- which way to go (the camera decides what "forward" is) ----
    const sy = Math.sin(this.camYaw), cy = Math.cos(this.camYaw);
    let wx = -sy * -mz + cy * mx;
    let wz = -cy * -mz - sy * mx;
    const moveLen = Math.hypot(wx, wz);

    // ---- block, aim, sprint ----
    this.blocking = !locked && inp.block && !this.swimming && !this.gliding && this.attackT < 0;
    const canBow = this.powers.bow && !this.swimming && !this.gliding;
    const wasAiming = this.aiming;
    this.aiming = !locked && inp.aim && canBow && !this.blocking;
    if (this.aiming && !wasAiming) { SF.Audio.sfx('bowDraw'); this.drawT = 0; }
    if (this.aiming) this.drawT += dt;
    const sprint = !locked && inp.sprint && this.energy > 1 && moveLen > 0.1 && !this.blocking && !this.aiming && this.grounded && !this.exhausted;

    let speed = this.swimming ? 3.2 : sprint ? 8.8 : 5.4;
    if (this.blocking) speed = 2.2;
    if (this.aiming) speed = 2.6;
    if (this.attackT >= 0) speed = 1.2;

    // ---- energy (for running, gliding and swimming) ----
    let drain = 0;
    if (sprint) drain = 16;
    if (this.gliding) drain = 7;
    if (this.swimming && moveLen > 0.1) drain = 6;
    if (drain) this.energy -= drain * dt;
    else if (this.grounded || this.swimming) this.energy += 38 * dt;
    if (this.energy <= 0) { this.energy = 0; this.exhausted = true; }
    if (this.exhausted && this.energy > this.maxEnergy * 0.3) this.exhausted = false;
    this.energy = Math.min(this.maxEnergy, this.energy);
    if (this.energy <= 0 && this.gliding) { this.gliding = false; }

    // ---- facing ----
    if (this.aiming || this.blocking) {
      this.facing = U.dampAngle(this.facing, this.camYaw + Math.PI, 18, dt);
    } else if (moveLen > 0.1 && this.attackT < 0) {
      this.facing = U.dampAngle(this.facing, Math.atan2(wx, wz), this.grounded ? 12 : 5, dt);
    }

    // ---- horizontal speed ----
    const tx = moveLen > 0.05 ? (wx / Math.max(1, moveLen)) * speed : 0;
    const tz = moveLen > 0.05 ? (wz / Math.max(1, moveLen)) * speed : 0;
    if (this.gliding) {
      // gliding: always move forward a bit, steer with the stick
      const gs = 9.5;
      const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
      this.vel.x = U.damp(this.vel.x, fx * gs * (0.55 + 0.45 * Math.min(1, moveLen)), 2, dt);
      this.vel.z = U.damp(this.vel.z, fz * gs * (0.55 + 0.45 * Math.min(1, moveLen)), 2, dt);
    } else {
      const acc = this.grounded || this.swimming ? 14 : 4;
      this.vel.x = U.damp(this.vel.x, tx, acc, dt);
      this.vel.z = U.damp(this.vel.z, tz, acc, dt);
    }
    // being pushed back when hit
    this.vel.x += this.knock.x; this.vel.z += this.knock.z;
    this.knock.multiplyScalar(0);

    // ---- jump, double jump, glide ----
    if (!locked && inp.jumpPressed && this.attackT < 0) {
      if (this.swimming) {
        // nothing: you can't jump out of deep water
      } else if (this.grounded && !this.sliding) {
        this.vel.y = 8.2; this.grounded = false; this.doubleJumped = false;
        SF.Audio.sfx('jump');
      } else if (!this.grounded) {
        if (this.gliding) { this.gliding = false; }
        else if (this.powers.boots && !this.doubleJumped) {
          this.doubleJumped = true; this.vel.y = 9.2; this.jetT = 0.45; this.fallStart = this.pos.y;
          SF.Audio.sfx('jet');
          SF.FX && SF.FX.puff(this.pos.x, this.pos.y, this.pos.z, 0xffa040, 10);
        } else if (this.powers.glider && this.energy > 5 && !this.exhausted) {
          this.gliding = true; this.aiming = false;
          SF.Audio.sfx('glide');
        }
      }
    }

    // ---- sword ----
    if (!locked && inp.attackPressed && !this.aiming && !this.blocking && !this.swimming && !this.gliding && this.attackT < 0) {
      this.combo = this.comboWindow > 0 ? (this.combo + 1) % 3 : 0;
      // like in Zelda: turn toward the closest enemy
      const tg = SF.Creatures.nearestEnemy(this.pos, 5.5);
      if (tg) {
        const ang = Math.atan2(tg.x - this.pos.x, tg.z - this.pos.z);
        if (moveLen < 0.1 || Math.abs(SF.U.angleDiff(this.facing, ang)) < 1.8) this.facing = ang;
      }
      this.comboCount++;
      this.attackT = 0; this.hitDone = false;
      this.attackDur = this.combo === 2 ? 0.42 : 0.3;
      SF.Audio.sfx('swing', this.combo);
      // a little step forward
      this.vel.x += Math.sin(this.facing) * 3.5; this.vel.z += Math.cos(this.facing) * 3.5;
    }
    if (this.attackT >= 0) {
      this.attackT += dt;
      if (!this.hitDone && this.attackT > this.attackDur * 0.4) {
        this.hitDone = true;
        const dmg = (1 + this.me.swordLv * 0.5) * (this.combo === 2 ? 1.5 : 1);
        SF.Creatures.meleeHit(this, this.pos.x + Math.sin(this.facing) * 0.6, this.pos.y + 1, this.pos.z + Math.cos(this.facing) * 0.6, this.facing, 2.6, dmg, this.combo === 2 ? 9 : 5);
        SF.World.meleeHit(this.pos.x + Math.sin(this.facing) * 1.2, this.pos.z + Math.cos(this.facing) * 1.2, this.pos.y);
      }
      if (this.attackT > this.attackDur) { this.attackT = -1; this.comboWindow = 0.35; }
    }

    // ---- bow ----
    if (this.aiming && inp.attackPressed && this.bowCD <= 0) {
      this.bowCD = 0.45;
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      // aim at what is in the middle of the screen
      const start = new THREE.Vector3(this.pos.x + Math.sin(this.facing) * 0.6, this.pos.y + 1.45, this.pos.z + Math.cos(this.facing) * 0.6);
      const far = SF.Game.aimPoint(this.camera.position, dir, 90);
      const aimDir = far.sub(start).normalize();
      SF.Creatures.shootArrow(start, aimDir);
      SF.Audio.sfx('bowShoot');
    }

    this.physics(dt, moveLen, speed);
    this.speedNow = Math.hypot(this.vel.x, this.vel.z);
  }

  // ---------- moving + not going through the ground ----------
  physics(dt, moveLen) {
    const U = SF.U, T = SF.Terrain, Ph = SF.Phys;
    const p = this.pos;
    const SLOPE_MAX = 1.15, SLIDE = 1.35;

    // gravity
    if (!this.grounded || this.vel.y > 0) {
      if (this.gliding) this.vel.y = U.damp(this.vel.y, -2.3, 4, dt);
      else this.vel.y -= 22 * dt;
      if (this.vel.y < -40) this.vel.y = -40;
    }

    // try to move horizontally
    const tryMove = (dx, dz) => {
      const nx = p.x + dx, nz = p.z + dz;
      const th = Ph.arenaAt(nx, nz) ? -1e9 : T.heightAt(nx, nz);
      const g = Ph.groundAt(nx, nz, p.y);
      const onPlatform = g > th + 0.01;
      if (this.grounded) {
        if (g - p.y > Ph.STEP) return false;                 // a wall or a big step
        if (!onPlatform && g > p.y + 0.02 && T.slopeAt(nx, nz) > SLOPE_MAX && !Ph.arenaAt(nx, nz)) return false; // too steep to walk up
      } else {
        if (g > p.y + (this.swimming ? 1.1 : 0.35)) return false; // bumped into a cliff (you can climb out of water)
      }
      p.x = nx; p.z = nz;
      return true;
    };
    const dx = this.vel.x * dt, dz = this.vel.z * dt;
    if (dx || dz) {
      if (!tryMove(dx, dz)) {
        // slide along the wall
        if (!tryMove(dx, 0)) this.vel.x *= 0.5;
        if (!tryMove(0, dz)) this.vel.z *= 0.5;
      }
    }
    Ph.pushOut(p, 0.4, 1.8);

    // vertical
    p.y += this.vel.y * dt;
    let ground = Ph.groundAt(p.x, p.z, p.y);
    const water = T.WATER_Y - 1.0;
    const inArena = Ph.arenaAt(p.x, p.z);

    const wasGrounded = this.grounded;
    if (p.y <= ground) {
      p.y = ground;
      if (this.vel.y <= 0) {
        // landing!
        if (!wasGrounded) {
          const fall = this.fallStart !== null ? this.fallStart - p.y : 0;
          if (fall > 16 && !this.gliding) this.hurt(Math.min(8, Math.round((fall - 16) * 0.25) + 2));
          if (this.vel.y < -6) { SF.Audio.sfx('land'); SF.FX && SF.FX.puff(p.x, p.y, p.z, 0xd0c0e0, 5); }
        }
        this.vel.y = 0;
        this.grounded = true; this.gliding = false; this.doubleJumped = false; this.fallStart = null;
      }
    } else if (this.grounded && this.vel.y <= 0 && p.y - ground < 0.7) {
      p.y = ground; // stick to the ground when walking downhill
    } else {
      this.grounded = false;
    }
    if (!this.grounded) {
      if (this.fallStart === null || this.gliding || this.vel.y > 0) this.fallStart = p.y;
    }

    // sliding down very steep slopes
    this.sliding = false;
    if (this.grounded && !inArena && Math.abs(ground - T.heightAt(p.x, p.z)) < 0.01) {
      const sl = T.slopeAt(p.x, p.z);
      if (sl > SLIDE) {
        const gr = T.gradAt(p.x, p.z), l = Math.hypot(gr.x, gr.z) || 1;
        this.vel.x = -gr.x / l * 7; this.vel.z = -gr.z / l * 7;
        this.sliding = true;
      }
    }

    // swimming
    const wasSwimming = this.swimming;
    this.swimming = !inArena && ground < water - 0.1 && p.y < water + 0.05;
    if (this.swimming) {
      p.y = water; this.vel.y = 0; this.grounded = false; this.gliding = false; this.fallStart = null;
      if (!wasSwimming) { SF.Audio.sfx('splash'); SF.FX && SF.FX.splash(p.x, T.WATER_Y, p.z); }
      if (this.energy <= 0.5) {
        // too tired to swim!
        SF.HUD.toast('Too tired to swim!');
        this.hurt(2); this.place(this.safe.x, this.safe.z, this.safe.y); this.energy = this.maxEnergy * 0.5;
      }
    }

    // lava!
    if (!inArena && T.inLava(p.x, p.z) && p.y < T.LAVA_Y + 0.3 && !this.down) {
      SF.Audio.sfx('sizzle');
      SF.FX && SF.FX.puff(p.x, T.LAVA_Y, p.z, 0xff6020, 16);
      this.inv = 0;
      this.hurt(4);
      if (!this.down) this.place(this.safe.x, this.safe.z, this.safe.y);
    }
    // fell into the void of a temple
    if (inArena && p.y < inArena.y - 20) { this.hurt(2); this.place(inArena.x, inArena.z + 8); }

    // remember a safe spot (to come back to after falling in lava or water)
    this.safeT -= dt;
    if (this.grounded && !this.sliding && this.safeT <= 0 && !(T.inLava(p.x, p.z) && p.y < T.LAVA_Y + 2)) {
      this.safe.copy(p); this.safeT = 0.5;
    }
    this.groundY = this.swimming ? T.WATER_Y : ground;
  }

  // ---------- the camera ----------
  updateCamera(dt) {
    const U = SF.U, Ph = SF.Phys;
    const cam = this.camera;
    const aim = this.aiming;
    const targetDist = aim ? 2.6 : this.gliding ? 8.5 : 6.8;
    this.camDist = U.damp(this.camDist, targetDist, 6, dt);
    const pitch = this.camPitch;
    const tgt = new THREE.Vector3(this.pos.x, this.pos.y + (aim ? 1.65 : 1.5), this.pos.z);
    if (aim) {
      // over the right shoulder
      tgt.x += Math.cos(this.camYaw) * 0.75; tgt.z -= Math.sin(this.camYaw) * 0.75;
    }
    const dir = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.camYaw) * Math.cos(pitch));
    // don't let the camera go inside a hill
    let d = this.camDist;
    for (let i = 1; i <= 10; i++) {
      const t = (i / 10) * this.camDist;
      const x = tgt.x + dir.x * t, y = tgt.y + dir.y * t, z = tgt.z + dir.z * t;
      if (Ph.groundAt(x, z, y) + 0.35 > y) { d = Math.max(0.8, t - this.camDist / 10); break; }
    }
    const a = Ph.arenaAt(tgt.x, tgt.z);
    const want = tgt.clone().addScaledVector(dir, d);
    if (a) {
      const dx = want.x - a.x, dz = want.z - a.z, dd = Math.hypot(dx, dz);
      if (dd > a.r - 2.6) { want.x = a.x + dx / dd * (a.r - 2.6); want.z = a.z + dz / dd * (a.r - 2.6); }
    }
    if (!this.camInit) { cam.position.copy(want); this.camInit = true; }
    cam.position.lerp(want, 1 - Math.exp(-dt * 18));
    cam.lookAt(tgt);
    const fov = aim ? 50 : 62 + U.clamp(this.speedNow - 6, 0, 4);
    if (Math.abs(cam.fov - fov) > 0.1) { cam.fov = U.damp(cam.fov, fov, 8, dt); cam.updateProjectionMatrix(); }
  }

  // what the avatar should show
  state() {
    return {
      x: this.pos.x, y: this.pos.y, z: this.pos.z, f: this.facing, sp: this.speedNow, vy: this.vel.y,
      g: this.grounded, gl: this.gliding, sw: this.swimming, at: this.attackT >= 0 ? this.attackT / this.attackDur : -1,
      ci: this.combo, cn: this.comboCount, bl: this.blocking, am: this.aiming, ap: -this.camPitch * 0.6 + 0.15, dn: this.down, j: this.jetT, inv: this.inv,
      hp: this.hp, mh: this.maxHp, local: true,
    };
  }

  animate(dt) { this.avatar.animate(dt, this.state(), this.groundY); }
};
