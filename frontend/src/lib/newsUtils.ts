import { NewsItem, NewsToolbarFilters } from '../types/dashboard'

/**
 * Normalize URL to canonical form for de-duplication
 * - Lowercase host and path
 * - Strip query params and UTM tags
 */
export function canonicalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const canonical = `${urlObj.protocol}//${urlObj.host.toLowerCase()}${urlObj.pathname.toLowerCase()}`
    return canonical.replace(/\/$/, '') // Remove trailing slash
  } catch {
    return url.toLowerCase()
  }
}

/**
 * Jaro-Winkler distance for fuzzy string matching
 * Returns a value between 0 and 1, where 1 is an exact match
 */
function jaroWinkler(s1: string, s2: string): number {
  const m = s1.length
  const n = s2.length
  
  if (m === 0) return n === 0 ? 1 : 0
  
  const matchDistance = Math.floor(Math.max(m, n) / 2) - 1
  const s1Matches = new Array(m).fill(false)
  const s2Matches = new Array(n).fill(false)
  
  let matches = 0
  let transpositions = 0
  
  // Find matches
  for (let i = 0; i < m; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, n)
    
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }
  
  if (matches === 0) return 0
  
  // Count transpositions
  let k = 0
  for (let i = 0; i < m; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }
  
  const jaro = (matches / m + matches / n + (matches - transpositions / 2) / matches) / 3
  
  // Jaro-Winkler bonus for matching prefixes
  let prefixLength = 0
  for (let i = 0; i < Math.min(4, Math.min(m, n)); i++) {
    if (s1[i] === s2[i]) prefixLength++
    else break
  }
  
  return jaro + prefixLength * 0.1 * (1 - jaro)
}

/**
 * Normalize title for fuzzy matching
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * De-duplicate and cluster news items
 * - Exact URL matches are clustered
 * - Fuzzy title matches within 72h are clustered
 */
export function deduplicateNews(items: NewsItem[]): NewsItem[] {
  const urlMap = new Map<string, NewsItem[]>()
  
  // Group by canonical URL
  items.forEach(item => {
    const canonical = canonicalizeUrl(item.url)
    const existing = urlMap.get(canonical) || []
    existing.push(item)
    urlMap.set(canonical, existing)
  })
  
  const clusters: NewsItem[][] = []
  
  // Process URL-based clusters
  urlMap.forEach(group => {
    if (group.length > 1) {
      clusters.push(group)
    } else {
      clusters.push(group)
    }
  })
  
  // Fuzzy match titles within 72h window
  const processed = new Set<string>()
  const finalClusters: NewsItem[][] = []
  
  clusters.forEach(cluster => {
    if (cluster.length > 1) {
      // Already clustered by URL
      finalClusters.push(cluster)
      cluster.forEach(item => processed.add(item.article_id))
      return
    }
    
    const item = cluster[0]
    if (processed.has(item.article_id)) return
    
    const normalizedTitle = normalizeTitle(item.title)
    const publishedTime = new Date(item.published_at).getTime()
    const relatedItems: NewsItem[] = [item]
    
    // Find fuzzy matches
    clusters.forEach(otherCluster => {
      const other = otherCluster[0]
      if (other.article_id === item.article_id || processed.has(other.article_id)) return
      
      const otherTime = new Date(other.published_at).getTime()
      const timeDiff = Math.abs(publishedTime - otherTime) / (1000 * 60 * 60) // hours
      
      if (timeDiff <= 72) {
        const similarity = jaroWinkler(normalizedTitle, normalizeTitle(other.title))
        if (similarity >= 0.90) {
          relatedItems.push(other)
          processed.add(other.article_id)
        }
      }
    })
    
    processed.add(item.article_id)
    finalClusters.push(relatedItems)
  })
  
  // Select lead item from each cluster and attach related items
  return finalClusters.map(cluster => {
    if (cluster.length === 1) {
      return { ...cluster[0], canonical_url: canonicalizeUrl(cluster[0].url) }
    }
    
    // Sort by priority/impact to select lead
    const sorted = [...cluster].sort((a, b) => {
      if (b.impact_score !== a.impact_score) return b.impact_score - a.impact_score
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    })
    
    const lead = sorted[0]
    const related = sorted.slice(1)
    
    return {
      ...lead,
      relatedItems: related,
      canonical_url: canonicalizeUrl(lead.url)
    }
  })
}

