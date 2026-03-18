'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DemoProvider, useDemo } from '@/contexts/demo-context'

/**
 * /demo — sets demo mode and redirects to the dashboard.
 * No login required. Shows all mock data with a demo banner.
 */
function DemoRedirect() {
  const { enableDemo } = useDemo()
  const router = useRouter()

  useEffect(() => {
    enableDemo()
    router.replace('/dashboard')
  }, [enableDemo, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
          <span className="text-lg">🚀</span>
        </div>
        <p className="text-sm font-semibold">Loading demo...</p>
      </div>
    </div>
  )
}

export default function DemoPage() {
  return (
    <DemoProvider>
      <DemoRedirect />
    </DemoProvider>
  )
}
