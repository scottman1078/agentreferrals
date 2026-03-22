'use client'

import { useState, useEffect } from 'react'

export interface PricingTier {
  id: string
  slug: string
  name: string
  description: string | null
  price_cents: number
  price_label: string
  period: string
  is_recommended: boolean
  cta_label: string
  landing_features: string[]
  stripe_product_id: string | null
  stripe_price_id: string | null
  stripe_price_founding_id: string | null
  sort_order: number
  is_active: boolean
  features: Record<string, string | boolean>
}

export interface FeatureDefinition {
  id: string
  key: string
  label: string
  description: string | null
  category: string
  sort_order: number
  is_active: boolean
}

interface PricingData {
  tiers: PricingTier[]
  featureDefinitions: FeatureDefinition[]
}

let cachedData: PricingData | null = null
let fetchPromise: Promise<PricingData> | null = null

async function fetchPricing(): Promise<PricingData> {
  try {
    const res = await fetch('/api/pricing')
    const data = await res.json()
    return {
      tiers: data.tiers ?? [],
      featureDefinitions: data.featureDefinitions ?? [],
    }
  } catch {
    return { tiers: [], featureDefinitions: [] }
  }
}

export function usePricing() {
  const [data, setData] = useState<PricingData>(
    cachedData ?? { tiers: [], featureDefinitions: [] },
  )
  const [isLoading, setIsLoading] = useState(!cachedData)

  useEffect(() => {
    if (cachedData) {
      setData(cachedData)
      setIsLoading(false)
      return
    }

    if (!fetchPromise) {
      fetchPromise = fetchPricing()
    }

    fetchPromise.then((result) => {
      cachedData = result
      setData(result)
      setIsLoading(false)
    })
  }, [])

  return {
    tiers: data.tiers,
    featureDefinitions: data.featureDefinitions,
    isLoading,
  }
}

/** Invalidate cache so next mount re-fetches */
export function invalidatePricing() {
  cachedData = null
  fetchPromise = null
}
