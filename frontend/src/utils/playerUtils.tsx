import React from 'react'
import { Badge } from '../components/ui/badge'
import { TrendingUp, TrendingDown, CheckCircle2, Clock, Play } from 'lucide-react'
import { getTeamLogoWithFallback } from '../lib/teamLogos'

export interface PlayerStatus {
  type: 'boom' | 'bust' | 'above' | 'below'
  diff: number
  percentage: number
}

export interface PlayerGameStatus {
  hasPlayed: boolean
  isPlaying: boolean
  notPlayed: boolean
}

/**
 * Calculate player performance status compared to projection
 * @param actual - Actual points scored
 * @param projected - Projected points
 * @returns PlayerStatus object or null if no significant difference
 */
export const calculatePlayerStatus = (actual: number, projected: number): PlayerStatus | null => {
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

/**
 * Get position label from position number
 * @param position - Position number from ESPN API
 * @returns Position abbreviation string
 */
export const getPositionLabel = (position: number): string => {
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

/**
 * Get game status from player data
 * @param player - Player object with game status flags
 * @returns PlayerGameStatus object
 */
export const getPlayerGameStatus = (player: any): PlayerGameStatus => {
  return {
    hasPlayed: player.hasPlayed === true,
    isPlaying: player.isPlaying === true,
    notPlayed: player.notPlayed === true
  }
}

/**
 * Render game status icon for a player
 * @param status - PlayerGameStatus object
 * @param className - Additional CSS classes
 * @returns React element with status icon
 */
export const renderGameStatusIcon = (status: PlayerGameStatus, className: string = 'h-4 w-4 shrink-0'): React.ReactNode => {
  if (status.hasPlayed) {
    return (
      <span title="Game completed">
        <CheckCircle2 className={`${className} text-[hsl(var(--primary))] opacity-80`} />
      </span>
    )
  }
  if (status.isPlaying) {
    return (
      <span title="Game in progress">
        <Play className={`${className} text-[hsl(var(--primary))] animate-pulse`} />
      </span>
    )
  }
  if (status.notPlayed) {
    return (
      <span title="Game not started">
        <Clock className={`${className} text-[hsl(var(--accent))] opacity-80`} />
      </span>
    )
  }
  return null
}

/**
 * Render performance status badge
 * @param status - PlayerStatus object
 * @param size - Badge size ('sm' | 'md')
 * @returns React element with status badge
 */
export const renderPerformanceBadge = (status: PlayerStatus, size: 'sm' | 'md' = 'md'): React.ReactNode => {
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'
  
  if (status.type === 'boom') {
    return (
      <Badge className={`bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/30 ${sizeClasses}`}>
        <TrendingUp className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} mr-0.5`} />
        +{status.percentage.toFixed(0)}%
      </Badge>
    )
  }
  
  if (status.type === 'bust') {
    return (
      <Badge className={`bg-[hsl(var(--destructive))]/20 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/30 ${sizeClasses}`}>
        <TrendingDown className={`${size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} mr-0.5`} />
        {status.percentage.toFixed(0)}%
      </Badge>
    )
  }
  
  if (status.type === 'above') {
    return (
      <Badge variant="outline" className={`bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/20 ${sizeClasses}`}>
        +{status.diff.toFixed(1)}
      </Badge>
    )
  }
  
  if (status.type === 'below') {
    return (
      <Badge variant="outline" className={`bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]/20 ${sizeClasses}`}>
        {status.diff.toFixed(1)}
      </Badge>
    )
  }
  
  return null
}

/**
 * Render NFL team badge with logo
 * @param proTeamId - NFL team ID
 * @param size - Badge size ('sm' | 'md')
 * @returns React element with team badge
 */
export const renderTeamBadge = (proTeamId: string, size: 'sm' | 'md' = 'md'): React.ReactNode => {
  if (!proTeamId) return null
  
  const logoSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]'
  
  return (
    <Badge variant="outline" className={`${textSize} px-1 py-0 shrink-0 border-border/30 bg-background/50`}>
      <img 
        src={getTeamLogoWithFallback(proTeamId)} 
        alt={proTeamId}
        className={`${logoSize} mr-0.5 rounded-sm`}
        onError={(e) => {
          const target = e.target as HTMLImageElement
          target.style.display = 'none'
          if (target.parentElement) {
            target.parentElement.innerHTML = proTeamId || ''
          }
        }}
      />
      {proTeamId}
    </Badge>
  )
}










