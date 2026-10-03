// ============================================================
//  SIGMA HOVER GP — HOW A RACER LOOKS ON SCREEN
//  Puts the 3D model where the racer is, tilts it in turns,
//  spins it when it's hit, does tricks, flames, sparks...
// ============================================================
window.HG = window.HG || {};

HG.KartView = class {
  constructor(kart, scene) {
    this.kart = kart;
    this.scene = scene;
    this.root = new THREE.Group();
    this.tilt = new THREE.Group();
    this.root.add(this.tilt);
    this.t = Math.random() * 10;
    this.racer = HG.Models ? HG.Models.racer(kart) : HG.KartView.placeholder(kart);
    this.tilt.add(this.racer.group);
    // a soft dark shadow under the racer (looks nice even with shadows off)
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 4.2), new THREE.MeshBasicMaterial({ map: HG.Tex.shadow(), transparent: true, depthWrite: false, opacity: 0.8 }));
    sh.rotation.x = -Math.PI / 2;
    sh.renderOrder = 1;
    this.shadow = sh;
    this.root.add(sh);
    // under-glow of the hover engine
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.4), new THREE.MeshBasicMaterial({ map: HG.Tex.dot(), color: this.racer.glowColor || 0x40d0ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6, toneMapped: false }));
    glow.rotation.x = -Math.PI / 2;
    glow.renderOrder = 2;
    this.glow = glow;
    this.root.add(glow);
    scene.add(this.root);
    this.spinYaw = 0; this.flip = 0; this.roll = 0; this.driftYaw = 0; this.ghostOn = false;
    this.scale = 1;
    this._q = new THREE.Quaternion();
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); } });
  }

  update(dt, track, camPos) {
    const k = this.kart, U = HG.U, a = k.anim;
    this.t += dt;
    const bob = Math.sin(this.t * 3.1) * 0.07 + Math.sin(this.t * 7.3) * 0.02;
    k.worldPose(track, this.root.position, this.root.quaternion, k.grounded ? bob : 0);
    if (k.out) { this.root.visible = false; return; } else this.root.visible = true;

    // ---------- the fun rotations ----------
    // drifting: the nose points into the turn
    this.driftYaw = U.damp(this.driftYaw, k.drift.dir * 0.42 + (k.drift.dir ? k.steerSm * 0.12 : k.steerSm * 0.08), 9, dt);
    let yaw = this.driftYaw, pitch = a.pitch, roll = a.lean * 0.55;
    // hit by an item
    if (k.hitT > 0) {
      if (k.hitKind === 'spin') yaw += k.hitSpin;
      else if (k.hitKind === 'tumble' || k.hitKind === 'fbi') { pitch -= U.clamp(k.hitSpin / 8, 0, 1) * Math.PI * 2; roll += Math.sin(k.hitSpin) * 0.3; }
    }
    // tricks
    if (k.trick > 0) {
      const tt = U.clamp(k.trick / 0.55, 0, 1), e = U.smooth(tt);
      if (k.trickType === 0) yaw += e * Math.PI * 2;
      else if (k.trickType === 1) pitch -= e * Math.PI * 2;
      else if (k.trickType === 2) roll += e * Math.PI * 2 * (k.id % 2 ? 1 : -1);
      else pitch -= Math.sin(tt * Math.PI) * 0.35;
    }
    // anti-gravity bump spin
    if (a.spinBoost > 0) { a.spinBoost = Math.max(0, a.spinBoost - dt * 2); yaw += (1 - a.spinBoost) * Math.PI * 2 * (a.spinBoost > 0 ? 1 : 0); }
    // falling: tumble a bit
    if (k.falling > 0) { pitch += k.falling * 1.2; roll += k.falling * 0.8; }
    this.tilt.rotation.set(0, 0, 0);
    this.tilt.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
    // squash and stretch when landing, flat when squashed
    const sq = a.squash * 0.18;
    let s = k.shrinkT > 0 ? 0.55 : 1;
    if (k.missileT > 0) s = 1;
    this.scale = U.damp(this.scale, s, 8, dt);
    const flat = k.squashT > 0 ? 0.35 : 1;
    this.tilt.scale.set(this.scale * (1 + sq * 0.5), this.scale * (1 - sq) * flat, this.scale * (1 + sq * 0.3));
    // the shadow sits on the road below
    const groundH = k.h + 0.55 + (k.grounded ? bob : 0);
    this.shadow.position.set(0, -groundH + 0.06, 0);
    const shS = U.clamp(1 - k.h * 0.06, 0.3, 1) * this.scale;
    this.shadow.scale.set(shS, shS, 1);
    this.shadow.visible = k.falling <= 0 && track.hasGround(k.s);
    this.glow.position.set(0, -groundH + 0.09, 0);
    this.glow.material.opacity = (0.35 + Math.min(0.5, Math.abs(k.spd) * 0.012) + (k.boosting ? 0.3 : 0)) * U.clamp(1 - k.h * 0.15, 0, 1);
    this.glow.visible = this.shadow.visible;
    this.glow.scale.setScalar(this.scale);
    // ghost: see-through
    const ghost = k.ghostT > 0 || k.isGhost;
    if (ghost !== this.ghostOn) {
      this.ghostOn = ghost;
      this.root.traverse((o) => { if (o.isMesh && o !== this.shadow && o !== this.glow && o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if (m.userData.baseOpacity === undefined) { m.userData.baseOpacity = m.opacity; m.userData.baseTransparent = m.transparent; } m.transparent = ghost || m.userData.baseTransparent; m.opacity = ghost ? 0.3 : m.userData.baseOpacity; m.needsUpdate = true; }); } });
    }
    if (this.racer.update) this.racer.update(dt, k, this);
  }
};

// a simple box kart for testing (before the real models load)
HG.KartView.placeholder = function (kart) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.6), new THREE.MeshStandardMaterial({ color: kart.color, roughness: 0.4, metalness: 0.3 }));
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffd0a0 }));
  head.position.set(0, 0.8, -0.2); head.castShadow = true;
  g.add(head);
  return { group: g };
};
