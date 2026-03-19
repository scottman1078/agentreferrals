'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Legacy onboarding page — redirects to the unified setup wizard
export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/setup')
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Redirecting to setup...</p>
      </div>
    </div>
  )
}
