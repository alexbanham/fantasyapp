import { useState, useEffect } from 'react'
import { 
  getPollingStatus, 
  startPolling, 
  stopPolling, 
  syncAllGames, 
  syncAllESPNData,
  syncCurrentWeekESPNData,
  getESPNFreshness, 
  getNews, 
  getNewsStats, 
  syncAllNews, 
  syncPlayers, 
  syncWeeklyProjections, 
  syncAllWeeklyProjections, 
  syncAllPlayerData,
  syncAIProjectionsData,
  getAIStatus,
  getConfig,
  updateCurrentWeek,
  updateCurrentSeason,
  autoUpdateWeek,
  updatePollingEnabled,
  backfillBoxscores
} from '../services/api'
import { 
  FantasyNewsArticle, 
  NewsFilters, 
  SyncState, 
  PollingStatus, 
  ESPNFreshness, 
  NewsStats, 
  AIStatus, 
  Config,
  ConfigState
} from '../types/dashboard'

// Hook for managing news data and filtering
export const useNewsData = (filters: NewsFilters) => {
  const [news, setNews] = useState<FantasyNewsArticle[]>([])
  const [filteredNews, setFilteredNews] = useState<FantasyNewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchNews = async () => {
    try {
      setIsLoading(true)
      const data = await getNews({
        limit: 50,
        sort_by: filters.sortBy === 'smart' ? 'relevance_score' : filters.sortBy,
        sort_order: 'desc',
        category: filters.selectedCategory !== 'ALL' ? filters.selectedCategory : undefined,
        source: filters.selectedSource !== 'ALL' ? filters.selectedSource : undefined,
        sentiment: filters.selectedSentiment !== 'ALL' ? filters.selectedSentiment : undefined,
        min_relevance_score: filters.minRelevanceScore,
        search: filters.searchTerm || undefined
      })
      if (data.success) {
        setNews(data.data.articles || [])
      } else {
        setNews([])
      }
    } catch (error) {
      setNews([])
    } finally {
      setIsLoading(false)
    }
  }

  const filterNews = () => {
    if (!news || !Array.isArray(news)) {
      setFilteredNews([])
      return
    }

    let filtered = [...news]

    // Apply filters
    if (filters.selectedCategory !== 'ALL') {
      filtered = filtered.filter(article => article.category === filters.selectedCategory)
    }

    if (filters.selectedImpact !== 'ALL') {
      // Convert impact_score to fantasy_impact for filtering
      const getFantasyImpact = (score: number): 'high' | 'medium' | 'low' | 'none' => {
        if (score >= 7) return 'high'
        if (score >= 5) return 'medium'
        if (score >= 3) return 'low'
        return 'none'
      }
      filtered = filtered.filter(article => getFantasyImpact(article.impact_score) === filters.selectedImpact)
    }

    if (filters.selectedSource !== 'ALL') {
      filtered = filtered.filter(article => article.source === filters.selectedSource)
    }

    if (filters.selectedSentiment !== 'ALL') {
      filtered = filtered.filter(article => article.sentiment === filters.selectedSentiment)
    }

    if (filters.minRelevanceScore > 0) {
      filtered = filtered.filter(article => article.relevance_score >= filters.minRelevanceScore)
    }

    if (filters.searchTerm) {
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (article.summary && article.summary.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        article.players?.some(p => p.player_name.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        article.teams?.some(team => team.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        article.keywords?.some(keyword => keyword.toLowerCase().includes(filters.searchTerm.toLowerCase()))
      )
    }

    // Apply sorting
    if (filters.sortBy === 'smart') {
      filtered.sort((a, b) => {
        // Convert impact_score to fantasy_impact for sorting
        const getFantasyImpact = (score: number): 'high' | 'medium' | 'low' | 'none' => {
          if (score >= 7) return 'high'
          if (score >= 5) return 'medium'
          if (score >= 3) return 'low'
          return 'none'
        }
        
        const impactPriority = { high: 4, medium: 3, low: 2, none: 1 }
        const aImpact = impactPriority[getFantasyImpact(a.impact_score)] || 0
        const bImpact = impactPriority[getFantasyImpact(b.impact_score)] || 0
        
        if (aImpact !== bImpact) {
          return bImpact - aImpact
        }
        
        if (a.relevance_score !== b.relevance_score) {
          return b.relevance_score - a.relevance_score
        }
        
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      })
    } else if (filters.sortBy === 'published_at') {
      filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    } else if (filters.sortBy === 'relevance_score') {
      filtered.sort((a, b) => b.relevance_score - a.relevance_score)
    } else if (filters.sortBy === 'impact_score') {
      filtered.sort((a, b) => b.impact_score - a.impact_score)
    }

    setFilteredNews(filtered)
  }

  useEffect(() => {
    fetchNews()
  }, [])

  useEffect(() => {
    filterNews()
  }, [news, filters])

  return {
    news,
    filteredNews,
    isLoading,
    fetchNews,
    filterNews
  }
}

// Hook for managing polling status
export const usePollingStatus = () => {
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>({
    isPolling: false,
    status: null
  })

  const fetchPollingStatus = async () => {
    try {
      const data = await getPollingStatus()
      if (data.success) {
        setPollingStatus({
          isPolling: data.pollingStatus?.isPolling || false,
          status: data.pollingStatus
        })
      }
    } catch (error) {
      setPollingStatus(prev => ({ ...prev, isPolling: false }))
    }
  }

  const startGamePolling = async () => {
    try {
      const data = await startPolling()
      if (data.success) {
        setPollingStatus({
          isPolling: true,
          status: data.status
        })
      } else {
      }
    } catch (error) {
    }
  }

  const stopGamePolling = async () => {
    try {
      const data = await stopPolling()
      if (data.success) {
        setPollingStatus({
          isPolling: false,
          status: data.status
        })
      }
    } catch (error) {
    }
  }

  const togglePollingConfig = async (enabled: boolean) => {
    try {
      const data = await updatePollingEnabled(enabled)
      if (data.success) {
        // Refresh status to get updated config and runtime state
        await fetchPollingStatus()
      }
    } catch (error) {
    }
  }

  useEffect(() => {
    fetchPollingStatus()
  }, [])

  return {
    pollingStatus,
    fetchPollingStatus,
    startGamePolling,
    stopGamePolling,
    togglePollingConfig
  }
}

// Hook for managing sync operations
export const useSyncOperations = () => {
  const [syncState, setSyncState] = useState<SyncState>({
    syncingGames: false,
    gameSyncMessage: '',
    syncingESPN: false,
    espnSyncMessage: '',
    syncingNews: false,
    newsSyncMessage: '',
    syncingPlayers: false,
    playersSyncMessage: '',
    syncingAllProjections: false,
    allProjectionsSyncMessage: '',
    syncingWeeklyProjections: false,
    weeklyProjectionsSyncMessage: '',
    syncingAllData: false,
    allDataSyncMessage: '',
    syncingAIProjections: false,
    aiProjectionsSyncMessage: '',
    syncingBoxscores: false,
    boxscoresSyncMessage: ''
  })

  const syncGames = async () => {
    try {
      setSyncState(prev => ({ ...prev, syncingGames: true, gameSyncMessage: 'Syncing games...' }))
      const data = await syncAllGames()
      if (data.success) {
        setSyncState(prev => ({ ...prev, gameSyncMessage: 'Games synced successfully' }))
      } else {
        setSyncState(prev => ({ ...prev, gameSyncMessage: 'Game sync failed' }))
      }
    } catch (error) {
      setSyncState(prev => ({ ...prev, gameSyncMessage: 'Game sync error' }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingGames: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, gameSyncMessage: '' })), 5000)
    }
  }

  const syncESPNData = async () => {
    try {
      setSyncState(prev => ({ ...prev, syncingESPN: true, espnSyncMessage: 'Starting comprehensive ESPN sync (players + stats + images)...' }))
      const data = await syncAllESPNData()
      if (data.success) {
        const summary = data.data.summary
        setSyncState(prev => ({ 
          ...prev, 
          espnSyncMessage: `ESPN sync complete: ${summary.playersSynced} players synced, ${summary.imagesSynced} images updated (${Math.round(summary.totalTime/1000)}s)` 
        }))
      } else {
        setSyncState(prev => ({ ...prev, espnSyncMessage: 'ESPN sync failed' }))
      }
    } catch (error) {
      setSyncState(prev => ({ ...prev, espnSyncMessage: 'ESPN sync error' }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingESPN: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, espnSyncMessage: '' })), 5000)
    }
  }

  const syncFantasyNewsData = async () => {
    try {
      setSyncState(prev => ({ ...prev, syncingNews: true, newsSyncMessage: 'Syncing all news sources...' }))
      const data = await syncAllNews()
      if (data.success) {
        const summary = data.data.summary
        setSyncState(prev => ({ 
          ...prev, 
          newsSyncMessage: `News sync complete: ${summary.total_saved} new, ${summary.total_updated} updated (${summary.success_rate}% success rate)` 
        }))
      } else {
        setSyncState(prev => ({ ...prev, newsSyncMessage: `News sync failed: ${data.error}` }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setSyncState(prev => ({ ...prev, newsSyncMessage: `News sync failed: ${errorMessage}` }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingNews: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, newsSyncMessage: '' })), 5000)
    }
  }

  const syncPlayersData = async () => {
    try {
      setSyncState(prev => ({ ...prev, syncingPlayers: true, playersSyncMessage: 'Syncing players from FantasyPros...' }))
      const data = await syncPlayers()
      if (data.success) {
        setSyncState(prev => ({ ...prev, playersSyncMessage: `Players sync complete: ${data.stats.created + data.stats.updated} players processed` }))
      } else {
        setSyncState(prev => ({ ...prev, playersSyncMessage: 'Players sync failed' }))
      }
    } catch (error) {
      setSyncState(prev => ({ ...prev, playersSyncMessage: 'Players sync error' }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingPlayers: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, playersSyncMessage: '' })), 8000)
    }
  }

  const syncAllPlayersESPN = async () => {
    try {
      setSyncState(prev => ({ ...prev, syncingPlayers: true, playersSyncMessage: 'Starting comprehensive ESPN sync (all weeks)...' }))
      const data = await syncAllESPNData(2025, 1, 18, true)
      if (data.success) {
        const summary = data.data.summary
        setSyncState(prev => ({ 
          ...prev, 
          playersSyncMessage: `ESPN sync complete: ${summary.playersSynced} players synced, ${summary.imagesSynced} images updated (${Math.round(summary.totalTime/1000)}s)` 
        }))
      } else {
        setSyncState(prev => ({ ...prev, playersSyncMessage: 'ESPN sync failed' }))
      }
    } catch (error) {
      setSyncState(prev => ({ ...prev, playersSyncMessage: 'ESPN sync error' }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingPlayers: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, playersSyncMessage: '' })), 8000)
    }
  }

  const syncCurrentWeekPlayers = async () => {
    try {
      setSyncState(prev => ({ ...prev, syncingPlayers: true, playersSyncMessage: 'Syncing current week data...' }))
      const data = await syncCurrentWeekESPNData()
      if (data.success) {
        const stats = data.data.stats
        const summary = data.data.summary
        
        setSyncState(prev => ({ 
          ...prev, 
          playersSyncMessage: `Current week sync complete: ${stats.playersUpdated} updated, ${stats.playersSkipped} skipped (${Math.round(summary.totalTime/1000)}s)` 
        }))
      } else {
        setSyncState(prev => ({ ...prev, playersSyncMessage: 'Current week sync failed' }))
      }
    } catch (error) {
      setSyncState(prev => ({ ...prev, playersSyncMessage: 'Current week sync error' }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingPlayers: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, playersSyncMessage: '' })), 5000)
    }
  }

  const syncWeeklyProjectionsData = async (selectedWeek: number) => {
    try {
      setSyncState(prev => ({ ...prev, syncingWeeklyProjections: true, weeklyProjectionsSyncMessage: `Syncing projections for week ${selectedWeek}...` }))
      const data = await syncWeeklyProjections(selectedWeek)
      if (data.success) {
        setSyncState(prev => ({ ...prev, weeklyProjectionsSyncMessage: `Week ${selectedWeek} projections sync complete: ${data.stats.updated} players updated` }))
      } else {
        setSyncState(prev => ({ ...prev, weeklyProjectionsSyncMessage: `Week ${selectedWeek} projections sync failed` }))
      }
    } catch (error) {
      setSyncState(prev => ({ ...prev, weeklyProjectionsSyncMessage: `Week ${selectedWeek} projections sync error` }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingWeeklyProjections: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, weeklyProjectionsSyncMessage: '' })), 8000)
    }
  }

  const syncAllWeeklyProjectionsData = async () => {
    try {
      setSyncState(prev => ({ ...prev, syncingAllProjections: true, allProjectionsSyncMessage: 'Syncing all weekly projections for all weeks...' }))
      const data = await syncAllWeeklyProjections()
      if (data.success) {
        setSyncState(prev => ({ ...prev, allProjectionsSyncMessage: `All projections sync complete: ${data.stats.total_updated} players updated across ${data.stats.weeks}` }))
      } else {
        setSyncState(prev => ({ ...prev, allProjectionsSyncMessage: 'All projections sync failed' }))
      }
    } catch (error) {
      setSyncState(prev => ({ ...prev, allProjectionsSyncMessage: 'All projections sync error' }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingAllProjections: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, allProjectionsSyncMessage: '' })), 8000)
    }
  }

  const syncAllPlayerDataComprehensive = async () => {
    try {
      setSyncState(prev => ({ ...prev, syncingAllData: true, allDataSyncMessage: 'Syncing all player data (projections + historical points)...' }))
      const data = await syncAllPlayerData()
      if (data.success) {
        setSyncState(prev => ({ ...prev, allDataSyncMessage: `Comprehensive sync complete: ${data.stats.total_updated} total updates (${data.stats.projections.updated} projections, ${data.stats.historical.updated} historical)` }))
      } else {
        setSyncState(prev => ({ ...prev, allDataSyncMessage: 'Comprehensive sync failed' }))
      }
    } catch (error) {
      setSyncState(prev => ({ ...prev, allDataSyncMessage: 'Comprehensive sync error' }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingAllData: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, allDataSyncMessage: '' })), 8000)
    }
  }

  const syncAIProjections = async () => {
    try {
      setSyncState(prev => ({ ...prev, syncingAIProjections: true, aiProjectionsSyncMessage: 'AI projection sync starting...' }))
      const data = await syncAIProjectionsData()
      if (data.success) {
        setSyncState(prev => ({ ...prev, aiProjectionsSyncMessage: `AI projections sync complete: ${data.stats.players_updated} players updated from ${data.stats.total_projections_scraped} projections` }))
      } else {
        setSyncState(prev => ({ ...prev, aiProjectionsSyncMessage: 'AI projections sync failed' }))
      }
    } catch (error) {
      setSyncState(prev => ({ ...prev, aiProjectionsSyncMessage: 'AI projections sync error' }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingAIProjections: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, aiProjectionsSyncMessage: '' })), 8000)
    }
  }

  const syncAllBoxscores = async () => {
    try {
      setSyncState(prev => ({ ...prev, syncingBoxscores: true, boxscoresSyncMessage: 'Syncing all boxscores for the season...' }))
      const data = await backfillBoxscores()
      if (data.success) {
        setSyncState(prev => ({ ...prev, boxscoresSyncMessage: `Boxscore sync complete: ${data.stats?.totalWeeks || 'all'} weeks synced` }))
      } else {
        setSyncState(prev => ({ ...prev, boxscoresSyncMessage: 'Boxscore sync failed' }))
      }
    } catch (error) {
      setSyncState(prev => ({ ...prev, boxscoresSyncMessage: 'Boxscore sync error' }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingBoxscores: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, boxscoresSyncMessage: '' })), 8000)
    }
  }

  return {
    syncState,
    syncGames,
    syncESPNData,
    syncFantasyNewsData,
    syncPlayersData,
    syncWeeklyProjectionsData,
    syncAllWeeklyProjectionsData,
    syncAllPlayerDataComprehensive,
    syncAIProjections,
    syncAllPlayersESPN,
    syncCurrentWeekPlayers,
    syncAllBoxscores
  }
}

