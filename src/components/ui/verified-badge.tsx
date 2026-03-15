'use client'

import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VerifiedBadgeProps {
  market?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const sizeMap = {
  sm: { icon: 'w-3 h-3', wrapper: 'gap-0.5 px-1 py-0.5', text: 'text-[9px]' },
  md: { icon: 'w-3.5 h-3.5', wrapper: 'gap-1 px-1.5 py-0.5', text: 'text-[10px]' },
  lg: { icon: 'w-4 h-4', wrapper: 'gap-1.5 px-2 py-1', text: 'text-xs' },
}

export function VerifiedBadge({ market, size = 'md', showLabel = false, className }: VerifiedBadgeProps) {
  const s = sizeMap[size]
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md bg-amber-500/15 border border-amber-500/25',
        s.wrapper,
        className
      )}
      title={market ? `Verified Market Agent — ${market}` : 'Verified Market Agent'}
    >
      <ShieldCheck className={cn(s.icon, 'text-amber-500')} />
      {showLabel && (
        <span className={cn(s.text, 'font-bold text-amber-600 dark:text-amber-400')}>
          Verified
        </span>
      )}
    </div>
  )
}
