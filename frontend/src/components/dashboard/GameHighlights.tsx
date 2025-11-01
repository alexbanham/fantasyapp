import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '../ui/card'
import { Trophy, TrendingUp, Zap, Flame, Users, Target } from 'lucide-react'
import { getTeamLogoWithFallback } from '../../lib/teamLogos'
import { getGameHighlights } from '../../services/api'

interface ImpactfulBoomBust {
  espn_id: string
  name: string
  position: string
  pro_team_id?: string
  headshot_url?: string
  week: number
  actualPoints: number
  projectedPoints: number
  overProjection: number
  percentageOver: number
  roster_status: string
  fantasy_team_name?: string | null
  fantasy_team_id?: number
  opponent_team_name?: string
  opponent_team_id?: number
  winProbImpact: number
  projectedTotalImpact?: number // Impact on team's projected total as percentage
  playerImpactPoints?: number // Raw point impact
  isBoom: boolean
  projectedWinProb: number
  actualWinProb: number
}

interface Highlight {
  week: number
  season: number
  data: {
    topScorers: TopScorer[]
    upsets: GameUpset[]
    boomingPlayers: BoomingPlayer[]
    bustingPlayers: BoomingPlayer[]
    impactfulBoomsBusts: ImpactfulBoomBust[]
  }
}

interface TopScorer {
  espn_id: string
  name: string
  position: string
  pro_team_id?: string
  headshot_url?: string
  week: number
  points: number
  roster_status: string
  fantasy_team_name?: string | null
}

interface GamePlayer {
  espn_id: string
  name: string
  position: string
  pro_team_id?: string
  headshot_url?: string
  points: number
  roster_status: string
  fantasy_team_name?: string | null
}

interface GameUpset {
  eventId: string
  awayTeam: {
    abbreviation: string
    name: string
    score: number
  }
  homeTeam: {
    abbreviation: string
    name: string
    score: number
  }
  scoreDiff: number
  winner: string
  week: number
  season: number
  awayTopPlayers?: GamePlayer[]
  homeTopPlayers?: GamePlayer[]
}

interface BoomingPlayer {
  espn_id: string
  name: string
  position: string
  pro_team_id?: string
  headshot_url?: string
  week: number
  actualPoints: number
  projectedPoints: number
  overProjection: number
  percentageOver: number
  roster_status: string
  fantasy_team_name?: string | null
}

interface GameHighlightsProps {
  className?: string
  week?: number
  season?: number
}

