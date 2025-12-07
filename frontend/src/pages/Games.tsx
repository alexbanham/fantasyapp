import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Trophy, 
  Star,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Table,
  Target,
  Info
} from 'lucide-react'
import { getGamesByWeek, getLiveGames, getConfig, getGameScorers, getNFLStandings, getPlayoffScenarios, type NFLStandingsResponse, type NFLTeam, type PlayoffScenariosResponse } from '../services/api'
import { getCache, setCache } from '../lib/cache'
import { useColorScheme } from '../contexts/ColorSchemeContext'
import { getBackgroundClass } from '../lib/colorSchemes'
import { getTeamLogoWithFallback, getDSTTeamAbbr } from '../lib/teamLogos'

interface Game {
  eventId: string
  week: number
  season: number
  status: string
  period: number
  clock: string
  score: string
  homeTeam: {
    abbreviation: string
    name: string
    score: number
    logo: string
  }
  awayTeam: {
    abbreviation: string
    name: string
    score: number
    logo: string
  }
  isLive: boolean
  date: string
  venue: string
}

interface HighlightedPlayer {
  name: string
  position: string
  team: string
  fantasyPoints: number
  stats: {
    rushingYards?: number
    passingYards?: number
    receivingYards?: number
    touchdowns?: number
  }
}

interface GameTakeaway {
  type: 'offensive' | 'defensive' | 'special' | 'injury'
  description: string
  impact: 'high' | 'medium' | 'low'
}

interface FantasyScorer {
  espnId: string
  name: string
  position: string
  proTeamId: string
  fantasyPoints: number
  projectedPoints: number
  roster_status?: string
  fantasy_team_name?: string
  fantasy_team_id?: string
  headshot_url?: string
}

interface GameScorers {
  homePlayers: FantasyScorer[]
  awayPlayers: FantasyScorer[]
  homeTeam: { abbreviation: string; name: string }
  awayTeam: { abbreviation: string; name: string }
}

type TabType = 'games' | 'standings'

