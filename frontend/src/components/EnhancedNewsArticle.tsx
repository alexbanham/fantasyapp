/**
 * @deprecated This component is deprecated. Use NewsCard from ./dashboard/NewsCard.tsx instead.
 * This file is kept for backward compatibility and will be removed in a future version.
 */

import React, { useState } from 'react'
import { Brain, Star, ExternalLink, Clock, Activity, ChevronDown, ChevronUp, Target, AlertCircle, TrendingUp, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FantasyNewsArticle } from '@/types/dashboard'

interface EnhancedNewsArticleProps {
  article: FantasyNewsArticle
  aiAnalyzingArticles: string[]
  aiInsights: any
  onTrackClick: (articleId: string) => void
  compact?: boolean
  showSource?: boolean
}

const EnhancedNewsArticle: React.FC<EnhancedNewsArticleProps> = ({
  article,
  aiAnalyzingArticles,
  aiInsights,
  onTrackClick,
  compact = false,
  showSource = true
}) => {
  const [showAIInsights, setShowAIInsights] = useState(false)
  
  const isAnalyzing = aiAnalyzingArticles.includes(article.article_id)
  
  // Check for per-article insights first, then fallback to general insights
  const articleInsight = aiInsights?.per_article_insights?.find(
    (insight: any) => insight.article_id === article.article_id
  )
  
  const hasAIInsight = articleInsight || (aiInsights && aiInsights.insights?.key_insights?.some((insight: any) => 
    insight.affected_players?.some((player: string) => 
      article.players?.some((p: any) => p.player_name === player)
    )
  ))
  
  const isHighlyRelevant = article.relevance_score >= 7
  const isHighImpact = article.impact_score >= 7
  const isBreaking = article.is_breaking
  const isFeatured = article.is_featured

  // Convert impact_score to fantasy_impact for display
  const getFantasyImpact = (score: number): 'high' | 'medium' | 'low' | 'none' => {
    if (score >= 7) return 'high'
    if (score >= 5) return 'medium'
    if (score >= 3) return 'low'
    return 'none'
  }

  const fantasyImpact = getFantasyImpact(article.impact_score)

  return (
    <Card className={`news-article bg-background/30 border-border/30 hover:bg-background/50 transition-all duration-300 ${
      isAnalyzing ? 'ring-2 ring-purple-500/50 shadow-lg' : ''
    } ${hasAIInsight ? 'border-purple-500/30' : ''} ${isBreaking ? 'border-red-500/50 bg-red-50/5' : ''} ${isFeatured ? 'border-yellow-500/50 bg-yellow-50/5' : ''} ${compact ? 'p-2' : ''}`}>
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div className={compact ? "space-y-2" : "space-y-3"}>
          {/* Breaking/Featured Badge */}
          {(isBreaking || isFeatured) && (
            <div className="flex items-center gap-2">
              {isBreaking && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-300 rounded-full text-xs font-medium animate-pulse">
                  <AlertCircle className="h-3 w-3" />
                  <span>BREAKING</span>
                </div>
              )}
              {isFeatured && (
                <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-medium">
                  <Star className="h-3 w-3" />
                  <span>FEATURED</span>
                </div>
              )}
            </div>
          )}

          {/* Title and Image Row */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary transition-colors cursor-pointer"
                  onClick={() => window.open(article.url, '_blank')}>
                {article.title}
              </h3>
            </div>
            {article.image_url && (
              <div className="flex-shrink-0">
                <img 
                  src={article.image_url} 
                  alt={article.title}
                  className="w-16 h-16 rounded-lg object-cover border border-border/30"
                />
              </div>
            )}
          </div>
          
          {/* AI Analysis Indicators */}
          <div className="flex items-center gap-2 flex-wrap">
            {isAnalyzing && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs animate-pulse">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-300"></div>
                <span>AI Analyzing</span>
              </div>
            )}
            
            {hasAIInsight && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-300 rounded-full text-xs">
                <Brain className="h-3 w-3" />
                <span>AI Insight Available</span>
              </div>
            )}
            
            {isHighlyRelevant && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs">
                <Star className="h-3 w-3" />
                <span>Highly Relevant</span>
              </div>
            )}
          </div>
          
          {/* Summary */}
          {article.summary && !compact && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {article.summary}
            </p>
          )}
          
          {/* Players Mentioned */}
          {article.players && article.players.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Players:</span>
              {article.players.slice(0, compact ? 2 : 3).map((player, index) => (
                <span key={index} className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {player.player_name}
                </span>
              ))}
              {article.players.length > 3 && (
                <span className="text-xs text-muted-foreground">+{article.players.length - 3} more</span>
              )}
            </div>
          )}
          
          {/* Tags */}
          <div className="flex items-center space-x-2 flex-wrap">
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
              fantasyImpact === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
              fantasyImpact === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
              fantasyImpact === 'low' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
              'bg-gray-500/20 text-gray-300 border-gray-500/30'
            }`}>
              {fantasyImpact === 'high' ? '🔥 High Impact' :
               fantasyImpact === 'medium' ? '⚡ Medium Impact' :
               fantasyImpact === 'low' ? '📊 Low Impact' : '📰 No Impact'}
            </span>
            {!compact && (
              <>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  article.sentiment === 'positive' ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                  article.sentiment === 'negative' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                  'bg-gray-500/20 text-gray-300 border-gray-500/30'
                }`}>
                  {article.sentiment === 'positive' ? '😊 Positive' :
                   article.sentiment === 'negative' ? '😞 Negative' : '😐 Neutral'}
                </span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {article.category}
                </span>
                {showSource && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {article.source}
                  </span>
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  article.relevance_score >= 7 ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' :
                  article.relevance_score >= 5 ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                  'bg-gray-500/20 text-gray-300 border-gray-500/30'
                }`}>
                  <TrendingUp className="h-3 w-3 inline mr-1" />
                  {article.relevance_score}/10 relevant
                </span>
              </>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(article.published_at).toLocaleDateString()}
            </div>
            
            <div className="flex items-center gap-2">
              {hasAIInsight && !compact && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAIInsights(!showAIInsights)}
                  className="text-xs hover:bg-purple-500/10 transition-colors border-purple-500/30"
                >
                  <Brain className="h-3 w-3 mr-1" />
                  {showAIInsights ? 'Hide' : 'Show'} AI Insights
                  {showAIInsights ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                </Button>
              )}
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onTrackClick(article.article_id)
                  window.open(article.url, '_blank')
                }}
                className="text-xs hover:bg-primary/10 transition-colors"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Read
              </Button>
            </div>
          </div>
        </div>
        
        {/* AI Insights Section */}
        {showAIInsights && articleInsight && (
          <div className="mt-4 pt-4 border-t border-border/30 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-purple-500" />
                <h4 className="text-sm font-medium text-purple-500">Fantasy AI Analysis</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  articleInsight.fantasy_insights.fantasy_impact === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                  articleInsight.fantasy_insights.fantasy_impact === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                  articleInsight.fantasy_insights.fantasy_impact === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                }`}>
                  {articleInsight.fantasy_insights.fantasy_impact} impact
                </span>
              </div>

              {/* Fantasy Summary */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  {articleInsight.fantasy_insights.summary}
                </p>
              </div>

              {/* Key Points */}
              {articleInsight.fantasy_insights.key_points && articleInsight.fantasy_insights.key_points.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    Key Fantasy Points
                  </h5>
                  <ul className="space-y-1">
                    {articleInsight.fantasy_insights.key_points.map((point: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start">
                        <span className="text-purple-500 mr-2 mt-0.5">•</span>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Affected Players */}
              {articleInsight.fantasy_insights.affected_players && articleInsight.fantasy_insights.affected_players.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground">Affected Players</h5>
                  <div className="grid grid-cols-1 gap-2">
                    {articleInsight.fantasy_insights.affected_players.map((player: any, i: number) => (
                      <div key={i} className={`p-2 rounded border ${
                        player.fantasy_impact === 'positive' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' :
                        player.fantasy_impact === 'negative' ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' :
                        'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{player.player_name}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            player.fantasy_impact === 'positive' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                            player.fantasy_impact === 'negative' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                            'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                          }`}>
                            {player.fantasy_impact}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{player.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Fantasy Recommendation */}
              <div className="p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
                <h5 className="text-xs font-medium text-primary mb-1">Fantasy Recommendation</h5>
                <p className="text-xs text-primary/80">{articleInsight.fantasy_insights.fantasy_recommendation}</p>
              </div>

              {/* Immediate Action */}
              {articleInsight.fantasy_insights.immediate_action && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border-l-4 border-yellow-500">
                  <h5 className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Immediate Action Required
                  </h5>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">{articleInsight.fantasy_insights.immediate_action}</p>
                </div>
              )}

              {/* Long-term Impact */}
              {articleInsight.fantasy_insights.long_term_impact && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <h5 className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Long-term Impact</h5>
                  <p className="text-xs text-blue-700 dark:text-blue-400">{articleInsight.fantasy_insights.long_term_impact}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EnhancedNewsArticle