const GameHighlights: React.FC<GameHighlightsProps> = ({ className = '', week, season }) => {
  const [highlights, setHighlights] = useState<Highlight | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHighlights = async () => {
      try {
        setIsLoading(true)
        const response = await getGameHighlights(week, season)
        
        if (response.success) {
          setHighlights(response)
          setError(null)
        } else {
          setError(response.error || 'Failed to fetch highlights')
        }
      } catch (err) {
        setError('Failed to load game highlights')
      } finally {
        setIsLoading(false)
      }
    }

    fetchHighlights()
  }, [week, season])

  if (isLoading) {
    return (
      <Card className={`glass border-border/30 ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Trophy className="h-5 w-5 animate-pulse text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Loading highlights...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !highlights) {
    return (
      <Card className={`glass border-border/30 ${className}`}>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{error || 'No highlights available'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`glass border-border/30 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="relative bg-gradient-to-r from-charcoal-900/50 via-slate-900/50 to-zinc-900/50 border-b border-border/20">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/5 via-orange-600/5 to-red-600/5"></div>
        <div className="relative p-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
              <Trophy className="h-5 w-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-charcoal-200 via-slate-200 to-zinc-200 bg-clip-text text-transparent">
                Game Highlights
              </h3>
              <p className="text-xs text-muted-foreground">Week {highlights.week} • Top performers & notable games</p>
            </div>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        {/* Compact Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column 1: Top Scorers and Projections */}
          <div className="space-y-4">
            {/* Top Fantasy Scorers */}
            {highlights.data.topScorers && highlights.data.topScorers.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="h-4 w-4 text-orange-400" />
                  <h4 className="text-xs font-semibold text-foreground">Top Scorers</h4>
                </div>
              <div className="space-y-1.5">
              {highlights.data.topScorers.map((player, index) => (
                <div 
                  key={`${player.espn_id}-${player.week}`}
                  className="flex items-center justify-between p-2 rounded-lg border border-border/20 bg-gradient-to-r from-orange-500/5 to-yellow-500/5 hover:from-orange-500/10 hover:to-yellow-500/10 transition-all"
                >
                  <div className="flex items-center space-x-2 flex-1">
                    {/* Rank Badge */}
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30 text-yellow-300' :
                      index === 1 ? 'bg-gradient-to-br from-slate-500/30 to-zinc-500/30 text-slate-300' :
                      'bg-gradient-to-br from-orange-500/20 to-red-500/20 text-orange-300'
                    }`}>
                      {index + 1}
                    </div>

                    {/* Player Info */}
                    <div className="flex items-center space-x-1.5 flex-1">
                      {/* D/ST players: use team logo */}
                      {(player.position === 'DST' || player.position === 'D/ST') && player.pro_team_id ? (
                        <img 
                          src={getTeamLogoWithFallback(player.pro_team_id)} 
                          alt={player.name}
                          className="w-6 h-6 rounded-full object-cover border border-border/30"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = '<div class="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 flex items-center justify-center"><span class="text-[10px] font-bold text-orange-300">' + player.name.charAt(0) + '</span></div>';
                            }
                          }}
                        />
                      ) : player.headshot_url ? (
                        <img 
                          src={player.headshot_url} 
                          alt={player.name}
                          className="w-6 h-6 rounded-full object-cover border border-border/30"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-orange-300">{player.name.charAt(0)}</span>
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-semibold text-foreground truncate">{player.name}</span>
                          <span className="text-[10px] text-muted-foreground">{player.position}</span>
                        </div>
                        {player.fantasy_team_name && (
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {player.fantasy_team_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="flex items-center bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20 ml-1">
                    <span className="text-xs font-bold text-green-400">{player.points.toFixed(1)}</span>
                  </div>
                </div>
              ))}
                </div>
              </div>
            )}

            {/* Booms */}
            {highlights.data.boomingPlayers && highlights.data.boomingPlayers.length > 0 && (
              <div>
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <h4 className="text-xs font-semibold text-foreground">Booms</h4>
              </div>
              <div className="space-y-1.5">
                {highlights.data.boomingPlayers.map((player) => (
                  <div 
                    key={`boom-${player.espn_id}`}
                    className="flex items-center justify-between p-2 rounded-lg border border-border/20 bg-gradient-to-r from-green-500/5 to-emerald-500/5 hover:from-green-500/10 hover:to-emerald-500/10 transition-all"
                  >
                    <div className="flex items-center space-x-2 flex-1">
                      <div className="p-1 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30">
                        <Zap className="h-3 w-3 text-green-400" />
                      </div>

                      <div className="flex items-center space-x-1.5 flex-1">
                        {/* D/ST players: use team logo */}
                        {(player.position === 'DST' || player.position === 'D/ST') && player.pro_team_id ? (
                          <img 
                            src={getTeamLogoWithFallback(player.pro_team_id)} 
                            alt={player.name}
                            className="w-6 h-6 rounded-full object-cover border border-border/30"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = '<div class="w-6 h-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center"><span class="text-[10px] font-bold text-green-300">' + player.name.charAt(0) + '</span></div>';
                              }
                            }}
                          />
                        ) : player.headshot_url ? (
                          <img 
                            src={player.headshot_url} 
                            alt={player.name}
                            className="w-6 h-6 rounded-full object-cover border border-border/30"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-green-300">{player.name.charAt(0)}</span>
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-semibold text-foreground truncate">{player.name}</span>
                            <span className="text-[10px] text-muted-foreground">{player.position}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 text-[10px] text-muted-foreground">
                            <span>{player.actualPoints.toFixed(1)}</span>
                            <span className="line-through">{player.projectedPoints.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20 ml-1">
                      <span className="text-xs font-bold text-green-400">+{player.percentageOver.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            )}

            {/* Busts */}
            {highlights.data.bustingPlayers && highlights.data.bustingPlayers.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-red-400 rotate-180" />
                  <h4 className="text-xs font-semibold text-foreground">Busts</h4>
                </div>
                <div className="space-y-1.5">
                  {highlights.data.bustingPlayers.map((player) => (
                    <div 
                      key={`bust-${player.espn_id}`}
                      className="flex items-center justify-between p-2 rounded-lg border border-border/20 bg-gradient-to-r from-red-500/5 to-orange-500/5 hover:from-red-500/10 hover:to-orange-500/10 transition-all"
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <div className="p-1 rounded-full bg-gradient-to-br from-red-500/30 to-orange-500/30">
                          <Zap className="h-3 w-3 text-red-400 rotate-180" />
                        </div>

                        <div className="flex items-center space-x-1.5 flex-1">
                          {/* D/ST players: use team logo */}
                          {(player.position === 'DST' || player.position === 'D/ST') && player.pro_team_id ? (
                            <img 
                              src={getTeamLogoWithFallback(player.pro_team_id)} 
                              alt={player.name}
                              className="w-6 h-6 rounded-full object-cover border border-border/30"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = '<div class="w-6 h-6 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center"><span class="text-[10px] font-bold text-red-300">' + player.name.charAt(0) + '</span></div>';
                                }
                              }}
                            />
                          ) : player.headshot_url ? (
                            <img 
                              src={player.headshot_url} 
                              alt={player.name}
                              className="w-6 h-6 rounded-full object-cover border border-border/30"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-red-300">{player.name.charAt(0)}</span>
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1">
                              <span className="text-xs font-semibold text-foreground truncate">{player.name}</span>
                              <span className="text-[10px] text-muted-foreground">{player.position}</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-[10px] text-muted-foreground">
                              <span>{player.actualPoints.toFixed(1)}</span>
                              <span className="text-red-400">vs</span>
                              <span>{player.projectedPoints.toFixed(1)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20 ml-1">
                        <span className="text-xs font-bold text-red-400">-{Math.abs(((player.actualPoints - player.projectedPoints) / player.projectedPoints * 100)).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Impactful Booms/Busts */}
            {highlights.data.impactfulBoomsBusts && highlights.data.impactfulBoomsBusts.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="h-4 w-4 text-purple-400" />
                  <h4 className="text-xs font-semibold text-foreground">Impactful Booms / Busts</h4>
                </div>
                <div className="space-y-1.5">
                  {highlights.data.impactfulBoomsBusts.map((player) => (
                    <div 
                      key={`impact-${player.espn_id}`}
                      className={`p-2 rounded-lg border border-border/20 ${
                        player.isBoom 
                          ? 'bg-gradient-to-r from-green-500/5 to-emerald-500/5' 
                          : 'bg-gradient-to-r from-red-500/5 to-orange-500/5'
                      }`}
                    >
                      {/* Player Info */}
                      <div className="flex items-center space-x-2 mb-2">
                        {/* D/ST players: use team logo */}
                        {(player.position === 'DST' || player.position === 'D/ST') && player.pro_team_id ? (
                          <img 
                            src={getTeamLogoWithFallback(player.pro_team_id)} 
                            alt={player.name}
                            className="w-6 h-6 rounded-full object-cover border border-border/30"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<div class="w-6 h-6 rounded-full border flex items-center justify-center ${
                                  player.isBoom 
                                    ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30' 
                                    : 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30'
                                }"><span class="text-[10px] font-bold">${player.name.charAt(0)}</span></div>`;
                              }
                            }}
                          />
                        ) : player.headshot_url ? (
                          <img 
                            src={player.headshot_url} 
                            alt={player.name}
                            className="w-6 h-6 rounded-full object-cover border border-border/30"
                          />
                        ) : (
                          <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                            player.isBoom 
                              ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30' 
                              : 'bg-gradient-to-br from-red-500/20 to-orange-500/20 border-red-500/30'
                          }`}>
                            <span className="text-[10px] font-bold">{player.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs font-semibold text-foreground truncate">{player.name}</span>
                            <span className="text-[10px] text-muted-foreground">{player.position}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {player.fantasy_team_name}
                          </div>
                        </div>
                      </div>
                      
                      {/* Matchup Info */}
                      <div className="mb-2 pt-2 border-t border-border/20">
                        <div className="text-[10px] text-muted-foreground mb-1.5">vs {player.opponent_team_name}</div>
                        
                        {/* Win Probability Impact */}
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">
                            Win %: {player.projectedWinProb.toFixed(1)}% → {player.actualWinProb.toFixed(1)}%
                          </span>
                          <span className={`font-semibold ${
                            player.winProbImpact > 0 
                              ? 'text-green-400' 
                              : 'text-red-400'
                          }`}>
                            {(player.winProbImpact > 0 ? '+' : '') + player.winProbImpact.toFixed(1)}% win prob
                          </span>
                        </div>
                        
                        {/* Projected Total Impact (if available) */}
                        {player.projectedTotalImpact !== undefined && (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-muted-foreground">
                              Team Impact:
                            </span>
                            <span className={`font-semibold ${
                              player.projectedTotalImpact > 0 
                                ? 'text-green-400' 
                                : 'text-red-400'
                            }`}>
                              {(player.projectedTotalImpact > 0 ? '+' : '') + player.projectedTotalImpact.toFixed(1)}% of projected
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Points */}
                      <div className="flex items-center justify-between text-[10px]">
                        <div className="flex items-center space-x-1 text-muted-foreground">
                          <span>{player.actualPoints.toFixed(1)}</span>
                          <span className="line-through">{player.projectedPoints.toFixed(1)}</span>
                        </div>
                        <span className={`font-semibold ${
                          player.isBoom ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {player.percentageOver > 0 ? '+' : ''}{player.percentageOver.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Column 3: Notable Games */}
          {highlights.data.upsets && highlights.data.upsets.length > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Flame className="h-4 w-4 text-red-400" />
                <h4 className="text-xs font-semibold text-foreground">Notable Games</h4>
              </div>
              <div className="space-y-2">
                {highlights.data.upsets.map((game) => (
                  <div 
                    key={game.eventId}
                    className="p-2 rounded-lg border border-border/20 bg-gradient-to-r from-red-500/5 to-orange-500/5"
                  >
                    {/* Scores */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5">
                        <img src={getTeamLogoWithFallback(game.awayTeam.abbreviation)} alt={game.awayTeam.abbreviation} className="w-4 h-4" />
                        <span className="text-xs font-semibold">{game.awayTeam.abbreviation}</span>
                      </div>
                      <span className="text-base font-bold">{game.awayTeam.score}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1.5">
                        <img src={getTeamLogoWithFallback(game.homeTeam.abbreviation)} alt={game.homeTeam.abbreviation} className="w-4 h-4" />
                        <span className="text-xs font-semibold">{game.homeTeam.abbreviation}</span>
                      </div>
                      <span className="text-base font-bold">{game.homeTeam.score}</span>
                    </div>
                    
                    {/* Top Players */}
                    {(game.awayTopPlayers && game.awayTopPlayers.length > 0) || (game.homeTopPlayers && game.homeTopPlayers.length > 0) ? (
                      <div className="mt-2 pt-2 border-t border-border/20 space-y-1">
                        <div className="text-[10px] text-muted-foreground mb-1">Top Players:</div>
                        <div className="grid grid-cols-2 gap-1">
                          {game.awayTopPlayers && game.awayTopPlayers.slice(0, 2).map((p, i) => (
                            <div key={i} className="flex items-center space-x-1 text-[10px]">
                              <span className="truncate">{p.name}</span>
                              <span className="text-green-400 font-semibold">{p.points.toFixed(1)}</span>
                            </div>
                          ))}
                          {game.homeTopPlayers && game.homeTopPlayers.slice(0, 2).map((p, i) => (
                            <div key={i} className="flex items-center space-x-1 text-[10px]">
                              <span className="truncate">{p.name}</span>
                              <span className="text-green-400 font-semibold">{p.points.toFixed(1)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    
                    <div className="mt-2 pt-1 border-t border-border/10">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">W{game.week}</span>
                        <span className="text-red-400 font-semibold">+{game.scoreDiff}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {(!highlights.data.topScorers || highlights.data.topScorers.length === 0) &&
         (!highlights.data.upsets || highlights.data.upsets.length === 0) &&
         (!highlights.data.boomingPlayers || highlights.data.boomingPlayers.length === 0) &&
         (!highlights.data.bustingPlayers || highlights.data.bustingPlayers.length === 0) &&
         (!highlights.data.impactfulBoomsBusts || highlights.data.impactfulBoomsBusts.length === 0) && (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">No highlights available yet</p>
            <p className="text-xs text-muted-foreground/70">Check back after games are played</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default GameHighlights

