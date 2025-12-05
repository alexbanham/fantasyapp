import { useState, useEffect } from 'react'
import { 
  getPollingStatus, 
  startPolling, 
  stopPolling, 
  updatePollingEnabled
} from '../services/api'
import { PollingStatus } from '../types/dashboard'

export const usePollingStatus = () => {
  const [pollingStatus, setPollingStatus] = useState<PollingStatus>({
    isPolling: false,
    status: null
  })

  const fetchPollingStatus = async () => {
    try {
      const data = await getPollingStatus()
      if (data.success) {
        setPollingStatus({
          isPolling: data.pollingStatus?.isPolling || false,
          status: data.pollingStatus
        })
      }
    } catch (error) {
      setPollingStatus(prev => ({ ...prev, isPolling: false }))
    }
  }

  const startGamePolling = async () => {
    try {
      const data = await startPolling()
      if (data.success) {
        setPollingStatus({
          isPolling: true,
          status: data.status
        })
      }
    } catch (error) {
      // Silently fail
    }
  }

  const stopGamePolling = async () => {
    try {
      const data = await stopPolling()
      if (data.success) {
        setPollingStatus({
          isPolling: false,
          status: data.status
        })
      }
    } catch (error) {
      // Silently fail
    }
  }

  const togglePollingConfig = async (enabled: boolean) => {
    try {
      const data = await updatePollingEnabled(enabled)
      if (data.success) {
        // Refresh status to get updated config and runtime state
        await fetchPollingStatus()
      }
    } catch (error) {
      // Silently fail
    }
  }

  useEffect(() => {
    fetchPollingStatus()
  }, [])

  return {
    pollingStatus,
    fetchPollingStatus,
    startGamePolling,
    stopGamePolling,
    togglePollingConfig
  }
}

