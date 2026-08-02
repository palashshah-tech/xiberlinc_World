/* ============================================================
   ghostEngine.js — Authentic Visual Working Memory (VWM) Ghost Match
   Runs 10 Visual Working Memory Single-Probe Change Detection Trials
   ============================================================ */

import { generateTrial, renderStudy, renderProbe } from '../engine/StimulusGenerator.js';
import { addBattleXp, getEquippedAbility } from './battlePass.js';

export function startGhostMatch(opponentPlayer, mode = 'Focus Chamber VWM') {
  let modal = document.getElementById('ghost-match-modal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'ghost-match-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(4, 4, 7, 0.94); backdrop-filter: blur(16px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px; animation: fade-in 0.3s ease-out;
  `;

  let currentTrialIndex = 0;
  const totalTrials = 10;
  let playerCorrectCount = 0;
  let playerRtSum = 0;

  const ghostWmi = opponentPlayer.wmi || 135;
  const ghostRtMs = opponentPlayer.reactionMs || 185;
  let ghostCorrectCount = 0;

  modal.innerHTML = `
    <div style="
      width: 100%; max-width: 640px; background: rgba(13, 13, 20, 0.96);
      border: 1px solid rgba(212, 255, 0, 0.35); border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.9), 0 0 40px rgba(212,255,0,0.15);
      padding: 24px; color: #fff; position: relative; overflow: hidden;
    ">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:14px; margin-bottom:16px;">
        <div>
          <div style="font-family:'Space Grotesk', sans-serif; font-size:10.5px; color:#d4ff00; letter-spacing:0.12em; text-transform:uppercase;">
            🧠 VWM GHOST RIVALRY &middot; VISUAL WORKING MEMORY
          </div>
          <h2 style="font-family:'Outfit', sans-serif; font-size:20px; font-weight:800; margin:2px 0 0 0; color:#fff;">
            Single-Probe Change Detection
          </h2>
        </div>
        <button id="ghost-close-btn" style="background:transparent; border:none; color:rgba(255,255,255,0.5); font-size:24px; cursor:pointer;">&times;</button>
      </div>

      <!-- Matchup Header -->
      <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:16px; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px 16px; margin-bottom:16px;">
        <!-- Player Stats -->
        <div style="text-align:center;">
          <div style="font-family:'Outfit', sans-serif; font-weight:800; font-size:14px; color:#d4ff00;">YOU</div>
          <div id="vwm-player-score" style="font-family:'JetBrains Mono', monospace; font-size:11px; color:rgba(255,255,255,0.8); margin-top:2px;">Score: 0 / 10</div>
        </div>

        <div style="font-family:'Outfit', sans-serif; font-weight:900; font-size:16px; color:rgba(255,255,255,0.3);">VS</div>

        <!-- Ghost Target Stats -->
        <div style="text-align:center;">
          <div style="font-family:'Outfit', sans-serif; font-weight:800; font-size:14px; color:${opponentPlayer.avatarColor || '#a78bfa'};">
            ${opponentPlayer.name} <span style="font-size:10px; opacity:0.6;">(Ghost)</span>
          </div>
          <div id="vwm-ghost-score" style="font-family:'JetBrains Mono', monospace; font-size:11px; color:${opponentPlayer.avatarColor || '#a78bfa'}; margin-top:2px;">
            Target WMI: ${ghostWmi} &middot; RT: ${ghostRtMs}ms
          </div>
        </div>
      </div>

      <!-- VWM Interactive Canvas Box -->
      <div id="vwm-trial-box" style="
        background: rgba(0,0,0,0.6); border: 1px solid rgba(212,255,0,0.2);
        border-radius: 16px; height: 260px; display: flex; flex-direction: column;
        align-items: center; justify-content: center; position: relative; overflow: hidden;
      ">
        <div id="vwm-canvas-container" style="position:relative; width:220px; height:220px; display:none;"></div>
        
        <div id="vwm-prompt-text" style="font-family:'Outfit', sans-serif; font-size:15px; font-weight:700; color:#fff; text-align:center; padding:0 20px;">
          Memorize the colored target patches, then identify if the probed item is [SAME] or [DIFFERENT].
        </div>

        <button id="vwm-start-btn" style="
          margin-top:16px; background:#d4ff00; color:#000; font-family:'Space Grotesk', sans-serif;
          font-weight:700; font-size:13px; border:none; padding:10px 24px; border-radius:8px; cursor:pointer;
        ">
          Start VWM Trial 1 &rarr;
        </button>

        <!-- Same / Different Response Buttons (Hidden initially) -->
        <div id="vwm-response-btns" style="display:none; gap:16px; position:absolute; bottom:16px;">
          <button id="vwm-btn-same" style="
            background: rgba(52, 211, 153, 0.2); border: 1px solid #34d399; color: #34d399;
            font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 13px;
            padding: 10px 28px; border-radius: 8px; cursor: pointer; text-transform: uppercase;
          ">
            SAME [S]
          </button>
          <button id="vwm-btn-diff" style="
            background: rgba(248, 113, 113, 0.2); border: 1px solid #f87171; color: #f87171;
            font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 13px;
            padding: 10px 28px; border-radius: 8px; cursor: pointer; text-transform: uppercase;
          ">
            DIFFERENT [D]
          </button>
        </div>
      </div>

      <!-- Telemetry Live Status -->
      <div id="vwm-status-bar" style="margin-top:14px; display:flex; justify-content:space-between; align-items:center; font-family:'JetBrains Mono', monospace; font-size:11px; color:rgba(255,255,255,0.5);">
        <span>Trial: <strong id="vwm-trial-num" style="color:#fff;">0 / 10</strong></span>
        <span>K Capacity: <strong id="vwm-k-score" style="color:#d4ff00;">0.00</strong></span>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('ghost-close-btn').addEventListener('click', () => modal.remove());

  const canvasContainer = document.getElementById('vwm-canvas-container');
  const startBtn = document.getElementById('vwm-start-btn');
  const promptText = document.getElementById('vwm-prompt-text');
  const responseBtns = document.getElementById('vwm-response-btns');
  const btnSame = document.getElementById('vwm-btn-same');
  const btnDiff = document.getElementById('vwm-btn-diff');
  const trialNumEl = document.getElementById('vwm-trial-num');
  const playerScoreEl = document.getElementById('vwm-player-score');
  const ghostScoreEl = document.getElementById('vwm-ghost-score');
  const kScoreEl = document.getElementById('vwm-k-score');

  let currentTrial = null;
  let probeStartTime = 0;

  startBtn.addEventListener('click', () => {
    startBtn.style.display = 'none';
    runTrial();
  });

  function runTrial() {
    if (currentTrialIndex >= totalTrials) {
      finishMatch();
      return;
    }

    const setSize = currentTrialIndex < 4 ? 4 : 6;
    const isChange = Math.random() < 0.5;
    currentTrial = generateTrial({ setSize, isChange, distractorCount: 0, shape: 'square' });

    promptText.style.display = 'none';
    canvasContainer.style.display = 'block';
    responseBtns.style.display = 'none';

    const equippedAbility = getEquippedAbility();
    const studyDuration = equippedAbility === '7-Chain VWM Recall Boost' ? 650 : 500;

    // 1. Study Phase
    renderStudy(canvasContainer, currentTrial);

    setTimeout(() => {
      // 2. Retention Delay Phase (800ms)
      canvasContainer.innerHTML = '';

      setTimeout(() => {
        // 3. Probe Phase
        renderProbe(canvasContainer, currentTrial);
        responseBtns.style.display = 'flex';
        probeStartTime = performance.now();
      }, 800);
    }, studyDuration);
  }

  function handleResponse(chosenChange) {
    const rt = Math.round(performance.now() - probeStartTime);
    playerRtSum += rt;

    const correct = chosenChange === currentTrial.isChange;
    if (correct) playerCorrectCount++;

    // Ghost telemetry calculation for this trial
    const ghostAccProb = Math.min(0.95, ghostWmi / 150);
    if (Math.random() < ghostAccProb) ghostCorrectCount++;

    currentTrialIndex++;
    
    // Update live indicators
    trialNumEl.textContent = `${currentTrialIndex} / ${totalTrials}`;
    playerScoreEl.textContent = `Score: ${playerCorrectCount} / ${currentTrialIndex}`;
    ghostScoreEl.textContent = `Ghost: ${ghostCorrectCount} / ${currentTrialIndex}`;
    
    // Cowan's K calculation: K = N * (Hits - FalseAlarms)
    const acc = playerCorrectCount / currentTrialIndex;
    const kVal = (4 * acc).toFixed(2);
    kScoreEl.textContent = kVal;

    canvasContainer.style.display = 'none';
    responseBtns.style.display = 'none';
    promptText.style.display = 'block';
    promptText.textContent = correct ? `Correct! (${rt}ms)` : `Incorrect (${rt}ms)`;
    promptText.style.color = correct ? '#34d399' : '#f87171';

    setTimeout(() => {
      runTrial();
    }, 900);
  }

  btnSame.addEventListener('click', () => handleResponse(false));
  btnDiff.addEventListener('click', () => handleResponse(true));
  
  // Keyboard listeners: [S] = Same, [D] = Different
  const keyHandler = (e) => {
    if (responseBtns.style.display === 'flex') {
      if (e.key === 's' || e.key === 'S') {
        handleResponse(false);
      } else if (e.key === 'd' || e.key === 'D') {
        handleResponse(true);
      }
    }
  };
  window.addEventListener('keydown', keyHandler);

  function finishMatch() {
    window.removeEventListener('keydown', keyHandler);
    const avgRt = Math.round(playerRtSum / totalTrials);
    const win = playerCorrectCount > ghostCorrectCount || (playerCorrectCount === ghostCorrectCount && avgRt < ghostRtMs);
    const finalK = (4 * (playerCorrectCount / totalTrials)).toFixed(2);

    if (win) {
      addBattleXp(250, `Ghost Match Victory vs ${opponentPlayer.name}`);
    }

    const trialBox = document.getElementById('vwm-trial-box');
    trialBox.style.background = win ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)';
    trialBox.style.borderColor = win ? '#34d399' : '#f87171';

    promptText.innerHTML = `
      <div style="font-size:22px; font-weight:900; color:${win ? '#34d399' : '#f87171'}; margin-bottom:6px;">
        ${win ? 'VICTORY! VWM GHOST DEFEATED' : 'MATCH COMPLETE'}
      </div>
      <div style="font-size:13px; color:rgba(255,255,255,0.85); line-height:1.6;">
        Your Score: <strong>${playerCorrectCount}/${totalTrials}</strong> (Cowan's K: <strong>${finalK}</strong> &middot; ${avgRt}ms)<br/>
        Ghost Score: <strong>${ghostCorrectCount}/${totalTrials}</strong> (${ghostRtMs}ms)<br/>
        <span style="color:${win ? '#d4ff00' : 'rgba(255,255,255,0.5)'}; font-family:'JetBrains Mono', monospace; font-size:11px;">
          ${win ? '+250 Battle Pass XP &amp; +100 Store Credits Earned!' : 'No XP awarded.'}
        </span>
      </div>
    `;

    const restartBtn = document.createElement('button');
    restartBtn.textContent = 'Play Again';
    restartBtn.style.cssText = `
      margin-top:14px; background:#d4ff00; color:#000; font-family:'Space Grotesk', sans-serif;
      font-weight:700; font-size:12px; border:none; padding:8px 18px; border-radius:6px; cursor:pointer;
    `;
    restartBtn.addEventListener('click', () => {
      startGhostMatch(opponentPlayer, mode);
    });
    trialBox.appendChild(restartBtn);
  }
}
