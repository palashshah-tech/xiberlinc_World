/* ============================================================
   StoreView.js — The Collectibles Store & Real-Time Trade Arena
   3D Tokenized Action Cards of Working Memory Athletes
   With Real-Money Credit Top-Up Checkout & Network Trade Arena
   ============================================================ */

import { getBattlePassState, getOwnedCards, buyCollectibleCard, getXpLogs, addStoreCredits, addBattleXp } from '../utils/battlePass.js';
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
    tokenId: '#001 / 100 MINT',
    kCapacity: 4.85,
    speedMs: 178,
    alphaSuppression: 0.97,
    tier: 'S+',
    price: 500,
    bgGradient: 'linear-gradient(135deg, rgba(251,191,36,0.25) 0%, rgba(124,58,237,0.4) 100%)',
    ability: '7-Chain VWM Recall Boost',
  },
  {
    id: 'card_yuna_cyber',
    name: 'Yuna Sato',
    handle: '@yuna.sync',
    title: 'Queen of Executive Control',
    rarity: 'Cyber Volt',
    rarityColor: '#d4ff00',
    tokenId: '#002 / 250 MINT',
    kCapacity: 4.70,
    speedMs: 182,
    alphaSuppression: 0.95,
    tier: 'S+',
    price: 400,
    bgGradient: 'linear-gradient(135deg, rgba(212,255,0,0.25) 0%, rgba(37,99,235,0.4) 100%)',
    ability: 'Executive Control Gating',
  },
  {
    id: 'card_marcus_diamond',
    name: 'Marcus "Prism" Lee',
    handle: '@prism.gg',
    title: 'Distractor Shield Master',
    rarity: 'Diamond Prism',
    rarityColor: '#06b6d4',
    tokenId: '#003 / 500 MINT',
    kCapacity: 4.52,
    speedMs: 191,
    alphaSuppression: 0.91,
    tier: 'S',
    price: 350,
    bgGradient: 'linear-gradient(135deg, rgba(6,182,212,0.25) 0%, rgba(236,72,153,0.4) 100%)',
    ability: 'Visual Noise Suppression',
  },
  {
    id: 'card_aiko_holo',
    name: 'Aiko Tanaka',
    handle: '@aiko.flux',
    title: 'Pattern Recognition Specialist',
    rarity: 'Holo Rare',
    rarityColor: '#ec4899',
    tokenId: '#004 / 500 MINT',
    kCapacity: 4.40,
    speedMs: 195,
    alphaSuppression: 0.89,
    tier: 'S',
    price: 300,
    bgGradient: 'linear-gradient(135deg, rgba(236,72,153,0.25) 0%, rgba(124,58,237,0.4) 100%)',
    ability: 'Pattern Intuition Field',
  },
  {
    id: 'card_yuki_rookie',
    name: 'Yuki Sakai',
    handle: '@yuki.fps',
    title: 'Cognitive Proving Ground Rookie',
    rarity: 'Genesis Edition',
    rarityColor: '#a78bfa',
    tokenId: '#005 / 1000 MINT',
    kCapacity: 4.12,
    speedMs: 210,
    alphaSuppression: 0.86,
    tier: 'A',
    price: 200,
    bgGradient: 'linear-gradient(135deg, rgba(167,139,250,0.25) 0%, rgba(13,13,20,0.8) 100%)',
    ability: 'Alethemy Neural Link',
  }
];

let activeStoreTab = 'store'; // 'store' | 'trade_arena'

