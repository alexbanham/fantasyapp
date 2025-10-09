import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Star,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Newspaper,
  Heart,
  Zap,
  Target,
  Trophy,
  Users,
  RefreshCw,
  Brain
} from 'lucide-react'

interface Player {
  _id: string
  player_id: string
  name: string
  first_name: string
  last_name: string
  position: string
  team: string
  bye_week: number
  age: number
  experience: number
  injury_status: string
  rank_ecr: number
  rank_adp: number
  pos_rank: string
  rookie: boolean
  image_url: string
  lastUpdated: string
  weekly_projections?: Record<string, { std: number; ppr: number; half: number; last_updated: string }> | Map<string, { std: number; ppr: number; half: number; last_updated: string }>
  weekly_actuals?: Record<string, { std: number; ppr: number; half: number; last_updated: string }> | Map<string, { std: number; ppr: number; half: number; last_updated: string }>
  current_week?: number
  projection_last_updated?: string
  actuals_last_updated?: string
  // ESPN data fields
  espn_id?: string
  injury_description?: string
  injury_date?: string
  practice_status?: string
  injury_last_updated?: string
  recent_news?: NewsArticle[]
  news_last_updated?: string
  fantasy_outlook?: string
  season_stats?: any
  recent_performance?: any
  outlook_last_updated?: string
}

interface ESPNData {
  player: Player
  injury?: ESPNInjury
  news?: ESPNNews[]
  outlook?: ESPNOutlook
}

interface ESPNInjury {
  espn_id: string
  player_id: string
  injury_status: string
  injury_description?: string
  injury_date?: string
  practice_status?: string
  injury_type?: string
  injury_location?: string
  injury_side?: string
  return_date?: string
  fantasy_status?: string
  last_updated: string
}

interface ESPNNews {
  espn_id: string
  player_id: string
  article_id: string
  headline: string
  summary?: string
  content?: string
  author?: string
  published_date: string
  url: string
  image_url?: string
  source: string
  sentiment: 'positive' | 'negative' | 'neutral'
  last_updated: string
}

interface ESPNOutlook {
  espn_id: string
  player_id: string
  fantasy_outlook?: string
  season_stats?: any
  recent_performance?: any
  weekly_outlook?: string
  matchup_analysis?: string
  injury_impact?: string
  last_updated: string
}

interface NewsArticle {
  id: string
  headline: string
  summary: string
  content: string
  author: string
  published_date: string
  url: string
  image_url?: string
  last_updated: string
}

interface WeeklyStats {
  week: number
  opponent: string
  passing_yards?: number
  passing_tds?: number
  rushing_yards?: number
  rushing_tds?: number
  receiving_yards?: number
  receiving_tds?: number
  receptions?: number
  fantasy_points: number
  status: 'played' | 'bye' | 'inactive'
}

interface NewsItem {
  id: string
  title: string
  summary: string
  source: string
  published_at: string
  url: string
  sentiment: 'positive' | 'negative' | 'neutral'
}

interface InjuryReport {
  status: string
  injury: string
  practice_status: string
  last_updated: string
  notes: string
}

