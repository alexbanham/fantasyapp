import React from 'react'
import { Card, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Users } from 'lucide-react'
import { LeagueMatchup } from '../../services/api'
import { calculateSimpleMatchupWinProbabilities } from '../../utils/matchupUtils'

interface MatchupCardProps {
  matchup: LeagueMatchup
  onTeamClick?: (teamId: number) => void
  onMatchupClick?: (matchupId: number) => void
  showClickHint?: boolean
  variant?: 'default' | 'compact'
}

const getMatchupStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'final': return 'bg-green-100 text-green-800'
    case 'in_progress': return 'bg-blue-100 text-blue-800'
    case 'scheduled': return 'bg-gray-100 text-gray-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getWinProbBadgeClass = (winProbPercent: number) => {
  if (winProbPercent >= 70) {
    return 'bg-green-500/10 text-green-400 border-green-500/20'
  } else if (winProbPercent >= 50) {
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
  } else if (winProbPercent >= 30) {
    return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
  } else {
    return 'bg-red-500/10 text-red-400 border-red-500/20'
  }
}

const MatchupCard: React.FC<MatchupCardProps> = ({
  matchup,
  onTeamClick,
  onMatchupClick,
  showClickHint = false,
  variant = 'default'
}) => {
  // Calculate win probabilities
  const { team1WinProb: awayWinProb, team2WinProb: homeWinProb } = 
    calculateSimpleMatchupWinProbabilities(
      { score: matchup.awayTeam.score || 0, projectedScore: matchup.awayTeam.projectedScore || 0 },
      { score: matchup.homeTeam.score || 0, projectedScore: matchup.homeTeam.projectedScore || 0 }
    )
  
  const awayWinProbPercent = awayWinProb * 100
  const homeWinProbPercent = homeWinProb * 100

  const isClickable = onMatchupClick || onTeamClick
  const hasDetailed = !!onMatchupClick

  // Variant-specific classes
  const cardClasses = variant === 'compact' 
    ? 'hover:shadow-lg transition-all duration-200 active:scale-[0.98]'
    : `cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 ${
        hasDetailed ? 'hover:scale-[1.02] active:scale-[0.98]' : 'opacity-75'
      }`

  const contentPadding = variant === 'compact' ? 'p-3 sm:p-4' : 'p-3 sm:p-4 md:p-5'
  const teamSpacing = variant === 'compact' ? 'space-y-2 sm:space-y-2.5' : 'space-y-2 sm:space-y-3'
  const logoSize = variant === 'compact' 
    ? 'w-7 h-7 sm:w-8 sm:h-8'
    : 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8'
  const scoreSize = variant === 'compact' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
  const nameSize = variant === 'compact' ? 'text-xs sm:text-sm' : 'text-xs sm:text-sm'
  const probBadgeSize = variant === 'compact' ? 'text-[8px] sm:text-[9px]' : 'text-[9px] sm:text-[10px]'
  const projTextSize = variant === 'compact' ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'

  const handleTeamClick = (teamId: number) => {
    if (onTeamClick) {
      onTeamClick(teamId)
    }
  }

  const handleCardClick = () => {
    if (onMatchupClick) {
      onMatchupClick(matchup.matchupId)
    }
  }

  const renderTeam = (team: typeof matchup.awayTeam, isHome: boolean, winProbPercent: number) => {
    const teamClickHandler = onTeamClick ? () => handleTeamClick(team.teamId) : undefined
    const teamClasses = onTeamClick 
      ? 'flex items-center justify-between p-2 rounded-lg hover:bg-accent/50 active:bg-accent/70 transition-colors cursor-pointer'
      : 'flex items-center justify-between'

    return (
      <div className={teamClasses} onClick={teamClickHandler}>
        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-1 min-w-0">
          {team.logo ? (
            <img
              src={team.logo}
              alt={team.teamName}
              className={`${logoSize} rounded-full object-cover shrink-0 ${variant === 'compact' ? 'border border-border/30' : ''}`}
            />
          ) : (
            variant === 'compact' && (
              <div className={`${logoSize} rounded-full bg-gradient-to-br from-primary/20 to-primary/30 border border-border/30 flex items-center justify-center shrink-0`}>
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
              </div>
            )
          )}
          <div className="flex-1 min-w-0">
            {variant === 'compact' ? (
              <>
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <span className={`font-semibold ${nameSize} truncate ${onTeamClick ? 'hover:text-primary transition-colors' : ''}`}>
                    {team.teamName}
                  </span>
                  <Badge 
                    variant="outline"
                    className={`${probBadgeSize} px-1 py-0 shrink-0 ${getWinProbBadgeClass(winProbPercent)}`}
                  >
                    {winProbPercent.toFixed(0)}%
                  </Badge>
                </div>
                <p className={`${projTextSize} text-muted-foreground`}>
                  Proj: {team.projectedScore?.toFixed(1) ?? '0.0'}
                </p>
              </>
            ) : (
              <>
                <span className={`font-semibold ${nameSize} truncate block`}>
                  {team.teamName}
                </span>
                <Badge 
                  variant="outline"
                  className={`${probBadgeSize} px-1 sm:px-1.5 py-0 mt-0.5 ${getWinProbBadgeClass(winProbPercent)}`}
                >
                  {winProbPercent.toFixed(0)}%
                </Badge>
              </>
            )}
          </div>
        </div>
        <div className="text-right shrink-0 ml-2">
          <div className={`${scoreSize} font-bold`}>
            {team.score?.toFixed(1) || '0.0'}
          </div>
          {team.projectedScore > 0 && (
            <div className={projTextSize + ' text-muted-foreground'}>
              Proj: {team.projectedScore.toFixed(1)}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card
      className={cardClasses}
      onClick={onMatchupClick ? handleCardClick : undefined}
    >
      <CardContent className={contentPadding}>
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center space-x-1.5">
            <Badge 
              variant={variant === 'compact' ? 'outline' : (
                matchup.status === 'FINAL' ? 'default' :
                matchup.status === 'IN_PROGRESS' ? 'secondary' :
                'outline'
              )}
              className={`${variant === 'compact' ? getMatchupStatusColor(matchup.status) : ''} ${variant === 'compact' ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'} px-1 sm:px-1.5 py-0`}
            >
              {matchup.status.replace('_', ' ')}
            </Badge>
            {matchup.isPlayoff && (
              <Badge variant="destructive" className={`${variant === 'compact' ? 'text-[9px] sm:text-[10px]' : 'text-[10px] sm:text-xs'} px-1 sm:px-1.5 py-0`}>
                Playoff
              </Badge>
            )}
          </div>
        </div>

        {/* Teams */}
        <div className={teamSpacing}>
          {/* Away Team */}
          {renderTeam(matchup.awayTeam, false, awayWinProbPercent)}

          {/* VS Divider */}
          <div className="flex items-center justify-center py-0.5 sm:py-1">
            <div className="w-full h-px bg-border/30" />
            <span className={`px-1.5 sm:px-2 ${variant === 'compact' ? 'text-[9px] sm:text-[10px] font-semibold' : 'text-[10px] sm:text-xs'} text-muted-foreground`}>
              VS
            </span>
            <div className="w-full h-px bg-border/30" />
          </div>

          {/* Home Team */}
          {renderTeam(matchup.homeTeam, true, homeWinProbPercent)}
        </div>

        {/* Click hint */}
        {showClickHint && hasDetailed && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border/20">
            <div className="text-[10px] sm:text-xs text-center text-muted-foreground">
              Tap to view detailed rosters
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MatchupCard


