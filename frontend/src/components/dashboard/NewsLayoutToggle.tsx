/**
 * @deprecated This component is deprecated. Layout controls are now integrated into NewsToolbar.
 * This file is kept for backward compatibility and will be removed in a future version.
 */

import React from 'react'
import { LayoutGrid, Columns, Settings } from 'lucide-react'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

export type NewsLayoutMode = 'single' | 'multi-column' | 'custom'

interface NewsLayoutToggleProps {
  layoutMode: NewsLayoutMode
  onLayoutModeChange: (mode: NewsLayoutMode) => void
  visibleSources: string[]
  onVisibleSourcesChange: (sources: string[]) => void
  availableSources: string[]
  className?: string
}

const NewsLayoutToggle: React.FC<NewsLayoutToggleProps> = ({
  layoutMode,
  onLayoutModeChange,
  visibleSources,
  onVisibleSourcesChange,
  availableSources,
  className = ''
}) => {
  const handleSourceToggle = (source: string) => {
    if (visibleSources.includes(source)) {
      onVisibleSourcesChange(visibleSources.filter(s => s !== source))
    } else {
      onVisibleSourcesChange([...visibleSources, source])
    }
  }

  const getLayoutIcon = (mode: NewsLayoutMode) => {
    switch (mode) {
      case 'single':
        return <Columns className="h-4 w-4" />
      case 'multi-column':
        return <LayoutGrid className="h-4 w-4" />
      case 'custom':
        return <Settings className="h-4 w-4" />
      default:
        return <Columns className="h-4 w-4" />
    }
  }

  return (
    <Card className={`glass border-border ${className}`}>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Layout Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Layout:</span>
            <div className="flex gap-1">
              <Button
                variant={layoutMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onLayoutModeChange('single')}
                className="h-8 px-3"
              >
                <Columns className="h-3 w-3 mr-1" />
                Single
              </Button>
              <Button
                variant={layoutMode === 'multi-column' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onLayoutModeChange('multi-column')}
                className="h-8 px-3"
              >
                <LayoutGrid className="h-3 w-3 mr-1" />
                Multi
              </Button>
              <Button
                variant={layoutMode === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => onLayoutModeChange('custom')}
                className="h-8 px-3"
              >
                <Settings className="h-3 w-3 mr-1" />
                Custom
              </Button>
            </div>
          </div>

          {/* Source Selection (only show for multi-column and custom modes) */}
          {(layoutMode === 'multi-column' || layoutMode === 'custom') && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Sources:</span>
              <div className="flex flex-wrap gap-2">
                {availableSources.map(source => (
                  <Button
                    key={source}
                    variant={visibleSources.includes(source) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSourceToggle(source)}
                    className="h-7 px-2 text-xs"
                  >
                    {source}
                  </Button>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                {visibleSources.length} of {availableSources.length} sources selected
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVisibleSourcesChange(availableSources)}
              className="h-7 px-2 text-xs"
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVisibleSourcesChange(['ESPN', 'FantasyPros'])}
              className="h-7 px-2 text-xs"
            >
              Top Sources
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onVisibleSourcesChange([])}
              className="h-7 px-2 text-xs"
            >
              Clear All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default NewsLayoutToggle
