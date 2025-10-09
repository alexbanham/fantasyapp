import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type ColorScheme = 'purple' | 'blackscale' | 'eagles' | 'cowboys' | 'niners' | 'rams'

interface ColorSchemeContextType {
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
}

const ColorSchemeContext = createContext<ColorSchemeContextType | undefined>(undefined)

interface ColorSchemeProviderProps {
  children: ReactNode
}

export const ColorSchemeProvider: React.FC<ColorSchemeProviderProps> = ({ children }) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    // Check localStorage first, then default to purple
    const saved = localStorage.getItem('colorScheme') as ColorScheme
    return saved || 'purple'
  })

  useEffect(() => {
    // Save to localStorage whenever it changes
    localStorage.setItem('colorScheme', colorScheme)
    
    // Apply the color scheme to the document
    document.documentElement.setAttribute('data-color-scheme', colorScheme)
    
    // Remove old scheme classes and add new one
    document.documentElement.classList.remove('purple-scheme', 'blackscale-scheme', 'eagles-scheme', 'cowboys-scheme', 'niners-scheme', 'rams-scheme')
    document.documentElement.classList.add(`${colorScheme}-scheme`)
  }, [colorScheme])

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      {children}
    </ColorSchemeContext.Provider>
  )
}

export const useColorScheme = (): ColorSchemeContextType => {
  const context = useContext(ColorSchemeContext)
  if (context === undefined) {
    throw new Error('useColorScheme must be used within a ColorSchemeProvider')
  }
  return context
}
