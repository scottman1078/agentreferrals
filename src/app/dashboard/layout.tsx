'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { BrokerageProvider } from '@/contexts/brokerage-context'
import TopBar from '@/components/layout/top-bar'
import PillNav from '@/components/layout/pill-nav'
import InviteModal from '@/components/ui/invite-modal'
import NoraChat from '@/components/nora/nora-chat'

function DashboardShell({ children }: { children: React.ReactNode }) {
  const [showInvite, setShowInvite] = useState(false)
  const { isLoading, profile, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isMapPage = pathname === '/dashboard'

  // Redirect to onboarding if profile is incomplete (no primary_area set)
  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return
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
      <div className="h-screen flex flex-col relative">
        {/* Slim top bar — floating on map, solid on other pages */}
        <TopBar />

        {/* Main content */}
        <div className={`flex-1 relative overflow-hidden ${isMapPage ? '' : 'pb-[76px]'}`}>
          {children}
        </div>

        {/* Bottom pill nav — always visible */}
        <PillNav />

        {/* NORA FAB — positioned above the pill nav */}
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
