/**
 * Utility functions for calculating matchup win probabilities
 * Handles edge cases like all players done, mathematically eliminated teams, etc.
 */

export interface TeamRoster {
  starters: Array<{
    hasPlayed?: boolean
    isPlaying?: boolean
    notPlayed?: boolean
    pointsActual?: number
    pointsProjected?: number
  }>
  totalActual: number
  totalProjected?: number
}

export interface SimpleTeamScore {
  score: number
  projectedScore: number
}

/**
 * Calculate the expected final score for a team based on current state
 * Uses actual points for completed/playing players, projected for unplayed
 * 
 * @param team - Team roster with starters and totals
 * @returns Expected final score
 */
export const calculateExpectedTotal = (team: TeamRoster): number => {
  let expectedTotal = 0
  let allStartersDone = true
  
  // Sum starter points: actual for played/playing, projected for not played
  team.starters.forEach((player) => {
    if (player.hasPlayed || player.isPlaying) {
      // Player has played or is currently playing - use actual points
      expectedTotal += player.pointsActual || 0
    } else {
      // Player hasn't played yet - use projected points
      expectedTotal += player.pointsProjected || 0
      allStartersDone = false
    }
  })
  
  // If all starters are done, use actual total (more accurate than summing)
  // This handles cases where bench points might be included in totalActual
  if (allStartersDone && team.totalActual !== undefined) {
    return team.totalActual
  }
  
  return expectedTotal
}

/**
 * Check if all starters for a team have completed their games
 * 
 * @param team - Team roster
 * @returns True if all starters have played (not just playing)
 */
export const areAllStartersDone = (team: TeamRoster): boolean => {
  if (!team.starters || team.starters.length === 0) return false
  
  return team.starters.every((player) => player.hasPlayed === true)
}

/**
 * Calculate win probability using logistic function with edge case handling
 * 
 * Edge cases handled:
 * 1. If team has all players done and is behind, they have 0% chance
 * 2. If team has all players done and is ahead, they have 100% chance
 * 3. If opponent has all players done and is ahead, this team has 0% chance
 * 4. Otherwise, use logistic function for probabilistic calculation
 * 
 * @param teamScore - Expected final score for this team
 * @param opponentScore - Expected final score for opponent
 * @param teamAllDone - Whether all starters for this team have completed
 * @param opponentAllDone - Whether all starters for opponent have completed
 * @returns Win probability between 0 and 1
 */
export const calculateWinProbability = (
  teamScore: number,
  opponentScore: number,
  teamAllDone: boolean = false,
  opponentAllDone: boolean = false
): number => {
  const diff = teamScore - opponentScore
  
  // Edge case 1: If this team has all players done and is behind, 0% chance
  if (teamAllDone && diff < 0) {
    return 0
  }
  
  // Edge case 2: If this team has all players done and is ahead, 100% chance
  if (teamAllDone && diff > 0) {
    return 1
  }
  
  // Edge case 3: If opponent has all players done and is ahead, this team has 0% chance
  if (opponentAllDone && diff < 0) {
    return 0
  }
  
  // Edge case 4: If opponent has all players done and is behind, this team has 100% chance
  if (opponentAllDone && diff > 0) {
    return 1
  }
  
  // Edge case 5: If both teams are done, use actual scores (should be handled above, but as fallback)
  if (teamAllDone && opponentAllDone) {
    return diff > 0 ? 1 : diff < 0 ? 0 : 0.5
  }
  
  // Standard case: Use logistic function for probabilistic calculation
  // P(win) = 1 / (1 + exp(-k * diff))
  // ESPN uses k=0.02 for a gentler curve
  const k = 0.02
  const probability = 1 / (1 + Math.exp(-k * diff))
  
  // Ensure probability is between 0 and 1 (accounting for floating point precision)
  return Math.max(0, Math.min(1, probability))
}

/**
 * Calculate win probabilities for both teams in a matchup
 * 
 * @param team1 - First team roster
 * @param team2 - Second team roster
 * @returns Object with win probabilities for both teams
 */
export const calculateMatchupWinProbabilities = (
  team1: TeamRoster,
  team2: TeamRoster
): { team1WinProb: number; team2WinProb: number } => {
  const team1Expected = calculateExpectedTotal(team1)
  const team2Expected = calculateExpectedTotal(team2)
  
  const team1AllDone = areAllStartersDone(team1)
  const team2AllDone = areAllStartersDone(team2)
  
  const team1WinProb = calculateWinProbability(
    team1Expected,
    team2Expected,
    team1AllDone,
    team2AllDone
  )
  
  const team2WinProb = calculateWinProbability(
    team2Expected,
    team1Expected,
    team2AllDone,
    team1AllDone
  )
  
  // Normalize probabilities to ensure they sum to 1 (accounting for rounding)
  const total = team1WinProb + team2WinProb
  if (total > 0) {
    return {
      team1WinProb: team1WinProb / total,
      team2WinProb: team2WinProb / total
    }
  }
  
  // Fallback: equal probability if both are 0 (shouldn't happen)
  return { team1WinProb: 0.5, team2WinProb: 0.5 }
}

/**
 * Calculate win probabilities for simple matchups (only scores, no player-level data)
 * Uses heuristics to determine if teams are done based on score vs projection
 * 
 * @param team1 - First team with score and projectedScore
 * @param team2 - Second team with score and projectedScore
 * @returns Object with win probabilities for both teams
 */
export const calculateSimpleMatchupWinProbabilities = (
  team1: SimpleTeamScore,
  team2: SimpleTeamScore
): { team1WinProb: number; team2WinProb: number } => {
  const team1Actual = team1.score || 0
  const team1Projected = team1.projectedScore || 0
  const team2Actual = team2.score || 0
  const team2Projected = team2.projectedScore || 0
  
  // Heuristic: If actual score is very low (< 5), assume games haven't started
  // If actual >= projected, assume all players have played
  // Otherwise, use projected as expected final score
  const getExpectedScore = (actual: number, projected: number): number => {
    if (actual === 0 || actual < 5) {
      return projected
    }
    if (actual >= projected) {
      return actual
    }
    return projected
  }
  
  const team1Expected = getExpectedScore(team1Actual, team1Projected)
  const team2Expected = getExpectedScore(team2Actual, team2Projected)
  
  // Determine if teams are done based on heuristics
  const team1AllDone = team1Actual >= team1Projected && team1Actual > 5
  const team2AllDone = team2Actual >= team2Projected && team2Actual > 5
  
  const team1WinProb = calculateWinProbability(
    team1Expected,
    team2Expected,
    team1AllDone,
    team2AllDone
  )
  
  const team2WinProb = calculateWinProbability(
    team2Expected,
    team1Expected,
    team2AllDone,
    team1AllDone
  )
  
  // Normalize probabilities to ensure they sum to 1
  const total = team1WinProb + team2WinProb
  if (total > 0) {
    return {
      team1WinProb: team1WinProb / total,
      team2WinProb: team2WinProb / total
    }
  }
  
  return { team1WinProb: 0.5, team2WinProb: 0.5 }
}

