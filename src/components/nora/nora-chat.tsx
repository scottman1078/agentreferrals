'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useDemoGuard } from '@/hooks/use-demo-guard'
import { useAuth } from '@/contexts/auth-context'
import { useAppData } from '@/lib/data-provider'
import { TAG_COLORS } from '@/lib/constants'
import { getInitials } from '@/lib/utils'
import { maskName } from '@/lib/agent-display-name'
import Link from 'next/link'
import { X, Send, Sparkles, Star, Loader2, MessageSquare, Maximize2, Minimize2 } from 'lucide-react'
import CreateReferralModal from '@/components/referral/create-referral-modal'
import { nudges, getActiveNudges } from '@/data/nudges'
import { getCommNudges } from '@/data/comm-nudges'
import { getOpenPosts, getBidsByAgent } from '@/data/referral-posts'
import { getEndorsementCount } from '@/data/endorsements'
import { getCommScore } from '@/data/communication-score'
import { referrals as mockReferrals } from '@/data/referrals'
import { getVerifiedCount, getPendingCount } from '@/data/verified-referrals'
import type { Agent, NoraMessage } from '@/types'

// ── Pattern-matching fallback (used when no API key) ──────────────────
function buildNoraResponses(agentList: Agent[]) {
  const activeNudges = getActiveNudges(nudges)
  const inactivePartnerNudges = activeNudges.filter((n) => n.type === 'inactive_partner')

  const openPosts = getOpenPosts()
  const commNudges = getCommNudges('jason')
  const allActiveNudges = getActiveNudges(nudges)
  const myAreaPosts = openPosts.filter((p) => p.market.toLowerCase().includes('michigan') || p.market.toLowerCase().includes('grand rapids') || p.market.toLowerCase().includes('plainwell'))

  return [
    // ── Draft messages command ──
    { patterns: ['draft messages', 'draft check-in', 'write messages', 'help me draft'], response: (() => {
      const targets = commNudges.filter((n) => n.priority === 'high' && n.suggestedMessage)
      if (targets.length === 0) return "You're all caught up! No urgent messages to draft right now."
      return `Here are draft messages for your overdue partners:\n\n${targets.map((n) => `📨 **To ${n.agentName}:**\n"${n.suggestedMessage}"\n`).join('\n')}Want me to adjust the tone or send these?`
    })(), matchLogic: undefined },

    // ── Marketplace command ──
    { patterns: ['show marketplace', 'marketplace', 'open opportunities', 'referral opportunities'], response: (() => {
      if (openPosts.length === 0) return "No open marketplace opportunities right now. Want to post one?"
      const items = openPosts.slice(0, 4).map((p) => `• ${p.postingAgentName} — ${p.representation} in ${p.market} (${p.budgetRange}) — ${p.bidsCount} bids`)
      const myArea = myAreaPosts.length > 0 ? `\n\n🔥 ${myAreaPosts.length} of these are in YOUR market!` : ''
      return `📋 Open Referral Opportunities:\n\n${items.join('\n')}${myArea}\n\nGo to Dashboard → Marketplace to bid, or say "post a referral" to create one.`
    })(), matchLogic: undefined },

    // ── Pipeline command ──
    { patterns: ['my pipeline', 'pipeline status', 'active referrals', 'show pipeline'], response: (() => {
      const active = mockReferrals.filter((r) => (r.fromAgent.includes("Smith") || r.toAgent.includes("Smith")) && r.stage !== 'Fee Received')
      if (active.length === 0) return "Your pipeline is empty! Want to post a referral opportunity or find a partner?"
      return `📊 Your Active Pipeline:\n\n${active.map((r) => `• ${r.clientName} — ${r.market} — ${r.stage}\n  ${r.fromAgent.includes("Smith") ? `→ To: ${r.toAgent}` : `← From: ${r.fromAgent}`} · ${r.feePercent}% · Est. $${(r.estimatedPrice / 1000).toFixed(0)}k`).join('\n\n')}\n\nWant me to draft updates for any of these?`
    })(), matchLogic: undefined },

    // ── Comm score command ──
    { patterns: ['my score', 'comm score', 'communication score', 'my reputation', 'my stats'], response: (() => {
      const cs = getCommScore('jason')
      if (!cs) return "I couldn't find your communication score."
      const trend = cs.trend === 'up' ? '📈 trending up' : cs.trend === 'down' ? '📉 trending down' : '➡️ stable'
      return `📡 Your Reputation Dashboard:\n\n• Comm Score: ${cs.overall}/100 (${cs.label}) — ${trend}\n• Pipeline Activity: ${cs.pipelineActivity}\n• Message Frequency: ${cs.messageFrequency}\n• Response Time: ${cs.responseTime}\n• Check-In Consistency: ${cs.checkInConsistency}\n• Verified Referrals: ${getVerifiedCount('jason')}\n• Endorsements: ${getEndorsementCount('jason')}\n\n${cs.trend === 'down' ? '⚠️ Your score is dropping. Send updates on stale referrals to recover. Want me to draft them?' : 'Keep up the good work!'}`
    })(), matchLogic: undefined },

    // ── Post a referral command ──
    { patterns: ['post a referral', 'post referral', 'create opportunity', 'find an agent for'], response: "To post a referral opportunity:\n\n1. Go to Dashboard → Marketplace\n2. Click \"Post Referral\"\n3. Fill in the market, client needs, and terms\n4. Agents in that area will bid with text + video pitches!\n\nOr tell me the market and I'll help you find agents directly.", matchLogic: undefined },

    // Nudge-related patterns
    { patterns: ['remind', 'check in with partners', 'follow up'], response: inactivePartnerNudges.length > 0 ? `You have ${inactivePartnerNudges.length} partner${inactivePartnerNudges.length > 1 ? 's' : ''} you haven't contacted recently:\n\n${inactivePartnerNudges.map((n) => `\u2022 ${n.agentName} — ${n.daysInactive} days inactive`).join('\n')}\n\nWant me to draft check-in messages for any of them?` : "All your partners are up to date! No inactive connections right now.", matchLogic: undefined },
    { patterns: ['draft a message to ashley', 'message ashley', 'write to ashley'], response: "Here's a personalized check-in for Ashley Monroe:\n\n\"Hey Ashley, just checking in! The Nashville market looks hot right now. Have any clients considering Michigan? I'd love to help. Also congrats on the Martinez closing!\"\n\nWant me to adjust the tone or focus?", matchLogic: () => agentList.filter((a) => a.name.toLowerCase().includes('ashley')) },
    { patterns: ['who should i reach out to', 'who to contact', 'who to message', 'reach out'], response: allActiveNudges.length > 0 ? `Based on your activity, I'd prioritize these partners:\n\n${allActiveNudges.slice(0, 5).map((n, i) => `${i + 1}. ${n.agentName} — ${n.title}`).join('\n')}\n\nWant me to draft messages for any of them?` : "You're all caught up! All your partners have been contacted recently.", matchLogic: undefined },
    // Original patterns
    { patterns: ['nashville', 'tennessee', 'tn'], response: "I found agents covering Nashville. Ashley Monroe at Real Broker is your top match — 95 ReferNet Score, Relocation & Luxury specialist, responds in < 30 min.", matchLogic: () => agentList.filter((a) => a.area.toLowerCase().includes('nashville')) },
    { patterns: ['chicago', 'illinois', 'il'], response: "Marcus Reid at Compass Chicago — 94 ReferNet Score, 88 deals/year, Luxury + Investment + Relocation. Responds within 30 minutes.", matchLogic: () => agentList.filter((a) => a.area.toLowerCase().includes('chicago')) },
    { patterns: ['luxury', 'high end', 'million'], response: "Top luxury specialists across your network:", matchLogic: () => agentList.filter((a) => a.tags.includes('Luxury')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5) },
    { patterns: ['relocation', 'relocat', 'moving'], response: "Relocation specialists with the highest success rates:", matchLogic: () => agentList.filter((a) => a.tags.includes('Relocation')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5) },
    { patterns: ['phoenix', 'scottsdale', 'arizona', 'az'], response: "Darius King at Real Broker Arizona — in your brokerage, 91 ReferNet Score, New Construction & Relocation specialist.", matchLogic: () => agentList.filter((a) => a.area.toLowerCase().includes('phoenix') || a.area.toLowerCase().includes('scottsdale')) },
    { patterns: ['denver', 'colorado', 'co'], response: "Lily Park at Real Broker Denver — your brokerage, 88 ReferNet Score, Luxury + Relocation + Land & Acreage.", matchLogic: () => agentList.filter((a) => a.area.toLowerCase().includes('denver')) },
    { patterns: ['dallas', 'fort worth', 'dfw', 'texas', 'tx'], response: "Carlos Vega at RE/MAX Dallas — 102 deals/year, 94 ReferNet Score, Luxury + New Construction + Investment.", matchLogic: () => agentList.filter((a) => a.area.toLowerCase().includes('dallas')) },
    { patterns: ['first time', 'first-time', 'ftb', 'starter'], response: "Best first-time buyer specialists:", matchLogic: () => agentList.filter((a) => a.tags.includes('First-Time Buyers')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5) },
    { patterns: ['investment', 'investor', 'rental', '1031'], response: "Investment property specialists:", matchLogic: () => agentList.filter((a) => a.tags.includes('Investment')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5) },
    { patterns: ['my brokerage', 'real broker', 'our network', 'internal'], response: "Real Broker agents on AgentReferrals:", matchLogic: () => agentList.filter((a) => a.brokerageId === 'real').sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)) },
  ]
}

