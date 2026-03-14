'use client'

import { createContext, useContext, useState, useMemo, ReactNode } from 'react'
import { brokerages } from '@/data/brokerages'
import { agents } from '@/data/agents'
import type { Agent, Brokerage, BrokerageScope } from '@/types'

interface BrokerageContextType {
  currentBrokerage: Brokerage
  allBrokerages: Brokerage[]
  scope: BrokerageScope
  setScope: (scope: BrokerageScope) => void
  switchBrokerage: (id: string) => void
  filteredAgents: Agent[]
}

const BrokerageContext = createContext<BrokerageContextType | null>(null)

export function BrokerageProvider({ children }: { children: ReactNode }) {
  const [currentBrokerageId, setCurrentBrokerageId] = useState('real')
  const [scope, setScope] = useState<BrokerageScope>('my-brokerage')

  const currentBrokerage = brokerages.find((b) => b.id === currentBrokerageId) || brokerages[0]

  const filteredAgents = useMemo(() => {
    if (scope === 'all-network') return agents
    return agents.filter((a) => a.brokerageId === currentBrokerageId)
  }, [scope, currentBrokerageId])

  return (
    <BrokerageContext.Provider
      value={{
        currentBrokerage,
        allBrokerages: brokerages,
        scope,
        setScope,
        switchBrokerage: setCurrentBrokerageId,
        filteredAgents,
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
