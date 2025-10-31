import axios from 'axios'

// Use environment variable for API base URL in production
// Falls back to /api for development (which uses the Vite proxy)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface Player {
  player_id: string
  name: string
  position: string
  team: string
  bye_week?: number
  age?: number
  experience?: number
  injury_status?: string
  rank_ecr?: number
  rank_adp?: number
  pos_rank?: string
  rookie?: boolean
  image_url?: string
  filename?: string
  weekly_projection?: number
  weekly_projections?: Map<string, { std: number; ppr: number; half: number; last_updated: string }>
  current_week?: number
  projection_last_updated?: string
  // ESPN data fields
  espn_id?: string
  injury_description?: string
  injury_date?: string
  practice_status?: string
  injury_last_updated?: string
  recent_news?: any[]
  news_last_updated?: string
  fantasy_outlook?: string
  season_stats?: any
  recent_performance?: any
  outlook_last_updated?: string
}

export interface FantasyNewsArticle {
  article_id: string
  source: string
  headline: string
  summary: string
  content?: string
  author?: string
  published_date: string
  url: string
  image_url?: string
  players?: Array<{
    player_id: string
    player_name: string
    position: string
    team: string
  }>
  teams?: string[]
  category: string
  fantasy_impact: 'high' | 'medium' | 'low' | 'none'
  sentiment: 'positive' | 'negative' | 'neutral'
  relevance_score: number
  keywords?: string[]
  tags?: string[]
  engagement: {
    views: number
    clicks: number
    shares: number
  }
  last_updated: string
  sync_source: string
  sync_batch_id: string
}

export interface NewsFilters {
  limit?: number
  sortBy?: 'published_date' | 'relevance_score'
  category?: string
  fantasy_impact?: string
  sentiment?: string
  player_id?: string
  team?: string
  sources?: string[]
  hours?: number
  search?: string
}

export interface Projection {
  player_id: string
  season: number
  source: string
  projected_points: number
  projected_games?: number
  confidence_rating?: number
}

// Drafting features removed in favor of analysis-only experience

// Player API calls
export const getPlayers = async (params?: {
  position?: string
  team?: string
  search?: string
}): Promise<Player[]> => {
  const response = await api.get('/players', { params })
  return response.data
}

export const getPlayer = async (id: string): Promise<Player> => {
  const response = await api.get(`/players/${id}`)
  return response.data
}

export const getPlayerStats = async (
  id: string,
  params?: { season?: number; week?: number }
) => {
  const response = await api.get(`/players/${id}/stats`, { params })
  return response.data
}

// Projection API calls
export const getProjections = async (params?: {
  season?: number
  position?: string
  source?: string
}): Promise<Projection[]> => {
  const response = await api.get('/projections', { params })
  return response.data
}

// Draft API removed

// Analysis API calls
export const getPlayerTiers = async (params?: { position?: string }) => {
  const response = await api.get('/analysis/tiers', { params })
  return response.data
}

// New FantasyPros API endpoints
export const getNFLPlayers = async (position?: string, limit?: number, sort?: string, page?: number, week?: number) => {
  const params = new URLSearchParams();
  if (position) params.append('position', position);
  if (limit) params.append('limit', limit.toString());
  if (sort) params.append('sort', sort);
  if (page) params.append('page', page.toString());
  if (week) params.append('week', week.toString());
  
  const response = await api.get(`/players?${params.toString()}`);
  return response.data;
};

// Sync endpoints
export const syncPlayers = async () => {
  const response = await api.post('/players/sync');
  return response.data;
};

export const syncProjections = async (week?: number, season?: number) => {
  const response = await api.post('/players/sync-projections', {
    week: week || 1,
    season: season || new Date().getFullYear()
  });
  return response.data;
};

export const syncHistoricalFantasyPoints = async (season?: number, startWeek?: number, endWeek?: number, forceUpdate?: boolean) => {
  const response = await api.post('/players/sync-actuals', {
    season: season || new Date().getFullYear(),
    startWeek: startWeek || 1,
    endWeek: endWeek || null,
    forceUpdate: forceUpdate || false
  });
  return response.data;
};

export const syncAllPlayerData = async (season?: number, startWeek?: number, endWeek?: number, forceUpdate?: boolean) => {
  const response = await api.post('/players/sync-all-data', {
    season: season || new Date().getFullYear(),
    startWeek: startWeek || 1,
    endWeek: endWeek || null,
    forceUpdate: forceUpdate || false
  });
  return response.data;
};

