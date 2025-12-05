// Re-export hooks from separate files for backward compatibility
export { usePollingStatus } from './usePollingStatus'
export { useSyncOperations } from './useSyncOperations'
export { useConfig } from './useConfig'

import { useState, useEffect } from 'react'
import { 
  getESPNFreshness, 
  getNews, 
  getNewsStats, 
  getAIStatus
} from '../services/api'
import { 
  FantasyNewsArticle, 
  NewsFilters, 
  ESPNFreshness, 
  NewsStats, 
  AIStatus
} from '../types/dashboard'

// Hook for managing news data and filtering
export const useNewsData = (filters: NewsFilters) => {
  const [news, setNews] = useState<FantasyNewsArticle[]>([])
  const [filteredNews, setFilteredNews] = useState<FantasyNewsArticle[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchNews = async () => {
    try {
      setIsLoading(true)
      const data = await getNews({
        limit: 50,
        sort_by: filters.sortBy === 'smart' ? 'relevance_score' : filters.sortBy,
        sort_order: 'desc',
        category: filters.selectedCategory !== 'ALL' ? filters.selectedCategory : undefined,
        source: filters.selectedSource !== 'ALL' ? filters.selectedSource : undefined,
        sentiment: filters.selectedSentiment !== 'ALL' ? filters.selectedSentiment : undefined,
        min_relevance_score: filters.minRelevanceScore,
        search: filters.searchTerm || undefined
      })
      if (data.success) {
        setNews(data.data.articles || [])
      } else {
        setNews([])
      }
    } catch (error) {
      setNews([])
    } finally {
      setIsLoading(false)
    }
  }

  const filterNews = () => {
    if (!news || !Array.isArray(news)) {
      setFilteredNews([])
      return
    }

    let filtered = [...news]

    // Apply filters
    if (filters.selectedCategory !== 'ALL') {
      filtered = filtered.filter(article => article.category === filters.selectedCategory)
    }

    if (filters.selectedImpact !== 'ALL') {
      // Convert impact_score to fantasy_impact for filtering
      const getFantasyImpact = (score: number): 'high' | 'medium' | 'low' | 'none' => {
        if (score >= 7) return 'high'
        if (score >= 5) return 'medium'
        if (score >= 3) return 'low'
        return 'none'
      }
      filtered = filtered.filter(article => getFantasyImpact(article.impact_score) === filters.selectedImpact)
    }

    if (filters.selectedSource !== 'ALL') {
      filtered = filtered.filter(article => article.source === filters.selectedSource)
    }

    if (filters.selectedSentiment !== 'ALL') {
      filtered = filtered.filter(article => article.sentiment === filters.selectedSentiment)
    }

    if (filters.minRelevanceScore > 0) {
      filtered = filtered.filter(article => article.relevance_score >= filters.minRelevanceScore)
    }

    if (filters.searchTerm) {
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        (article.summary && article.summary.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        article.players?.some(p => p.player_name.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        article.teams?.some(team => team.toLowerCase().includes(filters.searchTerm.toLowerCase())) ||
        article.keywords?.some(keyword => keyword.toLowerCase().includes(filters.searchTerm.toLowerCase()))
      )
    }

    // Apply sorting
    if (filters.sortBy === 'smart') {
      filtered.sort((a, b) => {
        // Convert impact_score to fantasy_impact for sorting
        const getFantasyImpact = (score: number): 'high' | 'medium' | 'low' | 'none' => {
          if (score >= 7) return 'high'
          if (score >= 5) return 'medium'
          if (score >= 3) return 'low'
          return 'none'
        }
        
        const impactPriority = { high: 4, medium: 3, low: 2, none: 1 }
        const aImpact = impactPriority[getFantasyImpact(a.impact_score)] || 0
        const bImpact = impactPriority[getFantasyImpact(b.impact_score)] || 0
        
        if (aImpact !== bImpact) {
          return bImpact - aImpact
        }
        
        if (a.relevance_score !== b.relevance_score) {
          return b.relevance_score - a.relevance_score
        }
        
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      })
    } else if (filters.sortBy === 'published_at') {
      filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    } else if (filters.sortBy === 'relevance_score') {
      filtered.sort((a, b) => b.relevance_score - a.relevance_score)
    } else if (filters.sortBy === 'impact_score') {
      filtered.sort((a, b) => b.impact_score - a.impact_score)
    }

    setFilteredNews(filtered)
  }

  useEffect(() => {
    fetchNews()
  }, [])

  useEffect(() => {
    filterNews()
  }, [news, filters])

  return {
    news,
    filteredNews,
    isLoading,
    fetchNews,
    filterNews
  }
}

// Hook for managing dashboard stats
export const useDashboardStats = () => {
  const [espnFreshness, setEspnFreshness] = useState<ESPNFreshness | null>(null)
  const [newsStats, setNewsStats] = useState<NewsStats | null>(null)
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null)

  const fetchESPNFreshness = async () => {
    try {
      const data = await getESPNFreshness()
      if (data.success) {
        setEspnFreshness(data.data || null)
      } else {
        setEspnFreshness(null)
      }
    } catch (error) {
      setEspnFreshness(null)
    }
  }

  const fetchNewsStats = async () => {
    try {
      const data = await getNewsStats()
      if (data.success) {
        setNewsStats(data.data || null)
      } else {
        setNewsStats(null)
      }
    } catch (error) {
      setNewsStats(null)
    }
  }

  const fetchAIStatus = async () => {
    try {
      const data = await getAIStatus()
      if (data.success) {
        setAiStatus(data.data || null)
      } else {
        setAiStatus(null)
      }
    } catch (error) {
      setAiStatus(null)
    }
  }

  useEffect(() => {
    fetchESPNFreshness()
    fetchNewsStats()
    fetchAIStatus()
  }, [])

  return {
    espnFreshness,
    newsStats,
    aiStatus,
    fetchESPNFreshness,
    fetchNewsStats,
    fetchAIStatus
  }
}

