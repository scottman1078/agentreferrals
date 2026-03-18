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
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center mx-auto animate-pulse">
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" /></svg>
        </div>
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
