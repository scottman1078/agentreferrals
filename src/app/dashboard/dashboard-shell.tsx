'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { BrokerageProvider } from '@/contexts/brokerage-context'
import TopBar from '@/components/layout/top-bar'
import PillNav from '@/components/layout/pill-nav'
import InviteModal from '@/components/ui/invite-modal'
import NoraChat from '@/components/nora/nora-chat'
// Setup wizard replaced by /dashboard/setup full page
import { AdminTierProvider } from '@/contexts/admin-tier-context'
import { DemoProvider } from '@/contexts/demo-context'
import AdminTierSwitcher from '@/components/admin/tier-switcher'
import DemoBanner from '@/components/ui/demo-banner'
import { useDemo } from '@/contexts/demo-context'
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
  const mountCountRef = useRef(0)
  useEffect(() => {
    mountCountRef.current += 1
    console.log('[DashboardShell] MOUNTED (count:', mountCountRef.current, ')')
    return () => console.log('[DashboardShell] UNMOUNTED')
  }, [])

  const [showInvite, setShowInvite] = useState(false)
  // sessionStorage persists the show-wizard decision across remounts within the same tab
  const [nudgeList, setNudgeList] = useState<Nudge[]>(initialNudges)
  const [newPartners, setNewPartners] = useState<NewPartnerNotification[]>([])
  const { isLoading, profile, isAuthenticated, needsOnboarding } = useAuth()
  const { isDemoMode, disableDemo } = useDemo()
  const router = useRouter()
  const pathname = usePathname()
  const isMapPage = pathname === '/dashboard'
  const isSetupPage = pathname === '/dashboard/setup'

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

  // If a real user is authenticated, auto-clear demo mode
  useEffect(() => {
    if (isAuthenticated && isDemoMode) {
      disableDemo()
    }
  }, [isAuthenticated, isDemoMode, disableDemo])

  const ADMIN_EMAILS = ['scott@agentdashboards.com']
  const isAdminUser = ADMIN_EMAILS.includes(profile?.email ?? '')

  // Redirect to setup if user hasn't completed it (skip in demo mode + admins)
  useEffect(() => {
    if (isDemoMode && !isAuthenticated) return
    if (isLoading) return
    if (!isAuthenticated) {
      router.push('/')
      return
    }
    if (isAdminUser) return
    if (!profile) return

    // If setup is complete (DB flag), skip
    if (profile.setup_step === 'complete') return
    // Legacy: localStorage flag
    if (typeof window !== 'undefined' && localStorage.getItem('ar_setup_wizard_completed')) return

    // Redirect to setup if not complete
    if (pathname !== '/dashboard/setup') {
      router.push('/dashboard/setup')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isAuthenticated, profile, pathname, isDemoMode, isAdminUser])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center animate-pulse">
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M16 3l4 4-4 4" /><path d="M20 7H4" /><path d="M8 21l-4-4 4-4" /><path d="M4 17h16" /></svg>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Loading your referral network...</p>
        </div>
      </div>
    )
  }

  return (
    <BrokerageProvider>
      <div className="h-screen flex flex-col relative">
        {/* Slim top bar — hidden on setup page */}
        {!isSetupPage && <TopBar />}

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

        {/* Main content */}
        <div className={`flex-1 relative overflow-hidden ${isMapPage || isSetupPage ? '' : 'pb-[76px]'}`}>
          <div className="h-full">
            {children}
          </div>
        </div>

        {/* Bottom pill nav — hidden on setup page */}
        {!isSetupPage && <PillNav />}

        {/* Nudge banner removed — check-ins now handled by NORA + map badge */}

        {/* NORA FAB — positioned above the pill nav, hidden on setup page */}
        {!isSetupPage && <NoraChat nudgeCount={nudgeList.filter((n) => !n.dismissed).length} />}

        {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}

        {/* Admin-only floating tier switcher */}
        <AdminTierSwitcher />
      </div>
    </BrokerageProvider>
  )
}

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <AuthProvider>
        <AdminTierProvider>
          <DemoBanner />
          <DashboardShell>{children}</DashboardShell>
        </AdminTierProvider>
      </AuthProvider>
    </DemoProvider>
  )
}
