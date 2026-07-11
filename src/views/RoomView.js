/* ============================================================
   RoomView — Dedicated full-screen splitscreen chatroom cockpit
   ============================================================ */

import { render } from '../utils/dom.js';
import { navigate, injectStyle } from '../router.js';
import { auth, db } from '../utils/firebase.js';
import { fetchUserProfile } from '../utils/worldData.js';
import { NEURO_ROOMS } from '../utils/worldStatic.js';
import { 
  collection, addDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp 
} from 'firebase/firestore';

// Global variables for audio state across room mounts
let audioCtx = null;
let ambientOsc = null;
let gainNode = null;
let lfo = null;
let lfoGain = null;
let analyserNode = null;
let isAudioPlaying = false;

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

  // Inject CSS animations & visualizer styling
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
      color: rgba(255,255,255,0.4); font-family: 'Space Grotesk', sans-serif;
      padding: 10px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s;
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
              <span style="font-family:'JetBrains Mono',monospace; font-size:9.5px; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.06em;">WS TELEMETRY NODE CONNECTED · ${room.online} active channels</span>
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
            <!-- Render dynamic list of typing/recent logs -->
          </div>

          <!-- Scrolling Message timeline -->
          <div id="wld-chat-messages" style="flex:1; padding:24px 20px; overflow-y:auto; display:flex; flex-direction:column; gap:16px;">
            <!-- Terminal connect log -->
            <div style="font-family:'JetBrains Mono',monospace; font-size:9.5px; color:#2563eb; line-height:1.5; padding:10px 14px; background:rgba(37,99,235,0.05); border:1px solid rgba(37,99,235,0.12); border-radius:8px; margin-bottom:8px;">
              <div>SYS_WS: Established socket pipe to neuro room nodes.</div>
              <div>SYS_LINK: Identity authenticated for candidate: ${auth.currentUser?.email || 'unknown'}</div>
            </div>
            
            <div id="chat-messages-container" style="display:flex; flex-direction:column; gap:14px;">
              <div style="text-align:center; padding:20px; color:rgba(255,255,255,0.2); font-size:11px;">Syncing websocket streams...</div>
            </div>
          </div>

          <!-- Floating Reaction Area Overlay (inside chat side) -->
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
              <h2 style="font-family:'Outfit',sans-serif; font-weight:800; font-size:1.6rem; color:#fff;">Neuro Deck Activity</h2>
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
    // Unsubscribe from Firestore snapshot
    if (window._roomChatUnsubscribe) {
      window._roomChatUnsubscribe();
      window._roomChatUnsubscribe = null;
    }
    // Stop Web Audio synth on exit
    _stopLofiSynth();
    navigate('world');
  });

  // Setup Chat real-time streams
  _initChatTelemetry(room, userScore, userRank);

  // Setup Cockpit Activities
  _initCockpitActivity(room, userScore, userRank);
}

/* ════════════════════════════════════════════════════════════
   FIRESTORE REAL-TIME CHAT telemetry
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

    // Filter in memory for roomId, reverse chronologically, take last 50
    const rawMessages = allMessages
      .filter(m => m.roomId === room.id)
      .reverse()
      .slice(-50);

    // Dynamic active users list
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
      usersBar.innerHTML = `<span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.05em; flex-shrink:0;">active logs:</span>` + activeUserHTML;
    }

    // Render messages
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

    // Scroll to bottom
    setTimeout(() => {
      if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
    }, 50);
  });

  window._roomChatUnsubscribe = unsubscribe;

  // Send message handlers
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

  // Hook reaction buttons
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
   INTERACTIVE COCKPIT INIT & ROUTING BY ROOM
   ════════════════════════════════════════════════════════════ */
