import React from 'react'
import { Power, PowerOff, Activity } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { PollingStatus } from '../../types/dashboard'

interface GamePollingControlProps {
  pollingStatus: PollingStatus
  configEnabled: boolean
  onToggleConfig: (enabled: boolean) => void
}

const GamePollingControl: React.FC<GamePollingControlProps> = ({
  pollingStatus,
  configEnabled,
  onToggleConfig
}) => {
  return (
    <Card className="glass border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Game Polling Service
        </CardTitle>
        <CardDescription>Control live game data updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Service Control Button */}
          <Button 
            variant={configEnabled ? "default" : "outline"} 
            onClick={() => onToggleConfig(!configEnabled)}
            className="w-full"
            size="lg"
          >
            {configEnabled ? (
              <>
                <PowerOff className="h-5 w-5 mr-2" />
                Stop Polling
              </>
            ) : (
              <>
                <Power className="h-5 w-5 mr-2" />
                Start Polling
              </>
            )}
          </Button>
          
          {/* Status Information */}
          <div className="space-y-2">
            <div className={`text-lg font-semibold ${configEnabled ? 'text-primary' : 'text-muted-foreground'}`}>
              {configEnabled ? 'Polling Active' : 'Polling Inactive'}
            </div>
            
            {pollingStatus.status?.lastPollTime && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 text-primary" />
                <span>Last Update: {new Date(pollingStatus.status.lastPollTime).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default GamePollingControl
