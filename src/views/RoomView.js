/* ============================================================
   RoomView — Dedicated full-screen splitscreen chatroom cockpit
   With "Discord IRL" Voice connection, Soundboard, Member Roster,
   Markdown, and XiberBot telemetry agent.
   ============================================================ */

import { render } from '../utils/dom.js';
import { navigate, injectStyle } from '../router.js';
import { auth, db, authReady } from '../utils/firebase.js';
import { fetchUserProfile } from '../utils/worldData.js';
import { NEURO_ROOMS } from '../utils/worldStatic.js';
import { 
  collection, addDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp,
  deleteDoc, doc, getDocs, setDoc, getDoc
} from 'firebase/firestore';

// Global variables for audio state across room mounts
let audioCtx = null;
let ambientOsc = null;
let gainNode = null;
let lfo = null;
let lfoGain = null;
let analyserNode = null;
let isAudioPlaying = false;

// Voice Node global state
let isVoiceConnected = false;
let isMicrophoneMuted = false;
let isAudioMuted = false;

let localStream = null;
const peerConnections = new Map(); // peerId -> RTCPeerConnection
const queuedCandidates = new Map(); // peerId -> array of candidates
let myPeerId = null;
let voiceSignalingUnsub = null;
let voicePresenceUnsub = null;
let myPresenceDocId = null;
let chatMessagesUnsub = null;

// Cybernetic Voice DSP engine variables
let voiceEffectMode = 'normal'; // 'normal', 'cybernetic', 'space', 'android'
let audioCtxVoice = null;
let voiceSourceNode = null;
let voiceEffectNodes = []; 
let voiceDestinationNode = null;

// Neural Synapse visualizer variables
let visualizerLoopId = null;
let matrixRipples = []; 
let matrixMousePos = { x: null, y: null };


