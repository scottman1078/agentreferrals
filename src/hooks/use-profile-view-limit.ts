'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useFeatureGate } from '@/hooks/use-feature-gate'

const DAILY_LIMIT = 10
const STORAGE_KEY = 'ar_profile_views'

interface ViewData {
  count: number
  date: string // YYYY-MM-DD
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function getStoredData(): ViewData {
  if (typeof window === 'undefined') return { count: 0, date: getTodayStr() }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { count: 0, date: getTodayStr() }
    const parsed: ViewData = JSON.parse(raw)
    // Reset if date is stale
    if (parsed.date !== getTodayStr()) {
      return { count: 0, date: getTodayStr() }
    }
    return parsed
  } catch {
    return { count: 0, date: getTodayStr() }
  }
}

function saveData(data: ViewData) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * Lightweight client-side rate limiter for profile views.
 * Free-tier (starter) users: 10 views/day.
 * Growth+ tiers: unlimited.
 */
export function useProfileViewLimit() {
  const { isAuthenticated } = useAuth()
  const { isAtLeast } = useFeatureGate()
  const [viewData, setViewData] = useState<ViewData>({ count: 0, date: getTodayStr() })

  useEffect(() => {
    setViewData(getStoredData())
  }, [])

  // Growth+ get unlimited views
  const isUnlimited = isAuthenticated && isAtLeast('growth')
  const canView = isUnlimited || viewData.count < DAILY_LIMIT
  const viewsLeft = isUnlimited ? Infinity : Math.max(0, DAILY_LIMIT - viewData.count)

  const recordView = useCallback(() => {
    if (isUnlimited) return
    const current = getStoredData()
    const updated: ViewData = { count: current.count + 1, date: getTodayStr() }
    saveData(updated)
    setViewData(updated)
  }, [isUnlimited])

  return { canView, viewsLeft, recordView, isUnlimited }
}
