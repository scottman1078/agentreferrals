'use client'

import { useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useAdminTier } from '@/contexts/admin-tier-context'
import { useDemo } from '@/contexts/demo-context'
import { PLANS, type SubscriptionTier } from '@/lib/stripe'
import { usePricing } from '@/hooks/use-pricing'

/** Feature keys — union of hardcoded and database keys */
export type FeatureKey = string

/** Tier hierarchy for comparison */
const TIER_RANK: Record<SubscriptionTier, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
  elite: 3,
}

const ADMIN_EMAILS = ['scott@agentdashboards.com']

/**
 * Returns the user's current subscription tier and helpers
 * for checking feature access.
 *
 * Tries database tiers first (via usePricing), falls back to hardcoded PLANS.
 */
export function useFeatureGate() {
  const { profile } = useAuth()
  const { tierOverride, setTierOverride } = useAdminTier()
  const { isDemoMode } = useDemo()
  const { tiers: dbTiers, isLoading: pricingLoading } = usePricing()

  const isAdmin = ADMIN_EMAILS.includes(profile?.email ?? '') || profile?.is_admin === true
  const canSwitchTier = isAdmin || isDemoMode

  const tier: SubscriptionTier = useMemo(() => {
    if (canSwitchTier && tierOverride) return tierOverride
    if (isDemoMode) return tierOverride || 'pro'
    const raw = profile?.subscription_tier
    if (raw && raw in TIER_RANK) return raw as SubscriptionTier
    return 'starter'
  }, [profile?.subscription_tier, canSwitchTier, isDemoMode, tierOverride])

  // Use database tiers if available, otherwise fall back to hardcoded PLANS
  const useDbTiers = dbTiers.length > 0 && !pricingLoading

  const plan = useMemo(() => {
    if (useDbTiers) {
      const dbTier = dbTiers.find((t) => t.slug === tier)
      if (dbTier) {
        // Map database tier to match PlanConfig shape for compatibility
        return {
          id: dbTier.slug as SubscriptionTier,
          name: dbTier.name,
          price: dbTier.price_cents / 100,
          priceLabel: dbTier.price_label,
          description: dbTier.description ?? '',
          recommended: dbTier.is_recommended,
          features: dbTier.features,
        }
      }
    }
    return PLANS.find((p) => p.id === tier)!
  }, [tier, useDbTiers, dbTiers])

  // Build the ordered tiers list for functions that iterate all tiers
  const allTiers = useMemo(() => {
    if (useDbTiers) {
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
  }, [useDbTiers, dbTiers])

  /** Check if a boolean feature is enabled for the current tier */
  const hasFeature = (key: FeatureKey): boolean => {
    const value = plan.features[key]
    return value === true
  }

  /** Get a feature's value (e.g. "10", "Unlimited", "Basic") */
  const featureValue = (key: FeatureKey): string | boolean => {
    return plan.features[key]
  }

  /** Check if user's tier is at least the given tier */
  const isAtLeast = (minTier: SubscriptionTier): boolean => {
    return (TIER_RANK[tier] ?? 0) >= (TIER_RANK[minTier] ?? 0)
  }

  /** Get the minimum tier required for a feature */
  const requiredTier = (key: FeatureKey): SubscriptionTier | null => {
    for (const p of allTiers) {
      if (p.features[key] === true || (typeof p.features[key] === 'string' && p.features[key] !== 'false')) {
        return p.id
      }
    }
    return null
  }

  const setAdminTier = (t: SubscriptionTier) => {
    setTierOverride(t)
  }

  return {
    tier,
    plan,
    hasFeature,
    featureValue,
    isAtLeast,
    requiredTier,
    isAdmin,
    canSwitchTier,
    isDemoMode,
    setAdminTier,
  }
}
