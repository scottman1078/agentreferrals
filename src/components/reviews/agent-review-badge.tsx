'use client'

import { useAppData } from '@/lib/data-provider'
import { Star } from 'lucide-react'

/** Compact inline badge showing star rating + count. Use on any agent card. */
export function AgentReviewBadge({ agentId, size = 'sm' }: { agentId: string; size?: 'sm' | 'md' }) {
  const { getAgentReviewStats } = useAppData()
  const stats = getAgentReviewStats(agentId)
  if (!stats) return null

  if (size === 'sm') {
    return (
      <div className="flex items-center gap-1">
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
        <span className="text-[11px] font-bold">{stats.avgRating}</span>
        <span className="text-[10px] text-muted-foreground">({stats.count})</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${star <= Math.round(stats.avgRating) ? 'fill-amber-400 text-amber-400' : 'text-border'}`}
          />
        ))}
      </div>
      <span className="text-xs font-bold">{stats.avgRating}</span>
      <span className="text-xs text-muted-foreground">({stats.count} review{stats.count !== 1 ? 's' : ''})</span>
    </div>
  )
}
