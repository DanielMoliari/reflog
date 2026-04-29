import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakBadgeProps {
  count: number
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
  className?: string
}

export function StreakBadge({ count, size = 'md', active = true, className }: StreakBadgeProps) {
  const sizeClasses = {
    sm: { wrap: 'gap-1 px-2 py-1', icon: 'h-3.5 w-3.5', text: 'text-sm font-bold' },
    md: { wrap: 'gap-1.5 px-3 py-1.5', icon: 'h-5 w-5', text: 'text-xl font-bold' },
    lg: { wrap: 'gap-2 px-4 py-2', icon: 'h-7 w-7', text: 'text-4xl font-black' },
  }[size]

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
        active
          ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
          : 'border-border bg-surface-2 text-slate-500',
        sizeClasses.wrap,
        className,
      )}
    >
      <Flame
        className={cn(sizeClasses.icon, active ? 'text-orange-400' : 'text-slate-600')}
        fill={active ? 'currentColor' : 'none'}
      />
      <span className={cn('tabular', sizeClasses.text)}>{count}</span>
    </div>
  )
}
