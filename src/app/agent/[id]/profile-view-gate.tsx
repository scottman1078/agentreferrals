'use client'

import { useEffect, useState } from 'react'
import { useProfileViewLimit } from '@/hooks/use-profile-view-limit'
import { Eye, Zap } from 'lucide-react'
import Link from 'next/link'
import { AuthProvider } from '@/contexts/auth-context'

interface ProfileViewGateProps {
  agentId: string
}

/**
 * Records a profile view and shows a limit-reached banner when the
 * free-tier daily cap is hit. Wraps itself in AuthProvider since the
 * agent profile page is a server component without auth context.
 */
export default function ProfileViewGate({ agentId }: ProfileViewGateProps) {
  return (
    <AuthProvider>
      <ProfileViewGateInner agentId={agentId} />
    </AuthProvider>
  )
}

function ProfileViewGateInner({ agentId }: ProfileViewGateProps) {
  const { canView, viewsLeft, recordView, isUnlimited } = useProfileViewLimit()
  const [recorded, setRecorded] = useState(false)

  useEffect(() => {
    if (!recorded) {
      recordView()
      setRecorded(true)
    }
  }, [recorded, recordView])

  // Unlimited users or users with views remaining: no banner
  if (isUnlimited || canView) return null

  // Limit reached
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
          <Eye className="w-7 h-7 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Daily Profile View Limit Reached</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
          You&apos;ve viewed 10 agent profiles today. Upgrade to Growth or higher
          for unlimited profile views.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Zap className="w-4 h-4" />
            Upgrade Plan
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-border bg-card hover:bg-accent transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
