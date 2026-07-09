/* ============================================================
   Task Engine — VWM state machine (Pro Scrubbed Edition)
   ============================================================ */

import { generateTrial, renderStudy, renderProbe } from './StimulusGenerator.js';
import { now } from '../utils/timing.js';
import { t } from '../utils/i18n.js';



const T = {
  COUNTDOWN_WORD: 700,
  BLANK_MIN: 400,
  BLANK_MAX: 600,
  STIMULUS: 200,
  RETENTION: 900,
  FEEDBACK: 400,
  ITI: 300,
  RESPONSE_TIMEOUT: 6000,
};

export class TaskEngine {
  constructor({ taskType = 'vwm-pure', shape = 'square', isPractice = false } = {}) {
    this.taskType     = taskType;
    this.shape        = shape;
    this.isPractice   = isPractice;

    // Define condition blocks
    if (isPractice) {
      this.blocks = taskType === 'vwm-pure'
        ? [{t:1, d:0}, {t:2, d:0}, {t:3, d:0}]
        : [{t:1, d:1}, {t:2, d:2}, {t:3, d:3}];
      this.trialsPerBlock = 1;
    } else {
      this.blocks = taskType === 'vwm-pure'
        ? [{t:1, d:0}, {t:2, d:0}, {t:3, d:0}, {t:4, d:0}, {t:6, d:0}, {t:8, d:0}]
        : [{t:1, d:1}, {t:2, d:2}, {t:3, d:3}, {t:4, d:4}, {t:6, d:6}, {t:8, d:8}];
      this.trialsPerBlock = 10;
    }

    this.blockIdx = 0;
    
    // Track stats per block
    this.streak = 0;
    this.mistakesInBlock = 0;
    this.trialsInBlock = 0;
    this.consecutiveMistakes = 0;

    this.trialNum = 0;
    this.running  = false;
    this.aborted  = false;
    this.skippedAt = null;
    this._resolveResponse = null;
    this._responseStartTime = 0;
    this._responseTimerId = null;  // ← must clear this when user responds
    this._timerId = null;
    this._timerResolve = null;

    this.trialData = [];
    this.maxTrials = this.blocks.length * this.trialsPerBlock;
    this._finished = false;  // guard: onDone fires exactly once

    this.onCountdown = null;
    this.onPhase     = null;
    this.onTrial     = null;
    this.onDone      = null;
  }

  get currentCondition() { return this.blocks[this.blockIdx] || this.blocks[this.blocks.length-1]; }
  get currentSetSize() { return this.currentCondition.t; }
  get currentDistractorCount() { return this.currentCondition.d; }

  get currentDifficulty() {
    if (this.currentSetSize <= 2 && this.currentDistractorCount === 0) return 'medium';
    return 'hard';
  }

  /** Interruptible wait */
  async _wait(ms) {
    if (!this.running) return;
    return new Promise(resolve => {
      this._timerResolve = resolve;
      this._timerId = setTimeout(() => {
        this._timerResolve = null;
        resolve();
      }, ms);
    });
  }

  respond(answer) {
    if (this._resolveResponse) {
      clearTimeout(this._responseTimerId);  // ← cancel the timeout so it can't leak
      this._responseTimerId = null;
      const rt = now() - this._responseStartTime;
      const cb = this._resolveResponse;
      this._resolveResponse = null;
      cb({ answer, rt });
    }
  }

  skip() {
    this.skippedAt = Date.now();
    this.running = false;
    // Break active response wait
    if (this._resolveResponse) {
      clearTimeout(this._responseTimerId);
      this._responseTimerId = null;
      const cb = this._resolveResponse;
      this._resolveResponse = null;
      cb({ answer: '__skip__', rt: 0 });
    }
    // Break active delay wait
    if (this._timerResolve) {
      clearTimeout(this._timerId);
      this._timerResolve();
      this._timerResolve = null;
    }
  }

  async run(canvas) {
    this.canvas  = canvas;
    this.running = true;

    await this._countdown();
    if (!this.running) { this._finish(); return; }

    while (this.running && this.blockIdx < this.blocks.length && this.trialNum < this.maxTrials) {
      await this._runOneTrial();
      if (!this.running) break;
      
      this.trialNum++;
    }

    this._finish();
  }

