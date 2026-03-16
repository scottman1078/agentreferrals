'use client'

import { createContext, useContext, useState, useMemo, ReactNode } from 'react'
import { useAppData } from '@/lib/data-provider'
import { getPartnerAgentIds, get1DegreeAgentIds, get2DegreeAgentIds } from '@/data/partnerships'
import type { Agent, Brokerage, BrokerageScope } from '@/types'

interface BrokerageContextType {
  currentBrokerage: Brokerage
  allBrokerages: Brokerage[]
  scope: BrokerageScope
  setScope: (scope: BrokerageScope) => void
  switchBrokerage: (id: string) => void
  filteredAgents: Agent[]
  partnerIds: string[]
  oneDegreeIds: string[]
  twoDegreeIds: string[]
}

const BrokerageContext = createContext<BrokerageContextType | null>(null)

export function BrokerageProvider({ children }: { children: ReactNode }) {
  const { agents, brokerages } = useAppData()
  const [currentBrokerageId, setCurrentBrokerageId] = useState('real')
  const [scope, setScope] = useState<BrokerageScope>('my-brokerage')

  const currentBrokerage = brokerages.find((b) => b.id === currentBrokerageId) || brokerages[0]

  // Get partner IDs for "My Network" scope (Jason's partners)
  const partnerIds = useMemo(() => getPartnerAgentIds('jason'), [])
  const oneDegreeIds = useMemo(() => get1DegreeAgentIds('jason'), [])
  const twoDegreeIds = useMemo(() => get2DegreeAgentIds('jason'), [])

  const filteredAgents = useMemo(() => {
    if (scope === 'all-network') return agents
    if (scope === 'my-network') return agents.filter((a) => partnerIds.includes(a.id))
    if (scope === '1-degree') return agents.filter((a) => partnerIds.includes(a.id) || oneDegreeIds.includes(a.id))
    if (scope === '2-degree') return agents.filter((a) => partnerIds.includes(a.id) || oneDegreeIds.includes(a.id) || twoDegreeIds.includes(a.id))
    if (scope === 'my-brokerage') return agents.filter((a) => a.brokerageId === currentBrokerageId)
    return agents
  }, [scope, currentBrokerageId, agents, partnerIds, oneDegreeIds, twoDegreeIds])

  return (
    <BrokerageContext.Provider
      value={{
        currentBrokerage,
        allBrokerages: brokerages,
        scope,
        setScope,
        switchBrokerage: setCurrentBrokerageId,
        filteredAgents,
        partnerIds,
        oneDegreeIds,
        twoDegreeIds,
      }}
    >
      {children}
    </BrokerageContext.Provider>
  )
}

export function useBrokerage() {
  const ctx = useContext(BrokerageContext)
  if (!ctx) throw new Error('useBrokerage must be used within BrokerageProvider')
  return ctx
}
