'use client'

import { createContext, useContext, useState, useMemo, ReactNode } from 'react'
import { useAppData } from '@/lib/data-provider'
import { getPartnerAgentIds } from '@/data/partnerships'
import type { Agent, Brokerage, BrokerageScope } from '@/types'

interface BrokerageContextType {
  currentBrokerage: Brokerage
  allBrokerages: Brokerage[]
  scope: BrokerageScope
  setScope: (scope: BrokerageScope) => void
  switchBrokerage: (id: string) => void
  filteredAgents: Agent[]
  partnerIds: string[]
}

const BrokerageContext = createContext<BrokerageContextType | null>(null)

export function BrokerageProvider({ children }: { children: ReactNode }) {
  const { agents, brokerages } = useAppData()
  const [currentBrokerageId, setCurrentBrokerageId] = useState('real')
  const [scope, setScope] = useState<BrokerageScope>('my-brokerage')

  const currentBrokerage = brokerages.find((b) => b.id === currentBrokerageId) || brokerages[0]

  // Get partner IDs for "My Network" scope (Jason's partners)
  const partnerIds = useMemo(() => getPartnerAgentIds('jason'), [])

  const filteredAgents = useMemo(() => {
    if (scope === 'all-network') return agents
    if (scope === 'my-network') return agents.filter((a) => partnerIds.includes(a.id))
    return agents.filter((a) => a.brokerageId === currentBrokerageId)
  }, [scope, currentBrokerageId, agents, partnerIds])

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
