'use client'

import { useState, useRef, useEffect } from 'react'
import { agents } from '@/data/agents'
import { TAG_COLORS } from '@/lib/constants'
import { formatCurrency, getInitials } from '@/lib/utils'
import type { Agent, NoraMessage } from '@/types'

const NORA_RESPONSES: { patterns: string[]; response: string; matchLogic?: (query: string) => Agent[] }[] = [
  {
    patterns: ['nashville', 'tennessee', 'tn'],
    response: "I found agents covering the Nashville metro area. Ashley Monroe at Real Broker is your top match — she has a 95 ReferNet Score, specializes in Relocation and Luxury, and closes referrals in an average of 23 days. She's also within your brokerage network.",
    matchLogic: () => agents.filter((a) => a.area.toLowerCase().includes('nashville')),
  },
  {
    patterns: ['chicago', 'illinois', 'il'],
    response: "Great market! Marcus Reid at Compass Chicago is your best match — 94 ReferNet Score, 88 deals/year, specializes in Luxury, Investment, and Relocation. He responds within 30 minutes on average.",
    matchLogic: () => agents.filter((a) => a.area.toLowerCase().includes('chicago')),
  },
  {
    patterns: ['luxury', 'high end', 'million'],
    response: "Here are your top luxury specialists across the network, ranked by ReferNet Score and closed referral volume:",
    matchLogic: () => agents.filter((a) => a.tags.includes('Luxury')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5),
  },
  {
    patterns: ['relocation', 'relocat', 'moving'],
    response: "I've identified agents who specialize in relocation referrals. These agents have high success rates with clients moving to new markets:",
    matchLogic: () => agents.filter((a) => a.tags.includes('Relocation')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5),
  },
  {
    patterns: ['phoenix', 'scottsdale', 'arizona', 'az'],
    response: "Darius King at Real Broker Arizona is your ideal match — he's in your brokerage, has a 91 ReferNet Score, and specializes in New Construction and Relocation in the Phoenix/Scottsdale market.",
    matchLogic: () => agents.filter((a) => a.area.toLowerCase().includes('phoenix') || a.area.toLowerCase().includes('scottsdale')),
  },
  {
    patterns: ['denver', 'colorado', 'co'],
    response: "Lily Park at Real Broker Denver covers the metro area — 88 ReferNet Score, specializes in Luxury, Relocation, and Land & Acreage. She's in your brokerage network.",
    matchLogic: () => agents.filter((a) => a.area.toLowerCase().includes('denver')),
  },
  {
    patterns: ['dallas', 'fort worth', 'dfw', 'texas', 'tx'],
    response: "Carlos Vega at RE/MAX Dallas is a top producer — 102 deals/year, 94 ReferNet Score, and specializes in Luxury, New Construction, and Investment properties. Different brokerage but excellent track record.",
    matchLogic: () => agents.filter((a) => a.area.toLowerCase().includes('dallas')),
  },
  {
    patterns: ['first time', 'first-time', 'ftb', 'starter'],
    response: "Here are your best first-time buyer specialists — agents experienced in guiding new homeowners through the process:",
    matchLogic: () => agents.filter((a) => a.tags.includes('First-Time Buyers')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5),
  },
  {
    patterns: ['investment', 'investor', 'rental', '1031'],
    response: "These agents specialize in investment properties and understand investor needs — 1031 exchanges, rental analysis, and multi-family:",
    matchLogic: () => agents.filter((a) => a.tags.includes('Investment')).sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)).slice(0, 5),
  },
  {
    patterns: ['my brokerage', 'real broker', 'our network', 'internal'],
    response: "Here are all Real Broker agents currently on AgentReferrals.ai, sorted by ReferNet Score:",
    matchLogic: () => agents.filter((a) => a.brokerageId === 'real').sort((a, b) => (b.referNetScore || 0) - (a.referNetScore || 0)),
  },
]

function findResponse(query: string): { text: string; agents: Agent[] } {
  const lower = query.toLowerCase()
  for (const r of NORA_RESPONSES) {
    if (r.patterns.some((p) => lower.includes(p))) {
      return { text: r.response, agents: r.matchLogic ? r.matchLogic(lower) : [] }
    }
  }
  // Default response
  return {
    text: `I'd be happy to help you find the right agent! You can ask me things like:\n\n• "Find me a luxury agent in Nashville"\n• "Who covers the Chicago market?"\n• "Show me relocation specialists"\n• "Investment property agents in Dallas"\n• "Who's in my brokerage network?"\n\nJust describe what you need and I'll match you with the best agents.`,
    agents: [],
  }
}

