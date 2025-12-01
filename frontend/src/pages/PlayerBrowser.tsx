import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { cn } from '../lib/utils'
import { getAvailableWeeks } from '../services/api'
import { getTeamLogoWithFallback } from '../lib/teamLogos'
import { 
  Search, 
  Filter, 
  Users, 
  Calendar,
  ChevronRight,
  SortAsc,
  SortDesc,
  Trophy,
  Medal,
  Award,
  Target,
  ArrowLeft,
  ArrowRight,
  X,
  BarChart3,
  User,
  MapPin,
  Hash,
  Clock
} from 'lucide-react'

interface ESPNPlayer {
  _id: string
  espn_id: number
  name: string
  first_name: string
  last_name: string
  position: string
  pro_team_id: string
  jersey_number: number
  headshot_url: string
  roster_status: 'free_agent' | 'rostered' | 'unknown'
  fantasy_team_id: number | null
  fantasy_team_name: string | null
  created_at: string
  last_updated: string
  current_week: number
  fantasy_points: number | null
  projected_points: number | null
  has_actuals: boolean
  has_projections: boolean
  weekly_actuals: Record<string, any>
  weekly_projections: Record<string, any>
}

interface TopPerformer {
  _id: string
  espn_id: number
  name: string
  first_name: string
  last_name: string
  position: string
  pro_team_id: string
  jersey_number: number
  headshot_url: string
  roster_status: 'free_agent' | 'rostered' | 'unknown'
  fantasy_team_id: number | null
  fantasy_team_name: string | null
  fantasy_points: number
  projected_points: number | null
  week: number
  scoring_type: string
  current_week?: number
  weekly_actuals?: Record<string, any>
  weekly_projections?: Record<string, any>
  created_at?: string
  last_updated?: string
}

interface PlayerFilters {
  position: string
  team: string
  sortBy: string
  sortOrder: 'asc' | 'desc'
  week: number
  scoringType: string
  rosterStatus: string
}

