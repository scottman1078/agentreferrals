'use client'

import { useState } from 'react'
import { PLANS, FEATURE_LABELS, type SubscriptionTier } from '@/lib/stripe'
import { Check, X, CreditCard, Sparkles, Crown, Zap, Rocket } from 'lucide-react'

const tierIcons: Record<SubscriptionTier, typeof Zap> = {
  starter: Zap,
  growth: Rocket,
  pro: Sparkles,
  elite: Crown,
}

const tierColors: Record<SubscriptionTier, { text: string; bg: string; border: string; badge: string }> = {
  starter: { text: 'text-muted-foreground', bg: 'bg-secondary', border: 'border-border', badge: 'bg-secondary text-muted-foreground' },
  growth: { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', badge: 'bg-blue-500/10 text-blue-500' },
  pro: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', badge: 'bg-primary/10 text-primary' },
  elite: { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'bg-amber-500/10 text-amber-500' },
}

const featureKeys = Object.keys(FEATURE_LABELS)

export default function BillingPage() {
  // TODO: Read from ar_profiles.subscription_tier when wired to Supabase
  const [currentTier] = useState<SubscriptionTier>('starter')
  const currentPlan = PLANS.find((p) => p.id === currentTier)!

  const handleUpgrade = (tier: SubscriptionTier) => {
    // TODO: Wire to Stripe checkout session
    console.log(`[Billing] Upgrade to ${tier} — Stripe checkout not yet configured`)
  }

  const handleManage = () => {
    // TODO: Wire to Stripe customer portal
    console.log('[Billing] Manage subscription — Stripe portal not yet configured')
  }

  return (
    <div className="overflow-y-auto h-full p-4 sm:p-6">
      <div className="max-w-[1100px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-xl">Billing</h1>
            <p className="text-xs text-muted-foreground">Manage your subscription and plan</p>
          </div>
        </div>

        {/* Current Plan Card */}
        <div className="p-4 sm:p-6 rounded-xl border border-border bg-card mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${tierColors[currentTier].bg} flex items-center justify-center shrink-0`}>
                {(() => { const Icon = tierIcons[currentTier]; return <Icon className={`w-5 h-5 ${tierColors[currentTier].text}`} /> })()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base">
                    {currentPlan.name} Plan
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tierColors[currentTier].badge}`}>
                    Current
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {currentTier === 'starter'
                    ? "You're on the free plan. Upgrade to unlock more features."
                    : `${currentPlan.priceLabel} — Next billing date: April 14, 2026`}
                </p>
              </div>
            </div>
            {currentTier !== 'starter' && (
              <button
                onClick={handleManage}
                className="h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors w-full sm:w-auto"
              >
                Manage Subscription
              </button>
            )}
          </div>
        </div>

        {/* Plan Comparison */}
        <div className="mb-4">
          <h2 className="font-bold text-base mb-1">Choose your plan</h2>
          <p className="text-xs text-muted-foreground">All plans include a 14-day free trial. Cancel anytime.</p>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentTier
            const isRecommended = plan.recommended
            const colors = tierColors[plan.id]
            const Icon = tierIcons[plan.id]

            return (
              <div
                key={plan.id}
                className={`relative p-5 rounded-xl border-2 bg-card transition-all ${
                  isRecommended
                    ? `${colors.border} shadow-lg shadow-primary/5`
                    : isCurrent
                    ? 'border-border bg-accent/30'
                    : 'border-border hover:border-border/80'
                }`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                    Recommended
                  </div>
                )}

                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4.5 h-4.5 ${colors.text}`} />
                </div>

                <div className="font-bold text-base mb-0.5">{plan.name}</div>
                <div className="text-xs text-muted-foreground mb-3">{plan.description}</div>

                <div className="mb-4">
                  {plan.price === 0 ? (
                    <div className="font-extrabold text-2xl">Free</div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="font-extrabold text-2xl">${plan.price}</span>
                      <span className="text-xs text-muted-foreground">/mo</span>
                    </div>
                  )}
                </div>

                {isCurrent ? (
                  <div className="h-9 rounded-lg border border-border flex items-center justify-center text-sm font-medium text-muted-foreground">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    className={`w-full h-9 rounded-lg text-sm font-bold transition-all ${
                      isRecommended
                        ? 'bg-primary text-primary-foreground hover:opacity-90'
                        : 'bg-secondary text-foreground hover:bg-accent border border-border'
                    }`}
                  >
                    {PLANS.findIndex((p) => p.id === plan.id) < PLANS.findIndex((p) => p.id === currentTier)
                      ? 'Downgrade'
                      : 'Upgrade'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-5 border-b border-border">
            <div className="font-bold text-sm">Feature Comparison</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground p-4 w-[200px]">
                    Feature
                  </th>
                  {PLANS.map((plan) => (
                    <th
                      key={plan.id}
                      className={`text-center font-semibold text-xs uppercase tracking-wider p-4 ${
                        plan.recommended ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{plan.name}</span>
                        {plan.id === currentTier && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tierColors[plan.id].badge}`}>
                            Current
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureKeys.map((key, i) => (
                  <tr
                    key={key}
                    className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-accent/30'}`}
                  >
                    <td className="p-4 text-sm font-medium">{FEATURE_LABELS[key]}</td>
                    {PLANS.map((plan) => {
                      const value = plan.features[key]
                      return (
                        <td key={plan.id} className="p-4 text-center">
                          {value === true ? (
                            <div className="flex justify-center">
                              <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <Check className="w-3 h-3 text-emerald-500" />
                              </div>
                            </div>
                          ) : value === false ? (
                            <div className="flex justify-center">
                              <X className="w-3.5 h-3.5 text-muted-foreground/40" />
                            </div>
                          ) : (
                            <span className={`text-xs font-semibold ${plan.recommended ? 'text-primary' : ''}`}>
                              {value}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ / Note */}
        <div className="mt-6 p-5 rounded-xl border border-border bg-card">
          <div className="font-bold text-sm mb-3">Frequently Asked Questions</div>
          <div className="space-y-3">
            {[
              { q: 'Can I change plans at any time?', a: 'Yes. Upgrades take effect immediately. Downgrades apply at the end of your billing cycle.' },
              { q: 'Is there a contract or commitment?', a: 'No. All plans are month-to-month. Cancel anytime with no penalties.' },
              { q: 'What happens to my data if I downgrade?', a: 'Your data is never deleted. Features above your plan limit become read-only until you upgrade again.' },
            ].map((faq) => (
              <div key={faq.q}>
                <div className="text-sm font-medium">{faq.q}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
