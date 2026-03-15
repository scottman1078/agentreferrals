'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { BrokerageProvider } from '@/contexts/brokerage-context'
import TopNav from '@/components/layout/top-nav'
import RightPanel from '@/components/layout/right-panel'
import MobileNav from '@/components/layout/mobile-nav'
import InviteModal from '@/components/ui/invite-modal'
import NoraChat from '@/components/nora/nora-chat'

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [showInvite, setShowInvite] = useState(false)
  const { isLoading, profile, isAuthenticated } = useAuth()
  const router = useRouter()

  // Redirect to onboarding if profile is incomplete (no primary_area set)
  // Only redirect if we're sure the profile loaded AND it's missing data
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return
    // Give profile a moment to load — don't redirect on null (could be loading)
    if (profile && !profile.primary_area) {
      router.push('/onboarding')
    }
  }, [isLoading, isAuthenticated, profile, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center font-extrabold text-sm text-primary-foreground animate-pulse">
            A
          </div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BrokerageProvider>
      <div className="flex flex-col h-screen">
        <TopNav onInvite={() => setShowInvite(true)} />
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            {children}
          </div>
          <RightPanel />
        </div>
        <MobileNav />
        <NoraChat />
        {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      </div>
    </BrokerageProvider>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  )
}
