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
import { RefreshCw, Trophy, Users, Calendar, ChevronLeft, ChevronRight, ArrowLeftRight, TrendingUp } from 'lucide-react'
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
import StandingsTab from '../components/dashboard/StandingsTab'
import MatchupsTab from '../components/dashboard/MatchupsTab'
import RostersTab from '../components/dashboard/RostersTab'
import TransactionsTab from '../components/dashboard/TransactionsTab'
import { getCache, setCache, getCacheAge } from '../lib/cache'

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

  const fetchLeagueData = async (week?: number, forceRefresh = false) => {
    const cacheKey = `league_data_${week || 'current'}`
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCache<LeagueData>(cacheKey, 10 * 60 * 1000) // 10 min TTL
      if (cached) {
        setLeagueData(cached)
        setLoading(false)
        setRefreshing(false)
        // Refresh in background
        fetchLeagueData(week, true).catch(() => {
          // Silently fail background refresh
        })
        return
      }
    }
    
    // No cache or forcing refresh - fetch fresh data
    if (!forceRefresh) {
      setLoading(true)
    }
    
    try {
      setError(null)
      const data = await getLeagueOverview(undefined, undefined, week)
      
      if (data.success) {
        const leagueData: LeagueData = {
          standings: data.standings || [],
          matchups: data.matchups || [],
          leagueInfo: data.leagueInfo || null,
          seasonId: data.seasonId,
          week: data.week,
          errors: data.errors || []
        }
        setLeagueData(leagueData)
        // Cache the data
        setCache(cacheKey, leagueData, 10 * 60 * 1000) // 10 min TTL
      } else {
        setError(data.error || 'Failed to fetch league data')
      }
    } catch (err) {
      setError('Failed to fetch league data')
      // If fetch fails but we have cache, keep showing cache
      if (!forceRefresh) {
        const cached = getCache<LeagueData>(cacheKey, 10 * 60 * 1000)
        if (cached) setLeagueData(cached)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchBoxscoreData = async (week?: number, forceRefresh = false) => {
    const cacheKey = `league_boxscores_${week || 'current'}`
    
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = getCache<BoxscoreData>(cacheKey, 10 * 60 * 1000) // 10 min TTL
      if (cached) {
        setBoxscoreData(cached)
        // Refresh in background
        fetchBoxscoreData(week, true).catch(() => {
          // Silently fail background refresh
        })
        return
      }
    }
    
    try {
      const data = await getLeagueBoxscores(undefined, week)
      
      if (data.success) {
        const boxscoreData: BoxscoreData = {
          season: data.season,
          week: data.week,
          matchups: data.matchups,
          totalMatchups: data.totalMatchups
        }
        setBoxscoreData(boxscoreData)
        // Cache the data
        setCache(cacheKey, boxscoreData, 10 * 60 * 1000) // 10 min TTL
      } else {
        setBoxscoreData(null)
      }
    } catch (err) {
      setBoxscoreData(null)
      // If fetch fails but we have cache, keep showing cache
      if (!forceRefresh) {
        const cached = getCache<BoxscoreData>(cacheKey, 10 * 60 * 1000)
        if (cached) setBoxscoreData(cached)
      }
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
    // Force refresh when user explicitly clicks refresh
    await Promise.all([
      fetchLeagueData(selectedWeek || undefined, true),
      fetchBoxscoreData(selectedWeek || undefined, true),
      activeTab === 'transactions' ? fetchTransactions(transactionsViewMode === 'all' ? null : (selectedWeek || undefined)) : Promise.resolve()
    ])
  }

  const handleWeekChange = async (week: number) => {
    setSelectedWeek(week)
    // Check cache first, but show loading if no cache
    const cacheKey = `league_data_${week}`
    const cached = getCache<LeagueData>(cacheKey, 10 * 60 * 1000)
    if (!cached) {
      setLoading(true)
    }
    await Promise.all([
      fetchLeagueData(week, false), // Use cache if available
      fetchBoxscoreData(week, false) // Use cache if available
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
        
        // Fetch data (will use cache if available)
        await Promise.all([
          fetchLeagueData(selectedWeek, false), // Use cache if available
          fetchBoxscoreData(selectedWeek, false), // Use cache if available
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
            
            // Refresh after sync (force refresh to get new synced data)
            await Promise.all([
              fetchLeagueData(selectedWeek, true),
              fetchBoxscoreData(selectedWeek, true)
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
        {activeTab === 'standings' && leagueData && (
          <StandingsTab 
            standings={leagueData.standings} 
            onTeamClick={handleJumpToTeam}
          />
        )}
        {activeTab === 'matchups' && leagueData && (
          <MatchupsTab
            matchups={leagueData.matchups}
            week={leagueData.week}
            selectedWeek={selectedWeek}
            currentWeek={currentWeek}
            onTeamClick={handleJumpToTeam}
          />
          )}
          {activeTab === 'rosters' && (
          <RostersTab
            matchups={boxscoreData?.matchups || []}
            week={boxscoreData?.week || selectedWeek}
            scrollToTeam={scrollToTeam}
            onScrollComplete={() => setScrollToTeam(null)}
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsTab
            transactionsData={transactionsData}
            loadingTransactions={loadingTransactions}
            syncingTransactions={syncingTransactions}
            transactionsViewMode={transactionsViewMode}
            selectedWeek={selectedWeek}
            seasonId={leagueData?.seasonId || 2025}
            availableWeeks={availableWeeks}
            onViewModeChange={handleTransactionsViewModeChange}
            onWeekChange={(week: number | null) => {
              setSelectedWeek(week)
              fetchTransactions(week)
            }}
            onSyncTransactions={handleSyncTransactions}
          />
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
