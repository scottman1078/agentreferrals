'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { BrokerageProvider } from '@/contexts/brokerage-context'
import TopBar from '@/components/layout/top-bar'
import PillNav from '@/components/layout/pill-nav'
import InviteModal from '@/components/ui/invite-modal'
import NoraChat from '@/components/nora/nora-chat'
import SetupWizard from '@/components/setup-wizard/setup-wizard'
import { AdminTierProvider } from '@/contexts/admin-tier-context'
import AdminTierSwitcher from '@/components/admin/tier-switcher'
import { UserPlus, X } from 'lucide-react'
import { nudges as initialNudges } from '@/data/nudges'
import type { Nudge } from '@/data/nudges'

interface NewPartnerNotification {
  inviteId: string
  userId: string
  name: string
  area: string
  brokerage: string
  signedUpAt: string
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [showInvite, setShowInvite] = useState(false)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [nudgeList, setNudgeList] = useState<Nudge[]>(initialNudges)
  const [newPartners, setNewPartners] = useState<NewPartnerNotification[]>([])
  const { isLoading, profile, isAuthenticated, needsOnboarding } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isMapPage = pathname === '/dashboard'

  const handleDismissNudge = useCallback((nudgeId: string) => {
    setNudgeList((prev) => prev.map((n) => n.id === nudgeId ? { ...n, dismissed: true } : n))
  }, [])

  const handleDismissPartner = useCallback((inviteId: string) => {
    setNewPartners((prev) => prev.filter((p) => p.inviteId !== inviteId))
  }, [])

  // Fetch new partner notifications on mount
  useEffect(() => {
    if (isLoading || !isAuthenticated || !profile?.id) return

    const fetchNewPartners = async () => {
      try {
        const res = await fetch(`/api/notifications/new-partners?userId=${profile.id}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.partners && data.partners.length > 0) {
          setNewPartners(data.partners)
        }
      } catch {
        // Silently fail — non-critical
      }
    }

    fetchNewPartners()
  }, [isLoading, isAuthenticated, profile?.id])

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

  // Show setup wizard if user completed onboarding but has no territory.
  // Debounced by 400ms so rapid profile re-fetches (auth state change firing twice)
  // don't cause a flash where the wizard shows then immediately disappears.
  useEffect(() => {
    console.log('[SetupWizard] effect', {
      isLoading,
      isAuthenticated,
      hasProfile: !!profile,
      needsOnboarding,
      primary_area: profile?.primary_area,
      territory_zips: profile?.territory_zips,
      polygon: profile?.polygon,
      wizardCompleted: typeof window !== 'undefined' ? localStorage.getItem('ar_setup_wizard_completed') : 'ssr',
    })

    if (isLoading || !isAuthenticated || !profile) return
    if (needsOnboarding || !profile.primary_area) return // still needs onboarding

    // Don't show if already completed the setup wizard
    if (typeof window !== 'undefined' && localStorage.getItem('ar_setup_wizard_completed')) {
      console.log('[SetupWizard] skipped — localStorage flag set')
      return
    }

    // If the user already has a real service area (more than just the onboarding zip),
    // they've completed setup — mark the flag and skip the wizard
    const hasRealServiceArea =
      (Array.isArray(profile.territory_zips) && profile.territory_zips.length > 1) ||
      (Array.isArray(profile.polygon) && profile.polygon.length > 0)

    console.log('[SetupWizard] hasRealServiceArea:', hasRealServiceArea)

    if (hasRealServiceArea) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('ar_setup_wizard_completed', 'true')
        console.log('[SetupWizard] auto-completed — user already has service area')
      }
      return
    }

    // Delay showing so a second profile fetch (onAuthStateChange) can cancel this
    // before the wizard ever renders
    console.log('[SetupWizard] scheduling show in 400ms...')
    const timer = setTimeout(() => {
      console.log('[SetupWizard] showing wizard')
      setShowSetupWizard(true)
    }, 400)
    return () => {
      console.log('[SetupWizard] timer cancelled (profile updated before 400ms)')
      clearTimeout(timer)
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

        {/* New partner notifications */}
        {newPartners.map((partner) => (
          <div
            key={partner.inviteId}
            className="mx-4 mt-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{partner.name} just joined your network!</p>
              <p className="text-xs text-muted-foreground">
                They signed up using your invite and have been added as a referral partner.
              </p>
            </div>
            <button
              onClick={() => handleDismissPartner(partner.inviteId)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Post-onboarding setup wizard */}
        {showSetupWizard && (
          <SetupWizard
            onComplete={() => {
              setShowSetupWizard(false)
              localStorage.setItem('ar_setup_wizard_completed', 'true')
            }}
            profile={profile}
          />
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

        {/* Admin-only floating tier switcher */}
        <AdminTierSwitcher />
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
