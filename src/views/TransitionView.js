/* ============================================================
   Transition View — Rest screen between tasks
   ============================================================ */

import { render } from '../utils/dom.js';
import { navigate, injectStyle } from '../router.js';
import { t } from '../utils/i18n.js';
import { Storage } from '../utils/storage.js';
import { computeVWMScores } from '../scoring/ScoringEngine.js';

const getNextInfo = () => ({
  'vwm-distractor': {
    number: 2, total: 3,
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
    desc: t('t2_sum'),
  },
  'ant': {
    number: 3, total: 3,
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
    desc: t('t3_sum'),
  },
});

export function TransitionView(params = {}) {
  const next = params.next || 'vwm-distractor';
  const info = getNextInfo()[next] || getNextInfo()['vwm-distractor'];
  const session = Storage.getCurrentSession();
  
  // Calculate results for the task just finished
  const prevTaskType = next === 'vwm-distractor' ? 'vwm-pure' : 'vwm-distractor';
  const prevTrials = session?.trials?.filter(t => t.taskType === prevTaskType) || [];
  const results = computeVWMScores(prevTrials);

  render(`
    <div class="view trv">
      <div class="trv-grid"></div>
      <div class="trv-orb trv-orb-a"></div>
      <div class="trv-orb trv-orb-b"></div>

      <div class="trv-body">
        <svg class="trv-check" width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="38" stroke="#d4ff00" stroke-width="2" fill="rgba(212,255,0,0.07)"/>
          <path d="M24 40L35 51L56 30" stroke="#d4ff00" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="trv-path"/>
        </svg>

        <h2 class="trv-title">${t('tr_title')}</h2>
        
        <div class="trv-prev-stats">
          <div style="font-size:10px; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.1em; margin-bottom:12px;">${t('tr_score_summary')}</div>
          <div class="trv-stat-row">
            <span>${t('tr_accuracy')}</span>
            <span style="color:#34d399">${Math.round(results.accuracy * 100)}%</span>
          </div>
          <div class="trv-stat-row">
            <span>${t('tr_capacity')}</span>
            <span style="color:#d4ff00">${results.maxK.toFixed(2)}</span>
          </div>
        </div>

        <p class="trv-sub">${t('tr_break')}</p>

        <div style="font-family:var(--font-mono); font-size:11px; color:#d4ff00; letter-spacing:0.12em; text-transform:uppercase; margin-top:8px; margin-bottom:16px;">
          ${info.number - 1} / ${info.total} ${t('tr_of3')}
        </div>

        <button class="trv-cta" id="btn-continue">
          ${t('tr_continue')}
        </button>
      </div>
    </div>
  `);

  injectStyle(`
    /* ── Transition — volt-green unified theme ──────────── */
    .trv {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 40px 24px;
      position: relative; overflow: hidden;
      background:
        radial-gradient(ellipse 65% 50% at 50% 0%, rgba(212,255,0,0.07) 0%, transparent 60%),
        radial-gradient(ellipse 45% 40% at 10% 90%, rgba(138,255,0,0.04) 0%, transparent 55%);
    }
    .trv-grid {
      position: absolute; inset: 0;
      background-image:
        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
      background-size: 48px 48px;
      animation: trv-grid-drift 22s linear infinite;
      pointer-events: none; z-index: 0;
    }
    @keyframes trv-grid-drift {
      from { background-position: 0 0; }
      to   { background-position: 48px 48px; }
    }
    .trv-orb {
      position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; opacity: 0.15;
      animation: trv-orb-breathe ease-in-out infinite alternate;
    }
    .trv-orb-a { width: 260px; height: 260px; top: -50px; right: -50px; background: #d4ff00; animation-duration: 9s; }
    .trv-orb-b { width: 180px; height: 180px; bottom: -30px; left: -30px; background: #8aff00; animation-duration: 12s; }
    @keyframes trv-orb-breathe {
      from { transform: scale(1); }
      to   { transform: scale(1.1) translate(6px, 10px); }
    }

    .trv-body {
      max-width: 520px; width: 100%;
      text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 24px;
      position: relative; z-index: 1;
    }
    .trv-check { animation: scale-in 0.4s ease-out; }
    .trv-path  { stroke-dasharray: 55; stroke-dashoffset: 55; animation: drawPath 0.5s ease-out 0.3s forwards; }
    @keyframes drawPath { to { stroke-dashoffset: 0; } }

    .trv-title { font-size: 2.2rem; color: #d4ff00; margin-bottom: 4px; }
    .trv-sub   { color: var(--text-secondary); font-size: 1rem; }

    .trv-prev-stats {
      background: rgba(13,13,18,0.65);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(212,255,0,0.1);
      border-radius: 12px; padding: 16px 24px;
      width: 100%; max-width: 320px; text-align: left;
      box-shadow: 0 4px 20px rgba(0,0,0,0.25);
    }
    .trv-stat-row {
      display: flex; justify-content: space-between;
      font-family: var(--font-mono); font-size: 12px; margin-bottom: 8px;
    }
    .trv-stat-row:last-child { margin-bottom: 0; }
    .trv-stat-row span:first-child { color: var(--text-tertiary); }

    .trv-card {
      width: 100%;
      background: rgba(13,13,18,0.65);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(212,255,0,0.12);
      border-radius: 20px; padding: 28px 32px; text-align: left;
      box-shadow: 0 8px 32px rgba(0,0,0,0.25);
    }
    .trv-card-head {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    .trv-badge {
      font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.12em;
      padding: 3px 12px; border-radius: 99px;
      color: #d4ff00; background: rgba(212,255,0,0.1); border: 1px solid rgba(212,255,0,0.25);
    }
    .trv-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      color: #d4ff00;
      filter: drop-shadow(0 0 6px rgba(212,255,0,0.25));
    }
    .trv-icon svg {
      width: 48px;
      height: 48px;
    }
    .trv-card-title  { font-size: 1.15rem; margin-bottom: 8px; }
    .trv-card-desc   { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.65; margin-bottom: 20px; }
    .trv-bar-wrap    { display: flex; align-items: center; gap: 10px; }
    .trv-bar         { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
    .trv-bar-fill    { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #d4ff00, #8aff00); }
    .trv-bar-label   { font-family: var(--font-mono); font-size: 10px; color: var(--text-tertiary); white-space: nowrap; }

    .trv-cta {
      font-family: var(--font-display); font-weight: 700;
      font-size: 1.05rem; color: #080810;
      padding: 16px 48px; min-width: 260px;
      background: linear-gradient(135deg, #d4ff00 0%, #aaff00 100%);
      border: none; border-radius: 14px; cursor: pointer;
      transition: all 0.2s;
    }
    .trv-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(212,255,0,0.3); }

    @media (min-width: 1400px) {
      .trv-body { max-width: 680px; gap: 32px; }
      .trv-title { font-size: 2.8rem; }
      .trv-sub { font-size: 1.25rem; }
      .trv-prev-stats { max-width: 400px; padding: 24px 32px; }
      .trv-stat-row { font-size: 14px; margin-bottom: 12px; }
      .trv-cta { padding: 20px 60px; font-size: 1.2rem; }
    }
    @media (min-width: 1800px) {
      .trv-body { max-width: 820px; gap: 40px; }
      .trv-title { font-size: 3.4rem; }
      .trv-sub { font-size: 1.4rem; }
      .trv-prev-stats { max-width: 480px; padding: 30px 40px; }
      .trv-stat-row { font-size: 16px; margin-bottom: 16px; }
      .trv-cta { padding: 24px 72px; font-size: 1.35rem; }
    }
  `);

  document.getElementById('btn-continue').addEventListener('click', () => {
    navigate('instructions', { task: next });
  });
}