const PlayerProfile = () => {
  const { playerId } = useParams<{ playerId: string }>()
  const navigate = useNavigate()
  const [player, setPlayer] = useState<Player | null>(null)
  const [espnData, setEspnData] = useState<ESPNData | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [news, setNews] = useState<NewsItem[]>([])
  const [injuryReport, setInjuryReport] = useState<InjuryReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'stats' | 'news' | 'injury'>('overview')

  useEffect(() => {
    if (playerId) {
      loadPlayerData()
    }
  }, [playerId])

  const loadPlayerData = async () => {
    try {
      setLoading(true)
      
      // Load player basic info and ESPN data
      const playerResponse = await fetch(`/api/players/${playerId}`)
      const playerData = await playerResponse.json()
      
      if (playerData.success) {
        setPlayer(playerData.player)
        
        // Load ESPN data
        const espnResponse = await fetch(`/api/espn/player/${playerId}`)
        const espnData = await espnResponse.json()
        
        if (espnData.success) {
          setEspnData(espnData.player)
        }
        
        // Load additional data in parallel
        await Promise.all([
          loadWeeklyStats(playerData.player.player_id),
          loadPlayerNews(playerData.player.name),
          loadInjuryReport(playerData.player.player_id)
        ])
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const loadWeeklyStats = async (playerId: string) => {
    try {
      const response = await fetch(`/api/players/${playerId}/stats`)
      const data = await response.json()
      
      if (data.success) {
        setWeeklyStats(data.stats)
      }
    } catch (error) {
    }
  }

  const loadPlayerNews = async (playerName: string) => {
    try {
      const response = await fetch(`/api/players/${playerId}/news`)
      const data = await response.json()
      
      if (data.success) {
        setNews(data.news)
      }
    } catch (error) {
    }
  }

  const loadInjuryReport = async (playerId: string) => {
    try {
      const response = await fetch(`/api/players/${playerId}/injury`)
      const data = await response.json()
      
      if (data.success) {
        setInjuryReport(data.injury)
      }
    } catch (error) {
    }
  }

  const getInjuryStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': 
      case 'healthy':
      case null:
      case undefined:
      case '': 
        return 'text-green-400 bg-green-400/10'
      case 'questionable': 
        return 'text-yellow-400 bg-yellow-400/10'
      case 'doubtful': 
        return 'text-orange-400 bg-orange-400/10'
      case 'out': 
        return 'text-red-400 bg-red-400/10'
      case 'ir': 
      case 'injured reserve':
        return 'text-red-500 bg-red-500/10'
      case 'pup': 
      case 'physically unable to perform':
        return 'text-purple-400 bg-purple-400/10'
      default: 
        return 'text-purple-400 bg-purple-400/10'
    }
  }

  const getInjuryStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': 
      case 'healthy':
      case null:
      case undefined:
      case '': 
        return 'Healthy'
      case 'questionable': 
        return 'Questionable'
      case 'doubtful': 
        return 'Doubtful'
      case 'out': 
        return 'Out'
      case 'ir': 
      case 'injured reserve':
        return 'Injured Reserve'
      case 'pup': 
      case 'physically unable to perform':
        return 'PUP List'
      default: 
        return status || 'Healthy'
    }
  }

  const getInjuryStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': 
      case 'healthy':
      case null:
      case undefined:
      case '': 
        return <CheckCircle className="h-4 w-4" />
      case 'questionable': 
        return <AlertTriangle className="h-4 w-4" />
      case 'doubtful': 
        return <AlertTriangle className="h-4 w-4" />
      case 'out': 
        return <AlertTriangle className="h-4 w-4" />
      case 'ir': 
      case 'injured reserve':
        return <AlertTriangle className="h-4 w-4" />
      case 'pup': 
      case 'physically unable to perform':
        return <AlertTriangle className="h-4 w-4" />
      default: 
        return <CheckCircle className="h-4 w-4" />
    }
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB': return 'bg-blue-500'
      case 'RB': return 'bg-green-500'
      case 'WR': return 'bg-purple-500'
      case 'TE': return 'bg-orange-500'
      case 'K': return 'bg-yellow-500'
      case 'DST': return 'bg-purple-500'
      default: return 'bg-purple-400'
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-400'
      case 'negative': return 'text-red-400'
      default: return 'text-purple-400'
    }
  }

  // Helper function to get current week projections
  const getCurrentWeekProjections = (player: Player) => {
    if (!player.weekly_projections) return null;
    
    // Handle both Map and Object formats
    let weekProjections;
    const currentWeek = player.current_week || 1;
    
    if (player.weekly_projections instanceof Map) {
      weekProjections = player.weekly_projections.get(currentWeek.toString());
    } else {
      // Handle object format where keys are week numbers
      weekProjections = player.weekly_projections[currentWeek.toString()] || player.weekly_projections[currentWeek];
    }
    
    return weekProjections ? { week: currentWeek, ...weekProjections } : null;
  }

  // Helper function to get historical comparison data
  const getHistoricalComparisonData = (player: Player) => {
    return player.weekly_actuals && Object.keys(player.weekly_actuals).length > 0;
  };

  // Helper function to get current week comparison
  const getCurrentWeekComparison = (player: Player) => {
    if (!player.weekly_projections || !player.weekly_actuals) return null;
    
    const currentWeek = player.current_week || 1;
    const weekStr = currentWeek.toString();
    
    let projected, actual;
    
    // Get projected data
    if (player.weekly_projections instanceof Map) {
      projected = player.weekly_projections.get(weekStr);
    } else {
      projected = player.weekly_projections[weekStr] || player.weekly_projections[currentWeek];
    }
    
    // Get actual data
    if (player.weekly_actuals) {
      if (player.weekly_actuals instanceof Map) {
        actual = player.weekly_actuals.get(weekStr);
      } else {
        actual = player.weekly_actuals[weekStr] || player.weekly_actuals[currentWeek];
      }
    }
    
    return projected || actual ? { week: currentWeek, projected, actual } : null;
  };

  // Helper function to get season summary
  const getSeasonSummary = (player: Player) => {
    if (!player.weekly_actuals) return null;
    
    const weeks = player.weekly_actuals instanceof Map ? 
      Array.from(player.weekly_actuals.keys()) : 
      Object.keys(player.weekly_actuals);
    
    if (weeks.length === 0) return null;
    
    let totalProjected = 0;
    let totalActual = 0;
    let gamesPlayed = 0;
    
    weeks.forEach(week => {
      let projected, actual;
      
      // Get projected data
      if (player.weekly_projections) {
        if (player.weekly_projections instanceof Map) {
          projected = player.weekly_projections.get(week);
        } else {
          projected = player.weekly_projections[week] || player.weekly_projections[parseInt(week)];
        }
      }
      
      // Get actual data
      if (player.weekly_actuals) {
        if (player.weekly_actuals instanceof Map) {
          actual = player.weekly_actuals.get(week);
        } else {
          actual = player.weekly_actuals[week] || player.weekly_actuals[parseInt(week)];
        }
      }
      
      if (actual?.ppr) {
        gamesPlayed++;
        totalActual += actual.ppr;
        if (projected?.ppr) {
          totalProjected += projected.ppr;
        }
      }
    });
    
    return {
      gamesPlayed,
      avgProjected: gamesPlayed > 0 ? totalProjected / gamesPlayed : null,
      avgActual: gamesPlayed > 0 ? totalActual / gamesPlayed : null
    };
  };

  // Helper function to get weekly breakdown
  const getWeeklyBreakdown = (player: Player) => {
    if (!player.weekly_actuals) return null;
    
    const weeks = player.weekly_actuals instanceof Map ? 
      Array.from(player.weekly_actuals.keys()) : 
      Object.keys(player.weekly_actuals);
    
    return weeks.map(week => {
      let projected, actual;
      
      // Get projected data
      if (player.weekly_projections) {
        if (player.weekly_projections instanceof Map) {
          projected = player.weekly_projections.get(week);
        } else {
          projected = player.weekly_projections[week] || player.weekly_projections[parseInt(week)];
        }
      }
      
      // Get actual data
      if (player.weekly_actuals) {
        if (player.weekly_actuals instanceof Map) {
          actual = player.weekly_actuals.get(week);
        } else {
          actual = player.weekly_actuals[week] || player.weekly_actuals[parseInt(week)];
        }
      }
      
      return {
        week: parseInt(week),
        projected: projected?.ppr,
        actual: actual?.ppr
      };
    }).filter(week => week.actual !== undefined).sort((a, b) => b.week - a.week);
  };

  const getPracticeStatusText = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'a':
      case 'active':
      case 'full':
        return 'Full Practice'
      case 'lp':
      case 'limited':
        return 'Limited Practice'
      case 'dnp':
      case 'did not practice':
        return 'Did Not Practice'
      case 'out':
        return 'Out'
      case 'questionable':
        return 'Questionable'
      case 'doubtful':
        return 'Doubtful'
      default:
        return status || 'Not Available'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Player not found
              </h3>
              <p className="text-muted-foreground mb-4">
                The player you're looking for doesn't exist or has been removed.
              </p>
              <Button onClick={() => navigate('/players')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Players
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/players')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{player.name}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant="outline" className="text-sm">
                {player.team}
              </Badge>
              <div className={cn(
                "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                getInjuryStatusColor(player.injury_status)
              )}>
                {getInjuryStatusIcon(player.injury_status)}
                {getInjuryStatusText(player.injury_status)}
              </div>
              <div className={cn(
                "px-2 py-1 rounded-full text-xs font-medium text-white",
                getPositionColor(player.position)
              )}>
                {player.position}
              </div>
              {player.rookie && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Rookie
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Player Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Player Info Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center space-y-4">
                {player.image_url ? (
                  <img 
                    src={player.image_url} 
                    alt={player.name}
                    className="w-24 h-24 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=96`
                    }}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Users className="h-12 w-12 text-purple-400" />
                  </div>
                )}
                
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">{player.name}</h2>
                  <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                    {player.age && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Age {player.age}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Projections Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Weekly Projections</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {getCurrentWeekProjections(player) ? (
                <>
                  <div className="text-center mb-4">
                    <div className="text-2xl font-bold text-primary">
                      Week {getCurrentWeekProjections(player)?.week}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {player.projection_last_updated && `Updated ${formatDate(player.projection_last_updated)}`}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">PPR</span>
                      <Badge variant="outline" className="text-lg font-bold text-green-600">
                        {getCurrentWeekProjections(player)?.ppr?.toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No projections available for current week
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historical vs Projected Points Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Historical vs Projected Points</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {getHistoricalComparisonData(player) ? (
                <>
                  <div className="text-center mb-4">
                    <div className="text-lg font-semibold text-primary">
                      Performance Analysis
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {player.actuals_last_updated && `Historical data updated ${formatDate(player.actuals_last_updated)}`}
                    </div>
                  </div>
                  
                  {/* Current Week Comparison */}
                  {getCurrentWeekComparison(player) && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">Current Week ({getCurrentWeekComparison(player)?.week})</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="text-xs text-blue-300 mb-1">Projected</div>
                          <div className="text-lg font-bold text-blue-200">
                            {getCurrentWeekComparison(player)?.projected?.ppr?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                        <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="text-xs text-green-300 mb-1">Actual</div>
                          <div className="text-lg font-bold text-green-200">
                            {getCurrentWeekComparison(player)?.actual?.ppr?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                      </div>
                      {(() => {
                        const actual = getCurrentWeekComparison(player)?.actual?.ppr
                        const projected = getCurrentWeekComparison(player)?.projected?.ppr
                        if (!actual || !projected) return null
                        
                        return (
                          <div className="text-center">
                            <Badge 
                              variant={actual >= projected ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {actual >= projected ? 
                                `+${(actual - projected).toFixed(1)}` :
                                `${(actual - projected).toFixed(1)}`
                              } vs Projection
                            </Badge>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Season Summary */}
                  {getSeasonSummary(player) && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">Season Summary</div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="p-2 bg-primary/10 rounded border border-primary/20">
                          <div className="text-xs text-slate-300 mb-1">Games</div>
                          <div className="text-sm font-bold text-slate-200">
                            {getSeasonSummary(player)?.gamesPlayed || 0}
                          </div>
                        </div>
                        <div className="p-2 bg-primary/10 rounded border border-primary/20">
                          <div className="text-xs text-purple-300 mb-1">Avg Projected</div>
                          <div className="text-sm font-bold text-purple-200">
                            {getSeasonSummary(player)?.avgProjected?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                        <div className="p-2 bg-primary/10 rounded border border-primary/20">
                          <div className="text-xs text-orange-300 mb-1">Avg Actual</div>
                          <div className="text-sm font-bold text-orange-200">
                            {getSeasonSummary(player)?.avgActual?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Weekly Breakdown */}
                  {getWeeklyBreakdown(player) && getWeeklyBreakdown(player)!.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-muted-foreground">Weekly Breakdown</div>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {getWeeklyBreakdown(player)!.slice(0, 8).map((week) => (
                          <div key={week.week} className="flex items-center justify-between p-2 bg-background/50 rounded border">
                            <div className="text-sm font-medium">Week {week.week}</div>
                            <div className="flex items-center space-x-3 text-xs">
                              <div className="flex items-center space-x-1">
                                <span className="text-blue-300">P:</span>
                                <span className="text-blue-200">{week.projected?.toFixed(1) || 'N/A'}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <span className="text-green-300">A:</span>
                                <span className="text-green-200">{week.actual?.toFixed(1) || 'N/A'}</span>
                              </div>
                              {week.actual && week.projected && (
                                <Badge 
                                  variant={week.actual >= week.projected ? "default" : "destructive"}
                                  className="text-xs px-1 py-0"
                                >
                                  {week.actual >= week.projected ? '+' : ''}{(week.actual - week.projected).toFixed(1)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p>No historical data available</p>
                  <p className="text-sm mt-1">Sync historical fantasy points from the dashboard</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rankings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Rankings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {player.pos_rank && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Position Rank</span>
                  <Badge variant="outline" className="text-lg font-bold">
                    #{player.pos_rank.replace(/[A-Z]/g, '')}
                  </Badge>
                </div>
              )}
              {player.rank_adp && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ADP Rank</span>
                  <Badge variant="outline" className="text-lg font-bold">
                    #{player.rank_adp}
                  </Badge>
                </div>
              )}
              {player.bye_week && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Bye Week</span>
                  <Badge variant="secondary">
                    Week {player.bye_week}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Injury Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {espnData?.injury ? (
                  <AlertTriangle className="h-5 w-5 text-orange-400" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-400" />
                )}
                <span>Injury Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {espnData?.injury ? (
                <div className="space-y-3">
                  <div className={cn(
                    "px-3 py-2 rounded-lg text-center font-medium flex items-center justify-center gap-2",
                    getInjuryStatusColor(espnData.injury.injury_status)
                  )}>
                    {getInjuryStatusIcon(espnData.injury.injury_status)}
                    {getInjuryStatusText(espnData.injury.injury_status)}
                  </div>
                  
                  {espnData.injury.injury_description && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Latest Injury News:</span>
                      <span className="ml-2 font-medium">{espnData.injury.injury_description}</span>
                    </div>
                  )}
                  
                  {espnData.injury.injury_type && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="ml-2 font-medium">{espnData.injury.injury_type}</span>
                    </div>
                  )}
                  
                  {espnData.injury.injury_location && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="ml-2 font-medium">{espnData.injury.injury_location}</span>
                    </div>
                  )}
                  
                  {espnData.injury.practice_status && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Practice:</span>
                      <span className="ml-2 font-medium">{getPracticeStatusText(espnData.injury.practice_status)}</span>
                    </div>
                  )}
                  
                  {espnData.injury.return_date && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Expected Return:</span>
                      <span className="ml-2 font-medium">{formatDate(espnData.injury.return_date)}</span>
                    </div>
                  )}
                  
                  {espnData.injury.fantasy_status && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Fantasy Impact:</span>
                      <span className="ml-2 font-medium">{espnData.injury.fantasy_status}</span>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Last updated: {formatDate(espnData.injury.last_updated)}
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className={cn(
                    "px-3 py-2 rounded-lg text-center font-medium flex items-center justify-center gap-2",
                    getInjuryStatusColor(player.injury_status)
                  )}>
                    {getInjuryStatusIcon(player.injury_status)}
                    {getInjuryStatusText(player.injury_status)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    No recent injury reports available
                  </div>
                  {player.injury_last_updated && (
                    <div className="text-xs text-muted-foreground">
                      Last updated: {formatDate(player.injury_last_updated)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent News Card */}
          {espnData?.news && espnData.news.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Newspaper className="h-5 w-5" />
                  <span>Recent News</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {espnData.news.slice(0, 3).map((article) => (
                    <div key={article.article_id} className="border-b border-border/50 pb-3 last:border-b-0 last:pb-0">
                      <h4 className="font-medium text-sm mb-1">{article.headline}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{article.summary}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{article.author}</span>
                        <span>{formatDate(article.published_date)}</span>
                      </div>
                      {article.url && (
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline mt-1 inline-block"
                        >
                          Read more →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
                {player.news_last_updated && (
                  <div className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border/50">
                    Last updated: {formatDate(player.news_last_updated)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Fantasy Outlook Card */}
          {espnData?.outlook && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5" />
                  <span>Fantasy Outlook</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {espnData.outlook.fantasy_outlook && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-2">Analysis:</p>
                      <p className="leading-relaxed">{espnData.outlook.fantasy_outlook}</p>
                    </div>
                  )}
                  
                  {espnData.outlook.weekly_outlook && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">This Week:</p>
                      <p className="font-medium">{espnData.outlook.weekly_outlook}</p>
                    </div>
                  )}
                  
                  {espnData.outlook.matchup_analysis && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Matchup:</p>
                      <p>{espnData.outlook.matchup_analysis}</p>
                    </div>
                  )}
                  
                  {espnData.outlook.injury_impact && (
                    <div className="text-sm">
                      <p className="text-muted-foreground mb-1">Injury Impact:</p>
                      <p className="text-orange-400">{espnData.outlook.injury_impact}</p>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    Last updated: {formatDate(espnData.outlook.last_updated)}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <div className="flex space-x-1">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'stats', label: 'Weekly Stats', icon: Activity },
                { id: 'news', label: 'Latest News', icon: Newspaper },
                { id: 'injury', label: 'Injury Report', icon: AlertTriangle }
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'ghost'}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex items-center space-x-2"
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Player Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Full Name</span>
                        <span className="font-medium">{player.first_name} {player.last_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Position</span>
                        <Badge className={getPositionColor(player.position)}>
                          {player.position}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Team</span>
                        <Badge variant="outline">{player.team}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <span className={cn("font-medium", getInjuryStatusColor(player.injury_status).split(' ')[0])}>
                          {getInjuryStatusText(player.injury_status)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Fantasy Outlook</h3>
                    <div className="space-y-3">
                      {null}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rookie</span>
                        <span className="font-medium">{player.rookie ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">2024 Season Stats</h3>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                {weeklyStats.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Week</th>
                          <th className="text-left p-2">Opponent</th>
                          <th className="text-left p-2">Passing</th>
                          <th className="text-left p-2">Rushing</th>
                          <th className="text-left p-2">Receiving</th>
                          <th className="text-left p-2">Fantasy Pts</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyStats.map((stat) => (
                          <tr key={stat.week} className="border-b">
                            <td className="p-2 font-medium">Week {stat.week}</td>
                            <td className="p-2">{stat.opponent}</td>
                            <td className="p-2">
                              {stat.passing_yards && `${stat.passing_yards}yds`}
                              {stat.passing_tds && `, ${stat.passing_tds}TD`}
                            </td>
                            <td className="p-2">
                              {stat.rushing_yards && `${stat.rushing_yards}yds`}
                              {stat.rushing_tds && `, ${stat.rushing_tds}TD`}
                            </td>
                            <td className="p-2">
                              {stat.receiving_yards && `${stat.receiving_yards}yds`}
                              {stat.receiving_tds && `, ${stat.receiving_tds}TD`}
                              {stat.receptions && `, ${stat.receptions}rec`}
                            </td>
                            <td className="p-2 font-bold text-primary">{stat.fantasy_points}</td>
                            <td className="p-2">
                              <Badge variant={stat.status === 'played' ? 'default' : 'secondary'}>
                                {stat.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No weekly stats available for this season
                  </div>
                )}
              </div>
            )}

            {/* News Tab */}
            {activeTab === 'news' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Latest News</h3>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                
                {news.length > 0 ? (
                  <div className="space-y-4">
                    {news.map((item) => (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground mb-2">{item.title}</h4>
                              <p className="text-muted-foreground text-sm mb-3">{item.summary}</p>
                              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                <span>{item.source}</span>
                                <span>{formatDate(item.published_at)}</span>
                                <span className={cn("font-medium", getSentimentColor(item.sentiment))}>
                                  {item.sentiment}
                                </span>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <a href={item.url} target="_blank" rel="noopener noreferrer">
                                Read More
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No recent news available
                  </div>
                )}
              </div>
            )}

            {/* Injury Tab */}
            {activeTab === 'injury' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Injury Report</h3>
                
                {injuryReport ? (
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2">Current Status</h4>
                            <div className={cn(
                              "px-3 py-2 rounded-lg text-center font-medium",
                              getInjuryStatusColor(injuryReport.status)
                            )}>
                              {injuryReport.status}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Practice Status</h4>
                            <div className="text-lg font-medium">
                              {getPracticeStatusText(injuryReport.practice_status)}
                            </div>
                          </div>
                        </div>
                        
                        {injuryReport.injury && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2">Injury Details</h4>
                            <p className="text-muted-foreground">{injuryReport.injury}</p>
                          </div>
                        )}
                        
                        {injuryReport.notes && (
                          <div className="mt-4">
                            <h4 className="font-semibold mb-2">Notes</h4>
                            <p className="text-muted-foreground">{injuryReport.notes}</p>
                          </div>
                        )}
                        
                        <div className="mt-4 text-xs text-muted-foreground">
                          Last updated: {formatDate(injuryReport.last_updated)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No injury information available
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PlayerProfile