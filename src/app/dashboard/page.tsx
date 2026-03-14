'use client'

import dynamic from 'next/dynamic'

const AgentMap = dynamic(() => import('@/components/map/agent-map'), { ssr: false })

export default function MapPage() {
  return (
    <div className="w-full h-full">
      <AgentMap />
    </div>
  )
}
