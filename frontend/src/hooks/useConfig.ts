import { useState, useEffect } from 'react'
import {
  getConfig,
  updateCurrentWeek,
  updateCurrentSeason,
  autoUpdateWeek
} from '../services/api'
import { Config, ConfigState } from '../types/dashboard'

export const useConfig = () => {
  const [config, setConfig] = useState<Config | null>(null)
  const [configState, setConfigState] = useState<ConfigState>({
    loadingConfig: false,
    configMessage: '',
    currentWeekInput: 1,
    currentSeasonInput: new Date().getFullYear()
  })

  const fetchConfig = async () => {
    try {
      setConfigState(prev => ({ ...prev, loadingConfig: true }))
      const data = await getConfig()
      if (data.success) {
        setConfig(data.data)
        setConfigState(prev => ({
          ...prev,
          currentWeekInput: data.data.currentWeek,
          currentSeasonInput: data.data.currentSeason
        }))
      }
    } catch (error) {
      // Silently fail
    } finally {
      setConfigState(prev => ({ ...prev, loadingConfig: false }))
    }
  }

  const updateWeek = async () => {
    try {
      setConfigState(prev => ({ ...prev, loadingConfig: true, configMessage: 'Updating current week...' }))
      const data = await updateCurrentWeek(configState.currentWeekInput)
      if (data.success) {
        setConfigState(prev => ({ ...prev, configMessage: `Week updated to ${configState.currentWeekInput}` }))
        await fetchConfig()
      } else {
        setConfigState(prev => ({ ...prev, configMessage: 'Failed to update week' }))
      }
    } catch (error) {
      setConfigState(prev => ({ ...prev, configMessage: 'Error updating week' }))
    } finally {
      setConfigState(prev => ({ ...prev, loadingConfig: false }))
      setTimeout(() => setConfigState(prev => ({ ...prev, configMessage: '' })), 5000)
    }
  }

  const updateSeason = async () => {
    try {
      setConfigState(prev => ({ ...prev, loadingConfig: true, configMessage: 'Updating current season...' }))
      const data = await updateCurrentSeason(configState.currentSeasonInput)
      if (data.success) {
        setConfigState(prev => ({ ...prev, configMessage: `Season updated to ${configState.currentSeasonInput}` }))
        await fetchConfig()
      } else {
        setConfigState(prev => ({ ...prev, configMessage: 'Failed to update season' }))
      }
    } catch (error) {
      setConfigState(prev => ({ ...prev, configMessage: 'Error updating season' }))
    } finally {
      setConfigState(prev => ({ ...prev, loadingConfig: false }))
      setTimeout(() => setConfigState(prev => ({ ...prev, configMessage: '' })), 5000)
    }
  }

  const autoUpdateWeekData = async () => {
    try {
      setConfigState(prev => ({ ...prev, loadingConfig: true, configMessage: 'Auto-updating week...' }))
      const data = await autoUpdateWeek()
      if (data.success) {
        setConfigState(prev => ({ ...prev, configMessage: 'Week auto-updated successfully' }))
        await fetchConfig()
      } else {
        setConfigState(prev => ({ ...prev, configMessage: 'Failed to auto-update week' }))
      }
    } catch (error) {
      setConfigState(prev => ({ ...prev, configMessage: 'Error auto-updating week' }))
    } finally {
      setConfigState(prev => ({ ...prev, loadingConfig: false }))
      setTimeout(() => setConfigState(prev => ({ ...prev, configMessage: '' })), 5000)
    }
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return {
    config,
    configState,
    setConfigState,
    fetchConfig,
    updateWeek,
    updateSeason,
    autoUpdateWeekData
  }
}










