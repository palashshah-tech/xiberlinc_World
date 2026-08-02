/* ============================================================
   StoreView.js — Fullscreen 3D Hall of Fame & Marketplace World
   Features 3D Pop-Out Athlete Cards, Season 1 VIP Pass &
   Direct 1-on-1 Favorite Pro Gamer VIP Chat Channel
   ============================================================ */

import {
  getBattlePassState, getOwnedCards, buyCollectibleCard, getXpLogs,
  addStoreCredits, addBattleXp, getEquippedAbility, setEquippedAbility,
  hasSeasonPass, buySeasonPass, getGamerChatMessages, sendGamerMessage
} from '../utils/battlePass.js';
import { auth } from '../utils/firebase.js';
import { createTradeListing, fetchActiveTradeListings, acceptTradeListing } from '../utils/worldData.js';

export const COLLECTIBLE_CARDS = [
  {
    id: 'card_kaito_mythic',
    name: 'Kaito Mizushima',
    handle: '@kaito.exe',
    title: 'Visual Memory Legend',
    rarity: 'Mythic Gold',
    rarityColor: '#fbbf24',
    borderClass: 'border-left-behind',
    tokenId: '#001 / 100 MINT',
    kCapacity: 4.85,
    speedMs: 178,
    alphaSuppression: 0.97,
    tier: 'S+',
    price: 500,
    imageUrl: '/assets/kaito_portrait.jpg',
    ability: '7-Chain VWM Recall Boost',
  },
  {
    id: 'card_yuna_cyber',
    name: 'Yuna Sato',
    handle: '@yuna.sync',
    title: 'Queen of Executive Control',
    rarity: 'Cyber Volt',
    rarityColor: '#d4ff00',
    borderClass: 'border-right-behind border-bottom-behind',
    tokenId: '#002 / 250 MINT',
    kCapacity: 4.70,
    speedMs: 182,
    alphaSuppression: 0.95,
    tier: 'S+',
    price: 400,
    imageUrl: '/assets/yuna_portrait.jpg',
    ability: 'Executive Control Gating',
  },
  {
    id: 'card_marcus_diamond',
    name: 'Marcus "Prism" Lee',
    handle: '@prism.gg',
    title: 'Distractor Shield Master',
    rarity: 'Diamond Prism',
    rarityColor: '#06b6d4',
    borderClass: 'border-left-behind',
    tokenId: '#003 / 500 MINT',
    kCapacity: 4.52,
    speedMs: 191,
    alphaSuppression: 0.91,
    tier: 'S',
    price: 350,
    imageUrl: '/assets/marcus_portrait.jpg',
    ability: 'Visual Noise Suppression',
  },
  {
    id: 'card_aiko_holo',
    name: 'Aiko Tanaka',
    handle: '@aiko.flux',
    title: 'Pattern Recognition Specialist',
    rarity: 'Holo Rare',
    rarityColor: '#ec4899',
    borderClass: 'border-right-behind',
    tokenId: '#004 / 500 MINT',
    kCapacity: 4.40,
    speedMs: 195,
    alphaSuppression: 0.89,
    tier: 'S',
    price: 300,
    imageUrl: '/assets/aiko_portrait.jpg',
    ability: 'Pattern Intuition Field',
  },
  {
    id: 'card_yuki_rookie',
    name: 'Yuki Sakai',
    handle: '@yuki.fps',
    title: 'Cognitive Proving Ground Rookie',
    rarity: 'Genesis Edition',
    rarityColor: '#a78bfa',
    borderClass: 'border-bottom-behind',
    tokenId: '#005 / 1000 MINT',
    kCapacity: 4.12,
    speedMs: 210,
    alphaSuppression: 0.86,
    tier: 'A',
    price: 200,
    imageUrl: '/assets/yuki_portrait.jpg',
    ability: 'Alethemy Neural Link',
  }
];

let activeStoreTab = 'marketplace'; // 'marketplace' | 'deck' | 'trade_arena'
let activeAnimationId = null;
let selectedGamerChat = 'Kaito Mizushima';

// ── FULL-SCREEN MARKETPLACE WORLD LAUNCHER ─────────────────────────

export function openFullscreenMarketplace() {
  let overlay = document.getElementById('fullscreen-marketplace-overlay');
  if (overlay) overlay.remove();

  overlay = document.createElement('div');
  overlay.id = 'fullscreen-marketplace-overlay';
  overlay.setAttribute('data-lenis-prevent', 'true');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: #050508; color: #fff; overflow-y: scroll;
    -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
    animation: fade-in 0.3s ease-out;
  `;

  overlay.innerHTML = `
    <!-- Fullscreen Sticky Navigation Bar -->
    <div style="
      position: sticky; top: 0; z-index: 100; background: rgba(5,5,8,0.92);
      backdrop-filter: blur(20px); border-bottom: 1px solid rgba(212,255,0,0.3);
      padding: 16px 32px; display: flex; align-items: center; justify-content: space-between;
    ">
      <div style="display:flex; align-items:center; gap:16px;">
        <div style="
          width: 38px; height: 38px; border-radius: 10px; background: rgba(212,255,0,0.15);
          border: 1.5px solid #d4ff00; display: flex; align-items: center; justify-content: center;
          font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.2rem; color: #d4ff00;
        ">3D</div>
        <div>
          <div style="font-family:'Outfit', sans-serif; font-size:1.1rem; font-weight:900; color:#fff;">
            XIBERLINC 3D HALL OF FAME &amp; MARKETPLACE WORLD
          </div>
          <div style="font-family:'JetBrains Mono', monospace; font-size:10px; color:rgba(255,255,255,0.5);">
            Full Immersive Standalone Experience &middot; Season 1 Edition
          </div>
        </div>
      </div>

      <button id="close-fullscreen-marketplace-btn" style="
        background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);
        color: #fff; font-family: 'Space Grotesk', sans-serif; font-weight: 800;
        font-size: 12.5px; padding: 10px 22px; border-radius: 100px; cursor: pointer;
        transition: all 0.2s; text-transform: uppercase;
      ">
        ✕ Return to World
      </button>
    </div>

    <!-- Inner Content Container -->
    <div id="fullscreen-marketplace-inner" style="padding: 24px 0 60px;"></div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('close-fullscreen-marketplace-btn').addEventListener('click', () => {
    if (activeAnimationId) cancelAnimationFrame(activeAnimationId);
    overlay.remove();
  });

  const innerContainer = document.getElementById('fullscreen-marketplace-inner');
  renderCollectiblesStore(innerContainer);
}

