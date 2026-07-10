/* ============================================================
   WorldView — Xiberlinc World Redesign (Google Auth Gate)
   ============================================================ */

import { render } from '../utils/dom.js';
import { injectStyle, navigate } from '../router.js';
import { Storage } from '../utils/storage.js';
import { fetchTopPlayers, buildLeaderboard, fetchLiveStats, fetchUserProfile } from '../utils/worldData.js';
import { signInWithGoogle, auth, db } from '../utils/firebase.js';
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

  // Inject world CSS styling variables
  const worldLink = document.createElement('link');
  worldLink.rel = 'stylesheet';
  worldLink.href = '/src/styles/world.css';
  worldLink.setAttribute('data-view-style', '');
  if (!document.querySelector('link[href="/src/styles/world.css"]')) {
    document.head.appendChild(worldLink);
  }

  // Render the wrapper structures
  render(`
    <div id="world-root" style="position:fixed;inset:0;z-index:9000;background:#000000;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;overflow:hidden;">
      
      <!-- ── GOOGLE AUTH GATE SCREEN ── -->
      <div id="world-auth-gate" style="
        position:absolute;inset:0;z-index:9500;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        background:#000000;transition:opacity 0.8s ease, transform 0.8s ease;
        padding:24px;text-align:center;
      ">
        <div style="margin-bottom:36px;max-width:340px;">
          <div style="width:54px;height:54px;border-radius:12px;background:#000;border:1.2px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;overflow:hidden;padding:8px;margin:0 auto 20px;box-shadow:0 8px 24px rgba(255,255,255,0.05);">
            <img src="/xiberlinc_logo.png" style="width:100%;height:100%;object-fit:contain;mix-blend-mode:screen;filter:brightness(1.4);" />
          </div>
          <h1 style="
            font-family:'Instrument Serif', serif;
            font-style:italic;
            font-size:clamp(2rem, 5.2vw, 3rem);
            font-weight:400;
            text-transform:uppercase;
            letter-spacing:0.04em;
            color:#ffffff;
            margin:0 0 10px 0;
          ">Connect by xiberlin<span style="color:#ec4899;">c</span><span style="color:#7c3aed;font-style:normal;">.</span></h1>
          <p style="font-family:'Space Grotesk',sans-serif;font-size:12.5px;color:rgba(255,255,255,0.45);line-height:1.65;margin:0;">
            welcome to the xiberlinc Experience
          </p>
        </div>

        <button id="google-login-btn" style="
          display:inline-flex;align-items:center;gap:12px;
          background:#ffffff;color:#000000;border:none;border-radius:12px;
          padding:14px 28px;font-family:'Space Grotesk',sans-serif;font-weight:600;
          font-size:13.5px;cursor:pointer;box-shadow:0 12px 30px rgba(255,255,255,0.08);
          transition:all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        " onmouseenter="this.style.transform='scale(1.02)';this.style.boxShadow='0 16px 40px rgba(255,255,255,0.15)'" onmouseleave="this.style.transform='';this.style.boxShadow='0 12px 30px rgba(255,255,255,0.08)'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.31l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>
      </div>

      <!-- ── LOADER SCREEN ── -->
      <div id="world-loader" style="
        position:absolute;inset:0;z-index:9000;
        overflow:hidden;background:#000000;display:none;
      ">
        <!-- Spline -->
        <div style="position:absolute;inset:0;">
          <spline-viewer
            id="spline-el"
            url="/master.splinecode"
            loading-anim-type="none"
            style="width:100%;height:100%;opacity:0;transition:opacity 2.5s ease;"
          ></spline-viewer>
        </div>

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
      <div id="world-dashboard" style="display:none;position:absolute;inset:0;overflow-y:auto;z-index:8000;background:#000000;"></div>

      <!-- ── CHATROOM BACKDROP overlay ── -->
      <div id="wld-chat-backdrop" style="
        position:fixed;inset:0;z-index:9100;
        background:rgba(0,0,0,0.6);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);
        opacity:0;pointer-events:none;transition:opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      "></div>

      <!-- ── CHATROOM SLIDE-OUT PANEL ── -->
      <div id="wld-chat-panel" style="
        position:fixed;top:0;right:-480px;width:460px;height:100%;z-index:9200;
        background:rgba(8,8,10,0.85);backdrop-filter:blur(35px);-webkit-backdrop-filter:blur(35px);
        border-left:1px solid rgba(255,255,255,0.08);box-shadow:-10px 0 40px rgba(0,0,0,0.8);
        display:flex;flex-direction:column;transition:right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        color:#fff;font-family:'Space Grotesk',sans-serif;
      "></div>

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
    .wld-reveal { opacity:0;transform:translateY(28px);transition:opacity 0.7s cubic-bezier(0.2,0,0,1),transform 0.7s cubic-bezier(0.2,0,0,1); }
    .wld-reveal.visible { opacity:1;transform:translateY(0); }
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

  // Verify current auth user
  const user = auth.currentUser;
  const isGoogle = user && !user.isAnonymous;

  if (isGoogle) {
    // Already authenticated with Google, go straight to loader
    if (authGate) authGate.style.display = 'none';
    _startLoader();
  } else {
    // Show Google Auth Gate
    if (loginBtn) {
      loginBtn.addEventListener('click', async () => {
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
        }
      });
    }
  }
}

const LOADER_MS = 15000;

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

  _renderDashboard(worldData);
}

/* ════════════════════════════════════════════════════════════
   DATA FETCH
   ════════════════════════════════════════════════════════════ */
async function _fetchWorldData() {
  try {
    const user = auth.currentUser;
    const email = user && !user.isAnonymous ? user.email : null;

    const [players, stats, userProfile] = await Promise.all([
      fetchTopPlayers(20),
      fetchLiveStats(),
      email ? fetchUserProfile(email) : Promise.resolve([])
    ]);
    const leaderboard = buildLeaderboard(players);
    return { players, stats, leaderboard, userProfile };
  } catch (e) {
    console.error('[World] Data fetch failed:', e);
    return { players: [], stats: { playersOnline: 0, starsLive: 0, activeRooms: 6, totalPlayers: 0, countriesRepresented: 0 }, leaderboard: { region: [], country: [], global: [] }, userProfile: [] };
  }
}

/* ════════════════════════════════════════════════════════════
   CONSTELLATION CANVAS ALGORITHM
   ════════════════════════════════════════════════════════════ */
function _initConstellationCanvas(players) {
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

  const graph = getSocialGraphData(players);
  let mouse = { x: -1000, y: -1000 };
  let hoveredNode = null;
  let animFrame = null;
  let time = 0;

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });

  canvas.addEventListener('mouseleave', () => {
    mouse = { x: -1000, y: -1000 };
    hoveredNode = null;
    if (tooltip) tooltip.style.opacity = '0';
  });

  const ringRadii = [0.12, 0.28, 0.44, 0.60];

  function draw() {
    time += 0.015;
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.015)';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(124, 58, 237, 0.05)';
    ctx.lineWidth = 1;
    const ringRadiusPx = ringRadii.map(r => r * Math.min(width, height));
    ringRadiusPx.forEach((rPx) => {
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, rPx, 0, 2 * Math.PI);
      ctx.stroke();
    });

    const scaleCoord = (node) => {
      const cx = width / 2;
      const cy = height / 2;
      if (node.isUser) return { x: cx, y: cy };
      
      const rIdx = node.ring - 1;
      const ringRadius = ringRadii[rIdx] * Math.min(width, height);
      const thetaOffset = time * (0.08 / (rIdx + 1));
      
      const nodesInRing = graph.nodes.filter(n => n.ring === node.ring);
      const angle = (2 * Math.PI) / Math.max(1, nodesInRing.length);
      const nodeIndex = nodesInRing.indexOf(node);
      const theta = angle * nodeIndex - Math.PI / 2 + thetaOffset;

      return {
        x: cx + ringRadius * Math.cos(theta),
        y: cy + ringRadius * Math.sin(theta)
      };
    };

    graph.edges.forEach((edge) => {
      const fromNode = graph.nodes.find(n => n.id === edge.from);
      const toNode = graph.nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;

      const p1 = scaleCoord(fromNode);
      const p2 = scaleCoord(toNode);

      const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
      grad.addColorStop(0, '#d4ff00');
      grad.addColorStop(1, '#7c3aed');

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.globalAlpha = edge.opacity * (0.7 + 0.3 * Math.sin(time * 2 + edge.opacity * 10));
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });

    let newHovered = null;
    graph.nodes.forEach((node) => {
      const p = scaleCoord(node);
      const r = node.radius + Math.sin(time * 3 + node.radius) * 1.5;

      const dx = mouse.x - p.x;
      const dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isHovered = dist < node.radius + 8;

      if (isHovered) newHovered = node;

      ctx.save();
      ctx.shadowBlur = isHovered ? 25 : 12;
      ctx.shadowColor = node.color;

      ctx.beginPath();
      ctx.arc(p.x, p.y, isHovered ? r * 1.3 : r, 0, 2 * Math.PI);
      ctx.fillStyle = node.color;
      ctx.fill();
      ctx.restore();

      if (node.isUser || isHovered) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `600 ${isHovered ? 11 : 9.5}px 'Space Grotesk', sans-serif`;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = "9px 'Space Grotesk', sans-serif";
      }
      ctx.textAlign = 'center';
      ctx.fillText(node.label, p.x, p.y - r - 6);
    });

    if (newHovered !== hoveredNode) {
      hoveredNode = newHovered;
      if (hoveredNode && tooltip) {
        tooltip.style.opacity = '1';
        if (hoveredNode.isUser) {
          tooltip.innerHTML = `
            <div style="font-weight:700;color:#d4ff00;margin-bottom:2px;">You</div>
            <div style="color:rgba(255,255,255,0.5);font-size:9px;">Constellation Core</div>
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
      const p = scaleCoord(hoveredNode);
      tooltip.style.left = `${p.x + 12}px`;
      tooltip.style.top = `${p.y - 40}px`;
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
function _renderDashboard({ players, stats, leaderboard, userProfile }) {
  const dash = document.getElementById('world-dashboard');
  if (!dash) return;

  const stars   = players.filter(p => p.tier === 'star' || p.tier === 'rising').slice(0, 6);
  const hasData = players.length > 0;

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

      <!-- ══════════ HERO SECTION (WITH SPLINE AT TOP) ══════════ -->
      <section style="position:relative;width:100%;height:42vh;background:#000000;overflow:hidden;margin-top:50px;display:flex;align-items:center;justify-content:center;">
        <spline-viewer
          id="dashboard-spline-el"
          url="/world_homepage.splinecode"
          loading-anim-type="none"
          style="width:100%;height:100%;transform:scale(1.48);transform-origin:top center;opacity:0;transition:opacity 1.5s ease;"
        ></spline-viewer>
        <!-- Soft gradient mask at the bottom -->
        <div style="position:absolute;inset:0;pointer-events:none;background:linear-gradient(to bottom, transparent 65%, #000000 100%);"></div>
      </section>

      <!-- ══════════ INTRO & CONNECT SECTION ══════════ -->
      <div style="max-width:1240px;margin:0 auto;padding:0 24px;text-align:center;">
        <h1 style="
          font-family:'Instrument Serif', serif;
          font-style:italic;
          font-weight:400;
          font-size:clamp(2.4rem,6.8vw,4.5rem);
          line-height:1.1;
          margin:0 0 16px;
          color:#ffffff;
          text-transform:uppercase;
          letter-spacing:0.02em;
        ">Connect by xiberlin<span style="color:#ec4899;">c</span><span style="color:#7c3aed;font-style:normal;">.</span></h1>
        
        <p style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;color:rgba(255,255,255,0.45);max-width:540px;margin:0 auto 24px;line-height:1.75;">
          Explore the live social network of elite players, verify cognitive profiles from the candidates database, and join active neuro rooms.
        </p>

        <button id="hero-play-btn" style="
          margin: 0 auto 40px; display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 26px; border-radius: 10px; border: none;
          background: #7c3aed; color: #fff; font-family: 'Space Grotesk', sans-serif;
          font-weight: 600; font-size: 13px; cursor: pointer; text-transform: uppercase;
          letter-spacing: 0.08em; transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 24px rgba(124, 58, 237, 0.25);
        " onmouseenter="this.style.transform='scale(1.02)';this.style.boxShadow='0 14px 32px rgba(124, 58, 237, 0.45)';" onmouseleave="this.style.transform='';this.style.boxShadow='0 10px 24px rgba(124, 58, 237, 0.25)';">
          Play Working Memory
        </button>

        <!-- Live stats strip -->
        <div style="display:flex;border:1px solid rgba(255,255,255,0.06);border-radius:14px;overflow:hidden;background:rgba(20,20,25,0.45);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);max-width:800px;margin:0 auto 64px;">
          ${[
            {label:'Players',value:stats.totalPlayers.toLocaleString() || '—',color:'#2563eb',live:false},
            {label:'Online Now',value:stats.playersOnline.toLocaleString(),color:'#7c3aed',live:true},
            {label:'Countries',value:stats.countriesRepresented || '—',color:'#ec4899',live:false},
            {label:'Active Stars',value:stats.starsLive,color:'#06b6d4',live:true},
            {label:'Neuro Rooms',value:stats.activeRooms,color:'#7c3aed',live:true},
          ].map((s,i,arr) => `
            <div style="flex:1;padding:16px 8px;text-align:center;${i<arr.length-1?'border-right:1px solid rgba(255,255,255,0.05)':''};">
              <div style="display:flex;align-items:center;justify-content:center;gap:5px;margin-bottom:3px;">
                ${s.live ? `<div style="width:5px;height:5px;border-radius:50%;background:${s.color};position:relative;"><div style="position:absolute;inset:-3px;border-radius:50%;border:1px solid ${s.color};animation:wld-pulse-ring 1.5s ease-out infinite;"></div></div>` : ''}
                <span style="font-family:'Outfit',sans-serif;font-size:1.3rem;font-weight:700;color:#fff;">${s.value}</span>
              </div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.3);">${s.label}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ══════════ PERSONAL TERMINAL ══════════ -->
      <section id="wld-sec-profile" style="padding:40px 24px;max-width:1240px;margin:0 auto;">
        ${!userProfile || userProfile.length === 0 ? `
          <div class="wld-reveal" style="background:#0c0c0e;border:1px solid rgba(255,255,255,0.06);border-radius:18px;padding:32px;">
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
              <button id="profile-play-btn" style="
                display: inline-flex; align-items: center; gap: 8px;
                padding: 12px 24px; border-radius: 9px; border: none;
                background: #7c3aed; color: #fff; font-family: 'Space Grotesk', sans-serif;
                font-weight: 600; font-size: 12.5px; cursor: pointer; text-transform: uppercase;
                letter-spacing: 0.06em; transition: all 0.2s;
              " onmouseenter="this.style.transform='translateY(-1px)'" onmouseleave="this.style.transform=''">
                Play Working Memory Test
              </button>
            </div>
          </div>
        ` : `
          <div class="wld-reveal" style="background:#0c0c0e;border:1px solid rgba(255,255,255,0.06);border-radius:18px;padding:32px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;margin-bottom:28px;">
              <div style="display:flex;align-items:center;gap:18px;">
                ${auth.currentUser?.photoURL 
                  ? `<img src="${auth.currentUser.photoURL}" style="width:54px;height:54px;border-radius:50%;border:2px solid #7c3aed;" />`
                  : `<div style="width:54px;height:54px;border-radius:50%;background:#7c3aed22;border:2px solid #7c3aed;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:700;font-size:1.3rem;color:#7c3aed;">${(auth.currentUser?.displayName || 'P')[0].toUpperCase()}</div>`
                }
                <div style="text-align:left;">
                  <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:1.25rem;color:#fff;margin-bottom:1px;">${auth.currentUser?.displayName || 'Gamer'}</div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7c3aed;">@${(auth.currentUser?.email || '').split('@')[0]}</div>
                </div>
              </div>
              
              <div>
                <button id="profile-play-btn-retry" style="
                  padding: 10px 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);
                  background: transparent; color: rgba(255,255,255,0.65); font-family: 'Space Grotesk', sans-serif;
                  font-weight: 600; font-size: 12px; cursor: pointer; text-transform: uppercase;
                  letter-spacing: 0.05em; transition: all 0.2s;
                " onmouseenter="this.style.background='rgba(255,255,255,0.05)';this.style.color='#fff'" onmouseleave="this.style.background='transparent';this.style.color='rgba(255,255,255,0.65)'">
                  Retake Assessment
                </button>
              </div>
            </div>

            <!-- Personal Tabs -->
            <div style="display:flex;gap:16px;margin-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:10px;">
              <button id="tab-profile-stats" style="background:transparent;border:none;color:#fff;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;cursor:pointer;padding:4px 8px;border-bottom:2px solid #7c3aed;transition:color 0.2s;">GLANCE STATS</button>
              <button id="tab-profile-constellation" style="background:transparent;border:none;color:rgba(255,255,255,0.5);font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:12px;cursor:pointer;padding:4px 8px;transition:color 0.2s;">CONSTELLATION GRAPH</button>
            </div>

            <!-- Tab 1: Glance Stats & History -->
            <div id="profile-container-stats">
              <!-- Stats Glance -->
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:28px;">
                <div style="background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.03);border-radius:12px;padding:16px;text-align:left;">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.22);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Latest Composite WMI</div>
                  <div style="font-family:'Outfit',sans-serif;font-size:1.75rem;font-weight:800;color:#2563eb;">${userProfile[0].score}</div>
                </div>
                <div style="background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.03);border-radius:12px;padding:16px;text-align:left;">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.22);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Mean Reaction Time</div>
                  <div style="font-family:'Outfit',sans-serif;font-size:1.75rem;font-weight:800;color:#7c3aed;">${userProfile[0].reactionMs}ms</div>
                </div>
                <div style="background:rgba(255,255,255,0.015);border:1px solid rgba(255,255,255,0.03);border-radius:12px;padding:16px;text-align:left;">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.22);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Accuracy Level</div>
                  <div style="font-family:'Outfit',sans-serif;font-size:1.75rem;font-weight:800;color:#ec4899;">${Math.round(userProfile[0].accuracy * 100)}%</div>
                </div>
              </div>

              <!-- History Logs -->
              <div>
                <h4 style="font-family:'Space Grotesk',sans-serif;font-size:10px;text-transform:uppercase;color:rgba(255,255,255,0.35);letter-spacing:0.12em;margin-bottom:12px;text-align:left;">Cognitive History & Progress Tracker</h4>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${userProfile.map((attempt, index) => {
                    const date = new Date(attempt.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                    return `
                      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 18px;background:rgba(255,255,255,0.01);border:1px solid rgba(255,255,255,0.02);border-radius:8px;">
                        <div style="display:flex;align-items:center;gap:12px;">
                          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.25);">#${userProfile.length - index}</span>
                          <span style="font-family:'Space Grotesk',sans-serif;font-size:13px;color:#fff;font-weight:500;">WMI Score: ${attempt.score}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:16px;">
                          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:rgba(255,255,255,0.3);">${date}</span>
                          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#7c3aed;background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.18);border-radius:4px;padding:2px 7px;">VERIFIED</span>
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
              <div id="constellation-tooltip" style="position:absolute;pointer-events:none;background:rgba(8,8,12,0.92);border:1px solid rgba(124,58,237,0.35);border-radius:8px;padding:10px 14px;font-family:'Space Grotesk',sans-serif;font-size:11px;color:#fff;opacity:0;transition:opacity 0.12s;z-index:100;backdrop-filter:blur(12px);box-shadow:0 12px 36px rgba(0,0,0,0.6);text-align:left;"></div>
            </div>
          </div>
        `}
      </section>

      <!-- ══════════ STARS SECTION ══════════ -->
      <section id="wld-sec-1" style="padding:60px 24px;max-width:1240px;margin:0 auto;">
        <div class="wld-reveal" style="margin-bottom:40px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9.5px;text-transform:uppercase;letter-spacing:0.2em;color:#7c3aed;margin-bottom:10px;">Star System</div>
          <h2 style="font-family:'Instrument Serif',serif;font-style:italic;font-weight:400;font-size:clamp(1.8rem,4vw,2.8rem);color:#fff;text-transform:uppercase;margin-bottom:10px;">The Constellations<span style="color:#7c3aed;font-style:normal;">.</span></h2>
          <p style="max-width:500px;color:rgba(255,255,255,0.45);font-size:13px;line-height:1.6;">Top performers from the cognitive assessment. Real players, real scores — ranked live from the Firestore database.</p>
          ${!hasData ? '<div style="margin-top:16px;font-family:JetBrains Mono,monospace;font-size:11px;color:#ec4899;">No candidate data yet — be the first to complete the assessment!</div>' : ''}
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:18px;" id="wld-stars-grid">
          ${stars.length ? stars.map(p => _starCard(p)).join('') : _emptyState('No stars yet — complete the assessment to claim your rank.')}
        </div>
      </section>

      <!-- ══════════ LEADERBOARD ══════════ -->
      <section id="wld-sec-2" style="padding:60px 24px;background:rgba(37,99,235,0.015);border-top:1px solid rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.02);">
        <div style="max-width:1240px;margin:0 auto;">
          <div class="wld-reveal" style="margin-bottom:40px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9.5px;text-transform:uppercase;letter-spacing:0.2em;color:#2563eb;margin-bottom:10px;">Live Rankings</div>
            <h2 style="font-family:'Instrument Serif',serif;font-style:italic;font-weight:400;font-size:clamp(1.8rem,4vw,2.8rem);color:#fff;text-transform:uppercase;margin-bottom:10px;">Leaderboard<span style="color:#2563eb;font-style:normal;">.</span></h2>
            <p style="max-width:500px;color:rgba(255,255,255,0.45);font-size:13px;line-height:1.6;">Real scores from the public-collector database, ordered by composite cognitive score.</p>
          </div>
          ${_leaderboardHtml(leaderboard.global)}
        </div>
      </section>

      <!-- ══════════ NEURO ROOMS ══════════ -->
      <section id="wld-sec-3" style="padding:60px 24px;max-width:1240px;margin:0 auto;">
        <div class="wld-reveal" style="margin-bottom:40px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9.5px;text-transform:uppercase;letter-spacing:0.2em;color:#06b6d4;margin-bottom:10px;">Community</div>
          <h2 style="font-family:'Instrument Serif',serif;font-style:italic;font-weight:400;font-size:clamp(1.8rem,4vw,2.8rem);color:#fff;text-transform:uppercase;margin-bottom:10px;">Neuro Rooms<span style="color:#06b6d4;font-style:normal;">.</span></h2>
          <p style="max-width:500px;color:rgba(255,255,255,0.45);font-size:13px;line-height:1.6;">Real-time social spaces where players connect, decompress, and build mental resilience together.</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
          ${NEURO_ROOMS.map(r => _roomCard(r)).join('')}
        </div>
      </section>

      <!-- ══════════ EVENTS ══════════ -->
      <section id="wld-sec-4" style="padding:60px 24px;background:rgba(124,58,237,0.015);border-top:1px solid rgba(255,255,255,0.02);border-bottom:1px solid rgba(255,255,255,0.02);">
        <div style="max-width:1240px;margin:0 auto;">
          <div class="wld-reveal" style="margin-bottom:40px;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:9.5px;text-transform:uppercase;letter-spacing:0.2em;color:#ec4899;margin-bottom:10px;">Compete</div>
            <h2 style="font-family:'Instrument Serif',serif;font-style:italic;font-weight:400;font-size:clamp(1.8rem,4vw,2.8rem);color:#fff;text-transform:uppercase;margin-bottom:10px;">Tournaments & Events<span style="color:#ec4899;font-style:normal;">.</span></h2>
            <p style="max-width:500px;color:rgba(255,255,255,0.45);font-size:13px;line-height:1.6;">From local meetups to global championships — the Xiberlin<span style="color:#ec4899;">c</span> World never stops competing.</p>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;">
            ${EVENTS.map(e => _eventCard(e)).join('')}
          </div>
        </div>
      </section>

      <!-- FOOTER -->
      <footer style="padding:48px 24px 20px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:12px;">
        <div style="width:24px;height:24px;border-radius:5px;background:#000;border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;overflow:hidden;padding:3.5px;opacity:0.4;">
          <img src="/xiberlinc_logo.png" style="width:100%;height:100%;object-fit:contain;mix-blend-mode:screen;" />
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;text-transform:uppercase;letter-spacing:0.18em;color:rgba(255,255,255,0.22);">
          Xiberlin<span style="color:#ec4899;">c</span> World · Season 1 · public-collector · 7-chain principle
        </div>
      </footer>

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
  const containerStats = document.getElementById('profile-container-stats');
  const containerConst = document.getElementById('profile-container-constellation');

  let canvasCleanup = null;

  if (tabStats && tabConst && containerStats && containerConst) {
    tabStats.addEventListener('click', () => {
      tabStats.style.color = '#fff';
      tabStats.style.borderBottom = '2px solid #7c3aed';
      tabConst.style.color = 'rgba(255,255,255,0.5)';
      tabConst.style.borderBottom = 'none';

      containerStats.style.display = 'block';
      containerConst.style.display = 'none';

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

      containerStats.style.display = 'none';
      containerConst.style.display = 'block';

      if (canvasCleanup) canvasCleanup();
      canvasCleanup = _initConstellationCanvas(players);
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
      await auth.signOut();
    } catch (e) {}
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
    if (tb1) tb1.style.transform = '';
    if (tb2) tb2.style.opacity = '1';
    if (tb3) tb3.style.transform = '';
    navigate('');
  });

  // Scroll Reveal Observer
  const revealElements = document.querySelectorAll('.wld-reveal');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  revealElements.forEach(el => obs.observe(el));

  // Hide watermark and transition dashboard Spline opacity
  const dashSpline = document.getElementById('dashboard-spline-el');
  if (dashSpline) {
    _hideSplineLogo(dashSpline);
    setTimeout(() => {
      dashSpline.style.opacity = '1';
    }, 150);
  }

  // Setup Chatrooms
  function _setupChatrooms(players, userProfile) {
    const enterBtns = document.querySelectorAll('.enter-room-btn');
    const backdrop = document.getElementById('wld-chat-backdrop');
    
    enterBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const roomId = btn.getAttribute('data-room-id');
        const room = NEURO_ROOMS.find(r => r.id === roomId);
        if (room) {
          _openChatRoom(room, userProfile, players);
        }
      });
    });

    if (backdrop) {
      backdrop.addEventListener('click', _closeChatRoom);
    }
  }

  function getRankFromScore(composite) {
    if (composite >= 130) return { rank: 'Legend',   tier: 'star' };
    if (composite >= 115) return { rank: 'Master',   tier: 'star' };
    if (composite >= 100) return { rank: 'Diamond',  tier: 'rising' };
    if (composite >= 85)  return { rank: 'Platinum', tier: 'community' };
    if (composite >= 70)  return { rank: 'Gold',     tier: 'community' };
    return                       { rank: 'Silver',   tier: 'community' };
  }

  function _openChatRoom(room, userProfile, players) {
    const panel = document.getElementById('wld-chat-panel');
    const backdrop = document.getElementById('wld-chat-backdrop');
    if (!panel || !backdrop) return;

    // Slide in panel and backdrop
    panel.classList.add('open');
    panel.style.right = '0';
    backdrop.style.opacity = '1';
    backdrop.style.pointerEvents = 'auto';

    // Determine user eligibility
    const userScore = userProfile && userProfile[0] ? Math.round(userProfile[0].score) : null;
    const isEligible = !room.locked || (userScore && userScore >= 100);

    if (!isEligible) {
      // Access Restricted UI
      panel.innerHTML = `
        <!-- Header -->
        <div style="padding:24px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
          <div style="font-family:'Instrument Serif',serif; font-style:italic; font-size:1.5rem; text-transform:uppercase; color:#ec4899;">Restricted Area</div>
          <button id="wld-chat-close" style="background:transparent; border:none; color:rgba(255,255,255,0.4); font-size:24px; cursor:pointer;">&times;</button>
        </div>
        <!-- Restricted Body -->
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px; text-align:center; gap:20px;">
          <div style="width:80px; height:80px; border-radius:50%; background:rgba(236,72,153,0.1); border:2px solid #ec4899; display:flex; align-items:center; justify-content:center; font-size:2.5rem; color:#ec4899; box-shadow:0 0 20px rgba(236,72,153,0.3); animation:wld-float 4s infinite ease-in-out;">🔒</div>
          <h2 style="font-family:'Instrument Serif',serif; font-style:italic; font-size:1.8rem; text-transform:uppercase; color:#fff; letter-spacing:0.04em;">Encryption Lock</h2>
          <p style="color:rgba(255,255,255,0.4); font-size:13px; line-height:1.6; max-width:320px;">
            The <strong>${room.name}</strong> is restricted to candidates with a verified <strong>${room.lockRank}</strong> cognitive profile (100+ WMI).
          </p>
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:16px; border-radius:12px; width:100%; max-width:280px; display:flex; flex-direction:column; gap:6px;">
            <div style="font-size:10px; font-family:'JetBrains Mono',monospace; color:rgba(255,255,255,0.3); text-transform:uppercase;">Your WMI Profile</div>
            <div style="font-size:1.5rem; font-family:'Outfit',sans-serif; font-weight:800; color:${userScore ? '#ec4899' : 'rgba(255,255,255,0.2)'};">${userScore || 'NOT EVALUATED'}</div>
            <div style="font-size:10px; font-family:'Space Grotesk',sans-serif; color:rgba(255,255,255,0.4);">${userScore ? 'Platinum / Gold rank' : 'No assessment data found'}</div>
          </div>
          <button id="chat-restricted-play-btn" style="
            margin-top:12px; width:100%; max-width:280px; padding:12px; border-radius:8px; border:none;
            background:#7c3aed; color:#fff; font-family:'Space Grotesk',sans-serif; font-weight:600;
            font-size:12px; text-transform:uppercase; letter-spacing:0.08em; cursor:pointer;
            box-shadow:0 8px 20px rgba(124, 58, 237, 0.3); transition:all 0.2s;
          " onmouseenter="this.style.transform='scale(1.02)';" onmouseleave="this.style.transform='';">
            Take Assessment
          </button>
        </div>
      `;

      // Hook close button
      document.getElementById('wld-chat-close')?.addEventListener('click', _closeChatRoom);
      document.getElementById('chat-restricted-play-btn')?.addEventListener('click', () => {
        _closeChatRoom();
        triggerPlayFlow();
      });
      return;
    }

    // Active Chatroom UI
    panel.innerHTML = `
      <!-- Header -->
      <div style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(20,20,25,0.5); display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
        <div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px;">
            <span style="font-size:1.2rem;">${room.vibe}</span>
            <span style="font-family:'Outfit',sans-serif; font-weight:800; font-size:1.05rem; color:#fff;">${room.name}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <div style="width:6px; height:6px; border-radius:50%; background:${room.colorHex}; position:relative;">
              <div style="position:absolute; inset:-3px; border-radius:50%; border:1px solid ${room.colorHex}; animation:wld-pulse-ring 1.5s ease-out infinite;"></div>
            </div>
            <span style="font-family:'JetBrains Mono',monospace; font-size:9px; color:${room.colorHex}; letter-spacing:0.04em;">[WS CONNECTED] ${room.online} nodes</span>
          </div>
        </div>
        <button id="wld-chat-close" style="background:transparent; border:none; color:rgba(255,255,255,0.4); font-size:24px; cursor:pointer; padding:4px 8px;">&times;</button>
      </div>

      <!-- Active Users Horizontal List -->
      <div id="wld-chat-users" style="padding:10px 20px; border-bottom:1px solid rgba(255,255,255,0.04); background:rgba(10,10,12,0.3); display:flex; align-items:center; gap:10px; overflow-x:auto; flex-shrink:0;">
        <span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.3); text-transform:uppercase; letter-spacing:0.05em; flex-shrink:0; margin-right:4px;">active logs:</span>
      </div>

      <!-- Message List Area -->
      <div id="wld-chat-messages" style="flex:1; padding:20px; overflow-y:auto; display:flex; flex-direction:column; gap:16px; scroll-behavior:smooth;">
        <!-- Terminal Connection Log -->
        <div style="font-family:'JetBrains Mono',monospace; font-size:9.5px; color:#2563eb; line-height:1.5; padding:8px 12px; background:rgba(37,99,235,0.05); border:1px solid rgba(37,99,235,0.12); border-radius:8px; margin-bottom:8px;">
          <div>SYS_WS: Established socket connection to room nodes.</div>
          <div>SYS_LINK: Identity authenticated for candidate: ${auth.currentUser?.email || 'unknown'}</div>
        </div>
        <div id="chat-messages-container" style="display:flex; flex-direction:column; gap:14px;">
          <div style="text-align:center; padding:20px; color:rgba(255,255,255,0.2); font-size:11px;">Syncing websocket streams...</div>
        </div>
      </div>

      <!-- Reactions Float Overlay Container -->
      <div id="reactions-float-area" style="position:absolute; bottom:120px; right:30px; width:100px; height:240px; pointer-events:none; overflow:hidden; z-index:9300;"></div>

      <!-- Floating Emojis Quick Bar -->
      <div style="padding:8px 20px; background:rgba(10,10,12,0.5); border-top:1px solid rgba(255,255,255,0.04); display:flex; align-items:center; gap:8px; flex-shrink:0;">
        <span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.25); text-transform:uppercase; letter-spacing:0.05em; margin-right:4px;">REACTION:</span>
        <div style="display:flex; gap:6px;">
          ${['🔥', '🧠', '⚡', '👑', '🎯'].map(emoji => `
            <button class="chat-react-btn" data-emoji="${emoji}" style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:6px; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:13px; cursor:pointer; transition:all 0.15s;" onmouseenter="this.style.background='rgba(255,255,255,0.1)';this.style.transform='scale(1.15)';" onmouseleave="this.style.background='rgba(255,255,255,0.04)';this.style.transform='';">${emoji}</button>
          `).join('')}
        </div>
      </div>

      <!-- Message Input Box -->
      <div style="padding:16px 20px; border-top:1px solid rgba(255,255,255,0.08); background:rgba(12,12,14,0.9); display:flex; align-items:center; gap:10px; flex-shrink:0;">
        <input type="text" id="chat-input" placeholder="Transmit telemetry..." style="flex:1; background:#000; border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:12px 14px; color:#fff; font-family:'Space Grotesk',sans-serif; font-size:12.5px; outline:none; transition:border-color 0.2s;" onfocus="this.style.borderColor='${room.colorHex}'" onblur="this.style.borderColor='rgba(255,255,255,0.12)'" />
        <button id="chat-send-btn" style="background:${room.colorHex}; color:#fff; border:none; border-radius:10px; width:40px; height:40px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s; box-shadow:0 4px 12px ${room.colorHex}33;" onmouseenter="this.style.transform='scale(1.05)';" onmouseleave="this.style.transform='';">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;

    // Hook close button
    document.getElementById('wld-chat-close')?.addEventListener('click', _closeChatRoom);

    // Firestore Realtime subscription
    const container = document.getElementById('chat-messages-container');
    const scrollArea = document.getElementById('wld-chat-messages');

    const q = query(
      collection(db, 'chatroom_messages'),
      where('roomId', '==', room.id),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rawMessages = [];
      snapshot.forEach(doc => {
        rawMessages.push({ id: doc.id, ...doc.data() });
      });
      rawMessages.reverse(); // oldest first

      // Populate active logs user bar deterministically
      const activeUserMap = new Map();
      rawMessages.forEach(m => {
        if (m.senderName && m.senderHandle) {
          const matchPlayer = players.find(x => x.handle === m.senderHandle);
          activeUserMap.set(m.senderHandle, {
            name: m.senderName,
            photo: m.senderPhoto,
            color: matchPlayer ? matchPlayer.avatarColor : '#7c3aed'
          });
        }
      });

      const activeUserHTML = Array.from(activeUserMap.entries()).slice(0, 5).map(([handle, info]) => {
        return `
          <div style="display:flex; align-items:center; gap:5px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding:3px 8px; border-radius:20px; flex-shrink:0;">
            ${info.photo 
              ? `<img src="${info.photo}" style="width:14px; height:14px; border-radius:50%; border:1px solid #7c3aed;" />`
              : `<div style="width:14px; height:14px; border-radius:50%; background:${info.color}22; border:1px solid ${info.color}; display:flex; align-items:center; justify-content:center; font-family:'Outfit',sans-serif; font-weight:700; font-size:0.45rem; color:${info.color};">${(info.name || 'P')[0].toUpperCase()}</div>`
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
          if (msg.type === 'reaction') {
            _spawnFloatingReaction(msg.content);
            return;
          }

          const isMe = msg.senderEmail === auth.currentUser?.email;
          const timeStr = msg.createdAt ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          
          const badgeCol = msg.senderRank === 'Legend' ? '#7c3aed' : msg.senderRank === 'Master' ? '#d4ff00' : msg.senderRank === 'Diamond' ? '#2563eb' : 'rgba(255,255,255,0.3)';
          const scoreBadge = msg.senderScore ? `<span style="font-family:'JetBrains Mono',monospace; font-size:8.5px; padding:1px 5px; border-radius:3px; background:${badgeCol}14; border:1px solid ${badgeCol}33; color:${badgeCol}; vertical-align:middle; margin-left:4px; font-weight:700;">WMI ${msg.senderScore}</span>` : `<span style="font-family:'JetBrains Mono',monospace; font-size:8.5px; padding:1px 5px; border-radius:3px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.3); vertical-align:middle; margin-left:4px;">GUEST</span>`;

          html += `
            <div style="display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'}; gap:4px; max-width:85%; align-self:${isMe ? 'flex-end' : 'flex-start'};">
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-family:'Space Grotesk',sans-serif; font-size:11px; font-weight:700; color:${isMe ? '#7c3aed' : 'rgba(255,255,255,0.7)'};">${msg.senderHandle}</span>
                ${scoreBadge}
                <span style="font-family:'JetBrains Mono',monospace; font-size:8px; color:rgba(255,255,255,0.2);">${timeStr}</span>
              </div>
              <div style="
                background:${isMe ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.04)'};
                border:1px solid ${isMe ? 'rgba(124,58,237,0.22)' : 'rgba(255,255,255,0.08)'};
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

    window._wldChatUnsubscribe = unsubscribe;

    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');

    const sendMessage = async () => {
      if (!input) return;
      const txt = input.value.trim();
      if (!txt) return;

      input.value = '';
      input.focus();

      try {
        const activeScore = userProfile && userProfile[0] ? Math.round(userProfile[0].score) : null;
        const activeRank = userProfile && userProfile[0] ? getRankFromScore(userProfile[0].score).rank : 'Guest';

        await addDoc(collection(db, 'chatroom_messages'), {
          roomId: room.id,
          senderId: auth.currentUser?.uid || 'anonymous',
          senderName: auth.currentUser?.displayName || 'Gamer',
          senderEmail: auth.currentUser?.email || '',
          senderHandle: '@' + (auth.currentUser?.email || 'player').split('@')[0],
          senderPhoto: auth.currentUser?.photoURL || '',
          senderScore: activeScore,
          senderRank: activeRank,
          content: txt,
          type: 'text',
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Failed to transmit telemetry payload:", e);
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
        } catch (e) {}
      });
    });
  }

  function _closeChatRoom() {
    const panel = document.getElementById('wld-chat-panel');
    const backdrop = document.getElementById('wld-chat-backdrop');
    if (panel && backdrop) {
      panel.classList.remove('open');
      panel.style.right = '-480px';
      backdrop.style.opacity = '0';
      backdrop.style.pointerEvents = 'none';
    }

    if (window._wldChatUnsubscribe) {
      window._wldChatUnsubscribe();
      window._wldChatUnsubscribe = null;
    }
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

  _setupChatrooms(players, userProfile);
}

/* ════════════════════════════════════════════════════════════
   SUB-RENDERERS (NO WATERMARK EMOJIS)
   ════════════════════════════════════════════════════════════ */
function _starCard(p) {
  const wmi = p.wmi || 0;
  return `
    <div class="wld-star-card wld-reveal" style="
      background:#0c0c0e;border:1px solid rgba(255,255,255,0.06);border-radius:16px;
      overflow:hidden;cursor:pointer;transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1);position:relative;
    ">
      <div style="height:64px;background:linear-gradient(135deg,${p.avatarColor}14 0%,${p.avatarColor}04 100%);border-bottom:1px solid rgba(255,255,255,0.03);position:relative;">
        <div style="position:absolute;top:10px;right:10px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.1em;color:${p.tier==='star'?'#7c3aed':'#2563eb'};background:${p.tier==='star'?'rgba(124,58,237,0.1)':'rgba(37,99,235,0.1)'};border:1px solid ${p.tier==='star'?'rgba(124,58,237,0.25)':'rgba(37,99,235,0.25)'};border-radius:4px;padding:2px 7px;">${p.tier==='star'?'STAR':'RISING'}</div>
        </div>
        <div style="position:absolute;bottom:-18px;right:14px;font-family:'JetBrains Mono',monospace;font-size:9px;color:${p.avatarColor};background:#0c0c0e;border:1px solid ${p.avatarColor}33;border-radius:5px;padding:2px 7px;">${formatChainDistance(p.chainDistance)}</div>
      </div>
      <div style="padding:24px 18px 18px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
          <div style="width:40px;height:40px;border-radius:50%;background:${p.avatarColor}14;border:2.2px solid ${p.avatarColor}44;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:700;font-size:1rem;color:${p.avatarColor};flex-shrink:0;position:relative;">
            ${p.avatar}
          </div>
          <div>
            <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.95rem;color:#fff;margin-bottom:1px;">${p.name}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9.5px;color:${p.avatarColor};">${p.handle}</div>
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px;margin-bottom:16px;">
          ${[
            {label:'WMI',val:wmi,col:'#2563eb'},
            {label:'Rxn',val:p.reactionMs+'ms',col:'#7c3aed'},
            {label:'Trust',val:Math.round(p.trustScore*100)+'%',col:'#ec4899'}
          ].map(s=>`
            <div style="text-align:center;background:rgba(255,255,255,0.015);border-radius:8px;padding:8px 4px;border:1px solid rgba(255,255,255,0.03);">
              <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.9rem;color:${s.col};">${s.val}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.22);margin-top:2px;">${s.label}</div>
            </div>
          `).join('')}
        </div>
        
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div>
            <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.95rem;color:#fff;">${p.followers}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.22);">Followers</div>
          </div>
          <button class="wld-follow-btn" style="padding:6px 14px;font-size:10.5px;background:${p.avatarColor}10;color:${p.avatarColor};border:1px solid ${p.avatarColor}33;border-radius:6px;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;transition:all 0.2s;">Follow</button>
        </div>
        
        <div style="display:flex;gap:5px;flex-wrap:wrap;padding-top:12px;border-top:1px solid rgba(255,255,255,0.03);">
          ${p.tags.map(t=>`<span style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.25);background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:4px;padding:2px 6px;">#${t}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function _leaderboardHtml(rows) {
  if (!rows?.length) return _emptyState('No ranked players yet.');
  const max = rows[0]?.score || 1;
  return `
    <div class="wld-reveal" style="display:flex;flex-direction:column;gap:8px;">
      ${rows.map((entry, i) => {
        const rankCol = i===0?'#7c3aed':i===1?'#2563eb':i===2?'#ec4899':'rgba(255,255,255,0.4)';
        const pct     = (entry.score / max * 100).toFixed(1);
        const p       = entry.player;
        return `
          <div style="
            display:grid;grid-template-columns:44px 1fr auto;align-items:center;gap:14px;
            padding:12px 18px;
            background:#0c0c0e;border:1px solid rgba(255,255,255,0.04);border-radius:12px;
            transition:all 0.2s;animation:wld-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) ${i*50}ms both;
          " class="wld-lb-row"
            onmouseenter="this.style.transform='translateX(3px)';this.style.borderColor='rgba(255,255,255,0.1)'"
            onmouseleave="this.style.transform='';this.style.borderColor='rgba(255,255,255,0.04)'"
          >
            <div style="text-align:center;font-family:'Outfit',sans-serif;font-weight:800;font-size:1.1rem;color:${rankCol};">
              #${entry.rank}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                <div style="width:28px;height:28px;border-radius:50%;background:${p.avatarColor||'#7c3aed'}14;border:1.2px solid ${p.avatarColor||'#7c3aed'}33;display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:700;font-size:0.8rem;color:${p.avatarColor||'#7c3aed'};flex-shrink:0;">${p.avatar||'?'}</div>
                <div>
                  <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.88rem;color:#fff;">${p.name}</div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.25);">${p.handle||''}</div>
                </div>
              </div>
              <div style="height:2px;background:rgba(255,255,255,0.04);border-radius:99px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${rankCol};border-radius:99px;transition:width 1s cubic-bezier(0.16,1,0.3,1);"></div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-family:'Outfit',sans-serif;font-weight:800;font-size:1.25rem;color:${i<3?rankCol:'#fff'};">${entry.score}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.22);text-transform:uppercase;">WMI</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function _roomCard(room) {
  return `
    <div class="wld-room-card wld-reveal" style="
      background:#0c0c0e;border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:20px;
      cursor:pointer;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden;
    ">
      <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${room.colorHex};opacity:0.6;"></div>
      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px;">
        <div style="width:40px;height:40px;border-radius:10px;background:${room.colorHex}10;border:1px solid ${room.colorHex}22;display:flex;align-items:center;justify-content:center;font-size:1.15rem;font-weight:700;color:${room.colorHex};flex-shrink:0;text-transform:uppercase;">${room.name.slice(0,2)}</div>
        <div>
          <div style="font-family:'Outfit',sans-serif;font-weight:700;font-size:0.95rem;color:#fff;margin-bottom:3px;">${room.name}</div>
          <div style="display:flex;align-items:center;gap:5px;">
            <div style="width:5px;height:5px;border-radius:50%;background:${room.colorHex};position:relative;">
              <div style="position:absolute;inset:-3px;border-radius:50%;border:1px solid ${room.colorHex};animation:wld-pulse-ring 1.5s ease-out infinite;"></div>
            </div>
            <span style="font-family:'JetBrains Mono',monospace;font-size:9.5px;color:${room.colorHex};">${room.online.toLocaleString()} online</span>
          </div>
        </div>
      </div>
      <p style="font-size:12px;color:rgba(255,255,255,0.4);margin-bottom:14px;line-height:1.5;min-height:3em;">${room.description}</p>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px;">
        ${room.tags.map(t=>`<span style="font-family:'JetBrains Mono',monospace;font-size:8.5px;color:${room.colorHex};background:${room.colorHex}0d;border:1px solid ${room.colorHex}18;border-radius:4px;padding:2px 6px;">#${t}</span>`).join('')}
      </div>
      <button class="enter-room-btn" data-room-id="${room.id}" style="width:100%;padding:10px;border-radius:8px;border:1px solid ${room.locked?'rgba(236,72,153,0.22)':`${room.colorHex}33`};background:${room.locked?'rgba(236,72,153,0.05)':`${room.colorHex}0c`};color:${room.locked?'#ec4899':room.colorHex};font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:11.5px;text-transform:uppercase;letter-spacing:0.06em;cursor:pointer;transition:all 0.2s;">
        ${room.locked ? 'Locked — ' + room.lockRank + ' required' : 'Enter Room'}
      </button>
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
