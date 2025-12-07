import { useState, useEffect, useCallback } from 'react'
import { Clock, RefreshCw, ChevronDown, ChevronUp, Trophy, MapPin, Calendar } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { getTeamLogoWithFallback, getDSTTeamAbbr } from '../lib/teamLogos'
import { getLiveGames } from '../services/api'

interface TopScorer {
  espnId: string
  name: string
  position: string
  proTeamId?: string
  fantasyPoints: number
  headshot_url?: string
  roster_status?: 'free_agent' | 'rostered' | 'unknown'
  fantasy_team_name?: string | null
}

interface Game {
  eventId: string
  week: number
  season: number
  status: string
  period: number
  clock: string | null
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

interface RecentGamesProps {
  className?: string
  currentWeek?: number
  currentSeason?: number
}

const RecentGames = ({ className = '', currentWeek, currentSeason }: RecentGamesProps) => {
  const [games, setGames] = useState<Game[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set())
  const [topScorers, setTopScorers] = useState<Map<string, { homePlayers: TopScorer[], awayPlayers: TopScorer[] }>>(new Map())
  const [loadingScorers, setLoadingScorers] = useState<Set<string>>(new Set())

  const fetchTopScorers = useCallback(async (gameId: string) => {
    if (loadingScorers.has(gameId)) {
      return
    }

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
      console.error('Error fetching top scorers:', err)
    } finally {
      setLoadingScorers(prev => {
        const newSet = new Set(prev)
        newSet.delete(gameId)
        return newSet
      })
    }
  }, [])

