import { useState, useEffect, useRef, useCallback } from 'react'

type NodeJSTimeout = ReturnType<typeof setInterval>
import { Clock, Wifi, WifiOff, RefreshCw, ChevronDown, ChevronUp, Play, Pause, Trophy, MapPin, Calendar } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { getTeamLogoWithFallback } from '../lib/teamLogos'

interface TopScorer {
  espnId: string
  name: string
  firstName?: string
  lastName?: string
  position: string
  proTeamId?: string
  jerseyNumber?: string
  fantasyPoints: number
  projectedPoints?: number
  headshot_url?: string
  roster_status?: 'free_agent' | 'rostered' | 'unknown'
  fantasy_team_id?: number | null
  fantasy_team_name?: string | null
  stats?: any
}

interface Game {
  eventId: string
  week: number
  season: number
  status: string
  period: number
  clock: string | null
  possession: string | null
  down: number | null
  distance: number | null
  yardLine: number | null
  isRedZone: boolean
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

interface LiveScoreStripProps {
  className?: string
  isPollingActive?: boolean
  onLiveGamesRefresh?: () => void | Promise<void>
}

const LiveScoreStrip = ({ className = '', isPollingActive = false, onLiveGamesRefresh }: LiveScoreStripProps) => {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set())
  const [scoreAnimations, setScoreAnimations] = useState<Map<string, { away: boolean; home: boolean }>>(new Map())
  const [topScorers, setTopScorers] = useState<Map<string, { homePlayers: TopScorer[], awayPlayers: TopScorer[] }>>(new Map())
  const [loadingScorers, setLoadingScorers] = useState<Set<string>>(new Set())
  const expandedGamesRef = useRef<Set<string>>(new Set())
  const loadingScorersRef = useRef<Set<string>>(new Set())
  const onLiveGamesRefreshRef = useRef(onLiveGamesRefresh)
  
  // Update ref when prop changes (doesn't cause re-render)
  useEffect(() => {
    onLiveGamesRefreshRef.current = onLiveGamesRefresh
  }, [onLiveGamesRefresh])

