/* ============================================================
   avatarEngine.js — Three.js 3D Humanoid & GLB Model Engine
   Loads high-res GLB 3D models (nobleman.glb, girl.glb, male.glb, female.glb)
   with PBR materials, ambient lighting, particles & orbit controls.
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const AVATAR_MODELS = [
  { id: 'nobleman', name: 'Nobleman Cyber Master', file: '/models/nobleman.glb', title: 'NODE 01 // NOBLEMAN' },
  { id: 'girl', name: 'Cyber Valkyrie', file: '/models/girl.glb', title: 'NODE 02 // VALKYRIE' },
  { id: 'man', name: 'Kaito Cyber Legend', file: '/models/male.glb', title: 'NODE 03 // KAITO' },
  { id: 'woman', name: 'Yuna Executive Control', file: '/models/female.glb', title: 'NODE 04 // YUNA' },
];

export const DEFAULT_PALETTES = {
  nobleman: { skin: '#d1a384', hair: '#e2b857', outfit: '#12131e' },
  girl: { skin: '#e0ac69', hair: '#ec4899', outfit: '#1e102a' },
  man: { skin: '#d1a384', hair: '#e2b857', outfit: '#12131e' },
  woman: { skin: '#e0ac69', hair: '#ec4899', outfit: '#1e102a' }
};

export const SKIN_PRESETS = ['#f5d0a9', '#d1a384', '#e0ac69', '#8d5524'];
export const HAIR_PRESETS = ['#1a1a1a', '#e2b857', '#8b4513', '#ec4899'];
export const OUTFIT_PRESETS = ['#12131e', '#1e102a', '#0d2026', '#d4ff00'];
export const HAIR_STYLE_PRESETS = ['spiky', 'long'];

function buildHumanoid(gender) {
  const root = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x7c3aed, roughness: 0.5 });
  const headGeo = new THREE.SphereGeometry(0.28, 32, 32);
  const head = new THREE.Mesh(headGeo, mat);
  head.position.y = 1.72;
  root.add(head);

  const torsoGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.75, 16);
  const torso = new THREE.Mesh(torsoGeo, mat);
  torso.position.y = 1.05;
  root.add(torso);

  return root;
}

function buildParticles(count = 60, radius = 2.5, colorHex = 0xd4ff00) {
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
    opacity: 0.65,
  });

  return new THREE.Points(geo, mat);
}

export class AvatarEngine {
  constructor(container, modelId = 'nobleman', pal = {}, useGlb = true) {
    this.container = container;
    this.modelId = modelId;
    this.pal = pal;
    this.useGlb = useGlb;

    this.scene = new THREE.Scene();
    this.startTime = performance.now();

    const w = Math.max(container?.clientWidth || 340, 100);
    const h = Math.max(container?.clientHeight || 380, 100);

    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0.5, 3.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    if (container) {
      container.innerHTML = '';
      container.appendChild(this.renderer.domElement);
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1;
    this.controls.target.set(0, 0.4, 0);

    const amb = new THREE.AmbientLight(0xffffff, 1.3);
    this.scene.add(amb);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight.position.set(2, 4, 3);
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xd4ff00, 2.0);
    rimLight.position.set(-2, 2, -2);
    this.scene.add(rimLight);

    this.particles = buildParticles(80, 2.5, 0xd4ff00);
    this.scene.add(this.particles);

    this.loadAvatar(modelId);

    if (container) {
      this._resizeObs = new ResizeObserver(() => this._onResize());
      this._resizeObs.observe(container);
    }

    this._animate();
  }

  init() {
    return this;
  }

  loadAvatar(modelId = 'nobleman', palette = {}) {
    this.modelId = modelId;
    this.pal = palette;
    if (this.avatar) this.scene.remove(this.avatar);

    const modelObj = AVATAR_MODELS.find(m => m.id === modelId) || AVATAR_MODELS[0];

    if (this.useGlb) {
      this._loadGlbModel(modelObj.file);
    } else {
      this.avatar = buildHumanoid(modelId);
      this.scene.add(this.avatar);
    }
  }

  setSkinColor() {}
  setHairColor() {}
  setOutfitColor() {}
  setShoeColor() {}
  setSpotlightColor(hex) {
    if (this.particles?.material) this.particles.material.color.set(hex);
  }

  resetCamera() {
    this.camera.position.set(0, 0.5, 3.8);
    this.controls.target.set(0, 0.4, 0);
    this.controls.update();
  }

  dispose() {
    this.destroy();
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this._resizeObs) this._resizeObs.disconnect();
    if (this.controls) this.controls.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
  }

  _loadGlbModel(fileUrl) {
    const loader = new GLTFLoader();

    loader.load(
      fileUrl,
      (gltf) => {
        if (this.avatar) this.scene.remove(this.avatar);
        this.avatar = gltf.scene;

        const box = new THREE.Box3().setFromObject(this.avatar);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.2 / Math.max(maxDim, 0.001);
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
        this.avatar = buildHumanoid(this.modelId);
        this.scene.add(this.avatar);
      }
    );
  }

  _onResize() {
    if (!this.container) return;
    const w = Math.max(this.container.clientWidth || 340, 100);
    const h = Math.max(this.container.clientHeight || 380, 100);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    this.animId = requestAnimationFrame(() => this._animate());
    const t = (performance.now() - this.startTime) * 0.001;

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
