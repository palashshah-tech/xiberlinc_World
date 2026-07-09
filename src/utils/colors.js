/* ============================================================
   Color Utilities — 18 highly discriminable colors
   (based on Luck & Vogel 1997 / Cambridge Color Test palette)
   ============================================================ */

// Full perceptually distinct color set
export const STIMULUS_COLORS = [
  '#e74c3c',  // Red
  '#27ae60',  // Green
  '#2980b9',  // Blue
  '#f39c12',  // Orange
  '#1abc9c',  // Teal
  '#e91e9a',  // Magenta
  '#f1c40f',  // Yellow
  '#9b59b6',  // Purple
  '#e67e22',  // Dark Orange
  '#16a085',  // Dark Teal
  '#8e44ad',  // Dark Purple
  '#2ecc71',  // Emerald
  '#3498db',  // Bright Blue
  '#95a5a6',  // Silver (still distinct from white)
  '#d35400',  // Pumpkin
  '#c0392b',  // Pomegranate
  '#833471',  // Hollyhock
  '#006266',  // Mediterranean Blue
];

/**
 * Pick N unique random colors
 */
export function pickRandomColors(n) {
  const shuffled = [...STIMULUS_COLORS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, STIMULUS_COLORS.length));
}

/**
 * Helper to convert hex to RGB
 */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

/**
 * Calculate Euclidean distance in RGB color space
 */
function getColorDistance(c1, c2) {
  const rgb1 = hexToRgb(c1);
  const rgb2 = hexToRgb(c2);
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}

/**
 * Pick a replacement color.
 * difficulty: 'easy' → maximally different color
 *             'medium' / 'hard' → distinct color (far away in RGB color space, distance >= 100)
 */
export function pickDifferentColor(original, difficulty = 'medium') {
  if (difficulty === 'easy') {
    // Pick maximally different — opposite end of palette
    const idx = STIMULUS_COLORS.indexOf(original);
    const opposite = (idx + Math.floor(STIMULUS_COLORS.length / 2)) % STIMULUS_COLORS.length;
    return STIMULUS_COLORS[opposite];
  }

  // Pick a color that is "far away" (Euclidean distance >= 100 in RGB space)
  // This filters out similar shades (like Red -> Dark Red or Green -> Emerald)
  const pool = STIMULUS_COLORS.filter(c => getColorDistance(original, c) >= 100);
  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Fallback to any different color if pool is somehow empty
  const fallbackPool = STIMULUS_COLORS.filter(c => c !== original);
  return fallbackPool[Math.floor(Math.random() * fallbackPool.length)];
}

/**
 * @deprecated use pickDifferentColor
 */
export function pickSimilarColor(original) {
  return pickDifferentColor(original, 'hard');
}
