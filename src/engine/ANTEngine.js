/* ============================================================
   ANT Engine — Attention Network Test
   ============================================================ */

import { now } from '../utils/timing.js';
import { t } from '../utils/i18n.js';

const ANT_CONFIG = {
  cueTypes: ['none', 'center', 'double', 'spatial'],
  flankerTypes: ['congruent', 'incongruent'],
  targetPositions: ['above', 'below'],
  fixationDuration: { min: 400, max: 1200 },
  cueDuration: 100,
  postCueFixation: 200,   
  maxResponseTime: 1200,  
  postTrialDuration: 400,
  countdownDuration: 600,
  trialsPerCondition: 4,   
};

const ARROWS = { left: '←', right: '→' };

function getArrowHTML(direction, isTarget) {
  const flipStyle = direction === 'right' ? 'transform: scaleX(-1);' : '';
  const c = 'rgba(255, 255, 255, 0.85)';

  // Archery arrow matching the user's exact SVG layout (1200x300 viewBox)
  // Transparent gaps are used for the decorative rings so it works on any background color.
  return `
    <svg viewBox="0 0 1200 300" class="ant-arrow" style="width:14vmin;height:3.5vmin;${flipStyle}display:inline-block;overflow:visible;color:${c};">
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
    </svg>
  `;
}

export class ANTEngine {
  constructor(isPractice = false) {
    this.isPractice = isPractice;
    this.trialData = [];
    this.currentTrialIndex = 0;
    this.isRunning = false;
    this.skippedAt = null;
    this._resolveResponse = null;
    this._timerId = null;
    this._timerResolve = null;
    this.responseStartTime = 0;
    this._finished = false;  // guard: onTaskComplete fires exactly once
    this.onStateChange = null;
    this.onTrialComplete = null;
    this.onTaskComplete = null;
    this.onCountdown = null;
  }

  async _wait(ms) {
    if (!this.isRunning) return;
    return new Promise(resolve => {
      this._timerResolve = resolve;
      this._timerId = setTimeout(() => {
        this._timerResolve = null;
        resolve();
      }, ms);
    });
  }

  skip() {
    this.skippedAt = Date.now();
    this.isRunning = false;
    if (this._resolveResponse) {
      this._resolveResponse('none');
      this._resolveResponse = null;
    }
    if (this._timerResolve) {
      clearTimeout(this._timerId);
      this._timerResolve();
      this._timerResolve = null;
    }
  }

  async run(container) {
    this.container = container;
    this.isRunning = true;
    const trials = this.generateTrials();

    await this.showCountdown();
    if (!this.isRunning) { this.finish(); return; }

    for (this.currentTrialIndex = 0; this.currentTrialIndex < trials.length; this.currentTrialIndex++) {
      if (!this.isRunning) break;
      await this.runTrial(trials[this.currentTrialIndex], trials.length);
    }
    this.finish();
  }

  finish() {
    if (this._finished) return;  // prevent double-fire
    this._finished = true;
    this.isRunning = false;
    if (this.onTaskComplete) this.onTaskComplete(this.trialData, this.skippedAt);
  }

  generateTrials() {
    if (this.isPractice) {
      return [
        {
          cueType: 'center',
          flankerType: 'congruent',
          targetDirection: Math.random() < 0.5 ? 'left' : 'right',
          targetPosition: Math.random() < 0.5 ? 'above' : 'below',
        },
        {
          cueType: 'double',
          flankerType: 'incongruent',
          targetDirection: Math.random() < 0.5 ? 'left' : 'right',
          targetPosition: Math.random() < 0.5 ? 'above' : 'below',
        },
        {
          cueType: 'spatial',
          flankerType: 'congruent',
          targetDirection: Math.random() < 0.5 ? 'left' : 'right',
          targetPosition: Math.random() < 0.5 ? 'above' : 'below',
        }
      ].sort(() => Math.random() - 0.5);
    }

    const list = [];
    for (const cueType of ANT_CONFIG.cueTypes) {
      for (const flankerType of ANT_CONFIG.flankerTypes) {
        for (let i = 0; i < ANT_CONFIG.trialsPerCondition; i++) {
          list.push({
            cueType, flankerType,
            targetDirection: Math.random() < 0.5 ? 'left' : 'right',
            targetPosition: Math.random() < 0.5 ? 'above' : 'below',
          });
        }
      }
    }
    return list.sort(() => Math.random() - 0.5);
  }

