/**
 * @deprecated This component is deprecated. Use NewsToolbar from ./NewsToolbar.tsx instead.
 * This file is kept for backward compatibility and will be removed in a future version.
 */

import React from 'react'
import { Search, Filter } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { NewsFilters } from '../../types/dashboard'

interface NewsFiltersProps {
  filters: NewsFilters
  filteredCount: number
  totalCount: number
  onFiltersChange: (filters: Partial<NewsFilters>) => void
  onClearFilters: () => void
}

const NewsFiltersComponent: React.FC<NewsFiltersProps> = ({
  filters,
  filteredCount,
  totalCount,
  onFiltersChange,
  onClearFilters
}) => {
  const hasActiveFilters = filters.selectedCategory !== 'ALL' || 
    filters.selectedImpact !== 'ALL' || 
    filters.selectedSource !== 'ALL' || 
    filters.selectedSentiment !== 'ALL' || 
    filters.minRelevanceScore > 0 || 
    filters.searchTerm

  return (
    <Card className="glass border-border">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search news articles, players, teams, keywords..."
                  value={filters.searchTerm}
                  onChange={(e) => onFiltersChange({ searchTerm: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Category Filter */}
            <Select value={filters.selectedCategory} onValueChange={(value) => onFiltersChange({ selectedCategory: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                <SelectItem value="injury">Injury</SelectItem>
                <SelectItem value="trade">Trade</SelectItem>
                <SelectItem value="signing">Signing</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="roster">Roster</SelectItem>
                <SelectItem value="coaching">Coaching</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="analysis">Analysis</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
              </SelectContent>
            </Select>

            {/* Fantasy Impact Filter */}
            <Select value={filters.selectedImpact} onValueChange={(value) => onFiltersChange({ selectedImpact: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Impact</SelectItem>
                <SelectItem value="high">High Impact</SelectItem>
                <SelectItem value="medium">Medium Impact</SelectItem>
                <SelectItem value="low">Low Impact</SelectItem>
                <SelectItem value="none">No Impact</SelectItem>
              </SelectContent>
            </Select>

            {/* Source Filter */}
            <Select value={filters.selectedSource} onValueChange={(value) => onFiltersChange({ selectedSource: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sources</SelectItem>
                <SelectItem value="ESPN">ESPN</SelectItem>
                <SelectItem value="NFL">NFL.com</SelectItem>
                <SelectItem value="FantasyPros">FantasyPros</SelectItem>
                <SelectItem value="CBS">CBS Sports</SelectItem>
                <SelectItem value="Yahoo">Yahoo Sports</SelectItem>
                <SelectItem value="BleacherReport">Bleacher Report</SelectItem>
              </SelectContent>
            </Select>

            {/* Sentiment Filter */}
            <Select value={filters.selectedSentiment} onValueChange={(value) => onFiltersChange({ selectedSentiment: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sentiment</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>

            {/* Relevance Score Filter */}
            <Select value={filters.minRelevanceScore.toString()} onValueChange={(value) => onFiltersChange({ minRelevanceScore: parseInt(value) })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Min Relevance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">All Scores</SelectItem>
                <SelectItem value="40">40+ (Good)</SelectItem>
                <SelectItem value="50">50+ (Better)</SelectItem>
                <SelectItem value="60">60+ (Best)</SelectItem>
                <SelectItem value="70">70+ (Excellent)</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort Filter */}
            <Select value={filters.sortBy} onValueChange={(value: 'smart' | 'published_at' | 'relevance_score' | 'impact_score') => onFiltersChange({ sortBy: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smart">Smart (Default)</SelectItem>
                <SelectItem value="published_at">Latest</SelectItem>
                <SelectItem value="relevance_score">Most Relevant</SelectItem>
                <SelectItem value="impact_score">Highest Impact</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Showing {filteredCount} of {totalCount} articles</span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearFilters}
                  className="h-6 px-2 text-xs"
                >
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Smart sorting: High impact + high relevance first</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default NewsFiltersComponent
