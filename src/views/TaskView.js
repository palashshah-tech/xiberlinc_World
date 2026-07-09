/* ============================================================
   Task View — Stealth Pro (Skip = Direct Navigate, no engine unwinding)
   ============================================================ */

import { render, $ } from '../utils/dom.js';
import { Storage } from '../utils/storage.js';
import { TaskEngine } from '../engine/TaskEngine.js';
import { ANTEngine } from '../engine/ANTEngine.js';
import { navigate, injectStyle } from '../router.js';
import { CANVAS_SIZE } from '../engine/StimulusGenerator.js';
import { t } from '../utils/i18n.js';

export function TaskView(taskType = 'vwm-pure', params = {}) {
  // Automatically run 2 trials in practice mode first for the public version
  const practiceDone = sessionStorage.getItem(`practice_done_${taskType}`) === 'true';
  const isPractice = !practiceDone;
  const isANT = taskType === 'ant';
  const isDistractor = taskType === 'vwm-distractor';

  const onPracticeComplete = () => {
    sessionStorage.setItem(`practice_done_${taskType}`, 'true');
    document.querySelectorAll('head style[data-view-style]').forEach(el => el.remove());
    TaskView(taskType, params);
  };

  const labelText = isPractice
    ? t('tv_practice_hud', { task: taskType.toUpperCase().replace('-', ' · ') })
    : taskType.toUpperCase().replace('-', ' · ');

  const skipText = isPractice
    ? t('tv_practice_hud_end')
    : t('tv_skip', { default: 'Skip Section ⤑' });

  const trialText = isPractice
    ? `${t('tv_practice_hud_trial')} 1 / 3`
    : 'TRIAL 1';

  render(`
    <div class="view task-view" id="task-view">
      <!-- HUD -->
      <div class="task-hud">
        <div class="hud-left">
          <div class="hud-label">${labelText}</div>
          <div class="hud-progress-wrap">
            <div class="hud-progress-bar" id="hud-bar" style="width:0%"></div>
          </div>
        </div>
        <div class="hud-right">
          <button id="task-skip-btn" class="hud-skip-btn">${skipText}</button>
          <div class="hud-stats">
             <span id="hud-trial">${trialText}</span>
             <span class="hud-sep">/</span>
             <span id="hud-acc">ACC: 0%</span>
          </div>
        </div>
      </div>

      <!-- Feedback Overlay — single source of truth for ✓/✗ -->
      <div id="feedback-overlay" class="feedback-overlay"></div>

      <!-- Countdown -->
      <div class="countdown-wrap" id="countdown-wrap">
        <div class="countdown-word" id="countdown-word">READY</div>
      </div>

      <!-- Canvas -->
      <div class="stim-wrap" id="stim-wrap" style="display:none;">
        <div class="stim-canvas" id="stim-canvas"></div>
      </div>

      <!-- Response buttons -->
      <div class="task-response" id="task-response" style="display:none;">
        ${!isANT ? `
          <button class="resp-btn same-btn" id="btn-same">${t('key_same').toUpperCase()} <span class="resp-key">S</span></button>
          <button class="resp-btn diff-btn" id="btn-diff">${t('key_diff').toUpperCase()} <span class="resp-key">D</span></button>
        ` : `
          <button class="resp-btn left-btn" id="btn-left">← ${t('key_left').toUpperCase()} <span class="resp-key">←</span></button>
          <button class="resp-btn right-btn" id="btn-right">${t('key_right').toUpperCase()} → <span class="resp-key">→</span></button>
        `}
      </div>

      <!-- Practice Completion Overlay -->
      <div id="practice-complete-overlay" class="legal-modal-overlay" style="display:none; z-index:3000; justify-content:center; align-items:center;">
        <div class="legal-modal-card glass-card practice-complete-card">
          <div class="modal-mesh-glow"></div>
          <h3 class="practice-complete-title">${t('tv_practice_done_title')}</h3>
          <p class="practice-complete-text">${t('tv_practice_done_text')}</p>
          <button id="btn-start-real" class="btn-volt practice-complete-btn">${t('tv_practice_done_btn')}</button>
        </div>
      </div>

    </div>
  `);

  injectStyle(`
    .task-view { position:fixed; inset:0; background:#000; overflow:hidden; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .task-hud { position:fixed; top:0; left:0; right:0; display:flex; justify-content:space-between; align-items:center; padding:16px 32px; background:rgba(8,8,9,0.95); border-bottom:1px solid rgba(255,255,255,0.05); z-index:2000; }
    .hud-left { display:flex; align-items:center; gap:24px; flex:1; }
    .hud-label { font-family:var(--font-mono); font-size:11px; color:#5a5a5f; letter-spacing:0.15em; font-weight:700; }
    .hud-progress-wrap { flex:1; max-width:260px; height:2px; background:rgba(255,255,255,0.05); border-radius:99px; }
    .hud-progress-bar { height:100%; background:var(--accent-volt); box-shadow:0 0 10px var(--accent-volt-dim); transition:width 0.3s; }
    .hud-right { display:flex; align-items:center; gap:24px; }
    .hud-stats { display:flex; gap:12px; font-family:var(--font-mono); font-size:11px; color:#5a5a5f; }
    .hud-skip-btn { position:relative; z-index:2010; pointer-events:auto; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); color:#fff; font-family:var(--font-mono); font-size:10px; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; }
    .hud-skip-btn:hover { border-color:var(--accent-volt); color:var(--accent-volt); }
    .hud-skip-btn:active { transform:scale(0.95); background:rgba(255,255,255,0.1); }
    .feedback-overlay { position:fixed; inset:0; z-index:500; pointer-events:none; display:flex; align-items:center; justify-content:center; }
    .f-tick { font-size:18vmin; font-weight:900; font-family:var(--font-display); animation: fPop 0.5s ease-out forwards; }
    .f-tick.correct { color:#b8f400; text-shadow:0 0 60px rgba(184,244,0,0.4); }
    .f-tick.wrong   { color:#ff4d4d; text-shadow:0 0 60px rgba(255,77,77,0.4); }
    @keyframes fPop { 0%{opacity:0;transform:scale(0.4)} 40%{opacity:1;transform:scale(1.05)} 100%{opacity:0;transform:scale(1)} }
    .countdown-wrap { position:fixed; inset:0; z-index:1100; background:#000; display:flex; align-items:center; justify-content:center; }
    .countdown-word { font-family:var(--font-display); font-size:6rem; font-weight:700; letter-spacing:0.2em; }
    .countdown-word.go { color:var(--accent-volt); }
    .stim-canvas {
      position: relative;
      width: 72vmin;
      height: 72vmin;
      max-width: 720px;
      max-height: 720px;
      min-width: 320px;
      min-height: 320px;
    }
    .task-fixation { color:#fff; opacity:0.2; font-size:6vmin; font-family:var(--font-mono); position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); }
    .task-response { position:fixed; bottom:60px; display:flex; gap:30px; z-index:100; }
    .resp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; position:relative; padding:18px 40px; font-family:var(--font-body); font-weight:700; font-size:13px; background:transparent; border:1px solid rgba(255,255,255,0.1); color:#fff; cursor:pointer; transition:0.2s; }
    .resp-btn:hover { border-color:var(--accent-volt); color:var(--accent-volt); transform:translateY(-2px); }
    .resp-key {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 10px;
      font-family: var(--font-mono);
      color: #8a8a93;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
      vertical-align: middle;
      line-height: 1;
    }
    .dist-legend-fixed { position:fixed; top:80px; display:flex; gap:20px; font-family:var(--font-mono); font-size:10px; color:#5a5a5f; }
    .leg-dot { width:8px; height:8px; display:inline-block; margin-right:6px; border-radius:1px; }

    /* Premium Practice Complete Modal styling */
    .legal-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(4, 4, 5, 0.85);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 3000;
      padding: 24px;
    }
    .practice-complete-card {
      max-width: 440px;
      width: 100%;
      text-align: center;
      padding: 48px 36px;
      background: rgba(14, 14, 16, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      box-shadow: 0 40px 100px rgba(0, 0, 0, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      position: relative;
      overflow: hidden;
      animation: modal-zoom 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes modal-zoom {
      0% { opacity: 0; transform: scale(0.96) translateY(16px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-mesh-glow {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle at center, rgba(212, 255, 0, 0.04) 0%, transparent 60%);
      pointer-events: none;
      z-index: 0;
    }
    .practice-complete-title {
      font-family: var(--font-display);
      font-size: 2.2rem;
      font-style: italic;
      font-weight: 600;
      color: var(--accent-volt);
      text-shadow: 0 0 30px rgba(212, 255, 0, 0.2);
      margin-top: 0;
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .practice-complete-text {
      font-family: var(--font-body);
      font-size: 0.95rem;
      color: var(--text-secondary);
      line-height: 1.65;
      margin-bottom: 36px;
      position: relative;
      z-index: 1;
    }
    .practice-complete-btn {
      width: 100%;
      padding: 16px 24px;
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      position: relative;
      z-index: 1;
    }
  `);

  if (isANT) {
    runANT($('#countdown-wrap'), $('#countdown-word'), $('#stim-wrap'), $('#stim-canvas'),
           $('#task-response'), $('#hud-trial'), $('#hud-acc'), $('#hud-bar'),
           $('#task-skip-btn'), $('#feedback-overlay'), isPractice, onPracticeComplete);
  } else {
    runVWM(taskType, isDistractor,
           $('#countdown-wrap'), $('#countdown-word'), $('#stim-wrap'), $('#stim-canvas'),
           $('#task-response'), $('#hud-trial'), $('#hud-acc'), $('#hud-bar'),
           isDistractor ? $('#dist-legend') : null, $('#task-skip-btn'), $('#feedback-overlay'), isPractice, onPracticeComplete);
  }
}

