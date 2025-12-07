import { useState, useEffect } from 'react'
import { 
  getLeagueOverview, 
  getLeagueBoxscores, 
  syncRosteredPlayersCurrentWeek,
  getPollingStatus,
  LeagueMatchup, 
  DetailedMatchup 
} from '../services/api'
import { getCache, setCache, getCacheAge } from '../lib/cache'

interface UseMatchupsOptions {
  currentWeek?: number | null
  currentSeason?: number | null
  isPollingActive?: boolean
}

interface UseMatchupsReturn {
  matchups: LeagueMatchup[]
  detailedMatchups: DetailedMatchup[]
  loadingMatchups: boolean
  fetchMatchups: (forceRefresh?: boolean, skipSync?: boolean) => Promise<void>
}

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export const useMatchups = ({
  currentWeek,
  currentSeason,
  isPollingActive = false
}: UseMatchupsOptions): UseMatchupsReturn => {
  const [matchups, setMatchups] = useState<LeagueMatchup[]>([])
  const [detailedMatchups, setDetailedMatchups] = useState<DetailedMatchup[]>([])
  const [loadingMatchups, setLoadingMatchups] = useState(false)
  const [lastPollingUpdate, setLastPollingUpdate] = useState<number | null>(null)

  // Fetch matchups with smart caching (stale-while-revalidate pattern)
  const fetchMatchups = async (forceRefresh = false, skipSync = false) => {
    if (!currentWeek || !currentSeason) return
    
    const matchupsCacheKey = `dashboard_matchups_${currentSeason}_${currentWeek}`
    const detailedCacheKey = `dashboard_detailed_matchups_${currentSeason}_${currentWeek}`
    
    // Check cache first (unless forcing refresh) - SYNCHRONOUSLY show cached data
    if (!forceRefresh) {
      const cachedMatchups = getCache<LeagueMatchup[]>(matchupsCacheKey, CACHE_TTL)
      const cachedDetailed = getCache<DetailedMatchup[]>(detailedCacheKey, CACHE_TTL)
      
      if (cachedMatchups && cachedMatchups.length > 0) {
        // Show cached data immediately - no loading state
        setMatchups(cachedMatchups)
        setLoadingMatchups(false)
      }
      
      if (cachedDetailed && cachedDetailed.length > 0) {
        setDetailedMatchups(cachedDetailed)
      }
      
      // If we have cached data, refresh in background WITHOUT blocking UI
      if (cachedMatchups && cachedDetailed) {
        // Background refresh - skip sync to avoid blocking, don't await
        fetchMatchups(true, true).catch(() => {
          // Silently fail background refresh
        })
        return // Exit early - cached data is already shown
      }
    }
    
    // No cache or forcing refresh - show loading and fetch fresh data
    // But don't show loading if this is a background refresh (skipSync=true means background)
    if ((forceRefresh || !getCache<LeagueMatchup[]>(matchupsCacheKey, CACHE_TTL)) && !skipSync) {
      setLoadingMatchups(true)
    }
    
    try {
      // Only sync rostered players if NOT skipping sync AND (forcing refresh OR cache is very stale)
      // Skip sync on background refreshes to avoid blocking
      if (!skipSync) {
        const cacheAge = getCacheAge(matchupsCacheKey)
        const shouldSync = forceRefresh && (!cacheAge || cacheAge > 5 * 60 * 1000) // Only sync if forcing refresh AND cache is > 5 min old
        
        if (shouldSync) {
          // Run sync in background without blocking - don't await
          syncRosteredPlayersCurrentWeek().catch((syncError) => {
            console.warn('Error syncing rostered players (continuing anyway):', syncError)
          })
        }
      }
      
      // Fetch basic matchup data
      const leagueData = await getLeagueOverview(
        currentSeason,
        undefined,
        currentWeek
      )
      
      if (leagueData.success && leagueData.matchups) {
        setMatchups(leagueData.matchups)
        // Cache matchups with longer TTL (10 minutes)
        setCache(matchupsCacheKey, leagueData.matchups, CACHE_TTL)
      }
      
      // Fetch detailed boxscore data
      const boxscoreData = await getLeagueBoxscores(
        currentSeason,
        currentWeek
      )
      
      if (boxscoreData.success && boxscoreData.matchups) {
        setDetailedMatchups(boxscoreData.matchups)
        // Cache detailed matchups with longer TTL (10 minutes)
        setCache(detailedCacheKey, boxscoreData.matchups, CACHE_TTL)
      }
    } catch (error) {
      console.error('Error fetching matchups:', error)
      // If fetch fails but we have cache, keep showing cache
      if (!forceRefresh) {
        const cachedMatchups = getCache<LeagueMatchup[]>(matchupsCacheKey, CACHE_TTL)
        const cachedDetailed = getCache<DetailedMatchup[]>(detailedCacheKey, CACHE_TTL)
        if (cachedMatchups) setMatchups(cachedMatchups)
        if (cachedDetailed) setDetailedMatchups(cachedDetailed)
      }
    } finally {
      setLoadingMatchups(false)
    }
  }

  // Load cached data IMMEDIATELY when config is available (synchronous cache check)
  useEffect(() => {
    if (!currentWeek || !currentSeason) return
    
    const matchupsCacheKey = `dashboard_matchups_${currentSeason}_${currentWeek}`
    const detailedCacheKey = `dashboard_detailed_matchups_${currentSeason}_${currentWeek}`
    
    // Check cache synchronously FIRST - this happens immediately, no async operations
    const cachedMatchups = getCache<LeagueMatchup[]>(matchupsCacheKey, CACHE_TTL)
    const cachedDetailed = getCache<DetailedMatchup[]>(detailedCacheKey, CACHE_TTL)
    
    const hasCache = cachedMatchups && cachedMatchups.length > 0 && cachedDetailed && cachedDetailed.length > 0
    
    if (hasCache) {
      // Show cached data immediately - no loading state, no async operations
      // This happens synchronously, so UI updates instantly
      setMatchups(cachedMatchups)
      setDetailedMatchups(cachedDetailed)
      setLoadingMatchups(false)
      
      // Background refresh - use setTimeout to ensure UI renders cached data first
      setTimeout(() => {
        fetchMatchups(true, true).catch(() => {
          // Silently fail background refresh
        })
      }, 50) // Small delay to ensure cached data renders first
    } else {
      // No cache - show loading and fetch fresh data
      setLoadingMatchups(true)
      fetchMatchups(false, false)
    }
  }, [currentWeek, currentSeason])

  // Refresh matchup data when polling updates occur (to reflect updated scores/projections)
  useEffect(() => {
    if (!isPollingActive || !currentWeek || !currentSeason) return

    // Poll for polling status updates to detect when data is refreshed
    const checkPollingUpdates = async () => {
      try {
        const statusData = await getPollingStatus()
        
        if (statusData.success && statusData.pollingStatus?.lastPollTime) {
          const lastPollTime = new Date(statusData.pollingStatus.lastPollTime).getTime()
          
          // If this is the first check or polling has updated since last check, refresh matchups
          setLastPollingUpdate(prev => {
            if (prev === null || lastPollTime > prev) {
              // Polling has updated data - refresh matchups in background (skip sync to avoid blocking)
              fetchMatchups(true, true).catch(() => {
                // Silently fail
              })
              return lastPollTime
            }
            return prev
          })
        }
      } catch (error) {
        // Silently fail - polling status check shouldn't block UI
      }
    }

    // Check for polling updates every 30 seconds when polling is active
    // This matches the polling interval, so we'll catch updates as they happen
    const pollingInterval = setInterval(checkPollingUpdates, 30000)
    
    // Also check immediately when polling becomes active
    checkPollingUpdates()

    return () => {
      clearInterval(pollingInterval)
    }
  }, [isPollingActive, currentWeek, currentSeason])

  return {
    matchups,
    detailedMatchups,
    loadingMatchups,
    fetchMatchups
  }
}





