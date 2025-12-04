import React, { useEffect, useState } from 'react'

interface Snowflake {
  id: number
  left: number
  animationDuration: number
  animationDelay: number
  size: number
  opacity: number
  drift: number // Horizontal drift amount
}

const Snowflakes: React.FC = () => {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([])

  useEffect(() => {
    // Generate snowflakes
    const generateSnowflakes = () => {
      const count = 50 // Number of snowflakes
      const newSnowflakes: Snowflake[] = []
      
      for (let i = 0; i < count; i++) {
        newSnowflakes.push({
          id: i,
          left: Math.random() * 100, // Random horizontal position (0-100%)
          animationDuration: 10 + Math.random() * 20, // 10-30 seconds
          animationDelay: Math.random() * 5, // 0-5 seconds delay
          size: 4 + Math.random() * 6, // 4-10px
          opacity: 0.3 + Math.random() * 0.7, // 0.3-1.0 opacity
          drift: (Math.random() - 0.5) * 50, // -25px to +25px horizontal drift
        })
      }
      
      setSnowflakes(newSnowflakes)
    }

    generateSnowflakes()
  }, [])

  return (
    <div className="fixed inset-0 pointer-events-none z-[1] overflow-hidden">
      {snowflakes.map((snowflake) => (
        <div
          key={snowflake.id}
          className="absolute top-0 text-white select-none"
          style={{
            left: `${snowflake.left}%`,
            fontSize: `${snowflake.size}px`,
            opacity: snowflake.opacity,
            animation: `snowfall ${snowflake.animationDuration}s linear infinite`,
            animationDelay: `${snowflake.animationDelay}s`,
            transform: 'translateY(-100%)',
            '--snowflake-drift': `${snowflake.drift}px`,
          } as React.CSSProperties & { '--snowflake-drift': string }}
        >
          ❄
        </div>
      ))}
    </div>
  )
}

export default Snowflakes