/* ---------------------------------------------------------- */
function runVWM(taskType, isDistractor, cdWrap, cdWord, stimWrap, canvas,
                responseArea, hudTrial, hudAcc, hudBar, legendEl, skipBtn, fbOverlay, isPractice, onPracticeComplete) {

  const engine = new TaskEngine({ taskType, withDistractors: isDistractor, isPractice });
  let dead = false;
  let correct = 0, total = 0;

  function cleanup() {
    dead = true;
    engine.running = false;
    document.removeEventListener('keydown', onKey);
  }

  // SKIP: kill engine + save metadata + navigate directly — no engine promise unwinding
  function doSkip(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (dead) return;
    
    skipBtn.textContent = t('tv_skipping', { default: 'SKIPPING...' });
    skipBtn.style.color = 'var(--accent-volt)';
    skipBtn.style.borderColor = 'var(--accent-volt)';
    
    engine.skip(); // ensure internal timers are canceled!
    cleanup();

    if (isPractice) {
      setTimeout(() => {
        const overlay = $('#practice-complete-overlay');
        if (overlay) {
          overlay.style.display = 'flex';
          $('#btn-start-real').onclick = onPracticeComplete;
        }
      }, 50);
    } else {
      const skippedAt = Date.now();
      const session = Storage.getCurrentSession();
      if (session) {
        if (!session.metadata) session.metadata = {};
        if (!session.metadata.skips) session.metadata.skips = {};
        session.metadata.skips[taskType] = skippedAt;
        Storage.saveCurrentSession(session);
      }
      
      // Slight timeout just to ensure DOM/React routing doesn't conflict
      setTimeout(() => {
        if (taskType === 'vwm-pure') navigate('transition', { next: 'vwm-distractor' });
        else navigate('transition', { next: 'ant' });
      }, 50);
    }
  }
  skipBtn.onclick = doSkip;
  skipBtn.ontouchstart = doSkip;

  function onKey(e) {
    if (dead) return;
    if (e.key.toLowerCase() === 's') engine.respond('same');
    if (e.key.toLowerCase() === 'd') engine.respond('different');
  }
  document.addEventListener('keydown', onKey);

  $('#btn-same').addEventListener('click', () => { if (!dead) engine.respond('same'); });
  $('#btn-diff').addEventListener('click', () => { if (!dead) engine.respond('different'); });

  engine.onCountdown = (word, cls) => {
    cdWrap.style.display = 'flex'; stimWrap.style.display = 'none'; responseArea.style.display = 'none';
    cdWord.textContent = word; cdWord.className = `countdown-word ${cls}`;
  };

  engine.onPhase = (phase, meta) => {
    cdWrap.style.display = 'none'; stimWrap.style.display = 'flex';
    responseArea.style.display = (phase === 'probe') ? 'flex' : 'none';

    hudBar.style.width = `${Math.min(100, (meta.trialNum / engine.maxTrials) * 100)}%`;
    hudTrial.textContent = isPractice
      ? `${t('tv_practice_hud_trial')} ${meta.trialNum + 1} / 3`
      : `TRIAL ${meta.trialNum + 1}`;
  };

  engine.onTrial = (record) => {
    total++; if (record.isCorrect) correct++;
    hudAcc.textContent = `ACC: ${Math.round((correct / total) * 100)}%`;
    fbOverlay.innerHTML = `<div class="f-tick ${record.isCorrect ? 'correct' : 'wrong'}">${record.isCorrect ? '✓' : '✗'}</div>`;
    
    if (!isPractice) {
      const session = Storage.getCurrentSession();
      if (session) { session.trials.push(record); Storage.saveCurrentSession(session); }
    }
  };

  engine.onDone = () => {
    if (dead) return;  // skip already navigated — do NOT navigate again
    cleanup();
    if (isPractice) {
      const overlay = $('#practice-complete-overlay');
      if (overlay) {
        overlay.style.display = 'flex';
        $('#btn-start-real').onclick = onPracticeComplete;
      }
    } else {
      if (taskType === 'vwm-pure') navigate('transition', { next: 'vwm-distractor' });
      else navigate('transition', { next: 'ant' });
    }
  };

  engine.run(canvas);
}

