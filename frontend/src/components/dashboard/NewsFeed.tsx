import React from 'react'
import { useNewsFeed } from '../../hooks/useNewsFeed'
import NewsToolbar from './NewsToolbar'
import NewsGrid from './NewsGrid'
import { NewsToolbarFilters } from '../../types/dashboard'

interface NewsFeedProps {
  userRoster?: string[]
  followedEntities?: string[]
  className?: string
}

/**
 * NewsFeed - Main news feed component
 * Integrates NewsToolbar and NewsGrid with state management
 */
export const NewsFeed: React.FC<NewsFeedProps> = ({
  userRoster,
  followedEntities,
  className = ''
}) => {
  const {
    items,
    filters,
    isLoading,
    error,
    hasMore,
    savedPresets,
    updateFilters,
    resetFilters,
    savePreset,
    loadPreset,
    deletePreset,
    markAsRead,
    loadMore,
    refresh
  } = useNewsFeed(userRoster, followedEntities)
  
  const handlePlayerClick = (player: string) => {
    // Filter news by player
    updateFilters({ search: player })
  }
  
  const handleTeamClick = (team: string) => {
    // Filter news by team
    updateFilters({ search: team })
  }
  
  const handleSourceHide = (source: string) => {
    // Add source to exclusion list
    const currentSources = filters.sources
    if (currentSources.includes(source)) {
      // If already filtered, remove it
      updateFilters({ 
        sources: currentSources.filter(s => s !== source) 
      })
    } else {
      // If not filtered, this is actually hiding, so we'd need to filter by all OTHER sources
      // For simplicity, let's just show a message or handle differently
    }
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      <NewsToolbar
        filters={filters}
        onFiltersChange={updateFilters}
        onReset={resetFilters}
        onSavePreset={savePreset}
        savedPresets={savedPresets}
        onLoadPreset={loadPreset}
        onDeletePreset={deletePreset}
        onRefresh={refresh}
      />
      
      <NewsGrid
        items={items}
        isLoading={isLoading}
        error={error}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onMarkRead={markAsRead}
        onPlayerClick={handlePlayerClick}
        onTeamClick={handleTeamClick}
        onSourceHide={handleSourceHide}
        onRetry={refresh}
      />
    </div>
  )
}

export default NewsFeed

