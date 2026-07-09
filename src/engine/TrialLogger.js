/* ============================================================
   Trial Logger — Records every trial's data
   ============================================================ */

export class TrialLogger {
  constructor() {
    this.trials = [];
  }

  /**
   * Log a VWM trial
   * @param {Object} data
   */
  logVWMTrial(data) {
    this.trials.push({
      taskType: data.taskType, // 'vwm-pure' or 'vwm-distractor'
      trialNumber: this.trials.filter(t => t.taskType === data.taskType).length + 1,
      setSize: data.setSize,
      stimulusColors: data.stimulusColors || [],
      stimulusPositions: data.stimulusPositions || [],
      probeType: data.isChange ? 'different' : 'same',
      changedItemIndex: data.changedIndex,
      userResponse: data.userResponse,
      isCorrect: data.isCorrect,
      reactionTimeMs: data.reactionTimeMs,
      timestamp: Date.now(),
      currentStreak: data.currentStreak || 0,
      withDistractors: data.withDistractors || false,
      distractorCount: data.distractorCount || 0,
    });
  }

  /**
   * Log an ANT trial
   * @param {Object} data
   */
  logANTTrial(data) {
    this.trials.push({
      taskType: 'ant',
      trialNumber: this.trials.filter(t => t.taskType === 'ant').length + 1,
      cueType: data.cueType,
      flankerType: data.flankerType,
      targetDirection: data.targetDirection,
      targetPosition: data.targetPosition,
      userResponse: data.userResponse,
      isCorrect: data.isCorrect,
      reactionTimeMs: data.reactionTimeMs,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all trials for a specific task type
   * @param {string} taskType
   * @returns {Object[]}
   */
  getTrials(taskType) {
    return this.trials.filter(t => t.taskType === taskType);
  }

  /**
   * Get all logged trials
   * @returns {Object[]}
   */
  getAllTrials() {
    return [...this.trials];
  }

  /**
   * Clear all trials
   */
  clear() {
    this.trials = [];
  }
}
