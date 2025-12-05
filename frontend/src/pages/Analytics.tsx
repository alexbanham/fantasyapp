import { useState, useEffect } from 'react'
import { TrendingUp, Trophy, AlertCircle, RefreshCw, X, ChevronRight, ChevronDown, Users, TrendingDown, Zap, AlertTriangle } from 'lucide-react'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { getManagerScores, ManagerScore, getTeamWeeklyBreakdown, WeeklyBreakdownResponse, getWaiverWireAnalysis, WaiverWireAnalysis, getBoomBustStats, BoomBustStats } from '../services/api'

const Analytics = () => {
  const [managerScores, setManagerScores] = useState<ManagerScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [season] = useState<number>(2025)
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [weeklyBreakdown, setWeeklyBreakdown] = useState<WeeklyBreakdownResponse | null>(null)
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set())
  const [waiverWireData, setWaiverWireData] = useState<WaiverWireAnalysis | null>(null)
  const [loadingWaiverWire, setLoadingWaiverWire] = useState(false)
  const [expandedWaiverWeeks, setExpandedWaiverWeeks] = useState<Set<number>>(new Set())
  const [boomBustStats, setBoomBustStats] = useState<BoomBustStats[]>([])
  const [loadingBoomBust, setLoadingBoomBust] = useState(false)
  const [expandedBoomBustTeams, setExpandedBoomBustTeams] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchAnalytics()
    fetchWaiverWireAnalysis()
    fetchBoomBustStats()
  }, [season])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const scoresData = await getManagerScores(season, null)

      if (scoresData.success) {
        setManagerScores(scoresData.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const fetchWaiverWireAnalysis = async () => {
    try {
      setLoadingWaiverWire(true)
      const data = await getWaiverWireAnalysis(season, null)
      if (data.success) {
        setWaiverWireData(data)
      }
    } catch (err) {
      console.error('Failed to load waiver wire analysis:', err)
    } finally {
      setLoadingWaiverWire(false)
    }
  }

  const fetchBoomBustStats = async () => {
    try {
      setLoadingBoomBust(true)
      const data = await getBoomBustStats(season)
      if (data.success) {
        setBoomBustStats(data.data)
      }
    } catch (err) {
      console.error('Failed to load boom/bust stats:', err)
    } finally {
      setLoadingBoomBust(false)
    }
  }

  const toggleWaiverWeekExpansion = (week: number) => {
    const newExpanded = new Set(expandedWaiverWeeks)
    if (newExpanded.has(week)) {
      newExpanded.delete(week)
    } else {
      newExpanded.add(week)
    }
    setExpandedWaiverWeeks(newExpanded)
  }

  const handleTeamClick = async (teamId: number, teamName: string) => {
    setSelectedTeam(teamId)
    setLoadingBreakdown(true)
    setError(null)
    
    try {
      // Fetch the selected team's breakdown
      const data = await getTeamWeeklyBreakdown(teamId, season)
      setWeeklyBreakdown(data)
      
      // Add selected team to the position data for ranking
      setAllTeamsPositionData(prev => ({ ...prev, [teamId]: data }))
      
      // Fetch all teams' position data for ranking if not already cached
      const teamsToFetch = managerScores.filter(t => t.teamId !== teamId && !allTeamsPositionData[t.teamId])
      if (teamsToFetch.length > 0) {
        setFetchingAllTeams(true)
        
        const otherTeamsData: Record<number, any> = {}
        await Promise.all(
          teamsToFetch.map(async (team) => {
            try {
              const teamData = await getTeamWeeklyBreakdown(team.teamId, season)
              otherTeamsData[team.teamId] = teamData
            } catch (err) {
              // Error fetching team data, continue with other teams
            }
          })
        )
        
        setAllTeamsPositionData(prev => ({ ...prev, ...otherTeamsData }))
        setFetchingAllTeams(false)
      }
    } catch (err) {
      setError('Failed to load weekly breakdown')
    } finally {
      setLoadingBreakdown(false)
    }
  }

  const toggleWeekExpansion = (week: number) => {
    const newExpanded = new Set(expandedWeeks)
    if (newExpanded.has(week)) {
      newExpanded.delete(week)
    } else {
      newExpanded.add(week)
    }
    setExpandedWeeks(newExpanded)
  }

  const formatScore = (score: number) => {
    return Math.round(score * 10) / 10
  }

  const getScoreColor = (score: number) => {
    // Manager score is a percentage (0-100)
    if (score >= 80) return 'text-green-500'
    if (score >= 70) return 'text-yellow-500'
    if (score >= 60) return 'text-orange-500'
    return 'text-red-500'
  }

  const [allTeamsPositionData, setAllTeamsPositionData] = useState<Record<number, any>>({})
  const [fetchingAllTeams, setFetchingAllTeams] = useState(false)

  const calculatePositionRanks = (teamId: number | null) => {
    if (!weeklyBreakdown?.positionAverages || !teamId) {
      return {}
    }

    const ranks: Record<string, number> = {}
    
    // Get the team's position averages from weekly breakdown
    const teamAverages = weeklyBreakdown.positionAverages
    
    // Build a map of all teams' average per week for each position
    const allTeamAvgs: Record<string, Array<{ teamId: number, avgPerWeek: number }>> = {}
    
    // Use allTeamsPositionData if available
    Object.keys(allTeamsPositionData).forEach(teamIdStr => {
      const tid = parseInt(teamIdStr)
      const teamData = allTeamsPositionData[tid]
      
      if (teamData?.positionAverages) {
        Object.keys(teamData.positionAverages).forEach(position => {
          if (!allTeamAvgs[position]) {
            allTeamAvgs[position] = []
          }
          
          const avgPerWeek = teamData.positionAverages[position].avgPoints
          allTeamAvgs[position].push({
            teamId: tid,
            avgPerWeek
          })
        })
      }
    })
    
    // For each position the selected team has data for
    Object.keys(teamAverages).forEach(position => {
      const teamAvgPerWeek = teamAverages[position].avgPoints
      
      // Compare against all teams' averages for this position
      const otherTeams = allTeamAvgs[position] || []
      
      // Count how many teams have a higher average
      let rank = 1
      otherTeams.forEach(other => {
        if (other.avgPerWeek > teamAvgPerWeek) {
          rank++
        }
      })
      
      ranks[position] = rank
    })

    return ranks
  }

  const getRankSuffix = (rank: number) => {
    const remainder10 = rank % 10
    const remainder100 = rank % 100
    
    if (remainder100 >= 11 && remainder100 <= 13) {
      return 'th'
    }
    
    switch (remainder10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Analytics</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchAnalytics}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Season Analytics</h1>
                <p className="text-muted-foreground mt-1">
                  Manager performance and team position breakdowns
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{season} Season Totals</Badge>
              <Button variant="ghost" size="sm" onClick={() => {
                fetchAnalytics()
                fetchWaiverWireAnalysis()
                fetchBoomBustStats()
              }}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Manager Scores Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Trophy className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">Manager Scores</h2>
          </div>

          <div className="grid gap-4">
            {managerScores.map((team, idx) => (
              <Card 
                key={team.teamId} 
                className="p-4 hover:bg-accent/50 transition-colors"
              >
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => handleTeamClick(team.teamId, team.teamName)}
                >
                  <div className="flex items-center space-x-4">
                    {/* Rank Badge */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary font-bold">
                      {idx + 1}
                    </div>

                    {/* Team Logo */}
                    {team.logo && (
                      <img 
                        src={team.logo} 
                        alt={team.teamName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}

                    {/* Team Info */}
                    <div>
                      <h3 className="font-semibold text-foreground">{team.teamName}</h3>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>{team.metrics.wins}-{team.metrics.losses}</span>
                        <span>{formatScore(team.metrics.avgPointsPerWeek)} pts/week</span>
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(team.managerScore)}`}>
                      {formatScore(team.managerScore)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Efficiency</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {team.metrics.actualPoints} / {team.metrics.optimalPoints}
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground">Total Points</div>
                    <div className="font-semibold">{formatScore(team.metrics.totalPoints)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Avg Per Week</div>
                    <div className="font-semibold">{formatScore(team.metrics.avgPointsPerWeek)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Consistency</div>
                    <div className="font-semibold">{formatScore(team.metrics.consistencyScore)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Win Rate</div>
                    <div className="font-semibold">
                      {team.metrics.wins + team.metrics.losses > 0 
                        ? Math.round((team.metrics.wins / (team.metrics.wins + team.metrics.losses)) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>

                {/* Boom/Bust Stats */}
                {(() => {
                  const stats = boomBustStats.find(s => s.teamId === team.teamId)
                  if (!stats && !loadingBoomBust) return null
                  
                  const isExpanded = expandedBoomBustTeams.has(team.teamId)
                  
                  return (
                    <div className="mt-4 pt-4 border-t">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const newExpanded = new Set(expandedBoomBustTeams)
                          if (newExpanded.has(team.teamId)) {
                            newExpanded.delete(team.teamId)
                          } else {
                            newExpanded.add(team.teamId)
                          }
                          setExpandedBoomBustTeams(newExpanded)
                        }}
                        className="w-full flex items-center justify-between mb-3 hover:bg-accent/30 rounded p-2 -m-2 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <Zap className="h-4 w-4 text-green-500" />
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-xs font-semibold text-muted-foreground">Boom/Bust Analytics</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                      {loadingBoomBust ? (
                        <div className="flex items-center justify-center py-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      ) : stats ? (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <div className="text-xs text-muted-foreground flex items-center space-x-1">
                                <Zap className="h-3 w-3 text-green-500" />
                                <span>Boom Weeks</span>
                              </div>
                              <div className="font-semibold text-green-500">{stats.boomWeeks}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground flex items-center space-x-1">
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                                <span>Bust Weeks</span>
                              </div>
                              <div className="font-semibold text-red-500">{stats.bustWeeks}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground flex items-center space-x-1">
                                <Zap className="h-3 w-3 text-green-500" />
                                <span>Player Booms</span>
                              </div>
                              <div className="font-semibold text-green-600">{stats.playerBooms}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground flex items-center space-x-1">
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                                <span>Player Busts</span>
                              </div>
                              <div className="font-semibold text-red-600">{stats.playerBusts}</div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-4 space-y-4 pt-4 border-t">
                              {/* Boom Weeks Details */}
                              {stats.boomWeekDetails.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center space-x-1">
                                    <Zap className="h-4 w-4" />
                                    <span>Boom Weeks ({stats.boomWeekDetails.length})</span>
                                  </h4>
                                  <div className="space-y-2">
                                    {stats.boomWeekDetails.map((week, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                                        <div className="flex items-center space-x-3">
                                          <Badge variant="outline" className="text-xs">Week {week.week}</Badge>
                                          <div className="text-sm">
                                            <span className="font-semibold text-green-700">{formatScore(week.points)} pts</span>
                                            <span className="text-xs text-muted-foreground ml-2">
                                              (avg: {formatScore(week.average)})
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-semibold text-green-600">
                                            +{formatScore(week.diff)} ({formatScore(week.percentageDiff)}%)
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Bust Weeks Details */}
                              {stats.bustWeekDetails.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center space-x-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>Bust Weeks ({stats.bustWeekDetails.length})</span>
                                  </h4>
                                  <div className="space-y-2">
                                    {stats.bustWeekDetails.map((week, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                                        <div className="flex items-center space-x-3">
                                          <Badge variant="outline" className="text-xs">Week {week.week}</Badge>
                                          <div className="text-sm">
                                            <span className="font-semibold text-red-700">{formatScore(week.points)} pts</span>
                                            <span className="text-xs text-muted-foreground ml-2">
                                              (avg: {formatScore(week.average)})
                                            </span>
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-sm font-semibold text-red-600">
                                            {formatScore(week.diff)} ({formatScore(week.percentageDiff)}%)
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Player Booms Details */}
                              {stats.playerBoomDetails.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-green-600 mb-2 flex items-center space-x-1">
                                    <Zap className="h-4 w-4" />
                                    <span>Player Booms ({stats.playerBoomDetails.length})</span>
                                  </h4>
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {stats.playerBoomDetails.map((player, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-2 bg-green-500/10 rounded-lg border border-green-500/20">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                          <Badge variant="outline" className="text-xs shrink-0">W{player.week}</Badge>
                                          <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium truncate">
                                              {player.name}
                                              {player.wasStarter && (
                                                <Badge variant="secondary" className="ml-2 text-xs">Started</Badge>
                                              )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {player.position} • {formatScore(player.actual)} pts (proj: {formatScore(player.projected)})
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                          <div className="text-sm font-semibold text-green-600">
                                            +{formatScore(player.diff)} ({formatScore(player.percentage)}%)
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Player Busts Details */}
                              {stats.playerBustDetails.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center space-x-1">
                                    <AlertTriangle className="h-4 w-4" />
                                    <span>Player Busts ({stats.playerBustDetails.length})</span>
                                  </h4>
                                  <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {stats.playerBustDetails.map((player, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                          <Badge variant="outline" className="text-xs shrink-0">W{player.week}</Badge>
                                          <div className="min-w-0 flex-1">
                                            <div className="text-sm font-medium truncate">
                                              {player.name}
                                              {player.wasStarter && (
                                                <Badge variant="secondary" className="ml-2 text-xs">Started</Badge>
                                              )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {player.position} • {formatScore(player.actual)} pts (proj: {formatScore(player.projected)})
                                            </div>
                                          </div>
                                        </div>
                                        <div className="text-right shrink-0 ml-2">
                                          <div className="text-sm font-semibold text-red-600">
                                            {formatScore(player.diff)} ({formatScore(player.percentage)}%)
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Empty State */}
                              {stats.boomWeekDetails.length === 0 && 
                               stats.bustWeekDetails.length === 0 && 
                               stats.playerBoomDetails.length === 0 && 
                               stats.playerBustDetails.length === 0 && (
                                <div className="text-center py-4 text-sm text-muted-foreground">
                                  No boom/bust data available
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : null}
                    </div>
                  )
                })()}
              </Card>
            ))}
          </div>
        </div>

        {/* Waiver Wire Analysis Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">Waiver Wire Analysis</h2>
          </div>

          {loadingWaiverWire ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading waiver wire analysis...</span>
            </div>
          ) : waiverWireData ? (
            <>
              {/* Season Totals */}
              <Card className="p-6 mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Points on Waivers</div>
                    <div className="text-2xl font-bold text-red-500">
                      {formatScore(waiverWireData.seasonTotals.totalPoints)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Avg Per Week</div>
                    <div className="text-2xl font-bold text-orange-500">
                      {formatScore(waiverWireData.seasonTotals.avgPointsPerWeek)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Total Players</div>
                    <div className="text-2xl font-bold text-foreground">
                      {waiverWireData.seasonTotals.totalPlayers}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Significant Scores (15+ pts)</div>
                    <div className="text-2xl font-bold text-yellow-500">
                      {waiverWireData.seasonTotals.significantScoresCount}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Top Significant Scores */}
              {waiverWireData.topSignificantScores.length > 0 && (
                <Card className="p-6 mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <TrendingDown className="h-5 w-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold">Top Significant Waiver Wire Scores</h3>
                  </div>
                  <div className="space-y-2">
                    {waiverWireData.topSignificantScores.map((score, idx) => (
                      <div 
                        key={`${score.playerId}-${score.week}`}
                        className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20"
                      >
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="w-8 text-center">
                            {idx + 1}
                          </Badge>
                          <div>
                            <div className="font-semibold text-foreground">{score.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {score.position} • Week {score.week}
                            </div>
                          </div>
                        </div>
                        <div className="text-xl font-bold text-yellow-600">
                          {formatScore(score.points)} pts
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Weekly Breakdown */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold mb-3">Weekly Breakdown</h3>
                {waiverWireData.weeklyBreakdown.map((week) => (
                  <Card key={week.week} className="overflow-hidden">
                    <button
                      onClick={() => toggleWaiverWeekExpansion(week.week)}
                      className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-4">
                        {expandedWaiverWeeks.has(week.week) ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        <div className="font-semibold">Week {week.week}</div>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-muted-foreground">
                            Total: <span className="font-semibold text-red-500">{formatScore(week.totalPoints)} pts</span>
                          </span>
                          <span className="text-muted-foreground">
                            Players: <span className="font-semibold">{week.playerCount}</span>
                          </span>
                          {week.significantScores.length > 0 && (
                            <Badge variant="secondary">
                              {week.significantScores.length} significant scores
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedWaiverWeeks.has(week.week) && (
                      <div className="p-4 border-t bg-accent/20">
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Top 10 Players</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {week.topPlayers.map((player, idx) => (
                              <div 
                                key={player.playerId}
                                className="flex items-center justify-between p-2 bg-background rounded border"
                              >
                                <div className="flex items-center space-x-2 truncate">
                                  <span className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                                  <div className="truncate">
                                    <div className="text-sm font-medium truncate">{player.name}</div>
                                    <div className="text-xs text-muted-foreground">{player.position}</div>
                                  </div>
                                </div>
                                <span className="font-semibold ml-2">{formatScore(player.points)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {week.significantScores.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-2 text-sm text-yellow-600">Significant Scores (15+ pts)</h4>
                            <div className="space-y-2">
                              {week.significantScores.map((player) => (
                                <div 
                                  key={player.playerId}
                                  className="flex items-center justify-between p-2 bg-yellow-500/10 rounded border border-yellow-500/20"
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium">{player.name}</span>
                                    <Badge variant="outline" className="text-xs">{player.position}</Badge>
                                  </div>
                                  <span className="font-bold text-yellow-600">{formatScore(player.points)} pts</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No waiver wire data available</p>
            </Card>
          )}
        </div>

        {/* Weekly Breakdown Modal */}
        {selectedTeam && weeklyBreakdown && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => {
            setSelectedTeam(null)
            setWeeklyBreakdown(null)
            setExpandedWeeks(new Set())
          }}>
            <Card className="max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6 sticky top-0 bg-background pb-4 border-b">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-primary/20">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">{weeklyBreakdown.teamName}</h2>
                      <p className="text-sm text-muted-foreground">
                        {weeklyBreakdown.weeklyBreakdown.length} weeks analyzed
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTeam(null)
                      setWeeklyBreakdown(null)
                      setExpandedWeeks(new Set())
                    }}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

              {/* Overall Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-accent/30 rounded-lg">
                <div>
                  <div className="text-xs text-muted-foreground">Overall Efficiency</div>
                  <div className={`text-2xl font-bold ${getScoreColor(weeklyBreakdown.overallStats.efficiency)}`}>
                    {formatScore(weeklyBreakdown.overallStats.efficiency)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Actual Points</div>
                  <div className="text-2xl font-bold">{formatScore(weeklyBreakdown.overallStats.actualPoints)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Optimal Points</div>
                  <div className="text-2xl font-bold">{formatScore(weeklyBreakdown.overallStats.optimalPoints)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Points Left on Bench</div>
                  <div className="text-2xl font-bold text-red-500">{formatScore(weeklyBreakdown.overallStats.pointsLeftOnBench)}</div>
                </div>
              </div>

              {/* Position Averages */}
              {weeklyBreakdown.positionAverages && Object.keys(weeklyBreakdown.positionAverages).length > 0 && (() => {
                const ranks = calculatePositionRanks(selectedTeam)
                // Check if we have position data for any team
                const hasRankingData = Object.keys(allTeamsPositionData).length > 0
                
                return (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Position Group Averages</h3>
                    {!hasRankingData && !fetchingAllTeams && (
                      <Badge variant="outline" className="text-xs">
                        Rankings unavailable
                      </Badge>
                    )}
                    {fetchingAllTeams && (
                      <Badge variant="secondary" className="text-xs">
                        <RefreshCw className="h-3 w-3 animate-spin inline mr-1" />
                        Calculating ranks...
                      </Badge>
                    )}
                  </div>
                  {hasRankingData && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Average weekly points for each position group with your league rank
                    </p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(weeklyBreakdown.positionAverages)
                      .sort(([a], [b]) => {
                        // Sort by position order: QB, RB, WR, TE, D/ST, K, FLEX
                        const order: { [key: string]: number } = {
                          'QB': 1, 'RB': 2, 'WR': 3, 'TE': 4, 'D/ST': 5, 'K': 6, 'FLEX': 7
                        };
                        return (order[a] || 99) - (order[b] || 99);
                      })
                      .map(([position, stats]) => {
                        const rank = ranks[position]
                        
                        return (
                        <div key={position} className="border rounded-lg p-3 bg-accent/20">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs text-muted-foreground">{position}</div>
                            {hasRankingData && rank && (
                              <Badge variant={rank === 1 ? "default" : rank <= 3 ? "secondary" : "outline"} className="text-xs">
                                {rank}{getRankSuffix(rank)}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xl font-bold text-foreground">
                            {formatScore(stats.avgPoints)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {stats.gamesPlayed} weeks • {formatScore(stats.totalPoints)} total
                          </div>
                        </div>
                      )})}
                  </div>
                </div>
              )})()}

              {/* Weekly Breakdown */}
              <div className="space-y-3">
                {weeklyBreakdown.weeklyBreakdown.map((week) => (
                  <div key={week.week} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleWeekExpansion(week.week)}
                      className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors text-left"
                    >
                      <div className="flex items-center space-x-4">
                        {expandedWeeks.has(week.week) ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        <div className="font-semibold">Week {week.week}</div>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-muted-foreground">
                            Actual: <span className="font-semibold text-foreground">{week.actualScore}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Optimal: <span className="font-semibold text-foreground">{week.optimalScore}</span>
                          </span>
                          <Badge variant={week.efficiency >= 90 ? "default" : week.efficiency >= 75 ? "secondary" : "destructive"}>
                            {week.efficiency}% efficient
                          </Badge>
                          {week.pointsLeftOnBench > 0 && (
                            <span className="text-red-500 font-semibold">
                              -{formatScore(week.pointsLeftOnBench)} on bench
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    {expandedWeeks.has(week.week) && (
                      <div className="p-4 border-t bg-accent/20">
                        {/* Sort function for consistent position order */}
                        {(() => {
                          const positionOrder = ['QB', 'RB', 'RB1', 'RB2', 'WR', 'WR1', 'WR2', 'TE', 'FLEX', 'D/ST', 'DST', 'K'];
                          const getPositionOrder = (pos: string) => {
                            const idx = positionOrder.indexOf(pos);
                            return idx >= 0 ? idx : 999;
                          };
                          
                          const sortedStarters = [...week.starters].sort((a, b) => getPositionOrder(a.position) - getPositionOrder(b.position));
                          const sortedOptimal = week.optimalLineup ? [...week.optimalLineup].sort((a, b) => getPositionOrder(a.position) - getPositionOrder(b.position)) : [];
                          
                              // Helper to convert generic positions to numbered (RB → RB1, RB2, etc.)
                              const positionCounters: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, 'D/ST': 0, DST: 0, K: 0, FLEX: 0 };
                              const normalizePos = (pos: string) => {
                                if (pos.startsWith('RB')) return 'RB';
                                if (pos.startsWith('WR')) return 'WR';
                                if (pos === 'DST') return 'D/ST';
                                return pos;
                              };
                              
                              // Create numbered positions for starters
                              const startStartsWithNumbers = sortedStarters.map(p => {
                                const normPos = normalizePos(p.position);
                                if (normPos in positionCounters) {
                                  positionCounters[normPos]++;
                                  let numLabel = normPos;
                                  if (normPos === 'RB' || normPos === 'WR') {
                                    numLabel = `${normPos}${positionCounters[normPos]}`;
                                  }
                                  return { ...p, numberedPosition: numLabel };
                                }
                                return { ...p, numberedPosition: p.position };
                              });
                              
                              return (
                                <>
                                  {/* Starters and Optimal Lineup - Two columns */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div>
                                      <h4 className="font-semibold mb-3 text-green-600 flex items-center space-x-2">
                                        <span>✓</span>
                                        <span>Actual Starters</span>
                                      </h4>
                                      <div className="space-y-2">
                                        {startStartsWithNumbers.map((player, idx) => (
                                          <div key={idx} className="flex items-center justify-between p-2.5 bg-green-500/10 rounded-lg border border-green-500/20">
                                            <div className="flex items-center space-x-2">
                                              <span className="text-xs text-muted-foreground font-mono bg-green-500/20 px-2 py-0.5 rounded w-14 text-center">{player.numberedPosition}</span>
                                              <span className="text-sm font-medium">{player.name}</span>
                                            </div>
                                            <span className="font-bold text-green-700">{player.points.toFixed(1)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                
                                <div>
                                  <h4 className="font-semibold mb-3 text-blue-600 flex items-center space-x-2">
                                    <span>⭐</span>
                                    <span>Optimal Lineup</span>
                                  </h4>
                                  <div className="space-y-2">
                                    {sortedOptimal.map((player, idx) => {
                                      const actualStarter = week.starters.find(s => s.playerId === player.playerId);
                                      const wasStarter = !!actualStarter;
                                      
                                      // Get the numbered position from the starters array
                                      const starterWithNumber = startStartsWithNumbers.find(s => s.playerId === player.playerId);
                                      const actualNumberedPosition = starterWithNumber?.numberedPosition;
                                      
                                      // Check if position actually changed (normalized comparison)
                                      const normalizedOptimal = normalizePos(player.position);
                                      const normalizedActual = wasStarter && actualNumberedPosition ? normalizePos(actualNumberedPosition) : '';
                                      const positionChanged = wasStarter && normalizedActual !== normalizedOptimal;
                                      
                                      // Determine the change type and styling
                                      let changeLabel = null;
                                      let bgClass = 'bg-blue-500/10 border-blue-500/20';
                                      let textClass = '';
                                      let borderClass = '';
                                      
                                      if (!wasStarter) {
                                        // Player was benched - should have been started
                                        changeLabel = '(from bench)';
                                        bgClass = 'bg-orange-500/20 border-orange-500/40';
                                        textClass = 'text-orange-600 font-bold';
                                        borderClass = 'ring-2 ring-orange-300';
                                      } else if (positionChanged) {
                                        // Player was started but in wrong position - show specific numbered original position
                                        changeLabel = `(was ${actualNumberedPosition})`;
                                        bgClass = 'bg-yellow-500/20 border-yellow-500/40';
                                        textClass = 'text-yellow-700 font-semibold';
                                        borderClass = 'ring-1 ring-yellow-300';
                                      }
                                      
                                      return (
                                        <div 
                                          key={idx} 
                                          className={`flex items-center justify-between p-2.5 rounded-lg border ${bgClass} ${borderClass}`}
                                        >
                                          <div className="flex items-center space-x-2">
                                            <span className="text-xs text-muted-foreground font-mono bg-blue-500/20 px-2 py-0.5 rounded w-14 text-center">{player.position}</span>
                                            <div className="flex items-center space-x-1">
                                              <span className={`text-sm font-medium ${textClass}`}>
                                                {player.name}
                                              </span>
                                              {changeLabel && (
                                                <span className="text-xs text-muted-foreground italic">{changeLabel}</span>
                                              )}
                                            </div>
                                          </div>
                                          <span className={`font-bold ${textClass || 'text-blue-700'}`}>
                                            {player.points.toFixed(1)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Bench - Full width */}
                              <div className="border-t pt-4">
                                <h4 className="font-semibold mb-3 text-muted-foreground flex items-center space-x-2">
                                  <span>📋</span>
                                  <span>Bench ({week.bench.length} players)</span>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                  {week.bench.map((player, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm border border-muted">
                                      <div className="flex items-center space-x-2 truncate">
                                        <span className="text-xs text-muted-foreground">{player.position}</span>
                                        <span className="opacity-70 truncate">{player.name}</span>
                                      </div>
                                      <span className="font-semibold ml-2">{player.points.toFixed(1)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Score Summary */}
                              <div className="border-t pt-4 mt-4">
                                <div className="grid grid-cols-3 gap-4">
                                  <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                    <div className="text-xs text-muted-foreground mb-1">Actual Score</div>
                                    <div className="text-2xl font-bold text-green-700">{week.actualScore}</div>
                                  </div>
                                  <div className="text-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                    <div className="text-xs text-muted-foreground mb-1">Optimal Score</div>
                                    <div className="text-2xl font-bold text-blue-700">{week.optimalScore}</div>
                                  </div>
                                  <div className="text-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                                    <div className="text-xs text-muted-foreground mb-1">Points Left</div>
                                    <div className={`text-2xl font-bold ${week.pointsLeftOnBench > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {week.pointsLeftOnBench > 0 ? '-' : '+'}{Math.abs(week.pointsLeftOnBench)}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Breakdown of slot changes */}
                                {(() => {
                                  const slotChanges: Array<{position: string, from: any, to: any, diff: number}> = [];
                                  
                                  // Compare each slot position-by-position
                                  startStartsWithNumbers.forEach((startPlayer, slotIdx) => {
                                    // Match by exact position (RB1 to RB1, RB2 to RB2, etc.)
                                    const optimalPlayer = sortedOptimal[slotIdx];
                                    
                                    if (optimalPlayer && optimalPlayer.playerId !== startPlayer.playerId) {
                                      const diff = optimalPlayer.points - startPlayer.points;
                                      slotChanges.push({
                                        position: startPlayer.numberedPosition,
                                        from: startPlayer,
                                        to: optimalPlayer,
                                        diff: diff
                                      });
                                    }
                                  });
                                  
                                  if (slotChanges.length > 0) {
                                    const totalChange = slotChanges.reduce((sum, change) => sum + change.diff, 0);
                                    
                                    return (
                                      <div className="mt-4 p-3 bg-accent/30 rounded-lg border">
                                        <div className="text-xs font-semibold text-muted-foreground mb-2">Slot-by-Slot Changes:</div>
                                        <div className="space-y-1.5">
                                          {slotChanges.map((change, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs">
                                              <div className="flex items-center space-x-2">
                                                <span className="font-mono text-muted-foreground w-12">{change.position}</span>
                                                <span className="text-red-600 font-medium">{change.from.name}</span>
                                                <span className="text-muted-foreground">→</span>
                                                <span className="text-green-600 font-semibold">{change.to.name}</span>
                                              </div>
                                              <span className={`font-bold ${change.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {change.diff > 0 ? '+' : ''}{change.diff.toFixed(1)}
                                              </span>
                                            </div>
                                          ))}
                                          <div className="pt-1.5 mt-1.5 border-t flex items-center justify-between text-xs font-semibold">
                                            <span className="text-muted-foreground">Total Change:</span>
                                            <span className={`font-bold text-lg ${totalChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                              {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              </div>
            </Card>
          </div>
        )}

        {loadingBreakdown && (
          <div className="mb-8 flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading weekly breakdown...</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default Analytics

