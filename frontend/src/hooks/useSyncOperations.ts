import { useState } from 'react'
import { 
  syncAllGames, 
  syncAllESPNData,
  syncCurrentWeekESPNData,
  syncAllNews, 
  syncPlayers, 
  syncWeeklyProjections, 
  syncAllWeeklyProjections, 
  syncAllPlayerData,
  syncAIProjectionsData,
  backfillBoxscores,
  syncBettingOddsForWeek,
  syncPlayerPropsForWeek
} from '../services/api'
import { SyncState } from '../types/dashboard'

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
    boxscoresSyncMessage: '',
    syncingBettingOdds: false,
    bettingOddsSyncMessage: '',
    syncingPlayerProps: false,
    playerPropsSyncMessage: ''
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

  const syncBettingOdds = async (week: number, season: number) => {
    try {
      setSyncState(prev => ({ ...prev, syncingBettingOdds: true, bettingOddsSyncMessage: `Syncing betting odds for Week ${week}, Season ${season}...` }))
      const data = await syncBettingOddsForWeek(week, season)
      if (data.success) {
        const results = data.results || {}
        const creditsUsed = results.creditsUsed || 0
        const successCount = results.success || 0
        const failedCount = results.failed || 0
        setSyncState(prev => ({ 
          ...prev, 
          bettingOddsSyncMessage: `Betting odds sync complete: ${successCount} games synced, ${failedCount} failed (${creditsUsed} credits used)` 
        }))
      } else {
        setSyncState(prev => ({ ...prev, bettingOddsSyncMessage: `Betting odds sync failed: ${data.error || 'Unknown error'}` }))
      }
    } catch (error: any) {
      setSyncState(prev => ({ ...prev, bettingOddsSyncMessage: `Betting odds sync error: ${error.message || 'Unknown error'}` }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingBettingOdds: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, bettingOddsSyncMessage: '' })), 8000)
    }
  }

  const syncPlayerProps = async (week: number, season: number) => {
    try {
      setSyncState(prev => ({ ...prev, syncingPlayerProps: true, playerPropsSyncMessage: `Syncing player props for Week ${week}, Season ${season}...` }))
      const data = await syncPlayerPropsForWeek(week, season)
      if (data.success) {
        const results = data.results || {}
        const creditsUsed = results.creditsUsed || 0
        const successCount = results.success || 0
        const failedCount = results.failed || 0
        const totalProps = results.totalProps || 0
        setSyncState(prev => ({
          ...prev,
          playerPropsSyncMessage: `Player props sync complete: ${successCount} games synced, ${totalProps} props stored (${creditsUsed} credits used)` 
        }))
      } else {
        setSyncState(prev => ({ ...prev, playerPropsSyncMessage: `Player props sync failed: ${data.error || 'Unknown error'}` }))
      }
    } catch (error: any) {
      setSyncState(prev => ({ ...prev, playerPropsSyncMessage: `Player props sync error: ${error.message || 'Unknown error'}` }))
    } finally {
      setSyncState(prev => ({ ...prev, syncingPlayerProps: false }))
      setTimeout(() => setSyncState(prev => ({ ...prev, playerPropsSyncMessage: '' })), 8000)
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
    syncAllBoxscores,
    syncBettingOdds,
    syncPlayerProps
  }
}