const PlayerBrowser = () => {
  const [players, setPlayers] = useState<ESPNPlayer[]>([])
  const [filteredPlayers, setFilteredPlayers] = useState<ESPNPlayer[]>([])
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([])
  const [cumulativeLeaders, setCumulativeLeaders] = useState<Record<string, Array<{ player: ESPNPlayer; total: number }>>>({})
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filters, setFilters] = useState<PlayerFilters>({
    position: '',
    team: '',
    sortBy: 'fantasy_points',
    sortOrder: 'desc',
    week: 1,
    scoringType: 'std',
    rosterStatus: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<ESPNPlayer | null>(null)
  const [showPlayerModal, setShowPlayerModal] = useState(false)
  const [currentWeekFetched, setCurrentWeekFetched] = useState(false)

  // Available filter options
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']
  const teams = ['ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS']
  const rosterStatuses = [
    { value: '', label: 'All Players' },
    { value: 'free_agent', label: 'Free Agents' },
    { value: 'rostered', label: 'Rostered Players' }
  ]

  useEffect(() => {
    const fetchCurrentWeek = async () => {
      try {
        const data = await getAvailableWeeks()
        if (data.success && data.currentWeek) {
          setFilters(prev => ({ ...prev, week: data.currentWeek }))
          setCurrentWeekFetched(true)
        } else {
          // If we can't get current week, still mark as fetched to allow loading with default week
          setCurrentWeekFetched(true)
        }
      } catch (err) {
        // On error, still mark as fetched to allow loading with default week
        setCurrentWeekFetched(true)
      }
    }
    fetchCurrentWeek()
  }, [])

  useEffect(() => {
    // Only load top performers and players after current week has been fetched
    // This ensures we always load with the current week, not the initial week: 1
    if (currentWeekFetched) {
      loadTopPerformers()
      loadPlayers()
    }
  }, [filters.week, filters.scoringType, currentWeekFetched])

  useEffect(() => {
    applyFilters()
  }, [players, searchTerm, filters.position, filters.team, filters.sortBy, filters.sortOrder, filters.rosterStatus])
  
  // Note: No need to debounce or reload from backend when searching - client-side filtering handles it

  // Recompute cumulative leaders through selected week
  useEffect(() => {
    if (!players || players.length === 0) {
      setCumulativeLeaders({})
      return
    }

    const uptoWeek = Math.max(1, filters.week || 1)
    const scoringKey = filters.scoringType || 'std'

    const sumThroughWeek = (player: ESPNPlayer): number => {
      if (!player.weekly_actuals) return 0
      let total = 0
      for (let w = 1; w <= uptoWeek; w++) {
        const weekData = player.weekly_actuals[String(w)]
        const val = weekData && typeof weekData[scoringKey] === 'number' ? weekData[scoringKey] : 0
        if (Number.isFinite(val)) total += val
      }
      return total
    }

    const byPosition: Record<string, Array<{ player: ESPNPlayer; total: number }>> = {}
    players.forEach((p) => {
      const pos = (p.position || 'OTHER').toUpperCase()
      const total = sumThroughWeek(p)
      if (!byPosition[pos]) byPosition[pos] = []
      byPosition[pos].push({ player: p, total })
    })

    Object.keys(byPosition).forEach((pos) => {
      byPosition[pos].sort((a, b) => b.total - a.total)
      byPosition[pos] = byPosition[pos].slice(0, 5)
    })

    setCumulativeLeaders(byPosition)
  }, [players, filters.week, filters.scoringType])

  const loadPlayers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('limit', '2000') // Get all players, filtering happens client-side
      params.set('week', filters.week.toString())
      params.set('scoringType', filters.scoringType)

      const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
      const response = await fetch(`${API_BASE}/espnplayers?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setPlayers(data.players)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const loadTopPerformers = async () => {
    try {
      const params = new URLSearchParams()
      params.set('week', filters.week.toString())
      params.set('scoringType', filters.scoringType)
      params.set('limit', '200') // Increased limit to ensure we have enough players per position

      const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
      const response = await fetch(`${API_BASE}/espnplayers/top-performers?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setTopPerformers(data.topPerformers)
      }
    } catch (error) {
      // Error loading top performers
    }
  }

  const handlePlayerClick = async (player: ESPNPlayer) => {
      // If this is a top performer (missing weekly data), fetch full player data
      if (!player.weekly_actuals && !player.weekly_projections && player.espn_id) {
        try {
          const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'
          const response = await fetch(`${API_BASE}/espnplayers/${player.espn_id}`);
          const data = await response.json();
          
          if (data.success) {
            setSelectedPlayer(data.player);
          } else {
            setSelectedPlayer(player);
          }
        } catch (error) {
          setSelectedPlayer(player);
        }
      } else {
        setSelectedPlayer(player);
      }
    
    setShowPlayerModal(true);
  }

  const applyFilters = () => {
    let filtered = [...players]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(player => 
        (player.name && player.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (player.pro_team_id && player.pro_team_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (player.position && player.position.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Position filter
    if (filters.position) {
      filtered = filtered.filter(player => player.position && player.position === filters.position)
    }

    // Team filter
    if (filters.team) {
      filtered = filtered.filter(player => player.pro_team_id && player.pro_team_id === filters.team)
    }

    // Roster status filter
    if (filters.rosterStatus) {
      filtered = filtered.filter(player => player.roster_status === filters.rosterStatus)
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue

      if (filters.sortBy === 'fantasy_points') {
        aValue = a.fantasy_points || 0
        bValue = b.fantasy_points || 0
      } else if (filters.sortBy === 'projected_points') {
        aValue = a.projected_points || 0
        bValue = b.projected_points || 0
      } else {
        aValue = a[filters.sortBy as keyof ESPNPlayer]
        bValue = b[filters.sortBy as keyof ESPNPlayer]
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const av = aValue.toLowerCase()
        const bv = bValue.toLowerCase()
        return filters.sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }

      const avNum = Number(aValue)
      const bvNum = Number(bValue)
      if (!Number.isNaN(avNum) && !Number.isNaN(bvNum)) {
        return filters.sortOrder === 'asc' ? avNum - bvNum : bvNum - avNum
      }

      return 0
    })

    setFilteredPlayers(filtered)
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB': return 'bg-blue-500'
      case 'RB': return 'bg-green-500'
      case 'WR': return 'bg-purple-500'
      case 'TE': return 'bg-orange-500'
      case 'K': return 'bg-yellow-500'
      case 'DST': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getTeamColor = (team: string) => {
    const teamColors: Record<string, string> = {
      'ARI': 'bg-red-600', 'ATL': 'bg-red-500', 'BAL': 'bg-purple-600', 'BUF': 'bg-blue-600',
      'CAR': 'bg-blue-500', 'CHI': 'bg-orange-600', 'CIN': 'bg-orange-500', 'CLE': 'bg-orange-400',
      'DAL': 'bg-blue-500', 'DEN': 'bg-orange-500', 'DET': 'bg-blue-600', 'GB': 'bg-green-600',
      'HOU': 'bg-red-600', 'IND': 'bg-blue-600', 'JAX': 'bg-teal-600', 'KC': 'bg-red-600',
      'LV': 'bg-gray-600', 'LAC': 'bg-blue-500', 'LAR': 'bg-blue-600', 'MIA': 'bg-teal-500',
      'MIN': 'bg-purple-600', 'NE': 'bg-blue-600', 'NO': 'bg-gold-500', 'NYG': 'bg-blue-600',
      'NYJ': 'bg-green-600', 'PHI': 'bg-green-600', 'PIT': 'bg-yellow-600', 'SF': 'bg-red-600',
      'SEA': 'bg-green-600', 'TB': 'bg-red-600', 'TEN': 'bg-blue-600', 'WAS': 'bg-red-600'
    }
    return teamColors[team] || 'bg-gray-500'
  }

  const getRosterStatusColor = (status: string) => {
    switch (status) {
      case 'free_agent': return 'bg-green-500'
      case 'rostered': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getRosterStatusLabel = (status: string) => {
    switch (status) {
      case 'free_agent': return 'FA'
      case 'rostered': return 'R'
      default: return '?'
    }
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />
    if (index === 1) return <Medal className="h-4 w-4 text-gray-400" />
    if (index === 2) return <Award className="h-4 w-4 text-orange-500" />
    return <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
  }

  // Helper function to calculate average fantasy points from weekly actuals
  const calculateAverageFantasyPoints = (player: ESPNPlayer | null) => {
    if (!player || !player.weekly_actuals) return null
    
    const actuals = Object.values(player.weekly_actuals)
    const validActuals = actuals.filter(w => w && w.std && w.std > 0)
    if (validActuals.length === 0) return null
    
    const total = validActuals.reduce((sum, week) => sum + (week.std || 0), 0)
    return total / validActuals.length
  }

  // Helper function to calculate position ranking
  const calculatePositionRank = (player: ESPNPlayer | null): { rank: number; total: number } | null => {
    if (!player || !player.weekly_actuals) return null
    
    // Get all players in the same position (from full dataset, not filtered)
    const samePositionPlayers = players.filter(p => p.position === player.position)
    
    // Calculate averages for all players in the position
    const playersWithAverages = samePositionPlayers.map(p => ({
      id: p.espn_id,
      avg: calculateAverageFantasyPoints(p)
    })).filter(p => p.avg !== null && p.avg !== undefined)
    
    // Sort by average (descending)
    playersWithAverages.sort((a, b) => (b.avg || 0) - (a.avg || 0))
    
    // Find the rank for this player
    const playerAvg = calculateAverageFantasyPoints(player)
    if (playerAvg === null) return null
    
    const rank = playersWithAverages.findIndex(p => p.id === player.espn_id)
    return rank >= 0 ? { rank: rank + 1, total: playersWithAverages.length } : null
  }

  const TopPerformerCard = ({ performer, index, positionRank }: { performer: TopPerformer, index: number, positionRank: number }) => {
    // All cards same size (smaller)
    const classes = {
      avatar: 'w-10 h-10',
      badge: 'w-5 h-5 text-xs',
      name: 'text-sm',
      points: 'text-base',
      spacing: 'space-x-2',
      padding: 'p-2'
    }

    // Add gold/silver/bronze borders for top 3 in position
    const getBorderClass = () => {
      if (positionRank === 0) return "border-2 border-yellow-500" // Gold
      if (positionRank === 1) return "border-2 border-gray-400" // Silver
      if (positionRank === 2) return "border-2 border-orange-500" // Bronze
      return "border"
    }

    return (
      <Card 
        className={cn("hover:shadow-lg transition-all duration-200 cursor-pointer group", getBorderClass())}
        onClick={() => handlePlayerClick(performer as unknown as ESPNPlayer)}
      >
        <CardContent className={classes.padding}>
          <div className="flex flex-col">
            {/* Player name on its own line above everything */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-1">
                {getRankIcon(index)}
                <h3 className={cn("font-semibold text-foreground truncate group-hover:text-primary transition-colors", classes.name)}>
                  {performer.name}
                </h3>
              </div>
              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            
            {/* Player picture and info in horizontal layout */}
            <div className={cn("flex items-start", classes.spacing)}>
              <div className="relative">
                {(performer.position === 'DST' || performer.position === 'D/ST') && performer.pro_team_id ? (
                  <img
                    src={getTeamLogoWithFallback(performer.pro_team_id)}
                    alt={performer.name}
                    className={cn("rounded-full object-cover bg-gray-100", classes.avatar)}
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(performer.name)}&background=random&color=fff&size=48`
                    }}
                  />
                ) : performer.headshot_url ? (
                  <img 
                    src={performer.headshot_url} 
                    alt={performer.name}
                    className={cn("rounded-full object-cover", classes.avatar)}
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(performer.name)}&background=random&color=fff&size=48`
                    }}
                  />
                ) : (
                  <div className={cn("rounded-full bg-gray-200 flex items-center justify-center", classes.avatar)}>
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div className={cn(
                  "absolute -bottom-1 -right-1 rounded-full flex items-center justify-center text-white font-bold",
                  getPositionColor(performer.position || ''),
                  classes.badge
                )}>
                  {performer.position || 'N/A'}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-1.5 mb-0.5">
                  <Badge variant="outline" className={cn("text-xs text-white", getTeamColor(performer.pro_team_id || ''))}>
                    {performer.pro_team_id || 'N/A'}
                  </Badge>
                  {performer.jersey_number && (
                    <Badge variant="secondary" className="text-xs">
                      #{performer.jersey_number}
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <Trophy className="h-3 w-3 text-yellow-500" />
                    <span className={cn("font-bold text-yellow-600", classes.points)}>
                      {performer.fantasy_points.toFixed(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">pts</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Week {performer.week}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const PlayerCard = ({ player }: { player: ESPNPlayer }) => (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer group"
      onClick={() => handlePlayerClick(player)}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            {player.headshot_url ? (
              <img 
                src={player.headshot_url} 
                alt={player.name}
                className="w-12 h-12 rounded-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=random&color=fff&size=48`
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className={cn(
              "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold",
              getPositionColor(player.position || '')
            )}>
              {player.position || 'N/A'}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {player.name}
              </h3>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="outline" className={cn("text-xs text-white", getTeamColor(player.pro_team_id || ''))}>
                {player.pro_team_id || 'N/A'}
              </Badge>
              {player.jersey_number && (
                <Badge variant="secondary" className="text-xs">
                  #{player.jersey_number}
                </Badge>
              )}
              <Badge variant="outline" className={cn("text-xs text-white", getRosterStatusColor(player.roster_status || 'unknown'))}>
                {getRosterStatusLabel(player.roster_status || 'unknown')}
              </Badge>
            </div>
            
            {player.fantasy_team_name && (
              <div className="flex items-center space-x-1 mt-1">
                <span className="text-xs text-muted-foreground">On: </span>
                <span className="text-xs font-semibold text-blue-600">{player.fantasy_team_name}</span>
              </div>
            )}
            {!player.fantasy_team_name && player.roster_status === 'free_agent' && (
              <div className="mt-1">
                <span className="text-xs font-semibold text-green-600">Free Agent</span>
              </div>
            )}
            
            <div className="flex items-center space-x-3 mt-2 text-xs text-muted-foreground">
              {player.fantasy_points !== null && (
                <div className="flex items-center space-x-1">
                  <Trophy className="h-3 w-3 text-green-500" />
                  <span className="font-medium text-green-600">
                    {player.fantasy_points.toFixed(1)} pts
                  </span>
                </div>
              )}
              {player.projected_points !== null && (
                <div className="flex items-center space-x-1">
                  <Target className="h-3 w-3 text-blue-500" />
                  <span className="font-medium text-blue-600">
                    {player.projected_points.toFixed(1)} proj
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Players</h1>
            <p className="text-muted-foreground">
              Browse ESPN players and track fantasy performance
            </p>
          </div>
        </div>

        {/* Week Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold">Week Navigation</h3>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newWeek = Math.max(1, filters.week - 1)
                      setFilters({...filters, week: newWeek})
                    }}
                    disabled={filters.week <= 1}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-lg font-bold px-3">Week {filters.week}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newWeek = Math.min(18, filters.week + 1)
                      setFilters({...filters, week: newWeek})
                    }}
                    disabled={filters.week >= 18}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Best Through Selected Week Menu */}
        {Object.keys(cumulativeLeaders).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>Best Through Week {filters.week}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(() => {
                  // Order positions in a consistent way
                  const order = ['QB', 'RB', 'WR', 'TE', 'DST', 'D/ST', 'K']
                  const entries = Object.entries(cumulativeLeaders).sort(([a], [b]) => {
                    const ia = order.indexOf(a)
                    const ib = order.indexOf(b)
                    if (ia === -1 && ib === -1) return a.localeCompare(b)
                    if (ia === -1) return 1
                    if (ib === -1) return -1
                    return ia - ib
                  })
                  return entries.map(([pos, list]) => (
                    <div key={pos} className="space-y-2">
                      <div className="flex items-center justify-between border-b pb-1">
                        <h4 className="text-sm font-bold">{pos}</h4>
                        <Badge variant="outline" className={cn('text-white', getPositionColor(pos))}>{list.length}</Badge>
                      </div>
                      <div className="space-y-1">
                        {list.map(({ player, total }, idx) => (
                          <button
                            key={player._id}
                            className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded hover:bg-muted/60 transition"
                            onClick={() => handlePlayerClick(player)}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="text-xs w-5 shrink-0 text-muted-foreground">#{idx + 1}</span>
                              <span className="truncate text-sm font-medium">{player.name}</span>
                            </div>
                            <span className="text-xs font-semibold text-green-600">{total.toFixed(1)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Performers Section */}
        {topPerformers.length > 0 && (() => {
          // Group top performers by position and limit to top 15 per position
          const positionGroups: Record<string, Array<{performer: TopPerformer, index: number, positionRank: number}>> = {}
          
          topPerformers.forEach((performer) => {
            const pos = performer.position || 'OTHER'
            if (!positionGroups[pos]) {
              positionGroups[pos] = []
            }
            
            // Limit to top 15 per position
            if (positionGroups[pos].length >= 15) return
            
            // Use position-specific index for ranking (0 = best in position, 1 = 2nd best, etc.)
            const positionSpecificIndex = positionGroups[pos].length
            const positionRank = positionSpecificIndex
            positionGroups[pos].push({ performer, index: positionSpecificIndex, positionRank })
          })

          // Separate main positions from DST and K - be more aggressive with filtering
          const mainPositionsRaw = Object.entries(positionGroups).filter(([pos]) => {
            const posUpper = pos.toUpperCase().trim()
            return posUpper !== 'K' && posUpper !== 'D/ST' && posUpper !== 'DST' && posUpper !== 'KICKER'
          })
          
          // Order main positions: QB, RB, WR, TE
          const positionOrder = ['QB', 'RB', 'WR', 'TE']
          const mainPositions = mainPositionsRaw.sort(([posA], [posB]) => {
            const indexA = positionOrder.indexOf(posA)
            const indexB = positionOrder.indexOf(posB)
            if (indexA === -1 && indexB === -1) return 0
            if (indexA === -1) return 1
            if (indexB === -1) return -1
            return indexA - indexB
          })
          
          // Try multiple variations of K and DST names (case-insensitive)
          const kickers = Object.entries(positionGroups).find(([pos]) => pos.toUpperCase().trim() === 'K' || pos.toUpperCase().trim() === 'KICKER')?.[1] || []
          const dsts = Object.entries(positionGroups).find(([pos]) => pos.toUpperCase().trim() === 'DST' || pos.toUpperCase().trim() === 'D/ST')?.[1] || []

          return (
            <Card className="glass border-border/30">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span>Top Fantasy Performers - Week {filters.week}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Main positions grid */}
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {mainPositions.map(([position, players]) => (
                        <div key={position} className="space-y-3">
                          <div className="text-center pb-2 border-b">
                            <h4 className="text-lg font-bold text-foreground">{position}</h4>
                            <Badge variant="outline" className={cn("text-white mt-1", getPositionColor(position))}>
                              {players.length}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            {players.map(({performer, index, positionRank}) => (
                              <TopPerformerCard 
                                key={performer._id} 
                                performer={performer} 
                                index={index} 
                                positionRank={positionRank}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* DST and K widgets below the columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* DST Widget */}
                    <div className="space-y-2">
                      <div className="text-center pb-2 border-b">
                        <h4 className="text-lg font-bold text-foreground">DST</h4>
                        <Badge variant="outline" className={cn("text-white mt-1", getPositionColor('DST'))}>
                          {dsts.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {dsts.length > 0 ? (
                          dsts.map(({performer, index, positionRank}) => (
                            <TopPerformerCard 
                              key={performer._id} 
                              performer={performer} 
                              index={index} 
                              positionRank={positionRank}
                            />
                          ))
                        ) : (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No DST players available
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* K Widget */}
                    <div className="space-y-2">
                      <div className="text-center pb-2 border-b">
                        <h4 className="text-lg font-bold text-foreground">K</h4>
                        <Badge variant="outline" className={cn("text-white mt-1", getPositionColor('K'))}>
                          {kickers.length}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {kickers.length > 0 ? (
                          kickers.map(({performer, index, positionRank}) => (
                            <TopPerformerCard 
                              key={performer._id} 
                              performer={performer} 
                              index={index} 
                              positionRank={positionRank}
                            />
                          ))
                        ) : (
                          <div className="text-center py-4 text-muted-foreground text-sm">
                            No kickers available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search players by name, team, or position..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Position Filter Toggle Buttons */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Position:</span>
                <div className="flex space-x-1">
                  <Button
                    variant={filters.position === '' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilters({...filters, position: ''})}
                  >
                    All
                  </Button>
                  {positions.map(pos => (
                    <Button
                      key={pos}
                      variant={filters.position === pos ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilters({...filters, position: pos})}
                    >
                      {pos}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>More Filters</span>
              </Button>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {/* Team Filter */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Team
                    </label>
                    <select
                      value={filters.team}
                      onChange={(e) => setFilters({...filters, team: e.target.value})}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="">All Teams</option>
                      {teams.map(team => (
                        <option key={team} value={team}>{team}</option>
                      ))}
                    </select>
                  </div>

                  {/* Roster Status Filter */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Roster Status
                    </label>
                    <select
                      value={filters.rosterStatus}
                      onChange={(e) => setFilters({...filters, rosterStatus: e.target.value})}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      {rosterStatuses.map(status => (
                        <option key={status.value} value={status.value}>{status.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort By */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Sort By
                    </label>
                    <select
                      value={filters.sortBy}
                      onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="fantasy_points">Fantasy Points</option>
                      <option value="projected_points">Projected Points</option>
                      <option value="name">Name</option>
                      <option value="position">Position</option>
                      <option value="pro_team_id">Team</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">
                      Order
                    </label>
                    <div className="flex space-x-1">
                      <Button
                        variant={filters.sortOrder === 'asc' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilters({...filters, sortOrder: 'asc'})}
                        className="flex-1"
                      >
                        <SortAsc className="h-3 w-3" />
                      </Button>
                      <Button
                        variant={filters.sortOrder === 'desc' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilters({...filters, sortOrder: 'desc'})}
                        className="flex-1"
                      >
                        <SortDesc className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Showing {filteredPlayers.length} of {players.length} players
          </p>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => (
            <PlayerCard key={player._id} player={player} />
          ))}
        </div>

        {/* Empty State */}
        {filteredPlayers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No players found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms or filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Player Detail Modal */}
      {showPlayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowPlayerModal(false)} />
          <div className="relative bg-background border border-border rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <Card className="border-0 shadow-none">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center space-x-3">
                  {selectedPlayer?.headshot_url && (
                    <img 
                      src={selectedPlayer.headshot_url} 
                      alt={selectedPlayer.name}
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer?.name || '')}&background=random&color=fff&size=48`
                      }}
                    />
                  )}
                  <div>
                    <CardTitle className="text-2xl font-bold">{selectedPlayer?.name}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className={cn("text-white", getPositionColor(selectedPlayer?.position || ''))}>
                        {selectedPlayer?.position || 'N/A'}
                      </Badge>
                      <Badge variant="outline" className={cn("text-white", getTeamColor(selectedPlayer?.pro_team_id || ''))}>
                        {selectedPlayer?.pro_team_id || 'N/A'}
                      </Badge>
                      {selectedPlayer?.jersey_number && (
                        <Badge variant="secondary">
                          #{selectedPlayer.jersey_number}
                        </Badge>
                      )}
                      <Badge variant="outline" className={cn("text-white", getRosterStatusColor(selectedPlayer?.roster_status || 'unknown'))}>
                        {getRosterStatusLabel(selectedPlayer?.roster_status || 'unknown')}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowPlayerModal(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {selectedPlayer && (
                  <div className="space-y-6">
                    {/* Player Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <User className="h-5 w-5" />
                            <span>Player Information</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">ESPN ID: {selectedPlayer.espn_id}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">NFL Team: {selectedPlayer.pro_team_id}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              Fantasy Team: {selectedPlayer.fantasy_team_name || 'Free Agent'}
                              {selectedPlayer.roster_status === 'rostered' && (
                                <Badge variant="outline" className="ml-2 text-blue-600 border-blue-600">
                                  Rostered
                                </Badge>
                              )}
                              {selectedPlayer.roster_status === 'free_agent' && (
                                <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                                  Free Agent
                                </Badge>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Last Updated: {new Date(selectedPlayer.last_updated).toLocaleDateString()}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <BarChart3 className="h-5 w-5" />
                            <span>Stats</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {(() => {
                              const avgPoints = calculateAverageFantasyPoints(selectedPlayer)
                              const positionRank = calculatePositionRank(selectedPlayer)
                              
                              return (
                                <>
                                  {avgPoints !== null && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-muted-foreground">Avg Points/Game</span>
                                      <span className="font-semibold text-purple-600">
                                        {avgPoints.toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                  {positionRank !== null && avgPoints !== null && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-muted-foreground">
                                        Rank ({selectedPlayer.position})
                                      </span>
                                      {positionRank.rank <= 3 ? (
                                        <div className="flex items-center space-x-1">
                                          {positionRank.rank === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                                          {positionRank.rank === 2 && <Medal className="h-4 w-4 text-gray-400" />}
                                          {positionRank.rank === 3 && <Award className="h-4 w-4 text-orange-500" />}
                                          <span className="font-semibold text-orange-600">
                                            #{positionRank.rank} of {positionRank.total}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="font-semibold text-orange-600">
                                          #{positionRank.rank} of {positionRank.total}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {selectedPlayer.fantasy_points !== null && selectedPlayer.fantasy_points !== undefined && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-muted-foreground">Week {filters.week} Points</span>
                                      <span className="font-semibold text-green-600">
                                        {selectedPlayer.fantasy_points.toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                  {selectedPlayer.projected_points !== null && selectedPlayer.projected_points !== undefined && (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-muted-foreground">Week {filters.week} Projected</span>
                                      <span className="font-semibold text-blue-600">
                                        {selectedPlayer.projected_points.toFixed(1)}
                                      </span>
                                    </div>
                                  )}
                                </>
                              )
                            })()}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Game Log */}
                    {selectedPlayer.weekly_actuals || selectedPlayer.weekly_projections ? (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Calendar className="h-5 w-5" />
                            <span>Game Log (Actuals vs Projections)</span>
                          </CardTitle>
                        </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Week</th>
                                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Projected</th>
                                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Actual</th>
                                <th className="text-right py-2 px-3 font-medium text-muted-foreground">Difference</th>
                                <th className="text-center py-2 px-3 font-medium text-muted-foreground">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Get all weeks that have either actuals or projections
                                const allWeeks = new Set([
                                  ...Object.keys(selectedPlayer.weekly_actuals || {}),
                                  ...Object.keys(selectedPlayer.weekly_projections || {})
                                ]);
                                
                                const sortedWeeks = Array.from(allWeeks).sort((a, b) => parseInt(a) - parseInt(b));
                                
                                return sortedWeeks.map((week) => {
                                  const actualData = selectedPlayer.weekly_actuals?.[week];
                                  const projectionData = selectedPlayer.weekly_projections?.[week];
                                  const actual = actualData?.std || null;
                                  const projected = projectionData?.std || null;
                                  const difference = actual !== null && projected !== null ? actual - projected : null;
                                  
                                  return (
                                    <tr key={week} className="border-b hover:bg-muted/50">
                                      <td className="py-3 px-3 font-medium">Week {week}</td>
                                      <td className="py-3 px-3 text-right">
                                        {projected !== null ? (
                                          <span className="text-blue-600 font-medium">
                                            {projected.toFixed(1)}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        {actual !== null ? (
                                          <span className="text-green-600 font-medium">
                                            {actual.toFixed(1)}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 text-right">
                                        {difference !== null ? (
                                          <span className={`font-medium ${
                                            difference > 0 ? 'text-green-600' : 
                                            difference < 0 ? 'text-red-600' : 
                                            'text-gray-600'
                                          }`}>
                                            {difference > 0 ? '+' : ''}{difference.toFixed(1)}
                                          </span>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </td>
                                      <td className="py-3 px-3 text-center">
                                        {actual !== null && projected !== null ? (
                                          <Badge variant="outline" className="text-xs">
                                            Complete
                                          </Badge>
                                        ) : actual !== null ? (
                                          <Badge variant="outline" className="text-xs text-green-600">
                                            Actual Only
                                          </Badge>
                                        ) : projected !== null ? (
                                          <Badge variant="outline" className="text-xs text-blue-600">
                                            Projected Only
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                          
                          {(() => {
                            const allWeeks = new Set([
                              ...Object.keys(selectedPlayer.weekly_actuals || {}),
                              ...Object.keys(selectedPlayer.weekly_projections || {})
                            ]);
                            return allWeeks.size === 0;
                          })() && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Calendar className="h-8 w-8 mx-auto mb-2" />
                              <p>No game log data available</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Calendar className="h-5 w-5" />
                            <span>Game Log</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-8 w-8 mx-auto mb-2" />
                            <p>No game log data available for this player</p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerBrowser