/* ============================================================
   StoreView.js — The Collectibles Store
   3D Tokenized Action Cards of Working Memory Athletes
   ============================================================ */

import { getBattlePassState, getOwnedCards, buyCollectibleCard, getXpLogs } from '../utils/battlePass.js';

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

export function renderCollectiblesStore(container) {
  if (!container) return;

  const bp = getBattlePassState();
  const owned = getOwnedCards();
  const logs = getXpLogs();

  container.innerHTML = `
    <div class="scroll-reveal" style="max-width: 1380px; margin: 0 auto; padding: 40px 24px;">
      
      <!-- Store Header Banner -->
      <div style="
        background: linear-gradient(135deg, rgba(13, 13, 20, 0.95) 0%, rgba(124, 58, 237, 0.2) 100%);
        border: 1px solid rgba(212, 255, 0, 0.35); border-radius: 24px; padding: 28px 36px;
        margin-bottom: 36px; display: flex; align-items: center; justify-content: space-between;
        gap: 24px; flex-wrap: wrap; box-shadow: 0 16px 48px rgba(0,0,0,0.6);
      ">
        <div>
          <div style="font-family:'Space Grotesk', sans-serif; font-size:11px; color:#d4ff00; letter-spacing:0.18em; text-transform:uppercase;">
            💎 THE COLLECTIBLES STORE &middot; 3D TOKENIZED ACTION CARDS
          </div>
          <h1 style="font-family:'Outfit', sans-serif; font-size:32px; font-weight:900; color:#fff; margin:6px 0;">
            Working Memory Athlete Cards
          </h1>
          <div style="font-size:13.5px; color:rgba(255,255,255,0.6); max-width:600px; line-height:1.5;">
            Collect, trade, and showcase 3D tokenized cognitive cards featuring verified Cowan's K capacity &amp; reaction telemetry of top athletes.
          </div>
        </div>

        <!-- Store User Wallet & XP Logs Modal Button -->
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
          <div style="
            background: rgba(0,0,0,0.6); border: 1px solid rgba(212,255,0,0.4);
            border-radius: 14px; padding: 12px 20px; text-align: right;
          ">
            <div style="font-family:'JetBrains Mono', monospace; font-size:10px; color:rgba(255,255,255,0.5); text-transform:uppercase;">Store Credits</div>
            <div id="store-user-credits" style="font-family:'Outfit', sans-serif; font-weight:900; font-size:22px; color:#d4ff00;">
              ${bp.credits.toLocaleString()} CR
            </div>
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
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; position:relative; z-index:2;">
                  <button class="btn-buy-card" data-card-id="${card.id}" style="
                    padding: 10px; border-radius: 8px; border: none;
                    background: ${isOwned ? 'rgba(52,211,153,0.2)' : '#d4ff00'};
                    color: ${isOwned ? '#34d399' : '#000'};
                    border: 1px solid ${isOwned ? '#34d399' : 'transparent'};
                    font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 11.5px;
                    cursor: pointer; text-transform: uppercase;
                  ">
                    ${isOwned ? '✓ OWNED' : `BUY (${card.price} CR)`}
                  </button>

                  <button class="btn-trade-card" data-card-name="${card.name}" style="
                    padding: 10px; border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06);
                    color: #fff; font-family: 'Space Grotesk', sans-serif; font-weight: 700;
                    font-size: 11.5px; cursor: pointer; text-transform: uppercase;
                  ">
                    🤝 Trade
                  </button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <!-- XP Activity Logs Modal Overlay -->
    <div id="xp-logs-modal" style="
      display: none; fixed: true; position: fixed; inset: 0; z-index: 10000;
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
                +${log.xp} XP
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Attach Buy Card click events
  container.querySelectorAll('.btn-buy-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardId = btn.dataset.cardId;
      const card = COLLECTIBLE_CARDS.find(c => c.id === cardId);
      if (card) {
        if (buyCollectibleCard(card)) {
          renderCollectiblesStore(container);
        }
      }
    });
  });

  // Attach Trade Card click events
  container.querySelectorAll('.btn-trade-card').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardName = btn.dataset.cardName;
      alert(`🤝 Trade Request Initialized for "${cardName}"! Select an online candidate in the Social Graph to offer a swap.`);
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