const Games = () => {
  const { colorScheme } = useColorScheme()
  const [activeTab, setActiveTab] = useState<TabType>('games')
  const [games, setGames] = useState<Game[]>([])
  const [currentWeek, setCurrentWeek] = useState<number | null>(null)
  const [currentSeason, setCurrentSeason] = useState<number | null>(null)
  const [configLoaded, setConfigLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [gameScorers, setGameScorers] = useState<GameScorers | null>(null)
  const [loadingScorers, setLoadingScorers] = useState(false)
  const [allGameScorers, setAllGameScorers] = useState<Record<string, GameScorers>>({})
  const [loadingScorersForGames, setLoadingScorersForGames] = useState<Set<string>>(new Set())
  
  // Standings state
  const [standings, setStandings] = useState<NFLStandingsResponse | null>(null)
  const [loadingStandings, setLoadingStandings] = useState(false)
  const [selectedConference, setSelectedConference] = useState<'AFC' | 'NFC'>('AFC')
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [playoffScenarios, setPlayoffScenarios] = useState<PlayoffScenariosResponse | null>(null)
  const [loadingScenarios, setLoadingScenarios] = useState(false)

  // Mock data for highlighted players and takeaways
  const mockHighlightedPlayers: HighlightedPlayer[] = [
    {
      name: "Josh Allen",
      position: "QB",
      team: "BUF",
      fantasyPoints: 28.4,
      stats: {
        passingYards: 312,
        touchdowns: 3
      }
    },
    {
      name: "Christian McCaffrey",
      position: "RB",
      team: "SF",
      fantasyPoints: 24.7,
      stats: {
        rushingYards: 145,
        receivingYards: 23,
        touchdowns: 2
      }
    }
  ]

  const mockTakeaways: GameTakeaway[] = [
    {
      type: 'offensive',
      description: 'Bills offense struggled in red zone, converting only 2 of 5 opportunities',
      impact: 'high'
    },
    {
      type: 'defensive',
      description: 'Chiefs defense stepped up in second half, allowing only 3 points',
      impact: 'medium'
    },
    {
      type: 'injury',
      description: 'Key defensive player left game with ankle injury in 3rd quarter',
      impact: 'high'
    }
  ]

  const fetchGames = async (week: number, season?: number) => {
    try {
      setLoading(true)
      setError(null)
      // Don't clear games immediately - keep showing previous games until new ones are ready
      // This prevents jarring transitions
      
      // Use provided season or fall back to currentSeason
      const seasonToUse = season || currentSeason || new Date().getFullYear()
      
      // Safety check - ensure we have valid week and season
      if (!week || week < 1 || week > 18) {
        throw new Error('Invalid week number')
      }
      
      // Fetch games in real-time from ESPN API
      const response = await getGamesByWeek(week, seasonToUse, true)
      if (response.success) {
        // Only update games once we have all the data
        const fetchedGames = response.games || []
        setGames(fetchedGames)
        
        // Clear old scorers when week changes
        setAllGameScorers({})
        
        // Fetch scorers for all games
        fetchScorersForGames(fetchedGames, week)
      } else {
        setError('Failed to fetch games')
        // Clear games on error
        setGames([])
      }
    } catch (err) {
      setError('Error fetching games')
      // Clear games on error
      setGames([])
    } finally {
      setLoading(false)
    }
  }

  const fetchScorersForGames = async (games: Game[], week: number) => {
    // Only fetch scorers for completed games to reduce API calls
    const completedGames = games.filter(g => g.status === 'STATUS_FINAL')
    
    // Fetch scorers for completed games in parallel (with rate limiting)
    // Process in batches of 3 to avoid overwhelming the API
    const batchSize = 3
    for (let i = 0; i < completedGames.length; i += batchSize) {
      const batch = completedGames.slice(i, i + batchSize)
      const scorerPromises = batch.map(async (game) => {
        // Skip if already loading or already loaded
        if (loadingScorersForGames.has(game.eventId) || allGameScorers[game.eventId]) {
          return
        }

        setLoadingScorersForGames(prev => new Set(prev).add(game.eventId))
        
        try {
          const response = await getGameScorers(
            game.eventId,
            game.homeTeam.abbreviation,
            game.awayTeam.abbreviation,
            week
          )
          if (response.success) {
            setAllGameScorers(prev => ({
              ...prev,
              [game.eventId]: response
            }))
          }
        } catch (err) {
          // Silently fail for individual game scorers
        } finally {
          setLoadingScorersForGames(prev => {
            const newSet = new Set(prev)
            newSet.delete(game.eventId)
            return newSet
          })
        }
      })

      await Promise.all(scorerPromises)
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < completedGames.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  }

  // Fetch initial config to get current week
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await getConfig()
        if (config.success && config.data) {
          setCurrentWeek(config.data.currentWeek)
          setCurrentSeason(config.data.currentSeason)
          setConfigLoaded(true)
        } else {
          // Fallback if config fails
          setCurrentWeek(1)
          setCurrentSeason(new Date().getFullYear())
          setConfigLoaded(true)
        }
      } catch (err) {
        // Fallback if config fetch fails
        console.warn('Failed to fetch config, using defaults:', err)
        setCurrentWeek(1)
        setCurrentSeason(new Date().getFullYear())
        setConfigLoaded(true)
      }
    }
    fetchConfig()
  }, [])

  // Fetch standings with client-side caching
  const fetchStandings = useCallback(async () => {
    // Check cache first (5 minute TTL)
    const cacheKey = `nfl-standings-${currentSeason}`
    const cached = getCache<NFLStandingsResponse>(cacheKey, 5 * 60 * 1000)
    
    if (cached) {
      console.log('Using cached standings')
      setStandings(cached)
      setLoadingStandings(false)
      return
    }
    
    try {
      setLoadingStandings(true)
      const response = await getNFLStandings(currentSeason ?? undefined)
      if (response.success) {
        setStandings(response)
        // Cache the response
        setCache(cacheKey, response, 5 * 60 * 1000)
      }
    } catch (err) {
      console.error('Error fetching standings:', err)
    } finally {
      setLoadingStandings(false)
    }
  }, [currentSeason])

  // Fetch playoff scenarios for a team
  const fetchPlayoffScenarios = useCallback(async (teamAbbr: string) => {
    try {
      setLoadingScenarios(true)
      const response = await getPlayoffScenarios(teamAbbr, currentSeason ?? undefined, currentWeek ?? undefined)
      if (response.success) {
        setPlayoffScenarios(response)
      }
    } catch (err) {
      console.error('Error fetching playoff scenarios:', err)
    } finally {
      setLoadingScenarios(false)
    }
  }, [currentSeason, currentWeek])

  useEffect(() => {
    if (activeTab === 'standings') {
      fetchStandings()
    }
  }, [activeTab, fetchStandings])

  // Fetch scorers when a game is selected
  useEffect(() => {
    const fetchScorers = async () => {
      if (selectedGame) {
        setLoadingScorers(true)
        setGameScorers(null)
        try {
          const response = await getGameScorers(
            selectedGame.eventId,
            selectedGame.homeTeam.abbreviation,
            selectedGame.awayTeam.abbreviation,
            selectedGame.week
          )
          if (response.success) {
            setGameScorers(response)
          }
        } catch (err) {
        } finally {
          setLoadingScorers(false)
        }
      }
    }
    fetchScorers()
  }, [selectedGame])

  const fetchLiveGames = async () => {
    try {
      const response = await getLiveGames({ live_only: true })
      if (response.success) {
        // Update games with live data only if we have existing games
        // This prevents updating during initial load
        setGames(prevGames => {
          // If we have no games, don't update (wait for main fetch to complete)
          if (prevGames.length === 0) {
            return prevGames
          }
          
          return prevGames.map(game => {
            const liveGame = response.games.find((lg: Game) => lg.eventId === game.eventId)
            return liveGame ? { ...game, ...liveGame } : game
          })
        })
      }
    } catch (err) {
      // Silently fail for live updates
    }
  }

  useEffect(() => {
    // Only fetch games after config is loaded and we have valid week/season
    if (configLoaded && currentWeek !== null && currentWeek > 0 && currentSeason !== null && currentSeason > 0) {
      fetchGames(currentWeek, currentSeason)
    }
  }, [currentWeek, currentSeason, configLoaded])

  // Poll for live updates every 30 seconds, but only if we have games loaded
  useEffect(() => {
    if (games.length === 0) {
      return // Don't poll if no games are loaded yet
    }
    
    const interval = setInterval(() => {
      fetchLiveGames()
    }, 30000)

    return () => clearInterval(interval)
  }, [games.length])

  const getStatusBadge = (status: string, isLive: boolean) => {
    if (isLive) {
      return <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
    }
    
    switch (status) {
      case 'STATUS_FINAL':
        return <Badge variant="secondary">FINAL</Badge>
      case 'STATUS_SCHEDULED':
        return <Badge variant="outline">SCHEDULED</Badge>
      case 'STATUS_IN':
        return <Badge variant="default">IN PROGRESS</Badge>
      case 'STATUS_HALFTIME':
        return <Badge variant="default">HALFTIME</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-500'
      case 'medium':
        return 'text-yellow-500'
      case 'low':
        return 'text-green-500'
      default:
        return 'text-gray-500'
    }
  }

  const getTakeawayIcon = (type: string) => {
    switch (type) {
      case 'offensive':
        return <TrendingUp className="h-4 w-4" />
      case 'defensive':
        return <Users className="h-4 w-4" />
      case 'special':
        return <Trophy className="h-4 w-4" />
      case 'injury':
        return <Star className="h-4 w-4" />
      default:
        return <Star className="h-4 w-4" />
    }
  }

  const handleTeamClick = (teamAbbr: string) => {
    setSelectedTeam(teamAbbr)
    fetchPlayoffScenarios(teamAbbr)
  }

  return (
    <div className="min-h-screen">
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Games & Standings</h1>
          <p className="text-muted-foreground mt-1">
            {activeTab === 'games' 
              ? currentWeek !== null && currentSeason !== null 
                ? `Week ${currentWeek} • ${currentSeason} Season` 
                : 'Loading...'
              : currentSeason !== null 
                ? `${currentSeason} NFL Standings` 
                : 'Loading...'}
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {activeTab === 'games' && currentWeek !== null && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                disabled={currentWeek <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm font-medium px-3 py-1 bg-accent rounded-md">
                Week {currentWeek}
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(currentWeek + 1)}
                disabled={currentWeek >= 18}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchGames(currentWeek ?? 1, currentSeason ?? undefined)}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </>
          )}
          {activeTab === 'standings' && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStandings}
              disabled={loadingStandings}
            >
              <RefreshCw className={`h-4 w-4 ${loadingStandings ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-border">
        <button
          onClick={() => setActiveTab('games')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'games'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Games</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('standings')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'standings'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Table className="h-4 w-4" />
            <span>Standings & Playoffs</span>
          </div>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-950/20 glass border-border/30">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {/* Content based on active tab */}
      {activeTab === 'games' ? (
        <>
          {/* Games Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground">Loading games...</p>
          </div>
        </div>
      ) : games.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No games found</p>
            <p className="text-sm mt-2">
              {currentWeek !== null ? `No games scheduled for Week ${currentWeek}` : 'Loading games...'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card 
              key={game.eventId} 
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedGame(game)}
            >
              {/* Game Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatDate(game.date)}
                  </span>
                </div>
                {getStatusBadge(game.status, game.isLive)}
              </div>

              {/* Teams and Score */}
              <div className="space-y-4">
                {/* Away Team */}
                <div className="flex items-center justify-between p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {game.awayTeam.logo ? (
                      <img 
                        src={game.awayTeam.logo} 
                        alt={game.awayTeam.abbreviation}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold">{game.awayTeam.abbreviation}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{game.awayTeam.name}</p>
                      <p className="text-sm text-muted-foreground">{game.awayTeam.abbreviation}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center space-x-2">
                    {game.status === 'STATUS_FINAL' && game.awayTeam.score > game.homeTeam.score && (
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    )}
                    <p className="text-2xl font-bold">{game.awayTeam.score}</p>
                  </div>
                </div>

                {/* VS Divider */}
                <div className="flex items-center justify-center">
                  <div className="h-px bg-border flex-1"></div>
                  <span className="px-3 text-sm text-muted-foreground">VS</span>
                  <div className="h-px bg-border flex-1"></div>
                </div>

                {/* Home Team */}
                <div className="flex items-center justify-between p-3 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {game.homeTeam.logo ? (
                      <img 
                        src={game.homeTeam.logo} 
                        alt={game.homeTeam.abbreviation}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold">{game.homeTeam.abbreviation}</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{game.homeTeam.name}</p>
                      <p className="text-sm text-muted-foreground">{game.homeTeam.abbreviation}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center space-x-2">
                    {game.status === 'STATUS_FINAL' && game.homeTeam.score > game.awayTeam.score && (
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    )}
                    <p className="text-2xl font-bold">{game.homeTeam.score}</p>
                  </div>
                </div>
              </div>

              {/* Top Fantasy Performers - Only show for completed games */}
              {allGameScorers[game.eventId] && game.status === 'STATUS_FINAL' && (() => {
                const scorers = allGameScorers[game.eventId]
                
                // Get top 2 performers per team
                const topAway = scorers.awayPlayers.slice(0, 2)
                const topHome = scorers.homePlayers.slice(0, 2)
                
                // Find busts (10+ points under projection) that aren't already in top performers
                const awayBusts = scorers.awayPlayers
                  .filter(p => {
                    const diff = p.fantasyPoints - (p.projectedPoints || 0)
                    return diff <= -10 && !topAway.some(tp => tp.espnId === p.espnId)
                  })
                  .slice(0, 1) // Show max 1 additional bust
                
                const homeBusts = scorers.homePlayers
                  .filter(p => {
                    const diff = p.fantasyPoints - (p.projectedPoints || 0)
                    return diff <= -10 && !topHome.some(tp => tp.espnId === p.espnId)
                  })
                  .slice(0, 1) // Show max 1 additional bust
                
                const hasPerformers = topAway.length > 0 || topHome.length > 0 || awayBusts.length > 0 || homeBusts.length > 0
                
                if (!hasPerformers) return null
                
                const renderPlayer = (player: FantasyScorer) => {
                  const diff = player.fantasyPoints - (player.projectedPoints || 0)
                  const isBust = diff <= -10
                  return (
                    <div
                      key={player.espnId}
                      className={`flex items-center justify-between text-xs p-1.5 rounded ${
                        isBust ? 'bg-red-500/10 border border-red-500/20' : 'bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                        {(player.position === 'DST' || player.position === 'D/ST') ? (() => {
                          const teamAbbr = getDSTTeamAbbr(player);
                          return teamAbbr ? (
                            <img
                              src={getTeamLogoWithFallback(teamAbbr)}
                              alt={player.name}
                              className="w-5 h-5 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-bold">${player.name.charAt(0)}</div>`;
                                }
                              }}
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-bold">
                              {player.name.charAt(0)}
                            </div>
                          );
                        })() : player.headshot_url ? (
                          <img
                            src={player.headshot_url}
                            alt={player.name}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-bold">
                            {player.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{player.name}</p>
                          <p className="text-[10px] text-muted-foreground">{player.position}</p>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="flex items-center space-x-1">
                          <span className={`font-bold ${
                            diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-foreground'
                          }`}>
                            {player.fantasyPoints.toFixed(1)}
                          </span>
                          {player.projectedPoints !== undefined && player.projectedPoints !== null && (
                            <span className="text-[10px] text-muted-foreground line-through">
                              {player.projectedPoints.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {diff !== 0 && player.projectedPoints !== undefined && player.projectedPoints !== null && (
                          <p className={`text-[9px] ${
                            diff > 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                }
                
                return (
                  <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center space-x-1">
                      <Star className="h-3 w-3" />
                      <span>Top Performers</span>
                    </h4>
                    <div className="space-y-2">
                      {/* Away Team Top Performers */}
                      {(topAway.length > 0 || awayBusts.length > 0) && (
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">
                            {game.awayTeam.abbreviation}
                          </p>
                          <div className="space-y-1">
                            {[...topAway, ...awayBusts].map(renderPlayer)}
                          </div>
                        </div>
                      )}

                      {/* Home Team Top Performers */}
                      {(topHome.length > 0 || homeBusts.length > 0) && (
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground mb-1">
                            {game.homeTeam.abbreviation}
                          </p>
                          <div className="space-y-1">
                            {[...topHome, ...homeBusts].map(renderPlayer)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Game Info */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  {game.venue && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>{game.venue}</span>
                    </div>
                  )}
                  {game.isLive && game.clock && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{game.clock}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
        </>
      ) : (
        /* Standings View */
        <div className="space-y-6">
          {loadingStandings ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground">Loading standings...</p>
              </div>
            </div>
          ) : standings ? (
            <>
              {/* Conference Toggle */}
              <div className="flex space-x-2 justify-center">
                <Button
                  variant={selectedConference === 'AFC' ? 'default' : 'outline'}
                  onClick={() => setSelectedConference('AFC')}
                >
                  AFC
                </Button>
                <Button
                  variant={selectedConference === 'NFC' ? 'default' : 'outline'}
                  onClick={() => setSelectedConference('NFC')}
                >
                  NFC
                </Button>
              </div>

              {/* Playoff Picture */}
              <Card className="p-6 glass border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold flex items-center space-x-2">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    <span>Playoff Picture - {selectedConference}</span>
                  </h2>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {standings.conferences[selectedConference] && 
                    Object.values(standings.conferences[selectedConference].divisions)
                      .flatMap(div => div.teams)
                      .sort((a, b) => (a.playoffSeed || 99) - (b.playoffSeed || 99))
                      .slice(0, 7)
                      .map((team) => (
                        <div
                          key={team.id}
                          className={`p-3 rounded-lg border-2 ${
                            team.inPlayoffs
                              ? 'border-yellow-500 bg-yellow-500/10'
                              : 'border-border bg-accent/50'
                          } cursor-pointer hover:shadow-lg transition-shadow`}
                          onClick={() => handleTeamClick(team.abbreviation)}
                        >
                          <div className="text-center">
                            {team.playoffSeed && (
                              <div className="text-xs font-bold text-yellow-500 mb-1">
                                #{team.playoffSeed}
                              </div>
                            )}
                            {team.logo ? (
                              <img
                                src={team.logo}
                                alt={team.abbreviation}
                                className="w-12 h-12 mx-auto mb-2 object-contain"
                              />
                            ) : (
                              <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-xs font-bold">{team.abbreviation}</span>
                              </div>
                            )}
                            <div className="text-xs font-medium">{team.abbreviation}</div>
                            <div className="text-xs text-muted-foreground">
                              {team.wins}-{team.losses}{team.ties > 0 ? `-${team.ties}` : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                </div>
              </Card>

              {/* Standings by Division */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {standings.conferences[selectedConference] &&
                  Object.entries(standings.conferences[selectedConference].divisions).map(
                    ([divName, division]) => (
                      <Card key={divName} className="p-6 glass border-border/30">
                        <h3 className="text-xl font-bold mb-4">{divName}</h3>
                        <div className="space-y-2">
                          {division.teams.map((team, index) => (
                            <div
                              key={team.id}
                              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                                team.inPlayoffs
                                  ? 'bg-yellow-500/10 border border-yellow-500/30'
                                  : 'bg-accent/50 hover:bg-accent'
                              }`}
                              onClick={() => handleTeamClick(team.abbreviation)}
                            >
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="text-sm font-medium w-6">
                                  {team.divisionRank}
                                </div>
                                {team.logo ? (
                                  <img
                                    src={team.logo}
                                    alt={team.abbreviation}
                                    className="w-8 h-8 object-contain"
                                  />
                                ) : (
                                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                    <span className="text-xs font-bold">{team.abbreviation}</span>
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="font-medium">{team.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {team.abbreviation}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">
                                  {team.wins}-{team.losses}
                                  {team.ties > 0 && `-${team.ties}`}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {team.winPercentage.toFixed(3)}
                                </div>
                                {team.playoffSeed && (
                                  <Badge variant="secondary" className="mt-1">
                                    #{team.playoffSeed}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )
                  )}
              </div>

              {/* Full Conference Standings */}
              <Card className="p-6 glass border-border/30">
                <h3 className="text-xl font-bold mb-4">
                  {selectedConference} Conference Standings
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2">Rank</th>
                        <th className="text-left p-2">Team</th>
                        <th className="text-center p-2">W</th>
                        <th className="text-center p-2">L</th>
                        <th className="text-center p-2">T</th>
                        <th className="text-center p-2">PCT</th>
                        <th className="text-center p-2">PF</th>
                        <th className="text-center p-2">PA</th>
                        <th className="text-center p-2">Seed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.conferences[selectedConference] &&
                        Object.values(standings.conferences[selectedConference].divisions)
                          .flatMap(div => div.teams)
                          .sort((a, b) => a.conferenceRank - b.conferenceRank)
                          .map((team) => (
                            <tr
                              key={team.id}
                              className={`border-b border-border/50 hover:bg-accent/50 cursor-pointer ${
                                team.inPlayoffs ? 'bg-yellow-500/5' : ''
                              }`}
                              onClick={() => handleTeamClick(team.abbreviation)}
                            >
                              <td className="p-2">{team.conferenceRank}</td>
                              <td className="p-2">
                                <div className="flex items-center space-x-2">
                                  {team.logo ? (
                                    <img
                                      src={team.logo}
                                      alt={team.abbreviation}
                                      className="w-6 h-6 object-contain"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                                      <span className="text-[10px] font-bold">{team.abbreviation}</span>
                                    </div>
                                  )}
                                  <span className="font-medium">{team.abbreviation}</span>
                                </div>
                              </td>
                              <td className="text-center p-2">{team.wins}</td>
                              <td className="text-center p-2">{team.losses}</td>
                              <td className="text-center p-2">{team.ties}</td>
                              <td className="text-center p-2">{team.winPercentage.toFixed(3)}</td>
                              <td className="text-center p-2">{team.pointsFor}</td>
                              <td className="text-center p-2">{team.pointsAgainst}</td>
                              <td className="text-center p-2">
                                {team.playoffSeed ? (
                                  <Badge variant="secondary">#{team.playoffSeed}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No standings data available</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Playoff Scenarios Modal */}
      {selectedTeam && playoffScenarios && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto glass border-border/30">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center space-x-2">
                    <Target className="h-6 w-6" />
                    <span>Playoff Scenarios - {playoffScenarios.team.abbreviation}</span>
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {playoffScenarios.team.name} • {playoffScenarios.conference} • {playoffScenarios.division}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTeam(null)
                    setPlayoffScenarios(null)
                  }}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <Card className="p-4 bg-accent/50">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-sm text-muted-foreground">Current Record</div>
                      <div className="text-2xl font-bold">{playoffScenarios.currentRecord}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Games Remaining</div>
                      <div className="text-2xl font-bold">{playoffScenarios.gamesRemaining}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Week</div>
                      <div className="text-2xl font-bold">{playoffScenarios.currentWeek}</div>
                    </div>
                  </div>
                </Card>

                {playoffScenarios.scenarios.map((scenario, index) => (
                  <Card
                    key={index}
                    className={`p-4 ${
                      scenario.canMakePlayoffs
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    } border`}
                  >
                    <div className="flex items-start space-x-3">
                      <Info className="h-5 w-5 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{scenario.description}</h3>
                        {scenario.winsNeeded > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Wins needed: <span className="font-medium">{scenario.winsNeeded}</span>
                          </div>
                        )}
                        <div className="mt-2 text-sm">
                          <div>Best case: {scenario.bestCaseRecord}</div>
                          <div>Worst case: {scenario.worstCaseRecord}</div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Game Details Modal */}
      {selectedGame && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto glass border-border/30">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">
                    {selectedGame.awayTeam.abbreviation} @ {selectedGame.homeTeam.abbreviation}
                  </h2>
                  <p className="text-muted-foreground">
                    Week {selectedGame.week} • {formatDate(selectedGame.date)}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedGame(null)}
                >
                  ×
                </Button>
              </div>

              {/* Score Display */}
              <div className="bg-gradient-to-r from-charcoal-500/10 to-slate-500/10 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between p-4 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {selectedGame.awayTeam.logo && (
                      <img 
                        src={selectedGame.awayTeam.logo} 
                        alt={selectedGame.awayTeam.abbreviation}
                        className="w-12 h-12 object-contain"
                      />
                    )}
                    <div>
                      <p className="text-lg font-semibold">{selectedGame.awayTeam.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedGame.awayTeam.abbreviation}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {selectedGame.status === 'STATUS_FINAL' && selectedGame.awayTeam.score > selectedGame.homeTeam.score && (
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    )}
                    <div className="text-4xl font-bold">{selectedGame.awayTeam.score}</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-center my-4">
                  <div className="h-px bg-border flex-1"></div>
                  <span className="px-4 text-lg font-medium">VS</span>
                  <div className="h-px bg-border flex-1"></div>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {selectedGame.homeTeam.logo && (
                      <img 
                        src={selectedGame.homeTeam.logo} 
                        alt={selectedGame.homeTeam.abbreviation}
                        className="w-12 h-12 object-contain"
                      />
                    )}
                    <div>
                      <p className="text-lg font-semibold">{selectedGame.homeTeam.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedGame.homeTeam.abbreviation}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {selectedGame.status === 'STATUS_FINAL' && selectedGame.homeTeam.score > selectedGame.awayTeam.score && (
                      <Trophy className="h-6 w-6 text-yellow-500" />
                    )}
                    <div className="text-4xl font-bold">{selectedGame.homeTeam.score}</div>
                  </div>
                </div>
              </div>

              {/* Fantasy Scorers */}
              {loadingScorers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
                </div>
              ) : gameScorers ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Away Team Scorers */}
                  <Card className="p-6 glass border-border/30">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <Star className="h-5 w-5 text-blue-500" />
                      <span>{gameScorers.awayTeam.name}</span>
                    </h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {gameScorers.awayPlayers.length > 0 ? (
                        gameScorers.awayPlayers.map((player, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                            <div className="flex items-center space-x-2">
                              {(player.position === 'DST' || player.position === 'D/ST') ? (() => {
                                const teamAbbr = getDSTTeamAbbr(player);
                                return teamAbbr ? (
                                  <img 
                                    src={getTeamLogoWithFallback(teamAbbr)} 
                                    alt={player.name} 
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">${player.name.charAt(0)}</div>`;
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                    {player.name.charAt(0)}
                                  </div>
                                );
                              })() : player.headshot_url ? (
                                <img src={player.headshot_url} alt={player.name} className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                  {player.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{player.name}</p>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <span>{player.position}</span>
                                  {player.roster_status === 'rostered' && player.fantasy_team_name && (
                                    <Badge variant="secondary" className="text-xs">
                                      {player.fantasy_team_name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{player.fantasyPoints.toFixed(1)}</p>
                              <p className="text-xs text-muted-foreground">FP</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No scorer data available</p>
                      )}
                    </div>
                  </Card>

                  {/* Home Team Scorers */}
                  <Card className="p-6 glass border-border/30">
                    <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                      <Star className="h-5 w-5 text-blue-500" />
                      <span>{gameScorers.homeTeam.name}</span>
                    </h3>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                      {gameScorers.homePlayers.length > 0 ? (
                        gameScorers.homePlayers.map((player, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                            <div className="flex items-center space-x-2">
                              {(player.position === 'DST' || player.position === 'D/ST') ? (() => {
                                const teamAbbr = getDSTTeamAbbr(player);
                                return teamAbbr ? (
                                  <img 
                                    src={getTeamLogoWithFallback(teamAbbr)} 
                                    alt={player.name} 
                                    className="w-8 h-8 rounded-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">${player.name.charAt(0)}</div>`;
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                    {player.name.charAt(0)}
                                  </div>
                                );
                              })() : player.headshot_url ? (
                                <img src={player.headshot_url} alt={player.name} className="w-8 h-8 rounded-full" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold">
                                  {player.name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{player.name}</p>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <span>{player.position}</span>
                                  {player.roster_status === 'rostered' && player.fantasy_team_name && (
                                    <Badge variant="secondary" className="text-xs">
                                      {player.fantasy_team_name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{player.fantasyPoints.toFixed(1)}</p>
                              <p className="text-xs text-muted-foreground">FP</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No scorer data available</p>
                      )}
                    </div>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No fantasy scorer data available for this game
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
      </div>
    </div>
  )
}

export default Games
