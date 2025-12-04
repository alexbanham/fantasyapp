// College basketball team logo mapping
// ESPN uses a pattern: https://a.espncdn.com/i/teamlogos/ncaa/500/{team-id}.png
// For opponent teams, we'll try to construct URLs or use fallbacks

export const collegeBasketballLogos: Record<string, string> = {
  // Syracuse
  'Syracuse': 'https://a.espncdn.com/i/teamlogos/ncaa/500/183.png',
  'SYR': 'https://a.espncdn.com/i/teamlogos/ncaa/500/183.png',
  
  // Common ACC teams
  'North Carolina': 'https://a.espncdn.com/i/teamlogos/ncaa/500/153.png',
  'UNC': 'https://a.espncdn.com/i/teamlogos/ncaa/500/153.png',
  'Duke': 'https://a.espncdn.com/i/teamlogos/ncaa/500/150.png',
  'Virginia': 'https://a.espncdn.com/i/teamlogos/ncaa/500/258.png',
  'UVA': 'https://a.espncdn.com/i/teamlogos/ncaa/500/258.png',
  'Miami': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2390.png',
  'Clemson': 'https://a.espncdn.com/i/teamlogos/ncaa/500/228.png',
  'Florida State': 'https://a.espncdn.com/i/teamlogos/ncaa/500/52.png',
  'FSU': 'https://a.espncdn.com/i/teamlogos/ncaa/500/52.png',
  'Louisville': 'https://a.espncdn.com/i/teamlogos/ncaa/500/97.png',
  'Notre Dame': 'https://a.espncdn.com/i/teamlogos/ncaa/500/87.png',
  'Pittsburgh': 'https://a.espncdn.com/i/teamlogos/ncaa/500/221.png',
  'Pitt': 'https://a.espncdn.com/i/teamlogos/ncaa/500/221.png',
  'Wake Forest': 'https://a.espncdn.com/i/teamlogos/ncaa/500/154.png',
  'NC State': 'https://a.espncdn.com/i/teamlogos/ncaa/500/152.png',
  'Boston College': 'https://a.espncdn.com/i/teamlogos/ncaa/500/103.png',
  'BC': 'https://a.espncdn.com/i/teamlogos/ncaa/500/103.png',
  'Georgia Tech': 'https://a.espncdn.com/i/teamlogos/ncaa/500/59.png',
  'Virginia Tech': 'https://a.espncdn.com/i/teamlogos/ncaa/500/259.png',
  'VT': 'https://a.espncdn.com/i/teamlogos/ncaa/500/259.png',
  
  // Common opponents
  'Tennessee': 'https://a.espncdn.com/i/teamlogos/ncaa/500/2633.png',
  'Iowa State': 'https://a.espncdn.com/i/teamlogos/ncaa/500/66.png',
  'Houston': 'https://a.espncdn.com/i/teamlogos/ncaa/500/248.png',
  'Stonehill': 'https://a.espncdn.com/i/teamlogos/ncaa/500/256.png',
}

// Function to get team logo URL
export const getCollegeBasketballLogo = (teamName: string): string | null => {
  // Try exact match first
  if (collegeBasketballLogos[teamName]) {
    return collegeBasketballLogos[teamName]
  }
  
  // Try uppercase match
  const upperName = teamName.toUpperCase()
  if (collegeBasketballLogos[upperName]) {
    return collegeBasketballLogos[upperName]
  }
  
  // Try partial match (e.g., "North Carolina" matches "UNC")
  for (const [key, url] of Object.entries(collegeBasketballLogos)) {
    if (teamName.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(teamName.toLowerCase())) {
      return url
    }
  }
  
  return null
}

// Function to get team logo with fallback
export const getCollegeBasketballLogoWithFallback = (teamName: string, teamId?: number | null): string => {
  // If we have a team ID, construct the logo URL directly
  if (teamId) {
    return `https://a.espncdn.com/i/teamlogos/ncaa/500/${teamId}.png`
  }
  
  // Try to find in our mapping
  const logo = getCollegeBasketballLogo(teamName)
  if (logo) {
    return logo
  }
  
  // Fallback: return a generic avatar
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=FF6B35&color=fff&size=128&bold=true`
}

