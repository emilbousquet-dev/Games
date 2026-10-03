// ============================================================
//  SPARE PARTS — AIMING A THROW
//  While you hold a throw button: a power meter above your head,
//  an arrow on the floor, and dots showing where it will land.
// ============================================================
window.SP = window.SP || {};

SP.Aim = (function () {
  const DOTS = 16;
  const sets = new Map(); // one set of aiming things per robot
  let scene = null;

  function init(s) { scene = s; }

  // things drawn on top of everything so you can always see them
  const onTop = (color, opacity = 1) =>
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false });

  function makeSet(robot) {
    const group = new THREE.Group();
    group.visible = false;
    group.renderOrder = 10;

    // power meter: a dark bar with a colored fill that grows from the left
    const meter = new THREE.Group();
    const back = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.36), onTop(0x26304a, 0.85));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.22), onTop(0x44dd66));
    fill.position.z = 0.01;
    meter.add(back, fill);
    [back, fill].forEach((m) => { m.renderOrder = 11; });

    // arrow flat on the floor
    const shape = new THREE.Shape();
    shape.moveTo(-0.12, 0); shape.lineTo(0.12, 0); shape.lineTo(0.12, 0.7); shape.lineTo(0.3, 0.7);
    shape.lineTo(0, 1.1); shape.lineTo(-0.3, 0.7); shape.lineTo(-0.12, 0.7); shape.closePath();
    const arrow = new THREE.Mesh(new THREE.ShapeGeometry(shape), onTop(robot.color, 0.9));
    arrow.rotation.x = -Math.PI / 2;
    const arrowHolder = new THREE.Group();
    arrowHolder.add(arrow);
    arrow.renderOrder = 11;

    // dotted path + a ring where it lands
    const dots = [];
    const dotGeo = new THREE.SphereGeometry(0.07, 8, 6);
    for (let i = 0; i < DOTS; i++) {
      const d = new THREE.Mesh(dotGeo, onTop(0xffffff, 0.9));
      d.renderOrder = 11;
      group.add(d);
      dots.push(d);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 8, 24), onTop(robot.color));
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 11;

    group.add(meter, arrowHolder, ring);
    scene.add(group);
    return { group, meter, fill, arrowHolder, arrow, dots, ring, beep: 0 };
  }

  // follow the throw with the same physics a real limb uses, to see where it lands
  function predict(robot, power, solids) {
    const { pos, vel } = SP.Parts.launch(robot, power);
    const body = { pos, vel, halfW: 0.2, height: 0.3, onGround: false, landSpeed: 0 };
    const points = [pos.clone()];
    for (let i = 0; i < 180; i++) {
      const hits = SP.Physics.step(body, 1 / 60, solids);
      points.push(body.pos.clone());
      if (body.onGround || hits.x || hits.z || body.pos.y < -8) break;
    }
    return points;
  }

  function update(robots, solids, camera, dt) {
    for (const r of robots) {
      if (!sets.has(r)) sets.set(r, makeSet(r));
      const s = sets.get(r);
      s.group.visible = !!r.aim;
      if (!r.aim) continue;
      const p = r.aim.power;

      // meter above the head, always facing the camera
      s.meter.position.set(r.pos.x, r.pos.y + r.height + 0.9, r.pos.z);
      s.meter.quaternion.copy(camera.quaternion);
      s.fill.scale.x = Math.max(0.02, p);
      s.fill.position.x = (-0.5 + p / 2) * 1.5;
      s.fill.material.color.setHSL(0.33 * (1 - p), 0.9, 0.5); // green → yellow → red

      // arrow gets longer when the throw is stronger
      s.arrowHolder.position.set(r.pos.x, r.pos.y + 0.06, r.pos.z);
      s.arrowHolder.rotation.y = r.facing;
      s.arrow.position.z = 0.45;
      s.arrow.scale.set(1.5, 1 + p * 1.8, 1);
      s.arrow.rotation.z = Math.PI; // the arrow shape points along its own y; turn it to point forward

      // dotted path
      const pts = predict(r, p, solids);
      for (let i = 0; i < DOTS; i++) {
        const k = Math.min(pts.length - 1, Math.round((i + 1) / DOTS * (pts.length - 1)));
        s.dots[i].position.copy(pts[k]);
        s.dots[i].position.y += 0.15;
        s.dots[i].visible = k < pts.length - 1;
      }
      const end = pts[pts.length - 1];
      s.ring.position.set(end.x, end.y + 0.05, end.z);
      s.ring.visible = end.y > -7;
      s.ring.scale.setScalar(1 + Math.sin(performance.now() / 120) * 0.12);

      // a beep that goes higher when the meter is stronger
      s.beep -= dt;
      if (s.beep <= 0) { s.beep = 0.12; if (SP.Audio) SP.Audio.play('charge', p); }
    }
  }

  return { init, update, predict };
})();
