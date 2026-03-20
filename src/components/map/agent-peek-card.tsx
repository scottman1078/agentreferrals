'use client'

import { useState } from 'react'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import { X, Send, MessageSquare, Star, Clock, GripHorizontal, User, ArrowRight, CalendarClock, ArrowLeftRight, Handshake, UserPlus, Users, MoreHorizontal, Flag, Ban } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { TAG_COLORS } from '@/lib/constants'
import { formatCurrency, getInitials } from '@/lib/utils'
import { useAppData } from '@/lib/data-provider'
import { useAuth } from '@/contexts/auth-context'
import { useBrokerage } from '@/contexts/brokerage-context'
import { getConnectionPath, getPartnerAgentIds, existingRequests } from '@/data/partnerships'
import AgentNotes from '@/components/agent-notes'
import { getCommScore } from '@/data/communication-score'
import { addBlock, isBlocked } from '@/data/report-block'
import ReportAgentModal from '@/components/report-agent-modal'
import { maskName } from '@/lib/agent-display-name'
import { useAgentDisplayName } from '@/hooks/use-agent-display-name'
import type { ReportReason } from '@/data/report-block'
import type { Agent } from '@/types'

interface AgentPeekCardProps {
  agent: Agent
  onClose: () => void
  onSendReferral?: (agent: Agent) => void
  onMessage?: (agent: Agent) => void
}

function getLastContactedLabel(agentId: string): string {
  // Generate deterministic mock based on agent ID hash
  let hash = 0
  for (let i = 0; i < agentId.length; i++) {
    hash = ((hash << 5) - hash) + agentId.charCodeAt(i)
    hash |= 0
  }
  const options = ['Messaged 3 days ago', 'Messaged 1 week ago', 'Messaged 2 weeks ago', 'No messages yet']
  return options[Math.abs(hash) % options.length]
}

function getActiveReferralsLabel(agentId: string, closedReferrals?: number): string {
  // Mock based on closedReferrals count
  if (closedReferrals && closedReferrals > 10) return '2 active referrals together'
  if (closedReferrals && closedReferrals > 5) return '1 active referral together'
  return 'No active referrals'
}

