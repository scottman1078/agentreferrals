'use client'

import { useState } from 'react'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { PLANS, type SubscriptionTier } from '@/lib/stripe'
import { Shield, ChevronUp, ChevronDown } from 'lucide-react'

const TIER_COLORS: Record<SubscriptionTier, string> = {
  starter: 'bg-gray-500',
  growth: 'bg-blue-500',
  pro: 'bg-violet-500',
  elite: 'bg-amber-500',
}

export default function AdminTierSwitcher() {
  const { isAdmin, tier, setAdminTier } = useFeatureGate()
  const [expanded, setExpanded] = useState(false)

  if (!isAdmin) return null

  return (
    <div className="fixed bottom-20 left-4 z-[9999]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 h-8 px-3 rounded-lg bg-card border border-border shadow-lg text-xs font-bold hover:bg-accent transition-all"
      >
        <Shield className="w-3.5 h-3.5 text-primary" />
        <span className={`w-2 h-2 rounded-full ${TIER_COLORS[tier]}`} />
        <span className="capitalize">{tier}</span>
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {expanded && (
        <div className="absolute bottom-10 left-0 w-[160px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="px-3 py-2 border-b border-border">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Admin Tier Override</div>
          </div>
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => { setAdminTier(plan.id); setExpanded(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold transition-all ${
                tier === plan.id ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-foreground'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${TIER_COLORS[plan.id]}`} />
              <span>{plan.name}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{plan.priceLabel}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