export const syncWeeklyProjections = async (week: number, season?: number, forceUpdate?: boolean) => {
  const response = await api.post('/players/sync-weekly-projections', {
    week: week,
    season: season || new Date().getFullYear(),
    forceUpdate: forceUpdate || false
  });
  return response.data;
};

// Config API functions
export const verifyPassword = async (password: string) => {
  const response = await api.post('/config/verify-password', { password });
  return response.data;
};

export const getConfig = async () => {
  const response = await api.get('/config');
  return response.data;
};

export const updateCurrentWeek = async (week: number) => {
  const response = await api.put('/config/week', { week });
  return response.data;
};

export const updateCurrentSeason = async (season: number) => {
  const response = await api.put('/config/season', { season });
  return response.data;
};

export const updateScoringType = async (scoringType: 'STD' | 'PPR' | 'HALF') => {
  const response = await api.put('/config/scoring', { scoringType });
  return response.data;
};

export const autoUpdateWeek = async () => {
  const response = await api.post('/config/auto-update');
  return response.data;
};

export const updatePollingEnabled = async (enabled: boolean) => {
  const response = await api.put('/config/polling', { enabled })
  return response.data
}

export const getSyncStatus = async () => {
  const response = await api.get('/config/sync-status');
  return response.data;
};

export const syncAllWeeklyProjections = async (season?: number, startWeek?: number, endWeek?: number, forceUpdate?: boolean) => {
  const response = await api.post('/players/sync-all-projections', {
    season: season || new Date().getFullYear(),
    startWeek: startWeek || 1,
    endWeek: endWeek || null,
    forceUpdate: forceUpdate || false
  });
  return response.data;
};

export const syncAIProjectionsData = async (week?: number, season?: number) => {
  const response = await api.post('/players/sync-ai-projections', {
    week: week || null, // null means all weeks
    season: season || new Date().getFullYear()
  });
  return response.data;
};

export const getProjectionSyncStatus = async (week: number) => {
  const response = await api.get(`/players/projection-status/${week}`);
  return response.data;
};

export const getTopPlayers = async (position: string, limit: number = 20) => {
  const response = await api.get(`/players/top/${position}?limit=${limit}`);
  return response.data;
};

export const getVBDAnalysis = async (leagueSettings: any) => {
  const response = await api.post('/analysis/vbd', { leagueSettings });
  return response.data;
};

// Draft recommendations removed

// Live Games API calls
export const getLiveGames = async (params?: {
  week?: number
  season?: number
  status?: string
  live_only?: boolean
  limit?: number
}) => {
  const queryParams = new URLSearchParams()
  if (params?.week) queryParams.append('week', params.week.toString())
  if (params?.season) queryParams.append('season', params.season.toString())
  if (params?.status) queryParams.append('status', params.status)
  if (params?.live_only) queryParams.append('live_only', params.live_only.toString())
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  
  const response = await api.get(`/live?${queryParams.toString()}`)
  return response.data
}

// Get live games only (using query parameter)
export const getLiveGamesOnly = async () => {
  const response = await api.get('/live?live_only=true')
  return response.data
}

export const getGameDetails = async (eventId: string) => {
  const response = await api.get(`/live/${eventId}`)
  return response.data
}

export const getGameScorers = async (eventId: string, homeTeam: string, awayTeam: string, week?: number) => {
  const params = new URLSearchParams()
  params.append('homeTeam', homeTeam)
  params.append('awayTeam', awayTeam)
  if (week) params.append('week', week.toString())
  const response = await api.get(`/live/${eventId}/scorers?${params.toString()}`)
  return response.data
}

export const getGamesByWeek = async (week: number, season?: number, realtime?: boolean) => {
  const params = new URLSearchParams()
  if (season) params.append('season', season.toString())
  if (realtime) params.append('realtime', 'true')
  const paramsString = params.toString()
  const url = `/live/week/${week}${paramsString ? `?${paramsString}` : ''}`
  const response = await api.get(url)
  return response.data
}

export const triggerManualPoll = async () => {
  const response = await api.post('/live/poll')
  return response.data
}

export const getPollingStatus = async () => {
  const response = await api.get('/live/status')
  return response.data
}

// Polling control endpoints
export const startPolling = async () => {
  const response = await api.post('/live/start')
  return response.data
}

export const stopPolling = async () => {
  const response = await api.post('/live/stop')
  return response.data
}

