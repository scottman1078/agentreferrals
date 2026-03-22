'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const DEMO_KEY = 'ar_demo_mode'

interface DemoContextType {
  isDemoMode: boolean
  enableDemo: () => void
  disableDemo: () => void
}

const DemoContext = createContext<DemoContextType>({
  isDemoMode: false,
  enableDemo: () => {},
  disableDemo: () => {},
})

export function DemoProvider({ children }: { children: ReactNode }) {
  // Start false to match SSR, then sync from sessionStorage after mount
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(DEMO_KEY) === 'true'
    if (stored) setIsDemoMode(true)
    setMounted(true)
  }, [])

  const enableDemo = useCallback(() => {
    sessionStorage.setItem(DEMO_KEY, 'true')
    setIsDemoMode(true)
  }, [])

  const disableDemo = useCallback(() => {
    sessionStorage.removeItem(DEMO_KEY)
    setIsDemoMode(false)
  }, [])

  // Don't render children until we've read sessionStorage
  // This prevents the flash of non-demo content
  if (!mounted) {
    return null
  }

  return (
    <DemoContext.Provider value={{ isDemoMode, enableDemo, disableDemo }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  return useContext(DemoContext)
}