function getPartnershipDuration(agentId: string): string | null {
  const partnership = existingRequests.find(
    (r) =>
      r.status === 'active' &&
      ((r.requestingAgentId === 'jason' && r.receivingAgentId === agentId) ||
        (r.receivingAgentId === 'jason' && r.requestingAgentId === agentId))
  )
  if (!partnership?.acceptedAt) return null
  const date = new Date(partnership.acceptedAt)
  return `Partners since ${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
}

export default function AgentPeekCard({ agent, onClose, onSendReferral, onMessage }: AgentPeekCardProps) {
  const router = useRouter()
  const demoGuard = useDemoGuard()
  const { profile } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [blocked, setBlocked] = useState(() => isBlocked(profile?.id ?? 'jason', agent.id))
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)

  function handleReport(reason: ReportReason, description: string) {
    if (demoGuard()) return
    // POST to API (fire-and-forget for mock)
    fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reporterId: profile?.id ?? 'jason',
        reportedAgentId: agent.id,
        reason,
        description,
      }),
    }).catch(() => {})
  }

  function handleBlock() {
    if (demoGuard()) return
    addBlock(profile?.id ?? 'jason', agent.id)
    setBlocked(true)
    setShowBlockConfirm(false)
    setShowMenu(false)
  }
  const { getAgentReviewStats } = useAppData()
  const getDisplayNameFn = useAgentDisplayName()
  const displayName = getDisplayNameFn(agent)
  const initials = getInitials(agent.name) // initials always from full name
  const reviewStats = getAgentReviewStats(agent.id)
  const commScore = getCommScore(agent.id)
  // Consolidated RCS: prefer agent.rcsScore, fall back to commScore.overall
  const rcsValue = agent.rcsScore ?? commScore?.overall ?? 0
  const rcsColorClasses =
    rcsValue >= 90
      ? 'text-emerald-500 border-emerald-500 bg-emerald-500/10'
      : rcsValue >= 70
        ? 'text-amber-500 border-amber-500 bg-amber-500/10'
        : 'text-red-500 border-red-500 bg-red-500/10'
  const rcsRingColor =
    rcsValue >= 90 ? '#10b981' : rcsValue >= 70 ? '#f59e0b' : '#ef4444'
  const rcsLabel = commScore?.label ?? (rcsValue >= 90 ? 'Highly Responsive' : rcsValue >= 70 ? 'Responsive' : 'Needs Improvement')

  // Connection path for degree-of-separation agents
  const { scope, partnerIds, oneDegreeIds, twoDegreeIds, scopeLocked } = useBrokerage()
  const { agents: allAgents } = useAppData()
  const isDegreeView = scope === '1-degree' || scope === '2-degree'
  const isDegreeAgent = oneDegreeIds.includes(agent.id) || twoDegreeIds.includes(agent.id)
  const isDirectPartner = partnerIds.includes(agent.id)
  const connectionPath = isDegreeView && isDegreeAgent ? getConnectionPath('jason', agent.id) : null
  const pathAgents = connectionPath
    ? connectionPath.map((id) => {
        if (id === 'jason') return { id, name: 'You', color: '#f0a500', initials: 'You' }
        const a = allAgents.find((ag) => ag.id === id)
        return a
          ? { id: a.id, name: maskName(a.name), color: a.color, initials: getInitials(a.name) }
          : { id, name: id, color: '#6b7280', initials: '?' }
      })
    : null

  // Network size for all agents
  const networkSize = getPartnerAgentIds(agent.id).length

  // Mutual connections for degree agents
  const mutualCount = isDegreeAgent
    ? partnerIds.filter((pid) => getPartnerAgentIds(agent.id).includes(pid)).length
    : 0

  // Partner stats for direct partners
  const partnerDuration = isDirectPartner ? getPartnershipDuration(agent.id) : null
  const lastContacted = isDirectPartner ? getLastContactedLabel(agent.id) : null
  const activeReferrals = isDirectPartner ? getActiveReferralsLabel(agent.id, agent.closedReferrals) : null

  return (
    <div className="fixed bottom-[80px] right-4 w-[340px] z-[450]">
      <div className="bg-card backdrop-blur-xl rounded-xl shadow-2xl border border-border overflow-hidden">
        {/* Header: avatar, name, RCS, close */}
        <div className="p-3 pb-2">
          <div className="flex items-start gap-2.5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 overflow-hidden"
              style={{ background: agent.color }}
            >
              {!scopeLocked && agent.photoUrl ? (
                <img src={agent.photoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm truncate block leading-tight">{displayName}</span>
              <p className="text-[11px] text-muted-foreground truncate">{agent.brokerage}</p>
              <p className="text-[10px] text-muted-foreground truncate">{agent.area}</p>
            </div>
            {rcsValue > 0 && (
              <div className="shrink-0 flex flex-col items-center" title="Referral Communication Score">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center border-2"
                  style={{ borderColor: rcsRingColor, color: rcsRingColor }}
                >
                  <span className="text-sm font-extrabold leading-none">{rcsValue}</span>
                </div>
                <span className="text-[7px] font-bold uppercase mt-0.5" style={{ color: rcsRingColor }}>RCS</span>
              </div>
            )}
            <div className="flex items-center gap-1 shrink-0">
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </button>
                {showMenu && (
                  <div className="absolute top-7 right-0 w-36 rounded-lg border border-border bg-card shadow-xl py-1 z-10">
                    <button onClick={() => { setShowMenu(false); setShowReportModal(true) }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-destructive hover:bg-accent">
                      <Flag className="w-3 h-3" /> Report
                    </button>
                    {!blocked ? (
                      <button onClick={() => { setShowMenu(false); setShowBlockConfirm(true) }} className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-destructive hover:bg-accent">
                        <Ban className="w-3 h-3" /> Block
                      </button>
                    ) : (
                      <div className="px-3 py-1.5 text-[11px] text-muted-foreground">Blocked</div>
                    )}
                  </div>
                )}
              </div>
              <button onClick={onClose} className="w-6 h-6 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Stars + Stats in one compact row */}
          <div className="flex items-center gap-2 mt-2 text-[10px]">
            {reviewStats && (
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="font-bold text-[11px]">{reviewStats.avgRating}</span>
                <span className="text-muted-foreground">({reviewStats.count})</span>
              </div>
            )}
            {agent.responseTime && <span className="text-muted-foreground">{agent.responseTime}</span>}
            <span className="text-muted-foreground">{agent.dealsPerYear} deals/yr</span>
            <span className="text-muted-foreground">{formatCurrency(agent.avgSalePrice)}</span>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {agent.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white" style={{ background: TAG_COLORS[tag] || '#6b7280' }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Partner stats (compact) */}
          {isDirectPartner && (
            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
              <span>{lastContacted}</span>
              <span>{activeReferrals}</span>
              <span>{partnerDuration}</span>
            </div>
          )}

          {isDegreeAgent && mutualCount > 0 && (
            <div className="mt-2 text-[10px] text-muted-foreground">
              {mutualCount} mutual partner{mutualCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 p-3 pt-0">
          {isDegreeAgent ? (
            <button onClick={() => { if (demoGuard()) return; onSendReferral?.(agent) }} className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg border border-primary text-primary text-xs font-semibold hover:bg-primary/5">
              <UserPlus className="w-3 h-3" /> Request Intro
            </button>
          ) : (
            <button onClick={() => { if (demoGuard()) return; onSendReferral?.(agent) }} className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">
              <Send className="w-3 h-3" /> Referral
            </button>
          )}
          {isDirectPartner && (
            <button onClick={() => { if (demoGuard()) return; onMessage?.(agent) }} className="flex-1 flex items-center justify-center gap-1 h-8 rounded-lg border border-border text-xs font-semibold hover:bg-accent">
              <MessageSquare className="w-3 h-3" /> Message
            </button>
          )}
          <button onClick={() => router.push(`/agent/${agent.id}`)} className="flex items-center justify-center gap-1 h-8 px-2.5 rounded-lg border border-border text-xs font-semibold hover:bg-accent shrink-0">
            <User className="w-3 h-3" /> Profile
          </button>
        </div>
      </div>

      {/* Block confirmation dialog */}
      {showBlockConfirm && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBlockConfirm(false)
          }}
        >
          <div className="w-full max-w-[360px] rounded-2xl border border-border bg-card shadow-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <Ban className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="font-bold text-base mb-1">Block {displayName}?</h3>
            <p className="text-xs text-muted-foreground mb-4">
              This agent will be hidden from your network and won&apos;t be able to contact you.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowBlockConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBlock}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
              >
                Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReportModal && (
        <ReportAgentModal
          agentId={agent.id}
          agentName={displayName}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReport}
        />
      )}
    </div>
  )
}
