// Team logo mapping for NFL teams
export const teamLogos: Record<string, string> = {
  'ARI': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/ari.png',
  'ATL': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/atl.png',
  'BAL': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/bal.png',
  'BUF': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/buf.png',
  'CAR': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/car.png',
  'CHI': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/chi.png',
  'CIN': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/cin.png',
  'CLE': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/cle.png',
  'DAL': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/dal.png',
  'DEN': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/den.png',
  'DET': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/det.png',
  'GB': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/gb.png',
  'HOU': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/hou.png',
  'IND': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/ind.png',
  'JAX': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/jax.png',
  'KC': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/kc.png',
  'LAC': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/lac.png',
  'LAR': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/lar.png',
  'LV': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/lv.png',
  'MIA': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/mia.png',
  'MIN': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/min.png',
  'NE': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/ne.png',
  'NO': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/no.png',
  'NYG': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nyg.png',
  'NYJ': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nyj.png',
  'PHI': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/phi.png',
  'PIT': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/pit.png',
  'SF': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/sf.png',
  'SEA': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/sea.png',
  'TB': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/tb.png',
  'TEN': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/ten.png',
  'WAS': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/wsh.png',
  'WSH': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/wsh.png'
}

// Team name to abbreviation mapping (for extracting from D/ST player names)
const teamNameToAbbr: Record<string, string> = {
  'arizona': 'ARI',
  'cardinals': 'ARI',
  'atlanta': 'ATL',
  'falcons': 'ATL',
  'baltimore': 'BAL',
  'ravens': 'BAL',
  'buffalo': 'BUF',
  'bills': 'BUF',
  'carolina': 'CAR',
  'panthers': 'CAR',
  'chicago': 'CHI',
  'bears': 'CHI',
  'cincinnati': 'CIN',
  'bengals': 'CIN',
  'cleveland': 'CLE',
  'browns': 'CLE',
  'dallas': 'DAL',
  'cowboys': 'DAL',
  'denver': 'DEN',
  'broncos': 'DEN',
  'detroit': 'DET',
  'lions': 'DET',
  'green bay': 'GB',
  'packers': 'GB',
  'houston': 'HOU',
  'texans': 'HOU',
  'indianapolis': 'IND',
  'colts': 'IND',
  'jacksonville': 'JAX',
  'jaguars': 'JAX',
  'kansas city': 'KC',
  'chiefs': 'KC',
  'los angeles chargers': 'LAC',
  'chargers': 'LAC',
  'los angeles rams': 'LAR',
  'rams': 'LAR',
  'las vegas': 'LV',
  'raiders': 'LV',
  'miami': 'MIA',
  'dolphins': 'MIA',
  'minnesota': 'MIN',
  'vikings': 'MIN',
  'new england': 'NE',
  'patriots': 'NE',
  'new orleans': 'NO',
  'saints': 'NO',
  'new york giants': 'NYG',
  'giants': 'NYG',
  'new york jets': 'NYJ',
  'jets': 'NYJ',
  'philadelphia': 'PHI',
  'eagles': 'PHI',
  'pittsburgh': 'PIT',
  'steelers': 'PIT',
  'san francisco': 'SF',
  '49ers': 'SF',
  'seattle': 'SEA',
  'seahawks': 'SEA',
  'tampa bay': 'TB',
  'buccaneers': 'TB',
  'tennessee': 'TEN',
  'titans': 'TEN',
  'washington': 'WSH',
  'commanders': 'WSH',
  'redskins': 'WSH'
}

// Function to extract team abbreviation from D/ST player name
export const extractTeamFromDSTName = (playerName: string): string | null => {
  if (!playerName) return null
  
  const nameLower = playerName.toLowerCase()
  
  // Remove common D/ST suffixes
  const cleaned = nameLower
    .replace(/\s*d\/st\s*/gi, '')
    .replace(/\s*dst\s*/gi, '')
    .replace(/\s*defense\s*/gi, '')
    .replace(/\s*def\s*/gi, '')
    .trim()
  
  // Try to match team name or nickname
  for (const [key, abbr] of Object.entries(teamNameToAbbr)) {
    if (cleaned.includes(key)) {
      return abbr
    }
  }
  
  return null
}

// Function to normalize team abbreviation
const normalizeTeamAbbr = (teamAbbr: string | null | undefined): string | null => {
  if (!teamAbbr) return null
  
  // Trim and uppercase
  const normalized = teamAbbr.trim().toUpperCase()
  
  // Handle special cases
  if (normalized === 'WAS') return 'WSH'
  if (normalized === 'JAC') return 'JAX'
  if (normalized === 'LA') return 'LAR' // Default LA to Rams if ambiguous
  
  return normalized
}

// Function to get team logo URL
export const getTeamLogo = (teamAbbreviation: string): string | null => {
  return teamLogos[teamAbbreviation] || null
}

// Function to get team logo with fallback
export const getTeamLogoWithFallback = (teamAbbreviation: string | null | undefined): string => {
  if (!teamAbbreviation) {
    return 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nfl.png'
  }
  
  // Normalize the abbreviation
  const normalized = normalizeTeamAbbr(teamAbbreviation)
  
  if (!normalized) {
    return 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/nfl.png'
  }
  
  // Check direct mapping first
  if (teamLogos[normalized]) {
    return teamLogos[normalized]
  }
  
  // Try lowercase version
  const lowerNormalized = normalized.toLowerCase()
  if (teamLogos[lowerNormalized.toUpperCase()]) {
    return teamLogos[lowerNormalized.toUpperCase()]
  }
  
  // Default fallback - try ESPN's URL pattern
  return `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${lowerNormalized}.png`
}

// Function to get team abbreviation for a D/ST player
export const getDSTTeamAbbr = (player: { proTeamId?: string | null; name?: string; position?: string }): string | null => {
  // First try proTeamId
  if (player.proTeamId) {
    const normalized = normalizeTeamAbbr(player.proTeamId)
    if (normalized && teamLogos[normalized]) {
      return normalized
    }
  }
  
  // If position is D/ST and we have a name, try to extract from name
  if ((player.position === 'D/ST' || player.position === 'DST') && player.name) {
    const extracted = extractTeamFromDSTName(player.name)
    if (extracted) {
      return extracted
    }
  }
  
  // Return normalized proTeamId even if not in logos (might work with fallback)
  return player.proTeamId ? normalizeTeamAbbr(player.proTeamId) : null
}
