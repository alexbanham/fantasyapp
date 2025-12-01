import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ColorSchemeProvider, useColorScheme } from './contexts/ColorSchemeContext'
import { getBackgroundClass } from './lib/colorSchemes'
import Layout from './components/Layout'
import PasswordPrompt from './components/dashboard/PasswordPrompt'
import ConfigurationModal from './components/dashboard/ConfigurationModal'
import { verifyPassword } from './services/api'
import { 
  usePollingStatus, 
  useSyncOperations, 
  useConfig
} from './hooks/useDashboard'
import Dashboard from './pages/Dashboard'
import League from './pages/League'
import Analytics from './pages/Analytics'
import PlayerBrowser from './pages/PlayerBrowser'
import PlayerProfile from './pages/PlayerProfile'
import Games from './pages/Games'
import Data from './pages/Data'
import News from './pages/News'
import Money from './pages/Money'

function AppContent() {
  const { colorScheme } = useColorScheme()
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Dashboard hooks for admin panel
  const { pollingStatus, togglePollingConfig } = usePollingStatus()
  const { syncState, syncFantasyNewsData, syncAllPlayersESPN, syncCurrentWeekPlayers, syncAllBoxscores, syncBettingOdds, syncPlayerProps } = useSyncOperations()
  const { config, configState, setConfigState, updateWeek, updateSeason, autoUpdateWeekData, fetchConfig } = useConfig()

  const handleConfigClick = () => {
    if (isAuthenticated) {
      setConfigModalOpen(true)
    } else {
      setPasswordPromptOpen(true)
    }
  }

  const handlePasswordVerify = async (password: string): Promise<boolean> => {
    try {
      const result = await verifyPassword(password)
      if (result.success && result.verified) {
        setIsAuthenticated(true)
        setConfigModalOpen(true)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  const handleConfigModalClose = () => {
    setConfigModalOpen(false)
    setIsAuthenticated(false)
  }

  const handleConfigStateChange = (updates: Partial<typeof configState>) => {
    setConfigState(prev => ({ ...prev, ...updates }))
  }

  const handleTogglePolling = async (enabled: boolean) => {
    await togglePollingConfig(enabled)
  }

  const handleSyncNews = async () => {
    await syncFantasyNewsData()
  }
  
  return (
    <Router>
      <div className={`min-h-screen text-foreground ${getBackgroundClass(colorScheme)}`}>
        <Layout onConfigClick={handleConfigClick}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/league" element={<League />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/games" element={<Games />} />
            <Route path="/players" element={<PlayerBrowser />} />
            <Route path="/players/:playerId" element={<PlayerProfile />} />
            <Route path="/news" element={<News />} />
            <Route path="/money" element={<Money />} />
            <Route path="/data" element={<Data />} />
          </Routes>
        </Layout>
        
        {/* Password Prompt Modal */}
        <PasswordPrompt
          isOpen={passwordPromptOpen}
          onClose={() => setPasswordPromptOpen(false)}
          onVerify={handlePasswordVerify}
        />

        {/* Configuration Modal - Accessible from all pages */}
        <ConfigurationModal
          isOpen={configModalOpen}
          onClose={handleConfigModalClose}
          config={config}
          configState={configState}
          onConfigStateChange={handleConfigStateChange}
          onUpdateWeek={updateWeek}
          onUpdateSeason={updateSeason}
          onAutoUpdateWeek={autoUpdateWeekData}
          pollingStatus={pollingStatus}
          configEnabled={config?.pollingEnabled || false}
          onTogglePolling={handleTogglePolling}
          syncState={syncState}
          onSyncNews={handleSyncNews}
          onSyncAllPlayers={syncAllPlayersESPN}
          onSyncCurrentWeek={syncCurrentWeekPlayers}
          onSyncAllBoxscores={syncAllBoxscores}
          onSyncBettingOdds={syncBettingOdds}
          onSyncPlayerProps={syncPlayerProps}
          currentWeek={config?.currentWeek || 1}
          currentSeason={config?.currentSeason || new Date().getFullYear()}
        />
      </div>
    </Router>
  )
}

function App() {
  useEffect(() => {
    // Enable dark mode by default
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <ColorSchemeProvider>
      <AppContent />
    </ColorSchemeProvider>
  )
}

export default App
