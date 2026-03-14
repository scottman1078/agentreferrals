'use client'

import { useState, useRef, useEffect } from 'react'
import { agents } from '@/data/agents'
import { TAG_COLORS } from '@/lib/constants'
import { getInitials } from '@/lib/utils'
import { X, Send, Sparkles } from 'lucide-react'
import type { Agent, NoraMessage } from '@/types'

const NORA_RESPONSES: { patterns: string[]; response: string; matchLogic?: (query: string) => Agent[] }[] = [
  { patterns: ['nashville', 'tennessee', 'tn'], response: "I found agents covering Nashville. Ashley Monroe at Real Broker is your top match — 95 ReferNet Score, Relocation & Luxury specialist, responds in < 30 min.", matchLogic: () => agents.filter((a) => a.area.toLowerCase().includes('nashville')) },
  { patterns: ['chicago', 'illinois', 'il'], response: "Marcus Reid at Compass Chicago — 94 ReferNet Score, 88 deals/year, Luxury + Investment + Relocation. Responds within 30 minutes.", matchLogic: () => agents.filter((a) => a.area.toLowerCase().includes('chicago')) },
  { patterns: ['luxury', 'high end', 'million'], response: "Top luxury specialists across your network:", matchLogic: () => agents.filter((a) => a.tags.includes('Luxury')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5) },
  { patterns: ['relocation', 'relocat', 'moving'], response: "Relocation specialists with the highest success rates:", matchLogic: () => agents.filter((a) => a.tags.includes('Relocation')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5) },
  { patterns: ['phoenix', 'scottsdale', 'arizona', 'az'], response: "Darius King at Real Broker Arizona — in your brokerage, 91 ReferNet Score, New Construction & Relocation specialist.", matchLogic: () => agents.filter((a) => a.area.toLowerCase().includes('phoenix') || a.area.toLowerCase().includes('scottsdale')) },
  { patterns: ['denver', 'colorado', 'co'], response: "Lily Park at Real Broker Denver — your brokerage, 88 ReferNet Score, Luxury + Relocation + Land & Acreage.", matchLogic: () => agents.filter((a) => a.area.toLowerCase().includes('denver')) },
  { patterns: ['dallas', 'fort worth', 'dfw', 'texas', 'tx'], response: "Carlos Vega at RE/MAX Dallas — 102 deals/year, 94 ReferNet Score, Luxury + New Construction + Investment.", matchLogic: () => agents.filter((a) => a.area.toLowerCase().includes('dallas')) },
  { patterns: ['first time', 'first-time', 'ftb', 'starter'], response: "Best first-time buyer specialists:", matchLogic: () => agents.filter((a) => a.tags.includes('First-Time Buyers')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5) },
  { patterns: ['investment', 'investor', 'rental', '1031'], response: "Investment property specialists:", matchLogic: () => agents.filter((a) => a.tags.includes('Investment')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5) },
  { patterns: ['my brokerage', 'real broker', 'our network', 'internal'], response: "Real Broker agents on AgentReferrals.ai:", matchLogic: () => agents.filter((a) => a.brokerageId === 'real').sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)) },
]

function findResponse(query: string): { text: string; agents: Agent[] } {
  const lower = query.toLowerCase()
  for (const r of NORA_RESPONSES) {
    if (r.patterns.some((p) => lower.includes(p))) {
      return { text: r.response, agents: r.matchLogic ? r.matchLogic(lower) : [] }
    }
  }
  return {
    text: "I can help you find the right agent! Try:\n\n• \"Luxury agent in Nashville\"\n• \"Who covers Phoenix?\"\n• \"Relocation specialists\"\n• \"Investment agents in Dallas\"\n• \"Who's in my brokerage?\"",
    agents: [],
  }
}

export default function NoraChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<NoraMessage[]>([
    { id: 'welcome', role: 'assistant', content: "Hi Jason! I'm NORA, your AI referral assistant. Tell me about your client and I'll find the perfect agent match.", timestamp: new Date() },
  ])
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function handleSend() {
    if (!input.trim()) return
    const userMsg: NoraMessage = { id: `u-${Date.now()}`, role: 'user', content: input.trim(), timestamp: new Date() }
    setMessages((p) => [...p, userMsg])
    setInput('')
    setTimeout(() => {
      const result = findResponse(userMsg.content)
      setMessages((p) => [...p, { id: `n-${Date.now()}`, role: 'assistant', content: result.text, timestamp: new Date(), matchedAgents: result.agents }])
    }, 500)
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
        <div className="fixed bottom-22 right-6 z-[900] w-[380px] max-w-[calc(100vw-48px)] h-[520px] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-[family-name:var(--font-d)] font-bold text-sm">NORA</div>
              <div className="text-[10px] text-muted-foreground">AI Referral Assistant</div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold text-emerald-500">Online</span>
            </div>
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
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-[family-name:var(--font-d)] font-bold text-[10px] text-white shrink-0" style={{ background: agent.color }}>
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
                          <div className="flex gap-0.5 mt-1">
                            {agent.tags.slice(0, 2).map((t) => (
                              <span key={t} className="px-1 py-0.5 rounded text-[8px] font-semibold text-white" style={{ background: TAG_COLORS[t] }}>{t}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[10px] font-bold text-emerald-500">{agent.closedReferrals} closed</div>
                          <div className="text-[9px] text-muted-foreground">{agent.responseTime}</div>
                        </div>
                      </div>
                    ))}
                    <button className="w-full py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      Start Referral with Top Match
                    </button>
                  </div>
                )}
              </div>
            ))}
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
              />
              <button onClick={handleSend} className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
