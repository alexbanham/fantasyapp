/**
 * Optimal Lineup Calculator
 * 
 * Calculates the optimal fantasy football lineup from a roster of players,
 * respecting position constraints and ensuring no player is used twice.
 * 
 * Standard lineup requirements (9 total players):
 * - 1 QB (pos_id: 1)
 * - 2 RB (pos_id: 2)
 * - 2 WR (pos_id: 3)
 * - 1 TE (pos_id: 4)
 * - 1 FLEX - can be any remaining RB, WR, or TE
 * - 1 K (pos_id: 17)
 * - 1 D/ST (pos_id: 16)
 * 
 * The algorithm uses a greedy approach:
 * 1. Select the best available player at each required position (QB, RB×2, WR×2, TE, K, D/ST)
 * 2. Keep track of selected players to prevent duplicates
 * 3. Fill the FLEX position with the best remaining RB/WR/TE not already selected
 * 
 * This ensures the optimal lineup cannot use the same player twice (e.g., 
 * using the TE in both TE and FLEX slots).
 */
/**
 * Helper function to get the best N players for a position, excluding already used players
 * @param {Array} allPlayers - All available players
 * @param {number} posId - Position ID (1=QB, 2=RB, 3=WR, 4=TE, 16=D/ST, 17=K)
 * @param {number} count - Number of players to select
 * @param {Array} exclude - Array of player IDs to exclude
 * @returns {Array} Array of player objects
 */
function getNBestForPos(allPlayers, posId, count, exclude = []) {
  // Try to find by default_pos_id first
  let candidates = allPlayers
    .filter(p => p.default_pos_id === posId && !exclude.includes(p.player_id))
    .sort((a, b) => (b.points_actual || 0) - (a.points_actual || 0));
  // If no candidates found, try fallback to lineup_slot_id for K and D/ST
  if (candidates.length === 0 && (posId === 17 || posId === 16)) {
    // For K (posId=17): lineup_slot_id is also 17
    // For D/ST (posId=16): lineup_slot_id is also 16
    const slotId = posId;
    candidates = allPlayers
      .filter(p => p.lineup_slot_id === slotId && !exclude.includes(p.player_id))
      .sort((a, b) => (b.points_actual || 0) - (a.points_actual || 0));
  }
  return candidates.slice(0, count);
}

/**
 * Helper function to get the single best player for a position
 * @param {Array} allPlayers - All available players
 * @param {number} posId - Position ID
 * @param {Array} exclude - Array of player IDs to exclude
 * @returns {Object|null} Best player or null
 */
function getBestForPos(allPlayers, posId, exclude = []) {
  const candidates = getNBestForPos(allPlayers, posId, 1, exclude);
  return candidates.length > 0 ? candidates[0] : null;
}

/**
 * Calculate the optimal lineup score from all available players
 * @param {Array} allPlayers - Array of all player objects (starters + bench)
 * @returns {Object} Object containing optimal score and selected players for debugging
 */
function calculateOptimalLineup(allPlayers) {
  const selected = {
    QB: null,
    RBs: [],
    WRs: [],
    TE: null,
    K: null,
    DST: null,
    FLEX: null
  };
  const used = [];
  let optimalScore = 0;
  // 1. Best QB (no need to exclude yet)
  const qbs = allPlayers.filter(p => p.default_pos_id === 1).sort((a, b) => (b.points_actual || 0) - (a.points_actual || 0));
  const bestQB = getBestForPos(allPlayers, 1, used);
  if (bestQB) {
    selected.QB = bestQB;
    optimalScore += bestQB.points_actual || 0;
    used.push(bestQB.player_id);
  }
  // 2. Best 2 RBs (don't worry about FLEX yet - we'll handle that later)
  const bestRBs = getNBestForPos(allPlayers, 2, 2, used);
  bestRBs.forEach(rb => {
    selected.RBs.push(rb);
    optimalScore += rb.points_actual || 0;
    used.push(rb.player_id);
  });
  // 3. Best 2 WRs
  const availWRs = allPlayers.filter(p => p.default_pos_id === 3 && !used.includes(p.player_id)).sort((a, b) => (b.points_actual || 0) - (a.points_actual || 0));
  const bestWRs = getNBestForPos(allPlayers, 3, 2, used);
  bestWRs.forEach(wr => {
    selected.WRs.push(wr);
    optimalScore += wr.points_actual || 0;
    used.push(wr.player_id);
  });
  // 4. Best TE (check if already used)
  const tes = allPlayers.filter(p => p.default_pos_id === 4).sort((a, b) => (b.points_actual || 0) - (a.points_actual || 0));
  const bestTE = getBestForPos(allPlayers, 4, used);
  if (bestTE) {
    selected.TE = bestTE;
    optimalScore += bestTE.points_actual || 0;
    used.push(bestTE.player_id);
  }
  // 5. Best K (check if already used)
  const ks = allPlayers.filter(p => p.default_pos_id === 17).sort((a, b) => (b.points_actual || 0) - (a.points_actual || 0));
  const bestK = getBestForPos(allPlayers, 17, used);
  if (bestK) {
    selected.K = bestK;
    optimalScore += bestK.points_actual || 0;
    used.push(bestK.player_id);
  }
  // 6. Best D/ST (check if already used)
  const dsts = allPlayers.filter(p => p.default_pos_id === 16).sort((a, b) => (b.points_actual || 0) - (a.points_actual || 0));
  const bestDST = getBestForPos(allPlayers, 16, used);
  if (bestDST) {
    selected.DST = bestDST;
    optimalScore += bestDST.points_actual || 0;
    used.push(bestDST.player_id);
  }
  // 7. Best FLEX (best remaining RB/WR/TE that hasn't been used)
  const flexOptions = allPlayers
    .filter(p => !used.includes(p.player_id) && 
           (p.default_pos_id === 2 || p.default_pos_id === 3 || p.default_pos_id === 4))
    .sort((a, b) => (b.points_actual || 0) - (a.points_actual || 0));
  if (flexOptions.length > 0) {
    selected.FLEX = flexOptions[0];
    optimalScore += flexOptions[0].points_actual || 0;
    used.push(flexOptions[0].player_id);
  }
  // Verify we have exactly 9 players (or fewer if roster is incomplete)
  const totalSelected = [
    selected.QB,
    ...selected.RBs,
    ...selected.WRs,
    selected.TE,
    selected.K,
    selected.DST,
    selected.FLEX
  ].filter(Boolean).length;
  // Check for duplicate players
  const allPlayerIds = [
    selected.QB?.player_id,
    ...selected.RBs.map(r => r?.player_id),
    ...selected.WRs.map(w => w?.player_id),
    selected.TE?.player_id,
    selected.K?.player_id,
    selected.DST?.player_id,
    selected.FLEX?.player_id
  ].filter(Boolean);
  const duplicates = allPlayerIds.filter((id, index) => allPlayerIds.indexOf(id) !== index);
  return {
    score: optimalScore,
    selected,
    _verification: {
      totalPlayers: totalSelected,
      hasDuplicates: duplicates.length > 0
    }
  };
}

module.exports = {
  calculateOptimalLineup,
  getBestForPos,
  getNBestForPos
};