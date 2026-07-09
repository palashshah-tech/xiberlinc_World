/* ============================================================
   Scoring Engine — Compute all cognitive metrics
   ============================================================ */

function median(values) {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const half = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[half];
  }
  return (sorted[half - 1] + sorted[half]) / 2.0;
}

/**
 * Calculate Cowan's K for VWM tasks
 * K = N × (H - F)
 * H = hit rate (proportion of "different" trials correctly called "different")
 * F = false alarm rate (proportion of "same" trials incorrectly called "different")
 *
 * @param {Object[]} trials - Filtered trials for a specific task type
 * @returns {Object} Scoring results
 */
export function computeVWMScores(trials) {
  if (!trials || trials.length === 0) {
    return { kScores: {}, maxK: 0, accuracy: 0, meanRT: 0, maxSetSize: 0, accuracyBySetSize: {}, rtBySetSize: {}, correctRtBySetSize: {}, totalTrials: 0 };
  }

  // Remove trials where response is too fast (< 200ms)
  const filteredTrials = trials.filter(t => t.reactionTimeMs === undefined || t.reactionTimeMs === null || t.reactionTimeMs >= 200);

  if (filteredTrials.length === 0) {
    return { kScores: {}, maxK: 0, accuracy: 0, meanRT: 0, maxSetSize: 0, accuracyBySetSize: {}, rtBySetSize: {}, correctRtBySetSize: {}, totalTrials: trials.length };
  }

  // Group by set size
  const bySetSize = {};
  filteredTrials.forEach(t => {
    if (!bySetSize[t.setSize]) {
      bySetSize[t.setSize] = [];
    }
    bySetSize[t.setSize].push(t);
  });

  const kScores = {};
  const accuracyBySetSize = {};
  const rtBySetSize = {};
  const correctRtBySetSize = {};
  let maxK = 0;
  let maxSetSize = 0;

  for (const [size, sizeTrials] of Object.entries(bySetSize)) {
    const n = parseInt(size);
    if (n > maxSetSize) maxSetSize = n;

    // Separate same and different trials
    const sameTrials = sizeTrials.filter(t => !t.isChange);
    const diffTrials = sizeTrials.filter(t => t.isChange);

    // Accuracy for this specific set size
    const correctInSize = sizeTrials.filter(t => t.isCorrect).length;
    const accuracy = sizeTrials.length > 0 ? correctInSize / sizeTrials.length : 0;

    // Hit rate: proportion of "different" trials correctly identified
    const hits = diffTrials.filter(t => t.isCorrect).length;
    const hitRate = diffTrials.length > 0 ? hits / diffTrials.length : accuracy;

    // False alarm rate: proportion of "same" trials incorrectly called "different"
    const falseAlarms = sameTrials.filter(t => !t.isCorrect).length;
    const falseAlarmRate = sameTrials.length > 0 ? falseAlarms / sameTrials.length : (1 - accuracy);

    // Cowan's K
    const k = Math.max(0, n * (hitRate - falseAlarmRate));
    kScores[n] = {
      k: k,
      hitRate,
      falseAlarmRate,
      trials: sizeTrials.length,
    };

    if (k > maxK) maxK = k;

    // Accuracy
    const correct = sizeTrials.filter(t => t.isCorrect).length;
    accuracyBySetSize[n] = sizeTrials.length > 0 ? correct / sizeTrials.length : 0;

    // Median RT (all trials for set size n)
    rtBySetSize[n] = sizeTrials.length > 0
      ? median(sizeTrials.map(t => t.reactionTimeMs))
      : 0;

    // Median RT (correct trials only for set size n)
    const sizeCorrectTrials = sizeTrials.filter(t => t.isCorrect);
    correctRtBySetSize[n] = sizeCorrectTrials.length > 0
      ? median(sizeCorrectTrials.map(t => t.reactionTimeMs))
      : 0;
  }

  // Overall accuracy
  const totalCorrect = filteredTrials.filter(t => t.isCorrect).length;
  const accuracy = filteredTrials.length > 0 ? totalCorrect / filteredTrials.length : 0;

  // Overall median and mean RT (correct trials only)
  const correctTrials = filteredTrials.filter(t => t.isCorrect);
  const medianRT = correctTrials.length > 0
    ? median(correctTrials.map(t => t.reactionTimeMs))
    : 0;
  const meanRT = correctTrials.length > 0
    ? correctTrials.reduce((sum, t) => sum + t.reactionTimeMs, 0) / correctTrials.length
    : 0;

  return {
    kScores,
    maxK,
    accuracy,
    meanRT: medianRT, // We use medianRT as the default meanRT to avoid breaking components expecting meanRT
    meanRT_raw: meanRT,
    medianRT,
    maxSetSize,
    accuracyBySetSize,
    rtBySetSize,
    correctRtBySetSize,
    totalTrials: trials.length,
    validTrials: filteredTrials.length,
  };
}

