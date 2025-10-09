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
      <Card className="glass border-border/30 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <div className="text-2xl font-bold text-muted-foreground">Loading...</div>
              <div className="text-sm text-muted-foreground">NFL Season Information</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass border-border/30 mb-6">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <div className="text-3xl font-bold text-primary">
              NFL Week {config.currentWeek} - {config.currentSeason}
            </div>
            <div className="text-sm text-muted-foreground">
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
