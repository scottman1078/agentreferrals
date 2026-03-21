'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ArProfile } from '@/contexts/auth-context'

interface UseAgentsOptions {
  brokerageId?: string | null
  scope?: 'my-brokerage' | 'all-network'
  search?: string
  /** When true, include demo agents. When false, exclude them. */
  includeDemo?: boolean
}

interface UseAgentsReturn {
  data: ArProfile[]
  isLoading: boolean
  error: string | null
  mutate: () => Promise<void>
}

export function useAgents({
  brokerageId,
  scope = 'my-brokerage',
  search,
  includeDemo = false,
}: UseAgentsOptions = {}): UseAgentsReturn {
  const [data, setData] = useState<ArProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    let query = supabase
      .from('ar_profiles')
      .select(`*, brokerage:ar_brokerages(*)`)
      .eq('status', 'active')

    // Filter demo agents based on mode
    if (includeDemo) {
      // Demo mode: show only demo agents
      query = query.eq('is_demo', true)
    } else {
      // Production: exclude demo agents
      query = query.eq('is_demo', false)
    }

    // Filter by brokerage if scoped
    if (scope === 'my-brokerage' && brokerageId) {
      query = query.eq('brokerage_id', brokerageId)
    }

    // Text search on name
    if (search) {
      query = query.ilike('full_name', `%${search}%`)
    }

    query = query.order('full_name', { ascending: true })

    const { data: agents, error: fetchError } = await query

    if (fetchError) {
      setError(fetchError.message)
      setData([])
    } else {
      setData((agents as ArProfile[]) || [])
    }

    setIsLoading(false)
  }, [supabase, brokerageId, scope, search, includeDemo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, mutate: fetchData }
}
