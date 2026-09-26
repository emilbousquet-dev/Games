// ============================================================
//  SPARE PARTS — LEVELS
//  A level is a list of blocks. Every block is drawn AND solid.
// ============================================================
window.SP = window.SP || {};

SP.Level = (function () {
  // toy colors for the blocks
  const COLORS = { floor: 0xf2e6c9, wall: 0xffffff, red: 0xff5a5f, yellow: 0xffc933, green: 0x5cc96b, purple: 0x9b6bff };

  // the test room: a floor, low walls and some toy blocks to jump on
  const TEST_ROOM = {
    spawns: [[-2, 3], [2, 3]],
    blocks: [
      // [x, y, z, width, height, depth, color]
      [0, -0.5, 0, 20, 1, 16, 'floor'],
      [0, 0.5, -8.5, 21, 1, 1, 'wall'], [0, 0.5, 8.5, 21, 1, 1, 'wall'],
      [-10.5, 0.5, 0, 1, 1, 16, 'wall'], [10.5, 0.5, 0, 1, 1, 16, 'wall'],
      // stairs
      [-6, 0.4, -4, 2, 0.8, 2, 'red'], [-6, 0.8, -6, 2, 1.6, 2, 'yellow'], [-3.5, 1.2, -6.5, 3, 2.4, 1.5, 'green'],
      // a tall tower (too high to jump on... for now!)
      [5, 1.75, -5, 2, 3.5, 2, 'purple'],
      // small blocks
      [3, 0.35, 1, 1.2, 0.7, 1.2, 'yellow'], [6, 0.5, 2, 1.5, 1, 1.5, 'red'],
    ],
  };

  function build(scene, data) {
    const solids = [];
    const group = new THREE.Group();
    for (const [x, y, z, w, h, d, c] of data.blocks) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color: COLORS[c], roughness: 0.8 })
      );
      mesh.position.set(x, y, z);
      mesh.castShadow = c !== 'floor';
      mesh.receiveShadow = true;
      group.add(mesh);
      solids.push(SP.Physics.box(x, y, z, w, h, d));
    }
    scene.add(group);
    return { group, solids, spawns: data.spawns };
  }

  return { TEST_ROOM, build };
})();
