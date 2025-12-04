import React from 'react'
import { Calendar } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Config } from '../../types/dashboard'

interface NFLWeekDisplayProps {
  config: Config | null
}

const NFLWeekDisplay: React.FC<NFLWeekDisplayProps> = ({ config }) => {
  if (!config) {
    return (
      <Card className="glass border-border/30 mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-muted-foreground">Loading...</div>
              <div className="text-xs sm:text-sm text-muted-foreground">NFL Season Information</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass border-border/30 mb-4 sm:mb-6">
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <Calendar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-primary shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground truncate">
              NFL Week {config.currentWeek} - {config.currentSeason}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {config.isInSeason ? 'Regular Season Active' : 'Off Season'}
              {config.scoringType && ` • ${config.scoringType} Scoring`}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default NFLWeekDisplay
