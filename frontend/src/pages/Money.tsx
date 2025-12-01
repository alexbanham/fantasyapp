import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Info,
  BarChart3,
  ChevronDown,
  ChevronUp,
  User
} from 'lucide-react'
import { 
  getBettingOddsByWeek, 
  syncBettingOddsForWeek, 
  getBettingOddsStats,
  getConfig,
  BettingOdds,
  BettingOddsResponse
} from '../services/api'

const Money = () => {
  const [odds, setOdds] = useState<BettingOdds[]>([])
  const [currentWeek, setCurrentWeek] = useState(1)
  const [currentSeason, setCurrentSeason] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set())

  useEffect(() => {
    console.log('[Money Page] Component mounted, fetching config...')
    const fetchConfig = async () => {
      try {
        const config = await getConfig()
        console.log('[Money Page] Config received:', {
          success: config.success,
          currentWeek: config.data?.currentWeek,
          currentSeason: config.data?.currentSeason
        })
        if (config.success && config.data) {
          const week = config.data.currentWeek || 1
          const season = config.data.currentSeason || new Date().getFullYear()
          console.log(`[Money Page] Setting week to ${week}, season to ${season}`)
          setCurrentWeek(week)
          setCurrentSeason(season)
        }
      } catch (err) {
        console.error('[Money Page] Error fetching config:', err)
      }
    }
    fetchConfig()
  }, [])

  useEffect(() => {
    console.log(`[Money Page] Week/Season changed: Week ${currentWeek}, Season ${currentSeason}`)
    if (currentWeek > 0 && currentSeason > 0) {
      console.log('[Money Page] Fetching odds and stats for new week/season...')
      fetchOdds()
      fetchStats()
    } else {
      console.warn('[Money Page] Invalid week or season, skipping fetch')
    }
  }, [currentWeek, currentSeason])

  const fetchOdds = async () => {
    try {
      console.log(`[Money Page] Fetching odds for Week ${currentWeek}, Season ${currentSeason}`)
      setLoading(true)
      setError(null)
      
      const startTime = Date.now()
      const response = await getBettingOddsByWeek(currentWeek, currentSeason)
      const duration = Date.now() - startTime
      
      console.log(`[Money Page] API Response received in ${duration}ms:`, {
        success: response.success,
        oddsCount: response.odds?.length || 0,
        week: response.week,
        season: response.season
      })
      
      if (response.success) {
        const oddsData = response.odds || []
        console.log(`[Money Page] Setting ${oddsData.length} games with odds`)
        
        // Log details about each game's odds
        oddsData.forEach((gameOdds, idx) => {
          console.log(`[Money Page] Game ${idx + 1}/${oddsData.length}:`, {
            game: `${gameOdds.awayTeam.abbreviation} @ ${gameOdds.homeTeam.abbreviation}`,
            sources: gameOdds.sources.map(s => s.source),
            hasMoneyline: !!(gameOdds.bestOdds?.moneyline?.home || gameOdds.bestOdds?.moneyline?.away),
            hasSpread: !!(gameOdds.bestOdds?.spread?.home || gameOdds.bestOdds?.spread?.away),
            hasTotal: !!gameOdds.bestOdds?.total?.points
          })
        })
        
        setOdds(oddsData)
      } else {
        console.error('[Money Page] API returned unsuccessful response:', response)
        setError('Failed to fetch betting odds')
      }
    } catch (err: any) {
      console.error('[Money Page] Error fetching betting odds:', {
        error: err.message,
        stack: err.stack,
        week: currentWeek,
        season: currentSeason
      })
      setError(err.message || 'Error fetching betting odds')
    } finally {
      setLoading(false)
      console.log('[Money Page] Fetch odds completed')
    }
  }

  const fetchStats = async () => {
    try {
      console.log('[Money Page] Fetching betting odds statistics...')
      const response = await getBettingOddsStats()
      
      if (response.success) {
        console.log('[Money Page] Stats received:', {
          totalGames: response.stats?.totalGames,
          gamesWithOdds: response.stats?.gamesWithOdds,
          coverage: response.stats?.coverage,
          sources: response.stats?.sources,
          creditsRemaining: response.stats?.oddsApiCredits?.remaining,
          creditsUsed: response.stats?.oddsApiCredits?.used
        })
        setStats(response.stats)
      } else {
        console.warn('[Money Page] Stats API returned unsuccessful response:', response)
      }
    } catch (err) {
      console.error('[Money Page] Error fetching stats:', err)
    }
  }


  const formatAmericanOdds = (odds: number | undefined | null): string => {
    if (odds === null || odds === undefined) return 'N/A'
    return odds > 0 ? `+${odds}` : `${odds}`
  }

  const formatDecimalOdds = (odds: number | undefined | null): string => {
    if (odds === null || odds === undefined) return 'N/A'
    return odds.toFixed(2)
  }

  const formatProbability = (prob: number | undefined | null): string => {
    if (prob === null || prob === undefined) return 'N/A'
    return `${(prob * 100).toFixed(1)}%`
  }

  const formatSpread = (points: number | undefined | null): string => {
    if (points === null || points === undefined) return 'N/A'
    return points > 0 ? `+${points}` : `${points}`
  }

  const getOddsColor = (odds: number | undefined | null): string => {
    if (odds === null || odds === undefined) return 'text-muted-foreground'
    if (odds > 0) return 'text-green-500'
    return 'text-red-500'
  }

  // Calculate potential payout for a $100 bet
  const calculatePayout = (odds: number | null | undefined): string => {
    if (odds === null || odds === undefined) return 'N/A'
    if (odds > 0) {
      const profit = odds
      return `Win $${profit}`
    } else {
      const profit = Math.floor(10000 / Math.abs(odds))
      return `Win $${profit}`
    }
  }

  // Calculate what you need to bet to win $100
  const calculateBetToWin100 = (odds: number | null | undefined): string => {
    if (odds === null || odds === undefined) return 'N/A'
    if (odds > 0) {
      return `Bet $100 to win $${odds}`
    } else {
      const betAmount = Math.abs(odds)
      return `Bet $${betAmount} to win $100`
    }
  }

  // Calculate average odds across all bookmakers
  const calculateAverageOdds = (sources: any[], team: 'home' | 'away', type: 'moneyline'): number | null => {
    const odds = sources
      .map(s => s.moneyline?.[team]?.american)
      .filter((o): o is number => o !== null && o !== undefined)
    
    if (odds.length === 0) return null
    const sum = odds.reduce((a, b) => a + b, 0)
    return Math.round(sum / odds.length)
  }

  // Toggle game expansion
  const toggleGame = (gameId: string) => {
    setExpandedGames(prev => {
      const newSet = new Set(prev)
      if (newSet.has(gameId)) {
        newSet.delete(gameId)
      } else {
        newSet.add(gameId)
      }
      return newSet
    })
  }

  const isExpanded = (gameId: string) => expandedGames.has(gameId)

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight whitespace-nowrap">
                  Betting Odds & Money Lines
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 whitespace-nowrap">
                  Week {currentWeek} • {currentSeason} Season
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                disabled={currentWeek <= 1}
                className="h-9 w-9 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent rounded-md border border-border/50 whitespace-nowrap">
                <span className="text-xs font-medium text-muted-foreground">Week</span>
                <span className="text-sm font-bold text-foreground">{currentWeek}</span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentWeek(currentWeek + 1)}
                disabled={currentWeek >= 18}
                className="h-9 w-9 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Info Card - Betting Basics */}
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Understanding Betting Odds</h3>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                    <div>
                      <strong>Moneyline:</strong> Bet on which team will win. 
                      <span className="text-green-600 dark:text-green-400"> +150</span> means bet $100 to win $150. 
                      <span className="text-red-600 dark:text-red-400"> -150</span> means bet $150 to win $100.
                    </div>
                    <div>
                      <strong>Spread:</strong> Bet on the margin of victory. The favorite must win by more than the spread, the underdog can lose by less than the spread.
                    </div>
                    <div>
                      <strong>Total (Over/Under):</strong> Bet on whether the combined score will be over or under a number.
                    </div>
                    <div className="text-xs mt-2 pt-2 border-t border-blue-200 dark:border-blue-800">
                      <strong>Best Odds:</strong> We compare all bookmakers and show you the best available odds (highlighted with a star ⭐).
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Games with Odds</div>
                <div className="text-2xl font-bold">{stats.gamesWithOdds || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">{stats.coverage || '0%'} coverage</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Data Sources</div>
                <div className="text-2xl font-bold">{stats.sourceCount || 0}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.sources?.join(', ') || 'None'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Games</div>
                <div className="text-2xl font-bold">{stats.totalGames || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Last Synced</div>
                <div className="text-sm font-medium">
                  {stats.lastSynced 
                    ? new Date(stats.lastSynced).toLocaleDateString()
                    : 'Never'}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Credit Status */}
        {stats?.oddsApiCredits && (
          <Card className="mb-6 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">The Odds API Credits</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last sync cost: {stats.oddsApiCredits.lastCallCost || 'N/A'} credits
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${
                    stats.oddsApiCredits.remaining && stats.oddsApiCredits.remaining < 100 
                      ? 'text-red-500' 
                      : stats.oddsApiCredits.remaining && stats.oddsApiCredits.remaining < 200
                      ? 'text-yellow-500'
                      : 'text-green-500'
                  }`}>
                    {stats.oddsApiCredits.remaining ?? 'N/A'}
                  </div>
                  <div className="text-xs text-muted-foreground">remaining</div>
                  {stats.oddsApiCredits.used !== null && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {stats.oddsApiCredits.used} used
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-950/20 glass border-border/30 mb-6">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </Card>
        )}

        {/* Loading State */}
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
        ) : odds.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No betting odds available</p>
                <p className="text-sm mb-4">
                  Use the Admin Panel (⚙️ icon in header) to sync betting odds for this week.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {odds.map((gameOdds) => {
              const expanded = isExpanded(gameOdds._id)
              return (
              <Card key={gameOdds._id} className="hover:shadow-lg transition-all">
                <CardContent className="p-4">
                  {/* Game Header - Collapsed View */}
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => toggleGame(gameOdds._id)}
                  >
                    <div className="flex items-center gap-4 flex-1 flex-wrap">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {new Date(gameOdds.gameDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">
                          {gameOdds.awayTeam.abbreviation}
                        </span>
                        <span className="text-muted-foreground">@</span>
                        <span className="font-semibold text-lg">
                          {gameOdds.homeTeam.abbreviation}
                        </span>
                      </div>
                      {gameOdds.bestOdds?.moneyline?.away && gameOdds.bestOdds?.moneyline?.home && (
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`font-semibold ${getOddsColor(gameOdds.bestOdds.moneyline.away.american)}`}>
                            {formatAmericanOdds(gameOdds.bestOdds.moneyline.away.american)}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className={`font-semibold ${getOddsColor(gameOdds.bestOdds.moneyline.home.american)}`}>
                            {formatAmericanOdds(gameOdds.bestOdds.moneyline.home.american)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {gameOdds.sources.length} bookmaker{gameOdds.sources.length !== 1 ? 's' : ''}
                      </Badge>
                      {gameOdds.sources.some(s => s.playerProps && s.playerProps.length > 0) && (
                        <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-800">
                          <User className="h-3 w-3 mr-1" />
                          Player Props
                        </Badge>
                      )}
                      {expanded ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expanded && (
                    <div className="mt-6 pt-6 border-t border-border space-y-6">

                      {/* Teams - Moneyline */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-base font-semibold flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Moneyline (Who Will Win?)
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            Best Odds ⭐
                          </Badge>
                        </div>
                    
                    {/* Away Team */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border-2 border-primary/20">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{gameOdds.awayTeam.abbreviation}</p>
                        <p className="text-xs text-muted-foreground">{gameOdds.awayTeam.name}</p>
                      </div>
                      <div className="text-right">
                        {gameOdds.bestOdds?.moneyline?.away ? (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-xs">⭐</span>
                              <span className={`text-lg font-bold ${getOddsColor(gameOdds.bestOdds.moneyline.away.american)}`}>
                                {formatAmericanOdds(gameOdds.bestOdds.moneyline.away.american)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {calculateBetToWin100(gameOdds.bestOdds.moneyline.away.american)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatProbability(gameOdds.bestOdds.moneyline.away.impliedProbability)} chance
                            </div>
                            {gameOdds.bestOdds.moneyline.away.source && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Best from: {gameOdds.bestOdds.moneyline.away.source}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">N/A</div>
                        )}
                      </div>
                    </div>

                    {/* VS Divider */}
                    <div className="flex items-center justify-center">
                      <div className="h-px bg-border flex-1"></div>
                      <span className="px-3 text-sm text-muted-foreground font-semibold">VS</span>
                      <div className="h-px bg-border flex-1"></div>
                    </div>

                    {/* Home Team */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border-2 border-primary/20">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{gameOdds.homeTeam.abbreviation}</p>
                        <p className="text-xs text-muted-foreground">{gameOdds.homeTeam.name}</p>
                      </div>
                      <div className="text-right">
                        {gameOdds.bestOdds?.moneyline?.home ? (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-xs">⭐</span>
                              <span className={`text-lg font-bold ${getOddsColor(gameOdds.bestOdds.moneyline.home.american)}`}>
                                {formatAmericanOdds(gameOdds.bestOdds.moneyline.home.american)}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {calculateBetToWin100(gameOdds.bestOdds.moneyline.home.american)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatProbability(gameOdds.bestOdds.moneyline.home.impliedProbability)} chance
                            </div>
                            {gameOdds.bestOdds.moneyline.home.source && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Best from: {gameOdds.bestOdds.moneyline.home.source}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">N/A</div>
                        )}
                      </div>
                    </div>

                    {/* Average Odds */}
                    {gameOdds.sources && gameOdds.sources.length > 1 && (
                      <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                        <div className="font-medium mb-1">Average Across {gameOdds.sources.length} Bookmakers:</div>
                        <div className="flex justify-between">
                          <span>
                            {gameOdds.awayTeam.abbreviation}: {formatAmericanOdds(calculateAverageOdds(gameOdds.sources, 'away', 'moneyline'))}
                          </span>
                          <span>
                            {gameOdds.homeTeam.abbreviation}: {formatAmericanOdds(calculateAverageOdds(gameOdds.sources, 'home', 'moneyline'))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                      {/* Spread and Total */}
                      <div className="pt-6 border-t border-border">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Spread */}
                        <div className="p-4 rounded-lg bg-accent/30 border border-border">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="text-sm font-semibold">Point Spread ⭐</div>
                            <Info className="h-4 w-4 text-muted-foreground" title="The favorite must win by more than the spread. The underdog can lose by less than the spread." />
                          </div>
                        {gameOdds.bestOdds?.spread?.home && gameOdds.bestOdds?.spread?.away ? (
                          <div className="text-sm space-y-1">
                            <div className="font-medium">
                              {gameOdds.awayTeam.abbreviation} {formatSpread(gameOdds.bestOdds.spread.away.points)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Odds: {formatAmericanOdds(gameOdds.bestOdds.spread.away.odds.american)} ({calculateBetToWin100(gameOdds.bestOdds.spread.away.odds.american)})
                            </div>
                            <div className="text-xs text-muted-foreground">
                              From: {gameOdds.bestOdds.spread.away.odds.source || 'N/A'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                              {gameOdds.homeTeam.abbreviation} {formatSpread(gameOdds.bestOdds.spread.home.points)}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">N/A</div>
                        )}
                      </div>

                        {/* Total */}
                        <div className="p-4 rounded-lg bg-accent/30 border border-border">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="text-sm font-semibold">Total (Over/Under) ⭐</div>
                            <Info className="h-4 w-4 text-muted-foreground" title="Bet on whether the combined score will be over or under this number." />
                          </div>
                        {gameOdds.bestOdds?.total?.points ? (
                          <div className="text-sm space-y-1">
                            <div className="font-medium">
                              {gameOdds.bestOdds.total.points} points
                            </div>
                            <div className="text-xs">
                              <span className="text-green-600 dark:text-green-400">Over:</span> {formatAmericanOdds(gameOdds.bestOdds.total.over?.odds.american)} ({calculateBetToWin100(gameOdds.bestOdds.total.over?.odds.american)})
                            </div>
                            <div className="text-xs">
                              <span className="text-red-600 dark:text-red-400">Under:</span> {formatAmericanOdds(gameOdds.bestOdds.total.under?.odds.american)} ({calculateBetToWin100(gameOdds.bestOdds.total.under?.odds.american)})
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Best from: {gameOdds.bestOdds.total.over?.odds.source || gameOdds.bestOdds.total.under?.odds.source || 'N/A'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">N/A</div>
                        )}
                      </div>
                    </div>
                  </div>

                      {/* All Bookmaker Lines Comparison */}
                      {gameOdds.sources && gameOdds.sources.length > 0 && (
                        <div className="pt-6 border-t border-border">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="text-base font-semibold flex items-center gap-2">
                              <BarChart3 className="h-4 w-4" />
                              Compare All Bookmakers ({gameOdds.sources.length})
                            </h4>
                            <Info className="h-4 w-4 text-muted-foreground" title="Compare odds from different sportsbooks to find the best value. The star ⭐ indicates the best odds we found." />
                          </div>
                          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                            {/* Moneyline Comparison */}
                            {(gameOdds.sources.some(s => s.moneyline?.home || s.moneyline?.away)) && (
                              <div>
                                <div className="font-semibold mb-3 text-sm flex items-center gap-2">
                                  Moneyline Odds
                                  <span className="text-xs text-muted-foreground font-normal">(Best marked with ⭐)</span>
                                </div>
                                <div className="space-y-2">
                                  {gameOdds.sources
                                    .filter(s => s.moneyline?.home || s.moneyline?.away)
                                    .map((source, idx) => {
                                      const isBestAway = (gameOdds.bestOdds?.moneyline?.away?.source === source.source) ||
                                                        (source.moneyline?.away?.american === gameOdds.bestOdds?.moneyline?.away?.american)
                                      const isBestHome = (gameOdds.bestOdds?.moneyline?.home?.source === source.source) ||
                                                        (source.moneyline?.home?.american === gameOdds.bestOdds?.moneyline?.home?.american)
                                      return (
                                        <div key={idx} className={`flex items-center justify-between text-sm rounded-lg px-4 py-3 ${
                                          (isBestAway || isBestHome) ? 'bg-primary/10 border-2 border-primary/30' : 'bg-accent/30 border border-border'
                                        }`}>
                                          <span className="font-semibold">{source.source}</span>
                                          <div className="flex gap-6">
                                            {source.moneyline?.away && (
                                              <div className={`${getOddsColor(source.moneyline.away.american)} flex items-center gap-2`}>
                                                {isBestAway && <span className="text-base">⭐</span>}
                                                <div className="flex flex-col">
                                                  <span className="font-semibold">{gameOdds.awayTeam.abbreviation}: {formatAmericanOdds(source.moneyline.away.american)}</span>
                                                  <span className="text-xs text-muted-foreground">
                                                    {calculatePayout(source.moneyline.away.american)}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                            {source.moneyline?.home && (
                                              <div className={`${getOddsColor(source.moneyline.home.american)} flex items-center gap-2`}>
                                                {isBestHome && <span className="text-base">⭐</span>}
                                                <div className="flex flex-col">
                                                  <span className="font-semibold">{gameOdds.homeTeam.abbreviation}: {formatAmericanOdds(source.moneyline.home.american)}</span>
                                                  <span className="text-xs text-muted-foreground">
                                                    {calculatePayout(source.moneyline.home.american)}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Spread Comparison */}
                            {(gameOdds.sources.some(s => s.spread?.home || s.spread?.away)) && (
                              <div className="mt-6">
                                <div className="font-semibold mb-3 text-sm">Spread Odds</div>
                                <div className="space-y-2">
                                  {gameOdds.sources
                                    .filter(s => s.spread?.home || s.spread?.away)
                                    .map((source, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-sm bg-accent/30 rounded-lg px-4 py-3 border border-border">
                                        <span className="font-semibold">{source.source}</span>
                                        <div className="flex gap-6">
                                          {source.spread?.away && (
                                            <div>
                                              <span className="font-medium">{gameOdds.awayTeam.abbreviation}: {formatSpread(source.spread.away.points)}</span>
                                              <span className="text-muted-foreground ml-2">({formatAmericanOdds(source.spread.away.odds.american)})</span>
                                            </div>
                                          )}
                                          {source.spread?.home && (
                                            <div>
                                              <span className="font-medium">{gameOdds.homeTeam.abbreviation}: {formatSpread(source.spread.home.points)}</span>
                                              <span className="text-muted-foreground ml-2">({formatAmericanOdds(source.spread.home.odds.american)})</span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                            {/* Total Comparison */}
                            {(gameOdds.sources.some(s => s.total?.over || s.total?.under)) && (
                              <div className="mt-6">
                                <div className="font-semibold mb-3 text-sm">Total (Over/Under) Odds</div>
                                <div className="space-y-2">
                                  {gameOdds.sources
                                    .filter(s => s.total?.over || s.total?.under)
                                    .map((source, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-sm bg-accent/30 rounded-lg px-4 py-3 border border-border">
                                        <span className="font-semibold">{source.source}</span>
                                        <div className="flex gap-4">
                                          {source.total?.points && (
                                            <div className="flex gap-4">
                                              <div>
                                                <span className="font-medium">O/U {source.total.points}</span>
                                              </div>
                                              <div className="flex gap-3">
                                                <span className="text-green-600 dark:text-green-400">
                                                  Over: {formatAmericanOdds(source.total.over?.odds.american)}
                                                </span>
                                                <span className="text-red-600 dark:text-red-400">
                                                  Under: {formatAmericanOdds(source.total.under?.odds.american)}
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                          </div>
                        </div>
                      )}

                      {/* Player Props Section - Dedicated and Expanded */}
                      {gameOdds.sources.some(s => s.playerProps && s.playerProps.length > 0) && (
                        <div className="pt-6 border-t border-border">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h4 className="text-base font-semibold flex items-center gap-2 mb-2">
                                <User className="h-5 w-5 text-purple-500" />
                                Player Props
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                Bet on individual player performance. Compare odds across bookmakers to find the best value.
                              </p>
                            </div>
                            <Info className="h-4 w-4 text-muted-foreground mt-1" title="Player props let you bet on specific player statistics like touchdowns, yards, and receptions. Each bookmaker may offer different odds, so compare to find the best value." />
                          </div>

                          {/* Group props by market type */}
                          {(() => {
                            // Collect all player props grouped by market and player
                            const propsByMarket = new Map<string, Map<string, Array<{
                              source: string
                              market: string
                              playerName: string
                              outcomes: Array<{
                                name: string
                                price: number
                                point?: number | null
                              }>
                            }>>>()

                            gameOdds.sources.forEach(source => {
                              if (source.playerProps && source.playerProps.length > 0) {
                                source.playerProps.forEach(prop => {
                                  if (!propsByMarket.has(prop.market)) {
                                    propsByMarket.set(prop.market, new Map())
                                  }
                                  const marketMap = propsByMarket.get(prop.market)!
                                  
                                  if (!marketMap.has(prop.playerName)) {
                                    marketMap.set(prop.playerName, [])
                                  }
                                  
                                  marketMap.get(prop.playerName)!.push({
                                    source: source.source,
                                    market: prop.market,
                                    playerName: prop.playerName,
                                    outcomes: prop.outcomes
                                  })
                                })
                              }
                            })

                            const marketLabels: Record<string, { label: string; description: string }> = {
                              'player_anytime_td': { 
                                label: 'Anytime Touchdown', 
                                description: 'Will this player score a touchdown at any point in the game?' 
                              },
                              'player_pass_tds': { 
                                label: 'Passing Touchdowns', 
                                description: 'How many passing touchdowns will this quarterback throw?' 
                              },
                              'player_rush_yds': { 
                                label: 'Rushing Yards', 
                                description: 'How many yards will this player rush for?' 
                              },
                              'player_receiving_yds': { 
                                label: 'Receiving Yards', 
                                description: 'How many receiving yards will this player have?' 
                              },
                              'player_pass_yds': { 
                                label: 'Passing Yards', 
                                description: 'How many passing yards will this quarterback throw for?' 
                              },
                              'player_receptions': { 
                                label: 'Receptions', 
                                description: 'How many catches will this player make?' 
                              },
                              'player_rush_attempts': { 
                                label: 'Rush Attempts', 
                                description: 'How many times will this player carry the ball?' 
                              },
                              'player_pass_completions': { 
                                label: 'Pass Completions', 
                                description: 'How many passes will this quarterback complete?' 
                              },
                              'player_pass_interceptions': { 
                                label: 'Interceptions', 
                                description: 'How many interceptions will this quarterback throw?' 
                              },
                              'player_first_td': { 
                                label: 'First Touchdown', 
                                description: 'Will this player score the first touchdown of the game?' 
                              }
                            }

                            return Array.from(propsByMarket.entries()).map(([market, playersMap]) => {
                              const marketInfo = marketLabels[market] || { 
                                label: market.replace('player_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                description: 'Player performance betting market'
                              }

                              return (
                                <div key={market} className="mb-6 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                                  <div className="mb-3">
                                    <div className="font-semibold text-sm text-purple-900 dark:text-purple-100 mb-1">
                                      {marketInfo.label}
                                    </div>
                                    <div className="text-xs text-purple-700 dark:text-purple-300">
                                      {marketInfo.description}
                                    </div>
                                  </div>

                                  {/* Group by player, show all bookmakers */}
                                  {Array.from(playersMap.entries()).map(([playerName, bookmakerProps]) => (
                                    <div key={playerName} className="mb-4 last:mb-0">
                                      <div className="font-semibold text-sm mb-2 text-foreground">{playerName}</div>
                                      
                                      {/* Show all bookmakers for this player */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {bookmakerProps.map((bookmakerProp, idx) => (
                                          <div key={idx} className="bg-background rounded-lg p-3 border border-border/50">
                                            <div className="text-xs font-medium text-muted-foreground mb-2">
                                              {bookmakerProp.source}
                                            </div>
                                            <div className="space-y-1.5">
                                              {bookmakerProp.outcomes.map((outcome, outIdx) => (
                                                <div key={outIdx} className="flex items-center justify-between text-xs">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-muted-foreground">
                                                      {outcome.name}
                                                    </span>
                                                    {outcome.point !== null && outcome.point !== undefined && (
                                                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                                                        {outcome.point}
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className={`font-semibold ${getOddsColor(outcome.price)}`}>
                                                      {formatAmericanOdds(outcome.price)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                      ({calculateBetToWin100(outcome.price)})
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )
                            })
                          })()}
                        </div>
                      )}
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
  )
}

export default Money

