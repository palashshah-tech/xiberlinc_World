/* ============================================================
   WorldView — Xiberlinc World Redesign (Google Auth Gate)
   ============================================================ */

import { render } from '../utils/dom.js';
import { injectStyle, navigate } from '../router.js';
import { Storage } from '../utils/storage.js';
import {
  fetchTopPlayers, buildLeaderboard, fetchLiveStats, fetchUserProfile,
  fetchCustomRooms, fetchUserConnections, respondToConnectionRequest,
  sendConnectionRequest, fetchIncomingRequests, searchCandidatesByHandle,
  createCustomRoom, deleteCustomRoom, fetchIgnoreEmails
} from '../utils/worldData.js';
import { signInWithGoogle, auth, db, signOut } from '../utils/firebase.js';
import { splitTextReveal, maskedReveal, staggerCards3D, bindMagneticElements, refreshMotion } from '../engine/motionEngine.js';
import { getSocialGraphData, formatChainDistance, getRecommendations } from '../utils/worldGraph.js';
import { NEURO_ROOMS, EVENTS } from '../utils/worldStatic.js';
import { collection, addDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';

export function WorldView() {
  // Inject Spline viewer script if not already loaded
  if (!document.querySelector('script[src*="spline-viewer"]')) {
    const s = document.createElement('script');
    s.type = 'module';
    s.src = 'https://unpkg.com/@splinetool/viewer/build/spline-viewer.js';
    document.head.appendChild(s);
  }
  // Render the wrapper structures
  render(`
    <div id="world-root" style="position:relative;width:100%;min-height:100vh;background:#000000;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;">
      
      <!-- ── GOOGLE AUTH GATE SCREEN ── -->
      <div id="world-auth-gate" style="
        position:fixed;inset:0;z-index:9500;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        background:#000000;transition:opacity 0.8s ease, transform 0.8s ease;
        padding:24px;text-align:center;overflow:hidden;
      ">
        <!-- Ambient Guideline Backdrop -->
        <div class="bg-guidelines" style="opacity:0.5;"></div>

        <!-- Full-Screen Ambient Kinetic Background Ticker -->
        <div class="kinetic-ticker" id="auth-kinetic-ticker">
          <div class="kinetic-ticker-row" style="top:4%;animation:news-scroll 18s linear infinite;">
            XIBERLINC &bull; SIGNAL PROCESSING &bull; NEURAL MAPPING &bull; BIOMETRIC ANALYSIS &bull; DEEP LEARNING &bull; PATTERN RECOGNITION &bull; AXIS TRAJECTORY &bull; XIBERLINC &bull; SIGNAL PROCESSING &bull; NEURAL MAPPING &bull; BIOMETRIC ANALYSIS &bull; DEEP LEARNING &bull; PATTERN RECOGNITION &bull; AXIS TRAJECTORY
          </div>
          <div class="kinetic-ticker-row" style="top:20%;animation:news-scroll 22s linear infinite reverse;">
            FREQUENCY DOMAIN &bull; TEMPORAL ANALYSIS &bull; MOBILITY BUSINESS &bull; BRAND INNOVATION &bull; FUTURE MOBILITY &bull; CREATIVE TECH &bull; DIGITAL TRANSFORMATION &bull; FREQUENCY DOMAIN &bull; TEMPORAL ANALYSIS &bull; MOBILITY BUSINESS &bull; BRAND INNOVATION &bull; FUTURE MOBILITY &bull; CREATIVE TECH &bull; DIGITAL TRANSFORMATION
          </div>
          <div class="kinetic-ticker-row" style="top:36%;animation:news-scroll 16s linear infinite;">
            XIBERLINC &bull; COGNITIVE ARCHITECTURE &bull; RECRUITMENT PROVING GROUND &bull; VERIFIED CANDIDATE LEDGER &bull; SPATIAL ROOMS &bull; TELEMETRY ENGINE &bull; XIBERLINC &bull; COGNITIVE ARCHITECTURE &bull; RECRUITMENT PROVING GROUND &bull; VERIFIED CANDIDATE LEDGER &bull; SPATIAL ROOMS &bull; TELEMETRY ENGINE
          </div>
          <div class="kinetic-ticker-row" style="top:52%;animation:news-scroll 24s linear infinite reverse;">
            SHAPE THE INVISIBLE FUTURE &bull; 見えない未来を、形にする &bull; WORKING MEMORY CAPACITY &bull; QUANTUM NEURAL PIPELINE &bull; XIBERLINC &bull; SHAPE THE INVISIBLE FUTURE &bull; 見えない未来を、形にする &bull; WORKING MEMORY CAPACITY &bull; QUANTUM NEURAL PIPELINE &bull; XIBERLINC
          </div>
          <div class="kinetic-ticker-row" style="top:68%;animation:news-scroll 19s linear infinite;">
            NEURAL NETWORK &bull; REALTIME SYNAPSE LINK &bull; MULTIPLAYER TELEMETRY &bull; RECRUITMENT ECOSYSTEM &bull; XIBERLINC EXPERIENCE &bull; NEURAL NETWORK &bull; REALTIME SYNAPSE LINK &bull; MULTIPLAYER TELEMETRY &bull; RECRUITMENT ECOSYSTEM &bull; XIBERLINC EXPERIENCE
          </div>
          <div class="kinetic-ticker-row" style="top:84%;animation:news-scroll 21s linear infinite reverse;">
            XIBERLINC &bull; SIGNAL PROCESSING &bull; NEURAL MAPPING &bull; BIOMETRIC ANALYSIS &bull; DEEP LEARNING &bull; PATTERN RECOGNITION &bull; AXIS TRAJECTORY &bull; XIBERLINC &bull; SIGNAL PROCESSING &bull; NEURAL MAPPING &bull; BIOMETRIC ANALYSIS &bull; DEEP LEARNING &bull; PATTERN RECOGNITION &bull; AXIS TRAJECTORY
          </div>
        </div>

        <div style="position:relative;z-index:10;margin-bottom:36px;max-width:380px;">
          <!-- Official Xiberlinc Logo Frame -->
          <div style="
            width:64px;height:64px;border-radius:16px;background:#000000;
            border:1.5px solid rgba(255,255,255,0.15);display:flex;align-items:center;
            justify-content:center;overflow:hidden;padding:10px;margin:0 auto 24px;
            box-shadow:0 12px 32px rgba(0,0,0,0.8), 0 0 24px rgba(124,58,237,0.25);
          ">
            <img src="/xiberlinc_logo.png" style="width:100%;height:100%;object-fit:contain;mix-blend-mode:screen;filter:brightness(1.4);" alt="Xiberlinc Logo" />
          </div>

          <h1 class="hero-title" style="font-family:'Montserrat',sans-serif; font-size:clamp(2.2rem, 5.5vw, 3.8rem); font-weight:900; line-height:1.05; margin:0 0 16px 0; letter-spacing:-0.03em; color:#ffffff;">
            <span class="line" style="display:block; overflow:hidden;">
              <span class="line-inner" style="display:block; transform:translateY(100%); animation:auth-title-rise 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;">Connect by</span>
            </span>
            <span class="line" style="display:block; overflow:hidden;">
              <span class="line-inner" style="display:block; transform:translateY(100%); animation:auth-title-rise 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.28s forwards;">
                <span class="accent glitch-text scramble-text" data-text="xiberlinc." style="color:#7c3aed; position:relative; display:inline-block;">xiberlinc.</span>
              </span>
            </span>
            <span class="line jp" style="font-family:'M PLUS 1p',sans-serif; font-weight:700; font-size:0.45em; display:block; margin-top:0.6rem; color:rgba(255,255,255,0.45); letter-spacing:0.18em; overflow:hidden;">
              <span class="line-inner" style="display:block; transform:translateY(100%); animation:auth-title-rise 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards;">見えない未来を、形にする。</span>
            </span>
          </h1>

          <p style="font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.65;margin:0 auto;max-width:320px;">
            Welcome to the Xiberlinc Experience. Authenticate with your <code style="color:#7c3aed;font-family:'JetBrains Mono',monospace;background:rgba(124,58,237,0.12);padding:2px 6px;border-radius:4px;">xiberlinc.one</code> credentials to enter.
          </p>
        </div>

        <button id="google-login-btn" class="magnetic-btn" data-cursor="SIGN IN" style="
          position:relative;z-index:10;
          display:inline-flex;align-items:center;gap:12px;
          background:#ffffff;color:#000000;border:none;border-radius:12px;
          padding:15px 32px;font-family:'Space Grotesk',sans-serif;font-weight:700;
          font-size:13.5px;cursor:pointer;box-shadow:0 12px 30px rgba(255,255,255,0.12);
          transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          text-transform:uppercase;letter-spacing:0.06em;
        " onmouseenter="this.style.transform='scale(1.02)';this.style.boxShadow='0 18px 45px rgba(255,255,255,0.22)'" onmouseleave="this.style.transform='';this.style.boxShadow='0 12px 30px rgba(255,255,255,0.12)'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.31l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <!-- Domain Lock Tag -->
        <div style="position:relative;z-index:10;margin-top:16px;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.12em;display:flex;align-items:center;gap:6px;">
          <span style="width:5px;height:5px;border-radius:50%;background:#7c3aed;display:inline-block;"></span>
          Restricted to @xiberlinc.one accounts
        </div>

        <!-- Error message display -->
        <div id="auth-error-msg" style="position:relative;z-index:10;display:none; margin-top:20px; font-family:'Space Grotesk',sans-serif; font-size:12px; color:#ef4444; max-width:340px; line-height:1.5; font-weight:600; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); border-radius:8px; padding:10px 14px;"></div>
      </div>

      <!-- ── LOADER SCREEN ── -->
      <div id="world-loader" style="
        position:fixed;inset:0;z-index:9000;
        overflow:hidden;background:#000000;display:none;
      ">
        <!-- Spline Container -->
        <div id="spline-container" style="position:absolute;inset:0;"></div>

        <!-- Content (Apple-like static title with clean fade-in) -->
        <div id="loader-ui" style="
          position:absolute;top:12vh;left:50%;transform:translateX(-50%);z-index:100;
          text-align:center;pointer-events:none;width:100%;padding:0 24px;
        ">
          <div id="loader-text" style="
            font-family:'Instrument Serif', serif;
            font-style:italic;
            font-size:clamp(1.4rem, 3.5vw, 2.2rem);
            color:#ffffff;
            text-transform:uppercase;
            letter-spacing:0.04em;
            opacity:0;
            transition:opacity 1.5s cubic-bezier(0.25, 1, 0.5, 1);
            display:inline-flex;
            align-items:center;
            justify-content:center;
            gap:10px;
          ">
            transcending your experience
            <span style="display:inline-flex; gap:5px; align-items:center; height:1em; margin-bottom:-4px;">
              <span style="width:6px; height:6px; background:#2563eb; border-radius:50%; display:inline-block; animation:wld-bounce 1.4s infinite ease-in-out both; animation-delay:-0.32s;"></span>
              <span style="width:6px; height:6px; background:#7c3aed; border-radius:50%; display:inline-block; animation:wld-bounce 1.4s infinite ease-in-out both; animation-delay:-0.16s;"></span>
              <span style="width:6px; height:6px; background:#ec4899; border-radius:50%; display:inline-block; animation:wld-bounce 1.4s infinite ease-in-out both;"></span>
            </span>
          </div>
        </div>
      </div>

      <!-- ── WORLD DASHBOARD (hidden until loader finishes) ── -->
      <div id="world-dashboard" style="display:none;position:relative;width:100%;min-height:100vh;background:#000000;"></div>


      <!-- ── CONTROL CENTER TASKBAR OVERLAY ── -->
      <div id="taskbar-overlay" style="
        position:fixed;inset:0;z-index:9600;
        background:rgba(5,5,8,0.72);backdrop-filter:blur(30px);-webkit-backdrop-filter:blur(30px);
        opacity:0;pointer-events:none;transition:opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        display:flex;align-items:center;justify-content:center;
      ">
        <div style="display:flex;flex-direction:column;gap:24px;text-align:center;max-width:320px;width:100%;padding:24px;">
          <h3 style="font-family:'Instrument Serif',serif;font-style:italic;font-size:1.8rem;color:#7c3aed;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">Control Panel</h3>
          
          <button id="taskbar-play-vwm" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:14px;color:#fff;cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;padding:8px 0;">Play Working Memory</button>
          <button id="taskbar-goto-home" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:14px;color:#fff;cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;padding:8px 0;">World Hub</button>
          
          <div style="width:40px;height:1px;background:rgba(255,255,255,0.08);margin:8px auto;"></div>
          
          <button id="taskbar-sec-1" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;">Stars Grid</button>
          <button id="taskbar-sec-2" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;">Leaderboard</button>
          <button id="taskbar-sec-3" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;">Neuro Rooms</button>
          <button id="taskbar-sec-4" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;">Events List</button>
          
          <div style="width:40px;height:1px;background:rgba(255,255,255,0.08);margin:8px auto;"></div>
          
          <button id="taskbar-logout" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:12px;color:#ec4899;cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;margin-top:16px;">Sign Out</button>
        </div>
      </div>

    </div>
  `);

  // Inject animations
  injectStyle(`
    @keyframes wld-blink { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes wld-loader-out { to{opacity:0;transform:scale(1.03)} }
    @keyframes wld-fade-up { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
    @keyframes wld-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
    @keyframes wld-pulse-ring { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.2);opacity:0} }
    @keyframes wld-bounce {
      0%, 80%, 100% { transform: scale(0.6) translateY(0); opacity: 0.4; }
      40% { transform: scale(1.1) translateY(-10px); opacity: 1; }
    }
    .wld-reveal { opacity:1; transform:none; }
    .wld-reveal.visible { opacity:1; transform:none; }
    @media (max-width: 480px) {
      #wld-chat-panel {
        width: 100% !important;
        right: -100% !important;
      }
    }
    @keyframes wld-reaction-float {
      0% { transform: translateY(0) scale(0.8) rotate(0deg); opacity: 1; }
      100% { transform: translateY(-300px) scale(1.4) rotate(var(--rot)); opacity: 0; }
    }
  `);

  // Start initialization flow
  _initAuth();
}

/* ════════════════════════════════════════════════════════════
   AUTH & BOOT SEQUENCE
   ════════════════════════════════════════════════════════════ */
function _initAuth() {
  const authGate = document.getElementById('world-auth-gate');
  const loginBtn = document.getElementById('google-login-btn');
  const errMsg = document.getElementById('auth-error-msg');

  // Verify current auth user
  const user = auth.currentUser;
  const isGoogle = user && !user.isAnonymous;
  const isAuthorizedEmail = user && user.email && user.email.toLowerCase().endsWith('@xiberlinc.one');

  if (isGoogle && isAuthorizedEmail) {
    // Already authenticated with Google, go straight to loader or dashboard if loaded
    if (authGate) authGate.style.display = 'none';
    if (window.xiberlinc_world_loaded) {
      const loader = document.getElementById('world-loader');
      if (loader) loader.style.display = 'none';
      _fetchWorldData().then(worldData => {
        _renderDashboard(worldData);
      });
    } else {
      _startLoader();
    }
  } else {
    // If user exists but has unauthorized email domain, terminate session automatically
    if (user && !isAuthorizedEmail) {
      signOut(auth).then(() => {
        console.warn("Unauthorized domain session terminated on page load.");
        if (errMsg) {
          errMsg.textContent = "Access Denied: Only @xiberlinc.one email addresses are authorized to enter Xiberlinc World.";
          errMsg.style.display = 'block';
        }
      });
    }

    // Show Google Auth Gate
    if (loginBtn) {
      // Clear any previous click listeners to prevent duplicates
      const newLoginBtn = loginBtn.cloneNode(true);
      loginBtn.parentNode.replaceChild(newLoginBtn, loginBtn);
      
      newLoginBtn.addEventListener('click', async () => {
        if (errMsg) errMsg.style.display = 'none';
        const res = await signInWithGoogle();
        if (res.ok) {
          // Slide auth gate away
          if (authGate) {
            authGate.style.opacity = '0';
            authGate.style.transform = 'scale(0.98)';
            setTimeout(() => {
              authGate.style.display = 'none';
              _startLoader();
            }, 800);
          }
        } else {
          if (errMsg) {
            errMsg.textContent = res.error?.message || "Sign-In failed. Please try again.";
            errMsg.style.display = 'block';
          }
        }
      });
    }
  }
}

const LOADER_MS = 3000;

function _startLoader() {
  const loader = document.getElementById('world-loader');
  if (loader) {
    loader.style.display = 'block';
  }
  _runLoader();
}

async function _cycleLoaderText(loaderText) {
  if (!loaderText) return;

  const messages = [
    "transcending your experience",
    "setting up your interface",
    "connecting the dots",
    "almost there"
  ];

  const dotsHtml = `
    <span style="display:inline-flex; gap:5px; align-items:center; height:1em; margin-bottom:-4px;">
      <span style="width:6px; height:6px; background:#2563eb; border-radius:50%; display:inline-block; animation:wld-bounce 1.4s infinite ease-in-out both; animation-delay:-0.32s;"></span>
      <span style="width:6px; height:6px; background:#7c3aed; border-radius:50%; display:inline-block; animation:wld-bounce 1.4s infinite ease-in-out both; animation-delay:-0.16s;"></span>
      <span style="width:6px; height:6px; background:#ec4899; border-radius:50%; display:inline-block; animation:wld-bounce 1.4s infinite ease-in-out both;"></span>
    </span>
  `;

  for (let i = 0; i < messages.length; i++) {
    if (i > 0) {
      // Fade out
      loaderText.style.opacity = '0';
      await _delay(500);

      // Check if loader was dismissed early
      const loader = document.getElementById('world-loader');
      if (!loader || loader.style.display === 'none') {
        break;
      }

      loaderText.innerHTML = `${messages[i]} ${dotsHtml}`;
      // Fade back in
      loaderText.style.opacity = '1';
    }
    // Wait for the next transition (approx 3.2s)
    await _delay(3200);
  }
}

async function _runLoader() {
  const container = document.getElementById('spline-container');
  if (container) {
    container.innerHTML = `
      <spline-viewer
        id="spline-el"
        url="/master.splinecode"
        loading-anim-type="none"
        style="width:100%;height:100%;opacity:0;transition:opacity 2.5s ease;"
      ></spline-viewer>
    `;
  }

  const spline     = document.getElementById('spline-el');
  const loaderText = document.getElementById('loader-text');

  if (spline) {
    setTimeout(() => {
      spline.style.opacity = '0.85';
    }, 800);
    _hideSplineLogo(spline);
  }

  // Pre-fetch world data in parallel while animation plays
  const dataPromise = _fetchWorldData();

  // Smoothly fade in the static loader text
  await _delay(600);
  if (loaderText) {
    loaderText.style.opacity = '1';
  }

  // Start the dynamic status text cycling
  _cycleLoaderText(loaderText);

  // Play loader
  const [worldData] = await Promise.all([dataPromise, _delay(LOADER_MS)]);

  // Fade out text before dashboard transition
  if (loaderText) {
    loaderText.style.opacity = '0';
  }
  await _delay(800);

  // Fade out loader screen
  const loader = document.getElementById('world-loader');
  if (loader) {
    loader.style.animation = 'wld-loader-out 0.9s cubic-bezier(0.4,0,1,1) forwards';
    await _delay(800);
    loader.style.display = 'none';
  }

  window.xiberlinc_world_loaded = true;
  _renderDashboard(worldData);
}

/* ════════════════════════════════════════════════════════════
   DATA FETCH
   ════════════════════════════════════════════════════════════ */
async function _fetchWorldData() {
  try {
    const user = auth.currentUser;
    const email = user && !user.isAnonymous ? user.email : null;

    const [players, stats, userProfile, customRooms, connections, incomingRequests, ignoreEmails] = await Promise.all([
      fetchTopPlayers(100),
      fetchLiveStats(),
      email ? fetchUserProfile(email) : Promise.resolve([]),
      email ? fetchCustomRooms() : Promise.resolve([]),
      email ? fetchUserConnections() : Promise.resolve([]),
      email ? fetchIncomingRequests() : Promise.resolve([]),
      email ? fetchIgnoreEmails() : Promise.resolve([])
    ]);
    const leaderboard = buildLeaderboard(players);
    return { players, stats, leaderboard, userProfile, customRooms, connections, incomingRequests, ignoreEmails };
  } catch (e) {
    console.error('[World] Data fetch failed:', e);
    return { 
      players: [], 
      stats: { playersOnline: 0, starsLive: 0, activeRooms: 6, totalPlayers: 0, countriesRepresented: 0 }, 
      leaderboard: { region: [], country: [], global: [] }, 
      userProfile: [], 
      customRooms: [], 
      connections: [], 
      incomingRequests: [],
      ignoreEmails: []
    };
  }
}

/* ════════════════════════════════════════════════════════════
   CONSTELLATION CANVAS ALGORITHM
   ════════════════════════════════════════════════════════════ */
function _initConstellationCanvas(players, userProfile) {
  const canvas = document.getElementById('constellation-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const tooltip = document.getElementById('constellation-tooltip');
  const container = canvas.parentElement;

  let width = container.clientWidth;
  let height = container.clientHeight;
  
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const ro = new ResizeObserver(() => {
    width = container.clientWidth;
    height = container.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
  });
  ro.observe(container);

  const user = auth.currentUser;
  const userHandle = user ? '@' + user.email.split('@')[0] : '';
  const filteredPlayers = players.filter(p => p.handle.toLowerCase() !== userHandle.toLowerCase());
  const graph = getSocialGraphData(filteredPlayers);
  let mouse = { x: -1000, y: -1000 };
  let hoveredNode = null;
  let draggedNode = null;
  let animFrame = null;
  let time = 0;

  // Initialize nodes with dynamic positions & physical properties
  const nodes = graph.nodes.map((node) => {
    const angle = Math.random() * Math.PI * 2;
    // User is dead-center, other nodes orbit at varying distances
    const dist = node.isUser ? 0 : 70 + Math.random() * 110;
    return {
      ...node,
      x: width / 2 + Math.cos(angle) * dist,
      y: height / 2 + Math.sin(angle) * dist,
      vx: 0,
      vy: 0,
      fx: 0,
      fy: 0
    };
  });

  // Track mouse coordinates for hover and drag
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener('mouseleave', () => {
    mouse = { x: -1000, y: -1000 };
    hoveredNode = null;
    draggedNode = null;
    if (tooltip) tooltip.style.opacity = '0';
  });

  // Drag and Drop listeners
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let closest = null;
    let minDist = 26; // drag radius activation
    nodes.forEach(n => {
      const dx = n.x - mx;
      const dy = n.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = n;
      }
    });

    if (closest) {
      draggedNode = closest;
    }
  });

  canvas.addEventListener('mouseup', () => {
    draggedNode = null;
  });

  // Touch support for mobile devices
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.touches[0].clientX - rect.left;
    const my = e.touches[0].clientY - rect.top;
    mouse.x = mx;
    mouse.y = my;

    let closest = null;
    let minDist = 35;
    nodes.forEach(n => {
      const dx = n.x - mx;
      const dy = n.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = n;
      }
    });

    if (closest) {
      draggedNode = closest;
    }
  });

  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.touches[0].clientX - rect.left;
    mouse.y = e.touches[0].clientY - rect.top;
  });

  canvas.addEventListener('touchend', () => {
    draggedNode = null;
    mouse = { x: -1000, y: -1000 };
  });

  function draw() {
    time += 0.015;
    ctx.clearRect(0, 0, width, height);

    // ── PHYSICS RESOLUTIONS ──
    const cx = width / 2;
    const cy = height / 2;

    // Reset forces & apply central gravity
    nodes.forEach(n => {
      n.fx = 0;
      n.fy = 0;

      if (!n.isUser) {
        const dx = cx - n.x;
        const dy = cy - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const gravityStrength = 0.055;
        n.fx += (dx / dist) * gravityStrength;
        n.fy += (dy / dist) * gravityStrength;
      }
    });

    // Node repulsion (keeps nodes spaced out cleanly)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const minDistance = 75; // separation range
        if (dist < minDistance) {
          const force = (minDistance - dist) / minDistance * 0.22;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n1.fx -= fx;
          n1.fy -= fy;
          n2.fx += fx;
          n2.fy += fy;
        }
      }
    }

    // Edge spring forces (links pull nodes together)
    graph.edges.forEach(edge => {
      const n1 = nodes.find(n => n.id === edge.from);
      const n2 = nodes.find(n => n.id === edge.to);
      if (!n1 || !n2) return;

      const dx = n2.x - n1.x;
      const dy = n2.y - n1.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const springLength = n2.ring ? 60 + n2.ring * 35 : 90;
      const k = 0.02; // spring strength
      const stretch = dist - springLength;
      const force = stretch * k;

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      n1.fx += fx;
      n1.fy += fy;
      n2.fx -= fx;
      n2.fy -= fy;
    });

    // Override positions if dragging
    if (draggedNode) {
      draggedNode.x = mouse.x;
      draggedNode.y = mouse.y;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
      draggedNode.fx = 0;
      draggedNode.fy = 0;
    }

    // Apply velocities and limit node positions
    nodes.forEach(n => {
      if (n.isUser && !draggedNode) {
        // User stays anchored in the middle
        n.x += (cx - n.x) * 0.12;
        n.y += (cy - n.y) * 0.12;
        return;
      }

      n.vx = (n.vx + n.fx) * 0.84; // friction factor
      n.vy = (n.vy + n.fy) * 0.84;
      n.x += n.vx;
      n.y += n.vy;

      // Restrict inside padding boundaries
      const pad = 24;
      if (n.x < pad) n.x = pad;
      if (n.x > width - pad) n.x = width - pad;
      if (n.y < pad) n.y = pad;
      if (n.y > height - pad) n.y = height - pad;
    });

    // ── DRAW GRAPHICS ──

    // Draw holographic grid background
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Draw concentric orbital rings
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.06)';
    ctx.lineWidth = 1.2;
    const ringRadiiPx = [70, 125, 185];
    ringRadiiPx.forEach(r => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw connected edges with sliding glowing packets
    const packetProgress = (time * 0.35) % 1.0;

    graph.edges.forEach((edge) => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const grad = ctx.createLinearGradient(fromNode.x, fromNode.y, toNode.x, toNode.y);
      grad.addColorStop(0, fromNode.color);
      grad.addColorStop(1, toNode.color);

      // Edge link line
      ctx.beginPath();
      ctx.moveTo(fromNode.x, fromNode.y);
      ctx.lineTo(toNode.x, toNode.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = edge.opacity * (0.6 + 0.35 * Math.sin(time * 2.5 + edge.opacity * 8));
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // Glowing data packets floating along connection link
      const px = fromNode.x + (toNode.x - fromNode.x) * packetProgress;
      const py = fromNode.y + (toNode.y - fromNode.y) * packetProgress;

      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = toNode.color;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 3.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw nodes
    let newHovered = null;

    nodes.forEach((node) => {
      const dx = mouse.x - node.x;
      const dy = mouse.y - node.y;
      const isHovered = Math.sqrt(dx * dx + dy * dy) < node.radius + 8;
      if (isHovered) newHovered = node;

      const baseRadius = node.radius;
      const pulse = Math.sin(time * 2.8 + node.radius) * 1.5;
      const r = isHovered ? (baseRadius + pulse) * 1.25 : baseRadius + pulse;

      ctx.save();
      ctx.shadowBlur = isHovered ? 28 : 12;
      ctx.shadowColor = node.color;
      
      // Node core circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      // Node outer glow ring
      ctx.strokeStyle = 'rgba(255,255,255,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();

      // Node label
      if (node.isUser || isHovered) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `600 ${isHovered ? 11.5 : 10}px 'Space Grotesk', sans-serif`;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = "9px 'Space Grotesk', sans-serif";
      }
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y - r - 9);
    });

    // Handle tooltips on hovered nodes
    if (newHovered !== hoveredNode) {
      hoveredNode = newHovered;
      if (hoveredNode && tooltip) {
        tooltip.style.opacity = '1';
        if (hoveredNode.isUser) {
          const hasProfile = userProfile && userProfile[0];
          const scoreVal = hasProfile ? Math.round(userProfile[0].score) : 'Not Evaluated';
          const reactVal = hasProfile ? `${userProfile[0].reactionMs}ms` : '—';
          const accVal = hasProfile ? `${Math.round(userProfile[0].accuracy * 100)}%` : '—';

          tooltip.innerHTML = `
            <div style="font-weight:700;color:#d4ff00;margin-bottom:3px;">You</div>
            <div style="color:rgba(255,255,255,0.5);font-size:9px;margin-bottom:5px;">Constellation Core</div>
            <div style="display:flex;flex-direction:column;gap:3px;font-size:10px;">
              <div>WMI Score: <span style="font-weight:600;color:#2563eb;">${scoreVal}</span></div>
              <div>Accuracy: <span style="font-weight:600;color:#ec4899;">${accVal}</span></div>
              <div>Reaction: <span style="font-weight:600;color:#7c3aed;">${reactVal}</span></div>
              <div>Chain Dist: <span style="font-weight:600;color:#06b6d4;">Center</span></div>
            </div>
          `;
        } else {
          const p = hoveredNode.player;
          tooltip.innerHTML = `
            <div style="font-weight:700;color:#fff;margin-bottom:3px;">${p.name}</div>
            <div style="color:#7c3aed;font-family:'JetBrains Mono',monospace;font-size:9px;margin-bottom:5px;">${p.handle}</div>
            <div style="display:flex;flex-direction:column;gap:3px;font-size:10px;">
              <div>WMI Score: <span style="font-weight:600;color:#2563eb;">${p.wmi}</span></div>
              <div>Accuracy: <span style="font-weight:600;color:#ec4899;">${p.accuracy}%</span></div>
              <div>Reaction: <span style="font-weight:600;color:#7c3aed;">${p.reactionMs}ms</span></div>
              <div>Chain Dist: <span style="font-weight:600;color:#06b6d4;">${p.chainDistance} chains</span></div>
            </div>
          `;
        }
      } else if (tooltip) {
        tooltip.style.opacity = '0';
      }
    }

    if (hoveredNode && tooltip) {
      tooltip.style.left = `${hoveredNode.x + 12}px`;
      tooltip.style.top = `${hoveredNode.y - 45}px`;
    }

    animFrame = requestAnimationFrame(draw);
  }

  draw();

  return () => {
    if (animFrame) cancelAnimationFrame(animFrame);
    ro.disconnect();
  };
}

