/* ============================================================
   battlePass.js — Season 1 Battle Pass & Collectibles Manager
   Handles XP progression, victory logs, and 3D Tokenized Card transactions
   ============================================================ */

import { auth } from './firebase.js';

const BP_STORAGE_KEY = 'xiberlinc_battle_pass';
const LOGS_STORAGE_KEY = 'xiberlinc_xp_logs';
const CARDS_STORAGE_KEY = 'xiberlinc_owned_cards';

export function getBattlePassState() {
  const currentUserEmail = (auth.currentUser?.email || localStorage.getItem('cogscreen_user_email') || '').toLowerCase().trim();
  const isAdminTest = currentUserEmail === 'palash.shah@xiberlinc.one';

  const data = localStorage.getItem(BP_STORAGE_KEY);
  let state;
  if (data) {
    state = JSON.parse(data);
  } else {
    state = {
      level: 1,
      xp: 0,
      maxXp: 5000,
      vipTicketActive: true,
      credits: 0, // DEFAULT 0 CR for everyone — credits are purchased with real money
    };
  }

  // Admin Exception for palash.shah@xiberlinc.one
  if (isAdminTest) {
    state.credits = 99999;
  }

  localStorage.setItem(BP_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function getXpLogs() {
  const logs = localStorage.getItem(LOGS_STORAGE_KEY);
  if (logs) {
    return JSON.parse(logs);
  }
  const initialLogs = [
    { id: 'l_1', title: 'Ghost Match Victory vs Marcus "Prism" Lee', xp: 250, date: 'Just now' },
    { id: 'l_2', title: 'Daily Focus Chamber Drill Completed', xp: 150, date: '2 hours ago' }
  ];
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(initialLogs));
  return initialLogs;
}

export function addBattleXp(amount, title = 'Ghost Match Victory') {
  const bp = getBattlePassState();
  bp.xp += amount;
  // NOTE: Store credits are strictly purchased with real money, NOT earned for free!

  let leveledUp = false;
  while (bp.xp >= bp.maxXp) {
    bp.xp -= bp.maxXp;
    bp.level += 1;
    leveledUp = true;
  }

  localStorage.setItem(BP_STORAGE_KEY, JSON.stringify(bp));

  // Add Log Entry
  const logs = getXpLogs();
  logs.unshift({
    id: `l_${Date.now()}`,
    title,
    xp: amount,
    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 20)));

  // Live UI Updates across all open elements
  updateBattlePassUi(bp, leveledUp);
  return { bp, leveledUp };
}

export function addStoreCredits(amount, dollarPrice) {
  const bp = getBattlePassState();
  bp.credits += amount;
  localStorage.setItem(BP_STORAGE_KEY, JSON.stringify(bp));

  const logs = getXpLogs();
  logs.unshift({
    id: `l_${Date.now()}`,
    title: `Purchased +${amount} Store Credits ($${dollarPrice} USD)`,
    xp: 0,
    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs.slice(0, 20)));

  updateBattlePassUi(bp);
  return bp.credits;
}

export function updateBattlePassUi(bp = getBattlePassState(), leveledUp = false) {
  const levelEl = document.getElementById('bp-level-badge');
  const xpEl = document.getElementById('bp-xp-text');
  const barEl = document.getElementById('bp-progress-fill');
  const creditEl = document.getElementById('store-user-credits');

  if (levelEl) levelEl.textContent = `Tier ${bp.level} / 50`;
  if (xpEl) xpEl.textContent = `XP: ${bp.xp.toLocaleString()} / ${bp.maxXp.toLocaleString()}`;
  if (barEl) barEl.style.width = `${Math.min(100, (bp.xp / bp.maxXp) * 100)}%`;
  if (creditEl) creditEl.textContent = `${bp.credits.toLocaleString()} CR`;

  if (leveledUp) {
    showLevelUpToast(bp.level);
  }
}

function showLevelUpToast(level) {
  let toast = document.getElementById('level-up-toast');
  if (toast) toast.remove();

  toast = document.createElement('div');
  toast.id = 'level-up-toast';
  toast.style.cssText = `
    position: fixed; top: 80px; right: 28px; z-index: 99999;
    background: linear-gradient(135deg, rgba(212, 255, 0, 0.95), rgba(124, 58, 237, 0.95));
    color: #000; padding: 14px 24px; border-radius: 14px;
    font-family: 'Outfit', sans-serif; font-weight: 800; font-size: 15px;
    box-shadow: 0 14px 40px rgba(0,0,0,0.6), 0 0 30px rgba(212,255,0,0.4);
    animation: fade-down 0.4s ease-out;
  `;
  toast.innerHTML = `🎉 LEVEL UP! You reached Season 1 Pass Tier ${level}!`;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3500);
}

// ── Collectibles Inventory Manager ─────────────────────────

export function getOwnedCards() {
  const cards = localStorage.getItem(CARDS_STORAGE_KEY);
  if (cards) {
    return JSON.parse(cards);
  }
  const initialOwned = []; // Empty inventory by default
  localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(initialOwned));
  return initialOwned;
}

export function buyCollectibleCard(card, onInsufficientCredits) {
  const bp = getBattlePassState();
  if (bp.credits < card.price) {
    if (onInsufficientCredits) {
      onInsufficientCredits(card);
    } else {
      alert(`Insufficient Credits! You need ${card.price} CR (You have ${bp.credits} CR). Click "+ Buy Credits" to top up with real money!`);
    }
    return false;
  }

  bp.credits -= card.price;
  localStorage.setItem(BP_STORAGE_KEY, JSON.stringify(bp));

  const owned = getOwnedCards();
  if (!owned.includes(card.id)) {
    owned.push(card.id);
    localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(owned));
  }

  updateBattlePassUi(bp);
  addBattleXp(100, `Purchased 3D Card: ${card.name}`);
  alert(`🎉 Success! You purchased 3D Tokenized Card "${card.name}" [Token #${card.tokenId}]!`);
  return true;
}
