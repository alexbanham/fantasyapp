// Lineup Slot Constants and Utilities
// ESPN uses numeric IDs for lineup slots

const SLOT = {
  QB: 0,
  RB: 2,
  WR: 4,
  TE: 6,
  DST: 16,
  K: 17,
  BENCH: 20,
  IR: 21,
  FLEX: 23,
};

/**
 * Normalize a lineup slot ID from ESPN API data
 * @param {Object} entry - Roster entry from ESPN API
 * @returns {number|null} - Normalized slot ID or null if invalid
 */
function normalizeSlotId(entry) {
  // Prefer numeric id if present
  if (typeof entry.lineupSlotId === 'number') {
    return entry.lineupSlotId;
  }
  
  // Fallback from string label (handle both formats)
  const slotLabel = entry.lineupSlot || '';
  
  switch (slotLabel.toUpperCase()) {
    case 'QB': return SLOT.QB;
    case 'RB': return SLOT.RB;
    case 'WR': return SLOT.WR;
    case 'TE': return SLOT.TE;
    case 'D/ST':
    case 'DST': return SLOT.DST;
    case 'K': return SLOT.K;
    case 'FLEX': return SLOT.FLEX;
    case 'BENCH': return SLOT.BENCH;
    case 'IR': return SLOT.IR;
    default: return null;
  }
}

/**
 * Check if a slot ID represents a starter position
 * @param {number|null} slotId - Lineup slot ID
 * @returns {boolean}
 */
function isStarter(slotId) {
  if (slotId === null) return false;
  // All valid lineup slots except bench and IR are starters
  return slotId !== SLOT.BENCH && slotId !== SLOT.IR;
}

/**
 * Get a human-readable label for a slot ID
 * @param {number} slotId - Lineup slot ID
 * @returns {string}
 */
function getSlotLabel(slotId) {
  const labels = {
    [SLOT.QB]: 'QB',
    [SLOT.RB]: 'RB',
    [SLOT.WR]: 'WR',
    [SLOT.TE]: 'TE',
    [SLOT.DST]: 'D/ST',
    [SLOT.K]: 'K',
    [SLOT.BENCH]: 'BENCH',
    [SLOT.IR]: 'IR',
    [SLOT.FLEX]: 'FLEX',
  };
  
  return labels[slotId] || `SLOT_${slotId}`;
}

/**
 * Check if two positions are compatible for swapping
 * @param {number} position1 - First lineup slot ID
 * @param {number} position2 - Second lineup slot ID
 * @returns {boolean} - True if positions can be swapped
 */
function canSwapPositions(position1, position2) {
  // Same position always works
  if (position1 === position2) return true;
  
  // FLEX positions: RB, WR, and TE can all play FLEX
  // So FLEX can be replaced by any of RB, WR, or TE
  const flexPositions = [SLOT.RB, SLOT.WR, SLOT.TE];
  
  if (position1 === SLOT.FLEX) {
    // FLEX can be replaced by RB, WR, or TE
    return flexPositions.includes(position2);
  }
  
  if (position2 === SLOT.FLEX) {
    // RB, WR, or TE can be replaced by FLEX
    return flexPositions.includes(position1);
  }
  
  // Otherwise, must be exact match
  return false;
}

/**
 * Get the position name for a default position ID
 * This maps ESPN's defaultPositionId to lineup slots
 * @param {number} defaultPosId - ESPN's default position ID (1=QB, 2=RB, 3=WR, etc)
 * @returns {number|null} - Lineup slot ID
 */
function defaultPositionToSlot(defaultPosId) {
  const mapping = {
    1: SLOT.QB,
    2: SLOT.RB,
    3: SLOT.WR,
    4: SLOT.TE,
    16: SLOT.DST,
    17: SLOT.K,
  };
  return mapping[defaultPosId] || null;
}

module.exports = {
  SLOT,
  normalizeSlotId,
  isStarter,
  getSlotLabel,
  canSwapPositions,
  defaultPositionToSlot,
};

