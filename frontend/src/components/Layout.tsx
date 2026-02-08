import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Home,
  Search,
  Calendar,
  Database,
  Settings,
  Trophy,
  TrendingUp,
  Newspaper,
  DollarSign,
  LayoutGrid
} from 'lucide-react'
import { Button } from './ui/button'
import ColorSchemeToggler from './ColorSchemeToggler'
import AnimatedLogo from './AnimatedLogo'
import AnimatedLogoText from './AnimatedLogoText'

interface LayoutProps {
  children: React.ReactNode
  onConfigClick?: () => void
}

const Layout = ({ children, onConfigClick }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, current: location.pathname === '/' },
    { name: 'League', href: '/league', icon: Trophy, current: location.pathname === '/league' },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp, current: location.pathname === '/analytics' },
    { name: 'Players', href: '/players', icon: Search, current: location.pathname.startsWith('/players') },
    { name: 'Games', href: '/games', icon: Calendar, current: location.pathname === '/games' },
    { name: 'News', href: '/news', icon: Newspaper, current: location.pathname === '/news' },
    { name: 'Money', href: '/money', icon: DollarSign, current: location.pathname === '/money' },
    { name: 'Data', href: '/data', icon: Database, current: location.pathname === '/data' },
    { name: 'Super Bowl', href: '/superbowl', icon: LayoutGrid, current: location.pathname === '/superbowl' },
  ]

  return (
    <div className="min-h-screen">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop - Mobile only */}
        <div 
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} 
          onClick={() => setSidebarOpen(false)} 
        />
        {/* Sidebar Panel - Mobile only */}
        <div className={`fixed inset-y-0 left-0 w-64 backdrop-blur-sm transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between p-4 h-[57px]">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <AnimatedLogo />
              <div className="min-w-0 flex-1">
                <AnimatedLogoText text="Fantasy Footballin" className="truncate" />
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="shrink-0 text-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-73px)]">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  item.current
                    ? 'bg-primary/20 text-foreground border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow backdrop-blur-sm">
          <div className="flex items-center space-x-3 p-4 h-[57px]">
            <AnimatedLogo />
            <AnimatedLogoText text="Fantasy Footballin" />
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.current
                    ? 'bg-primary/20 text-foreground border border-primary/30'
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
      <div className="fixed top-0 left-0 right-0 z-40 lg:left-64 backdrop-blur-sm h-[57px]">
        <div className="flex items-center justify-between px-2 sm:px-4 lg:px-4 py-2 sm:py-3 lg:py-4 h-full">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden shrink-0"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block min-w-0">
              <h1 className="text-lg sm:text-xl font-medium text-foreground tracking-wide truncate">
                {navigation.find(item => item.current)?.name || 'Fantasy Football Analysis Assistant'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
            <ColorSchemeToggler />
            {onConfigClick && (
              <>
                <div className="h-6 w-px bg-border/30 hidden sm:block" />
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
            <div className="h-6 w-px bg-border/30 hidden sm:block" />
            <div className="hidden md:flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span>Live Data</span>
            </div>
            <div className="md:hidden w-2 h-2 bg-primary rounded-full animate-pulse shrink-0" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Page content */}
        <main className="flex-1 pt-[57px]">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout