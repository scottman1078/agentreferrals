import { useCallback } from 'react'
import { useBrokerage } from '@/contexts/brokerage-context'
import { maskName } from '@/lib/agent-display-name'

/**
 * Hook that returns a function to get the display name for any agent.
 * Partners see full names; locked scopes and non-partners see "FirstName L."
 */
export function useAgentDisplayName() {
  const { partnerIds, scopeLocked } = useBrokerage()

  return useCallback(
    (agent: { id: string; name: string; isPrimary?: boolean }) => {
      // If scope is locked, mask all names
      if (scopeLocked) return maskName(agent.name)
      const isPartner = agent.isPrimary === true || partnerIds.includes(agent.id)
      if (isPartner) return agent.name
      return maskName(agent.name)
    },
    [partnerIds, scopeLocked]
  )
}
