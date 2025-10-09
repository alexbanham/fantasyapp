import { colorPalettes } from './colorPalettes'

/**
 * Generates CSS for all color palettes
 * This can be used to automatically update the CSS file when new palettes are added
 */
export const generateColorPaletteCSS = (): string => {
  let css = ''
  
  colorPalettes.forEach(palette => {
    const schemeClass = `${palette.value}-scheme`
    
    // CSS Variables
    css += `\n  /* ${palette.label} Scheme */\n`
    css += `  .${schemeClass} {\n`
    css += `    --primary: ${palette.cssVariables.primary};\n`
    css += `    --primary-foreground: ${palette.cssVariables.primaryForeground};\n`
    css += `    --accent: ${palette.cssVariables.accent};\n`
    css += `    --accent-foreground: ${palette.cssVariables.accentForeground};\n`
    css += `    --border: ${palette.cssVariables.border};\n`
    css += `    --ring: ${palette.cssVariables.ring};\n`
    css += `  }\n`
  })
  
  return css
}

/**
 * Generates background gradient CSS for all color palettes
 */
export const generateBackgroundGradientCSS = (): string => {
  let css = ''
  
  colorPalettes.forEach(palette => {
    const schemeClass = `${palette.value}-scheme`
    
    css += `\n.${schemeClass} {\n`
    css += `  background: ${palette.backgroundGradient};\n`
    css += `}\n\n`
    css += `.${schemeClass} body {\n`
    css += `  background: ${palette.backgroundGradient};\n`
    css += `}\n`
  })
  
  return css
}

/**
 * Generates glass effect CSS for all color palettes
 */
export const generateGlassEffectCSS = (): string => {
  let css = ''
  
  colorPalettes.forEach(palette => {
    const schemeClass = `${palette.value}-scheme`
    
    css += `\n.${schemeClass} .glass {\n`
    css += `  background: ${palette.glassEffect.background};\n`
    css += `  border: 1px solid ${palette.glassEffect.border};\n`
    css += `}\n`
  })
  
  return css
}

/**
 * Generates complete CSS for all color palettes
 */
export const generateCompleteCSS = (): string => {
  return `
/* Color Scheme Variables */
${generateColorPaletteCSS()}

/* Color Scheme Background Gradients */
${generateBackgroundGradientCSS()}

/* Color Scheme Glass Effects */
${generateGlassEffectCSS()}
`
}

// Export the generated CSS for easy copying
export const generatedCSS = generateCompleteCSS()