/**
 * Calculate ANT scores
 * Alerting = RT(no cue) - RT(center cue)
 * Orienting = RT(center cue) - RT(spatial cue)
 * Executive = RT(incongruent) - RT(congruent)
 *
 * @param {Object[]} trials - ANT trial data
 * @returns {Object} ANT scoring results
 */
export function computeANTScores(trials) {
  if (!trials || trials.length === 0) {
    return {
      alerting: 0, orienting: 0, executive: 0,
      accuracy: 0, meanRT: 0, rtByCue: {}, rtByFlanker: {},
      accuracyCongruent: 0, accuracyIncongruent: 0,
      efficiencyCongruent: 0, efficiencyIncongruent: 0,
      efficiencyAlerting: 0, efficiencyOrienting: 0, efficiencyExecutive: 0,
      totalTrials: 0, validTrials: 0
    };
  }

  // Remove trials where response is too fast (< 200ms)
  const filteredTrials = trials.filter(t => t.reactionTimeMs === undefined || t.reactionTimeMs === null || t.reactionTimeMs >= 200);

  if (filteredTrials.length === 0) {
    return {
      alerting: 0, orienting: 0, executive: 0,
      accuracy: 0, meanRT: 0, rtByCue: {}, rtByFlanker: {},
      accuracyCongruent: 0, accuracyIncongruent: 0,
      efficiencyCongruent: 0, efficiencyIncongruent: 0,
      efficiencyAlerting: 0, efficiencyOrienting: 0, efficiencyExecutive: 0,
      totalTrials: trials.length, validTrials: 0
    };
  }

  // Only use correct, non-timed-out trials for RT analysis
  const validTrials = filteredTrials.filter(t => t.isCorrect && !t.timedOut);

  // Median RT by cue type (correct trials only)
  const rtByCue = {};
  for (const cueType of ['none', 'center', 'double', 'spatial']) {
    const cueTrials = validTrials.filter(t => t.cueType === cueType);
    rtByCue[cueType] = cueTrials.length > 0
      ? median(cueTrials.map(t => t.reactionTimeMs))
      : 0;
  }

  // Median RT by flanker type (correct trials only)
  const rtByFlanker = {};
  for (const flankerType of ['congruent', 'incongruent', 'neutral']) {
    const flankerTrials = validTrials.filter(t => t.flankerType === flankerType);
    rtByFlanker[flankerType] = flankerTrials.length > 0
      ? median(flankerTrials.map(t => t.reactionTimeMs))
      : 0;
  }

  // Compute network scores
  const alerting = rtByCue.none - rtByCue.center;
  const orienting = rtByCue.center - rtByCue.spatial;
  const executive = rtByFlanker.incongruent - rtByFlanker.congruent;

  // Overall accuracy
  const totalCorrect = filteredTrials.filter(t => t.isCorrect).length;
  const accuracy = filteredTrials.length > 0 ? totalCorrect / filteredTrials.length : 0;

  // Accuracies by conditions for Efficiency calculations
  const congruentTrials = filteredTrials.filter(t => t.flankerType === 'congruent');
  const accuracyCongruent = congruentTrials.length > 0
    ? congruentTrials.filter(t => t.isCorrect).length / congruentTrials.length
    : 0;

  const incongruentTrials = filteredTrials.filter(t => t.flankerType === 'incongruent');
  const accuracyIncongruent = incongruentTrials.length > 0
    ? incongruentTrials.filter(t => t.isCorrect).length / incongruentTrials.length
    : 0;

  const noneCueTrials = filteredTrials.filter(t => t.cueType === 'none');
  const accuracyNone = noneCueTrials.length > 0
    ? noneCueTrials.filter(t => t.isCorrect).length / noneCueTrials.length
    : 0;

  const centerCueTrials = filteredTrials.filter(t => t.cueType === 'center');
  const accuracyCenter = centerCueTrials.length > 0
    ? centerCueTrials.filter(t => t.isCorrect).length / centerCueTrials.length
    : 0;

  const spatialCueTrials = filteredTrials.filter(t => t.cueType === 'spatial');
  const accuracySpatial = spatialCueTrials.length > 0
    ? spatialCueTrials.filter(t => t.isCorrect).length / spatialCueTrials.length
    : 0;

  const accuracyAlerting = accuracyCenter - accuracyNone;
  const accuracyOrienting = accuracySpatial - accuracyCenter;
  const accuracyExecutive = accuracyCongruent - accuracyIncongruent;

  // Efficiency calculations: (Accuracy / RT_ms) * 1000 to express in "Correct Responses per Second" (throughput)
  const efficiencyCongruent = rtByFlanker.congruent > 0
    ? (accuracyCongruent / rtByFlanker.congruent) * 1000
    : 0;

  const efficiencyIncongruent = rtByFlanker.incongruent > 0
    ? (accuracyIncongruent / rtByFlanker.incongruent) * 1000
    : 0;

  const efficiencyAlerting = alerting !== 0
    ? (accuracyAlerting / alerting) * 1000
    : 0;

  const efficiencyOrienting = orienting !== 0
    ? (accuracyOrienting / orienting) * 1000
    : 0;

  const efficiencyExecutive = executive !== 0
    ? (accuracyExecutive / executive) * 1000
    : 0;

  // Overall median RT
  const medianRT = validTrials.length > 0
    ? median(validTrials.map(t => t.reactionTimeMs))
    : 0;

  const meanRT = validTrials.length > 0
    ? validTrials.reduce((sum, t) => sum + t.reactionTimeMs, 0) / validTrials.length
    : 0;

  return {
    alerting,
    orienting,
    executive,
    accuracy,
    meanRT: medianRT, // We use medianRT as the default meanRT to avoid breaking components expecting meanRT
    meanRT_raw: meanRT,
    medianRT,
    rtByCue,
    rtByFlanker,
    accuracyCongruent,
    accuracyIncongruent,
    efficiencyCongruent,
    efficiencyIncongruent,
    efficiencyAlerting,
    efficiencyOrienting,
    efficiencyExecutive,
    totalTrials: trials.length,
    validTrials: filteredTrials.length,
  };
}

