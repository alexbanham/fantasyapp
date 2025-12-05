import React from 'react'
import { Badge } from '../ui/badge'
import {
  getPositionLabel,
  calculatePlayerStatus,
  getPlayerGameStatus,
  renderGameStatusIcon,
  renderPerformanceBadge,
  renderTeamBadge
} from '../../utils/playerUtils'

interface PlayerRowProps {
  player: {
    playerId: number
    fullName: string
    position: number
    pointsActual?: number
    pointsProjected?: number
    proTeamId?: string
    hasPlayed?: boolean
    isPlaying?: boolean
    notPlayed?: boolean
  }
  isStarter: boolean
  size?: 'sm' | 'md'
  showTeamBadge?: boolean
  className?: string
}

const PlayerRow: React.FC<PlayerRowProps> = ({
  player,
  isStarter,
  size = 'md',
  showTeamBadge = true,
  className = ''
}) => {
  const status = calculatePlayerStatus(player.pointsActual || 0, player.pointsProjected || 0)
  const gameStatus = getPlayerGameStatus(player)
  
  // Size-based classes
  const padding = size === 'sm' ? 'p-2 sm:p-2.5' : 'p-3'
  const nameSize = size === 'sm' ? 'text-xs sm:text-sm' : 'text-sm'
  const badgeSize = size === 'sm' ? 'text-[10px] sm:text-xs' : 'text-xs'
  const pointsSize = size === 'sm' ? 'text-xs sm:text-sm' : 'text-sm'
  const pointsSubSize = size === 'sm' ? 'text-[9px] sm:text-[10px]' : 'text-xs'
  const iconSize = size === 'sm' ? 'h-3 w-3 sm:h-3.5 sm:w-3.5' : 'h-4 w-4'
  const teamBadgeSize = size === 'sm' ? 'sm' : 'md'
  
  const baseClasses = `flex items-center justify-between rounded-lg border transition-colors ${
    isStarter 
      ? 'bg-card/50 border-border/30 hover:bg-card/70' 
      : 'bg-muted/20 border-border/10 opacity-60 hover:opacity-75'
  } ${gameStatus.isPlaying ? 'ring-2 ring-[hsl(var(--primary))]/30' : ''} ${className}`
  
  return (
    <div className={`${baseClasses} ${padding}`}>
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Badge variant="outline" className={`${badgeSize} shrink-0 border-border/30`}>
          {getPositionLabel(player.position)}
        </Badge>
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <span className={`font-medium ${nameSize} ${isStarter ? 'text-foreground' : 'text-muted-foreground'} truncate`}>
            {player.fullName}
          </span>
          {/* NFL Team Badge */}
          {showTeamBadge && player.proTeamId && (
            <span className={size === 'sm' ? 'hidden xs:inline-flex' : 'inline-flex'}>
              {renderTeamBadge(player.proTeamId, teamBadgeSize)}
            </span>
          )}
          {/* Game Status Icon */}
          {renderGameStatusIcon(gameStatus, iconSize)}
        </div>
      </div>
      
      <div className="flex items-center space-x-3 shrink-0">
        {/* Points Display */}
        <div className="text-right">
          {gameStatus.hasPlayed ? (
            <>
              <div className={`font-bold ${pointsSize} ${isStarter ? 'text-foreground' : 'text-muted-foreground'}`}>
                {player.pointsActual?.toFixed(2) || '0.00'}
              </div>
              {player.pointsProjected && player.pointsProjected > 0 && (
                <div className={`${pointsSubSize} text-muted-foreground`}>
                  of {player.pointsProjected.toFixed(2)}
                </div>
              )}
            </>
          ) : gameStatus.isPlaying ? (
            <>
              <div className={`font-bold ${pointsSize} text-[hsl(var(--primary))] ${isStarter ? '' : 'text-muted-foreground'}`}>
                {player.pointsActual?.toFixed(2) || '0.00'}
              </div>
              {player.pointsProjected && player.pointsProjected > 0 && (
                <div className={`${pointsSubSize} text-muted-foreground`}>
                  / {player.pointsProjected.toFixed(2)}
                </div>
              )}
            </>
          ) : (
            <>
              <div className={`font-bold ${pointsSize} text-[hsl(var(--accent))] ${isStarter ? '' : 'text-muted-foreground'}`}>
                {player.pointsProjected?.toFixed(2) || '0.00'}
              </div>
            </>
          )}
        </div>
        
        {/* Performance Status Badge - Only show if player has played */}
        {status && gameStatus.hasPlayed && (
          <div className="shrink-0">
            {renderPerformanceBadge(status, size)}
          </div>
        )}
      </div>
    </div>
  )
}

export default PlayerRow

