import React, { useState } from 'react'
import { Palette, Check } from 'lucide-react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { useColorScheme } from '../contexts/ColorSchemeContext'
import { colorPalettes } from '../lib/colorPalettes'

const ColorSchemeToggler = () => {
  const { colorScheme, setColorScheme } = useColorScheme()
  const [isOpen, setIsOpen] = useState(false)

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
            <Card className="bg-background border-border/30 shadow-xl w-[280px]">
              <CardContent className="p-3">
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
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default ColorSchemeToggler
