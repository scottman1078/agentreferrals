'use client'

import { useState } from 'react'
import { BrokerageProvider } from '@/contexts/brokerage-context'
import TopNav from '@/components/layout/top-nav'
import RightPanel from '@/components/layout/right-panel'
import MobileNav from '@/components/layout/mobile-nav'
import InviteModal from '@/components/ui/invite-modal'
import NoraChat from '@/components/nora/nora-chat'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [showInvite, setShowInvite] = useState(false)

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
