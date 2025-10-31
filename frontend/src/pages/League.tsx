import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select'
import { RefreshCw, Trophy, Users, Calendar, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react'
import { 
  getLeagueOverview, 
  getAvailableWeeks,
  getLeagueBoxscores,
  syncWeek,
  getLeagueTransactions,
  syncLeagueTransactions,
  LeagueStanding,
  LeagueMatchup,
  LeagueInfo,
  DetailedMatchup,
  Transaction,
  TransactionStats
} from '../services/api'
import Transactions from '../components/Transactions'

interface LeagueData {
  standings: LeagueStanding[]
  matchups: LeagueMatchup[]
  leagueInfo: LeagueInfo | null
  seasonId: number
  week: number
  errors: string[]
}

interface BoxscoreData {
  season: number
  week: number
  matchups: DetailedMatchup[]
  totalMatchups: number
}

interface AvailableWeek {
  week: number
  isCurrentWeek: boolean
  isPastWeek: boolean
  isFutureWeek: boolean
  label: string
}

const League: React.FC = () => {
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null)
  const [boxscoreData, setBoxscoreData] = useState<BoxscoreData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [availableWeeks, setAvailableWeeks] = useState<AvailableWeek[]>([])
  const [currentWeek, setCurrentWeek] = useState<number | null>(null)
  const [showDetailedMatchups, setShowDetailedMatchups] = useState(false)
  const [scrollToTeam, setScrollToTeam] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'standings' | 'matchups' | 'rosters' | 'transactions'>('standings')
  const [transactionsData, setTransactionsData] = useState<{ transactions: Transaction[], stats: TransactionStats } | null>(null)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [transactionsViewMode, setTransactionsViewMode] = useState<'all' | 'week'>('all')
  const [syncingTransactions, setSyncingTransactions] = useState(false)

  // Handle jumping to a team's detailed roster
  const handleJumpToTeam = (teamId: number) => {
    setShowDetailedMatchups(true)
    setScrollToTeam(teamId)
    // Scroll will happen after the detailed rosters are rendered
  }

  const fetchLeagueData = async (week?: number) => {
    try {
      setError(null)
      const data = await getLeagueOverview(undefined, undefined, week)
      
      if (data.success) {
        setLeagueData({
          standings: data.standings || [],
          matchups: data.matchups || [],
          leagueInfo: data.leagueInfo || null,
          seasonId: data.seasonId,
          week: data.week,
          errors: data.errors || []
        })
      } else {
        setError(data.error || 'Failed to fetch league data')
      }
    } catch (err) {
      setError('Failed to fetch league data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchBoxscoreData = async (week?: number) => {
    try {
      const data = await getLeagueBoxscores(undefined, week)
      
      if (data.success) {
        setBoxscoreData({
          season: data.season,
          week: data.week,
          matchups: data.matchups,
          totalMatchups: data.totalMatchups
        })
      } else {
        setBoxscoreData(null)
      }
    } catch (err) {
      setBoxscoreData(null)
    }
  }

  const fetchAvailableWeeks = async () => {
    try {
      const data = await getAvailableWeeks()
      if (data.success) {
        setAvailableWeeks(data.availableWeeks || [])
        setCurrentWeek(data.currentWeek || null)
        if (!selectedWeek) {
          setSelectedWeek(data.currentWeek || 1)
        }
      }
    } catch (err) {
    }
  }

  const fetchTransactions = async (week?: number | null) => {
    try {
      setLoadingTransactions(true)
      // If view mode is 'all', pass null to get all transactions
      const weekToFetch = transactionsViewMode === 'all' ? null : (week || undefined)
      const data = await getLeagueTransactions(leagueData?.seasonId, weekToFetch)
      
      if (data.success) {
        setTransactionsData({
          transactions: data.transactions || [],
          stats: data.stats
        })
      } else {
        setTransactionsData(null)
      }
    } catch (err) {
      setTransactionsData(null)
    } finally {
      setLoadingTransactions(false)
    }
  }

  const handleSyncTransactions = async () => {
    try {
      setSyncingTransactions(true)
      const weekToSync = transactionsViewMode === 'all' ? null : (selectedWeek || undefined)
      const data = await syncLeagueTransactions(leagueData?.seasonId, weekToSync)
      
      if (data.success) {
        setTransactionsData({
          transactions: data.transactions || [],
          stats: data.stats
        })
      }
    } catch (err) {
      console.error('Error syncing transactions:', err)
    } finally {
      setSyncingTransactions(false)
    }
  }

  const handleTransactionsViewModeChange = (mode: 'all' | 'week') => {
    setTransactionsViewMode(mode)
    // Fetch transactions based on new mode
    if (mode === 'all') {
      fetchTransactions(null)
    } else {
      fetchTransactions(selectedWeek)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchLeagueData(selectedWeek || undefined),
      fetchBoxscoreData(selectedWeek || undefined),
      activeTab === 'transactions' ? fetchTransactions(transactionsViewMode === 'all' ? null : (selectedWeek || undefined)) : Promise.resolve()
    ])
  }

  const handleWeekChange = async (week: number) => {
    setSelectedWeek(week)
    setLoading(true)
    await Promise.all([
      fetchLeagueData(week),
      fetchBoxscoreData(week)
    ])
  }

  const handlePreviousWeek = () => {
    const currentIndex = availableWeeks.findIndex(w => w.week === selectedWeek)
    if (currentIndex > 0) {
      const prevWeek = availableWeeks[currentIndex - 1].week
      handleWeekChange(prevWeek)
    }
  }

  const handleNextWeek = () => {
    const currentIndex = availableWeeks.findIndex(w => w.week === selectedWeek)
    if (currentIndex < availableWeeks.length - 1) {
      const nextWeek = availableWeeks[currentIndex + 1].week
      handleWeekChange(nextWeek)
    }
  }

  useEffect(() => {
    const initializeData = async () => {
      await fetchAvailableWeeks()
    }
    initializeData()
  }, [])

  // Fetch data when selectedWeek changes
  useEffect(() => {
    if (selectedWeek !== null) {
      const loadData = async () => {
        setLoading(true)
        
        // Always fetch the data first
        await Promise.all([
          fetchLeagueData(selectedWeek),
          fetchBoxscoreData(selectedWeek),
          activeTab === 'transactions' ? fetchTransactions(transactionsViewMode === 'all' ? null : selectedWeek) : Promise.resolve()
        ])
        
        // Check if we got data
        // If not, sync it automatically in the background
        // (this will happen if the week has never been synced before)
        const hasData = leagueData?.matchups && leagueData.matchups.length > 0
        
        if (!hasData) {
          try {
            const seasonId = leagueData?.seasonId || 2025
            await syncWeek(seasonId, selectedWeek, true) // force=true to ensure we fetch fresh data
            
            // Refresh after sync
            await Promise.all([
              fetchLeagueData(selectedWeek),
              fetchBoxscoreData(selectedWeek)
            ])
          } catch (error) {
          }
        }
        
        setLoading(false)
      }
      loadData()
    }
  }, [selectedWeek])

  // Fetch transactions when tab changes
  useEffect(() => {
    if (activeTab === 'transactions') {
      if (transactionsViewMode === 'all') {
        fetchTransactions(null)
      } else {
        fetchTransactions(selectedWeek)
      }
    }
  }, [activeTab, transactionsViewMode, selectedWeek])

  // Handle scrolling to a team's detailed roster
  useEffect(() => {
    if (scrollToTeam && showDetailedMatchups && boxscoreData) {
      // Find the matchup that contains this team
      const matchup = boxscoreData.matchups.find(m => 
        m.homeTeam.teamId === scrollToTeam || m.awayTeam.teamId === scrollToTeam
      )
      
      if (matchup) {
        // Find the index of this matchup
        const matchupIdx = boxscoreData.matchups.indexOf(matchup)
        const elementId = `matchup-${matchupIdx}-${scrollToTeam}`
        
        // Scroll after a short delay to ensure the element is rendered
        setTimeout(() => {
          const element = document.getElementById(elementId)
          if (element) {
            // Scroll with offset to center the element in view
            const elementPosition = element.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.pageYOffset - (window.innerHeight / 2) + 100
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' })
            
            // Highlight the team briefly
            element.classList.add('ring-2', 'ring-blue-500')
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-blue-500')
            }, 2000)
          }
        }, 100)
      }
      
      setScrollToTeam(null)
    }
  }, [scrollToTeam, showDetailedMatchups, boxscoreData])

  const getStreakIcon = (streak: string) => {
    if (streak.includes('W')) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (streak.includes('L')) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getMatchupStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'final': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'scheduled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPositionLabel = (position: number): string => {
    const positions: { [key: number]: string } = {
      0: 'QB',
      2: 'RB',
      4: 'WR',
      6: 'TE',
      16: 'D/ST',
      17: 'K',
      20: 'BENCH',
      21: 'IR',
      23: 'FLEX'
    }
    return positions[position] || `POS ${position}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading league data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Trophy className="h-12 w-12 mx-auto mb-2" />
            <h2 className="text-xl font-semibold">Failed to Load League Data</h2>
            <p className="text-muted-foreground mt-2">{error}</p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  if (!leagueData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">No league data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-foreground mb-2 truncate">
              {leagueData.leagueInfo?.leagueName || 'Fantasy League'}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Season {leagueData.seasonId}</span>
              <span>•</span>
              <span>Week {leagueData.week}</span>
              {leagueData.leagueInfo && (
                <>
                  <span>•</span>
                  <span>{leagueData.leagueInfo.totalTeams} Teams</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Week Navigation */}
            <div className="flex items-center space-x-3">
              <Button 
                onClick={handlePreviousWeek} 
                disabled={!selectedWeek || availableWeeks.findIndex(w => w.week === selectedWeek) === 0}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="min-w-0 flex-1">
                <Select
                  value={selectedWeek?.toString() || ''}
                  onValueChange={(value) => handleWeekChange(parseInt(value))}
                >
                  <SelectTrigger className="w-full min-w-[200px] max-w-[280px]">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[280px]">
                    {availableWeeks.map((week) => (
                      <SelectItem key={week.week} value={week.week.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{week.label}</span>
                          <div className="flex items-center space-x-1 ml-2">
                            {week.isCurrentWeek && (
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">Current</Badge>
                            )}
                            {week.isPastWeek && (
                              <Badge variant="outline" className="text-xs px-2 py-0.5">Past</Badge>
                            )}
                            {week.isFutureWeek && (
                              <Badge variant="outline" className="text-xs px-2 py-0.5">Future</Badge>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={handleNextWeek} 
                disabled={!selectedWeek || availableWeeks.findIndex(w => w.week === selectedWeek) === availableWeeks.length - 1}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* League Info Cards */}
        {leagueData.leagueInfo && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Teams</p>
                  <p className="text-2xl font-bold">{leagueData.leagueInfo.totalTeams}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Playoff Teams</p>
                  <p className="text-2xl font-bold">{leagueData.leagueInfo.playoffTeams}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Regular Season</p>
                  <p className="text-2xl font-bold">{leagueData.leagueInfo.regularSeasonWeeks} weeks</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Scoring</p>
                  <p className="text-lg font-semibold">{leagueData.leagueInfo.scoringType}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="mb-6 border-b">
          <div className="flex space-x-1">
            <Button
              variant={activeTab === 'standings' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('standings')}
              className="rounded-b-none"
            >
              <Trophy className="h-4 w-4 mr-2" />
              Standings
            </Button>
            <Button
              variant={activeTab === 'matchups' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('matchups')}
              className="rounded-b-none"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Matchups
            </Button>
            <Button
              variant={activeTab === 'rosters' ? 'default' : 'ghost'}
              onClick={() => {
                setActiveTab('rosters')
                setShowDetailedMatchups(true)
              }}
              className="rounded-b-none"
            >
              <Users className="h-4 w-4 mr-2" />
              Rosters
            </Button>
            <Button
              variant={activeTab === 'transactions' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('transactions')}
              className="rounded-b-none"
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Transactions
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'transactions' && transactionsData ? (
          <div className="space-y-4">
            {/* View Mode Toggle and Sync Button */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">View:</span>
                    <div className="flex gap-2">
                      <Button
                        variant={transactionsViewMode === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleTransactionsViewModeChange('all')}
                      >
                        All Transactions
                      </Button>
                      <Button
                        variant={transactionsViewMode === 'week' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleTransactionsViewModeChange('week')}
                      >
                        By Week
                      </Button>
                    </div>
                    {transactionsViewMode === 'week' && (
                      <Select
                        value={selectedWeek?.toString() || ''}
                        onValueChange={(value) => {
                          const week = parseInt(value)
                          setSelectedWeek(week)
                          fetchTransactions(week)
                        }}
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Select week" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableWeeks.map((w) => (
                            <SelectItem key={w.week} value={w.week.toString()}>
                              {w.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncTransactions}
                    disabled={syncingTransactions}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncingTransactions ? 'animate-spin' : ''}`} />
                    {syncingTransactions ? 'Syncing...' : 'Sync Transactions'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Transactions
              transactions={transactionsData.transactions}
              stats={transactionsData.stats}
              loading={loadingTransactions}
              seasonId={leagueData.seasonId}
              week={transactionsViewMode === 'all' ? null : selectedWeek}
              onWeekChange={(week) => {
                setSelectedWeek(week)
                fetchTransactions(week)
              }}
              availableWeeks={availableWeeks}
            />
          </div>
        ) : activeTab === 'transactions' && !transactionsData && !loadingTransactions ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-12 text-muted-foreground">
                <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transaction data available</p>
              </div>
            </CardContent>
          </Card>
        ) : activeTab !== 'transactions' && (
          <>
          {activeTab === 'standings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Standings */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center">
              <Trophy className="h-6 w-6 mr-2 text-primary" />
              Standings
            </h2>
            <Card className="p-6">
              <div className="space-y-4">
                {leagueData.standings.map((team, index) => (
                  <div key={team.teamId} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                        {index + 1}
                      </div>
                      {team.logo ? (
                        <img src={team.logo} alt={team.teamName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-foreground">{team.teamName}</h3>
                        <p className="text-sm text-muted-foreground">{team.owner}</p>
                      </div>
                    </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold">{team.wins}-{team.losses}</span>
                          {team.ties > 0 && <span className="text-muted-foreground">-{team.ties}</span>}
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(team.winPercentage * 1000) / 10}%
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <span>PF: {team.pointsFor?.toFixed(1) ?? '0.0'}</span>
                          <span>PA: {team.pointsAgainst?.toFixed(1) ?? '0.0'}</span>
                        <div className="flex items-center space-x-1">
                          {getStreakIcon(team.streak)}
                          <span>{team.streak}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Week Matchups */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-primary" />
              Week {leagueData.week} Matchups
              {selectedWeek && selectedWeek < (currentWeek || 0) && (
                <Badge variant="outline" className="ml-2">Completed</Badge>
              )}
              {selectedWeek && selectedWeek === currentWeek && (
                <Badge variant="secondary" className="ml-2">Current</Badge>
              )}
              {selectedWeek && selectedWeek > (currentWeek || 0) && (
                <Badge variant="outline" className="ml-2">Upcoming</Badge>
              )}
            </h2>
            <Card className="p-6">
              <div className="space-y-4">
                {leagueData.matchups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No matchups found for this week</p>
                  </div>
                ) : (
                  leagueData.matchups.map((matchup) => (
                    <div key={matchup.matchupId} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className={getMatchupStatusColor(matchup.status)}>
                          {matchup.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {matchup.isPlayoff && (
                          <Badge variant="destructive">Playoff</Badge>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {/* Away Team */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {matchup.awayTeam.logo ? (
                              <img 
                                src={matchup.awayTeam.logo} 
                                alt={matchup.awayTeam.teamName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs font-bold">A</span>
                              </div>
                            )}
                            <div>
                              <h4 
                                className="font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => handleJumpToTeam(matchup.awayTeam.teamId)}
                              >
                                {matchup.awayTeam.teamName}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Proj: {matchup.awayTeam.projectedScore?.toFixed(1) ?? '0.0'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{matchup.awayTeam.score?.toFixed(1) ?? '0.0'}</p>
                          </div>
                        </div>

                        {/* Home Team */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {matchup.homeTeam.logo ? (
                              <img 
                                src={matchup.homeTeam.logo} 
                                alt={matchup.homeTeam.teamName}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs font-bold">H</span>
                              </div>
                            )}
                            <div>
                              <h4 
                                className="font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                                onClick={() => handleJumpToTeam(matchup.homeTeam.teamId)}
                              >
                                {matchup.homeTeam.teamName}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                Proj: {matchup.homeTeam.projectedScore?.toFixed(1) ?? '0.0'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold">{matchup.homeTeam.score?.toFixed(1) ?? '0.0'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
        )}
        {(activeTab === 'rosters' || activeTab === 'matchups') && boxscoreData && boxscoreData.totalMatchups > 0 && (
          <>
          {/* Detailed Boxscore Data */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground flex items-center">
                <Users className="h-6 w-6 mr-2 text-primary" />
                Detailed Rosters
                <Badge variant="secondary" className="ml-2">
                  {boxscoreData.totalMatchups} Matchups
                </Badge>
              </h2>
              <Button
                onClick={() => setShowDetailedMatchups(!showDetailedMatchups)}
                variant="outline"
                size="sm"
              >
                {showDetailedMatchups ? 'Hide Rosters' : 'Show Rosters'}
              </Button>
            </div>
            
            {showDetailedMatchups && (
              <Card className="p-6">
                <div className="space-y-8">
                  {boxscoreData.matchups.map((matchup, matchupIdx) => (
                    <div key={matchup.matchupId} id={`matchup-${matchupIdx}`} className="border-b last:border-0 pb-6 last:pb-0">
                      <div className="mb-4">
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-2">
                            {matchup.awayTeam.logo && (
                              <img src={matchup.awayTeam.logo} alt={matchup.awayTeam.teamName} className="w-6 h-6 rounded-full object-cover" />
                            )}
                            <span className="font-medium">{matchup.awayTeam.teamName}</span>
                            <span className="text-muted-foreground ml-2">
                              {matchup.awayTeam.totalActual.toFixed(2)} pts
                            </span>
                          </div>
                          <span className="text-muted-foreground">vs</span>
                          <div className="flex items-center space-x-2">
                            {matchup.homeTeam.logo && (
                              <img src={matchup.homeTeam.logo} alt={matchup.homeTeam.teamName} className="w-6 h-6 rounded-full object-cover" />
                            )}
                            <span className="font-medium">{matchup.homeTeam.teamName}</span>
                            <span className="text-muted-foreground ml-2">
                              {matchup.homeTeam.totalActual.toFixed(2)} pts
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Away Team */}
                        <div id={`matchup-${matchupIdx}-${matchup.awayTeam.teamId}`}>
                          <h4 className="font-semibold text-foreground mb-2">{matchup.awayTeam.teamName}</h4>
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Starters:</div>
                            {matchup.awayTeam.starters.map((player, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {getPositionLabel(player.position)}
                                  </Badge>
                                  <span>{player.fullName}</span>
                                </div>
                                <span className="font-semibold">{player.pointsActual.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="text-sm font-medium text-muted-foreground mt-4">Bench:</div>
                            {matchup.awayTeam.bench.map((player, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm text-muted-foreground">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs opacity-50">
                                    {getPositionLabel(player.position)}
                                  </Badge>
                                  <span>{player.fullName}</span>
                                </div>
                                <span>{player.pointsActual.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Home Team */}
                        <div id={`matchup-${matchupIdx}-${matchup.homeTeam.teamId}`}>
                          <h4 className="font-semibold text-foreground mb-2">{matchup.homeTeam.teamName}</h4>
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-muted-foreground">Starters:</div>
                            {matchup.homeTeam.starters.map((player, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {getPositionLabel(player.position)}
                                  </Badge>
                                  <span>{player.fullName}</span>
                                </div>
                                <span className="font-semibold">{player.pointsActual.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="text-sm font-medium text-muted-foreground mt-4">Bench:</div>
                            {matchup.homeTeam.bench.map((player, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm text-muted-foreground">
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs opacity-50">
                                    {getPositionLabel(player.position)}
                                  </Badge>
                                  <span>{player.fullName}</span>
                                </div>
                                <span>{player.pointsActual.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
          </>
        )}
          </>
        )}

        {/* Errors */}
        {leagueData.errors.length > 0 && (
          <div className="mt-8">
            <Card className="p-4 border-yellow-200 bg-yellow-50">
              <h3 className="font-semibold text-yellow-800 mb-2">Data Issues</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                {leagueData.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default League
