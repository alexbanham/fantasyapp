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
import { RefreshCw, Trophy, Users, Calendar, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, ArrowLeftRight, CheckCircle2, Clock, Play } from 'lucide-react'
import { 
  getLeagueOverview, 
  getAvailableWeeks,
  getLeagueBoxscores,
  syncWeek,
  syncRosteredPlayersCurrentWeek,
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
import { getTeamLogoWithFallback } from '../lib/teamLogos'

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
    setActiveTab('rosters')
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

  // Fetch data when selectedWeek or currentWeek changes
  useEffect(() => {
    if (selectedWeek !== null) {
      const loadData = async () => {
        setLoading(true)
        
        // Sync rostered players for current week if we're loading current week matchups
        // Only sync rostered players (not all players) for efficiency
        // Do this once before fetching data to avoid duplicate syncs
        if (selectedWeek && currentWeek && selectedWeek === currentWeek) {
          try {
            await syncRosteredPlayersCurrentWeek()
          } catch (syncError) {
            console.warn('Error syncing rostered players (continuing anyway):', syncError)
            // Continue even if sync fails
          }
        }
        
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
  }, [selectedWeek, currentWeek])

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
    if (scrollToTeam && showDetailedMatchups && boxscoreData && activeTab === 'rosters') {
      // Find the matchup that contains this team
      const matchup = boxscoreData.matchups.find(m => 
        m.homeTeam.teamId === scrollToTeam || m.awayTeam.teamId === scrollToTeam
      )
      
      if (matchup) {
        // Find the index of this matchup
        const matchupIdx = boxscoreData.matchups.indexOf(matchup)
        const elementId = `matchup-${matchupIdx}-${scrollToTeam}`
        
        // Scroll after a delay to ensure the element is rendered and tab is switched
        setTimeout(() => {
          const element = document.getElementById(elementId)
          if (element) {
            // Get element position relative to viewport
            const elementRect = element.getBoundingClientRect()
            const absoluteElementTop = elementRect.top + window.pageYOffset
            // Calculate offset to center element in viewport
            const offsetPosition = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2)
            
            // Scroll to center the element
            window.scrollTo({ 
              top: Math.max(0, offsetPosition), 
              behavior: 'smooth' 
            })
            
            // Highlight the team briefly with a ring
            element.classList.add('ring-4', 'ring-blue-500', 'ring-offset-2')
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-2')
            }, 3000)
          }
        }, 300) // Increased delay to ensure tab switch is complete
      }
      
      setScrollToTeam(null)
    }
  }, [scrollToTeam, showDetailedMatchups, boxscoreData, activeTab])

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
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 truncate">
              {leagueData.leagueInfo?.leagueName || 'Fantasy League'}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            {/* Week Navigation */}
            <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
              <Button 
                onClick={handlePreviousWeek} 
                disabled={!selectedWeek || availableWeeks.findIndex(w => w.week === selectedWeek) === 0}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="min-w-0 flex-1 sm:flex-initial">
                <Select
                  value={selectedWeek?.toString() || ''}
                  onValueChange={(value) => handleWeekChange(parseInt(value))}
                >
                  <SelectTrigger className="w-full sm:min-w-[180px] sm:max-w-[240px] text-sm">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent className="min-w-[240px]">
                    {availableWeeks.map((week) => (
                      <SelectItem key={week.week} value={week.week.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium text-sm">{week.label}</span>
                          <div className="flex items-center space-x-1 ml-2">
                            {week.isCurrentWeek && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Current</Badge>
                            )}
                            {week.isPastWeek && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Past</Badge>
                            )}
                            {week.isFutureWeek && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Future</Badge>
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
            
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline" size="sm" className="w-full sm:w-auto">
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs sm:text-sm">Refresh</span>
            </Button>
          </div>
        </div>

        {/* League Info Cards */}
        {leagueData.leagueInfo && (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
            <Card className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Total Teams</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{leagueData.leagueInfo.totalTeams}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Playoff Teams</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{leagueData.leagueInfo.playoffTeams}</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Regular Season</p>
                  <p className="text-lg sm:text-xl md:text-2xl font-bold">{leagueData.leagueInfo.regularSeasonWeeks} weeks</p>
                </div>
              </div>
            </Card>
            <Card className="p-3 sm:p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">Scoring</p>
                  <p className="text-sm sm:text-base md:text-lg font-semibold truncate">{leagueData.leagueInfo.scoringType}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="mb-4 sm:mb-6 border-b overflow-x-auto">
          <div className="flex space-x-1 min-w-max sm:min-w-0">
            <Button
              variant={activeTab === 'standings' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('standings')}
              className="rounded-b-none text-xs sm:text-sm shrink-0"
              size="sm"
            >
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Standings
            </Button>
            <Button
              variant={activeTab === 'matchups' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('matchups')}
              className="rounded-b-none text-xs sm:text-sm shrink-0"
              size="sm"
            >
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Matchups
            </Button>
            <Button
              variant={activeTab === 'rosters' ? 'default' : 'ghost'}
              onClick={() => {
                setActiveTab('rosters')
                setShowDetailedMatchups(true)
              }}
              className="rounded-b-none text-xs sm:text-sm shrink-0"
              size="sm"
            >
              <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Rosters
            </Button>
            <Button
              variant={activeTab === 'transactions' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('transactions')}
              className="rounded-b-none text-xs sm:text-sm shrink-0"
              size="sm"
            >
              <ArrowLeftRight className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Transactions
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'transactions' && transactionsData ? (
          <div className="space-y-3 sm:space-y-4">
            {/* View Mode Toggle and Sync Button */}
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col gap-3 sm:gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <span className="text-xs sm:text-sm font-medium">View:</span>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          variant={transactionsViewMode === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleTransactionsViewModeChange('all')}
                          className="flex-1 sm:flex-initial text-xs sm:text-sm"
                        >
                          All
                        </Button>
                        <Button
                          variant={transactionsViewMode === 'week' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleTransactionsViewModeChange('week')}
                          className="flex-1 sm:flex-initial text-xs sm:text-sm"
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
                          <SelectTrigger className="w-full sm:w-[150px] text-xs sm:text-sm">
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
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 ${syncingTransactions ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{syncingTransactions ? 'Syncing...' : 'Sync Transactions'}</span>
                      <span className="sm:hidden">{syncingTransactions ? 'Syncing...' : 'Sync'}</span>
                    </Button>
                  </div>
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
            <div>
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 flex items-center">
                  <Trophy className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-primary shrink-0" />
                  League Standings
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Tap on any team to view their roster</p>
              </div>
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <div className="divide-y divide-border/30 min-w-max sm:min-w-0">
                    {leagueData.standings.map((team, index) => (
                      <div 
                        key={team.teamId}
                        className="grid grid-cols-12 gap-2 sm:gap-4 items-center p-3 sm:p-4 hover:bg-accent/50 transition-colors cursor-pointer group active:bg-accent/70 min-w-[800px] sm:min-w-0"
                        onClick={() => handleJumpToTeam(team.teamId)}
                      >
                        {/* Rank Badge */}
                        <div className="col-span-1 flex justify-center shrink-0">
                          <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-bold text-sm sm:text-base ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/30 text-yellow-600' :
                            index === 1 ? 'bg-gradient-to-br from-slate-400/30 to-slate-500/30 text-slate-500' :
                            index === 2 ? 'bg-gradient-to-br from-orange-500/30 to-orange-600/30 text-orange-600' :
                            'bg-gradient-to-br from-primary/20 to-primary/30 text-primary'
                          }`}>
                            {index + 1}
                          </div>
                        </div>

                        {/* Team Logo */}
                        <div className="col-span-1 flex justify-center shrink-0">
                          {team.logo ? (
                            <img 
                              src={team.logo} 
                              alt={team.teamName} 
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-border/30"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 border-2 border-border/30 flex items-center justify-center">
                              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                            </div>
                          )}
                        </div>

                        {/* Team Info */}
                        <div className="col-span-4 min-w-0 shrink-0">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                            {team.teamName}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">{team.owner}</p>
                        </div>

                        {/* Stats - All visible, scrollable on mobile */}
                        <div className={`col-span-6 grid ${team.playoffOdds !== undefined ? 'grid-cols-6' : 'grid-cols-5'} gap-2 sm:gap-4 items-center shrink-0`}>
                          {/* Record */}
                          <div className="text-center min-w-[60px]">
                            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Record</div>
                            <div className="flex items-center justify-center space-x-1">
                              <span className="font-semibold text-xs sm:text-sm">{team.wins}-{team.losses}</span>
                              {team.ties > 0 && <span className="text-muted-foreground text-[10px] sm:text-xs">-{team.ties}</span>}
                            </div>
                          </div>
                          
                          {/* Win % */}
                          <div className="text-center min-w-[60px]">
                            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Win %</div>
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">
                              {Math.round(team.winPercentage * 1000) / 10}%
                            </Badge>
                          </div>
                          
                          {/* Points For */}
                          <div className="text-center min-w-[70px]">
                            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Points For</div>
                            <span className="font-semibold text-xs sm:text-sm">{team.pointsFor?.toFixed(1) ?? '0.0'}</span>
                          </div>
                          
                          {/* Points Against */}
                          <div className="text-center min-w-[80px]">
                            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Points Against</div>
                            <span className="font-semibold text-xs sm:text-sm">{team.pointsAgainst?.toFixed(1) ?? '0.0'}</span>
                          </div>
                          
                          {/* Streak */}
                          <div className="text-center min-w-[60px]">
                            <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Streak</div>
                            <div className="flex items-center justify-center space-x-1">
                              {getStreakIcon(team.streak)}
                              <span className="font-semibold text-xs sm:text-sm">{team.streak}</span>
                            </div>
                          </div>
                          
                          {/* Playoff Odds */}
                          {team.playoffOdds !== undefined && (
                            <div className="text-center min-w-[70px]">
                              <div className="text-[10px] sm:text-xs text-muted-foreground mb-1">Playoff %</div>
                              <Badge 
                                variant="outline"
                                className={`text-[10px] sm:text-xs ${
                                  team.playoffOdds >= 75
                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                    : team.playoffOdds >= 50
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : team.playoffOdds >= 25
                                    ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}
                              >
                                {team.playoffOdds.toFixed(0)}%
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'matchups' && (
            <div>
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 flex items-center">
                  <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-primary shrink-0" />
                  Week {leagueData.week} Matchups
                </h2>
                <div className="flex items-center space-x-2">
                  {selectedWeek && selectedWeek < (currentWeek || 0) && (
                    <Badge variant="outline" className="text-xs">Completed</Badge>
                  )}
                  {selectedWeek && selectedWeek === currentWeek && (
                    <Badge variant="secondary" className="text-xs">Current</Badge>
                  )}
                  {selectedWeek && selectedWeek > (currentWeek || 0) && (
                    <Badge variant="outline" className="text-xs">Upcoming</Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {leagueData.matchups.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="p-12">
                      <div className="text-center text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No matchups found for this week</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  leagueData.matchups.map((matchup) => {
                    // Calculate win probability (same logic as dashboard)
                    const getTeamExpectedScore = (team: any): number => {
                      const actual = team.score || 0
                      const projected = team.projectedScore || 0
                      
                      if (actual === 0 || actual < 5) {
                        return projected
                      }
                      if (actual >= projected) {
                        return actual
                      }
                      return projected
                    }
                    
                    const calculateWinProb = (teamScore: number, opponentScore: number): number => {
                      const diff = teamScore - opponentScore
                      const k = 0.02
                      return 1 / (1 + Math.exp(-k * diff))
                    }
                    
                    const awayExpected = getTeamExpectedScore(matchup.awayTeam)
                    const homeExpected = getTeamExpectedScore(matchup.homeTeam)
                    
                    const awayWinProb = calculateWinProb(awayExpected, homeExpected) * 100
                    const homeWinProb = calculateWinProb(homeExpected, awayExpected) * 100

                    return (
                      <Card key={matchup.matchupId} className="hover:shadow-lg transition-all duration-200 active:scale-[0.98]">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <div className="flex items-center space-x-1.5">
                              <Badge 
                                variant="outline" 
                                className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 ${getMatchupStatusColor(matchup.status)}`}
                              >
                                {matchup.status.replace('_', ' ')}
                              </Badge>
                              {matchup.isPlayoff && (
                                <Badge variant="destructive" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">Playoff</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2 sm:space-y-2.5">
                            {/* Away Team */}
                            <div 
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 active:bg-accent/70 transition-colors cursor-pointer"
                              onClick={() => handleJumpToTeam(matchup.awayTeam.teamId)}
                            >
                              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                                {matchup.awayTeam.logo ? (
                                  <img 
                                    src={matchup.awayTeam.logo} 
                                    alt={matchup.awayTeam.teamName}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-border/30 shrink-0"
                                  />
                                ) : (
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 border border-border/30 flex items-center justify-center shrink-0">
                                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-1 sm:space-x-1.5">
                                    <span className="font-semibold text-xs sm:text-sm truncate hover:text-primary transition-colors">
                                      {matchup.awayTeam.teamName}
                                    </span>
                                    <Badge 
                                      variant="outline"
                                      className={`text-[8px] sm:text-[9px] px-1 py-0 shrink-0 ${
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
                                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                                    Proj: {matchup.awayTeam.projectedScore?.toFixed(1) ?? '0.0'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className="text-base sm:text-lg font-bold">{matchup.awayTeam.score?.toFixed(1) ?? '0.0'}</p>
                              </div>
                            </div>

                            {/* VS Divider */}
                            <div className="flex items-center justify-center py-0.5">
                              <div className="w-full h-px bg-border/30" />
                              <span className="px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-semibold text-muted-foreground">VS</span>
                              <div className="w-full h-px bg-border/30" />
                            </div>

                            {/* Home Team */}
                            <div 
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 active:bg-accent/70 transition-colors cursor-pointer"
                              onClick={() => handleJumpToTeam(matchup.homeTeam.teamId)}
                            >
                              <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                                {matchup.homeTeam.logo ? (
                                  <img 
                                    src={matchup.homeTeam.logo} 
                                    alt={matchup.homeTeam.teamName}
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-border/30 shrink-0"
                                  />
                                ) : (
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 border border-border/30 flex items-center justify-center shrink-0">
                                    <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-1 sm:space-x-1.5">
                                    <span className="font-semibold text-xs sm:text-sm truncate hover:text-primary transition-colors">
                                      {matchup.homeTeam.teamName}
                                    </span>
                                    <Badge 
                                      variant="outline"
                                      className={`text-[8px] sm:text-[9px] px-1 py-0 shrink-0 ${
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
                                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                                    Proj: {matchup.homeTeam.projectedScore?.toFixed(1) ?? '0.0'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className="text-base sm:text-lg font-bold">{matchup.homeTeam.score?.toFixed(1) ?? '0.0'}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )}
          {activeTab === 'rosters' && (
            <div>
              <div className="mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 flex items-center">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-primary shrink-0" />
                  Week {boxscoreData?.week || selectedWeek || 'N/A'} Rosters
                </h2>
              </div>

              {!boxscoreData || boxscoreData.totalMatchups === 0 ? (
                <Card>
                  <CardContent className="p-8 sm:p-12">
                    <div className="text-center text-muted-foreground">
                      <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm sm:text-base">No roster data available for this week</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4 sm:space-y-6">
                  {boxscoreData.matchups.map((matchup, matchupIdx) => (
                    <Card key={matchup.matchupId} className="overflow-hidden">
                      <CardContent className="p-0">
                        {/* Matchup Header */}
                        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/30 p-3 sm:p-4">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                              {matchup.awayTeam.logo && (
                                <img 
                                  src={matchup.awayTeam.logo} 
                                  alt={matchup.awayTeam.teamName} 
                                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-border/30 shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <h3 className="font-bold text-base sm:text-lg truncate">{matchup.awayTeam.teamName}</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {matchup.awayTeam.totalActual.toFixed(2)} pts
                                </p>
                              </div>
                            </div>
                            <div className="px-2 sm:px-4">
                              <span className="text-muted-foreground font-semibold text-xs sm:text-sm">VS</span>
                            </div>
                            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                              {matchup.homeTeam.logo && (
                                <img 
                                  src={matchup.homeTeam.logo} 
                                  alt={matchup.homeTeam.teamName} 
                                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-border/30 shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <h3 className="font-bold text-base sm:text-lg truncate">{matchup.homeTeam.teamName}</h3>
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {matchup.homeTeam.totalActual.toFixed(2)} pts
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Team Rosters */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                          {/* Away Team */}
                          <div 
                            id={`matchup-${matchupIdx}-${matchup.awayTeam.teamId}`}
                            className="p-3 sm:p-4 md:p-6 border-r-0 md:border-r border-border/30 last:border-r-0"
                          >
                            <div className="mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-border/20">
                              <h4 className="font-semibold text-base sm:text-lg text-foreground">{matchup.awayTeam.teamName}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Total: {matchup.awayTeam.totalActual.toFixed(2)} pts
                                {matchup.awayTeam.totalProjected > 0 && (
                                  <span className="ml-1 sm:ml-2">
                                    (Proj: {matchup.awayTeam.totalProjected.toFixed(2)})
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="space-y-3 sm:space-y-4">
                              <div>
                                <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 sm:mb-3">
                                  Starters
                                </div>
                                <div className="space-y-1.5 sm:space-y-2">
                                  {matchup.awayTeam.starters.map((player, idx) => {
                                    const hasPlayed = player.hasPlayed === true
                                    const isPlaying = player.isPlaying === true
                                    const notPlayed = player.notPlayed === true
                                    
                                    // Calculate boom/bust status
                                    const getPlayerStatus = (actual: number, projected: number) => {
                                      if (!projected || projected === 0) return null
                                      const diff = actual - projected
                                      const percentage = (diff / projected) * 100
                                      
                                      if (diff > 10 && percentage > 30) {
                                        return { type: 'boom', diff, percentage }
                                      } else if (diff < -10 && percentage < -30) {
                                        return { type: 'bust', diff, percentage }
                                      } else if (diff > 0) {
                                        return { type: 'above', diff, percentage }
                                      } else if (diff < 0) {
                                        return { type: 'below', diff, percentage }
                                      }
                                      return null
                                    }
                                    
                                    const status = getPlayerStatus(player.pointsActual || 0, player.pointsProjected || 0)

                                    return (
                                      <div 
                                        key={idx} 
                                        className={`flex items-center justify-between p-2.5 rounded-lg bg-card/50 border border-border/20 hover:bg-accent/50 transition-colors ${
                                          isPlaying ? 'ring-2 ring-green-500/30' : ''
                                        }`}
                                      >
                                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                                          <Badge variant="outline" className="text-xs shrink-0">
                                            {getPositionLabel(player.position)}
                                          </Badge>
                                          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                            <span className="text-sm font-medium truncate">{player.fullName}</span>
                                            {/* NFL Team Badge */}
                                            {player.proTeamId && (
                                              <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 border-border/30 bg-background/50">
                                                <img 
                                                  src={getTeamLogoWithFallback(player.proTeamId)} 
                                                  alt={player.proTeamId}
                                                  className="w-3 h-3 mr-0.5 rounded-sm"
                                                  onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    if (target.parentElement) {
                                                      target.parentElement.innerHTML = player.proTeamId || '';
                                                    }
                                                  }}
                                                />
                                                {player.proTeamId}
                                              </Badge>
                                            )}
                                              {/* Game Status Icon */}
                                              {hasPlayed && (
                                                <span title="Game completed">
                                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                                                </span>
                                              )}
                                              {isPlaying && (
                                                <span title="Game in progress">
                                                  <Play className="h-3.5 w-3.5 text-green-400 animate-pulse shrink-0" />
                                                </span>
                                              )}
                                              {notPlayed && (
                                                <span title="Game not started">
                                                  <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                                                </span>
                                              )}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2 shrink-0">
                                          {/* Points Display */}
                                          <div className="text-right">
                                            {hasPlayed ? (
                                              <>
                                                <div className="text-sm font-bold">
                                                  {player.pointsActual?.toFixed(2) || '0.00'}
                                                </div>
                                                {player.pointsProjected > 0 && (
                                                  <div className="text-[10px] text-muted-foreground">
                                                    of {player.pointsProjected.toFixed(2)}
                                                  </div>
                                                )}
                                              </>
                                            ) : isPlaying ? (
                                              <>
                                                <div className="text-sm font-bold text-green-400">
                                                  {player.pointsActual?.toFixed(2) || '0.00'}
                                                </div>
                                                {player.pointsProjected > 0 && (
                                                  <div className="text-[10px] text-muted-foreground">
                                                    / {player.pointsProjected.toFixed(2)}
                                                  </div>
                                                )}
                                              </>
                                            ) : (
                                              <>
                                                <div className="text-sm font-bold text-orange-400">
                                                  {player.pointsProjected?.toFixed(2) || '0.00'}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                          
                                          {/* Boom/Bust Status Badge - Only show if player has played */}
                                          {status && hasPlayed && (
                                            <div className="shrink-0">
                                              {status.type === 'boom' && (
                                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0">
                                                  <TrendingUp className="h-3 w-3 mr-0.5" />
                                                  +{status.percentage.toFixed(0)}%
                                                </Badge>
                                              )}
                                              {status.type === 'bust' && (
                                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0">
                                                  <TrendingDown className="h-3 w-3 mr-0.5" />
                                                  {status.percentage.toFixed(0)}%
                                                </Badge>
                                              )}
                                              {status.type === 'above' && (
                                                <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-500/20 text-[10px] px-1.5 py-0">
                                                  +{status.diff.toFixed(1)}
                                                </Badge>
                                              )}
                                              {status.type === 'below' && (
                                                <Badge variant="outline" className="bg-red-500/10 text-red-300 border-red-500/20 text-[10px] px-1.5 py-0">
                                                  {status.diff.toFixed(1)}
                                                </Badge>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {matchup.awayTeam.bench.length > 0 && (
                                <div>
                                  <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 sm:mb-3">
                                    Bench
                                  </div>
                                  <div className="space-y-1 sm:space-y-1.5">
                                    {matchup.awayTeam.bench.map((player, idx) => (
                                      <div 
                                        key={idx} 
                                        className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg text-muted-foreground opacity-75"
                                      >
                                        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                                          <Badge variant="outline" className="text-[10px] sm:text-xs opacity-50 shrink-0">
                                            {getPositionLabel(player.position)}
                                          </Badge>
                                          <span className="text-xs sm:text-sm truncate">{player.fullName}</span>
                                        </div>
                                        <span className="text-xs sm:text-sm shrink-0 ml-2">
                                          {player.pointsActual.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Home Team */}
                          <div 
                            id={`matchup-${matchupIdx}-${matchup.homeTeam.teamId}`}
                            className="p-3 sm:p-4 md:p-6 border-t md:border-t-0 border-border/30"
                          >
                            <div className="mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-border/20">
                              <h4 className="font-semibold text-base sm:text-lg text-foreground">{matchup.homeTeam.teamName}</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                Total: {matchup.homeTeam.totalActual.toFixed(2)} pts
                                {matchup.homeTeam.totalProjected > 0 && (
                                  <span className="ml-1 sm:ml-2">
                                    (Proj: {matchup.homeTeam.totalProjected.toFixed(2)})
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="space-y-3 sm:space-y-4">
                              <div>
                                <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 sm:mb-3">
                                  Starters
                                </div>
                                <div className="space-y-1.5 sm:space-y-2">
                                  {matchup.homeTeam.starters.map((player, idx) => {
                                    const hasPlayed = player.hasPlayed === true
                                    const isPlaying = player.isPlaying === true
                                    const notPlayed = player.notPlayed === true
                                    
                                    // Calculate boom/bust status
                                    const getPlayerStatus = (actual: number, projected: number) => {
                                      if (!projected || projected === 0) return null
                                      const diff = actual - projected
                                      const percentage = (diff / projected) * 100
                                      
                                      if (diff > 10 && percentage > 30) {
                                        return { type: 'boom', diff, percentage }
                                      } else if (diff < -10 && percentage < -30) {
                                        return { type: 'bust', diff, percentage }
                                      } else if (diff > 0) {
                                        return { type: 'above', diff, percentage }
                                      } else if (diff < 0) {
                                        return { type: 'below', diff, percentage }
                                      }
                                      return null
                                    }
                                    
                                    const status = getPlayerStatus(player.pointsActual || 0, player.pointsProjected || 0)

                                    return (
                                      <div 
                                        key={idx} 
                                        className={`flex items-center justify-between p-2 sm:p-2.5 rounded-lg bg-card/50 border border-border/20 hover:bg-accent/50 active:bg-accent/70 transition-colors ${
                                          isPlaying ? 'ring-2 ring-green-500/30' : ''
                                        }`}
                                      >
                                        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                                          <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                                            {getPositionLabel(player.position)}
                                          </Badge>
                                          <div className="flex items-center space-x-1 sm:space-x-1.5 flex-1 min-w-0">
                                            <span className="text-xs sm:text-sm font-medium truncate">{player.fullName}</span>
                                            {/* NFL Team Badge - Hidden on very small screens */}
                                            {player.proTeamId && (
                                              <Badge variant="outline" className="hidden xs:inline-flex text-[8px] sm:text-[9px] px-0.5 sm:px-1 py-0 shrink-0 border-border/30 bg-background/50">
                                                <img 
                                                  src={getTeamLogoWithFallback(player.proTeamId)} 
                                                  alt={player.proTeamId}
                                                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 rounded-sm"
                                                  onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    if (target.parentElement) {
                                                      target.parentElement.innerHTML = player.proTeamId || '';
                                                    }
                                                  }}
                                                />
                                                <span className="hidden sm:inline">{player.proTeamId}</span>
                                              </Badge>
                                            )}
                                              {/* Game Status Icon */}
                                              {hasPlayed && (
                                                <span title="Game completed" className="shrink-0">
                                                  <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-400" />
                                                </span>
                                              )}
                                              {isPlaying && (
                                                <span title="Game in progress" className="shrink-0">
                                                  <Play className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-400 animate-pulse" />
                                                </span>
                                              )}
                                              {notPlayed && (
                                                <span title="Game not started" className="shrink-0">
                                                  <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-400" />
                                                </span>
                                              )}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                                          {/* Points Display */}
                                          <div className="text-right">
                                            {hasPlayed ? (
                                              <>
                                                <div className="text-xs sm:text-sm font-bold">
                                                  {player.pointsActual?.toFixed(2) || '0.00'}
                                                </div>
                                                {player.pointsProjected > 0 && (
                                                  <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                                                    of {player.pointsProjected.toFixed(2)}
                                                  </div>
                                                )}
                                              </>
                                            ) : isPlaying ? (
                                              <>
                                                <div className="text-xs sm:text-sm font-bold text-green-400">
                                                  {player.pointsActual?.toFixed(2) || '0.00'}
                                                </div>
                                                {player.pointsProjected > 0 && (
                                                  <div className="text-[9px] sm:text-[10px] text-muted-foreground">
                                                    / {player.pointsProjected.toFixed(2)}
                                                  </div>
                                                )}
                                              </>
                                            ) : (
                                              <>
                                                <div className="text-xs sm:text-sm font-bold text-orange-400">
                                                  {player.pointsProjected?.toFixed(2) || '0.00'}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                          
                                          {/* Boom/Bust Status Badge - Only show if player has played */}
                                          {status && hasPlayed && (
                                            <div className="shrink-0">
                                              {status.type === 'boom' && (
                                                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                                                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                                                  <span className="hidden sm:inline">+</span>{status.percentage.toFixed(0)}%
                                                </Badge>
                                              )}
                                              {status.type === 'bust' && (
                                                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                                                  <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5" />
                                                  {status.percentage.toFixed(0)}%
                                                </Badge>
                                              )}
                                              {status.type === 'above' && (
                                                <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-500/20 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                                                  +{status.diff.toFixed(1)}
                                                </Badge>
                                              )}
                                              {status.type === 'below' && (
                                                <Badge variant="outline" className="bg-red-500/10 text-red-300 border-red-500/20 text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                                                  {status.diff.toFixed(1)}
                                                </Badge>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>

                              {matchup.homeTeam.bench.length > 0 && (
                                <div>
                                  <div className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 sm:mb-3">
                                    Bench
                                  </div>
                                  <div className="space-y-1 sm:space-y-1.5">
                                    {matchup.homeTeam.bench.map((player, idx) => (
                                      <div 
                                        key={idx} 
                                        className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg text-muted-foreground opacity-75"
                                      >
                                        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
                                          <Badge variant="outline" className="text-[10px] sm:text-xs opacity-50 shrink-0">
                                            {getPositionLabel(player.position)}
                                          </Badge>
                                          <span className="text-xs sm:text-sm truncate">{player.fullName}</span>
                                        </div>
                                        <span className="text-xs sm:text-sm shrink-0 ml-2">
                                          {player.pointsActual.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
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
