/* ============================================================
   Instructions View — Luxury Automotive HUD & Glassmorphism Design
   ============================================================ */

import { render } from '../utils/dom.js';
import { navigate, injectStyle } from '../router.js';
import { t } from '../utils/i18n.js';

const getTaskInfo = () => ({
  'vwm-pure': {
    icon: `
      <svg class="task-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-opacity="0.3" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="2 2" />
        <circle cx="9" cy="9" r="2" fill="currentColor" />
        <circle cx="15" cy="15" r="2" fill="currentColor" />
        <circle cx="9" cy="15" r="1" fill="none" stroke="currentColor" stroke-opacity="0.4" />
        <circle cx="15" cy="9" r="1" fill="none" stroke="currentColor" stroke-opacity="0.4" />
        <path d="M9 9l6 6" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" />
      </svg>
    `,
    title: t('t1_title'),
    tag: t('t1_tag'),
    summary: t('t1_sum'),
    steps: [ t('t1_s1'), t('t1_s2'), t('t1_s3'), t('t1_s4') ],
    keys: [{ label: t('key_same'), key: 'S', color: '#34d399' }, { label: t('key_diff'), key: 'D', color: '#f87171' }],
  },
  'vwm-distractor': {
    icon: `
      <svg class="task-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-opacity="0.3" />
        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="2 2" />
        <circle cx="9" cy="9" r="2" fill="currentColor" />
        <circle cx="15" cy="15" r="2" fill="currentColor" />
        <rect x="13.5" y="7.5" width="3" height="3" rx="0.5" fill="none" stroke="currentColor" stroke-opacity="0.5" />
        <rect x="7.5" y="13.5" width="3" height="3" rx="0.5" fill="none" stroke="currentColor" stroke-opacity="0.5" />
        <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="1" stroke-dasharray="2 2" stroke-opacity="0.5" />
      </svg>
    `,
    title: t('t2_title'),
    tag: t('t2_tag'),
    summary: t('t2_sum'),
    distractor_note: true,
    steps: [ t('t2_s1'), t('t2_s2'), t('t2_s3'), t('t2_s4'), t('t2_s5'), t('t2_s6') ],
    keys: [{ label: t('key_same'), key: 'S', color: '#34d399' }, { label: t('key_diff'), key: 'D', color: '#f87171' }],
  },
  'ant': {
    icon: `
      <svg class="task-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 12h3M5.5 10.5L7 12l-1.5 1.5" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2" />
        <path d="M8 12h3M9.5 10.5L11 12l-1.5 1.5" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2" />
        <path d="M12 12h5m-2.5-3.5L17 12l-2.5 3.5" stroke="currentColor" stroke-width="2" />
        <path d="M18 12h3M19.5 10.5L21 12l-1.5 1.5" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-opacity="0.15" />
      </svg>
    `,
    title: t('t3_title'),
    tag: t('t3_tag'),
    summary: t('t3_sum'),
    steps: [ t('t3_s1'), t('t3_s3'), t('t3_s4'), t('t3_s5'), t('t3_s6') ],
    keys: [{ label: t('key_left'), key: '←', color: '#34d399' }, { label: t('key_right'), key: '→', color: '#f87171' }],
  },
});

const NEXT_ROUTE = {
  'vwm-pure': 'task/vwm-pure',
  'vwm-distractor': 'task/vwm-distractor',
  'ant': 'task/ant',
};

