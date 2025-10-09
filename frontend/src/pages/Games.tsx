import React, { useState, useEffect } from 'react'
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
  RefreshCw
} from 'lucide-react'
import { getGamesByWeek, getLiveGames, getConfig, getGameScorers } from '../services/api'
import { useColorScheme } from '../contexts/ColorSchemeContext'
import { getBackgroundClass } from '../lib/colorSchemes'

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

const Games = () => {
  const { colorScheme } = useColorScheme()
  const [games, setGames] = useState<Game[]>([])
  const [currentWeek, setCurrentWeek] = useState(1)
  const [currentSeason, setCurrentSeason] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [gameScorers, setGameScorers] = useState<GameScorers | null>(null)
  const [loadingScorers, setLoadingScorers] = useState(false)

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
      // Clear games immediately to avoid showing empty cards during the loading transition
      setGames([])
      
      // Use provided season or fall back to currentSeason
      const seasonToUse = season || currentSeason
      
      // Fetch games in real-time from ESPN API
      const response = await getGamesByWeek(week, seasonToUse, true)
      if (response.success) {
        setGames(response.games || [])
      } else {
        setError('Failed to fetch games')
      }
    } catch (err) {
      setError('Error fetching games')
    } finally {
      setLoading(false)
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
        }
      } catch (err) {
      }
    }
    fetchConfig()
  }, [])

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
        // Update games with live data
        setGames(prevGames => 
          prevGames.map(game => {
            const liveGame = response.games.find((lg: Game) => lg.eventId === game.eventId)
            return liveGame ? { ...game, ...liveGame } : game
          })
        )
      }
    } catch (err) {
    }
  }

  useEffect(() => {
    if (currentWeek > 0 && currentSeason > 0) {
      fetchGames(currentWeek, currentSeason)
    }
  }, [currentWeek, currentSeason])

  // Poll for live updates every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveGames()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

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

  return (
    <div className="min-h-screen">
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Games</h1>
          <p className="text-muted-foreground mt-1">
            Week {currentWeek} • {currentSeason} Season
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
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
            onClick={() => fetchGames(currentWeek, currentSeason)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-950/20 glass border-border/30">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {/* Games Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
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
                              {player.headshot_url ? (
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
                              {player.headshot_url ? (
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
