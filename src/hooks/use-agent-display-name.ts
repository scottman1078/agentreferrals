import { useCallback } from 'react'
import { useBrokerage } from '@/contexts/brokerage-context'
import { maskName } from '@/lib/agent-display-name'

/**
 * Hook that returns a function to get the display name for any agent.
 * Partners see full names; everyone else sees "FirstName L."
 */
export function useAgentDisplayName() {
  const { partnerIds } = useBrokerage()

  return useCallback(
    (agent: { id: string; name: string; isPrimary?: boolean }) => {
      const isPartner = agent.isPrimary === true || partnerIds.includes(agent.id)
      if (isPartner) return agent.name
      return maskName(agent.name)
    },
    [partnerIds]
  )
}
