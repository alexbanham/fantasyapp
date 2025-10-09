import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Home,
  Search,
  Calendar,
  Crown,
  Database,
  Settings,
  Trophy,
  TrendingUp
} from 'lucide-react'
import { Button } from './ui/button'
import ColorSchemeToggler from './ColorSchemeToggler'

interface LayoutProps {
  children: React.ReactNode
  onConfigClick?: () => void
}

const Layout = ({ children, onConfigClick }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, current: location.pathname === '/' },
    { name: 'League', href: '/league', icon: Trophy, current: location.pathname === '/league' },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp, current: location.pathname === '/analytics' },
    { name: 'Players', href: '/players', icon: Search, current: location.pathname.startsWith('/players') },
    { name: 'Games', href: '/games', icon: Calendar, current: location.pathname === '/games' },
    { name: 'Data', href: '/data', icon: Database, current: location.pathname === '/data' },
  ]

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 border-r border-border/30">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center space-x-3">
            <div className="w-8 h-8 flex items-center justify-center">
              <Crown className="h-6 w-6 text-primary drop-shadow-lg" />
            </div>
              <span className="text-lg font-semibold text-foreground tracking-tight">Fantasy Football Fuck</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.current
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow border-r border-border/30">
          <div className="flex items-center space-x-3 p-4 border-b border-border">
            <div className="w-8 h-8 flex items-center justify-center">
              <Crown className="h-6 w-6 text-primary drop-shadow-lg" />
            </div>
            <span className="text-lg font-semibold text-foreground tracking-tight">Fantasy Footballin</span>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.current
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

        </div>
      </div>

      {/* Top bar - Fixed outside of scrollable content */}
      <div className="fixed top-0 right-0 z-50 border-b border-border/30 lg:left-64 backdrop-blur-sm bg-background/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block">
              <h1 className="text-xl font-medium text-foreground tracking-wide">
                {navigation.find(item => item.current)?.name || 'Fantasy Football Analysis Assistant'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ColorSchemeToggler />
            {onConfigClick && (
              <>
                <div className="h-6 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onConfigClick}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </>
            )}
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span>Live Data</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Page content */}
        <main className="flex-1 pt-16">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout