// ============================================================
//  SIGMA RUN — AUTO PARKOUR (like Rooftop Run!)
//  The runner jumps, climbs, wall runs, slides and grabs
//  ziplines by itself. You only steer left and right
//  (to grab coins and dodge missiles), and press the
//  ROCKET and SIGMA buttons.
// ============================================================
window.SR = window.SR || {};

SR.Auto = (function () {
  const U = SR.U;
  let jumpCool = 0, slideCool = 0;

  // where the "lane" is on a roof: the middle part that is always safe to run on
  function laneX(roof, steer) {
    const half = Math.max(0.5, Math.min(2.7, (roof.x1 - roof.x0) / 2 - 1.8));
    return roof.cx + steer * half;
  }
  function clampToLane(roof, x) { return U.clamp(x, roof.cx - 2.6, roof.cx + 2.6); }

  // changes the controls (inp) so the runner does all the parkour by itself
  function drive(P, inp, dt) {
    jumpCool -= dt; slideCool -= dt;
    const segs = SR.Level.segs;
    const seg = SR.Level.segAt(P.pos.z) || segs[0];
    if (!seg || !seg.roof) return;
    const next = segs[segs.indexOf(seg) + 1];
    const roof = seg.roof, link = seg.link, edge = roof.z0, toEdge = P.pos.z - edge;
    const gapEnd = next ? next.roof.z1 : edge - 10;
    const steer = inp.steer || 0;
    const side = seg.wallrunSide || 1;
    let tx = laneX(roof, steer), jump = false, slide = false;
    if (P.pos.z < edge && next) tx = laneX(next.roof, steer);

    switch (link) {
      case 'gap': case 'climb': case 'drop':
        // line up with the next roof (but stay in the safe lane until the edge)
        if (toEdge < 8 && next) tx = toEdge > 0 ? clampToLane(roof, laneX(next.roof, steer)) : laneX(next.roof, steer);
        if (toEdge < 0.9 && toEdge > -0.5 && P.grounded) jump = true;
        break;
      case 'crane':
        if (toEdge < 10 && P.pos.z > gapEnd) tx = roof.cx;
        break;
      case 'pad':
        if (toEdge < 10 && toEdge > -1) tx = roof.cx;
        break;
      case 'zipline':
        if (toEdge < 10 && toEdge > -2) tx = roof.cx + 1;
        break;
      case 'wallrun':
        if (toEdge < 14) tx = roof.cx + side * 2.4;
        if (toEdge < 1 && toEdge > -0.5 && P.grounded) jump = true;
        if (P.mode === 'wallrun') tx = roof.cx + side * 3;
        if (next && P.pos.z < gapEnd + 1) tx = laneX(next.roof, steer);
        break;
      case 'zigzag':
        if (toEdge < 14) tx = roof.cx + side * 2.4;
        if (toEdge < 1 && toEdge > -0.5 && P.grounded) jump = true;
        // jump from the first wall to the second one
        if (P.mode === 'wallrun' && P.pos.z < edge - 9 && P.pos.z > edge - 14 && P.pos.x * side > roof.cx * side) jump = true;
        if (P.pos.z < edge - 9) tx = roof.cx - side * 3;
        if (next && P.pos.z < gapEnd + 1) tx = laneX(next.roof, steer);
        break;
    }

    // FBI agent right in front of you? Slide-tackle him!
    if (P.grounded && !P.sliding && slideCool <= 0 && SR.FBI._agents) {
      for (const a of SR.FBI._agents) {
        if (a.state !== 'chase' && a.state !== 'pop') continue;
        const ahead = P.pos.z - a.z;
        if (ahead > 1.2 && ahead < 7 && Math.abs(a.x - P.pos.x) < 1.4 && Math.abs(a.y - P.pos.y) < 1) { slide = true; break; }
      }
    }

    if (jump && jumpCool <= 0) { inp.pressed.add('jump'); jumpCool = 0.4; }
    if (slide) { inp.pressed.add('slide'); slideCool = 1.2; }
    inp.mx = U.clamp((tx - P.pos.x) * 0.55, -1, 1);
    inp.my = 1;
    inp.lookX = 0; inp.lookY = 0;
    inp.slideHeld = false;
  }

  function reset() { jumpCool = 0; slideCool = 0; }

  return { drive, reset };
})();
