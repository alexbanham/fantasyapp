import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { ColorSchemeProvider, useColorScheme } from './contexts/ColorSchemeContext'
import { FontProvider } from './contexts/FontContext'
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
import Orangemen from './pages/Orangemen'
import SuperBowl from './pages/SuperBowl'
import Snowflakes from './components/Snowflakes'

function AppContent() {
  const { colorScheme } = useColorScheme()
  const location = useLocation()
  const isSuperBowlPage = location.pathname === '/superbowl'
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
    <div className={`min-h-screen text-foreground ${getBackgroundClass(colorScheme)}`}>
      {!isSuperBowlPage && <Snowflakes />}
      <Routes>
          <Route path="/orangemen" element={<Orangemen />} />
          <Route path="/superbowl" element={<SuperBowl />} />
          <Route path="/" element={<Layout onConfigClick={handleConfigClick}><Dashboard /></Layout>} />
          <Route path="/league" element={<Layout onConfigClick={handleConfigClick}><League /></Layout>} />
          <Route path="/analytics" element={<Layout onConfigClick={handleConfigClick}><Analytics /></Layout>} />
          <Route path="/games" element={<Layout onConfigClick={handleConfigClick}><Games /></Layout>} />
          <Route path="/players" element={<Layout onConfigClick={handleConfigClick}><PlayerBrowser /></Layout>} />
          <Route path="/players/:playerId" element={<Layout onConfigClick={handleConfigClick}><PlayerProfile /></Layout>} />
          <Route path="/news" element={<Layout onConfigClick={handleConfigClick}><News /></Layout>} />
          <Route path="/money" element={<Layout onConfigClick={handleConfigClick}><Money /></Layout>} />
          <Route path="/data" element={<Layout onConfigClick={handleConfigClick}><Data /></Layout>} />
        </Routes>
        
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
  )
}

function App() {
  useEffect(() => {
    // Enable dark mode by default
    document.documentElement.classList.add('dark')
  }, [])

  return (
    <ColorSchemeProvider>
      <FontProvider>
        <Router>
          <AppContent />
        </Router>
      </FontProvider>
    </ColorSchemeProvider>
  )
}

export default App
