import React, { useEffect, useRef, useCallback } from 'react'
import { List } from 'react-window'
import AutoSizer from 'react-virtualized-auto-sizer'
import { NewsItem } from '../../types/dashboard'
import NewsCard from './NewsCard'
import { Loader2, AlertCircle, Newspaper } from 'lucide-react'
import { Button } from '../ui/button'

interface NewsGridProps {
  items: NewsItem[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  onLoadMore: () => void
  onMarkRead: (articleId: string) => void
  onPlayerClick?: (player: string) => void
  onTeamClick?: (team: string) => void
  onSourceHide?: (source: string) => void
  onRetry?: () => void
  className?: string
}

const VIRTUALIZATION_THRESHOLD = 200
const PREFETCH_THRESHOLD = 0.7 // Load more at 70% scroll

export const NewsGrid: React.FC<NewsGridProps> = ({
  items,
  isLoading,
  error,
  hasMore,
  onLoadMore,
  onMarkRead,
  onPlayerClick,
  onTeamClick,
  onSourceHide,
  onRetry,
  className = ''
}) => {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldVirtualize = items.length > VIRTUALIZATION_THRESHOLD
  
  // Infinite scroll with Intersection Observer
  useEffect(() => {
    if (!loadMoreRef.current || isLoading || !hasMore || shouldVirtualize) return
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasMore) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )
    
    observerRef.current.observe(loadMoreRef.current)
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [isLoading, hasMore, onLoadMore, shouldVirtualize])
  
  // Handle scroll for prefetching
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || isLoading) return
    
    const target = e.currentTarget
    const scrollPercentage = (target.scrollTop + target.clientHeight) / target.scrollHeight
    
    if (scrollPercentage >= PREFETCH_THRESHOLD) {
      onLoadMore()
    }
  }, [hasMore, isLoading, onLoadMore])
  
  // Error state
  if (error && items.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className}`}>
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load news</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        )}
      </div>
    )
  }
  
  // Loading state (initial)
  if (isLoading && items.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }
  
  // Empty state
  if (!isLoading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Newspaper className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No news found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or check back later
        </p>
      </div>
    )
  }
  
  // Virtualized rendering for large lists
  if (shouldVirtualize) {
    return (
      <div className={`h-[calc(100vh-300px)] ${className}`}>
        <AutoSizer>
          {({ height, width }) => {
            const columnCount = width >= 1280 ? 2 : 1
            const columnWidth = width / columnCount
            const itemsPerRow = columnCount
            const rowCount = Math.ceil(items.length / itemsPerRow)
            
            return (
              <List
                {...({
                  height: height,
                  width: width,
                  itemCount: rowCount,
                  itemSize: columnCount === 2 ? 200 : 250,
                  onScroll: handleScroll,
                  overscanCount: 3
                } as any)}
              >
                {(({ index, style }: { index: number; style: React.CSSProperties }) => {
                  const startIdx = index * itemsPerRow
                  const rowItems = items.slice(startIdx, startIdx + itemsPerRow)
                  
                  return (
                    <div style={style}>
                      <div className={`grid gap-4 px-4 ${columnCount === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {rowItems.map((item) => (
                          <NewsCard
                            key={item.article_id}
                            item={item}
                            onMarkRead={onMarkRead}
                            onPlayerClick={onPlayerClick}
                            onTeamClick={onTeamClick}
                            onSourceHide={onSourceHide}
                          />
                        ))}
                      </div>
                    </div>
                  )
                }) as any}
              </List>
            )
          }}
        </AutoSizer>
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
          </div>
        )}
      </div>
    )
  }
  
  // Standard grid rendering
  return (
    <div 
      ref={containerRef}
      className={`space-y-4 ${className}`}
      onScroll={handleScroll}
    >
      {/* Grid: 2 columns on xl screens, 1 column below */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {items.map((item) => (
          <NewsCard
            key={item.article_id}
            item={item}
            onMarkRead={onMarkRead}
            onPlayerClick={onPlayerClick}
            onTeamClick={onTeamClick}
            onSourceHide={onSourceHide}
          />
        ))}
      </div>
      
      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex items-center justify-center py-8">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading more news...</span>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={onLoadMore}
              className="min-w-[200px]"
            >
              Load More
            </Button>
          )}
        </div>
      )}
      
      {/* No more items */}
      {!hasMore && items.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            You've reached the end • {items.length} articles loaded
          </p>
        </div>
      )}
    </div>
  )
}

// Skeleton loading card
const SkeletonCard: React.FC = () => {
  return (
    <div className="border border-border rounded-lg p-4 animate-pulse">
      <div className="flex gap-4">
        {/* Image skeleton */}
        <div className="w-32 h-24 bg-muted rounded-md flex-shrink-0" />
        
        {/* Content skeleton */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="w-16 h-5 bg-muted rounded" />
            <div className="w-12 h-5 bg-muted rounded" />
            <div className="w-20 h-5 bg-muted rounded" />
          </div>
          
          {/* Title */}
          <div className="space-y-2">
            <div className="w-full h-4 bg-muted rounded" />
            <div className="w-3/4 h-4 bg-muted rounded" />
          </div>
          
          {/* Summary */}
          <div className="space-y-1.5">
            <div className="w-full h-3 bg-muted/60 rounded" />
            <div className="w-5/6 h-3 bg-muted/60 rounded" />
          </div>
          
          {/* Chips */}
          <div className="flex gap-2">
            <div className="w-16 h-6 bg-muted rounded-full" />
            <div className="w-16 h-6 bg-muted rounded-full" />
            <div className="w-12 h-6 bg-muted rounded-full" />
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-2">
            <div className="w-24 h-3 bg-muted rounded" />
            <div className="flex gap-2">
              <div className="w-6 h-6 bg-muted rounded" />
              <div className="w-6 h-6 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewsGrid

