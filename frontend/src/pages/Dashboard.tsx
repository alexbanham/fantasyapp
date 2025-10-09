import React, { useState, useEffect } from 'react'
import LiveScoreStrip from '../components/LiveScoreStrip'
import NewsFeed from '../components/dashboard/NewsFeed'
import ConfigurationModal from '../components/dashboard/ConfigurationModal'
import NFLWeekDisplay from '../components/dashboard/NFLWeekDisplay'
import GameHighlights from '../components/dashboard/GameHighlights'
import { 
  usePollingStatus, 
  useSyncOperations, 
  useConfig
} from '../hooks/useDashboard'
import { ConfigState } from '../types/dashboard'
import { getLiveGamesOnly } from '../services/api'

interface DashboardProps {
  configModalOpen: boolean
  onConfigModalClose: () => void
}

const Dashboard: React.FC<DashboardProps> = ({ configModalOpen, onConfigModalClose }) => {
  // Custom hooks
  const { pollingStatus, togglePollingConfig } = usePollingStatus()
  const { syncState, syncFantasyNewsData, syncAllPlayersESPN, syncCurrentWeekPlayers, syncAllBoxscores } = useSyncOperations()
  const { config, configState, setConfigState, updateWeek, updateSeason, autoUpdateWeekData, fetchConfig } = useConfig()
  
  // TODO: Load user roster and followed entities from config/user data
  const userRoster: string[] = []
  const followedEntities: string[] = []

  // Check if there are live games
  const [hasLiveGames, setHasLiveGames] = useState(false)
  const [checkingLiveGames, setCheckingLiveGames] = useState(true)

  useEffect(() => {
    const checkLiveGames = async () => {
      try {
        setCheckingLiveGames(true)
        const response = await getLiveGamesOnly()
        if (response.success && response.games && response.games.length > 0) {
          setHasLiveGames(true)
        } else {
          setHasLiveGames(false)
        }
      } catch (error) {
        setHasLiveGames(false)
      } finally {
        setCheckingLiveGames(false)
      }
    }

    checkLiveGames()
    // Check periodically when polling is active
    let interval: ReturnType<typeof setInterval> | null = null
    if (pollingStatus.isPolling) {
      interval = setInterval(checkLiveGames, 30000) // Check every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [pollingStatus.isPolling])

  // Polling control handlers
  const handleTogglePolling = async (enabled: boolean) => {
    await togglePollingConfig(enabled)
    // Refresh config to get updated pollingEnabled state
    await fetchConfig()
  }

  // Sync operation handlers
  const handleSyncNews = async () => {
    await syncFantasyNewsData()
  }

  // Config handlers
  const handleConfigStateChange = (updates: Partial<ConfigState>) => {
    setConfigState(prev => ({ ...prev, ...updates }))
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* NFL Week Display */}
        <NFLWeekDisplay config={config} />

        {/* Main Content */}
        <div className="space-y-6">
            
            {/* Live Games */}
            <LiveScoreStrip className="mb-6" isPollingActive={pollingStatus.isPolling} />

            {/* Highlights - Show when no live games (and not actively checking) */}
            {!checkingLiveGames && !hasLiveGames && (
              <div className="mb-6">
                <GameHighlights />
              </div>
            )}

          {/* News Feed */}
          <NewsFeed 
            userRoster={userRoster}
            followedEntities={followedEntities}
          />

        </div>
      </div>

      {/* Configuration Modal */}
      <ConfigurationModal
        isOpen={configModalOpen}
        onClose={onConfigModalClose}
        config={config}
        configState={configState}
        onConfigStateChange={handleConfigStateChange}
        onUpdateWeek={updateWeek}
        onUpdateSeason={updateSeason}
        onAutoUpdateWeek={autoUpdateWeekData}
        pollingStatus={pollingStatus}
        configEnabled={config?.pollingEnabled || false}
        onTogglePolling={handleTogglePolling}
        syncState={syncState}
        onSyncNews={handleSyncNews}
        onSyncAllPlayers={syncAllPlayersESPN}
        onSyncCurrentWeek={syncCurrentWeekPlayers}
        onSyncAllBoxscores={syncAllBoxscores}
      />
    </div>
  )
}

export default Dashboard
