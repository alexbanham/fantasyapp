/**
 * Utility to extract detailed stats from ESPN API responses
 * and calculate fantasy scores (STD, PPR, Half PPR)
 */

/**
 * Extract detailed stats from an ESPN stat entry
 * @param {Object} statEntry - ESPN stat entry object with stats property
 * @returns {Object|null} - Extracted stats object or null if no stats
 */
function extractDetailedStats(statEntry) {
  if (!statEntry || !statEntry.stats || typeof statEntry.stats !== 'object') {
    return null;
  }
  
  const stats = statEntry.stats;
  
  // Extract stats using correct ESPN stat IDs
  // Based on investigation: Stat IDs are numeric strings
  return {
    // Passing
    passingYards: stats['0'] || 0,
    passingTDs: stats['4'] || 0,
    passingInterceptions: stats['20'] || stats['19'] || 0,
    passing2PT: stats['3'] || 0,
    
    // Rushing
    rushingYards: stats['23'] || stats['27'] || 0,
    rushingTDs: stats['24'] || stats['28'] || 0,
    rushingAttempts: stats['58'] || 0, // Carries
    rushing2PT: stats['25'] || 0,
    
    // Receiving
    receivingYards: stats['42'] || stats['61'] || 0,
    receivingReceptions: stats['53'] || 0, // Receptions
    receivingTDs: stats['43'] || 0,
    receiving2PT: stats['44'] || 0,
    targets: stats['60'] || 0, // Targets (can be decimal)
    
    // Fumbles
    fumblesLost: stats['72'] || 0,
    
    // Kicker stats
    fieldGoalsMade: stats['80'] || 0,
    fieldGoalsAttempted: stats['81'] || 0,
    extraPointsMade: stats['86'] || 0,
    
    // D/ST stats
    sacks: stats['99'] || 0,
    interceptions: stats['103'] || 0,
    fumbleRecoveries: stats['104'] || 0,
    defensiveTDs: stats['106'] || 0,
    pointsAllowed: stats['89'] || 0,
    yardsAllowed: stats['95'] || 0,
    
    // ESPN calculated total (for comparison)
    espnCalculated: statEntry.appliedTotal || statEntry.total || null
  };
}

/**
 * Calculate Standard (STD) fantasy score
 * @param {Object} stats - Stats object from extractDetailedStats
 * @returns {number} - Calculated standard score
 */
function calculateStandardScore(stats) {
  if (!stats) return 0;
  
  let score = 0;
  
  // Passing
  score += (stats.passingYards || 0) * 0.04;
  score += (stats.passingTDs || 0) * 4;
  score -= (stats.passingInterceptions || 0) * 2;
  
  // Rushing
  score += (stats.rushingYards || 0) * 0.1;
  score += (stats.rushingTDs || 0) * 6;
  
  // Receiving (Standard - no PPR)
  score += (stats.receivingYards || 0) * 0.1;
  score += (stats.receivingTDs || 0) * 6;
  
  // Fumbles
  score -= (stats.fumblesLost || 0) * 2;
  
  return Math.round(score * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate PPR (Point Per Reception) fantasy score
 * @param {Object} stats - Stats object from extractDetailedStats
 * @returns {number} - Calculated PPR score
 */
function calculatePPRScore(stats) {
  if (!stats) return 0;
  
  let score = 0;
  
  // Passing
  score += (stats.passingYards || 0) * 0.04;
  score += (stats.passingTDs || 0) * 4;
  score -= (stats.passingInterceptions || 0) * 2;
  
  // Rushing
  score += (stats.rushingYards || 0) * 0.1;
  score += (stats.rushingTDs || 0) * 6;
  
  // Receiving (PPR - 1 point per reception)
  score += (stats.receivingReceptions || 0) * 1.0; // PPR
  score += (stats.receivingYards || 0) * 0.1;
  score += (stats.receivingTDs || 0) * 6;
  
  // Fumbles
  score -= (stats.fumblesLost || 0) * 2;
  
  return Math.round(score * 100) / 100;
}

/**
 * Calculate Half PPR fantasy score
 * @param {Object} stats - Stats object from extractDetailedStats
 * @returns {number} - Calculated Half PPR score
 */
function calculateHalfPPRScore(stats) {
  if (!stats) return 0;
  
  let score = 0;
  
  // Passing
  score += (stats.passingYards || 0) * 0.04;
  score += (stats.passingTDs || 0) * 4;
  score -= (stats.passingInterceptions || 0) * 2;
  
  // Rushing
  score += (stats.rushingYards || 0) * 0.1;
  score += (stats.rushingTDs || 0) * 6;
  
  // Receiving (Half PPR - 0.5 points per reception)
  score += (stats.receivingReceptions || 0) * 0.5; // Half PPR
  score += (stats.receivingYards || 0) * 0.1;
  score += (stats.receivingTDs || 0) * 6;
  
  // Fumbles
  score -= (stats.fumblesLost || 0) * 2;
  
  return Math.round(score * 100) / 100;
}

/**
 * Get weekly stats for a player from ESPN API response
 * @param {Object} player - Player object from ESPN API
 * @param {number} week - Week number
 * @param {number} statSourceId - 0 for actual, 1 for projection
 * @returns {Object|null} - Extracted stats or null
 */
function getWeeklyStats(player, week, statSourceId = 0) {
  if (!player || !player.stats || !Array.isArray(player.stats)) {
    return null;
  }
  
  const weekStat = player.stats.find(s => 
    s.scoringPeriodId === week &&
    s.statSplitTypeId === 1 && // Weekly stats (0 = season totals)
    s.statSourceId === statSourceId // 0 = actual, 1 = projection
  );
  
  if (!weekStat) {
    return null;
  }
  
  const detailedStats = extractDetailedStats(weekStat);
  if (!detailedStats) {
    return null;
  }
  
  return {
    week,
    statSourceId,
    detailedStats,
    calculatedScores: {
      std: calculateStandardScore(detailedStats),
      ppr: calculatePPRScore(detailedStats),
      half: calculateHalfPPRScore(detailedStats)
    },
    espnCalculated: weekStat.appliedTotal || weekStat.total || null
  };
}

/**
 * Calculate all scoring formats from detailed stats
 * @param {Object} stats - Stats object from extractDetailedStats
 * @returns {Object} - Object with std, ppr, and half scores
 */
function calculateAllScores(stats) {
  return {
    std: calculateStandardScore(stats),
    ppr: calculatePPRScore(stats),
    half: calculateHalfPPRScore(stats)
  };
}

module.exports = {
  extractDetailedStats,
  calculateStandardScore,
  calculatePPRScore,
  calculateHalfPPRScore,
  getWeeklyStats,
  calculateAllScores
};




