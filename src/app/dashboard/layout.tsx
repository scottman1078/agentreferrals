'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { BrokerageProvider } from '@/contexts/brokerage-context'
import TopBar from '@/components/layout/top-bar'
import PillNav from '@/components/layout/pill-nav'
import InviteModal from '@/components/ui/invite-modal'
import NoraChat from '@/components/nora/nora-chat'
import NudgeBanner from '@/components/nudges/nudge-banner'
import { nudges as initialNudges } from '@/data/nudges'
import type { Nudge } from '@/data/nudges'

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [showInvite, setShowInvite] = useState(false)
  const [nudgeList, setNudgeList] = useState<Nudge[]>(initialNudges)
  const { isLoading, profile, isAuthenticated, needsOnboarding } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isMapPage = pathname === '/dashboard'

  const handleDismissNudge = useCallback((nudgeId: string) => {
    setNudgeList((prev) => prev.map((n) => n.id === nudgeId ? { ...n, dismissed: true } : n))
  }, [])

  const handleNudgeMessageSent = useCallback((agentId: string, message: string) => {
    // Dispatch custom event so the messages page can pick it up
    window.dispatchEvent(new CustomEvent('nudge-message-sent', {
      detail: { agentId, message },
    }))
  }, [])

  // Redirect to onboarding if user hasn't completed profile setup
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    if (needsOnboarding || (profile && !profile.primary_area)) {
      router.push('/onboarding')
    }
  }, [isLoading, isAuthenticated, needsOnboarding, profile, router])

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
      <div className="h-screen flex flex-col relative">
        {/* Slim top bar — floating on map, solid on other pages */}
        <TopBar />

        {/* Main content */}
        <div className={`flex-1 relative overflow-hidden ${isMapPage ? '' : 'pb-[76px]'}`}>
          {children}
        </div>

        {/* Bottom pill nav — always visible */}
        <PillNav />

        {/* Nudge banner removed — check-ins now handled by NORA + map badge */}

        {/* NORA FAB — positioned above the pill nav */}
        <NoraChat nudgeCount={nudgeList.filter((n) => !n.dismissed).length} />

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
