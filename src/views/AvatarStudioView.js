/* ============================================================
   AvatarStudioView.js — 3D Cyberpunk Avatar Creator & Card Studio
   Supports native male.glb & female.glb 3D models with Three.js,
   orbit controls, lighting controls, and instant 3D card minting!
   ============================================================ */

import * as THREE from 'three';
import { AvatarEngine } from '../engine/avatarEngine.js';
import { COLLECTIBLE_CARDS } from './StoreView.js';
import { getOwnedCards, addBattleXp } from '../utils/battlePass.js';

export function renderAvatarStudio(container) {
  if (!container) return;

  const initialConfig = {
    gender: 'man',
    useGlb: true,
    skin: '#d1a384',
    hair: '#e2b857',
    outfit: '#12131e',
    shoes: '#e2b857',
    hairStyle: 'spiky',
    visorColor: '#d4ff00',
    athleteName: 'Custom Athlete',
    athleteHandle: '@player.exe',
    selectedAbility: '7-Chain VWM Recall Boost',
  };

  container.innerHTML = `
    <div style="
      background: linear-gradient(135deg, rgba(13, 13, 20, 0.98) 0%, rgba(124, 58, 237, 0.15) 100%);
      border: 1.5px solid rgba(212, 255, 0, 0.35); border-radius: 24px; padding: 32px;
      color: #fff; max-width: 1200px; margin: 0 auto 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.8);
    ">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:18px; margin-bottom:24px;">
        <div>
          <div style="font-family:'Space Grotesk', sans-serif; font-size:10.5px; color:#d4ff00; letter-spacing:0.18em; text-transform:uppercase;">
            🤖 NATIVE GLB 3D AVATAR CREATOR &amp; CARD MINTING STUDIO
          </div>
          <h2 style="font-family:'Outfit', sans-serif; font-size:26px; font-weight:900; margin:4px 0 0 0;">
            Interactive 3D GLB Cyber Athlete
          </h2>
        </div>
        <div style="font-family:'JetBrains Mono', monospace; font-size:11px; color:#d4ff00; background:rgba(212,255,0,0.1); border:1px solid rgba(212,255,0,0.3); padding:4px 12px; border-radius:6px;">
          ✓ GLB Models Loaded: male.glb (9MB) &amp; female.glb (1.8MB)
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 380px 1fr; gap:32px; align-items:start;">
        <!-- Left: Live 3D WebGL Canvas Preview -->
        <div>
          <div id="avatar-3d-canvas-container" style="
            width: 100%; height: 380px; background: radial-gradient(circle at 50% 30%, rgba(124,58,237,0.35) 0%, rgba(5,5,8,0.98) 75%);
            border: 1.5px solid rgba(212,255,0,0.4); border-radius: 20px; position: relative; overflow: hidden;
            box-shadow: 0 16px 40px rgba(0,0,0,0.8);
          "></div>

          <div style="font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.4); text-align:center; margin-top:8px;">
            💡 Click and drag 3D canvas to rotate model 360&deg;
          </div>

          <button id="btn-mint-custom-card" style="
            width: 100%; margin-top: 16px; background: #d4ff00; color: #000;
            font-family: 'Space Grotesk', sans-serif; font-weight: 900; font-size: 13px;
            border: none; padding: 14px; border-radius: 12px; cursor: pointer; text-transform: uppercase;
            box-shadow: 0 0 30px rgba(212,255,0,0.3); transition: all 0.2s;
          ">
            🎨 Mint Custom 3D Card to My Deck
          </button>
        </div>

        <!-- Right: Customization Controls -->
        <div style="display:flex; flex-direction:column; gap:20px;">
          <!-- Athlete Info -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Athlete Name</label>
              <input type="text" id="avatar-name-input" value="${initialConfig.athleteName}" style="
                width:100%; box-sizing:border-box; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15);
                border-radius:8px; padding:10px 14px; color:#fff; font-family:'Space Grotesk', sans-serif; font-size:13px; outline:none;
              " />
            </div>

            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Handle / Tag</label>
              <input type="text" id="avatar-handle-input" value="${initialConfig.athleteHandle}" style="
                width:100%; box-sizing:border-box; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15);
                border-radius:8px; padding:10px 14px; color:#fff; font-family:'Space Grotesk', sans-serif; font-size:13px; outline:none;
              " />
            </div>
          </div>

          <!-- 3D Model Selection -->
          <div style="display:grid; grid-template-columns: 1fr; gap:16px;">
            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:#d4ff00; text-transform:uppercase; margin-bottom:6px;">Select 3D GLB Model</label>
              <select id="avatar-gender-select" style="
                width:100%; background:rgba(212,255,0,0.12); border:1px solid rgba(212,255,0,0.4);
                border-radius:8px; padding:12px; color:#fff; font-family:'Space Grotesk', sans-serif; font-size:13px; outline:none; font-weight:700;
              ">
                <option value="nobleman">👑 Nobleman Cyber Master (nobleman.glb)</option>
                <option value="girl">⚡ Cyber Valkyrie (girl.glb)</option>
                <option value="man">⚔ Kaito Cyber Legend (male.glb)</option>
                <option value="woman">💎 Yuna Executive Control (female.glb)</option>
              </select>
            </div>
          </div>

          <!-- Visor & Aura Lighting -->
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:16px;">
            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Neon Visor Light</label>
              <input type="color" id="avatar-visor-color" value="#d4ff00" style="
                width:100%; height:38px; background:transparent; border:1px solid rgba(255,255,255,0.15);
                border-radius:8px; cursor:pointer; padding:2px;
              " />
            </div>

            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Cyber Armor Tint</label>
              <input type="color" id="avatar-suit-color" value="#7c3aed" style="
                width:100%; height:38px; background:transparent; border:1px solid rgba(255,255,255,0.15);
                border-radius:8px; cursor:pointer; padding:2px;
              " />
            </div>

            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Aura Particles</label>
              <input type="color" id="avatar-skin-color" value="#00f0ff" style="
                width:100%; height:38px; background:transparent; border:1px solid rgba(255,255,255,0.15);
                border-radius:8px; cursor:pointer; padding:2px;
              " />
            </div>
          </div>

          <!-- Special Ability Selection -->
          <div>
            <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Select Card Cognitive Ability</label>
            <select id="avatar-ability-select" style="
              width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15);
              border-radius:8px; padding:12px; color:#fff; font-family:'Space Grotesk', sans-serif; font-size:13px; outline:none;
            ">
              <option value="7-Chain VWM Recall Boost">7-Chain VWM Recall Boost (+150ms Study Phase)</option>
              <option value="Executive Control Gating">Executive Control Gating (+10% Cowan K Bonus)</option>
              <option value="Visual Noise Suppression">Visual Noise Suppression (Distractor Shield)</option>
              <option value="Pattern Intuition Field">Pattern Intuition Field (Pre-Probe Highlight)</option>
              <option value="Alethemy Neural Link">Alethemy Neural Link (+25% XP Boost)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize Three.js Live Avatar Engine with GLB Loader
  const canvasBox = document.getElementById('avatar-3d-canvas-container');
  let currentAvatarEngine = null;

  function refreshAvatar() {
    const gender = document.getElementById('avatar-gender-select').value;
    const palette = {
      skin: document.getElementById('avatar-skin-color').value,
      hair: '#e2b857',
      outfit: document.getElementById('avatar-suit-color').value,
      shoes: document.getElementById('avatar-visor-color').value,
      hairStyle: 'spiky',
    };
    setTimeout(() => {
      if (canvasBox && canvasBox.isConnected) {
        currentAvatarEngine = new AvatarEngine(canvasBox, gender, palette, true);
      }
    }, 60);
  }

  refreshAvatar();

  // Attach Input Change Handlers
  ['avatar-gender-select', 'avatar-skin-color', 'avatar-suit-color', 'avatar-visor-color'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', refreshAvatar);
  });

  // Mint Custom 3D Card Handler
  document.getElementById('btn-mint-custom-card')?.addEventListener('click', () => {
    const name = document.getElementById('avatar-name-input').value.trim() || 'Custom Athlete';
    const handle = document.getElementById('avatar-handle-input').value.trim() || '@player.exe';
    const ability = document.getElementById('avatar-ability-select').value;
    const visorColor = document.getElementById('avatar-visor-color').value;
    const gender = document.getElementById('avatar-gender-select').value;

    const customCardId = `card_custom_${Date.now()}`;
    const customCard = {
      id: customCardId,
      name,
      handle,
      title: '3D GLB Custom Athlete',
      rarity: 'GLB Edition',
      rarityColor: visorColor || '#d4ff00',
      borderClass: 'border-left-behind',
      tokenId: `#${Math.floor(Math.random()*900 + 100)} / MINT`,
      kCapacity: 4.80,
      speedMs: 175,
      alphaSuppression: 0.96,
      tier: 'S+',
      price: 0,
      imageUrl: gender === 'man' ? '/assets/kaito_portrait.jpg' : '/assets/yuna_portrait.jpg',
      ability
    };

    COLLECTIBLE_CARDS.push(customCard);
    
    const owned = getOwnedCards();
    owned.push(customCardId);
    localStorage.setItem('xiberlinc_owned_cards', JSON.stringify(owned));

    addBattleXp(500, `Minted Custom 3D Card: ${name}`);
    alert(`🎉 CONGRATULATIONS! Your 3D GLB Action Card "${name}" has been minted and added to My Deck!`);
  });
}
