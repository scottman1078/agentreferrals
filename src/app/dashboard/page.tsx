'use client'

import dynamic from 'next/dynamic'
import { AppMark } from '@/components/ui/app-logo'

function MapLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-pulse">
          <AppMark size="lg" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground">Loading your referral network...</p>
      </div>
    </div>
  )
}

const AgentMap = dynamic(() => import('@/components/map/agent-map'), { ssr: false, loading: () => <MapLoader /> })

export default function MapPage() {
  return (
    <div className="w-full h-full">
      <AgentMap />
    </div>
  )
}