function findResponse(query: string, agentList: Agent[]): { text: string; agents: Agent[] } {
  const lower = query.toLowerCase()
  const responses = buildNoraResponses(agentList)
  for (const r of responses) {
    if (r.patterns.some((p) => lower.includes(p))) {
      return { text: r.response, agents: r.matchLogic ? r.matchLogic() : [] }
    }
  }
  return {
    text: "I can help! Try:\n\n\u2022 \"Draft messages\" — I'll write check-ins for overdue partners\n\u2022 \"Show marketplace\" — Browse referral opportunities\n\u2022 \"My pipeline\" — Status on all active referrals\n\u2022 \"My score\" — Your reputation dashboard\n\u2022 \"Find agent in Nashville\" — Match with top agents\n\u2022 \"Luxury specialists\" — Search by specialty\n\u2022 \"Who should I reach out to?\" — Prioritized outreach list",
    agents: [],
  }
}

interface NoraChatProps {
  nudgeCount?: number
}

export default function NoraChat({ nudgeCount = 0 }: NoraChatProps) {
  const demoGuard = useDemoGuard()
  const { agents, getAgentReviewStats } = useAppData()
  const { profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const hasAutoOpened = useRef(false)

  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  // Pull all data for the briefing
  const openMarketplacePosts = getOpenPosts()
  const myBids = getBidsByAgent('jason')
  const commScore = getCommScore('jason')
  const endorsementCount = getEndorsementCount('jason')
  const verifiedCount = getVerifiedCount('jason')
  const pendingVerifications = getPendingCount('jason')
  const activeReferrals = mockReferrals.filter((r) =>
    (r.fromAgent.includes("Smith") || r.toAgent.includes("Smith")) &&
    r.stage !== 'Fee Received'
  )
  const closedReferrals = mockReferrals.filter((r) =>
    (r.fromAgent.includes("Smith") || r.toAgent.includes("Smith")) &&
    (r.stage === 'Fee Received' || r.stage === 'Closed - Fee Pending')
  )
  const allCommNudges = getCommNudges('jason')
  const urgentNudges = allCommNudges.filter((n) => n.priority === 'high')
  const activeNudgeList = getActiveNudges(nudges)
  const inactivePartners = activeNudgeList.filter((n) => n.type === 'inactive_partner')
  const congratsNudges = allCommNudges.filter((n) => n.type === 'congratulate')
  const marketplaceInMyArea = openMarketplacePosts.filter((p) =>
    p.market.toLowerCase().includes('michigan') ||
    p.market.toLowerCase().includes('grand rapids') ||
    p.market.toLowerCase().includes('plainwell')
  )

  const buildWelcomeMessage = useCallback(() => {
    const sections: string[] = []

    // Greeting
    const hour = new Date().getHours()
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    sections.push(`${timeGreeting}, ${firstName}! Here's your daily briefing:`)

    // ── URGENT ACTIONS ──
    const urgentItems: string[] = []
    if (urgentNudges.length > 0) {
      urgentNudges.forEach((n) => {
        urgentItems.push(`• ${n.message}`)
      })
    }
    if (inactivePartners.length > 0) {
      inactivePartners.slice(0, 3).forEach((n) => {
        urgentItems.push(`• ${n.agentName} — ${n.daysInactive} days since last contact`)
      })
    }
    if (urgentItems.length > 0) {
      sections.push(`🔴 ACTION NEEDED (${urgentItems.length})\n${urgentItems.join('\n')}\n\nWant me to draft messages for any of these?`)
    }

    // ── PIPELINE SNAPSHOT ──
    const pipelineItems: string[] = []
    pipelineItems.push(`• ${activeReferrals.length} active referrals in pipeline`)
    pipelineItems.push(`• ${closedReferrals.length} closed/pending fee`)
    if (pendingVerifications > 0) {
      pipelineItems.push(`• ${pendingVerifications} referrals awaiting partner verification`)
    }
    if (congratsNudges.length > 0) {
      congratsNudges.forEach((n) => {
        pipelineItems.push(`• 🎉 ${n.agentName} moved ${n.clientName || 'a referral'} to Under Contract!`)
      })
    }
    sections.push(`📊 PIPELINE\n${pipelineItems.join('\n')}`)

    // ── MARKETPLACE OPPORTUNITIES ──
    if (openMarketplacePosts.length > 0) {
      const marketItems: string[] = []
      if (marketplaceInMyArea.length > 0) {
        marketItems.push(`• 🔥 ${marketplaceInMyArea.length} open opportunit${marketplaceInMyArea.length !== 1 ? 'ies' : 'y'} in YOUR market — agents are looking for you!`)
      }
      marketItems.push(`• ${openMarketplacePosts.length} total open referral opportunities`)
      const topPost = openMarketplacePosts[0]
      marketItems.push(`• Hot: ${topPost.postingAgentName} posted a ${topPost.budgetRange} ${topPost.representation.toLowerCase()} in ${topPost.market} — ${topPost.bidsCount} bids so far`)
      if (myBids.length > 0) {
        const pendingBids = myBids.filter((b) => b.status === 'pending')
        if (pendingBids.length > 0) {
          marketItems.push(`• You have ${pendingBids.length} pending bid${pendingBids.length !== 1 ? 's' : ''} awaiting review`)
        }
      }
      sections.push(`🏪 MARKETPLACE\n${marketItems.join('\n')}`)
    }

    // ── COMM SCORE & TRUST ──
    if (commScore) {
      const scoreItems: string[] = []
      scoreItems.push(`• Comm Score: ${commScore.overall}/100 (${commScore.label})`)
      if (commScore.trend === 'down') {
        scoreItems.push(`• ⚠️ Your score is trending down — send updates on stale referrals to recover`)
      } else if (commScore.trend === 'up') {
        scoreItems.push(`• 📈 Score trending up — keep it going!`)
      }
      scoreItems.push(`• ${verifiedCount} verified referrals | ${endorsementCount} endorsements`)
      sections.push(`📡 YOUR REPUTATION\n${scoreItems.join('\n')}`)
    }

    // ── QUICK ACTIONS ──
    sections.push(`What would you like to do?\n• "Draft messages" — I'll write check-ins for your overdue partners\n• "Show marketplace" — Browse open referral opportunities\n• "Find an agent in [city]" — I'll match you with the best partner\n• "My pipeline" — Detailed status on all active referrals`)

    return sections.join('\n\n')
  }, [firstName, urgentNudges, inactivePartners, activeReferrals.length, closedReferrals.length, pendingVerifications, congratsNudges, openMarketplacePosts, marketplaceInMyArea, myBids, commScore, verifiedCount, endorsementCount])

  const [messages, setMessages] = useState<NoraMessage[]>([
    { id: 'welcome', role: 'assistant', content: buildWelcomeMessage(), timestamp: new Date() },
  ])

  // Auto-open NORA on first visit after login
  useEffect(() => {
    if (profile && !hasAutoOpened.current) {
      hasAutoOpened.current = true
      const timer = setTimeout(() => setIsOpen(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [profile])

  // Listen for toggle-nora events
  useEffect(() => {
    function handleToggleNora() {
      setIsOpen((prev) => !prev)
    }
    window.addEventListener('toggle-nora', handleToggleNora)
    return () => window.removeEventListener('toggle-nora', handleToggleNora)
  }, [])

  // Listen for NORA Insights briefing request
  const briefingRequestedRef = useRef(false)
  useEffect(() => {
    function handleBriefing() {
      if (isOpen) {
        // Already open — close it
        setIsOpen(false)
        return
      }
      setIsOpen(true)
      briefingRequestedRef.current = true
    }
    window.addEventListener('nora-briefing', handleBriefing)
    return () => window.removeEventListener('nora-briefing', handleBriefing)
  }, [isOpen])

  // Auto-send briefing message when NORA opens from the Insights button
  useEffect(() => {
    if (isOpen && briefingRequestedRef.current) {
      briefingRequestedRef.current = false
      // Inject a briefing request as if the user typed it
      const briefingMsg: NoraMessage = {
        id: `u-briefing-${Date.now()}`,
        role: 'user',
        content: 'Give me my daily briefing — check-ins needed, new agents, pipeline updates, and any opportunities I should know about.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, briefingMsg])
      setIsLoading(true)

      fetch('/api/nora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: briefingMsg.content,
          userId: profile?.id,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.response) {
            const matchedAgents = (data.matchedAgentIds || [])
              .map((id: string) => agents.find((a) => a.id === id))
              .filter(Boolean) as Agent[]
            setMessages((prev) => [...prev, {
              id: `n-briefing-${Date.now()}`,
              role: 'assistant',
              content: data.response,
              timestamp: new Date(),
              matchedAgents,
            }])
          } else {
            const result = findResponse(briefingMsg.content, agents)
            setMessages((prev) => [...prev, {
              id: `n-briefing-${Date.now()}`,
              role: 'assistant',
              content: result.text,
              timestamp: new Date(),
              matchedAgents: result.agents,
            }])
          }
        })
        .catch(() => {
          setMessages((prev) => [...prev, {
            id: `n-briefing-${Date.now()}`,
            role: 'assistant',
            content: "I couldn't fetch your briefing right now. Try asking me directly!",
            timestamp: new Date(),
          }])
        })
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, agents, profile])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [referralAgentId, setReferralAgentId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend() {
    if (demoGuard()) return
    if (!input.trim() || isLoading) return
    const userMsg: NoraMessage = { id: `u-${Date.now()}`, role: 'user', content: input.trim(), timestamp: new Date() }
    setMessages((p) => [...p, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/nora', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          userId: profile?.id,
        }),
      })

      const data = await res.json()

      if (data.fallback) {
        // No API key configured — use pattern matching
        const result = findResponse(userMsg.content, agents)
        setMessages((p) => [...p, {
          id: `n-${Date.now()}`,
          role: 'assistant',
          content: result.text,
          timestamp: new Date(),
          matchedAgents: result.agents,
        }])
      } else if (data.response) {
        // AI response — resolve matched agent IDs to full Agent objects
        const matchedAgents = (data.matchedAgentIds || [])
          .map((id: string) => agents.find((a) => a.id === id))
          .filter(Boolean) as Agent[]

        setMessages((p) => [...p, {
          id: `n-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          matchedAgents,
        }])
      } else {
        throw new Error('Unexpected response')
      }
    } catch {
      // API error — fall back to pattern matching
      const result = findResponse(userMsg.content, agents)
      setMessages((p) => [...p, {
        id: `n-${Date.now()}`,
        role: 'assistant',
        content: result.text,
        timestamp: new Date(),
        matchedAgents: result.agents,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[900] w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </button>

      {isOpen && (
        <div className={`fixed z-[900] flex flex-col border-t sm:border border-border bg-card shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullScreen
            ? 'inset-4 sm:inset-6 rounded-2xl'
            : 'inset-x-0 bottom-[88px] sm:inset-x-auto sm:bottom-[152px] sm:right-6 sm:w-[380px] h-[calc(100vh-10rem)] sm:h-[520px] sm:rounded-2xl'
        }`}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">NORA</div>
              <div className="text-[10px] text-muted-foreground">AI Referral Assistant</div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-500">Online</span>
            </div>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={isFullScreen ? 'Minimize' : 'Full screen'}
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed whitespace-pre-line ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-secondary text-foreground rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                </div>
                {msg.matchedAgents && msg.matchedAgents.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {msg.matchedAgents.map((agent) => (
                      <div key={agent.id} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border bg-background">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0" style={{ background: agent.color }}>
                          {getInitials(agent.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold">{maskName(agent.name)}</span>
                            {agent.referNetScore && (
                              <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${agent.referNetScore >= 90 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'}`}>
                                {agent.referNetScore}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{agent.brokerage}</div>
                          {(() => { const stats = getAgentReviewStats(agent.id); return stats ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                              <span className="text-[9px] font-bold">{stats.avgRating}</span>
                              <span className="text-[9px] text-muted-foreground">({stats.count})</span>
                            </div>
                          ) : null })()}
                          <div className="flex gap-0.5 mt-1">
                            {agent.tags.slice(0, 2).map((t) => (
                              <span key={t} className="px-1 py-0.5 rounded text-[8px] font-semibold text-white" style={{ background: TAG_COLORS[t] }}>{t}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-1">
                          <div className="text-[10px] font-bold text-emerald-500">{agent.closedReferrals} closed</div>
                          <div className="text-[9px] text-muted-foreground">{agent.responseTime}</div>
                          <Link
                            href={`/dashboard/messages?agent=${agent.id}`}
                            className="flex items-center gap-0.5 text-[9px] font-semibold text-primary hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageSquare className="w-2.5 h-2.5" />
                            Message
                          </Link>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const topAgent = msg.matchedAgents?.[0]
                        if (topAgent) setReferralAgentId(topAgent.id)
                      }}
                      className="w-full py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      Start Referral with Top Match
                    </button>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl rounded-bl-sm bg-secondary text-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-[13px] text-muted-foreground">NORA is thinking...</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border shrink-0">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                placeholder="Ask NORA to find an agent..."
                className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      {referralAgentId && (
        <CreateReferralModal
          onClose={() => setReferralAgentId(null)}
          preselectedAgentId={referralAgentId}
          onCreated={() => setReferralAgentId(null)}
        />
      )}
    </>
  )
}
