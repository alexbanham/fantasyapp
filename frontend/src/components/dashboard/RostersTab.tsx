import React from 'react'
import { Users } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { DetailedMatchup } from '../../services/api'
import TeamRoster from './TeamRoster'

interface RostersTabProps {
  matchups: DetailedMatchup[]
  week: number | null
  scrollToTeam: number | null
  onScrollComplete: () => void
}

const RostersTab: React.FC<RostersTabProps> = ({
  matchups,
  week,
  scrollToTeam,
  onScrollComplete
}) => {
  // Handle scrolling to a team's roster
  React.useEffect(() => {
    if (scrollToTeam && matchups.length > 0) {
      const matchup = matchups.find(m => 
        m.homeTeam.teamId === scrollToTeam || m.awayTeam.teamId === scrollToTeam
      )
      
      if (matchup) {
        const matchupIdx = matchups.indexOf(matchup)
        const elementId = `matchup-${matchupIdx}-${scrollToTeam}`
        
        setTimeout(() => {
          const element = document.getElementById(elementId)
          if (element) {
            const elementRect = element.getBoundingClientRect()
            const absoluteElementTop = elementRect.top + window.pageYOffset
            const offsetPosition = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2)
            
            window.scrollTo({ 
              top: Math.max(0, offsetPosition), 
              behavior: 'smooth' 
            })
            
            element.classList.add('ring-4', 'ring-blue-500', 'ring-offset-2')
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-blue-500', 'ring-offset-2')
            }, 3000)
          }
          onScrollComplete()
        }, 300)
      }
    }
  }, [scrollToTeam, matchups, onScrollComplete])

  if (!matchups || matchups.length === 0) {
    return (
      <div>
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 flex items-center">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-primary shrink-0" />
            Week {week || 'N/A'} Rosters
          </h2>
        </div>
        <Card>
          <CardContent className="p-8 sm:p-12">
            <div className="text-center text-muted-foreground">
              <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No roster data available for this week</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 flex items-center">
          <Users className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-primary shrink-0" />
          Week {week || 'N/A'} Rosters
        </h2>
      </div>
      <div className="space-y-4 sm:space-y-6">
        {matchups.map((matchup, matchupIdx) => (
          <Card key={matchup.matchupId} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Matchup Header */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/30 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    {matchup.awayTeam.logo && (
                      <img 
                        src={matchup.awayTeam.logo} 
                        alt={matchup.awayTeam.teamName} 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-border/30 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-base sm:text-lg truncate">{matchup.awayTeam.teamName}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {matchup.awayTeam.totalActual.toFixed(2)} pts
                      </p>
                    </div>
                  </div>
                  <div className="px-2 sm:px-4">
                    <span className="text-muted-foreground font-semibold text-xs sm:text-sm">VS</span>
                  </div>
                  <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                    {matchup.homeTeam.logo && (
                      <img 
                        src={matchup.homeTeam.logo} 
                        alt={matchup.homeTeam.teamName} 
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-border/30 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-base sm:text-lg truncate">{matchup.homeTeam.teamName}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {matchup.homeTeam.totalActual.toFixed(2)} pts
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Rosters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                {/* Away Team */}
                <div 
                  id={`matchup-${matchupIdx}-${matchup.awayTeam.teamId}`}
                  className="p-3 sm:p-4 md:p-6 border-r-0 md:border-r border-border/30 last:border-r-0"
                >
                  <TeamRoster
                    team={matchup.awayTeam}
                    variant="inline"
                    size="sm"
                    showTotalScore={false}
                  />
                </div>

                {/* Home Team */}
                <div 
                  id={`matchup-${matchupIdx}-${matchup.homeTeam.teamId}`}
                  className="p-3 sm:p-4 md:p-6 border-t md:border-t-0 border-border/30"
                >
                  <TeamRoster
                    team={matchup.homeTeam}
                    variant="inline"
                    size="sm"
                    showTotalScore={false}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default RostersTab










