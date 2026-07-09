/* ============================================================
   Ranking Engine — Pure functions for data processing
   ============================================================ */

import { computeFullScores } from './ScoringEngine.js';

/**
 * Recalculate ranks for a list of candidates
 * @param {Object[]} candidatesList
 * @returns {Object[]} Ranked candidates
 */
export function recalculateRanks(candidatesList) {
  if (!candidatesList || candidatesList.length === 0) return [];
  
  const candidates = candidatesList.map(c => {
    if (c.trials && c.trials.length > 0) {
      try {
        const computedScores = computeFullScores(c.trials);
        return {
          ...c,
          scores: computedScores
        };
      } catch (err) {
        console.error("Failed to dynamically recompute scores for candidate:", c.email, err);
      }
    }
    return c;
  });

  // Sort by composite score descending
  candidates.sort((a, b) => {
    const scoreA = a.scores?.compositeScore || 0;
    const scoreB = b.scores?.compositeScore || 0;
    return scoreB - scoreA;
  });

  // Assign rank and percentile
  const total = candidates.length;
  candidates.forEach((c, i) => {
    c.rank = i + 1;
    c.percentile = Math.round(((total - i) / total) * 100);
  });

  return candidates;
}

/**
 * Get tier distribution for a list of candidates
 */
export function getTierDistribution(candidates) {
  const tiers = { 'S+': 0, 'S': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
  if (!candidates) return tiers;

  candidates.forEach(c => {
    const tier = c.scores?.tier || 'D';
    if (tiers[tier] !== undefined) {
      tiers[tier]++;
    }
  });

  return tiers;
}

/**
 * Get statistics summary for a list of candidates
 */
export function getStatsSummary(candidates) {
  if (!candidates || candidates.length === 0) {
    return {
      totalCandidates: 0,
      avgComposite: 0,
      avgK: 0,
      avgRT: 0,
      topTierCount: 0,
    };
  }

  const scores = candidates.map(c => c.scores || {});

  const avgComposite = scores.reduce((s, c) => s + (c.compositeScore || 0), 0) / scores.length;
  const avgK = scores.reduce((s, c) => s + (c.kPure || 0), 0) / scores.length;
  const avgRT = scores.reduce((s, c) => s + (c.meanRT || 0), 0) / scores.length;

  const topTierCount = scores.filter(s =>
    s.tier === 'S+' || s.tier === 'S'
  ).length;

  return {
    totalCandidates: candidates.length,
    avgComposite: Math.round(avgComposite * 10) / 10,
    avgK: Math.round(avgK * 100) / 100,
    avgRT: Math.round(avgRT),
    topTierCount,
  };
}
