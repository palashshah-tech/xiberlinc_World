/* ============================================================
   RoomView — Dedicated full-screen splitscreen chatroom cockpit
   With targeted mini neuro games that affect cognitive states.
   ============================================================ */

import { render } from '../utils/dom.js';
import { navigate, injectStyle } from '../router.js';
import { auth, db } from '../utils/firebase.js';
import { fetchUserProfile } from '../utils/worldData.js';
import { NEURO_ROOMS } from '../utils/worldStatic.js';
import { 
  collection, addDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp 
} from 'firebase/firestore';

export async function RoomView(params = {}) {
  const roomId = params.roomId || 'room_1';
  const room = NEURO_ROOMS.find(r => r.id === roomId) || NEURO_ROOMS[0];

  // Fetch user profile scores for badging
  let userProfile = [];
  if (auth.currentUser?.email) {
    try {
      userProfile = await fetchUserProfile(auth.currentUser.email);
    } catch(e) {}
  }
  const userScore = userProfile && userProfile[0] ? Math.round(userProfile[0].score) : null;
  const userRank = userProfile && userProfile[0] ? getRankFromScore(userProfile[0].score).rank : 'Guest';

  // Inject CSS animations & game styling
  injectStyle(`
    @keyframes wld-pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.2);opacity:0} }
    @keyframes wld-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes wld-reaction-float {
      0% { transform: translateY(0) scale(0.8) rotate(0deg); opacity: 1; }
      100% { transform: translateY(-320px) scale(1.5) rotate(var(--rot)); opacity: 0; }
    }
    .wld-fade-up { animation: wld-fade-up-anim 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    @keyframes wld-fade-up-anim { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    .cockpit-tab-btn {
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.5); font-family: 'Space Grotesk', sans-serif;
      padding: 10px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s;
      font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
    }
    .cockpit-tab-btn.active {
      background: ${room.colorHex}15; border-color: ${room.colorHex}; color: #fff;
      box-shadow: 0 4px 15px ${room.colorHex}22;
    }
    .cockpit-panel-card {
      background: rgba(13,13,16,0.65); border: 1px solid rgba(255,255,255,0.05);
      border-radius: 16px; padding: 24px; backdrop-filter: blur(20px);
    }
    /* Scrollbar */
    #wld-chat-messages::-webkit-scrollbar { width: 6px; }
    #wld-chat-messages::-webkit-scrollbar-track { background: transparent; }
    #wld-chat-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
  `);

  // Render the full screen layouts
  render(`
    <div style="position:fixed; inset:0; z-index:9000; background:#050508; color:#fff; display:flex; flex-direction:column; font-family:'Space Grotesk',sans-serif; overflow:hidden;">
      
      <!-- TOP NAV COCKPIT HEADER -->
      <header style="padding:16px 28px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(8,8,12,0.8); backdrop-filter:blur(20px); display:flex; align-items:center; justify-content:space-between; z-index:100;">
        <div style="display:flex; align-items:center; gap:14px;">
          <button id="room-back-btn" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:#fff; cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.08)';" onmouseleave="this.style.background='rgba(255,255,255,0.04)';">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.3rem;">${room.vibe}</span>
              <span style="font-family:'Instrument Serif',serif; font-style:italic; font-size:1.6rem; text-transform:uppercase; color:#fff; letter-spacing:0.02em;">${room.name}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
              <div style="width:6px; height:6px; border-radius:50%; background:${room.colorHex}; position:relative;">
                <div style="position:absolute; inset:-3px; border-radius:50%; border:1px solid ${room.colorHex}; animation:wld-pulse-ring 1.5s ease-out infinite;"></div>
              </div>
              <span style="font-family:'JetBrains Mono',monospace; font-size:9.5px; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.06em;">COGNITIVE state training grounds · ${room.online} active channels</span>
            </div>
          </div>
        </div>
        
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="text-align:right;">
            <div style="font-size:10px; font-family:'JetBrains Mono',monospace; color:rgba(255,255,255,0.3); text-transform:uppercase;">Identity Node</div>
            <div style="font-size:12.5px; font-weight:700; color:${room.colorHex};">@${(auth.currentUser?.email || 'player').split('@')[0]}</div>
          </div>
          ${auth.currentUser?.photoURL 
            ? `<img src="${auth.currentUser.photoURL}" style="width:36px; height:36px; border-radius:50%; border:1.5px solid ${room.colorHex};" />`
            : `<div style="width:36px; height:36px; border-radius:50%; background:${room.colorHex}22; border:1.5px solid ${room.colorHex}; display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:700; color:${room.colorHex};">${(auth.currentUser?.displayName || 'P')[0].toUpperCase()}</div>`
          }
        </div>
      </header>

      <!-- SPLITSCREEN LAYOUT CONTAINER -->
      <div style="flex:1; display:flex; overflow:hidden;">
        
        <!-- LEFT COLUMN: LIVE CHAT STREAM -->
        <div style="width:480px; border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; background:rgba(8,8,11,0.45); flex-shrink:0;">
          
          <!-- Active Logs Horizontal Header -->
          <div id="wld-chat-users" style="padding:12px 20px; border-bottom:1px solid rgba(255,255,255,0.04); background:rgba(5,5,8,0.3); display:flex; align-items:center; gap:8px; overflow-x:auto; flex-shrink:0;">
            <span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.05em; flex-shrink:0;">active logs:</span>
          </div>

          <!-- Scrolling Message timeline -->
          <div id="wld-chat-messages" style="flex:1; padding:24px 20px; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
            <div style="font-family:'JetBrains Mono',monospace; font-size:9.5px; color:#2563eb; line-height:1.5; padding:10px 14px; background:rgba(37,99,235,0.05); border:1px solid rgba(37,99,235,0.12); border-radius:8px; margin-bottom:8px;">
              <div>SYS_WS: Established socket pipe to neuro room nodes.</div>
              <div>SYS_LINK: Identity authenticated for candidate: ${auth.currentUser?.email || 'unknown'}</div>
            </div>
            
            <div id="chat-messages-container" style="display:flex; flex-direction:column; gap:14px;">
              <div style="text-align:center; padding:20px; color:rgba(255,255,255,0.2); font-size:11px;">Syncing websocket streams...</div>
            </div>
          </div>

          <!-- Floating Reaction Area Overlay -->
          <div id="reactions-float-area" style="position:absolute; bottom:140px; left:300px; width:100px; height:240px; pointer-events:none; overflow:hidden; z-index:9300;"></div>

          <!-- Reactions Emoji Selector -->
          <div style="padding:10px 20px; background:rgba(10,10,12,0.4); border-top:1px solid rgba(255,255,255,0.04); display:flex; align-items:center; gap:8px; flex-shrink:0;">
            <span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.25); text-transform:uppercase; letter-spacing:0.05em; margin-right:4px;">REACTION:</span>
            <div style="display:flex; gap:6px;">
              ${['🔥', '🧠', '⚡', '👑', '🎯'].map(emoji => `
                <button class="chat-react-btn" data-emoji="${emoji}" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:14px; cursor:pointer; transition:all 0.15s;" onmouseenter="this.style.background='rgba(255,255,255,0.1)';this.style.transform='scale(1.15)';" onmouseleave="this.style.background='rgba(255,255,255,0.03)';this.style.transform='';">${emoji}</button>
              `).join('')}
            </div>
          </div>

          <!-- Message input console -->
          <div style="padding:16px 20px; border-top:1px solid rgba(255,255,255,0.08); background:rgba(10,10,12,0.9); display:flex; align-items:center; gap:10px; flex-shrink:0;">
            <input type="text" id="chat-input" placeholder="Transmit telemetry..." style="flex:1; background:#000; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:12px 16px; color:#fff; font-family:'Space Grotesk',sans-serif; font-size:12.5px; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='${room.colorHex}'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'" />
            <button id="chat-send-btn" style="background:${room.colorHex}; color:#fff; border:none; border-radius:10px; width:42px; height:42px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 12px ${room.colorHex}33;" onmouseenter="this.style.transform='scale(1.05)';" onmouseleave="this.style.transform='';">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>

        </div>

        <!-- RIGHT COLUMN: INTERACTIVE ROOM DECK -->
        <main style="flex:1; padding:32px; overflow-y:auto; background:#07070a; display:flex; flex-direction:column; gap:24px;">
          
          <div style="display:flex; align-items:center; justify-content:between; border-bottom:1px solid rgba(255,255,255,0.05); padding-bottom:16px;">
            <div>
              <div style="font-family:'JetBrains Mono',monospace; font-size:9.5px; text-transform:uppercase; letter-spacing:0.18em; color:${room.colorHex}; margin-bottom:4px;">interactive cockpit</div>
              <h2 style="font-family:'Outfit',sans-serif; font-weight:800; font-size:1.6rem; color:#fff;">Neuro Game Center</h2>
            </div>
          </div>

          <!-- COCKPIT CONTROL CENTRE DYNAMIC WORKSPACE -->
          <div id="cockpit-workspace" class="wld-fade-up">
            <!-- Dynamically populated by room features -->
          </div>

        </main>

      </div>

    </div>
  `);

  // Hook back button to router world
  document.getElementById('room-back-btn')?.addEventListener('click', () => {
    if (window._roomChatUnsubscribe) {
      window._roomChatUnsubscribe();
      window._roomChatUnsubscribe = null;
    }
    navigate('world');
  });

  // Setup Chat real-time streams
  _initChatTelemetry(room, userScore, userRank);

  // Setup Cockpit Activities
  _initCockpitActivity(room);
}

