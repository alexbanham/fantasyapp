import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { NewsItem, NewsToolbarFilters, SavedFilterPreset } from '../types/dashboard'
import { getNews } from '../services/api'
import {
  convertToNewsItem,
  deduplicateNews,
  filterNews,
  sortNews,
  calculatePriority
} from '../lib/newsUtils'

const SAVED_PRESETS_KEY = 'news-feed-presets'
const READ_ITEMS_KEY = 'news-feed-read-items'

// Default filters
const defaultFilters: NewsToolbarFilters = {
  search: '',
  timeWindow: '7d',
  sort: 'top',
  myLens: 'all',
  categories: [],
  sources: [],
  impactMin: 0,
  sentiments: [],
  breakingOnly: false,
  groupSimilar: true
}

export function useNewsFeed(userRoster?: string[], followedEntities?: string[]) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState<NewsToolbarFilters>(defaultFilters)
  const [rawItems, setRawItems] = useState<NewsItem[]>([])
  const [processedItems, setProcessedItems] = useState<NewsItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>([])
  const [readItems, setReadItems] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const fetchingRef = useRef(false)

  // Load saved presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SAVED_PRESETS_KEY)
      if (stored) {
        setSavedPresets(JSON.parse(stored))
      }
    } catch (err) {
    }
  }, [])

  // Load read items from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(READ_ITEMS_KEY)
      if (stored) {
        setReadItems(new Set(JSON.parse(stored)))
      }
    } catch (err) {
    }
  }, [])

  // Restore filters from URL on mount
  useEffect(() => {
    const urlFilters = parseFiltersFromUrl(searchParams)
    if (Object.keys(urlFilters).length > 0) {
      setFilters(prev => ({ ...prev, ...urlFilters }))
    }
  }, []) // Only run once on mount

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams()
    
    if (filters.search) params.set('search', filters.search)
    if (filters.timeWindow !== '7d') params.set('time', filters.timeWindow)
    if (filters.sort !== 'top') params.set('sort', filters.sort)
    if (filters.myLens !== 'all') params.set('lens', filters.myLens)
    if (filters.categories.length > 0) params.set('cat', filters.categories.join(','))
    if (filters.sources.length > 0) params.set('src', filters.sources.join(','))
    if (filters.impactMin > 0) params.set('impact', filters.impactMin.toString())
    if (filters.sentiments.length > 0) params.set('sent', filters.sentiments.join(','))
    if (filters.breakingOnly) params.set('breaking', '1')
    if (!filters.groupSimilar) params.set('nogroup', '1')
    
    setSearchParams(params, { replace: true })
  }, [filters, setSearchParams])

  // Fetch news data
  const fetchNews = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (fetchingRef.current) return
    
    try {
      fetchingRef.current = true
      setIsLoading(true)
      setError(null)
      
      // Build API query params
      const apiParams: any = {
        page: pageNum,
        limit: 50,
        sort_by: 'published_at',
        sort_order: 'desc'
      }
      
      // Apply time window to API call for efficiency
      if (filters.timeWindow !== 'all') {
        const hours = filters.timeWindow === '24h' ? 24 : filters.timeWindow === '3d' ? 72 : 168
        apiParams.hours = hours
      }
      
      const response = await getNews(apiParams)
      
      if (response.success && response.data.articles) {
        const newsItems = response.data.articles.map(convertToNewsItem)
        
        if (append) {
          setRawItems(prev => [...prev, ...newsItems])
        } else {
          setRawItems(newsItems)
        }
        
        setHasMore(newsItems.length === 50)
        setPage(pageNum)
      } else {
        setError(response.message || 'Failed to fetch news')
        setHasMore(false)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching news')
      setHasMore(false)
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [filters.timeWindow])

  // Initial fetch
  useEffect(() => {
    fetchNews(1, false)
  }, [filters.timeWindow]) // Refetch when time window changes

  // Process items (filter, deduplicate, sort, calculate priority)
  useEffect(() => {
    let processed = [...rawItems]
    
    // Apply client-side filters
    processed = filterNews(processed, filters, userRoster)
    
    // Calculate priority for each item
    processed = processed.map(item => ({
      ...item,
      priority: calculatePriority(item, userRoster, followedEntities),
      isRead: readItems.has(item.article_id)
    }))
    
    // Deduplicate and cluster if enabled
    if (filters.groupSimilar) {
      processed = deduplicateNews(processed)
    }
    
    // Sort items
    processed = sortNews(processed, filters.sort, userRoster, followedEntities)
    
    setProcessedItems(processed)
  }, [rawItems, filters, userRoster, followedEntities, readItems])

  // Load more (infinite scroll)
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore && !fetchingRef.current) {
      fetchNews(page + 1, true)
    }
  }, [isLoading, hasMore, page, fetchNews])

  // Update filters
  const updateFilters = useCallback((updates: Partial<NewsToolbarFilters>) => {
    setFilters(prev => ({ ...prev, ...updates }))
  }, [])

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
  }, [])

  // Save preset
  const savePreset = useCallback((name: string) => {
    const preset: SavedFilterPreset = {
      id: Date.now().toString(),
      name,
      filters: { ...filters },
      createdAt: new Date().toISOString()
    }
    
    const updated = [...savedPresets, preset]
    setSavedPresets(updated)
    
    try {
      localStorage.setItem(SAVED_PRESETS_KEY, JSON.stringify(updated))
    } catch (err) {
    }
  }, [filters, savedPresets])

  // Load preset
  const loadPreset = useCallback((presetId: string) => {
    const preset = savedPresets.find(p => p.id === presetId)
    if (preset) {
      setFilters(preset.filters)
    }
  }, [savedPresets])

  // Delete preset
  const deletePreset = useCallback((presetId: string) => {
    const updated = savedPresets.filter(p => p.id !== presetId)
    setSavedPresets(updated)
    
    try {
      localStorage.setItem(SAVED_PRESETS_KEY, JSON.stringify(updated))
    } catch (err) {
    }
  }, [savedPresets])

  // Mark as read
  const markAsRead = useCallback((articleId: string) => {
    setReadItems(prev => {
      const updated = new Set(prev)
      updated.add(articleId)
      
      try {
        localStorage.setItem(READ_ITEMS_KEY, JSON.stringify([...updated]))
      } catch (err) {
      }
      
      return updated
    })
  }, [])

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    const allIds = processedItems.map(item => item.article_id)
    setReadItems(prev => {
      const updated = new Set([...prev, ...allIds])
      
      try {
        localStorage.setItem(READ_ITEMS_KEY, JSON.stringify([...updated]))
      } catch (err) {
      }
      
      return updated
    })
  }, [processedItems])

  // Refresh
  const refresh = useCallback(() => {
    setPage(1)
    setHasMore(true)
    fetchNews(1, false)
  }, [fetchNews])

  return {
    items: processedItems,
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
    markAllAsRead,
    loadMore,
    refresh
  }
}

// Parse filters from URL search params
function parseFiltersFromUrl(searchParams: URLSearchParams): Partial<NewsToolbarFilters> {
  const filters: Partial<NewsToolbarFilters> = {}
  
  const search = searchParams.get('search')
  if (search) filters.search = search
  
  const time = searchParams.get('time')
  if (time && ['24h', '3d', '7d', 'all'].includes(time)) {
    filters.timeWindow = time as any
  }
  
  const sort = searchParams.get('sort')
  if (sort && ['top', 'latest', 'impact', 'team-player'].includes(sort)) {
    filters.sort = sort as any
  }
  
  const lens = searchParams.get('lens')
  if (lens && ['all', 'my-roster', 'my-league'].includes(lens)) {
    filters.myLens = lens as any
  }
  
  const cat = searchParams.get('cat')
  if (cat) filters.categories = cat.split(',').filter(Boolean)
  
  const src = searchParams.get('src')
  if (src) filters.sources = src.split(',').filter(Boolean)
  
  const impact = searchParams.get('impact')
  if (impact) {
    const num = parseInt(impact, 10)
    if (!isNaN(num)) filters.impactMin = num
  }
  
  const sent = searchParams.get('sent')
  if (sent) {
    filters.sentiments = sent.split(',').filter(s => 
      ['positive', 'neutral', 'negative'].includes(s)
    ) as any[]
  }
  
  if (searchParams.get('breaking') === '1') filters.breakingOnly = true
  if (searchParams.get('nogroup') === '1') filters.groupSimilar = false
  
  return filters
}

