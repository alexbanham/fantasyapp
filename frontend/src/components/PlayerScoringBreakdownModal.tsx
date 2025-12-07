import { X } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface PlayerStats {
  passingYards?: number
  passingTouchdowns?: number
  passingInterceptions?: number
  rushingYards?: number
  rushingTouchdowns?: number
  receivingYards?: number
  receivingReceptions?: number
  receivingTouchdowns?: number
  lostFumbles?: number
  fieldGoalsMade?: number
  fieldGoalsAttempted?: number
  extraPointsMade?: number
  sacks?: number
  interceptions?: number
  fumbleRecoveries?: number
  defensiveTouchdowns?: number
  pointsAllowed?: number
  yardsAllowed?: number
}

interface PlayerScoringBreakdownModalProps {
  isOpen: boolean
  onClose: () => void
  player: {
    name: string
    position: string
    fantasyPoints: number
    stats?: PlayerStats
  } | null
}

const PlayerScoringBreakdownModal = ({ isOpen, onClose, player }: PlayerScoringBreakdownModalProps) => {
  if (!player) return null

  const calculatePointsFromStats = (stats: PlayerStats): Array<{ label: string; value: number; points: number }> => {
    const breakdown: Array<{ label: string; value: number; points: number }> = []

    // Passing stats (PPR scoring)
    if (stats.passingYards !== undefined && stats.passingYards > 0) {
      breakdown.push({
        label: 'Passing Yards',
        value: stats.passingYards,
        points: stats.passingYards * 0.04
      })
    }
    if (stats.passingTouchdowns !== undefined && stats.passingTouchdowns > 0) {
      breakdown.push({
        label: 'Passing TDs',
        value: stats.passingTouchdowns,
        points: stats.passingTouchdowns * 4
      })
    }
    if (stats.passingInterceptions !== undefined && stats.passingInterceptions > 0) {
      breakdown.push({
        label: 'Interceptions',
        value: stats.passingInterceptions,
        points: stats.passingInterceptions * -2
      })
    }

    // Rushing stats
    if (stats.rushingYards !== undefined && stats.rushingYards > 0) {
      breakdown.push({
        label: 'Rushing Yards',
        value: stats.rushingYards,
        points: stats.rushingYards * 0.1
      })
    }
    if (stats.rushingTouchdowns !== undefined && stats.rushingTouchdowns > 0) {
      breakdown.push({
        label: 'Rushing TDs',
        value: stats.rushingTouchdowns,
        points: stats.rushingTouchdowns * 6
      })
    }

    // Receiving stats (PPR)
    if (stats.receivingReceptions !== undefined && stats.receivingReceptions > 0) {
      breakdown.push({
        label: 'Receptions',
        value: stats.receivingReceptions,
        points: stats.receivingReceptions * 1
      })
    }
    if (stats.receivingYards !== undefined && stats.receivingYards > 0) {
      breakdown.push({
        label: 'Receiving Yards',
        value: stats.receivingYards,
        points: stats.receivingYards * 0.1
      })
    }
    if (stats.receivingTouchdowns !== undefined && stats.receivingTouchdowns > 0) {
      breakdown.push({
        label: 'Receiving TDs',
        value: stats.receivingTouchdowns,
        points: stats.receivingTouchdowns * 6
      })
    }

    // Fumbles
    if (stats.lostFumbles !== undefined && stats.lostFumbles > 0) {
      breakdown.push({
        label: 'Lost Fumbles',
        value: stats.lostFumbles,
        points: stats.lostFumbles * -2
      })
    }

    // Kicker stats
    if (stats.fieldGoalsMade !== undefined && stats.fieldGoalsMade > 0) {
      breakdown.push({
        label: 'Field Goals Made',
        value: stats.fieldGoalsMade,
        points: stats.fieldGoalsMade * 3 // Simplified - actual scoring varies by distance
      })
    }
    if (stats.extraPointsMade !== undefined && stats.extraPointsMade > 0) {
      breakdown.push({
        label: 'Extra Points',
        value: stats.extraPointsMade,
        points: stats.extraPointsMade * 1
      })
    }

    // D/ST stats (simplified - actual D/ST scoring is more complex)
    if (stats.sacks !== undefined && stats.sacks > 0) {
      breakdown.push({
        label: 'Sacks',
        value: stats.sacks,
        points: stats.sacks * 1
      })
    }
    if (stats.interceptions !== undefined && stats.interceptions > 0) {
      breakdown.push({
        label: 'Interceptions',
        value: stats.interceptions,
        points: stats.interceptions * 2
      })
    }
    if (stats.fumbleRecoveries !== undefined && stats.fumbleRecoveries > 0) {
      breakdown.push({
        label: 'Fumble Recoveries',
        value: stats.fumbleRecoveries,
        points: stats.fumbleRecoveries * 2
      })
    }
    if (stats.defensiveTouchdowns !== undefined && stats.defensiveTouchdowns > 0) {
      breakdown.push({
        label: 'Defensive TDs',
        value: stats.defensiveTouchdowns,
        points: stats.defensiveTouchdowns * 6
      })
    }

    return breakdown
  }

  const stats = player.stats || {}
  const breakdown = calculatePointsFromStats(stats)
  const calculatedTotal = breakdown.reduce((sum, item) => sum + item.points, 0)
  const hasStats = breakdown.length > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background/95 border border-border/30 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden backdrop-blur-sm ring-1 ring-[hsl(var(--primary))]/10">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/30 pb-4">
            <CardTitle className="text-xl sm:text-2xl">Scoring Breakdown: {player.name}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>

          <CardContent className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Total Fantasy Points</p>
                  <p className="text-3xl font-bold">{player.fantasyPoints.toFixed(2)}</p>
                </div>
                <Badge variant="secondary" className="text-lg">
                  {player.position}
                </Badge>
              </div>

              {hasStats ? (
                <>
                  <Card className="p-4">
                    <h3 className="text-lg font-semibold mb-3">Point Breakdown</h3>
                    <div className="space-y-2">
                      {breakdown.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-background rounded border"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{item.label}</span>
                            <span className="text-sm text-muted-foreground">
                              ({item.value.toLocaleString()})
                            </span>
                          </div>
                          <span
                            className={`font-bold ${
                              item.points >= 0 ? 'text-green-500' : 'text-red-500'
                            }`}
                          >
                            {item.points >= 0 ? '+' : ''}
                            {item.points.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>

                  {Math.abs(calculatedTotal - player.fantasyPoints) > 0.1 && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-sm text-yellow-600 dark:text-yellow-400">
                        <strong>Note:</strong> Calculated total ({calculatedTotal.toFixed(2)}) may differ from
                        actual points ({player.fantasyPoints.toFixed(2)}) due to scoring bonuses, special
                        rules, or incomplete stat data.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Detailed scoring breakdown is not available for this player.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Total points: {player.fantasyPoints.toFixed(2)}
                  </p>
                </Card>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default PlayerScoringBreakdownModal