export async function renderCollectiblesStore(container) {
  if (!container) return;

  const bp = getBattlePassState();
  const owned = getOwnedCards();
  const logs = getXpLogs();
  const currentUserEmail = (auth.currentUser?.email || localStorage.getItem('cogscreen_user_email') || '').toLowerCase().trim();
  const isAdminTest = currentUserEmail === 'palash.shah@xiberlinc.one';

  // Fetch live network trade listings
  const tradeListings = await fetchActiveTradeListings();

  container.innerHTML = `
    <div class="scroll-reveal" style="max-width: 1380px; margin: 0 auto; padding: 40px 24px;">
      
      <!-- Store Header Banner -->
      <div style="
        background: linear-gradient(135deg, rgba(13, 13, 20, 0.95) 0%, rgba(124, 58, 237, 0.2) 100%);
        border: 1px solid rgba(212, 255, 0, 0.35); border-radius: 24px; padding: 28px 36px;
        margin-bottom: 28px; display: flex; align-items: center; justify-content: space-between;
        gap: 24px; flex-wrap: wrap; box-shadow: 0 16px 48px rgba(0,0,0,0.6);
      ">
        <div>
          <div style="font-family:'Space Grotesk', sans-serif; font-size:11px; color:#d4ff00; letter-spacing:0.18em; text-transform:uppercase;">
            💎 THE COLLECTIBLES STORE &amp; TRADE ARENA
          </div>
          <h1 style="font-family:'Outfit', sans-serif; font-size:32px; font-weight:900; color:#fff; margin:6px 0;">
            Working Memory Athlete Cards
          </h1>
          <div style="font-size:13.5px; color:rgba(255,255,255,0.6); max-width:600px; line-height:1.5;">
            Collect, trade, and showcase 3D tokenized cognitive cards featuring verified Cowan's K capacity &amp; reaction telemetry of top athletes.
          </div>
          ${isAdminTest ? `
            <div style="margin-top:10px; font-family:'JetBrains Mono', monospace; font-size:11px; color:#d4ff00; background:rgba(212,255,0,0.1); border:1px solid rgba(212,255,0,0.3); padding:4px 12px; border-radius:6px; display:inline-block;">
              👑 Master Admin Test Account Active (palash.shah@xiberlinc.one) &middot; Unlimited Test Credits Enabled
            </div>
          ` : ''}
        </div>

        <!-- Store User Wallet & Credit Top-Up Buttons -->
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <div style="
            background: rgba(0,0,0,0.6); border: 1px solid rgba(212,255,0,0.4);
            border-radius: 14px; padding: 10px 18px; text-align: right;
            display: flex; align-items: center; gap: 14px;
          ">
            <div>
              <div style="font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5); text-transform:uppercase;">Store Credits</div>
              <div id="store-user-credits" style="font-family:'Outfit', sans-serif; font-weight:900; font-size:22px; color:#d4ff00;">
                ${bp.credits.toLocaleString()} CR
              </div>
            </div>

            <button id="btn-topup-credits" style="
              background: #d4ff00; color: #000; font-family: 'Space Grotesk', sans-serif;
              font-weight: 800; font-size: 11.5px; border: none; padding: 8px 14px;
              border-radius: 8px; cursor: pointer; text-transform: uppercase; white-space: nowrap;
            ">
              + Buy Credits ($)
            </button>
          </div>

          <button id="btn-view-xp-logs" style="
            background: rgba(124,58,237,0.2); border: 1px solid rgba(167,139,250,0.4);
            color: #a78bfa; font-family: 'Space Grotesk', sans-serif; font-weight: 700;
            font-size: 12.5px; padding: 14px 20px; border-radius: 14px; cursor: pointer;
            transition: all 0.2s; white-space: nowrap;
          ">
            📜 XP Activity Logs
          </button>
        </div>
      </div>

      <!-- Navigation Tab Selector (Store vs Trade Arena) -->
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom: 28px;">
        <div style="
          display: flex; gap: 6px; background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 4px;
        ">
          <button id="tab-store-main" style="
            font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 12.5px;
            padding: 10px 24px; border-radius: 8px; border: none; cursor: pointer;
            background: ${activeStoreTab === 'store' ? '#d4ff00' : 'transparent'};
            color: ${activeStoreTab === 'store' ? '#000' : 'rgba(255,255,255,0.7)'};
            text-transform: uppercase; transition: all 0.2s;
          ">
            💎 Collectibles Store
          </button>

          <button id="tab-trade-arena" style="
            font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 12.5px;
            padding: 10px 24px; border-radius: 8px; border: none; cursor: pointer;
            background: ${activeStoreTab === 'trade_arena' ? '#d4ff00' : 'transparent'};
            color: ${activeStoreTab === 'trade_arena' ? '#000' : 'rgba(255,255,255,0.7)'};
            text-transform: uppercase; transition: all 0.2s;
          ">
            🤝 Real-Time Trade Arena (${tradeListings.length})
          </button>
        </div>

        ${activeStoreTab === 'trade_arena' ? `
          <button id="btn-open-list-card" style="
            background: rgba(212,255,0,0.15); border: 1px solid rgba(212,255,0,0.4);
            color: #d4ff00; font-family: 'Space Grotesk', sans-serif; font-weight: 700;
            font-size: 12.5px; padding: 10px 20px; border-radius: 10px; cursor: pointer;
          ">
            + Put Up Card for Trade
          </button>
        ` : ''}
      </div>

      <!-- MAIN STORE CONTENT -->
      ${activeStoreTab === 'store' ? `
        <!-- 3D Collectible Cards Grid -->
        <div style="
          display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 28px; margin-bottom: 48px;
        ">
          ${COLLECTIBLE_CARDS.map(card => {
            const isOwned = owned.includes(card.id);

            return `
              <div class="card-3d-wrapper" style="perspective: 1000px;">
                <div class="card-3d-inner" style="
                  background: ${card.bgGradient};
                  border: 1px solid ${card.rarityColor}55;
                  border-radius: 20px; padding: 24px; position: relative; overflow: hidden;
                  box-shadow: 0 16px 40px rgba(0,0,0,0.5), 0 0 25px ${card.rarityColor}18;
                  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
                  transform-style: preserve-3d; cursor: pointer;
                " onmousemove="
                  const r = this.getBoundingClientRect();
                  const x = e.clientX - r.left - r.width/2;
                  const y = e.clientY - r.top - r.height/2;
                  this.style.transform = \`rotateY(\${x/14}deg) rotateX(\${-y/14}deg) translateY(-6px)\`;
                " onmouseleave="this.style.transform='rotateY(0deg) rotateX(0deg) translateY(0px)'">
                  
                  <!-- Holographic Shimmer Foil Overlay -->
                  <div style="
                    position: absolute; inset: 0;
                    background: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.05) 100%);
                    pointer-events: none; border-radius: 20px;
                  "></div>

                  <!-- Token Serial & Rarity Badge -->
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; position:relative; z-index:2;">
                    <span style="
                      font-family: 'Space Grotesk', sans-serif; font-size: 10px; font-weight: 800;
                      color: ${card.rarityColor}; background: ${card.rarityColor}18;
                      border: 1px solid ${card.rarityColor}44; padding: 4px 10px; border-radius: 100px;
                      text-transform: uppercase; letter-spacing: 0.1em;
                    ">
                      ${card.rarity}
                    </span>
                    <span style="font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.5);">
                      ${card.tokenId}
                    </span>
                  </div>

                  <!-- Athlete Profile Image / Token Badge -->
                  <div style="text-align:center; margin:16px 0 20px; position:relative; z-index:2;">
                    <div style="
                      width: 72px; height: 72px; border-radius: 50%;
                      background: rgba(0,0,0,0.5); border: 2.5px solid ${card.rarityColor};
                      display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
                      font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.8rem; color: ${card.rarityColor};
                      box-shadow: 0 0 30px ${card.rarityColor}44;
                    ">
                      ${card.name[0]}
                    </div>
                    <h3 style="font-family:'Outfit', sans-serif; font-weight:800; font-size:20px; color:#fff; margin:0 0 2px 0;">
                      ${card.name}
                    </h3>
                    <div style="font-family:'JetBrains Mono', monospace; font-size:11px; color:rgba(255,255,255,0.5);">
                      ${card.handle} &middot; ${card.title}
                    </div>
                  </div>

                  <!-- Telemetry Stats Panel -->
                  <div style="
                    background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 12px; padding: 14px; margin-bottom: 20px; position:relative; z-index:2;
                  ">
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; text-align:center;">
                      <div>
                        <div style="font-family:'JetBrains Mono', monospace; font-size:8px; color:rgba(255,255,255,0.4);">COWAN K</div>
                        <div style="font-family:'Outfit', sans-serif; font-weight:800; font-size:15px; color:#d4ff00;">${card.kCapacity}</div>
                      </div>
                      <div>
                        <div style="font-family:'JetBrains Mono', monospace; font-size:8px; color:rgba(255,255,255,0.4);">RT SPEED</div>
                        <div style="font-family:'Outfit', sans-serif; font-weight:800; font-size:15px; color:#00f0ff;">${card.speedMs}ms</div>
                      </div>
                      <div>
                        <div style="font-family:'JetBrains Mono', monospace; font-size:8px; color:rgba(255,255,255,0.4);">SUPPRESSION</div>
                        <div style="font-family:'Outfit', sans-serif; font-weight:800; font-size:15px; color:#34d399;">${card.alphaSuppression}</div>
                      </div>
                    </div>
                    <div style="margin-top:10px; padding-top:8px; border-top:1px dashed rgba(255,255,255,0.1); font-family:'JetBrains Mono', monospace; font-size:9.5px; color:rgba(255,255,255,0.6); text-align:center;">
                      ⚡ Ability: <strong style="color:#fff;">${card.ability}</strong>
                    </div>
                  </div>

                  <!-- Action Button Row -->
                  <div style="display:grid; grid-template-columns: 1fr; gap:10px; position:relative; z-index:2;">
                    <button class="btn-buy-card" data-card-id="${card.id}" style="
                      padding: 12px; border-radius: 8px; border: none;
                      background: ${isOwned ? 'rgba(52,211,153,0.2)' : '#d4ff00'};
                      color: ${isOwned ? '#34d399' : '#000'};
                      border: 1px solid ${isOwned ? '#34d399' : 'transparent'};
                      font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 12px;
                      cursor: pointer; text-transform: uppercase;
                    ">
                      ${isOwned ? '✓ IN MY DECK' : `BUY (${card.price} CR)`}
                    </button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <!-- REAL-TIME TRADE ARENA CONTENT -->
        <div style="margin-bottom: 48px;">
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
      `}
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
            <label style="display:block; font-family:'JetBrains Mono', monospace; font-size:10px; color:rgba(255,255,255,0.5); text-transform:uppercase; margin-bottom:6px;">Select Card to Offer</label>
            <select id="trade-select-card" style="
              width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15);
              border-radius: 8px; padding: 12px; color: #fff; font-family: 'Space Grotesk', sans-serif; font-size: 13px; outline: none;
            ">
              ${COLLECTIBLE_CARDS.map(c => `
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

  // Attach Navigation Tab events
  container.querySelector('#tab-store-main')?.addEventListener('click', () => {
    activeStoreTab = 'store';
    renderCollectiblesStore(container);
  });
  container.querySelector('#tab-trade-arena')?.addEventListener('click', () => {
    activeStoreTab = 'trade_arena';
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

  // Attach Buy Card click events
  container.querySelectorAll('.btn-buy-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardId = btn.dataset.cardId;
      const card = COLLECTIBLE_CARDS.find(c => c.id === cardId);
      if (card) {
        buyCollectibleCard(card, (insufficientCard) => {
          if (topupModal) topupModal.style.display = 'flex';
        });
        renderCollectiblesStore(container);
      }
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
}