/**
 * Calculate priority score for "Top" ranking
 */
export function calculatePriority(
  item: NewsItem,
  userRoster?: string[],
  followedEntities?: string[]
): number {
  const now = Date.now()
  const publishedTime = new Date(item.published_at).getTime()
  const hoursSincePublished = (now - publishedTime) / (1000 * 60 * 60)
  
  // Recency score (exponential decay)
  const recency = Math.exp(-hoursSincePublished / 18)
  
  // Impact and relevance (normalized to 0-1)
  const impact = Math.min(10, Math.max(0, item.impact_score)) / 10
  const relevance = Math.min(10, Math.max(0, item.relevance_score)) / 10
  
  // Breaking news boost
  const breakingBoost = item.is_breaking ? 0.15 : 0
  
  // Roster boost
  let rosterBoost = 0
  if (userRoster && userRoster.length > 0) {
    const hasRosterPlayer = item.players.some(player => 
      userRoster.some(rosterPlayer => 
        player.toLowerCase().includes(rosterPlayer.toLowerCase()) ||
        rosterPlayer.toLowerCase().includes(player.toLowerCase())
      )
    )
    const hasRosterTeam = item.teams.some(team => userRoster.includes(team))
    if (hasRosterPlayer || hasRosterTeam) rosterBoost = 0.20
  }
  
  // Follow boost
  let followBoost = 0
  if (followedEntities && followedEntities.length > 0) {
    const hasFollowed = [...item.players, ...item.teams].some(entity =>
      followedEntities.includes(entity)
    )
    if (hasFollowed) followBoost = 0.10
  }
  
  // Calculate final priority
  const priority = 
    0.40 * recency +
    0.30 * impact +
    0.20 * relevance +
    breakingBoost +
    rosterBoost +
    followBoost
  
  return priority
}

/**
 * Sort news items by specified method
 */
export function sortNews(
  items: NewsItem[],
  sortBy: NewsToolbarFilters['sort'],
  userRoster?: string[],
  followedEntities?: string[]
): NewsItem[] {
  const sorted = [...items]
  
  switch (sortBy) {
    case 'latest':
      return sorted.sort((a, b) => 
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      )
    
    case 'impact':
      return sorted.sort((a, b) => {
        if (b.impact_score !== a.impact_score) {
          return b.impact_score - a.impact_score
        }
        // Recency as tiebreaker
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      })
    
    case 'team-player':
      return sorted.sort((a, b) => {
        // Calculate entity overlap
        const aEntities = new Set([...a.players, ...a.teams])
        const bEntities = new Set([...b.players, ...b.teams])
        const targetEntities = [...(userRoster || []), ...(followedEntities || [])]
        
        const aOverlap = targetEntities.filter(e => aEntities.has(e)).length
        const bOverlap = targetEntities.filter(e => bEntities.has(e)).length
        
        if (bOverlap !== aOverlap) return bOverlap - aOverlap
        
        // Use priority as tiebreaker
        const aPriority = a.priority || calculatePriority(a, userRoster, followedEntities)
        const bPriority = b.priority || calculatePriority(b, userRoster, followedEntities)
        return bPriority - aPriority
      })
    
    case 'top':
    default:
      return sorted.sort((a, b) => {
        const aPriority = a.priority || calculatePriority(a, userRoster, followedEntities)
        const bPriority = b.priority || calculatePriority(b, userRoster, followedEntities)
        return bPriority - aPriority
      })
  }
}

/**
 * Filter news items based on toolbar filters
 */
