import React from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { DetailedMatchup } from '../../services/api'
import TeamRoster from './TeamRoster'
import {
  calculateMatchupWinProbabilities
} from '../../utils/matchupUtils'

interface MatchupModalProps {
  isOpen: boolean
  onClose: () => void
  matchup: DetailedMatchup | null
}

const MatchupModal: React.FC<MatchupModalProps> = ({ isOpen, onClose, matchup }) => {
  if (!isOpen || !matchup) return null

  // Calculate win probabilities using improved logic that handles edge cases
  const { team1WinProb: awayWinProb, team2WinProb: homeWinProb } = calculateMatchupWinProbabilities(
    matchup.awayTeam,
    matchup.homeTeam
  )



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background/95 border border-border/30 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden backdrop-blur-sm ring-1 ring-[hsl(var(--primary))]/10">
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
              <TeamRoster
                team={matchup.awayTeam}
                variant="modal"
                size="md"
                winProbPercent={awayWinProb * 100}
                isWinning={matchup.awayTeam.totalActual > matchup.homeTeam.totalActual}
                className="md:pr-6 md:mr-6 border-border/30"
              />
              
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
              <TeamRoster
                team={matchup.homeTeam}
                variant="modal"
                size="md"
                winProbPercent={homeWinProb * 100}
                isWinning={matchup.homeTeam.totalActual > matchup.awayTeam.totalActual}
                className="md:border-l md:pl-6 md:ml-6 border-border/30"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default MatchupModal

