import React from 'react'

// Snowflake SVG component
export const SnowflakeIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2 L12 22 M2 12 L22 12 M5.64 5.64 L18.36 18.36 M18.36 5.64 L5.64 18.36 M8.5 3.5 L15.5 20.5 M15.5 3.5 L8.5 20.5 M3.5 8.5 L20.5 15.5 M20.5 8.5 L3.5 15.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.9"
    />
  </svg>
)

// Ornament SVG component
export const OrnamentIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="10" r="6" fill="currentColor" opacity="0.8" />
    <path d="M12 4 L12 2 M12 16 L12 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M8 10 L6 10 M18 10 L16 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
  </svg>
)

// Star SVG component
export const StarIcon: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2 L14.5 8.5 L21 9.5 L16 14 L17.5 21 L12 17 L6.5 21 L8 14 L3 9.5 L9.5 8.5 Z"
      fill="currentColor"
      opacity="0.9"
    />
  </svg>
)

interface AnimatedLogoTextProps {
  text: string
  className?: string
}

const AnimatedLogoText: React.FC<AnimatedLogoTextProps> = ({ text, className = '' }) => {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Animated Christmas elements around the text */}
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        {/* Snowflake 1 - Above text, floating */}
        <div 
          className="absolute -top-3 left-1/4 w-2.5 h-2.5"
          style={{ 
            animation: 'float 3s ease-in-out infinite',
            animationDelay: '0s'
          }}
        >
          <div className="text-primary/70 animate-spin-slow" style={{ animationDuration: '4s' }}>
            <SnowflakeIcon className="w-full h-full" />
          </div>
        </div>
        
        {/* Ornament 1 - Below text, floating */}
        <div 
          className="absolute -bottom-3 right-1/4 w-2 h-2"
          style={{ 
            animation: 'float 3.5s ease-in-out infinite',
            animationDelay: '1s'
          }}
        >
          <div className="text-red-500/70">
            <OrnamentIcon className="w-full h-full" />
          </div>
        </div>
        
        {/* Star 1 - Left side, floating */}
        <div 
          className="absolute left-0 top-1/2 w-2 h-2"
          style={{ 
            animation: 'floatVertical 2.8s ease-in-out infinite',
            animationDelay: '0.5s',
            transform: 'translateX(-14px)'
          }}
        >
          <div className="text-yellow-400/70 animate-pulse">
            <StarIcon className="w-full h-full" />
          </div>
        </div>
        
        {/* Snowflake 2 - Right side, floating */}
        <div 
          className="absolute right-0 top-1/2 w-2 h-2"
          style={{ 
            animation: 'floatVertical 3.2s ease-in-out infinite',
            animationDelay: '1.5s',
            transform: 'translateX(14px)'
          }}
        >
          <div className="text-primary/50 animate-spin-slow" style={{ animationDuration: '5s', animationDirection: 'reverse' }}>
            <SnowflakeIcon className="w-full h-full" />
          </div>
        </div>
        
        {/* Ornament 2 - Small one near end of text */}
        <div 
          className="absolute -top-1 right-1/3 w-1.5 h-1.5"
          style={{ 
            animation: 'pulse 2s ease-in-out infinite',
            animationDelay: '0.8s'
          }}
        >
          <div className="text-green-500/60">
            <OrnamentIcon className="w-full h-full" />
          </div>
        </div>
      </div>
      
      {/* Styled text with gradient and effects */}
      <span className="relative z-10 text-xl font-bold tracking-tight leading-none bg-gradient-to-r from-primary via-primary to-primary/90 bg-clip-text text-transparent [text-shadow:0_2px_8px_rgba(0,0,0,0.3)] dark:[text-shadow:0_2px_8px_rgba(255,255,255,0.1)]">
        {text}
      </span>
    </div>
  )
}

export default AnimatedLogoText

