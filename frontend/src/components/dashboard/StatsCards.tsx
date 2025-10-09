import React from 'react'
import { Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { PollingStatus } from '../../types/dashboard'

interface StatsCardsProps {
  pollingStatus: PollingStatus
}

const StatsCards: React.FC<StatsCardsProps> = ({
  pollingStatus
}) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Card className="glass border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary">Game Polling Status</CardTitle>
          <Activity className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${pollingStatus.isPolling ? 'text-primary' : 'text-red-200'}`}>
            {pollingStatus.isPolling ? 'Active' : 'Stopped'}
          </div>
          <p className="text-xs text-muted-foreground">
            {pollingStatus.isPolling ? (
              <>Live game data streaming</>
            ) : (
              <>Polling service inactive</>
            )}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default StatsCards
