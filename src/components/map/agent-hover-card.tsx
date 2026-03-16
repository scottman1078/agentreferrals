'use client'

import { TAG_COLORS } from '@/lib/constants'
import { getInitials } from '@/lib/utils'
import type { Agent } from '@/types'

interface AgentHoverCardProps {
  agent: Agent
  position: { x: number; y: number }
}

export default function AgentHoverCard({ agent, position }: AgentHoverCardProps) {
  const initials = getInitials(agent.name)
  const score = agent.referNetScore ?? 0
  const scoreColor =
    score >= 90 ? 'text-emerald-500 bg-emerald-500/10' : score >= 80 ? 'text-amber-500 bg-amber-500/10' : 'text-muted-foreground bg-muted'

  // Position card above the cursor, centered horizontally
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x - 120, window.innerWidth - 260),
    top: Math.max(position.y - 130, 60),
    zIndex: 500,
    pointerEvents: 'none',
  }

  return (
    <div style={style}>
      <div className="w-[240px] bg-card/95 backdrop-blur-xl rounded-xl shadow-2xl border border-border p-3 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
            style={{ background: agent.color }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm truncate">{agent.name}</span>
              {score > 0 && (
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${scoreColor}`}>
                  {score}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{agent.brokerage}</p>
            <p className="text-[10px] text-muted-foreground truncate">{agent.area}</p>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-0.5 mt-2">
          {agent.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 rounded text-[8px] font-semibold text-white"
              style={{ background: TAG_COLORS[tag] || '#6b7280' }}
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground mt-1.5">Click to view details</p>
      </div>
    </div>
  )
}