// Highlights endpoint - Get game highlights when no live games
export const getGameHighlights = async (week?: number, season?: number) => {
  const params = new URLSearchParams()
  if (week) params.append('week', week.toString())
  if (season) params.append('season', season.toString())
  const paramsString = params.toString()
  const url = `/live/highlights${paramsString ? `?${paramsString}` : ''}`
  const response = await api.get(url)
  return response.data
}

// Game sync endpoints
export const syncAllGames = async () => {
  const response = await api.post('/live/sync-all')
  return response.data
}

// ESPN Data API calls
export const syncESPNInjuries = async () => {
  const response = await api.post('/espn/sync/injuries')
  return response.data
}

export const syncESPNNews = async (playerIds?: string[], limit?: number) => {
  const response = await api.post('/espn/sync/news', { playerIds, limit })
  return response.data
}

export const syncESPNOutlooks = async (playerIds?: string[], limit?: number) => {
  const response = await api.post('/espn/sync/outlooks', { playerIds, limit })
  return response.data
}

export const syncAllESPNData = async (year?: number, startWeek?: number, endWeek?: number, includeImages?: boolean) => {
  const response = await api.post('/sync/espn/all', { 
    year: year || 2025,
    startWeek: startWeek || 1,
    endWeek: endWeek || 18,
    includeImages: includeImages !== false,
    updateDatabase: true
  })
  return response.data
}

export const syncCurrentWeekESPNData = async () => {
  const response = await api.post('/sync/espn/current-week', {
    updateDatabase: true,
    includeImages: false
  })
  return response.data
}

export const getESPNInjuries = async (limit?: number, days?: number) => {
  const params = new URLSearchParams()
  if (limit) params.append('limit', limit.toString())
  if (days) params.append('days', days.toString())
  
  const response = await api.get(`/espn/injuries?${params.toString()}`)
  return response.data
}

export const getESPNNews = async (limit?: number, days?: number) => {
  const params = new URLSearchParams()
  if (limit) params.append('limit', limit.toString())
  if (days) params.append('days', days.toString())
  
  const response = await api.get(`/espn/news?${params.toString()}`)
  return response.data
}

export const getESPNOutlooks = async (limit?: number, days?: number) => {
  const params = new URLSearchParams()
  if (limit) params.append('limit', limit.toString())
  if (days) params.append('days', days.toString())
  
  const response = await api.get(`/espn/outlooks?${params.toString()}`)
  return response.data
}

export const getPlayerESPNData = async (playerId: string) => {
  const response = await api.get(`/espn/player/${playerId}`)
  return response.data
}

export const getESPNFreshness = async () => {
  const response = await api.get('/espn/freshness')
  return response.data
}

export const getESPNStatus = async () => {
  const response = await api.get('/espn/sync/status')
  return response.data
}

// Fantasy News API calls
export const getFantasyNews = async (filters?: NewsFilters, limit?: number) => {
  const params = new URLSearchParams()
  if (limit) params.append('limit', limit.toString())
  if (filters?.category) params.append('category', filters.category)
  if (filters?.fantasy_impact) params.append('fantasy_impact', filters.fantasy_impact)
  if (filters?.sentiment) params.append('sentiment', filters.sentiment)
  if (filters?.player_id) params.append('player_id', filters.player_id)
  if (filters?.team) params.append('team', filters.team)
  if (filters?.sources) params.append('sources', filters.sources.join(','))
  if (filters?.hours) params.append('hours', filters.hours.toString())
  if (filters?.search) params.append('search', filters.search)
  
  const response = await api.get(`/news?${params.toString()}`)
  return response.data
}

export const getTrendingNews = async (limit?: number) => {
  const params = limit ? `?limit=${limit}` : ''
  const response = await api.get(`/news/trending${params}`)
  return response.data
}

export const getNewsStats = async () => {
  const response = await api.get('/news/stats')
  return response.data
}

export const getPlayerNews = async (playerId: string, limit?: number) => {
  const params = limit ? `?limit=${limit}` : ''
  const response = await api.get(`/news/player/${playerId}${params}`)
  return response.data
}

export const getTeamNews = async (team: string, limit?: number) => {
  const params = limit ? `?limit=${limit}` : ''
  const response = await api.get(`/news/team/${team}${params}`)
  return response.data
}

export const getNewsCategories = async () => {
  const response = await api.get('/news/categories')
  return response.data
}

