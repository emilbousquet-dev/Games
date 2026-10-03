// ============================================================
//  SIGMA HOVER GP — THE TRACKS  (EDIT ME!)
//
//  Every track is a list of pieces, driven one after another:
//    'straight 80'        drive straight for 80 meters
//    'right 90 50'        turn right 90 degrees, the curve is 50 m wide (radius)
//    'left 45 30'         turn left 45 degrees, tight curve
//    'jump 30'            a ramp, then fly over a 30 m hole!
//    'glide 80'           a big blue ramp: open your wings and glide 80 m
//    'loop'               a loop-the-loop!   'twist 100'  the road rolls all the way around
//    'width 30'           make the road wider from now on
//
//  Put extra words after a piece:
//    up 10 / down 10      go up or down 10 meters
//    bank 15              tilt the road in the curve
//    boost                a boost pad      boost-left / boost-right
//    items                a row of item boxes
//    coins                a line of coins  coins-left / coins-right
//    ramp                 a little trick ramp at the end
//    fall                 no walls: don't fall off!
//    cut                  a big grass corner you can cut with a turbo
//    off 10               10 m of offroad on each side
//    tunnel  water  ice  dirt  anti (anti-gravity glow)
//    hazard:roller  hazard:crusher  hazard:sweeper  hazard:geyser  hazard:car  hazard:ghost
//
//  The turns must add up to one full circle (360 degrees) so the
//  track comes back to the start. If the end doesn't quite meet the
//  start, the game bends the track a little bit to make it fit.
// ============================================================
window.HG = window.HG || {};

HG.TRACKS = [
  // ===================== SIGMA CUP =====================
  {
    id: 'neon', name: 'NEON SIGMA CITY', cup: 0, theme: 'city', laps: 3, width: 24, music: 'city',
    course: [
      'straight 110 items2',
      'right 90 45 bank 8',
      'straight 70 boost coins',
      'right 60 60',
      'left 60 60 coins-right',
      'straight 40',
      'jump 26',
      'straight 60 items',
      'right 120 40 bank 12 cut',
      'straight 60 up 14',
      'left 45 70',
      'right 105 50 bank 10',
      'straight 100 down 14 boost coins',
      'right 90 45 tunnel',
      'straight 40',
    ],
  },
];
