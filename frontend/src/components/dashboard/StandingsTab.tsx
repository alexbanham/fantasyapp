import React from 'react'
import { Trophy, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { LeagueStanding } from '../../services/api'

interface StandingsTabProps {
  standings: LeagueStanding[]
  onTeamClick: (teamId: number) => void
}

const getStreakIcon = (streak: string) => {
  if (streak.includes('W')) return <TrendingUp className="h-4 w-4 text-green-500" />
  if (streak.includes('L')) return <TrendingDown className="h-4 w-4 text-red-500" />
  return <Minus className="h-4 w-4 text-gray-500" />
}

const StandingsTab: React.FC<StandingsTabProps> = ({ standings, onTeamClick }) => {
  return (
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
            {standings.map((team, index) => (
              <div 
                key={team.teamId}
                className="grid grid-cols-12 gap-2 sm:gap-4 items-center p-3 sm:p-4 hover:bg-accent/50 transition-colors cursor-pointer group active:bg-accent/70 min-w-[800px] sm:min-w-0"
                onClick={() => onTeamClick(team.teamId)}
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
                      <Users className="w-5 h-5 sm:w-6 sm:w-6 text-primary" />
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

                {/* Stats */}
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
  )
}

export default StandingsTab





