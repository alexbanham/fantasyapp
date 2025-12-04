import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { loadGoogleFont } from '../lib/fonts'

export type FontFamily = 'inter' | 'montserrat' | 'roboto' | 'poppins' | 'overpass' | 'open-sans'

interface FontContextType {
  fontFamily: FontFamily
  setFontFamily: (font: FontFamily) => void
}

const FontContext = createContext<FontContextType | undefined>(undefined)

interface FontProviderProps {
  children: ReactNode
}

export const FontProvider: React.FC<FontProviderProps> = ({ children }) => {
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    // Check localStorage first, then default to inter
    const saved = localStorage.getItem('fontFamily') as FontFamily
    return saved || 'inter'
  })

  useEffect(() => {
    // Load the Google Font
    loadGoogleFont(fontFamily)
    
    // Save to localStorage whenever it changes
    localStorage.setItem('fontFamily', fontFamily)
    
    // Apply the font family to the document
    document.documentElement.setAttribute('data-font-family', fontFamily)
    
    // Remove old font classes and add new one
    document.documentElement.classList.remove('font-inter', 'font-montserrat', 'font-roboto', 'font-poppins', 'font-overpass', 'font-open-sans')
    document.documentElement.classList.add(`font-${fontFamily}`)
  }, [fontFamily])

  return (
    <FontContext.Provider value={{ fontFamily, setFontFamily }}>
      {children}
    </FontContext.Provider>
  )
}

export const useFont = (): FontContextType => {
  const context = useContext(FontContext)
  if (context === undefined) {
    throw new Error('useFont must be used within a FontProvider')
  }
  return context
}

