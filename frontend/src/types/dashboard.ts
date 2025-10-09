export interface FantasyNewsArticle {
  _id: string
  article_id: string
  title: string
  summary: string | null
  content?: string | null
  url: string
  source: string
  author?: string | null
  published_at: string
  scraped_at: string
  category: string
  impact_score: number
  sentiment: 'positive' | 'negative' | 'neutral'
  relevance_score: number
  players?: Array<{
    player_name: string
    player_id?: string | null
    team?: string | null
    position?: string | null
    _id: string
  }>
  teams?: string[]
  ai_analysis?: any | null
  ai_processed: boolean
  tags?: string[]
  keywords?: string[]
  image_url?: string | null
  is_breaking: boolean
  is_featured: boolean
  status: string
  ai_insights?: any[]
  last_updated: string
  createdAt: string
  updatedAt: string
  __v: number
}

// Strict NewsItem interface for the new feed
export interface NewsItem {
  _id: string
  article_id: string
  title: string
  summary?: string | null
  url: string
  source: string
  author?: string | null
  published_at: string // ISO date string
  scraped_at: string // ISO date string
  category?: string
  impact_score: number // 0-10
  sentiment: 'positive' | 'neutral' | 'negative'
  relevance_score: number // 0-10
  players: string[] // Array of player names
  teams: string[] // Array of team abbreviations
  image_url?: string | null
  is_breaking?: boolean
  is_featured?: boolean
  status: string
  ai_insights?: string[]
  
  // Extended fields for UI
  priority?: number // Computed priority score
  relatedItems?: NewsItem[] // Clustered duplicates
  isRead?: boolean
  canonical_url?: string
}

// Enhanced filters for the new news feed
export interface NewsToolbarFilters {
  search: string
  timeWindow: '24h' | '3d' | '7d' | 'all'
  sort: 'top' | 'latest' | 'impact' | 'team-player'
  myLens: 'all' | 'my-roster' | 'my-league'
  
  // Advanced filters (popover)
  categories: string[]
  sources: string[]
  impactMin: number
  sentiments: Array<'positive' | 'neutral' | 'negative'>
  breakingOnly: boolean
  groupSimilar: boolean
}

export interface SavedFilterPreset {
  id: string
  name: string
  filters: NewsToolbarFilters
  createdAt: string
}

export interface NewsFilters {
  selectedCategory: string
  selectedImpact: string
  selectedSource: string
  selectedSentiment: string
  minRelevanceScore: number
  searchTerm: string
  sortBy: 'smart' | 'published_at' | 'relevance_score' | 'impact_score'
}

export interface SyncStatus {
  isLoading: boolean
  message: string
  isSuccess?: boolean
}

export interface PollingStatus {
  isPolling: boolean
  status: any
}

export interface ESPNFreshness {
  recent_injuries: number
  [key: string]: any
}

export interface NewsStats {
  total_articles: number
  [key: string]: any
}

export interface AIInsights {
  insights?: {
    summary?: string
    key_insights?: Array<{
      insight: string
      impact_level: 'high' | 'medium' | 'low'
      fantasy_recommendation: string
      affected_players?: string[]
    }>
  }
  per_article_insights?: Array<{
    article_id: string
    headline: string
    source: string
    published_date: string
    fantasy_insights: {
      summary: string
      fantasy_impact: 'high' | 'medium' | 'low' | 'none'
      key_points: string[]
      affected_players: Array<{
        player_name: string
        team: string
        position: string
        fantasy_impact: 'high' | 'medium' | 'low' | 'positive' | 'negative'
        reason: string
      }>
      fantasy_recommendation: string
      confidence: 'high' | 'medium' | 'low'
      immediate_action?: string
      long_term_impact?: string
      waiver_wire_implications?: string
      trade_implications?: string
    }
  }>
  total_articles_scanned?: number
  relevant_articles_found?: number
  analyzed_articles?: number
}

export interface AIWeeklyRecommendations {
  recommendations?: {
    must_start?: Array<{
      player_name: string
      reason: string
    }>
    sit?: Array<{
      player_name: string
      reason: string
    }>
  }
}

export interface AIStatus {
  [key: string]: any
}

export interface Config {
  currentWeek: number
  currentSeason: number
  scoringType: string
  isInSeason: boolean
  pollingEnabled: boolean
  lastUpdated: string
  [key: string]: any
}

export interface SyncState {
  syncingGames: boolean
  gameSyncMessage: string
  syncingESPN: boolean
  espnSyncMessage: string
  syncingNews: boolean
  newsSyncMessage: string
  syncingPlayers: boolean
  playersSyncMessage: string
  syncingAllProjections: boolean
  allProjectionsSyncMessage: string
  syncingWeeklyProjections: boolean
  weeklyProjectionsSyncMessage: string
  syncingAllData: boolean
  allDataSyncMessage: string
  syncingAIProjections: boolean
  aiProjectionsSyncMessage: string
  syncingBoxscores: boolean
  boxscoresSyncMessage: string
}

export interface AIState {
  loadingAI: boolean
  aiMessage: string
  aiAnalyzingArticles: string[]
  aiProgress: number
  aiInsightsVisible: boolean
  loadingQuery: boolean
  queryResponse: any
  queryHistory: string[]
}

export interface ConfigState {
  loadingConfig: boolean
  configMessage: string
  currentWeekInput: number
  currentSeasonInput: number
}
