import { ColorScheme } from '../contexts/ColorSchemeContext'

export interface ColorPalette {
  value: ColorScheme
  label: string
  description: string
  colors: string[]
  cssVariables: {
    primary: string
    primaryForeground: string
    accent: string
    accentForeground: string
    border: string
    ring: string
  }
  backgroundGradient: string
  glassEffect: {
    background: string
    border: string
  }
  tailwindBackground: string
}

export const colorPalettes: ColorPalette[] = [
  {
    value: 'purple',
    label: 'Purple',
    description: 'Rich purple gradients',
    colors: ['#7c3aed', '#a855f7', '#c084fc'],
    cssVariables: {
      primary: '270 100% 70%',
      primaryForeground: '0 0% 9%',
      accent: '270 50% 20%',
      accentForeground: '0 0% 98%',
      border: '270 20% 20%',
      ring: '270 100% 70%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #1e1b4b, #7c3aed, #1e1b4b)',
    glassEffect: {
      background: 'rgba(88, 28, 135, 0.05)',
      border: 'rgba(139, 92, 246, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
  },
  {
    value: 'blackscale',
    label: 'Blackscale',
    description: 'Pure black and gray',
    colors: ['#000000', '#404040', '#808080'],
    cssVariables: {
      primary: '0 0% 100%',
      primaryForeground: '0 0% 0%',
      accent: '0 0% 10%',
      accentForeground: '0 0% 100%',
      border: '0 0% 20%',
      ring: '0 0% 100%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #000000, #2a2a2a, #000000)',
    glassEffect: {
      background: 'rgba(0, 0, 0, 0.15)',
      border: 'rgba(255, 255, 255, 0.05)'
    },
    tailwindBackground: 'bg-gradient-to-br from-black via-neutral-800 to-black'
  },
  {
    value: 'eagles',
    label: 'Eagles',
    description: 'Philadelphia Eagles colors',
    colors: ['#004c54', '#a5ac29', '#ffffff'],
    cssVariables: {
      primary: '25 100% 50%',
      primaryForeground: '0 0% 9%',
      accent: '25 50% 20%',
      accentForeground: '0 0% 98%',
      border: '25 20% 20%',
      ring: '25 100% 50%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #004c54, #a5ac29, #004c54)',
    glassEffect: {
      background: 'rgba(0, 76, 84, 0.05)',
      border: 'rgba(165, 172, 41, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-green-900 to-slate-900'
  },
  {
    value: 'cowboys',
    label: 'Cowboys',
    description: 'Dallas Cowboys colors',
    colors: ['#003594', '#869397', '#ffffff'],
    cssVariables: {
      primary: '210 100% 30%',
      primaryForeground: '0 0% 98%',
      accent: '210 50% 20%',
      accentForeground: '0 0% 98%',
      border: '210 20% 20%',
      ring: '210 100% 30%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #003594, #869397, #003594)',
    glassEffect: {
      background: 'rgba(0, 53, 148, 0.05)',
      border: 'rgba(134, 147, 151, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'
  },
  {
    value: 'niners',
    label: '49ers',
    description: 'San Francisco 49ers colors',
    colors: ['#AA0000', '#B3995D', '#ffffff'],
    cssVariables: {
      primary: '0 100% 33%',
      primaryForeground: '0 0% 98%',
      accent: '0 50% 20%',
      accentForeground: '0 0% 98%',
      border: '0 20% 20%',
      ring: '0 100% 33%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #AA0000, #B3995D, #AA0000)',
    glassEffect: {
      background: 'rgba(170, 0, 0, 0.05)',
      border: 'rgba(179, 153, 93, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-red-900 to-slate-900'
  },
  {
    value: 'rams',
    label: 'Rams',
    description: 'Los Angeles Rams colors',
    colors: ['#003594', '#FFA300', '#ffffff'],
    cssVariables: {
      primary: '38 100% 50%',
      primaryForeground: '0 0% 0%',
      accent: '210 100% 30%',
      accentForeground: '0 0% 98%',
      border: '210 20% 20%',
      ring: '38 100% 50%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #003594, #FFA300, #003594)',
    glassEffect: {
      background: 'rgba(0, 53, 148, 0.05)',
      border: 'rgba(255, 163, 0, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'
  }
]

export const getColorPalette = (scheme: ColorScheme): ColorPalette => {
  return colorPalettes.find(palette => palette.value === scheme) || colorPalettes[0]
}

export const getBackgroundClass = (colorScheme: ColorScheme): string => {
  return getColorPalette(colorScheme).tailwindBackground
}
