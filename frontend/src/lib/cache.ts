/**
 * Browser caching utilities for storing and retrieving data with timestamps
 * Uses sessionStorage for temporary caching (cleared when tab closes)
 */

interface CachedData<T> {
  data: T
  timestamp: number
  key: string
}

const CACHE_PREFIX = 'ffa_cache_'
const DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes default TTL

/**
 * Get a cache key with prefix
 */
function getCacheKey(key: string): string {
  return `${CACHE_PREFIX}${key}`
}

/**
 * Store data in sessionStorage with timestamp
 */
export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    const cacheKey = getCacheKey(key)
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      key: cacheKey
    }
    sessionStorage.setItem(cacheKey, JSON.stringify(cached))
  } catch (error) {
    // Handle quota exceeded or other storage errors silently
    console.warn('Failed to cache data:', error)
  }
}

/**
 * Retrieve cached data if it exists and hasn't expired
 */
export function getCache<T>(key: string, maxAge?: number): T | null {
  try {
    const cacheKey = getCacheKey(key)
    const cachedStr = sessionStorage.getItem(cacheKey)
    
    if (!cachedStr) {
      return null
    }

    const cached: CachedData<T> = JSON.parse(cachedStr)
    const age = Date.now() - cached.timestamp
    const maxAgeToUse = maxAge ?? DEFAULT_TTL

    // Check if cache is still valid
    if (age > maxAgeToUse) {
      // Cache expired, remove it
      sessionStorage.removeItem(cacheKey)
      return null
    }

    return cached.data
  } catch (error) {
    // Handle corrupted cache data
    console.warn('Failed to retrieve cached data:', error)
    try {
      const cacheKey = getCacheKey(key)
      sessionStorage.removeItem(cacheKey)
    } catch {
      // Ignore cleanup errors
    }
    return null
  }
}

/**
 * Remove cached data
 */
export function removeCache(key: string): void {
  try {
    const cacheKey = getCacheKey(key)
    sessionStorage.removeItem(cacheKey)
  } catch (error) {
    // Ignore errors
  }
}

/**
 * Clear all cached data with the prefix
 */
export function clearAllCache(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key))
  } catch (error) {
    console.warn('Failed to clear cache:', error)
  }
}

/**
 * Get cache age in milliseconds
 */
export function getCacheAge(key: string): number | null {
  try {
    const cacheKey = getCacheKey(key)
    const cachedStr = sessionStorage.getItem(cacheKey)
    
    if (!cachedStr) {
      return null
    }

    const cached: CachedData<unknown> = JSON.parse(cachedStr)
    return Date.now() - cached.timestamp
  } catch {
    return null
  }
}

