'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ArProfile } from '@/contexts/auth-context'

interface UseProfileOptions {
  userId?: string
}

interface UseProfileReturn {
  data: ArProfile | null
  isLoading: boolean
  error: string | null
  mutate: () => Promise<void>
}

export function useProfile({ userId }: UseProfileOptions = {}): UseProfileReturn {
  const [data, setData] = useState<ArProfile | null>(null)
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

    const { data: profile, error: fetchError } = await supabase
      .from('ar_profiles')
      .select(`*, brokerage:ar_brokerages(*)`)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      setError(fetchError.message)
      setData(null)
    } else {
      setData(profile as ArProfile)
    }

    setIsLoading(false)
  }, [supabase, userId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, mutate: fetchData }
}
