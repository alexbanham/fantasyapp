import React from 'react'
import { Clock, RefreshCw, Activity, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Config, ConfigState } from '../../types/dashboard'

interface ConfigurationProps {
  config: Config | null
  configState: ConfigState
  onConfigStateChange: (updates: Partial<ConfigState>) => void
  onUpdateWeek: () => void
  onUpdateSeason: () => void
  onAutoUpdateWeek: () => void
}

const Configuration: React.FC<ConfigurationProps> = ({
  config,
  configState,
  onConfigStateChange,
  onUpdateWeek,
  onUpdateSeason,
  onAutoUpdateWeek
}) => {
  return (
    <Card className="lg:col-span-1 glass border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Configuration
        </CardTitle>
        <CardDescription>Manage current week and season settings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Week */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Week</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="18"
                value={configState.currentWeekInput}
                onChange={(e) => onConfigStateChange({ currentWeekInput: parseInt(e.target.value) || 1 })}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onUpdateWeek}
                disabled={configState.loadingConfig}
              >
                Update
              </Button>
            </div>
          </div>

          {/* Current Season */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Season</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="2020"
                max="2030"
                value={configState.currentSeasonInput}
                onChange={(e) => onConfigStateChange({ currentSeasonInput: parseInt(e.target.value) || new Date().getFullYear() })}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onUpdateSeason}
                disabled={configState.loadingConfig}
              >
                Update
              </Button>
            </div>
          </div>

          {/* Auto Update Week */}
          <Button
            variant="outline"
            onClick={onAutoUpdateWeek}
            disabled={configState.loadingConfig}
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Auto Update Week
          </Button>

          {/* Current Status */}
          {config && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">Current Week:</span> {config.currentWeek}
              </div>
              <div className="text-sm">
                <span className="font-medium">Current Season:</span> {config.currentSeason}
              </div>
              <div className="text-sm">
                <span className="font-medium">Scoring Type:</span> {config.scoringType}
              </div>
              <div className="text-sm">
                <span className="font-medium">In Season:</span> {config.isInSeason ? 'Yes' : 'No'}
              </div>
            </div>
          )}

          {/* Config Message */}
          {configState.configMessage && (
            <div className="mt-2 flex items-center text-sm">
              {configState.loadingConfig ? (
                <Activity className="h-4 w-4 text-primary mr-2" />
              ) : configState.configMessage.toLowerCase().includes('fail') || configState.configMessage.toLowerCase().includes('error') ? (
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              )}
              <span className="text-muted-foreground">{configState.configMessage}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default Configuration
