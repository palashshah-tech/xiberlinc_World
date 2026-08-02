/* ============================================================
   ghostEngine.js — Async Ghost Match Challenge System
   Allows fans to play directly against telemetry/ghost data of top players
   ============================================================ */

export function startGhostMatch(opponentPlayer, mode = 'Reflex Vault') {
  let modal = document.getElementById('ghost-match-modal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'ghost-match-modal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(4, 4, 7, 0.94); backdrop-filter: blur(16px);
    display: flex; align-items: center; justify-content: center;
    padding: 24px; animation: fade-in 0.3s ease-out;
  `;

  let playerTrial = 0;
  let maxTrials = 10;
  let playerReactionTimeSum = 0;
  let ghostReactionTimeMs = opponentPlayer.reactionMs || 185;

  modal.innerHTML = `
    <div style="
      width: 100%; max-width: 640px; background: rgba(13, 13, 20, 0.96);
      border: 1px solid rgba(212, 255, 0, 0.35); border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.9), 0 0 40px rgba(212,255,0,0.15);
      padding: 28px; color: #fff; position: relative; overflow: hidden;
    ">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:16px; margin-bottom:20px;">
        <div>
          <div style="font-family:'Space Grotesk', sans-serif; font-size:11px; color:#d4ff00; letter-spacing:0.1em; text-transform:uppercase;">
            ⚡ ASYNC GHOST RIVALRY &middot; ${mode}
          </div>
          <h2 style="font-family:'Outfit', sans-serif; font-size:22px; font-weight:800; margin:4px 0 0 0; color:#fff;">
            Challenging Ghost Telemetry
          </h2>
        </div>
        <button id="ghost-close-btn" style="background:transparent; border:none; color:rgba(255,255,255,0.5); font-size:24px; cursor:pointer;">&times;</button>
      </div>

      <!-- Matchup Display -->
      <div style="display:grid; grid-template-columns:1fr auto 1fr; gap:16px; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:16px; margin-bottom:20px;">
        <!-- You -->
        <div style="text-align:center;">
          <div style="width:48px; height:48px; border-radius:50%; background:rgba(212,255,0,0.2); border:2px solid #d4ff00; display:flex; align-items:center; justify-content:center; margin:0 auto 8px; font-family:'Outfit', sans-serif; font-weight:800; color:#d4ff00;">YOU</div>
          <div style="font-family:'Outfit', sans-serif; font-weight:700; font-size:14px;">You (Live)</div>
          <div id="ghost-player-rt" style="font-family:'JetBrains Mono', monospace; font-size:12px; color:rgba(255,255,255,0.6); margin-top:2px;">RT: Ready</div>
        </div>

        <!-- VS Badge -->
        <div style="font-family:'Outfit', sans-serif; font-weight:900; font-size:18px; color:rgba(255,255,255,0.3); letter-spacing:0.05em;">VS</div>

        <!-- Ghost Target -->
        <div style="text-align:center;">
          <div style="width:48px; height:48px; border-radius:50%; background:${opponentPlayer.avatarColor || '#7c3aed'}33; border:2px solid ${opponentPlayer.avatarColor || '#7c3aed'}; display:flex; align-items:center; justify-content:center; margin:0 auto 8px; font-family:'Outfit', sans-serif; font-weight:800; color:${opponentPlayer.avatarColor || '#7c3aed'};">
            ${opponentPlayer.avatar || opponentPlayer.name?.[0] || 'G'}
          </div>
          <div style="font-family:'Outfit', sans-serif; font-weight:700; font-size:14px; color:#fff;">
            ${opponentPlayer.name} <span style="font-size:10px; opacity:0.6;">(Ghost)</span>
          </div>
          <div style="font-family:'JetBrains Mono', monospace; font-size:12px; color:${opponentPlayer.avatarColor || '#a78bfa'}; margin-top:2px;">
            Telemetry RT: ${ghostReactionTimeMs}ms
          </div>
        </div>
      </div>

      <!-- Live Trial Interactive Box -->
      <div id="ghost-trial-box" style="background:rgba(0,0,0,0.5); border:1px solid rgba(212,255,0,0.25); border-radius:14px; height:180px; display:flex; flex-direction:column; align-items:center; justify-content:center; position:relative; cursor:pointer; overflow:hidden; transition:all 0.2s;">
        <div id="ghost-instruction-text" style="font-family:'Outfit', sans-serif; font-size:16px; font-weight:700; color:#ffffff; text-align:center; padding:0 20px;">
          Click "Start Match" to measure your reflex against ${opponentPlayer.name}'s recorded telemetry.
        </div>
        <button id="ghost-start-btn" style="margin-top:16px; background:#d4ff00; color:#000; font-family:'Space Grotesk', sans-serif; font-weight:700; font-size:13px; border:none; padding:10px 24px; border-radius:8px; cursor:pointer;">
          Start Ghost Match &rarr;
        </button>
      </div>

      <!-- Telemetry Live Status -->
      <div id="ghost-status-bar" style="margin-top:16px; display:flex; justify-content:space-between; align-items:center; font-family:'JetBrains Mono', monospace; font-size:11px; color:rgba(255,255,255,0.5);">
        <span>Trial: <strong id="ghost-trial-num" style="color:#fff;">0 / 10</strong></span>
        <span>Ghost Differential: <strong id="ghost-diff" style="color:#d4ff00;">0ms</strong></span>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('ghost-close-btn').addEventListener('click', () => modal.remove());

  const trialBox = document.getElementById('ghost-trial-box');
  const startBtn = document.getElementById('ghost-start-btn');
  const instructionText = document.getElementById('ghost-instruction-text');
  const trialNumEl = document.getElementById('ghost-trial-num');
  const diffEl = document.getElementById('ghost-diff');
  const playerRtEl = document.getElementById('ghost-player-rt');

  let state = 'idle';
  let stimulusStartTime = 0;

  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startBtn.style.display = 'none';
    nextTrial();
  });

  function nextTrial() {
    if (playerTrial >= maxTrials) {
      finishMatch();
      return;
    }

    state = 'waiting';
    trialBox.style.background = 'rgba(0,0,0,0.5)';
    instructionText.textContent = 'Wait for FLASH...';
    instructionText.style.color = 'rgba(255,255,255,0.7)';

    const delay = 1500 + Math.random() * 2000;
    setTimeout(() => {
      if (state !== 'waiting') return;
      state = 'stimulus';
      stimulusStartTime = performance.now();
      trialBox.style.background = 'rgba(212,255,0,0.2)';
      trialBox.style.borderColor = '#d4ff00';
      instructionText.textContent = 'CLICK NOW!';
      instructionText.style.color = '#d4ff00';
    }, delay);
  }

  trialBox.addEventListener('click', () => {
    if (state === 'waiting') {
      instructionText.textContent = 'Too early! Penalty +100ms';
      state = 'idle';
      playerReactionTimeSum += 500;
      playerTrial++;
      trialNumEl.textContent = `${playerTrial} / ${maxTrials}`;
      setTimeout(nextTrial, 1000);
    } else if (state === 'stimulus') {
      const rt = Math.round(performance.now() - stimulusStartTime);
      state = 'idle';
      playerReactionTimeSum += rt;
      playerTrial++;
      
      const avgPlayerRt = Math.round(playerReactionTimeSum / playerTrial);
      const diff = avgPlayerRt - ghostReactionTimeMs;
      
      playerRtEl.textContent = `RT: ${avgPlayerRt}ms`;
      trialNumEl.textContent = `${playerTrial} / ${maxTrials}`;
      
      if (diff < 0) {
        diffEl.style.color = '#34d399';
        diffEl.textContent = `${Math.abs(diff)}ms FASTER`;
      } else {
        diffEl.style.color = '#f87171';
        diffEl.textContent = `${diff}ms SLOWER`;
      }

      instructionText.textContent = `Trial ${playerTrial}: ${rt}ms!`;
      instructionText.style.color = '#ffffff';
      setTimeout(nextTrial, 800);
    }
  });

  function finishMatch() {
    const avgRt = Math.round(playerReactionTimeSum / maxTrials);
    const win = avgRt <= ghostReactionTimeMs;

    trialBox.style.background = win ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)';
    trialBox.style.borderColor = win ? '#34d399' : '#f87171';

    instructionText.innerHTML = `
      <div style="font-size:22px; font-weight:900; color:${win ? '#34d399' : '#f87171'}; margin-bottom:6px;">
        ${win ? 'VICTORY! GHOST DEFEATED' : 'MATCH COMPLETE'}
      </div>
      <div style="font-size:13px; color:rgba(255,255,255,0.8); line-height:1.5;">
        Your Average RT: <strong>${avgRt}ms</strong> vs Ghost RT: <strong>${ghostReactionTimeMs}ms</strong><br/>
        <span style="color:#d4ff00; font-family:'JetBrains Mono', monospace; font-size:11px;">+250 Battle Pass XP &middot; Ghost Rivalry Points Unlocked</span>
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