// ── MAIN RENDERER ──────────────────────────────────────────────────

export async function renderCollectiblesStore(container) {
  if (!container) return;

  if (activeAnimationId) {
    cancelAnimationFrame(activeAnimationId);
    activeAnimationId = null;
  }

  const bp = getBattlePassState();
  const owned = getOwnedCards();
  const logs = getXpLogs();
  const seasonPassOwned = hasSeasonPass();
  const currentUserEmail = (auth.currentUser?.email || localStorage.getItem('cogscreen_user_email') || '').toLowerCase().trim();
  const isAdminTest = currentUserEmail === 'palash.shah@xiberlinc.one';

  const ownedCardObjects = COLLECTIBLE_CARDS.filter(c => owned.includes(c.id));
  const tradeListings = await fetchActiveTradeListings();
  const gamerChatMessages = getGamerChatMessages(selectedGamerChat);

  container.innerHTML = `
    <style>
      .hof-shrine-bg {
        background: radial-gradient(circle at 50% 20%, rgba(124, 58, 237, 0.18) 0%, rgba(5, 5, 10, 0.98) 75%);
        position: relative; overflow: hidden; border-radius: 28px; padding: 48px 32px;
        border: 1px solid rgba(212, 255, 0, 0.25); box-shadow: inset 0 0 100px rgba(0,0,0,0.9);
      }
      .hof-grid-guidelines {
        position: absolute; inset: 0; pointer-events: none; opacity: 0.08;
        background-image: linear-gradient(rgba(212, 255, 0, 0.5) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(212, 255, 0, 0.5) 1px, transparent 1px);
        background-size: 40px 40px;
      }
      .hof-card-3d {
        position: relative; height: 30rem; width: 21rem; aspect-ratio: 5 / 7;
        color: #ffffff; perspective: 50rem; margin: 0 auto; user-select: none;
      }
      .hof-card-3d .shadow-layer {
        position: absolute; inset: 0; border-radius: 20px;
        background: var(--card-img); background-size: cover; background-position: center;
        opacity: 0.85; filter: blur(2rem) saturate(1.2);
        box-shadow: 0 -1.5rem 3rem -0.5rem rgba(0, 0, 0, 0.9);
        transform: rotateX(var(--rotateX, 0deg)) rotateY(var(--rotateY, 0deg)) translate3d(0, 2rem, -2rem);
      }
      .hof-card-3d .image-layer {
        position: absolute; inset: 0; border-radius: 20px; overflow: hidden;
        background: linear-gradient(to top, rgba(0, 0, 0, 0.92) 0%, rgba(0, 0, 0, 0.2) 50%, transparent 100%), var(--card-img);
        background-size: cover; background-position: center;
      }
      .hof-card-3d .image-layer.background {
        transform: rotateX(var(--rotateX, 0deg)) rotateY(var(--rotateY, 0deg)) translate3d(0, 0, 0rem);
      }
      .hof-card-3d .image-layer.cutout {
        transform: rotateX(var(--rotateX, 0deg)) rotateY(var(--rotateY, 0deg)) translate3d(0, 0, 4.5rem) scale(0.94);
        z-index: 3; filter: drop-shadow(0 14px 28px rgba(0,0,0,0.85));
      }
      .hof-card-3d .content-layer {
        position: absolute; display: flex; flex-direction: column; justify-content: flex-end;
        inset: 0; padding: 2.2rem 1.8rem;
        transform: rotateX(var(--rotateX, 0deg)) rotateY(var(--rotateY, 0deg)) translate3d(0, 0, 6.5rem);
        z-index: 4; text-shadow: 0 4px 16px rgba(0,0,0,0.9);
      }
      .hof-card-3d::before {
        content: ""; position: absolute; inset: 1.2rem;
        border: var(--card-border-col, #fbbf24) 0.35rem solid; border-radius: 14px;
        transform: rotateX(var(--rotateX, 0deg)) rotateY(var(--rotateY, 0deg)) translate3d(0, 0, 2.5rem);
        z-index: 4; pointer-events: none;
      }
      .hof-card-3d.border-left-behind::before { border-left-color: transparent; }
      .hof-card-3d.border-right-behind::before { border-right-color: transparent; }
      .hof-card-3d.border-bottom-behind::before { border-bottom-color: transparent; }
    </style>

    <div class="scroll-reveal hof-shrine-bg" style="max-width: 1380px; margin: 0 auto;">
      <div class="hof-grid-guidelines"></div>

      <!-- Season 1 Premium Gamer VIP Pass Banner -->
      <div style="
        position: relative; z-index: 2; margin-bottom: 32px;
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(212, 255, 0, 0.15) 100%);
        border: 1.5px solid rgba(212, 255, 0, 0.4); border-radius: 20px; padding: 20px 28px;
        display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
      ">
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="
            width: 52px; height: 52px; border-radius: 14px; background: rgba(212,255,0,0.2);
            border: 2px solid #d4ff00; display: flex; align-items: center; justify-content: center;
            font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.5rem; color: #d4ff00;
          ">🎮</div>
          <div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-family:'Outfit', sans-serif; font-size:1.2rem; font-weight:900; color:#fff;">
                Season 1 Premium VIP Gamer Pass
              </span>
              <span style="font-family:'JetBrains Mono', monospace; font-size:9.5px; background:rgba(212,255,0,0.18); color:#d4ff00; border:1px solid rgba(212,255,0,0.4); padding:2px 8px; border-radius:100px; text-transform:uppercase;">
                ${seasonPassOwned ? '✓ OWNED PASS' : '$19.99 USD / 1,500 CR'}
              </span>
            </div>
            <div style="font-size:12.5px; color:rgba(255,255,255,0.7); margin-top:4px;">
              Unlocks 💬 <strong>Direct 1-on-1 VIP Chat with Your Favorite Gamer</strong>, ⚡ 1x Free Legendary Ability Card Choice &amp; 🎟 VIP Neuro Room Pass.
            </div>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:12px;">
          ${seasonPassOwned ? `
            <button id="btn-open-gamer-chat" style="
              background: #d4ff00; color: #000; font-family: 'Space Grotesk', sans-serif;
              font-weight: 900; font-size: 12.5px; border: none; padding: 12px 24px;
              border-radius: 10px; cursor: pointer; text-transform: uppercase;
            ">
              💬 Chat with Favorite Gamer
            </button>
          ` : `
            <button id="btn-buy-season-pass" style="
              background: #d4ff00; color: #000; font-family: 'Space Grotesk', sans-serif;
              font-weight: 900; font-size: 12.5px; border: none; padding: 12px 24px;
              border-radius: 10px; cursor: pointer; text-transform: uppercase;
            ">
              Unlock VIP Gamer Pass (1,500 CR)
            </button>
          `}
        </div>
      </div>
      
      <!-- 3D Hall of Fame Header Banner -->
      <div style="
        position: relative; z-index: 2; margin-bottom: 32px;
        display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;
      ">
        <div>
          <div style="font-family:'Space Grotesk', sans-serif; font-size:11px; color:#d4ff00; letter-spacing:0.22em; text-transform:uppercase;">
            🏛️ 3D HALL OF FAME SHRINE &middot; WORKING MEMORY MARKETPLACE
          </div>
          <h1 style="font-family:'Outfit', sans-serif; font-size:36px; font-weight:900; color:#fff; margin:6px 0; letter-spacing:-0.02em;">
            Tokenized Athlete 3D Cards
          </h1>
          <div style="font-size:14px; color:rgba(255,255,255,0.65); max-width:620px; line-height:1.5;">
            Hover over any 3D pop-out card to experience multi-layered depth, volumetric pop-out face cutouts &amp; Cowan's K capacity telemetry.
          </div>
          ${isAdminTest ? `
            <div style="margin-top:10px; font-family:'JetBrains Mono', monospace; font-size:11px; color:#d4ff00; background:rgba(212,255,0,0.1); border:1px solid rgba(212,255,0,0.3); padding:4px 12px; border-radius:6px; display:inline-block;">
              👑 Master Admin Test Account Active (palash.shah@xiberlinc.one) &middot; Unlimited Test Credits Enabled
            </div>
          ` : ''}
        </div>

        <!-- Store User Wallet & Top-Up -->
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; position:relative; z-index:2;">
          <div style="
            background: rgba(0,0,0,0.7); border: 1px solid rgba(212,255,0,0.4);
            border-radius: 16px; padding: 10px 20px; text-align: right;
            display: flex; align-items: center; gap: 16px; box-shadow: 0 0 30px rgba(212,255,0,0.15);
          ">
            <div>
              <div style="font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase;">Store Credits</div>
              <div id="store-user-credits" style="font-family:'Outfit', sans-serif; font-weight:900; font-size:24px; color:#d4ff00;">
                ${bp.credits.toLocaleString()} CR
              </div>
            </div>

            <button id="btn-topup-credits" style="
              background: #d4ff00; color: #000; font-family: 'Space Grotesk', sans-serif;
              font-weight: 800; font-size: 11.5px; border: none; padding: 10px 16px;
              border-radius: 10px; cursor: pointer; text-transform: uppercase; white-space: nowrap;
            ">
              + Buy Credits ($)
            </button>
          </div>

          <button id="btn-view-xp-logs" style="
            background: rgba(124,58,237,0.25); border: 1px solid rgba(167,139,250,0.5);
            color: #a78bfa; font-family: 'Space Grotesk', sans-serif; font-weight: 700;
            font-size: 12.5px; padding: 14px 20px; border-radius: 14px; cursor: pointer;
          ">
            📜 XP Activity Logs
          </button>
        </div>
      </div>

      <!-- Navigation Tabs (Marketplace vs My Deck vs Trade Arena) -->
      <div style="position:relative; z-index:2; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom: 36px;">
        <div style="
          display: flex; gap: 8px; background: rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 6px;
        ">
          <button id="tab-marketplace" style="
            font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 12.5px;
            padding: 10px 24px; border-radius: 10px; border: none; cursor: pointer;
            background: ${activeStoreTab === 'marketplace' ? '#d4ff00' : 'transparent'};
            color: ${activeStoreTab === 'marketplace' ? '#000' : 'rgba(255,255,255,0.7)'};
            text-transform: uppercase; transition: all 0.2s;
          ">
            💎 3D Universal Marketplace
          </button>

          <button id="tab-my-deck" style="
            font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 12.5px;
            padding: 10px 24px; border-radius: 10px; border: none; cursor: pointer;
            background: ${activeStoreTab === 'deck' ? '#d4ff00' : 'transparent'};
            color: ${activeStoreTab === 'deck' ? '#000' : 'rgba(255,255,255,0.7)'};
            text-transform: uppercase; transition: all 0.2s;
          ">
            🎴 My Deck (${ownedCardObjects.length})
          </button>

          <button id="tab-trade-arena" style="
            font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 12.5px;
            padding: 10px 24px; border-radius: 10px; border: none; cursor: pointer;
            background: ${activeStoreTab === 'trade_arena' ? '#d4ff00' : 'transparent'};
            color: ${activeStoreTab === 'trade_arena' ? '#000' : 'rgba(255,255,255,0.7)'};
            text-transform: uppercase; transition: all 0.2s;
          ">
            🤝 Trade Arena (${tradeListings.length})
          </button>
        </div>

        ${activeStoreTab === 'trade_arena' ? `
          <button id="btn-open-list-card" style="
            background: rgba(212,255,0,0.15); border: 1px solid rgba(212,255,0,0.4);
            color: #d4ff00; font-family: 'Space Grotesk', sans-serif; font-weight: 700;
            font-size: 12.5px; padding: 12px 24px; border-radius: 12px; cursor: pointer;
          ">
            + Put Up Card for Trade
          </button>
        ` : ''}
      </div>

      <!-- TAB 1: 3D UNIVERSAL MARKETPLACE -->
      ${activeStoreTab === 'marketplace' ? `
        <div style="
          display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
          gap: 40px; margin-bottom: 48px; position:relative; z-index:2;
        ">
          ${COLLECTIBLE_CARDS.map(card => {
            const isOwned = owned.includes(card.id);

            return `
              <div class="hof-card-3d ${card.borderClass}" style="--card-img: url('${card.imageUrl}'); --card-border-col: ${card.rarityColor};">
                
                <!-- Ambient Blurred Shadow Glow Layer -->
                <div class="shadow-layer"></div>

                <!-- Deep 3D Background Layer -->
                <div class="image-layer background"></div>

                <!-- POP-OUT 3D FACE CUTOUT LAYER -->
                <div class="image-layer cutout"></div>

                <!-- Floating 3D Metadata Content Layer -->
                <div class="content-layer">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: auto;">
                    <span style="
                      font-family: 'Space Grotesk', sans-serif; font-size: 9.5px; font-weight: 800;
                      color: #000; background: ${card.rarityColor};
                      padding: 3px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.1em;
                    ">
                      ${card.rarity}
                    </span>
                    <span style="font-family:'JetBrains Mono', monospace; font-size:9px; color:rgba(255,255,255,0.7); background:rgba(0,0,0,0.6); padding:2px 8px; border-radius:4px;">
                      ${card.tokenId}
                    </span>
                  </div>

                  <div style="margin-top: auto; padding-top: 14px;">
                    <h2 style="font-family:'Outfit', sans-serif; font-weight:900; font-size:22px; color:#fff; margin:0 0 2px 0;">
                      ${card.name}
                    </h2>
                    <div style="font-family:'JetBrains Mono', monospace; font-size:10.5px; color:${card.rarityColor}; margin-bottom:12px;">
                      ${card.handle} &middot; ${card.title}
                    </div>

                    <!-- Telemetry Mini Grid -->
                    <div style="
                      display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;
                      background:rgba(0,0,0,0.65); border:1px solid rgba(255,255,255,0.15);
                      border-radius:10px; padding:8px; margin-bottom:14px; text-align:center;
                    ">
                      <div>
                        <div style="font-family:'JetBrains Mono', monospace; font-size:7.5px; color:rgba(255,255,255,0.5);">COWAN K</div>
                        <div style="font-family:'Outfit', sans-serif; font-weight:800; font-size:13px; color:#d4ff00;">${card.kCapacity}</div>
                      </div>
                      <div>
                        <div style="font-family:'JetBrains Mono', monospace; font-size:7.5px; color:rgba(255,255,255,0.5);">SPEED</div>
                        <div style="font-family:'Outfit', sans-serif; font-weight:800; font-size:13px; color:#00f0ff;">${card.speedMs}ms</div>
                      </div>
                      <div>
                        <div style="font-family:'JetBrains Mono', monospace; font-size:7.5px; color:rgba(255,255,255,0.5);">ALPHA</div>
                        <div style="font-family:'Outfit', sans-serif; font-weight:800; font-size:13px; color:#34d399;">${card.alphaSuppression}</div>
                      </div>
                    </div>

                    <button class="btn-buy-card" data-card-id="${card.id}" style="
                      width: 100%; padding: 12px; border-radius: 8px; border: none;
                      background: ${isOwned ? 'rgba(52,211,153,0.25)' : '#d4ff00'};
                      color: ${isOwned ? '#34d399' : '#000'};
                      border: 1px solid ${isOwned ? '#34d399' : 'transparent'};
                      font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 12px;
                      cursor: pointer; text-transform: uppercase; letter-spacing: 0.08em;
                    ">
                      ${isOwned ? '✓ IN MY DECK' : `BUY CARD (${card.price} CR)`}
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- TAB 2: MY PERSONAL DECK -->
      ${activeStoreTab === 'deck' ? `
        <div style="margin-bottom: 48px; position:relative; z-index:2;">
          ${ownedCardObjects.length === 0 ? `
            <div style="
              text-align: center; padding: 60px 24px; background: rgba(13,13,20,0.6);
              border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
            ">
              <div style="font-size: 40px; margin-bottom: 12px;">🎴</div>
              <h3 style="font-family:'Outfit', sans-serif; font-size:22px; font-weight:800; color:#fff; margin:0 0 8px 0;">
                Your Deck is Currently Empty
              </h3>
              <p style="font-size:14px; color:rgba(255,255,255,0.5); max-width:480px; margin:0 auto 20px;">
                You haven't unlocked any 3D Tokenized Action Cards yet. Browse the Universal Marketplace to purchase cards or complete trade swaps!
              </p>
              <button id="btn-goto-marketplace" style="
                background: #d4ff00; color: #000; font-family: 'Space Grotesk', sans-serif;
                font-weight: 800; font-size: 13px; border: none; padding: 12px 24px; border-radius: 10px; cursor: pointer;
              ">
                💎 Explore 3D Universal Marketplace &rarr;
              </button>
            </div>
          ` : `
            <div style="
              display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
              gap: 40px;
            ">
              ${ownedCardObjects.map(card => {
                const isEquipped = getEquippedAbility() === card.ability;

                return `
                  <div class="hof-card-3d ${card.borderClass}" style="--card-img: url('${card.imageUrl}'); --card-border-col: ${card.rarityColor};">
                    
                    <div class="shadow-layer"></div>
                    <div class="image-layer background"></div>
                    <div class="image-layer cutout"></div>

                    <div class="content-layer">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: auto;">
                        <span style="
                          font-family: 'Space Grotesk', sans-serif; font-size: 9.5px; font-weight: 800;
                          color: #000; background: ${card.rarityColor};
                          padding: 3px 10px; border-radius: 100px; text-transform: uppercase;
                        ">
                          OWNED &middot; ${card.rarity}
                        </span>
                        <span style="font-family:'JetBrains Mono', monospace; font-size:9px; color:rgba(255,255,255,0.7); background:rgba(0,0,0,0.6); padding:2px 8px; border-radius:4px;">
                          ${card.tokenId}
                        </span>
                      </div>

                      <div style="margin-top: auto; padding-top: 14px;">
                        <h2 style="font-family:'Outfit', sans-serif; font-weight:900; font-size:22px; color:#fff; margin:0 0 2px 0;">
                          ${card.name}
                        </h2>
                        <div style="font-family:'JetBrains Mono', monospace; font-size:10.5px; color:${card.rarityColor}; margin-bottom:10px;">
                          ${card.handle} &middot; ${card.title}
                        </div>

                        <!-- Ability Badge -->
                        <div style="
                          font-family:'JetBrains Mono', monospace; font-size:9px; color:#d4ff00;
                          background:rgba(0,0,0,0.7); border:1px dashed rgba(212,255,0,0.3);
                          padding:6px 10px; border-radius:6px; margin-bottom:12px; text-align:center;
                        ">
                          ⚡ ${card.ability}
                        </div>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                          <button class="btn-equip-ability" data-ability="${card.ability}" style="
                            padding: 10px; border-radius: 8px; border: none;
                            background: ${isEquipped ? 'rgba(52,211,153,0.3)' : 'rgba(255,255,255,0.15)'};
                            color: ${isEquipped ? '#34d399' : '#fff'};
                            border: 1px solid ${isEquipped ? '#34d399' : 'rgba(255,255,255,0.3)'};
                            font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 11px;
                            cursor: pointer; text-transform: uppercase;
                          ">
                            ${isEquipped ? '⚡ EQUIPPED' : '⚔ EQUIP'}
                          </button>

                          <button class="btn-deck-trade" data-card-id="${card.id}" style="
                            padding: 10px; border-radius: 8px;
                            border: 1px solid rgba(212,255,0,0.4); background: rgba(212,255,0,0.15);
                            color: #d4ff00; font-family: 'Space Grotesk', sans-serif; font-weight: 700;
                            font-size: 11px; cursor: pointer; text-transform: uppercase;
                          ">
                            🤝 TRADE
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      ` : ''}

      <!-- TAB 3: REAL-TIME TRADE ARENA -->
      ${activeStoreTab === 'trade_arena' ? `
        <div style="margin-bottom: 48px; position:relative; z-index:2;">
          ${tradeListings.length === 0 ? `
            <div style="
              text-align: center; padding: 60px 24px; background: rgba(13,13,20,0.6);
              border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
            ">
              <div style="font-size: 40px; margin-bottom: 12px;">🤝</div>
              <h3 style="font-family:'Outfit', sans-serif; font-size:22px; font-weight:800; color:#fff; margin:0 0 8px 0;">
                Trade Arena Feed is Empty
              </h3>
              <p style="font-size:14px; color:rgba(255,255,255,0.5); max-width:480px; margin:0 auto 20px;">
                Be the first athlete to put up a 3D tokenized card for trade across the candidate network!
              </p>
              <button id="btn-empty-list-card" style="
                background: #d4ff00; color: #000; font-family: 'Space Grotesk', sans-serif;
                font-weight: 800; font-size: 13px; border: none; padding: 12px 24px; border-radius: 10px; cursor: pointer;
              ">
                + Put Up Card for Trade
              </button>
            </div>
          ` : `
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap:24px;">
              ${tradeListings.map(listing => `
                <div style="
                  background: rgba(13, 13, 20, 0.9); border: 1px solid rgba(212, 255, 0, 0.3);
                  border-radius: 18px; padding: 24px; position: relative; overflow: hidden;
                  box-shadow: 0 12px 32px rgba(0,0,0,0.5);
                ">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                    <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:#d4ff00; background:rgba(212,255,0,0.15); border:1px solid rgba(212,255,0,0.3); padding:3px 8px; border-radius:4px;">
                      LISTED FOR TRADE
                    </span>
                    <span style="font-family:'JetBrains Mono', monospace; font-size:10px; color:rgba(255,255,255,0.4);">
                      Seller: ${listing.sellerHandle}
                    </span>
                  </div>

                  <h3 style="font-family:'Outfit', sans-serif; font-weight:800; font-size:20px; color:#fff; margin:0 0 4px 0;">
                    ${listing.cardName}
                  </h3>
                  <div style="font-size:12px; color:#a78bfa; margin-bottom:14px;">
                    Rarity: ${listing.cardRarity}
                  </div>

                  <div style="
                    background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 10px; padding: 12px; margin-bottom: 16px;
                  ">
                    <div style="font-family:'JetBrains Mono', monospace; font-size:8.5px; color:rgba(255,255,255,0.4); text-transform:uppercase;">Asking Offer</div>
                    <div style="font-family:'Outfit', sans-serif; font-weight:700; font-size:13.5px; color:#fff; margin-top:2px;">
                      "${listing.askingOffer}"
                    </div>
                  </div>

                  <button class="btn-accept-trade" data-listing-id="${listing.id}" data-seller="${listing.sellerHandle}" style="
                    width: 100%; padding: 12px; border-radius: 8px; border: none;
                    background: #d4ff00; color: #000; font-family: 'Space Grotesk', sans-serif;
                    font-weight: 800; font-size: 12px; text-transform: uppercase; cursor: pointer;
                  ">
                    🤝 Accept Trade &amp; Swap Card
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      ` : ''}
    </div>

    <!-- Direct 1-on-1 Favorite Gamer VIP Chat Modal -->
    <div id="gamer-chat-modal" style="
      display: none; position: fixed; inset: 0; z-index: 100000;
      background: rgba(0,0,0,0.88); backdrop-filter: blur(20px);
      align-items: center; justify-content: center; padding: 24px;
    ">
      <div style="
        background: rgba(13, 13, 20, 0.98); border: 1.5px solid #d4ff00;
        border-radius: 22px; max-width: 580px; width: 100%; padding: 28px;
        position: relative; color: #fff; box-shadow: 0 24px 80px rgba(212,255,0,0.25);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:14px; margin-bottom:18px;">
          <div>
            <div style="font-family:'Space Grotesk', sans-serif; font-size:10px; color:#d4ff00; letter-spacing:0.12em; text-transform:uppercase;">
              💬 DIRECT PRO GAMER VIP CHANNEL &middot; SEASON PASS PERK
            </div>
            <h2 style="font-family:'Outfit', sans-serif; font-size:20px; font-weight:800; margin:2px 0 0 0;">
              Chat with Your Favorite Pro Athlete
            </h2>
          </div>
          <button id="gamer-chat-close" style="background:transparent; border:none; color:rgba(255,255,255,0.5); font-size:24px; cursor:pointer;">&times;</button>
        </div>

        <!-- Gamer Selector Dropdown -->
        <div style="margin-bottom:14px;">
          <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Select Pro Athlete to Message</label>
          <select id="select-favorite-gamer" style="
            width:100%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.18);
            border-radius:10px; padding:10px 14px; color:#fff; font-family:'Space Grotesk', sans-serif; font-size:13px; outline:none;
          ">
            ${COLLECTIBLE_CARDS.map(c => `
              <option value="${c.name}" ${selectedGamerChat === c.name ? 'selected' : ''}>${c.name} (${c.title} &middot; Cowan K: ${c.kCapacity})</option>
            `).join('')}
          </select>
        </div>

        <!-- Chat Stream Box -->
        <div id="gamer-chat-stream" style="
          max-height: 260px; overflow-y: auto; display: flex; flex-direction: column;
          gap: 12px; margin-bottom: 20px; padding: 12px; background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
        ">
          ${gamerChatMessages.map(msg => `
            <div style="
              padding: 10px 14px; border-radius: 10px;
              background: ${msg.sender === 'You' ? 'rgba(212,255,0,0.12)' : 'rgba(124,58,237,0.2)'};
              border: 1px solid ${msg.sender === 'You' ? 'rgba(212,255,0,0.3)' : 'rgba(167,139,250,0.3)'};
              align-self: ${msg.sender === 'You' ? 'flex-end' : 'flex-start'}; max-width: 85%;
            ">
              <div style="font-family:'Outfit', sans-serif; font-weight:700; font-size:12px; color:${msg.sender === 'You' ? '#d4ff00' : '#a78bfa'}; margin-bottom:2px;">
                ${msg.sender} <span style="font-family:'JetBrains Mono', monospace; font-size:9px; color:rgba(255,255,255,0.4); font-weight:400;">&middot; ${msg.time}</span>
              </div>
              <div style="font-size:13px; color:#fff; line-height:1.4;">${msg.text}</div>
            </div>
          `).join('')}
        </div>

        <!-- Message Input Box -->
        <div style="display:flex; gap:10px;">
          <input type="text" id="gamer-chat-input" placeholder="Type a message to ${selectedGamerChat}..." style="
            flex:1; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.18);
            border-radius:10px; padding:12px 16px; color:#fff; font-family:'Space Grotesk', sans-serif; font-size:13px; outline:none;
          " />
          <button id="gamer-chat-send" style="
            background:#d4ff00; color:#000; font-family:'Space Grotesk', sans-serif;
            font-weight:800; font-size:12px; border:none; padding:12px 20px; border-radius:10px; cursor:pointer; text-transform:uppercase;
          ">Send</button>
        </div>
      </div>
    </div>

    <!-- Put Up Card for Trade Modal -->
    <div id="list-card-modal" style="
      display: none; position: fixed; inset: 0; z-index: 10000;
      background: rgba(0,0,0,0.85); backdrop-filter: blur(16px);
      align-items: center; justify-content: center; padding: 24px;
    ">
      <div style="
        background: rgba(13, 13, 20, 0.96); border: 1px solid rgba(212,255,0,0.35);
        border-radius: 20px; max-width: 480px; width: 100%; padding: 28px;
        position: relative; color: #fff; box-shadow: 0 24px 60px rgba(0,0,0,0.9);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:14px; margin-bottom:18px;">
          <h2 style="font-family:'Outfit', sans-serif; font-size:20px; font-weight:800; margin:0;">
            🤝 List Card in Trade Arena
          </h2>
          <button id="list-modal-close" style="background:transparent; border:none; color:rgba(255,255,255,0.5); font-size:24px; cursor:pointer;">&times;</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:16px; margin-bottom:20px;">
          <div>
            <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:10px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Select Card from Your Deck</label>
            <select id="trade-select-card" style="
              width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
              border-radius: 8px; padding: 12px; color: #fff; font-family: 'Space Grotesk', sans-serif; font-size: 13px; outline: none;
            ">
              ${ownedCardObjects.map(c => `
                <option value="${c.id}">${c.name} (${c.rarity})</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:10px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Your Asking Offer / Desired Card</label>
            <input type="text" id="trade-asking-input" placeholder="e.g. Seeking Yuna Sato Cyber Volt or 300 CR" style="
              width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
              border-radius: 8px; padding: 12px; color: #fff; font-family: 'Space Grotesk', sans-serif; font-size: 13px; outline: none;
            " />
          </div>

          <button id="trade-submit-btn" style="
            width: 100%; background: #d4ff00; color: #000; font-family: 'Space Grotesk', sans-serif;
            font-weight: 800; font-size: 13px; border: none; padding: 14px; border-radius: 10px; cursor: pointer; text-transform: uppercase;
          ">
            Publish Trade Listing &rarr;
          </button>
        </div>
      </div>
    </div>

    <!-- Real-Money Credit Top-Up Modal -->
    <div id="credit-topup-modal" style="
      display: none; position: fixed; inset: 0; z-index: 10000;
      background: rgba(0,0,0,0.85); backdrop-filter: blur(16px);
      align-items: center; justify-content: center; padding: 24px;
    ">
      <div style="
        background: rgba(13, 13, 20, 0.96); border: 1px solid rgba(212,255,0,0.35);
        border-radius: 20px; max-width: 500px; width: 100%; padding: 28px;
        position: relative; color: #fff; box-shadow: 0 24px 60px rgba(0,0,0,0.9);
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:14px; margin-bottom:18px;">
          <div>
            <div style="font-family:'Space Grotesk', sans-serif; font-size:10px; color:#d4ff00; letter-spacing:0.12em; text-transform:uppercase;">
              💳 STORE CREDIT TOP-UP
            </div>
            <h2 style="font-family:'Outfit', sans-serif; font-size:20px; font-weight:800; margin:2px 0 0 0;">
              Purchase Store Credits (USD)
            </h2>
          </div>
          <button id="topup-modal-close" style="background:transparent; border:none; color:rgba(255,255,255,0.5); font-size:24px; cursor:pointer;">&times;</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
          <div class="credit-pack-option" data-credits="500" data-price="5.00" style="
            display:flex; justify-content:space-between; align-items:center; padding:14px 18px;
            background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:12px; cursor:pointer;
          ">
            <div>
              <div style="font-family:'Outfit', sans-serif; font-weight:800; font-size:16px; color:#fff;">Starter Pack &middot; 500 CR</div>
              <div style="font-size:11px; color:rgba(255,255,255,0.5);">Unlocks 1 Action Card</div>
            </div>
            <button style="background:#d4ff00; color:#000; font-family:'Space Grotesk', sans-serif; font-weight:800; font-size:12px; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">$5.00 USD</button>
          </div>

          <div class="credit-pack-option" data-credits="1200" data-price="10.00" style="
            display:flex; justify-content:space-between; align-items:center; padding:14px 18px;
            background:rgba(124,58,237,0.12); border:1px solid rgba(167,139,250,0.3); border-radius:12px; cursor:pointer;
          ">
            <div>
              <div style="font-family:'Outfit', sans-serif; font-weight:800; font-size:16px; color:#fff;">Pro Pack &middot; 1,200 CR <span style="font-size:10px; color:#d4ff00;">(+20% BONUS)</span></div>
              <div style="font-size:11px; color:rgba(255,255,255,0.5);">Unlocks 3 Action Cards</div>
            </div>
            <button style="background:#d4ff00; color:#000; font-family:'Space Grotesk', sans-serif; font-weight:800; font-size:12px; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">$10.00 USD</button>
          </div>

          <div class="credit-pack-option" data-credits="3200" data-price="25.00" style="
            display:flex; justify-content:space-between; align-items:center; padding:14px 18px;
            background:rgba(6,182,212,0.12); border:1px solid rgba(6,182,212,0.3); border-radius:12px; cursor:pointer;
          ">
            <div>
              <div style="font-family:'Outfit', sans-serif; font-weight:800; font-size:16px; color:#fff;">Elite Pack &middot; 3,200 CR <span style="font-size:10px; color:#00f0ff;">(+28% BONUS)</span></div>
              <div style="font-size:11px; color:rgba(255,255,255,0.5);">Unlocks All Mythic Cards</div>
            </div>
            <button style="background:#d4ff00; color:#000; font-family:'Space Grotesk', sans-serif; font-weight:800; font-size:12px; border:none; padding:8px 16px; border-radius:6px; cursor:pointer;">$25.00 USD</button>
          </div>
        </div>
      </div>
    </div>

    <!-- XP Activity Logs Modal -->
    <div id="xp-logs-modal" style="
      display: none; position: fixed; inset: 0; z-index: 10000;
      background: rgba(0,0,0,0.85); backdrop-filter: blur(16px);
      align-items: center; justify-content: center; padding: 24px;
    ">
      <div style="
        background: rgba(13, 13, 20, 0.95); border: 1px solid rgba(212,255,0,0.3);
        border-radius: 20px; max-width: 520px; width: 100%; padding: 28px;
        position: relative; color: #fff;
      ">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:14px; margin-bottom:18px;">
          <h2 style="font-family:'Outfit', sans-serif; font-size:20px; font-weight:800; margin:0;">📜 Battle Pass XP Activity Log</h2>
          <button id="xp-logs-close" style="background:transparent; border:none; color:rgba(255,255,255,0.5); font-size:24px; cursor:pointer;">&times;</button>
        </div>

        <div style="max-height:300px; overflow-y:auto; display:flex; flex-direction:column; gap:10px;">
          ${logs.map(log => `
            <div style="
              display:flex; justify-content:space-between; align-items:center;
              padding: 12px 16px; background: rgba(255,255,255,0.03);
              border: 1px solid rgba(255,255,255,0.06); border-radius: 10px;
            ">
              <div>
                <div style="font-family:'Outfit', sans-serif; font-weight:700; font-size:13px; color:#fff;">${log.title}</div>
                <div style="font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.4);">${log.date}</div>
              </div>
              <div style="font-family:'JetBrains Mono', monospace; font-weight:800; font-size:13px; color:#d4ff00;">
                ${log.xp ? `+${log.xp} XP` : 'TRANSACTION'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Attach Season Pass purchase handler
  container.querySelector('#btn-buy-season-pass')?.addEventListener('click', () => {
    if (buySeasonPass()) {
      alert('🎉 CONGRATULATIONS! Season 1 VIP Gamer Pass Unlocked! +1,000 XP & Direct VIP Gamer Chat Enabled!');
      renderCollectiblesStore(container);
    } else {
      if (topupModal) topupModal.style.display = 'flex';
    }
  });

  // Attach Gamer Chat modal handlers
  const gamerChatModal = document.getElementById('gamer-chat-modal');
  container.querySelector('#btn-open-gamer-chat')?.addEventListener('click', () => {
    if (gamerChatModal) gamerChatModal.style.display = 'flex';
  });
  container.querySelector('#gamer-chat-close')?.addEventListener('click', () => {
    if (gamerChatModal) gamerChatModal.style.display = 'none';
  });

  // Gamer Dropdown Selector change handler
  container.querySelector('#select-favorite-gamer')?.addEventListener('change', (e) => {
    selectedGamerChat = e.target.value;
    renderCollectiblesStore(container);
    if (gamerChatModal) gamerChatModal.style.display = 'flex';
  });

  // Send Gamer Message Handler
  const sendMsgBtn = container.querySelector('#gamer-chat-send');
  const chatInput = container.querySelector('#gamer-chat-input');
  sendMsgBtn?.addEventListener('click', () => {
    if (chatInput && chatInput.value.trim()) {
      sendGamerMessage(selectedGamerChat, chatInput.value.trim());
      chatInput.value = '';
      renderCollectiblesStore(container);
      if (gamerChatModal) gamerChatModal.style.display = 'flex';
    }
  });

  window.addEventListener('gamer_chat_updated', () => {
    const stream = document.getElementById('gamer-chat-stream');
    if (stream) {
      const msgs = getGamerChatMessages(selectedGamerChat);
      stream.innerHTML = msgs.map(msg => `
        <div style="
          padding: 10px 14px; border-radius: 10px;
          background: ${msg.sender === 'You' ? 'rgba(212,255,0,0.12)' : 'rgba(124,58,237,0.2)'};
          border: 1px solid ${msg.sender === 'You' ? 'rgba(212,255,0,0.3)' : 'rgba(167,139,250,0.3)'};
          align-self: ${msg.sender === 'You' ? 'flex-end' : 'flex-start'}; max-width: 85%;
        ">
          <div style="font-family:'Outfit', sans-serif; font-weight:700; font-size:12px; color:${msg.sender === 'You' ? '#d4ff00' : '#a78bfa'}; margin-bottom:2px;">
            ${msg.sender} <span style="font-family:'JetBrains Mono', monospace; font-size:9px; color:rgba(255,255,255,0.4); font-weight:400;">&middot; ${msg.time}</span>
          </div>
          <div style="font-size:13px; color:#fff; line-height:1.4;">${msg.text}</div>
        </div>
      `).join('');
      stream.scrollTop = stream.scrollHeight;
    }
  });

  // Attach Navigation Tab events
  container.querySelector('#tab-marketplace')?.addEventListener('click', () => {
    activeStoreTab = 'marketplace';
    renderCollectiblesStore(container);
  });
  container.querySelector('#tab-my-deck')?.addEventListener('click', () => {
    activeStoreTab = 'deck';
    renderCollectiblesStore(container);
  });
  container.querySelector('#tab-trade-arena')?.addEventListener('click', () => {
    activeStoreTab = 'trade_arena';
    renderCollectiblesStore(container);
  });

  // Empty deck redirect button
  container.querySelector('#btn-goto-marketplace')?.addEventListener('click', () => {
    activeStoreTab = 'marketplace';
    renderCollectiblesStore(container);
  });

  // Put Up Card for Trade Modal events
  const listModal = document.getElementById('list-card-modal');
  const openListBtn = container.querySelector('#btn-open-list-card') || container.querySelector('#btn-empty-list-card');
  openListBtn?.addEventListener('click', () => {
    if (listModal) listModal.style.display = 'flex';
  });
  container.querySelector('#list-modal-close')?.addEventListener('click', () => {
    if (listModal) listModal.style.display = 'none';
  });

  // Submit Trade Listing Handler
  container.querySelector('#trade-submit-btn')?.addEventListener('click', async () => {
    const cardSelect = document.getElementById('trade-select-card');
    const askingInput = document.getElementById('trade-asking-input');
    
    if (cardSelect && askingInput) {
      const cardId = cardSelect.value;
      const card = COLLECTIBLE_CARDS.find(c => c.id === cardId);
      const askingOffer = askingInput.value.trim() || 'Open to all card offers';

      if (card) {
        await createTradeListing({
          cardId: card.id,
          cardName: card.name,
          cardRarity: card.rarity,
          askingOffer
        });
        if (listModal) listModal.style.display = 'none';
        alert(`🎉 Trade Listing Published! Your 3D Card "${card.name}" is now active in the Real-Time Trade Arena!`);
        activeStoreTab = 'trade_arena';
        renderCollectiblesStore(container);
      }
    }
  });

  // Accept Trade Swap click handlers
  container.querySelectorAll('.btn-accept-trade').forEach(btn => {
    btn.addEventListener('click', async () => {
      const listingId = btn.dataset.listingId;
      const seller = btn.dataset.seller;
      
      await acceptTradeListing(listingId);
      addBattleXp(100, `Completed Trade Swap with ${seller}`);
      alert(`🎉 Trade Complete! You successfully swapped cards with ${seller}!`);
      renderCollectiblesStore(container);
    });
  });

  // Attach Top-up modal trigger
  const topupModal = document.getElementById('credit-topup-modal');
  container.querySelector('#btn-topup-credits')?.addEventListener('click', () => {
    if (topupModal) topupModal.style.display = 'flex';
  });
  container.querySelector('#topup-modal-close')?.addEventListener('click', () => {
    if (topupModal) topupModal.style.display = 'none';
  });

  // Credit Pack Purchase click handlers
  container.querySelectorAll('.credit-pack-option').forEach(pack => {
    pack.addEventListener('click', () => {
      const credits = parseInt(pack.dataset.credits);
      const price = pack.dataset.price;
      addStoreCredits(credits, price);
      topupModal.style.display = 'none';
      alert(`💳 Checkout Success! +${credits} Store Credits added to your wallet for $${price} USD!`);
      renderCollectiblesStore(container);
    });
  });

  // Attach Buy Card click events in Universal Marketplace
  container.querySelectorAll('.btn-buy-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardId = btn.dataset.cardId;
      const card = COLLECTIBLE_CARDS.find(c => c.id === cardId);
      if (card) {
        if (buyCollectibleCard(card, () => {
          if (topupModal) topupModal.style.display = 'flex';
        })) {
          activeStoreTab = 'deck'; // Switch to My Deck automatically after purchase!
          renderCollectiblesStore(container);
        }
      }
    });
  });

  // Equip Ability handlers in My Deck
  container.querySelectorAll('.btn-equip-ability').forEach(btn => {
    btn.addEventListener('click', () => {
      const ability = btn.dataset.ability;
      const current = getEquippedAbility();
      if (current === ability) {
        setEquippedAbility(null);
        alert(`Unequipped Ability.`);
      } else {
        setEquippedAbility(ability);
        alert(`⚡ Equipped Special Ability: "${ability}"! This active buff is now applied to all your VWM matches.`);
      }
      renderCollectiblesStore(container);
    });
  });

  // Quick Trade from My Deck
  container.querySelectorAll('.btn-deck-trade').forEach(btn => {
    btn.addEventListener('click', () => {
      if (listModal) listModal.style.display = 'flex';
    });
  });

  // Attach XP Logs Modal event
  const logsModal = document.getElementById('xp-logs-modal');
  container.querySelector('#btn-view-xp-logs')?.addEventListener('click', () => {
    if (logsModal) logsModal.style.display = 'flex';
  });
  container.querySelector('#xp-logs-close')?.addEventListener('click', () => {
    if (logsModal) logsModal.style.display = 'none';
  });

  // Initialize 3D Multi-Layer Card Perspective & LERP Animation Engine
  setupHofCard3dEngine(container);
}

// ── 3D Card LERP & Perspective Calculation Engine ──────────

function setupHofCard3dEngine(container) {
  const angle = 22;

  const lerp = (start, end, amount) => (1 - amount) * start + amount * end;

  const remap = (value, oldMax, newMax) => {
    const newValue = ((value + oldMax) * (newMax * 2)) / (oldMax * 2) - newMax;
    return Math.min(Math.max(newValue, -newMax), newMax);
  };

  const cards = container.querySelectorAll(".hof-card-3d");
  cards.forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const centerX = (rect.left + rect.right) / 2;
      const centerY = (rect.top + rect.bottom) / 2;
      const posX = event.clientX - centerX;
      const posY = event.pageY - centerY;
      const x = remap(posX, rect.width / 2, angle);
      const y = remap(posY, rect.height / 2, angle);
      card.dataset.targetRotateX = x;
      card.dataset.targetRotateY = -y;
    });

    card.addEventListener("mouseleave", () => {
      card.dataset.targetRotateX = 0;
      card.dataset.targetRotateY = 0;
    });
  });

  // 60fps Smooth LERP Update Loop
  const updateLoop = () => {
    cards.forEach((card) => {
      let currentX = parseFloat(card.style.getPropertyValue('--rotateY') || 0);
      let currentY = parseFloat(card.style.getPropertyValue('--rotateX') || 0);
      const targetX = parseFloat(card.dataset.targetRotateX || 0);
      const targetY = parseFloat(card.dataset.targetRotateY || 0);

      const nextX = lerp(currentX, targetX, 0.08);
      const nextY = lerp(currentY, targetY, 0.08);

      card.style.setProperty("--rotateY", nextX.toFixed(2) + "deg");
      card.style.setProperty("--rotateX", nextY.toFixed(2) + "deg");
    });
    activeAnimationId = requestAnimationFrame(updateLoop);
  };

  updateLoop();
}
