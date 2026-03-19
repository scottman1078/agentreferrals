'use client'

import { useFeatureGate } from '@/hooks/use-feature-gate'
import { usePathname } from 'next/navigation'
import { PLANS, type SubscriptionTier } from '@/lib/stripe'
import { Shield } from 'lucide-react'

const TIER_COLORS: Record<SubscriptionTier, string> = {
  starter: 'bg-gray-500',
  growth: 'bg-blue-500',
  pro: 'bg-violet-500',
  elite: 'bg-amber-500',
}

export default function AdminTierSwitcher() {
  const { canSwitchTier, tier, setAdminTier, isDemoMode } = useFeatureGate()
  const pathname = usePathname()

  if (!canSwitchTier) return null
  if (pathname === '/dashboard/setup') return null

  return (
    <div className="fixed bottom-[120px] left-4 z-[900]">
      <div className="w-[170px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        <div className="px-3 py-2 border-b border-border flex items-center gap-1.5">
          {!isDemoMode && <Shield className="w-3 h-3 text-muted-foreground" />}
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isDemoMode ? 'Explore Plans' : 'Admin Tier Override'}
          </div>
        </div>
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            onClick={() => {
              setAdminTier(plan.id)
              // Small delay to let state persist, then reload to reflect feature changes
              setTimeout(() => window.location.reload(), 100)
            }}
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
    </div>
  )
}
