'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { BrokerageProvider } from '@/contexts/brokerage-context'
import TopBar from '@/components/layout/top-bar'
import PillNav from '@/components/layout/pill-nav'
import InviteModal from '@/components/ui/invite-modal'
import NoraChat from '@/components/nora/nora-chat'
import { AdminTierProvider } from '@/contexts/admin-tier-context'
import { nudges as initialNudges } from '@/data/nudges'
import type { Nudge } from '@/data/nudges'
import { MapPin, X as XIcon } from 'lucide-react'

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [showInvite, setShowInvite] = useState(false)
  const [showServiceAreaBanner, setShowServiceAreaBanner] = useState(false)
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

  // Show service area setup banner if user completed onboarding but has no territory
  useEffect(() => {
    if (isLoading || !isAuthenticated || !profile) return
    if (needsOnboarding || !profile.primary_area) return // still needs onboarding

    const hasZips = Array.isArray(profile.territory_zips) && profile.territory_zips.length > 0
    const hasPolygon = Array.isArray(profile.polygon) && profile.polygon.length > 0

    if (!hasZips && !hasPolygon) {
      setShowServiceAreaBanner(true)
    }
  }, [isLoading, isAuthenticated, needsOnboarding, profile])

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

        {/* Service area setup banner */}
        {showServiceAreaBanner && (
          <div className="relative z-10 mx-4 mt-2 p-4 rounded-xl border border-primary/20 bg-primary/5">
            <button
              onClick={() => setShowServiceAreaBanner(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Welcome to AgentReferrals!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Set up your service area so other agents can find you.
                </p>
                <button
                  onClick={() => {
                    setShowServiceAreaBanner(false)
                    router.push('/dashboard/settings?tab=territory')
                  }}
                  className="mt-2 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  Set Up Service Area
                </button>
              </div>
            </div>
          </div>
        )}

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

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminTierProvider>
        <DashboardShell>{children}</DashboardShell>
      </AdminTierProvider>
    </AuthProvider>
  )
}
