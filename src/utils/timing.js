/* ============================================================
   Timing Utilities — High-precision timing
   ============================================================ */

/**
 * Get high-precision timestamp
 * @returns {number} timestamp in ms
 */
export function now() {
  return performance.now();
}

/**
 * Promise-based delay
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Random delay within a range
 * @param {number} min - Minimum ms
 * @param {number} max - Maximum ms
 * @returns {Promise<number>} actual delay used
 */
export async function randomDelay(min, max) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await delay(ms);
  return ms;
}

/**
 * Measure elapsed time from a start timestamp
 * @param {number} startTime - from performance.now()
 * @returns {number} elapsed ms
 */
export function elapsed(startTime) {
  return performance.now() - startTime;
}

/**
 * Format milliseconds to readable string
 * @param {number} ms
 * @returns {string}
 */
export function formatMs(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Deadline-based wait — resolves with true if response comes before deadline
 * @param {number} maxMs
 * @returns {{ promise: Promise<boolean>, cancel: Function }}
 */
export function createDeadline(maxMs) {
  let timeoutId;
  let resolver;

  const promise = new Promise(resolve => {
    resolver = resolve;
    timeoutId = setTimeout(() => resolve(false), maxMs);
  });

  const cancel = () => {
    clearTimeout(timeoutId);
    resolver(true);
  };

  return { promise, cancel };
}