export function InstructionsView(params = {}) {
  const taskKey = params.task || 'vwm-pure';
  const info = getTaskInfo()[taskKey];
  if (!info) { navigate(''); return; }

  // ── Static Trial-Flow Strip Builder ───────────────────────────────────────
  function buildFlowStrip() {
    const SQ = [
      { bg: '#e74c3c', glow: 'rgba(231,76,60,0.6)' },
      { bg: '#3b82f6', glow: 'rgba(59,130,246,0.6)' },
      { bg: '#f59e0b', glow: 'rgba(245,158,11,0.6)' },
      { bg: '#8b5cf6', glow: 'rgba(139,92,246,0.6)' },
    ];
    const sq = (c, top, left) =>
      `<div class="sf-sq" style="top:${top};left:${left};background:${c.bg};box-shadow:0 0 9px ${c.glow}"></div>`;
    const oline = (top, left) =>
      `<div class="sf-sq sf-sq--outline" style="top:${top};left:${left}"></div>`;
    const wsq = (top, left) =>
      `<div class="sf-sq sf-sq--white" style="top:${top};left:${left}"></div>`;
    const fixEl = (op = 0.75) =>
      `<div class="sf-fix" style="opacity:${op}">+</div>`;
    const frame = (content, mod, label, timing) =>
      `<div class="sf-unit">
        <div class="sf-frame${mod ? ' sf-frame--' + mod : ''}">${content}</div>
        <div class="sf-meta">
          <div class="sf-phase">${label}</div>
          <div class="sf-timing${timing === '200ms' ? ' sf-timing--fast' : ''}">${timing}</div>
        </div>
      </div>`;

    if (taskKey === 'vwm-pure') {
      return [
        frame(fixEl(), '', 'FIXATION', '~500ms'),
        frame(
          sq(SQ[0],'15%','10%') + sq(SQ[1],'12%','58%') + sq(SQ[2],'56%','20%') + sq(SQ[3],'52%','56%') + fixEl(0.12),
          'encode', 'ENCODING', '200ms'
        ),
        frame(fixEl(0.3), '', 'RETENTION', '900ms'),
        frame(
          sq(SQ[0],'15%','10%') + oline('12%','58%') + oline('56%','20%') + oline('52%','56%') + fixEl(0.12),
          'probe', 'PROBE', 'respond'
        ),
      ].map(f => `<div class="sf-slide">${f}</div>`).join('');
    }

    if (taskKey === 'vwm-distractor') {
      return [
        frame(fixEl(), '', 'FIXATION', '~500ms'),
        frame(
          sq(SQ[0],'15%','10%') + wsq('12%','56%') + wsq('56%','18%') + sq(SQ[3],'52%','56%') + fixEl(0.12),
          'encode', 'ENCODING', '200ms'
        ),
        frame(fixEl(0.3), '', 'RETENTION', '900ms'),
        frame(
          sq(SQ[0],'15%','10%') + oline('12%','56%') + oline('56%','18%') + oline('52%','56%') + fixEl(0.12),
          'probe', 'PROBE', 'respond'
        ),
      ].map(f => `<div class="sf-slide">${f}</div>`).join('');
    }

    if (taskKey === 'ant') {
      const antSvg = (dir, cls) => {
        const flip = dir === 'right' ? 'transform:scaleX(-1)' : '';
        // High-fidelity archery arrow matching user's exact SVG layout (1200x300 viewBox)
        return `<svg viewBox="0 0 1200 300" class="sf-ant-arrow${cls ? ' ' + cls : ''}" style="${flip}" overflow="visible">
          <!-- Shaft segments (with gaps for decorative rings) -->
          <line x1="180" y1="150" x2="240" y2="150" stroke="currentColor" stroke-width="12" />
          <line x1="246" y1="150" x2="255" y2="150" stroke="currentColor" stroke-width="12" />
          <line x1="261" y1="150" x2="270" y2="150" stroke="currentColor" stroke-width="12" />
          <line x1="276" y1="150" x2="980" y2="150" stroke="currentColor" stroke-width="12" />
          <!-- Round caps for shaft outer ends -->
          <circle cx="180" cy="150" r="6" fill="currentColor" />
          <circle cx="980" cy="150" r="6" fill="currentColor" />
          <!-- Arrowhead -->
          <polygon points="90,150 180,90 150,150 180,210" fill="currentColor" />
          <!-- Tail Fangs Top -->
          <line x1="850" y1="150" x2="930" y2="80" stroke="currentColor" stroke-width="10" stroke-linecap="round" />
          <line x1="900" y1="150" x2="980" y2="80" stroke="currentColor" stroke-width="10" stroke-linecap="round" />
          <line x1="950" y1="150" x2="1030" y2="80" stroke="currentColor" stroke-width="10" stroke-linecap="round" />
          <!-- Tail Fangs Bottom -->
          <line x1="850" y1="150" x2="930" y2="220" stroke="currentColor" stroke-width="10" stroke-linecap="round" />
          <line x1="900" y1="150" x2="980" y2="220" stroke="currentColor" stroke-width="10" stroke-linecap="round" />
          <line x1="950" y1="150" x2="1030" y2="220" stroke="currentColor" stroke-width="10" stroke-linecap="round" />
        </svg>`;
      };
      const congRow = `<div class="sf-ant-row">${antSvg('right','')}${antSvg('right','')}${antSvg('right','sf-ant-center')}${antSvg('right','')}${antSvg('right','')}</div>`;
      const incRow  = `<div class="sf-ant-row">${antSvg('right','sf-ant-dim')}${antSvg('right','sf-ant-dim')}${antSvg('left','sf-ant-center')}${antSvg('right','sf-ant-dim')}${antSvg('right','sf-ant-dim')}</div>`;
      
      const respFrame = `
        <div class="sf-unit">
          <div class="sf-frame sf-frame--respond">
            <div class="sf-respond-keys">
              <div class="sf-resp-key sf-resp-key--l">← L</div>
              <div class="sf-resp-key sf-resp-key--r">R →</div>
            </div>
          </div>
          <div class="sf-meta">
            <div class="sf-phase">RESPOND</div>
            <div class="sf-timing sf-timing--fast">fast + accurate</div>
          </div>
        </div>
      `;
      
      return [
        frame(fixEl(), '', 'FIXATION', '400–1200ms'),
        frame(congRow + fixEl(), '', 'CONGRUENT', 'same direction'),
        frame(incRow + fixEl(0.35), '', 'INCONGRUENT', 'center differs'),
        respFrame
      ].map(f => `<div class="sf-slide">${f}</div>`).join('');
    }
    return '';
  }

  render(`
    <div class="view iv">
      <!-- 3D atmospheric studio lighting & glass shards -->
      <div class="iv-mesh-cyan"></div>
      <div class="iv-mesh-gold"></div>
      <div class="iv-glass-shard shard-1"></div>
      <div class="iv-glass-shard shard-2"></div>
      <div class="iv-glass-shard shard-3"></div>

      <div class="iv-container">

        <!-- Asymmetrical layout -->
        <div class="iv-hud">
          <!-- Left side panel — title, description, keys -->
          <div class="iv-hud-left">
            <div class="iv-header-block">
              <span class="iv-tag-premium">${info.tag}</span>
              <h1 class="iv-title-premium">${info.title}</h1>
              <p class="iv-desc">${info.summary}</p>
            </div>

            <!-- Hardware keys block -->
            <div class="iv-keys-hud">
              <div class="iv-keys-title">HARDWARE INPUTS</div>
              <div class="iv-keys-row">
                ${info.keys.map(k => `
                  <div class="iv-key-card-premium">
                    <span class="iv-key-cap" style="color:${k.color}; border-color:${k.color}40; box-shadow: 0 0 15px ${k.color}15;">${k.key}</span>
                    <span class="iv-key-name">${k.label}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Right side main glass card -->
          <div class="iv-hud-right">
            <div class="iv-card" id="iv-tilt-card">
              <div class="iv-card-glare"></div>
              <div class="iv-card-inner">
                <h3 class="iv-card-title">TRIAL STRUCTURE</h3>

                <!-- Interactive Trial Flow Carousel -->
                <div class="sf-carousel-container">
                  <button class="sf-carousel-btn sf-prev-btn" id="sf-prev" type="button">◂</button>
                  <div class="sf-carousel-viewport">
                    <div class="sf-carousel-track" id="sf-track">
                      ${buildFlowStrip()}
                    </div>
                  </div>
                  <button class="sf-carousel-btn sf-next-btn" id="sf-next" type="button">▸</button>
                </div>
                <div class="sf-carousel-dots" id="sf-dots"></div>

                <!-- Written Instructions -->
                <div class="sf-instructions">
                  <div class="sf-inst-head">SEQUENCE PROTOCOL</div>
                  <ol class="sf-inst-list">
                    ${info.steps.map((step, idx) => `
                      <li class="sf-inst-item">
                        <span class="sf-inst-num">0${idx + 1}</span>
                        <div class="sf-inst-text">${step}</div>
                      </li>
                    `).join('')}
                  </ol>
                  ${info.distractor_note ? `
                    <div class="sf-dist-note">
                      <span class="sf-dist-badge">FILTER TASK</span>
                      <p class="sf-dist-text">${t('dist_tip')}</p>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>

            <!-- Start test button -->
            <button class="iv-cta-premium" id="btn-start">
              <span class="cta-label">${t('btn_ready')}</span>
              <span class="cta-arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `);

  injectStyle(`
    :root {
      --sf-width: 240px;
      --sf-height: 160px;
      --sf-sq-size: 24px;
      --sf-arrow-w: 42px;
      --sf-arrow-h: 10.5px;
      --sf-center-w: 48px;
      --sf-center-h: 12px;
      --sf-fix-size: 2.2rem;
      --sf-arr-size: 1.5rem;
    }

    @media (max-width: 980px) {
      :root {
        --sf-width: 200px;
        --sf-height: 133px;
        --sf-sq-size: 20px;
        --sf-arrow-w: 35px;
        --sf-arrow-h: 9px;
        --sf-center-w: 40px;
        --sf-center-h: 10px;
        --sf-fix-size: 1.8rem;
        --sf-arr-size: 1.25rem;
      }
    }

    /* ============================================================
       Scandinavian Minimalism / Lenna EV UI System
       ============================================================ */
    .iv {
      min-height: 100vh;
      background: #050506;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-family: var(--font-body);
      color: #c4c4c7;
      padding: 48px;
      position: relative;
      perspective: 1200px;
    }
    
    .iv-container {
      max-width: 1200px;
      width: 100%;
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    /* ── Interactive Flow Carousel ── */
    .sf-carousel-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 16px;
      width: 100%;
      position: relative;
    }

    .sf-carousel-viewport {
      overflow: hidden;
      width: 100%;
      max-width: 320px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 16px 0;
    }

    .sf-carousel-track {
      display: flex;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      width: 100%;
    }

    .sf-slide {
      flex: 0 0 100%;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-sizing: border-box;
      padding: 0 20px;
    }

    .sf-carousel-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #fff;
      font-size: 18px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
      user-select: none;
    }

    .sf-carousel-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: var(--accent-volt);
      color: var(--accent-volt);
    }

    .sf-carousel-dots {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 36px;
    }

    .sf-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
      cursor: pointer;
      transition: all 0.25s;
    }

    .sf-dot.active {
      background: var(--accent-volt);
      box-shadow: 0 0 8px var(--accent-volt);
      transform: scale(1.2);
    }

    .sf-unit {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      width: 100%;
    }

    .sf-frame {
      position: relative;
      width: var(--sf-width);
      height: var(--sf-height);
      background: rgba(0, 0, 0, 0.52);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 7px;
      overflow: hidden;
    }

    .sf-frame--encode {
      border-color: rgba(212, 255, 0, 0.22);
      box-shadow: 0 0 28px rgba(212, 255, 0, 0.05);
    }

    .sf-frame--probe {
      border-color: rgba(255, 255, 255, 0.13);
    }

    .sf-frame--respond {
      border-color: rgba(255, 255, 255, 0.07);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .sf-fix {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: var(--sf-fix-size);
      font-weight: 300;
      color: rgba(255, 255, 255, 0.75);
      line-height: 1;
      z-index: 2;
    }

    .sf-sq {
      position: absolute;
      width: var(--sf-sq-size);
      height: var(--sf-sq-size);
      border-radius: 2.5px;
    }

    .sf-sq--outline {
      background: transparent !important;
      box-shadow: none !important;
      border: 1.5px solid rgba(255, 255, 255, 0.2);
    }

    .sf-sq--white {
      background: rgba(255, 255, 255, 0.82) !important;
      box-shadow: 0 0 5px rgba(255, 255, 255, 0.28) !important;
    }

    .sf-meta {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }

    .sf-phase {
      font-family: var(--font-mono);
      font-size: 7.5px;
      letter-spacing: 0.18em;
      color: #52525b;
      text-transform: uppercase;
    }

    .sf-timing {
      font-family: var(--font-mono);
      font-size: 8.5px;
      color: rgba(255, 255, 255, 0.22);
    }

    .sf-timing--fast { color: var(--accent-volt); }

    /* ANT arrows in flow strip */
    .sf-ant-row {
      position: absolute;
      top: 14%;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .sf-ant-arrow {
      display: inline-block;
      width: var(--sf-arrow-w);
      height: var(--sf-arrow-h);
      color: #707a8a;
      overflow: visible;
    }

    .sf-ant-center { color: #ffffff;              width: var(--sf-center-w); height: var(--sf-center-h); }
    .sf-ant-dim    { color: rgba(112,122,138,0.22); }
    .sf-ant-volt   { color: var(--accent-volt);    width: var(--sf-center-w); height: var(--sf-center-h); }

    .sf-respond-keys {
      display: flex;
      gap: 7px;
    }

    .sf-resp-key {
      padding: 5px 9px;
      border-radius: 3px;
      font-family: var(--font-mono);
      font-size: 9px;
      font-weight: 700;
      border: 1px solid;
      letter-spacing: 0.04em;
    }

    .sf-resp-key--l {
      background: rgba(52,211,153,0.1);
      border-color: rgba(52,211,153,0.3);
      color: #34d399;
    }

    .sf-resp-key--r {
      background: rgba(248,113,113,0.1);
      border-color: rgba(248,113,113,0.3);
      color: #f87171;
    }

    /* Instructions list below flow strip */
    .sf-instructions {
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 24px;
    }

    .sf-inst-head {
      font-family: var(--font-mono);
      font-size: 9px;
      color: #52525b;
      letter-spacing: 0.25em;
      margin-bottom: 16px;
    }

    .sf-inst-list {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    .sf-inst-item {
      display: flex;
      gap: 20px;
      padding: 13px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .sf-inst-item:last-child { border-bottom: none; }

    .sf-inst-num {
      font-family: var(--font-mono);
      font-size: 10px;
      color: #4a4a4f;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .sf-inst-text {
      font-size: 0.88rem;
      color: #a1a1aa;
      line-height: 1.65;
    }

    .sf-dist-note {
      margin-top: 18px;
      padding: 14px 18px;
      background: rgba(212,255,0,0.025);
      border: 1px solid rgba(212,255,0,0.07);
      border-radius: 4px;
    }

    .sf-dist-badge {
      display: block;
      font-family: var(--font-mono);
      font-size: 8px;
      letter-spacing: 0.2em;
      color: var(--accent-volt);
      opacity: 0.55;
      margin-bottom: 8px;
    }

    .sf-dist-text {
      font-size: 0.82rem;
      color: #71717a;
      line-height: 1.6;
      margin: 0;
    }

    .iv-hud {
      display: flex;
      gap: 48px;
      align-items: flex-start;
    }

    @media (max-width: 1024px) {
      .iv-hud {
        flex-direction: column;
        align-items: stretch;
        gap: 32px;
      }
      .iv-hud-left {
        flex: 1 1 auto;
        width: 100% !important;
      }
    }

    /* Left Panel Styles */
    .iv-hud-left {
      flex: 0 0 300px;
      display: flex;
      flex-direction: column;
      gap: 48px;
    }

    .iv-header-block {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .iv-tag-premium {
      font-family: var(--font-mono);
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--accent-volt);
      border: 1px solid rgba(212, 255, 0, 0.2);
      background: rgba(212, 255, 0, 0.04);
      padding: 4px 10px;
      border-radius: 2px;
      margin-bottom: 24px;
    }

    .iv-title-premium {
      font-family: var(--font-display);
      font-size: 3.2rem;
      font-style: italic;
      color: #fff;
      font-weight: 600;
      line-height: 1.05;
      margin-bottom: 16px;
    }

    .iv-desc {
      font-size: 0.95rem;
      color: #8a8a93;
      line-height: 1.6;
    }

    /* Steps Index HUD */
    .iv-steps-nav {
      display: flex;
      flex-direction: column;
      gap: 18px;
      border-left: 1px solid rgba(255, 255, 255, 0.03);
      padding-left: 16px;
    }

    .iv-nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: var(--font-mono);
      font-size: 10px;
      color: #4a4a4f;
      cursor: pointer;
      transition: color 0.3s;
      position: relative;
      padding: 2px 0;
    }

    .iv-nav-num {
      font-weight: 500;
    }

    .iv-nav-sep {
      opacity: 0.3;
    }

    .iv-nav-label {
      letter-spacing: 0.15em;
    }

    .iv-nav-line {
      position: absolute;
      left: -20px;
      top: 50%;
      transform: translateY(-50%);
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-volt);
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
      box-shadow: 0 0 8px var(--accent-volt);
    }

    .iv-nav-item.active {
      color: #fff;
    }

    .iv-nav-item.active .iv-nav-line {
      opacity: 1;
      transform: translateY(-50%) scale(1.3);
    }

    /* Keybind Layout */
    .iv-keys-hud {
      display: flex;
      flex-direction: column;
      gap: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 32px;
    }

    .iv-keys-title {
      font-family: var(--font-mono);
      font-size: 9px;
      color: #52525b;
      letter-spacing: 0.15em;
    }

    .iv-keys-row {
      display: flex;
      gap: 16px;
    }

    .iv-key-card-premium {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      padding: 8px 16px 8px 12px;
      border-radius: 4px;
    }

    .iv-key-cap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 1px solid;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 14px;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.02);
    }

    .iv-key-name {
      font-size: 10px;
      text-transform: uppercase;
      font-family: var(--font-mono);
      color: #8a8a93;
      letter-spacing: 0.05em;
    }

    /* Right Panel Styles */
    .iv-hud-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .iv-card {
      position: relative;
      background: rgba(20, 20, 22, 0.45);
      backdrop-filter: blur(35px);
      -webkit-backdrop-filter: blur(35px);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }

    .iv-card-glare {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, transparent 60%);
      pointer-events: none;
      border-radius: 8px;
      z-index: 10;
    }

    .iv-card-inner {
      padding: 48px;
    }

    .iv-card-title {
      font-family: var(--font-mono);
      font-size: 9px;
      color: #52525b;
      letter-spacing: 0.25em;
      margin-bottom: 28px;
    }

    /* Instructions Steps List */
    .iv-steps-list-premium {
      display: flex;
      flex-direction: column;
      gap: 0;
      list-style: none;
    }

    .iv-step-item-premium {
      display: flex;
      gap: 32px;
      padding: 24px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      transition: padding-left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.3s;
      position: relative;
    }

    .iv-step-item-premium:last-child {
      border-bottom: none;
    }

    .iv-step-badge {
      font-family: var(--font-mono);
      font-size: 10px;
      color: #4a4a4f;
      margin-top: 4px;
      transition: color 0.3s;
    }

    .iv-step-content {
      font-size: 1rem;
      color: #a1a1aa;
      line-height: 1.7;
      transition: color 0.3s;
    }

    .iv-step-item-premium:hover {
      padding-left: 8px;
    }

    .iv-step-item-premium:hover .iv-step-content {
      color: #fff;
    }

    .iv-step-item-premium:hover .iv-step-badge {
      color: var(--accent-volt);
    }

    /* Luxury Interactive Visual Callouts */
    .iv-distractor-card-premium {
      margin-top: 40px;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 6px;
      padding: 24px;
    }

    .iv-dist-head {
      font-family: var(--font-mono);
      font-size: 9px;
      color: #52525b;
      letter-spacing: 0.15em;
      margin-bottom: 20px;
    }

    .iv-dist-display {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-bottom: 20px;
    }

    .iv-dist-sq-p {
      width: 36px;
      height: 36px;
      border-radius: 3px;
    }

    .vwm-target {
      background: #00f0ff;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.25);
    }

    .vwm-noise {
      background: #ffffff;
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
    }

    .iv-dist-legend-p {
      display: flex;
      justify-content: center;
      gap: 32px;
      font-family: var(--font-mono);
      font-size: 9px;
      color: #71717a;
      margin-bottom: 16px;
      letter-spacing: 0.05em;
    }

    .iv-dist-legend-p span {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .dot-p {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      display: inline-block;
    }

    .target-dot {
      background: #00f0ff;
    }

    .noise-dot {
      background: #ffffff;
      box-shadow: 0 0 8px rgba(255, 255, 255, 0.25);
    }

    .iv-dist-text-p {
      font-size: 0.85rem;
      color: #71717a;
      line-height: 1.6;
      text-align: center;
      max-width: 440px;
      margin: 0 auto;
    }

    .iv-schematics-premium {
      margin-top: 40px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 6px;
      padding: 16px;
    }

    .iv-schematics-premium img {
      max-width: 100%;
      border-radius: 4px;
      display: block;
      margin: 0 auto;
      opacity: 0.65;
      transition: opacity 0.3s;
    }

    .iv-schematics-premium img:hover {
      opacity: 1;
    }

    /* Start Button - Wide low-profile automotive HUD style */
    .iv-cta-premium {
      position: relative;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #fff;
      color: #000;
      border: none;
      padding: 22px 36px;
      border-radius: 8px;
      font-family: var(--font-body);
      font-weight: 700;
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      cursor: pointer;
      transition: background 0.3s, transform 0.2s, box-shadow 0.3s;
      overflow: hidden;
    }

    .iv-cta-premium:hover {
      background: var(--accent-volt);
      transform: translateY(-2px);
      box-shadow: 0 20px 40px rgba(212, 255, 0, 0.25);
    }

    .iv-cta-premium:active {
      transform: translateY(0);
    }

    .cta-arrow {
      font-size: 1.25rem;
      font-weight: 600;
      transition: transform 0.3s;
    }

    .iv-cta-premium:hover .cta-arrow {
      transform: translateX(4px);
    }

    /* 3D Atmospheric Backlighting & Glass Objects */
    .iv-mesh-cyan {
      position: absolute;
      width: 600px;
      height: 600px;
      border-radius: 50%;
      filter: blur(160px);
      pointer-events: none;
      opacity: 0.035;
      background: #00f0ff;
      top: -100px;
      left: -100px;
      animation: breathe-light 10s ease-in-out infinite alternate;
    }

    .iv-mesh-gold {
      position: absolute;
      width: 550px;
      height: 550px;
      border-radius: 50%;
      filter: blur(140px);
      pointer-events: none;
      opacity: 0.025;
      background: #e2b755;
      bottom: -80px;
      right: -80px;
      animation: breathe-light 14s ease-in-out infinite alternate;
    }

    @keyframes breathe-light {
      0% {
        transform: scale(1) translate(0, 0);
        opacity: 0.02;
      }
      100% {
        transform: scale(1.15) translate(20px, 15px);
        opacity: 0.045;
      }
    }

    .iv-glass-shard {
      position: absolute;
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.03);
      background: rgba(255, 255, 255, 0.005);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      pointer-events: none;
      opacity: 0.5;
    }

    .shard-1 {
      width: 140px;
      height: 140px;
      top: 15%;
      left: 80%;
      transform: rotate(15deg);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.015) 0%, transparent 80%);
    }

    .shard-2 {
      width: 90px;
      height: 90px;
      bottom: 10%;
      left: 5%;
      transform: rotate(-25deg);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.015) 0%, transparent 80%);
    }

    .shard-3 {
      width: 60px;
      height: 180px;
      top: 45%;
      left: 45%;
      transform: rotate(45deg);
      opacity: 0.1;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.01) 0%, transparent 80%);
    }

    /* Responsive adjustments */
    @media (max-width: 980px) {
      .iv {
        padding: 32px 20px;
      }
      .iv-hud {
        flex-direction: column;
        gap: 48px;
      }
      .iv-hud-left {
        flex: 1 1 auto;
        width: 100%;
        gap: 32px;
      }
      .iv-steps-nav {
        display: none;
      }
      .iv-hud-right {
        width: 100%;
      }
      .iv-card-inner {
        padding: 32px 24px;
      }
      .iv-step-item-premium {
        padding: 16px 0;
        gap: 20px;
      }
    }

    @media (min-width: 1400px) {
      .iv-container { max-width: 1400px; }
      .iv-hud-left { flex: 0 0 380px; gap: 64px; }
      .iv-title-premium { font-size: 4rem; }
      .iv-desc { font-size: 1.15rem; }
      .sf-inst-text { font-size: 1.05rem; }
      .sf-carousel-viewport { max-width: 440px; }
      :root {
        --sf-width: 300px;
        --sf-height: 200px;
        --sf-sq-size: 30px;
        --sf-arrow-w: 52px;
        --sf-arrow-h: 13px;
        --sf-center-w: 60px;
        --sf-center-h: 15px;
        --sf-fix-size: 2.8rem;
        --sf-arr-size: 2rem;
      }
    }
    @media (min-width: 1800px) {
      .iv-container { max-width: 1700px; }
      .iv-hud-left { flex: 0 0 460px; gap: 80px; }
      .iv-title-premium { font-size: 4.8rem; }
      .iv-desc { font-size: 1.3rem; }
      .sf-inst-text { font-size: 1.2rem; }
      .sf-carousel-viewport { max-width: 520px; }
      :root {
        --sf-width: 360px;
        --sf-height: 240px;
        --sf-sq-size: 36px;
        --sf-arrow-w: 64px;
        --sf-arrow-h: 16px;
        --sf-center-w: 72px;
        --sf-center-h: 18px;
        --sf-fix-size: 3.4rem;
        --sf-arr-size: 2.4rem;
      }
    }
  `);

  // Interactive Carousel Control Logic
  const track = document.getElementById('sf-track');
  const prevBtn = document.getElementById('sf-prev');
  const nextBtn = document.getElementById('sf-next');
  const dotsContainer = document.getElementById('sf-dots');
  
  if (track && prevBtn && nextBtn && dotsContainer) {
    const slides = Array.from(track.children);
    let currentIndex = 0;

    const updateCarousel = () => {
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      
      // Update active dot
      const dots = Array.from(dotsContainer.children);
      dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentIndex);
      });

      // Disable/enable buttons
      prevBtn.style.opacity = currentIndex === 0 ? '0.2' : '1';
      prevBtn.style.pointerEvents = currentIndex === 0 ? 'none' : 'auto';
      nextBtn.style.opacity = currentIndex === slides.length - 1 ? '0.2' : '1';
      nextBtn.style.pointerEvents = currentIndex === slides.length - 1 ? 'none' : 'auto';
    };

    // Generate dots dynamically
    slides.forEach((_, idx) => {
      const dot = document.createElement('div');
      dot.className = `sf-dot${idx === 0 ? ' active' : ''}`;
      dot.addEventListener('click', () => {
        currentIndex = idx;
        updateCarousel();
      });
      dotsContainer.appendChild(dot);
    });

    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });

    nextBtn.addEventListener('click', () => {
      if (currentIndex < slides.length - 1) {
        currentIndex++;
        updateCarousel();
      }
    });

    updateCarousel();
  }

  document.getElementById('btn-start').addEventListener('click', () => {
    navigate(NEXT_ROUTE[taskKey] || 'task/vwm-pure');
  });
}

