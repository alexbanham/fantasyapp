/**
 * @deprecated This component is deprecated. Use NewsFeed from ./NewsFeed.tsx instead.
 * This file is kept for backward compatibility and will be removed in a future version.
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import NewsColumn from './NewsColumn'
import NewsLayoutToggle, { NewsLayoutMode } from './NewsLayoutToggle'
import EnhancedNewsArticle from '../EnhancedNewsArticle'
import { FantasyNewsArticle } from '../../types/dashboard'

interface ModularNewsFeedProps {
  filteredNews: FantasyNewsArticle[]
  isLoading: boolean
  sortBy: 'smart' | 'published_at' | 'relevance_score' | 'impact_score'
  onTrackClick: (articleId: string) => void
  className?: string
}

const ModularNewsFeed: React.FC<ModularNewsFeedProps> = ({
  filteredNews,
  isLoading,
  sortBy,
  onTrackClick,
  className = ''
}) => {
  const [layoutMode, setLayoutMode] = React.useState<NewsLayoutMode>('multi-column')
  const [visibleSources, setVisibleSources] = React.useState<string[]>(['ESPN', 'FantasyPros'])

  // Get unique sources from the news data
  const availableSources = React.useMemo(() => {
    const sources = [...new Set(filteredNews.map(article => article.source))]
    return sources.sort()
  }, [filteredNews])

  // Sort news for single feed mode
  const sortedNews = React.useMemo(() => {
    if (!filteredNews || !Array.isArray(filteredNews)) return []
    
    return [...filteredNews].sort((a, b) => {
      if (sortBy === 'published_at') {
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      } else if (sortBy === 'impact_score') {
        return b.impact_score - a.impact_score
      } else if (sortBy === 'relevance_score') {
        return b.relevance_score - a.relevance_score
      } else {
        // Smart sorting: combine impact and relevance
        const aScore = (a.impact_score * 0.6) + (a.relevance_score * 0.4)
        const bScore = (b.impact_score * 0.6) + (b.relevance_score * 0.4)
        return bScore - aScore
      }
    })
  }, [filteredNews, sortBy])

  // Filter visible sources for multi-column mode
  const visibleSourcesNews = React.useMemo(() => {
    if (layoutMode === 'single') return sortedNews
    return sortedNews.filter(article => visibleSources.includes(article.source))
  }, [sortedNews, layoutMode, visibleSources])

  const renderSingleFeed = () => (
    <Card className="news-container border-border/30">
      <CardHeader>
        <CardTitle className="text-foreground">
          All News ({visibleSourcesNews.length})
        </CardTitle>
        <CardDescription>
          Latest fantasy-relevant news, sorted by {sortBy === 'published_at' ? 'latest' : sortBy === 'impact_score' ? 'impact' : 'relevance'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="ml-3 text-muted-foreground">Loading news...</p>
          </div>
        ) : visibleSourcesNews.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📰</div>
            <p className="text-muted-foreground">No news found</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your filters or syncing news data.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleSourcesNews.map((article) => (
              <EnhancedNewsArticle
                key={article.article_id}
                article={article}
                aiAnalyzingArticles={[]}
                aiInsights={null}
                onTrackClick={onTrackClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  const renderMultiColumnFeed = () => {
    const columnsPerRow = Math.min(visibleSources.length, 3)
    const gridCols = columnsPerRow === 1 ? 'grid-cols-1' : 
                    columnsPerRow === 2 ? 'grid-cols-1 lg:grid-cols-2' : 
                    'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'

    return (
      <div className={`grid ${gridCols} gap-6`}>
        {visibleSources.map(source => (
          <NewsColumn
            key={source}
            source={source}
            articles={filteredNews}
            isLoading={isLoading}
            maxArticles={layoutMode === 'custom' ? 15 : 8}
            showFeatured={true}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Layout Controls */}
      <NewsLayoutToggle
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        visibleSources={visibleSources}
        onVisibleSourcesChange={setVisibleSources}
        availableSources={availableSources}
      />

      {/* News Content */}
      {layoutMode === 'single' ? renderSingleFeed() : renderMultiColumnFeed()}
    </div>
  )
}

export default ModularNewsFeed

