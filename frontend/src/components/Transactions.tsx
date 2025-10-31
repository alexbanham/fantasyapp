import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select'
import { Input } from './ui/input'
import { 
  ArrowUpDown, 
  ArrowLeftRight, 
  TrendingUp, 
  TrendingDown,
  Users,
  Calendar,
  Search,
  Filter,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  Plus,
  Minus,
  Move
} from 'lucide-react'
import { Transaction, TransactionStats, TransactionItem } from '../services/api'

interface TransactionsProps {
  transactions: Transaction[]
  stats: TransactionStats
  loading?: boolean
  seasonId: number
  week?: number | null
  onWeekChange?: (week: number | null) => void
  availableWeeks?: Array<{ week: number; label: string }>
}

type FilterType = 'all' | 'TRADE_PROPOSAL' | 'TRADE_DECLINE' | 'TRADE_VETO' | 'WAIVER' | 'FREEAGENT' | 'ROSTER'
type SortBy = 'date' | 'type' | 'team' | 'status'
type ViewMode = 'list' | 'trades' | 'analytics'

const Transactions: React.FC<TransactionsProps> = ({
  transactions,
  stats,
  loading = false,
  seasonId,
  week,
  onWeekChange,
  availableWeeks = []
}) => {
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Get transaction type label and icon
  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'TRADE_PROPOSAL':
        return { label: 'Trade', icon: ArrowLeftRight, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' }
      case 'TRADE_DECLINE':
        return { label: 'Trade Declined', icon: XCircle, color: 'bg-red-500/10 text-red-600 dark:text-red-400' }
      case 'TRADE_VETO':
        return { label: 'Trade Vetoed', icon: XCircle, color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' }
      case 'WAIVER':
        return { label: 'Waiver', icon: ArrowUpDown, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' }
      case 'FREEAGENT':
        return { label: 'Free Agent', icon: TrendingUp, color: 'bg-green-500/10 text-green-600 dark:text-green-400' }
      case 'ROSTER':
        return { label: 'Roster Move', icon: Users, color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' }
      default:
        return { label: type, icon: Activity, color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' }
    }
  }

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXECUTED':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Executed</Badge>
      case 'CANCELED':
        return <Badge variant="outline" className="border-gray-500/20"><XCircle className="h-3 w-3 mr-1" />Canceled</Badge>
      case 'PENDING':
        return <Badge variant="outline" className="border-yellow-500/20 text-yellow-600 dark:text-yellow-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Filter and sort transactions
  const filteredAndSorted = useMemo(() => {
    let filtered = transactions

    // Filter by type
    if (filterType !== 'all') {
      if (filterType === 'TRADE_PROPOSAL') {
        filtered = filtered.filter(tx => 
          tx.type === 'TRADE_PROPOSAL' || tx.items?.some(item => item.type === 'TRADE')
        )
      } else {
        filtered = filtered.filter(tx => tx.type === filterType)
      }
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(tx => 
        tx.teamName.toLowerCase().includes(query) ||
        tx.items.some(item => 
          item.playerName?.toLowerCase().includes(query) ||
          item.fromTeamName?.toLowerCase().includes(query) ||
          item.toTeamName?.toLowerCase().includes(query) ||
          item.action?.toLowerCase().includes(query)
        ) ||
        tx.participatingTeams?.some(team => team.name.toLowerCase().includes(query))
      )
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'date':
          comparison = (a.proposedDate || a.processDate || 0) - (b.proposedDate || b.processDate || 0)
          break
        case 'type':
          comparison = a.type.localeCompare(b.type)
          break
        case 'team':
          comparison = a.teamName.localeCompare(b.teamName)
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [transactions, filterType, sortBy, sortOrder, searchQuery])

  // Get trade-only transactions
  const tradesOnly = useMemo(() => {
    return filteredAndSorted.filter(tx => 
      tx.type === 'TRADE_PROPOSAL' || 
      tx.type === 'TRADE_DECLINE' || 
      tx.type === 'TRADE_VETO' ||
      tx.items?.some(item => item.type === 'TRADE')
    )
  }, [filteredAndSorted])

  // Analytics calculations
  const analytics = useMemo(() => {
    const weekCounts = Object.entries(stats.byWeek).map(([week, count]) => ({
      week: parseInt(week),
      count
    })).sort((a, b) => a.week - b.week)

    const typeDistribution = Object.entries(stats.byType).map(([type, count]) => ({
      type,
      count,
      percentage: (count / stats.total) * 100
    })).sort((a, b) => b.count - a.count)

    const mostActiveWeeks = weekCounts.sort((a, b) => b.count - a.count).slice(0, 5)
    const avgPerWeek = stats.total > 0 ? (stats.total / weekCounts.length) : 0

    return {
      weekCounts,
      typeDistribution,
      mostActiveWeeks,
      avgPerWeek
    }
  }, [stats])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="TRADE_PROPOSAL">Trades</SelectItem>
              <SelectItem value="WAIVER">Waivers</SelectItem>
              <SelectItem value="FREEAGENT">Free Agents</SelectItem>
              <SelectItem value="ROSTER">Roster Moves</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Sort by Date</SelectItem>
              <SelectItem value="type">Sort by Type</SelectItem>
              <SelectItem value="team">Sort by Team</SelectItem>
              <SelectItem value="status">Sort by Status</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
          <Button
            variant={viewMode === 'trades' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('trades')}
          >
            Trades
          </Button>
          <Button
            variant={viewMode === 'analytics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('analytics')}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {viewMode !== 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Activity className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Trades</p>
                  <p className="text-2xl font-bold">{stats.tradeCount}</p>
                </div>
                <ArrowLeftRight className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Waivers</p>
                  <p className="text-2xl font-bold">{stats.waiverCount}</p>
                </div>
                <ArrowUpDown className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Free Agents</p>
                  <p className="text-2xl font-bold">{stats.freeAgentCount}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics View */}
      {viewMode === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Transactions by Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.weekCounts.map(({ week, count }) => (
                  <div key={week} className="flex items-center gap-3">
                    <div className="text-sm font-medium w-12">Week {week}</div>
                    <div className="flex-1 h-6 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${(count / (analytics.mostActiveWeeks[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <div className="text-sm font-semibold w-12 text-right">{count}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Average: <span className="font-semibold">{analytics.avgPerWeek.toFixed(1)}</span> per week
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Distribution by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.typeDistribution.map(({ type, count, percentage }) => {
                  const typeInfo = getTransactionTypeInfo(type)
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <typeInfo.icon className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{typeInfo.label}</span>
                          <span className="text-sm text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${typeInfo.color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Most Active Weeks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {analytics.mostActiveWeeks.map(({ week, count }, idx) => (
                  <div key={week} className="text-center p-4 bg-secondary rounded-lg">
                    <div className="text-3xl font-bold text-primary">{count}</div>
                    <div className="text-sm text-muted-foreground mt-1">Week {week}</div>
                    {idx === 0 && (
                      <Badge className="mt-2" variant="default">Most Active</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transactions List */}
      {(viewMode === 'list' || viewMode === 'trades') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {viewMode === 'trades' ? 'Trades' : 'Transactions'} ({filteredAndSorted.length})
              </CardTitle>
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filteredAndSorted.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(viewMode === 'trades' ? tradesOnly : filteredAndSorted).map((tx) => {
                  const typeInfo = getTransactionTypeInfo(tx.type)
                  const date = new Date(tx.proposedDate || tx.processDate || 0)
                  
                  return (
                    <div
                      key={tx.id}
                      className="border rounded-lg p-4 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                            <typeInfo.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{typeInfo.label}</span>
                              {getStatusBadge(tx.status)}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3" />
                              {date.toLocaleDateString()} {date.toLocaleTimeString()}
                              <span className="mx-1">•</span>
                              Week {tx.scoringPeriodId}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {tx.teamLogo && (
                            <img src={tx.teamLogo} alt={tx.teamName} className="h-8 w-8 rounded" />
                          )}
                          <span className="font-medium">{tx.teamName}</span>
                        </div>
                      </div>

                      {/* Special Trade Display */}
                      {(tx.type === 'TRADE_PROPOSAL' || tx.items?.some(item => item.type === 'TRADE')) && tx.participatingTeams && tx.participatingTeams.length >= 2 ? (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2 mb-4">
                            <ArrowLeftRight className="h-5 w-5 text-primary" />
                            <span className="text-lg font-semibold">Trade Details</span>
                          </div>
                          
                          {/* Group trade items by team */}
                          {(() => {
                            const tradeItems = tx.items.filter(item => item.type === 'TRADE');
                            const teamGroups = new Map<number, { team: typeof tx.participatingTeams[0], sending: TransactionItem[], receiving: TransactionItem[] }>();
                            
                            // Initialize team groups
                            tx.participatingTeams.forEach(team => {
                              teamGroups.set(team.id, {
                                team,
                                sending: [],
                                receiving: []
                              });
                            });
                            
                            // Group items by team
                            tradeItems.forEach(item => {
                              if (item.fromTeamId && teamGroups.has(item.fromTeamId)) {
                                teamGroups.get(item.fromTeamId)!.sending.push(item);
                              }
                              if (item.toTeamId && teamGroups.has(item.toTeamId)) {
                                teamGroups.get(item.toTeamId)!.receiving.push(item);
                              }
                            });
                            
                            const teams = Array.from(teamGroups.values());
                            
                            return (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                                {/* Visual connector for trades */}
                                {teams.length === 2 && (
                                  <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-full bg-primary/20 -z-10" />
                                )}
                                {teams.map((teamGroup, teamIdx) => {
                                  const team = teamGroup.team;
                                  return (
                                    <Card key={team.id} className={`p-4 border-2 ${teamIdx === 0 ? 'border-blue-500/30' : 'border-green-500/30'}`}>
                                      <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                                        {team.logo && (
                                          <img src={team.logo} alt={team.name} className="h-10 w-10 rounded" />
                                        )}
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-base">{team.name}</h4>
                                          <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                            {teamGroup.sending.length > 0 && (
                                              <span className="flex items-center gap-1">
                                                <TrendingDown className="h-3 w-3 text-red-500" />
                                                Sending: {teamGroup.sending.length}
                                              </span>
                                            )}
                                            {teamGroup.receiving.length > 0 && (
                                              <span className="flex items-center gap-1">
                                                <TrendingUp className="h-3 w-3 text-green-500" />
                                                Receiving: {teamGroup.receiving.length}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Players Sending */}
                                      {teamGroup.sending.length > 0 && (
                                        <div className="mb-4">
                                          <div className="flex items-center gap-2 mb-2">
                                            <TrendingDown className="h-4 w-4 text-red-500" />
                                            <span className="text-sm font-medium text-red-600 dark:text-red-400">Sending</span>
                                          </div>
                                          <div className="space-y-2">
                                            {teamGroup.sending.map((item, idx) => (
                                              <div key={idx} className="flex items-center gap-2 p-2 bg-red-500/5 rounded border border-red-500/20">
                                                {item.playerHeadshot ? (
                                                  <img 
                                                    src={item.playerHeadshot} 
                                                    alt={item.playerName}
                                                    className="w-8 h-8 rounded-full object-cover"
                                                  />
                                                ) : (
                                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                  </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-medium text-sm">{item.playerName}</div>
                                                  {item.playerPosition && (
                                                    <div className="text-xs text-muted-foreground">{item.playerPosition}</div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Players Receiving */}
                                      {teamGroup.receiving.length > 0 && (
                                        <div>
                                          <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="h-4 w-4 text-green-500" />
                                            <span className="text-sm font-medium text-green-600 dark:text-green-400">Receiving</span>
                                          </div>
                                          <div className="space-y-2">
                                            {teamGroup.receiving.map((item, idx) => (
                                              <div key={idx} className="flex items-center gap-2 p-2 bg-green-500/5 rounded border border-green-500/20">
                                                {item.playerHeadshot ? (
                                                  <img 
                                                    src={item.playerHeadshot} 
                                                    alt={item.playerName}
                                                    className="w-8 h-8 rounded-full object-cover"
                                                  />
                                                ) : (
                                                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                  </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                  <div className="font-medium text-sm">{item.playerName}</div>
                                                  {item.playerPosition && (
                                                    <div className="text-xs text-muted-foreground">{item.playerPosition}</div>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </Card>
                                  );
                                })}
                              </div>
                            );
                          })()}
                          
                          {/* Show non-trade items if any (like drops/adds that happen with trade) */}
                          {tx.items.filter(item => item.type !== 'TRADE').length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <div className="flex items-center gap-2 mb-3">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Additional Actions</span>
                              </div>
                              <div className="space-y-2">
                                {tx.items.filter(item => item.type !== 'TRADE').slice(0, 5).map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2 p-2 bg-secondary/30 rounded text-sm">
                                    {item.playerHeadshot && (
                                      <img src={item.playerHeadshot} alt={item.playerName} className="w-6 h-6 rounded-full" />
                                    )}
                                    <span className="font-medium">{item.playerName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {item.type}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">{item.action}</span>
                                  </div>
                                ))}
                                {tx.items.filter(item => item.type !== 'TRADE').length > 5 && (
                                  <div className="text-xs text-muted-foreground text-center">
                                    +{tx.items.filter(item => item.type !== 'TRADE').length - 5} more
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : tx.participatingTeams && tx.participatingTeams.length > 0 ? (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Participating Teams</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {tx.participatingTeams.map((team) => (
                              <div key={team.id} className="flex items-center gap-2 px-2 py-1 bg-secondary rounded">
                                {team.logo && (
                                  <img src={team.logo} alt={team.name} className="h-5 w-5 rounded" />
                                )}
                                <span className="text-sm">{team.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {/* Transaction items (non-trade items or all items if not a trade) */}
                      {tx.items && tx.items.length > 0 && !(tx.type === 'TRADE_PROPOSAL' || tx.items?.some(item => item.type === 'TRADE')) && (
                        <div className="mt-3 pt-3 border-t">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">
                                {tx.items.length} {tx.items.length === 1 ? 'Player' : 'Players'} Involved
                              </span>
                            </div>
                            {/* Transaction summary by type */}
                            <div className="flex gap-2 text-xs">
                              {tx.items.filter(item => item.type === 'ADD').length > 0 && (
                                <Badge variant="outline" className="border-green-500/20 text-green-600 dark:text-green-400">
                                  <Plus className="h-3 w-3 mr-1" />
                                  {tx.items.filter(item => item.type === 'ADD').length}
                                </Badge>
                              )}
                              {tx.items.filter(item => item.type === 'DROP').length > 0 && (
                                <Badge variant="outline" className="border-red-500/20 text-red-600 dark:text-red-400">
                                  <Minus className="h-3 w-3 mr-1" />
                                  {tx.items.filter(item => item.type === 'DROP').length}
                                </Badge>
                              )}
                              {tx.items.filter(item => item.type === 'TRADE').length > 0 && (
                                <Badge variant="outline" className="border-blue-500/20 text-blue-600 dark:text-blue-400">
                                  <ArrowLeftRight className="h-3 w-3 mr-1" />
                                  {tx.items.filter(item => item.type === 'TRADE').length}
                                </Badge>
                              )}
                              {tx.items.filter(item => item.type === 'LINEUP').length > 0 && (
                                <Badge variant="outline" className="border-purple-500/20 text-purple-600 dark:text-purple-400">
                                  <Move className="h-3 w-3 mr-1" />
                                  {tx.items.filter(item => item.type === 'LINEUP').length}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2">
                            {tx.items.slice(0, 10).map((item, idx) => (
                              <div key={idx} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border/50">
                                {/* Player Avatar */}
                                {item.playerHeadshot ? (
                                  <img 
                                    src={item.playerHeadshot} 
                                    alt={item.playerName}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-border"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                                    <Users className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                
                                {/* Player Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm">{item.playerName}</span>
                                    {item.playerPosition && (
                                      <Badge variant="outline" className="text-xs">
                                        {item.playerPosition}
                                      </Badge>
                                    )}
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        item.type === 'ADD' ? 'border-green-500/20 text-green-600 dark:text-green-400' :
                                        item.type === 'DROP' ? 'border-red-500/20 text-red-600 dark:text-red-400' :
                                        item.type === 'TRADE' ? 'border-blue-500/20 text-blue-600 dark:text-blue-400' :
                                        item.type === 'LINEUP' ? 'border-purple-500/20 text-purple-600 dark:text-purple-400' :
                                        ''
                                      }`}
                                    >
                                      {item.type}
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {item.action}
                                  </div>
                                  {/* Team movement for trades */}
                                  {item.type === 'TRADE' && item.fromTeamName && item.toTeamName && (
                                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                      <span>{item.fromTeamName}</span>
                                      <ArrowLeftRight className="h-3 w-3" />
                                      <span>{item.toTeamName}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {tx.items.length > 10 && (
                              <div className="text-xs text-muted-foreground p-2 text-center bg-secondary/30 rounded">
                                +{tx.items.length - 10} more players
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Related transaction */}
                      {tx.relatedTransactionId && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Related to transaction: {tx.relatedTransactionId.substring(0, 8)}...
                        </div>
                      )}

                      {/* Waiver bid */}
                      {tx.type === 'WAIVER' && tx.bidAmount > 0 && (
                        <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          Bid: ${tx.bidAmount}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default Transactions

