'use client'

import { useState, useEffect, useMemo } from 'react'
import { PLANS, FEATURE_LABELS, type SubscriptionTier } from '@/lib/stripe'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { useAuth } from '@/contexts/auth-context'
import { usePricing, type PricingTier } from '@/hooks/use-pricing'
import { useSearchParams } from 'next/navigation'
import BackToDashboard from '@/components/layout/back-to-dashboard'
import { Check, X, CreditCard, Sparkles, Crown, Zap, Rocket, Loader2, CheckCircle2, XCircle } from 'lucide-react'

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

export default function BillingPage() {
  const { tier: currentTier } = useFeatureGate()
  const { profile, refreshProfile } = useAuth()
  const searchParams = useSearchParams()
  const { tiers: dbTiers, featureDefinitions, isLoading: pricingLoading } = usePricing()

  // Build plans from DB tiers or fall back to hardcoded PLANS
  const plans = useMemo(() => {
    if (dbTiers.length > 0 && !pricingLoading) {
      return dbTiers.map((t) => ({
        id: t.slug as SubscriptionTier,
        name: t.name,
        price: t.price_cents / 100,
        priceLabel: t.price_label,
        description: t.description ?? '',
        recommended: t.is_recommended,
        features: t.features,
      }))
    }
    return PLANS
  }, [dbTiers, pricingLoading])

  // Build feature labels from DB or fall back to hardcoded
  const featureLabels = useMemo(() => {
    if (featureDefinitions.length > 0 && !pricingLoading) {
      const labels: Record<string, string> = {}
      for (const fd of featureDefinitions) {
        labels[fd.key] = fd.label
      }
      return labels
    }
    return FEATURE_LABELS
  }, [featureDefinitions, pricingLoading])

  const featureKeys = Object.keys(featureLabels)
  const currentPlan = plans.find((p) => p.id === currentTier) ?? plans[0]

  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Handle billing success/cancelled URL params
  useEffect(() => {
    const billing = searchParams.get('billing')
    if (billing === 'success') {
      setToast({ type: 'success', message: 'Subscription activated! Your plan has been upgraded.' })
      refreshProfile()
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard/billing')
    } else if (billing === 'cancelled') {
      setToast({ type: 'error', message: 'Checkout was cancelled. No changes were made.' })
      window.history.replaceState({}, '', '/dashboard/billing')
    }
  }, [searchParams, refreshProfile])

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 6000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!profile?.id || tier === 'starter') return

    setLoadingTier(tier)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, plan: tier }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('[Billing] Checkout error:', err)
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to start checkout' })
      setLoadingTier(null)
    }
  }

  const handleManage = async () => {
    if (!profile?.id) return

    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to open subscription portal')
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      console.error('[Billing] Portal error:', err)
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to open portal' })
    } finally {
      setPortalLoading(false)
    }
  }

  return (
    <div className="overflow-y-auto h-full p-4 sm:p-6">
      <div className="max-w-[1100px] mx-auto">
        <BackToDashboard />

        {/* Toast notification */}
        {toast && (
          <div
            className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
              toast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-sm">{toast.type === 'success' ? 'Success' : 'Cancelled'}</div>
              <div className="text-xs mt-0.5 opacity-80">{toast.message}</div>
            </div>
          </div>
        )}

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
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${tierColors[currentTier]?.bg ?? 'bg-secondary'} flex items-center justify-center shrink-0`}>
                {(() => { const Icon = tierIcons[currentTier] ?? Zap; return <Icon className={`w-5 h-5 ${tierColors[currentTier]?.text ?? 'text-muted-foreground'}`} /> })()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base">
                    {currentPlan?.name ?? 'Starter'} Plan
                  </span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tierColors[currentTier]?.badge ?? 'bg-secondary text-muted-foreground'}`}>
                    Current
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {currentTier === 'starter'
                    ? "You're on the free plan. Upgrade to unlock more features."
                    : `${currentPlan?.priceLabel ?? ''} — Manage your subscription below.`}
                </p>
              </div>
            </div>
            {currentTier !== 'starter' && (
              <button
                onClick={handleManage}
                disabled={portalLoading}
                className="h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors w-full sm:w-auto disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {portalLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
        {pricingLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-xl border-2 border-border bg-card animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-muted mb-3" />
                <div className="h-4 w-20 bg-muted rounded mb-1" />
                <div className="h-3 w-32 bg-muted rounded mb-3" />
                <div className="h-8 w-20 bg-muted rounded mb-4" />
                <div className="h-9 w-full bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentTier
              const isRecommended = plan.recommended
              const colors = tierColors[plan.id] ?? tierColors.starter
              const Icon = tierIcons[plan.id] ?? Zap
              const isLoading = loadingTier === plan.id

              return (
                <div
                  key={plan.id}
                  className={`relative p-5 rounded-xl border-2 bg-card transition-all ${
                    isCurrent
                      ? `${colors.border} shadow-lg shadow-primary/5`
                      : isRecommended && !plans.some((p) => p.id === currentTier && p.id !== 'starter')
                      ? `${colors.border} shadow-lg shadow-primary/5`
                      : 'border-border hover:border-border/80'
                  }`}
                >
                  {isCurrent && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                      Current Plan
                    </div>
                  )}
                  {isRecommended && !isCurrent && (
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
                  ) : plan.id === 'starter' ? (
                    currentTier !== 'starter' ? (
                      <button
                        onClick={handleManage}
                        disabled={portalLoading}
                        className="w-full h-9 rounded-lg text-sm font-bold bg-secondary text-foreground hover:bg-accent border border-border transition-all disabled:opacity-50"
                      >
                        Downgrade
                      </button>
                    ) : (
                      <div className="h-9 rounded-lg border border-border flex items-center justify-center text-sm font-medium text-muted-foreground">
                        Current Plan
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isLoading || loadingTier !== null}
                      className={`w-full h-9 rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                        isRecommended
                          ? 'bg-primary text-primary-foreground hover:opacity-90'
                          : 'bg-secondary text-foreground hover:bg-accent border border-border'
                      }`}
                    >
                      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {plans.findIndex((p) => p.id === plan.id) < plans.findIndex((p) => p.id === currentTier)
                        ? 'Downgrade'
                        : 'Upgrade'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}

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
                  {plans.map((plan) => (
                    <th
                      key={plan.id}
                      className={`text-center font-semibold text-xs uppercase tracking-wider p-4 ${
                        plan.recommended ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{plan.name}</span>
                        {plan.id === currentTier && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tierColors[plan.id]?.badge ?? 'bg-secondary text-muted-foreground'}`}>
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
                    <td className="p-4 text-sm font-medium">{featureLabels[key]}</td>
                    {plans.map((plan) => {
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
              { q: 'What is the Founding Member offer?', a: 'The first 1,000 subscribers get 50% off for 6 months. This discount is applied automatically at checkout.' },
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
