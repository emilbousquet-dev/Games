// ============================================================
//  SIGMA HOVER GP — THEMES (how each world looks)
//  sky: [top, middle, horizon] colors. road / wall / ground:
//  which painted textures to use. scenery: what to put around.
// ============================================================
window.HG = window.HG || {};

HG.THEMES = {
  city: {
    sky: ['#1a1440', '#ff6a8a', '#ffb070'], fog: 0xd88a8a, fogNear: 200, fogFar: 1100, stars: 0.4,
    sunColor: 0xffc890, sun: 2.2, sunDir: [-0.6, 0.45, 0.4], hemiSky: 0xffb0c0, hemiGround: 0x403050, hemi: 0.9,
    road: 'neon', roadRough: 0.35, roadMetal: 0.3, roadGlow: 0.25, ground: 'neon', shoulder: 'metal', wall: 'neon', wallCap: 0x2af0ff, curb: ['#ff2fd0', '#ffffff'],
    slab: 0x2a2838, pillar: 0x3a3848, groundY: -14, edgeGlow: 0xff2fd0, scenery: 'city', tunnel: 0x2a2838,
  },
  volcano: {
    sky: ['#2a0a08', '#a8301a', '#ff7a30'], fog: 0x7a2a18, fogNear: 150, fogFar: 800,
    sunColor: 0xff9a60, sun: 1.8, sunDir: [0.3, 0.5, -0.5], hemiSky: 0xff8050, hemiGround: 0x401010, hemi: 0.8,
    road: 'stone', ground: 'lava', shoulder: 'rock', wall: 'rock', wallCap: 0x3a2a24, curb: ['#ff5a10', '#2a1a14'],
    slab: 0x3a2a24, pillar: 0x4a3830, groundY: -12, edgeGlow: 0xff6a10, scenery: 'volcano', tunnel: 0x3a2a24,
  },
  beach: {
    sky: ['#2a8ae0', '#8ad0ff', '#d8f4ff'], fog: 0xbfe6ff, fogNear: 250, fogFar: 1300,
    sunColor: 0xfff4d8, sun: 2.8, sunDir: [0.5, 1, 0.3], hemiSky: 0xbfe6ff, hemiGround: 0xc8b080, hemi: 0.9,
    road: 'asphalt', ground: 'water', shoulder: 'sand', wall: 'wood', wallCap: 0x6a4424, curb: ['#ff4040', '#ffffff'],
    slab: 0xd8c08a, pillar: 0x8a6a48, groundY: -3, edgeGlow: 0x3ad8ff, scenery: 'beach', waterColor: 0x30c0e0, tunnel: 0x8a6a48,
  },
  desert: {
    sky: ['#3a7ad8', '#f0c890', '#ffe0b0'], fog: 0xf0d0a0, fogNear: 220, fogFar: 1200,
    sunColor: 0xfff0c8, sun: 3.0, sunDir: [0.2, 1, -0.6], hemiSky: 0xffe0b0, hemiGround: 0xa06a3a, hemi: 0.85,
    road: 'sand', ground: 'sand', shoulder: 'sand', wall: 'rock', wallCap: 0x8a5a3a, curb: ['#d84a20', '#f0e0b8'],
    slab: 0xb07a48, pillar: 0x9a6a40, groundY: -1, edgeGlow: 0xffa040, scenery: 'desert', tunnel: 0x9a6a40,
  },
  ice: {
    sky: ['#0a1a3a', '#4a7ac0', '#b8e0ff'], fog: 0xc0e0ff, fogNear: 150, fogFar: 900, stars: 0.3,
    sunColor: 0xd8f0ff, sun: 2.2, sunDir: [-0.4, 0.8, 0.5], hemiSky: 0xd0f0ff, hemiGround: 0x6080a0, hemi: 1.0,
    road: 'ice', roadRough: 0.15, roadMetal: 0.2, ground: 'snow', shoulder: 'snow', wall: 'ice', wallCap: 0xe8faff, curb: ['#3a7ad0', '#ffffff'],
    slab: 0x9ac8e0, pillar: 0xa8d8f0, groundY: -2, edgeGlow: 0x7af0ff, scenery: 'ice', tunnel: 0x9ac8e0,
  },
  candy: {
    sky: ['#ff9ad8', '#ffd0f0', '#fff0fa'], fog: 0xffd8f0, fogNear: 220, fogFar: 1100,
    sunColor: 0xfff0f8, sun: 2.6, sunDir: [0.4, 1, 0.4], hemiSky: 0xffe0f8, hemiGround: 0xa0e0ff, hemi: 1.0,
    road: 'candy', ground: 'candy', shoulder: 'candy', wall: 'candy', wallCap: 0xffffff, curb: ['#ff3d8b', '#ffffff'],
    slab: 0xff9ac8, pillar: 0xffffff, groundY: -2, edgeGlow: 0xff5fd0, scenery: 'candy', tunnel: 0xff9ac8,
  },
  jungle: {
    sky: ['#3a9ad0', '#a8e0c0', '#d8f0d0'], fog: 0x9ad0a8, fogNear: 150, fogFar: 800,
    sunColor: 0xfff0c0, sun: 2.4, sunDir: [0.3, 1, 0.5], hemiSky: 0xd0ffd8, hemiGround: 0x2a4a20, hemi: 0.9,
    road: 'dirt', roadRough: 0.95, ground: 'jungle', shoulder: 'jungle', wall: 'hedge', wallCap: 0x2a5a24, curb: ['#e8c040', '#5a3a22'],
    slab: 0x5a4a38, pillar: 0x7a6a50, groundY: -1, edgeGlow: 0x80ff60, scenery: 'jungle', tunnel: 0x6a6a5a,
  },
  underwater: {
    sky: ['#001a3a', '#0a5a9a', '#1a8ac0'], fog: 0x0a6aa0, fogNear: 60, fogFar: 520,
    sunColor: 0xa0e8ff, sun: 2.0, sunDir: [0.1, 1, 0.2], hemiSky: 0x70d0ff, hemiGround: 0x204060, hemi: 1.0,
    road: 'metal', roadMetal: 0.4, roadRough: 0.4, ground: 'seabed', shoulder: 'seabed', wall: 'glass', wallCap: 0x80e0ff, curb: ['#ffcc00', '#1a3a5a'],
    slab: 0x3a5a7a, pillar: 0x4a6a8a, groundY: -6, edgeGlow: 0x40f0ff, scenery: 'underwater', tunnel: 0x3a5a7a,
  },
  hotel: {
    sky: ['#05030c', '#2a1440', '#4a2a5a'], fog: 0x2a1a3a, fogNear: 90, fogFar: 600, stars: 0.9,
    sunColor: 0x9a8aff, sun: 1.3, sunDir: [-0.3, 0.7, 0.6], hemiSky: 0x7a6aaa, hemiGround: 0x201030, hemi: 0.9, amb: 0.25,
    road: 'wood', ground: 'hotel', shoulder: 'hotel', wall: 'bone', wallCap: 0xe8e0cc, curb: ['#8a2aff', '#1a0a20'],
    slab: 0x2a1a30, pillar: 0x3a2440, groundY: -1, edgeGlow: 0xa040ff, scenery: 'hotel', tunnel: 0x2a1a30,
  },
  lab: {
    sky: ['#020406', '#0a1a14', '#12241c'], fog: 0x0a1a12, fogNear: 50, fogFar: 380,
    sunColor: 0x80ffb0, sun: 0.8, sunDir: [0.1, 1, 0.2], hemiSky: 0x40a070, hemiGround: 0x101810, hemi: 0.8, amb: 0.3,
    road: 'metal', ground: 'metal', shoulder: 'metal', wall: 'metal', wallCap: 0x30ff80, curb: ['#30ff80', '#101410'],
    slab: 0x2a302c, pillar: 0x3a403c, groundY: -1, edgeGlow: 0x30ff80, scenery: 'lab', tunnel: 0x2a302c,
  },
  space: {
    sky: ['#000008', '#0a0a2a', '#1a1040'], fog: 0x0a0820, fogNear: 400, fogFar: 1600, stars: 1,
    sunColor: 0xd0e0ff, sun: 2.4, sunDir: [0.6, 0.6, -0.4], hemiSky: 0x8090ff, hemiGround: 0x201030, hemi: 0.8,
    road: 'space', roadGlow: 0.3, roadMetal: 0.4, roadRough: 0.3, ground: 'void', shoulder: 'metal', wall: 'neon', wallCap: 0x3ad8ff, curb: ['#3ad8ff', '#101020'],
    slab: 0x2a2a40, pillar: 0x3a3a50, edgeGlow: 0x3ad8ff, scenery: 'space', noPillars: true, tunnel: 0x2a2a40,
  },
  sky: {
    sky: ['#3a8aff', '#a8d8ff', '#ffffff'], fog: 0xe8f4ff, fogNear: 250, fogFar: 1300,
    sunColor: 0xfffae8, sun: 2.8, sunDir: [0.4, 1, 0.2], hemiSky: 0xd8ecff, hemiGround: 0xffffff, hemi: 1.0,
    road: 'stone', ground: 'cloud', groundY: -40, shoulder: 'grass', wall: 'stone', wallCap: 0xf0e8d8, curb: ['#3a7aff', '#ffffff'],
    slab: 0xe8dcc8, pillar: 0xf0e8d8, edgeGlow: 0xffe060, scenery: 'sky', noPillars: true, tunnel: 0xe8dcc8,
  },
  stadium: {
    sky: ['#0a1030', '#3050a0', '#7090d0'], fog: 0x405080, fogNear: 300, fogFar: 1200, stars: 0.6,
    sunColor: 0xffffff, sun: 2.0, sunDir: [0.2, 1, 0.3], hemiSky: 0xd0e0ff, hemiGround: 0x30402a, hemi: 1.0,
    road: 'asphalt', ground: 'grass', shoulder: 'grass', wall: 'barrier', wallCap: 0xffffff, curb: ['#ff2a2a', '#ffffff'],
    slab: 0x50525a, pillar: 0x70727a, groundY: -1, edgeGlow: 0xffffff, scenery: 'stadium', tunnel: 0x50525a,
  },
  factory: {
    sky: ['#2a2420', '#6a5a48', '#a08a6a'], fog: 0x6a5a48, fogNear: 120, fogFar: 700,
    sunColor: 0xffd8a0, sun: 1.8, sunDir: [-0.3, 1, 0.4], hemiSky: 0xffd0a0, hemiGround: 0x302820, hemi: 0.9,
    road: 'metal', ground: 'metal', shoulder: 'metal', wall: 'metal', wallCap: 0xffcc00, curb: ['#ffcc00', '#222222'],
    slab: 0x4a4440, pillar: 0x5a544c, groundY: -8, edgeGlow: 0xffa020, scenery: 'factory', tunnel: 0x4a4440,
  },
  moon: {
    sky: ['#000000', '#05050a', '#101018'], fog: 0x101018, fogNear: 400, fogFar: 1600, stars: 1,
    sunColor: 0xffffff, sun: 3.0, sunDir: [0.7, 0.5, -0.2], hemiSky: 0x9090a0, hemiGround: 0x303038, hemi: 0.6,
    road: 'moon', ground: 'moon', shoulder: 'moon', wall: 'metal', wallCap: 0xffb020, curb: ['#ffb020', '#30303a'],
    slab: 0x6a6c72, pillar: 0x7a7c82, groundY: -1, edgeGlow: 0xffb020, scenery: 'moon', lowGravity: true, tunnel: 0x6a6c72,
  },
  rainbow: {
    sky: ['#000010', '#100a30', '#2a1050'], fog: 0x1a0a30, fogNear: 400, fogFar: 1600, stars: 1,
    sunColor: 0xffffff, sun: 1.6, sunDir: [0.3, 1, 0.3], hemiSky: 0xd0b0ff, hemiGround: 0x301050, hemi: 1.1, amb: 0.3,
    road: 'rainbow', roadGlow: 0.8, roadRough: 0.3, ground: 'void', shoulder: 'neon', wall: 'rainbow', wallCap: 0xffffff, curb: ['#ffffff', '#ff3bd0'],
    slab: 0x3a2a6a, pillar: 0x4a3a7a, edgeGlow: 0xffffff, scenery: 'rainbow', noPillars: true, tunnel: 0x3a2a6a,
  },
  grass: {
    sky: ['#3a8ae0', '#a0d0ff', '#e0f0ff'], fog: 0xcfe6ff, fogNear: 250, fogFar: 1300,
    sunColor: 0xfff4e0, sun: 2.8, sunDir: [0.5, 1, 0.35], hemiSky: 0xc0e0ff, hemiGround: 0x4a6a2a, hemi: 0.9,
    road: 'asphalt', ground: 'grass', shoulder: 'grass', wall: 'barrier', wallCap: 0xffffff, curb: ['#e82a2a', '#ffffff'],
    slab: 0x6a6c72, pillar: 0x8a8c92, groundY: -1, edgeGlow: 0x3ad8ff, scenery: 'grass', tunnel: 0x6a6c72,
  },
};
