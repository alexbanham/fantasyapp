import React from 'react'
import { Calendar } from 'lucide-react'
import { Badge } from '../ui/badge'
import { LeagueMatchup } from '../../services/api'
import MatchupCard from './MatchupCard'

interface MatchupsTabProps {
  matchups: LeagueMatchup[]
  week: number
  selectedWeek: number | null
  currentWeek: number | null
  onTeamClick: (teamId: number) => void
}

const MatchupsTab: React.FC<MatchupsTabProps> = ({
  matchups,
  week,
  selectedWeek,
  currentWeek,
  onTeamClick
}) => {
  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 flex items-center">
          <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-primary shrink-0" />
          Week {week} Matchups
        </h2>
        <div className="flex items-center space-x-2">
          {selectedWeek && selectedWeek < (currentWeek || 0) && (
            <Badge variant="outline" className="text-xs">Completed</Badge>
          )}
          {selectedWeek && selectedWeek === currentWeek && (
            <Badge variant="secondary" className="text-xs">Current</Badge>
          )}
          {selectedWeek && selectedWeek > (currentWeek || 0) && (
            <Badge variant="outline" className="text-xs">Upcoming</Badge>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {matchups.length === 0 ? (
          <div className="col-span-full">
            <div className="text-center text-muted-foreground py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No matchups found for this week</p>
            </div>
          </div>
        ) : (
          matchups.map((matchup) => (
            <MatchupCard
              key={matchup.matchupId}
              matchup={matchup}
              onTeamClick={onTeamClick}
              variant="compact"
            />
          ))
        )}
      </div>
    </div>
  )
}

export default MatchupsTab


