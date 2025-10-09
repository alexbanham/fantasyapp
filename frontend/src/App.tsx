import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ColorSchemeProvider, useColorScheme } from './contexts/ColorSchemeContext'
import { getBackgroundClass } from './lib/colorSchemes'
import Layout from './components/Layout'
import PasswordPrompt from './components/dashboard/PasswordPrompt'
import { verifyPassword } from './services/api'
import Dashboard from './pages/Dashboard'
import League from './pages/League'
import Analytics from './pages/Analytics'
import PlayerBrowser from './pages/PlayerBrowser'
import PlayerProfile from './pages/PlayerProfile'
import Games from './pages/Games'
import Data from './pages/Data'

function AppContent() {
  const { colorScheme } = useColorScheme()
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [passwordPromptOpen, setPasswordPromptOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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
  
  return (
    <Router>
      <div className={`min-h-screen text-foreground ${getBackgroundClass(colorScheme)}`}>
        <Layout onConfigClick={handleConfigClick}>
          <Routes>
            <Route path="/" element={<Dashboard configModalOpen={configModalOpen} onConfigModalClose={handleConfigModalClose} />} />
            <Route path="/league" element={<League />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/games" element={<Games />} />
            <Route path="/players" element={<PlayerBrowser />} />
            <Route path="/players/:playerId" element={<PlayerProfile />} />
            <Route path="/data" element={<Data />} />
          </Routes>
        </Layout>
        
        {/* Password Prompt Modal */}
        <PasswordPrompt
          isOpen={passwordPromptOpen}
          onClose={() => setPasswordPromptOpen(false)}
          onVerify={handlePasswordVerify}
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
