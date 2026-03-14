'use client'

import { useState } from 'react'
import { useAppData } from '@/lib/data-provider'
import { formatCurrency, getInitials } from '@/lib/utils'
import { TAG_COLORS } from '@/lib/constants'
import CreateReferralModal from '@/components/referral/create-referral-modal'
import {
  Handshake,
  AlertTriangle,
  Star,
  Clock,
  CheckCircle2,
  Send,
  TrendingUp,
  MapPin,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowRight,
} from 'lucide-react'

type Tab = 'need-you' | 'your-gaps'

const TREND_COLORS: Record<string, string> = {
  High: '#22c55e',
  Medium: '#f59e0b',
  Low: '#94a3b8',
}

export default function PartnershipsPage() {
  const { agentsNeedingPartner, coverageGapOpportunities } = useAppData()
  const [activeTab, setActiveTab] = useState<Tab>('need-you')
  const [offeredIds, setOfferedIds] = useState<Set<string>>(new Set())
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set())
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set(['gap-1', 'gap-2', 'gap-3']))
  const [searchQuery, setSearchQuery] = useState('')
  const [referralAgentId, setReferralAgentId] = useState<string | null>(null)

  const handleOffer = (agentId: string) => {
    setOfferedIds((prev) => new Set(prev).add(agentId))
  }

  const handleRequest = (agentId: string) => {
    setRequestedIds((prev) => new Set(prev).add(agentId))
  }

  const toggleGap = (gapId: string) => {
    setExpandedGaps((prev) => {
      const next = new Set(prev)
      if (next.has(gapId)) next.delete(gapId)
      else next.add(gapId)
      return next
    })
  }

  // Filter agents by search query
  const filteredAgents = agentsNeedingPartner.filter((agent) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      agent.name.toLowerCase().includes(q) ||
      agent.brokerage.toLowerCase().includes(q) ||
      agent.area.toLowerCase().includes(q)
    )
  })

  // Sort by referNetScore descending
  const sortedAgents = [...filteredAgents].sort((a, b) => b.referNetScore - a.referNetScore)

  // Stats
  const totalOpportunities = agentsNeedingPartner.length
  const totalGaps = coverageGapOpportunities.length
  const avgScore = Math.round(agentsNeedingPartner.reduce((s, a) => s + a.referNetScore, 0) / agentsNeedingPartner.length)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border">
        <div className="flex items-center gap-5 px-6 pt-5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Handshake className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-xl">Partnership Opportunities</h1>
              <p className="text-xs text-muted-foreground">
                Connect with agents who need a partner in your market
              </p>
            </div>
          </div>
          <div className="flex gap-5 ml-auto">
            <div className="text-right">
              <div className="font-bold text-lg">{totalOpportunities}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Need You</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">{totalGaps}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Your Gaps</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg text-primary">{avgScore}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Avg Score</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-6 gap-1">
          <button
            onClick={() => setActiveTab('need-you')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'need-you'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Agents Who Need You
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
              {totalOpportunities}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('your-gaps')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'your-gaps'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            Your Coverage Gaps
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
              {totalGaps}
            </span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'need-you' && (
          <div className="p-6">
            {/* Search */}
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, brokerage, or market..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground"
                />
              </div>
              <span className="text-xs text-muted-foreground">{sortedAgents.length} agents</span>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 mb-5">
              <AlertTriangle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">These agents have no referral partner in your area.</span>{' '}
                Offer to be their connection for Plainwell / Allegan County, MI so when they
                have a client relocating to your market, the relationship is already in place.
              </div>
            </div>

            {/* Agent cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
              {sortedAgents.map((agent) => {
                const isOffered = offeredIds.has(agent.id)
                return (
                  <div
                    key={agent.id}
                    className="p-4 rounded-xl border border-border bg-card hover:shadow-md hover:border-primary/20 transition-all"
                  >
                    {/* Top row: avatar + name + score */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                          style={{ background: agent.color }}
                        >
                          {getInitials(agent.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{agent.name}</div>
                          <div className="text-[11px] text-muted-foreground">{agent.brokerage}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-xs text-amber-600 dark:text-amber-400">
                          {agent.referNetScore}
                        </span>
                      </div>
                    </div>

                    {/* Market */}
                    <div className="text-xs text-muted-foreground mb-3">{agent.area}</div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center p-1.5 rounded-lg bg-secondary">
                        <div className="font-bold text-xs">{agent.dealsPerYear}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">Deals/Yr</div>
                      </div>
                      <div className="text-center p-1.5 rounded-lg bg-secondary">
                        <div className="font-bold text-xs">{formatCurrency(agent.avgSalePrice)}</div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">Avg Price</div>
                      </div>
                      <div className="text-center p-1.5 rounded-lg bg-secondary">
                        <div className="font-bold text-xs flex items-center justify-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {agent.responseTime}
                        </div>
                        <div className="text-[9px] text-muted-foreground mt-0.5">Response</div>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {agent.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white"
                          style={{ background: TAG_COLORS[t] }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>

                    {/* Missing market badge */}
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                      <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        No partner in Plainwell / Allegan County, MI
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOffer(agent.id)}
                        disabled={isOffered}
                        className={`flex-1 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          isOffered
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-primary text-primary-foreground hover:opacity-90'
                        }`}
                      >
                        {isOffered ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Offered
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            Offer Partnership
                          </>
                        )}
                      </button>
                      {isOffered && (
                        <button
                          onClick={() => setReferralAgentId(agent.id)}
                          className="flex-1 h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-primary text-primary hover:bg-primary/10"
                        >
                          <ArrowRight className="w-3.5 h-3.5" />
                          Start Referral
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === 'your-gaps' && (
          <div className="p-6">
            {/* Info banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 mb-5">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Markets where you need a referral partner.</span>{' '}
                When your clients relocate to these areas, you will want a trusted agent ready to serve them
                and send you the referral fee.
              </div>
            </div>

            {/* Coverage gap cards */}
            <div className="space-y-3">
              {coverageGapOpportunities.map((gap) => {
                const isExpanded = expandedGaps.has(gap.id)
                return (
                  <div key={gap.id} className="rounded-xl border border-border bg-card overflow-hidden">
                    {/* Gap header */}
                    <button
                      onClick={() => toggleGap(gap.id)}
                      className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div className="text-left">
                          <div className="font-semibold text-sm">
                            {gap.market}, {gap.state}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {gap.suggestedAgents.length} suggested{' '}
                            {gap.suggestedAgents.length === 1 ? 'agent' : 'agents'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: TREND_COLORS[gap.migrationTrend] }}
                          />
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {gap.migrationTrend} migration
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expanded: suggested agents */}
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-1 border-t border-border">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          {gap.suggestedAgents.map((agent) => {
                            const isRequested = requestedIds.has(agent.id)
                            return (
                              <div
                                key={agent.id}
                                className="p-4 rounded-xl border border-border bg-background hover:border-primary/20 transition-all"
                              >
                                {/* Top row */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex items-center gap-2.5">
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0"
                                      style={{ background: agent.color }}
                                    >
                                      {getInitials(agent.name)}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-sm">{agent.name}</div>
                                      <div className="text-[11px] text-muted-foreground">
                                        {agent.brokerage}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10">
                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                    <span className="font-bold text-xs text-amber-600 dark:text-amber-400">
                                      {agent.referNetScore}
                                    </span>
                                  </div>
                                </div>

                                {/* Area */}
                                <div className="text-xs text-muted-foreground mb-3">{agent.area}</div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                  <div className="text-center p-1.5 rounded-lg bg-secondary">
                                    <div className="font-bold text-xs">{agent.dealsPerYear}</div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">Deals/Yr</div>
                                  </div>
                                  <div className="text-center p-1.5 rounded-lg bg-secondary">
                                    <div className="font-bold text-xs">
                                      {formatCurrency(agent.avgSalePrice)}
                                    </div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">Avg Price</div>
                                  </div>
                                  <div className="text-center p-1.5 rounded-lg bg-secondary">
                                    <div className="font-bold text-xs flex items-center justify-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" />
                                      {agent.responseTime}
                                    </div>
                                    <div className="text-[9px] text-muted-foreground mt-0.5">Response</div>
                                  </div>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {agent.tags.map((t) => (
                                    <span
                                      key={t}
                                      className="px-1.5 py-0.5 rounded text-[9px] font-semibold text-white"
                                      style={{ background: TAG_COLORS[t] }}
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>

                                {/* Action */}
                                <button
                                  onClick={() => handleRequest(agent.id)}
                                  disabled={isRequested}
                                  className={`w-full h-9 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                    isRequested
                                      ? 'bg-emerald-500/10 text-emerald-500'
                                      : 'border border-border hover:bg-accent text-foreground'
                                  }`}
                                >
                                  {isRequested ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Request Sent
                                    </>
                                  ) : (
                                    <>
                                      <Handshake className="w-3.5 h-3.5" />
                                      Request Partner
                                    </>
                                  )}
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {referralAgentId && (
        <CreateReferralModal
          onClose={() => setReferralAgentId(null)}
          preselectedAgentId={referralAgentId}
          onCreated={() => setReferralAgentId(null)}
        />
      )}
    </div>
  )
}
