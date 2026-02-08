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
      primaryForeground: '0 0% 0%',
      accent: '270 50% 20%',
      accentForeground: '0 0% 98%',
      border: '270 20% 30%',
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
      primaryForeground: '0 0% 0%',
      accent: '25 50% 20%',
      accentForeground: '0 0% 98%',
      border: '25 20% 30%',
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
      border: '210 20% 30%',
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
      border: '0 20% 30%',
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
      border: '210 20% 30%',
      ring: '38 100% 50%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #003594, #FFA300, #003594)',
    glassEffect: {
      background: 'rgba(0, 53, 148, 0.05)',
      border: 'rgba(255, 163, 0, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'
  },
  {
    value: 'christmas',
    label: 'Christmas',
    description: 'Festive red and green',
    colors: ['#DC2626', '#16A34A', '#FEF3C7'],
    cssVariables: {
      primary: '0 84% 50%',
      primaryForeground: '0 0% 98%',
      accent: '142 76% 36%',
      accentForeground: '0 0% 98%',
      border: '142 30% 35%',
      ring: '0 84% 50%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #1a1a1a, #0f5132, #7f1d1d)',
    glassEffect: {
      background: 'rgba(220, 38, 38, 0.05)',
      border: 'rgba(22, 163, 74, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-green-950 to-red-950'
  },
  {
    value: 'chiefs',
    label: 'Chiefs',
    description: 'Kansas City Chiefs colors',
    colors: ['#E31837', '#FFB81C', '#000000'],
    cssVariables: {
      primary: '0 88% 50%',
      primaryForeground: '0 0% 98%',
      accent: '45 100% 55%',
      accentForeground: '0 0% 0%',
      border: '0 20% 30%',
      ring: '0 88% 50%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #1a0000, #E31837, #000000)',
    glassEffect: {
      background: 'rgba(227, 24, 55, 0.05)',
      border: 'rgba(255, 184, 28, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-black via-red-900 to-black'
  },
  {
    value: 'packers',
    label: 'Packers',
    description: 'Green Bay Packers colors',
    colors: ['#203731', '#FFB612', '#ffffff'],
    cssVariables: {
      primary: '142 100% 20%',
      primaryForeground: '0 0% 98%',
      accent: '45 100% 55%',
      accentForeground: '0 0% 0%',
      border: '142 30% 35%',
      ring: '142 100% 20%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #0a1f18, #203731, #0a1f18)',
    glassEffect: {
      background: 'rgba(32, 55, 49, 0.05)',
      border: 'rgba(255, 182, 18, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-green-950 to-slate-900'
  },
  {
    value: 'steelers',
    label: 'Steelers',
    description: 'Pittsburgh Steelers colors',
    colors: ['#000000', '#FFB612', '#A5ACAF'],
    cssVariables: {
      primary: '0 0% 0%',
      primaryForeground: '0 0% 98%',
      accent: '45 100% 55%',
      accentForeground: '0 0% 0%',
      border: '0 0% 30%',
      ring: '45 100% 55%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #000000, #1a1a1a, #000000)',
    glassEffect: {
      background: 'rgba(0, 0, 0, 0.15)',
      border: 'rgba(255, 182, 18, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-black via-neutral-900 to-black'
  },
  {
    value: 'raiders',
    label: 'Raiders',
    description: 'Las Vegas Raiders colors',
    colors: ['#000000', '#A5ACAF', '#ffffff'],
    cssVariables: {
      primary: '0 0% 0%',
      primaryForeground: '0 0% 98%',
      accent: '210 10% 65%',
      accentForeground: '0 0% 0%',
      border: '0 0% 30%',
      ring: '210 10% 65%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #000000, #2a2a2a, #000000)',
    glassEffect: {
      background: 'rgba(0, 0, 0, 0.15)',
      border: 'rgba(165, 172, 175, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-black via-neutral-800 to-black'
  },
  {
    value: 'dolphins',
    label: 'Dolphins',
    description: 'Miami Dolphins colors',
    colors: ['#008E97', '#FC4C02', '#ffffff'],
    cssVariables: {
      primary: '185 100% 30%',
      primaryForeground: '0 0% 98%',
      accent: '15 98% 50%',
      accentForeground: '0 0% 0%',
      border: '185 30% 35%',
      ring: '185 100% 30%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #001a1c, #008E97, #001a1c)',
    glassEffect: {
      background: 'rgba(0, 142, 151, 0.05)',
      border: 'rgba(252, 76, 2, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-cyan-900 to-slate-900'
  },
  {
    value: 'bills',
    label: 'Bills',
    description: 'Buffalo Bills colors',
    colors: ['#00338D', '#C60C30', '#ffffff'],
    cssVariables: {
      primary: '210 100% 28%',
      primaryForeground: '0 0% 98%',
      accent: '0 90% 40%',
      accentForeground: '0 0% 98%',
      border: '210 30% 35%',
      ring: '210 100% 28%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #000d1a, #00338D, #000d1a)',
    glassEffect: {
      background: 'rgba(0, 51, 141, 0.05)',
      border: 'rgba(198, 12, 48, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900'
  },
  {
    value: 'ravens',
    label: 'Ravens',
    description: 'Baltimore Ravens colors',
    colors: ['#241773', '#000000', '#9E7C0C'],
    cssVariables: {
      primary: '250 70% 28%',
      primaryForeground: '0 0% 98%',
      accent: '0 0% 0%',
      accentForeground: '0 0% 98%',
      border: '250 30% 35%',
      ring: '250 70% 28%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #0a0a1a, #241773, #000000)',
    glassEffect: {
      background: 'rgba(36, 23, 115, 0.05)',
      border: 'rgba(158, 124, 12, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-black'
  },
  {
    value: 'seahawks',
    label: 'Seahawks',
    description: 'Seattle Seahawks colors',
    colors: ['#002244', '#69BE28', '#ffffff'],
    cssVariables: {
      primary: '210 100% 13%',
      primaryForeground: '0 0% 98%',
      accent: '95 70% 45%',
      accentForeground: '0 0% 0%',
      border: '210 30% 35%',
      ring: '95 70% 45%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #000d1a, #002244, #000d1a)',
    glassEffect: {
      background: 'rgba(0, 34, 68, 0.05)',
      border: 'rgba(105, 190, 40, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900'
  },
  {
    value: 'broncos',
    label: 'Broncos',
    description: 'Denver Broncos colors',
    colors: ['#FB4F14', '#002244', '#ffffff'],
    cssVariables: {
      primary: '15 97% 53%',
      primaryForeground: '0 0% 0%',
      accent: '210 100% 13%',
      accentForeground: '0 0% 98%',
      border: '15 30% 35%',
      ring: '15 97% 53%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #1a0a00, #FB4F14, #000d1a)',
    glassEffect: {
      background: 'rgba(251, 79, 20, 0.05)',
      border: 'rgba(0, 34, 68, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-orange-900 to-blue-950'
  },
  {
    value: 'saints',
    label: 'Saints',
    description: 'New Orleans Saints colors',
    colors: ['#D3BC8D', '#000000', '#ffffff'],
    cssVariables: {
      primary: '45 40% 70%',
      primaryForeground: '0 0% 0%',
      accent: '0 0% 0%',
      accentForeground: '0 0% 98%',
      border: '0 0% 30%',
      ring: '45 40% 70%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #000000, #1a1a1a, #000000)',
    glassEffect: {
      background: 'rgba(0, 0, 0, 0.15)',
      border: 'rgba(211, 188, 141, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-black via-neutral-900 to-black'
  },
  {
    value: 'bucs',
    label: 'Buccaneers',
    description: 'Tampa Bay Buccaneers colors',
    colors: ['#D50A0A', '#34302B', '#FF7900'],
    cssVariables: {
      primary: '0 90% 45%',
      primaryForeground: '0 0% 98%',
      accent: '30 100% 50%',
      accentForeground: '0 0% 0%',
      border: '0 20% 30%',
      ring: '0 90% 45%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #1a0000, #D50A0A, #1a0000)',
    glassEffect: {
      background: 'rgba(213, 10, 10, 0.05)',
      border: 'rgba(255, 121, 0, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-red-950 to-slate-900'
  },
  {
    value: 'titans',
    label: 'Titans',
    description: 'Tennessee Titans colors',
    colors: ['#0C2340', '#4B92DB', '#C8102E'],
    cssVariables: {
      primary: '210 100% 13%',
      primaryForeground: '0 0% 98%',
      accent: '200 70% 55%',
      accentForeground: '0 0% 0%',
      border: '210 30% 35%',
      ring: '200 70% 55%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #000d1a, #0C2340, #000d1a)',
    glassEffect: {
      background: 'rgba(12, 35, 64, 0.05)',
      border: 'rgba(75, 146, 219, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900'
  },
  {
    value: 'chargers',
    label: 'Chargers',
    description: 'Los Angeles Chargers colors',
    colors: ['#0080C6', '#FFC20E', '#ffffff'],
    cssVariables: {
      primary: '200 100% 39%',
      primaryForeground: '0 0% 0%',
      accent: '45 100% 54%',
      accentForeground: '0 0% 0%',
      border: '200 30% 35%',
      ring: '200 100% 39%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #001a26, #0080C6, #001a26)',
    glassEffect: {
      background: 'rgba(0, 128, 198, 0.05)',
      border: 'rgba(255, 194, 14, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900'
  },
  {
    value: 'patriots',
    label: 'Patriots',
    description: 'New England Patriots colors',
    colors: ['#002244', '#C60C30', '#B0B7BC'],
    cssVariables: {
      primary: '210 100% 13%',
      primaryForeground: '0 0% 98%',
      accent: '0 90% 40%',
      accentForeground: '0 0% 98%',
      border: '210 30% 35%',
      ring: '210 100% 13%'
    },
    backgroundGradient: 'linear-gradient(to bottom right, #000d1a, #002244, #000d1a)',
    glassEffect: {
      background: 'rgba(0, 34, 68, 0.05)',
      border: 'rgba(198, 12, 48, 0.1)'
    },
    tailwindBackground: 'bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900'
  },
  {
    value: 'superbowl',
    label: 'Super Bowl',
    description: 'Light, clean football theme',
    colors: ['#D4A017', '#2C5282', '#FAF8F5'],
    cssVariables: {
      primary: '45 95% 48%',
      primaryForeground: '210 25% 12%',
      accent: '210 50% 25%',
      accentForeground: '0 0% 98%',
      border: '40 10% 88%',
      ring: '45 95% 48%'
    },
    backgroundGradient: 'linear-gradient(to bottom, #FAF8F5, #F5F0E8)',
    glassEffect: {
      background: 'rgba(212, 160, 23, 0.08)',
      border: 'rgba(212, 160, 23, 0.15)'
    },
    tailwindBackground: 'bg-gradient-to-b from-amber-50 to-stone-100'
  }
]

export const getColorPalette = (scheme: ColorScheme): ColorPalette => {
  return colorPalettes.find(palette => palette.value === scheme) || colorPalettes[0]
}

export const getBackgroundClass = (colorScheme: ColorScheme): string => {
  return getColorPalette(colorScheme).tailwindBackground
}
