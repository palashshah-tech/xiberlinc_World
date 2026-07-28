/* ============================================================
   avatarEngine.js — Three.js 3D Humanoid Avatar Builder
   Builds actual male & female 3D humanoid figures with
   customizable skin, hair, outfit colors, and orbit controls.
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Shared materials cache ──
function makeMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.45,
    metalness: opts.metalness ?? 0.1,
    ...(opts.emissive ? { emissive: new THREE.Color(opts.emissive), emissiveIntensity: opts.emissiveIntensity ?? 0.15 } : {})
  });
}

// ── Build humanoid body ──
function buildHumanoid(gender, palette) {
  const root = new THREE.Group();
  const skin = makeMat(palette.skin);
  const outfit = makeMat(palette.outfit, { roughness: 0.55 });
  const hair = makeMat(palette.hair, { roughness: 0.7 });
  const shoe = makeMat(palette.shoes, { roughness: 0.6, metalness: 0.2 });
  const isMale = gender === 'man';

  // ── Head ──
  const headGeo = new THREE.SphereGeometry(0.28, 32, 32);
  const head = new THREE.Mesh(headGeo, skin);
  head.position.y = 1.72;
  head.name = 'head';
  root.add(head);

  // ── Hair Styles ──
  const selectedStyle = palette.hairStyle || (isMale ? 'buzz' : 'long');

  // 1. Skull Base Cap: covers the back and top crown of the head skull, leaving the forehead bare
  const hairBaseGeo = new THREE.SphereGeometry(0.29, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.38);
  const hairBase = new THREE.Mesh(hairBaseGeo, hair);
  hairBase.position.set(0, 1.76, -0.04);
  hairBase.name = 'hair';
  root.add(hairBase);

  // 2. V-Parted Front Swept Bangs (gives a natural hairline instead of a straight bowl-cut line)
  const sweepL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.05), hair);
  sweepL.position.set(-0.07, 1.87, 0.23);
  sweepL.rotation.set(0.1, 0.1, -0.22);
  root.add(sweepL);

  const sweepR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.05), hair);
  sweepR.position.set(0.07, 1.87, 0.23);
  sweepR.rotation.set(0.1, -0.1, 0.22);
  root.add(sweepR);

  // 3. Sideburn Locks
  const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.06), hair);
  sideL.position.set(-0.25, 1.72, 0.12);
  sideL.rotation.y = 0.2;
  root.add(sideL);

  const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.06), hair);
  sideR.position.set(0.25, 1.72, 0.12);
  sideR.rotation.y = -0.2;
  root.add(sideR);

  // 4. Style-Specific Geometry Additions
  if (selectedStyle === 'spiky') {
    // Spiky Mohawk Lock cones running along the middle of the head
    const spikeGeo = new THREE.ConeGeometry(0.045, 0.14, 4);
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(spikeGeo, hair);
      const zOffset = -0.14 + i * 0.06;
      spike.position.set(0, 2.03 - Math.abs(zOffset) * 0.15, zOffset - 0.02);
      spike.rotation.x = zOffset * -0.9;
      root.add(spike);
    }
    // Anime side spikes
    const sideSpikeGeo = new THREE.ConeGeometry(0.03, 0.1, 4);
    [-1, 1].forEach(side => {
      const sideSpike = new THREE.Mesh(sideSpikeGeo, hair);
      sideSpike.position.set(side * 0.23, 1.88, 0.05);
      sideSpike.rotation.z = side * -0.7;
      root.add(sideSpike);
    });
  } else if (selectedStyle === 'long') {
    // Ponytail at the back of the head
    const ponyGeo = new THREE.CylinderGeometry(0.045, 0.02, 0.45, 12);
    const pony = new THREE.Mesh(ponyGeo, hair);
    pony.position.set(0, 1.46, -0.24);
    pony.rotation.x = -0.35; // tilt back slightly
    root.add(pony);

    // Ponytail tie band (red tie)
    const tieGeo = new THREE.TorusGeometry(0.048, 0.015, 6, 12);
    const tieMat = makeMat('#e74c3c');
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(0, 1.66, -0.2);
    tie.rotation.x = Math.PI / 2;
    root.add(tie);

    // Shoulder-draping front locks
    const lockGeo = new THREE.CylinderGeometry(0.035, 0.015, 0.4, 8);
    [-1, 1].forEach(side => {
      const lock = new THREE.Mesh(lockGeo, hair);
      lock.position.set(side * 0.24, 1.46, 0.1);
      lock.rotation.z = side * 0.1;
      root.add(lock);
    });
  }

  // ── Eyes (small dark spheres on head surface) ──
  const eyeGeo = new THREE.SphereGeometry(0.035, 16, 16);
  const eyeMat = makeMat('#1a1a2e', { roughness: 0.2, metalness: 0.4 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.09, 1.74, 0.27);
  root.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.09;
  root.add(eyeR);

  // ── Smile (Curved Torus Geometry facing front) ──
  const mouthGeo = new THREE.TorusGeometry(0.05, 0.012, 8, 24, Math.PI);
  const mouthMat = makeMat('#c0392b', { roughness: 0.5 });
  const smile = new THREE.Mesh(mouthGeo, mouthMat);
  smile.position.set(0, 1.63, 0.262);
  smile.rotation.set(0, 0, Math.PI);
  root.add(smile);

  // ── Neck ──
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 16);
  const neck = new THREE.Mesh(neckGeo, skin);
  neck.position.y = 1.38;
  root.add(neck);

  // ── Torso (Shirt Body) ──
  const torsoW = isMale ? 0.38 : 0.33;
  const torsoWBot = isMale ? 0.3 : 0.26;
  const torsoH = isMale ? 0.65 : 0.55;
  const torsoGeo = new THREE.CylinderGeometry(torsoWBot, torsoW, torsoH, 16);
  const torso = new THREE.Mesh(torsoGeo, outfit);
  torso.position.y = 1.0;
  torso.name = 'torso';
  root.add(torso);

  // ── Xiberlinc Logo on T-Shirt (placed on chest surface) ──
  const textureLoader = new THREE.TextureLoader();
  const logoTexture = textureLoader.load('/xiberlinc_logo.png');
  const logoGeo = new THREE.PlaneGeometry(0.18, 0.18);
  const logoMat = new THREE.MeshBasicMaterial({
    map: logoTexture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const logoMesh = new THREE.Mesh(logoGeo, logoMat);
  logoMesh.position.set(0, 1.15, isMale ? 0.37 : 0.32);
  root.add(logoMesh);

  if (!isMale) {
    // Slight bust geometry for female
    const bustGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const bustL = new THREE.Mesh(bustGeo, outfit);
    bustL.position.set(-0.1, 1.12, 0.2);
    bustL.scale.set(1, 0.85, 0.7);
    root.add(bustL);
    const bustR = bustL.clone();
    bustR.position.x = 0.1;
    root.add(bustR);
  }

  // ── Shoulders & Arms (Shirt Sleeves + Bare Arms) ──
  const shoulderOff = isMale ? 0.42 : 0.36;
  const armRad = isMale ? 0.065 : 0.055;

  [-1, 1].forEach(side => {
    // 1. T-Shirt Sleeve (outfit color)
    const sleeveGeo = new THREE.CylinderGeometry(armRad * 1.15, armRad * 1.05, 0.18, 12);
    const sleeve = new THREE.Mesh(sleeveGeo, outfit);
    sleeve.position.set(side * shoulderOff, 1.15, 0);
    sleeve.rotation.z = side * 0.12;
    root.add(sleeve);

    // 2. Bare Upper Arm (skin color)
    const upperGeo = new THREE.CylinderGeometry(armRad, armRad * 0.9, 0.24, 12);
    const upper = new THREE.Mesh(upperGeo, skin);
    upper.position.set(side * (shoulderOff + 0.01), 0.96, 0);
    upper.rotation.z = side * 0.12;
    root.add(upper);

    // 3. Forearm (skin color)
    const foreGeo = new THREE.CylinderGeometry(armRad * 0.85, armRad * 0.7, 0.35, 12);
    const fore = new THREE.Mesh(foreGeo, skin);
    fore.position.set(side * (shoulderOff + 0.02), 0.72, 0);
    root.add(fore);

    // 4. Hand (skin color)
    const handGeo = new THREE.SphereGeometry(armRad * 1.1, 12, 12);
    const hand = new THREE.Mesh(handGeo, skin);
    hand.position.set(side * (shoulderOff + 0.02), 0.53, 0);
    hand.scale.y = 1.2;
    root.add(hand);
  });

  // ── Hips / Waist (Pants Top) ──
  const hipW = isMale ? 0.28 : 0.32;
  const hipGeo = new THREE.CylinderGeometry(hipW, hipW * 0.95, 0.2, 16);
  const hips = new THREE.Mesh(hipGeo, outfit);
  hips.position.y = 0.6;
  root.add(hips);

  // Belt buckle decoration (silver metal)
  const buckleGeo = new THREE.BoxGeometry(0.08, 0.04, 0.03);
  const buckleMat = makeMat('#bdc3c7', { roughness: 0.15, metalness: 0.85 });
  const buckle = new THREE.Mesh(buckleGeo, buckleMat);
  buckle.position.set(0, 0.62, hipW * 0.98);
  root.add(buckle);

  // ── Legs (Pants / Trousers) ──
  const legRad = isMale ? 0.09 : 0.08;
  const legOff = isMale ? 0.14 : 0.15;

  [-1, 1].forEach(side => {
    // 1. Thigh (Pants)
    const thighGeo = new THREE.CylinderGeometry(legRad, legRad * 0.85, 0.45, 12);
    const thigh = new THREE.Mesh(thighGeo, outfit);
    thigh.position.set(side * legOff, 0.28, 0);
    root.add(thigh);

    // 2. Shin (Pants / Socks)
    const shinGeo = new THREE.CylinderGeometry(legRad * 0.8, legRad * 0.65, 0.45, 12);
    const shin = new THREE.Mesh(shinGeo, outfit); // Trousers run all the way down
    shin.position.set(side * legOff, -0.15, 0);
    root.add(shin);

    // 3. Sneakers (shoe base + white sole + toe cap)
    const shoeBaseGeo = new THREE.BoxGeometry(legRad * 2.2, 0.08, legRad * 3);
    const shoeBaseMesh = new THREE.Mesh(shoeBaseGeo, shoe);
    shoeBaseMesh.position.set(side * legOff, -0.4, 0.03);
    shoeBaseMesh.name = 'shoe';
    root.add(shoeBaseMesh);

    // White sole
    const soleGeo = new THREE.BoxGeometry(legRad * 2.3, 0.03, legRad * 3.1);
    const whiteMat = makeMat('#ffffff', { roughness: 0.9 });
    const sole = new THREE.Mesh(soleGeo, whiteMat);
    sole.position.set(side * legOff, -0.45, 0.03);
    root.add(sole);

    // White toe cap
    const capGeo = new THREE.SphereGeometry(legRad * 1.1, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const toeCap = new THREE.Mesh(capGeo, whiteMat);
    toeCap.position.set(side * legOff, -0.38, 0.13);
    toeCap.scale.set(1.05, 0.4, 1.25);
    root.add(toeCap);
  });

  // Center the model at origin
  root.position.y = -0.65;

  // Store references for color updates
  root.userData = { skinMat: skin, outfitMat: outfit, hairMat: hair, shoeMat: shoe, gender };

  return root;
}

// ── Build floating orbital ring ──
function buildOrbitalRing(radius, color, dashed) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
  const pts = curve.getPoints(128);
  const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p.x, 0, p.y)));
  let mat;
  if (dashed) {
    mat = new THREE.LineDashedMaterial({ color, dashSize: 0.15, gapSize: 0.08, opacity: 0.5, transparent: true });
  } else {
    mat = new THREE.LineBasicMaterial({ color, opacity: 0.35, transparent: true });
  }
  const ring = new THREE.Line(geo, mat);
  if (dashed) ring.computeLineDistances();
  return ring;
}

// ── Floating particles ──
function buildParticles(count, radius, color) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.6 + Math.random() * 0.4);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color, size: 0.03, transparent: true, opacity: 0.6, sizeAttenuation: true });
  return new THREE.Points(geo, mat);
}

// ── Ground disc / shadow ──
function buildGroundDisc() {
  const geo = new THREE.CircleGeometry(1.2, 64);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.05,
    transparent: true,
    opacity: 0.7
  });
  const disc = new THREE.Mesh(geo, mat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -1.06;
  disc.receiveShadow = true;
  return disc;
}

// ── Default palettes ──
export const DEFAULT_PALETTES = {
  man: { skin: '#c89b7b', hair: '#2c1810', outfit: '#1e1e2e', shoes: '#1a1a1a', hairStyle: 'buzz' },
  woman: { skin: '#d4a574', hair: '#4a2520', outfit: '#2d1b4e', shoes: '#1a1a1a', hairStyle: 'long' }
};

export const HAIR_STYLE_PRESETS = [
  { id: 'buzz', name: 'Buzzcut' },
  { id: 'spiky', name: 'Spiky Mohawk' },
  { id: 'long', name: 'Ponytail' }
];


export const SKIN_PRESETS = [
  { name: 'Light', color: '#f5d0b0' },
  { name: 'Medium', color: '#c89b7b' },
  { name: 'Tan', color: '#a67c52' },
  { name: 'Brown', color: '#7b5638' },
  { name: 'Dark', color: '#4a3020' },
];

export const HAIR_PRESETS = [
  { name: 'Black', color: '#1a1008' },
  { name: 'Brown', color: '#4a2520' },
  { name: 'Blonde', color: '#c4a35a' },
  { name: 'Red', color: '#8b2500' },
  { name: 'White', color: '#d0d0d0' },
  { name: 'Purple', color: '#6b21a8' },
  { name: 'Cyan', color: '#06b6d4' },
];

export const OUTFIT_PRESETS = [
  { name: 'Midnight', color: '#1e1e2e' },
  { name: 'Royal Purple', color: '#2d1b4e' },
  { name: 'Crimson', color: '#7f1d1d' },
  { name: 'Ocean', color: '#0c4a6e' },
  { name: 'Forest', color: '#14532d' },
  { name: 'Ivory', color: '#f5f0e8' },
  { name: 'Neon Pink', color: '#ec4899' },
];

// ══════════════════════════════════════════════
//  AvatarEngine — Main class
// ══════════════════════════════════════════════
export class AvatarEngine {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.avatar = null;
    this.particles = null;
    this.animId = null;
    this.clock = new THREE.Clock();
  }

  init() {
    const w = this.container.clientWidth || 600;
    const h = this.container.clientHeight || 600;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = null; // transparent — stage background is CSS

    // Camera
    this.camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    this.camera.position.set(0, 0.5, 5.2);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(2, 4, 3);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(keyLight);
    this.keyLight = keyLight;

    const fillLight = new THREE.DirectionalLight(0x7c3aed, 0.4);
    fillLight.position.set(-2, 2, -1);
    this.scene.add(fillLight);
    this.fillLight = fillLight;

    const rimLight = new THREE.PointLight(0x06b6d4, 0.6, 10);
    rimLight.position.set(0, 3, -2);
    this.scene.add(rimLight);
    this.rimLight = rimLight;

    // Ground
    this.groundDisc = buildGroundDisc();
    this.scene.add(this.groundDisc);

    // Orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 7;
    this.controls.target.set(0, 0.4, 0);
    this.controls.maxPolarAngle = Math.PI * 0.85;

    // Resize observer
    this._resizeObs = new ResizeObserver(() => this._onResize());
    this._resizeObs.observe(this.container);

    // Start render loop
    this._animate();
  }

  loadAvatar(gender, palette) {
    // Remove old avatar & decorations
    if (this.avatar) {
      this.scene.remove(this.avatar);
      this.avatar.traverse(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
    }
    if (this.particles) { this.scene.remove(this.particles); this.particles = null; }

    const pal = palette || DEFAULT_PALETTES[gender];

    // Build humanoid
    this.avatar = buildHumanoid(gender, pal);
    this.scene.add(this.avatar);

    const accentColor = gender === 'man' ? 0x7c3aed : 0xec4899;

    // Particles
    this.particles = buildParticles(60, 2.0, accentColor);
    this.scene.add(this.particles);
  }

  // ── Color update methods ──
  setSkinColor(hex) {
    if (this.avatar?.userData.skinMat) this.avatar.userData.skinMat.color.set(hex);
  }
  setHairColor(hex) {
    if (this.avatar?.userData.hairMat) this.avatar.userData.hairMat.color.set(hex);
  }
  setOutfitColor(hex) {
    if (this.avatar?.userData.outfitMat) this.avatar.userData.outfitMat.color.set(hex);
  }
  setShoeColor(hex) {
    if (this.avatar?.userData.shoeMat) this.avatar.userData.shoeMat.color.set(hex);
  }

  // ── Spotlight beam color ──
  setSpotlightColor(hex) {
    if (this.fillLight) this.fillLight.color.set(hex);
    if (this.rimLight) this.rimLight.color.set(hex);
    // Update particle colors
    if (this.particles?.material) this.particles.material.color.set(hex);
  }

  // ── Reset camera ──
  resetCamera() {
    this.camera.position.set(0, 0.5, 5.2);
    this.controls.target.set(0, 0.4, 0);
    this.controls.update();
  }

  // ── Dispose everything ──
  dispose() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this._resizeObs) this._resizeObs.disconnect();
    if (this.controls) this.controls.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    if (this.scene) {
      this.scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    }
  }

  // ── Private ──
  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());
    const t = this.clock.getElapsedTime();

    // Float particles
    if (this.particles) {
      this.particles.rotation.y = t * 0.05;
      this.particles.position.y = Math.sin(t * 0.3) * 0.05;
    }

    // Subtle avatar idle sway
    if (this.avatar) {
      this.avatar.rotation.y = Math.sin(t * 0.4) * 0.03;
      this.avatar.position.y = -0.65 + Math.sin(t * 0.6) * 0.015;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
