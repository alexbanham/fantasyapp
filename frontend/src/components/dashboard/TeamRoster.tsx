import React from 'react'
import { Users, Zap } from 'lucide-react'
import { Badge } from '../ui/badge'
import PlayerRow from './PlayerRow'
import { getPositionLabel } from '../../utils/playerUtils'

interface TeamBoxscore {
  teamId: number
  teamName: string
  logo?: string
  totalActual: number
  totalProjected?: number
  starters: Array<{
    playerId: number
    fullName: string
    position: number
    pointsActual?: number
    pointsProjected?: number
    proTeamId?: string
    hasPlayed?: boolean
    isPlaying?: boolean
    notPlayed?: boolean
  }>
  bench: Array<{
    playerId: number
    fullName: string
    position: number
    pointsActual?: number
    pointsProjected?: number
    proTeamId?: string
    hasPlayed?: boolean
    isPlaying?: boolean
    notPlayed?: boolean
  }>
}

interface TeamRosterProps {
  team: TeamBoxscore
  variant?: 'modal' | 'inline'
  size?: 'sm' | 'md'
  winProbPercent?: number
  isWinning?: boolean
  opponentTotal?: number
  showHeader?: boolean
  showTotalScore?: boolean
  className?: string
}

const TeamRoster: React.FC<TeamRosterProps> = ({
  team,
  variant = 'modal',
  size = 'md',
  winProbPercent,
  isWinning,
  opponentTotal,
  showHeader = true,
  showTotalScore = true,
  className = ''
}) => {
  const displayTeamName = team.teamName || (team.teamId ? `Team ${team.teamId}` : 'Unknown Team')
  const totalDiff = team.totalActual - (team.totalProjected || 0)

  // Variant-specific classes
  const containerClasses = variant === 'modal'
    ? `flex-1 ${className}`
    : className

  const headerSize = variant === 'modal' ? 'text-xl' : 'text-base sm:text-lg'
  const totalScoreSize = variant === 'modal' ? 'text-3xl' : 'text-lg sm:text-xl'

  const getWinProbBadgeClass = (prob: number) => {
    if (prob >= 70) {
      return 'bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/30'
    } else if (prob >= 50) {
      return 'bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] border-[hsl(var(--accent))]/30'
    } else if (prob >= 30) {
      return 'bg-[hsl(var(--accent))]/20 text-[hsl(var(--accent))] border-[hsl(var(--accent))]/30 opacity-75'
    } else {
      return 'bg-[hsl(var(--destructive))]/20 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/30'
    }
  }

  return (
    <div className={containerClasses}>
      {/* Team Header */}
      {showHeader && (
        <div className={variant === 'modal' ? 'mb-4' : 'mb-3 sm:mb-4 pb-2 sm:pb-3 border-b border-border/20'}>
          <div className={`flex items-center ${variant === 'modal' ? 'space-x-3 mb-2' : 'space-x-2 sm:space-x-3'}`}>
            {team.logo && (
              <img
                src={team.logo}
                alt={displayTeamName}
                className={`${variant === 'modal' ? 'w-10 h-10' : 'w-8 h-8 sm:w-10 sm:h-10'} rounded-full object-cover border border-border/30 shrink-0`}
              />
            )}
            <div className="flex-1 min-w-0">
              {variant === 'modal' ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`${headerSize} font-bold ${isWinning ? 'text-[hsl(var(--primary))]' : 'text-foreground'}`}>
                      {displayTeamName}
                    </h3>
                    {winProbPercent !== undefined && (
                      <Badge className={`shrink-0 ${getWinProbBadgeClass(winProbPercent)}`}>
                        {winProbPercent.toFixed(1)}% win
                      </Badge>
                    )}
                  </div>
                  {team.totalProjected && team.totalProjected > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Projected: {team.totalProjected.toFixed(2)} pts
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h4 className={`font-semibold ${headerSize} text-foreground truncate`}>
                    {displayTeamName}
                  </h4>
                  <p className={`${size === 'sm' ? 'text-xs sm:text-sm' : 'text-sm'} text-muted-foreground`}>
                    Total: {team.totalActual.toFixed(2)} pts
                    {team.totalProjected && team.totalProjected > 0 && (
                      <span className="ml-1 sm:ml-2">
                        (Proj: {team.totalProjected.toFixed(2)})
                      </span>
                    )}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Total Score - Modal variant only */}
          {showTotalScore && variant === 'modal' && (
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-[hsl(var(--primary))]/10 to-[hsl(var(--primary))]/5 border border-[hsl(var(--primary))]/20 mt-2">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <div className="text-right">
                <div className={`${totalScoreSize} font-bold text-foreground`}>
                  {team.totalActual.toFixed(2)}
                </div>
                {team.totalProjected && team.totalProjected > 0 && totalDiff !== 0 && (
                  <div className={`text-xs ${totalDiff > 0 ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--destructive))]'}`}>
                    {totalDiff > 0 ? '+' : ''}{totalDiff.toFixed(2)} vs {team.totalProjected.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Starters */}
      <div className={variant === 'modal' ? 'mb-4' : 'mb-3 sm:mb-4'}>
        <div className={`flex items-center ${variant === 'modal' ? 'space-x-2 mb-3' : 'space-x-1.5 sm:space-x-2 mb-2 sm:mb-3'}`}>
          <Users className={`${variant === 'modal' ? 'h-4 w-4' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'} ${variant === 'modal' ? 'text-[hsl(var(--primary))]' : 'text-muted-foreground'}`} />
          <h4 className={`${variant === 'modal' ? 'text-sm' : 'text-[10px] sm:text-xs'} font-semibold ${variant === 'modal' ? 'text-foreground' : 'text-muted-foreground'} uppercase tracking-wide`}>
            Starters
          </h4>
        </div>
        <div className={variant === 'modal' ? 'space-y-2' : 'space-y-1.5 sm:space-y-2'}>
          {team.starters.length > 0 ? (
            team.starters.map((player) => (
              <PlayerRow
                key={player.playerId}
                player={player}
                isStarter={true}
                size={size}
              />
            ))
          ) : (
            <div className={`${variant === 'modal' ? 'text-sm' : 'text-xs sm:text-sm'} text-muted-foreground text-center py-4 border border-border/20 rounded-lg bg-muted/10`}>
              No starters
            </div>
          )}
        </div>
      </div>

      {/* Bench */}
      {team.bench.length > 0 && (
        <div>
          <div className={`flex items-center ${variant === 'modal' ? 'space-x-2 mb-3' : 'space-x-1.5 sm:space-x-2 mb-2 sm:mb-3'}`}>
            <Zap className={`${variant === 'modal' ? 'h-4 w-4' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'} text-muted-foreground`} />
            <h4 className={`${variant === 'modal' ? 'text-sm' : 'text-[10px] sm:text-xs'} font-semibold text-muted-foreground uppercase tracking-wide`}>
              Bench
            </h4>
          </div>
          <div className={variant === 'modal' ? 'space-y-2' : 'space-y-1 sm:space-y-1.5'}>
            {variant === 'modal' ? (
              team.bench.map((player) => (
                <PlayerRow
                  key={player.playerId}
                  player={player}
                  isStarter={false}
                  size={size}
                />
              ))
            ) : (
              // Inline variant uses simpler bench display
              team.bench.map((player, idx) => (
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
                    {player.pointsActual?.toFixed(2) || '0.00'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamRoster

