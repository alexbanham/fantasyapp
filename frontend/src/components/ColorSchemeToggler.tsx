import React, { useState } from 'react'
import { Palette, Check, Type } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { useColorScheme } from '../contexts/ColorSchemeContext'
import { useFont } from '../contexts/FontContext'
import { colorPalettes } from '../lib/colorPalettes'
import { fontOptions } from '../lib/fonts'

type TabType = 'colors' | 'fonts'

const ColorSchemeToggler = () => {
  const { colorScheme, setColorScheme } = useColorScheme()
  const { fontFamily, setFontFamily } = useFont()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('colors')

  return (
    <div className="relative">
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Palette className="h-4 w-4" />
        <span className="sr-only">Color Scheme</span>
      </Button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50">
            <Card className="bg-background border-border/30 shadow-xl w-[300px]">
              <CardContent className="p-3">
                {/* Tabs */}
                <div className="flex gap-1 mb-3 pb-2 border-b border-border/30">
                  <button
                    onClick={() => setActiveTab('colors')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                      activeTab === 'colors'
                        ? 'bg-primary/15 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <Palette className="h-3 w-3" />
                    Colors
                  </button>
                  <button
                    onClick={() => setActiveTab('fonts')}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                      activeTab === 'fonts'
                        ? 'bg-primary/15 text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <Type className="h-3 w-3" />
                    Fonts
                  </button>
                </div>

                {/* Content */}
                {activeTab === 'colors' && (
                  <div className="flex flex-col space-y-2">
                    {colorPalettes.map((scheme) => (
                      <button
                        key={scheme.value}
                        onClick={() => {
                          setColorScheme(scheme.value)
                          setIsOpen(false)
                        }}
                        className={`relative w-full flex items-center px-3 py-2 rounded-md transition-all duration-200 ${
                          colorScheme === scheme.value
                            ? 'bg-primary/15'
                            : 'hover:bg-primary/5'
                        }`}
                        title={scheme.description}
                      >
                        {/* Color Swatches */}
                        <div className="flex gap-1 mr-3">
                          {scheme.colors.slice(0, 2).map((color, index) => (
                            <div
                              key={index}
                              className="w-4 h-4 rounded-full border border-white/30"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        {/* Label */}
                        <span className="flex-1 text-sm text-left">
                          {scheme.label}
                        </span>
                        {/* Active Indicator */}
                        {colorScheme === scheme.value && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === 'fonts' && (
                  <div className="flex flex-col space-y-2">
                    {fontOptions.map((font) => (
                      <button
                        key={font.value}
                        onClick={() => {
                          setFontFamily(font.value)
                          setIsOpen(false)
                        }}
                        className={`relative w-full flex items-center px-3 py-2 rounded-md transition-all duration-200 ${
                          fontFamily === font.value
                            ? 'bg-primary/15'
                            : 'hover:bg-primary/5'
                        }`}
                        title={font.description}
                        style={{ fontFamily: font.cssFamily }}
                      >
                        {/* Font Preview */}
                        <div className="flex-1 text-sm text-left">
                          <div className="font-medium">{font.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {font.description}
                          </div>
                        </div>
                        {/* Active Indicator */}
                        {fontFamily === font.value && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default ColorSchemeToggler