export function filterNews(
  items: NewsItem[],
  filters: NewsToolbarFilters,
  userRoster?: string[],
  leagueData?: any
): NewsItem[] {
  let filtered = [...items]
  
  // Time window filter
  if (filters.timeWindow !== 'all') {
    const now = Date.now()
    const hours = filters.timeWindow === '24h' ? 24 : filters.timeWindow === '3d' ? 72 : 168
    const cutoff = now - (hours * 60 * 60 * 1000)
    
    filtered = filtered.filter(item => 
      new Date(item.published_at).getTime() >= cutoff
    )
  }
  
  // Search filter
  if (filters.search.trim()) {
    const searchLower = filters.search.toLowerCase()
    filtered = filtered.filter(item =>
      item.title.toLowerCase().includes(searchLower) ||
      item.summary?.toLowerCase().includes(searchLower) ||
      item.players.some(p => p.toLowerCase().includes(searchLower)) ||
      item.teams.some(t => t.toLowerCase().includes(searchLower))
    )
  }
  
  // My Lens filter
  if (filters.myLens === 'my-roster' && userRoster && userRoster.length > 0) {
    filtered = filtered.filter(item => {
      const hasRosterPlayer = item.players.some(player =>
        userRoster.some(rosterPlayer =>
          player.toLowerCase().includes(rosterPlayer.toLowerCase()) ||
          rosterPlayer.toLowerCase().includes(player.toLowerCase())
        )
      )
      const hasRosterTeam = item.teams.some(team => userRoster.includes(team))
      return hasRosterPlayer || hasRosterTeam
    })
  } else if (filters.myLens === 'my-league' && leagueData) {
    // Filter by league-relevant players/teams
    const leaguePlayers = leagueData.players || []
    filtered = filtered.filter(item =>
      item.players.some(player => leaguePlayers.includes(player))
    )
  }
  
  // Category filter
  if (filters.categories.length > 0) {
    filtered = filtered.filter(item =>
      item.category && filters.categories.includes(item.category)
    )
  }
  
  // Source filter
  if (filters.sources.length > 0) {
    filtered = filtered.filter(item =>
      filters.sources.includes(item.source)
    )
  }
  
  // Impact minimum filter
  if (filters.impactMin > 0) {
    filtered = filtered.filter(item =>
      item.impact_score >= filters.impactMin
    )
  }
  
  // Sentiment filter
  if (filters.sentiments.length > 0 && filters.sentiments.length < 3) {
    filtered = filtered.filter(item =>
      filters.sentiments.includes(item.sentiment)
    )
  }
  
  // Breaking only filter
  if (filters.breakingOnly) {
    filtered = filtered.filter(item => item.is_breaking === true)
  }
  
  return filtered
}

/**
 * Convert FantasyNewsArticle to NewsItem
 */
export function convertToNewsItem(article: any): NewsItem {
  const players = article.players?.map((p: any) => p.player_name || p) || []
  const teams = article.teams || []
  
  return {
    _id: article._id,
    article_id: article.article_id,
    title: article.title,
    summary: article.summary || null,
    url: article.url,
    source: article.source,
    author: article.author || null,
    published_at: article.published_at,
    scraped_at: article.scraped_at,
    category: article.category || 'general',
    impact_score: article.impact_score || 5,
    sentiment: article.sentiment || 'neutral',
    relevance_score: article.relevance_score || 5,
    players: Array.isArray(players) ? players : [],
    teams: Array.isArray(teams) ? teams : [],
    image_url: article.image_url || null,
    is_breaking: article.is_breaking || false,
    is_featured: article.is_featured || false,
    status: article.status || 'active',
    ai_insights: article.ai_insights?.map((i: any) => 
      typeof i === 'string' ? i : i.insight || ''
    ).filter(Boolean) || []
  }
}

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
export function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const published = new Date(dateString).getTime()
  const diff = now - published
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return new Date(dateString).toLocaleDateString()
}

/**
 * Get category display info
 */
export function getCategoryInfo(category?: string): { label: string; color: string } {
  const categoryMap: Record<string, { label: string; color: string }> = {
    injury: { label: 'Injury', color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
    trade: { label: 'Trade', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
    signing: { label: 'Signing', color: 'bg-green-500/10 text-green-600 dark:text-green-400' },
    performance: { label: 'Performance', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
    depth_chart: { label: 'Depth Chart', color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
    coaching: { label: 'Coaching', color: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400' },
    suspension: { label: 'Suspension', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' },
    transaction: { label: 'Transaction', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' },
    analysis: { label: 'Analysis', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    rumor: { label: 'Rumor', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  }
  
  return categoryMap[category || 'general'] || { label: 'News', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400' }
}

/**
 * Get sentiment color
 */
export function getSentimentColor(sentiment: 'positive' | 'neutral' | 'negative'): string {
  const colors = {
    positive: 'bg-green-500',
    neutral: 'bg-gray-400',
    negative: 'bg-red-500'
  }
  return colors[sentiment] || colors.neutral
}