/* ════════════════════════════════════════════════════════════
   FIRESTORE REAL-TIME CHAT TELEMETRY LOGS
   ════════════════════════════════════════════════════════════ */
function _initChatTelemetry(room, userScore, userRank) {
  const container = document.getElementById('chat-messages-container');
  const scrollArea = document.getElementById('wld-chat-messages');

  const q = query(
    collection(db, 'chatroom_messages'),
    orderBy('createdAt', 'desc'),
    limit(150)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const allMessages = [];
    snapshot.forEach(doc => {
      allMessages.push({ id: doc.id, ...doc.data() });
    });

    const rawMessages = allMessages
      .filter(m => m.roomId === room.id)
      .reverse()
      .slice(-50);

    const activeUserMap = new Map();
    rawMessages.forEach(m => {
      if (m.senderName && m.senderHandle) {
        activeUserMap.set(m.senderHandle, {
          name: m.senderName,
          photo: m.senderPhoto,
          color: m.senderPhoto ? null : '#7c3aed'
        });
      }
    });

    const activeUserHTML = Array.from(activeUserMap.entries()).slice(0, 5).map(([handle, info]) => {
      return `
        <div style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:3px 8px; border-radius:20px; flex-shrink:0;">
          ${info.photo 
            ? `<img src="${info.photo}" style="width:14px; height:14px; border-radius:50%; border:1.2px solid ${room.colorHex};" />`
            : `<div style="width:14px; height:14px; border-radius:50%; background:${room.colorHex}22; border:1px solid ${room.colorHex}; display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:700; font-size:0.45rem; color:${room.colorHex};">${(info.name || 'P')[0].toUpperCase()}</div>`
          }
          <span style="font-family:'Space Grotesk',sans-serif; font-size:9.5px; color:rgba(255,255,255,0.7);">${handle}</span>
        </div>
      `;
    }).join('');

    const usersBar = document.getElementById('wld-chat-users');
    if (usersBar) {
      usersBar.innerHTML = `<span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.05em; flex-shrink:0; margin-right:4px;">active logs:</span>` + activeUserHTML;
    }

    if (rawMessages.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px 20px; color:rgba(255,255,255,0.2); font-size:11px; font-style:italic;">
          No telemetric packages received. Send a message to initialize feed stream.
        </div>
      `;
    } else {
      let html = '';
      rawMessages.forEach(msg => {
        if (msg.type === 'reaction') {
          _spawnFloatingReaction(msg.content);
          return;
        }

        const isMe = msg.senderEmail === auth.currentUser?.email;
        const timeStr = msg.createdAt 
          ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
          : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const badgeCol = msg.senderRank === 'Legend' ? '#7c3aed' : msg.senderRank === 'Master' ? '#d4ff00' : msg.senderRank === 'Diamond' ? '#2563eb' : 'rgba(255,255,255,0.3)';
        const scoreBadge = msg.senderScore 
          ? `<span style="font-family:'JetBrains Mono',monospace; font-size:8.5px; padding:1px 5px; border-radius:3px; background:${badgeCol}14; border:1px solid ${badgeCol}33; color:${badgeCol}; vertical-align:middle; margin-left:4px; font-weight:700;">WMI ${msg.senderScore}</span>` 
          : `<span style="font-family:'JetBrains Mono',monospace; font-size:8.5px; padding:1px 5px; border-radius:3px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.3); vertical-align:middle; margin-left:4px;">GUEST</span>`;

        html += `
          <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; gap:4px; max-width:85%; align-self:${isMe ? 'flex-end' : 'flex-start'};">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-family:'Space Grotesk',sans-serif; font-size:11px; font-weight:700; color:${isMe ? room.colorHex : 'rgba(255,255,255,0.7)'};">${msg.senderHandle}</span>
              ${scoreBadge}
              <span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.2);">${timeStr}</span>
            </div>
            <div style="
              background:${isMe ? `${room.colorHex}15` : 'rgba(255,255,255,0.04)'};
              border:1px solid ${isMe ? `${room.colorHex}33` : 'rgba(255,255,255,0.08)'};
              border-radius:${isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px'};
              padding:10px 14px; color:#fff; font-size:12.5px; line-height:1.45; word-break:break-word;
              box-shadow:inset 0 1px 0 rgba(255,255,255,0.03);
            ">
              ${msg.content}
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    }

    setTimeout(() => {
      if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
    }, 50);
  });

  window._roomChatUnsubscribe = unsubscribe;

  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  const sendMessage = async () => {
    if (!input) return;
    const txt = input.value.trim();
    if (!txt) return;

    input.value = '';
    input.focus();

    try {
      await addDoc(collection(db, 'chatroom_messages'), {
        roomId: room.id,
        senderId: auth.currentUser?.uid || 'anonymous',
        senderName: auth.currentUser?.displayName || 'Gamer',
        senderEmail: auth.currentUser?.email || '',
        senderHandle: '@' + (auth.currentUser?.email || 'player').split('@')[0],
        senderPhoto: auth.currentUser?.photoURL || '',
        senderScore: userScore,
        senderRank: userRank,
        content: txt,
        type: 'text',
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Telemetry failed to send:", e);
    }
  };

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn?.addEventListener('click', sendMessage);

  document.querySelectorAll('.chat-react-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const emoji = btn.getAttribute('data-emoji');
      if (!emoji) return;

      _spawnFloatingReaction(emoji);

      try {
        await addDoc(collection(db, 'chatroom_messages'), {
          roomId: room.id,
          senderId: auth.currentUser?.uid || 'anonymous',
          senderName: auth.currentUser?.displayName || 'Gamer',
          senderEmail: auth.currentUser?.email || '',
          senderHandle: '@' + (auth.currentUser?.email || 'player').split('@')[0],
          senderPhoto: auth.currentUser?.photoURL || '',
          senderScore: null,
          senderRank: 'Guest',
          content: emoji,
          type: 'reaction',
          createdAt: serverTimestamp()
        });
      } catch(e) {}
    });
  });
}

