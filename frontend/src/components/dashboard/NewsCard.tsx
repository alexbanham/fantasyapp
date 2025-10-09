import React, { useState } from 'react'
import { Card } from '../ui/card'
import { Badge } from '../ui/badge'
import { NewsItem } from '../../types/dashboard'
import { 
  formatRelativeTime, 
  getCategoryInfo, 
  getSentimentColor 
} from '../../lib/newsUtils'
import { 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Star, 
  UserPlus,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

// Fallback image URLs for different sources
const getFallbackImageUrl = (source: string): string => {
  const fallbacks: Record<string, string> = {
    'ESPN': 'https://a.espncdn.com/i/espn/espn_logos/espn_red_logo.svg',
    'NFL.com': 'https://static.nfl.com/static/content/public/static/img/logos/nfl-immersive-logo.svg',
    'FantasyPros': 'https://www.fantasypros.com/images/logos/fantasypros-logo.svg',
    'CBS Sports': 'https://sportshub.cbsistatic.com/i/r/2020/01/15/8a0a0a0a-0a0a-0a0a-0a0a-0a0a0a0a0a0a/cbs-sports-logo.svg',
    'Yahoo Sports': 'https://s.yimg.com/cv/apiv2/sports/images/logos/sports/yahoo-sports-logo.svg',
    'Rotoworld': 'https://www.rotoworld.com/images/logos/rotoworld-logo.svg'
  }
  
  return fallbacks[source] || `https://ui-avatars.com/api/?name=${encodeURIComponent(source)}&background=random&size=256&format=png`
}

interface NewsCardProps {
  item: NewsItem
  onMarkRead: (articleId: string) => void
  onPlayerClick?: (player: string) => void
  onTeamClick?: (team: string) => void
  onSourceHide?: (source: string) => void
  className?: string
}

export const NewsCard: React.FC<NewsCardProps> = ({
  item,
  onMarkRead,
  onPlayerClick,
  onTeamClick,
  onSourceHide,
  className = ''
}) => {
  const [showRelated, setShowRelated] = useState(false)
  const categoryInfo = getCategoryInfo(item.category)
  const sentimentColor = getSentimentColor(item.sentiment)
  const relativeTime = formatRelativeTime(item.published_at)
  
  const handleCardClick = () => {
    if (!item.isRead) {
      onMarkRead(item.article_id)
    }
  }
  
  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(item.url, '_blank', 'noopener,noreferrer')
    if (!item.isRead) {
      onMarkRead(item.article_id)
    }
  }
  
  const handleChipClick = (e: React.MouseEvent, type: 'player' | 'team', value: string) => {
    e.stopPropagation()
    if (type === 'player' && onPlayerClick) {
      onPlayerClick(value)
    } else if (type === 'team' && onTeamClick) {
      onTeamClick(value)
    }
  }
  
  return (
    <Card 
      className={`group hover:shadow-lg transition-all duration-200 border-border/50 ${
        item.isRead ? 'opacity-60' : ''
      } ${className}`}
      onClick={handleCardClick}
    >
      <div className="flex flex-col sm:flex-row gap-4 p-4">
        {/* Image - Left on desktop, Top on mobile */}
        {item.image_url && (
          <div className="w-full sm:w-32 sm:h-24 flex-shrink-0">
            <img
              src={item.image_url}
              alt={item.title}
              className="w-full h-32 sm:h-full object-cover rounded-md"
              style={{
                imageRendering: 'crisp-edges',
                filter: 'none',
                backdropFilter: 'none',
                transform: 'translateZ(0)',
                willChange: 'transform'
              }}
              onError={(e) => {
                // Try fallback with higher quality
                const fallbackUrl = getFallbackImageUrl(item.source)
                if (e.currentTarget.src !== fallbackUrl) {
                  e.currentTarget.src = fallbackUrl
                } else {
                  // Final fallback to avatar
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.source)}&background=random&size=256&format=png`
                }
              }}
              loading="lazy"
              decoding="async"
            />
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header - Source, Time, Category, Sentiment */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-medium">
              {item.source}
            </Badge>
            
            <span 
              className="text-xs text-muted-foreground hover:text-foreground cursor-default"
              title={new Date(item.published_at).toLocaleString()}
            >
              {relativeTime}
            </span>
            
            {item.category && (
              <Badge className={`text-xs ${categoryInfo.color} border-0`}>
                {categoryInfo.label}
              </Badge>
            )}
            
            {item.is_breaking && (
              <Badge className="text-xs bg-red-600 text-white animate-pulse">
                Breaking
              </Badge>
            )}
            
            {/* Sentiment indicator */}
            <div 
              className={`w-2 h-2 rounded-full ${sentimentColor}`}
              title={`Sentiment: ${item.sentiment}`}
            />
          </div>
          
          {/* Title */}
          <h3 
            className="text-base font-semibold line-clamp-2 mb-2 cursor-pointer hover:text-primary group-hover:underline"
            onClick={handleTitleClick}
          >
            {item.title}
          </h3>
          
          {/* Summary */}
          {item.summary && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {item.summary}
            </p>
          )}
          
          {/* AI Insights - "Why it matters" */}
          {item.ai_insights && item.ai_insights.length > 0 && item.ai_insights[0] && (
            <div className="mb-3 p-2 bg-primary/5 rounded-md border border-primary/10">
              <p className="text-xs font-medium text-primary mb-1">Why it matters:</p>
              <p className="text-xs text-muted-foreground">{item.ai_insights[0]}</p>
            </div>
          )}
          
          {/* Players and Teams chips */}
          {(item.players.length > 0 || item.teams.length > 0) && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {item.players.slice(0, 3).map((player, idx) => (
                <button
                  key={`player-${idx}`}
                  onClick={(e) => handleChipClick(e, 'player', player)}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-colors"
                  aria-pressed="false"
                >
                  {player}
                </button>
              ))}
              {item.players.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs text-muted-foreground">
                  +{item.players.length - 3} more
                </span>
              )}
              
              {item.teams.map((team, idx) => (
                <button
                  key={`team-${idx}`}
                  onClick={(e) => handleChipClick(e, 'team', team)}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors"
                  aria-pressed="false"
                >
                  {team}
                </button>
              ))}
            </div>
          )}
          
          {/* Footer - Impact meter and actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {/* Impact score */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Impact:</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-3 rounded-sm ${
                      i < item.impact_score
                        ? item.impact_score >= 7
                          ? 'bg-red-500'
                          : item.impact_score >= 5
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium">{item.impact_score}/10</span>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Related items */}
              {item.relatedItems && item.relatedItems.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowRelated(!showRelated)
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  aria-expanded={showRelated}
                >
                  {showRelated ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Related ({item.relatedItems.length})
                </button>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(item.url, '_blank', 'noopener,noreferrer')
                }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                aria-label="Open article"
              >
                <ExternalLink className="w-3 h-3" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkRead(item.article_id)
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label={item.isRead ? "Mark as unread" : "Mark as read"}
              >
                {item.isRead ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
              
              {onSourceHide && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSourceHide(item.source)
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                  aria-label="Hide source"
                  title="Hide this source"
                >
                  <EyeOff className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Related items */}
      {showRelated && item.relatedItems && item.relatedItems.length > 0 && (
        <div className="border-t border-border/50 p-4 bg-muted/20">
          <p className="text-xs font-medium text-muted-foreground mb-2">Similar articles:</p>
          <div className="space-y-2">
            {item.relatedItems.map((related, idx) => (
              <a
                key={`related-${idx}`}
                href={related.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm hover:text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {related.source}
                  </Badge>
                  <span className="line-clamp-1">{related.title}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export default NewsCard

