'use client'

import { useState, useEffect } from 'react'
import { Check, ShoppingCart, Home, Clock, Mail, Phone, MessageSquare, Smartphone } from 'lucide-react'

interface ExpectationItem {
  id: string
  category: 'buyer' | 'seller' | 'general'
  event_key: string
  label: string
  description: string | null
  trigger_type: string
}

interface ProfileExpectationsData {
  send: ExpectationItem[]
  receive: ExpectationItem[]
  updateMethod: string
  responseTime: string
}

const METHOD_INFO: Record<string, { label: string; icon: typeof Mail }> = {
  email: { label: 'Email', icon: Mail },
  text: { label: 'Text', icon: Smartphone },
  phone: { label: 'Phone', icon: Phone },
  in_app: { label: 'In-App', icon: MessageSquare },
}

const TIME_LABELS: Record<string, string> = {
  same_day: 'Same Day',
  '24hrs': 'Within 24hrs',
  '48hrs': 'Within 48hrs',
}

export function AgentExpectationsDisplay({ agentId }: { agentId: string }) {
  const [data, setData] = useState<ProfileExpectationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>('buyer')

  useEffect(() => {
    fetch(`/api/expectations/profile?agentId=${agentId}`)
      .then((res) => res.json())
      .then((d: ProfileExpectationsData) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [agentId])

  if (loading || !data) return null

  // Filter to "receive" side — these are what the agent commits to when they receive a referral
  const buyerCommitments = data.receive.filter((e) => e.category === 'buyer' || e.category === 'general')
  const sellerCommitments = data.receive.filter((e) => e.category === 'seller' || e.category === 'general')

  const hasAny = buyerCommitments.length > 0 || sellerCommitments.length > 0
  if (!hasAny) return null

  const activeCommitments = activeTab === 'buyer' ? buyerCommitments : sellerCommitments
  const methodInfo = METHOD_INFO[data.updateMethod] ?? METHOD_INFO.email

  return (
    <section>
      <h2 className="text-lg font-bold mb-3">Referral Expectations</h2>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Preferences bar */}
        <div className="flex items-center gap-3 px-5 py-3 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <methodInfo.icon className="w-3.5 h-3.5" />
            Prefers updates via {methodInfo.label}
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Responds {TIME_LABELS[data.responseTime] ?? data.responseTime}
          </div>
        </div>

        {/* Tab toggle */}
        <div className="flex items-center gap-1 px-5 pt-4 pb-2">
          <button
            onClick={() => setActiveTab('buyer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'buyer' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Buyer Referral
            <span className="text-[10px]">({buyerCommitments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('seller')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'seller' ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Seller Referral
            <span className="text-[10px]">({sellerCommitments.length})</span>
          </button>
        </div>

        {/* Commitments list */}
        <div className="px-5 pb-5">
          {activeCommitments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3">No {activeTab} referral expectations set.</p>
          ) : (
            <div className="space-y-1 mt-1">
              {activeCommitments.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
                >
                  <div className="w-4 h-4 rounded shrink-0 mt-0.5 bg-emerald-500 text-white flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