function _initCockpitActivity(room, userScore, userRank) {
  const workspace = document.getElementById('cockpit-workspace');
  if (!workspace) return;

  switch(room.id) {
    case 'room_1': // Focus Zone: Pomodoro & Audio Visualizer
      _setupFocusCockpit(workspace, room);
      break;
    case 'room_2': // Hype Zone: Neuro Duel Clicker Game
      _setupHypeCockpit(workspace, room);
      break;
    case 'room_3': // Strategy Talk: Sync Mind Canvas Whiteboard
      _setupStrategyCockpit(workspace, room);
      break;
    case 'room_4': // Wind Down: Breathing pacer & Sound ambient synth
      _setupWindDownCockpit(workspace, room);
      break;
    case 'room_5': // Star Meet: Live candidate telemetry
      _setupStarMeetCockpit(workspace, room);
      break;
    case 'room_6': // Global Connect: Global Node Pinger
    default:
      _setupGlobalCockpit(workspace, room);
      break;
  }
}

/* ── FOCUS ZONE INTERACTION ─────────────────────────────────── */
function _setupFocusCockpit(container, room) {
  container.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:20px;">
      
      <!-- Pomodoro Timer -->
      <div class="cockpit-panel-card" style="text-align:center; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px;">
        <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em;">Co-Op Pomodoro Clock</h3>
        
        <div style="position:relative; width:160px; height:160px; display:flex; align-items:center; justify-content:center; margin:10px 0;">
          <svg style="position:absolute; inset:0; transform:rotate(-90deg);" width="160" height="160">
            <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.03)" stroke-width="6" fill="none" />
            <circle id="timer-progress" cx="80" cy="80" r="70" stroke="${room.colorHex}" stroke-width="6" fill="none" stroke-dasharray="440" stroke-dashoffset="0" style="transition:stroke-dashoffset 1s linear;" />
          </svg>
          <div id="timer-display" style="font-size:2.4rem; font-family:'Outfit',sans-serif; font-weight:800; color:#fff;">25:00</div>
        </div>

        <div style="display:flex; gap:10px;">
          <button id="timer-start" class="cockpit-tab-btn" style="border-color:${room.colorHex}; color:#fff; background:${room.colorHex}10;">Start Focus</button>
          <button id="timer-pause" class="cockpit-tab-btn">Pause</button>
          <button id="timer-reset" class="cockpit-tab-btn">Reset</button>
        </div>
      </div>

      <!-- Ambient Web Audio Visualizer -->
      <div class="cockpit-panel-card">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
          <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em;">Ambient Binaural Visualizer</h3>
          <button id="ambient-audio-btn" class="cockpit-tab-btn" style="padding:6px 12px; font-size:11px;">Play Audio</button>
        </div>
        <canvas id="visualizer-canvas" style="width:100%; height:80px; background:#000; border-radius:10px; border:1px solid rgba(255,255,255,0.06);"></canvas>
      </div>

    </div>
  `;

  // Focus Timer Logic
  let timerDuration = 25 * 60;
  let timerInterval = null;
  let isTimerRunning = false;
  
  const display = document.getElementById('timer-display');
  const progress = document.getElementById('timer-progress');
  const startBtn = document.getElementById('timer-start');
  const pauseBtn = document.getElementById('timer-pause');
  const resetBtn = document.getElementById('timer-reset');

  const updateTimerDisplay = () => {
    if (!display) return;
    const mins = Math.floor(timerDuration / 60).toString().padStart(2, '0');
    const secs = (timerDuration % 60).toString().padStart(2, '0');
    display.textContent = `${mins}:${secs}`;
    
    // update dash offset
    const offset = 440 - (timerDuration / (25 * 60)) * 440;
    if (progress) progress.setAttribute('stroke-dashoffset', offset);
  };

  startBtn?.addEventListener('click', () => {
    if (isTimerRunning) return;
    isTimerRunning = true;
    startBtn.style.opacity = '0.5';
    timerInterval = setInterval(() => {
      if (timerDuration > 0) {
        timerDuration--;
        updateTimerDisplay();
      } else {
        clearInterval(timerInterval);
        isTimerRunning = false;
        startBtn.style.opacity = '1';
        alert('Focus session completed! Take a break.');
      }
    }, 1000);
  });

  pauseBtn?.addEventListener('click', () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    if (startBtn) startBtn.style.opacity = '1';
  });

  resetBtn?.addEventListener('click', () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    timerDuration = 25 * 60;
    updateTimerDisplay();
    if (startBtn) startBtn.style.opacity = '1';
  });

  // Web Audio Visualizer Setup
  const canvas = document.getElementById('visualizer-canvas');
  const audioBtn = document.getElementById('ambient-audio-btn');
  let animationFrameId = null;

  if (audioBtn) {
    audioBtn.textContent = isAudioPlaying ? 'Pause Ambient' : 'Play Ambient';
    audioBtn.addEventListener('click', () => {
      if (isAudioPlaying) {
        _stopLofiSynth();
        audioBtn.textContent = 'Play Ambient';
      } else {
        _startLofiSynth(110, 'triangle'); // Warm, deep binaural focus frequency
        audioBtn.textContent = 'Pause Ambient';
      }
    });
  }

  const renderVisualizer = () => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = canvas.clientWidth;
    const height = canvas.height = canvas.clientHeight;
    
    ctx.clearRect(0, 0, width, height);

    if (isAudioPlaying && analyserNode) {
      const bufferLength = analyserNode.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserNode.getByteFrequencyData(dataArray);

      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;

        ctx.fillStyle = room.colorHex;
        ctx.shadowColor = room.colorHex;
        ctx.shadowBlur = 10;
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

        x += barWidth;
      }
    } else {
      // Draw static baseline
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    }
    
    animationFrameId = requestAnimationFrame(renderVisualizer);
  };

  renderVisualizer();

  // Cleanup visualizer animation on parent container discard
  const obs = new MutationObserver(() => {
    if (!document.getElementById('visualizer-canvas')) {
      cancelAnimationFrame(animationFrameId);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

/* ── HYPE ZONE INTERACTION (NEURO DUEL GAME) ───────────────── */
function _setupHypeCockpit(container, room) {
  container.innerHTML = `
    <div class="cockpit-panel-card" style="display:flex; flex-direction:column; gap:20px; text-align:center;">
      <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em;">1v1 Neuro Reflex Duel</h3>
      <p style="color:rgba(255,255,255,0.45); font-size:12px; margin-top:-10px;">Click the active glowing nodes as fast as possible. Test finishes in 15 seconds.</p>

      <div style="display:flex; justify-content:space-around; align-items:center; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.05); padding:12px; border-radius:10px;">
        <div>
          <div style="font-size:9px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace; text-transform:uppercase;">Time Remaining</div>
          <div id="duel-time" style="font-size:1.4rem; font-weight:800; color:#fff;">15s</div>
        </div>
        <div>
          <div style="font-size:9px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace; text-transform:uppercase;">Nodes Neutralised</div>
          <div id="duel-score" style="font-size:1.4rem; font-weight:800; color:${room.colorHex};">0</div>
        </div>
        <div>
          <div style="font-size:9px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace; text-transform:uppercase;">Speed (Avg RT)</div>
          <div id="duel-rt" style="font-size:1.4rem; font-weight:800; color:#fff;">0ms</div>
        </div>
      </div>

      <!-- Duel Grid Arena -->
      <div id="duel-arena" style="position:relative; height:240px; background:#000; border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center;">
        <button id="duel-start-btn" style="background:${room.colorHex}; color:#000; border:none; padding:12px 28px; font-weight:700; font-size:12px; font-family:'Space Grotesk',sans-serif; text-transform:uppercase; letter-spacing:0.08em; border-radius:8px; cursor:pointer; box-shadow:0 8px 24px ${room.colorHex}44; z-index:10;">Initialize Combat Mode</button>
      </div>

      <!-- Live audio visualizer loop link for Hype vibe -->
      <button id="hype-audio-btn" class="cockpit-tab-btn" style="align-self:center; border-color:${room.colorHex}; font-size:11px;">Activate Synthwave Ambient</button>
    </div>
  `;

  const startBtn = document.getElementById('duel-start-btn');
  const arena = document.getElementById('duel-arena');
  const timeDisplay = document.getElementById('duel-time');
  const scoreDisplay = document.getElementById('duel-score');
  const rtDisplay = document.getElementById('duel-rt');
  const audioBtn = document.getElementById('hype-audio-btn');

  if (audioBtn) {
    audioBtn.textContent = isAudioPlaying ? 'Mute Audio Loop' : 'Activate Synthwave Ambient';
    audioBtn.addEventListener('click', () => {
      if (isAudioPlaying) {
        _stopLofiSynth();
        audioBtn.textContent = 'Activate Synthwave Ambient';
      } else {
        _startLofiSynth(220, 'square'); // Higher, energetic synthwave square waves
        audioBtn.textContent = 'Mute Audio Loop';
      }
    });
  }

  let gameTimer = null;
  let gameDuration = 15;
  let nodesHit = 0;
  let totalRT = 0;
  let lastNodeSpawnTime = 0;
  let activeNode = null;

  const spawnNode = () => {
    if (activeNode) activeNode.remove();

    const node = document.createElement('div');
    const width = arena.clientWidth;
    const height = arena.clientHeight;
    
    // stay within bounds
    const rx = Math.floor(Math.random() * (width - 44)) + 10;
    const ry = Math.floor(Math.random() * (height - 44)) + 10;

    node.style.cssText = `
      position: absolute; top: ${ry}px; left: ${rx}px;
      width: 24px; height: 24px; border-radius: 50%;
      background: ${room.colorHex}; border: 2px solid #fff;
      box-shadow: 0 0 16px ${room.colorHex}, 0 0 40px ${room.colorHex};
      cursor: pointer; transition: transform 0.1s; z-index: 5;
    `;
    
    lastNodeSpawnTime = performance.now();
    
    node.addEventListener('mousedown', () => {
      const clickTime = performance.now();
      const rt = Math.round(clickTime - lastNodeSpawnTime);
      totalRT += rt;
      nodesHit++;

      if (scoreDisplay) scoreDisplay.textContent = nodesHit;
      if (rtDisplay) rtDisplay.textContent = `${Math.round(totalRT / nodesHit)}ms`;

      spawnNode();
    });

    arena.appendChild(node);
    activeNode = node;
  };

  startBtn?.addEventListener('click', () => {
    startBtn.style.display = 'none';
    nodesHit = 0;
    totalRT = 0;
    gameDuration = 15;
    if (scoreDisplay) scoreDisplay.textContent = 0;
    if (rtDisplay) rtDisplay.textContent = '0ms';
    if (timeDisplay) timeDisplay.textContent = '15s';

    spawnNode();

    gameTimer = setInterval(async () => {
      gameDuration--;
      if (timeDisplay) timeDisplay.textContent = `${gameDuration}s`;

      if (gameDuration <= 0) {
        clearInterval(gameTimer);
        if (activeNode) activeNode.remove();
        startBtn.style.display = 'block';
        startBtn.textContent = 'Re-Initialize Combat';

        const finalScore = nodesHit;
        const avgRT = finalScore > 0 ? Math.round(totalRT / finalScore) : 0;

        // Auto-broadcast highscore telemetry to chatroom!
        try {
          await addDoc(collection(db, 'chatroom_messages'), {
            roomId: room.id,
            senderId: 'sys_duel',
            senderName: 'SYSTEM_DUEL',
            senderEmail: '',
            senderHandle: 'SYS_DUEL',
            senderPhoto: '',
            senderScore: 100,
            senderRank: 'Diamond',
            content: `🎯 Candidate telemetry: Neutralised ${finalScore} nodes with avg reaction speed of ${avgRT}ms!`,
            type: 'text',
            createdAt: serverTimestamp()
          });
        } catch (e) {}
      }
    }, 1000);
  });
}

/* ── STRATEGY TALK INTERACTION (MIND CANVAS WHITEBOARD) ─────── */
function _setupStrategyCockpit(container, room) {
  container.innerHTML = `
    <div class="cockpit-panel-card" style="display:flex; flex-direction:column; gap:16px;">
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em;">Dynamic Co-Op Mind Canvas</h3>
        <button id="canvas-clear-btn" class="cockpit-tab-btn" style="padding:6px 12px; font-size:11px;">Clear Screen</button>
      </div>

      <div style="display:flex; gap:10px; align-items:center; background:rgba(0,0,0,0.2); padding:8px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.05); overflow-x:auto;">
        <span style="font-family:'JetBrains Mono',monospace; font-size:8.5px; color:rgba(255,255,255,0.25); text-transform:uppercase;">Brush Colour:</span>
        ${['#7c3aed', '#ec4899', '#2563eb', '#d4ff00', '#06b6d4', '#ffffff'].map(c => `
          <button class="colour-dot" data-colour="${c}" style="width:16px; height:16px; border-radius:50%; background:${c}; border:1.5px solid transparent; cursor:pointer; transition:transform 0.15s;" onmouseenter="this.style.transform='scale(1.25)'" onmouseleave="this.style.transform=''"></button>
        `).join('')}
      </div>

      <canvas id="mind-whiteboard" style="width:100%; height:260px; background:#000; border:1px solid rgba(255,255,255,0.08); border-radius:12px; cursor:crosshair;"></canvas>
    </div>
  `;

  const canvas = document.getElementById('mind-whiteboard');
  const clearBtn = document.getElementById('canvas-clear-btn');
  const colourDots = document.querySelectorAll('.colour-dot');

  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width = canvas.clientWidth;
  const height = canvas.height = canvas.clientHeight;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = 3;

  let currentColour = '#7c3aed';
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  // Set default active color selection
  const activateDot = (colour) => {
    colourDots.forEach(dot => {
      const isMatch = dot.getAttribute('data-colour') === colour;
      dot.style.borderColor = isMatch ? '#fff' : 'transparent';
      dot.style.boxShadow = isMatch ? `0 0 10px ${colour}` : 'none';
    });
  };
  activateDot(currentColour);

  colourDots.forEach(dot => {
    dot.addEventListener('click', () => {
      currentColour = dot.getAttribute('data-colour');
      activateDot(currentColour);
    });
  });

  // Local drawing handlers
  const drawLine = (x1, y1, x2, y2, colour, localEmit = true) => {
    ctx.strokeStyle = colour;
    ctx.shadowColor = colour;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (localEmit) {
      // Sync draw telemetry coordinates to Firestore
      try {
        addDoc(collection(db, 'chatroom_doodles'), {
          roomId: room.id,
          x1: parseFloat((x1 / width).toFixed(4)),
          y1: parseFloat((y1 / height).toFixed(4)),
          x2: parseFloat((x2 / width).toFixed(4)),
          y2: parseFloat((y2 / height).toFixed(4)),
          colour,
          createdAt: serverTimestamp()
        });
      } catch(e) {}
    }
  };

  const getCoordinates = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const coords = getCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    drawLine(lastX, lastY, coords.x, coords.y, currentColour, true);
    lastX = coords.x;
    lastY = coords.y;
  });

  canvas.addEventListener('mouseup', () => isDrawing = false);
  canvas.addEventListener('mouseleave', () => isDrawing = false);

  // Touch support for mobiles
  canvas.addEventListener('touchstart', (e) => {
    isDrawing = true;
    const coords = getCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;
  });

  canvas.addEventListener('touchmove', (e) => {
    if (!isDrawing) return;
    const coords = getCoordinates(e);
    drawLine(lastX, lastY, coords.x, coords.y, currentColour, true);
    lastX = coords.x;
    lastY = coords.y;
  });

  canvas.addEventListener('touchend', () => isDrawing = false);

  // Real-time whiteboard listener
  const q = query(
    collection(db, 'chatroom_doodles'),
    where('roomId', '==', room.id),
    orderBy('createdAt', 'asc'),
    limit(400) // load latest 400 paths
  );

  const unsubscribeCanvas = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const d = change.doc.data();
        // Skip drawing if local or already drawn (check timeline timestamp)
        // Redraw on whiteboard canvas scale coordinates
        drawLine(
          d.x1 * width,
          d.y1 * height,
          d.x2 * width,
          d.y2 * height,
          d.colour,
          false
        );
      }
    });
  });

  // Clear canvas triggers locally
  clearBtn?.addEventListener('click', () => {
    ctx.clearRect(0, 0, width, height);
  });

  // Store canvas unsubscribe to router exit hooks
  const oldUnsubscribe = window._roomChatUnsubscribe;
  window._roomChatUnsubscribe = () => {
    if (oldUnsubscribe) oldUnsubscribe();
    unsubscribeCanvas();
  };
}

/* ── WIND DOWN INTERACTION (BREATHING PACER & AUDIO) ───────── */
function _setupWindDownCockpit(container, room) {
  container.innerHTML = `
    <div class="cockpit-panel-card" style="display:flex; flex-direction:column; gap:20px; text-align:center;">
      <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em;">Nature Ambient Breathing Pacer</h3>
      <p style="color:rgba(255,255,255,0.45); font-size:12px; margin-top:-10px;">Decompress with the expanding pacer dot. Sync your breath: Inhale / Exhale.</p>

      <div style="position:relative; height:180px; display:flex; align-items:center; justify-content:center; margin:10px 0;">
        <div id="breathing-ring" style="
          width: 50px; height: 50px; border-radius: 50%;
          background: ${room.colorHex}15; border: 3px solid ${room.colorHex};
          box-shadow: 0 0 16px ${room.colorHex}, 0 0 45px ${room.colorHex};
          transition: all 4s cubic-bezier(0.445, 0.05, 0.55, 0.95);
        "></div>
        <div id="breathing-text" style="position:absolute; font-weight:700; font-size:12px; color:#fff; pointer-events:none; letter-spacing:0.1em; text-transform:uppercase;">Inhale</div>
      </div>

      <div style="display:flex; justify-content:center; gap:10px;">
        <button id="wind-audio-btn" class="cockpit-tab-btn" style="border-color:${room.colorHex}; color:#fff; background:${room.colorHex}10;">Synthesize Wind Ambient</button>
      </div>
    </div>
  `;

  // Breathing Loop Animation
  const ring = document.getElementById('breathing-ring');
  const text = document.getElementById('breathing-text');
  let breathState = 'inhale';

  const breathCycle = () => {
    if (!ring || !text) return;
    if (breathState === 'inhale') {
      ring.style.width = '120px';
      ring.style.height = '120px';
      ring.style.boxShadow = `0 0 25px ${room.colorHex}, 0 0 60px ${room.colorHex}`;
      text.textContent = 'Inhale';
      breathState = 'exhale';
    } else {
      ring.style.width = '40px';
      ring.style.height = '40px';
      ring.style.boxShadow = `0 0 10px ${room.colorHex}, 0 0 30px ${room.colorHex}`;
      text.textContent = 'Exhale';
      breathState = 'inhale';
    }
  };

  const breathInterval = setInterval(breathCycle, 4000);
  breathCycle(); // trigger initial run

  const audioBtn = document.getElementById('wind-audio-btn');
  if (audioBtn) {
    audioBtn.textContent = isAudioPlaying ? 'Pause Ambient' : 'Synthesize Wind Ambient';
    audioBtn.addEventListener('click', () => {
      if (isAudioPlaying) {
        _stopLofiSynth();
        audioBtn.textContent = 'Synthesize Wind Ambient';
      } else {
        _startLofiSynth(80, 'sine'); // Deep, soothing low wind sine wave frequencies
        audioBtn.textContent = 'Pause Ambient';
      }
    });
  }

  // Cleanup pacer interval
  const obs = new MutationObserver(() => {
    if (!document.getElementById('breathing-ring')) {
      clearInterval(breathInterval);
      obs.disconnect();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
}

/* ── STAR MEET INTERACTION (ELITE DATABASE TELEMETRY) ──────── */
async function _setupStarMeetCockpit(container, room) {
  container.innerHTML = `
    <div class="cockpit-panel-card" style="display:flex; flex-direction:column; gap:16px;">
      <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em;">Elite Database Telemetry Logs</h3>
      <p style="color:rgba(255,255,255,0.45); font-size:12px; margin-top:-10px;">Direct access feed to the candidates database telemetry profile records.</p>
      
      <div id="star-records-container" style="display:flex; flex-direction:column; gap:10px; max-height:280px; overflow-y:auto; padding-right:6px;">
        <div style="text-align:center; padding:20px; font-size:12px; color:rgba(255,255,255,0.3);">Accessing database clusters...</div>
      </div>
    </div>
  `;

  // Fetch real Top candidate list
  const recordsArea = document.getElementById('star-records-container');
  try {
    const list = await fetchUserProfile('shahpalash10@gmail.com'); // query sample records or list
    if (recordsArea) {
      if (!list || list.length === 0) {
        recordsArea.innerHTML = `<div style="text-align:center; padding:20px; font-size:12px; color:rgba(255,255,255,0.2);">No elite profile entries decrypted in telemetry.</div>`;
      } else {
        recordsArea.innerHTML = list.map((c, i) => `
          <div style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.04); border-radius:8px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-family:'JetBrains Mono',monospace; font-size:10px; color:${room.colorHex}; font-weight:700; margin-right:6px;">#${i+1}</span>
              <span style="font-size:12.5px; font-weight:700; color:#fff;">Score telemetry package</span>
            </div>
            <div style="display:flex; align-items:center; gap:14px; text-align:right;">
              <div>
                <div style="font-size:13px; font-weight:800; color:${room.colorHex};">${Math.round(c.score)}</div>
                <div style="font-size:8px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">WMI</div>
              </div>
              <div>
                <div style="font-size:13px; font-weight:800; color:#fff;">${c.reactionMs}ms</div>
                <div style="font-size:8px; color:rgba(255,255,255,0.3); font-family:'JetBrains Mono',monospace;">RT</div>
              </div>
            </div>
          </div>
        `).join('');
      }
    }
  } catch(e) {
    if (recordsArea) recordsArea.innerHTML = `<div style="text-align:center; padding:20px; font-size:12px; color:#ec4899;">Decryption pipeline error. Connection timeout.</div>`;
  }
}

/* ── GLOBAL CONNECT INTERACTION (SERVER TERMINAL INTERACTIVE) ── */
function _setupGlobalCockpit(container, room) {
  container.innerHTML = `
    <div class="cockpit-panel-card" style="display:flex; flex-direction:column; gap:14px;">
      <h3 style="font-family:'JetBrains Mono',monospace; font-size:11px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em;">Global Node Terminal Pipe</h3>
      <p style="color:rgba(255,255,255,0.45); font-size:12px; margin-top:-10px;">Ping and query active server connection nodes on the 7-chain global grid.</p>

      <div id="term-logs" style="height:180px; background:#000; border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px; overflow-y:auto; font-family:'JetBrains Mono',monospace; font-size:10px; color:#38bdf8; display:flex; flex-direction:column; gap:6px; line-height:1.5;">
        <div>GRID_PING: Type command to ping connection clusters.</div>
        <div>Available nodes: [tokyo, shibuya, global_core, candidate_hub]</div>
      </div>

      <div style="display:flex; gap:10px;">
        <input type="text" id="term-input" placeholder="Enter node name (e.g. tokyo)..." style="flex:1; background:#000; border:1px solid rgba(255,255,255,0.12); border-radius:8px; padding:10px 14px; color:#fff; font-family:'JetBrains Mono',monospace; font-size:11.5px; outline:none;" />
        <button id="term-btn" style="background:${room.colorHex}; color:#000; border:none; border-radius:8px; padding:0 16px; font-size:11px; font-weight:700; cursor:pointer;">PING</button>
      </div>
    </div>
  `;

  const input = document.getElementById('term-input');
  const btn = document.getElementById('term-btn');
  const logs = document.getElementById('term-logs');

  const executePing = () => {
    if (!input || !logs) return;
    const txt = input.value.trim().toLowerCase();
    if (!txt) return;

    input.value = '';
    
    const cmdDiv = document.createElement('div');
    cmdDiv.style.color = '#fff';
    cmdDiv.textContent = `> ping ${txt}`;
    logs.appendChild(cmdDiv);

    const resDiv = document.createElement('div');
    resDiv.style.color = room.colorHex;
    
    if (['tokyo', 'shibuya', 'global_core', 'candidate_hub'].includes(txt)) {
      resDiv.innerHTML = `
        <div>SYS_PING: Connecting to node: ${txt}...</div>
        <div>[CONNECTED] telemetry response packet received in ${Math.floor(Math.random()*60)+10}ms.</div>
        <div>Packet status: 200 OK / Gravity index 0.94</div>
      `;
    } else {
      resDiv.style.color = '#ec4899';
      resDiv.textContent = `SYS_ERROR: Address resolution failed for: ${txt}. Unknown node identity.`;
    }

    logs.appendChild(resDiv);
    logs.scrollTop = logs.scrollHeight;
  };

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executePing();
    }
  });

  btn?.addEventListener('click', executePing);
}

/* ════════════════════════════════════════════════════════════
   WEB AUDIO OSCILLATOR CONTROLS
   ════════════════════════════════════════════════════════════ */
function _startLofiSynth(freq = 110, type = 'sine') {
  if (isAudioPlaying) _stopLofiSynth();

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    // Carrier oscillator
    ambientOsc = audioCtx.createOscillator();
    ambientOsc.type = type;
    ambientOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    // LFO for frequency pitch modulation (creates a warm detuned drift)
    lfo = audioCtx.createOscillator();
    lfo.frequency.setValueAtTime(0.3, audioCtx.currentTime); // 0.3 Hz drift
    lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(freq * 0.02, audioCtx.currentTime); // mod amplitude

    lfo.connect(lfoGain);
    lfoGain.connect(ambientOsc.frequency);

    // Gain node for volume damping
    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);

    // Analyser node for visualizer canvas rendering
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 64;

    ambientOsc.connect(gainNode);
    gainNode.connect(analyserNode);
    analyserNode.connect(audioCtx.destination);

    ambientOsc.start();
    lfo.start();
    isAudioPlaying = true;
  } catch(e) {
    console.warn("Native audio context failed to initialize:", e);
  }
}

function _stopLofiSynth() {
  try {
    if (ambientOsc) {
      ambientOsc.stop();
      ambientOsc.disconnect();
      ambientOsc = null;
    }
    if (lfo) {
      lfo.stop();
      lfo.disconnect();
      lfo = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    if (audioCtx) {
      audioCtx.close();
      audioCtx = null;
    }
  } catch(e) {}
  isAudioPlaying = false;
}

function getRankFromScore(composite) {
  if (composite >= 130) return { rank: 'Legend',   tier: 'star' };
  if (composite >= 115) return { rank: 'Master',   tier: 'star' };
  if (composite >= 100) return { rank: 'Diamond',  tier: 'rising' };
  if (composite >= 85)  return { rank: 'Platinum', tier: 'community' };
  if (composite >= 70)  return { rank: 'Gold',     tier: 'community' };
  return                       { rank: 'Silver',   tier: 'community' };
}