  const fetchTopScorers = useCallback(async (gameId: string, forceRefresh = false) => {
    // Don't fetch if already loading, unless forcing refresh
    if (loadingScorersRef.current.has(gameId) && !forceRefresh) {
      return
    }

    loadingScorersRef.current = new Set(loadingScorersRef.current).add(gameId)
    setLoadingScorers(prev => new Set(prev).add(gameId))

    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
      const response = await fetch(`${API_BASE}/live/${gameId}/scorers?limit=10`)
      const data = await response.json()
      
      if (data.success) {
        setTopScorers(prev => new Map(prev).set(gameId, {
          homePlayers: data.homePlayers,
          awayPlayers: data.awayPlayers
        }))
      }
    } catch (err) {
    } finally {
      const newSet = new Set(loadingScorersRef.current)
      newSet.delete(gameId)
      loadingScorersRef.current = newSet
      setLoadingScorers(prev => {
        const newSet = new Set(prev)
        newSet.delete(gameId)
        return newSet
      })
    }
  }, [])

  // Poll for live games
  useEffect(() => {
    const fetchLiveGames = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
        const response = await fetch(`${API_BASE}/live?live_only=true`)
        const data = await response.json()
        
        if (data.success) {
          const newGames = data.games || []
          
          // Check for score changes and trigger animations
          setGames(prevGames => {
            newGames.forEach((newGame: Game) => {
              const oldGame = prevGames.find(g => g.eventId === newGame.eventId)
            if (oldGame) {
              if (oldGame.awayTeam.score !== newGame.awayTeam.score) {
                setScoreAnimations(prev => new Map(prev.set(newGame.eventId, { 
                  away: true, 
                  home: prev.get(newGame.eventId)?.home || false 
                })))
                setTimeout(() => {
                  setScoreAnimations(prev => new Map(prev.set(newGame.eventId, { 
                    away: false, 
                    home: prev.get(newGame.eventId)?.home || false 
                  })))
                }, 1000)
              }
              if (oldGame.homeTeam.score !== newGame.homeTeam.score) {
                setScoreAnimations(prev => new Map(prev.set(newGame.eventId, { 
                  away: prev.get(newGame.eventId)?.away || false, 
                  home: true 
                })))
                setTimeout(() => {
                  setScoreAnimations(prev => new Map(prev.set(newGame.eventId, { 
                    away: prev.get(newGame.eventId)?.away || false, 
                    home: false 
                  })))
                }, 1000)
              }
            }
            })
            
            return newGames
          })
          
          setLastUpdated(new Date())
          setError(null)
          setIsOnline(true)
          
          // Sync current week data to keep fantasy scorers up to date
          if (onLiveGamesRefreshRef.current && newGames.length > 0) {
            // Call the sync callback (fire and forget - don't block UI)
            const syncResult = onLiveGamesRefreshRef.current()
            if (syncResult instanceof Promise) {
              syncResult.catch((err: unknown) => {
                console.error('Error syncing current week during live games refresh:', err)
              })
            }
          }
          
          // Refresh top scorers for expanded games (force refresh on polling updates)
          expandedGamesRef.current.forEach(gameId => {
            fetchTopScorers(gameId, true)
          })
        } else {
          throw new Error(data.message || 'Failed to fetch games')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch games')
        setIsOnline(false)
      } finally {
        setIsLoading(false)
      }
    }

    // Initial fetch
    fetchLiveGames()

    // Only poll if polling is active
    let interval: NodeJSTimeout | null = null
    if (isPollingActive) {
      interval = setInterval(fetchLiveGames, 30000) // Poll every 30 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [isPollingActive, fetchTopScorers]) // Only re-run when polling status changes or fetchTopScorers changes

  const toggleGameExpansion = (gameId: string) => {
    setExpandedGames(prev => {
      const newSet = new Set(prev)
      if (newSet.has(gameId)) {
        newSet.delete(gameId)
      } else {
        newSet.add(gameId)
        // Fetch top scorers when expanding
        fetchTopScorers(gameId)
      }
      expandedGamesRef.current = newSet
      return newSet
    })
  }

  const getStatusColor = (status: string, isLive: boolean) => {
    if (isLive) return 'text-green-400'
    if (status === 'STATUS_FINAL') return 'text-neutral-400'
    if (status === 'STATUS_SCHEDULED') return 'text-charcoal-300'
    if (status === 'STATUS_HALFTIME') return 'text-orange-400'
    return 'text-slate-300'
  }

  const getStatusGradient = (status: string, isLive: boolean) => {
    if (isLive) return 'from-green-500/20 to-emerald-500/20'
    if (status === 'STATUS_FINAL') return 'from-neutral-500/20 to-gray-500/20'
    if (status === 'STATUS_SCHEDULED') return 'from-charcoal-500/20 to-slate-500/20'
    if (status === 'STATUS_HALFTIME') return 'from-orange-500/20 to-yellow-500/20'
    return 'from-slate-500/20 to-zinc-500/20'
  }

  const getStatusText = (status: string, period: number, clock: string | null) => {
    if (status === 'STATUS_IN') {
      if (period <= 4) {
        return `Q${period}${clock ? ` ${clock}` : ''}`
      } else if (period === 5) {
        return `OT${clock ? ` ${clock}` : ''}`
      } else {
        return `OT${period - 4}${clock ? ` ${clock}` : ''}`
      }
    }
    if (status === 'STATUS_HALFTIME') return 'Halftime'
    if (status === 'STATUS_FINAL') return 'Final'
    if (status === 'STATUS_SCHEDULED') return 'Scheduled'
    if (status === 'STATUS_PRE') return 'Pre-Game'
    return status.replace('STATUS_', '').replace('_', ' ')
  }

  const getPossessionText = (game: Game) => {
    if (!game.possession || !game.down || !game.distance) {
      return null
    }

    const downText = game.down === 1 ? '1st' : game.down === 2 ? '2nd' : game.down === 3 ? '3rd' : '4th'
    const distanceText = game.distance === 1 ? '1' : game.distance
    const yardLineText = game.yardLine ? ` at ${game.yardLine}` : ''
    
    return `${game.possession} • ${downText} & ${distanceText}${yardLineText}`
  }

  const getFieldPositionText = (game: Game) => {
    if (!game.yardLine) return null
    
    if (game.isRedZone) {
      return 'Red Zone'
    }
    
    // Determine which side of the field
    if (game.yardLine <= 50) {
      return `${game.yardLine} yard line`
    } else {
      return `${100 - game.yardLine} yard line`
    }
  }

  const refreshGames = async () => {
    setIsLoading(true)
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
      const response = await fetch(`${API_BASE}/live/poll`, { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        // Refetch games after manual poll
        const gamesResponse = await fetch(`${API_BASE}/live?live_only=true`)
        const gamesData = await gamesResponse.json()
        
        if (gamesData.success) {
          const newGames = gamesData.games || []
          setGames(newGames)
          setLastUpdated(new Date())
          setError(null)
          
          // Sync current week data to keep fantasy scorers up to date
          if (onLiveGamesRefreshRef.current && newGames.length > 0) {
            const syncResult = onLiveGamesRefreshRef.current()
            if (syncResult instanceof Promise) {
              syncResult.catch((err: unknown) => {
                console.error('Error syncing current week during manual refresh:', err)
              })
            }
          }
        }
      }
    } catch (err) {
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && games.length === 0) {
    return (
      <Card className={`glass border-border/30 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading live games...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && games.length === 0) {
    return (
      <Card className={`glass border-border/30 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-400">Failed to load games</span>
            </div>
            <Button size="sm" variant="outline" onClick={refreshGames}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (games.length === 0) {
    return (
      <Card className={`glass border-border/30 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">No live games</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`glass border-border/30 overflow-hidden ${className}`}>
      <CardContent className="p-0">
        {/* Premium Header */}
        <div className="relative bg-gradient-to-r from-charcoal-900/50 via-slate-900/50 to-zinc-900/50 border-b border-border/20">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-emerald-600/5"></div>
          <div className="relative flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <div className="relative">
                    <Wifi className="h-5 w-5 text-green-400" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                ) : (
                  <WifiOff className="h-5 w-5 text-red-400" />
                )}
                <div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-charcoal-200 via-slate-200 to-zinc-200 bg-clip-text text-transparent">
                    Live Scoreboard
                  </h3>
                  <p className="text-xs text-muted-foreground">Real-time NFL scores</p>
                </div>
              </div>
              {lastUpdated && (
                <div className="hidden sm:flex items-center space-x-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Updated {lastUpdated.toLocaleTimeString()}</span>
                </div>
              )}
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={refreshGames} 
              disabled={isLoading}
              className="hover:bg-background/20 transition-all duration-200"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Games Container */}
        <div className="p-4">
          {games.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-charcoal-500/20 to-slate-500/20 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {isOnline ? 'No live games currently in progress' : 'Unable to fetch live games'}
              </div>
              {!isOnline && (
                <div className="text-xs text-muted-foreground/70">
                  Check your connection and try again
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {games.map((game) => {
                const isExpanded = expandedGames.has(game.eventId)
                const awayAnimating = scoreAnimations.get(game.eventId)?.away || false
                const homeAnimating = scoreAnimations.get(game.eventId)?.home || false
                
                return (
                  <div 
                    key={game.eventId} 
                    className="group relative overflow-hidden rounded-xl border border-border/20 bg-gradient-to-r from-background/50 to-background/30 hover:from-background/70 hover:to-background/50 transition-all duration-300 hover:shadow-lg hover:shadow-black/10"
                  >
                    {/* Animated Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Main Game Card */}
                    <div className="relative p-4">
                      <div className="flex items-center justify-between">
                        {/* Away Team */}
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          <div className="flex items-center space-x-3">
                            {/* Team Logo */}
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-border/30 bg-background/50">
                              <img 
                                src={getTeamLogoWithFallback(game.awayTeam.abbreviation)} 
                                alt={`${game.awayTeam.name} logo`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to abbreviation if logo fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20"><span class="text-sm font-bold text-blue-300">${game.awayTeam.abbreviation}</span></div>`;
                                  }
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">
                                {game.awayTeam.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {game.awayTeam.abbreviation}
                              </div>
                            </div>
                          </div>
                          
                          {/* Away Score */}
                          <div className={`text-2xl font-bold text-charcoal-200 transition-all duration-300 ml-6 ${
                            awayAnimating ? 'scale-110 text-green-400 drop-shadow-lg' : ''
                          }`}>
                            {game.awayTeam.score}
                          </div>
                        </div>

                        {/* Game Status Center */}
                        <div className="flex flex-col items-center space-y-2 px-4">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${getStatusGradient(game.status, game.isLive)} border border-border/30`}>
                            <span className={getStatusColor(game.status, game.isLive)}>
                              {getStatusText(game.status, game.period, game.clock)}
                            </span>
                          </div>
                          
                          {/* Possession and Down/Distance */}
                          {game.isLive && getPossessionText(game) && (
                            <div className="px-2 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                              <span className="text-xs text-blue-400 font-medium">
                                {getPossessionText(game)}
                              </span>
                            </div>
                          )}
                          
                          {/* Field Position */}
                          {game.isLive && getFieldPositionText(game) && (
                            <div className="px-2 py-1 bg-orange-500/20 rounded-full border border-orange-500/30">
                              <span className="text-xs text-orange-400 font-medium">
                                {getFieldPositionText(game)}
                              </span>
                            </div>
                          )}
                          
                          {/* Live Indicator */}
                          {game.isLive && (
                            <div className="flex items-center space-x-1 px-2 py-1 bg-green-500/20 rounded-full border border-green-500/30">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                              <span className="text-xs text-green-400 font-medium">LIVE</span>
                            </div>
                          )}
                          
                          {/* Venue */}
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-32">{game.venue}</span>
                          </div>
                        </div>

                        {/* Home Team */}
                        <div className="flex items-center justify-between flex-1 min-w-0">
                          {/* Home Score */}
                          <div className={`text-2xl font-bold text-charcoal-200 transition-all duration-300 mr-6 ${
                            homeAnimating ? 'scale-110 text-green-400 drop-shadow-lg' : ''
                          }`}>
                            {game.homeTeam.score}
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            <div className="min-w-0 text-right">
                              <div className="text-sm font-semibold text-foreground truncate">
                                {game.homeTeam.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {game.homeTeam.abbreviation}
                              </div>
                            </div>
                            {/* Team Logo */}
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-border/30 bg-background/50">
                              <img 
                                src={getTeamLogoWithFallback(game.homeTeam.abbreviation)} 
                                alt={`${game.homeTeam.name} logo`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  // Fallback to abbreviation if logo fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parent = target.parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-blue-500/20"><span class="text-sm font-bold text-emerald-300">${game.homeTeam.abbreviation}</span></div>`;
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Expand Button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleGameExpansion(game.eventId)}
                          className="ml-4 hover:bg-background/20 transition-all duration-200"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Expanded Game Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-border/20 animate-in slide-in-from-top-2 duration-300">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              <span>Week {game.week} • {game.season}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Trophy className="h-4 w-4" />
                              <span>Event ID: {game.eventId}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                              <Play className="h-4 w-4" />
                              <span>Status: {game.status}</span>
                            </div>
                          </div>
                          
                          {/* Top Fantasy Scorers */}
                          <div className="mt-4 space-y-3">
                            <h4 className="text-sm font-semibold text-foreground flex items-center space-x-2">
                              <Trophy className="h-4 w-4 text-yellow-500" />
                              <span>Top Fantasy Scorers</span>
                            </h4>
                            
                            {loadingScorers.has(game.eventId) && (
                              <div className="flex items-center justify-center py-6">
                                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
                                <span className="text-sm text-muted-foreground">Loading top scorers...</span>
                              </div>
                            )}
                            
                            {!loadingScorers.has(game.eventId) && topScorers.has(game.eventId) && 
                             (!topScorers.get(game.eventId)?.homePlayers?.length && !topScorers.get(game.eventId)?.awayPlayers?.length) && (
                              <div className="text-center py-4 text-sm text-muted-foreground">
                                No scorer data available yet
                              </div>
                            )}
                            
                            {(() => {
                              const scorers = topScorers.get(game.eventId)
                              return !loadingScorers.has(game.eventId) && topScorers.has(game.eventId) && scorers &&
                               ((scorers.homePlayers?.length ?? 0) > 0 || (scorers.awayPlayers?.length ?? 0) > 0)
                            })() && (
                              <div className="grid grid-cols-2 gap-4">
                                {/* Away Team Top Scorers - Left Column */}
                                {game.awayTeam && topScorers.get(game.eventId)?.awayPlayers && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center">
                                      <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                                      {game.awayTeam.name}
                                    </h5>
                                    <div className="space-y-1.5">
                                      {topScorers.get(game.eventId)?.awayPlayers
                                        .map((scorer, index) => (
                                        <div 
                                          key={scorer.espnId} 
                                          className={`flex items-center justify-between p-1.5 rounded-lg border transition-all ${
                                            scorer.roster_status === 'rostered' 
                                              ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 hover:from-blue-500/15 hover:to-purple-500/15' 
                                              : 'bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-border/20 hover:from-blue-500/10 hover:to-purple-500/10'
                                          }`}
                                        >
                                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            {scorer.headshot_url ? (
                                              <img 
                                                src={scorer.headshot_url} 
                                                alt={scorer.name}
                                                className="w-6 h-6 rounded-full object-cover border border-border/30 flex-shrink-0"
                                                onError={(e) => {
                                                  e.currentTarget.src = `https://a.espncdn.com/i/headshots/nfl/players/full/${scorer.espnId}.png`;
                                                }}
                                              />
                                            ) : (
                                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-blue-300 text-[10px]">{scorer.name.charAt(0)}</span>
                                              </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex flex-col space-y-0.5">
                                                <div className="flex items-center space-x-1">
                                                  <span className="text-xs font-semibold text-foreground truncate">{scorer.name}</span>
                                                  <span className="text-[10px] text-muted-foreground bg-background/50 px-1 py-0.5 rounded">{scorer.position}</span>
                                                </div>
                                                {scorer.roster_status === 'rostered' && scorer.fantasy_team_name && (
                                                  <span className="text-[10px] text-blue-400 truncate">{scorer.fantasy_team_name}</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center bg-green-500/10 px-2 py-1 rounded border border-green-500/20 ml-1">
                                            <span className="text-xs font-bold text-green-400">{scorer.fantasyPoints.toFixed(1)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Home Team Top Scorers - Right Column */}
                                {game.homeTeam && topScorers.get(game.eventId)?.homePlayers && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center">
                                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
                                      {game.homeTeam.name}
                                    </h5>
                                    <div className="space-y-1.5">
                                      {topScorers.get(game.eventId)?.homePlayers
                                        .map((scorer, index) => (
                                        <div 
                                          key={scorer.espnId} 
                                          className={`flex items-center justify-between p-1.5 rounded-lg border transition-all ${
                                            scorer.roster_status === 'rostered' 
                                              ? 'bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border-emerald-500/30 hover:from-emerald-500/15 hover:to-purple-500/15' 
                                              : 'bg-gradient-to-r from-emerald-500/5 to-purple-500/5 border-border/20 hover:from-emerald-500/10 hover:to-purple-500/10'
                                          }`}
                                        >
                                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                                            {scorer.headshot_url ? (
                                              <img 
                                                src={scorer.headshot_url} 
                                                alt={scorer.name}
                                                className="w-6 h-6 rounded-full object-cover border border-border/30 flex-shrink-0"
                                                onError={(e) => {
                                                  e.currentTarget.src = `https://a.espncdn.com/i/headshots/nfl/players/full/${scorer.espnId}.png`;
                                                }}
                                              />
                                            ) : (
                                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-emerald-300 text-[10px]">{scorer.name.charAt(0)}</span>
                                              </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex flex-col space-y-0.5">
                                                <div className="flex items-center space-x-1">
                                                  <span className="text-xs font-semibold text-foreground truncate">{scorer.name}</span>
                                                  <span className="text-[10px] text-muted-foreground bg-background/50 px-1 py-0.5 rounded">{scorer.position}</span>
                                                </div>
                                                {scorer.roster_status === 'rostered' && scorer.fantasy_team_name && (
                                                  <span className="text-[10px] text-blue-400 truncate">{scorer.fantasy_team_name}</span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="flex items-center bg-green-500/10 px-2 py-1 rounded border border-green-500/20 ml-1">
                                            <span className="text-xs font-bold text-green-400">{scorer.fantasyPoints.toFixed(1)}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {games.length > 0 && (
          <div className="px-4 py-3 bg-gradient-to-r from-charcoal-900/30 via-slate-900/30 to-zinc-900/30 border-t border-border/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <Trophy className="h-3 w-3" />
                  <span>{games.length} live game{games.length !== 1 ? 's' : ''}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <RefreshCw className="h-3 w-3" />
                  <span>{isPollingActive ? 'Auto-refresh every 30s' : 'Manual refresh only'}</span>
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isPollingActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                <span>{isPollingActive ? 'Live updates active' : 'Live updates paused'}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default LiveScoreStrip
