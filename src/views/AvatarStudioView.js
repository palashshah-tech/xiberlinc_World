/* ============================================================
   AvatarStudioView.js — 3D Cyberpunk Avatar Creator & Card Studio
   Allows candidates to customize 3D humanoid avatars with Three.js,
   select cyber visors, outfit armor, and mint custom 3D cards!
   ============================================================ */

import * as THREE from 'three';
import { AvatarEngine } from '../engine/avatarEngine.js';
import { COLLECTIBLE_CARDS, renderCollectiblesStore } from './StoreView.js';
import { getOwnedCards, addBattleXp } from '../utils/battlePass.js';

export function renderAvatarStudio(container) {
  if (!container) return;

  const initialConfig = {
    gender: 'man',
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
            🎨 3D AVATAR CREATOR &amp; CARD MINTING STUDIO
          </div>
          <h2 style="font-family:'Outfit', sans-serif; font-size:26px; font-weight:900; margin:4px 0 0 0;">
            Customize Your 3D Cyber Athlete
          </h2>
        </div>
        <div style="font-family:'JetBrains Mono', monospace; font-size:11px; color:rgba(255,255,255,0.5);">
          Engine: Three.js WebGL &middot; GLB Compatible
        </div>
      </div>

      <div style="display:grid; grid-template-columns: 340px 1fr; gap:32px; align-items:start;">
        <!-- Left: Live 3D WebGL Canvas Preview -->
        <div>
          <div id="avatar-3d-canvas-container" style="
            width: 100%; height: 360px; background: radial-gradient(circle at 50% 30%, rgba(124,58,237,0.3) 0%, rgba(5,5,8,0.95) 75%);
            border: 1px solid rgba(212,255,0,0.3); border-radius: 18px; position: relative; overflow: hidden;
            box-shadow: 0 14px 36px rgba(0,0,0,0.6);
          "></div>

          <button id="btn-mint-custom-card" style="
            width: 100%; margin-top: 18px; background: #d4ff00; color: #000;
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

          <!-- Body & Hair Style -->
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:16px;">
            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Frame</label>
              <select id="avatar-gender-select" style="
                width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15);
                border-radius:8px; padding:10px; color:#fff; font-family:'Space Grotesk', sans-serif; font-size:12px; outline:none;
              ">
                <option value="man">Cyber Male</option>
                <option value="woman">Cyber Female</option>
              </select>
            </div>

            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Hair Style</label>
              <select id="avatar-hairstyle-select" style="
                width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15);
                border-radius:8px; padding:10px; color:#fff; font-family:'Space Grotesk', sans-serif; font-size:12px; outline:none;
              ">
                <option value="spiky">Spiky Volt</option>
                <option value="buzz">Cyber Buzz</option>
                <option value="long">Fiber Optic Long</option>
                <option value="bob">Neon Bob</option>
              </select>
            </div>

            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Cyber Visor Color</label>
              <input type="color" id="avatar-visor-color" value="#d4ff00" style="
                width:100%; height:38px; background:transparent; border:1px solid rgba(255,255,255,0.15);
                border-radius:8px; cursor:pointer; padding:2px;
              " />
            </div>
          </div>

          <!-- Colors Row -->
          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:16px;">
            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Skin Tone</label>
              <input type="color" id="avatar-skin-color" value="#d1a384" style="
                width:100%; height:38px; background:transparent; border:1px solid rgba(255,255,255,0.15);
                border-radius:8px; cursor:pointer; padding:2px;
              " />
            </div>

            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Hair Color</label>
              <input type="color" id="avatar-hair-color" value="#e2b857" style="
                width:100%; height:38px; background:transparent; border:1px solid rgba(255,255,255,0.15);
                border-radius:8px; cursor:pointer; padding:2px;
              " />
            </div>

            <div>
              <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Suit Armor Color</label>
              <input type="color" id="avatar-suit-color" value="#12131e" style="
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

  // Initialize Three.js Live Avatar Engine
  const canvasBox = document.getElementById('avatar-3d-canvas-container');
  let currentAvatarEngine = null;

  function refreshAvatar() {
    if (currentAvatarEngine) {
      currentAvatarEngine.destroy();
    }
    const palette = {
      skin: document.getElementById('avatar-skin-color').value,
      hair: document.getElementById('avatar-hair-color').value,
      outfit: document.getElementById('avatar-suit-color').value,
      shoes: document.getElementById('avatar-visor-color').value,
      hairStyle: document.getElementById('avatar-hairstyle-select').value,
    };
    const gender = document.getElementById('avatar-gender-select').value;
    currentAvatarEngine = new AvatarEngine(canvasBox, gender, palette);
  }

  refreshAvatar();

  // Attach Input Change Handlers
  ['avatar-gender-select', 'avatar-hairstyle-select', 'avatar-skin-color', 'avatar-hair-color', 'avatar-suit-color', 'avatar-visor-color'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', refreshAvatar);
  });

  // Mint Custom 3D Card Handler
  document.getElementById('btn-mint-custom-card')?.addEventListener('click', () => {
    const name = document.getElementById('avatar-name-input').value.trim() || 'Custom Athlete';
    const handle = document.getElementById('avatar-handle-input').value.trim() || '@custom.exe';
    const ability = document.getElementById('avatar-ability-select').value;
    const visorColor = document.getElementById('avatar-visor-color').value;

    const customCardId = `card_custom_${Date.now()}`;
    const customCard = {
      id: customCardId,
      name,
      handle,
      title: 'Custom Cyber Athlete',
      rarity: 'Custom Mint',
      rarityColor: visorColor || '#d4ff00',
      borderClass: 'border-left-behind',
      tokenId: `#${Math.floor(Math.random()*900 + 100)} / MINT`,
      kCapacity: 4.65,
      speedMs: 180,
      alphaSuppression: 0.94,
      tier: 'S+',
      price: 0,
      imageUrl: '/assets/kaito_portrait.jpg',
      ability
    };

    COLLECTIBLE_CARDS.push(customCard);
    
    const owned = getOwnedCards();
    owned.push(customCardId);
    localStorage.setItem('xiberlinc_owned_cards', JSON.stringify(owned));

    addBattleXp(500, `Minted Custom 3D Card: ${name}`);
    alert(`🎉 CONGRATULATIONS! Your Custom 3D Action Card "${name}" has been minted and added to My Deck!`);
  });
}
