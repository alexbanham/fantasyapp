import React from 'react'
import { X, TrendingUp, TrendingDown, Users, Zap, CheckCircle2, Clock, Play } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { DetailedMatchup } from '../../services/api'

interface MatchupModalProps {
  isOpen: boolean
  onClose: () => void
  matchup: DetailedMatchup | null
}

const getPositionLabel = (position: number): string => {
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

const MatchupModal: React.FC<MatchupModalProps> = ({ isOpen, onClose, matchup }) => {
  if (!isOpen || !matchup) return null

  // Calculate expected total for a team based on player game status
  // Matches ESPN's approach: actual for played players, projected for unplayed
  const calculateExpectedTotal = (team: any): number => {
    let expectedTotal = 0
    
    // Sum starter points: actual for played/playing, projected for not played
    team.starters.forEach((player: any) => {
      if (player.hasPlayed || player.isPlaying) {
        // Player has played or is currently playing - use actual points
        expectedTotal += player.pointsActual || 0
      } else {
        // Player hasn't played yet - use projected points
        expectedTotal += player.pointsProjected || 0
      }
    })
    
    return expectedTotal
  }

  // Calculate win probability using logistic function
  // P(win) = 1 / (1 + exp(-k * diff))
  // ESPN uses a much lower sensitivity factor (k=0.02) to match their calculations
  // This creates a gentler curve that matches ESPN's win probability percentages
  const calculateWinProbability = (teamScore: number, opponentScore: number): number => {
    const diff = teamScore - opponentScore
    const k = 0.02 // ESPN's sensitivity factor (validated to match their calculations)
    return 1 / (1 + Math.exp(-k * diff))
  }

  // Calculate expected totals for both teams
  const awayExpectedTotal = calculateExpectedTotal(matchup.awayTeam)
  const homeExpectedTotal = calculateExpectedTotal(matchup.homeTeam)

  // Calculate win probabilities based on expected totals (actual for played, projected for not played)
  const awayWinProb = calculateWinProbability(awayExpectedTotal, homeExpectedTotal)
  const homeWinProb = calculateWinProbability(homeExpectedTotal, awayExpectedTotal)

  const getPlayerStatus = (actual: number, projected: number) => {
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

  const renderPlayerRow = (player: any, isStarter: boolean) => {
    const status = getPlayerStatus(player.pointsActual, player.pointsProjected)
    const hasPlayed = player.hasPlayed === true
    const isPlaying = player.isPlaying === true
    const notPlayed = player.notPlayed === true
    
    return (
      <div
        key={player.playerId}
        className={`flex items-center justify-between p-3 rounded-lg border ${
          isStarter 
            ? 'bg-card/50 border-border/30' 
            : 'bg-muted/20 border-border/10 opacity-60'
        } ${isPlaying ? 'ring-2 ring-green-500/30' : ''}`}
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <Badge variant="outline" className="text-xs shrink-0">
            {getPositionLabel(player.position)}
          </Badge>
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <span className={`font-medium ${isStarter ? 'text-foreground' : 'text-muted-foreground'} truncate`}>
              {player.fullName}
            </span>
            {/* Game Status Icon */}
                {hasPlayed && (
                  <span title="Game completed">
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  </span>
                )}
                {isPlaying && (
                  <span title="Game in progress">
                    <Play className="h-4 w-4 text-green-400 animate-pulse shrink-0" />
                  </span>
                )}
                {notPlayed && (
                  <span title="Game not started">
                    <Clock className="h-4 w-4 text-orange-400 shrink-0" />
                  </span>
                )}
          </div>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0">
          {/* Points Display */}
          <div className="text-right">
            {hasPlayed ? (
              <>
                {/* Show actual points (final) */}
                <div className={`font-bold ${isStarter ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {player.pointsActual.toFixed(2)}
                </div>
                {player.pointsProjected > 0 && (
                  <div className="text-xs text-muted-foreground">
                    of {player.pointsProjected.toFixed(2)}
                  </div>
                )}
              </>
            ) : isPlaying ? (
              <>
                {/* Show actual points (in progress) */}
                <div className={`font-bold text-green-400 ${isStarter ? '' : 'text-muted-foreground'}`}>
                  {player.pointsActual.toFixed(2)}
                </div>
                {player.pointsProjected > 0 && (
                  <div className="text-xs text-muted-foreground">
                    / {player.pointsProjected.toFixed(2)}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Show projected points (not played) */}
                <div className={`font-bold text-orange-400 ${isStarter ? '' : 'text-muted-foreground'}`}>
                  {player.pointsProjected.toFixed(2)}
                </div>
              </>
            )}
          </div>
          
          {/* Boom/Bust Status Badge - Only show if player has played */}
          {status && hasPlayed && (
            <div className="shrink-0">
              {status.type === 'boom' && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{status.percentage.toFixed(0)}%
                </Badge>
              )}
              {status.type === 'bust' && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {status.percentage.toFixed(0)}%
                </Badge>
              )}
              {status.type === 'above' && (
                <Badge variant="outline" className="bg-green-500/10 text-green-300 border-green-500/20">
                  +{status.diff.toFixed(1)}
                </Badge>
              )}
              {status.type === 'below' && (
                <Badge variant="outline" className="bg-red-500/10 text-red-300 border-red-500/20">
                  {status.diff.toFixed(1)}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderTeam = (team: any, isHome: boolean) => {
    const totalDiff = team.totalActual - team.totalProjected
    const isWinning = isHome 
      ? team.totalActual > matchup.awayTeam.totalActual
      : team.totalActual > matchup.homeTeam.totalActual

    // Get win probability for this team
    const winProb = isHome ? homeWinProb : awayWinProb
    const winProbPercent = winProb * 100

    // Ensure we display team name, not team ID
    const displayTeamName = team.teamName || (team.teamId ? `Team ${team.teamId}` : 'Unknown Team')

    return (
      <div className={`flex-1 ${isHome ? 'md:border-l md:pl-6 md:ml-6' : 'md:pr-6 md:mr-6'} border-border/30`}>
        {/* Team Header */}
        <div className="mb-4">
          <div className="flex items-center space-x-3 mb-2">
            {team.logo && (
              <img 
                src={team.logo} 
                alt={displayTeamName} 
                className="w-10 h-10 rounded-full object-cover border border-border/30"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className={`text-xl font-bold ${isWinning ? 'text-green-400' : 'text-foreground'}`}>
                  {displayTeamName}
                </h3>
                {/* Win Probability Badge */}
                <Badge 
                  className={`shrink-0 ${
                    winProbPercent >= 70 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : winProbPercent >= 50
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : winProbPercent >= 30
                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}
                >
                  {winProbPercent.toFixed(1)}% win
                </Badge>
              </div>
              {team.totalProjected > 0 && (
                <p className="text-sm text-muted-foreground">
                  Projected: {team.totalProjected.toFixed(2)} pts
                </p>
              )}
            </div>
          </div>
          
          {/* Total Score */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">
                {team.totalActual.toFixed(2)}
              </div>
              {team.totalProjected > 0 && totalDiff !== 0 && (
                <div className={`text-xs ${totalDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalDiff > 0 ? '+' : ''}{totalDiff.toFixed(2)} vs {team.totalProjected.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Starters */}
        <div className="mb-4">
          <div className="flex items-center space-x-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Starters</h4>
          </div>
          <div className="space-y-2">
            {team.starters.length > 0 ? (
              team.starters.map((player: any) => renderPlayerRow(player, true))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No starters
              </div>
            )}
          </div>
        </div>

        {/* Bench */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-muted-foreground">Bench</h4>
          </div>
          <div className="space-y-2">
            {team.bench.length > 0 ? (
              team.bench.map((player: any) => renderPlayerRow(player, false))
            ) : (
              <div className="text-sm text-muted-foreground/50 text-center py-4">
                No bench players
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background/95 border border-border/30 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden backdrop-blur-sm">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/30 pb-4">
            <CardTitle className="text-2xl">Matchup Details</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Away Team */}
              <div className="flex-1">
                {renderTeam(matchup.awayTeam, false)}
              </div>
              
              {/* VS Divider - Positioned at top between team headers */}
              <div className="flex md:flex-col items-center justify-start my-4 md:my-0 md:pt-0">
                {/* Horizontal line for mobile */}
                <div className="w-full md:hidden h-px bg-border/30 mb-4" />
                {/* VS Badge - aligned at top for desktop */}
                <div className="px-4 py-2 bg-background rounded-full border border-border/30 shrink-0">
                  <span className="text-sm font-semibold text-muted-foreground">VS</span>
                </div>
                {/* Horizontal line for mobile */}
                <div className="w-full md:hidden h-px bg-border/30 mt-4" />
              </div>
              
              {/* Home Team */}
              <div className="flex-1">
                {renderTeam(matchup.homeTeam, true)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MatchupModal