  async showCountdown() {
    const w = [t('eng_ready'), t('eng_set'), t('eng_go')], c = ['ready','set','go'];
    for(let i=0; i<3; i++) {
      if (!this.isRunning) return;
      if (this.onCountdown) this.onCountdown(w[i], c[i]);
      await this._wait(ANT_CONFIG.countdownDuration);
    }
  }

  async runTrial(cond, total) {
    this.renderFixation();
    if (this.onStateChange) this.onStateChange('fixation', { trialIndex: this.currentTrialIndex, totalTrials: total });
    await this._wait(Math.random()*800 + ANT_CONFIG.fixationDuration.min);
    if (!this.isRunning) return;

    this.renderCue(cond.cueType, cond.targetPosition);
    await this._wait(ANT_CONFIG.cueDuration);
    if (!this.isRunning) return;

    this.renderFixation();
    await this._wait(ANT_CONFIG.postCueFixation);
    if (!this.isRunning) return;

    this.renderTarget(cond.targetDirection, cond.flankerType, cond.targetPosition);
    this.responseStartTime = now();
    if (this.onStateChange) this.onStateChange('target', { trialIndex: this.currentTrialIndex, totalTrials: total });

    const answer = await this.waitForResponse(this.isPractice ? 8000 : ANT_CONFIG.maxResponseTime);
    if (!this.isRunning) return;

    const record = {
      taskType: 'ant', trialNumber: this.currentTrialIndex+1,
      cueType: cond.cueType, flankerType: cond.flankerType,
      isCorrect: answer === cond.targetDirection,
      reactionTimeMs: now() - this.responseStartTime,
      timestamp: Date.now()
    };
    this.trialData.push(record);
    if (this.onTrialComplete) this.onTrialComplete(record);

    this.renderFixation();
    await this._wait(ANT_CONFIG.postTrialDuration);
  }

  waitForResponse(ms) {
    return new Promise(resolve => {
      this._resolveResponse = resolve;
      this._responseTimerId = setTimeout(() => {
        if (this._resolveResponse === resolve) {  // only fire if not already answered
          this._resolveResponse = null;
          this._responseTimerId = null;
          resolve('none');
        }
      }, ms);
    });
  }

  handleResponse(dir) {
    if (this._resolveResponse) {
      clearTimeout(this._responseTimerId);  // cancel orphan timer immediately
      this._responseTimerId = null;
      const cb = this._resolveResponse;
      this._resolveResponse = null;
      cb(dir);
    }
  }

  renderFixation() { this.container.innerHTML = `<div class="task-fixation">+</div>`; }

  renderCue(type, pos) {
    const o = '15vmin';
    let h = `<div class="task-fixation">+</div>`;
    if (type === 'center') h += `<div class="ant-cue" style="position:absolute;top:50%;left:50%;width:2vmin;height:2vmin;background:var(--accent-volt);transform:translate(-50%,-50%)"></div>`;
    else if (type === 'double') {
      h += `<div class="ant-cue" style="position:absolute;top:calc(50% - ${o});left:50%;width:2vmin;height:2vmin;background:var(--accent-volt);transform:translate(-50%,-50%)"></div>`;
      h += `<div class="ant-cue" style="position:absolute;top:calc(50% + ${o});left:50%;width:2vmin;height:2vmin;background:var(--accent-volt);transform:translate(-50%,-50%)"></div>`;
    } else if (type === 'spatial') {
      const y = pos === 'above' ? `calc(50% - ${o})` : `calc(50% + ${o})`;
      h += `<div class="ant-cue" style="position:absolute;top:${y};left:50%;width:2vmin;height:2vmin;background:var(--accent-volt);transform:translate(-50%,-50%)"></div>`;
    }
    this.container.innerHTML = h;
  }

  renderTarget(dir, flank, pos) {
    const t_dir = dir; // 'left' or 'right'
    const f_dir = flank === 'congruent' ? dir : (dir === 'left' ? 'right' : 'left');
    const y = pos === 'above' ? `calc(50% - 15vmin)` : `calc(50% + 15vmin)`;
    
    const flankArrow = getArrowHTML(f_dir, false);
    const targetArrow = getArrowHTML(t_dir, true);
    
    this.container.innerHTML = `<div class="task-fixation">+</div>
      <div style="position:absolute;top:${y};left:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:2vmin;">
        ${flankArrow}${flankArrow}${targetArrow}${flankArrow}${flankArrow}
      </div>`;
  }
}
