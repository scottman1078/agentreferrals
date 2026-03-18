'use client'

import dynamic from 'next/dynamic'

const AgentMap = dynamic(() => import('@/components/map/agent-map'), { ssr: false })
const MarketplaceFeed = dynamic(() => import('@/components/marketplace/marketplace-feed'), { ssr: false })

export default function MapPage() {
  return (
    <div className="w-full h-full">
      <AgentMap />
      <MarketplaceFeed />
    </div>
  )
}
