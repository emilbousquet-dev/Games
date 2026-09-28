// ============================================================
//  DEAD ACRES — THE MAP  (edit me!)
//
//  The world is 640 x 640 meters. The middle is (0, 0).
//  x goes from west (-) to east (+), z from north (-) to south (+).
//  Hills and forests are made by math, but you can move
//  the roads, the town, the lake and all the buildings here.
//
//  After changing something: save and reload the page.
//  (Everyone playing online together must have the same map!)
// ============================================================
window.DA = window.DA || {};

DA.MAP = {
  seed: 1337,          // change this number for different hills and forests
  size: 640,           // the world is size x size meters
  border: 300,         // invisible fence: you can't walk further than this from the middle
  water: 0,            // height of the water

  spawn: [-66, 8],     // where you wake up

  // the lake and the river that flows out of it
  lake: { x: -120, z: -120, r: 55 },
  river: [[-120, -120], [-175, -100], [-235, -135], [-330, -110]],

  // flat areas (the town, the farm...). h = height of the ground
  flats: [
    { x: 65, z: 24, w: 190, d: 85, h: 8 },       // the town
    { x: -130, z: 165, w: 110, d: 90, h: 9 },    // the farm
    { x: 150, z: 205, w: 30, d: 30, h: 12 },     // the cabin in the woods
    { x: 208, z: -182, w: 44, d: 44, h: 26 },    // the top of Radio Hill
  ],

  // roads: lists of [x, z] points. w = width in meters
  roads: [
    { w: 8, dirt: false, pts: [[-330, -20], [-220, -10], [-120, 8], [-40, 22], [40, 24], [130, 24], [220, 40], [330, 60]] },
    { w: 6, dirt: true, pts: [[-58, 21], [-78, 80], [-112, 135], [-140, 160]] },           // to the farm
    { w: 7, dirt: false, pts: [[150, 25], [168, -40], [186, -110], [204, -160]] },           // up Radio Hill
    { w: 4, dirt: true, pts: [[64, 26], [74, 90], [112, 160], [146, 196]] },                 // trail to the cabin
    { w: 5, dirt: true, pts: [[-110, 10], [-110, -40], [-100, -62]] },                        // to the lake
  ],

  // buildings: type, position x z, and rot = which way the front door faces
  //   rot 0 = door faces north (-z), 1 = west (-x), 2 = south (+z), 3 = east (+x)
  // radio: true  -> one of the 3 RADIO PARTS is hidden in this building
  buildings: [
    // --- the town, south side of the main road (doors face the road)
    { type: 'house', x: -4, z: 42, rot: 0 },
    { type: 'house', x: 12, z: 42, rot: 0 },
    { type: 'bighouse', x: 29, z: 44, rot: 0 },
    { type: 'store', x: 52, z: 45, rot: 0 },
    { type: 'house', x: 74, z: 42, rot: 0 },
    { type: 'house', x: 90, z: 42, rot: 0 },
    { type: 'bighouse', x: 108, z: 44, rot: 0 },
    // --- north side of the main road
    { type: 'house', x: 0, z: 6, rot: 2 },
    { type: 'bighouse', x: 17, z: 4, rot: 2 },
    { type: 'police', x: 40, z: 5, rot: 2, radio: true },
    { type: 'house', x: 84, z: 6, rot: 2 },
    { type: 'house', x: 100, z: 6, rot: 2 },
    { type: 'gas', x: 126, z: 2, rot: 2, radio: true },
    // --- the farm
    { type: 'barn', x: -150, z: 182, rot: 3 },
    { type: 'bighouse', x: -118, z: 186, rot: 0 },
    // --- the cabin in the woods
    { type: 'cabin', x: 152, z: 208, rot: 0, radio: true },
    // --- Radio Hill
    { type: 'tower', x: 208, z: -190, rot: 0 },
    { type: 'shed', x: 196, z: -180, rot: 3 },
    { type: 'helipad', x: 220, z: -172, rot: 0 },
  ],

  // farm fields (rows of crops). rot is in degrees
  fields: [
    { x: -90, z: 176, w: 30, d: 40, rot: 0 },
    { x: -150, z: 214, w: 44, d: 18, rot: 0 },
  ],

  // crashed and abandoned cars. rot is in degrees
  cars: [
    { x: -60, z: 16, rot: 60, color: 0x8a2a20 },   // your car... you crashed it
    { x: -150, z: 0, rot: 100, color: 0x2a4a7a },
    { x: -250, z: -14, rot: 80, color: 0x5a5a5a },
    { x: 6, z: 20, rot: 95, color: 0xc8c8c0 },
    { x: 35, z: 28, rot: 272, color: 0x2a5a30 },
    { x: 66, z: 20, rot: 85, color: 0x1a1a1a },
    { x: 95, z: 27, rot: 260, color: 0x7a6a20 },
    { x: 118, z: 14, rot: 0, color: 0xa03a18 },
    { x: 180, z: 34, rot: 200, color: 0x3a3a6a },
    { x: 260, z: 50, rot: 70, color: 0x6a2a4a },
    { x: 172, z: -60, rot: 20, color: 0x4a6a6a },
    { x: -95, z: 100, rot: 150, color: 0x6a4a2a },
    { x: -104, z: -64, rot: 30, color: 0x2a3a4a },
    { x: -96, z: -70, rot: 200, color: 0x7a7a70 },
  ],

  // place names that pop up when you walk in, and show on the map
  places: [
    { name: 'MAPLE CREEK', x: 60, z: 24, r: 75 },
    { name: 'HOLLOW FARM', x: -130, z: 170, r: 60 },
    { name: 'BLACK LAKE', x: -120, z: -120, r: 75 },
    { name: 'RADIO HILL', x: 205, z: -180, r: 40 },
    { name: 'HUNTER\'S CABIN', x: 150, z: 205, r: 25 },
    { name: 'THE CRASH', x: -62, z: 14, r: 18 },
  ],
};