// Hook for managing dashboard stats
export const useDashboardStats = () => {
  const [espnFreshness, setEspnFreshness] = useState<ESPNFreshness | null>(null)
  const [newsStats, setNewsStats] = useState<NewsStats | null>(null)
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)

  const fetchESPNFreshness = async () => {
    try {
      const data = await getESPNFreshness()
      if (data.success) {
        setEspnFreshness(data.data || null)
      } else {
        setEspnFreshness(null)
      }
    } catch (error) {
      setEspnFreshness(null)
    }
  }

  const fetchNewsStats = async () => {
    try {
      const data = await getNewsStats()
      if (data.success) {
        setNewsStats(data.data || null)
      } else {
        setNewsStats(null)
      }
    } catch (error) {
      setNewsStats(null)
    }
  }

  const fetchAIStatus = async () => {
    try {
      const data = await getAIStatus()
      if (data.success) {
        setAiStatus(data.data || null)
      } else {
        setAiStatus(null)
      }
    } catch (error) {
      setAiStatus(null)
    }
  }

  useEffect(() => {
    fetchESPNFreshness()
    fetchNewsStats()
    fetchAIStatus()
  }, [])

  return {
    espnFreshness,
    newsStats,
    aiStatus,
    fetchESPNFreshness,
    fetchNewsStats,
    fetchAIStatus
  }
}

