import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, Calendar, Users, Newspaper, Trophy, RefreshCw, ExternalLink, MapPin, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { getSyracuseSchedule, getSyracuseRoster, getSyracuseNews, getSyracuseStats, getSyracusePlayerStats, getSyracuseGame, syncSyracuseData } from '../services/api'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getCollegeBasketballLogoWithFallback } from '../lib/collegeBasketballLogos'
import { useColorScheme, ColorScheme } from '../contexts/ColorSchemeContext'

interface Game {
  _id?: string
  gameId: string
  date: string
  opponent: string
  opponentTeamId?: number | null
  location: string
  isHome: boolean
  result?: string
  score?: {
    syracuse: number
    opponent: number
  }
  isWin?: boolean
  status: 'scheduled' | 'live' | 'final'
  season: number
  gameLink?: string
}

interface Player {
  _id?: string
  playerId: string
  name: string
  number?: string
  position?: string
  classYear?: string
  height?: string
  weight?: string
  imageUrl?: string
  playerLink?: string
  season: number
}

interface NewsArticle {
  _id?: string
  title: string
  url: string
  summary?: string
  imageUrl?: string
  publishedDate: string
  source: string
}

interface TeamStats {
  season: number
  team: string
  overall: {
    wins: number
    losses: number
    winPercentage: number
  }
  averages: {
    pointsPerGame: number
    reboundsPerGame: number
    assistsPerGame: number
    fieldGoalPercentage: number
    threePointPercentage: number
    freeThrowPercentage: number
  }
}

interface PlayerStats {
  name: string
  season: number
  gamesPlayed: number | null
  minutesPerGame: number | null
  pointsPerGame: number | null
  reboundsPerGame: number | null
  assistsPerGame: number | null
  stealsPerGame: number | null
  blocksPerGame: number | null
  turnoversPerGame: number | null
  fieldGoalPercentage: number | null
  freeThrowPercentage: number | null
  threePointPercentage: number | null
}