export default function NoraChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<NoraMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi Jason! I'm NORA, your AI referral assistant. I can help you find the perfect agent for your client referrals.\n\nTry asking me: \"I need a luxury agent in Nashville\" or \"Who covers the Phoenix market?\"",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (!input.trim()) return

    const userMsg: NoraMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')

    // Simulate AI response
    setTimeout(() => {
      const result = findResponse(userMsg.content)
      const assistantMsg: NoraMessage = {
        id: `nora-${Date.now()}`,
        role: 'assistant',
        content: result.text,
        timestamp: new Date(),
        matchedAgents: result.agents,
      }
      setMessages((prev) => [...prev, assistantMsg])
    }, 600)
  }

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[900] w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, var(--accent), #d4880a)',
          boxShadow: '0 4px 24px rgba(240,165,0,0.4)',
        }}
      >
        {isOpen ? (
          <span className="text-xl" style={{ color: '#0f1117' }}>✕</span>
        ) : (
          <span className="text-2xl" style={{ color: '#0f1117' }}>✦</span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-[900] w-[400px] max-w-[calc(100vw-48px)] flex flex-col"
          style={{
            height: '560px',
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderRadius: 'var(--r-lg)',
            boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, var(--accent), #d4880a)' }}
            >
              <span style={{ color: '#0f1117' }}>✦</span>
            </div>
            <div>
              <div className="font-[family-name:var(--font-d)] font-bold text-sm">NORA</div>
              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>AI Referral Assistant · AgentReferrals.ai</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)' }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }} />
              <span className="text-[10px] font-semibold" style={{ color: 'var(--green)' }}>Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[85%] px-3.5 py-2.5 rounded-xl text-[13px] leading-relaxed whitespace-pre-line"
                    style={{
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--surf2)',
                      color: msg.role === 'user' ? '#0f1117' : 'var(--text)',
                      border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                      borderBottomRightRadius: msg.role === 'user' ? '4px' : undefined,
                      borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : undefined,
                    }}
                  >
                    {msg.content}
                  </div>
                </div>

                {/* Matched agent cards */}
                {msg.matchedAgents && msg.matchedAgents.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.matchedAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="flex items-center gap-3 p-3 rounded-lg transition-all hover:border-[var(--border2)]"
                        style={{ background: 'var(--surf2)', border: '1px solid var(--border)' }}
                      >
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-[family-name:var(--font-d)] font-bold text-xs shrink-0"
                          style={{ background: agent.color, color: '#0f1117' }}
                        >
                          {getInitials(agent.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold">{agent.name}</span>
                            {agent.referNetScore && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{
                                  background: agent.referNetScore >= 90 ? 'rgba(34,197,94,0.15)' : 'rgba(240,165,0,0.15)',
                                  color: agent.referNetScore >= 90 ? 'var(--green)' : 'var(--accent)',
                                }}
                              >
                                {agent.referNetScore}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px]" style={{ color: 'var(--text-dim)' }}>
                            {agent.brokerage} · {agent.area}
                          </div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {agent.tags.slice(0, 3).map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                                style={{ background: TAG_COLORS[t], color: '#0f1117' }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[11px] font-bold" style={{ color: 'var(--green)' }}>
                            {agent.closedReferrals || 0} closed
                          </div>
                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {agent.responseTime || '< 2hr'}
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      className="w-full py-2 rounded-md text-xs font-semibold font-[family-name:var(--font-d)] transition-all"
                      style={{ background: 'var(--accent-bg)', border: '1px solid rgba(240,165,0,0.3)', color: 'var(--accent)' }}
                    >
                      Start Referral with Top Match
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                placeholder="Ask NORA to find an agent..."
                className="flex-1 px-3.5 py-2.5 text-[13px] rounded-lg"
                style={{ background: 'var(--surf2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <button
                onClick={handleSend}
                className="px-4 py-2.5 rounded-lg font-[family-name:var(--font-d)] font-bold text-xs transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--accent), #d4880a)', color: '#0f1117' }}
              >
                Send
              </button>
            </div>
            <div className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
              Powered by NORA · AgentReferrals.ai
            </div>
          </div>
        </div>
      )}
    </>
  )
}
