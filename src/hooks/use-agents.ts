'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ArProfile } from '@/contexts/auth-context'

interface UseAgentsOptions {
  brokerageId?: string | null
  scope?: 'my-brokerage' | 'all-network'
  search?: string
  /** When true, show demo agents. When false, exclude them. */
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
  const hasFetched = useRef(false)
  const lastIncludeDemo = useRef(includeDemo)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    let query = supabase
      .from('ar_profiles')
      .select(`*, brokerage:ar_brokerages(*)`)
      .eq('status', 'active')

    if (includeDemo) {
      query = query.eq('is_demo', true)
    } else {
      query = query.eq('is_demo', false)
    }

    if (scope === 'my-brokerage' && brokerageId) {
      query = query.eq('brokerage_id', brokerageId)
    }

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
    hasFetched.current = true
    lastIncludeDemo.current = includeDemo
  }, [brokerageId, scope, search, includeDemo])

  useEffect(() => {
    // Only re-fetch if includeDemo actually changed or first fetch
    if (!hasFetched.current || lastIncludeDemo.current !== includeDemo) {
      fetchData()
    }
  }, [fetchData, includeDemo])

  return { data, isLoading, error, mutate: fetchData }
}