// Comprehensive TURN server list covering multiple ports/protocols
// to handle strict firewalls, symmetric NAT, and carrier-grade NAT
const COMPREHENSIVE_ICE_SERVERS = [
  // STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.relay.metered.ca:80' },
  // OpenRelay TURN (Metered public) - multiple ports and transports
  { urls: 'turn:openrelay.metered.ca:80',              username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443',             username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  { urls: 'turn:openrelay.metered.ca:80?transport=tcp',  username: 'openrelayproject', credential: 'openrelayproject' },
  // FreeTURN backup
  { urls: 'turn:freestun.net:3478', username: 'free', credential: 'free' },
  { urls: 'turn:freestun.net:5349', username: 'free', credential: 'free' },
  { urls: 'turns:freestun.net:5349', username: 'free', credential: 'free' }
];

let rtcConfig = { iceServers: COMPREHENSIVE_ICE_SERVERS };

// Update TURN config — fetches fresh short-lived Metered credentials securely via Serverless Function
async function _fetchTurnCredentials() {
  // 1. Attempt secure serverless fetch (hides API Key from network inspectors)
  try {
    console.error(`[WebRTC] Fetching fresh TURN credentials securely via /api/turn serverless endpoint...`);
    const resp = await fetch('/api/turn');
    if (resp.ok) {
      const servers = await resp.json();
      if (Array.isArray(servers) && servers.length > 0) {
        const baseStunOnly = COMPREHENSIVE_ICE_SERVERS.filter(s => !s.username);
        rtcConfig = { iceServers: [...baseStunOnly, ...servers] };
        console.error('[WebRTC] Successfully fetched fresh TURN credentials securely. Server count:', servers.length);
        return;
      }
    }
    throw new Error('Serverless response: ' + resp.status);
  } catch(err) {
    console.error('[WebRTC] Serverless fetch failed, attempting client-side fallback:', err.message);
  }

  // 2. Client-side fallback (queries Firestore configuration)
  let apiKey = 'i4yL5XoDH7g2C9Jiekj4Fk6WmqHlQvstAdgL1edPIJVky6zi';
  let domain = 'xibworld';

  try {
    const configRef = doc(db, 'system_config', 'webrtc');
    const configSnap = await getDoc(configRef);
    if (configSnap.exists()) {
      const data = configSnap.data();
      if (data.apiKey) apiKey = data.apiKey;
      if (data.domain) domain = data.domain.replace('.metered.live', '').trim();
      console.error(`[WebRTC] Fallback: Using Firestore system_config/webrtc overrides.`);
    }
  } catch (e) {
    console.error('[WebRTC] Fallback: Custom config fetch error, using defaults:', e.message);
  }

  try {
    const resp = await fetch(
      `https://${domain}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    );
    if (resp.ok) {
      const servers = await resp.json();
      if (Array.isArray(servers) && servers.length > 0) {
        const baseStunOnly = COMPREHENSIVE_ICE_SERVERS.filter(s => !s.username);
        rtcConfig = { iceServers: [...baseStunOnly, ...servers] };
        console.error('[WebRTC] Fallback: Successfully fetched credentials from Metered API. Server count:', servers.length);
        return;
      }
    }
    throw new Error('Status ' + resp.status);
  } catch(e) {
    console.error('[WebRTC] Fallback: Metered API fetch failed, using static public pool:', e.message);
    rtcConfig = { iceServers: COMPREHENSIVE_ICE_SERVERS };
  }
}




export async function RoomView(params = {}) {
  await authReady;
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    navigate('');
    return;
  }

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

  const myRoomPresenceId = auth.currentUser.uid + '_' + roomId;

  const registerRoomPresence = async (activityStatus = 'Active in cockpit') => {
    try {
      await setDoc(doc(db, 'room_presence', myRoomPresenceId), {
        roomId,
        userId: auth.currentUser.uid,
        email: auth.currentUser.email,
        handle: '@' + auth.currentUser.email.split('@')[0],
        name: auth.currentUser.displayName || 'Gamer',
        photo: auth.currentUser.photoURL || '',
        status: activityStatus,
        rank: userRank,
        joinedAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Presence registration failed:", e);
    }
  };

  window._updateMyRoomPresence = registerRoomPresence;

  // Inject CSS animations & game styling
  injectStyle(`
    @keyframes wld-pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.2);opacity:0} }
    @keyframes wld-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @keyframes wld-reaction-float {
      0% { transform: translateY(0) scale(0.8) rotate(0deg); opacity: 1; }
      100% { transform: translateY(-320px) scale(1.5) rotate(var(--rot)); opacity: 0; }
    }
    @keyframes speak-ring-pulse {
      0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(56, 189, 248, 0); }
      100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
    }
    .speaking-avatar {
      animation: speak-ring-pulse 1.2s infinite;
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
    .sfx-btn {
      background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
      border-radius: 8px; padding: 10px; color: rgba(255,255,255,0.7); font-size: 11px;
      font-family: 'JetBrains Mono', monospace; cursor: pointer; transition: all 0.15s;
      text-align: center; display: flex; flex-direction: column; gap: 4px; align-items: center;
    }
    .sfx-btn:hover {
      background: ${room.colorHex}15; border-color: ${room.colorHex}; color: #fff;
      transform: translateY(-2px); box-shadow: 0 4px 12px ${room.colorHex}15;
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

  // Render the full screen layouts (Three-Column splitscreen)
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
              <span style="font-family:'JetBrains Mono',monospace; font-size:9.5px; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.06em;">COGNITIVE STATE training grounds · ${room.online} active channels</span>
            </div>
          </div>
        </div>
        
        <div style="display:flex; align-items:center; gap:16px;">
          <!-- Collapsible Member Toggle -->
          <button id="member-sidebar-toggle" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:6px 12px; font-family:'JetBrains Mono',monospace; font-size:10px; color:#fff; cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.background='rgba(255,255,255,0.08)';" onmouseleave="this.style.background='rgba(255,255,255,0.04)';">
            👥 ROSTER
          </button>
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

      <!-- THREE-COLUMN DISCORD IRL LAYOUT CONTAINER -->
      <div style="flex:1; display:flex; overflow:hidden;">
        
        <!-- COLUMN 1: LIVE CHAT STREAM -->
        <div style="width:380px; border-right:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; background:rgba(8,8,11,0.45); flex-shrink:0;">
          
          <!-- Active Logs Header -->
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
          <div id="reactions-float-area" style="position:absolute; bottom:200px; left:260px; width:80px; height:200px; pointer-events:none; overflow:hidden; z-index:9300;"></div>

          <!-- Reactions Emoji Selector -->
          <div style="padding:8px 20px; background:rgba(10,10,12,0.4); border-top:1px solid rgba(255,255,255,0.04); display:flex; align-items:center; gap:8px; flex-shrink:0;">
            <span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.25); text-transform:uppercase; letter-spacing:0.05em; margin-right:4px;">REACTION:</span>
            <div style="display:flex; gap:6px;">
              ${['🔥', '🧠', '⚡', '👑', '🎯'].map(emoji => `
                <button class="chat-react-btn" data-emoji="${emoji}" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:6px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:12px; cursor:pointer; transition:all 0.15s;" onmouseenter="this.style.background='rgba(255,255,255,0.1)';" onmouseleave="this.style.background='rgba(255,255,255,0.03)';">${emoji}</button>
              `).join('')}
            </div>
          </div>

          <!-- Message input console -->
          <div style="padding:12px 20px; border-top:1px solid rgba(255,255,255,0.08); background:rgba(10,10,12,0.9); display:flex; align-items:center; gap:10px; flex-shrink:0;">
            <input type="text" id="chat-input" placeholder="Type message... (e.g. /bot status)" style="flex:1; background:#000; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:10px 14px; color:#fff; font-family:'Space Grotesk',sans-serif; font-size:12px; outline:none;" />
            <button id="chat-send-btn" style="background:${room.colorHex}; color:#fff; border:none; border-radius:10px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>

          <!-- DISCORD VOICE PANEL WIDGET -->
          <div id="voice-node-panel" style="padding:12px 20px; background:rgba(13,13,18,0.95); border-top:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; gap:10px; flex-shrink:0;">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:8px; height:8px; border-radius:50%; background:rgba(255,255,255,0.15);" id="voice-signal-dot"></div>
                <div>
                  <div style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.04em;">Telemetry Voice</div>
                  <div style="font-size:11.5px; font-weight:700; color:rgba(255,255,255,0.4);" id="voice-status-text">Disconnected</div>
                </div>
              </div>
              <button id="voice-connect-btn" class="cockpit-tab-btn" style="padding:6px 12px; font-size:9.5px; border-color:${room.colorHex}; color:#fff; background:${room.colorHex}12;">Join Voice</button>
            </div>
            
            <!-- Voice action bar (visible when connected) -->
            <div id="voice-action-bar" style="display:none; flex-direction:column; gap:8px; border-top:1px solid rgba(255,255,255,0.04); padding-top:8px; margin-top:2px;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; gap:12px;">
                  <button id="voice-mute-mic" style="background:transparent; border:none; color:rgba(255,255,255,0.5); cursor:pointer; font-size:12px;">🎙️ Mute</button>
                  <button id="voice-mute-audio" style="background:transparent; border:none; color:rgba(255,255,255,0.5); cursor:pointer; font-size:12px;">🎧 Deafen</button>
                </div>
                <span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:#10b981;">PING: 18ms</span>
              </div>
              
              <!-- DYNAMIC CYBERNETIC VOICE MODULATOR CONTROLS -->
              <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.25); padding:6px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.04);">
                <span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.35); text-transform:uppercase; letter-spacing:0.04em;">VOICE MODULATOR:</span>
                <select id="voice-effect-select" style="background:#000; color:${room.colorHex}; border:1px solid rgba(255,255,255,0.1); border-radius:4px; font-family:'JetBrains Mono',monospace; font-size:9.5px; padding:2px 6px; outline:none; cursor:pointer;">
                  <option value="normal">NORMAL</option>
                  <option value="cybernetic">CYBERNETIC</option>
                  <option value="space">DEEP SPACE</option>
                  <option value="android">ANDROID</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        <!-- COLUMN 2: CENTER COCKPIT & NEURO GAME DECK -->
        <main style="flex:1; padding:28px 24px; overflow-y:auto; background:#07070a; display:flex; flex-direction:column; gap:20px; position:relative; overflow-x:hidden;">
          
          <!-- HOLOGRAPHIC NEURAL MATRIX BACKGROUND CANVAS -->
          <canvas id="neural-matrix-canvas" style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none; opacity:0.18; z-index:1;"></canvas>

          <!-- COCKPIT CONTROL CENTRE DYNAMIC WORKSPACE -->
          <div id="cockpit-workspace" class="wld-fade-up" style="position:relative; z-index:2;">
            <!-- Dynamically populated by room features -->
            <!-- Dynamically populated by room features -->
          </div>

          <!-- SYNCHRONIZED Web Audio SOUNDBOARD -->
          <div class="cockpit-panel-card" style="position:relative; z-index:2;">
            <h3 style="font-family:'JetBrains Mono',monospace; font-size:10px; text-transform:uppercase; color:${room.colorHex}; letter-spacing:0.12em; margin-bottom:12px;">global telemetry soundboard</h3>
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px;">
              <button class="sfx-btn" data-sfx="correct">
                <span>🔊</span>
                <span>Neuro Resonance</span>
              </button>
              <button class="sfx-btn" data-sfx="incorrect">
                <span>🚨</span>
                <span>Security Alert</span>
              </button>
              <button class="sfx-btn" data-sfx="start">
                <span>📡</span>
                <span>Quantum Ping</span>
              </button>
              <button class="sfx-btn" data-sfx="complete">
                <span>🧬</span>
                <span>Cognitive Synapse</span>
              </button>
              <button class="sfx-btn" data-sfx="flow">
                <span>🎐</span>
                <span>Flow Drone</span>
              </button>
            </div>
          </div>

        </main>

        <!-- COLUMN 3: RIGHT COLLAPSIBLE MEMBER SIDEBAR -->
        <div id="member-sidebar" style="width:240px; border-left:1px solid rgba(255,255,255,0.06); background:rgba(8,8,11,0.5); display:flex; flex-direction:column; transition:width 0.25s; overflow:hidden;">
          <div style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.04); font-family:'JetBrains Mono',monospace; font-size:9px; text-transform:uppercase; color:rgba(255,255,255,0.4); letter-spacing:0.08em;">
            CANDIDATE DIRECTORY
          </div>
          
          <div id="member-roster-list" style="flex:1; padding:16px; overflow-y:auto; display:flex; flex-direction:column; gap:14px;">
            <!-- Active Candidates -->
            <div>
              <div style="font-size:9.5px; font-family:'JetBrains Mono',monospace; color:rgba(255,255,255,0.3); text-transform:uppercase; margin-bottom:8px;">online — 2</div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                
                <div style="display:flex; align-items:center; justify-content:space-between;" id="roster-me-row">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="position:relative;">
                      ${auth.currentUser?.photoURL 
                        ? `<img id="roster-me-img" src="${auth.currentUser.photoURL}" style="width:28px; height:28px; border-radius:50%; border:1px solid ${room.colorHex};" />`
                        : `<div id="roster-me-div" style="width:28px; height:28px; border-radius:50%; background:${room.colorHex}22; border:1px solid ${room.colorHex}; display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:700; font-size:10px; color:${room.colorHex};">${(auth.currentUser?.displayName || 'P')[0].toUpperCase()}</div>`
                      }
                      <div style="position:absolute; bottom:-2px; right:-2px; width:8px; height:8px; border-radius:50%; background:#10b981; border:1.5px solid #050508;"></div>
                    </div>
                    <div>
                      <div style="font-size:11.5px; font-weight:700; color:#fff;">@${(auth.currentUser?.email || 'player').split('@')[0]}</div>
                      <div style="font-size:8.5px; color:rgba(255,255,255,0.35);" id="roster-me-activity">Active in cockpit</div>
                    </div>
                  </div>
                  <span style="font-family:'JetBrains Mono',monospace; font-size:8px; padding:1px 4px; border-radius:3px; background:${room.colorHex}15; border:1px solid ${room.colorHex}33; color:${room.colorHex}; font-weight:700;">${userRank}</span>
                </div>

                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="position:relative;">
                      <div style="width:28px; height:28px; border-radius:50%; background:#ec489922; border:1px solid #ec4899; display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:700; font-size:10px; color:#ec4899;">A</div>
                      <div style="position:absolute; bottom:-2px; right:-2px; width:8px; height:8px; border-radius:50%; background:#10b981; border:1.5px solid #050508;"></div>
                    </div>
                    <div>
                      <div style="font-size:11.5px; font-weight:700; color:rgba(255,255,255,0.85);">@alex_xib</div>
                      <div style="font-size:8.5px; color:rgba(255,255,255,0.35);">Playing Speed Search</div>
                    </div>
                  </div>
                  <span style="font-family:'JetBrains Mono',monospace; font-size:8px; padding:1px 4px; border-radius:3px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.5);">Guest</span>
                </div>

              </div>
            </div>

            <!-- Bot Core Agents -->
            <div>
              <div style="font-size:9.5px; font-family:'JetBrains Mono',monospace; color:rgba(255,255,255,0.3); text-transform:uppercase; margin-bottom:8px;">ai core bots — 1</div>
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="position:relative;">
                    <div style="width:28px; height:28px; border-radius:50%; background:#2563eb22; border:1px solid #2563eb; display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:700; font-size:10px; color:#2563eb;">🤖</div>
                    <div style="position:absolute; bottom:-2px; right:-2px; width:8px; height:8px; border-radius:50%; background:#10b981; border:1.5px solid #050508;"></div>
                  </div>
                  <div>
                    <div style="font-size:11.5px; font-weight:700; color:#fff; display:flex; align-items:center; gap:4px;">
                      XiberBot
                      <span style="font-family:'JetBrains Mono',monospace; font-size:7px; background:#2563eb; color:#fff; padding:1px 3px; border-radius:3px; font-weight:700;">BOT</span>
                    </div>
                    <div style="font-size:8.5px; color:rgba(255,255,255,0.35);">Listening to commands</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  `);

  // Collapsible member sidebar toggle
  const sidebar = document.getElementById('member-sidebar');
  const toggleBtn = document.getElementById('member-sidebar-toggle');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      const isCollapsed = sidebar.style.width === '0px';
      sidebar.style.width = isCollapsed ? '240px' : '0px';
    });
  }

  // Handle tab closing / browser exit safely
  const handleUnload = () => {
    deleteDoc(doc(db, 'room_presence', myRoomPresenceId));
  };
  window.addEventListener('beforeunload', handleUnload);

  // Hook back button to router world
  document.getElementById('room-back-btn')?.addEventListener('click', async () => {
    window.removeEventListener('beforeunload', handleUnload);
    // Unsubscribe from chat stream
    if (window._roomChatUnsubscribe) {
      window._roomChatUnsubscribe();
      window._roomChatUnsubscribe = null;
    }
    // Unsubscribe from room presence
    if (window._roomPresenceUnsubscribe) {
      window._roomPresenceUnsubscribe();
      window._roomPresenceUnsubscribe = null;
    }
    // Delete room presence from DB
    try {
      await deleteDoc(doc(db, 'room_presence', myRoomPresenceId));
    } catch(e) {}

    // Disconnect from WebRTC voice channel
    _disconnectFromVoiceChannel();
    // Stop Web Audio synth on exit
    _stopLofiSynth();
    navigate('world');
  });

  // Initial presence registration
  registerRoomPresence();

  // Listen to room presence in real-time
  const qPresence = query(
    collection(db, 'room_presence'),
    where('roomId', '==', roomId)
  );

  const presenceUnsub = onSnapshot(qPresence, (snapshot) => {
    const peers = [];
    snapshot.forEach(doc => {
      peers.push({ id: doc.id, ...doc.data() });
    });
    _renderRosterList(peers, room);
  });

  window._roomPresenceUnsubscribe = presenceUnsub;

  // Setup Discord-IRL Voice connection
  _initVoiceNode(room);

  // Setup Chat real-time streams
  _initChatTelemetry(room, userScore, userRank);

  // Setup Cockpit Activities
  _initCockpitActivity(room);

  // Setup soundboard SFX buttons
  _initSoundboardButtons(room, userRank);

  // Initialize background interactive Neural Matrix
  _initNeuralMatrix(room.colorHex);

  // Unmount listener: clean up room presence, voice, and chat when leaving this view
  const handleRoomUnmount = () => {
    if (!window.location.hash.startsWith('#/room')) {
      console.error("[WebRTC] Unmounting RoomView. Executing cleanup routine...");
      
      // Stop Matrix Visualizer
      if (visualizerLoopId) {
        cancelAnimationFrame(visualizerLoopId);
        visualizerLoopId = null;
      }

      // 1. Unsubscribe from roster presence updates
      if (window._roomPresenceUnsubscribe) {
        window._roomPresenceUnsubscribe();
        window._roomPresenceUnsubscribe = null;
      }

      // 2. Unsubscribe from chat updates
      if (chatMessagesUnsub) {
        chatMessagesUnsub();
        chatMessagesUnsub = null;
      }
      
      // 3. Delete room presence database entry
      try {
        deleteDoc(doc(db, 'room_presence', myRoomPresenceId));
      } catch (e) {
        console.error("[WebRTC] Error deleting room presence on unmount:", e);
      }

      // 4. Disconnect from voice channel (closes RTCPeerConnections, terminates streams, deletes voice presence doc)
      _disconnectFromVoiceChannel();

      // 5. Turn off synths
      _stopLofiSynth();

      // 6. Clean up unmount hook
      window.removeEventListener('hashchange', handleRoomUnmount);
    }
  };
  window.addEventListener('hashchange', handleRoomUnmount);
}

/* ════════════════════════════════════════════════════════════
   DISCORD-IRL VOICE TELEMETRY PIPE
   ════════════════════════════════════════════════════════════ */
function _initVoiceNode(room) {
  const connectBtn = document.getElementById('voice-connect-btn');
  const signalDot = document.getElementById('voice-signal-dot');
  const statusText = document.getElementById('voice-status-text');
  const actionBar = document.getElementById('voice-action-bar');
  const muteMic = document.getElementById('voice-mute-mic');
  const muteAudio = document.getElementById('voice-mute-audio');
  const rosterMeAvatar = document.getElementById('roster-me-img') || document.getElementById('roster-me-div');

  const updateVoiceUI = () => {
    if (isVoiceConnected) {
      connectBtn.textContent = 'Disconnect';
      connectBtn.style.background = '#ef444422';
      connectBtn.style.borderColor = '#ef4444';
      if (statusText) {
        statusText.textContent = 'Voice Connected';
        statusText.style.color = '#10b981';
      }
      if (signalDot) {
        signalDot.style.background = '#10b981';
        signalDot.style.boxShadow = '0 0 10px #10b981';
      }
      if (actionBar) actionBar.style.display = 'flex';
      
      if (rosterMeAvatar) {
        rosterMeAvatar.classList.add('speaking-avatar');
        rosterMeAvatar.style.borderColor = '#38bdf8';
      }
    } else {
      connectBtn.textContent = 'Join Voice';
      connectBtn.style.background = `${room.colorHex}12`;
      connectBtn.style.borderColor = room.colorHex;
      if (statusText) {
        statusText.textContent = 'Disconnected';
        statusText.style.color = 'rgba(255,255,255,0.4)';
      }
      if (signalDot) {
        signalDot.style.background = 'rgba(255,255,255,0.15)';
        signalDot.style.boxShadow = 'none';
      }
      if (actionBar) actionBar.style.display = 'none';
      
      if (rosterMeAvatar) {
        rosterMeAvatar.classList.remove('speaking-avatar');
        rosterMeAvatar.style.borderColor = room.colorHex;
      }
    }
  };

  updateVoiceUI();

  if (isMicrophoneMuted) {
    muteMic.textContent = '🎙️ Unmute';
    muteMic.style.color = '#ef4444';
  }
  if (isAudioMuted) {
    muteAudio.textContent = '🎧 Undeafen';
    muteAudio.style.color = '#ef4444';
  }

  connectBtn?.addEventListener('click', async () => {
    isVoiceConnected = !isVoiceConnected;
    
    if (isVoiceConnected) {
      await _connectToVoiceChannel(room);
      if (window._updateMyRoomPresence) {
        window._updateMyRoomPresence('🔊 Voice Connected');
      }
    } else {
      await _disconnectFromVoiceChannel();
      if (window._updateMyRoomPresence) {
        window._updateMyRoomPresence('Active in cockpit');
      }
    }

    updateVoiceUI();
  });

  muteMic?.addEventListener('click', () => {
    isMicrophoneMuted = !isMicrophoneMuted;
    muteMic.textContent = isMicrophoneMuted ? '🎙️ Unmute' : '🎙️ Mute';
    muteMic.style.color = isMicrophoneMuted ? '#ef4444' : 'rgba(255,255,255,0.5)';
    
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !isMicrophoneMuted);
    }
  });

  muteAudio?.addEventListener('click', () => {
    isAudioMuted = !isAudioMuted;
    muteAudio.textContent = isAudioMuted ? '🎧 Undeafen' : '🎧 Deafen';
    muteAudio.style.color = isAudioMuted ? '#ef4444' : 'rgba(255,255,255,0.5)';

    peerConnections.forEach((pc, peerId) => {
      const audioEl = document.getElementById(`audio-remote-${peerId}`);
      if (audioEl) {
        audioEl.muted = isAudioMuted;
      }
    });
  });

  const effectSelect = document.getElementById('voice-effect-select');
  if (effectSelect) {
    effectSelect.value = voiceEffectMode;
    effectSelect.addEventListener('change', (e) => {
      voiceEffectMode = e.target.value;
      _applyVoiceDSPChain();
      _spawnMatrixRipple(window.innerWidth / 2, window.innerHeight / 2, 220, room.colorHex);
    });
  }
}


/* ════════════════════════════════════════════════════════════
   WebRTC CONNECTION AND SIGNALING IMPLEMENTATION
   ════════════════════════════════════════════════════════════ */
async function _connectToVoiceChannel(room) {
  // Fetch fresh TURN credentials before every connection attempt
  await _fetchTurnCredentials();

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    
    // Initialize Voice DSP Modulator
    _initVoiceDSP(localStream);

    _playNeuroSound('start');
    if (isMicrophoneMuted) {
      localStream.getAudioTracks().forEach(track => track.enabled = false);
    }
  } catch (err) {
    console.error("Microphone access denied:", err);
    _playNeuroSound('incorrect');
    alert("Microphone permission denied. Voice chat cannot connect.");
    isVoiceConnected = false;
    const connectBtn = document.getElementById('voice-connect-btn');
    if (connectBtn) {
      connectBtn.textContent = 'Join Voice';
      connectBtn.style.background = `${room.colorHex}12`;
      connectBtn.style.borderColor = room.colorHex;
    }
    const statusText = document.getElementById('voice-status-text');
    if (statusText) {
      statusText.textContent = 'Mic Blocked';
      statusText.style.color = '#ef4444';
    }
    return;
  }

  myPeerId = auth.currentUser.uid + '_' + Math.random().toString(36).slice(2, 6);

  try {
    const docRef = await addDoc(collection(db, 'room_voice_presence'), {
      roomId: room.id,
      peerId: myPeerId,
      userId: auth.currentUser.uid,
      email: auth.currentUser.email,
      handle: '@' + auth.currentUser.email.split('@')[0],
      name: auth.currentUser.displayName || 'Gamer',
      joinedAt: serverTimestamp()
    });
    myPresenceDocId = docRef.id;
  } catch (err) {
    console.error("Error setting presence:", err);
  }

  const sigQuery = query(
    collection(db, 'room_voice_signaling'),
    where('to', '==', myPeerId)
  );

  voiceSignalingUnsub = onSnapshot(sigQuery, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const sig = change.doc.data();
        const docId = change.doc.id;
        
        try {
          await deleteDoc(doc(db, 'room_voice_signaling', docId));
        } catch (e) {}

        if (sig.type === 'offer') {
          await _handleOffer(sig.from, sig.sdp);
        } else if (sig.type === 'answer') {
          await _handleAnswer(sig.from, sig.sdp);
        } else if (sig.type === 'candidate') {
          await _handleCandidate(sig.from, sig.candidate);
        }
      }
    });
  });

  const presQuery = query(
    collection(db, 'room_voice_presence'),
    where('roomId', '==', room.id)
  );

  voicePresenceUnsub = onSnapshot(presQuery, async (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      const peer = change.doc.data();
      if (peer.peerId === myPeerId) return;

      if (change.type === 'added') {
        if (myPeerId > peer.peerId) {
          if (!peerConnections.has(peer.peerId)) {
            await _initiateConnection(peer.peerId);
          }
        }
      } else if (change.type === 'removed') {
        _closePeerConnection(peer.peerId);
      }
    });
  });
}

async function _disconnectFromVoiceChannel() {
  _playNeuroSound('incorrect');

  if (voiceSignalingUnsub) {
    voiceSignalingUnsub();
    voiceSignalingUnsub = null;
  }
  if (voicePresenceUnsub) {
    voicePresenceUnsub();
    voicePresenceUnsub = null;
  }

  if (myPresenceDocId) {
    try {
      await deleteDoc(doc(db, 'room_voice_presence', myPresenceDocId));
    } catch (e) {}
    myPresenceDocId = null;
  }

  peerConnections.forEach((pc, peerId) => {
    _closePeerConnection(peerId);
  });
  peerConnections.clear();
  queuedCandidates.clear();

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  // Clean up Voice DSP Engine
  if (audioCtxVoice) {
    try {
      if (voiceSourceNode) voiceSourceNode.disconnect();
      voiceEffectNodes.forEach(node => {
        try { node.disconnect(); } catch(e){}
        try { node.stop(); } catch(e){}
      });
      voiceEffectNodes = [];
      audioCtxVoice.close();
    } catch(e) {}
    audioCtxVoice = null;
    voiceSourceNode = null;
    voiceDestinationNode = null;
  }

  myPeerId = null;
}


function _createPeerConnection(peerId) {
  const pc = new RTCPeerConnection(rtcConfig);
  peerConnections.set(peerId, pc);

  const outboundStream = (voiceDestinationNode) ? voiceDestinationNode.stream : localStream;
  outboundStream.getTracks().forEach(track => pc.addTrack(track, outboundStream));

  pc.ontrack = (event) => {
    console.error(`[WebRTC] Received remote track from ${peerId}:`, event.track.kind);
    let remoteStream = event.streams[0];
    if (!remoteStream) {
      console.error(`[WebRTC] event.streams is empty, fallback to creating new MediaStream for remote track`);
      remoteStream = new MediaStream();
      remoteStream.addTrack(event.track);
    }
    
    let audioEl = document.getElementById(`audio-remote-${peerId}`);
    if (!audioEl) {
      audioEl = document.createElement('audio');
      audioEl.id = `audio-remote-${peerId}`;
      audioEl.autoplay = true;
      audioEl.playsInline = true;
      audioEl.muted = isAudioMuted;
      document.body.appendChild(audioEl);
    }
    audioEl.srcObject = remoteStream;
    audioEl.play().catch(e => console.error("[WebRTC] Remote stream play blocked:", e));
  };

  pc.onicecandidate = async (event) => {
    if (event.candidate && myPeerId) {
      console.error(`[WebRTC] Gathered local candidate for peer ${peerId}:`, event.candidate.candidate);
      try {
        await addDoc(collection(db, 'room_voice_signaling'), {
          from: myPeerId,
          to: peerId,
          type: 'candidate',
          candidate: event.candidate.toJSON(),
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.error("[WebRTC] Error saving local candidate to DB:", e);
      }
    }
  };

  pc.onconnectionstatechange = () => {
    console.error(`[WebRTC] Connection state with ${peerId} changed to: ${pc.connectionState}`);
    if (pc.connectionState === 'closed') {
      _closePeerConnection(peerId);
    }
    if (pc.connectionState === 'failed') {
      console.error(`[WebRTC] Connection FAILED with ${peerId}. Attempting ICE restart...`);
      pc.restartIce();
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.error(`[WebRTC] ICE connection state with ${peerId}: ${pc.iceConnectionState}`);
  };

  pc.onicegatheringstatechange = () => {
    console.error(`[WebRTC] ICE gathering state with ${peerId}: ${pc.iceGatheringState}`);
  };

  return pc;
}

async function _initiateConnection(peerId) {
  console.error(`[WebRTC] Initiating P2P connection to peer: ${peerId}`);
  console.error(`[WebRTC] Using ICE servers:`, JSON.stringify(rtcConfig.iceServers.map(s => s.urls)));
  const pc = _createPeerConnection(peerId);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  try {
    await addDoc(collection(db, 'room_voice_signaling'), {
      from: myPeerId,
      to: peerId,
      type: 'offer',
      sdp: offer.sdp,
      createdAt: serverTimestamp()
    });
    console.error(`[WebRTC] Offer SDP successfully posted to DB for ${peerId}`);
  } catch (e) {
    console.error("[WebRTC] Error sending offer SDP:", e);
  }
}

async function _processQueuedCandidates(peerId, pc) {
  const queue = queuedCandidates.get(peerId);
  if (queue) {
    console.error(`[WebRTC] Draining and applying ${queue.length} queued ICE candidates for ${peerId}`);
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
        console.error(`[WebRTC] Successfully applied queued ICE candidate for ${peerId}`);
      } catch (e) {
        console.error("[WebRTC] Error adding queued ICE candidate:", e);
      }
    }
    queuedCandidates.delete(peerId);
  }
}

async function _handleOffer(peerId, sdp) {
  console.error(`[WebRTC] Received offer SDP from peer: ${peerId}`);
  let pc = peerConnections.get(peerId);
  if (!pc) {
    pc = _createPeerConnection(peerId);
  }

  await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  try {
    await addDoc(collection(db, 'room_voice_signaling'), {
      from: myPeerId,
      to: peerId,
      type: 'answer',
      sdp: answer.sdp,
      createdAt: serverTimestamp()
    });
    console.error(`[WebRTC] Answer SDP successfully posted to DB for ${peerId}`);
  } catch (e) {
    console.error("[WebRTC] Error sending answer SDP:", e);
  }

  await _processQueuedCandidates(peerId, pc);
}

async function _handleAnswer(peerId, sdp) {
  console.error(`[WebRTC] Received answer SDP from peer: ${peerId}`);
  const pc = peerConnections.get(peerId);
  if (pc) {
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
    console.error(`[WebRTC] Applied remote answer description from ${peerId}`);
    await _processQueuedCandidates(peerId, pc);
  }
}

async function _handleCandidate(peerId, candidate) {
  const pc = peerConnections.get(peerId);
  if (pc && pc.remoteDescription) {
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.error(`[WebRTC] Successfully applied remote candidate from ${peerId}`);
    } catch (e) {
      console.error("[WebRTC] Error adding direct remote ICE candidate:", e);
    }
  } else {
    console.error(`[WebRTC] Queued remote candidate from ${peerId} (remoteDesc is null)`);
    if (!queuedCandidates.has(peerId)) {
      queuedCandidates.set(peerId, []);
    }
    queuedCandidates.get(peerId).push(candidate);
  }
}

function _closePeerConnection(peerId) {
  const pc = peerConnections.get(peerId);
  if (pc) {
    pc.close();
    peerConnections.delete(peerId);
  }
  queuedCandidates.delete(peerId);

  const audioEl = document.getElementById(`audio-remote-${peerId}`);
  if (audioEl) {
    audioEl.srcObject = null;
    audioEl.remove();
  }
}

/* ════════════════════════════════════════════════════════════
   SYNCHRONIZED WEB AUDIO SOUNDBOARD
   ════════════════════════════════════════════════════════════ */
function _initSoundboardButtons(room, userRank) {
  document.querySelectorAll('.sfx-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const sfx = btn.getAttribute('data-sfx');
      if (!sfx) return;

      // Trigger local synthesis immediately
      _playNeuroSound(sfx);

      // Broadcast globally over Firestore chat stream (sfx document type)
      try {
        await addDoc(collection(db, 'chatroom_messages'), {
          roomId: room.id,
          senderId: auth.currentUser?.uid || 'anonymous',
          senderName: auth.currentUser?.displayName || 'Gamer',
          senderEmail: auth.currentUser?.email || '',
          senderHandle: '@' + (auth.currentUser?.email || 'player').split('@')[0],
          senderPhoto: auth.currentUser?.photoURL || '',
          senderScore: null,
          senderRank: userRank,
          content: sfx,
          type: 'sfx',
          createdAt: serverTimestamp()
        });
      } catch (e) {}
    });
  });
}

/* ════════════════════════════════════════════════════════════
   FIRESTORE REAL-TIME CHAT & MARKDOWN
   ════════════════════════════════════════════════════════════ */
function _initChatTelemetry(room, userScore, userRank) {
  const container = document.getElementById('chat-messages-container');
  const scrollArea = document.getElementById('wld-chat-messages');

  const q = query(
    collection(db, 'chatroom_messages'),
    orderBy('createdAt', 'desc'),
    limit(150)
  );

  if (chatMessagesUnsub) {
    chatMessagesUnsub();
    chatMessagesUnsub = null;
  }

  chatMessagesUnsub = onSnapshot(q, (snapshot) => {
    // Dynamically trigger matrix ripples on incoming packages
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const msg = change.doc.data();
        if (msg.roomId === room.id) {
          _spawnMatrixRipple(
            Math.random() * window.innerWidth / 3 + window.innerWidth / 6,
            Math.random() * window.innerHeight / 3 + window.innerHeight / 6,
            msg.type === 'reaction' ? 180 : msg.type === 'sfx' ? 240 : 200,
            room.colorHex
          );
        }
      }
    });

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
      if (m.senderName && m.senderHandle && m.type !== 'sfx') {
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
        // Handle floating reactions
        if (msg.type === 'reaction') {
          _spawnFloatingReaction(msg.content);
          return;
        }

        // Handle synchronized soundboard sfx
        if (msg.type === 'sfx') {
          // Play sfx if sender is NOT me (we already play it on click for zero latency)
          const isMe = msg.senderEmail === auth.currentUser?.email;
          if (!isMe && !isAudioMuted) {
            _playNeuroSound(msg.content);
          }
          
          // Flash speaking outline on roster list avatar if matches
          const rosterUserRow = document.getElementById(isMe ? 'roster-me-row' : '');
          if (rosterUserRow) {
            const avatar = rosterUserRow.querySelector('img') || rosterUserRow.querySelector('div');
            if (avatar) {
              avatar.classList.add('speaking-avatar');
              avatar.style.borderColor = '#10b981';
              setTimeout(() => {
                avatar.classList.remove('speaking-avatar');
                avatar.style.borderColor = isMe ? room.colorHex : 'rgba(255,255,255,0.3)';
              }, 1200);
            }
          }
          return;
        }

        const isMe = msg.senderEmail === auth.currentUser?.email;
        const isBot = msg.senderId === 'xiberbot';
        
        const timeStr = msg.createdAt 
          ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
          : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const badgeCol = isBot ? '#2563eb' : msg.senderRank === 'Legend' ? '#7c3aed' : msg.senderRank === 'Master' ? '#d4ff00' : msg.senderRank === 'Diamond' ? '#2563eb' : 'rgba(255,255,255,0.3)';
        const scoreBadge = isBot 
          ? `<span style="font-family:'JetBrains Mono',monospace; font-size:7px; background:#2563eb; color:#fff; padding:1px 3px; border-radius:3px; font-weight:700; vertical-align:middle; margin-left:4px;">BOT</span>`
          : msg.senderScore 
            ? `<span style="font-family:'JetBrains Mono',monospace; font-size:8.5px; padding:1px 5px; border-radius:3px; background:${badgeCol}14; border:1px solid ${badgeCol}33; color:${badgeCol}; vertical-align:middle; margin-left:4px; font-weight:700;">WMI ${msg.senderScore}</span>` 
            : `<span style="font-family:'JetBrains Mono',monospace; font-size:8.5px; padding:1px 5px; border-radius:3px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.3); vertical-align:middle; margin-left:4px;">GUEST</span>`;

        html += `
          <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; gap:4px; max-width:85%; align-self:${isMe ? 'flex-end' : 'flex-start'};">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-family:'Space Grotesk',sans-serif; font-size:11px; font-weight:700; color:${isBot ? '#38bdf8' : isMe ? room.colorHex : 'rgba(255,255,255,0.7)'};">${msg.senderHandle}</span>
              ${scoreBadge}
              <span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.2);">${timeStr}</span>
            </div>
            <div style="
              background:${isBot ? 'rgba(37,99,235,0.08)' : isMe ? `${room.colorHex}15` : 'rgba(255,255,255,0.04)'};
              border:1px solid ${isBot ? 'rgba(37,99,235,0.2)' : isMe ? `${room.colorHex}33` : 'rgba(255,255,255,0.08)'};
              border-radius:${isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px'};
              padding:10px 14px; color:${isBot ? '#e0f2fe' : '#fff'}; font-size:12.5px; line-height:1.45; word-break:break-word;
              box-shadow:inset 0 1px 0 rgba(255,255,255,0.03);
            ">
              ${_parseMarkdown(msg.content)}
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

  window._roomChatUnsubscribe = chatMessagesUnsub;

  // Send message handlers
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  const sendMessage = async () => {
    if (!input) return;
    const txt = input.value.trim();
    if (!txt) return;

    input.value = '';
    input.focus();

    // Check if it's a bot command
    const isBotCommand = txt.startsWith('/bot ') || txt === '/bot';

    try {
      // 1. Post candidate's message
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

      // 2. Intercept and run XiberBot response
      if (isBotCommand) {
        _playNeuroSound('correct');
        const cmd = txt.replace('/bot', '').trim();
        setTimeout(async () => {
          const botResponse = _getXiberBotResponse(cmd, userScore);
          await addDoc(collection(db, 'chatroom_messages'), {
            roomId: room.id,
            senderId: 'xiberbot',
            senderName: 'XiberBot [BOT]',
            senderEmail: '',
            senderHandle: 'XiberBot',
            senderPhoto: '',
            senderScore: 130,
            senderRank: 'Legend',
            content: botResponse,
            type: 'text',
            createdAt: serverTimestamp()
          });
        }, 1200);
      }

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

/* ── CUSTOM CHAT MARKDOWN PARSER ── */
function _parseMarkdown(text) {
  if (!text) return '';
  let parsed = text;
  
  // HTML sanitise basic tag blocks
  parsed = parsed.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Bold (**text**)
  parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic (*text*)
  parsed = parsed.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Code (`code`)
  parsed = parsed.replace(/`(.*?)`/g, '<code style="font-family:\'JetBrains Mono\', monospace; background:rgba(255,255,255,0.06); padding:2.5px 5px; border-radius:4.5px; font-size:11.5px; border:1px solid rgba(255,255,255,0.05); color:#38bdf8;">$1</code>');

  // Custom Emotes mapping
  const emotes = {
    ':brain:': '🧠',
    ':volt:': '⚡',
    ':hype:': '🔥',
    ':lock:': '🔒',
    ':star:': '👑',
    ':speed:': '🎯'
  };

  Object.entries(emotes).forEach(([token, emoji]) => {
    parsed = parsed.replaceAll(token, emoji);
  });

  return parsed;
}

/* ── XIBERBOT TELEMETRY INTERPRETER ── */
function _getXiberBotResponse(command, score) {
  const cleanCmd = command.toLowerCase().trim();

  const tips = [
    "🧠 **Neuro tip**: Cognitive efficiency is heavily constrained by distractor nodes. Anchor your eyes strictly to targets and filter perimeter flickers during visual search.",
    "🎯 **Speed advice**: Reaction speed is optimized by slow, deep inhalation. Breathe in for 4s before reflex duels to drop heart rate fluctuations.",
    "⚡ **Capacity tip**: Working memory retention is limited to $7 \\pm 2$ chunks. When playing N-Back, group positions mentally into patterns rather than counting coordinates.",
    "👑 **Peak performance**: Ensure your prefrontal cortex is hydrated. Take a 3-minute screen break if your average Vigilance reaction time drops below 350ms."
  ];

  if (cleanCmd === 'status') {
    return `📡 **Active Node telemetry log:**
- Server Nodes online: Tokyo, Shibuya, Core Cluster.
- Database latency: \`12.4ms\`
- active telemetry channels: \`${Math.floor(Math.random()*4)+4}\`
- active candidate: \`@${(auth.currentUser?.email || 'player').split('@')[0]}\`
- verified candidate profile composite index: \`${score || 'Not Evaluated'}\``;
  } else if (cleanCmd === 'tip') {
    return tips[Math.floor(Math.random() * tips.length)];
  } else if (cleanCmd === 'hack') {
    return `👾 **Initializing crypto bypass...**
\`\`\`
[GATEWAY]: connect.xiberlinc.one -> success
[HANDSHAKE]: cipher authenticated
[DECRYPTION]: WMI metadata extracted: ${score || 100}
\`\`\`
Connection pipeline clear. You are fully synced.`;
  }

  // Help command list fallback
  return `🤖 **XiberBot agent active.** 
Unknown command: \`/bot ${command}\`. 
Available directives:
- \`/bot status\` : Decrypt grid node statuses.
- \`/bot tip\` : Request spatial training tip.
- \`/bot hack\` : Decrypt core terminal cipher log.`;
}

/* ════════════════════════════════════════════════════════════
   INTERACTIVE COCKPIT INIT & ROUTING BY ROOM
   ════════════════════════════════════════════════════════════ */
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
      <div id="cpt-screen" style="width:160px; height:160px; border:2px solid rgba(255,255,255,0.08); background:#000; border-radius:16px; display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-size:4.5rem; font-weight:900; color:#fff; position:relative; box-shadow:inset 0 0 30px rgba(0,0,0,0.8);">
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
  let correctHits = 0; 
  let correctRejections = 0; 
  let totalErrors = 0;
  let sumRT = 0;

  const letterPool = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'X', 'X', 'X']; 

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

  const handleKeydown = (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      handleInput();
    }
  };

  const cycleLetter = () => {
    if (activeIndex > 0 && !hasPressed) {
      if (currentLetter === 'X') {
        totalErrors++;
        _playNeuroSound('incorrect');
      } else {
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

      _broadcastNeuroScore(
        room, 
        'CPT Vigilance', 
        `Completed sustained attention training with **${acc}% Accuracy** and **${avg}ms average reaction speed**.`
      );
      return;
    }

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
      <div id="search-grid" style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; width:180px; height:180px; background:#000; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:10px; align-content:center; justify-content:center;">
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
    { base: 'X', odd: 'Y' }
  ];

  const generateGrid = () => {
    if (!isPlaying) return;
    grid.innerHTML = '';
    
    const pair = letterPairs[Math.floor(Math.random() * letterPairs.length)];
    const oddIndex = Math.floor(Math.random() * 16);

    for (let i = 0; i < 16; i++) {
      const cell = document.createElement('button');
      const isOdd = i === oddIndex;
      cell.textContent = isOdd ? pair.odd : pair.base;
      cell.style.cssText = `
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
        border-radius: 6px; color: #fff; font-size: 1.5rem; font-weight: 700;
        font-family: 'Outfit', sans-serif; cursor: pointer; transition: all 0.1s;
        height: 38px; display: flex; align-items: center; justify-content: center;
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
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; width:160px; height:160px; background:#000; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:8px;">
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

      const totalTargets = history.filter((c, idx) => idx >= 2 && c === history[idx - 2]).length;
      const acc = totalTargets > 0 ? Math.round((matches / totalTargets) * 100) : 100;
      
      _broadcastNeuroScore(
        room, 
        'Spatial 2-Back', 
        `Completed working memory cycle with **${acc}% Accuracy** (${matches} hits) and **${errors} errors**.`
      );
      return;
    }

    trialIndex++;
    if (trialDisp) trialDisp.textContent = `${trialIndex}/15`;
    hasPressed = false;

    let nextCell;
    if (trialIndex >= 3 && Math.random() < 0.35) {
      nextCell = history[history.length - 2]; 
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

      <canvas id="flow-canvas" style="width:100%; height:130px; background:#000; border-radius:12px; border:1px solid rgba(255,255,255,0.06); cursor:pointer;"></canvas>

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

    for (let i = 1; i <= totalGates; i++) {
      gates.push({
        x: 180 + i * 220,
        amp: Math.random() < 0.5 ? 10 : 35, 
        width: 28,
        passed: false
      });
    }
  };

  const gameLoop = () => {
    if (!isPlaying) return;

    ctx.clearRect(0, 0, width, height);

    targetAmplitude = isTapping ? 35 : 10;
    currentAmplitude += (targetAmplitude - currentAmplitude) * 0.08;

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

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

    ballY = height / 2 + Math.sin(100 * waveLength - cycle) * currentAmplitude;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(100, ballY, 8, 0, Math.PI * 2);
    ctx.fill();

    cycle += waveLength * speedX;

    gates.forEach(gate => {
      const gateY = height / 2 + Math.sin(gate.x * waveLength - cycle) * gate.amp;
      
      ctx.strokeStyle = gate.passed ? room.colorHex : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(gate.x, gateY, gate.width / 2, 0, Math.PI * 2);
      ctx.stroke();

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

      gate.x -= speedX;
    });

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
      <div id="switch-card" style="width:160px; height:90px; border-radius:12px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; transition:all 0.15s;">
        <span style="font-size:11px; font-family:'JetBrains Mono',monospace; color:rgba(255,255,255,0.4); text-transform:uppercase;" id="switch-cue">Rule</span>
        <span style="font-size:2.4rem; font-weight:800; font-family:'Outfit',sans-serif; color:#fff;" id="switch-symbols">--</span>
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
  let currentTask = ''; 
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

    currentTask = Math.random() < 0.5 ? 'number' : 'letter';
    currentNum = Math.floor(Math.random() * 9) + 1; 
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

      <canvas id="router-canvas" style="width:100%; height:140px; background:#000; border-radius:12px; border:1px solid rgba(255,255,255,0.06); cursor:pointer;"></canvas>

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
    nodes = [
      { id: 'A', x: 30, y: height / 2, label: 'Start (A)' },
      { id: 'B', x: width / 3 + 10, y: 25, label: 'B' },
      { id: 'C', x: width / 3 + 10, y: height - 25, label: 'C' },
      { id: 'D', x: (width / 3) * 2 - 10, y: height / 2, label: 'D' },
      { id: 'E', x: width - 30, y: height / 2, label: 'Target (E)' }
    ];

    const r1 = Math.floor(Math.random() * 20) + 10; 
    const r2 = Math.floor(Math.random() * 20) + 10; 
    const r3 = Math.floor(Math.random() * 25) + 15; 
    const r4 = Math.floor(Math.random() * 25) + 15; 
    const r5 = Math.floor(Math.random() * 15) + 10; 
    const r6 = Math.floor(Math.random() * 35) + 20; 

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
    let getLinkCost = (f, t) => {
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

      const mx = (fromNode.x + toNode.x) / 2;
      const my = (fromNode.y + toNode.y) / 2;
      ctx.fillStyle = '#000';
      ctx.fillRect(mx - 15, my - 9, 30, 18);
      ctx.strokeStyle = inUserPath ? room.colorHex : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(mx - 15, my - 9, 30, 18);

      ctx.fillStyle = '#fff';
      ctx.font = "9.5px 'JetBrains Mono'";
      ctx.textAlign = 'center';
      ctx.fillText(`${l.cost}ms`, mx, my + 4);
    });

    nodes.forEach(n => {
      const isSelected = userPath.includes(n.id);
      const isCurrent = userPath[userPath.length - 1] === n.id;

      ctx.fillStyle = isCurrent ? room.colorHex : isSelected ? `${room.colorHex}77` : '#0d0d10';
      ctx.strokeStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.3)';
      ctx.lineWidth = isCurrent ? 3 : 1.5;

      ctx.beginPath();
      ctx.arc(n.x, n.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = "bold 10px 'Space Grotesk'";
      ctx.textAlign = 'center';
      ctx.fillText(n.id, n.x, n.y + 3.5);
    });
  };

  const handleCanvasClick = (e) => {
    if (!isPlaying) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const clickedNode = nodes.find(n => {
      const dist = Math.hypot(n.x - mx, n.y - my);
      return dist <= 20; 
    });

    if (!clickedNode) return;

    const currentNode = userPath[userPath.length - 1];
    const isAdjacent = links.some(l => 
      (l.from === currentNode && l.to === clickedNode.id) ||
      (l.from === clickedNode.id && l.to === currentNode)
    );

    if (!isAdjacent) return;

    _playNeuroSound('correct');
    userPath.push(clickedNode.id);
    drawGraph();

    if (clickedNode.id === 'E') {
      isPlaying = false;
      
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

/* ════════════════════════════════════════════════════════════
   AUDIO OSCILLATOR FOR CHORD GENERATORS
   ============================================================ */
function _startLofiSynth(freq = 110, type = 'sine') {
  if (isAudioPlaying) _stopLofiSynth();

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    ambientOsc = audioCtx.createOscillator();
    ambientOsc.type = type;
    ambientOsc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    lfo = audioCtx.createOscillator();
    lfo.frequency.setValueAtTime(0.3, audioCtx.currentTime); 
    lfoGain = audioCtx.createGain();
    lfoGain.gain.setValueAtTime(freq * 0.02, audioCtx.currentTime); 

    lfo.connect(lfoGain);
    lfoGain.connect(ambientOsc.frequency);

    gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);

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

/* ════════════════════════════════════════════════════════════
   DISCORD-IRL AUDIO SYNTHESIZER
   ════════════════════════════════════════════════════════════ */
function _playNeuroSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    if (type === 'correct') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'incorrect') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.2);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'start') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.25);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'complete') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.50, now + 0.3); // C6
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.start(now);
      osc.stop(now + 0.5);
    } else if (type === 'flow') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.4);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
    }
  } catch(e) {
    console.warn("Audio context error:", e);
  }
}

/* ════════════════════════════════════════════════════════════
   AUTO-TELEMETRY TELEGRAM BROADCASTER
   ════════════════════════════════════════════════════════════ */
async function _broadcastNeuroScore(room, gameName, resultSummary) {
  try {
    await addDoc(collection(db, 'chatroom_messages'), {
      roomId: room.id,
      senderId: 'xiberbot',
      senderName: 'XiberBot [BOT]',
      senderEmail: '',
      senderHandle: 'XiberBot',
      senderPhoto: '',
      senderScore: 130,
      senderRank: 'Legend',
      content: `📡 **Telemetry Alert: Training Registered**\n\nCandidate: @${(auth.currentUser?.email || 'player').split('@')[0]}\nTraining Zone: **${gameName}**\n\n${resultSummary}`,
      type: 'text',
      createdAt: serverTimestamp()
    });
  } catch(e) {
    console.error("Auto broadcast failed:", e);
  }
}

/* ════════════════════════════════════════════════════════════
   FLOATING EMOTE REACTION EMITTER
   ════════════════════════════════════════════════════════════ */
function _spawnFloatingReaction(emoji) {
  const area = document.getElementById('reactions-float-area');
  if (!area) return;
  
  const react = document.createElement('div');
  react.textContent = emoji;
  
  const rot = (Math.random() * 40 - 20) + 'deg';
  const left = Math.floor(Math.random() * 40) + 'px';
  
  react.style.cssText = `
    position: absolute;
    bottom: 0;
    left: ${left};
    font-size: 24px;
    pointer-events: none;
    --rot: ${rot};
    animation: wld-reaction-float 2.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
  `;
  
  area.appendChild(react);
  setTimeout(() => {
    react.remove();
  }, 2500);
}

/* ════════════════════════════════════════════════════════════
   REAL-TIME CANDIDATE ROSTER RENDERING
   ════════════════════════════════════════════════════════════ */
function _renderRosterList(peers, room) {
  const rosterList = document.getElementById('member-roster-list');
  if (!rosterList) return;

  const sorted = [...peers].sort((a, b) => {
    const isMeA = a.userId === auth.currentUser?.uid;
    const isMeB = b.userId === auth.currentUser?.uid;
    if (isMeA && !isMeB) return -1;
    if (!isMeA && isMeB) return 1;
    return a.handle.localeCompare(b.handle);
  });

  let html = '';
  
  html += `
    <div>
      <div style="font-size:9.5px; font-family:'JetBrains Mono',monospace; color:rgba(255,255,255,0.3); text-transform:uppercase; margin-bottom:8px;">online — ${sorted.length}</div>
      <div style="display:flex; flex-direction:column; gap:10px;">
  `;

  sorted.forEach(peer => {
    const isMe = peer.userId === auth.currentUser?.uid;
    const badgeCol = peer.rank === 'Legend' ? '#7c3aed' : peer.rank === 'Master' ? '#d4ff00' : peer.rank === 'Diamond' ? '#2563eb' : 'rgba(255,255,255,0.3)';
    const inVoice = peerConnections.has(peer.peerId) || (isMe && isVoiceConnected);
    
    html += `
      <div style="display:flex; align-items:center; justify-content:space-between;" id="${isMe ? 'roster-me-row' : ''}">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="position:relative;">
            ${peer.photo 
              ? `<img src="${peer.photo}" class="${inVoice ? 'speaking-avatar' : ''}" style="width:28px; height:28px; border-radius:50%; border:1px solid ${inVoice ? '#38bdf8' : room.colorHex};" />`
              : `<div class="${inVoice ? 'speaking-avatar' : ''}" style="width:28px; height:28px; border-radius:50%; background:${room.colorHex}22; border:1px solid ${inVoice ? '#38bdf8' : room.colorHex}; display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:700; font-size:10px; color:${room.colorHex};">${(peer.name || 'P')[0].toUpperCase()}</div>`
            }
            <div style="position:absolute; bottom:-2px; right:-2px; width:8px; height:8px; border-radius:50%; background:#10b981; border:1.5px solid #050508;"></div>
          </div>
          <div>
            <div style="font-size:11.5px; font-weight:700; color:#fff;">${peer.handle}</div>
            <div style="font-size:8.5px; color:rgba(255,255,255,0.35);">${peer.status}</div>
          </div>
        </div>
        <span style="font-family:'JetBrains Mono',monospace; font-size:8px; padding:1px 4px; border-radius:3px; background:${badgeCol}15; border:1px solid ${badgeCol}33; color:${badgeCol}; font-weight:700;">${peer.rank || 'Guest'}</span>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  html += `
    <div style="margin-top:14px;">
      <div style="font-size:9.5px; font-family:'JetBrains Mono',monospace; color:rgba(255,255,255,0.3); text-transform:uppercase; margin-bottom:8px;">ai core bots — 1</div>
      <div style="display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div style="position:relative;">
            <div style="width:28px; height:28px; border-radius:50%; background:#2563eb22; border:1px solid #2563eb; display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:700; font-size:10px; color:#2563eb;">🤖</div>
            <div style="position:absolute; bottom:-2px; right:-2px; width:8px; height:8px; border-radius:50%; background:#10b981; border:1.5px solid #050508;"></div>
          </div>
          <div>
            <div style="font-size:11.5px; font-weight:700; color:#fff; display:flex; align-items:center; gap:4px;">
              XiberBot
              <span style="font-family:'JetBrains Mono',monospace; font-size:7px; background:#2563eb; color:#fff; padding:1px 3px; border-radius:3px; font-weight:700;">BOT</span>
            </div>
            <div style="font-size:8.5px; color:rgba(255,255,255,0.35);">Listening to commands</div>
          </div>
        </div>
      </div>
    </div>
  `;

  rosterList.innerHTML = html;
}

/* ════════════════════════════════════════════════════════════
   CYBERNETIC VOICE MODULATOR (DSP ENGINE)
   ════════════════════════════════════════════════════════════ */
function _initVoiceDSP(stream) {
  try {
    audioCtxVoice = new (window.AudioContext || window.webkitAudioContext)();
    voiceSourceNode = audioCtxVoice.createMediaStreamSource(stream);
    voiceDestinationNode = audioCtxVoice.createMediaStreamDestination();
    _applyVoiceDSPChain();
  } catch(e) {
    console.error("[WebRTC] Voice DSP initialization failed:", e);
  }
}

function _applyVoiceDSPChain() {
  if (!audioCtxVoice || !voiceSourceNode || !voiceDestinationNode) return;
  
  // Clean up any existing effect nodes
  voiceEffectNodes.forEach(node => {
    try { node.disconnect(); } catch(e){}
    try { node.stop(); } catch(e){}
  });
  voiceEffectNodes = [];
  voiceSourceNode.disconnect();
  
  if (voiceEffectMode === 'normal') {
    voiceSourceNode.connect(voiceDestinationNode);
    console.error("[WebRTC] Voice DSP bypass mode (Normal voice)");
  } 
  else if (voiceEffectMode === 'cybernetic') {
    // Ring Modulation: Multiply input by a carrier wave
    const ringMod = audioCtxVoice.createGain();
    const osc = audioCtxVoice.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 65; 
    osc.start();
    
    const filter = audioCtxVoice.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 160;
    
    voiceSourceNode.connect(ringMod);
    osc.connect(ringMod.gain);
    ringMod.connect(filter);
    filter.connect(voiceDestinationNode);
    
    voiceEffectNodes.push(osc, ringMod, filter);
    console.error("[WebRTC] Voice DSP Cybernetic mode active");
  }
  else if (voiceEffectMode === 'space') {
    // Echo feedback loop
    const delay = audioCtxVoice.createDelay();
    delay.delayTime.value = 0.28;
    
    const feedback = audioCtxVoice.createGain();
    feedback.gain.value = 0.45;
    
    const filter = audioCtxVoice.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 220;
    
    voiceSourceNode.connect(filter);
    filter.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    
    // Mix dry & wet paths
    const dryGain = audioCtxVoice.createGain();
    dryGain.gain.value = 0.7;
    const wetGain = audioCtxVoice.createGain();
    wetGain.gain.value = 0.5;
    
    voiceSourceNode.connect(dryGain);
    delay.connect(wetGain);
    
    dryGain.connect(voiceDestinationNode);
    wetGain.connect(voiceDestinationNode);
    
    voiceEffectNodes.push(delay, feedback, filter, dryGain, wetGain);
    console.error("[WebRTC] Voice DSP Deep Space mode active");
  }
  else if (voiceEffectMode === 'android') {
    // Wave shaper distortion + peaking bandpass
    const distortion = audioCtxVoice.createWaveShaper();
    distortion.curve = _makeDistortionCurve(80);
    distortion.oversample = '4x';
    
    const filter = audioCtxVoice.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 3.0;
    
    voiceSourceNode.connect(distortion);
    distortion.connect(filter);
    filter.connect(voiceDestinationNode);
    
    voiceEffectNodes.push(distortion, filter);
    console.error("[WebRTC] Voice DSP Android mode active");
  }
}

function _makeDistortionCurve(amount) {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

/* ════════════════════════════════════════════════════════════
   HOLOGRAPHIC NEURAL MATRIX VISUALIZER
   ════════════════════════════════════════════════════════════ */
function _initNeuralMatrix(roomHex) {
  const canvas = document.getElementById('neural-matrix-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = canvas.width = canvas.clientWidth;
  let height = canvas.height = canvas.clientHeight;

  const handleResize = () => {
    if (!canvas) return;
    width = canvas.width = canvas.clientWidth;
    height = canvas.height = canvas.clientHeight;
  };
  window.addEventListener('resize', handleResize);

  // Setup neural particles
  const particleCount = 75;
  const particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 2 + 1,
      origRadius: Math.random() * 2 + 1,
      glow: Math.random() > 0.6
    });
  }

  // Drag warping logic
  const handleMouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    matrixMousePos.x = e.clientX - rect.left;
    matrixMousePos.y = e.clientY - rect.top;
  };
  const handleMouseLeave = () => {
    matrixMousePos.x = null;
    matrixMousePos.y = null;
  };
  
  const mainPanel = canvas.parentElement;
  if (mainPanel) {
    mainPanel.addEventListener('mousemove', handleMouseMove);
    mainPanel.addEventListener('mouseleave', handleMouseLeave);
  }

  // Constellation loop
  const draw = () => {
    if (!document.getElementById('neural-matrix-canvas')) {
      window.removeEventListener('resize', handleResize);
      if (mainPanel) {
        mainPanel.removeEventListener('mousemove', handleMouseMove);
        mainPanel.removeEventListener('mouseleave', handleMouseLeave);
      }
      return;
    }

    ctx.clearRect(0, 0, width, height);
    const baseColor = roomHex || '#2563eb';
    
    // Draw expansion waves (ripples)
    matrixRipples.forEach((ripple, rIdx) => {
      ripple.radius += ripple.speed;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ripple.color;
      ctx.lineWidth = 2 * (1 - ripple.radius / ripple.maxRadius);
      ctx.stroke();

      if (ripple.radius >= ripple.maxRadius) {
        matrixRipples.splice(rIdx, 1);
      }
    });

    // Capture volume amp if talking
    let audioAmp = 0;
    if (analyserNode && isAudioPlaying) {
      const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      audioAmp = sum / dataArray.length;
    }

    // Process particles
    particles.forEach(p => {
      const ampFactor = audioAmp / 128;
      p.radius = p.origRadius + (p.glow ? ampFactor * 4 : ampFactor * 1.5);
      
      // Pull toward cursor
      if (matrixMousePos.x !== null && matrixMousePos.y !== null) {
        const dx = matrixMousePos.x - p.x;
        const dy = matrixMousePos.y - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 180) {
          const force = (180 - dist) / 180 * 0.15;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
      }

      p.x += p.vx * (1 + audioAmp * 0.03);
      p.y += p.vy * (1 + audioAmp * 0.03);

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.glow ? baseColor : 'rgba(255,255,255,0.4)';
      if (p.glow && audioAmp > 15) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = baseColor;
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    });
    ctx.shadowBlur = 0;

    // Connect close nodes
    ctx.lineWidth = 0.5;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const pi = particles[i];
        const pj = particles[j];
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        const connectionRange = 100 + (audioAmp * 0.25);
        if (dist < connectionRange) {
          const alpha = (1 - dist / connectionRange) * 0.14 * (1 + audioAmp * 0.02);
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.beginPath();
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
          ctx.stroke();
        }
      }
    }

    visualizerLoopId = requestAnimationFrame(draw);
  };

  draw();
}

function _spawnMatrixRipple(x, y, maxRadius = 150, color = 'rgba(255, 255, 255, 0.4)') {
  matrixRipples.push({
    x: x || Math.random() * window.innerWidth / 2,
    y: y || Math.random() * window.innerHeight / 2,
    radius: 0,
    maxRadius,
    speed: 3.8,
    color
  });
}
