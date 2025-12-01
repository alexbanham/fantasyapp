import React, { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import LiveScoreStrip from '../components/LiveScoreStrip'
import NFLWeekDisplay from '../components/dashboard/NFLWeekDisplay'
import GameHighlights from '../components/dashboard/GameHighlights'
import MatchupModal from '../components/dashboard/MatchupModal'
import { 
  usePollingStatus, 
  useSyncOperations, 
  useConfig
} from '../hooks/useDashboard'
import { ConfigState } from '../types/dashboard'
import { getLiveGamesOnly, getLeagueOverview, getLeagueBoxscores, syncRosteredPlayersCurrentWeek, LeagueMatchup, DetailedMatchup } from '../services/api'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { getCache, setCache } from '../lib/cache'

const Dashboard: React.FC = () => {
  // Custom hooks - only for dashboard-specific functionality
  const { pollingStatus, togglePollingConfig } = usePollingStatus()
  const { syncCurrentWeekPlayers, syncFantasyNewsData } = useSyncOperations()
  const { config, fetchConfig, configState, setConfigState } = useConfig()
  
  // Check if there are live games
  const [hasLiveGames, setHasLiveGames] = useState(false)
  const [checkingLiveGames, setCheckingLiveGames] = useState(true)
  
  // Matchups state
  const [matchups, setMatchups] = useState<LeagueMatchup[]>([])
  const [detailedMatchups, setDetailedMatchups] = useState<DetailedMatchup[]>([])
  const [loadingMatchups, setLoadingMatchups] = useState(true)
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

  // Fetch matchups
  const fetchMatchups = async () => {
    if (!config?.currentWeek || !config?.currentSeason) return
    
    try {
      setLoadingMatchups(true)
      
      // Sync rostered players for current week first to ensure data is up to date
      // Only sync rostered players (not all players) for efficiency
      try {
        await syncRosteredPlayersCurrentWeek()
      } catch (syncError) {
        console.warn('Error syncing rostered players (continuing anyway):', syncError)
        // Continue even if sync fails - user might have stale data but can still view matchups
      }
      
      // Fetch basic matchup data
      const leagueData = await getLeagueOverview(
        config.currentSeason,
        undefined,
        config.currentWeek
      )
      
      if (leagueData.success && leagueData.matchups) {
        setMatchups(leagueData.matchups)
        // Cache matchups
        const matchupsCacheKey = `dashboard_matchups_${config.currentSeason}_${config.currentWeek}`
        setCache(matchupsCacheKey, leagueData.matchups, 5 * 60 * 1000) // 5 minutes
      }
      
      // Fetch detailed boxscore data
      const boxscoreData = await getLeagueBoxscores(
        config.currentSeason,
        config.currentWeek
      )
      
      if (boxscoreData.success && boxscoreData.matchups) {
        setDetailedMatchups(boxscoreData.matchups)
        // Cache detailed matchups
        const detailedCacheKey = `dashboard_detailed_matchups_${config.currentSeason}_${config.currentWeek}`
        setCache(detailedCacheKey, boxscoreData.matchups, 5 * 60 * 1000) // 5 minutes
      }
    } catch (error) {
      console.error('Error fetching matchups:', error)
    } finally {
      setLoadingMatchups(false)
    }
  }

  // Restore cached matchups immediately on mount
  useEffect(() => {
    if (config?.currentWeek && config?.currentSeason) {
      const matchupsCacheKey = `dashboard_matchups_${config.currentSeason}_${config.currentWeek}`
      const detailedCacheKey = `dashboard_detailed_matchups_${config.currentSeason}_${config.currentWeek}`
      
      const cachedMatchups = getCache<LeagueMatchup[]>(matchupsCacheKey, 5 * 60 * 1000)
      const cachedDetailed = getCache<DetailedMatchup[]>(detailedCacheKey, 5 * 60 * 1000)
      
      if (cachedMatchups && cachedMatchups.length > 0) {
        setMatchups(cachedMatchups)
        setLoadingMatchups(false)
      }
      
      if (cachedDetailed && cachedDetailed.length > 0) {
        setDetailedMatchups(cachedDetailed)
      }
    }
  }, [config?.currentWeek, config?.currentSeason])

  // Fetch matchups when config changes
  useEffect(() => {
    if (config?.currentWeek && config?.currentSeason) {
      fetchMatchups()
    }
  }, [config?.currentWeek, config?.currentSeason])

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
                    
                    // Calculate expected score for win probability
                    // Primarily based on projected scores, with actuals used when available
                    // Since we don't have player-level status in dashboard cards:
                    // - If actual is very low/zero: games haven't started, use projected
                    // - If actual < projected: use projected (favors projection, assumes gap is unplayed players)
                    // - If actual >= projected: use actual (all players have played and met/exceeded)
                    const getTeamExpectedScore = (team: any): number => {
                      const actual = team.score || 0
                      const projected = team.projectedScore || 0
                      
                      // If no actual score yet or very low, use projected (games haven't started)
                      if (actual === 0 || actual < 5) {
                        return projected
                      }
                      
                      // If actual equals or exceeds projected, use actual
                      // (all players have played and met/exceeded projections)
                      if (actual >= projected) {
                        return actual
                      }
                      
                      // Actual < projected: primarily use projected
                      // This assumes the gap represents players who haven't played yet
                      // and will score their projected points
                      return projected
                    }
                    
                    const calculateWinProb = (teamScore: number, opponentScore: number): number => {
                      const diff = teamScore - opponentScore
                      const k = 0.02 // ESPN's sensitivity factor (validated to match their calculations)
                      return 1 / (1 + Math.exp(-k * diff))
                    }
                    
                    const awayExpected = getTeamExpectedScore(matchup.awayTeam)
                    const homeExpected = getTeamExpectedScore(matchup.homeTeam)
                    
                    const awayWinProb = calculateWinProb(awayExpected, homeExpected) * 100
                    const homeWinProb = calculateWinProb(homeExpected, awayExpected) * 100
                    
                    return (
                      <Card
                        key={matchup.matchupId}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 ${
                          hasDetailed ? 'hover:scale-[1.02] active:scale-[0.98]' : 'opacity-75'
                        }`}
                        onClick={() => hasDetailed && handleMatchupClick(matchup.matchupId)}
                      >
                        <CardContent className="p-3 sm:p-4 md:p-5">
                          {/* Status Badge */}
                          <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <Badge 
                              variant={
                                matchup.status === 'FINAL' ? 'default' :
                                matchup.status === 'IN_PROGRESS' ? 'secondary' :
                                'outline'
                              }
                              className="text-[10px] sm:text-xs"
                            >
                              {matchup.status.replace('_', ' ')}
                            </Badge>
                            {matchup.isPlayoff && (
                              <Badge variant="destructive" className="text-[10px] sm:text-xs">Playoff</Badge>
                            )}
                          </div>

                          {/* Teams */}
                          <div className="space-y-2 sm:space-y-3">
                            {/* Away Team */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                                {matchup.awayTeam.logo && (
                                  <img
                                    src={matchup.awayTeam.logo}
                                    alt={matchup.awayTeam.teamName}
                                    className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full object-cover shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-xs sm:text-sm truncate block">
                                    {matchup.awayTeam.teamName}
                                  </span>
                                  <Badge 
                                    variant="outline"
                                    className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 mt-0.5 ${
                                      awayWinProb >= 70 
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                        : awayWinProb >= 50
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        : awayWinProb >= 30
                                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}
                                  >
                                    {awayWinProb.toFixed(0)}%
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <div className="text-lg sm:text-xl font-bold">
                                  {matchup.awayTeam.score?.toFixed(1) || '0.0'}
                                </div>
                                {matchup.awayTeam.projectedScore > 0 && (
                                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                                    Proj: {matchup.awayTeam.projectedScore.toFixed(1)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* VS Divider */}
                            <div className="flex items-center justify-center py-0.5 sm:py-1">
                              <div className="w-full h-px bg-border/30" />
                              <span className="px-1.5 sm:px-2 text-[10px] sm:text-xs text-muted-foreground">VS</span>
                              <div className="w-full h-px bg-border/30" />
                            </div>

                            {/* Home Team */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                                {matchup.homeTeam.logo && (
                                  <img
                                    src={matchup.homeTeam.logo}
                                    alt={matchup.homeTeam.teamName}
                                    className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full object-cover shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <span className="font-semibold text-xs sm:text-sm truncate block">
                                    {matchup.homeTeam.teamName}
                                  </span>
                                  <Badge 
                                    variant="outline"
                                    className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 mt-0.5 ${
                                      homeWinProb >= 70 
                                        ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                        : homeWinProb >= 50
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        : homeWinProb >= 30
                                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}
                                  >
                                    {homeWinProb.toFixed(0)}%
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <div className="text-lg sm:text-xl font-bold">
                                  {matchup.homeTeam.score?.toFixed(1) || '0.0'}
                                </div>
                                {matchup.homeTeam.projectedScore > 0 && (
                                  <div className="text-[10px] sm:text-xs text-muted-foreground">
                                    Proj: {matchup.homeTeam.projectedScore.toFixed(1)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Click hint */}
                          {hasDetailed && (
                            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/20">
                              <div className="text-[10px] sm:text-xs text-center text-muted-foreground">
                                Tap to view detailed rosters
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
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
