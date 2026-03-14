'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ArBrokerage } from '@/contexts/auth-context'

interface UseBrokeragesReturn {
  data: ArBrokerage[]
  isLoading: boolean
  error: string | null
  mutate: () => Promise<void>
}

export function useBrokerages(): UseBrokeragesReturn {
  const [data, setData] = useState<ArBrokerage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const { data: brokerages, error: fetchError } = await supabase
      .from('ar_brokerages')
      .select('*')
      .order('name', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
      setData([])
    } else {
      setData((brokerages as ArBrokerage[]) || [])
    }

    setIsLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, isLoading, error, mutate: fetchData }
}
