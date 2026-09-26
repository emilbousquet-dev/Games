// ============================================================
//  SPARE PARTS — THE LEVELS: "Escape the Toy Factory"
//  Levels go from left to right (x gets bigger).
//  Floors have their top at y = 0 unless it says otherwise.
// ============================================================
window.SP = window.SP || {};

SP.Levels = (function () {
  // a floor from x1 to x2 (its top is at `top`)
  const F = (x1, x2, top = 0, z1 = -4, z2 = 4, c = 'floor') => [(x1 + x2) / 2, top - 0.5, (z1 + z2) / 2, x2 - x1, 1, z2 - z1, c];
  // a block standing on the ground: center x/z, width, depth, height
  const B = (x, z, w, d, h, c, base = 0) => [x, base + h / 2, z, w, h, d, c];
  // a tall ledge from deep down up to `top`
  const T = (x1, x2, top, c = 'purple', z1 = -4, z2 = 4) => [(x1 + x2) / 2, (top - 8) / 2, (z1 + z2) / 2, x2 - x1, top + 8, z2 - z1, c];
  // a little island that rises out of a pit, with a rim so thrown limbs stay on it
  const island = (x, z, w, d, rimSide) => {
    const parts = [[x, -4, z, w, 8, d, 'yellow']];
    if (rimSide === 'x') parts.push([x + w / 2 + 0.15, 0.4, z, 0.3, 0.8, d, 'red']);
    if (rimSide === '-z') parts.push([x, 0.4, z - d / 2 - 0.15, w, 0.8, 0.3, 'red']);
    return parts;
  };
  // stairs that appear when a button is pressed (3 steps up to a 2.7 high step)
  const stairs = (xStart, z, open) => [
    { kind: 'bridge', open, color: 'green', box: [xStart + 0.5, 0.45, z, 1, 0.9, 2] },
    { kind: 'bridge', open, color: 'green', box: [xStart + 1.5, 0.9, z, 1, 1.8, 2] },
    { kind: 'bridge', open, color: 'green', box: [xStart + 2.75, 1.35, z, 1.5, 2.7, 2] },
  ];

  const LEVELS = [
    // ---------------------------------------------------------- 1
    {
      name: 'Wake Up',
      spawns: [[-3, 0, 0.5], [-1, 0, 0.5]],
      blocks: [
        F(-5, 10),
        B(4, -2, 1.5, 1.5, 0.6, 'yellow'), B(6.5, 1.5, 1.5, 1.5, 1.1, 'red'),
        F(12.5, 24),
        B(16, -2.5, 1.2, 1.2, 0.8, 'blue'), B(18, 2.5, 1.2, 1.2, 0.8, 'pink'),
        T(24, 34, 2.6),
      ],
      buttons: [{ id: 'a', x: 26.5, y: 2.6, z: 2.5 }],
      doors: stairs(21, 2.5, 'a'),
      checkpoints: [[14, 0, -2.5]],
      goal: [31, 2.6, 0],
      coins: [[4, 1.5, -2], [11.2, 1.6, 0], [18, 1.7, 2.5], [1, 5.2, -3], [29, 3.6, -3]],
      bouncers: [{ x: 1, y: 0, z: -3 }],
      hints: [
        { x: -3, z: 0, r: 4, text: 'Wake up, robots! Walk and jump. Press H to see all the controls.' },
        { x: 9, z: 0, r: 2.5, text: 'Jump over the gap!' },
        { x: 21.5, z: 0, r: 3, text: 'Too high! One robot stands still, the other jumps on its head, then jumps again!' },
        { x: 26.5, z: 1.5, r: 2.5, text: 'Stand on the red button to make stairs for your friend!' },
        { x: 31, z: 0, r: 3, text: 'Both robots on the checkered pad to finish!' },
      ],
    },
    // ---------------------------------------------------------- 2
    {
      name: 'Handy',
      spawns: [[-3, 0, 0.5], [-1, 0, 0.5]],
      blocks: [
        F(-5, 8),
        ...island(12, -2, 3, 2.6, 'x'),
        F(16, 34),
        ...island(21, -9, 2.6, 3, '-z'),
        ...island(25, -9, 2.6, 3, '-z'),
        B(28, 0, 0.6, 8, 5, 'grey', 3), // the wall above the door
      ],
      buttons: [
        { id: 'a', x: 12, y: 0, z: -2, size: 2.2 },
        { id: 'b', x: 21, y: 0, z: -9, size: 2.2 },
        { id: 'c', x: 25, y: 0, z: -9, size: 2.2 },
      ],
      doors: [
        { kind: 'bridge', open: 'a', color: 'wood', box: [12, -0.25, 2, 8, 0.5, 2.4] },
        { kind: 'door', open: ['b', 'c'], box: [28, 1.5, 0, 0.6, 3, 8] },
      ],
      checkpoints: [[18, 0, 1]],
      goal: [32, 0, 0],
      coins: [[12, 1.1, -2], [12, 1, 3], [23, 1, -3], [30, 1, 3], [-4, 1, -3]],
      hints: [
        { x: -2, z: 0, r: 3.5, text: 'Q or , throws an arm. Walk over it to put it back on!' },
        { x: 6.5, z: -1, r: 3, text: 'Throw an arm onto the button on the island to make a bridge!' },
        { x: 23, z: -2.5, r: 3.5, text: 'This door needs BOTH buttons pressed. Throw an arm each!' },
        { x: 32, z: 0, r: 3, text: 'Tap call back (R or /) to bring your arms home!' },
      ],
    },
    // ---------------------------------------------------------- 3
    {
      name: 'Leg Day',
      spawns: [[-3, 0, 0.5], [-1, 0, 0.5]],
      blocks: [
        F(-5, 10),
        T(10, 18, 3.5),
        T(22, 30, 3.5, 'pink'),
      ],
      buttons: [{ id: 'a', x: 12.5, y: 3.5, z: 2.5 }],
      doors: stairs(6, 2.5, 'a'),
      platforms: [{ box: [19, 3.25, 0, 2, 0.5, 2], to: [2, 0, 0], speed: 0.35 }],
      checkpoints: [[14, 3.5, -2.5]],
      goal: [26.5, 3.5, 0],
      coins: [[0, 1, 3], [0, 5.5, -3], [12, 4.5, -3], [20, 4.9, 0], [28.5, 4.5, 3]],
      bouncers: [{ x: 0, y: 0, z: -3 }],
      hints: [
        { x: -2, z: 0, r: 3.5, text: 'Leg Day! Throw both your legs at your friend (E or .)' },
        { x: 7.5, z: -1.5, r: 3, text: 'Wearing 4 legs? BOTH players press jump at the SAME time for a SUPER JUMP!' },
        { x: 12.5, z: 1.5, r: 2.5, text: 'Stand on the button! Friend: call your legs back (R or /) and climb the stairs.' },
        { x: 19, z: 0, r: 3, text: 'Ride the moving platform!' },
      ],
    },
    // ---------------------------------------------------------- 4
    {
      name: 'Conveyor Chaos',
      spawns: [[-3, 0, 0.5], [-1, 0, 0.5]],
      blocks: [
        F(-5, 6),
        F(22, 30),
        F(41.5, 50),
      ],
      conveyors: [{ box: [14, -0.25, 0, 16, 0.5, 4], dir: [-1, 0], speed: 2.5 }],
      squishers: [
        { x: 10, z: 0, w: 2, d: 4, top: 4.6, bottom: 0.4, period: 2.4, offset: 0, stop: ['a', 'b'] },
        { x: 14, z: 0, w: 2, d: 4, top: 4.6, bottom: 0.4, period: 2.4, offset: 0.33, stop: ['a', 'b'] },
        { x: 18, z: 0, w: 2, d: 4, top: 4.6, bottom: 0.4, period: 2.4, offset: 0.66, stop: ['a', 'b'] },
      ],
      buttons: [{ id: 'a', x: 3.5, y: 0, z: -2.8 }, { id: 'b', x: 25, y: 0, z: -2.8 }],
      platforms: [
        { box: [32.5, -0.25, -2.5, 2.5, 0.5, 2.5], to: [0, 0, 5], speed: 0.4 },
        { box: [35.5, -0.25, 0, 2.5, 0.5, 2.5], to: [3.5, 0, 0], speed: 0.35, offset: 1 },
      ],
      checkpoints: [[23.5, 0, 2.5]],
      goal: [46, 0, 0],
      coins: [[14, 1, 0], [25, 1, 3], [35.5, 1.2, 0], [48, 1, 3], [-4, 1, 3]],
      hints: [
        { x: 1, z: 0, r: 3.5, text: 'SQUISHERS! Stand on the button to stop them... or leave an arm on it!' },
        { x: 25, z: -1, r: 3, text: 'This button stops the squishers too. Help your friend across!' },
        { x: 29, z: 0, r: 2.5, text: 'Hop across the moving platforms!' },
        { x: 45, z: 0, r: 3.5, text: 'Tip: with your arm on your friend, HOLD call back to pull them to you!' },
      ],
    },
    // ---------------------------------------------------------- 5
    {
      name: 'The Big Escape',
      spawns: [[-3, 0, 0.5], [-1, 0, 0.5]],
      blocks: [
        F(-5, 8),
        ...island(12, -2, 3, 2.6, 'x'),
        F(16, 26),
        T(26, 33, 3.5),
        T(39, 44, 3.5, 'pink'),
        T(52, 62, 3.5, 'green'),
      ],
      buttons: [
        { id: 'a', x: 12, y: 0, z: -2, size: 2.2 },
        { id: 'b', x: 28, y: 3.5, z: 2.5 },
        { id: 'c', x: 31.5, y: 3.5, z: -2.8 },
      ],
      doors: [
        { kind: 'bridge', open: 'a', color: 'wood', box: [12, -0.25, 2, 8, 0.5, 2.4] },
        ...stairs(22, 2.5, 'b'),
      ],
      conveyors: [{ box: [36, 3.25, 0, 6, 0.5, 4], dir: [-1, 0], speed: 3 }],
      squishers: [{ x: 36, z: 0, w: 2, d: 4, top: 8, bottom: 3.9, period: 2, stop: 'c' }],
      platforms: [{ box: [45.5, 3.25, 0, 2.5, 0.5, 2.5], to: [5, 0, 0], speed: 0.3 }],
      checkpoints: [[18, 0, 1], [29.5, 3.5, -2.5]],
      goal: [57, 3.5, 0],
      coins: [[12, 1, 3], [24, 1, -3], [36, 4.6, 0], [48, 4.9, 0], [60, 4.5, 3]],
      hints: [
        { x: 6.5, z: -1, r: 3, text: 'Remember the bridge trick? Throw an arm on the button!' },
        { x: 21, z: -1.5, r: 3, text: 'Swap legs and SUPER JUMP together!' },
        { x: 31.5, z: -1.5, r: 2.5, text: 'This button stops the squisher!' },
        { x: 44, z: 0, r: 2.5, text: 'Almost out! Ride the platform!' },
        { x: 57, z: 0, r: 3.5, text: 'THE EXIT! Both robots on the pad!' },
      ],
    },
  ];

  // a room to mess around in
  const PLAYGROUND = {
    name: 'Playground',
    spawns: [[-2, 0, 3], [2, 0, 3]],
    blocks: [
      [0, -0.5, 0, 20, 1, 16, 'floor'],
      [0, 0.5, -8.5, 21, 1, 1, 'wall'], [0, 0.5, 8.5, 21, 1, 1, 'wall'],
      [-10.5, 0.5, 0, 1, 1, 16, 'wall'], [10.5, 0.5, 0, 1, 1, 16, 'wall'],
      B(-6, -4, 2, 2, 0.8, 'red'), B(-6, -6, 2, 2, 1.6, 'yellow'), B(-3.5, -6.5, 3, 1.5, 2.4, 'green'),
      B(5, -5, 2, 2, 3.5, 'purple'),
      B(3, 1, 1.2, 1.2, 0.7, 'yellow'), B(6, 2, 1.5, 1.5, 1, 'red'),
    ],
    buttons: [{ id: 'p', x: -7, y: 0, z: 5 }],
    conveyors: [{ box: [0, 0.1, 6, 7, 0.2, 2], dir: [1, 0], speed: 3 }],
    squishers: [{ x: 7, z: 6, w: 1.8, d: 1.8, top: 5, bottom: 0.4, period: 2.2, stop: 'p' }],
    platforms: [{ box: [7.5, 0.25, -5, 1.6, 0.5, 1.6], to: [0, 3.25, 0], speed: 0.3 }],
    bouncers: [{ x: -6, y: 0, z: 1 }, { x: -3, y: 0, z: 1, power: 22 }],
    coins: [[-6, 5, 1], [-3, 7.5, 1], [5, 4.6, -5]],
    hints: [
      { x: -7, z: 5, r: 2, text: 'This button stops the squisher.' },
      { x: 7.5, z: -5, r: 2, text: 'A lift! Ride it up to the tower.' },
    ],
  };

  return { LEVELS, PLAYGROUND };
})();
