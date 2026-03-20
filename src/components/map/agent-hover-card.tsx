'use client'

import { TAG_COLORS } from '@/lib/constants'
import { getInitials } from '@/lib/utils'
import { getConnectionPath } from '@/data/partnerships'
import { useBrokerage } from '@/contexts/brokerage-context'
import { useAppData } from '@/lib/data-provider'
import { ArrowRight, MessageSquare } from 'lucide-react'
import { getCommScore, getCommScoreColor } from '@/data/communication-score'
import { maskName } from '@/lib/agent-display-name'
import { useAgentDisplayName } from '@/hooks/use-agent-display-name'
import type { Agent } from '@/types'

interface AgentHoverCardProps {
  agent: Agent
  position: { x: number; y: number }
}

export default function AgentHoverCard({ agent, position }: AgentHoverCardProps) {
  const getDisplayName = useAgentDisplayName()
  const displayName = getDisplayName(agent)
  const initials = getInitials(agent.name) // initials always use full name
  const score = agent.rcsScore ?? 0
  const scoreColor =
    score >= 90 ? 'text-emerald-500 bg-emerald-500/10' : score >= 80 ? 'text-amber-500 bg-amber-500/10' : 'text-muted-foreground bg-muted'
  const commScore = getCommScore(agent.id)
  const commScoreColor = commScore ? getCommScoreColor(commScore.overall) : ''

  // Connection path for degree-of-separation agents
  const { scope, oneDegreeIds, twoDegreeIds } = useBrokerage()
  const { agents } = useAppData()
  const isDegreeView = scope === '1-degree' || scope === '2-degree'
  const isDegreeAgent = oneDegreeIds.includes(agent.id) || twoDegreeIds.includes(agent.id)
  const connectionPath = isDegreeView && isDegreeAgent ? getConnectionPath('jason', agent.id) : null
  const pathNames = connectionPath?.slice(1, -1).map((id) => {
    const a = agents.find((ag) => ag.id === id)
    return a ? maskName(a.name) : id
  }) ?? []

  // Position card just above the avatar with enough clearance to click
  const style: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x - 120, window.innerWidth - 260),
    top: Math.max(position.y - 150, 10),
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
              <span className="font-bold text-sm truncate">{displayName}</span>
              {score > 0 && (
                <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${scoreColor}`}>
                  {score}
                </span>
              )}
              {commScore && (
                <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded-full ${commScoreColor}`}>
                  <MessageSquare className="w-2 h-2" />
                  {commScore.overall}
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

        {pathNames.length > 0 && (
          <div className="flex items-center gap-1 mt-2 px-1.5 py-1 rounded-md bg-primary/5 border border-primary/10">
            <span className="text-[9px] font-semibold text-primary">via</span>
            {pathNames.map((name, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ArrowRight className="w-2 h-2 text-primary/50" />}
                <span className="text-[9px] font-semibold text-primary">{name}</span>
              </span>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-1.5">Click to view details</p>
      </div>
    </div>
  )
}