function _spawnFloatingReaction(emoji) {
  const area = document.getElementById('reactions-float-area');
  if (!area) return;

  const el = document.createElement('div');
  el.textContent = emoji;
  const randomX = Math.floor(Math.random() * 60) + 20; 
  const randomRot = Math.floor(Math.random() * 80) - 40; 
  
  el.style.cssText = `
    position: absolute;
    bottom: -30px;
    left: ${randomX}px;
    font-size: 24px;
    pointer-events: none;
    user-select: none;
    --rot: ${randomRot}deg;
    animation: wld-reaction-float 2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
  `;
  
  area.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

/* ════════════════════════════════════════════════════════════
   NATIVE WEB AUDIO SOUND GENERATOR
   ════════════════════════════════════════════════════════════ */
function _playNeuroSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'incorrect') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'start') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'complete') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); 
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); 
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); 
      osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.24); 
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'flow') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {}
}

/* ════════════════════════════════════════════════════════════
   AUTO-TELEMETRY CHAT BROADCASTER
   ════════════════════════════════════════════════════════════ */
async function _broadcastNeuroScore(room, gameName, details) {
  try {
    await addDoc(collection(db, 'chatroom_messages'), {
      roomId: room.id,
      senderId: 'sys_neuro',
      senderName: 'SYSTEM_NEURO',
      senderEmail: '',
      senderHandle: 'SYS_NEURO',
      senderPhoto: '',
      senderScore: 100,
      senderRank: 'Diamond',
      content: `⚡ **Candidate session log [${gameName}]:** ${details}`,
      type: 'text',
      createdAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Failed to broadcast duel highscore:", e);
  }
}

/* ════════════════════════════════════════════════════════════
   COCKPIT ACTIVITIES ROUTING BY ROOM
   ============================================================ */
function _initCockpitActivity(room) {
  const workspace = document.getElementById('cockpit-workspace');
  if (!workspace) return;

  switch(room.id) {
    case 'room_1': // Focus Zone: Vigilance CPT
      _setupFocusCockpit(workspace, room);
      break;
    case 'room_2': // Hype Zone: Speed Search
      _setupHypeCockpit(workspace, room);
      break;
    case 'room_3': // Strategy Talk: Spatial N-Back
      _setupStrategyCockpit(workspace, room);
      break;
    case 'room_4': // Wind Down: Flow Alignment
      _setupWindDownCockpit(workspace, room);
      break;
    case 'room_5': // Star Meet: Cognitive Switch
      _setupStarMeetCockpit(workspace, room);
      break;
    case 'room_6': // Global Connect: Grid Router shortest path
    default:
      _setupGlobalCockpit(workspace, room);
      break;
  }
}

/* ── FOCUS ZONE: VIGILANCE CPT GAME (room_1) ───────────────── */
function _setupFocusCockpit(container, room) {
  container.innerHTML = `
    <div class="cockpit-panel-card" style="display:flex; flex-direction:column; gap:20px; align-items:center; text-align:center;">
      <div>
        <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em; margin-bottom:4px;">CPT Vigilance training</h3>
        <p style="color:rgba(255,255,255,0.4); font-size:12.5px; max-width:380px;">A letter flashes every 800ms. Tap the target button or press space <strong>ONLY when the letter "X" appears</strong>!</p>
      </div>

      <div style="display:flex; gap:32px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.05); padding:12px 24px; border-radius:12px;">
        <div>
          <div style="font-size:9.5px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">PROGRESS</div>
          <div id="cpt-progress" style="font-size:1.35rem; font-weight:800;">0/20</div>
        </div>
        <div>
          <div style="font-size:9.5px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">ACCURACY</div>
          <div id="cpt-acc" style="font-size:1.35rem; font-weight:800; color:${room.colorHex};">100%</div>
        </div>
        <div>
          <div style="font-size:9.5px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">AVG RT</div>
          <div id="cpt-rt" style="font-size:1.35rem; font-weight:800;">0ms</div>
        </div>
      </div>

      <!-- Vigilance Screen Arena -->
      <div id="cpt-screen" style="width:200px; height:200px; border:2px solid rgba(255,255,255,0.08); background:#000; border-radius:16px; display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-size:5.5rem; font-weight:900; color:#fff; position:relative; box-shadow:inset 0 0 30px rgba(0,0,0,0.8);">
        Ready
      </div>

      <div style="width:100%; max-width:320px; display:flex; flex-direction:column; gap:10px;">
        <button id="cpt-action-btn" class="cockpit-tab-btn" style="width:100%; border-color:${room.colorHex}; background:${room.colorHex}15; color:#fff; height:48px;" disabled>TAP ON TARGET (X)</button>
        <button id="cpt-start-btn" class="cockpit-tab-btn" style="width:100%;">Initialize training</button>
      </div>
    </div>
  `;

  const screen = document.getElementById('cpt-screen');
  const actionBtn = document.getElementById('cpt-action-btn');
  const startBtn = document.getElementById('cpt-start-btn');
  const progressDisp = document.getElementById('cpt-progress');
  const accDisp = document.getElementById('cpt-acc');
  const rtDisp = document.getElementById('cpt-rt');

  let activeIndex = 0;
  const totalTrials = 20;
  let gameInterval = null;
  let hasPressed = false;
  let currentLetter = '';
  let startLetterTime = 0;

  // Stats
  let correctHits = 0; // Pressed X
  let correctRejections = 0; // Did not press non-X
  let totalErrors = 0;
  let sumRT = 0;

  const letterPool = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X', 'X', 'X']; // ~30% X probability

  const updateStats = () => {
    if (progressDisp) progressDisp.textContent = `${activeIndex}/${totalTrials}`;
    const totalCorrect = correctHits + correctRejections;
    const accuracy = activeIndex > 0 ? Math.round((totalCorrect / activeIndex) * 100) : 100;
    if (accDisp) accDisp.textContent = `${accuracy}%`;
    const avgRT = correctHits > 0 ? Math.round(sumRT / correctHits) : 0;
    if (rtDisp) rtDisp.textContent = `${avgRT}ms`;
  };

  const handleInput = () => {
    if (hasPressed) return;
    hasPressed = true;
    const clickTime = performance.now();
    const rt = clickTime - startLetterTime;

    if (currentLetter === 'X') {
      _playNeuroSound('correct');
      correctHits++;
      sumRT += rt;
      screen.style.color = room.colorHex;
    } else {
      _playNeuroSound('incorrect');
      totalErrors++;
      screen.style.color = '#ec4899';
    }
    updateStats();
  };

  // Keyboard trigger
  const handleKeydown = (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      handleInput();
    }
  };

  const cycleLetter = () => {
    // Process previous trial omission
    if (activeIndex > 0 && !hasPressed) {
      if (currentLetter === 'X') {
        // Missed target X
        totalErrors++;
        _playNeuroSound('incorrect');
      } else {
        // Correctly avoided pressing non-X
        correctRejections++;
      }
      updateStats();
    }

    if (activeIndex >= totalTrials) {
      clearInterval(gameInterval);
      window.removeEventListener('keydown', handleKeydown);
      startBtn.style.display = 'block';
      actionBtn.setAttribute('disabled', 'true');
      screen.style.color = '#fff';
      screen.textContent = 'Done';
      _playNeuroSound('complete');

      const totalCorrect = correctHits + correctRejections;
      const acc = Math.round((totalCorrect / totalTrials) * 100);
      const avg = correctHits > 0 ? Math.round(sumRT / correctHits) : 0;

      // Broadcast completion score
      _broadcastNeuroScore(
        room, 
        'CPT Vigilance', 
        `Completed sustained attention training with **${acc}% Accuracy** and **${avg}ms average reaction speed**.`
      );
      return;
    }

    // Set up next letter
    activeIndex++;
    hasPressed = false;
    currentLetter = letterPool[Math.floor(Math.random() * letterPool.length)];
    screen.style.color = '#fff';
    screen.textContent = currentLetter;
    startLetterTime = performance.now();
    
    updateStats();
  };

  startBtn?.addEventListener('click', () => {
    startBtn.style.display = 'none';
    actionBtn.removeAttribute('disabled');
    window.addEventListener('keydown', handleKeydown);
    
    activeIndex = 0;
    correctHits = 0;
    correctRejections = 0;
    totalErrors = 0;
    sumRT = 0;
    hasPressed = false;
    updateStats();
    _playNeuroSound('start');

    cycleLetter();
    gameInterval = setInterval(cycleLetter, 950);
  });

  actionBtn?.addEventListener('mousedown', handleInput);

  // Observer to clear listener if page is exited early
  const obs = new MutationObserver(() => {
    if (!document.getElementById('cpt-screen')) {
      clearInterval(gameInterval);
      window.removeEventListener('keydown', handleKeydown);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

/* ── HYPE ZONE: SPEED SEARCH ODD-ONE-OUT (room_2) ──────────── */
function _setupHypeCockpit(container, room) {
  container.innerHTML = `
    <div class="cockpit-panel-card" style="display:flex; flex-direction:column; gap:20px; align-items:center; text-align:center;">
      <div>
        <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em; margin-bottom:4px;">Speed search test</h3>
        <p style="color:rgba(255,255,255,0.4); font-size:12.5px; max-width:380px;">High-speed pattern recognition. Spot and tap the <strong>one symbol that is different</strong> in the grid as fast as possible!</p>
      </div>

      <div style="display:flex; justify-content:space-around; align-items:center; width:100%; max-width:360px; background:rgba(0,0,0,0.25); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.05);">
        <div>
          <div style="font-size:9px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">TIMER</div>
          <div id="hype-timer" style="font-size:1.35rem; font-weight:800; color:#fff;">15s</div>
        </div>
        <div>
          <div style="font-size:9px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">RESOLVED</div>
          <div id="hype-score" style="font-size:1.35rem; font-weight:800; color:${room.colorHex};">0</div>
        </div>
        <div>
          <div style="font-size:9px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">SPEED / CLICK</div>
          <div id="hype-speed" style="font-size:1.35rem; font-weight:800; color:#fff;">0ms</div>
        </div>
      </div>

      <!-- Game Grid Arena -->
      <div id="search-grid" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; width:220px; height:220px; background:#000; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; align-content:center; justify-content:center;">
        <!-- Filled dynamically -->
        <div style="grid-column: span 4; color:rgba(255,255,255,0.3); font-size:12px; font-style:italic;">Grid offline.</div>
      </div>

      <button id="hype-start-btn" class="cockpit-tab-btn" style="width:100%; max-width:240px; border-color:${room.colorHex}; background:${room.colorHex}15; color:#fff; height:42px;">Start search duel</button>
    </div>
  `;

  const grid = document.getElementById('search-grid');
  const startBtn = document.getElementById('hype-start-btn');
  const timerDisp = document.getElementById('hype-timer');
  const scoreDisp = document.getElementById('hype-score');
  const speedDisp = document.getElementById('hype-speed');

  let activeScore = 0;
  let totalRT = 0;
  let currentStartTime = 0;
  let gameTimer = null;
  let timeRemaining = 15;
  let isPlaying = false;

  const letterPairs = [
    { base: 'O', odd: 'Q' },
    { base: 'E', odd: 'F' },
    { base: 'M', odd: 'N' },
    { base: 'C', odd: 'G' },
    { base: 'I', odd: 'T' },
    { base: 'X', odd: 'Y' },
    { base: '8', odd: 'B' },
    { base: 'V', odd: 'U' }
  ];

  const generateGrid = () => {
    if (!isPlaying) return;
    grid.innerHTML = '';
    
    // Choose a random letter pair
    const pair = letterPairs[Math.floor(Math.random() * letterPairs.length)];
    const oddIndex = Math.floor(Math.random() * 16); // 16 cells in 4x4 grid

    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('button');
      const isOdd = i === oddIndex;
      cell.textContent = isOdd ? pair.odd : pair.base;
      cell.style.cssText = `
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 8px; color: #fff; font-size: 1.8rem; font-weight: 700;
        font-family: 'Outfit', sans-serif; cursor: pointer; transition: all 0.1s;
        height: 44px; display: flex; align-items: center; justify-content: center;
      `;
      
      cell.addEventListener('mousedown', () => {
        if (isOdd) {
          _playNeuroSound('correct');
          const elapsed = performance.now() - currentStartTime;
          totalRT += elapsed;
          activeScore++;
          if (scoreDisp) scoreDisp.textContent = activeScore;
          if (speedDisp) speedDisp.textContent = `${Math.round(totalRT / activeScore)}ms`;
          
          currentStartTime = performance.now();
          generateGrid();
        } else {
          _playNeuroSound('incorrect');
          // penalty flash red
          cell.style.borderColor = '#ec4899';
          cell.style.background = 'rgba(236,72,153,0.1)';
        }
      });

      grid.appendChild(cell);
    }
    currentStartTime = performance.now();
  };

  startBtn?.addEventListener('click', () => {
    startBtn.style.display = 'none';
    isPlaying = true;
    activeScore = 0;
    totalRT = 0;
    timeRemaining = 15;
    if (scoreDisp) scoreDisp.textContent = 0;
    if (speedDisp) speedDisp.textContent = '0ms';
    if (timerDisp) timerDisp.textContent = '15s';
    _playNeuroSound('start');

    generateGrid();

    gameTimer = setInterval(() => {
      timeRemaining--;
      if (timerDisp) timerDisp.textContent = `${timeRemaining}s`;

      if (timeRemaining <= 0) {
        clearInterval(gameTimer);
        isPlaying = false;
        grid.innerHTML = `<div style="grid-column: span 4; color:rgba(255,255,255,0.4); font-size:13px; font-weight:600; text-align:center;">Test complete. Found ${activeScore} targets!</div>`;
        startBtn.style.display = 'block';
        startBtn.textContent = 'Restart Duel';
        _playNeuroSound('complete');

        const avg = activeScore > 0 ? Math.round(totalRT / activeScore) : 0;
        _broadcastNeuroScore(
          room, 
          'Speed Search', 
          `Accelerated neural patterns! Spot-clicked **${activeScore} odd-one-out symbols** with an average click velocity of **${avg}ms**.`
        );
      }
    }, 1000);
  });

  const obs = new MutationObserver(() => {
    if (!document.getElementById('search-grid')) {
      clearInterval(gameTimer);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

/* ── STRATEGY TALK: SPATIAL N-BACK GAME (room_3) ────────────── */
function _setupStrategyCockpit(container, room) {
  container.innerHTML = `
    <div class="cockpit-panel-card" style="display:flex; flex-direction:column; gap:20px; align-items:center; text-align:center;">
      <div>
        <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em; margin-bottom:4px;">Spatial N-Back trainer</h3>
        <p style="color:rgba(255,255,255,0.4); font-size:12.5px; max-width:380px;">Working memory test. Grid positions light up in sequence. Press match if position matches the one <strong>2 flashes ago (2-Back)</strong>!</p>
      </div>

      <div style="display:flex; gap:24px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.05); padding:10px 20px; border-radius:10px; width:100%; max-width:320px; justify-content:space-around;">
        <div>
          <div style="font-size:9px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">TRIAL</div>
          <div id="nback-trial" style="font-size:1.35rem; font-weight:800;">0/15</div>
        </div>
        <div>
          <div style="font-size:9px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">MATCHES</div>
          <div id="nback-score" style="font-size:1.35rem; font-weight:800; color:${room.colorHex};">0</div>
        </div>
        <div>
          <div style="font-size:9px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">ERRORS</div>
          <div id="nback-errors" style="font-size:1.35rem; font-weight:800; color:#ec4899;">0</div>
        </div>
      </div>

      <!-- 3x3 Grid Board -->
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; width:180px; height:180px; background:#000; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:8px;">
        ${Array.from({length:9}).map((_, i) => `
          <div id="nback-cell-${i}" style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:6px; transition:background-color 0.15s;"></div>
        `).join('')}
      </div>

      <div style="width:100%; max-width:320px; display:flex; flex-direction:column; gap:10px;">
        <button id="nback-match-btn" class="cockpit-tab-btn" style="width:100%; border-color:${room.colorHex}; background:${room.colorHex}15; color:#fff; height:48px;" disabled>MATCH POSITION (Space)</button>
        <button id="nback-start-btn" class="cockpit-tab-btn" style="width:100%;">Initialize Spatial 2-Back</button>
      </div>
    </div>
  `;

  const startBtn = document.getElementById('nback-start-btn');
  const matchBtn = document.getElementById('nback-match-btn');
  const trialDisp = document.getElementById('nback-trial');
  const scoreDisp = document.getElementById('nback-score');
  const errorsDisp = document.getElementById('nback-errors');

  let history = [];
  let trialIndex = 0;
  let matches = 0;
  let errors = 0;
  let currentActiveCell = -1;
  let gameInterval = null;
  let hasPressed = false;

  const cycleTrial = () => {
    // Process previous trial mismatch if it was a target and was missed
    if (trialIndex >= 2) {
      const prevTarget = history[trialIndex - 1 - 2];
      const currentCell = history[history.length - 1];
      const isTarget = prevTarget === currentCell;
      if (isTarget && !hasPressed) {
        errors++;
        errorsDisp.textContent = errors;
        _playNeuroSound('incorrect');
      }
    }

    // Clean active styling
    if (currentActiveCell !== -1) {
      const prevEl = document.getElementById(`nback-cell-${currentActiveCell}`);
      if (prevEl) {
        prevEl.style.backgroundColor = 'rgba(255,255,255,0.02)';
        prevEl.style.boxShadow = 'none';
      }
    }

    if (trialIndex >= 15) {
      clearInterval(gameInterval);
      window.removeEventListener('keydown', handleKeydown);
      startBtn.style.display = 'block';
      startBtn.textContent = 'Restart 2-Back';
      matchBtn.setAttribute('disabled', 'true');
      _playNeuroSound('complete');

      // Calculate accuracy
      const totalTargets = history.filter((c, idx) => idx >= 2 && c === history[idx - 2]).length;
      const acc = totalTargets > 0 ? Math.round((matches / totalTargets) * 100) : 100;
      
      _broadcastNeuroScore(
        room, 
        'Spatial 2-Back', 
        `Completed working memory cycle with **${acc}% Accuracy** (${matches} hits) and **${errors} errors**.`
      );
      return;
    }

    // Next flash
    trialIndex++;
    if (trialDisp) trialDisp.textContent = `${trialIndex}/15`;
    hasPressed = false;

    // Force ~35% match chance
    let nextCell;
    if (trialIndex >= 3 && Math.random() < 0.35) {
      nextCell = history[history.length - 2]; // Match 2 steps ago
    } else {
      nextCell = Math.floor(Math.random() * 9);
    }

    history.push(nextCell);
    currentActiveCell = nextCell;

    const el = document.getElementById(`nback-cell-${nextCell}`);
    if (el) {
      el.style.backgroundColor = room.colorHex;
      el.style.boxShadow = `0 0 15px ${room.colorHex}`;
    }
  };

  const handleMatch = () => {
    if (hasPressed || trialIndex < 3) return;
    hasPressed = true;

    const targetPos = history[trialIndex - 1 - 2];
    const currentPos = history[history.length - 1];

    if (targetPos === currentPos) {
      matches++;
      if (scoreDisp) scoreDisp.textContent = matches;
      _playNeuroSound('correct');
    } else {
      errors++;
      if (errorsDisp) errorsDisp.textContent = errors;
      _playNeuroSound('incorrect');
    }
  };

  const handleKeydown = (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      handleMatch();
    }
  };

  startBtn?.addEventListener('click', () => {
    startBtn.style.display = 'none';
    matchBtn.removeAttribute('disabled');
    window.addEventListener('keydown', handleKeydown);

    history = [];
    trialIndex = 0;
    matches = 0;
    errors = 0;
    currentActiveCell = -1;
    hasPressed = false;

    if (scoreDisp) scoreDisp.textContent = 0;
    if (errorsDisp) errorsDisp.textContent = 0;
    if (trialDisp) trialDisp.textContent = '0/15';

    _playNeuroSound('start');
    cycleTrial();
    gameInterval = setInterval(cycleTrial, 2000);
  });

  matchBtn?.addEventListener('mousedown', handleMatch);

  const obs = new MutationObserver(() => {
    if (!document.getElementById('nback-cell-0')) {
      clearInterval(gameInterval);
      window.removeEventListener('keydown', handleKeydown);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

/* ── WIND DOWN: FLOW ALIGNMENT RHYTHM GAME (room_4) ────────── */
function _setupWindDownCockpit(container, room) {
  container.innerHTML = `
    <div class="cockpit-panel-card" style="display:flex; flex-direction:column; gap:16px; align-items:center; text-align:center;">
      <div>
        <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em; margin-bottom:4px;">Flow alignment breathing</h3>
        <p style="color:rgba(255,255,255,0.4); font-size:12.5px; max-width:380px;">Rhythmic calming exercises. Guide the drifting particle through wave gates. Hold or tap the screen to shift wave amplitude.</p>
      </div>

      <div style="display:flex; justify-content:space-around; width:100%; max-width:320px; background:rgba(0,0,0,0.2); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.05);">
        <div>
          <div style="font-size:9px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">COHERENCE</div>
          <div id="flow-accuracy" style="font-size:1.35rem; font-weight:800; color:${room.colorHex};">100%</div>
        </div>
        <div>
          <div style="font-size:9px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">GATES CLEARED</div>
          <div id="flow-score" style="font-size:1.35rem; font-weight:800; color:#fff;">0/8</div>
        </div>
      </div>

      <canvas id="flow-canvas" style="width:100%; height:160px; background:#000; border-radius:12px; border:1px solid rgba(255,255,255,0.06); cursor:pointer;"></canvas>

      <button id="flow-start-btn" class="cockpit-tab-btn" style="width:100%; max-width:240px; border-color:${room.colorHex}; background:${room.colorHex}15; color:#fff; height:42px;">Initialize alignment</button>
    </div>
  `;

  const canvas = document.getElementById('flow-canvas');
  const startBtn = document.getElementById('flow-start-btn');
  const scoreDisp = document.getElementById('flow-score');
  const accDisp = document.getElementById('flow-accuracy');

  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width = canvas.clientWidth;
  const height = canvas.height = canvas.clientHeight;

  let isPlaying = false;
  let ballY = height / 2;
  let targetAmplitude = 20;
  let currentAmplitude = 20;
  let speedX = 1.8;
  let cycle = 0;
  let waveLength = 0.015;

  let gates = [];
  let score = 0;
  let totalGates = 8;
  let passedGatesCount = 0;
  let loopId = null;

  // Touch and hold triggers
  let isTapping = false;
  const setTap = (val) => { isTapping = val; };
  canvas.addEventListener('mousedown', () => setTap(true));
  canvas.addEventListener('mouseup', () => setTap(false));
  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); setTap(true); });
  canvas.addEventListener('touchend', () => setTap(false));

  const initGame = () => {
    gates = [];
    score = 0;
    passedGatesCount = 0;
    ballY = height / 2;
    cycle = 0;

    // Spawn 8 sequential gates along X coordinate path (e.g. intervals)
    for (let i = 1; i <= totalGates; i++) {
      gates.push({
        x: 180 + i * 220,
        amp: Math.random() < 0.5 ? 10 : 45, // Target amplitudes
        width: 32,
        passed: false
      });
    }
  };

  const gameLoop = () => {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, width, height);

    // Transition amplitudes based on tap hold controls
    targetAmplitude = isTapping ? 45 : 10;
    currentAmplitude += (targetAmplitude - currentAmplitude) * 0.08;

    // Draw the calming breathing sine path
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Wave visualization
    ctx.strokeStyle = `${room.colorHex}55`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 8;
    ctx.shadowColor = room.colorHex;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const y = height / 2 + Math.sin(x * waveLength - cycle) * currentAmplitude;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw the alignment target ball
    ballY = height / 2 + Math.sin(100 * waveLength - cycle) * currentAmplitude;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(100, ballY, 8, 0, Math.PI * 2);
    ctx.fill();

    // Move cycle shift speed
    cycle += waveLength * speedX;

    // Draw gates
    gates.forEach(gate => {
      // Calculate gate Y position matching base sine formula relative to its distance
      const gateY = height / 2 + Math.sin(gate.x * waveLength - cycle) * gate.amp;
      
      // Draw gate path target
      ctx.strokeStyle = gate.passed ? room.colorHex : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(gate.x, gateY, gate.width / 2, 0, Math.PI * 2);
      ctx.stroke();

      // Check collision when crossing ball's X index (100)
      if (!gate.passed && gate.x <= 100) {
        gate.passed = true;
        passedGatesCount++;
        const distance = Math.abs(ballY - gateY);
        
        if (distance < gate.width / 2) {
          score++;
          _playNeuroSound('flow');
        } else {
          _playNeuroSound('incorrect');
        }

        if (scoreDisp) scoreDisp.textContent = `${score}/${totalGates}`;
        const acc = passedGatesCount > 0 ? Math.round((score / passedGatesCount) * 100) : 100;
        if (accDisp) accDisp.textContent = `${acc}%`;
      }

      // Move gate position left
      gate.x -= speedX;
    });

    // Check completion
    const lastGate = gates[gates.length - 1];
    if (lastGate && lastGate.x < 60) {
      isPlaying = false;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = "12.5px 'Space Grotesk'";
      ctx.fillText("Alignment complete. Rhythms synced.", width / 2 - 100, height / 2);
      
      startBtn.style.display = 'block';
      startBtn.textContent = 'Re-align Rhythms';
      _playNeuroSound('complete');

      const acc = Math.round((score / totalGates) * 100);
      _broadcastNeuroScore(
        room, 
        'Flow Alignment', 
        `Achieved a **${acc}% Parasympathetic Coherence index** by clearing **${score}/${totalGates} wave alignment gates**.`
      );
      return;
    }

    loopId = requestAnimationFrame(gameLoop);
  };

  startBtn?.addEventListener('click', () => {
    startBtn.style.display = 'none';
    isPlaying = true;
    if (scoreDisp) scoreDisp.textContent = `0/${totalGates}`;
    if (accDisp) accDisp.textContent = '100%';
    _playNeuroSound('start');
    initGame();
    gameLoop();
  });

  const obs = new MutationObserver(() => {
    if (!document.getElementById('flow-canvas')) {
      cancelAnimationFrame(loopId);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

/* ── STAR MEET: COGNITIVE SWITCH GAME (room_5) ─────────────── */
function _setupStarMeetCockpit(container, room) {
  container.innerHTML = `
    <div class="cockpit-panel-card" style="display:flex; flex-direction:column; gap:20px; align-items:center; text-align:center;">
      <div>
        <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em; margin-bottom:4px;">Task switching test</h3>
        <p style="color:rgba(255,255,255,0.4); font-size:12.5px; max-width:380px;">Trains cognitive flexibility. Check card background and click matching answer key:</p>
        <div style="font-size:11px; color:#fff; display:flex; gap:16px; justify-content:center; margin-top:8px;">
          <span><span style="display:inline-block; width:10px; height:10px; background:#7c3aed; border-radius:2px; margin-right:4px;"></span>VIOLET: <strong>NUMBER</strong> (Even/Odd)</span>
          <span><span style="display:inline-block; width:10px; height:10px; background:#ec4899; border-radius:2px; margin-right:4px;"></span>PINK: <strong>LETTER</strong> (Vowel/Cons)</span>
        </div>
      </div>

      <div style="display:flex; justify-content:space-around; align-items:center; width:100%; max-width:320px; background:rgba(0,0,0,0.2); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.05);">
        <div>
          <div style="font-size:9.5px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">TRIAL</div>
          <div id="switch-trial" style="font-size:1.3rem; font-weight:800;">0/15</div>
        </div>
        <div>
          <div style="font-size:9.5px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">ACCURACY</div>
          <div id="switch-acc" style="font-size:1.3rem; font-weight:800; color:${room.colorHex};">100%</div>
        </div>
      </div>

      <!-- Cognitive Switch Card Display -->
      <div id="switch-card" style="width:160px; height:100px; border-radius:12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; transition:all 0.15s;">
        <span style="font-size:11px; font-family:'JetBrains Mono',monospace; color:rgba(255,255,255,0.4); text-transform:uppercase;" id="switch-cue">Rule</span>
        <span style="font-size:2.8rem; font-weight:800; font-family:'Outfit',sans-serif; color:#fff;" id="switch-symbols">--</span>
      </div>

      <div style="display:flex; gap:10px; width:100%; max-width:320px;">
        <button id="switch-btn-left" class="cockpit-tab-btn" style="flex:1;" disabled>EVEN / VOWEL</button>
        <button id="switch-btn-right" class="cockpit-tab-btn" style="flex:1;" disabled>ODD / CONSONANT</button>
      </div>

      <button id="switch-start-btn" class="cockpit-tab-btn" style="width:100%; max-width:240px; border-color:${room.colorHex}; background:${room.colorHex}15; color:#fff; height:42px;">Start Training</button>
    </div>
  `;

  const startBtn = document.getElementById('switch-start-btn');
  const card = document.getElementById('switch-card');
  const cueDisp = document.getElementById('switch-cue');
  const symDisp = document.getElementById('switch-symbols');
  const btnLeft = document.getElementById('switch-btn-left');
  const btnRight = document.getElementById('switch-btn-right');
  const trialDisp = document.getElementById('switch-trial');
  const accDisp = document.getElementById('switch-acc');

  let activeIndex = 0;
  const totalTrials = 15;
  let correctResponses = 0;
  let currentTask = ''; // 'number' (even/odd) or 'letter' (vowel/consonant)
  let currentNum = 0;
  let currentLet = '';
  let trialStartTime = 0;
  let totalSwitchRT = 0;
  let totalRepeatRT = 0;
  let switchTrialsCount = 0;
  let repeatTrialsCount = 0;
  let previousTask = '';

  const vowels = ['A', 'E', 'I', 'O', 'U'];
  const consonants = ['B', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T'];

  const spawnSwitchCard = () => {
    activeIndex++;
    if (trialDisp) trialDisp.textContent = `${activeIndex}/${totalTrials}`;

    // Decide task (violet = number, pink = letter)
    currentTask = Math.random() < 0.5 ? 'number' : 'letter';
    currentNum = Math.floor(Math.random() * 9) + 1; // 1-9
    currentLet = Math.random() < 0.5 
      ? vowels[Math.floor(Math.random() * vowels.length)] 
      : consonants[Math.floor(Math.random() * consonants.length)];

    if (currentTask === 'number') {
      card.style.background = 'rgba(124,58,237,0.18)';
      card.style.borderColor = 'rgba(124,58,237,0.4)';
      card.style.boxShadow = '0 0 20px rgba(124,58,237,0.12)';
      cueDisp.textContent = 'NUMBER';
    } else {
      card.style.background = 'rgba(236,72,153,0.18)';
      card.style.borderColor = 'rgba(236,72,153,0.4)';
      card.style.boxShadow = '0 0 20px rgba(236,72,153,0.12)';
      cueDisp.textContent = 'LETTER';
    }

    symDisp.textContent = `${currentLet}${currentNum}`;
    trialStartTime = performance.now();
  };

  const handleResponse = (isLeftBtn) => {
    const elapsed = performance.now() - trialStartTime;
    let isCorrect = false;

    if (currentTask === 'number') {
      const isEven = currentNum % 2 === 0;
      isCorrect = isLeftBtn ? isEven : !isEven;
    } else {
      const isVow = vowels.includes(currentLet);
      isCorrect = isLeftBtn ? isVow : !isVow;
    }

    if (isCorrect) {
      _playNeuroSound('correct');
      correctResponses++;
      // Switch cost calculation
      if (previousTask !== '') {
        if (previousTask === currentTask) {
          totalRepeatRT += elapsed;
          repeatTrialsCount++;
        } else {
          totalSwitchRT += elapsed;
          switchTrialsCount++;
        }
      }
    } else {
      _playNeuroSound('incorrect');
    }

    previousTask = currentTask;

    const acc = Math.round((correctResponses / activeIndex) * 100);
    if (accDisp) accDisp.textContent = `${acc}%`;

    if (activeIndex >= totalTrials) {
      // Done
      cueDisp.textContent = 'Done';
      symDisp.textContent = '--';
      card.style.background = 'rgba(255,255,255,0.02)';
      card.style.borderColor = 'rgba(255,255,255,0.08)';
      card.style.boxShadow = 'none';

      btnLeft.setAttribute('disabled', 'true');
      btnRight.setAttribute('disabled', 'true');
      startBtn.style.display = 'block';
      startBtn.textContent = 'Restart Switch training';
      _playNeuroSound('complete');

      const avgSwitch = switchTrialsCount > 0 ? Math.round(totalSwitchRT / switchTrialsCount) : 0;
      const avgRepeat = repeatTrialsCount > 0 ? Math.round(totalRepeatRT / repeatTrialsCount) : 0;
      const switchCost = Math.max(0, avgSwitch - avgRepeat);

      _broadcastNeuroScore(
        room, 
        'Cognitive Switch', 
        `Demonstrated cognitive flexibility with **${acc}% Accuracy** and a **Task Switch Cost of only ${switchCost}ms**.`
      );
      return;
    }

    spawnSwitchCard();
  };

  startBtn?.addEventListener('click', () => {
    startBtn.style.display = 'none';
    btnLeft.removeAttribute('disabled');
    btnRight.removeAttribute('disabled');

    activeIndex = 0;
    correctResponses = 0;
    totalSwitchRT = 0;
    totalRepeatRT = 0;
    switchTrialsCount = 0;
    repeatTrialsCount = 0;
    previousTask = '';

    if (accDisp) accDisp.textContent = '100%';
    if (trialDisp) trialDisp.textContent = '0/15';

    _playNeuroSound('start');
    spawnSwitchCard();
  });

  btnLeft?.addEventListener('mousedown', () => handleResponse(true));
  btnRight?.addEventListener('mousedown', () => handleResponse(false));
}

/* ── GLOBAL CONNECT: GRID ROUTER SHORTEST PATH (room_6) ────── */
function _setupGlobalCockpit(container, room) {
  container.innerHTML = `
    <div class="cockpit-panel-card" style="display:flex; flex-direction:column; gap:16px; align-items:center; text-align:center;">
      <div>
        <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em; margin-bottom:4px;">Grid router pathfinder</h3>
        <p style="color:rgba(255,255,255,0.4); font-size:12.5px; max-width:380px;">Trains spatial routing. Complete the network circuit from **Node A (Start)** to **Node E (Target)** with the **absolute lowest latency cost**.</p>
      </div>

      <div style="display:flex; justify-content:space-around; width:100%; max-width:320px; background:rgba(0,0,0,0.2); padding:10px; border-radius:10px; border:1px solid rgba(255,255,255,0.05);">
        <div>
          <div style="font-size:9.5px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">EFFICIENCY</div>
          <div id="route-eff" style="font-size:1.3rem; font-weight:800; color:${room.colorHex};">100%</div>
        </div>
        <div>
          <div style="font-size:9.5px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">ROUND</div>
          <div id="route-round" style="font-size:1.3rem; font-weight:800; color:#fff;">0/5</div>
        </div>
      </div>

      <canvas id="router-canvas" style="width:100%; height:180px; background:#000; border-radius:12px; border:1px solid rgba(255,255,255,0.06); cursor:pointer;"></canvas>

      <button id="router-start-btn" class="cockpit-tab-btn" style="width:100%; max-width:240px; border-color:${room.colorHex}; background:${room.colorHex}15; color:#fff; height:42px;">Initialize Router Grid</button>
    </div>
  `;

  const canvas = document.getElementById('router-canvas');
  const startBtn = document.getElementById('router-start-btn');
  const effDisp = document.getElementById('route-eff');
  const roundDisp = document.getElementById('route-round');

  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width = canvas.clientWidth;
  const height = canvas.height = canvas.clientHeight;

  let activeRound = 0;
  const totalRounds = 5;
  let totalBestCost = 0;
  let totalUserCost = 0;
  let nodes = [];
  let links = [];
  let userPath = [];
  let isPlaying = false;

  const buildGraph = () => {
    // Generate a fixed 5-node graph structure
    nodes = [
      { id: 'A', x: 40, y: height / 2, label: 'Start (A)' },
      { id: 'B', x: width / 3 + 10, y: 35, label: 'B' },
      { id: 'C', x: width / 3 + 10, y: height - 35, label: 'C' },
      { id: 'D', x: (width / 3) * 2 - 10, y: height / 2, label: 'D' },
      { id: 'E', x: width - 40, y: height / 2, label: 'Target (E)' }
    ];

    // Randomized cost indices
    const r1 = Math.floor(Math.random() * 20) + 10; // A-B
    const r2 = Math.floor(Math.random() * 20) + 10; // A-C
    const r3 = Math.floor(Math.random() * 25) + 15; // B-D
    const r4 = Math.floor(Math.random() * 25) + 15; // C-D
    const r5 = Math.floor(Math.random() * 15) + 10; // D-E
    const r6 = Math.floor(Math.random() * 35) + 20; // B-C cross link

    links = [
      { from: 'A', to: 'B', cost: r1 },
      { from: 'A', to: 'C', cost: r2 },
      { from: 'B', to: 'D', cost: r3 },
      { from: 'C', to: 'D', cost: r4 },
      { from: 'D', to: 'E', cost: r5 },
      { from: 'B', to: 'C', cost: r6 }
    ];

    userPath = ['A'];
  };

  const findShortestCost = () => {
    // Simple exhaustive path check for 5 node paths:
    // Paths: 
    // 1: A -> B -> D -> E (c1)
    // 2: A -> C -> D -> E (c2)
    // 3: A -> B -> C -> D -> E (c3)
    // 4: A -> C -> B -> D -> E (c4)
    let best = 9999;
    const getLinkCost = (f, t) => {
      const l = links.find(x => (x.from === f && x.to === t) || (x.from === t && x.to === f));
      return l ? l.cost : 9999;
    };

    const p1 = getLinkCost('A', 'B') + getLinkCost('B', 'D') + getLinkCost('D', 'E');
    const p2 = getLinkCost('A', 'C') + getLinkCost('C', 'D') + getLinkCost('D', 'E');
    const p3 = getLinkCost('A', 'B') + getLinkCost('B', 'C') + getLinkCost('C', 'D') + getLinkCost('D', 'E');
    const p4 = getLinkCost('A', 'C') + getLinkCost('C', 'B') + getLinkCost('B', 'D') + getLinkCost('D', 'E');

    return Math.min(p1, p2, p3, p4);
  };

  const drawGraph = () => {
    ctx.clearRect(0, 0, width, height);

    // Draw Links
    links.forEach(l => {
      const fromNode = nodes.find(n => n.id === l.from);
      const toNode = nodes.find(n => n.id === l.to);
      if (!fromNode || !toNode) return;

      const inUserPath = (userPath.includes(l.from) && userPath.includes(l.to));
      ctx.strokeStyle = inUserPath ? room.colorHex : 'rgba(255,255,255,0.06)';
      ctx.lineWidth = inUserPath ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.stroke();

      // Draw cost weight badge
      const mx = (fromNode.x + toNode.x) / 2;
      const my = (fromNode.y + toNode.y) / 2;
      ctx.fillStyle = '#000';
      ctx.fillRect(mx - 15, my - 9, 30, 18);
      ctx.strokeStyle = inUserPath ? room.colorHex : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(mx - 15, my - 9, 30, 18);

      ctx.fillStyle = '#fff';
      ctx.font = "10px 'JetBrains Mono'";
      ctx.textAlign = 'center';
      ctx.fillText(`${l.cost}ms`, mx, my + 4);
    });

    // Draw Nodes
    nodes.forEach(n => {
      const isSelected = userPath.includes(n.id);
      const isCurrent = userPath[userPath.length - 1] === n.id;

      ctx.fillStyle = isCurrent ? room.colorHex : isSelected ? `${room.colorHex}77` : '#0d0d10';
      ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = isCurrent ? 3 : 1.5;

      ctx.beginPath();
      ctx.arc(n.x, n.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = "bold 11px 'Space Grotesk'";
      ctx.textAlign = 'center';
      ctx.fillText(n.id, n.x, n.y + 4);
    });
  };

  const handleCanvasClick = (e) => {
    if (!isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Find clicked node
    const clickedNode = nodes.find(n => {
      const dist = Math.hypot(n.x - mx, n.y - my);
      return dist <= 24; // buffer
    });

    if (!clickedNode) return;

    // Must be adjacent to current node
    const currentNode = userPath[userPath.length - 1];
    const isAdjacent = links.some(l => 
      (l.from === currentNode && l.to === clickedNode.id) ||
      (l.from === clickedNode.id && l.to === currentNode)
    );

    if (!isAdjacent) return;

    // Move
    _playNeuroSound('correct');
    userPath.push(clickedNode.id);
    drawGraph();

    // Check target reached
    if (clickedNode.id === 'E') {
      isPlaying = false;
      
      // Calculate user score cost
      let pathCost = 0;
      for (let i = 0; i < userPath.length - 1; i++) {
        const from = userPath[i];
        const to = userPath[i + 1];
        const l = links.find(x => (x.from === from && x.to === to) || (x.from === to && x.to === from));
        if (l) pathCost += l.cost;
      }

      const bestCost = findShortestCost();
      totalBestCost += bestCost;
      totalUserCost += pathCost;

      const efficiency = Math.round((totalBestCost / totalUserCost) * 100);
      if (effDisp) effDisp.textContent = `${efficiency}%`;

      setTimeout(() => {
        if (activeRound >= totalRounds) {
          // Completed
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = 'rgba(255,255,255,0.4)';
          ctx.font = "12.5px 'Space Grotesk'";
          ctx.fillText("Grid routing completed.", width / 2 - 80, height / 2);
          
          startBtn.style.display = 'block';
          startBtn.textContent = 'Restart Router grid';
          _playNeuroSound('complete');

          _broadcastNeuroScore(
            room, 
            'Grid Router', 
            `Completed routing simulation with a pathing accuracy of **${efficiency}% Efficiency**.`
          );
        } else {
          activeRound++;
          if (roundDisp) roundDisp.textContent = `${activeRound}/5`;
          isPlaying = true;
          buildGraph();
          drawGraph();
        }
      }, 900);
    }
  };

  startBtn?.addEventListener('click', () => {
    startBtn.style.display = 'none';
    isPlaying = true;
    activeRound = 1;
    totalBestCost = 0;
    totalUserCost = 0;

    if (roundDisp) roundDisp.textContent = '1/5';
    if (effDisp) effDisp.textContent = '100%';

    _playNeuroSound('start');
    buildGraph();
    drawGraph();
  });

  canvas.addEventListener('mousedown', handleCanvasClick);
}

function getRankFromScore(composite) {
  if (composite >= 130) return { rank: 'Legend',   tier: 'star' };
  if (composite >= 115) return { rank: 'Master',   tier: 'star' };
  if (composite >= 100) return { rank: 'Diamond',  tier: 'rising' };
  if (composite >= 85)  return { rank: 'Platinum', tier: 'community' };
  if (composite >= 70)  return { rank: 'Gold',     tier: 'community' };
  return                       { rank: 'Silver',   tier: 'community' };
}