/* ════════════════════════════════════════════════════════════
   DASHBOARD RENDER
   ════════════════════════════════════════════════════════════ */
function _renderDashboard({ players, stats, leaderboard, userProfile, customRooms = [], connections = [], incomingRequests = [], ignoreEmails = [] }) {
  const dash = document.getElementById('world-dashboard');
  if (!dash) return;

  const stars   = players.filter(p => p.tier === 'star' || p.tier === 'rising').slice(0, 6);
  const hasData = players.length > 0;

  const ignoreSet = new Set((ignoreEmails || []).map(e => e.toLowerCase().trim()));
  const curUserEmail = auth.currentUser?.email;
  if (curUserEmail) {
    ignoreSet.add(curUserEmail.toLowerCase().trim());
  }
  connections.forEach(c => {
    if (c.email) ignoreSet.add(c.email.toLowerCase().trim());
  });
  incomingRequests.forEach(r => {
    if (r.senderEmail) ignoreSet.add(r.senderEmail.toLowerCase().trim());
  });

  const recommendedPlayers = players.filter(p => {
    if (!p.email) return false;
    return !ignoreSet.has(p.email.toLowerCase().trim());
  }).slice(0, 4);

  dash.style.display = 'block';
  dash.innerHTML = `
    <div style="min-height:100vh;background:#000000;font-family:'Space Grotesk',sans-serif;color:#ffffff;padding-bottom:60px;">

      <!-- NAVIGATION BAR -->
      <nav id="wld-nav" style="
        position:fixed;top:0;left:0;right:0;z-index:200;
        padding:16px 28px;
        display:flex;align-items:center;justify-content:space-between;
        background:rgba(0,0,0,0.72);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
        border-bottom:1px solid rgba(255,255,255,0.05);
        transition:all 0.3s;
      ">
        <img src="/xiberlinc_logo.png" alt="Xiberlinc" style="height:30px;mix-blend-mode:screen;filter:brightness(1.4);" />
        
        <div style="display:flex;align-items:center;gap:20px;">
          <div style="display:flex;align-items:center;gap:6px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#2563eb;">
            <div style="width:6px;height:6px;border-radius:50%;background:#2563eb;position:relative;">
              <div style="position:absolute;inset:-3px;border-radius:50%;border:1px solid #2563eb;animation:wld-pulse-ring 1.5s ease-out infinite;"></div>
            </div>
            ${stats.playersOnline.toLocaleString()} online
          </div>
          
          <!-- Apple three-dashes menu taskbar toggle -->
          <button id="taskbar-toggle" style="
            background:transparent;border:none;display:flex;flex-direction:column;gap:5px;cursor:pointer;padding:8px;z-index:9700;
          ">
            <span id="tb-line-1" style="width:20px;height:1.5px;background:#fff;transition:all 0.3s;"></span>
            <span id="tb-line-2" style="width:20px;height:1.5px;background:#fff;transition:all 0.3s;"></span>
            <span id="tb-line-3" style="width:20px;height:1.5px;background:#fff;transition:all 0.3s;"></span>
          </button>
        </div>
      </nav>

      <!-- ══════════ CHAPTER 01 — THE PROVING GROUND (HERO) ══════════ -->
      <section id="chapter-01" class="editorial-chapter" style="position:relative;padding:120px 32px 80px;max-width:1380px;margin:0 auto;">
        <div class="bg-guidelines"></div>
        <div class="editorial-chapter-badge">Chapter 01 · Proving Ground</div>
        <h1 class="editorial-hero-title">Connect by xiberlin<span style="color:#e2b857;">c</span>.</h1>
        <p class="editorial-subhead">
          An architectural cognitive ecosystem. Verify real-time working memory scores, inspect candidate constellations, and engage in high-fidelity spatial telemetry rooms.
        </p>

        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:64px;">
          <button id="hero-play-btn" class="magnetic-btn" data-cursor="PLAY" style="
            padding:18px 36px;border-radius:14px;border:none;
            background:#ffffff;color:#050507;font-family:'Space Grotesk',sans-serif;
            font-weight:700;font-size:13px;cursor:pointer;text-transform:uppercase;
            letter-spacing:0.1em;box-shadow:0 14px 40px rgba(255,255,255,0.15);
            transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);
          ">
            Enter Proving Ground Assessment
          </button>
        </div>

        <!-- Live Telemetry Bar -->
        <div class="editorial-card-glass" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));padding:24px;gap:16px;max-width:1100px;margin-bottom:40px;">
          ${[
            {label:'Candidates Registered',value:stats.totalPlayers.toLocaleString()||'—'},
            {label:'Online Nodes',value:stats.playersOnline.toLocaleString(),live:true},
            {label:'Active Stars',value:stats.starsLive,live:true},
            {label:'Telemetry Spaces',value:stats.activeRooms,live:true},
            {label:'Global Regions',value:stats.countriesRepresented||'—'}
          ].map(s => `
            <div style="text-align:left;">
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                ${s.live ? `<div class="live-dot"></div>` : ''}
                <span style="font-family:'Outfit',sans-serif;font-size:1.6rem;font-weight:800;color:#ffffff;">${s.value}</span>
              </div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;text-transform:uppercase;letter-spacing:0.18em;color:rgba(255,255,255,0.35);">${s.label}</div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- ══════════ PERSONAL TERMINAL ══════════ -->
      <section id="wld-sec-profile" style="padding:40px 32px 80px;max-width:1380px;margin:0 auto;">
        ${!userProfile || userProfile.length === 0 ? `
          <div class="wld-reveal editorial-card-glass" style="padding:40px;">
            <div style="display:flex;align-items:center;gap:18px;margin-bottom:20px;">
              <div style="width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:rgba(255,255,255,0.4);">?</div>
              <div style="text-align:left;">
                <div style="font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:1.15rem;color:#fff;">${auth.currentUser?.displayName || 'Gamer'}</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.35);">${auth.currentUser?.email || ''}</div>
              </div>
            </div>
            <div style="font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.45);line-height:1.6;margin-bottom:24px;text-align:left;">
              You have not claimed a profile yet. Completing your first Working Memory assessment will instantly record your composite score, assign your star rank, and build your social graph nodes.
            </div>
            <div style="text-align:left;">
              <button id="profile-play-btn" class="magnetic-btn" data-cursor="START" style="
                display: inline-flex; align-items: center; gap: 8px;
                padding: 14px 28px; border-radius: 10px; border: none;
                background: #ffffff; color: #000000; font-family: 'Space Grotesk', sans-serif;
                font-weight: 700; font-size: 12.5px; cursor: pointer; text-transform: uppercase;
                letter-spacing: 0.08em; transition: all 0.2s;
              ">
                Play Working Memory Test
              </button>
            </div>
          </div>
        ` : `
          <div class="wld-reveal editorial-card-glass" style="padding:40px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;margin-bottom:28px;">
              <div style="display:flex;align-items:center;gap:18px;">
                ${auth.currentUser?.photoURL 
                  ? `<img src="${auth.currentUser.photoURL}" style="width:54px;height:54px;border-radius:50%;border:2px solid #e2b857;" />`
                  : `<div style="width:54px;height:54px;border-radius:50%;background:rgba(226,184,87,0.1);border:2px solid #e2b857;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:700;font-size:1.3rem;color:#e2b857;">${(auth.currentUser?.displayName || 'P')[0].toUpperCase()}</div>`
                }
                <div style="text-align:left;">
                  <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:1.25rem;color:#fff;margin-bottom:1px;">${auth.currentUser?.displayName || 'Gamer'}</div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#e2b857;">@${(auth.currentUser?.email || '').split('@')[0]}</div>
                </div>
              </div>
              
              <div>
                <button id="profile-play-btn-retry" class="magnetic-btn" data-cursor="RETRY" style="
                  padding: 12px 24px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
                  background: transparent; color: #ffffff; font-family: 'Space Grotesk', sans-serif;
                  font-weight: 600; font-size: 12px; cursor: pointer; text-transform: uppercase;
                  letter-spacing: 0.05em; transition: all 0.2s;
                ">
                  Retake Assessment
                </button>
              </div>
            </div>

            <!-- Personal Tabs -->
            <div style="display:flex;gap:16px;margin-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:10px;">
              <button id="tab-profile-stats" style="background:transparent;border:none;color:#fff;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;cursor:pointer;padding:4px 8px;border-bottom:2px solid #e2b857;transition:color 0.2s;">GLANCE STATS</button>
              <button id="tab-profile-constellation" style="background:transparent;border:none;color:rgba(255,255,255,0.5);font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;cursor:pointer;padding:4px 8px;transition:color 0.2s;">CONSTELLATION GRAPH</button>
              <button id="tab-profile-connections" style="background:transparent;border:none;color:rgba(255,255,255,0.5);font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;cursor:pointer;padding:4px 8px;transition:color 0.2s;">CONNECTIONS ${incomingRequests.length ? `<span style="background:#ec4899;color:#fff;font-size:8px;font-weight:700;padding:1px 5px;border-radius:10px;margin-left:4px;">${incomingRequests.length}</span>` : ''}</button>
            </div>

            <!-- Tab 1: Glance Stats & History -->
            <div id="profile-container-stats">
              <!-- Stats Glance -->
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px;">
                <div style="background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.03);border-radius:12px;padding:16px;text-align:left;">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Latest Composite WMI</div>
                  <div style="font-family:'Outfit',sans-serif;font-size:1.75rem;font-weight:800;color:#2563eb;">${userProfile[0].score}</div>
                </div>
                <div style="background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.03);border-radius:12px;padding:16px;text-align:left;">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Mean Reaction Time</div>
                  <div style="font-family:'Outfit',sans-serif;font-size:1.75rem;font-weight:800;color:#e2b857;">${userProfile[0].reactionMs}ms</div>
                </div>
                <div style="background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.03);border-radius:12px;padding:16px;text-align:left;">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Accuracy Level</div>
                  <div style="font-family:'Outfit',sans-serif;font-size:1.75rem;font-weight:800;color:#ec4899;">${Math.round(userProfile[0].accuracy * 100)}%</div>
                </div>
              </div>

              <!-- History Logs -->
              <div>
                <h4 style="font-family:'Space Grotesk',sans-serif;font-size:10px;text-transform:uppercase;color:rgba(255,255,255,0.4);letter-spacing:0.12em;margin-bottom:12px;text-align:left;">Cognitive History & Progress Tracker</h4>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${userProfile.map((attempt, index) => {
                    const date = new Date(attempt.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                    return `
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:rgba(255,255,255,0.01);border:1px solid rgba(255,255,255,0.03);border-radius:10px;">
                        <div style="display:flex;align-items:center;gap:12px;">
                          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.35);">#${userProfile.length - index}</span>
                          <span style="font-family:'Space Grotesk',sans-serif;font-size:13px;color:#fff;font-weight:500;">WMI Score: ${attempt.score}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:16px;">
                          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.4);">${date}</span>
                          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#e2b857;background:rgba(226,184,87,0.08);border:1px solid rgba(226,184,87,0.2);border-radius:4px;padding:2px 7px;">VERIFIED</span>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>

            <!-- Tab 2: Constellation Graph Canvas -->
            <div id="profile-container-constellation" style="display:none;position:relative;width:100%;height:340px;background:#050507;border-radius:12px;border:1px solid rgba(255,255,255,0.04);overflow:hidden;">
              <canvas id="constellation-canvas" style="width:100%;height:100%;display:block;"></canvas>
              <div id="constellation-tooltip" style="position:absolute;pointer-events:none;background:rgba(8,8,12,0.92);border:1px solid rgba(226,184,87,0.35);border-radius:8px;padding:10px 14px;font-family:'Space Grotesk',sans-serif;font-size:11px;color:#fff;opacity:0;transition:opacity 0.12s;z-index:100;backdrop-filter:blur(12px);box-shadow:0 12px 36px rgba(0,0,0,0.6);text-align:left;"></div>
            </div>

            <!-- Tab 3: Connections panel -->
            <div id="profile-container-connections" style="display:none;text-align:left;">
              <!-- Recommended Connections -->
              <div style="margin-bottom:24px;">
                <h4 style="font-family:'Space Grotesk',sans-serif;font-size:10px;text-transform:uppercase;color:#e2b857;letter-spacing:0.08em;margin-bottom:10px;">Recommended Connections</h4>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${recommendedPlayers.length === 0 ? `
                    <div style="font-size:11px;color:rgba(255,255,255,0.3);padding:6px 0;">No new profile recommendations at this time.</div>
                  ` : recommendedPlayers.map(r => `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(226,184,87,0.025);border:1px solid rgba(226,184,87,0.12);border-radius:8px;">
                      <div>
                        <div style="font-size:12px;font-weight:600;color:#fff;">${r.name}</div>
                        <div style="font-size:10px;color:rgba(255,255,255,0.45);font-family:'JetBrains Mono',monospace;">${r.handle || r.email.split('@')[0]} · WMI: ${r.wmi}</div>
                      </div>
                      <button class="conn-send-invite-btn magnetic-btn" data-cursor="CONNECT" data-email="${r.email}" data-handle="${r.handle || r.email.split('@')[0]}" data-name="${r.name}" data-uid="${r.uid || ''}" style="background:#e2b857;color:#000;border:none;border-radius:4px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;">Connect</button>
                    </div>
                  `).join('')}
                </div>
              </div>

              <!-- Pending Requests -->
              ${incomingRequests.length > 0 ? `
                <div style="margin-bottom:24px;">
                  <h4 style="font-family:'Space Grotesk',sans-serif;font-size:10px;text-transform:uppercase;color:#ec4899;letter-spacing:0.08em;margin-bottom:10px;">Pending Connection Requests</h4>
                  <div style="display:flex;flex-direction:column;gap:8px;">
                    ${incomingRequests.map(r => `
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(236,72,153,0.02);border:1px solid rgba(236,72,153,0.12);border-radius:8px;">
                        <div>
                          <div style="font-size:12px;font-weight:600;color:#fff;">${r.senderName}</div>
                          <div style="font-size:10px;color:rgba(255,255,255,0.45);font-family:'JetBrains Mono',monospace;">${r.senderHandle}</div>
                        </div>
                        <div style="display:flex;gap:6px;">
                          <button class="conn-accept-btn magnetic-btn" data-id="${r.id}" style="background:#2563eb;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:10px;font-weight:600;cursor:pointer;">Accept</button>
                          <button class="conn-decline-btn magnetic-btn" data-id="${r.id}" style="background:transparent;color:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:4px 10px;font-size:10px;cursor:pointer;">Decline</button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <!-- Connected Friends List -->
              <div>
                <h4 style="font-family:'Space Grotesk',sans-serif;font-size:10px;text-transform:uppercase;color:rgba(255,255,255,0.35);letter-spacing:0.08em;margin-bottom:10px;">My Connections (${connections.length})</h4>
                ${connections.length === 0 ? `
                  <div style="font-family:'Space Grotesk',sans-serif;font-size:11px;color:rgba(255,255,255,0.35);padding:10px 0;text-align:center;">
                    No connection links established yet.
                  </div>
                ` : `
                  <div style="display:grid;grid-template-columns:1fr;gap:6px;max-height:220px;overflow-y:auto;">
                    ${connections.map(c => `
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(255,255,255,0.01);border:1px solid rgba(255,255,255,0.02);border-radius:8px;">
                        <div style="display:flex;align-items:center;gap:10px;">
                          <div style="width:24px;height:24px;border-radius:50%;background:#e2b857;color:#000;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;">${(c.name[0]||'P').toUpperCase()}</div>
                          <div>
                            <div style="font-size:12px;font-weight:600;color:#fff;">${c.name}</div>
                            <div style="font-size:10px;color:rgba(255,255,255,0.45);font-family:'JetBrains Mono',monospace;">${c.handle}</div>
                          </div>
                        </div>
                        <span style="font-family:'JetBrains Mono',monospace;font-size:9.5px;color:#2563eb;background:rgba(37,99,235,0.08);border:1px solid rgba(37,99,235,0.18);border-radius:4px;padding:1px 6px;">CONNECTED</span>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>
          </div>
        `}
      </section>

      <!-- ══════════ CHAPTER 02 — NEURAL CONSTELLATIONS ══════════ -->
      <section id="chapter-02" class="editorial-chapter" style="padding:100px 32px;max-width:1380px;margin:0 auto;border-top:1px solid rgba(255,255,255,0.05);">
        <div class="editorial-chapter-badge">Chapter 02 · Constellations</div>
        <h2 class="editorial-hero-title" style="font-size:clamp(2.5rem,6vw,5rem);margin-bottom:16px;">The Star Network<span style="color:#e2b857;">.</span></h2>
        <p class="editorial-subhead" style="margin-bottom:48px;">
          Verified candidate scores derived from high-stakes cognitive testing. Real players, real latency metrics, synchronized live from the Firestore ledger.
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:24px;" id="wld-stars-grid">
          ${stars.length ? stars.map(p => _starCard(p)).join('') : _emptyState('No stars registered yet.')}
        </div>
      </section>

      <!-- ══════════ CHAPTER 03 — GLOBAL RANKINGS ══════════ -->
      <section id="chapter-03" class="editorial-chapter" style="padding:100px 32px;background:rgba(12,12,16,0.5);border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);">
        <div style="max-width:1380px;margin:0 auto;">
          <div class="editorial-chapter-badge">Chapter 03 · Rankings</div>
          <h2 class="editorial-hero-title" style="font-size:clamp(2.5rem,6vw,5rem);margin-bottom:16px;">Leaderboard Ledger<span style="color:#2563eb;">.</span></h2>
          <p class="editorial-subhead" style="margin-bottom:48px;">
            Composite cognitive score distribution across all candidates in the global network.
          </p>
          ${_leaderboardHtml(leaderboard.global)}
        </div>
      </section>

      <!-- ══════════ CHAPTER 04 — TELEMETRY SPACES ══════════ -->
      <section id="chapter-04" class="editorial-chapter" style="padding:100px 32px;max-width:1380px;margin:0 auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;margin-bottom:24px;">
          <div>
            <div class="editorial-chapter-badge">Chapter 04 · Telemetry</div>
            <h2 class="editorial-hero-title" style="font-size:clamp(2.5rem,6vw,5rem);margin:0;">Spatial Rooms<span style="color:#06b6d4;">.</span></h2>
          </div>
          <button id="create-custom-channel-btn" class="magnetic-btn" data-cursor="CREATE" style="
            background:transparent;border:1px solid rgba(255,255,255,0.2);color:#ffffff;
            border-radius:10px;padding:12px 24px;font-family:'Space Grotesk',sans-serif;
            font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;
            cursor:pointer;transition:all 0.3s;
          ">Create Custom Channel</button>
        </div>
        <p class="editorial-subhead" style="margin-bottom:48px;">
          Real-time collaborative audio & telemetry environments for peer synchronization.
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:24px;">
          ${NEURO_ROOMS.map((r, i) => _roomCard(r, i)).join('')}
          ${customRooms.map((r, i) => _roomCard(r, NEURO_ROOMS.length + i)).join('')}
        </div>
      </section>

      <!-- ══════════ CHAPTER 05 — PROVING GROUND ══════════ -->
      <section id="chapter-05" class="editorial-chapter" style="padding:100px 32px;background:rgba(8,8,12,0.8);border-top:1px solid rgba(255,255,255,0.05);">
        <div style="max-width:1380px;margin:0 auto;">
          <div class="editorial-chapter-badge">Chapter 05 · Tournaments</div>
          <h2 class="editorial-hero-title" style="font-size:clamp(2.5rem,6vw,5rem);margin-bottom:16px;">Active Events<span style="color:#ec4899;">.</span></h2>
          <p class="editorial-subhead" style="margin-bottom:48px;">
            Scheduled cognitive competitions and high-frequency working memory trials.
          </p>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
            ${EVENTS.map(e => _eventCard(e)).join('')}
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer style="padding:60px 32px 30px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:16px;border-top:1px solid rgba(255,255,255,0.05);">
        <div style="width:28px;height:28px;border-radius:6px;background:#000;border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;overflow:hidden;padding:4px;opacity:0.6;">
          <img src="/xiberlinc_logo.png" style="width:100%;height:100%;object-fit:contain;mix-blend-mode:screen;" />
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.25em;color:rgba(255,255,255,0.3);">
          Xiberlin<span style="color:#e2b857;">c</span> World · Architectural Edition · Season 1
        </div>
      </footer>

    </div>

    <!-- Custom Room Modal -->
    <div id="custom-room-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(16px);z-index:9999;align-items:center;justify-content:center;">
      <div style="background:#09090b;border:1px solid rgba(255,255,255,0.06);border-radius:18px;width:90%;max-width:440px;padding:28px;box-shadow:0 24px 64px rgba(0,0,0,0.8);">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="font-family:'Space Grotesk',sans-serif;font-size:1.1rem;font-weight:700;color:#fff;margin:0;text-transform:uppercase;">Create Custom Channel</h3>
          <button id="custom-room-close" style="background:transparent;border:none;color:rgba(255,255,255,0.4);font-size:18px;cursor:pointer;line-height:1;" onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='rgba(255,255,255,0.4)'">&times;</button>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div>
            <label style="display:block;font-size:9.5px;font-family:'Space Grotesk',sans-serif;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Channel Name</label>
            <input type="text" id="custom-room-name-input" placeholder="e.g. Brainstorming Arena" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 14px;color:#fff;font-family:'Space Grotesk',sans-serif;font-size:13px;outline:none;" />
          </div>
          
          <div>
            <label style="display:block;font-size:9.5px;font-family:'Space Grotesk',sans-serif;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Invite Connections</label>
            <div id="custom-room-invites-list" style="max-height:160px;overflow-y:auto;border:1px solid rgba(255,255,255,0.04);border-radius:8px;background:rgba(0,0,0,0.2);padding:10px;display:flex;flex-direction:column;gap:8px;">
              ${connections.length === 0 ? `
                <div style="font-size:11px;color:rgba(255,255,255,0.3);text-align:center;padding:12px 0;">No active connections. Add players in your Personal Terminal to invite them.</div>
              ` : connections.map(c => `
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(255,255,255,0.75);">
                  <input type="checkbox" class="room-invite-checkbox" value="${c.email}" style="accent-color:#7c3aed;" />
                  <span>${c.name} (${c.handle})</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <button id="custom-room-submit" style="width:100%;background:#06b6d4;color:#000;border:none;border-radius:8px;padding:12px;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;cursor:pointer;transition:background 0.2s;" onmouseenter="this.style.background='#0891b2'" onmouseleave="this.style.background='#06b6d4'">Create Channel</button>
        </div>
      </div>
    </div>
  `;

  // Hook up event listeners for navigation overlay (taskbar)
  const navToggle = document.getElementById('taskbar-toggle');
  const overlay   = document.getElementById('taskbar-overlay');
  
  const tb1 = document.getElementById('tb-line-1');
  const tb2 = document.getElementById('tb-line-2');
  const tb3 = document.getElementById('tb-line-3');

  if (navToggle && overlay) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = overlay.style.opacity === '1';
      if (isOpen) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        if (tb1) tb1.style.transform = '';
        if (tb2) tb2.style.opacity = '1';
        if (tb3) tb3.style.transform = '';
      } else {
        overlay.style.opacity = '1';
        overlay.style.pointerEvents = 'auto';
        if (tb1) tb1.style.transform = 'translateY(6.5px) rotate(45deg)';
        if (tb2) tb2.style.opacity = '0';
        if (tb3) tb3.style.transform = 'translateY(-6.5px) rotate(-45deg)';
      }
    });

    // Close menu when clicking overlay background
    overlay.addEventListener('click', () => {
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      if (tb1) tb1.style.transform = '';
      if (tb2) tb2.style.opacity = '1';
      if (tb3) tb3.style.transform = '';
    });
  }

  // Set up shortcuts inside Control Center
  const hookNav = (id, targetId) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        if (tb1) tb1.style.transform = '';
        if (tb2) tb2.style.opacity = '1';
        if (tb3) tb3.style.transform = '';
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  };

  hookNav('taskbar-sec-1', 'wld-sec-1');
  hookNav('taskbar-sec-2', 'wld-sec-2');
  hookNav('taskbar-sec-3', 'wld-sec-3');
  hookNav('taskbar-sec-4', 'wld-sec-4');

  const triggerPlayFlow = () => {
    const user = auth.currentUser;
    if (user) {
      const name = user.displayName || 'Gamer';
      const email = user.email || '';
      const handle = email.split('@')[0] || 'player';
      
      const metadata = {
        lang: 'en',
        screenSize: `${window.screen.width}x${window.screen.height}`,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        userAgent: navigator.userAgent
      };

      Storage.saveCurrentSession({
        name,
        email,
        age: 25,
        gender: 'Undisclosed',
        handle,
        startedAt: new Date().toISOString(),
        trials: [],
        metadata
      });

      // Close taskbar overlay if open
      if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
      }
      if (tb1) tb1.style.transform = '';
      if (tb2) tb2.style.opacity = '1';
      if (tb3) tb3.style.transform = '';

      navigate('instructions', { task: 'vwm-pure' });
    }
  };

  document.getElementById('taskbar-play-vwm')?.addEventListener('click', triggerPlayFlow);
  document.getElementById('hero-play-btn')?.addEventListener('click', triggerPlayFlow);
  document.getElementById('profile-play-btn')?.addEventListener('click', triggerPlayFlow);
  document.getElementById('profile-play-btn-retry')?.addEventListener('click', triggerPlayFlow);
  // Tab toggling logic for personal terminal
  const tabStats = document.getElementById('tab-profile-stats');
  const tabConst = document.getElementById('tab-profile-constellation');
  const tabConn = document.getElementById('tab-profile-connections');
  
  const containerStats = document.getElementById('profile-container-stats');
  const containerConst = document.getElementById('profile-container-constellation');
  const containerConn = document.getElementById('profile-container-connections');

  let canvasCleanup = null;

  if (tabStats && tabConst && tabConn && containerStats && containerConst && containerConn) {
    tabStats.addEventListener('click', () => {
      tabStats.style.color = '#fff';
      tabStats.style.borderBottom = '2px solid #7c3aed';
      tabConst.style.color = 'rgba(255,255,255,0.5)';
      tabConst.style.borderBottom = 'none';
      tabConn.style.color = 'rgba(255,255,255,0.5)';
      tabConn.style.borderBottom = 'none';

      containerStats.style.display = 'block';
      containerConst.style.display = 'none';
      containerConn.style.display = 'none';

      if (canvasCleanup) {
        canvasCleanup();
        canvasCleanup = null;
      }
    });

    tabConst.addEventListener('click', () => {
      tabConst.style.color = '#fff';
      tabConst.style.borderBottom = '2px solid #7c3aed';
      tabStats.style.color = 'rgba(255,255,255,0.5)';
      tabStats.style.borderBottom = 'none';
      tabConn.style.color = 'rgba(255,255,255,0.5)';
      tabConn.style.borderBottom = 'none';

      containerStats.style.display = 'none';
      containerConst.style.display = 'block';
      containerConn.style.display = 'none';

      if (canvasCleanup) canvasCleanup();
      canvasCleanup = _initConstellationCanvas(players, userProfile);
    });

    tabConn.addEventListener('click', () => {
      tabConn.style.color = '#fff';
      tabConn.style.borderBottom = '2px solid #7c3aed';
      tabStats.style.color = 'rgba(255,255,255,0.5)';
      tabStats.style.borderBottom = 'none';
      tabConst.style.color = 'rgba(255,255,255,0.5)';
      tabConst.style.borderBottom = 'none';

      containerStats.style.display = 'none';
      containerConst.style.display = 'none';
      containerConn.style.display = 'block';

      if (canvasCleanup) {
        canvasCleanup();
        canvasCleanup = null;
      }
    });
  }

  // Connections Recommended list event listener binding
  document.querySelectorAll('.conn-send-invite-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rec = {
        uid: btn.getAttribute('data-uid'),
        email: btn.getAttribute('data-email'),
        name: btn.getAttribute('data-name'),
        handle: btn.getAttribute('data-handle')
      };
      btn.disabled = true;
      btn.textContent = 'Sending...';
      try {
        await sendConnectionRequest(rec);
        btn.textContent = 'Sent';
        btn.style.background = '#2563eb';
      } catch(err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = 'Connect';
      }
    });
  });

  // Bind pending request buttons (Accept / Decline)
  document.querySelectorAll('.conn-accept-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rId = btn.getAttribute('data-id');
      btn.disabled = true;
      btn.textContent = 'Accepting...';
      try {
        await respondToConnectionRequest(rId, 'accepted');
        const updatedData = await _fetchWorldData();
        _renderDashboard(updatedData);
      } catch(e) {
        alert(e.message);
        btn.disabled = false;
        btn.textContent = 'Accept';
      }
    });
  });

  document.querySelectorAll('.conn-decline-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rId = btn.getAttribute('data-id');
      btn.disabled = true;
      btn.textContent = 'Declining...';
      try {
        await respondToConnectionRequest(rId, 'declined');
        const updatedData = await _fetchWorldData();
        _renderDashboard(updatedData);
      } catch(e) {
        alert(e.message);
        btn.disabled = false;
        btn.textContent = 'Decline';
      }
    });
  });

  // Custom Channel modal triggers
  const createChannelBtn = document.getElementById('create-custom-channel-btn');
  const customModal = document.getElementById('custom-room-modal');
  const customClose = document.getElementById('custom-room-close');
  const customSubmit = document.getElementById('custom-room-submit');
  const customNameInput = document.getElementById('custom-room-name-input');

  if (createChannelBtn && customModal && customClose) {
    createChannelBtn.addEventListener('click', () => {
      customModal.style.display = 'flex';
      customNameInput.value = '';
      customModal.querySelectorAll('.room-invite-checkbox').forEach(cb => cb.checked = false);
    });

    customClose.addEventListener('click', () => {
      customModal.style.display = 'none';
    });

    customSubmit?.addEventListener('click', async () => {
      const roomName = customNameInput.value.trim();
      if (!roomName) {
        alert("Please enter a channel name.");
        return;
      }
      
      const invitees = [];
      customModal.querySelectorAll('.room-invite-checkbox:checked').forEach(cb => {
        invitees.push(cb.value);
      });

      customSubmit.disabled = true;
      customSubmit.textContent = 'Creating Channel...';
      try {
        await createCustomRoom(roomName, invitees);
        customModal.style.display = 'none';
        const freshData = await _fetchWorldData();
        _renderDashboard(freshData);
      } catch(e) {
        alert("Failed to create room: " + e.message);
        customSubmit.disabled = false;
        customSubmit.textContent = 'Create Channel';
      }
    });
  }
  document.getElementById('taskbar-goto-home')?.addEventListener('click', () => {
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    if (tb1) tb1.style.transform = '';
    if (tb2) tb2.style.opacity = '1';
    if (tb3) tb3.style.transform = '';
    dash.scrollTop = 0;
  });

  // Handle Logout (Logs out of Google and returns to Welcome screen)
  document.getElementById('taskbar-logout')?.addEventListener('click', async () => {
    try {
      window.xiberlinc_world_loaded = false;
      sessionStorage.removeItem('xiberlinc_world_loaded');
      await auth.signOut();
    } catch (e) {}
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    if (tb1) tb1.style.transform = '';
    if (tb2) tb2.style.opacity = '1';
    if (tb3) tb3.style.transform = '';
    navigate('');
  });

  // Trigger Awwwards Cinematic Animations & reveal all elements
  document.querySelectorAll('.wld-reveal').forEach(el => el.classList.add('visible'));

  setTimeout(() => {
    splitTextReveal('#world-dashboard h1, #world-dashboard h2');
    maskedReveal('#world-dashboard .editorial-card-glass', { clipFrom: 'inset(100% 0% 0% 0%)', yFrom: 40 });
    staggerCards3D('.wld-star-card');
    staggerCards3D('.wld-room-card');
    staggerCards3D('.wld-event-card');
    bindMagneticElements();
    refreshMotion();

    // Text Scramble Character Hover Effect
    const chars = '!<>-_\/[]{}—=+*^?#________';
    document.querySelectorAll('.scramble-text').forEach(el => {
      const originalText = el.getAttribute('data-text') || el.textContent;
      el.addEventListener('mouseenter', () => {
        let iteration = 0;
        const interval = setInterval(() => {
          el.textContent = originalText
            .split('')
            .map((char, index) => {
              if (index < iteration) return originalText[index];
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join('');
          if (iteration >= originalText.length) clearInterval(interval);
          iteration += 1 / 2;
        }, 30);
      });
    });
  }, 100);

  // Hide watermark and transition dashboard Spline opacity
  const dashSpline = document.getElementById('dashboard-spline-el');
  if (dashSpline) {
    _hideSplineLogo(dashSpline);
    setTimeout(() => {
      dashSpline.style.opacity = '1';
    }, 150);
  }

  // Setup Chatrooms (Dedicated Screen Router version)
  function _setupChatrooms(players, userProfile) {
    const enterBtns = document.querySelectorAll('.enter-room-btn');
    const deleteBtns = document.querySelectorAll('.delete-room-btn');
    
    enterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roomId = btn.getAttribute('data-room-id');
        const room = NEURO_ROOMS.find(r => r.id === roomId) || customRooms.find(r => r.id === roomId);
        if (room) {
          const userScore = userProfile && userProfile[0] ? Math.round(userProfile[0].score) : null;
          const isEligible = !room.locked || (userScore && userScore >= 100);

          if (!isEligible) {
            _showAccessDeniedModal(room, userScore);
          } else {
            navigate('room', { roomId: room.id });
          }
        }
      });
    });

    deleteBtns.forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const roomId = btn.getAttribute('data-room-id');
        if (confirm("Are you sure you want to delete this custom neuro channel? This cannot be undone.")) {
          btn.disabled = true;
          try {
            await deleteCustomRoom(roomId);
            const updatedData = await _fetchWorldData();
            _renderDashboard(updatedData);
          } catch(err) {
            alert("Error deleting room: " + err.message);
            btn.disabled = false;
          }
        }
      });
    });
  }

  function _showAccessDeniedModal(room, userScore) {
    const modal = document.createElement('div');
    modal.id = 'wld-lock-modal';
    modal.style.cssText = `
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(5,5,8,0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      display: flex; align-items: center; justify-content: center; padding: 24px;
      animation: wld-fade-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    `;
    modal.innerHTML = `
      <div style="
        background: #0c0c0e; border: 1px solid rgba(236,72,153,0.18); border-radius: 20px;
        padding: 40px 32px; max-width: 400px; width: 100%; text-align: center;
        box-shadow: 0 20px 50px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.03);
        position: relative;
      ">
        <button id="close-lock-modal" style="
          position: absolute; top: 16px; right: 20px; background: transparent; border: none;
          color: rgba(255,255,255,0.3); font-size: 24px; cursor: pointer; transition: color 0.2s;
        " onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='rgba(255,255,255,0.3)'">&times;</button>
        
        <div style="
          width: 74px; height: 74px; border-radius: 50%; background: rgba(236,72,153,0.08);
          border: 2px solid #ec4899; display: flex; align-items: center; justify-content: center;
          font-size: 2.2rem; color: #ec4899; margin: 0 auto 24px;
          box-shadow: 0 0 20px rgba(236,72,153,0.25); animation: wld-float 4s infinite ease-in-out;
        ">🔒</div>
        
        <h3 style="
          font-family: 'Instrument Serif', serif; font-style: italic; font-size: 1.8rem;
          text-transform: uppercase; color: #fff; margin-bottom: 12px; letter-spacing: 0.04em;
        ">Encryption Block</h3>
        
        <p style="
          font-family: 'Space Grotesk', sans-serif; font-size: 13px; color: rgba(255,255,255,0.45);
          line-height: 1.6; margin-bottom: 28px;
        ">
          The channel <strong>${room.name}</strong> is restricted to candidates with a verified <strong>${room.lockRank}</strong> profile (100+ WMI score).
        </p>
        
        <div style="
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
          padding: 16px 20px; border-radius: 12px; margin-bottom: 28px;
          display: flex; justify-content: space-between; align-items: center; text-align: left;
        ">
          <div>
            <div style="font-size: 9px; font-family: 'JetBrains Mono', monospace; color: rgba(255,255,255,0.3); text-transform: uppercase;">Your WMI Profile</div>
            <div style="font-size: 1.35rem; font-family: 'Outfit', sans-serif; font-weight: 800; color: ${userScore ? '#ec4899' : 'rgba(255,255,255,0.25)'};">${userScore || 'NOT EVALUATED'}</div>
          </div>
          <div style="font-size: 11px; color: rgba(255,255,255,0.4); text-align: right; max-width: 160px;">
            ${userScore ? 'Platinum / Gold Tier rank' : 'No evaluation data found'}
          </div>
        </div>
        
        <button id="lock-modal-btn" style="
          width: 100%; padding: 13px; border-radius: 10px; border: none;
          background: #7c3aed; color: #fff; font-family: 'Space Grotesk', sans-serif;
          font-weight: 600; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.08em;
          cursor: pointer; transition: all 0.2s; box-shadow: 0 8px 24px rgba(124,58,237,0.3);
        " onmouseenter="this.style.transform='scale(1.02)'" onmouseleave="this.style.transform=''">
          Take Assessment
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    const closeModal = () => modal.remove();
    document.getElementById('close-lock-modal')?.addEventListener('click', closeModal);
    document.getElementById('lock-modal-btn')?.addEventListener('click', () => {
      closeModal();
      triggerPlayFlow();
    });
  }

  _setupChatrooms(players, userProfile);

  // Global unmount handler for WorldView dashboard
  const handleWorldUnmount = () => {
    if (!window.location.hash.startsWith('#/world')) {
      console.error("[World] Unmounting WorldView. Cleaning up WebGL & canvas loops...");
      
      // 1. Clean up constellation canvas loop
      if (canvasCleanup) {
        try {
          canvasCleanup();
        } catch(e) {}
        canvasCleanup = null;
      }
      
      // 2. Locate and remove Spline Viewer instances to prevent WebGL leaks
      document.querySelectorAll('spline-viewer').forEach(el => {
        try {
          if (el.shadowRoot) {
            const innerCanvas = el.shadowRoot.querySelector('canvas');
            if (innerCanvas) {
              const gl = innerCanvas.getContext('webgl2') || innerCanvas.getContext('webgl');
              if (gl) {
                const extension = gl.getExtension('WEBGL_lose_context');
                if (extension) extension.loseContext();
              }
              innerCanvas.width = 0;
              innerCanvas.height = 0;
              innerCanvas.remove();
            }
          }
          el.remove();
        } catch(e) {
          console.error("[World] Error cleaning up spline-viewer:", e);
        }
      });
      
      window.removeEventListener('hashchange', handleWorldUnmount);
    }
  };
  window.addEventListener('hashchange', handleWorldUnmount);
}


