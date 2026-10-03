// ============================================================
//  SIGMA HOVER GP — THE TRACK MAKER
//  Turns a list of simple commands like "right 90 50" into a
//  real 3D race track (the path, the width, banking, ramps,
//  boost pads, item boxes...).
//
//  Every racer lives in "track space":
//    s = how far along the track (meters)
//    d = how far to the right of the middle (meters, minus = left)
//    h = how high above the road
//  That makes loops, banked curves and upside-down roads easy!
// ============================================================
window.HG = window.HG || {};

HG.Track = (function () {
  const U = HG.U;
  const DS = 2;                 // one sample every 2 meters
  const F = { GAP: 1, WATER: 2, ICE: 4, DIRT: 8, TUNNEL: 16, ANTI: 32, GLIDE: 64, FALL_L: 128, FALL_R: 256, NOROAD: 512 };

  // ---------------- read the commands ----------------
  function parse(cmd) {
    const t = cmd.trim().toLowerCase().split(/\s+/);
    const p = { kind: t[0], nums: [], mods: {} };
    let i = 1;
    while (i < t.length && !isNaN(parseFloat(t[i]))) p.nums.push(parseFloat(t[i++]));
    while (i < t.length) {
      const k = t[i++];
      if (i < t.length && !isNaN(parseFloat(t[i]))) p.mods[k] = parseFloat(t[i++]);
      else p.mods[k] = true;
    }
    return p;
  }

  // ---------------- walk the turtle ----------------
  // returns raw points every ~1 m with all their settings
  function walk(def, extra) {
    const pts = [];
    const info = [];
    let x = 0, y = 0, z = 0, yaw = 0;      // yaw 0 = going +z. Turning right makes yaw smaller.
    let width = def.width || 24, bankBase = 0;
    let offL = def.offroad || 3, offR = def.offroad || 3;
    const feats = [];                      // things placed on the track: { kind, at (raw index), ... }
    const pieces = def.course.map(parse);

    for (const p of pieces) {
      const m = p.mods;
      if (p.kind === 'width') { width = p.nums[0]; continue; }
      if (p.kind === 'offroad') { offL = offR = p.nums[0]; continue; }
      const startIndex = pts.length;
      info[pieces.indexOf(p)] = { yaw, kind: p.kind };
      let len = 0, turn = 0, radius = 50, loopR = 0, twist = 0, shiftLoop = 0;
      if (p.kind === 'straight' || p.kind === 'jump' || p.kind === 'glide' || p.kind === 'gap') len = (p.nums[0] || 40) + (extra ? extra[pieces.indexOf(p)] || 0 : 0);
      else if (p.kind === 'left' || p.kind === 'right') {
        const ang = (p.nums[0] || 90) * Math.PI / 180;
        radius = p.nums[1] || 50;
        len = ang * radius;
        turn = p.kind === 'left' ? ang : -ang;
      } else if (p.kind === 'loop') {
        loopR = p.nums[0] || 24;
        len = Math.PI * 2 * loopR;
        shiftLoop = (m.shift || width + 6) * (m.left ? -1 : 1);
      } else if (p.kind === 'twist') { len = p.nums[0] || 90; twist = 360; }
      else { console.warn('Unknown track command:', p.kind); continue; }

      const h0 = y;
      const dh = (m.up || 0) - (m.down || 0);
      const w0 = width, w1 = m.width !== undefined ? m.width : width;
      if (m.width !== undefined) width = m.width;
      const bankTarget = m.bank ? (turn > 0 ? -m.bank : turn < 0 ? m.bank : m.bank) : 0;
      const isJump = p.kind === 'jump', isGlide = p.kind === 'glide', isGap = p.kind === 'gap' || isJump || isGlide;
      // shoulders (offroad next to the road): "off 10" for this piece, "cut" = a big inside corner to cut with a turbo
      const oL = m.off !== undefined ? m.off : (m.cut && turn > 0 ? Math.min(18, radius * 0.45) : offL);
      const oR = m.off !== undefined ? m.off : (m.cut && turn < 0 ? Math.min(18, radius * 0.45) : offR);
      const n = Math.max(2, Math.ceil(len));
      const startYaw = yaw, sx = x, sz = z;
      // loop: go up and over while sliding sideways so we don't hit ourselves
      for (let k = 0; k < n; k++) {
        const t = k / n;
        let flags = 0;
        if (m.water) flags |= F.WATER;
        if (m.ice) flags |= F.ICE;
        if (m.dirt) flags |= F.DIRT;
        if (m.tunnel) flags |= F.TUNNEL;
        if (m.anti || loopR || twist) flags |= F.ANTI;
        if (m.fall || def.fall) flags |= F.FALL_L | F.FALL_R;
        if (m['fall-left']) flags |= F.FALL_L;
        if (m['fall-right']) flags |= F.FALL_R;
        if (m.wall) flags &= ~(F.FALL_L | F.FALL_R);
        if (isGap) flags |= F.GAP;
        if (isGlide) flags |= F.GLIDE;
        // smooth in/out of the bank over the first and last 25%
        const bankK = Math.min(1, t / 0.25, (1 - t) / 0.25);
        let bank = bankBase + bankTarget * U.smooth(U.clamp(bankK, 0, 1)) + twist * U.smooth(t);
        let px, py, pz;
        if (loopR) {
          const a = t * Math.PI * 2;
          const fwd = loopR * Math.sin(a), upv = loopR * (1 - Math.cos(a));
          const side = shiftLoop * U.smooth(t);
          const fx = Math.sin(startYaw), fz = Math.cos(startYaw);
          const rx = -Math.cos(startYaw), rz = Math.sin(startYaw);
          px = sx + fx * fwd + rx * side; pz = sz + fz * fwd + rz * side;
          py = h0 + upv;
        } else {
          px = x; pz = z; py = h0 + dh * U.smooth(t);
        }
        pts.push({
          x: px, y: py, z: pz, w: U.lerp(w0, w1, U.smooth(t)), bank, flags,
          offL: U.lerp(offL, oL, U.smooth(U.clamp(Math.min(t, 1 - t) * 6, 0, 1))), offR: U.lerp(offR, oR, U.smooth(U.clamp(Math.min(t, 1 - t) * 6, 0, 1))),
          piece: pieces.indexOf(p),
        });
        // step forward 1 m (len/n)
        if (!loopR) {
          const step = len / n;
          const yawMid = yaw + (turn / n) * 0.5;
          x += Math.sin(yawMid) * step; z += Math.cos(yawMid) * step;
          yaw += turn / n;
        }
      }
      if (loopR) {
        const fx = Math.sin(startYaw), fz = Math.cos(startYaw), rx = -Math.cos(startYaw), rz = Math.sin(startYaw);
        x = sx + rx * shiftLoop; z = sz + rz * shiftLoop;
        x += fx * 0.001; z += fz * 0.001;
      }
      y = h0 + dh;
      bankBase += twist;
      // features on this piece (stored with raw indexes, turned into meters later)
      const a = startIndex, b = pts.length;
      const lane = m['boost-left'] ? -0.5 : m['boost-right'] ? 0.5 : 0;
      if (m.boost || m['boost-left'] || m['boost-right']) feats.push({ kind: 'boost', at: a + (b - a) * 0.5, lane, wide: !lane });
      if (m.boost2) { feats.push({ kind: 'boost', at: a + (b - a) * 0.3, lane: -0.5 }); feats.push({ kind: 'boost', at: a + (b - a) * 0.7, lane: 0.5 }); }
      if (m.items) feats.push({ kind: 'items', at: a + Math.min(20, (b - a) * 0.3) });
      if (m.items2) feats.push({ kind: 'items', at: a + (b - a) * 0.8 });
      if (m.coins || m['coins-left'] || m['coins-right']) feats.push({ kind: 'coins', at: a + (b - a) * 0.15, to: a + (b - a) * 0.85, lane: m['coins-left'] ? -0.55 : m['coins-right'] ? 0.55 : 0 });
      if (m.ramp) feats.push({ kind: 'ramp', at: b - 1, len: 9, height: 1.6, trick: true });
      if (isJump) feats.push({ kind: 'ramp', at: a, len: 12, height: 2.4, trick: true, gap: len });
      if (isGlide) feats.push({ kind: 'ramp', at: a, len: 14, height: 3.2, trick: true, gap: len, glide: true });
      for (const k in m) if (k.startsWith('hazard')) feats.push({ kind: 'hazard', type: k.split(':')[1] || 'roller', at: a + (b - a) * 0.5, from: a, to: b, n: typeof m[k] === 'number' ? m[k] : 1 });
      if (m.sign) feats.push({ kind: 'sign', at: a });
    }
    return { pts, feats, endX: x, endY: y, endZ: z, endYaw: yaw, info, pieces };
  }

  // ---------------- build the track ----------------
  class Track {
    constructor(def) {
      this.def = def;
      let W = walk(def);
      // make the track meet itself: stretch or shrink the straights a little (as little as possible)
      if (def.autoClose !== false) {
        const st = [];
        W.info.forEach((inf, i) => { if (inf && inf.kind === 'straight' && !W.pieces[i].mods.fixed) st.push({ i, ux: Math.sin(inf.yaw), uz: Math.cos(inf.yaw), len: W.pieces[i].nums[0] || 40 }); });
        const ex = W.endX - W.pts[0].x, ez = W.endZ - W.pts[0].z;
        if (st.length >= 2) {
          // least squares: deltas = -U^T (U U^T)^-1 e, weighted so long straights change more
          let a = 0, b = 0, c = 0;
          for (const q of st) { const wgt = q.len; a += wgt * q.ux * q.ux; b += wgt * q.ux * q.uz; c += wgt * q.uz * q.uz; }
          const det = a * c - b * b;
          if (Math.abs(det) > 1e-6) {
            const lx = (c * -ex - b * -ez) / det, lz = (a * -ez - b * -ex) / det;
            const extra = [];
            let ok = true;
            for (const q of st) { const dlt = q.len * (q.ux * lx + q.uz * lz); extra[q.i] = dlt; if (q.len + dlt < 12) ok = false; }
            if (ok) W = walk(def, extra);
            else console.warn(def.name + ': could not close the track by changing straights');
          }
        }
      }
      const pts = W.pts;
      // close the loop: spread the small error over the whole lap
      const ex = W.endX - pts[0].x, ey = W.endY - pts[0].y, ez = W.endZ - pts[0].z;
      this.closeError = Math.hypot(ex, ey, ez);
      const turnErr = U.wrapAngle(W.endYaw) * 180 / Math.PI;
      this.turnError = turnErr;
      if (Math.abs(turnErr) > 2) console.warn(def.name + ': the turns don\'t add up to a full circle (off by ' + turnErr.toFixed(1) + '°)');
      const n0 = pts.length;
      for (let i = 0; i < n0; i++) {
        const k = i / n0;
        pts[i].x -= ex * k; pts[i].y -= ey * k; pts[i].z -= ez * k;
      }
      // light smoothing so corners flow
      for (let it = 0; it < 4; it++) {
        const nx = [], ny = [], nz = [];
        for (let i = 0; i < n0; i++) {
          const a = pts[(i - 1 + n0) % n0], b = pts[i], c = pts[(i + 1) % n0];
          nx.push((a.x + b.x * 2 + c.x) / 4); ny.push((a.y + b.y * 2 + c.y) / 4); nz.push((a.z + b.z * 2 + c.z) / 4);
        }
        for (let i = 0; i < n0; i++) { pts[i].x = nx[i]; pts[i].y = ny[i]; pts[i].z = nz[i]; }
      }
      // measure the real length and resample every DS meters
      const cum = [0];
      for (let i = 1; i <= n0; i++) {
        const a = pts[i - 1], b = pts[i % n0];
        cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
      }
      const L = cum[n0];
      const N = Math.round(L / DS);
      this.length = L; this.n = N; this.ds = L / N;
      const P = [], Wd = [], Bk = [], Fl = [], OL = [], OR = [], PC = [];
      const rawToS = (raw) => { const i = Math.floor(raw), f = raw - i; return U.lerp(cum[Math.min(i, n0)], cum[Math.min(i + 1, n0)], f); };
      let j = 0;
      for (let i = 0; i < N; i++) {
        const s = i * this.ds;
        while (j < n0 - 1 && cum[j + 1] < s) j++;
        const a = pts[j], b = pts[(j + 1) % n0];
        const f = U.clamp((s - cum[j]) / Math.max(1e-6, cum[j + 1] - cum[j]), 0, 1);
        P.push(new THREE.Vector3(U.lerp(a.x, b.x, f), U.lerp(a.y, b.y, f), U.lerp(a.z, b.z, f)));
        Wd.push(U.lerp(a.w, b.w, f)); Bk.push(U.lerp(a.bank, b.bank, f)); OL.push(U.lerp(a.offL, b.offL, f)); OR.push(U.lerp(a.offR, b.offR, f));
        Fl.push(f < 0.5 ? a.flags : b.flags); PC.push(a.piece);
      }
      // smooth width and bank a bit more
      const smoothArr = (arr, its) => {
        for (let it = 0; it < its; it++) {
          const c = arr.slice();
          for (let i = 0; i < N; i++) arr[i] = (c[(i - 1 + N) % N] + c[i] * 2 + c[(i + 1) % N]) / 4;
        }
      };
      smoothArr(Wd, 6); smoothArr(OL, 4); smoothArr(OR, 4);
      // (bank can jump by 360 in twists, smooth it carefully)
      smoothArr(Bk, 8);
      this.P = P; this.W = Wd; this.flags = Fl; this.offL = OL; this.offR = OR; this.piece = PC;
      // directions
      const T = [];
      for (let i = 0; i < N; i++) T.push(new THREE.Vector3().subVectors(P[(i + 1) % N], P[(i - 1 + N) % N]).normalize());
      // up vectors that don't twist (rotation minimizing frames)
      const Nn = [new THREE.Vector3(0, 1, 0)];
      Nn[0].sub(T[0].clone().multiplyScalar(Nn[0].dot(T[0]))).normalize();
      const v1 = new THREE.Vector3(), rL = new THREE.Vector3(), tL = new THREE.Vector3(), v2 = new THREE.Vector3();
      for (let i = 0; i < N; i++) {
        const i1 = (i + 1) % N;
        v1.subVectors(P[i1], P[i]);
        const c1 = v1.dot(v1) || 1e-6;
        rL.copy(Nn[i]).addScaledVector(v1, -2 / c1 * v1.dot(Nn[i]));
        tL.copy(T[i]).addScaledVector(v1, -2 / c1 * v1.dot(T[i]));
        v2.subVectors(T[i1], tL);
        const c2 = v2.dot(v2);
        const nx = rL.clone();
        if (c2 > 1e-12) nx.addScaledVector(v2, -2 / c2 * v2.dot(rL));
        nx.sub(T[i1].clone().multiplyScalar(nx.dot(T[i1]))).normalize();
        if (i1 === 0) { this._closing = nx; break; }
        Nn.push(nx);
      }
      // remove the leftover twist at the end of the lap
      let twist = 0;
      if (this._closing) {
        const a = Nn[0], b = this._closing;
        const cr = new THREE.Vector3().crossVectors(b, a);
        twist = Math.atan2(cr.dot(T[0]), b.dot(a));
      }
      const Rr = [];
      for (let i = 0; i < N; i++) {
        const ang = twist * (i / N) + (-Bk[i] * Math.PI / 180);
        Nn[i].applyAxisAngle(T[i], ang);
        Rr.push(new THREE.Vector3().crossVectors(T[i], Nn[i]).normalize());
      }
      this.T = T; this.N = Nn; this.R = Rr;
      // curvature (how fast the road turns right; minus = left)
      this.K = [];
      for (let i = 0; i < N; i++) {
        const dT = new THREE.Vector3().subVectors(T[(i + 1) % N], T[(i - 1 + N) % N]).multiplyScalar(1 / (2 * this.ds));
        this.K.push(dT.dot(Rr[i]));
      }
      // lowest point (for the ground under the track)
      this.minY = Infinity; this.maxY = -Infinity;
      this.box = new THREE.Box3();
      for (const p of P) { this.minY = Math.min(this.minY, p.y); this.maxY = Math.max(this.maxY, p.y); this.box.expandByPoint(p); }

      // ---------------- things on the track ----------------
      this.boosts = []; this.ramps = []; this.itemRows = []; this.coins = []; this.hazards = []; this.signs = [];
      for (const f of W.feats) {
        const s = rawToS(f.at) * (L / cum[n0]);
        if (f.kind === 'boost') this.boosts.push({ s, len: 8, lane: f.lane, wide: f.wide });
        else if (f.kind === 'items') this.itemRows.push({ s });
        else if (f.kind === 'coins') {
          const s1 = rawToS(f.to);
          for (let c = s; c < s1; c += 7) this.coins.push({ s: c, lane: f.lane + Math.sin(c * 0.05) * (f.lane ? 0.05 : 0.25) });
        } else if (f.kind === 'ramp') {
          // the ramp ends where the gap starts (or at the end of the piece)
          const end = s, start = s - f.len;
          this.ramps.push({ s0: start, s1: end, height: f.height, trick: f.trick, gap: f.gap || 0, glide: !!f.glide });
        } else if (f.kind === 'hazard') this.hazards.push({ type: f.type, s, s0: rawToS(f.from), s1: rawToS(f.to), n: f.n });
        else if (f.kind === 'sign') this.signs.push({ s });
      }
      // a ramp before a gap must stand on road: clear the GAP flag under it
      for (const r of this.ramps) {
        for (let s = r.s0 - 2; s <= r.s1; s += this.ds) {
          const i = this.idx(s);
          this.flags[i] &= ~(F.GAP | F.GLIDE);
        }
      }
      this.F = F;
    }

    // wrap any distance into 0..length
    wrap(s) { const L = this.length; return ((s % L) + L) % L; }
    // shortest difference between two distances (b - a), going around the loop
    diff(a, b) { const L = this.length; let d = (b - a) % L; if (d > L / 2) d -= L; if (d < -L / 2) d += L; return d; }
    idx(s) { return Math.floor(this.wrap(s) / this.ds) % this.n; }

    // the frame (position + directions) at a distance, smoothly blended
    frame(s, out) {
      s = this.wrap(s);
      const f0 = s / this.ds;
      const i = Math.floor(f0) % this.n, j = (i + 1) % this.n, f = f0 - Math.floor(f0);
      out.p.copy(this.P[i]).lerp(this.P[j], f);
      out.t.copy(this.T[i]).lerp(this.T[j], f).normalize();
      out.n.copy(this.N[i]).lerp(this.N[j], f).normalize();
      out.r.crossVectors(out.t, out.n).normalize();
      out.w = U.lerp(this.W[i], this.W[j], f);
      out.k = U.lerp(this.K[i], this.K[j], f);
      out.offL = U.lerp(this.offL[i], this.offL[j], f);
      out.offR = U.lerp(this.offR[i], this.offR[j], f);
      out.flags = this.flags[f < 0.5 ? i : j];
      out.i = i;
      return out;
    }
    // world position of a track-space point
    point(s, d, h, out, fr) {
      fr = this.frame(s, fr || Track.tmpFrame);
      return out.copy(fr.p).addScaledVector(fr.r, d).addScaledVector(fr.n, h);
    }
    // extra height from ramps under a point (and how steep)
    rampAt(s, d) {
      for (const r of this.ramps) {
        let a = this.diff(r.s0, s);
        const len = r.s1 - r.s0;
        if (a >= 0 && a <= len) return { h: r.height * (a / len), slope: r.height / len, ramp: r };
      }
      return null;
    }
    // is there ground here? (gaps have none)
    hasGround(s) { return !(this.flags[this.idx(s)] & F.GAP); }

    // find the closest track distance to a world position (used for respawning and the minimap)
    nearest(pos, hintS) {
      let best = 0, bd = Infinity;
      const scan = (i0, i1) => {
        for (let k = i0; k <= i1; k++) {
          const i = ((k % this.n) + this.n) % this.n;
          const d = this.P[i].distanceToSquared(pos);
          if (d < bd) { bd = d; best = i; }
        }
      };
      if (hintS !== undefined) { const c = this.idx(hintS); scan(c - 30, c + 30); } else scan(0, this.n - 1);
      return best * this.ds;
    }
  }
  Track.tmpFrame = { p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3(), r: new THREE.Vector3(), w: 0, k: 0, offL: 0, offR: 0, flags: 0, i: 0 };
  Track.makeFrame = () => ({ p: new THREE.Vector3(), t: new THREE.Vector3(), n: new THREE.Vector3(), r: new THREE.Vector3(), w: 0, k: 0, offL: 0, offR: 0, flags: 0, i: 0 });
  Track.F = F;
  Track.parse = parse;
  return Track;
})();