  _finish() {
    if (this._finished) return;  // prevent double-fire
    this._finished = true;
    this.running = false;
    if (this.onDone) this.onDone(this.trialData, this.skippedAt);
  }

  async _countdown() {
    for (const { text, cls } of [
      { text: t('eng_ready'), cls: 'ready' },
      { text: t('eng_set'),   cls: 'set'   },
      { text: t('eng_go'),    cls: 'go'    },
    ]) {
      if (!this.running) return;
      if (this.onCountdown) this.onCountdown(text, cls);
      await this._wait(T.COUNTDOWN_WORD);
    }
  }

  _emit(phase, extra = {}) {
    if (this.onPhase) this.onPhase(phase, {
      trialNum: this.trialNum,
      setSize: this.currentSetSize,
      distractorCount: this.currentDistractorCount,
      blockIdx: this.blockIdx,
      maxTrials: this.maxTrials,
      streak: this.streak,
      ...extra,
    });
  }

  async _runOneTrial() {
    const setSize = this.currentSetSize;
    const distractorCount = this.currentDistractorCount;
    const isChange = Math.random() < 0.5;

    const trial = generateTrial({
      setSize, distractorCount, isChange, shape: this.shape, difficulty: this.currentDifficulty
    });

    this._emit('blank');
    this.canvas.innerHTML = '<div class="task-fixation">+</div>';
    await this._wait(Math.random() * 200 + T.BLANK_MIN);
    if (!this.running) return;

    this._emit('stimulus', { setSize });
    renderStudy(this.canvas, trial);
    await this._wait(T.STIMULUS);
    if (!this.running) return;

    this._emit('retention');
    this.canvas.innerHTML = '<div class="task-fixation">+</div>';
    await this._wait(T.RETENTION);
    if (!this.running) return;

    this._emit('probe', { isChange });
    renderProbe(this.canvas, trial);
    this._responseStartTime = now();
    const { answer, rt } = await this._waitResponse(T.RESPONSE_TIMEOUT);
    if (!this.running || answer === '__skip__') return;

    const isCorrect = answer === (isChange ? 'different' : 'same');

    this.trialsInBlock++;

    if (this.isPractice) {
      if (this.blockIdx < this.blocks.length - 1) {
        this.blockIdx++;
      }
    } else {
      if (isCorrect) {
        this.streak++;
        this.consecutiveMistakes = 0;
        if (this.streak >= 2) {
          // Advance only if not at the maximum block index
          if (this.blockIdx < this.blocks.length - 1) {
            this.blockIdx++;
          }
          this.streak = 0;
          this.mistakesInBlock = 0;
          this.trialsInBlock = 0;
        }
      } else {
        this.streak = 0;
        this.mistakesInBlock++;
        this.consecutiveMistakes++;
      }
    }

    const record = {
      taskType: this.taskType,
      trialNumber: this.trialNum + 1,
      setSize, isChange, isCorrect,
      reactionTimeMs: Math.round(rt),
      timestamp: Date.now(),
    };
    this.trialData.push(record);
    // Fire onTrial FIRST so the view can show the overlay
    if (this.onTrial) this.onTrial(record);

    // After trial processing, check termination
    // Keep it going until the person gets three wrong in a row (consecutively)
    if (!this.isPractice && this.consecutiveMistakes >= 3) {
      this.running = false; // Terminate task
    }

    // Clear canvas during feedback pause — overlay handles the tick/cross
    this.canvas.innerHTML = '';
    await this._wait(T.FEEDBACK);
    await this._wait(T.ITI);
  }

  _waitResponse(timeout) {
    return new Promise(resolve => {
      this._resolveResponse = resolve;
      this._responseTimerId = setTimeout(() => {
        // Only fire if this is still the active resolver (not already answered)
        if (this._resolveResponse === resolve) {
          this._resolveResponse = null;
          this._responseTimerId = null;
          resolve({ answer: 'timeout', rt: timeout });
        }
      }, timeout);
    });
  }
}
