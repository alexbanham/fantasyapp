import React from 'react'
import { 
  Target, 
  RefreshCw, 
  Database, 
  Newspaper, 
  Activity,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { SyncState } from '../../types/dashboard'

interface QuickActionsProps {
  syncState: SyncState
  onSyncGames: () => void
  onSyncESPN: () => void
  onSyncNews: () => void
}

const QuickActions: React.FC<QuickActionsProps> = ({
  syncState,
  onSyncGames,
  onSyncESPN,
  onSyncNews
}) => {
  return (
    <Card className="glass border-border/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Quick Actions
        </CardTitle>
        <CardDescription>Data sync and analysis tools</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Data Sync Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Data Sync</h4>
            <div className="grid grid-cols-1 gap-2">
              <Button 
                variant="outline" 
                onClick={onSyncGames}
                disabled={syncState.syncingGames}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                Sync Games
              </Button>
              <Button 
                variant="outline"
                onClick={onSyncESPN}
                disabled={syncState.syncingESPN}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync ESPN
              </Button>
            </div>
          </div>
          
          {/* News Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">News</h4>
            <div className="grid grid-cols-1 gap-2">
              <Button 
                variant="default" 
                onClick={onSyncNews}
                disabled={syncState.syncingNews}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                <Newspaper className="h-4 w-4 mr-2" />
                {syncState.syncingNews ? 'Syncing News...' : 'Sync All News'}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Status Messages */}
        {syncState.gameSyncMessage && (
          <div className="mt-3 flex items-center text-sm">
            {syncState.syncingGames ? (
              <Activity className="h-4 w-4 text-primary mr-2" />
            ) : syncState.gameSyncMessage.toLowerCase().includes('fail') || syncState.gameSyncMessage.toLowerCase().includes('error') ? (
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            )}
            <span className="text-muted-foreground">{syncState.gameSyncMessage}</span>
          </div>
        )}
        {syncState.espnSyncMessage && (
          <div className="mt-2 flex items-center text-sm">
            {syncState.syncingESPN ? (
              <Activity className="h-4 w-4 text-primary mr-2" />
            ) : syncState.espnSyncMessage.toLowerCase().includes('fail') || syncState.espnSyncMessage.toLowerCase().includes('error') ? (
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            )}
            <span className="text-muted-foreground">{syncState.espnSyncMessage}</span>
          </div>
        )}
        {syncState.newsSyncMessage && (
          <div className="mt-2 flex items-center text-sm">
            {syncState.syncingNews ? (
              <Activity className="h-4 w-4 text-primary mr-2" />
            ) : syncState.newsSyncMessage.toLowerCase().includes('fail') || syncState.newsSyncMessage.toLowerCase().includes('error') ? (
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            )}
            <span className="text-muted-foreground">{syncState.newsSyncMessage}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default QuickActions
