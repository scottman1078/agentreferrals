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
  // Initialize from sessionStorage synchronously to avoid a false→true flash
  const [isDemoMode, setIsDemoMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem(DEMO_KEY) === 'true'
    }
    return false
  })

  const enableDemo = useCallback(() => {
    sessionStorage.setItem(DEMO_KEY, 'true')
    setIsDemoMode(true)
  }, [])

  const disableDemo = useCallback(() => {
    sessionStorage.removeItem(DEMO_KEY)
    setIsDemoMode(false)
  }, [])

  return (
    <DemoContext.Provider value={{ isDemoMode, enableDemo, disableDemo }}>
      {children}
    </DemoContext.Provider>
  )
}

export function useDemo() {
  return useContext(DemoContext)
}