/* ════════════════════════════════════════════════════════════
   SUB-RENDERERS (NO WATERMARK EMOJIS)
   ════════════════════════════════════════════════════════════ */
function _starCard(p) {
  const wmi = p.wmi || 0;
  return `
    <div class="wld-star-card wld-reveal editorial-card-glass" data-cursor="VIEW" style="
      border-radius:18px;overflow:hidden;position:relative;
    ">
      <div style="height:64px;background:linear-gradient(135deg,${p.avatarColor}14 0%,${p.avatarColor}04 100%);border-bottom:1px solid rgba(255,255,255,0.04);position:relative;">
        <div style="position:absolute;top:12px;right:12px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:${p.tier==='star'?'#e2b857':'#2563eb'};background:${p.tier==='star'?'rgba(226,184,87,0.1)':'rgba(37,99,235,0.1)'};border:1px solid ${p.tier==='star'?'rgba(226,184,87,0.25)':'rgba(37,99,235,0.25)'};border-radius:4px;padding:2px 8px;">${p.tier==='star'?'STAR':'RISING'}</div>
        </div>
        <div style="position:absolute;bottom:-18px;right:14px;font-family:'JetBrains Mono',monospace;font-size:9px;color:${p.avatarColor};background:#09090c;border:1px solid ${p.avatarColor}33;border-radius:5px;padding:2px 8px;">${formatChainDistance(p.chainDistance)}</div>
      </div>
      <div style="padding:24px 20px 20px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <div style="width:42px;height:42px;border-radius:50%;background:${p.avatarColor}14;border:2px solid ${p.avatarColor}44;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:700;font-size:1.05rem;color:${p.avatarColor};flex-shrink:0;">
            ${p.avatar}
          </div>
          <div>
            <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:1rem;color:#fff;margin-bottom:1px;">${p.name}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9.5px;color:${p.avatarColor};">${p.handle}</div>
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:18px;">
          ${[
            {label:'WMI',val:wmi,col:'#2563eb'},
            {label:'Rxn',val:p.reactionMs+'ms',col:'#e2b857'},
            {label:'Trust',val:Math.round(p.trustScore*100)+'%',col:'#ec4899'}
          ].map(s=>`
            <div style="text-align:center;background:rgba(255,255,255,0.02);border-radius:8px;padding:10px 4px;border:1px solid rgba(255,255,255,0.03);">
              <div style="font-family:'Outfit',sans-serif;font-weight:800;font-size:0.95rem;color:${s.col};">${s.val}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.3);margin-top:3px;">${s.label}</div>
            </div>
          `).join('')}
        </div>
        
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div>
            <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:1rem;color:#fff;">${p.followers}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.3);">Followers</div>
          </div>
          <button class="wld-follow-btn magnetic-btn" data-cursor="FOLLOW" style="padding:8px 16px;font-size:10.5px;background:${p.avatarColor}12;color:${p.avatarColor};border:1px solid ${p.avatarColor}33;border-radius:8px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;transition:all 0.2s;">Follow</button>
        </div>
        
        <div style="display:flex;gap:6px;flex-wrap:wrap;padding-top:14px;border-top:1px solid rgba(255,255,255,0.04);">
          ${p.tags.map(t=>`<span style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.35);background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:4px;padding:3px 8px;">#${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function _leaderboardHtml(rows) {
  if (!rows?.length) return _emptyState('No ranked players yet.');
  const max = rows[0]?.score || 1;
  return `
    <div class="wld-reveal" style="display:flex;flex-direction:column;gap:10px;">
      ${rows.map((entry, i) => {
        const rankCol = i===0?'#e2b857':i===1?'#2563eb':i===2?'#ec4899':'rgba(255,255,255,0.4)';
        const pct     = (entry.score / max * 100).toFixed(1);
        const p       = entry.player;
        return `
          <div style="
            display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:16px;
            padding:16px 24px;
            background:rgba(12,12,16,0.6);border:1px solid rgba(255,255,255,0.05);border-radius:14px;
            transition:all 0.3s cubic-bezier(0.16,1,0.3,1);
          " class="wld-lb-row editorial-row-card" data-cursor="RANK"
          >
            <div style="text-align:center;font-family:'Outfit',sans-serif;font-weight:800;font-size:1.2rem;color:${rankCol};">
              #${entry.rank}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                <div style="width:32px;height:32px;border-radius:50%;background:${p.avatarColor||'#e2b857'}14;border:1.5px solid ${p.avatarColor||'#e2b857'}33;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:700;font-size:0.85rem;color:${p.avatarColor||'#e2b857'};flex-shrink:0;">${p.avatar||'?'}</div>
                <div>
                  <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.95rem;color:#fff;">${p.name}</div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,0.35);">${p.handle||''}</div>
                </div>
              </div>
              <div style="height:3px;background:rgba(255,255,255,0.04);border-radius:99px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${rankCol};border-radius:99px;transition:width 1s cubic-bezier(0.16,1,0.3,1);"></div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:'Outfit',sans-serif;font-weight:800;font-size:1.35rem;color:${i<3?rankCol:'#fff'};">${entry.score}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.3);text-transform:uppercase;">WMI SCORE</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function _roomCard(room, index = 0) {
  const online = room.online !== undefined ? room.online : 0;
  const tags = room.tags || ['custom', 'private'];
  const locked = room.locked !== undefined ? room.locked : false;
  const isCreator = room.isCustom && auth.currentUser && (room.creatorUid === auth.currentUser.uid || room.creatorEmail === auth.currentUser.email);
  const roomNum = (index + 1).toString().padStart(2, '0');

  return `
    <div class="wld-room-card wld-reveal editorial-card-glass" data-cursor="ENTER ROOM" style="
      border-radius:18px;padding:28px;position:relative;overflow:hidden;
      transition:all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    ">
      <!-- Background Big Room Number -->
      <div style="
        font-family:'Montserrat',sans-serif;font-size:4.2rem;font-weight:900;
        color:rgba(255,255,255,0.04);position:absolute;top:0.4rem;right:1.2rem;
        line-height:1;pointer-events:none;letter-spacing:-0.04em;
      ">${roomNum}</div>

      <!-- Accent Bar -->
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${room.colorHex};opacity:0.85;"></div>

      ${isCreator ? `
        <button class="delete-room-btn" data-room-id="${room.id}" style="position:absolute;top:16px;right:16px;background:transparent;border:none;color:rgba(255,255,255,0.3);font-size:12px;cursor:pointer;z-index:10;transition:color 0.2s;" onmouseenter="this.style.color='#ef4444'" onmouseleave="this.style.color='rgba(255,255,255,0.3)'" title="Delete Channel">
          ❌
        </button>
      ` : ''}

      <!-- Top Header Row with Pixel Box & Japanese Tag -->
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
        <div style="
          width:38px;height:38px;border-radius:10px;background:${room.colorHex}18;
          border:1px solid ${room.colorHex}44;display:grid;grid-template-columns:repeat(3,1fr);
          grid-template-rows:repeat(3,1fr);gap:2px;padding:6px;flex-shrink:0;
        ">
          <span style="background:${room.colorHex};border-radius:1px;"></span>
          <span style="background:rgba(255,255,255,0.2);border-radius:1px;"></span>
          <span style="background:${room.colorHex};border-radius:1px;"></span>
          <span style="background:rgba(255,255,255,0.2);border-radius:1px;"></span>
          <span style="background:${room.colorHex};border-radius:1px;"></span>
          <span style="background:rgba(255,255,255,0.2);border-radius:1px;"></span>
          <span style="background:${room.colorHex};border-radius:1px;"></span>
          <span style="background:rgba(255,255,255,0.2);border-radius:1px;"></span>
          <span style="background:${room.colorHex};border-radius:1px;"></span>
        </div>
        <div>
          <div style="font-family:'M PLUS 1p','Space Grotesk',sans-serif;font-size:9px;font-weight:700;letter-spacing:0.18em;color:${room.colorHex};text-transform:uppercase;">神経空間 · NEURAL SPACE</div>
          <div style="font-family:'Montserrat','Outfit',sans-serif;font-weight:800;font-size:1.15rem;color:#ffffff;letter-spacing:-0.01em;">${room.name}</div>
        </div>
      </div>

      <!-- Description -->
      <p style="font-family:'Raleway','Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.55);margin-bottom:20px;line-height:1.65;min-height:3em;">${room.description}</p>

      <!-- Tags & Active Nodes -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:22px;padding-top:14px;border-top:1px solid rgba(255,255,255,0.04);">
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${tags.map(t=>`<span style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:${room.colorHex};background:${room.colorHex}0f;border:1px solid ${room.colorHex}25;border-radius:100px;padding:3px 10px;letter-spacing:0.05em;">#${t}</span>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="live-dot" style="background:${room.colorHex};"></div>
          <span style="font-family:'JetBrains Mono',monospace;font-size:9.5px;color:${room.colorHex};font-weight:700;">${online.toLocaleString()} NODES</span>
        </div>
      </div>

      <!-- Action Row with Arrow Circle Button -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
        <button class="enter-room-btn magnetic-btn" data-cursor="ENTER" data-room-id="${room.id}" style="
          flex:1;padding:12px 18px;border-radius:10px;
          border:1px solid ${locked?'rgba(236,72,153,0.3)':`${room.colorHex}44`};
          background:${locked?'rgba(236,72,153,0.08)':`${room.colorHex}14`};
          color:${locked?'#ec4899':room.colorHex};font-family:'Montserrat',sans-serif;
          font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;cursor:pointer;
        ">
          ${locked ? 'LOCKED — RANK ' + room.lockRank : 'ENTER NEURO ROOM'}
        </button>

        <div class="arrow-link enter-room-btn" data-room-id="${room.id}" style="
          width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;
          justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.3s ease;
        " onmouseenter="this.style.background='#ffffff';this.querySelector('svg').style.stroke='${room.colorHex}'" onmouseleave="this.style.background='rgba(255,255,255,0.06)';this.querySelector('svg').style.stroke='#ffffff'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
      </div>
    </div>
  `;
}

function _eventCard(event) {
  const fill = Math.round(event.participants / event.maxParticipants * 100);
  const fillCol = fill >= 95 ? '#ec4899' : fill >= 70 ? '#7c3aed' : '#2563eb';
  const now = new Date(); const diff = event.date - now;
  const days = Math.floor(diff / 86400000);
  const hrs  = Math.floor((diff % 86400000) / 3600000);
  const countdown = diff <= 0 ? 'LIVE NOW' : days > 0 ? `${days}d ${hrs}h` : `${hrs}h`;

  return `
    <div class="wld-event-card wld-reveal" style="
      background:#0c0c0e;border:1px solid rgba(255,255,255,0.05);border-radius:16px;
      overflow:hidden;cursor:pointer;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);
    ">
      <div style="height:3px;background:linear-gradient(90deg,${event.colorHex},${event.colorHex}44);"></div>
      <div style="padding:18px 20px 14px;background:linear-gradient(135deg,${event.colorHex}0d 0%,transparent 60%);border-bottom:1px solid rgba(255,255,255,0.03);">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:8px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.12em;color:${event.colorHex};background:${event.colorHex}0d;border:1px solid ${event.colorHex}22;border-radius:4px;padding:2px 7px;">${event.type}</div>
          <div style="text-align:right;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.22);margin-bottom:1px;">Starts in</div>
            <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:1.15rem;color:${event.colorHex};">${countdown}</div>
          </div>
        </div>
        <h3 style="font-family:'Outfit',sans-serif;font-weight:700;font-size:1.15rem;color:#fff;margin-bottom:3px;">${event.title}</h3>
        <div style="font-size:12.5px;color:rgba(255,255,255,0.4);margin-bottom:4px;">${event.subtitle}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9.5px;color:rgba(255,255,255,0.25);">LOC: ${event.region}</div>
      </div>
      <div style="padding:14px 20px 18px;">
        <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;color:rgba(255,255,255,0.22);margin-bottom:5px;">
          <span>Capacity</span><span style="color:${fillCol};">${fill}% full</span>
        </div>
        <div style="height:2px;background:rgba(255,255,255,0.04);border-radius:99px;overflow:hidden;margin-bottom:14px;">
          <div style="height:100%;width:${fill}%;background:${fillCol};border-radius:99px;transition:width 1s ease-out;"></div>
        </div>
        <button style="width:100%;padding:10px;border-radius:8px;border:none;background:${event.full?'rgba(255,255,255,0.05)':'#fff'};color:${event.full?'rgba(255,255,255,0.3)':'#000'};font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:0.06em;cursor:pointer;transition:all 0.2s;" ${event.full?'disabled':''}>
          ${event.full ? 'Sold Out' : 'Register'}
        </button>
      </div>
    </div>
  `;
}

function _emptyState(msg) {
  return `
    <div class="wld-reveal" style="grid-column:1/-1;text-align:center;padding:48px 24px;border:1px dashed rgba(255,255,255,0.05);border-radius:16px;background:rgba(255,255,255,0.015);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:0.1em;">${msg}</div>
    </div>
  `;
}

function _delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function _hideSplineLogo(el) {
  if (!el) return;
  const logoInterval = setInterval(() => {
    try {
      const shadowRoot = el.shadowRoot;
      if (shadowRoot) {
        const logo = shadowRoot.getElementById('logo');
        if (logo) {
          logo.style.display = 'none';
          clearInterval(logoInterval);
        }
      }
    } catch (e) {}
  }, 200);
  setTimeout(() => clearInterval(logoInterval), 12000);
}
