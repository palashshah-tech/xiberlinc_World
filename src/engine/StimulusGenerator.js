/* ============================================================
   Stimulus Generator — Correct single-probe VWM paradigm
   ============================================================
   PROBE DISPLAY (both same & different trials):
   - ONE item is probed (shown colored)
   - ALL other items = empty outline frames
   - "Same" = probed item shows SAME color as study
   - "Different" = probed item shows a NEW color
   This ensures both conditions are visually IDENTICAL in
   structure → no trivial cues from counting colored items.
   ============================================================ */

import { pickRandomColors, pickSimilarColor, pickDifferentColor } from '../utils/colors.js';

/* ---- Grid config ---- */
const COLS = 4;
const ROWS = 4;
const CANVAS_PX = 520;
const CELL_PX = CANVAS_PX / COLS;
const ITEM_PX = 54;
const MAX_JITTER = 14;

function getShuffledGridPositions() {
  const positions = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cx = c * CELL_PX + CELL_PX / 2;
      const cy = r * CELL_PX + CELL_PX / 2;
      const jx = (Math.random() - 0.5) * 2 * MAX_JITTER;
      const jy = (Math.random() - 0.5) * 2 * MAX_JITTER;
      const x = Math.max(4, Math.min(CANVAS_PX - ITEM_PX - 4, cx - ITEM_PX / 2 + jx));
      const y = Math.max(4, Math.min(CANVAS_PX - ITEM_PX - 4, cy - ITEM_PX / 2 + jy));
      positions.push({ x, y });
    }
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions;
}

/**
 * Generate a VWM trial.
 * @param {object} cfg
 * @param {number}  cfg.setSize        - Target items (1,2,3,4,6,8)
 * @param {boolean} cfg.isChange       - "different" trial?
 * @param {boolean} cfg.withDistractors
 * @param {string}  cfg.shape          - 'square' | 'circle'
 * @param {string}  cfg.difficulty     - 'easy'|'medium'|'hard' (controls color similarity)
 */
export function generateTrial({ setSize, isChange, distractorCount = 0, shape = 'square', difficulty = 'medium' }) {
  const totalItems = setSize + distractorCount;

  const positions = getShuffledGridPositions().slice(0, totalItems);
  const targetPos = positions.slice(0, setSize);
  const distractPos = positions.slice(setSize);

  // All target colors — all distinct
  const targetColors = pickRandomColors(setSize);

  // Which item gets probed (randomly selected each trial)
  const probedIdx = Math.floor(Math.random() * setSize);
  const probedOriginalColor = targetColors[probedIdx];

  // What color does the probe show?
  let probeColor;
  if (!isChange) {
    probeColor = probedOriginalColor;
  } else {
    // Pick a new color — difficulty controls how similar
    probeColor = pickDifferentColor(probedOriginalColor, difficulty);
  }

  return {
    setSize,
    isChange,
    probedIdx,
    shape,
    distractorCount,
    difficulty,

    // STUDY display: all target colors + gray distractors
    studyItems: [
      ...targetPos.map((pos, i) => ({
        ...pos, color: targetColors[i], type: 'target', shape,
      })),
      ...distractPos.map((pos, i) => ({
        ...pos, color: '#ffffff', type: 'distractor', shape,
      })),
    ],

    // PROBE display: ONE item colored, rest empty frames
    // (structure is identical for same AND different trials)
    probeItems: [
      ...targetPos.map((pos, i) => ({
        ...pos,
        color: i === probedIdx ? probeColor : null,
        type: 'target',
        shape,
        isEmpty: i !== probedIdx,  // non-probed = empty frame
        isProbed: i === probedIdx,
      })),
      ...distractPos.map((pos, i) => ({
        ...pos,
        color: null,
        type: 'distractor',
        shape,
        isEmpty: true,
        isProbed: false,
      })),
    ],

    // Scoring data
    originalColors: targetColors,
    probedOriginalColor,
    probeColor,
    changedFrom: isChange ? probedOriginalColor : null,
    changedTo: isChange ? probeColor : null,
  };
}

export const CANVAS_SIZE = CANVAS_PX;
export const ITEM_SIZE = ITEM_PX;

/* ---- Rendering ---- */

export function renderStudy(container, trial) {
  container.innerHTML = '';
  trial.studyItems.forEach(item => {
    container.appendChild(makeItem(item));
  });
}

export function renderProbe(container, trial) {
  container.innerHTML = '';
  trial.probeItems.forEach(item => {
    container.appendChild(makeItem(item));
  });
}

function makeItem({ x, y, color, shape, type, isEmpty, isProbed }) {
  const el = document.createElement('div');
  const isCircle = shape === 'circle';
  const isDistractor = type === 'distractor';

  el.style.cssText = `
    position: absolute;
    left: ${(x / CANVAS_PX) * 100}%;
    top: ${(y / CANVAS_PX) * 100}%;
    width: ${(ITEM_PX / CANVAS_PX) * 100}%;
    height: ${(ITEM_PX / CANVAS_PX) * 100}%;
    border-radius: ${isCircle ? '50%' : '8px'};
    background-color: ${isEmpty ? 'transparent' : color};
    border: ${
      isEmpty
        ? '2px solid rgba(255,255,255,0.25)'
        : isDistractor
          ? '2px dashed rgba(255,255,255,0.18)'
          : isProbed
            ? `2px solid ${color}`
            : 'none'
    };
    box-shadow: ${
      isEmpty || isDistractor
        ? 'none'
        : `0 0 18px ${color}66, 0 2px 8px rgba(0,0,0,0.5)`
    };
    transition: none;
  `;

  return el;
}
