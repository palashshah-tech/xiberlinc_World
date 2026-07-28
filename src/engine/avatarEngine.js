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

  // ── Hair ──
  if (isMale) {
    // Short cropped hair
    const hairGeo = new THREE.SphereGeometry(0.295, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const hairMesh = new THREE.Mesh(hairGeo, hair);
    hairMesh.position.y = 1.74;
    hairMesh.name = 'hair';
    root.add(hairMesh);
  } else {
    // Longer hair
    const hairTopGeo = new THREE.SphereGeometry(0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const hairTop = new THREE.Mesh(hairTopGeo, hair);
    hairTop.position.y = 1.74;
    hairTop.name = 'hair';
    root.add(hairTop);
    // Hair drape down back
    const drapeGeo = new THREE.CylinderGeometry(0.22, 0.14, 0.55, 16);
    const drape = new THREE.Mesh(drapeGeo, hair);
    drape.position.set(0, 1.38, -0.12);
    root.add(drape);
  }

  // ── Eyes (small dark spheres) ──
  const eyeGeo = new THREE.SphereGeometry(0.035, 16, 16);
  const eyeMat = makeMat('#1a1a2e', { roughness: 0.2, metalness: 0.4 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.09, 1.74, 0.24);
  root.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.09;
  root.add(eyeR);

  // ── Smile (Curved Torus Geometry) ──
  const mouthGeo = new THREE.TorusGeometry(0.05, 0.015, 8, 24, Math.PI);
  const mouthMat = makeMat('#c0392b', { roughness: 0.5 });
  const smile = new THREE.Mesh(mouthGeo, mouthMat);
  // Positioned slightly below the eyes (y=1.74 -> y=1.65) and facing forward
  smile.position.set(0, 1.65, 0.25);
  // Rotate torus so it curves upwards like a smile
  smile.rotation.x = Math.PI / 2;
  smile.rotation.z = Math.PI;
  root.add(smile);

  // ── Neck ──
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.12, 16);
  const neck = new THREE.Mesh(neckGeo, skin);
  neck.position.y = 1.38;
  root.add(neck);

  // ── Torso ──
  const torsoW = isMale ? 0.38 : 0.33;
  const torsoWBot = isMale ? 0.3 : 0.26;
  const torsoH = isMale ? 0.65 : 0.55;
  const torsoGeo = new THREE.CylinderGeometry(torsoWBot, torsoW, torsoH, 16);
  const torso = new THREE.Mesh(torsoGeo, outfit);
  torso.position.y = 1.0;
  torso.name = 'torso';
  root.add(torso);

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

  // ── Shoulders & Arms ──
  const shoulderOff = isMale ? 0.42 : 0.36;
  const armRad = isMale ? 0.065 : 0.055;

  [-1, 1].forEach(side => {
    // Upper arm
    const upperGeo = new THREE.CylinderGeometry(armRad, armRad * 0.9, 0.38, 12);
    const upper = new THREE.Mesh(upperGeo, skin);
    upper.position.set(side * shoulderOff, 1.1, 0);
    upper.rotation.z = side * 0.12;
    root.add(upper);

    // Forearm
    const foreGeo = new THREE.CylinderGeometry(armRad * 0.85, armRad * 0.7, 0.35, 12);
    const fore = new THREE.Mesh(foreGeo, skin);
    fore.position.set(side * (shoulderOff + 0.02), 0.74, 0);
    root.add(fore);

    // Hand
    const handGeo = new THREE.SphereGeometry(armRad * 1.1, 12, 12);
    const hand = new THREE.Mesh(handGeo, skin);
    hand.position.set(side * (shoulderOff + 0.02), 0.55, 0);
    hand.scale.y = 1.2;
    root.add(hand);
  });

  // ── Hips / Waist ──
  const hipW = isMale ? 0.28 : 0.32;
  const hipGeo = new THREE.CylinderGeometry(hipW, hipW * 0.95, 0.2, 16);
  const hips = new THREE.Mesh(hipGeo, outfit);
  hips.position.y = 0.6;
  root.add(hips);

  // ── Legs ──
  const legRad = isMale ? 0.09 : 0.08;
  const legOff = isMale ? 0.14 : 0.15;

  [-1, 1].forEach(side => {
    // Upper leg
    const thighGeo = new THREE.CylinderGeometry(legRad, legRad * 0.85, 0.45, 12);
    const thigh = new THREE.Mesh(thighGeo, outfit);
    thigh.position.set(side * legOff, 0.28, 0);
    root.add(thigh);

    // Lower leg
    const shinGeo = new THREE.CylinderGeometry(legRad * 0.8, legRad * 0.65, 0.45, 12);
    const shin = new THREE.Mesh(shinGeo, skin);
    shin.position.set(side * legOff, -0.15, 0);
    root.add(shin);

    // Shoe
    const shoeGeo = new THREE.BoxGeometry(legRad * 2.2, 0.08, legRad * 3);
    const shoeMesh = new THREE.Mesh(shoeGeo, shoe);
    shoeMesh.position.set(side * legOff, -0.4, 0.03);
    shoeMesh.name = 'shoe';
    root.add(shoeMesh);
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
  man: { skin: '#c89b7b', hair: '#2c1810', outfit: '#1e1e2e', shoes: '#1a1a1a' },
  woman: { skin: '#d4a574', hair: '#4a2520', outfit: '#2d1b4e', shoes: '#1a1a1a' }
};

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
    this.rings = [];
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
    this.rings.forEach(r => this.scene.remove(r));
    this.rings = [];
    if (this.particles) { this.scene.remove(this.particles); this.particles = null; }

    const pal = palette || DEFAULT_PALETTES[gender];

    // Build humanoid
    this.avatar = buildHumanoid(gender, pal);
    this.scene.add(this.avatar);

    // Orbital rings
    const accentColor = gender === 'man' ? 0x7c3aed : 0xec4899;
    const ring1 = buildOrbitalRing(1.3, accentColor, true);
    ring1.rotation.x = Math.PI / 2 + 0.3;
    this.scene.add(ring1);
    this.rings.push(ring1);

    const ring2 = buildOrbitalRing(1.6, 0x06b6d4, false);
    ring2.rotation.x = Math.PI / 2 - 0.15;
    ring2.rotation.z = 0.4;
    this.scene.add(ring2);
    this.rings.push(ring2);

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
    // Update ring colors
    this.rings.forEach(r => { if (r.material) r.material.color.set(hex); });
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

    // Gently rotate rings
    this.rings.forEach((r, i) => {
      r.rotation.y = t * (0.15 + i * 0.08);
    });

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
