'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import type { SubscriptionTier } from '@/lib/stripe'

const TIER_OVERRIDE_KEY = 'ar_admin_tier_override'

interface AdminTierContextType {
  tierOverride: SubscriptionTier | null
  setTierOverride: (tier: SubscriptionTier) => void
}

const AdminTierContext = createContext<AdminTierContextType>({
  tierOverride: null,
  setTierOverride: () => {},
})

export function AdminTierProvider({ children }: { children: ReactNode }) {
  const [tierOverride, setOverride] = useState<SubscriptionTier | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(TIER_OVERRIDE_KEY)
    if (stored) setOverride(stored as SubscriptionTier)
  }, [])

  const setTierOverride = useCallback((tier: SubscriptionTier) => {
    localStorage.setItem(TIER_OVERRIDE_KEY, tier)
    setOverride(tier)
  }, [])

  return (
    <AdminTierContext.Provider value={{ tierOverride, setTierOverride }}>
      {children}
    </AdminTierContext.Provider>
  )
}

export function useAdminTier() {
  return useContext(AdminTierContext)
}