// Hook for managing config
export const useConfig = () => {
  const [config, setConfig] = useState<Config | null>(null)
  const [configState, setConfigState] = useState<ConfigState>({
    loadingConfig: false,
    configMessage: '',
    currentWeekInput: 1,
    currentSeasonInput: new Date().getFullYear()
  })

  const fetchConfig = async () => {
    try {
      setConfigState(prev => ({ ...prev, loadingConfig: true }))
      const data = await getConfig()
      if (data.success) {
        setConfig(data.data)
        setConfigState(prev => ({
          ...prev,
          currentWeekInput: data.data.currentWeek,
          currentSeasonInput: data.data.currentSeason
        }))
      }
    } catch (error) {
    } finally {
      setConfigState(prev => ({ ...prev, loadingConfig: false }))
    }
  }

  const updateWeek = async () => {
    try {
      setConfigState(prev => ({ ...prev, loadingConfig: true, configMessage: 'Updating current week...' }))
      const data = await updateCurrentWeek(configState.currentWeekInput)
      if (data.success) {
        setConfigState(prev => ({ ...prev, configMessage: `Week updated to ${configState.currentWeekInput}` }))
        await fetchConfig()
      } else {
        setConfigState(prev => ({ ...prev, configMessage: 'Failed to update week' }))
      }
    } catch (error) {
      setConfigState(prev => ({ ...prev, configMessage: 'Error updating week' }))
    } finally {
      setConfigState(prev => ({ ...prev, loadingConfig: false }))
      setTimeout(() => setConfigState(prev => ({ ...prev, configMessage: '' })), 5000)
    }
  }

  const updateSeason = async () => {
    try {
      setConfigState(prev => ({ ...prev, loadingConfig: true, configMessage: 'Updating current season...' }))
      const data = await updateCurrentSeason(configState.currentSeasonInput)
      if (data.success) {
        setConfigState(prev => ({ ...prev, configMessage: `Season updated to ${configState.currentSeasonInput}` }))
        await fetchConfig()
      } else {
        setConfigState(prev => ({ ...prev, configMessage: 'Failed to update season' }))
      }
    } catch (error) {
      setConfigState(prev => ({ ...prev, configMessage: 'Error updating season' }))
    } finally {
      setConfigState(prev => ({ ...prev, loadingConfig: false }))
      setTimeout(() => setConfigState(prev => ({ ...prev, configMessage: '' })), 5000)
    }
  }

  const autoUpdateWeekData = async () => {
    try {
      setConfigState(prev => ({ ...prev, loadingConfig: true, configMessage: 'Auto-updating week...' }))
      const data = await autoUpdateWeek()
      if (data.success) {
        setConfigState(prev => ({ ...prev, configMessage: 'Week auto-updated successfully' }))
        await fetchConfig()
      } else {
        setConfigState(prev => ({ ...prev, configMessage: 'Failed to auto-update week' }))
      }
    } catch (error) {
      setConfigState(prev => ({ ...prev, configMessage: 'Error auto-updating week' }))
    } finally {
      setConfigState(prev => ({ ...prev, loadingConfig: false }))
      setTimeout(() => setConfigState(prev => ({ ...prev, configMessage: '' })), 5000)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return {
    config,
    configState,
    setConfigState,
    fetchConfig,
    updateWeek,
    updateSeason,
    autoUpdateWeekData
  }
}
