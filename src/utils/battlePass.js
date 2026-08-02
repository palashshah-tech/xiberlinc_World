const EQUIPPED_ABILITY_KEY = 'xiberlinc_equipped_ability';

export function getEquippedAbility() {
  return localStorage.getItem(EQUIPPED_ABILITY_KEY) || null;
}

export function setEquippedAbility(ability) {
  if (!ability) {
    localStorage.removeItem(EQUIPPED_ABILITY_KEY);
  } else {
    localStorage.setItem(EQUIPPED_ABILITY_KEY, ability);
  }
}

const SEASON_PASS_KEY = 'xiberlinc_season_pass_owned';
const CREATOR_CHAT_KEY = 'xiberlinc_creator_chat';

export function hasSeasonPass() {
  const currentUserEmail = (auth.currentUser?.email || localStorage.getItem('cogscreen_user_email') || '').toLowerCase().trim();
  if (currentUserEmail === 'palash.shah@xiberlinc.one') return true;
  return localStorage.getItem(SEASON_PASS_KEY) === 'true';
}

export function buySeasonPass() {
  const bp = getBattlePassState();
  if (bp.credits < 1500 && !hasSeasonPass()) {
    return false;
  }
  if (!hasSeasonPass()) {
    bp.credits -= 1500;
    localStorage.setItem(BP_STORAGE_KEY, JSON.stringify(bp));
    localStorage.setItem(SEASON_PASS_KEY, 'true');
    addBattleXp(1000, 'Unlocked Season 1 Premium Creator Pass!');
  }
  return true;
}

const GAMER_CHAT_KEY = 'xiberlinc_gamer_chat';

export function getGamerChatMessages(gamerName = 'Kaito Mizushima') {
  const data = localStorage.getItem(`${GAMER_CHAT_KEY}_${gamerName}`);
  if (data) return JSON.parse(data);
  const initial = [
    { sender: gamerName, text: `Yo! Thanks for unlocking the VIP Pro Pass! My Cowan K capacity is currently 4.85. Ask me anything about VWM strategy or ghost match tactics!`, time: 'System Automated' }
  ];
  localStorage.setItem(`${GAMER_CHAT_KEY}_${gamerName}`, JSON.stringify(initial));
  return initial;
}

export function sendGamerMessage(gamerName, text) {
  const msgs = getGamerChatMessages(gamerName);
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  msgs.push({ sender: 'You', text, time });
  
  localStorage.setItem(`${GAMER_CHAT_KEY}_${gamerName}`, JSON.stringify(msgs));

  // Dynamic replies based on athlete personality
  const replies = {
    'Kaito Mizushima': `GGs! "${text}". Key tip: Lock in the top-left color patch first during the 500ms study window!`,
    'Yuna Sato': `Nice message! "${text}". Executive control is everything — ignore distractors and trust your retention interval!`,
    'Marcus "Prism" Lee': `Awesome! "${text}". Keep running VWM drills in the Focus Chamber, your speed will drop below 180ms in no time!`,
    'Aiko Tanaka': `Hey! "${text}". Pattern recognition improves with consistency. Good luck in the Ghost Matches!`,
    'Yuki Sakai': `Super hyped to chat! "${text}". Let's team up for the next Proving Ground tournament!`
  };

  const replyText = replies[gamerName] || `GGs! Thanks for your message: "${text}". Keep pushing your VWM capacity!`;

  setTimeout(() => {
    const updated = getGamerChatMessages(gamerName);
    updated.push({
      sender: gamerName,
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    localStorage.setItem(`${GAMER_CHAT_KEY}_${gamerName}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('gamer_chat_updated'));
  }, 1100);

  return msgs;
}

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
