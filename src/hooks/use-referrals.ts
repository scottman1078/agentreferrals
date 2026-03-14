'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ArReferral {
  id: string
  client_name: string
  from_agent_id: string
  to_agent_id: string | null
  market: string | null
  fee_percent: number | null
  estimated_close_date: string | null
  stage: string
  estimated_price: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface UseReferralsOptions {
  userId?: string
}

interface UseReferralsReturn {
  data: ArReferral[]
  isLoading: boolean
  error: string | null
  mutate: () => Promise<void>
}

export function useReferrals({
  userId,
}: UseReferralsOptions = {}): UseReferralsReturn {
  const [data, setData] = useState<ArReferral[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    // Fetch referrals where user is either the sender or receiver
    const { data: referrals, error: fetchError } = await supabase
      .from('ar_referrals')
      .select('*')
      .or(`from_agent_id.eq.${userId},to_agent_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setData([])
    } else {
      setData((referrals as ArReferral[]) || [])
    }

    setIsLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, mutate: fetchData }
}
