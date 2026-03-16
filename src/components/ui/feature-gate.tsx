'use client'

import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Sparkles } from 'lucide-react'
import { useFeatureGate, type FeatureKey } from '@/hooks/use-feature-gate'
import { FEATURE_LABELS } from '@/lib/stripe'

interface FeatureGateProps {
  /** The feature key to check */
  feature: FeatureKey
  /** Content to render if user has access */
  children: ReactNode
  /** Optional: render a custom fallback instead of the default upgrade card */
  fallback?: ReactNode
}

/**
 * Wraps content that requires a specific subscription tier.
 * Shows an upgrade prompt if the user's tier doesn't include the feature.
 */
export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, requiredTier } = useFeatureGate()
  const router = useRouter()

  if (hasFeature(feature)) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  const needed = requiredTier(feature)
  const featureName = FEATURE_LABELS[feature] ?? feature

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="font-bold text-lg mb-2">{featureName}</h2>
        <p className="text-sm text-muted-foreground mb-5">
          This feature requires the{' '}
          <span className="font-semibold text-primary capitalize">{needed}</span>{' '}
          plan or higher. Upgrade to unlock.
        </p>
        <button
          onClick={() => router.push('/dashboard/billing')}
          className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade Plan
        </button>
      </div>
    </div>
  )
}
