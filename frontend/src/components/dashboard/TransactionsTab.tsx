import React from 'react'
import { RefreshCw, ArrowLeftRight } from 'lucide-react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select'
import Transactions from '../Transactions'
import { Transaction, TransactionStats } from '../../services/api'

interface AvailableWeek {
  week: number
  isCurrentWeek: boolean
  isPastWeek: boolean
  isFutureWeek: boolean
  label: string
}

interface TransactionsTabProps {
  transactionsData: { transactions: Transaction[], stats: TransactionStats } | null
  loadingTransactions: boolean
  syncingTransactions: boolean
  transactionsViewMode: 'all' | 'week'
  selectedWeek: number | null
  seasonId: number
  availableWeeks: AvailableWeek[]
  onViewModeChange: (mode: 'all' | 'week') => void
  onWeekChange: (week: number | null) => void
  onSyncTransactions: () => void
}

const TransactionsTab: React.FC<TransactionsTabProps> = ({
  transactionsData,
  loadingTransactions,
  syncingTransactions,
  transactionsViewMode,
  selectedWeek,
  seasonId,
  availableWeeks,
  onViewModeChange,
  onWeekChange,
  onSyncTransactions
}) => {
  if (!transactionsData && !loadingTransactions) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12 text-muted-foreground">
            <ArrowLeftRight className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No transaction data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* View Mode Toggle and Sync Button */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <span className="text-xs sm:text-sm font-medium">View:</span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant={transactionsViewMode === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onViewModeChange('all')}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    All
                  </Button>
                  <Button
                    variant={transactionsViewMode === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onViewModeChange('week')}
                    className="flex-1 sm:flex-initial text-xs sm:text-sm"
                  >
                    By Week
                  </Button>
                </div>
                {transactionsViewMode === 'week' && (
                  <Select
                    value={selectedWeek?.toString() || ''}
                    onValueChange={(value) => {
                      const week = parseInt(value)
                      onWeekChange(week)
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-[150px] text-xs sm:text-sm">
                      <SelectValue placeholder="Select week" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableWeeks.map((w) => (
                        <SelectItem key={w.week} value={w.week.toString()}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={onSyncTransactions}
                disabled={syncingTransactions}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 ${syncingTransactions ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{syncingTransactions ? 'Syncing...' : 'Sync Transactions'}</span>
                <span className="sm:hidden">{syncingTransactions ? 'Syncing...' : 'Sync'}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {transactionsData && (
        <Transactions
          transactions={transactionsData.transactions}
          stats={transactionsData.stats}
          loading={loadingTransactions}
          seasonId={seasonId}
          week={transactionsViewMode === 'all' ? null : selectedWeek}
          onWeekChange={onWeekChange}
          availableWeeks={availableWeeks}
        />
      )}
    </div>
  )
}

export default TransactionsTab

