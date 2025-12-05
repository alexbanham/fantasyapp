import { FontFamily } from '../contexts/FontContext'

export interface FontOption {
  value: FontFamily
  label: string
  description: string
  googleFont: string
  cssFamily: string
}

export const fontOptions: FontOption[] = [
  {
    value: 'inter',
    label: 'Inter',
    description: 'Modern, clean geometric sans-serif',
    googleFont: 'Inter:wght@300;400;500;600;700',
    cssFamily: "'Inter', system-ui, -apple-system, sans-serif"
  },
  {
    value: 'montserrat',
    label: 'Montserrat',
    description: 'Urban-inspired geometric typeface',
    googleFont: 'Montserrat:wght@300;400;500;600;700',
    cssFamily: "'Montserrat', system-ui, sans-serif"
  },
  {
    value: 'roboto',
    label: 'Roboto',
    description: 'Versatile geometric sans-serif',
    googleFont: 'Roboto:wght@300;400;500;700',
    cssFamily: "'Roboto', system-ui, sans-serif"
  },
  {
    value: 'poppins',
    label: 'Poppins',
    description: 'Contemporary geometric with sleek curves',
    googleFont: 'Poppins:wght@300;400;500;600;700',
    cssFamily: "'Poppins', system-ui, sans-serif"
  },
  {
    value: 'overpass',
    label: 'Overpass',
    description: 'Designed for digital screens',
    googleFont: 'Overpass:wght@300;400;500;600;700',
    cssFamily: "'Overpass', system-ui, sans-serif"
  },
  {
    value: 'open-sans',
    label: 'Open Sans',
    description: 'Highly legible neutral design',
    googleFont: 'Open+Sans:wght@300;400;500;600;700',
    cssFamily: "'Open Sans', system-ui, sans-serif"
  }
]

export const getFontOption = (font: FontFamily): FontOption => {
  return fontOptions.find(option => option.value === font) || fontOptions[0]
}

export const loadGoogleFont = (font: FontFamily): void => {
  const fontOption = getFontOption(font)
  const linkId = `google-font-${font}`
  
  // Remove existing font link if it exists
  const existingLink = document.getElementById(linkId)
  if (existingLink) {
    existingLink.remove()
  }
  
  // Create new link element
  const link = document.createElement('link')
  link.id = linkId
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${fontOption.googleFont}&display=swap`
  document.head.appendChild(link)
}




