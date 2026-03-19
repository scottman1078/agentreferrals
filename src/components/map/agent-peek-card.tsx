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
    <div className="fixed bottom-[120px] left-4 right-4 max-w-lg mx-auto z-[450]">
      <div className="bg-card/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <GripHorizontal className="w-6 h-6 text-muted-foreground/40" />
        </div>

        {/* Top-right buttons: menu + close */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {/* More menu (report/block) */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-7 h-7 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {showMenu && (
              <div className="absolute top-8 right-0 w-44 rounded-xl border border-border bg-card shadow-xl py-1 z-10">
                <button
                  onClick={() => {
                    setShowMenu(false)
                    setShowReportModal(true)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive hover:bg-accent transition-colors"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Report Agent
                </button>
                {!blocked ? (
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      setShowBlockConfirm(true)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-destructive hover:bg-accent transition-colors"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Block Agent
                  </button>
                ) : (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Agent blocked
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Close button */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-4 pb-4">
          {/* Agent info row with prominent RCS */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 overflow-hidden"
              style={{ background: agent.color }}
            >
              {!scopeLocked && agent.photoUrl ? (
                <img src={agent.photoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>

            {/* Name / brokerage / area */}
            <div className="flex-1 min-w-0">
              <span className="font-bold text-base truncate block">{displayName}</span>
              <p className="text-xs text-muted-foreground">{agent.brokerage}</p>
              <p className="text-xs text-muted-foreground">{agent.area}</p>
            </div>

            {/* Large RCS circular badge */}
            {rcsValue > 0 && (
              <div className="shrink-0 flex flex-col items-center" title="Referral Communication Score">
                <div
                  className={`relative w-14 h-14 rounded-full flex items-center justify-center border-[3px] ${rcsColorClasses}`}
                  style={{ borderColor: rcsRingColor }}
                >
                  <span className="text-xl font-extrabold leading-none">{rcsValue}</span>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5" style={{ color: rcsRingColor }}>
                  RCS
                </span>
                <span className="text-[9px] text-muted-foreground leading-tight text-center max-w-[80px]">
                  {rcsLabel}
                </span>
              </div>
            )}
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

          {/* Connection path */}
          {pathAgents && pathAgents.length > 1 && (
            <div className="mt-2.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">
                Connection Path
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {pathAgents.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-1.5">
                    {i > 0 && <ArrowRight className="w-3 h-3 text-primary/40 shrink-0" />}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0"
                        style={{ background: p.color }}
                      >
                        {p.initials}
                      </div>
                      <span className="text-xs font-semibold whitespace-nowrap">{p.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-1.5 mt-2.5 rounded-lg border border-border px-2 py-2">
            {agent.responseTime && (
              <div className="flex flex-col items-center text-center">
                <Clock className="w-3 h-3 text-muted-foreground mb-0.5" />
                <span className="text-[11px] font-semibold">{agent.responseTime}</span>
                <span className="text-[9px] text-muted-foreground">Response</span>
              </div>
            )}
            {agent.closedReferrals != null && agent.closedReferrals > 0 && (
              <div className="flex flex-col items-center text-center">
                <Handshake className="w-3 h-3 text-emerald-500 mb-0.5" />
                <span className="text-[11px] font-semibold text-emerald-500">{agent.closedReferrals}</span>
                <span className="text-[9px] text-muted-foreground">Closed</span>
              </div>
            )}
            <div className="flex flex-col items-center text-center">
              <span className="text-[11px] font-semibold">{agent.dealsPerYear}</span>
              <span className="text-[9px] text-muted-foreground">Deals/yr</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-[11px] font-semibold">{formatCurrency(agent.avgSalePrice)}</span>
              <span className="text-[9px] text-muted-foreground">Avg Price</span>
            </div>
            {agent.yearsLicensed > 0 && (
              <div className="flex flex-col items-center text-center">
                <span className="text-[11px] font-semibold">{agent.yearsLicensed} yrs</span>
                <span className="text-[9px] text-muted-foreground">Licensed</span>
              </div>
            )}
            {networkSize > 0 && (
              <div className="flex flex-col items-center text-center">
                <Users className="w-3 h-3 text-muted-foreground mb-0.5" />
                <span className="text-[11px] font-semibold">{networkSize}</span>
                <span className="text-[9px] text-muted-foreground">Partners</span>
              </div>
            )}
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

          {/* Direct partner stats */}
          {isDirectPartner && (
            <div className="mt-2.5 rounded-xl border border-border p-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="flex items-start gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[11px] text-muted-foreground leading-tight">{lastContacted}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[11px] text-muted-foreground leading-tight">{activeReferrals}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Handshake className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-[11px] text-muted-foreground leading-tight">{partnerDuration ?? 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Degree agent stats */}
          {isDegreeAgent && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  {mutualCount} mutual partner{mutualCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Private notes */}
          <AgentNotes agentId={agent.id} authorId={profile?.id ?? null} variant="inline" />

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            {isDegreeAgent ? (
              /* Non-partner degree agent: Request Intro only, no direct message for free tier */
              <button
                onClick={() => { if (demoGuard()) return; onSendReferral?.(agent) }}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Request Intro
              </button>
            ) : (
              <button
                onClick={() => { if (demoGuard()) return; onSendReferral?.(agent) }}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <Send className="w-3.5 h-3.5" />
                Send Referral
              </button>
            )}
            {/* Message button: only for direct partners, not for degree agents */}
            {isDirectPartner && (
              <button
                onClick={() => { if (demoGuard()) return; onMessage?.(agent) }}
                className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Message
              </button>
            )}
            <button
              onClick={() => router.push(`/agent/${agent.id}`)}
              className="flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-border text-sm font-semibold hover:bg-accent transition-colors shrink-0"
            >
              <User className="w-3.5 h-3.5" />
              <span className="text-xs">Profile</span>
            </button>
          </div>
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