/**
 * Normalize a value to 0-100 scale using population benchmarks
 * @param {number} value - Raw value
 * @param {number} min - Population minimum (maps to 0)
 * @param {number} max - Population maximum (maps to 100)
 * @param {boolean} invert - If true, lower values are better (e.g., RT)
 * @returns {number} 0-100 normalized score
 */
function normalize(value, min, max, invert = false) {
  const clamped = Math.max(min, Math.min(max, value));
  let normalized = ((clamped - min) / (max - min)) * 100;
  if (invert) normalized = 100 - normalized;
  return Math.round(normalized * 10) / 10;
}

/**
 * Population benchmarks from cognitive science literature
 * These are approximate ranges for healthy adults
 */
const BENCHMARKS = {
  kPure: { min: 0, max: 6 },         // K score typically 1-5
  kDistractor: { min: 0, max: 5 },    // Usually slightly lower
  maxSetSize: { min: 1, max: 8 },     // Max tested
  meanRT: { min: 200, max: 1500 },    // ms
  alerting: { min: -20, max: 100 },   // ms (typically 20-60ms)
  orienting: { min: -20, max: 80 },   // ms (typically 20-50ms)
  executive: { min: -20, max: 200 },  // ms (typically 60-120ms)
};

/**
 * Compute composite score from all task metrics
 * @param {Object} vwmPure - VWM pure scores
 * @param {Object} vwmDistractor - VWM distractor scores
 * @param {Object} ant - ANT scores
 * @returns {Object} Composite scoring
 */
