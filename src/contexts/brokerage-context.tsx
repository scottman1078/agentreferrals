'use client'

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react'
import { useAppData } from '@/lib/data-provider'
import { useFeatureGate } from '@/hooks/use-feature-gate'
import { usePartnerships } from '@/hooks/use-partnerships' // Supabase-backed partnerships
import { getPartnerAgentIds, getVisiblePartnerIds, get1DegreeAgentIds, get2DegreeAgentIds, removePartnership, hidePartner, unhidePartner, isPartnerHidden, getHiddenPartnerIds } from '@/data/partnerships'
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
  scopeLocked: boolean
  /** Remove a partner from the network entirely */
  handleRemovePartner: (partnerAgentId: string) => boolean
  /** Hide a partner from the user's view */
  handleHidePartner: (partnerAgentId: string) => void
  /** Unhide a previously hidden partner */
  handleUnhidePartner: (partnerAgentId: string) => void
  /** Check if a partner is hidden */
  checkPartnerHidden: (partnerAgentId: string) => boolean
  /** Get all hidden partner IDs */
  hiddenPartnerIds: string[]
}

const BrokerageContext = createContext<BrokerageContextType | null>(null)

export function BrokerageProvider({ children }: { children: ReactNode }) {
  const { agents, brokerages, userId, isAuthenticated } = useAppData()
  const { hasFeature } = useFeatureGate()
  const [currentBrokerageId, setCurrentBrokerageId] = useState('real')
  const [scope, setScope] = useState<BrokerageScope>('my-network')

  const currentBrokerage = brokerages.find((b) => b.id === currentBrokerageId) || brokerages[0]

  // Get partner IDs — use Supabase for authenticated users, mock data for demo
  const agentId = isAuthenticated && userId ? userId : 'jason'

  // Supabase partnerships for authenticated (non-demo) users
  const { partnerIds: supaPartnerIds } = usePartnerships({
    userId: isAuthenticated && userId ? userId : undefined,
  })

  // Increment to force re-computation when mock partnerships change
  const [partnerVersion, setPartnerVersion] = useState(0)

  // For authenticated users, use Supabase partner IDs; for demo, use mock data
  const partnerIds = useMemo(() => {
    if (isAuthenticated && userId) return supaPartnerIds
    return getPartnerAgentIds(agentId)
  }, [isAuthenticated, userId, supaPartnerIds, agentId, partnerVersion])

  const visiblePartnerIds = useMemo(() => {
    if (isAuthenticated && userId) return supaPartnerIds // No hide/show for Supabase yet
    return getVisiblePartnerIds(agentId)
  }, [isAuthenticated, userId, supaPartnerIds, agentId, partnerVersion])

  const oneDegreeIds = useMemo(() => {
    if (isAuthenticated && userId) return [] // Degree-based lookups not yet supported for Supabase
    return get1DegreeAgentIds(agentId)
  }, [isAuthenticated, userId, agentId, partnerVersion])

  const twoDegreeIds = useMemo(() => {
    if (isAuthenticated && userId) return [] // Degree-based lookups not yet supported for Supabase
    return get2DegreeAgentIds(agentId)
  }, [isAuthenticated, userId, agentId, partnerVersion])
  const hiddenPartnerIds = useMemo(() => getHiddenPartnerIds(agentId), [agentId, partnerVersion])

  const handleRemovePartner = useCallback((partnerAgentId: string) => {
    const result = removePartnership(agentId, partnerAgentId)
    if (result) setPartnerVersion((v) => v + 1)
    return result
  }, [agentId])

  const handleHidePartner = useCallback((partnerAgentId: string) => {
    hidePartner(agentId, partnerAgentId)
    setPartnerVersion((v) => v + 1)
  }, [agentId])

  const handleUnhidePartner = useCallback((partnerAgentId: string) => {
    unhidePartner(agentId, partnerAgentId)
    setPartnerVersion((v) => v + 1)
  }, [agentId])

  const checkPartnerHidden = useCallback((partnerAgentId: string) => {
    return isPartnerHidden(agentId, partnerAgentId)
  }, [agentId, partnerVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  const scopeLocked = useMemo(() => {
    if (scope === 'my-network') return false
    if (scope === '1-degree') return !hasFeature('networkDegree1')
    if (scope === '2-degree') return !hasFeature('networkDegree2')
    if (scope === 'my-brokerage') return !hasFeature('brokerageNetwork')
    if (scope === 'all-network') return !hasFeature('allNetwork')
    return false
  }, [scope, hasFeature])

  const filteredAgents = useMemo(() => {
    if (scope === 'all-network') return agents
    // In my-network view, exclude hidden partners
    if (scope === 'my-network') return agents.filter((a) => visiblePartnerIds.includes(a.id))
    if (scope === '1-degree') return agents.filter((a) => oneDegreeIds.includes(a.id))
    if (scope === '2-degree') return agents.filter((a) => twoDegreeIds.includes(a.id))
    if (scope === 'my-brokerage') return agents.filter((a) => a.brokerageId === currentBrokerageId)
    return agents
  }, [scope, currentBrokerageId, agents, visiblePartnerIds, partnerIds, oneDegreeIds, twoDegreeIds])

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
        scopeLocked,
        handleRemovePartner,
        handleHidePartner,
        handleUnhidePartner,
        checkPartnerHidden,
        hiddenPartnerIds,
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
