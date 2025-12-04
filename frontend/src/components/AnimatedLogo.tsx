import React from 'react'
import { Crown } from 'lucide-react'
import { SnowflakeIcon, OrnamentIcon, StarIcon } from './AnimatedLogoText'

const AnimatedLogo: React.FC = () => {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
      {/* Animated Christmas elements orbiting around the crown */}
      <div className="absolute inset-0 overflow-visible">
        {/* Snowflake 1 - Top right orbit */}
        <div className="absolute top-1/2 left-1/2 w-3 h-3 animate-orbit">
          <div className="text-primary animate-spin-slow" style={{ animationDuration: '4s' }}>
            <SnowflakeIcon className="w-full h-full" />
          </div>
        </div>
        
        {/* Ornament 1 - Bottom left orbit (reverse) */}
        <div className="absolute top-1/2 left-1/2 w-2.5 h-2.5 animate-orbit-reverse">
          <div className="text-red-500">
            <OrnamentIcon className="w-full h-full" />
          </div>
        </div>
        
        {/* Star 1 - Top left orbit (slow) */}
        <div className="absolute top-1/2 left-1/2 w-2 h-2 animate-orbit-slow">
          <div className="text-yellow-400/80 animate-pulse">
            <StarIcon className="w-full h-full" />
          </div>
        </div>
        
        {/* Snowflake 2 - Bottom right orbit (reverse, different speed) */}
        <div 
          className="absolute top-1/2 left-1/2 w-2 h-2 animate-orbit-reverse"
          style={{ animationDuration: '7s' }}
        >
          <div className="text-green-500/70 animate-spin-slow" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
            <SnowflakeIcon className="w-full h-full" />
          </div>
        </div>
      </div>
      
      {/* Central Crown Icon */}
      <Crown className="h-7 w-7 text-primary drop-shadow-lg relative z-10" />
    </div>
  )
}

export default AnimatedLogo

