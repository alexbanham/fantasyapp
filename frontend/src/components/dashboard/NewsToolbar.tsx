import React, { useState, useEffect, useRef } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'
import { NewsToolbarFilters, SavedFilterPreset } from '../../types/dashboard'
import {
  Search,
  SlidersHorizontal,
  X,
  Save,
  Bookmark,
  RefreshCw,
  Filter,
  Check
} from 'lucide-react'

interface NewsToolbarProps {
  filters: NewsToolbarFilters
  onFiltersChange: (filters: Partial<NewsToolbarFilters>) => void
  onReset: () => void
  onSavePreset: (name: string) => void
  savedPresets: SavedFilterPreset[]
  onLoadPreset: (presetId: string) => void
  onDeletePreset: (presetId: string) => void
  onRefresh: () => void
  className?: string
}

export const NewsToolbar: React.FC<NewsToolbarProps> = ({
  filters,
  onFiltersChange,
  onReset,
  onSavePreset,
  savedPresets,
  onLoadPreset,
  onDeletePreset,
  onRefresh,
  className = ''
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const advancedRef = useRef<HTMLDivElement>(null)
  const presetsRef = useRef<HTMLDivElement>(null)
  
  // Available options
  const categories = [
    'injury', 'trade', 'signing', 'performance', 
    'depth_chart', 'coaching', 'transaction', 'suspension',
    'analysis', 'rumor'
  ]
  
  const sources = [
    'ESPN', 'NFL.com', 'FantasyPros', 'Rotoworld', 
    'CBS Sports', 'Yahoo Sports'
  ]
  
  const sentiments: Array<'positive' | 'neutral' | 'negative'> = [
    'positive', 'neutral', 'negative'
  ]
  
  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (advancedRef.current && !advancedRef.current.contains(event.target as Node)) {
        setShowAdvanced(false)
      }
      if (presetsRef.current && !presetsRef.current.contains(event.target as Node)) {
        setShowPresets(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // / to focus search
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        document.getElementById('news-search')?.focus()
      }
      
      // f to open filters
      if (e.key === 'f' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault()
        setShowAdvanced(prev => !prev)
      }
    }
    
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])
  
  const handleCategoryToggle = (category: string) => {
    const current = filters.categories
    const updated = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category]
    onFiltersChange({ categories: updated })
  }
  
  const handleSourceToggle = (source: string) => {
    const current = filters.sources
    const updated = current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source]
    onFiltersChange({ sources: updated })
  }
  
  const handleSentimentToggle = (sentiment: 'positive' | 'neutral' | 'negative') => {
    const current = filters.sentiments
    const updated = current.includes(sentiment)
      ? current.filter(s => s !== sentiment)
      : [...current, sentiment]
    onFiltersChange({ sentiments: updated })
  }
  
  const handleSavePreset = () => {
    if (presetName.trim()) {
      onSavePreset(presetName.trim())
      setPresetName('')
      setShowSaveDialog(false)
    }
  }
  
  const activeFiltersCount = [
    filters.search ? 1 : 0,
    filters.timeWindow !== '7d' ? 1 : 0,
    filters.sort !== 'top' ? 1 : 0,
    filters.myLens !== 'all' ? 1 : 0,
    filters.categories.length,
    filters.sources.length,
    filters.impactMin > 0 ? 1 : 0,
    filters.sentiments.length > 0 && filters.sentiments.length < 3 ? 1 : 0,
    filters.breakingOnly ? 1 : 0,
    !filters.groupSimilar ? 1 : 0
  ].reduce((a, b) => a + b, 0)
  
  return (
    <div className={`sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border ${className}`}>
      <div className="p-4 space-y-3">
        {/* Main toolbar row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="news-search"
              type="text"
              placeholder="Search news... (press / to focus)"
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              className="pl-9 pr-8"
              aria-label="Search news"
            />
            {filters.search && (
              <button
                onClick={() => onFiltersChange({ search: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Time Window */}
          <div className="flex items-center gap-1 border border-border rounded-md p-1">
            {(['24h', '3d', '7d', 'all'] as const).map((window) => (
              <Button
                key={window}
                variant={filters.timeWindow === window ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onFiltersChange({ timeWindow: window })}
                className="text-xs h-7"
              >
                {window === 'all' ? 'All' : window.toUpperCase()}
              </Button>
            ))}
          </div>
          
          {/* Sort */}
          <select
            value={filters.sort}
            onChange={(e) => onFiltersChange({ sort: e.target.value as any })}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
            aria-label="Sort by"
          >
            <option value="top">Top</option>
            <option value="latest">Latest</option>
            <option value="impact">Impact</option>
            <option value="team-player">Team/Player</option>
          </select>
          
          {/* My Lens */}
          <select
            value={filters.myLens}
            onChange={(e) => onFiltersChange({ myLens: e.target.value as any })}
            className="h-9 px-3 rounded-md border border-border bg-background text-sm"
            aria-label="Filter by lens"
          >
            <option value="all">All News</option>
            <option value="my-roster">My Roster</option>
            <option value="my-league">My League</option>
          </select>
          
          {/* Advanced Filters */}
          <div className="relative" ref={advancedRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="relative"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge 
                  className="ml-2 px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center bg-primary text-primary-foreground"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            
            {showAdvanced && (
              <div className="absolute top-full mt-2 right-0 w-80 bg-background border border-border rounded-lg shadow-lg p-4 space-y-4">
                {/* Categories */}
                <div>
                  <label className="text-xs font-medium mb-2 block">Categories</label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => handleCategoryToggle(cat)}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                          filters.categories.includes(cat)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-muted'
                        }`}
                        aria-pressed={filters.categories.includes(cat)}
                      >
                        {cat.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Sources */}
                <div>
                  <label className="text-xs font-medium mb-2 block">Sources</label>
                  <div className="flex flex-wrap gap-1.5">
                    {sources.map(src => (
                      <button
                        key={src}
                        onClick={() => handleSourceToggle(src)}
                        className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                          filters.sources.includes(src)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-muted'
                        }`}
                        aria-pressed={filters.sources.includes(src)}
                      >
                        {src}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Impact Minimum */}
                <div>
                  <label className="text-xs font-medium mb-2 block">
                    Min Impact Score: {filters.impactMin}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={filters.impactMin}
                    onChange={(e) => onFiltersChange({ impactMin: parseInt(e.target.value) })}
                    className="w-full"
                    aria-label="Minimum impact score"
                  />
                </div>
                
                {/* Sentiments */}
                <div>
                  <label className="text-xs font-medium mb-2 block">Sentiment</label>
                  <div className="flex gap-2">
                    {sentiments.map(sent => (
                      <button
                        key={sent}
                        onClick={() => handleSentimentToggle(sent)}
                        className={`flex-1 px-2 py-1 text-xs rounded-md border transition-colors ${
                          filters.sentiments.includes(sent)
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-muted'
                        }`}
                        aria-pressed={filters.sentiments.includes(sent)}
                      >
                        {sent}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Toggles */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.breakingOnly}
                      onChange={(e) => onFiltersChange({ breakingOnly: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-xs">Breaking news only</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.groupSimilar}
                      onChange={(e) => onFiltersChange({ groupSimilar: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-xs">Group similar articles</span>
                  </label>
                </div>
              </div>
            )}
          </div>
          
          {/* Saved Presets */}
          <div className="relative" ref={presetsRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPresets(!showPresets)}
            >
              <Bookmark className="w-4 h-4 mr-2" />
              Presets
            </Button>
            
            {showPresets && (
              <div className="absolute top-full mt-2 right-0 w-64 bg-background border border-border rounded-lg shadow-lg p-3 space-y-2">
                {savedPresets.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No saved presets
                  </p>
                ) : (
                  savedPresets.map(preset => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-muted"
                    >
                      <button
                        onClick={() => {
                          onLoadPreset(preset.id)
                          setShowPresets(false)
                        }}
                        className="flex-1 text-left text-xs font-medium"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => onDeletePreset(preset.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Delete preset"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
                
                <div className="border-t pt-2">
                  {!showSaveDialog ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSaveDialog(true)}
                      className="w-full text-xs"
                    >
                      <Save className="w-3 h-3 mr-2" />
                      Save Current Filters
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="Preset name"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSavePreset()
                          if (e.key === 'Escape') {
                            setShowSaveDialog(false)
                            setPresetName('')
                          }
                        }}
                        className="text-xs h-7"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleSavePreset}
                        disabled={!presetName.trim()}
                        className="h-7 px-2"
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setShowSaveDialog(false)
                          setPresetName('')
                        }}
                        className="h-7 px-2"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            aria-label="Refresh news"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          {/* Reset Filters */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs"
            >
              <X className="w-4 h-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
        
        {/* Active filters summary */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">Active filters:</span>
            
            {filters.search && (
              <Badge variant="secondary" className="gap-1">
                Search: "{filters.search}"
                <button onClick={() => onFiltersChange({ search: '' })}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            
            {filters.timeWindow !== '7d' && (
              <Badge variant="secondary">
                {filters.timeWindow === 'all' ? 'All time' : filters.timeWindow.toUpperCase()}
              </Badge>
            )}
            
            {filters.myLens !== 'all' && (
              <Badge variant="secondary">
                {filters.myLens === 'my-roster' ? 'My Roster' : 'My League'}
              </Badge>
            )}
            
            {filters.categories.map(cat => (
              <Badge key={cat} variant="secondary" className="gap-1">
                {cat}
                <button onClick={() => handleCategoryToggle(cat)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            
            {filters.sources.map(src => (
              <Badge key={src} variant="secondary" className="gap-1">
                {src}
                <button onClick={() => handleSourceToggle(src)}>
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
            
            {filters.impactMin > 0 && (
              <Badge variant="secondary">
                Impact ≥ {filters.impactMin}
              </Badge>
            )}
            
            {filters.breakingOnly && (
              <Badge variant="secondary">
                Breaking only
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default NewsToolbar