export const getNewsSources = async () => {
  const response = await api.get('/news/sources')
  return response.data
}

export const syncFantasyNews = async (limit?: number) => {
  const response = await api.post('/news/sync', { limit })
  return response.data
}

export const syncNewsFromSource = async (source: string, limit?: number) => {
  const response = await api.post(`/news/sync/source/${source}`, { limit })
  return response.data
}

export const getNewsArticle = async (articleId: string) => {
  const response = await api.get(`/news/${articleId}`)
  return response.data
}

export const trackNewsClick = async (articleId: string) => {
  const response = await api.post(`/news/${articleId}/click`)
  return response.data
}

export const trackNewsShare = async (articleId: string) => {
  const response = await api.post(`/news/${articleId}/share`)
  return response.data
}

// AI Analysis API functions
export const getAIInsights = async (hours: number = 24, limit: number = 20) => {
  const response = await api.get('/news/ai/insights', {
    params: { hours, limit }
  })
  return response.data
}

export const getPlayerAIAnalysis = async (playerName: string, days: number = 7) => {
  const response = await api.get(`/news/ai/player/${encodeURIComponent(playerName)}`, {
    params: { days }
  })
  return response.data
}

export const getTeamAIAnalysis = async (teamName: string, days: number = 7) => {
  const response = await api.get(`/news/ai/team/${encodeURIComponent(teamName)}`, {
    params: { days }
  })
  return response.data
}

export const getWeeklyAIRecommendations = async (week?: number) => {
  const response = await api.get('/news/ai/weekly', {
    params: week ? { week } : {}
  })
  return response.data
}

export const getCustomAIAnalysis = async (params: {
  analysis_type?: string
  time_range_hours?: number
  limit?: number
  focus_players?: string[]
  focus_teams?: string[]
  categories?: string[]
  custom_prompt?: string
}) => {
  const response = await api.post('/news/ai/custom-analysis', params)
  return response.data
}

export const submitCustomQuery = async (query: string, context?: {
  players?: string[]
  teams?: string[]
  categories?: string[]
}) => {
  const response = await api.post('/news/ai/query', {
    query,
    context
  })
  return response.data
}

export const getAIStatus = async () => {
  const response = await api.get('/news/ai/status')
  return response.data
}

export const scrapeAndAnalyzeNews = async () => {
  const response = await api.post('/news/scrape-and-analyze')
  return response.data
}

export const scrapeNewsOnly = async () => {
  const response = await api.post('/news/scrape-only')
  return response.data
}

export const syncAllNews = async () => {
  const response = await api.post('/news/sync-all')
  return response.data
}

export const getNews = async (params?: {
  page?: number
  limit?: number
  category?: string
  source?: string
  team?: string
  player?: string
  sentiment?: string
  min_impact_score?: number
  max_impact_score?: number
  min_relevance_score?: number
  max_relevance_score?: number
  breaking_only?: boolean
  featured_only?: boolean
  sort_by?: string
  sort_order?: string
  search?: string
  current_week_only?: boolean
}) => {
  const queryParams = new URLSearchParams()
  
  // Default to current week only
  queryParams.append('current_week_only', 'true')
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value.toString())
      }
    })
  }
  
  const response = await api.get(`/news?${queryParams.toString()}`)
  return response.data
}

export const scrapeFantasyTopics = async (topics: string[]) => {
  const response = await api.post('/news/scrape-topics', { topics })
  return response.data
}

export const getScrapingStatus = async () => {
  const response = await api.get('/news/scraping-status')
  return response.data
}

// League API calls
export interface LeagueStanding {
  teamId: number
  teamName: string
  owner: string
  wins: number
  losses: number
  ties: number
  winPercentage: number
  pointsFor: number
  pointsAgainst: number
  streak: string
  playoffSeed: number | null
  logo: string | null
}

export interface LeagueMatchup {
  matchupId: number
  week: number
  season: number
  awayTeam: {
    teamId: number
    teamName: string
    score: number
    projectedScore: number
    logo: string | null
  }
  homeTeam: {
    teamId: number
    teamName: string
    score: number
    projectedScore: number
    logo: string | null
  }
  isPlayoff: boolean
  isConsolation: boolean
  isThirdPlaceGame: boolean
  isChampionshipGame: boolean
  status: string
  winner: number | null
}

export interface LeagueInfo {
  leagueId: number
  leagueName: string
  seasonId: number
  totalTeams: number
  playoffTeams: number
  regularSeasonWeeks: number
  playoffWeeks: number
  scoringType: string
  tradeDeadline: string | null
  waiverRule: string
}

// Boxscore/Detailed Matchup interfaces
export interface PlayerLine {
  playerId: number
  fullName: string
  position: number
  pointsActual: number
  pointsProjected: number
  isStarter: boolean
}

export interface TeamBoxscore {
  teamId: number
  teamName: string
  logo?: string
  totalActual: number
  totalProjected: number
  starters: PlayerLine[]
  bench: PlayerLine[]
}

export interface DetailedMatchup {
  matchupId: number
  homeTeam: TeamBoxscore
  awayTeam: TeamBoxscore
}

export interface BoxscoreResponse {
  success: boolean
  season: number
  week: number
  matchups: DetailedMatchup[]
  totalMatchups: number
  message?: string
}

export const getLeagueStandings = async (seasonId?: number, scoringPeriodId?: number) => {
  const params = new URLSearchParams()
  if (seasonId) params.append('seasonId', seasonId.toString())
  if (scoringPeriodId) params.append('scoringPeriodId', scoringPeriodId.toString())
  
  const response = await api.get(`/league/standings?${params.toString()}`)
  return response.data
}

export const getLeagueMatchups = async (seasonId?: number, scoringPeriodId?: number) => {
  const params = new URLSearchParams()
  if (seasonId) params.append('seasonId', seasonId.toString())
  if (scoringPeriodId) params.append('scoringPeriodId', scoringPeriodId.toString())
  
  const response = await api.get(`/league/matchups?${params.toString()}`)
  return response.data
}

export const getLeagueInfo = async (seasonId?: number) => {
  const params = seasonId ? `?seasonId=${seasonId}` : ''
  const response = await api.get(`/league/info${params}`)
  return response.data
}

export const getLeagueOverview = async (seasonId?: number, scoringPeriodId?: number, week?: number) => {
  const params = new URLSearchParams()
  if (seasonId) params.append('seasonId', seasonId.toString())
  if (scoringPeriodId) params.append('scoringPeriodId', scoringPeriodId.toString())
  if (week) params.append('week', week.toString())
  
  const response = await api.get(`/league/overview?${params.toString()}`)
  return response.data
}

export const getAvailableWeeks = async (seasonId?: number) => {
  const params = seasonId ? `?seasonId=${seasonId}` : ''
  const response = await api.get(`/league/weeks${params}`)
  return response.data
}

// Get detailed boxscore data from synced database
export const getLeagueBoxscores = async (seasonId?: number, week?: number): Promise<BoxscoreResponse> => {
  const params = new URLSearchParams()
  if (seasonId) params.append('seasonId', seasonId.toString())
  if (week) params.append('week', week.toString())
  
  const queryString = params.toString()
  const url = queryString ? `/league/boxscores?${queryString}` : '/league/boxscores'
  const response = await api.get(url)
  return response.data
}

// Sync current week boxscore data
export const syncCurrentWeek = async () => {
  const response = await api.post('/league/sync/current-week')
  return response.data
}

// Sync specific week boxscore data
export const syncWeek = async (seasonId?: number, week?: number, force: boolean = true) => {
  const response = await api.post('/league/sync/week', { seasonId, week, force })
  return response.data
}

// Transaction types and API
export interface TransactionItem {
  type: string
  playerId: number
  playerName: string
  playerPosition: string | null
  playerHeadshot: string | null
  fromTeamId: number | null
  toTeamId: number | null
  fromTeamName: string | null
  toTeamName: string | null
  fromLineupSlotId: number
  toLineupSlotId: number
  fromSlotLabel: string
  toSlotLabel: string
  action: string
  isKeeper: boolean
}

export interface Transaction {
  id: string
  type: string
  status: string
  executionType: string
  teamId: number
  teamName: string
  teamLogo: string | null
  scoringPeriodId: number
  proposedDate: number
  processDate?: number
  rating: number
  isPending: boolean
  bidAmount: number
  relatedTransactionId: string | null
  items: TransactionItem[]
  participatingTeams?: Array<{
    id: number
    name: string
    logo: string | null
  }>
}

export interface TransactionStats {
  total: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  byWeek: Record<number, number>
  tradeCount: number
  waiverCount: number
  freeAgentCount: number
  rosterMoveCount: number
}

export interface TransactionsResponse {
  success: boolean
  transactions: Transaction[]
  stats: TransactionStats
  seasonId: number
  scoringPeriodId: number | 'all'
  totalCount: number
}

export const getLeagueTransactions = async (seasonId?: number, week?: number): Promise<TransactionsResponse> => {
  const params = new URLSearchParams()
  if (seasonId) params.append('seasonId', seasonId.toString())
  if (week) params.append('scoringPeriodId', week.toString())
  
  const response = await api.get(`/league/transactions?${params.toString()}`)
  return response.data
}

// Backfill all weeks boxscore data
export const backfillBoxscores = async (seasonId?: number, maxWeeks?: number) => {
  const response = await api.post('/league/sync/backfill', { seasonId, maxWeeks })
  return response.data
}

// Analytics API
export interface PositionTotal {
  totalPoints: number
  avgPoints: number
  games: number
}

export interface TeamPositionTotals {
  teamId: number
  teamName: string
  logo?: string
  seasonTotal: number
  positionTotals: Record<string, PositionTotal>
}

export interface ManagerScore {
  teamId: number
  teamName: string
  logo?: string
  managerScore: number
  metrics: {
    wins: number
    losses: number
    totalPoints: number
    avgPointsPerWeek: number
    consistencyScore: number
    actualPoints: number
    optimalPoints: number
  }
}

export interface AnalyticsResponse<T> {
  success: boolean
  season: number
  data: T[]
}

export const getPositionTotals = async (seasonId?: number, week?: number | null) => {
  const params = new URLSearchParams()
  if (seasonId) params.append('seasonId', seasonId.toString())
  if (week) params.append('week', week.toString())
  const queryString = params.toString()
  const url = queryString ? `/league/analytics/position-totals?${queryString}` : '/league/analytics/position-totals'
  const response = await api.get(url)
  return response.data as AnalyticsResponse<TeamPositionTotals>
}

export const getManagerScores = async (seasonId?: number, week?: number | null) => {
  const params = new URLSearchParams()
  if (seasonId) params.append('seasonId', seasonId.toString())
  if (week) params.append('week', week.toString())
  const queryString = params.toString()
  const url = queryString ? `/league/analytics/manager-score?${queryString}` : '/league/analytics/manager-score'
  const response = await api.get(url)
  return response.data as AnalyticsResponse<ManagerScore>
}

export interface WeeklyBreakdown {
  week: number
  actualScore: number
  optimalScore: number
  efficiency: number
  pointsLeftOnBench: number
  teamTotal: number
  starters: Array<{ playerId: number, name: string, position: string, points: number }>
  bench: Array<{ playerId: number, name: string, position: string, points: number }>
  optimalLineup?: Array<{ playerId: number, name: string, position: string, points: number }>
  biggestMistakes: Array<{
    benchedPlayer: { name: string, points: number, position: string }
    startedPlayer: { name: string, points: number, position: string }
    pointsLost: number
  }>
}

export interface WeeklyBreakdownResponse {
  success: boolean
  season: number
  teamId: number
  teamName: string
  overallStats: {
    efficiency: number
    actualPoints: number
    optimalPoints: number
    pointsLeftOnBench: number
  }
  positionAverages?: {
    [position: string]: {
      avgPoints: number
      totalPoints: number
      gamesPlayed: number
    }
  }
  weeklyBreakdown: WeeklyBreakdown[]
}

export const getTeamWeeklyBreakdown = async (teamId: number, seasonId?: number) => {
  const params = seasonId ? `?seasonId=${seasonId}` : ''
  const response = await api.get(`/league/analytics/team/${teamId}/weekly-breakdown${params}`)
  return response.data as WeeklyBreakdownResponse
}

// Data Export API
export const dataExportApi = {
  // Get available data exports
  getAvailableExports: async () => {
    const response = await api.get('/data/exports')
    return response.data
  },

  // Download data export as CSV
  downloadExport: async (exportId: string, season?: number) => {
    const params = season ? { season } : {}
    const response = await api.get(`/data/export/${exportId}`, {
      params,
      responseType: 'blob'
    })
    return response
  },

  // Get export preview
  getExportPreview: async (exportId: string, season?: number, limit?: number) => {
    const params: any = {}
    if (season) params.season = season
    if (limit) params.limit = limit
    
    const response = await api.get(`/data/export/${exportId}/preview`, { params })
    return response.data
  },

  // Get data statistics
  getDataStats: async () => {
    const response = await api.get('/data/stats')
    return response.data
  }
}

export default api
