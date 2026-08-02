/* ============================================================
   avatarEngine.js — Three.js 3D Humanoid & GLB Model Engine
   Loads native high-res male.glb & female.glb models with
   PBR materials, ambient lighting, particles & orbit controls
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const DEFAULT_PALETTES = {
  man: { skin: '#d1a384', hair: '#e2b857', outfit: '#12131e', shoes: '#e2b857', hairStyle: 'spiky' },
  woman: { skin: '#e0ac69', hair: '#ec4899', outfit: '#1e102a', shoes: '#ec4899', hairStyle: 'long' }
};

export const SKIN_PRESETS = ['#f5d0a9', '#d1a384', '#e0ac69', '#8d5524', '#3c2415', '#1a100a'];
export const HAIR_PRESETS = ['#1a1a1a', '#e2b857', '#8b4513', '#e74c3c', '#ec4899', '#7c3aed', '#00f0ff', '#ffffff'];
export const OUTFIT_PRESETS = ['#12131e', '#1e102a', '#0d2026', '#2b1518', '#d4ff00', '#7c3aed', '#00f0ff', '#e74c3c'];
export const HAIR_STYLE_PRESETS = ['buzz', 'spiky', 'long', 'bob'];

// ── Shared materials cache ──
function makeMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.roughness ?? 0.45,
    metalness: opts.metalness ?? 0.1,
    ...(opts.emissive ? { emissive: new THREE.Color(opts.emissive), emissiveIntensity: opts.emissiveIntensity ?? 0.15 } : {})
  });
}

// ── Build procedural fallback humanoid body ──
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

  // Hair Cap & Bangs
  const hairBaseGeo = new THREE.SphereGeometry(0.29, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.38);
  const hairBase = new THREE.Mesh(hairBaseGeo, hair);
  hairBase.position.set(0, 1.76, -0.04);
  root.add(hairBase);

  // ── Torso ──
  const torsoGeo = new THREE.CylinderGeometry(isMale ? 0.32 : 0.26, isMale ? 0.26 : 0.22, 0.75, 16);
  const torso = new THREE.Mesh(torsoGeo, outfit);
  torso.position.y = 1.05;
  root.add(torso);

  // ── Legs & Shoes ──
  [-0.14, 0.14].forEach(x => {
    const legGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.7, 16);
    const leg = new THREE.Mesh(legGeo, outfit);
    leg.position.set(x, 0.4, 0);
    root.add(leg);

    const shoeGeo = new THREE.BoxGeometry(0.12, 0.1, 0.24);
    const shoeMesh = new THREE.Mesh(shoeGeo, shoe);
    shoeMesh.position.set(x, 0.05, 0.04);
    root.add(shoeMesh);
  });

  return root;
}

// ── Floating particles ──
function buildParticles(count = 60, radius = 2.0, colorHex = 0xd4ff00) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * radius * 2;
    pos[i * 3 + 1] = (Math.random() - 0.5) * radius * 2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: colorHex,
    size: 0.04,
    transparent: true,
    opacity: 0.6,
  });

  return new THREE.Points(geo, mat);
}

// ── Main Avatar Engine Class ──
export class AvatarEngine {
  constructor(container, gender = 'man', pal = {}, useGlb = true) {
    this.container = container;
    this.gender = gender;
    this.pal = pal;
    this.useGlb = useGlb;

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    // Camera
    const w = container.clientWidth || 300;
    const h = container.clientHeight || 360;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0.5, 3.8);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    this.controls.target.set(0, 0.4, 0);

    // Lighting
    const amb = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(amb);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(2, 4, 3);
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(gender === 'man' ? 0x7c3aed : 0xd4ff00, 2.0);
    rimLight.position.set(-2, 2, -2);
    this.scene.add(rimLight);

    // Particles
    this.particles = buildParticles(80, 2.5, gender === 'man' ? 0x7c3aed : 0xd4ff00);
    this.scene.add(this.particles);

    // Load Model (GLB or Fallback Mesh)
    if (this.useGlb) {
      this._loadGlbModel(gender);
    } else {
      this.avatar = buildHumanoid(gender, pal);
      this.scene.add(this.avatar);
    }

    // Resize observer
    this._resizeObs = new ResizeObserver(() => this._onResize());
    this._resizeObs.observe(container);

    // Loop
    this._animate();
  }

  _loadGlbModel(gender) {
    const loader = new GLTFLoader();
    const url = gender === 'man' ? '/models/male.glb' : '/models/female.glb';

    loader.load(
      url,
      (gltf) => {
        if (this.avatar) this.scene.remove(this.avatar);
        this.avatar = gltf.scene;

        // Auto center and scale model
        const box = new THREE.Box3().setFromObject(this.avatar);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.2 / maxDim;
        this.avatar.scale.set(scale, scale, scale);

        const center = box.getCenter(new THREE.Vector3());
        this.avatar.position.sub(center.multiplyScalar(scale));
        this.avatar.position.y = -0.55;

        this.avatar.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.scene.add(this.avatar);
      },
      undefined,
      (err) => {
        console.warn('GLB load fallback to procedural mesh', err);
        this.avatar = buildHumanoid(gender, this.pal);
        this.scene.add(this.avatar);
      }
    );
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this._resizeObs) this._resizeObs.disconnect();
    if (this.controls) this.controls.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

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

    if (this.particles) {
      this.particles.rotation.y = t * 0.04;
      this.particles.position.y = Math.sin(t * 0.3) * 0.04;
    }

    if (this.avatar) {
      this.avatar.rotation.y = Math.sin(t * 0.4) * 0.05;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
