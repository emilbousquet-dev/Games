// ============================================================
//  SIGMA HOVER GP — CAMERAS
//  The camera behind your racer, the fly-over before the race,
//  looking back, and the spin-around after the finish.
// ============================================================
window.HG = window.HG || {};

HG.ChaseCam = class {
  constructor(camera, kart) {
    this.cam = camera;
    this.kart = kart;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.fov = 72;
    this.shake = 0;
    this.lookBlend = 0;
    this.first = true;
    this.orbit = 0;
    this.fwd = new THREE.Vector3(0, 0, 1);
    this._p = new THREE.Vector3(); this._q = new THREE.Quaternion();
  }
  snap() { this.first = true; }

  update(dt, track, race) {
    const k = this.kart, U = HG.U;
    const kp = this._p, kq = this._q;
    k.worldPose(track, kp, kq, 0);
    const fr = track.frame(k.s, HG.ChaseCam.fr);
    // where the kart is heading (not where its nose points while drifting)
    const f = HG.V.d.copy(fr.t).multiplyScalar(Math.cos(k.yaw)).addScaledVector(fr.r, Math.sin(k.yaw)).normalize();
    if (k.falling > 0 || k.respawnT > 0) f.copy(this.fwd);
    // smooth the direction so the camera swings nicely in drifts
    this.fwd.lerp(f, 1 - Math.exp(-(k.drift.dir ? 3.5 : 6) * dt)).normalize();
    const up = fr.n;
    this.up.lerp(up, 1 - Math.exp(-5 * dt)).normalize();
    const boost = k.boosting ? 1 : 0;
    const dist = (5.3 + boost * 0.8 + U.clamp(k.speedFrac, 0, 1.3) * 0.5) * HG.settings.camDist;
    const height = 2.25 * HG.settings.camDist;
    this.lookBlend = U.damp(this.lookBlend, k.input.lookBack && !k.finished ? 1 : 0, 14, dt);
    const back = this.lookBlend > 0.5 ? -1 : 1;
    const want = HG.V.e.copy(kp).addScaledVector(this.fwd, -dist * back).addScaledVector(this.up, height);
    // after the finish: slowly spin around the racer
    if (k.finished && race && race.cfg && !race.battle) {
      this.orbit += dt * 0.35;
      const side = HG.V.f.crossVectors(this.fwd, this.up).normalize();
      want.copy(kp).addScaledVector(this.fwd, Math.cos(this.orbit + Math.PI) * 7).addScaledVector(side, Math.sin(this.orbit + Math.PI) * 7).addScaledVector(this.up, 2.2);
    }
    if (k.falling > 0) want.copy(this.pos);
    if (this.first) { this.pos.copy(want); this.first = false; this.up.copy(up); }
    // the camera follows a bit softly (more when going fast)
    const stiff = this.lookBlend > 0.05 && this.lookBlend < 0.95 ? 40 : 15;
    this.pos.x = U.damp(this.pos.x, want.x, stiff, dt);
    this.pos.y = U.damp(this.pos.y, want.y, stiff * 0.8, dt);
    this.pos.z = U.damp(this.pos.z, want.z, stiff, dt);
    const lookAt = HG.V.a.copy(kp).addScaledVector(this.up, 1.15).addScaledVector(this.fwd, 3.5 * back);
    if (k.finished) lookAt.copy(kp).addScaledVector(this.up, 0.9);
    this.look.copy(lookAt);
    this.cam.position.copy(this.pos);
    // shake when you get hit or land hard
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2.5);
      const s = this.shake * 0.25;
      this.cam.position.x += (Math.random() - 0.5) * s; this.cam.position.y += (Math.random() - 0.5) * s; this.cam.position.z += (Math.random() - 0.5) * s;
    }
    this.cam.up.copy(this.up);
    this.cam.lookAt(this.look);
    const fovWant = 70 + U.clamp(k.speedFrac, 0, 1.4) * 6 + boost * 9;
    this.fov = U.damp(this.fov, fovWant, 4, dt);
    if (Math.abs(this.cam.fov - this.fov) > 0.01) { this.cam.fov = this.fov; this.cam.updateProjectionMatrix(); }
  }
};
HG.ChaseCam.fr = HG.Track.makeFrame();

// the fly-over before the race starts: swoops along the track to the start line
HG.IntroCam = {
  update(cam, track, t, total) {
    const U = HG.U;
    const k = U.clamp(t / total, 0, 1);
    if (track.isArena) {
      const a = k * Math.PI * 1.2;
      const r = track.size * 0.9;
      cam.position.set(Math.cos(a) * r, 28 - k * 14, Math.sin(a) * r);
      cam.up.set(0, 1, 0);
      cam.lookAt(0, 0, 0);
      return;
    }
    const s = -260 + U.smooth(k) * 250;
    const fr = track.frame(s, HG.Track.makeFrame());
    const ahead = track.frame(s + 40, HG.Track.makeFrame());
    const side = Math.sin(k * Math.PI) * 26;
    cam.position.copy(fr.p).addScaledVector(fr.n, 18 - k * 12).addScaledVector(fr.r, side);
    cam.up.set(0, 1, 0);
    cam.lookAt(ahead.p);
  },
};
