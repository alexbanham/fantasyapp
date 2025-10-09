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
  'WAS': 'https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/was.png'
}

// Function to get team logo URL
export const getTeamLogo = (teamAbbreviation: string): string | null => {
  return teamLogos[teamAbbreviation] || null
}

// Function to get team logo with fallback
export const getTeamLogoWithFallback = (teamAbbreviation: string): string => {
  return teamLogos[teamAbbreviation] || `https://a.espncdn.com/i/teamlogos/nfl/500/scoreboard/${teamAbbreviation.toLowerCase()}.png`
}