const Orangemen: React.FC = () => {
  const { colorScheme, setColorScheme } = useColorScheme()
  const [originalScheme, setOriginalScheme] = useState<ColorScheme | null>(null)
  const [schedule, setSchedule] = useState<Game[]>([])
  const [roster, setRoster] = useState<Player[]>([])
  const [news, setNews] = useState<NewsArticle[]>([])
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeTab, setActiveTab] = useState<'schedule' | 'roster' | 'news' | 'stats'>('schedule')
  const [season] = useState(new Date().getFullYear())
  const [expandedBoxScores, setExpandedBoxScores] = useState<Set<string>>(new Set())
  const [boxScores, setBoxScores] = useState<Record<string, any>>({})
  
  // Save original theme and switch to Syracuse theme on mount
  useEffect(() => {
    // Save current theme if not already Syracuse
    if (colorScheme !== 'syracuse') {
      setOriginalScheme(colorScheme)
      setColorScheme('syracuse')
    } else {
      setOriginalScheme('purple') // Default fallback
    }
    
    // Restore original theme on unmount
    return () => {
      if (originalScheme && originalScheme !== 'syracuse') {
        setColorScheme(originalScheme)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        fetchSchedule(),
        fetchRoster(),
        fetchNews(),
        fetchStats(),
        fetchPlayerStats()
      ])
    } catch (error) {
      console.error('Error fetching Syracuse data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSchedule = async () => {
    try {
      const response = await getSyracuseSchedule(season)
      console.log('Schedule response:', response)
      if (response.success) {
        setSchedule(response.games || [])
        console.log(`Loaded ${response.games?.length || 0} games`)
      } else {
        console.error('Schedule fetch failed:', response.error)
      }
    } catch (error) {
      console.error('Error fetching schedule:', error)
    }
  }

  const fetchRoster = async () => {
    try {
      const response = await getSyracuseRoster(season)
      console.log('Roster response:', response)
      if (response.success) {
        setRoster(response.players || [])
        console.log(`Loaded ${response.players?.length || 0} players`)
      } else {
        console.error('Roster fetch failed:', response.error)
      }
    } catch (error) {
      console.error('Error fetching roster:', error)
    }
  }

  const fetchNews = async () => {
    try {
      const response = await getSyracuseNews()
      console.log('News response:', response)
      if (response.success) {
        setNews(response.articles || [])
        console.log(`Loaded ${response.articles?.length || 0} articles`)
      } else {
        console.error('News fetch failed:', response.error)
      }
    } catch (error) {
      console.error('Error fetching news:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await getSyracuseStats(season)
      console.log('Stats response:', response)
      if (response.success) {
        setStats(response.stats)
      } else {
        console.error('Stats fetch failed:', response.error)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchPlayerStats = async () => {
    try {
      const response = await getSyracusePlayerStats(season)
      console.log('Player stats response:', response)
      if (response.success) {
        setPlayerStats(response.players || [])
      } else {
        console.error('Player stats fetch failed:', response.error)
      }
    } catch (error) {
      console.error('Error fetching player stats:', error)
    }
  }

  const toggleBoxScore = async (gameId: string) => {
    if (expandedBoxScores.has(gameId)) {
      setExpandedBoxScores(prev => {
        const newSet = new Set(prev)
        newSet.delete(gameId)
        return newSet
      })
    } else {
      setExpandedBoxScores(prev => new Set(prev).add(gameId))
      
      // Fetch box score if not already loaded
      if (!boxScores[gameId]) {
        try {
          const response = await getSyracuseGame(gameId)
          if (response.success && response.game?.boxScore) {
            setBoxScores(prev => ({
              ...prev,
              [gameId]: response.game.boxScore
            }))
          }
        } catch (error) {
          console.error('Error fetching box score:', error)
        }
      }
    }
  }

  // Get team leaders
  const getTeamLeaders = () => {
    if (playerStats.length === 0) return null

    const leaders = {
      points: [...playerStats].sort((a, b) => (b.pointsPerGame || 0) - (a.pointsPerGame || 0))[0],
      rebounds: [...playerStats].sort((a, b) => (b.reboundsPerGame || 0) - (a.reboundsPerGame || 0))[0],
      assists: [...playerStats].sort((a, b) => (b.assistsPerGame || 0) - (a.assistsPerGame || 0))[0],
      steals: [...playerStats].sort((a, b) => (b.stealsPerGame || 0) - (a.stealsPerGame || 0))[0],
      blocks: [...playerStats].sort((a, b) => (b.blocksPerGame || 0) - (a.blocksPerGame || 0))[0],
      fgPercentage: [...playerStats].filter(p => p.fieldGoalPercentage !== null)
        .sort((a, b) => (b.fieldGoalPercentage || 0) - (a.fieldGoalPercentage || 0))[0],
      threePtPercentage: [...playerStats].filter(p => p.threePointPercentage !== null)
        .sort((a, b) => (b.threePointPercentage || 0) - (a.threePointPercentage || 0))[0]
    }

    return leaders
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      await syncSyracuseData(season)
      await fetchData()
    } catch (error) {
      console.error('Error syncing data:', error)
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (dateString: string, season: number) => {
    try {
      // Handle formats like "Mon, Dec 22" - add current year
      if (dateString.match(/^\w{3},?\s+\w{3}\s+\d{1,2}$/)) {
        // Parse "Mon, Dec 22" or "Dec 22"
        const parts = dateString.replace(',', '').split(' ')
        const monthName = parts[parts.length - 2] // "Dec"
        const day = parts[parts.length - 1] // "22"
        
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        }
        
        const month = monthMap[monthName]
        if (month !== undefined) {
          // Determine year - if month is Nov/Dec, it's likely current year
          // If month is Jan-Mar, it could be next year (for next season)
          let year = season
          if (month < 8) { // Jan-Aug, likely next calendar year for basketball season
            year = season + 1
          }
          
          const date = new Date(year, month, parseInt(day))
          return date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })
        }
      }
      
      // Try parsing as regular date
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { 
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        })
      }
      
      return dateString
    } catch {
      return dateString
    }
  }

  const parseGameDate = (dateString: string, season: number): Date | null => {
    try {
      // Handle formats like "Mon, Dec 22"
      if (dateString.match(/^\w{3},?\s+\w{3}\s+\d{1,2}$/)) {
        const parts = dateString.replace(',', '').split(' ')
        const monthName = parts[parts.length - 2]
        const day = parts[parts.length - 1]
        
        const monthMap: { [key: string]: number } = {
          'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
          'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        }
        
        const month = monthMap[monthName]
        if (month !== undefined) {
          let year = season
          if (month < 8) { // Jan-Aug, likely next calendar year
            year = season + 1
          }
          
          return new Date(year, month, parseInt(day))
        }
      }
      
      // Try parsing as regular date
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        return date
      }
      
      return null
    } catch {
      return null
    }
  }

  const isGamePast = (game: Game): boolean => {
    const gameDate = parseGameDate(game.date, game.season)
    if (!gameDate) return false
    
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    gameDate.setHours(0, 0, 0, 0)
    
    return gameDate < now || game.status === 'final'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'final':
        return <Badge variant="default">Final</Badge>
      case 'live':
        return <Badge variant="secondary" className="bg-red-500">Live</Badge>
      default:
        return <Badge variant="outline">Scheduled</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading Syracuse Orange data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Fantasy
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Syracuse Orange</h1>
              <p className="text-muted-foreground">Men's Basketball {season}</p>
            </div>
          </div>
          <Button 
            onClick={handleSync} 
            disabled={syncing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Data'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex space-x-2 border-b border-border">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'schedule'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Schedule
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'roster'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Roster
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'news'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Newspaper className="h-4 w-4 inline mr-2" />
            News
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'stats'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy className="h-4 w-4 inline mr-2" />
            Stats
          </button>
        </div>

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-6">
            {schedule.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No schedule data available
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Upcoming Games */}
                {schedule.filter(game => !isGamePast(game)).length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-foreground">Upcoming Games</h3>
                    <div className="grid gap-4">
                      {schedule
                        .filter(game => !isGamePast(game))
                        .sort((a, b) => {
                          const dateA = parseGameDate(a.date, a.season)
                          const dateB = parseGameDate(b.date, b.season)
                          if (!dateA || !dateB) return 0
                          return dateA.getTime() - dateB.getTime() // Upcoming: earliest first
                        })
                        .map((game) => (
                          <Card key={game._id || game.gameId} className="hover:shadow-lg transition-shadow">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  {/* Date and Status */}
                                  <div className="flex items-center gap-2 mb-3">
                                    {getStatusBadge(game.status)}
                                    <span className="text-sm font-medium text-foreground flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {formatDate(game.date, game.season)}
                                    </span>
                                    {game.location && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {game.isHome ? '🏠 Home' : game.location.includes('PM') || game.location.includes('AM') ? `📍 ${game.location}` : `📍 ${game.location}`}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Teams with Logos */}
                                  <div className="flex items-center gap-4 mb-3">
                                    {/* Syracuse */}
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={getCollegeBasketballLogoWithFallback('Syracuse')}
                                        alt="Syracuse"
                                        className="w-12 h-12 rounded-full border-2 border-primary/30 object-cover"
                                      />
                                      <span className="font-bold text-lg">Syracuse</span>
                                    </div>
                                    
                                    <span className="text-muted-foreground text-xl font-bold">
                                      {game.isHome ? 'vs' : '@'}
                                    </span>
                                    
                                    {/* Opponent */}
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={getCollegeBasketballLogoWithFallback(game.opponent, game.opponentTeamId)}
                                        alt={game.opponent}
                                        className="w-12 h-12 rounded-full border-2 border-border object-cover"
                                        onError={(e) => {
                                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(game.opponent)}&background=FF6B35&color=fff&size=128&bold=true`
                                        }}
                                      />
                                      <span className="font-bold text-lg">{game.opponent}</span>
                                    </div>
                                    
                                    <Badge variant={game.isHome ? "default" : "secondary"} className="ml-auto">
                                      {game.isHome ? '🏠 Home' : '✈️ Away'}
                                    </Badge>
                                  </div>
                                  
                                  {/* Score */}
                                  {game.score && (
                                    <div className="flex items-center gap-3 mt-3">
                                      <div className="text-2xl font-bold">
                                        <span className={game.isWin ? 'text-green-500' : 'text-red-500'}>
                                          {game.score.syracuse}
                                        </span>
                                        <span className="mx-2">-</span>
                                        <span>{game.score.opponent}</span>
                                      </div>
                                      {game.isWin !== null && (
                                        <Badge 
                                          variant={game.isWin ? "default" : "destructive"} 
                                          className="text-lg px-3 py-1"
                                        >
                                          {game.isWin ? '✓ Win' : '✗ Loss'}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Result/Time */}
                                  {!game.score && game.result && !game.result.toLowerCase().includes('ticket') && (
                                    <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {game.result}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Game Link */}
                                {game.gameLink && (
                                  <a
                                    href={game.gameLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="outline" size="sm">
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}

                {/* Past Games */}
                {schedule.filter(game => isGamePast(game)).length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold mb-4 text-foreground">Past Games</h3>
                    <div className="grid gap-4">
                      {schedule
                        .filter(game => isGamePast(game))
                        .sort((a, b) => {
                          const dateA = parseGameDate(a.date, a.season)
                          const dateB = parseGameDate(b.date, b.season)
                          if (!dateA || !dateB) return 0
                          return dateB.getTime() - dateA.getTime() // Past: most recent first
                        })
                        .map((game) => (
                          <Card key={game._id || game.gameId} className="opacity-90 hover:opacity-100 transition-opacity">
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1">
                                  {/* Date and Status */}
                                  <div className="flex items-center gap-2 mb-3">
                                    {getStatusBadge(game.status)}
                                    <span className="text-sm font-medium text-foreground flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {formatDate(game.date, game.season)}
                                    </span>
                                    {game.location && (
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {game.isHome ? '🏠 Home' : game.location.includes('PM') || game.location.includes('AM') ? `📍 ${game.location}` : `📍 ${game.location}`}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Teams with Logos */}
                                  <div className="flex items-center gap-4 mb-3">
                                    {/* Syracuse */}
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={getCollegeBasketballLogoWithFallback('Syracuse')}
                                        alt="Syracuse"
                                        className="w-12 h-12 rounded-full border-2 border-primary/30 object-cover"
                                      />
                                      <span className="font-bold text-lg">Syracuse</span>
                                    </div>
                                    
                                    <span className="text-muted-foreground text-xl font-bold">
                                      {game.isHome ? 'vs' : '@'}
                                    </span>
                                    
                                    {/* Opponent */}
                                    <div className="flex items-center gap-2">
                                      <img 
                                        src={getCollegeBasketballLogoWithFallback(game.opponent, game.opponentTeamId)}
                                        alt={game.opponent}
                                        className="w-12 h-12 rounded-full border-2 border-border object-cover"
                                        onError={(e) => {
                                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(game.opponent)}&background=FF6B35&color=fff&size=128&bold=true`
                                        }}
                                      />
                                      <span className="font-bold text-lg">{game.opponent}</span>
                                    </div>
                                    
                                    <Badge variant={game.isHome ? "default" : "secondary"} className="ml-auto">
                                      {game.isHome ? '🏠 Home' : '✈️ Away'}
                                    </Badge>
                                  </div>
                                  
                                  {/* Score */}
                                  {game.score && (
                                    <div className="flex items-center gap-3 mt-3">
                                      <div className="text-2xl font-bold">
                                        <span className={game.isWin ? 'text-green-500' : 'text-red-500'}>
                                          {game.score.syracuse}
                                        </span>
                                        <span className="mx-2">-</span>
                                        <span>{game.score.opponent}</span>
                                      </div>
                                      {game.isWin !== null && (
                                        <Badge 
                                          variant={game.isWin ? "default" : "destructive"} 
                                          className="text-lg px-3 py-1"
                                        >
                                          {game.isWin ? '✓ Win' : '✗ Loss'}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Result/Time */}
                                  {!game.score && game.result && !game.result.toLowerCase().includes('ticket') && (
                                    <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {game.result}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Game Link */}
                                {game.gameLink && (
                                  <a
                                    href={game.gameLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button variant="outline" size="sm">
                                      <ExternalLink className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Roster Tab */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            {roster.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No roster data available
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roster.map((player) => (
                  <Card key={player._id || player.playerId}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        {player.imageUrl ? (
                          <img
                            src={player.imageUrl}
                            alt={player.name}
                            className="w-12 h-12 rounded-full object-cover border border-border/20"
                            onError={(e) => {
                              // Hide image if it fails to load
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-orange-400">
                              {player.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="font-semibold">{player.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {player.number && `#${player.number}`}
                            {player.position && ` • ${player.position}`}
                            {player.classYear && ` • ${player.classYear}`}
                          </div>
                          {(player.height || player.weight) && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {player.height} {player.weight && `• ${player.weight}`}
                            </div>
                          )}
                        </div>
                        {player.playerLink && (
                          <a
                            href={player.playerLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* News Tab */}
        {activeTab === 'news' && (
          <div className="space-y-4">
            {news.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No news articles available
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {news.map((article) => (
                  <Card key={article._id || article.url} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className={`flex ${article.imageUrl ? 'space-x-4' : ''}`}>
                        {article.imageUrl && 
                         !article.imageUrl.includes('base64') && 
                         !article.imageUrl.includes('data:image') &&
                         !article.imageUrl.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7') ? (
                          <div className="flex gap-4">
                            <div className="flex-shrink-0">
                              <img
                                src={article.imageUrl}
                                alt={article.title}
                                className="w-32 h-32 object-cover rounded-lg border border-border/20"
                                onLoad={(e) => {
                                  const imgSrc = e.currentTarget.src;
                                  // Check if it's a placeholder image
                                  if (imgSrc.includes('base64') || 
                                      imgSrc.includes('data:image') ||
                                      imgSrc.includes('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')) {
                                    console.warn(`[Frontend] ⚠️ Placeholder image detected: ${imgSrc.substring(0, 100)}`);
                                    // Hide placeholder images
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.closest('.flex');
                                    if (parent) {
                                      parent.classList.remove('gap-4');
                                    }
                                  } else {
                                    console.log(`[Frontend] ✅ Image loaded successfully: ${imgSrc.substring(0, 100)}...`);
                                    console.log(`[Frontend]   Article: "${article.title.substring(0, 60)}..."`);
                                  }
                                }}
                                onError={(e) => {
                                  console.error(`[Frontend] ❌ Image failed to load: ${article.imageUrl}`);
                                  console.error(`[Frontend]   Article: "${article.title.substring(0, 60)}..."`);
                                  console.error(`[Frontend]   Article URL: ${article.url}`);
                                  
                                  // Hide image if it fails to load
                                  e.currentTarget.style.display = 'none';
                                  // Remove flex gap if image fails
                                  const parent = e.currentTarget.closest('.flex');
                                  if (parent) {
                                    parent.classList.remove('gap-4');
                                  }
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline block"
                              >
                                <h3 className="font-semibold text-lg mb-2 text-foreground line-clamp-2 hover:text-primary transition-colors">
                                  {article.title}
                                </h3>
                              </a>
                              {article.summary && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                                  {article.summary}
                                </p>
                              )}
                              <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
                                <span className="font-medium">{article.source}</span>
                                <span>•</span>
                                <span>{formatDate(article.publishedDate, season)}</span>
                                <span>•</span>
                                <a
                                  href={article.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-center"
                                >
                                  Read more
                                  <ExternalLink className="h-3 w-3 ml-1" />
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full">
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline block"
                            >
                              <h3 className="font-semibold text-lg mb-2 text-foreground hover:text-primary transition-colors">
                                {article.title}
                              </h3>
                            </a>
                            {article.summary && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {article.summary}
                              </p>
                            )}
                            <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">{article.source}</span>
                              <span>•</span>
                              <span>{formatDate(article.publishedDate, season)}</span>
                              <span>•</span>
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center"
                              >
                                Read more
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Team Overview */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Record</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold mb-2">
                      {stats.overall.wins} - {stats.overall.losses}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Win Percentage: {(stats.overall.winPercentage * 100).toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Team Averages</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {stats.averages.pointsPerGame > 0 && (
                        <div className="flex justify-between">
                          <span>Points Per Game:</span>
                          <span className="font-semibold">{stats.averages.pointsPerGame.toFixed(1)}</span>
                        </div>
                      )}
                      {stats.averages.reboundsPerGame > 0 && (
                        <div className="flex justify-between">
                          <span>Rebounds Per Game:</span>
                          <span className="font-semibold">{stats.averages.reboundsPerGame.toFixed(1)}</span>
                        </div>
                      )}
                      {stats.averages.assistsPerGame > 0 && (
                        <div className="flex justify-between">
                          <span>Assists Per Game:</span>
                          <span className="font-semibold">{stats.averages.assistsPerGame.toFixed(1)}</span>
                        </div>
                      )}
                      {stats.averages.fieldGoalPercentage > 0 && (
                        <div className="flex justify-between">
                          <span>FG%:</span>
                          <span className="font-semibold">{(stats.averages.fieldGoalPercentage * 100).toFixed(1)}%</span>
                        </div>
                      )}
                      {stats.averages.threePointPercentage > 0 && (
                        <div className="flex justify-between">
                          <span>3P%:</span>
                          <span className="font-semibold">{(stats.averages.threePointPercentage * 100).toFixed(1)}%</span>
                        </div>
                      )}
                      {stats.averages.freeThrowPercentage > 0 && (
                        <div className="flex justify-between">
                          <span>FT%:</span>
                          <span className="font-semibold">{(stats.averages.freeThrowPercentage * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Team Leaders */}
            {getTeamLeaders() && (
              <Card>
                <CardHeader>
                  <CardTitle>Team Leaders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {getTeamLeaders()?.points && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Points</div>
                        <div className="font-semibold">{getTeamLeaders()?.points.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getTeamLeaders()?.points.pointsPerGame?.toFixed(1)} PPG
                        </div>
                      </div>
                    )}
                    {getTeamLeaders()?.rebounds && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Rebounds</div>
                        <div className="font-semibold">{getTeamLeaders()?.rebounds.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getTeamLeaders()?.rebounds.reboundsPerGame?.toFixed(1)} RPG
                        </div>
                      </div>
                    )}
                    {getTeamLeaders()?.assists && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Assists</div>
                        <div className="font-semibold">{getTeamLeaders()?.assists.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getTeamLeaders()?.assists.assistsPerGame?.toFixed(1)} APG
                        </div>
                      </div>
                    )}
                    {getTeamLeaders()?.steals && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Steals</div>
                        <div className="font-semibold">{getTeamLeaders()?.steals.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getTeamLeaders()?.steals.stealsPerGame?.toFixed(1)} SPG
                        </div>
                      </div>
                    )}
                    {getTeamLeaders()?.blocks && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Blocks</div>
                        <div className="font-semibold">{getTeamLeaders()?.blocks.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {getTeamLeaders()?.blocks.blocksPerGame?.toFixed(1)} BPG
                        </div>
                      </div>
                    )}
                    {getTeamLeaders()?.fgPercentage && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">FG%</div>
                        <div className="font-semibold">{getTeamLeaders()?.fgPercentage.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {((getTeamLeaders()?.fgPercentage.fieldGoalPercentage || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                    )}
                    {getTeamLeaders()?.threePtPercentage && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">3P%</div>
                        <div className="font-semibold">{getTeamLeaders()?.threePtPercentage.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {((getTeamLeaders()?.threePtPercentage.threePointPercentage || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Player Stats Table */}
            {playerStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Player Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-2 font-semibold">Player</th>
                          <th className="text-right p-2 font-semibold">GP</th>
                          <th className="text-right p-2 font-semibold">MPG</th>
                          <th className="text-right p-2 font-semibold">PPG</th>
                          <th className="text-right p-2 font-semibold">RPG</th>
                          <th className="text-right p-2 font-semibold">APG</th>
                          <th className="text-right p-2 font-semibold">SPG</th>
                          <th className="text-right p-2 font-semibold">BPG</th>
                          <th className="text-right p-2 font-semibold">FG%</th>
                          <th className="text-right p-2 font-semibold">3P%</th>
                          <th className="text-right p-2 font-semibold">FT%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerStats.map((player, index) => (
                          <tr key={index} className="border-b border-border/50 hover:bg-muted/50">
                            <td className="p-2 font-medium">{player.name}</td>
                            <td className="p-2 text-right">{player.gamesPlayed || '-'}</td>
                            <td className="p-2 text-right">{player.minutesPerGame?.toFixed(1) || '-'}</td>
                            <td className="p-2 text-right font-semibold">{player.pointsPerGame?.toFixed(1) || '-'}</td>
                            <td className="p-2 text-right">{player.reboundsPerGame?.toFixed(1) || '-'}</td>
                            <td className="p-2 text-right">{player.assistsPerGame?.toFixed(1) || '-'}</td>
                            <td className="p-2 text-right">{player.stealsPerGame?.toFixed(1) || '-'}</td>
                            <td className="p-2 text-right">{player.blocksPerGame?.toFixed(1) || '-'}</td>
                            <td className="p-2 text-right">
                              {player.fieldGoalPercentage !== null 
                                ? `${(player.fieldGoalPercentage * 100).toFixed(1)}%` 
                                : '-'}
                            </td>
                            <td className="p-2 text-right">
                              {player.threePointPercentage !== null 
                                ? `${(player.threePointPercentage * 100).toFixed(1)}%` 
                                : '-'}
                            </td>
                            <td className="p-2 text-right">
                              {player.freeThrowPercentage !== null 
                                ? `${(player.freeThrowPercentage * 100).toFixed(1)}%` 
                                : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Box Scores Section */}
            {schedule.filter(game => game.status === 'final' && game.score).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Box Scores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {schedule
                      .filter(game => game.status === 'final' && game.score)
                      .sort((a, b) => {
                        const dateA = parseGameDate(a.date, a.season)
                        const dateB = parseGameDate(b.date, b.season)
                        if (!dateA || !dateB) return 0
                        return dateB.getTime() - dateA.getTime() // Most recent first
                      })
                      .map((game) => (
                        <div key={game._id || game.gameId} className="border border-border rounded-lg">
                          <button
                            onClick={() => toggleBoxScore(game.gameId)}
                            className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 text-left">
                              <div className="font-semibold">
                                {formatDate(game.date, game.season)} {game.isHome ? 'vs' : '@'} {game.opponent}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {game.score && (
                                  <>Syracuse {game.score.syracuse} - {game.score.opponent} {game.opponent}</>
                                )}
                              </div>
                            </div>
                            {expandedBoxScores.has(game.gameId) ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </button>
                          {expandedBoxScores.has(game.gameId) && (
                            <div className="p-4 border-t border-border">
                              {boxScores[game.gameId] ? (
                                <div className="space-y-4">
                                  {boxScores[game.gameId].players?.syracuse && boxScores[game.gameId].players.syracuse.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold mb-2">Syracuse</h4>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-border">
                                              <th className="text-left p-1">Player</th>
                                              <th className="text-right p-1">MIN</th>
                                              <th className="text-right p-1">PTS</th>
                                              <th className="text-right p-1">REB</th>
                                              <th className="text-right p-1">AST</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {boxScores[game.gameId].players.syracuse.map((player: any, idx: number) => (
                                              <tr key={idx} className="border-b border-border/30">
                                                <td className="p-1">{player.name}</td>
                                                <td className="p-1 text-right">{player.min || '-'}</td>
                                                <td className="p-1 text-right font-semibold">{player.pts || '-'}</td>
                                                <td className="p-1 text-right">{player.reb || '-'}</td>
                                                <td className="p-1 text-right">{player.ast || '-'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                  {boxScores[game.gameId].players?.opponent && boxScores[game.gameId].players.opponent.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold mb-2">{game.opponent}</h4>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="border-b border-border">
                                              <th className="text-left p-1">Player</th>
                                              <th className="text-right p-1">MIN</th>
                                              <th className="text-right p-1">PTS</th>
                                              <th className="text-right p-1">REB</th>
                                              <th className="text-right p-1">AST</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {boxScores[game.gameId].players.opponent.map((player: any, idx: number) => (
                                              <tr key={idx} className="border-b border-border/30">
                                                <td className="p-1">{player.name}</td>
                                                <td className="p-1 text-right">{player.min || '-'}</td>
                                                <td className="p-1 text-right font-semibold">{player.pts || '-'}</td>
                                                <td className="p-1 text-right">{player.reb || '-'}</td>
                                                <td className="p-1 text-right">{player.ast || '-'}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center text-muted-foreground py-4">
                                  Loading box score...
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!stats && playerStats.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No stats data available
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Orangemen

