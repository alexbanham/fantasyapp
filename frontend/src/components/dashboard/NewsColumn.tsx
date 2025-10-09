/**
 * @deprecated This component is deprecated. Use NewsCard from ./NewsCard.tsx instead.
 * This file is kept for backward compatibility and will be removed in a future version.
 */

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import EnhancedNewsArticle from '../EnhancedNewsArticle'
import { FantasyNewsArticle } from '../../types/dashboard'

interface NewsColumnProps {
  source: string
  articles: FantasyNewsArticle[]
  isLoading: boolean
  maxArticles?: number
  showFeatured?: boolean
  className?: string
}

const NewsColumn: React.FC<NewsColumnProps> = ({
  source,
  articles,
  isLoading,
  maxArticles = 10,
  showFeatured = true,
  className = ''
}) => {
  // Filter and sort articles for this source
  const sourceArticles = articles
    .filter(article => article.source === source)
    .sort((a, b) => {
      // Prioritize featured articles, then by relevance and impact
      if (showFeatured && a.is_featured && !b.is_featured) return -1
      if (showFeatured && !a.is_featured && b.is_featured) return 1
      
      const aScore = (a.impact_score * 0.6) + (a.relevance_score * 0.4)
      const bScore = (b.impact_score * 0.6) + (b.relevance_score * 0.4)
      return bScore - aScore
    })
    .slice(0, maxArticles)

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'espn':
        return '🏈'
      case 'fantasypros':
        return '📊'
      case 'nfl':
        return '🏆'
      case 'cbs':
        return '📺'
      case 'yahoo':
        return '🔍'
      case 'bleacherreport':
        return '📰'
      default:
        return '📰'
    }
  }

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case 'espn':
        return 'text-red-600'
      case 'fantasypros':
        return 'text-blue-600'
      case 'nfl':
        return 'text-gray-700'
      case 'cbs':
        return 'text-purple-600'
      case 'yahoo':
        return 'text-purple-500'
      case 'bleacherreport':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <Card className={`h-fit ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 text-lg ${getSourceColor(source)}`}>
          <span className="text-xl">{getSourceIcon(source)}</span>
          {source}
          <span className="text-sm font-normal text-muted-foreground">
            ({sourceArticles.length})
          </span>
        </CardTitle>
        <CardDescription className="text-sm">
          {source === 'ESPN' && 'Breaking news and injury updates'}
          {source === 'FantasyPros' && 'Expert analysis and projections'}
          {source === 'NFL' && 'Official league updates'}
          {source === 'CBS' && 'Comprehensive sports coverage'}
          {source === 'Yahoo' && 'Fantasy insights and trends'}
          {source === 'BleacherReport' && 'Latest sports buzz'}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="ml-2 text-sm text-muted-foreground">Loading...</p>
          </div>
        ) : sourceArticles.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">{getSourceIcon(source)}</div>
            <p className="text-sm text-muted-foreground">No articles from {source}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sourceArticles.map((article, index) => (
              <div key={article.article_id} className={index === 0 && showFeatured ? 'border-b border-border pb-3 mb-3' : ''}>
                <EnhancedNewsArticle
                  article={article}
                  aiAnalyzingArticles={[]}
                  aiInsights={null}
                  onTrackClick={() => {}}
                  compact={index > 0}
                  showSource={false}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default NewsColumn

