'use client'

import { useMemo } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PLANS, type SubscriptionTier } from '@/lib/stripe'

/** Feature keys from the PLANS config */
export type FeatureKey = keyof (typeof PLANS)[0]['features']

/** Tier hierarchy for comparison */
const TIER_RANK: Record<SubscriptionTier, number> = {
  starter: 0,
  growth: 1,
  pro: 2,
  elite: 3,
}

/**
 * Returns the user's current subscription tier and helpers
 * for checking feature access.
 */
export function useFeatureGate() {
  const { profile } = useAuth()

  const tier: SubscriptionTier = useMemo(() => {
    const raw = profile?.subscription_tier
    if (raw && raw in TIER_RANK) return raw as SubscriptionTier
    return 'starter'
  }, [profile?.subscription_tier])

  const plan = useMemo(() => PLANS.find((p) => p.id === tier)!, [tier])

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
    return TIER_RANK[tier] >= TIER_RANK[minTier]
  }

  /** Get the minimum tier required for a feature */
  const requiredTier = (key: FeatureKey): SubscriptionTier | null => {
    for (const p of PLANS) {
      if (p.features[key] === true || (typeof p.features[key] === 'string' && p.features[key] !== 'false')) {
        return p.id
      }
    }
    return null
  }

  return {
    tier,
    plan,
    hasFeature,
    featureValue,
    isAtLeast,
    requiredTier,
  }
}
