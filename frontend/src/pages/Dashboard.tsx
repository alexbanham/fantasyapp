import React, { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import LiveScoreStrip from '../components/LiveScoreStrip'
import NFLWeekDisplay from '../components/dashboard/NFLWeekDisplay'
import GameHighlights from '../components/dashboard/GameHighlights'
import MatchupModal from '../components/dashboard/MatchupModal'
import MatchupCard from '../components/dashboard/MatchupCard'
import { 
  usePollingStatus, 
  useSyncOperations, 
  useConfig
} from '../hooks/useDashboard'
import { useMatchups } from '../hooks/useMatchups'
import { ConfigState } from '../types/dashboard'
import { getLiveGamesOnly, DetailedMatchup, LeagueMatchup } from '../services/api'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'

const Dashboard: React.FC = () => {
  // Custom hooks - only for dashboard-specific functionality
  const { pollingStatus, togglePollingConfig } = usePollingStatus()
  const { syncCurrentWeekPlayers, syncFantasyNewsData } = useSyncOperations()
  const { config, fetchConfig, configState, setConfigState } = useConfig()
  
  // Matchups hook - handles all matchup data fetching and caching
  const { matchups, detailedMatchups, loadingMatchups } = useMatchups({
    currentWeek: config?.currentWeek,
    currentSeason: config?.currentSeason,
    isPollingActive: pollingStatus.isPolling
  })
  
  // Check if there are live games
  const [hasLiveGames, setHasLiveGames] = useState(false)
  const [checkingLiveGames, setCheckingLiveGames] = useState(true)
  
  // Matchup modal state
  const [selectedMatchup, setSelectedMatchup] = useState<DetailedMatchup | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

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


  // Handle matchup click
  const handleMatchupClick = (matchupId: number) => {
    const detailedMatchup = detailedMatchups.find(m => m.matchupId === matchupId)
    if (detailedMatchup) {
      setSelectedMatchup(detailedMatchup)
      setModalOpen(true)
    }
  }

  // Get detailed matchup for a basic matchup
  const getDetailedMatchup = (matchup: LeagueMatchup): DetailedMatchup | null => {
    return detailedMatchups.find(m => m.matchupId === matchup.matchupId) || null
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* NFL Week Display */}
        <NFLWeekDisplay config={config} />

        {/* Main Content */}
        <div className="space-y-4 sm:space-y-6">
            
            {/* Live Games */}
            <LiveScoreStrip 
              className="mb-4 sm:mb-6" 
              isPollingActive={pollingStatus.isPolling}
              onLiveGamesRefresh={syncCurrentWeekPlayers}
            />

            {/* Highlights - Show when no live games (and not actively checking) */}
            {!checkingLiveGames && !hasLiveGames && (
              <div className="mb-4 sm:mb-6">
                <GameHighlights 
                  week={config?.currentWeek} 
                  season={config?.currentSeason}
                  isPollingActive={pollingStatus.isPolling}
                />
              </div>
            )}

            {/* Fantasy Matchups */}
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">
                    Week {config?.currentWeek || 'N/A'} Matchups
                  </h2>
                  {loadingMatchups && (
                    <Badge variant="secondary" className="ml-2 shrink-0 text-xs">Loading...</Badge>
                  )}
                </div>
              </div>

              {loadingMatchups ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center text-muted-foreground">
                      Loading matchups...
                    </div>
                  </CardContent>
                </Card>
              ) : matchups.length === 0 ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No matchups found for this week</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {matchups.map((matchup) => {
                    const detailed = getDetailedMatchup(matchup)
                    const hasDetailed = !!detailed
                    
                    return (
                      <MatchupCard
                        key={matchup.matchupId}
                        matchup={matchup}
                        onMatchupClick={hasDetailed ? handleMatchupClick : undefined}
                        showClickHint={hasDetailed}
                      />
                    )
                  })}
                </div>
              )}
            </div>

        </div>
      </div>

      {/* Matchup Modal */}
      <MatchupModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setSelectedMatchup(null)
        }}
        matchup={selectedMatchup}
      />
    </div>
  )
}

export default Dashboard
