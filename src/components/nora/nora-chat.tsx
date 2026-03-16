'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useAppData } from '@/lib/data-provider'
import { TAG_COLORS } from '@/lib/constants'
import { getInitials } from '@/lib/utils'
import Link from 'next/link'
import { X, Send, Sparkles, Star, Loader2, MessageSquare, Maximize2, Minimize2 } from 'lucide-react'
import CreateReferralModal from '@/components/referral/create-referral-modal'
import { nudges, getActiveNudges } from '@/data/nudges'
import type { Agent, NoraMessage } from '@/types'

// ── Pattern-matching fallback (used when no API key) ──────────────────
function buildNoraResponses(agentList: Agent[]) {
  const activeNudges = getActiveNudges(nudges)
  const inactivePartnerNudges = activeNudges.filter((n) => n.type === 'inactive_partner')

  return [
    // Nudge-related patterns
    { patterns: ['remind', 'check in with partners', 'follow up'], response: inactivePartnerNudges.length > 0 ? `You have ${inactivePartnerNudges.length} partner${inactivePartnerNudges.length > 1 ? 's' : ''} you haven't contacted recently:\n\n${inactivePartnerNudges.map((n) => `\u2022 ${n.agentName} — ${n.daysInactive} days inactive`).join('\n')}\n\nWant me to draft check-in messages for any of them?` : "All your partners are up to date! No inactive connections right now.", matchLogic: undefined },
    { patterns: ['draft a message to ashley', 'message ashley', 'write to ashley'], response: "Here's a personalized check-in for Ashley Monroe:\n\n\"Hey Ashley, just checking in! The Nashville market looks hot right now. Have any clients considering Michigan? I'd love to help. Also congrats on the Martinez closing!\"\n\nWant me to adjust the tone or focus?", matchLogic: () => agentList.filter((a) => a.name.toLowerCase().includes('ashley')) },
    { patterns: ['who should i reach out to', 'who to contact', 'who to message', 'reach out'], response: activeNudges.length > 0 ? `Based on your activity, I'd prioritize these partners:\n\n${activeNudges.slice(0, 5).map((n, i) => `${i + 1}. ${n.agentName} — ${n.title}`).join('\n')}\n\nWant me to draft messages for any of them?` : "You're all caught up! All your partners have been contacted recently.", matchLogic: undefined },
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
    text: "I can help you find the right agent! Try:\n\n\u2022 \"Luxury agent in Nashville\"\n\u2022 \"Who covers Phoenix?\"\n\u2022 \"Relocation specialists\"\n\u2022 \"Investment agents in Dallas\"\n\u2022 \"Who's in my brokerage?\"",
    agents: [],
  }
}

interface NoraChatProps {
  nudgeCount?: number
}

export default function NoraChat({ nudgeCount = 0 }: NoraChatProps) {
  const { agents, getAgentReviewStats } = useAppData()
  const { profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const hasAutoOpened = useRef(false)

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const inactiveCount = getActiveNudges(nudges).filter((n) => n.type === 'inactive_partner').length

  const buildWelcomeMessage = useCallback(() => {
    const greetings: string[] = []

    // Personalized greeting
    greetings.push(`Hey ${firstName}! 👋`)

    // Inactive partners nudge
    if (inactiveCount > 0) {
      greetings.push(`You have ${inactiveCount} partner${inactiveCount > 1 ? 's' : ''} you haven't contacted in 30+ days — want me to draft check-in messages?`)
    }

    // New agents suggestion
    const recentAgents = agents.filter((a) => a.status === 'active').slice(-3)
    if (recentAgents.length > 0) {
      greetings.push(`There are new agents in ${recentAgents.map((a) => a.area.split(',')[0]).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 3).join(', ')} — want me to help you connect?`)
    }

    // Default fallback
    if (greetings.length === 1) {
      greetings.push("I'm NORA, your AI referral assistant. Ask me to find agents, draft messages, or explore new markets!")
    }

    return greetings.join('\n\n')
  }, [firstName, inactiveCount, agents])

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
        className="fixed bottom-[88px] right-6 sm:bottom-[88px] sm:right-6 z-[900] w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-transform"
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
                            <span className="text-xs font-semibold">{agent.name}</span>
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
