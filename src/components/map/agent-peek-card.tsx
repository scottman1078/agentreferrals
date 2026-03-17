'use client'

import { X, Send, MessageSquare, MessageSquareMore, Star, Clock, GripHorizontal, User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TAG_COLORS } from '@/lib/constants'
import { formatCurrency, getInitials } from '@/lib/utils'
import { useAppData } from '@/lib/data-provider'
import { useAuth } from '@/contexts/auth-context'
import AgentNotes from '@/components/agent-notes'
import { getCommScore, getCommScoreColor } from '@/data/communication-score'
import type { Agent } from '@/types'

interface AgentPeekCardProps {
  agent: Agent
  onClose: () => void
  onSendReferral?: (agent: Agent) => void
  onMessage?: (agent: Agent) => void
}

export default function AgentPeekCard({ agent, onClose, onSendReferral, onMessage }: AgentPeekCardProps) {
  const router = useRouter()
  const { profile } = useAuth()
  const { getAgentReviewStats } = useAppData()
  const initials = getInitials(agent.name)
  const reviewStats = getAgentReviewStats(agent.id)
  const score = agent.referNetScore ?? 0
  const scoreColor =
    score >= 90 ? 'text-emerald-500 bg-emerald-500/10' : score >= 80 ? 'text-amber-500 bg-amber-500/10' : 'text-muted-foreground bg-muted'
  const commScore = getCommScore(agent.id)
  const commScoreColor = commScore ? getCommScoreColor(commScore.overall) : ''

  return (
    <div className="fixed bottom-[88px] left-4 right-4 max-w-lg mx-auto z-[450]">
      <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <GripHorizontal className="w-6 h-6 text-muted-foreground/40" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="px-4 pb-4">
          {/* Agent info row */}
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
              style={{ background: agent.color }}
            >
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base truncate">{agent.name}</span>
                {score > 0 && (
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${scoreColor}`}>
                    {score}
                  </span>
                )}
                {commScore && (
                  <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${commScoreColor}`}>
                    <MessageSquareMore className="w-2.5 h-2.5" />
                    {commScore.overall}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{agent.brokerage}</p>
              <p className="text-xs text-muted-foreground">{agent.area}</p>
            </div>
          </div>

          {/* Review stars */}
          {reviewStats && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3.5 h-3.5 ${
                      star <= Math.round(reviewStats.avgRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-bold">{reviewStats.avgRating}</span>
              <span className="text-[11px] text-muted-foreground">
                ({reviewStats.count} review{reviewStats.count !== 1 ? 's' : ''})
              </span>
            </div>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2">
            {agent.responseTime && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {agent.responseTime}
              </span>
            )}
            {agent.closedReferrals != null && agent.closedReferrals > 0 && (
              <span className="text-[11px] text-emerald-500 font-semibold">
                {agent.closedReferrals} closed
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">
              {agent.dealsPerYear} deals/yr
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatCurrency(agent.avgSalePrice)} avg
            </span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-2.5">
            {agent.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                style={{ background: TAG_COLORS[tag] || '#6b7280' }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Private notes */}
          <AgentNotes agentId={agent.id} authorId={profile?.id ?? null} variant="inline" />

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onSendReferral?.(agent)}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
              Send Referral
            </button>
            <button
              onClick={() => onMessage?.(agent)}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Message
            </button>
            <button
              onClick={() => router.push(`/agent/${agent.id}`)}
              className="h-9 px-3 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors shrink-0"
              title="View Full Profile"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