  useEffect(() => {
    const fetchRecentGames = async () => {
      setIsLoading(true)
      try {
        const response = await getLiveGames({
          status: 'STATUS_FINAL',
          week: currentWeek,
          season: currentSeason,
          limit: 15
        })
        
        if (response.success) {
          // Sort by date descending (most recent first)
          const sortedGames = (response.games || []).sort((a: Game, b: Game) => {
            return new Date(b.date).getTime() - new Date(a.date).getTime()
          })
          setGames(sortedGames.slice(0, 10)) // Top 10 most recent
          setError(null)
        } else {
          throw new Error(response.message || 'Failed to fetch games')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch games')
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecentGames()
  }, [currentWeek, currentSeason])

  const toggleGameExpansion = (gameId: string) => {
    setExpandedGames(prev => {
      const newSet = new Set(prev)
      if (newSet.has(gameId)) {
        newSet.delete(gameId)
      } else {
        newSet.add(gameId)
        fetchTopScorers(gameId)
      }
      return newSet
    })
  }

  const refreshGames = async () => {
    setIsRefreshing(true)
    try {
      const response = await getLiveGames({
        status: 'STATUS_FINAL',
        week: currentWeek,
        season: currentSeason,
        limit: 15
      })
      
      if (response.success) {
        const sortedGames = (response.games || []).sort((a: Game, b: Game) => {
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        })
        setGames(sortedGames.slice(0, 10))
        setError(null)
      }
    } catch (err) {
      console.error('Error refreshing games:', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading && games.length === 0) {
    return (
      <Card className={`glass border-border/30 ${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading recent games...</span>
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
              <Clock className="h-4 w-4 text-red-400" />
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
    return null
  }

  return (
    <Card className={`glass border-border/30 overflow-hidden ${className}`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-charcoal-900/50 via-slate-900/50 to-zinc-900/50 border-b border-border/20">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-emerald-600/5"></div>
          <div className="relative flex items-center justify-between p-2 sm:p-3 md:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base md:text-lg font-bold bg-gradient-to-r from-charcoal-200 via-slate-200 to-zinc-200 bg-clip-text text-transparent truncate">
                  Recent Games
                </h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Most recent completed games</p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={refreshGames} 
              disabled={isLoading || isRefreshing}
              className="hover:bg-background/20 transition-all duration-200 shrink-0 p-1.5 sm:p-2"
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${(isLoading || isRefreshing) ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Games Container */}
        <div className="p-2 sm:p-3 md:p-4">
          <div className="space-y-3 sm:space-y-4">
            {games.map((game) => {
              const isExpanded = expandedGames.has(game.eventId)
              
              return (
                <div 
                  key={game.eventId} 
                  className="group relative overflow-hidden rounded-lg sm:rounded-xl border border-border/20 bg-gradient-to-r from-background/50 to-background/30 hover:from-background/70 hover:to-background/50 transition-all duration-300 hover:shadow-lg hover:shadow-black/10"
                >
                  {/* Main Game Card */}
                  <div className="relative p-2 sm:p-3 md:p-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                      {/* Mobile: Simplified layout */}
                      <div className="flex items-center justify-between w-full sm:hidden">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-border/30 bg-background/50 shrink-0">
                            <img 
                              src={getTeamLogoWithFallback(game.awayTeam.abbreviation)} 
                              alt={`${game.awayTeam.name} logo`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20"><span class="text-xs font-bold text-blue-300">${game.awayTeam.abbreviation}</span></div>`;
                                }
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-foreground truncate">
                              {game.awayTeam.abbreviation}
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-bold text-charcoal-200 ml-2">
                          {game.awayTeam.score}
                        </div>
                      </div>
                      
                      {/* Desktop: Full layout */}
                      <div className="hidden sm:flex items-center justify-between flex-1 min-w-0">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-border/30 bg-background/50 shrink-0">
                            <img 
                              src={getTeamLogoWithFallback(game.awayTeam.abbreviation)} 
                              alt={`${game.awayTeam.name} logo`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20"><span class="text-xs sm:text-sm font-bold text-blue-300">${game.awayTeam.abbreviation}</span></div>`;
                                }
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
                              {game.awayTeam.name}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground hidden md:block">
                              {game.awayTeam.abbreviation}
                            </div>
                          </div>
                        </div>
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-charcoal-200 ml-4 sm:ml-6">
                          {game.awayTeam.score}
                        </div>
                      </div>

                      {/* Game Status Center */}
                      <div className="flex flex-row sm:flex-col items-center justify-between sm:justify-center space-x-2 sm:space-y-2 sm:px-2 md:px-4 w-full sm:w-auto">
                        <div className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-neutral-500/20 to-gray-500/20 border border-border/30">
                          <span className="text-neutral-400">Final</span>
                        </div>
                        <div className="hidden sm:contents">
                          <div className="hidden md:flex items-center space-x-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-32">{game.venue}</span>
                          </div>
                        </div>
                      </div>

                      {/* Mobile: Home team */}
                      <div className="flex items-center justify-between w-full sm:hidden">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-border/30 bg-background/50 shrink-0">
                            <img 
                              src={getTeamLogoWithFallback(game.homeTeam.abbreviation)} 
                              alt={`${game.homeTeam.name} logo`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-blue-500/20"><span class="text-xs font-bold text-emerald-300">${game.homeTeam.abbreviation}</span></div>`;
                                }
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-foreground truncate">
                              {game.homeTeam.abbreviation}
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-bold text-charcoal-200 ml-2">
                          {game.homeTeam.score}
                        </div>
                      </div>

                      {/* Desktop: Home Team */}
                      <div className="hidden sm:flex items-center justify-between flex-1 min-w-0">
                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-charcoal-200 mr-4 sm:mr-6">
                          {game.homeTeam.score}
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <div className="min-w-0 text-right">
                            <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
                              {game.homeTeam.name}
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground hidden md:block">
                              {game.homeTeam.abbreviation}
                            </div>
                          </div>
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-border/30 bg-background/50 shrink-0">
                            <img 
                              src={getTeamLogoWithFallback(game.homeTeam.abbreviation)} 
                              alt={`${game.homeTeam.name} logo`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-blue-500/20"><span class="text-xs sm:text-sm font-bold text-emerald-300">${game.homeTeam.abbreviation}</span></div>`;
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
                        className="sm:ml-4 hover:bg-background/20 transition-all duration-200 shrink-0 p-1.5 sm:p-2 absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 sm:h-4 sm:w-4" />
                        ) : (
                          <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Expanded Game Details */}
                    {isExpanded && (
                      <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-border/20 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                            <span>Week {game.week} • {game.season}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 sm:space-x-2 text-xs sm:text-sm text-muted-foreground">
                            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                            <span className="truncate">Event ID: {game.eventId}</span>
                          </div>
                        </div>
                        
                        {/* Top Fantasy Scorers */}
                        <div className="mt-2 sm:mt-4 space-y-2 sm:space-y-3">
                          <h4 className="text-xs sm:text-sm font-semibold text-foreground flex items-center space-x-1.5 sm:space-x-2">
                            <Trophy className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 shrink-0" />
                            <span>Top Fantasy Scorers</span>
                          </h4>
                          
                          {loadingScorers.has(game.eventId) && (
                            <div className="flex items-center justify-center py-4 sm:py-6">
                              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-muted-foreground mr-2" />
                              <span className="text-xs sm:text-sm text-muted-foreground">Loading top scorers...</span>
                            </div>
                          )}
                          
                          {!loadingScorers.has(game.eventId) && topScorers.has(game.eventId) && 
                           (!topScorers.get(game.eventId)?.homePlayers?.length && !topScorers.get(game.eventId)?.awayPlayers?.length) && (
                            <div className="text-center py-3 sm:py-4 text-xs sm:text-sm text-muted-foreground">
                              No scorer data available
                            </div>
                          )}
                          
                          {(() => {
                            const scorers = topScorers.get(game.eventId)
                            return !loadingScorers.has(game.eventId) && topScorers.has(game.eventId) && scorers &&
                             ((scorers.homePlayers?.length ?? 0) > 0 || (scorers.awayPlayers?.length ?? 0) > 0)
                          })() && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                              {/* Away Team Top Scorers */}
                              {game.awayTeam && topScorers.get(game.eventId)?.awayPlayers && (
                                <div>
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center">
                                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2"></span>
                                    {game.awayTeam.name}
                                  </h5>
                                  <div className="space-y-1.5">
                                    {topScorers.get(game.eventId)?.awayPlayers
                                      .map((scorer) => (
                                      <div 
                                        key={scorer.espnId} 
                                        className={`flex items-center justify-between p-1.5 rounded-lg border transition-all ${
                                          scorer.roster_status === 'rostered' 
                                            ? 'bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 hover:from-blue-500/15 hover:to-purple-500/15' 
                                            : 'bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-border/20 hover:from-blue-500/10 hover:to-purple-500/10'
                                        }`}
                                      >
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                          {(scorer.position === 'DST' || scorer.position === 'D/ST') ? (() => {
                                            const teamAbbr = getDSTTeamAbbr(scorer);
                                            return teamAbbr ? (
                                              <img 
                                                src={getTeamLogoWithFallback(teamAbbr)} 
                                                alt={scorer.name}
                                                className="w-6 h-6 rounded-full object-cover border border-border/30 flex-shrink-0"
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement;
                                                  target.style.display = 'none';
                                                  const parent = target.parentElement;
                                                  if (parent) {
                                                    parent.innerHTML = `<div class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0"><span class="text-xs font-bold text-blue-300 text-[10px]">${scorer.name.charAt(0)}</span></div>`;
                                                  }
                                                }}
                                              />
                                            ) : (
                                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-blue-300 text-[10px]">{scorer.name.charAt(0)}</span>
                                              </div>
                                            );
                                          })() : scorer.headshot_url ? (
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
                              
                              {/* Home Team Top Scorers */}
                              {game.homeTeam && topScorers.get(game.eventId)?.homePlayers && (
                                <div>
                                  <h5 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
                                    {game.homeTeam.name}
                                  </h5>
                                  <div className="space-y-1.5">
                                    {topScorers.get(game.eventId)?.homePlayers
                                      .map((scorer) => (
                                      <div 
                                        key={scorer.espnId} 
                                        className={`flex items-center justify-between p-1.5 rounded-lg border transition-all ${
                                          scorer.roster_status === 'rostered' 
                                            ? 'bg-gradient-to-r from-emerald-500/10 to-purple-500/10 border-emerald-500/30 hover:from-emerald-500/15 hover:to-purple-500/15' 
                                            : 'bg-gradient-to-r from-emerald-500/5 to-purple-500/5 border-border/20 hover:from-emerald-500/10 hover:to-purple-500/10'
                                        }`}
                                      >
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                          {(scorer.position === 'DST' || scorer.position === 'D/ST') ? (() => {
                                            const teamAbbr = getDSTTeamAbbr(scorer);
                                            return teamAbbr ? (
                                              <img 
                                                src={getTeamLogoWithFallback(teamAbbr)} 
                                                alt={scorer.name}
                                                className="w-6 h-6 rounded-full object-cover border border-border/30 flex-shrink-0"
                                                onError={(e) => {
                                                  const target = e.target as HTMLImageElement;
                                                  target.style.display = 'none';
                                                  const parent = target.parentElement;
                                                  if (parent) {
                                                    parent.innerHTML = `<div class="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0"><span class="text-xs font-bold text-emerald-300 text-[10px]">${scorer.name.charAt(0)}</span></div>`;
                                                  }
                                                }}
                                              />
                                            ) : (
                                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500/20 to-purple-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xs font-bold text-emerald-300 text-[10px]">{scorer.name.charAt(0)}</span>
                                              </div>
                                            );
                                          })() : scorer.headshot_url ? (
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
        </div>
      </CardContent>
    </Card>
  )
}

export default RecentGames




