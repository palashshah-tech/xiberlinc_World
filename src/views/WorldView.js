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
import { getLang, setLang, t } from '../utils/i18n.js';
import { collection, addDoc, onSnapshot, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { AvatarEngine, DEFAULT_PALETTES, SKIN_PRESETS, HAIR_PRESETS, OUTFIT_PRESETS, HAIR_STYLE_PRESETS } from '../engine/avatarEngine.js';
import { startGhostMatch } from '../utils/ghostEngine.js';
import { toggleMobileLiteMode, isMobileLiteMode } from '../utils/perfMode.js';
import { renderCollectiblesStore } from './StoreView.js';

export function WorldView() {
  window.launchGhostMatch = (name, reactionMs, wmi) => {
    startGhostMatch({ name, reactionMs, wmi }, 'Focus Chamber Rivalry');
  };
  window.toggleMobileLite = () => {
    toggleMobileLiteMode();
  };

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

        <!-- Floating Experimental Badge (Top Left) -->
        <div id="auth-experimental-badge" style="
          position:absolute; top:24px; left:28px; z-index:10000;
          background:rgba(124,58,237,0.12); border:1px solid rgba(124,58,237,0.35);
          border-radius:100px; padding:7px 16px; color:#ffffff;
          backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
          display:flex; align-items:center; gap:8px;
          box-shadow:0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(124,58,237,0.2);
          transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        " onmouseenter="this.style.borderColor='rgba(124,58,237,0.6)';this.style.boxShadow='0 10px 30px rgba(124,58,237,0.35)'" onmouseleave="this.style.borderColor='rgba(124,58,237,0.35)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(124,58,237,0.2)'">
          <!-- Purple 5-Arm Bold Asterisk Matching User PNG -->
          <svg width="15" height="15" viewBox="0 0 100 100" style="flex-shrink:0; filter:drop-shadow(0 0 6px rgba(124,58,237,0.8));">
            <g transform="translate(50,50)">
              <path d="M-8,-45 L8,-45 L5,0 L-5,0 Z" fill="#7c3aed" />
              <path d="M-8,-45 L8,-45 L5,0 L-5,0 Z" fill="#7c3aed" transform="rotate(72)" />
              <path d="M-8,-45 L8,-45 L5,0 L-5,0 Z" fill="#7c3aed" transform="rotate(144)" />
              <path d="M-8,-45 L8,-45 L5,0 L-5,0 Z" fill="#7c3aed" transform="rotate(216)" />
              <path d="M-8,-45 L8,-45 L5,0 L-5,0 Z" fill="#7c3aed" transform="rotate(288)" />
              <circle cx="0" cy="0" r="9" fill="#7c3aed" />
            </g>
          </svg>
          <span id="auth-experimental-text" style="
            font-family:'JetBrains Mono','Space Grotesk',monospace;
            font-size:10.5px; font-weight:800; letter-spacing:0.18em;
            text-transform:uppercase; color:#ffffff;
          ">${t('auth_experimental')}</span>
        </div>

        <!-- Floating Language Switcher Button (Top Right) -->
        <button id="auth-lang-toggle-btn" class="magnetic-btn" data-cursor="LANGUAGE" style="
          position:absolute; top:24px; right:28px; z-index:10000;
          background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15);
          border-radius:100px; padding:8px 18px; color:#ffffff;
          font-family:'Montserrat','Space Grotesk',sans-serif; font-size:12px; font-weight:800;
          cursor:pointer; backdrop-filter:blur(16px); transition:all 0.25s ease;
          display:flex; align-items:center; gap:8px;
        ">
          <span style="font-family:'M PLUS 1p',sans-serif; font-weight:700; color:${getLang() === 'en' ? '#7c3aed' : 'rgba(255,255,255,0.4)'};">A</span>
          <span style="color:rgba(255,255,255,0.3);">/</span>
          <span style="font-family:'M PLUS 1p',sans-serif; font-weight:700; color:${getLang() === 'ja' ? '#7c3aed' : 'rgba(255,255,255,0.4)'};">文</span>
        </button>

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
              <span id="auth-title-prefix" class="line-inner" style="display:block; transform:translateY(100%); animation:auth-title-rise 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;">${t('auth_title_prefix')}</span>
            </span>
            <span class="line" style="display:block; overflow:hidden;">
              <span class="line-inner" style="display:block; transform:translateY(100%); animation:auth-title-rise 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.28s forwards;">
                <span class="accent glitch-text scramble-text" data-text="xiberlinc." style="color:#ffffff; position:relative; display:inline-block;">xiberlin<span style="color:#7c3aed;">c</span>.</span>
              </span>
            </span>
            <span class="line jp" style="font-family:'M PLUS 1p',sans-serif; font-weight:700; font-size:0.45em; display:block; margin-top:0.6rem; color:rgba(255,255,255,0.45); letter-spacing:0.18em; overflow:hidden;">
              <span class="line-inner" style="display:block; transform:translateY(100%); animation:auth-title-rise 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.45s forwards;">見えない未来を、形にする。</span>
            </span>
          </h1>

          <p id="auth-subhead-text" style="font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);line-height:1.65;margin:0 auto;max-width:320px;">
            ${t('auth_subhead')}
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
          <span id="auth-google-btn-text">${t('auth_google_btn')}</span>
        </button>

        <!-- Domain Lock Tag -->
        <div style="position:relative;z-index:10;margin-top:16px;font-family:'JetBrains Mono',monospace;font-size:9.5px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:0.12em;display:flex;align-items:center;gap:6px;">
          <span style="width:5px;height:5px;border-radius:50%;background:#7c3aed;display:inline-block;"></span>
          <span id="auth-domain-lock-text">${t('auth_domain_lock')}</span>
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
            ${t('loader_msg0')}
            <span style="display:inline-flex; gap:5px; align-items:center; height:1em; margin-bottom:-4px;">
              <span style="width:6px; height:6px; background:#2563eb; border-radius:50%; display:inline-block; animation:wld-bounce 1.4s infinite ease-in-out both; animation-delay:-0.32s;"></span>
              <span style="width:6px; height:6px; background:#7c3aed; border-radius:50%; display:inline-block; animation:wld-bounce 1.4s infinite ease-in-out both; animation-delay:-0.16s;"></span>
              <span style="width:6px; height:6px; background:#ec4899; border-radius:50%; display:inline-block; animation:wld-bounce 1.4s infinite ease-in-out both;"></span>
            </span>
          </div>
        </div>
      </div>

      <!-- ── 3D AVATAR SPOTLIGHT CUSTOMIZER STAGE ── -->
      <div id="avatar-spotlight-stage" style="display:none;">
        <!-- Top Left Corner Light Beam -->
        <div class="spotlight-beam-left" id="spotlight-beam-l"></div>
        <!-- Top Right Corner Light Beam -->
        <div class="spotlight-beam-right" id="spotlight-beam-r"></div>
        <!-- Floor Spotlight Pool -->
        <div class="spotlight-floor-pool" id="spotlight-floor"></div>

        <!-- Floating Top Header Controls -->
        <div style="position:absolute; top:28px; left:32px; right:32px; z-index:100; display:flex; align-items:center; justify-content:space-between; pointer-events:auto;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:32px; height:32px; border-radius:8px; background:#000; border:1px solid rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; padding:4px;">
              <img src="/xiberlinc_logo.png" style="width:100%;height:100%;object-fit:contain;mix-blend-mode:screen;" alt="Xiberlinc" />
            </div>
            <div>
              <div style="font-family:'M PLUS 1p','Space Grotesk',sans-serif; font-size:9px; font-weight:700; color:#7c3aed; letter-spacing:0.18em; text-transform:uppercase;">アバターカスタマイザ · AVATAR STAGE</div>
              <div style="font-family:'Montserrat',sans-serif; font-weight:800; font-size:1.1rem; color:#ffffff;">3D Identity Node</div>
            </div>
          </div>

          <button id="avatar-skip-btn" class="magnetic-btn" data-cursor="SKIP" style="
            background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15);
            border-radius:100px; padding:8px 20px; color:#ffffff;
            font-family:'Space Grotesk',sans-serif; font-size:11.5px; font-weight:700;
            cursor:pointer; backdrop-filter:blur(16px); transition:all 0.25s ease;
            text-transform:uppercase; letter-spacing:0.1em;
          ">
            Skip Stage &rarr;
          </button>
        </div>

        <!-- 3D Avatars Orbital Stage Container -->
        <div class="avatar-3d-stage">
          <div id="avatar-model-wrapper" class="avatar-model-wrapper active-spotlight">
            <div id="avatar-spline-mount" style="position:relative;width:min(70vw,600px);height:min(70vh,600px);margin:0 auto;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:16px;"></div>
          </div>
        </div>

        <!-- 3D Orbital Left & Right Arrow Navigation Controls -->
        <button id="avatar-prev-arrow" class="magnetic-btn" data-cursor="PREV" style="
          position:absolute; left:36px; top:50%; transform:translateY(-50%); z-index:100;
          width:56px; height:56px; border-radius:50%; background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.2); color:#ffffff; cursor:pointer;
          display:flex; align-items:center; justify-content:center; backdrop-filter:blur(20px);
          box-shadow:0 12px 32px rgba(0,0,0,0.6); transition:all 0.3s ease;
        " onmouseenter="this.style.background='#ffffff';this.style.color='#000000';this.style.transform='translateY(-50%) scale(1.1)'" onmouseleave="this.style.background='rgba(255,255,255,0.06)';this.style.color='#ffffff';this.style.transform='translateY(-50%) scale(1)'">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <button id="avatar-next-arrow" class="magnetic-btn" data-cursor="NEXT" style="
          position:absolute; right:36px; top:50%; transform:translateY(-50%); z-index:100;
          width:56px; height:56px; border-radius:50%; background:rgba(255,255,255,0.06);
          border:1px solid rgba(255,255,255,0.2); color:#ffffff; cursor:pointer;
          display:flex; align-items:center; justify-content:center; backdrop-filter:blur(20px);
          box-shadow:0 12px 32px rgba(0,0,0,0.6); transition:all 0.3s ease;
        " onmouseenter="this.style.background='#ffffff';this.style.color='#000000';this.style.transform='translateY(-50%) scale(1.1)'" onmouseleave="this.style.background='rgba(255,255,255,0.06)';this.style.color='#ffffff';this.style.transform='translateY(-50%) scale(1)'">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>

        <!-- Left Side Sliding Customization Dock -->
        <div class="avatar-sidebar-dock">
          <!-- Left Column Tabs -->
          <div class="avatar-sidebar-tabs">
            <button class="avatar-tab-btn active" data-tab="skin">
              <span>Skin</span>
              <span class="tab-indicator"></span>
            </button>
            <button class="avatar-tab-btn" data-tab="hair-style">
              <span>Style</span>
              <span class="tab-indicator"></span>
            </button>
            <button class="avatar-tab-btn" data-tab="hair">
              <span>Hair</span>
              <span class="tab-indicator"></span>
            </button>
            <button class="avatar-tab-btn" data-tab="outfit">
              <span>Outfit</span>
              <span class="tab-indicator"></span>
            </button>
            <button class="avatar-tab-btn" data-tab="beam">
              <span>Beam</span>
              <span class="tab-indicator"></span>
            </button>
          </div>

          <!-- Right Column content pane (slides open seamlessly to the right) -->
          <div class="avatar-sidebar-content">
            <!-- Skin Tone -->
            <div class="avatar-panel-pane active" id="pane-skin">
              <div class="panel-pane-title" style="margin-bottom: 8px;">Skin Tone</div>
              <div class="swatches-grid">
                ${SKIN_PRESETS.map(s => `
                  <button class="avatar-skin-btn" data-color="${s.color}" title="${s.name}" style="background:${s.color};"></button>
                `).join('')}
              </div>
            </div>

            <!-- Hair Style -->
            <div class="avatar-panel-pane" id="pane-hair-style">
              <div class="panel-pane-title" style="margin-bottom: 8px;">Hair Style</div>
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${HAIR_STYLE_PRESETS.map(hs => `
                  <button class="avatar-style-btn" data-style="${hs.id}" style="
                    padding:8px 12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12);
                    border-radius:8px; color:#fff; font-family:'Space Grotesk',sans-serif; font-size:11px;
                    font-weight:600; cursor:pointer; text-align:left; transition:all 0.2s;
                  " onmouseenter="this.style.background='rgba(124,58,237,0.15)';this.style.borderColor='#7c3aed';" onmouseleave="this.style.background='rgba(255,255,255,0.04)';this.style.borderColor='rgba(255,255,255,0.12)';">${hs.name}</button>
                `).join('')}
              </div>
            </div>

            <!-- Hair Color -->
            <div class="avatar-panel-pane" id="pane-hair">
              <div class="panel-pane-title" style="margin-bottom: 8px;">Hair Color</div>
              <div class="swatches-grid">
                ${HAIR_PRESETS.map(h => `
                  <button class="avatar-hair-btn" data-color="${h.color}" title="${h.name}" style="background:${h.color};"></button>
                `).join('')}
              </div>
            </div>

            <!-- Outfit -->
            <div class="avatar-panel-pane" id="pane-outfit">
              <div class="panel-pane-title" style="margin-bottom: 8px;">Outfit Color</div>
              <div class="swatches-grid">
                ${OUTFIT_PRESETS.map(o => `
                  <button class="avatar-outfit-btn" data-color="${o.color}" title="${o.name}" style="background:${o.color};"></button>
                `).join('')}
              </div>
            </div>

            <!-- Beam -->
            <div class="avatar-panel-pane" id="pane-beam">
              <div class="panel-pane-title" style="margin-bottom: 8px;">Spotlight</div>
              <div class="swatches-grid">
                ${[
                  { color:'#ffffff', name:'White' },
                  { color:'#7c3aed', name:'Purple' },
                  { color:'#06b6d4', name:'Cyan' },
                  { color:'#e2b857', name:'Gold' },
                  { color:'#f43f5e', name:'Rose' },
                  { color:'#22c55e', name:'Green' }
                ].map(b => `
                  <button class="avatar-beam-btn" data-color="${b.color}" title="${b.name}" style="background:${b.color};"></button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Elegant Bottom Right Action Controls -->
        <div style="position:absolute; bottom:32px; right:32px; z-index:100; display:flex; align-items:center; gap:12px; pointer-events:auto;">
          <button id="avatar-reset-btn" data-cursor="RESET" style="
            padding:10px 20px; border-radius:10px; background:rgba(255,255,255,0.05);
            border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.6);
            font-family:'Space Grotesk',sans-serif; font-size:11px; font-weight:700; cursor:pointer;
            text-transform:uppercase; letter-spacing:0.08em; transition:all 0.25s ease;
          " onmouseenter="this.style.background='rgba(124,58,237,0.15)';this.style.borderColor='#7c3aed';this.style.color='#fff'" onmouseleave="this.style.background='rgba(255,255,255,0.05)';this.style.borderColor='rgba(255,255,255,0.1)';this.style.color='rgba(255,255,255,0.6)'">
            Reset
          </button>
          <button id="avatar-confirm-btn" class="magnetic-btn" data-cursor="EQUIP" style="
            padding:10px 24px; border-radius:10px; border:none; white-space:nowrap;
            background:#ffffff; color:#000000; font-family:'Space Grotesk',sans-serif;
            font-weight:700; font-size:11.5px; cursor:pointer; text-transform:uppercase;
            letter-spacing:0.08em; box-shadow:0 10px 30px rgba(255,255,255,0.15);
            transition:all 0.25s ease;
          " onmouseenter="this.style.transform='scale(1.03)';this.style.background='#7c3aed';this.style.color='#ffffff'" onmouseleave="this.style.transform='scale(1)';this.style.background='#ffffff';this.style.color='#000000'">
            Equip &amp; Enter &rarr;
          </button>
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
          <h3 style="font-family:'Instrument Serif',serif;font-style:italic;font-size:1.8rem;color:#7c3aed;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px;">${t('tb_panel')}</h3>
          
          <button id="taskbar-play-vwm" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:14px;color:#fff;cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;padding:8px 0;">${t('tb_play')}</button>
          <button id="taskbar-goto-home" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:14px;color:#fff;cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;padding:8px 0;">${t('tb_hub')}</button>
          
          <div style="width:40px;height:1px;background:rgba(255,255,255,0.08);margin:8px auto;"></div>
          
          <button id="taskbar-sec-1" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;">${t('tb_stars')}</button>
          <button id="taskbar-sec-2" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;">${t('tb_leaderboard')}</button>
          <button id="taskbar-sec-3" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;">${t('tb_rooms')}</button>
          <button id="taskbar-sec-4" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:13px;color:rgba(255,255,255,0.5);cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;">${t('tb_events')}</button>
          
          <div style="width:40px;height:1px;background:rgba(255,255,255,0.08);margin:8px auto;"></div>
          
          <button id="taskbar-logout" style="background:transparent;border:none;font-family:'Space Grotesk',sans-serif;font-size:12px;color:#ec4899;cursor:pointer;text-transform:uppercase;letter-spacing:0.15em;margin-top:16px;">${t('tb_signout')}</button>
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
function _updateAuthGateLanguage() {
  const currentLang = getLang();
  const titlePrefix = document.getElementById('auth-title-prefix');
  const subhead = document.getElementById('auth-subhead-text');
  const googleBtnText = document.getElementById('auth-google-btn-text');
  const domainLock = document.getElementById('auth-domain-lock-text');
  const tickerContainer = document.getElementById('auth-kinetic-ticker');
  const langToggleBtn = document.getElementById('auth-lang-toggle-btn');

  if (langToggleBtn) {
    langToggleBtn.innerHTML = `
      <span style="font-family:'M PLUS 1p',sans-serif; font-weight:700; color:${currentLang === 'en' ? '#7c3aed' : 'rgba(255,255,255,0.4)'};">A</span>
      <span style="color:rgba(255,255,255,0.3);">/</span>
      <span style="font-family:'M PLUS 1p',sans-serif; font-weight:700; color:${currentLang === 'ja' ? '#7c3aed' : 'rgba(255,255,255,0.4)'};">文</span>
    `;
  }

  const expText = document.getElementById('auth-experimental-text');
  if (expText) expText.textContent = t('auth_experimental');
  if (titlePrefix) titlePrefix.textContent = t('auth_title_prefix');
  if (subhead) subhead.textContent = t('auth_subhead');
  if (googleBtnText) googleBtnText.textContent = t('auth_google_btn');
  if (domainLock) domainLock.textContent = t('auth_domain_lock');

  if (tickerContainer) {
    const rows = tickerContainer.querySelectorAll('.kinetic-ticker-row');
    rows.forEach((row, i) => {
      const text = t(`ticker_${i}`);
      row.textContent = `${text} • ${text}`;
    });
  }
}

function _initAuth() {
  const authGate = document.getElementById('world-auth-gate');
  const loginBtn = document.getElementById('google-login-btn');
  const errMsg = document.getElementById('auth-error-msg');
  const langToggleBtn = document.getElementById('auth-lang-toggle-btn');

  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const current = getLang();
      const nextLang = current === 'en' ? 'ja' : 'en';
      setLang(nextLang);
      _updateAuthGateLanguage();
    });
  }

  _updateAuthGateLanguage();

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
    t('loader_msg0'),
    t('loader_msg1'),
    t('loader_msg2'),
    t('loader_msg3')
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

  // Cleanly destroy intro loader WebGL context to prevent zero-size framebuffer errors
  const splineContainer = document.getElementById('spline-container');
  if (splineContainer) splineContainer.innerHTML = '';

  _initAvatarSpotlightStage(worldData);
}

function _initAvatarSpotlightStage(worldData) {
  const stage = document.getElementById('avatar-spotlight-stage');
  if (!stage) {
    window.xiberlinc_world_loaded = true;
    _renderDashboard(worldData);
    return;
  }

  stage.style.display = 'flex';
  void stage.offsetWidth; // Trigger reflow for CSS opacity
  stage.classList.add('active');

  const mountEl = document.getElementById('avatar-spline-mount');
  const wrapper = document.getElementById('avatar-model-wrapper');
  const labelEl = document.getElementById('avatar-model-label');
  const prevArrow = document.getElementById('avatar-prev-arrow');
  const nextArrow = document.getElementById('avatar-next-arrow');
  const confirmBtn = document.getElementById('avatar-confirm-btn');
  const skipBtn = document.getElementById('avatar-skip-btn');
  const beamL = document.getElementById('spotlight-beam-l');
  const beamR = document.getElementById('spotlight-beam-r');
  const floorPool = document.getElementById('spotlight-floor');

  let activeModel = localStorage.getItem('xiberlinc_avatar_node') || 'man';
  let isTransitioning = false;
  let avatarEngine = null;
  let currentPalette = null;
  try {
    currentPalette = JSON.parse(localStorage.getItem('xiberlinc_avatar_palette'));
  } catch(e) {}
  if (!currentPalette) {
    currentPalette = { ...DEFAULT_PALETTES[activeModel] };
  }

  function loadAvatar(model) {
    if (!mountEl) return;

    const isFirstTime = !avatarEngine;
    if (isFirstTime) {
      mountEl.innerHTML = '';
      avatarEngine = new AvatarEngine(mountEl);
      avatarEngine.init();
    } else {
      currentPalette = { ...DEFAULT_PALETTES[model] };
    }

    avatarEngine.loadAvatar(model, currentPalette);
  }

  // Load initial 3D avatar instantly — zero network, zero buffering
  loadAvatar(activeModel);
  updateLabel();

  function updateLabel() {
    if (labelEl) {
      labelEl.textContent = activeModel === 'man' 
        ? (getLang() === 'ja' ? '男性アバター // ノード 01' : 'MALE AVATAR // NODE 01')
        : (getLang() === 'ja' ? '女性アバター // ノード 02' : 'FEMALE AVATAR // NODE 02');
    }
  }

  function executeArcOrbit(direction) {
    if (isTransitioning || !wrapper) return;
    isTransitioning = true;

    activeModel = activeModel === 'man' ? 'woman' : 'man';

    // Step 1: Orbit arc out into dark shadow
    const exitClass = direction === 'next' ? 'arc-hidden-right' : 'arc-hidden-left';
    const enterClass = direction === 'next' ? 'arc-hidden-left' : 'arc-hidden-right';
    wrapper.className = `avatar-model-wrapper ${exitClass}`;

    setTimeout(async () => {
      // Step 2: Swap 3D avatar in dark shadow
      loadAvatar(activeModel);
      updateLabel();

      // Step 3: Snap to entrance arc position in dark shadow
      wrapper.style.transition = 'none';
      wrapper.className = `avatar-model-wrapper ${enterClass}`;
      void wrapper.offsetWidth; // Force reflow

      // Step 4: Arc smoothly out of shadow into center spotlight
      requestAnimationFrame(() => {
        wrapper.style.transition = '';
        wrapper.className = 'avatar-model-wrapper active-spotlight';
        setTimeout(() => {
          isTransitioning = false;
        }, 1100);
      });
    }, 500);
  }

  if (prevArrow) prevArrow.addEventListener('click', () => executeArcOrbit('prev'));
  if (nextArrow) nextArrow.addEventListener('click', () => executeArcOrbit('next'));

  // Category Tabs click toggle logic for side sliding dock
  const tabBtns = stage.querySelectorAll('.avatar-tab-btn');
  const panelPanes = stage.querySelectorAll('.avatar-panel-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      
      // Update active states on tab buttons
      tabBtns.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');

      // Update active states on sliding content panes
      panelPanes.forEach(pane => {
        if (pane.id === `pane-${tabName}`) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });
    });
  });

  // Hair style picker
  const styleBtns = stage.querySelectorAll('.avatar-style-btn');
  styleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      styleBtns.forEach(b => {
        b.style.borderColor = 'rgba(255,255,255,0.12)';
        b.style.background = 'rgba(255,255,255,0.04)';
      });
      btn.style.borderColor = '#7c3aed';
      btn.style.background = 'rgba(124,58,237,0.15)';
      const styleId = btn.getAttribute('data-style');
      currentPalette.hairStyle = styleId;
      if (avatarEngine) {
        avatarEngine.loadAvatar(activeModel, currentPalette);
      }
    });
  });

  // Spotlight color beam customization
  const beamBtns = stage.querySelectorAll('.avatar-beam-btn');
  beamBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      beamBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const color = btn.getAttribute('data-color');
      if (beamL) beamL.style.background = `linear-gradient(180deg, ${color}dd 0%, ${color}33 35%, rgba(0,0,0,0) 85%)`;
      if (beamR) beamR.style.background = `linear-gradient(180deg, ${color}dd 0%, ${color}33 35%, rgba(0,0,0,0) 85%)`;
      if (floorPool) {
        floorPool.style.background = `radial-gradient(ellipse at center, ${color}bb 0%, ${color}33 45%, rgba(0,0,0,0) 75%)`;
        floorPool.style.boxShadow = `0 0 80px ${color}66`;
      }
      if (avatarEngine) {
        avatarEngine.setSpotlightColor(color);
      }
    });
  });

  // Skin tone picker
  const skinBtns = stage.querySelectorAll('.avatar-skin-btn');
  skinBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      skinBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const color = btn.getAttribute('data-color');
      currentPalette.skin = color;
      if (avatarEngine) avatarEngine.setSkinColor(color);
    });
  });

  // Hair color picker
  const hairBtns = stage.querySelectorAll('.avatar-hair-btn');
  hairBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      hairBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const color = btn.getAttribute('data-color');
      currentPalette.hair = color;
      if (avatarEngine) avatarEngine.setHairColor(color);
    });
  });

  // Outfit color picker
  const outfitBtns = stage.querySelectorAll('.avatar-outfit-btn');
  outfitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      outfitBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const color = btn.getAttribute('data-color');
      currentPalette.outfit = color;
      if (avatarEngine) avatarEngine.setOutfitColor(color);
    });
  });

  // Reset button
  const resetBtn = document.getElementById('avatar-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // Reload the default avatar
      loadAvatar(activeModel);
      // Remove visual selections
      stage.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
      // Reset beam/glow visual states
      if (beamL) beamL.style.background = '';
      if (beamR) beamR.style.background = '';
      if (floorPool) { floorPool.style.background = ''; floorPool.style.boxShadow = ''; }
      if (avatarEngine) {
        avatarEngine.resetCamera();
      }
    });
  }

  function exitStage() {
    stage.classList.remove('active');
    setTimeout(() => {
      stage.style.display = 'none';
      if (avatarEngine) {
        avatarEngine.dispose();
        avatarEngine = null;
      }
      window.xiberlinc_world_loaded = true;
      _renderDashboard(worldData);
    }, 800);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      // Save avatar configuration to localStorage
      localStorage.setItem('xiberlinc_avatar_node', activeModel);
      localStorage.setItem('xiberlinc_avatar_palette', JSON.stringify(currentPalette));
      exitStage();
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      exitStage();
    });
  }
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
function _drawNodeAvatar(ctx, x, y, r, node) {
  // Read colors/styles
  let skinColor = '#c89b7b';
  let hairColor = '#2c1810';
  let hairStyle = 'buzz';
  let outfitColor = '#1e1e2e';
  let gender = 'man';

  if (node.isUser) {
    gender = localStorage.getItem('xiberlinc_avatar_node') || 'man';
    let savedPalette = null;
    try {
      savedPalette = JSON.parse(localStorage.getItem('xiberlinc_avatar_palette'));
    } catch(e) {}
    if (savedPalette) {
      skinColor = savedPalette.skin;
      hairColor = savedPalette.hair;
      hairStyle = savedPalette.hairStyle || (gender === 'man' ? 'buzz' : 'long');
      outfitColor = savedPalette.outfit;
    } else {
      skinColor = DEFAULT_PALETTES[gender].skin;
      hairColor = DEFAULT_PALETTES[gender].hair;
      hairStyle = DEFAULT_PALETTES[gender].hairStyle;
      outfitColor = DEFAULT_PALETTES[gender].outfit;
    }
  } else {
    // Generate deterministic styling for other players
    const charCodeSum = (node.label || 'Player').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const skins = ['#f5d0b0', '#c89b7b', '#a67c52', '#7b5638', '#4a3020'];
    const hairs = ['#1a1008', '#4a2520', '#c4a35a', '#8b2500', '#d0d0d0', '#6b21a8', '#06b6d4'];
    const styles = ['buzz', 'spiky', 'long'];
    const outfits = ['#1e1e2e', '#2d1b4e', '#7f1d1d', '#0c4a6e', '#14532d', '#ec4899'];
    
    skinColor = skins[charCodeSum % skins.length];
    hairColor = hairs[(charCodeSum * 3) % hairs.length];
    hairStyle = styles[(charCodeSum * 7) % styles.length];
    outfitColor = outfits[(charCodeSum * 11) % outfits.length];
  }

  ctx.save();

  // Create clipping region for the node circle boundary
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();

  // Draw background circle tint
  ctx.fillStyle = 'rgba(12, 12, 16, 0.95)';
  ctx.fill();

  // 1. Draw Torso (Shirt)
  ctx.fillStyle = outfitColor;
  ctx.beginPath();
  // Draw rounded rectangle shoulders/torso extending down
  ctx.roundRect(x - r * 0.75, y + r * 0.28, r * 1.5, r * 1.1, [r * 0.2, r * 0.2, 0, 0]);
  ctx.fill();

  // Draw tiny white logo mark on shirt chest
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.65, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 2. Draw Neck
  ctx.fillStyle = skinColor;
  ctx.fillRect(x - r * 0.16, y + r * 0.08, r * 0.32, r * 0.35);

  // 3. Draw Head (Skin)
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.68, 0, Math.PI * 2);
  ctx.fill();

  // 4. Draw Hair Styles (covers top/sides based on style)
  ctx.fillStyle = hairColor;
  const hr = r * 0.68; // Head radius

  if (hairStyle === 'buzz') {
    // Simple top crop fade
    ctx.beginPath();
    ctx.arc(x, y - hr * 0.05, hr * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    // Sideburn sweeps
    ctx.fillRect(x - hr * 1.01, y - hr * 0.1, hr * 0.12, hr * 0.3);
    ctx.fillRect(x + hr * 0.89, y - hr * 0.1, hr * 0.12, hr * 0.3);
  } else if (hairStyle === 'spiky') {
    // Base crop
    ctx.beginPath();
    ctx.arc(x, y - hr * 0.05, hr * 1.02, Math.PI * 1.08, Math.PI * 1.92);
    ctx.fill();
    // Sideburn sweeps
    ctx.fillRect(x - hr * 1.01, y - hr * 0.1, hr * 0.12, hr * 0.3);
    ctx.fillRect(x + hr * 0.89, y - hr * 0.1, hr * 0.12, hr * 0.3);
    
    // Spiky crown cones (drawn as triangles)
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = Math.PI * 1.15 + (i * Math.PI * 0.7) / 4;
      const spikeX = x + Math.cos(angle) * hr * 1.15;
      const spikeY = y + Math.sin(angle) * hr * 1.15;
      const base1X = x + Math.cos(angle - 0.15) * hr;
      const base1Y = y + Math.sin(angle - 0.15) * hr;
      const base2X = x + Math.cos(angle + 0.15) * hr;
      const base2Y = y + Math.sin(angle + 0.15) * hr;
      
      ctx.moveTo(base1X, base1Y);
      ctx.lineTo(spikeX, spikeY);
      ctx.lineTo(base2X, base2Y);
    }
    ctx.closePath();
    ctx.fill();
  } else if (hairStyle === 'long') {
    // Base crop
    ctx.beginPath();
    ctx.arc(x, y - hr * 0.05, hr * 1.02, Math.PI * 1.08, Math.PI * 1.92);
    ctx.fill();

    // Side bangs draping down shoulders
    ctx.fillRect(x - hr * 1.04, y - hr * 0.1, hr * 0.18, hr * 0.95);
    ctx.fillRect(x + hr * 0.86, y - hr * 0.1, hr * 0.18, hr * 0.95);

    // Ponytail tie at the back (red tie)
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x - 3, y + hr * 0.78, 6, 2.5);
    
    // Ponytail bulb extending down behind the neck
    ctx.fillStyle = hairColor;
    ctx.beginPath();
    ctx.arc(x, y + hr * 1.05, hr * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  // 5. Draw Eyes
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(x - hr * 0.25, y, 1.8, 0, Math.PI * 2);
  ctx.arc(x + hr * 0.25, y, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // 6. Draw Smile (Curved red arc)
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y + hr * 0.15, hr * 0.2, 0, Math.PI, false);
  ctx.stroke();

  ctx.restore();
}

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
    const dist = node.isUser ? 0 : 70 + Math.random() * 110;
    return {
      ...node,
      radius: node.isUser ? 24 : Math.max(14, node.radius * 1.35),
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
      
      // Node core avatar projection matching 3D customizer settings
      _drawNodeAvatar(ctx, node.x, node.y, r, node);
      
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
        
        <div style="display:flex;align-items:center;gap:16px;">
          <button id="perf-toggle-btn" class="magnetic-btn" onclick="window.toggleMobileLite && window.toggleMobileLite()" style="
            color:#d4ff00; border:1px solid rgba(212,255,0,0.3); background:rgba(212,255,0,0.08);
            border-radius:100px; padding:6px 14px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; cursor:pointer;
          ">
            <span id="perf-toggle-text">⚡ High-Perf 3D</span>
          </button>

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
        <div class="editorial-chapter-badge">${t('ch1_badge')}</div>
        <h1 class="editorial-hero-title">Connect by xiberlin<span style="color:#e2b857;">c</span>.</h1>
        <p class="editorial-subhead">
          ${t('ch1_subhead')}
        </p>

        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:32px;">
          <button id="hero-play-btn" class="magnetic-btn" data-cursor="PLAY" style="
            padding:18px 36px;border-radius:14px;border:none;
            background:#ffffff;color:#050507;font-family:'Space Grotesk',sans-serif;
            font-weight:700;font-size:13px;cursor:pointer;text-transform:uppercase;
            letter-spacing:0.1em;box-shadow:0 14px 40px rgba(255,255,255,0.15);
            transition:transform 0.3s cubic-bezier(0.16,1,0.3,1);
          ">
            ${t('ch1_cta')}
          </button>
        </div>

        <!-- Season 1 Battle Pass & Commercial Monetization Header -->
        <div class="editorial-card-glass" style="
          max-width: 1100px; padding: 20px 28px; margin-bottom: 32px;
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(13, 13, 20, 0.9) 100%);
          border: 1px solid rgba(167, 139, 250, 0.35); border-radius: 18px;
          display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap;
        ">
          <div style="display:flex; align-items:center; gap:16px;">
            <div style="
              width: 48px; height: 48px; border-radius: 12px;
              background: rgba(212, 255, 0, 0.15); border: 1.5px solid #d4ff00;
              display: flex; align-items: center; justify-content: center;
              font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 1.2rem; color: #d4ff00;
            ">S1</div>
            <div>
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="font-family:'Outfit', sans-serif; font-size:1.1rem; font-weight:800; color:#fff;">Season 1 Battle Pass</span>
                <span style="font-family:'JetBrains Mono', monospace; font-size:9px; background:rgba(212,255,0,0.15); color:#d4ff00; border:1px solid rgba(212,255,0,0.3); padding:2px 8px; border-radius:100px; text-transform:uppercase;">Tier 14 / 50</span>
              </div>
              <div style="font-size:12px; color:rgba(255,255,255,0.6); margin-top:4px;">
                Unlock VIP Neuro Room Tickets, Custom Cyber Skins &amp; Ghost Match XP Multipliers.
              </div>
            </div>
          </div>

          <div style="min-width: 220px; flex: 1; max-width: 320px;">
            <div style="display:flex; justify-content:space-between; font-family:'JetBrains Mono', monospace; font-size:10px; color:rgba(255,255,255,0.7); margin-bottom:6px;">
              <span>XP: 3,450 / 5,000</span>
              <span style="color:#d4ff00;">🎟 VIP Ticket Active</span>
            </div>
            <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 100px; overflow: hidden;">
              <div style="height: 100%; width: 69%; background: linear-gradient(90deg, #7c3aed, #d4ff00); border-radius: 100px;"></div>
            </div>
          </div>
        </div>

        <!-- Live Telemetry Bar -->
        <div class="editorial-card-glass" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));padding:24px;gap:16px;max-width:1100px;margin-bottom:40px;">
          ${[
            {label:t('stat_reg'),value:stats.totalPlayers.toLocaleString()||'—'},
            {label:t('stat_nodes'),value:stats.playersOnline.toLocaleString(),live:true},
            {label:t('stat_stars'),value:stats.starsLive,live:true},
            {label:t('stat_spaces'),value:stats.activeRooms,live:true},
            {label:t('stat_regions'),value:stats.countriesRepresented||'—'}
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
              <div id="unclaimed-profile-3d-avatar" style="
                width:60px; height:60px; border-radius:10px; background:rgba(8,8,12,0.95);
                border:2px solid rgba(255,255,255,0.15); overflow:hidden; position:relative;
              }"></div>
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
                ${t('ch1_cta')}
              </button>
            </div>
          </div>
        ` : `
          <div class="wld-reveal editorial-card-glass" style="padding:40px;">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;margin-bottom:28px;">
              <div style="display:flex;align-items:center;gap:18px;">
                <div id="claimed-profile-3d-avatar" style="
                  width:72px; height:72px; border-radius:12px; background:rgba(8,8,12,0.95);
                  border:2px solid #7c3aed; box-shadow:0 0 16px rgba(124,58,237,0.3);
                  overflow:hidden; position:relative;
                }"></div>
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
                      <button class="conn-send-invite-btn magnetic-btn" data-cursor="CONNECT" data-email="${r.email}" data-handle="${r.handle || r.email.split('@')[0]}" data-name="${r.name}" data-uid="${r.uid || ''}" style="background:#e2b857;color:#000;border:none;border-radius:4px;padding:4px 10px;font-size:10px;font-weight:700;cursor:pointer;">${t('btn_connect')}</button>
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
        <div class="editorial-chapter-badge">${t('ch2_badge')}</div>
        <h2 class="editorial-hero-title" style="font-size:clamp(2.5rem,6vw,5rem);margin-bottom:16px;">${t('ch2_title')}<span style="color:#e2b857;">.</span></h2>
        <p class="editorial-subhead" style="margin-bottom:48px;">
          ${t('ch2_subhead')}
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:24px;" id="wld-stars-grid">
          ${stars.length ? stars.map(p => _starCard(p)).join('') : _emptyState('No stars registered yet.')}
        </div>
      </section>

      <!-- ══════════ CHAPTER 03 — GLOBAL RANKINGS ══════════ -->
      <section id="chapter-03" class="editorial-chapter" style="padding:100px 32px;background:rgba(12,12,16,0.5);border-top:1px solid rgba(255,255,255,0.05);border-bottom:1px solid rgba(255,255,255,0.05);">
        <div style="max-width:1380px;margin:0 auto;">
          <div class="editorial-chapter-badge">${t('ch3_badge')}</div>
          <h2 class="editorial-hero-title" style="font-size:clamp(2.5rem,6vw,5rem);margin-bottom:16px;">${t('ch3_title')}<span style="color:#2563eb;">.</span></h2>
          <p class="editorial-subhead" style="margin-bottom:48px;">
            ${t('ch3_subhead')}
          </p>
          ${_leaderboardHtml(leaderboard.global)}
        </div>
      </section>

      <!-- ══════════ CHAPTER 04 — TELEMETRY SPACES ══════════ -->
      <section id="chapter-04" class="editorial-chapter" style="padding:100px 32px;max-width:1380px;margin:0 auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px;margin-bottom:24px;">
          <div>
            <div class="editorial-chapter-badge">${t('ch4_badge')}</div>
            <h2 class="editorial-hero-title" style="font-size:clamp(2.5rem,6vw,5rem);margin:0;">${t('ch4_title')}<span style="color:#06b6d4;">.</span></h2>
          </div>
          <button id="create-custom-channel-btn" class="magnetic-btn" data-cursor="CREATE" style="
            background:transparent;border:1px solid rgba(255,255,255,0.2);color:#ffffff;
            border-radius:10px;padding:12px 24px;font-family:'Space Grotesk',sans-serif;
            font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;
            cursor:pointer;transition:all 0.3s;
          ">${t('btn_create_custom')}</button>
        </div>
        <p class="editorial-subhead" style="margin-bottom:48px;">
          ${t('ch4_subhead')}
        </p>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:24px;">
          ${NEURO_ROOMS.map((r, i) => _roomCard(r, i)).join('')}
          ${customRooms.map((r, i) => _roomCard(r, NEURO_ROOMS.length + i)).join('')}
        </div>
      </section>

      <!-- ══════════ CHAPTER 05 — PROVING GROUND ══════════ -->
      <section id="chapter-05" class="editorial-chapter" style="padding:100px 32px;background:rgba(8,8,12,0.8);border-top:1px solid rgba(255,255,255,0.05);">
        <div style="max-width:1380px;margin:0 auto;">
          <div class="editorial-chapter-badge">${t('ch5_badge')}</div>
          <h2 class="editorial-hero-title" style="font-size:clamp(2.5rem,6vw,5rem);margin-bottom:16px;">${t('ch5_title')}<span style="color:#ec4899;">.</span></h2>
          <p class="editorial-subhead" style="margin-bottom:48px;">
            ${t('ch5_subhead')}
          </p>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:24px;">
            ${EVENTS.map(e => _eventCard(e)).join('')}
          </div>
        </div>
      </section>

      <!-- ══════════ CHAPTER 06 — THE COLLECTIBLES STORE ══════════ -->
      <section id="chapter-06" class="editorial-chapter" style="padding:60px 32px;background:rgba(4,4,8,0.95);border-top:1px solid rgba(255,255,255,0.05);">
        <div id="collectibles-store-container"></div>
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
          <h3 style="font-family:'Space Grotesk',sans-serif;font-size:1.1rem;font-weight:700;color:#fff;margin:0;text-transform:uppercase;">${t('modal_create_title')}</h3>
          <button id="custom-room-close" style="background:transparent;border:none;color:rgba(255,255,255,0.4);font-size:18px;cursor:pointer;line-height:1;" onmouseenter="this.style.color='#fff'" onmouseleave="this.style.color='rgba(255,255,255,0.4)'">&times;</button>
        </div>
        
        <div style="display:flex;flex-direction:column;gap:16px;">
          <div>
            <label style="display:block;font-size:9.5px;font-family:'Space Grotesk',sans-serif;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${t('modal_name_label')}</label>
            <input type="text" id="custom-room-name-input" placeholder="e.g. Brainstorming Arena" style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:10px 14px;color:#fff;font-family:'Space Grotesk',sans-serif;font-size:13px;outline:none;" />
          </div>
          
          <div>
            <label style="display:block;font-size:9.5px;font-family:'Space Grotesk',sans-serif;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${t('modal_invite_label')}</label>
            <div id="custom-room-invites-list" style="max-height:160px;overflow-y:auto;border:1px solid rgba(255,255,255,0.04);border-radius:8px;background:rgba(0,0,0,0.2);padding:10px;display:flex;flex-direction:column;gap:8px;">
              ${connections.length === 0 ? `
                <div style="font-size:11px;color:rgba(255,255,255,0.3);text-align:center;padding:12px 0;">${t('modal_no_conns')}</div>
              ` : connections.map(c => `
                <label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:12px;color:rgba(255,255,255,0.75);">
                  <input type="checkbox" class="room-invite-checkbox" value="${c.email}" style="accent-color:#7c3aed;" />
                  <span>${c.name} (${c.handle})</span>
                </label>
              `).join('')}
            </div>
          </div>
          
          <button id="custom-room-submit" style="width:100%;background:#06b6d4;color:#000;border:none;border-radius:8px;padding:12px;font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;cursor:pointer;transition:background 0.2s;" onmouseenter="this.style.background='#0891b2'" onmouseleave="this.style.background='#06b6d4'">${t('modal_btn_create')}</button>
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

  // Initialize 3D Profile Avatar nodes with saved user config
  const savedGender = localStorage.getItem('xiberlinc_avatar_node') || 'man';
  let savedPalette = null;
  try {
    savedPalette = JSON.parse(localStorage.getItem('xiberlinc_avatar_palette'));
  } catch(e) {}
  if (!savedPalette) {
    savedPalette = { ...DEFAULT_PALETTES[savedGender] };
  }

  function mountProfile3DAvatar(elId) {
    const container = document.getElementById(elId);
    if (!container) return;
    if (container._avatarEngine) {
      try { container._avatarEngine.dispose(); } catch(e) {}
      container._avatarEngine = null;
    }
    container.innerHTML = '';
    const engine = new AvatarEngine(container);
    engine.init();
    engine.loadAvatar(savedGender, savedPalette);
    
    // Zoom in on head/chest area for profile icon thumbnail
    engine.camera.position.set(0, 0.45, 2.5);
    engine.controls.target.set(0, 0.35, 0);
    engine.controls.enableRotate = true; // User can rotate their profile card character
    engine.controls.enableZoom = false;
    engine.controls.update();

    container._avatarEngine = engine;
  }

  mountProfile3DAvatar('unclaimed-profile-3d-avatar');
  mountProfile3DAvatar('claimed-profile-3d-avatar');

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

  const storeContainer = document.getElementById('collectibles-store-container');
  if (storeContainer) {
    renderCollectiblesStore(storeContainer);
  }
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
  return `
    <div class="wld-reveal" style="display:flex;flex-direction:column;gap:12px;">
      ${rows.map((entry, i) => {
        const rankCol = i===0?'#e2b857':i===1?'#2563eb':i===2?'#ec4899':'rgba(255,255,255,0.4)';
        const p       = entry.player;
        const score   = entry.score || p?.wmi || 100;
        const rating  = Math.min(99, Math.max(65, Math.round((score / 150) * 100)));
        const tierBadge = rating >= 90 ? 'S+' : rating >= 80 ? 'S' : rating >= 70 ? 'A' : 'B';
        const speedScore = Math.min(100, Math.max(40, Math.round(300 - (p?.reactionMs || 220))));
        const memoryScore = Math.min(100, Math.round((score / 140) * 95));
        const suppressionScore = Math.min(100, Math.round(speedScore * 0.92));

        return `
          <div style="
            display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:16px;
            padding:18px 24px;
            background:rgba(12,12,16,0.8);border:1px solid rgba(255,255,255,0.08);border-radius:16px;
            transition:all 0.3s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          " class="wld-lb-row editorial-row-card" data-cursor="RANK"
          >
            <!-- Rank Badge -->
            <div style="text-align:center;font-family:'Outfit',sans-serif;font-weight:900;font-size:1.3rem;color:${rankCol};">
              #${entry.rank}
            </div>

            <!-- Player Profile & Stat Breakdown -->
            <div>
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
                <div style="width:38px;height:38px;border-radius:50%;background:${p?.avatarColor||'#e2b857'}18;border:1.5px solid ${p?.avatarColor||'#e2b857'};display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-weight:800;font-size:0.95rem;color:${p?.avatarColor||'#e2b857'};flex-shrink:0;">
                  ${p?.avatar||p?.name?.[0]||'?'}
                </div>
                <div>
                  <div style="font-family:'Outfit',sans-serif;font-weight:800;font-size:0.95rem;color:#fff;display:flex;align-items:center;gap:8px;">
                    ${p?.name}
                    <span style="font-family:'Space Grotesk',sans-serif;font-size:9px;padding:2px 6px;border-radius:4px;background:rgba(124,58,237,0.2);color:#a78bfa;border:1px solid rgba(167,139,250,0.3);font-weight:700;">
                      TIER ${tierBadge}
                    </span>
                  </div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:rgba(255,255,255,0.4);">${p?.handle||''} &middot; ${p?.specialty||'Cognitive Athlete'}</div>
                </div>
              </div>

              <!-- Stat Breakdown Bars -->
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(110px, 1fr));gap:8px;background:rgba(0,0,0,0.3);padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);">
                <div>
                  <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.5);margin-bottom:2px;">
                    <span>SPEED</span>
                    <span style="color:#00f0ff;">${p?.reactionMs || 185}ms</span>
                  </div>
                  <div style="height:3px;background:rgba(255,255,255,0.1);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${speedScore}%;background:#00f0ff;"></div>
                  </div>
                </div>

                <div>
                  <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.5);margin-bottom:2px;">
                    <span>MEMORY (K)</span>
                    <span style="color:#a78bfa;">${(score / 30).toFixed(2)}</span>
                  </div>
                  <div style="height:100%;height:3px;background:rgba(255,255,255,0.1);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${memoryScore}%;background:#a78bfa;"></div>
                  </div>
                </div>

                <div>
                  <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:8.5px;color:rgba(255,255,255,0.5);margin-bottom:2px;">
                    <span>SUPPRESSION</span>
                    <span style="color:#34d399;">0.92</span>
                  </div>
                  <div style="height:3px;background:rgba(255,255,255,0.1);border-radius:99px;overflow:hidden;">
                    <div style="height:100%;width:${suppressionScore}%;background:#34d399;"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Score Rating & Async Ghost Button -->
            <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:8px;">
              <div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:rgba(255,255,255,0.35);text-transform:uppercase;">RATING</div>
                <div style="font-family:'Outfit',sans-serif;font-weight:900;font-size:1.5rem;color:${i<3?rankCol:'#fff'};line-height:1;">${rating}</div>
              </div>

              <button class="btn-ghost-match-trigger" data-player-id="${p?.id || i}" style="
                background: rgba(212,255,0,0.12); border: 1px solid rgba(212,255,0,0.35);
                color: #d4ff00; font-family: 'Space Grotesk', sans-serif; font-weight: 700;
                font-size: 10.5px; padding: 5px 10px; border-radius: 6px; cursor: pointer;
                white-space: nowrap; transition: all 0.2s;
              " onclick="window.launchGhostMatch && window.launchGhostMatch('${p?.name || 'Pro Player'}', ${p?.reactionMs || 185}, ${score})">
                ⚔ Ghost Match
              </button>
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
  const isVipRoom = index % 2 === 1 || locked;

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

      <!-- VIP Access Badge -->
      <div style="
        position: absolute; top: 12px; right: 12px;
        font-family: 'JetBrains Mono', monospace; font-size: 9px;
        text-transform: uppercase; letter-spacing: 0.1em;
        color: ${isVipRoom ? '#a78bfa' : '#34d399'};
        background: ${isVipRoom ? 'rgba(124,58,237,0.15)' : 'rgba(52,211,153,0.15)'};
        border: 1px solid ${isVipRoom ? 'rgba(167,139,250,0.3)' : 'rgba(52,211,153,0.3)'};
        border-radius: 4px; padding: 3px 8px; z-index: 5;
      ">
        ${isVipRoom ? '🎟 VIP Ticket Room' : 'FREE ACCESS'}
      </div>

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

      <!-- Action Row with Enter Room -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <button class="enter-room-btn magnetic-btn" data-cursor="ENTER" data-room-id="${room.id}" style="
          flex:1;padding:12px 18px;border-radius:10px;
          border:1px solid ${locked?'rgba(236,72,153,0.3)':`${room.colorHex}44`};
          background:${locked?'rgba(236,72,153,0.08)':`${room.colorHex}14`};
          color:${locked?'#ec4899':room.colorHex};font-family:'Montserrat',sans-serif;
          font-weight:800;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;cursor:pointer;
        ">
          ${locked ? t('btn_locked') + room.lockRank : t('btn_enter_room')}
        </button>
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
