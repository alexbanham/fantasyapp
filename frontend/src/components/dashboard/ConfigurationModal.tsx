import React from 'react'
import { Clock, RefreshCw, Activity, CheckCircle, AlertCircle, X, Power, PowerOff, Newspaper, Users, Calendar } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Config, ConfigState, PollingStatus, SyncState } from '../../types/dashboard'

interface ConfigurationModalProps {
  isOpen: boolean
  onClose: () => void
  config: Config | null
  configState: ConfigState
  onConfigStateChange: (updates: Partial<ConfigState>) => void
  onUpdateWeek: () => void
  onUpdateSeason: () => void
  onAutoUpdateWeek: () => void
  pollingStatus: PollingStatus
  configEnabled: boolean
  onTogglePolling: (enabled: boolean) => void
  syncState: SyncState
  onSyncNews: () => void
  onSyncAllPlayers: () => void
  onSyncCurrentWeek: () => void
  onSyncAllBoxscores: () => void
}

const ConfigurationModal: React.FC<ConfigurationModalProps> = ({
  isOpen,
  onClose,
  config,
  configState,
  onConfigStateChange,
  onUpdateWeek,
  onUpdateSeason,
  onAutoUpdateWeek,
  pollingStatus,
  configEnabled,
  onTogglePolling,
  syncState,
  onSyncNews,
  onSyncAllPlayers,
  onSyncCurrentWeek,
  onSyncAllBoxscores
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background/95 border border-border/30 rounded-lg shadow-xl max-w-md w-full mx-4 backdrop-blur-sm">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Configuration
              </CardTitle>
              <CardDescription>Manage current week and season settings</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current Week */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Current Week</label>
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
                <label className="text-sm font-medium text-foreground">Current Season</label>
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

              {/* Divider */}
              <div className="border-t border-border/30 my-4" />

              {/* Game Polling Service */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Live Updates</h4>
                <Button 
                  variant={configEnabled ? "default" : "outline"} 
                  onClick={() => onTogglePolling(!configEnabled)}
                  className="w-full"
                >
                  {configEnabled ? (
                    <>
                      <PowerOff className="h-4 w-4 mr-2" />
                      Stop Polling
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-2" />
                      Start Polling
                    </>
                  )}
                </Button>
                
                {pollingStatus.status?.lastPollTime && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Activity className="h-3 w-3 text-primary" />
                    <span>Last Update: {new Date(pollingStatus.status.lastPollTime).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>

              {/* Data Sync Section */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Data Sync</h4>
                
                {/* Sync All News */}
                <Button 
                  variant="default" 
                  onClick={onSyncNews}
                  disabled={syncState.syncingNews || syncState.syncingPlayers}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  <Newspaper className="h-4 w-4 mr-2" />
                  {syncState.syncingNews ? 'Syncing News...' : 'Sync All News'}
                </Button>
                
                {/* Sync All Players */}
                <Button 
                  variant="outline" 
                  onClick={onSyncAllPlayers}
                  disabled={syncState.syncingNews || syncState.syncingPlayers}
                  className="w-full"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {syncState.syncingPlayers ? 'Syncing Players...' : 'Sync All Players'}
                </Button>
                
                {/* Sync Current Week */}
                <Button 
                  variant="outline" 
                  onClick={onSyncCurrentWeek}
                  disabled={syncState.syncingNews || syncState.syncingPlayers || syncState.syncingBoxscores}
                  className="w-full bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Sync Current Week
                </Button>
                
                {/* Sync All Boxscores */}
                <Button 
                  variant="outline" 
                  onClick={onSyncAllBoxscores}
                  disabled={syncState.syncingBoxscores || syncState.syncingNews || syncState.syncingPlayers}
                  className="w-full bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {syncState.syncingBoxscores ? 'Syncing Boxscores...' : 'Sync All Boxscores'}
                </Button>
                
                {/* Status Messages */}
                {syncState.newsSyncMessage && (
                  <div className="flex items-center text-xs">
                    {syncState.syncingNews ? (
                      <Activity className="h-3 w-3 text-primary mr-2" />
                    ) : syncState.newsSyncMessage.toLowerCase().includes('fail') || syncState.newsSyncMessage.toLowerCase().includes('error') ? (
                      <AlertCircle className="h-3 w-3 text-red-500 mr-2" />
                    ) : (
                      <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                    )}
                    <span className="text-muted-foreground text-xs">{syncState.newsSyncMessage}</span>
                  </div>
                )}
                {syncState.playersSyncMessage && (
                  <div className="flex items-center text-xs">
                    {syncState.syncingPlayers ? (
                      <Activity className="h-3 w-3 text-primary mr-2" />
                    ) : syncState.playersSyncMessage.toLowerCase().includes('fail') || syncState.playersSyncMessage.toLowerCase().includes('error') ? (
                      <AlertCircle className="h-3 w-3 text-red-500 mr-2" />
                    ) : (
                      <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                    )}
                    <span className="text-muted-foreground text-xs">{syncState.playersSyncMessage}</span>
                  </div>
                )}
                {syncState.boxscoresSyncMessage && (
                  <div className="flex items-center text-xs">
                    {syncState.syncingBoxscores ? (
                      <Activity className="h-3 w-3 text-primary mr-2" />
                    ) : syncState.boxscoresSyncMessage.toLowerCase().includes('fail') || syncState.boxscoresSyncMessage.toLowerCase().includes('error') ? (
                      <AlertCircle className="h-3 w-3 text-red-500 mr-2" />
                    ) : (
                      <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                    )}
                    <span className="text-muted-foreground text-xs">{syncState.boxscoresSyncMessage}</span>
                  </div>
                )}
              </div>

              {/* Another Divider */}
              <div className="border-t border-border/30 my-4" />

              {/* Current Status */}
              {config && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-lg border border-border/30">
                  <div className="text-sm text-foreground">
                    <span className="font-medium">Current Week:</span> {config.currentWeek}
                  </div>
                  <div className="text-sm text-foreground">
                    <span className="font-medium">Current Season:</span> {config.currentSeason}
                  </div>
                  <div className="text-sm text-foreground">
                    <span className="font-medium">Scoring Type:</span> {config.scoringType}
                  </div>
                  <div className="text-sm text-foreground">
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
      </div>
    </div>
  )
}

export default ConfigurationModal
