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
        <img src="/favicon.png" alt="AgentReferrals" width={40} height={40} className="shrink-0 animate-pulse mx-auto dark:brightness-[1.8]" />
        <p className="text-sm font-semibold text-muted-foreground">Loading your referral network...</p>
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
