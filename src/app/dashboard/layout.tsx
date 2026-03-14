'use client'

import { useState } from 'react'
import TopNav from '@/components/layout/top-nav'
import RightPanel from '@/components/layout/right-panel'
import MobileNav from '@/components/layout/mobile-nav'
import InviteModal from '@/components/ui/invite-modal'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [showInvite, setShowInvite] = useState(false)

  return (
    <div className="flex flex-col h-screen">
      <TopNav onInvite={() => setShowInvite(true)} />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          {children}
        </div>
        <RightPanel />
      </div>
      <MobileNav />
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