export function computeCompositeScore(vwmPure, vwmDistractor, ant) {
  const scores = {
    kPure: normalize(vwmPure.maxK, BENCHMARKS.kPure.min, BENCHMARKS.kPure.max),
    kDistractor: normalize(vwmDistractor.maxK, BENCHMARKS.kDistractor.min, BENCHMARKS.kDistractor.max),
    maxSetSize: normalize(
      Math.max(vwmPure.maxSetSize, vwmDistractor.maxSetSize),
      BENCHMARKS.maxSetSize.min,
      BENCHMARKS.maxSetSize.max
    ),
    rtEfficiency: normalize(
      (vwmPure.meanRT + vwmDistractor.meanRT) / 2,
      BENCHMARKS.meanRT.min,
      BENCHMARKS.meanRT.max,
      true // lower RT = better
    ),
    alerting: normalize(ant.alerting, BENCHMARKS.alerting.min, BENCHMARKS.alerting.max),
    orienting: normalize(ant.orienting, BENCHMARKS.orienting.min, BENCHMARKS.orienting.max),
    executive: normalize(ant.executive, BENCHMARKS.executive.min, BENCHMARKS.executive.max),
  };

  // Weighted composite
  const composite = (
    scores.kPure * 0.30 +
    scores.kDistractor * 0.20 +
    scores.maxSetSize * 0.15 +
    scores.rtEfficiency * 0.10 +
    scores.alerting * 0.10 +
    scores.orienting * 0.08 +
    scores.executive * 0.07
  );

  return {
    componentScores: scores,
    compositeScore: Math.round(composite * 10) / 10,
  };
}

/**
 * Assign tier based on composite score
 * Uses fixed percentile bins (since we may not have enough candidates for actual percentiles)
 * @param {number} compositeScore (0-100)
 * @returns {string} Tier label
 */
export function assignTier(compositeScore) {
  if (compositeScore >= 85) return 'S+';
  if (compositeScore >= 72) return 'S';
  if (compositeScore >= 58) return 'A';
  if (compositeScore >= 40) return 'B';
  if (compositeScore >= 25) return 'C';
  return 'D';
}

/**
 * Full scoring pipeline
 * @param {Object[]} allTrials - All trial data
 * @returns {Object} Complete scoring results
 */
export function computeFullScores(allTrials) {
  const pureTrials = allTrials.filter(t => t.taskType === 'vwm-pure');
  const distTrials = allTrials.filter(t => t.taskType === 'vwm-distractor');
  const antTrials = allTrials.filter(t => t.taskType === 'ant');

  const vwmPure = computeVWMScores(pureTrials);
  const vwmDistractor = computeVWMScores(distTrials);
  const ant = computeANTScores(antTrials);

  const { componentScores, compositeScore } = computeCompositeScore(vwmPure, vwmDistractor, ant);
  const tier = assignTier(compositeScore);

  // VWM Executive efficiency & speed calculations
  const wmcK = vwmPure.maxK;
  const fwmcK = vwmDistractor.maxK;
  const execEfficiency = wmcK > 0 ? ((fwmcK - wmcK) / wmcK) * 100 : 0;

  const wmcCorrRT = vwmPure.medianRT;
  const fwmcCorrRT = vwmDistractor.medianRT;
  const execSpeed = wmcCorrRT - fwmcCorrRT;

  return {
    vwmPure,
    vwmDistractor,
    ant,
    componentScores,
    compositeScore,
    tier,
    // Flattened for easy table display
    kPure: vwmPure.maxK,
    kDistractor: vwmDistractor.maxK,
    maxSetSize: Math.max(vwmPure.maxSetSize || 0, vwmDistractor.maxSetSize || 0),
    meanRT: ((vwmPure.medianRT || 0) + (vwmDistractor.medianRT || 0)) / 2,
    accuracyPure: vwmPure.accuracy,
    accuracyDistractor: vwmDistractor.accuracy,
    alerting: ant.alerting,
    orienting: ant.orienting,
    executive: ant.executive,
    antAccuracy: ant.accuracy,
    antMeanRT: ant.meanRT,

    // New metrics
    vwmExecEfficiency: execEfficiency,
    vwmExecSpeed: execSpeed,
    antCongruentEfficiency: ant.efficiencyCongruent,
    antIncongruentEfficiency: ant.efficiencyIncongruent,
    antAlertingEfficiency: ant.efficiencyAlerting,
    antOrientingEfficiency: ant.efficiencyOrienting,
    antExecutiveEfficiency: ant.efficiencyExecutive
  };
}
