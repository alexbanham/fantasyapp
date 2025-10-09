import { cn } from '../lib/utils'

interface PlayerAvatarProps {
  name: string
  position: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showRookie?: boolean
  rookie?: boolean
}

const PlayerAvatar = ({ 
  name, 
  position, 
  size = 'md', 
  className,
  showRookie = false,
  rookie = false 
}: PlayerAvatarProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-16 w-16 text-lg'
  }

  const getPositionColor = (position: string) => {
    const colors = {
      QB: 'from-blue-500/20 to-blue-600/40',
      RB: 'from-green-500/20 to-green-600/40',
      WR: 'from-purple-500/20 to-purple-600/40',
      TE: 'from-orange-500/20 to-orange-600/40',
      K: 'from-yellow-500/20 to-yellow-600/40',
      DST: 'from-red-500/20 to-red-600/40'
    }
    return colors[position as keyof typeof colors] || 'from-gray-500/20 to-gray-600/40'
  }

  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)

  return (
    <div className="relative">
      <div className={cn(
        "rounded-full border-2 border-border/30 bg-gradient-to-br flex items-center justify-center",
        sizeClasses[size],
        getPositionColor(position),
        className
      )}>
        <span className="font-bold text-primary">
          {initials}
        </span>
      </div>
      {showRookie && rookie && (
        <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1 rounded-full">
          R
        </div>
      )}
    </div>
  )
}

export default PlayerAvatar
