'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ArPartnership {
  id: string
  requesting_agent_id: string
  receiving_agent_id: string
  requesting_market: string
  receiving_market: string
  status: string
  message: string | null
  accepted_at: string | null
  created_at: string
  updated_at: string
}

interface UsePartnershipsOptions {
  userId?: string
}

interface UsePartnershipsReturn {
  partnerships: ArPartnership[]
  isLoading: boolean
  error: string | null
  partnerIds: string[]
  mutate: () => Promise<void>
}

export function usePartnerships({
  userId,
}: UsePartnershipsOptions = {}): UsePartnershipsReturn {
  const [partnerships, setPartnerships] = useState<ArPartnership[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    const { data, error: fetchError } = await supabase
      .from('ar_partnerships')
      .select('*')
      .or(`requesting_agent_id.eq.${userId},receiving_agent_id.eq.${userId}`)
      .in('status', ['active', 'accepted'])
      .order('created_at', { ascending: false })

    if (fetchError) {
      // Table might not exist yet — gracefully return empty
      console.warn('[usePartnerships] fetch error:', fetchError.message)
      setError(null)
      setPartnerships([])
    } else {
      setPartnerships((data as ArPartnership[]) || [])
    }

    setIsLoading(false)
  }, [userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derive partner IDs from partnerships
  const partnerIds = useMemo(() => {
    if (!userId) return []
    return partnerships.map((p) =>
      p.requesting_agent_id === userId
        ? p.receiving_agent_id
        : p.requesting_agent_id
    )
  }, [partnerships, userId])

  return { partnerships, isLoading, error, partnerIds, mutate: fetchData }
}
