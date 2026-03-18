'use client'

import { useCallback } from 'react'
import { useDemo } from '@/contexts/demo-context'

/**
 * Returns a guard function that blocks write actions in demo mode.
 * Usage: const demoGuard = useDemoGuard()
 *        if (demoGuard()) return  // blocked in demo mode
 */
export function useDemoGuard() {
  const { isDemoMode } = useDemo()

  const guard = useCallback(() => {
    if (isDemoMode) {
      window.alert('This action is disabled in demo mode. Sign up to get started!')
      return true
    }
    return false
  }, [isDemoMode])

  return guard
}
