'use client'

import { useState, useEffect, useCallback } from 'react'

export interface EndorsementGroup {
  skill: string
  count: number
  endorsers: { name: string; color: string }[]
}

export function useEndorsements(agentId: string | undefined) {
  const [endorsements, setEndorsements] = useState<EndorsementGroup[]>([])
  const [count, setCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchEndorsements = useCallback(async () => {
    if (!agentId) { setIsLoading(false); return }
    try {
      const res = await fetch(`/api/endorsements?agentId=${agentId}`)
      const data = await res.json()
      if (data.success) {
        setEndorsements(data.endorsements)
        setCount(data.count)
      }
    } catch (err) {
      console.error('[useEndorsements] Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [agentId])

  useEffect(() => { fetchEndorsements() }, [fetchEndorsements])

  return { endorsements, count, isLoading, refetch: fetchEndorsements }
}

export async function submitEndorsement(agentId: string, endorserId: string, skills: string[]) {
  const res = await fetch('/api/endorsements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, endorserId, skills }),
  })
  return res.json()
}

export async function removeEndorsement(agentId: string, endorserId: string, skill: string) {
  const params = new URLSearchParams({ agentId, endorserId, skill })
  const res = await fetch(`/api/endorsements?${params}`, { method: 'DELETE' })
  return res.json()
}