/* ---------------------------------------------------------- */
function runANT(cdWrap, cdWord, stimWrap, canvas, responseArea,
                hudTrial, hudAcc, hudBar, skipBtn, fbOverlay, isPractice, onPracticeComplete) {

  const engine = new ANTEngine(isPractice);
  let dead = false;
  let correct = 0, total = 0;

  function cleanup() {
    dead = true;
    engine.isRunning = false;
    document.removeEventListener('keydown', onKey);
  }

  // SKIP: kill engine + save metadata + navigate directly
  function doSkip(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (dead) return;
    
    skipBtn.textContent = t('tv_skipping', { default: 'SKIPPING...' });
    skipBtn.style.color = 'var(--accent-volt)';
    skipBtn.style.borderColor = 'var(--accent-volt)';
    
    engine.skip(); // ensure internal timers are canceled!
    cleanup();

    if (isPractice) {
      setTimeout(() => {
        const overlay = $('#practice-complete-overlay');
        if (overlay) {
          overlay.style.display = 'flex';
          $('#btn-start-real').onclick = onPracticeComplete;
        }
      }, 50);
    } else {
      const skippedAt = Date.now();
      const session = Storage.getCurrentSession();
      if (session) {
        if (!session.metadata) session.metadata = {};
        if (!session.metadata.skips) session.metadata.skips = {};
        session.metadata.skips['ant'] = skippedAt;
        Storage.saveCurrentSession(session);
      }
      setTimeout(() => navigate('complete'), 50);
    }
  }
  skipBtn.onclick = doSkip;
  skipBtn.ontouchstart = doSkip;

  function onKey(e) {
    if (dead) return;
    if (e.key === 'ArrowLeft')  engine.handleResponse('left');
    if (e.key === 'ArrowRight') engine.handleResponse('right');
  }
  document.addEventListener('keydown', onKey);

  $('#btn-left').addEventListener('click',  () => { if (!dead) engine.handleResponse('left'); });
  $('#btn-right').addEventListener('click', () => { if (!dead) engine.handleResponse('right'); });

  engine.onCountdown = (word, cls) => {
    cdWrap.style.display = 'flex'; stimWrap.style.display = 'none'; responseArea.style.display = 'none';
    cdWord.textContent = word; cdWord.className = `countdown-word ${cls}`;
  };

  engine.onStateChange = (state, data) => {
    cdWrap.style.display = 'none'; stimWrap.style.display = 'flex';
    responseArea.style.display = (state === 'target') ? 'flex' : 'none';
    hudBar.style.width  = `${(data.trialIndex / data.totalTrials) * 100}%`;
    hudTrial.textContent = isPractice
      ? `${t('tv_practice_hud_trial')} ${data.trialIndex + 1} / 3`
      : `TRIAL ${data.trialIndex + 1}`;
  };

  engine.onTrialComplete = (record) => {
    total++; if (record.isCorrect) correct++;
    hudAcc.textContent = `ACC: ${Math.round((correct / total) * 100)}%`;
    fbOverlay.innerHTML = `<div class="f-tick ${record.isCorrect ? 'correct' : 'wrong'}">${record.isCorrect ? '✓' : '✗'}</div>`;
    
    if (!isPractice) {
      const session = Storage.getCurrentSession();
      if (session) { session.trials.push(record); Storage.saveCurrentSession(session); }
    }
  };

  engine.onTaskComplete = () => {
    if (dead) return;  // skip already navigated
    cleanup();
    if (isPractice) {
      const overlay = $('#practice-complete-overlay');
      if (overlay) {
        overlay.style.display = 'flex';
        $('#btn-start-real').onclick = onPracticeComplete;
      }
    } else {
      navigate('complete');
    }
  };

  engine.run(canvas);
}
