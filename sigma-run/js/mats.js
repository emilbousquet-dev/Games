// ============================================================
//  SIGMA RUN — MATERIALS (what every surface is made of)
// ============================================================
window.SR = window.SR || {};

SR.Mats = (function () {
  const M = {};
  const facadeMats = [];   // windows glow more at night, so we keep a list

  function init() {
    const T = SR.Tex.T;
    const std = (o) => new THREE.MeshStandardMaterial(o);
    M.facades = {};
    for (const style in T.facades) {
      M.facades[style] = T.facades[style].map((f) => {
        const m = std({
          map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 0.4, roughnessMap: f.rough, roughness: 1,
          metalness: style === 'glass' ? 0.55 : style === 'modern' ? 0.3 : 0.05,
          envMapIntensity: style === 'glass' ? 1.4 : 0.7,
        });
        facadeMats.push(m);
        return m;
      });
    }
    M.facadeList = [];
    for (const style in M.facades) for (const m of M.facades[style]) M.facadeList.push(m);
    M.roofs = T.roofs.map((t) => std({ map: t, roughness: 0.92, bumpMap: T.roofBump, bumpScale: 0.8, envMapIntensity: 0.9 }));
    M.coping = std({ color: 0xa9a49c, roughness: 0.85, map: T.roofs[0], envMapIntensity: 0.4 });
    M.concrete = std({ color: 0x8f8b85, roughness: 0.9, map: T.roofs[1] });
    M.metal = std({ map: T.metal, metalness: 0.6, roughness: 0.45 });
    M.fan = std({ map: T.fan, metalness: 0.6, roughness: 0.5 });
    M.door = std({ map: T.door, roughness: 0.7, metalness: 0.2 });
    M.darkMetal = std({ color: 0x2b2f36, metalness: 0.75, roughness: 0.38 });
    M.steel = std({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.3 });
    M.yellow = std({ color: 0xf2b705, metalness: 0.4, roughness: 0.45 });
    M.red = std({ color: 0xb8231b, metalness: 0.3, roughness: 0.5 });
    M.hazard = std({ map: T.hazard, roughness: 0.6 });
    M.wood = std({ map: T.wood, roughness: 0.85 });
    M.pipe = std({ color: 0x6d7a6a, metalness: 0.5, roughness: 0.55 });
    M.white = std({ color: 0xe8e8e8, roughness: 0.6 });
    M.solar = std({ color: 0x1b2a55, metalness: 0.7, roughness: 0.15, envMapIntensity: 1.5 });
    M.plant = std({ color: 0x3d7a35, roughness: 0.9 });
    M.dirt = std({ color: 0x4a3a2a, roughness: 1 });
    M.road = std({ map: T.road, roughness: 0.92 });
    M.sidewalk = std({ color: 0x77736c, roughness: 0.95 });
    M.helipad = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, transparent: true, map: makeHelipad(), polygonOffset: true, polygonOffsetFactor: -2 });
    M.helipad.userData.noShadow = true;
    // glowing billboards (they light themselves)
    M.ads = T.ads.map((t) => new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.15, 1.15, 1.15) }));
    M.adsTall = T.adsTall.map((t) => new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.05, 1.05, 1.05) }));
    M.neon = {};
    for (const k in T.neon) {
      M.neon[k] = new THREE.MeshBasicMaterial({ map: T.neon[k], color: new THREE.Color(2, 2, 2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      M.neon[k].userData.noShadow = true;
    }
    M.glass = new THREE.MeshStandardMaterial({ map: T.glass, transparent: true, opacity: 0.55, metalness: 0.9, roughness: 0.05, envMapIntensity: 2, side: THREE.DoubleSide, depthWrite: false });
    M.glass.userData.noShadow = true;
    M.redLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.3, 0.2) });
    M.cyanGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 3, 4) });
    M.pinkGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.5, 2.5) });
    M.yellowGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 0.5) });
    M.whiteGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 4) });
    M.cable = std({ color: 0x1a1a1a, metalness: 0.6, roughness: 0.4 });
    M.padGlow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 3.5, 4), transparent: true, opacity: 0.9 });
    for (const k of ['redLight', 'cyanGlow', 'pinkGlow', 'yellowGlow', 'whiteGlow', 'padGlow']) M[k].userData.noShadow = true;
    return M;
  }

  function makeHelipad() {
    const c = SR.U.canvas(512, 512, (g) => {
      g.clearRect(0, 0, 512, 512);
      g.strokeStyle = '#f2c200'; g.lineWidth = 26; g.beginPath(); g.arc(256, 256, 220, 0, 7); g.stroke();
      g.fillStyle = '#f2f2f2'; g.font = '900 300px Arial Black, Impact'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('H', 256, 270);
    });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // night = windows light up
  function setNight(glow) { for (const m of M.facadeList) m.emissiveIntensity = glow; }

  return { init, M, setNight };
})();
